import assert from "node:assert/strict";
import { DEFAULT_ROUNDING, type NumberContext } from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact } from "./ball.ts";
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
  type Rational,
} from "./rational.ts";
import { type Result } from "./result.ts";
import {
  unitLookup,
  type LookupError,
  type UnitFunction,
  type UnitTable,
} from "./table.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
};

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
  return { magnitude: exact(decimal(text)), dimension: dim(exponents) };
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** A function as `buildTable` would produce it: the Celsius reading. */
const TEMP_C: UnitFunction = {
  name: "tempC",
  parameter: "x",
  argument: { text: "1", quantity: quantity("1", {}) },
  result: { text: "K", quantity: quantity("1", { K: 1 }) },
  forward: parsed("x K + 273.15 K"),
  inverse: parsed("tempC / K - 273.15"),
};

/** A table as `buildTable` would produce it from a few SI definitions. */
const TABLE: UnitTable = {
  primitives: new Map<string, "dimension" | "kind">([
    ["m", "dimension"],
    ["s", "dimension"],
    ["K", "dimension"],
    ["radian", "kind"],
  ]) satisfies Primitives,
  prefixes: new Map([
    ["k", exact(decimal("1000"))],
    ["m", exact(decimal("0.001"))],
    ["c", exact(decimal("0.01"))],
  ]),
  units: new Map([
    ["m", quantity("1", { m: 1 })],
    ["s", quantity("1", { s: 1 })],
    ["K", quantity("1", { K: 1 })],
    ["radian", quantity("1", { radian: 1 })],
    ["min", quantity("60", { s: 1 })],
    ["in", quantity("0.0254", { m: 1 })],
    ["h", quantity("3600", { s: 1 })],
  ]),
  unitLists: new Map(),
  functions: new Map([["tempC", TEMP_C]]),
};

const lookup = unitLookup(TABLE);
const SPAN = { start: 3, end: 5 };
const CALL = { start: 3, end: 9 };

function found(result: Result<Quantity, LookupError>): Quantity {
  assert.ok(result.ok, `expected a quantity, got ${inspect(result)}`);
  return result.value;
}

function assertQuantity(actual: Quantity, expected: Quantity): void {
  assert.deepEqual(actual.magnitude, expected.magnitude);
  assert.deepEqual(actual.dimension, expected.dimension);
}

test("a unit name resolves to its quantity", () => {
  assertQuantity(found(lookup.unit("m", SPAN)), quantity("1", { m: 1 }));
  assertQuantity(found(lookup.unit("in", SPAN)), quantity("0.0254", { m: 1 }));
});

test("a primitive is looked up like any unit", () => {
  assertQuantity(
    found(lookup.unit("radian", SPAN)),
    quantity("1", { radian: 1 }),
  );
});

test("a prefixed unit is the unit scaled by the prefix", () => {
  assertQuantity(found(lookup.unit("km", SPAN)), quantity("1000", { m: 1 }));
  assertQuantity(
    found(lookup.unit("cin", SPAN)),
    quantity("0.000254", { m: 1 }),
  );
  assertQuantity(found(lookup.unit("ms", SPAN)), quantity("0.001", { s: 1 }));
});

test("an exact unit name wins over a split", () => {
  // `min` is the minute, not milli-inches.
  assertQuantity(found(lookup.unit("min", SPAN)), quantity("60", { s: 1 }));
});

test("an unknown name fails with its span", () => {
  for (const name of ["x", "kx", "xm", "kkm", "k", ""]) {
    assert.deepEqual(lookup.unit(name, SPAN), {
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
    CONTEXT,
  );
  assert.ok(result.ok, inspect(result));
  assertQuantity(result.value, {
    magnitude: exact(rational(5n, 6n)),
    dimension: dim({ m: 1, s: -1 }),
  });
});

test("an unknown unit in the input is the evaluator's failure", () => {
  assert.deepEqual(
    evaluate(parsed("3 furlong / h"), lookup, TABLE.primitives, CONTEXT),
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
  const have = evaluate(parsed("1 min"), lookup, TABLE.primitives, CONTEXT);
  const want = evaluate(parsed("ms"), lookup, TABLE.primitives, CONTEXT);
  assert.ok(have.ok && want.ok);
  const result = convert(have.value, want.value, TABLE.primitives);
  assert.ok(result.ok, inspect(result));
  assert.ok(equals(result.value, rational(60000n)));

  const angle = evaluate(
    parsed("radian / s"),
    lookup,
    TABLE.primitives,
    CONTEXT,
  );
  const rate = evaluate(parsed("1 / s"), lookup, TABLE.primitives, CONTEXT);
  assert.ok(angle.ok && rate.ok);
  const mismatch = convert(angle.value, rate.value, TABLE.primitives);
  assert.ok(!mismatch.ok);
  assert.equal(mismatch.error.kind, "kindMismatch");
});

test("a function resolves by its name, for a call", () => {
  assert.deepEqual(lookup.function("tempC", SPAN, CALL), {
    ok: true,
    value: TEMP_C,
  });
});

test("a name that is not a function fails with what it is otherwise", () => {
  const cases: [string, "unit" | "prefixedUnit" | "nothing"][] = [
    ["m", "unit"],
    ["min", "unit"],
    ["km", "prefixedUnit"],
    ["x", "nothing"],
    ["k", "nothing"],
    ["kkm", "nothing"],
  ];
  for (const [name, otherwise] of cases) {
    assert.deepEqual(lookup.function(name, SPAN, CALL), {
      ok: false,
      error: { kind: "notAFunction", name, span: SPAN, call: CALL, otherwise },
    });
  }
});

test("a function's name is not a unit, and the failure says so", () => {
  assert.deepEqual(lookup.unit("tempC", SPAN), {
    ok: false,
    error: { kind: "functionAsUnit", name: "tempC", span: SPAN },
  });
  // Nor is a prefix followed by a function anything.
  assert.deepEqual(lookup.unit("ktempC", SPAN), {
    ok: false,
    error: { kind: "unknownUnit", name: "ktempC", span: SPAN },
  });
});

test("the lookup serves the evaluator for a call", () => {
  const result = evaluate(
    parsed("tempC(100) - tempC(0)"),
    lookup,
    TABLE.primitives,
    CONTEXT,
  );
  assert.ok(result.ok, inspect(result));
  assertQuantity(result.value, quantity("100", { K: 1 }));
});

test("the lookup leaves the table alone", () => {
  const before = structuredClone(TABLE);
  found(lookup.unit("km", SPAN));
  found(lookup.unit("min", SPAN));
  lookup.function("tempC", SPAN, CALL);
  lookup.function("km", SPAN, CALL);
  assert.deepEqual(TABLE, before);
});
