// The midpoint's number type: a fraction times a power of ten, `mant ×
// 10^exp`, so that a value carries an exponent as a number rather than as
// digits and `1e999999999` is a value. docs/decimal.md is the design and
// docs/calculator-plan.md (D13, D16 and tasks 4.1 to 4.3) places it; it
// sits between the fraction (rational.ts, which stays the total fraction
// the dimensions and the `^` exponent need) and the ball (ball.ts, which
// takes it as the midpoint from 4.4).
//
// The form is canonical, so that equal values have equal representations
// and `equals` is structural: the mantissa is in lowest terms with its
// denominator coprime to ten and its numerator not divisible by ten unless
// zero, and zero is the zero fraction with exponent zero. The constructor
// strips the numerator's tens into the exponent and moves the
// denominator's tens, then its twos or its fives, out (`1/6` is `5/3 ×
// 10^-1`, `1/1024` is `5^10 × 10^-10`): a loop of small divisions on top
// of the lowest-terms invariant `rational` keeps, each constructor owning
// one rule, and the result is in lowest terms without a gcd, since the
// factors moved are coprime to what stays. The canonical form of a
// fraction is at most 2.33 times its size (`5^k` for a denominator `2^k`),
// a constant factor the range limit's reasoning allows; a kernel result,
// a dyadic of the working bits, never enters exactly, since 4.4 rounds it
// onto the decimal grid as it leaves the kernel.
//
// The exponent is bounded, `|exp| <= MAX_EXPONENT`, the study's `10^18`,
// so that a value can always be written; `scaled` checks it after
// normalizing and fails `tooLarge`, and the arithmetic (4.2) fails the
// same way wherever exponents combine. Nothing here forms a power of ten
// the exponent stands for except `toRational`, which takes the bits it
// may form and fails `tooLarge` beyond them: the decimal exponent of a
// value is the mantissa's plus `exp`, and a comparison is decided by the
// signs, by the decimal exponents, and, when those are equal, by an
// alignment whose shift is then bounded by the mantissas' own digit
// counts and never by the range limit, so `compare` is total. The binary
// magnitude a radius needs (`log2Bounds`, for radius.ts in 4.4) is a lower
// and an upper bound on `log2 |s|` within `2^-30`, from the bit lengths of
// the mantissa and the exponent times `log2 10` held as a 128-bit
// fraction, with no call into the kernel.
//
// The arithmetic (4.2) is the fraction's on the mantissas with the
// exponents combined and the result renormalized. A sum aligns the
// mantissas by `10^|Δexp|`, which costs `|Δexp| log2 10` bits and is exact,
// and fails `tooLarge` when that exceeds the limit given, the range limit:
// the exact sum exists and cannot be held (`1e999999999 + 1`), which is
// what the limit means; a product, a quotient and a power add, subtract
// and multiply exponents and fail `tooLarge` at the bound, a power's
// mantissa sized against the limit as the fraction's `pow` sizes it. So
// `add`, `subtract`, `multiply`, `divide`, `invert` and `pow` are
// `Result`s where the fraction's are total, and `negate` and `absolute`
// stay total.
//
// Failures on values are `Result`s with the fraction's error kinds; a
// violated precondition (the decimal exponent of zero) throws
// `RangeError`, as `rational` does.

import {
  ONE as ONE_FRACTION,
  ZERO as ZERO_FRACTION,
  add as addFractions,
  bitLength,
  compare as compareFractions,
  decimalExponent as decimalExponentOf,
  divide as divideFractions,
  invert as invertFraction,
  multiply as multiplyFractions,
  negate as negateFraction,
  pow as powFraction,
  sign as signOf,
  subtract as subtractFractions,
  type Rational,
  type RationalError,
} from "./rational.ts";
import { err, ok, type Result } from "./result.ts";

/** A number `mant × 10^exp`, in the canonical form the header states. */
export type Scaled = { readonly mant: Rational; readonly exp: bigint };

/** The failures a `Scaled` operation can report: the fraction's. */
export type ScaledError = RationalError;

/**
 * The bound on `|exp|`, `10^18`: generous and finite, so that a value's
 * decimal exponent can always be written (docs/calculator.md, feature 4).
 */
export const MAX_EXPONENT = 10n ** 18n;

export const ZERO: Scaled = { mant: ZERO_FRACTION, exp: 0n };
export const ONE: Scaled = { mant: ONE_FRACTION, exp: 0n };

// ---------------------------------------------------------------------------
// Construction and inspection

/**
 * `mant × 10^exp` in canonical form, or `tooLarge` when the normalized
 * exponent exceeds `MAX_EXPONENT` in magnitude.
 */
export function scaled(
  mant: Rational,
  exp: bigint,
): Result<Scaled, ScaledError> {
  const s = normalize(mant, exp);
  if (s.exp > MAX_EXPONENT || s.exp < -MAX_EXPONENT) {
    return err({ kind: "tooLarge" });
  }
  return ok(s);
}

/** The fraction `r` as a `Scaled`: its powers of ten moved into the exponent, which the fraction's size bounds far below the limit. */
export function fromRational(r: Rational): Scaled {
  return normalize(r, 0n);
}

/**
 * The exact fraction `s` stands for, when forming its power of ten stays
 * within `limit` bits (the range limit); `tooLarge` otherwise.
 */
export function toRational(
  s: Scaled,
  limit: number,
): Result<Rational, ScaledError> {
  const { num, den } = s.mant;
  if (s.exp === 0n) return ok(s.mant);
  const magnitude = abs(s.exp);
  if (
    magnitude > BigInt(limit) ||
    (Number(magnitude) + decimalDigits(abs(num))) * BITS_PER_DIGIT > limit
  ) {
    return err({ kind: "tooLarge" });
  }
  const power = 10n ** magnitude;
  // Multiplying the numerator keeps lowest terms, the denominator being
  // coprime to ten; multiplying the denominator cancels against the twos
  // or fives the numerator may hold.
  if (s.exp > 0n) return ok({ num: num * power, den });
  const twos = min(trailingZeros(num), magnitude);
  const fives = min(fivesIn(num, magnitude), magnitude);
  const g = (1n << twos) * 5n ** fives;
  return ok({ num: num / g, den: (den * power) / g });
}

export function isZero(s: Scaled): boolean {
  return s.mant.num === 0n;
}

/** Whether `s` is an integer: a mantissa of denominator one and an exponent at or above zero. */
export function isInteger(s: Scaled): boolean {
  return s.mant.den === 1n && s.exp >= 0n;
}

/** The sign of `s`: -1, 0 or 1. */
export function sign(s: Scaled): -1 | 0 | 1 {
  return signOf(s.mant);
}

/** Structural equality, which the canonical form makes equality of values. */
export function equals(a: Scaled, b: Scaled): boolean {
  return (
    a.exp === b.exp && a.mant.num === b.mant.num && a.mant.den === b.mant.den
  );
}

/**
 * The decimal exponent of `s`, which must be non-zero: the integer `e`
 * with `10^e <= |s| < 10^(e+1)`, the mantissa's plus `exp`, exact for any
 * exponent and formed without any power of ten.
 */
export function decimalExponent(s: Scaled): bigint {
  return BigInt(decimalExponentOf(s.mant)) + s.exp;
}

/**
 * Compares `a` with `b`: -1, 0 or 1. Decided by the signs, then by the
 * decimal exponents, and, when those are equal, by aligning the mantissas
 * by the difference of the exponents, which is then at most the
 * mantissas' digit counts, so nothing large is ever formed.
 */
export function compare(a: Scaled, b: Scaled): -1 | 0 | 1 {
  const sa = sign(a);
  const sb = sign(b);
  if (sa !== sb) return sa < sb ? -1 : 1;
  if (sa === 0) return 0;
  const da = decimalExponent(a);
  const db = decimalExponent(b);
  // A larger decimal exponent is a larger magnitude, which the sign orders.
  if (da !== db) return da < db === sa > 0 ? -1 : 1;
  const shift = a.exp - b.exp;
  const left = shift > 0n ? timesPowerOfTen(a.mant, shift) : a.mant;
  const right = shift < 0n ? timesPowerOfTen(b.mant, -shift) : b.mant;
  return compareFractions(left, right);
}

// ---------------------------------------------------------------------------
// Arithmetic

/** `-s`: the mantissa negated, the exponent kept; canonical as `s` is. */
export function negate(s: Scaled): Scaled {
  return isZero(s) ? s : { mant: negateFraction(s.mant), exp: s.exp };
}

/** `|s|`. */
export function absolute(s: Scaled): Scaled {
  return s.mant.num < 0n ? negate(s) : s;
}

/**
 * `a + b`, exactly, the mantissas aligned by `10^|Δexp|`; `tooLarge` when
 * the alignment would exceed `limit` bits, or the sum's exponent the bound.
 */
export function add(
  a: Scaled,
  b: Scaled,
  limit: number,
): Result<Scaled, ScaledError> {
  return combine(a, b, limit, addFractions);
}

/** `a - b`, exactly, as `add` aligns and fails. */
export function subtract(
  a: Scaled,
  b: Scaled,
  limit: number,
): Result<Scaled, ScaledError> {
  return combine(a, b, limit, subtractFractions);
}

/** `op` over the mantissas of `a` and `b` brought to the lesser exponent. */
function combine(
  a: Scaled,
  b: Scaled,
  limit: number,
  op: (x: Rational, y: Rational) => Rational,
): Result<Scaled, ScaledError> {
  if (isZero(a)) return scaled(op(ZERO_FRACTION, b.mant), b.exp);
  if (isZero(b)) return scaled(op(a.mant, ZERO_FRACTION), a.exp);
  const shift = abs(a.exp - b.exp);
  if (shift > BigInt(limit) || Number(shift) * BITS_PER_DIGIT > limit) {
    return err({ kind: "tooLarge" });
  }
  const exp = a.exp < b.exp ? a.exp : b.exp;
  const left = a.exp > exp ? timesPowerOfTen(a.mant, shift) : a.mant;
  const right = b.exp > exp ? timesPowerOfTen(b.mant, shift) : b.mant;
  return scaled(op(left, right), exp);
}

/** `a × b`, exactly: the mantissas multiplied, the exponents added; `tooLarge` at the bound. */
export function multiply(a: Scaled, b: Scaled): Result<Scaled, ScaledError> {
  if (isZero(a) || isZero(b)) return ok(ZERO);
  return scaled(multiplyFractions(a.mant, b.mant), a.exp + b.exp);
}

/** `a / b`, exactly: the mantissas divided, the exponents subtracted; fails on a zero `b` and at the bound. */
export function divide(a: Scaled, b: Scaled): Result<Scaled, ScaledError> {
  const mant = divideFractions(a.mant, b.mant);
  if (!mant.ok) return mant;
  if (isZero(a)) return ok(ZERO);
  return scaled(mant.value, a.exp - b.exp);
}

/** The reciprocal of `s`; fails on zero and at the bound. */
export function invert(s: Scaled): Result<Scaled, ScaledError> {
  const mant = invertFraction(s.mant);
  return mant.ok ? scaled(mant.value, -s.exp) : mant;
}

/**
 * `s` raised to the integer power `n`, exactly: the exponent times `n`,
 * checked against the bound first, and the mantissa's power as the
 * fraction's `pow` sizes it against `limit` bits, so that `10^1442695` is
 * `1 × 10^1442695` where `2^1442695` is `tooLarge` by its mantissa. A
 * negative `n` inverts, so zero to a negative power is a division by
 * zero; `s^0` is one for any `s`.
 */
export function pow(
  s: Scaled,
  n: bigint,
  limit: number,
): Result<Scaled, ScaledError> {
  if (n === 0n) return ok(ONE);
  if (isZero(s)) {
    return n < 0n ? err({ kind: "divisionByZero" }) : ok(ZERO);
  }
  if (abs(s.exp) * abs(n) > MAX_EXPONENT) return err({ kind: "tooLarge" });
  const mant = powFraction(s.mant, n, limit);
  return mant.ok ? scaled(mant.value, s.exp * n) : mant;
}

// ---------------------------------------------------------------------------
// The binary magnitude

/** A binary logarithm as an integer part and a fraction in `[0, 1)`. */
export type Log2 = { readonly int: bigint; readonly frac: number };

/** The margin `log2Bounds` adds on each side: `2^-31`, above the error of the doubles it works through. */
const LOG2_MARGIN = 2 ** -31;

/**
 * `floor(log2 10 × 2^128)`: `log2 10` as a 128-bit fraction, exact enough
 * that an exponent at the bound times it is within `2^-68` of the truth.
 */
const LOG2_10_SCALED = 1130393554869435518674010122299176348979n;

/**
 * A lower and an upper bound on `log2 |s|`, for a non-zero `s`, within
 * `2^-30` of each other and of the truth: `log2` of the mantissa's
 * numerator and denominator through their top bits and a double, and the
 * exponent times `log2 10` through the 128-bit fraction, with `LOG2_MARGIN`
 * taken off and added on. What a radius at or above, or below, `|s|`
 * needs (4.4).
 */
export function log2Bounds(s: Scaled): { lower: Log2; upper: Log2 } {
  if (s.mant.num === 0n) throw new RangeError("Zero has no binary magnitude");
  const m = log2Of(abs(s.mant.num)) - log2Of(s.mant.den);
  const product = s.exp * LOG2_10_SCALED;
  const int = product >> 128n;
  const rest = Number(product - (int << 128n)) / 2 ** 128;
  const whole = Math.floor(m);
  const frac = m - whole + rest;
  return {
    lower: normalizedLog2(int + BigInt(whole), frac - LOG2_MARGIN),
    upper: normalizedLog2(int + BigInt(whole), frac + LOG2_MARGIN),
  };
}

/** `int + frac` with `frac` brought into `[0, 1)`. */
function normalizedLog2(int: bigint, frac: number): Log2 {
  const carry = Math.floor(frac);
  return { int: int + BigInt(carry), frac: frac - carry };
}

/** `log2` of the positive `n`, through its top 53 bits, to a double's accuracy. */
function log2Of(n: bigint): number {
  const top = Math.max(0, bitLength(n) - 53);
  return Math.log2(Number(n >> BigInt(top))) + top;
}

// ---------------------------------------------------------------------------
// Helpers

/** log2(10), rounded up: the bits a decimal digit can need. */
const BITS_PER_DIGIT = 3.33;

/**
 * `mant × 10^exp` in canonical form, unchecked against the bound: the
 * denominator's tens, then its twos or its fives, moved out, and the
 * numerator's tens moved into the exponent, as the header says.
 */
function normalize(mant: Rational, exp: bigint): Scaled {
  if (mant.num === 0n) return ZERO;
  let num = abs(mant.num);
  let den = mant.den;
  let e = exp;
  const denTens = tensIn(den);
  den = den / 10n ** denTens;
  e -= denTens;
  const denTwos = trailingZeros(den);
  if (denTwos > 0n) {
    den >>= denTwos;
    num *= 5n ** denTwos;
    e -= denTwos;
  } else {
    // A power of five has more than two bits per factor.
    const denFives = fivesIn(den, BigInt(bitLength(den)) / 2n);
    if (denFives > 0n) {
      den /= 5n ** denFives;
      num <<= denFives;
      e -= denFives;
    }
  }
  const numTens = tensIn(num);
  num = num / 10n ** numTens;
  e += numTens;
  return { mant: { num: mant.num < 0n ? -num : num, den }, exp: e };
}

/** `r × 10^k` for `k > 0`, not reduced: for a comparison, which needs no lowest terms. */
function timesPowerOfTen(r: Rational, k: bigint): Rational {
  return { num: r.num * 10n ** k, den: r.den };
}

/** The power of ten dividing the positive `n`: the lesser of its twos and its fives. */
function tensIn(n: bigint): bigint {
  const twos = trailingZeros(n);
  return twos === 0n ? 0n : min(twos, fivesIn(n, twos));
}

/**
 * The power of five dividing the positive `n`, or `most` if that is
 * smaller: the count is read off in binary by dividing by `5^(2^k)` from
 * the largest such power worth trying down to five, each once, which is a
 * logarithmic number of divisions where one division per factor would be
 * a quadratic loop on a mantissa full of tens (`10^300000` took a minute).
 * With the top power chosen so that `2^(k+1)` exceeds `most`, the greedy
 * count is exact below `most` and at least `most` otherwise.
 */
function fivesIn(n: bigint, most: bigint): bigint {
  if (most <= 0n || n % 5n !== 0n) return 0n;
  const powers = [5n];
  while (1n << BigInt(powers.length) <= most) {
    const next = powers[powers.length - 1]! ** 2n;
    if (bitLength(next) > bitLength(n)) break;
    powers.push(next);
  }
  let count = 0n;
  let rest = n;
  for (let k = powers.length - 1; k >= 0; k--) {
    if (rest % powers[k]! === 0n) {
      rest /= powers[k]!;
      count += 1n << BigInt(k);
    }
  }
  return min(count, most);
}

/** The number of trailing zero bits of the positive `n`. */
function trailingZeros(n: bigint): bigint {
  return BigInt(bitLength(n & -n) - 1);
}

/** The number of decimal digits in the non-negative `n` (1 for zero). */
function decimalDigits(n: bigint): number {
  return n.toString().length;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
