// The radius of a ball: a coarse upper bound on how far a computed midpoint
// may lie from the value it stands for. docs/calculator-plan.md (D3 and task
// 1.3) is the design; docs/calculator.md ("The precision model") says what
// the ball is for. This module is the radius alone: ball.ts pairs one with
// a midpoint, and quantity.ts makes that ball every magnitude.
//
// A bounded radius is `mant × 2^exp` with `mant` zero or a normalized 30-bit
// integer, in `[2^29, 2^30)`, and `exp` a bigint; the distinguished value
// `unbounded` stands for a bound that is not known at all (a function whose
// propagation rule is not yet written, in the study's words). It is a type
// of its own and neither a `Rational` nor a `number`: not a rational because
// a radius is propagated through every operation of an expression and must
// cost nothing and never grow, where a rational grows with each step; not a
// float64 because a radius is absolute and scales with the values (the
// product rule is `|a| rb + |b| ra`), so it spans their range, up to
// `10^±(10^18)` with the exponent of stage 4, far beyond a
// double's `10^±308`, and because JavaScript has no directed rounding, so a
// double would need a manual nudge up after every operation anyway. The
// exponent is a bigint for the same reason: the binary exponent of a value
// near `10^(10^18)` is beyond a safe integer.
//
// Every operation rounds the safe way, so a radius is always a true bound:
// `radiusAbove` is the least representable value at or above its argument,
// and the sum, the product, the power and the maximum of true bounds are
// computed exactly on the mantissas and then rounded up to 30 bits. The
// tightness lost to the rounding is a relative `2^-29` per operation,
// invisible at any precision; the tests check both directions, that each
// result is at or above the exact one and within that factor of it.
// Unbounded absorbs everything, even zero: a bound may always be loosened,
// and the ball is where an exact zero times an unbounded value is
// recognized as exact, if it is worth recognizing.
//
// The magnitude of a midpoint enters as a radius without its power of ten
// being formed (4.4): `radiusAboveScaled` and `radiusBelowScaled` take the
// upper and the lower bound of scaled.ts's `log2Bounds`, within `2^-30` of
// the truth, and round the mantissa the same way, so the two bracket the
// magnitude. `powerOfTenRadius` is the same bound for a bare power of
// ten, `10^k`, for any `k` the bounds hold, past the exponent bound
// included: a caller that needs only the radius of a power of ten takes
// it here rather than forming the power as a `Scaled`, which is refused
// past the bound (the plan's H.4). A lower bound is what a quotient's rule divides by, and the
// operations that produce one round down: `subtractRadiusDown` (a
// divisor's distance from zero, `|b| - rb`, zero when the difference is
// not positive), `multiplyRadiusDown`, and `divideRadius`, a quotient
// rounded up against a divisor taken as a lower bound; `rootRadiusAbove`
// is a root rounded up, and `log2OfRadius` the logarithm a decimal
// exponent is found from. `compareRadius` orders radii by value.
//
// The exact value of a bounded radius, `radiusUpper`, is a rational, formed
// when a comparison needs it (certification, a divisor's distance from zero)
// and never stored; it throws on unbounded, which a caller checks first with
// `isUnbounded`. Results are normalized, so equal radii are structurally
// equal and `deepEqual` compares them, as it does rationals.

import { ONE as ONE_FRACTION, rational, type Rational } from "./rational.ts";
import {
  isZero as isZeroScaled,
  log2Bounds,
  type Log2,
  type Scaled,
} from "./scaled.ts";

/** The bits of a normalized mantissa. */
export const MANT_BITS = 30;
/** The least normalized mantissa, `2^29`: the invariant's lower bound, inclusive. */
export const MANT_MIN = 1n << BigInt(MANT_BITS - 1);
/** One past the largest mantissa, `2^30`: the invariant's upper bound, exclusive. */
export const MANT_LIMIT = 1n << BigInt(MANT_BITS);

/**
 * A radius: `mant × 2^exp`, with `mant` zero (the radius of an exact value)
 * or in `[MANT_MIN, MANT_LIMIT)`, or unbounded. Zero is `mant: 0n, exp: 0n`,
 * so that equal radii are structurally equal.
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

/** Exactly `2^k`, for a bigint `k`: the bound of a rounding to `-k` bits. */
export function powerOfTwoRadius(k: bigint): Radius {
  return { kind: "bounded", mant: MANT_MIN, exp: k - BigInt(MANT_BITS - 1) };
}

/**
 * The largest `|k|` that `powerOfTenRadius` takes, `2^90`. The bounds it
 * reads take `k × log2 10` through a 128-bit fraction, whose error stays
 * under the bounds' own margin of `2^-31` only to about `2^97`; a margin
 * of a hundred times that is kept.
 */
const POWER_OF_TEN_LIMIT = 1n << 90n;

/**
 * A radius at or above `10^k`, for a bigint `k` below `2^90` in magnitude:
 * the coarse bound of `1 × 10^k` read off `log2Bounds`, so that no power of
 * ten is formed and `k` may lie past the exponent bound, which a checked
 * `Scaled` power of ten cannot. Tight to `2^-29` of the value, as
 * `radiusAboveScaled` is. A `k` past the limit is a precondition failure.
 */
export function powerOfTenRadius(k: bigint): Radius {
  if (k >= POWER_OF_TEN_LIMIT || k <= -POWER_OF_TEN_LIMIT) {
    throw new RangeError(`A power of ten's radius is bounded to 2^90: ${k}`);
  }
  return radiusAboveScaled({ mant: ONE_FRACTION, exp: k });
}

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
 * The least representable radius at or above `|s|`, from the upper bound
 * of scaled.ts's `log2Bounds`, so that nothing is formed whatever the
 * exponent; zero for zero. Tight to `2^-29` of the value, the mantissa's
 * own width, plus the bound's `2^-30`.
 */
export function radiusAboveScaled(s: Scaled): Radius {
  if (isZeroScaled(s)) return ZERO_RADIUS;
  return fromLog2(log2Bounds(s).upper, "up");
}

/**
 * The greatest representable radius at or below `|s|`, from the lower
 * bound of `log2Bounds`: a lower bound on a magnitude, for a divisor's
 * distance from zero; zero for zero.
 */
export function radiusBelowScaled(s: Scaled): Radius {
  if (isZeroScaled(s)) return ZERO_RADIUS;
  return fromLog2(log2Bounds(s).lower, "down");
}

/** `2^(int + frac)` as a radius, its 30-bit mantissa rounded `up` or `down`. */
function fromLog2(log2: Log2, direction: "up" | "down"): Radius {
  const scaled = 2 ** log2.frac * 2 ** (MANT_BITS - 1);
  const mant = BigInt(
    direction === "up" ? Math.ceil(scaled) : Math.floor(scaled),
  );
  return normalized(mant, log2.int - BigInt(MANT_BITS - 1));
}

/**
 * The binary logarithm of the bounded, nonzero `rad`, as an integer part
 * and a fraction in `[0, 1)`: what a decimal exponent of a radius is found
 * from.
 */
export function log2OfRadius(rad: Radius): Log2 {
  if (rad.kind === "unbounded" || rad.mant === 0n) {
    throw new RangeError("Only a bounded, nonzero radius has a logarithm");
  }
  const log2 = Math.log2(Number(rad.mant));
  const whole = Math.floor(log2);
  return { int: rad.exp + BigInt(whole), frac: log2 - whole };
}

/** Compares two radii by value: -1, 0 or 1; unbounded is above every bounded radius and equal to itself. */
export function compareRadius(a: Radius, b: Radius): -1 | 0 | 1 {
  if (a.kind === "unbounded") return b.kind === "unbounded" ? 0 : 1;
  if (b.kind === "unbounded") return -1;
  return compareBounded(a, b);
}

/**
 * `a - b` rounded down, for bounded `a` and `b`: a lower bound on the
 * difference, and zero when `b` is at or above `a`. Unbounded is a
 * precondition failure, since a lower bound cannot come from one.
 */
export function subtractRadiusDown(a: Radius, b: Radius): Radius {
  if (a.kind === "unbounded" || b.kind === "unbounded") {
    throw new RangeError("A lower bound needs bounded radii");
  }
  if (b.mant === 0n) return a;
  if (compareBounded(a, b) <= 0) return ZERO_RADIUS;
  const gap = a.exp - b.exp;
  // `b` is below `a`, so its exponent is at most `a`'s plus one; when it is
  // far below, the difference rounded down is `a` less one unit.
  if (gap > BigInt(MANT_BITS)) return normalizedDown(a.mant - 1n, a.exp);
  return gap >= 0n
    ? normalizedDown((a.mant << gap) - b.mant, b.exp)
    : normalizedDown(a.mant - (b.mant << -gap), a.exp);
}

/**
 * `a × b` rounded down, for bounded `a` and `b`: a lower bound on the
 * product, for a divisor's distance from zero times its magnitude.
 */
export function multiplyRadiusDown(a: Radius, b: Radius): Radius {
  if (a.kind === "unbounded" || b.kind === "unbounded") {
    throw new RangeError("A lower bound needs bounded radii");
  }
  if (a.mant === 0n || b.mant === 0n) return ZERO_RADIUS;
  return normalizedDown(a.mant * b.mant, a.exp + b.exp);
}

/**
 * A radius at or above the `degree`-th root of the bounded `rad`: its
 * logarithm divided by the degree, rounded up; unbounded absorbs.
 */
export function rootRadiusAbove(rad: Radius, degree: bigint): Radius {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  if (rad.kind === "unbounded" || rad.mant === 0n) return rad;
  const log2 = log2OfRadius(rad);
  // (int + frac) / degree: the integer quotient rounded toward minus
  // infinity, and the rest as a fraction, both to a double's accuracy.
  let int = log2.int / degree;
  let rest = log2.int - int * degree;
  if (rest < 0n) {
    int -= 1n;
    rest += degree;
  }
  const frac = (Number(rest) + log2.frac) / Number(degree);
  return fromLog2({ int, frac: Math.min(frac, 1 - 2 ** -40) }, "up");
}

/**
 * `num / den`, rounded up, for a bounded, nonzero `den` taken as a lower
 * bound: a quotient's radius over a divisor's distance from zero. Unbounded
 * absorbs; a zero divisor is a precondition failure.
 */
export function divideRadius(num: Radius, den: Radius): Radius {
  if (num.kind === "unbounded" || den.kind === "unbounded") return UNBOUNDED;
  if (den.mant === 0n) throw new RangeError("A radius is not divided by zero");
  if (num.mant === 0n) return ZERO_RADIUS;
  // The mantissas' quotient at 2^31 scale keeps 30 bits, rounded up.
  return normalized(
    ceilDiv(num.mant << BigInt(MANT_BITS + 1), den.mant),
    num.exp - den.exp - BigInt(MANT_BITS + 1),
  );
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

/** `rad × 2^k` for an integer `k` of either sign. Exact: the exponent moves; unbounded absorbs. */
export function shiftRadius(rad: Radius, k: bigint): Radius {
  if (rad.kind === "unbounded" || rad.mant === 0n) return rad;
  return { kind: "bounded", mant: rad.mant, exp: rad.exp + k };
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

/**
 * `mant × 2^exp` as a normalized radius, rounded down: a mantissa too wide
 * is shifted down with its low bits dropped, and one too narrow shifted up
 * exactly; zero for a non-positive mantissa.
 */
function normalizedDown(mant: bigint, exp: bigint): Radius {
  if (mant <= 0n) return ZERO_RADIUS;
  const excess = bitLength(mant) - MANT_BITS;
  if (excess > 0)
    return {
      kind: "bounded",
      mant: mant >> BigInt(excess),
      exp: exp + BigInt(excess),
    };
  if (excess < 0)
    return {
      kind: "bounded",
      mant: mant << BigInt(-excess),
      exp: exp - BigInt(-excess),
    };
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
