// `beta(a, b)`: the Beta function `Γ(a) Γ(b) / Γ(a + b)`, through
// `lgamma` (gamma.ts, `logGamma`) under the classifier, so that large
// arguments never form a `Γ` that would not fit. devdocs/design/special.md ("`beta`
// (6.4)") is the design and devdocs/history/calculator-plan.md (task 6.4) places
// it. Both arguments are plain numbers and the result is one.
//
// The exact case: positive integers, where `beta(a, b)` is `(a - 1)!
// (b - 1)! / (a + b - 1)!`, formed as the reciprocal of `(a + b - 1)
// binomial(a + b - 2, a - 1)` when that fits the significand limit (`binomialOf`
// predicts and refuses as `binomial` does), and the kernel's value
// otherwise. A pole of `Γ(a)` or `Γ(b)`, an exact non-positive integer,
// is a `domain` error at that argument, and a ball reaching one is
// `unresolved` at the edge `pole` there, as `gamma`'s; a pole of `Γ(a +
// b)` alone, the exact sum a non-positive integer with neither argument
// one, makes the value exactly zero, since `Γ(a + b)` is infinite there,
// and a ball of the sum reaching one is `unresolved` at the pole, at the
// argument of the wider radius.
//
// Otherwise the result is `exp(L)` for `L = lgamma(a) + lgamma(b) -
// lgamma(a + b)`, with the sign the product of the three signs the
// reflection gives, under the classifier of ball.ts (`classifyExp`) on
// `L`, which refuses `overflow` or `underflow` only when every value of
// the arguments puts the result past an edge of the exponent bound
// (`beta(1e19, 1e19)` is `underflow`) and leaves a ball across an edge
// `unresolved` at the bound. The three logarithms cancel when an
// argument is large (`beta(1e15, 1)` is `1e-15`, from logarithms near
// `2^55`), so each is taken at the working bits plus the bits of the
// largest argument's magnitude, uncapped, which keeps the absolute error
// of `L`, the result's relative error, below the working ulp; an
// argument whose magnitude would need more bits than the significand limit allows
// makes the call `tooLarge`, since no value of the difference can be
// certified within the limit (`beta(1e20000, 2)`). The sum `a + b` is
// formed exactly where it aligns within the significand limit, and otherwise as the
// larger within the magnitude of the smaller, the smaller absorbed into
// the radius, as an inexact sum that does not align is (`beta(2.5,
// 1e-20000)` is a value).
// An argument of unbounded radius gives the function at its midpoint
// with an unbounded radius.

import {
  addBalls,
  classifyExp,
  exact,
  isExact,
  magnitudeAbove,
  negateBall,
  subtractBalls,
  type Ball,
  type BallError,
} from "../ball.ts";
import {
  tooLarge,
  fromBallError,
  plainNumbers,
  unboundedOf,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { workingDigits, type NumberContext } from "../context.ts";
import { floatingToBall } from "../digits.ts";
import { expFixed } from "../fixed-exp.ts";
import { bitsFor, fixedFromBall } from "../fixed.ts";
import { addRadius, compareRadius } from "../radius.ts";
import { bitLength, rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import {
  BITS_PER_DIGIT,
  ZERO,
  absolute,
  compare,
  fromRational,
  isInteger,
  sign,
  toRational,
} from "../scaled.ts";
import { isPole, logGamma, magnitudeBits, reachesPole } from "./gamma.ts";
import { binomialOf } from "./integers.ts";

/** `beta(a, b)` at the context, as the header says. */
export function betaBall(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (a.rad.kind === "unbounded" || b.rad.kind === "unbounded") {
    return unboundedOf(
      betaBall(
        a.rad.kind === "unbounded" ? exact(a.mid) : a,
        b.rad.kind === "unbounded" ? exact(b.mid) : b,
        context,
      ),
    );
  }
  if (isPole(a)) return err({ kind: "domain", argument: 0, reason: "pole" });
  if (isPole(b)) return err({ kind: "domain", argument: 1, reason: "pole" });
  const integers = exactIntegers(a, b, context);
  if (integers !== undefined) return integers;
  // The poles of the three before any logarithm, which the retry loop
  // would otherwise pay for at every pass up to the ceiling.
  const atA = reachesPole(a, context);
  if (!atA.ok) return atA;
  const atB = blamed(reachesPole(b, context), 1);
  if (!atB.ok) return atB;
  const wide = wider(a, b);
  const sum = sumOf(a, b, context);
  if (!sum.ok) {
    // A sum at or past the top of the bound has both arguments positive
    // and within a few digits of it (a negative one lies inside a cell
    // below the top, and the other is within the bound), so the result,
    // below 1 / a and 1 / b, lies past the bottom throughout.
    const { kind } = sum.error;
    if (
      kind === "overflow" ||
      (kind === "unresolved" && sum.error.edge === "bound")
    ) {
      return err({ kind: "underflow" });
    }
    return sum;
  }
  if (isPole(sum.value)) return ok(exact(ZERO));
  const atSum = blamed(reachesPole(sum.value, context), wide);
  if (!atSum.ok) return atSum;
  const bits = bitsFor(context.precision);
  const extra = Math.max(
    magnitudeBits(a, context.significandLimitBits),
    magnitudeBits(b, context.significandLimitBits),
    magnitudeBits(sum.value, context.significandLimitBits),
  );
  if (bits + extra > context.significandLimitBits) {
    return tooLarge("exceeds", { kind: "exact", bits: bits + extra });
  }
  const digits = workingDigits(context) + Math.ceil(extra / BITS_PER_DIGIT) + 1;
  const la = blamed(logGamma(a, context, bits + extra, digits), 0);
  if (!la.ok) return la;
  const lb = blamed(logGamma(b, context, bits + extra, digits), 1);
  if (!lb.ok) return lb;
  const ls = blamed(logGamma(sum.value, context, bits + extra, digits), wide);
  if (!ls.ok) return ls;
  const added = addBalls(la.value.value, lb.value.value, context);
  if (!added.ok) return failed(added.error, wide);
  const L = subtractBalls(added.value, ls.value.value, context);
  if (!L.ok) return failed(L.error, wide);
  const negative =
    la.value.negative !== lb.value.negative
      ? !ls.value.negative
      : ls.value.negative;
  switch (classifyExp(L.value, context)) {
    case "overflow":
      return err({ kind: "overflow" });
    case "underflow":
      return err({ kind: "underflow" });
    case "unresolved":
      return err({ kind: "unresolved", argument: wide, edge: "bound" });
    case "compute":
      break;
  }
  const result = floatingToBall(
    expFixed(fixedFromBall(L.value, bits + extra), bits),
    context,
  );
  if (!result.ok) return failed(result.error, wide);
  return ok(negative ? negateBall(result.value) : result.value);
}

/**
 * The exact case: `1 / ((a + b - 1) binomial(a + b - 2, a - 1))` for
 * exact positive integers whose value fits the significand limit; `undefined` when
 * the arguments are not that, or the value does not fit, for the kernel.
 */
function exactIntegers(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> | undefined {
  if (!isExact(a) || !isExact(b)) return undefined;
  if (!isInteger(a.mid) || !isInteger(b.mid)) return undefined;
  if (sign(a.mid) <= 0 || sign(b.mid) <= 0) return undefined;
  const m = toRational(a.mid, context.significandLimitBits);
  const n = toRational(b.mid, context.significandLimitBits);
  if (!m.ok || !n.ok) return undefined;
  const top = m.value.num + n.value.num - 1n;
  const binomial = binomialOf(top - 1n, m.value.num - 1n, context);
  if (!binomial.ok) return undefined;
  const denominator = top * binomial.value;
  if (bitLength(denominator) > context.significandLimitBits) return undefined;
  return ok(exact(fromRational(rational(1n, denominator))));
}

/**
 * `a + b` as a ball: exactly where the operands align within the significand limit,
 * and otherwise the larger within the magnitude of the smaller, as an
 * inexact sum that does not align is formed, since the sum feeds the
 * logarithm, an inexact computation whatever its operands.
 */
function sumOf(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const sum = addBalls(a, b, context);
  if (sum.ok || sum.error.kind !== "tooLarge") {
    return sum.ok ? sum : failed(sum.error, wider(a, b));
  }
  const [larger, smaller] =
    compare(absolute(a.mid), absolute(b.mid)) >= 0 ? [a, b] : [b, a];
  return ok({
    mid: larger.mid,
    rad: addRadius(larger.rad, magnitudeAbove(smaller)),
  });
}

/** The index of the argument of the wider radius, the one an edge of a value both reach is blamed on. */
function wider(a: Ball, b: Ball): 0 | 1 {
  return compareRadius(a.rad, b.rad) >= 0 ? 0 : 1;
}

/** A ball operation's failure as the built-in's, blamed on `argument`. */
function failed(
  error: BallError,
  argument: number,
): Result<never, BuiltinError> {
  return err(fromBallError(error, argument));
}

/** `result` with its failure, when it names an argument, blamed on `argument` instead of the logarithm's own zero. */
function blamed<T>(
  result: Result<T, BuiltinError>,
  argument: number,
): Result<T, BuiltinError> {
  if (result.ok || !("argument" in result.error)) return result;
  return err({ ...result.error, argument });
}

export const beta: Builtin = {
  name: "beta",
  arity: { min: 2, max: 2 },
  dimensions: plainNumbers(2),
  apply: ([a, b], context) => betaBall(a!, b!, context),
};
