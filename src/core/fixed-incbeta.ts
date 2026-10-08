// The incomplete beta function's series on the kernel: the routine
// behind the built-ins `incbeta` and `incbetareg` (builtins/incbeta.ts;
// devdocs/builtins.md, "The Gamma and Beta families"). For
// `a, b > 0` and `0 < x < 1`,
//
//   I_x(a, b) = x^a (1 - x)^b / (a B(a, b)) × Σ_{n>=0} ((a + b)_n / (a + 1)_n) x^n
//
// (DLMF 8.17.22), every term positive, so there is no cancellation. The
// prefactor is the built-in's, in log space; `incbetaSeriesFixed` sums
// the series. The ratio of consecutive terms is `(a + b + n) x / (a + 1
// + n)`, which tends to `x`: it falls with `n` for `b >= 1` and rises
// toward `x` for `b < 1`, so the larger of the next ratio and `x` bounds
// every later ratio, and the tail after the term `t_n` is at most `t_n
// r / (1 - r)` for that `r`, the truncation bound owed, added to the
// error. The count of terms is the caller's to estimate first
// (`incbetaTermCount`), since the ratio approaches one where `x` is near
// one, and the symmetry `I_x(a, b) = 1 - I_(1-x)(b, a)` is the caller's
// to apply where the other orientation is cheaper.

import {
  addFixed,
  divideFixed,
  keepSignificant,
  multiplyFixed,
  rebaseFixed,
  scaleFixed,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";
import { abs, bitLength } from "./rational.ts";

/** The bits the routine works beyond the result, for the sum's ulps. */
const INCBETA_GUARD = 16;

/** The ulps below which a tail ends the loop. */
const FLOOR = 8n;

/** The bits above the floor within which a term's tail bound is computed. */
const HEADROOM = 64n;

/** `f` at exactly `bits` fraction bits, truncated or rebased. */
function at(f: Fixed, bits: number): Fixed {
  return f.bits > bits ? truncateFixed(f, bits) : rebaseFixed(f, bits);
}

/** The upper end of `f`'s interval as a double, for an estimate: `Infinity` past a double's range, zero below it. */
function upperEnd(f: Fixed): number {
  const v = f.value + f.error;
  if (v <= 0n) return 0;
  const length = bitLength(v);
  const kept = Math.max(0, length - 60);
  return Number(v >> BigInt(kept)) * 2 ** (kept - f.bits);
}

/**
 * How many terms the series takes to put its tail under an ulp at
 * `bits`, estimated in doubles from the upper ends of the intervals, up
 * to `limit`, beyond which it answers `limit + 1`: the terms grow while
 * the ratio is above one and fall thereafter, so the count is where the
 * logarithm of the term drops `bits + guard` bits and the tail's factor
 * below the largest, with the bounding ratio below one.
 */
export function incbetaTermCount(
  a: Fixed,
  b: Fixed,
  x: Fixed,
  bits: number,
  limit: number,
): number {
  const av = upperEnd(a);
  const bv = upperEnd(b);
  const xv = upperEnd(x);
  if (!(xv < 1)) return limit + 1;
  const drop = (bits + INCBETA_GUARD) * Math.LN2;
  let logTerm = 0;
  let largest = 0;
  for (let n = 1; n <= limit; n++) {
    logTerm += Math.log(((av + bv + n - 1) * xv) / (av + n));
    if (logTerm > largest) largest = logTerm;
    const r = Math.max(((av + bv + n) * xv) / (av + n + 1), xv);
    if (
      r < 1 &&
      largest - logTerm > drop + Math.max(0, Math.log(r / (1 - r)))
    ) {
      return n;
    }
  }
  return limit + 1;
}

/**
 * `Σ_{n>=0} ((a + b)_n / (a + 1)_n) x^n` with `bits` significant bits,
 * and an interval containing the sum for every `a`, `b` and `x` in
 * theirs, for `a` and `a + b` above `-1` and `x` below one throughout
 * (preconditions; a tiny parameter or argument converts to zero within
 * an ulp and passes), summed to at most `limit` terms, as the header says:
 * the tail bound is added where the loop ends, which it may with the
 * bound still large when `limit` is reached, an interval that is sound
 * and wide; `undefined` where no tail bound holds there, the bounding
 * ratio not being below one.
 */
export function incbetaSeriesFixed(
  a: Fixed,
  b: Fixed,
  x: Fixed,
  bits: number,
  limit: number,
): Fixed | undefined {
  const working = Math.max(bits, a.bits, b.bits, x.bits) + INCBETA_GUARD;
  const aw = at(a, working);
  const bw = at(b, working);
  const xw = at(x, working);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  const sum0 = addFixed(aw, bw);
  // The denominators a + 1 + n and the numerators a + b + n must stay
  // positive for every n from one: a and a + b above -1 throughout. A
  // tiny parameter converts to zero within an ulp and passes.
  if (
    aw.value - aw.error <= -one.value ||
    sum0.value - sum0.error <= -one.value
  ) {
    throw new RangeError(
      "The incomplete beta series takes parameters above -1 and a positive sum",
    );
  }
  // Only the top of x's interval matters: the ratio bound takes it, and a
  // tiny x, converted to zero within an ulp, sums to one within a few.
  if (xw.value + xw.error >= one.value) {
    throw new RangeError(
      "The incomplete beta series takes an argument below one",
    );
  }
  let term = one;
  let sum = one;
  let n = 0;
  for (;;) {
    // t_(n+1) = t_n × (a + b + n) / (a + 1 + n) × x.
    const numerator = addFixed(sum0, scaleFixed(one, BigInt(n)));
    const denominator = addFixed(aw, scaleFixed(one, BigInt(n + 1)));
    term = multiplyFixed(
      divideFixed(multiplyFixed(term, numerator), denominator),
      xw,
    );
    n += 1;
    sum = addFixed(sum, term);
    const magnitude = abs(term.value) + term.error;
    // A term whose error exceeds its value carries nothing further: wide
    // parameters' intervals grow through the ratios, and the tail bound
    // from the magnitude, an upper bound on the true term, still holds.
    const exhausted = term.error >= abs(term.value);
    if (magnitude > FLOOR << HEADROOM && n < limit && !exhausted) continue;
    // The bounding ratio from above: the larger of the next ratio and x.
    const next = divideFixed(
      multiplyFixed(addFixed(sum0, scaleFixed(one, BigInt(n))), xw),
      addFixed(aw, scaleFixed(one, BigInt(n + 1))),
    );
    const ratioAbove =
      next.value + next.error > xw.value + xw.error
        ? next.value + next.error
        : xw.value + xw.error;
    if (ratioAbove < one.value) {
      const tail =
        ratioAbove <= one.value >> 1n
          ? magnitude
          : (magnitude * ratioAbove) / (one.value - ratioAbove) + 1n;
      if (tail <= FLOOR || n >= limit || exhausted) {
        return keepSignificant({ ...sum, error: sum.error + tail }, bits);
      }
    } else if (n >= limit || exhausted) {
      return undefined;
    }
  }
}
