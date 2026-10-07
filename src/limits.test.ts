import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_ROUNDING,
  MIN_MAX_BITS,
  ceilingFor,
  maxDigitsFor,
} from "./core/context.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import {
  COMPOSITE,
  evaluateComposite,
  realProbe,
  recommendLimits,
  type Probe,
} from "./limits.ts";

/**
 * A probe over a fake clock that charges `perBit` milliseconds per bit of
 * the range operation and `perDigit` per digit of the precision limit,
 * exactly, and records the sizes it was asked for.
 */
function fakeProbe(
  perBit: number,
  perDigit: number,
): Probe & { readonly bits: number[]; readonly digits: number[] } {
  let clock = 0;
  const bits: number[] = [];
  const digits: number[] = [];
  return {
    bits,
    digits,
    now: () => clock,
    range: (n) => {
      bits.push(n);
      clock += n * perBit;
    },
    precision: (n) => {
      digits.push(n);
      clock += n * perDigit;
    },
  };
}

test("the significand limit is the largest power of two whose operation fits the budget, with its timing", () => {
  // At 1 µs a bit, 32,768 bits cost 32.768 ms and 65,536 cost 65.5 ms.
  const probe = fakeProbe(0.001, 0);
  const limits = recommendLimits(50, probe);
  assert.equal(limits.significandLimitBits, 32768);
  assert.ok(Math.abs(limits.productMs - 32.768) < 1e-9);
  // The sizes are the floor, then double from 512, and stop at the first
  // over the budget.
  assert.deepEqual(
    [...new Set(probe.bits)],
    [MIN_MAX_BITS, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536],
  );
});

test("the precision limit is the largest round number of digits whose operation fits, under the significand limit, with its timing", () => {
  // At 0.1 ms a digit, 500 digits cost 50 ms and fit; 1,000 do not.
  const limits = recommendLimits(50, fakeProbe(0, 0.1));
  assert.equal(limits.precisionLimitDigits, 500);
  assert.ok(Math.abs(limits.builtinsMs - 50) < 1e-9);
  assert.equal(limits.significandLimitBits, LIMIT_BITS);
  assert.equal(limits.productMs, 0);
  // The candidates are 1, 2, 5 times a power of ten, in order.
  const probe = fakeProbe(0, 0.1);
  recommendLimits(50, probe);
  assert.deepEqual(
    [...new Set(probe.digits)],
    [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
  );
  // A cheaper device gets more, up to what the significand limit holds.
  const fast = recommendLimits(50, fakeProbe(0, 0.00001));
  assert.equal(fast.significandLimitBits, LIMIT_BITS);
  const most = maxDigitsFor(LIMIT_BITS);
  assert.ok(fast.precisionLimitDigits <= most);
  assert.ok(fast.precisionLimitDigits > most / 10);
  // The budget is the caller's: a larger one admits a larger limit.
  assert.equal(
    recommendLimits(100, fakeProbe(0, 0.1)).precisionLimitDigits,
    1000,
  );
});

test("the recommendation respects the dependency and the hard bounds, and times the floor when nothing fits", () => {
  // A slow device: even the floor exceeds the budget, so the floor stands
  // with its time over the budget, and the precision limit is what the
  // floor holds, at most.
  const slow = recommendLimits(50, fakeProbe(1, 0));
  assert.equal(slow.significandLimitBits, MIN_MAX_BITS);
  assert.equal(slow.productMs, MIN_MAX_BITS);
  assert.equal(slow.precisionLimitDigits, maxDigitsFor(MIN_MAX_BITS));
  assert.equal(slow.precisionLimitDigits, 1);
  // A device that is slow only at digits keeps at least one digit, timed.
  const slowDigits = recommendLimits(50, fakeProbe(0, 1000));
  assert.equal(slowDigits.precisionLimitDigits, 1);
  assert.equal(slowDigits.builtinsMs, 1000);
  // A middling significand limit caps the digits to what it holds.
  const middling = recommendLimits(50, fakeProbe(0.01, 0));
  assert.equal(middling.significandLimitBits, 4096);
  assert.ok(middling.precisionLimitDigits <= maxDigitsFor(4096));
  assert.ok(middling.precisionLimitDigits >= 100);
});

test("the composite names the four costliest built-ins and evaluates at a candidate's ceiling", () => {
  // The four of the kernel benchmark's report, each once; a change here is
  // a change of what the cap measures, and the header says why these.
  for (const name of ["exp", "atan", "sin", "ln"]) {
    assert.equal(COMPOSITE.split(`${name}(`).length, 2, name);
  }
  assert.equal(COMPOSITE, "sin(atan(exp(1)) + ln(3) radian)");
  const ceiling = ceilingFor(8);
  assert.doesNotThrow(() =>
    evaluateComposite({
      precision: ceiling,
      rounding: DEFAULT_ROUNDING,
      maxBits: LIMIT_BITS,
      ceiling,
    }),
  );
});

test("the real probe answers within a small budget without hanging", () => {
  const start = performance.now();
  const limits = recommendLimits(1, realProbe());
  assert.ok(performance.now() - start < 5000);
  assert.ok(
    limits.significandLimitBits >= MIN_MAX_BITS &&
      limits.significandLimitBits <= LIMIT_BITS,
  );
  assert.ok(
    limits.precisionLimitDigits >= 1 &&
      limits.precisionLimitDigits <= maxDigitsFor(limits.significandLimitBits),
  );
  assert.ok(limits.productMs >= 0 && limits.builtinsMs >= 0);
});
