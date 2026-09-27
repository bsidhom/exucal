// The ball: a midpoint with a radius, the value every magnitude becomes. The
// midpoint is the number computed, an exact `Rational`; the radius, a
// `Radius` of radius.ts, bounds its distance from the value it stands for.
// An exact value has radius zero, and `=` in the display means exactly that.
// docs/calculator.md ("The precision model") is the design and
// docs/calculator-plan.md (D3, D4, task 1.5) the decisions; this module is
// the type and its exact operations, and nothing uses it yet.
//
// Each operation composes the exact arithmetic of rational.ts on the
// midpoints with a propagation rule of radius.ts on the radii; neither of
// those modules knows the other. Midpoints are never rounded here: in exact
// mode the exact operations stay exact, and only the radius says what has
// been lost upstream (a root, later a function). The rules are the
// elementary ones, each a bound over the two operands' intervals: a sum's
// radii add; a product's radius is `|a| rb + |b| ra + ra rb`; a quotient's
// is `(|a| rb + |b| ra) / (|b| (|b| - rb))`, which requires the divisor's
// interval to exclude zero; a power's is `n (|mid| + rad)^(n-1) rad`, the
// derivative bound over the interval. Every radius operation rounds up, so
// a result's interval contains the exact result for every pair of values
// in the operands' intervals, which is what the tests check.
//
// Two values are special. An exact zero times anything is exact zero,
// however wide the other operand, unbounded included: unbounded stands for
// a bound that is not known, not for an infinite value. And a divisor that
// contains zero without being exactly zero cannot be divided by, since the
// true quotient may have either sign or none: that is `unresolved` (D4), a
// kind of its own beside `divisionByZero`, because the retry loop of stage 2
// retries on the first (a narrower ball may exclude zero) and never on the
// second. A divisor of unbounded radius with a nonzero midpoint divides, and
// the quotient's radius is unbounded, as the study's per-operation fallback
// says; one with a zero midpoint is `unresolved`, since nothing is known of
// its sign.

import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  isZero,
  multiply,
  negate,
  pow,
  rational,
  subtract,
  type Rational,
  type RationalError,
} from "./rational.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  addRadius,
  isZeroRadius,
  multiplyRadius,
  powRadius,
  radiusAbove,
  radiusUpper,
  type Radius,
} from "./radius.ts";
import { err, ok, type Result } from "./result.ts";

/** A midpoint with the radius that bounds its distance from the true value. */
export type Ball = {
  readonly mid: Rational;
  readonly rad: Radius;
};

export type BallError =
  | RationalError
  /**
   * The answer depends on which side of zero the true value lies, and the
   * ball straddles it: a divisor that cannot be told from zero.
   */
  | { readonly kind: "unresolved" };

/** The ball of an exact value: radius zero. */
export function exact(mid: Rational): Ball {
  return { mid, rad: ZERO_RADIUS };
}

/** Whether `b` is an exact value: its radius is zero. */
export function isExact(b: Ball): boolean {
  return isZeroRadius(b.rad);
}

/**
 * Whether the interval of `b` contains zero: `|mid| <= rad`, which for an
 * exact ball is `mid = 0`; an unbounded ball contains everything.
 */
export function containsZero(b: Ball): boolean {
  if (b.rad.kind === "unbounded") return true;
  if (b.rad.mant === 0n) return isZero(b.mid);
  return compare(absolute(b.mid), radiusUpper(b.rad)) <= 0;
}

/** A radius at or above `|mid| + rad`: a bound on the magnitude of every value in `b`. */
export function magnitudeAbove(b: Ball): Radius {
  return addRadius(radiusAbove(b.mid), b.rad);
}

// ---------------------------------------------------------------------------
// The exact operations

/** `-b`: the midpoint negated, the radius kept. */
export function negateBall(b: Ball): Ball {
  return { mid: negate(b.mid), rad: b.rad };
}

/** `a + b`: the midpoints added, the radii added. */
export function addBalls(a: Ball, b: Ball): Ball {
  return { mid: add(a.mid, b.mid), rad: addRadius(a.rad, b.rad) };
}

/** `a - b`: the midpoints subtracted, the radii added. */
export function subtractBalls(a: Ball, b: Ball): Ball {
  return { mid: subtract(a.mid, b.mid), rad: addRadius(a.rad, b.rad) };
}

/**
 * `a × b`: the exact product of the midpoints, with the radius
 * `|a| rb + |b| ra + ra rb`, rounded up. An exact zero times anything is
 * exact zero.
 */
export function multiplyBalls(a: Ball, b: Ball): Ball {
  if (isExactZero(a) || isExactZero(b)) return exact(ZERO);
  const rad = addRadius(
    addRadius(
      multiplyRadius(radiusAbove(a.mid), b.rad),
      multiplyRadius(radiusAbove(b.mid), a.rad),
    ),
    multiplyRadius(a.rad, b.rad),
  );
  return { mid: multiply(a.mid, b.mid), rad };
}

/**
 * `a / b`: the exact quotient of the midpoints, with the radius
 * `(|a| rb + |b| ra) / (|b| (|b| - rb))`, rounded up, the bound for `a / b`
 * over the two intervals. Fails `divisionByZero` when `b` is exactly zero
 * and `unresolved` when it contains zero without being exactly zero. A
 * divisor of unbounded radius with a nonzero midpoint gives a quotient of
 * unbounded radius.
 */
export function divideBalls(a: Ball, b: Ball): Result<Ball, BallError> {
  if (isExactZero(b)) return err({ kind: "divisionByZero" });
  if (b.rad.kind === "unbounded") {
    if (isZero(b.mid)) return err({ kind: "unresolved" });
    return ok({ mid: exactQuotient(a.mid, b.mid), rad: UNBOUNDED });
  }
  if (containsZero(b)) return err({ kind: "unresolved" });
  const mid = exactQuotient(a.mid, b.mid);
  if (a.rad.kind === "unbounded") return ok({ mid, rad: UNBOUNDED });
  const absA = absolute(a.mid);
  const absB = absolute(b.mid);
  const rb = radiusUpper(b.rad);
  const numerator = add(multiply(absA, rb), multiply(absB, radiusUpper(a.rad)));
  // Positive: the divisor's interval excludes zero, so |b| > rb.
  const denominator = multiply(absB, subtract(absB, rb));
  return ok({ mid, rad: radiusAbove(exactQuotient(numerator, denominator)) });
}

/**
 * `b^n` for an integer `n`. An exact ball goes through `pow`, exactly.
 * Otherwise the midpoint is `pow(mid, |n|)`, which does the `MAX_BITS`
 * check, the radius is `n (|mid| + rad)^(n-1) rad`, the derivative bound
 * over the interval, and a negative `n` inverts by the division rule, so a
 * ball containing zero to a negative power is `unresolved`. `b^0` is
 * exactly one, as `pow` has it, for any ball.
 */
export function powBall(b: Ball, n: bigint): Result<Ball, BallError> {
  if (isExact(b)) {
    const mid = pow(b.mid, n);
    return mid.ok ? ok(exact(mid.value)) : mid;
  }
  if (n === 0n) return ok(exact(ONE));
  if (n < 0n) {
    const positive = powBall(b, -n);
    if (!positive.ok) return positive;
    return divideBalls(exact(ONE), positive.value);
  }
  const mid = pow(b.mid, n);
  if (!mid.ok) return mid;
  if (b.rad.kind === "unbounded") return ok({ mid: mid.value, rad: UNBOUNDED });
  const rad = multiplyRadius(
    multiplyRadius(
      radiusAbove(rational(n)),
      powRadius(magnitudeAbove(b), n - 1n),
    ),
    b.rad,
  );
  return ok({ mid: mid.value, rad });
}

// ---------------------------------------------------------------------------
// Helpers

function isExactZero(b: Ball): boolean {
  return isZero(b.mid) && isZeroRadius(b.rad);
}

/** `a / b` for a `b` the caller has checked to be nonzero. */
function exactQuotient(a: Rational, b: Rational): Rational {
  const quotient = divide(a, b);
  if (!quotient.ok) throw new Error("Division by a divisor checked nonzero");
  return quotient.value;
}
