// The dimension of an expression without its value: the abstract
// interpretation of the evaluator over dimensions alone, which the build
// runs on a function's bodies in place of evaluating them at one of the
// declared unit (docs/calculator-plan.md, task 3.5; docs/calculator.md,
// "User-defined functions"). A body's dimension never depends on the value
// of its argument, so the check catches at load time exactly what
// evaluating at a value caught, a body of the wrong dimension or one that
// refers to nothing, without refusing a body that happens to fail at that
// value: `1 / (x - 1)`, `ln(x - 1)`, `1 / ln(x)` build, and fail only at
// the call that reaches the value.
//
// The rules are the evaluator's, minus the arithmetic: a number is
// dimensionless; a unit is its dimension through the lookup, which is the
// walk's, so an unknown name and a cycle are found as before; a sum or
// difference checks that its operands conform, as the evaluator does, and
// has the left's dimension; a product or quotient combines; a power raises
// by the `^` exponent, reduced within the significand limit as the evaluator
// reduces it (`reduceExponent`), so that one past the limit fails the
// build at the power as it would fail the call; a negation keeps; and a
// call checks the count of
// arguments and applies the callee's rule, a defined function's arguments
// each conforming to the unit its parameter takes and giving its result's
// dimension, a built-in's `dimensions` on its arguments' dimensions. The
// errors are the evaluator's own of those kinds (`nonconformingOperands`,
// `arityMismatch`, `argumentMismatch`, `builtinArgument`), so their spans
// and messages hold; nothing here is new to the user. A literal is not
// checked against the significand limit, so a body of `1e30000` builds and fails
// at the call, as a body that fails for every value now does; a `^`
// exponent is, since its reduction is what the limit bounds, and the
// build's context supplies the limit.
//
// The lookup is over dimensions, `DimensionLookup`, with the same two
// resolvers as the evaluator's `Lookup`; the build wraps its own lookup,
// with the bound name (the parameter of a function or of an inverse)
// resolved before any unit as `evaluateBound` does.

import {
  DIMENSIONLESS,
  checkConformance,
  divideDimensions,
  multiplyDimensions,
  powDimension,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import { reduceExponent, type EvaluateError } from "./evaluate.ts";
import type { Expr } from "./expr.ts";
import { err, ok, type Result } from "./result.ts";
import type { Span } from "./span.ts";
import { arityOf, type ResolvedFunction } from "./table.ts";

/** Resolves the names in an expression to dimensions, or fails with the caller's own error. */
export type DimensionLookup<E> = {
  readonly unit: (name: string, span: Span) => Result<Dimension, E>;
  readonly function: (
    name: string,
    span: Span,
    call: Span,
  ) => Result<ResolvedFunction, E>;
};

/** The evaluator's errors a dimension alone can cause. */
export type DimensionError = Extract<
  EvaluateError,
  {
    kind:
      | "nonconformingOperands"
      | "arityMismatch"
      | "argumentMismatch"
      | "builtinArgument"
      | "tooLarge";
  }
>;

/**
 * The dimension `expr` denotes, with unit names resolved by `lookup`,
 * conformance checked by the roles in `primitives` and a `^` exponent
 * reduced within `significandLimitBits`, the significand limit, or why it has none.
 */
export function dimensionOf<E>(
  expr: Expr,
  lookup: DimensionLookup<E>,
  primitives: Primitives,
  significandLimitBits: number,
): Result<Dimension, DimensionError | E> {
  const { node, span } = expr;
  switch (node.kind) {
    case "number":
      return ok(DIMENSIONLESS);
    case "unit":
      return lookup.unit(node.name, span);
    case "binary": {
      const left = dimensionOf(
        node.left,
        lookup,
        primitives,
        significandLimitBits,
      );
      if (!left.ok) return left;
      const right = dimensionOf(
        node.right,
        lookup,
        primitives,
        significandLimitBits,
      );
      if (!right.ok) return right;
      switch (node.op) {
        case "add":
        case "sub": {
          const conformance = checkConformance(
            left.value,
            right.value,
            primitives,
          );
          if (conformance.ok) return left;
          return err({
            kind: "nonconformingOperands",
            op: node.op,
            span,
            left: node.left.span,
            right: node.right.span,
            mismatch: conformance.error,
          });
        }
        case "mul":
        case "juxtapose":
          return ok(multiplyDimensions(left.value, right.value));
        case "div":
          return ok(divideDimensions(left.value, right.value));
      }
    }
    case "pow": {
      const base = dimensionOf(
        node.base,
        lookup,
        primitives,
        significandLimitBits,
      );
      if (!base.ok) return base;
      const exponent = reduceExponent(node.exponent, significandLimitBits);
      // A unit's exponent that cannot be formed: nothing rounds a unit.
      if (!exponent.ok) {
        return err({ kind: "tooLarge", span, inexact: "exceeds" });
      }
      return ok(powDimension(base.value, exponent.value));
    }
    case "neg":
      return dimensionOf(
        node.operand,
        lookup,
        primitives,
        significandLimitBits,
      );
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
      const dimensions: Dimension[] = [];
      for (const argument of node.arguments) {
        const dimension = dimensionOf(
          argument,
          lookup,
          primitives,
          significandLimitBits,
        );
        if (!dimension.ok) return dimension;
        dimensions.push(dimension.value);
      }
      if (fn.value.kind === "builtin") {
        const result = fn.value.fn.dimensions(dimensions, primitives);
        if (result.ok) return result;
        return err({
          kind: "builtinArgument",
          name: node.name,
          span,
          arguments: node.arguments.map((argument) => argument.span),
          error: result.error,
        });
      }
      const defined = fn.value.fn;
      for (const [i, parameter] of defined.parameters.entries()) {
        const conformance = checkConformance(
          dimensions[i]!,
          parameter.unit.quantity.dimension,
          primitives,
        );
        if (!conformance.ok) {
          return err({
            kind: "argumentMismatch",
            name: node.name,
            span,
            argument: node.arguments[i]!.span,
            parameter: parameter.name,
            parameters: defined.parameters.length,
            mismatch: conformance.error,
          });
        }
      }
      return ok(defined.result);
    }
  }
}
