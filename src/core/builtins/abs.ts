// `abs` and `sign` (devdocs/builtins.md, "The exact functions"): the
// magnitude and the side of a value, the two exact functions
// that take any quantity, since both are invariant under the unit's
// scale. `abs` keeps its argument's dimension; `sign` is a plain number.
// `abs` of a ball is the midpoint's magnitude with the same radius, which
// contains the magnitude of every value in the ball; `sign` is exact for
// a ball of definite sign and `unresolved` at zero for one touching or
// reaching across it, since the side is what it answers. An unbounded
// radius gives the function of the midpoint, unbounded.

import { exact, type Ball } from "../ball.ts";
import {
  anyToNumber,
  sameAsArgument,
  sideOfZero,
  unboundedOf,
  unresolvedAt,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import { ok, type Result } from "../result.ts";
import { ONE, ZERO, absolute, fromInteger, sign } from "../scaled.ts";

/** `|x|`: the midpoint's magnitude with the same radius, which contains the magnitude of every value in `x`. */
export function absBall(x: Ball): Ball {
  return { mid: absolute(x.mid), rad: x.rad };
}

/** The sign of `x`, exact where its side of zero is known. */
export function signBall(x: Ball): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(ok(exact(fromInteger(BigInt(sign(x.mid))))));
  }
  switch (sideOfZero(x)) {
    case "positive":
      return ok(exact(ONE));
    case "negative":
      return ok(exact(fromInteger(-1n)));
    case "zero":
      return ok(exact(ZERO));
    case "straddles":
      return unresolvedAt(0, ZERO);
  }
}

export const abs: Builtin = {
  name: "abs",
  arity: { min: 1, max: 1 },
  dimensions: sameAsArgument,
  apply: ([x]) => ok(absBall(x!)),
};

export const signFn: Builtin = {
  name: "sign",
  arity: { min: 1, max: 1 },
  dimensions: anyToNumber,
  apply: ([x]) => signBall(x!),
};
