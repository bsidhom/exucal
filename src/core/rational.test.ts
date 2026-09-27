import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  DEFAULT_PRECISION,
  MAX_BITS,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  decimalExponent,
  divide,
  equals,
  format,
  invert,
  isInteger,
  isZero,
  multiply,
  negate,
  parseDecimal,
  pow,
  powRational,
  rational,
  root,
  roundTo,
  sign,
  subtract,
  toFraction,
  trunc,
  type Rational,
  type RationalError,
} from "./rational.ts";
import type { Result } from "./result.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";
import { random, randomRational } from "../testing/random.ts";

/** Unwraps a result that is expected to succeed. */
function unwrap<T>(result: Result<T, RationalError>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

/** Parses a decimal literal that is expected to be valid. */
function dec(text: string): Rational {
  return unwrap(parseDecimal(text));
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
  assert.deepEqual(unwrap(pow(twoThirds, 3n)), rational(8n, 27n));
  assert.deepEqual(unwrap(pow(twoThirds, -3n)), rational(27n, 8n));
  assert.deepEqual(unwrap(pow(twoThirds, 0n)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 0n)), ONE);
  assert.deepEqual(unwrap(pow(ZERO, 5n)), ZERO);
  assert.deepEqual(unwrap(pow(rational(-2n), 3n)), rational(-8n));
  assert.deepEqual(unwrap(pow(rational(-2n), 2n)), rational(4n));
  assert.deepEqual(unwrap(pow(rational(-1n, 2n), -2n)), rational(4n));
  assert.deepEqual(unwrap(pow(dec("2.54"), 2n)), dec("6.4516"));
  assertError(pow(ZERO, -1n), "divisionByZero");
});

test("pow refuses results beyond the size limit, but not trivial ones", () => {
  assert.deepEqual(unwrap(pow(rational(10n), 5000n)), rational(10n ** 5000n));
  assertError(pow(rational(2n), BigInt(MAX_BITS + 1)), "tooLarge");
  assertError(pow(rational(10n), 100_000n), "tooLarge");
  assertError(pow(rational(10n), -100_000n), "tooLarge");
  assertError(pow(rational(1n, 10n), 100_000n), "tooLarge");
  assertError(pow(rational(2n), 10n ** 30n), "tooLarge");
  // 0, 1 and -1 never grow.
  assert.deepEqual(unwrap(pow(ONE, 10n ** 30n)), ONE);
  assert.deepEqual(unwrap(pow(rational(-1n), 10n ** 30n)), ONE);
  assert.deepEqual(unwrap(pow(rational(-1n), 10n ** 30n + 1n)), rational(-1n));
  assert.deepEqual(unwrap(pow(ZERO, 10n ** 30n)), ZERO);
});

// ---------------------------------------------------------------------------
// Roots

test("rational roots are exact", () => {
  assert.deepEqual(unwrap(root(rational(4n), 2n, 5)), rational(2n));
  assert.deepEqual(unwrap(root(rational(9n, 4n), 2n, 5)), rational(3n, 2n));
  assert.deepEqual(unwrap(root(dec("2.25"), 2n, 5)), dec("1.5"));
  assert.deepEqual(unwrap(root(rational(-8n, 27n), 3n, 5)), rational(-2n, 3n));
  assert.deepEqual(unwrap(root(rational(1n, 1024n), 10n, 5)), rational(1n, 2n));
  assert.deepEqual(unwrap(root(ONE, 7n, 5)), ONE);
  assert.deepEqual(unwrap(root(ZERO, 2n, 5)), ZERO);
  // Degree 1 is the identity, whatever the value.
  assert.deepEqual(unwrap(root(rational(2n), 1n, 5)), rational(2n));
  assert.deepEqual(unwrap(root(rational(-7n, 3n), 1n, 5)), rational(-7n, 3n));
});

test("irrational roots are truncated to the requested significant digits", () => {
  // sqrt(2) = 1.41421356237309504880...
  assert.deepEqual(unwrap(root(rational(2n), 2n, 1)), rational(1n));
  assert.deepEqual(unwrap(root(rational(2n), 2n, 4)), dec("1.414"));
  assert.deepEqual(unwrap(root(rational(2n), 2n, 10)), dec("1.414213562"));
  assert.deepEqual(
    unwrap(root(rational(2n), 2n, 21)),
    dec("1.41421356237309504880"),
  );
  // cbrt(10) = 2.15443469003188372175...
  assert.deepEqual(unwrap(root(rational(10n), 3n, 6)), dec("2.15443"));
  // sqrt(1/2) = 0.70710678118654752440...
  assert.deepEqual(unwrap(root(rational(1n, 2n), 2n, 6)), dec("0.707106"));
  // Truncation is toward zero, so a negative root rounds up.
  // cbrt(2) = 1.25992104989...
  assert.deepEqual(unwrap(root(rational(-2n), 3n, 6)), dec("-1.25992"));
  // Tiny and huge radicands scale correctly: sqrt(2e-20) = 1.41421e-10.
  assert.deepEqual(unwrap(root(dec("2e-20"), 2n, 6)), dec("1.41421e-10"));
  assert.deepEqual(unwrap(root(dec("2e20"), 2n, 6)), dec("1.41421e10"));
  // A root with more integer digits than the precision keeps only the
  // leading ones: sqrt(2e40) = 1.41421356e20.
  assert.deepEqual(unwrap(root(dec("2e40"), 2n, 3)), dec("1.41e20"));
});

test("even roots of negative numbers fail", () => {
  const result = root(rational(-4n), 2n, 5);
  assert.ok(!result.ok);
  assert.deepEqual(result.error, { kind: "negativeRadicand", degree: 2n });
  assertError(root(rational(-1n, 16n), 4n, 5), "negativeRadicand");
});

test("roots of absurd degree fail rather than hang", () => {
  assertError(root(rational(2n), 10n ** 9n, 40), "tooLarge");
  assertError(root(rational(2n), BigInt(MAX_BITS), 40), "tooLarge");
  // A rational root is exact whatever the degree.
  assert.deepEqual(unwrap(root(ONE, 10n ** 9n, 40)), ONE);
  assert.deepEqual(unwrap(root(ZERO, 10n ** 9n, 40)), ZERO);
});

test("root checks its preconditions", () => {
  assert.throws(() => root(rational(2n), 0n, 5), RangeError);
  assert.throws(() => root(rational(2n), -2n, 5), RangeError);
  assert.throws(() => root(rational(2n), 2n, 0), RangeError);
  assert.throws(() => root(rational(2n), 2n, 1.5), RangeError);
});

test("powRational combines pow and root, rounding once", () => {
  assert.deepEqual(
    unwrap(powRational(rational(8n), rational(2n, 3n), 5)),
    rational(4n),
  );
  assert.deepEqual(
    unwrap(powRational(rational(8n), rational(-2n, 3n), 5)),
    rational(1n, 4n),
  );
  assert.deepEqual(
    unwrap(powRational(rational(-8n), rational(2n, 3n), 5)),
    rational(4n),
  );
  assert.deepEqual(
    unwrap(powRational(rational(-8n), rational(1n, 3n), 5)),
    rational(-2n),
  );
  assert.deepEqual(
    unwrap(powRational(rational(2n, 3n), rational(-2n), 5)),
    rational(9n, 4n),
  );
  // 2^(3/2) = 2.828427124746...: the root is taken of 2^3 = 8, so the
  // result carries the true leading digits (root first would give 2.8284).
  assert.deepEqual(
    unwrap(powRational(rational(2n), rational(3n, 2n), 5)),
    dec("2.8284"),
  );
  assert.deepEqual(
    unwrap(powRational(rational(2n), rational(3n, 2n), 13)),
    dec("2.828427124746"),
  );
  assertError(
    powRational(rational(-2n), rational(1n, 2n), 5),
    "negativeRadicand",
  );
  assertError(powRational(ZERO, rational(-1n, 2n), 5), "divisionByZero");
  assertError(
    powRational(rational(10n), rational(100_000n, 3n), 5),
    "tooLarge",
  );
});

// ---------------------------------------------------------------------------
// Rounding

test("decimalExponent is the position of the leading digit", () => {
  const cases: [string, number][] = [
    ["1", 0],
    ["9.99", 0],
    ["10", 1],
    ["12345", 4],
    ["0.5", -1],
    ["0.1", -1],
    ["0.099", -2],
    ["0.01", -2],
    ["1e-7", -7],
    ["1e21", 21],
    ["-123", 2],
  ];
  for (const [text, expected] of cases) {
    assert.equal(decimalExponent(dec(text)), expected, text);
  }
  assert.equal(decimalExponent(rational(1n, 11n)), -2);
  assert.equal(decimalExponent(rational(10n, 11n)), -1);
  assert.equal(decimalExponent(rational(99n, 10n)), 0);
  assert.throws(() => decimalExponent(ZERO), RangeError);
});

test("trunc drops the fraction, toward zero", () => {
  assert.equal(toFraction(trunc(rational(7n, 2n))), "3");
  assert.equal(toFraction(trunc(rational(-7n, 2n))), "-3");
  assert.equal(toFraction(trunc(rational(1n, 3n))), "0");
  assert.equal(toFraction(trunc(rational(-1n, 3n))), "0");
  assert.equal(toFraction(trunc(rational(5n))), "5");
  assert.equal(toFraction(trunc(ZERO)), "0");
});

test("roundTo toward zero keeps the leading digits and drops the rest", () => {
  const truncate = (r: Rational, digits: number) =>
    roundTo(r, digits, "towardZero");
  assert.deepEqual(truncate(dec("3.14159"), 3), dec("3.14"));
  assert.deepEqual(truncate(dec("3.14159"), 1), dec("3"));
  assert.deepEqual(truncate(dec("-3.14159"), 3), dec("-3.14"));
  assert.deepEqual(truncate(dec("0.0019999"), 2), dec("0.0019"));
  assert.deepEqual(truncate(dec("123456"), 2), dec("120000"));
  assert.deepEqual(truncate(dec("199"), 2), dec("190"));
  assert.deepEqual(truncate(dec("199"), 5), dec("199"));
  assert.deepEqual(truncate(rational(2n, 3n), 4), dec("0.6666"));
  assert.deepEqual(truncate(rational(-2n, 3n), 4), dec("-0.6666"));
  assert.deepEqual(truncate(ZERO, 4), ZERO);
  // Truncation composes: truncating a truncation is a single truncation.
  assert.deepEqual(
    truncate(truncate(rational(2n, 3n), 10), 4),
    truncate(rational(2n, 3n), 4),
  );
});

test("roundTo half away from zero goes to the nearest value, ties away from zero", () => {
  const round = (r: Rational, digits: number) =>
    roundTo(r, digits, "halfAwayFromZero");
  assert.deepEqual(round(dec("3.14159"), 3), dec("3.14"));
  assert.deepEqual(round(dec("3.14159"), 4), dec("3.142"));
  assert.deepEqual(round(dec("-3.14159"), 4), dec("-3.142"));
  assert.deepEqual(round(rational(2n, 3n), 4), dec("0.6667"));
  assert.deepEqual(round(rational(-2n, 3n), 4), dec("-0.6667"));
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
    rational(1n, 30n),
    rational(-1n, 30n),
    rational(200n, 3n),
    rational(-200n, 3n),
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
        `${toFraction(value)} under ${mode}`,
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
    assert.ok(equals(roundTo(rational(1n, 8n), 8, mode), rational(1n, 8n)));
    assert.ok(!equals(roundTo(rational(1n, 3n), 8, mode), rational(1n, 3n)));
    assert.ok(!equals(roundTo(rational(1n, 8n), 2, mode), rational(1n, 8n)));
  }
});

// ---------------------------------------------------------------------------
// Parsing

test("parseDecimal reads decimal literals exactly", () => {
  const cases: [string, Rational][] = [
    ["0", ZERO],
    ["-0", ZERO],
    ["+0", ZERO],
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
    ["1e0", ONE],
    ["12e-1", rational(6n, 5n)],
    ["0.1", rational(1n, 10n)],
    ["6.62607015e-34", rational(662607015n, 10n ** 42n)],
    ["1e21", rational(10n ** 21n)],
    ["0e99", ZERO],
    [
      "3.14159265358979323846264338327950288",
      rational(314159265358979323846264338327950288n, 10n ** 35n),
    ],
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(dec(text), expected, text);
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

test("parseDecimal refuses exponents beyond the size limit", () => {
  assert.deepEqual(dec("1e5000"), rational(10n ** 5000n));
  assert.deepEqual(dec("1e-5000"), rational(1n, 10n ** 5000n));
  assertError(parseDecimal("1e100000"), "tooLarge");
  assertError(parseDecimal("1e-100000"), "tooLarge");
  assertError(parseDecimal("1e99999999999999999999999"), "tooLarge");
  assertError(parseDecimal("0e99999999999999999999999"), "tooLarge");
});

// ---------------------------------------------------------------------------
// Formatting

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
  assert.equal(format(rational(1n, 3n), 8, nearest), "0.33333333");
  assert.equal(format(rational(2n, 3n), 8, nearest), "0.66666667");
  assert.equal(format(rational(-2n, 3n), 8, nearest), "-0.66666667");
  assert.equal(format(rational(1n, 3n), 1, nearest), "0.3");
  assert.equal(format(rational(1n, 7n), 12, nearest), "0.142857142857");
  assert.equal(format(rational(100n, 3n), 3, nearest), "33.3");
  assert.equal(format(rational(1000n, 3n), 3, nearest), "333");
  assert.equal(format(rational(10000n, 3n), 3, nearest), "3.33e+3");
  assert.equal(format(rational(1n, 300n), 3, nearest), "0.00333");
  assert.equal(format(rational(1n, 3000n), 3, nearest), "0.000333");
  assert.equal(format(rational(1n, 30000n), 3, nearest), "3.33e-5");
  assert.equal(
    format(unwrap(root(rational(2n), 2n, DEFAULT_PRECISION)), 8, nearest),
    "1.4142136",
  );
  // The GNU units default: 1 m in inches, to 8 digits.
  assert.equal(
    format(unwrap(divide(rational(100n), dec("2.54"))), 8, nearest),
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
  assert.equal(format(rational(1n, 3n), 8, "ceiling"), "0.33333334");
  assert.equal(format(rational(-1n, 3n), 8, "ceiling"), "-0.33333333");
  assert.equal(format(rational(2n, 3n), 8, "floor"), "0.66666666");
  assert.equal(format(rational(-2n, 3n), 8, "floor"), "-0.66666667");
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

// ---------------------------------------------------------------------------
// Properties over pseudo-random inputs

/** `count` seeded rationals of about six digits over six, at magnitudes up to `10^±20`. */
function randomRationals(count: number): Rational[] {
  const rand = random(12345);
  return Array.from({ length: count }, () => randomRational(rand, 20, 20));
}

/** One unit in the last of `digits` significant digits of `r`. */
function ulp(r: Rational, digits: number): Rational {
  const shift = decimalExponent(r) - digits + 1;
  return shift >= 0
    ? rational(10n ** BigInt(shift))
    : rational(1n, 10n ** BigInt(-shift));
}

/** `10^e <= |r| < 10^(e+1)`. */
function assertExponent(r: Rational, e: number) {
  const lower =
    e >= 0 ? rational(10n ** BigInt(e)) : rational(1n, 10n ** BigInt(-e));
  const upper = multiply(lower, rational(10n));
  assert.ok(compare(absolute(r), lower) >= 0, `${toFraction(r)} >= 10^${e}`);
  assert.ok(compare(absolute(r), upper) < 0, `${toFraction(r)} < 10^${e + 1}`);
}

test("roundTo is within an ulp on the side its mode says, and format agrees with it", () => {
  const half = rational(1n, 2n);
  for (const r of randomRationals(300)) {
    if (isZero(r)) continue;
    assertExponent(r, decimalExponent(r));
    for (const digits of [1, 2, 5, 8, 12]) {
      const u = ulp(r, digits);
      for (const mode of ROUNDING_MODES) {
        const n = roundTo(r, digits, mode);
        const label = `${toFraction(r)} at ${digits} under ${mode}`;
        const error = subtract(n, r);
        assert.ok(compare(absolute(error), u) < 0, `${label}: within an ulp`);
        assert.ok(sign(n) === sign(r), `${label}: keeps the sign`);
        // The rounded value has at most `digits` significant digits:
        // rescaled by its own ulp, it is an integer.
        assert.ok(
          isInteger(multiply(n, unwrap(invert(ulp(n, digits))))),
          `${label}: digits`,
        );
        // The side, by mode.
        switch (mode) {
          case "halfEven":
          case "halfAwayFromZero":
          case "halfTowardZero":
            assert.ok(
              compare(absolute(error), multiply(u, half)) <= 0,
              `${label}: within half an ulp`,
            );
            break;
          case "towardZero":
            assert.ok(compare(absolute(n), absolute(r)) <= 0, label);
            break;
          case "awayFromZero":
            assert.ok(compare(absolute(n), absolute(r)) >= 0, label);
            break;
          case "ceiling":
            assert.ok(compare(n, r) >= 0, label);
            break;
          case "floor":
            assert.ok(compare(n, r) <= 0, label);
            break;
        }
        const text = format(r, digits, mode);
        assert.ok(equals(dec(text), n), `${label}: format gives ${text}`);
      }
      // The two truncations agree, and ceiling and floor bracket the value.
      assert.ok(
        equals(
          roundTo(r, digits, "towardZero"),
          sign(r) > 0
            ? roundTo(r, digits, "floor")
            : roundTo(r, digits, "ceiling"),
        ),
      );
    }
  }
});

test("root is the exact root truncated to the precision", () => {
  for (const r of randomRationals(100)) {
    if (isZero(r)) continue;
    for (const degree of [2n, 3n, 5n]) {
      if (sign(r) < 0 && degree % 2n === 0n) continue;
      for (const precision of [1, 3, 10, 25]) {
        const q = unwrap(root(r, degree, precision));
        assert.equal(sign(q), sign(r));
        const back = unwrap(pow(q, degree));
        assert.ok(
          compare(absolute(back), absolute(r)) <= 0,
          `${toFraction(q)}^${degree} <= ${toFraction(r)}`,
        );
        if (equals(back, r)) continue;
        const next = add(absolute(q), ulp(q, precision));
        assert.ok(
          compare(unwrap(pow(next, degree)), absolute(r)) > 0,
          `(${toFraction(q)} + ulp)^${degree} > ${toFraction(r)}`,
        );
      }
    }
  }
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
