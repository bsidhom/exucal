// `exp(x)`: the exponential of a plain number, on the kernel's `expFixed`
// (fixed-exp.ts). devdocs/design/builtins.md is the design and devdocs/history/calculator-plan.md
// (task 3.6) places it. The exact cases are `exp(0)`, one, and `exp(1)`,
// which is `e` from its memo (constants.ts, D10); every other argument is
// converted at the working bits, passed through the kernel, and handed
// back as the kernel's ball, rounded in no mode, for the evaluator to
// settle (D15). An argument of unbounded radius gives the exponential of
// its midpoint with an unbounded radius. The result's magnitude is held
// to the exponent bound before anything is computed, by the classifier
// of ball.ts (`classifyExp`; D18, the plan's H.15), on the whole ball of
// the argument: `exp(x)` has the natural logarithm `x`, so the argument
// is refused only when every value of its ball lies past an edge of the
// bound, `exp(1e30)` an `overflow` and `exp(-1e30)` an `underflow`, and
// is `unresolved` at the edge `bound`, retried by the pipeline, when some
// values lie past and some within, as a wide ball's do
// (`exp(approx(1e999) - approx(1e999 - 5))` at its first pass, issue #40,
// which stage 4 refused for good), while `exp(1e6)` and
// `exp(1e18)` are values (4.9): the kernel returns a `Floating`, a
// significand with a binary exponent, which comes out through digits.ts
// (`floatingToBall`), exactly where the exponent is within the range
// limit and in log space otherwise. A tiny argument needs no scaling: the
// result is `1 + x + ...`, whose digits certify at the first pass, and
// the digits of the difference from one are the retry loop's to find;
// one throughout below `2^-significandLimitBits`, which the kernel cannot be handed
// at any bits within the significand limit, is one within twice its magnitude
// bound, its expansion at zero, since `e^|x| - 1 <= 2|x|` there (4.4,
// H.2 of the plan), and one between that and half an ulp of the working
// bits converts to zero within an ulp at the kernel's door
// (`fixedFromScaled`), which the exponential of gives `≈ 1` as well.

import {
  classifyExp,
  exact,
  isExact,
  magnitudeAbove,
  type Ball,
} from "../ball.ts";
import {
  fromBallError,
  isTiny,
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { eBall } from "../constants.ts";
import type { NumberContext } from "../context.ts";
import { floatingToBall } from "../digits.ts";
import { expFixed } from "../fixed-exp.ts";
import { bitsFor, fixedFromBall } from "../fixed.ts";
import { shiftRadius } from "../radius.ts";
import { err, ok, type Result } from "../result.ts";
import { ONE, equals, isZero } from "../scaled.ts";

/** `exp(x)` at the context, as the header says. */
export function expBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unboundedOf(expBall(exact(x.mid), context));
  if (isExact(x)) {
    if (isZero(x.mid)) return ok(exact(ONE));
    if (equals(x.mid, ONE)) return ok(eBall(context));
  }
  // Below 2^-significandLimitBits throughout: one within twice the magnitude bound,
  // since e^|x| - 1 <= 2|x| there, the expansion at zero (4.4, H.2).
  if (isTiny(x, context)) {
    return ok({ mid: ONE, rad: shiftRadius(magnitudeAbove(x), 1n) });
  }
  switch (classifyExp(x, context)) {
    case "overflow":
      return err({ kind: "overflow" });
    case "underflow":
      return err({ kind: "underflow" });
    case "unresolved":
      return err({ kind: "unresolved", argument: 0, edge: "bound" });
    case "compute":
      break;
  }
  const bits = bitsFor(context.precision);
  const result = floatingToBall(
    expFixed(fixedFromBall(x, bits), bits),
    context,
  );
  return result.ok ? result : err(fromBallError(result.error, 0));
}

export const exp: Builtin = {
  name: "exp",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => expBall(x!, context),
};
