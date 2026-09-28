import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
  containsZero,
  exact,
  isExact,
  magnitudeAbove,
  multiplyBalls,
  rootBall,
  type Ball,
} from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import { log2OfRadius, radiusUpper } from "./radius.ts";
import {
  convert,
  convertToList,
  roundTerms,
  type ConvertError,
  type UnitListError,
} from "./convert.ts";
import { DIMENSIONLESS, type Dimension, type Primitives } from "./dimension.ts";
import type { Quantity } from "./quantity.ts";
import {
  LIMIT_BITS,
  absolute as absoluteFraction,
  compare as compareFractions,
  rational,
  subtract as subtractFractions,
  type Rational,
} from "./rational.ts";
import type { Result } from "./result.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  equals,
  format,
  isZero,
  multiply,
  roundTo,
  subtract,
  type Scaled,
} from "./scaled.ts";
import { ball, dec, digitsOf, fr, fraction } from "../testing/scaled.ts";

/** The context the lists are decomposed at: the default display's eight digits. */
const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function unwrap<T, E extends { kind: string }>(result: Result<T, E>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

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
  return { magnitude: exact(dec(text)), dimension: dim(exponents) };
}

/** A quantity with the exact magnitude `value`. */
function of(
  value: Scaled,
  exponents: Record<string, number | Rational> = {},
): Quantity {
  return { magnitude: exact(value), dimension: dim(exponents) };
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

/** Asserts that `result` is exactly `expected`: an exact ball of it. */
function assertValue(
  result: Result<Ball, ConvertError>,
  expected: Scaled,
): void {
  assert.deepEqual(value(result), exact(expected));
}

// Some units, as the table would hold them: SI magnitudes over `m`, `s`, ...
const METRE = quantity("1", { m: 1 });
const CENTIMETRE = quantity("0.01", { m: 1 });
const MILLIMETRE = quantity("0.001", { m: 1 });
const KILOMETRE = quantity("1000", { m: 1 });
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
  return {
    magnitude: exact(unwrap(multiply(dec(n), u.magnitude.mid))),
    dimension: u.dimension,
  };
}

// ---------------------------------------------------------------------------
// The value

test("the value is the ratio of the magnitudes", () => {
  assertValue(convert(times("3", FOOT), INCH, SI), fr(36n));
  assertValue(convert(INCH, CENTIMETRE, SI), dec("2.54"));
  assertValue(convert(HOUR, SECOND, SI), fr(3600n));
  assertValue(convert(MILE, FOOT, SI), fr(5280n));
});

test("the value is exact, never rounded", () => {
  // 1 m in inches is 5000/127, which no decimal writes exactly.
  const inches = value(convert(METRE, INCH, SI)).mid;
  assert.deepEqual(inches, fr(5000n, 127n));
  assert.ok(!equals(roundTo(inches, 8, "halfAwayFromZero"), inches));
  assert.equal(format(inches, 8, "halfAwayFromZero"), "39.370079");
  // Whereas 1 in in cm is exactly 2.54, and a display can say so.
  const centimetres = value(convert(INCH, CENTIMETRE, SI)).mid;
  assert.ok(equals(roundTo(centimetres, 8, "halfAwayFromZero"), centimetres));
  assert.equal(format(centimetres, 8, "halfAwayFromZero"), "2.54");
});

test("the exponent carries through the ratio, whatever its size", () => {
  // `1e999999999 m` into `mm` is exactly `1e1000000002`.
  assertValue(
    convert(quantity("1e999999999", { m: 1 }), MILLIMETRE, SI),
    dec("1e1000000002"),
  );
  assertValue(
    convert(quantity("1e999999999", { m: 1 }), KILOMETRE, SI),
    dec("1e999999996"),
  );
  assertValue(
    convert(
      quantity("1e-999999999", { m: 1 }),
      quantity("1e999999999", { m: 1 }),
      SI,
    ),
    dec("1e-1999999998"),
  );
  // A ratio whose exponent passes the bound is too large.
  assert.deepEqual(
    failure(
      convert(
        quantity("1e-999999999999999999", { m: 1 }),
        quantity("1e10", { m: 1 }),
        SI,
      ),
    ),
    { kind: "tooLarge" },
  );
});

test("want may have a magnitude of its own", () => {
  assertValue(convert(MILE, times("1000", FOOT), SI), dec("5.28"));
  assertValue(convert(times("2", METRE), times("4", METRE), SI), fr(1n, 2n));
  assertValue(convert(times("3", FOOT), times("3", FOOT), SI), ONE);
});

test("a compound dimension converts like any other", () => {
  // 60 mi/h in m/s.
  const milesPerHour = of(fr(1609344n, 1000n * 3600n), { m: 1, s: -1 });
  const metresPerSecond = quantity("1", { m: 1, s: -1 });
  assertValue(
    convert(times("60", milesPerHour), metresPerSecond, SI),
    dec("26.8224"),
  );
});

test("dimensionless quantities convert to plain numbers", () => {
  assertValue(convert(quantity("2"), quantity("1"), SI), fr(2n));
  assertValue(convert(quantity("2"), quantity("0.5"), SI), fr(4n));
  assertValue(convert(quantity("2"), quantity("2"), SI), ONE);
  // The empty dimension, however it was built.
  assertValue(
    convert(
      { magnitude: exact(fr(3n)), dimension: DIMENSIONLESS },
      { magnitude: exact(ONE), dimension: new Map() },
      SI,
    ),
    fr(3n),
  );
});

test("a zero have converts to zero", () => {
  assertValue(convert(times("0", METRE), INCH, SI), ZERO);
  assertValue(convert(quantity("0"), quantity("7"), SI), ZERO);
});

test("signs carry through", () => {
  assertValue(convert(times("-3", FOOT), INCH, SI), fr(-36n));
  assertValue(convert(times("3", FOOT), times("-1", INCH), SI), fr(-36n));
  assertValue(convert(times("-3", FOOT), times("-1", INCH), SI), fr(36n));
});

test("the order of a dimension's entries does not matter", () => {
  const a = quantity("1", { kg: 1, m: 2, s: -2 });
  const b = of(fr(2n), { s: -2, kg: 1, m: 2 });
  assertValue(convert(a, b, SI), fr(1n, 2n));
});

test("kinds that match on both sides are no obstacle", () => {
  assertValue(convert(times("2", NEWTON_METRE), NEWTON_METRE, SI), fr(2n));
  const rpm = of(fr(2n * 314159n, 100000n * 60n), { radian: 1, s: -1 });
  assert.ok(convert(rpm, RADIAN_PER_SECOND, SI).ok);
});

test("fractional exponents conform when equal", () => {
  const half = rational(1n, 2n);
  const rootMetre = quantity("1", { m: half });
  const rootFoot = quantity("0.3048", { m: half });
  assertValue(convert(rootFoot, rootMetre, SI), dec("0.3048"));
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

/** `have` as a sum over `units` at the test's context. */
function list(
  have: Quantity,
  units: readonly Quantity[],
): Result<readonly Ball[], UnitListError> {
  return convertToList(have, units, SI, CONTEXT);
}

/** `roundTerms` at the test's context. */
function round(
  units: readonly Quantity[],
  unrounded: readonly Ball[],
  digits: number,
  mode: Parameters<typeof roundTerms>[3],
): readonly Ball[] {
  return roundTerms(units, unrounded, digits, mode, CONTEXT);
}

/** The value `text` denotes: a decimal, or a fraction `a/b` of decimals. */
function denoted(text: string): Scaled {
  const [numerator, denominator] = text.split("/");
  const num = dec(numerator!);
  return denominator === undefined
    ? num
    : unwrap(divide(num, dec(denominator)));
}

/** Asserts that `actual` are exactly the values `expected` denote: decimals, or fractions `a/b`. */
function assertTerms(
  actual: readonly Ball[],
  expected: readonly string[],
): void {
  for (const term of actual) assert.ok(isExact(term), inspect(term));
  assertMidpoints(actual, expected);
}

/**
 * Asserts that the midpoints of `actual` are the values `expected`
 * denote: what `roundTerms` gives, whose rounded remainder carries the
 * rounding's shift in its radius and is inexact.
 */
function assertMidpoints(
  actual: readonly Ball[],
  expected: readonly string[],
): void {
  assert.deepEqual(
    actual.map((term) => term.mid),
    expected.map((text) => denoted(text)),
  );
}

test("a list conversion is an integer count of each unit but the last, and the exact remainder", () => {
  assertTerms(terms(list(METRE, [FOOT, INCH])), ["3", "428/127"]);
  assertTerms(terms(list(quantity("3661", { s: 1 }), [HOUR, MINUTE, SECOND])), [
    "1",
    "1",
    "1",
  ]);
  assertTerms(terms(list(quantity("59.5", { s: 1 }), [HOUR, MINUTE, SECOND])), [
    "0",
    "0",
    "59.5",
  ]);
});

test("a list of one unit gives the ratio, as convert does", () => {
  const have = quantity("3", { m: 1 });
  const [ratio] = terms(list(have, [FOOT]));
  assert.deepEqual(ratio!, value(convert(have, FOOT, SI)));
  assertTerms([ratio!], ["1250/127"]);
});

test("the terms sum to have exactly", () => {
  const have = quantity("1.234567", { m: 1 });
  const [feet, inches] = terms(list(have, [FOOT, INCH]));
  const sum = unwrap(
    add(
      unwrap(multiply(feet!.mid, FOOT.magnitude.mid)),
      unwrap(multiply(inches!.mid, INCH.magnitude.mid)),
      LIMIT_BITS,
    ),
  );
  assert.ok(equals(sum, have.magnitude.mid));
});

test("counts are truncated toward zero, so every term has the sign of have", () => {
  assertTerms(terms(list(quantity("-1", { m: 1 }), [FOOT, INCH])), [
    "-3",
    "-428/127",
  ]);
  assertTerms(
    terms(list(quantity("-3661", { s: 1 }), [HOUR, MINUTE, SECOND])),
    ["-1", "-1", "-1"],
  );
  assertTerms(terms(list(quantity("0", { s: 1 }), [HOUR, MINUTE, SECOND])), [
    "0",
    "0",
    "0",
  ]);
});

test("the units may carry a magnitude, and need not be multiples of one another", () => {
  // 1 mi = 1.609344 km.
  assertTerms(terms(list(quantity("5000", { m: 1 }), [MILE, KILOMETRE])), [
    "3",
    "0.171968",
  ]);
  assertTerms(terms(list(METRE, [FOOT, quantity("0.003175", { m: 1 })])), [
    "3",
    "3424/127",
  ]);
});

test("a count carries its exponent, and one whose integer part cannot be formed is settled toward zero", () => {
  // `1.5e999999999 m` into `km;m`: the count `1.5e999999996` is an integer
  // as it stands, and the remainder is exactly zero.
  const have = quantity("1.5e999999999", { m: 1 });
  assertTerms(terms(list(have, [KILOMETRE, METRE])), ["1.5e999999996", "0"]);
  assertTerms(
    terms(list(quantity("-1.5e999999999", { m: 1 }), [KILOMETRE, METRE])),
    ["-1.5e999999996", "0"],
  );
  // `1e999999999 m` over a unit of `3 m`: the ratio `3.333...e999999998`
  // has an integer part of a billion digits, which cannot be formed
  // within the range limit, so the count is the midpoint settled toward
  // zero at the working digits (D8 as 4.4 amended it), an integer of that
  // many digits, and the remainder is what that count leaves, exactly.
  const three = quantity("3", { m: 1 });
  const [count, rest] = terms(
    list(quantity("1e999999999", { m: 1 }), [three, METRE]),
  );
  assert.ok(count !== undefined && rest !== undefined);
  assert.equal(workingDigits(CONTEXT), 18);
  assert.deepEqual(count, exact(dec("333333333333333333e999999981")));
  assert.equal(digitsOf(count.mid), workingDigits(CONTEXT));
  assert.deepEqual(rest, exact(dec("1e999999981")));
  // Negative, the same toward zero.
  const [negativeCount, negativeRest] = terms(
    list(quantity("-1e999999999", { m: 1 }), [three, METRE]),
  );
  assert.deepEqual(negativeCount, exact(dec("-333333333333333333e999999981")));
  assert.deepEqual(negativeRest, exact(dec("-1e999999981")));
});

test("a list of an inexact have of a huge exponent counts the settled midpoint, and the remainder is a small ball", () => {
  // `sqrt(2) * 1e999999999 m` into `km;m`: the ratio's midpoint has the
  // working digits and is an integer as it stands, so the count is that
  // value over a thousand, and the remainder is `have` less the count of
  // kilometres, a ball around zero whose radius is the have's, far below
  // its magnitude.
  const root = unwrap(rootBall(exact(fr(2n)), 2n, CONTEXT));
  const magnitude = unwrap(multiplyBalls(root, exact(dec("1e999999999"))));
  const have: Quantity = { magnitude, dimension: dim({ m: 1 }) };
  const [count, rest] = terms(list(have, [KILOMETRE, METRE]));
  assert.ok(count !== undefined && rest !== undefined);
  assert.ok(isExact(count));
  assert.ok(compare(count.mid, dec("1.414e999999996")) > 0);
  assert.ok(compare(count.mid, dec("1.415e999999996")) < 0);
  assert.deepEqual(
    unwrap(multiply(count.mid, KILOMETRE.magnitude.mid)),
    magnitude.mid,
  );
  assert.ok(isZero(rest.mid));
  assert.ok(!isExact(rest));
  assert.ok(containsZero(rest));
  // The remainder's radius is the have's, some sixty bits below its magnitude.
  assert.ok(
    log2OfRadius(rest.rad).int <
      log2OfRadius(magnitudeAbove(magnitude)).int - 50n,
  );
  // And `roundTerms` leaves such terms alone: a zero remainder shows exactly.
  assert.equal(
    round([KILOMETRE, METRE], [count, rest], 8, "halfAwayFromZero")[1],
    rest,
  );
});

test("every unit must conform to have, and the first that does not is reported", () => {
  assert.deepEqual(listFailure(list(METRE, [FOOT, SECOND])), {
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
  assert.deepEqual(listFailure(list(rpm, [hertz])), {
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
  assert.deepEqual(listFailure(list(METRE, [FOOT, quantity("0", { m: 1 })])), {
    kind: "nonpositiveUnit",
    index: 1,
  });
  assert.deepEqual(listFailure(list(METRE, [quantity("-1", { m: 1 }), INCH])), {
    kind: "nonpositiveUnit",
    index: 0,
  });
});

test("the units must decrease", () => {
  assert.deepEqual(listFailure(list(METRE, [INCH, FOOT])), {
    kind: "unitOutOfOrder",
    index: 1,
  });
  assert.deepEqual(listFailure(list(METRE, [FOOT, FOOT])), {
    kind: "unitOutOfOrder",
    index: 1,
  });
  assert.deepEqual(listFailure(list(METRE, [MILE, FOOT, CENTIMETRE, INCH])), {
    kind: "unitOutOfOrder",
    index: 3,
  });
});

test("the checks are in order, unit by unit", () => {
  // The second unit is out of order and the third does not conform.
  assert.deepEqual(listFailure(list(METRE, [INCH, FOOT, SECOND])), {
    kind: "unitOutOfOrder",
    index: 1,
  });
  // Conformance before positivity, for one unit.
  assert.deepEqual(
    listFailure(list(METRE, [quantity("0", { s: 1 })])).kind,
    "nonconformingUnit",
  );
});

test("an empty list is a programming error", () => {
  assert.throws(() => list(METRE, []), RangeError);
});

test("a count whose ratio straddles an integer is that integer, and the remainder is then around zero", () => {
  // A have of 360 ± 1e-30 degrees in degrees and minutes, the case of
  // units that carry a radius (D8 as amended at 3.4): the ratio straddles
  // 360, so the count is 360 and the remainder a ball around zero, not
  // 359 and a whole degree of minutes.
  const degree = quantity("1", { deg: 1 });
  const minute = of(fr(1n, 60n), { deg: 1 });
  const tiny = dec("1e-30");
  const straddling: Quantity = {
    magnitude: ball(fr(360n), tiny),
    dimension: dim({ deg: 1 }),
  };
  const above = terms(list(straddling, [degree, minute]));
  assert.deepEqual(above[0], exact(fr(360n)));
  assert.ok(containsZero(above[1]!) && !isExact(above[1]!));
  // A hair below the integer, straddling it, the same; a hair below and
  // not straddling, the truncated count and a remainder near sixty.
  const below: Quantity = {
    magnitude: ball(unwrap(subtract(fr(360n), dec("1e-40"), LIMIT_BITS)), tiny),
    dimension: dim({ deg: 1 }),
  };
  assert.deepEqual(terms(list(below, [degree, minute]))[0], exact(fr(360n)));
  const apart: Quantity = {
    magnitude: ball(unwrap(subtract(fr(360n), dec("1e-20"), LIMIT_BITS)), tiny),
    dimension: dim({ deg: 1 }),
  };
  const truncated = terms(list(apart, [degree, minute]));
  assert.deepEqual(truncated[0], exact(fr(359n)));
  assert.ok(compare(truncated[1]!.mid, fr(59n)) > 0);
  // Negative values are counted toward the nearest integer the same way.
  const negative: Quantity = {
    magnitude: ball(fr(-360n), tiny),
    dimension: dim({ deg: 1 }),
  };
  assert.deepEqual(
    terms(list(negative, [degree, minute]))[0],
    exact(fr(-360n)),
  );
  // An exact ratio straddles an integer only when it is one: the counts of
  // exact values are as they were.
  assertTerms(terms(list(METRE, [FOOT, INCH])), ["3", "428/127"]);
});

test("roundTerms leaves terms alone when the remainder shows exactly", () => {
  const exactTerms = terms(
    list(quantity("3661.5", { s: 1 }), [HOUR, MINUTE, SECOND]),
  );
  assert.equal(
    round([HOUR, MINUTE, SECOND], exactTerms, 8, "halfAwayFromZero"),
    exactTerms,
  );
});

test("roundTerms rounds the remainder to the digits given", () => {
  const rounded = round(
    [FOOT, INCH],
    terms(list(METRE, [FOOT, INCH])),
    8,
    "halfAwayFromZero",
  );
  assertMidpoints(rounded, ["3", "3.3700787"]);
});

test("roundTerms rounds the remainder in the mode given", () => {
  // The remainder is 3.37007874015... in.
  const exactTerms = terms(list(METRE, [FOOT, INCH]));
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "floor"), [
    "3",
    "3.3700787",
  ]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "ceiling"), [
    "3",
    "3.3700788",
  ]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 2, "towardZero"), [
    "3",
    "3.3",
  ]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 2, "awayFromZero"), [
    "3",
    "3.4",
  ]);
  // A directed mode rounds a negative remainder to its side of the line.
  const negative = terms(list(quantity("-1", { m: 1 }), [FOOT, INCH]));
  assertMidpoints(round([FOOT, INCH], negative, 8, "floor"), [
    "-3",
    "-3.3700788",
  ]);
  assertMidpoints(round([FOOT, INCH], negative, 8, "ceiling"), [
    "-3",
    "-3.3700787",
  ]);
});

test("roundTerms widens the remainder's radius by the rounding's shift, so the rounded terms still contain have", () => {
  // 1 m in ft;in: the remainder 428/127 in is exact, and rounded to eight
  // digits it moves by about 4e-8; the rounded term's ball must still
  // contain 428/127, and the terms times the units must contain 1 m.
  const unrounded = terms(list(METRE, [FOOT, INCH]));
  const rounded = round([FOOT, INCH], unrounded, 8, "halfAwayFromZero");
  const remainder = rounded[1]!;
  assert.ok(!isExact(remainder));
  const trueRemainder = unrounded[1]!.mid;
  assert.ok(
    compareFractions(
      absoluteFraction(
        subtractFractions(fraction(remainder.mid), fraction(trueRemainder)),
      ),
      radiusUpper(remainder.rad),
    ) <= 0,
  );
  const sum = unwrap(
    addBalls(
      unwrap(multiplyBalls(rounded[0]!, FOOT.magnitude)),
      unwrap(multiplyBalls(remainder, INCH.magnitude)),
      CONTEXT,
    ),
  );
  assert.ok(
    compareFractions(
      absoluteFraction(
        subtractFractions(fraction(sum.mid), fraction(METRE.magnitude.mid)),
      ),
      radiusUpper(sum.rad),
    ) <= 0,
  );
  // After a carry, the remainder left is a hair from zero and its ball says
  // so: `have` a hair under 3 ft, whose rounded terms are 3 ft and a last
  // term containing zero, not an exact zero.
  const almost = quantity("0.91439999997", { m: 1 });
  const carried = round(
    [FOOT, INCH],
    terms(list(almost, [FOOT, INCH])),
    8,
    "halfAwayFromZero",
  );
  assert.deepEqual(carried[0], exact(fr(3n)));
  assert.ok(containsZero(carried[1]!));
  assert.ok(!isExact(carried[1]!));
});

test("a remainder that rounds up to a whole of an earlier unit carries into it", () => {
  // 2 ft + 11.9999999988 in would show as 2 ft + 12 in.
  const have = quantity("0.91439999997", { m: 1 });
  assertTerms(terms(list(have, [FOOT, INCH])), ["2", "30479999997/2540000000"]);
  assertMidpoints(
    round([FOOT, INCH], terms(list(have, [FOOT, INCH])), 8, "halfAwayFromZero"),
    ["3", "0"],
  );
  // The carry runs through as many units as it must.
  const almostAnHour = quantity("3599.9999999999", { s: 1 });
  const units = [HOUR, MINUTE, SECOND];
  assertMidpoints(
    round(units, terms(list(almostAnHour, units)), 8, "halfAwayFromZero"),
    ["1", "0", "0"],
  );
  // And of a negative value.
  const negative = quantity("-0.91439999997", { m: 1 });
  assertMidpoints(
    round(
      [FOOT, INCH],
      terms(list(negative, [FOOT, INCH])),
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
  const exactTerms = terms(list(have, [FOOT, INCH]));
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "ceiling"), ["3", "0"]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "awayFromZero"), [
    "3",
    "0",
  ]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "floor"), [
    "2",
    "11.999999",
  ]);
  assertMidpoints(round([FOOT, INCH], exactTerms, 8, "towardZero"), [
    "2",
    "11.999999",
  ]);
  // On the negative value the sides swap: floor carries, ceiling does not.
  const negative = terms(
    list(quantity("-0.91439999997", { m: 1 }), [FOOT, INCH]),
  );
  assertMidpoints(round([FOOT, INCH], negative, 8, "floor"), ["-3", "0"]);
  assertMidpoints(round([FOOT, INCH], negative, 8, "ceiling"), [
    "-2",
    "-11.999999",
  ]);
});

test("roundTerms rounds by less than a unit in the last digit shown", () => {
  const have = quantity("0.91439999997", { m: 1 });
  const rounded = round(
    [FOOT, INCH],
    terms(list(have, [FOOT, INCH])),
    8,
    "halfAwayFromZero",
  );
  const shown = unwrap(
    add(
      unwrap(multiply(rounded[0]!.mid, FOOT.magnitude.mid)),
      unwrap(multiply(rounded[1]!.mid, INCH.magnitude.mid)),
      LIMIT_BITS,
    ),
  );
  // Within 1e-7 in of the exact value: the resolution of 11.999999 at 8 digits.
  const difference = unwrap(subtract(shown, have.magnitude.mid, LIMIT_BITS));
  const resolution = unwrap(multiply(dec("1e-7"), INCH.magnitude.mid));
  assert.ok(compare(absolute(difference), resolution) < 0);
});

// ---------------------------------------------------------------------------
// Inexact quantities

/** `mid` with a radius at or above `rad`, in the dimension of `unit`. */
function about(mid: string, rad: string, unit: Quantity): Quantity {
  return { magnitude: ball(dec(mid), dec(rad)), dimension: unit.dimension };
}

test("convert of an inexact have carries its radius", () => {
  // 1 m ± 1e-10 m in feet: the ratio is 1250/381 ± about 1e-10 / 0.3048,
  // the radius on the coarse type within `2^-25` above that.
  const have = about("1", "1e-10", METRE);
  const ratio = value(convert(have, FOOT, SI));
  assert.ok(equals(ratio.mid, fr(1250n, 381n)));
  assert.ok(!isExact(ratio));
  const rad = radiusUpper(ratio.rad);
  assert.ok(compareFractions(rad, fraction(dec("3.28e-10"))) >= 0);
  assert.ok(compareFractions(rad, fraction(dec("3.29e-10"))) <= 0);
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
  const [feet, inches] = terms(list(have, [FOOT, INCH]));
  assert.deepEqual(feet, exact(fr(3n)));
  assert.ok(inches !== undefined && !isExact(inches));
  // The remainder is 1 m - 3 ft over an inch: 0.0856 m / 0.0254 m, within
  // 1e-10 / 0.0254 of it.
  assert.ok(equals(inches.mid, fr(856n, 254n)));
  const rad = radiusUpper(inches.rad);
  assert.ok(compareFractions(rad, fraction(dec("3.93e-9"))) >= 0);
  assert.ok(compareFractions(rad, fraction(dec("3.94e-9"))) <= 0);
  // An inexact unit puts a radius on the remainder too, but the counts stay exact.
  const [count, rest] = terms(
    list(METRE, [about("0.3048", "1e-10", METRE), INCH]),
  );
  assert.deepEqual(count, exact(fr(3n)));
  assert.ok(rest !== undefined && !isExact(rest));
});

test("a unit that cannot be told from zero is not positive", () => {
  assert.deepEqual(
    listFailure(list(METRE, [FOOT, about("1e-12", "1e-11", METRE)])),
    { kind: "nonpositiveUnit", index: 1 },
  );
  assert.deepEqual(
    listFailure(list(METRE, [about("0", "1e-30", METRE), INCH])),
    { kind: "nonpositiveUnit", index: 0 },
  );
  assert.ok(containsZero(about("0", "1e-30", METRE).magnitude));
});

test("roundTerms keeps the radius on the rounded remainder", () => {
  const have = about("1", "1e-10", METRE);
  const exactTerms = terms(list(have, [FOOT, INCH]));
  const rounded = round([FOOT, INCH], exactTerms, 8, "halfAwayFromZero");
  assert.deepEqual(rounded[0], exact(fr(3n)));
  assert.ok(equals(rounded[1]!.mid, dec("3.3700787")));
  assert.ok(!isExact(rounded[1]!));
  // A carry keeps it too: 2 ft + 11.9999999988 in ± a hair is 3 ft + 0 ± a hair.
  const carried = round(
    [FOOT, INCH],
    terms(list(about("0.91439999997", "1e-12", METRE), [FOOT, INCH])),
    8,
    "halfAwayFromZero",
  );
  assert.deepEqual(carried[0], exact(fr(3n)));
  assert.ok(isZero(carried[1]!.mid));
  assert.ok(!isExact(carried[1]!));
});
