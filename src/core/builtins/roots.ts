// `sqrt(x)` and `cbrt(x)`: the square and cube roots of a plain number,
// `rootBall` under a name (ball.ts), with the same exact cases as `^(1/2)`
// and `^(1/3)`, so that `sqrt(9/4)` is exactly `3/2` and `cbrt(-8)` is
// exactly `-2`. docs/builtins.md is the design and docs/calculator-plan.md
// (task 3.8) places them; they share a module because they are one rule
// under two names. The errors are the root's: `sqrt(-1)` is the
// `negativeRadicand` that `(-1)^(1/2)` is, worded as it is (`"sqrt(-1)"
// takes an even root of a negative value`), a ball straddling zero under
// the square root is `unresolved` at edge zero, and under the cube root a
// ball around zero, the root being odd. An argument of unbounded radius
// gives the root of its midpoint with an unbounded radius, as `rootBall`
// rules.

import { rootBall, type Ball } from "../ball.ts";
import {
  fromBallError,
  plainNumbers,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { err, type Result } from "../result.ts";

/** The `degree`-th root of `x` at the context, its errors as a built-in's. */
export function rootOf(
  x: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const root = rootBall(x, degree, context);
  return root.ok ? root : err(fromBallError(root.error, 0));
}

export const sqrt: Builtin = {
  name: "sqrt",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => rootOf(x!, 2n, context),
};

export const cbrt: Builtin = {
  name: "cbrt",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => rootOf(x!, 3n, context),
};
