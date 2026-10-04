// The pipeline over text: the one function the UI calls. `convertText` runs
// the whole of the pipeline ARCHITECTURE.md describes for one `have` and one
// `want`: each text is parsed (`expr.ts`) and evaluated against the table
// (`evaluate.ts`, `table.ts`), and the two quantities are converted
// (`convert.ts`). It is the composition and nothing more: every step is one
// of those modules, and this one adds no behavior of its own beyond
// choosing the output mode from the shape of the `want`.
//
// The `want` is read as a unit list, of which an expression alone is a list
// of one. One item that is a bare name of a unit list in the table means
// that list, and one that is a bare name of a function means the function;
// any other one item is a unit, and the conversion is the ratio `convert`
// gives; two or more items are a list typed out, and the conversion is the
// sum `convertToList` gives, with each item's text kept beside its unit for
// the UI to show. A list's or a function's name is not a unit, so it means
// the list or the function only when it stands alone: `2 time` and
// `2 tempC` are unknown units.
//
// A function as the `want` (docs/functions.md) is answered by the call that
// would produce the `have`: `tempF(212)` into `tempC` is `tempC(100)`. It
// needs the function's inverse, `~tempC`, and a function without one is a
// `noInverse` on the want side. The `have` must conform to the function's
// result, which is the ordinary conformance error of the pair when it does
// not, and the inverse's body then recovers the argument, `invertFunction`
// evaluating it with the inverse's parameter bound to the `have`. The
// recovered argument is then checked, since an inverse is the one part of
// a definition the build cannot check: the function is applied to it, and
// a value disjoint from the `have` is an `inverseMismatch`, an answer
// certainly wrong. Overlap is what balls can decide, so the check refutes
// and never proves; two exact values are compared exactly, and a
// difference too large to form refutes nothing. The conversion carries the
// recovered argument and the unit the parameter takes with its text, and
// the argument as a count of that unit, which is what the UI writes inside
// the call. A `want` that is itself a call, `tempC(100)`, is not special:
// it is an expression, and the conversion is the ratio.
//
// The steps' errors keep their own types; this module only says which text
// an error is in. A parse or evaluation error carries a span into the text
// it came from, so the side is what a caller needs to point at the right
// input, while a conversion error is about the pair and has no side. A
// unit typed in a list that fails the list's checks is reported with the
// texts of the list's units, so that a message can quote the one at fault;
// a list from the table has passed those checks when it was built, and can
// fail only for not conforming to the `have`, which is reported as the
// same mismatch a single `want` would be. An inverse's body that fails for
// the `have`'s value is an `inverseFailed` on the want side, carrying the
// body's error as a call carries its body's, and the function's body
// failing at the recovered argument is an `inverseMismatch` carrying it. `evaluateText` is the first
// half on its own, for a caller that wants to know what one text denotes
// without converting it.
//
// The `NumberContext` both take is the user's: its precision is the digits
// asked for, not the precision anything is computed at. This is the one
// place that knows the difference (D1 of docs/calculator-plan.md): the
// working contexts the texts are evaluated at are derived here, by the
// retry schedule of D12. `schedule` yields the digits asked for plus a
// guard of ten, then twice that, four times, doubling, and last the
// context's `ceiling` (the shell derives it from the cap on the digits
// setting, `ceilingFor` in context.ts, and it is the same in every working
// context; a context whose precision exceeds that cap is a precondition
// failure). In decimal mode (4.6) the schedule is the user's context
// alone: every operation rounds to the digits asked for in the rounding
// mode, so raising the internal precision would compute something other
// than what the mode asks for, and the display marks what the radius does
// not certify without escalating; an `unresolved` is then final and
// reported at once. The table is built at the ceiling in exact mode
// whatever the user's mode (`ceilingContext`), and the lookup settles a
// unit in the user's mode.
// `resolve` runs the evaluation at each working context in turn and stops
// at the first result whose every value is exact, certified at the digits
// asked for, or of unbounded radius, which no pass can narrow; a result
// that certifies fewer digits is kept as the best so far and the next pass
// tried, since cancellation that cost `k` digits is paid for by `k` more
// working digits. An `unresolved` (a value that cannot be told from zero,
// at any depth of a call or an inverse, and the converter's
// `unresolvedWant`) is retried the same way; any other error ends the loop,
// with the best result so far if a pass produced one, since the only such
// error a later pass can raise that an earlier one did not is a `tooLarge`
// that marks the pass as unaffordable, and otherwise with the error. At
// the ceiling the best result so far, or the last error, is returned, and
// the display shows what is certified (a `partial` or `zero` kind) or the
// `unresolved` the user sees. Two gaps are accepted: a list unit whose
// ball straddles zero is `nonpositiveUnit`, which is not retried, and the
// reciprocal line the component computes is shown with whatever kind `1 /
// value` has, not retried on its own. The texts are parsed once, outside
// the passes. The table is built at the ceiling context, by its builder
// (D6), so that no unit holds a pass back.

import {
  convert,
  convertToList,
  type ConvertError,
  type ListRefusal,
  type UnitListError,
} from "./convert.ts";
import { checkConformance } from "./dimension.ts";
import {
  applyFunction,
  evaluate,
  invertFunction,
  type EvaluateError,
} from "./evaluate.ts";
import { parseExpr, parseUnitList, type Expr, type Rejection } from "./expr.ts";
import type { ParseError } from "./parser.ts";
import type { Quantity } from "./quantity.ts";
import {
  certifies,
  divideBalls,
  isExact,
  position,
  settle,
  subtractBalls,
  type Ball,
} from "./ball.ts";
import {
  GUARD_DIGITS,
  checkContext,
  modeOf,
  type NumberContext,
} from "./context.ts";
import { isUnbounded } from "./radius.ts";
import { err, ok, type Result } from "./result.ts";
import {
  ZERO,
  equals,
  isRefusal,
  mantissaWithin,
  type Refusal,
} from "./scaled.ts";
import {
  unitLookup,
  type ListedUnit,
  type LookupError,
  type UnitFunction,
  type UnitTable,
  type WrittenUnit,
} from "./table.ts";

// ---------------------------------------------------------------------------
// Types

/** Which of the two texts of a conversion something is about. */
export type Side = "have" | "want";

/** Why a text denotes no quantity: it does not parse, or does not evaluate. */
export type TextError = ParseError<Rejection> | EvaluateError | LookupError;

/**
 * The inverse of the function `name`, the `want`, failed for the `have`'s
 * value as `error` says; its spans are into the definitions text.
 */
export type InverseFailed = {
  readonly kind: "inverseFailed";
  readonly name: string;
  readonly error: EvaluateError;
};

/** Why the function `name`, the `want`, gives no call for the `have`. */
export type FunctionWantError =
  | InverseFailed
  /** The function has no inverse, so nothing recovers an argument. */
  | { readonly kind: "noInverse"; readonly name: string }
  /**
   * The function applied to the argument its inverse recovered is
   * certainly not the `have`: disjoint from it, or, with `error`, failing
   * there as `error` says (spans into the definitions text).
   */
  | {
      readonly kind: "inverseMismatch";
      readonly name: string;
      readonly error?: EvaluateError;
    };

export type Conversion =
  /** `have` is `value` `want`s. */
  | {
      readonly kind: "unit";
      readonly have: Quantity;
      readonly want: Quantity;
      /** How many `want`s make up `have`: a ball, exact for exact quantities. */
      readonly value: Ball;
    }
  /** `have` is the sum of the `terms`, one per unit of the list `units`. */
  | {
      readonly kind: "list";
      readonly have: Quantity;
      /** The units of the list, largest first, each with its text. */
      readonly units: readonly ListedUnit[];
      /** The exact count of each unit but the last, and the remainder in the last, as balls. */
      readonly terms: readonly Ball[];
    }
  /** `have` is `name(argument)`: the function `name` applied to `value` `unit`s. */
  | {
      readonly kind: "function";
      readonly have: Quantity;
      /** The function's name, which is the `want`. */
      readonly name: string;
      /** The argument the inverse recovered. */
      readonly argument: Quantity;
      /** The unit the function's parameter takes, with its text. */
      readonly unit: WrittenUnit;
      /** How many `unit`s make up `argument`: a ball. */
      readonly value: Ball;
    };

export type ConversionError =
  /**
   * The text on `side` failed as `error` says; `have` is tried first. An
   * `inverseFailed` is on the want side, the function being the want.
   */
  | {
      readonly kind: "inputError";
      readonly side: Side;
      readonly error: TextError | FunctionWantError;
    }
  | ConvertError
  /**
   * The conversion's ratio, or a function want's count, is exact and its
   * canonical mantissa passes the range limit (D19), the two quotients
   * the pipeline forms outside the evaluator; `exact` tells it from a
   * refusal the converter passes on, and the message names the remedy
   * (D20), `approx` around the `have`.
   */
  | { readonly kind: "tooLarge"; readonly exact: true }
  /**
   * The `want` is a list typed out whose unit at `error.index` fails as
   * `error` says; `units` are the texts of its units, in order.
   */
  | {
      readonly kind: "unitListError";
      readonly units: readonly string[];
      readonly error: UnitListError;
    };

// ---------------------------------------------------------------------------
// The pipeline

/**
 * The working contexts for the user's `context`, per D12: the digits asked
 * for plus the guard, then that doubled, doubled again, and so on while
 * below the context's ceiling, and the ceiling last; the rounding mode,
 * the range limit, the ceiling and the mode are the user's throughout. In
 * decimal mode the context itself, alone (4.6). A precision above the cap
 * the ceiling was derived from (`ceilingFor` in context.ts, four times the
 * cap plus the guard) is a precondition failure.
 */
export function schedule(context: NumberContext): NumberContext[] {
  checkContext(context);
  const { ceiling } = context;
  if (modeOf(context) === "decimal") return [context];
  const first = context.precision + GUARD_DIGITS;
  if (4 * first > ceiling) {
    throw new RangeError(
      `${context.precision} digits exceed the cap for a ceiling of ${ceiling}`,
    );
  }
  const contexts: NumberContext[] = [];
  for (let precision = first; precision < ceiling; precision *= 2) {
    contexts.push({ ...context, precision });
  }
  contexts.push({ ...context, precision: ceiling });
  return contexts;
}

/**
 * `run` at each working context of `schedule(context)` in turn:
 * the first result `done` accepts is returned; a result it rejects is kept
 * as the best so far; an error `retries` accepts continues; any other
 * error ends the loop with the best result so far, or with the error when
 * no pass produced a result; at the ceiling the best result so far, or the
 * last error, is returned.
 */
export function resolve<T, E>(
  context: NumberContext,
  run: (working: NumberContext) => Result<T, E>,
  done: (value: T) => boolean,
  retries: (error: E) => boolean,
): Result<T, E> {
  let best: Result<T, E> | undefined;
  let last: Result<T, E> | undefined;
  for (const working of schedule(context)) {
    const result = run(working);
    last = result;
    if (result.ok) {
      if (done(result.value)) return result;
      best = result;
    } else if (!retries(result.error)) {
      return best ?? result;
    }
  }
  return best ?? last!;
}

/**
 * Whether `ball` is settled as far as the display can use at `context`:
 * exact, certified at the digits asked for in the mode, or of unbounded
 * radius, which no pass can narrow.
 */
function settled(ball: Ball, context: NumberContext): boolean {
  return (
    isExact(ball) ||
    isUnbounded(ball.rad) ||
    certifies(ball, context.precision, context.rounding)
  );
}

/** Whether `error` is an `unresolved` at any depth of a call or an inverse. */
function isUnresolved(error: TextError | FunctionWantError): boolean {
  switch (error.kind) {
    case "unresolved":
      return true;
    case "callFailed":
    case "inverseFailed":
      return isUnresolved(error.error);
    case "inverseMismatch":
      return error.error !== undefined && isUnresolved(error.error);
    default:
      return false;
  }
}

/** Whether another pass may resolve `error`: an `unresolved` at any depth, an unresolved want, or a result straddling the bound. */
function retriesConversion(error: ConversionError): boolean {
  switch (error.kind) {
    case "inputError":
      return isUnresolved(error.error);
    case "unresolvedWant":
    case "unresolvedBound":
      return true;
    default:
      return false;
  }
}

/** Whether every value in `conversion` is settled at `context`. */
function conversionDone(
  conversion: Conversion,
  context: NumberContext,
): boolean {
  switch (conversion.kind) {
    case "unit":
    case "function":
      return settled(conversion.value, context);
    case "list":
      return conversion.terms.every((term) => settled(term, context));
  }
}

/**
 * The quantity `text` denotes in `table`, evaluated through the retry
 * schedule of the user's `context`.
 */
export function evaluateText(
  table: UnitTable,
  text: string,
  context: NumberContext,
): Result<Quantity, TextError> {
  const expr = parseExpr(text);
  if (!expr.ok) return expr;
  return resolve(
    context,
    (working) => evaluateExpr(table, expr.value, working),
    (quantity) => settled(quantity.magnitude, context),
    isUnresolved,
  );
}

/**
 * `have` in `want`, with both texts read against `table`, or the first
 * failure: `have` is evaluated before `want`, and the two are converted
 * only once both denote something. A `want` of one unit gives the ratio, a
 * `want` of several (`ft;in`), or the name of a unit list in the table,
 * gives the sum, and the name of a function gives the call that would
 * produce `have`. Both texts are parsed once, and the evaluation and the
 * conversion run through the retry schedule of the user's `context`.
 */
export function convertText(
  table: UnitTable,
  have: string,
  want: string,
  context: NumberContext,
): Result<Conversion, ConversionError> {
  const haveExpr = parseExpr(have);
  if (!haveExpr.ok) return inputError("have", haveExpr.error);
  const items = parseUnitList(want);
  if (!items.ok) {
    // `have` is tried first: its failure to evaluate is reported before
    // the want's failure to parse, at the schedule's first pass.
    const first = evaluateExpr(table, haveExpr.value, schedule(context)[0]!);
    return inputError(
      first.ok ? "want" : "have",
      first.ok ? items.error : first.error,
    );
  }
  return resolve(
    context,
    (working) =>
      convertParsed(table, haveExpr.value, want, items.value, working),
    (conversion) => conversionDone(conversion, context),
    retriesConversion,
  );
}

/** One pass of `convertText`, at the `working` context, over the parsed texts. */
function convertParsed(
  table: UnitTable,
  have: Expr,
  want: string,
  items: readonly Expr[],
  working: NumberContext,
): Result<Conversion, ConversionError> {
  const haveQuantity = evaluateExpr(table, have, working);
  if (!haveQuantity.ok) return inputError("have", haveQuantity.error);
  const [first, ...rest] = items;
  if (first !== undefined && rest.length === 0) {
    const name = first.node.kind === "unit" ? first.node.name : undefined;
    const named = name === undefined ? undefined : table.unitLists.get(name);
    if (named !== undefined) {
      return convertToNamedList(table, haveQuantity.value, named, working);
    }
    const fn = name === undefined ? undefined : table.functions.get(name);
    if (fn !== undefined) {
      return convertToFunction(table, haveQuantity.value, fn, working);
    }
    const wantQuantity = evaluateExpr(table, first, working);
    if (!wantQuantity.ok) return inputError("want", wantQuantity.error);
    const value = convert(
      haveQuantity.value,
      wantQuantity.value,
      table.primitives,
    );
    if (!value.ok) return value;
    if (pastLimit(value.value, working)) return err(EXACT_TOO_LARGE);
    const settled = settledInMode(value.value, working);
    if (!settled.ok) return settled;
    return ok({
      kind: "unit",
      have: haveQuantity.value,
      want: wantQuantity.value,
      value: settled.value,
    });
  }
  const units: ListedUnit[] = [];
  for (const item of items) {
    const quantity = evaluateExpr(table, item, working);
    if (!quantity.ok) return inputError("want", quantity.error);
    units.push({
      text: want.slice(item.span.start, item.span.end),
      quantity: quantity.value,
    });
  }
  const terms = convertToList(
    haveQuantity.value,
    units.map((unit) => unit.quantity),
    table.primitives,
    working,
  );
  if (!terms.ok) {
    const { error } = terms;
    if (isListRefusal(error)) return refusedList(error);
    return err({
      kind: "unitListError",
      units: units.map((unit) => unit.text),
      error,
    });
  }
  const settled = settledTermsInMode(terms.value, working);
  if (!settled.ok) return settled;
  return ok({
    kind: "list",
    have: haveQuantity.value,
    units,
    terms: settled.value,
  });
}

/**
 * `quotient`, formed by the pipeline outside the evaluator (a ratio, a
 * count, a list's term), settled in decimal mode as every step is (D15):
 * stage 4 left these to the display's rounding, which the fractions
 * display no longer applies to an exact value (docs/fractions.md, "The
 * decimal mode"), so `1 m` in `in` at eight digits is `39.370079` within
 * a bound there, inexact, and `1 in` in `cm` is `2.54`, exact. A refusal
 * is the quotient's. In exact mode the quotient of settled operands is
 * left as it is.
 */
function settledInMode(
  quotient: Ball,
  context: NumberContext,
): Result<Ball, ConversionError> {
  if (modeOf(context) !== "decimal") return ok(quotient);
  const settled = settle(quotient, context);
  if (settled.ok) return settled;
  if (isRefusal(settled.error)) return err(refusal(settled.error));
  throw new Error(`A settle failed otherwise: ${settled.error.kind}`);
}

/** Each of `terms` as `settledInMode` settles it; the first refusal is the list's. */
function settledTermsInMode(
  terms: readonly Ball[],
  context: NumberContext,
): Result<readonly Ball[], ConversionError> {
  if (modeOf(context) !== "decimal") return ok(terms);
  const settled: Ball[] = [];
  for (const term of terms) {
    const result = settledInMode(term, context);
    if (!result.ok) return result;
    settled.push(result.value);
  }
  return ok(settled);
}

/** Whether a list's failure is its arithmetic's rather than a unit's. */
function isListRefusal(
  error: UnitListError | ListRefusal,
): error is ListRefusal {
  return (
    error.kind !== "nonconformingUnit" &&
    error.kind !== "nonpositiveUnit" &&
    error.kind !== "unitOutOfOrder"
  );
}

/**
 * A list's arithmetic failure as the conversion's: a refusal is the
 * conversion's refusal, and an `unresolved` at the bound the converter's
 * retried variant, as a ratio's is; a list's arithmetic straddles no
 * other edge, its sizes excluding zero, but one at zero would be an
 * unresolved want.
 */
function refusedList(error: ListRefusal): Result<never, ConversionError> {
  if (error.kind === "unresolved") {
    return err({
      kind: error.edge === "bound" ? "unresolvedBound" : "unresolvedWant",
    });
  }
  return err(refusal(error));
}

/** `error`'s kind as a refusal of its own, typed apart from the pipeline's exact `tooLarge`. */
function refusal(error: Refusal): Refusal {
  switch (error.kind) {
    case "tooLarge":
      return { kind: "tooLarge" };
    case "overflow":
      return { kind: "overflow" };
    case "underflow":
      return { kind: "underflow" };
  }
}

/**
 * `have` as a sum over a list from the table, which was checked when it
 * was built, so that the one way it can fail is `have` not conforming to
 * it: that is the mismatch of the pair, as for a single `want`.
 */
function convertToNamedList(
  table: UnitTable,
  have: Quantity,
  units: readonly ListedUnit[],
  working: NumberContext,
): Result<Conversion, ConversionError> {
  const terms = convertToList(
    have,
    units.map((unit) => unit.quantity),
    table.primitives,
    working,
  );
  if (!terms.ok) {
    const { error } = terms;
    if (isListRefusal(error)) return refusedList(error);
    if (error.kind === "nonconformingUnit") return err(error.mismatch);
    // `buildTable` checked the list's units against one another.
    throw new Error("A unit list in the table is not a valid list");
  }
  const settled = settledTermsInMode(terms.value, working);
  if (!settled.ok) return settled;
  return ok({ kind: "list", have, units, terms: settled.value });
}

/**
 * `have` as the call of `fn` that would produce it: `fn` must have an
 * inverse, `have` must conform to its result, which is the mismatch of the
 * pair when it does not, the inverse's body recovers the argument, and
 * `fn` applied to the argument must not be certainly other than `have`.
 * The argument's count of the unit the parameter takes is what the UI
 * writes in the call. The unit's ball excludes zero, as `buildTable`
 * checked, so the count exists unless it is refused as too large or too
 * small, as a ratio of magnitudes may be.
 */
function convertToFunction(
  table: UnitTable,
  have: Quantity,
  fn: UnitFunction,
  context: NumberContext,
): Result<Conversion, ConversionError> {
  if (fn.inverse === undefined) {
    return inputError("want", { kind: "noInverse", name: fn.name });
  }
  // The builder gives an inverse only to a function of one parameter.
  const parameter = fn.parameters[0]!;
  const conformance = checkConformance(
    have.dimension,
    fn.result,
    table.primitives,
  );
  if (!conformance.ok) return conformance;
  const lookup = unitLookup(table, context);
  const argument = invertFunction(
    fn.inverse,
    have,
    lookup,
    table.primitives,
    context,
  );
  if (!argument.ok) {
    const { error } = argument;
    return inputError(
      "want",
      error.kind === "lookup"
        ? error.error
        : { kind: "inverseFailed", name: fn.name, error: error.error },
    );
  }
  const back = applyFunction(
    fn,
    [argument.value],
    lookup,
    table.primitives,
    context,
  );
  if (!back.ok) {
    const { error } = back;
    return inputError(
      "want",
      error.kind === "lookup"
        ? error.error
        : { kind: "inverseMismatch", name: fn.name, error: error.error },
    );
  }
  if (disjoint(back.value.magnitude, have.magnitude, context)) {
    return inputError("want", { kind: "inverseMismatch", name: fn.name });
  }
  const value = divideBalls(
    argument.value.magnitude,
    parameter.unit.quantity.magnitude,
  );
  if (!value.ok) {
    // The count is refused as any quotient may be, as a ratio would be.
    if (isRefusal(value.error)) return err(refusal(value.error));
    throw new Error("A function in the table declares a zero argument unit");
  }
  if (pastLimit(value.value, context)) return err(EXACT_TOO_LARGE);
  const settled = settledInMode(value.value, context);
  if (!settled.ok) return settled;
  return ok({
    kind: "function",
    have,
    name: fn.name,
    argument: argument.value,
    unit: parameter.unit,
    value: settled.value,
  });
}

/**
 * Whether `a` and `b` certainly differ: two exact values compared exactly,
 * and otherwise their difference lying wholly on one side of zero. A
 * difference refused as too large to form, or one whose radius the
 * coarse bounds cannot place, is not certain, and refutes nothing.
 */
function disjoint(a: Ball, b: Ball, context: NumberContext): boolean {
  if (isExact(a) && isExact(b)) return !equals(a.mid, b.mid);
  const difference = subtractBalls(a, b, context);
  if (!difference.ok) return false;
  const where = position(difference.value, ZERO);
  return where === "above" || where === "below";
}

/** An exact ratio or count past the range limit (D19). */
const EXACT_TOO_LARGE: ConversionError = { kind: "tooLarge", exact: true };

/**
 * Whether `quotient`, exact, has a canonical mantissa past the range limit
 * of `context`: the check the evaluator makes at every node (D19), made
 * again after the two quotients formed outside it.
 */
function pastLimit(quotient: Ball, context: NumberContext): boolean {
  return isExact(quotient) && !mantissaWithin(quotient.mid, context.maxBits);
}

/** `expr` evaluated against `table` at the working `context`. */
function evaluateExpr(
  table: UnitTable,
  expr: Expr,
  context: NumberContext,
): Result<Quantity, TextError> {
  return evaluate(expr, unitLookup(table, context), table.primitives, context);
}

function inputError(
  side: Side,
  error: TextError | FunctionWantError,
): Result<never, ConversionError> {
  return err({ kind: "inputError", side, error });
}
