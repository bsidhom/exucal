import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  equals,
  invert,
  isInteger,
  isZero,
  multiply,
  negate,
  pow,
  exactRoot,
  gcd,
  rational,
  scaleByPowerOfTwo,
  sign,
  subtract,
  toFraction,
  trunc,
  type Rational,
  type RationalError,
} from "./rational.ts";
import type { Result } from "./result.ts";
import { inLowestTerms, parseFraction } from "../testing/fraction.ts";
import { key, randomBigInt, randomRational, split } from "../testing/random.ts";

/** Unwraps a result that is expected to succeed. */
function unwrap<T>(result: Result<T, unknown>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

/** The fraction a decimal literal denotes, through scaled.ts's `parseDecimal` (4.3). */
function dec(text: string): Rational {
  return unwrap(parseFraction(text));
}

/** Asserts that a result failed with the given kind of error. */
function assertError(result: Result<unknown, RationalError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

// ---------------------------------------------------------------------------
// Construction

test("rational normalizes to lowest terms with a positive denominator", () => {
  assert.deepEqual(rational(6n, 4n), { num: 3n, den: 2n });
  assert.deepEqual(rational(6n, -4n), { num: -3n, den: 2n });
  assert.deepEqual(rational(-6n, -4n), { num: 3n, den: 2n });
  assert.deepEqual(rational(0n, -7n), { num: 0n, den: 1n });
  assert.deepEqual(rational(5n), { num: 5n, den: 1n });
  assert.deepEqual(rational(-1n, 1n), { num: -1n, den: 1n });
});

test("a zero denominator is a programming error", () => {
  assert.throws(() => rational(1n, 0n), RangeError);
});

test("inspection", () => {
  assert.ok(isZero(ZERO));
  assert.ok(!isZero(ONE));
  assert.ok(isInteger(rational(-4n, 2n)));
  assert.ok(!isInteger(rational(1n, 2n)));
  assert.equal(sign(rational(-1n, 3n)), -1);
  assert.equal(sign(ZERO), 0);
  assert.equal(sign(rational(1n, 3n)), 1);
  assert.equal(toFraction(rational(-6n, 4n)), "-3/2");
  assert.equal(toFraction(rational(4n, 2n)), "2");
});

test("comparison", () => {
  assert.equal(compare(rational(1n, 3n), rational(1n, 2n)), -1);
  assert.equal(compare(rational(1n, 2n), rational(1n, 3n)), 1);
  assert.equal(compare(rational(2n, 4n), rational(1n, 2n)), 0);
  assert.equal(compare(rational(-1n, 2n), rational(-1n, 3n)), -1);
  assert.ok(equals(rational(2n, 4n), rational(1n, 2n)));
  assert.ok(!equals(rational(1n, 2n), rational(-1n, 2n)));
});

// ---------------------------------------------------------------------------
// Exact arithmetic

test("add, subtract, multiply, negate and absolute are exact", () => {
  const half = rational(1n, 2n);
  const third = rational(1n, 3n);
  assert.deepEqual(add(half, third), rational(5n, 6n));
  assert.deepEqual(subtract(half, third), rational(1n, 6n));
  assert.deepEqual(subtract(third, half), rational(-1n, 6n));
  assert.deepEqual(multiply(half, third), rational(1n, 6n));
  assert.deepEqual(multiply(rational(2n, 3n), rational(3n, 2n)), ONE);
  assert.deepEqual(negate(half), rational(-1n, 2n));
  assert.deepEqual(negate(ZERO), ZERO);
  assert.deepEqual(absolute(rational(-1n, 2n)), half);
  assert.deepEqual(absolute(half), half);
  // The classic floating-point failure is exact here.
  assert.deepEqual(add(dec("0.1"), dec("0.2")), dec("0.3"));
});

test("divide and invert fail on zero", () => {
  assert.deepEqual(
    unwrap(divide(rational(1n, 2n), rational(1n, 3n))),
    rational(3n, 2n),
  );
  assert.deepEqual(
    unwrap(divide(rational(1n, 2n), rational(-1n, 3n))),
    rational(-3n, 2n),
  );
  assert.deepEqual(unwrap(divide(ZERO, rational(-1n, 3n))), ZERO);
  assert.deepEqual(unwrap(invert(rational(-2n, 3n))), rational(-3n, 2n));
  assertError(divide(ONE, ZERO), "divisionByZero");
  assertError(divide(ZERO, ZERO), "divisionByZero");
  assertError(invert(ZERO), "divisionByZero");
});

test("pow with an integer exponent is exact", () => {
  const twoThirds = rational(2n, 3n);
  assert.deepEqual(
    unwrap(pow(twoThirds, 3n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(8n, 27n),
  );
  assert.deepEqual(
    unwrap(pow(twoThirds, -3n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(27n, 8n),
  );
  assert.deepEqual(unwrap(pow(twoThirds, 0n, MAX_SIGNIFICAND_LIMIT_BITS)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 0n, MAX_SIGNIFICAND_LIMIT_BITS)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 5n, MAX_SIGNIFICAND_LIMIT_BITS)), ZERO);
  assert.deepEqual(
    unwrap(pow(rational(-2n), 3n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(-8n),
  );
  assert.deepEqual(
    unwrap(pow(rational(-2n), 2n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(4n),
  );
  assert.deepEqual(
    unwrap(pow(rational(-1n, 2n), -2n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(4n),
  );
  assert.deepEqual(
    unwrap(pow(dec("2.54"), 2n, MAX_SIGNIFICAND_LIMIT_BITS)),
    dec("6.4516"),
  );
  assertError(pow(ZERO, -1n, MAX_SIGNIFICAND_LIMIT_BITS), "divisionByZero");
});

test("pow refuses results beyond the size limit, but not trivial ones", () => {
  assert.deepEqual(
    unwrap(pow(rational(10n), 5000n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(10n ** 5000n),
  );
  assertError(
    pow(
      rational(2n),
      BigInt(MAX_SIGNIFICAND_LIMIT_BITS + 1),
      MAX_SIGNIFICAND_LIMIT_BITS,
    ),
    "tooLarge",
  );
  // The limit is the caller's: the context's significand limit.
  assertError(pow(rational(2n), 100n, 64), "tooLarge");
  assert.ok(pow(rational(2n), 30n, 64).ok);
  const sixteen = 1 << 16;
  assertError(pow(rational(10n), 100_000n, sixteen), "tooLarge");
  assertError(pow(rational(10n), -100_000n, sixteen), "tooLarge");
  assertError(pow(rational(1n, 10n), 100_000n, sixteen), "tooLarge");
  assert.ok(pow(rational(10n), 100_000n, MAX_SIGNIFICAND_LIMIT_BITS).ok);
  assertError(
    pow(rational(10n), 400_000n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  assertError(
    pow(rational(2n), 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS),
    "tooLarge",
  );
  // 0, 1 and -1 never grow.
  assert.deepEqual(
    unwrap(pow(ONE, 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS)),
    ONE,
  );
  assert.deepEqual(
    unwrap(pow(rational(-1n), 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS)),
    ONE,
  );
  assert.deepEqual(
    unwrap(pow(rational(-1n), 10n ** 30n + 1n, MAX_SIGNIFICAND_LIMIT_BITS)),
    rational(-1n),
  );
  assert.deepEqual(
    unwrap(pow(ZERO, 10n ** 30n, MAX_SIGNIFICAND_LIMIT_BITS)),
    ZERO,
  );
});

// ---------------------------------------------------------------------------
// Roots

test("exactRoot finds rational roots", () => {
  assert.deepEqual(unwrap(exactRoot(rational(4n), 2n)), rational(2n));
  assert.deepEqual(unwrap(exactRoot(rational(9n, 4n), 2n)), rational(3n, 2n));
  assert.deepEqual(unwrap(exactRoot(dec("2.25"), 2n)), dec("1.5"));
  assert.deepEqual(
    unwrap(exactRoot(rational(-8n, 27n), 3n)),
    rational(-2n, 3n),
  );
  assert.deepEqual(
    unwrap(exactRoot(rational(1n, 1024n), 10n)),
    rational(1n, 2n),
  );
  assert.deepEqual(unwrap(exactRoot(ONE, 7n)), ONE);
  assert.deepEqual(unwrap(exactRoot(ZERO, 2n)), ZERO);
  // Degree 1 is the identity, whatever the value.
  assert.deepEqual(unwrap(exactRoot(rational(2n), 1n)), rational(2n));
  assert.deepEqual(unwrap(exactRoot(rational(-7n, 3n), 1n)), rational(-7n, 3n));
  // A rational root is exact whatever the degree.
  assert.deepEqual(unwrap(exactRoot(ONE, 10n ** 9n)), ONE);
  assert.deepEqual(unwrap(exactRoot(ZERO, 10n ** 9n)), ZERO);
});

test("exactRoot says when a root is irrational", () => {
  assert.equal(unwrap(exactRoot(rational(2n), 2n)), undefined);
  assert.equal(unwrap(exactRoot(rational(8n), 2n)), undefined);
  assert.equal(unwrap(exactRoot(rational(4n, 3n), 2n)), undefined);
  assert.equal(unwrap(exactRoot(rational(3n, 4n), 2n)), undefined);
  assert.equal(unwrap(exactRoot(rational(-2n), 3n)), undefined);
  assert.equal(unwrap(exactRoot(dec("2.5"), 2n)), undefined);
  assert.equal(unwrap(exactRoot(rational(2n), 10n ** 9n)), undefined);
});

test("even roots of negative numbers fail", () => {
  const result = exactRoot(rational(-4n), 2n);
  assert.ok(!result.ok);
  assert.deepEqual(result.error, { kind: "negativeRadicand", degree: 2n });
  assertError(exactRoot(rational(-1n, 16n), 4n), "negativeRadicand");
});

test("the root checks its preconditions", () => {
  assert.throws(() => exactRoot(rational(2n), 0n), RangeError);
  assert.throws(() => exactRoot(rational(2n), -2n), RangeError);
});

test("scaleByPowerOfTwo multiplies by a power of two exactly, in lowest terms", () => {
  assert.deepEqual(scaleByPowerOfTwo(rational(3n, 8n), 2n), rational(3n, 2n));
  assert.deepEqual(scaleByPowerOfTwo(rational(3n, 8n), 3n), rational(3n));
  assert.deepEqual(scaleByPowerOfTwo(rational(3n, 8n), 5n), rational(12n));
  assert.deepEqual(scaleByPowerOfTwo(rational(12n), -2n), rational(3n));
  assert.deepEqual(scaleByPowerOfTwo(rational(12n), -3n), rational(3n, 2n));
  assert.deepEqual(
    scaleByPowerOfTwo(rational(-12n, 5n), -4n),
    rational(-3n, 20n),
  );
  assert.deepEqual(scaleByPowerOfTwo(rational(7n, 3n), 0n), rational(7n, 3n));
  assert.deepEqual(scaleByPowerOfTwo(ZERO, 100n), ZERO);
  for (const r of randomRationals(60)) {
    for (const k of [-70n, -3n, 1n, 64n]) {
      const scaled = scaleByPowerOfTwo(r, k);
      const factor = unwrap(pow(rational(2n), k, MAX_SIGNIFICAND_LIMIT_BITS));
      assert.deepEqual(scaled, multiply(r, factor));
    }
  }
});

test("trunc drops the fraction, toward zero", () => {
  assert.equal(toFraction(trunc(rational(7n, 2n))), "3");
  assert.equal(toFraction(trunc(rational(-7n, 2n))), "-3");
  assert.equal(toFraction(trunc(rational(1n, 3n))), "0");
  assert.equal(toFraction(trunc(rational(-1n, 3n))), "0");
  assert.equal(toFraction(trunc(rational(5n))), "5");
  assert.equal(toFraction(trunc(ZERO)), "0");
});

// ---------------------------------------------------------------------------
// Properties over pseudo-random inputs

/** `count` seeded rationals of about six digits over six, at magnitudes up to `10^±20`. */
function randomRationals(count: number): Rational[] {
  return split(key(12345), count).map((k) => randomRational(k, 20, 20));
}

/**
 * Fractions at the edges of the reductions: zero, integers, negatives,
 * pairs whose results are integers, a large numerator over a small
 * denominator and the reverse, beside seeded ones.
 */
function edgeRationals(): Rational[] {
  const large = randomBigInt(key(777), 200);
  return [
    ZERO,
    ONE,
    rational(-1n),
    rational(7n),
    rational(-12n, 5n),
    rational(1n, 2n),
    rational(-1n, 2n),
    rational(3n, 2n),
    rational(2n, 3n),
    rational(6n, 35n),
    rational(10n, 21n),
    rational(large, 3n),
    rational(5n, large + 1n),
    rational(-large * 6n, 35n),
    ...randomRationals(24),
  ];
}

test("the smaller reductions agree with reducing after, and every result is in lowest terms", () => {
  // Each operation reduces with the gcds its operands allow, which is
  // correct only for operands in lowest terms; the textbook formula
  // reduced after through `rational` is what they must agree with.
  const values = edgeRationals();
  for (const a of values) {
    assert.ok(inLowestTerms(a), toFraction(a));
    for (const b of values) {
      const sum = add(a, b);
      assert.deepEqual(
        sum,
        rational(a.num * b.den + b.num * a.den, a.den * b.den),
      );
      assert.ok(inLowestTerms(sum));
      const difference = subtract(a, b);
      assert.deepEqual(
        difference,
        rational(a.num * b.den - b.num * a.den, a.den * b.den),
      );
      assert.ok(inLowestTerms(difference));
      const product = multiply(a, b);
      assert.deepEqual(product, rational(a.num * b.num, a.den * b.den));
      assert.ok(inLowestTerms(product));
      if (!isZero(b)) {
        const quotient = unwrap(divide(a, b));
        assert.deepEqual(quotient, rational(a.num * b.den, a.den * b.num));
        assert.ok(inLowestTerms(quotient));
      }
    }
    if (!isZero(a)) {
      const reciprocal = unwrap(invert(a));
      assert.deepEqual(reciprocal, rational(a.den, a.num));
      assert.ok(inLowestTerms(reciprocal));
      for (const n of [-3n, -1n, 2n, 3n]) {
        const power = unwrap(pow(a, n, MAX_SIGNIFICAND_LIMIT_BITS));
        assert.deepEqual(
          power,
          n > 0n
            ? rational(a.num ** n, a.den ** n)
            : rational(a.den ** -n, a.num ** -n),
        );
        assert.ok(inLowestTerms(power));
      }
    }
    assert.ok(inLowestTerms(trunc(a)));
    for (const k of [-70n, -3n, 1n, 64n]) {
      assert.ok(inLowestTerms(scaleByPowerOfTwo(a, k)));
    }
  }
  // The generators the tests draw from keep the invariant too.
  for (const r of randomRationals(40)) assert.ok(inLowestTerms(r));
  assert.ok(inLowestTerms(dec("2.54")));
  assert.ok(inLowestTerms(dec("1e-30")));
  assert.ok(!inLowestTerms({ num: 2n, den: 4n }));
  assert.ok(!inLowestTerms({ num: 0n, den: 3n }));
  assert.ok(!inLowestTerms({ num: 1n, den: -3n }));
});

/** Euclid's gcd on the whole numbers, the reference the gcd is checked against. */
function euclid(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

test("the gcd agrees with Euclid's from one bit to thousands, across the switch to doubles, and on pairs whose gcd is known by construction", () => {
  assert.equal(gcd(0n, 5n), 5n);
  assert.equal(gcd(1n, 5n), 1n);
  assert.equal(gcd(5n, 1n), 1n);
  assert.equal(gcd(12n, 18n), 6n);
  assert.equal(gcd(18n, 12n), 6n);
  assert.equal(gcd(7n, 7n), 7n);
  assert.equal(gcd(1n << 100n, 1n << 70n), 1n << 70n);
  assert.equal(gcd(3n << 100n, 5n << 70n), 1n << 70n);
  // Seeded pairs with a common factor, at sizes from a bit to thousands,
  // through the switch from the leading bits in doubles to the whole
  // numbers in doubles at 53 bits.
  for (const bits of [1, 2, 3, 7, 30, 51, 52, 53, 54, 55, 60, 100, 500, 4000]) {
    for (const k of split(key(9000 + bits), 12)) {
      const [k1, k2, k3] = split(k, 3);
      const g = randomBigInt(k3!, Math.max(1, bits >> 1)) + 1n;
      const a = randomBigInt(k1!, bits) * g;
      const b = (randomBigInt(k2!, bits) + 1n) * g;
      const expected = euclid(a, b);
      assert.equal(gcd(a, b), expected, `${bits} bits`);
      if (a !== 0n) assert.equal(gcd(b, a), expected, `${bits} bits, swapped`);
    }
  }
  for (const [a, b] of [
    [2n ** 53n + 1n, 2n ** 53n - 1n],
    [2n ** 53n, 2n ** 52n],
    [2n ** 60n, 2n ** 53n + 3n],
    [2n ** 100n - 1n, 2n ** 70n - 1n],
    [3n ** 100n, 3n ** 40n * 5n],
  ] as const) {
    assert.equal(gcd(a, b), euclid(a, b));
  }
  // Consecutive Fibonacci numbers, Euclid's worst case: every quotient is
  // one, and a round of Lehmer's takes many steps.
  let f0 = 0n;
  let f1 = 1n;
  for (let i = 0; i < 6000; i++) [f0, f1] = [f1, f0 + f1];
  assert.equal(gcd(f1, f0), 1n);
  assert.equal(gcd(f1 * 12345n, f0 * 12345n), 12345n);
  // Large pairs whose gcd is known by construction: g p and g (p + 2) for
  // an odd p are coprime apart from g, as are g (2^n - 1) and g (2^m - 1)
  // for coprime n and m; and one random pair at thirty thousand bits
  // against the reference itself.
  const g = randomBigInt(key(9101), 20000) | 1n;
  const p = randomBigInt(key(9102), 30000) | 1n;
  assert.equal(gcd(g * p, g * (p + 2n)), g);
  assert.equal(gcd(g * (2n ** 6765n - 1n), g * (2n ** 4181n - 1n)), g);
  const a = randomBigInt(key(9103), 30000) | 1n;
  const b = randomBigInt(key(9104), 30000) | 1n;
  assert.equal(gcd(a, b), euclid(a, b));
});

test("arithmetic identities hold exactly", () => {
  const values = randomRationals(50);
  for (const a of values) {
    for (const b of values.slice(0, 10)) {
      assert.ok(equals(subtract(add(a, b), b), a));
      if (!isZero(b)) {
        assert.ok(equals(unwrap(divide(multiply(a, b), b)), a));
        assert.ok(equals(unwrap(divide(a, b)), multiply(a, unwrap(invert(b)))));
      }
      assert.equal(compare(a, b) + compare(b, a), 0);
      assert.equal(compare(a, b) === 0, equals(a, b));
    }
  }
});
