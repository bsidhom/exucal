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
// The Bernoulli numbers enter as the ratios of consecutive ones, in fixed
// point from their memo (bernoulli-ratios.ts), reserved for the count the
// series predicts it will take before it sums (`termsNeeded`), so that a
// pass that needs more of them than the last computes its run once; the
// logarithms come from fixed-log.ts. The shift costs `n` divisions
// (`digamma`) or multiplications (`lgamma`) at the working bits and the
// series about `bits / 9` terms, each the last times the ratio and `1 /
// y^2`, both cut to the bits the shrinking term still needs, so a term
// costs two multiplications of its own size; a third of the bits balances
// the two, since the Bernoulli numbers the series then needs, about
// `B_(2 bits / 9)`, cost a few seconds once at the default ceiling, where
// a shorter shift would need many more of them.
//
// An exact argument `p / q` whose denominator is short takes the shift
// exactly (`lgammaRational`, `digammaRational`, #117): the product `Π (p +
// i q)` and the sum `Σ 1 / (p + i q)` over the shift's `n` factors by
// binary splitting, one integer and one fraction, then one logarithm of
// the product less `n ln q` taken at bits enough for the scaling, or one
// division of the fraction, at the working bits; that costs milliseconds
// for tens of thousands of factors where the loop above costs a full
// multiplication or division each, so the exact shift goes to four times
// the working bits (`exactShiftTarget`), where the series takes about half
// the terms and the Bernoulli run a quarter of its cost, the product held
// to a couple of megabits by a shorter shift for a wider denominator. A
// denominator beyond `EXACT_DENOMINATOR_BITS`, or an inexact argument,
// takes the loop at a third of the bits, where the shift's cost is the
// same whatever the argument.
//
// The argument's error rides through every operation (D9): the shift's
// reciprocals or factors, the logarithms, and the powers of `1 / y^2`.
// Each result is cut to the bits its magnitude calls for
// (`keepSignificant`). A negative or a huge argument, and one near a
// pole, are the built-in's to turn into a positive one of moderate size
// before calling in; an argument whose interval is not positive is a
// precondition failure.

import {
  RATIO_GUARD,
  STIRLING_FACTOR,
  log2Above,
  ratioSource,
  termLog2s,
  type IndexFactor,
} from "./bernoulli-ratios.ts";
import { MEMO_MARGIN, piFixed } from "./constants.ts";
import { ln2Fixed, lnFixed } from "./fixed-log.ts";
import {
  addFixed,
  divideFixed,
  divideFixedByInteger,
  exponentOf,
  fixedFromRational,
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

/** The ratios a series reserves beyond its predicted count of terms, for the prediction's slack of a term or two. */
const RESERVE_SLACK = 4;

/** The shift target for `bits` working bits: about a third of them, and at least two. */
export function shiftTarget(bits: number): number {
  return Math.max(2, Math.ceil(bits * SHIFT_FRACTION));
}

/** How far the exact shift goes at most, as a multiple of the working bits: four, where the series at the default ceiling takes 725 terms against 1,419 at a third, and the product is tens of milliseconds. */
const EXACT_SHIFT_MULTIPLE = 4;

/** The bits the exact shift's product may reach, which shortens the shift for a wide denominator: two megabits is tens of milliseconds to form and to take the logarithm of. */
const EXACT_PRODUCT_BITS = 1 << 21;

/** The most bits a denominator may have for the exact shift: past it the product's factors are wide and the loop is no slower. */
export const EXACT_DENOMINATOR_BITS = 64;

/**
 * The exact shift's target for `bits` working bits and a denominator
 * `q`: the multiple of the bits, shortened so that the product of the
 * shift's factors, each of about the denominator's bits plus the
 * count's, stays within `EXACT_PRODUCT_BITS`, and never below the loop's
 * target.
 */
export function exactShiftTarget(bits: number, q: bigint): number {
  const most = EXACT_SHIFT_MULTIPLE * bits;
  const factorBits = bitLength(q) + bitLength(BigInt(most));
  return Math.max(
    shiftTarget(bits),
    Math.min(most, Math.floor(EXACT_PRODUCT_BITS / factorBits)),
  );
}

/** `f` at exactly `bits` fraction bits, truncated or rebased. */
function at(f: Fixed, bits: number): Fixed {
  return f.bits > bits ? truncateFixed(f, bits) : rebaseFixed(f, bits);
}

/**
 * The exact shift's parameters for `p / q` at `bits`: the working bits,
 * the count of steps `n` to the target, and `y = p / q + n` at the
 * working bits, rounded to nearest; an argument that is not positive is
 * a precondition failure.
 */
function exactShiftOf(
  p: bigint,
  q: bigint,
  bits: number,
): { working: number; n: number; y: Fixed } {
  if (p <= 0n || q <= 0n) {
    throw new RangeError("The Gamma family takes a positive argument");
  }
  const target = exactShiftTarget(bits, q);
  const working = bits + bitLength(BigInt(target)) + GAMMA_GUARD;
  // An argument past the target shifts nothing, however large.
  const below = Number(p / q);
  const n = below >= target ? 0 : target - below;
  const y = fixedFromRational({ num: p + BigInt(n) * q, den: q }, working);
  return { working, n, y };
}

/** `Π_{i=a}^{b-1} (p + i q)`, by binary splitting. */
function risingProduct(p: bigint, q: bigint, a: bigint, b: bigint): bigint {
  if (b - a <= 16n) {
    let product = 1n;
    for (let i = a; i < b; i++) product *= p + i * q;
    return product;
  }
  const m = (a + b) >> 1n;
  return risingProduct(p, q, a, m) * risingProduct(p, q, m, b);
}

/** `Σ_{i=a}^{b-1} 1 / (p + i q)` as `num / den`, by binary splitting. */
function reciprocalSum(
  p: bigint,
  q: bigint,
  a: bigint,
  b: bigint,
): { num: bigint; den: bigint } {
  if (b - a <= 16n) {
    let num = 0n;
    let den = 1n;
    for (let i = a; i < b; i++) {
      const factor = p + i * q;
      num = num * factor + den;
      den *= factor;
    }
    return { num, den };
  }
  const m = (a + b) >> 1n;
  const left = reciprocalSum(p, q, a, m);
  const right = reciprocalSum(p, q, m, b);
  return {
    num: left.num * right.den + right.num * left.den,
    den: left.den * right.den,
  };
}

/**
 * `ln m` for a positive integer `m` with `bits` significant bits kept: the
 * top `bits` of `m` as a significand in `[1, 2)`, within an ulp when it
 * drops any, and the rest as the logarithm's scale.
 */
function lnOfInteger(m: bigint, bits: number, ceilingBits: number): Fixed {
  const e = bitLength(m) - 1 - bits;
  const value = e >= 0 ? m >> BigInt(e) : m << BigInt(-e);
  const dropped = e > 0 && (m & ((1n << BigInt(e)) - 1n)) !== 0n;
  const significand: Fixed = { value, error: dropped ? 1n : 0n, bits };
  return lnFixed(significand, bits, ceilingBits, bitLength(m) - 1);
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
 * The ratios the sum will take are reserved before it starts
 * (`termsNeeded`, `ratioSource`), so that their memo is computed once
 * for the pass. Each term comes from the last, so that a term's error
 * stays a few ulps however small the term is; a power of `w` held on its
 * own in fixed point loses its relative precision as it shrinks, and the
 * ratio it is multiplied by would turn that into an error bound that
 * never falls below an ulp. The exact scaling by the factor's numerator
 * comes first, then the ratio, the factor's denominator and `w`, so that
 * the ratio's rounding is scaled down by `w` and never a truncation's
 * ulp scaled up by the ratio, which grows like `k^2` and would make the
 * error bound grow where the term shrinks. The ratio and `w` are cut to
 * the bits the term still needs, its own and the numerator's plus
 * `RATIO_GUARD` (the ratio holds no more, by its memo's schedule), so
 * that a term of `2^-m` of the sum costs two multiplications of `working
 * - m` bits; the cut's ulp is under `2^-RATIO_GUARD` of an ulp of the
 * product, and the error accounting carries it whatever the cut.
 */
function bernoulliSeries(
  first: Fixed,
  w: Fixed,
  factor: IndexFactor,
  working: number,
): Fixed {
  const count = termsNeeded(first, w, factor, working) + RESERVE_SLACK;
  const ratio = ratioSource(count, working);
  let term = first;
  let series: Fixed = { value: 0n, error: 0n, bits: working };
  for (let k = 1; ; k++) {
    const magnitude = abs(term.value) + term.error;
    if (magnitude <= TERM_FLOOR) {
      return { ...series, error: series.error + magnitude };
    }
    if (k > 4 * working) {
      throw new Error("The asymptotic series did not converge");
    }
    series = k % 2 === 1 ? addFixed(series, term) : subtractFixed(series, term);
    const [num, den] = factor(k);
    const rho = ratio(k);
    const bits = Math.min(
      rho.bits,
      working,
      bitLength(magnitude) + bitLength(num) + RATIO_GUARD,
    );
    const product = multiplyFixed(
      scaleFixed(term, num),
      bits < rho.bits ? truncateFixed(rho, bits) : rho,
    );
    term = multiplyFixed(
      divideFixedByInteger(product, den),
      bits < w.bits ? truncateFixed(w, bits) : w,
    );
  }
}

/**
 * A count at or above the terms `bernoulliSeries` takes for `first`, `w`
 * and `factor` at `working` bits, so that the ratios it needs can be
 * reserved before the sum and their memo computed once for the pass
 * rather than grown term by term, which recomputed the run at every
 * quarter and had a cold ceiling pass compute it five times over (#117).
 * The loop ends at the first term within `TERM_FLOOR` ulps, and this
 * follows the terms' magnitudes in floating point from the bounds above
 * them `termLog2s` gives, under one bit over the terms; the count is the
 * index where the bound falls to two ulps, where the computed term,
 * within its few ulps of error of the true one, is at the floor.
 * Measured against the loop from 40 to 16,000 bits and arguments from
 * the shift target to a thousand times it, the count is the loop's or
 * one more. A count that fell short would cost the memo's own growth,
 * never correctness.
 */
function termsNeeded(
  first: Fixed,
  w: Fixed,
  factor: IndexFactor,
  working: number,
): number {
  const log2First = log2Above(abs(first.value) + first.error) - first.bits;
  const log2W = log2Above(abs(w.value) + w.error) - w.bits;
  let k = 0;
  for (const log2 of termLog2s(log2First, log2W, factor)) {
    k++;
    // The term in ulps at the working bits, within two.
    if (log2 + working <= 1 || k > 4 * working) return k;
  }
  throw new Error("The terms of a series are unbounded");
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
  const result = subtractFixed(asymptoticDigamma(y, working, ceilingBits), sum);
  return keepSignificant(result, bits);
}

/**
 * `ψ(p / q)` for an exact positive argument, with `bits` significant bits
 * kept for its magnitude, within its error: the shift's sum `Σ 1 / (p / q
 * + i)` taken exactly as `q Σ 1 / (p + i q)` by binary splitting and
 * divided once, within an ulp, and the series at the exact shift's
 * target, as the header says.
 */
export function digammaRational(
  p: bigint,
  q: bigint,
  bits: number,
  ceilingBits: number,
): Fixed {
  const { working, n, y } = exactShiftOf(p, q, bits);
  let sum: Fixed = { value: 0n, error: 0n, bits: working };
  if (n > 0) {
    const { num, den } = reciprocalSum(p, q, 0n, BigInt(n));
    sum = {
      value: ((q * num) << BigInt(working)) / den,
      error: 1n,
      bits: working,
    };
  }
  const result = subtractFixed(asymptoticDigamma(y, working, ceilingBits), sum);
  return keepSignificant(result, bits);
}

/**
 * `ψ(y)` by the asymptotic series at `y`, at or above a shift target, at
 * the `working` bits: `ln y - 1 / (2y) - Σ B_2k / (2k y^2k)`.
 */
function asymptoticDigamma(
  y: Fixed,
  working: number,
  ceilingBits: number,
): Fixed {
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
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
  return subtractFixed(subtractFixed(ln, half), series);
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
 * The shift's product `x (x + 1) … (x + n - 1)` is kept as a significand at
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
    let significand = one;
    let exponent = 0;
    for (let j = 1; j < n; j++) {
      const product = multiplyFixed(significand, y);
      const e = exponentOf(product);
      significand = at(shiftFixed(product, -e), working);
      exponent += e;
      y = addFixed(y, one);
    }
    if (n > 1) {
      lnProduct = addFixed(
        lnProduct,
        at(lnFixed(significand, working, ceilingBits, exponent), working),
      );
    }
  }
  const result = subtractFixed(
    stirlingLogGamma(y, working, ceilingBits),
    lnProduct,
  );
  return keepSignificant(result, bits);
}

/**
 * `ln Γ(p / q)` for an exact positive argument, with `bits` significant
 * bits kept for its magnitude, within its error: the shift's product
 * `Π (p / q + i)` taken exactly as `Π (p + i q)` by binary splitting,
 * with one logarithm of it less `n ln q`, the latter taken at bits enough
 * that scaling its error by `n` leaves it under an ulp, and Stirling's
 * series at the exact shift's target, as the header says.
 */
export function lgammaRational(
  p: bigint,
  q: bigint,
  bits: number,
  ceilingBits: number,
): Fixed {
  const { working, n, y } = exactShiftOf(p, q, bits);
  let lnProduct: Fixed = { value: 0n, error: 0n, bits: working };
  if (n > 0) {
    const product = risingProduct(p, q, 0n, BigInt(n));
    lnProduct = at(lnOfInteger(product, working, ceilingBits), working);
    if (q !== 1n) {
      const extra = working + bitLength(BigInt(n)) + GAMMA_GUARD;
      const lnQ = scaleFixed(lnOfInteger(q, extra, ceilingBits), BigInt(n));
      lnProduct = subtractFixed(lnProduct, at(lnQ, working));
    }
  }
  const result = subtractFixed(
    stirlingLogGamma(y, working, ceilingBits),
    lnProduct,
  );
  return keepSignificant(result, bits);
}

/**
 * `ln Γ(y)` by Stirling's series at `y`, at or above a shift target, at
 * the `working` bits: `(y - 1/2) ln y - y + ln(2π) / 2 + Σ B_2k / (2k (2k
 * - 1) y^(2k - 1))`.
 */
function stirlingLogGamma(
  y: Fixed,
  working: number,
  ceilingBits: number,
): Fixed {
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
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
    STIRLING_FACTOR,
    working,
  );
  return addFixed(stirling, series);
}
