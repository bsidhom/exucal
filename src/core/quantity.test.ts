import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { containsZero, exact, isExact } from "./ball.ts";
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
  ZERO as ZERO_FRACTION,
  compare as compareFractions,
  rational,
  type Rational,
} from "./rational.ts";
import { ONE, ZERO, format, type Scaled } from "./scaled.ts";
import { dec, digitsOf, fr } from "../testing/scaled.ts";
import { DEFAULT_PRECISION } from "./rounding.ts";
import type { Result } from "./result.ts";
import { radiusUpper } from "./radius.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };
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
  assert.deepEqual(actual.magnitude, expected.magnitude);
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
  assert.deepEqual(scalar(fr(5n, 2n)), {
    magnitude: exact(fr(5n, 2n)),
    dimension: DIMENSIONLESS,
  });
  assert.ok(scalar(ZERO).dimension.size === 0);
});

// ---------------------------------------------------------------------------
// Multiplication and division

test("multiplication multiplies magnitudes and adds exponents", () => {
  assertQuantity(
    value(multiplyQuantities(quantity("2", { m: 1 }), quantity("3", { s: 1 }))),
    quantity("6", { m: 1, s: 1 }),
  );
  assertQuantity(
    value(multiplyQuantities(METRE, METRE)),
    quantity("1", { m: 2 }),
  );
  assertQuantity(
    value(multiplyQuantities(scalar(fr(3n)), FOOT)),
    quantity("0.9144", { m: 1 }),
  );
});

test("a product is a Result: the exponent carries, and passes the bound", () => {
  const huge = quantity("1e999999999", { m: 1 });
  assertQuantity(
    value(multiplyQuantities(huge, huge)),
    quantity("1e1999999998", { m: 2 }),
  );
  assertQuantity(
    value(multiplyQuantities(huge, quantity("1e-999999999", { s: 1 }))),
    quantity("1", { m: 1, s: 1 }),
  );
  // Beyond `10^(10^18)` the product is too large, whatever the dimension.
  assert.deepEqual(
    failure(
      multiplyQuantities(
        quantity("1e999999999999999999", { m: 1 }),
        quantity("1e10"),
      ),
    ),
    { kind: "tooLarge" },
  );
  assert.deepEqual(
    failure(
      divideQuantities(
        quantity("1e-999999999999999999", { m: 1 }),
        quantity("1e10"),
      ),
    ),
    { kind: "tooLarge" },
  );
});

test("addition and subtraction combine magnitudes of one dimension", () => {
  assertQuantity(
    value(addQuantities(FOOT, INCH, PRIMITIVES, CONTEXT)),
    quantity("0.3302", { m: 1 }),
  );
  assertQuantity(
    value(subtractQuantities(FOOT, INCH, PRIMITIVES, CONTEXT)),
    quantity("0.2794", { m: 1 }),
  );
  assertQuantity(
    value(subtractQuantities(INCH, FOOT, PRIMITIVES, CONTEXT)),
    quantity("-0.2794", { m: 1 }),
  );
  assertQuantity(
    value(
      addQuantities(scalar(fr(2n)), scalar(fr(1n, 2n)), PRIMITIVES, CONTEXT),
    ),
    quantity("2.5"),
  );
  assertQuantity(
    value(subtractQuantities(METRE, METRE, PRIMITIVES, CONTEXT)),
    quantity("0", { m: 1 }),
  );
  assertQuantity(
    value(addQuantities(RADIAN, RADIAN, PRIMITIVES, CONTEXT)),
    quantity("2", { radian: 1 }),
  );
  // Exact, as every aligned sum is: a third of a metre plus a metre is
  // four thirds.
  const third = of(fr(1n, 3n), { m: 1 });
  assertQuantity(
    value(addQuantities(METRE, third, PRIMITIVES, CONTEXT)),
    of(fr(4n, 3n), { m: 1 }),
  );
});

test("a sum takes the context, and two exact magnitudes that cannot be aligned within its range limit are too large", () => {
  const huge = quantity("1e999999999", { m: 1 });
  // Aligned within the limit, whatever the exponent: exact.
  assertQuantity(
    value(
      addQuantities(
        huge,
        quantity("3e999999998", { m: 1 }),
        PRIMITIVES,
        CONTEXT,
      ),
    ),
    quantity("1.3e999999999", { m: 1 }),
  );
  assertQuantity(
    value(subtractQuantities(huge, huge, PRIMITIVES, CONTEXT)),
    quantity("0", { m: 1 }),
  );
  // `1e999999999 m + 1 m` has an exact sum that cannot be held.
  assert.deepEqual(failure(addQuantities(huge, METRE, PRIMITIVES, CONTEXT)), {
    kind: "tooLarge",
  });
  assert.deepEqual(
    failure(subtractQuantities(METRE, huge, PRIMITIVES, CONTEXT)),
    { kind: "tooLarge" },
  );
  // The conformance check comes first: a mismatch is reported as one.
  assert.equal(
    failure(addQuantities(huge, SECOND, PRIMITIVES, CONTEXT)).kind,
    "dimensionMismatch",
  );
  // With an inexact operand the smaller is absorbed into the radius.
  const root = value(powQuantity(quantity("2", { m: 2 }), half, CONTEXT));
  const absorbed = value(addQuantities(root, huge, PRIMITIVES, CONTEXT));
  assert.deepEqual(absorbed.magnitude.mid, huge.magnitude.mid);
  assert.ok(!isExact(absorbed.magnitude));
  assert.deepEqual(absorbed.dimension, dim({ m: 1 }));
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
    failure(addQuantities(METRE, SECOND, PRIMITIVES, CONTEXT)),
    lengthAndTime,
  );
  assert.deepEqual(
    failure(subtractQuantities(METRE, SECOND, PRIMITIVES, CONTEXT)),
    lengthAndTime,
  );
  // A plain number, zero included, is not a quantity of any dimension.
  assert.deepEqual(
    failure(addQuantities(METRE, scalar(ZERO), PRIMITIVES, CONTEXT)),
    {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: DIMENSIONLESS,
    },
  );
  // The roles tell a kind mismatch from a dimension mismatch, as `convert`'s
  // check does; with no roles given, every primitive is a dimension.
  assert.deepEqual(
    failure(addQuantities(RADIAN, scalar(ONE), PRIMITIVES, CONTEXT)),
    {
      kind: "kindMismatch",
      have: dim({ radian: 1 }),
      want: DIMENSIONLESS,
      kinds: ["radian"],
    },
  );
  assert.deepEqual(
    failure(addQuantities(RADIAN, scalar(ONE), new Map(), CONTEXT)),
    {
      kind: "dimensionMismatch",
      have: dim({ radian: 1 }),
      want: DIMENSIONLESS,
    },
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
      divideQuantities(METRE, value(multiplyQuantities(scalar(fr(3n)), FOOT))),
    ),
    of(fr(1250n, 1143n)),
  );
});

test("exponents that cancel are dropped", () => {
  assert.deepEqual(
    value(divideQuantities(METRE, METRE)).dimension,
    DIMENSIONLESS,
  );
  assert.deepEqual(
    value(multiplyQuantities(quantity("1", { s: -1 }), SECOND)).dimension,
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
    of(fr(1n, 4n), { m: -2, s: 2 }),
  );
});

test("the zeroth power is the dimensionless one", () => {
  assertQuantity(
    value(powQuantity(quantity("7", { m: 1, s: -2 }), ZERO_FRACTION, CONTEXT)),
    scalar(ONE),
  );
  assertQuantity(
    value(powQuantity(scalar(ZERO), ZERO_FRACTION, CONTEXT)),
    scalar(ONE),
  );
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

test("an inexact root is computed once on the kernel, at the precision", () => {
  const two = quantity("2", { m: 2 });
  const root5 = value(powQuantity(two, half, at(5)));
  // The kernel carries the precision plus its guard, and the midpoint is
  // on the decimal grid of the working digits: five digits asked for give
  // a radius between 10^-17 and 10^-13, and the digits to match.
  assert.equal(
    format(root5.magnitude.mid, 10, "halfAwayFromZero"),
    "1.414213562",
  );
  assert.ok(digitsOf(root5.magnitude.mid) <= workingDigits(at(5)));
  assert.deepEqual(root5.dimension, dim({ m: 1 }));
  const rad5 = radiusUpper(root5.magnitude.rad);
  assert.ok(compareFractions(rad5, rational(1n, 10n ** 13n)) < 0);
  assert.ok(compareFractions(rad5, rational(1n, 10n ** 17n)) > 0);
  const root40 = value(powQuantity(two, half, CONTEXT));
  assert.equal(
    format(root40.magnitude.mid, 40, "halfAwayFromZero"),
    "1.41421356237309504880168872420969807857",
  );
  assert.ok(digitsOf(root40.magnitude.mid) <= workingDigits(CONTEXT));
  assert.ok(
    compareFractions(
      radiusUpper(root40.magnitude.rad),
      rational(1n, 10n ** 48n),
    ) < 0,
  );
});

test("an inexact magnitude carries its radius through the exact operations", () => {
  const root = value(powQuantity(quantity("2", { m: 2 }), half, CONTEXT));
  const doubled = value(multiplyQuantities(scalar(fr(2n)), root));
  assert.ok(!isExact(doubled.magnitude));
  assert.ok(
    !isExact(value(addQuantities(root, METRE, PRIMITIVES, CONTEXT)).magnitude),
  );
  assert.ok(!isExact(negateQuantity(root).magnitude));
  // Whereas an exact zero times it is exact zero.
  assert.deepEqual(value(multiplyQuantities(scalar(ZERO), root)), {
    magnitude: exact(ZERO),
    dimension: dim({ m: 1 }),
  });
});

test("dividing by a magnitude that cannot be told from zero is unresolved", () => {
  // sqrt(2)^2 - 2 is a ball around zero, not zero.
  const root = value(powQuantity(scalar(fr(2n)), half, CONTEXT));
  const squared = value(powQuantity(root, rational(2n), CONTEXT));
  const almostZero = value(
    subtractQuantities(squared, scalar(fr(2n)), PRIMITIVES, CONTEXT),
  );
  assert.ok(containsZero(almostZero.magnitude));
  assert.ok(!isExact(almostZero.magnitude));
  assert.deepEqual(failure(divideQuantities(METRE, almostZero)), {
    kind: "unresolved",
  });
  assert.deepEqual(failure(powQuantity(almostZero, rational(-1n), CONTEXT)), {
    kind: "unresolved",
  });
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
  assert.deepEqual(failure(powQuantity(scalar(fr(-4n)), half, CONTEXT)), {
    kind: "negativeRadicand",
    degree: 2n,
  });
  assert.deepEqual(
    failure(powQuantity(scalar(fr(7n)), rational(100000n), CONTEXT)),
    { kind: "tooLarge" },
  );
  // A power of ten costs nothing: the exponent takes it.
  assertQuantity(
    value(powQuantity(scalar(fr(10n)), rational(100000n), CONTEXT)),
    quantity("1e100000"),
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
  addQuantities(a, b, PRIMITIVES, CONTEXT);
  subtractQuantities(b, b, PRIMITIVES, CONTEXT);
  negateQuantity(a);
  powQuantity(a, half, CONTEXT);
  powQuantity(b, rational(-1n), CONTEXT);
  assert.deepEqual(a, quantity("2", { m: 1, s: -1 }));
  assert.deepEqual(b, quantity("0", { m: 1 }));
});
