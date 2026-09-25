import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { DIMENSIONLESS, type Dimension } from "./dimension.ts";
import { evaluate, type EvaluateError, type Lookup } from "./evaluate.ts";
import { parseExpr, type Expr } from "./expr.ts";
import { type Span } from "./parser.ts";
import { type Quantity } from "./quantity.ts";
import {
  DEFAULT_PRECISION,
  ONE,
  ZERO,
  equals,
  format,
  parseDecimal,
  rational,
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

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(
    result.ok,
    `expected ${JSON.stringify(text)} to parse, got ${inspect(result)}`,
  );
  return result.value;
}

/** What the lookup over a plain record of units fails with. */
type UnknownUnit = {
  readonly kind: "unknownUnit";
  readonly name: string;
  readonly span: Span;
};

/** A lookup over the units given, as the table's would be. */
function lookupIn(units: Record<string, Quantity>): Lookup<UnknownUnit> {
  return (name, span) => {
    const unit = Object.hasOwn(units, name) ? units[name] : undefined;
    return unit === undefined
      ? { ok: false, error: { kind: "unknownUnit", name, span } }
      : { ok: true, value: unit };
  };
}

/** Some units, as the table would hold them: SI magnitudes over `m`, `s`... */
const UNITS: Record<string, Quantity> = {
  m: quantity("1", { m: 1 }),
  cm: quantity("0.01", { m: 1 }),
  ft: quantity("0.3048", { m: 1 }),
  inch: quantity("0.0254", { m: 1 }),
  kg: quantity("1", { kg: 1 }),
  s: quantity("1", { s: 1 }),
  h: quantity("3600", { s: 1 }),
  radian: quantity("1", { radian: 1 }),
  N: quantity("1", { kg: 1, m: 1, s: -2 }),
  zero: quantity("0", { m: 1 }),
  neg: quantity("-4", { m: 2 }),
  neg8: quantity("-8", { m: 3 }),
};

const lookup = lookupIn(UNITS);

type Failure = EvaluateError | UnknownUnit;

/** Evaluates `text` with the units above at the default precision. */
function run(
  text: string,
  precision = DEFAULT_PRECISION,
): Result<Quantity, Failure> {
  return evaluate(parsed(text), lookup, precision);
}

function value(result: Result<Quantity, Failure>): Quantity {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<Quantity, Failure>): Failure {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `text` evaluates to exactly `expected`, dimension included. */
function assertEvaluates(text: string, expected: Quantity): void {
  const actual = value(run(text));
  assert.ok(
    equals(actual.magnitude, expected.magnitude),
    `${JSON.stringify(text)}: expected magnitude ${inspect(expected.magnitude)}, got ${inspect(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, expected.dimension, JSON.stringify(text));
}

const half = rational(1n, 2n);

// ---------------------------------------------------------------------------
// Leaves

test("a number is a dimensionless quantity", () => {
  assertEvaluates("2", quantity("2"));
  assertEvaluates("2.54", quantity("2.54"));
  assertEvaluates("1e-3", {
    magnitude: rational(1n, 1000n),
    dimension: DIMENSIONLESS,
  });
  assertEvaluates("0", quantity("0"));
});

test("a unit is whatever the lookup says it is", () => {
  assertEvaluates("m", UNITS.m);
  assertEvaluates("ft", UNITS.ft);
  assertEvaluates("N", UNITS.N);
  // The lookup's value is taken as is, not copied or inspected.
  assert.equal(value(run("N")), UNITS.N);
});

test("the lookup is given the name and the span of the reference", () => {
  const seen: [string, Span][] = [];
  const spy: Lookup<never> = (name, span) => {
    seen.push([name, span]);
    return { ok: true, value: UNITS.m };
  };
  evaluate(parsed("  kg m / s^2"), spy, DEFAULT_PRECISION);
  assert.deepEqual(seen, [
    ["kg", { start: 2, end: 4 }],
    ["m", { start: 5, end: 6 }],
    ["s", { start: 9, end: 10 }],
  ]);
});

// ---------------------------------------------------------------------------
// Operators

test("juxtaposition and * multiply", () => {
  assertEvaluates("2 m", quantity("2", { m: 1 }));
  assertEvaluates("2 * m", quantity("2", { m: 1 }));
  assertEvaluates("3 ft", quantity("0.9144", { m: 1 }));
  assertEvaluates("kg m", quantity("1", { kg: 1, m: 1 }));
  assertEvaluates("2 * 3 * 4", quantity("24"));
  assertEvaluates("m m", quantity("1", { m: 2 }));
});

test("/ divides", () => {
  assertEvaluates("m / s", quantity("1", { m: 1, s: -1 }));
  assertEvaluates("1 / s", quantity("1", { s: -1 }));
  assertEvaluates("6 / 3", quantity("2"));
  assertEvaluates("cm / m", quantity("0.01"));
  assertEvaluates("m / cm", quantity("100"));
  assertEvaluates("kg m / s / s", UNITS.N);
});

test("evaluation follows the tree the parser built", () => {
  // Juxtaposition binds tighter than `/`: 1 / (2 m).
  assertEvaluates("1/2 m", { magnitude: half, dimension: dim({ m: -1 }) });
  assertEvaluates("(1/2) m", { magnitude: half, dimension: dim({ m: 1 }) });
  // `*` and `/` are one left-associative level: (m / s) * s.
  assertEvaluates("m/s*s", UNITS.m);
  assertEvaluates("m/(s*s)", quantity("1", { m: 1, s: -2 }));
  // Exponents bind tightest: kg (m / (s^2)) is a newton.
  assertEvaluates("kg m / s^2", UNITS.N);
  assertEvaluates("2 m^2", quantity("2", { m: 2 }));
  assertEvaluates("(2 m)^2", quantity("4", { m: 2 }));
});

test("an integer power is exact", () => {
  assertEvaluates("m^2", quantity("1", { m: 2 }));
  assertEvaluates("s^-1", quantity("1", { s: -1 }));
  assertEvaluates("ft^2", quantity("0.09290304", { m: 2 }));
  assertEvaluates("2^10", quantity("1024"));
  assertEvaluates("2^-2", {
    magnitude: rational(1n, 4n),
    dimension: DIMENSIONLESS,
  });
  assertEvaluates("m^0", quantity("1"));
});

test("a rational power that is exact stays exact", () => {
  assertEvaluates("(4 m^2)^(1/2)", quantity("2", { m: 1 }));
  assertEvaluates("(4 m^2)^0.5", quantity("2", { m: 1 }));
  assertEvaluates("(8 m^3)^(1/3)", quantity("2", { m: 1 }));
  assertEvaluates("(8 m^3)^(2/3)", quantity("4", { m: 2 }));
  assertEvaluates("m^(1/2)", quantity("1", { m: half }));
  assertEvaluates("(m^(1/2))^2", UNITS.m);
});

test("an inexact root is truncated to the precision given", () => {
  const root5 = value(run("(2 m^2)^(1/2)", 5));
  assert.equal(format(root5.magnitude, 10), "1.4142");
  assert.deepEqual(root5.dimension, dim({ m: 1 }));
  const root40 = value(run("(2 m^2)^(1/2)"));
  assert.equal(
    format(root40.magnitude, 40),
    "1.414213562373095048801688724209698078569",
  );
  // The precision reaches a root anywhere in the tree.
  const nested = value(run("3 / (2^(1/2) s)", 3));
  assert.deepEqual(nested.dimension, dim({ s: -1 }));
  assert.ok(equals(nested.magnitude, rational(3000n, 1410n)));
});

test("exact operations never round", () => {
  // 1 m in feet is 1250/381, which no decimal writes.
  assertEvaluates("m / ft", {
    magnitude: rational(1250n, 381n),
    dimension: DIMENSIONLESS,
  });
  // A long exact product stays exact.
  const big = value(run("1e30 m * 1e30 m / 3"));
  assert.ok(equals(big.magnitude, rational(10n ** 60n, 3n)));
});

test("exponents that cancel are dropped", () => {
  assert.deepEqual(value(run("m / m")).dimension, DIMENSIONLESS);
  assert.deepEqual(value(run("m^2 / m")).dimension, dim({ m: 1 }));
  assert.deepEqual(value(run("N s^2 / kg")).dimension, dim({ m: 1 }));
  assert.deepEqual(value(run("s^-1 s")).dimension, DIMENSIONLESS);
});

test("kinds ride along in the dimension", () => {
  assertEvaluates("radian / s", quantity("1", { radian: 1, s: -1 }));
  assertEvaluates(
    "N m / radian",
    quantity("1", { kg: 1, m: 2, s: -2, radian: -1 }),
  );
  assertEvaluates("radian / radian", quantity("1"));
});

test("a zero magnitude is an ordinary value except as a divisor", () => {
  assertEvaluates("0 m", quantity("0", { m: 1 }));
  assertEvaluates("zero / s", quantity("0", { m: 1, s: -1 }));
  assertEvaluates("zero^2", quantity("0", { m: 2 }));
  assertEvaluates("zero^(1/2)", quantity("0", { m: half }));
  assertEvaluates("0^0", quantity("1"));
});

// ---------------------------------------------------------------------------
// Failures

test("a lookup failure comes back unchanged", () => {
  assert.deepEqual(failure(run("bogus")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 0, end: 5 },
  });
  assert.deepEqual(failure(run("2 m / bogus^2")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 6, end: 11 },
  });
  // Whatever the lookup's error type is.
  const failing: Lookup<string> = (name) => ({
    ok: false,
    error: `no ${name}`,
  });
  assert.deepEqual(evaluate(parsed("2 m"), failing, DEFAULT_PRECISION), {
    ok: false,
    error: "no m",
  });
});

test("operands are evaluated left to right and the first failure wins", () => {
  assert.deepEqual(failure(run("bogus other")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 0, end: 5 },
  });
  assert.equal(failure(run("bogus / 0")).kind, "unknownUnit");
  assert.equal(failure(run("m / 0 / bogus")).kind, "divisionByZero");
  assert.equal(failure(run("(m / 0) bogus")).kind, "divisionByZero");
  assert.equal(failure(run("bogus (m / 0)")).kind, "unknownUnit");
});

test("a division by zero points at the divisor", () => {
  assert.deepEqual(failure(run("m / 0")), {
    kind: "divisionByZero",
    span: { start: 4, end: 5 },
  });
  assert.deepEqual(failure(run("1 / 0 s")), {
    kind: "divisionByZero",
    span: { start: 4, end: 7 },
  });
  assert.deepEqual(failure(run("kg m / zero")), {
    kind: "divisionByZero",
    span: { start: 7, end: 11 },
  });
  assert.deepEqual(failure(run("m / (2 zero)")), {
    kind: "divisionByZero",
    span: { start: 4, end: 12 },
  });
  assert.deepEqual(failure(run("0 / 0")), {
    kind: "divisionByZero",
    span: { start: 4, end: 5 },
  });
});

test("a power that fails points at the whole power", () => {
  assert.deepEqual(failure(run("zero^-1")), {
    kind: "divisionByZero",
    span: { start: 0, end: 7 },
  });
  assert.deepEqual(failure(run("m (0 s)^-2")), {
    kind: "divisionByZero",
    span: { start: 2, end: 10 },
  });
  assert.deepEqual(failure(run("neg^(1/2)")), {
    kind: "negativeRadicand",
    degree: 2n,
    span: { start: 0, end: 9 },
  });
  assert.deepEqual(failure(run("2 neg^0.25")), {
    kind: "negativeRadicand",
    degree: 4n,
    span: { start: 2, end: 10 },
  });
  assert.deepEqual(failure(run("10^100000")), {
    kind: "tooLarge",
    span: { start: 0, end: 9 },
  });
  assert.deepEqual(failure(run("m (10^100000)")), {
    kind: "tooLarge",
    span: { start: 2, end: 13 },
  });
  // An odd root of a negative magnitude is fine.
  assertEvaluates("neg8^(1/3)", quantity("-2", { m: 1 }));
});

test("a division by zero inside a power is the division's", () => {
  assert.deepEqual(failure(run("(m / 0)^2")), {
    kind: "divisionByZero",
    span: { start: 5, end: 6 },
  });
});

// ---------------------------------------------------------------------------
// Purity

test("evaluation leaves the tree and the units alone", () => {
  const expr = parsed("2 kg m / s^2 / zero");
  const copy = structuredClone(expr);
  evaluate(expr, lookup, DEFAULT_PRECISION);
  evaluate(parsed("(3 N)^(1/2)"), lookup, DEFAULT_PRECISION);
  assert.deepEqual(expr, copy);
  assert.deepEqual(UNITS.N, quantity("1", { kg: 1, m: 1, s: -2 }));
  assert.deepEqual(UNITS.zero, quantity("0", { m: 1 }));
  assert.ok(equals(UNITS.m.magnitude, ONE));
  assert.ok(equals(UNITS.zero.magnitude, ZERO));
});
