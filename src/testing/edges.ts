// Test support for the edge sweep, the fourth test pattern of
// docs/calculator-plan.md ("How to read a task"; task H.10): every built-in
// and every ball operation runs over the classes of arguments at the edges
// of the number type, and each case is checked for what ARCHITECTURE.md
// rules out. src/core/edges.test.ts is the sweep at the ball level and
// src/edges.test.ts at the text level; this module is what the two share.
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
  scaled,
  sign,
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

/** `1 / ln 10` from below and above, `0.43429448190325182765…`, as fractions. */
const INV_LN10_BELOW = rational(43429448190325182765n, 10n ** 20n);
const INV_LN10_ABOVE = rational(43429448190325182766n, 10n ** 20n);

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
