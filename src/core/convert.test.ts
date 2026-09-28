import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
  containsZero,
  exact,
  isExact,
  multiplyBalls,
  type Ball,
} from "./ball.ts";
import { radiusAbove, radiusUpper } from "./radius.ts";
import {
  convert,
  convertToList,
  roundTerms,
  type ConvertError,
  type UnitListError,
} from "./convert.ts";
import { DIMENSIONLESS, type Dimension, type Primitives } from "./dimension.ts";
import { type Quantity } from "./quantity.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  equals,
  format,
  multiply,
  parseDecimal,
  rational,
  roundTo,
  subtract,
  toFraction,
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
  return { magnitude: exact(magnitude.value), dimension: dim(exponents) };
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

function value(result: Result<Ball, ConvertError>): Ball {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<Ball, ConvertError>): ConvertError {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `result` is exactly the rational `expected`: an exact ball of it. */
function assertValue(
  result: Result<Ball, ConvertError>,
  expected: Rational,
): void {
  assert.deepEqual(value(result), exact(expected));
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
    magnitude: exact(multiply(factor.value, u.magnitude.mid)),
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
  const inches = value(convert(METRE, INCH, SI)).mid;
  assert.deepEqual(inches, rational(5000n, 127n));
  assert.ok(!equals(roundTo(inches, 8, "halfAwayFromZero"), inches));
  assert.equal(format(inches, 8, "halfAwayFromZero"), "39.370079");
  // Whereas 1 in in cm is exactly 2.54, and a display can say so.
  const centimetres = value(convert(INCH, CENTIMETRE, SI)).mid;
  assert.ok(equals(roundTo(centimetres, 8, "halfAwayFromZero"), centimetres));
  assert.equal(format(centimetres, 8, "halfAwayFromZero"), "2.54");
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
    magnitude: exact(rational(1609344n, 1000n * 3600n)),
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
      { magnitude: exact(rational(3n)), dimension: DIMENSIONLESS },
      { magnitude: exact(ONE), dimension: new Map() },
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
    magnitude: exact(rational(2n)),
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
    magnitude: exact(rational(2n * 314159n, 100000n * 60n)),
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

// ---------------------------------------------------------------------------
// Unit lists

const MINUTE = quantity("60", { s: 1 });

function terms(
  result: Result<readonly Ball[], UnitListError>,
): readonly Ball[] {
  assert.ok(result.ok, `expected terms, got ${inspect(result)}`);
  return result.value;
}

function listFailure(
  result: Result<readonly Ball[], UnitListError>,
): UnitListError {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `actual` are exactly the rationals `expected` denote: decimals, or fractions `a/b`. */
function assertTerms(
  actual: readonly Ball[],
  expected: readonly string[],
): void {
  for (const term of actual) assert.ok(isExact(term), inspect(term));
  assertMidpoints(actual, expected);
}

/**
 * Asserts that the midpoints of `actual` are the rationals `expected`
 * denote: what `roundTerms` gives, whose rounded remainder carries the
 * rounding's shift in its radius and is inexact.
 */
function assertMidpoints(
  actual: readonly Ball[],
  expected: readonly string[],
): void {
  assert.deepEqual(
    actual.map((term) => toFraction(term.mid)),
    expected.map((text) => {
      const [numerator, denominator] = text.split("/");
      const num = quantity(numerator!).magnitude.mid;
      if (denominator === undefined) return toFraction(num);
      const den = quantity(denominator).magnitude.mid;
      return toFraction(rational(num.num * den.den, num.den * den.num));
    }),
  );
}

test("a list conversion is an integer count of each unit but the last, and the exact remainder", () => {
  assertTerms(terms(convertToList(METRE, [FOOT, INCH], SI)), ["3", "428/127"]);
  assertTerms(
    terms(
      convertToList(quantity("3661", { s: 1 }), [HOUR, MINUTE, SECOND], SI),
    ),
    ["1", "1", "1"],
  );
  assertTerms(
    terms(
      convertToList(quantity("59.5", { s: 1 }), [HOUR, MINUTE, SECOND], SI),
    ),
    ["0", "0", "59.5"],
  );
});

test("a list of one unit gives the ratio, as convert does", () => {
  const have = quantity("3", { m: 1 });
  const [ratio] = terms(convertToList(have, [FOOT], SI));
  assert.deepEqual(ratio!, value(convert(have, FOOT, SI)));
  assertTerms([ratio!], ["1250/127"]);
});

test("the terms sum to have exactly", () => {
  const have = quantity("1.234567", { m: 1 });
  const [feet, inches] = terms(convertToList(have, [FOOT, INCH], SI));
  const sum = add(
    multiply(feet!.mid, FOOT.magnitude.mid),
    multiply(inches!.mid, INCH.magnitude.mid),
  );
  assert.ok(equals(sum, have.magnitude.mid));
});

test("counts are truncated toward zero, so every term has the sign of have", () => {
  assertTerms(
    terms(convertToList(quantity("-1", { m: 1 }), [FOOT, INCH], SI)),
    ["-3", "-428/127"],
  );
  assertTerms(
    terms(
      convertToList(quantity("-3661", { s: 1 }), [HOUR, MINUTE, SECOND], SI),
    ),
    ["-1", "-1", "-1"],
  );
  assertTerms(
    terms(convertToList(quantity("0", { s: 1 }), [HOUR, MINUTE, SECOND], SI)),
    ["0", "0", "0"],
  );
});

test("the units may carry a magnitude, and need not be multiples of one another", () => {
  // 1 mi = 1.609344 km.
  const KILOMETRE = quantity("1000", { m: 1 });
  assertTerms(
    terms(convertToList(quantity("5000", { m: 1 }), [MILE, KILOMETRE], SI)),
    ["3", "0.171968"],
  );
  assertTerms(
    terms(convertToList(METRE, [FOOT, quantity("0.003175", { m: 1 })], SI)),
    ["3", "3424/127"],
  );
});

test("every unit must conform to have, and the first that does not is reported", () => {
  assert.deepEqual(listFailure(convertToList(METRE, [FOOT, SECOND], SI)), {
    kind: "nonconformingUnit",
    index: 1,
    mismatch: {
      kind: "dimensionMismatch",
      have: METRE.dimension,
      want: SECOND.dimension,
    },
  });
  const rpm = quantity("1", { radian: 1, s: -1 });
  const hertz = quantity("1", { s: -1 });
  assert.deepEqual(listFailure(convertToList(rpm, [hertz], SI)), {
    kind: "nonconformingUnit",
    index: 0,
    mismatch: {
      kind: "kindMismatch",
      have: rpm.dimension,
      want: hertz.dimension,
      kinds: ["radian"],
    },
  });
});

test("every unit must be positive", () => {
  assert.deepEqual(
    listFailure(convertToList(METRE, [FOOT, quantity("0", { m: 1 })], SI)),
    { kind: "nonpositiveUnit", index: 1 },
  );
  assert.deepEqual(
    listFailure(convertToList(METRE, [quantity("-1", { m: 1 }), INCH], SI)),
    { kind: "nonpositiveUnit", index: 0 },
  );
});

test("the units must decrease", () => {
  assert.deepEqual(listFailure(convertToList(METRE, [INCH, FOOT], SI)), {
    kind: "unitOutOfOrder",
    index: 1,
  });
  assert.deepEqual(listFailure(convertToList(METRE, [FOOT, FOOT], SI)), {
    kind: "unitOutOfOrder",
    index: 1,
  });
  assert.deepEqual(
    listFailure(convertToList(METRE, [MILE, FOOT, CENTIMETRE, INCH], SI)),
    { kind: "unitOutOfOrder", index: 3 },
  );
});

test("the checks are in order, unit by unit", () => {
  // The second unit is out of order and the third does not conform.
  assert.deepEqual(
    listFailure(convertToList(METRE, [INCH, FOOT, SECOND], SI)),
    { kind: "unitOutOfOrder", index: 1 },
  );
  // Conformance before positivity, for one unit.
  assert.deepEqual(
    listFailure(convertToList(METRE, [quantity("0", { s: 1 })], SI)).kind,
    "nonconformingUnit",
  );
});

test("an empty list is a programming error", () => {
  assert.throws(() => convertToList(METRE, [], SI), RangeError);
});

test("roundTerms leaves terms alone when the remainder shows exactly", () => {
  const exact = terms(
    convertToList(quantity("3661.5", { s: 1 }), [HOUR, MINUTE, SECOND], SI),
  );
  assert.equal(
    roundTerms([HOUR, MINUTE, SECOND], exact, 8, "halfAwayFromZero"),
    exact,
  );
});

test("roundTerms rounds the remainder to the digits given", () => {
  const rounded = roundTerms(
    [FOOT, INCH],
    terms(convertToList(METRE, [FOOT, INCH], SI)),
    8,
    "halfAwayFromZero",
  );
  assertMidpoints(rounded, ["3", "3.3700787"]);
});

test("roundTerms rounds the remainder in the mode given", () => {
  // The remainder is 3.37007874015... in.
  const exact = terms(convertToList(METRE, [FOOT, INCH], SI));
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "floor"), [
    "3",
    "3.3700787",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "ceiling"), [
    "3",
    "3.3700788",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 2, "towardZero"), [
    "3",
    "3.3",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 2, "awayFromZero"), [
    "3",
    "3.4",
  ]);
  // A directed mode rounds a negative remainder to its side of the line.
  const negative = terms(
    convertToList(quantity("-1", { m: 1 }), [FOOT, INCH], SI),
  );
  assertMidpoints(roundTerms([FOOT, INCH], negative, 8, "floor"), [
    "-3",
    "-3.3700788",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], negative, 8, "ceiling"), [
    "-3",
    "-3.3700787",
  ]);
});

test("roundTerms widens the remainder's radius by the rounding's shift, so the rounded terms still contain have", () => {
  // 1 m in ft;in: the remainder 428/127 in is exact, and rounded to eight
  // digits it moves by about 4e-8; the rounded term's ball must still
  // contain 428/127, and the terms times the units must contain 1 m.
  const unrounded = terms(convertToList(METRE, [FOOT, INCH], SI));
  const rounded = roundTerms([FOOT, INCH], unrounded, 8, "halfAwayFromZero");
  const remainder = rounded[1]!;
  assert.ok(!isExact(remainder));
  const trueRemainder = unrounded[1]!.mid;
  assert.ok(
    compare(
      absolute(subtract(remainder.mid, trueRemainder)),
      radiusUpper(remainder.rad),
    ) <= 0,
  );
  const sum = addBalls(
    multiplyBalls(rounded[0]!, FOOT.magnitude),
    multiplyBalls(remainder, INCH.magnitude),
  );
  assert.ok(
    compare(
      absolute(subtract(sum.mid, METRE.magnitude.mid)),
      radiusUpper(sum.rad),
    ) <= 0,
  );
  // After a carry, the remainder left is a hair from zero and its ball says
  // so: `have` a hair under 3 ft, whose rounded terms are 3 ft and a last
  // term containing zero, not an exact zero.
  const almost = quantity("0.91439999997", { m: 1 });
  const carried = roundTerms(
    [FOOT, INCH],
    terms(convertToList(almost, [FOOT, INCH], SI)),
    8,
    "halfAwayFromZero",
  );
  assert.deepEqual(carried[0], exact(rational(3n)));
  assert.ok(containsZero(carried[1]!));
  assert.ok(!isExact(carried[1]!));
});

test("a remainder that rounds up to a whole of an earlier unit carries into it", () => {
  // 2 ft + 11.9999999988 in would show as 2 ft + 12 in.
  const have = quantity("0.91439999997", { m: 1 });
  assertTerms(terms(convertToList(have, [FOOT, INCH], SI)), [
    "2",
    "30479999997/2540000000",
  ]);
  assertMidpoints(
    roundTerms(
      [FOOT, INCH],
      terms(convertToList(have, [FOOT, INCH], SI)),
      8,
      "halfAwayFromZero",
    ),
    ["3", "0"],
  );
  // The carry runs through as many units as it must.
  const almostAnHour = quantity("3599.9999999999", { s: 1 });
  const units = [HOUR, MINUTE, SECOND];
  assertMidpoints(
    roundTerms(
      units,
      terms(convertToList(almostAnHour, units, SI)),
      8,
      "halfAwayFromZero",
    ),
    ["1", "0", "0"],
  );
  // And of a negative value.
  const negative = quantity("-0.91439999997", { m: 1 });
  assertMidpoints(
    roundTerms(
      [FOOT, INCH],
      terms(convertToList(negative, [FOOT, INCH], SI)),
      8,
      "halfAwayFromZero",
    ),
    ["-3", "0"],
  );
});

test("the carry follows the mode: a directed mode carries only on its side", () => {
  // 2 ft + 11.9999999988 in: ceiling rounds the remainder up to 12 in and
  // carries; floor leaves 11.999999 in and nothing carries.
  const have = quantity("0.91439999997", { m: 1 });
  const exact = terms(convertToList(have, [FOOT, INCH], SI));
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "ceiling"), ["3", "0"]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "awayFromZero"), [
    "3",
    "0",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "floor"), [
    "2",
    "11.999999",
  ]);
  assertMidpoints(roundTerms([FOOT, INCH], exact, 8, "towardZero"), [
    "2",
    "11.999999",
  ]);
  // On the negative value the sides swap: floor carries, ceiling does not.
  const negative = terms(
    convertToList(quantity("-0.91439999997", { m: 1 }), [FOOT, INCH], SI),
  );
  assertMidpoints(roundTerms([FOOT, INCH], negative, 8, "floor"), ["-3", "0"]);
  assertMidpoints(roundTerms([FOOT, INCH], negative, 8, "ceiling"), [
    "-2",
    "-11.999999",
  ]);
});

test("roundTerms rounds by less than a unit in the last digit shown", () => {
  const have = quantity("0.91439999997", { m: 1 });
  const rounded = roundTerms(
    [FOOT, INCH],
    terms(convertToList(have, [FOOT, INCH], SI)),
    8,
    "halfAwayFromZero",
  );
  const shown = add(
    multiply(rounded[0]!.mid, FOOT.magnitude.mid),
    multiply(rounded[1]!.mid, INCH.magnitude.mid),
  );
  // Within 1e-7 in of the exact value: the resolution of 11.999999 at 8 digits.
  const difference = subtract(shown, have.magnitude.mid);
  const resolution = multiply(
    quantity("1e-7").magnitude.mid,
    INCH.magnitude.mid,
  );
  assert.ok(compare(absolute(difference), resolution) < 0);
});

// ---------------------------------------------------------------------------
// Inexact quantities

/** `mid` with a radius at or above `rad`, in the dimension of `unit`. */
function about(mid: string, rad: string, unit: Quantity): Quantity {
  return {
    magnitude: {
      mid: quantity(mid).magnitude.mid,
      rad: radiusAbove(quantity(rad).magnitude.mid),
    },
    dimension: unit.dimension,
  };
}

test("convert of an inexact have carries its radius", () => {
  // 1 m ± 1e-10 m in feet: the ratio is 1250/381 ± about 1e-10 / 0.3048.
  const have = about("1", "1e-10", METRE);
  const ratio = value(convert(have, FOOT, SI));
  assert.ok(equals(ratio.mid, rational(1250n, 381n)));
  assert.ok(!isExact(ratio));
  const rad = radiusUpper(ratio.rad);
  assert.ok(compare(rad, quantity("3.28e-10").magnitude.mid) >= 0);
  assert.ok(compare(rad, quantity("3.29e-10").magnitude.mid) <= 0);
  // And an inexact want too.
  assert.ok(
    !isExact(value(convert(METRE, about("0.3048", "1e-10", METRE), SI))),
  );
  // Exact quantities give an exact ratio.
  assert.ok(isExact(value(convert(METRE, FOOT, SI))));
});

test("a want that cannot be told from zero is unresolvedWant, apart from zeroWant", () => {
  assert.deepEqual(
    failure(convert(METRE, about("1e-12", "1e-11", METRE), SI)),
    {
      kind: "unresolvedWant",
    },
  );
  assert.deepEqual(failure(convert(METRE, about("0", "1e-30", METRE), SI)), {
    kind: "unresolvedWant",
  });
  // Just clear of zero, it converts.
  assert.ok(convert(METRE, about("1e-10", "1e-11", METRE), SI).ok);
});

test("a list of an inexact have has the radius on its remainder alone", () => {
  const have = about("1", "1e-10", METRE);
  const [feet, inches] = terms(convertToList(have, [FOOT, INCH], SI));
  assert.deepEqual(feet, exact(rational(3n)));
  assert.ok(inches !== undefined && !isExact(inches));
  // The remainder is 1 m - 3 ft over an inch: 0.0856 m / 0.0254 m, within
  // 1e-10 / 0.0254 of it.
  assert.ok(equals(inches.mid, rational(856n, 254n)));
  const rad = radiusUpper(inches.rad);
  assert.ok(compare(rad, quantity("3.93e-9").magnitude.mid) >= 0);
  assert.ok(compare(rad, quantity("3.94e-9").magnitude.mid) <= 0);
  // An inexact unit puts a radius on the remainder too, but the counts stay exact.
  const [count, rest] = terms(
    convertToList(METRE, [about("0.3048", "1e-10", METRE), INCH], SI),
  );
  assert.deepEqual(count, exact(rational(3n)));
  assert.ok(rest !== undefined && !isExact(rest));
});

test("a unit that cannot be told from zero is not positive", () => {
  assert.deepEqual(
    listFailure(
      convertToList(METRE, [FOOT, about("1e-12", "1e-11", METRE)], SI),
    ),
    { kind: "nonpositiveUnit", index: 1 },
  );
  assert.deepEqual(
    listFailure(convertToList(METRE, [about("0", "1e-30", METRE), INCH], SI)),
    { kind: "nonpositiveUnit", index: 0 },
  );
  assert.ok(containsZero(about("0", "1e-30", METRE).magnitude));
});

test("roundTerms keeps the radius on the rounded remainder", () => {
  const have = about("1", "1e-10", METRE);
  const exactTerms = terms(convertToList(have, [FOOT, INCH], SI));
  const rounded = roundTerms([FOOT, INCH], exactTerms, 8, "halfAwayFromZero");
  assert.deepEqual(rounded[0], exact(rational(3n)));
  assert.ok(equals(rounded[1]!.mid, quantity("3.3700787").magnitude.mid));
  assert.ok(!isExact(rounded[1]!));
  // A carry keeps it too: 2 ft + 11.9999999988 in ± a hair is 3 ft + 0 ± a hair.
  const carried = roundTerms(
    [FOOT, INCH],
    terms(
      convertToList(about("0.91439999997", "1e-12", METRE), [FOOT, INCH], SI),
    ),
    8,
    "halfAwayFromZero",
  );
  assert.deepEqual(carried[0], exact(rational(3n)));
  assert.ok(carried[1]!.mid.num === 0n);
  assert.ok(!isExact(carried[1]!));
});
