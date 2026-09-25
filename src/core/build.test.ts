import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable, type BuildError } from "./build.ts";
import { convert, convertToList } from "./convert.ts";
import { parseDefinitions, type Definition } from "./definitions.ts";
import { type Dimension } from "./dimension.ts";
import { evaluate } from "./evaluate.ts";
import { parseExpr } from "./expr.ts";
import { type Quantity } from "./quantity.ts";
import {
  DEFAULT_PRECISION,
  equals,
  parseDecimal,
  rational,
  root,
  toFraction,
  type Rational,
} from "./rational.ts";
import { type Result } from "./result.ts";
import { type Span } from "./span.ts";
import { unitLookup, type UnitTable } from "./table.ts";

// ---------------------------------------------------------------------------
// Helpers

/** The definitions of `text`, joined from lines. */
function definitions(...lines: string[]): readonly Definition[] {
  const result = parseDefinitions(lines.join("\n"));
  assert.ok(result.ok, `expected the text to parse, got ${inspect(result)}`);
  return result.value;
}

function build(...lines: string[]): Result<UnitTable, BuildError> {
  return buildTable(definitions(...lines), DEFAULT_PRECISION);
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
  const result = parseDecimal(text);
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
  assert.ok(
    equals(actual.magnitude, expected),
    `expected magnitude ${toFraction(expected)}, got ${toFraction(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, dim(exponents));
}

function assertFactor(actual: Rational | undefined, expected: string): void {
  assert.ok(actual !== undefined, "expected a factor");
  assert.ok(
    equals(actual, decimal(expected)),
    `expected ${expected}, got ${toFraction(actual)}`,
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
  const two = rational(2n);
  for (const precision of [5, DEFAULT_PRECISION]) {
    const result = buildTable(definitions("m !", "r 2^(1/2) m"), precision);
    assert.ok(result.ok, inspect(result));
    const expected = root(two, 2n, precision);
    assert.ok(expected.ok);
    assertQuantity(result.value.units.get("r"), expected.value, { m: 1 });
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
  const result = buildTable(defs, DEFAULT_PRECISION);
  assert.deepEqual(result, {
    ok: false,
    error: { kind: "duplicate", first: defs[0], second: defs[2] },
  });
});

test("a primitive and a unit share a namespace", () => {
  const defs = definitions("m 100 cm", "m !");
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
    ok: false,
    error: { kind: "duplicate", first: defs[0], second: defs[1] },
  });
});

test("a prefix defined twice is a duplicate", () => {
  const defs = definitions("k- 1000", "m !", "k- 1024");
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  assert.deepEqual(buildTable(defs, DEFAULT_PRECISION), {
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
  const lookup = unitLookup(table);
  const quantity = (text: string): Quantity => {
    const expr = parseExpr(text);
    assert.ok(expr.ok, inspect(expr));
    const result = evaluate(
      expr.value,
      lookup,
      table.primitives,
      DEFAULT_PRECISION,
    );
    assert.ok(result.ok, inspect(result));
    return result.value;
  };
  const miles = convert(quantity("1 mile"), quantity("km"), table.primitives);
  assert.ok(miles.ok, inspect(miles));
  assert.ok(equals(miles.value, decimal("1.609344")));

  const speed = convert(
    quantity("60 mile / hour"),
    quantity("m / s"),
    table.primitives,
  );
  assert.ok(speed.ok, inspect(speed));
  assert.ok(equals(speed.value, decimal("26.8224")));

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
  buildTable(defs, DEFAULT_PRECISION);
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
    kind: "prefixedListName",
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
  const have = { magnitude: decimal("3661"), dimension: dim({ s: 1 }) };
  const result = convertToList(
    have,
    time.map((unit) => unit.quantity),
    table.primitives,
  );
  assert.ok(result.ok);
  assert.deepEqual(result.value.map(toFraction), ["1", "1", "1"]);
});
