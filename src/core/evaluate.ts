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
// already read. The one
// `Precision` given is the working precision, passed to every power, where
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
// Operands are evaluated left to right and the first failure ends the
// evaluation, so `bogus / 0` reports the unknown unit, not the division.
// The arithmetic failures are those of `rational.ts` that a value can cause,
// located in the input: a division by zero points at the divisor, since its
// value is what is wrong, and a power that fails (`0^-1`, an even root of a
// negative magnitude, a result beyond `MAX_BITS`) points at the whole power,
// since it is the combination of base and exponent that fails. A sum whose
// operands do not conform (`1 m + 1 s`) points at the whole sum for the
// same reason, and carries the span of each operand besides, so that a
// message can say what each one is.

import { type ConformanceError, type Primitives } from "./dimension.ts";
import { type Expr } from "./expr.ts";
import {
  addQuantities,
  divideQuantities,
  multiplyQuantities,
  negateQuantity,
  powQuantity,
  scalar,
  subtractQuantities,
  type Quantity,
} from "./quantity.ts";
import { type Precision, type RationalError } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { type Span } from "./span.ts";

// ---------------------------------------------------------------------------
// Types

/**
 * Resolves the unit `name`, referenced at `span`, to its quantity, or fails
 * with the caller's own error, which `evaluate` returns as it is.
 */
export type Lookup<E> = (name: string, span: Span) => Result<Quantity, E>;

export type EvaluateError =
  /**
   * The divisor at `span` is zero, or the power at `span` is `0` to a
   * negative exponent.
   */
  | { readonly kind: "divisionByZero"; readonly span: Span }
  /** The power at `span` is an even (`degree`-th) root of a negative value. */
  | {
      readonly kind: "negativeRadicand";
      readonly degree: bigint;
      readonly span: Span;
    }
  /** The power at `span` would exceed `MAX_BITS` and was not computed. */
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
    };

// ---------------------------------------------------------------------------
// Evaluation

/**
 * The quantity `expr` denotes, with unit names resolved by `lookup`, the
 * operands of every sum checked for conformance by the roles in
 * `primitives`, and every inexact operation truncated to `precision`
 * significant digits.
 */
export function evaluate<E>(
  expr: Expr,
  lookup: Lookup<E>,
  primitives: Primitives,
  precision: Precision,
): Result<Quantity, EvaluateError | E> {
  const { node, span } = expr;
  switch (node.kind) {
    case "number":
      return ok(scalar(node.value));
    case "unit":
      return lookup(node.name, span);
    case "binary": {
      const left = evaluate(node.left, lookup, primitives, precision);
      if (!left.ok) return left;
      const right = evaluate(node.right, lookup, primitives, precision);
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
      const base = evaluate(node.base, lookup, primitives, precision);
      if (!base.ok) return base;
      return locate(powQuantity(base.value, node.exponent, precision), span);
    }
    case "neg": {
      const operand = evaluate(node.operand, lookup, primitives, precision);
      if (!operand.ok) return operand;
      return ok(negateQuantity(operand.value));
    }
  }
}

/** Attaches `span` to the failure of `result`, if it failed. */
function locate(
  result: Result<Quantity, RationalError>,
  span: Span,
): Result<Quantity, EvaluateError> {
  if (result.ok) return result;
  const { error } = result;
  switch (error.kind) {
    case "divisionByZero":
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
