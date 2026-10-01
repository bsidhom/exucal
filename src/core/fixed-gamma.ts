// The digamma and log-gamma functions on the kernel: `digammaFixed` and
// `lgammaFixed`, the routines behind the built-ins `digamma`, `lgamma`
// and `gamma` (builtins/gamma.ts), sharing the shift and the asymptotic
// series (docs/special.md, "The Gamma and Beta families"; the plan's 6.2
// and 6.3).
//
// For a positive argument `x`, the recurrences `ψ(x + 1) = ψ(x) + 1/x`
// and `Γ(x + 1) = x Γ(x)` shift the argument up to `y = x + n` at or
// above `N`, about a third of the working bits, where the asymptotic
// series
//
//   ψ(y) = ln y - 1/(2y) - Σ_{k>=1} B_2k / (2k y^2k)
//   ln Γ(y) = (y - 1/2) ln y - y + ln(2π)/2
//             + Σ_{k>=1} B_2k / (2k (2k - 1) y^(2k - 1))
//
// converge fast enough: their terms shrink until `k` is near `π y`, where
// they are of the order of `e^(-2π y)`, far below an ulp for such a `y`,
// so each series is summed until a term falls below an ulp, which
// happens while the terms still shrink. For a positive real argument the
// remainder of either series is bounded in magnitude by the first
// omitted term (DLMF 5.11(ii)), which is the bound added to the error.
// The Bernoulli numbers come from bernoulli.ts, exact; the logarithms
// from fixed-log.ts. The shift costs `n` divisions (`digamma`) or
// multiplications (`lgamma`) at the working bits and the series about
// `bits / 9` multiplications, each term being the last times `1 / y^2`
// and a rational; a third of the bits balances the two, since the
// Bernoulli numbers the series then needs, about `B_(2 bits / 9)`, cost
// a second or two once at the default ceiling, where a shorter shift
// would need many more of them.
//
// The argument's error rides through every operation (D9): the shift's
// reciprocals or factors, the logarithms, and the powers of `1 / y^2`.
// Each result is cut to the bits its magnitude calls for
// (`keepSignificant`). A negative or a huge argument, and one near a
// pole, are the built-in's to turn into a positive one of moderate size
// before calling in; an argument whose interval is not positive is a
// precondition failure.

import { bernoulli } from "./bernoulli.ts";
import { MEMO_MARGIN, piFixed } from "./constants.ts";
import { ln2Fixed, lnFixed } from "./fixed-log.ts";
import {
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
import { abs, bitLength } from "./rational.ts";

/** The bits the routines work beyond the result, for the sum's ulps. */
const GAMMA_GUARD = 16;

/** The ulps below which a term ends a series: a term's error is a few ulps however small the term, so one is never reached. */
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

/** The shift's parameters for `f` at `bits`: the working bits, the argument at them, and the count of steps to the target. */
function shiftOf(
  f: Fixed,
  bits: number,
): { working: number; x: Fixed; one: Fixed; n: number } {
  if (f.value - f.error <= 0n) {
    throw new RangeError(
      "The Gamma family takes an argument whose interval is positive",
    );
  }
  const target = shiftTarget(bits);
  const working = bits + bitLength(BigInt(target)) + GAMMA_GUARD;
  const x = at(f, working);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  const below = Number(x.value >> BigInt(working));
  return { working, x, one, n: Math.max(0, target - below) };
}

/**
 * `Σ_{k>=1} (-1)^(k-1) |t_k|`, the alternating series whose first term
 * is `first` and whose terms satisfy `t_(k+1) = t_k × w × |B_(2k+2) /
 * B_2k| × num(k) / den(k)` for the index factors `factor` gives, with
 * the first omitted term added to the error as the remainder's bound.
 * Each term comes from the last, so that a term's error stays a few ulps
 * however small the term is; a power of `w` held on its own in fixed
 * point loses its relative precision as it shrinks, and the Bernoulli
 * numerator it is multiplied by would turn that into an error bound that
 * never falls below an ulp. The rational is left unreduced, since its
 * reduction would cost a gcd of the numerators a term; the exact scaling
 * by the numerator comes first and the two truncating steps last, so
 * that a truncation's ulp is never multiplied by the ratio, which grows
 * like `k^2` and would make the error bound grow where the term shrinks.
 */
function bernoulliSeries(
  first: Fixed,
  w: Fixed,
  factor: (k: number) => readonly [bigint, bigint],
  working: number,
): Fixed {
  let term = first;
  let series: Fixed = { value: 0n, error: 0n, bits: working };
  let previous = bernoulli(1);
  for (let k = 1; ; k++) {
    const magnitude = abs(term.value) + term.error;
    if (magnitude <= TERM_FLOOR) {
      return { ...series, error: series.error + magnitude };
    }
    if (k > 4 * working) {
      throw new Error("The asymptotic series did not converge");
    }
    series = k % 2 === 1 ? addFixed(series, term) : subtractFixed(series, term);
    const next = bernoulli(k + 1);
    const [num, den] = factor(k);
    const scaled = scaleFixed(term, abs(next.num) * previous.den * num);
    term = divideFixedByInteger(
      multiplyFixed(scaled, w),
      abs(previous.num) * next.den * den,
    );
    previous = next;
  }
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
  const { working, x, one, n } = shiftOf(f, bits);
  // The shift: n reciprocals, summed, for y = x + n at or above the target.
  // The first is taken from f at its own bits, which may exceed the
  // working bits when the argument is small (the caller's extra bits keep
  // the reciprocal's digits); every other is of a value at least one, for
  // which the working bits suffice, as they do for the series at y.
  let sum: Fixed = { value: 0n, error: 0n, bits: working };
  let y = x;
  for (let j = 0; j < n; j++) {
    const reciprocal =
      j === 0 ? at(divideFixed(one, f), working) : divideFixed(one, y);
    sum = addFixed(sum, reciprocal);
    y = addFixed(y, one);
  }
  // 1 / y^2 as the square of 1 / y: a wide interval's square can reach
  // zero where the interval itself does not, and the reciprocal is shared.
  const ln = lnFixed(y, working, ceilingBits);
  const reciprocal = divideFixed(one, y);
  const half = divideFixedByInteger(reciprocal, 2n);
  const w = multiplyFixed(reciprocal, reciprocal);
  // t_(k+1) = t_k × (1 / y^2) × (B_(2k+2) / B_2k) × (2k / (2k + 2)).
  const series = bernoulliSeries(
    divideFixedByInteger(w, 12n), // B_2 / (2 y^2), B_2 being 1/6
    w,
    (k) => [BigInt(2 * k), BigInt(2 * k + 2)],
    working,
  );
  const result = subtractFixed(
    subtractFixed(subtractFixed(ln, half), series),
    sum,
  );
  return keepSignificant(result, bits);
}

/** The memo of `ln π`, as the constants of D10 are held: one value at the ceiling plus the margin. */
let lnPiHeld: Fixed | undefined;

/** `ln π` at `bits` fraction bits, from the memo of `pi` at `ceilingBits` plus the margin (D10). */
export function lnPiFixed(bits: number, ceilingBits: number): Fixed {
  const compute = (b: number): Fixed =>
    lnFixed(piFixed(b, ceilingBits), b, ceilingBits);
  const wanted = ceilingBits + MEMO_MARGIN;
  if (bits > wanted) return compute(bits);
  if (lnPiHeld === undefined || lnPiHeld.bits < wanted) {
    lnPiHeld = compute(wanted);
  }
  return lnPiHeld.bits === bits ? lnPiHeld : truncateFixed(lnPiHeld, bits);
}

/** `ln(2π) / 2` at `bits` fraction bits, from the memos of `ln π` and `ln 2`. */
export function lnTwoPiHalfFixed(bits: number, ceilingBits: number): Fixed {
  const sum = addFixed(
    lnPiFixed(bits + 1, ceilingBits),
    ln2Fixed(bits + 1, ceilingBits),
  );
  return shiftFixed(sum, -1);
}

/** The fraction bits of the value the memo of `ln π` holds, or `undefined` before the first request; for the tests. */
export function lnPiMemoBits(): number | undefined {
  return lnPiHeld?.bits;
}

/**
 * `ln Γ(f)` with `bits` significant bits kept for its magnitude, and an
 * interval containing the logarithm of the Gamma function of every value
 * in `f`'s, whose interval must be positive (a precondition); `ln(2)`
 * and `pi` come from their memos at `ceilingBits` plus the margin (D10).
 * The shift's product `x (x + 1) … (x + n - 1)` is kept as a mantissa at
 * the working bits with a binary exponent, so that its factors cost one
 * multiplication at the working bits each, and its logarithm is taken
 * once; the first factor, `x` itself, is taken at `f`'s own bits, which
 * may exceed the working bits when the argument is small (the caller's
 * extra bits keep its logarithm's digits), and the rest, at least one
 * each, at the working bits.
 */
export function lgammaFixed(
  f: Fixed,
  bits: number,
  ceilingBits: number,
): Fixed {
  const { working, x, one, n } = shiftOf(f, bits);
  let lnProduct: Fixed = { value: 0n, error: 0n, bits: working };
  let y = x;
  if (n > 0) {
    lnProduct = at(lnFixed(f, working, ceilingBits), working);
    y = addFixed(y, one);
    let mantissa = one;
    let exponent = 0;
    for (let j = 1; j < n; j++) {
      const product = multiplyFixed(mantissa, y);
      const e = exponentOf(product);
      mantissa = at(shiftFixed(product, -e), working);
      exponent += e;
      y = addFixed(y, one);
    }
    if (n > 1) {
      lnProduct = addFixed(
        lnProduct,
        at(lnFixed(mantissa, working, ceilingBits, exponent), working),
      );
    }
  }
  // Stirling's series at y: (y - 1/2) ln y - y + ln(2π)/2 + Σ.
  const ln = lnFixed(y, working, ceilingBits);
  const half: Fixed = { ...one, value: one.value >> 1n };
  const stirling = addFixed(
    subtractFixed(multiplyFixed(subtractFixed(y, half), ln), y),
    lnTwoPiHalfFixed(working, ceilingBits),
  );
  const reciprocal = divideFixed(one, y);
  const w = multiplyFixed(reciprocal, reciprocal);
  // t_(k+1) = t_k × (1 / y^2) × (B_(2k+2) / B_2k) × (2k (2k - 1) / ((2k + 2) (2k + 1))).
  const series = bernoulliSeries(
    divideFixedByInteger(reciprocal, 12n), // B_2 / (2 y), B_2 being 1/6
    w,
    (k) => [BigInt(2 * k * (2 * k - 1)), BigInt((2 * k + 2) * (2 * k + 1))],
    working,
  );
  const result = subtractFixed(addFixed(stirling, series), lnProduct);
  return keepSignificant(result, bits);
}
