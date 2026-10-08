// The number context: what every function that does arithmetic is told
// about how to do it. devdocs/history/calculator-plan.md (D1, D2, D12, D16 and tasks
// 1.4, 2.5 and 3.3) is the design. `precision` is a count of significant
// decimal digits, `rounding` one of the seven modes of rounding.ts,
// `significandLimitBits` the significand limit, the most bits a numerator or denominator may
// have, and `ceiling` the top of the retry schedule, the most digits any
// pass may compute at, and `mode` the exact or the decimal mode of stage 4
// (devdocs/design/decimal.md; restated by D26 in devdocs/design/decimal-mode.md), absent
// meaning exact: in exact mode an inexact midpoint is settled to the
// working digits to nearest and the rounding mode is the display's alone;
// in decimal mode every step is rounded once to `precision` digits in the
// rounding mode and is exact, so the mode governs every operation, and
// the pipeline runs one pass. In decimal mode `working`, the working
// digits of D27 (devdocs/design/working-digits.md), is the precision every step but
// the last is rounded to: the evaluator computes a step's operands at
// `operandContext`, the context at the working digits, and the step
// itself at the context it was given, so that the root of an expression
// and the quotients the pipeline forms are rounded to `precision` from
// exact results of working-digit operands. Absent, the working digits are
// the precision, which is D26 as landed; exact mode ignores them, the
// pass setting its precision.
//
// One type serves two levels (D1). Below the pipeline, `precision` is the
// working precision: every core function that does arithmetic (`evaluate`,
// `buildTable`, `powQuantity`) computes at it and settles inexact results
// to it. At the pipeline's boundary it is the digits the user asked for,
// and the pipeline is the one place that knows the difference: it takes the
// user's context and derives the working contexts it evaluates at, the
// retry schedule of D12, which doubles from the digits asked for plus a
// guard up to the ceiling. A second type for the user's settings would be
// the same fields with one renamed; the distinction is one of level,
// stated where the derivation happens, not of shape. `significandLimitBits` and
// `ceiling` are the same at both levels: the one bounds what any pass may
// form, the other how far the passes may rise, and `precision <= ceiling`
// always. The ceiling is in the context so that it reaches the built-ins:
// the memoized constants (constants.ts, D10) hold their value at the
// ceiling, and `pi()` reads it from the context it is called with. It is
// static, the user's, derived from the precision limit; a
// routine that needs more headroom than the working precision takes it
// inside the kernel and never moves the ceiling.
//
// The two limits are on two axes (D16, restated by stage 4). The
// significand limit, `significandLimitBits`, bounds the size of an exact value's significand and the
// alignment of a sum, the magnitude being the exponent's (scaled.ts, whose
// bound is `10^18`); it is what turns `3^1000000000` and `1e999999999 + 1`
// into a clean `tooLarge` rather than a hang, and it is the user's to set,
// between one bit and the hard bound `MAX_SIGNIFICAND_LIMIT_BITS` that the
// parser applies. The precision limit is the user's, the most digits any
// grid may be asked for, from which `ceilingFor` derives the top of the
// retry schedule:
// four times the precision limit plus the guard, so that the largest request has two
// doublings of room for cancellation above it. The precision limit's own hard bound,
// `precisionLimitFor`, follows from the significand limit: a settled midpoint at the
// ceiling must fit it with room for a product of two. The defaults are
// the display's rules before the settings existed, with the rounding
// mode changed to ties-to-even by S2 of the settings plan, and the
// limits the stage 1 code had: eight digits, half even, 2^16 bits, and a
// precision limit of a thousand digits.
//
// A context whose precision is not a positive integer, whose rounding mode
// is not one of the seven, whose mode is neither exact nor decimal, whose
// significand limit is not an integer in `[1, MAX_SIGNIFICAND_LIMIT_BITS]`, or whose ceiling is
// not an integer at or above the precision, or whose working digits are
// not an integer at or above the precision within the precision limit the ceiling was
// derived from, is a bug in the caller and `checkContext` throws
// `RangeError`, as `rational` does for a zero denominator.

import { bitsFor } from "./fixed.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS } from "./rational.ts";
import {
  ROUNDING_MODES,
  digitsFor,
  type Precision,
  type RoundingMode,
} from "./rounding.ts";

/**
 * The two modes of D15 and devdocs/design/decimal.md: `exact`, where an exact value
 * is never rounded and the rounding mode is the display's, and `decimal`,
 * where every result is rounded to the precision in the rounding mode.
 */
export type Mode = "exact" | "decimal";

export const MODES: readonly Mode[] = ["exact", "decimal"];

/** How arithmetic is done: at how many digits, rounded in which mode, within how many bits, under which ceiling, in which of the two modes. */
export type NumberContext = {
  readonly precision: Precision;
  readonly rounding: RoundingMode;
  /** The significand limit: the most bits a numerator or denominator may have. */
  readonly significandLimitBits: number;
  /** The top of the retry schedule: the most digits any pass computes at, at or above `precision`. */
  readonly ceiling: Precision;
  /** Exact or decimal (4.5); absent is exact, so every context written before the mode existed is an exact one. */
  readonly mode?: Mode;
  /**
   * The working digits of decimal mode (D27): the digits every step but
   * the last is rounded to, at or above `precision`, which the last step
   * is rounded to. Absent means `precision`; exact mode ignores it.
   */
  readonly working?: Precision;
};

/** The mode of `context`: exact where none is given. */
export function modeOf(context: NumberContext): Mode {
  return context.mode ?? "exact";
}

/**
 * The context the operands of a step at `context` are computed at (D27):
 * in decimal mode with working digits above the precision, `context` at
 * the working digits, so that every step below the one at `context` is
 * rounded to them and that step alone to the precision; otherwise
 * `context` itself. Idempotent, so an operand's own operands are computed
 * at the same context.
 */
export function operandContext(context: NumberContext): NumberContext {
  const { working, precision } = context;
  if (
    working === undefined ||
    working === precision ||
    modeOf(context) !== "decimal"
  ) {
    return context;
  }
  return { ...context, precision: working };
}

/** `context` without its working digits, which a context derived at another precision does not carry. */
function withoutWorking(context: NumberContext): NumberContext {
  if (context.working === undefined) return context;
  const { working: _working, ...rest } = context;
  return rest;
}

/**
 * The decimal digits of the working grid at `context`'s precision: the
 * digits its kernel bits are worth, `digitsFor(bitsFor(precision))`, to
 * which a kernel result is rounded as it leaves the kernel and an inexact
 * midpoint is settled in exact mode (D15 as restated in 4.0).
 */
export function workingDigits(context: NumberContext): Precision {
  return digitsFor(bitsFor(context.precision));
}

/** The digits shown by default: GNU units' eight. */
export const DEFAULT_DISPLAY_DIGITS: Precision = 8;

/**
 * The rounding mode by default: to nearest, ties to even, IEEE 754's
 * default and unbiased over many roundings where ties away from zero
 * drift (devdocs/design/settings-modes.md).
 */
export const DEFAULT_ROUNDING: RoundingMode = "halfEven";

/**
 * The significand limit by default, 2^16 bits (about 19,700 decimal digits), at
 * which every exact operation still takes milliseconds: the costliest,
 * a product of two fractions of that size in each part, reduced and then
 * measured and refused at the node (D19), takes about two of H.9's 19 ms
 * gcds. `MAX_SIGNIFICAND_LIMIT_BITS` in rational.ts is the most the setting may take.
 * The tests, sweeps and benchmarks compute at this value or at contexts
 * of their own, never at a device's setting, so their results do not
 * depend on the limits a device has chosen (ARCHITECTURE.md, "Layout").
 */
export const DEFAULT_SIGNIFICAND_LIMIT_BITS = 1 << 16;

/**
 * The precision limit by default: the most digits a user may
 * ask for unless the setting is raised, 1,000. `ceilingFor` derives the
 * retry schedule's ceiling from it, 4,040 digits at this value.
 */
export const DEFAULT_PRECISION_LIMIT_DIGITS: Precision = 1000;

/** The digits the schedule adds to the digits asked for, at its first pass. */
export const GUARD_DIGITS: Precision = 10;

/**
 * The ceiling of the retry schedule for a precision limit of
 * `precisionLimitDigits`: `4 (precisionLimitDigits + GUARD_DIGITS)`, so that the largest request has
 * two doublings of room above its first pass (D12).
 */
export function ceilingFor(precisionLimitDigits: Precision): Precision {
  return 4 * (precisionLimitDigits + GUARD_DIGITS);
}

/** The ceiling of the default precision limit: 4,040 digits. */
export const DEFAULT_CEILING: Precision = ceilingFor(
  DEFAULT_PRECISION_LIMIT_DIGITS,
);

/**
 * The working contexts of the retry schedule for `context` (D12): the
 * digits asked for plus the guard, then that doubled, doubled again, and
 * so on while below the ceiling, and the ceiling last, each with the
 * context's other fields as they are. Exact mode runs the pipeline
 * through them (pipeline.ts, `schedule`); decimal mode runs each step of
 * the expression through them, in exact mode, until its rounding is
 * certified (ball.ts, `step`; D26). A precision above the precision limit the ceiling was
 * derived from (`ceilingFor`, four times the precision limit plus the guard) is a
 * precondition failure.
 */
export function workingContexts(context: NumberContext): NumberContext[] {
  const { ceiling } = context;
  const first = context.precision + GUARD_DIGITS;
  if (4 * first > ceiling) {
    throw new RangeError(
      `${context.precision} digits exceed the precision limit for a ceiling of ${ceiling}`,
    );
  }
  const base = withoutWorking(context);
  const contexts: NumberContext[] = [];
  for (let precision = first; precision < ceiling; precision *= 2) {
    contexts.push({ ...base, precision });
  }
  contexts.push({ ...base, precision: ceiling });
  return contexts;
}

/**
 * `context` at its ceiling, in exact mode: the last working context of
 * the retry schedule, the same for every precision under one ceiling, and
 * the context the table is built at (D6), whatever the user's mode, since
 * a unit is settled in the user's mode when it is looked up (4.6).
 */
export function ceilingContext(context: NumberContext): NumberContext {
  const exact = modeOf(context) === "exact";
  const plain = context.working === undefined;
  if (context.precision === context.ceiling && exact && plain) return context;
  const at = { ...withoutWorking(context), precision: context.ceiling };
  return exact ? at : { ...at, mode: "exact" };
}

/**
 * The most the precision limit may be under the significand limit
 * `significandLimitBits`: the largest `precisionLimitDigits` whose ceiling, at the kernel's bits,
 * is at most half the significand limit, so that a settled midpoint at the
 * ceiling fits the limit with room for a product of two (D12, D16). About
 * 2,450 at the default significand limit; zero when the limit holds no digits.
 */
export function precisionLimitFor(significandLimitBits: number): Precision {
  const fits = (precisionLimitDigits: Precision) =>
    precisionLimitDigits >= 1 &&
    2 * bitsFor(ceilingFor(precisionLimitDigits)) <= significandLimitBits;
  let precisionLimitDigits = Math.floor(
    (significandLimitBits / 2 - 32) / (4 * Math.log2(10)) - 10,
  );
  while (precisionLimitDigits > 0 && !fits(precisionLimitDigits))
    precisionLimitDigits--;
  while (fits(precisionLimitDigits + 1)) precisionLimitDigits++;
  return Math.max(0, precisionLimitDigits);
}

/**
 * The least significand limit that holds a digit: twice the kernel's bits at the
 * ceiling of a precision limit of one digit (D16), the floor of the setting.
 */
export const MIN_SIGNIFICAND_LIMIT_BITS = 2 * bitsFor(ceilingFor(1));

/** Throws `RangeError` unless `context` is one a caller may compute at. */
export function checkContext(context: NumberContext): void {
  const { precision, rounding, significandLimitBits, ceiling, mode, working } =
    context;
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
  if (!ROUNDING_MODES.includes(rounding)) {
    throw new RangeError(`Not a rounding mode: ${String(rounding)}`);
  }
  if (mode !== undefined && !MODES.includes(mode)) {
    throw new RangeError(`Not a mode: ${String(mode)}`);
  }
  if (
    !Number.isInteger(significandLimitBits) ||
    significandLimitBits < 1 ||
    significandLimitBits > MAX_SIGNIFICAND_LIMIT_BITS
  ) {
    throw new RangeError(
      `The significand limit must be an integer in [1, ${MAX_SIGNIFICAND_LIMIT_BITS}]: ${significandLimitBits}`,
    );
  }
  if (!Number.isInteger(ceiling) || ceiling < precision) {
    throw new RangeError(
      `The ceiling must be an integer at or above the precision ${precision}: ${ceiling}`,
    );
  }
  if (working !== undefined) {
    if (!Number.isInteger(working) || working < precision) {
      throw new RangeError(
        `The working digits must be an integer at or above the precision ${precision}: ${working}`,
      );
    }
    if (4 * (working + GUARD_DIGITS) > ceiling) {
      throw new RangeError(
        `${working} working digits exceed the precision limit for a ceiling of ${ceiling}`,
      );
    }
  }
}
