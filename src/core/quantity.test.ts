import assert from "node:assert/strict";
import { DEFAULT_ROUNDING, type NumberContext } from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  DIMENSIONLESS,
  type ConformanceError,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import {
  addQuantities,
  divideQuantities,
  multiplyQuantities,
  negateQuantity,
  powQuantity,
  scalar,
  subtractQuantities,
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
  roundTo,
  type Rational,
} from "./rational.ts";
import type { Result } from "./result.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
};

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

function value<E>(result: Result<Quantity, E>): Quantity {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure<E>(result: Result<Quantity, E>): E {
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
const INCH = quantity("0.0254", { m: 1 });
const RADIAN = quantity("1", { radian: 1 });

/** The primitives above, with the radian as a kind. */
const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  ["s", "dimension"],
  ["radian", "kind"],
]);

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

test("addition and subtraction combine magnitudes of one dimension", () => {
  assertQuantity(
    value(addQuantities(FOOT, INCH, PRIMITIVES)),
    quantity("0.3302", { m: 1 }),
  );
  assertQuantity(
    value(subtractQuantities(FOOT, INCH, PRIMITIVES)),
    quantity("0.2794", { m: 1 }),
  );
  assertQuantity(
    value(subtractQuantities(INCH, FOOT, PRIMITIVES)),
    quantity("-0.2794", { m: 1 }),
  );
  assertQuantity(
    value(addQuantities(scalar(rational(2n)), scalar(half), PRIMITIVES)),
    quantity("2.5"),
  );
  assertQuantity(
    value(subtractQuantities(METRE, METRE, PRIMITIVES)),
    quantity("0", { m: 1 }),
  );
  assertQuantity(
    value(addQuantities(RADIAN, RADIAN, PRIMITIVES)),
    quantity("2", { radian: 1 }),
  );
  // Exact, as every sum is: a third of a metre plus a metre is four thirds.
  const third = { magnitude: rational(1n, 3n), dimension: dim({ m: 1 }) };
  assertQuantity(value(addQuantities(METRE, third, PRIMITIVES)), {
    magnitude: rational(4n, 3n),
    dimension: dim({ m: 1 }),
  });
});

test("negation negates the magnitude and keeps the dimension", () => {
  assertQuantity(negateQuantity(FOOT), quantity("-0.3048", { m: 1 }));
  assertQuantity(negateQuantity(negateQuantity(FOOT)), FOOT);
  assertQuantity(negateQuantity(scalar(ZERO)), scalar(ZERO));
  assertQuantity(negateQuantity(RADIAN), quantity("-1", { radian: 1 }));
  assert.equal(negateQuantity(FOOT).dimension, FOOT.dimension);
});

test("a sum of quantities that do not conform fails with the mismatch", () => {
  const lengthAndTime: ConformanceError = {
    kind: "dimensionMismatch",
    have: dim({ m: 1 }),
    want: dim({ s: 1 }),
  };
  assert.deepEqual(
    failure(addQuantities(METRE, SECOND, PRIMITIVES)),
    lengthAndTime,
  );
  assert.deepEqual(
    failure(subtractQuantities(METRE, SECOND, PRIMITIVES)),
    lengthAndTime,
  );
  // A plain number, zero included, is not a quantity of any dimension.
  assert.deepEqual(failure(addQuantities(METRE, scalar(ZERO), PRIMITIVES)), {
    kind: "dimensionMismatch",
    have: dim({ m: 1 }),
    want: DIMENSIONLESS,
  });
  // The roles tell a kind mismatch from a dimension mismatch, as `convert`'s
  // check does; with no roles given, every primitive is a dimension.
  assert.deepEqual(failure(addQuantities(RADIAN, scalar(ONE), PRIMITIVES)), {
    kind: "kindMismatch",
    have: dim({ radian: 1 }),
    want: DIMENSIONLESS,
    kinds: ["radian"],
  });
  assert.deepEqual(failure(addQuantities(RADIAN, scalar(ONE), new Map())), {
    kind: "dimensionMismatch",
    have: dim({ radian: 1 }),
    want: DIMENSIONLESS,
  });
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
    value(powQuantity(quantity("2", { m: 1 }), rational(3n), CONTEXT)),
    quantity("8", { m: 3 }),
  );
  assertQuantity(
    value(powQuantity(FOOT, rational(2n), CONTEXT)),
    quantity("0.09290304", { m: 2 }),
  );
  assertQuantity(
    value(powQuantity(quantity("2", { m: 1, s: -1 }), rational(-2n), CONTEXT)),
    { magnitude: rational(1n, 4n), dimension: dim({ m: -2, s: 2 }) },
  );
});

test("the zeroth power is the dimensionless one", () => {
  assertQuantity(
    value(powQuantity(quantity("7", { m: 1, s: -2 }), ZERO, CONTEXT)),
    scalar(ONE),
  );
  assertQuantity(value(powQuantity(scalar(ZERO), ZERO, CONTEXT)), scalar(ONE));
});

test("a rational power that is exact stays exact", () => {
  assertQuantity(
    value(powQuantity(quantity("4", { m: 2 }), half, CONTEXT)),
    quantity("2", { m: 1 }),
  );
  assertQuantity(
    value(powQuantity(quantity("2.25", { m: 2 }), half, CONTEXT)),
    quantity("1.5", { m: 1 }),
  );
  assertQuantity(
    value(powQuantity(quantity("8", { m: 3 }), rational(2n, 3n), CONTEXT)),
    quantity("4", { m: 2 }),
  );
});

test("a rational power of a primitive gives a rational exponent", () => {
  assertQuantity(
    value(powQuantity(METRE, half, CONTEXT)),
    quantity("1", { m: half }),
  );
  // And the root of that is the primitive again.
  assertQuantity(
    value(
      powQuantity(
        value(powQuantity(METRE, half, CONTEXT)),
        rational(2n),
        CONTEXT,
      ),
    ),
    METRE,
  );
});

test("an inexact root truncates the magnitude once, to the precision", () => {
  const two = quantity("2", { m: 2 });
  const root5 = value(
    powQuantity(two, half, { precision: 5, rounding: DEFAULT_ROUNDING }),
  );
  assert.equal(format(root5.magnitude, 10, "halfAwayFromZero"), "1.4142");
  assert.deepEqual(root5.dimension, dim({ m: 1 }));
  const root40 = value(powQuantity(two, half, CONTEXT));
  assert.equal(
    format(root40.magnitude, 40, "halfAwayFromZero"),
    "1.414213562373095048801688724209698078569",
  );
  // Truncation composes: the shorter result is the longer one truncated.
  assert.ok(
    equals(roundTo(root40.magnitude, 5, "towardZero"), root5.magnitude),
  );
});

test("a power fails as its magnitude does", () => {
  assert.deepEqual(
    failure(powQuantity(quantity("0", { m: 1 }), rational(-1n), CONTEXT)),
    { kind: "divisionByZero" },
  );
  assert.deepEqual(
    failure(powQuantity(quantity("0", { m: 1 }), rational(-1n, 2n), CONTEXT)),
    { kind: "divisionByZero" },
  );
  assert.deepEqual(failure(powQuantity(scalar(rational(-4n)), half, CONTEXT)), {
    kind: "negativeRadicand",
    degree: 2n,
  });
  assert.deepEqual(
    failure(powQuantity(scalar(rational(10n)), rational(100000n), CONTEXT)),
    { kind: "tooLarge" },
  );
  // An odd root of a negative magnitude is fine.
  assertQuantity(
    value(powQuantity(quantity("-8", { m: 3 }), rational(1n, 3n), CONTEXT)),
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
  addQuantities(a, b, PRIMITIVES);
  subtractQuantities(b, b, PRIMITIVES);
  negateQuantity(a);
  powQuantity(a, half, CONTEXT);
  powQuantity(b, rational(-1n), CONTEXT);
  assert.deepEqual(a, quantity("2", { m: 1, s: -1 }));
  assert.deepEqual(b, quantity("0", { m: 1 }));
});
