import assert from "node:assert/strict";
import { test } from "node:test";
import { chudnovsky, eSeries } from "../src/core/constants.ts";
import { DEFAULT_CEILING } from "../src/core/context.ts";
import { expFixed, sinhCoshFixed } from "../src/core/fixed-exp.ts";
import { ln2Series, ln10Series, lnFixed } from "../src/core/fixed-log.ts";
import { atanFixed, cosFixed, sinFixed } from "../src/core/fixed-trig.ts";
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
 * one: the report of docs/calculator-plan.md's 3.6, from which 3.11 chose
 * what the probe of limits.ts times (the four costliest, `exp`, `atan`,
 * `sin` and `ln`, each about 10 to 12 ms at the default ceiling on the
 * machine of 3.11, against the roots' 0.5 and 1.6), and where the cost of
 * the ceiling pass is measured rather than assumed. The logarithm, the
 * sine and the arctangent sum their series by rectangular splitting, about
 * `2 sqrt(N)` full multiplications for `N` terms; the exponential's series
 * is summed term by term, one multiplication a term, and is the remaining
 * candidate for the same splitting (V8 multiplies integers of 13,500 bits
 * by the schoolbook rule, about 60 µs a product, and `exp 1` spends most
 * of its time there). The series of `e` costs a fraction of any of them.
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
  [
    "ln 3",
    (bits) => void lnFixed(fixedFromRational(rational(3n), bits), bits, bits),
  ],
  ["ln 2 series", (bits) => void ln2Series(bits)],
  ["ln 10 series", (bits) => void ln10Series(bits)],
  [
    "sin 1",
    (bits) => void sinFixed(fixedFromRational(rational(1n), bits), bits, bits),
  ],
  [
    "cos 1",
    (bits) => void cosFixed(fixedFromRational(rational(1n), bits), bits, bits),
  ],
  [
    "atan 1",
    (bits) => void atanFixed(fixedFromRational(rational(1n), bits), bits, bits),
  ],
  [
    "sinh 1/2",
    (bits) =>
      void sinhCoshFixed(fixedFromRational(rational(1n, 2n), bits), bits),
  ],
  [
    "cosh 2",
    (bits) => void sinhCoshFixed(fixedFromRational(rational(2n), bits), bits),
  ],
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
