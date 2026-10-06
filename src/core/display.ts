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
// In decimal mode every value is exact (D26; docs/decimal-mode.md), so the
// rule writes `=` for every line there, except for a value flagged
// `uncertified`, a step rounded at the ceiling without its digits
// certified, which is the kind `uncertified`: its digits, which the
// outcome writes with the `≈` sign bearing a dot above it and a note.
//
// With `fractions` on (docs/fractions.md, "The rule"; D21), an exact value
// that is not an integer is shown as its fraction in lowest terms when the
// numerator and the denominator each fit within the digits asked, `= 1/3`
// and `= 127/50` for `2.54`, the `exact` kind saying so with `fraction`;
// an exact integer, an exact value whose fraction does not fit, and every
// inexact value are shown as above, the decimal display being the
// fallback, which says `=` where its own rule allows (`1.5e-999999999`).
// The fit rule is provisional (#91). The user's rounding mode is applied
// here and nowhere else in exact mode (D15), and plays no part in a
// fraction, which is not rounded.

import {
  certifiedDigits,
  containsZero,
  isExact,
  magnitudeAbove,
  radiusValue,
  type Ball,
} from "./ball.ts";
import { isUnbounded, log2OfRadius } from "./radius.ts";
import { LIMIT_BITS, rational } from "./rational.ts";
import type { Precision, RoundingMode } from "./rounding.ts";
import {
  MAX_EXPONENT,
  ONE,
  absolute,
  add,
  decimalDigits,
  decimalExponent,
  equals,
  format,
  isInteger,
  oneDigitAbove,
  roundTo,
  type Scaled,
} from "./scaled.ts";

/**
 * The smallest positive value within the exponent bound,
 * `1e-1000000000000000000`: what a zero's bound below it is written as
 * (docs/fractions.md, "A zero's bound at the edges"; #67). Nothing holds
 * a radius to the exponent bound, and a power of a ball around zero can
 * carry its exponent to a hundred thousand digits; this is larger than
 * any such bound, so the line stays sound, and the shortest that can be
 * written.
 */
const SMALLEST_BOUND: Scaled = { ...ONE, exp: -MAX_EXPONENT };

/**
 * A value at or above `|mid| + rad` of the bounded `ball`, to show how far
 * from zero a value that cannot be told from it may lie: exact where the
 * radius can be formed and aligned with the midpoint, and otherwise one
 * digit above the coarse bound on the magnitude; and `SMALLEST_BOUND` in
 * place of a bound whose decimal exponent lies below `-MAX_EXPONENT`.
 */
function zeroBound(ball: Ball): Scaled {
  const bound = zeroBoundUnclamped(ball);
  return decimalExponent(bound) < -MAX_EXPONENT ? SMALLEST_BOUND : bound;
}

function zeroBoundUnclamped(ball: Ball): Scaled {
  const rad = radiusValue(ball.rad);
  if (rad !== undefined) {
    const bound = add(absolute(ball.mid), rad, LIMIT_BITS);
    if (bound.ok) return bound.value;
  }
  return oneDigitAbove(log2OfRadius(magnitudeAbove(ball)));
}

/**
 * The non-integer `s` as the fraction `N/D` in lowest terms, with `N`
 * signed, when `N` and `D` each have at most `digits` digits
 * (docs/fractions.md, "The rule"), and `undefined` when they do not. The
 * fraction is the ordinary one, the power of ten multiplied back in, not
 * the canonical mantissa. It is formed only when it can fit: for an
 * exponent `k > 0`, `N` has at least `k + 1` digits; for `k < 0`, `D` keeps
 * at least `5^-k` of the `10^-k`, the mantissa's numerator being coprime
 * to ten, so it has more than `-k × log10 5` digits, and `N` is at most
 * the numerator, which has at most `2^-k` times fewer digits. So an
 * exponent beyond twice `digits` in magnitude, or a numerator beyond twice
 * `digits` in digits, cannot fit, and nothing is formed for it.
 */
function fractionText(s: Scaled, digits: Precision): string | undefined {
  const { num, den } = s.mant;
  const k = s.exp;
  const twice = 2n * BigInt(digits);
  if (k > twice || k < -twice || decimalDigits(magnitude(num)) > 2 * digits) {
    return undefined;
  }
  // For `k >= 0` the parts stay coprime, the denominator being coprime to
  // ten; for `k < 0` the power of ten cancels against the numerator's twos
  // or fives, which `rational` reduces.
  const fraction =
    k >= 0n ? { num: num * 10n ** k, den } : rational(num, den * 10n ** -k);
  if (
    decimalDigits(magnitude(fraction.num)) > digits ||
    decimalDigits(fraction.den) > digits
  ) {
    return undefined;
  }
  return `${fraction.num}/${fraction.den}`;
}

function magnitude(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/** A ball as shown: its `text`, and the `kind` that says what the text is worth. */
export type Shown =
  /**
   * A decimal-mode value one of whose steps was rounded at the ceiling
   * without its digits certified (D26; docs/decimal-mode.md, "The
   * ceiling"): every digit, exact under the mode's rounding, and not
   * vouched for.
   */
  | { readonly kind: "uncertified"; readonly text: string }
  /**
   * An exact value, every digit of which is shown: `=`. With `fraction`,
   * `text` is a fraction `N/D` in lowest terms, which the component
   * parenthesizes where a unit follows it.
   */
  | { readonly kind: "exact"; readonly text: string; readonly fraction?: true }
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
 * With `fractions`, an exact value that is not an integer is `exact` with
 * its fraction as `text` when the fraction fits within `digits`, before
 * any of that.
 */
export function show(
  ball: Ball,
  digits: Precision,
  mode: RoundingMode,
  fractions = false,
): Shown {
  const { mid } = ball;
  if (ball.uncertified === true) {
    return { kind: "uncertified", text: format(mid, digits, mode) };
  }
  if (isUnbounded(ball.rad)) {
    return { kind: "unbounded", text: format(mid, digits, mode) };
  }
  if (fractions && isExact(ball) && !isInteger(mid)) {
    const text = fractionText(mid, digits);
    if (text !== undefined) return { kind: "exact", text, fraction: true };
  }
  if (isExact(ball) && equals(roundTo(mid, digits, mode), mid)) {
    return { kind: "exact", text: format(mid, digits, mode) };
  }
  if (containsZero(ball)) {
    // Not exactly zero: that is `exact` above. The bound is the farthest
    // the value may lie from zero, rounded up to one digit.
    return {
      kind: "zero",
      text: "0",
      bound: format(zeroBound(ball), 1, "ceiling"),
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
