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
// A function as the `want` (devdocs/design/functions.md) is answered by the call that
// would produce the `have`: `tempF(212)` into `tempC` is `tempC(100)`. It
// needs the function's inverse, `~tempC`, and a function without one is a
// `noInverse` on the want side. The `have` must conform to the function's
// result, which is the ordinary conformance error of the pair when it does
// not, and must meet the inverse's conditions, its own domain; the
// inverse's body then recovers the argument, `invertFunction` evaluating
// it with the inverse's parameter bound to the `have`, and the argument
// must meet the function's conditions, so that a conversion stays within
// what the function admits (a condition failing on either side is a
// `wantConditionFailed`, and an undecided one is assumed as at a call). The
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
// place that knows the difference (D1 of devdocs/history/calculator-plan.md): the
// working contexts the texts are evaluated at are derived here, by the
// retry schedule of D12. `schedule` yields the digits asked for plus a
// guard of ten, then twice that, four times, doubling, and last the
// context's `ceiling` (the shell derives it from the precision limit
// setting, `ceilingFor` in context.ts, and it is the same in every working
// context; a context whose precision exceeds that limit is a precondition
// failure). In decimal mode (4.6) the schedule is the user's context
// alone: every operation rounds to the digits asked for in the rounding
// mode, so raising the internal precision would compute something other
// than what the mode asks for, and the display marks what the radius does
// not certify without escalating; an `unresolved` is then final and
// reported at once. With working digits set (D27, devdocs/design/working-digits.md)
// the texts, being the operands of the ratio, the terms or the count that
// is shown, are evaluated at `operandContext`, the context at the working
// digits, and that last step is rounded to the digits asked for from
// their exact result. The table is built at the ceiling in exact mode
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
//
// Each pass has a collector of its own for the conditions it assumes
// (evaluate.ts), and a result that assumes one is never final: it is kept
// as the best so far, like one that certifies too few digits, since a
// condition across its bound by noise usually decides at more digits, and
// an `undecidedCondition`, a body failing under one, is retried like an
// `unresolved`. The returned pass's assumptions are added to the
// collector `evaluateText` or `convertText` is given, for the outcome's
// warnings. Both, and `resolve`, also take an optional `PassObserver`,
// called as each pass starts and ends: the stress harness of stage 8
// (bench/stress/harness.ts) times the passes the interface runs by it, and
// it changes nothing the loop does.

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
  bindParameters,
  checkConditions,
  evaluate,
  invertFunction,
  type Assumption,
  type ConditionFailure,
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
  step,
  subtractBalls,
  type Ball,
} from "./ball.ts";
import {
  checkContext,
  modeOf,
  operandContext,
  workingContexts,
  type NumberContext,
} from "./context.ts";
import { isUnbounded } from "./radius.ts";
import { err, ok, type Result } from "./result.ts";
import {
  ZERO,
  equals,
  isRefusal,
  significandWithin,
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
   * The `have` certainly fails the `condition`, as written, of the
   * function's inverse (`of`), or the argument the inverse recovered
   * certainly fails the function's own.
   */
  | {
      readonly kind: "wantConditionFailed";
      readonly name: string;
      readonly of: "function" | "inverse";
      readonly condition: string;
    }
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
      /** The two texts as read, which the output writes back. */
      readonly haveExpr: Expr;
      readonly wantExpr: Expr;
      /** How many `want`s make up `have`: a ball, exact for exact quantities. */
      readonly value: Ball;
    }
  /** `have` is the sum of the `terms`, one per unit of the list `units`. */
  | {
      readonly kind: "list";
      readonly have: Quantity;
      readonly haveExpr: Expr;
      /** The units of the list, largest first, each with its text. */
      readonly units: readonly ListedUnit[];
      /** The exact count of each unit but the last, and the remainder in the last, as balls. */
      readonly terms: readonly Ball[];
    }
  /** `have` is `name(argument)`: the function `name` applied to `value` `unit`s. */
  | {
      readonly kind: "function";
      readonly have: Quantity;
      readonly haveExpr: Expr;
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
  /**
   * The converter's own failures, and the refusals it passes on from the
   * ball's arithmetic; the conversion's ratio, or a function want's
   * count, exact and past the significand limit (D19), the two quotients
   * the pipeline forms outside the evaluator, is the same `tooLarge`
   * with `inexact` `fits`, and the message names `approx` around the
   * `have` (D20).
   */
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
 * The working contexts for the user's `context`, per D12: the digits asked
 * for plus the guard, then that doubled, doubled again, and so on while
 * below the context's ceiling, and the ceiling last (`workingContexts` in
 * context.ts); the rounding mode, the significand limit, the ceiling and the
 * mode are the user's throughout. In decimal mode the context itself,
 * alone (4.6; D26): every step is rounded once, a built-in's rounding
 * certified within the evaluator, and a second pass would compute
 * something other than what the mode asks for. A precision above the precision limit
 * the ceiling was derived from (`ceilingFor` in context.ts, four times the
 * precision limit plus the guard) is a precondition failure.
 */
export function schedule(context: NumberContext): NumberContext[] {
  checkContext(context);
  if (modeOf(context) === "decimal") return [context];
  return workingContexts(context);
}

/**
 * A pass of the retry loop as an observer sees it: the `index` of its
 * working context in the schedule and the context itself, as the pass
 * starts or once it has ended. The stress harness (bench/stress) times
 * the passes by it; nothing in the app observes them.
 */
export type PassEvent = {
  readonly phase: "start" | "end";
  readonly index: number;
  readonly working: NumberContext;
};

/** What `resolve` and the text entry points call around each pass, when given. */
export type PassObserver = (event: PassEvent) => void;

/**
 * `run` at each working context of `schedule(context)` in turn, each pass
 * given a collector of its own for the conditions it assumes:
 * the first result `done` accepts, under no assumption, is returned; a
 * result it rejects, or one that carries an assumption, is kept as the
 * best so far; an error `retries` accepts continues; any other error ends
 * the loop with the best result so far, or with the error when no pass
 * produced a result or the best one carries an assumption, since the
 * error may be the assumption refuted (a condition that more digits
 * decide against, `conditionFailed`); at the ceiling the best result so
 * far, or the last error, is returned. The assumptions of the pass whose
 * result is returned are added to `assumptions`. `observe`, when given, is
 * called as each pass starts and ends, and changes nothing.
 */
export function resolve<T, E>(
  context: NumberContext,
  run: (working: NumberContext, assumptions: Assumption[]) => Result<T, E>,
  done: (value: T) => boolean,
  retries: (error: E) => boolean,
  assumptions: Assumption[] = [],
  observe?: PassObserver,
): Result<T, E> {
  let best: { result: Result<T, E>; assumed: Assumption[] } | undefined;
  let last: Result<T, E> | undefined;
  for (const [index, working] of schedule(context).entries()) {
    const assumed: Assumption[] = [];
    observe?.({ phase: "start", index, working });
    const result = run(working, assumed);
    observe?.({ phase: "end", index, working });
    last = result;
    if (result.ok) {
      if (assumed.length === 0 && done(result.value)) return result;
      best = { result, assumed };
    } else if (!retries(result.error)) {
      if (best !== undefined && best.assumed.length > 0) return result;
      break;
    }
  }
  if (best === undefined) return last!;
  assumptions.push(...best.assumed);
  return best.result;
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
    case "undecidedCondition":
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
 * schedule of the user's `context`, with the conditions the result
 * assumes added to `assumptions`, and each pass reported to `observe`.
 */
export function evaluateText(
  table: UnitTable,
  text: string,
  context: NumberContext,
  assumptions?: Assumption[],
  observe?: PassObserver,
): Result<Quantity, TextError> {
  const expr = parseExpr(text);
  if (!expr.ok) return expr;
  return resolve(
    context,
    (working, assumed) => evaluateExpr(table, expr.value, working, assumed),
    (quantity) => settled(quantity.magnitude, context),
    isUnresolved,
    assumptions,
    observe,
  );
}

/**
 * `have` in `want`, with both texts read against `table`, or the first
 * failure: `have` is evaluated before `want`, and the two are converted
 * only once both denote something. A `want` of one unit gives the ratio, a
 * `want` of several (`ft;in`), or the name of a unit list in the table,
 * gives the sum, and the name of a function gives the call that would
 * produce `have`. Both texts are parsed once, and the evaluation and the
 * conversion run through the retry schedule of the user's `context`. The
 * conditions the result assumes are added to `assumptions`, and each pass
 * is reported to `observe`.
 */
export function convertText(
  table: UnitTable,
  have: string,
  want: string,
  context: NumberContext,
  assumptions?: Assumption[],
  observe?: PassObserver,
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
    (working, assumed) =>
      convertParsed(table, haveExpr.value, want, items.value, working, assumed),
    (conversion) => conversionDone(conversion, context),
    retriesConversion,
    assumptions,
    observe,
  );
}

/**
 * One pass of `convertText`, at the `working` context, over the parsed
 * texts. The texts denote the operands of what is shown, the ratio or the
 * list's terms, so they are evaluated at the operand context
 * (`operandContext`; D27) and the ratio or the terms are stepped at the
 * pass's context.
 */
function convertParsed(
  table: UnitTable,
  have: Expr,
  want: string,
  items: readonly Expr[],
  working: NumberContext,
  assumptions: Assumption[],
): Result<Conversion, ConversionError> {
  const inner = operandContext(working);
  const haveQuantity = evaluateExpr(table, have, inner, assumptions);
  if (!haveQuantity.ok) return inputError("have", haveQuantity.error);
  const [first, ...rest] = items;
  if (first !== undefined && rest.length === 0) {
    const name = first.node.kind === "unit" ? first.node.name : undefined;
    const named = name === undefined ? undefined : table.unitLists.get(name);
    if (named !== undefined) {
      return convertToNamedList(
        table,
        have,
        haveQuantity.value,
        named,
        working,
      );
    }
    const fn = name === undefined ? undefined : table.functions.get(name);
    if (fn !== undefined) {
      return convertToFunction(
        table,
        have,
        haveQuantity.value,
        fn,
        working,
        assumptions,
      );
    }
    const wantQuantity = evaluateExpr(table, first, inner, assumptions);
    if (!wantQuantity.ok) return inputError("want", wantQuantity.error);
    const value = convert(
      haveQuantity.value,
      wantQuantity.value,
      table.primitives,
      working,
    );
    if (!value.ok) return value;
    assertWithin(value.value, working);
    const settled = settledInMode(value.value, working);
    if (!settled.ok) return settled;
    return ok({
      kind: "unit",
      have: haveQuantity.value,
      want: wantQuantity.value,
      haveExpr: have,
      wantExpr: first,
      value: settled.value,
    });
  }
  const units: ListedUnit[] = [];
  for (const item of items) {
    const quantity = evaluateExpr(table, item, inner, assumptions);
    if (!quantity.ok) return inputError("want", quantity.error);
    units.push({
      text: want.slice(item.span.start, item.span.end),
      expr: item,
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
    haveExpr: have,
    units,
    terms: settled.value,
  });
}

/**
 * `quotient`, formed by the pipeline outside the evaluator (a ratio, a
 * count, a list's term), as a step of the expression (`step` of ball.ts;
 * D15, D26): settled to the working precision in exact mode, and in
 * decimal mode rounded once to the digits asked for, exact, so `1 m` in
 * `in` at eight digits is `39.370079` there and `1 in` in `cm` is `2.54`.
 * A refusal is the quotient's.
 */
function settledInMode(
  quotient: Ball,
  context: NumberContext,
): Result<Ball, ConversionError> {
  const settled = step(() => ok(quotient), context);
  return settled.ok ? settled : err(refusal(settled.error));
}

/** Each of `terms` as `settledInMode` settles it; the first refusal is the list's. */
function settledTermsInMode(
  terms: readonly Ball[],
  context: NumberContext,
): Result<readonly Ball[], ConversionError> {
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
      return { kind: "tooLarge", inexact: error.inexact, need: error.need };
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
  haveExpr: Expr,
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
  return ok({ kind: "list", have, haveExpr, units, terms: settled.value });
}

/**
 * `have` as the call of `fn` that would produce it: `fn` must have an
 * inverse, `have` must conform to its result, which is the mismatch of the
 * pair when it does not, and must meet the inverse's conditions; the
 * inverse's body recovers the argument, which must meet the function's
 * conditions, and `fn` applied to it must not be certainly other than
 * `have`. A condition left undecided is assumed, as at a call, and added
 * to `assumptions`, and a body that then fails reports it.
 * The argument's count of the unit the parameter takes is what the UI
 * writes in the call. The unit's ball excludes zero, as `buildTable`
 * checked, so the count exists unless it is refused as too large or too
 * small, as a ratio of magnitudes may be.
 */
function convertToFunction(
  table: UnitTable,
  haveExpr: Expr,
  have: Quantity,
  fn: UnitFunction,
  context: NumberContext,
  assumptions: Assumption[],
): Result<Conversion, ConversionError> {
  const { inverse } = fn;
  if (inverse === undefined) {
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
  const assumed: Assumption[] = [];
  // The inverse, the function applied back and their conditions are the
  // operands of the count, which is the step shown (D27).
  const inner = operandContext(context);
  const inDomain = checkConditions(
    { name: fn.name, parameters: [inverse.parameter] },
    "inverse",
    inverse.conditions,
    new Map([[inverse.parameter, have]]),
    lookup,
    table.primitives,
    inner,
    assumed,
  );
  if (!inDomain.ok) {
    return wantConditionFailure(fn.name, "inverse", inDomain.error);
  }
  const argument = invertFunction(
    inverse,
    have,
    lookup,
    table.primitives,
    inner,
    assumed,
  );
  if (!argument.ok) {
    const { error } = argument;
    return inputError(
      "want",
      error.kind === "lookup"
        ? error.error
        : {
            kind: "inverseFailed",
            name: fn.name,
            error: underAssumption(fn.name, assumed, error.error),
          },
    );
  }
  const admitted = checkConditions(
    fn,
    "function",
    fn.conditions,
    bindParameters(fn, [argument.value]),
    lookup,
    table.primitives,
    inner,
    assumed,
  );
  if (!admitted.ok) {
    return wantConditionFailure(fn.name, "function", admitted.error);
  }
  const back = applyFunction(
    fn,
    [argument.value],
    lookup,
    table.primitives,
    inner,
    assumed,
  );
  if (!back.ok) {
    const { error } = back;
    return inputError(
      "want",
      error.kind === "lookup"
        ? error.error
        : {
            kind: "inverseMismatch",
            name: fn.name,
            error: underAssumption(fn.name, assumed, error.error),
          },
    );
  }
  if (disjoint(back.value.magnitude, have.magnitude, inner)) {
    return inputError("want", { kind: "inverseMismatch", name: fn.name });
  }
  const value = divideBalls(
    argument.value.magnitude,
    parameter.unit.quantity.magnitude,
    context,
  );
  if (!value.ok) {
    // The count is refused as any quotient may be, as a ratio would be.
    if (isRefusal(value.error)) return err(refusal(value.error));
    throw new Error("A function in the table declares a zero argument unit");
  }
  assertWithin(value.value, context);
  const settled = settledInMode(value.value, context);
  if (!settled.ok) return settled;
  assumptions.push(...assumed);
  return ok({
    kind: "function",
    have,
    haveExpr,
    name: fn.name,
    argument: argument.value,
    unit: parameter.unit,
    value: settled.value,
  });
}

/**
 * A failure of the conditions of the want's function `name`, or (`of`)
 * of its inverse: a condition that certainly fails is the want's
 * `wantConditionFailed`, and a term that fails is the body's failure it
 * would be in the inverse or in the function, as an `inverseFailed` or an
 * `inverseMismatch`.
 */
function wantConditionFailure(
  name: string,
  of: Assumption["of"],
  failure: ConditionFailure<LookupError>,
): Result<never, ConversionError> {
  switch (failure.kind) {
    case "lookup":
      return inputError("want", failure.error);
    case "failed":
      return inputError("want", {
        kind: "wantConditionFailed",
        name,
        of,
        condition: failure.condition.text,
      });
    case "body":
      return inputError(
        "want",
        of === "inverse"
          ? { kind: "inverseFailed", name, error: failure.error }
          : { kind: "inverseMismatch", name, error: failure.error },
      );
  }
}

/**
 * The body's `error`, or, when the conversion into `name` went on under an
 * assumption, an `undecidedCondition` that names it and carries the
 * error, since the failure may be the assumption's. It has no call to
 * point at, and is located at the error's own span in the definitions.
 */
function underAssumption(
  name: string,
  assumed: readonly Assumption[],
  error: EvaluateError,
): EvaluateError {
  const [assumption] = assumed;
  return assumption === undefined
    ? error
    : { kind: "undecidedCondition", name, span: error.span, assumption, error };
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

/**
 * The invariant of the strict limit (D19 as amended): no exact value is
 * formed past the significand limit, every operation that forms one
 * having predicted its size first, so an exact quotient past the limit
 * here is a bug in a prediction, not a refusal.
 */
function assertWithin(quotient: Ball, context: NumberContext): void {
  if (
    isExact(quotient) &&
    !significandWithin(quotient.mid, context.significandLimitBits)
  ) {
    throw new Error("An exact quotient was formed past the significand limit");
  }
}

/**
 * `expr` evaluated against `table` at the working `context`, with the
 * conditions it assumes added to `assumptions`.
 */
function evaluateExpr(
  table: UnitTable,
  expr: Expr,
  context: NumberContext,
  assumptions?: Assumption[],
): Result<Quantity, TextError> {
  return evaluate(
    expr,
    unitLookup(table, context),
    table.primitives,
    context,
    assumptions,
  );
}

function inputError(
  side: Side,
  error: TextError | FunctionWantError,
): Result<never, ConversionError> {
  return err({ kind: "inputError", side, error });
}
