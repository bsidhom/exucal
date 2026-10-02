import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bernoulli,
  bernoulliGrowths,
  bernoulliMemoCount,
  reserveBernoulli,
  tangentNumbers,
} from "./bernoulli.ts";
import { rational } from "./rational.ts";

test("the tangent numbers are the coefficients of the tangent", () => {
  // tan x = x + 2 x^3/3! + 16 x^5/5! + 272 x^7/7! + 7936 x^9/9! + …
  assert.deepEqual(tangentNumbers(5), [0n, 1n, 2n, 16n, 272n, 7936n]);
  assert.deepEqual(tangentNumbers(0), [0n]);
});

test("the Bernoulli numbers are the known fractions (mpmath's bernfrac)", () => {
  const known: readonly [number, bigint, bigint][] = [
    [1, 1n, 6n],
    [2, -1n, 30n],
    [3, 1n, 42n],
    [4, -1n, 30n],
    [5, 5n, 66n],
    [6, -691n, 2730n],
    [7, 7n, 6n],
    [8, -3617n, 510n],
    [9, 43867n, 798n],
    [10, -174611n, 330n],
    [15, 8615841276005n, 14322n],
    [25, 495057205241079648212477525n, 66n],
  ];
  for (const [k, num, den] of known) {
    assert.deepEqual(bernoulli(k), rational(num, den), `B_${2 * k}`);
  }
  // Von Staudt and Clausen: the denominator of B_2k is the product of the
  // primes p with p - 1 dividing 2k; for B_12 those are 2, 3, 5, 7 and 13.
  assert.equal(bernoulli(6).den, 2n * 3n * 5n * 7n * 13n);
  assert.equal(bernoulli(20).den, 2n * 3n * 5n * 11n * 41n);
});

test("the memo grows to the count asked for and keeps it", () => {
  const before = bernoulliMemoCount();
  bernoulli(5);
  assert.ok(bernoulliMemoCount() >= 5);
  bernoulli(100);
  const grown = bernoulliMemoCount();
  assert.ok(grown >= 100 && grown >= before);
  bernoulli(3);
  assert.equal(bernoulliMemoCount(), grown);
  assert.throws(() => bernoulli(0), RangeError);
  assert.throws(() => bernoulli(1.5), RangeError);
});

test("a reservation computes the run to its count exactly, and a request beyond the memo is the fallback that grows it by a quarter", () => {
  const held = bernoulliMemoCount();
  const growths = bernoulliGrowths();
  // A count the memo holds leaves it.
  reserveBernoulli(held - 1);
  reserveBernoulli(held);
  assert.equal(bernoulliMemoCount(), held);
  reserveBernoulli(200);
  assert.equal(bernoulliMemoCount(), 200);
  assert.equal(bernoulliGrowths(), growths);
  // The run is the right one: B_400's denominator is the product of the
  // primes p with p - 1 dividing 400, by von Staudt and Clausen.
  assert.equal(
    bernoulli(200).den,
    2n * 3n * 5n * 11n * 17n * 41n * 101n * 401n,
  );
  assert.equal(bernoulliMemoCount(), 200);
  // Beyond the memo and the reservation, bernoulli grows it on its own.
  bernoulli(201);
  assert.equal(bernoulliMemoCount(), Math.ceil(201 * 1.25));
  assert.equal(bernoulliGrowths(), growths + 1);
  assert.throws(() => reserveBernoulli(-1), RangeError);
  assert.throws(() => reserveBernoulli(1.5), RangeError);
});
