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
// a leading `-` negates, and `^` raises to the rational exponent the parser
// already read. The `NumberContext` given is the working one (D1 of
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
// A call, `tempC(100)`, applies a function the lookup resolves by name
// (docs/functions.md): the argument is evaluated, checked to conform to the
// unit the function declares for it, and bound to the parameter while the
// forward body is evaluated through the same lookup, so that the body's
// units resolve as the user's would. The body's own failures carry spans
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
// and exponent that fails; a literal beyond the range limit, which the
// parser let through under its hard bound, points at the literal.
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
import { type Expr } from "./expr.ts";
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
import { bitLength } from "./rational.ts";
import { type BallError } from "./ball.ts";
import { type NumberContext } from "./context.ts";
import { err, ok, type Result } from "./result.ts";
import { type Span } from "./span.ts";
import { type UnitFunction } from "./table.ts";

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
  ) => Result<UnitFunction, E>;
};

export type EvaluateError =
  /**
   * The divisor at `span` is zero, or the power at `span` is `0` to a
   * negative exponent.
   */
  | { readonly kind: "divisionByZero"; readonly span: Span }
  /**
   * The value at `span`, a divisor or the base of a power, cannot be told
   * from zero at this precision (its ball contains zero without being
   * exactly zero), and the result depends on which side of zero it lies: a
   * quotient by it, a negative power of it, or an even root of it.
   */
  | { readonly kind: "unresolved"; readonly span: Span }
  /** The power at `span` is an even (`degree`-th) root of a negative value. */
  | {
      readonly kind: "negativeRadicand";
      readonly degree: bigint;
      readonly span: Span;
    }
  /**
   * The power at `span` would exceed the range limit and was not computed,
   * or the literal at `span` already does.
   */
  | { readonly kind: "tooLarge"; readonly span: Span }
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
      // The parser checked the literal against the hard bound; the range
      // limit of the context is the setting.
      const { num, den } = node.value;
      const size = Math.max(bitLength(num < 0n ? -num : num), bitLength(den));
      if (size > context.maxBits) return err({ kind: "tooLarge", span });
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
          const sum = combine(left.value, right.value, primitives);
          if (sum.ok) return sum;
          return err({
            kind: "nonconformingOperands",
            op: node.op,
            span,
            left: node.left.span,
            right: node.right.span,
            mismatch: sum.error,
          });
        }
        case "mul":
          return ok(multiplyQuantities(left.value, right.value));
        case "div":
          return locate(
            divideQuantities(left.value, right.value),
            node.right.span,
          );
      }
    }
    case "pow": {
      const base = evaluate(node.base, lookup, primitives, context);
      if (!base.ok) return base;
      const power = powQuantity(base.value, node.exponent, context);
      // A base that cannot be told from zero is what is wrong, whether it
      // is raised to a negative power or put under an even root.
      if (!power.ok && power.error.kind === "unresolved") {
        return err({ kind: "unresolved", span: node.base.span });
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
      const argument = evaluate(node.argument, lookup, primitives, context);
      if (!argument.ok) return argument;
      const conformance = checkConformance(
        argument.value.dimension,
        fn.value.argument.quantity.dimension,
        primitives,
      );
      if (!conformance.ok) {
        return err({
          kind: "argumentMismatch",
          name: node.name,
          span,
          argument: node.argument.span,
          mismatch: conformance.error,
        });
      }
      const value = applyFunction(
        fn.value,
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
function locate(
  result: Result<Quantity, BallError>,
  span: Span,
): Result<Quantity, EvaluateError> {
  if (result.ok) return result;
  const { error } = result;
  switch (error.kind) {
    case "divisionByZero":
    case "unresolved":
    case "tooLarge":
      return err({ kind: error.kind, span });
    case "negativeRadicand":
      return err({ kind: "negativeRadicand", degree: error.degree, span });
    case "invalidNumber":
      // Only `parseDecimal` fails this way, and the parser has already run
      // it on every literal in the tree; nothing here reads text.
      throw new Error("Quantity arithmetic reported an invalid number");
  }
}
