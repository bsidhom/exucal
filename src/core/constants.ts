// The constants the kernel computes on demand: `pi` for now, `exp(1)` in
// stage 3. docs/calculator-plan.md (D10 and task 2.8) is the design and
// docs/calculator.md ("Elementary functions") the measurement behind it: no
// digits are shipped, since a thousand digits cost under a millisecond to
// compute and a stored table would cost more payload than it saves.
//
// `chudnovsky(bits)` is the Chudnovsky series with binary splitting, the
// algorithm libbf and every fast library use: the terms of
//
//   1/pi = 12 Σ (-1)^k (6k)! (13591409 + 545140134 k) / ((3k)! (k!)^3 640320^(3k + 3/2))
//
// are summed as one fraction by splitting the range of `k` in halves
// recursively, so that the big multiplications happen at the top of the
// recursion on balanced operands, and pi is `426880 sqrt(10005)` times the
// reciprocal of the sum. Each term is below the one before it by a factor
// above `1.5 × 10^14` in its factorial part (the ratio of consecutive terms
// is `(6k-5)(2k-1)(6k-1) / (k^3 × 10939058860032000)`, at most `72 /
// 10939058860032000`, which is `2^-47.1`) and by at most a factor of two
// less in its linear part, so the terms shrink by better than `2^-46`
// each; the tail of an alternating series of shrinking terms is below its
// first omitted term; and with `N = ceil((bits + 40) / 46)` terms that
// term is below `2^-(bits + 3)` of the sum, whose magnitude is above
// `2^23`, so the tail costs under an ulp of pi. The square root of 10005
// is taken by Newton on the reciprocal square root, `y ← y (3 - 10005
// y^2) / 2`, with multiplications only and the precision doubling, since
// V8 divides big integers quadratically and the integer square root of
// `fixed.ts` would cost more than the series at a hundred thousand digits;
// its error is verified by squaring the result back, within an ulp, and
// the final division truncates by less than one: the error count is three
// ulps in all, stated as such.
//
// `piFixed(bits, ceilingBits)` memoizes per D10: the module holds exactly
// one value, the digits at the ceiling of the retry schedule in force,
// computed on the first request however low, and every request at or below
// the ceiling, which is every request the loop can make, is that value with
// its low bits truncated (`truncateFixed`, an ulp for the truncation). A
// request at a higher ceiling replaces the value, a lower one leaves it, so
// the footprint is fixed by the ceiling, about 1.7 KB at the default of
// 4,040 digits, and bounded by the hard bound on the cap. A request above
// the ceiling (stage 3's argument reduction of `sin` at a large argument) is
// computed for the call and not kept. The memo is unobservable through the
// core's results, as `lazy` in parser.ts is; `piMemoBits` exposes its
// precision for the tests alone.

import { type Ball } from "./ball.ts";
import { type NumberContext } from "./context.ts";
import { bitsFor, fixedToBall, truncateFixed, type Fixed } from "./fixed.ts";

/** The bits each term of the series is worth, at least: a safe floor of `2^-46` per term. */
const BITS_PER_TERM = 46;

/** `640320^3 / 24`, the constant of the series' `q(k)`. */
const C3_OVER_24 = 10939058860032000n;

/**
 * `pi` at `bits` fraction bits by the Chudnovsky series with binary
 * splitting, uncached, with an error of three ulps as the header derives.
 * The benchmark times this; callers take `piFixed`.
 */
export function chudnovsky(bits: number): Fixed {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(
      `Fraction bits must be a non-negative integer: ${bits}`,
    );
  }
  const terms = Math.max(1, Math.ceil((bits + 40) / BITS_PER_TERM));
  const { q, t } = split(0n, BigInt(terms));
  const root = sqrt10005(bits);
  const value = (426880n * q * root.value) / t;
  return { value, error: 3n, bits };
}

/**
 * The binary splitting of the terms `a` to `b - 1`: `p` and `q` the
 * products of the terms' `p(k)` and `q(k)`, and `t` the numerator of the
 * partial sum over the common denominator `q`, with the alternating sign
 * folded in, so that the sum is `t / q`.
 */
function split(a: bigint, b: bigint): { p: bigint; q: bigint; t: bigint } {
  if (b - a === 1n) {
    const p = a === 0n ? 1n : (6n * a - 5n) * (2n * a - 1n) * (6n * a - 1n);
    const q = a === 0n ? 1n : a * a * a * C3_OVER_24;
    const t = p * (13591409n + 545140134n * a);
    return { p, q, t: a & 1n ? -t : t };
  }
  const m = (a + b) >> 1n;
  const left = split(a, m);
  const right = split(m, b);
  return {
    p: left.p * right.p,
    q: left.q * right.q,
    t: right.q * left.t + left.p * right.t,
  };
}

/**
 * `sqrt(10005)` at `bits` fraction bits, within two ulps, by Newton on the
 * reciprocal square root with multiplications only, from a double and
 * doubling the precision each step, forty bits beyond `bits`, since the
 * root is the reciprocal times 10005, which scales the reciprocal's ulp
 * error by 10005 and the guard absorbs. The result is verified by
 * squaring: `|s - sqrt(a)| = |s^2 - a| / (s + sqrt(a))`, and both are above
 * 99, so the error in ulps is the squared difference's, in ulps, over 198,
 * plus the squaring's own truncation; truncated to `bits` it is within two
 * ulps, or the iteration did not converge, which is a bug.
 */
function sqrt10005(bits: number): Fixed {
  const a = 10005n;
  const target = bits + 40;
  let precision = 48;
  let y = BigInt(Math.floor(2 ** precision / Math.sqrt(10005)));
  for (;;) {
    const next = Math.min(2 * precision, target);
    y <<= BigInt(next - precision);
    precision = next;
    const shift = BigInt(precision);
    const y2 = (y * y) >> shift;
    y = (y * ((3n << shift) - a * y2)) >> (shift + 1n);
    if (precision === target) break;
  }
  // Twice more at the full precision, for the last bits the doubling left.
  const shift = BigInt(precision);
  for (let i = 0; i < 2; i++) {
    const y2 = (y * y) >> shift;
    y = (y * ((3n << shift) - a * y2)) >> (shift + 1n);
  }
  const s = a * y;
  const squared = (s * s) >> shift;
  const off = squared - (a << shift);
  const difference = (off < 0n ? -off : off) + 1n;
  const error = difference / 198n + 1n;
  const root = truncateFixed({ value: s, error, bits: precision }, bits);
  if (root.error > 2n) {
    throw new Error("The reciprocal square root did not converge");
  }
  return root;
}

/** The one value the module holds: pi at the ceiling in force, or nothing yet. */
let memo: Fixed | undefined;

/**
 * `pi` at `bits` fraction bits, from the memo at `ceilingBits` (D10): the
 * memo is computed at `ceilingBits` on the first request at or below it,
 * replaced when a higher ceiling is asked for, and truncated to `bits` for
 * every request it covers; a request above the ceiling is computed for the
 * call and not kept.
 */
export function piFixed(bits: number, ceilingBits: number): Fixed {
  if (bits > ceilingBits) return chudnovsky(bits);
  if (memo === undefined || memo.bits < ceilingBits) {
    memo = chudnovsky(ceilingBits);
  }
  return memo.bits === bits ? memo : truncateFixed(memo, bits);
}

/** The ball of `pi` at the precision of `context`, from the memo at the context's ceiling. */
export function piBall(context: NumberContext): Ball {
  return fixedToBall(
    piFixed(bitsFor(context.precision), bitsFor(context.ceiling)),
  );
}

/** The fraction bits of the value the memo holds, or `undefined` before the first request; for the tests. */
export function piMemoBits(): number | undefined {
  return memo?.bits;
}
