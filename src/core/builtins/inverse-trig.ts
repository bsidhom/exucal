// `asin(x)`, `acos(x)`, `atan(x)` and `atan2(y, x)`: the inverse
// trigonometric functions, which return an angle (the `radian` kind, D11),
// on the kernel's `atanFixed` (fixed-trig.ts). docs/builtins.md is the
// design and docs/calculator-plan.md (task 3.10) places them; they share a
// module because every one of them is an arctangent. `asin` and `acos`
// take a plain number in `[-1, 1]`; `atan` any plain number; `atan2` two
// quantities of one dimension, kinds included, whose ratio is the plain
// number it takes the arctangent of by quadrant. Each returns the kernel's
// ball, rounded in no mode, for the evaluator to settle (D15), and an
// argument of unbounded radius gives the function of its midpoint with an
// unbounded radius.
//
// `asin(x)` is `2 atan(x / (1 + sqrt(1 - x^2)))` and `acos(x)` is `2
// atan(sqrt(1 - x^2) / (1 + x))` for `x` at or above zero and `pi - 2
// atan(sqrt(1 - x^2) / (1 - x))` below it, so that neither divides by a
// value near zero and `acos(1 - 1e-30)` keeps its digits: `1 - x^2` is
// formed on the ball, exactly for an exact `x`, and its root goes through
// `rootBall`, which scales a tiny value to order one. The domain is read
// off `x`'s position against `±1` before the square is formed, so that a
// huge argument is the domain error and not a square past a limit (the
// plan's H.7, issue #47): above `1` or below `-1` throughout, the error is
// `domain` (`outsideClosedUnitInterval`); reaching either end (a ball
// touching `1` cannot be told from crossing it), the error is
// `unresolved` at the edge `1` or `-1` on the side of the midpoint (D4),
// and a complement positive as numbers that the root cannot tell from
// zero at the working bits is the same case; exactly `±1` are the cases
// `asin(1)` is `pi/2`, `asin(-1)` is `-pi/2`, `acos(-1)` is `pi`, and
// `acos(1)` is the exact zero. The other exact cases are zero for `asin`
// and `atan`.
//
// `atan2(y, x)` by quadrant: `atan(y / x)` for an `x` positive throughout;
// that plus pi or minus pi by the sign of `y` for an `x` negative
// throughout; `±pi/2 - atan(x / y)` by the sign of `y` for a `y` of
// definite sign when `x` reaches zero, which is where `y / x` could not
// be formed; before any of these, for a `y` of definite sign, the
// magnitudes compared as radii where no ratio needs forming (the plan's
// H.7, issue #47): `±pi/2` within `2^-bits` when `|y|` is at least
// `|x| 2^bits` throughout, since `|atan(x / y)|` is then within that,
// and `±pi` within `2^-bits` when `x` is negative and `|y| / |x|` lies
// below `2^-bits`, so that `atan2(1e600000000000000000,
// 1e-600000000000000000)` and `atan2(1e-999999999999999999, -1)` are
// values where their ratio was refused at a limit or, once formed, the
// kernel's door threw on it; a tiny ratio over a positive `x` is its
// own arctangent within its cube, as `atan`'s argument is, so that
// `atan2(1e-999999999999999999, 1)` keeps its value rather than going
// in as zero within an ulp; `unresolved` at `y` with edge zero when `y` straddles zero
// and `x` is not positive throughout, since the result jumps by `2 pi`
// there; and for a `y` exactly zero, the exact zero for an `x` positive
// throughout, `pi` for one negative throughout, `unresolved` at `x` with
// edge zero for one straddling it, and the `domain` error `origin` for
// one exactly zero. pi is the memo's (constants.ts), combined on the
// kernel before the ball is formed. A tiny argument of `atan`, or a tiny
// ratio, is converted at the working bits plus its negative binary
// exponent, as `sin` converts one, so `atan(1e-50)` keeps its digits. A
// ratio past the exponent bound on either side is the quotient's
// refusal, `atan2(-1e-600000000000000000, 1e600000000000000000)` an
// `underflow`, since its value cannot be written.
//
// The two ends of the exponent (4.4) are answered before the kernel is
// entered. An argument of `atan` below `2^-significandLimitBits` throughout is itself
// within its cube (`tinyOdd` of builtin.ts), and an argument of `asin` or
// `acos` whose square lies below `2^-bitsFor(precision)` throughout is
// its expansion at zero already, `asin` the argument within its cube and
// `acos` `pi/2` less that, which keeps the working bits since the
// expansion's relative error is the square: the threshold is on the
// square at the working bits rather than `isTiny`'s `2^-significandLimitBits`, since
// `1 - x^2` stops aligning within the significand limit long before that
// (`acos(1e-9860)` was refused at the default, issue #47); one of `atan` at
// or beyond `2^bits` throughout is `±pi/2` within `2^-bits`, the
// saturation docs/decimal.md lists. Neither `atan` nor `atan2` is
// refused for an argument's radius (issue #64, by H.1's rule for
// `tanh`): a ball that reaches `2^significandLimitBits` without lying beyond `2^bits`
// throughout, which the kernel's door refused as `tooLarge`, is the
// function's whole range, zero within two for `atan`, the kernel's own
// trivial bound for a wide interval, and zero within four for `atan2`
// (the powers of two above `pi/2` and `pi`; `WHOLE_RANGE_ATAN` says why
// not the fractions of pi themselves), which certifies nothing and lets
// the retry loop narrow the argument. One such ratio is `unresolved`
// instead: `x / y` with `x` straddling zero and `y` of definite sign,
// since the value then ranges over nearly all of `(0, pi)` or `(-pi, 0)`
// and which end it lies near depends on `x`'s side of zero, which is
// what D4's error says, where a ball around zero would read as a value
// near zero (the comment at that branch has the case). A refusal is
// final, and no value of either function reaches any limit.

import {
  addBalls,
  divideBalls,
  exact,
  isExact,
  magnitudeAbove,
  magnitudeBelow,
  multiplyBalls,
  position,
  rootBall,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  conformingToAngle,
  extraBits,
  fromBallError,
  isBeyond,
  isHuge,
  isTiny,
  numberToAngle,
  sideOfZero,
  tinyOdd,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { piFixed } from "../constants.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import { atanFixed } from "../fixed-trig.ts";
import {
  addFixed,
  bitsFor,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
  scaleFixed,
  shiftFixed,
  subtractFixed,
  type Fixed,
} from "../fixed.ts";
import {
  addRadius,
  compareRadius,
  multiplyRadius,
  powerOfTwoRadius,
} from "../radius.ts";
import { err, ok, type Result } from "../result.ts";
import { ONE, ZERO, equals, isZero, negate, sign } from "../scaled.ts";

const MINUS_ONE = negate(ONE);

/** `atan(x)` at the context, as the header says. */
export function atanBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(atanBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  if (isTiny(x, context)) return ok(tinyOdd(x));
  const bits = bitsFor(context.precision);
  if (isBeyond(x, bits)) {
    // atan(x) = ±pi/2 - atan(1/x), and |atan(1/x)| <= 1/|x| <= 2^-bits.
    const half = fixedToBall(halfPi(context), workingDigits(context));
    return ok({
      mid: sign(x.mid) < 0 ? negate(half.mid) : half.mid,
      rad: addRadius(half.rad, powerOfTwoRadius(-BigInt(bits))),
    });
  }
  if (isHuge(x, context)) return ok(WHOLE_RANGE_ATAN);
  return ok(fixedToBall(atanKernel(x, context), workingDigits(context)));
}

/** `asin(x)` at the context, as the header says. */
export function asinBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(asinBall(exact(x.mid), context));
  const digits = workingDigits(context);
  if (isExact(x)) {
    if (isZero(x.mid)) return ok(exact(ZERO));
    if (equals(x.mid, ONE)) return ok(fixedToBall(halfPi(context), digits));
    if (equals(x.mid, MINUS_ONE))
      return ok(fixedToBall(negateFixed(halfPi(context)), digits));
  }
  if (squareBelow(x, bitsFor(context.precision))) return ok(tinyOdd(x));
  const root = complementRoot(x, context);
  if (!root.ok) return root;
  const denominator = addBalls(exact(ONE), root.value, context);
  if (!denominator.ok) return err(fromBallError(denominator.error, 0));
  const z = quotient(x, denominator.value, 0);
  if (!z.ok) return z;
  return ok(fixedToBall(scaleFixed(atanKernel(z.value, context), 2n), digits));
}

/** `acos(x)` at the context, as the header says. */
export function acosBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(acosBall(exact(x.mid), context));
  const digits = workingDigits(context);
  if (isExact(x)) {
    if (equals(x.mid, ONE)) return ok(exact(ZERO));
    if (equals(x.mid, MINUS_ONE)) return ok(fixedToBall(pi(context), digits));
  }
  const bits = bitsFor(context.precision);
  if (squareBelow(x, bits)) {
    // acos(x) = pi/2 - asin(x), and asin(x) is x within its cube; a
    // difference that cannot be aligned absorbs the argument into the
    // radius, both operands being inexact.
    const result = subtractBalls(
      fixedToBall(halfPi(context), digits),
      tinyOdd(x),
      context,
    );
    return result.ok ? result : err(fromBallError(result.error, 0));
  }
  const root = complementRoot(x, context);
  if (!root.ok) return root;
  if (sign(x.mid) >= 0) {
    const denominator = addBalls(exact(ONE), x, context);
    if (!denominator.ok) return err(fromBallError(denominator.error, 0));
    const z = quotient(root.value, denominator.value, 0);
    if (!z.ok) return z;
    return ok(
      fixedToBall(scaleFixed(atanKernel(z.value, context), 2n), digits),
    );
  }
  const denominator = subtractBalls(exact(ONE), x, context);
  if (!denominator.ok) return err(fromBallError(denominator.error, 0));
  const z = quotient(root.value, denominator.value, 0);
  if (!z.ok) return z;
  const twice = scaleFixed(atanKernel(z.value, context), 2n);
  return ok(
    fixedToBall(
      keepSignificant(subtractFixed(pi(context), twice), bits),
      digits,
    ),
  );
}

/** `atan2(y, x)` at the context, as the header says. */
export function atan2Ball(
  y: Ball,
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (y.rad.kind === "unbounded" || x.rad.kind === "unbounded") {
    return unboundedOf(
      atan2Ball(
        y.rad.kind === "unbounded" ? exact(y.mid) : y,
        x.rad.kind === "unbounded" ? exact(x.mid) : x,
        context,
      ),
    );
  }
  const bits = bitsFor(context.precision);
  const digits = workingDigits(context);
  const ySide = sideOfZero(y);
  const xSide = sideOfZero(x);
  if (ySide === "zero") {
    switch (xSide) {
      case "positive":
        return ok(exact(ZERO));
      case "negative":
        return ok(fixedToBall(pi(context), digits));
      case "zero":
        return err({ kind: "domain", argument: 0, reason: "origin" });
      case "straddles":
        return err({ kind: "unresolved", argument: 1, edge: ZERO });
    }
  }
  const scale = powerOfTwoRadius(BigInt(bits));
  if (ySide !== "straddles") {
    // |y| at least |x| 2^bits throughout: ±pi/2 - atan(x / y), with
    // |atan(x / y)| <= |x / y| <= 2^-bits, so the ratio is not formed.
    if (
      compareRadius(
        magnitudeBelow(y),
        multiplyRadius(magnitudeAbove(x), scale),
      ) >= 0
    ) {
      return ok(nearMultipleOfPi(halfPi(context), ySide, bits, context));
    }
    // A negative x with |y| / |x| below 2^-bits throughout: atan(y / x) ± pi
    // with |atan(y / x)| <= 2^-bits, and again no ratio.
    if (
      xSide === "negative" &&
      compareRadius(
        multiplyRadius(magnitudeAbove(y), scale),
        magnitudeBelow(x),
      ) < 0
    ) {
      return ok(nearMultipleOfPi(pi(context), ySide, bits, context));
    }
  }
  if (xSide === "positive") {
    const z = quotient(y, x, 1);
    if (!z.ok) return z;
    // A tiny ratio is its own arctangent within its cube, as atan's is,
    // and one reaching 2^significandLimitBits, a y straddling zero far wider than x,
    // is the whole range.
    if (isTiny(z.value, context)) return ok(tinyOdd(z.value));
    if (isHuge(z.value, context)) return ok(WHOLE_RANGE_ATAN2);
    return ok(fixedToBall(atanKernel(z.value, context), digits));
  }
  if (ySide === "straddles") {
    return err({ kind: "unresolved", argument: 0, edge: ZERO });
  }
  if (xSide === "negative") {
    const z = quotient(y, x, 1);
    if (!z.ok) return z;
    if (isHuge(z.value, context)) return ok(WHOLE_RANGE_ATAN2);
    const t = atanKernel(z.value, context);
    const result =
      ySide === "positive"
        ? addFixed(t, pi(context))
        : subtractFixed(t, pi(context));
    return ok(fixedToBall(keepSignificant(result, bits), digits));
  }
  // `x` reaches zero and `y` has a sign: ±pi/2 - atan(x / y). A ratio
  // reaching 2^significandLimitBits is `unresolved` at x rather than the whole range,
  // for what the value does over such an x. Take y = 1e-30000 and x = 0
  // within 1e-52, the first pass of atan2(1e-30000, 1 - approx(1)): the
  // value is within 1e-30000 / |x| of zero for x well above 1e-30000 and
  // within that of pi for x well below -1e-30000, and the whole change
  // between them happens inside |x| < 1e-30000, far within the ball. So
  // the answer ranges over nearly all of (0, pi), and which end it lies
  // near is decided by x's side of zero, the case D4 names: the retry
  // loop retries it as it retries the whole range, and at the ceiling the
  // message says that x cannot be told from zero and the result depends
  // on which side it lies, which is the truth, where zero within four
  // would read as a value near zero. The other whole-range case, a y
  // straddling zero over a positive x, is not like this: its range is
  // (-pi/2, pi/2), symmetric about zero, and y's side of zero gives only
  // the sign of the result, so a ball around zero describes it.
  const z = quotient(x, y, 0);
  if (!z.ok) return z;
  if (isHuge(z.value, context)) {
    return err({ kind: "unresolved", argument: 1, edge: ZERO });
  }
  const t = atanKernel(z.value, context);
  const half =
    ySide === "positive" ? halfPi(context) : negateFixed(halfPi(context));
  return ok(fixedToBall(keepSignificant(subtractFixed(half, t), bits), digits));
}

/**
 * `sqrt(1 - x^2)` for the bounded `x`, the argument at index zero, or why
 * `x` is not inside `[-1, 1]`: the `domain` error for a ball outside it
 * throughout, and `unresolved` at the nearer end for one that reaches an
 * end, as the header says. Both are read off `x`'s position against the
 * ends before the square is formed, which for a huge `x` would pass the
 * significand limit or the exponent bound first (issue #47); the square is then
 * of a value strictly inside the interval, and its complement is read
 * once more, since the coarse rounding of the product's radius can still
 * carry it onto zero.
 */
function complementRoot(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const edge = sign(x.mid) < 0 ? MINUS_ONE : ONE;
  const top = position(x, ONE);
  const bottom = position(x, MINUS_ONE);
  if (top === "above" || bottom === "below") {
    return err({
      kind: "domain",
      argument: 0,
      reason: "outsideClosedUnitInterval",
    });
  }
  if (top !== "below" || bottom !== "above") {
    return err({ kind: "unresolved", argument: 0, edge });
  }
  const square = multiplyBalls(x, x);
  if (!square.ok) return err(fromBallError(square.error, 0));
  const complement = subtractBalls(exact(ONE), square.value, context);
  if (!complement.ok) return err(fromBallError(complement.error, 0));
  switch (sideOfZero(complement.value)) {
    case "negative":
      return err({
        kind: "domain",
        argument: 0,
        reason: "outsideClosedUnitInterval",
      });
    case "zero":
      throw new Error(
        "A value strictly inside the domain has a positive complement",
      );
    case "straddles":
      return err({ kind: "unresolved", argument: 0, edge });
    case "positive":
      break;
  }
  const root = rootBall(complement.value, 2n, context);
  if (root.ok) return root;
  // Positive as numbers but not at the kernel's bits: the ball reaches
  // within an ulp of the end.
  if (root.error.kind === "unresolved") {
    return err({ kind: "unresolved", argument: 0, edge });
  }
  throw new Error("The root of a positive ball fails only as unresolved");
}

/**
 * `±multiple` by the sign `side` of `y`, within `2^-bits` beside the
 * memo's radius: `atan2`'s answer where the arctangent of the ratio it
 * does not form lies within `2^-bits` of a multiple of `pi`.
 */
function nearMultipleOfPi(
  multiple: Fixed,
  side: "positive" | "negative",
  bits: number,
  context: NumberContext,
): Ball {
  const at = fixedToBall(multiple, workingDigits(context));
  return {
    mid: side === "negative" ? negate(at.mid) : at.mid,
    rad: addRadius(at.rad, powerOfTwoRadius(-BigInt(bits))),
  };
}

/**
 * Whether the square of the bounded `x` lies below `2^-bits` throughout:
 * where `asin` and `acos` are their expansion at zero to the working
 * bits, as the header says.
 */
function squareBelow(x: Ball, bits: number): boolean {
  const m = magnitudeAbove(x);
  return (
    compareRadius(multiplyRadius(m, m), powerOfTwoRadius(-BigInt(bits))) < 0
  );
}

/**
 * The kernel's arctangent of the bounded `z` at the context, for a `z`
 * below `2^significandLimitBits`, which the caller sees to: `atan` and `atan2` answer
 * a ball reaching it first, and the ratios of `asin` and `acos` lie
 * within one. A small `z` is converted at as many more fraction bits as
 * its magnitude is below one, so that the kernel keeps its digits.
 */
function atanKernel(z: Ball, context: NumberContext): Fixed {
  const bits = bitsFor(context.precision);
  return atanFixed(
    fixedFromBall(z, bits + extraBits(z.mid, context)),
    bits,
    bitsFor(context.ceiling),
  );
}

/**
 * The whole range of `atan`, zero within two, for a ball that reaches
 * `2^significandLimitBits` without lying beyond `2^bits` throughout (issue #64). Two
 * rather than `pi/2`, the range's own bound, because it is the kernel's
 * trivial bound for a wide interval (`atanFixed`), whose error is an
 * integer count of ulps written as a shift by a power of two with no
 * call on pi's memo, and the built-in's answer is kept the kernel's; the
 * coarse radius could hold `pi/2` rounded up, and nothing certified
 * would change, since a ball around zero of either radius certifies no
 * digit and the retry loop treats the two alike. What would differ is
 * the bound the display shows at the ceiling, `0` within `2` against
 * within `1.6`.
 */
const WHOLE_RANGE_ATAN: Ball = { mid: ZERO, rad: powerOfTwoRadius(1n) };

/**
 * The whole range of `atan2`, zero within four, the power of two above
 * `pi`, for a ratio that reaches `2^significandLimitBits` (issue #64), by the same
 * reasoning as `WHOLE_RANGE_ATAN`.
 */
const WHOLE_RANGE_ATAN2: Ball = { mid: ZERO, rad: powerOfTwoRadius(2n) };

/** `a / b` for a `b` whose interval the caller has checked to exclude zero, failing as the quotient does, refused or straddling the bound; `argument` is `b`'s index. */
function quotient(
  a: Ball,
  b: Ball,
  argument: number,
): Result<Ball, BuiltinError> {
  const result = divideBalls(a, b);
  if (result.ok) return result;
  return err(fromBallError(result.error, argument));
}

/** pi at the context's bits, from the memo. */
function pi(context: NumberContext): Fixed {
  return piFixed(bitsFor(context.precision), bitsFor(context.ceiling));
}

/** pi/2 at the context's bits, from the memo. */
function halfPi(context: NumberContext): Fixed {
  return shiftFixed(pi(context), -1);
}

function negateFixed(f: Fixed): Fixed {
  return scaleFixed(f, -1n);
}

export const asin: Builtin = {
  name: "asin",
  arity: { min: 1, max: 1 },
  dimensions: numberToAngle,
  apply: ([x], context) => asinBall(x!, context),
};

export const acos: Builtin = {
  name: "acos",
  arity: { min: 1, max: 1 },
  dimensions: numberToAngle,
  apply: ([x], context) => acosBall(x!, context),
};

export const atan: Builtin = {
  name: "atan",
  arity: { min: 1, max: 1 },
  dimensions: numberToAngle,
  apply: ([x], context) => atanBall(x!, context),
};

export const atan2: Builtin = {
  name: "atan2",
  arity: { min: 2, max: 2 },
  dimensions: conformingToAngle,
  apply: ([y, x], context) => atan2Ball(y!, x!, context),
};
