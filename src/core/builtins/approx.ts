// `approx(x)`: the value known to the working precision and no better.
// docs/approximate.md is the design and docs/calculator-plan.md (task
// 4.10) places it. The argument is any quantity, of any dimension, kinds
// included, and the result has the argument's dimension (`sameAsArgument`
// of builtin.ts, the rule D14 describes for the exact functions of stage
// 6, landing here ahead of them). The magnitude is the ball whose midpoint
// is the argument's and whose radius is the larger of the argument's own
// and one unit in the last of the working digits at the value's
// magnitude, rounded up to a radius: an exact argument gains the unit, an
// inexact one whose radius is already larger keeps it, and one whose
// radius is smaller is widened to the unit, so `approx` never narrows and
// is idempotent. An exact zero and an unbounded argument are returned as
// they are. The evaluator settles the result as it settles every inexact
// one (D15), and the retry loop needs nothing of its own, since the radius
// is the working precision's and shrinks with each pass. The working
// digits are `workingDigits(context)` in exact mode and the context's
// precision in decimal mode, where they are the user's `p` and the mode's
// rounding follows as for every result.

import type { Ball } from "../ball.ts";
import { sameAsArgument, type Builtin, type BuiltinError } from "../builtin.ts";
import { modeOf, workingDigits, type NumberContext } from "../context.ts";
import { maxRadius, powerOfTenRadius } from "../radius.ts";
import { ok, type Result } from "../result.ts";
import { decimalExponent, isZero } from "../scaled.ts";

/** `approx(x)` at the context, as the header says. */
export function approxBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded" || isZero(x.mid)) return ok(x);
  const digits =
    modeOf(context) === "decimal" ? context.precision : workingDigits(context);
  // One unit in the last of the working digits, as a radius: taken from
  // its exponent without forming the unit, which lies past the exponent
  // bound for a value near the bottom of it (`approx(1e-999999999999999999)`,
  // issue #44).
  const unit = powerOfTenRadius(decimalExponent(x.mid) - BigInt(digits) + 1n);
  return ok({ mid: x.mid, rad: maxRadius(x.rad, unit) });
}

export const approx: Builtin = {
  name: "approx",
  arity: { min: 1, max: 1 },
  dimensions: sameAsArgument,
  apply: ([x], context) => approxBall(x!, context),
};
