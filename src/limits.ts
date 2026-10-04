// The recommended limits: a probe that measures what this device can do
// in a latency budget and proposes the two limits of D16, the range limit
// in bits and the cap on the digits. docs/calculator-plan.md (D16 and task
// 2.7) is the design; the settings panel runs it on request and never on
// its own, since a benchmark at every launch would be noise on the main
// thread for a number the user can also type. This is app code beside
// settings.ts: the core knows nothing of time.
//
// What it times is the costliest operation the app has on each axis, at
// sizes doubling until one exceeds the budget, and it recommends the
// largest size that stayed within it, rounded down to a round number. For
// the range limit the operation is the costliest exact operation the
// limits still run: an exact multiplication of two rationals of the
// candidate size in each part, whose two cross-cancelling gcds (the
// plan's H.9) are the quadratic step of exact arithmetic and run before
// the result is measured against the limit and refused (D19); the
// operands are built outside the timed call, memoized by size, since a
// build is not what the limit bounds. The candidates are powers of two
// from 2^9 to the hard bound. For the cap it is `COMPOSITE`, one
// expression of the costliest built-ins, evaluated once at the ceiling the
// candidate cap would give (D12: four times the cap plus the guard), since
// the ceiling pass is the costliest an expression that never certifies
// runs, and such an expression runs every built-in it names at that pass;
// the candidates are 1, 2 and 5 times a power of ten, up to what the
// recommended range limit holds (`maxDigitsFor`). The composite was chosen
// from the kernel benchmark's report of every routine at the default
// ceiling (bench/kernel.bench.ts, the plan's 3.11): `exp`, `atan`, `sin`
// (with `cos`, computed together) and `ln` cost about 12, 12, 11 and 10 ms
// each there on the machine it was chosen on, the roots 0.5 and 1.6 ms,
// and the hyperbolic functions and the remaining inverses are compositions
// of those, so the composite names each of the four once (the arctangent
// is an angle, and so is the logarithm in radians, which the sine takes)
// and costs about 45 ms at that ceiling, the pass an expression of four
// such calls pays;
// stage 2's probe timed a cube root, the costliest operation it had.
// The expression is evaluated through the evaluator at that one precision,
// not the pipeline's retry schedule, against a table of the one primitive
// the angle needs, built at the same context. The special functions are
// not in the composite, and the budget stands (D25 of the plan): a cap low
// enough for their ceiling pass would put out of reach values that are in
// reach, and keeping the interface responsive while such a pass runs is
// issue #118's. The operations and the budget are named in one place here,
// so that a change to either touches nothing else.
//
// The budget is per pass: the retry schedule doubles, so an expression that
// runs to the ceiling costs about twice its last pass, and 50 ms a pass
// keeps that under the tenth of a second an interactive keystroke has. The
// probe measures time alone; memory is an explicit omission (D16 says why:
// no portable measure of it exists in a browser, and probing by allocation
// could crash the page), bounded indirectly by the time budget, since a
// value of `n` bits is `n / 8` bytes.
//
// The clock and the operations are a `Probe` passed in, so that the tests
// run the recommendation against a fake that charges a set cost per bit
// or per digit, and the shell passes the real one. The inputs the real
// probe multiplies are fixed, produced by a small congruential generator
// here rather than the shared random source of the tests, which is not
// part of the app; they need to be ordinary numbers, not random ones.

import { buildTable } from "./core/build.ts";
import {
  DEFAULT_ROUNDING,
  MIN_MAX_BITS,
  ceilingFor,
  maxDigitsFor,
  type NumberContext,
} from "./core/context.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { evaluate } from "./core/evaluate.ts";
import { parseExpr } from "./core/expr.ts";
import {
  LIMIT_BITS,
  multiply,
  rational,
  type Rational,
} from "./core/rational.ts";
import { unitLookup } from "./core/table.ts";

/**
 * The expression the precision probe evaluates: the four costliest
 * built-ins of the kernel benchmark's report, each once, as the header
 * says. Exported for the test that checks it evaluates.
 */
export const COMPOSITE = "sin(atan(exp(1)) + ln(3) radian)";

/** The one primitive the composite needs: the angle its calls take and return. */
const DEFINITIONS = "radian  !kind";

/** The two limits the probe recommends. */
export type Limits = {
  readonly maxBits: number;
  readonly maxDigits: number;
};

/**
 * What the probe measures with: a clock in milliseconds, and the two
 * operations, each run once at a size.
 */
export type Probe = {
  readonly now: () => number;
  /** The costliest exact operation at `bits`: a product of two fractions of `bits` bits in each part, with its cross-cancelling gcds. */
  readonly range: (bits: number) => void;
  /** The costliest inexact operation at the ceiling for a cap of `digits`. */
  readonly precision: (digits: number) => void;
};

/** The latency budget per pass, in milliseconds; the header says why. */
export const BUDGET_MS = 50;

/** The probe over the real clock and operations. */
export function realProbe(): Probe {
  const operands = new Map<number, [Rational, Rational]>();
  return {
    now: () => performance.now(),
    range: (bits) => {
      // The untimed first run of `timed` builds the operands; the timed
      // runs multiply them.
      let pair = operands.get(bits);
      if (pair === undefined) {
        pair = [
          rational(fixedBits(bits, 1n), fixedBits(bits, 2n)),
          rational(fixedBits(bits, 3n), fixedBits(bits, 4n)),
        ];
        operands.set(bits, pair);
      }
      multiply(pair[0], pair[1]);
    },
    precision: (digits) => {
      const ceiling = ceilingFor(digits);
      evaluateComposite({
        precision: ceiling,
        rounding: DEFAULT_ROUNDING,
        maxBits: LIMIT_BITS,
        ceiling,
      });
    },
  };
}

/**
 * `COMPOSITE` evaluated once at `context`, against a table of the one
 * primitive built at the same context; a failure is a bug in the
 * composite, and throws.
 */
export function evaluateComposite(context: NumberContext): void {
  const table = buildTable(definitions(), context);
  if (!table.ok) throw new Error("The probe's definitions do not build");
  const result = evaluate(
    composite(),
    unitLookup(table.value, context),
    table.value.primitives,
    context,
  );
  if (!result.ok) throw new Error("The probe's composite does not evaluate");
}

/** The composite, parsed once. */
const composite = memo(() => {
  const parsed = parseExpr(COMPOSITE);
  if (!parsed.ok) throw new Error("The probe's composite does not parse");
  return parsed.value;
});

/** The probe's definitions, parsed once. */
const definitions = memo(() => {
  const parsed = parseDefinitions(DEFINITIONS);
  if (!parsed.ok) throw new Error("The probe's definitions do not parse");
  return parsed.value;
});

/** `compute` called once, on first use. */
function memo<T>(compute: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= compute());
}

/**
 * The limits recommended for the device `probe` measures, within `budget`
 * milliseconds per operation: the largest power of two from 2^9 to
 * `LIMIT_BITS` whose range operation stays within the budget (at least
 * `MIN_MAX_BITS`), and the largest cap of the form 1, 2 or 5 times a power
 * of ten, up to what that range limit holds, whose precision operation
 * stays within it (at least 1). Each size is timed as the shortest of
 * three runs after one that is not timed.
 */
export function recommendLimits(
  budget: number = BUDGET_MS,
  probe: Probe = realProbe(),
): Limits {
  let maxBits = MIN_MAX_BITS;
  for (let bits = 512; bits <= LIMIT_BITS; bits *= 2) {
    if (timed(probe, () => probe.range(bits)) > budget) break;
    maxBits = Math.max(maxBits, bits);
  }
  const most = maxDigitsFor(maxBits);
  let maxDigits = 1;
  for (const digits of roundNumbers(most)) {
    if (timed(probe, () => probe.precision(digits)) > budget) break;
    maxDigits = digits;
  }
  return { maxBits, maxDigits };
}

/** 1, 2, 5, 10, 20, 50, ... up to `limit`, ascending. */
function roundNumbers(limit: number): number[] {
  const numbers: number[] = [];
  for (let scale = 1; scale <= limit; scale *= 10) {
    for (const lead of [1, 2, 5]) {
      if (lead * scale <= limit) numbers.push(lead * scale);
    }
  }
  return numbers;
}

/** The shortest of three timings of `f` after one untimed run, in milliseconds. */
function timed(probe: Probe, f: () => void): number {
  f();
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const start = probe.now();
    f();
    best = Math.min(best, probe.now() - start);
  }
  return best;
}

/**
 * A fixed positive integer of `bits` bits whose words come from a 64-bit
 * linear congruential generator seeded with `seed`: an ordinary number of
 * that size, the same every run, with its top bit set.
 */
function fixedBits(bits: number, seed: bigint): bigint {
  const mask = (1n << 64n) - 1n;
  let state = seed * 0x9e3779b97f4a7c15n;
  let value = 0n;
  for (let have = 0; have < bits; have += 64) {
    state = (state * 6364136223846793005n + 1442695040888963407n) & mask;
    value = (value << 64n) | state;
  }
  value >>= BigInt(bits % 64 === 0 ? 0 : 64 - (bits % 64));
  return value | (1n << BigInt(bits - 1));
}
