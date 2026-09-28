// The trigonometric functions on the kernel: `sinFixed`, `cosFixed` and
// `sinCosFixed`, the routines behind the built-ins `sin`, `cos` and `tan`
// (builtins/trig.ts), which share one reduction and one series.
// docs/calculator-plan.md (D9, D10 and task 3.9) is the design.
//
// The argument is reduced by the nearest multiple of `pi/2`: `x = n pi/2 +
// r` with `|r|` at most `pi/4`, and the quadrant `n mod 4` says which of
// `±sin r` and `±cos r` each function is. `n` is `round(2x / pi)` on the
// integers, and pi comes from its memo (constants.ts, D10) at the bits
// asked for plus the bit length of the argument's integer part, so that
// `n pi/2` is exact to those bits however large the argument: pi's three
// ulps times `n/2` are under one ulp of the result, and the memo's margin
// of 64 bits serves every argument below `2^64` at the ceiling pass; a
// larger argument computes pi for the call and keeps nothing. The
// argument's own error rides through the subtraction, so `r` carries it
// and the series runs on `r` with that error included (D9): no derivative
// bound is needed.
//
// `sin r` and `cos r` are the Taylor series in `v = -r^2`, `cos r = Σ v^k /
// (2k)!` and `sin r = r Σ v^k / (2k+1)!`, whose powers of `v` are shared.
// Each is summed by the rectangular splitting of fixed-log.ts's logarithm:
// the `N` terms that leave the first omitted term under a quarter of an
// ulp (found from a bound on `|v|`, below one since `|r| < 1`) are taken in
// blocks of about `sqrt(N)`, the powers of `v` within a block are computed
// once and each block's sum is those powers divided by the products of
// consecutive integers the factorials leave, which is linear work, and the
// blocks are combined by Horner in `v^B` with a division by the quotient
// of two factorials at each step, so the full multiplications number about
// `3 sqrt(N)` for both series together rather than `2N`. The terms
// alternate and shrink by better than half each, so the tail after the
// first omitted term is below it, and one ulp covers it. The series work
// at the larger of the bits asked for and the argument's bits, plus a
// guard, so that a tiny argument, which a caller converts at as many more
// fraction bits as its magnitude is below one, keeps its digits; the
// results are cut to the bits their magnitudes call for
// (`keepSignificant`, D9), so that `sin(1e-50)` keeps its digits and `sin`
// of a value near a multiple of pi is a ball around zero.
//
// An argument whose interval is wider than about a fifth of a radian after
// the reduction admits no series of shrinking terms (the bound on `|v|`
// would reach one), and both functions are then the trivial bound, zero
// within one, which contains them wherever the argument lies; the retry
// loop narrows such an argument.

import { piFixed } from "./constants.ts";
import {
  addFixed,
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
import { bitLength } from "./rational.ts";
import { divideRounded } from "./rounding.ts";

/** The bits the series work beyond the result, for their ulps. */
const TRIG_GUARD = 24;

/** The sine and cosine of one argument, computed together. */
export type SinCos = { readonly sin: Fixed; readonly cos: Fixed };

/**
 * `sin(f)` and `cos(f)` with `bits` significant bits kept for each one's
 * magnitude, and intervals containing the sine and the cosine of every
 * value in `f`'s; pi comes from its memo at `ceilingBits` plus the margin
 * (D10). The two share the reduction and the powers of the series, so
 * both cost what one does.
 */
export function sinCosFixed(
  f: Fixed,
  bits: number,
  ceilingBits: number,
): SinCos {
  checkBits(bits);
  const working = Math.max(bits, f.bits) + TRIG_GUARD;
  const { r, quadrant } = reduce(f, bits, working, ceilingBits);
  const one = 1n << BigInt(working);
  if (abs(r.value) + r.error >= one) {
    const wide: Fixed = { value: 0n, error: one, bits: working };
    return { sin: wide, cos: wide };
  }
  const { sin, cos } = series(r, working);
  const [s, c] =
    quadrant === 0
      ? [sin, cos]
      : quadrant === 1
        ? [cos, negate(sin)]
        : quadrant === 2
          ? [negate(sin), negate(cos)]
          : [negate(cos), sin];
  return { sin: keepSignificant(s, bits), cos: keepSignificant(c, bits) };
}

/** `sin(f)` with `bits` significant bits kept for its magnitude, as `sinCosFixed` gives it. */
export function sinFixed(f: Fixed, bits: number, ceilingBits: number): Fixed {
  return sinCosFixed(f, bits, ceilingBits).sin;
}

/** `cos(f)` with `bits` significant bits kept for its magnitude, as `sinCosFixed` gives it. */
export function cosFixed(f: Fixed, bits: number, ceilingBits: number): Fixed {
  return sinCosFixed(f, bits, ceilingBits).cos;
}

/**
 * `f` less the nearest multiple `n` of `pi/2`, at `working` fraction bits,
 * with the quadrant `n mod 4`: pi at `bits` plus the bit length of the
 * argument's integer part, as the header says. An argument below one half
 * needs no reduction, `n` being zero there.
 */
function reduce(
  f: Fixed,
  bits: number,
  working: number,
  ceilingBits: number,
): { r: Fixed; quadrant: number } {
  if (f.value === 0n || exponentOf(f) < -1) {
    return { r: at(f, working), quadrant: 0 };
  }
  const piBits = bits + Math.max(0, exponentOf(f) + 1);
  const pi = piFixed(piBits, ceilingBits);
  // n = round(2x / pi), with x = value × 2^-f.bits and pi = pi.value × 2^-piBits.
  const n =
    piBits >= f.bits
      ? divideRounded(
          f.value << BigInt(piBits - f.bits + 1),
          pi.value,
          "halfEven",
        )
      : divideRounded(
          f.value << 1n,
          pi.value << BigInt(f.bits - piBits),
          "halfEven",
        );
  if (n === 0n) return { r: at(f, working), quadrant: 0 };
  const r = subtractFixed(f, shiftFixed(scaleFixed(pi, n), -1));
  return { r: at(r, working), quadrant: Number(((n % 4n) + 4n) % 4n) };
}

/**
 * `sin r` and `cos r` at `r`'s bits for `|r|` below one throughout its
 * interval, by the two series in `v = -r^2` summed by rectangular
 * splitting as the header says, each with one ulp for its tail.
 */
function series(r: Fixed, working: number): SinCos {
  const v = scaleFixed(multiplyFixed(r, r), -1n);
  const bound = abs(v.value) + v.error;
  // The terms with the first omitted, v^N / (2N)!, under a quarter of an
  // ulp: `log2v` bounds log2 |v| from above, and the loop follows the
  // terms' magnitudes down.
  let terms = 1;
  if (bound !== 0n) {
    const log2v = bitLength(bound) - working;
    terms = 0;
    for (let log2 = 0; log2 > -(working + 2); terms++) {
      log2 += log2v - Math.log2(2 * terms + 1) - Math.log2(2 * terms + 2);
    }
  }
  const blockSize = Math.max(1, Math.round(Math.sqrt(terms)));
  const powers: Fixed[] = [
    { value: 1n << BigInt(working), error: 0n, bits: working },
  ];
  for (let i = 1; i <= blockSize; i++) {
    powers.push(multiplyFixed(powers[i - 1]!, v));
  }
  const cos = splitSum(powers, blockSize, terms, 0);
  const sinOverR = splitSum(powers, blockSize, terms, 1);
  return { sin: multiplyFixed(r, sinOverR), cos };
}

/**
 * `Σ_{k < terms} v^k / (2k + offset)!` over the `powers` of `v` up to the
 * block size `B`, by rectangular splitting: with `k = jB + i`, the term is
 * `v^{jB} / (2jB + offset)!` times `v^i` over `D_i`, the product of the
 * `2i` integers after `2jB + offset`, so a block's sum is `Σ v^i D_last /
 * D_i` over the last such product, the scalings exact and one division
 * per block (a division per term cost more than all the rest), and the
 * blocks combine by Horner in `v^B`, each step dividing by the `2B`
 * integers after `2jB + offset`. One ulp is added for the tail.
 */
function splitSum(
  powers: readonly Fixed[],
  blockSize: number,
  terms: number,
  offset: number,
): Fixed {
  const { bits } = powers[0]!;
  const blocks = Math.ceil(terms / blockSize);
  let sum: Fixed = { value: 0n, error: 0n, bits };
  for (let j = blocks - 1; j >= 0; j--) {
    const first = 2 * j * blockSize + offset;
    const count = Math.min(blockSize, terms - j * blockSize);
    const divisors: bigint[] = [1n];
    for (let i = 1; i < count; i++) {
      divisors.push(
        divisors[i - 1]! * BigInt(first + 2 * i - 1) * BigInt(first + 2 * i),
      );
    }
    const last = divisors[count - 1]!;
    let scaled: Fixed = { value: 0n, error: 0n, bits };
    for (let i = 0; i < count; i++) {
      scaled = addFixed(scaled, scaleFixed(powers[i]!, last / divisors[i]!));
    }
    const block = divideFixedByInteger(scaled, last);
    if (j === blocks - 1) {
      sum = block;
      continue;
    }
    let quotient = 1n;
    for (let m = 1; m <= 2 * blockSize; m++) quotient *= BigInt(first + m);
    sum = addFixed(
      block,
      divideFixedByInteger(multiplyFixed(powers[blockSize]!, sum), quotient),
    );
  }
  return { ...sum, error: sum.error + 1n };
}

/** `f` at `bits` fraction bits, truncated or rebased. */
function at(f: Fixed, bits: number): Fixed {
  return f.bits > bits ? truncateFixed(f, bits) : rebaseFixed(f, bits);
}

function negate(f: Fixed): Fixed {
  return scaleFixed(f, -1n);
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function checkBits(bits: number): void {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(
      `Fraction bits must be a non-negative integer: ${bits}`,
    );
  }
}
