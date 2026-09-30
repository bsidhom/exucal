// The edge sweep at the text level (docs/calculator-plan.md, H.10):
// `parseExpr`, `evaluateText` and `convertText` on the reproductions of
// every issue filed against stage 4's code, in both modes, with `show` and
// `roundTerms` called as unit-converter.ts calls them, so that the
// display's own steps run too. Each case carries what the decisions say
// it should give (a value with these digits, or containing this point; a
// refusal of this kind; an error of this kind; a unit list), and the
// oracle checks that, plus what src/testing/edges.ts checks of every
// value: no throw, D17's two conditions, and, for an exact result in
// exact mode, D19's size rule, that its mantissa is within `maxBits`. A
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
  DEFAULT_MAX_BITS,
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
  parseDecimal,
  sign,
} from "./core/scaled.ts";
import {
  addLoose,
  checkValue,
  contains,
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
    issue: "#40",
    task: "H.15",
    cases:
      /^(exp|sinh|cosh|pow\(2, )\(?(approx\(1e999\) - approx\(1e999 - 5\)|approx\(1e60\) - approx\(1e60\)|1e60 \* sqrt\(2\) - 1e60 \* sqrt\(2\))\)/,
    violation: /got the error overflow$/,
    reason:
      "The guard of the exponential family and of the log-space power measures the whole argument's ball, so a radius alone refuses `exp`, and `resolve` does not retry a refusal; H.15's classifier refuses only when every value passes the bound and leaves the rest `unresolved`.",
  },
  {
    issue: "#48",
    task: "H.12",
    cases:
      /^3047999999999999999999999999999999996953e999999999999999961 m into ft;in/,
    violation: /^threw Error: A unit list/,
    reason:
      "`roundTerms` rebuilds the list's total from its rounded terms, and the carry's total passes the bound, which it has no way to report; H.12 returns the terms uncarried when the rebuilding fails.",
  },
  {
    issue: "#44",
    task: "H.12",
    cases:
      /into (hr;min;s|time|ft;in|1e-999999999999999998 m; 1e-999999999999999999 m)( \[decimal\])?$/,
    violation: /^threw Error: A unit list/,
    reason:
      "`decompose` assumes that a count, a product and a difference of values within the bound stay within it, and throws on the refusal it has no error to return; H.12 makes it a `Result` and the pipeline passes the refusal on.",
  },
  {
    issue: "#44",
    task: "H.13",
    cases:
      /^(1e-1000000000000000000 \/ (approx\(3\)|3|7)|1e1000000000000000000 \/ 3 \* 10|3047999999999999999999999999999999996953e999999999999999978 m into ft;in)$/,
    violation:
      /(midpoint's decimal exponent -?1000000000000000(001|017) is past the bound|got the error overflow)$/,
    reason:
      "The constructor checks the canonical exponent, which lies within the bound by the mantissa's digits where the value passes it (`1e-10^18 / 7` is `1/7 × 10^-(10^18)`, held, and `1e-10^18 / approx(3)` is a value in exact mode from H.11, whose settle refuses nothing there) and past it where the value is within (`1e10^18 / 3 * 10` is `1/3 × 10^(10^18 + 1)`, refused); D17 puts the bound on the value, and H.13 lands it.",
  },
  {
    issue: "#50",
    task: "H.13",
    cases:
      /^(0e2000000000000000000|10e-1000000000000000001|1000e-1000000000000000002|12345678e-1000000000000000007|1\.234567891e-999999999999999999 m into m;mm)/,
    violation:
      /^expected a (value|unit list), got the error (overflow|underflow)$/,
    reason:
      "`parseDecimal` checks the exponent as written, less the fraction digits, and `scaled()` the canonical exponent, so a literal whose value is within the bound is refused; H.13 leaves the bound to the value.",
  },
  {
    issue: "#46",
    task: "H.15",
    cases:
      /^(approx\(1\)\^1000000000000000000000000000000|pow\(1 \+ 1e-400, approx\(1e400\)\)|pow\(approx\(1\), 1e999999999\)|pow\(1 \+ \(approx\(1\/3\) - 1\/3\) \* 1e20, 1e999999999\))/,
    violation: /got the error (overflow|underflow|tooLarge)$/,
    reason:
      "`powBall`'s guard adds an absolute slack of `10^-9` to the base's `|log2|`, `powLogSpace` refuses an exponent a double cannot hold before it looks at `ln x`, and `pow` refuses an exact exponent it cannot form by the base's midpoint alone; H.15's classifier bounds `y ln x` on the interval and leaves a base of magnitude one `unresolved` at the bound.",
  },
  {
    issue: "#48",
    task: "H.13",
    cases:
      /^(approx\(5e1000000000000000000\) \+ 5e1000000000000000000|5e1000000000000000000 \+ 5e1000000000000000000 \[decimal\])/,
    violation: /^\|mid\| \+ rad reaches/,
    reason:
      "A sum past the bound with an inexact operand, or any operand in decimal mode, is absorbed into the radius as if it had failed to align, and comes back as zero within a bound past the bound; H.13's second commit refuses a sum that aligns and passes the bound.",
  },
  {
    issue: "#52",
    task: "H.14",
    cases:
      /^(3\^32767 \* 7\^21845|3\^32767 \/ 7\^21845 \/ 11\^16383|a product of (ten|twenty) coprime powers, each within maxBits|1\/3\^32767 \+ 1\/7\^21845|2\^-30000|1\/2\^30000|3\^32767 m into ft\/7\^21845)$/,
    violation: /passes maxBits \(D19\)$/,
    reason:
      "Nothing holds a product, a quotient, a sum of fractions or the conversion's ratio to the range limit, so an exact result passes it; H.14 checks every exact node result and the ratio against it (D19) and refuses at the node (D20).",
  },
  {
    issue: "#58",
    task: "H.12",
    cases: /^3\^32767 m into ft\/7\^21845; in\/7\^21845$/,
    violation: /^threw Error: A unit list's arithmetic failed: tooLarge/,
    reason:
      "The settled count leaves a remainder that cannot align within the range limit, and `decompose` throws on the refusal; H.12 passes it on.",
  },
  {
    issue: "#59",
    task: "H.13",
    cases:
      /^9\.99999999999e1000000000000000000 m into 1e1000000000000000000 m; 1e999999999999999990 m$/,
    violation: /do not add up to the have$/,
    reason:
      "The display's rounding carries the remainder into a whole of the first unit, the rebuilt total passes the bound and `addBalls` absorbs it (#48), so the list is shown a tenth short; H.12 shows the terms uncarried when the rebuilding fails, once H.13's sum is `unresolved` at the bound.",
  },
  {
    issue: "#60",
    task: "H.13",
    cases:
      /^(\(1e46 - approx\(1\/3\) \* 3e46\) \* 1e999999999999999983|\(approx\(1\/3\) - 1\/3\) \* 1e-999999999999999990|5e1000000000000000000 \* \(approx\(1e5000\) - approx\(1e5000\)\)|\(approx\(1e30\) - approx\(1e30\)\) \* 3e999999999999999977 \+ )/,
    violation:
      /(got the error (overflow|underflow)|\|mid\| \+ rad reaches 10\^\(10\^18 \+ 1\).*)$/,
    reason:
      "A product is decided by its midpoint alone: one whose ball straddles the bound is refused for good, one containing zero whose midpoint passes below is refused, and one whose midpoint is within may carry a radius past the top; H.13 applies D18.",
  },
  {
    issue: "#61",
    task: "H.15",
    cases:
      /^(exp\(-?2302585092994045(000|685)\)|approx\(1e499999999900000000\)\^2|approx\(9e999999999999999999\)\^1|\(1e-999999999999999999 \* \(1 \+ approx\(1e-30\)\)\)\^-1|pow\(10, 1000000000000000000\.5 \+ \(approx\(1e8\) - approx\(1e8\)\)\) \[decimal\])/,
    violation:
      /(got the error (overflow|underflow)|\|mid\| \+ rad reaches 10\^\(10\^18 \+ 1\).*)$/,
    reason:
      "The guards bound the result's decimal exponent in doubles and through a 30-bit radius, with slack of up to `10^9` decades, and `floatingToBall` checks nothing; H.15 classifies on an interval bounding the logarithm, exactly where the coarse bounds cannot tell.",
  },
  {
    issue: "#63",
    task: "a follow-up",
    cases: /^(asin|acos|acosh)\((0\.1|1\.5) \+ 1e-15000\)$/,
    violation: /got the error tooLarge$/,
    reason:
      "`complementRoot` and `acosh` form `1 - x^2` and `x^2 - 1` exactly for an exact argument, whose square does not align within the range limit for a mantissa this long; an inexact argument is settled first and computed.",
  },
];

/** The cases known to hang, not run. */
const SKIPS: readonly Skip[] = [
  {
    issue: "#62",
    cases: /^\(approx\(1e20\) - approx\(1e20\)\)\^1e1(0000|00000)/,
    reason:
      "A power of a ball around zero squares the radius once per bit of the exponent, whose binary exponent gains a bit each step; `^1e10000` takes a second a pass and `^1e100000` a minute. H.15 takes the radius from `log2` of the radius times `n`.",
  },
];

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
  readonly maxBits?: number;
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
const WIDE_32 = { precision: 32, maxBits: 32768 };

/**
 * The first twenty primes past two, each to a power the range limit
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
  // In decimal mode the one pass leaves the argument wide, and the result
  // straddles the bound: `unresolved`, final there (D18).
  {
    text: "exp(1e60 * sqrt(2) - 1e60 * sqrt(2))",
    ...WIDE_32,
    expect: { exact: digits("1"), decimal: UNRESOLVED },
  },
  {
    text: "exp(approx(1e60) - approx(1e60))",
    ...WIDE_32,
    expect: { exact: digits("1"), decimal: UNRESOLVED },
  },
  {
    text: "pow(2, approx(1e60) - approx(1e60))",
    ...WIDE_32,
    expect: { exact: digits("1"), decimal: UNRESOLVED },
  },
  // #40: a radius alone makes exp refuse; H.15's forms beside it.
  {
    text: "exp(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("148.41316"), decimal: UNRESOLVED },
  },
  // In decimal mode `1e999 - 5` rounds to `1e999` within five, and the
  // exponential of a ball five wide is zero within `e^5`.
  {
    text: "exp(1e999 - (1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("148.41316"), decimal: containing("1") },
  },
  {
    text: "sinh(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("74.203211"), decimal: UNRESOLVED },
  },
  {
    text: "cosh(approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("74.209949"), decimal: UNRESOLVED },
  },
  {
    text: "pow(2, approx(1e999) - approx(1e999 - 5))",
    ...WIDE_32,
    expect: { exact: digits("32"), decimal: UNRESOLVED },
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
  // #46: powers near one, and of 0 and ±1; H.6, H.15 and H.16.
  { text: "approx(1)^1000000000000000000000000000000", expect: digits("1") },
  { text: "pow(1, approx(1e400))", expect: digits("1") },
  // In decimal mode the base rounds to one within `1e-400`, and the power
  // is a ball around one that certifies nothing.
  {
    text: "pow(1 + 1e-400, approx(1e400))",
    expect: { exact: digits("2.7182818"), decimal: containing("1") },
  },
  { text: "pow(1, 1e999999999)", expect: digits("1") },
  { text: "pow(-1, 1e999999999)", expect: digits("1") },
  { text: "pow(0, 1e999999999)", expect: ZERO_VALUE },
  { text: "approx(1.0000001)^1e30", expect: refused("overflow") },
  { text: "pow(2, approx(1e400))", expect: refused("overflow") },
  { text: "pow(approx(1), 1e999999999)", expect: UNRESOLVED },
  {
    text: "pow(1 + (approx(1/3) - 1/3) * 1e20, 1e999999999)",
    expect: UNRESOLVED,
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
  // #48: a sum past the bound with an inexact operand shown as zero; H.13.
  { text: `approx(5e${E18}) + 5e${E18}`, expect: refused("overflow") },
  { text: `5e${E18} + 5e${E18}`, expect: refused("overflow") },
  {
    text: "3047999999999999999999999999999999996953e999999999999999978 m",
    want: "ft;in",
    expect: refused("overflow"),
  },
  {
    text: "3047999999999999999999999999999999996953e999999999999999961 m",
    want: "ft;in",
    expect: LIST,
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
  // #52: exact results held to the range limit; H.14 (its conversions are H.14's tests).
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
    name: "a product of ten coprime powers, each within maxBits",
    text: COPRIME_POWERS.slice(0, 10).join(" * "),
    expect: { exact: refused("tooLarge"), decimal: VALUE },
  },
  {
    name: "a product of twenty coprime powers, each within maxBits",
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
  // #56: built-ins near the kernel's edges at a raised range limit.
  { text: "sinh(1e-315000)", maxBits: 1_048_576, expect: digits("1e-315000") },
  { text: "cosh(1e-315000)", maxBits: 1_048_576, expect: digits("1") },
  { text: "tanh(1e-315000)", maxBits: 1_048_576, expect: digits("1e-315000") },
  { text: "atan(1e-315000)", maxBits: 1_048_576, expect: digits("1e-315000") },
  { text: "exp(1e-315000)", maxBits: 1_048_576, expect: digits("1") },
  {
    text: "sin(1e-315000 radian)",
    maxBits: 1_048_576,
    expect: digits("1e-315000"),
  },
  { text: "cos(1e-315000 radian)", maxBits: 1_048_576, expect: digits("1") },
  {
    text: "sin(1e315000 radian)",
    maxBits: 1_048_576,
    expect: digits("0.93186736"),
  },
  {
    name: "sinh(0. followed by 200,000 ones) at 1,048,576 bits",
    text: `sinh(0.${"1".repeat(200_000)})`,
    maxBits: 1_048_576,
    expect: digits("0.1113399"),
  },
  ...["sinh", "tanh", "atan", "exp"].map((fn) => ({
    name: `${fn}(0. followed by 170,000 ones) at 600,000 bits`,
    text: `${fn}(0.${"1".repeat(170_000)})`,
    maxBits: 600_000,
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
    maxBits: 360_000,
    expect: digits("1.1111111e-105001"),
  },
  // #57: roots of a large degree crashed or were never resolved.
  { text: "pow(3, 1e-30)", expect: digits("1") },
  { text: "3^1e-30", expect: digits("1") },
  { text: "pow(2, 5e-28)", expect: digits("1") },
  { text: "pow(10, 1e-100)", expect: digits("1") },
  { text: "pow(1/3, 1e-30)", expect: digits("1") },
  { text: "pow(2e200, 1e-20)", expect: digits("1") },
  // In decimal mode the exponent `3^-700` is rounded, so it is inexact, and
  // a negative base, or one straddling zero, cannot take it.
  {
    text: "pow(-2, 3^-700)",
    expect: { exact: digits("-1"), decimal: error("domain") },
  },
  {
    text: "pow(1e-5 - approx(1e-5), 3^-700)",
    expect: { exact: ZERO_VALUE, decimal: UNRESOLVED },
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
  // #60: a product at the bound decided by its midpoint alone; H.13.
  {
    text: "(1e46 - approx(1/3) * 3e46) * 1e999999999999999983",
    expect: { exact: ZERO_VALUE, decimal: UNRESOLVED },
  },
  { text: "(approx(1/3) - 1/3) * 1e-999999999999999990", expect: ZERO_VALUE },
  { text: `5e${E18} * (approx(1e5000) - approx(1e5000))`, expect: UNRESOLVED },
  // #60's last row is decimal mode's, where the sum's radius passes the
  // top and D18 leaves it `unresolved`; in exact mode the passes narrow it.
  {
    text: "(approx(1e30) - approx(1e30)) * 3e999999999999999977 + (approx(1e30) - approx(1e30)) * 3e999999999999999977",
    expect: { exact: ZERO_VALUE, decimal: UNRESOLVED },
  },
  // #61: the guards refuse within 10^9 decades of the bound; H.15.
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
  {
    text: `pow(10, ${E18}.5 + (approx(1e8) - approx(1e8)))`,
    expect: { exact: digits(`3.1622777e+${E18}`), decimal: UNRESOLVED },
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
  // #62: a power of a ball around zero takes a minute; H.15 (two rows skipped).
  { text: "(approx(1e20) - approx(1e20))^100000", expect: ZERO_VALUE },
  { text: "(approx(1e20) - approx(1e20))^1e10000", expect: ZERO_VALUE },
  { text: "(approx(1e20) - approx(1e20))^1e100000", expect: ZERO_VALUE },
  // #63: asin, acos and acosh of an exact argument with a long mantissa; a follow-up.
  { text: "asin(0.1 + 1e-15000)", expect: digits("0.10016742") },
  { text: "acos(0.1 + 1e-15000)", expect: digits("1.4706289") },
  { text: "acosh(1.5 + 1e-15000)", expect: digits("0.96242365") },
  { text: "asin(0.1 + 1e-5000)", expect: digits("0.10016742") },
  // #64: atan and atan2 of a wide ball reaching 2^maxBits; H.7.
  { text: "atan(approx(1e30000) - approx(1e30000))", expect: ZERO_VALUE },
  {
    text: "atan2(approx(1e30000) - approx(1e30000) + 1, 1)",
    expect: containing("0.78539816"),
  },
  { text: "atan2(1e-30000, 1 - approx(1))", expect: UNRESOLVED },
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
  c: Pick<TextCase, "precision" | "maxBits">,
  mode: Mode,
): NumberContext {
  const base: NumberContext = {
    precision: c.precision ?? 8,
    rounding: DEFAULT_ROUNDING,
    maxBits: c.maxBits ?? DEFAULT_MAX_BITS,
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
  const mantissa = text.split("e")[0]!.replace(/[-.]/g, "").replace(/^0+/, "");
  return Math.max(1, mantissa.length);
}

/**
 * What every value must satisfy: D17's two conditions, and D19's size
 * rule for an exact result in exact mode.
 */
function checkQuantity(ball: Ball, context: NumberContext): string | undefined {
  const bad = checkValue(ball, modeOf(context));
  if (bad !== undefined) return bad;
  if (isExact(ball) && modeOf(context) === "exact") {
    const { num, den } = ball.mid.mant;
    const bits = Math.max(bitLength(num < 0n ? -num : num), bitLength(den));
    if (bits > context.maxBits) {
      return `an exact result whose mantissa has ${bits} bits passes maxBits (D19)`;
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
  show(ball, context.precision, context.rounding);
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
      show(conversion.value, context.precision, context.rounding);
      const inverse = divideBalls(exact(ONE), conversion.value);
      if (inverse.ok) show(inverse.value, context.precision, context.rounding);
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
 * The display's steps on a unit list, as `listResult` in unit-converter.ts
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
  const shown = terms.map((t) => show(t, precision, rounding));
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
    ? show(rounded[last]!, precision, rounding)
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
    const parsed = parseDecimal(text);
    if (!parsed.ok) throw new Error(`A shown term parses: ${text}`);
    const term = negative ? negate(parsed.value) : parsed.value;
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
        c.precision === undefined && c.maxBits === undefined
          ? ""
          : ` @ ${context.precision} digits, ${context.maxBits} bits`;
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
