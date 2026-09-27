// The fixed-point kernel: the representation every inexact function runs
// on, and its exact operations with their error rules. docs/calculator-plan.md
// (D9 and task 2.1) is the design. A kernel value is `{ value, error,
// bits }`: the integer `value` stands for `value × 2^-bits`, and `error` is
// an upper bound, in units of `2^-bits` (ulps), on how far that stands from
// the number it approximates. Every operation here updates `error` by an
// over-approximation that is a few lines of integer arithmetic, stated in
// its doc comment, so that the bound can be checked by reading; the tests
// check it by containment, with rational arithmetic, at the ends of the
// operands' intervals.
//
// Fixed rather than floating point: `bits` is the position of the binary
// point, so the integer part is `value >> bits` and the fraction is the low
// `bits` bits, with no separate field for either. `bits` belongs to the
// value, not to a routine: a routine chooses its result's `bits` after its
// argument reduction so that a result of magnitude `2^k` keeps as many
// significant bits as an argument of order one, which is how a routine
// whose result is small or large states its scale, and `shiftFixed` is the
// exact rebase that moves the binary point. Two operands of different
// `bits` are aligned to the larger, which is exact for the value and the
// error alike. `bitsFor(precision)` is the bits a decimal precision needs
// plus `GUARD_BITS`; the guard is bits rather than digits because the error
// count grows by at least one per operation and a series of a thousand
// terms spends ten of them.
//
// The kernel is entered from a rational or a ball (`fixedFromRational`,
// `fixedFromBall`, both rounding to nearest with the rounding counted) and
// left through `fixedToBall`, which hands back the dyadic `value × 2^-bits`
// itself as the midpoint and `error × 2^-bits` rounded up as the radius.
// Nothing here rounds in a rounding mode (D15): the mode is the display's,
// applied once to a certified value. A violated precondition (an unbounded
// ball, a divisor whose interval contains zero, a negative `bits`) is a
// programming error and throws `RangeError`, as `rational` does; the ball
// layer decides what such values mean before calling in.

import { type Ball } from "./ball.ts";
import { isUnbounded, radiusAbove, type Radius } from "./radius.ts";
import { ZERO, bitLength, type Precision, type Rational } from "./rational.ts";
import { divideRounded } from "./rounding.ts";

/**
 * A fixed-point value: `value × 2^-bits`, within `error × 2^-bits` of the
 * number it stands for. `bits` is a non-negative integer; `error` is
 * non-negative.
 */
export type Fixed = {
  readonly value: bigint;
  readonly error: bigint;
  readonly bits: number;
};

/** The bits `bitsFor` adds beyond a decimal precision. */
export const GUARD_BITS = 32;

/** log2(10): the bits a decimal digit is worth. */
const BITS_PER_DIGIT = Math.log2(10);

/**
 * The fraction bits at which a value of order one carries `precision`
 * decimal digits plus the guard: `ceil(precision × log2 10) + GUARD_BITS`.
 */
export function bitsFor(precision: Precision): number {
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
  return Math.ceil(precision * BITS_PER_DIGIT) + GUARD_BITS;
}

// ---------------------------------------------------------------------------
// In and out

/**
 * `r` at `bits` fraction bits, rounded to nearest: the error is 1 (the
 * rounding is by at most half an ulp), or 0 when `r × 2^bits` is an
 * integer.
 */
export function fixedFromRational(r: Rational, bits: number): Fixed {
  checkBits(bits);
  const scaled = r.num << BigInt(bits);
  const value = divideRounded(scaled, r.den, "halfEven");
  const error = scaled % r.den === 0n ? 0n : 1n;
  return { value, error, bits };
}

/**
 * `b` at `bits` fraction bits: the midpoint as `fixedFromRational`, with
 * the radius, in ulps rounded up, added to the error. An unbounded radius
 * is a precondition failure: the caller returns unbounded without
 * computing.
 */
export function fixedFromBall(b: Ball, bits: number): Fixed {
  if (isUnbounded(b.rad)) {
    throw new RangeError("An unbounded ball has no fixed-point value");
  }
  const mid = fixedFromRational(b.mid, bits);
  return { ...mid, error: mid.error + ulpsAbove(b.rad, bits) };
}

/**
 * The ball `f` stands for: the midpoint is the dyadic `value × 2^-bits`
 * itself, in lowest terms, and the radius is `error × 2^-bits` rounded up
 * to a radius. Nothing is rounded in a mode here.
 */
export function fixedToBall(f: Fixed): Ball {
  return {
    mid: dyadic(f.value, f.bits),
    rad: radiusAbove(dyadic(f.error, f.bits)),
  };
}

/** The exact value of `f`, `value × 2^-bits`, as a rational. */
export function toRational(f: Fixed): Rational {
  return dyadic(f.value, f.bits);
}

// ---------------------------------------------------------------------------
// The exact operations

/** `a + b`: the values added, the errors added, at the larger `bits`. */
export function addFixed(a: Fixed, b: Fixed): Fixed {
  [a, b] = aligned(a, b);
  return { value: a.value + b.value, error: a.error + b.error, bits: a.bits };
}

/** `a - b`: the values subtracted, the errors added, at the larger `bits`. */
export function subtractFixed(a: Fixed, b: Fixed): Fixed {
  [a, b] = aligned(a, b);
  return { value: a.value - b.value, error: a.error + b.error, bits: a.bits };
}

/**
 * `a × b` at the larger `bits`: the value is the product of the values
 * shifted down by `bits` (toward minus infinity, by less than an ulp); the
 * error is `|a| eb + |b| ea + ea eb` shifted down and rounded up, the
 * bound for the product over the two intervals, plus one for the shift
 * when it discarded anything.
 */
export function multiplyFixed(a: Fixed, b: Fixed): Fixed {
  [a, b] = aligned(a, b);
  const shift = BigInt(a.bits);
  const product = a.value * b.value;
  const value = product >> shift;
  const inexact = product - (value << shift) !== 0n ? 1n : 0n;
  const propagated =
    abs(a.value) * b.error + abs(b.value) * a.error + a.error * b.error;
  return {
    value,
    error: ceilShift(propagated, shift) + inexact,
    bits: a.bits,
  };
}

/**
 * `a / b` at the larger `bits`, for a divisor whose interval excludes zero
 * (a precondition): the value is the quotient of `a` scaled by `2^bits`
 * and `b`, truncated toward zero by less than an ulp; the error is
 * `(|a| eb + |b| ea) / (|b| (|b| - eb))` in ulps, rounded up, the bound for
 * the quotient over the two intervals, plus one for the truncation when it
 * discarded anything.
 */
export function divideFixed(a: Fixed, b: Fixed): Fixed {
  [a, b] = aligned(a, b);
  const absB = abs(b.value);
  if (absB <= b.error) {
    throw new RangeError("A fixed-point divisor must exclude zero");
  }
  const shift = BigInt(a.bits);
  const scaled = a.value << shift;
  const value = scaled / b.value;
  const inexact = scaled % b.value !== 0n ? 1n : 0n;
  const numerator = (abs(a.value) * b.error + absB * a.error) << shift;
  const denominator = absB * (absB - b.error);
  return {
    value,
    error: ceilDiv(numerator, denominator) + inexact,
    bits: a.bits,
  };
}

/**
 * `f × 2^k`, exactly, by moving the binary point: `bits - k` fraction
 * bits, or, when `k` exceeds `bits`, the value and the error shifted up by
 * the excess at zero fraction bits.
 */
export function shiftFixed(f: Fixed, k: number): Fixed {
  if (!Number.isInteger(k)) throw new RangeError(`Not a shift: ${k}`);
  if (k <= f.bits) return { ...f, bits: f.bits - k };
  const up = BigInt(k - f.bits);
  return { value: f.value << up, error: f.error << up, bits: 0 };
}

/** `|f|`: the value's magnitude, the error kept. */
export function absFixed(f: Fixed): Fixed {
  return f.value < 0n ? { ...f, value: -f.value } : f;
}

/**
 * Compares `a` with `b` where their intervals allow it: -1 or 1 when the
 * intervals are disjoint, 0 when both are exact and equal, and `undefined`
 * when the intervals overlap, since the order of the true values is then
 * not known.
 */
export function compareFixed(a: Fixed, b: Fixed): -1 | 0 | 1 | undefined {
  [a, b] = aligned(a, b);
  if (a.value + a.error < b.value - b.error) return -1;
  if (a.value - a.error > b.value + b.error) return 1;
  if (a.error === 0n && b.error === 0n) return 0;
  return undefined;
}

// ---------------------------------------------------------------------------
// Helpers

/** `a` and `b` at the larger of their `bits`, the other rebased exactly. */
function aligned(a: Fixed, b: Fixed): [Fixed, Fixed] {
  if (a.bits === b.bits) return [a, b];
  return a.bits > b.bits ? [a, rebase(b, a.bits)] : [rebase(a, b.bits), b];
}

/** `f` at `bits >= f.bits` fraction bits, exactly. */
function rebase(f: Fixed, bits: number): Fixed {
  const up = BigInt(bits - f.bits);
  return { value: f.value << up, error: f.error << up, bits };
}

/**
 * `num × 2^-bits` as a rational in lowest terms, built by cancelling the
 * trailing zeros of `num` against the power of two rather than by a gcd,
 * which on a power of two would cost a Euclid of `bits` steps.
 */
function dyadic(num: bigint, bits: number): Rational {
  if (num === 0n) return ZERO;
  const trailing = bitLength(num & -num) - 1;
  if (trailing >= bits) return { num: num >> BigInt(bits), den: 1n };
  return {
    num: num >> BigInt(trailing),
    den: 1n << BigInt(bits - trailing),
  };
}

/** `ceil(rad × 2^bits)` for a bounded `rad`: the radius in ulps, rounded up. */
function ulpsAbove(rad: Radius, bits: number): bigint {
  if (rad.kind === "unbounded") {
    throw new RangeError("An unbounded radius has no ulps");
  }
  if (rad.mant === 0n) return 0n;
  const exp = rad.exp + BigInt(bits);
  if (exp >= 0n) return rad.mant << exp;
  // Below one ulp, however far below, the ceiling is one; shifting by the
  // gap, which may be huge, is avoided.
  if (-exp >= BigInt(bitLength(rad.mant))) return 1n;
  return ceilDiv(rad.mant, 1n << -exp);
}

/** `ceil(n / 2^shift)` for a non-negative `n`. */
function ceilShift(n: bigint, shift: bigint): bigint {
  const down = n >> shift;
  return down << shift === n ? down : down + 1n;
}

/** `ceil(num / den)` for non-negative `num` and positive `den`. */
function ceilDiv(num: bigint, den: bigint): bigint {
  return (num + den - 1n) / den;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function checkBits(bits: number): void {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(
      `Fraction bits must be a non-negative integer: ${bits}`,
    );
  }
}
