// `incbeta(a, b, x)`, the incomplete beta function `B(x; a, b) = ∫_0^x
// t^(a-1) (1 - t)^(b-1) dt`, and `incbetareg(a, b, x)`, the regularized
// `I_x(a, b) = B(x; a, b) / B(a, b)`, for `a, b > 0` and `0 <= x <= 1`,
// on the kernel's series (fixed-incbeta.ts). devdocs/design/special.md ("The
// incomplete beta function (6.7)") is the design and
// devdocs/history/calculator-plan.md (task 6.7) places them; the series with positive
// terms stands in for the design's continued fraction, whose elements
// have both signs and whose convergents therefore do not bracket, so that
// every result is certified (the PR of 6.7 has the ruling). The parameters
// come first, as the incomplete gamma functions take them. Each takes
// three plain numbers and gives one.
//
// The kernel gives the series' sum `Σ`, of order one or more, and the rest
// is one exponential in log space:
//
//   B(x; a, b) = e^(a ln x + b ln(1 - x) - ln a + ln Σ)
//   I_x(a, b) = e^(a ln x + b ln(1 - x) - ln a - ln Γ(a) - ln Γ(b) + ln Γ(a + b) + ln Σ)
//
// with the logarithm formed on balls at the working bits plus the bits of
// the parameters' magnitudes (`magnitudeBits`, as `beta` takes them),
// since its terms cancel, and `expBall`'s classifier on the whole (D18),
// so `incbetareg(2, 3, 1e-20)` is `6e-40` and a result past the bottom of
// the bound is `underflow`. The symmetry `I_x(a, b) = 1 - I_(1-x)(b, a)`
// chooses the orientation: the series takes about `bits ln 2 / ln(1 / x)`
// terms after any growth while the ratio is above one, so the cheaper of
// the two by estimated terms runs, with the complement taken from it,
// except where the complement would lose half the working bits to
// cancellation, the computed value being near one; the estimate of the
// loss comes from the prefactor of the value wanted. Past the term limit
// in both orientations, large parameters near the median (`incbetareg(1e6,
// 1e6, 0.5)` at the ceiling), the call is `tooLarge`, the regime issue
// #107 names for the incomplete gamma functions. Where the orientation
// computed passes the bottom of the bound, the value wanted is its whole,
// one or `B(a, b)`, within `10^-(10^18)`.
//
// Exact cases: `x = 0` gives `0`, `x = 1` gives `B(a, b)` (`beta`'s, exact
// for whole numbers) and `1`; whole numbers `a` and `b` with a rational `x`
// make `I_x(a, b)` the polynomial `Σ binomial(a + b - 1, j) x^j (1 -
// x)^(a + b - 1 - j)` over `j` from `a` to `a + b - 1`, exact where its
// terms fit the significand limit, and `B(x; a, b)` that times `B(a, b)`. A parameter
// at or below zero and an argument outside `[0, 1]` are `domain` errors
// (`notPositive`, `outsideZeroOne`); balls at those edges are `unresolved`
// at the edge; a ball of the argument wide or touching an end is taken at
// its two ends and the results hulled, the function rising with `x`
// (`hullOfEnds`). An argument of unbounded radius gives the function at
// its midpoint with an unbounded radius.

import {
  addBalls,
  exact,
  isExact,
  lnScaled,
  multiplyBalls,
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
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
  UNKNOWN_NEED,
} from "../builtin.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import { incbetaSeriesFixed, incbetaTermCount } from "../fixed-incbeta.ts";
import { bitsFor, fixedFromBall, fixedToBall } from "../fixed.ts";
import {
  addRadius,
  compareRadius,
  powerOfTenRadius,
  radiusAboveScaled,
  shiftRadius,
} from "../radius.ts";
import {
  bitLength,
  multiply as multiplyRationals,
  rational,
  type Rational,
} from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import {
  BITS_PER_DIGIT,
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  fromRational,
  isInteger,
  log2Bounds,
  sign,
  subtract,
  toRational,
} from "../scaled.ts";
import { betaBall } from "./beta.ts";
import { expBall } from "./exp.ts";
import { logGamma, magnitudeBits } from "./gamma.ts";
import { binomialOf } from "./integers.ts";

/** The most terms the series is given. */
const SERIES_LIMIT = 50_000;

/** The largest `a + b - 1` the exact polynomial is formed for: its terms number `b`, each a product of integers of up to the significand limit. */
const POLYNOMIAL_LIMIT = 10_000;

/** The radius of a whole whose other part passed the bottom of the bound: `10^-(10^18)`. */
const PAST_BOTTOM = powerOfTenRadius(-MAX_EXPONENT);

/** A rough double of a ball's midpoint, for the choice of an orientation; `Infinity` past a double's range. */
function roughly(x: Ball): number {
  if (sign(x.mid) === 0) return 0;
  const { int, frac } = log2Bounds(x.mid).upper;
  const magnitude = 2 ** (Number(int) + frac);
  return sign(x.mid) < 0 ? -magnitude : magnitude;
}

/** A ball operation's failure as the built-in's, blamed on `argument`. */
function failed(
  error: BallError,
  argument: number,
): Result<never, BuiltinError> {
  return err(fromBallError(error, argument));
}

/** `result`'s failure, when it names an argument, blamed on `argument` instead. */
function blamed<T>(
  result: Result<T, BuiltinError>,
  argument: number,
): Result<T, BuiltinError> {
  if (result.ok || !("argument" in result.error)) return result;
  return err({ ...result.error, argument });
}

/** The index, 0 or 1, of the wider of the two parameters. */
function wider(a: Ball, b: Ball): 0 | 1 {
  return compareRadius(a.rad, b.rad) >= 0 ? 0 : 1;
}

/** Whether `x`'s radius is above `2^-16` of its magnitude. */
function wide(x: Ball): boolean {
  if (sign(x.mid) === 0) return true;
  return (
    compareRadius(
      x.rad,
      shiftRadius(radiusAboveScaled(absolute(x.mid)), -16n),
    ) > 0
  );
}

/** The incomplete beta function, regularized or not, at the context, as the header says. */
function incompleteBeta(
  a: Ball,
  b: Ball,
  x: Ball,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (
    a.rad.kind === "unbounded" ||
    b.rad.kind === "unbounded" ||
    x.rad.kind === "unbounded"
  ) {
    const point = (v: Ball) => (v.rad.kind === "unbounded" ? exact(v.mid) : v);
    return unboundedOf(
      incompleteBeta(point(a), point(b), point(x), regularized, context),
    );
  }
  for (const [p, index] of [
    [a, 0],
    [b, 1],
  ] as const) {
    if (isExact(p) && sign(p.mid) <= 0) {
      return err({ kind: "domain", argument: index, reason: "notPositive" });
    }
    if (position(p, ZERO) !== "above") {
      return err({ kind: "unresolved", argument: index, edge: ZERO });
    }
  }
  if (isExact(x)) {
    if (sign(x.mid) < 0 || compare(x.mid, ONE) > 0) {
      return err({ kind: "domain", argument: 2, reason: "outsideZeroOne" });
    }
    if (sign(x.mid) === 0) return ok(exact(ZERO));
    if (compare(x.mid, ONE) === 0) {
      return regularized ? ok(exact(ONE)) : betaBall(a, b, context);
    }
  } else {
    const atZero = position(x, ZERO);
    const atOne = position(x, ONE);
    if (atZero === "below" || atOne === "above") {
      return err({ kind: "domain", argument: 2, reason: "outsideZeroOne" });
    }
    if (atZero !== "above" || atOne !== "below" || wide(x)) {
      return atEnds(a, b, x, regularized, context);
    }
  }
  const polynomial = exactPolynomial(a, b, x, regularized, context);
  if (polynomial !== undefined) return polynomial;
  const bits = bitsFor(context.precision);
  const extra =
    magnitudeBits(a, context.significandLimitBits) +
    magnitudeBits(b, context.significandLimitBits);
  if (bits + extra > context.significandLimitBits) {
    return tooLarge("exceeds", { kind: "exact", bits: bits + extra });
  }
  const working = bits + extra;
  const digits = workingDigits(context) + Math.ceil(extra / BITS_PER_DIGIT) + 1;
  // The complement of x, and the two orientations.
  const complement = complementOf(x, context);
  if (!complement.ok) return complement;
  const direct: Orientation = { a, b, x, other: complement.value };
  const swapped: Orientation = { a: b, b: a, x: complement.value, other: x };
  const choice = chooseOrientation(direct, swapped, working);
  if (choice === undefined) return tooLarge("exceeds", UNKNOWN_NEED);
  const { orientation, swap } = choice;
  const value = valueOf(orientation, regularized, working, digits, context);
  if (!swap) return value;
  // The complement: the whole, one or B(a, b), less the value computed.
  const whole = regularized ? ok(exact(ONE)) : betaBall(a, b, context);
  if (!whole.ok) return whole;
  if (!value.ok) {
    return value.error.kind === "underflow"
      ? ok({ mid: whole.value.mid, rad: PAST_BOTTOM })
      : value;
  }
  const result = subtractBalls(whole.value, value.value, context);
  return result.ok ? result : failed(result.error, 2);
}

/** `1 - x` as a ball: exactly where it aligns within the significand limit, and otherwise one within the magnitude of a tiny `x`. */
function complementOf(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const difference = subtractBalls(exact(ONE), x, context);
  if (difference.ok) return difference;
  if (difference.error.kind !== "tooLarge") return failed(difference.error, 2);
  return ok({ mid: ONE, rad: addRadius(x.rad, radiusAboveScaled(x.mid)) });
}

/** One orientation of the symmetry: the parameters, the argument, and its complement. */
type Orientation = {
  readonly a: Ball;
  readonly b: Ball;
  readonly x: Ball;
  readonly other: Ball;
};

/** `ln Γ(s)` in doubles, by Stirling above eight and the recurrence below, for an estimate. */
function roughLnGamma(s: number): number {
  let shift = 0;
  let t = s;
  while (t < 8) {
    shift -= Math.log(t);
    t += 1;
  }
  return (
    shift +
    (t - 0.5) * Math.log(t) -
    t +
    0.5 * Math.log(2 * Math.PI) +
    1 / (12 * t)
  );
}

/** The logarithm of the regularized value's prefactor in doubles, a lower bound on `ln I` since the series' sum is at least one. */
function roughLogPrefactor(o: Orientation): number {
  const av = roughly(o.a);
  const bv = roughly(o.b);
  const xv = roughly(o.x);
  const yv = roughly(o.other);
  if (![av, bv, xv, yv].every(Number.isFinite) || xv <= 0 || yv <= 0) {
    return -Infinity;
  }
  return (
    av * Math.log(xv) +
    bv * Math.log(yv) -
    Math.log(av) -
    (roughLnGamma(av) + roughLnGamma(bv) - roughLnGamma(av + bv))
  );
}

/**
 * The orientation to compute, by the series' estimated terms: the
 * cheaper, except that the swapped one, whose value is the complement,
 * loses about `-log2 I` bits to cancellation where the value wanted is
 * tiny, so it is not chosen where that would be half the working bits;
 * `undefined` where neither is within the limit.
 */
function chooseOrientation(
  direct: Orientation,
  swapped: Orientation,
  working: number,
): { orientation: Orientation; swap: boolean } | undefined {
  const count = (o: Orientation) =>
    incbetaTermCount(
      fixedFromBall(o.a, working),
      fixedFromBall(o.b, working),
      fixedFromBall(o.x, working),
      working,
      SERIES_LIMIT,
    );
  const directTerms = count(direct);
  const swappedTerms = count(swapped);
  const directOk = directTerms <= SERIES_LIMIT;
  const swappedOk = swappedTerms <= SERIES_LIMIT;
  const lost = Math.max(0, -roughLogPrefactor(direct) * Math.LOG2E);
  const swapPreferred =
    swappedOk &&
    lost < working / 2 &&
    (swappedTerms < directTerms || !directOk);
  if (swapPreferred) return { orientation: swapped, swap: true };
  if (directOk) return { orientation: direct, swap: false };
  if (swappedOk) return { orientation: swapped, swap: true };
  return undefined;
}

/** The function of `o`, regularized or not, by the series and the exponential, as the header says. */
function valueOf(
  o: Orientation,
  regularized: boolean,
  working: number,
  digits: number,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const ceilingBits = bitsFor(context.ceiling);
  const sum = incbetaSeriesFixed(
    fixedFromBall(o.a, working),
    fixedFromBall(o.b, working),
    fixedFromBall(o.x, working),
    working,
    SERIES_LIMIT,
  );
  // No bound on the sum within the limit: the intervals, wide at this
  // precision, put the bounding ratio at one, so the pipeline retries
  // narrower.
  if (sum === undefined) {
    return err({ kind: "unresolved", argument: 2, edge: ONE });
  }
  // a ln x + b ln(1 - x) - ln a + ln Σ, and the three ln Γ regularized.
  const log = (v: Ball, index: number): Result<Ball, BuiltinError> => {
    const f = lnScaled(v, working, ceilingBits);
    return f === undefined
      ? err({ kind: "unresolved", argument: index, edge: ZERO })
      : ok(fixedToBall(f, digits));
  };
  const lnX = log(o.x, 2);
  if (!lnX.ok) return lnX;
  const lnOther = log(o.other, 2);
  if (!lnOther.ok) return lnOther;
  const lnA = log(o.a, 0);
  if (!lnA.ok) return lnA;
  const lnSum = log(fixedToBall(sum, digits), 2);
  if (!lnSum.ok) return lnSum;
  const aLnX = multiplyBallsSafe(o.a, lnX.value, context);
  if (!aLnX.ok) return aLnX;
  const bLnOther = multiplyBallsSafe(o.b, lnOther.value, context);
  if (!bLnOther.ok) return bLnOther;
  const sumXY = addBalls(aLnX.value, bLnOther.value, context);
  if (!sumXY.ok) return failed(sumXY.error, 2);
  const lessA = subtractBalls(sumXY.value, lnA.value, context);
  if (!lessA.ok) return failed(lessA.error, 0);
  const withSum = addBalls(lessA.value, lnSum.value, context);
  if (!withSum.ok) return failed(withSum.error, 2);
  let L: Ball = withSum.value;
  if (regularized) {
    const sumAB = sumOf(o.a, o.b, context);
    if (!sumAB.ok) return sumAB;
    const parts: [Ball, number, boolean][] = [
      [o.a, 0, true],
      [o.b, 1, true],
      [sumAB.value, wider(o.a, o.b), false],
    ];
    for (const [p, index, subtracted] of parts) {
      const g = blamed(logGamma(p, context, working, digits), index);
      if (!g.ok) return g;
      const next = subtracted
        ? subtractBalls(L, g.value.value, context)
        : addBalls(L, g.value.value, context);
      if (!next.ok) return failed(next.error, index);
      L = next.value;
    }
  }
  // The exponential at the working digits, so that a complement keeps
  // the digits below one.
  const raised: NumberContext = { ...context, precision: digits };
  return blamed(expBall(L, raised), 2);
}

/** `p × l` as balls, a tiny product past the bottom being zero within the bound's edge. */
function multiplyBallsSafe(
  p: Ball,
  l: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const r = multiplyBalls(p, l, context);
  if (r.ok) return r;
  if (r.error.kind === "underflow") return ok({ mid: ZERO, rad: PAST_BOTTOM });
  return failed(r.error, 0);
}

/** `a + b` as a ball: exactly where the operands align within the significand limit, and otherwise the larger within the smaller's magnitude. */
function sumOf(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const sum = addBalls(a, b, context);
  if (sum.ok) return sum;
  if (sum.error.kind !== "tooLarge") return failed(sum.error, wider(a, b));
  const [larger, smaller] =
    compare(absolute(a.mid), absolute(b.mid)) >= 0 ? [a, b] : [b, a];
  return ok({
    mid: larger.mid,
    rad: addRadius(larger.rad, radiusAboveScaled(absolute(smaller.mid))),
  });
}

/**
 * The exact case: whole numbers `a` and `b` and a rational `x = p / q`,
 * where `I_x(a, b)` is the polynomial of the header, every term of which
 * has the denominator `q^(a + b - 1)`, so the sum is one integer over
 * that power, reduced once; `B(x; a, b)` is it times `B(a, b)`.
 * `undefined` when the arguments are not that or the power does not fit
 * the significand limit, for the kernel.
 */
function exactPolynomial(
  a: Ball,
  b: Ball,
  x: Ball,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> | undefined {
  if (!isExact(a) || !isExact(b) || !isExact(x)) return undefined;
  if (!isInteger(a.mid) || !isInteger(b.mid)) return undefined;
  const m = toRational(a.mid, context.significandLimitBits);
  const n = toRational(b.mid, context.significandLimitBits);
  const r = toRational(x.mid, context.significandLimitBits);
  if (!m.ok || !n.ok || !r.ok) return undefined;
  const top = m.value.num + n.value.num - 1n;
  if (top > BigInt(POLYNOMIAL_LIMIT)) return undefined;
  const p = r.value.num;
  const q = r.value.den;
  if (Number(top) * bitLength(q) > context.significandLimitBits)
    return undefined;
  // Σ binomial(top, j) p^j (q - p)^(top - j) over j from a to top, with
  // the powers stepped from the ends.
  const first = binomialOf(top, m.value.num, context);
  if (!first.ok) return undefined;
  let numerator = 0n;
  let choose = first.value;
  let pPower = p ** m.value.num;
  let qPower = (q - p) ** (top - m.value.num);
  for (let j = m.value.num; j <= top; j++) {
    numerator += choose * pPower * qPower;
    if (j < top) {
      // binomial(top, j + 1) = binomial(top, j) (top - j) / (j + 1), exactly.
      choose = (choose * (top - j)) / (j + 1n);
      pPower *= p;
      qPower /= q - p;
    }
  }
  let total: Rational = rational(numerator, q ** top);
  if (!regularized) {
    const whole = betaBall(a, b, context);
    if (!whole.ok || !isExact(whole.value)) return undefined;
    const w = toRational(whole.value.mid, context.significandLimitBits);
    if (!w.ok) return undefined;
    total = multiplyRationals(total, w.value);
  }
  if (
    bitLength(total.num) + bitLength(total.den) >
    context.significandLimitBits
  ) {
    return undefined;
  }
  return ok(exact(fromRational(total)));
}

/** The function over a wide argument, from its two ends exactly, the results hulled (`hullOfEnds`), the function rising with `x`. */
function atEnds(
  a: Ball,
  b: Ball,
  x: Ball,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const r = radiusValue(x.rad);
  if (r === undefined) throw new Error("A bounded radius has a value");
  const lo = subtract(x.mid, r, context.significandLimitBits);
  const hi = add(x.mid, r, context.significandLimitBits);
  if (!lo.ok || !hi.ok) return tooLarge("exceeds", UNKNOWN_NEED);
  // Clamped to the domain: the ends outside it were refused above.
  const low = sign(lo.value) < 0 ? ZERO : lo.value;
  const high = compare(hi.value, ONE) > 0 ? ONE : hi.value;
  return hullOfEnds(
    incompleteBeta(a, b, exact(low), regularized, context),
    incompleteBeta(a, b, exact(high), regularized, context),
    2,
  );
}

function builtin(name: string, regularized: boolean): Builtin {
  return {
    name,
    arity: { min: 3, max: 3 },
    dimensions: plainNumbers(3),
    apply: ([a, b, x], context) =>
      incompleteBeta(a!, b!, x!, regularized, context),
  };
}

export const incbeta = builtin("incbeta", false);
export const incbetareg = builtin("incbetareg", true);

/** The incomplete beta function at the context, for the tests. */
export function incbetaBall(
  a: Ball,
  b: Ball,
  x: Ball,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return incompleteBeta(a, b, x, regularized, context);
}

/**
 * Whether the triple is within the series' limit in either orientation
 * at the context, as `incompleteBeta` decides it after its exact cases
 * and the ends of a wide argument; for the sweep's rule.
 */
export function withinLimits(
  a: Ball,
  b: Ball,
  x: Ball,
  context: NumberContext,
): boolean {
  const bits = bitsFor(context.precision);
  const extra =
    magnitudeBits(a, context.significandLimitBits) +
    magnitudeBits(b, context.significandLimitBits);
  if (bits + extra > context.significandLimitBits) return false;
  const working = bits + extra;
  const complement = complementOf(x, context);
  if (!complement.ok) return false;
  return (
    chooseOrientation(
      { a, b, x, other: complement.value },
      { a: b, b: a, x: complement.value, other: x },
      working,
    ) !== undefined
  );
}
