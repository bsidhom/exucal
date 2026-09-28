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
// ulp, so the work is done at `bits + k` plus a guard, and for a negative
// argument at as many more fraction bits as the result is below one, so
// that `exp(-1000)`, about `2^-1443`, keeps its digits; the result is then
// cut to the bits its magnitude calls for (`keepSignificant`, D9). The
// argument must be moderate: its magnitude is bounded by the range limit
// before this is called (the built-in refuses `exp(1e6)` as `tooLarge`),
// and an argument beyond `2^40` is a precondition failure here.
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
// the whole interval would not stay positive under the error rules. The
// argument's magnitude is bounded as `expFixed`'s is, by the caller:
// `sinh` and `cosh` share the exponential's limit (3.6).

import { factorialSeries } from "./fixed-trig.ts";
import {
  absFixed,
  addFixed,
  divideFixed,
  divideFixedByInteger,
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

/** The most halvings ever needed: an argument below `2^40`, which the range limit forbids anyway. */
const MOST_MAGNITUDE = 40;

/** The bits the hyperbolic functions work beyond the result, for their ulps. */
const HYPERBOLIC_GUARD = 16;

/** The hyperbolic sine and cosine of one argument, computed together. */
export type SinhCosh = { readonly sinh: Fixed; readonly cosh: Fixed };

/**
 * `exp(f)` with `bits` significant bits kept for its magnitude, and an
 * interval containing `exp` of every value in `f`'s.
 */
export function expFixed(f: Fixed, bits: number): Fixed {
  // |x| < 2^magnitude.
  const magnitude = f.value === 0n ? 0 : exponentOf(f) + 1;
  if (magnitude > MOST_MAGNITUDE) {
    throw new RangeError("The exponential takes a moderate argument");
  }
  const halvings = Math.max(0, magnitude + 8);
  // A negative argument gives a result below one by up to |x| log2 e bits.
  const depth = f.value < 0n ? Math.ceil(2 ** magnitude * Math.LOG2E) + 1 : 0;
  const working = bits + halvings + depth + 16;
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
  let result = sum;
  for (let i = 0; i < halvings; i++) result = multiplyFixed(result, result);
  return keepSignificant(result, bits);
}

/**
 * `sinh(f)` and `cosh(f)` with `bits` significant bits kept for each one's
 * magnitude, and intervals containing the functions of every value in
 * `f`'s, as the header says; `f`'s magnitude must be moderate, as
 * `expFixed`'s must.
 */
export function sinhCoshFixed(f: Fixed, bits: number): SinhCosh {
  const { sinh, cosh } = pair(f, bits);
  return {
    sinh: keepSignificant(sinh, bits),
    cosh: keepSignificant(cosh, bits),
  };
}

/**
 * `tanh(f)` with `bits` significant bits kept for its magnitude: the
 * quotient of the pair at the working bits, before either is cut, so that
 * a quotient of two large values keeps the working bits.
 */
export function tanhFixed(f: Fixed, bits: number): Fixed {
  const { sinh, cosh } = pair(f, bits);
  return keepSignificant(divideFixed(sinh, cosh), bits);
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
    return { sinh: multiplyFixed(x, odd), cosh: even };
  }
  if (x.error << 1n >= one.value) {
    const largest: Fixed = {
      value: abs(x.value) + x.error,
      error: 0n,
      bits: working,
    };
    const { sinh: sinhM, cosh: coshM } = pair(largest, bits);
    const [sinhBound, coshBound] = [sinhM, coshM].map((g) =>
      g.bits > working ? truncateFixed(g, working) : rebaseFixed(g, working),
    ) as [Fixed, Fixed];
    return {
      sinh: {
        value: 0n,
        error: sinhBound.value + sinhBound.error,
        bits: working,
      },
      cosh: {
        value: (one.value + coshBound.value) >> 1n,
        error: ((coshBound.value - one.value) >> 1n) + coshBound.error + 1n,
        bits: working,
      },
    };
  }
  const e = expFixed(absFixed(x), working);
  const inverse = divideFixed(one, e);
  const sinh = shiftFixed(subtractFixed(e, inverse), -1);
  return {
    sinh: x.value < 0n ? scaleFixed(sinh, -1n) : sinh,
    cosh: shiftFixed(addFixed(e, inverse), -1),
  };
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
