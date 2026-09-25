import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  DIMENSIONLESS,
  checkConformance,
  divideDimensions,
  equalDimensions,
  formatDimension,
  isDimensionless,
  multiplyDimensions,
  powDimension,
  primitive,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import { parseExpr } from "./expr.ts";
import { rational, type Rational } from "./rational.ts";
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

const half = rational(1n, 2n);

// Some familiar dimensions.
const LENGTH = dim({ m: 1 });
const TIME = dim({ s: 1 });
const FORCE = dim({ kg: 1, m: 1, s: -2 });
const ENERGY = dim({ kg: 1, m: 2, s: -2 });
const TORQUE = dim({ kg: 1, m: 2, s: -2, radian: -1 });
const ANGLE = dim({ radian: 1 });
const ANGULAR_VELOCITY = dim({ radian: 1, s: -1 });
const FREQUENCY = dim({ s: -1 });

/** Asserts that the check failed, and returns the error. */
function failure(
  result: Result<undefined, ConformanceError>,
): ConformanceError {
  assert.ok(!result.ok, `expected a mismatch, got ${inspect(result)}`);
  return result.error;
}

/** The dimensions differ physically. */
function dimensionMismatch(have: Dimension, want: Dimension): ConformanceError {
  return { kind: "dimensionMismatch", have, want };
}

/** The dimensions differ only in the named kinds. */
function kindMismatch(
  have: Dimension,
  want: Dimension,
  ...kinds: string[]
): ConformanceError {
  return { kind: "kindMismatch", have, want, kinds };
}

// ---------------------------------------------------------------------------
// Construction and equality

test("a primitive has exponent one and nothing else", () => {
  assert.deepEqual(primitive("m"), dim({ m: 1 }));
  assert.ok(!isDimensionless(primitive("m")));
});

test("the dimensionless dimension is empty", () => {
  assert.ok(isDimensionless(DIMENSIONLESS));
  assert.equal(DIMENSIONLESS.size, 0);
  assert.ok(isDimensionless(dim({})));
});

test("equality ignores the order of entries", () => {
  assert.ok(equalDimensions(dim({ m: 1, s: -1 }), dim({ s: -1, m: 1 })));
  assert.ok(equalDimensions(DIMENSIONLESS, dim({})));
  assert.ok(!equalDimensions(dim({ m: 1 }), dim({ m: 2 })));
  assert.ok(!equalDimensions(dim({ m: 1 }), dim({ s: 1 })));
  assert.ok(!equalDimensions(dim({ m: 1 }), dim({ m: 1, s: 1 })));
  assert.ok(!equalDimensions(dim({ m: 1, s: 1 }), dim({ m: 1 })));
  assert.ok(!equalDimensions(dim({ m: 1 }), DIMENSIONLESS));
});

// ---------------------------------------------------------------------------
// Arithmetic

test("multiplication adds exponents", () => {
  assert.deepEqual(multiplyDimensions(LENGTH, LENGTH), dim({ m: 2 }));
  assert.deepEqual(multiplyDimensions(FORCE, LENGTH), ENERGY);
  assert.deepEqual(multiplyDimensions(LENGTH, TIME), dim({ m: 1, s: 1 }));
});

test("division subtracts exponents", () => {
  assert.deepEqual(divideDimensions(ENERGY, LENGTH), FORCE);
  assert.deepEqual(divideDimensions(LENGTH, TIME), dim({ m: 1, s: -1 }));
  assert.deepEqual(divideDimensions(DIMENSIONLESS, TIME), FREQUENCY);
  assert.deepEqual(divideDimensions(ENERGY, ANGLE), TORQUE);
});

test("an exponent that cancels to zero is dropped", () => {
  assert.deepEqual(divideDimensions(LENGTH, LENGTH), DIMENSIONLESS);
  assert.deepEqual(multiplyDimensions(FREQUENCY, TIME), DIMENSIONLESS);
  assert.deepEqual(
    multiplyDimensions(dim({ m: 1, s: -1 }), dim({ s: 1 })),
    LENGTH,
  );
  assert.deepEqual(
    multiplyDimensions(dim({ m: half }), dim({ m: rational(-1n, 2n) })),
    DIMENSIONLESS,
  );
});

test("arithmetic leaves its operands alone", () => {
  const a = dim({ m: 1 });
  const b = dim({ m: -1, s: 1 });
  multiplyDimensions(a, b);
  divideDimensions(a, b);
  powDimension(a, rational(0n));
  assert.deepEqual(a, dim({ m: 1 }));
  assert.deepEqual(b, dim({ m: -1, s: 1 }));
});

test("a power multiplies every exponent", () => {
  assert.deepEqual(powDimension(LENGTH, rational(3n)), dim({ m: 3 }));
  assert.deepEqual(
    powDimension(FORCE, rational(-2n)),
    dim({ kg: -2, m: -2, s: 4 }),
  );
  assert.deepEqual(powDimension(DIMENSIONLESS, rational(5n)), DIMENSIONLESS);
});

test("roots are exact on the dimension side", () => {
  assert.deepEqual(powDimension(dim({ m: 2 }), half), LENGTH);
  assert.deepEqual(powDimension(LENGTH, half), dim({ m: half }));
  assert.deepEqual(powDimension(dim({ m: half }), rational(2n)), dim({ m: 1 }));
  assert.deepEqual(
    powDimension(dim({ m: 3, s: -2 }), rational(1n, 3n)),
    dim({ m: 1, s: rational(-2n, 3n) }),
  );
});

test("the zeroth power is dimensionless", () => {
  assert.deepEqual(powDimension(FORCE, rational(0n)), DIMENSIONLESS);
  assert.deepEqual(powDimension(TORQUE, rational(0n)), DIMENSIONLESS);
});

// ---------------------------------------------------------------------------
// Conformance: dimensions

test("equal dimensions conform", () => {
  assert.deepEqual(checkConformance(LENGTH, LENGTH, SI), {
    ok: true,
    value: undefined,
  });
  assert.ok(checkConformance(FORCE, dim({ s: -2, m: 1, kg: 1 }), SI).ok);
  assert.ok(checkConformance(DIMENSIONLESS, DIMENSIONLESS, SI).ok);
  assert.ok(checkConformance(TORQUE, TORQUE, SI).ok);
  assert.ok(checkConformance(dim({ m: half }), dim({ m: half }), SI).ok);
});

test("different dimension primitives do not conform", () => {
  assert.deepEqual(
    failure(checkConformance(LENGTH, TIME, SI)),
    dimensionMismatch(LENGTH, TIME),
  );
  assert.deepEqual(
    failure(checkConformance(FORCE, ENERGY, SI)),
    dimensionMismatch(FORCE, ENERGY),
  );
});

test("a dimension present on one side only is a mismatch", () => {
  assert.deepEqual(
    failure(checkConformance(LENGTH, DIMENSIONLESS, SI)),
    dimensionMismatch(LENGTH, DIMENSIONLESS),
  );
  assert.deepEqual(
    failure(checkConformance(DIMENSIONLESS, LENGTH, SI)),
    dimensionMismatch(DIMENSIONLESS, LENGTH),
  );
});

test("the same primitive with different exponents is a mismatch", () => {
  const area = dim({ m: 2 });
  assert.deepEqual(
    failure(checkConformance(LENGTH, area, SI)),
    dimensionMismatch(LENGTH, area),
  );
  const root = dim({ m: half });
  assert.deepEqual(
    failure(checkConformance(LENGTH, root, SI)),
    dimensionMismatch(LENGTH, root),
  );
});

test("a name the table does not declare counts as a dimension", () => {
  const none: Primitives = new Map();
  assert.ok(checkConformance(LENGTH, LENGTH, none).ok);
  assert.deepEqual(
    failure(checkConformance(LENGTH, TIME, none)),
    dimensionMismatch(LENGTH, TIME),
  );
  // Even beside a declared kind: the physical mismatch is reported first.
  assert.deepEqual(
    failure(
      checkConformance(ANGULAR_VELOCITY, LENGTH, primitives("radian!kind")),
    ),
    dimensionMismatch(ANGULAR_VELOCITY, LENGTH),
  );
});

// ---------------------------------------------------------------------------
// Conformance: kinds

test("angular velocity is not a frequency", () => {
  assert.deepEqual(
    failure(checkConformance(ANGULAR_VELOCITY, FREQUENCY, SI)),
    kindMismatch(ANGULAR_VELOCITY, FREQUENCY, "radian"),
  );
  assert.deepEqual(
    failure(checkConformance(FREQUENCY, ANGULAR_VELOCITY, SI)),
    kindMismatch(FREQUENCY, ANGULAR_VELOCITY, "radian"),
  );
});

test("torque is not energy", () => {
  assert.deepEqual(
    failure(checkConformance(TORQUE, ENERGY, SI)),
    kindMismatch(TORQUE, ENERGY, "radian"),
  );
});

test("an angle is not a plain number", () => {
  assert.deepEqual(
    failure(checkConformance(ANGLE, DIMENSIONLESS, SI)),
    kindMismatch(ANGLE, DIMENSIONLESS, "radian"),
  );
  assert.deepEqual(
    failure(checkConformance(DIMENSIONLESS, ANGLE, SI)),
    kindMismatch(DIMENSIONLESS, ANGLE, "radian"),
  );
});

test("a kind with a different exponent is a kind mismatch", () => {
  // A solid angle as the square of a plane angle.
  const solidAngle = dim({ radian: 2 });
  assert.deepEqual(
    failure(checkConformance(ANGLE, solidAngle, SI)),
    kindMismatch(ANGLE, solidAngle, "radian"),
  );
});

test("a dimension mismatch takes precedence over a kind mismatch", () => {
  // Both the physical dimension and the kind differ: the physical one is
  // what gets reported, so a kind mismatch always means "same dimension".
  assert.deepEqual(
    failure(checkConformance(ANGULAR_VELOCITY, LENGTH, SI)),
    dimensionMismatch(ANGULAR_VELOCITY, LENGTH),
  );
  assert.deepEqual(
    failure(checkConformance(ANGLE, LENGTH, SI)),
    dimensionMismatch(ANGLE, LENGTH),
  );
});

test("every kind that differs is named, in declaration order", () => {
  const table = primitives("m", "bit!kind", "radian!kind", "count!kind");
  const have = dim({ m: 1, radian: 1, count: 1 });
  const want = dim({ m: 1, bit: 1, count: 2 });
  assert.deepEqual(
    failure(checkConformance(have, want, table)),
    kindMismatch(have, want, "bit", "radian", "count"),
  );
  // A kind that matches on both sides is not named.
  const shared = dim({ m: 1, bit: 1, radian: 1 });
  const other = dim({ m: 1, bit: 1, radian: 2 });
  assert.deepEqual(
    failure(checkConformance(shared, other, table)),
    kindMismatch(shared, other, "radian"),
  );
});

test("which names are kinds comes from the table alone", () => {
  // With radian declared as a dimension primitive, the same difference is a
  // dimension mismatch.
  const physicalRadian = primitives("m", "s", "radian");
  assert.deepEqual(
    failure(checkConformance(ANGULAR_VELOCITY, FREQUENCY, physicalRadian)),
    dimensionMismatch(ANGULAR_VELOCITY, FREQUENCY),
  );
  // And with `s` declared a kind, seconds against nothing is a kind mismatch.
  const odd = primitives("m", "s!kind");
  assert.deepEqual(
    failure(checkConformance(TIME, DIMENSIONLESS, odd)),
    kindMismatch(TIME, DIMENSIONLESS, "s"),
  );
});

test("the error carries the dimensions as given", () => {
  const error = failure(checkConformance(TORQUE, ENERGY, SI));
  assert.equal(error.have, TORQUE);
  assert.equal(error.want, ENERGY);
});

// ---------------------------------------------------------------------------
// Formatting

test("a dimensionless dimension formats as 1", () => {
  assert.equal(formatDimension(DIMENSIONLESS, SI), "1");
});

test("positive exponents are juxtaposed, in declaration order", () => {
  assert.equal(formatDimension(LENGTH, SI), "m");
  assert.equal(formatDimension(dim({ m: 2 }), SI), "m^2");
  assert.equal(formatDimension(dim({ m: 1, kg: 1 }), SI), "kg m");
  assert.equal(formatDimension(dim({ s: 1, m: 3, kg: 2 }), SI), "kg^2 m^3 s");
});

test("negative exponents go after a slash, with their sign dropped", () => {
  assert.equal(formatDimension(FREQUENCY, SI), "1 / s");
  assert.equal(formatDimension(dim({ m: 1, s: -1 }), SI), "m / s");
  assert.equal(formatDimension(FORCE, SI), "kg m / s^2");
  assert.equal(formatDimension(dim({ s: -2, m: -1 }), SI), "1 / m s^2");
  assert.equal(
    formatDimension(dim({ kg: 1, m: 2, s: -3, A: -1 }), SI),
    "kg m^2 / s^3 A",
  );
});

test("kinds format like any other primitive", () => {
  assert.equal(formatDimension(ANGLE, SI), "radian");
  assert.equal(formatDimension(ANGULAR_VELOCITY, SI), "radian / s");
  assert.equal(formatDimension(TORQUE, SI), "kg m^2 / s^2 radian");
});

test("non-integer exponents are parenthesized", () => {
  assert.equal(formatDimension(dim({ m: half }), SI), "m^(1/2)");
  assert.equal(
    formatDimension(dim({ m: rational(-3n, 2n) }), SI),
    "1 / m^(3/2)",
  );
  assert.equal(
    formatDimension(dim({ kg: half, s: rational(-1n, 3n) }), SI),
    "kg^(1/2) / s^(1/3)",
  );
});

test("undeclared primitives come last, in the order met", () => {
  assert.equal(
    formatDimension(dim({ y: 1, x: 1, m: 1, s: -1 }), SI),
    "m y x / s",
  );
  assert.equal(formatDimension(dim({ b: 1, a: 2 }), new Map()), "b a^2");
});

test("what a dimension formats as is an expression the grammar accepts", () => {
  const dimensions = [
    DIMENSIONLESS,
    LENGTH,
    FREQUENCY,
    FORCE,
    TORQUE,
    dim({ kg: 1, m: 2, s: -3, A: -1 }),
    dim({ m: half }),
    dim({ m: rational(-3n, 2n) }),
    dim({ kg: half, s: rational(-1n, 3n) }),
  ];
  for (const d of dimensions) {
    const text = formatDimension(d, SI);
    assert.ok(parseExpr(text).ok, `${JSON.stringify(text)} does not parse`);
  }
});
