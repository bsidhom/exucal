// `erf(x)` and `erfc(x)`, the error function and its complement, on the
// incomplete gamma functions of order one half (incomplete.ts):
// `erf(x) = P(1/2, x^2)` for `x >= 0`, odd, and `erfc(x) = Q(1/2, x^2)`,
// with `erfc(-x) = 2 - erfc(x)`. devdocs/design/special.md ("`erf` and `erfc`
// (6.6)") is the design and devdocs/history/calculator-plan.md (task 6.6) places
// them. Each takes a plain number and gives one.
//
// The incomplete gamma routine chooses its route by cost and takes the
// complement where the other form is the one computed, so `erfc` of a
// large argument keeps its digits (`erfc(10)` is `≈ 2.0884876e-45`, not
// `1 - 1`), and its classifier on the exponent `-x^2 + …` holds the
// result to the exponent bound as the design asks: `e^-x^2` passes below
// `10^-(10^18)` near `x ≈ 1.5 × 10^9`, where `erfc` is `underflow` or
// `unresolved` at the bound as `exp` is. An argument at or beyond
// `2^bits` throughout, whose square the routine would not be handed,
// has `erf` at `±1` within `erfc(|x|)`, which is below `e^-x^2 < 10^-(10^18)`
// there, so `erf(1e400)` is one within the bound's edge and `erfc(1e400)`
// is `underflow`, `erfc(-1e400)` two within the edge. A tiny argument,
// whose square passes below the bound or below `2^-significandLimitBits`, has `erf(x)`
// as `2x / √π` within `|x|^3`, the next term of its series being
// `-2x^3 / (3 √π)`, and `erfc` as one less that.
//
// The exact cases: `erf(0)` is `0` and `erfc(0)` is `1`. A ball touching
// or straddling zero, whose square the routine refuses, is taken at its
// two ends and the results hulled, both functions being monotone; an
// argument of unbounded radius gives the function of its midpoint with
// an unbounded radius. There is no domain error: both are defined on
// every real.

import {
  exact,
  isExact,
  magnitudeAbove,
  multiplyBalls,
  negateBall,
  position,
  radiusValue,
  subtractBalls,
  type Ball,
  type BallError,
} from "../ball.ts";
import {
  tooLarge,
  fromBallError,
  hullOfEnds,
  isBeyond,
  isTiny,
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
  UNKNOWN_NEED,
} from "../builtin.ts";
import { piFixed } from "../constants.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import {
  bitsFor,
  divideFixed,
  fixedToBall,
  sqrtFixed,
  type Fixed,
} from "../fixed.ts";
import { addRadius, multiplyRadius, powerOfTenRadius } from "../radius.ts";
import { rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  add,
  fromInteger,
  fromRational,
  sign,
  subtract,
} from "../scaled.ts";
import { incompleteGammaBall } from "./incomplete.ts";

const HALF = exact(fromRational(rational(1n, 2n)));
const TWO = fromInteger(2n);

/** The radius of a value within the bound's edge of its limit: `10^-(10^18)`. */
const PAST_BOTTOM = powerOfTenRadius(-MAX_EXPONENT);

/** `erf(x)` at the context, as the header says. */
export function erfBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(erfBall(exact(x.mid), context));
  }
  if (isExact(x) && sign(x.mid) === 0) return ok(exact(ZERO));
  const side = position(x, ZERO);
  if (side !== "above" && side !== "below") {
    return atEnds(x, context, (end) => erfBall(end, context));
  }
  if (side === "below") {
    const positive = erfBall(negateBall(x), context);
    return positive.ok ? ok(negateBall(positive.value)) : positive;
  }
  const bits = bitsFor(context.precision);
  if (isBeyond(x, bits)) return ok({ mid: ONE, rad: PAST_BOTTOM });
  if (isTiny(x, context)) return ok(tinyErf(x, context));
  const square = multiplyBalls(x, x, context);
  if (!square.ok) {
    // Past the bottom of the bound: the tiny route; past the top is
    // beyond 2^bits, answered above.
    if (square.error.kind === "underflow") return ok(tinyErf(x, context));
    return failed(square.error);
  }
  return blamed(
    incompleteGammaBall(HALF, square.value, "lower", true, context),
  );
}

/** `erfc(x)` at the context, as the header says. */
export function erfcBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(erfcBall(exact(x.mid), context));
  }
  if (isExact(x) && sign(x.mid) === 0) return ok(exact(ONE));
  const side = position(x, ZERO);
  if (side !== "above" && side !== "below") {
    return atEnds(x, context, (end) => erfcBall(end, context));
  }
  if (side === "below") {
    // erfc(x) = 2 - erfc(-x).
    const positive = erfcBall(negateBall(x), context);
    if (!positive.ok) {
      return positive.error.kind === "underflow"
        ? ok({ mid: TWO, rad: PAST_BOTTOM })
        : positive;
    }
    const result = subtractBalls(exact(TWO), positive.value, context);
    return result.ok ? result : failed(result.error);
  }
  const bits = bitsFor(context.precision);
  if (isBeyond(x, bits)) return err({ kind: "underflow" });
  if (isTiny(x, context)) return oneLess(tinyErf(x, context), context);
  const square = multiplyBalls(x, x, context);
  if (!square.ok) {
    if (square.error.kind === "underflow") {
      return oneLess(tinyErf(x, context), context);
    }
    return failed(square.error);
  }
  return blamed(
    incompleteGammaBall(HALF, square.value, "upper", true, context),
  );
}

/** `erf(x)` for a tiny positive `x`: `2x / √π` within `|x|^3`. */
function tinyErf(x: Ball, context: NumberContext): Ball {
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  const pi = piFixed(bits + 8, ceilingBits);
  const two: Fixed = { value: 2n << BigInt(pi.bits), error: 0n, bits: pi.bits };
  const factor = fixedToBall(
    divideFixed(two, sqrtFixed(pi)),
    workingDigits(context),
  );
  const product = multiplyBalls(factor, x, context);
  if (!product.ok)
    throw new Error("A tiny argument times a constant is within the bound");
  const magnitude = magnitudeAbove(x);
  const cube = multiplyRadius(multiplyRadius(magnitude, magnitude), magnitude);
  return { mid: product.value.mid, rad: addRadius(product.value.rad, cube) };
}

/** `1 - value`. */
function oneLess(
  value: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const result = subtractBalls(exact(ONE), value, context);
  return result.ok ? result : failed(result.error);
}

/**
 * The function over a ball touching or straddling zero, from its two
 * ends exactly, the results hulled (`hullOfEnds`): both functions are
 * monotone, so the ends are the extremes.
 */
function atEnds(
  x: Ball,
  context: NumberContext,
  f: (end: Ball) => Result<Ball, BuiltinError>,
): Result<Ball, BuiltinError> {
  const r = radiusValue(x.rad);
  if (r === undefined) throw new Error("A bounded radius has a value");
  const lo = subtract(x.mid, r, context.significandLimitBits);
  const hi = add(x.mid, r, context.significandLimitBits);
  if (!lo.ok || !hi.ok) return tooLarge("exceeds", UNKNOWN_NEED);
  return hullOfEnds(f(exact(lo.value)), f(exact(hi.value)), 0);
}

/** A ball operation's failure as the built-in's. */
function failed(error: BallError): Result<never, BuiltinError> {
  return err(fromBallError(error, 0));
}

/** The incomplete gamma routine's failure as this built-in's: its argument is the square, this one's the only argument. */
function blamed(
  result: Result<Ball, BuiltinError>,
): Result<Ball, BuiltinError> {
  if (result.ok || !("argument" in result.error)) return result;
  return err({ ...result.error, argument: 0 });
}

export const erf: Builtin = {
  name: "erf",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => erfBall(x!, context),
};

export const erfc: Builtin = {
  name: "erfc",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => erfcBall(x!, context),
};
