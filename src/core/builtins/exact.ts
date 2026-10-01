// The exact functions: `abs`, `sign`, `floor`, `ceil`, `trunc`, `round`,
// `div`, `mod`, `gcd`, `lcm`, `factorial`, `binomial` and
// `doublefactorial` (docs/special.md, "The exact functions"; the plan's
// 6.1 and D22). None needs any precision: each is exact on exact
// arguments, and on an inexact argument is exact where the argument's
// interval decides the answer and `unresolved` at the boundary it
// straddles, which the retry loop narrows (D4). They share one module
// because they share their machinery: the integer checks, the rounding
// of a ball to a cell, and the size predictions.
//
// Dimensions. `abs` keeps its argument's dimension and `sign` takes any
// quantity; `div` and `mod` take two quantities of one dimension, `div`
// a count and `mod` of the arguments' dimension, since both are invariant
// under the unit's scale. `floor`, `ceil`, `trunc` and `round` take a
// plain number: a quantity's magnitude is stored in the primitives, so
// `floor(3.7 ft)` would floor `1.12776 m`, and a function whose answer
// depends on the unit the value is written in is defined only on plain
// numbers (D22). The integer functions take plain numbers.
//
// On balls. `abs` of a ball is the midpoint's magnitude with the same
// radius; `sign` is exact for a ball of definite sign and `unresolved` at
// zero for one touching or reaching across it. The rounding functions
// find the cell the midpoint rounds into and are exact when the ball lies
// strictly inside it, by `position`, and `unresolved` at the cell's
// boundary otherwise, a ball touching a boundary counting as straddling
// it; `div` and `mod` are `floor` of the quotient ball and
// `a - b × div(a, b)`. The integer functions take exact integers: an
// inexact argument is a `domain` error (`notExact`), since `5 ± 1e-30` is
// not known to be `5` and no pass narrows a ball to a point, and an exact
// non-integer another (`notInteger`). An unbounded radius gives the
// function of the midpoint with an unbounded radius, where the function
// takes a ball at all.
//
// `round(x, places)` rounds to a multiple of `10^-places` in the context's
// rounding mode, a negative count rounding to the left of the point; the
// mode surfaces inside an expression here and nowhere else in exact mode
// (D15), which is what a call of `round` asks for. `div` and `mod` are
// floored division as one definition, `div(a, b) = floor(a / b)` and
// `mod(a, b) = a - b × div(a, b)`, so that `a = b × div(a, b) + mod(a,
// b)` exactly and the remainder is zero or has the divisor's sign (D22;
// Boute's F-division). `gcd` and `lcm` are non-negative, on absolute
// values. `factorial`, `binomial` and `doublefactorial` predict their
// result's bits from Stirling's formula, within a bit, and refuse past the
// range limit before computing, with the generic `tooLarge`, whose message
// names Most bits; `approx` around the argument is no remedy here, an
// inexact argument being a `domain` error.

import {
  addBalls,
  divideBalls,
  exact,
  isExact,
  multiplyBalls,
  position,
  subtractBalls,
  type Ball,
} from "../ball.ts";
import {
  checkArgument,
  fromBallError,
  plainNumbers,
  sameAsArgument,
  sideOfZero,
  unboundedOf,
  type Builtin,
  type BuiltinError,
  type DimensionRule,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { DIMENSIONLESS, checkConformance } from "../dimension.ts";
import { LIMIT_BITS, gcd as gcdOf, rational } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import { divideRounded, type RoundingMode } from "../rounding.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  decimalDigits,
  fromRational,
  isInteger,
  isRefusal,
  isZero,
  multiply,
  scaled,
  sign,
  subtract,
  toRational,
  trunc,
  type Scaled,
} from "../scaled.ts";

// ---------------------------------------------------------------------------
// Shared pieces

/** `n` as an exact `Scaled`. */
function integer(n: bigint): Scaled {
  return fromRational(rational(n));
}

/** The argument at `index` straddles `edge`, and the result depends on the side. */
function unresolvedAt(
  index: number,
  edge: Scaled,
): Result<never, BuiltinError> {
  return err({ kind: "unresolved", argument: index, edge });
}

const TOO_LARGE: Result<never, BuiltinError> = err({ kind: "tooLarge" });

function magnitude(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/** About the bits of a decimal digit, as scaled.ts sizes a mantissa. */
const BITS_PER_DIGIT = 3.33;

/**
 * The exact integer the argument at `index` is, formed within the range
 * limit of `context`: a `domain` error for an inexact ball (`notExact`),
 * which is not known to be any integer, or an exact non-integer
 * (`notInteger`), and `tooLarge` for an integer whose power of ten cannot
 * be formed within the limit.
 */
export function integerOf(
  x: Ball,
  index: number,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (!isExact(x)) {
    return err({ kind: "domain", argument: index, reason: "notExact" });
  }
  if (!isInteger(x.mid)) {
    return err({ kind: "domain", argument: index, reason: "notInteger" });
  }
  const formed = toRational(x.mid, context.maxBits);
  if (!formed.ok) return TOO_LARGE;
  return ok(formed.value.num);
}

/** The rule of a function of two quantities of one dimension, kinds included, whose result is `result`. */
function conforming(result: "number" | "first"): DimensionRule {
  return (args, primitives) => {
    const left = args[0] ?? DIMENSIONLESS;
    const conformance = checkConformance(
      left,
      args[1] ?? DIMENSIONLESS,
      primitives,
    );
    if (conformance.ok) return ok(result === "number" ? DIMENSIONLESS : left);
    return err({
      kind: "nonconformingArguments",
      left: 0,
      right: 1,
      mismatch: conformance.error,
    });
  };
}

/** The rule of a function of one quantity of any dimension whose result is a plain number. */
const anyToNumber: DimensionRule = () => ok(DIMENSIONLESS);

// ---------------------------------------------------------------------------
// abs and sign

/** `|x|`: the midpoint's magnitude with the same radius, which contains the magnitude of every value in `x`. */
export function absBall(x: Ball): Ball {
  return { mid: absolute(x.mid), rad: x.rad };
}

/** The sign of `x`, exact where its side of zero is known. */
export function signBall(x: Ball): Result<Ball, BuiltinError> {
  if (x.rad.kind === "unbounded") {
    return unboundedOf(ok(exact(integer(BigInt(sign(x.mid))))));
  }
  switch (sideOfZero(x)) {
    case "positive":
      return ok(exact(ONE));
    case "negative":
      return ok(exact(integer(-1n)));
    case "zero":
      return ok(exact(ZERO));
    case "straddles":
      return unresolvedAt(0, ZERO);
  }
}

// ---------------------------------------------------------------------------
// The rounding functions on exact values

type Rounding = (s: Scaled) => Result<Scaled, BuiltinError>;

/** `s` toward zero to an integer, formed within `limit` bits. */
export function truncScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = trunc(s, limit);
  return t === undefined ? TOO_LARGE : ok(t);
}

/** The integer `s` plus `n`, formed within the hard bound. */
function stepped(s: Scaled, n: bigint): Result<Scaled, BuiltinError> {
  const sum = add(s, integer(n), LIMIT_BITS);
  return sum.ok ? sum : TOO_LARGE;
}

/** The largest integer at or below `s`. */
export function floorScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = truncScaled(s, limit);
  if (!t.ok) return t;
  return sign(s) < 0 ? stepped(t.value, -1n) : t;
}

/** The smallest integer at or above `s`. */
export function ceilScaled(
  s: Scaled,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isInteger(s)) return ok(s);
  const t = truncScaled(s, limit);
  if (!t.ok) return t;
  return sign(s) > 0 ? stepped(t.value, 1n) : t;
}

/**
 * What a value below a tenth of the unit rounds to, in units, by its
 * sign in `mode`: zero in the modes to nearest and toward zero, one unit
 * away from zero in the directed modes that round away on that side.
 */
function roundedBelowTenth(side: -1 | 0 | 1, mode: RoundingMode): bigint {
  switch (mode) {
    case "awayFromZero":
      return BigInt(side);
    case "ceiling":
      return side > 0 ? 1n : 0n;
    case "floor":
      return side < 0 ? -1n : 0n;
    default:
      return 0n;
  }
}

/**
 * `s` rounded to a multiple of `10^-places` in `mode`, formed within
 * `limit` bits: the count of units, `s × 10^places`, rounded to an
 * integer by `divideRounded`, times the unit. A value that is already
 * such a multiple is returned as it is. The power of ten is formed only
 * where it is small: a count with more digits than the limit holds is
 * `tooLarge`, and a value below a tenth of the unit, whose count is zero
 * or one by the mode, forms none (`round(1e-999999999, 2)` is `0`).
 */
export function roundScaled(
  s: Scaled,
  places: bigint,
  mode: RoundingMode,
  limit: number,
): Result<Scaled, BuiltinError> {
  if (isZero(s)) return ok(ZERO);
  const unit = -places;
  const { num, den } = s.mant;
  if (den === 1n && s.exp >= unit) return ok(s);
  const shift = s.exp - unit;
  let count: bigint;
  if (shift >= 0n) {
    const digits = Number(shift) + decimalDigits(magnitude(num));
    if (digits * BITS_PER_DIGIT > limit) return TOO_LARGE;
    count = divideRounded(num * 10n ** shift, den, mode);
  } else if (-shift > BigInt(decimalDigits(magnitude(num)) + 1)) {
    count = roundedBelowTenth(sign(s), mode);
  } else {
    count = divideRounded(num, den * 10n ** -shift, mode);
  }
  const rounded = scaled(rational(count), unit);
  if (rounded.ok) return rounded;
  return isRefusal(rounded.error) ? err(rounded.error) : TOO_LARGE;
}

// ---------------------------------------------------------------------------
// The rounding functions on balls

/** The open cell of values a rounding takes to one result, `lo < x < hi`, or `point` when only the result itself does. */
type Cell = { readonly lo: Scaled; readonly hi: Scaled } | "point";

/**
 * `f` on the ball `x`: `f` of the midpoint, exact for an exact `x`, with
 * an unbounded radius for an unbounded `x`, and otherwise exact when `x`
 * lies strictly inside the cell of its midpoint's result and `unresolved`
 * at the cell's boundary it touches or reaches across. A cell whose
 * boundary cannot be formed (an integer midpoint near the top of the
 * exponent bound, whose neighbours do not align with it within the hard
 * bound, or a unit below the bottom of it) leaves the ball `unresolved`
 * at the result itself: nothing can place an inexact ball inside such a
 * cell, and `unresolved` is never wrong about the value.
 */
function roundBall(
  x: Ball,
  f: Rounding,
  cellOf: (r: Scaled) => Result<Cell, BuiltinError>,
): Result<Ball, BuiltinError> {
  const r = f(x.mid);
  if (!r.ok) return r;
  if (x.rad.kind === "unbounded") return unboundedOf(ok(exact(r.value)));
  if (isExact(x)) return ok(exact(r.value));
  const cell = cellOf(r.value);
  if (!cell.ok || cell.value === "point") return unresolvedAt(0, r.value);
  const { lo, hi } = cell.value;
  if (position(x, lo) !== "above") return unresolvedAt(0, lo);
  if (position(x, hi) !== "below") return unresolvedAt(0, hi);
  return ok(exact(r.value));
}

/** The cell `(r + below × unit, r + above × unit)` for an integer `r` and the unit one. */
function integerCell(
  r: Scaled,
  below: bigint,
  above: bigint,
): Result<Cell, BuiltinError> {
  const lo = stepped(r, below);
  if (!lo.ok) return lo;
  const hi = stepped(r, above);
  if (!hi.ok) return hi;
  return ok({ lo: lo.value, hi: hi.value });
}

/** `floor` on a ball: the cell of `r` is `[r, r + 1)`. */
export function floorBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => floorScaled(s, context.maxBits),
    (r) => integerCell(r, 0n, 1n),
  );
}

/** `ceil` on a ball: the cell of `r` is `(r - 1, r]`. */
export function ceilBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => ceilScaled(s, context.maxBits),
    (r) => integerCell(r, -1n, 0n),
  );
}

/** `trunc` on a ball: the cell of `r` is `[r, r + 1)` above zero, `(r - 1, r]` below, and `(-1, 1)` at zero. */
export function truncBall(
  x: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  return roundBall(
    x,
    (s) => truncScaled(s, context.maxBits),
    (r) => {
      const side = sign(r);
      return integerCell(r, side > 0 ? 0n : -1n, side < 0 ? 0n : 1n);
    },
  );
}

/** `r` plus `count` units of `10^exponent`, formed within the hard bound. */
function offset(
  r: Scaled,
  count: bigint,
  exponent: bigint,
): Result<Scaled, BuiltinError> {
  const step = scaled(rational(count), exponent);
  if (!step.ok) return TOO_LARGE;
  const sum = add(r, step.value, LIMIT_BITS);
  return sum.ok ? sum : TOO_LARGE;
}

/**
 * The cell of the result `r` of a rounding to the unit `10^-places` in
 * `mode`: half a unit either side for the modes to nearest, a unit on the
 * side the mode rounds from for the directed modes, both sides at zero
 * for `towardZero`, and the point itself at zero for `awayFromZero`,
 * which takes nothing else to zero.
 */
function roundCell(
  r: Scaled,
  places: bigint,
  mode: RoundingMode,
): Result<Cell, BuiltinError> {
  const unit = -places;
  const cell = (
    below: bigint,
    above: bigint,
    exponent = unit,
  ): Result<Cell, BuiltinError> => {
    const lo = offset(r, below, exponent);
    if (!lo.ok) return lo;
    const hi = offset(r, above, exponent);
    if (!hi.ok) return hi;
    return ok({ lo: lo.value, hi: hi.value });
  };
  const side = sign(r);
  switch (mode) {
    case "halfEven":
    case "halfAwayFromZero":
    case "halfTowardZero":
      return cell(-5n, 5n, unit - 1n);
    case "ceiling":
      return cell(-1n, 0n);
    case "floor":
      return cell(0n, 1n);
    case "towardZero":
      return side > 0 ? cell(0n, 1n) : side < 0 ? cell(-1n, 0n) : cell(-1n, 1n);
    case "awayFromZero":
      return side > 0 ? cell(-1n, 0n) : side < 0 ? cell(0n, 1n) : ok("point");
  }
}

/** `round(x, places)` on a ball, in the context's rounding mode. */
export function roundToPlaces(
  x: Ball,
  places: bigint,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const mode = context.rounding;
  return roundBall(
    x,
    (s) => roundScaled(s, places, mode, context.maxBits),
    (r) => roundCell(r, places, mode),
  );
}

// ---------------------------------------------------------------------------
// div and mod

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
  const quotient = divideBalls(a, b);
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
    const count = exact(sideA === sideB ? ZERO : integer(-1n));
    return ok({ kind: "tiny", count });
  }
  const floored = floorBall(quotient.value, context);
  if (floored.ok) {
    return ok({ kind: "ball", quotient: quotient.value, count: floored.value });
  }
  if (floored.error.kind !== "unresolved") return floored;
  const edge = floored.error.edge;
  if (typeof edge === "string") return floored;
  const scaledEdge = multiply(edge, b.mid);
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
 * minus one. A remainder whose alignment passes the range limit
 * (`mod(-1, 1e20000)` has twenty thousand digits) is `tooLarge`, as any
 * exact sum's is.
 */
export function modBall(
  a: Ball,
  b: Ball,
  context: NumberContext,
): Result<Ball, BuiltinError> {
  const q = quotientFloor(a, b, context);
  if (!q.ok) return q.error.kind === "overflow" ? TOO_LARGE : q;
  if (q.value.kind === "tiny") {
    if (isZero(q.value.count.mid)) return ok(a);
    const sum = addBalls(a, b, context);
    return sum.ok ? sum : err(fromBallError(sum.error, 0));
  }
  const { quotient, count } = q.value;
  if (isExact(a) && isExact(b)) {
    const fraction = subtract(quotient.mid, count.mid, context.maxBits);
    if (!fraction.ok) return TOO_LARGE;
    // The product is within `|b|`, so it can only fall below the bound.
    const remainder = multiply(fraction.value, b.mid);
    if (remainder.ok) return ok(exact(remainder.value));
    return isRefusal(remainder.error) ? err(remainder.error) : TOO_LARGE;
  }
  const fraction = subtractBalls(quotient, count, context);
  if (!fraction.ok) return err(fromBallError(fraction.error, 0));
  const remainder = multiplyBalls(fraction.value, b);
  return remainder.ok ? remainder : err(fromBallError(remainder.error, 0));
}

// ---------------------------------------------------------------------------
// The integer functions

/** `gcd(a, b)` on integers, non-negative. */
export function gcdOfIntegers(a: bigint, b: bigint): bigint {
  return gcdOf(magnitude(a), magnitude(b));
}

/** `lcm(a, b)` on integers, non-negative, and zero when either is zero. */
export function lcmOfIntegers(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return (magnitude(a) / gcdOfIntegers(a, b)) * magnitude(b);
}

const LOG2_E = Math.LOG2E;
const HALF_LOG2_TWO_PI = Math.log2(2 * Math.PI) / 2;

/**
 * `log2 n!` from Stirling's formula with its first correction, within a
 * bit of the truth for every `n`: zero for `n` below two.
 */
export function log2Factorial(n: number): number {
  if (n < 2) return 0;
  return (
    (n + 0.5) * Math.log2(n) - n * LOG2_E + HALF_LOG2_TWO_PI + LOG2_E / (12 * n)
  );
}

/**
 * Whether a result predicted at `bits` passes the range limit of
 * `context`: by more than the prediction's own bit of slack, so that a
 * value that fits is never refused, and the node check (D19) stands
 * behind a prediction a bit short.
 */
function pastLimit(bits: number, context: NumberContext): boolean {
  return bits - 1 > context.maxBits;
}

/** An integer beyond which every factorial passes any range limit the settings allow. */
const FACTORIAL_LIMIT = 1_000_000n;

/** The product of `from`, `from + step`, …, `to`, by splitting the range in two until it is short. */
function product(from: bigint, to: bigint, step: bigint): bigint {
  if (from > to) return 1n;
  const count = (to - from) / step + 1n;
  if (count <= 8n) {
    let result = 1n;
    for (let i = from; i <= to; i += step) result *= i;
    return result;
  }
  const middle = from + (count / 2n) * step;
  return product(from, middle - step, step) * product(middle, to, step);
}

/** `n!` for `n >= 0`, predicted first and refused past the range limit. */
export function factorialOf(
  n: bigint,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (n > FACTORIAL_LIMIT || pastLimit(log2Factorial(Number(n)), context)) {
    return TOO_LARGE;
  }
  return ok(product(2n, n, 1n));
}

/**
 * `n!!` for `n >= -1`: `2^k k!` for `n = 2k`, and `n! / (2^k k!)` for
 * `n = 2k + 1`, predicted from those and refused past the range limit;
 * `(-1)!!` and `0!!` are one.
 */
export function doubleFactorialOf(
  n: bigint,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (n <= 0n) return ok(1n);
  if (n > FACTORIAL_LIMIT) return TOO_LARGE;
  const k = Number(n / 2n);
  const bits =
    n % 2n === 0n
      ? k + log2Factorial(k)
      : log2Factorial(Number(n)) - k - log2Factorial(k);
  if (pastLimit(bits, context)) return TOO_LARGE;
  return ok(product(n % 2n === 0n ? 2n : 1n, n, 2n));
}

/** An integer beyond which Stirling's formula is not evaluated, the double being inexact there. */
const STIRLING_LIMIT = 1n << 52n;

/**
 * `binomial(n, k)` for `n >= 0`: zero for `k` outside `0..n`, and
 * otherwise the multiplicative formula over the smaller of `k` and
 * `n - k`, each step exact, predicted and refused past the range limit:
 * from three factorials where `n` is a double's size, and from `n^k / k!`
 * for a larger `n`, within `k` bits of the truth there, so that
 * `binomial(1e400, 2)` is the value it is.
 */
export function binomialOf(
  n: bigint,
  k: bigint,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (k < 0n || k > n) return ok(0n);
  const smaller = k < n - k ? k : n - k;
  if (smaller === 0n) return ok(1n);
  // `binomial(n, k)` is at least `2^k` for `k` up to half of `n`.
  if (smaller > FACTORIAL_LIMIT) return TOO_LARGE;
  const bits =
    n <= STIRLING_LIMIT
      ? log2Factorial(Number(n)) -
        log2Factorial(Number(smaller)) -
        log2Factorial(Number(n - smaller))
      : Number(smaller) * n.toString(2).length - log2Factorial(Number(smaller));
  if (pastLimit(bits, context)) return TOO_LARGE;
  let result = 1n;
  for (let i = 1n; i <= smaller; i++) {
    result = (result * (n - smaller + i)) / i;
  }
  return ok(result);
}

/** A built-in of integer arguments, each formed by `integerOf`, with `f` on them. */
function integerFunction(
  name: string,
  count: 1 | 2,
  f: (
    args: readonly bigint[],
    context: NumberContext,
  ) => Result<bigint, BuiltinError>,
): Builtin {
  return {
    name,
    arity: { min: count, max: count },
    dimensions: plainNumbers(count),
    apply: (args, context) => {
      const integers: bigint[] = [];
      for (let i = 0; i < count; i++) {
        const n = integerOf(args[i]!, i, context);
        if (!n.ok) return n;
        integers.push(n.value);
      }
      const result = f(integers, context);
      return result.ok ? ok(exact(integer(result.value))) : result;
    },
  };
}

/** The argument at `index` is below where the function is defined. */
function negative(index: number): Result<never, BuiltinError> {
  return err({ kind: "domain", argument: index, reason: "negative" });
}

// ---------------------------------------------------------------------------
// The built-ins

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

export const floor: Builtin = {
  name: "floor",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => floorBall(x!, context),
};

export const ceil: Builtin = {
  name: "ceil",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => ceilBall(x!, context),
};

export const truncFn: Builtin = {
  name: "trunc",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x], context) => truncBall(x!, context),
};

/**
 * `round(x)` to an integer and `round(x, places)` to `places` decimal
 * places, the places an exact integer, in the context's rounding mode.
 */
export const round: Builtin = {
  name: "round",
  arity: { min: 1, max: 2 },
  dimensions: (args, primitives) => {
    const x = checkArgument(args, 0, DIMENSIONLESS, primitives);
    if (!x.ok) return x;
    const places = checkArgument(args, 1, DIMENSIONLESS, primitives);
    return places.ok ? ok(DIMENSIONLESS) : places;
  },
  apply: ([x, places], context) => {
    if (places === undefined) return roundToPlaces(x!, 0n, context);
    const count = integerOf(places, 1, context);
    if (!count.ok) return count;
    return roundToPlaces(x!, count.value, context);
  },
};

export const div: Builtin = {
  name: "div",
  arity: { min: 2, max: 2 },
  dimensions: conforming("number"),
  apply: ([a, b], context) => divBall(a!, b!, context),
};

export const mod: Builtin = {
  name: "mod",
  arity: { min: 2, max: 2 },
  dimensions: conforming("first"),
  apply: ([a, b], context) => modBall(a!, b!, context),
};

export const gcd: Builtin = integerFunction("gcd", 2, ([a, b]) =>
  ok(gcdOfIntegers(a!, b!)),
);

export const lcm: Builtin = integerFunction("lcm", 2, ([a, b]) =>
  ok(lcmOfIntegers(a!, b!)),
);

export const factorial: Builtin = integerFunction(
  "factorial",
  1,
  ([n], context) => (n! < 0n ? negative(0) : factorialOf(n!, context)),
);

export const doublefactorial: Builtin = integerFunction(
  "doublefactorial",
  1,
  ([n], context) => (n! < -1n ? negative(0) : doubleFactorialOf(n!, context)),
);

export const binomial: Builtin = integerFunction(
  "binomial",
  2,
  ([n, k], context) => (n! < 0n ? negative(0) : binomialOf(n!, k!, context)),
);

/** The thirteen, in the order README lists them. */
export const EXACT_FUNCTIONS: readonly Builtin[] = [
  abs,
  signFn,
  floor,
  ceil,
  truncFn,
  round,
  div,
  mod,
  gcd,
  lcm,
  factorial,
  binomial,
  doublefactorial,
];
