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
// off that ball: negative throughout, `x` lies outside `[-1, 1]` and the
// error is `domain` (`outsideClosedUnitInterval`); containing zero
// without being it, `x` straddles an end (or reaches it: a ball touching
// `1` cannot be told from crossing it, and a positive value the root
// cannot tell from zero at the working bits is the same case), and the
// error is `unresolved` at the edge `1` or `-1` on the side of the
// midpoint (D4); exactly zero, `x` is `±1`, which are the cases `asin(1)`
// is `pi/2`, `asin(-1)` is `-pi/2`, `acos(-1)` is `pi`, and `acos(1)` is
// the exact zero. The other exact cases are zero for `asin` and `atan`.
//
// `atan2(y, x)` by quadrant: `atan(y / x)` for an `x` positive throughout;
// that plus pi or minus pi by the sign of `y` for an `x` negative
// throughout; `±pi/2 - atan(x / y)` by the sign of `y` for a `y` of
// definite sign when `x` reaches zero, which is where `y / x` could not
// be formed; `unresolved` at `y` with edge zero when `y` straddles zero
// and `x` is not positive throughout, since the result jumps by `2 pi`
// there; and for a `y` exactly zero, the exact zero for an `x` positive
// throughout, `pi` for one negative throughout, `unresolved` at `x` with
// edge zero for one straddling it, and the `domain` error `origin` for
// one exactly zero. pi is the memo's (constants.ts), combined on the
// kernel before the ball is formed. A tiny argument of `atan`, or a tiny
// ratio, is converted at the working bits plus its negative binary
// exponent, as `sin` converts one, so `atan(1e-50)` keeps its digits.

import {
  addBalls,
  divideBalls,
  exact,
  isExact,
  multiplyBalls,
  rootBall,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  conformingToAngle,
  numberToAngle,
  sideOfZero,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { piFixed } from "../constants.ts";
import type { NumberContext } from "../context.ts";
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
  ONE,
  ZERO,
  absolute,
  bitLength,
  equals,
  isZero,
  negate,
  sign,
} from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

const MINUS_ONE = negate(ONE);

/** `atan(x)` at the context, as the header says. */
export function atanBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(atanBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  return ok(fixedToBall(atanKernel(x, context)));
}

/** `asin(x)` at the context, as the header says. */
export function asinBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(asinBall(exact(x.mid), context));
  if (isExact(x)) {
    if (isZero(x.mid)) return ok(exact(ZERO));
    if (equals(x.mid, ONE)) return ok(fixedToBall(halfPi(context)));
    if (equals(x.mid, MINUS_ONE))
      return ok(fixedToBall(negateFixed(halfPi(context))));
  }
  const root = complementRoot(x, context);
  if (!root.ok) return root;
  const z = quotient(x, addBalls(exact(ONE), root.value));
  return ok(fixedToBall(scaleFixed(atanKernel(z, context), 2n)));
}

/** `acos(x)` at the context, as the header says. */
export function acosBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(acosBall(exact(x.mid), context));
  if (isExact(x)) {
    if (equals(x.mid, ONE)) return ok(exact(ZERO));
    if (equals(x.mid, MINUS_ONE)) return ok(fixedToBall(pi(context)));
  }
  const root = complementRoot(x, context);
  if (!root.ok) return root;
  const bits = bitsFor(context.precision);
  if (sign(x.mid) >= 0) {
    const z = quotient(root.value, addBalls(exact(ONE), x));
    return ok(fixedToBall(scaleFixed(atanKernel(z, context), 2n)));
  }
  const z = quotient(root.value, subtractBalls(exact(ONE), x));
  const twice = scaleFixed(atanKernel(z, context), 2n);
  return ok(
    fixedToBall(keepSignificant(subtractFixed(pi(context), twice), bits)),
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
  const ySide = sideOfZero(y);
  const xSide = sideOfZero(x);
  if (ySide === "zero") {
    switch (xSide) {
      case "positive":
        return ok(exact(ZERO));
      case "negative":
        return ok(fixedToBall(pi(context)));
      case "zero":
        return err({ kind: "domain", argument: 0, reason: "origin" });
      case "straddles":
        return err({ kind: "unresolved", argument: 1, edge: ZERO });
    }
  }
  if (xSide === "positive") {
    return ok(fixedToBall(atanKernel(quotient(y, x), context)));
  }
  if (ySide === "straddles") {
    return err({ kind: "unresolved", argument: 0, edge: ZERO });
  }
  if (xSide === "negative") {
    const t = atanKernel(quotient(y, x), context);
    const result =
      ySide === "positive"
        ? addFixed(t, pi(context))
        : subtractFixed(t, pi(context));
    return ok(fixedToBall(keepSignificant(result, bits)));
  }
  // `x` reaches zero and `y` has a sign: ±pi/2 - atan(x / y).
  const t = atanKernel(quotient(x, y), context);
  const half =
    ySide === "positive" ? halfPi(context) : negateFixed(halfPi(context));
  return ok(fixedToBall(keepSignificant(subtractFixed(half, t), bits)));
}

/**
 * `sqrt(1 - x^2)` for the bounded `x`, the argument at index zero, or why
 * `x` is not inside `[-1, 1]`: the `domain` error for a ball outside it
 * throughout, and `unresolved` at the nearer end for one that reaches an
 * end, as the header says.
 */
function complementRoot(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const edge = sign(x.mid) < 0 ? MINUS_ONE : ONE;
  const complement = subtractBalls(exact(ONE), multiplyBalls(x, x));
  switch (sideOfZero(complement)) {
    case "negative":
      return err({
        kind: "domain",
        argument: 0,
        reason: "outsideClosedUnitInterval",
      });
    case "zero":
      throw new Error("An exact end of the domain is handled before the root");
    case "straddles":
      return err({ kind: "unresolved", argument: 0, edge });
    case "positive":
      break;
  }
  const root = rootBall(complement, 2n, context);
  if (root.ok) return root;
  // Positive as rationals but not at the kernel's bits: the ball reaches
  // within an ulp of the end.
  if (root.error.kind === "unresolved") {
    return err({ kind: "unresolved", argument: 0, edge });
  }
  throw new Error("The root of a positive ball fails only as unresolved");
}

/**
 * The kernel's arctangent of the bounded `z` at the context: a tiny `z`
 * is converted at as many more fraction bits as its magnitude is below
 * one, so that the kernel keeps its digits.
 */
function atanKernel(z: Ball, context: NumberContext): Fixed {
  const bits = bitsFor(context.precision);
  const extra = isZero(z.mid)
    ? 0
    : Math.max(0, bitLength(z.mid.den) - bitLength(absolute(z.mid).num));
  return atanFixed(
    fixedFromBall(z, bits + extra),
    bits,
    bitsFor(context.ceiling),
  );
}

/** `a / b` for a `b` whose interval the caller has checked to exclude zero. */
function quotient(a: Ball, b: Ball): Ball {
  const result = divideBalls(a, b);
  if (!result.ok) throw new Error("Division by a divisor checked nonzero");
  return result.value;
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
