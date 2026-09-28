import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, multiplyBalls, type Ball } from "./ball.ts";
import {
  fromBallError,
  plainNumbers,
  type Builtin,
  type BuiltinError,
} from "./builtin.ts";
import { convert } from "./convert.ts";
import type { Dimension, Primitives } from "./dimension.ts";
import { evaluate } from "./evaluate.ts";
import { parseExpr, type Expr } from "./expr.ts";
import type { Quantity } from "./quantity.ts";
import { rational } from "./rational.ts";
import { DEFAULT_PRECISION } from "./rounding.ts";
import { err, type Result } from "./result.ts";
import { dec, fr } from "../testing/scaled.ts";
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
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** Builds a dimension from integer exponents. */
function dim(exponents: Record<string, number>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [name, rational(BigInt(e))]),
  );
}

function quantity(text: string, exponents: Record<string, number>): Quantity {
  return { magnitude: exact(dec(text)), dimension: dim(exponents) };
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
    ["k", exact(dec("1000"))],
    ["m", exact(dec("0.001"))],
    ["c", exact(dec("0.01"))],
  ]),
  units: new Map([
    ["m", quantity("1", { m: 1 })],
    ["s", quantity("1", { s: 1 })],
    ["K", quantity("1", { K: 1 })],
    ["radian", quantity("1", { radian: 1 })],
    ["min", quantity("60", { s: 1 })],
    ["in", quantity("0.0254", { m: 1 })],
    ["h", quantity("3600", { s: 1 })],
    // A unit whose value is an exponent: the midpoint carries it as one.
    ["huge", quantity("1e999999999", { m: 1 })],
  ]),
  unitLists: new Map(),
  functions: new Map([["tempC", TEMP_C]]),
  builtins: new Map(),
};

const lookup = unitLookup(TABLE, CONTEXT);
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

test("a unit of any exponent looks up, and a prefix scales it by adding to the exponent", () => {
  // The prefix times the unit is a product of balls, exact on exact
  // operands, whose exponents add; the value is a value, not a failure.
  const huge = found(lookup.unit("huge", SPAN));
  assertQuantity(huge, quantity("1e999999999", { m: 1 }));
  assert.deepEqual(huge.magnitude.mid, {
    mant: { num: 1n, den: 1n },
    exp: 999999999n,
  });
  assertQuantity(
    found(lookup.unit("khuge", SPAN)),
    quantity("1e1000000002", { m: 1 }),
  );
  assertQuantity(
    found(lookup.unit("mhuge", SPAN)),
    quantity("1e999999996", { m: 1 }),
  );
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
    magnitude: exact(fr(5n, 6n)),
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
  assert.deepEqual(result.value, exact(fr(60000n)));

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
    value: { kind: "defined", fn: TEMP_C },
  });
});

/** `x` doubled, exactly; the product of balls fails only at the exponent bound. */
function twice(x: Ball): Result<Ball, BuiltinError> {
  const product = multiplyBalls(exact(fr(2n)), x);
  return product.ok ? product : err(fromBallError(product.error, 0));
}

/** A built-in as a test injects one: a plain number doubled, exactly. */
const TWICE: Builtin = {
  name: "twice",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x]) => twice(x!),
};

/** The table with `twice` as a built-in, and a defined function of the same name. */
const WITH_BUILTINS: UnitTable = {
  ...TABLE,
  functions: new Map([
    ["tempC", TEMP_C],
    ["shadow", { ...TEMP_C, name: "shadow" }],
  ]),
  builtins: new Map([
    ["twice", TWICE],
    ["shadow", { ...TWICE, name: "shadow" }],
    ["nothing", { ...TWICE, name: "nothing", arity: { min: 0, max: 0 } }],
  ]),
};

test("a built-in resolves by its name, after the defined functions", () => {
  const lookup = unitLookup(WITH_BUILTINS, CONTEXT);
  assert.deepEqual(lookup.function("twice", SPAN, CALL), {
    ok: true,
    value: { kind: "builtin", fn: TWICE },
  });
  // The build keeps the two disjoint; were they not, the defined one wins.
  assert.deepEqual(lookup.function("shadow", SPAN, CALL), {
    ok: true,
    value: { kind: "defined", fn: WITH_BUILTINS.functions.get("shadow") },
  });
  const result = evaluate(
    parsed("twice(3) m"),
    lookup,
    TABLE.primitives,
    CONTEXT,
  );
  assert.ok(result.ok, inspect(result));
  assertQuantity(result.value, quantity("6", { m: 1 }));
});

test("a built-in's name is not a unit either, and the failure says how many arguments it takes", () => {
  const lookup = unitLookup(WITH_BUILTINS, CONTEXT);
  assert.deepEqual(lookup.unit("twice", SPAN), {
    ok: false,
    error: {
      kind: "functionAsUnit",
      name: "twice",
      span: SPAN,
      arity: { min: 1, max: 1 },
    },
  });
  assert.deepEqual(lookup.unit("nothing", SPAN), {
    ok: false,
    error: {
      kind: "functionAsUnit",
      name: "nothing",
      span: SPAN,
      arity: { min: 0, max: 0 },
    },
  });
  assert.deepEqual(lookup.unit("ktwice", SPAN), {
    ok: false,
    error: { kind: "unknownUnit", name: "ktwice", span: SPAN },
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
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: SPAN,
      arity: { min: 1, max: 1 },
    },
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
