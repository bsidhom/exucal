// The one seeded random source for the tests and the benchmarks, so that
// every numeric test draws its inputs the same way, a failure reproduces
// from its seed, and no test carries a generator of its own. Nothing in the
// app imports this directory: it is test support beside the core, checked
// with the tests by tsconfig.node.json and left out of the app's program.
// docs/calculator-plan.md (task 1.3) places it; ARCHITECTURE.md
// ("Benchmarks") says what the benchmarks draw from it.
//
// The generator is mulberry32: 32 bits of state, one multiply and a few
// shifts per number, and a period of 2^32, which is small, fast and good
// enough for test data (it is not for anything else). Every draw is
// `state / 2^32` for a fresh 32-bit `state`, so `rand() * 2^32` recovers
// the 32 bits exactly, which is how `randomBigInt` builds a bigint of any
// width from whole words rather than from the leading bits of a double.

import { rational, type Rational } from "../core/rational.ts";

/** A source of numbers in `[0, 1)`, as `Math.random` is, but repeatable. */
export type Random = () => number;

/** The mulberry32 generator seeded with `seed`, taken as a 32-bit integer. */
export function random(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in `[low, high]`, inclusive of both. */
export function between(rand: Random, low: number, high: number): number {
  return low + Math.floor(rand() * (high - low + 1));
}

/**
 * A non-negative integer of at most `bits` bits, uniform over `[0, 2^bits)`:
 * the low `bits` bits of `ceil(bits / 32)` words of 32 drawn in order,
 * most significant first, so a wide integer is as random in its top word
 * as in its bottom one. `bits` must be a non-negative integer.
 */
export function randomBigInt(rand: Random, bits: number): bigint {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(`A bit count must be a non-negative integer: ${bits}`);
  }
  let value = 0n;
  for (let drawn = 0; drawn < bits; drawn += 32) {
    value = (value << 32n) | BigInt(Math.floor(rand() * 4294967296));
  }
  const excess = BigInt(-bits % 32) & 31n;
  return value >> excess;
}

/**
 * A rational `num / den × 10^e` with `|num| < 2^bits`, `0 < den <= 2^bits`
 * and `|e| <= exponent`, each uniform and the sign a coin: numbers of a few
 * digits mixed with very large and very small magnitudes, which is what a
 * test of rounding, roots or radii wants to cover. It may be zero, with
 * probability `2^-bits`; a test that needs a non-zero value checks. `bits`
 * must be positive.
 */
export function randomRational(
  rand: Random,
  bits: number,
  exponent: number,
): Rational {
  if (bits < 1) throw new RangeError(`A rational needs a bit or more: ${bits}`);
  const num = randomBigInt(rand, bits);
  const den = randomBigInt(rand, bits) + 1n;
  const scale = between(rand, -exponent, exponent);
  const signed = rand() < 0.5 ? -num : num;
  return scale >= 0
    ? rational(signed * 10n ** BigInt(scale), den)
    : rational(signed, den * 10n ** BigInt(-scale));
}
