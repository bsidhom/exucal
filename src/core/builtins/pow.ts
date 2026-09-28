// `pow(x, y)`: a plain base to a plain exponent. docs/builtins.md is the
// design and docs/calculator-plan.md (task 3.8) places it; a power of a
// quantity is written with `^`, whose exponent is a literal so that the
// dimension stays exact, and the dimension rule's message says so. The
// magnitude follows one rule with `^` (`powRationalBall` of ball.ts): an
// exact exponent is that rule, integer powers exact, a rational exponent
// exact when the base is a perfect power, the root of the power when it
// fits the range limit, and log space otherwise; `pow(x, 0)` is exactly
// one for any `x`, `pow(0, 0)` included. An inexact exponent is log space
// (`powLogSpace`, `exp(y ln x)`) for a base positive throughout its ball;
// a base non-positive throughout is a `domain` error (`notPositive`,
// worded for `pow`), and one straddling zero is `unresolved` at edge zero.
// An exact zero base under an inexact exponent is exact zero when the
// exponent is positive throughout, `divisionByZero` when negative
// throughout, and `unresolved` at edge zero on the exponent when it
// straddles zero. An argument of unbounded radius gives the power of the
// midpoints with an unbounded radius.

import {
  exact,
  isExact,
  powLogSpace,
  powRationalBall,
  type Ball,
} from "../ball.ts";
import {
  checkPositive,
  fromBallError,
  plainNumbers,
  sideOfZero,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { ONE, ZERO, isZero } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

/** `pow(x, y)` at the context, as the header says. */
export function powBallOf(
  x: Ball,
  y: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded" || y.rad.kind === "unbounded") {
    return unboundedOf(
      powBallOf(
        x.rad.kind === "unbounded" ? exact(x.mid) : x,
        y.rad.kind === "unbounded" ? exact(y.mid) : y,
        context,
      ),
    );
  }
  if (isExact(y)) {
    if (isZero(y.mid)) return ok(exact(ONE));
    const power = powRationalBall(x, y.mid, context);
    return power.ok ? power : err(fromBallError(power.error, 0));
  }
  if (isExact(x) && isZero(x.mid)) {
    switch (sideOfZero(y)) {
      case "positive":
        return ok(exact(ZERO));
      case "negative":
        return err({ kind: "divisionByZero" });
      case "zero":
      case "straddles":
        return err({ kind: "unresolved", argument: 1, edge: ZERO });
    }
  }
  const positive = checkPositive(x, 0);
  if (!positive.ok) return positive;
  const power = powLogSpace(x, y, context);
  return power.ok ? power : err(fromBallError(power.error, 0));
}

export const pow: Builtin = {
  name: "pow",
  arity: { min: 2, max: 2 },
  dimensions: plainNumbers(2),
  apply: ([x, y], context) => powBallOf(x!, y!, context),
};
