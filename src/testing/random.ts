// The one seeded random source for the tests and the benchmarks, purely
// applicative: a value is a function of a key, never of what was drawn
// before it, so that every seeded input is reproducible from its key
// alone, no test depends on the order of its draws, and a draw can be
// pulled out of a loop or reordered without moving every draw after it.
// Nothing in the app imports this directory: it is test support beside
// the core, checked with the tests by tsconfig.node.json and left out of
// the app's program. docs/calculator-plan.md (task 1.3 and the follow-up
// after stage 3) places it; ARCHITECTURE.md ("Benchmarks") says what the
// benchmarks draw from it.
//
// The design is JAX's. A `Key` is two 32-bit words. `split(key, n)` makes
// `n` new keys from one, `foldIn(key, i)` makes the key for the `i`-th of
// something (the `i`-th candidate of a loop, the `i`-th field of a
// composite draw), and every drawing function takes a key and returns the
// same value for the same key. The bits behind all of them come from
// threefry2x32 (Random123; the block cipher JAX's generator uses), twenty
// rounds of add, rotate and xor on two 32-bit words: `threefry2x32(key,
// counter)` is a bijection of the counter under a fixed key, so distinct
// counters give distinct 64-bit blocks, and the three uses here are told
// apart by the counter's second word, 0 for the words of a key's stream
// (the first word counts the block), 1 for its split keys and 2 for keys
// folded in. A composite draw (`randomRational` needs a numerator, a
// denominator, a scale and a sign) folds its fields in by index, so that
// changing how one field is drawn changes no other.
//
// mulberry32, the stateful generator this replaces, was a closure over 32
// bits of state, a value being whatever came next; the containment tests
// drew their arguments from it in a fixed order that the tests could not
// vary without changing every argument after the change. A key carries no
// state, and the cost of a block, a few hundred integer operations, is
// nothing against the arithmetic every draw feeds.

import { exact, type Ball } from "../core/ball.ts";
import { fromRational } from "../core/scaled.ts";
import { radiusAbove } from "../core/radius.ts";
import {
  ONE,
  absolute,
  isZero,
  multiply,
  rational,
  type Rational,
} from "../core/rational.ts";

/** A key: two 32-bit words, from which every draw is a pure function. */
export type Key = readonly [number, number];

/** The key for `seed`, a non-negative safe integer: its high and low 32 bits. */
export function key(seed: number): Key {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError(`A seed must be a non-negative safe integer: ${seed}`);
  }
  return [Math.floor(seed / 2 ** 32) >>> 0, seed >>> 0];
}

const ROTATIONS_EVEN = [13, 15, 26, 6] as const;
const ROTATIONS_ODD = [17, 29, 16, 24] as const;
const PARITY = 0x1bd11bda;

/**
 * Threefry-2x32 with twenty rounds, as Random123 specifies it: the two
 * words of `counter` encrypted under `key`. Exported for the tests, which
 * check it against the published vectors.
 */
export function threefry2x32(
  key: Key,
  counter: readonly [number, number],
): [number, number] {
  const ks = [key[0] >>> 0, key[1] >>> 0, (key[0] ^ key[1] ^ PARITY) >>> 0];
  let x0 = (counter[0] + ks[0]!) >>> 0;
  let x1 = (counter[1] + ks[1]!) >>> 0;
  const rounds = (rotations: readonly number[]): void => {
    for (const r of rotations) {
      x0 = (x0 + x1) >>> 0;
      x1 = ((x1 << r) | (x1 >>> (32 - r))) >>> 0;
      x1 = (x1 ^ x0) >>> 0;
    }
  };
  for (let group = 1; group <= 5; group++) {
    rounds(group % 2 === 1 ? ROTATIONS_EVEN : ROTATIONS_ODD);
    x0 = (x0 + ks[group % 3]!) >>> 0;
    x1 = (x1 + ks[(group + 1) % 3]! + group) >>> 0;
  }
  return [x0, x1];
}

/** `count` keys from `key`, each independent of the others and of `key`'s own draws. */
export function split(key: Key, count = 2): Key[] {
  if (!Number.isInteger(count) || count < 0 || count > 2 ** 32) {
    throw new RangeError(
      `A count of keys must be a non-negative integer: ${count}`,
    );
  }
  return Array.from({ length: count }, (_, i) => threefry2x32(key, [i, 1]));
}

/** The key for the `data`-th thing under `key`, for a non-negative integer `data` below 2^32. */
export function foldIn(key: Key, data: number): Key {
  if (!Number.isInteger(data) || data < 0 || data >= 2 ** 32) {
    throw new RangeError(`Folded-in data must be a 32-bit integer: ${data}`);
  }
  return threefry2x32(key, [data, 2]);
}

/** The first `count` 32-bit words of `key`'s stream, two per block. */
export function words(key: Key, count: number): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `A word count must be a non-negative integer: ${count}`,
    );
  }
  const result: number[] = [];
  for (let block = 0; result.length < count; block++) {
    const [a, b] = threefry2x32(key, [block, 0]);
    result.push(a);
    if (result.length < count) result.push(b);
  }
  return result;
}

/** A number in `[0, 1)` with 32 bits of resolution: `key`'s first word over `2^32`. */
export function uniform(key: Key): number {
  return words(key, 1)[0]! / 4294967296;
}

/** An integer in `[low, high]`, inclusive of both. */
export function between(key: Key, low: number, high: number): number {
  return low + Math.floor(uniform(key) * (high - low + 1));
}

/**
 * A non-negative integer of at most `bits` bits, uniform over `[0, 2^bits)`:
 * the low `bits` bits of `ceil(bits / 32)` words of `key`'s stream in
 * order, most significant first, so a wide integer is as random in its
 * top word as in its bottom one. `bits` must be a non-negative integer.
 */
export function randomBigInt(key: Key, bits: number): bigint {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(`A bit count must be a non-negative integer: ${bits}`);
  }
  let value = 0n;
  for (const word of words(key, Math.ceil(bits / 32))) {
    value = (value << 32n) | BigInt(word);
  }
  const excess = BigInt(-bits % 32) & 31n;
  return value >> excess;
}

/**
 * A rational `num / den × 10^e` with `|num| < 2^bits`, `0 < den <= 2^bits`
 * and `|e| <= exponent`, each uniform and the sign a coin, every one from
 * its own key folded in: numbers of a few digits mixed with very large and
 * very small magnitudes, which is what a test of rounding, roots or radii
 * wants to cover. It may be zero, with probability `2^-bits`; a test that
 * needs a non-zero value checks. `bits` must be positive.
 */
export function randomRational(
  key: Key,
  bits: number,
  exponent: number,
): Rational {
  if (bits < 1) throw new RangeError(`A rational needs a bit or more: ${bits}`);
  const num = randomBigInt(foldIn(key, 0), bits);
  const den = randomBigInt(foldIn(key, 1), bits) + 1n;
  const scale = between(foldIn(key, 2), -exponent, exponent);
  const signed = uniform(foldIn(key, 3)) < 0.5 ? -num : num;
  return scale >= 0
    ? rational(signed * 10n ** BigInt(scale), den)
    : rational(signed, den * 10n ** BigInt(-scale));
}

/**
 * A ball whose midpoint is `randomRational` of the key's first field: exact
 * one time in four, and otherwise with a radius of `10^-k` of the
 * midpoint's magnitude (of one, for a zero midpoint) for `k` in `[1, 15]`,
 * rounded up to a radius, so that most balls exclude zero and a division
 * or a negative power of one is defined. The radius is never unbounded; a
 * test that wants an unbounded ball writes one.
 */
export function randomBall(key: Key, bits: number, exponent: number): Ball {
  const mid = randomRational(foldIn(key, 0), bits, exponent);
  if (uniform(foldIn(key, 1)) < 0.25) return exact(fromRational(mid));
  const scale = isZero(mid) ? ONE : absolute(mid);
  const k = BigInt(between(foldIn(key, 2), 1, 15));
  return {
    mid: fromRational(mid),
    rad: radiusAbove(multiply(scale, rational(1n, 10n ** k))),
  };
}
