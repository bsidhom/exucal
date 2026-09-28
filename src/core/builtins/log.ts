// The logarithms: `ln(x)`, `log10(x)`, `log2(x)` and `log(b, x)`, the base
// first (docs/builtins.md), on the kernel's `lnFixed` (fixed-log.ts) and
// its memoized `ln(2)` and `ln(10)`. docs/calculator-plan.md (task 3.7)
// places them. They share one module because they share the domain rule
// and the kernel call: a logarithm takes a positive plain number, so an
// argument that is not positive throughout its ball is a `domain` error
// (`notPositive`), and one that straddles zero is `unresolved` at edge
// zero (D4), as is one that reaches within an ulp of zero at the working
// bits. The base of `log` must also not be one: a base that is exactly one
// is a `domain` error (`baseOne`), and one that straddles one, or whose
// logarithm cannot be told from zero at the working bits, is `unresolved`
// at edge `1`. An argument of unbounded radius gives the function of its
// midpoint with an unbounded radius.
//
// The exact cases: `ln(1)` is zero; `ln(2)` and `ln(10)` are their memos;
// `log10` and `log2` of an exact integer power of the base, either way
// (`log10(1000)`, `log2(1/8)`), are that integer, found by repeated
// division of the numerator or the denominator; `log(b, x)` of exact
// arguments is the integer `n` with `x = b^n` (`log(2, 8)`, `log(3, 1/9)`)
// or `1/n` with `b = x^n` (`log(8, 2)`), and `log(b, 1)` is zero; a
// rational exponent in general is not looked for (`log(4, 8)` is `≈ 1.5`).
// Every other value is the kernel's `ln`, or the quotient of two, handed
// back as the kernel's ball for the evaluator to settle (D15). The
// argument is scaled to order one by a power of two before it is
// converted, and the power goes to the kernel, so that `ln(1e-300)` loses
// nothing to the conversion.

import { containsZero, exact, isExact, type Ball } from "../ball.ts";
import { plainNumbers, type Builtin, type BuiltinError } from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { ln10Fixed, ln2Fixed, lnFixed } from "../fixed-log.ts";
import {
  bitsFor,
  divideFixed,
  fixedFromBall,
  fixedToBall,
  keepSignificant,
  type Fixed,
} from "../fixed.ts";
import { UNBOUNDED, radiusUpper, shiftRadius } from "../radius.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  bitLength,
  compare,
  equals,
  invert,
  rational,
  scaleByPowerOfTwo,
  sign,
  subtract,
  type Rational,
} from "../rational.ts";
import { err, ok, type Result } from "../result.ts";

const TWO = rational(2n);
const TEN = rational(10n);

/** `ln(x)` at the context, as the header says. */
export function lnBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded")
    return unbounded(lnBall(exact(x.mid), context));
  if (isExact(x) && equals(x.mid, ONE)) return ok(exact(ZERO));
  const f = lnKernel(x, context, 0);
  return f.ok ? ok(fixedToBall(f.value)) : f;
}

/** `log10(x)` at the context: exact for an integer power of ten, else `ln(x) / ln(10)`. */
export function log10Ball(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return logOfConstantBase(x, context, TEN, ln10Fixed);
}

/** `log2(x)` at the context: exact for an integer power of two, else `ln(x) / ln(2)`. */
export function log2Ball(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return logOfConstantBase(x, context, TWO, ln2Fixed);
}

/** `log(b, x)` at the context, the base first, as the header says. */
export function logBall(
  b: Ball,
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  if (b.rad.kind === "unbounded" || x.rad.kind === "unbounded") {
    return unbounded(
      logBall(
        b.rad.kind === "unbounded" ? exact(b.mid) : b,
        x.rad.kind === "unbounded" ? exact(x.mid) : x,
        context,
      ),
    );
  }
  const positiveBase = checkPositive(b, 0);
  if (!positiveBase.ok) return positiveBase;
  if (isExact(b)) {
    if (equals(b.mid, ONE))
      return err({ kind: "domain", argument: 0, reason: "baseOne" });
  } else if (compare(absolute(subtract(b.mid, ONE)), radiusUpper(b.rad)) <= 0) {
    return err({ kind: "unresolved", argument: 0, edge: ONE });
  }
  const positive = checkPositive(x, 1);
  if (!positive.ok) return positive;
  if (isExact(x)) {
    if (equals(x.mid, ONE)) return ok(exact(ZERO));
    if (isExact(b)) {
      const n = integerPower(b.mid, x.mid);
      if (n !== undefined) return ok(exact(rational(n)));
      const inverse = integerPower(x.mid, b.mid);
      if (inverse !== undefined) return ok(exact(rational(1n, inverse)));
    }
  }
  const lnX = lnKernel(x, context, 1);
  if (!lnX.ok) return lnX;
  const lnB = lnKernel(b, context, 0);
  if (!lnB.ok) return lnB;
  if (abs(lnB.value.value) <= lnB.value.error) {
    return err({ kind: "unresolved", argument: 0, edge: ONE });
  }
  return ok(quotient(lnX.value, lnB.value, context));
}

/**
 * `ln(x) / ln(base)` for the constant `base` whose logarithm `constant`
 * gives from its memo, exact when `x` is an exact integer power of it.
 */
function logOfConstantBase(
  x: Ball,
  context: NumberContext,
  base: Rational,
  constant: (bits: number, ceilingBits: number) => Fixed,
): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unbounded(logOfConstantBase(exact(x.mid), context, base, constant));
  }
  if (isExact(x)) {
    const positive = checkPositive(x, 0);
    if (!positive.ok) return positive;
    const n = integerPower(base, x.mid);
    if (n !== undefined) return ok(exact(rational(n)));
  }
  const lnX = lnKernel(x, context, 0);
  if (!lnX.ok) return lnX;
  const divisor = constant(
    bitsFor(context.precision),
    bitsFor(context.ceiling),
  );
  return ok(quotient(lnX.value, divisor, context));
}

/** The quotient of two logarithms as a ball, cut to the bits its magnitude calls for. */
function quotient(a: Fixed, b: Fixed, context: NumberContext): Ball {
  return fixedToBall(
    keepSignificant(divideFixed(a, b), bitsFor(context.precision)),
  );
}

/**
 * `ln` of a bounded `x`, the argument at index `argument`, through the
 * kernel: the domain rule, the memos for `ln(2)` and `ln(10)`, and
 * otherwise the value scaled to order one by an exact power of two,
 * converted at the working bits, and passed with the power; a scaled
 * value that reaches within an ulp of zero at those bits is `unresolved`
 * at edge zero.
 */
function lnKernel(
  x: Ball,
  context: NumberContext,
  argument: number,
): Result<Fixed, BuiltinError> {
  const positive = checkPositive(x, argument);
  if (!positive.ok) return positive;
  const bits = bitsFor(context.precision);
  const ceilingBits = bitsFor(context.ceiling);
  if (isExact(x)) {
    if (equals(x.mid, TWO)) return ok(ln2Fixed(bits, ceilingBits));
    if (equals(x.mid, TEN)) return ok(ln10Fixed(bits, ceilingBits));
  }
  const scale = BigInt(bitLength(x.mid.num) - bitLength(x.mid.den));
  const scaled: Ball = {
    mid: scaleByPowerOfTwo(x.mid, -scale),
    rad: shiftRadius(x.rad, -scale),
  };
  const f = fixedFromBall(scaled, bits);
  if (f.value <= f.error) {
    return err({ kind: "unresolved", argument, edge: ZERO });
  }
  return ok(lnFixed(f, bits, ceilingBits, Number(scale)));
}

/**
 * Whether the bounded `x`, the argument at index `argument`, is positive
 * throughout: a `domain` error when it is not positive anywhere, and
 * `unresolved` at edge zero when it straddles zero.
 */
function checkPositive(
  x: Ball,
  argument: number,
): Result<undefined, BuiltinError> {
  if (isExact(x)) {
    return sign(x.mid) > 0
      ? ok(undefined)
      : err({ kind: "domain", argument, reason: "notPositive" });
  }
  if (compare(add(x.mid, radiusUpper(x.rad)), ZERO) <= 0) {
    return err({ kind: "domain", argument, reason: "notPositive" });
  }
  if (containsZero(x)) return err({ kind: "unresolved", argument, edge: ZERO });
  return ok(undefined);
}

/** The result of a call on the midpoint, with an unbounded radius. */
function unbounded(
  result: Result<Ball, BuiltinError>,
): Result<Ball, BuiltinError> {
  return result.ok ? ok({ mid: result.value.mid, rad: UNBOUNDED }) : result;
}

/**
 * The integer `n` with `value = base^n`, for a positive `base` other than
 * one and a positive `value`, or `undefined` when there is none: zero for
 * a value of one, else a positive power of the base or of its reciprocal.
 */
export function integerPower(
  base: Rational,
  value: Rational,
): bigint | undefined {
  if (equals(value, ONE)) return 0n;
  const positive = positivePower(base, value);
  if (positive !== undefined) return positive;
  const reciprocal = invert(base);
  if (!reciprocal.ok) return undefined;
  const negative = positivePower(reciprocal.value, value);
  return negative === undefined ? undefined : -negative;
}

/**
 * The `n` of at least one with `value = base^n`, or `undefined`: with
 * `base = p/q` and `value = r/s` in lowest terms, `r = p^n` and `s = q^n`,
 * so `n` is read off one of them by repeated division and checked on the
 * other.
 */
function positivePower(base: Rational, value: Rational): bigint | undefined {
  if (base.num === 1n) {
    return value.num === 1n ? exponentIn(value.den, base.den) : undefined;
  }
  const n = exponentIn(value.num, base.num);
  if (n === undefined || base.den ** n !== value.den) return undefined;
  return n;
}

/** The `n` of at least one with `a = b^n`, for `b` of at least two, or `undefined`. */
function exponentIn(a: bigint, b: bigint): bigint | undefined {
  if (a < 2n) return undefined;
  let n = 0n;
  for (let rest = a; rest !== 1n; rest /= b, n++) {
    if (rest % b !== 0n) return undefined;
  }
  return n;
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

export const ln: Builtin = {
  name: "ln",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => lnBall(x!, context),
};

export const log10: Builtin = {
  name: "log10",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => log10Ball(x!, context),
};

export const log2: Builtin = {
  name: "log2",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => log2Ball(x!, context),
};

export const log: Builtin = {
  name: "log",
  arity: { min: 2, max: 2 },
  dimensions: plainNumbers(2),
  apply: ([b, x], context) => logBall(b!, x!, context),
};
