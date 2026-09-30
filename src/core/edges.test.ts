// The edge sweep at the ball level (docs/calculator-plan.md, H.10): every
// built-in of `BUILTINS`, enumerated by arity so that a function added
// later joins it, the four exact operations of the ball, `powBall`,
// `rootBall` and `settle`, run over the classes of arguments at the edges
// of the number type, each exact and with a relative radius of about
// `1e-30`, and the wide balls; the operations that read the mode run in
// decimal mode too. Each case is checked against the oracle
// src/testing/edges.ts states: no throw; a refusal only where the
// decisions allow one (an `overflow` or `underflow` only when every value
// of the true result passes the bound, D18; `tooLarge` only at a
// documented site; a domain error only for an argument outside the domain
// throughout; an `unresolved` is retried by the pipeline and never a
// violation, an exact argument's included); and, for a value,
// D17's two conditions, the known points (`sin(0)`, `exp(0)`, `pow(1, y)`,
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
  rootBall,
  settle,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import { isHuge, type BuiltinError } from "./builtin.ts";
import { BUILTINS } from "./builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  modeOf,
  type Mode,
  type NumberContext,
} from "./context.ts";
import { powerOfTenRadius } from "./radius.ts";
import { bitLength, rational } from "./rational.ts";
import type { Result } from "./result.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  compare,
  decimalExponent,
  equals,
  formable,
  isInteger,
  isZero,
  negate,
  roundTo,
  scaled,
  sign,
  type Scaled,
} from "./scaled.ts";
import {
  NO_MAGNITUDE,
  addIntervals,
  checkValue,
  contains,
  divideIntervals,
  expMagnitude,
  hyperbolicMagnitude,
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
    issue: "#61",
    task: "H.15",
    cases: /^powBall\[-?1\]\(~/,
    violation: /^refused (overflow|underflow) where the result does not pass/,
    reason:
      "`powBall`'s guard multiplies `log2Scale`, the base's `|log2|` with a relative slack of `10^-9`, by `n`, and guards `n = 1` and `n = -1` too, so an inexact base at either edge of the bound is refused where its power is the base itself or its reciprocal, both within; H.15 replaces the guard with the classifier.",
  },
  {
    issue: "#46",
    task: "H.15",
    cases:
      /^powBall\[1000000000000000000000000000000\]\(~-?1(\.000000000000000000000001)?\)|^pow\(~1, ~1e1000000000000000000\/3\)/,
    violation: /^refused overflow/,
    reason:
      "`log2Scale` adds an absolute slack of `10^-9` to `|log2|` of the base, so a base of magnitude one is refused past `n ≈ 3.3 × 10^27`, and `powLogSpace` refuses an exponent a double cannot hold before it looks at `ln x`; H.15 bounds `n ln |b|` and `y ln x` on their intervals.",
  },
  {
    issue: "#40",
    task: "H.15",
    cases: /^(exp|sinh|cosh|pow|powBall\[1000000000000000000000000000000\])\(/,
    violation: /^refused (overflow|underflow) where the result does not pass/,
    reason:
      "The guards of the exponential family and of the powers refuse on the whole ball's magnitude, so a wide argument, or an exponent straddling zero over a base at the bottom edge, is refused for good where D18 has it `unresolved` at the bound; H.15's classifier refuses only when every value passes.",
  },
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
  maxBits: DEFAULT_MAX_BITS,
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
    // Tiny, and the top of the range limit.
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
    // A mantissa of 25 digits near one.
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
      // An exact exponent whose fraction cannot be formed within the range
      // limit is refused as documented (H.9, until H.16), and so is an
      // integer power of an exact base whose predicted size passes it, as
      // `^` is.
      tooLarge: ([x, y], context) =>
        isExact(y!) &&
        (!formable(y!.mid, context.maxBits) ||
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
  return [...BUILTINS.values()].map((fn) => {
    if (fn.arity.min !== fn.arity.max) {
      throw new Error(
        `${fn.name} takes a range of arguments, which the sweep does not enumerate`,
      );
    }
    return {
      name: fn.name,
      modes: ["exact"],
      ...BUILTIN_RULES.get(fn.name),
      apply: (args, context) => fn.apply(args, context),
      arity: fn.arity.min,
    } satisfies Operation & { arity: number };
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
  const inverse = rational(result.mant.den, result.mant.num);
  return { mant: inverse, exp: -result.exp };
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
    // rounding passes the top refuses the sum (D17).
    settles: true,
    // Two exact operands whose alignment exceeds the range limit are
    // `tooLarge` in exact mode, as documented.
    tooLarge: ([a, b], context) =>
      isExact(a!) &&
      isExact(b!) &&
      modeOf(context) === "exact" &&
      !isZero(a!.mid) &&
      !isZero(b!.mid) &&
      alignmentBits(a!.mid, b!.mid) > context.maxBits,
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
      apply: (args) => multiplyBalls(args[0]!, args[1]!),
      modes: ["exact"],
      magnitude: ([a, b]) => valueMagnitude(multiplyIntervals(a!, b!)),
      reference: ([a, b]) => multiplyLoose(a!, b!),
    },
    {
      name: "divideBalls",
      arity: 2,
      apply: (args) => divideBalls(args[0]!, args[1]!),
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
              mant: rational(
                a!.mant.num * b!.mant.den,
                a!.mant.den * b!.mant.num,
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
      // An exact base whose power's predicted size passes the range limit
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
      name: "settle",
      arity: 1,
      apply: (args, context) => settle(args[0]!, context),
      modes: ["exact", "decimal"],
      magnitude: ([b]) => valueMagnitude(b!),
      known: (args) => args[0]!.mid,
      settles: true,
    },
  ];
}

/**
 * Whether `pow` in rational.ts predicts the exact power `mid^n` past the
 * range limit of `context`, for an integer `n`: `|n|` times the larger of
 * the mantissa's two sizes in bits, the prediction that refuses `3^1000000000`.
 */
function predictedPastLimit(
  mid: Scaled,
  n: Scaled,
  context: NumberContext,
): boolean {
  if (isZero(mid)) return false;
  const magnitude = absoluteBig(n.mant.num) * 10n ** n.exp;
  const bits = Math.max(
    bitLength(absoluteBig(mid.mant.num)),
    bitLength(mid.mant.den),
  );
  return (
    magnitude > BigInt(context.maxBits) ||
    Number(magnitude) * bits > context.maxBits
  );
}

/** The bits a sum of `a` and `b` aligns by: the decades between their exponents at `log2 10` each. */
function alignmentBits(a: Scaled, b: Scaled): number {
  const shift = a.exp > b.exp ? a.exp - b.exp : b.exp - a.exp;
  return shift > 10n ** 15n ? Infinity : Number(shift) * Math.log2(10);
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
  const applied = op.apply(args, context);
  // An operation that returns its result unsettled is settled here, as
  // the evaluator settles it, which in decimal mode may refuse it.
  const result =
    op.unsettled === true && applied.ok
      ? settle(applied.value, context)
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
        if (
          mode === "decimal" &&
          op.settles === true &&
          error.kind === "overflow" &&
          bounded &&
          roundedPastTop(intervals as Interval[], context)
        ) {
          return undefined;
        }
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
  // A ball around zero may reach below the bottom edge (D17), so a result
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
        // Past the bottom, a ball around zero is a sound answer (D17).
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

/** Whether rounding the top of the arguments' magnitude to the context's precision in its mode carries it past the top (D17, decimal mode). */
function roundedPastTop(
  intervals: readonly Interval[],
  context: NumberContext,
): boolean {
  return intervals.some((i) => {
    for (const end of [i.lo, i.hi]) {
      const s = scaledOf(end);
      if (s === undefined) return true;
      if (isZero(s)) continue;
      const rounded = roundTo(s, context.precision, context.rounding);
      if (!isZero(rounded) && decimalExponent(rounded) > MAX_EXPONENT)
        return true;
    }
    return false;
  });
}

function describeScaled(s: Scaled): string {
  return isInteger(s) && s.exp === 0n
    ? s.mant.num.toString()
    : `${s.mant.num}/${s.mant.den}e${s.exp}`;
}

// ---------------------------------------------------------------------------
// The cases

function* cases(): Generator<Case> {
  const args = edgeArguments();
  const second = args.filter((a) => SECOND.has(a.name));
  if (second.length !== SECOND.size) {
    throw new Error("Every second operand names an argument of the sweep");
  }
  const operations = [...builtinOperations(), ...ballOperations()];
  for (const op of operations) {
    const tuples: Argument[][] =
      op.arity === 0
        ? [[]]
        : op.arity === 1
          ? args.map((a) => [a])
          : args.flatMap((a) => second.map((b) => [a, b]));
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
