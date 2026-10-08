// `floor`, `ceil`, `trunc` and `round` (devdocs/design/special.md, "The exact
// functions"; the plan's 6.1 and D22). Each takes a plain number: a
// quantity's magnitude is stored in the primitives, so `floor(3.7 ft)`
// would floor `1.12776 m`, and a function whose answer depends on the
// unit the value is written in is defined only on plain numbers. On an
// exact value each is exact; on a ball each finds the cell of values its
// midpoint's result stands for and is exact when the ball lies strictly
// inside it, by `position`, and `unresolved` at the cell's boundary it
// touches or reaches across, a ball touching a boundary counting as
// straddling it (D4), which the retry loop narrows.
//
// `round(x)` rounds to an integer and `round(x, places)` to a multiple of
// `10^-places`, a negative count rounding to the left of the point, in
// the context's rounding mode: the mode surfaces inside an expression
// here and nowhere else in exact mode (D15), which is what a call of
// `round` asks for. The cell of a result depends on the mode: half a unit
// either side for the modes to nearest, a unit on the side the mode
// rounds from for the directed modes. The power of ten is formed only
// where it is small: a count with more digits than the significand limit holds
// is `tooLarge`, and a value below a tenth of the unit forms none. A
// `places` count that cannot be formed within the significand limit is
// `tooLarge` too.

import { exact, isExact, position, type Ball } from "../ball.ts";
import {
  tooLarge,
  checkArgument,
  plainNumbers,
  unboundedOf,
  unresolvedAt,
  type Builtin,
  type BuiltinError,
  UNKNOWN_NEED,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  abs,
  boundOf,
  rational,
} from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import { divideRounded, type RoundingMode } from "../rounding.ts";
import {
  BITS_PER_DIGIT,
  ZERO,
  add,
  decimalDigits,
  fromInteger,
  isInteger,
  isRefusal,
  isZero,
  scaled,
  sign,
  trunc,
  type Scaled,
  bitsOfTens,
} from "../scaled.ts";
import { integerOf } from "./integers.ts";

// ---------------------------------------------------------------------------
// On exact values

type Rounding = (s: Scaled) => Result<Scaled, BuiltinError>;

/** `s` toward zero to an integer, formed within `limit` bits. */
export function truncScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = trunc(s, limit);
  return t === undefined ? tooLarge("exceeds", UNKNOWN_NEED) : ok(t);
}

/** The integer `s` plus `n`, formed within the hard bound. */
function stepped(s: Scaled, n: bigint): Result<Scaled, BuiltinError> {
  const sum = add(s, fromInteger(n), MAX_SIGNIFICAND_LIMIT_BITS);
  return sum.ok ? sum : tooLarge("exceeds", UNKNOWN_NEED);
}

/** The largest integer at or below `s`. */
export function floorScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = truncScaled(s, limit);
  if (!t.ok) return t;
  return sign(s) < 0 ? stepped(t.value, -1n) : t;
}

/** The smallest integer at or above `s`. */
export function ceilScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = truncScaled(s, limit);
  if (!t.ok) return t;
  return sign(s) > 0 ? stepped(t.value, 1n) : t;
}

/**
 * What a value below a tenth of the unit rounds to, in units, by its
 * sign in `mode`: zero in the modes to nearest and toward zero, one unit
 * away from zero in the directed modes that round away on that side.
 */
function roundedBelowTenth(side: -1 | 0 | 1, mode: RoundingMode): bigint {
  switch (mode) {
    case "awayFromZero":
      return BigInt(side);
    case "ceiling":
      return side > 0 ? 1n : 0n;
    case "floor":
      return side < 0 ? -1n : 0n;
    default:
      return 0n;
  }
}

/**
 * `s` rounded to a multiple of `10^-places` in `mode`, formed within
 * `limit` bits: the count of units, `s × 10^places`, rounded to an
 * integer by `divideRounded`, times the unit. A value that is already
 * such a multiple is returned as it is. The power of ten is formed only
 * where it is small: a count with more digits than the limit holds is
 * `tooLarge`, and a value below a tenth of the unit, whose count is zero
 * or one by the mode, forms none (`round(1e-999999999, 2)` is `0`).
 */
export function roundScaled(
  s: Scaled,
  places: bigint,
  mode: RoundingMode,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isZero(s)) return ok(ZERO);
  const unit = -places;
  const { num, den } = s.significand;
  if (den === 1n && s.exp >= unit) return ok(s);
  const shift = s.exp - unit;
  let count: bigint;
  if (shift >= 0n) {
    const digits = Number(shift) + decimalDigits(abs(num));
    if (digits * BITS_PER_DIGIT > limit) {
      return tooLarge("exceeds", boundOf(bitsOfTens(digits)));
    }
    count = divideRounded(num * 10n ** shift, den, mode);
  } else if (-shift > BigInt(decimalDigits(abs(num)) + 1)) {
    count = roundedBelowTenth(sign(s), mode);
  } else {
    count = divideRounded(num, den * 10n ** -shift, mode);
  }
  const rounded = scaled(rational(count), unit);
  if (rounded.ok) return rounded;
  return isRefusal(rounded.error)
    ? err(rounded.error)
    : tooLarge("exceeds", UNKNOWN_NEED);
}

// ---------------------------------------------------------------------------
// On balls

/** The open cell of values a rounding takes to one result, `lo < x < hi`, or `point` when only the result itself does. */
type Cell = { readonly lo: Scaled; readonly hi: Scaled } | "point";

/**
 * `f` on the ball `x`: `f` of the midpoint, exact for an exact `x`, with
 * an unbounded radius for an unbounded `x`, and otherwise exact when `x`
 * lies strictly inside the cell of its midpoint's result and `unresolved`
 * at the cell's boundary it touches or reaches across. A cell whose
 * boundary cannot be formed (an integer midpoint near the top of the
 * exponent bound, whose neighbours do not align with it within the hard
 * bound, or a unit below the bottom of it) leaves the ball `unresolved`
 * at the result itself: nothing can place an inexact ball inside such a
 * cell, and `unresolved` is never wrong about the value.
 */
function roundBall(
  x: Ball,
  f: Rounding,
  cellOf: (r: Scaled) => Result<Cell, BuiltinError>,
): Result<Ball, BuiltinError> {
  const r = f(x.mid);
  if (!r.ok) return r;
  if (x.rad.kind === "unbounded") return unboundedOf(ok(exact(r.value)));
  if (isExact(x)) return ok(exact(r.value));
  const cell = cellOf(r.value);
  if (!cell.ok || cell.value === "point") return unresolvedAt(0, r.value);
  const { lo, hi } = cell.value;
  if (position(x, lo) !== "above") return unresolvedAt(0, lo);
  if (position(x, hi) !== "below") return unresolvedAt(0, hi);
  return ok(exact(r.value));
}

/** The cell `(r + below × unit, r + above × unit)` for an integer `r` and the unit one. */
function integerCell(
  r: Scaled,
  below: bigint,
  above: bigint,
): Result<Cell, BuiltinError> {
  const lo = stepped(r, below);
  if (!lo.ok) return lo;
  const hi = stepped(r, above);
  if (!hi.ok) return hi;
  return ok({ lo: lo.value, hi: hi.value });
}

/** `floor` on a ball: the cell of `r` is `[r, r + 1)`. */
export function floorBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => floorScaled(s, context.significandLimitBits),
    (r) => integerCell(r, 0n, 1n),
  );
}

/** `ceil` on a ball: the cell of `r` is `(r - 1, r]`. */
export function ceilBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => ceilScaled(s, context.significandLimitBits),
    (r) => integerCell(r, -1n, 0n),
  );
}

/** `trunc` on a ball: the cell of `r` is `[r, r + 1)` above zero, `(r - 1, r]` below, and `(-1, 1)` at zero. */
export function truncBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => truncScaled(s, context.significandLimitBits),
    (r) => {
      const side = sign(r);
      return integerCell(r, side > 0 ? 0n : -1n, side < 0 ? 0n : 1n);
    },
  );
}

/** `r` plus `count` units of `10^exponent`, formed within the hard bound. */
function offset(
  r: Scaled,
  count: bigint,
  exponent: bigint,
): Result<Scaled, BuiltinError> {
  const step = scaled(rational(count), exponent);
  if (!step.ok) return tooLarge("exceeds", UNKNOWN_NEED);
  const sum = add(r, step.value, MAX_SIGNIFICAND_LIMIT_BITS);
  return sum.ok ? sum : tooLarge("exceeds", UNKNOWN_NEED);
}

/**
 * The cell of the result `r` of a rounding to the unit `10^-places` in
 * `mode`: half a unit either side for the modes to nearest, a unit on the
 * side the mode rounds from for the directed modes, both sides at zero
 * for `towardZero`, and the point itself at zero for `awayFromZero`,
 * which takes nothing else to zero.
 */
function roundCell(
  r: Scaled,
  places: bigint,
  mode: RoundingMode,
): Result<Cell, BuiltinError> {
  const unit = -places;
  const cell = (
    below: bigint,
    above: bigint,
    exponent = unit,
  ): Result<Cell, BuiltinError> => {
    const lo = offset(r, below, exponent);
    if (!lo.ok) return lo;
    const hi = offset(r, above, exponent);
    if (!hi.ok) return hi;
    return ok({ lo: lo.value, hi: hi.value });
  };
  const side = sign(r);
  switch (mode) {
    case "halfEven":
    case "halfAwayFromZero":
    case "halfTowardZero":
      return cell(-5n, 5n, unit - 1n);
    case "ceiling":
      return cell(-1n, 0n);
    case "floor":
      return cell(0n, 1n);
    case "towardZero":
      return side > 0 ? cell(0n, 1n) : side < 0 ? cell(-1n, 0n) : cell(-1n, 1n);
    case "awayFromZero":
      return side > 0 ? cell(-1n, 0n) : side < 0 ? cell(0n, 1n) : ok("point");
  }
}

/** `round(x, places)` on a ball, in the context's rounding mode. */
export function roundToPlaces(
  x: Ball,
  places: bigint,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const mode = context.rounding;
  return roundBall(
    x,
    (s) => roundScaled(s, places, mode, context.significandLimitBits),
    (r) => roundCell(r, places, mode),
  );
}

// ---------------------------------------------------------------------------
// The built-ins

export const floor: Builtin = {
  name: "floor",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => floorBall(x!, context),
};

export const ceil: Builtin = {
  name: "ceil",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => ceilBall(x!, context),
};

export const truncFn: Builtin = {
  name: "trunc",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => truncBall(x!, context),
};

/**
 * `round(x)` to an integer and `round(x, places)` to `places` decimal
 * places, the places an exact integer, in the context's rounding mode.
 */
export const round: Builtin = {
  name: "round",
  arity: { min: 1, max: 2 },
  dimensions: (args, primitives) => {
    const x = checkArgument(args, 0, DIMENSIONLESS, primitives);
    if (!x.ok) return x;
    const places = checkArgument(args, 1, DIMENSIONLESS, primitives);
    return places.ok ? ok(DIMENSIONLESS) : places;
  },
  apply: ([x, places], context) => {
    if (places === undefined) return roundToPlaces(x!, 0n, context);
    const count = integerOf(places, 1, context);
    if (!count.ok) return count;
    return roundToPlaces(x!, count.value, context);
  },
};
