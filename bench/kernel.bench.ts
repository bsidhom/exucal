import assert from "node:assert/strict";
import { test } from "node:test";
import { multiplyBalls, step, type Ball } from "../src/core/ball.ts";
import { ok } from "../src/core/result.ts";
import { chudnovsky, eSeries } from "../src/core/constants.ts";
import { floatingToBall } from "../src/core/digits.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "../src/core/context.ts";
import { expFixed, sinhCoshFixed } from "../src/core/fixed-exp.ts";
import { ln2Series, ln10Series, lnFixed } from "../src/core/fixed-log.ts";
import { atanFixed, cosFixed, sinFixed } from "../src/core/fixed-trig.ts";
import {
  bitsFor,
  fixedFromRational,
  fixedToBall,
  rootFixed,
  sqrtFixed,
  type Fixed,
} from "../src/core/fixed.ts";
import { radiusAbove } from "../src/core/radius.ts";
import { rational } from "../src/core/rational.ts";
import { fromRational } from "../src/core/scaled.ts";
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
 * one: the report of devdocs/history/calculator-plan.md's 3.6, from which 3.11 chose
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
  // The large arguments of 4.9: `exp 1e6` is `exp 1` plus about sixty
  // squarings at the working bits, and `cosh 1e6` the same with the
  // reciprocal folded into the error.
  [
    "exp 1e6",
    (bits) => void expFixed(fixedFromRational(rational(1000000n), bits), bits),
  ],
  [
    "cosh 1e6",
    (bits) =>
      void sinhCoshFixed(fixedFromRational(rational(1000000n), bits), bits),
  ],
];

test("exp of 1e6 at the ceiling costs within a small factor of exp of 1", (t) => {
  // The squaring loop renormalizes, so the large argument costs the
  // series plus sixty squarings at the working bits, not a value of 1.4
  // million bits; the log-space digits of the result are timed beside it.
  const bits = bitsFor(DEFAULT_CEILING);
  const one = bestOf(
    5,
    () => void expFixed(fixedFromRational(rational(1n), bits), bits),
  );
  const large = bestOf(
    5,
    () => void expFixed(fixedFromRational(rational(1000000n), bits), bits),
  );
  const context = contextAt(DEFAULT_CEILING);
  const floating = expFixed(fixedFromRational(rational(1000000n), bits), bits);
  const digits = bestOf(5, () => void floatingToBall(floating, context));
  t.diagnostic(
    `exp 1e6: ${millis(large)} against exp 1 at ${millis(one)}, and its digits in log space ${millis(digits)}, at the ceiling of ${DEFAULT_CEILING} digits`,
  );
  assert.ok(
    large <= 4 * Math.max(one, 0.5),
    `expected exp 1e6 (${millis(large)}) to cost at most four times exp 1 (${millis(one)})`,
  );
});

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

/** The context at `precision` digits with the default limits. */
function contextAt(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  };
}

/** `b` settled at `context`, which a ball of ordinary magnitude never refuses. */
function settledAt(b: Ball, context: NumberContext): Ball {
  const settled = step(() => ok(b), context);
  if (!settled.ok) throw new Error("A benchmark's ball is within the bound");
  return settled.value;
}

/** An inexact ball whose midpoint has about twice the working digits of `context`: what a product of two settled balls is before it is settled. */
function unsettledAt(context: NumberContext): Ball {
  const digits = workingDigits(context);
  const significand = 3n ** BigInt(Math.ceil((2 * digits) / Math.log10(3)));
  return {
    mid: fromRational(rational(significand, 7n ** 20n)),
    rad: radiusAbove(rational(1n, 10n ** BigInt(digits + 5))),
  };
}

/**
 * The decimal grid's own costs (4.4 of devdocs/history/calculator-plan.md): the
 * settle of a midpoint to the working digits, the product of two settled
 * balls, and the kernel's exit onto the grid, each at the ceiling and at a
 * quarter of it, beside the routines above. The settle is a division by a
 * power of ten and a rounding, the product an integer multiplication and a
 * canonical form; both are far below any routine, and grow as the
 * multiplication does.
 */
test("a settle and a product on the decimal grid at the ceiling cost at most 64 times what they cost at a quarter of it", (t) => {
  const quarter = DEFAULT_CEILING / 4;
  // Each entry prepares its operands at the context and hands back the
  // operation to time, so that the preparation is outside the timing.
  const grid: readonly [string, (context: NumberContext) => () => void][] = [
    [
      "step",
      (context) => {
        const b = unsettledAt(context);
        return () => void step(() => ok(b), context);
      },
    ],
    [
      "product of settled balls",
      (context) => {
        const a = settledAt(unsettledAt(context), context);
        const b = settledAt(
          {
            ...unsettledAt(context),
            mid: fromRational(rational(11n ** 3000n, 13n ** 2900n)),
          },
          context,
        );
        return () => void multiplyBalls(a, b, context);
      },
    ],
    [
      "kernel exit (fixedToBall)",
      (context) => {
        const bits = bitsFor(context.precision);
        const f: Fixed = {
          value: (1n << BigInt(bits)) * 3n + 12345n,
          error: 3n,
          bits,
        };
        return () => void fixedToBall(f, workingDigits(context));
      },
    ],
  ];
  for (const [name, prepare] of grid) {
    const low = bestOf(5, prepare(contextAt(quarter)));
    const high = bestOf(5, prepare(contextAt(DEFAULT_CEILING)));
    t.diagnostic(
      `${name}: ${millis(high)} at the ceiling of ${DEFAULT_CEILING} digits, ${millis(low)} at ${quarter}`,
    );
    assert.ok(
      high <= 64 * Math.max(low, 0.01),
      `expected ${name} at the ceiling (${millis(high)}) to cost at most 64 times a quarter of it (${millis(low)})`,
    );
  }
});
