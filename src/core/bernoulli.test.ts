import assert from "node:assert/strict";
import { test } from "node:test";
import { bernoulli, bernoulliRun, tangentNumbers } from "./bernoulli.ts";
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

test("a run is the first numbers asked for, exact, and one number is the last of its run", () => {
  assert.deepEqual(bernoulliRun(0), []);
  const run = bernoulliRun(3);
  assert.deepEqual(run, [
    rational(1n, 6n),
    rational(-1n, 30n),
    rational(1n, 42n),
  ]);
  assert.deepEqual(bernoulli(3), run[2]);
  // B_400's denominator is the product of the primes p with p - 1
  // dividing 400, by von Staudt and Clausen.
  assert.equal(
    bernoulliRun(200)[199]!.den,
    2n * 3n * 5n * 11n * 17n * 41n * 101n * 401n,
  );
  assert.throws(() => bernoulliRun(-1), RangeError);
  assert.throws(() => bernoulliRun(1.5), RangeError);
  assert.throws(() => bernoulli(0), RangeError);
  assert.throws(() => bernoulli(1.5), RangeError);
});
