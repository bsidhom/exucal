// What a built-in function is: the type of the functions the core
// implements in code beside the ones a definitions file defines, its
// errors, and the rule helpers the built-ins share. docs/builtins.md is the
// design and docs/calculator-plan.md (task 3.2, then 3.4 and 3.6 to 3.11)
// places them. A built-in has a name, the count of arguments it takes, a
// dimension rule, which says what dimensions its arguments must have and
// what dimension its result has, and `apply`, the function itself from
// balls to a ball at a working context. Each built-in is defined in a
// module of its own under builtins/ (several share one only when they
// share internal machinery), and builtins.ts gathers them into the map the
// table and the build take; this module holds what every one of them
// imports, so that no module under builtins/ depends on the map.
//
// Two rules hold for every built-in (docs/builtins.md, "The rules every
// built-in follows"). A built-in returns the kernel's ball as `fixedToBall`
// hands it back, or an exact ball for an exact case, and rounds in no
// mode: the evaluator settles every result it produces (D15), and the mode
// is the display's. And an argument of unbounded radius gives the function
// of its midpoint with an unbounded radius, as `rootBall` rules.
//
// A built-in lives in the function namespace beside the defined functions
// (table.ts resolves defined functions first, the build keeps the two
// disjoint, and a definition named like a built-in is a duplicate), so it
// is called as they are, `exp(1)`, `atan2(3 m, 4 m)`, and a definition body
// may call it. It has no inverse, so its name is not a `want`.
//
// The errors are data, worded by messages.ts. A dimension rule fails on the
// argument that has the wrong dimension, with the dimension wanted and the
// conformance error between them, on two arguments that must conform to
// each other and do not, or because the rule wants the radian kind and the
// table declares no `radian` primitive (D11: the rule names the primitive
// by convention, and a table without it has no angles). `apply` fails with
// a `domain` error on an argument outside the function's domain throughout
// its ball, naming the argument and the reason, with `unresolved` on an
// argument whose ball straddles an edge of the domain, or another point
// the result depends on which side of it lies (D4), naming the argument
// and the edge, and with the ball errors a computation can raise.
//
// The set the app has is builtins.ts's `BUILTINS`; the table, the build and
// the tests take a set as a parameter with that one as the default, so that
// a test can inject a built-in of its own.

import {
  magnitudeAbove,
  magnitudeBelow,
  position,
  type Ball,
  type BallError,
  type Edge,
} from "./ball.ts";
import type { NumberContext } from "./context.ts";
import {
  DIMENSIONLESS,
  checkConformance,
  primitive,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import type { Arity } from "./evaluate.ts";
import {
  UNBOUNDED,
  addRadius,
  compareRadius,
  multiplyRadius,
  powerOfTwoRadius,
  type Radius,
} from "./radius.ts";
import { err, ok, type Result } from "./result.ts";
import {
  ONE,
  ZERO,
  isZero,
  log2Bounds,
  type Refusal,
  type Scaled,
} from "./scaled.ts";

/** Why a built-in's arguments do not have the dimensions it wants. */
export type DimensionRuleError =
  /**
   * The argument at index `argument` must have the dimension `want` (a
   * plain number, or the radian kind) and does not, as `mismatch` says
   * with the argument's dimension as its `have`.
   */
  | {
      readonly kind: "argumentDimension";
      readonly argument: number;
      readonly want: Dimension;
      readonly mismatch: ConformanceError;
    }
  /** The arguments at `left` and `right` must conform to each other and do not, as `mismatch` says. */
  | {
      readonly kind: "nonconformingArguments";
      readonly left: number;
      readonly right: number;
      readonly mismatch: ConformanceError;
    }
  /** The rule wants the radian kind, and the table declares no `radian` primitive. */
  | { readonly kind: "noAngles" };

/** Why an argument is outside a function's domain. */
export type DomainReason =
  | "notPositive"
  | "baseOne"
  | "outsideClosedUnitInterval"
  | "belowOne"
  | "outsideOpenUnitInterval"
  | "origin"
  /** An exact value that is not a whole number, where the function takes integers (the exact functions, 6.1). */
  | "notInteger"
  /** An inexact value, where the function takes integers known exactly, which no ball is. */
  | "notExact"
  /** A value below where the function is defined: below zero for `factorial`, below `-1` for `doublefactorial`. */
  | "negative";

/** The edge a value straddles (D4), the ball's own type, re-exported for the built-ins. */
export type { Edge } from "./ball.ts";

export type BuiltinError =
  /** The argument at index `argument` is outside the domain throughout its ball, for `reason`. */
  | {
      readonly kind: "domain";
      readonly argument: number;
      readonly reason: DomainReason;
    }
  /** The argument at index `argument` straddles `edge`, and the result depends on which side it lies. */
  | {
      readonly kind: "unresolved";
      readonly argument: number;
      readonly edge: Edge;
    }
  | { readonly kind: "divisionByZero" }
  | { readonly kind: "negativeRadicand"; readonly degree: bigint }
  /** The result would pass a limit and was not computed (scaled.ts). */
  | Refusal;

/**
 * The dimension rule of a built-in: the dimension of its result for the
 * dimensions of its arguments, or why the arguments do not fit.
 */
export type DimensionRule = (
  args: readonly Dimension[],
  primitives: Primitives,
) => Result<Dimension, DimensionRuleError>;

export type Builtin = {
  readonly name: string;
  /** How many arguments it takes; every one of this stage takes a fixed count. */
  readonly arity: Arity;
  readonly dimensions: DimensionRule;
  /** The function itself, on the arguments' magnitudes, at the working context. */
  readonly apply: (
    args: readonly Ball[],
    context: NumberContext,
  ) => Result<Ball, BuiltinError>;
};

/** A set of built-ins by name: the app's (builtins.ts), or a test's. */
export type Builtins = ReadonlyMap<string, Builtin>;

/** The name of the primitive that is an angle, by convention (D11). */
export const RADIAN = "radian";

// ---------------------------------------------------------------------------
// Rules

/**
 * The rule of a function of `count` plain numbers whose result is a plain
 * number: every argument must be dimensionless.
 */
export function plainNumbers(count: number): DimensionRule {
  return (args, primitives) => {
    for (let i = 0; i < count; i++) {
      const checked = checkArgument(args, i, DIMENSIONLESS, primitives);
      if (!checked.ok) return checked;
    }
    return ok(DIMENSIONLESS);
  };
}

/**
 * The rule of a function of one angle whose result is a plain number
 * (`sin`, `cos`, `tan`; D11): the argument must have the radian kind, and
 * a table that declares no `radian` primitive has no angles (`noAngles`).
 */
export const angleToNumber: DimensionRule = (args, primitives) => {
  const radian = angle(primitives);
  if (radian === undefined) return err({ kind: "noAngles" });
  const checked = checkArgument(args, 0, radian, primitives);
  return checked.ok ? ok(DIMENSIONLESS) : checked;
};

/**
 * The rule of a function of one plain number whose result is an angle
 * (`asin`, `acos`, `atan`; D11): the result has the radian kind, so a
 * table that declares no `radian` primitive has no such function
 * (`noAngles`), and the argument must be dimensionless.
 */
export const numberToAngle: DimensionRule = (args, primitives) => {
  const radian = angle(primitives);
  if (radian === undefined) return err({ kind: "noAngles" });
  const checked = checkArgument(args, 0, DIMENSIONLESS, primitives);
  return checked.ok ? ok(radian) : checked;
};

/**
 * The rule of `atan2(y, x)` (D11): the two arguments must conform to each
 * other, kinds included (`nonconformingArguments` otherwise), and the
 * result has the radian kind, so a table without it has no `atan2`.
 */
export const conformingToAngle: DimensionRule = (args, primitives) => {
  const radian = angle(primitives);
  if (radian === undefined) return err({ kind: "noAngles" });
  const conformance = checkConformance(
    args[0] ?? DIMENSIONLESS,
    args[1] ?? DIMENSIONLESS,
    primitives,
  );
  if (conformance.ok) return ok(radian);
  return err({
    kind: "nonconformingArguments",
    left: 0,
    right: 1,
    mismatch: conformance.error,
  });
};

/**
 * Whether the argument at `index` of `args` has the dimension `want`, by
 * the conformance check, so that a dimension mismatch is told from a
 * kind mismatch as it is everywhere else.
 */
export function checkArgument(
  args: readonly Dimension[],
  index: number,
  want: Dimension,
  primitives: Primitives,
): Result<undefined, DimensionRuleError> {
  const have = args[index] ?? DIMENSIONLESS;
  const conformance = checkConformance(have, want, primitives);
  if (conformance.ok) return conformance;
  return err({
    kind: "argumentDimension",
    argument: index,
    want,
    mismatch: conformance.error,
  });
}

/**
 * The rule of a function of one argument of any dimension, kinds
 * included, whose result has the argument's dimension: `approx` (4.10),
 * ahead of the exact functions D14 describes.
 */
export const sameAsArgument: DimensionRule = (args) =>
  ok(args[0] ?? DIMENSIONLESS);

/**
 * The dimension of an angle, the radian kind, in a table whose
 * `primitives` declare `radian`; `undefined` when they do not, and the
 * table has no angles.
 */
export function angle(primitives: Primitives): Dimension | undefined {
  return primitives.has(RADIAN) ? primitive(RADIAN) : undefined;
}

// ---------------------------------------------------------------------------
// The helpers of `apply`

/**
 * Whether `x`, the argument at index `argument`, is positive throughout:
 * a `domain` error (`notPositive`) when it is not positive anywhere, its
 * interval ending at or below zero, and `unresolved` at edge zero when it
 * reaches both zero and positive values, or is unbounded.
 */
export function checkPositive(
  x: Ball,
  argument: number,
): Result<undefined, BuiltinError> {
  switch (position(x, ZERO)) {
    case "above":
      return ok(undefined);
    case "below":
    case "touchingBelow":
    case "at":
      return err({ kind: "domain", argument, reason: "notPositive" });
    default:
      return err({ kind: "unresolved", argument, edge: ZERO });
  }
}

/**
 * Where `x` lies against zero: `positive` or `negative` throughout,
 * exactly `zero`, or `straddles` when its interval contains zero without
 * being it, touching it included, since a function that changes at zero
 * (`0^y` at `y = 0`) cannot be decided there; an unbounded `x` straddles.
 */
export function sideOfZero(
  x: Ball,
): "positive" | "negative" | "zero" | "straddles" {
  switch (position(x, ZERO)) {
    case "above":
      return "positive";
    case "below":
      return "negative";
    case "at":
      return "zero";
    default:
      return "straddles";
  }
}

/**
 * The fraction bits a value of magnitude below one needs beyond the
 * working bits to keep its digits through the kernel: its negative binary
 * exponent, from the lower bound of `log2Bounds`, held to the range limit
 * of `context`, since the kernel is handed nothing wider (a value below
 * `2^-maxBits` converts to zero within an ulp there; `isTiny` is the rule
 * that catches such a value first); zero for zero and for a magnitude at
 * or above one.
 */
export function extraBits(s: Scaled, context: NumberContext): number {
  if (isZero(s)) return 0;
  const { int } = log2Bounds(s).lower;
  if (int >= 0n) return 0;
  return -int > BigInt(context.maxBits) ? context.maxBits : Number(-int);
}

/**
 * Whether the bounded `x` lies throughout below `2^-maxBits` in
 * magnitude, the range limit of `context`: below what the kernel can be
 * handed at any bits within the limit, so a built-in answers it by the
 * value's expansion at zero (`tinyOdd`, `tinyEven`) rather than by the
 * kernel.
 */
export function isTiny(x: Ball, context: NumberContext): boolean {
  return (
    compareRadius(
      magnitudeAbove(x),
      powerOfTwoRadius(-BigInt(context.maxBits)),
    ) < 0
  );
}

/**
 * Whether the bounded `x` reaches `2^maxBits` in magnitude, the range
 * limit of `context`: beyond what the kernel can be handed, so a routine
 * that takes the value itself refuses it as `tooLarge`.
 */
export function isHuge(x: Ball, context: NumberContext): boolean {
  return (
    compareRadius(
      magnitudeAbove(x),
      powerOfTwoRadius(BigInt(context.maxBits)),
    ) >= 0
  );
}

/**
 * Whether the bounded `x` lies throughout at or beyond `2^bits` in
 * magnitude: where the saturations of `atan`, `asinh` and `acosh` hold
 * (docs/decimal.md, "The kernel's boundary").
 */
export function isBeyond(x: Ball, bits: number): boolean {
  return compareRadius(magnitudeBelow(x), powerOfTwoRadius(BigInt(bits))) >= 0;
}

/**
 * `f(x)` for an odd `f` with `|f(x) - x| <= |x|^3` near zero (the sine,
 * the tangent, the arctangent and the hyperbolic three, and their
 * inverses) on a tiny `x`: `x` itself, within the cube of its magnitude
 * bound beside its radius.
 */
export function tinyOdd(x: Ball): Ball {
  return { mid: x.mid, rad: addRadius(x.rad, cubeOf(magnitudeAbove(x))) };
}

/**
 * `f(x)` for an even `f` with `|f(x) - 1| <= x^2` near zero (the cosine
 * and the hyperbolic cosine) on a tiny `x`: one, within the square of its
 * magnitude bound.
 */
export function tinyEven(x: Ball): Ball {
  const m = magnitudeAbove(x);
  return { mid: ONE, rad: multiplyRadius(m, m) };
}

function cubeOf(rad: Radius): Radius {
  return multiplyRadius(rad, multiplyRadius(rad, rad));
}

/** The result of a call on the midpoints of unbounded arguments, with an unbounded radius. */
export function unboundedOf(
  result: Result<Ball, BuiltinError>,
): Result<Ball, BuiltinError> {
  return result.ok ? ok({ mid: result.value.mid, rad: UNBOUNDED }) : result;
}

/**
 * A ball operation's error as a built-in's: an `unresolved` is the
 * argument at index `argument` straddling the edge the operation named,
 * the errors the two share are themselves, and a parse error cannot arise
 * from a computation.
 */
export function fromBallError(
  error: BallError,
  argument: number,
): BuiltinError {
  switch (error.kind) {
    case "unresolved":
      return { kind: "unresolved", argument, edge: error.edge };
    case "divisionByZero":
    case "negativeRadicand":
    case "tooLarge":
    case "overflow":
    case "underflow":
      return error;
    case "invalidNumber":
      throw new Error("A computation does not parse a number");
  }
}
