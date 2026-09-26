import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { roundTerms } from "./core/convert.ts";
import { formatDimension, isDimensionless } from "./core/dimension.ts";
import { parseExpr } from "./core/expr.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type Side,
} from "./core/pipeline.ts";
import {
  DEFAULT_PRECISION,
  absolute,
  equals,
  format,
  invert,
  isZero,
  round,
  sign,
  type Rational,
} from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/**
 * The significant digits a result is shown with. The core computes at
 * `DEFAULT_PRECISION` and rounds once, here, to this; ARCHITECTURE.md
 * ("Precision and rounding") says why the two are kept apart.
 */
export const DISPLAY_PRECISION = 8;

/** One term of a result: `value` of `unit`, where `unit` is text to show after the value. */
type Term = { readonly value: Rational; readonly unit: string };

/**
 * One line of a result: `have` is `relation` the sum of `terms`, as in
 * `3 ft = 36 in`, `1 m ≈ 39.370079 in` and `1 m ≈ 3 ft + 3.3700787 in`. A
 * conversion into one unit is one term; one into a unit list is a term per
 * unit shown.
 */
type Line = {
  readonly have: string;
  readonly relation: "=" | "≈";
  readonly terms: readonly Term[];
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
 * the sum the pipeline computes, one term per unit.
 *
 * A conversion into one unit is also shown the other way round, on a
 * second line, as GNU units shows every conversion twice (`* 36` and
 * `/ 0.027777778`, the number to multiply by and the number to divide by):
 * `3 ft = 36 in` and then `in ≈ 0.027777778 × 3 ft`, the `want` converted
 * into the `have`, which is what dividing by the second number does. The
 * two lines have the same shape with the sides swapped, and each reads as
 * a statement about quantities. Only a conversion into one unit has a
 * reciprocal: it is one ratio, and the reciprocal is the same ratio the
 * other way round. A conversion into a unit list is a sum, not a ratio, so
 * there is no other way round and no line is added; nor for a blank
 * `want`, which shows a definition; nor for a value of zero, which has no
 * reciprocal.
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

  /** Runs the pipeline over the current texts. */
  private outcome(): Outcome {
    const { table } = this;
    if (table === undefined) {
      return { kind: "error", message: "No units are loaded." };
    }
    const have = this.have.trim();
    const want = this.want.trim();
    if (have === "") return { kind: "empty" };
    if (want === "") {
      // What `have` is in the primitives: the unit's definition, in effect.
      const quantity = evaluateText(table, this.have, DEFAULT_PRECISION);
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
      return result(
        have,
        magnitude,
        isDimensionless(dimension)
          ? ""
          : formatDimension(dimension, table.primitives),
      );
    }
    const conversion = convertText(
      table,
      this.have,
      this.want,
      DEFAULT_PRECISION,
    );
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
    return conversion.value.kind === "unit"
      ? unitResult(have, want, conversion.value.value)
      : listResult(have, conversion.value);
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

/** The result outcome for `value` `unit`, marked exact or approximate. */
function result(have: string, value: Rational, unit: string): Outcome {
  return { kind: "result", lines: [line(have, value, unit)] };
}

/**
 * The result outcome for a conversion of `have` into the one unit `want`,
 * `have` being `value` `want`s, with the reciprocal beneath it: the same
 * conversion the other way round, `want` being `1 / value` `have`s,
 * written as the first line is with the sides swapped
 * (`in ≈ 0.027777778 × 3 ft`), the `have` taking the place of the unit and
 * written as a unit is. A `value` of zero has no reciprocal (`0 ft = 0 in`,
 * and nothing is a multiple of `0 ft`), so the second line is left out
 * rather than shown as anything.
 */
function unitResult(have: string, want: string, value: Rational): Outcome {
  const lines = [line(have, value, wantText(want))];
  const inverse = invert(value);
  if (inverse.ok) lines.push(line(want, inverse.value, wantText(have)));
  return { kind: "result", lines };
}

/** The line `have` is `value` `unit`, marked exact or approximate. */
function line(have: string, value: Rational, unit: string): Line {
  return {
    have,
    relation: shownExactly(value) ? "=" : "≈",
    terms: [{ value, unit }],
  };
}

/**
 * The result outcome for a conversion into a unit list: the terms rounded
 * for display by `roundTerms`, so that a remainder which rounds up to a
 * whole of an earlier unit carries into it, and exact when every exact
 * term already shows as it is. A term of zero is left out, as it would be
 * in speech (`1 hr + 1 s`, not `1 hr + 0 min + 1 s`), except that a sum of
 * nothing but zeros keeps its last term (`0 in`).
 */
function listResult(
  have: string,
  conversion: Extract<Conversion, { kind: "list" }>,
): Outcome {
  const { units, terms } = conversion;
  const shown = roundTerms(
    units.map((unit) => unit.quantity),
    terms,
    DISPLAY_PRECISION,
  );
  const all = shown.map((value, i) => ({
    value,
    unit: wantText(units[i]!.text),
  }));
  const nonzero = all.filter((term) => !isZero(term.value));
  return {
    kind: "result",
    lines: [
      {
        have,
        relation: terms.every(shownExactly) ? "=" : "≈",
        terms: nonzero.length > 0 ? nonzero : all.slice(-1),
      },
    ],
  };
}

/** Whether `value` is what its display at `DISPLAY_PRECISION` digits says. */
function shownExactly(value: Rational): boolean {
  return equals(round(value, DISPLAY_PRECISION), value);
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

/** One line of a result, on a line of its own. */
function renderLine(line: Line): TemplateResult {
  return html`<div>
    <span>${line.have}</span> ${line.relation} ${line.terms.map(renderTerm)}
  </div>`;
}

/**
 * One term of a result. The first is written with its own sign; each later
 * one is joined to the sum by `+` or `-` and written unsigned, so that the
 * line reads as the expression it is (`-3 ft - 3.3700787 in`), and could
 * be typed back as a `have`.
 */
function renderTerm(term: Term, index: number): TemplateResult {
  const value = index === 0 ? term.value : absolute(term.value);
  const operator = index === 0 ? "" : sign(term.value) < 0 ? " - " : " + ";
  const text = format(value, DISPLAY_PRECISION);
  return html`${operator}<span class="value">${text}</span> ${term.unit}`;
}

declare global {
  interface HTMLElementTagNameMap {
    "unit-converter": UnitConverter;
  }
}
