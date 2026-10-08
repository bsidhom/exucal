// `pow(x, y)`: a plain base to a plain exponent. devdocs/design/builtins.md is the
// design and devdocs/history/calculator-plan.md (task 3.8, then H.6) places it; a
// power of a quantity is written with `^`, whose exponent is a literal so
// that the dimension stays exact, and the dimension rule's message says
// so.
//
// Three cases need no arithmetic, and are answered before anything is
// formed, in this order: an exact exponent of zero gives one for any base
// (`pow(0, 0)` and an unbounded base included); an exact base of one gives
// exactly one for any exponent, inexact or unbounded included; and an
// exact base of zero is decided by the side of zero the exponent lies on,
// exact zero when the exponent is positive throughout, `divisionByZero`
// when negative throughout, and `unresolved` at edge zero on the exponent
// when it straddles zero. A fourth, an exact base of minus one, needs the
// exponent's parity alone and is the exception to the fraction below.
// Stage 4 formed an exact exponent's fraction first, so
// `pow(1, 1e999999999)` and `pow(0, 1e999999999)` were refused as
// `tooLarge`, and it took `pow(1, approx(1e400))` to log space, which
// refused it (issue #46).
//
// Any other base with an exact exponent follows one rule with `^`
// (`powRationalBall` of ball.ts): integer powers exact, a rational
// exponent exact when the base is a perfect power, the root of the power
// when it fits the significand limit, and log space otherwise (a root of a
// degree past `2^32`, `pow(3, 1e-30)`, or of a significand too far below one
// for the kernel's root goes to log space too, ball.ts's `positiveRoot`;
// issues #45 and #57). The exponent is formed as a fraction within the
// significand limit; one that cannot be formed goes to log space as an inexact
// exponent does (`unformable` below; the plan's H.16), an exact base told
// past the bound by its value first (`pow(2, 1e999999999)` is `overflow`),
// so that `pow(2, 1e-999999999)`, a value near one whose exponent's
// denominator is too large to form, is `≈ 1` where it was `tooLarge`,
// and a negative base takes the exponent's parity, which the canonical
// form of `Scaled` gives without the fraction (`minusOneTo` below):
// `pow(-1, 1e999999999)` is `1`, `pow(-1, 5^-16000)` is `-1` and
// `pow(-2, 1e-30000)` is the even root of a negative number (#46). An
// inexact exponent is log space
// (`powLogSpace`, `exp(y ln x)`) for a base positive throughout its ball;
// a base non-positive throughout is a `domain` error (`notPositive`,
// worded for `pow`), and one straddling zero is `unresolved` at edge
// zero. An argument of unbounded radius gives the power of the midpoints
// with an unbounded radius.

import {
  classifyPower,
  exact,
  isExact,
  logPowerBlame,
  negateBall,
  powLogSpace,
  powRationalBall,
  type Ball,
  type BallError,
} from "../ball.ts";
import {
  checkPositive,
  fromBallError,
  plainNumbers,
  sideOfZero,
  unboundedOf,
  type Builtin,
  type BuiltinError,
  UNKNOWN_NEED,
  tooLarge,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { err, ok, type Result } from "../result.ts";
import {
  ONE,
  ZERO,
  equals,
  isZero,
  negate,
  powerRefusal,
  toRational,
  trailingZeros,
  type Scaled,
} from "../scaled.ts";

const MINUS_ONE = negate(ONE);

/** `pow(x, y)` at the context, as the header says. */
export function powBallOf(
  x: Ball,
  y: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (isExact(y) && isZero(y.mid)) return ok(exact(ONE));
  if (isExact(x) && equals(x.mid, ONE)) return ok(exact(ONE));
  if (x.rad.kind === "unbounded" || y.rad.kind === "unbounded") {
    return unboundedOf(
      powBallOf(
        x.rad.kind === "unbounded" ? exact(x.mid) : x,
        y.rad.kind === "unbounded" ? exact(y.mid) : y,
        context,
      ),
    );
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
  if (isExact(y)) {
    const exponent = toRational(y.mid, context.significandLimitBits);
    if (!exponent.ok) return unformable(x, y, context);
    const power = powRationalBall(x, exponent.value, context);
    return power.ok ? power : err(fromBallError(power.error, 0));
  }
  const positive = checkPositive(x, 0);
  if (!positive.ok) return positive;
  const power = powLogSpace(x, y, context);
  return power.ok ? power : err(located(power.error, x, y));
}

/**
 * `x^y` for an exact `y` whose fraction cannot be formed within the range
 * limit (the plan's H.16, issue #46): log space, as for an inexact
 * exponent, rather than a refusal, so that `pow(2, 1e-999999999)` is one
 * within a hair as `pow(2, approx(1e-999999999))` is (D17: whether a
 * value is held does not depend on whether it is exact). An exact base
 * is first told past the bound by `powerRefusal`, which reads the value
 * alone (`pow(2, 1e999999999)` stays `overflow`), and otherwise goes on
 * as an inexact one does, the classifier of `powLogSpace` deciding on
 * the interval of `y ln |x|` (H.15): a base positive throughout goes
 * through `powLogSpace`; a base negative throughout follows the parity
 * rule of `minusOneTo`, `(-1)^y` times the power of its magnitude
 * (`pow(-2, 1e-30000)` is the even root of a negative number); and a base
 * reaching zero keeps what the classifier gives it, `unresolved` at the
 * bound or at zero where the interval says so and `tooLarge` where it
 * would compute, since the logarithm of such a base cannot be taken.
 */
function unformable(
  x: Ball,
  y: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (isExact(x)) {
    const refusal = powerRefusal(x.mid, y.mid);
    if (refusal !== undefined && refusal.kind !== "limit") {
      return err(refusal);
    }
  }
  switch (sideOfZero(x)) {
    case "positive": {
      const power = powLogSpace(x, y, context);
      return power.ok ? power : err(located(power.error, x, y));
    }
    case "negative": {
      const parity = minusOneTo(y.mid);
      if (!parity.ok) return parity;
      const power = powLogSpace(negateBall(x), y, context);
      if (!power.ok) return err(located(power.error, x, y));
      return equals(parity.value.mid, MINUS_ONE)
        ? ok(negateBall(power.value))
        : power;
    }
    case "zero":
      throw new Error("An exact zero base is answered before the exponent");
    case "straddles": {
      const held = classifyPower(x, y, context);
      switch (held.kind) {
        case "overflow":
        case "underflow":
        case "tooLarge":
          return err(held);
        case "unresolved":
          return err({ kind: "unresolved", argument: 0, edge: held.edge });
        case "one":
        case "compute":
          // A base straddling zero has no power to compute, at any bits.
          return tooLarge("exceeds", UNKNOWN_NEED);
      }
    }
  }
}

/** A log-space power's failure as the built-in's: an `unresolved` at the bound at the argument whose radius contributes more to `y ln x`, and any other at the base. */
function located(error: BallError, x: Ball, y: Ball): BuiltinError {
  return fromBallError(
    error,
    error.kind === "unresolved" && error.edge === "bound"
      ? logPowerBlame(x, y)
      : 0,
  );
}

/**
 * `(-1)^y` for a nonzero exact `y` whose fraction cannot be formed within
 * the significand limit, from the parity its canonical form gives: `y` is
 * `num / den × 10^exp` with `den` coprime to ten, hence odd, and `num`
 * not divisible by ten. With `exp > 0` the fraction is `num × 10^exp`
 * over `den`, an even numerator over an odd denominator in lowest terms,
 * so the power is `1` (`1e999999999`, `1e999999999/3`). With `exp < 0`
 * the denominator is `den × 10^-exp`, and its twos cancel against the
 * numerator's: with fewer twos in `num` than `-exp` it stays even, and
 * the power is the even root of a negative number (`1e-30000`); with
 * exactly `-exp` twos both parts are odd, and the power is `-1`
 * (`5^-16000`, which is `2^16000 × 10^-16000`); with more the numerator
 * stays even, and the power is `1` (`2 * 5^-16000`). The sign of `y`
 * changes nothing, a reciprocal of `±1` being itself. The degree the
 * `negativeRadicand` carries is two, the even factor known, since the
 * denominator itself is what could not be formed.
 */
function minusOneTo(y: Scaled): Result<Ball, BuiltinError> {
  if (y.exp > 0n) return ok(exact(ONE));
  const num = y.significand.num < 0n ? -y.significand.num : y.significand.num;
  const twos = trailingZeros(num);
  if (twos < -y.exp) return err({ kind: "negativeRadicand", degree: 2n });
  return ok(exact(twos === -y.exp ? MINUS_ONE : ONE));
}

export const pow: Builtin = {
  name: "pow",
  arity: { min: 2, max: 2 },
  dimensions: plainNumbers(2),
  apply: ([x, y], context) => powBallOf(x!, y!, context),
};
