import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  LIMIT_BITS,
  absolute as absoluteFraction,
  add as addFractions,
  compare as compareFractions,
  divide as divideFractions,
  invert as invertFraction,
  multiply as multiplyFractions,
  negate as negateFraction,
  parseDecimal,
  pow as powFraction,
  rational,
  subtract as subtractFractions,
  ZERO as ZERO_FRACTION,
  type Rational,
} from "./rational.ts";
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
  fromRational,
  invert,
  isInteger,
  isZero,
  log2Bounds,
  multiply,
  negate,
  pow,
  scaled,
  sign,
  subtract,
  toRational,
  type Log2,
  type Scaled,
  type ScaledError,
} from "./scaled.ts";
import { key, randomRational, split } from "../testing/random.ts";

function unwrap<T>(result: Result<T, ScaledError>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function assertError(result: Result<unknown, ScaledError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

/** A decimal literal, as a fraction, then as a `Scaled`. */
function dec(text: string): Scaled {
  const parsed = parseDecimal(text);
  assert.ok(parsed.ok, text);
  return fromRational(parsed.value);
}

/** `num / den × 10^exp`, which must be within the bound. */
function at(num: bigint, den: bigint, exp: bigint): Scaled {
  return unwrap(scaled(rational(num, den), exp));
}

/** `mant × 10^exp` for a literal with an exponent today's `parseDecimal` refuses (until 4.3). */
function big(mant: string, exp: bigint): Scaled {
  const parsed = parseDecimal(mant);
  assert.ok(parsed.ok, mant);
  return unwrap(scaled(parsed.value, exp));
}

/** `count` seeded rationals of about seven digits over seven, at magnitudes up to `10^±12`. */
function randomRationals(count: number, seed: number): Rational[] {
  return split(key(seed), count).map((k) => randomRational(k, 24, 12));
}

// ---------------------------------------------------------------------------
// The canonical form

test("one value has one representation, wherever its powers of ten sit", () => {
  const twoFiftyFour = { mant: rational(254n), exp: -2n };
  assert.deepEqual(dec("2.54"), twoFiftyFour);
  assert.deepEqual(at(254n, 100n, 0n), twoFiftyFour);
  assert.deepEqual(at(127n, 50n, 0n), twoFiftyFour);
  assert.deepEqual(at(254n, 1n, -2n), twoFiftyFour);
  assert.deepEqual(at(2540n, 1n, -3n), twoFiftyFour);
  assert.deepEqual(at(127n, 5n, -1n), twoFiftyFour);
  const thousand = { mant: rational(1n), exp: 3n };
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
  assert.deepEqual(at(1n, 6n, 0n), { mant: rational(5n, 3n), exp: -1n });
  assert.deepEqual(at(1n, 1024n, 0n), { mant: rational(5n ** 10n), exp: -10n });
  assert.deepEqual(at(1n, 125n, 0n), { mant: rational(8n), exp: -3n });
  assert.deepEqual(at(3n, 50n, 0n), { mant: rational(6n), exp: -2n });
  assert.deepEqual(at(7n, 12n, 0n), { mant: rational(175n, 3n), exp: -2n });
  assert.deepEqual(at(1n, 3n, 0n), { mant: rational(1n, 3n), exp: 0n });
  // A denominator coprime to ten is left alone, and the mantissa stays in
  // lowest terms without a gcd: what moved is coprime to what stayed.
  assert.deepEqual(at(1n, 7n, 4n), { mant: rational(1n, 7n), exp: 4n });
});

test("the numerator's trailing zeros move into the exponent, with the sign kept", () => {
  assert.deepEqual(at(1200n, 1n, 0n), { mant: rational(12n), exp: 2n });
  assert.deepEqual(at(1200n, 7n, 0n), { mant: rational(12n, 7n), exp: 2n });
  assert.deepEqual(at(-1200n, 1n, 0n), { mant: rational(-12n), exp: 2n });
  assert.deepEqual(at(-1200n, 1n, -5n), { mant: rational(-12n), exp: -3n });
  // Twos or fives alone are not tens: the numerator keeps them.
  assert.deepEqual(at(40n, 1n, 0n), { mant: rational(4n), exp: 1n });
  assert.deepEqual(at(4n, 1n, 0n), { mant: rational(4n), exp: 0n });
  assert.deepEqual(at(25n, 1n, 0n), { mant: rational(25n), exp: 0n });
  assert.deepEqual(at(250n, 1n, 0n), { mant: rational(25n), exp: 1n });
});

test("a mantissa full of tens, twos or fives is normalized in a logarithmic number of divisions", () => {
  const started = performance.now();
  assert.deepEqual(fromRational(rational(10n ** 20000n)), at(1n, 1n, 20000n));
  assert.deepEqual(fromRational(rational(1n, 5n ** 20000n)), {
    mant: rational(1n << 20000n),
    exp: -20000n,
  });
  assert.deepEqual(fromRational(rational(1n, 1n << 20000n)), {
    mant: rational(5n ** 20000n),
    exp: -20000n,
  });
  assert.deepEqual(fromRational(rational(3n * 10n ** 20001n, 7n)), {
    mant: rational(3n, 7n),
    exp: 20001n,
  });
  assert.deepEqual(fromRational(rational(2n ** 20000n * 5n ** 19999n)), {
    mant: rational(2n),
    exp: 19999n,
  });
  assert.ok(performance.now() - started < 2000, "fast");
});

test("zero is zero with exponent zero, whatever exponent it was given", () => {
  assert.deepEqual(at(0n, 1n, 0n), ZERO);
  assert.deepEqual(at(0n, 7n, 999n), ZERO);
  assert.deepEqual(unwrap(scaled(ZERO_FRACTION, MAX_EXPONENT * 5n)), ZERO);
  assert.deepEqual(fromRational(ZERO_FRACTION), ZERO);
  assert.deepEqual(ONE, { mant: rational(1n), exp: 0n });
});

test("the exponent bound is checked after normalizing", () => {
  assert.ok(scaled(rational(1n), MAX_EXPONENT).ok);
  assert.ok(scaled(rational(1n), -MAX_EXPONENT).ok);
  assertError(scaled(rational(1n), MAX_EXPONENT + 1n), "tooLarge");
  assertError(scaled(rational(1n), -MAX_EXPONENT - 1n), "tooLarge");
  // `10 × 10^MAX` normalizes to `1 × 10^(MAX + 1)`, which is out of bounds.
  assertError(scaled(rational(10n), MAX_EXPONENT), "tooLarge");
  assert.ok(scaled(rational(1n, 10n), MAX_EXPONENT).ok);
  assertError(scaled(rational(1n, 10n), -MAX_EXPONENT), "tooLarge");
});

test("seeded fractions round-trip and equal structurally whichever form they were built from", () => {
  for (const r of randomRationals(100, 4101)) {
    const s = fromRational(r);
    assert.deepEqual(unwrap(toRational(s, LIMIT_BITS)), r);
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

test("decimalExponent is the mantissa's plus the exponent, for any exponent", () => {
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
    unwrap(toRational(dec("1e5000"), LIMIT_BITS)),
    rational(10n ** 5000n),
  );
  assert.deepEqual(
    unwrap(toRational(dec("1e-5000"), LIMIT_BITS)),
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
  assert.ok(toRational(big("1", 300000n), LIMIT_BITS).ok);
  assertError(toRational(big("1", 400000n), LIMIT_BITS), "tooLarge");
  assertError(toRational(big("1", -400000n), LIMIT_BITS), "tooLarge");
  assertError(toRational(big("1", 999999999n), LIMIT_BITS), "tooLarge");
  assertError(toRational(big("1", -999999999n), LIMIT_BITS), "tooLarge");
  const sixteen = 1 << 16;
  assert.ok(toRational(dec("1e19000"), sixteen).ok);
  assertError(toRational(big("1", 300000n), sixteen), "tooLarge");
  // The mantissa's digits count with the exponent's.
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
      Math.log2(Math.abs(Number(s.mant.num))) -
      Math.log2(Number(s.mant.den)) +
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
      at(123456789n, 1n, 10n ** 18n),
      3321928094887362374n,
      0.749750362349863997,
    ],
    [at(1n, 3n, 10n ** 18n), 3321928094887362346n, 0.285356928768233994],
    [at(-5n, 7n, -(10n ** 18n)), -3321928094887362349n, 0.644253743340368065],
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
  assertError(add(big("1", 999999999n), ONE, LIMIT_BITS), "tooLarge");
  assertError(subtract(ONE, big("1", -999999999n), LIMIT_BITS), "tooLarge");
  // `1e19000 + 1` aligns within the default range limit and not within
  // 60,000 bits, which is what the limit means.
  assert.deepEqual(
    unwrap(add(big("1", 19000n), ONE, sixteen)),
    fromRational(rational(10n ** 19000n + 1n)),
  );
  assertError(add(big("1", 19000n), ONE, 60000), "tooLarge");
  // The sum's own exponent is held to the bound.
  assertError(
    add(at(9n, 1n, MAX_EXPONENT), at(1n, 1n, MAX_EXPONENT), sixteen),
    "tooLarge",
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
  assertError(multiply(at(1n, 1n, half), at(1n, 1n, half + 1n)), "tooLarge");
  assertError(multiply(at(10n, 1n, half), at(1n, 1n, half)), "tooLarge");
  assert.ok(divide(at(1n, 1n, half), at(1n, 1n, -half)).ok);
  assertError(divide(at(1n, 1n, half), at(1n, 1n, -half - 1n)), "tooLarge");
  assertError(divide(at(1n, 1n, -half), at(1n, 1n, half + 1n)), "tooLarge");
  assert.ok(invert(at(1n, 1n, MAX_EXPONENT)).ok);
  assertError(invert(at(5n, 1n, MAX_EXPONENT)), "tooLarge");
});

test("pow raises the mantissa against the limit and the exponent against the bound", () => {
  assert.deepEqual(
    unwrap(pow(dec("10"), 1442695n, LIMIT_BITS)),
    at(1n, 1n, 1442695n),
  );
  assertError(pow(dec("2"), 1442695n, LIMIT_BITS), "tooLarge");
  assert.deepEqual(
    unwrap(pow(dec("1e9"), 10n ** 9n, LIMIT_BITS)),
    at(1n, 1n, 9n * 10n ** 9n),
  );
  assert.deepEqual(unwrap(pow(dec("2.54"), 2n, LIMIT_BITS)), dec("6.4516"));
  assert.deepEqual(
    unwrap(pow(dec("2.54"), -1n, LIMIT_BITS)),
    at(50n, 127n, 0n),
  );
  assert.deepEqual(unwrap(pow(dec("2e3"), 3n, LIMIT_BITS)), dec("8e9"));
  assert.deepEqual(unwrap(pow(dec("2e3"), -3n, LIMIT_BITS)), at(1n, 8n, -9n));
  assert.deepEqual(unwrap(pow(ZERO, 0n, LIMIT_BITS)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 5n, LIMIT_BITS)), ZERO);
  assertError(pow(ZERO, -1n, LIMIT_BITS), "divisionByZero");
  assert.deepEqual(unwrap(pow(big("1", 999999999n), 0n, LIMIT_BITS)), ONE);
  // The exponent's bound, at it and past it; the mantissa's limit.
  assert.ok(pow(dec("1e9"), 10n ** 9n, LIMIT_BITS).ok);
  assertError(pow(dec("1e9"), 10n ** 18n, LIMIT_BITS), "tooLarge");
  assertError(pow(dec("1e-9"), 10n ** 18n, LIMIT_BITS), "tooLarge");
  assertError(pow(dec("1e9"), 2n * 10n ** 17n, LIMIT_BITS), "tooLarge");
  assert.ok(pow(dec("1e9"), 10n ** 17n, LIMIT_BITS).ok);
  assertError(pow(dec("2"), 100n, 64), "tooLarge");
  assert.ok(pow(dec("2"), 30n, 64).ok);
  assertError(pow(dec("3e9"), 100_000n, 1 << 16), "tooLarge");
});

test("every operation agrees with the fraction's through toRational where the values fit", () => {
  const values = randomRationals(40, 4201);
  for (const a of values) {
    for (const b of values.slice(0, 10)) {
      const sa = fromRational(a);
      const sb = fromRational(b);
      const back = (s: Scaled) => unwrap(toRational(s, LIMIT_BITS));
      assert.deepEqual(
        back(unwrap(add(sa, sb, LIMIT_BITS))),
        addFractions(a, b),
      );
      assert.deepEqual(
        back(unwrap(subtract(sa, sb, LIMIT_BITS))),
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
        const power = powFraction(a, n, LIMIT_BITS);
        if (power.ok) {
          assert.deepEqual(back(unwrap(pow(sa, n, LIMIT_BITS))), power.value);
        } else {
          assertError(pow(sa, n, LIMIT_BITS), power.error.kind);
        }
      }
    }
  }
});
