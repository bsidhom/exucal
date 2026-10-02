// The Bernoulli numbers, exact rationals, memoized by count: `B_2k` for the
// asymptotic series of `digamma` and `lgamma` (fixed-gamma.ts;
// docs/special.md, "Bernoulli numbers"). They are computed from the
// tangent numbers `T_k`, the integers in `tan x = Σ T_k x^(2k-1) / (2k-1)!`,
// by the in-place recurrence of Brent and Zimmermann (Modern Computer
// Arithmetic, algorithm TangentNumbers), `O(K^2)` additions of integers
// of `O(K log K)` bits for the first `K` of them, and
//
//   B_2k = (-1)^(k-1) 2k T_k / (2^2k (2^2k - 1)),
//
// which `rational` reduces. Nothing about them depends on the precision
// but the count: a series at `bits` working bits with the argument
// shifted to about `bits / 3` takes about `bits / 9` terms, some three
// hundred at a thousand digits and fourteen hundred at the default
// ceiling of 4,040, where the recurrence costs a few seconds once. The
// memo holds the largest count asked for, as the constants of D10 hold
// the ceiling's digits: a larger request recomputes the whole run, since
// the recurrence is in place, and a smaller one is served from it; the
// run is under two megabytes at the ceiling and bounded by it. A caller
// that knows its count reserves it first (`reserveBernoulli`), which the
// series does from a prediction of its terms (fixed-gamma.ts), so that
// each pass that needs more numbers than the last computes one run, for
// the count it will take; `bernoulli` beyond the memo is the fallback,
// growing it by a quarter past the index asked for, which is what every
// request did before the reservation and had a cold ceiling pass
// recompute the run five times over (#117).

import { rational, type Rational } from "./rational.ts";

/** The tangent numbers `T_1 … T_count`, at indices `1 … count`. */
export function tangentNumbers(count: number): readonly bigint[] {
  const t = new Array<bigint>(count + 1).fill(0n);
  if (count >= 1) t[1] = 1n;
  for (let k = 2; k <= count; k++) t[k] = BigInt(k - 1) * t[k - 1]!;
  for (let k = 2; k <= count; k++) {
    for (let j = k; j <= count; j++) {
      t[j] = BigInt(j - k) * t[j - 1]! + BigInt(j - k + 2) * t[j]!;
    }
  }
  return t;
}

/** `B_2k` from the tangent number `T_k`, for `k >= 1`. */
function fromTangent(k: number, t: bigint): Rational {
  const twoK = BigInt(2 * k);
  const power = 1n << twoK;
  const num = (k % 2 === 1 ? twoK : -twoK) * t;
  return rational(num, power * (power - 1n));
}

/** How far past the index asked for the fallback grows the memo: a quarter, since the recurrence's cost is in its largest numbers. */
const MEMO_SLACK = 1.25;

let held: readonly Rational[] = [];

/** How many runs `bernoulli` computed on its own, beyond the memo and any reservation; for the tests. */
let growths = 0;

/** Replaces the memo with the run of the first `count` numbers. */
function compute(count: number): void {
  const t = tangentNumbers(count);
  const run: Rational[] = [];
  for (let i = 1; i <= count; i++) run.push(fromTangent(i, t[i]!));
  held = run;
}

/**
 * Computes the run to hold `count` numbers when the memo holds fewer,
 * exactly that many: for a caller that knows the count it will take, so
 * that the memo is computed once for a pass rather than grown as the
 * terms ask for it. A count the memo already holds leaves it.
 */
export function reserveBernoulli(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`A count must be a non-negative integer: ${count}`);
  }
  if (count > held.length) compute(count);
}

/**
 * `B_2k` for `k >= 1`, exact, from the memo, which grows to hold it: a
 * request beyond the memo recomputes the run to a quarter past the index
 * asked for, the fallback for a caller that did not reserve its count,
 * so that a few more requests do not recompute it each time.
 */
export function bernoulli(k: number): Rational {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError(`The Bernoulli numbers are indexed from 1: ${k}`);
  }
  if (k > held.length) {
    growths++;
    compute(Math.max(Math.ceil(k * MEMO_SLACK), 32));
  }
  return held[k - 1]!;
}

/** The count the memo holds, for the tests. */
export function bernoulliMemoCount(): number {
  return held.length;
}

/** How many times `bernoulli` grew the memo on its own, a request beyond it and any reservation; for the tests. */
export function bernoulliGrowths(): number {
  return growths;
}
