// The number context: what every function that does arithmetic is told
// about how to do it. docs/calculator-plan.md (D1, D2 and task 1.4) is the
// design. `precision` is a count of significant decimal digits and
// `rounding` one of the seven modes of rounding.ts; stage 4 adds the exact
// or decimal `mode`, which has no effect until the decimal mode exists.
//
// One type serves two levels (D1). Below the pipeline, `precision` is the
// working precision: every core function that does arithmetic (`evaluate`,
// `buildTable`, `powQuantity`) computes at it and rounds inexact results to
// it. At the pipeline's boundary it is the digits the user asked for, and
// the pipeline is the one place that knows the difference: it takes the
// user's context and derives the working contexts it evaluates at (a fixed
// guard of digits in stage 1, the retry schedule from stage 2). A second
// type for the user's settings would be the same fields with one renamed;
// the distinction is one of level, stated where the derivation happens, not
// of shape.
//
// The defaults are the display's rules before the settings existed: eight
// digits, as GNU units shows, rounded to nearest with ties away from zero.
// A context whose precision is not a positive integer, or whose mode is not
// one of the seven, is a bug in the caller and `checkContext` throws
// `RangeError`, as `rational` does for a zero denominator.

import { type Precision } from "./rational.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";

/** How arithmetic is done: at how many digits, rounded in which mode. */
export type NumberContext = {
  readonly precision: Precision;
  readonly rounding: RoundingMode;
};

/** The digits shown by default: GNU units' eight. */
export const DEFAULT_DIGITS: Precision = 8;

/** The rounding mode by default: to nearest, ties away from zero. */
export const DEFAULT_ROUNDING: RoundingMode = "halfAwayFromZero";

/**
 * The most digits a user may ask for. The value is D12's: the retry
 * schedule of stage 2 doubles from the digits asked for up to an absolute
 * ceiling, and the setting is capped well below the ceiling so that the
 * schedule always has room above it for cancellation.
 */
export const MAX_DIGITS: Precision = 200;

/** Throws `RangeError` unless `context` is one a caller may compute at. */
export function checkContext(context: NumberContext): void {
  const { precision, rounding } = context;
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
  if (!ROUNDING_MODES.includes(rounding)) {
    throw new RangeError(`Not a rounding mode: ${String(rounding)}`);
  }
}
