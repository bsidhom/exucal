// The edge sweep at the ball level (devdocs/testing.md, "The edge sweeps"): every
// built-in of `BUILTINS`, enumerated by arity so that a function added
// later joins it, the four exact operations of the ball, `powBall`,
// `rootBall` and `step`, run over the classes of arguments at the edges
// of the number type, each exact and with a relative radius of about
// `1e-30`, and the wide balls; the operations that read the mode run in
// decimal mode too. Each case is checked against the oracle
// src/testing/edges.ts states: no throw; a refusal only where the
// decisions allow one (an `overflow` or `underflow` only when every value
// of the true result passes the bound, devdocs/numbers.md ("The exponent
// bound"); `tooLarge` only at a
// documented site; a domain error only for an argument outside the domain
// throughout; an `unresolved` is retried by the pipeline and never a
// violation, an exact argument's included); and, for a value,
// the bound's two conditions, the known points (`sin(0)`, `exp(0)`, `pow(1, y)`,
// the exact result of a sum or a product where it can be formed), and the
// range facts (`|tanh| <= 1`, `acos` in `[0, pi]`, `exp` positive). The
// cases run in a worker under a deadline, and the known violations are
// the table `KNOWN` below, keyed by the issue and the task that empties
// each entry.
//
// Each operation below carries its own rule for what the oracle expects
// of it; a built-in that no rule names gets the strictest one (no refusal
// at either limit, no domain error), so that a new function fails here
// until its rule is written.

import { test } from "node:test";
import { isMainThread } from "node:worker_threads";
import {
  addBalls,
  containsZero,
  divideBalls,
  exact,
  isExact,
  multiplyBalls,
  powBall,
  radiusValue,
  rootBall,
  step,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import { isHuge, type BuiltinError } from "./builtin.ts";
import { BUILTINS } from "./builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  modeOf,
  type Mode,
  type NumberContext,
} from "./context.ts";
import {
  compareRadius,
  powerOfTenRadius,
  radiusAboveScaled,
  shiftRadius,
} from "./radius.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  ONE as ONE_FRACTION,
  bitLength,
  gcd,
  multiply as multiplyFractions,
  pow as powFraction,
  rational,
  subtract as subtractFractions,
} from "./rational.ts";
import { ok, type Result } from "./result.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  decimalExponent,
  divide,
  equals,
  formable,
  fromRational,
  isInteger,
  isZero,
  multiply,
  negate,
  roundTo,
  scaled,
  sign,
  subtract,
  toRational,
  type Scaled,
} from "./scaled.ts";
import {
  binomialOf,
  doubleFactorialOf,
  factorialOf,
  gcdOfIntegers,
  lcmOfIntegers,
} from "./builtins/integers.ts";
import { magnitudeBits } from "./builtins/gamma.ts";
import { withinLimits as incbetaWithinLimits } from "./builtins/incbeta.ts";
import { withinLimits } from "./builtins/incomplete.ts";
import {
  ceilScaled,
  floorScaled,
  roundScaled,
  truncScaled,
} from "./builtins/round.ts";
import { bitsFor } from "./fixed.ts";
import {
  NO_MAGNITUDE,
  addIntervals,
  betaMagnitude,
  checkValue,
  contains,
  containsZeroInterval,
  divideIntervals,
  erfcMagnitude,
  incbetaMagnitude,
  expMagnitude,
  gammaMagnitude,
  hyperbolicMagnitude,
  incompleteGammaMagnitude,
  lgammaMagnitude,
  intersects,
  intervalOf,
  magnitudeInterval,
  multiplyIntervals,
  multiplyLoose,
  negateInterval,
  pointInterval,
  powerMagnitude,
  runCases,
  scaleLoose,
  scaledOf,
  surePast,
  sweep,
  valueMagnitude,
  type Case,
  type Interval,
  type Known,
  type Loose,
  type Magnitude,
  type Range,
  type Skip,
} from "../testing/edges.ts";
import { ball, dec } from "../testing/scaled.ts";

// ---------------------------------------------------------------------------
// The known violations

/**
 * The violations the sweep finds today, each the pattern of an open issue
 * and the task that fixes it; the task deletes the entry.
 */
const KNOWN: readonly Known[] = [
  {
    issue: "#79",
    task: "follow-up",
    cases: /^(cbrt|rootBall\[3\])\(3e18±2e18\)/,
    violation: /^threw Error: Newton's root is not within half of its argument/,
    reason:
      "The kernel's root of a positive ball whose relative radius is a half or more fails its own verification and throws, for every degree above two.",
  },
];

/** The cases known to hang, not run. */
const SKIPS: readonly Skip[] = [];

/** The deadline on the whole sweep; a prototype ran its cases in a few seconds. */
const DEADLINE_MS = 90_000;

// ---------------------------------------------------------------------------
// The contexts

/** The first working pass of the defaults, in exact mode. */
const EXACT: NumberContext = {
  precision: 18,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

/** The user's context at the defaults, in decimal mode, which is its one pass. */
const DECIMAL: NumberContext = { ...EXACT, precision: 8, mode: "decimal" };

// ---------------------------------------------------------------------------
// The arguments

type Argument = { readonly name: string; readonly ball: Ball };

const E18 = MAX_EXPONENT.toString();
const NINES = "9".repeat(25);

/** The exact argument `text`. */
function exactArg(text: string, mid: Scaled = dec(text)): Argument {
  return { name: text, ball: exact(mid) };
}

/**
 * The argument `text` with a relative radius between `1e-30` and `1e-29`,
 * `10^(e - 29)` for its decimal exponent `e`, from `powerOfTenRadius` so
 * that the radius of a value at the bottom edge, which `scaled()` refuses
 * to form, is built all the same.
 */
function inexactArg(text: string, mid: Scaled = dec(text)): Argument {
  const rad = powerOfTenRadius(decimalExponent(mid) - 29n);
  return { name: `~${text}`, ball: { mid, rad } };
}

/** A wide ball, `mid ± rad`, both decimals. */
function wideArg(mid: string, rad: string): Argument {
  return { name: `${mid}±${rad}`, ball: ball(dec(mid), dec(rad)) };
}

/** The fraction `num / den × 10^exp`, within the bound. */
function fraction(num: bigint, den: bigint, exp: bigint): Scaled {
  const s = scaled(rational(num, den), exp);
  if (!s.ok) throw new Error("An argument is within the bound");
  return s.value;
}

/** The classes of arguments, each exact and inexact, and the wide balls. */
function edgeArguments(): readonly Argument[] {
  const symmetric = ["0", "1", "-1", "0.5", "-0.5", "2", "-2"];
  const oneSided = [
    // Tiny, and the top of the significand limit.
    "1e-400",
    "1e-20000",
    "1e20000",
    "1e-400000",
    "1e-999999999",
    `1e-${E18}`,
    `1e-${(MAX_EXPONENT - 1n).toString()}`,
    // Huge, and the top edge.
    "1e19",
    "1e400",
    `5e${E18}`,
    `9.99e${E18}`,
    `${NINES[0]}.${NINES.slice(1)}e${E18}`,
    // A significand of 25 digits near one.
    "1.000000000000000000000001",
  ];
  const fractions: readonly (readonly [string, Scaled])[] = [
    [`1e${E18}/3`, fraction(1n, 3n, MAX_EXPONENT)],
    [
      `1e-${(MAX_EXPONENT - 1n).toString()}/3`,
      fraction(1n, 3n, -(MAX_EXPONENT - 1n)),
    ],
  ];
  const args: Argument[] = [];
  for (const text of symmetric) {
    args.push(exactArg(text));
    if (text !== "0") args.push(inexactArg(text));
  }
  for (const text of oneSided) {
    for (const signed of [text, `-${text}`]) {
      args.push(exactArg(signed), inexactArg(signed));
    }
  }
  for (const [text, mid] of fractions) {
    for (const [name, value] of [
      [text, mid],
      [`-${text}`, negate(mid)],
    ] as const) {
      args.push(exactArg(name, value), inexactArg(name, value));
    }
  }
  args.push(
    wideArg("0", "1e9"),
    wideArg("0", "1e30"),
    wideArg("0", "1e948"),
    wideArg("5", "2e948"),
    wideArg("1", "1e-400"),
    wideArg("3e18", "2e18"),
    exactArg(`1+1e-400`, dec(`1.${"0".repeat(399)}1`)),
  );
  return args;
}

/** The names of the arguments a binary operation takes as its second operand. */
const SECOND = new Set([
  "0",
  "1",
  "-1",
  "0.5",
  "2",
  "~2",
  "1e-400",
  "1e-20000",
  "1e19",
  "1e20000",
  `5e${E18}`,
  `1e-${E18}`,
  `~1e${E18}/3`,
  "0±1e9",
  "1±1e-400",
  "3e18±2e18",
]);

/**
 * The names of the arguments a three-argument operation takes as its
 * third operand, the incomplete beta function's `x`: the ends of `[0, 1]`
 * and past them, the middle, tiny values, and balls at the ends; a
 * three-argument operation takes the second operands as its first two,
 * since the full set cubed would be most of the sweep.
 */
const THIRD = new Set([
  "0",
  "1",
  "0.5",
  "~0.5",
  "-1",
  "2",
  "1e-400",
  "1e-20000",
  `1e-${E18}`,
  "1±1e-400",
  "0±1e9",
]);

// ---------------------------------------------------------------------------
// The operations and their rules

/** What a case's operation returns; the errors of the ball and of a built-in read the same. */
type Outcome = Result<Ball, BallError | BuiltinError>;

/** An operation with the oracle's rule for it. */
type Operation = {
  readonly name: string;
  readonly apply: (args: readonly Ball[], context: NumberContext) => Outcome;
  /** The modes it runs in: decimal too when it reads the mode. */
  readonly modes: readonly Mode[];
  /** The true result's magnitude over the arguments' intervals, for the refusal rule. */
  readonly magnitude?: (args: readonly Interval[]) => Magnitude;
  /** Whether `tooLarge` is a documented refusal for these arguments. */
  readonly tooLarge?: (
    args: readonly Ball[],
    context: NumberContext,
  ) => boolean;
  /** Whether a domain error, or an even root of a negative value, is right: the argument is outside throughout. */
  readonly domain?: (args: readonly Interval[]) => boolean;
  /** Whether a division by zero is right: the divisor is exactly zero. */
  readonly divisionByZero?: (args: readonly Ball[]) => boolean;
  /** The exact value the result must contain, at a known point. */
  readonly known?: (args: readonly Ball[]) => Scaled | undefined;
  /** The exact result over the midpoints, where it can be formed, which the result must contain. */
  readonly reference?: (mids: readonly Scaled[]) => Loose | undefined;
  /** A range the result must reach into. */
  readonly range?: Range;
  /** Whether the operation settles its result, so that decimal mode's rounding may carry it past the top. */
  readonly settles?: boolean;
  /** Whether the operation returns its result unsettled for the evaluator to settle, which the oracle then does first. */
  readonly unsettled?: boolean;
};

const PI_BELOW = dec("3.14159265358979323846");
const PI_ABOVE = dec("3.14159265358979323847");
const HALF_PI_ABOVE = dec("1.5707963267948966193");
const MINUS_ONE = negate(ONE);

const UNIT_RANGE: Range = { lo: { value: MINUS_ONE }, hi: { value: ONE } };
const POSITIVE: Range = { lo: { value: ZERO, open: true } };
const NONNEGATIVE: Range = { lo: { value: ZERO } };

/** Whether `i` lies at or below zero throughout. */
function nonpositive(i: Interval): boolean {
  return sign(i.hi) <= 0;
}

/** Whether `i` lies below zero throughout. */
function negative(i: Interval): boolean {
  return sign(i.hi) < 0;
}

/** Whether `i` is the point `v`. */
function isPoint(i: Interval, v: Scaled): boolean {
  return equals(i.lo, v) && equals(i.hi, v);
}

/** Whether the exact ball `b` is the point `v`. */
function isExactly(b: Ball, v: Scaled): boolean {
  return isExact(b) && equals(b.mid, v);
}

/** Whether the interval is a point, an exact argument. */
function isExactInterval(i: Interval): boolean {
  return compare(i.lo, i.hi) === 0;
}

/** Whether the argument is not an exact integer, where the integer functions refuse it. */
function notExactInteger(i: Interval): boolean {
  return !isExactInterval(i) || !isInteger(i.lo);
}

/** Whether the exact argument is below `-1`. */
function belowMinusOne(i: Interval): boolean {
  return isExactInterval(i) && compare(i.lo, MINUS_ONE) < 0;
}

/** The integer `s` is, where it is one of the sweep's moderate size; `undefined` otherwise. */
function integerValue(s: Scaled): bigint | undefined {
  if (!isInteger(s)) return undefined;
  const formed = toRational(s, MAX_SIGNIFICAND_LIMIT_BITS);
  return formed.ok ? formed.value.num : undefined;
}

/** Whether `x` is an exact integer whose power of ten cannot be formed within the context's significand limit. */
function unformable(x: Ball, context: NumberContext): boolean {
  return (
    isExact(x) &&
    isInteger(x.mid) &&
    !toRational(x.mid, context.significandLimitBits).ok
  );
}

/** The value of a result, or `undefined` for a failure. */
function valueOr<T>(result: Result<T, unknown>): T | undefined {
  return result.ok ? result.value : undefined;
}

/** The value of a result that is expected to succeed on the sweep's small arguments. */
function valueOrOne(result: Result<bigint, unknown>): bigint {
  return result.ok ? result.value : 1n;
}

/** `f` on two exact integers, where both are, as a `Scaled`. */
function onIntegers(
  a: Scaled,
  b: Scaled,
  f: (a: bigint, b: bigint) => bigint,
): Scaled | undefined {
  const x = integerValue(a);
  const y = integerValue(b);
  return x === undefined || y === undefined ? undefined : integer(f(x, y));
}

/** The exact `div` of two midpoints, where it can be formed within the hard bound. */
function divReference(a: Scaled, b: Scaled): Scaled | undefined {
  if (isZero(b)) return undefined;
  const q = divide(a, b, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!q.ok) return undefined;
  return valueOr(floorScaled(q.value, MAX_SIGNIFICAND_LIMIT_BITS));
}

/** The exact `mod` of two midpoints, where `div` can be formed. */
function modReference(a: Scaled, b: Scaled): Scaled | undefined {
  const n = divReference(a, b);
  if (n === undefined) return undefined;
  const product = multiply(b, n, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!product.ok) return undefined;
  return valueOr(subtract(a, product.value, MAX_SIGNIFICAND_LIMIT_BITS));
}

/**
 * The rules of the four incomplete gamma functions: the order positive
 * and the argument at or above zero, the refusals the bits the logarithm
 * would need past the significand limit, the magnitude from the bounds of the
 * testing module, the exact value at `x = 0`, and the regularized forms
 * within `[0, 1]`.
 */
function incompleteGammaRules(): [string, Partial<Operation>][] {
  const forms: readonly [string, "lower" | "upper", boolean][] = [
    ["lowergamma", "lower", false],
    ["uppergamma", "upper", false],
    ["lowergammareg", "lower", true],
    ["uppergammareg", "upper", true],
  ];
  return forms.map(([name, form, regularized]) => [
    name,
    {
      domain: ([s, x]) =>
        (isExactInterval(s!) && sign(s!.lo) <= 0) ||
        (isExactInterval(x!) && sign(x!.lo) < 0),
      // The refusals: the bits the logarithm would need past the significand
      // limit, or neither route within its limit, at the argument or at
      // either end of a wide one.
      tooLarge: ([s, x], context) =>
        !endsOf(x!).every((end) => withinLimits(s!, end, context)),
      magnitude: ([s, x]) =>
        incompleteGammaMagnitude(form, regularized, s!, x!),
      known: ([s, x]) => {
        if (!isExactly(x!, ZERO)) return undefined;
        if (form === "lower") return ZERO;
        if (regularized) return ONE;
        const n = integerValue(s!.mid);
        return n === undefined || n < 1n || n > 300n
          ? undefined
          : integer(valueOrOne(factorialOf(n - 1n, EXACT)));
      },
      range: regularized
        ? { lo: { value: ZERO }, hi: { value: ONE } }
        : NONNEGATIVE,
    },
  ]);
}

/**
 * The rules of the incomplete beta function and its regularized form:
 * positive parameters and an argument within `[0, 1]`, the refusals the
 * bits the logarithm would need past the significand limit or neither
 * orientation of the series within its limit, the magnitude from the
 * bounds of the testing module, the exact value at the ends of the
 * argument, the closed forms at a parameter of one as the reference, and
 * the regularized form within `[0, 1]`.
 */
function incompleteBetaRules(): [string, Partial<Operation>][] {
  const forms: readonly [string, boolean][] = [
    ["incbeta", false],
    ["incbetareg", true],
  ];
  return forms.map(([name, regularized]) => [
    name,
    {
      domain: ([a, b, x]) =>
        (isExactInterval(a!) && sign(a!.lo) <= 0) ||
        (isExactInterval(b!) && sign(b!.lo) <= 0) ||
        (isExactInterval(x!) && (sign(x!.lo) < 0 || compare(x!.lo, ONE) > 0)) ||
        sign(x!.hi) < 0 ||
        compare(x!.lo, ONE) > 0,
      tooLarge: ([a, b, x], context) =>
        !endsOf(x!).every((end) => incbetaWithinLimits(a!, b!, end, context)),
      magnitude: ([a, b, x]) => incbetaMagnitude(regularized, a!, b!, x!),
      known: ([a, b, x]) => {
        if (isExactly(x!, ZERO)) return ZERO;
        if (!isExactly(x!, ONE)) return undefined;
        if (regularized) return ONE;
        const m = integerValue(a!.mid);
        const n = integerValue(b!.mid);
        if (
          m === undefined ||
          n === undefined ||
          m < 1n ||
          n < 1n ||
          m + n > 300n
        ) {
          return undefined;
        }
        const c = valueOrOne(binomialOf(m + n - 2n, m - 1n, EXACT));
        return fromRational(rational(1n, (m + n - 1n) * c));
      },
      // I_x(1, b) = 1 - (1 - x)^b and I_x(a, 1) = x^a, exact at a rational x.
      reference: ([a, b, x]) => {
        const m = integerValue(a!);
        const n = integerValue(b!);
        if (m === undefined || n === undefined || m < 1n || n < 1n) {
          return undefined;
        }
        if (m > 300n || n > 300n || (m !== 1n && n !== 1n)) return undefined;
        const r = toRational(x!, MAX_SIGNIFICAND_LIMIT_BITS);
        if (!r.ok || sign(x!) < 0 || compare(x!, ONE) > 0) {
          return undefined;
        }
        const value =
          n === 1n
            ? powFraction(r.value, m, MAX_SIGNIFICAND_LIMIT_BITS)
            : (() => {
                const complement = powFraction(
                  subtractFractions(ONE_FRACTION, r.value),
                  n,
                  MAX_SIGNIFICAND_LIMIT_BITS,
                );
                return complement.ok
                  ? {
                      ok: true as const,
                      value: subtractFractions(ONE_FRACTION, complement.value),
                    }
                  : complement;
              })();
        if (!value.ok) return undefined;
        if (regularized) return fromRational(value.value);
        const whole = rational(
          1n,
          (m + n - 1n) * valueOrOne(binomialOf(m + n - 2n, m - 1n, EXACT)),
        );
        return fromRational(multiplyFractions(value.value, whole));
      },
      range: regularized
        ? { lo: { value: ZERO }, hi: { value: ONE } }
        : NONNEGATIVE,
    },
  ]);
}

/** The ends of a ball whose radius is above `2^-16` of its magnitude, as the incomplete gamma functions take it, or the ball itself. */
function endsOf(x: Ball): Ball[] {
  if (isExact(x)) return [x];
  const r = radiusValue(x.rad);
  if (r === undefined) return [x];
  const lo = subtract(x.mid, r, MAX_SIGNIFICAND_LIMIT_BITS);
  const hi = add(x.mid, r, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!lo.ok || !hi.ok) return [x];
  const bound = compareRadius(
    x.rad,
    shiftRadius(radiusAboveScaled(absolute(x.mid)), -16n),
  );
  return bound > 0 || isZero(x.mid) ? [exact(lo.value), exact(hi.value)] : [x];
}

/** Whether the interval is exactly a non-positive integer, a pole of the Gamma family. */
function isExactPole(i: Interval): boolean {
  return isExactInterval(i) && isInteger(i.lo) && sign(i.lo) <= 0;
}

/** The sum of two balls as `beta` forms it for its third logarithm, or `undefined` where the sum fails. */
function sumBall(a: Ball, b: Ball): Ball | undefined {
  const sum = addBalls(a, b, EXACT);
  if (sum.ok) return sum.value;
  return compare(absolute(a.mid), absolute(b.mid)) >= 0 ? a : b;
}

/** Whether the floor of `x`'s midpoint, or its fractional part, cannot be formed within the context's significand limit, as `digamma`'s reflection forms them. */
function reflectionPastLimit(x: Ball, context: NumberContext): boolean {
  const floored = floorScaled(x.mid, context.significandLimitBits);
  if (!floored.ok) return floored.error.kind === "tooLarge";
  const fraction = subtract(x.mid, floored.value, context.significandLimitBits);
  return !fraction.ok && fraction.error.kind === "tooLarge";
}

/** Whether the quotient of the midpoints has a floor that cannot be formed within the context's significand limit. */
function quotientPastLimit(a: Ball, b: Ball, context: NumberContext): boolean {
  if (isZero(b.mid)) return false;
  const q = divide(a.mid, b.mid, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!q.ok) return false;
  const floored = floorScaled(q.value, context.significandLimitBits);
  return !floored.ok && floored.error.kind === "tooLarge";
}

/** Whether every value of the quotient passes the top of the exponent bound, where `mod` is `tooLarge`. */
function quotientPastTop(a: Ball, b: Ball): boolean {
  const ia = intervalOf(a);
  const ib = intervalOf(b);
  if (ia === undefined || ib === undefined) return false;
  const q = divideIntervals(ia, ib);
  return q !== undefined && surePast(valueMagnitude(q)) === "overflow";
}

/**
 * Whether the exact remainder of the midpoints cannot be aligned within
 * the context's significand limit, as `mod` forms it: the quotient less its
 * floor, or, for a quotient below the bound and a dividend of the other
 * sign, the sum `a + b`.
 */
function remainderPastLimit(a: Ball, b: Ball, context: NumberContext): boolean {
  if (isZero(b.mid)) return false;
  const q = divide(a.mid, b.mid, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!q.ok) {
    if (q.error.kind !== "underflow" || sign(a.mid) * sign(b.mid) >= 0) {
      return false;
    }
    const sum = add(a.mid, b.mid, context.significandLimitBits);
    return !sum.ok && sum.error.kind === "tooLarge";
  }
  const n = floorScaled(q.value, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!n.ok) return false;
  const fraction = subtract(q.value, n.value, context.significandLimitBits);
  return !fraction.ok && fraction.error.kind === "tooLarge";
}

/**
 * The magnitude of `a - b × floor(a / b)` over the arguments' intervals,
 * where the floor is one integer over the quotient's interval: the
 * quotient less that integer, times `b`; no magnitude otherwise.
 */
function modMagnitude(a: Interval, b: Interval): Magnitude {
  const q = divideIntervals(a, b);
  // A quotient reaching zero has a remainder reaching `a`, within the
  // bound as every argument is.
  if (q === undefined || containsZeroInterval(q)) return NO_MAGNITUDE;
  const lo = floorScaled(q.lo, MAX_SIGNIFICAND_LIMIT_BITS);
  const hi = floorScaled(q.hi, MAX_SIGNIFICAND_LIMIT_BITS);
  if (!lo.ok || !hi.ok || !equals(lo.value, hi.value)) return NO_MAGNITUDE;
  const fraction = addIntervals(q, negateInterval(pointInterval(lo.value)));
  const remainder = multiplyIntervals(fraction, b);
  return containsZeroInterval(remainder)
    ? NO_MAGNITUDE
    : valueMagnitude(remainder);
}

/**
 * The magnitude of `floor(a / b)` over the arguments' intervals: the
 * quotient's, except that a quotient within one of zero floors to zero
 * or minus one, which no bound refuses.
 */
function flooredMagnitude(a: Interval, b: Interval): Magnitude {
  const q = divideIntervals(a, b);
  if (q === undefined) return NO_MAGNITUDE;
  const within = (v: Loose) => compare(absolute(v), ONE) < 0;
  if (within(q.lo) && within(q.hi)) return NO_MAGNITUDE;
  return valueMagnitude(q);
}

/** The value at an argument of exactly `at`, for a known point. */
function at(
  argument: Scaled,
  value: Scaled,
): (args: readonly Ball[]) => Scaled | undefined {
  return (args) => (isExactly(args[0]!, argument) ? value : undefined);
}

/** The rules of the built-ins, by name; `magnitude` absent means no refusal at the bound is ever allowed. */
const BUILTIN_RULES: ReadonlyMap<string, Partial<Operation>> = new Map<
  string,
  Partial<Operation>
>([
  ["pi", { range: { lo: { value: PI_BELOW }, hi: { value: PI_ABOVE } } }],
  [
    "exp",
    {
      magnitude: ([x]) => expMagnitude(x!),
      known: at(ZERO, ONE),
      range: POSITIVE,
    },
  ],
  ["ln", { domain: ([x]) => nonpositive(x!), known: at(ONE, ZERO) }],
  // The exact functions (devdocs/builtins.md, "The exact functions"): exact
  // references over the midpoints, the
  // domain of the integer functions, and the refusals their size
  // predictions and the quotient's floor document.
  ["abs", { reference: ([x]) => absolute(x!) }],
  ["sign", { reference: ([x]) => integer(BigInt(sign(x!))) }],
  [
    "floor",
    {
      reference: ([x]) => valueOr(floorScaled(x!, MAX_SIGNIFICAND_LIMIT_BITS)),
      tooLarge: ([x], context) =>
        !truncScaled(x!.mid, context.significandLimitBits).ok,
    },
  ],
  [
    "ceil",
    {
      reference: ([x]) => valueOr(ceilScaled(x!, MAX_SIGNIFICAND_LIMIT_BITS)),
      tooLarge: ([x], context) =>
        !truncScaled(x!.mid, context.significandLimitBits).ok,
    },
  ],
  [
    "trunc",
    {
      reference: ([x]) => valueOr(truncScaled(x!, MAX_SIGNIFICAND_LIMIT_BITS)),
      tooLarge: ([x], context) =>
        !truncScaled(x!.mid, context.significandLimitBits).ok,
    },
  ],
  [
    "round",
    {
      modes: ["exact", "decimal"],
      domain: ([, places]) => places !== undefined && notExactInteger(places),
      reference: ([x, places]) => {
        const count = places === undefined ? 0n : integerValue(places);
        return count === undefined
          ? undefined
          : valueOr(
              roundScaled(
                x!,
                count,
                DEFAULT_ROUNDING,
                MAX_SIGNIFICAND_LIMIT_BITS,
              ),
            );
      },
      tooLarge: ([x, places], context) => {
        if (places !== undefined && unformable(places, context)) return true;
        const count = places === undefined ? 0n : integerValue(places.mid);
        if (count === undefined) return false;
        const rounded = roundScaled(
          x!.mid,
          count,
          DEFAULT_ROUNDING,
          context.significandLimitBits,
        );
        return !rounded.ok && rounded.error.kind === "tooLarge";
      },
    },
  ],
  [
    "div",
    {
      magnitude: ([a, b]) => flooredMagnitude(a!, b!),
      divisionByZero: ([, b]) => isExactly(b!, ZERO),
      reference: ([a, b]) => divReference(a!, b!),
      tooLarge: ([a, b], context) => quotientPastLimit(a!, b!, context),
    },
  ],
  [
    "mod",
    {
      magnitude: ([a, b]) => modMagnitude(a!, b!),
      divisionByZero: ([, b]) => isExactly(b!, ZERO),
      reference: ([a, b]) => modReference(a!, b!),
      tooLarge: ([a, b], context) =>
        quotientPastLimit(a!, b!, context) ||
        quotientPastTop(a!, b!) ||
        remainderPastLimit(a!, b!, context),
    },
  ],
  [
    "gcd",
    {
      domain: (args) => args.some(notExactInteger),
      reference: ([a, b]) => onIntegers(a!, b!, gcdOfIntegers),
      tooLarge: (args, context) => args.some((x) => unformable(x, context)),
    },
  ],
  [
    "lcm",
    {
      domain: (args) => args.some(notExactInteger),
      reference: ([a, b]) => onIntegers(a!, b!, lcmOfIntegers),
      tooLarge: (args, context) => args.some((x) => unformable(x, context)),
    },
  ],
  [
    "factorial",
    {
      domain: ([n]) => notExactInteger(n!) || negative(n!),
      reference: ([n]) => {
        const value = integerValue(n!);
        return value === undefined || value > 300n
          ? undefined
          : integer(valueOrOne(factorialOf(value, EXACT)));
      },
      // Past about 5,900 every factorial passes the default significand limit.
      tooLarge: ([n], context) =>
        unformable(n!, context) || (integerValue(n!.mid) ?? 0n) > 5_900n,
    },
  ],
  [
    "binomial",
    {
      domain: ([n, k]) =>
        notExactInteger(n!) || notExactInteger(k!) || negative(n!),
      reference: ([n, k]) =>
        onIntegers(n!, k!, (a, b) => valueOrOne(binomialOf(a, b, EXACT))),
      tooLarge: ([n, k], context) =>
        unformable(n!, context) ||
        unformable(k!, context) ||
        !binomialOf(
          integerValue(n!.mid) ?? 0n,
          integerValue(k!.mid) ?? 0n,
          context,
        ).ok,
    },
  ],
  [
    "digamma",
    {
      // The poles are the non-positive integers; the reflection of a
      // negative argument forms its floor and fractional part, which a
      // magnitude past the significand limit's digits cannot.
      domain: ([x]) =>
        isExactInterval(x!) && isInteger(x!.lo) && sign(x!.lo) <= 0,
      tooLarge: ([x], context) =>
        sign(x!.mid) <= 0 && reflectionPastLimit(x!, context),
    },
  ],
  [
    "lgamma",
    {
      domain: ([x]) =>
        isExactInterval(x!) && isInteger(x!.lo) && sign(x!.lo) <= 0,
      tooLarge: ([x], context) =>
        sign(x!.mid) <= 0 && reflectionPastLimit(x!, context),
      magnitude: ([x]) => lgammaMagnitude(x!),
      known: at(ONE, ZERO),
    },
  ],
  [
    "gamma",
    {
      domain: ([x]) =>
        isExactInterval(x!) && isInteger(x!.lo) && sign(x!.lo) <= 0,
      tooLarge: ([x], context) =>
        sign(x!.mid) <= 0 && reflectionPastLimit(x!, context),
      magnitude: ([x]) => gammaMagnitude(x!),
      known: at(ONE, ONE),
      // (n - 1)! at an exact positive integer of moderate size.
      reference: ([x]) => {
        const n = integerValue(x!);
        return n === undefined || n < 1n || n > 300n
          ? undefined
          : integer(valueOrOne(factorialOf(n - 1n, EXACT)));
      },
    },
  ],
  [
    "beta",
    {
      // A pole of Γ at either argument; the refusals are the bits an
      // argument's magnitude would need past the significand limit and the
      // reflection's floor of a negative argument or sum.
      domain: ([a, b]) => isExactPole(a!) || isExactPole(b!),
      tooLarge: ([a, b], context) =>
        [a!, b!, sumBall(a!, b!)].some(
          (x) =>
            x !== undefined &&
            (bitsFor(context.precision) +
              magnitudeBits(x, context.significandLimitBits) >
              context.significandLimitBits ||
              (sign(x.mid) <= 0 && reflectionPastLimit(x, context))),
        ),
      magnitude: ([a, b]) => betaMagnitude(a!, b!),
      // 1 / ((a + b - 1) binomial(a + b - 2, a - 1)) at exact positive
      // integers of moderate size.
      reference: ([a, b]) => {
        const m = integerValue(a!);
        const n = integerValue(b!);
        if (m === undefined || n === undefined || m < 1n || n < 1n) {
          return undefined;
        }
        if (m + n > 300n) return undefined;
        const c = valueOrOne(binomialOf(m + n - 2n, m - 1n, EXACT));
        return { significand: rational(1n, (m + n - 1n) * c), exp: 0n };
      },
    },
  ],
  ...incompleteGammaRules(),
  ...incompleteBetaRules(),
  ["erf", { known: at(ZERO, ZERO), range: UNIT_RANGE }],
  [
    "erfc",
    {
      magnitude: ([x]) => erfcMagnitude(x!),
      known: at(ZERO, ONE),
      range: {
        lo: { value: ZERO, open: true },
        hi: { value: dec("2"), open: true },
      },
    },
  ],
  [
    "doublefactorial",
    {
      domain: ([n]) => notExactInteger(n!) || belowMinusOne(n!),
      reference: ([n]) => {
        const value = integerValue(n!);
        return value === undefined || value > 300n
          ? undefined
          : integer(valueOrOne(doubleFactorialOf(value, EXACT)));
      },
      tooLarge: ([n], context) =>
        unformable(n!, context) || (integerValue(n!.mid) ?? 0n) > 11_000n,
    },
  ],
  ["log10", { domain: ([x]) => nonpositive(x!), known: at(ONE, ZERO) }],
  ["log2", { domain: ([x]) => nonpositive(x!), known: at(ONE, ZERO) }],
  [
    "log",
    {
      domain: ([b, x]) =>
        nonpositive(b!) || nonpositive(x!) || isPoint(b!, ONE),
      known: ([b, x]) =>
        isExactly(x!, ONE) && isExact(b!) && !equals(b!.mid, ONE)
          ? ZERO
          : undefined,
    },
  ],
  [
    "sqrt",
    {
      domain: ([x]) => negative(x!),
      known: (args) =>
        isExactly(args[0]!, ONE)
          ? ONE
          : isExactly(args[0]!, ZERO)
            ? ZERO
            : undefined,
      range: NONNEGATIVE,
    },
  ],
  [
    "cbrt",
    {
      known: (args) =>
        isExactly(args[0]!, ONE)
          ? ONE
          : isExactly(args[0]!, MINUS_ONE)
            ? MINUS_ONE
            : isExactly(args[0]!, ZERO)
              ? ZERO
              : undefined,
    },
  ],
  [
    "pow",
    {
      magnitude: ([x, y]) => powerMagnitude(x!, y!),
      // An exact exponent whose fraction cannot be formed within the
      // significand limit may be refused (devdocs/numbers.md, "The
      // significand limit"), as `^` refuses it, though `pow` takes it to
      // log space (devdocs/numbers.md, "Roots and powers"; #88), and so
      // may an integer power of an exact base whose predicted size passes
      // it, as `^`'s is.
      tooLarge: ([x, y], context) =>
        isExact(y!) &&
        (!formable(y!.mid, context.significandLimitBits) ||
          (isExact(x!) &&
            isInteger(y!.mid) &&
            predictedPastLimit(x!.mid, y!.mid, context))),
      domain: ([x]) => nonpositive(x!),
      divisionByZero: ([x, y]) =>
        isExactly(x!, ZERO) && isExact(y!) && sign(y!.mid) < 0,
      known: ([x, y]) =>
        isExactly(x!, ONE) || isExactly(y!, ZERO)
          ? ONE
          : isExactly(y!, ONE)
            ? x!.mid
            : undefined,
    },
  ],
  [
    "sin",
    {
      tooLarge: ([x], context) => isHuge(x!, context),
      known: at(ZERO, ZERO),
      range: UNIT_RANGE,
    },
  ],
  [
    "cos",
    {
      tooLarge: ([x], context) => isHuge(x!, context),
      known: at(ZERO, ONE),
      range: UNIT_RANGE,
    },
  ],
  [
    "tan",
    { tooLarge: ([x], context) => isHuge(x!, context), known: at(ZERO, ZERO) },
  ],
  [
    "asin",
    {
      domain: ([x]) => compareBeyondOne(x!),
      known: at(ZERO, ZERO),
      range: {
        lo: { value: negate(HALF_PI_ABOVE) },
        hi: { value: HALF_PI_ABOVE },
      },
    },
  ],
  [
    "acos",
    {
      domain: ([x]) => compareBeyondOne(x!),
      known: at(ONE, ZERO),
      range: { lo: { value: ZERO }, hi: { value: PI_ABOVE } },
    },
  ],
  [
    "atan",
    {
      known: at(ZERO, ZERO),
      range: {
        lo: { value: negate(HALF_PI_ABOVE) },
        hi: { value: HALF_PI_ABOVE },
      },
    },
  ],
  [
    "atan2",
    {
      // `atan2(y, x)` for an `x` positive throughout lies between half of
      // `min(|y / x|, 1)` and `|y / x|` in magnitude, so a tiny ratio's
      // arctangent can pass the bound below; against any other `x` it is
      // near `pi` or `pi/2`, and never passes.
      magnitude: ([y, x]) => {
        if (sign(x!.lo) <= 0) return NO_MAGNITUDE;
        const ratio = divideIntervals(y!, x!);
        if (ratio === undefined) return NO_MAGNITUDE;
        const m = magnitudeInterval(ratio);
        const least = compare(m.lo, ONE) < 0 ? m.lo : ONE;
        return {
          kind: "value",
          lo: scaleLoose(least, rational(1n, 2n)),
          hi: m.hi,
        };
      },
      domain: ([y, x]) => isPoint(y!, ZERO) && isPoint(x!, ZERO),
      known: ([y, x]) =>
        isExactly(y!, ZERO) && isExact(x!) && sign(x!.mid) > 0
          ? ZERO
          : undefined,
      range: { lo: { value: negate(PI_ABOVE) }, hi: { value: PI_ABOVE } },
    },
  ],
  [
    "sinh",
    { magnitude: ([x]) => hyperbolicMagnitude(x!), known: at(ZERO, ZERO) },
  ],
  [
    "cosh",
    {
      magnitude: ([x]) => hyperbolicMagnitude(x!),
      known: at(ZERO, ONE),
      range: { lo: { value: ONE } },
    },
  ],
  ["tanh", { known: at(ZERO, ZERO), range: UNIT_RANGE }],
  ["asinh", { known: at(ZERO, ZERO) }],
  [
    "acosh",
    {
      domain: ([x]) => sign(addIntervals(x!, pointInterval(MINUS_ONE)).hi) < 0,
      known: at(ONE, ZERO),
      range: NONNEGATIVE,
    },
  ],
  [
    "atanh",
    {
      domain: ([x]) =>
        sign(addIntervals(x!, pointInterval(MINUS_ONE)).lo) >= 0 ||
        sign(addIntervals(x!, pointInterval(ONE)).hi) <= 0,
      known: at(ZERO, ZERO),
    },
  ],
  [
    "approx",
    {
      modes: ["exact", "decimal"],
      magnitude: ([x]) => valueMagnitude(x!),
      known: (args) => args[0]!.mid,
      settles: true,
      unsettled: true,
    },
  ],
]);

/** Whether `x` lies outside `[-1, 1]` throughout. */
function compareBeyondOne(x: Interval): boolean {
  return (
    sign(addIntervals(x, pointInterval(MINUS_ONE)).lo) > 0 ||
    sign(addIntervals(x, pointInterval(ONE)).hi) < 0
  );
}

/** The built-ins as operations, by arity, with their rules. */
function builtinOperations(): (Operation & { arity: number })[] {
  return [...BUILTINS.values()].flatMap((fn) => {
    // A built-in with a range of arities (`round`, one or two) is run at
    // each count, under the same rules.
    const arities: number[] = [];
    for (let arity = fn.arity.min; arity <= fn.arity.max; arity++) {
      arities.push(arity);
    }
    return arities.map(
      (arity) =>
        ({
          name: fn.name,
          modes: ["exact"],
          ...BUILTIN_RULES.get(fn.name),
          apply: (args, context) => fn.apply(args, context),
          arity,
        }) satisfies Operation & { arity: number },
    );
  });
}

/** `n` as an exact `Scaled`, for the powers. */
function integer(n: bigint): Scaled {
  const s = scaled(rational(n), 0n);
  if (!s.ok) throw new Error("A small integer is within the bound");
  return s.value;
}

/** The exact power `mid^n` for a small `n`, as a loose value. */
function powerOf(mid: Scaled, n: bigint): Loose | undefined {
  if (n < 0n && isZero(mid)) return undefined;
  const magnitude = n < 0n ? -n : n;
  let result: Loose = ONE;
  for (let i = 0n; i < magnitude; i++) result = multiplyLoose(result, mid);
  if (n >= 0n) return result;
  const inverse = rational(result.significand.den, result.significand.num);
  return { significand: inverse, exp: -result.exp };
}

/** The exact powers of the ball operations' sweep: `1`, `2`, `3`, `-1` and `10^30`. */
const POWERS = [1n, 2n, 3n, -1n, 10n ** 30n];

/** The ball operations, with their rules. */
function ballOperations(): (Operation & { arity: number })[] {
  const sum = (op: "add" | "sub"): Operation & { arity: number } => ({
    name: op === "add" ? "addBalls" : "subtractBalls",
    arity: 2,
    apply: (args, context) =>
      (op === "add" ? addBalls : subtractBalls)(args[0]!, args[1]!, context),
    modes: ["exact", "decimal"],
    magnitude: ([a, b]) =>
      valueMagnitude(addIntervals(a!, op === "add" ? b! : negateInterval(b!))),
    // In decimal mode the operands are settled first, so an operand whose
    // rounding passes the top refuses the sum (devdocs/numbers.md, "The exponent bound").
    settles: true,
    // Two exact operands whose aligned sum passes the significand limit,
    // by its alignment or by the bound of its unreduced sum, are
    // `tooLarge` in exact mode, as documented (devdocs/numbers.md, "The significand limit").
    tooLarge: ([a, b], context) =>
      isExact(a!) &&
      isExact(b!) &&
      modeOf(context) === "exact" &&
      !isZero(a!.mid) &&
      !isZero(b!.mid) &&
      sumBits(a!.mid, b!.mid, context.significandLimitBits) >
        context.significandLimitBits,
    // The exact sum where the two align within the loose arithmetic's cap.
    reference: ([a, b]) => {
      const other = op === "add" ? b! : negate(b!);
      if (isZero(a!) || isZero(other)) return isZero(a!) ? other : a!;
      const gap = decimalExponent(a!) - decimalExponent(other);
      if (gap > 1000n || gap < -1000n) return undefined;
      return addIntervals(pointInterval(a!), pointInterval(other)).lo;
    },
  });
  return [
    sum("add"),
    sum("sub"),
    {
      name: "multiplyBalls",
      arity: 2,
      apply: (args, context) => multiplyBalls(args[0]!, args[1]!, context),
      modes: ["exact"],
      magnitude: ([a, b]) => valueMagnitude(multiplyIntervals(a!, b!)),
      reference: ([a, b]) => multiplyLoose(a!, b!),
    },
    {
      name: "divideBalls",
      arity: 2,
      apply: (args, context) => divideBalls(args[0]!, args[1]!, context),
      modes: ["exact"],
      magnitude: ([a, b]) => {
        const q = divideIntervals(a!, b!);
        return q === undefined ? NO_MAGNITUDE : valueMagnitude(q);
      },
      divisionByZero: ([, b]) => isExactly(b!, ZERO),
      reference: ([a, b]) =>
        isZero(b!)
          ? undefined
          : {
              significand: rational(
                a!.significand.num * b!.significand.den,
                a!.significand.den * b!.significand.num,
              ),
              exp: a!.exp - b!.exp,
            },
    },
    ...POWERS.map((n): Operation & { arity: number } => ({
      name: `powBall[${n}]`,
      arity: 1,
      apply: (args, context) => powBall(args[0]!, n, context),
      modes: ["exact", "decimal"],
      magnitude: ([b]) => powerMagnitude(b!, pointInterval(integer(n))),
      // An exact base whose power's predicted size passes the significand limit
      // is `tooLarge`, as documented.
      tooLarge: ([b], context) =>
        isExact(b!) && predictedPastLimit(b!.mid, integer(n), context),
      divisionByZero: ([b]) => n < 0n && isExactly(b!, ZERO),
      reference: n === 10n ** 30n ? undefined : ([b]) => powerOf(b!, n),
      settles: true,
    })),
    ...[2n, 3n].map((degree): Operation & { arity: number } => ({
      name: `rootBall[${degree}]`,
      arity: 1,
      apply: (args, context) => rootBall(args[0]!, degree, context),
      modes: ["exact"],
      magnitude: ([b]) =>
        powerMagnitude(b!, pointInterval(fraction(1n, degree, 0n))),
      domain: ([b]) => degree % 2n === 0n && negative(b!),
      known: (args) =>
        isExactly(args[0]!, ONE)
          ? ONE
          : isExactly(args[0]!, ZERO)
            ? ZERO
            : undefined,
      range: degree % 2n === 0n ? NONNEGATIVE : undefined,
    })),
    {
      name: "step",
      arity: 1,
      apply: (args, context) => step(() => ok(args[0]!), context),
      modes: ["exact", "decimal"],
      magnitude: ([b]) => valueMagnitude(b!),
      known: (args) => args[0]!.mid,
      settles: true,
    },
  ];
}

/**
 * Whether `pow` in rational.ts predicts the exact power `mid^n` past the
 * significand limit of `context`, for an integer `n`: `floor(|n| log2 p) + 1`
 * for `p` the larger of the significand's two parts, the prediction that
 * refuses `3^1000000000` and holds `2^65535` (devdocs/numbers.md, "The significand limit").
 */
function predictedPastLimit(
  mid: Scaled,
  n: Scaled,
  context: NumberContext,
): boolean {
  if (isZero(mid)) return false;
  const magnitude = absoluteBig(n.significand.num) * 10n ** n.exp;
  const num = absoluteBig(mid.significand.num);
  const part = num > mid.significand.den ? num : mid.significand.den;
  if (magnitude > BigInt(context.significandLimitBits)) return true;
  const below = Math.max(0, bitLength(part) - 53);
  const log2 = Math.log2(Number(part >> BigInt(below))) + below;
  return (
    Math.floor(Number(magnitude) * log2) + 1 > context.significandLimitBits
  );
}

/**
 * The bits the exact sum of `a` and `b` is predicted to take before it is
 * formed (devdocs/numbers.md, "The significand limit"): the operand
 * shifted to the lesser exponent,
 * its numerator's bits and the shift's power of ten, and then the bound
 * of the unreduced sum of the aligned fractions, the cross products over
 * the denominators' product with their common factor taken out; past
 * `limit` at the alignment already, nothing more is counted.
 */
function sumBits(a: Scaled, b: Scaled, limit: number): number {
  const shift = a.exp > b.exp ? a.exp - b.exp : b.exp - a.exp;
  if (shift > 10n ** 15n) return Infinity;
  const [shifted, other] = a.exp > b.exp ? [a, b] : [b, a];
  const tens = Math.floor(Number(shift) * Math.log2(10)) + 1;
  const aligned = bitLength(absoluteBig(shifted.significand.num)) + tens;
  if (aligned > limit) return aligned;
  const left = {
    num: shifted.significand.num * 10n ** shift,
    den: shifted.significand.den,
  };
  const right = other.significand;
  if (left.den === right.den) {
    return (
      Math.max(
        bitLength(absoluteBig(left.num)),
        bitLength(absoluteBig(right.num)),
      ) + 1
    );
  }
  const g = gcd(left.den, right.den);
  const bb = left.den / g;
  const dd = right.den / g;
  const numerator =
    Math.max(
      bitLength(absoluteBig(left.num)) + bitLength(dd),
      bitLength(absoluteBig(right.num)) + bitLength(bb),
    ) + 1;
  const denominator = bitLength(bb) + bitLength(dd) + bitLength(g);
  return Math.max(numerator, denominator);
}

function absoluteBig(n: bigint): bigint {
  return n < 0n ? -n : n;
}

// ---------------------------------------------------------------------------
// The oracle

/** The violation the outcome of `op` on `args` shows, or nothing. */
function judge(
  op: Operation,
  args: readonly Ball[],
  context: NumberContext,
): string | undefined {
  const mode = modeOf(context);
  if (mode === "decimal") return judgeDecimal(op, args, context);
  const applied = op.apply(args, context);
  // An operation that returns its result unsettled is stepped here, as
  // the evaluator steps it.
  const result =
    op.unsettled === true && applied.ok
      ? step(() => ok(applied.value), context)
      : applied;
  const intervals = args.map(intervalOf);
  const bounded = intervals.every((i) => i !== undefined);
  const magnitude =
    bounded && op.magnitude !== undefined
      ? op.magnitude(intervals as Interval[])
      : NO_MAGNITUDE;
  const sure = surePast(magnitude);
  if (!result.ok) {
    const { error } = result;
    switch (error.kind) {
      case "overflow":
      case "underflow": {
        if (sure === error.kind) return undefined;
        return `refused ${error.kind} where ${sure === undefined ? "the result does not pass the bound throughout" : `every value is ${sure}`}`;
      }
      case "tooLarge":
        if (op.tooLarge?.(args, context) === true) return undefined;
        return "refused tooLarge where no documented site applies";
      case "domain":
      case "negativeRadicand":
        if (bounded && op.domain?.(intervals as Interval[]) === true)
          return undefined;
        return `${error.kind} where the argument is not outside the domain throughout`;
      case "divisionByZero":
        if (op.divisionByZero?.(args) === true) return undefined;
        return "divisionByZero where the divisor is not exactly zero";
      case "unresolved":
        // Retried by the pipeline, so never a violation here: an exact
        // argument can be `unresolved` too, when an intermediate ball at
        // the working precision straddles an edge (`log(1 + 1e-400, x)`
        // divides by `ln` of the base, zero within an ulp at 18 digits).
        return undefined;
      default:
        return `an unexpected error ${error.kind}`;
    }
  }
  const value = result.value;
  // A ball around zero may reach below the bottom edge (devdocs/numbers.md,
  // "The exponent bound"), so a result
  // that is surely past it may still come back as zero within a bound,
  // when the operation's own radius rule cannot exclude zero; past the
  // top no value is sound.
  if (sure === "overflow" || (sure === "underflow" && !containsZero(value)))
    return `a value where every value of the result is ${sure}`;
  const bad = checkValue(value, mode);
  if (bad !== undefined) return bad;
  const point = op.known?.(args);
  if (point !== undefined && !contains(value, point)) {
    return `the result misses the known value ${describeScaled(point)}`;
  }
  if (op.reference !== undefined) {
    const reference = op.reference(args.map((a) => a.mid));
    if (reference !== undefined) {
      const s = scaledOf(reference);
      if (s === undefined) {
        // Past the bottom, a ball around zero is a sound answer.
        if (decimalExponent(reference) < -MAX_EXPONENT && containsZero(value))
          return undefined;
        return "a value where the exact result of the midpoints passes the bound";
      }
      if (!contains(value, s))
        return "the result misses the exact result of the midpoints";
    }
  }
  if (op.range !== undefined && !intersects(value, op.range)) {
    return "the result lies outside the function's range";
  }
  return undefined;
}

/**
 * The oracle for decimal mode (devdocs/numbers.md, "Decimal mode"): the operation
 * is run as the evaluator runs it, on operands rounded to the context's
 * digits in its mode (an operand the rounding carries past the bound is
 * refused before the operation, and is not the operation's to judge), at
 * rising precision until its rounding is certified (`step`), and
 * its result settled. The result must be exact; where the exact result of
 * the operation on the rounded operands can be formed (`reference`, or
 * `known` at a unit operation's point) the result must be its rounding in
 * the mode, unless the result is marked uncertified, the midpoint's
 * rounding at the ceiling, which is reported as such and not judged. A
 * refusal must be right of the rounded operands' exact result, or be a
 * rounding that carries past the top; a `tooLarge` from a power is what
 * the evaluator recomputes on the widened base, and a sum that does not
 * align what it answers by the neighbor rule, neither judged here; an
 * `unresolved` at the ceiling is the pipeline's to report.
 */
function judgeDecimal(
  op: Operation,
  args: readonly Ball[],
  context: NumberContext,
): string | undefined {
  const rounded: Ball[] = [];
  for (const arg of args) {
    const settled = step(() => ok(arg), context);
    if (!settled.ok) return undefined;
    rounded.push(settled.value);
  }
  const result = step((working) => op.apply(rounded, working), context);
  const intervals = rounded.map(intervalOf);
  const bounded = intervals.every((i) => i !== undefined);
  const magnitude =
    bounded && op.magnitude !== undefined
      ? op.magnitude(intervals as Interval[])
      : NO_MAGNITUDE;
  const sure = surePast(magnitude);
  const reference =
    op.reference === undefined
      ? undefined
      : op.reference(rounded.map((a) => a.mid));
  const roundedReference =
    reference === undefined ? undefined : roundedLoose(reference, context);
  if (!result.ok) {
    const { error } = result;
    switch (error.kind) {
      case "overflow":
      case "underflow": {
        if (sure === error.kind) return undefined;
        if (roundedReference === "past") return undefined;
        return `refused ${error.kind} where ${sure === undefined ? "the result does not pass the bound throughout" : `every value is ${sure}`}`;
      }
      case "tooLarge":
        // The evaluator answers these by its own rules on top of the ball
        // operation: a sum that does not align by the neighbor rule, a
        // power that does not fit on the widened base (devdocs/numbers.md,
        // "Decimal mode").
        if (EVALUATOR_RULES.has(op.name) || op.name.startsWith("pow"))
          return undefined;
        if (op.tooLarge?.(rounded, context) === true) return undefined;
        return "refused tooLarge where no documented site applies";
      case "domain":
      case "negativeRadicand":
        if (bounded && op.domain?.(intervals as Interval[]) === true)
          return undefined;
        return `${error.kind} where the argument is not outside the domain throughout`;
      case "divisionByZero":
        if (op.divisionByZero?.(rounded) === true) return undefined;
        return "divisionByZero where the divisor is not exactly zero";
      case "unresolved":
        return undefined;
      default:
        return `an unexpected error ${error.kind}`;
    }
  }
  const value = result.value;
  if (!isExact(value)) return "an inexact value in decimal mode";
  if (sure === "overflow" || (sure === "underflow" && !isZero(value.mid)))
    return `a value where every value of the result is ${sure}`;
  const bad = checkValue(value, "decimal");
  if (bad !== undefined) return bad;
  if (value.uncertified === true) return undefined;
  const point = op.known?.(rounded);
  if (
    point !== undefined &&
    !equals(value.mid, roundedScaled(point, context))
  ) {
    return `the result is not the rounding of the known value ${describeScaled(point)}`;
  }
  if (roundedReference !== undefined) {
    if (roundedReference === "past")
      return "a value where the exact result of the midpoints passes the bound";
    if (!equals(value.mid, roundedReference))
      return "the result is not the rounding of the exact result of the midpoints";
  }
  if (op.range !== undefined && !intersects(value, op.range)) {
    return "the result lies outside the function's range";
  }
  return undefined;
}

/** The ball operations whose `tooLarge` the evaluator answers in decimal mode by a rule of its own (the sums; the powers are matched by name). */
const EVALUATOR_RULES: ReadonlySet<string> = new Set([
  "addBalls",
  "subtractBalls",
]);

/** `s` rounded to the context's digits in its mode; zero as it is. */
function roundedScaled(s: Scaled, context: NumberContext): Scaled {
  return isZero(s) ? s : roundTo(s, context.precision, context.rounding);
}

/** The rounding of the exact result `loose`, or `"past"` where it, or its rounding, lies past the exponent bound. */
function roundedLoose(loose: Loose, context: NumberContext): Scaled | "past" {
  const s = scaledOf(loose);
  if (s === undefined) return "past";
  const rounded = roundedScaled(s, context);
  if (isZero(rounded)) return rounded;
  const e = decimalExponent(rounded);
  return e > MAX_EXPONENT || e < -MAX_EXPONENT ? "past" : rounded;
}

function describeScaled(s: Scaled): string {
  return isInteger(s) && s.exp === 0n
    ? s.significand.num.toString()
    : `${s.significand.num}/${s.significand.den}e${s.exp}`;
}

// ---------------------------------------------------------------------------
// The cases

function* cases(): Generator<Case> {
  const args = edgeArguments();
  const second = args.filter((a) => SECOND.has(a.name));
  if (second.length !== SECOND.size) {
    throw new Error("Every second operand names an argument of the sweep");
  }
  const third = args.filter((a) => THIRD.has(a.name));
  if (third.length !== THIRD.size) {
    throw new Error("Every third operand names an argument of the sweep");
  }
  const operations = [...builtinOperations(), ...ballOperations()];
  for (const op of operations) {
    const tuples: Argument[][] =
      op.arity === 0
        ? [[]]
        : op.arity === 1
          ? args.map((a) => [a])
          : op.arity === 2
            ? args.flatMap((a) => second.map((b) => [a, b]))
            : second.flatMap((a) =>
                second.flatMap((b) => third.map((c) => [a, b, c])),
              );
    for (const mode of op.modes) {
      const context = mode === "exact" ? EXACT : DECIMAL;
      const suffix = mode === "decimal" ? " [decimal]" : "";
      for (const tuple of tuples) {
        const name = `${op.name}(${tuple.map((a) => a.name).join(", ")})${suffix}`;
        yield {
          name,
          run: () =>
            judge(
              op,
              tuple.map((a) => a.ball),
              context,
            ),
        };
      }
    }
  }
}

if (isMainThread) {
  test("the edge sweep at the ball level", async (t) => {
    await sweep(t, import.meta.url, KNOWN, SKIPS, DEADLINE_MS);
  });
} else {
  runCases(cases(), SKIPS);
}
