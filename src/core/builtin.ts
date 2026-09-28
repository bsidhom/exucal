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

import { type Ball } from "./ball.ts";
import { type NumberContext } from "./context.ts";
import {
  DIMENSIONLESS,
  checkConformance,
  primitive,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import { type Arity } from "./evaluate.ts";
import { type Rational } from "./rational.ts";
import { err, ok, type Result } from "./result.ts";

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
  | "origin";

/**
 * What a value that cannot be told from it straddles (D4): a rational
 * point, zero for a divisor or a base, `1` or `-1` at the end of a
 * domain, or a pole of the tangent.
 */
export type Edge = Rational | "pole";

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
  | { readonly kind: "tooLarge" };

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
 * The dimension of an angle, the radian kind, in a table whose
 * `primitives` declare `radian`; `undefined` when they do not, and the
 * table has no angles.
 */
export function angle(primitives: Primitives): Dimension | undefined {
  return primitives.has(RADIAN) ? primitive(RADIAN) : undefined;
}
