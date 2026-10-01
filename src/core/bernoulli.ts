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
// hundred at a thousand digits and fifteen hundred at the default ceiling
// of 4,040, where the recurrence costs a second or two once. The memo
// holds the largest count asked for, as the constants of D10 hold the
// ceiling's digits: a larger request recomputes the whole run, since the
// recurrence is in place, and a smaller one is served from it; the run
// is a few megabytes at the ceiling and bounded by it.

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

/** How far past the count asked for the memo is computed: a quarter, since the recurrence's cost is in its largest numbers. */
const MEMO_SLACK = 1.25;

let held: readonly Rational[] = [];

/**
 * `B_2k` for `k >= 1`, exact, from the memo, which grows to hold it: the
 * run is recomputed to a quarter past the count asked for when it falls
 * short, so that a series taking a few more terms does not recompute it
 * each time, while the ceiling pass, whose count is about twice the
 * pass before it, pays for little it does not use.
 */
export function bernoulli(k: number): Rational {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError(`The Bernoulli numbers are indexed from 1: ${k}`);
  }
  if (k > held.length) {
    const count = Math.max(Math.ceil(k * MEMO_SLACK), 32);
    const t = tangentNumbers(count);
    const run: Rational[] = [];
    for (let i = 1; i <= count; i++) run.push(fromTangent(i, t[i]!));
    held = run;
  }
  return held[k - 1]!;
}

/** The count the memo holds, for the tests. */
export function bernoulliMemoCount(): number {
  return held.length;
}
