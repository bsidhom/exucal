// The converter's outcome: what the output area shows for a pair of
// texts, computed from the pipeline's result with the display's steps
// (`show`, `roundTerms`) and none of the DOM, so that the lines the app
// writes can be checked under Node (`outcome.test.ts`). The component
// (`unit-converter.ts`) renders what this module returns.
//
// With `want` blank, the outcome is what `have` is in the table's
// primitives (`in = 0.0254 m`), the answer GNU units gives to the same
// question. A `want` that is a unit list, typed (`ft;in`) or by name
// (`time`), gives the sum the pipeline computes, one term per unit. A
// `want` that names a function gives the call that would produce the
// `have`, `tempF(212) = tempC(100)`, the recovered argument written as a
// count of the unit the function declares for it.
//
// The `context` is the user's settings as the pipeline takes them (the
// digits asked for, the rounding mode, the range limit and the ceiling of
// the retry schedule, which the shell derives from the cap on the digits):
// the pipeline computes at as many passes of rising precision as the
// digits asked for take, up to the ceiling, `roundTerms` and `show` round
// to the context's digits in its mode, and `=` is decided at those digits.
//
// What is shown is what `show` certifies (docs/calculator-plan.md, D7 and
// task 2.6): every digit asked for when the value allows, and otherwise
// the certified digits with a note saying how many of those asked for are
// certain, `≈ 0` with a note giving the bound within which the value lies
// when it cannot be told from zero, or the midpoint's digits with a note
// that none is certified when the radius is not known. A list is certified
// on its unrounded terms, since `roundTerms` moves the remainder's midpoint
// onto a rounding cell's edge in a directed mode, where re-certifying it
// would lose a digit; the remainder is then rounded at the digits
// certified, and the counts, which are exact integers, carry no note.
// When the rounding carried into an earlier unit, though, the last term
// is a new value, what is left after the carried units, and its kind is
// judged on the rounded remainder, which is then a hair from zero; a last
// term that cannot be told from zero is left out as a term of zero is,
// with its note, so `1.5 deg` in `dms`, whose angle units carry `pi()`'s
// radius, shows `≈ 1 deg + 30 arcmin`, and a sum of nothing but zeros keeps
// its last term with its bound. The reciprocal line shows its own kind.
//
// A conversion into one unit is also shown the other way round, on a
// second line, as GNU units shows every conversion twice (`* 36` and
// `/ 0.027777778`, the number to multiply by and the number to divide by):
// `3 ft = 36 in` and then `in ≈ 0.027777778 × 3 ft`, the `want` converted
// into the `have`, which is what dividing by the second number does. The
// two lines have the same shape with the sides swapped, and each reads as
// a statement about quantities. Only a conversion into one unit has a
// reciprocal: it is one ratio, and the reciprocal is the same ratio the
// other way round. A conversion into a unit list is a sum, not a ratio, and
// one into a function is a call, so there is no other way round and no
// line is added; nor for a blank `want`, which shows a definition; nor for
// a value of zero, which has no reciprocal.

import { divideBalls, exact, type Ball } from "./core/ball.ts";
import type { NumberContext } from "./core/context.ts";
import { roundTerms } from "./core/convert.ts";
import { formatDimension, isDimensionless } from "./core/dimension.ts";
import { show, type Shown } from "./core/display.ts";
import { parseExpr } from "./core/expr.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type Side,
} from "./core/pipeline.ts";
import type { Precision } from "./core/rounding.ts";
import { ONE, absolute, equals, format, isZero, sign } from "./core/scaled.ts";
import type { UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/**
 * One term of a result: `text`, the value as `show` writes it at the
 * context's digits in its mode, of `unit`, text to show after the value.
 * `negative` says the sign of the value, since the text of every term but
 * a line's first is written unsigned and the sign becomes the operator that
 * joins it to the sum.
 */
export type Term = {
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
export type Line = {
  readonly have: string;
  readonly relation: "=" | "≈";
  readonly terms: readonly Term[];
  readonly call?: string;
  readonly note?: string;
};

/** What the output area shows for the current pair of texts. */
export type Outcome =
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
 * The outcome for `haveText` converted into `wantString` against `table`
 * at `context`: the lines to show, the error to show, or nothing for a
 * blank `have`. The texts are trimmed here; the errors are located in the
 * texts as typed.
 */
export function outcomeOf(
  table: UnitTable,
  haveText: string,
  wantString: string,
  context: NumberContext,
): Outcome {
  const have = haveText.trim();
  const want = wantString.trim();
  if (have === "") return { kind: "empty" };
  if (want === "") {
    // What `have` is in the primitives: the unit's definition, in effect.
    const quantity = evaluateText(table, haveText, context);
    if (!quantity.ok) {
      return {
        kind: "error",
        side: "have",
        message: describeTextError(quantity.error, haveText, table.primitives),
      };
    }
    const { magnitude, dimension } = quantity.value;
    const unit = isDimensionless(dimension)
      ? ""
      : formatDimension(dimension, table.primitives);
    return { kind: "result", lines: [line(have, magnitude, unit, context)] };
  }
  const conversion = convertText(table, haveText, wantString, context);
  if (!conversion.ok) {
    const { error } = conversion;
    return {
      kind: "error",
      side: error.kind === "inputError" ? error.side : undefined,
      message: describeConversionError(
        error,
        haveText,
        wantString,
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
    context,
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
