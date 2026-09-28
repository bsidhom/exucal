// `exp(x)`: the exponential of a plain number, on the kernel's `expFixed`
// (fixed-exp.ts). docs/builtins.md is the design and docs/calculator-plan.md
// (task 3.6) places it. The exact cases are `exp(0)`, one, and `exp(1)`,
// which is `e` from its memo (constants.ts, D10); every other argument is
// converted at the working bits, passed through the kernel, and handed
// back as the kernel's ball, rounded in no mode, for the evaluator to
// settle (D15). An argument of unbounded radius gives the exponential of
// its midpoint with an unbounded radius. The result's magnitude is guarded
// before anything is computed: `exp(x)` is about `2^(x log2 e)` bits long
// for a positive `x` and that far below one for a negative one, so an
// argument whose magnitude, taken over its whole ball, exceeds the range
// limit divided by `log2 e` is `tooLarge`, which is what refuses
// `exp(1e6)` and `exp(-1e6)` alike. A tiny argument needs no scaling: the
// result is `1 + x + ...`, whose digits certify at the first pass, and the
// digits of the difference from one are the retry loop's to find.

import { exact, isExact, magnitudeAbove, type Ball } from "../ball.ts";
import { plainNumbers, type Builtin, type BuiltinError } from "../builtin.ts";
import { eBall } from "../constants.ts";
import type { NumberContext } from "../context.ts";
import { expFixed } from "../fixed-exp.ts";
import { bitsFor, fixedFromBall, fixedToBall } from "../fixed.ts";
import { UNBOUNDED, type Radius } from "../radius.ts";
import { ONE, equals, isZero } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

/**
 * A number at or above the radius `rad`, `Infinity` for an unbounded one
 * or one beyond a double: enough to compare a magnitude with the range
 * limit.
 */
export function radiusBound(rad: Radius): number {
  if (rad.kind === "unbounded") return Infinity;
  if (rad.mant === 0n) return 0;
  if (rad.exp > 1000n) return Infinity;
  if (rad.exp < -1100n) return 0;
  return Number(rad.mant) * 2 ** Number(rad.exp);
}

/** Whether `exp` of a value of magnitude up to `bound` fits the range limit `maxBits`, either way from one. */
export function expFits(bound: number, maxBits: number): boolean {
  return bound * Math.LOG2E <= maxBits;
}

/** `exp(x)` at the context, as the header says. */
export function expBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    const at = expBall(exact(x.mid), context);
    return at.ok ? ok({ mid: at.value.mid, rad: UNBOUNDED }) : at;
  }
  if (isExact(x)) {
    if (isZero(x.mid)) return ok(exact(ONE));
    if (equals(x.mid, ONE)) return ok(eBall(context));
  }
  if (!expFits(radiusBound(magnitudeAbove(x)), context.maxBits)) {
    return err({ kind: "tooLarge" });
  }
  const bits = bitsFor(context.precision);
  return ok(fixedToBall(expFixed(fixedFromBall(x, bits), bits)));
}

export const exp: Builtin = {
  name: "exp",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => expBall(x!, context),
};
