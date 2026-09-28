// The exponential on the kernel: `expFixed`, the routine behind the
// built-in `exp` (builtins/exp.ts) and the log-space route of a power
// (ball.ts). docs/calculator-plan.md (D9 and task 3.6) is the design.
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

import {
  addFixed,
  divideFixedByInteger,
  exponentOf,
  keepSignificant,
  multiplyFixed,
  rebaseFixed,
  shiftFixed,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";

/** The most halvings ever needed: an argument below `2^40`, which the range limit forbids anyway. */
const MOST_MAGNITUDE = 40;

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

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
