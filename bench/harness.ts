// What the benchmarks share: a way to draw names from the seeded random
// source of src/testing/random.ts, which the tests share, so that every run
// measures the same synthetic data (a name is a pure function of its key,
// as every draw is), and a timer that takes the best of
// several runs, the estimate least disturbed by whatever else the machine is
// doing. devdocs/benchmarks.md describes the benchmarks, what they are
// for, and how and when to run them.
//
// A benchmark reports its timings as diagnostics, for a person to compare
// between runs, and asserts only how a cost scales with the size of its
// input: a ratio between two sizes measured in the same run holds on any
// machine, where a timing in milliseconds does not.

import { words, type Key } from "../src/testing/random.ts";

/** A word of `length` letters drawn from `alphabet`, one per word of `key`'s stream. */
export function word(key: Key, alphabet: string, length: number): string {
  return words(key, length)
    .map((w) => alphabet[Math.floor((w / 2 ** 32) * alphabet.length)])
    .join("");
}

/**
 * The shortest of `runs` timings of `f`, in milliseconds, after one run
 * that is not timed, so that whatever warms up on first use has.
 */
export function bestOf(runs: number, f: () => void): number {
  f();
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    f();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

/** `ms` for a report: two decimals, with the unit. */
export function millis(ms: number): string {
  return `${ms.toFixed(2)} ms`;
}
