// The hyperbolic functions and their inverses: `sinh(x)`, `cosh(x)`,
// `tanh(x)` on the kernel's `sinhCoshFixed` (fixed-exp.ts, through `exp`),
// and `asinh(x)`, `acosh(x)`, `atanh(x)` through the logarithm and the
// square root (`lnScaled` and `rootBall` of ball.ts). docs/builtins.md is
// the design and docs/calculator-plan.md (task 3.11) places them; they
// share a module because the three forward functions share one kernel
// routine and the three inverses share the one route through `ln` of a
// root. All six take and return plain numbers, since their arguments are
// not angles (D11). Each returns the kernel's ball, rounded in no mode,
// for the evaluator to settle (D15), and an argument of unbounded radius
// gives the function of its midpoint with an unbounded radius. The exact
// cases: zero for `sinh`, `tanh`, `asinh` and `atanh`, `cosh(0)` is one,
// and `acosh(1)` is zero.
//
// `sinh` and `cosh` are guarded by magnitude as `exp` is, and share its
// limit (3.6): an argument whose magnitude over its whole ball would put
// the result beyond the range limit is `tooLarge` at the call, through
// `expFits`, before anything is computed. `tanh` is not: for an argument
// whose magnitude throughout its ball is beyond what the working bits can
// tell from one (`e^-2|x|` under an ulp of the bits plus a margin), it is
// `±1` within `2 e^-2|x|`, a radius the coarse type holds at any
// magnitude, and every other argument is the quotient of the pair on the
// kernel (`tanhFixed`), before either is cut to its bits, so that the
// quotient of two large values keeps the working bits; the saturated
// branch comes first and takes every argument beyond a few thousand, so
// the guard never refuses `tanh`.
//
// `asinh(x)` is `ln(x + sqrt(x^2 + 1))` for `x` at or above zero and the
// negated `asinh(-x)` below it, so that the sum never cancels, computed on
// the kernel throughout (`sqrtFixed` and `lnFixed`) at the working bits
// plus the negative binary exponent of `x`, so that a tiny `x` keeps its
// digits through the root and the sum; `acosh(x)`
// is `ln(x + sqrt(x^2 - 1))`, with `x^2 - 1` formed on the ball, exactly
// for an exact `x`, and rooted by `rootBall`, which scales a tiny value to
// order one, so that `acosh(1 + 1e-30)` keeps its digits; `atanh(x)` is
// `ln((1 + x) / (1 - x)) / 2` with the quotient formed on the ball. The
// domains: `acosh` from `1` up, an argument below one throughout a
// `domain` error (`belowOne`) and one reaching one from above (touching
// counts, as `sideOfZero` counts a ball touching zero) `unresolved` at
// the edge `1`, apart from the exact one; `atanh` strictly between `-1`
// and `1`, an argument at or beyond an end throughout a `domain` error
// (`outsideOpenUnitInterval`) and one reaching an end `unresolved` at it
// (D4). The logarithm's argument is converted at the working bits plus
// the negative binary exponent of the small part it carries (`x` for
// `atanh`, the root for `acosh`), so that `ln(1 + small)`
// keeps the digits of `small` and `asinh(1e-50)`, `atanh(1e-50)` and
// `acosh(1 + 1e-30)` certify on the first pass; the odd functions convert
// a tiny argument the same way for the kernel, as `sin` does. An argument
// of `asinh` whose interval is wider than one half is taken at its
// midpoint with the argument's radius added to the result's, `asinh`
// being within the identity's slope everywhere, since the square under
// the root would not stay positive under the error rules.

import {
  addBalls,
  divideBalls,
  exact,
  expFits,
  isExact,
  lnScaled,
  magnitudeAbove,
  multiplyBalls,
  radiusBound,
  rootBall,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { sinhCoshFixed, tanhFixed, type SinhCosh } from "../fixed-exp.ts";
import { lnFixed } from "../fixed-log.ts";
import {
  addFixed,
  bitsFor,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
  multiplyFixed,
  shiftFixed,
  sqrtFixed,
  type Fixed,
} from "../fixed.ts";
import { addRadius, powerOfTwoRadius, radiusUpper } from "../radius.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  bitLength,
  compare,
  equals,
  isZero,
  negate,
  sign,
  subtract,
  type Rational,
} from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

const MINUS_ONE = negate(ONE);
const HALF: Rational = { num: 1n, den: 2n };

/** `sinh(x)` at the context, as the header says. */
export function sinhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(sinhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  const pair = sinhCosh(x, context);
  return pair.ok ? ok(fixedToBall(pair.value.sinh)) : pair;
}

/** `cosh(x)` at the context, as the header says. */
export function coshBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(coshBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ONE));
  const pair = sinhCosh(x, context);
  return pair.ok ? ok(fixedToBall(pair.value.cosh)) : pair;
}

/** `tanh(x)` at the context, as the header says: `±1` within `2 e^-2|x|` far out. */
export function tanhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(tanhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  const bits = bitsFor(context.precision);
  const saturated = saturation(x, bits);
  if (saturated !== undefined) return ok(saturated);
  if (!expFits(radiusBound(magnitudeAbove(x)), context.maxBits)) {
    return err({ kind: "tooLarge" });
  }
  return ok(
    fixedToBall(tanhFixed(fixedFromBall(x, bits + extraBits(x.mid)), bits)),
  );
}

/** `asinh(x)` at the context, as the header says. */
export function asinhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(asinhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  if (sign(x.mid) < 0) {
    const positive = asinhBall({ mid: negate(x.mid), rad: x.rad }, context);
    return positive.ok
      ? ok({ mid: negate(positive.value.mid), rad: positive.value.rad })
      : positive;
  }
  if (compare(radiusUpper(x.rad), HALF) >= 0) {
    // Wider than one half: the value at the midpoint, and the radius added
    // to the result's, the slope of `asinh` being at most one.
    const at = asinhBall(exact(x.mid), context);
    if (!at.ok) return at;
    return ok({ mid: at.value.mid, rad: addRadius(at.value.rad, x.rad) });
  }
  const bits = bitsFor(context.precision);
  const at = bits + extraBits(x.mid);
  const f = fixedFromBall(x, at);
  const one: Fixed = { value: 1n << BigInt(at), error: 0n, bits: at };
  const s = addFixed(f, sqrtFixed(addFixed(one, multiplyFixed(f, f))));
  return ok(
    fixedToBall(
      keepSignificant(lnFixed(s, at, bitsFor(context.ceiling)), bits),
    ),
  );
}

/** `acosh(x)` at the context, as the header says. */
export function acoshBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(acoshBall(exact(x.mid), context));
  if (isExact(x)) {
    if (equals(x.mid, ONE)) return ok(exact(ZERO));
    if (compare(x.mid, ONE) < 0)
      return err({ kind: "domain", argument: 0, reason: "belowOne" });
  } else {
    const rad = radiusUpper(x.rad);
    if (compare(add(x.mid, rad), ONE) < 0)
      return err({ kind: "domain", argument: 0, reason: "belowOne" });
    if (compare(subtract(x.mid, rad), ONE) <= 0)
      return err({ kind: "unresolved", argument: 0, edge: ONE });
  }
  const root = rootBall(
    subtractBalls(multiplyBalls(x, x), exact(ONE)),
    2n,
    context,
  );
  if (!root.ok) {
    // Positive as rationals but not at the kernel's bits, or not positive
    // under the error rules: the ball reaches within an ulp of one.
    if (root.error.kind === "unresolved")
      return err({ kind: "unresolved", argument: 0, edge: ONE });
    throw new Error("The root of a value above one fails only as unresolved");
  }
  return ok(
    fixedToBall(logarithm(addBalls(x, root.value), root.value.mid, context)),
  );
}

/** `atanh(x)` at the context, as the header says. */
export function atanhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(atanhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  const rad = radiusUpper(x.rad);
  const lower = subtract(x.mid, rad);
  const upper = add(x.mid, rad);
  if (compare(lower, ONE) >= 0 || compare(upper, MINUS_ONE) <= 0) {
    return err({
      kind: "domain",
      argument: 0,
      reason: "outsideOpenUnitInterval",
    });
  }
  if (compare(upper, ONE) >= 0)
    return err({ kind: "unresolved", argument: 0, edge: ONE });
  if (compare(lower, MINUS_ONE) <= 0)
    return err({ kind: "unresolved", argument: 0, edge: MINUS_ONE });
  const quotient = divideBalls(
    addBalls(exact(ONE), x),
    subtractBalls(exact(ONE), x),
  );
  if (!quotient.ok) throw new Error("A divisor above zero was checked");
  const half = shiftFixed(logarithm(quotient.value, x.mid, context), -1);
  return ok(fixedToBall(keepSignificant(half, bitsFor(context.precision))));
}

/**
 * The kernel's hyperbolic sine and cosine of the bounded `x` at the
 * context, or `tooLarge` when the result would exceed the range limit: a
 * tiny `x` is converted at as many more fraction bits as its magnitude is
 * below one, so that the kernel keeps its digits.
 */
function sinhCosh(
  x: Ball,
  context: NumberContext,
): Result<SinhCosh, BuiltinError> {
  if (!expFits(radiusBound(magnitudeAbove(x)), context.maxBits)) {
    return err({ kind: "tooLarge" });
  }
  const bits = bitsFor(context.precision);
  return ok(sinhCoshFixed(fixedFromBall(x, bits + extraBits(x.mid)), bits));
}

/**
 * `tanh` of an `x` whose magnitude throughout its ball puts it within an
 * ulp of `±1` at `bits` plus a margin: `±1` within `2 e^-2m` for the
 * least magnitude `m`, or `undefined` when `x` is not that far out.
 */
function saturation(x: Ball, bits: number): Ball | undefined {
  const rad = radiusUpper(x.rad);
  const least = subtract(absolute(x.mid), rad);
  // e^-2m is under 2^-(bits + 64) when m exceeds (bits + 64) ln 2 / 2.
  const threshold = Math.ceil(((bits + 64) * Math.LN2) / 2);
  if (compare(least, { num: BigInt(threshold), den: 1n }) < 0) return undefined;
  // 2 e^-2m <= 2^(1 - floor(2 m log2 e)), with m taken through a double
  // and capped, since a radius of 2^-(2^50) is small enough for anything.
  const m = Math.min(2 ** 50, Number(least.num / least.den));
  const exponent = 1n - BigInt(Math.floor(2 * m * Math.LOG2E));
  return {
    mid: sign(x.mid) < 0 ? MINUS_ONE : ONE,
    rad: powerOfTwoRadius(exponent),
  };
}

/**
 * The kernel's logarithm of the bounded `s`, positive throughout, with
 * `bits` significant bits kept for its magnitude: `s` is converted at the
 * working bits plus the negative binary exponent of `small`, the part of
 * `s` near one it must keep, so that `ln(1 + small)` loses nothing.
 */
function logarithm(s: Ball, small: Rational, context: NumberContext): Fixed {
  const bits = bitsFor(context.precision);
  const f = lnScaled(s, bits + extraBits(small), bitsFor(context.ceiling));
  if (f === undefined) throw new Error("The logarithm's argument is positive");
  return keepSignificant(f, bits);
}

/** The fraction bits a value of magnitude below one needs beyond the working bits to keep them: its negative binary exponent. */
function extraBits(r: Rational): number {
  if (isZero(r)) return 0;
  return Math.max(0, bitLength(r.den) - bitLength(absolute(r).num));
}

export const sinh: Builtin = {
  name: "sinh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => sinhBall(x!, context),
};

export const cosh: Builtin = {
  name: "cosh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => coshBall(x!, context),
};

export const tanh: Builtin = {
  name: "tanh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => tanhBall(x!, context),
};

export const asinh: Builtin = {
  name: "asinh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => asinhBall(x!, context),
};

export const acosh: Builtin = {
  name: "acosh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => acoshBall(x!, context),
};

export const atanh: Builtin = {
  name: "atanh",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => atanhBall(x!, context),
};
