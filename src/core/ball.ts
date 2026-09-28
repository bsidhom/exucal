// The ball: a midpoint with a radius, the value every magnitude becomes. The
// midpoint is the number computed, an exact `Rational`; the radius, a
// `Radius` of radius.ts, bounds its distance from the value it stands for.
// An exact value has radius zero, and `=` in the display means exactly that.
// docs/calculator.md ("The precision model") is the design and
// docs/calculator-plan.md (D3, D4, D7, D15, tasks 1.5, 2.3, 2.4 and 2.5) the
// decisions;
// this module is the type, its exact operations and the one inexact one,
// the root; quantity.ts makes a ball the magnitude of every quantity.
//
// Each operation composes the exact arithmetic of rational.ts on the
// midpoints with a propagation rule of radius.ts on the radii; neither of
// those modules knows the other. The exact operations never round a
// midpoint: an exact value stays the exact rational it is, and only the
// radius says what has been lost upstream (a root, later a function). An
// inexact value is another matter (D15): its midpoint is a number
// computed, not known, and the evaluator settles it after every operation
// with `settle`, which rounds it to nearest at the working precision's
// bits, a dyadic, and adds the rounding to the radius, so that an inexact
// midpoint never grows beyond the working precision however long the
// expression; `powBall` on an inexact base squares with settling for the
// same reason. Settling is a bound on size, not a rounding the user chose:
// the mode is the display's alone. The rules are the
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
// kind of its own beside `divisionByZero`, because the retry loop of the
// pipeline retries on the first (a narrower ball may exclude zero) and never
// on the second. A divisor of unbounded radius with a nonzero midpoint divides, and
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
//
// A rational power (`powRationalBall`, which `^` and the built-in `pow`
// share; task 3.8) has three routes. An exact base that is a perfect
// `q`-th power gives the exact root raised to `p`, without ever forming
// `x^p`, since `x^(p/q)` is rational exactly when `x` is a perfect `q`-th
// power. Otherwise, when `x^p` fits the range limit, the root of the power
// as above, root last so that the one inexact step comes last, which also
// serves a negative base under an odd root and reports a base straddling
// zero `unresolved`. Otherwise log space: `exp(y ln x)` on the kernel
// routines beside fixed.ts (`lnFixed` of fixed-log.ts, `expFixed` of
// fixed-exp.ts; the routines are below the ball so that this module can
// reach them), for a base positive throughout, and for a negative base
// under an odd root by symmetry; `powLogSpace` is that route on any
// bounded exponent, which `pow` takes for an inexact one. The base is
// scaled to order one by a power of two before it is converted, and the
// power goes to the logarithm (`lnScaled`, which the logarithms share), so
// that a tiny base loses nothing to the conversion; the product `y ln x`
// is formed at the bits plus the exponent's and the logarithm's magnitudes,
// and its magnitude is held to the range limit before the exponential
// (`expFits`) so that `10^(100000/3)` is `tooLarge` as it was, while
// `2^0.1234567` and `10^2.3456789`, once `2^1234567` and `10^23456789`
// refused as `tooLarge`, are values with a radius.

import type { NumberContext } from "./context.ts";
import { expFixed } from "./fixed-exp.ts";
import { lnFixed } from "./fixed-log.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedToBall,
  multiplyFixed,
  rootFixed,
  shiftFixed,
  toRational,
  type Fixed,
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
  powerOfTwoRadius,
  radiusAbove,
  radiusUpper,
  shiftRadius,
  type Radius,
} from "./radius.ts";
import { divideRounded } from "./rounding.ts";
import { err, ok, type Result } from "./result.ts";
import type { Precision, RoundingMode } from "./rounding.ts";
import {
  decimalExponent,
  equals as equalsScaled,
  fromRational,
  roundTo,
} from "./scaled.ts";

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
 * `b^n` for an integer `n`. An exact ball goes through `pow`, exactly,
 * within the context's range limit. An inexact ball is raised by squaring
 * with `multiplyBalls`, settled after each product (D15), so that the
 * midpoint stays at the working precision and only the magnitude of the
 * result is guarded: a result whose binary exponent would exceed the range
 * limit is `tooLarge` before anything is computed. A negative `n` inverts
 * by the division rule, so a ball containing zero to a negative power is
 * `unresolved`. `b^0` is exactly one, as `pow` has it, for any ball.
 */
export function powBall(
  b: Ball,
  n: bigint,
  context: NumberContext,
): Result<Ball, BallError> {
  if (isExact(b)) {
    const mid = pow(b.mid, n, context.maxBits);
    return mid.ok ? ok(exact(mid.value)) : mid;
  }
  if (n === 0n) return ok(exact(ONE));
  if (n < 0n) {
    const positive = powBall(b, -n, context);
    if (!positive.ok) return positive;
    return divideBalls(exact(ONE), positive.value);
  }
  if (!isZero(b.mid) && log2Scale(b) * Number(n) > context.maxBits) {
    return err({ kind: "tooLarge" });
  }
  let result = exact(ONE);
  let base = b;
  for (let rest = n; rest > 0n; rest >>= 1n) {
    if (rest & 1n) result = settle(multiplyBalls(result, base), context);
    if (rest > 1n) base = settle(multiplyBalls(base, base), context);
  }
  return ok(result);
}

/**
 * `b` settled to the working precision of `context` (D15): an inexact
 * midpoint is rounded to nearest at `bitsFor(precision)` significant bits,
 * a dyadic built in lowest terms without a gcd, and half an ulp of that
 * rounding, its bound, is added to the radius; an exact ball, or one with
 * a zero midpoint, is returned as it is. The rounding is to nearest and
 * not in the context's mode: settling bounds the size of a number the user
 * never sees, and the mode is applied once, by the display, to the
 * certified value of the whole expression.
 */
export function settle(b: Ball, context: NumberContext): Ball {
  if (isExact(b) || isZero(b.mid)) return b;
  const bits = bitsFor(context.precision);
  const { num, den } = b.mid;
  // The value has bitLength(num) - bitLength(den) + 1 bits of integer part,
  // give or take one; shifting by `shift` puts `bits` of them above the
  // point.
  const shift = bits - (bitLength(absolute(b.mid).num) - bitLength(den));
  const value =
    shift >= 0
      ? divideRounded(num << BigInt(shift), den, "halfEven")
      : divideRounded(num, den << BigInt(-shift), "halfEven");
  const mid =
    shift >= 0
      ? toRational({ value, error: 0n, bits: shift })
      : rational(value << BigInt(-shift));
  return { mid, rad: addRadius(b.rad, powerOfTwoRadius(BigInt(-shift - 1))) };
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
 * `b` raised to the rational power `exponent`, by the three routes the
 * header lays out: `powBall` for an integer exponent; for `p/q` in lowest
 * terms the exact root raised to `p` when `b` is exact and a perfect
 * `q`-th power; else `rootBall` of `powBall` when `b^p` fits the range
 * limit, root last; else log space. A ball negative throughout under an
 * even root fails with `negativeRadicand` before anything is computed, so
 * that `(-8)^(2/4)` is refused rather than computed as the fourth root of
 * 64; one straddling zero goes to the root, which reports it `unresolved`
 * under an even degree, or `tooLarge` when its power does not fit; one of
 * unbounded radius gives the power of its midpoint with an unbounded
 * radius.
 */
export function powRationalBall(
  b: Ball,
  exponent: Rational,
  context: NumberContext,
): Result<Ball, BallError> {
  if (exponent.den === 1n) return powBall(b, exponent.num, context);
  const { num: p, den: q } = exponent;
  const even = q % 2n === 0n;
  if (isExact(b)) {
    const root = exactRoot(b.mid, q);
    if (!root.ok) return root;
    if (root.value !== undefined) {
      const power = pow(root.value, p, context.maxBits);
      return power.ok ? ok(exact(power.value)) : power;
    }
  }
  if (b.rad.kind === "unbounded") {
    const at = powRationalBall(exact(b.mid), exponent, context);
    return at.ok ? ok({ mid: at.value.mid, rad: UNBOUNDED }) : at;
  }
  const negative = sign(b.mid) < 0 && !containsZero(b);
  if (negative && even) return err({ kind: "negativeRadicand", degree: q });
  const power = powBall(b, p, context);
  if (power.ok) return rootBall(power.value, q, context);
  if (power.error.kind !== "tooLarge" || containsZero(b)) return power;
  const result = powLogSpace(
    negative ? negateBall(b) : b,
    exact(exponent),
    context,
  );
  if (!result.ok || !negative || p % 2n === 0n) return result;
  return ok(negateBall(result.value));
}

/**
 * `exp(y ln x)` on the kernel, for a bounded `x` positive as rationals (a
 * precondition) and a bounded `y`: the logarithm at the working bits plus
 * the magnitudes of `y` and of the logarithm, so that their product keeps
 * the working bits, `unresolved` when `x` reaches within an ulp of zero at
 * those bits, `tooLarge` when the product's magnitude, over its whole
 * interval, puts the result beyond the range limit, and otherwise the
 * kernel's ball, rounded in no mode.
 */
export function powLogSpace(
  x: Ball,
  y: Ball,
  context: NumberContext,
): Result<Ball, BallError> {
  const bits = bitsFor(context.precision);
  const yBound = radiusBound(magnitudeAbove(y));
  const yBits =
    yBound === Infinity ? 0 : Math.max(0, Math.ceil(Math.log2(yBound + 1)));
  const lnBits = bitLength(BigInt(Math.abs(scaleOf(x))) + 2n);
  const working = bits + yBits + lnBits + 8;
  const lnX = lnScaled(x, working, bitsFor(context.ceiling));
  if (lnX === undefined) return err({ kind: "unresolved" });
  const product = multiplyFixed(fixedFromBall(y, working), lnX);
  const bound = abs(product.value) + product.error;
  const magnitude =
    Number(bound >> BigInt(Math.max(0, bitLength(bound) - 53))) *
    2 ** (Math.max(0, bitLength(bound) - 53) - product.bits);
  if (!expFits(magnitude, context.maxBits)) return err({ kind: "tooLarge" });
  return ok(fixedToBall(expFixed(product, bits)));
}

/**
 * The kernel's logarithm of a bounded `x` positive as rationals (a
 * precondition) at `bits` fraction bits, `ln(2)` from its memo at
 * `ceilingBits`: `x` is scaled to order one by an exact power of two,
 * converted at `bits`, and the power goes to `lnFixed` as its `scale`, so
 * that a tiny `x` loses nothing to the conversion. `undefined` when the
 * scaled ball reaches within an ulp of zero at those bits, which only a
 * ball wider than its value can produce.
 */
export function lnScaled(
  x: Ball,
  bits: number,
  ceilingBits: number,
): Fixed | undefined {
  const scale = scaleOf(x);
  const scaled: Ball = {
    mid: scaleByPowerOfTwo(x.mid, -BigInt(scale)),
    rad: shiftRadius(x.rad, -BigInt(scale)),
  };
  const f = fixedFromBall(scaled, bits);
  if (f.value <= f.error) return undefined;
  return lnFixed(f, bits, ceilingBits, scale);
}

/** The power of two that scales the positive midpoint of `x` to order one: the bit lengths' difference. */
function scaleOf(x: Ball): number {
  return bitLength(x.mid.num) - bitLength(x.mid.den);
}

/**
 * A number at or above the radius `rad`, `Infinity` for an unbounded one
 * or one beyond a double: enough to compare a magnitude with the range
 * limit.
 */
export function radiusBound(rad: Radius): number {
  if (rad.kind === "unbounded") return Infinity;
  if (rad.mant === 0n) return 0;
  if (rad.exp > 1000n) return Infinity;
  if (rad.exp < -1100n) return 0;
  return Number(rad.mant) * 2 ** Number(rad.exp);
}

/** Whether `exp` of a value of magnitude up to `bound` fits the range limit `maxBits`, either way from one. */
export function expFits(bound: number, maxBits: number): boolean {
  return bound * Math.LOG2E <= maxBits;
}

/**
 * A bound on `|log2|` of the values in the inexact `b`, as a double: the
 * larger of the binary exponent of its magnitude bound and of its
 * midpoint's, each to a double's accuracy plus a little slack, so that
 * `powBall` can bound the bits of a power's integer part or denominator
 * before computing it. An unbounded radius bounds nothing, and the
 * midpoint's exponent stands alone, as the midpoint is all that is
 * computed for such a ball.
 */
function log2Scale(b: Ball): number {
  const above = magnitudeAbove(b);
  const mid = Math.abs(log2Of(absolute(b.mid).num) - log2Of(b.mid.den));
  const upper =
    above.kind === "unbounded"
      ? mid
      : Math.abs(Math.log2(Number(above.mant)) + Number(above.exp));
  return Math.max(upper, mid) * (1 + 1e-9) + 1e-9;
}

/** `log2` of the positive `n`, through its top bits, to a double's accuracy. */
function log2Of(n: bigint): number {
  const length = bitLength(n);
  const top = Math.max(0, length - 53);
  return Math.log2(Number(n >> BigInt(top))) + top;
}

// ---------------------------------------------------------------------------
// Certification

/**
 * Whether `b` certifies `digits` significant digits in `mode` (D7 of the
 * plan): its two ends, `mid - rad` and `mid + rad` as exact rationals,
 * round to the same `digits`-digit value in `mode`. Rounding is monotone,
 * so every value between them rounds to it too, and the shown digits are
 * what rounding the true value would give: correctly rounded, not merely
 * close. An exact ball certifies every count; an unbounded one none; a
 * ball containing zero none, since its ends differ in sign.
 */
export function certifies(
  b: Ball,
  digits: Precision,
  mode: RoundingMode,
): boolean {
  if (b.rad.kind === "unbounded") return false;
  if (b.rad.mant === 0n) return true;
  const rad = radiusUpper(b.rad);
  // Rounded as a `Scaled` (4.3), through the boundary that goes in 4.4.
  return equalsScaled(
    roundTo(fromRational(subtract(b.mid, rad)), digits, mode),
    roundTo(fromRational(add(b.mid, rad)), digits, mode),
  );
}

/**
 * The largest `d <= maxDigits` that `b` certifies in `mode`, or 0 when it
 * certifies none. Certification is not monotone in `d`: `[1.246, 1.254]`
 * certifies three digits, both ends rounding to `1.25`, and not two,
 * `1.25` being a two-digit tie; so the counts are tried from the top
 * down, and the first that certifies is the answer. The scan starts where
 * the radius allows: two ends within `2 rad` of each other cannot share a
 * cell narrower than that, which bounds `d` by the exponents of the ends
 * and the radius.
 */
export function certifiedDigits(
  b: Ball,
  maxDigits: Precision,
  mode: RoundingMode,
): number {
  if (b.rad.kind === "unbounded" || containsZero(b)) {
    return isExactZero(b) ? maxDigits : 0;
  }
  if (b.rad.mant === 0n) return maxDigits;
  const rad = radiusUpper(b.rad);
  const farthest =
    compare(absolute(subtract(b.mid, rad)), absolute(add(b.mid, rad))) > 0
      ? subtract(b.mid, rad)
      : add(b.mid, rad);
  const atMost =
    Number(
      decimalExponent(fromRational(farthest)) -
        decimalExponent(fromRational(rad)),
    ) + 2;
  for (let d = Math.min(maxDigits, atMost); d >= 1; d--) {
    if (certifies(b, d, mode)) return d;
  }
  return 0;
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

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
