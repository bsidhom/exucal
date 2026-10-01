// `digamma(x)`: the logarithmic derivative of the Gamma function, on the
// kernel's `digammaFixed` (fixed-gamma.ts). docs/special.md ("The Gamma
// and Beta families") is the design and docs/calculator-plan.md (task
// 6.2) places it; `gamma` and `lgamma` join this module in 6.3. There is
// no exact case: no rational value of `ψ` is known (`ψ(1)` is `-γ`).
//
// A positive argument of moderate size goes to the kernel at the working
// bits, plus the bits a small argument needs to keep its digits
// (`extraBits`, as the odd functions scale theirs), and comes back as the
// kernel's ball, rounded in no mode, for the evaluator to settle (D15).
// One at or beyond `2^bits` throughout is `ln x` within `1 / x`, since
// `|ψ(x) - ln x| <= 1 / (2x) + 1 / (12 x^2)` there, through `lnScaled`,
// which takes any exponent; one below `2^-maxBits` throughout, which the
// kernel cannot be handed, is `ψ(1 + x) - 1 / x` with `ψ(1 + x)` taken as
// `ψ(1)` within `2 |x|`, the derivative being below two on `[1, 2]`, and
// `1 / x` the exact reciprocal (so `digamma(1e-999999999)` is a value).
//
// The poles are the non-positive integers: an exact one is a `domain`
// error (`pole`), and a ball touching or reaching across one is
// `unresolved` at the edge `pole`, as `tan`'s is, which the retry loop
// narrows; `floorBall` decides it, since a ball lies inside one integer's
// cell exactly when its floor is decided. A negative argument that is
// not a pole takes the reflection `ψ(x) = ψ(1 - x) - π cot(π x)`, with
// `1 - x` positive and `cot(π x)` taken at the fractional part `x -
// floor(x)` in `(0, 1)`, exactly, so that a large negative argument
// costs no reduction of a large angle; a fractional part above one half
// is folded to `1 - t`, where the sine keeps its digits. The sine's ball
// reaching zero is the pole again. An argument of unbounded radius gives
// the function of its midpoint with an unbounded radius.

import {
  divideBalls,
  exact,
  isExact,
  lnScaled,
  magnitudeAbove,
  magnitudeBelow,
  position,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  extraBits,
  fromBallError,
  isBeyond,
  isTiny,
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { piFixed } from "../constants.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import { digammaFixed } from "../fixed-gamma.ts";
import { sinCosFixed } from "../fixed-trig.ts";
import {
  bitsFor,
  divideFixed,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
  multiplyFixed,
  type Fixed,
} from "../fixed.ts";
import {
  addRadius,
  divideRadius,
  radiusAbove,
  shiftRadius,
} from "../radius.ts";
import { abs, rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import { ONE, ZERO, fromRational, isInteger, sign } from "../scaled.ts";
import { floorBall } from "./round.ts";

const HALF = fromRational(rational(1n, 2n));
const ONE_RADIUS = radiusAbove(rational(1n));

const POLE: Result<never, BuiltinError> = err({
  kind: "unresolved",
  argument: 0,
  edge: "pole",
});

/** `digamma(x)` at the context, as the header says. */
export function digammaBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(digammaBall(exact(x.mid), context));
  }
  if (isExact(x) && isInteger(x.mid) && sign(x.mid) <= 0) {
    return err({ kind: "domain", argument: 0, reason: "pole" });
  }
  if (position(x, ZERO) === "above") return positive(x, context);
  // Reaching zero or below: inside one integer's cell, or at a pole.
  const floored = floorBall(x, context);
  if (!floored.ok) {
    return floored.error.kind === "unresolved" ? POLE : floored;
  }
  const fraction = subtractBalls(x, floored.value, context);
  if (!fraction.ok) return err(fromBallError(fraction.error, 0));
  const reflected = subtractBalls(exact(ONE), x, context);
  if (!reflected.ok) return err(fromBallError(reflected.error, 0));
  const psi = positive(reflected.value, context);
  if (!psi.ok) return psi;
  const cot = piCotPi(fraction.value, context);
  if (!cot.ok) return cot;
  const result = subtractBalls(psi.value, cot.value, context);
  return result.ok ? result : err(fromBallError(result.error, 0));
}

/** `ψ(x)` for `x` positive throughout, as the header says. */
function positive(x: Ball, context: NumberContext): Result<Ball, BuiltinError> {
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  const digits = workingDigits(context);
  if (isBeyond(x, bits)) {
    const ln = lnScaled(x, bits, ceilingBits);
    if (ln === undefined)
      throw new Error("A value beyond 2^bits is not near zero");
    const ball = fixedToBall(ln, digits);
    const slack = divideRadius(ONE_RADIUS, magnitudeBelow(x));
    return ok({ mid: ball.mid, rad: addRadius(ball.rad, slack) });
  }
  if (isTiny(x, context)) {
    const one = fixedToBall(
      digammaFixed(fixedOne(bits), bits, ceilingBits),
      digits,
    );
    const psiOne: Ball = {
      mid: one.mid,
      rad: addRadius(one.rad, shiftRadius(magnitudeAbove(x), 1n)),
    };
    const reciprocal = divideBalls(exact(ONE), x);
    if (!reciprocal.ok) return err(fromBallError(reciprocal.error, 0));
    const result = subtractBalls(psiOne, reciprocal.value, context);
    return result.ok ? result : err(fromBallError(result.error, 0));
  }
  const f = fixedFromBall(x, bits + extraBits(x.mid, context));
  // Only a ball wider than its value reaches zero at these bits.
  if (f.value - f.error <= 0n) return POLE;
  return ok(fixedToBall(digammaFixed(f, bits, ceilingBits), digits));
}

/** One at `bits` fraction bits, exactly. */
function fixedOne(bits: number): Fixed {
  return { value: 1n << BigInt(bits), error: 0n, bits };
}

/**
 * `π cot(π t)` for `t` in `(0, 1)`, as the header says: the sine's ball
 * reaching zero is a pole.
 */
function piCotPi(t: Ball, context: NumberContext): Result<Ball, BuiltinError> {
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  // cot(π t) = -cot(π (1 - t)): the half nearer zero keeps the sine's digits.
  const folded = position(t, HALF) === "above";
  const near = folded ? subtractBalls(exact(ONE), t, context) : ok(t);
  if (!near.ok) return err(fromBallError(near.error, 0));
  const working = bits + extraBits(near.value.mid, context);
  const ft = fixedFromBall(near.value, working);
  const pi = piFixed(working + 2, ceilingBits);
  const { sin, cos } = sinCosFixed(multiplyFixed(pi, ft), working, ceilingBits);
  if (abs(sin.value) <= sin.error) return POLE;
  const cot = divideFixed(cos, sin);
  const product = keepSignificant(multiplyFixed(pi, cot), bits);
  const result = folded ? { ...product, value: -product.value } : product;
  return ok(fixedToBall(result, workingDigits(context)));
}

export const digamma: Builtin = {
  name: "digamma",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => digammaBall(x!, context),
};
