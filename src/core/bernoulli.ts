// The Bernoulli numbers, exact rationals: `B_2k`, which the asymptotic
// series of `digamma` and `lgamma` take through the ratios of consecutive
// ones (bernoulli-ratios.ts; docs/special.md, "Bernoulli numbers"). They
// are computed from the tangent numbers `T_k`, the integers in `tan x = Σ
// T_k x^(2k-1) / (2k-1)!`, by the in-place recurrence of Brent and
// Zimmermann (Modern Computer Arithmetic, algorithm TangentNumbers),
// `O(K^2)` additions of integers of `O(K log K)` bits for the first `K`
// of them, and
//
//   B_2k = (-1)^(k-1) 2k T_k / (2^2k (2^2k - 1)),
//
// which `rational` reduces. Nothing about them depends on the precision
// but the count: a series at `bits` working bits with the argument
// shifted to about `bits / 3` takes about `bits / 9` terms, some three
// hundred at a thousand digits and fourteen hundred at the default
// ceiling of 4,040, where the recurrence costs a few seconds once. A run
// is computed on request (`bernoulliRun`) and not kept here: the ratio
// memo forms its fixed-point ratios from one and releases it, which holds
// about 1 MB at the default ceiling where the exact numbers held 1.8
// (#117, which also had the series reserve the count it will take, so
// that a pass needing more numbers than the last computes one run).

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

/**
 * The first `count` Bernoulli numbers, `B_2 … B_2count`, exact, from one
 * run of the recurrence, uncached; a count of zero is the empty run.
 */
export function bernoulliRun(count: number): readonly Rational[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`A count must be a non-negative integer: ${count}`);
  }
  const t = tangentNumbers(count);
  const run: Rational[] = [];
  for (let k = 1; k <= count; k++) run.push(fromTangent(k, t[k]!));
  return run;
}

/** `B_2k` for `k >= 1`, exact: the last of the run to `k`, uncached. */
export function bernoulli(k: number): Rational {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError(`The Bernoulli numbers are indexed from 1: ${k}`);
  }
  return bernoulliRun(k)[k - 1]!;
}
