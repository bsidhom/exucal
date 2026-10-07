// `gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial`
// (docs/special.md, "The exact functions"; the plan's 6.1 and D22): the
// functions of integers. Each takes exact integers: an inexact argument is
// a `domain` error (`notExact`), since `5 ± 1e-30` is not known to be `5`
// and no pass of the retry loop narrows a ball to a point, and an exact
// non-integer another (`notInteger`); an integer whose power of ten cannot
// be formed within the significand limit is `tooLarge`. `gcd` and `lcm` are
// non-negative, on absolute values, a normalization independent of the
// division's definition. `factorial`, `binomial` and `doublefactorial`
// predict their result's bits from Stirling's formula, within a bit, and
// refuse past the significand limit before computing, with the generic
// `tooLarge`, whose message names the significand limit; `approx` around the argument
// is no remedy here, an inexact argument being a `domain` error.

import { exact, isExact, type Ball } from "../ball.ts";
import {
  tooLarge,
  plainNumbers,
  type Builtin,
  type BuiltinError,
} from "../builtin.ts";
import type { NumberContext } from "../context.ts";
import { abs, gcd as gcdOf } from "../rational.ts";
import { err, ok, type Result } from "../result.ts";
import { fromInteger, isInteger, toRational } from "../scaled.ts";

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
  const formed = toRational(x.mid, context.significandLimitBits);
  if (!formed.ok) return tooLarge("passes");
  return ok(formed.value.num);
}

/** `gcd(a, b)` on integers, non-negative. */
export function gcdOfIntegers(a: bigint, b: bigint): bigint {
  return gcdOf(abs(a), abs(b));
}

/** `lcm(a, b)` on integers, non-negative, and zero when either is zero. */
export function lcmOfIntegers(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return (abs(a) / gcdOfIntegers(a, b)) * abs(b);
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
 * Whether a result predicted at `bits` passes the significand limit of
 * `context`: by more than the prediction's own bit of slack, so that a
 * value that fits is never refused, and the node check (D19) stands
 * behind a prediction a bit short.
 */
function pastLimit(bits: number, context: NumberContext): boolean {
  return bits - 1 > context.significandLimitBits;
}

/** An integer beyond which every factorial passes any significand limit the settings allow. */
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

/** `n!` for `n >= 0`, predicted first and refused past the significand limit. */
export function factorialOf(
  n: bigint,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (n > FACTORIAL_LIMIT || pastLimit(log2Factorial(Number(n)), context)) {
    return tooLarge("passes");
  }
  return ok(product(2n, n, 1n));
}

/**
 * `n!!` for `n >= -1`: `2^k k!` for `n = 2k`, and `n! / (2^k k!)` for
 * `n = 2k + 1`, predicted from those and refused past the significand limit;
 * `(-1)!!` and `0!!` are one.
 */
export function doubleFactorialOf(
  n: bigint,
  context: NumberContext,
): Result<bigint, BuiltinError> {
  if (n <= 0n) return ok(1n);
  if (n > FACTORIAL_LIMIT) return tooLarge("passes");
  const k = Number(n / 2n);
  const bits =
    n % 2n === 0n
      ? k + log2Factorial(k)
      : log2Factorial(Number(n)) - k - log2Factorial(k);
  if (pastLimit(bits, context)) return tooLarge("passes");
  return ok(product(n % 2n === 0n ? 2n : 1n, n, 2n));
}

/** An integer beyond which Stirling's formula is not evaluated, the double being inexact there. */
const STIRLING_LIMIT = 1n << 52n;

/**
 * `binomial(n, k)` for `n >= 0`: zero for `k` outside `0..n`, and
 * otherwise the multiplicative formula over the smaller of `k` and
 * `n - k`, each step exact, predicted and refused past the significand limit:
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
  if (smaller > FACTORIAL_LIMIT) return tooLarge("passes");
  const bits =
    n <= STIRLING_LIMIT
      ? log2Factorial(Number(n)) -
        log2Factorial(Number(smaller)) -
        log2Factorial(Number(n - smaller))
      : Number(smaller) * n.toString(2).length - log2Factorial(Number(smaller));
  if (pastLimit(bits, context)) return tooLarge("passes");
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
      return result.ok ? ok(exact(fromInteger(result.value))) : result;
    },
  };
}

/** The argument at `index` is below where the function is defined. */
function negative(index: number): Result<never, BuiltinError> {
  return err({ kind: "domain", argument: index, reason: "negative" });
}

// ---------------------------------------------------------------------------
// The built-ins

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
