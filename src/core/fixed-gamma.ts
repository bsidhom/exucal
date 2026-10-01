// The digamma function on the kernel: `digammaFixed`, the routine behind
// the built-in `digamma` (builtins/gamma.ts), with the shift and the
// asymptotic series that `lgamma` will share (docs/special.md, "The Gamma
// and Beta families"; the plan's 6.2).
//
// For a positive argument `x`, the recurrence `ψ(x + 1) = ψ(x) + 1/x`
// shifts the argument up to `y = x + n` at or above `N`, about a third of
// the working bits, where the asymptotic series
//
//   ψ(y) = ln y - 1/(2y) - Σ_{k>=1} B_2k / (2k y^2k)
//
// converges fast enough: its terms shrink until `k` is near `π y`, where
// they are of the order of `e^(-2π y)`, far below an ulp for such a `y`,
// so the series is summed until a term falls below an ulp, which happens
// while the terms still shrink. For a positive real argument the
// remainder of this series is bounded in magnitude by the first omitted
// term (DLMF 5.11(ii)), which is the bound added to the error. The
// Bernoulli numbers come from bernoulli.ts, exact; `ln y` from
// fixed-log.ts. The shift costs `n` divisions at the working bits and the
// series about `bits / 9` multiplications, each term being the last
// times `1 / y^2` and a rational; a third of the bits balances the two,
// since the Bernoulli numbers the series then needs, about `B_(2 bits /
// 9)`, cost a second or two once at the default ceiling, where a shorter
// shift would need many more of them.
//
// The argument's error rides through every operation (D9): the shift's
// reciprocals, the logarithm, and the powers of `1 / y^2`. The result is
// cut to the bits its magnitude calls for (`keepSignificant`). A negative
// or a huge argument, and one near a pole, are the built-in's to turn
// into a positive one of moderate size before calling in; an argument
// whose interval is not positive is a precondition failure.

import { bernoulli } from "./bernoulli.ts";
import { lnFixed } from "./fixed-log.ts";
import {
  addFixed,
  divideFixed,
  divideFixedByInteger,
  keepSignificant,
  multiplyFixed,
  rebaseFixed,
  scaleFixed,
  subtractFixed,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";
import { abs, bitLength } from "./rational.ts";

/** The bits the routine works beyond the result, for the sum's ulps. */
const GAMMA_GUARD = 16;

/** The ulps below which a term ends the series: a term's error is a few ulps however small the term, so one is never reached. */
const TERM_FLOOR = 8n;

/** How far the argument is shifted up, as a fraction of the working bits. */
const SHIFT_FRACTION = 1 / 3;

/** The shift target for `bits` working bits: about a third of them, and at least two. */
export function shiftTarget(bits: number): number {
  return Math.max(2, Math.ceil(bits * SHIFT_FRACTION));
}

/** `f` at exactly `bits` fraction bits, truncated or rebased. */
function at(f: Fixed, bits: number): Fixed {
  return f.bits > bits ? truncateFixed(f, bits) : rebaseFixed(f, bits);
}

/**
 * `ψ(f)` with `bits` significant bits kept for its magnitude, and an
 * interval containing the digamma function of every value in `f`'s, whose
 * interval must be positive (a precondition); `ln(2)` comes from its memo
 * at `ceilingBits` plus the margin (D10).
 */
export function digammaFixed(
  f: Fixed,
  bits: number,
  ceilingBits: number,
): Fixed {
  if (f.value - f.error <= 0n) {
    throw new RangeError(
      "digamma takes an argument whose interval is positive",
    );
  }
  const target = shiftTarget(bits);
  const working = bits + bitLength(BigInt(target)) + GAMMA_GUARD;
  const x = at(f, working);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  // The shift: n reciprocals, summed, for y = x + n at or above the target.
  // The first is taken from f at its own bits, which may exceed the
  // working bits when the argument is small (the caller's extra bits keep
  // the reciprocal's digits); every other is of a value at least one, for
  // which the working bits suffice, as they do for the series at y.
  const below = Number(x.value >> BigInt(working));
  const n = Math.max(0, target - below);
  let sum: Fixed = { value: 0n, error: 0n, bits: working };
  let y = x;
  for (let j = 0; j < n; j++) {
    const reciprocal =
      j === 0 ? at(divideFixed(one, f), working) : divideFixed(one, y);
    sum = addFixed(sum, reciprocal);
    y = addFixed(y, one);
  }
  // The series at y: each term from the last, times 1 / y^2 and the ratio
  // of consecutive Bernoulli numbers with its index factors, so that a
  // term's error stays a few ulps however small the term is; a power of
  // 1 / y^2 held on its own in fixed point loses its relative precision as
  // it shrinks, and the Bernoulli numerator it is multiplied by would turn
  // that into an error bound that never falls below an ulp.
  // 1 / y^2 as the square of 1 / y: a wide interval's square can reach
  // zero where the interval itself does not, and the reciprocal is shared.
  const ln = lnFixed(y, working, ceilingBits);
  const reciprocal = divideFixed(one, y);
  const half = divideFixedByInteger(reciprocal, 2n);
  const w = multiplyFixed(reciprocal, reciprocal);
  let term = divideFixedByInteger(w, 12n); // B_2 / (2 y^2), B_2 being 1/6
  let series: Fixed = { value: 0n, error: 0n, bits: working };
  let previous = bernoulli(1);
  for (let k = 1; ; k++) {
    const magnitude = abs(term.value) + term.error;
    if (magnitude <= TERM_FLOOR) {
      // The first omitted term bounds the remainder.
      series = { ...series, error: series.error + magnitude };
      break;
    }
    if (k > 4 * working) {
      throw new Error("The asymptotic series of digamma did not converge");
    }
    series = k % 2 === 1 ? addFixed(series, term) : subtractFixed(series, term);
    // t_(k+1) = t_k × (1 / y^2) × (B_(2k+2) / B_2k) × (2k / (2k + 2)), the
    // rational unreduced, since its reduction would cost a gcd of the
    // numerators a term. The exact scaling by the numerator comes first and
    // the two truncating steps last, so that a truncation's ulp is never
    // multiplied by the ratio, which grows like k^2 and would make the
    // error bound grow where the term shrinks.
    const next = bernoulli(k + 1);
    const scaled = scaleFixed(
      term,
      abs(next.num) * previous.den * BigInt(2 * k),
    );
    term = divideFixedByInteger(
      multiplyFixed(scaled, w),
      abs(previous.num) * next.den * BigInt(2 * k + 2),
    );
    previous = next;
  }
  const result = subtractFixed(
    subtractFixed(subtractFixed(ln, half), series),
    sum,
  );
  return keepSignificant(result, bits);
}
