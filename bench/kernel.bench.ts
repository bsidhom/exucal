import assert from "node:assert/strict";
import { test } from "node:test";
import { chudnovsky, eSeries } from "../src/core/constants.ts";
import { DEFAULT_CEILING } from "../src/core/context.ts";
import { expFixed } from "../src/core/fixed-exp.ts";
import {
  bitsFor,
  fixedFromRational,
  rootFixed,
  sqrtFixed,
} from "../src/core/fixed.ts";
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

/**
 * Every routine of the kernel, each run at `bits` on an argument of order
 * one: the report of docs/calculator-plan.md's 3.6, from which 3.11 chooses
 * what the probe of limits.ts times, and where the cost of the ceiling pass
 * is measured rather than assumed. A routine joins the list as it lands.
 */
const ROUTINES: readonly [string, (bits: number) => void][] = [
  ["sqrt 2", (bits) => void sqrtFixed(fixedFromRational(rational(2n), bits))],
  [
    "cbrt 2",
    (bits) => void rootFixed(fixedFromRational(rational(2n), bits), 3n),
  ],
  [
    "exp 1",
    (bits) => void expFixed(fixedFromRational(rational(1n), bits), bits),
  ],
  ["e series", (bits) => void eSeries(bits)],
];

test("every kernel routine at the default ceiling costs at most 64 times what it costs at a quarter of it", (t) => {
  // The ceiling pass is the costliest an expression that never certifies
  // runs (D12). A series of a length linear in the bits over Karatsuba
  // multiplication grows as bits^2.58, about 36 times for four times the
  // digits; 64 is twice that, so noise does not fail what a regression would
  // not fail by a wide margin. The timings are the diagnostics to read.
  const quarter = DEFAULT_CEILING / 4;
  for (const [name, run] of ROUTINES) {
    const low = bestOf(5, () => run(bitsFor(quarter)));
    const high = bestOf(5, () => run(bitsFor(DEFAULT_CEILING)));
    t.diagnostic(
      `${name}: ${millis(high)} at the ceiling of ${DEFAULT_CEILING} digits, ${millis(low)} at ${quarter}`,
    );
    assert.ok(
      high <= 64 * Math.max(low, 0.01),
      `expected ${name} at the ceiling (${millis(high)}) to cost at most 64 times a quarter of it (${millis(low)})`,
    );
  }
});
