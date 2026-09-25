// What the benchmarks share: a deterministic random source, so that every
// run measures the same synthetic data, and a timer that takes the best of
// several runs, the estimate least disturbed by whatever else the machine is
// doing. ARCHITECTURE.md ("Benchmarks") describes the benchmarks and what
// they are for; README.md says how and when to run them.
//
// A benchmark reports its timings as diagnostics, for a person to compare
// between runs, and asserts only how a cost scales with the size of its
// input: a ratio between two sizes measured in the same run holds on any
// machine, where a timing in milliseconds does not.

/** A source of numbers in `[0, 1)`, as `Math.random` is, but repeatable. */
export type Random = () => number;

/** The mulberry32 generator: small, fast, and good enough for test data. */
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

/** A word of `length` letters drawn from `alphabet`. */
export function word(rand: Random, alphabet: string, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return s;
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
