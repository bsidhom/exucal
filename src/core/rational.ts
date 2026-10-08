// The exact fraction: a rational over `bigint`, with the arithmetic the
// evaluator needs and the exact case of the n-th root. It is the total
// fraction of the type ladder (devdocs/numbers.md, "The types"): the
// exponents of dimensions and of `^` and the exact value of a radius are
// fractions, and the midpoint is a `Scaled` (scaled.ts), a fraction times
// a power of ten, which holds the decimal representation, the parsing of a
// literal, rounding to significant digits and formatting.
//
// Everything here is exact, and the rules for when a value may lose
// precision are spelled out in devdocs/numbers.md ("Settling").
// In short: arithmetic never rounds; the digits of an irrational root are
// the kernel's business (fixed.ts, through `rootBall` of ball.ts), and
// `exactRoot` here answers only whether a root is rational.
//
// A `Rational` is in lowest terms with a positive denominator, and
// `rational` is the one constructor that reduces. Every operation below
// assumes its operands are in lowest terms and reduces its result with the
// smaller gcds the operands allow, rather than a full gcd on the unreduced
// parts (devdocs/numbers.md, "Exact operations"): a sum and a difference
// by Henrici's rule, the gcd of the two denominators and then of that
// with the new
// numerator; a product by cross-cancellation, the gcd of each numerator
// with the other denominator; a quotient as the product by the divisor's
// reciprocal, the gcd of the two numerators and of the two denominators;
// and an inverse, a negative power and a truncation by swapping or
// dividing, with no gcd at all, where the reciprocal of a reduced pair
// once paid a full gcd for nothing (the display's reciprocal line doubled
// a conversion's time). The rules are correct only for operands in lowest
// terms, which is the type's invariant, so anything that builds a fraction
// without `rational` (`scaleByPowerOfTwo` here, fixed.ts's dyadics,
// scaled.ts's canonical significands) keeps it, and the tests assert so: a
// full reduction of the result no longer forgives a broken invariant
// upstream. The gcd is Lehmer's (Knuth's Algorithm L) on the odd parts:
// still quadratic in the operands' size, but it takes its steps on the
// leading bits in doubles and applies their cofactors to the bigints
// some twenty-six bits at a time, about forty times cheaper in V8 than
// Euclid's step per bit or two at 65,536 bits; a half-gcd, which is
// subquadratic, gains only above `2^16` bits and is left for a larger
// limit.
//
// Failures on values (dividing by zero, an even root of a negative number, a
// result too large to compute) are returned as `Result`s. Violated
// preconditions (a zero denominator passed to `rational`) are programming
// errors and throw `RangeError`, as `1n / 0n` does.

import { err, ok, type Result } from "./result.ts";

/** An exact rational number. Invariant: `den > 0` and `gcd(num, den) = 1`. */
export type Rational = { readonly num: bigint; readonly den: bigint };

/**
 * The refusing function's expectation for the same step computed
 * inexactly, as `approx` around an operand or decimal mode arrange:
 * `fits`, within the significand limit, where only the exact result
 * exceeds it (a product of two exact fractions, a sum's alignment, an
 * exact power's prediction); `exceeds`, where the computation exceeds
 * the limit whatever its operands' exactness, needing more bits than it
 * holds (a literal's digits, an exponent that cannot be formed, a
 * kernel's reach). The
 * function that refuses states it, since it alone knows how it computes
 * and what an inexact operand changes; nothing above it infers the reach
 * from the expression's shape, and the message suggests a remedy on
 * `fits` alone. It is an expectation, not a guarantee: the remedy is
 * offered to try, and the tests check it on representative inputs.
 */
export type Reach = "fits" | "exceeds";

/**
 * The bits a refused result would need in its significand's larger part,
 * as the refusing function can tell: `exact` where it
 * measured a value that exists (a literal's digits, a kernel's working
 * bits), `bound` where it predicted before forming, an upper bound that
 * a limit at or above admits the result, within a bit of the truth for a
 * product or a quotient after cross-cancellation and for an aligned sum,
 * and `|n|` bits at most over it for a power; `unknown` where the
 * function refuses by a test that yields no count. The message reports
 * the number and recommends nothing: what a limit that holds it would
 * cost on a device is the user's to judge.
 */
export type Need =
  | { readonly kind: "exact"; readonly bits: number }
  | { readonly kind: "bound"; readonly bits: number }
  | { readonly kind: "unknown" };

/** A `bound` need of `bits`, or `unknown` where the count is past a double's range. */
export function boundOf(bits: number): Need {
  return Number.isFinite(bits) ? { kind: "bound", bits } : { kind: "unknown" };
}

export type RationalError =
  /** Division by zero, including `0` raised to a negative power. */
  | { readonly kind: "divisionByZero" }
  /** An even root of a negative number, which has no real value. */
  | { readonly kind: "negativeRadicand"; readonly degree: bigint }
  /** The result would need a significand past the significand limit and was not computed; `inexact` is the refusing function's word on the same step computed inexactly, `need` its count of the bits the result would take. */
  | { readonly kind: "tooLarge"; readonly inexact: Reach; readonly need: Need }
  /** The text is not a decimal number. */
  | { readonly kind: "invalidNumber" };

/**
 * The hard bound on the size of a numerator or denominator, in bits (2^20,
 * about 315,000 decimal digits): the most the significand limit of the context
 * (`significandLimitBits`; devdocs/settings.md, "The model") may be set
 * to, and the bound the parser applies to a decimal literal's
 * significand through scaled.ts's
 * `parseDecimal`, since it has no context; the evaluator then checks the
 * literal against the setting. Operations whose result can be
 * exponentially larger than their inputs (`pow`) predict the size of their
 * result and return `tooLarge` instead of computing one beyond the limit
 * they are given. Operations that grow their inputs by at most a constant
 * factor do not check, since an expression of bounded length can only
 * apply a bounded number of them, and inexact midpoints are settled to the
 * working precision (devdocs/numbers.md, "Settling"), so only exact values grow.
 */
export const MAX_SIGNIFICAND_LIMIT_BITS = 1 << 20;

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

/** `a + b`, by Henrici's rule (the header says what each operation reduces with), for operands bounded by construction; `addWithin` holds a sum to the significand limit. */
export function add(a: Rational, b: Rational): Rational {
  return henrici(a.num, a.den, b.num, b.den);
}

/** `a - b`, by Henrici's rule, for operands bounded by construction. */
export function subtract(a: Rational, b: Rational): Rational {
  return henrici(a.num, a.den, -b.num, b.den);
}

/**
 * `a + b` by Henrici's rule, held to `limit` bits before anything larger
 * than the operands is formed: the sum's numerator `a d' + c b'` and its
 * denominator `b' d' g` are bounded from the parts' bit lengths, and a
 * bound past the limit is refused with the bound as the need. The bound
 * is the unreduced sum's; a sum that would reduce to fit is refused with
 * it, since the limit bounds what is formed and not only what is kept.
 * Two integers, and two fractions over one denominator, the common case
 * of two aligned significands, are bounded by the larger numerator plus
 * one.
 */
export function addWithin(
  a: Rational,
  b: Rational,
  limit: number,
): Result<Rational, RationalError> {
  return henriciWithin(a.num, a.den, b.num, b.den, limit);
}

/** `a - b`, as `addWithin` holds it. */
export function subtractWithin(
  a: Rational,
  b: Rational,
  limit: number,
): Result<Rational, RationalError> {
  return henriciWithin(a.num, a.den, -b.num, b.den, limit);
}

function henriciWithin(
  a: bigint,
  b: bigint,
  c: bigint,
  d: bigint,
  limit: number,
): Result<Rational, RationalError> {
  if (b === d) {
    const bits = Math.max(bitLength(abs(a)), bitLength(abs(c))) + 1;
    if (bits > limit) return refusedSum(bits);
    return ok(henrici(a, b, c, d));
  }
  const g = gcd(b, d);
  const bb = b / g;
  const dd = d / g;
  const numerator =
    Math.max(
      bitLength(abs(a)) + bitLength(dd),
      bitLength(abs(c)) + bitLength(bb),
    ) + 1;
  const denominator = bitLength(bb) + bitLength(dd) + bitLength(g);
  const bits = Math.max(numerator, denominator);
  if (bits > limit) return refusedSum(bits);
  const t = a * dd + c * bb;
  if (t === 0n) return ok(ZERO);
  if (g === 1n) return ok({ num: t, den: b * d });
  const g2 = gcd(abs(t), g);
  return ok({ num: t / g2, den: bb * dd * (g / g2) });
}

/** A sum refused before forming: the exact sum is what exceeds the limit, an inexact operand being absorbed into the radius instead (ball.ts). */
function refusedSum(bits: number): Result<never, RationalError> {
  return err({ kind: "tooLarge", inexact: "fits", need: boundOf(bits) });
}

/**
 * `a/b + c/d` in lowest terms for two fractions in lowest terms, by
 * Henrici's rule (Knuth 4.5.1): with `g = gcd(b, d)`, `b' = b/g` and
 * `d' = d/g`, the sum is `t / (b' d' g)` for `t = a d' + c b'`, and the
 * only factor `t` can share with the denominator divides `g`, since `b'`
 * and `d'` are coprime to each other and to the numerators they multiply.
 * So one more gcd, of `t` with `g`, reduces it. Two integers add with no
 * gcd, and one denominator, the common case of two aligned significands,
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
 * can share. For operands bounded by construction (the kernel's grid
 * points, a radius, a dimension's exponents); `multiplyWithin` holds an
 * exact product to the significand limit.
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
 * `a × b` held to `limit` bits before the product is formed: after the
 * cross-cancelling gcds, which run on the operands and cost no more than
 * they do, the product's numerator and denominator are bounded by the
 * sums of the parts' bit lengths, within a bit of the truth, and a bound
 * past the limit is refused with the bound as the need. The gcds first,
 * so that `x / x` and `(a/b) × (b/a)` are one whatever their size, and
 * nothing larger than the limit is ever formed (devdocs/numbers.md, "The
 * significand limit").
 */
export function multiplyWithin(
  a: Rational,
  b: Rational,
  limit: number,
): Result<Rational, RationalError> {
  if (a.num === 0n || b.num === 0n) return ok(ZERO);
  const g1 = gcd(abs(a.num), b.den);
  const g2 = gcd(abs(b.num), a.den);
  return formedWithin(a.num / g1, b.num / g2, a.den / g2, b.den / g1, limit);
}

/**
 * `a / b` held to `limit` bits as `multiplyWithin` holds a product, the
 * two numerators cancelling against each other and so the denominators;
 * fails if `b` is zero.
 */
export function divideWithin(
  a: Rational,
  b: Rational,
  limit: number,
): Result<Rational, RationalError> {
  if (b.num === 0n) return err({ kind: "divisionByZero" });
  if (a.num === 0n) return ok(ZERO);
  const g1 = gcd(abs(a.num), abs(b.num));
  const g2 = gcd(b.den, a.den);
  const num = b.num / g1;
  return formedWithin(
    num < 0n ? -(a.num / g1) : a.num / g1,
    b.den / g2,
    a.den / g2,
    abs(num),
    limit,
  );
}

/** `(n1 n2) / (d1 d2)` for cross-cancelled parts, formed only within `limit` bits; the exact product is what exceeds it. */
function formedWithin(
  n1: bigint,
  n2: bigint,
  d1: bigint,
  d2: bigint,
  limit: number,
): Result<Rational, RationalError> {
  const bits = Math.max(
    bitLength(abs(n1)) + bitLength(abs(n2)),
    bitLength(d1) + bitLength(d2),
  );
  if (bits > limit) {
    return err({ kind: "tooLarge", inexact: "fits", need: boundOf(bits) });
  }
  return ok({ num: n1 * n2, den: d1 * d2 });
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
 * times as large as `r`, so its size is predicted first against `limit`
 * bits, the context's significand limit: the bits of `p^|n|` for `p` the
 * larger part are `floor(|n| log2 p) + 1`, taken with `log2 p` from the
 * part's top bits rounded up, which is the truth or a bit over it, so
 * that `2^65535` is a value at the default and `2^65536` is not.
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
  const part = abs(r.num) > r.den ? abs(r.num) : r.den;
  const bits = Math.floor(Number(magnitude) * log2Above(part)) + 1;
  if (bits > limit) {
    // The exact power is what exceeds the limit; an inexact base is raised in log
    // space (ball.ts), where the exponent's size alone is the cost. The
    // need is the prediction, within a bit of the truth.
    return err({ kind: "tooLarge", inexact: "fits", need: boundOf(bits) });
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

/**
 * `log2 n` for a positive `n`, rounded up: taken on the top 53 bits of
 * `n` and the count below them, with a margin above a double's rounding,
 * so that a bit count predicted from it is never below the truth.
 */
function log2Above(n: bigint): number {
  const below = Math.max(0, bitLength(n) - 53);
  return Math.log2(Number(n >> BigInt(below))) + below + 2 ** -40;
}

/** The magnitude of a bigint. */
export function abs(n: bigint): bigint {
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
 * `b`, exported for its tests and its benchmark: the common power of two,
 * read off the trailing zeros, times Lehmer's gcd on the odd parts. On a
 * settled midpoint, a dyadic of thousands of bits over a power of two,
 * the odd parts take a step or two when one of them is small, and none
 * when both are one.
 */
export function gcd(a: bigint, b: bigint): bigint {
  if (a === 0n) return b;
  if (a === 1n || b === 1n) return 1n;
  const twosA = trailingZeros(a);
  const twosB = trailingZeros(b);
  return lehmer(a >> twosA, b >> twosB) << (twosA < twosB ? twosA : twosB);
}

/** The bits of the leading part Lehmer's steps run on: `2^51 <= x < 2^52`, so that every product below stays exact in a double. */
const LEAD_BITS = 52;

/**
 * The gcd of the positive `u` and `v` by Lehmer's algorithm (Knuth
 * 4.5.2, Algorithm L), with the steps decided as Collins and Jebelean
 * decide them. Each round takes the leading `LEAD_BITS` of the larger
 * number, `x`, and the bits of the smaller at the same shift, `y`, and
 * runs Euclid on the pair in doubles while tracking the cofactors
 * `(s, t)` with `r = s u + t v` for the remainders `r` it stands for,
 * exactly as the extended Euclid does on `(x, y)`. A simulated remainder
 * `r` stands for the full one within its cofactors' worth of the bits
 * below the shift: the full value lies above `(r + min(s, t)) 2^shift`,
 * the negative cofactor times the shifted-out bits being the most it
 * can lose, so a step is taken only while the next remainder stays at
 * or above the magnitude of its negative cofactor, which keeps every
 * full value positive. The cofactors of the steps taken are then applied
 * to the bigints, four multiplications by small numbers, which is a
 * round of about `LEAD_BITS / 2` bits of Euclid for a linear cost, where
 * Euclid's own step costs a division of the whole numbers per bit or
 * two. The doubles stay exact: for the Euclidean sequence of `(x, y)`
 * the cofactors and their products with the next quotient are bounded
 * by `x / r` for the current remainder `r`, so by `x < 2^52`. A round
 * that takes no step (a `y` of zero, the smaller number lying more than
 * `LEAD_BITS` below the larger, or a first quotient too large) is one
 * full step of Euclid, and so is one that makes no progress, which the
 * check guards against rather than relies on the analysis to exclude.
 * The bit length of the larger number is tracked from the leading bits
 * of each round's result, rather than read off `toString(2)` at each
 * round, and the pair is finished on doubles once it fits them.
 */
function lehmer(u: bigint, v: bigint): bigint {
  if (u < v) [u, v] = [v, u];
  let uBits = bitLength(u);
  for (;;) {
    if (v === 0n) return u;
    if (uBits <= 53) {
      let x = Number(u);
      let y = Number(v);
      while (y !== 0) [x, y] = [y, x % y];
      return BigInt(x);
    }
    const shift = BigInt(uBits - LEAD_BITS);
    let x = Number(u >> shift);
    let y = Number(v >> shift);
    // `(s0, t0)` are the cofactors of the remainder `x` stands for, and
    // `(s1, t1)` those of `y`; the signs alternate, so `min` is the
    // negative one.
    let s0 = 1;
    let t0 = 0;
    let s1 = 0;
    let t1 = 1;
    let steps = 0;
    while (y !== 0) {
      const q = Math.floor(x / y);
      const r = x - q * y;
      const s = s0 - q * s1;
      const t = t0 - q * t1;
      if (r + Math.min(s, t) < 0) break;
      x = y;
      y = r;
      s0 = s1;
      t0 = t1;
      s1 = s;
      t1 = t;
      steps++;
    }
    let next = 0n;
    let rest = 0n;
    if (steps > 0) {
      next = BigInt(s0) * u + BigInt(t0) * v;
      rest = BigInt(s1) * u + BigInt(t1) * v;
      if (next < rest) [next, rest] = [rest, next];
    }
    if (steps === 0 || next >= u) {
      next = v;
      rest = u % v;
      uBits = bitLength(next);
    } else {
      // The larger result is below `(x + 2^52) 2^shift`, so its leading
      // part fits a double; a result below the shift, which a round that
      // used most of its bits can give, is measured in full.
      const top = Number(next >> shift);
      uBits =
        top === 0 ? bitLength(next) : uBits - LEAD_BITS + bitLengthOf(top);
    }
    u = next;
    v = rest;
  }
}

/** The bits of the non-negative integer `n` below `2^53`. */
function bitLengthOf(n: number): number {
  let bits = 0;
  while (n >= 2 ** 32) {
    n = Math.floor(n / 2 ** 32);
    bits += 32;
  }
  return bits + 32 - Math.clz32(n);
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
