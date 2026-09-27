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
// would produce the `have`: `tempF(212)` into `tempC` is `tempC(100)`. The
// `have` must conform to the unit the function declares for its result,
// which is the ordinary conformance error of the pair when it does not, and
// the inverse body then recovers the argument, `invertFunction` evaluating
// it with the function's name bound to the `have`. The conversion carries
// the recovered argument and the declared argument unit with its text, and
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
// same mismatch a single `want` would be. An inverse body that fails for
// the `have`'s value is an `inverseFailed` on the want side, carrying the
// body's error as a call carries its body's. `evaluateText` is the first
// half on its own, for a caller that wants to know what one text denotes
// without converting it.
//
// The `NumberContext` both take is the user's: its precision is the digits
// asked for, not the precision anything is computed at. This is the one
// place that knows the difference (D1 of docs/calculator-plan.md): the
// working contexts the texts are evaluated at are derived here, by the
// retry schedule of D12. `schedule` yields the digits asked for plus a
// guard of ten, then twice that, four times, doubling, and last the
// `ceiling` the caller passes beside the context (the shell derives it
// from the cap on the digits setting, `ceilingFor` in context.ts; a
// context whose precision exceeds that cap is a precondition failure).
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
// the passes. The table is built at a working context of its own, by its
// builder.

import {
  convert,
  convertToList,
  type ConvertError,
  type UnitListError,
} from "./convert.ts";
import { checkConformance } from "./dimension.ts";
import { evaluate, invertFunction, type EvaluateError } from "./evaluate.ts";
import { parseExpr, parseUnitList, type Expr } from "./expr.ts";
import { type ParseError } from "./parser.ts";
import { type Quantity } from "./quantity.ts";
import { certifies, divideBalls, isExact, type Ball } from "./ball.ts";
import { GUARD_DIGITS, checkContext, type NumberContext } from "./context.ts";
import { isUnbounded } from "./radius.ts";
import { type Precision } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
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
export type TextError = ParseError | EvaluateError | LookupError;

/**
 * The inverse of the function `name`, the `want`, failed for the `have`'s
 * value as `error` says; its spans are into the definitions text.
 */
export type InverseFailed = {
  readonly kind: "inverseFailed";
  readonly name: string;
  readonly error: EvaluateError;
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
      /** The unit the function declares for its argument, with its text. */
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
      readonly error: TextError | InverseFailed;
    }
  | ConvertError
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
 * The working contexts for the user's `context` under `ceiling`, per D12:
 * the digits asked for plus the guard, then that doubled, doubled again,
 * and so on while below the ceiling, and the ceiling last; the rounding
 * mode and the range limit are the user's throughout. A precision above
 * the cap the ceiling was derived from (`ceilingFor` in context.ts, four
 * times the cap plus the guard) is a precondition failure.
 */
export function schedule(
  context: NumberContext,
  ceiling: Precision,
): NumberContext[] {
  checkContext(context);
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
 * `run` at each working context of `schedule(context, ceiling)` in turn:
 * the first result `done` accepts is returned; a result it rejects is kept
 * as the best so far; an error `retries` accepts continues; any other
 * error ends the loop with the best result so far, or with the error when
 * no pass produced a result; at the ceiling the best result so far, or the
 * last error, is returned.
 */
export function resolve<T, E>(
  context: NumberContext,
  ceiling: Precision,
  run: (working: NumberContext) => Result<T, E>,
  done: (value: T) => boolean,
  retries: (error: E) => boolean,
): Result<T, E> {
  let best: Result<T, E> | undefined;
  let last: Result<T, E> | undefined;
  for (const working of schedule(context, ceiling)) {
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
function isUnresolved(error: TextError | InverseFailed): boolean {
  switch (error.kind) {
    case "unresolved":
      return true;
    case "callFailed":
    case "inverseFailed":
      return isUnresolved(error.error);
    default:
      return false;
  }
}

/** Whether another pass may resolve `error`: an `unresolved` at any depth, or an unresolved want. */
function retriesConversion(error: ConversionError): boolean {
  switch (error.kind) {
    case "inputError":
      return isUnresolved(error.error);
    case "unresolvedWant":
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
 * schedule of the user's `context` under `ceiling`.
 */
export function evaluateText(
  table: UnitTable,
  text: string,
  context: NumberContext,
  ceiling: Precision,
): Result<Quantity, TextError> {
  const expr = parseExpr(text);
  if (!expr.ok) return expr;
  return resolve(
    context,
    ceiling,
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
 * conversion run through the retry schedule of the user's `context` under
 * `ceiling`.
 */
export function convertText(
  table: UnitTable,
  have: string,
  want: string,
  context: NumberContext,
  ceiling: Precision,
): Result<Conversion, ConversionError> {
  const haveExpr = parseExpr(have);
  if (!haveExpr.ok) return inputError("have", haveExpr.error);
  const items = parseUnitList(want);
  if (!items.ok) {
    // `have` is tried first: its failure to evaluate is reported before
    // the want's failure to parse, at the schedule's first pass.
    const first = evaluateExpr(
      table,
      haveExpr.value,
      schedule(context, ceiling)[0]!,
    );
    return inputError(
      first.ok ? "want" : "have",
      first.ok ? items.error : first.error,
    );
  }
  return resolve(
    context,
    ceiling,
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
      return convertToNamedList(table, haveQuantity.value, named);
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
    return ok({
      kind: "unit",
      have: haveQuantity.value,
      want: wantQuantity.value,
      value: value.value,
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
  );
  if (!terms.ok) {
    return err({
      kind: "unitListError",
      units: units.map((unit) => unit.text),
      error: terms.error,
    });
  }
  return ok({
    kind: "list",
    have: haveQuantity.value,
    units,
    terms: terms.value,
  });
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
): Result<Conversion, ConversionError> {
  const terms = convertToList(
    have,
    units.map((unit) => unit.quantity),
    table.primitives,
  );
  if (!terms.ok) {
    if (terms.error.kind === "nonconformingUnit")
      return err(terms.error.mismatch);
    // `buildTable` checked the list's units against one another.
    throw new Error("A unit list in the table is not a valid list");
  }
  return ok({ kind: "list", have, units, terms: terms.value });
}

/**
 * `have` as the call of `fn` that would produce it: `have` must conform to
 * the declared result, which is the mismatch of the pair when it does not,
 * and the inverse body recovers the argument, whose count of the declared
 * argument unit is what the UI writes in the call. The unit's ball excludes
 * zero, as `buildTable` checked, so the count always exists.
 */
function convertToFunction(
  table: UnitTable,
  have: Quantity,
  fn: UnitFunction,
  context: NumberContext,
): Result<Conversion, ConversionError> {
  const conformance = checkConformance(
    have.dimension,
    fn.result.quantity.dimension,
    table.primitives,
  );
  if (!conformance.ok) return conformance;
  const argument = invertFunction(
    fn,
    have,
    unitLookup(table, context),
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
  const value = divideBalls(
    argument.value.magnitude,
    fn.argument.quantity.magnitude,
  );
  if (!value.ok) {
    throw new Error("A function in the table declares a zero argument unit");
  }
  return ok({
    kind: "function",
    have,
    name: fn.name,
    argument: argument.value,
    unit: fn.argument,
    value: value.value,
  });
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
  error: TextError | InverseFailed,
): Result<never, ConversionError> {
  return err({ kind: "inputError", side, error });
}
