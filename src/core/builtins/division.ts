// `div` and `mod` (devdocs/builtins.md, "The exact functions"): floored
// division and its remainder as one definition,
// `div(a, b) = floor(a / b)` and `mod(a, b) = a - b × div(a, b)`, so that
// `a = b × div(a, b) + mod(a, b)` exactly and the remainder is zero or has
// the divisor's sign (Boute's F-division). Both take two quantities of one
// dimension, being invariant under the unit's scale; `div` is a count and
// `mod` has the arguments' dimension.
//
// One division serves both. The quotient `q = a / b` is formed once, as a
// ball, and `div` is its floor (round.ts decides the ball against the
// cell of the floor), while `mod` is `(q - floor(q)) × b` from the same
// quotient: the same value as `a - b × floor(q)`, exact on exact
// arguments, and it never forms the product `b × floor(q)`, which passes
// the exponent bound where `a` and `b` lie at its opposite ends though
// the remainder, within `|b|`, does not.

import {
  addBalls,
  divideBalls,
  exact,
  isExact,
  multiplyBalls,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  tooLarge,
  conformingArguments,
  fromBallError,
  sideOfZero,
  unresolvedAt,
  type Builtin,
  type BuiltinError,
  UNKNOWN_NEED,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { err, ok, type Result } from "../result.ts";
import {
  ZERO,
  fromInteger,
  isRefusal,
  isZero,
  multiply,
  subtract,
} from "../scaled.ts";
import { floorBall } from "./round.ts";

/** The quotient `a / b` as a ball with its floor, or the floor alone where the quotient is below the exponent bound. */
type Quotient =
  | { readonly kind: "ball"; readonly quotient: Ball; readonly count: Ball }
  | { readonly kind: "tiny"; readonly count: Ball };

/**
 * `floor(a / b)` with the quotient it was taken from: the quotient ball
 * floored, `unresolved` on `a` at the multiple of `b` the quotient
 * straddles (the boundary times `b`'s midpoint, where that can be
 * formed, so that the message names a value of `a`), and the quotient's
 * own failures, a division by zero or a divisor straddling zero. A
 * quotient below the exponent bound in magnitude, which the division
 * refuses as `underflow`, has a floor all the same, zero or minus one by
 * the signs, or `unresolved` at zero when `a` straddles it; one past the
 * top is `overflow`, its floor being past the bound too.
 */
function quotientFloor(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Quotient, BuiltinError> {
  const quotient = divideBalls(a, b, context);
  if (!quotient.ok) {
    if (quotient.error.kind !== "underflow") {
      return err(fromBallError(quotient.error, 1));
    }
    const sideA = sideOfZero(a);
    const sideB = sideOfZero(b);
    if (sideA === "zero") return ok({ kind: "tiny", count: exact(ZERO) });
    if (sideA === "straddles" || sideB === "straddles") {
      return unresolvedAt(sideA === "straddles" ? 0 : 1, ZERO);
    }
    const count = exact(sideA === sideB ? ZERO : fromInteger(-1n));
    return ok({ kind: "tiny", count });
  }
  const floored = floorBall(quotient.value, context);
  if (floored.ok) {
    return ok({ kind: "ball", quotient: quotient.value, count: floored.value });
  }
  if (floored.error.kind !== "unresolved") return floored;
  const edge = floored.error.edge;
  if (typeof edge === "string") return floored;
  const scaledEdge = multiply(edge, b.mid, context.significandLimitBits);
  return unresolvedAt(0, scaledEdge.ok ? scaledEdge.value : edge);
}

/** `div(a, b)`, `floor(a / b)`, as `quotientFloor` takes it. */
export function divBall(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const q = quotientFloor(a, b, context);
  return q.ok ? ok(q.value.count) : q;
}

/**
 * `mod(a, b)`, `a - b × div(a, b)`, computed as `(a / b - div(a, b)) × b`:
 * the same value, exact on exact arguments, and it never forms `b ×
 * div(a, b)`, which passes the exponent bound where `a` and `b` lie at
 * its opposite ends though the remainder, within `|b|`, does not. A
 * quotient past the top, whose floor cannot be formed, is `tooLarge`
 * rather than `overflow`, since no value of the remainder passes the
 * bound; one below the bottom leaves `a`, or `a + b` for the floor of
 * minus one. A remainder whose alignment passes the significand limit
 * (`mod(-1, 1e20000)` has twenty thousand digits) is `tooLarge`, as any
 * exact sum's is.
 */
export function modBall(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const q = quotientFloor(a, b, context);
  if (!q.ok)
    return q.error.kind === "overflow" ? tooLarge("exceeds", UNKNOWN_NEED) : q;
  if (q.value.kind === "tiny") {
    if (isZero(q.value.count.mid)) return ok(a);
    const sum = addBalls(a, b, context);
    return sum.ok ? sum : err(fromBallError(sum.error, 0));
  }
  const { quotient, count } = q.value;
  if (isExact(a) && isExact(b)) {
    const fraction = subtract(
      quotient.mid,
      count.mid,
      context.significandLimitBits,
    );
    if (!fraction.ok) return tooLarge("exceeds", UNKNOWN_NEED);
    // The product is within `|b|`, so it can only fall below the bound.
    const remainder = multiply(
      fraction.value,
      b.mid,
      context.significandLimitBits,
    );
    if (remainder.ok) return ok(exact(remainder.value));
    return isRefusal(remainder.error)
      ? err(remainder.error)
      : tooLarge("exceeds", UNKNOWN_NEED);
  }
  const fraction = subtractBalls(quotient, count, context);
  if (!fraction.ok) return err(fromBallError(fraction.error, 0));
  const remainder = multiplyBalls(fraction.value, b, context);
  return remainder.ok ? remainder : err(fromBallError(remainder.error, 0));
}

export const div: Builtin = {
  name: "div",
  arity: { min: 2, max: 2 },
  dimensions: conformingArguments("number"),
  apply: ([a, b], context) => divBall(a!, b!, context),
};

export const mod: Builtin = {
  name: "mod",
  arity: { min: 2, max: 2 },
  dimensions: conformingArguments("first"),
  apply: ([a, b], context) => modBall(a!, b!, context),
};
