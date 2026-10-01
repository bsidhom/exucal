// The incomplete gamma functions on the kernel, scaled: the routines
// behind the built-ins `lowergamma`, `uppergamma` and their regularized
// forms (builtins/incomplete.ts), and through them `erf` and `erfc`
// (docs/special.md, "The incomplete gamma functions"; the plan's 6.5).
// Both take the order `s` and the argument `x` as `Fixed` intervals and
// give a factor of order one, the exponential prefactor `x^s e^-x` and
// the Gamma function being the built-in's to apply in log space:
//
//   γ(s, x) = x^s e^-x / s × Σ_{n>=0} x^n / ((s + 1) (s + 2) … (s + n))
//   Γ(s, x) = x^s e^-x × h(s, x)
//
// `lowerSeriesFixed` sums the series, whose terms are positive, so there
// is no cancellation, and whose tail after the term `t_n` is at most
// `t_n r / (1 - r)` for the ratio `r = x / (s + n + 1)` once it is below
// one, since the ratios decrease: the truncation bound owed, added to
// the error. The count of terms is the caller's to estimate first
// (`seriesTermCount`), since the ratio approaches one when `x` is near
// a large `s`.
//
// `upperFractionFixed` evaluates `h(a, x)` by Legendre's continued
// fraction (DLMF 8.9.2),
//
//   h(a, x) = 1/(x+ (1-a)/(1+ 1/(x+ (2-a)/(1+ 2/(x+ (3-a)/(1+ …,
//
// by the forward recurrence of its convergents, normalized at each step.
// For `a <= 1` and `x > 0` every element is positive, so the
// convergents of even and odd index approach the value from the two
// sides and it lies between any two consecutive ones: the difference of
// the last two, with their own errors, is the truncation bound owed. The
// fraction converges in about `(bits ln 2)^2 / (7 x)` terms (measured),
// fast for a large `x` and slowly for a small one, where the series is
// the better route; the caller chooses. An order above one is reduced
// to `(0, 1]` by `upperReducedFixed`, which takes `h` at the fractional
// order and steps it up by `h(a + 1, x) = (a h(a, x) + 1) / x`, the
// recurrence `Γ(a + 1, x) = a Γ(a, x) + x^a e^-x` scaled, every term
// positive, so that the bracket survives the steps; the steps cost one
// multiplication and one division each, and are the caller's to bound.
// At an order above one, which the built-in never asks for, the
// elements have both signs and the convergents do not bracket: the
// routine reports the value unbracketed, with the last difference as the
// error all the same, which the tests exercise.

import {
  addFixed,
  divideFixed,
  exponentOf,
  keepSignificant,
  multiplyFixed,
  rebaseFixed,
  scaleFixed,
  shiftFixed,
  subtractFixed,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";
import { abs, bitLength } from "./rational.ts";

/** The bits the routines work beyond the result, for the sum's ulps. */
const INCOMPLETE_GUARD = 16;

/** The ulps below which a tail or a bracket ends a loop. */
const FLOOR = 8n;

/** The bits above the floor within which a term's tail bound is computed, and the convergents a bracket is checked every one of. */
const HEADROOM = 64n;
const CHECK_EVERY = 8;

/** `f` at exactly `bits` fraction bits, truncated or rebased. */
function at(f: Fixed, bits: number): Fixed {
  return f.bits > bits ? truncateFixed(f, bits) : rebaseFixed(f, bits);
}

/** One at `bits` fraction bits. */
function oneAt(bits: number): Fixed {
  return { value: 1n << BigInt(bits), error: 0n, bits };
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
 * `bits` for the order `s` and argument `x`, estimated in doubles from
 * the upper ends of their intervals, up to `limit`, beyond which it
 * answers `limit + 1`: the terms grow while the ratio is above one and
 * fall thereafter, so the count is where the logarithm of the term
 * drops `bits + guard` bits below the largest, with the ratio below a
 * half, where the tail is within a term.
 */
export function seriesTermCount(
  s: Fixed,
  x: Fixed,
  bits: number,
  limit: number,
): number {
  // Past a double's range the ends are infinite, and the estimate still
  // answers: a huge order drops the terms at once, a huge argument never.
  const sv = upperEnd(s);
  const xv = upperEnd(x);
  const drop = (bits + INCOMPLETE_GUARD) * Math.LN2;
  let logTerm = 0;
  let largest = 0;
  for (let n = 1; n <= limit; n++) {
    logTerm += Math.log(xv) - Math.log(sv + n);
    if (logTerm > largest) largest = logTerm;
    const r = xv / (sv + n + 1);
    // The tail is the term times r / (1 - r), which the drop covers too.
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
 * `Σ_{n>=0} x^n / ((s + 1) … (s + n))` with `bits` significant bits, and
 * an interval containing the sum for every `s` and `x` in theirs, which
 * must be positive and at or above zero (preconditions), summed to at
 * most `limit` terms, as the header says: the tail bound is added where
 * the loop ends, which it may with the bound still large when `limit`
 * is reached, an interval that is sound and wide.
 */
export function lowerSeriesFixed(
  s: Fixed,
  x: Fixed,
  bits: number,
  limit: number,
): Fixed {
  const working = Math.max(bits, s.bits, x.bits) + INCOMPLETE_GUARD;
  const sw = at(s, working);
  const xw = at(x, working);
  const one = oneAt(working);
  // s + n must exclude zero for every n from one: s above -1 throughout.
  if (sw.value - sw.error <= -one.value) {
    throw new RangeError("The incomplete gamma series takes an order above -1");
  }
  // The ratio bound takes |x|: a tiny argument converts to zero within
  // an ulp, an interval of both signs the sum is still sound over.
  const magnitudeX: Fixed = { ...xw, value: abs(xw.value) };
  let term = one;
  let sum = one;
  let n = 0;
  for (;;) {
    n += 1;
    term = divideFixed(
      multiplyFixed(term, xw),
      addFixed(sw, scaleFixed(one, BigInt(n))),
    );
    sum = addFixed(sum, term);
    const magnitude = abs(term.value) + term.error;
    // The tail's factor r / (1 - r) is at most of the order of s, so the
    // bound is worth its division only once the term is within reach.
    if (magnitude > FLOOR << HEADROOM && n < limit) continue;
    // The ratio of the next term to this one, from above.
    const ratio = divideFixed(
      magnitudeX,
      addFixed(sw, scaleFixed(one, BigInt(n + 1))),
    );
    const ratioAbove = ratio.value + ratio.error;
    if (ratioAbove < one.value) {
      // tail <= term × r / (1 - r), with r from above.
      const tail =
        ratioAbove <= one.value >> 1n
          ? magnitude
          : (magnitude * ratioAbove) / (one.value - ratioAbove) + 1n;
      if (tail <= FLOOR || n >= limit) {
        return keepSignificant({ ...sum, error: sum.error + tail }, bits);
      }
    } else if (n >= limit) {
      throw new RangeError(
        "The incomplete gamma series was given too few terms",
      );
    }
  }
}

/** The value `h(a, x)` of the fraction and whether its convergents bracket it. */
export type Fraction = { readonly value: Fixed; readonly bracketed: boolean };

/**
 * `h(a, x)` by Legendre's continued fraction with `bits` significant
 * bits, for `x` positive throughout (a precondition), summed to at most
 * `limit` convergents, as the header says: bracketed, with the last two
 * convergents' difference in the error, when `a` lies in `(0, 1]`
 * throughout, and otherwise unbracketed, with that difference as the
 * error all the same.
 */
export function upperFractionFixed(
  a: Fixed,
  x: Fixed,
  bits: number,
  limit: number,
): Fraction {
  if (x.value - x.error <= 0n) {
    throw new RangeError("The continued fraction takes a positive argument");
  }
  const working = Math.max(bits, a.bits, x.bits) + INCOMPLETE_GUARD;
  const aw = at(a, working);
  const xw = at(x, working);
  const one = oneAt(working);
  // Every element is positive for an order at or below one: k - a > 0.
  const bracketed = aw.value + aw.error <= one.value;
  // The convergents A_n / B_n: A_-1 = 1, A_0 = 0, B_-1 = 0, B_0 = 1.
  let aPrev: Fixed = one;
  let aCur: Fixed = { value: 0n, error: 0n, bits: working };
  let bPrev: Fixed = { value: 0n, error: 0n, bits: working };
  let bCur: Fixed = one;
  for (let n = 1; ; n++) {
    // The elements: a_1 = 1, a_2k = k - a, a_(2k+1) = k; b odd = x, b even = 1.
    const k = n >> 1;
    const an: Fixed =
      n === 1
        ? one
        : n % 2 === 0
          ? subtractFixed(scaleFixed(one, BigInt(k)), aw)
          : scaleFixed(one, BigInt(k));
    const bn = n % 2 === 1 ? xw : one;
    const aNext = addFixed(multiplyFixed(bn, aCur), multiplyFixed(an, aPrev));
    const bNext = addFixed(multiplyFixed(bn, bCur), multiplyFixed(an, bPrev));
    // Normalize by B's magnitude once it has grown, both pairs alike, so
    // the quotient stands.
    const e = bNext.value === 0n ? 0 : exponentOf(bNext);
    if (e > 64 || e < -64) {
      aPrev = at(shiftFixed(aCur, -e), working);
      aCur = at(shiftFixed(aNext, -e), working);
      bPrev = at(shiftFixed(bCur, -e), working);
      bCur = at(shiftFixed(bNext, -e), working);
    } else {
      aPrev = aCur;
      aCur = aNext;
      bPrev = bCur;
      bCur = bNext;
    }
    if (n % CHECK_EVERY !== 0 && n < limit) continue;
    // The bracket is the last two convergents, of either parity, whose
    // difference is compared to the floor on its own: the convergents'
    // errors grow by an ulp or so a step while their difference shrinks
    // to nothing, and the bound owed is the difference plus the errors.
    // At the limit, or when only an unbracketed fraction's denominator
    // has reached zero, with nothing to bracket by: an interval of
    // everything, which is sound.
    const everything: Fraction = {
      value: { value: 0n, error: 1n << BigInt(working + 64), bits: working },
      bracketed: false,
    };
    if (bCur.value <= bCur.error || bPrev.value <= bPrev.error) {
      if (n >= limit) return everything;
      continue;
    }
    const f = divideFixed(aCur, bCur);
    const previous = divideFixed(aPrev, bPrev);
    const difference = abs(f.value - previous.value);
    if (difference <= FLOOR || n >= limit) {
      return {
        value: keepSignificant(
          { ...f, error: difference + f.error + previous.error },
          bits,
        ),
        bracketed,
      };
    }
  }
}

/**
 * `h(s, x)` for an order `s` above one, by the fraction at the order
 * reduced into `(0, 1]` and `steps` applications of `h(a + 1, x) = (a
 * h(a, x) + 1) / x`, as the header says: `s - steps` must lie in
 * `(0, 1]` throughout (a precondition), and the fraction takes `limit`.
 */
export function upperReducedFixed(
  s: Fixed,
  x: Fixed,
  steps: number,
  bits: number,
  limit: number,
): Fixed {
  const working = Math.max(bits, s.bits, x.bits) + INCOMPLETE_GUARD;
  const one = oneAt(working);
  const xw = at(x, working);
  let a = subtractFixed(at(s, working), scaleFixed(one, BigInt(steps)));
  const start = upperFractionFixed(a, xw, working, limit);
  if (!start.bracketed) {
    throw new RangeError("The reduced order lies in (0, 1]");
  }
  let h = at(start.value, working);
  for (let i = 0; i < steps; i++) {
    h = divideFixed(addFixed(multiplyFixed(a, h), one), xw);
    a = addFixed(a, one);
  }
  return keepSignificant(h, bits);
}
