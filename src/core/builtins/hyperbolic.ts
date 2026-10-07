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
// `sinh` and `cosh` are held to the exponent bound as `exp` is, and share
// its range (3.6, then 4.9, then H.15): the classifier of ball.ts
// (`classifyHyperbolic`) holds `|x| - ln 2`, the logarithm of either's
// magnitude within an ulp, to the top edge over the whole ball, an
// `overflow` at the call before anything is computed only when every
// value of the argument puts the result past the top, for an argument of
// either sign, both being large in magnitude there (`cosh(-1e30)` is as
// large as `cosh(1e30)`), `unresolved` at the edge `bound` when some do,
// and otherwise the
// kernel's pair of `Floating`s comes out through digits.ts
// (`floatingToBall`), so that `sinh(1e6)` and `cosh(1e6)` are values. `tanh` is not: for an argument
// whose magnitude throughout its ball is beyond what the working bits can
// tell from one (`e^-2|x|` under an ulp of the bits plus a margin), it is
// `±1` within `2 e^-2|x|`, a radius the coarse type holds at any
// magnitude; an argument of radius one half or more that is not saturated
// is zero within one, `tanh`'s whole range, which certifies nothing and
// lets the retry loop narrow it (a ball reaching both sides of zero was
// refused by the exponential's guard, issue #49, and the kernel's bound
// certified `±1`, issue #38); and every other argument is the quotient of
// the pair on the kernel (`tanhFixed`), before either is cut to its bits,
// so that the quotient of two large values keeps the working bits. So
// `tanh` has no guard and is never refused for its argument's size: with
// no saturation and a radius below one half, `|mid| + rad` stays below
// about 181,727 at the largest ceiling the settings allow.
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
//
// The two ends of the exponent (4.4) are answered before the kernel is
// entered. An argument below `2^-significandLimitBits` throughout is its own `sinh`,
// `tanh`, `asinh` and `atanh` within its cube, and its `cosh` is one
// within its square (`tinyOdd` and `tinyEven` of builtin.ts). An argument
// at or beyond `2^bits` throughout has `asinh(x)` and `acosh(x)` equal to
// `ln(2|x|)` within `1/(2x^2)`, the saturation docs/decimal.md lists
// (`farLogarithm`, on `lnScaled`, which takes any exponent), with the
// argument's radius over its distance from zero added, the slope of the
// logarithm; `tanh`'s saturation stands and comes first, and `sinh` and
// `cosh` are held to the exponent bound by the classifier.

import {
  addBalls,
  classifyHyperbolic,
  divideBalls,
  exact,
  isExact,
  lnScaled,
  magnitudeBelow,
  multiplyBalls,
  position,
  radiusBound,
  rootBall,
  subtractBalls,
  type Ball,
  type BallError,
} from "../ball.ts";
import {
  extraBits,
  fromBallError,
  isBeyond,
  isTiny,
  plainNumbers,
  tinyEven,
  tinyOdd,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import { floatingToBall } from "../digits.ts";
import { sinhCoshFixed, tanhFixed, type SinhCosh } from "../fixed-exp.ts";
import { ln2Fixed, lnFixed } from "../fixed-log.ts";
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
import {
  addRadius,
  compareRadius,
  divideRadius,
  powerOfTwoRadius,
  radiusAbove,
} from "../radius.ts";
import { rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import {
  ONE,
  ZERO,
  absolute,
  compare,
  equals,
  isRefusal,
  isZero,
  negate,
  sign,
  type Scaled,
} from "../scaled.ts";

const MINUS_ONE = negate(ONE);

/** `sinh(x)` at the context, as the header says. */
export function sinhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(sinhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  if (isTiny(x, context)) return ok(tinyOdd(x));
  const pair = sinhCosh(x, context);
  if (!pair.ok) return pair;
  return out(floatingToBall(pair.value.sinh, context));
}

/** `cosh(x)` at the context, as the header says. */
export function coshBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(coshBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ONE));
  if (isTiny(x, context)) return ok(tinyEven(x));
  const pair = sinhCosh(x, context);
  if (!pair.ok) return pair;
  return out(floatingToBall(pair.value.cosh, context));
}

/** `tanh(x)` at the context, as the header says: `±1` within `2 e^-2|x|` far out. */
export function tanhBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(tanhBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  if (isTiny(x, context)) return ok(tinyOdd(x));
  const bits = bitsFor(context.precision);
  const saturated = saturation(x, bits);
  if (saturated !== undefined) return ok(saturated);
  // Wider than one: zero within one, tanh's whole range, which certifies
  // nothing and lets the retry loop narrow the argument; the kernel is
  // never handed a midpoint it may not hold (issues #38 and #49).
  if (compareRadius(x.rad, powerOfTwoRadius(-1n)) >= 0) {
    return ok({ mid: ZERO, rad: powerOfTwoRadius(0n) });
  }
  return ok(
    fixedToBall(
      tanhFixed(fixedFromBall(x, bits + extraBits(x.mid, context)), bits),
      workingDigits(context),
    ),
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
  if (isTiny(x, context)) return ok(tinyOdd(x));
  const bits = bitsFor(context.precision);
  if (isBeyond(x, bits)) return ok(farLogarithm(x, context));
  if (compareRadius(x.rad, powerOfTwoRadius(-1n)) >= 0) {
    // Wider than one half: the value at the midpoint, and the radius added
    // to the result's, the slope of `asinh` being at most one.
    const at = asinhBall(exact(x.mid), context);
    if (!at.ok) return at;
    return ok({ mid: at.value.mid, rad: addRadius(at.value.rad, x.rad) });
  }
  const at = bits + extraBits(x.mid, context);
  const f = fixedFromBall(x, at);
  const one: Fixed = { value: 1n << BigInt(at), error: 0n, bits: at };
  const s = addFixed(f, sqrtFixed(addFixed(one, multiplyFixed(f, f))));
  return ok(
    fixedToBall(
      keepSignificant(lnFixed(s, at, bitsFor(context.ceiling)), bits),
      workingDigits(context),
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
    switch (position(x, ONE)) {
      case "above":
        break;
      case "below":
        return err({ kind: "domain", argument: 0, reason: "belowOne" });
      default:
        return err({ kind: "unresolved", argument: 0, edge: ONE });
    }
  }
  const bits = bitsFor(context.precision);
  if (isBeyond(x, bits)) return ok(farLogarithm(x, context));
  const square = multiplyBalls(x, x);
  if (!square.ok) return err(fromBallError(square.error, 0));
  const complement = subtractBalls(square.value, exact(ONE), context);
  if (!complement.ok) return err(fromBallError(complement.error, 0));
  const root = rootBall(complement.value, 2n, context);
  if (!root.ok) {
    // Positive as numbers but not at the kernel's bits, or not positive
    // under the error rules: the ball reaches within an ulp of one.
    if (root.error.kind === "unresolved")
      return err({ kind: "unresolved", argument: 0, edge: ONE });
    throw new Error("The root of a value above one fails only as unresolved");
  }
  const sum = addBalls(x, root.value, context);
  if (!sum.ok) return err(fromBallError(sum.error, 0));
  return ok(
    fixedToBall(
      logarithm(sum.value, root.value.mid, context),
      workingDigits(context),
    ),
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
  const atOne = position(x, ONE);
  const atMinusOne = position(x, MINUS_ONE);
  if (
    atOne === "above" ||
    atOne === "touchingAbove" ||
    atOne === "at" ||
    atMinusOne === "below" ||
    atMinusOne === "touchingBelow" ||
    atMinusOne === "at"
  ) {
    return err({
      kind: "domain",
      argument: 0,
      reason: "outsideOpenUnitInterval",
    });
  }
  if (atOne !== "below")
    return err({ kind: "unresolved", argument: 0, edge: ONE });
  if (atMinusOne !== "above")
    return err({ kind: "unresolved", argument: 0, edge: MINUS_ONE });
  if (isTiny(x, context)) return ok(tinyOdd(x));
  const numerator = addBalls(exact(ONE), x, context);
  if (!numerator.ok) return err(fromBallError(numerator.error, 0));
  const denominator = subtractBalls(exact(ONE), x, context);
  if (!denominator.ok) return err(fromBallError(denominator.error, 0));
  const quotient = divideBalls(numerator.value, denominator.value);
  if (!quotient.ok) {
    // The divisor was checked to be above zero, so only a refusal of the
    // quotient is left, at the exponent bound; the significand limit is the
    // evaluator's check on the call's result (D19), not the quotient's.
    if (!isRefusal(quotient.error)) {
      throw new Error("A divisor above zero was checked");
    }
    return err(fromBallError(quotient.error, 0));
  }
  const half = shiftFixed(logarithm(quotient.value, x.mid, context), -1);
  return ok(
    fixedToBall(
      keepSignificant(half, bitsFor(context.precision)),
      workingDigits(context),
    ),
  );
}

/** A kernel result's ball as the built-in's, its exponent bound failure the argument's. */
function out(result: Result<Ball, BallError>): Result<Ball, BuiltinError> {
  return result.ok ? result : err(fromBallError(result.error, 0));
}

/**
 * The kernel's hyperbolic sine and cosine of the bounded `x` at the
 * context, held to the exponent bound by the classifier as the header
 * says: a small `x` is converted at as many more fraction bits as its
 * magnitude is below one, so that the kernel keeps its digits.
 */
function sinhCosh(
  x: Ball,
  context: NumberContext,
): Result<SinhCosh, BuiltinError> {
  switch (classifyHyperbolic(x, context)) {
    case "overflow":
      return err({ kind: "overflow" });
    case "underflow":
      throw new Error("The hyperbolic functions are held to the top alone");
    case "unresolved":
      return err({ kind: "unresolved", argument: 0, edge: "bound" });
    case "compute":
      break;
  }
  const bits = bitsFor(context.precision);
  return ok(
    sinhCoshFixed(fixedFromBall(x, bits + extraBits(x.mid, context)), bits),
  );
}

/**
 * `tanh` of an `x` whose magnitude throughout its ball puts it within an
 * ulp of `±1` at `bits` plus a margin: `±1` within `2 e^-2m` for the
 * least magnitude `m`, or `undefined` when `x` is not that far out.
 */
function saturation(x: Ball, bits: number): Ball | undefined {
  const least = magnitudeBelow(x);
  // e^-2m is under 2^-(bits + 64) when m exceeds (bits + 64) ln 2 / 2.
  const threshold = Math.ceil(((bits + 64) * Math.LN2) / 2);
  if (compareRadius(least, radiusAbove(rational(BigInt(threshold)))) < 0) {
    return undefined;
  }
  // 2 e^-2m <= 2^(1 - floor(2 m log2 e)), with m taken through a double,
  // exact for a radius of this size, and capped, since a radius of
  // 2^-(2^50) is small enough for anything.
  const m = Math.min(2 ** 50, radiusBound(least));
  const exponent = 1n - BigInt(Math.floor(2 * m * Math.LOG2E));
  return {
    mid: sign(x.mid) < 0 ? MINUS_ONE : ONE,
    rad: powerOfTwoRadius(exponent),
  };
}

/**
 * `asinh` and `acosh` of a bounded `x` at or beyond `2^bits` throughout:
 * `ln(2|x|)` on the kernel through `lnScaled`, within `1/(2x^2)`, which
 * `2^-(2 bits + 1)` bounds, plus the argument's radius over its distance
 * from zero, the slope of the logarithm over the interval.
 */
function farLogarithm(x: Ball, context: NumberContext): Ball {
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  // `ln(2|x|)` as `ln 2 + ln |x|`, the logarithm of `|x|` from the kernel
  // and `ln 2` from its memo: `2|x|` itself is never formed, since it
  // passes the exponent bound for `5e1000000000000000000` (issue #44).
  const f = lnScaled(exact(absolute(x.mid)), bits, ceilingBits);
  if (f === undefined) throw new Error("The logarithm's argument is positive");
  const sum = addFixed(f, ln2Fixed(bits, ceilingBits));
  const ln = fixedToBall(keepSignificant(sum, bits), workingDigits(context));
  return {
    mid: ln.mid,
    rad: addRadius(
      addRadius(ln.rad, powerOfTwoRadius(-2n * BigInt(bits) - 1n)),
      divideRadius(x.rad, magnitudeBelow(x)),
    ),
  };
}

/**
 * The kernel's logarithm of the bounded `s`, positive throughout, with
 * `bits` significant bits kept for its magnitude: `s` is converted at the
 * working bits plus the negative binary exponent of `small`, the part of
 * `s` near one it must keep, so that `ln(1 + small)` loses nothing.
 */
function logarithm(s: Ball, small: Scaled, context: NumberContext): Fixed {
  const bits = bitsFor(context.precision);
  const f = lnScaled(
    s,
    bits + extraBits(small, context),
    bitsFor(context.ceiling),
  );
  if (f === undefined) throw new Error("The logarithm's argument is positive");
  return keepSignificant(f, bits);
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
