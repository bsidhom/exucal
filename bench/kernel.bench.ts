import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, rootBall } from "../src/core/ball.ts";
import { chudnovsky } from "../src/core/constants.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_MAX_DIGITS,
  DEFAULT_ROUNDING,
  ceilingFor,
} from "../src/core/context.ts";
import { bitsFor } from "../src/core/fixed.ts";
import { rational } from "../src/core/rational.ts";
import { bestOf, millis } from "./harness.ts";

/** Times `chudnovsky` at `digits` and reports it. */
function timePi(report: (message: string) => void, digits: number): number {
  const bits = bitsFor(digits);
  const ms = bestOf(digits >= 100_000 ? 2 : 5, () => {
    chudnovsky(bits);
  });
  report(`pi at ${digits} digits (${bits} bits): ${millis(ms)}`);
  return ms;
}

test("pi by Chudnovsky grows as the multiplication does, not quadratically", (t) => {
  // Binary splitting costs a few multiplications of numbers the size of the
  // result, so it grows as V8's bigint multiplication does: Karatsuba at
  // these sizes, about 38 times per decade of digits at most (the study
  // measured twenty from 1,000 to 10,000 digits). A series summed term by
  // term in fixed point would be quadratic and show a hundred. The decade
  // asserted is the upper one, whose timings are well above the timer's
  // noise; the lower is reported.
  timePi((m) => t.diagnostic(m), 1_000);
  const tenThousand = timePi((m) => t.diagnostic(m), 10_000);
  const hundredThousand = timePi((m) => t.diagnostic(m), 100_000);
  assert.ok(
    hundredThousand <= 50 * tenThousand,
    `expected pi at 100,000 digits (${millis(hundredThousand)}) to cost at most fifty times 10,000 (${millis(tenThousand)})`,
  );
});

test("a root at the default ceiling is milliseconds", (t) => {
  // The costliest pass of the retry schedule under the default cap: the
  // reference point for what an expression that never certifies costs.
  const ceiling = ceilingFor(DEFAULT_MAX_DIGITS);
  const context = {
    precision: ceiling,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };
  const square = bestOf(5, () => {
    assert.ok(rootBall(exact(rational(2n)), 2n, context).ok);
  });
  const cube = bestOf(5, () => {
    assert.ok(rootBall(exact(rational(2n)), 3n, context).ok);
  });
  t.diagnostic(
    `at the ceiling of ${ceiling} digits: sqrt 2 ${millis(square)}, cbrt 2 ${millis(cube)}`,
  );
});
