// Evaluation: the step that turns an `Expr` into the `Quantity` it denotes.
// `parseExpr` produced the tree without knowing which units exist, and
// `convert` will consume the quantity without knowing where it came from;
// this module sits between them and knows nothing about text or about
// conformance. ARCHITECTURE.md ("Evaluation") gives the overview.
//
// TODO: This header, like those of the other core modules, restates much of
// what ARCHITECTURE.md says about the module. Keep the design and intent in
// one place (the architecture doc) and reduce the module headers to what is
// specific to the code: the invariants, the edge cases and the reasons for a
// particular implementation choice.
//
// A number is a dimensionless quantity, a unit name is whatever the `Lookup`
// says it is, and the operators are the quantity arithmetic of `quantity.ts`:
// juxtaposition and `*` multiply, `/` divides, `+` and `-` add and subtract,
// a leading `-` negates, and `^` raises to the exponent the parser read,
// the quotient of its two literals taken here within the range limit
// (`reduceExponent`): each literal's mantissa is held to `maxBits` as
// every literal's is, before any gcd runs, as D19 asks of what can be
// bounded before forming; the quotient is taken as `Scaled` values, whose
// powers of ten cancel for nothing; and the fraction is formed within
// `maxBits`, as `pow` forms an exact exponent, so that `2^(1e30/1e30)` is
// `2` at any limit and `2^1e-30000` is refused at the default as
// `pow(2, 1e-30000)` is (H.16 sends such an exponent to log space). The
// parser, which has no context, once reduced the pair at the hard bound
// for seconds to minutes (issue #66). The
// `NumberContext` given is the working one (D1 of
// docs/calculator-plan.md): its precision is passed to every power, where
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
// `notAFunction` is). A defined function (docs/functions.md) takes exactly
// one: the argument is evaluated, checked to conform to the unit the
// function declares for it, and bound to the parameter while the forward
// body is evaluated through the same lookup, so that the body's units
// resolve as the user's would. A built-in (docs/builtins.md) has its
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
// under a binding for the inverse body, for the pipeline's function want.
//
// Operands are evaluated left to right and the first failure ends the
// evaluation, so `bogus / 0` reports the unknown unit, not the division.
// The arithmetic failures are those of `ball.ts` that a value can cause,
// located in the input: a division by zero points at the divisor, since its
// value is what is wrong, and so does a division by a value that cannot be
// told from zero (`unresolved`, D4 of docs/calculator-plan.md: the divisor's
// ball contains zero without being exactly zero); a power whose base cannot
// be told from zero, raised to a negative power or put under an even root,
// points at the base for the same reason; any other power that fails
// (`0^-1`, an even root of a negative magnitude, a result beyond the range
// limit) points at the whole power, since it is the combination of base
// and exponent that fails; a sum, a product or a quotient that is too
// large (two exact operands that cannot be aligned within the range limit,
// or an exponent beyond the bound; 4.4) points at the whole operation, as
// the power does; a literal whose mantissa is beyond the range limit,
// which the parser let through under its hard bound, points at the
// literal, the exponent costing nothing.
//
// Every result is settled (D15 of the plan): an inexact magnitude is
// rounded to the working precision after each operation, so that it never
// grows beyond it, and its radius says so; exact values are never touched.
// The settling is done once, in `evaluate`, around the switch over the
// node kinds, so no case need remember it. A sum whose
// operands do not conform (`1 m + 1 s`) points at the whole sum for the
// same reason, and carries the span of each operand besides, so that a
// message can say what each one is; a call whose argument does not conform
// to the declared unit points at the whole call and carries the argument's
// span the same way.

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
  settleQuantity,
  subtractQuantities,
  type Quantity,
} from "./quantity.ts";
import { bitLength, type Rational } from "./rational.ts";
import {
  ZERO,
  divide,
  isRefusal,
  powerRefusal,
  toRational,
  type Scaled,
} from "./scaled.ts";
import type { BallError } from "./ball.ts";
import type {
  Builtin,
  DimensionRuleError,
  DomainReason,
  Edge,
} from "./builtin.ts";
import type { NumberContext } from "./context.ts";
import { err, ok, type Result } from "./result.ts";
import type { Span } from "./span.ts";
import type { ResolvedFunction, UnitFunction } from "./table.ts";

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

/** The arity of a defined function: exactly its one parameter. */
export const ONE_ARGUMENT: Arity = { min: 1, max: 1 };

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
   * built-in at an edge of its domain, or at a pole of the tangent.
   */
  | { readonly kind: "unresolved"; readonly span: Span; readonly edge: Edge }
  /** The power at `span` is an even (`degree`-th) root of a negative value. */
  | {
      readonly kind: "negativeRadicand";
      readonly degree: bigint;
      readonly span: Span;
    }
  /**
   * The operation or call at `span` would exceed the range limit and was
   * not computed, or the literal at `span` already does.
   */
  | { readonly kind: "tooLarge"; readonly span: Span }
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
   * not conform to the unit the function declares for it, as `mismatch`
   * says with the argument's dimension as its `have` and the declared one
   * as its `want`.
   */
  | {
      readonly kind: "argumentMismatch";
      readonly name: string;
      readonly span: Span;
      readonly argument: Span;
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
 * `context`, every result settled to it (D15), and every literal checked
 * against its range limit.
 */
export function evaluate<E>(
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, EvaluateError | E> {
  const result = evaluateNode(expr, lookup, primitives, context);
  return result.ok ? ok(settleQuantity(result.value, context)) : result;
}

/** One node of `evaluate`, its operands evaluated (and settled) recursively. */
function evaluateNode<E>(
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, EvaluateError | E> {
  const { node, span } = expr;
  switch (node.kind) {
    case "number": {
      // The parser checked the literal's mantissa against the hard bound
      // and its exponent against the exponent bound; the range limit of
      // the context is the setting, applied to the mantissa, the exponent
      // costing nothing (D16).
      if (!mantissaWithin(node.value, context.maxBits)) {
        return err({ kind: "tooLarge", span });
      }
      return ok(scalar(node.value));
    }
    case "unit":
      return lookup.unit(node.name, span);
    case "binary": {
      const left = evaluate(node.left, lookup, primitives, context);
      if (!left.ok) return left;
      const right = evaluate(node.right, lookup, primitives, context);
      if (!right.ok) return right;
      switch (node.op) {
        case "add":
        case "sub": {
          const combine =
            node.op === "add" ? addQuantities : subtractQuantities;
          const sum = combine(left.value, right.value, primitives, context);
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
          return locate(multiplyQuantities(left.value, right.value), span);
        case "div": {
          const quotient = divideQuantities(left.value, right.value);
          // A divisor at fault (zero, or straddling it) is pointed at; a
          // quotient refused as too large or too small is the whole
          // quotient's.
          const at =
            !quotient.ok && isRefusal(quotient.error) ? span : node.right.span;
          return locate(quotient, at);
        }
      }
    }
    case "pow": {
      const base = evaluate(node.base, lookup, primitives, context);
      if (!base.ok) return base;
      const exponent = reduceExponent(node.exponent, context.maxBits);
      if (!exponent.ok) {
        // An exponent that cannot be formed is refused as pow refuses one:
        // at the bound when the power would pass it, and otherwise at the
        // range limit.
        const refusal =
          exponent.quotient === undefined
            ? undefined
            : powerRefusal(base.value.magnitude.mid, exponent.quotient);
        return err({ ...(refusal ?? { kind: "tooLarge" }), span });
      }
      const power = powQuantity(base.value, exponent.value, context);
      // A base that cannot be told from zero is what is wrong, whether it
      // is raised to a negative power or put under an even root.
      if (!power.ok && power.error.kind === "unresolved") {
        return err({ kind: "unresolved", span: node.base.span, edge: ZERO });
      }
      return locate(power, span);
    }
    case "neg": {
      const operand = evaluate(node.operand, lookup, primitives, context);
      if (!operand.ok) return operand;
      return ok(negateQuantity(operand.value));
    }
    case "call": {
      const fn = lookup.function(node.name, node.nameSpan, span);
      if (!fn.ok) return fn;
      const arity =
        fn.value.kind === "defined" ? ONE_ARGUMENT : fn.value.fn.arity;
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
        return applyBuiltin(fn.value.fn, expr, lookup, primitives, context);
      }
      const argumentExpr = node.arguments[0]!;
      const argument = evaluate(argumentExpr, lookup, primitives, context);
      if (!argument.ok) return argument;
      const conformance = checkConformance(
        argument.value.dimension,
        fn.value.fn.argument.quantity.dimension,
        primitives,
      );
      if (!conformance.ok) {
        return err({
          kind: "argumentMismatch",
          name: node.name,
          span,
          argument: argumentExpr.span,
          mismatch: conformance.error,
        });
      }
      const value = applyFunction(
        fn.value.fn,
        argument.value,
        lookup,
        primitives,
        context,
      );
      if (value.ok) return value;
      const { error } = value;
      return err(
        error.kind === "lookup"
          ? error.error
          : { kind: "callFailed", name: node.name, span, error: error.error },
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
): Result<Quantity, EvaluateError | E> {
  const { node, span } = expr;
  if (node.kind !== "call") throw new Error("A built-in is applied by a call");
  const values: Quantity[] = [];
  for (const argument of node.arguments) {
    const value = evaluate(argument, lookup, primitives, context);
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
  const magnitude = fn.apply(
    values.map((value) => value.magnitude),
    context,
  );
  if (magnitude.ok) {
    return ok({ magnitude: magnitude.value, dimension: dimension.value });
  }
  const { error } = magnitude;
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
    case "overflow":
    case "underflow":
      return err({ kind: error.kind, span });
    case "negativeRadicand":
      return err({ kind: "negativeRadicand", degree: error.degree, span });
  }
}

/**
 * The value of `fn` at `argument`: its forward body evaluated with the
 * parameter bound to `argument`, which must conform to the declared
 * argument unit, as the call case checks before calling this.
 */
export function applyFunction<E>(
  fn: UnitFunction,
  argument: Quantity,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, BodyError<E>> {
  return evaluateBound(
    fn.forward,
    fn.parameter,
    argument,
    lookup,
    primitives,
    context,
  );
}

/**
 * The argument `fn` gives `value` for: its inverse body evaluated with the
 * function's own name bound to `value`, which must conform to the declared
 * result unit, as the pipeline checks before calling this.
 */
export function invertFunction<E>(
  fn: UnitFunction,
  value: Quantity,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, BodyError<E>> {
  return evaluateBound(fn.inverse, fn.name, value, lookup, primitives, context);
}

/**
 * `body` evaluated with `name` bound to `value`. The bound name is resolved
 * before any unit or prefix, and every other name through `lookup`, whose
 * failures are boxed on the way in and unboxed on the way out, so that
 * they come back apart from the body's own.
 */
function evaluateBound<E>(
  body: Expr,
  name: string,
  value: Quantity,
  lookup: Lookup<E>,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, BodyError<E>> {
  const bound: Lookup<Boxed<E>> = {
    unit: (unit, span) => {
      if (unit === name) return ok(value);
      const found = lookup.unit(unit, span);
      return found.ok ? found : err({ kind: "lookup", error: found.error });
    },
    function: (fn, span, call) => {
      const found = lookup.function(fn, span, call);
      return found.ok ? found : err({ kind: "lookup", error: found.error });
    },
  };
  const result = evaluate(body, bound, primitives, context);
  if (result.ok) return result;
  const { error } = result;
  return err(error.kind === "lookup" ? error : { kind: "body", error });
}

/** A lookup failure as `evaluateBound` boxes it. */
type Boxed<E> = Extract<BodyError<E>, { kind: "lookup" }>;

/** Attaches `span` to the failure of `result`, if it failed. */
/** Whether the mantissa of `s` has at most `maxBits` bits in its numerator and its denominator: the range limit on a literal. */
function mantissaWithin(s: Scaled, maxBits: number): boolean {
  const { num, den } = s.mant;
  return (
    bitLength(num < 0n ? -num : num) <= maxBits && bitLength(den) <= maxBits
  );
}

/** What `reduceExponent` gives: the fraction, or why not (the doc there). */
export type ReducedExponent =
  | { readonly ok: true; readonly value: Rational }
  | { readonly ok: false; readonly quotient: Scaled | undefined };

/**
 * The `^` exponent `e` as the fraction it denotes, in lowest terms, within
 * `maxBits`, the range limit (the plan's H.9, issue #66): each literal's
 * mantissa is held to the limit first, as every literal's is, so that no
 * gcd runs on more than the limit allows (`quotient` undefined when one
 * is past it); the quotient of the two is taken as `Scaled` values, the
 * powers of ten cancelling and the mantissas reduced by one gcd within
 * the limit; and the fraction is formed from the quotient within the
 * limit, as `pow` forms an exact exponent, or the quotient is handed back
 * for the caller to refuse the power by, at the bound or at the limit.
 * `dimensionOf` reduces the same way under the build's context.
 */
export function reduceExponent(e: Exponent, maxBits: number): ReducedExponent {
  if (!mantissaWithin(e.num, maxBits) || !mantissaWithin(e.den, maxBits)) {
    return { ok: false, quotient: undefined };
  }
  // The literals are formable within the hard bound, so their exponents
  // are far within the exponent bound and the quotient cannot fail there;
  // the divisor is nonzero by the parser's check.
  const quotient = divide(e.num, e.den);
  if (!quotient.ok)
    throw new Error("An exponent's quotient is within the bound");
  const fraction = toRational(quotient.value, maxBits);
  return fraction.ok
    ? { ok: true, value: fraction.value }
    : { ok: false, quotient: quotient.value };
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
    case "overflow":
    case "underflow":
      return err({ kind: error.kind, span });
    case "unresolved":
      return err({ kind: "unresolved", span, edge: ZERO });
    case "negativeRadicand":
      return err({ kind: "negativeRadicand", degree: error.degree, span });
    case "invalidNumber":
      // Only `parseDecimal` fails this way, and the parser has already run
      // it on every literal in the tree; nothing here reads text.
      throw new Error("Quantity arithmetic reported an invalid number");
  }
}
