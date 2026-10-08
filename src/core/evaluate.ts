// Evaluation: the step that turns an `Expr` into the `Quantity` it denotes.
// `parseExpr` produced the tree without knowing which units exist, and
// `convert` will consume the quantity without knowing where it came from;
// this module sits between them and knows nothing about text or about
// conformance. devdocs/architecture.md ("Evaluation") gives the overview.
//
// TODO: This header, like those of the other core modules, restates much of
// what devdocs/architecture.md says about the module. Keep the design and intent in
// one place (the architecture doc) and reduce the module headers to what is
// specific to the code: the invariants, the edge cases and the reasons for a
// particular implementation choice.
//
// A number is a dimensionless quantity, a unit name is whatever the `Lookup`
// says it is, and the operators are the quantity arithmetic of `quantity.ts`:
// juxtaposition and `*` multiply, `/` divides, `+` and `-` add and subtract,
// a leading `-` negates, and `^` raises to the exponent the parser read,
// the quotient of its two literals taken here within the significand limit
// (`reduceExponent`): each literal's significand is held to `significandLimitBits` as
// every literal's is, before any gcd runs, as devdocs/numbers.md ("The
// significand limit") asks of what can be bounded before forming; the
// quotient is taken as `Scaled` values, whose powers of ten cancel for
// nothing; and the fraction is formed within
// `significandLimitBits`, as `pow` forms an exact exponent, so that `2^(1e30/1e30)` is
// `2` at any limit and `2^1e-30000` is refused at the default, where
// `pow(2, 1e-30000)` goes to log space instead (devdocs/numbers.md,
// "Roots and powers"; the disagreement is #88). The parser, which has no
// context, once reduced the pair at the hard bound for seconds to
// minutes. The `NumberContext` given is the working one
// (devdocs/numbers.md, "Working precision and the schedule"): its
// precision is passed to every power, where
// the root of a non-integer exponent is the only operation that can lose
// digits. The `Primitives` given are the table's, with their roles: a sum
// is the one place the evaluator checks conformance, between its operands,
// and the check tells a dimension mismatch from a kind mismatch by those
// roles, exactly as `convert` does for a `have` and a `want`.
//
// Names are resolved through a `Lookup` rather than a table, so that the same
// evaluator serves both ends of the pipeline: the table supplies a lookup
// over its finished units for the user's `have` and `want`, and `buildTable`
// supplies one that evaluates definitions on demand while the table is still
// being built. Each lookup defines its own error type (an unknown name, a
// cycle among definitions); `evaluate` takes that type as a type parameter
// and returns a lookup failure unchanged. The lookup is given
// the span of the reference along with the name, so that its error can point
// at the text as this module's own errors do.
//
// A call, `tempC(100)`, applies a function the lookup resolves by name,
// which is a function the table defines or a built-in (`ResolvedFunction`
// of table.ts). For either, the count of arguments is checked against
// what the function takes (`arityMismatch` otherwise, before any argument
// is evaluated, since the count is about the call's shape as
// `notAFunction` is). A defined function (devdocs/functions.md, "Calls") takes exactly
// as many as it has parameters: the arguments are evaluated, left to
// right, each checked to conform to the unit its parameter takes (a plain
// number when it has no annotation), and bound to the parameters by
// position while the body is evaluated through the same lookup, so that
// the body's units resolve as the user's would, and the parameters before
// any unit of their names. Between the two, the function's conditions are
// checked on the bound arguments (`checkConditions`, devdocs/functions.md,
// "The check at a call"), each comparison decided on balls by `decide`, as one
// conjunction in three-valued logic: a certain failure is a
// `conditionFailed` at the call, naming the condition and the arguments
// it mentions; a term that fails is the call's `callFailed` when nothing
// before it was undecided, and undecided otherwise; and an undecided
// condition is assumed to hold. An assumption is added to the collector
// `evaluate` may be given only once the body has computed, a call
// gathering its own and its body's apart, so that a body failing under
// one is an `undecidedCondition` naming it, which may be the
// assumption's doing, where a body failing under none is a `callFailed`.
// Without a collector, assumptions are dropped, which no caller that can
// meet a condition does: the build and the pipeline each pass one. A
// built-in (devdocs/builtins.md, "The rules every built-in follows") has its
// arguments evaluated, its dimension rule applied to their dimensions
// (`builtinArgument` at the call when the rule fails, carrying the rule's
// error and the spans of all the arguments, so that a message can write
// the call as it should be), and its function applied to their
// magnitudes; a `domain` error is located at the call with the argument's
// index (`domainError`), an `unresolved` at the argument that straddles
// the edge, with the edge, and any other failure at the call. The result
// is settled like every other. The body's own failures carry spans
// into the definitions text, which the user cannot see, so they come back
// as one `callFailed` at the call, carrying the body's error. Only the
// evaluator's own failures are wrapped that way: a lookup failure inside a
// body is passed up as any lookup failure is, which is why the body is
// evaluated through a lookup whose failures are boxed, so that the two can
// be told apart without knowing the lookup's error type. A table built by
// `buildTable` has checked every body, so a call against it can fail only
// on its argument or on a value. `invertFunction` is the same evaluation
// under a binding for the body of a function's inverse, for the
// pipeline's function want.
//
// Operands are evaluated left to right and the first failure ends the
// evaluation, so `bogus / 0` reports the unknown unit, not the division.
// The arithmetic failures are those of `ball.ts` that a value can cause,
// located in the input: a division by zero points at the divisor, since its
// value is what is wrong, and so does a division by a value that cannot be
// told from zero (`unresolved`, devdocs/numbers.md, "Exact operations": the divisor's
// ball contains zero without being exactly zero); a power whose base cannot
// be told from zero, raised to a negative power or put under an even root,
// points at the base for the same reason; any other power that fails
// (`0^-1`, an even root of a negative magnitude, a result beyond the significand
// limit) points at the whole power, since it is the combination of base
// and exponent that fails; a sum, a product or a quotient that is too
// large (two exact operands that cannot be aligned within the significand limit,
// or an exponent beyond the bound; devdocs/numbers.md, "Sums and
// alignment") points at the whole operation, as
// the power does; a literal whose significand is beyond the significand limit,
// which the parser let through under its hard bound, points at the
// literal, the exponent costing nothing.
//
// Every result is settled (devdocs/numbers.md, "Settling"): an inexact
// magnitude is rounded to the working precision after each operation, so
// that it never grows beyond it, and its radius says so; exact values are
// never touched.
// Each node is a step of the
// expression (`step` of ball.ts, through `stepQuantity`): the one entrance
// through which a computed value becomes a value, which settles it in
// exact mode and in decimal mode (devdocs/numbers.md, "Decimal mode") computes it
// at rising precision until its rounding is certified and rounds it once,
// exact, with `approx` the identity there and the flag of a rounding the
// ceiling left uncertified carried by every operation after it. A node's
// operands are evaluated at `operandContext` (devdocs/numbers.md, "The working digits"):
// in decimal mode with working digits above the precision, every step
// below the node is rounded to the working digits and the node alone to
// its context's precision, so the root of an expression is the one step
// rounded to the digits asked for; otherwise the context is the same
// throughout. A sum whose
// operands do not conform (`1 m + 1 s`) points at the whole sum for the
// same reason, and carries the span of each operand besides, so that a
// message can say what each one is; a call whose argument does not conform
// to the unit its parameter takes points at the whole call and carries the
// argument's span the same way.

import type { Need, Reach } from "./rational.ts";
import {
  checkConformance,
  type ConformanceError,
  type Primitives,
} from "./dimension.ts";
import type { Exponent, Expr } from "./expr.ts";
import {
  addQuantities,
  divideQuantities,
  multiplyQuantities,
  negateQuantity,
  powQuantity,
  scalar,
  stepQuantity,
  subtractQuantities,
  type Quantity,
} from "./quantity.ts";
import type { Rational } from "./rational.ts";
import {
  ONE,
  divide,
  isRefusal,
  significandWithin,
  powerRefusal,
  toRational,
  type Scaled,
  measuredNeed,
} from "./scaled.ts";
import {
  decimalSumApart,
  isExact,
  negateBall,
  orderOf,
  widened,
  type Ball,
  type BallError,
  type Order,
} from "./ball.ts";
import type {
  Builtin,
  DimensionRuleError,
  DomainReason,
  Edge,
} from "./builtin.ts";
import { modeOf, operandContext, type NumberContext } from "./context.ts";
import type { Comparator } from "./definitions.ts";
import { err, ok, type Result } from "./result.ts";
import type { Span } from "./span.ts";
import {
  arityOf,
  type FunctionCondition,
  type ResolvedFunction,
  type UnitFunction,
  type UnitInverse,
} from "./table.ts";

// ---------------------------------------------------------------------------
// Types

/**
 * Resolves the names in an expression, or fails with the caller's own
 * error, which `evaluate` returns as it is: `unit` resolves the unit
 * `name`, referenced at `span`, to its quantity, and `function` resolves
 * the function `name`, at `span`, called at `call`.
 */
export type Lookup<E> = {
  readonly unit: (name: string, span: Span) => Result<Quantity, E>;
  readonly function: (
    name: string,
    span: Span,
    call: Span,
  ) => Result<ResolvedFunction, E>;
};

/** How many arguments a function takes: from `min` to `max` of them. */
export type Arity = { readonly min: number; readonly max: number };

export type EvaluateError =
  /**
   * The divisor at `span` is zero, or the power at `span` is `0` to a
   * negative exponent.
   */
  | { readonly kind: "divisionByZero"; readonly span: Span }
  /**
   * The value at `span` cannot be told from `edge` at this precision (its
   * ball straddles it), and the result depends on which side of the edge
   * it lies: a divisor or the base of a power at zero (a quotient by it, a
   * negative power of it, or an even root of it), or the argument of a
   * built-in at an edge of its domain, or at a pole of the function.
   */
  | { readonly kind: "unresolved"; readonly span: Span; readonly edge: Edge }
  /** The power at `span` is an even (`degree`-th) root of a negative value. */
  | {
      readonly kind: "negativeRadicand";
      readonly degree: bigint;
      readonly span: Span;
    }
  /**
   * The result at `span` passes the significand limit. With `exact`, an exact
   * result was formed and its canonical significand measured past the limit
   * (devdocs/numbers.md, "The significand limit"), and the message names
   * the remedy (devdocs/numbers.md, "Which limit a refusal names"): `approx`
   * around the `operand`, the node's first operand (a binary's left, a
   * power's base, a call's first argument), which makes the node's result
   * inexact, settled rather than refused; a unit has no operand, and the
   * remedy is the setting, or the operation or call was not computed at
   * all (a sum's alignment, a power's prediction, the kernel's reach), or
   * the literal at `span` already passes. `inexact` is the refusing function's
   * word on the same step computed inexactly (`Reach`) and `need` the
   * bits it would take (`Need`), both carried through unchanged;
   * `operand`, on `fits` alone, is the span `approx` around would make
   * the step inexact, the node's first operand, which is the evaluator's
   * one addition, a fact of the syntax tree and not of the arithmetic.
   */
  | {
      readonly kind: "tooLarge";
      readonly span: Span;
      readonly inexact: Reach;
      readonly need: Need;
      readonly operand?: Span;
    }
  /**
   * The operation or call at `span` would give a value whose exponent
   * passes the exponent bound, above it (`overflow`) or below it
   * (`underflow`), and was not computed.
   */
  | { readonly kind: "overflow" | "underflow"; readonly span: Span }
  /**
   * The sum (`add`) or difference (`sub`) at `span` has operands, at `left`
   * and `right`, that do not conform, as `mismatch` says with the left
   * operand's dimension as its `have` and the right's as its `want`.
   */
  | {
      readonly kind: "nonconformingOperands";
      readonly op: "add" | "sub";
      readonly span: Span;
      readonly left: Span;
      readonly right: Span;
      readonly mismatch: ConformanceError;
    }
  /**
   * The call of `name` at `span` gives `given` arguments, where the
   * function takes `expected`.
   */
  | {
      readonly kind: "arityMismatch";
      readonly name: string;
      readonly span: Span;
      readonly expected: Arity;
      readonly given: number;
    }
  /**
   * The call of `name` at `span` has an argument, at `argument`, that does
   * not conform to the unit its `parameter` takes, as `mismatch` says with
   * the argument's dimension as its `have` and the parameter's as its
   * `want`; `parameters` is how many the function has, so that a message
   * can name the parameter only where there is more than one.
   */
  | {
      readonly kind: "argumentMismatch";
      readonly name: string;
      readonly span: Span;
      readonly argument: Span;
      readonly parameter: string;
      readonly parameters: number;
      readonly mismatch: ConformanceError;
    }
  /**
   * The body of `name`, called at `span`, failed for this argument as
   * `error` says; its spans are into the definitions text.
   */
  | {
      readonly kind: "callFailed";
      readonly name: string;
      readonly span: Span;
      readonly error: EvaluateError;
    }
  /**
   * The call of `name` at `span` has arguments that certainly fail its
   * `condition`, as written; `arguments` are the parameters the condition
   * mentions, each with the span of its argument.
   */
  | {
      readonly kind: "conditionFailed";
      readonly name: string;
      readonly span: Span;
      readonly condition: string;
      readonly arguments: readonly {
        readonly parameter: string;
        readonly span: Span;
      }[];
    }
  /**
   * The call of `name` at `span` went on under the `assumption` of a
   * condition it could not decide, its own or one of a call within it,
   * and then failed as `error` says (spans into the definitions text), a
   * failure that may be the assumption's; without `error`, the condition
   * was left undecided where nothing could carry it, in a unit's
   * definition.
   */
  | {
      readonly kind: "undecidedCondition";
      readonly name: string;
      readonly span: Span;
      readonly assumption: Assumption;
      readonly error?: EvaluateError;
    }
  /**
   * The built-in `name`, called at `span` with the arguments at
   * `arguments`, does not accept their dimensions, as `error` says.
   */
  | {
      readonly kind: "builtinArgument";
      readonly name: string;
      readonly span: Span;
      readonly arguments: readonly Span[];
      readonly error: DimensionRuleError;
    }
  /**
   * The built-in `name`, called at `span` with the arguments at
   * `arguments`, has its argument at index `argument` outside its domain
   * throughout the argument's ball, for `reason`.
   */
  | {
      readonly kind: "domainError";
      readonly name: string;
      readonly span: Span;
      readonly arguments: readonly Span[];
      readonly argument: number;
      readonly reason: DomainReason;
    };

/**
 * A condition a call assumed to hold, since it could not be decided at
 * the working precision: the `condition` as written, of the function
 * `name` or (`of`) its inverse, which has `parameters` parameters, so that
 * a message can say "its argument" for one.
 */
export type Assumption = {
  readonly name: string;
  readonly of: "function" | "inverse";
  readonly condition: string;
  readonly parameters: number;
};

/**
 * Why a function's body failed to evaluate for a value: its own failure,
 * whose spans are into the definitions text, or a failure of the lookup,
 * which is the caller's and comes back unchanged.
 */
export type BodyError<E> =
  | { readonly kind: "body"; readonly error: EvaluateError }
  | { readonly kind: "lookup"; readonly error: E };

// ---------------------------------------------------------------------------
// Evaluation

/**
 * The quantity `expr` denotes, with unit names resolved by `lookup`, the
 * operands of every sum checked for conformance by the roles in
 * `primitives`, every inexact operation computed at the precision of
 * `context`, every result settled to it (devdocs/numbers.md, "Settling"),
 * every literal checked against its significand limit, and every exact
 * result held to it (devdocs/numbers.md, "The significand limit").
 */
export function evaluate<E>(
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions?: Assumption[],
): Result<Quantity, EvaluateError | E> {
  const result = evaluateNode(expr, lookup, primitives, context, assumptions);
  if (!result.ok) return withOperand(result, expr);
  // No exact result is formed past the significand limit (devdocs/numbers.md,
  // "The significand limit"): every operation that forms one, the
  // literal's parse, the sum's alignment, the product, the quotient and
  // the power, predicts its size first and refuses with the bits it
  // would need. So an exact result past the limit here is a bug in a
  // prediction, not a refusal.
  const { magnitude } = result.value;
  if (
    isExact(magnitude) &&
    !significandWithin(magnitude.mid, context.significandLimitBits)
  ) {
    throw new Error("An exact result was formed past the significand limit");
  }
  return result;
}

/**
 * `result`, a failure of `expr`'s own step refused for size whose
 * refusing function expects an inexact computation to fit, with the span
 * `approx` around would make the step inexact: the first operand of the
 * node, where it has one. A failure below `expr` carries its own span and
 * is left as it is, and so is a refusal the function says nothing rounds
 * within the limit. The evaluator adds the operand and nothing else: the
 * reach is the function's word.
 */
function withOperand<E>(
  result: Result<Quantity, EvaluateError | E>,
  expr: Expr,
): Result<Quantity, EvaluateError | E> {
  if (result.ok) return result;
  const { error } = result;
  if (!isSizeRefusal(error) || error.inexact !== "fits") return result;
  if (error.operand !== undefined || !sameSpan(error.span, expr.span)) {
    return result;
  }
  const operand = firstOperand(expr);
  return operand === undefined ? result : err({ ...error, operand });
}

/** Whether `error` is the evaluator's own size refusal, which carries a span and a reach. */
function isSizeRefusal(
  error: unknown,
): error is Extract<EvaluateError, { readonly kind: "tooLarge" }> {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    error.kind === "tooLarge" &&
    "span" in error &&
    "inexact" in error
  );
}

function sameSpan(a: Span, b: Span): boolean {
  return a.start === b.start && a.end === b.end;
}

/**
 * The span of the first operand of `expr`, which `approx` around makes
 * the node's result inexact: a binary's left operand, a power's base, a
 * call's first argument; nothing for a literal, a unit, or a call with no
 * arguments. A negation's operand was checked as a node of its own.
 */
function firstOperand(expr: Expr): Span | undefined {
  const { node } = expr;
  switch (node.kind) {
    case "binary":
      return node.left.span;
    case "pow":
      return node.base.span;
    case "call":
      return node.arguments[0]?.span;
    case "number":
    case "unit":
    case "neg":
      return undefined;
  }
}

/**
 * One node of `evaluate`, its operands evaluated (and settled) recursively
 * at the operand context (`operandContext`): in decimal mode with working
 * digits, every step below this one is rounded to them and this step to
 * the digits of `context` (devdocs/numbers.md, "The working digits");
 * otherwise the same context throughout.
 */
function evaluateNode<E>(
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions: Assumption[] | undefined,
): Result<Quantity, EvaluateError | E> {
  const { node, span } = expr;
  const inner = operandContext(context);
  switch (node.kind) {
    case "number": {
      // The parser checked the literal's significand against the hard bound
      // and its exponent against the exponent bound; the significand limit of
      // the context is the setting, applied to the significand, the exponent
      // costing nothing (devdocs/settings.md, "The model").
      if (!significandWithin(node.value, context.significandLimitBits)) {
        // The digits typed are the significand; nothing rounds them
        // smaller before this check, in either mode. Its size is known.
        return err({
          kind: "tooLarge",
          span,
          inexact: "exceeds",
          need: measuredNeed(node.value),
        });
      }
      return locate(
        stepQuantity(() => ok(scalar(node.value)), context),
        span,
      );
    }
    case "unit": {
      const unit = lookup.unit(node.name, span);
      if (!unit.ok) return unit;
      // A unit built at the ceiling is cut to the working precision in
      // exact mode and rounded or certified in decimal mode; a bound
      // parameter, a value stepped already, is unchanged by the step.
      return locate(
        stepQuantity(() => ok(unit.value), context, [unit.value]),
        span,
      );
    }
    case "binary": {
      const left = evaluate(node.left, lookup, primitives, inner, assumptions);
      if (!left.ok) return left;
      const right = evaluate(
        node.right,
        lookup,
        primitives,
        inner,
        assumptions,
      );
      if (!right.ok) return right;
      switch (node.op) {
        case "add":
        case "sub": {
          const op = node.op === "add" ? "add" : "sub";
          const sum = stepQuantity(
            (working) =>
              summed(op, left.value, right.value, primitives, working, context),
            context,
            [left.value, right.value],
          );
          if (sum.ok) return sum;
          const { error } = sum;
          if (
            error.kind !== "dimensionMismatch" &&
            error.kind !== "kindMismatch"
          ) {
            return locate(err(error), span);
          }
          return err({
            kind: "nonconformingOperands",
            op: node.op,
            span,
            left: node.left.span,
            right: node.right.span,
            mismatch: error,
          });
        }
        case "mul":
        case "juxtapose":
          return locate(
            stepQuantity(
              () => multiplyQuantities(left.value, right.value, context),
              context,
              [left.value, right.value],
            ),
            span,
          );
        case "div": {
          const quotient = stepQuantity(
            () => divideQuantities(left.value, right.value, context),
            context,
            [left.value, right.value],
          );
          // A divisor at fault (zero, or straddling it) is pointed at; a
          // quotient refused as too large or too small, or straddling the
          // bound, is the whole quotient's.
          const at =
            !quotient.ok && atTheBound(quotient.error) ? span : node.right.span;
          return locate(quotient, at);
        }
      }
    }
    case "pow": {
      const base = evaluate(node.base, lookup, primitives, inner, assumptions);
      if (!base.ok) return base;
      const exponent = reduceExponent(
        node.exponent,
        context.significandLimitBits,
      );
      if (!exponent.ok) {
        // An exponent that cannot be formed is refused as pow refuses one:
        // at the bound when the power would pass it, and otherwise at the
        // significand limit.
        // Its own bits are what pass the limit (`2^1e-30000`), which no
        // inexact base changes, nor decimal mode: the reach is `exceeds`.
        const refusal =
          exponent.quotient === undefined
            ? undefined
            : powerRefusal(base.value.magnitude.mid, exponent.quotient);
        return refusal === undefined || refusal.kind === "limit"
          ? err({
              kind: "tooLarge",
              span,
              inexact: "exceeds",
              need: exponent.need,
            })
          : err({ ...refusal, span });
      }
      // The power is one step: in decimal mode its rounding is certified
      // at rising precision (devdocs/numbers.md, "Decimal mode"), in exact
      // mode it is computed once.
      const power = stepQuantity(
        (working) => powered(base.value, exponent.value, working, context),
        context,
        [base.value],
      );
      // A base that cannot be told from zero is what is wrong, whether it
      // is raised to a negative power or put under an even root; a power
      // straddling the bound is the whole power's.
      if (
        !power.ok &&
        power.error.kind === "unresolved" &&
        !atTheBound(power.error)
      ) {
        return err({
          kind: "unresolved",
          span: node.base.span,
          edge: power.error.edge,
        });
      }
      return locate(power, span);
    }
    case "neg": {
      const operand = evaluate(
        node.operand,
        lookup,
        primitives,
        inner,
        assumptions,
      );
      if (!operand.ok) return operand;
      return locate(
        stepQuantity(() => ok(negateQuantity(operand.value)), context, [
          operand.value,
        ]),
        span,
      );
    }
    case "call": {
      const fn = lookup.function(node.name, node.nameSpan, span);
      if (!fn.ok) return fn;
      const arity =
        fn.value.kind === "defined" ? arityOf(fn.value.fn) : fn.value.fn.arity;
      const given = node.arguments.length;
      if (given < arity.min || given > arity.max) {
        return err({
          kind: "arityMismatch",
          name: node.name,
          span,
          expected: arity,
          given,
        });
      }
      if (fn.value.kind === "builtin") {
        return applyBuiltin(
          fn.value.fn,
          expr,
          lookup,
          primitives,
          context,
          assumptions,
        );
      }
      const defined = fn.value.fn;
      const values: Quantity[] = [];
      for (const [i, argumentExpr] of node.arguments.entries()) {
        const argument = evaluate(
          argumentExpr,
          lookup,
          primitives,
          inner,
          assumptions,
        );
        if (!argument.ok) return argument;
        const parameter = defined.parameters[i]!;
        const conformance = checkConformance(
          argument.value.dimension,
          parameter.unit.quantity.dimension,
          primitives,
        );
        if (!conformance.ok) {
          return err({
            kind: "argumentMismatch",
            name: node.name,
            span,
            argument: argumentExpr.span,
            parameter: parameter.name,
            parameters: defined.parameters.length,
            mismatch: conformance.error,
          });
        }
        values.push(argument.value);
      }
      // The call's own assumptions, and its body's, are gathered apart, so
      // that a body failing under one is told from a body failing outright.
      const assumed: Assumption[] = [];
      const bindings = bindParameters(defined, values);
      const checked = checkConditions(
        defined,
        "function",
        defined.conditions,
        bindings,
        lookup,
        primitives,
        context,
        assumed,
      );
      if (!checked.ok) {
        const { error } = checked;
        switch (error.kind) {
          case "lookup":
            return err(error.error);
          case "body":
            return err({
              kind: "callFailed",
              name: node.name,
              span,
              error: error.error,
            });
          case "failed":
            return err({
              kind: "conditionFailed",
              name: node.name,
              span,
              condition: error.condition.text,
              arguments: error.condition.mentions.map((mentioned) => ({
                parameter: mentioned,
                span: node.arguments[
                  defined.parameters.findIndex(
                    (parameter) => parameter.name === mentioned,
                  )
                ]!.span,
              })),
            });
        }
      }
      const value = evaluateBound(
        defined.body,
        bindings,
        lookup,
        primitives,
        context,
        assumed,
      );
      if (value.ok) {
        assumptions?.push(...assumed);
        return value;
      }
      const { error } = value;
      if (error.kind === "lookup") return err(error.error);
      const [assumption] = assumed;
      return err(
        assumption === undefined
          ? { kind: "callFailed", name: node.name, span, error: error.error }
          : {
              kind: "undecidedCondition",
              name: node.name,
              span,
              assumption,
              error: error.error,
            },
      );
    }
  }
}

/**
 * The built-in `fn` applied at the call `expr`, whose arguments are as
 * many as `fn` takes: each evaluated in turn, the dimension rule applied to
 * their dimensions, and the function to their magnitudes, with each
 * failure located as the module header says.
 */
function applyBuiltin<E>(
  fn: Builtin,
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions: Assumption[] | undefined,
): Result<Quantity, EvaluateError | E> {
  const { node, span } = expr;
  if (node.kind !== "call") throw new Error("A built-in is applied by a call");
  // The arguments are the call's operands, computed at the operand
  // context (devdocs/numbers.md, "The working digits"); the call is the
  // step at `context`.
  const inner = operandContext(context);
  const values: Quantity[] = [];
  for (const argument of node.arguments) {
    const value = evaluate(argument, lookup, primitives, inner, assumptions);
    if (!value.ok) return value;
    values.push(value.value);
  }
  const spans = node.arguments.map((argument) => argument.span);
  const dimension = fn.dimensions(
    values.map((value) => value.dimension),
    primitives,
  );
  if (!dimension.ok) {
    return err({
      kind: "builtinArgument",
      name: node.name,
      span,
      arguments: spans,
      error: dimension.error,
    });
  }
  const magnitudes = values.map((value) => value.magnitude);
  // The call is one step: in decimal mode the function is computed at
  // rising precision until its rounding is certified (devdocs/numbers.md,
  // "Decimal mode"), and `approx` is the identity there; in exact mode it
  // is computed once.
  const result =
    fn.decimal === "identity" && modeOf(context) === "decimal"
      ? ok({ magnitude: magnitudes[0]!, dimension: dimension.value })
      : stepQuantity(
          (working) => {
            const magnitude = fn.apply(magnitudes, working);
            return magnitude.ok
              ? ok({ magnitude: magnitude.value, dimension: dimension.value })
              : magnitude;
          },
          context,
          values,
        );
  if (result.ok) return result;
  const { error } = result;
  switch (error.kind) {
    case "domain":
      return err({
        kind: "domainError",
        name: node.name,
        span,
        arguments: spans,
        argument: error.argument,
        reason: error.reason,
      });
    case "unresolved":
      return err({
        kind: "unresolved",
        span: spans[error.argument] ?? span,
        edge: error.edge,
      });
    case "divisionByZero":
      return err({ kind: "divisionByZero", span });
    case "tooLarge":
      return err({
        kind: "tooLarge",
        span,
        inexact: error.inexact,
        need: error.need,
      });
    case "overflow":
    case "underflow":
      return err({ kind: error.kind, span });
    case "negativeRadicand":
      return err({ kind: "negativeRadicand", degree: error.degree, span });
  }
}

/**
 * The value of `fn` at `args`: its body evaluated with each parameter
 * bound to the argument in its position, which must conform to the unit
 * the parameter takes, as the call case checks before calling this. The
 * function's conditions are the caller's to check (`checkConditions`),
 * and the assumptions of calls in the body go to `assumptions`.
 */
export function applyFunction<E>(
  fn: UnitFunction,
  args: readonly Quantity[],
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions?: Assumption[],
): Result<Quantity, BodyError<E>> {
  return evaluateBound(
    fn.body,
    bindParameters(fn, args),
    lookup,
    primitives,
    context,
    assumptions,
  );
}

/** Each parameter of `fn` bound to the argument of `args` in its position. */
export function bindParameters(
  fn: UnitFunction,
  args: readonly Quantity[],
): ReadonlyMap<string, Quantity> {
  return new Map(
    fn.parameters.map((parameter, i): [string, Quantity] => [
      parameter.name,
      args[i]!,
    ]),
  );
}

/**
 * The argument a function gives `value` for, by its `inverse`: the
 * inverse's body evaluated with its parameter bound to `value`, which must
 * conform to the function's result, as the pipeline checks before calling
 * this. The inverse's conditions are the caller's to check.
 */
export function invertFunction<E>(
  inverse: UnitInverse,
  value: Quantity,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions?: Assumption[],
): Result<Quantity, BodyError<E>> {
  return evaluateBound(
    inverse.body,
    new Map([[inverse.parameter, value]]),
    lookup,
    primitives,
    context,
    assumptions,
  );
}

/**
 * Why a function's or an inverse's conditions are not met: the
 * `condition` certainly fails, or one of its terms failed to evaluate, as
 * a body does, while every comparison before it certainly held.
 */
export type ConditionFailure<E> =
  | { readonly kind: "failed"; readonly condition: FunctionCondition }
  | BodyError<E>;

/**
 * Whether the arguments of `bindings` meet the `conditions` of `owner`, a
 * function or (`of`) its inverse, in three-valued logic
 * (devdocs/functions.md, "The check at a call"): the conditions left to right, and
 * the comparisons of each left to right, each decided on balls by
 * `decide`. The first certain failure ends the check, even after an
 * undecided comparison; a term that fails to evaluate ends it too when
 * every comparison before it certainly held, and otherwise leaves its
 * condition undecided. A condition left undecided is assumed to hold and
 * recorded in `assumptions`, after any assumptions of calls in its terms,
 * only once the whole check has passed.
 */
export function checkConditions<E>(
  owner: { readonly name: string; readonly parameters: readonly unknown[] },
  of: Assumption["of"],
  conditions: readonly FunctionCondition[],
  bindings: ReadonlyMap<string, Quantity>,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions: Assumption[],
): Result<undefined, ConditionFailure<E>> {
  // A condition's terms are no part of a displayed value: they are
  // computed and compared at the operand context (devdocs/numbers.md,
  // "The working digits").
  const inner = operandContext(context);
  const terms: Assumption[] = [];
  const assumed: Assumption[] = [];
  for (const condition of conditions) {
    let undecided = assumed.length > 0;
    let left = evaluateBound(
      condition.terms[0]!,
      bindings,
      lookup,
      primitives,
      inner,
      terms,
    );
    let decided = true;
    for (const [i, comparator] of condition.comparators.entries()) {
      if (!left.ok) break;
      const right = evaluateBound(
        condition.terms[i + 1]!,
        bindings,
        lookup,
        primitives,
        inner,
        terms,
      );
      if (!right.ok) {
        left = right;
        break;
      }
      const verdict = decide(
        left.value.magnitude,
        comparator,
        right.value.magnitude,
        inner,
      );
      if (verdict === "fails") return err({ kind: "failed", condition });
      if (verdict === "undecided") {
        undecided = true;
        decided = false;
      }
      left = right;
    }
    if (!left.ok) {
      // A guard before the term may yet exclude what it fails on.
      if (!undecided) return left;
      decided = false;
    }
    if (!decided) {
      assumed.push({
        name: owner.name,
        of,
        condition: condition.text,
        parameters: owner.parameters.length,
      });
    }
  }
  assumptions.push(...terms, ...assumed);
  return ok(undefined);
}

/** What a comparison of two balls says: certainly true, certainly false, or not decided. */
export type Verdict = "holds" | "fails" | "undecided";

/**
 * Whether `a comparator b` holds, from where `a` lies against `b`
 * (`orderOf`): the table of devdocs/functions.md ("The check at a call"), in which an
 * end exactly on the other side leaves a strict comparison undecided,
 * since a ball is closed, and two exact values always decide.
 */
export function decide(
  a: Ball,
  comparator: Comparator,
  b: Ball,
  context: NumberContext,
): Verdict {
  return VERDICTS[comparator][orderOf(a, b, context)];
}

const VERDICTS: Readonly<Record<Comparator, Readonly<Record<Order, Verdict>>>> =
  {
    "<": {
      below: "holds",
      touchingBelow: "undecided",
      at: "fails",
      touchingAbove: "fails",
      above: "fails",
      straddles: "undecided",
    },
    "<=": {
      below: "holds",
      touchingBelow: "holds",
      at: "holds",
      touchingAbove: "undecided",
      above: "fails",
      straddles: "undecided",
    },
    ">": {
      below: "fails",
      touchingBelow: "fails",
      at: "fails",
      touchingAbove: "undecided",
      above: "holds",
      straddles: "undecided",
    },
    ">=": {
      below: "fails",
      touchingBelow: "undecided",
      at: "holds",
      touchingAbove: "holds",
      above: "holds",
      straddles: "undecided",
    },
  };

/**
 * `body` evaluated with each name of `bindings` bound to its value. A
 * bound name is resolved before any unit or prefix, and every other name
 * through `lookup`, whose failures are boxed on the way in and unboxed on
 * the way out, so that they come back apart from the body's own.
 */
function evaluateBound<E>(
  body: Expr,
  bindings: ReadonlyMap<string, Quantity>,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
  assumptions: Assumption[] | undefined,
): Result<Quantity, BodyError<E>> {
  const bound: Lookup<Boxed<E>> = {
    unit: (unit, span) => {
      const value = bindings.get(unit);
      if (value !== undefined) return ok(value);
      const found = lookup.unit(unit, span);
      return found.ok ? found : err({ kind: "lookup", error: found.error });
    },
    function: (fn, span, call) => {
      const found = lookup.function(fn, span, call);
      return found.ok ? found : err({ kind: "lookup", error: found.error });
    },
  };
  const result = evaluate(body, bound, primitives, context, assumptions);
  if (result.ok) return result;
  const { error } = result;
  return err(error.kind === "lookup" ? error : { kind: "body", error });
}

/**
 * `q` to `exponent` at `working`, by `powQuantity`: an integer power of an
 * exact base exactly, a root through the kernel. In decimal mode
 * (devdocs/numbers.md, "Decimal mode") an exact power that does not fit the
 * significand limit is computed instead on the base widened to the working
 * precision, so that the step certifies its rounding as it does an
 * inexact function's: the limit is a cost limit, and a correctly rounded
 * power costs little.
 */
function powered(
  q: Quantity,
  exponent: Rational,
  working: NumberContext,
  context: NumberContext,
): Result<Quantity, BallError> {
  const power = powQuantity(q, exponent, working);
  if (
    power.ok ||
    power.error.kind !== "tooLarge" ||
    modeOf(context) !== "decimal" ||
    !isExact(q.magnitude)
  ) {
    return power;
  }
  return powQuantity(
    { magnitude: widened(q.magnitude, working), dimension: q.dimension },
    exponent,
    working,
  );
}

/**
 * `a + b` or `a - b` at `working`, by `addQuantities` and
 * `subtractQuantities`. In decimal mode (devdocs/numbers.md, "Decimal mode")
 * two operands whose alignment the significand limit does
 * not hold, which the sum refuses as `tooLarge`, are summed by the
 * neighbor rule instead (`decimalSumApart`), the operands being exact
 * there; the conformance of the two was checked by the refusal.
 */
function summed(
  op: "add" | "sub",
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
  working: NumberContext,
  context: NumberContext,
): Result<Quantity, ConformanceError | BallError> {
  const combine = op === "add" ? addQuantities : subtractQuantities;
  const sum = combine(a, b, primitives, working);
  if (
    sum.ok ||
    sum.error.kind !== "tooLarge" ||
    modeOf(context) !== "decimal"
  ) {
    return sum;
  }
  const other = op === "add" ? b.magnitude : negateBall(b.magnitude);
  const apart = decimalSumApart(a.magnitude, other, context);
  return apart.ok
    ? ok({ magnitude: apart.value, dimension: a.dimension })
    : apart;
}

/** A lookup failure as `evaluateBound` boxes it. */
type Boxed<E> = Extract<BodyError<E>, { kind: "lookup" }>;

/** Attaches `span` to the failure of `result`, if it failed. */
/** What `reduceExponent` gives: the fraction, or why not (the doc there). */
export type ReducedExponent =
  | { readonly ok: true; readonly value: Rational }
  | {
      readonly ok: false;
      readonly quotient: Scaled | undefined;
      /** The bits the exponent would take: a literal's measured, or the quotient's as a fraction. */
      readonly need: Need;
    };

/**
 * The `^` exponent `e` as the fraction it denotes, in lowest terms, within
 * `significandLimitBits`, the significand limit (devdocs/numbers.md, "The
 * significand limit"): each literal's significand is held to the limit
 * first, as every literal's is, so that no gcd runs on more than the limit
 * allows (`quotient` undefined when one
 * is past it); the quotient of the two is taken as `Scaled` values, the
 * powers of ten cancelling and the significands reduced by one gcd within
 * the limit; and the fraction is formed from the quotient within the
 * limit, as `pow` forms an exact exponent, or the quotient is handed back
 * for the caller to refuse the power by, at the bound or at the limit.
 * `dimensionOf` reduces the same way under the build's context.
 */
export function reduceExponent(
  e: Exponent,
  significandLimitBits: number,
): ReducedExponent {
  const num = e.num.value;
  const den = e.den === undefined ? ONE : e.den.value;
  if (
    !significandWithin(num, significandLimitBits) ||
    !significandWithin(den, significandLimitBits)
  ) {
    const larger = (s: Scaled) => measuredNeed(s).bits;
    return {
      ok: false,
      quotient: undefined,
      need: { kind: "exact", bits: Math.max(larger(num), larger(den)) },
    };
  }
  // The literals are formable within the hard bound, so their exponents
  // are far within the exponent bound and the quotient cannot fail there;
  // the divisor is nonzero by the parser's check. The quotient itself is
  // held to the limit as any is, and refused with its need.
  const quotient = divide(num, den, significandLimitBits);
  if (!quotient.ok) {
    if (quotient.error.kind === "tooLarge") {
      return { ok: false, quotient: undefined, need: quotient.error.need };
    }
    throw new Error("An exponent's quotient is within the bound");
  }
  const fraction = toRational(quotient.value, significandLimitBits);
  if (fraction.ok) return { ok: true, value: fraction.value };
  if (fraction.error.kind !== "tooLarge") {
    throw new Error("A formable quotient is within the bound");
  }
  return { ok: false, quotient: quotient.value, need: fraction.error.need };
}

/** Whether `error` is the result's, at a limit: a refusal, or an `unresolved` at the exponent bound. */
function atTheBound(error: BallError): boolean {
  return (
    isRefusal(error) || (error.kind === "unresolved" && error.edge === "bound")
  );
}

function locate(
  result: Result<Quantity, BallError>,
  span: Span,
): Result<Quantity, EvaluateError> {
  if (result.ok) return result;
  const { error } = result;
  switch (error.kind) {
    case "divisionByZero":
      return err({ kind: "divisionByZero", span });
    case "tooLarge":
      return err({
        kind: "tooLarge",
        span,
        inexact: error.inexact,
        need: error.need,
      });
    case "overflow":
    case "underflow":
      return err({ kind: error.kind, span });
    case "unresolved":
      return err({ kind: "unresolved", span, edge: error.edge });
    case "negativeRadicand":
      return err({ kind: "negativeRadicand", degree: error.degree, span });
    case "invalidNumber":
      // Only `parseDecimal` fails this way, and the parser has already run
      // it on every literal in the tree; nothing here reads text.
      throw new Error("Quantity arithmetic reported an invalid number");
  }
}
