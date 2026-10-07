// The Gamma family: `digamma(x)`, the logarithmic derivative of the
// Gamma function, `lgamma(x)`, the logarithm of its magnitude, and
// `gamma(x)` itself, on the kernel's `digammaFixed` and `lgammaFixed`
// (fixed-gamma.ts). docs/special.md ("The Gamma and Beta families") is
// the design and docs/calculator-plan.md (tasks 6.2 and 6.3) places them.
// Every one takes a plain number and gives one.
//
// A positive argument of moderate size goes to the kernel at the working
// bits, plus the bits a small argument needs to keep its digits
// (`extraBits`, as the odd functions scale theirs), and comes back as the
// kernel's ball, rounded in no mode, for the evaluator to settle (D15);
// an exact one whose denominator is short, which is what a typed decimal
// or fraction is, goes to the kernel's exact entries instead
// (`shortRational`, `lgammaRational` and `digammaRational`), which shift
// it by binary splitting and four times as far (#117).
// One at or beyond `2^bits` throughout takes the series' leading terms
// on balls, since `ln` takes any exponent: `digamma` is `ln x` within
// `1 / x`, as `|ψ(x) - ln x| <= 1 / (2x) + 1 / (12 x^2)` there, and
// `lgamma` is `x (ln x - 1) - ln(x) / 2 + ln(2π) / 2` within `1 / (12 x)`,
// the first omitted term of Stirling's series. One below `2^-significandLimitBits` in
// magnitude throughout, which the kernel cannot be handed, takes the
// expansion at zero: `ψ(x)` is `ψ(1 + x) - 1 / x` with `ψ(1 + x)` taken
// as `ψ(1)` within `2 |x|`, the derivative being below two on `[1, 2]`,
// and `1 / x` the exact reciprocal (so `digamma(1e-999999999)` is a
// value); `ln |Γ(x)|` is `-ln |x| + ln Γ(1 + x)` with the second term
// within `|x|`, since `|ψ|` is below one on `[1 - |x|, 1 + |x|]`.
//
// The poles are the non-positive integers: an exact one is a `domain`
// error (`pole`), and a ball touching or reaching across one is
// `unresolved` at the edge `pole`, as `tan`'s is, which the retry loop
// narrows; `floorBall` decides it, since a ball lies inside one integer's
// cell exactly when its floor is decided. A negative argument that is
// not a pole takes the reflection, `ψ(x) = ψ(1 - x) - π cot(π x)` and
// `ln |Γ(x)| = ln π - ln |sin(π x)| - ln Γ(1 - x)`, with `1 - x` positive
// and the trigonometric part taken at the fractional part `x - floor(x)`
// in `(0, 1)`, exactly, so that a large negative argument costs no
// reduction of a large angle; a fractional part above one half is folded
// to `1 - t`, where the sine keeps its digits. The sine's ball reaching
// zero is the pole again. `Γ(x)` is negative exactly when `floor(x)` is
// odd, the sign of `sin(π x)`.
//
// `gamma(x)` is `exp(lgamma(x))` with that sign, except for an exact
// integer `x >= 1`, whose factorial is the exact value when it fits Most
// bits (`factorialOf`) and the kernel's value, inexact, when it does not,
// which is the remedy the factorial's refusal names: `gamma(20001)` is a
// value of 77,338 digits in log space. The result takes the guard every
// exponential takes (D18, the plan's H.15): the classifier of ball.ts
// (`classifyExp`) on the `lgamma` ball, which refuses `overflow` only
// when every value of the argument puts the result past the top of the
// exponent bound, `underflow` when every value puts it below the bottom
// (a large negative argument whose `Γ` is tiny by the reflection),
// leaves a ball across an edge `unresolved` at the bound, and otherwise
// lets the exponential's `Floating` come out through digits.ts
// (`floatingToBall`), in log space where the exponent cannot be formed.
// The `lgamma` ball for it is taken at the working bits plus the bits of
// its own magnitude, so that its absolute error, which is the result's
// relative error, stays below the working bits' ulp: `gamma(1e15)` has
// a logarithm near `2^55`. Propagation is by running the shift and the
// series on the argument's interval (D9), so `gamma` does not depend on
// `digamma`. An argument of unbounded radius gives the function of its
// midpoint with an unbounded radius.

import {
  addBalls,
  classifyExp,
  divideBalls,
  exact,
  isExact,
  lnScaled,
  magnitudeAbove,
  magnitudeBelow,
  multiplyBalls,
  negateBall,
  position,
  subtractBalls,
  type Ball,
  type BallError,
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
import { floatingToBall } from "../digits.ts";
import { expFixed } from "../fixed-exp.ts";
import {
  EXACT_DENOMINATOR_BITS,
  digammaFixed,
  digammaRational,
  lgammaFixed,
  lgammaRational,
  lnPiFixed,
  lnTwoPiHalfFixed,
} from "../fixed-gamma.ts";
import { lnFixed } from "../fixed-log.ts";
import { sinCosFixed } from "../fixed-trig.ts";
import {
  bitsFor,
  divideFixed,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
  multiplyFixed,
  subtractFixed,
} from "../fixed.ts";
import {
  addRadius,
  divideRadius,
  radiusAbove,
  shiftRadius,
} from "../radius.ts";
import { abs, bitLength, rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import {
  BITS_PER_DIGIT,
  ONE,
  ZERO,
  absolute,
  equals,
  fromInteger,
  fromRational,
  isInteger,
  isZero,
  log2Bounds,
  sign,
  toRational,
} from "../scaled.ts";
import { factorialOf } from "./integers.ts";
import { floorBall } from "./round.ts";

/** The bits `gamma` asks its logarithm for beyond those of its magnitude. */
const GAMMA_MARGIN = 16;

const HALF = fromRational(rational(1n, 2n));
const TWO = fromInteger(2n);
const ONE_RADIUS = radiusAbove(rational(1n));

const POLE: Result<never, BuiltinError> = err({
  kind: "unresolved",
  argument: 0,
  edge: "pole",
});

const AT_POLE: Result<never, BuiltinError> = err({
  kind: "domain",
  argument: 0,
  reason: "pole",
});

/** A ball operation's failure as the built-in's, blamed on the argument. */
function failed(error: BallError): Result<never, BuiltinError> {
  return err(fromBallError(error, 0));
}

/** Whether `x` is exactly a non-positive integer, a pole of the family. */
export function isPole(x: Ball): boolean {
  return isExact(x) && isInteger(x.mid) && sign(x.mid) <= 0;
}

/**
 * The positive exact `x` as a fraction for the kernel's exact entries,
 * when it has one within the significand limit whose denominator is short
 * enough for the exact shift; `undefined` for an inexact `x` or a wide
 * one, which take the kernel at the working bits.
 */
function shortRational(
  x: Ball,
  context: NumberContext,
): { readonly num: bigint; readonly den: bigint } | undefined {
  if (!isExact(x) || sign(x.mid) <= 0) return undefined;
  const fraction = toRational(x.mid, context.significandLimitBits);
  if (!fraction.ok || bitLength(fraction.value.den) > EXACT_DENOMINATOR_BITS) {
    return undefined;
  }
  return fraction.value;
}

// ---------------------------------------------------------------------------
// digamma

/** `digamma(x)` at the context, as the header says. */
export function digammaBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(digammaBall(exact(x.mid), context));
  }
  if (isPole(x)) return AT_POLE;
  const side = position(x, ZERO);
  if (side === "above") return positiveDigamma(x, context);
  if (side === "below" && isTiny(x, context)) return tinyDigamma(x, context);
  // Reaching zero or below: inside one integer's cell, or at a pole.
  const floored = floorBall(x, context);
  if (!floored.ok) {
    return floored.error.kind === "unresolved" ? POLE : floored;
  }
  const fraction = subtractBalls(x, floored.value, context);
  if (!fraction.ok) return failed(fraction.error);
  const reflected = subtractBalls(exact(ONE), x, context);
  if (!reflected.ok) return failed(reflected.error);
  const psi = positiveDigamma(reflected.value, context);
  if (!psi.ok) return psi;
  const cot = piCotPi(fraction.value, context);
  if (!cot.ok) return cot;
  const result = subtractBalls(psi.value, cot.value, context);
  return result.ok ? result : failed(result.error);
}

/** `ψ(x)` for `x` positive throughout, as the header says. */
function positiveDigamma(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
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
  if (isTiny(x, context)) return tinyDigamma(x, context);
  const fraction = shortRational(x, context);
  if (fraction !== undefined) {
    const psi = digammaRational(fraction.num, fraction.den, bits, ceilingBits);
    return ok(fixedToBall(psi, digits));
  }
  const f = fixedFromBall(x, bits + extraBits(x.mid, context));
  // Only a ball wider than its value reaches zero at these bits.
  if (f.value - f.error <= 0n) return POLE;
  return ok(fixedToBall(digammaFixed(f, bits, ceilingBits), digits));
}

/** `ψ(x)` for `x` of either sign below `2^-significandLimitBits` throughout: `ψ(1) - 1 / x` within `2 |x|`. */
function tinyDigamma(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const bits = bitsFor(context.precision);
  const one = fixedToBall(
    digammaRational(1n, 1n, bits, bitsFor(context.ceiling)),
    workingDigits(context),
  );
  const psiOne: Ball = {
    mid: one.mid,
    rad: addRadius(one.rad, shiftRadius(magnitudeAbove(x), 1n)),
  };
  const reciprocal = divideBalls(exact(ONE), x);
  if (!reciprocal.ok) return failed(reciprocal.error);
  const result = subtractBalls(psiOne, reciprocal.value, context);
  return result.ok ? result : failed(result.error);
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
  if (!near.ok) return failed(near.error);
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

// ---------------------------------------------------------------------------
// lgamma and gamma

/** `ln |Γ(x)|` as a ball, and whether `Γ(x)` is negative. */
export type LogGamma = { readonly value: Ball; readonly negative: boolean };

/** `lgamma(x)` at the context, as the header says. */
export function lgammaBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(lgammaBall(exact(x.mid), context));
  }
  if (isPole(x)) return AT_POLE;
  if (isExact(x) && (equals(x.mid, ONE) || equals(x.mid, TWO))) {
    return ok(exact(ZERO));
  }
  const log = logGamma(
    x,
    context,
    bitsFor(context.precision),
    workingDigits(context),
  );
  return log.ok ? ok(log.value.value) : log;
}

/** `gamma(x)` at the context, as the header says. */
export function gammaBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(gammaBall(exact(x.mid), context));
  }
  if (isPole(x)) return AT_POLE;
  if (isExact(x) && isInteger(x.mid)) {
    // (x - 1)! where it fits the significand limit; otherwise the kernel's value.
    const n = toRational(x.mid, context.significandLimitBits);
    if (n.ok) {
      const factorial = factorialOf(n.value.num - 1n, context);
      if (factorial.ok) return ok(exact(fromInteger(factorial.value)));
    }
  }
  const bits = bitsFor(context.precision);
  const extra = magnitudeBits(x, GAMMA_CAP);
  const log = logGamma(
    x,
    context,
    bits + extra,
    workingDigits(context) + Math.ceil(extra / BITS_PER_DIGIT) + 1,
  );
  if (!log.ok) return log;
  const { value, negative } = log.value;
  switch (classifyExp(value, context)) {
    case "overflow":
      return err({ kind: "overflow" });
    case "underflow":
      return err({ kind: "underflow" });
    case "unresolved":
      return err({ kind: "unresolved", argument: 0, edge: "bound" });
    case "compute":
      break;
  }
  const result = floatingToBall(
    expFixed(fixedFromBall(value, bits + extra), bits),
    context,
  );
  if (!result.ok) return failed(result.error);
  return ok(negative ? negateBall(result.value) : result.value);
}

/** The bits of magnitude `gamma` asks for at most: past `2^64` its result passes the exponent bound whatever the bits. */
const GAMMA_CAP = 64;

/**
 * The bits `ln |Γ(x)|` has above the binary point, with a margin, for
 * the working bits a caller asks it at beyond its own: for `|x| < 2^(e +
 * 1)` with `e >= 0` it is below `2^(e + 1) (e + 1)`, and for `|x| <
 * 2^-e` near a pole or zero it is of the order of `e`; `cap` bounds the
 * count, at `GAMMA_CAP` for `gamma` and at the significand limit for `beta`,
 * whose logarithms cancel and which refuses what it cannot afford.
 */
export function magnitudeBits(x: Ball, cap: number): number {
  // A zero midpoint's ball reaches a pole, which logGamma reports.
  if (isZero(x.mid)) return GAMMA_MARGIN;
  const { int } = log2Bounds(x.mid).upper;
  const limit = BigInt(cap);
  const e = int >= 0n ? Number(int > limit ? limit : int) + 1 : 0;
  const size = int >= 0n ? e : bitLength(-int);
  return e + bitLength(BigInt(size)) + GAMMA_MARGIN;
}

/**
 * Whether `x` reaches a pole: `unresolved` at the edge `pole` when the
 * bounded `x` touches or reaches across a non-positive integer, the
 * floor's own refusal when it cannot be formed, and nothing otherwise;
 * what `logGamma` decides first, for a caller with several arguments to
 * ask before any logarithm is computed.
 */
export function reachesPole(
  x: Ball,
  context: NumberContext,
): Result<undefined, BuiltinError> {
  const side = position(x, ZERO);
  if (side === "above" || (side === "below" && isTiny(x, context))) {
    return ok(undefined);
  }
  const floored = floorBall(x, context);
  if (!floored.ok) {
    return floored.error.kind === "unresolved" ? POLE : floored;
  }
  return ok(undefined);
}

/**
 * `ln |Γ(x)|` with its sign at `bits` significant bits, the ball's
 * midpoint at `digits`, as the header says: the kernel for a positive
 * `x`, the expansion at zero for a tiny one of either sign, and the
 * reflection for a negative one inside an integer's cell.
 */
export function logGamma(
  x: Ball,
  context: NumberContext,
  bits: number,
  digits: number,
): Result<LogGamma, BuiltinError> {
  const side = position(x, ZERO);
  if (side === "above") {
    const value = positiveLogGamma(x, context, bits, digits);
    return value.ok ? ok({ value: value.value, negative: false }) : value;
  }
  if (side === "below" && isTiny(x, context)) {
    return ok({
      value: tinyLogGamma(x, context, bits, digits),
      negative: true,
    });
  }
  const floored = floorBall(x, context);
  if (!floored.ok) {
    return floored.error.kind === "unresolved" ? POLE : floored;
  }
  const floor = toRational(floored.value.mid, context.significandLimitBits);
  if (!floor.ok) throw new Error("A floor that was formed is within the limit");
  const negative = floor.value.num % 2n !== 0n;
  const fraction = subtractBalls(x, floored.value, context);
  if (!fraction.ok) return failed(fraction.error);
  const reflected = subtractBalls(exact(ONE), x, context);
  if (!reflected.ok) return failed(reflected.error);
  const psi = positiveLogGamma(reflected.value, context, bits, digits);
  if (!psi.ok) return psi;
  const sine = lnPiOverSinPi(fraction.value, context, bits, digits);
  if (!sine.ok) return sine;
  const value = subtractBalls(sine.value, psi.value, context);
  return value.ok ? ok({ value: value.value, negative }) : failed(value.error);
}

/** `ln Γ(x)` for `x` positive throughout, as the header says. */
function positiveLogGamma(
  x: Ball,
  context: NumberContext,
  bits: number,
  digits: number,
): Result<Ball, BuiltinError> {
  const ceilingBits = bitsFor(context.ceiling);
  if (isBeyond(x, bits)) {
    // x (ln x - 1) - ln(x) / 2 + ln(2π) / 2, within 1 / (12 x).
    const lnX = lnScaled(x, bits, ceilingBits);
    if (lnX === undefined)
      throw new Error("A value beyond 2^bits is not near zero");
    const ln = fixedToBall(lnX, digits);
    const lessOne = subtractBalls(ln, exact(ONE), context);
    if (!lessOne.ok) return failed(lessOne.error);
    const product = multiplyBalls(x, lessOne.value);
    if (!product.ok) return failed(product.error);
    const halfLn = multiplyBalls(ln, exact(HALF));
    if (!halfLn.ok) return failed(halfLn.error);
    const difference = subtractBalls(product.value, halfLn.value, context);
    if (!difference.ok) return failed(difference.error);
    const constant = fixedToBall(lnTwoPiHalfFixed(bits, ceilingBits), digits);
    const sum = addBalls(difference.value, constant, context);
    if (!sum.ok) return failed(sum.error);
    const slack = divideRadius(ONE_RADIUS, magnitudeBelow(x));
    return ok({ mid: sum.value.mid, rad: addRadius(sum.value.rad, slack) });
  }
  if (isTiny(x, context)) return ok(tinyLogGamma(x, context, bits, digits));
  const fraction = shortRational(x, context);
  if (fraction !== undefined) {
    const log = lgammaRational(fraction.num, fraction.den, bits, ceilingBits);
    return ok(fixedToBall(log, digits));
  }
  const f = fixedFromBall(x, bits + extraBits(x.mid, context));
  // Only a ball wider than its value reaches zero at these bits.
  if (f.value - f.error <= 0n) return POLE;
  return ok(fixedToBall(lgammaFixed(f, bits, ceilingBits), digits));
}

/** `ln |Γ(x)|` for `x` of either sign below `2^-significandLimitBits` throughout: `-ln |x|` within `|x|`. */
function tinyLogGamma(
  x: Ball,
  context: NumberContext,
  bits: number,
  digits: number,
): Ball {
  const magnitude: Ball = { mid: absolute(x.mid), rad: x.rad };
  const ln = lnScaled(magnitude, bits, bitsFor(context.ceiling));
  if (ln === undefined) throw new Error("A tiny value apart from zero");
  const ball = fixedToBall({ ...ln, value: -ln.value }, digits);
  return { mid: ball.mid, rad: addRadius(ball.rad, magnitudeAbove(x)) };
}

/**
 * `ln π - ln sin(π t)` for `t` in `(0, 1)`, as the header says: the
 * sine's ball reaching zero is a pole.
 */
function lnPiOverSinPi(
  t: Ball,
  context: NumberContext,
  bits: number,
  digits: number,
): Result<Ball, BuiltinError> {
  const ceilingBits = bitsFor(context.ceiling);
  // sin(π t) = sin(π (1 - t)): the half nearer zero keeps the sine's digits.
  const folded = position(t, HALF) === "above";
  const near = folded ? subtractBalls(exact(ONE), t, context) : ok(t);
  if (!near.ok) return failed(near.error);
  const working = bits + extraBits(near.value.mid, context);
  const ft = fixedFromBall(near.value, working);
  const pi = piFixed(working + 2, ceilingBits);
  const { sin } = sinCosFixed(multiplyFixed(pi, ft), working, ceilingBits);
  if (sin.value - sin.error <= 0n) return POLE;
  const lnSin = lnFixed(sin, working, ceilingBits);
  const result = subtractFixed(lnPiFixed(working, ceilingBits), lnSin);
  return ok(fixedToBall(keepSignificant(result, bits), digits));
}

export const digamma: Builtin = {
  name: "digamma",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => digammaBall(x!, context),
};

export const lgamma: Builtin = {
  name: "lgamma",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => lgammaBall(x!, context),
};

export const gamma: Builtin = {
  name: "gamma",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => gammaBall(x!, context),
};
