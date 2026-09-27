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
// The root is the one inexact operation, and it runs on the kernel
// (fixed.ts; task 2.3 of the plan). An exact argument with a rational root
// is exact, as `exactRoot` finds it. Otherwise a ball whose interval
// excludes zero is scaled by an exact power of `2^degree` so that it is of
// order one (the scaling belongs here, on the ball, since a tiny ball
// converted at the kernel's bits would lose its digits), converted at
// `bitsFor(precision)`, rooted, scaled back and handed back through
// `fixedToBall`, so that the radius covers the argument's radius and the
// kernel's own error, and the midpoint is the kernel's dyadic, rounded in
// no mode (D15: the mode is the display's). A negative ball of odd degree
// is the negated root of its magnitude; one of even degree fails with
// `negativeRadicand`. A ball containing zero without being exactly zero is
// `unresolved` under an even degree, since the sign of the true value
// decides whether there is a root at all, and under an odd degree a ball
// around zero bounded by the root of the farther end of the interval, the
// root being monotone. An argument of unbounded radius gives the root of
// its midpoint with an unbounded radius, as the other operations propagate
// unbounded. The context's precision is the working precision the kernel
// computes at; nothing here reads its rounding mode.

import { type NumberContext } from "./context.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedToBall,
  rootFixed,
  shiftFixed,
} from "./fixed.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  bitLength,
  compare,
  divide,
  exactRoot,
  isZero,
  multiply,
  negate,
  pow,
  rational,
  scaleByPowerOfTwo,
  sign,
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
  shiftRadius,
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
 * The `degree`-th root of `b`, where `degree >= 1`, at the precision of
 * `context`: an exact argument with a rational root is exact; a ball whose
 * interval excludes zero goes through the kernel, scaled to order one
 * first, so its radius covers the argument's; a ball containing zero
 * without being exactly zero is `unresolved` under an even degree and a
 * ball around zero under an odd one; an even root of a negative ball fails
 * with `negativeRadicand`; an unbounded argument gives the root of its
 * midpoint, unbounded.
 */
export function rootBall(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball, BallError> {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  if (isExact(b)) {
    const exactValue = exactRoot(b.mid, degree);
    if (!exactValue.ok) return exactValue;
    if (exactValue.value !== undefined) return ok(exact(exactValue.value));
  }
  if (degree === 1n) return ok(b);
  if (b.rad.kind === "unbounded") {
    const root = rootBall(exact(b.mid), degree, context);
    return root.ok ? ok({ mid: root.value.mid, rad: UNBOUNDED }) : root;
  }
  const even = degree % 2n === 0n;
  if (containsZero(b)) {
    return even
      ? err({ kind: "unresolved" })
      : ok(rootAroundZero(b, degree, context));
  }
  if (sign(b.mid) < 0) {
    if (even) return err({ kind: "negativeRadicand", degree });
    const root = positiveRoot(negateBall(b), degree, context);
    return ok(
      root === undefined
        ? rootAroundZero(b, degree, context)
        : negateBall(root),
    );
  }
  const root = positiveRoot(b, degree, context);
  if (root !== undefined) return ok(root);
  // The interval is positive as rationals but not at the kernel's bits: the
  // ball reaches within an ulp of zero, and is treated as containing it.
  return even
    ? err({ kind: "unresolved" })
    : ok(rootAroundZero(b, degree, context));
}

/**
 * The root of a bounded `b` whose interval is positive, through the kernel:
 * `b` is scaled by `2^(-k × degree)` with `k` chosen so that its midpoint is
 * of order one, converted at `bitsFor(precision)`, rooted, scaled back by
 * `2^k` and handed back. `undefined` when the scaled ball's interval is not
 * positive at those bits, which only a ball reaching within an ulp of zero
 * can produce.
 */
function positiveRoot(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Ball | undefined {
  const exponent = BigInt(bitLength(b.mid.num) - bitLength(b.mid.den));
  const k = exponent / degree;
  const shift = k * degree;
  const scaled: Ball = {
    mid: scaleByPowerOfTwo(b.mid, -shift),
    rad: shiftRadius(b.rad, -shift),
  };
  const f = fixedFromBall(scaled, bitsFor(context.precision));
  if (f.value <= f.error) return undefined;
  return fixedToBall(shiftFixed(rootFixed(f, degree), Number(k)));
}

/**
 * The odd-degree root of a bounded `b` containing zero: a ball around zero
 * whose radius is the root of the farther end of `b`'s interval, which
 * bounds the root of every value in it, the root being monotone and odd.
 */
function rootAroundZero(b: Ball, degree: bigint, context: NumberContext): Ball {
  const rad = radiusUpper(b.rad);
  const low = absolute(subtract(b.mid, rad));
  const high = add(b.mid, rad);
  const far = compare(low, high) > 0 ? low : high;
  // `far` is positive: the ball is not exactly zero, so one end is not.
  const root = positiveRoot(exact(far), degree, context);
  if (root === undefined) throw new Error("An exact positive value has a root");
  return { mid: ZERO, rad: radiusAbove(add(root.mid, radiusUpper(root.rad))) };
}

/**
 * `b` raised to the rational power `exponent`: `powBall` when the exponent
 * is an integer, and otherwise `rootBall` of `powBall` to the numerator,
 * root last, so that the one inexact step comes last. A ball that is
 * negative throughout under an even root fails with `negativeRadicand`
 * before anything is computed, so that `(-8)^(2/4)` is refused rather
 * than computed as the fourth root of 64; a ball straddling zero goes on
 * to the root, which reports it `unresolved`.
 */
export function powRationalBall(
  b: Ball,
  exponent: Rational,
  context: NumberContext,
): Result<Ball, BallError> {
  if (exponent.den === 1n) return powBall(b, exponent.num);
  if (b.mid.num < 0n && exponent.den % 2n === 0n && !containsZero(b)) {
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
