// Quantities: what every unit and every expression evaluates to. A quantity
// is a magnitude, which is a `Ball` (a midpoint with the radius that bounds
// its distance from the true value; radius zero for an exact value), and the
// dimension it is a multiple of: `2.54 cm` is the magnitude `127/5000`,
// exactly, of the dimension `m`, given `m` as the primitive. ARCHITECTURE.md
// ("Quantities, dimensions and kinds") gives the overview.
//
// This module is the layer that pairs the two below it. `ball.ts` knows
// nothing about dimensions and `dimension.ts` nothing about magnitudes; the
// table stores quantities, the evaluator produces them, and the converter
// consumes them, so they all build on this module rather than on one another.
//
// The arithmetic the evaluator needs lives here too: each operation is a
// ball operation beside the matching dimension operation, and nothing else.
// Multiplication and division are exact on the midpoints and propagate the
// radii, and are refused when the result is too large or too small to
// compute: today at the exponent bound (`overflow`, `underflow`) alone,
// since their mantissas are not held to the range limit, which they can
// pass, and past it too (`tooLarge`) once they are (issue #52), so the
// callers take any refusal; division also fails on a divisor that is
// exactly zero, or that cannot be told from zero (`unresolved`); and a
// power takes the `NumberContext` whose precision its one inexact step, the
// root of a non-integer exponent, is computed at. For those, the failures
// are the `ball.ts` ones, since only the magnitude can fail: a dimension
// can be multiplied, divided and raised to any rational power. Negation
// touches the magnitude alone and cannot fail. Addition and subtraction
// have both sides: only quantities of one dimension have a sum, so the
// dimension side is the conformance check of `dimension.ts`, the same one
// `convert` applies to a `have` and a `want`, and the failure is its
// `ConformanceError`; and the magnitudes add as `addBalls` rules, aligned
// within the range limit of the `NumberContext` they take (4.4), two exact
// magnitudes that cannot be aligned failing `tooLarge` at the range limit,
// and a sum past the exponent bound at the bound. The check tells
// dimensions from kinds by the roles of the table's primitives, so these
// two operations take them, as `convert` does.

import {
  DIMENSIONLESS,
  checkConformance,
  divideDimensions,
  multiplyDimensions,
  powDimension,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import {
  addBalls,
  divideBalls,
  exact,
  multiplyBalls,
  negateBall,
  powRationalBall,
  settle,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import type { NumberContext } from "./context.ts";
import type { Rational } from "./rational.ts";
import { ok, type Result } from "./result.ts";
import type { Scaled } from "./scaled.ts";

/** A magnitude, a ball, and the dimension it is a multiple of. */
export type Quantity = {
  readonly magnitude: Ball;
  readonly dimension: Dimension;
};

/** A plain number, exactly: `value` of no dimension. */
export function scalar(value: Scaled): Quantity {
  return { magnitude: exact(value), dimension: DIMENSIONLESS };
}

/**
 * `q` with its magnitude settled to the working precision of `context`
 * (D15): an inexact midpoint rounded to that precision's bits with the
 * rounding added to the radius, an exact one left as it is. The evaluator
 * applies it to every result it produces, and the lookup to every unit it
 * hands out.
 */
export function settleQuantity(q: Quantity, context: NumberContext): Quantity {
  const magnitude = settle(q.magnitude, context);
  return magnitude === q.magnitude ? q : { magnitude, dimension: q.dimension };
}

/**
 * `a + b`, exactly where the magnitudes align within the range limit of
 * `context` and as `addBalls` rules otherwise, provided the two conform:
 * `1 ft` plus `1 in` is `0.3302 m`. The sum has the dimension its terms
 * share; `1 m + 1 s`, `1 radian + 1` and `1 m + 0` (a plain number, not a
 * length) have none, and fail with the mismatch, `a` as its `have` and `b`
 * as its `want`; two exact magnitudes that cannot be aligned fail
 * `tooLarge` at the range limit, and a sum past the exponent bound at the
 * bound.
 */
export function addQuantities(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, ConformanceError | BallError> {
  return combineConforming(a, b, primitives, (x, y) => addBalls(x, y, context));
}

/** `a - b`, provided the two conform, as `addQuantities` requires. */
export function subtractQuantities(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
  context: NumberContext,
): Result<Quantity, ConformanceError | BallError> {
  return combineConforming(a, b, primitives, (x, y) =>
    subtractBalls(x, y, context),
  );
}

/** `op` over the magnitudes of `a` and `b`, in the dimension they share. */
function combineConforming(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
  op: (x: Ball, y: Ball) => Result<Ball, BallError>,
): Result<Quantity, ConformanceError | BallError> {
  const conformance = checkConformance(a.dimension, b.dimension, primitives);
  if (!conformance.ok) return conformance;
  const magnitude = op(a.magnitude, b.magnitude);
  if (!magnitude.ok) return magnitude;
  return ok({ magnitude: magnitude.value, dimension: a.dimension });
}

/** `-q`: the magnitude negated, in the same dimension. Cannot fail. */
export function negateQuantity(q: Quantity): Quantity {
  return { magnitude: negateBall(q.magnitude), dimension: q.dimension };
}

/**
 * `a b`: `2 m` times `3 s` is `6 m s`, exactly on exact magnitudes; fails
 * when the product is refused, as the header says: at the exponent bound,
 * and past the range limit once products are held to it (issue #52).
 */
export function multiplyQuantities(
  a: Quantity,
  b: Quantity,
): Result<Quantity, BallError> {
  const magnitude = multiplyBalls(a.magnitude, b.magnitude);
  if (!magnitude.ok) return magnitude;
  return ok({
    magnitude: magnitude.value,
    dimension: multiplyDimensions(a.dimension, b.dimension),
  });
}

/**
 * `a / b`; fails if the magnitude of `b` is exactly zero, or contains zero
 * without being exactly zero (`unresolved`), or when the quotient is
 * refused, as a product is.
 */
export function divideQuantities(
  a: Quantity,
  b: Quantity,
): Result<Quantity, BallError> {
  const magnitude = divideBalls(a.magnitude, b.magnitude);
  if (!magnitude.ok) return magnitude;
  return ok({
    magnitude: magnitude.value,
    dimension: divideDimensions(a.dimension, b.dimension),
  });
}

/**
 * `q` raised to `exponent`: the magnitude by `powRationalBall`, so an
 * integer exponent is exact on an exact magnitude and any other is
 * computed once on the kernel at the precision of `context`, with a radius
 * that says so (`(4 m^2)^(1/2)` is exactly `2 m`, `(2 m^2)^(1/2)` is
 * `1.414... m` within the kernel's error), and the dimension exactly, since
 * its exponents are rational. Fails as the magnitude does: `0` to a
 * negative power, a ball around zero to a negative power or under an even
 * root (`unresolved`), an even root of a negative magnitude, or a result
 * beyond the range limit (`tooLarge`) or the exponent bound (`overflow`,
 * `underflow`).
 */
export function powQuantity(
  q: Quantity,
  exponent: Rational,
  context: NumberContext,
): Result<Quantity, BallError> {
  const magnitude = powRationalBall(q.magnitude, exponent, context);
  if (!magnitude.ok) return magnitude;
  return ok({
    magnitude: magnitude.value,
    dimension: powDimension(q.dimension, exponent),
  });
}
