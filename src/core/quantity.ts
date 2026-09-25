// Quantities: what every unit and every expression evaluates to. A quantity
// is a magnitude, which is a `Rational`, and the dimension it is a multiple of:
// `2.54 cm` is the magnitude `127/5000` of the dimension `m`, given `m` as
// the primitive. ARCHITECTURE.md ("Quantities, dimensions and kinds") gives
// the overview.
//
// This module is the layer that pairs the two below it. `rational.ts` knows
// nothing about dimensions and `dimension.ts` nothing about magnitudes; the
// table stores quantities, the evaluator produces them, and the converter
// consumes them, so they all build on this module rather than on one another.
//
// The arithmetic the evaluator needs lives here too: each operation is a
// magnitude operation beside the matching dimension operation, and nothing
// else. Multiplication is exact; division fails on a zero divisor; and a
// power takes the working precision that its one inexact step, the root of
// a non-integer exponent, truncates to. For those, the failures are the
// `rational.ts` ones, since only the magnitude can fail: a dimension can be
// multiplied, divided and raised to any rational power. Addition and
// subtraction are the other way about: the magnitudes always add, but only
// quantities of one dimension have a sum, so the dimension side is the
// conformance check of `dimension.ts`, the same one `convert` applies to a
// `have` and a `want`, and the failure is its `ConformanceError`. The check
// tells dimensions from kinds by the roles of the table's primitives, so
// these two operations take them, as `convert` does.

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
  add,
  divide,
  multiply,
  powRational,
  subtract,
  type Precision,
  type Rational,
  type RationalError,
} from "./rational.ts";
import { ok, type Result } from "./result.ts";

/** A magnitude and the dimension it is a multiple of. */
export type Quantity = {
  readonly magnitude: Rational;
  readonly dimension: Dimension;
};

/** A plain number: `magnitude` of no dimension. */
export function scalar(magnitude: Rational): Quantity {
  return { magnitude, dimension: DIMENSIONLESS };
}

/**
 * `a + b`, exactly, provided the two conform: `1 ft` plus `1 in` is
 * `0.3302 m`. The sum has the dimension its terms share; `1 m + 1 s`,
 * `1 radian + 1` and `1 m + 0` (a plain number, not a length) have none,
 * and fail with the mismatch, `a` as its `have` and `b` as its `want`.
 */
export function addQuantities(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
): Result<Quantity, ConformanceError> {
  return combineConforming(a, b, primitives, add);
}

/** `a - b`, exactly, provided the two conform, as `addQuantities` requires. */
export function subtractQuantities(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
): Result<Quantity, ConformanceError> {
  return combineConforming(a, b, primitives, subtract);
}

/** `op` over the magnitudes of `a` and `b`, in the dimension they share. */
function combineConforming(
  a: Quantity,
  b: Quantity,
  primitives: Primitives,
  op: (x: Rational, y: Rational) => Rational,
): Result<Quantity, ConformanceError> {
  const conformance = checkConformance(a.dimension, b.dimension, primitives);
  if (!conformance.ok) return conformance;
  return ok({
    magnitude: op(a.magnitude, b.magnitude),
    dimension: a.dimension,
  });
}

/** `a b`, exactly: `2 m` times `3 s` is `6 m s`. */
export function multiplyQuantities(a: Quantity, b: Quantity): Quantity {
  return {
    magnitude: multiply(a.magnitude, b.magnitude),
    dimension: multiplyDimensions(a.dimension, b.dimension),
  };
}

/** `a / b`, exactly; fails if the magnitude of `b` is zero. */
export function divideQuantities(
  a: Quantity,
  b: Quantity,
): Result<Quantity, RationalError> {
  const magnitude = divide(a.magnitude, b.magnitude);
  if (!magnitude.ok) return magnitude;
  return ok({
    magnitude: magnitude.value,
    dimension: divideDimensions(a.dimension, b.dimension),
  });
}

/**
 * `q` raised to `exponent`: the magnitude by `powRational`, so an integer
 * exponent is exact and any other truncates once to `precision` digits
 * (`(4 m^2)^(1/2)` is exactly `2 m`, `(2 m^2)^(1/2)` is `1.414... m`), and
 * the dimension exactly, since its exponents are rational. Fails as the
 * magnitude does: `0` to a negative power, an even root of a negative
 * magnitude, or a result beyond `MAX_BITS`.
 */
export function powQuantity(
  q: Quantity,
  exponent: Rational,
  precision: Precision,
): Result<Quantity, RationalError> {
  const magnitude = powRational(q.magnitude, exponent, precision);
  if (!magnitude.ok) return magnitude;
  return ok({
    magnitude: magnitude.value,
    dimension: powDimension(q.dimension, exponent),
  });
}
