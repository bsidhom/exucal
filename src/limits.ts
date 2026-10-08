// The recommended limits: a probe that measures what this device can do
// in a latency budget and proposes the two limits
// (devdocs/settings.md, "The model"), the significand limit in bits and
// the precision limit in digits, with the timings behind them, so that
// the settings panel can show the proposal and the user apply it.
// devdocs/settings.md ("The probe") is the design; the panel runs it on
// request and never on its own, since a benchmark at every launch would
// be noise on the main thread for a number the user can also type. This
// is app code beside settings.ts: the core knows nothing of time.
//
// What it times is the costliest operation the app has on each axis, at
// sizes doubling until one exceeds the budget, and it recommends the
// largest size that stayed within it, rounded down to a round number. For
// the significand limit the operation is the costliest exact operation
// the limits still run: an exact multiplication of two rationals of the
// candidate size in each part, whose two cross-cancelling gcds
// (devdocs/numbers.md, "Exact operations") are the quadratic step of
// exact arithmetic and run before the product's size is predicted
// against the limit and refused, nothing formed past it
// (devdocs/numbers.md, "The significand limit"); the operands are built
// outside the timed call, memoized by size, since a build is not
// what the limit bounds. The candidates are the setting's
// floor and then the powers of two from 2^9 to the hard bound, so that
// the size recommended was always timed, the floor included. For the
// precision limit it is `COMPOSITE`, one expression of the costliest
// built-ins, evaluated once at the ceiling the candidate limit would give
// (four times the limit plus the guard;
// devdocs/numbers.md, "Working precision and the schedule"), since the
// ceiling pass is the costliest an expression that never certifies runs,
// and such an expression runs every built-in it names at that pass; the
// candidates are 1, 2 and 5 times a power of ten, up to what the
// recommended significand limit holds (`precisionLimitFor`). The
// composite was chosen from the kernel benchmark's report of every
// routine at the default ceiling (bench/kernel.bench.ts): `exp`, `atan`,
// `sin` (with `cos`, computed together) and `ln` cost about 12, 12, 11
// and 10 ms each there on the machine it was chosen on, the roots 0.5 and
// 1.6 ms, and the hyperbolic functions and the remaining inverses are
// compositions of those, so the composite names each of the four once
// (the arctangent is an angle, and so is the logarithm in radians, which
// the sine takes) and costs about 45 ms at that ceiling, the pass an
// expression of four such calls pays; an earlier probe timed a cube root,
// the costliest operation it had.
// The expression is evaluated through the evaluator at that one precision,
// not the pipeline's retry schedule, against a table of the one primitive
// the angle needs, built at the same context. The special functions are
// not in the composite, and the budget stands
// (devdocs/settings.md, "The model"): a limit low enough for their
// ceiling pass would put out of reach values that are in reach, and
// keeping the interface responsive while such a pass runs is issue
// #118's. The operations are named in one place here, so that a change
// to them touches nothing else; the budget is the user's, a stored
// setting in milliseconds (settings.ts, `budgetMs`) the panel passes in.
//
// The budget is per pass: the retry schedule doubles, so an expression that
// runs to the ceiling costs about twice its last pass, and the default's
// 50 ms a pass keeps that under the tenth of a second an interactive
// keystroke has. The probe measures time alone; memory is an explicit
// omission (devdocs/settings.md ("The probe") says why: no portable
// measure of it exists in a browser, and probing by allocation could
// crash the page), bounded indirectly by the time budget, since a value
// of `n` bits is `n / 8` bytes.
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
  MIN_SIGNIFICAND_LIMIT_BITS,
  ceilingFor,
  precisionLimitFor,
  type NumberContext,
} from "./core/context.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { evaluate } from "./core/evaluate.ts";
import { parseExpr } from "./core/expr.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  multiplyWithin,
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

/**
 * What the probe recommends: the two limits, each with the time its
 * operation took at the recommended size, in milliseconds, which is
 * within the budget unless the size is the setting's floor, the least
 * the probe may recommend, whose operation may have cost more.
 */
export type Recommendation = {
  readonly significandLimitBits: number;
  /** The costliest exact product at `significandLimitBits`. */
  readonly productMs: number;
  readonly precisionLimitDigits: number;
  /** The costliest built-ins at the ceiling `precisionLimitDigits` gives. */
  readonly builtinsMs: number;
};

/**
 * What the probe measures with: a clock in milliseconds, and the two
 * operations, each run once at a size.
 */
export type Probe = {
  readonly now: () => number;
  /** The costliest exact operation at `bits`: a product of two fractions of `bits` bits in each part, with its cross-cancelling gcds. */
  readonly range: (bits: number) => void;
  /** The costliest inexact operation at the ceiling for a precision limit of `digits`. */
  readonly precision: (digits: number) => void;
};

/** The probe over the real clock and operations. */
export function realProbe(): Probe {
  const operands = new Map<number, [Rational, Rational]>();
  return {
    now: () => performance.now(),
    range: (bits) => {
      // The untimed first run of `timed` builds the operands; the timed
      // runs multiply them within the candidate limit, which the product
      // of two parts of that size passes: the gcds run, and it is refused.
      let pair = operands.get(bits);
      if (pair === undefined) {
        pair = [
          rational(fixedBits(bits, 1n), fixedBits(bits, 2n)),
          rational(fixedBits(bits, 3n), fixedBits(bits, 4n)),
        ];
        operands.set(bits, pair);
      }
      multiplyWithin(pair[0], pair[1], bits);
    },
    precision: (digits) => {
      const ceiling = ceilingFor(digits);
      evaluateComposite({
        precision: ceiling,
        rounding: DEFAULT_ROUNDING,
        significandLimitBits: MAX_SIGNIFICAND_LIMIT_BITS,
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
 * milliseconds per operation, each with the timing behind it: the
 * largest of the significand limit's floor and the powers of two from
 * 2^9 to `MAX_SIGNIFICAND_LIMIT_BITS` whose range operation stays within the budget (the
 * floor when none does), and the largest precision limit of the form 1,
 * 2 or 5 times a power of ten, up to what that significand limit holds,
 * whose precision operation stays within it (1 when none does). Each
 * size is timed as the shortest of three runs after one that is not
 * timed.
 */
export function recommendLimits(
  budget: number,
  probe: Probe = realProbe(),
): Recommendation {
  const bits = largestWithin(probe, budget, bitCandidates(), probe.range);
  const digits = largestWithin(
    probe,
    budget,
    roundNumbers(precisionLimitFor(bits.size)),
    probe.precision,
  );
  return {
    significandLimitBits: bits.size,
    productMs: bits.ms,
    precisionLimitDigits: digits.size,
    builtinsMs: digits.ms,
  };
}

/** A size the probe timed, and what its operation took, in milliseconds. */
type Timed = { readonly size: number; readonly ms: number };

/**
 * The largest of `candidates`, ascending and never empty, whose
 * `operation` stays within `budget` on `probe`'s clock, with its time;
 * the first candidate with its time when none does, so that what is
 * recommended was always timed. Stops at the first candidate over the
 * budget: the sizes grow, and so does the cost.
 */
function largestWithin(
  probe: Probe,
  budget: number,
  candidates: readonly number[],
  operation: (size: number) => void,
): Timed {
  let best: Timed | undefined;
  for (const size of candidates) {
    const ms = timed(probe, () => operation(size));
    if (ms > budget && best !== undefined) break;
    best = { size, ms };
    if (ms > budget) break;
  }
  if (best === undefined) throw new Error("The probe has no candidate");
  return best;
}

/** The significand limit's floor, then the powers of two from 2^9 to the hard bound, ascending. */
function bitCandidates(): number[] {
  const candidates = [MIN_SIGNIFICAND_LIMIT_BITS];
  for (let bits = 512; bits <= MAX_SIGNIFICAND_LIMIT_BITS; bits *= 2) {
    if (bits > MIN_SIGNIFICAND_LIMIT_BITS) candidates.push(bits);
  }
  return candidates;
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
