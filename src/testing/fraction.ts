// Test support: the decimal representation over the fraction, for the
// tests written while the midpoint was a `Rational`. Stage 4's 4.3 moved
// `parseDecimal`, `roundTo` and `format` onto `Scaled` (src/core/scaled.ts),
// and the tests that reason on fractions read a literal as the fraction it
// denotes, and round and format a fraction, through these, which convert
// at the boundary as the app did until 4.4 made the midpoint a `Scaled`
// (src/testing/scaled.ts is the support on that side); nothing in the app
// imports this directory.

import { LIMIT_BITS, type Rational } from "../core/rational.ts";
import type { Result } from "../core/result.ts";
import type { Precision, RoundingMode } from "../core/rounding.ts";
import {
  format,
  fromRational,
  parseDecimal,
  roundTo,
  toRational,
  type ScaledError,
} from "../core/scaled.ts";

/**
 * Whether `r` keeps the invariant of `Rational`: a positive denominator,
 * no common factor, and zero as `0/1`. The gcd is a plain Euclid written
 * here, independent of rational.ts's, so that a broken gcd cannot vouch
 * for itself: the arithmetic there reduces with the smaller gcds its
 * operands allow, which is correct only for operands in lowest terms, so
 * every constructor that feeds it is held to this (the plan's H.9).
 */
export function inLowestTerms(r: Rational): boolean {
  if (r.den <= 0n) return false;
  if (r.num === 0n) return r.den === 1n;
  let a = r.num < 0n ? -r.num : r.num;
  let b = r.den;
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 1n;
}

/** The exact fraction the literal `text` denotes, through `parseDecimal` and `toRational` at the hard bound. */
export function parseFraction(text: string): Result<Rational, ScaledError> {
  const parsed = parseDecimal(text);
  return parsed.ok ? toRational(parsed.value, LIMIT_BITS) : parsed;
}

/** `r` rounded to `digits` significant digits in `mode`, as a fraction. */
export function roundFraction(
  r: Rational,
  digits: Precision,
  mode: RoundingMode,
): Rational {
  const back = toRational(roundTo(fromRational(r), digits, mode), LIMIT_BITS);
  if (!back.ok) throw new Error("A rounded fraction fits the hard bound");
  return back.value;
}

/** `r` formatted at `digits` significant digits in `mode`. */
export function formatFraction(
  r: Rational,
  digits: Precision,
  mode: RoundingMode,
): string {
  return format(fromRational(r), digits, mode);
}
