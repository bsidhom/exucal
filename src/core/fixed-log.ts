// The logarithm on the kernel: `lnFixed`, the routine behind the built-ins
// `ln`, `log10`, `log2` and `log` (builtins/log.ts) and the log-space route
// of a power (ball.ts), with the constants it needs, `ln(2)` and `ln(10)`,
// memoized as constants.ts memoizes `pi` and `e` (devdocs/numbers.md,
// "Memoized constants"). devdocs/builtins.md ("The elementary routines")
// is the design.
//
// The argument is written `m × 2^k` with `m` in `[1, 2)`, exactly, so that
// `ln(x) = k ln(2) + ln(m)`; `m` is brought within `2^-8` of one by eight
// square roots (`sqrtFixed`, each within an ulp or two, the argument's
// error carried through), and `ln` of the result `r` is `2 atanh(z)` for
// `z = (r - 1) / (r + 1)`, below `2^-9`, so that the series `z Σ w^n /
// (2n+1)` in `w = z^2` gains eighteen bits a term. The series is summed in
// fixed point with the error rules by rectangular splitting: the `N` terms
// that leave the tail under a quarter of an ulp are taken in blocks of
// about `sqrt(N)`, the powers of `w` within a block are computed once and
// each block's sum is those powers divided by their odd numbers, which is
// linear work, and the blocks are combined by Horner in `w^B`, so that the
// full multiplications number about `2 sqrt(N)` rather than `N` (V8
// multiplies at these sizes by the schoolbook rule, sixty microseconds at
// the default ceiling, and the term-by-term sum cost four times the rest
// of the routine; the series is exported for `atan`, whose series it is in
// `-z^2`). `ln(m)` is the sum times `2^9`, an exact shift that
// scales the error with it, and `k ln(2)` is added from the memo, so the
// work is done at the bits plus nine plus the bit length of `k` plus a
// guard, and the result is cut to the bits its magnitude calls for
// (`keepSignificant`; devdocs/numbers.md, "The kernel's boundary"). A
// caller whose value is of any magnitude scales it to order one by a
// power of two before converting, and passes the
// power as `scale`, so that `ln(1e-300)` loses nothing to the conversion.
//
// `ln(2)` is `2 atanh(1/3)` and `ln(10)` is `3 ln(2) + 2 atanh(1/9)`, since
// `(10/8 - 1) / (10/8 + 1)` is `1/9`; each `atanh(1/q)` is the series `Σ 1
// / ((2n+1) q^(2n+1))` by binary splitting, the recursion of constants.ts
// over the products of the odd numbers and the powers of `q`, with the
// tail below the first omitted term times `9/8`, so that `N = ceil((bits +
// 2) / (2 log2 q)) + 1` terms leave it under a quarter of an ulp and the
// error is two ulps with the final truncation; the constants are combined
// at four more bits and truncated, two ulps each.

import { memoAtCeiling } from "./constants.ts";
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

/** The square roots that bring the significand within `2^-8` of one. */
const SQUARE_ROOTS = 8;

/** The bits the logarithm works beyond the result and the shift, for the series' ulps. */
const LN_GUARD = 24;

/**
 * `ln(f × 2^scale)` with `bits` significant bits kept for its magnitude,
 * and an interval containing the logarithm of every value in `f`'s, whose
 * interval must be positive (a precondition; the caller decides what a
 * ball around zero means). `ln(2)` comes from its memo at `ceilingBits`
 * plus the margin (devdocs/numbers.md, "Memoized constants").
 */
export function lnFixed(
  f: Fixed,
  bits: number,
  ceilingBits: number,
  scale = 0,
): Fixed {
  if (f.value - f.error <= 0n) {
    throw new RangeError(
      "The logarithm takes an argument whose interval is positive",
    );
  }
  const exponent = exponentOf(f);
  const k = exponent + scale;
  const working =
    bits + SQUARE_ROOTS + 1 + bitLength(BigInt(Math.abs(k))) + LN_GUARD;
  const m = shiftFixed(f, -exponent);
  let r =
    m.bits > working ? truncateFixed(m, working) : rebaseFixed(m, working);
  for (let i = 0; i < SQUARE_ROOTS; i++) r = sqrtFixed(r);
  const one: Fixed = { value: 1n << BigInt(working), error: 0n, bits: working };
  const z = divideFixed(subtractFixed(r, one), addFixed(r, one));
  const atanh = multiplyFixed(z, oddReciprocalSeries(multiplyFixed(z, z)));
  const lnM = shiftFixed(atanh, SQUARE_ROOTS + 1);
  const result = addFixed(
    lnM,
    scaleFixed(ln2Fixed(working, ceilingBits), BigInt(k)),
  );
  return keepSignificant(result, bits);
}

/**
 * `Σ w^n / (2n+1)` over every `n` from zero, for `|w|` below one half
 * throughout its interval, with an interval containing the sum for every
 * `w` in it: the `N` terms with `w^N` under a quarter of an ulp, which the
 * bits below the leading one of `|w|`'s bound give, summed by rectangular
 * splitting as the header says, and one ulp for the tail, which is below
 * `|w|^N / (1 - |w|)`. With `w = z^2` it is `atanh(z) / z`, and with `w =
 * -z^2` it is `atan(z) / z`, which is how fixed-trig.ts's `atanFixed`
 * takes it.
 */
export function oddReciprocalSeries(w: Fixed): Fixed {
  const bound = abs(w.value) + w.error;
  const leading = Math.max(1, w.bits - bitLength(bound));
  const terms = bound === 0n ? 1 : Math.ceil((w.bits + 2) / leading) + 1;
  const blockSize = Math.max(1, Math.round(Math.sqrt(terms)));
  const blocks = Math.ceil(terms / blockSize);
  const powers: Fixed[] = [
    { value: 1n << BigInt(w.bits), error: 0n, bits: w.bits },
  ];
  for (let i = 1; i <= blockSize; i++) {
    powers.push(multiplyFixed(powers[i - 1]!, w));
  }
  let sum: Fixed = { value: 0n, error: 0n, bits: w.bits };
  for (let j = blocks - 1; j >= 0; j--) {
    let block: Fixed = { value: 0n, error: 0n, bits: w.bits };
    for (let i = 0; i < blockSize && j * blockSize + i < terms; i++) {
      block = addFixed(
        block,
        divideFixedByInteger(powers[i]!, BigInt(2 * (j * blockSize + i) + 1)),
      );
    }
    sum = addFixed(block, multiplyFixed(powers[blockSize]!, sum));
  }
  return { ...sum, error: sum.error + 1n };
}

/**
 * `atanh(1/q)` at `bits` fraction bits for an integer `q` of at least
 * three, by binary splitting, within two ulps as the header derives.
 */
function atanhOfInverse(q: bigint, bits: number): Fixed {
  const terms = Math.ceil((bits + 2) / (2 * Math.log2(Number(q)))) + 1;
  const { t, b, p } = splitAtanh(q, 0n, BigInt(terms));
  return { value: ((t * q) << BigInt(bits)) / (b * p), error: 2n, bits };
}

/**
 * The binary splitting of the terms `a` to `b - 1` of `atanh(1/q)` with
 * the power of `q` of the first term taken out: `b` the product of the
 * odd numbers `2n + 1`, `p` the product of the `q^2` of each term, and `t`
 * the numerator of the partial sum, so that the sum of `1 / ((2n+1)
 * q^(2(n-a)))` is `t q^2 / (b p)`.
 */
function splitAtanh(
  q: bigint,
  from: bigint,
  to: bigint,
): { t: bigint; b: bigint; p: bigint } {
  if (to - from === 1n) return { t: 1n, b: 2n * from + 1n, p: q * q };
  const m = (from + to) >> 1n;
  const left = splitAtanh(q, from, m);
  const right = splitAtanh(q, m, to);
  return {
    t: left.t * right.b * right.p + right.t * left.b,
    b: left.b * right.b,
    p: left.p * right.p,
  };
}

/** `ln(2)` at `bits` fraction bits, uncached, within two ulps: `2 atanh(1/3)`. The benchmark times this; callers take `ln2Fixed`. */
export function ln2Series(bits: number): Fixed {
  checkBits(bits);
  return shiftFixed(atanhOfInverse(3n, bits + 1), 1);
}

/** `ln(10)` at `bits` fraction bits, uncached, within two ulps: `6 atanh(1/3) + 2 atanh(1/9)`. */
export function ln10Series(bits: number): Fixed {
  checkBits(bits);
  const at = bits + 4;
  const sum = addFixed(
    scaleFixed(atanhOfInverse(3n, at), 6n),
    scaleFixed(atanhOfInverse(9n, at), 2n),
  );
  return truncateFixed(sum, bits);
}

function checkBits(bits: number): void {
  if (!Number.isInteger(bits) || bits < 0) {
    throw new RangeError(
      `Fraction bits must be a non-negative integer: ${bits}`,
    );
  }
}

const ln2Memo = memoAtCeiling(ln2Series);
const ln10Memo = memoAtCeiling(ln10Series);

/** `ln(2)` at `bits` fraction bits, from the memo at `ceilingBits` plus the margin (devdocs/numbers.md, "Memoized constants"). */
export function ln2Fixed(bits: number, ceilingBits: number): Fixed {
  return ln2Memo.at(bits, ceilingBits);
}

/** `ln(10)` at `bits` fraction bits, from the memo at `ceilingBits` plus the margin (devdocs/numbers.md, "Memoized constants"). */
export function ln10Fixed(bits: number, ceilingBits: number): Fixed {
  return ln10Memo.at(bits, ceilingBits);
}

/** The fraction bits of the value the memo of `ln(2)` holds, or `undefined` before the first request; for the tests. */
export function ln2MemoBits(): number | undefined {
  return ln2Memo.bits();
}

/** The fraction bits of the value the memo of `ln(10)` holds, or `undefined` before the first request; for the tests. */
export function ln10MemoBits(): number | undefined {
  return ln10Memo.bits();
}

function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}
