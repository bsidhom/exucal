// The ball: a midpoint with a radius, the value every magnitude becomes. The
// midpoint is the number computed, a `Scaled` (scaled.ts: a fraction times a
// power of ten, from stage 4's 4.4); the radius, a `Radius` of radius.ts,
// bounds its distance from the value it stands for. An exact value has
// radius zero, and `=` in the display means exactly that.
// docs/calculator.md ("The precision model") is the design,
// docs/decimal.md the exponent and the two modes, and
// docs/calculator-plan.md (D3, D4, D7, D15, tasks 1.5, 2.3, 2.4, 2.5 and
// 4.4) the decisions; this module is the type, its exact operations and the
// one inexact one, the root; quantity.ts makes a ball the magnitude of
// every quantity.
//
// Each operation composes the arithmetic of scaled.ts on the midpoints
// with a propagation rule of radius.ts on the radii; scaled.ts knows
// nothing of radii, and radius.ts reads a midpoint only for its binary
// bounds (`radiusAboveScaled`). The exact operations never round an exact
// value: an exact value stays the exact number it is, and only the radius
// says what has been lost upstream (a root, a function). An inexact value
// is another matter (D15): its midpoint is a number computed, not known,
// and the evaluator settles it after every operation with `settle`, which
// rounds it to nearest at the working digits, the decimal grid the kernel's
// results are rounded onto as they leave the kernel (`fixedToBall`), and
// adds the rounding to the radius, so that an inexact midpoint never grows
// beyond the working precision however long the expression; `powBall` on
// an inexact base squares with settling for the same reason. Settling is a
// bound on size, not a rounding the user chose: the mode is the display's
// (the decimal mode of 4.5 settles in the user's mode). The rules are
// the elementary ones, each a bound over the two operands' intervals: a
// sum's radii add; a product's radius is `|a| rb + |b| ra + ra rb`; a
// quotient's is `(|a| rb + |b| ra) / (|b| (|b| - rb))`, which requires the
// divisor's interval to exclude zero; a power's is the product's, applied
// by squaring. The magnitudes in those rules are radii at or above the
// midpoints (`radiusAboveScaled`, from the binary bounds of scaled.ts, so
// that nothing is formed whatever the exponent), and the quotient's
// denominator a radius at or below, so every radius operation rounds the
// right way and a result's interval contains the exact result for every
// pair of values in the operands' intervals, which is what the tests check.
//
// A sum is where the exponent costs something (docs/decimal.md, "Sums,
// comparisons and the radius"). `addBalls` aligns the midpoints exactly
// where the shift fits the context's range limit. Where it does not, two
// exact operands are `tooLarge`, the exact sum existing and not being
// holdable (`1e999999999 + 1`); otherwise the result is inexact and about
// to be settled, so it is settled a step early: each inexact operand is
// settled first, the two are added exactly if they then align, and if they
// still do not, the smaller, which then lies below the working precision
// of the larger, is absorbed into the radius. So `addBalls`,
// `subtractBalls`, `multiplyBalls` and `divideBalls` are `Result`s,
// failing `tooLarge` there and `overflow` or `underflow` at the exponent
// bound.
//
// Two values are special. An exact zero times anything is exact zero,
// however wide the other operand, unbounded included: unbounded stands for
// a bound that is not known, not for an infinite value. And a divisor that
// contains zero without being exactly zero cannot be divided by, since the
// true quotient may have either sign or none: that is `unresolved` (D4), a
// kind of its own beside `divisionByZero`, because the retry loop of the
// pipeline retries on the first (a narrower ball may exclude zero) and
// never on the second. A divisor of unbounded radius with a nonzero
// midpoint divides, and the quotient's radius is unbounded, as the study's
// per-operation fallback says; one with a zero midpoint is `unresolved`,
// since nothing is known of its sign.
//
// Comparing a midpoint with a radius, which `containsZero`, the
// certification and the built-ins' edge checks (`position`) do, is exact
// where the radius's power of two can be formed as a `Scaled`, which is
// every radius of the working sizes, and otherwise by the coarse bounds on
// both, which decide everything but a magnitude within `2^-30` of the
// radius; there the answer is the conservative one (the ball contains the
// point; the digit is not certified), and the retry loop narrows the ball.
//
// The root is the one inexact operation, and it runs on the kernel
// (fixed.ts; task 2.3 of the plan). An exact argument with a rational root
// is exact, as `exactRoot` finds it. Otherwise a ball whose interval
// excludes zero is scaled by an exact power of ten in the exponent and an
// exact power of `2^degree` on the mantissa so that it is of order one (the
// scaling belongs here, on the ball, since a tiny ball converted at the
// kernel's bits would lose its digits), converted at `bitsFor(precision)`,
// plus as many more bits as the scaled mantissa still lies below one,
// rooted, scaled back and handed back through `fixedToBall`, so that the
// radius covers the argument's radius and the kernel's own error, and the
// midpoint is the kernel's, rounded to the working digits in no mode (D15:
// the mode is the display's). Three cases the kernel's root cannot take go
// to log space instead, `x^(1/n)` as `exp(ln x / n)` (H.5 of the plan): a
// degree past `2^32`, which Newton's iteration from a double's guess
// cannot verify (`pow(3, 1e-30)` threw, issue #57); a remainder of the
// exponent whose power of ten does not fit the range limit; and a mantissa
// that lies below one by more than the working bits, which the conversion
// would turn to zero (`(7^-8000)^(1/99999)` was shown as zero within
// `0.9`). A negative ball of odd degree is the negated
// root of its magnitude; one of even degree fails with `negativeRadicand`.
// A ball containing zero without being exactly zero is `unresolved` under
// an even degree, since the sign of the true value decides whether there
// is a root at all, and under an odd degree a ball around zero bounded by
// the root of the farther end of the interval, the root being monotone. An
// argument of unbounded radius gives the root of its midpoint with an
// unbounded radius, as the other operations propagate unbounded. The
// context's precision is the working precision the kernel computes at;
// nothing here reads its rounding mode.
//
// A rational power (`powRationalBall`, which `^` and the built-in `pow`
// share; task 3.8) has three routes. An exact base that is a perfect
// `q`-th power gives the exact root raised to `p`, without ever forming
// `x^p`, since `x^(p/q)` is rational exactly when `x` is a perfect `q`-th
// power. Otherwise, when `x^p` fits the range limit, the root of the power
// as above, root last so that the one inexact step comes last, which also
// serves a negative base under an odd root and reports a base straddling
// zero `unresolved`. Otherwise log space: `exp(y ln x)` on the kernel
// routines beside fixed.ts (`lnFixed` of fixed-log.ts, `expFixed` of
// fixed-exp.ts; the routines are below the ball so that this module can
// reach them), for a base positive throughout, and for a negative base
// under an odd root by symmetry; `powLogSpace` is that route on any
// bounded exponent, which `pow` takes for an inexact one. The base's
// mantissa is scaled to order one by a power of two before it is
// converted, and that power goes to the logarithm with the decimal
// exponent (`lnScaled`, which the logarithms share, adds `exp × ln 10` from
// the memo), so that a tiny or a huge base loses nothing to the
// conversion; the product `y ln x` is formed at the bits plus the
// exponent's and the logarithm's magnitudes, and its magnitude is held to
// the exponent bound before the exponential (`expFits`, 4.9), so that
// `7^(100000/3)` is a value of about `10^28170` where the range limit
// refused it, `2^0.1234567` and `10^2.3456789`, once refused as
// `tooLarge`, are values with a radius, and `7^(10^19)` is an `overflow`,
// past the bound; a power of ten costs nothing in the exponent, so
// `10^(100000/3)` is the cube root of ten times `10^33333`, a value; the
// kernel's `Floating` comes out through digits.ts (`floatingToBall`),
// exactly where its exponent is within the range limit and in log space
// otherwise.

import type { NumberContext } from "./context.ts";
import { modeOf, workingDigits } from "./context.ts";
import { floatingToBall } from "./digits.ts";
import { expFixed } from "./fixed-exp.ts";
import { ln10Fixed, lnFixed } from "./fixed-log.ts";
import {
  addFixed,
  bitsFor,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  keepSignificant,
  multiplyFixed,
  ROOT_DEGREE_LIMIT,
  rootFixed,
  scaleFixed,
  shiftFixed,
  type Fixed,
} from "./fixed.ts";
import {
  LIMIT_BITS,
  bitLength,
  rational,
  scaleByPowerOfTwo,
  type Rational,
} from "./rational.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  addRadius,
  compareRadius,
  divideRadius,
  isZeroRadius,
  log2OfRadius,
  multiplyRadius,
  multiplyRadiusDown,
  powerOfTenRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusBelowScaled,
  radiusUpper,
  rootRadiusAbove,
  shiftRadius,
  subtractRadiusDown,
  type Radius,
} from "./radius.ts";
import { err, ok, type Result } from "./result.ts";
import type { Precision, RoundingMode } from "./rounding.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  decimalExponent,
  decimalExponentOfLog2,
  divide,
  equals,
  exactRoot,
  fromRational,
  isRefusal,
  isZero,
  log2Bounds,
  multiply,
  negate,
  pow,
  roundTo,
  scaled,
  sign,
  subtract,
  toRational,
  trunc,
  type Scaled,
  type ScaledError,
} from "./scaled.ts";

/** A midpoint with the radius that bounds its distance from the true value. */
export type Ball = {
  readonly mid: Scaled;
  readonly rad: Radius;
};

export type BallError =
  | ScaledError
  /**
   * The answer depends on which side of zero the true value lies, and the
   * ball straddles it: a divisor that cannot be told from zero.
   */
  | { readonly kind: "unresolved" };

/**
 * The bits of a radius's exponent up to which its exact value is formed as
 * a `Scaled` for a comparison, `2^16`: every radius of the working sizes,
 * and a power of two of that size costs a canonical form of a few tens of
 * thousands of bits, once per comparison.
 */
const FORMABLE_RADIUS_BITS = 1 << 16;

/** The ball of an exact value: radius zero. */
export function exact(mid: Scaled): Ball {
  return { mid, rad: ZERO_RADIUS };
}

/** Whether `b` is an exact value: its radius is zero. */
export function isExact(b: Ball): boolean {
  return isZeroRadius(b.rad);
}

/**
 * Whether the interval of `b` contains zero: `|mid| <= rad`, which for an
 * exact ball is `mid = 0`; an unbounded ball contains everything, and a
 * midpoint within the coarse bounds' `2^-30` of the radius is taken to.
 */
export function containsZero(b: Ball): boolean {
  if (b.rad.kind === "unbounded") return true;
  if (b.rad.mant === 0n) return isZero(b.mid);
  if (isZero(b.mid)) return true;
  return (compareWithRadius(absolute(b.mid), b.rad) ?? 0) <= 0;
}

/** A radius at or above `|mid| + rad`: a bound on the magnitude of every value in `b`. */
export function magnitudeAbove(b: Ball): Radius {
  return addRadius(radiusAboveScaled(b.mid), b.rad);
}

/**
 * A radius at or below `|mid| - rad`, the distance of the bounded `b`'s
 * interval from zero, zero when the interval reaches or the bounds cannot
 * tell; a precondition failure for an unbounded radius.
 */
export function magnitudeBelow(b: Ball): Radius {
  return subtractRadiusDown(radiusBelowScaled(b.mid), b.rad);
}

/**
 * Where `b` lies against `point`: `above` or `below` it throughout,
 * `touchingAbove` or `touchingBelow` with one end exactly on it, `at` it
 * exactly, or `straddles`, which is also the answer for an unbounded ball
 * and for a midpoint within the coarse bounds' `2^-30` of the point, the
 * conservative one. The built-ins' edge checks are written on it.
 */
export function position(
  b: Ball,
  point: Scaled,
): "below" | "above" | "touchingBelow" | "touchingAbove" | "at" | "straddles" {
  if (b.rad.kind === "unbounded") return "straddles";
  if (b.rad.mant === 0n) {
    const c = compare(b.mid, point);
    return c < 0 ? "below" : c > 0 ? "above" : "at";
  }
  const d = subtract(b.mid, point, LIMIT_BITS);
  if (d.ok) {
    if (isZero(d.value)) return "straddles";
    const c = compareWithRadius(absolute(d.value), b.rad);
    const above = sign(d.value) > 0;
    if (c === 1) return above ? "above" : "below";
    if (c === 0) return above ? "touchingAbove" : "touchingBelow";
    return "straddles";
  }
  // The two could not be aligned, so one is far larger than the other and
  // the difference is at least half the larger.
  const midLarger = compare(absolute(b.mid), absolute(point)) > 0;
  const larger = midLarger ? b.mid : point;
  const halfLower = shiftRadius(radiusBelowScaled(larger), -1n);
  if (compareRadius(halfLower, b.rad) <= 0) return "straddles";
  const above = midLarger ? sign(b.mid) > 0 : sign(point) < 0;
  return above ? "above" : "below";
}

/**
 * Compares the non-negative `magnitude` with the bounded, nonzero `rad`:
 * exactly where the radius can be formed, and otherwise by the coarse
 * bounds, `undefined` when they cannot tell.
 */
function compareWithRadius(
  magnitude: Scaled,
  rad: Radius,
): -1 | 0 | 1 | undefined {
  const r = radiusScaled(rad);
  if (r !== undefined) return compare(magnitude, r);
  if (isZero(magnitude)) return -1;
  if (compareRadius(radiusBelowScaled(magnitude), rad) > 0) return 1;
  if (compareRadius(radiusAboveScaled(magnitude), rad) < 0) return -1;
  return undefined;
}

/** The exact value of the bounded `rad` as a `Scaled`, when its power of two is worth forming; `undefined` otherwise. */
function radiusScaled(rad: Radius): Scaled | undefined {
  if (rad.kind === "unbounded") return undefined;
  if (rad.mant === 0n) return ZERO;
  const exp = rad.exp < 0n ? -rad.exp : rad.exp;
  if (exp > BigInt(FORMABLE_RADIUS_BITS)) return undefined;
  return fromRational(radiusUpper(rad));
}

// ---------------------------------------------------------------------------
// The exact operations

/** `-b`: the midpoint negated, the radius kept. */
export function negateBall(b: Ball): Ball {
  return { mid: negate(b.mid), rad: b.rad };
}

/**
 * `a + b`: the midpoints added, the radii added, aligned exactly where the
 * shift fits the context's range limit, and otherwise as the header says:
 * `tooLarge` for two exact operands, and a settle-first sum with the
 * smaller absorbed into the radius when an operand is inexact.
 */
export function addBalls(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BallError> {
  const sum = add(a.mid, b.mid, context.maxBits);
  if (sum.ok) return ok({ mid: sum.value, rad: addRadius(a.rad, b.rad) });
  if (!isRefusal(sum.error)) return sum;
  // Two exact operands have an exact sum that cannot be held, except in
  // decimal mode, where every operation rounds and the sum is settled as
  // an inexact one is: `1e999999999 + 1` is `1e999999999` within one.
  if (isExact(a) && isExact(b) && modeOf(context) === "exact") return sum;
  const sa = settle(a, context);
  const sb = settle(b, context);
  const settled = add(sa.mid, sb.mid, context.maxBits);
  if (settled.ok) {
    return ok({ mid: settled.value, rad: addRadius(sa.rad, sb.rad) });
  }
  if (!isRefusal(settled.error)) return settled;
  const [larger, smaller] =
    compare(absolute(sa.mid), absolute(sb.mid)) >= 0 ? [sa, sb] : [sb, sa];
  return ok({
    mid: larger.mid,
    rad: addRadius(larger.rad, magnitudeAbove(smaller)),
  });
}

/** `a - b`: `a` plus the negation of `b`. */
export function subtractBalls(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BallError> {
  return addBalls(a, negateBall(b), context);
}

/**
 * `a × b`: the exact product of the midpoints, with the radius
 * `|a| rb + |b| ra + ra rb`, rounded up. An exact zero times anything is
 * exact zero; a product whose exponent passes the bound is `overflow` or
 * `underflow`, and one past the range limit would be `tooLarge` once
 * products are held to it (issue #52), so a caller takes any refusal.
 */
export function multiplyBalls(a: Ball, b: Ball): Result<Ball, BallError> {
  if (isExactZero(a) || isExactZero(b)) return ok(exact(ZERO));
  const mid = multiply(a.mid, b.mid);
  if (!mid.ok) return mid;
  const rad = addRadius(
    addRadius(
      multiplyRadius(radiusAboveScaled(a.mid), b.rad),
      multiplyRadius(radiusAboveScaled(b.mid), a.rad),
    ),
    multiplyRadius(a.rad, b.rad),
  );
  return ok({ mid: mid.value, rad });
}

/**
 * `a / b`: the exact quotient of the midpoints, with the radius
 * `(|a| rb + |b| ra) / (|b| (|b| - rb))`, rounded up, the bound for `a / b`
 * over the two intervals, computed on the coarse type with the divisor's
 * distance from zero as a lower bound. Fails `divisionByZero` when `b` is
 * exactly zero and `unresolved` when it contains zero without being
 * exactly zero, or when the bounds cannot tell its distance from zero, and
 * is refused as a product is. A divisor of unbounded radius with a nonzero
 * midpoint gives a quotient of unbounded radius.
 */
export function divideBalls(a: Ball, b: Ball): Result<Ball, BallError> {
  if (isExactZero(b)) return err({ kind: "divisionByZero" });
  if (b.rad.kind === "unbounded") {
    if (isZero(b.mid)) return err({ kind: "unresolved" });
    const mid = divide(a.mid, b.mid);
    return mid.ok ? ok({ mid: mid.value, rad: UNBOUNDED }) : mid;
  }
  if (containsZero(b)) return err({ kind: "unresolved" });
  const mid = divide(a.mid, b.mid);
  if (!mid.ok) return mid;
  if (a.rad.kind === "unbounded") return ok({ mid: mid.value, rad: UNBOUNDED });
  if (isZeroRadius(a.rad) && isZeroRadius(b.rad)) return ok(exact(mid.value));
  const numerator = addRadius(
    multiplyRadius(radiusAboveScaled(a.mid), b.rad),
    multiplyRadius(radiusAboveScaled(b.mid), a.rad),
  );
  // Positive: the divisor's interval excludes zero, so |b| > rb; the
  // coarse bounds may still fail to tell, which is then unresolved.
  const distance = magnitudeBelow(b);
  if (isZeroRadius(distance)) return err({ kind: "unresolved" });
  const denominator = multiplyRadiusDown(radiusBelowScaled(b.mid), distance);
  return ok({ mid: mid.value, rad: divideRadius(numerator, denominator) });
}

/**
 * `b^n` for an integer `n`. An exact ball goes through `pow`, exactly,
 * within the context's range limit. An inexact ball is raised by squaring
 * with `multiplyBalls`, settled after each product (D15), so that the
 * midpoint stays at the working precision and only the magnitude of the
 * result is guarded: a result whose decimal exponent would pass the
 * exponent bound is `overflow` or `underflow` before anything is computed
 * (4.9), as the midpoint's magnitude is above or below one, told exactly,
 * and a product that passes it in the loop, by the guard's double, fails
 * so there. A negative `n` inverts by the division rule, so a
 * ball containing zero to a negative power is `unresolved`, and a power
 * past the bound on one side is past it on the other. `b^0` is exactly
 * one, as `pow` has it, for any ball.
 */
export function powBall(
  b: Ball,
  n: bigint,
  context: NumberContext,
): Result<Ball, BallError> {
  if (isExact(b)) {
    const mid = pow(b.mid, n, context.maxBits);
    return mid.ok ? ok(exact(mid.value)) : mid;
  }
  if (n === 0n) return ok(exact(ONE));
  if (n < 0n) {
    const positive = powBall(b, -n, context);
    if (positive.ok) return divideBalls(exact(ONE), positive.value);
    // The reciprocal of a power past the bound is past it on the other side.
    return err(reciprocalError(positive.error));
  }
  if (
    !isZero(b.mid) &&
    log2Scale(b) * Number(n) * Math.log10(2) > Number(MAX_EXPONENT)
  ) {
    const belowOne = compare(absolute(b.mid), ONE) < 0;
    return err({ kind: belowOne ? "underflow" : "overflow" });
  }
  let result = exact(ONE);
  let base = b;
  for (let rest = n; rest > 0n; rest >>= 1n) {
    if (rest & 1n) {
      const product = multiplyBalls(result, base);
      if (!product.ok) return product;
      result = settle(product.value, context);
    }
    if (rest > 1n) {
      const square = multiplyBalls(base, base);
      if (!square.ok) return square;
      base = settle(square.value, context);
    }
  }
  return ok(result);
}

/**
 * `b` settled to the working precision of `context` (D15), one rounding
 * with two parameters (docs/decimal.md, "The decimal mode"). In exact
 * mode an inexact midpoint is rounded to nearest at the working digits,
 * the decimal grid the kernel's results are rounded onto, and half a unit
 * in the last of those digits, its bound, is added to the radius when the
 * rounding moved it; an exact ball is returned as it is, since the
 * rounding mode is the display's, applied once to the certified value of
 * the whole expression. In decimal mode every midpoint, an exact one
 * included, is rounded to the context's precision in its rounding mode,
 * and the exact difference between the rounded value and the midpoint
 * goes into the radius (not the bound: a value rounded to `p` digits with
 * half a unit of radius has its ends on the rounding boundaries and
 * certifies `p - 1`); a value with `p` digits or fewer is its own
 * rounding and stays as it is. A zero midpoint is left alone in both.
 */
export function settle(b: Ball, context: NumberContext): Ball {
  if (isZero(b.mid)) return b;
  if (modeOf(context) === "decimal") {
    const mid = roundTo(b.mid, context.precision, context.rounding);
    if (equals(mid, b.mid)) return b;
    const moved = subtract(mid, b.mid, LIMIT_BITS);
    if (!moved.ok)
      throw new Error("A rounding moves a value within its digits");
    return { mid, rad: addRadius(b.rad, radiusOfDifference(moved.value)) };
  }
  if (isExact(b)) return b;
  const digits = workingDigits(context);
  const mid = roundTo(b.mid, digits, "halfEven");
  if (equals(mid, b.mid)) return b;
  return { mid, rad: addRadius(b.rad, halfUnitOf(mid, digits)) };
}

/** A radius at or above the difference `d` a rounding made: exact where the fraction can be formed, the coarse bound otherwise. */
function radiusOfDifference(d: Scaled): Radius {
  const r = toRational(d, FORMABLE_RADIUS_BITS);
  return r.ok ? radiusAbove(r.value) : radiusAboveScaled(d);
}

/** A radius at or above half a unit in the last of `digits` significant digits of the nonzero `s`. */
function halfUnitOf(s: Scaled, digits: Precision): Radius {
  const half = scaled(
    { num: 5n, den: 1n },
    decimalExponent(s) - BigInt(digits),
  );
  if (!half.ok) throw new Error("Half a unit of a value is within the bound");
  return radiusAboveScaled(half.value);
}

// ---------------------------------------------------------------------------
// The inexact operation

/**
 * The `degree`-th root of `b`, where `degree >= 1`, at the precision of
 * `context`: an exact argument with a rational root is exact; a ball whose
 * interval excludes zero goes through the kernel, scaled to order one
 * first, so its radius covers the argument's; a ball containing zero
 * without being exactly zero is `unresolved` under an even degree and a
 * ball around zero under an odd one; an even root of a negative ball fails
 * with `negativeRadicand`; an unbounded argument gives the root of its
 * midpoint, unbounded.
 */
export function rootBall(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball, BallError> {
  if (degree < 1n) throw new RangeError("Root degree must be positive");
  if (isExact(b)) {
    const exactValue = exactRoot(b.mid, degree, context.maxBits);
    if (!exactValue.ok) return exactValue;
    if (exactValue.value !== undefined) return ok(exact(exactValue.value));
  }
  if (degree === 1n) return ok(b);
  if (b.rad.kind === "unbounded") {
    const root = rootBall(exact(b.mid), degree, context);
    return root.ok ? ok({ mid: root.value.mid, rad: UNBOUNDED }) : root;
  }
  const even = degree % 2n === 0n;
  if (containsZero(b)) {
    return even ? err({ kind: "unresolved" }) : ok(rootAroundZero(b, degree));
  }
  if (sign(b.mid) < 0) {
    if (even) return err({ kind: "negativeRadicand", degree });
    const root = positiveRoot(negateBall(b), degree, context);
    if (!root.ok) return root;
    return ok(
      root.value === undefined
        ? rootAroundZero(b, degree)
        : negateBall(root.value),
    );
  }
  const root = positiveRoot(b, degree, context);
  if (!root.ok) return root;
  if (root.value !== undefined) return ok(root.value);
  // The interval is positive as rationals but not at the kernel's bits: the
  // ball reaches within an ulp of zero, and is treated as containing it.
  return even ? err({ kind: "unresolved" }) : ok(rootAroundZero(b, degree));
}

/**
 * The root of a bounded `b` whose interval is positive, through the kernel:
 * the exponent is split into a multiple of the degree, taken off exactly,
 * and a remainder folded into the mantissa; the mantissa is then scaled by
 * `2^(-j × degree)` so that it is of order one, converted at
 * `bitsFor(precision)` plus as many more bits as the scaled mantissa lies
 * below one, so that it keeps its digits through the root, rooted, scaled
 * back by `2^j` and the power of ten, and handed back. Three cases go to
 * log space instead (`rootInLogSpace`), as a rational power that does not
 * fit the range limit does: a degree past `ROOT_DEGREE_LIMIT`, which the
 * kernel's root cannot verify; a remainder whose power of ten does not
 * fit the range limit; and a mantissa that lies below one by more than
 * the working bits, which the conversion would turn to zero within an ulp
 * and report as a false `unresolved` (`pow(3^-10000, 2^-30)`, issue #57).
 * `undefined` when the scaled ball's interval is not positive at those
 * bits, which only a ball reaching within an ulp of zero can produce.
 */
function positiveRoot(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball | undefined, BallError> {
  if (degree > ROOT_DEGREE_LIMIT) return rootInLogSpace(b, degree, context);
  let k = b.mid.exp / degree;
  let r = b.mid.exp - k * degree;
  if (r < 0n) {
    r += degree;
    k -= 1n;
  }
  const mantissa = toRational({ mant: b.mid.mant, exp: r }, context.maxBits);
  if (!mantissa.ok) return rootInLogSpace(b, degree, context);
  // The radius over the power of ten taken off, then over the mantissa's
  // binary scaling: both exact powers, rounded up on the radius. The
  // power taken off is not formed: its multiple of the degree can overshoot
  // the exponent by up to the degree less one, past the bound for
  // `cbrt(1e-1000000000000000000)` (issue #44), and only its radius is
  // needed.
  const radOverTen = multiplyRadius(b.rad, powerOfTenRadius(-(k * degree)));
  const m = mantissa.value;
  const exponent = BigInt(bitLength(m.num) - bitLength(m.den));
  const j = exponent / degree;
  const shift = j * degree;
  // The scaled mantissa, `m × 2^-shift`, lies between `2^-degree` and
  // `2^degree`. Where it lies below one, `deficit` is about how many bits
  // below: past the working bits the conversion would lose it entirely,
  // and within them it is converted at that many more bits, as a small
  // argument of an odd function is (`extraBits` of builtin.ts).
  const bits = bitsFor(context.precision);
  const deficit = shift - exponent;
  if (deficit > BigInt(bits)) return rootInLogSpace(b, degree, context);
  const f = fixedFromRational(
    scaleByPowerOfTwo(m, -shift),
    bits + (deficit > 0n ? Number(deficit) : 0),
  );
  const scaledRad = shiftRadius(radOverTen, -shift);
  const withRad: Fixed = {
    ...f,
    error: f.error + ulpsOf(scaledRad, f.bits),
  };
  if (withRad.value <= withRad.error) return ok(undefined);
  const root = fixedToBall(
    shiftFixed(rootFixed(withRad, degree), Number(j)),
    workingDigits(context),
  );
  const backTen = scaledPowerOfTen(k);
  const mid = multiply(root.mid, backTen);
  if (!mid.ok) return mid;
  return ok({
    mid: mid.value,
    rad: multiplyRadius(root.rad, radiusAboveScaled(backTen)),
  });
}

/**
 * The root of the bounded, positive `b` in log space, `x^(1/n)` as
 * `exp(ln x / n)`, for the cases `positiveRoot` cannot take to the
 * kernel's root. `powLogSpace`'s `unresolved`, which for a positive ball
 * means only that it reaches within an ulp of zero at the logarithm's
 * bits, becomes `undefined`, so that `rootBall` keeps its handling of a
 * ball around zero under an odd or an even degree (`pow(-2, 3^-700)` is
 * `≈ -1` through its negative branch); a refusal is passed on.
 */
function rootInLogSpace(
  b: Ball,
  degree: bigint,
  context: NumberContext,
): Result<Ball | undefined, BallError> {
  const root = powLogSpace(
    b,
    exact(fromRational(rational(1n, degree))),
    context,
  );
  if (root.ok) return root;
  return root.error.kind === "unresolved" ? ok(undefined) : root;
}

/** `10^k` as a `Scaled`, which is within the bound whenever `k` came from one. */
function scaledPowerOfTen(k: bigint): Scaled {
  const power = scaled({ num: 1n, den: 1n }, k);
  if (!power.ok) throw new Error("A power of ten from a bounded exponent");
  return power.value;
}

/** `ceil(rad × 2^bits)` for a bounded `rad`: its ulps at `bits`, rounded up, for the kernel's error. */
function ulpsOf(rad: Radius, bits: number): bigint {
  if (rad.kind === "unbounded")
    throw new RangeError("An unbounded radius has no ulps");
  if (rad.mant === 0n) return 0n;
  const exp = rad.exp + BigInt(bits);
  if (exp >= 0n) return rad.mant << exp;
  if (-exp >= BigInt(bitLength(rad.mant))) return 1n;
  const den = 1n << -exp;
  return (rad.mant + den - 1n) / den;
}

/**
 * The odd-degree root of a bounded `b` containing zero: a ball around zero
 * whose radius is the root of the farther end of `b`'s interval, which
 * bounds the root of every value in it, the root being monotone and odd.
 */
function rootAroundZero(b: Ball, degree: bigint): Ball {
  return { mid: ZERO, rad: rootRadiusAbove(magnitudeAbove(b), degree) };
}

/**
 * `b` raised to the rational power `exponent`, by the three routes the
 * header lays out: `powBall` for an integer exponent; for `p/q` in lowest
 * terms the exact root raised to `p` when `b` is exact and a perfect
 * `q`-th power; else `rootBall` of `powBall` when `b^p` fits the range
 * limit, root last; else log space. A ball negative throughout under an
 * even root fails with `negativeRadicand` before anything is computed, so
 * that `(-8)^(2/4)` is refused rather than computed as the fourth root of
 * 64; one straddling zero goes to the root, which reports it `unresolved`
 * under an even degree, or the power's refusal when it does not fit; one of
 * unbounded radius gives the power of its midpoint with an unbounded
 * radius.
 */
export function powRationalBall(
  b: Ball,
  exponent: Rational,
  context: NumberContext,
): Result<Ball, BallError> {
  if (exponent.den === 1n) return powBall(b, exponent.num, context);
  const { num: p, den: q } = exponent;
  const even = q % 2n === 0n;
  if (isExact(b)) {
    const root = exactRoot(b.mid, q, context.maxBits);
    if (!root.ok) return root;
    if (root.value !== undefined) {
      const power = pow(root.value, p, context.maxBits);
      return power.ok ? ok(exact(power.value)) : power;
    }
  }
  if (b.rad.kind === "unbounded") {
    const at = powRationalBall(exact(b.mid), exponent, context);
    return at.ok ? ok({ mid: at.value.mid, rad: UNBOUNDED }) : at;
  }
  const negative = sign(b.mid) < 0 && !containsZero(b);
  if (negative && even) return err({ kind: "negativeRadicand", degree: q });
  const power = powBall(b, p, context);
  if (power.ok) return rootBall(power.value, q, context);
  if (!isRefusal(power.error) || containsZero(b)) return power;
  const result = powLogSpace(
    negative ? negateBall(b) : b,
    exact(fromRational(exponent)),
    context,
  );
  if (!result.ok || !negative || p % 2n === 0n) return result;
  return ok(negateBall(result.value));
}

/**
 * `exp(y ln x)` on the kernel, for a bounded `x` positive as rationals (a
 * precondition) and a bounded `y`: the logarithm at the working bits plus
 * the magnitudes of `y` and of the logarithm, so that their product keeps
 * the working bits, `unresolved` when `x` reaches within an ulp of zero at
 * those bits, `overflow` or `underflow` when the product's magnitude, over
 * its whole interval, puts the result beyond the exponent bound, as the
 * product is positive or negative, or when `y` is beyond what a
 * double holds, which puts the result past the bound on the side the
 * signs of `y` and `ln x` give unless `x` is within about `10^-282` of
 * one, and otherwise the kernel's `Floating` as a ball through digits.ts,
 * rounded in no mode.
 */
export function powLogSpace(
  x: Ball,
  y: Ball,
  context: NumberContext,
): Result<Ball, BallError> {
  const bits = bitsFor(context.precision);
  const yBound = radiusBound(magnitudeAbove(y));
  if (yBound === Infinity) {
    const belowOne = compare(x.mid, ONE) < 0;
    const negative = sign(y.mid) < 0;
    return err({ kind: negative === belowOne ? "overflow" : "underflow" });
  }
  const yBits = Math.max(0, Math.ceil(Math.log2(yBound + 1)));
  const lnBits = bitLength(BigInt(Math.ceil(Math.abs(log2Of(x)))) + 2n);
  const working = bits + yBits + lnBits + 8;
  const lnX = lnScaled(x, working, bitsFor(context.ceiling));
  if (lnX === undefined) return err({ kind: "unresolved" });
  const product = multiplyFixed(fixedFromBall(y, working), lnX);
  const bound = abs(product.value) + product.error;
  const magnitude =
    Number(bound >> BigInt(Math.max(0, bitLength(bound) - 53))) *
    2 ** (Math.max(0, bitLength(bound) - 53) - product.bits);
  if (!expFits(magnitude)) {
    return err({ kind: product.value < 0n ? "underflow" : "overflow" });
  }
  return floatingToBall(expFixed(product, bits), context);
}

/**
 * The kernel's logarithm of a bounded `x` positive as rationals (a
 * precondition) at `bits` fraction bits, `ln(2)` and `ln(10)` from their
 * memos at `ceilingBits`: the mantissa is scaled to order one by an exact
 * power of two and converted at `bits`, that power goes to `lnFixed` as
 * its `scale`, and the decimal exponent times `ln(10)` is added at the
 * bits its size calls for, so that a tiny or a huge `x` loses nothing to
 * the conversion. `undefined` when the scaled ball reaches within an ulp
 * of zero at those bits, which only a ball wider than its value can
 * produce.
 */
export function lnScaled(
  x: Ball,
  bits: number,
  ceilingBits: number,
): Fixed | undefined {
  const { mant, exp } = x.mid;
  const scale = bitLength(mant.num) - bitLength(mant.den);
  // Only the radius of the power of ten is needed, so it is not formed;
  // `10^-exp` can lie past the bound when `x` lies near it.
  const radOverTen = multiplyRadius(x.rad, powerOfTenRadius(-exp));
  const f = fixedFromRational(scaleByPowerOfTwo(mant, -BigInt(scale)), bits);
  const withRad: Fixed = {
    ...f,
    error: f.error + ulpsOf(shiftRadius(radOverTen, -BigInt(scale)), bits),
  };
  if (withRad.value <= withRad.error) return undefined;
  const lnMantissa = lnFixed(withRad, bits, ceilingBits, scale);
  if (exp === 0n) return lnMantissa;
  const expBits = bitLength(exp < 0n ? -exp : exp);
  const lnTen = scaleFixed(ln10Fixed(bits + expBits + 8, ceilingBits), exp);
  return keepSignificant(addFixed(lnMantissa, lnTen), bits);
}

/**
 * A number at or above the radius `rad`, `Infinity` for an unbounded one
 * or one beyond a double: enough to compare a magnitude with the range
 * limit.
 */
export function radiusBound(rad: Radius): number {
  if (rad.kind === "unbounded") return Infinity;
  if (rad.mant === 0n) return 0;
  if (rad.exp > 1000n) return Infinity;
  if (rad.exp < -1100n) return 0;
  return Number(rad.mant) * 2 ** Number(rad.exp);
}

/**
 * Whether `exp` of a value of magnitude up to `bound` fits the exponent
 * bound, either way from one: its decimal exponent, `bound log10 e`, is
 * at most `MAX_EXPONENT` (4.9; `exp(1e18)` is a value, `exp(1e30)` is not).
 */
export function expFits(bound: number): boolean {
  return bound * Math.LOG10E <= Number(MAX_EXPONENT);
}

/**
 * A bound on `|log2|` of the values in the inexact `b`, as a double: the
 * larger of the binary exponent of its magnitude bound and of its
 * midpoint's, each to a double's accuracy plus a little slack, so that
 * `powBall` can bound the bits of a power's integer part or denominator
 * before computing it. An unbounded radius bounds nothing, and the
 * midpoint's exponent stands alone, as the midpoint is all that is
 * computed for such a ball.
 */
function log2Scale(b: Ball): number {
  const above = magnitudeAbove(b);
  const mid = Math.abs(log2Of(b));
  const upper =
    above.kind === "unbounded"
      ? mid
      : Math.abs(Math.log2(Number(above.mant)) + Number(above.exp));
  return Math.max(upper, mid) * (1 + 1e-9) + 1e-9;
}

/** The failure of the reciprocal of a value that failed with `error`: past the bound on its other side, and otherwise the same. */
function reciprocalError(error: BallError): BallError {
  switch (error.kind) {
    case "overflow":
      return { kind: "underflow" };
    case "underflow":
      return { kind: "overflow" };
    default:
      return error;
  }
}

/**
 * `log2` of the nonzero midpoint of `b` as a double, from the coarse
 * bounds, taken on the side away from zero: within `2^-30` of the truth
 * for a value of order one, so that a base near one is guarded by its
 * true magnitude.
 */
function log2Of(b: Ball): number {
  const { lower, upper } = log2Bounds(b.mid);
  const away = upper.int >= 0n ? upper : lower;
  return Number(away.int) + away.frac;
}

// ---------------------------------------------------------------------------
// Certification

/**
 * Whether `b` certifies `digits` significant digits in `mode` (D7 of the
 * plan): its two ends, `mid - rad` and `mid + rad`, round to the same
 * `digits`-digit value in `mode`. Rounding is monotone, so every value
 * between them rounds to it too, and the shown digits are what rounding
 * the true value would give: correctly rounded, not merely close. The
 * ends are formed exactly where the radius can be formed and aligned with
 * the midpoint within the hard bound, and otherwise the distance from the
 * midpoint to the nearest rounding boundary is measured against the
 * radius (`certifiesByBoundary`), erring only toward certifying less. An
 * exact ball certifies every count; an unbounded one none; a ball
 * containing zero none, since its ends differ in sign.
 */
export function certifies(
  b: Ball,
  digits: Precision,
  mode: RoundingMode,
): boolean {
  if (b.rad.kind === "unbounded") return false;
  if (b.rad.mant === 0n) return true;
  const rad = radiusScaled(b.rad);
  if (rad !== undefined) {
    const lower = subtract(b.mid, rad, LIMIT_BITS);
    const upper = add(b.mid, rad, LIMIT_BITS);
    if (lower.ok && upper.ok) {
      return equals(
        roundTo(lower.value, digits, mode),
        roundTo(upper.value, digits, mode),
      );
    }
  }
  return certifiesByBoundary(b, digits, mode);
}

/**
 * Certification by the distance to the nearest rounding boundary (D7,
 * docs/decimal.md), for a radius that cannot be formed or aligned: the
 * ends round alike exactly when no boundary of the `digits`-digit cells
 * lies within the radius of the midpoint. In the magnitude's units `u`,
 * `10^(e - digits + 1)` for the midpoint's decimal exponent `e`, the
 * boundaries lie at the whole units under a directed mode and at the
 * half units under a nearest one, and the cells below `10^e` are a tenth
 * as wide, so the boundary just below that power is taken too; the
 * distance is exact, an arithmetic within the midpoint's own digits, and
 * is compared with the radius exactly or by the bounds, a distance the
 * bounds cannot tell from the radius certifying nothing. A ball
 * containing zero certifies nothing.
 */
function certifiesByBoundary(
  b: Ball,
  digits: Precision,
  mode: RoundingMode,
): boolean {
  if (b.rad.kind === "unbounded" || containsZero(b)) return false;
  const nearest =
    mode === "halfEven" ||
    mode === "halfAwayFromZero" ||
    mode === "halfTowardZero";
  const mid = absolute(b.mid);
  const unitExp = decimalExponent(mid) - BigInt(digits) + 1n;
  // The midpoint in units: its integer part has `digits` digits.
  const q = atExponent(mid, mid.exp - unitExp);
  const whole = trunc(q, LIMIT_BITS);
  if (whole === undefined) return false;
  const fraction = subtract(q, whole, LIMIT_BITS);
  if (!fraction.ok) return false;
  const f = fraction.value;
  let distance = nearest
    ? absolute(settledSum(subtract(f, HALF, LIMIT_BITS)))
    : minimum(f, settledSum(subtract(ONE, f, LIMIT_BITS)));
  // The boundary just below 10^e, which is 10^(digits - 1) units: at the
  // power itself under a directed mode, a twentieth of a unit below it
  // under a nearest one.
  const power = scaledPowerOfTen(BigInt(digits - 1));
  let below = settledSum(subtract(q, power, LIMIT_BITS));
  if (nearest) below = settledSum(add(below, TWENTIETH, LIMIT_BITS));
  distance = minimum(distance, below);
  if (isZero(distance)) return false;
  return (
    compareWithRadius(atExponent(distance, distance.exp + unitExp), b.rad) === 1
  );
}

/** `s` with its exponent replaced, the canonical mantissa kept: `s × 10^(exp - s.exp)`; zero stays zero. */
function atExponent(s: Scaled, exp: bigint): Scaled {
  return isZero(s) ? ZERO : { mant: s.mant, exp };
}

/** The lesser of two `Scaled`s. */
function minimum(a: Scaled, b: Scaled): Scaled {
  return compare(a, b) <= 0 ? a : b;
}

/** A sum or difference within the midpoint's own digits, which always aligns. */
function settledSum(result: Result<Scaled, BallError>): Scaled {
  if (!result.ok) throw new Error("A sum within a value's digits aligns");
  return result.value;
}

const HALF: Scaled = { mant: { num: 5n, den: 1n }, exp: -1n };
const TWENTIETH: Scaled = { mant: { num: 5n, den: 1n }, exp: -2n };

/**
 * The largest `d <= maxDigits` that `b` certifies in `mode`, or 0 when it
 * certifies none. Certification is not monotone in `d`: `[1.246, 1.254]`
 * certifies three digits, both ends rounding to `1.25`, and not two,
 * `1.25` being a two-digit tie; so the counts are tried from the top
 * down, and the first that certifies is the answer. The scan starts where
 * the radius allows: two ends within `2 rad` of each other cannot share a
 * cell narrower than that, which bounds `d` by the exponents of the
 * midpoint and the radius.
 */
export function certifiedDigits(
  b: Ball,
  maxDigits: Precision,
  mode: RoundingMode,
): number {
  if (b.rad.kind === "unbounded" || containsZero(b)) {
    return isExactZero(b) ? maxDigits : 0;
  }
  if (b.rad.mant === 0n) return maxDigits;
  const radExp = decimalExponentOfLog2(log2OfRadius(b.rad)).exp;
  const atMost = decimalExponent(b.mid) + 1n - radExp + 2n;
  const start = atMost < BigInt(maxDigits) ? Number(atMost) : maxDigits;
  for (let d = start; d >= 1; d--) {
    if (certifies(b, d, mode)) return d;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Helpers

function isExactZero(b: Ball): boolean {
  return isZero(b.mid) && isZeroRadius(b.rad);
}

/** The exact value of a bounded radius, for the tests and the display. */
export function radiusValue(rad: Radius): Scaled | undefined {
  return radiusScaled(rad);
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
