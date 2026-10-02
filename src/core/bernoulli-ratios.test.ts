import assert from "node:assert/strict";
import { test } from "node:test";
import { bernoulliRun } from "./bernoulli.ts";
import {
  RATIO_GUARD,
  STIRLING_FACTOR,
  log2Above,
  ratioBits,
  ratioGrowths,
  ratioMemoBits,
  ratioMemoCount,
  ratioSource,
  termLog2s,
} from "./bernoulli-ratios.ts";
import { MEMO_MARGIN } from "./constants.ts";
import { abs, bitLength } from "./rational.ts";

test("the Stirling factor is the index factor of the series for ln Γ", () => {
  assert.deepEqual(STIRLING_FACTOR(1), [2n, 12n]);
  assert.deepEqual(STIRLING_FACTOR(2), [12n, 30n]);
  assert.deepEqual(STIRLING_FACTOR(3), [30n, 56n]);
});

test("the term bounds lie above the terms of Stirling's series, within ζ(2) of them", () => {
  // At y = 10 the k-th term is |B_2k| / (2k (2k - 1) y^(2k - 1)); the
  // first bound is the first term itself, and the k-th is over it by
  // ζ(2) / ζ(2k), which is below ζ(2) = π² / 6.
  const y = 10;
  const numbers = bernoulliRun(8);
  let k = 0;
  for (const log2 of termLog2s(
    -Math.log2(12 * y),
    -2 * Math.log2(y),
    STIRLING_FACTOR,
  )) {
    if (++k > 8) break;
    const b = numbers[k - 1]!;
    const exact =
      Math.abs(Number(b.num) / Number(b.den)) /
      (2 * k * (2 * k - 1) * y ** (2 * k - 1));
    const bound = 2 ** log2;
    assert.ok(bound >= exact * (1 - 1e-12), `term ${k}: ${bound} < ${exact}`);
    assert.ok(
      bound <= exact * (Math.PI ** 2 / 6) * (1 + 1e-12),
      `term ${k}: ${bound} over ζ(2) times ${exact}`,
    );
    if (k === 1) assert.ok(Math.abs(bound - exact) < 1e-15 * exact);
  }
});

test("log2Above bounds a positive integer from above, closely", () => {
  for (const n of [
    1n,
    2n,
    3n,
    1000n,
    (1n << 53n) - 1n,
    1n << 100n,
    3n ** 300n,
  ]) {
    const log2 = log2Above(n);
    assert.ok(log2 >= bitLength(n) - 1 && log2 <= bitLength(n), `${n}`);
    if (bitLength(n) <= 53)
      assert.ok(Math.abs(2 ** log2 - Number(n)) <= 1e-9 * Number(n));
  }
  assert.ok(log2Above(1n << 100n) >= 100 && log2Above(1n << 100n) < 100.001);
});

test("the run is built to the count and the bits asked for plus the margin, grows on either, and serves what it holds", () => {
  assert.equal(ratioMemoCount(), 0);
  assert.equal(ratioMemoBits(), 0);
  const growths = ratioGrowths();
  const source = ratioSource(10, 300);
  assert.equal(ratioMemoCount(), 10);
  assert.equal(ratioMemoBits(), 300 + MEMO_MARGIN);
  // |B_4 / B_2| is (1/30) / (1/6), one fifth, and |B_6 / B_4| is (1/42) /
  // (1/30), five sevenths, each truncated at its bits within an ulp.
  const first = source(1);
  assert.equal(first.error, 1n);
  assert.equal(first.value, (1n << BigInt(first.bits)) / 5n);
  const second = source(2);
  assert.equal(second.value, (5n << BigInt(second.bits)) / 7n);
  // The first ratio holds the run's bits at most, and the bits fall down
  // the run to no less than the guard.
  assert.ok(first.bits <= 300 + MEMO_MARGIN);
  assert.ok(first.bits >= second.bits && second.bits >= ratioBits(10)!);
  assert.ok(ratioBits(10)! >= RATIO_GUARD);
  assert.equal(ratioBits(11), undefined);
  // A smaller request leaves the run; a larger count grows it at its bits.
  ratioSource(5, 200);
  assert.equal(ratioMemoCount(), 10);
  ratioSource(20, 300);
  assert.equal(ratioMemoCount(), 20);
  assert.equal(ratioMemoBits(), 300 + MEMO_MARGIN);
  // More bits rebuild the run at the bits asked for plus the margin,
  // keeping the larger count; none of this is a growth.
  ratioSource(5, 1000);
  assert.equal(ratioMemoCount(), 20);
  assert.equal(ratioMemoBits(), 1000 + MEMO_MARGIN);
  assert.equal(ratioGrowths(), growths);
  // A ratio beyond the run grows it by a quarter past the index, once,
  // and is the ratio of the exact numbers at its bits.
  const grown = ratioSource(20, 1000)(30);
  const numbers = bernoulliRun(31);
  const [b, next] = [numbers[29]!, numbers[30]!];
  assert.equal(
    grown.value,
    ((abs(next.num) * b.den) << BigInt(grown.bits)) / (abs(b.num) * next.den),
  );
  assert.equal(ratioMemoCount(), Math.ceil(30 * 1.25));
  assert.equal(ratioMemoBits(), 1000 + MEMO_MARGIN);
  assert.equal(ratioGrowths(), growths + 1);
  assert.throws(() => ratioSource(0, 300), RangeError);
  assert.throws(() => ratioSource(1, 0), RangeError);
});
