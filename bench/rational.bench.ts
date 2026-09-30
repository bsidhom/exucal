import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTable } from "../src/core/build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../src/core/context.ts";
import { parseDefinitions } from "../src/core/definitions.ts";
import { evaluateText } from "../src/core/pipeline.ts";
import { gcd } from "../src/core/rational.ts";
import { realProbe } from "../src/limits.ts";
import { key, randomBigInt } from "../src/testing/random.ts";
import { bestOf, millis } from "./harness.ts";

// The exact arithmetic's cost is the gcd's (docs/calculator-plan.md, H.9):
// Lehmer's gcd on the odd parts is quadratic in the operands' size, as
// Euclid's was, but about forty times cheaper in V8 at the default range
// limit, and the smaller reductions of a sum, a product and a quotient
// keep the gcds it runs no larger than the operands allow. This benchmark
// reports what the probe of limits.ts times when it recommends the range
// limit, one gcd on its own, and the quotients of issue #52, and asserts
// only how the cost scales between two sizes measured in the same run.

/** An odd number of `bits` bits, drawn from the seed `seed`. */
function odd(seed: number, bits: number): bigint {
  return randomBigInt(key(seed), bits) | (1n << BigInt(bits - 1)) | 1n;
}

test("the probe's range operation, a product with its cross-cancelling gcds, grows quadratically at most", (t) => {
  // Two gcds of numbers of the candidate size: quadratic, so doubling the
  // size costs four times; eight is asserted, twice that.
  const probe = realProbe();
  const timings = new Map<number, number>();
  for (const bits of [8192, 16384, 32768, 65536]) {
    const ms = bestOf(bits >= 65536 ? 3 : 5, () => probe.range(bits));
    timings.set(bits, ms);
    t.diagnostic(`the probe's range operation at ${bits} bits: ${millis(ms)}`);
  }
  const half = timings.get(32768)!;
  const full = timings.get(65536)!;
  assert.ok(
    full <= 8 * half,
    `expected the operation at 65,536 bits (${millis(full)}) to cost at most eight times 32,768 (${millis(half)})`,
  );
});

test("one gcd at the default range limit grows quadratically at most", (t) => {
  const timings = new Map<number, number>();
  for (const bits of [16384, 32768, 65536]) {
    const a = odd(100 + bits, bits);
    const b = odd(200 + bits, bits);
    const ms = bestOf(5, () => {
      gcd(a, b);
    });
    timings.set(bits, ms);
    t.diagnostic(`gcd of two ${bits}-bit odd numbers: ${millis(ms)}`);
  }
  const half = timings.get(32768)!;
  const full = timings.get(65536)!;
  assert.ok(
    full <= 8 * half,
    `expected the gcd at 65,536 bits (${millis(full)}) to cost at most eight times 32,768 (${millis(half)})`,
  );
});

test("the quotients of issue #52 are reported", (t) => {
  // Each is a quotient of coprime powers within the default range limit,
  // whose reduction is one gcd of their size; the first took 469 ms with
  // Euclid's gcd, the second 949 ms.
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const context: NumberContext = {
    precision: 8,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };
  const table = buildTable(parsed.value, {
    ...context,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok);
  for (const text of ["3^32767 / 7^21845", "3^32767 / 7^21845 / 11^16383"]) {
    const ms = bestOf(3, () => {
      const result = evaluateText(table.value, text, context);
      assert.ok(result.ok);
    });
    t.diagnostic(`${text}: ${millis(ms)}`);
  }
});
