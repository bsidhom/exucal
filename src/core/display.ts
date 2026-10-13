// The display rule: what a ball is shown as, how many of its digits are
// certified, and whether the display may say `=`. devdocs/numbers.md
// ("Certification and the display rule") states the rule. `=` is shown
// when the radius is zero and the digits displayed are all the digits
// held; everything else is `≈`. So a
// value that passes through an irrational step and comes out looking
// rational (`sqrt(2) / sqrt(2)`, whose midpoint is exactly `1`) is `≈`,
// however round its digits look, because its radius is not zero, while
// `sqrt(4)` is `= 2` because the exact case was detected and nothing was
// rounded. Exactness is a property of the value, not of the display, which
// is why the rule reads the radius rather than comparing digits.
//
// What is shown is certified: a digit is shown only when both ends of
// the ball round to it, so that the digits shown are the true value's
// correctly rounded in the mode, never merely close. The kinds say how far
// that goes: `exact` and `certified` show every digit asked for, the first
// with `=`; `partial` shows the digits that are certified, fewer than asked,
// and says how many; `zero` is a ball containing zero without being it,
// which certifies no digit and is shown as `0` with a bound on how far
// from zero the value may be; `unbounded` is a radius not known at all,
// shown as the midpoint's digits, certifying none, as the per-operation
// fallback displays. The retry loop of the pipeline (devdocs/numbers.md,
// "Working precision and the schedule") keeps `partial` and `zero` from
// reaching the display except at the ceiling.
//
// In decimal mode every value is exact (devdocs/numbers.md, "Decimal
// mode"), so the rule writes `=` for every line there, except for a value
// flagged `uncertified`, a step rounded at the ceiling without its digits
// certified, which is the kind `uncertified`: its digits, which the
// outcome writes with the `≈` sign bearing a dot above it and a note.
//
// With the ratio notation at a `width` (devdocs/notation.md, "The rule"),
// an exact value is written entire when its digits fit
// the width: a whole number by the decimal display at the width
// (`= 3486784401` for `3^20` at twenty), any other exact value as its
// fraction in lowest terms when the numerator and the denominator have at
// most the width in digits between them (`= 1/3`, `= 127/50` for `2.54`),
// and, when that does not fit, as a ratio times a power of ten written
// after it (`= 1/3 × 1e+30`) when the parts then fit and the denominator
// is not one; the `exact` kind says so with `fraction`, and `scale` for
// the power of ten. Everything else, an exact value past the width and every inexact
// value, is shown as above at the digits asked, the decimal display being
// the fallback, which says `=` where its own rule allows
// (`1.5e-999999999`). The user's rounding mode is applied here and
// nowhere else in exact mode (devdocs/numbers.md, "Settling"), and plays
// no part in a ratio, which is not rounded.

import {
  certifiedDigits,
  containsZero,
  isExact,
  magnitudeAbove,
  radiusValue,
  type Ball,
} from "./ball.ts";
import { isUnbounded, log2OfRadius } from "./radius.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS, rational } from "./rational.ts";
import {
  checkPrecision,
  type Precision,
  type RoundingMode,
} from "./rounding.ts";
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
 * (devdocs/numbers.md, "Certification and the display rule"). Nothing holds
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
    const bound = add(absolute(ball.mid), rad, MAX_SIGNIFICAND_LIMIT_BITS);
    if (bound.ok) return bound.value;
  }
  return oneDigitAbove(log2OfRadius(magnitudeAbove(ball)));
}

/**
 * The non-integer `s` as a ratio of two whole numbers, with the numerator
 * signed, when its parts have at most `width` digits between them
 * (devdocs/notation.md, "The rule", rules 3 and 4), and `undefined` when
 * they do not. First the fraction in lowest terms, the ordinary one with
 * the power of ten multiplied back in (`127/50`, `1/10000000`); when that
 * does not fit, the canonical significand as the ratio with its power of
 * ten as a `scale` written after it (`1/3` times `1e+30`, `5/127` times
 * `1e+33`), when the significand's parts fit and its denominator is not
 * one, a value with a denominator of one being a decimal the fallback
 * writes exactly in the same characters. The sign, the slash and the
 * scale are not counted. The fraction is formed
 * only when it can fit: for an exponent `k > 0`, its numerator has at
 * least `k + 1` digits; for `k < 0`, the `10^-k` cancels against the
 * significand's numerator, which is not divisible by ten and so holds
 * twos or fives but not both, so the denominator keeps at least `2^-k`
 * of it, more than `-k × log10 2` digits, and the numerator loses at
 * most its fives, `-k × log10 5` digits. So an exponent beyond four
 * times `width` in magnitude, or a significand numerator beyond three
 * times `width` in digits, cannot fit as a fraction, and nothing is
 * formed for it, while every value that can fit passes: a dyadic the
 * width admits, `2^-63` at twenty (`5^63 × 10^-63` in canonical form,
 * a numerator of forty-five digits), is formed. The scaled form's power
 * of ten is the canonical
 * exponent itself, which lies past the exponent bound for some values
 * within it (a third of `10^(10^18 + 1)` has the exponent `10^18 + 1`),
 * and the outcome then cannot write the line and throws (outcome.ts,
 * `literal`); whether the display should choose its own split of the
 * tens is issue #178's.
 */
function ratioParts(s: Scaled, width: Precision): Ratio | undefined {
  const { num, den } = s.significand;
  const k = s.exp;
  const bound = 4n * BigInt(width);
  const numDigits = decimalDigits(magnitude(num));
  if (k <= bound && k >= -bound && numDigits <= 3 * width) {
    // For `k >= 0` the parts stay coprime, the denominator being coprime
    // to ten; for `k < 0` the power of ten cancels against the numerator's
    // twos or fives, which `rational` reduces.
    const fraction =
      k >= 0n ? { num: num * 10n ** k, den } : rational(num, den * 10n ** -k);
    if (
      decimalDigits(magnitude(fraction.num)) + decimalDigits(fraction.den) <=
      width
    ) {
      return { text: `${fraction.num}/${fraction.den}` };
    }
  }
  if (den !== 1n && numDigits + decimalDigits(den) <= width) {
    return {
      text: `${num}/${den}`,
      scale: `1e${k < 0n ? "-" : "+"}${magnitude(k)}`,
    };
  }
  return undefined;
}

/** A ratio as `ratioParts` writes it: the text `N/D`, and the power of ten it is scaled by, when it is. */
type Ratio = { readonly text: string; readonly scale?: string };

function magnitude(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/** A ball as shown: its `text`, and the `kind` that says what the text is worth. */
export type Shown =
  /**
   * A decimal-mode value one of whose steps was rounded at the ceiling
   * without its digits certified (devdocs/numbers.md, "Decimal mode"):
   * every digit, exact under the mode's rounding, and not vouched for.
   */
  | { readonly kind: "uncertified"; readonly text: string }
  /**
   * An exact value, every digit of which is shown: `=`. With `fraction`,
   * `text` is a ratio `N/D` in lowest terms and, with `scale`, the value
   * is that ratio times `scale`, a power of ten as a literal (`1e+30`),
   * which the outcome writes as a product after the ratio
   * (devdocs/notation.md, "The rule"); it parenthesizes either where a
   * unit follows.
   */
  | {
      readonly kind: "exact";
      readonly text: string;
      readonly fraction?: true;
      readonly scale?: string;
    }
  /** Every digit asked for is certified; the value is inexact, or exact with more digits than shown. */
  | { readonly kind: "certified"; readonly text: string }
  /**
   * Fewer digits than asked for are certified: `certified` counts them,
   * and `text` shows those; `certified` is zero when no count from the
   * digits asked down to one certifies (`approx(1)` under `floor`, whose
   * ends round apart at every count), and `text` is then the midpoint at
   * the digits asked.
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
 * The ratio notation's settings (devdocs/notation.md, "The rule"): the
 * width, the most digits a ratio's two parts, or a whole number, may have
 * to be
 * written entire. The place a further setting of the notation goes, so
 * that it reaches every caller of `show` without a change of signature.
 */
export type RatioDisplay = {
  readonly width: Precision;
};

/** How `show` writes a ball: at how many significant digits, in which rounding mode, and, under the ratio notation, with its settings. */
export type ShowOptions = {
  readonly digits: Precision;
  readonly rounding: RoundingMode;
  /** The ratio notation's settings; absent is the digits notation, which has none. */
  readonly ratio?: RatioDisplay;
};

/**
 * `ball` at `digits` significant digits in `rounding`: `exact` when the
 * radius is zero and rounding the midpoint to `digits` leaves it
 * unchanged, so that every digit held is shown; otherwise the kind the
 * certification gives, with `text` the midpoint rounded in `rounding` to
 * the digits certified. With the ratio notation's `width`
 * (devdocs/notation.md, "The rule"), an exact value is written entire when it fits
 * the width, before any of that: a whole number of at most `width`
 * significant digits by the decimal display at the width, and any other
 * exact value as a ratio (`ratioParts`) when its parts fit; an exact
 * value that fits neither goes on to the rule above, at `digits`. The
 * ball is the one plain argument; the rest are named, so that a caller
 * states each and the compiler holds it to the two that are required,
 * the ratio notation's settings grouped under `ratio`.
 */
export function show(
  ball: Ball,
  { digits, rounding: mode, ratio }: ShowOptions,
): Shown {
  const { mid } = ball;
  if (ball.uncertified === true) {
    return { kind: "uncertified", text: format(mid, digits, mode) };
  }
  if (isUnbounded(ball.rad)) {
    return { kind: "unbounded", text: format(mid, digits, mode) };
  }
  if (ratio !== undefined && isExact(ball)) {
    const { width } = ratio;
    checkPrecision(width);
    if (isInteger(mid)) {
      if (equals(roundTo(mid, width, mode), mid)) {
        return { kind: "exact", text: format(mid, width, mode) };
      }
    } else {
      const parts = ratioParts(mid, width);
      if (parts !== undefined) {
        return { kind: "exact", fraction: true, ...parts };
      }
    }
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
