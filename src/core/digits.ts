// The way out of the kernel for a result whose binary exponent cannot be
// formed: the decimal digits of a `Floating` (fixed.ts) found in log space.
// devdocs/numbers.md ("The kernel's boundary") is the design; it sits
// above the kernel, since it calls the kernel's logarithm and
// exponential, and below the
// ball, which it hands a ball to (the built-ins that return a `Floating`,
// `exp`, `sinh` and `cosh`, and the log-space power of ball.ts take their
// results out through `floatingToBall`).
//
// A `Floating` `m × 2^e` whose exponent is within the significand limit is
// converted exactly, the binary point moved and the value rounded onto
// the decimal grid of the working digits as every kernel result is
// (`fixedToBall`). One whose exponent is beyond it, `exp(1e6)` at about
// `2^1442695`, is never formed: its decimal logarithm is `t = (e ln 2 +
// ln m) / ln 10`, computed on the kernel at the working bits plus the bit
// length of the exponent plus a margin, so that the exponent's product
// with `ln 2` from the memo keeps the working bits; the decimal exponent
// is `floor(t)`, the leading digits are `10^(t - floor(t))`, the
// exponential of the fraction times `ln 10`, a value of order one, and
// the result is that value's ball, rounded onto the working digits, times
// the power of ten in the exponent. Every step is a kernel operation with
// its error carried in the kernel's counts, so the ball's radius
// covers the logarithm's error, the exponential's and the rounding's, and
// the whole interval of the `Floating`; a `Floating` whose interval
// reaches zero is a ball around zero bounded by its extent. Nothing else
// in the program needs log space: the display writes the decimal it is
// given. The decimal exponent is held to the exponent bound by the
// interval of `t` (devdocs/numbers.md, "The exponent bound"): `overflow`
// or `underflow` when the whole interval passes an edge, and `unresolved`
// at the edge `bound` when it reaches one, or when the rounding onto the
// working digits carries the leading digits to ten at the top, where a
// power of ten past the
// bound would have been formed and refused; the callers' classifier
// (ball.ts) decides with a margin, so that neither is reached from them.

import type { Ball, BallError } from "./ball.ts";
import { workingDigits, type NumberContext } from "./context.ts";
import { expFixed } from "./fixed-exp.ts";
import { ln2Fixed, ln10Fixed, lnFixed } from "./fixed-log.ts";
import {
  addFixed,
  bitsFor,
  divideFixed,
  fixedToBall,
  floatingToFixed,
  multiplyFixed,
  scaleFixed,
  type Fixed,
  type Floating,
} from "./fixed.ts";
import {
  multiplyRadius,
  radiusAbove,
  radiusAboveScaled,
  shiftRadius,
} from "./radius.ts";
import { bitLength, rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { MAX_EXPONENT, ZERO, negate, scaled } from "./scaled.ts";

/** The bits the logarithm and the exponential work beyond the result, for their ulps. */
const GUARD = 24;

/**
 * The ball of `fl` at the working digits of `context`: exactly where the
 * exponent is within the significand limit, and in log space otherwise, as the
 * header says; `overflow` or `underflow` when the decimal exponent passes
 * the bound.
 */
export function floatingToBall(
  fl: Floating,
  context: NumberContext,
): Result<Ball, BallError> {
  const digits = workingDigits(context);
  const fixed = floatingToFixed(fl, context.significandLimitBits);
  if (fixed !== undefined) return ok(fixedToBall(fixed, digits));
  const { significand, exp } = fl;
  const magnitude = abs(significand.value);
  const binaryExponent = exp - BigInt(significand.bits);
  if (magnitude <= significand.error) {
    // The interval reaches zero: a ball around it, bounded by the extent.
    return ok({
      mid: ZERO,
      rad: shiftRadius(
        radiusAbove(rational(magnitude + significand.error)),
        binaryExponent,
      ),
    });
  }
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  const working = bits + bitLength(abs(exp)) + GUARD;
  // t = (e ln 2 + ln m) / ln 10, the decimal logarithm of the magnitude,
  // the significand's own fraction bits being the logarithm's to read.
  const lnSignificand = lnFixed(
    { value: magnitude, error: significand.error, bits: significand.bits },
    working,
    ceilingBits,
  );
  const lnPower = scaleFixed(ln2Fixed(working, ceilingBits), exp);
  const t = divideFixed(
    addFixed(lnPower, lnSignificand),
    ln10Fixed(working, ceilingBits),
  );
  // The interval of t against the edges of the bound: past the top
  // throughout when its floor is above 10^18 at the lower end, past the
  // bottom throughout when it lies below -10^18 at the upper end, and
  // straddling an edge when only one end passes it.
  const atBound: BallError = { kind: "unresolved", edge: "bound" };
  const lower = (t.value - t.error) >> BigInt(t.bits);
  const upper = (t.value + t.error) >> BigInt(t.bits);
  if (lower > MAX_EXPONENT) return err({ kind: "overflow" });
  if (upper < -MAX_EXPONENT) return err({ kind: "underflow" });
  if (upper > MAX_EXPONENT || lower < -MAX_EXPONENT) return err(atBound);
  // The decimal exponent is the floor of t's value, and the fraction is
  // what is left, within t's error either way.
  const decimalExponent = t.value >> BigInt(t.bits);
  const fraction: Fixed = {
    value: t.value - (decimalExponent << BigInt(t.bits)),
    error: t.error,
    bits: t.bits,
  };
  // The leading digits: 10^fraction, of order one, as a ball on the grid.
  const leading = expFixed(
    multiplyFixed(fraction, ln10Fixed(t.bits, ceilingBits)),
    bits + GUARD,
  );
  const leadingFixed = floatingToFixed(leading, 64);
  if (leadingFixed === undefined) {
    throw new Error("The exponential of a fraction is of order one");
  }
  const ball = fixedToBall(leadingFixed, digits);
  const power = scaled({ num: 1n, den: 1n }, decimalExponent);
  if (!power.ok) throw new Error("A decimal exponent within the bound");
  // The leading digits rounded onto the grid can carry to ten at the top,
  // a power of ten past the bound: the value reaches the edge.
  // The exponent moves by the decimal exponent; the significand stays.
  const mid = scaled(ball.mid.significand, ball.mid.exp + decimalExponent);
  if (!mid.ok) return err(atBound);
  return ok({
    mid: significand.value < 0n ? negate(mid.value) : mid.value,
    rad: multiplyRadius(ball.rad, radiusAboveScaled(power.value)),
  });
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
