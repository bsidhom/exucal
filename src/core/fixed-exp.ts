// The exponential on the kernel: `expFixed`, the routine behind the
// built-in `exp` (builtins/exp.ts) and the log-space route of a power
// (ball.ts), and `sinhCoshFixed`, behind the hyperbolic functions
// (builtins/hyperbolic.ts). docs/calculator-plan.md (D9 and tasks 3.6 and
// 3.11) is the design.
//
// The argument is reduced by halving: `r = x / 2^k` with `k` chosen so that
// `|r| < 2^-8`, which is exact (a rebase), then `exp(r)` is the Taylor
// series `Σ r^n / n!` summed in fixed point with the argument's error
// included from the start, so that the sum's interval contains `exp` of
// every value in the argument's (D9: no derivative bound is needed), and
// `exp(x)` is the sum squared `k` times. The series stops at the first term
// whose whole interval lies within an ulp: the terms shrink by better than
// `2^-8` each, so the tail after that term is below a 255th of an ulp, and
// one ulp covers it. Each squaring doubles the relative error and adds an
// ulp, so the work is done at `bits + k` plus a guard. The result is a
// `Floating` (fixed.ts; 4.9 of the plan): after each squaring the
// mantissa is brought back to `[1, 2)` at the working bits and the rest
// moved into the exponent (`normalizeFloating`), so that `exp(1e6)` costs
// what `exp(1)` costs plus a squaring per bit of its magnitude, about
// twenty at the working bits, rather than a value of 1.4 million bits, and a negative argument is the same
// loop with the exponent going negative, so that `exp(-1e6)` costs the
// same and `exp(-1000)`, about `2^-1443`, keeps its digits. The
// argument's magnitude is bounded by the exponent bound before this is
// called (`expFits` of ball.ts refuses `exp(1e30)` as an `overflow`), and an
// argument beyond `2^62`, whose exponential would pass the bound, is a
// precondition failure here; the magnitude is taken over the argument's
// whole interval. An argument whose interval is wider than one (an error
// of one half or more) never reaches the halvings: it is zero within the
// exponential of its signed upper end, `value + error` formed exactly,
// whose value plus its error bounds the exponential of every value in
// the interval, so that `exp(approx(1e60) - approx(1e60))` at the first
// pass, `0` within about `2e9`, costs milliseconds where squaring the
// whole interval doubled the bit length of a relative error of
// `e^(2 × 10^9)` at every step until V8 refused (issue #39); the end is
// the signed one, not the largest magnitude, which for a wide negative
// interval near `-2.3 × 10^18` would report an overflow, and the guard
// before this bounds it. digits.ts takes such a result, whose mantissa's
// interval contains zero and so has no logarithm, as zero within the
// bound of its extent.
//
// `sinhCoshFixed` computes the hyperbolic sine and cosine together. An
// argument below one throughout its interval takes the two series in `x^2`
// over the factorials (`factorialSeries` of fixed-trig.ts, the sine's and
// the cosine's without the alternating sign), `cosh x = Σ x^2k / (2k)!` and
// `sinh x = x Σ x^2k / (2k+1)!`, so that `sinh` of a small argument never
// forms the difference `(e^x - e^-x) / 2`, whose cancellation would cost
// it its digits; any other argument goes through `expFixed` on its
// magnitude, `E = e^|x|`, and `cosh x = (E + 1/E) / 2`, `sinh x = ±(E - 1/E)
// / 2`, where the difference loses at most a bit since `E` is at least
// `e`. The work is done at the larger of the bits asked for and the
// argument's bits plus a guard, so that a tiny argument, which a caller
// converts at more bits, keeps its digits, and the results are cut to the
// bits their magnitudes call for (D9); `tanhFixed` divides the pair before
// the cut, so that the quotient of two large values keeps the working
// bits. An argument whose interval is wider than one is the trivial bound
// from the exponential of its largest magnitude, since the exponential of
// the whole interval would not stay positive under the error rules; for
// `tanhFixed` such an argument is zero within one, the function's whole
// range, decided before the pair is formed, since the pair's bound beyond
// the working bits would read as saturation on whichever side the
// midpoint lies (issue #38). The
// argument's magnitude is bounded as `expFixed`'s is, by the caller:
// `sinh` and `cosh` share the exponential's range (3.6, then 4.9). The
// pair is a pair of `Floating`s: where the exponential's exponent is
// beyond half the working bits, the reciprocal `1/E` is below an ulp of
// `E` and is folded into the error, so that `sinh(1e6)` and `cosh(1e6)`
// are `E/2` within an ulp and nothing of the result's size is formed; and
// `tanhFixed` is then `±1` within two ulps, which only an interval far
// out on one side reaches, though `tanh`'s saturation in the built-in
// comes first and never lets such an argument in.

import { factorialSeries } from "./fixed-trig.ts";
import {
  absFixed,
  addFixed,
  divideFixed,
  divideFixedByInteger,
  exponentOf,
  floatingOf,
  floatingToFixed,
  keepSignificant,
  multiplyFixed,
  normalizeFloating,
  rebaseFixed,
  scaleFixed,
  shiftFixed,
  subtractFixed,
  truncateFixed,
  type Fixed,
  type Floating,
} from "./fixed.ts";

/** The most halvings' worth of magnitude ever needed: an argument below `2^62`, beyond which the exponential passes the exponent bound. */
const MOST_MAGNITUDE = 62;

/** The bits the hyperbolic functions work beyond the result, for their ulps. */
const HYPERBOLIC_GUARD = 16;

/** The hyperbolic sine and cosine of one argument, computed together, each with its exponent. */
export type SinhCosh = { readonly sinh: Floating; readonly cosh: Floating };

/**
 * `exp(f)` with `bits` significant bits kept for its mantissa, and an
 * interval containing `exp` of every value in `f`'s, as a `Floating`.
 */
export function expFixed(f: Fixed, bits: number): Floating {
  // |x| < 2^magnitude over the whole interval.
  const extent = abs(f.value) + f.error;
  const magnitude = extent === 0n ? 0 : exponentOf({ ...f, value: extent }) + 1;
  if (magnitude > MOST_MAGNITUDE) {
    throw new RangeError(
      "The exponential takes an argument within the exponent bound",
    );
  }
  // An interval of width one or more (an error of one half or more): zero
  // within the exponential of its signed upper end, formed exactly, whose
  // value plus its error bounds the exponential of every value in the
  // interval; the squarings below would double the bit length of a
  // relative error of `e^(2 × 10^9)` at every step (issue #39).
  if (f.error << 1n >= 1n << BigInt(f.bits)) {
    const upper = expFixed(
      { value: f.value + f.error, error: 0n, bits: f.bits },
      bits,
    );
    return {
      mant: {
        value: 0n,
        error: abs(upper.mant.value) + upper.mant.error,
        bits: upper.mant.bits,
      },
      exp: upper.exp,
    };
  }
  const halvings = Math.max(0, magnitude + 8);
  const working = bits + halvings + 16;
  const shifted = shiftFixed(f, -halvings);
  const r =
    shifted.bits > working
      ? truncateFixed(shifted, working)
      : rebaseFixed(shifted, working);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  let sum = one;
  let term = one;
  for (let n = 1n; n < 100000n; n++) {
    term = divideFixedByInteger(multiplyFixed(term, r), n);
    sum = addFixed(sum, term);
    // The term's whole interval is within an ulp: the tail after it is
    // below a 255th of that, which one ulp covers.
    if (abs(term.value) + term.error <= 1n) {
      sum = { ...sum, error: sum.error + 1n };
      break;
    }
  }
  let result = normalizeFloating(sum, 0n, working);
  for (let i = 0; i < halvings; i++) {
    result = normalizeFloating(
      multiplyFixed(result.mant, result.mant),
      2n * result.exp,
      working,
    );
  }
  return { mant: truncateFixed(result.mant, bits), exp: result.exp };
}

/**
 * `sinh(f)` and `cosh(f)` with `bits` significant bits kept for each one's
 * mantissa, and intervals containing the functions of every value in
 * `f`'s, as the header says; `f`'s magnitude must be within the exponent
 * bound, as `expFixed`'s must.
 */
export function sinhCoshFixed(f: Fixed, bits: number): SinhCosh {
  const { sinh, cosh } = pair(f, bits);
  return { sinh: cut(sinh, bits), cosh: cut(cosh, bits) };
}

/**
 * `tanh(f)` with `bits` significant bits kept for its magnitude: the
 * quotient of the pair at the working bits, before either is cut, so that
 * a quotient of two large values keeps the working bits. An interval of
 * width one or more (an error of one half or more) is zero within one,
 * `tanh`'s whole range, decided before the pair is formed: the pair's own
 * wide bound reads as saturation beyond the working bits, which is sound
 * only far out on one side (issue #38). Where the pair was folded, which
 * an interval narrower than one reaches only far out on one side, the
 * result is `±1` within two ulps.
 */
export function tanhFixed(f: Fixed, bits: number): Fixed {
  const working = Math.max(bits, f.bits) + HYPERBOLIC_GUARD;
  if (f.error << 1n >= 1n << BigInt(f.bits)) {
    return { value: 0n, error: 1n << BigInt(working), bits: working };
  }
  const { sinh, cosh } = pair(f, bits);
  const s = floatingToFixed(sinh, working);
  const c = floatingToFixed(cosh, working);
  if (s === undefined || c === undefined) {
    const one = { value: 1n << BigInt(working), error: 2n, bits: working };
    return keepSignificant(f.value < 0n ? scaleFixed(one, -1n) : one, bits);
  }
  return keepSignificant(divideFixed(s, c), bits);
}

/**
 * The pair at the working bits, by the series or the exponential as the
 * header says. An argument whose interval is wider than one (an error of
 * one half or more) is the trivial bound: with `M` the largest magnitude
 * in the interval, `sinh` lies within `±sinh M` and `cosh` in `[1, cosh
 * M]`, both from the exponential of `M` alone, since the exponential of
 * the whole interval would not stay positive under the error rules.
 */
function pair(f: Fixed, bits: number): SinhCosh {
  const working = Math.max(bits, f.bits) + HYPERBOLIC_GUARD;
  const x = rebaseFixed(f, working);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  if (abs(x.value) + x.error < one.value) {
    const { even, odd } = factorialSeries(multiplyFixed(x, x));
    return { sinh: floatingOf(multiplyFixed(x, odd)), cosh: floatingOf(even) };
  }
  if (x.error << 1n >= one.value) {
    const largest: Fixed = {
      value: abs(x.value) + x.error,
      error: 0n,
      bits: working,
    };
    const { sinh: sinhM, cosh: coshM } = pair(largest, bits);
    const sinhBound = floatingToFixed(sinhM, working);
    const coshBound = floatingToFixed(coshM, working);
    if (sinhBound === undefined || coshBound === undefined) {
      // Beyond the working bits: zero within the bound, and `M / 2` within
      // itself, which covers `[1, M]`.
      return { sinh: around(sinhM), cosh: around(coshM) };
    }
    const [sinhAt, coshAt] = [sinhBound, coshBound].map((g) =>
      g.bits > working ? truncateFixed(g, working) : rebaseFixed(g, working),
    ) as [Fixed, Fixed];
    return {
      sinh: floatingOf({
        value: 0n,
        error: sinhAt.value + sinhAt.error,
        bits: working,
      }),
      cosh: floatingOf({
        value: (one.value + coshAt.value) >> 1n,
        error: ((coshAt.value - one.value) >> 1n) + coshAt.error + 1n,
        bits: working,
      }),
    };
  }
  const e = expFixed(absFixed(x), working);
  // Beyond half the working bits in the exponent, 1/E is below an ulp of
  // E: the pair is E/2 within that ulp, and nothing larger is formed.
  if (e.exp > BigInt(working) / 2n + 2n) {
    const half: Floating = {
      mant: { ...e.mant, error: e.mant.error + 1n },
      exp: e.exp - 1n,
    };
    return {
      sinh: x.value < 0n ? { ...half, mant: scaleFixed(half.mant, -1n) } : half,
      cosh: half,
    };
  }
  const E = floatingToFixed(e, working);
  if (E === undefined) throw new Error("An exponent within half the bits fits");
  const inverse = divideFixed(one, E);
  const sinh = shiftFixed(subtractFixed(E, inverse), -1);
  return {
    sinh: floatingOf(x.value < 0n ? scaleFixed(sinh, -1n) : sinh),
    cosh: floatingOf(shiftFixed(addFixed(E, inverse), -1)),
  };
}

/** A ball around zero whose error covers the whole of the `Floating` `fl`, at its exponent. */
function around(fl: Floating): Floating {
  return {
    mant: {
      value: 0n,
      error: abs(fl.mant.value) + fl.mant.error,
      bits: fl.mant.bits,
    },
    exp: fl.exp,
  };
}

/** `fl` with `bits` significant bits kept for its mantissa (D9): normalized, then truncated to the bits. */
function cut(fl: Floating, bits: number): Floating {
  if (fl.mant.value === 0n) {
    return { mant: keepSignificant(fl.mant, bits), exp: fl.exp };
  }
  const normalized = normalizeFloating(fl.mant, fl.exp, fl.mant.bits);
  return {
    mant:
      normalized.mant.bits > bits
        ? truncateFixed(normalized.mant, bits)
        : normalized.mant,
    exp: normalized.exp,
  };
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
