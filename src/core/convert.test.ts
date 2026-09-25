import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { convert, type ConvertError } from "./convert.ts";
import {
  DIMENSIONLESS,
  type Dimension,
  type Primitives,
  type Quantity,
} from "./dimension.ts";
import {
  ONE,
  ZERO,
  equals,
  format,
  parseDecimal,
  rational,
  round,
  type Rational,
} from "./rational.ts";
import type { Result } from "./result.ts";

/** Builds a dimension from integer exponents (or rationals, for roots). */
function dim(exponents: Record<string, number | Rational>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [
      name,
      typeof e === "number" ? rational(BigInt(e)) : e,
    ]),
  );
}

/** A quantity with the magnitude the decimal `text` denotes, exactly. */
function quantity(
  text: string,
  exponents: Record<string, number | Rational> = {},
): Quantity {
  const magnitude = parseDecimal(text);
  assert.ok(magnitude.ok, `${JSON.stringify(text)} is not a number`);
  return { magnitude: magnitude.value, dimension: dim(exponents) };
}

/** A primitives map in the order given; names ending in `!kind` are kinds. */
function primitives(...names: string[]): Primitives {
  return new Map(
    names.map((name) =>
      name.endsWith("!kind")
        ? [name.slice(0, -"!kind".length), "kind"]
        : [name, "dimension"],
    ),
  );
}

/** Enough of the SI base units for the tests, plus a kind for angles. */
const SI = primitives("kg", "m", "s", "A", "radian!kind");

function value(result: Result<Rational, ConvertError>): Rational {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<Rational, ConvertError>): ConvertError {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `result` is exactly the rational `expected`. */
function assertValue(
  result: Result<Rational, ConvertError>,
  expected: Rational,
): void {
  const actual = value(result);
  assert.ok(
    equals(actual, expected),
    `expected ${inspect(expected)}, got ${inspect(actual)}`,
  );
}

// Some units, as the table would hold them: SI magnitudes over `m`, `s`, ...
const METRE = quantity("1", { m: 1 });
const CENTIMETRE = quantity("0.01", { m: 1 });
const INCH = quantity("0.0254", { m: 1 });
const FOOT = quantity("0.3048", { m: 1 });
const MILE = quantity("1609.344", { m: 1 });
const SECOND = quantity("1", { s: 1 });
const HOUR = quantity("3600", { s: 1 });
const HERTZ = quantity("1", { s: -1 });
const RADIAN_PER_SECOND = quantity("1", { radian: 1, s: -1 });
const JOULE = quantity("1", { kg: 1, m: 2, s: -2 });
const NEWTON_METRE = quantity("1", { kg: 1, m: 2, s: -2, radian: -1 });

/** `n` of the unit `u`. */
function times(n: string, u: Quantity): Quantity {
  const factor = parseDecimal(n);
  assert.ok(factor.ok);
  return {
    magnitude: rational(
      factor.value.num * u.magnitude.num,
      factor.value.den * u.magnitude.den,
    ),
    dimension: u.dimension,
  };
}

// ---------------------------------------------------------------------------
// The value

test("the value is the ratio of the magnitudes", () => {
  assertValue(convert(times("3", FOOT), INCH, SI), rational(36n));
  assertValue(convert(INCH, CENTIMETRE, SI), rational(254n, 100n));
  assertValue(convert(HOUR, SECOND, SI), rational(3600n));
  assertValue(convert(MILE, FOOT, SI), rational(5280n));
});

test("the value is exact, never rounded", () => {
  // 1 m in inches is 5000/127, which no decimal writes exactly.
  const inches = value(convert(METRE, INCH, SI));
  assert.deepEqual(inches, rational(5000n, 127n));
  assert.ok(!equals(round(inches, 8), inches));
  assert.equal(format(inches, 8), "39.370079");
  // Whereas 1 in in cm is exactly 2.54, and a display can say so.
  const centimetres = value(convert(INCH, CENTIMETRE, SI));
  assert.ok(equals(round(centimetres, 8), centimetres));
  assert.equal(format(centimetres, 8), "2.54");
});

test("want may have a magnitude of its own", () => {
  assertValue(convert(MILE, times("1000", FOOT), SI), rational(528n, 100n));
  assertValue(
    convert(times("2", METRE), times("4", METRE), SI),
    rational(1n, 2n),
  );
  assertValue(convert(times("3", FOOT), times("3", FOOT), SI), ONE);
});

test("a compound dimension converts like any other", () => {
  // 60 mi/h in m/s.
  const milesPerHour: Quantity = {
    magnitude: rational(1609344n, 1000n * 3600n),
    dimension: dim({ m: 1, s: -1 }),
  };
  const metresPerSecond = quantity("1", { m: 1, s: -1 });
  assertValue(
    convert(times("60", milesPerHour), metresPerSecond, SI),
    rational(268224n, 10000n),
  );
});

test("dimensionless quantities convert to plain numbers", () => {
  assertValue(convert(quantity("2"), quantity("1"), SI), rational(2n));
  assertValue(convert(quantity("2"), quantity("0.5"), SI), rational(4n));
  assertValue(convert(quantity("2"), quantity("2"), SI), ONE);
  // The empty dimension, however it was built.
  assertValue(
    convert(
      { magnitude: rational(3n), dimension: DIMENSIONLESS },
      { magnitude: ONE, dimension: new Map() },
      SI,
    ),
    rational(3n),
  );
});

test("a zero have converts to zero", () => {
  assertValue(convert(times("0", METRE), INCH, SI), ZERO);
  assertValue(convert(quantity("0"), quantity("7"), SI), ZERO);
});

test("signs carry through", () => {
  assertValue(convert(times("-3", FOOT), INCH, SI), rational(-36n));
  assertValue(convert(times("3", FOOT), times("-1", INCH), SI), rational(-36n));
  assertValue(convert(times("-3", FOOT), times("-1", INCH), SI), rational(36n));
});

test("the order of a dimension's entries does not matter", () => {
  const a = quantity("1", { kg: 1, m: 2, s: -2 });
  const b: Quantity = {
    magnitude: rational(2n),
    dimension: dim({ s: -2, kg: 1, m: 2 }),
  };
  assertValue(convert(a, b, SI), rational(1n, 2n));
});

test("kinds that match on both sides are no obstacle", () => {
  assertValue(
    convert(times("2", NEWTON_METRE), NEWTON_METRE, SI),
    rational(2n),
  );
  const rpm: Quantity = {
    magnitude: rational(2n * 314159n, 100000n * 60n),
    dimension: dim({ radian: 1, s: -1 }),
  };
  assert.ok(convert(rpm, RADIAN_PER_SECOND, SI).ok);
});

test("fractional exponents conform when equal", () => {
  const half = rational(1n, 2n);
  const rootMetre = quantity("1", { m: half });
  const rootFoot = quantity("0.3048", { m: half });
  assertValue(convert(rootFoot, rootMetre, SI), rational(3048n, 10000n));
});

// ---------------------------------------------------------------------------
// Failures

test("a dimension mismatch carries both dimensions", () => {
  assert.deepEqual(failure(convert(METRE, SECOND, SI)), {
    kind: "dimensionMismatch",
    have: METRE.dimension,
    want: SECOND.dimension,
  });
  assert.deepEqual(failure(convert(times("2", METRE), quantity("2"), SI)), {
    kind: "dimensionMismatch",
    have: METRE.dimension,
    want: DIMENSIONLESS,
  });
  const area = quantity("1", { m: 2 });
  assert.deepEqual(failure(convert(METRE, area, SI)), {
    kind: "dimensionMismatch",
    have: METRE.dimension,
    want: area.dimension,
  });
});

test("a kind mismatch names the kinds that differ", () => {
  assert.deepEqual(failure(convert(RADIAN_PER_SECOND, HERTZ, SI)), {
    kind: "kindMismatch",
    have: RADIAN_PER_SECOND.dimension,
    want: HERTZ.dimension,
    kinds: ["radian"],
  });
  assert.deepEqual(failure(convert(NEWTON_METRE, JOULE, SI)), {
    kind: "kindMismatch",
    have: NEWTON_METRE.dimension,
    want: JOULE.dimension,
    kinds: ["radian"],
  });
});

test("which names are kinds comes from the primitives given", () => {
  // With radian a dimension primitive, the same pair is a dimension mismatch.
  const physical = primitives("kg", "m", "s", "radian");
  assert.equal(
    failure(convert(RADIAN_PER_SECOND, HERTZ, physical)).kind,
    "dimensionMismatch",
  );
  // And with nothing declared, every name is a dimension.
  assert.equal(
    failure(convert(RADIAN_PER_SECOND, HERTZ, new Map())).kind,
    "dimensionMismatch",
  );
});

test("a want of zero is an error", () => {
  assert.deepEqual(failure(convert(METRE, times("0", METRE), SI)), {
    kind: "zeroWant",
  });
  assert.deepEqual(failure(convert(quantity("1"), quantity("0"), SI)), {
    kind: "zeroWant",
  });
  // Even when have is zero too: 0/0 is not 1.
  assert.deepEqual(failure(convert(times("0", METRE), times("0", METRE), SI)), {
    kind: "zeroWant",
  });
});

test("a mismatch is reported before a zero want", () => {
  assert.equal(
    failure(convert(METRE, times("0", SECOND), SI)).kind,
    "dimensionMismatch",
  );
  assert.equal(
    failure(convert(RADIAN_PER_SECOND, times("0", HERTZ), SI)).kind,
    "kindMismatch",
  );
});

test("conversion leaves its operands alone", () => {
  const have = times("3", FOOT);
  const want = times("0", INCH);
  convert(have, want, SI);
  convert(have, INCH, SI);
  assert.deepEqual(have, times("3", FOOT));
  assert.deepEqual(want, times("0", INCH));
  assert.deepEqual(SI, primitives("kg", "m", "s", "A", "radian!kind"));
});
