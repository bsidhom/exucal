// The display rule: what a ball is shown as, and whether the display may say
// `=`. docs/calculator.md ("The precision model") states the rule and
// docs/calculator-plan.md (task 1.9) places it: `=` is shown when the radius
// is zero and the digits displayed are all the digits held; everything else
// is `≈`. So a value that passes through an irrational step and comes out
// looking rational (`sqrt(2) / sqrt(2)`, whose midpoint is exactly `1`) is
// `≈`, however round its digits look, because its radius is not zero, while
// `sqrt(4)` is `= 2` because the exact case was detected and nothing was
// rounded. Exactness is a property of the value, not of the display, which
// is why the rule reads the radius rather than comparing digits.
//
// These are the decimal display's answers. Stage 2 adds the certified
// digits (how many of the digits shown the radius vouches for, and the
// display kinds that say so), and stage 5's fractions setting changes what
// an exact value is shown as (`1/3` becomes `= 1/3`); this module is where
// both land.

import { type Ball, isExact } from "./ball.ts";
import { equals, format, roundTo, type Precision } from "./rational.ts";
import { type RoundingMode } from "./rounding.ts";

/** A ball as shown: its `text`, and whether the display may say `=`. */
export type Shown = {
  readonly text: string;
  readonly exact: boolean;
};

/**
 * `ball` at `digits` significant digits in `mode`: `text` is the midpoint
 * formatted so, and `exact` is true when the radius is zero and rounding
 * the midpoint to `digits` leaves it unchanged, so that every digit held is
 * shown.
 */
export function show(ball: Ball, digits: Precision, mode: RoundingMode): Shown {
  return {
    text: format(ball.mid, digits, mode),
    exact: isExact(ball) && equals(roundTo(ball.mid, digits, mode), ball.mid),
  };
}
