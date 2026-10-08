// The trigonometric functions on the kernel: `sinFixed`, `cosFixed` and
// `sinCosFixed`, the routines behind the built-ins `sin`, `cos` and `tan`
// (builtins/trig.ts), which share one reduction and one series, and
// `atanFixed`, behind the inverses (builtins/inverse-trig.ts), which reach
// `asin`, `acos` and `atan2` through it. devdocs/builtins.md ("The
// elementary routines") is the design.
//
// The argument is reduced by the nearest multiple of `pi/2`: `x = n pi/2 +
// r` with `|r|` at most `pi/4`, and the quadrant `n mod 4` says which of
// `±sin r` and `±cos r` each function is. `n` is `round(2x / pi)` on the
// integers, and pi comes from its memo (constants.ts; devdocs/numbers.md,
// "Memoized constants") at the bits asked for plus the bit length of the
// argument's integer part, so that
// `n pi/2` is exact to those bits however large the argument: pi's three
// ulps times `n/2` are under one ulp of the result, and the memo's margin
// of 256 bits serves every argument below `2^256` at the ceiling pass; a
// larger argument computes pi for the call and keeps nothing. The
// argument's own error rides through the subtraction, so `r` carries it
// and the series runs on `r` with that error included (devdocs/numbers.md,
// "The kernel's boundary"): no derivative bound is needed.
//
// `sin r` and `cos r` are the Taylor series in `v = -r^2`, `cos r = Σ v^k /
// (2k)!` and `sin r = r Σ v^k / (2k+1)!`, whose powers of `v` are shared
// (`factorialSeries`, which fixed-exp.ts takes in `v = x^2` for the
// hyperbolic functions of a small argument).
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
// (`keepSignificant`), so that `sin(1e-50)` keeps its digits and `sin`
// of a value near a multiple of pi is a ball around zero.
//
// An argument whose interval is wider than about a fifth of a radian after
// the reduction admits no series of shrinking terms (the bound on `|v|`
// would reach one), and both functions are then the trivial bound, zero
// within one, which contains them wherever the argument lies; the retry
// loop narrows such an argument.
//
// `atanFixed` inverts an argument above one, `atan(x) = ±pi/2 - atan(1/x)`
// with pi from the memo at the working bits, then halves the angle eight
// times, `atan(x) = 2 atan(x / (1 + sqrt(1 + x^2)))` (`sqrtFixed`, the
// argument's error carried through, as the logarithm's eight square roots
// do), which brings the argument below `2^-7`, and takes the series `z Σ
// (-z^2)^n / (2n+1)` as fixed-log.ts's `oddReciprocalSeries`, the
// logarithm's series in `-z^2`, which gains fourteen bits a term; the sum
// times `2^8` is an exact shift that scales the error with it, so the
// work is done at the bits plus eight plus a guard, and the result is cut
// to the bits its magnitude calls for, a tiny argument keeping its
// digits as the sine does. An argument whose interval is wider than one
// radian is the trivial bound, zero within two, for the same reason as
// above: its square would not stay positive under the error rules.

import { piFixed } from "./constants.ts";
import { oddReciprocalSeries } from "./fixed-log.ts";
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
  sqrtFixed,
  subtractFixed,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";
import { bitLength } from "./rational.ts";
import { divideRounded } from "./rounding.ts";

/** The bits the series work beyond the result, for their ulps. */
const TRIG_GUARD = 24;

/** The half-angle reductions of `atanFixed`, which bring the argument below `2^-7`. */
const ATAN_HALVINGS = 8;

/** The sine and cosine of one argument, computed together. */
export type SinCos = { readonly sin: Fixed; readonly cos: Fixed };

/**
 * `sin(f)` and `cos(f)` with `bits` significant bits kept for each one's
 * magnitude, and intervals containing the sine and the cosine of every
 * value in `f`'s; pi comes from its memo at `ceilingBits` plus the margin
 * (devdocs/numbers.md, "Memoized constants"). The two share the reduction
 * and the powers of the series, so both cost what one does.
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
  const { sin, cos } = series(r);
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
 * interval: the two series in `v = -r^2`.
 */
function series(r: Fixed): SinCos {
  const v = scaleFixed(multiplyFixed(r, r), -1n);
  const { even, odd } = factorialSeries(v);
  return { sin: multiplyFixed(r, odd), cos: even };
}

/** The two series in `v` over the factorials: `Σ v^k / (2k)!` (`even`) and `Σ v^k / (2k+1)!` (`odd`). */
export type FactorialSeries = { readonly even: Fixed; readonly odd: Fixed };

/**
 * `Σ v^k / (2k)!` and `Σ v^k / (2k+1)!` at `v`'s bits, for `|v|` below one
 * throughout its interval (a precondition), each summed by rectangular
 * splitting as the header says with one ulp for its tail, and the powers
 * of `v` computed once for both. With `v = -r^2` they are `cos r` and
 * `sin r / r`; with `v = x^2` they are `cosh x` and `sinh x / x`, which is
 * how fixed-exp.ts takes them for a small argument. The terms of either
 * shrink by better than half each, so the tail after the first omitted
 * term, which is under a quarter of an ulp, is under half an ulp whether
 * the terms alternate or not.
 */
export function factorialSeries(v: Fixed): FactorialSeries {
  const working = v.bits;
  const bound = abs(v.value) + v.error;
  if (bound >= 1n << BigInt(working)) {
    throw new RangeError("The factorial series take an argument below one");
  }
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
  return {
    even: splitSum(powers, blockSize, terms, 0),
    odd: splitSum(powers, blockSize, terms, 1),
  };
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

/**
 * `atan(f)` with `bits` significant bits kept for its magnitude, and an
 * interval containing the arctangent of every value in `f`'s, as the
 * header says; pi comes from its memo at `ceilingBits` plus the margin.
 */
export function atanFixed(f: Fixed, bits: number, ceilingBits: number): Fixed {
  checkBits(bits);
  const working = Math.max(bits, f.bits) + ATAN_HALVINGS + TRIG_GUARD;
  if (f.error << 1n >= 1n << BigInt(f.bits)) {
    return { value: 0n, error: 2n << BigInt(working), bits: working };
  }
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  let x = rebaseFixed(f, working);
  // Above one in magnitude the interval excludes zero, its width being
  // below one, so the reciprocal is defined.
  const inverted = abs(x.value) > one.value;
  if (inverted) x = divideFixed(one, x);
  for (let i = 0; i < ATAN_HALVINGS; i++) {
    const root = sqrtFixed(addFixed(one, multiplyFixed(x, x)));
    x = divideFixed(x, addFixed(one, root));
  }
  const w = negate(multiplyFixed(x, x));
  if (abs(w.value) + w.error >= one.value >> 8n) {
    return { value: 0n, error: 2n << BigInt(working), bits: working };
  }
  let result = shiftFixed(
    multiplyFixed(x, oddReciprocalSeries(w)),
    ATAN_HALVINGS,
  );
  if (inverted) {
    const halfPi = shiftFixed(piFixed(working - 1, ceilingBits), -1);
    result = subtractFixed(f.value < 0n ? negate(halfPi) : halfPi, result);
  }
  return keepSignificant(result, bits);
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
