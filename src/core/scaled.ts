// The midpoint's number type: a fraction times a power of ten, `significand ×
// 10^exp`, so that a value carries an exponent as a number rather than as
// digits and `1e999999999` is a value. docs/decimal.md is the design and
// docs/calculator-plan.md (D13, D16 and tasks 4.1 to 4.4) places it; it
// sits between the fraction (rational.ts, which stays the total fraction
// the dimensions and the `^` exponent need) and the ball (ball.ts, whose
// midpoint it is).
//
// The form is canonical, so that equal values have equal representations
// and `equals` is structural: the significand is in lowest terms with its
// denominator coprime to ten and its numerator not divisible by ten unless
// zero, and zero is the zero fraction with exponent zero. The constructor
// strips the numerator's tens into the exponent and moves the
// denominator's tens, then its twos or its fives, out (`1/6` is `5/3 ×
// 10^-1`, `1/1024` is `5^10 × 10^-10`): a loop of small divisions on top
// of the lowest-terms invariant `rational` keeps, each constructor owning
// one rule, and the result is in lowest terms without a gcd, since the
// factors moved are coprime to what stays. The canonical form of a
// fraction is at most 2.33 times its size (`5^k` for a denominator `2^k`),
// and the canonical form is what the significand limit measures (D16, D19:
// `significandWithin`), since it is what is stored and multiplied; a kernel result,
// a dyadic of the working bits, never enters exactly, since the boundary
// rounds it onto the decimal grid as it leaves the kernel (fixed.ts).
//
// The exponent is bounded, the study's `10^18`, so that a value can
// always be written: a value is within the bound when its decimal
// exponent, `floor(log10 |v|)`, the exponent the display writes, lies
// within `±MAX_EXPONENT` (D17), and zero is within at any exponent.
// `scaled` checks it after normalizing and fails `overflow` above it or
// `underflow` below it, and the arithmetic (4.2) fails the same way
// wherever exponents combine. The canonical `exp` itself may then pass
// `±10^18` by up to the significand's digits, the denominator's digits above
// the bound and the numerator's below, which nothing needs it not to;
// before the plan's H.13 the check was on `exp`, so that `1e-10^18 / 7`,
// past the bound, was held as `1/7 × 10^-(10^18)` and `1e10^18 / 3 * 10`,
// within it, was refused as `1/3 × 10^(10^18 + 1)`. The check is cheap:
// the decimal exponent is computed only when `exp` lies within
// `BOUND_BAND` of the bound, which is more than the digits of any
// significand, so the common case is one comparison. These are this
// module's own failures, since only a value with an exponent can pass
// the bound; the fraction's `tooLarge` is the significand limit's, and a
// `Scaled` operation reports it unchanged. Nothing here
// forms a power of ten the exponent stands for except `toRational`, which
// takes the bits it may form and fails `tooLarge` beyond them: the
// decimal exponent of a value is the significand's plus `exp`, and a
// comparison is decided by the signs, by the decimal exponents, and, when
// those are equal, by an alignment whose shift is then bounded by the
// significands' own digit counts and never by the significand limit, so `compare`
// is total. The binary magnitude a radius needs (`log2Bounds`, for
// radius.ts) is a lower and an upper bound on `log2 |s|` within `2^-30`,
// from the bit lengths of the significand and the exponent times `log2 10`
// held as a 128-bit fraction, with no call into the kernel;
// `decimalExponentOfLog2` and `oneDigitAbove` go the other way, from a
// binary logarithm to a decimal exponent and to a one-digit value above
// it, for the certification and the display of a radius that cannot be
// formed. The digit count of an integer (`decimalDigits`) and the powers
// of ten (`powerOfTen`, memoized) are here for the boundary too, since
// `toString` is an order slower at the ceiling's sizes.
//
// The arithmetic (4.2) is the fraction's on the significands with the
// exponents combined and the result renormalized. A sum aligns the
// significands by `10^|Δexp|`, which costs `|Δexp| log2 10` bits and is exact,
// and fails `tooLarge` when that exceeds the limit given, the significand limit:
// the exact sum exists and cannot be held (`1e999999999 + 1`), which is
// what the limit means; a product, a quotient and a power add, subtract
// and multiply exponents and fail at the bound, a power's significand sized
// against the limit as the fraction's `pow` sizes it. So `add`,
// `subtract`, `multiply`, `divide`, `invert` and `pow` are `Result`s
// where the fraction's are total, and `negate` and `absolute` stay total.
// A power refused is reported by its decimal exponent (`powerRefusal`),
// so that one the significand limit refuses is reported at the bound when the
// bound would refuse it too.
//
// The decimal representation (4.3) lives here, moved from rational.ts:
// `parseDecimal` reads a literal exactly with its exponent kept lazily,
// the significand checked against `MAX_SIGNIFICAND_LIMIT_BITS` and the value against the
// bound by the constructor, so that `1e999999999` parses and so does
// `0.001e1000000000000000003`, whose value is `1e1000000000000000000`
// (issue #50); rounding to significant digits
// commutes with the power of ten, so `roundTo` and `format` act on the
// significand alone, as the fraction's did, and add `exp` to the exponent,
// and a value of any exponent is rounded and written with nothing formed;
// every rounding is a scaling to an integer division and back, the
// division being `divideRounded` of rounding.ts, the one place a mode is
// interpreted. `trunc` and `exactRoot` take the bits they may form a power
// of ten within: an integer part or a root's remainder that cannot be
// formed is `undefined`, no truncation and no exact root, for the caller
// to take another route.
//
// Failures on values are `Result`s with the fraction's error kinds and
// the bound's two; a violated precondition (the decimal exponent of zero,
// a precision that is not a positive integer, a root of degree below one)
// throws `RangeError`, as `rational` does.

import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  ONE as ONE_FRACTION,
  ZERO as ZERO_FRACTION,
  add as addFractions,
  bitLength,
  compare as compareFractions,
  divide as divideFractions,
  exactRoot as exactRootOfFraction,
  invert as invertFraction,
  multiply as multiplyFractions,
  negate as negateFraction,
  pow as powFraction,
  sign as signOf,
  subtract as subtractFractions,
  trunc as truncFraction,
  type Rational,
  type RationalError,
} from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import {
  checkPrecision,
  divideRounded,
  type Precision,
  type RoundingMode,
} from "./rounding.ts";

/** A number `significand × 10^exp`, in the canonical form the header states. */
export type Scaled = { readonly significand: Rational; readonly exp: bigint };

/**
 * The failures a `Scaled` operation can report: the fraction's, whose
 * `tooLarge` is a result past the significand limit (rational.ts), and the
 * exponent bound's, which only a value with an exponent can pass.
 */
export type ScaledError =
  | RationalError
  /** The result's decimal exponent would pass `MAX_EXPONENT`: it is too large to hold. */
  | { readonly kind: "overflow" }
  /** The result's decimal exponent would fall below `-MAX_EXPONENT`: it is nonzero and too small to hold. */
  | { readonly kind: "underflow" };

/**
 * A refusal: a result the limits keep from being computed, past the range
 * limit (`tooLarge`) or the exponent bound (`overflow`, `underflow`).
 */
export type Refusal = Extract<
  ScaledError,
  { readonly kind: "tooLarge" | "overflow" | "underflow" }
>;

/** Whether `error` is a refusal, of whichever limit. */
export function isRefusal<E extends { readonly kind: string }>(
  error: E,
): error is Extract<E, { readonly kind: Refusal["kind"] }> {
  return (
    error.kind === "tooLarge" ||
    error.kind === "overflow" ||
    error.kind === "underflow"
  );
}

/**
 * The bound on a value's decimal exponent, `10^18`: generous and finite,
 * so that a value's decimal exponent can always be written
 * (docs/calculator.md, feature 4).
 */
export const MAX_EXPONENT = 10n ** 18n;

/**
 * How far from the bound the canonical exponent must lie for the decimal
 * exponent to be computed in `scaled`, `4 × 10^8`: more than the digits
 * of any significand within the hard bound, so that an exponent farther in
 * cannot put the value past the bound.
 */
const BOUND_BAND = 400_000_000n;

export const ZERO: Scaled = { significand: ZERO_FRACTION, exp: 0n };
export const ONE: Scaled = { significand: ONE_FRACTION, exp: 0n };

// ---------------------------------------------------------------------------
// Construction and inspection

/**
 * `significand × 10^exp` in canonical form, or `overflow` or `underflow` when the
 * value's decimal exponent passes `MAX_EXPONENT` above or below (D17);
 * zero is within the bound at any exponent.
 */
export function scaled(
  significand: Rational,
  exp: bigint,
): Result<Scaled, ScaledError> {
  const s = normalize(significand, exp);
  if (s.exp > MAX_EXPONENT - BOUND_BAND || s.exp < BOUND_BAND - MAX_EXPONENT) {
    const e = decimalExponent(s);
    if (e > MAX_EXPONENT || e < -MAX_EXPONENT) return err(pastBound(e));
  }
  return ok(s);
}

/** The failure of a value whose decimal exponent `exp` is past the bound: `underflow` below it, `overflow` above. */
function pastBound(exp: bigint): Refusal {
  return { kind: exp < 0n ? "underflow" : "overflow" };
}

/** The integer `n` as a `Scaled`: its tens moved into the exponent. */
export function fromInteger(n: bigint): Scaled {
  return normalize({ num: n, den: 1n }, 0n);
}

/** The fraction `r` as a `Scaled`: its powers of ten moved into the exponent, which the fraction's size bounds far below the limit. */
export function fromRational(r: Rational): Scaled {
  return normalize(r, 0n);
}

/**
 * The exact fraction `s` stands for, when forming its power of ten stays
 * within `limit` bits (the significand limit); `tooLarge` otherwise.
 */
export function toRational(
  s: Scaled,
  limit: number,
): Result<Rational, ScaledError> {
  const { num, den } = s.significand;
  if (s.exp === 0n) return ok(s.significand);
  if (!formable(s, limit)) return err({ kind: "tooLarge" });
  const magnitude = abs(s.exp);
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

/**
 * Whether `toRational(s, limit)` would form the fraction: its power of
 * ten, times the numerator's digits, sized against `limit` bits with
 * nothing formed, so that the parser can test a `^` exponent's literal
 * against the hard bound without paying for the fraction (H.9).
 */
export function formable(s: Scaled, limit: number): boolean {
  if (s.exp === 0n) return true;
  const magnitude = abs(s.exp);
  return (
    magnitude <= BigInt(limit) &&
    (Number(magnitude) + decimalDigits(abs(s.significand.num))) *
      BITS_PER_DIGIT <=
      limit
  );
}

export function isZero(s: Scaled): boolean {
  return s.significand.num === 0n;
}

/** Whether `s` is an integer: a significand of denominator one and an exponent at or above zero. */
export function isInteger(s: Scaled): boolean {
  return s.significand.den === 1n && s.exp >= 0n;
}

/** The sign of `s`: -1, 0 or 1. */
export function sign(s: Scaled): -1 | 0 | 1 {
  return signOf(s.significand);
}

/** Structural equality, which the canonical form makes equality of values. */
export function equals(a: Scaled, b: Scaled): boolean {
  return (
    a.exp === b.exp &&
    a.significand.num === b.significand.num &&
    a.significand.den === b.significand.den
  );
}

/**
 * The decimal exponent of `s`, which must be non-zero: the integer `e`
 * with `10^e <= |s| < 10^(e+1)`, the significand's plus `exp`, exact for any
 * exponent and formed without any power of ten.
 */
export function decimalExponent(s: Scaled): bigint {
  return BigInt(decimalExponentOfFraction(s.significand)) + s.exp;
}

/**
 * The decimal exponent of the non-zero fraction `r`: the integer `e` with
 * `10^e <= |r| < 10^(e+1)`, the position of its leading digit.
 */
function decimalExponentOfFraction(r: Rational): number {
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

/**
 * Compares `a` with `b`: -1, 0 or 1. Decided by the signs, then by the
 * decimal exponents, and, when those are equal, by aligning the significands
 * by the difference of the exponents, which is then at most the
 * significands' digit counts, so nothing large is ever formed.
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
  const left =
    shift > 0n ? timesPowerOfTen(a.significand, shift) : a.significand;
  const right =
    shift < 0n ? timesPowerOfTen(b.significand, -shift) : b.significand;
  return compareFractions(left, right);
}

// ---------------------------------------------------------------------------
// Arithmetic

/** `-s`: the significand negated, the exponent kept; canonical as `s` is. */
export function negate(s: Scaled): Scaled {
  return isZero(s)
    ? s
    : { significand: negateFraction(s.significand), exp: s.exp };
}

/** `|s|`. */
export function absolute(s: Scaled): Scaled {
  return s.significand.num < 0n ? negate(s) : s;
}

/**
 * `a + b`, exactly, the significands aligned by `10^|Δexp|`; `tooLarge` when
 * the alignment would exceed `limit` bits, and `overflow` or `underflow`
 * when the sum's exponent would pass the bound.
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

/** `op` over the significands of `a` and `b` brought to the lesser exponent. */
function combine(
  a: Scaled,
  b: Scaled,
  limit: number,
  op: (x: Rational, y: Rational) => Rational,
): Result<Scaled, ScaledError> {
  if (isZero(a)) return scaled(op(ZERO_FRACTION, b.significand), b.exp);
  if (isZero(b)) return scaled(op(a.significand, ZERO_FRACTION), a.exp);
  const shift = abs(a.exp - b.exp);
  if (shift > BigInt(limit) || Number(shift) * BITS_PER_DIGIT > limit) {
    return err({ kind: "tooLarge" });
  }
  const exp = a.exp < b.exp ? a.exp : b.exp;
  const left =
    a.exp > exp ? timesPowerOfTen(a.significand, shift) : a.significand;
  const right =
    b.exp > exp ? timesPowerOfTen(b.significand, shift) : b.significand;
  return scaled(op(left, right), exp);
}

/**
 * Whether the significand of `s` has at most `significandLimitBits` bits in its numerator
 * and its denominator: the significand limit's measure, the canonical form's
 * size (D16, D19), which the evaluator checks a literal and every exact
 * result against, and the pipeline its two quotients.
 */
export function significandWithin(
  s: Scaled,
  significandLimitBits: number,
): boolean {
  const { num, den } = s.significand;
  return (
    bitLength(num < 0n ? -num : num) <= significandLimitBits &&
    bitLength(den) <= significandLimitBits
  );
}

/**
 * `a × b`, exactly: the significands multiplied, the exponents added; fails
 * at the bound. The product is not held to the significand limit, which the
 * evaluator's node check refuses it at once formed (D19), so a caller
 * takes any refusal.
 */
export function multiply(a: Scaled, b: Scaled): Result<Scaled, ScaledError> {
  if (isZero(a) || isZero(b)) return ok(ZERO);
  return scaled(multiplyFractions(a.significand, b.significand), a.exp + b.exp);
}

/**
 * `a / b`, exactly: the significands divided, the exponents subtracted;
 * fails on a zero `b` and at the bound. Like a product, the quotient is
 * held to the significand limit at the node, not here, and a caller takes any
 * refusal.
 */
export function divide(a: Scaled, b: Scaled): Result<Scaled, ScaledError> {
  const significand = divideFractions(a.significand, b.significand);
  if (!significand.ok) return significand;
  if (isZero(a)) return ok(ZERO);
  return scaled(significand.value, a.exp - b.exp);
}

/** The reciprocal of `s`; fails on zero and at the bound. */
export function invert(s: Scaled): Result<Scaled, ScaledError> {
  const significand = invertFraction(s.significand);
  return significand.ok ? scaled(significand.value, -s.exp) : significand;
}

/**
 * `s` raised to the integer power `n`, exactly: the significand's power as
 * the fraction's `pow` sizes it against `limit` bits, so that `10^1442695`
 * is `1 × 10^1442695` where `2^1442695` is `tooLarge` by its significand,
 * and the exponent times `n`, the value checked against the bound by the
 * constructor. A negative `n` inverts, so zero to a negative power is a
 * division by zero; `s^0` is one for any `s`. A refusal by the significand
 * is reported by the power's decimal exponent (`powerRefusal`), not by
 * the check that fails first: `7^(10^19)`, refused by its significand, is an
 * `overflow`, and `2.54^(10^18)` is `10^(0.40 × 10^18)`, within the
 * bound, and is `tooLarge`, the significand limit's; within a hair of the
 * bound, where `powerRefusal` cannot tell, it is `tooLarge`. A check of
 * the canonical exponent times `n` came first until the plan's H.13,
 * which refused `12345678e-1000000000000000007` to the first power, a
 * value (D17).
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
  const significand = powFraction(s.significand, n, limit);
  if (significand.ok) return scaled(significand.value, s.exp * n);
  if (significand.error.kind !== "tooLarge") return significand;
  return err(powerRefusal(s, integerExponent(n)) ?? significand.error);
}

/**
 * The integer `n` as a `Scaled` for `powerRefusal`, which reads only its
 * magnitude and sign: not in canonical form, since moving the tens of an
 * `n` of `2^20` bits out would cost a tenth of a second on every refusal.
 */
function integerExponent(n: bigint): Scaled {
  return { significand: { num: n, den: 1n }, exp: 0n };
}

// ---------------------------------------------------------------------------
// Rounding, truncation and the exact root

/**
 * `s` rounded to `digits` significant digits in `mode`: the significand
 * rounded as the fraction's `roundTo` rounded it, since rounding to
 * significant digits commutes with the power of ten, and the exponent
 * kept, so nothing is formed. `equals(roundTo(s, d, mode), s)` says
 * whether `s` is displayed exactly at `d` digits, in any mode. A rounding
 * that carries past the bound (`9.99 × 10^MAX` at one digit) keeps its
 * exponent, the bound being the arithmetic's to hold.
 */
export function roundTo(
  s: Scaled,
  digits: Precision,
  mode: RoundingMode,
): Scaled {
  checkPrecision(digits);
  if (isZero(s)) return ZERO;
  const { num, den } = s.significand;
  const shift = digits - 1 - decimalExponentOfFraction(s.significand);
  // The significand at `digits` digits is `num × 10^shift / den` rounded, an
  // integer; it goes to the canonical form with the shift taken off the
  // exponent, and not through `rational`, whose lowest terms would cost a
  // gcd against the power of ten that the form moves out anyway.
  const rounded =
    shift >= 0
      ? divideRounded(num * powerOfTen(BigInt(shift)), den, mode)
      : divideRounded(num, den * powerOfTen(BigInt(-shift)), mode);
  return normalize({ num: rounded, den: 1n }, s.exp - BigInt(shift));
}

/**
 * `s` truncated toward zero to an integer: itself for an integer of any
 * size, zero for a value below one in magnitude, the exact truncation
 * where the value can be formed within `limit` bits, and `undefined` for a
 * fractional value whose integer part cannot be formed (a unit list's
 * count, 4.9).
 */
export function trunc(s: Scaled, limit: number): Scaled | undefined {
  if (isInteger(s)) return s;
  if (decimalExponent(s) < 0n) return ZERO;
  const r = toRational(s, limit);
  return r.ok ? fromRational(truncFraction(r.value)) : undefined;
}

/**
 * The exact `degree`-th root of `s`, where `degree >= 1`: the exponent
 * divided by the degree, its remainder's power of ten folded into the
 * significand when it can be formed within `limit` bits, and the fraction's
 * `exactRoot` of that, so that `sqrt(1e999999998)` is exactly
 * `1e499999999` and `sqrt(1e999999999)` is irrational; `undefined` when
 * the root is irrational or the remainder cannot be formed, in which case
 * there is no exact root to find. An even root of a negative value fails
 * with `negativeRadicand`; a root of degree one is `s` itself.
 */
export function exactRoot(
  s: Scaled,
  degree: bigint,
  limit: number,
): Result<Scaled | undefined, ScaledError> {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  if (degree === 1n || isZero(s)) return ok(s);
  if (s.significand.num < 0n && degree % 2n === 0n) {
    return err({ kind: "negativeRadicand", degree });
  }
  let k = s.exp / degree;
  let r = s.exp - k * degree;
  if (r < 0n) {
    r += degree;
    k -= 1n;
  }
  let significand = s.significand;
  if (r > 0n) {
    if (
      r > BigInt(limit) ||
      (Number(r) + decimalDigits(abs(significand.num))) * BITS_PER_DIGIT > limit
    ) {
      return ok(undefined);
    }
    // Still in lowest terms: the denominator is coprime to ten.
    significand = { num: significand.num * 10n ** r, den: significand.den };
  }
  const root = exactRootOfFraction(significand, degree);
  if (!root.ok) return root;
  if (root.value === undefined) return ok(undefined);
  return ok(normalize(root.value, k));
}

// ---------------------------------------------------------------------------
// Decimal text

const DECIMAL = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/;

/**
 * Parses a decimal literal exactly: an optional sign, digits with an
 * optional fraction (`12`, `1.5`, `.5`, `5.`) and an optional exponent
 * (`1.5e-3` is `15 × 10^-4`), the exponent kept as the exponent it is.
 * Anything else, including surrounding whitespace, is `invalidNumber`; a
 * significand of more digits than `MAX_SIGNIFICAND_LIMIT_BITS` holds is `tooLarge`, and a
 * value past `MAX_EXPONENT` is `overflow` or `underflow`, by its side, as
 * the constructor decides it: `0e2000000000000000000` is zero, and
 * `10e-1000000000000000001` is `1e-1000000000000000000`, at the bound
 * (issue #50).
 */
export function parseDecimal(text: string): Result<Scaled, ScaledError> {
  const match = DECIMAL.exec(text);
  if (match === null) return err({ kind: "invalidNumber" });
  const [, signText, integerPart = "", fractionPart = "", bareFraction = ""] =
    match;
  const fraction = fractionPart || bareFraction;
  const digits = integerPart + fraction;
  if (digits.length * BITS_PER_DIGIT > MAX_SIGNIFICAND_LIMIT_BITS) {
    return err({ kind: "tooLarge" });
  }
  // The value is (integer digits ++ fraction digits) × 10^(exponent - #fraction).
  const exponent = match[5] === undefined ? 0n : BigInt(match[5]);
  const shift = exponent - BigInt(fraction.length);
  const significand = BigInt(digits);
  return scaled(
    { num: signText === "-" ? -significand : significand, den: 1n },
    shift,
  );
}

/**
 * Renders `s` rounded (as `roundTo` rounds, in `mode`) to `digits`
 * significant digits, in the style of C's `%g`: trailing zeros are
 * dropped, and exponent notation is used when the decimal exponent is
 * below -4 or at least `digits`, with the exponent written as JavaScript
 * writes it (`1.5e+21`, `1e-7`, `1e+999999999`). Nothing goes through a
 * `number` on the way, so a value of any magnitude renders exactly.
 */
export function format(
  s: Scaled,
  digits: Precision,
  mode: RoundingMode,
): string {
  checkPrecision(digits);
  if (isZero(s)) return "0";
  const { num, den } = s.significand;
  let exponent = decimalExponentOfFraction(s.significand);
  const shift = digits - 1 - exponent;
  // The signed numerator is rounded, since the directed modes tell the sign
  // apart (`-9.99` at two digits is `-9.9` under `ceiling` and `-10` under
  // `floor`), and the sign is taken from the result. Its magnitude has
  // exactly `digits` digits: the scaled value is at least `10^(digits-1)`
  // in magnitude, and every mode keeps it at or above that.
  const signed = divideRounded(
    shift >= 0 ? num * 10n ** BigInt(shift) : num,
    shift >= 0 ? den : den * 10n ** BigInt(-shift),
    mode,
  );
  let significand = abs(signed);
  // Rounding can carry into a new leading digit (9.99 → 10.0), in any mode
  // that rounds the magnitude up.
  if (significand === 10n ** BigInt(digits)) {
    significand /= 10n;
    exponent += 1;
  }
  const text = significand.toString(); // exactly `digits` characters
  const sign = signed < 0n ? "-" : "";
  const total = BigInt(exponent) + s.exp;
  if (total < -4n || total >= BigInt(digits)) {
    const rest = trimZeros(text.slice(1));
    const exponentText = total < 0n ? `e-${-total}` : `e+${total}`;
    return `${sign}${text[0]}${rest ? `.${rest}` : ""}${exponentText}`;
  }
  const small = Number(total);
  if (small >= 0) {
    const integerPart = text.slice(0, small + 1);
    const fractionPart = trimZeros(text.slice(small + 1));
    return `${sign}${integerPart}${fractionPart ? `.${fractionPart}` : ""}`;
  }
  return `${sign}0.${"0".repeat(-small - 1)}${trimZeros(text)}`;
}

function trimZeros(digits: string): string {
  return digits.replace(/0+$/, "");
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
 * `2^-30` of each other and of the truth: `log2` of the significand's
 * numerator and denominator through their top bits and a double, and the
 * exponent times `log2 10` through the 128-bit fraction, with `LOG2_MARGIN`
 * taken off and added on. What a radius at or above, or below, `|s|`
 * needs (4.4).
 */
export function log2Bounds(s: Scaled): { lower: Log2; upper: Log2 } {
  if (s.significand.num === 0n)
    throw new RangeError("Zero has no binary magnitude");
  const m = log2Of(abs(s.significand.num)) - log2Of(s.significand.den);
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

/**
 * The decimal exponent of a value whose binary logarithm is `log2`: the
 * integer `e` with `10^e <= v < 10^(e+1)`, and the fraction `log10 v - e`
 * in `[0, 1)`, through the 128-bit `log2 10`; exact in the integer part to
 * the accuracy of `log2` itself, so a `log2` from `log2Bounds` gives an
 * exponent that may be one too high or too low where the fraction is
 * within `2^-30` of an integer, which a caller that must know rounds up.
 */
export function decimalExponentOfLog2(log2: Log2): {
  exp: bigint;
  frac: number;
} {
  // (int + frac) / log2(10) = (int × 2^128 + frac × 2^128) / LOG2_10_SCALED.
  const numerator =
    (log2.int << 128n) + BigInt(Math.floor(log2.frac * 2 ** 128));
  let exp = numerator / LOG2_10_SCALED;
  let rest = numerator - exp * LOG2_10_SCALED;
  if (rest < 0n) {
    exp -= 1n;
    rest += LOG2_10_SCALED;
  }
  return { exp, frac: Number(rest) / Number(LOG2_10_SCALED) };
}

/**
 * A `Scaled` of one significant digit at or above the value whose binary
 * logarithm is at most `log2`: `d × 10^e` with `d` the ceiling of
 * `10^frac` plus one for the accuracy of the fraction, carried into the
 * next power of ten when it reaches ten. What a radius is written as.
 */
export function oneDigitAbove(log2: Log2): Scaled {
  const { exp, frac } = decimalExponentOfLog2(log2);
  const digit = BigInt(Math.ceil(10 ** frac)) + 1n;
  return digit >= 10n
    ? normalize({ num: 1n, den: 1n }, exp + 1n)
    : normalize({ num: digit, den: 1n }, exp);
}

/** `log2 MAX_EXPONENT`, for `powerRefusal`. */
const LOG2_MAX_EXPONENT = Math.log2(Number(MAX_EXPONENT));

/** The margin `powerRefusal` leaves on the binary logarithm of an exponent, far above the error of the doubles it works through. */
const POWER_MARGIN = 2 ** -20;

/** `log2 ln 10`, which takes the binary logarithm of a natural logarithm to that of a decimal one. */
const LOG2_LN10 = Math.log2(Math.LN10);

/**
 * The slack on `log2 |ln |s||` when it is taken from `d = |s| - 1`, for an
 * `s` within `2^-29` of one in magnitude: `|ln(1 + d)|` is `|d|` within a
 * factor `1 ± 2|d|` there, whose binary logarithm is well inside this.
 */
const NEAR_ONE_SLACK = 2 ** -25;

/**
 * The failure that reports a refused `s^y`, told by where its decimal
 * exponent, `y log10 |s|`, lies: `overflow` or `underflow` when that is
 * past the bound, on the side `powerSide` gives; `tooLarge`, the range
 * limit's, when it is within it, so that the bound is not what refuses
 * the power; and `undefined` when it is within a relative `2^-20` of the
 * bound, where the bounds cannot tell. The exponent is never formed: its
 * binary logarithm, `log2 |y|` plus `log2 |log10 |s||` (`log2OfLog10`),
 * is bounded from both sides. For a power the arithmetic refuses, so that
 * the error names the bound, which no setting moves, when no setting
 * could compute the power (`7^(10^19)`), and the significand limit when an
 * inexact base would give it a value. A zero `s` or `y`, and an `s` of
 * magnitude one, give a power of magnitude zero or one: `tooLarge`.
 */
export function powerRefusal(s: Scaled, y: Scaled): Refusal | undefined {
  if (isZero(s) || isZero(y) || equals(absolute(s), ONE)) {
    return { kind: "tooLarge" };
  }
  const base = log2OfLog10(s);
  if (base === undefined) return undefined;
  const power = log2Bounds(y);
  const leastLog2 = valueOfLog2(power.lower) + base.lower;
  const mostLog2 = valueOfLog2(power.upper) + base.upper;
  if (mostLog2 < LOG2_MAX_EXPONENT - POWER_MARGIN) return { kind: "tooLarge" };
  if (leastLog2 <= LOG2_MAX_EXPONENT + POWER_MARGIN) return undefined;
  return powerSide(s, y);
}

/**
 * The side of the bound `s^y` lies past when it passes it, for a nonzero
 * `y` and an `s` whose magnitude is not one: `overflow` when `y` is
 * positive and `|s|` above one or both are the other way, `underflow`
 * otherwise, told exactly, by comparing `|s|` with one.
 */
export function powerSide(s: Scaled, y: Scaled): Refusal {
  const belowOne = compare(absolute(s), ONE) < 0;
  const negative = sign(y) < 0;
  return { kind: negative === belowOne ? "overflow" : "underflow" };
}

/**
 * A lower and an upper bound on `log2 |log10 |s||`, for a nonzero `s`
 * whose magnitude is not one: from the binary bounds on `log2 |s|`, taken
 * toward zero for the lower and away from it for the upper, where those
 * lie on one side of zero; and otherwise, `|s|` being within `2^-30` or so
 * of one, from `d = |s| - 1` formed exactly, `|ln |s||` being `|d|` within
 * `NEAR_ONE_SLACK`. `undefined` when `d` cannot be aligned within the hard
 * bound, which only a significand of the hard bound's size makes possible.
 */
function log2OfLog10(s: Scaled): { lower: number; upper: number } | undefined {
  const bounds = log2Bounds(s);
  const lower = valueOfLog2(bounds.lower);
  const upper = valueOfLog2(bounds.upper);
  if (lower > 0 || upper < 0) {
    const least = lower > 0 ? lower : -upper;
    const most = Math.max(Math.abs(lower), Math.abs(upper));
    return {
      lower: Math.log2(least * LOG10_2),
      upper: Math.log2(most * LOG10_2),
    };
  }
  const d = subtract(absolute(s), ONE, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!d.ok) return undefined;
  const near = log2Bounds(d.value);
  return {
    lower: valueOfLog2(near.lower) - LOG2_LN10 - NEAR_ONE_SLACK,
    upper: valueOfLog2(near.upper) - LOG2_LN10 + NEAR_ONE_SLACK,
  };
}

/** A binary logarithm as a double. */
function valueOfLog2(log2: Log2): number {
  return Number(log2.int) + log2.frac;
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
/** About the bits of a decimal digit, the measure `formable` sizes a significand by. */
export const BITS_PER_DIGIT = 3.33;

/**
 * `significand × 10^exp` in canonical form, unchecked against the bound: the
 * denominator's tens, then its twos or its fives, moved out, and the
 * numerator's tens moved into the exponent, as the header says.
 */
function normalize(significand: Rational, exp: bigint): Scaled {
  if (significand.num === 0n) return ZERO;
  let num = abs(significand.num);
  let den = significand.den;
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
  return {
    significand: { num: significand.num < 0n ? -num : num, den },
    exp: e,
  };
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
 * a quadratic loop on a significand full of tens (`10^300000` took a minute).
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

/** The number of trailing zero bits of the positive `n`; exported for the parity of `pow`'s exponent (builtins/pow.ts). */
export function trailingZeros(n: bigint): bigint {
  return BigInt(bitLength(n & -n) - 1);
}

/**
 * The number of decimal digits in the non-negative `n` (1 for zero), for
 * the boundary's use too: from
 * the bit length, which puts it within one, and a comparison with the
 * power of ten that decides, rather than through `toString`, which is
 * slower by an order at the ceiling's sizes.
 */
export function decimalDigits(n: bigint): number {
  if (n === 0n) return 1;
  const bits = bitLength(n);
  // 2^(bits - 1) <= n < 2^bits: the digits of the lower bound, or one more.
  const low = Math.floor((bits - 1) * LOG10_2) + 1;
  return n >= powerOfTen(BigInt(low)) ? low + 1 : low;
}

/** `log10 2`, for the digit count of a bit length. */
const LOG10_2 = Math.log10(2);

/** The powers of ten the sizes here call for, memoized: `10^k` for `k >= 0`. */
const POWERS_OF_TEN = new Map<bigint, bigint>();

/** `10^k` for `k >= 0`, from the memo, which is emptied when it grows past a few hundred entries. */
export function powerOfTen(k: bigint): bigint {
  const held = POWERS_OF_TEN.get(k);
  if (held !== undefined) return held;
  const power = 10n ** k;
  if (POWERS_OF_TEN.size >= 256) POWERS_OF_TEN.clear();
  POWERS_OF_TEN.set(k, power);
  return power;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
