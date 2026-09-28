import assert from "node:assert/strict";
import { test } from "node:test";
import { isExact } from "../core/ball.ts";
import { radiusUpper } from "../core/radius.ts";
import { absolute, compare, multiply, rational } from "../core/rational.ts";
import { fromRational } from "../core/scaled.ts";
import {
  between,
  foldIn,
  key,
  randomBall,
  randomBigInt,
  randomRational,
  split,
  threefry2x32,
  uniform,
  words,
} from "./random.ts";
import { fraction } from "./scaled.ts";

test("threefry2x32 matches the published vectors", () => {
  // Random123's known-answer vectors for threefry2x32 with twenty rounds,
  // the ones JAX checks its generator against.
  const hex = (pair: readonly [number, number]) =>
    pair.map((w) => w.toString(16).padStart(8, "0"));
  assert.deepEqual(hex(threefry2x32([0, 0], [0, 0])), ["6b200159", "99ba4efe"]);
  assert.deepEqual(
    hex(threefry2x32([0xffffffff, 0xffffffff], [0xffffffff, 0xffffffff])),
    ["1cb996fc", "bb002be7"],
  );
  assert.deepEqual(
    hex(threefry2x32([0x13198a2e, 0x03707344], [0x243f6a88, 0x85a308d3])),
    ["c4923a9c", "483df7a0"],
  );
});

test("a key is a pure function of its seed, and every draw a pure function of its key", () => {
  assert.deepEqual(key(42), [0, 42]);
  assert.deepEqual(key(2 ** 32 + 7), [1, 7]);
  assert.deepEqual(key(0xffffffff), [0, 0xffffffff]);
  assert.throws(() => key(-1), RangeError);
  assert.throws(() => key(1.5), RangeError);
  const a = key(42);
  assert.deepEqual(words(a, 5), words(key(42), 5));
  assert.notDeepEqual(words(a, 5), words(key(43), 5));
  assert.deepEqual(randomRational(a, 24, 12), randomRational(key(42), 24, 12));
  assert.deepEqual(randomBall(a, 24, 12), randomBall(key(42), 24, 12));
  // Words come two a block, in order, and a shorter request is a prefix.
  assert.deepEqual(words(a, 3), words(a, 5).slice(0, 3));
  assert.deepEqual(words(a, 2), [...threefry2x32(a, [0, 0])]);
  assert.deepEqual(words(a, 4).slice(2), [...threefry2x32(a, [1, 0])]);
  assert.deepEqual(words(a, 0), []);
  for (const w of words(a, 100)) {
    assert.ok(Number.isInteger(w) && w >= 0 && w < 2 ** 32);
  }
  const u = uniform(a);
  assert.ok(u >= 0 && u < 1);
  assert.equal(u, words(a, 1)[0]! / 2 ** 32);
});

test("split and foldIn give distinct keys, apart from one another and from the parent's stream", () => {
  const root = key(7);
  const children = split(root, 8);
  assert.equal(children.length, 8);
  assert.deepEqual(split(root), children.slice(0, 2));
  assert.deepEqual(split(root, 0), []);
  const folded = Array.from({ length: 8 }, (_, i) => foldIn(root, i));
  const seen = new Set<string>();
  for (const k of [root, ...children, ...folded]) {
    seen.add(k.join(","));
    for (const w of words(k, 4)) seen.add(`w${w}`);
  }
  // Seventeen keys and sixty-eight words, none alike.
  assert.equal(seen.size, 17 + 68);
  // A child's draws are not the parent's, nor a sibling's.
  assert.notDeepEqual(words(children[0]!, 4), words(root, 4));
  assert.notDeepEqual(words(children[0]!, 4), words(children[1]!, 4));
  assert.notDeepEqual(words(foldIn(root, 0), 4), words(children[0]!, 4));
  // Folding in is a function of the data alone: the same key for the same index.
  assert.deepEqual(foldIn(root, 5), foldIn(key(7), 5));
  assert.notDeepEqual(foldIn(root, 5), foldIn(root, 6));
  assert.throws(() => foldIn(root, -1), RangeError);
  assert.throws(() => foldIn(root, 2 ** 32), RangeError);
  assert.throws(() => split(root, -1), RangeError);
});

test("draws are independent of order: the i-th of a loop is the same drawn alone", () => {
  const root = key(99);
  const inOrder = Array.from({ length: 10 }, (_, i) =>
    randomRational(foldIn(root, i), 24, 12),
  );
  const reversed = Array.from({ length: 10 }, (_, i) =>
    randomRational(foldIn(root, 9 - i), 24, 12),
  ).reverse();
  assert.deepEqual(reversed, inOrder);
  assert.deepEqual(randomRational(foldIn(root, 7), 24, 12), inOrder[7]);
  // A composite draw's fields are folded in by index, so drawing one field
  // differently would leave the others as they are: the rational is its
  // four fields put together.
  const r = randomRational(root, 24, 12);
  const num = randomBigInt(foldIn(root, 0), 24);
  const den = randomBigInt(foldIn(root, 1), 24) + 1n;
  const scale = between(foldIn(root, 2), -12, 12);
  const signed = uniform(foldIn(root, 3)) < 0.5 ? -num : num;
  assert.deepEqual(
    r,
    scale >= 0
      ? rational(signed * 10n ** BigInt(scale), den)
      : rational(signed, den * 10n ** BigInt(-scale)),
  );
});

test("between is inclusive of both ends", () => {
  const root = key(7);
  const seen = new Set<number>();
  for (let i = 0; i < 1000; i++) {
    const n = between(foldIn(root, i), -2, 2);
    assert.ok(Number.isInteger(n) && n >= -2 && n <= 2);
    seen.add(n);
  }
  assert.equal(seen.size, 5);
});

test("randomBigInt has at most the bits asked, and uses them all", () => {
  const root = key(11);
  assert.equal(randomBigInt(root, 0), 0n);
  for (const bits of [1, 7, 20, 32, 33, 64, 100, 1000]) {
    let widest = 0;
    for (let i = 0; i < 50; i++) {
      const n = randomBigInt(foldIn(foldIn(root, bits), i), bits);
      assert.ok(n >= 0n && n < 1n << BigInt(bits), `${n} in ${bits} bits`);
      widest = Math.max(widest, n.toString(2).length);
    }
    // In fifty draws the top bit is set at least once, whatever the width.
    assert.equal(widest, bits, `${bits} bits`);
  }
  // The words are the key's stream, most significant first.
  const [w0, w1] = words(root, 2);
  assert.equal(randomBigInt(root, 64), (BigInt(w0!) << 32n) | BigInt(w1!));
  assert.equal(
    randomBigInt(root, 40),
    ((BigInt(w0!) << 32n) | BigInt(w1!)) >> 24n,
  );
  assert.throws(() => randomBigInt(root, -1), RangeError);
  assert.throws(() => randomBigInt(root, 1.5), RangeError);
});

test("randomRational stays within the bits and exponent asked, and mixes signs and scales", () => {
  const root = key(5);
  const limit = 1n << 20n;
  let negative = 0;
  let large = 0;
  let small = 0;
  for (let i = 0; i < 500; i++) {
    const r = randomRational(foldIn(root, i), 20, 20);
    // |num| < 2^20 × 10^20 and den <= 2^20 × 10^20, before reduction.
    assert.ok(absolute(r).num < limit * 10n ** 20n);
    assert.ok(r.den <= limit * 10n ** 20n);
    if (r.num < 0n) negative++;
    if (compare(absolute(r), rational(10n ** 10n)) > 0) large++;
    if (compare(absolute(r), rational(1n, 10n ** 10n)) < 0) small++;
  }
  assert.ok(negative > 150 && negative < 350, `${negative} negative`);
  assert.ok(large > 50, `${large} large`);
  assert.ok(small > 50, `${small} small`);
  assert.throws(() => randomRational(root, 0, 5), RangeError);
});

test("randomBall is exact a quarter of the time, and otherwise within a relative radius", () => {
  const root = key(13);
  let exactCount = 0;
  for (let i = 0; i < 400; i++) {
    const b = randomBall(foldIn(root, i), 24, 12);
    if (isExact(b)) {
      exactCount++;
      continue;
    }
    const rad = radiusUpper(b.rad);
    const mid = fraction(b.mid);
    const scale = mid.num === 0n ? rational(1n) : absolute(mid);
    // Between 10^-15 and 10^-1 of the magnitude, rounded up by 2^-29 at most.
    assert.ok(compare(rad, multiply(scale, rational(1n, 10n ** 15n))) >= 0);
    assert.ok(compare(rad, multiply(scale, rational(11n, 100n))) < 0);
  }
  assert.ok(exactCount > 60 && exactCount < 140, `${exactCount} exact`);
  // The midpoint is the rational of the first field folded in, as a `Scaled`.
  assert.deepEqual(
    randomBall(root, 24, 12).mid,
    fromRational(randomRational(foldIn(root, 0), 24, 12)),
  );
});
