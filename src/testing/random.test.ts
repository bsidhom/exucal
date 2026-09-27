import assert from "node:assert/strict";
import { test } from "node:test";
import { absolute, compare, rational } from "../core/rational.ts";
import { between, random, randomBigInt, randomRational } from "./random.ts";

test("the generator is repeatable from its seed and differs between seeds", () => {
  const a = random(42);
  const b = random(42);
  const c = random(43);
  const fromA = Array.from({ length: 5 }, a);
  assert.deepEqual(Array.from({ length: 5 }, b), fromA);
  assert.notDeepEqual(Array.from({ length: 5 }, c), fromA);
  for (const x of fromA) assert.ok(x >= 0 && x < 1);
});

test("between is inclusive of both ends", () => {
  const rand = random(7);
  const seen = new Set<number>();
  for (let i = 0; i < 1000; i++) {
    const n = between(rand, -2, 2);
    assert.ok(Number.isInteger(n) && n >= -2 && n <= 2);
    seen.add(n);
  }
  assert.equal(seen.size, 5);
});

test("randomBigInt has at most the bits asked, and uses them all", () => {
  const rand = random(11);
  assert.equal(randomBigInt(rand, 0), 0n);
  for (const bits of [1, 7, 20, 32, 33, 64, 100, 1000]) {
    let widest = 0;
    for (let i = 0; i < 50; i++) {
      const n = randomBigInt(rand, bits);
      assert.ok(n >= 0n && n < 1n << BigInt(bits), `${n} in ${bits} bits`);
      widest = Math.max(widest, n.toString(2).length);
    }
    // In fifty draws the top bit is set at least once, whatever the width.
    assert.equal(widest, bits, `${bits} bits`);
  }
  assert.throws(() => randomBigInt(rand, -1), RangeError);
  assert.throws(() => randomBigInt(rand, 1.5), RangeError);
});

test("randomRational stays within the bits and exponent asked, and mixes signs and scales", () => {
  const rand = random(5);
  const limit = 1n << 20n;
  let negative = 0;
  let large = 0;
  let small = 0;
  for (let i = 0; i < 500; i++) {
    const r = randomRational(rand, 20, 20);
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
  assert.throws(() => randomRational(rand, 0, 5), RangeError);
});
