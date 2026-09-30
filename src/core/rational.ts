// The exact fraction: a rational over `bigint`, with the arithmetic the
// evaluator needs and the exact case of the n-th root. It is the total
// fraction of the type ladder (docs/calculator-plan.md, D13): the exponents
// of dimensions and of `^` and the exact value of a radius are fractions,
// and from stage 4 the midpoint is a `Scaled` (scaled.ts), a fraction times
// a power of ten, which holds the decimal representation, the parsing of a
// literal, rounding to significant digits and formatting, all of which
// lived here until 4.3.
//
// Everything here is exact, and the rules for when a value may lose
// precision are spelled out in ARCHITECTURE.md ("Precision and rounding").
// In short: arithmetic never rounds; the digits of an irrational root are
// the kernel's business (fixed.ts, through `rootBall` of ball.ts), and
// `exactRoot` here answers only whether a root is rational.
//
// A `Rational` is in lowest terms with a positive denominator, and
// `rational` is the one constructor that reduces. Every operation below
// assumes its operands are in lowest terms and reduces its result with the
// smaller gcds the operands allow, rather than a full gcd on the unreduced
// parts (the plan's H.9; issue #52): a sum and a difference by Henrici's
// rule, the gcd of the two denominators and then of that with the new
// numerator; a product by cross-cancellation, the gcd of each numerator
// with the other denominator; a quotient as the product by the divisor's
// reciprocal, the gcd of the two numerators and of the two denominators;
// and an inverse, a negative power and a truncation by swapping or
// dividing, with no gcd at all, where the reciprocal of a reduced pair
// once paid a full gcd for nothing (the display's reciprocal line doubled
// #52's conversion). The rules are correct only for operands in lowest
// terms, which is the type's invariant, so anything that builds a fraction
// without `rational` (`scaleByPowerOfTwo` here, fixed.ts's dyadics,
// scaled.ts's canonical mantissas) keeps it, and the tests assert so: a
// full reduction of the result no longer forgives a broken invariant
// upstream. The gcd is Euclid's on the odd parts, quadratic in the
// operands' size.
//
// Failures on values (dividing by zero, an even root of a negative number, a
// result too large to compute) are returned as `Result`s. Violated
// preconditions (a zero denominator passed to `rational`) are programming
// errors and throw `RangeError`, as `1n / 0n` does.

import { err, ok, type Result } from "./result.ts";

/** An exact rational number. Invariant: `den > 0` and `gcd(num, den) = 1`. */
export type Rational = { readonly num: bigint; readonly den: bigint };

export type RationalError =
  /** Division by zero, including `0` raised to a negative power. */
  | { readonly kind: "divisionByZero" }
  /** An even root of a negative number, which has no real value. */
  | { readonly kind: "negativeRadicand"; readonly degree: bigint }
  /** The result would exceed the range limit and was not computed. */
  | { readonly kind: "tooLarge" }
  /** The text is not a decimal number. */
  | { readonly kind: "invalidNumber" };

/**
 * The hard bound on the size of a numerator or denominator, in bits (2^20,
 * about 315,000 decimal digits): the most the range limit of the context
 * (`maxBits`, D16 of the plan) may be set to, and the bound the parser
 * applies to a decimal literal's mantissa through scaled.ts's
 * `parseDecimal`, since it has no context; the evaluator then checks the
 * literal against the setting. Operations whose result can be
 * exponentially larger than their inputs (`pow`) predict the size of their
 * result and return `tooLarge` instead of computing one beyond the limit
 * they are given. Operations that grow their inputs by at most a constant
 * factor do not check, since an expression of bounded length can only
 * apply a bounded number of them, and inexact midpoints are settled to the
 * working precision (D15), so only exact values grow.
 */
export const LIMIT_BITS = 1 << 20;

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

/** `a + b`, by Henrici's rule (the header says what each operation reduces with). */
export function add(a: Rational, b: Rational): Rational {
  return henrici(a.num, a.den, b.num, b.den);
}

/** `a - b`, by Henrici's rule. */
export function subtract(a: Rational, b: Rational): Rational {
  return henrici(a.num, a.den, -b.num, b.den);
}

/**
 * `a/b + c/d` in lowest terms for two fractions in lowest terms, by
 * Henrici's rule (Knuth 4.5.1): with `g = gcd(b, d)`, `b' = b/g` and
 * `d' = d/g`, the sum is `t / (b' d' g)` for `t = a d' + c b'`, and the
 * only factor `t` can share with the denominator divides `g`, since `b'`
 * and `d'` are coprime to each other and to the numerators they multiply.
 * So one more gcd, of `t` with `g`, reduces it. Two integers add with no
 * gcd, and one denominator, the common case of two aligned mantissas,
 * takes the gcd of the sum with it.
 */
function henrici(a: bigint, b: bigint, c: bigint, d: bigint): Rational {
  if (b === d) {
    const t = a + c;
    if (t === 0n) return ZERO;
    if (b === 1n) return { num: t, den: 1n };
    const g = gcd(abs(t), b);
    return g === 1n ? { num: t, den: b } : { num: t / g, den: b / g };
  }
  const g = gcd(b, d);
  if (g === 1n) {
    const t = a * d + c * b;
    return t === 0n ? ZERO : { num: t, den: b * d };
  }
  const bb = b / g;
  const dd = d / g;
  const t = a * dd + c * bb;
  if (t === 0n) return ZERO;
  const g2 = gcd(abs(t), g);
  return { num: t / g2, den: bb * dd * (g / g2) };
}

/**
 * `a × b`, by cross-cancellation: each numerator against the other
 * denominator, which is all a product of two fractions in lowest terms
 * can share.
 */
export function multiply(a: Rational, b: Rational): Rational {
  if (a.num === 0n || b.num === 0n) return ZERO;
  const g1 = gcd(abs(a.num), b.den);
  const g2 = gcd(abs(b.num), a.den);
  return {
    num: (a.num / g1) * (b.num / g2),
    den: (a.den / g2) * (b.den / g1),
  };
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

/** The reciprocal of `r`, by swapping, with no gcd; fails if `r` is zero. */
export function invert(r: Rational): Result<Rational, RationalError> {
  if (r.num === 0n) return err({ kind: "divisionByZero" });
  return ok(swapped(r.num, r.den));
}

/** `den / num` for a nonzero `num`, the sign moved to the numerator. */
function swapped(num: bigint, den: bigint): Rational {
  return num < 0n ? { num: -den, den: -num } : { num: den, den: num };
}

/**
 * `a / b`, as the product of `a` by the reciprocal of `b`: the two
 * numerators cancel against each other and so do the two denominators;
 * fails if `b` is zero.
 */
export function divide(
  a: Rational,
  b: Rational,
): Result<Rational, RationalError> {
  if (b.num === 0n) return err({ kind: "divisionByZero" });
  if (a.num === 0n) return ok(ZERO);
  const g1 = gcd(abs(a.num), abs(b.num));
  const g2 = gcd(b.den, a.den);
  const num = (a.num / g1) * (b.den / g2);
  const den = (a.den / g2) * (b.num / g1);
  return ok(den < 0n ? { num: -num, den: -den } : { num, den });
}

/**
 * `r` raised to the integer power `n`, exactly. A negative `n` inverts, so
 * `0` to a negative power is a division by zero. The result can be `|n|`
 * times as large as `r`, so it is checked against `limit` bits first, the
 * context's range limit.
 */
export function pow(
  r: Rational,
  n: bigint,
  limit: number,
): Result<Rational, RationalError> {
  if (n === 0n) return ok(ONE);
  if (r.num === 0n) {
    return n < 0n ? err({ kind: "divisionByZero" }) : ok(ZERO);
  }
  if (r.den === 1n && (r.num === 1n || r.num === -1n)) {
    return ok(r.num === 1n || n % 2n === 0n ? ONE : r);
  }
  const magnitude = abs(n);
  const bits = Math.max(bitLength(abs(r.num)), bitLength(r.den));
  if (magnitude > BigInt(limit) || Number(magnitude) * bits > limit) {
    return err({ kind: "tooLarge" });
  }
  const num = r.num ** magnitude;
  const den = r.den ** magnitude;
  // Powers of a reduced fraction are reduced, and a negative power swaps
  // the two, so no gcd is needed.
  return ok(n > 0n ? { num, den } : swapped(num, den));
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
// Truncation

/** `r` truncated toward zero to an integer, as bigint division truncates: `7/2` is `3` and `-7/2` is `-3`. */
export function trunc(r: Rational): Rational {
  return isInteger(r) ? r : { num: r.num / r.den, den: 1n };
}

// ---------------------------------------------------------------------------
// bigint helpers

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

/**
 * The greatest common divisor of the non-negative `a` and the positive
 * `b`: the common power of two, read off the trailing zeros, times Euclid
 * on the odd parts. Euclid alone on a settled midpoint, a dyadic of
 * thousands of bits over a power of two, takes a step per few bits with a
 * division of the whole number at each, tens of milliseconds at the
 * ceiling of the retry schedule for one sum; on the odd parts it takes a
 * step or two when one of them is small, and none when both are one.
 */
function gcd(a: bigint, b: bigint): bigint {
  if (a === 0n) return b;
  if (a === 1n || b === 1n) return 1n;
  const twosA = trailingZeros(a);
  const twosB = trailingZeros(b);
  a >>= twosA;
  b >>= twosB;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a << (twosA < twosB ? twosA : twosB);
}

/**
 * The number of bits in the non-negative `n` (0 for zero). Exported for
 * the kernel (fixed.ts), which sizes and rebases its values by it.
 */
export function bitLength(n: bigint): number {
  return n === 0n ? 0 : n.toString(2).length;
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
