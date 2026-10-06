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
// count of the unit the function's parameter takes.
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
//
// A value computed under a condition that could not be decided
// (docs/functions.md, "An undecided condition") is shown all the same,
// with a warning for each condition it assumes, worded by messages.ts, and
// every line's relation `≈` whatever its digits; the reciprocal line, a
// list's line and a function want's line carry it alike, since the
// warning is the outcome's, not a line's.
//
// A line is two expressions and a relation, not text: the `have` as it
// was read, and the result composed from the values the display wrote
// (each a literal, or a fraction as the quotient of two) and the units as
// they were read, by the grammar's own operators: a value as the first
// factor of its unit (`36 m / s`, as one would type it, rather than
// `36 (m / s)`), joined by juxtaposition, or by `*` where the factor it
// joins leads with a number (`5.28 * 1000 ft`, since `5.28 1000 ft`
// cannot be read); the terms of a list summed; the argument inside the
// call. The printer (print.ts) writes both back canonically, deciding the
// parentheses, with `×` for the screen (`resultPieces`) and `*` for the
// clipboard (`copyText`); what it writes reads back as the same tree, so
// every line can be typed as a `have`.

import { divideBalls, exact, settle, type Ball } from "./core/ball.ts";
import { modeOf, type NumberContext } from "./core/context.ts";
import { roundTerms } from "./core/convert.ts";
import { dimensionExpr } from "./core/dimension.ts";
import { show, type Shown } from "./core/display.ts";
import type { Assumption } from "./core/evaluate.ts";
import { parseExpr, type Expr, type ExprNode } from "./core/expr.ts";
import { leadsWithNumber, print, text, type Piece } from "./core/print.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type PassObserver,
  type Side,
} from "./core/pipeline.ts";
import type { Precision } from "./core/rounding.ts";
import {
  ONE,
  absolute,
  equals,
  format,
  isZero,
  parseDecimal,
  sign,
} from "./core/scaled.ts";
import type { Span } from "./core/span.ts";
import type { UnitTable } from "./core/table.ts";
import {
  describeAssumption,
  describeConversionError,
  describeTextError,
} from "./messages.ts";

/**
 * How a line relates its two sides: `=` for an exact value every digit
 * of which is shown, `≈` for a rounded or an inexact one, and, in decimal
 * mode alone, the `≈` sign bearing a dot above it (U+2248 U+0307) for a
 * value that is exact under the mode's rounding but one of whose steps
 * could not be certified at the ceiling (D26; docs/decimal-mode.md, "The
 * ceiling"): an equality-like sign with a special meaning, that the value
 * is not known to be equal. The component draws the dot itself over the
 * `≈`; this is the text form.
 */
export type Relation = "=" | "≈" | typeof UNCERTIFIED;

/** The relation of an uncertified decimal-mode value: `≈` with the combining dot above. */
export const UNCERTIFIED = "≈\u0307";

/**
 * One line of a result: `have` is `relation` `result`, as in `3 ft = 36
 * in`, `1 m ≈ 39.370079 in` and `1 m ≈ 3 ft + 3.3700787 in`, each side an
 * expression the printer writes. `note` says what the digits are worth
 * when they are not all certain: how many are, that the value is within
 * a bound of zero, that none is certified, or that a step of a
 * decimal-mode computation could not be certified.
 */
export type Line = {
  readonly have: Expr;
  readonly relation: Relation;
  readonly result: Expr;
  readonly note?: string;
};

/** What the output area shows for the current pair of texts. */
export type Outcome =
  /** Nothing to convert yet. */
  | { readonly kind: "empty" }
  /**
   * The conversion, as one line, or two when it has a reciprocal: the
   * conversion and then the same conversion the other way round, `3 ft =
   * 36 in` and `in ≈ 0.027777778 × 3 ft`. `warnings`, when there are any,
   * name the conditions the value assumes, which could not be decided;
   * every line's relation is then `≈`.
   */
  | {
      readonly kind: "result";
      readonly lines: readonly Line[];
      readonly warnings?: readonly string[];
    }
  /** `message` says what is wrong, with the text on `side` if it is one text's fault. */
  | { readonly kind: "error"; readonly side?: Side; readonly message: string };

/** The result of `line` as pieces for the screen, its numbers apart from its units, with `×` for a product. */
export function resultPieces(line: Line): readonly Piece[] {
  return print(line.result, "×");
}

/**
 * The result of `line` as the clipboard gets it: the printer's text with
 * `*` for a product, which parses, so that typed back as a `have` and
 * converted into the line's own unit it gives the line again
 * (outcome.test.ts checks that).
 */
export function copyText(line: Line): string {
  return text(print(line.result, "*"));
}

/** The line as the screen shows it: the have, the relation, the result, and the note in parentheses. */
export function displayText(line: Line): string {
  const note = line.note === undefined ? "" : ` (${line.note})`;
  const have = text(print(line.have, "×"));
  return `${have} ${line.relation} ${text(resultPieces(line))}${note}`;
}

/**
 * The outcome for `haveText` converted into `wantString` against `table`
 * at `context`: the lines to show, the error to show, or nothing for a
 * blank `have`. The texts are trimmed here; the errors are located in the
 * texts as typed. `observe`, when given, sees each pass of the retry loop
 * (pipeline.ts), for the stress harness.
 */
export function outcomeOf(
  table: UnitTable,
  haveText: string,
  wantString: string,
  context: NumberContext,
  fractions = false,
  observe?: PassObserver,
): Outcome {
  if (haveText.trim() === "") return { kind: "empty" };
  const assumptions: Assumption[] = [];
  // The fractions display is exact mode's (D26; docs/decimal-mode.md, "The
  // display"): in decimal mode every value is a decimal of the digits
  // asked for, which its digits write entire, so `show` is never asked
  // for a fraction there, whatever the setting says.
  const outcome = outcomeAssuming(
    table,
    haveText,
    wantString,
    context,
    fractions && modeOf(context) !== "decimal",
    assumptions,
    observe,
  );
  return outcome.kind === "result" ? warned(outcome, assumptions) : outcome;
}

/**
 * `result` with a warning for each distinct one of `assumptions`, and
 * every line's relation `≈`, since a value that rests on an assumption is
 * not known to be the definition's at all; `result` itself without any.
 */
function warned(
  result: Extract<Outcome, { kind: "result" }>,
  assumptions: readonly Assumption[],
): Outcome {
  if (assumptions.length === 0) return result;
  return {
    kind: "result",
    lines: result.lines.map((line) => ({ ...line, relation: "≈" })),
    warnings: [...new Set(assumptions.map(describeAssumption))],
  };
}

/** `outcomeOf` for a `have` that is not blank, with the conditions the result assumes added to `assumptions`. */
function outcomeAssuming(
  table: UnitTable,
  haveText: string,
  wantString: string,
  context: NumberContext,
  fractions: boolean,
  assumptions: Assumption[],
  observe: PassObserver | undefined,
): Outcome {
  const want = wantString.trim();
  if (want === "") {
    // What `have` is in the primitives: the unit's definition, in effect.
    const quantity = evaluateText(
      table,
      haveText,
      context,
      assumptions,
      observe,
    );
    if (!quantity.ok) {
      return {
        kind: "error",
        side: "have",
        message: describeTextError(quantity.error, haveText, table.primitives),
      };
    }
    const { magnitude, dimension } = quantity.value;
    const unit = dimensionExpr(dimension, table.primitives);
    return {
      kind: "result",
      lines: [line(parsedHave(haveText), magnitude, unit, context, fractions)],
    };
  }
  const conversion = convertText(
    table,
    haveText,
    wantString,
    context,
    assumptions,
    observe,
  );
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
      return unitResult(conversion.value, context, fractions);
    case "list":
      return listResult(conversion.value, context, fractions);
    case "function":
      return functionResult(conversion.value, context, fractions);
  }
}

/**
 * The result outcome for a conversion of the have into one unit, the
 * have being `value` wants, with the reciprocal beneath it: the same
 * conversion the other way round, the want being `1 / value` haves,
 * written as the first line is with the sides swapped
 * (`in ≈ 0.027777778 * 3 ft`), the have taking the place of the unit. A
 * `value` of zero has no reciprocal (`0 ft = 0 in`, and nothing is a
 * multiple of `0 ft`), and nor does one that cannot be told from zero, so
 * the second line is left out rather than shown as anything. In decimal
 * mode the reciprocal is settled at the context, the mode's one rounding
 * of every step (D15, D26), so that `1/3` is `0.33333333` there, exact,
 * as it is in the first line; the rest of what the reciprocal lacks from
 * the pipeline (its retry in exact mode, and a word on a refusal) is
 * issue #92's.
 */
function unitResult(
  conversion: Extract<Conversion, { kind: "unit" }>,
  context: NumberContext,
  fractions: boolean,
): Outcome {
  const { haveExpr, wantExpr, value } = conversion;
  const lines = [line(haveExpr, value, wantExpr, context, fractions)];
  const quotient = divideBalls(exact(ONE), value);
  const inverse =
    quotient.ok && context.mode === "decimal"
      ? settle(quotient.value, context)
      : quotient;
  if (inverse.ok) {
    lines.push(line(wantExpr, inverse.value, haveExpr, context, fractions));
  }
  return { kind: "result", lines };
}

/**
 * The line `have` is `value` `unit`s, as `show` certifies the value at
 * `context`: `=` for an exact value, `≈` otherwise, and a note for the
 * kinds that do not show every digit asked for. With `fractions`, an
 * exact value that is not an integer is its fraction where it fits. With
 * no `unit`, the value is a plain number.
 */
function line(
  have: Expr,
  value: Ball,
  unit: Expr | undefined,
  context: NumberContext,
  fractions: boolean,
): Line {
  const shown = show(value, context.precision, context.rounding, fractions);
  return {
    have,
    relation: relationOf([shown]),
    result: quantityExpr(shown, sign(value.mid) < 0, unit),
    note: noteOf(shown, context.precision),
  };
}

/**
 * The relation of a line whose values are `shown`: `=` when every one is
 * exact, the uncertified sign when every one is exact or uncertified and
 * at least one is the latter, and `≈` otherwise.
 */
function relationOf(shown: readonly Shown[]): Relation {
  if (shown.every((s) => s.kind === "exact")) return "=";
  return shown.every((s) => s.kind === "exact" || s.kind === "uncertified")
    ? UNCERTIFIED
    : "≈";
}

/** The have as it was read; it was evaluated a moment ago, so it parses. */
function parsedHave(haveText: string): Expr {
  const expr = parseExpr(haveText);
  if (!expr.ok) throw new Error("The have evaluated but does not parse");
  return expr.value;
}

const SPAN: Span = { start: 0, end: 0 };

/** An expression composed here, with no span: it was built, not read. */
function expr(node: ExprNode): Expr {
  return { span: SPAN, node };
}

/** The literal the display wrote as `text`. */
function numberExpr(text: string): Expr {
  const value = parseDecimal(text);
  if (!value.ok) throw new Error(`The display wrote ${text}, not a literal`);
  return expr({ kind: "number", value: value.value, text });
}

/**
 * `shown` of `unit`, as the first factor of the unit (`timesFirst`) or
 * alone with no unit, negated when `negative`. A fraction is the quotient
 * of its two literals, with the sign on the numerator as the display
 * wrote it (`-5000/127`, and `(-5000/127) in` where a unit follows, the
 * printer parenthesizing the fraction; docs/fractions.md, "Where a
 * fraction is written"); any other value is its literal, and the quantity
 * negated whole (`-3 ft`).
 */
function quantityExpr(
  shown: Shown,
  negative: boolean,
  unit: Expr | undefined,
): Expr {
  const text = shown.text.startsWith("-") ? shown.text.slice(1) : shown.text;
  if (shown.kind === "exact" && shown.fraction === true) {
    const [num, den] = text.split("/");
    if (num === undefined || den === undefined) {
      throw new Error(`The display wrote the fraction ${text}`);
    }
    const numerator = negative ? negated(numberExpr(num)) : numberExpr(num);
    const fraction = expr({
      kind: "binary",
      op: "div",
      left: numerator,
      right: numberExpr(den),
    });
    return unit === undefined ? fraction : timesFirst(fraction, unit);
  }
  const value = numberExpr(text);
  const product = unit === undefined ? value : timesFirst(value, unit);
  return negative ? negated(product) : product;
}

function negated(operand: Expr): Expr {
  return expr({ kind: "neg", operand });
}

/**
 * `factor` times `unit`, as one would type it. A unit that leads with a
 * number cannot take the factor in front by juxtaposition, since a number
 * may only start a product, so the factor multiplies it whole, with `*`
 * (`5.28 * 1000 ft`). Otherwise the factor goes in front of the unit's
 * leftmost factor, down its products and quotients, so that `36` of
 * `m / s` is `36 m / s` and not `36 (m / s)`, which the grammar reads to
 * the same value since a product's first factor multiplies the whole of a
 * left-associative chain; a unit that is a sum, a difference or a
 * negation is a factor whole, and the printer parenthesizes it.
 */
function timesFirst(factor: Expr, unit: Expr): Expr {
  const { node } = unit;
  if (leadsWithNumber(unit)) {
    return expr({ kind: "binary", op: "mul", left: factor, right: unit });
  }
  if (
    node.kind === "binary" &&
    (node.op === "juxtapose" || node.op === "mul" || node.op === "div")
  ) {
    return expr({ ...node, left: timesFirst(factor, node.left) });
  }
  return expr({ kind: "binary", op: "juxtapose", left: factor, right: unit });
}

/** The sum of `terms`, the first with its sign and each later one joined by `+` or `-` by its sign. */
function sumExpr(
  terms: readonly { readonly quantity: Expr; readonly negative: boolean }[],
): Expr {
  const [first, ...rest] = terms;
  if (first === undefined) throw new Error("A sum of no terms");
  const head = first.negative ? negated(first.quantity) : first.quantity;
  return rest.reduce(
    (left, term) =>
      expr({
        kind: "binary",
        op: term.negative ? "sub" : "add",
        left,
        right: term.quantity,
      }),
    head,
  );
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
    case "uncertified":
      return "a step could not be certified at the precision limit";
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
  conversion: Extract<Conversion, { kind: "list" }>,
  context: NumberContext,
  fractions: boolean,
): Outcome {
  const { haveExpr, units, terms } = conversion;
  const { precision, rounding } = context;
  const last = terms.length - 1;
  const shown = terms.map((t) => show(t, precision, rounding, fractions));
  const unrounded = shown[last]!;
  // With fractions, an exact remainder whose fraction fits is written as
  // it is, entire, so there is nothing to round and nothing carries.
  const asFraction = unrounded.kind === "exact" && unrounded.fraction === true;
  const certified =
    unrounded.kind === "partial" && unrounded.certified > 0
      ? unrounded.certified
      : precision;
  const rounded = asFraction
    ? terms
    : roundTerms(
        units.map((unit) => unit.quantity),
        terms,
        certified,
        rounding,
        context,
      );
  // A carry leaves a new remainder, what is left after the carried units,
  // judged on its own; without one the unrounded remainder's kind stands.
  const carried =
    !asFraction &&
    rounded
      .slice(0, last)
      .some((count, i) => !equals(count.mid, terms[i]!.mid));
  const remainder = carried
    ? show(rounded[last]!, precision, rounding, fractions)
    : unrounded;
  const all = rounded.map((value, i) => {
    const negative = sign(value.mid) < 0;
    const magnitude = negative ? absolute(value.mid) : value.mid;
    // The remainder's fraction is taken from the magnitude's own ball,
    // which is exact as the term is; a count and a rounded remainder are
    // formatted from the magnitude at their digits.
    const shown: Shown =
      i < last
        ? { kind: "exact", text: format(magnitude, precision, rounding) }
        : remainder.kind === "zero"
          ? remainder
          : remainder.kind === "exact" && remainder.fraction === true
            ? show(exact(magnitude), precision, rounding, true)
            : { kind: "exact", text: format(magnitude, certified, rounding) };
    return {
      value,
      negative,
      quantity: quantityExpr(shown, false, units[i]!.expr),
    };
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
  return {
    kind: "result",
    lines: [
      {
        have: haveExpr,
        relation: relationOf(shown),
        result: sumExpr(kept),
        note: keepsRemainder ? noteOf(remainder, precision) : undefined,
      },
    ],
  };
}

/**
 * The result outcome for a conversion into a function: one line, the
 * `have` being the call of the function at the recovered argument,
 * `tempF(212) = tempC(100)`. The argument is written as a count of the
 * unit the function's parameter takes, followed by that unit's text as a
 * want's is written, and by nothing when it is `1`, a plain number (as
 * for a parameter without an annotation). The relation is `=` when the count shows exactly, as for
 * any value. There is no reciprocal: a call is not a ratio.
 */
function functionResult(
  conversion: Extract<Conversion, { kind: "function" }>,
  context: NumberContext,
  fractions: boolean,
): Outcome {
  const { haveExpr, name, value, unit } = conversion;
  const { relation, result } = line(
    haveExpr,
    value,
    unit.text === "1" ? undefined : unit.expr,
    context,
    fractions,
  );
  const call = expr({
    kind: "call",
    name,
    nameSpan: SPAN,
    arguments: [result],
  });
  return {
    kind: "result",
    lines: [{ have: haveExpr, relation, result: call }],
  };
}
