// The number type of the converter: an exact rational over `bigint`, with the
// arithmetic the evaluator needs, the exact case of the n-th root, rounding
// to significant digits, and conversion to and from decimal text.
//
// Everything here is exact, and the rules for when a value may lose
// precision are spelled out in ARCHITECTURE.md ("Precision and rounding").
// In short: arithmetic never rounds; the digits of an irrational root are
// the kernel's business (fixed.ts, through `rootBall` of ball.ts), and
// `exactRoot` here answers only whether a root is rational; and `roundTo`
// and `format` round once, to the digits and in the `RoundingMode` they are
// given, for display. Every rounding here is a scaling to an integer
// division and back, and the division is `divideRounded` of rounding.ts,
// the one place a mode is interpreted.
//
// Failures on values (dividing by zero, an even root of a negative number, a
// result too large to compute, text that is not a number) are returned as
// `Result`s. Violated preconditions (a zero denominator passed to `rational`,
// a precision that is not a positive integer) are programming errors and
// throw `RangeError`, as `1n / 0n` does.

import { err, ok, type Result } from "./result.ts";
import { divideRounded, type RoundingMode } from "./rounding.ts";

/** An exact rational number. Invariant: `den > 0` and `gcd(num, den) = 1`. */
export type Rational = { readonly num: bigint; readonly den: bigint };

/** A count of significant decimal digits: a positive integer. */
export type Precision = number;

export type RationalError =
  /** Division by zero, including `0` raised to a negative power. */
  | { readonly kind: "divisionByZero" }
  /** An even root of a negative number, which has no real value. */
  | { readonly kind: "negativeRadicand"; readonly degree: bigint }
  /** The result would exceed `MAX_BITS` and was not computed. */
  | { readonly kind: "tooLarge" }
  /** The text is not a decimal number. */
  | { readonly kind: "invalidNumber" };

/**
 * The size limit on numerators and denominators, in bits (about 19,700
 * decimal digits). Operations whose result can be exponentially larger than
 * their inputs (`pow` and the exponent of a decimal literal) predict the
 * size of their result and return `tooLarge` instead of computing one
 * beyond this. Operations that grow their inputs by at most a constant factor
 * do not check, since an expression of bounded length can only apply a
 * bounded number of them.
 */
export const MAX_BITS = 1 << 16;

/**
 * The fixed working precision the app computed at before the number
 * context existed, in significant decimal digits, and still the floor of
 * the pipeline's working precision and the precision the table is built
 * at: far beyond the digits shown by default, so that the rounding
 * errors of inexact intermediates stay out of them. See ARCHITECTURE.md
 * ("Working precision and the context").
 */
export const DEFAULT_PRECISION: Precision = 40;

export const ZERO: Rational = { num: 0n, den: 1n };
export const ONE: Rational = { num: 1n, den: 1n };

// ---------------------------------------------------------------------------
// Construction and inspection

/**
 * Makes the rational `num / den` in lowest terms with a positive denominator.
 * Throws `RangeError` if `den` is zero: that is a bug in the caller, not a
 * value that can fail. Division of values goes through `divide`.
 */
export function rational(num: bigint, den: bigint = 1n): Rational {
  if (den === 0n) {
    throw new RangeError("Rational denominator must not be zero");
  }
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcd(abs(num), den);
  return g === 1n ? { num, den } : { num: num / g, den: den / g };
}

export function isZero(r: Rational): boolean {
  return r.num === 0n;
}

export function isInteger(r: Rational): boolean {
  return r.den === 1n;
}

/** The sign of `r`: -1, 0 or 1. */
export function sign(r: Rational): -1 | 0 | 1 {
  return r.num < 0n ? -1 : r.num > 0n ? 1 : 0;
}

/** Compares `a` with `b`: -1 if `a < b`, 0 if equal, 1 if `a > b`. */
export function compare(a: Rational, b: Rational): -1 | 0 | 1 {
  const left = a.num * b.den;
  const right = b.num * a.den;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function equals(a: Rational, b: Rational): boolean {
  return a.num === b.num && a.den === b.den;
}

/** Renders `r` as `num/den` (or just `num` for an integer), for tests and debugging. */
export function toFraction(r: Rational): string {
  return r.den === 1n ? `${r.num}` : `${r.num}/${r.den}`;
}

// ---------------------------------------------------------------------------
// Exact arithmetic

export function negate(r: Rational): Rational {
  return { num: -r.num, den: r.den };
}

export function absolute(r: Rational): Rational {
  return r.num < 0n ? negate(r) : r;
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function subtract(a: Rational, b: Rational): Rational {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}

export function multiply(a: Rational, b: Rational): Rational {
  return rational(a.num * b.num, a.den * b.den);
}

/**
 * `r × 2^k`, exactly, for an integer `k` of either sign, without a gcd: the
 * power of two cancels against the trailing zero bits of the numerator or
 * the denominator, whichever it divides, and shifts the other. `rootBall`
 * scales its argument by this before the kernel sees it.
 */
export function scaleByPowerOfTwo(r: Rational, k: bigint): Rational {
  if (k === 0n || r.num === 0n) return r;
  if (k > 0n) {
    const cancel = min(k, trailingZeros(r.den));
    return { num: r.num << (k - cancel), den: r.den >> cancel };
  }
  const cancel = min(-k, trailingZeros(r.num));
  return { num: r.num >> cancel, den: r.den << (-k - cancel) };
}

/** The reciprocal of `r`; fails if `r` is zero. */
export function invert(r: Rational): Result<Rational, RationalError> {
  if (r.num === 0n) return err({ kind: "divisionByZero" });
  return ok(rational(r.den, r.num));
}

/** `a / b`; fails if `b` is zero. */
export function divide(
  a: Rational,
  b: Rational,
): Result<Rational, RationalError> {
  if (b.num === 0n) return err({ kind: "divisionByZero" });
  return ok(rational(a.num * b.den, a.den * b.num));
}

/**
 * `r` raised to the integer power `n`, exactly. A negative `n` inverts, so
 * `0` to a negative power is a division by zero. The result can be `|n|`
 * times as large as `r`, so it is checked against `MAX_BITS` first.
 */
export function pow(r: Rational, n: bigint): Result<Rational, RationalError> {
  if (n === 0n) return ok(ONE);
  if (r.num === 0n) {
    return n < 0n ? err({ kind: "divisionByZero" }) : ok(ZERO);
  }
  if (r.den === 1n && (r.num === 1n || r.num === -1n)) {
    return ok(r.num === 1n || n % 2n === 0n ? ONE : r);
  }
  const magnitude = abs(n);
  const bits = Math.max(bitLength(abs(r.num)), bitLength(r.den));
  if (magnitude > BigInt(MAX_BITS) || Number(magnitude) * bits > MAX_BITS) {
    return err({ kind: "tooLarge" });
  }
  const num = r.num ** magnitude;
  const den = r.den ** magnitude;
  // Powers of a reduced fraction are reduced, so no gcd is needed.
  return ok(n > 0n ? { num, den } : rational(den, num));
}

// ---------------------------------------------------------------------------
// The exact root

/**
 * The exact `degree`-th root of `r`, where `degree >= 1`: the rational root
 * when both numerator and denominator are perfect powers (`exactRoot(9/4,
 * 2)` is `3/2`), and `undefined` when the root is irrational. A root of
 * degree one is `r` itself, whatever the value. An odd root of a negative
 * number is the negated root of its magnitude; an even one has no real
 * value and fails with `negativeRadicand`.
 */
export function exactRoot(
  r: Rational,
  degree: bigint,
): Result<Rational | undefined, RationalError> {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  if (degree === 1n || r.num === 0n) return ok(r);
  if (r.num < 0n && degree % 2n === 0n) {
    return err({ kind: "negativeRadicand", degree });
  }
  const num = perfectRoot(abs(r.num), degree);
  const den = perfectRoot(r.den, degree);
  if (num === undefined || den === undefined) return ok(undefined);
  return ok({ num: r.num < 0n ? -num : num, den });
}

// ---------------------------------------------------------------------------
// Rounding to significant digits

/**
 * The decimal exponent of `r`, which must be non-zero: the integer `e` with
 * `10^e <= |r| < 10^(e+1)`, i.e. the position of its leading digit.
 */
export function decimalExponent(r: Rational): number {
  if (r.num === 0n) throw new RangeError("Zero has no decimal exponent");
  const num = abs(r.num);
  const den = r.den;
  // With d = digits(num) - digits(den), |r| lies in (10^(d-1), 10^(d+1)), so
  // the exponent is d or d - 1, depending on whether |r| >= 10^d.
  const d = decimalDigits(num) - decimalDigits(den);
  const atLeast =
    d >= 0 ? num >= den * 10n ** BigInt(d) : num * 10n ** BigInt(-d) >= den;
  return atLeast ? d : d - 1;
}

/** `r` truncated toward zero to an integer: `7/2` is `3` and `-7/2` is `-3`. */
export function trunc(r: Rational): Rational {
  return isInteger(r) ? r : rational(r.num / r.den);
}

/**
 * `r` rounded to `digits` significant digits in `mode`: `roundTo(r, 3,
 * "halfAwayFromZero")` is the rounding people expect from `3.14159 → 3.14`
 * and `0.125 → 0.13`, and `roundTo(r, 3, "towardZero")` the truncation
 * `root` applies. `equals(roundTo(r, d, mode), r)` says whether `r` is
 * displayed exactly at `d` digits, in any mode: a value with `d` or fewer
 * significant digits is its own rounding, and no other value is.
 */
export function roundTo(
  r: Rational,
  digits: Precision,
  mode: RoundingMode,
): Rational {
  checkPrecision(digits);
  if (r.num === 0n) return ZERO;
  const shift = digits - 1 - decimalExponent(r);
  if (shift >= 0) {
    const scale = 10n ** BigInt(shift);
    return rational(divideRounded(r.num * scale, r.den, mode), scale);
  }
  const scale = 10n ** BigInt(-shift);
  return rational(divideRounded(r.num, r.den * scale, mode) * scale);
}

// ---------------------------------------------------------------------------
// Decimal text

const DECIMAL = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

/**
 * Parses a decimal literal exactly: an optional sign, digits with an
 * optional fraction (`12`, `1.5`, `.5`, `5.`) and an optional exponent
 * (`1.5e-3` is `3/2000`). Anything else, including surrounding whitespace,
 * is `invalidNumber`; an exponent that would make the number larger than
 * `MAX_BITS` is `tooLarge`.
 */
export function parseDecimal(text: string): Result<Rational, RationalError> {
  const match = DECIMAL.exec(text);
  if (match === null) return err({ kind: "invalidNumber" });
  const [, signText, integerPart = "", fractionPart = "", bareFraction = ""] =
    match;
  const fraction = fractionPart || bareFraction;
  const exponent = match[5] === undefined ? 0n : BigInt(match[5]);
  // The value is (integer digits ++ fraction digits) * 10^(exponent - #fraction).
  const mantissa = BigInt(integerPart + fraction);
  const shift = exponent - BigInt(fraction.length);
  const magnitude = abs(shift);
  if (
    magnitude > BigInt(MAX_BITS) ||
    (Number(magnitude) + decimalDigits(mantissa)) * BITS_PER_DIGIT > MAX_BITS
  ) {
    return err({ kind: "tooLarge" });
  }
  const signed = signText === "-" ? -mantissa : mantissa;
  return ok(
    shift >= 0n
      ? rational(signed * 10n ** shift)
      : rational(signed, 10n ** -shift),
  );
}

/**
 * Renders `r` rounded (as `roundTo` rounds, in `mode`) to `digits`
 * significant digits, in the style of C's `%g`: trailing zeros are dropped,
 * and exponent notation is used when the decimal exponent is below -4 or at
 * least `digits`, with the exponent written as JavaScript writes it
 * (`1.5e+21`, `1e-7`).
 */
export function format(
  r: Rational,
  digits: Precision,
  mode: RoundingMode,
): string {
  checkPrecision(digits);
  if (r.num === 0n) return "0";
  let exponent = decimalExponent(r);
  const shift = digits - 1 - exponent;
  // The signed numerator is rounded, since the directed modes tell the sign
  // apart (`-9.99` at two digits is `-9.9` under `ceiling` and `-10` under
  // `floor`), and the sign is taken from the result. Its magnitude has
  // exactly `digits` digits: the scaled value is at least `10^(digits-1)`
  // in magnitude, and every mode keeps it at or above that.
  const signed = divideRounded(
    shift >= 0 ? r.num * 10n ** BigInt(shift) : r.num,
    shift >= 0 ? r.den : r.den * 10n ** BigInt(-shift),
    mode,
  );
  let mantissa = abs(signed);
  // Rounding can carry into a new leading digit (9.99 → 10.0), in any mode
  // that rounds the magnitude up.
  if (mantissa === 10n ** BigInt(digits)) {
    mantissa /= 10n;
    exponent += 1;
  }
  const text = mantissa.toString(); // exactly `digits` characters
  const sign = signed < 0n ? "-" : "";
  if (exponent < -4 || exponent >= digits) {
    const rest = trimZeros(text.slice(1));
    const exponentText = exponent < 0 ? `e-${-exponent}` : `e+${exponent}`;
    return `${sign}${text[0]}${rest ? `.${rest}` : ""}${exponentText}`;
  }
  if (exponent >= 0) {
    const integerPart = text.slice(0, exponent + 1);
    const fractionPart = trimZeros(text.slice(exponent + 1));
    return `${sign}${integerPart}${fractionPart ? `.${fractionPart}` : ""}`;
  }
  return `${sign}0.${"0".repeat(-exponent - 1)}${trimZeros(text)}`;
}

function trimZeros(digits: string): string {
  return digits.replace(/0+$/, "");
}

// ---------------------------------------------------------------------------
// bigint helpers

/** log2(10), rounded up: the bits a decimal digit can need. */
const BITS_PER_DIGIT = 3.33;

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/** The number of trailing zero bits of the nonzero `n`. */
function trailingZeros(n: bigint): bigint {
  return BigInt(bitLength(n & -n) - 1);
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * The number of bits in the non-negative `n` (0 for zero). Exported for
 * the kernel (fixed.ts), which sizes and rebases its values by it.
 */
export function bitLength(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
}

/** The number of decimal digits in the non-negative `n` (1 for zero). */
function decimalDigits(n: bigint): number {
  return n.toString().length;
}

/**
 * floor(n^(1/degree)) for a non-negative `n`, by Newton's method from an
 * overestimate: the iterates decrease monotonically to the floor. Exported
 * for the kernel's square root (fixed.ts), which takes it of the argument
 * scaled to an integer; `exactRoot` uses it here to detect a perfect power.
 */
export function integerRoot(n: bigint, degree: bigint): bigint {
  if (n < 2n || degree === 1n) return n;
  const bits = bitLength(n);
  // n < 2^bits <= 2^degree, so the root is below 2 (and the Newton step
  // below would raise 2 to a huge power).
  if (BigInt(bits) <= degree) return 1n;
  let x = 1n << BigInt(Math.ceil(bits / Number(degree)));
  for (;;) {
    const y = ((degree - 1n) * x + n / x ** (degree - 1n)) / degree;
    if (y >= x) return x;
    x = y;
  }
}

/** The exact `degree`-th root of the non-negative `n`, if `n` is a perfect power. */
function perfectRoot(n: bigint, degree: bigint): bigint | undefined {
  const r = integerRoot(n, degree);
  // For r <= 1 the power is r itself; checking that way also avoids raising
  // 1 to a huge degree.
  const isExact = r <= 1n ? r === n : r ** degree === n;
  return isExact ? r : undefined;
}

function checkPrecision(precision: Precision): void {
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
}
