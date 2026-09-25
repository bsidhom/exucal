import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { convert } from "./convert.ts";
import { type Dimension, type Primitives } from "./dimension.ts";
import { evaluate } from "./evaluate.ts";
import { parseExpr, type Expr } from "./expr.ts";
import { type Quantity } from "./quantity.ts";
import {
  DEFAULT_PRECISION,
  equals,
  parseDecimal,
  rational,
  toFraction,
  type Rational,
} from "./rational.ts";
import { type Result } from "./result.ts";
import { unitLookup, type UnitTable, type UnknownUnit } from "./table.ts";

/** Builds a dimension from integer exponents. */
function dim(exponents: Record<string, number>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [name, rational(BigInt(e))]),
  );
}

/** The rational the decimal `text` denotes, exactly. */
function decimal(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok, `${JSON.stringify(text)} is not a number`);
  return result.value;
}

function quantity(text: string, exponents: Record<string, number>): Quantity {
  return { magnitude: decimal(text), dimension: dim(exponents) };
}

/** A table as `buildTable` would produce it from a few SI definitions. */
const TABLE: UnitTable = {
  primitives: new Map<string, "dimension" | "kind">([
    ["m", "dimension"],
    ["s", "dimension"],
    ["radian", "kind"],
  ]) satisfies Primitives,
  prefixes: new Map([
    ["k", decimal("1000")],
    ["m", decimal("0.001")],
    ["c", decimal("0.01")],
  ]),
  units: new Map([
    ["m", quantity("1", { m: 1 })],
    ["s", quantity("1", { s: 1 })],
    ["radian", quantity("1", { radian: 1 })],
    ["min", quantity("60", { s: 1 })],
    ["in", quantity("0.0254", { m: 1 })],
    ["h", quantity("3600", { s: 1 })],
  ]),
};

const lookup = unitLookup(TABLE);
const SPAN = { start: 3, end: 5 };

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, inspect(result));
  return result.value;
}

function found(result: Result<Quantity, UnknownUnit>): Quantity {
  assert.ok(result.ok, `expected a quantity, got ${inspect(result)}`);
  return result.value;
}

function assertQuantity(actual: Quantity, expected: Quantity): void {
  assert.ok(
    equals(actual.magnitude, expected.magnitude),
    `expected magnitude ${toFraction(expected.magnitude)}, got ${toFraction(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, expected.dimension);
}

test("a unit name resolves to its quantity", () => {
  assertQuantity(found(lookup("m", SPAN)), quantity("1", { m: 1 }));
  assertQuantity(found(lookup("in", SPAN)), quantity("0.0254", { m: 1 }));
});

test("a primitive is looked up like any unit", () => {
  assertQuantity(found(lookup("radian", SPAN)), quantity("1", { radian: 1 }));
});

test("a prefixed unit is the unit scaled by the prefix", () => {
  assertQuantity(found(lookup("km", SPAN)), quantity("1000", { m: 1 }));
  assertQuantity(found(lookup("cin", SPAN)), quantity("0.000254", { m: 1 }));
  assertQuantity(found(lookup("ms", SPAN)), quantity("0.001", { s: 1 }));
});

test("an exact unit name wins over a split", () => {
  // `min` is the minute, not milli-inches.
  assertQuantity(found(lookup("min", SPAN)), quantity("60", { s: 1 }));
});

test("an unknown name fails with its span", () => {
  for (const name of ["x", "kx", "xm", "kkm", "k", ""]) {
    assert.deepEqual(lookup(name, SPAN), {
      ok: false,
      error: { kind: "unknownUnit", name, span: SPAN },
    });
  }
});

test("the lookup serves the evaluator", () => {
  const result = evaluate(
    parsed("3 km / h"),
    lookup,
    TABLE.primitives,
    DEFAULT_PRECISION,
  );
  assert.ok(result.ok, inspect(result));
  assertQuantity(result.value, {
    magnitude: rational(5n, 6n),
    dimension: dim({ m: 1, s: -1 }),
  });
});

test("an unknown unit in the input is the evaluator's failure", () => {
  assert.deepEqual(
    evaluate(
      parsed("3 furlong / h"),
      lookup,
      TABLE.primitives,
      DEFAULT_PRECISION,
    ),
    {
      ok: false,
      error: {
        kind: "unknownUnit",
        name: "furlong",
        span: { start: 2, end: 9 },
      },
    },
  );
});

test("the table's primitives serve the converter", () => {
  const have = evaluate(
    parsed("1 min"),
    lookup,
    TABLE.primitives,
    DEFAULT_PRECISION,
  );
  const want = evaluate(
    parsed("ms"),
    lookup,
    TABLE.primitives,
    DEFAULT_PRECISION,
  );
  assert.ok(have.ok && want.ok);
  const result = convert(have.value, want.value, TABLE.primitives);
  assert.ok(result.ok, inspect(result));
  assert.ok(equals(result.value, rational(60000n)));

  const angle = evaluate(
    parsed("radian / s"),
    lookup,
    TABLE.primitives,
    DEFAULT_PRECISION,
  );
  const rate = evaluate(
    parsed("1 / s"),
    lookup,
    TABLE.primitives,
    DEFAULT_PRECISION,
  );
  assert.ok(angle.ok && rate.ok);
  const mismatch = convert(angle.value, rate.value, TABLE.primitives);
  assert.ok(!mismatch.ok);
  assert.equal(mismatch.error.kind, "kindMismatch");
});

test("the lookup leaves the table alone", () => {
  const before = structuredClone(TABLE);
  found(lookup("km", SPAN));
  found(lookup("min", SPAN));
  assert.deepEqual(TABLE, before);
});
