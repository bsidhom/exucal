// `pi()`: the circle constant as a call of no arguments, so that a
// definition body reads `pi() radian / 180` and gets the precision of the
// table it is built in (D6 of docs/calculator-plan.md), and an expression
// gets the working precision of its pass. The digits come from
// constants.ts, Chudnovsky's series memoized at the ceiling of the context
// plus a margin (D10), truncated to the context's precision; the ball is
// the kernel's, rounded in no mode, and the evaluator settles it (D15).
// There is no exact case: `pi` is irrational, and `pi()` is inexact at
// every precision, which is why `turn` into `deg` is `≈ 360` (the study
// accepts the conservative `≈`). It takes no arguments and gives a plain
// number.

import { plainNumbers, type Builtin } from "../builtin.ts";
import { piBall } from "../constants.ts";
import { ok } from "../result.ts";

export const pi: Builtin = {
  name: "pi",
  arity: { min: 0, max: 0 },
  dimensions: plainNumbers(0),
  apply: (_, context) => ok(piBall(context)),
};
