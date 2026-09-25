import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { DIMENSIONLESS, type Dimension } from "./dimension.ts";
import {
  divideQuantities,
  multiplyQuantities,
  powQuantity,
  scalar,
  type Quantity,
} from "./quantity.ts";
import {
  DEFAULT_PRECISION,
  ONE,
  ZERO,
  equals,
  format,
  parseDecimal,
  rational,
  truncate,
  type Rational,
  type RationalError,
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

function value(result: Result<Quantity, RationalError>): Quantity {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<Quantity, RationalError>): RationalError {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `actual` is exactly `expected`, dimension included. */
function assertQuantity(actual: Quantity, expected: Quantity): void {
  assert.ok(
    equals(actual.magnitude, expected.magnitude),
    `expected magnitude ${inspect(expected.magnitude)}, got ${inspect(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, expected.dimension);
}

const half = rational(1n, 2n);

const METRE = quantity("1", { m: 1 });
const SECOND = quantity("1", { s: 1 });
const FOOT = quantity("0.3048", { m: 1 });
const RADIAN = quantity("1", { radian: 1 });

// ---------------------------------------------------------------------------
// Construction

test("a scalar is a magnitude of no dimension", () => {
  assert.deepEqual(scalar(rational(5n, 2n)), {
    magnitude: rational(5n, 2n),
    dimension: DIMENSIONLESS,
  });
  assert.ok(scalar(ZERO).dimension.size === 0);
});

// ---------------------------------------------------------------------------
// Multiplication and division

test("multiplication multiplies magnitudes and adds exponents", () => {
  assertQuantity(
    multiplyQuantities(quantity("2", { m: 1 }), quantity("3", { s: 1 })),
    quantity("6", { m: 1, s: 1 }),
  );
  assertQuantity(multiplyQuantities(METRE, METRE), quantity("1", { m: 2 }));
  assertQuantity(
    multiplyQuantities(scalar(rational(3n)), FOOT),
    quantity("0.9144", { m: 1 }),
  );
});

test("division divides magnitudes and subtracts exponents", () => {
  assertQuantity(
    value(divideQuantities(quantity("6", { m: 1 }), quantity("3", { s: 1 }))),
    quantity("2", { m: 1, s: -1 }),
  );
  assertQuantity(
    value(divideQuantities(scalar(ONE), SECOND)),
    quantity("1", { s: -1 }),
  );
  // Exact: 1 m / 3 ft is 1250/1143, which no decimal writes.
  assertQuantity(
    value(
      divideQuantities(METRE, multiplyQuantities(scalar(rational(3n)), FOOT)),
    ),
    { magnitude: rational(1250n, 1143n), dimension: DIMENSIONLESS },
  );
});

test("exponents that cancel are dropped", () => {
  assert.deepEqual(
    value(divideQuantities(METRE, METRE)).dimension,
    DIMENSIONLESS,
  );
  assert.deepEqual(
    multiplyQuantities(quantity("1", { s: -1 }), SECOND).dimension,
    DIMENSIONLESS,
  );
  assert.deepEqual(
    value(divideQuantities(quantity("1", { m: 2, s: -1 }), METRE)).dimension,
    dim({ m: 1, s: -1 }),
  );
});

test("kinds are exponents like any other", () => {
  assertQuantity(
    value(divideQuantities(RADIAN, SECOND)),
    quantity("1", { radian: 1, s: -1 }),
  );
  assert.deepEqual(
    value(divideQuantities(RADIAN, RADIAN)).dimension,
    DIMENSIONLESS,
  );
});

test("dividing by a zero magnitude fails", () => {
  assert.deepEqual(failure(divideQuantities(METRE, quantity("0", { m: 1 }))), {
    kind: "divisionByZero",
  });
  assert.deepEqual(failure(divideQuantities(scalar(ZERO), scalar(ZERO))), {
    kind: "divisionByZero",
  });
  // Whereas a zero dividend is simply zero.
  assertQuantity(
    value(divideQuantities(quantity("0", { m: 1 }), SECOND)),
    quantity("0", { m: 1, s: -1 }),
  );
});

// ---------------------------------------------------------------------------
// Powers

test("an integer power is exact and multiplies the exponents", () => {
  assertQuantity(
    value(
      powQuantity(quantity("2", { m: 1 }), rational(3n), DEFAULT_PRECISION),
    ),
    quantity("8", { m: 3 }),
  );
  assertQuantity(
    value(powQuantity(FOOT, rational(2n), DEFAULT_PRECISION)),
    quantity("0.09290304", { m: 2 }),
  );
  assertQuantity(
    value(
      powQuantity(
        quantity("2", { m: 1, s: -1 }),
        rational(-2n),
        DEFAULT_PRECISION,
      ),
    ),
    { magnitude: rational(1n, 4n), dimension: dim({ m: -2, s: 2 }) },
  );
});

test("the zeroth power is the dimensionless one", () => {
  assertQuantity(
    value(powQuantity(quantity("7", { m: 1, s: -2 }), ZERO, DEFAULT_PRECISION)),
    scalar(ONE),
  );
  assertQuantity(
    value(powQuantity(scalar(ZERO), ZERO, DEFAULT_PRECISION)),
    scalar(ONE),
  );
});

test("a rational power that is exact stays exact", () => {
  assertQuantity(
    value(powQuantity(quantity("4", { m: 2 }), half, DEFAULT_PRECISION)),
    quantity("2", { m: 1 }),
  );
  assertQuantity(
    value(powQuantity(quantity("2.25", { m: 2 }), half, DEFAULT_PRECISION)),
    quantity("1.5", { m: 1 }),
  );
  assertQuantity(
    value(
      powQuantity(quantity("8", { m: 3 }), rational(2n, 3n), DEFAULT_PRECISION),
    ),
    quantity("4", { m: 2 }),
  );
});

test("a rational power of a primitive gives a rational exponent", () => {
  assertQuantity(
    value(powQuantity(METRE, half, DEFAULT_PRECISION)),
    quantity("1", { m: half }),
  );
  // And the root of that is the primitive again.
  assertQuantity(
    value(
      powQuantity(
        value(powQuantity(METRE, half, DEFAULT_PRECISION)),
        rational(2n),
        DEFAULT_PRECISION,
      ),
    ),
    METRE,
  );
});

test("an inexact root truncates the magnitude once, to the precision", () => {
  const two = quantity("2", { m: 2 });
  const root5 = value(powQuantity(two, half, 5));
  assert.equal(format(root5.magnitude, 10), "1.4142");
  assert.deepEqual(root5.dimension, dim({ m: 1 }));
  const root40 = value(powQuantity(two, half, DEFAULT_PRECISION));
  assert.equal(
    format(root40.magnitude, 40),
    "1.414213562373095048801688724209698078569",
  );
  // Truncation composes: the shorter result is the longer one truncated.
  assert.ok(equals(truncate(root40.magnitude, 5), root5.magnitude));
});

test("a power fails as its magnitude does", () => {
  assert.deepEqual(
    failure(
      powQuantity(quantity("0", { m: 1 }), rational(-1n), DEFAULT_PRECISION),
    ),
    { kind: "divisionByZero" },
  );
  assert.deepEqual(
    failure(
      powQuantity(
        quantity("0", { m: 1 }),
        rational(-1n, 2n),
        DEFAULT_PRECISION,
      ),
    ),
    { kind: "divisionByZero" },
  );
  assert.deepEqual(
    failure(powQuantity(scalar(rational(-4n)), half, DEFAULT_PRECISION)),
    { kind: "negativeRadicand", degree: 2n },
  );
  assert.deepEqual(
    failure(
      powQuantity(scalar(rational(10n)), rational(100000n), DEFAULT_PRECISION),
    ),
    { kind: "tooLarge" },
  );
  // An odd root of a negative magnitude is fine.
  assertQuantity(
    value(
      powQuantity(
        quantity("-8", { m: 3 }),
        rational(1n, 3n),
        DEFAULT_PRECISION,
      ),
    ),
    quantity("-2", { m: 1 }),
  );
});

// ---------------------------------------------------------------------------
// Purity

test("the operations leave their operands alone", () => {
  const a = quantity("2", { m: 1, s: -1 });
  const b = quantity("0", { m: 1 });
  multiplyQuantities(a, b);
  divideQuantities(a, b);
  divideQuantities(b, a);
  powQuantity(a, half, DEFAULT_PRECISION);
  powQuantity(b, rational(-1n), DEFAULT_PRECISION);
  assert.deepEqual(a, quantity("2", { m: 1, s: -1 }));
  assert.deepEqual(b, quantity("0", { m: 1 }));
});
