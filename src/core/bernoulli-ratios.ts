// The ratios of consecutive Bernoulli numbers, `|B_(2k+2) / B_2k|`, in
// fixed point, memoized: what the asymptotic series of `digamma` and
// `lgamma` take (fixed-gamma.ts; devdocs/design/special.md, "Bernoulli numbers"),
// each term being the last times the ratio, an index factor and `1 /
// y^2`. The exact numbers (bernoulli.ts) served the series before #117,
// and a term was scaled by a numerator of twenty thousand bits and
// divided by the denominator, more work than the precision warranted,
// while the memo of exact rationals held about 1.8 MB at the default
// ceiling. A ratio at the working bits makes the same term with two
// multiplications at those bits, and the terms shrink down the series,
// so a ratio need hold only the bits the term it makes still needs: the
// k-th term is of the order of `2^-m_k` of the sum, so its multipliers
// need `working - m_k` fraction bits plus a guard, which the first ratios
// take in full and the last in a few hundred; the memo is about 1 MB at
// the default ceiling, where it would be 2.4 MB at full width.
//
// The memo holds one run, by the count the series reserve (`ratioSource`)
// and the bits it serves, and grows on either, as the exact numbers grew
// by count: a pass that needs more terms than the last recomputes the
// run anyway, and a pass at the same count but more bits, a large
// argument at a high pass, is rare and costs a run of its count. The bits
// a run serves are the bits asked for plus `MEMO_MARGIN`, the guard the
// kernels stack above a pass, for the same reason the constants hold it
// (constants.ts): the run the first ceiling pass builds then serves the
// ceiling pass of every `gamma`, and of `beta` at arguments of moderate
// size, without a rebuild. The precision of the k-th ratio is set from
// Stirling's series for `ln Γ`, whose terms and index factors are the
// larger of the two series, at the smallest shifted argument a call at
// the run's bits can have; a call at fewer bits needs fewer bits of every
// ratio it takes, since its terms are of its own working bits, which
// fall faster with the bits than the shifted argument's logarithm raises
// the terms (the prototype in #117 measured the slack at every size, and
// the series' own error accounting carries a ratio's truncation whatever
// its bits, so a shortfall would loosen a bound and never break it). A
// request beyond the run, a prediction's shortfall, grows it by a quarter
// as the exact memo grew, and `ratioGrowths` counts it for the tests.
//
// The ratios come from the exact numbers of one run (`bernoulliRun`),
// each a division truncated at its bits, within an ulp; the run is
// released once the ratios are formed. The tangent-number run is the
// cost of a reservation, a few seconds at the ceiling once per count,
// and the divisions a tenth of a second for all of them. `termLog2s`,
// the floating-point model of the terms that the schedule here and the
// series' prediction of its count share, is here so that both size from
// one source.

import { bernoulliRun } from "./bernoulli.ts";
import { MEMO_MARGIN } from "./constants.ts";
import type { Fixed } from "./fixed.ts";
import { abs, bitLength } from "./rational.ts";

/** The index factor of a series' recurrence: `t_(k+1) = t_k × w × |B_(2k+2) / B_2k| × num / den` for `[num, den]`. */
export type IndexFactor = (k: number) => readonly [bigint, bigint];

/** Stirling's series for `ln Γ`: `num / den` is `2k (2k - 1) / ((2k + 2) (2k + 1))`, the larger of the two series' factors, which sizes the memo. */
export const STIRLING_FACTOR: IndexFactor = (k) => [
  BigInt(2 * k * (2 * k - 1)),
  BigInt((2 * k + 2) * (2 * k + 1)),
];

/** The bits a ratio holds beyond those of the term it makes and the factor's, so that its truncation is under `2^-16` of an ulp of the product. */
export const RATIO_GUARD = 16;

/** How far past the index asked for a run beyond its count is grown: a quarter, as the exact memo grew, since the recurrence's cost is in its largest numbers. */
const GROWTH = 1.25;

const LOG2_TWO_PI_SQUARED = Math.log2(4 * Math.PI * Math.PI);

/**
 * `log2` of bounds above the terms `|t_1|, |t_2|, …` of a series whose
 * first term is below `2^log2First` and whose `w` is below `2^log2W`,
 * for the index factors `factor` gives, in the scale of `log2First`:
 * `|B_(2k+2) / B_2k|` is `(2k+1)(2k+2) ζ(2k+2) / (ζ(2k) (2π)^2)`, below
 * `(2k+1)(2k+2) / (2π)^2` since `ζ` decreases, and the product of these
 * bounds over the series overstates a term by at most `ζ(2) / ζ(2k)`,
 * under one bit.
 */
export function* termLog2s(
  log2First: number,
  log2W: number,
  factor: IndexFactor,
): Generator<number, never, void> {
  let term = log2First;
  for (let k = 1; ; k++) {
    yield term;
    const [num, den] = factor(k);
    term +=
      Math.log2((2 * k + 1) * (2 * k + 2)) -
      LOG2_TWO_PI_SQUARED +
      Math.log2(Number(num) / Number(den)) +
      log2W;
  }
}

/** `log2` of a bound above the positive `n`: its top 53 bits plus one, scaled back. */
export function log2Above(n: bigint): number {
  const length = bitLength(n);
  if (length <= 53) return Math.log2(Number(n));
  const shift = length - 53;
  return Math.log2(Number((n >> BigInt(shift)) + 1n)) + shift;
}

/**
 * The fraction bits each of `count` ratios holds in a run serving calls
 * at up to `bits` working bits, as the header says: the bits of
 * Stirling's k-th term at `bits`, at the smallest shifted argument such
 * a call can have (a third of the bits less the shift's own guard), one
 * more for the computed term's error, the factor's numerator's bits and
 * the guard; within the run's bits, and at least the guard.
 */
function schedule(bits: number, count: number): number[] {
  const y = Math.max(2, Math.floor((bits - 40) / 3));
  const held: number[] = [];
  let k = 0;
  for (const log2 of termLog2s(
    -Math.log2(12 * y),
    -2 * Math.log2(y),
    STIRLING_FACTOR,
  )) {
    if (++k > count) break;
    const [num] = STIRLING_FACTOR(k);
    const needed = Math.ceil(log2 + bits) + 1 + bitLength(num) + RATIO_GUARD;
    held.push(Math.min(bits, Math.max(RATIO_GUARD, needed)));
  }
  return held;
}

/** A run: `|B_(2k+2) / B_2k|` for `k = 1 … count`, each within an ulp at its bits of `bits`. */
function build(count: number, bits: readonly number[]): readonly Fixed[] {
  const numbers = bernoulliRun(count + 1);
  const ratios: Fixed[] = [];
  for (let k = 1; k <= count; k++) {
    const b = numbers[k - 1]!;
    const next = numbers[k]!;
    const held = bits[k - 1]!;
    const value =
      ((abs(next.num) * b.den) << BigInt(held)) / (abs(b.num) * next.den);
    ratios.push({ value, error: 1n, bits: held });
  }
  return ratios;
}

/** The run held: the working bits it serves, and the ratios. */
let memo: { readonly bits: number; readonly ratios: readonly Fixed[] } = {
  bits: 0,
  ratios: [],
};

/** How many times a request beyond the run grew it, for the tests. */
let growths = 0;

/** The k-th ratio of a run, `|B_(2k+2) / B_2k|` within an ulp at the bits it holds. */
export type RatioSource = (k: number) => Fixed;

/**
 * The ratios a series of `count` terms at `working` bits takes: the run
 * held, built or rebuilt when it holds fewer ratios or serves fewer bits
 * than asked, at the larger of the counts and, when its bits fall short,
 * the bits asked for plus the margin; a `k` beyond the run grows it by a
 * quarter past `k`.
 */
export function ratioSource(count: number, working: number): RatioSource {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`A count must be a positive integer: ${count}`);
  }
  if (!Number.isInteger(working) || working < 1) {
    throw new RangeError(`Working bits must be a positive integer: ${working}`);
  }
  if (memo.bits < working || memo.ratios.length < count) {
    const bits = memo.bits < working ? working + MEMO_MARGIN : memo.bits;
    const held = Math.max(count, memo.ratios.length);
    memo = { bits, ratios: build(held, schedule(bits, held)) };
  }
  return (k) => {
    const ratio = memo.ratios[k - 1];
    if (ratio !== undefined) return ratio;
    growths++;
    const held = Math.ceil(k * GROWTH);
    memo = { bits: memo.bits, ratios: build(held, schedule(memo.bits, held)) };
    return memo.ratios[k - 1]!;
  };
}

/** The count of ratios the run holds, for the tests. */
export function ratioMemoCount(): number {
  return memo.ratios.length;
}

/** The working bits the run serves, zero before the first request, for the tests. */
export function ratioMemoBits(): number {
  return memo.bits;
}

/** The bits the k-th ratio of the run holds, or `undefined` beyond it, for the tests. */
export function ratioBits(k: number): number | undefined {
  return memo.ratios[k - 1]?.bits;
}

/** How many times a request beyond the run grew it, for the tests. */
export function ratioGrowths(): number {
  return growths;
}
