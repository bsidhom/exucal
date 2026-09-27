// The radius of a ball: a coarse upper bound on how far a computed midpoint
// may lie from the value it stands for. docs/calculator-plan.md (D3 and task
// 1.3) is the design; docs/calculator.md ("The precision model") says what
// the ball is for. This module is the radius alone: the ball that pairs one
// with a midpoint is task 1.5, and nothing uses a radius yet.
//
// A bounded radius is `mant × 2^exp` with `mant` zero or a normalized 30-bit
// integer, in `[2^29, 2^30)`, and `exp` a bigint; the distinguished value
// `unbounded` stands for a bound that is not known at all (a function whose
// propagation rule is not yet written, in the study's words). It is a type
// of its own and neither a `Rational` nor a `number`: not a rational because
// a radius is propagated through every operation of an expression and must
// cost nothing and never grow, where a rational grows with each step; not a
// float64 because a radius is absolute and scales with the values (the
// product rule is `|a| rb + |b| ra`), so it spans their range, `10^±19700`
// today and `10^±(10^18)` once stage 4 adds the exponent, far beyond a
// double's `10^±308`, and because JavaScript has no directed rounding, so a
// double would need a manual nudge up after every operation anyway. The
// exponent is a bigint for the same reason: the binary exponent of a value
// near `10^(10^18)` is beyond a safe integer.
//
// Every operation rounds up, so a radius is always a true bound: `radiusAbove`
// is the least representable value at or above its argument, and the sum,
// the product, the power and the maximum of true bounds are computed exactly
// on the mantissas and then rounded up to 30 bits. The tightness lost to the
// rounding is a relative `2^-29` per operation, invisible at any precision;
// the tests check both directions, that each result is at or above the exact
// one and within that factor of it. Unbounded absorbs everything, even zero:
// a bound may always be loosened, and the ball is where an exact zero times
// an unbounded value is recognized as exact, if it is worth recognizing.
//
// The exact value of a bounded radius, `radiusUpper`, is a rational, formed
// when a comparison needs it (certification, a divisor's distance from zero)
// and never stored; it throws on unbounded, which a caller checks first with
// `isUnbounded`. Results are normalized, so equal radii are structurally
// equal and `deepEqual` compares them, as it does rationals.

import { rational, type Rational } from "./rational.ts";

/** The bits of a normalized mantissa. */
export const MANT_BITS = 30;
const MANT_MIN = 1n << BigInt(MANT_BITS - 1);
const MANT_LIMIT = 1n << BigInt(MANT_BITS);

/**
 * A radius: `mant × 2^exp`, with `mant` zero (the radius of an exact value)
 * or in `[2^29, 2^30)`, or unbounded. Zero is `mant: 0n, exp: 0n`, so that
 * equal radii are structurally equal.
 */
export type Radius =
  | { readonly kind: "bounded"; readonly mant: bigint; readonly exp: bigint }
  | { readonly kind: "unbounded" };

/** The radius of an exact value. */
export const ZERO_RADIUS: Radius = { kind: "bounded", mant: 0n, exp: 0n };

/** A bound that is not known at all. */
export const UNBOUNDED: Radius = { kind: "unbounded" };

/** Exactly one: `2^29 × 2^-29`, the identity of `multiplyRadius`. */
const ONE_RADIUS: Radius = { kind: "bounded", mant: MANT_MIN, exp: -29n };

export function isZeroRadius(rad: Radius): boolean {
  return rad.kind === "bounded" && rad.mant === 0n;
}

export function isUnbounded(rad: Radius): boolean {
  return rad.kind === "unbounded";
}

/** The least representable radius at or above `|r|`; zero for zero. */
export function radiusAbove(r: Rational): Radius {
  if (r.num === 0n) return ZERO_RADIUS;
  const num = r.num < 0n ? -r.num : r.num;
  const den = r.den;
  // With e = bits(num) - bits(den), |r| lies in (2^(e-1), 2^(e+1)), so at
  // exp = e - 30 the scaled value lies in (2^29, 2^31) and its ceiling in
  // [2^29 + 1, 2^31]: at most one bit too many, which `normalized` rounds
  // off, still upward.
  const exp = BigInt(bitLength(num) - bitLength(den) - MANT_BITS);
  const mant = exp >= 0n ? ceilDiv(num, den << exp) : ceilDiv(num << -exp, den);
  return normalized(mant, exp);
}

/**
 * The exact value of the bounded `rad`, `mant × 2^exp`, as a rational.
 * Throws `RangeError` on unbounded: a caller checks `isUnbounded` first.
 */
export function radiusUpper(rad: Radius): Rational {
  if (rad.kind === "unbounded") {
    throw new RangeError("An unbounded radius has no value");
  }
  return rad.exp >= 0n
    ? rational(rad.mant << rad.exp)
    : rational(rad.mant, 1n << -rad.exp);
}

/** `a + b`, rounded up. Zero is the identity; unbounded absorbs. */
export function addRadius(a: Radius, b: Radius): Radius {
  if (a.kind === "unbounded" || b.kind === "unbounded") return UNBOUNDED;
  if (a.mant === 0n) return b;
  if (b.mant === 0n) return a;
  const [large, small] = a.exp >= b.exp ? [a, b] : [b, a];
  const gap = large.exp - small.exp;
  // `small` is below `2^(small.exp + 30)`, so when the gap exceeds the
  // mantissa's width it is below one unit of `large`, and rounding the sum
  // up is adding that unit, without a shift by the gap, which may be huge.
  if (gap > BigInt(MANT_BITS)) return normalized(large.mant + 1n, large.exp);
  return normalized((large.mant << gap) + small.mant, small.exp);
}

/** `a × b`, rounded up. Zero annihilates a bounded radius; unbounded absorbs. */
export function multiplyRadius(a: Radius, b: Radius): Radius {
  if (a.kind === "unbounded" || b.kind === "unbounded") return UNBOUNDED;
  if (a.mant === 0n || b.mant === 0n) return ZERO_RADIUS;
  return normalized(a.mant * b.mant, a.exp + b.exp);
}

/** The larger of `a` and `b`; unbounded absorbs. Exact: nothing is rounded. */
export function maxRadius(a: Radius, b: Radius): Radius {
  if (a.kind === "unbounded" || b.kind === "unbounded") return UNBOUNDED;
  return compareBounded(a, b) >= 0 ? a : b;
}

/**
 * `rad` to the non-negative integer power `n`, by squaring, each product
 * rounded up, so the result is at or above the exact power. `n = 0` gives
 * one, for zero too, as `pow` does; unbounded absorbs, for `n = 0` as well.
 * A negative `n` is a precondition failure: a radius is not inverted (the
 * bound for `1 / x` is the ball's, from the divisor's distance from zero).
 */
export function powRadius(rad: Radius, n: bigint): Radius {
  if (n < 0n) {
    throw new RangeError(`A radius is raised to a non-negative power: ${n}`);
  }
  if (rad.kind === "unbounded") return UNBOUNDED;
  let result: Radius = ONE_RADIUS;
  let base: Radius = rad;
  for (let rest = n; rest > 0n; rest >>= 1n) {
    if (rest & 1n) result = multiplyRadius(result, base);
    if (rest > 1n) base = multiplyRadius(base, base);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers

type Bounded = Extract<Radius, { kind: "bounded" }>;

/**
 * `mant × 2^exp` as a normalized radius, rounded up: a mantissa too wide is
 * divided by the excess power of two with its ceiling taken, and one too
 * narrow is shifted up exactly. The ceiling can carry into a 31st bit
 * (`2^30` exactly), which is `2^29` one exponent higher.
 */
function normalized(mant: bigint, exp: bigint): Radius {
  if (mant === 0n) return ZERO_RADIUS;
  const excess = bitLength(mant) - MANT_BITS;
  if (excess > 0) {
    mant = ceilDiv(mant, 1n << BigInt(excess));
    exp += BigInt(excess);
    if (mant === MANT_LIMIT) {
      mant = MANT_MIN;
      exp += 1n;
    }
  } else if (excess < 0) {
    mant <<= BigInt(-excess);
    exp -= BigInt(-excess);
  }
  return { kind: "bounded", mant, exp };
}

/** Compares two bounded radii by value: -1, 0 or 1. */
function compareBounded(a: Bounded, b: Bounded): -1 | 0 | 1 {
  if (a.mant === 0n || b.mant === 0n) {
    return a.mant === b.mant ? 0 : a.mant === 0n ? -1 : 1;
  }
  // Both mantissas are in [2^29, 2^30), so the exponents order the values
  // and the mantissas break the tie.
  if (a.exp !== b.exp) return a.exp < b.exp ? -1 : 1;
  return a.mant < b.mant ? -1 : a.mant > b.mant ? 1 : 0;
}

/** `ceil(num / den)` for non-negative `num` and positive `den`. */
function ceilDiv(num: bigint, den: bigint): bigint {
  return (num + den - 1n) / den;
}

/** The number of bits in the non-negative `n` (0 for zero). */
function bitLength(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
}
