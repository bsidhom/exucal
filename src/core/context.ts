// The number context: what every function that does arithmetic is told
// about how to do it. docs/calculator-plan.md (D1, D2, D12, D16 and tasks
// 1.4 and 2.5) is the design. `precision` is a count of significant decimal
// digits, `rounding` one of the seven modes of rounding.ts, and `maxBits`
// the range limit, the most bits a numerator or denominator may have;
// stage 4 adds the exact or decimal `mode`, which has no effect until the
// decimal mode exists.
//
// One type serves two levels (D1). Below the pipeline, `precision` is the
// working precision: every core function that does arithmetic (`evaluate`,
// `buildTable`, `powQuantity`) computes at it and settles inexact results
// to it. At the pipeline's boundary it is the digits the user asked for,
// and the pipeline is the one place that knows the difference: it takes the
// user's context and derives the working contexts it evaluates at, the
// retry schedule of D12, which doubles from the digits asked for plus a
// guard up to a ceiling. A second type for the user's settings would be
// the same fields with one renamed; the distinction is one of level,
// stated where the derivation happens, not of shape. `maxBits` is the same
// at both levels.
//
// The two limits are on two axes (D16). The range limit, `maxBits`, bounds
// the size of an exact value and so the magnitude of anything; it is what
// turns `10^(10^9)` into a clean `tooLarge` rather than a hang, and it is
// the user's to set, between one bit and the hard bound `LIMIT_BITS` that
// the parser applies. The precision limit is the cap on the digits
// setting, from which `ceilingFor` derives the top of the retry schedule:
// four times the cap plus the guard, so that the largest request has two
// doublings of room for cancellation above it. The cap's own hard bound,
// `maxDigitsFor`, follows from the range limit: a settled midpoint at the
// ceiling must fit it with room for a product of two. The defaults are
// the display's rules before the settings existed and the limits the
// stage 1 code had: eight digits, half away from zero, 2^16 bits, and a
// cap of a thousand digits.
//
// A context whose precision is not a positive integer, whose mode is not
// one of the seven, or whose range limit is not an integer in `[1,
// LIMIT_BITS]`, is a bug in the caller and `checkContext` throws
// `RangeError`, as `rational` does for a zero denominator.

import { bitsFor } from "./fixed.ts";
import { LIMIT_BITS, type Precision } from "./rational.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";

/** How arithmetic is done: at how many digits, rounded in which mode, within how many bits. */
export type NumberContext = {
  readonly precision: Precision;
  readonly rounding: RoundingMode;
  /** The range limit: the most bits a numerator or denominator may have. */
  readonly maxBits: number;
};

/** The digits shown by default: GNU units' eight. */
export const DEFAULT_DIGITS: Precision = 8;

/** The rounding mode by default: to nearest, ties away from zero. */
export const DEFAULT_ROUNDING: RoundingMode = "halfAwayFromZero";

/**
 * The range limit by default, 2^16 bits (about 19,700 decimal digits), at
 * which every exact operation still takes milliseconds. `LIMIT_BITS` in
 * rational.ts is the most the setting may take.
 */
export const DEFAULT_MAX_BITS = 1 << 16;

/**
 * The cap on the digits setting by default: the most digits a user may
 * ask for unless the setting is raised, 1,000. `ceilingFor` derives the
 * retry schedule's ceiling from it, 4,040 digits at this value.
 */
export const DEFAULT_MAX_DIGITS: Precision = 1000;

/**
 * The most digits a user may ask for, in stage 1's settings; 2.6 replaces
 * it with the cap setting of D16, whose default is `DEFAULT_MAX_DIGITS`.
 */
export const MAX_DIGITS: Precision = 200;

/** The digits the schedule adds to the digits asked for, at its first pass. */
export const GUARD_DIGITS: Precision = 10;

/**
 * The ceiling of the retry schedule for a cap of `maxDigits` on the digits
 * setting: `4 (maxDigits + GUARD_DIGITS)`, so that the largest request has
 * two doublings of room above its first pass (D12).
 */
export function ceilingFor(maxDigits: Precision): Precision {
  return 4 * (maxDigits + GUARD_DIGITS);
}

/**
 * The most the cap on the digits setting may be under the range limit
 * `maxBits`: the largest `maxDigits` whose ceiling, at the kernel's bits,
 * is at most half the range limit, so that a settled midpoint at the
 * ceiling fits the limit with room for a product of two (D12, D16). About
 * 2,450 at the default range limit; zero when the limit holds no digits.
 */
export function maxDigitsFor(maxBits: number): Precision {
  const fits = (maxDigits: Precision) =>
    maxDigits >= 1 && 2 * bitsFor(ceilingFor(maxDigits)) <= maxBits;
  let maxDigits = Math.floor((maxBits / 2 - 32) / (4 * Math.log2(10)) - 10);
  while (maxDigits > 0 && !fits(maxDigits)) maxDigits--;
  while (fits(maxDigits + 1)) maxDigits++;
  return Math.max(0, maxDigits);
}

/** Throws `RangeError` unless `context` is one a caller may compute at. */
export function checkContext(context: NumberContext): void {
  const { precision, rounding, maxBits } = context;
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
  if (!ROUNDING_MODES.includes(rounding)) {
    throw new RangeError(`Not a rounding mode: ${String(rounding)}`);
  }
  if (!Number.isInteger(maxBits) || maxBits < 1 || maxBits > LIMIT_BITS) {
    throw new RangeError(
      `The range limit must be an integer in [1, ${LIMIT_BITS}]: ${maxBits}`,
    );
  }
}
