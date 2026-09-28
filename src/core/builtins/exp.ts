// `exp(x)`: the exponential of a plain number, on the kernel's `expFixed`
// (fixed-exp.ts). docs/builtins.md is the design and docs/calculator-plan.md
// (task 3.6) places it. The exact cases are `exp(0)`, one, and `exp(1)`,
// which is `e` from its memo (constants.ts, D10); every other argument is
// converted at the working bits, passed through the kernel, and handed
// back as the kernel's ball, rounded in no mode, for the evaluator to
// settle (D15). An argument of unbounded radius gives the exponential of
// its midpoint with an unbounded radius. The result's magnitude is guarded
// before anything is computed: `exp(x)` has the decimal exponent
// `x log10 e`, so an argument whose magnitude, taken over its whole ball,
// exceeds the exponent bound divided by `log10 e` is `tooLarge` (`expFits`
// of ball.ts, which the log-space power shares), which refuses `exp(1e30)`
// and `exp(-1e30)` alike, past the bound above and below as the
// argument's midpoint is positive or negative, while `exp(1e6)` and
// `exp(1e18)` are values
// (4.9): the kernel returns a `Floating`, a mantissa with a binary
// exponent, which comes out through digits.ts (`floatingToBall`), exactly
// where the exponent is within the range limit and in log space
// otherwise. A tiny argument needs no scaling: the result is `1 + x +
// ...`, whose digits certify at the first pass, and the digits of the
// difference from one are the retry loop's to find.

import {
  exact,
  expFits,
  isExact,
  magnitudeAbove,
  radiusBound,
  type Ball,
} from "../ball.ts";
import {
  fromBallError,
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
import { err, ok, type Result } from "../result.ts";
import { ONE, equals, isZero, sign } from "../scaled.ts";

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
  if (!expFits(radiusBound(magnitudeAbove(x)))) {
    return err({
      kind: "tooLarge",
      limit: sign(x.mid) < 0 ? "exponentBelow" : "exponentAbove",
    });
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
