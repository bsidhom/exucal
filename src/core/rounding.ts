// The rounding modes, named once, and the one place a mode is interpreted:
// `divideRounded` is the integer division of a signed numerator by a
// positive denominator, rounded in a mode. Everything else that rounds
// (`roundTo` and `format` in scaled.ts, and through them the display and
// the rounding of a unit list's remainder) scales its value so that the
// digits to keep form an integer, divides here, and scales back, so a mode
// means the same thing wherever it is applied. docs/calculator-plan.md
// (task 1.1) places this module; docs/calculator.md (features 4 and 5) says
// why one setting governs every rounding there is.
//
// The seven modes are those of the General Decimal Arithmetic specification
// and IEEE 754-2008. Three are to nearest and differ only on a tie, a
// quotient exactly halfway between two integers: `halfEven` takes the even
// neighbour (the default of IEEE binary arithmetic and of `Intl.NumberFormat`
// with `roundingMode: "halfEven"`), `halfAwayFromZero` the one of larger
// magnitude (the rounding people expect from `0.125 → 0.13`; the `halfExpand`
// of `Intl.NumberFormat`), and `halfTowardZero` the one of smaller magnitude.
// Four are directed and do not look at the fraction beyond whether it is
// zero: `towardZero` truncates (`trunc`), `awayFromZero` is its opposite,
// and `ceiling` and `floor` go up and down on the number line whatever the
// sign, so they are the two that treat `7/2` and `-7/2` differently.
//
// A non-positive denominator is a precondition failure and throws
// `RangeError`, as `rational` does for a zero denominator: every caller has a
// denominator that is a power of ten or a `Rational`'s, which is positive by
// invariant.
//
// `Precision`, a count of significant decimal digits, lives here too (from
// stage 4's 4.3, out of rational.ts, which is left the fraction alone),
// with `checkPrecision`, `digitsFor`, the digits a count of binary digits
// is worth, and `DEFAULT_PRECISION`, the working precision the app computed
// at before the number context existed, which the tests still use.

/** A count of significant decimal digits: a positive integer. */
export type Precision = number;

/**
 * The fixed working precision the app computed at before the number
 * context existed, in significant decimal digits; the tests use it as a
 * working precision. See ARCHITECTURE.md ("Working precision and the
 * context").
 */
export const DEFAULT_PRECISION: Precision = 40;

/** Throws `RangeError` unless `precision` is a positive integer. */
export function checkPrecision(precision: Precision): void {
  if (!Number.isInteger(precision) || precision < 1) {
    throw new RangeError(`Precision must be a positive integer: ${precision}`);
  }
}

/**
 * The decimal digits `bits` binary digits are worth, `ceil(bits log10 2)`:
 * the digits a kernel result of `bits` significant bits is rounded to as
 * it leaves the kernel, and settling's grid in exact mode (4.4).
 */
export function digitsFor(bits: number): Precision {
  if (!Number.isInteger(bits) || bits < 1) {
    throw new RangeError(`A bit count must be a positive integer: ${bits}`);
  }
  return Math.ceil(bits * Math.log10(2));
}

/** The seven rounding modes; `ROUNDING_MODES` lists them in a fixed order. */
export type RoundingMode =
  /** To nearest; a tie goes to the even neighbour. */
  | "halfEven"
  /** To nearest; a tie goes away from zero (`2.5 → 3`, `-2.5 → -3`). */
  | "halfAwayFromZero"
  /** To nearest; a tie goes toward zero (`2.5 → 2`, `-2.5 → -2`). */
  | "halfTowardZero"
  /** Toward zero: truncation (`3.7 → 3`, `-3.7 → -3`). */
  | "towardZero"
  /** Away from zero (`3.2 → 4`, `-3.2 → -4`). */
  | "awayFromZero"
  /** Toward positive infinity (`3.2 → 4`, `-3.7 → -3`). */
  | "ceiling"
  /** Toward negative infinity (`3.7 → 3`, `-3.2 → -4`). */
  | "floor";

/** The modes in the order the UI lists them: to nearest first, then directed. */
export const ROUNDING_MODES: readonly RoundingMode[] = [
  "halfEven",
  "halfAwayFromZero",
  "halfTowardZero",
  "towardZero",
  "awayFromZero",
  "ceiling",
  "floor",
];

/**
 * `num / den` rounded to an integer in `mode`, where `den > 0`. An exact
 * quotient is returned as it is in every mode; otherwise the true quotient
 * lies strictly between two integers, and the mode says which one.
 */
export function divideRounded(
  num: bigint,
  den: bigint,
  mode: RoundingMode,
): bigint {
  if (den <= 0n) {
    throw new RangeError(`Rounded division needs a positive divisor: ${den}`);
  }
  // `/` and `%` on bigints truncate toward zero, so `remainder` has the sign
  // of `num` and `toward` is the neighbour on the zero side of the quotient.
  const toward = num / den;
  const remainder = num % den;
  if (remainder === 0n) return toward;
  const positive = num > 0n;
  const away = positive ? toward + 1n : toward - 1n;
  switch (mode) {
    case "towardZero":
      return toward;
    case "awayFromZero":
      return away;
    case "ceiling":
      return positive ? away : toward;
    case "floor":
      return positive ? toward : away;
    case "halfEven":
    case "halfAwayFromZero":
    case "halfTowardZero": {
      // Twice the fraction's magnitude against the divisor tells which
      // neighbour is nearer, and equality is a tie.
      const twice = 2n * (positive ? remainder : -remainder);
      if (twice < den) return toward;
      if (twice > den) return away;
      switch (mode) {
        case "halfAwayFromZero":
          return away;
        case "halfTowardZero":
          return toward;
        case "halfEven":
          return toward % 2n === 0n ? toward : away;
      }
    }
  }
}
