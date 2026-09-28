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
