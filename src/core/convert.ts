// Conversion: the last step of the pipeline. `convert` takes the `have` and
// `want` quantities the evaluator produced and answers how many `want`s make
// up `have`, or says why it cannot. ARCHITECTURE.md ("Conversion") gives the
// overview.
//
// Each quantity already carries its own scale (`3 ft` is `0.9144 m`, `in` is
// `0.0254 m`), so once the two are known to conform, the output value is the
// ratio of their magnitudes: `3 ft` into `in` gives `36`. As in GNU units,
// `want` may have a magnitude of its own (`1 mile` into `1000 ft` gives
// `5.28`). Nothing here rounds: the ratio is the ball quotient, exact on
// the midpoints with the radii propagated, so it is the exact answer for
// exact quantities and display is where it is rounded, once; a quotient
// whose exponent passes the bound is `tooLarge`.
//
// A failure is one of the two conformance errors (a dimension mismatch or a
// kind mismatch, carrying both dimensions so that the UI can show them), a
// `want` whose magnitude is zero, of which nothing is a multiple, or a
// `want` whose magnitude cannot be told from zero at this precision (its
// ball contains zero without being exactly zero), which is `unresolvedWant`,
// kept apart from `zeroWant` as the ball's `unresolved` is from its division
// by zero: the retry loop of the pipeline retries the first and never the
// second. Conformance is checked first, so a `want` of `0 s` against a
// `have` in metres is reported as the mismatch it is, not as a zero.
//
// `convertToList` is the second output mode (ARCHITECTURE.md, "Unit lists"):
// `have` as a sum over a list of units, `1 m` into `ft;in` being `3 ft` plus
// `3.37 in`. Each unit but the last gets the integer count of it that fits
// in what the earlier units left, truncated toward zero so that every term
// has the sign of `have`, and the last gets the remainder. The counts are
// taken from the midpoints (D8 of docs/calculator-plan.md), so a count is
// exact and never `unresolved`, and the remainder is the ball `have - count
// × size`, computed with the ball operations at the `NumberContext` the
// sums align within (4.4), so that the terms times the units still
// contain `have`; a ratio whose integer part cannot be formed within the
// range limit (`1e999999999 m` into `km;m`) is counted as its midpoint
// settled toward zero at the working digits, an integer of that many
// digits, and the remainder is what that count leaves (D8 as 4.4 amended
// it). One case is decided the other way: when the
// ratio's ball straddles an integer, as `turn / deg` does once both carry
// `pi()`'s radius (`359.999... ± ε`), the count is that integer, since a
// count that cannot be told from a boundary is best taken as the boundary,
// and the remainder is then a ball around zero, which the display leaves
// out, rather than a whole of the unit (`360 deg`, not `359 deg + 60
// arcmin`; exact units are untouched, a ball of radius zero straddling an
// integer only when it is one). A remainder that comes out slightly
// negative that way, or slightly above a whole of the unit before it, is
// the display's carry case, which `roundTerms` handles. That is only a
// meaningful sum when the
// units run from the largest to the smallest, so a unit that is not smaller
// than the one before it (by midpoint) is an error, as is one that is zero
// or negative or cannot be told from zero, of which nothing is a positive
// count; and every unit must conform to `have`. `roundTerms` is the display
// rounding that goes with the terms: the remainder's midpoint rounds to the
// display precision in the display's rounding mode, with its radius widened
// by the rounding's shift so that the rounded terms still contain `have`,
// and since a remainder of `11.9999999988 in` shown as `12 in` beside `2 ft`
// would read wrongly, the counts are taken again from the rounded sum, so
// that the rounding carries (`3 ft`) as a digit does. The widening matters
// after a carry: the remainder that is left is then a hair from zero, and
// its ball must say so (the plan's 3.4 found it claiming digits instead).

import {
  addBalls,
  containsZero,
  divideBalls,
  exact,
  multiplyBalls,
  position,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import { workingDigits, type NumberContext } from "./context.ts";
import {
  checkConformance,
  type ConformanceError,
  type Primitives,
} from "./dimension.ts";
import type { Quantity } from "./quantity.ts";
import { addRadius, isZeroRadius, radiusAboveScaled } from "./radius.ts";
import { LIMIT_BITS } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import type { Precision, RoundingMode } from "./rounding.ts";
import {
  ONE,
  absolute,
  add,
  compare,
  equals,
  negate,
  roundTo,
  scaled,
  sign,
  subtract,
  trunc,
  type Scaled,
} from "./scaled.ts";

export type ConvertError =
  | ConformanceError
  /** `want` has a zero magnitude (`0 m`), so nothing is a multiple of it. */
  | { readonly kind: "zeroWant" }
  /** `want` has a magnitude that cannot be told from zero at this precision. */
  | { readonly kind: "unresolvedWant" }
  /** The ratio's exponent passes the bound. */
  | { readonly kind: "tooLarge" };

/** Why a list of units is not a unit list for a `have`; `index` is the unit at fault. */
export type UnitListError =
  /** The unit at `index` does not conform to `have`, as `mismatch` says. */
  | {
      readonly kind: "nonconformingUnit";
      readonly index: number;
      readonly mismatch: ConformanceError;
    }
  /** The unit at `index` has a magnitude that is zero or negative, or cannot be told from zero. */
  | { readonly kind: "nonpositiveUnit"; readonly index: number }
  /** The unit at `index` is not smaller than the one before it. */
  | { readonly kind: "unitOutOfOrder"; readonly index: number };

/**
 * How many `want`s make up `have`: the ratio of their magnitudes, a ball,
 * once the two are known to conform. `primitives` supplies the roles the
 * conformance check tells dimensions and kinds apart by; it is the table's.
 */
export function convert(
  have: Quantity,
  want: Quantity,
  primitives: Primitives,
): Result<Ball, ConvertError> {
  const conformance = checkConformance(
    have.dimension,
    want.dimension,
    primitives,
  );
  if (!conformance.ok) return conformance;
  const ratio = divideBalls(have.magnitude, want.magnitude);
  if (ratio.ok) return ratio;
  switch (ratio.error.kind) {
    case "divisionByZero":
      return err({ kind: "zeroWant" });
    case "unresolved":
      return err({ kind: "unresolvedWant" });
    case "tooLarge":
      return err({ kind: "tooLarge" });
    default:
      // A quotient of balls grows neither operand beyond its own size.
      throw new Error(`A ratio of magnitudes failed: ${ratio.error.kind}`);
  }
}

/**
 * `have` as a sum over `units`, one term per unit: an exact integer count
 * of each but the last, truncated toward zero from the ratio of midpoints,
 * and the remainder in the last, the ball `have` less the counted units,
 * at `context`, so that the terms times the units add up to `have`
 * (contain it, when `have` or a unit is inexact). The units are checked
 * in order, each for conformance with `have`, for a positive magnitude
 * whose ball excludes zero, and for being smaller than the one before it,
 * and the first failure is reported with the unit's index. `units` must
 * not be empty.
 */
export function convertToList(
  have: Quantity,
  units: readonly Quantity[],
  primitives: Primitives,
  context: NumberContext,
): Result<readonly Ball[], UnitListError> {
  if (units.length === 0) {
    throw new RangeError("A unit list must have at least one unit");
  }
  const sizes: Ball[] = [];
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
    // Positive means the whole ball is: a unit that cannot be told from
    // zero is no size to count by either.
    const size = unit.magnitude;
    if (sign(size.mid) <= 0 || containsZero(size)) {
      return err({ kind: "nonpositiveUnit", index });
    }
    const previous = sizes[index - 1];
    if (previous !== undefined && compare(size.mid, previous.mid) >= 0) {
      return err({ kind: "unitOutOfOrder", index });
    }
    sizes.push(size);
  }
  return ok(decompose(have.magnitude, sizes, context));
}

/**
 * The `terms` of a sum over `units`, from `convertToList`, as they are to
 * be shown at `digits` significant digits in `mode`: the remainder's
 * midpoint rounded to `digits` as `roundTo` rounds, its radius widened by
 * the distance the rounding moved it, so that the rounded term still
 * contains the value the unrounded one did, and, when that changes it, the
 * counts taken again from the rounded sum, so that a remainder which rounds
 * up to a whole of an earlier unit is carried into that unit rather than
 * shown beside it (`2 ft + 11.9999999988 in` becomes `3 ft`, not `2 ft +
 * 12 in`; under `floor` it stays `2 ft + 11.999999 in`, since nothing
 * rounds up). When the remainder's midpoint is already exact at `digits`,
 * the terms come back as they are. The rounding is one rounding of the
 * whole sum, by less than a unit in the last digit of the remainder; the
 * counts are integers and are left alone, and one too long to show in
 * `digits` digits is the display's to round.
 */
export function roundTerms(
  units: readonly Quantity[],
  terms: readonly Ball[],
  digits: Precision,
  mode: RoundingMode,
  context: NumberContext,
): readonly Ball[] {
  const last = terms.length - 1;
  const remainder = terms[last]!;
  const rounded = roundTo(remainder.mid, digits, mode);
  if (equals(rounded, remainder.mid)) return terms;
  const shift = radiusAboveScaled(
    settled(subtract(rounded, remainder.mid, LIMIT_BITS)),
  );
  const widened: Ball = { mid: rounded, rad: addRadius(remainder.rad, shift) };
  const sizes = units.map((unit) => unit.magnitude);
  const total = terms
    .slice(0, last)
    .reduce(
      (sum, count, i) =>
        settled(
          addBalls(sum, settled(multiplyBalls(count, sizes[i]!)), context),
        ),
      settled(multiplyBalls(widened, sizes[last]!)),
    );
  return decompose(total, sizes, context);
}

/**
 * `magnitude` as a sum over the positive, decreasing `sizes`, whose balls
 * exclude zero: the exact integer count of each but the last that fits in
 * what is left, from the ratio of midpoints (`countOf`), and the remainder
 * in the last, the ball of what is left over the last size, the sums
 * aligned at `context`.
 */
function decompose(
  magnitude: Ball,
  sizes: readonly Ball[],
  context: NumberContext,
): Ball[] {
  const terms: Ball[] = [];
  let rest = magnitude;
  for (const [i, size] of sizes.entries()) {
    const ratio = divideBalls(rest, size);
    if (!ratio.ok) {
      // The sizes were checked to exclude zero before they got here, and a
      // quotient of values within the bound is within it.
      throw new Error("A unit list has a unit that cannot be divided by");
    }
    if (i === sizes.length - 1) {
      terms.push(ratio.value);
    } else {
      const count = exact(countOf(ratio.value, context));
      terms.push(count);
      rest = settled(
        subtractBalls(rest, settled(multiplyBalls(count, size)), context),
      );
    }
  }
  return terms;
}

/**
 * The count a `ratio` of magnitudes gives (D8): its midpoint truncated
 * toward zero, unless the ball straddles the integer nearest its midpoint,
 * which is then the count, so that a ratio that cannot be told from a
 * whole number is counted as that whole number and leaves a remainder
 * around zero rather than a whole of the unit. An exact ratio straddles an
 * integer only when it is one, and an unbounded one is truncated. A
 * midpoint whose integer part cannot be formed within the range limit of
 * `context` is settled toward zero at the working digits instead, which
 * is an integer, the value being that far above one.
 */
function countOf(ratio: Ball, context: NumberContext): Scaled {
  const truncated = trunc(ratio.mid, context.maxBits);
  if (truncated === undefined) {
    const count = trunc(
      roundTo(ratio.mid, workingDigits(context), "towardZero"),
      LIMIT_BITS,
    );
    if (count === undefined) throw new Error("A settled count is an integer");
    return count;
  }
  if (ratio.rad.kind === "unbounded" || isZeroRadius(ratio.rad)) {
    return truncated;
  }
  const nearest = nearestInteger(ratio.mid, truncated);
  switch (position(ratio, nearest)) {
    case "above":
    case "below":
      return truncated;
    default:
      return nearest;
  }
}

/** The integer nearest `s`, given `truncated`, its truncation toward zero: a half rounds away from zero. */
function nearestInteger(s: Scaled, truncated: Scaled): Scaled {
  const fraction = settled(subtract(s, truncated, LIMIT_BITS));
  if (compare(absolute(fraction), HALF) < 0) return truncated;
  const step = sign(fraction) > 0 ? ONE : negate(ONE);
  return settled(add(truncated, step, LIMIT_BITS));
}

const HALF: Scaled = ((): Scaled => {
  const half = scaled({ num: 5n, den: 1n }, -1n);
  if (!half.ok) throw new Error("One half is within the bound");
  return half.value;
})();

/**
 * The value of an operation the checks above rule out failing: a sum of
 * terms that came from one decomposition aligns as it did, and a product
 * of a count and a size is within the bound the ratio was.
 */
function settled<T>(result: Result<T, BallError>): T {
  if (!result.ok)
    throw new Error(`A unit list's arithmetic failed: ${result.error.kind}`);
  return result.value;
}
