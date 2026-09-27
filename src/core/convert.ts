// Conversion: the last step of the pipeline. `convert` takes the `have` and
// `want` quantities the evaluator produced and answers how many `want`s make
// up `have`, or says why it cannot. ARCHITECTURE.md ("Conversion") gives the
// overview.
//
// Each quantity already carries its own scale (`3 ft` is `0.9144 m`, `in` is
// `0.0254 m`), so once the two are known to conform, the output value is the
// ratio of their magnitudes: `3 ft` into `in` gives `36`. As in GNU units,
// `want` may have a magnitude of its own (`1 mile` into `1000 ft` gives
// `5.28`). Nothing here rounds: division is exact, so the ratio is the exact
// answer and display is where it is rounded, once.
//
// A failure is one of the two conformance errors (a dimension mismatch or a
// kind mismatch, carrying both dimensions so that the UI can show them), or a
// `want` whose magnitude is zero, of which nothing is a multiple. Conformance
// is checked first, so a `want` of `0 s` against a `have` in metres is
// reported as the mismatch it is, not as a zero.
//
// `convertToList` is the second output mode (ARCHITECTURE.md, "Unit lists"):
// `have` as a sum over a list of units, `1 m` into `ft;in` being `3 ft` plus
// `3.37 in`. Each unit but the last gets the integer count of it that fits
// in what the earlier units left, truncated toward zero so that every term
// has the sign of `have`, and the last gets the exact remainder. That is
// only a meaningful sum when the units run from the largest to the
// smallest, so a unit that is not smaller than the one before it is an
// error, as is one that is zero or negative, of which nothing is a
// positive count; and every unit must conform to `have`. The terms are
// exact, like the ratio `convert` returns, and `roundTerms` is the display
// rounding that goes with them: the remainder rounds to the display
// precision in the display's rounding mode, and since a remainder of
// `11.9999999988 in` shown as `12 in` beside `2 ft` would read wrongly, the
// counts are taken again from the rounded sum, so that the rounding carries
// (`3 ft`) as a digit does.

import {
  checkConformance,
  type ConformanceError,
  type Primitives,
} from "./dimension.ts";
import { type Quantity } from "./quantity.ts";
import {
  add,
  compare,
  divide,
  equals,
  multiply,
  roundTo,
  sign,
  subtract,
  trunc,
  type Precision,
  type Rational,
} from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { type RoundingMode } from "./rounding.ts";

export type ConvertError =
  | ConformanceError
  /** `want` has a zero magnitude (`0 m`), so nothing is a multiple of it. */
  | { readonly kind: "zeroWant" };

/** Why a list of units is not a unit list for a `have`; `index` is the unit at fault. */
export type UnitListError =
  /** The unit at `index` does not conform to `have`, as `mismatch` says. */
  | {
      readonly kind: "nonconformingUnit";
      readonly index: number;
      readonly mismatch: ConformanceError;
    }
  /** The unit at `index` has a zero or negative magnitude. */
  | { readonly kind: "nonpositiveUnit"; readonly index: number }
  /** The unit at `index` is not smaller than the one before it. */
  | { readonly kind: "unitOutOfOrder"; readonly index: number };

/**
 * How many `want`s make up `have`: the ratio of their magnitudes, once the
 * two are known to conform. `primitives` supplies the roles the conformance
 * check tells dimensions and kinds apart by; it is the table's.
 */
export function convert(
  have: Quantity,
  want: Quantity,
  primitives: Primitives,
): Result<Rational, ConvertError> {
  const conformance = checkConformance(
    have.dimension,
    want.dimension,
    primitives,
  );
  if (!conformance.ok) return conformance;
  const ratio = divide(have.magnitude, want.magnitude);
  return ratio.ok ? ratio : err({ kind: "zeroWant" });
}

/**
 * `have` as a sum over `units`, one term per unit: an integer count of
 * each but the last, truncated toward zero, and the exact remainder in the
 * last, so that the terms times the units add up to `have` exactly. The
 * units are checked in order, each for conformance with `have`, for a
 * positive magnitude, and for being smaller than the one before it, and
 * the first failure is reported with the unit's index. `units` must not be
 * empty.
 */
export function convertToList(
  have: Quantity,
  units: readonly Quantity[],
  primitives: Primitives,
): Result<readonly Rational[], UnitListError> {
  if (units.length === 0) {
    throw new RangeError("A unit list must have at least one unit");
  }
  const sizes: Rational[] = [];
  for (const [index, unit] of units.entries()) {
    const conformance = checkConformance(
      have.dimension,
      unit.dimension,
      primitives,
    );
    if (!conformance.ok) {
      return err({
        kind: "nonconformingUnit",
        index,
        mismatch: conformance.error,
      });
    }
    if (sign(unit.magnitude) <= 0) {
      return err({ kind: "nonpositiveUnit", index });
    }
    const previous = sizes[index - 1];
    if (previous !== undefined && compare(unit.magnitude, previous) >= 0) {
      return err({ kind: "unitOutOfOrder", index });
    }
    sizes.push(unit.magnitude);
  }
  return ok(decompose(have.magnitude, sizes));
}

/**
 * The `terms` of a sum over `units`, from `convertToList`, as they are to
 * be shown at `digits` significant digits in `mode`: the remainder rounded
 * to `digits` as `roundTo` rounds, and, when that changes it, the counts
 * taken again from the rounded sum, so that a remainder which rounds up to
 * a whole of an earlier unit is carried into that unit rather than shown
 * beside it (`2 ft + 11.9999999988 in` becomes `3 ft`, not `2 ft + 12 in`;
 * under `floor` it stays `2 ft + 11.999999 in`, since nothing rounds up).
 * When the remainder is already exact at `digits`, the terms come back as
 * they are. The rounding is one rounding of the whole sum, by less than a
 * unit in the last digit of the remainder; the counts are integers and are
 * left alone, and one too long to show in `digits` digits is the display's
 * to round.
 */
export function roundTerms(
  units: readonly Quantity[],
  terms: readonly Rational[],
  digits: Precision,
  mode: RoundingMode,
): readonly Rational[] {
  const last = terms.length - 1;
  const remainder = terms[last]!;
  const rounded = roundTo(remainder, digits, mode);
  if (equals(rounded, remainder)) return terms;
  const sizes = units.map((unit) => unit.magnitude);
  const total = terms
    .slice(0, last)
    .reduce(
      (sum, count, i) => add(sum, multiply(count, sizes[i]!)),
      multiply(rounded, sizes[last]!),
    );
  return decompose(total, sizes);
}

/**
 * `magnitude` as a sum over the positive, decreasing `sizes`: the integer
 * count of each but the last that fits in what is left, and the exact
 * remainder in the last.
 */
function decompose(
  magnitude: Rational,
  sizes: readonly Rational[],
): Rational[] {
  const terms: Rational[] = [];
  let rest = magnitude;
  for (const [i, size] of sizes.entries()) {
    const ratio = divide(rest, size);
    if (!ratio.ok) {
      // The sizes were checked to be positive before they got here.
      throw new Error("A unit list has a unit of zero magnitude");
    }
    if (i === sizes.length - 1) {
      terms.push(ratio.value);
    } else {
      const count = trunc(ratio.value);
      terms.push(count);
      rest = subtract(rest, multiply(count, size));
    }
  }
  return terms;
}
