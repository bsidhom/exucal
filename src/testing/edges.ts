// Test support for the edge sweep, the fourth test pattern of
// docs/calculator-plan.md ("How to read a task"; task H.10): every built-in
// and every ball operation runs over the classes of arguments at the edges
// of the number type, and each case is checked for what ARCHITECTURE.md
// rules out. src/core/edges.sweep.ts is the sweep at the ball level and
// src/edges.sweep.ts at the text level; this module is what the two share.
// The suffix keeps the sweeps out of `pnpm test`, the run for every edit:
// they are conformance tests, run by `pnpm test:sweep` before a commit and
// in CI, and `pnpm test:all` runs both (issue #108).
//
// The runner. node:test's `timeout` neither interrupts nor fails a
// synchronous test, so a computation that hangs would hang the run. The
// cases run in a `Worker` instead: a sweep file spawns itself as the
// worker, which builds its cases and runs them (`runCases`), posting the
// name of each before it starts and the results at the end; the main
// thread (`sweep`) holds a deadline on the whole run, and when it passes,
// terminates the worker and fails naming the case that was running. A
// case's time is reported, never asserted, since a per-case budget on a
// loaded runner is a flaky assertion; the deadline is what catches a hang.
// A hang already known when the sweep lands is matched by a `Skip` and
// not run.
//
// The known violations are a table keyed by issue (`Known`): a violation
// the table does not list fails the sweep, and so does a listed one that no
// case shows any more, so that the task that fixes an issue deletes its
// entries and no fix is silent. Node's `todo` is not used: a passing
// `todo` is silent, and a failing one prints its stack on every run.
//
// The oracle. What a case is checked for is decided by the plan's D17 and
// D18, on the true result's magnitude rather than on the code's own
// verdict, so the checks here reason on a loose form of the number type:
// a `Loose` is a `Scaled` with no exponent bound and no canonical form, so
// that a value past the bound can be written down, and an `Interval` is a
// pair of them bracketing every value of a ball. From the intervals of the
// arguments the sweep bounds the magnitude of the true result, exactly for
// the arithmetic on small mantissas and in log space for the exponential
// and the powers (`Magnitude`), and `surePast` says whether every value of
// the result passes the bound, which is when, and only when, an
// `overflow` or `underflow` is allowed (D18). The decisions near `±10^18`
// are made on bigint exponents and exact fractions, never on doubles: the
// bounds on `log10` of a mantissa come from an exact power of the mantissa
// or, near one, from the exact difference from one, and a radius that
// cannot be formed as a fraction is bounded from above within a relative
// `5.4 × 10^-10`, in bigint arithmetic throughout (`radiusAtMost`, which
// says why no bound of it can be exact). A result is checked on its own
// by `checkValue`: its
// midpoint's decimal exponent within the bound and `|mid| + rad` below
// its top, the two conditions of D17 for a value.

import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import { inspect } from "node:util";
import { Worker, parentPort } from "node:worker_threads";
import { position, type Ball } from "../core/ball.ts";
import type { Mode } from "../core/context.ts";
import { radiusUpper, type Radius } from "../core/radius.ts";
import {
  ONE as ONE_FRACTION,
  add as addFractions,
  divide as divideFractions,
  integerRoot,
  multiply as multiplyFractions,
  pow as powFraction,
  rational,
  subtract as subtractFractions,
  type Rational,
} from "../core/rational.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  compare,
  decimalExponent,
  isZero,
  negate,
  roundTo,
  scaled,
  sign,
  toRational,
  type Scaled,
} from "../core/scaled.ts";

// ---------------------------------------------------------------------------
// Cases, the worker and the table

/** One case of a sweep: its name, and a run that returns the violation it finds, or nothing. */
export type Case = {
  readonly name: string;
  readonly run: () => string | undefined;
};

/** What a case gave: its time, and the violation it found, if any; a throw is a violation. */
export type CaseResult = {
  readonly name: string;
  readonly ms: number;
  readonly violation?: string;
};

/** A case known to hang, matched by name and not run, with the issue that records it. */
export type Skip = {
  readonly issue: string;
  readonly cases: RegExp;
  readonly reason: string;
};

/**
 * A known violation: the cases it covers, by name, the violation text it
 * covers (any, when absent), the issue and the task that fixes it, and
 * why it is a violation. The task that fixes the issue deletes the entry.
 */
export type Known = {
  readonly issue: string;
  readonly task: string;
  readonly cases: RegExp;
  readonly violation?: RegExp;
  readonly reason: string;
};

type Skipped = { readonly name: string; readonly issue: string };

type Message =
  | { readonly kind: "start"; readonly name: string }
  | {
      readonly kind: "done";
      readonly results: readonly CaseResult[];
      readonly skipped: readonly Skipped[];
    };

/**
 * Runs `cases` in the worker, skipping the ones `skips` match, and posts
 * the results to the main thread; called by a sweep file when it is the
 * worker.
 */
export function runCases(cases: Iterable<Case>, skips: readonly Skip[]): void {
  const port = parentPort;
  if (port === null) throw new Error("runCases runs in a worker");
  const results: CaseResult[] = [];
  const skipped: Skipped[] = [];
  for (const c of cases) {
    const skip = skips.find((s) => s.cases.test(c.name));
    if (skip !== undefined) {
      skipped.push({ name: c.name, issue: skip.issue });
      continue;
    }
    port.postMessage({ kind: "start", name: c.name } satisfies Message);
    const start = performance.now();
    let violation: string | undefined;
    try {
      violation = c.run();
    } catch (e) {
      violation = `threw ${describe(e)}`;
    }
    const ms = performance.now() - start;
    results.push(
      violation === undefined
        ? { name: c.name, ms }
        : { name: c.name, ms, violation },
    );
  }
  port.postMessage({ kind: "done", results, skipped } satisfies Message);
}

/** An exception as the sweep reports it: its class and message, one line. */
function describe(e: unknown): string {
  if (e instanceof Error) return `${e.constructor.name}: ${e.message}`;
  return inspect(e);
}

/**
 * Runs the sweep file at `file` as a worker, with `deadlineMs` on the whole
 * run, reports its timings through `t`, and fails on a violation `known`
 * does not list, on an entry of `known` no case shows any more, and on a
 * `Skip` no case matches.
 */
export async function sweep(
  t: TestContext,
  file: string | URL,
  known: readonly Known[],
  skips: readonly Skip[],
  deadlineMs: number,
): Promise<void> {
  const worker = new Worker(new URL(file));
  let running: string | undefined;
  const done = await new Promise<Extract<Message, { kind: "done" }>>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(
          new Error(
            `the sweep did not finish within ${deadlineMs} ms; the case running was ${running ?? "none"}`,
          ),
        );
      }, deadlineMs);
      worker.on("message", (message: Message) => {
        if (message.kind === "start") {
          running = message.name;
        } else {
          clearTimeout(timer);
          resolve(message);
        }
      });
      worker.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      worker.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`the worker exited with ${code} before it was done`));
      });
    },
  );
  await worker.terminate();
  report(t, done.results, done.skipped);
  assertViolations(done.results, done.skipped, known, skips);
}

/** The timings, as diagnostics: the count, the total, and the slowest cases. */
function report(
  t: TestContext,
  results: readonly CaseResult[],
  skipped: readonly Skipped[],
): void {
  const total = results.reduce((sum, r) => sum + r.ms, 0);
  const violations = results.filter((r) => r.violation !== undefined).length;
  t.diagnostic(
    `${results.length} cases in ${total.toFixed(0)} ms, ${violations} known violations, ${skipped.length} skipped`,
  );
  const slowest = [...results].sort((a, b) => b.ms - a.ms).slice(0, 5);
  for (const r of slowest) {
    t.diagnostic(`${r.ms.toFixed(1)} ms: ${r.name}`);
  }
  // With SWEEP_VIOLATIONS set, every violation, listed or not, for the
  // task that empties the table's entries to see what is left.
  if (process.env["SWEEP_VIOLATIONS"] !== undefined) {
    for (const r of results) {
      if (r.violation !== undefined) t.diagnostic(`${r.name}: ${r.violation}`);
    }
  }
}

/** The one assertion of a sweep, whose message lists every problem. */
function assertViolations(
  results: readonly CaseResult[],
  skipped: readonly Skipped[],
  known: readonly Known[],
  skips: readonly Skip[],
): void {
  const problems: string[] = [];
  const matched = new Set<Known>();
  for (const r of results) {
    if (r.violation === undefined) continue;
    const violation = r.violation;
    const entry = known.find(
      (k) => k.cases.test(r.name) && (k.violation?.test(violation) ?? true),
    );
    if (entry === undefined) {
      problems.push(`${r.name}: ${violation}`);
    } else {
      matched.add(entry);
    }
  }
  for (const k of known) {
    if (!matched.has(k)) {
      problems.push(
        `${k.issue} (${k.task}): no case violates as listed under ${k.cases}; delete the entry`,
      );
    }
  }
  for (const s of skips) {
    if (!skipped.some((x) => x.issue === s.issue)) {
      problems.push(`${s.issue}: no case matches the skip ${s.cases}`);
    }
  }
  assert.equal(
    problems.length,
    0,
    ["The sweep found:", ...problems].join("\n  "),
  );
}

// ---------------------------------------------------------------------------
// Loose values and intervals

/**
 * A `Scaled` read loosely: `mant × 10^exp` with no exponent bound and no
 * canonical form, for a value the number type refuses to hold. scaled.ts's
 * `compare`, `sign`, `absolute`, `negate`, `isZero` and `decimalExponent`
 * read the form and never the bound, so they serve a `Loose` as they are.
 */
export type Loose = Scaled;

/** `num / den × 10^exp` as a `Loose`. */
export function loose(num: bigint, den = 1n, exp = 0n): Loose {
  return { mant: rational(num, den), exp };
}

/** `10^(10^18 + 1)`, the first value past the top of the bound. */
const TOP: Loose = { mant: ONE_FRACTION, exp: MAX_EXPONENT + 1n };

/** The decimal exponents past which `surePast` decides, as log values. */
const TOP_LOG: Loose = loose(MAX_EXPONENT + 1n);
const BOTTOM_LOG: Loose = loose(-MAX_EXPONENT);

/**
 * The most digits two values are aligned by in a sum here: a smaller
 * operand further below is replaced by a power of ten above its magnitude
 * in the direction the sum rounds, so that no alignment costs more than
 * this many digits whatever the exponents.
 */
const GAP_DIGITS = 1200n;

/**
 * `a + b`, rounded `up` or `down`: exactly where the two lie within
 * `GAP_DIGITS` decades of each other, and with the smaller replaced by a
 * bound on it otherwise.
 */
export function addLoose(a: Loose, b: Loose, direction: "up" | "down"): Loose {
  if (isZero(a)) return b;
  if (isZero(b)) return a;
  const ea = decimalExponent(a);
  const eb = decimalExponent(b);
  const [big, smallExact] = ea >= eb ? [a, b] : [b, a];
  const gap = ea >= eb ? ea - eb : eb - ea;
  let small = smallExact;
  if (gap > GAP_DIGITS) {
    // |small| < 10^(e + 1) for its exponent e, which is below the bump's.
    const bump: Loose = {
      mant: ONE_FRACTION,
      exp: (ea >= eb ? ea : eb) - GAP_DIGITS,
    };
    small = direction === "up" ? bump : negate(bump);
  }
  const exp = big.exp < small.exp ? big.exp : small.exp;
  return {
    mant: addFractions(
      timesPowerOfTen(big.mant, big.exp - exp),
      timesPowerOfTen(small.mant, small.exp - exp),
    ),
    exp,
  };
}

/** `r × 10^k`, for a `k` of either sign. */
function timesPowerOfTen(r: Rational, k: bigint): Rational {
  if (k === 0n) return r;
  return multiplyFractions(
    r,
    k > 0n ? rational(10n ** k) : rational(1n, 10n ** -k),
  );
}

/** `a × b`, exactly. */
export function multiplyLoose(a: Loose, b: Loose): Loose {
  return { mant: multiplyFractions(a.mant, b.mant), exp: a.exp + b.exp };
}

/** `a / b`, exactly, for a nonzero `b`. */
export function divideLoose(a: Loose, b: Loose): Loose {
  const quotient = divideFractions(a.mant, b.mant);
  if (!quotient.ok) throw new RangeError("A loose divisor is nonzero");
  return { mant: quotient.value, exp: a.exp - b.exp };
}

/** `v × q`, exactly, for a fraction `q`. */
export function scaleLoose(v: Loose, q: Rational): Loose {
  return { mant: multiplyFractions(v.mant, q), exp: v.exp };
}

/** The lesser and the greater of `a` and `b`. */
function minLoose(a: Loose, b: Loose): Loose {
  return compare(a, b) <= 0 ? a : b;
}
function maxLoose(a: Loose, b: Loose): Loose {
  return compare(a, b) >= 0 ? a : b;
}

/** Every value of a ball lies in `[lo, hi]`. */
export type Interval = { readonly lo: Loose; readonly hi: Loose };

/** The radii whose fraction is formed for a comparison: as ball.ts forms them, up to `2^16` in the exponent. */
const FORMABLE_RADIUS_BITS = 1n << 16n;

/**
 * `log10 2` from above, to forty digits, as a fraction: a binary exponent
 * near `3.3 × 10^18` times it must be within a decade of the truth.
 */
const LOG10_2_ABOVE = rational(
  3010299956639811952137388947244930267682n,
  10n ** 40n,
);

/** The digits the roots of ten are held to, `40`, and their scale. */
const ROOT_DIGITS = 40n;
const ROOT_SCALE = 10n ** ROOT_DIGITS;

/** The bits of the fraction of a decade `tenToAbove` resolves, `32`: its granularity is `10^(2^-32)`, a relative `5.4 × 10^-10`. */
const ROOT_BITS = 32;

/**
 * `ROOTS[i - 1] / ROOT_SCALE` is at or above `10^(2^-i)`, for `i` from
 * one to `ROOT_BITS`: each the ceiling of the square root of the one
 * before, starting from ten, so that every entry is an upper bound.
 */
const ROOTS: readonly bigint[] = (() => {
  const roots: bigint[] = [];
  let root = 10n * ROOT_SCALE;
  for (let i = 0; i < ROOT_BITS; i++) {
    root = ceilSqrt(root * ROOT_SCALE);
    roots.push(root);
  }
  return roots;
})();

/** The least integer whose square is at or above `n`. */
function ceilSqrt(n: bigint): bigint {
  const root = integerRoot(n, 2n);
  return root * root >= n ? root : root + 1n;
}

/**
 * A fraction at or above `10^f`, for a fraction `f` in `[0, 1)`, in bigint
 * arithmetic throughout: `f` is rounded up to a multiple of `2^-32`, and
 * `10^(j / 2^32)` is the product of the roots of ten at the set bits of
 * `j`, each an upper bound, the product rounded up to `ROOT_DIGITS`
 * digits. Within a relative `5.4 × 10^-10` of `10^f`, the granularity's
 * `10^(2^-32) - 1`; the roots' own rounding adds `10^-38`.
 */
function tenToAbove(f: Rational): Rational {
  const j = ceilDiv(f.num << BigInt(ROOT_BITS), f.den);
  if (j >= 1n << BigInt(ROOT_BITS)) return rational(10n);
  let num = ROOT_SCALE;
  let den = ROOT_SCALE;
  for (let i = 1; i <= ROOT_BITS; i++) {
    if ((j >> BigInt(ROOT_BITS - i)) & 1n) {
      num *= ROOTS[i - 1]!;
      den *= ROOT_SCALE;
    }
  }
  return rational(ceilDiv(num * ROOT_SCALE, den), ROOT_SCALE);
}

/** `ceil(n / d)` for `d > 0`. */
function ceilDiv(n: bigint, d: bigint): bigint {
  const q = n / d;
  return n - q * d > 0n ? q + 1n : q;
}

/**
 * A `Loose` at or above the bounded `rad`, `mant × 2^exp`: its exact value
 * where the fraction is worth forming, and otherwise a value within a
 * relative `5.4 × 10^-10` above it, in bigint arithmetic throughout:
 * `exp log10 2` is taken exactly, from above, through the forty-digit
 * `LOG10_2_ABOVE`, and split into its integer part, which is the decimal
 * exponent of the bound and exact, and its fraction of a decade, whose
 * power of ten `tenToAbove` bounds from the roots of ten. No double is
 * involved. An exact decision is not to be had here: the radius has a
 * binary exponent near `3.3 × 10^18`, and comparing it with a power of
 * ten exactly would mean forming a number of `10^18` digits, so a bound
 * with a stated slack, rounded outward, is what any check of it rests on,
 * in the app (`log2Bounds`, within `2^-30`) as in this oracle.
 * `undefined` for an unbounded radius.
 */
export function radiusAtMost(rad: Radius): Loose | undefined {
  if (rad.kind === "unbounded") return undefined;
  if (rad.mant === 0n) return ZERO;
  const exp = rad.exp < 0n ? -rad.exp : rad.exp;
  if (exp <= FORMABLE_RADIUS_BITS) return { mant: radiusUpper(rad), exp: 0n };
  const log = multiplyFractions(rational(rad.exp), LOG10_2_ABOVE);
  const k = floorDiv(log.num, log.den);
  const fraction = subtractFractions(log, rational(k));
  return {
    mant: multiplyFractions(rational(rad.mant), tenToAbove(fraction)),
    exp: k,
  };
}

/** `floor(n / d)` for `d > 0`. */
function floorDiv(n: bigint, d: bigint): bigint {
  const q = n / d;
  return n - q * d < 0n ? q - 1n : q;
}

/** The interval of `b`, `[mid - rad, mid + rad]` with the radius rounded outward; `undefined` for an unbounded ball. */
export function intervalOf(b: Ball): Interval | undefined {
  const rad = radiusAtMost(b.rad);
  if (rad === undefined) return undefined;
  return {
    lo: addLoose(b.mid, negate(rad), "down"),
    hi: addLoose(b.mid, rad, "up"),
  };
}

/** The interval of a point. */
export function pointInterval(v: Loose): Interval {
  return { lo: v, hi: v };
}

/** Whether `i` contains zero, its ends included. */
export function containsZeroInterval(i: Interval): boolean {
  return sign(i.lo) <= 0 && sign(i.hi) >= 0;
}

/** The interval of `|v|` for `v` in `i`: its lower end zero where `i` contains zero. */
export function magnitudeInterval(i: Interval): Interval {
  if (containsZeroInterval(i)) {
    return { lo: ZERO, hi: maxLoose(absolute(i.lo), absolute(i.hi)) };
  }
  return sign(i.hi) < 0 ? { lo: absolute(i.hi), hi: absolute(i.lo) } : i;
}

export function negateInterval(i: Interval): Interval {
  return { lo: negate(i.hi), hi: negate(i.lo) };
}

export function addIntervals(a: Interval, b: Interval): Interval {
  return {
    lo: addLoose(a.lo, b.lo, "down"),
    hi: addLoose(a.hi, b.hi, "up"),
  };
}

export function multiplyIntervals(a: Interval, b: Interval): Interval {
  return corners([a.lo, a.hi], [b.lo, b.hi], multiplyLoose);
}

/** The quotient's interval, for a `b` that excludes zero; `undefined` otherwise. */
export function divideIntervals(
  a: Interval,
  b: Interval,
): Interval | undefined {
  if (containsZeroInterval(b)) return undefined;
  return corners([a.lo, a.hi], [b.lo, b.hi], divideLoose);
}

/** The interval spanned by `op` over the four corners of two intervals. */
function corners(
  a: readonly [Loose, Loose],
  b: readonly [Loose, Loose],
  op: (x: Loose, y: Loose) => Loose,
): Interval {
  const values = [
    op(a[0], b[0]),
    op(a[0], b[1]),
    op(a[1], b[0]),
    op(a[1], b[1]),
  ];
  return {
    lo: values.reduce(minLoose),
    hi: values.reduce(maxLoose),
  };
}

// ---------------------------------------------------------------------------
// The magnitude of a result, and the refusal rule

/**
 * A bound on the magnitude of the true result of a case: an interval of
 * the magnitude itself (`value`), or of its decimal logarithm (`log`), or
 * none, for a result no refusal at the bound is ever allowed for, such as
 * a bounded function's or one whose argument's ball contains zero.
 */
export type Magnitude =
  | { readonly kind: "value"; readonly lo: Loose; readonly hi: Loose }
  | { readonly kind: "log"; readonly lo: Loose; readonly hi: Loose }
  | { readonly kind: "none" };

export const NO_MAGNITUDE: Magnitude = { kind: "none" };

/** The magnitude of every value in `i`. */
export function valueMagnitude(i: Interval): Magnitude {
  const m = magnitudeInterval(i);
  return { kind: "value", lo: m.lo, hi: m.hi };
}

/**
 * Whether every value of a result of magnitude `m` passes the bound, and
 * on which side: `overflow` when the whole magnitude interval lies at or
 * above `10^(10^18 + 1)`, `underflow` when it lies below `10^-(10^18)`
 * without reaching zero, and `undefined` otherwise. A refusal at the bound
 * is allowed exactly when this is decided (D18).
 */
export function surePast(m: Magnitude): "overflow" | "underflow" | undefined {
  switch (m.kind) {
    case "none":
      return undefined;
    case "value": {
      if (isZero(m.lo)) return undefined;
      if (decimalExponent(m.lo) > MAX_EXPONENT) return "overflow";
      if (decimalExponent(m.hi) < -MAX_EXPONENT) return "underflow";
      return undefined;
    }
    case "log": {
      if (compare(m.lo, TOP_LOG) >= 0) return "overflow";
      if (compare(m.hi, BOTTOM_LOG) < 0) return "underflow";
      return undefined;
    }
  }
}

/**
 * `1 / ln 10` from below and above, `0.43429448190325182765…`, as
 * fractions at forty digits: a bound that scales a value near the
 * exponent limit, `10^18` and beyond, keeps that many digits of margin
 * in the scaled value, where eighteen would leave none.
 */
const INV_LN10_BELOW = rational(
  4342944819032518276511289189166050822943n,
  10n ** 40n,
);
const INV_LN10_ABOVE = rational(
  4342944819032518276511289189166050822944n,
  10n ** 40n,
);

/** The power the bounds on `log10` of a mantissa are read from: `64` gives them within `1/64`. */
const LOG_POWER = 64n;

/**
 * Bounds on `log10 |v|` for a nonzero `v`, as fractions: the decimal
 * exponent plus bounds on the logarithm of the normalized mantissa `m` in
 * `[1, 10)`, from `ln(1 + d) ∈ [d / (1 + d), d]` for `m = 1 + d` within a
 * half of one, so that a base near one is bounded sharply, and from the
 * decimal exponent of `m^64` otherwise.
 */
export function log10Bounds(v: Loose): { lo: Rational; hi: Rational } {
  const e = decimalExponent(v);
  const m = timesPowerOfTen(absolute(v).mant, v.exp - e);
  const d = subtractFractions(m, ONE_FRACTION);
  let lo: Rational;
  let hi: Rational;
  if (compareFractionWithHalf(d) <= 0) {
    const lnBelow = divideFractions(d, m);
    if (!lnBelow.ok) throw new RangeError("A normalized mantissa is nonzero");
    lo = multiplyFractions(lnBelow.value, INV_LN10_BELOW);
    hi = multiplyFractions(d, INV_LN10_ABOVE);
  } else {
    const power = powFraction(m, LOG_POWER, 1 << 20);
    if (!power.ok)
      throw new RangeError("A mantissa's power fits the hard bound");
    const k = decimalExponent({ mant: power.value, exp: 0n });
    lo = rational(k, LOG_POWER);
    hi = rational(k + 1n, LOG_POWER);
  }
  const shift = rational(e);
  return { lo: addFractions(shift, lo), hi: addFractions(shift, hi) };
}

function compareFractionWithHalf(r: Rational): -1 | 0 | 1 {
  const twice = 2n * r.num;
  return twice < r.den ? -1 : twice > r.den ? 1 : 0;
}

/**
 * The magnitude of `x^y` over the intervals of `x` and `y`, in log space:
 * `y log10 |x|` over the corners; none when `x` reaches zero, where no
 * refusal at the bound can be sure.
 */
export function powerMagnitude(x: Interval, y: Interval): Magnitude {
  const m = magnitudeInterval(x);
  if (isZero(m.lo)) return NO_MAGNITUDE;
  const logs: Interval = {
    lo: { mant: log10Bounds(m.lo).lo, exp: 0n },
    hi: { mant: log10Bounds(m.hi).hi, exp: 0n },
  };
  const product = multiplyIntervals(y, logs);
  return { kind: "log", lo: product.lo, hi: product.hi };
}

/** The magnitude of `exp(x)` over the interval of `x`, in log space: `x / ln 10`, rounded outward. */
export function expMagnitude(x: Interval): Magnitude {
  return {
    kind: "log",
    lo: scaleLoose(x.lo, sign(x.lo) >= 0 ? INV_LN10_BELOW : INV_LN10_ABOVE),
    hi: scaleLoose(x.hi, sign(x.hi) >= 0 ? INV_LN10_ABOVE : INV_LN10_BELOW),
  };
}

/** `ln 10` from below and above, `2.302585092994045684…`, as fractions at forty digits (as `INV_LN10_BELOW`). */
const LN10_BELOW = rational(
  23025850929940456840179914546843642076011n,
  10n ** 40n,
);
const LN10_ABOVE = rational(
  23025850929940456840179914546843642076012n,
  10n ** 40n,
);

/** Ten, where the bounds on `ln Γ` below begin. */
const TEN: Loose = loose(10n);

/**
 * Bounds on `ln Γ(x)` over the interval of `x`, for `x` at or above ten
 * throughout: `ln Γ(x)` lies between `x (ln x - 1) - ln(x) / 2` and
 * `x ln x` there, from Stirling's series, whose first correction is
 * positive and below `1 / (12 x)`, and from `(x - 1/2) ln x - x + ln(2π)
 * / 2 < x ln x`; `undefined` below ten, where neither function passes
 * the bound. The logarithms come from `log10Bounds` and `ln 10`.
 */
function lgammaInterval(x: Interval): Interval | undefined {
  if (compare(x.lo, TEN) < 0) return undefined;
  // Stirling's bounds, (x - 1/2) ln x - x + ln(2π)/2 <= ln Γ(x) <= the
  // same + 1/(12x), with ln Γ rising there, so the ends of x give the
  // ends of the value; ln(2π)/2 is 0.9189385….
  const lnLoBelow = multiplyFractions(log10Bounds(x.lo).lo, LN10_BELOW);
  const lnHiAbove = multiplyFractions(log10Bounds(x.hi).hi, LN10_ABOVE);
  const half = loose(1n, 2n);
  const lo = addLoose(
    addLoose(
      scaleLoose(addLoose(x.lo, negate(half), "down"), lnLoBelow),
      negate(x.lo),
      "down",
    ),
    loose(9189n, 10000n),
    "down",
  );
  const hi = addLoose(
    addLoose(
      scaleLoose(addLoose(x.hi, negate(half), "up"), lnHiAbove),
      negate(x.hi),
      "up",
    ),
    loose(9274n, 10000n), // ln(2π)/2 + 1/120 from above
    "up",
  );
  return { lo, hi };
}

/** Two, where the bounds on `beta` below begin. */
const TWO: Loose = loose(2n);

/** `2 log10 2` from above, `0.60206…`. */
const TWICE_LOG10_2_ABOVE = rational(61n, 100n);

/**
 * The magnitude of `beta(a, b)` over the intervals of `a` and `b`, in
 * log space, for both at or above two throughout: `B` decreases in each
 * argument there, so its largest value over the box is at the lower
 * ends, where the integrand's maximum, `((a - 1) / (a + b - 2))^(a - 1)
 * ((b - 1) / (a + b - 2))^(b - 1)`, bounds it from above; from below,
 * `B(a, b) >= 2^-(2 (a + b))`, since the integrand is at least
 * `min(t, 1 - t)^(a + b - 2)`. None when either reaches below two.
 */
export function betaMagnitude(a: Interval, b: Interval): Magnitude {
  if (compare(a.lo, TWO) < 0 || compare(b.lo, TWO) < 0) return NO_MAGNITUDE;
  const aLess = addLoose(a.lo, negate(ONE), "down");
  const bLess = addLoose(b.lo, negate(ONE), "down");
  const total = addLoose(aLess, bLess, "up");
  const hi = addLoose(
    scaleLoose(aLess, log10Bounds(divideLoose(aLess, total)).hi),
    scaleLoose(bLess, log10Bounds(divideLoose(bLess, total)).hi),
    "up",
  );
  const lo = negate(
    scaleLoose(addLoose(a.hi, b.hi, "up"), TWICE_LOG10_2_ABOVE),
  );
  return { kind: "log", lo, hi };
}

/** `log10 e` from below and above, `0.43429448190325182765…`. */
const LOG10_E_BELOW = INV_LN10_BELOW;
const LOG10_E_ABOVE = INV_LN10_ABOVE;

/** Bounds on `log10 x` over the interval of `x`, for `x` positive throughout. */
function log10Interval(x: Interval): Interval {
  return {
    lo: { mant: log10Bounds(x.lo).lo, exp: 0n },
    hi: { mant: log10Bounds(x.hi).hi, exp: 0n },
  };
}

/**
 * Bounds on `log10 Γ(s)` over the interval of `s`, for `s` positive
 * throughout: from Stirling at or above ten, and otherwise from `Γ` at
 * least `0.88` everywhere, between `0.88 / s` and `1 / s` below one,
 * near one from its tangent there, and at most `Γ(10)` on `[1, 10]`.
 */
function log10GammaInterval(s: Interval): Interval {
  const whole = lgammaInterval(s);
  if (whole !== undefined) {
    return {
      lo: scaleLoose(whole.lo, INV_LN10_BELOW),
      hi: scaleLoose(whole.hi, INV_LN10_ABOVE),
    };
  }
  // From above: 1 / s below one, one on [1, 2], and (⌈s⌉ - 1)! beyond,
  // Γ rising past 1.46; the pieces an interval covers, at most.
  let hi: Loose = ZERO;
  if (compare(s.lo, ONE) < 0) {
    hi = maxLoose(hi, negate({ mant: log10Bounds(s.lo).lo, exp: 0n }));
  }
  if (compare(s.hi, TWO) > 0) {
    const top = compare(s.hi, TEN) >= 0 ? 10n : ceilingOf(s.hi);
    hi = maxLoose(hi, log10FactorialAbove(top - 1n));
  }
  if (compare(s.hi, TEN) >= 0) {
    const above = lgammaInterval({ lo: TEN, hi: s.hi });
    if (above !== undefined) {
      hi = maxLoose(hi, scaleLoose(above.hi, INV_LN10_ABOVE));
    }
  }
  // From below: Γ is at least 0.8856 everywhere (its minimum, at
  // 1.4616), whose logarithm is above -0.0528; and ln Γ is convex with
  // slope -γ at one, so it lies above the tangent -γ (s - 1) there, and
  // log10 Γ(s) >= -0.26 (s - 1) for s >= 1, γ / ln 10 being 0.2507. On
  // [1, 2] that is the piece; below one, Γ(s) = Γ(s + 1) / s with Γ(s +
  // 1) at least the larger of the minimum and the tangent at s + 1.
  const minimum: Loose = loose(-528n, 10000n);
  let lo: Loose = minimum;
  if (compare(s.hi, ONE) < 0) {
    lo = maxLoose(
      lo,
      addLoose(
        negate({ mant: log10Bounds(s.hi).hi, exp: 0n }),
        maxLoose(minimum, scaleLoose(s.hi, rational(-26n, 100n))),
        "down",
      ),
    );
  }
  if (compare(s.lo, ONE) >= 0 && compare(s.hi, TWO) <= 0) {
    lo = maxLoose(
      lo,
      scaleLoose(addLoose(s.hi, negate(ONE), "up"), rational(-26n, 100n)),
    );
  }
  if (compare(s.lo, TWO) >= 0) {
    // Γ(s) >= Γ(⌊s⌋) = (⌊s⌋ - 1)! for s >= 2.
    lo = maxLoose(lo, log10FactorialBelow(floorOf(s.lo) - 1n));
  }
  return { lo, hi };
}

/** The least integer at or above a positive `v` below `2^53`. */
function ceilingOf(v: Loose): bigint {
  const f = floorOf(v);
  return compare(v, loose(f)) > 0 ? f + 1n : f;
}

/** The greatest integer at or below a positive `v` below `2^53`. */
function floorOf(v: Loose): bigint {
  const r = scaledOf(v);
  if (r === undefined) throw new RangeError("A small value is formable");
  const fraction = toRational(r, 1 << 20);
  if (!fraction.ok) throw new RangeError("A small value is formable");
  return fraction.value.num / fraction.value.den;
}

/** `log10(n!)` from above and from below, for a small `n`. */
function log10FactorialAbove(n: bigint): Loose {
  return { mant: log10Bounds(loose(factorialOfSmall(n))).hi, exp: 0n };
}
function log10FactorialBelow(n: bigint): Loose {
  return { mant: log10Bounds(loose(factorialOfSmall(n))).lo, exp: 0n };
}
function factorialOfSmall(n: bigint): bigint {
  let f = 1n;
  for (let i = 2n; i <= n; i++) f *= i;
  return f;
}

/**
 * The magnitude of the incomplete gamma functions over the intervals
 * of the order `s` and the argument `x`, in log space, for `s` positive
 * throughout and `x` at or above zero (none otherwise, and none for the
 * lower forms where `x` reaches zero). The lower from its first term,
 * `x^s e^-x / s`, which it exceeds, and `x^s / s`, which it stays
 * below. The upper from below by `x^(s-1) e^-x` for `s` at or above
 * one and `(x + 1)^(s-1) e^-x (1 - 1/e)` for `s` at or below one, both
 * at the top of `x`, or by `Γ(s) / 2` where `x^s / s` is at most that,
 * the lower form being at most `x^s / s`; and from above by `Γ(s)`, for
 * the part of `s` at or below one by the fraction's third convergent,
 * `x^(s-1) e^-x (x + 1) / (x + 2 - s)`, and for the part above one, with
 * `x` at or above one, where `Γ(s, x)` rises with `s`, by `2 x^(s - 1)
 * e^-x` at the top of `s` and the bottom of `x` where `x >= 2 (s - 1)`,
 * or else `Γ` at the top of `s`. The regularized forms subtract `log10
 * Γ(s)`.
 */
export function incompleteGammaMagnitude(
  form: "lower" | "upper",
  regularized: boolean,
  s: Interval,
  x: Interval,
): Magnitude {
  if (sign(s.lo) <= 0 || sign(x.lo) < 0) return NO_MAGNITUDE;
  if (form === "lower" && sign(x.lo) <= 0) return NO_MAGNITUDE;
  const gamma = log10GammaInterval(s);
  if (sign(x.hi) === 0) {
    // Γ(s, 0) is Γ(s), and the regularized form one.
    return regularized
      ? { kind: "log", lo: ZERO, hi: ZERO }
      : { kind: "log", lo: gamma.lo, hi: gamma.hi };
  }
  const logXHi: Loose = { mant: log10Bounds(x.hi).hi, exp: 0n };
  const logXLoBelow: Loose | undefined =
    sign(x.lo) > 0 ? { mant: log10Bounds(x.lo).lo, exp: 0n } : undefined;
  const xHiLog10e = scaleLoose(x.hi, LOG10_E_ABOVE);
  let bounds: Interval;
  if (form === "lower") {
    const logX: Interval = { lo: logXLoBelow!, hi: logXHi };
    const sLogX = multiplyIntervals(s, logX);
    const logS = log10Interval(s);
    bounds = {
      lo: addLoose(
        addLoose(sLogX.lo, negate(xHiLog10e), "down"),
        negate(logS.hi),
        "down",
      ),
      hi: addLoose(sLogX.hi, negate(logS.lo), "up"),
    };
  } else {
    // From below, at x's top: the lesser of the two bounds over s.
    const less: Interval = {
      lo: addLoose(s.lo, negate(ONE), "down"),
      hi: addLoose(s.hi, negate(ONE), "up"),
    };
    const candidates: Loose[] = [];
    if (compare(s.hi, ONE) >= 0) {
      const part: Interval = { lo: maxLoose(less.lo, ZERO), hi: less.hi };
      candidates.push(
        addLoose(
          multiplyIntervals(part, pointInterval(logXHi)).lo,
          negate(xHiLog10e),
          "down",
        ),
      );
    }
    if (compare(s.lo, ONE) <= 0) {
      const part: Interval = { lo: less.lo, hi: minLoose(less.hi, ZERO) };
      const xPlus = addLoose(x.hi, ONE, "up");
      const logXPlus: Loose = { mant: log10Bounds(xPlus).hi, exp: 0n };
      candidates.push(
        addLoose(
          addLoose(
            multiplyIntervals(part, pointInterval(logXPlus)).lo,
            negate(xHiLog10e),
            "down",
          ),
          loose(-2n, 10n),
          "down",
        ),
      );
    }
    let lo = candidates.reduce((a, b) => minLoose(a, b));
    // Γ(s) / 2 where the lower form, at most x^s / s, is at most that.
    const sLogXHi = multiplyIntervals(s, pointInterval(logXHi)).hi;
    const lowerAtMost = addLoose(sLogXHi, negate(log10Interval(s).lo), "up");
    const halfGamma = addLoose(gamma.lo, loose(-31n, 100n), "down");
    if (compare(lowerAtMost, halfGamma) <= 0) lo = maxLoose(lo, halfGamma);
    // From above: Γ(s) always; x^(s-1) e^-x for the part of s at or
    // below one; and for the part above one, with x at or above one,
    // where Γ(s, x) rises with s, 2 x^(s-1) e^-x at the top of s and the
    // bottom of x where x >= 2 (s - 1), or else Γ at the top of s.
    let hi = gamma.hi;
    if (logXLoBelow !== undefined) {
      const logX: Interval = { lo: logXLoBelow, hi: logXHi };
      const xLoLog10e = scaleLoose(x.lo, LOG10_E_BELOW);
      const parts: Loose[] = [];
      if (compare(s.lo, ONE) <= 0) {
        // The fraction's third convergent, x^(s-1) e^-x (x + 1) / (x + 2 - s).
        const part: Interval = { lo: less.lo, hi: minLoose(less.hi, ZERO) };
        const numerator = log10Bounds(addLoose(x.hi, ONE, "up")).hi;
        const denominator = log10Bounds(
          addLoose(
            addLoose(x.lo, TWO, "down"),
            negate(minLoose(s.hi, ONE)),
            "down",
          ),
        ).lo;
        parts.push(
          addLoose(
            addLoose(multiplyIntervals(part, logX).hi, negate(xLoLog10e), "up"),
            { mant: subtractFractions(numerator, denominator), exp: 0n },
            "up",
          ),
        );
      }
      if (compare(s.hi, ONE) >= 0) {
        const top = addLoose(s.hi, negate(ONE), "up");
        const twice = addLoose(top, top, "up");
        if (compare(x.lo, ONE) >= 0 && compare(x.lo, twice) >= 0) {
          parts.push(
            addLoose(
              addLoose(
                multiplyLoose(top, { mant: log10Bounds(x.lo).hi, exp: 0n }),
                negate(xLoLog10e),
                "up",
              ),
              loose(31n, 100n),
              "up",
            ),
          );
        } else {
          parts.push(
            log10GammaInterval({ lo: maxLoose(s.lo, ONE), hi: s.hi }).hi,
          );
        }
      }
      hi = minLoose(
        hi,
        parts.reduce((a, b) => maxLoose(a, b)),
      );
    }
    bounds = { lo, hi };
  }
  if (regularized) {
    bounds = {
      lo: addLoose(bounds.lo, negate(gamma.hi), "down"),
      hi: addLoose(bounds.hi, negate(gamma.lo), "up"),
    };
  }
  return { kind: "log", lo: bounds.lo, hi: bounds.hi };
}

/**
 * The magnitude of `erfc(x)` over the interval of `x`, in log space: for
 * `x` at or above one throughout, between `e^-x^2 / (√π (x + 1))` and
 * `e^-x^2`, and for `x` at or below zero throughout between one and two;
 * none across zero.
 */
export function erfcMagnitude(x: Interval): Magnitude {
  if (sign(x.hi) <= 0) return { kind: "log", lo: ZERO, hi: loose(31n, 100n) };
  if (compare(x.lo, ONE) < 0) return NO_MAGNITUDE;
  const squareLo = multiplyLoose(x.lo, x.lo);
  const squareHi = multiplyLoose(x.hi, x.hi);
  const hi = negate(scaleLoose(squareLo, INV_LN10_BELOW));
  const lo = addLoose(
    negate(scaleLoose(squareHi, INV_LN10_ABOVE)),
    negate(
      addLoose(
        { mant: log10Bounds(addLoose(x.hi, ONE, "up")).hi, exp: 0n },
        loose(25n, 100n),
        "up",
      ),
    ),
    "down",
  );
  return { kind: "log", lo, hi };
}

/** Bounds on `log10 B(a, b)` over the intervals, for both positive throughout. */
function log10BetaInterval(a: Interval, b: Interval): Interval {
  const ga = log10GammaInterval(a);
  const gb = log10GammaInterval(b);
  const gab = log10GammaInterval(addIntervals(a, b));
  return {
    lo: addLoose(addLoose(ga.lo, gb.lo, "down"), negate(gab.hi), "down"),
    hi: addLoose(addLoose(ga.hi, gb.hi, "up"), negate(gab.lo), "up"),
  };
}

/** The ratios of the incomplete beta series taken exactly before the geometric tail. */
const INCBETA_EXACT_RATIOS = 16;

/**
 * `log10` of the prefactor `x^a (1 - x)^b / a` of the incomplete beta
 * series at the point `x` within `(0, 1)`, over the intervals of the
 * parameters.
 */
function incbetaPrefactor(a: Interval, b: Interval, x: Loose): Interval {
  // 1 - x rounded each way to a short mantissa, which keeps the
  // logarithm's bounds cheap where x is tiny; the ceiling may reach one,
  // whose logarithm, zero, still bounds the term from above.
  const yBelow = roundTo(addLoose(ONE, negate(x), "down"), 15, "floor");
  const yAbove = roundTo(addLoose(ONE, negate(x), "up"), 15, "ceiling");
  const aLogX = multiplyIntervals(a, log10Interval(pointInterval(x)));
  const bLogY = multiplyIntervals(b, {
    lo: log10Interval(pointInterval(yBelow)).lo,
    hi: log10Interval(pointInterval(yAbove)).hi,
  });
  const logA = log10Interval(a);
  return {
    lo: addLoose(addLoose(aLogX.lo, bLogY.lo, "down"), negate(logA.hi), "down"),
    hi: addLoose(addLoose(aLogX.hi, bLogY.hi, "up"), negate(logA.lo), "up"),
  };
}

/**
 * `log10` of a bound from above on the series' sum `Σ ((a + b)_n / (a +
 * 1)_n) x^n` at the point `x`: the first ratios `(a + b + k) x / (a + 1
 * + k)` taken at the tops of the parameters' intervals, and a geometric
 * tail with the larger of the next ratio and `x`, which bounds every
 * later one; `undefined` where that is not below one.
 */
function incbetaSumAbove(
  a: Interval,
  b: Interval,
  x: Loose,
): Loose | undefined {
  // Every ratio and partial sum is rounded up to a short mantissa: the
  // exact arithmetic on the gapped intervals would grow the mantissas
  // past what the logarithm's bounds take, and the roundings only raise
  // the bound.
  const ratio = (k: number): Loose =>
    roundTo(
      multiplyLoose(
        divideLoose(
          addLoose(addLoose(a.hi, b.hi, "up"), loose(BigInt(k)), "up"),
          addLoose(addLoose(a.lo, ONE, "down"), loose(BigInt(k)), "down"),
        ),
        x,
      ),
      15,
      "ceiling",
    );
  const rho = maxLoose(ratio(INCBETA_EXACT_RATIOS), x);
  if (compare(rho, ONE) >= 0) return undefined;
  let sum = roundTo(
    divideLoose(ONE, addLoose(ONE, negate(rho), "down")),
    15,
    "ceiling",
  );
  for (let k = INCBETA_EXACT_RATIOS - 1; k >= 0; k--) {
    sum = roundTo(
      addLoose(ONE, multiplyLoose(ratio(k), sum), "up"),
      15,
      "ceiling",
    );
  }
  return { mant: log10Bounds(sum).hi, exp: 0n };
}

/**
 * The magnitude of the incomplete beta function over the intervals of
 * `a`, `b` and `x`, in log space, for the parameters positive and `x`
 * positive throughout (none otherwise): the function rises with `x`, so
 * its bottom is at the bottom of `x`, where the series' prefactor bounds
 * it from below, the sum being at least one, and its top at the top of
 * `x`, where the prefactor times a bound on the sum bounds it from above
 * where that bound exists, and `B(a, b)` otherwise or at `x` at or past
 * one. The regularized form divides by `B(a, b)` and is at most one.
 */
export function incbetaMagnitude(
  regularized: boolean,
  a: Interval,
  b: Interval,
  x: Interval,
): Magnitude {
  if (sign(a.lo) <= 0 || sign(b.lo) <= 0 || sign(x.lo) <= 0) {
    return NO_MAGNITUDE;
  }
  const beta = log10BetaInterval(a, b);
  const lo =
    compare(x.lo, ONE) >= 0 ? beta.lo : incbetaPrefactor(a, b, x.lo).lo;
  let hi = beta.hi;
  if (compare(x.hi, ONE) < 0) {
    const sum = incbetaSumAbove(a, b, x.hi);
    if (sum !== undefined) {
      hi = minLoose(hi, addLoose(incbetaPrefactor(a, b, x.hi).hi, sum, "up"));
    }
  }
  if (!regularized) return { kind: "log", lo, hi };
  return {
    kind: "log",
    lo: addLoose(lo, negate(beta.hi), "down"),
    hi: minLoose(addLoose(hi, negate(beta.lo), "up"), ZERO),
  };
}

/** The magnitude of `lgamma(x)` over the interval of `x`, as `lgammaInterval` bounds it; none below ten. */
export function lgammaMagnitude(x: Interval): Magnitude {
  const i = lgammaInterval(x);
  return i === undefined ? NO_MAGNITUDE : { kind: "value", lo: i.lo, hi: i.hi };
}

/** The magnitude of `gamma(x)` over the interval of `x`, in log space: `lgammaInterval` over `ln 10`; none below ten. */
export function gammaMagnitude(x: Interval): Magnitude {
  const i = lgammaInterval(x);
  return i === undefined
    ? NO_MAGNITUDE
    : {
        kind: "log",
        lo: scaleLoose(i.lo, INV_LN10_BELOW),
        hi: scaleLoose(i.hi, INV_LN10_ABOVE),
      };
}

/**
 * The magnitude of `sinh(x)` and `cosh(x)` over the interval of `x`, in
 * log space, for a magnitude at or above one throughout: between
 * `e^(|x| - 1)`, which `|sinh x|` exceeds there, and `e^|x|`, which
 * `cosh x` stays below; none below one, where neither passes the bound.
 */
export function hyperbolicMagnitude(x: Interval): Magnitude {
  const m = magnitudeInterval(x);
  if (compare(m.lo, ONE) < 0) return NO_MAGNITUDE;
  return {
    kind: "log",
    lo: scaleLoose(addLoose(m.lo, negate(ONE), "down"), INV_LN10_BELOW),
    hi: scaleLoose(m.hi, INV_LN10_ABOVE),
  };
}

// ---------------------------------------------------------------------------
// The checks on a value

/**
 * What D17 requires of a value: a violation when the midpoint's decimal
 * exponent lies past `±10^18`, or when `|mid| + rad` reaches
 * `10^(10^18 + 1)`, the radius taken exactly where its fraction is formed
 * and by `radiusAtMost`'s bound otherwise; in exact mode `|mid| + rad`
 * may reach the top exactly, by the whole unit `settle` adds when it
 * truncates there. A radius below `10^-(10^18)` and a ball reaching below
 * that edge are allowed, and an unbounded ball is held by its midpoint
 * alone.
 */
export function checkValue(b: Ball, mode: Mode): string | undefined {
  if (!isZero(b.mid)) {
    const e = decimalExponent(b.mid);
    if (e > MAX_EXPONENT || e < -MAX_EXPONENT) {
      return `the midpoint's decimal exponent ${e} is past the bound`;
    }
  }
  const rad = radiusAtMost(b.rad);
  if (rad === undefined || isZero(rad)) return undefined;
  const reach = addLoose(absolute(b.mid), rad, "up");
  const c = compare(reach, TOP);
  if (c < 0 || (c === 0 && mode === "exact")) return undefined;
  const exactly = rad.exp === 0n ? "" : ", by the bound above the radius";
  return `|mid| + rad reaches 10^(10^18 + 1)${exactly}`;
}

/** Whether the ball `b` contains `point`: on it exactly, or straddling or touching it. */
export function contains(b: Ball, point: Scaled): boolean {
  return position(b, point) !== "above" && position(b, point) !== "below";
}

/** One end of a range: the `value`, and whether the range excludes it. */
export type End = { readonly value: Scaled; readonly open?: boolean };

/** A range a function's values lie in: from `lo` to `hi`, either end absent for none. */
export type Range = { readonly lo?: End; readonly hi?: End };

/**
 * Whether the ball `b` reaches into `range`: an unbounded ball does, and a
 * bounded one does unless it lies below the low end or above the high end
 * throughout, where an open end counts a ball on it as outside.
 */
export function intersects(b: Ball, range: Range): boolean {
  if (b.rad.kind === "unbounded") return true;
  if (range.lo !== undefined) {
    const p = position(b, range.lo.value);
    if (p === "below") return false;
    if (range.lo.open && (p === "at" || p === "touchingBelow")) return false;
  }
  if (range.hi !== undefined) {
    const p = position(b, range.hi.value);
    if (p === "above") return false;
    if (range.hi.open && (p === "at" || p === "touchingAbove")) return false;
  }
  return true;
}

/**
 * The decimal `text` as a `Loose`, as the display writes a value: an
 * optional sign, digits with an optional point, and an optional exponent;
 * past the bound included, which `parseDecimal` refuses, so that a shown
 * term at the edge can be read back. A text of another shape is a
 * precondition failure.
 */
export function looseFromText(text: string): Loose {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(text);
  if (match === null) throw new RangeError(`Not a decimal: ${text}`);
  const [, minus, whole, fraction = "", exponent = "0"] = match;
  const digits = BigInt(`${whole}${fraction}`);
  return {
    mant: rational(minus === "-" ? -digits : digits),
    exp: BigInt(exponent) - BigInt(fraction.length),
  };
}

/** The `Loose` `v` as a `Scaled`, when it is within the bound. */
export function scaledOf(v: Loose): Scaled | undefined {
  const s = scaled(v.mant, v.exp);
  return s.ok ? s.value : undefined;
}
