// The incomplete gamma functions: `lowergamma(s, x)` and `uppergamma(s,
// x)`, the unregularized `γ(s, x)` and `Γ(s, x)`, and `lowergammareg`
// and `uppergammareg`, the regularized `P(s, x)` and `Q(s, x)`, on the
// kernel's series and continued fraction (fixed-incomplete.ts).
// devdocs/builtins.md ("The Gamma and Beta families") is the design. Each
// takes two
// plain numbers, the order `s` positive and the argument `x` at or
// above zero, and gives a plain number.
//
// The kernel gives a factor of order one, the series' sum `Σ` or the
// fraction's `h`, and the rest is an exponential in log space:
//
//   γ(s, x) = e^(s ln x - x - ln s) Σ      P(s, x) = e^(s ln x - x - ln Γ(s + 1)) Σ
//   Γ(s, x) = e^(s ln x - x) h            Q(s, x) = e^(s ln x - x - ln Γ(s)) h
//
// where the logarithm `L` is formed on balls at the working bits plus
// the bits of its own magnitude (`magnitudeBits` of `s` and `x`, as
// `beta` takes them), so that its absolute error, the result's relative
// error, stays below the working ulp, and `expBall` applies the
// classifier of ball.ts to it (devdocs/numbers.md, "The exponent bound"):
// `lowergamma(1e400, 2)` is
// `overflow` and `uppergamma(2, 1e400)` is `underflow`. The other form of
// the pair is the complement, `Γ(s) - γ(s, x)` or `1 - P`, taken from
// the one computed, so only one series or fraction runs; where the one
// computed passes the bottom of the bound its complement is `Γ(s)` or
// one within `10^-(10^18)`, the bound's own edge.
//
// Which one runs is a choice by cost, mpmath's region rule refined: the
// series takes about `x - s` terms to its largest and then as many as
// the bits need, and its complement `Γ(s, x)` loses about `log2(Γ(s) /
// Γ(s, x))` bits to cancellation where `x` is past the order; the
// fraction takes about `(bits ln 2)^2 / (7 x)` convergents, each a few
// times a term's cost, fast for a large `x`, and brackets its value only
// at an order in `(0, 1]`, which costs an order above one a step a unit
// (`upperReducedFixed`). The cheaper by its estimated operations runs,
// except that the upper form takes the fraction where the series'
// complement would lose half the working bits and the pass would not
// certify (`routeOf`). Past both limits, a large order near a large
// argument, the regime of the uniform asymptotic expansions, which are
// not in this design, the call is `tooLarge` rather than a value with
// digits nothing certifies: an earlier fallback of an unbounded radius
// was for the fraction's bound being unwritten, and the bound is
// written.
//
// Exact cases: `x = 0` gives `0` for the lower forms, `Γ(s)` for
// `uppergamma` and `1` for `uppergammareg`; `s = 1` gives `1 - e^-x` and
// `e^-x`, whether regularized or not, since `Γ(1)` is one. A ball of the
// order reaching zero or below, or of the argument reaching below zero,
// is `unresolved` at zero (so is one touching zero from above, whose
// logarithm the exponential needs); an exact order at or below zero and
// an exact negative argument are `domain` errors. An argument of
// unbounded radius gives the function at its midpoint with an unbounded
// radius. An argument whose radius is above `2^-16` of its magnitude is
// taken at its two ends, exactly, and the results hulled, each form
// being monotone in `x` for a fixed order: the kernel's interval
// arithmetic keeps nothing over such a width (the fraction's
// denominators reach zero), where the ends are two cheap calls.

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
import {
  lowerSeriesFixed,
  seriesTermCount,
  upperFractionFixed,
  upperReducedFixed,
} from "../fixed-incomplete.ts";
import { bitsFor, fixedFromBall, fixedToBall, type Fixed } from "../fixed.ts";
import {
  addRadius,
  compareRadius,
  powerOfTenRadius,
  radiusAboveScaled,
  shiftRadius,
} from "../radius.ts";
import { err, ok, type Result } from "../result.ts";
import {
  BITS_PER_DIGIT,
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  add,
  equals,
  isZero,
  log2Bounds,
  negate,
  sign,
  subtract,
} from "../scaled.ts";
import { expBall } from "./exp.ts";
import { gammaBall, logGamma, magnitudeBits } from "./gamma.ts";

/** The most terms the series is given: about `sqrt(2 s bits ln 2)` where `x` is near a large `s`, so `s` up to a few million at forty digits. */
const SERIES_LIMIT = 50_000;

/** The most convergents the fraction is given. */
const FRACTION_LIMIT = 20_000;

/** The most steps an order is reduced by. */
const REDUCTION_LIMIT = 20_000;

/** The fraction's measured cost: its convergents number about `(bits ln 2)^2 / (FRACTION_RATE x)`. */
const FRACTION_RATE = 7;

/** The radius of a complement whose other form passed the bottom of the bound: `10^-(10^18)`. */
const PAST_BOTTOM = powerOfTenRadius(-MAX_EXPONENT);

type Form = "lower" | "upper";

/** A rough double of a ball's midpoint, for the choice of a route; `Infinity` past a double's range. */
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

/** The index of the argument of the wider radius. */
function wider(s: Ball, x: Ball): 0 | 1 {
  return compareRadius(s.rad, x.rad) >= 0 ? 0 : 1;
}

/** The incomplete gamma function of `form`, regularized or not, at the context, as the header says. */
function incompleteGamma(
  s: Ball,
  x: Ball,
  form: Form,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (s.rad.kind === "unbounded" || x.rad.kind === "unbounded") {
    return unboundedOf(
      incompleteGamma(
        s.rad.kind === "unbounded" ? exact(s.mid) : s,
        x.rad.kind === "unbounded" ? exact(x.mid) : x,
        form,
        regularized,
        context,
      ),
    );
  }
  if (isExact(s) && sign(s.mid) <= 0) {
    return err({ kind: "domain", argument: 0, reason: "notPositive" });
  }
  if (position(s, ZERO) !== "above") {
    return err({ kind: "unresolved", argument: 0, edge: ZERO });
  }
  if (isExact(x)) {
    if (sign(x.mid) < 0) {
      return err({ kind: "domain", argument: 1, reason: "negative" });
    }
    if (sign(x.mid) === 0) {
      if (form === "lower") return ok(exact(ZERO));
      return regularized ? ok(exact(ONE)) : gammaBall(s, context);
    }
  } else if (position(x, ZERO) !== "above") {
    return err({ kind: "unresolved", argument: 1, edge: ZERO });
  }
  if (isExact(s) && equals(s.mid, ONE)) {
    // s = 1: e^-x and its complement.
    const upper = blamed(
      expBall({ mid: negate(x.mid), rad: x.rad }, context),
      1,
    );
    if (form === "upper") return upper;
    return complementOf(s, upper, true, context);
  }
  if (wide(x)) return atEnds(s, x, form, regularized, context);
  const bits = bitsFor(context.precision);
  const limit = context.significandLimitBits;
  const extra = magnitudeBits(s, limit) + magnitudeBits(x, limit);
  if (bits + extra > limit) {
    // The working bits are the need, exact when neither magnitude was
    // capped at the limit, and unknown past the cap, which only bounds
    // the count from below.
    return tooLarge(
      "exceeds",
      capped(s, limit) || capped(x, limit)
        ? UNKNOWN_NEED
        : { kind: "exact", bits: bits + extra },
    );
  }
  const working = bits + extra;
  const digits = workingDigits(context) + Math.ceil(extra / BITS_PER_DIGIT) + 1;
  const ceilingBits = bitsFor(context.ceiling);
  // The logarithm's common part, s ln x - x, on balls.
  const lnX = lnScaled(x, working, ceilingBits);
  if (lnX === undefined) {
    return err({ kind: "unresolved", argument: 1, edge: ZERO });
  }
  const product = multiplyBalls(s, fixedToBall(lnX, digits), context);
  // A tiny order's s ln x may pass the bottom of the bound: it is then
  // zero within the bound's edge, which the sum absorbs.
  const sLnX: Result<Ball, BuiltinError> =
    !product.ok && product.error.kind === "underflow"
      ? ok({ mid: ZERO, rad: PAST_BOTTOM })
      : product.ok
        ? product
        : failed(product.error, wider(s, x));
  if (!sLnX.ok) return sLnX;
  const common = subtractBalls(sLnX.value, x, context);
  if (!common.ok) return failed(common.error, wider(s, x));
  const sf = fixedFromBall(s, working);
  const xf = fixedFromBall(x, working);
  const { route, steps } = routeOf(form, s, x, sf, xf, working);
  // Neither within its limit, a large order near a large argument: not
  // computed, rather than shown with digits nothing certifies.
  if (route === undefined) return tooLarge("exceeds", UNKNOWN_NEED);
  const arguments_ = { s, x, common: common.value, working, digits, context };
  if (route === "series") {
    const sum = fixedToBall(
      lowerSeriesFixed(sf, xf, working, SERIES_LIMIT),
      digits,
    );
    const lower = lowerOf(arguments_, sum, regularized);
    if (form === "lower") return lower;
    return complementOf(s, lower, regularized, context);
  }
  const h = fixedToBall(
    steps === 0
      ? upperFractionFixed(sf, xf, working, FRACTION_LIMIT).value
      : upperReducedFixed(sf, xf, steps, working, FRACTION_LIMIT),
    digits,
  );
  const upper = upperOf(arguments_, h, regularized);
  if (form === "upper") return upper;
  return complementOf(s, upper, regularized, context);
}

/** Whether `x`'s radius is above `2^-16` of its magnitude, too wide for the kernel's interval arithmetic to keep anything. */
function wide(x: Ball): boolean {
  if (sign(x.mid) === 0) return true;
  return (
    compareRadius(
      x.rad,
      shiftRadius(radiusAboveScaled(absolute(x.mid)), -16n),
    ) > 0
  );
}

/**
 * The function over a wide `x` from its two ends, exactly, since each
 * form is monotone in `x` for a fixed order: the hull of the two
 * results, as the header says, with a refusal at one end and a value at
 * the other `unresolved` at the bound, or the hull with zero where the
 * refusal is past the bottom.
 */
function atEnds(
  s: Ball,
  x: Ball,
  form: Form,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const r = radiusValue(x.rad);
  if (r === undefined) throw new Error("A bounded radius has a value");
  const lo = subtract(x.mid, r, context.significandLimitBits);
  const hi = add(x.mid, r, context.significandLimitBits);
  if (!lo.ok || !hi.ok) return tooLarge("exceeds", UNKNOWN_NEED);
  const atLo = incompleteGamma(s, exact(lo.value), form, regularized, context);
  const atHi = incompleteGamma(s, exact(hi.value), form, regularized, context);
  return hullOfEnds(atLo, atHi, 1);
}

/** The operations a series term and a fraction convergent cost, and a reduction step, relative to each other, for the choice of a route. */
const SERIES_TERM_COST = 3;
const FRACTION_TERM_COST = 12;
const REDUCTION_STEP_COST = 2;

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

/**
 * Which route computes the pair for `form`, with the steps the
 * fraction's order is reduced by; `undefined` when neither is within
 * its limit. The cheaper of the two by their estimated operations,
 * except that the upper form by the series is the complement `Γ(s) -
 * γ(s, x)`, which loses about `log2(Γ(s) / Γ(s, x))` bits to
 * cancellation, so the fraction is preferred where that would lose
 * half the working bits and the pass would not certify.
 */
function routeOf(
  form: Form,
  s: Ball,
  x: Ball,
  sf: Fixed,
  xf: Fixed,
  working: number,
): { route: "series" | "fraction" | undefined; steps: number } {
  const sv = roughly(s);
  const xv = roughly(x);
  const seriesTerms = seriesTermCount(sf, xf, working, SERIES_LIMIT);
  const fractionTerms = (working * Math.LN2) ** 2 / (FRACTION_RATE * xv);
  const steps = Math.max(0, Math.ceil(sv) - 1);
  const fraction =
    xf.value - xf.error > 0n &&
    fractionTerms <= FRACTION_LIMIT &&
    steps <= REDUCTION_LIMIT;
  const series = seriesTerms <= SERIES_LIMIT;
  const seriesCost = series ? seriesTerms * SERIES_TERM_COST : Infinity;
  const fractionCost = fraction
    ? fractionTerms * FRACTION_TERM_COST + steps * REDUCTION_STEP_COST
    : Infinity;
  // The bits the upper form loses by the series' complement, where x is
  // past the order: ln Γ(s) - ln Γ(s, x) ≈ ln Γ(s) + x - (s - 1) ln x.
  const lost =
    form === "upper" && Number.isFinite(sv) && Number.isFinite(xv) && xv > sv
      ? (roughLnGamma(sv) + xv - (sv - 1) * Math.log(xv)) * Math.LOG2E
      : 0;
  const seriesPreferred =
    series && lost < working / 2 && (seriesCost <= fractionCost || !fraction);
  const route = seriesPreferred
    ? "series"
    : fraction
      ? "fraction"
      : series
        ? "series"
        : undefined;
  return { route, steps };
}

/**
 * Whether the pair at `s` and `x` is within the routes' limits at the
 * context, as `incompleteGamma` decides it after its exact cases and
 * the ends of a wide argument; for the sweep's rule.
 */
export function withinLimits(
  s: Ball,
  x: Ball,
  context: NumberContext,
): boolean {
  const bits = bitsFor(context.precision);
  const extra =
    magnitudeBits(s, context.significandLimitBits) +
    magnitudeBits(x, context.significandLimitBits);
  if (bits + extra > context.significandLimitBits) return false;
  const working = bits + extra;
  const sf = fixedFromBall(s, working);
  const xf = fixedFromBall(x, working);
  return routeOf("lower", s, x, sf, xf, working).route !== undefined;
}

/** Whether `magnitudeBits(b, limit)` counted `b`'s magnitude at its cap rather than from `b`: a midpoint of more than `limit` bits above the binary point. */
function capped(b: Ball, limit: number): boolean {
  return !isZero(b.mid) && log2Bounds(b.mid).upper.int > BigInt(limit);
}

type Arguments = {
  readonly s: Ball;
  readonly x: Ball;
  /** `s ln x - x`. */
  readonly common: Ball;
  readonly working: number;
  readonly digits: number;
  readonly context: NumberContext;
};

/** `e^(common - ln s) Σ`, or `e^(common - ln Γ(s + 1)) Σ` regularized. */
function lowerOf(
  a: Arguments,
  sum: Ball,
  regularized: boolean,
): Result<Ball, BuiltinError> {
  const { s, context } = a;
  let subtrahend: Ball;
  if (regularized) {
    const sum = subtractBalls(s, exact(negate(ONE)), context);
    // A tiny order's s + 1 does not align within the significand limit: one within s.
    const next: Result<Ball, BuiltinError> =
      !sum.ok && sum.error.kind === "tooLarge"
        ? ok({ mid: ONE, rad: addRadius(s.rad, radiusAboveScaled(s.mid)) })
        : sum.ok
          ? sum
          : failed(sum.error, 0);
    if (!next.ok) return next;
    const log = logGamma(next.value, context, a.working, a.digits);
    if (!log.ok) return log;
    subtrahend = log.value.value;
  } else {
    const lnS = lnScaled(s, a.working, bitsFor(context.ceiling));
    if (lnS === undefined) {
      return err({ kind: "unresolved", argument: 0, edge: ZERO });
    }
    subtrahend = fixedToBall(lnS, a.digits);
  }
  return scaled(a, subtrahend, sum);
}

/** `e^common h`, or `e^(common - ln Γ(s)) h` regularized. */
function upperOf(
  a: Arguments,
  h: Ball,
  regularized: boolean,
): Result<Ball, BuiltinError> {
  if (!regularized) return scaled(a, undefined, h);
  const log = logGamma(a.s, a.context, a.working, a.digits);
  if (!log.ok) return log;
  return scaled(a, log.value.value, h);
}

/**
 * `e^(common - subtrahend + ln factor)`, the exponential through the
 * classifier with the factor's logarithm folded in, so that the verdict
 * covers the whole value: the factor is positive throughout, the sum
 * being at least one and the fraction a bracket of a positive value.
 */
function scaled(
  a: Arguments,
  subtrahend: Ball | undefined,
  factor: Ball,
): Result<Ball, BuiltinError> {
  const { s, x, context } = a;
  const blame = wider(s, x);
  const lnFactor = lnScaled(factor, a.working, bitsFor(context.ceiling));
  if (lnFactor === undefined) {
    // The factor is positive, but its interval reaches zero: a wide
    // order's error through the terms, which narrowing resolves.
    return err({ kind: "unresolved", argument: blame, edge: ZERO });
  }
  let L = a.common;
  if (subtrahend !== undefined) {
    const difference = subtractBalls(L, subtrahend, context);
    if (!difference.ok) return failed(difference.error, blame);
    L = difference.value;
  }
  const whole = addBalls(L, fixedToBall(lnFactor, a.digits), context);
  if (!whole.ok) return failed(whole.error, blame);
  // The exponential at the working digits, not the context's, so that
  // the complement of a value near one keeps the digits below it:
  // uppergammareg(1e6, 1.01e6) is 1e-23, from P at the working bits.
  const raised: NumberContext = { ...context, precision: a.digits };
  return blamed(expBall(whole.value, raised), blame);
}

/**
 * The other form of the pair from the one computed: `Γ(s) - value`, or
 * `1 - value` regularized; where the one computed passed the bottom of
 * the bound, `Γ(s)` or one within `10^-(10^18)`.
 */
function complementOf(
  s: Ball,
  value: Result<Ball, BuiltinError>,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const whole = regularized ? ok(exact(ONE)) : gammaBall(s, context);
  if (!whole.ok) return whole;
  if (!value.ok) {
    if (value.error.kind === "underflow") {
      return ok({ mid: whole.value.mid, rad: PAST_BOTTOM });
    }
    return value;
  }
  const difference = subtractBalls(whole.value, value.value, context);
  return difference.ok ? difference : failed(difference.error, 0);
}

function builtin(name: string, form: Form, regularized: boolean): Builtin {
  return {
    name,
    arity: { min: 2, max: 2 },
    dimensions: plainNumbers(2),
    apply: ([s, x], context) =>
      incompleteGamma(s!, x!, form, regularized, context),
  };
}

export const lowergamma = builtin("lowergamma", "lower", false);
export const uppergamma = builtin("uppergamma", "upper", false);
export const lowergammareg = builtin("lowergammareg", "lower", true);
export const uppergammareg = builtin("uppergammareg", "upper", true);

/** `lowergamma(s, x)`, `uppergamma(s, x)` and the regularized forms at the context, for the tests. */
export function incompleteGammaBall(
  s: Ball,
  x: Ball,
  form: Form,
  regularized: boolean,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return incompleteGamma(s, x, form, regularized, context);
}
