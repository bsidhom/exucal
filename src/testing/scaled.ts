// Test support: the `Scaled` midpoint at the boundaries a test reasons
// across. Stage 4's 4.4 made the midpoint a `Scaled` (src/core/scaled.ts),
// and the tests that check a ball against exact arithmetic form a literal
// as a `Scaled`, take a midpoint of moderate exponent back to the fraction
// it denotes and compare there, and build a ball from a midpoint and a
// radius written as decimals; nothing in the app imports this directory.

import assert from "node:assert/strict";
import { inspect } from "node:util";
import { exact, type Ball } from "../core/ball.ts";
import { radiusAbove, radiusAboveScaled } from "../core/radius.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  rational,
  type Rational,
} from "../core/rational.ts";
import {
  fromRational,
  parseDecimal,
  toRational,
  type Scaled,
} from "../core/scaled.ts";

/** The decimal literal `text` as a `Scaled`; a test's precondition that it parses. */
export function dec(text: string): Scaled {
  const result = parseDecimal(text);
  assert.ok(result.ok, `${text} parses: ${inspect(result)}`);
  return result.value;
}

/** The fraction `num / den` as a `Scaled`. */
export function fr(num: bigint, den = 1n): Scaled {
  return fromRational(rational(num, den));
}

/** The exact ball of the decimal literal `text`. */
export function exactDec(text: string): Ball {
  return exact(dec(text));
}

/** The fraction a `Scaled` of moderate exponent denotes; a test's precondition that it fits the hard bound. */
export function fraction(s: Scaled): Rational {
  const result = toRational(s, MAX_SIGNIFICAND_LIMIT_BITS);
  assert.ok(result.ok, `${inspect(s)} fits the hard bound`);
  return result.value;
}

/**
 * A ball with the midpoint `mid` and a radius at or above `rad`: the least
 * such where `rad` can be formed as a fraction, and the coarse bound from
 * the exponent otherwise.
 */
export function ball(mid: Scaled, rad: Scaled): Ball {
  const r = toRational(rad, MAX_SIGNIFICAND_LIMIT_BITS);
  return { mid, rad: r.ok ? radiusAbove(r.value) : radiusAboveScaled(rad) };
}

/** The significant digits of a `Scaled` whose significand is an integer; a test's precondition that it is one. */
export function digitsOf(s: Scaled): number {
  assert.equal(
    s.significand.den,
    1n,
    `${inspect(s)} has an integer significand`,
  );
  const num = s.significand.num < 0n ? -s.significand.num : s.significand.num;
  return num.toString().length;
}
