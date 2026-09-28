import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  DEFAULT_CEILING,
  DEFAULT_DIGITS,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./core/context.ts";
import { type Shown } from "./core/display.ts";
import { roundTerms } from "./core/convert.ts";
import { formatDimension, isDimensionless } from "./core/dimension.ts";
import { show } from "./core/display.ts";
import { parseExpr } from "./core/expr.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type Side,
} from "./core/pipeline.ts";
import { divideBalls, exact, type Ball } from "./core/ball.ts";
import {
  ONE,
  absolute,
  equals,
  format,
  isZero,
  sign,
  type Precision,
} from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/**
 * One term of a result: `text`, the value as `show` writes it at the
 * context's digits in its mode, of `unit`, text to show after the value.
 * `negative` says the sign of the value, since the text of every term but
 * a line's first is written unsigned and the sign becomes the operator that
 * joins it to the sum.
 */
type Term = {
  readonly text: string;
  readonly negative: boolean;
  readonly unit: string;
};

/**
 * One line of a result: `have` is `relation` the sum of `terms`, as in
 * `3 ft = 36 in`, `1 m ≈ 39.370079 in` and `1 m ≈ 3 ft + 3.3700787 in`. A
 * conversion into one unit is one term; one into a unit list is a term per
 * unit shown; one into a function is one term, the argument, written
 * inside a call of the function, `tempF(212) = tempC(100)`, whose name is
 * `call`. `note` says what the digits are worth when they are not all
 * certain: how many are, that the value is within a bound of zero, or that
 * none is certified.
 */
type Line = {
  readonly have: string;
  readonly relation: "=" | "≈";
  readonly terms: readonly Term[];
  readonly call?: string;
  readonly note?: string;
};

/** What the output area shows for the current pair of texts. */
type Outcome =
  /** Nothing to convert yet. */
  | { readonly kind: "empty" }
  /**
   * The conversion, as one line, or two when it has a reciprocal: the
   * conversion and then the same conversion the other way round, `3 ft =
   * 36 in` and `in ≈ 0.027777778 × 3 ft`.
   */
  | { readonly kind: "result"; readonly lines: readonly Line[] }
  /** `message` says what is wrong, with the text on `side` if it is one text's fault. */
  | { readonly kind: "error"; readonly side?: Side; readonly message: string };

/**
 * The converter: two text inputs, "you have" and "you want", and an output
 * area that shows the conversion of the one into the other, or why there is
 * none. Its only state is the two strings; every keystroke runs the core's
 * pipeline over them again, which is cheap, and renders the outcome. The
 * `table` to convert against is a property, built by the host.
 *
 * With `want` blank, the output is what `have` is in the table's primitives
 * (`in = 0.0254 m`), the answer GNU units gives to the same question. A
 * `want` that is a unit list, typed (`ft;in`) or by name (`time`), gives
 * the sum the pipeline computes, one term per unit. A `want` that names a
 * function gives the call that would produce the `have`,
 * `tempF(212) = tempC(100)`, the recovered argument written as a count of
 * the unit the function declares for it.
 *
 * The `context` property is the user's settings as the pipeline takes them
 * (the digits asked for, the rounding mode, the range limit and the
 * ceiling of the retry schedule, which the shell derives from the cap on
 * the digits; `<app-shell>` owns the settings and passes it down): the
 * pipeline computes at as many passes of rising precision as the digits
 * asked for take, up to the ceiling, `roundTerms` and `show` round to the
 * context's digits in its mode, and `=` is decided at those digits. It
 * defaults to the display's rules before the settings existed, eight
 * digits half away from zero, under the default cap's ceiling.
 *
 * What is shown is what `show` certifies (docs/calculator-plan.md, D7 and
 * task 2.6): every digit asked for when the value allows, and otherwise
 * the certified digits with a note saying how many of those asked for are
 * certain, `≈ 0` with a note giving the bound within which the value lies
 * when it cannot be told from zero, or the midpoint's digits with a note
 * that none is certified when the radius is not known. A list is certified
 * on its unrounded terms, since `roundTerms` moves the remainder's midpoint
 * onto a rounding cell's edge in a directed mode, where re-certifying it
 * would lose a digit; the remainder is then rounded at the digits
 * certified, and the counts, which are exact integers, carry no note.
 * When the rounding carried into an earlier unit, though, the last term
 * is a new value, what is left after the carried units, and its kind is
 * judged on the rounded remainder, which is then a hair from zero; a last
 * term that cannot be told from zero is left out as a term of zero is,
 * with its note, so `1.5 deg` in `dms`, whose angle units carry `pi()`'s
 * radius, shows `≈ 1 deg + 30 arcmin`, and a sum of nothing but zeros keeps
 * its last term with its bound. The reciprocal line shows its own kind.
 *
 * A conversion into one unit is also shown the other way round, on a
 * second line, as GNU units shows every conversion twice (`* 36` and
 * `/ 0.027777778`, the number to multiply by and the number to divide by):
 * `3 ft = 36 in` and then `in ≈ 0.027777778 × 3 ft`, the `want` converted
 * into the `have`, which is what dividing by the second number does. The
 * two lines have the same shape with the sides swapped, and each reads as
 * a statement about quantities. Only a conversion into one unit has a
 * reciprocal: it is one ratio, and the reciprocal is the same ratio the
 * other way round. A conversion into a unit list is a sum, not a ratio, and
 * one into a function is a call, so there is no other way round and no
 * line is added; nor for a blank `want`, which shows a definition; nor for
 * a value of zero, which has no reciprocal.
 */
@customElement("unit-converter")
export class UnitConverter extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 32rem;
      text-align: start;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    input {
      font: inherit;
      font-size: 1.25rem;
      font-weight: 400;
      padding: 0.5rem 0.75rem;
      border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      min-width: 0;
    }

    input:focus-visible {
      outline: 2px solid #3b5bdb;
      outline-offset: -1px;
    }

    input[aria-invalid="true"] {
      border-color: #c92a2a;
    }

    output {
      display: block;
      min-height: 3rem;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }

    .value {
      font-weight: 600;
      font-size: 1.5rem;
    }

    .hint {
      opacity: 0.7;
    }

    .note {
      opacity: 0.7;
      font-size: 0.875rem;
    }

    .error {
      color: #c92a2a;
    }

    @media (prefers-color-scheme: dark) {
      .error {
        color: #ff8787;
      }
    }
  `;

  /** The units to convert with. Not an attribute: a table is not a string. */
  @property({ attribute: false }) table?: UnitTable;

  /** The user's context: the digits to show, in which rounding mode, within which limits. */
  @property({ attribute: false }) context: NumberContext = {
    precision: DEFAULT_DIGITS,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };

  @state() private have = "";
  @state() private want = "";

  render() {
    const outcome = this.outcome();
    const invalid = (side: Side) =>
      outcome.kind === "error" && outcome.side === side;
    return html`
      ${renderInput("You have", "3 ft", "next", invalid("have"), this.have, this.onHaveInput)}
      ${renderInput("You want", "in", "done", invalid("want"), this.want, this.onWantInput)}
      <output aria-live="polite">${renderOutcome(outcome)}</output>
    `;
  }

  private onHaveInput(event: Event) {
    this.have = (event.target as HTMLInputElement).value;
  }

  private onWantInput(event: Event) {
    this.want = (event.target as HTMLInputElement).value;
  }

  /** Runs the pipeline over the current texts, at the context given. */
  private outcome(): Outcome {
    const { table, context } = this;
    if (table === undefined) {
      return { kind: "error", message: "No units are loaded." };
    }
    const have = this.have.trim();
    const want = this.want.trim();
    if (have === "") return { kind: "empty" };
    if (want === "") {
      // What `have` is in the primitives: the unit's definition, in effect.
      const quantity = evaluateText(table, this.have, context);
      if (!quantity.ok) {
        return {
          kind: "error",
          side: "have",
          message: describeTextError(
            quantity.error,
            this.have,
            table.primitives,
          ),
        };
      }
      const { magnitude, dimension } = quantity.value;
      const unit = isDimensionless(dimension)
        ? ""
        : formatDimension(dimension, table.primitives);
      return { kind: "result", lines: [line(have, magnitude, unit, context)] };
    }
    const conversion = convertText(table, this.have, this.want, context);
    if (!conversion.ok) {
      const { error } = conversion;
      return {
        kind: "error",
        side: error.kind === "inputError" ? error.side : undefined,
        message: describeConversionError(
          error,
          this.have,
          this.want,
          table.primitives,
        ),
      };
    }
    switch (conversion.value.kind) {
      case "unit":
        return unitResult(have, want, conversion.value.value, context);
      case "list":
        return listResult(have, conversion.value, context);
      case "function":
        return functionResult(have, conversion.value, context);
    }
  }
}

/**
 * The `want` as the output writes it after the value (or the `have`, on
 * the reciprocal line, where it takes the want's place), so that the whole
 * line reads as the expression it means. `1 mi` in `1000 ft` is
 * `5.28 × 1000 ft`; without the sign, the number would read as one product
 * with the want. A want that is a sum, a difference or a negation is
 * parenthesized, `3.0284676 (ft + in)` and `-3.2808399 (-ft)`, since
 * `3.0284676 ft + in` would read as `(3.0284676 ft) + in` and
 * `-3.2808399 -ft` as a difference. A want that starts with a unit name
 * needs neither: `36 in`. The text is trimmed, and it parsed a moment ago.
 */
function wantText(want: string): string {
  const expr = parseExpr(want);
  const loose =
    expr.ok &&
    (expr.value.node.kind === "neg" ||
      (expr.value.node.kind === "binary" &&
        (expr.value.node.op === "add" || expr.value.node.op === "sub")));
  if (loose) return `(${want})`;
  return /^[\d.]/.test(want) ? `× ${want}` : want;
}

/**
 * One of the two text fields, labelled `label`. Both fields are rendered
 * here so that they cannot differ in what they turn off. Units and
 * expressions are neither words nor sentences, so every assistant the
 * browser or an extension offers a text field is in the way:
 *
 * - `autocomplete="off"` keeps the browser from suggesting earlier entries
 *   and, per the HTML spec, from restoring the field's value when the page
 *   is reloaded or revisited (Firefox restores other fields). The fields
 *   also have no `name` and sit in no `<form>`, so nothing is ever submitted
 *   or saved to the browser's form history in the first place.
 * - `autocorrect`, `autocapitalize` and `spellcheck` are the on-screen
 *   keyboard and spell-checker: `Ft` is not a unit, and `km` is not a typo.
 * - `data-gramm`, `data-1p-ignore` and `data-lpignore` are what Grammarly
 *   and the 1Password and LastPass extensions look for to leave a field
 *   alone; there is no standard attribute for that.
 */
function renderInput(
  label: string,
  placeholder: string,
  enterKeyHint: "next" | "done",
  invalid: boolean,
  value: string,
  onInput: (event: Event) => void,
): TemplateResult {
  return html`
    <label>
      ${label}
      <input
        type="text"
        placeholder=${placeholder}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint=${enterKeyHint}
        data-gramm="false"
        data-1p-ignore
        data-lpignore="true"
        aria-invalid=${invalid ? "true" : nothing}
        .value=${value}
        @input=${onInput}
      />
    </label>
  `;
}

/**
 * The result outcome for a conversion of `have` into the one unit `want`,
 * `have` being `value` `want`s, with the reciprocal beneath it: the same
 * conversion the other way round, `want` being `1 / value` `have`s,
 * written as the first line is with the sides swapped
 * (`in ≈ 0.027777778 × 3 ft`), the `have` taking the place of the unit and
 * written as a unit is. A `value` of zero has no reciprocal (`0 ft = 0 in`,
 * and nothing is a multiple of `0 ft`), and nor does one that cannot be
 * told from zero, so the second line is left out rather than shown as
 * anything.
 */
function unitResult(
  have: string,
  want: string,
  value: Ball,
  context: NumberContext,
): Outcome {
  const lines = [line(have, value, wantText(want), context)];
  const inverse = divideBalls(exact(ONE), value);
  if (inverse.ok) {
    lines.push(line(want, inverse.value, wantText(have), context));
  }
  return { kind: "result", lines };
}

/**
 * The line `have` is `value` `unit`, as `show` certifies it at `context`:
 * `=` for an exact value, `≈` otherwise, and a note for the kinds that do
 * not show every digit asked for.
 */
function line(
  have: string,
  value: Ball,
  unit: string,
  context: NumberContext,
): Line {
  const shown = show(value, context.precision, context.rounding);
  return {
    have,
    relation: shown.kind === "exact" ? "=" : "≈",
    terms: [{ text: shown.text, negative: sign(value.mid) < 0, unit }],
    note: noteOf(shown, context.precision),
  };
}

/** The note for a `shown` value at `digits` asked for, or none when every digit shown is certain. */
function noteOf(shown: Shown, digits: Precision): string | undefined {
  switch (shown.kind) {
    case "partial":
      return `${shown.certified} of ${digits} digits are certain`;
    case "zero":
      return `within ${shown.bound} of zero`;
    case "unbounded":
      return "the digits are not certified";
    default:
      return undefined;
  }
}

/**
 * The result outcome for a conversion into a unit list: the remainder
 * certified unrounded, then the terms rounded for display by `roundTerms`
 * at the digits it certifies, so that a remainder which rounds up to a
 * whole of an earlier unit carries into it, and exact when every unrounded
 * term is exact. The counts are exact integers, formatted at the digits
 * asked for; the remainder's text is formatted at the digits certified, or
 * is `0` when it cannot be told from zero, and the line's note is the
 * remainder's. A term of zero is left out, as it would be in speech
 * (`1 hr + 1 s`, not `1 hr + 0 min + 1 s`), and so is a last term that
 * cannot be told from zero, with its note, except that a sum of nothing
 * but zeros keeps its last term (`0 in`, with the bound).
 */
function listResult(
  have: string,
  conversion: Extract<Conversion, { kind: "list" }>,
  context: NumberContext,
): Outcome {
  const { units, terms } = conversion;
  const { precision, rounding } = context;
  const last = terms.length - 1;
  const shown = terms.map((t) => show(t, precision, rounding));
  const unrounded = shown[last]!;
  const certified =
    unrounded.kind === "partial" && unrounded.certified > 0
      ? unrounded.certified
      : precision;
  const rounded = roundTerms(
    units.map((unit) => unit.quantity),
    terms,
    certified,
    rounding,
  );
  // A carry leaves a new remainder, what is left after the carried units,
  // judged on its own; without one the unrounded remainder's kind stands.
  const carried = rounded
    .slice(0, last)
    .some((count, i) => !equals(count.mid, terms[i]!.mid));
  const remainder = carried
    ? show(rounded[last]!, precision, rounding)
    : unrounded;
  const all = rounded.map((value, i) => {
    const negative = sign(value.mid) < 0;
    const magnitude = negative ? absolute(value.mid) : value.mid;
    const text =
      i < last
        ? format(magnitude, precision, rounding)
        : remainder.kind === "zero"
          ? "0"
          : format(magnitude, certified, rounding);
    return { value, term: { text, negative, unit: wantText(units[i]!.text) } };
  });
  // A term of zero is left out, and so is a last term that cannot be told
  // from zero, with its note; a sum of nothing but zeros keeps its last
  // term, note and all.
  const nonzero = all.filter(
    (t, i) =>
      !isZero(t.value.mid) && !(i === last && remainder.kind === "zero"),
  );
  const kept = nonzero.length > 0 ? nonzero : all.slice(-1);
  const keepsRemainder = kept.includes(all[last]!);
  // The first term shown keeps its sign in its text; the rest are unsigned.
  const written = kept.map((t, i) =>
    i === 0 && t.term.negative
      ? { ...t.term, text: `-${t.term.text}` }
      : t.term,
  );
  return {
    kind: "result",
    lines: [
      {
        have,
        relation: shown.every((s) => s.kind === "exact") ? "=" : "≈",
        terms: written,
        note: keepsRemainder ? noteOf(remainder, precision) : undefined,
      },
    ],
  };
}

/**
 * The result outcome for a conversion into a function: one line, the
 * `have` being the call of the function at the recovered argument,
 * `tempF(212) = tempC(100)`. The argument is written as a count of the
 * unit the function declares for it, followed by that unit's text as a
 * want's is written, and by nothing when the declared unit is `1`, a
 * plain number. The relation is `=` when the count shows exactly, as for
 * any value. There is no reciprocal: a call is not a ratio.
 */
function functionResult(
  have: string,
  conversion: Extract<Conversion, { kind: "function" }>,
  context: NumberContext,
): Outcome {
  const { name, value, unit } = conversion;
  const { relation, terms } = line(
    have,
    value,
    unit.text === "1" ? "" : wantText(unit.text),
    context,
  );
  return { kind: "result", lines: [{ have, relation, terms, call: name }] };
}

function renderOutcome(outcome: Outcome): TemplateResult {
  switch (outcome.kind) {
    case "empty":
      return html`<span class="hint">
        Type a quantity, such as <code>3 ft</code>, and the unit to convert it
        to, such as <code>in</code> or <code>ft;in</code>.
      </span>`;
    case "result":
      return html`${outcome.lines.map(renderLine)}`;
    case "error":
      return html`<span class="error">${outcome.message}</span>`;
  }
}

/**
 * One line of a result, on a line of its own; the terms inside a call when
 * the line is one, and the note, when there is one, after them.
 */
function renderLine(line: Line): TemplateResult {
  const terms = line.terms.map(renderTerm);
  const sum = line.call === undefined ? terms : html`${line.call}(${terms})`;
  const note =
    line.note === undefined
      ? nothing
      : html` <span class="note">(${line.note})</span>`;
  return html`<div>
    <span>${line.have}</span> ${line.relation} ${sum}${note}
  </div>`;
}

/**
 * One term of a result. The first is written with its own sign; each later
 * one is joined to the sum by `+` or `-` and written unsigned (its text is
 * already so), so that the line reads as the expression it is
 * (`-3 ft - 3.3700787 in`), and could be typed back as a `have`.
 */
function renderTerm(term: Term, index: number): TemplateResult {
  const operator = index === 0 ? "" : term.negative ? " - " : " + ";
  const unit = term.unit === "" ? nothing : html` ${term.unit}`;
  return html`${operator}<span class="value">${term.text}</span>${unit}`;
}

declare global {
  interface HTMLElementTagNameMap {
    "unit-converter": UnitConverter;
  }
}
