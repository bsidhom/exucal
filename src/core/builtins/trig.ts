// `sin(x)`, `cos(x)` and `tan(x)`: the trigonometric functions of an angle,
// on the kernel's `sinCosFixed` (fixed-trig.ts). docs/builtins.md is the
// design and docs/calculator-plan.md (task 3.9) places them; they share a
// module because they share the reduction and the series, which the
// kernel computes once for both the sine and the cosine. The rule requires
// the `radian` kind (D11) and hands the kernel the magnitude, which is in
// radians since `radian` is the primitive (`30 deg` is `pi() radian / 6`,
// and the kernel sees `pi / 6`); a plain number is the kind mismatch `1 m
// + 0` is, worded to say how to write an angle, so `sin(0)` is that
// mismatch and `sin(0 radian)` the exact zero. The exact cases: zero for
// `sin` and `tan`, one for `cos`. Every other argument is the kernel's
// ball, rounded in no mode, for the evaluator to settle (D15). `tan` is
// the quotient of the two, cut to the bits its magnitude calls for, and
// `unresolved` at the argument with the edge `"pole"` when the cosine's
// ball contains zero (D4): the true value lies on one side of a pole or
// the other, and the retry loop raises the precision.
//
// A tiny argument is converted at the working bits plus its negative
// binary exponent, as `rootBall` scales its argument, so that the kernel
// keeps its digits and `sin(1e-50 radian)` certifies on the first pass
// rather than at the ceiling; the kernel chooses the result's bits from
// its magnitude (D9). An argument of unbounded radius gives the function
// of its midpoint with an unbounded radius.

import { exact, isExact, type Ball } from "../ball.ts";
import {
  angleToNumber,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { sinCosFixed, type SinCos } from "../fixed-trig.ts";
import {
  bitsFor,
  divideFixed,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
} from "../fixed.ts";
import { ONE, ZERO, absolute, bitLength, isZero } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

/** `sin(x)` at the context, as the header says. */
export function sinBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(sinBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  return ok(fixedToBall(sinCos(x, context).sin));
}

/** `cos(x)` at the context, as the header says. */
export function cosBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(cosBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ONE));
  return ok(fixedToBall(sinCos(x, context).cos));
}

/** `tan(x)` at the context, as the header says: `unresolved` at a pole. */
export function tanBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(tanBall(exact(x.mid), context));
  if (isExact(x) && isZero(x.mid)) return ok(exact(ZERO));
  const { sin, cos } = sinCos(x, context);
  if (abs(cos.value) <= cos.error) {
    return err({ kind: "unresolved", argument: 0, edge: "pole" });
  }
  return ok(
    fixedToBall(
      keepSignificant(divideFixed(sin, cos), bitsFor(context.precision)),
    ),
  );
}

/**
 * The kernel's sine and cosine of the bounded `x` at the context: a tiny
 * `x` is converted at as many more fraction bits as its magnitude is
 * below one, so that the kernel keeps its digits.
 */
function sinCos(x: Ball, context: NumberContext): SinCos {
  const bits = bitsFor(context.precision);
  const extra = isZero(x.mid)
    ? 0
    : Math.max(0, bitLength(x.mid.den) - bitLength(absolute(x.mid).num));
  return sinCosFixed(
    fixedFromBall(x, bits + extra),
    bits,
    bitsFor(context.ceiling),
  );
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export const sin: Builtin = {
  name: "sin",
  arity: { min: 1, max: 1 },
  dimensions: angleToNumber,
  apply: ([x], context) => sinBall(x!, context),
};

export const cos: Builtin = {
  name: "cos",
  arity: { min: 1, max: 1 },
  dimensions: angleToNumber,
  apply: ([x], context) => cosBall(x!, context),
};

export const tan: Builtin = {
  name: "tan",
  arity: { min: 1, max: 1 },
  dimensions: angleToNumber,
  apply: ([x], context) => tanBall(x!, context),
};
