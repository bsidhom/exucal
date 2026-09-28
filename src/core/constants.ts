// The constants the kernel computes on demand and memoizes: `pi` and `e`
// (`exp(1)`); the logarithms' `ln(2)` and `ln(10)` are memoized the same
// way in fixed-log.ts, which computes them. docs/calculator-plan.md (D10,
// tasks 2.8 and 3.6) is the design and docs/calculator.md ("Elementary
// functions") the measurement behind it: no digits are shipped, since a
// thousand digits cost under a millisecond to compute and a stored table
// would cost more payload than it saves.
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
// `eSeries(bits)` is `Σ 1/n!` by binary splitting, the same recursion on
// `Q(a, b) = Π n` and `T(a, b) = Σ Π m`, with the tail `Σ_{n > N} 1/n!`
// below `2 / (N + 1)!`, so `N` is the least count with `(N + 1)!` above
// `2^(bits + 2)`, and the error is two ulps, one for the tail and one for
// the final truncation.
//
// `piFixed(bits, ceilingBits)` and `eFixed(bits, ceilingBits)` memoize per
// D10, by one rule (`memoAtCeiling`): each holds exactly one value, the
// digits at the ceiling of the retry schedule in force plus a margin of
// `MEMO_MARGIN` bits, computed on the first request however low, and every
// request at or below that, which is every request the loop can make, is
// that value with its low bits truncated (`truncateFixed`, an ulp for the
// truncation). A request at a higher ceiling replaces the value, a lower
// one leaves it, so the footprint is fixed by the ceiling, about 1.7 KB
// per constant at the default of 4,040 digits, and bounded by the hard
// bound on the cap. The margin is for the argument reduction of `sin` and
// `cos` (3.9), which needs pi to the working bits plus the argument's bit
// length: at the ceiling pass that exceeds the ceiling by the argument's
// bit length, so without the margin every `sin(1 radian)` would recompute
// pi there; with it, every argument below `2^64` is served from the memo
// at every pass. A request above the memo (the reduction at a larger
// argument) is computed for the call and not kept. The memos are
// unobservable through the core's results, as `lazy` in parser.ts is;
// `piMemoBits` and `eMemoBits` expose their precision for the tests alone.

import type { Ball } from "./ball.ts";
import type { NumberContext } from "./context.ts";
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

/**
 * `e` at `bits` fraction bits by the series `Σ 1/n!` with binary
 * splitting, uncached, with an error of two ulps as the header derives.
 */
export function eSeries(bits: number): Fixed {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(
      `Fraction bits must be a non-negative integer: ${bits}`,
    );
  }
  // The least N with (N + 1)! above 2^(bits + 2).
  let terms = 1;
  for (let log2 = 0; log2 <= bits + 2; terms++) {
    log2 += Math.log2(terms + 1);
  }
  const { q, t } = splitFactorials(1n, BigInt(terms) + 1n);
  const scale = 1n << BigInt(bits);
  return { value: scale + (t * scale) / q, error: 2n, bits };
}

/**
 * The binary splitting of `Σ_{n = a}^{b - 1} 1 / (a (a + 1) ... n)`: `q`
 * the product of `a` to `b - 1`, and `t` the numerator of the sum over
 * it, so that from `a = 1` the sum is `Σ 1 / n!`.
 */
function splitFactorials(a: bigint, b: bigint): { q: bigint; t: bigint } {
  if (b - a === 1n) return { q: a, t: 1n };
  const m = (a + b) >> 1n;
  const left = splitFactorials(a, m);
  const right = splitFactorials(m, b);
  return { q: left.q * right.q, t: left.t * right.q + right.t };
}

/**
 * The bits a memo holds beyond the ceiling, so that the argument reduction
 * of the trigonometric functions at the ceiling pass is served from it for
 * arguments below `2^64` (D10).
 */
export const MEMO_MARGIN = 64;

/** A constant memoized at the ceiling: its value at `bits` under `ceilingBits`, and the bits it holds. */
type Memo = {
  readonly at: (bits: number, ceilingBits: number) => Fixed;
  readonly bits: () => number | undefined;
};

/**
 * The memo rule of D10 over `compute`, a constant at any bits: one value
 * is held, computed at `ceilingBits` plus the margin on the first request
 * at or below that, replaced when a higher ceiling is asked for, and
 * truncated to `bits` for every request it covers; a request above it is
 * computed for the call and not kept.
 */
export function memoAtCeiling(compute: (bits: number) => Fixed): Memo {
  let held: Fixed | undefined;
  return {
    at: (bits, ceilingBits) => {
      const wanted = ceilingBits + MEMO_MARGIN;
      if (bits > wanted) return compute(bits);
      if (held === undefined || held.bits < wanted) held = compute(wanted);
      return held.bits === bits ? held : truncateFixed(held, bits);
    },
    bits: () => held?.bits,
  };
}

const piMemo = memoAtCeiling(chudnovsky);
const eMemo = memoAtCeiling(eSeries);

/** `pi` at `bits` fraction bits, from the memo at `ceilingBits` plus the margin (D10). */
export function piFixed(bits: number, ceilingBits: number): Fixed {
  return piMemo.at(bits, ceilingBits);
}

/** `e` at `bits` fraction bits, from the memo at `ceilingBits` plus the margin (D10). */
export function eFixed(bits: number, ceilingBits: number): Fixed {
  return eMemo.at(bits, ceilingBits);
}

/** The ball of `pi` at the precision of `context`, from the memo at the context's ceiling. */
export function piBall(context: NumberContext): Ball {
  return fixedToBall(
    piFixed(bitsFor(context.precision), bitsFor(context.ceiling)),
  );
}

/** The ball of `e` at the precision of `context`, from the memo at the context's ceiling. */
export function eBall(context: NumberContext): Ball {
  return fixedToBall(
    eFixed(bitsFor(context.precision), bitsFor(context.ceiling)),
  );
}

/** The fraction bits of the value the memo of `pi` holds, or `undefined` before the first request; for the tests. */
export function piMemoBits(): number | undefined {
  return piMemo.bits();
}

/** The fraction bits of the value the memo of `e` holds, or `undefined` before the first request; for the tests. */
export function eMemoBits(): number | undefined {
  return eMemo.bits();
}
