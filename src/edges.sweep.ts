// The edge sweep at the text level (docs/calculator-plan.md, H.10):
// `parseExpr`, `evaluateText` and `convertText` on the reproductions of
// every issue filed against stage 4's code, in both modes, with `show` and
// `roundTerms` called as outcome.ts calls them, so that the
// display's own steps run too. Each case carries what the decisions say
// it should give (a value with these digits, or containing this point; a
// refusal of this kind; an error of this kind; a unit list), and the
// oracle checks that, plus what src/testing/edges.ts checks of every
// value: no throw, D17's two conditions, and, for an exact result in
// exact mode, D19's size rule, that its significand is within `significandLimitBits`. A
// unit list is checked for the value of its shown terms: the terms times
// their units must add up to the `have` within the rounding shown. The
// cases run in a worker under a deadline, and the known violations are
// the table `KNOWN`, keyed by the issue and the task that empties each
// entry; #52's conversions are H.14's tests, not the sweep's.

import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isMainThread } from "node:worker_threads";
import { divideBalls, exact, isExact, type Ball } from "./core/ball.ts";
import { buildTable } from "./core/build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  modeOf,
  type Mode,
  type NumberContext,
} from "./core/context.ts";
import { roundTerms } from "./core/convert.ts";
import type { UnitTable } from "./core/table.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { show } from "./core/display.ts";
import { parseExpr } from "./core/expr.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type ConversionError,
  type TextError,
} from "./core/pipeline.ts";
import { bitLength } from "./core/rational.ts";
import {
  ONE,
  ZERO,
  absolute,
  compare,
  equals,
  format,
  negate,
  sign,
} from "./core/scaled.ts";
import {
  addLoose,
  checkValue,
  contains,
  looseFromText,
  multiplyLoose,
  runCases,
  scaleLoose,
  sweep,
  type Case,
  type Known,
  type Loose,
  type Skip,
} from "./testing/edges.ts";
import { dec } from "./testing/scaled.ts";
import { rational } from "./core/rational.ts";

// ---------------------------------------------------------------------------
// The known violations

/**
 * The violations the sweep finds today, each the pattern of an open issue
 * and the task that fixes it; the task deletes the entry. Two of the
 * follow-ups the plan leaves open have no entry, since the sweep sees no
 * violation of theirs: #65 is a cost, the pass `tanh(75)` wastes at 32
 * digits, whose case below reports its time and asserts nothing of it;
 * and the table's prefix lookup throws only for a user definition within
 * a prefix's factor of the bound, which the shipped file has none of.
 */
const KNOWN: readonly Known[] = [
  {
    issue: "#63",
    task: "a follow-up",
    cases: /^(asin|acos|acosh)\((0\.1|1\.5) \+ 1e-15000\)$/,
    violation: /got the error tooLarge$/,
    reason:
      "`complementRoot` and `acosh` form `1 - x^2` and `x^2 - 1` exactly for an exact argument, whose square does not align within the significand limit for a significand this long; an inexact argument is settled first and computed.",
  },
];

/** The cases known to hang, not run. */
const SKIPS: readonly Skip[] = [];

/** The deadline on the whole sweep. */
const DEADLINE_MS = 90_000;

// ---------------------------------------------------------------------------
// The cases

/** What a case should give, per the decisions. */
type Expect =
  /** A value: one whose midpoint formats to `digits` at their count, or whose ball contains the point `contains`, or any. */
  | {
      readonly kind: "value";
      readonly digits?: string;
      readonly contains?: string;
    }
  /** A refusal at one of the two limits. */
  | {
      readonly kind: "refused";
      readonly error: "overflow" | "underflow" | "tooLarge";
    }
  /** Another error, by its root kind: `unresolved`, `domain`, `negativeRadicand`, `syntax`, … */
  | { readonly kind: "error"; readonly error: string }
  /** A unit list, whose shown terms add up to the `have`. */
  | { readonly kind: "list" };

/** An expectation, the same in both modes or one per mode. */
type Verdict = Expect | { readonly exact: Expect; readonly decimal: Expect };

type TextCase = {
  /** The name, when the text is too long to be one. */
  readonly name?: string;
  readonly text: string;
  /** The `want` of a conversion; absent for an evaluation. */
  readonly want?: string;
  readonly precision?: number;
  readonly significandLimitBits?: number;
  readonly expect: Verdict;
};

function digits(digits: string): Expect {
  return { kind: "value", digits };
}
function containing(point: string): Expect {
  return { kind: "value", contains: point };
}
const VALUE: Expect = { kind: "value" };
const ZERO_VALUE = containing("0");
const LIST: Expect = { kind: "list" };
function refused(error: "overflow" | "underflow" | "tooLarge"): Expect {
  return { kind: "refused", error };
}
function error(error: string): Expect {
  return { kind: "error", error };
}
const UNRESOLVED = error("unresolved");

const E18 = "1000000000000000000";
const E18_LESS_ONE = "999999999999999999";
const WIDE_32 = { precision: 32, significandLimitBits: 32768 };

/**
 * The first twenty primes past two, each to a power the significand limit
 * admits: `pow` predicts a power's size as the base's bit length times the
 * exponent, so `3^30000` is admitted and `3^37855`, of 60,000 bits, is not.
 */
const COPRIME_POWERS = [
  3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79,
].map((p) => `${p}^${Math.floor(60000 / bitLength(BigInt(p)))}`);

const CASES: readonly TextCase[] = [
  // #38: tanh of a wide ball around zero, certified as ±1.
  {
    text: "tanh(1e60 * sqrt(2) - 1e60 * sqrt(2))",
    ...WIDE_32,
    expect: ZERO_VALUE,
  },
  { text: "tanh(approx(1e60) - approx(1e60))", ...WIDE_32, expect: ZERO_VALUE },
  // #39: exp and pow of a wide argument crashed.
  // In decimal mode every value is exact (D26): `approx` is the identity,
  // the difference is exactly zero, and the function of zero is its value.
  {
    text: "exp(1e60 * sqrt(2) - 1e60 * sqrt(2))",
    ...WIDE_32,
    expect: digits("1"),
  },
  {
    text: "exp(approx(1e60) - approx(1e60))",
    ...WIDE_32,
    expect: digits("1"),
  },
  {
    text: "pow(2, approx(1e60) - approx(1e60))",
    ...WIDE_32,
    expect: digits("1"),
  },
  // #40: a radius alone makes exp refuse; H.15's forms beside it. In
  // decimal mode `1e999 - 5` is `1e999` at thirty-two digits, exactly, so
  // every difference is zero and the functions give their value there.
  {
    text: "exp(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("148.41316"), decimal: digits("1") },
  },
  {
    text: "exp(1e999 - (1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("148.41316"), decimal: digits("1") },
  },
  {
    text: "sinh(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("74.203211"), decimal: digits("0") },
  },
  {
    text: "cosh(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("74.209949"), decimal: digits("1") },
  },
  {
    text: "pow(2, approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("32"), decimal: digits("1") },
  },
  // #44: values at the edge of the exponent bound crash; H.11 to H.13.
  { text: `1e-${E18} / approx(3)`, expect: refused("underflow") },
  { text: `1e-${E18} / 3`, expect: refused("underflow") },
  { text: `approx(1e-${E18_LESS_ONE})`, expect: digits(`1e-${E18_LESS_ONE}`) },
  { text: `1e-${E18_LESS_ONE} s`, want: "hr;min;s", expect: LIST },
  { text: `1e-${E18_LESS_ONE} s`, want: "time", expect: LIST },
  { text: `1e${E18_LESS_ONE} s`, want: "hr;min;s", expect: LIST },
  { text: `1e${E18_LESS_ONE} s`, want: "time", expect: LIST },
  { text: `1e${E18_LESS_ONE} m`, want: "ft;in", expect: LIST },
  { text: `1e-${E18_LESS_ONE} m`, want: "ft;in", expect: LIST },
  {
    text: `1e${E18_LESS_ONE} m`,
    want: `1e-999999999999999998 m; 1e-${E18_LESS_ONE} m`,
    expect: refused("overflow"),
  },
  {
    text: "99999999999e999999999999999990",
    expect: {
      exact: digits(`9.9999999999e+${E18}`),
      decimal: refused("overflow"),
    },
  },
  {
    text: `1e-${E18_LESS_ONE} / approx(3)`,
    expect: digits(`3.3333333e-${E18}`),
  },
  {
    text: `approx(9.${"9".repeat(44)}e${E18}) / 7`,
    expect: {
      exact: digits(`1.4285714e+${E18}`),
      decimal: refused("overflow"),
    },
  },
  { text: `1.234567891e-${E18_LESS_ONE} m`, want: "m;mm", expect: LIST },
  // #45: pow with an exact exponent below about 1e-308 crashed.
  { text: "pow(2, 1e-400)", expect: digits("1") },
  { text: "2^1e-400", expect: digits("1") },
  { text: "pow(2, 1e-300)", expect: digits("1") },
  // #46: powers near one, and of 0 and ±1; H.6, H.15 and H.16. In decimal
  // mode `approx(1)` is exactly one (D26), and its power one.
  {
    text: "approx(1)^1000000000000000000000000000000",
    expect: digits("1"),
  },
  { text: "pow(1, approx(1e400))", expect: digits("1") },
  // In decimal mode the base rounds to one, exactly, and the power is one.
  {
    text: "pow(1 + 1e-400, approx(1e400))",
    expect: { exact: digits("2.7182818"), decimal: digits("1") },
  },
  { text: "pow(1, 1e999999999)", expect: digits("1") },
  { text: "pow(-1, 1e999999999)", expect: digits("1") },
  { text: "pow(0, 1e999999999)", expect: ZERO_VALUE },
  // In decimal mode the base is exactly `1.0000001`, and its power is past
  // the top as in exact mode.
  { text: "approx(1.0000001)^1e30", expect: refused("overflow") },
  { text: "pow(2, approx(1e400))", expect: refused("overflow") },
  // Exact mode cannot tell `approx(1)` from one; decimal mode has one.
  {
    text: "pow(approx(1), 1e999999999)",
    expect: { exact: UNRESOLVED, decimal: digits("1") },
  },
  {
    text: "pow(1 + (approx(1/3) - 1/3) * 1e20, 1e999999999)",
    expect: { exact: UNRESOLVED, decimal: digits("1") },
  },
  // #47: the inverse trigonometric functions of extreme arguments.
  { text: `atan2(1, -1e${E18_LESS_ONE})`, expect: digits("3.1415927") },
  { text: `atan2(1e-${E18_LESS_ONE}, -1)`, expect: digits("3.1415927") },
  { text: "acos(1e-20000)", expect: digits("1.5707963") },
  { text: "acos(1e-999999999)", expect: digits("1.5707963") },
  { text: "acos(1e-600000000000000000)", expect: digits("1.5707963") },
  { text: "asin(1e30000)", expect: error("domain") },
  { text: "asin(1e600000000000000000)", expect: error("domain") },
  { text: "atan2(1e30000, 1)", expect: digits("1.5707963") },
  { text: "atan2(1, 1e-30000)", expect: digits("1.5707963") },
  {
    text: "atan2(1e600000000000000000, 1e-600000000000000000)",
    expect: digits("1.5707963"),
  },
  // #48: a sum past the bound with an inexact operand was shown as zero.
  // The exact sum is past the bound throughout; the sum with `approx`'s
  // radius reaches back within it, `unresolved` at the bound (D18) at
  // every precision, since the midpoint sits on the bound. In decimal
  // mode `approx` is the identity and the sum is past the top.
  {
    text: `approx(5e${E18}) + 5e${E18}`,
    expect: { exact: UNRESOLVED, decimal: refused("overflow") },
  },
  { text: `5e${E18} + 5e${E18}`, expect: refused("overflow") },
  {
    text: "3047999999999999999999999999999999996953e999999999999999978 m",
    want: "ft;in",
    expect: refused("overflow"),
  },
  // In decimal mode the `have` rounds to `3.048e+(10^18)` at eight digits,
  // exactly (D26), and its count of feet is `1e+(10^18 + 1)`, past the top.
  {
    text: "3047999999999999999999999999999999996953e999999999999999961 m",
    want: "ft;in",
    expect: { exact: LIST, decimal: refused("overflow") },
  },
  {
    text: "1e999999999999999980/3 + approx(333333333333333333333e999999999999999980)",
    expect: digits(`3.3333333e+${E18}`),
  },
  // #49: tanh of a ball reaching both sides of zero.
  {
    text: "tanh(1e5000 * (sin(1 radian)^2 + cos(1 radian)^2 - 1))",
    expect: ZERO_VALUE,
  },
  { text: "tanh(1e20000 - approx(1e20000))", expect: ZERO_VALUE },
  // #50: a literal refused by its written exponent; H.13.
  { text: "0e2000000000000000000", expect: ZERO_VALUE },
  { text: "10e-1000000000000000001", expect: digits(`1e-${E18}`) },
  { text: "1000e-1000000000000000002", expect: digits(`1e-${E18_LESS_ONE}`) },
  { text: "0.001e1000000000000000003", expect: digits(`1e+${E18}`) },
  {
    text: "12345678e-1000000000000000007",
    expect: digits(`1.2345678e-${E18}`),
  },
  { text: `1e${E18} / 3 * 10`, expect: digits(`3.3333333e+${E18}`) },
  { text: `1e-${E18} / 7`, expect: refused("underflow") },
  // #52: exact results held to the significand limit at the node (D19; its
  // conversions are pipeline.test.ts's).
  {
    text: "3^32767 * 7^21845",
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  {
    text: "3^32767 / 7^21845",
    expect: {
      exact: digits("4.6288093e-2828"),
      decimal: digits("4.628809e-2828"),
    },
  },
  {
    text: "3^32767 / 7^21845 / 11^16383",
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  {
    name: "a product of ten coprime powers, each within significandLimitBits",
    text: COPRIME_POWERS.slice(0, 10).join(" * "),
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  {
    name: "a product of twenty coprime powers, each within significandLimitBits",
    text: COPRIME_POWERS.join(" * "),
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  {
    text: "1/3^32767 + 1/7^21845",
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  { text: "2^-30000", expect: { exact: refused("tooLarge"), decimal: VALUE } },
  { text: "1/2^30000", expect: { exact: refused("tooLarge"), decimal: VALUE } },
  { text: "2^-28000", expect: VALUE },
  // #53: exp, and pow with an inexact exponent, on an argument below about 1e-315000.
  { text: "exp(1e-999999999)", expect: digits("1") },
  { text: "exp(-1e-999999999)", expect: digits("1") },
  { text: "exp(1e-316000)", expect: digits("1") },
  { text: "exp(approx(1e-999999999))", expect: digits("1") },
  { text: "exp(sqrt(2) * 1e-999999999)", expect: digits("1") },
  { text: "pow(2, approx(1e-999999999))", expect: digits("1") },
  { text: "pow(2, approx(1e-400000))", expect: digits("1") },
  { text: "pow(approx(2), approx(1e-999999999))", expect: digits("1") },
  // #54: a nested call with a syntax error parsed in exponential time.
  {
    name: "f( nested 18 deep, unclosed",
    text: "f(".repeat(18) + "1",
    expect: error("syntax"),
  },
  {
    name: "f( nested 16 deep, an error inside",
    text: "f(".repeat(16) + "1 +" + ")".repeat(16),
    expect: error("syntax"),
  },
  {
    name: "sin(asin( nested 8 deep, unclosed",
    text: "sin(asin(".repeat(8) + "0.5",
    expect: error("syntax"),
  },
  // #56: built-ins near the kernel's edges at a raised significand limit.
  {
    text: "sinh(1e-315000)",
    significandLimitBits: 1_048_576,
    expect: digits("1e-315000"),
  },
  {
    text: "cosh(1e-315000)",
    significandLimitBits: 1_048_576,
    expect: digits("1"),
  },
  {
    text: "tanh(1e-315000)",
    significandLimitBits: 1_048_576,
    expect: digits("1e-315000"),
  },
  {
    text: "atan(1e-315000)",
    significandLimitBits: 1_048_576,
    expect: digits("1e-315000"),
  },
  {
    text: "exp(1e-315000)",
    significandLimitBits: 1_048_576,
    expect: digits("1"),
  },
  {
    text: "sin(1e-315000 radian)",
    significandLimitBits: 1_048_576,
    expect: digits("1e-315000"),
  },
  {
    text: "cos(1e-315000 radian)",
    significandLimitBits: 1_048_576,
    expect: digits("1"),
  },
  {
    text: "sin(1e315000 radian)",
    significandLimitBits: 1_048_576,
    expect: digits("0.93186736"),
  },
  {
    name: "sinh(0. followed by 200,000 ones) at 1,048,576 bits",
    text: `sinh(0.${"1".repeat(200_000)})`,
    significandLimitBits: 1_048_576,
    expect: digits("0.1113399"),
  },
  ...["sinh", "tanh", "atan", "exp"].map((fn) => ({
    name: `${fn}(0. followed by 170,000 ones) at 600,000 bits`,
    text: `${fn}(0.${"1".repeat(170_000)})`,
    significandLimitBits: 600_000,
    expect:
      fn === "exp"
        ? digits("1.1175191")
        : fn === "atan"
          ? digits("0.11065722")
          : fn === "tanh"
            ? digits("0.11065611")
            : digits("0.1113399"),
  })),
  {
    name: "sinh(0. followed by 105,000 zeros and 105,000 ones) at 360,000 bits",
    text: `sinh(0.${"0".repeat(105_000)}${"1".repeat(105_000)})`,
    significandLimitBits: 360_000,
    expect: digits("1.1111111e-105001"),
  },
  // #57: roots of a large degree crashed or were never resolved.
  { text: "pow(3, 1e-30)", expect: digits("1") },
  { text: "3^1e-30", expect: digits("1") },
  { text: "pow(2, 5e-28)", expect: digits("1") },
  { text: "pow(10, 1e-100)", expect: digits("1") },
  { text: "pow(1/3, 1e-30)", expect: digits("1") },
  { text: "pow(2e200, 1e-20)", expect: digits("1") },
  // In decimal mode the exponent `3^-700` is rounded to eight digits, an
  // exact fraction over a power of ten, which a negative base cannot take
  // (an even root); `1e-5 - approx(1e-5)` is exactly zero there (D26).
  {
    text: "pow(-2, 3^-700)",
    expect: { exact: digits("-1"), decimal: error("negativeRadicand") },
  },
  {
    text: "pow(1e-5 - approx(1e-5), 3^-700)",
    expect: ZERO_VALUE,
  },
  { text: "pow(3^-10000, 2^-30)", expect: digits("0.99998977") },
  { text: "(7^-8000)^(1/99999)", expect: digits("0.85583783") },
  // #58: a unit list crashed when a count left a remainder that could not align; H.12.
  {
    text: "3^32767 m",
    want: "ft/7^21845; in/7^21845",
    expect: { exact: refused("tooLarge"), decimal: LIST },
  },
  {
    text: "3^32767 m",
    want: "ft/7^21845",
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  // #59: a unit list near the top shown a tenth below its value; H.12 and H.13.
  // In decimal mode the `have` itself rounds to `1e+(10^18 + 1)` at eight
  // digits, which D17 refuses (H.11).
  {
    text: `9.99999999999e${E18} m`,
    want: `1e${E18} m; 1e999999999999999990 m`,
    expect: { exact: LIST, decimal: refused("overflow") },
  },
  {
    text: `9.99999999999e${E18} m`,
    want: `1e${E18} m`,
    expect: { exact: digits("10"), decimal: refused("overflow") },
  },
  // #60: a product at the bound decided by its midpoint alone; H.13. In
  // decimal mode `approx(1/3)` is `0.33333333` exactly, the difference
  // `1e38` and the product past the top (D26).
  {
    text: "(1e46 - approx(1/3) * 3e46) * 1e999999999999999983",
    expect: { exact: ZERO_VALUE, decimal: refused("overflow") },
  },
  { text: "(approx(1/3) - 1/3) * 1e-999999999999999990", expect: ZERO_VALUE },
  // In decimal mode the differences are exactly zero, and so the products.
  {
    text: `5e${E18} * (approx(1e5000) - approx(1e5000))`,
    expect: { exact: UNRESOLVED, decimal: digits("0") },
  },
  {
    text: "(approx(1e30) - approx(1e30)) * 3e999999999999999977 + (approx(1e30) - approx(1e30)) * 3e999999999999999977",
    expect: { exact: ZERO_VALUE, decimal: digits("0") },
  },
  // #61: the guards refused within 10^9 decades of the bound. In decimal
  // mode the argument is rounded to eight digits first, exactly, and the
  // exponential of `2.3025851e18` is past the top, of its negation past
  // the bottom (D26).
  {
    text: "exp(2302585092994045000)",
    expect: {
      exact: digits("8.6e+999999999999999702"),
      decimal: refused("overflow"),
    },
  },
  {
    text: "exp(-2302585092994045000)",
    expect: {
      exact: digits("1.2e-999999999999999703"),
      decimal: refused("underflow"),
    },
  },
  {
    text: "exp(2302585092994045685)",
    expect: { exact: digits(`2.7e+${E18}`), decimal: refused("overflow") },
  },
  {
    text: "approx(1e499999999900000000)^2",
    expect: digits("1e+999999999800000000"),
  },
  { text: `approx(9e${E18_LESS_ONE})^1`, expect: digits(`9e+${E18_LESS_ONE}`) },
  {
    text: `(1e-${E18_LESS_ONE} * (1 + approx(1e-30)))^-1`,
    expect: digits(`1e+${E18_LESS_ONE}`),
  },
  // In decimal mode the exponent is `1e18` at eight digits, exactly, and
  // the power the top of the bound itself.
  {
    text: `pow(10, ${E18}.5 + (approx(1e8) - approx(1e8)))`,
    expect: {
      exact: digits(`3.1622777e+${E18}`),
      decimal: digits(`1e+${E18}`),
    },
  },
  { text: `approx(9e${E18_LESS_ONE})`, expect: digits(`9e+${E18_LESS_ONE}`) },
  {
    text: "approx(1e499999999900000000) * approx(1e499999999900000000)",
    expect: digits("1e+999999999800000000"),
  },
  {
    text: `1 / (1e-${E18_LESS_ONE} * (1 + approx(1e-30)))`,
    expect: digits(`1e+${E18_LESS_ONE}`),
  },
  { text: "exp(2302587288910310144)", expect: refused("overflow") },
  // #62: a power of a ball around zero took a minute. The radius comes
  // from its logarithm times the exponent; where it reaches the top of
  // the bound the ball is `unresolved` there, as a product's is (D18).
  // The retry loop narrows the ball below one, whose power is then tiny;
  // in decimal mode the one pass is final. The last exponent is past the
  // significand limit as a fraction, so the power is `tooLarge` (H.16 leaves a
  // base reaching zero as it is).
  { text: "(approx(1e20) - approx(1e20))^100000", expect: ZERO_VALUE },
  {
    text: "(approx(1e20) - approx(1e20))^1e10000",
    expect: ZERO_VALUE,
  },
  {
    text: "(approx(1e20) - approx(1e20))^1e100000",
    expect: refused("tooLarge"),
  },
  // #63: asin, acos and acosh of an exact argument with a long significand; a follow-up.
  { text: "asin(0.1 + 1e-15000)", expect: digits("0.10016742") },
  { text: "acos(0.1 + 1e-15000)", expect: digits("1.4706289") },
  { text: "acosh(1.5 + 1e-15000)", expect: digits("0.96242365") },
  { text: "asin(0.1 + 1e-5000)", expect: digits("0.10016742") },
  // #64: atan and atan2 of a wide ball reaching 2^significandLimitBits; H.7.
  { text: "atan(approx(1e30000) - approx(1e30000))", expect: ZERO_VALUE },
  {
    text: "atan2(approx(1e30000) - approx(1e30000) + 1, 1)",
    expect: containing("0.78539816"),
  },
  // In decimal mode `1 - approx(1)` is exactly zero and the angle a right one.
  {
    text: "atan2(1e-30000, 1 - approx(1))",
    expect: { exact: UNRESOLVED, decimal: digits("1.5707963") },
  },
  { text: "atan(approx(1e3000) - approx(1e3000))", expect: ZERO_VALUE },
  // #65: tanh between the fold and saturation costs a pass; the value is right.
  { text: "tanh(75)", precision: 32, expect: digits("1") },
  // #66: the ^ exponent of long literals; H.9.
  {
    name: "2^(a/b) with 10,000-digit literals",
    text: `2^(${"1234567890".repeat(1000)}/${"9876543210".repeat(1000)})`,
    expect: VALUE,
  },
];

// ---------------------------------------------------------------------------
// The oracle

/** The table the system file builds, at the ceiling of the default context. */
function systemTable(): UnitTable {
  const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");
  const parsed = parseDefinitions(text);
  if (!parsed.ok) throw new Error("The system file parses");
  const built = buildTable(
    parsed.value,
    ceilingContext(contextFor({}, "exact")),
  );
  if (!built.ok) throw new Error("The system file builds");
  return built.value;
}

/** The user's context of `c` in `mode`: the defaults but for what the case sets. */
function contextFor(
  c: Pick<TextCase, "precision" | "significandLimitBits">,
  mode: Mode,
): NumberContext {
  const base: NumberContext = {
    precision: c.precision ?? 8,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits:
      c.significandLimitBits ?? DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  };
  return mode === "decimal" ? { ...base, mode } : base;
}

/** What a case gave, as the oracle reads it. */
type Outcome =
  | { readonly kind: "value"; readonly ball: Ball }
  | { readonly kind: "list" }
  | { readonly kind: "error"; readonly error: string };

/**
 * The root kind of an error, the one a message would name: through a
 * call's or an inverse's body and a conversion's side, a parse rejection
 * as the limit it names, a syntax error as `syntax`, and a built-in's
 * domain error as `domain`.
 */
function rootKind(
  error: TextError | ConversionError | { kind: string },
): string {
  const e = error as {
    kind: string;
    error?: { kind: string };
    reason?: { kind: string };
  };
  switch (e.kind) {
    case "callFailed":
    case "inverseFailed":
    case "inputError":
      return rootKind(e.error!);
    case "unexpected":
      return "syntax";
    case "rejected": {
      const reason = e.reason!.kind;
      return reason === "numberOverflow"
        ? "overflow"
        : reason === "numberUnderflow"
          ? "underflow"
          : "tooLarge";
    }
    case "domainError":
      return "domain";
    default:
      return e.kind;
  }
}

/** The violation the outcome shows against `expect`, or nothing. */
function judgeOutcome(outcome: Outcome, expect: Expect): string | undefined {
  switch (expect.kind) {
    case "value": {
      if (outcome.kind !== "value")
        return `expected a value, got ${describe(outcome)}`;
      const { mid } = outcome.ball;
      if (expect.digits !== undefined) {
        const count = significantDigits(expect.digits);
        const shown = format(mid, count, "halfAwayFromZero");
        if (shown !== expect.digits)
          return `expected ${expect.digits}, got ${shown}`;
      }
      if (
        expect.contains !== undefined &&
        !contains(outcome.ball, dec(expect.contains))
      ) {
        return `expected a ball containing ${expect.contains}, got ${format(mid, 8, "halfAwayFromZero")}`;
      }
      return undefined;
    }
    case "list":
      return outcome.kind === "list"
        ? undefined
        : `expected a unit list, got ${describe(outcome)}`;
    case "refused":
    case "error":
      if (outcome.kind === "error" && outcome.error === expect.error)
        return undefined;
      return `expected ${expect.error}, got ${describe(outcome)}`;
  }
}

function describe(outcome: Outcome): string {
  switch (outcome.kind) {
    case "value":
      return `the value ${format(outcome.ball.mid, 8, "halfAwayFromZero")}`;
    case "list":
      return "a unit list";
    case "error":
      return `the error ${outcome.error}`;
  }
}

/** The significant digits in a decimal literal: its digits before the exponent, less leading zeros. */
function significantDigits(text: string): number {
  const significand = text
    .split("e")[0]!
    .replace(/[-.]/g, "")
    .replace(/^0+/, "");
  return Math.max(1, significand.length);
}

/**
 * What every value must satisfy: D17's two conditions, and D19's size
 * rule for an exact result in exact mode.
 */
function checkQuantity(ball: Ball, context: NumberContext): string | undefined {
  const bad = checkValue(ball, modeOf(context));
  if (bad !== undefined) return bad;
  if (isExact(ball) && modeOf(context) === "exact") {
    const { num, den } = ball.mid.significand;
    const bits = Math.max(bitLength(num < 0n ? -num : num), bitLength(den));
    if (bits > context.significandLimitBits) {
      return `an exact result whose significand has ${bits} bits passes significandLimitBits (D19)`;
    }
  }
  return undefined;
}

/** `text` evaluated at the user's context, with `show` called as the display calls it. */
function judgeEvaluation(
  table: UnitTable,
  text: string,
  expect: Expect,
  context: NumberContext,
): string | undefined {
  const result = evaluateText(table, text, context);
  if (!result.ok)
    return judgeOutcome(
      { kind: "error", error: rootKind(result.error) },
      expect,
    );
  const ball = result.value.magnitude;
  show(ball, { digits: context.precision, rounding: context.rounding });
  return (
    checkQuantity(ball, context) ??
    judgeOutcome({ kind: "value", ball }, expect)
  );
}

/** `have` converted into `want` at the user's context, with the display's steps run on the result. */
function judgeConversion(
  table: UnitTable,
  have: string,
  want: string,
  expect: Expect,
  context: NumberContext,
): string | undefined {
  const result = convertText(table, have, want, context);
  if (!result.ok)
    return judgeOutcome(
      { kind: "error", error: rootKind(result.error) },
      expect,
    );
  const conversion = result.value;
  switch (conversion.kind) {
    case "unit": {
      // The display shows the ratio and, where it exists, its reciprocal.
      show(conversion.value, {
        digits: context.precision,
        rounding: context.rounding,
      });
      const inverse = divideBalls(exact(ONE), conversion.value, context);
      if (inverse.ok)
        show(inverse.value, {
          digits: context.precision,
          rounding: context.rounding,
        });
      return (
        checkQuantity(conversion.value, context) ??
        judgeOutcome({ kind: "value", ball: conversion.value }, expect)
      );
    }
    case "list":
      return (
        checkList(conversion, context) ?? judgeOutcome({ kind: "list" }, expect)
      );
    case "function":
      return "a function conversion, which no case asks for";
  }
}

/**
 * The display's steps on a unit list, as `listResult` in outcome.ts
 * takes them, and the check that the terms shown add up to the `have`: each
 * term's text times its unit's midpoint, summed, within the rounding of the
 * remainder's certified digits of the `have`.
 */
function checkList(
  conversion: Extract<Conversion, { kind: "list" }>,
  context: NumberContext,
): string | undefined {
  const { units, terms, have } = conversion;
  const { precision, rounding } = context;
  const last = terms.length - 1;
  for (const term of terms) {
    const bad = checkValue(term, modeOf(context));
    if (bad !== undefined) return `a term: ${bad}`;
  }
  const shown = terms.map((t) => show(t, { digits: precision, rounding }));
  const unrounded = shown[last]!;
  const certified =
    unrounded.kind === "partial" && unrounded.certified > 0
      ? unrounded.certified
      : precision;
  const rounded = roundTerms(
    units.map((unit) => unit.quantity),
    terms,
    certified,
    rounding,
    context,
  );
  const carried = rounded
    .slice(0, last)
    .some((count, i) => !equals(count.mid, terms[i]!.mid));
  const remainder = carried
    ? show(rounded[last]!, { digits: precision, rounding })
    : unrounded;
  let total: Loose = ZERO;
  const texts: string[] = [];
  rounded.forEach((value, i) => {
    const negative = sign(value.mid) < 0;
    const magnitude = negative ? absolute(value.mid) : value.mid;
    const text =
      i < last
        ? format(magnitude, precision, rounding)
        : remainder.kind === "zero"
          ? "0"
          : format(magnitude, certified, rounding);
    texts.push(`${negative ? "-" : ""}${text} ${units[i]!.text}`);
    // Read back loosely: the display's own rounding of a count can carry
    // it past the bound, which the parser refuses.
    const parsed = looseFromText(text);
    const term = negative ? negate(parsed) : parsed;
    total = addLoose(
      total,
      multiplyLoose(term, units[i]!.quantity.magnitude.mid),
      "up",
    );
  });
  const difference = absolute(
    addLoose(total, negate(have.magnitude.mid), "up"),
  );
  const tolerance = scaleLoose(
    absolute(have.magnitude.mid),
    rational(1n, 10n ** BigInt(Math.max(1, certified - 2))),
  );
  if (compare(difference, tolerance) > 0) {
    return `the terms shown, ${texts.join(" + ")}, do not add up to the have`;
  }
  return undefined;
}

/** A parse alone, for the cases whose expectation is a syntax error. */
function judgeParse(text: string, expect: Expect): string | undefined {
  const parsed = parseExpr(text);
  return judgeOutcome(
    parsed.ok
      ? { kind: "error", error: "parsed" }
      : { kind: "error", error: rootKind(parsed.error) },
    expect,
  );
}

function* cases(): Generator<Case> {
  const table = systemTable();
  for (const c of CASES) {
    for (const mode of ["exact", "decimal"] as const) {
      const expect = "kind" in c.expect ? c.expect : c.expect[mode];
      const context = contextFor(c, mode);
      const settings =
        c.precision === undefined && c.significandLimitBits === undefined
          ? ""
          : ` @ ${context.precision} digits, ${context.significandLimitBits} bits`;
      const name = `${c.name ?? c.text}${c.want === undefined ? "" : ` into ${c.want}`}${settings}${mode === "decimal" ? " [decimal]" : ""}`;
      yield {
        name,
        run: () =>
          expect.kind === "error" && expect.error === "syntax"
            ? judgeParse(c.text, expect)
            : c.want === undefined
              ? judgeEvaluation(table, c.text, expect, context)
              : judgeConversion(table, c.text, c.want, expect, context),
      };
    }
  }
}

if (isMainThread) {
  test("the edge sweep at the text level", async (t) => {
    await sweep(t, import.meta.url, KNOWN, SKIPS, DEADLINE_MS);
  });
} else {
  runCases(cases(), SKIPS);
}
