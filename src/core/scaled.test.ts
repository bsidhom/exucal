import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  ONE as ONE_FRACTION,
  ZERO as ZERO_FRACTION,
  absolute as absoluteFraction,
  add as addFractions,
  compare as compareFractions,
  divide as divideFractions,
  equals as equalsFractions,
  invert as invertFraction,
  isInteger as isIntegerFraction,
  isZero as isZeroFraction,
  multiply as multiplyFractions,
  negate as negateFraction,
  pow as powFraction,
  rational,
  sign as signFraction,
  subtract as subtractFractions,
  toFraction,
  type Rational,
  type RationalError,
} from "./rational.ts";
import {
  formatFraction,
  parseFraction,
  roundFraction,
} from "../testing/fraction.ts";
import type { Result } from "./result.ts";
import {
  MAX_EXPONENT,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  decimalExponent,
  divide,
  equals,
  exactRoot,
  format,
  fromRational,
  invert,
  isInteger,
  isZero,
  log2Bounds,
  multiply,
  negate,
  parseDecimal,
  pow,
  powerRefusal,
  powerSide,
  roundTo,
  scaled,
  sign,
  subtract,
  toRational,
  trunc,
  type Refusal,
  type Log2,
  type Scaled,
  type ScaledError,
} from "./scaled.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";
import { inLowestTerms } from "../testing/fraction.ts";
import { key, randomRational, split } from "../testing/random.ts";

function unwrap<T>(result: Result<T, ScaledError | RationalError>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function assertError(result: Result<unknown, ScaledError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

/** Asserts that `result` was refused with `kind`. */
function assertRefused(
  result: Result<unknown, ScaledError>,
  kind: Refusal["kind"],
) {
  assert.deepEqual(result, { ok: false, error: { kind } });
}

/** A decimal literal that is expected to be valid. */
function dec(text: string): Scaled {
  return unwrap(parseDecimal(text));
}

/** `num / den` as a `Scaled`. */
function q(num: bigint, den: bigint = 1n): Scaled {
  return fromRational(rational(num, den));
}

/** `num / den × 10^exp`, which must be within the bound. */
function at(num: bigint, den: bigint, exp: bigint): Scaled {
  return unwrap(scaled(rational(num, den), exp));
}

/** The literal `<significand>e<exp>`. */
function big(significand: string, exp: bigint): Scaled {
  return dec(`${significand}e${exp}`);
}

/** `count` seeded rationals of about seven digits over seven, at magnitudes up to `10^±12`. */
function randomRationals(count: number, seed: number): Rational[] {
  return split(key(seed), count).map((k) => randomRational(k, 24, 12));
}

// ---------------------------------------------------------------------------
// The canonical form

test("one value has one representation, wherever its powers of ten sit", () => {
  const twoFiftyFour = { significand: rational(254n), exp: -2n };
  assert.deepEqual(dec("2.54"), twoFiftyFour);
  assert.deepEqual(at(254n, 100n, 0n), twoFiftyFour);
  assert.deepEqual(at(127n, 50n, 0n), twoFiftyFour);
  assert.deepEqual(at(254n, 1n, -2n), twoFiftyFour);
  assert.deepEqual(at(2540n, 1n, -3n), twoFiftyFour);
  assert.deepEqual(at(127n, 5n, -1n), twoFiftyFour);
  const thousand = { significand: rational(1n), exp: 3n };
  assert.deepEqual(dec("1e3"), thousand);
  assert.deepEqual(dec("1000"), thousand);
  assert.deepEqual(
    fromRational(multiplyFractions(rational(8n), rational(125n))),
    thousand,
  );
  assert.deepEqual(at(10n, 1n, 2n), thousand);
  assert.deepEqual(at(1n, 1n, 3n), thousand);
});

test("the denominator's twos and fives move into the exponent", () => {
  assert.deepEqual(at(1n, 6n, 0n), { significand: rational(5n, 3n), exp: -1n });
  assert.deepEqual(at(1n, 1024n, 0n), {
    significand: rational(5n ** 10n),
    exp: -10n,
  });
  assert.deepEqual(at(1n, 125n, 0n), { significand: rational(8n), exp: -3n });
  assert.deepEqual(at(3n, 50n, 0n), { significand: rational(6n), exp: -2n });
  assert.deepEqual(at(7n, 12n, 0n), {
    significand: rational(175n, 3n),
    exp: -2n,
  });
  assert.deepEqual(at(1n, 3n, 0n), { significand: rational(1n, 3n), exp: 0n });
  // A denominator coprime to ten is left alone, and the significand stays in
  // lowest terms without a gcd: what moved is coprime to what stayed.
  assert.deepEqual(at(1n, 7n, 4n), { significand: rational(1n, 7n), exp: 4n });
});

test("the numerator's trailing zeros move into the exponent, with the sign kept", () => {
  assert.deepEqual(at(1200n, 1n, 0n), { significand: rational(12n), exp: 2n });
  assert.deepEqual(at(1200n, 7n, 0n), {
    significand: rational(12n, 7n),
    exp: 2n,
  });
  assert.deepEqual(at(-1200n, 1n, 0n), {
    significand: rational(-12n),
    exp: 2n,
  });
  assert.deepEqual(at(-1200n, 1n, -5n), {
    significand: rational(-12n),
    exp: -3n,
  });
  // Twos or fives alone are not tens: the numerator keeps them.
  assert.deepEqual(at(40n, 1n, 0n), { significand: rational(4n), exp: 1n });
  assert.deepEqual(at(4n, 1n, 0n), { significand: rational(4n), exp: 0n });
  assert.deepEqual(at(25n, 1n, 0n), { significand: rational(25n), exp: 0n });
  assert.deepEqual(at(250n, 1n, 0n), { significand: rational(25n), exp: 1n });
});

test("a significand full of tens, twos or fives is normalized in a logarithmic number of divisions", () => {
  const started = performance.now();
  assert.deepEqual(fromRational(rational(10n ** 20000n)), at(1n, 1n, 20000n));
  assert.deepEqual(fromRational(rational(1n, 5n ** 20000n)), {
    significand: rational(1n << 20000n),
    exp: -20000n,
  });
  assert.deepEqual(fromRational(rational(1n, 1n << 20000n)), {
    significand: rational(5n ** 20000n),
    exp: -20000n,
  });
  assert.deepEqual(fromRational(rational(3n * 10n ** 20001n, 7n)), {
    significand: rational(3n, 7n),
    exp: 20001n,
  });
  assert.deepEqual(fromRational(rational(2n ** 20000n * 5n ** 19999n)), {
    significand: rational(2n),
    exp: 19999n,
  });
  assert.ok(performance.now() - started < 2000, "fast");
});

test("zero is zero with exponent zero, whatever exponent it was given", () => {
  assert.deepEqual(at(0n, 1n, 0n), ZERO);
  assert.deepEqual(at(0n, 7n, 999n), ZERO);
  assert.deepEqual(unwrap(scaled(ZERO_FRACTION, MAX_EXPONENT * 5n)), ZERO);
  assert.deepEqual(fromRational(ZERO_FRACTION), ZERO);
  assert.deepEqual(ONE, { significand: rational(1n), exp: 0n });
});

test("the exponent bound is on the value's decimal exponent, checked after normalizing (D17)", () => {
  assert.ok(scaled(rational(1n), MAX_EXPONENT).ok);
  assert.ok(scaled(rational(1n), -MAX_EXPONENT).ok);
  assertError(scaled(rational(1n), MAX_EXPONENT + 1n), "overflow");
  assertError(scaled(rational(1n), -MAX_EXPONENT - 1n), "underflow");
  // `10 × 10^MAX` normalizes to `1 × 10^(MAX + 1)`, which is out of bounds.
  assertError(scaled(rational(10n), MAX_EXPONENT), "overflow");
  assert.ok(scaled(rational(1n, 10n), MAX_EXPONENT).ok);
  assertError(scaled(rational(1n, 10n), -MAX_EXPONENT), "underflow");
  // A fraction significand: the canonical exponent may pass the bound by the
  // significand's digits while the value is within it, and the other way.
  // `1/3 × 10^(MAX + 1)` is `3.3 × 10^MAX`, within; `1/7 × 10^-MAX` is
  // `1.4 × 10^-(MAX + 1)`, past; `12345678 × 10^-(MAX + 7)` is
  // `1.2 × 10^-MAX`, within.
  assert.ok(scaled(rational(1n, 3n), MAX_EXPONENT + 1n).ok);
  assertError(scaled(rational(1n, 3n), MAX_EXPONENT + 2n), "overflow");
  assertError(scaled(rational(1n, 7n), -MAX_EXPONENT), "underflow");
  assert.ok(scaled(rational(1n, 7n), -MAX_EXPONENT + 1n).ok);
  assert.ok(scaled(rational(12345678n), -MAX_EXPONENT - 7n).ok);
  assertError(scaled(rational(12345678n), -MAX_EXPONENT - 8n), "underflow");
  assertError(scaled(rational(3048n), MAX_EXPONENT + 14n), "overflow");
  // Zero is within the bound at any exponent.
  assert.deepEqual(scaled(rational(0n), MAX_EXPONENT * 2n), {
    ok: true,
    value: ZERO,
  });
});

test("the canonical significand, the fraction it denotes and an aligned operand are in lowest terms", () => {
  // The fraction's arithmetic reduces with the smaller gcds its operands
  // allow, which is correct only for operands in lowest terms (the plan's
  // H.9), and the canonical form is built without `rational`: the
  // denominator's twos and fives move out as fives and twos on the
  // numerator, and a sum's operand is a significand times a power of ten.
  for (const r of randomRationals(100, 4104)) {
    for (const [num, den, exp] of [
      [r.num, r.den, 0n],
      [r.num * 1024n, r.den * 125n, -7n],
      [r.num, r.den * 2n ** 40n * 5n ** 3n, 12n],
      [r.num * 10n ** 9n, r.den * 3n * 7n, -20n],
    ] as const) {
      const s = at(num, den, exp);
      assert.ok(inLowestTerms(s.significand), inspect(s));
      assert.ok(
        inLowestTerms(unwrap(toRational(s, MAX_SIGNIFICAND_LIMIT_BITS))),
      );
      const sum = unwrap(
        add(s, at(7n, 3n, exp + 5n), MAX_SIGNIFICAND_LIMIT_BITS),
      );
      assert.ok(inLowestTerms(sum.significand), inspect(sum));
      const shifted = unwrap(
        subtract(at(1n, 7n, exp - 3n), s, MAX_SIGNIFICAND_LIMIT_BITS),
      );
      assert.ok(inLowestTerms(shifted.significand), inspect(shifted));
    }
  }
  for (const text of ["1e-30", "2.54e300", "0.000625", "1e5000", "6e-5000"]) {
    assert.ok(inLowestTerms(dec(text).significand), text);
    assert.ok(
      inLowestTerms(unwrap(toRational(dec(text), MAX_SIGNIFICAND_LIMIT_BITS))),
      text,
    );
  }
});

test("seeded fractions round-trip and equal structurally whichever form they were built from", () => {
  for (const r of randomRationals(100, 4101)) {
    const s = fromRational(r);
    assert.deepEqual(unwrap(toRational(s, MAX_SIGNIFICAND_LIMIT_BITS)), r);
    assert.deepEqual(at(r.num * 100n, r.den, -2n), s);
    assert.deepEqual(at(r.num, r.den * 1000n, 3n), s);
    assert.deepEqual(at(r.num * 10n ** 7n, r.den * 10n ** 4n, -3n), s);
    assert.ok(equals(s, fromRational(r)));
  }
});

// ---------------------------------------------------------------------------
// Inspection

test("inspection", () => {
  assert.ok(isZero(ZERO));
  assert.ok(!isZero(ONE));
  assert.ok(!isZero(big("1", -999999999n)));
  assert.ok(isInteger(dec("1e3")));
  assert.ok(isInteger(dec("15")));
  assert.ok(isInteger(big("1", 999999999n)));
  assert.ok(isInteger(ZERO));
  assert.ok(!isInteger(dec("1.5")));
  assert.ok(!isInteger(dec("1e-3")));
  assert.ok(!isInteger(at(1n, 3n, 0n)));
  assert.ok(!isInteger(at(1n, 3n, 5n)));
  assert.equal(sign(big("-1", 999999999n)), -1);
  assert.equal(sign(ZERO), 0);
  assert.equal(sign(big("1", -999999999n)), 1);
  assert.ok(equals(dec("2.54"), at(127n, 50n, 0n)));
  assert.ok(!equals(dec("2.54"), dec("2.55")));
  assert.ok(!equals(dec("1e3"), dec("1e4")));
});

test("decimalExponent is the significand's plus the exponent, for any exponent", () => {
  assert.equal(decimalExponent(dec("1")), 0n);
  assert.equal(decimalExponent(dec("9.99")), 0n);
  assert.equal(decimalExponent(dec("10")), 1n);
  assert.equal(decimalExponent(dec("0.099")), -2n);
  assert.equal(decimalExponent(dec("1e-7")), -7n);
  assert.equal(decimalExponent(dec("-123")), 2n);
  assert.equal(decimalExponent(at(1n, 11n, 0n)), -2n);
  assert.equal(decimalExponent(at(10n, 11n, 0n)), -1n);
  assert.equal(decimalExponent(big("1", 999999999n)), 999999999n);
  assert.equal(decimalExponent(big("9.9", 999999999n)), 999999999n);
  assert.equal(decimalExponent(big("1.5", -999999999n)), -999999999n);
  assert.equal(decimalExponent(at(1n, 3n, 10n ** 18n)), 10n ** 18n - 1n);
  assert.throws(() => decimalExponent(ZERO), RangeError);
});

// ---------------------------------------------------------------------------
// The exact fraction

test("toRational forms the power of ten where it fits", () => {
  assert.deepEqual(unwrap(toRational(dec("2.54"), 64)), rational(127n, 50n));
  assert.deepEqual(
    unwrap(toRational(dec("1e5000"), MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(10n ** 5000n),
  );
  assert.deepEqual(
    unwrap(toRational(dec("1e-5000"), MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(1n, 10n ** 5000n),
  );
  // A negative exponent cancels against the numerator's twos or fives.
  assert.deepEqual(unwrap(toRational(at(4n, 1n, -1n), 64)), rational(2n, 5n));
  assert.deepEqual(unwrap(toRational(at(25n, 1n, -2n), 64)), rational(1n, 4n));
  assert.deepEqual(unwrap(toRational(at(12n, 1n, 2n), 64)), rational(1200n));
  assert.deepEqual(
    unwrap(toRational(at(-75n, 7n, -3n), 64)),
    rational(-3n, 280n),
  );
  assert.deepEqual(unwrap(toRational(ZERO, 1)), ZERO_FRACTION);
  assert.deepEqual(unwrap(toRational(at(1n, 3n, 0n), 1)), rational(1n, 3n));
});

test("toRational refuses a power of ten beyond the bits it may form", () => {
  assert.ok(toRational(big("1", 300000n), MAX_SIGNIFICAND_LIMIT_BITS).ok);
  assertError(
    toRational(big("1", 400000n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertError(
    toRational(big("1", -400000n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertError(
    toRational(big("1", 999999999n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertError(
    toRational(big("1", -999999999n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  const sixteen = 1 << 16;
  assert.ok(toRational(dec("1e19000"), sixteen).ok);
  assertError(toRational(big("1", 300000n), sixteen), "tooLarge");
  // The significand's digits count with the exponent's.
  assertError(
    toRational(at(10n ** 100n + 1n, 1n, 19600n), sixteen),
    "tooLarge",
  );
});

// ---------------------------------------------------------------------------
// Comparison

test("compare is decided across exponents that could not be aligned", () => {
  const huge = big("1", 999999999n);
  assert.equal(compare(huge, ONE), 1);
  assert.equal(compare(ONE, huge), -1);
  assert.equal(compare(huge, dec("-1")), 1);
  assert.equal(compare(big("-1", 999999999n), dec("-1")), -1);
  assert.equal(compare(big("-1", 999999999n), huge), -1);
  assert.equal(compare(huge, big("1.0000000001", 999999999n)), -1);
  assert.equal(compare(big("1.0000000001", 999999999n), huge), 1);
  assert.equal(
    compare(big("-1.0000000001", 999999999n), big("-1", 999999999n)),
    -1,
  );
  assert.equal(compare(huge, big("9.9", 999999998n)), 1);
  assert.equal(compare(huge, big("1", 999999998n)), 1);
  assert.equal(compare(big("1", -999999999n), ZERO), 1);
  assert.equal(compare(big("-1", -999999999n), ZERO), -1);
  assert.equal(compare(ZERO, big("1", -999999999n)), -1);
  assert.equal(compare(big("1", -999999999n), big("2", -999999999n)), -1);
  assert.equal(compare(huge, big("1", 999999999n)), 0);
  assert.equal(compare(at(1n, 3n, 10n ** 18n), at(3n, 1n, 10n ** 18n - 1n)), 1);
  assert.equal(compare(at(1n, 3n, 10n ** 18n), at(1n, 3n, 10n ** 18n)), 0);
});

test("compare agrees with the fraction's comparison where the values fit", () => {
  assert.equal(compare(dec("2.54"), at(254n, 100n, 0n)), 0);
  assert.equal(compare(dec("1.5e3"), dec("1499")), 1);
  assert.equal(compare(dec("1.5e3"), dec("1501")), -1);
  assert.equal(compare(dec("9.99e5"), dec("1e6")), -1);
  assert.equal(compare(dec("-9.99e5"), dec("-1e6")), 1);
  const values = randomRationals(60, 4102);
  for (const a of values) {
    for (const b of values.slice(0, 15)) {
      assert.equal(
        compare(fromRational(a), fromRational(b)),
        compareFractions(a, b),
        `${inspect(a)} against ${inspect(b)}`,
      );
    }
    assert.equal(compare(fromRational(a), fromRational(a)), 0);
  }
});

// ---------------------------------------------------------------------------
// The binary magnitude

/** `int + frac` as a double, for magnitudes a double holds exactly enough. */
function asNumber(log2: Log2): number {
  return Number(log2.int) + log2.frac;
}

test("log2Bounds contain log2 of seeded values within 2^-30", () => {
  for (const r of randomRationals(100, 4103)) {
    if (r.num === 0n) continue;
    const s = fromRational(r);
    const { lower, upper } = log2Bounds(s);
    // The reference through doubles: the numerator and denominator are
    // below 2^24, exact in a double, and the scale is at most 10^12.
    // The reference through doubles, from the canonical form: its
    // numerator and denominator are within a few bits of exact in a
    // double, and its exponent is at most twelve.
    const reference =
      Math.log2(Math.abs(Number(s.significand.num))) -
      Math.log2(Number(s.significand.den)) +
      Number(s.exp) * Math.log2(10);
    assert.ok(
      lower.frac >= 0 && lower.frac < 1 && upper.frac >= 0 && upper.frac < 1,
    );
    assert.ok(asNumber(lower) <= reference, `${inspect(r)}: lower`);
    assert.ok(asNumber(upper) >= reference, `${inspect(r)}: upper`);
    assert.ok(
      asNumber(upper) - asNumber(lower) <= 2 ** -30,
      `${inspect(r)}: width`,
    );
  }
});

test("log2Bounds at exponents up to the bound, against Python's decimal module", () => {
  // int and the first digits of frac from Python's decimal module at 80
  // digits: (ln(num) - ln(den) + exp ln(10)) / ln(2).
  const cases: [Scaled, bigint, number][] = [
    [big("1", 999999999n), 3321928091n, 0.5654342529829570816],
    [big("7", -999999999n), -3321928089n, 0.2419206690746470258],
    [
      at(123456789n, 1n, 10n ** 18n - 8n),
      3321928094887362348n,
      0.174325603250965214,
    ],
    [at(1n, 3n, 10n ** 18n), 3321928094887362346n, 0.285356928768233994],
    [
      at(-5n, 7n, -(10n ** 18n) + 1n),
      -3321928094887362346n,
      0.966181838227730412,
    ],
    [dec("2.54"), 1n, 0.3448284969974411575],
    [dec("0.3"), -2n, 0.2630344058337938336],
    [ONE, 0n, 0],
    [dec("-1024"), 10n, 0],
  ];
  for (const [s, int, frac] of cases) {
    const { lower, upper } = log2Bounds(s);
    const label = inspect(s);
    // Each bound's integer part is the reference's or one off across a
    // carry, and the fractions compared through that difference.
    const below = Number(lower.int - int) + lower.frac;
    const above = Number(upper.int - int) + upper.frac;
    assert.ok(below <= frac, `${label}: lower ${below} <= ${frac}`);
    assert.ok(above >= frac, `${label}: upper ${above} >= ${frac}`);
    assert.ok(above - below <= 2 ** -30, `${label}: width`);
  }
  assert.throws(() => log2Bounds(ZERO), RangeError);
});

// ---------------------------------------------------------------------------
// Arithmetic

test("negate and absolute keep the canonical form", () => {
  assert.deepEqual(negate(dec("2.54")), dec("-2.54"));
  assert.deepEqual(negate(ZERO), ZERO);
  assert.deepEqual(absolute(dec("-2.54")), dec("2.54"));
  assert.deepEqual(absolute(big("-1", 999999999n)), big("1", 999999999n));
  assert.deepEqual(
    negate(negate(big("7", -999999999n))),
    big("7", -999999999n),
  );
});

test("sums with large exponents of one base form exactly", () => {
  const limit = 1 << 16;
  assert.deepEqual(
    unwrap(add(big("1", 999999999n), big("3", 999999998n), limit)),
    big("1.3", 999999999n),
  );
  assert.deepEqual(
    unwrap(subtract(big("1", 999999999n), big("1", 999999999n), limit)),
    ZERO,
  );
  assert.deepEqual(
    unwrap(subtract(big("1", 999999999n), big("3", 999999998n), limit)),
    big("7", 999999998n),
  );
  assert.deepEqual(
    unwrap(add(big("1", -999999999n), big("2", -999999999n), limit)),
    big("3", -999999999n),
  );
  assert.deepEqual(unwrap(add(dec("0.1"), dec("0.2"), limit)), dec("0.3"));
  assert.deepEqual(unwrap(add(dec("1e3"), dec("1"), limit)), dec("1001"));
  assert.deepEqual(
    unwrap(add(ZERO, big("1", 999999999n), limit)),
    big("1", 999999999n),
  );
  assert.deepEqual(
    unwrap(subtract(ZERO, big("1", 999999999n), limit)),
    big("-1", 999999999n),
  );
  assert.deepEqual(
    unwrap(add(big("1", 999999999n), ZERO, limit)),
    big("1", 999999999n),
  );
  assert.deepEqual(
    unwrap(add(at(1n, 3n, 5n), at(1n, 6n, 5n), limit)),
    at(1n, 2n, 5n),
  );
});

test("a sum whose alignment does not fit the limit is too large", () => {
  const sixteen = 1 << 16;
  assertError(add(big("1", 999999999n), ONE, sixteen), "tooLarge");
  assertError(
    add(big("1", 999999999n), ONE, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertError(
    subtract(ONE, big("1", -999999999n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  // `1e19000 + 1` aligns within the default significand limit and not within
  // 60,000 bits, which is what the limit means.
  assert.deepEqual(
    unwrap(add(big("1", 19000n), ONE, sixteen)),
    fromRational(rational(10n ** 19000n + 1n)),
  );
  assertError(add(big("1", 19000n), ONE, 60000), "tooLarge");
  // The sum's own exponent is held to the bound.
  assertError(
    add(at(9n, 1n, MAX_EXPONENT), at(1n, 1n, MAX_EXPONENT), sixteen),
    "overflow",
  );
  assert.deepEqual(
    unwrap(add(at(9n, 1n, MAX_EXPONENT), at(-1n, 1n, MAX_EXPONENT), sixteen)),
    at(8n, 1n, MAX_EXPONENT),
  );
});

test("products, quotients and powers combine exponents and hold the bound", () => {
  assert.deepEqual(
    unwrap(multiply(big("1", 999999999n), big("1", 999999999n))),
    big("1", 1999999998n),
  );
  assert.deepEqual(
    unwrap(multiply(big("2.5", 999999999n), big("4", -999999999n))),
    dec("10"),
  );
  assert.deepEqual(
    unwrap(divide(big("1", 999999999n), big("4", -999999999n))),
    big("2.5", 1999999997n),
  );
  assert.deepEqual(unwrap(divide(ZERO, big("4", -999999999n))), ZERO);
  assertError(divide(ONE, ZERO), "divisionByZero");
  assertError(invert(ZERO), "divisionByZero");
  assert.deepEqual(
    unwrap(invert(big("4", -999999999n))),
    big("2.5", 999999998n),
  );
  assert.deepEqual(unwrap(invert(dec("8"))), dec("0.125"));
  assert.deepEqual(unwrap(multiply(ZERO, big("1", MAX_EXPONENT))), ZERO);
  // At the bound and one past it.
  const half = MAX_EXPONENT / 2n;
  assert.ok(multiply(at(1n, 1n, half), at(1n, 1n, half)).ok);
  assertError(multiply(at(1n, 1n, half), at(1n, 1n, half + 1n)), "overflow");
  assertError(multiply(at(10n, 1n, half), at(1n, 1n, half)), "overflow");
  assert.ok(divide(at(1n, 1n, half), at(1n, 1n, -half)).ok);
  assertError(divide(at(1n, 1n, half), at(1n, 1n, -half - 1n)), "overflow");
  assertError(divide(at(1n, 1n, -half), at(1n, 1n, half + 1n)), "underflow");
  assert.ok(invert(at(1n, 1n, MAX_EXPONENT)).ok);
  assertError(invert(at(5n, 1n, MAX_EXPONENT)), "underflow");
});

test("pow raises the significand against the limit and the exponent against the bound", () => {
  assert.deepEqual(
    unwrap(pow(dec("10"), 1442695n, MAX_SIGNIFICAND_LIMIT_BITS)),
    at(1n, 1n, 1442695n),
  );
  assertError(pow(dec("2"), 1442695n, MAX_SIGNIFICAND_LIMIT_BITS), "tooLarge");
  assert.deepEqual(
    unwrap(pow(dec("1e9"), 10n ** 9n, MAX_SIGNIFICAND_LIMIT_BITS)),
    at(1n, 1n, 9n * 10n ** 9n),
  );
  assert.deepEqual(
    unwrap(pow(dec("2.54"), 2n, MAX_SIGNIFICAND_LIMIT_BITS)),
    dec("6.4516"),
  );
  assert.deepEqual(
    unwrap(pow(dec("2.54"), -1n, MAX_SIGNIFICAND_LIMIT_BITS)),
    at(50n, 127n, 0n),
  );
  assert.deepEqual(
    unwrap(pow(dec("2e3"), 3n, MAX_SIGNIFICAND_LIMIT_BITS)),
    dec("8e9"),
  );
  assert.deepEqual(
    unwrap(pow(dec("2e3"), -3n, MAX_SIGNIFICAND_LIMIT_BITS)),
    at(1n, 8n, -9n),
  );
  assert.deepEqual(unwrap(pow(ZERO, 0n, MAX_SIGNIFICAND_LIMIT_BITS)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 5n, MAX_SIGNIFICAND_LIMIT_BITS)), ZERO);
  assertError(pow(ZERO, -1n, MAX_SIGNIFICAND_LIMIT_BITS), "divisionByZero");
  assert.deepEqual(
    unwrap(pow(big("1", 999999999n), 0n, MAX_SIGNIFICAND_LIMIT_BITS)),
    ONE,
  );
  // The exponent's bound, at it and past it; the significand's limit.
  assert.ok(pow(dec("1e9"), 10n ** 9n, MAX_SIGNIFICAND_LIMIT_BITS).ok);
  assertError(
    pow(dec("1e9"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assertError(
    pow(dec("1e-9"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertError(
    pow(dec("1e9"), 2n * 10n ** 17n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assert.ok(pow(dec("1e9"), 10n ** 17n, MAX_SIGNIFICAND_LIMIT_BITS).ok);
  assertError(pow(dec("2"), 100n, 64), "tooLarge");
  assert.ok(pow(dec("2"), 30n, 64).ok);
  assertError(pow(dec("3e9"), 100_000n, 1 << 16), "tooLarge");
});

test("a refusal names the limit it passes: tooLarge for the significand limit, overflow or underflow for the bound", () => {
  // The constructor and the arithmetic, by the sign of the exponent that
  // passes the bound.
  assertRefused(scaled(rational(1n), MAX_EXPONENT + 1n), "overflow");
  assertRefused(scaled(rational(1n), -MAX_EXPONENT - 1n), "underflow");
  const half = MAX_EXPONENT / 2n;
  assertRefused(multiply(at(1n, 1n, half), at(1n, 1n, half + 1n)), "overflow");
  assertRefused(
    multiply(at(1n, 1n, -half), at(1n, 1n, -half - 1n)),
    "underflow",
  );
  assertRefused(divide(at(1n, 1n, half), at(1n, 1n, -half - 1n)), "overflow");
  assertRefused(divide(at(1n, 1n, -half), at(1n, 1n, half + 1n)), "underflow");
  assertRefused(invert(at(5n, 1n, MAX_EXPONENT)), "underflow");
  // A sum's alignment and a fraction's power of ten are the range
  // limit's; a sum whose value passes the bound is the bound's.
  assertRefused(
    add(big("1", 999999999n), ONE, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertRefused(
    subtract(ONE, big("1", -999999999n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertRefused(
    toRational(big("1", -400000n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertRefused(
    add(
      at(5n, 1n, MAX_EXPONENT),
      at(5n, 1n, MAX_EXPONENT),
      MAX_SIGNIFICAND_LIMIT_BITS,
    ),
    "overflow",
  );
  // A literal: its significand is the hard bound's, its exponent the bound's.
  assertRefused(parseDecimal("9".repeat(320000)), "tooLarge");
  assertRefused(parseDecimal("1e1000000000000000001"), "overflow");
  assertRefused(parseDecimal("10e1000000000000000000"), "overflow");
  assertRefused(parseDecimal("0.01e-999999999999999999"), "underflow");
});

test("a power refused is told by its decimal exponent, not by the check that fails first", () => {
  // Past the bound by the exponent alone, on the side the signs give.
  assertRefused(
    pow(dec("1e9"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assertRefused(
    pow(dec("1e-9"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(dec("1e9"), -(10n ** 18n), MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(dec("1e-9"), -(10n ** 18n), MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  // 0.7 is 7 × 10^-1, so its power too is refused by the exponent first.
  assertRefused(
    pow(dec("0.7"), 10n ** 19n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  // Refused by the significand, which no significand limit could hold, and past
  // the bound too: 7^(10^19) is about 10^(8.45 × 10^18), and 1/7 to the
  // same power, whose canonical exponent is zero, as far below it.
  assertRefused(
    pow(dec("7"), 10n ** 19n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assertRefused(
    pow(dec("7"), -(10n ** 19n), MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  const seventh = fromRational(rational(1n, 7n));
  assertRefused(
    pow(seventh, 10n ** 19n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(seventh, -(10n ** 19n), MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  // Refused by the significand and within the bound: the significand limit.
  assertRefused(
    pow(dec("2"), 1442695n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertRefused(pow(dec("2"), 100n, 64), "tooLarge");
  assertRefused(pow(dec("3e9"), 100_000n, 1 << 16), "tooLarge");
  // The canonical form, 254 × 10^-2, puts the exponent of 2.54^(10^18)
  // past the bound below, but the power is 10^(0.40 × 10^18), within it:
  // refused at the significand limit, not as a value too small.
  assertRefused(
    pow(dec("2.54"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertRefused(
    pow(dec("2.54"), -(10n ** 18n), MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  // A base within 2^-30 of one: the side is the base's against one, and
  // the size its exact difference from one's. 1.0000000001 is
  // 10000000001 × 10^-10, whose canonical exponent is negative, but its
  // power 10^30 is about 10^(4.3 × 10^19), and 10^28 about
  // 10^(4.3 × 10^17), within the bound.
  const nearOne = dec("1.0000000001");
  assertRefused(
    pow(nearOne, 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assertRefused(
    pow(nearOne, -(10n ** 30n), MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(nearOne, 10n ** 28n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  const belowOne = dec("0.9999999999");
  assertRefused(
    pow(belowOne, 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(belowOne, -(10n ** 30n), MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  // At the bound: 10^(10^18) is a value, 10^(10^18 + 1) is not. Within a
  // relative 2^-20 of it, where the logarithms cannot tell, a power
  // refused by its significand is the significand limit's: 1.5 to
  // 5678870000000000000 is about 10^(0.9999994 × 10^18), within the
  // bound (the check of the canonical exponent times the power, which
  // read it as past the bound below, went with the plan's H.13).
  assert.ok(pow(dec("10"), 10n ** 18n, MAX_SIGNIFICAND_LIMIT_BITS).ok);
  assertRefused(
    pow(dec("10"), 10n ** 18n + 1n, MAX_SIGNIFICAND_LIMIT_BITS),
    "overflow",
  );
  assertRefused(
    pow(dec("0.1"), 10n ** 18n + 1n, MAX_SIGNIFICAND_LIMIT_BITS),
    "underflow",
  );
  assertRefused(
    pow(dec("1.5"), 5678870000000000000n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  // A value whose canonical exponent is past the bound, to the first
  // power, is itself (D17).
  const edgeValue = at(12345678n, 1n, -MAX_EXPONENT - 7n);
  assert.deepEqual(pow(edgeValue, 1n, MAX_SIGNIFICAND_LIMIT_BITS), {
    ok: true,
    value: edgeValue,
  });
  // One refused by its significand there is the significand limit's.
  const edge = 1183294662454938368n;
  assert.equal(
    powerRefusal(dec("7"), fromRational(rational(edge)))?.kind,
    undefined,
  );
  assertRefused(pow(dec("7"), edge, MAX_SIGNIFICAND_LIMIT_BITS), "tooLarge");
});

test("powerRefusal tells a power past the bound from one within it, and says nothing within a hair of it", () => {
  assert.equal(powerRefusal(dec("7"), dec("1e19"))?.kind, "overflow");
  assert.equal(powerRefusal(dec("7"), dec("1e17"))?.kind, "tooLarge");
  assert.equal(powerRefusal(dec("0.5"), dec("1e19"))?.kind, "underflow");
  assert.equal(powerRefusal(dec("0.5"), dec("-1e19"))?.kind, "overflow");
  assert.equal(powerRefusal(dec("-7"), dec("1e19"))?.kind, "overflow");
  assert.equal(powerRefusal(dec("7"), dec("1e-999999999"))?.kind, "tooLarge");
  // Near one, the magnitude of the logarithm decides: 1.0000001^(10^30)
  // is about 10^(4.3 × 10^22), and 1.0000001^(10^20) 10^(4.3 × 10^12).
  assert.equal(powerRefusal(dec("1.0000001"), dec("1e30"))?.kind, "overflow");
  assert.equal(powerRefusal(dec("1.0000001"), dec("1e20"))?.kind, "tooLarge");
  // Within 2^-30 of one, by the exact difference from one, on the side
  // the comparison with one gives.
  assert.equal(
    powerRefusal(dec("1.0000000001"), dec("1e30"))?.kind,
    "overflow",
  );
  assert.equal(
    powerRefusal(dec("1.0000000001"), dec("1e28"))?.kind,
    "tooLarge",
  );
  assert.equal(
    powerRefusal(dec("-1.0000000001"), dec("1e30"))?.kind,
    "overflow",
  );
  assert.equal(
    powerRefusal(dec("0.9999999999"), dec("1e30"))?.kind,
    "underflow",
  );
  assert.equal(
    powerRefusal(dec("1.0000000001"), dec("1e999999999"))?.kind,
    "overflow",
  );
  // A zero base or exponent, or a base of magnitude one, is never past it.
  assert.equal(powerRefusal(ZERO, dec("1e19"))?.kind, "tooLarge");
  assert.equal(powerRefusal(dec("7"), ZERO)?.kind, "tooLarge");
  assert.equal(powerRefusal(ONE, dec("1e6"))?.kind, "tooLarge");
  assert.equal(powerRefusal(ONE, dec("1e999999999"))?.kind, "tooLarge");
  assert.equal(powerRefusal(negate(ONE), dec("1e999999999"))?.kind, "tooLarge");
  // Within a relative 2^-20 of the bound it cannot tell: 10^(10^18) is
  // at it.
  assert.equal(powerRefusal(dec("10"), dec("1e18"))?.kind, undefined);
  assert.equal(powerRefusal(dec("10"), dec("1.000001e18"))?.kind, "overflow");
  assert.equal(powerRefusal(dec("10"), dec("0.999999e18"))?.kind, "tooLarge");
});

test("powerSide gives the side of the bound by the signs of the exponent and of log |s|", () => {
  assert.equal(powerSide(dec("7"), dec("1e19")).kind, "overflow");
  assert.equal(powerSide(dec("7"), dec("-1e19")).kind, "underflow");
  assert.equal(powerSide(dec("0.7"), dec("1e19")).kind, "underflow");
  assert.equal(powerSide(dec("0.7"), dec("-1e19")).kind, "overflow");
  assert.equal(powerSide(dec("-1.5"), dec("1e19")).kind, "overflow");
  assert.equal(powerSide(dec("1.0000000001"), dec("1e30")).kind, "overflow");
});

test("every operation agrees with the fraction's through toRational where the values fit", () => {
  const values = randomRationals(40, 4201);
  for (const a of values) {
    for (const b of values.slice(0, 10)) {
      const sa = fromRational(a);
      const sb = fromRational(b);
      const back = (s: Scaled) =>
        unwrap(toRational(s, MAX_SIGNIFICAND_LIMIT_BITS));
      assert.deepEqual(
        back(unwrap(add(sa, sb, MAX_SIGNIFICAND_LIMIT_BITS))),
        addFractions(a, b),
      );
      assert.deepEqual(
        back(unwrap(subtract(sa, sb, MAX_SIGNIFICAND_LIMIT_BITS))),
        subtractFractions(a, b),
      );
      assert.deepEqual(back(unwrap(multiply(sa, sb))), multiplyFractions(a, b));
      if (b.num !== 0n) {
        const quotient = divideFractions(a, b);
        assert.ok(quotient.ok);
        assert.deepEqual(back(unwrap(divide(sa, sb))), quotient.value);
        const reciprocal = invertFraction(b);
        assert.ok(reciprocal.ok);
        assert.deepEqual(back(unwrap(invert(sb))), reciprocal.value);
      }
      assert.deepEqual(back(negate(sa)), negateFraction(a));
      assert.deepEqual(back(absolute(sa)), absoluteFraction(a));
      for (const n of [3n, -2n]) {
        const power = powFraction(a, n, MAX_SIGNIFICAND_LIMIT_BITS);
        if (power.ok) {
          assert.deepEqual(
            back(unwrap(pow(sa, n, MAX_SIGNIFICAND_LIMIT_BITS))),
            power.value,
          );
        } else {
          assertError(pow(sa, n, MAX_SIGNIFICAND_LIMIT_BITS), power.error.kind);
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Text, rounding, truncation and the exact root (moved from rational.ts in 4.3)

test("decimalExponent is the position of the leading digit", () => {
  const cases: [string, bigint][] = [
    ["1", 0n],
    ["9.99", 0n],
    ["10", 1n],
    ["12345", 4n],
    ["0.5", -1n],
    ["0.1", -1n],
    ["0.099", -2n],
    ["0.01", -2n],
    ["1e-7", -7n],
    ["1e21", 21n],
    ["-123", 2n],
  ];
  for (const [text, expected] of cases) {
    assert.equal(decimalExponent(dec(text)), expected, text);
  }
  assert.equal(decimalExponent(q(1n, 11n)), -2n);
  assert.equal(decimalExponent(q(10n, 11n)), -1n);
  assert.equal(decimalExponent(q(99n, 10n)), 0n);
  assert.throws(() => decimalExponent(ZERO), RangeError);
});

test("roundTo toward zero keeps the leading digits and drops the rest", () => {
  const truncate = (r: Scaled, digits: number) =>
    roundTo(r, digits, "towardZero");
  assert.deepEqual(truncate(dec("3.14159"), 3), dec("3.14"));
  assert.deepEqual(truncate(dec("3.14159"), 1), dec("3"));
  assert.deepEqual(truncate(dec("-3.14159"), 3), dec("-3.14"));
  assert.deepEqual(truncate(dec("0.0019999"), 2), dec("0.0019"));
  assert.deepEqual(truncate(dec("123456"), 2), dec("120000"));
  assert.deepEqual(truncate(dec("199"), 2), dec("190"));
  assert.deepEqual(truncate(dec("199"), 5), dec("199"));
  assert.deepEqual(truncate(q(2n, 3n), 4), dec("0.6666"));
  assert.deepEqual(truncate(q(-2n, 3n), 4), dec("-0.6666"));
  assert.deepEqual(truncate(ZERO, 4), ZERO);
  // Truncation composes: truncating a truncation is a single truncation.
  assert.deepEqual(
    truncate(truncate(q(2n, 3n), 10), 4),
    truncate(q(2n, 3n), 4),
  );
});

test("roundTo half away from zero goes to the nearest value, ties away from zero", () => {
  const round = (r: Scaled, digits: number) =>
    roundTo(r, digits, "halfAwayFromZero");
  assert.deepEqual(round(dec("3.14159"), 3), dec("3.14"));
  assert.deepEqual(round(dec("3.14159"), 4), dec("3.142"));
  assert.deepEqual(round(dec("-3.14159"), 4), dec("-3.142"));
  assert.deepEqual(round(q(2n, 3n), 4), dec("0.6667"));
  assert.deepEqual(round(q(-2n, 3n), 4), dec("-0.6667"));
  assert.deepEqual(round(dec("0.125"), 2), dec("0.13"));
  assert.deepEqual(round(dec("-0.125"), 2), dec("-0.13"));
  assert.deepEqual(round(dec("0.135"), 2), dec("0.14"));
  assert.deepEqual(round(dec("2.5"), 1), dec("3"));
  assert.deepEqual(round(dec("-2.5"), 1), dec("-3"));
  assert.deepEqual(round(dec("125"), 2), dec("130"));
  assert.deepEqual(round(dec("9.99"), 2), dec("10"));
  assert.deepEqual(round(dec("0.0999"), 1), dec("0.1"));
  assert.deepEqual(round(ZERO, 4), ZERO);
  assert.throws(() => round(ONE, 0), RangeError);
});

test("roundTo in every mode, on the ties and thirds of the rounding table", () => {
  // 3.5, -3.5, 2.5, -2.5, 1/3, -1/3, 2/3, -2/3, 0.5, -0.5 at one digit,
  // scaled into the second digit (35 → 40, 0.35 → 0.4) so that the
  // rounding is of significant digits, not of a fraction.
  const values = [
    "35",
    "-35",
    "0.25",
    "-0.25",
    q(1n, 30n),
    q(-1n, 30n),
    q(200n, 3n),
    q(-200n, 3n),
    "0.0005",
    "-0.0005",
  ].map((v) => (typeof v === "string" ? dec(v) : v));
  const expected: Record<RoundingMode, string[]> = {
    halfEven: [
      "40",
      "-40",
      "0.2",
      "-0.2",
      "0.03",
      "-0.03",
      "70",
      "-70",
      "0.0005",
      "-0.0005",
    ],
    halfAwayFromZero: [
      "40",
      "-40",
      "0.3",
      "-0.3",
      "0.03",
      "-0.03",
      "70",
      "-70",
      "0.0005",
      "-0.0005",
    ],
    halfTowardZero: [
      "30",
      "-30",
      "0.2",
      "-0.2",
      "0.03",
      "-0.03",
      "70",
      "-70",
      "0.0005",
      "-0.0005",
    ],
    towardZero: [
      "30",
      "-30",
      "0.2",
      "-0.2",
      "0.03",
      "-0.03",
      "60",
      "-60",
      "0.0005",
      "-0.0005",
    ],
    awayFromZero: [
      "40",
      "-40",
      "0.3",
      "-0.3",
      "0.04",
      "-0.04",
      "70",
      "-70",
      "0.0005",
      "-0.0005",
    ],
    ceiling: [
      "40",
      "-30",
      "0.3",
      "-0.2",
      "0.04",
      "-0.03",
      "70",
      "-60",
      "0.0005",
      "-0.0005",
    ],
    floor: [
      "30",
      "-40",
      "0.2",
      "-0.3",
      "0.03",
      "-0.04",
      "60",
      "-70",
      "0.0005",
      "-0.0005",
    ],
  };
  for (const mode of ROUNDING_MODES) {
    values.forEach((value, i) => {
      assert.deepEqual(
        roundTo(value, 1, mode),
        dec(expected[mode][i]!),
        `${inspect(value)} under ${mode}`,
      );
    });
  }
});

test("the directed modes round to the side they name, and carry", () => {
  assert.deepEqual(roundTo(dec("2.54"), 2, "ceiling"), dec("2.6"));
  assert.deepEqual(roundTo(dec("2.54"), 2, "floor"), dec("2.5"));
  assert.deepEqual(roundTo(dec("-2.54"), 2, "ceiling"), dec("-2.5"));
  assert.deepEqual(roundTo(dec("-2.54"), 2, "floor"), dec("-2.6"));
  assert.deepEqual(roundTo(dec("2.54"), 2, "towardZero"), dec("2.5"));
  assert.deepEqual(roundTo(dec("2.54"), 2, "awayFromZero"), dec("2.6"));
  assert.deepEqual(roundTo(dec("-2.54"), 2, "awayFromZero"), dec("-2.6"));
  // The carry across a power of ten holds in every mode that rounds the
  // magnitude up, and never happens in one that rounds it down.
  assert.deepEqual(roundTo(dec("9.99"), 2, "ceiling"), dec("10"));
  assert.deepEqual(roundTo(dec("9.91"), 2, "ceiling"), dec("10"));
  assert.deepEqual(roundTo(dec("9.99"), 2, "floor"), dec("9.9"));
  assert.deepEqual(roundTo(dec("-9.99"), 2, "floor"), dec("-10"));
  assert.deepEqual(roundTo(dec("-9.99"), 2, "ceiling"), dec("-9.9"));
  assert.deepEqual(roundTo(dec("0.0999"), 1, "awayFromZero"), dec("0.1"));
  assert.deepEqual(roundTo(dec("0.0999"), 1, "towardZero"), dec("0.09"));
  // A value with no more digits than asked is its own rounding, in any mode.
  for (const mode of ROUNDING_MODES) {
    assert.deepEqual(roundTo(dec("2.54"), 3, mode), dec("2.54"), mode);
    assert.deepEqual(roundTo(dec("-2.54"), 3, mode), dec("-2.54"), mode);
    assert.deepEqual(roundTo(dec("100"), 1, mode), dec("100"), mode);
  }
});

test("rounding to the display precision tells whether the display is exact", () => {
  for (const mode of ROUNDING_MODES) {
    assert.ok(equals(roundTo(dec("2.54"), 8, mode), dec("2.54")), mode);
    assert.ok(equals(roundTo(q(1n, 8n), 8, mode), q(1n, 8n)));
    assert.ok(!equals(roundTo(q(1n, 3n), 8, mode), q(1n, 3n)));
    assert.ok(!equals(roundTo(q(1n, 8n), 2, mode), q(1n, 8n)));
  }
});

test("parseDecimal reads decimal literals exactly", () => {
  const cases: [string, Rational][] = [
    ["0", ZERO_FRACTION],
    ["-0", ZERO_FRACTION],
    ["+0", ZERO_FRACTION],
    ["12", rational(12n)],
    ["012", rational(12n)],
    ["-12", rational(-12n)],
    ["+12", rational(12n)],
    ["1.5", rational(3n, 2n)],
    ["1.50", rational(3n, 2n)],
    [".5", rational(1n, 2n)],
    ["5.", rational(5n)],
    ["-.5", rational(-1n, 2n)],
    ["2.54", rational(127n, 50n)],
    ["0.45359237", rational(45359237n, 100000000n)],
    ["1.5e-3", rational(3n, 2000n)],
    ["1.5E-3", rational(3n, 2000n)],
    ["1.5e+3", rational(1500n)],
    ["1.5e3", rational(1500n)],
    ["1e0", ONE_FRACTION],
    ["12e-1", rational(6n, 5n)],
    ["0.1", rational(1n, 10n)],
    ["6.62607015e-34", rational(662607015n, 10n ** 42n)],
    ["1e21", rational(10n ** 21n)],
    ["0e99", ZERO_FRACTION],
    [
      "3.14159265358979323846264338327950288",
      rational(314159265358979323846264338327950288n, 10n ** 35n),
    ],
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(
      unwrap(toRational(dec(text), MAX_SIGNIFICAND_LIMIT_BITS)),
      expected,
      text,
    );
  }
});

test("parseDecimal rejects anything but a decimal literal", () => {
  for (const text of [
    "",
    " 1",
    "1 ",
    ".",
    "e5",
    "1e",
    "1e+",
    "1e1.5",
    "1.2.3",
    "1,5",
    "0x10",
    "1_000",
    "Infinity",
    "NaN",
    "1/2",
    "--1",
    "1-",
    "１", // full-width digit
  ]) {
    assertError(parseDecimal(text), "invalidNumber");
  }
});

test("parseDecimal keeps the exponent lazily and bounds the significand and the exponent", () => {
  assert.deepEqual(dec("1e5000"), at(1n, 1n, 5000n));
  assert.deepEqual(dec("1e-5000"), at(1n, 1n, -5000n));
  assert.deepEqual(dec("1e999999999"), at(1n, 1n, 999999999n));
  assert.deepEqual(dec("-2.50e-999999999"), at(-25n, 1n, -1000000000n));
  assert.deepEqual(dec("1e1000000000000000000"), at(1n, 1n, MAX_EXPONENT));
  assert.deepEqual(dec("0.1e-999999999999999999"), at(1n, 1n, -MAX_EXPONENT));
  // The exponent bound, on the value (D17): after the fraction digits and
  // the trailing zeros move, and zero at any exponent (issue #50).
  assertError(parseDecimal("1e1000000000000000001"), "overflow");
  assertError(parseDecimal("10e1000000000000000000"), "overflow");
  assertError(parseDecimal("0.01e-999999999999999999"), "underflow");
  assertError(parseDecimal("1e99999999999999999999999"), "overflow");
  assert.deepEqual(dec("0e99999999999999999999999"), ZERO);
  assert.deepEqual(dec("0e2000000000000000000"), ZERO);
  assert.deepEqual(dec("10e-1000000000000000001"), at(1n, 1n, -MAX_EXPONENT));
  assert.deepEqual(
    dec("1000e-1000000000000000002"),
    at(1n, 1n, -MAX_EXPONENT + 1n),
  );
  assert.deepEqual(dec("0.001e1000000000000000003"), at(1n, 1n, MAX_EXPONENT));
  assert.deepEqual(
    dec("12345678e-1000000000000000007"),
    at(12345678n, 1n, -MAX_EXPONENT - 7n),
  );
  assertError(
    parseDecimal("3047999999999999999999999999999999996953e999999999999999978"),
    "overflow",
  );
  // The hard bound, on the significand's digits alone.
  assert.ok(parseDecimal("9".repeat(300000)).ok);
  assertError(parseDecimal("9".repeat(320000)), "tooLarge");
  assertError(parseDecimal(`${"9".repeat(320000)}e-320000`), "tooLarge");
});

test("format renders like %g with the given significant digits", () => {
  const cases: [string, number, string][] = [
    ["0", 8, "0"],
    ["1", 8, "1"],
    ["-1", 8, "-1"],
    ["2.54", 8, "2.54"],
    ["100", 8, "100"],
    ["123456789", 8, "1.2345679e+8"],
    ["12345678", 8, "12345678"],
    ["1e8", 8, "1e+8"],
    ["99999999", 8, "99999999"],
    ["999999995", 8, "1e+9"],
    ["0.0001", 8, "0.0001"],
    ["0.00001", 8, "1e-5"],
    ["0.000123456789", 8, "0.00012345679"],
    ["0.0000123456789", 8, "1.2345679e-5"],
    ["1e21", 8, "1e+21"],
    ["1.5e21", 8, "1.5e+21"],
    ["1e-7", 8, "1e-7"],
    ["-1.5e-7", 8, "-1.5e-7"],
    ["6.62607015e-34", 8, "6.6260702e-34"],
    ["6.62607015e-34", 9, "6.62607015e-34"],
    ["3.14159", 3, "3.14"],
    ["3.14159", 1, "3"],
    ["9.99", 2, "10"],
    ["99.9", 2, "1e+2"],
    ["0.125", 2, "0.13"],
    ["0.5", 1, "0.5"],
    ["0.5", 20, "0.5"],
    ["1.000", 8, "1"],
    ["1234.5", 5, "1234.5"],
    ["1234.5", 4, "1235"],
    ["-1234.5", 4, "-1235"],
  ];
  const nearest = "halfAwayFromZero";
  for (const [text, digits, expected] of cases) {
    assert.equal(
      format(dec(text), digits, nearest),
      expected,
      `${text} @ ${digits}`,
    );
  }
  assert.equal(format(q(1n, 3n), 8, nearest), "0.33333333");
  assert.equal(format(q(2n, 3n), 8, nearest), "0.66666667");
  assert.equal(format(q(-2n, 3n), 8, nearest), "-0.66666667");
  assert.equal(format(q(1n, 3n), 1, nearest), "0.3");
  assert.equal(format(q(1n, 7n), 12, nearest), "0.142857142857");
  assert.equal(format(q(100n, 3n), 3, nearest), "33.3");
  assert.equal(format(q(1000n, 3n), 3, nearest), "333");
  assert.equal(format(q(10000n, 3n), 3, nearest), "3.33e+3");
  assert.equal(format(q(1n, 300n), 3, nearest), "0.00333");
  assert.equal(format(q(1n, 3000n), 3, nearest), "0.000333");
  assert.equal(format(q(1n, 30000n), 3, nearest), "3.33e-5");
  assert.equal(
    format(dec("1.41421356237309504880168872420969807856"), 8, nearest),
    "1.4142136",
  );
  // The GNU units default: 1 m in inches, to 8 digits.
  assert.equal(
    format(unwrap(divide(q(100n), dec("2.54"))), 8, nearest),
    "39.370079",
  );
  assert.throws(() => format(ONE, 0, nearest), RangeError);
});

test("format rounds in the mode it is given", () => {
  assert.equal(format(dec("2.54"), 2, "ceiling"), "2.6");
  assert.equal(format(dec("2.54"), 2, "floor"), "2.5");
  assert.equal(format(dec("-2.54"), 2, "ceiling"), "-2.5");
  assert.equal(format(dec("-2.54"), 2, "floor"), "-2.6");
  assert.equal(format(dec("2.55"), 2, "halfEven"), "2.6");
  assert.equal(format(dec("2.45"), 2, "halfEven"), "2.4");
  assert.equal(format(dec("2.45"), 2, "halfAwayFromZero"), "2.5");
  assert.equal(format(dec("2.45"), 2, "halfTowardZero"), "2.4");
  assert.equal(format(dec("0.125"), 2, "halfEven"), "0.12");
  assert.equal(format(dec("0.125"), 2, "towardZero"), "0.12");
  assert.equal(format(dec("0.121"), 2, "awayFromZero"), "0.13");
  assert.equal(format(q(1n, 3n), 8, "ceiling"), "0.33333334");
  assert.equal(format(q(-1n, 3n), 8, "ceiling"), "-0.33333333");
  assert.equal(format(q(2n, 3n), 8, "floor"), "0.66666666");
  assert.equal(format(q(-2n, 3n), 8, "floor"), "-0.66666667");
  // The carry across a power of ten holds in every mode that rounds up.
  assert.equal(format(dec("9.99"), 2, "ceiling"), "10");
  assert.equal(format(dec("9.91"), 2, "ceiling"), "10");
  assert.equal(format(dec("9.99"), 2, "awayFromZero"), "10");
  assert.equal(format(dec("-9.99"), 2, "floor"), "-10");
  assert.equal(format(dec("99.9"), 2, "ceiling"), "1e+2");
  assert.equal(format(dec("0.0999"), 1, "ceiling"), "0.1");
  assert.equal(format(dec("999999999"), 8, "ceiling"), "1e+9");
  // And never in one that rounds down.
  assert.equal(format(dec("9.99"), 2, "floor"), "9.9");
  assert.equal(format(dec("9.99"), 2, "towardZero"), "9.9");
  assert.equal(format(dec("-9.99"), 2, "ceiling"), "-9.9");
  assert.equal(format(dec("999999999"), 8, "floor"), "9.9999999e+8");
  // A value that shows exactly shows the same in every mode.
  for (const mode of ROUNDING_MODES) {
    assert.equal(format(dec("2.54"), 8, mode), "2.54", mode);
    assert.equal(format(dec("-1.5e-7"), 8, mode), "-1.5e-7", mode);
    assert.equal(format(ZERO, 8, mode), "0", mode);
  }
});

test("format and parseDecimal round-trip", () => {
  for (const text of [
    "0",
    "1",
    "-1",
    "2.54",
    "1e+21",
    "1e-7",
    "0.0001",
    "12345678",
    "1.2345679e+8",
  ]) {
    assert.equal(format(dec(text), 8, "halfAwayFromZero"), text);
  }
});

test("format and roundTo write a value of any exponent without forming it, against Python's decimal module", () => {
  // Python's decimal module at the digits, in each mode, with Emax raised
  // to 10^18 - 1: `format(+Decimal(text), "g")`.
  const cases: [string, number, Record<RoundingMode, string>][] = [
    ["1e999999999", 8, same("1e+999999999")],
    ["1e1999999998", 30, same("1e+1999999998")],
    ["1.5e-999999999", 8, same("1.5e-999999999")],
    [
      "1.5e-999999999",
      1,
      {
        halfEven: "2e-999999999",
        halfAwayFromZero: "2e-999999999",
        halfTowardZero: "1e-999999999",
        towardZero: "1e-999999999",
        awayFromZero: "2e-999999999",
        ceiling: "2e-999999999",
        floor: "1e-999999999",
      },
    ],
    [
      "-1.5e-999999999",
      1,
      {
        halfEven: "-2e-999999999",
        halfAwayFromZero: "-2e-999999999",
        halfTowardZero: "-1e-999999999",
        towardZero: "-1e-999999999",
        awayFromZero: "-2e-999999999",
        ceiling: "-1e-999999999",
        floor: "-2e-999999999",
      },
    ],
    [
      "9.99e999999999",
      1,
      {
        halfEven: "1e+1000000000",
        halfAwayFromZero: "1e+1000000000",
        halfTowardZero: "1e+1000000000",
        towardZero: "9e+999999999",
        awayFromZero: "1e+1000000000",
        ceiling: "1e+1000000000",
        floor: "9e+999999999",
      },
    ],
    ["9.99e999999999", 8, same("9.99e+999999999")],
    [
      "1.23456789e999999999",
      8,
      {
        halfEven: "1.2345679e+999999999",
        halfAwayFromZero: "1.2345679e+999999999",
        halfTowardZero: "1.2345679e+999999999",
        towardZero: "1.2345678e+999999999",
        awayFromZero: "1.2345679e+999999999",
        ceiling: "1.2345679e+999999999",
        floor: "1.2345678e+999999999",
      },
    ],
    ["1.23456789e999999999", 30, same("1.23456789e+999999999")],
    [
      "-2.5e-999999999",
      1,
      {
        halfEven: "-2e-999999999",
        halfAwayFromZero: "-3e-999999999",
        halfTowardZero: "-2e-999999999",
        towardZero: "-2e-999999999",
        awayFromZero: "-3e-999999999",
        ceiling: "-2e-999999999",
        floor: "-3e-999999999",
      },
    ],
  ];
  for (const [text, digits, expected] of cases) {
    const value = dec(text);
    for (const mode of ROUNDING_MODES) {
      const label = `${text} at ${digits} under ${mode}`;
      assert.equal(format(value, digits, mode), expected[mode], label);
      // The rounded value reads back as what was written.
      assert.deepEqual(
        roundTo(value, digits, mode),
        dec(expected[mode]),
        label,
      );
    }
  }
  // The square of `1e999999999` and its product, from the arithmetic.
  assert.equal(
    format(
      unwrap(multiply(dec("1e999999999"), dec("1e999999999"))),
      8,
      "halfEven",
    ),
    "1e+1999999998",
  );
  assert.equal(
    format(
      unwrap(multiply(dec("2.5e999999999"), dec("4e-999999999"))),
      8,
      "halfEven",
    ),
    "10",
  );
});

/** The same text in every mode. */
function same(text: string): Record<RoundingMode, string> {
  return Object.fromEntries(
    ROUNDING_MODES.map((mode) => [mode, text]),
  ) as Record<RoundingMode, string>;
}

test("format, roundTo, trunc and decimalExponent are functions of the value, not of where its power of ten sits", () => {
  const forms: [string, Scaled[]][] = [
    [
      "2.54",
      [
        dec("2.54"),
        q(254n, 100n),
        q(127n, 50n),
        unwrap(scaled(rational(127n, 50n), 0n)),
        unwrap(scaled(rational(254n), -2n)),
        unwrap(scaled(rational(2540n), -3n)),
      ],
    ],
    [
      "1000",
      [
        dec("1e3"),
        dec("1000"),
        q(1000n),
        unwrap(scaled(rational(10n), 2n)),
        unwrap(scaled(rational(1n), 3n)),
      ],
    ],
    [
      "-0.125",
      [
        dec("-0.125"),
        q(-1n, 8n),
        unwrap(scaled(rational(-125n), -3n)),
        unwrap(scaled(rational(-1n, 8n), 0n)),
      ],
    ],
  ];
  for (const [label, values] of forms) {
    const [first, ...rest] = values;
    for (const other of rest) {
      assert.deepEqual(other, first, label);
      assert.equal(decimalExponent(other), decimalExponent(first!), label);
      assert.deepEqual(trunc(other, 64), trunc(first!, 64), label);
      for (const digits of [1, 2, 3, 8]) {
        for (const mode of ROUNDING_MODES) {
          assert.equal(
            format(other, digits, mode),
            format(first!, digits, mode),
            `${label} at ${digits} under ${mode}`,
          );
          assert.deepEqual(
            roundTo(other, digits, mode),
            roundTo(first!, digits, mode),
            `${label} at ${digits} under ${mode}`,
          );
        }
      }
    }
  }
});

test("trunc drops the fraction toward zero, and says when the integer part cannot be formed", () => {
  const limit = 1 << 16;
  assert.deepEqual(trunc(q(7n, 2n), limit), q(3n));
  assert.deepEqual(trunc(q(-7n, 2n), limit), q(-3n));
  assert.deepEqual(trunc(q(1n, 3n), limit), ZERO);
  assert.deepEqual(trunc(q(-1n, 3n), limit), ZERO);
  assert.deepEqual(trunc(q(5n), limit), q(5n));
  assert.deepEqual(trunc(ZERO, limit), ZERO);
  assert.deepEqual(trunc(dec("1234.5678"), limit), q(1234n));
  assert.deepEqual(trunc(dec("-0.999"), limit), ZERO);
  assert.deepEqual(trunc(dec("1e-999999999"), limit), ZERO);
  // An integer of any size is its own truncation, whatever the limit.
  assert.deepEqual(trunc(dec("1e999999999"), 1), dec("1e999999999"));
  assert.deepEqual(trunc(dec("-1.25e999999999"), 1), dec("-1.25e999999999"));
  // A fractional value at a large exponent can be truncated only by forming it.
  assert.deepEqual(trunc(at(1n, 3n, 5n), limit), q(33333n));
  assert.equal(trunc(at(1n, 3n, 999999999n), limit), undefined);
  assert.equal(trunc(at(1n, 3n, 30000n), limit), undefined);
  assert.deepEqual(
    trunc(at(1n, 3n, 30000n), MAX_SIGNIFICAND_LIMIT_BITS),
    fromRational(rational(10n ** 30000n / 3n)),
  );
});

test("exactRoot divides the exponent and folds the remainder into the significand", () => {
  const limit = 1 << 16;
  const root = (s: Scaled, degree: bigint) =>
    unwrap(exactRoot(s, degree, limit));
  assert.deepEqual(root(q(4n), 2n), q(2n));
  assert.deepEqual(root(q(9n, 4n), 2n), q(3n, 2n));
  assert.deepEqual(root(dec("2.25"), 2n), dec("1.5"));
  assert.deepEqual(root(q(-8n, 27n), 3n), q(-2n, 3n));
  assert.deepEqual(root(q(1n, 1024n), 10n), q(1n, 2n));
  assert.deepEqual(root(ONE, 7n), ONE);
  assert.deepEqual(root(ZERO, 2n), ZERO);
  assert.deepEqual(root(q(2n), 1n), q(2n));
  assert.deepEqual(root(dec("-7e-999999999"), 1n), dec("-7e-999999999"));
  // The exponent divides, or its remainder is folded in.
  assert.deepEqual(root(dec("1e999999998"), 2n), dec("1e499999999"));
  assert.deepEqual(root(dec("4e-999999998"), 2n), dec("2e-499999999"));
  assert.deepEqual(root(dec("1e-999999999"), 3n), dec("1e-333333333"));
  assert.deepEqual(root(dec("1e4"), 2n), dec("100"));
  assert.deepEqual(root(dec("1e-3"), 2n), undefined);
  assert.deepEqual(root(dec("1e-2"), 2n), dec("0.1"));
  assert.deepEqual(root(dec("0.04"), 2n), dec("0.2"));
  assert.deepEqual(root(dec("4e5"), 2n), undefined);
  assert.deepEqual(root(dec("4e6"), 2n), dec("2e3"));
  assert.deepEqual(root(dec("1e999999999"), 2n), undefined);
  assert.deepEqual(root(dec("2.5e-7"), 2n), dec("5e-4"));
  assert.equal(root(q(2n), 2n), undefined);
  assert.equal(root(q(8n), 2n), undefined);
  assert.equal(root(dec("2.5"), 2n), undefined);
  assert.equal(root(q(2n), 10n ** 9n), undefined);
  assert.deepEqual(root(ONE, 10n ** 9n), ONE);
  // A remainder that cannot be formed is no exact root.
  assert.equal(root(dec("1e999999999"), 100000n), undefined);
  assert.deepEqual(unwrap(exactRoot(dec("1e50000"), 50000n, limit)), dec("10"));
  const failed = exactRoot(q(-4n), 2n, limit);
  assert.ok(!failed.ok);
  assert.deepEqual(failed.error, { kind: "negativeRadicand", degree: 2n });
  assertError(exactRoot(dec("-1e-999999999"), 4n, limit), "negativeRadicand");
  assert.throws(() => exactRoot(q(2n), 0n, limit), RangeError);
});

// ---------------------------------------------------------------------------
// The rounding and formatting of fractions, through the boundary of 4.3

/** One unit in the last of `digits` significant digits of `r`. */
function ulp(r: Rational, digits: number): Rational {
  const shift = Number(decimalExponent(fromRational(r))) - digits + 1;
  return shift >= 0
    ? rational(10n ** BigInt(shift))
    : rational(1n, 10n ** BigInt(-shift));
}

/** `10^e <= |r| < 10^(e+1)`. */
function assertExponent(r: Rational, e: number) {
  const lower =
    e >= 0 ? rational(10n ** BigInt(e)) : rational(1n, 10n ** BigInt(-e));
  const upper = multiplyFractions(lower, rational(10n));
  assert.ok(
    compareFractions(absoluteFraction(r), lower) >= 0,
    `${toFraction(r)} >= 10^${e}`,
  );
  assert.ok(
    compareFractions(absoluteFraction(r), upper) < 0,
    `${toFraction(r)} < 10^${e + 1}`,
  );
}

test("roundTo is within an ulp on the side its mode says, and format agrees with it", () => {
  const half = rational(1n, 2n);
  for (const r of randomRationals(300, 4301)) {
    if (isZeroFraction(r)) continue;
    assertExponent(r, Number(decimalExponent(fromRational(r))));
    for (const digits of [1, 2, 5, 8, 12]) {
      const u = ulp(r, digits);
      for (const mode of ROUNDING_MODES) {
        const n = roundFraction(r, digits, mode);
        const label = `${toFraction(r)} at ${digits} under ${mode}`;
        const error = subtractFractions(n, r);
        assert.ok(
          compareFractions(absoluteFraction(error), u) < 0,
          `${label}: within an ulp`,
        );
        assert.ok(
          signFraction(n) === signFraction(r),
          `${label}: keeps the sign`,
        );
        // The rounded value has at most `digits` significant digits:
        // rescaled by its own ulp, it is an integer.
        assert.ok(
          isIntegerFraction(
            multiplyFractions(n, unwrap(invertFraction(ulp(n, digits)))),
          ),
          `${label}: digits`,
        );
        // The side, by mode.
        switch (mode) {
          case "halfEven":
          case "halfAwayFromZero":
          case "halfTowardZero":
            assert.ok(
              compareFractions(
                absoluteFraction(error),
                multiplyFractions(u, half),
              ) <= 0,
              `${label}: within half an ulp`,
            );
            break;
          case "towardZero":
            assert.ok(
              compareFractions(absoluteFraction(n), absoluteFraction(r)) <= 0,
              label,
            );
            break;
          case "awayFromZero":
            assert.ok(
              compareFractions(absoluteFraction(n), absoluteFraction(r)) >= 0,
              label,
            );
            break;
          case "ceiling":
            assert.ok(compareFractions(n, r) >= 0, label);
            break;
          case "floor":
            assert.ok(compareFractions(n, r) <= 0, label);
            break;
        }
        const text = formatFraction(r, digits, mode);
        assert.ok(
          equalsFractions(unwrap(parseFraction(text)), n),
          `${label}: format gives ${text}`,
        );
      }
      // The two truncations agree, and ceiling and floor bracket the value.
      assert.ok(
        equalsFractions(
          roundFraction(r, digits, "towardZero"),
          signFraction(r) > 0
            ? roundFraction(r, digits, "floor")
            : roundFraction(r, digits, "ceiling"),
        ),
      );
    }
  }
});
