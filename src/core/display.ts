// The display rule: what a ball is shown as, how many of its digits are
// certain, and whether the display may say `=`. docs/calculator.md ("The
// precision model") states the rule and docs/calculator-plan.md (D7, tasks
// 1.9 and 2.4) places it. `=` is shown when the radius is zero and the
// digits displayed are all the digits held; everything else is `≈`. So a
// value that passes through an irrational step and comes out looking
// rational (`sqrt(2) / sqrt(2)`, whose midpoint is exactly `1`) is `≈`,
// however round its digits look, because its radius is not zero, while
// `sqrt(4)` is `= 2` because the exact case was detected and nothing was
// rounded. Exactness is a property of the value, not of the display, which
// is why the rule reads the radius rather than comparing digits.
//
// What is shown is certified (D7): a digit is shown only when both ends of
// the ball round to it, so that the digits shown are the true value's
// correctly rounded in the mode, never merely close. The kinds say how far
// that goes: `exact` and `certified` show every digit asked for, the first
// with `=`; `partial` shows the digits that are certain, fewer than asked,
// and says how many; `zero` is a ball containing zero without being it,
// which certifies no digit and is shown as `0` with a bound on how far
// from zero the value may be; `unbounded` is a radius not known at all,
// shown as the midpoint's digits, certifying none, as the study says the
// per-operation stage displays. The retry loop of the pipeline (2.5) keeps
// `partial` and `zero` from reaching the display except at the ceiling.
//
// These are the decimal display's answers; stage 5's fractions setting
// changes what an exact value is shown as (`1/3` becomes `= 1/3`), and
// this module is where that lands. The user's rounding mode is applied
// here and nowhere else in exact mode (D15).

import { certifiedDigits, containsZero, isExact, type Ball } from "./ball.ts";
import { isUnbounded, radiusUpper } from "./radius.ts";
import { absolute, add, type Rational } from "./rational.ts";
import type { Precision, RoundingMode } from "./rounding.ts";
import { equals, format, fromRational, roundTo } from "./scaled.ts";

/** A ball as shown: its `text`, and the `kind` that says what the text is worth. */
export type Shown =
  /** An exact value, every digit of which is shown: `=`. */
  | { readonly kind: "exact"; readonly text: string }
  /** Every digit asked for is certified; the value is inexact, or exact with more digits than shown. */
  | { readonly kind: "certified"; readonly text: string }
  /**
   * Only `certified` of the digits asked for are certain, and `text` shows
   * those; `certified` is zero only for a value on a rounding tie at the
   * digits asked, and `text` is then the midpoint at the digits asked.
   */
  | {
      readonly kind: "partial";
      readonly text: string;
      readonly certified: number;
    }
  /** The ball contains zero without being exactly zero: `text` is `0`, and the value is within `bound` of it. */
  | { readonly kind: "zero"; readonly text: "0"; readonly bound: string }
  /** The radius is not known: `text` is the midpoint at the digits asked, none of them certified. */
  | { readonly kind: "unbounded"; readonly text: string };

/**
 * `ball` at `digits` significant digits in `mode`: `exact` when the radius
 * is zero and rounding the midpoint to `digits` leaves it unchanged, so
 * that every digit held is shown; otherwise the kind the certification
 * gives, with `text` the midpoint rounded in `mode` to the digits certified.
 */
export function show(ball: Ball, digits: Precision, mode: RoundingMode): Shown {
  // Formatted as a `Scaled` (4.3), through the boundary that goes in 4.4.
  const mid = fromRational(ball.mid);
  if (isUnbounded(ball.rad)) {
    return { kind: "unbounded", text: format(mid, digits, mode) };
  }
  if (isExact(ball) && equals(roundTo(mid, digits, mode), mid)) {
    return { kind: "exact", text: format(mid, digits, mode) };
  }
  if (containsZero(ball)) {
    // Not exactly zero: that is `exact` above. The bound is the farthest
    // the value may lie from zero, rounded up to one digit.
    const bound: Rational = add(absolute(ball.mid), radiusUpper(ball.rad));
    return {
      kind: "zero",
      text: "0",
      bound: format(fromRational(bound), 1, "ceiling"),
    };
  }
  const certified = certifiedDigits(ball, digits, mode);
  if (certified === digits) {
    return { kind: "certified", text: format(mid, digits, mode) };
  }
  return {
    kind: "partial",
    text: format(mid, certified > 0 ? certified : digits, mode),
    certified,
  };
}
