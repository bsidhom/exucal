// `approx(x)`: the value known to the working precision and no better.
// devdocs/numbers.md ("`approx`") is the design. The argument is any
// quantity, of any dimension, kinds
// included, and the result has the argument's dimension (`sameAsArgument`
// of builtin.ts, the rule devdocs/builtins.md ("The exact functions")
// describes for the exact functions). The magnitude is the ball whose midpoint
// is the argument's and whose radius is the larger of the argument's own
// and one unit in the last of the working digits at the value's
// magnitude, rounded up to a radius: an exact argument gains the unit, an
// inexact one whose radius is already larger keeps it, and one whose
// radius is smaller is widened to the unit, so `approx` never narrows and
// is idempotent. An exact zero and an unbounded argument are returned as
// they are. The evaluator settles the result as it settles every inexact
// one (devdocs/numbers.md, "Settling"), and the retry loop needs nothing of
// its own, since the radius
// is the working precision's and shrinks with each pass. The working
// digits are `workingDigits(context)`. In decimal mode
// (devdocs/numbers.md, "Decimal mode") the evaluator does not call this at
// all: every value there is already at the user's precision, so `approx`
// is the identity, which the built-in declares with `decimal`.

import type { Ball } from "../ball.ts";
import { widened } from "../ball.ts";
import { sameAsArgument, type Builtin, type BuiltinError } from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { ok, type Result } from "../result.ts";

/** `approx(x)` at the context, as the header says: `widened` of ball.ts. */
export function approxBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return ok(widened(x, context));
}

export const approx: Builtin = {
  name: "approx",
  arity: { min: 1, max: 1 },
  dimensions: sameAsArgument,
  apply: ([x], context) => approxBall(x!, context),
  decimal: "identity",
};
