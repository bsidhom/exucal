// The ball: a midpoint with a radius, the value every magnitude becomes. The
// midpoint is the number computed, an exact `Rational`; the radius, a
// `Radius` of radius.ts, bounds its distance from the value it stands for.
// An exact value has radius zero, and `=` in the display means exactly that.
// docs/calculator.md ("The precision model") is the design and
// docs/calculator-plan.md (D3, D4, D5, tasks 1.5 and 1.6) the decisions;
// this module is the type, its exact operations and the one inexact one,
// the root; quantity.ts makes a ball the magnitude of every quantity.
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
//
// The root is the one inexact operation, and in stage 1 it is the least
// that is honest (D5): an exact argument with an exact root is exact; an
// exact argument otherwise is the truncated digits of rational.ts with a
// radius of one unit in the last digit, which bounds a truncation; and an
// inexact argument gives the truncated root of the midpoint with an
// unbounded radius, since propagating the argument's radius through a root
// on the decimal path would be work thrown away when stage 2 moves the root
// onto the kernel, where it honors the rounding mode and propagates the
// radius by the derivative bound. The rounding mode of the context is
// ignored until then: truncation is the `towardZero` mode.

import { type NumberContext } from "./context.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  decimalExponent,
  divide,
  exactRoot,
  isZero,
  multiply,
  negate,
  pow,
  rational,
  subtract,
  truncatedRoot,
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
// The inexact operation

/**
 * The `degree`-th root of `b`, per D5: an exact argument with a rational
 * root is exact; an exact argument otherwise is `truncatedRoot` at the
 * precision of `context` with a radius of one unit in its last digit; an
 * inexact argument is the truncated root of the midpoint with an unbounded
 * radius. The sign rule is `exactRoot`'s: an even root of a negative
 * midpoint fails with `negativeRadicand`.
 */
export function rootBall(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball, BallError> {
  if (isExact(b)) {
    const exactValue = exactRoot(b.mid, degree);
    if (!exactValue.ok) return exactValue;
    if (exactValue.value !== undefined) return ok(exact(exactValue.value));
  }
  const truncated = truncatedRoot(b.mid, degree, context.precision);
  if (!truncated.ok) return truncated;
  if (!isExact(b)) return ok({ mid: truncated.value, rad: UNBOUNDED });
  // A truncation is short of the true root by less than one unit in the
  // last of its `precision` digits, and truncation toward zero never
  // crosses a power of ten, so the truncated value's exponent is the root's.
  const last = decimalExponent(truncated.value) - context.precision + 1;
  const unit =
    last >= 0
      ? rational(10n ** BigInt(last))
      : rational(1n, 10n ** BigInt(-last));
  return ok({ mid: truncated.value, rad: radiusAbove(unit) });
}

/**
 * `b` raised to the rational power `exponent`, as `powRational` composes
 * it: `powBall` when the exponent is an integer, and otherwise `rootBall`
 * of `powBall` to the numerator, root last, so that the one inexact step
 * comes last. A negative midpoint under an even root fails with
 * `negativeRadicand` before anything is computed.
 */
export function powRationalBall(
  b: Ball,
  exponent: Rational,
  context: NumberContext,
): Result<Ball, BallError> {
  if (exponent.den === 1n) return powBall(b, exponent.num);
  if (b.mid.num < 0n && exponent.den % 2n === 0n) {
    return err({ kind: "negativeRadicand", degree: exponent.den });
  }
  const power = powBall(b, exponent.num);
  if (!power.ok) return power;
  return rootBall(power.value, exponent.den, context);
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
