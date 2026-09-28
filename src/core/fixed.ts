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
// The roots are the first routines on the kernel (task 2.2): the square
// root by Newton on the reciprocal square root, multiplications only with
// the precision doubling (3.7 replaced the integer square root of the
// argument's ends, which cost twice the cube root at the ceiling because
// V8 divides big integers quadratically), and the root of any degree by
// Newton in fixed point; either root's error is verified by raising the
// result back to the power with the error rule rather than read off the
// iteration, so that the argument's error and the iteration's rounding
// enter one bound. The
// elementary functions of stage 3 follow the same pattern, reduce the
// argument, run a series on values of order one with the argument's error
// included from the start, and bound the result from what was computed,
// each in a module of its own beside this one (fixed-exp.ts, fixed-log.ts,
// ...) on the operations here and the helpers exported for them:
// `rebaseFixed`, `scaleFixed`, `divideFixedByInteger`, `exponentOf` and
// `keepSignificant`, the last being D9's rule for a result's `bits`.
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

import type { Ball } from "./ball.ts";
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

/** `f × n` for an integer `n`, exactly: the value and the error scaled. */
export function scaleFixed(f: Fixed, n: bigint): Fixed {
  return { value: f.value * n, error: f.error * abs(n), bits: f.bits };
}

/**
 * `f / n` for a positive integer `n`: the value truncated toward zero by
 * less than an ulp, and the error divided and rounded up, plus one for
 * the truncation when it discarded anything.
 */
export function divideFixedByInteger(f: Fixed, n: bigint): Fixed {
  if (n <= 0n) throw new RangeError(`A positive divisor is needed: ${n}`);
  const value = f.value / n;
  const inexact = f.value % n !== 0n ? 1n : 0n;
  return { value, error: ceilDiv(f.error, n) + inexact, bits: f.bits };
}

/** `f` at `bits >= f.bits` fraction bits, exactly. */
export function rebaseFixed(f: Fixed, bits: number): Fixed {
  if (bits < f.bits) throw new RangeError("rebaseFixed only adds bits");
  return rebase(f, bits);
}

/**
 * `f` with its `bits` chosen for its magnitude (D9): a result of magnitude
 * `2^k` keeps `bits` significant bits, so it is truncated to `bits - k`
 * fraction bits (none for a value at or above `2^bits`) when it has more,
 * and kept as it is when it has fewer, since truncation cannot add
 * accuracy. A zero value is kept as it is.
 */
export function keepSignificant(f: Fixed, bits: number): Fixed {
  if (f.value === 0n) return f;
  const target = Math.max(0, bits - exponentOf(f));
  return target < f.bits ? truncateFixed(f, target) : f;
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
// The roots

/** The bits the square root works beyond what it hands back, so that the verified error truncates to an ulp or two. */
const SQRT_GUARD = 16;

/**
 * The square root of `f`, whose interval must be positive (a precondition;
 * the caller decides what a ball around zero means). The argument is
 * reduced by an exact power of four to `m` in `[1, 4)`, whose root is in
 * `[1, 2)`, and the reciprocal root `y = 1 / sqrt(m)` is found by Newton,
 * `y ← y (3 - m y^2) / 2`, multiplications only, from a double and with
 * the precision doubling each step and one step more at the working bits;
 * the root is `m y`. Its error is verified by squaring: with `D` the
 * distance of the truncated square from the argument's value plus the
 * truncation's ulp plus the argument's error, `|s^2 - a| <= D` for every
 * `a` in the argument's interval, and `|s - sqrt(a)| = |s^2 - a| / (s +
 * sqrt(a))` with `sqrt(a) >= s sqrt(1 - D / s^2) >= s - D / s`, so the
 * error is `D s / (2 s^2 - D)`, about `D / 2s`, rounded up in ulps (the
 * bound `D / s` would double the argument's error at every root, which
 * the logarithm takes eight of). The argument's own error enters the same
 * bound, and no derivative bound is needed. The work is done `SQRT_GUARD`
 * bits beyond the result, which keeps the argument's significant bits for
 * a root of magnitude `2^k` (D9): `bits - k` fraction bits.
 */
export function sqrtFixed(f: Fixed): Fixed {
  checkPositive(f);
  const k = Math.floor(exponentOf(f) / 2);
  const bits = Math.max(0, f.bits - k);
  const working = Math.max(f.bits, k) + SQRT_GUARD;
  const scaled = shiftFixed(f, -2 * k);
  const m =
    scaled.bits > working
      ? truncateFixed(scaled, working)
      : rebase(scaled, working);
  const shift = BigInt(working);
  const y = reciprocalSqrt(m.value, working);
  const value = (m.value * y) >> shift;
  if (value <= 0n) throw new Error("Newton's reciprocal root diverged");
  const squared = (value * value) >> shift;
  const distance = abs(squared - m.value) + 1n + m.error;
  // In ulps: D s / (2 s^2 - D) with s = value × 2^-working and D = distance × 2^-working.
  const denominator = 2n * value * value - (distance << shift);
  if (denominator <= 0n) throw new Error("Newton's reciprocal root diverged");
  const root = shiftFixed(
    {
      value,
      error: ceilDiv((distance * value) << shift, denominator),
      bits: working,
    },
    k,
  );
  return root.bits > bits ? truncateFixed(root, bits) : root;
}

/**
 * `1 / sqrt(m)` at `bits` fraction bits for `m` in `[1, 4)` at those bits,
 * by Newton with the precision doubling from a double's fifty bits, the
 * argument truncated to each step's bits, and one step more at the full
 * bits for the last ulps the doubling left; the value alone, to be
 * verified.
 */
function reciprocalSqrt(m: bigint, bits: number): bigint {
  const top = Math.max(0, bitLength(m) - 53);
  const asDouble = Number(m >> BigInt(top)) * 2 ** (top - bits);
  let precision = Math.min(50, bits);
  let y = BigInt(Math.floor(2 ** precision / Math.sqrt(asDouble)));
  const step = (): void => {
    const shift = BigInt(precision);
    const at = m >> BigInt(bits - precision);
    const y2 = (y * y) >> shift;
    y = (y * ((3n << shift) - ((at * y2) >> shift))) >> (shift + 1n);
  };
  while (precision < bits) {
    const next = Math.min(2 * precision, bits);
    y <<= BigInt(next - precision);
    precision = next;
    step();
  }
  step();
  return y;
}

/**
 * The `degree`-th root of `f`, for any degree from one, whose interval
 * must be positive (a precondition, as for `sqrtFixed`). Newton in fixed
 * point, `x ← ((n - 1) x + a / x^(n-1)) / n` with the power by squaring, so
 * that no integer of `degree × bits` bits is ever formed and the cost is
 * logarithmic in the degree; the argument is first reduced by an exact
 * power of `2^degree` so that the root lies in `[1/2, 2)`, and the
 * reduction's working bits keep the reduced argument's significant bits.
 * The first guess is taken through a double, some fifty correct bits, and
 * the iteration stops when a step no longer shrinks it.
 *
 * The error is not read off the iteration but verified: the power `y^n`
 * of the result is recomputed with the error rule of `multiplyFixed`, so
 * that `D = |y^n - a| + error(y^n) + error(a)`, in ulps, bounds the
 * distance of `y^n` from every argument in `a`'s interval; with `y^n =
 * a* (1 + ε)` that gives `|ε| <= D / (a - error(a))`, and for `|ε| <= 1/2`
 * the root is within `(4 |ε| / n) y` of `y`, since `|(1 + ε)^(-1/n) - 1| <=
 * 4 |ε| / n` there (the logarithm is within `2 |ε|` and the exponential
 * within twice its argument). The argument's own error thus enters the
 * same bound, and no separate derivative bound is needed. The result's
 * `bits` keep the argument's significant bits for a root of magnitude
 * `2^k` (D9).
 */
export function rootFixed(f: Fixed, degree: bigint): Fixed {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  checkPositive(f);
  if (degree === 1n) return f;
  if (degree === 2n) return sqrtFixed(f);
  // Reduce: a = m × 2^(k n), with m in [2^-n, 2^n) so that the root of m is
  // in [1/2, 2). Both directions are exact rebases: a large argument keeps
  // its bits and gains fraction bits, a small one shifts up.
  const k = Number(BigInt(exponentOf(f)) / degree);
  const shift = k * Number(degree);
  const m: Fixed =
    shift >= 0
      ? { ...f, bits: f.bits + shift }
      : {
          value: f.value << BigInt(-shift),
          error: f.error << BigInt(-shift),
          bits: f.bits,
        };
  // Work at enough fraction bits that m, which may be far below one, and
  // the powers of the iterate keep `bits` significant bits.
  const working = m.bits + Math.max(0, -exponentOf(m));
  const reduced = rebase(m, working);
  const y = newtonRoot(reduced, degree);
  const root = shiftFixed(verifiedRoot(y, reduced, degree), k);
  const bits = Math.max(0, f.bits - k);
  return root.bits > bits ? truncateFixed(root, bits) : root;
}

/**
 * Newton's iteration for the `n`-th root of `a`, at `a`'s bits, from a
 * guess through a double, until a step stops shrinking; the value alone,
 * to be verified.
 */
function newtonRoot(a: Fixed, n: bigint): bigint {
  const shift = BigInt(a.bits);
  const scaled = a.value << shift;
  let x = firstGuess(a, n);
  let previous: bigint | undefined;
  for (let i = 0; i < 1000; i++) {
    const power = powerValue(x, n - 1n, shift);
    if (power === 0n) throw new Error("Newton's power underflowed");
    const next = ((n - 1n) * x + scaled / power) / n;
    const delta = abs(next - x);
    x = next;
    if (delta <= 2n || (previous !== undefined && delta >= previous)) return x;
    previous = delta;
  }
  throw new Error("Newton's iteration did not converge");
}

/** `2^(log2(a) / n)` through doubles, as a fixed value at `a`'s bits. */
function firstGuess(a: Fixed, n: bigint): bigint {
  const length = bitLength(a.value);
  const top = Math.max(0, length - 53);
  const log2 = Math.log2(Number(a.value >> BigInt(top))) + top - a.bits;
  const guess = Math.pow(2, log2 / Number(n));
  // The guess lies in [1/2, 2): 52 bits of it as an integer, then placed.
  const mantissa = BigInt(Math.floor(guess * 2 ** 52));
  return a.bits >= 52
    ? mantissa << BigInt(a.bits - 52)
    : mantissa >> BigInt(52 - a.bits);
}

/** `x^e` at `shift` fraction bits, each product truncated; the value alone. */
function powerValue(x: bigint, e: bigint, shift: bigint): bigint {
  let result = 1n << shift;
  let base = x;
  for (let rest = e; rest > 0n; rest >>= 1n) {
    if (rest & 1n) result = (result * base) >> shift;
    if (rest > 1n) base = (base * base) >> shift;
  }
  return result;
}

/** `y` with the verified error of the `n`-th root of `a`, as `rootFixed`'s doc derives it. */
function verifiedRoot(y: bigint, a: Fixed, n: bigint): Fixed {
  const exact: Fixed = { value: y, error: 0n, bits: a.bits };
  let power: Fixed = { value: 1n << BigInt(a.bits), error: 0n, bits: a.bits };
  let base = exact;
  for (let rest = n; rest > 0n; rest >>= 1n) {
    if (rest & 1n) power = multiplyFixed(power, base);
    if (rest > 1n) base = multiplyFixed(base, base);
  }
  const distance = abs(power.value - a.value) + power.error + a.error;
  const least = a.value - a.error;
  if (2n * distance > least) {
    throw new Error("Newton's root is not within half of its argument");
  }
  return { ...exact, error: ceilDiv(4n * distance * y, n * least) };
}

/**
 * `f` at `bits` fraction bits, fewer than its own: the value shifted down
 * (toward minus infinity, by less than a new ulp) and the error converted
 * to the new ulps rounded up, with one added for the truncation, so that
 * the interval still contains the old one. Exported for the memo of
 * constants.ts, which holds a value at the ceiling and hands out fewer
 * bits of it, and for the routines beside this module.
 */
export function truncateFixed(f: Fixed, bits: number): Fixed {
  if (bits > f.bits) throw new RangeError("truncateFixed only removes bits");
  const down = BigInt(f.bits - bits);
  return { value: f.value >> down, error: ceilShift(f.error, down) + 1n, bits };
}

/** `floor(log2 |f|)` of the value of `f`, which must be nonzero. */
export function exponentOf(f: Fixed): number {
  if (f.value === 0n) throw new RangeError("Zero has no binary exponent");
  return bitLength(abs(f.value)) - 1 - f.bits;
}

function checkPositive(f: Fixed): void {
  if (f.value - f.error <= 0n) {
    throw new RangeError("A root takes an argument whose interval is positive");
  }
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
