import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, multiplyBalls, type Ball } from "./ball.ts";
import { buildTable, type BuildError } from "./build.ts";
import { plainNumbers, type Builtin, type Builtins } from "./builtin.ts";
import { convert, convertToList } from "./convert.ts";
import { parseDefinitions, type Definition } from "./definitions.ts";
import { DIMENSIONLESS, type Dimension } from "./dimension.ts";
import { evaluate, invertFunction } from "./evaluate.ts";
import { parseExpr } from "./expr.ts";
import type { Quantity } from "./quantity.ts";
import {
  absolute,
  add,
  compare,
  equals,
  rational,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { parseFraction } from "../testing/fraction.ts";
import { DEFAULT_PRECISION } from "./rounding.ts";
import { radiusUpper } from "./radius.ts";
import { ok, type Result } from "./result.ts";
import type { Span } from "./span.ts";
import { unitLookup, type UnitTable } from "./table.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

// ---------------------------------------------------------------------------
// Helpers

/** The definitions of `text`, joined from lines. */
function definitions(...lines: string[]): readonly Definition[] {
  const result = parseDefinitions(lines.join("\n"));
  assert.ok(result.ok, `expected the text to parse, got ${inspect(result)}`);
  return result.value;
}

function build(...lines: string[]): Result<UnitTable, BuildError> {
  return buildTable(definitions(...lines), CONTEXT);
}

function built(...lines: string[]): UnitTable {
  const result = build(...lines);
  assert.ok(result.ok, `expected a table, got ${inspect(result)}`);
  return result.value;
}

function failed(...lines: string[]): BuildError {
  const result = build(...lines);
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** The span of the `occurrence`th (from 1) occurrence of `text` in the lines joined. */
function spanOf(lines: readonly string[], text: string, occurrence = 1): Span {
  const whole = lines.join("\n");
  let start = -1;
  for (let i = 0; i < occurrence; i++) {
    start = whole.indexOf(text, start + 1);
    assert.notEqual(start, -1, `${JSON.stringify(text)} not found`);
  }
  return { start, end: start + text.length };
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

/** The rational the decimal `text` denotes, exactly. */
function decimal(text: string): Rational {
  const result = parseFraction(text);
  assert.ok(result.ok, `${JSON.stringify(text)} is not a number`);
  return result.value;
}

function assertQuantity(
  actual: Quantity | undefined,
  magnitude: string | Rational,
  exponents: Record<string, number | Rational>,
): void {
  assert.ok(actual !== undefined, "expected a quantity");
  const expected =
    typeof magnitude === "string" ? decimal(magnitude) : magnitude;
  assert.deepEqual(
    actual.magnitude,
    exact(expected),
    `expected magnitude ${toFraction(expected)}, got ${inspect(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, dim(exponents));
}

function assertFactor(actual: Ball | undefined, expected: string): void {
  assert.ok(actual !== undefined, "expected a factor");
  assert.deepEqual(
    actual,
    exact(decimal(expected)),
    `expected ${expected}, got ${inspect(actual)}`,
  );
}

// ---------------------------------------------------------------------------
// What a table holds

test("no definitions build an empty table", () => {
  const table = built("");
  assert.deepEqual(table.primitives, new Map());
  assert.deepEqual(table.prefixes, new Map());
  assert.deepEqual(table.units, new Map());
});

test("primitives are recorded with their roles, in declaration order", () => {
  const table = built("s !", "radian !kind", "m !  # a comment");
  assert.deepEqual(
    [...table.primitives],
    [
      ["s", "dimension"],
      ["radian", "kind"],
      ["m", "dimension"],
    ],
  );
});

test("a primitive is one of itself, among the units", () => {
  const table = built("m !", "radian !kind");
  assertQuantity(table.units.get("m"), "1", { m: 1 });
  assertQuantity(table.units.get("radian"), "1", { radian: 1 });
  assert.deepEqual([...table.units.keys()], ["m", "radian"]);
});

test("a unit is what its body evaluates to", () => {
  const table = built(
    "m !",
    "kg !",
    "s !",
    "inch 0.0254 m",
    "newton kg m / s^2",
    "hertz 1 / s",
    "metre m",
  );
  assertQuantity(table.units.get("inch"), "0.0254", { m: 1 });
  assertQuantity(table.units.get("newton"), "1", { kg: 1, m: 1, s: -2 });
  assertQuantity(table.units.get("hertz"), "1", { s: -1 });
  assertQuantity(table.units.get("metre"), "1", { m: 1 });
});

test("a prefix is recorded as its factor", () => {
  const table = built("kilo- 1000", "milli- 1/1000", "dozen- 12");
  assertFactor(table.prefixes.get("kilo"), "1000");
  assertFactor(table.prefixes.get("milli"), "0.001");
  assertFactor(table.prefixes.get("dozen"), "12");
  assert.deepEqual([...table.prefixes.keys()], ["kilo", "milli", "dozen"]);
});

test("a prefix may be defined through other prefixes and units", () => {
  // `kilo` is a unit here, so `mega-` is `kilo` and `giga-` is `mega-` + `kilo`.
  const table = built("kilo 1000", "mega- kilo", "giga- megakilo");
  assertFactor(table.prefixes.get("mega"), "1000");
  assertFactor(table.prefixes.get("giga"), "1000000");
});

// ---------------------------------------------------------------------------
// References

test("a body may refer to a prefixed unit", () => {
  const table = built("m !", "c- 0.01", "inch 2.54 cm", "km 1000 m");
  assertQuantity(table.units.get("inch"), "0.0254", { m: 1 });
  assertQuantity(table.units.get("km"), "1000", { m: 1 });
});

test("an exact name wins over a split in a body", () => {
  // `min` is the minute, not `m` + `in`.
  const table = built(
    "m !",
    "s !",
    "m- 0.001",
    "in 0.0254 m",
    "min 60 s",
    "hour 60 min",
  );
  assertQuantity(table.units.get("hour"), "3600", { s: 1 });
});

test("definitions may appear in any order", () => {
  const table = built(
    "hour 60 min",
    "min 60 s",
    "inch 2.54 cm",
    "s !",
    "c- 0.01",
    "m !",
  );
  assertQuantity(table.units.get("hour"), "3600", { s: 1 });
  assertQuantity(table.units.get("inch"), "0.0254", { m: 1 });
});

test("a shared dependency is evaluated once and is not a cycle", () => {
  const table = built("m !", "a m", "b a", "c a", "d b c");
  assertQuantity(table.units.get("d"), "1", { m: 2 });
});

test("bodies are evaluated at the working precision", () => {
  // sqrt 2 to forty digits, from Python's decimal module.
  const sqrt2 = decimal("1.4142135623730950488016887242096980785697");
  for (const precision of [5, DEFAULT_PRECISION]) {
    const result = buildTable(definitions("m !", "r 2^(1/2) m"), {
      ...CONTEXT,
      precision,
    });
    assert.ok(result.ok, inspect(result));
    const r = result.value.units.get("r");
    assert.ok(r !== undefined);
    // The root is inexact, the table says so, its midpoint is within its
    // radius of the reference (to the reference's forty digits), and the
    // radius is the kernel's at the precision given: below 10^-(p + 8).
    assert.ok(!isExact(r.magnitude));
    const rad = radiusUpper(r.magnitude.rad);
    const distance = absolute(subtract(r.magnitude.mid, sqrt2));
    assert.ok(compare(distance, add(rad, rational(1n, 10n ** 40n))) <= 0);
    assert.ok(compare(rad, rational(1n, 10n ** BigInt(precision + 8))) < 0);
    assert.deepEqual(r.dimension, dim({ m: 1 }));
  }
});

test("a kind rides along in a dimension", () => {
  const table = built("s !", "radian !kind", "rpm 2 radian / s", "hertz 1/s");
  assertQuantity(table.units.get("rpm"), "2", { radian: 1, s: -1 });
  assertQuantity(table.units.get("hertz"), "1", { s: -1 });
});

// ---------------------------------------------------------------------------
// Errors about names

test("a name defined twice is a duplicate", () => {
  const defs = definitions("m !", "s !", "m 100 cm");
  const result = buildTable(defs, CONTEXT);
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "duplicate", first: defs[0], second: defs[2] },
  });
});

test("a primitive and a unit share a namespace", () => {
  const defs = definitions("m 100 cm", "m !");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: { kind: "duplicate", first: defs[0], second: defs[1] },
  });
});

test("a prefix defined twice is a duplicate", () => {
  const defs = definitions("k- 1000", "m !", "k- 1024");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: { kind: "duplicate", first: defs[0], second: defs[2] },
  });
});

test("a prefix and a unit may share a name", () => {
  const table = built("m !", "m- 0.001", "small mm");
  assertQuantity(table.units.get("small"), "0.001", { m: 1 });
  assertFactor(table.prefixes.get("m"), "0.001");
});

test("a name with two splits is ambiguous", () => {
  assert.deepEqual(failed("m !", "am 1e-18 m", "d- 0.1", "da- 10"), {
    kind: "ambiguousName",
    name: "dam",
    splits: [
      { prefix: "d", unit: "am" },
      { prefix: "da", unit: "m" },
    ],
  });
});

test("ambiguity is checked before bodies are evaluated", () => {
  const error = failed("m !", "am bogus", "d- 0.1", "da- 10");
  assert.equal(error.kind, "ambiguousName");
});

test("duplicates are reported before ambiguity", () => {
  const error = failed("m !", "am 1e-18 m", "d- 0.1", "da- 10", "m !");
  assert.equal(error.kind, "duplicate");
});

test("an unknown name is reported at its reference", () => {
  const lines = ["m !", "k- 1000", "inch 2.54 cm", "km 1000 m"];
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "cm",
    span: spanOf(lines, "cm"),
  });
});

test("a prefix alone is not a unit", () => {
  const lines = ["m !", "k- 1000", "big k m"];
  const { start } = spanOf(lines, "k m");
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "k",
    span: { start, end: start + 1 },
  });
});

test("prefixes do not stack", () => {
  const lines = ["m !", "k- 1000", "big kkm"];
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "kkm",
    span: spanOf(lines, "kkm"),
  });
});

// ---------------------------------------------------------------------------
// Cycles

test("a definition that refers to itself is circular", () => {
  const lines = ["m !", "a 2 a"];
  const defs = definitions(...lines);
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "circularDefinition",
      definitions: [defs[1]],
      span: {
        start: lines.join("\n").length - 1,
        end: lines.join("\n").length,
      },
    },
  });
});

test("a cycle is reported from the first definition on it, at the reference that closes it", () => {
  const lines = ["m !", "a b m", "b c", "c a / m"];
  const defs = definitions(...lines);
  const text = lines.join("\n");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "circularDefinition",
      definitions: [defs[1], defs[2], defs[3]],
      span: { start: text.indexOf("a / m"), end: text.indexOf("a / m") + 1 },
    },
  });
});

test("a cycle lists only the definitions on it", () => {
  const lines = ["m !", "a b", "b c", "c b"];
  const defs = definitions(...lines);
  const text = lines.join("\n");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "circularDefinition",
      definitions: [defs[2], defs[3]],
      span: { start: text.length - 1, end: text.length },
    },
  });
});

test("a cycle may run through a prefix", () => {
  // `kilo-` is defined as `kilom`, which is `kilo-` applied to `m`.
  const lines = ["m !", "kilo- kilom / m"];
  const defs = definitions(...lines);
  const text = lines.join("\n");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "circularDefinition",
      definitions: [defs[1]],
      span: { start: text.indexOf("kilom"), end: text.indexOf("kilom") + 5 },
    },
  });
});

test("a cycle is reported wherever the build reaches it first", () => {
  // `x` is not on the cycle, but evaluating it is what finds it.
  const lines = ["m !", "x a", "a b", "b a"];
  const defs = definitions(...lines);
  const error = failed(...lines);
  assert.equal(error.kind, "circularDefinition");
  assert.deepEqual(error.definitions, [defs[2], defs[3]]);
});

// ---------------------------------------------------------------------------
// Errors within bodies

test("a prefix must be a plain number", () => {
  const defs = definitions("m !", "metric- m");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "dimensionedPrefix",
      definition: defs[1],
      dimension: dim({ m: 1 }),
    },
  });
});

test("a prefix may not carry a kind", () => {
  const defs = definitions("radian !kind", "angular- radian");
  assert.deepEqual(buildTable(defs, CONTEXT), {
    ok: false,
    error: {
      kind: "dimensionedPrefix",
      definition: defs[1],
      dimension: dim({ radian: 1 }),
    },
  });
});

test("a prefix whose dimension cancels is a plain number", () => {
  const table = built("m !", "cm 0.01 m", "hundred- m / cm");
  assertFactor(table.prefixes.get("hundred"), "100");
});

test("a division by zero is reported at the divisor", () => {
  const lines = ["m !", "zero 0 m", "bad m / zero"];
  const text = lines.join("\n");
  assert.deepEqual(failed(...lines), {
    kind: "divisionByZero",
    span: { start: text.lastIndexOf("zero"), end: text.length },
  });
});

test("a body may be a sum, checked against the primitives declared", () => {
  const table = built(
    "m !",
    "radian !kind",
    "inch 0.0254 m",
    "ft 12 inch",
    "cubit ft + 6 inch",
    "twelve- 6 + 6",
  );
  assertQuantity(table.units.get("cubit"), "0.4572", { m: 1 });
  assertFactor(table.prefixes.get("twelve"), "12");
  // The primitives serve the check before every definition is walked, so a
  // sum may involve a primitive declared after it.
  assertQuantity(built("late K + K", "K !").units.get("late"), "2", { K: 1 });
});

test("a nonconforming sum in a body is reported at the sum", () => {
  const lines = ["m !", "s !", "bad 2 m + 3 s"];
  assert.deepEqual(failed(...lines), {
    kind: "nonconformingOperands",
    op: "add",
    span: spanOf(lines, "2 m + 3 s"),
    left: spanOf(lines, "2 m"),
    right: spanOf(lines, "3 s"),
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: dim({ s: 1 }),
    },
  });
  // The roles come from the declarations, so a kind is told apart from a
  // dimension, wherever it is declared.
  const kinds = [
    "s !",
    "Hz 1 / s",
    "bad rpm - Hz",
    "rpm radian / 60 s",
    "radian !kind",
  ];
  const error = failed(...kinds);
  assert.equal(error.kind, "nonconformingOperands");
  assert.ok(error.kind === "nonconformingOperands");
  assert.equal(error.op, "sub");
  assert.deepEqual(error.mismatch, {
    kind: "kindMismatch",
    have: dim({ radian: 1, s: -1 }),
    want: dim({ s: -1 }),
    kinds: ["radian"],
  });
});

test("a failed power is reported at the power", () => {
  const lines = ["m !", "big 10^99999 m"];
  assert.deepEqual(failed(...lines), {
    kind: "tooLarge",
    span: spanOf(lines, "10^99999"),
  });
});

test("the first failing definition, in order, is reported", () => {
  const lines = ["m !", "a bogus", "b 1 / 0"];
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(lines, "bogus"),
  });
  const reversed = ["m !", "b 1 / 0", "a bogus"];
  assert.deepEqual(failed(...reversed), {
    kind: "divisionByZero",
    span: spanOf(reversed, "0"),
  });
});

test("a dependency's failure is the failure of what depends on it", () => {
  const lines = ["m !", "a b", "b bogus"];
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(lines, "bogus"),
  });
});

// ---------------------------------------------------------------------------
// End to end

test("a built table converts", () => {
  const table = built(
    "m !",
    "s !",
    "radian !kind",
    "k- 1000",
    "c- 0.01",
    "milli- 0.001",
    "inch 2.54 cm",
    "ft 12 inch",
    "mile 5280 ft",
    "min 60 s",
    "hour 60 min",
    "hertz 1 / s",
  );
  const lookup = unitLookup(table, CONTEXT);
  const quantity = (text: string): Quantity => {
    const expr = parseExpr(text);
    assert.ok(expr.ok, inspect(expr));
    const result = evaluate(expr.value, lookup, table.primitives, CONTEXT);
    assert.ok(result.ok, inspect(result));
    return result.value;
  };
  const miles = convert(quantity("1 mile"), quantity("km"), table.primitives);
  assert.ok(miles.ok, inspect(miles));
  assert.ok(equals(miles.value.mid, decimal("1.609344")));

  const speed = convert(
    quantity("60 mile / hour"),
    quantity("m / s"),
    table.primitives,
  );
  assert.ok(speed.ok, inspect(speed));
  assert.ok(equals(speed.value.mid, decimal("26.8224")));

  const rate = convert(
    quantity("radian / s"),
    quantity("millihertz"),
    table.primitives,
  );
  assert.ok(!rate.ok);
  assert.deepEqual(rate.error.kind, "kindMismatch");
});

test("building leaves the definitions alone", () => {
  const defs = definitions("m !", "k- 1000", "km 1000 m");
  const before = structuredClone(defs);
  built("m !", "k- 1000", "km 1000 m");
  buildTable(defs, CONTEXT);
  assert.deepEqual(defs, before);
});

// ---------------------------------------------------------------------------
// Unit lists

const TIME = [
  "s  !",
  "min  60 s",
  "hr  60 min",
  "m  !",
  "in  0.0254 m",
  "ft  12 in",
];

test("a unit list is built as its units, with their texts, largest first", () => {
  const table = built(...TIME, "time  hr;min;s", "ftin  ft ; in / 8");
  assert.deepEqual([...table.unitLists.keys()], ["time", "ftin"]);
  const time = table.unitLists.get("time")!;
  assert.deepEqual(
    time.map((unit) => unit.text),
    ["hr", "min", "s"],
  );
  assertQuantity(time[0]!.quantity, "3600", { s: 1 });
  assertQuantity(time[1]!.quantity, "60", { s: 1 });
  assertQuantity(time[2]!.quantity, "1", { s: 1 });
  const ftin = table.unitLists.get("ftin")!;
  assert.deepEqual(
    ftin.map((unit) => unit.text),
    ["ft", "in / 8"],
  );
  assertQuantity(ftin[1]!.quantity, "0.003175", { m: 1 });
});

test("a unit list is not a unit", () => {
  const table = built(...TIME, "time  hr;min;s");
  assert.equal(table.units.has("time"), false);
  assert.deepEqual(failed(...TIME, "time  hr;min;s", "twice  2 time"), {
    kind: "unknownUnit",
    name: "time",
    span: spanOf([...TIME, "time  hr;min;s", "twice  2 time"], "time", 2),
  });
});

test("a list may refer to units defined after it, and through prefixes", () => {
  const table = built("pace  hr/km;min/km;s/km", "k-  1000", ...TIME);
  const pace = table.unitLists.get("pace")!;
  assertQuantity(pace[0]!.quantity, "3.6", { s: 1, m: -1 });
  assertQuantity(pace[2]!.quantity, "0.001", { s: 1, m: -1 });
});

test("a unit list and a unit share a namespace", () => {
  const lines = [...TIME, "hms  hr;min;s", "hms  s"];
  const [first, second] = definitions(...lines).slice(-2);
  assert.deepEqual(failed(...lines), { kind: "duplicate", first, second });
  const reversed = [...TIME, "hms  s", "hms  hr;min;s"];
  const [unit, list] = definitions(...reversed).slice(-2);
  assert.deepEqual(failed(...reversed), {
    kind: "duplicate",
    first: unit,
    second: list,
  });
});

test("a unit list's name may not read as a prefix followed by a unit", () => {
  const lines = ["m-  0.001", ...TIME, "ms  min;s"];
  const [definition] = definitions(...lines).slice(-1);
  assert.deepEqual(failed(...lines), {
    kind: "prefixedName",
    definition,
    split: { prefix: "m", unit: "s" },
  });
});

test("the units of a list must conform to one another", () => {
  const lines = [...TIME, "mixed  hr;ft"];
  const [definition] = definitions(...lines).slice(-1);
  const error = failed(...lines);
  assert.equal(error.kind, "invalidUnitList");
  assert.ok(error.kind === "invalidUnitList");
  assert.deepEqual(error.definition, definition);
  assert.equal(error.error.kind, "nonconformingUnit");
  assert.equal(error.error.index, 1);
});

test("the units of a list must be positive and decreasing", () => {
  const zero = [...TIME, "bad  hr;0 min;s"];
  const [zeroList] = definitions(...zero).slice(-1);
  assert.deepEqual(failed(...zero), {
    kind: "invalidUnitList",
    definition: zeroList,
    error: { kind: "nonpositiveUnit", index: 1 },
  });
  const rising = [...TIME, "bad  min;hr;s"];
  const [risingList] = definitions(...rising).slice(-1);
  assert.deepEqual(failed(...rising), {
    kind: "invalidUnitList",
    definition: risingList,
    error: { kind: "unitOutOfOrder", index: 1 },
  });
});

test("an error in an item is reported at the item", () => {
  const lines = [...TIME, "bad  hr;bogus;s"];
  assert.deepEqual(failed(...lines), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(lines, "bogus"),
  });
  const zero = [...TIME, "bad  hr;min/0;s"];
  const divisor = spanOf(zero, "min/0").end;
  assert.deepEqual(failed(...zero), {
    kind: "divisionByZero",
    span: { start: divisor - 1, end: divisor },
  });
});

test("a list's failing dependency is the list's failure, and the build stops in order", () => {
  const lines = [
    ...TIME,
    "bad  hr;broken;s",
    "broken  1 / 0 hr",
    "later  bogus",
  ];
  assert.deepEqual(failed(...lines), {
    kind: "divisionByZero",
    span: spanOf(lines, "0 hr"),
  });
});

test("a built list converts", () => {
  const table = built(...TIME, "time  hr;min;s");
  const time = table.unitLists.get("time")!;
  const have = { magnitude: exact(decimal("3661")), dimension: dim({ s: 1 }) };
  const result = convertToList(
    have,
    time.map((unit) => unit.quantity),
    table.primitives,
  );
  assert.ok(result.ok);
  assert.deepEqual(
    result.value.map((term) => toFraction(term.mid)),
    ["1", "1", "1"],
  );
});

// ---------------------------------------------------------------------------
// Functions

const TEMP = [
  "K  !",
  "degF  5 K / 9",
  "tempC(x)  [1;K]  x K + 273.15 K ; tempC / K - 273.15",
  "tempF(x)  [1;K]  (x + 459.67) degF ; tempF / degF - 459.67",
];

/** What `text` evaluates to in `table`, or its failure. */
function resultIn(table: UnitTable, text: string) {
  const expr = parseExpr(text);
  assert.ok(expr.ok, inspect(expr));
  return evaluate(
    expr.value,
    unitLookup(table, CONTEXT),
    table.primitives,
    CONTEXT,
  );
}

/** The quantity `text` denotes in `table`. */
function quantityIn(table: UnitTable, text: string): Quantity {
  const expr = parseExpr(text);
  assert.ok(expr.ok, inspect(expr));
  const result = evaluate(
    expr.value,
    unitLookup(table, CONTEXT),
    table.primitives,
    CONTEXT,
  );
  assert.ok(result.ok, inspect(result));
  return result.value;
}

test("a function is built as its bodies, with its declared units and their texts", () => {
  const table = built(...TEMP);
  assert.deepEqual([...table.functions.keys()], ["tempC", "tempF"]);
  const tempC = table.functions.get("tempC")!;
  const [, , definition] = definitions(...TEMP);
  assert.ok(definition?.kind === "function");
  assert.equal(tempC.name, "tempC");
  assert.equal(tempC.parameter, "x");
  assert.equal(tempC.argument.text, "1");
  assertQuantity(tempC.argument.quantity, "1", {});
  assert.equal(tempC.result.text, "K");
  assertQuantity(tempC.result.quantity, "1", { K: 1 });
  assert.deepEqual(tempC.forward, definition.forward);
  assert.deepEqual(tempC.inverse, definition.inverse);
  assert.equal(table.units.has("tempC"), false);
});

test("a built function applies and inverts", () => {
  const table = built(...TEMP);
  const boiling = quantityIn(table, "tempF(212)");
  assertQuantity(boiling, "373.15", { K: 1 });
  const argument = invertFunction(
    table.functions.get("tempC")!,
    boiling,
    unitLookup(table, CONTEXT),
    table.primitives,
    CONTEXT,
  );
  assert.ok(argument.ok, inspect(argument));
  assertQuantity(argument.value, "100", {});
});

test("a unit may be defined by a call, in any order", () => {
  const table = built("boiling  tempC(100)", ...TEMP);
  assertQuantity(table.units.get("boiling"), "373.15", { K: 1 });
});

test("a body may call another function, and a declared unit may be any unit", () => {
  const table = built(
    ...TEMP,
    "twice(x)  [1;K]  tempC(2 x) ; (twice / K - 273.15) / 2",
    "m  !",
    "in  0.0254 m",
    "ft  12 in",
    "dozen(x)  [in;ft]  12 x ; dozen / 12",
  );
  assertQuantity(quantityIn(table, "twice(50)"), "373.15", { K: 1 });
  assertQuantity(quantityIn(table, "dozen(2 in)"), "0.6096", { m: 1 });
  const dozen = table.functions.get("dozen")!;
  assert.equal(dozen.argument.text, "in");
  assertQuantity(dozen.argument.quantity, "0.0254", { m: 1 });
});

test("a function is not a unit", () => {
  const body = [...TEMP, "twice  2 tempC"];
  assert.deepEqual(failed(...body), {
    kind: "functionAsUnit",
    name: "tempC",
    span: spanOf(body, "tempC", 3),
    arity: { min: 1, max: 1 },
  });
  const list = [...TEMP, "readings  tempC;K"];
  assert.deepEqual(failed(...list), {
    kind: "functionAsUnit",
    name: "tempC",
    span: spanOf(list, "tempC", 3),
    arity: { min: 1, max: 1 },
  });
});

test("a call of a unit, or of nothing, in a body is not a function", () => {
  const unit = ["m  !", "bad  m(2)"];
  const call = spanOf(unit, "m(2)");
  assert.deepEqual(failed(...unit), {
    kind: "notAFunction",
    name: "m",
    span: { start: call.start, end: call.start + 1 },
    call,
    otherwise: "unit",
  });
  const prefixed = ["k-  1000", "m  !", "bad  km(2)"];
  assert.equal(failed(...prefixed).kind, "notAFunction");
  assert.ok(failed(...prefixed).kind === "notAFunction");
  assert.equal(
    (failed(...prefixed) as { otherwise: string }).otherwise,
    "prefixedUnit",
  );
  const nothing = ["m  !", "bad  foo(2)"];
  assert.equal(
    (failed(...nothing) as { otherwise: string }).otherwise,
    "nothing",
  );
});

test("a function and a unit share a namespace", () => {
  const lines = [...TEMP, "tempC  K"];
  const [first, second] = [definitions(...lines)[2], definitions(...lines)[4]];
  assert.deepEqual(failed(...lines), { kind: "duplicate", first, second });
  const reversed = ["tempC  K", ...TEMP];
  const [unit, fn] = [definitions(...reversed)[0], definitions(...reversed)[3]];
  assert.deepEqual(failed(...reversed), {
    kind: "duplicate",
    first: unit,
    second: fn,
  });
});

test("a function's name may not read as a prefix followed by a unit", () => {
  const lines = ["m-  0.001", "s  !", "ms(x)  [1;s]  x s ; ms / s"];
  const [definition] = definitions(...lines).slice(-1);
  assert.deepEqual(failed(...lines), {
    kind: "prefixedName",
    definition,
    split: { prefix: "m", unit: "s" },
  });
});

test("the declared units are evaluated, and neither may be zero", () => {
  const unknown = [...TEMP, "f(x)  [bogus;K]  x K ; f / K"];
  assert.deepEqual(failed(...unknown), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(unknown, "bogus"),
  });
  const zeroArgument = [...TEMP, "f(x)  [0;K]  x K ; f / K"];
  const [argumentDefinition] = definitions(...zeroArgument).slice(-1);
  assert.deepEqual(failed(...zeroArgument), {
    kind: "zeroDeclaredUnit",
    definition: argumentDefinition,
    unit: "argument",
  });
  const zeroResult = [...TEMP, "f(x)  [1;0 K]  x K ; f / K"];
  const [resultDefinition] = definitions(...zeroResult).slice(-1);
  assert.deepEqual(failed(...zeroResult), {
    kind: "zeroDeclaredUnit",
    definition: resultDefinition,
    unit: "result",
  });
  // A declared unit that cannot be told from zero is no count either.
  const aroundZero = [...TEMP, "f(x)  [(2^(1/2))^2 - 2;K]  x K ; f / K"];
  const [aroundDefinition] = definitions(...aroundZero).slice(-1);
  assert.deepEqual(failed(...aroundZero), {
    kind: "zeroDeclaredUnit",
    definition: aroundDefinition,
    unit: "argument",
  });
});

test("a body is checked over dimensions, not evaluated: one that fails at a value builds", () => {
  // `1 / (x - 1)` fails at one, the value the check once evaluated at, and
  // `1 / 0` at every value; both build and fail at the call that reaches
  // the value, with the body's error wrapped as a call's.
  const table = built(
    "recip(x)  [1;1]  1 / (x - 1) ; 1 / recip + 1",
    "never(x)  [1;1]  x / 0 ; never",
  );
  assertQuantity(quantityIn(table, "recip(3)"), "0.5", {});
  const atOne = resultIn(table, "recip(1)");
  assert.ok(!atOne.ok && atOne.error.kind === "callFailed");
  assert.equal(atOne.error.error.kind, "divisionByZero");
  const never = resultIn(table, "never(2)");
  assert.ok(!never.ok && never.error.kind === "callFailed");
  // A literal is not checked against the range limit either.
  assert.ok(build("huge(x)  [1;1]  1e30000 x ; huge").ok);
});

test("a body of the wrong shape fails the build, at the fault, without being evaluated", () => {
  // A sum of a length and a time, in a body over lengths.
  const sum = ["m  !", "s  !", "bad(x)  [m;m]  x + 1 s ; bad"];
  assert.deepEqual(failed(...sum), {
    kind: "nonconformingOperands",
    op: "add",
    span: spanOf(sum, "x + 1 s"),
    left: spanOf(sum, "x", 2),
    right: spanOf(sum, "1 s"),
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: dim({ s: 1 }),
    },
  });
  // A call with the wrong count of arguments.
  const arity = [...TEMP, "bad(x)  [1;K]  tempC(x, 1) ; bad / K"];
  assert.deepEqual(failed(...arity), {
    kind: "arityMismatch",
    name: "tempC",
    span: spanOf(arity, "tempC(x, 1)"),
    expected: { min: 1, max: 1 },
    given: 2,
  });
  // A call whose argument does not conform to the callee's declaration.
  const mismatch = [...TEMP, "bad(x)  [K;K]  tempC(x) ; bad"];
  const error = failed(...mismatch);
  assert.equal(error.kind, "argumentMismatch");
  assert.ok(error.kind === "argumentMismatch");
  assert.deepEqual(error.span, spanOf(mismatch, "tempC(x)", 2));
  // A name the body refers to that means nothing.
  const unknown = ["bad(x)  [1;1]  x ; bad bogus"];
  assert.deepEqual(failed(...unknown), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(unknown, "bogus"),
  });
  // The parameter is bound only in the forward body, and the name only in
  // the inverse: elsewhere the name is the function, which is not a unit.
  const nameInForward = ["bad(x)  [1;1]  bad ; bad"];
  assert.deepEqual(failed(...nameInForward), {
    kind: "functionAsUnit",
    name: "bad",
    span: spanOf(nameInForward, "bad", 2),
    arity: { min: 1, max: 1 },
  });
  const parameterInInverse = ["bad(x)  [1;1]  x ; x"];
  assert.deepEqual(failed(...parameterInInverse), {
    kind: "unknownUnit",
    name: "x",
    span: spanOf(parameterInInverse, "x", 3),
  });
});

test("each body must conform to the unit it should give", () => {
  const forward = [...TEMP.slice(0, 2), "f(x)  [1;K]  x ; f"];
  const [forwardDefinition] = definitions(...forward).slice(-1);
  assert.deepEqual(failed(...forward), {
    kind: "functionMismatch",
    definition: forwardDefinition,
    body: "forward",
    mismatch: {
      kind: "dimensionMismatch",
      have: DIMENSIONLESS,
      want: dim({ K: 1 }),
    },
  });
  // An inverse that gives a temperature where a plain number is declared.
  const inverse = [
    ...TEMP.slice(0, 2),
    "tempC(x)  [1;K]  x K + 273.15 K ; tempC - 273.15 K",
  ];
  const [inverseDefinition] = definitions(...inverse).slice(-1);
  assert.deepEqual(failed(...inverse), {
    kind: "functionMismatch",
    definition: inverseDefinition,
    body: "inverse",
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ K: 1 }),
      want: DIMENSIONLESS,
    },
  });
});

test("a cycle through a function is reported like any other", () => {
  const calls = ["f(x)  [1;1]  g(x) ; f", "g(x)  [1;1]  f(x) ; g"];
  const [f, g] = definitions(...calls);
  const reference = spanOf(calls, "f(x)", 2);
  assert.deepEqual(failed(...calls), {
    kind: "circularDefinition",
    definitions: [f, g],
    span: { start: reference.start, end: reference.start + 1 },
  });
  // Through a declared unit: the unit is defined by the function, whose
  // declaration names the unit.
  const declared = [
    "boil  tempC(100)",
    "tempC(x)  [1;boil]  x K + 273.15 K ; tempC / K - 273.15",
    "K  !",
  ];
  const [boil, tempC] = definitions(...declared);
  assert.deepEqual(failed(...declared), {
    kind: "circularDefinition",
    definitions: [boil, tempC],
    span: spanOf(declared, "boil", 2),
  });
});

// ---------------------------------------------------------------------------
// Built-ins

/** A built-in as a test injects one: a plain number doubled, exactly. */
const DBL: Builtin = {
  name: "dbl",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x]) => ok(multiplyBalls(exact(rational(2n)), x!)),
};

const BUILTINS: Builtins = new Map([
  ["dbl", DBL],
  ["km", { ...DBL, name: "km" }],
]);

function buildWith(
  builtins: Builtins,
  ...lines: string[]
): Result<UnitTable, BuildError> {
  return buildTable(definitions(...lines), CONTEXT, builtins);
}

test("a body may call a built-in, and the table carries the built-ins it was built against", () => {
  const result = buildWith(
    new Map([["dbl", DBL]]),
    "m  !",
    "six  dbl(3) m",
    "f(x)  [1;m]  dbl(x) m ; f / m / 2",
  );
  assert.ok(result.ok, inspect(result));
  const table = result.value;
  assertQuantity(table.units.get("six")!, "6", { m: 1 });
  assert.equal(table.builtins.get("dbl"), DBL);
  assertQuantity(quantityIn(table, "f(4)"), "8", { m: 1 });
  assertQuantity(quantityIn(table, "dbl(f(4) / m)"), "16", {});
});

test("a built-in's name is not a unit in a body, and the failure carries its arity", () => {
  const lines = ["m  !", "bad  2 dbl"];
  assert.deepEqual(buildWith(new Map([["dbl", DBL]]), ...lines), {
    ok: false,
    error: {
      kind: "functionAsUnit",
      name: "dbl",
      span: spanOf(lines, "dbl"),
      arity: { min: 1, max: 1 },
    },
  });
});

test("a definition named like a built-in is a duplicate whose first is the built-in", () => {
  for (const line of [
    "dbl  2",
    "dbl  !",
    "dbl  m;cm",
    "dbl(x)  [1;1]  x ; dbl",
  ]) {
    const lines = ["m  !", "cm  m / 100", line];
    const [second] = definitions(...lines).slice(-1);
    assert.deepEqual(buildWith(BUILTINS, ...lines), {
      ok: false,
      error: {
        kind: "duplicate",
        first: { kind: "builtin", name: "dbl" },
        second,
      },
    });
  }
  // A prefix is another namespace.
  assert.ok(buildWith(BUILTINS, "dbl-  2").ok);
});

test("a built-in's name may not read as a prefix followed by a unit", () => {
  assert.deepEqual(buildWith(BUILTINS, "k-  1000", "m  !"), {
    ok: false,
    error: {
      kind: "prefixedName",
      definition: { kind: "builtin", name: "km" },
      split: { prefix: "k", unit: "m" },
    },
  });
  // Without the prefix the name means nothing else, and the table builds.
  assert.ok(buildWith(BUILTINS, "m  !").ok);
});
