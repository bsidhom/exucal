// The way out of the kernel for a result whose binary exponent cannot be
// formed: the decimal digits of a `Floating` (fixed.ts) found in log space.
// docs/decimal.md ("The kernel's boundary") is the design and
// docs/calculator-plan.md (task 4.9) places it; it sits above the kernel,
// since it calls the kernel's logarithm and exponential, and below the
// ball, which it hands a ball to (the built-ins that return a `Floating`,
// `exp`, `sinh` and `cosh`, and the log-space power of ball.ts take their
// results out through `floatingToBall`).
//
// A `Floating` `m × 2^e` whose exponent is within the range limit is
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
// its error carried in the kernel's counts (D9), so the ball's radius
// covers the logarithm's error, the exponential's and the rounding's, and
// the whole interval of the `Floating`; a `Floating` whose interval
// reaches zero is a ball around zero bounded by its extent. Nothing else
// in the program needs log space: the display writes the decimal it is
// given, and the exponent bound of scaled.ts holds the decimal exponent,
// which the caller's guard (`expFits`) has already bounded, so the power
// of ten can be formed, and its failure is a `tooLarge` the caller
// returns.

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
import { ok, type Result } from "./result.ts";
import { ZERO, multiply, negate, scaled } from "./scaled.ts";

/** The bits the logarithm and the exponential work beyond the result, for their ulps. */
const GUARD = 24;

/**
 * The ball of `fl` at the working digits of `context`: exactly where the
 * exponent is within the range limit, and in log space otherwise, as the
 * header says; `tooLarge` when the decimal exponent passes the bound.
 */
export function floatingToBall(
  fl: Floating,
  context: NumberContext,
): Result<Ball, BallError> {
  const digits = workingDigits(context);
  const fixed = floatingToFixed(fl, context.maxBits);
  if (fixed !== undefined) return ok(fixedToBall(fixed, digits));
  const { mant, exp } = fl;
  const magnitude = abs(mant.value);
  const binaryExponent = exp - BigInt(mant.bits);
  if (magnitude <= mant.error) {
    // The interval reaches zero: a ball around it, bounded by the extent.
    return ok({
      mid: ZERO,
      rad: shiftRadius(
        radiusAbove(rational(magnitude + mant.error)),
        binaryExponent,
      ),
    });
  }
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  const working = bits + bitLength(abs(exp)) + GUARD;
  // t = (e ln 2 + ln m) / ln 10, the decimal logarithm of the magnitude,
  // the mantissa's own fraction bits being the logarithm's to read.
  const lnMantissa = lnFixed(
    { value: magnitude, error: mant.error, bits: mant.bits },
    working,
    ceilingBits,
  );
  const lnPower = scaleFixed(ln2Fixed(working, ceilingBits), exp);
  const t = divideFixed(
    addFixed(lnPower, lnMantissa),
    ln10Fixed(working, ceilingBits),
  );
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
  if (!power.ok) return power;
  const mid = multiply(ball.mid, power.value);
  if (!mid.ok) return mid;
  return ok({
    mid: mant.value < 0n ? negate(mid.value) : mid.value,
    rad: multiplyRadius(ball.rad, radiusAboveScaled(power.value)),
  });
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
