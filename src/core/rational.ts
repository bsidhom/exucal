// The number type of the converter: an exact rational over `bigint`, with the
// arithmetic the evaluator needs, the one inexact operation (the n-th root),
// rounding to significant digits, and conversion to and from decimal text.
//
// Everything here is exact except where a `Precision` is taken, and the rules
// for when a value may lose precision are spelled out in ARCHITECTURE.md
// ("Precision and rounding"). In short: arithmetic never rounds, `root`
// truncates its result once to the precision it is given, and `format`
// rounds once more for display.
//
// Failures on values (dividing by zero, an even root of a negative number, a
// result too large to compute, text that is not a number) are returned as
// `Result`s. Violated preconditions (a zero denominator passed to `rational`,
// a precision that is not a positive integer) are programming errors and
// throw `RangeError`, as `1n / 0n` does.

import { err, ok, type Result } from "./result.ts";

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
 * their inputs (`pow`, `root`, and the exponent of a decimal literal) predict
 * the size of their result and return `tooLarge` instead of computing one
 * beyond this. Operations that grow their inputs by at most a constant factor
 * do not check, since an expression of bounded length can only apply a
 * bounded number of them.
 */
export const MAX_BITS = 1 << 16;

/**
 * The working precision the app uses for every inexact operation, in
 * significant decimal digits: far beyond any display precision, so that the
 * truncation errors of inexact intermediates stay out of the displayed
 * digits. See ARCHITECTURE.md.
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
// The inexact operation

/**
 * The `degree`-th root of `r`, where `degree >= 1`.
 *
 * If the root is rational (both numerator and denominator are perfect
 * powers) it is returned exactly, so `root(9/4, 2)` is exactly `3/2`.
 * Otherwise the result is the true root truncated toward zero to `precision`
 * significant digits: those digits are the exact leading digits of the root,
 * and the error is less than one unit in the last of them.
 *
 * An odd root of a negative number is the negated root of its magnitude; an
 * even one has no real value and fails with `negativeRadicand`.
 */
export function root(
  r: Rational,
  degree: bigint,
  precision: Precision,
): Result<Rational, RationalError> {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  checkPrecision(precision);
  if (degree === 1n || r.num === 0n) return ok(r);
  if (r.num < 0n && degree % 2n === 0n) {
    return err({ kind: "negativeRadicand", degree });
  }
  const negative = r.num < 0n;
  const num = abs(r.num);
  const den = r.den;

  const exactNum = perfectRoot(num, degree);
  const exactDen = perfectRoot(den, degree);
  if (exactNum !== undefined && exactDen !== undefined) {
    return ok({ num: negative ? -exactNum : exactNum, den: exactDen });
  }

  // Scale so that the truncated root has at least `precision` significant
  // digits: if 10^e <= |r| < 10^(e+1) then the root is at least
  // 10^floor(e / degree), so multiplying it by 10^k with
  // k = precision - 1 - floor(e / degree) puts it at or above 10^(precision-1).
  // floor(root(|r|) * 10^k) is the integer root of floor(|r| * 10^(k*degree)),
  // because for a non-negative y, floor(root(floor(y))) = floor(root(y)).
  const exponent = decimalExponent(r);
  const k = precision - 1 - Math.floor(exponent / Number(degree));
  let scaled: bigint;
  if (k >= 0) {
    const scaleDigits = BigInt(k) * degree;
    if (
      scaleDigits > BigInt(MAX_BITS) ||
      bitLength(num) + Number(scaleDigits) * BITS_PER_DIGIT > MAX_BITS
    ) {
      return err({ kind: "tooLarge" });
    }
    scaled = (num * 10n ** scaleDigits) / den;
  } else {
    // A root so large that fewer than `precision` digits of its integer
    // part are wanted. Its denominator is bounded by the (already existing)
    // numerator, so no size check is needed.
    scaled = num / (den * 10n ** (BigInt(-k) * degree));
  }
  const digits = integerRoot(scaled, degree);
  const value =
    k >= 0
      ? rational(digits, 10n ** BigInt(k))
      : rational(digits * 10n ** BigInt(-k));
  const truncated = truncate(value, precision);
  return ok(negative ? negate(truncated) : truncated);
}

/**
 * `r` raised to the rational power `exponent`: `pow` when the exponent is an
 * integer, and otherwise the `exponent.den`-th root of `r` to the power
 * `exponent.num`, computed as the root of the power so that the single
 * truncation happens last and the result carries `precision` true digits.
 */
export function powRational(
  r: Rational,
  exponent: Rational,
  precision: Precision,
): Result<Rational, RationalError> {
  if (exponent.den === 1n) return pow(r, exponent.num);
  if (r.num < 0n && exponent.den % 2n === 0n) {
    return err({ kind: "negativeRadicand", degree: exponent.den });
  }
  const power = pow(r, exponent.num);
  if (!power.ok) return power;
  return root(power.value, exponent.den, precision);
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

/** `r` truncated toward zero to `digits` significant digits. */
export function truncate(r: Rational, digits: Precision): Rational {
  return roundWith(r, digits, (num, den) => num / den);
}

/**
 * `r` rounded to the nearest value with `digits` significant digits, ties
 * away from zero (the `halfExpand` mode of `Intl.NumberFormat`, and the
 * rounding people expect from `0.125 → 0.13`). `equals(round(r, d), r)` says
 * whether `r` is displayed exactly at `d` digits.
 */
export function round(r: Rational, digits: Precision): Rational {
  return roundWith(r, digits, divideHalfAwayFromZero);
}

/**
 * Rescales `r` so that its `digits` leading digits form an integer, applies
 * `divide` (some rounding of a signed integer division by a positive one) and
 * scales back.
 */
function roundWith(
  r: Rational,
  digits: Precision,
  divide: (num: bigint, den: bigint) => bigint,
): Rational {
  checkPrecision(digits);
  if (r.num === 0n) return ZERO;
  const shift = digits - 1 - decimalExponent(r);
  if (shift >= 0) {
    const scale = 10n ** BigInt(shift);
    return rational(divide(r.num * scale, r.den), scale);
  }
  const scale = 10n ** BigInt(-shift);
  return rational(divide(r.num, r.den * scale) * scale);
}

/** `num / den` rounded to the nearest integer, ties away from zero; `den > 0`. */
function divideHalfAwayFromZero(num: bigint, den: bigint): bigint {
  const quotient = (2n * abs(num) + den) / (2n * den);
  return num < 0n ? -quotient : quotient;
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
 * Renders `r` rounded (by `round`) to `digits` significant digits, in the
 * style of C's `%g`: trailing zeros are dropped, and exponent notation is
 * used when the decimal exponent is below -4 or at least `digits`, with the
 * exponent written as JavaScript writes it (`1.5e+21`, `1e-7`).
 */
export function format(r: Rational, digits: Precision): string {
  checkPrecision(digits);
  if (r.num === 0n) return "0";
  let exponent = decimalExponent(r);
  const shift = digits - 1 - exponent;
  const num = abs(r.num);
  let mantissa =
    shift >= 0
      ? divideHalfAwayFromZero(num * 10n ** BigInt(shift), r.den)
      : divideHalfAwayFromZero(num, r.den * 10n ** BigInt(-shift));
  // Rounding can carry into a new leading digit (9.99 → 10.0).
  if (mantissa === 10n ** BigInt(digits)) {
    mantissa /= 10n;
    exponent += 1;
  }
  const text = mantissa.toString(); // exactly `digits` characters
  const sign = r.num < 0n ? "-" : "";
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

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** The number of bits in the non-negative `n` (0 for zero). */
function bitLength(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
}

/** The number of decimal digits in the non-negative `n` (1 for zero). */
function decimalDigits(n: bigint): number {
  return n.toString().length;
}

/**
 * floor(n^(1/degree)) for a non-negative `n`, by Newton's method from an
 * overestimate: the iterates decrease monotonically to the floor.
 */
function integerRoot(n: bigint, degree: bigint): bigint {
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
