import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, multiplyBalls, type Ball } from "./ball.ts";
import { buildTable, type BuildError } from "./build.ts";
import {
  fromBallError,
  plainNumbers,
  type Builtin,
  type BuiltinError,
  type Builtins,
} from "./builtin.ts";
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
  rational,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { DEFAULT_PRECISION } from "./rounding.ts";
import { radiusUpper } from "./radius.ts";
import { err, type Result } from "./result.ts";
import { equals, type Scaled } from "./scaled.ts";
import type { Span } from "./span.ts";
import { dec, fr, fraction } from "../testing/scaled.ts";
import { unitLookup, type UnitTable } from "./table.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
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

function assertQuantity(
  actual: Quantity | undefined,
  magnitude: string | Scaled,
  exponents: Record<string, number | Rational>,
): void {
  assert.ok(actual !== undefined, "expected a quantity");
  const expected = typeof magnitude === "string" ? dec(magnitude) : magnitude;
  assert.deepEqual(
    actual.magnitude,
    exact(expected),
    `expected magnitude ${inspect(expected)}, got ${inspect(actual.magnitude)}`,
  );
  assert.deepEqual(actual.dimension, dim(exponents));
}

function assertFactor(actual: Ball | undefined, expected: string): void {
  assert.ok(actual !== undefined, "expected a factor");
  assert.deepEqual(
    actual,
    exact(dec(expected)),
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
  const sqrt2 = fraction(dec("1.4142135623730950488016887242096980785697"));
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
    // radius is the kernel's at the precision given, with the half unit of
    // the settling at the working digits: below 10^-(p + 8).
    assert.ok(!isExact(r.magnitude));
    const rad = radiusUpper(r.magnitude.rad);
    const distance = absolute(subtract(fraction(r.magnitude.mid), sqrt2));
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
  const lines = ["m !", "big 2^99999 m"];
  const power = spanOf(lines, "2^99999");
  assert.deepEqual(failed(...lines), {
    kind: "tooLarge",
    span: power,
    inexact: "fits",
    operand: { start: power.start, end: power.start + 1 },
  });
  // A power of ten costs nothing: the exponent takes it.
  assertQuantity(built("m !", "big 10^99999 m").units.get("big"), "1e99999", {
    m: 1,
  });
});

test("a prefix times a unit past the exponent bound is too large at the name, on its side", () => {
  const above = ["m !", "e18- 1e999999999999999999", "big 1e10 m", "x e18big"];
  assert.deepEqual(failed(...above), {
    kind: "overflow",
    span: spanOf(above, "e18big"),
  });
  const below = [
    "m !",
    "tiny- 1e-999999999999999999",
    "small 1e-10 m",
    "x tinysmall",
  ];
  assert.deepEqual(failed(...below), {
    kind: "underflow",
    span: spanOf(below, "tinysmall"),
  });
});

test("a unit of any exponent builds, and a prefix or a body scales it in the exponent", () => {
  const table = built(
    "m !",
    "k- 1000",
    "huge 1e999999999 m",
    "bigger 1e999999999 khuge",
    "tiny m / huge",
  );
  assertQuantity(table.units.get("huge"), "1e999999999", { m: 1 });
  assertQuantity(table.units.get("bigger"), "1e2000000001", { m: 1 });
  assertQuantity(table.units.get("tiny"), "1e-999999999", {});
  const lookup = unitLookup(table);
  const khuge = lookup.unit("khuge", { start: 0, end: 5 });
  assert.ok(khuge.ok, inspect(khuge));
  assertQuantity(khuge.value, "1e1000000002", { m: 1 });
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
    const result = evaluate(expr.value, lookup, table.primitives, CONTEXT);
    assert.ok(result.ok, inspect(result));
    return result.value;
  };
  const miles = convert(quantity("1 mile"), quantity("km"), table.primitives);
  assert.ok(miles.ok, inspect(miles));
  assert.ok(equals(miles.value.mid, dec("1.609344")));

  const speed = convert(
    quantity("60 mile / hour"),
    quantity("m / s"),
    table.primitives,
  );
  assert.ok(speed.ok, inspect(speed));
  assert.ok(equals(speed.value.mid, dec("26.8224")));

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
  const have = { magnitude: exact(dec("3661")), dimension: dim({ s: 1 }) };
  const result = convertToList(
    have,
    time.map((unit) => unit.quantity),
    table.primitives,
    CONTEXT,
  );
  assert.ok(result.ok);
  assert.deepEqual(
    result.value.map((term) => toFraction(fraction(term.mid))),
    ["1", "1", "1"],
  );
});

// ---------------------------------------------------------------------------
// Functions

const TEMP = [
  "K  !",
  "degF  5 K / 9",
  "tempC(x) = x K + 273.15 K",
  "~tempC(y) = y / K - 273.15",
  "tempF(x) = (x + 459.67) degF",
  "~tempF(y) = y / degF - 459.67",
];

/** What `text` evaluates to in `table`, or its failure. */
function resultIn(table: UnitTable, text: string) {
  const expr = parseExpr(text);
  assert.ok(expr.ok, inspect(expr));
  return evaluate(expr.value, unitLookup(table), table.primitives, CONTEXT);
}

/** The quantity `text` denotes in `table`. */
function quantityIn(table: UnitTable, text: string): Quantity {
  const expr = parseExpr(text);
  assert.ok(expr.ok, inspect(expr));
  const result = evaluate(
    expr.value,
    unitLookup(table),
    table.primitives,
    CONTEXT,
  );
  assert.ok(result.ok, inspect(result));
  return result.value;
}

test("a function is built as its body, with its parameter's unit, its inferred result and its inverse", () => {
  const table = built(...TEMP);
  assert.deepEqual([...table.functions.keys()], ["tempC", "tempF"]);
  const tempC = table.functions.get("tempC")!;
  const [, , definition, inverse] = definitions(...TEMP);
  assert.ok(definition?.kind === "function");
  assert.ok(inverse?.kind === "inverse");
  assert.equal(tempC.name, "tempC");
  assert.equal(tempC.parameters.length, 1);
  const [x] = tempC.parameters;
  assert.equal(x!.name, "x");
  // A parameter without an annotation takes a plain number, written `1`.
  assert.equal(x!.unit.text, "1");
  assertQuantity(x!.unit.quantity, "1", {});
  // The result is inferred from the body.
  assert.deepEqual(tempC.result, dim({ K: 1 }));
  assert.deepEqual(tempC.body, definition.body);
  assert.deepEqual(tempC.conditions, []);
  assert.deepEqual(tempC.inverse, {
    parameter: "y",
    conditions: [],
    body: inverse.body,
  });
  assert.equal(table.units.has("tempC"), false);
});

test("an inverse is optional, and a function without one builds", () => {
  const table = built("m  !", "half(x: m) = x / 2");
  const half = table.functions.get("half")!;
  assert.equal(half.inverse, undefined);
  assert.deepEqual(half.result, dim({ m: 1 }));
  assertQuantity(quantityIn(table, "half(3 m)"), "1.5", { m: 1 });
});

test("a built function applies and inverts", () => {
  const table = built(...TEMP);
  const boiling = quantityIn(table, "tempF(212)");
  assertQuantity(boiling, "373.15", { K: 1 });
  const argument = invertFunction(
    table.functions.get("tempC")!.inverse!,
    boiling,
    unitLookup(table),
    table.primitives,
    CONTEXT,
  );
  assert.ok(argument.ok, inspect(argument));
  assertQuantity(argument.value, "100", {});
});

test("a unit may be defined by a call, in any order, and an inverse may come before its function", () => {
  const table = built("boiling  tempC(100)", ...TEMP);
  assertQuantity(table.units.get("boiling"), "373.15", { K: 1 });
  const reversed = built("K  !", "~f(y) = y / K", "f(x) = x K");
  assert.notEqual(reversed.functions.get("f")!.inverse, undefined);
});

test("a body may call another function, an inverse its own, and an annotation may be any unit", () => {
  const table = built(
    ...TEMP,
    "twice(x) = tempC(2 x)",
    "~twice(y) = (y / K - 273.15) / 2",
    "m  !",
    "in  0.0254 m",
    "ft  12 in",
    "dozen(x: in) = 12 x",
    "~dozen(y) = y / 12",
    "back(x) = x K",
    "~back(y) = y / back(1)",
  );
  assertQuantity(quantityIn(table, "twice(50)"), "373.15", { K: 1 });
  assertQuantity(quantityIn(table, "dozen(2 in)"), "0.6096", { m: 1 });
  const dozen = table.functions.get("dozen")!;
  assert.equal(dozen.parameters[0]!.unit.text, "in");
  assertQuantity(dozen.parameters[0]!.unit.quantity, "0.0254", { m: 1 });
  assert.deepEqual(dozen.result, dim({ m: 1 }));
  assert.notEqual(table.functions.get("back")!.inverse, undefined);
});

test("a result's annotation is checked against the body, and is any unit of its dimension", () => {
  const table = built("m  !", "ft  0.3048 m", "g(x: m): ft = 2 x");
  assert.deepEqual(table.functions.get("g")!.result, dim({ m: 1 }));
  const wrong = ["K  !", "f(x): K = x"];
  const [definition] = definitions(...wrong).slice(-1);
  assert.deepEqual(failed(...wrong), {
    kind: "functionMismatch",
    definition,
    mismatch: {
      kind: "dimensionMismatch",
      have: DIMENSIONLESS,
      want: dim({ K: 1 }),
    },
  });
  // A plain result is asserted with `1`.
  assert.ok(build("f(x): 1 = 2 x").ok);
});

test("a function may have several parameters, bound by position, or none", () => {
  const table = built(
    "m  !",
    "kg  !",
    "s  !",
    "J  kg m^2 / s^2",
    "kinetic(mass: kg, v: m / s): J = mass v^2 / 2",
    "diff(a, b) = a - b",
    "twice(x) = diff(3 x, x)",
    "c() = 3 m",
  );
  const kinetic = table.functions.get("kinetic")!;
  assert.deepEqual(
    kinetic.parameters.map((p) => [p.name, p.unit.text]),
    [
      ["mass", "kg"],
      ["v", "m / s"],
    ],
  );
  assert.deepEqual(kinetic.result, dim({ kg: 1, m: 2, s: -2 }));
  assertQuantity(quantityIn(table, "kinetic(2 kg, 3 m / s)"), "9", {
    kg: 1,
    m: 2,
    s: -2,
  });
  // The order is the parameters': `diff(5, 2)` is 3, `diff(2, 5)` is -3.
  assertQuantity(quantityIn(table, "diff(5, 2)"), "3", {});
  assertQuantity(quantityIn(table, "diff(2, 5)"), "-3", {});
  assertQuantity(quantityIn(table, "twice(4)"), "8", {});
  // A function of no parameters is called with none.
  assert.deepEqual(table.functions.get("c")!.parameters, []);
  assertQuantity(quantityIn(table, "c() / 3"), "1", { m: 1 });
  // Each argument conforms to its own parameter, and says which.
  const swapped = resultIn(table, "kinetic(3 m / s, 2 kg)");
  assert.ok(!swapped.ok && swapped.error.kind === "argumentMismatch");
  assert.equal(swapped.error.parameter, "mass");
  assert.equal(swapped.error.parameters, 2);
  // The count is the function's own.
  const arity = resultIn(table, "diff(1)");
  assert.ok(!arity.ok && arity.error.kind === "arityMismatch");
  assert.deepEqual(arity.error.expected, { min: 2, max: 2 });
  const none = resultIn(table, "c(1)");
  assert.ok(!none.ok && none.error.kind === "arityMismatch");
  assert.deepEqual(none.error.expected, { min: 0, max: 0 });
});

test("a body's call of a function of several parameters is checked at build time, argument by argument", () => {
  const lines = ["m  !", "s  !", "f(a: m, b: s) = a / b", "g(x: m) = f(x, x)"];
  const error = failed(...lines);
  assert.ok(error.kind === "argumentMismatch", inspect(error));
  assert.equal(error.parameter, "b");
  assert.deepEqual(error.argument, spanOf(lines, "x", 3));
  // A function used as a unit carries its own arity.
  const asUnit = ["m  !", "f(a: m, b: m) = a + b", "bad  2 f"];
  assert.deepEqual(failed(...asUnit), {
    kind: "functionAsUnit",
    name: "f",
    span: spanOf(asUnit, "f", 2),
    arity: { min: 2, max: 2 },
  });
});

test("only a function of one parameter has an inverse", () => {
  for (const [fn, count] of [
    ["f(a, b) = a + b", 2],
    ["f() = 2", 0],
  ] as const) {
    const lines = [fn, "~f(y) = y"];
    const [, definition] = definitions(...lines);
    assert.deepEqual(failed(...lines), {
      kind: "inverseArity",
      definition,
      parameters: count,
    });
  }
});

test("each parameter's annotation is evaluated, and a zero one is named", () => {
  const lines = ["m  !", "nil  0 m", "f(a: m, b: nil) = a"];
  const [definition] = definitions(...lines).slice(-1);
  assert.deepEqual(failed(...lines), {
    kind: "zeroDeclaredUnit",
    definition,
    unit: "argument",
    parameter: "b",
  });
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
  const [first, second] = [definitions(...lines)[2], definitions(...lines)[6]];
  assert.deepEqual(failed(...lines), { kind: "duplicate", first, second });
  const reversed = ["tempC  K", ...TEMP];
  const [unit, fn] = [definitions(...reversed)[0], definitions(...reversed)[3]];
  assert.deepEqual(failed(...reversed), {
    kind: "duplicate",
    first: unit,
    second: fn,
  });
});

test("an inverse needs its function, and a function has one inverse at most", () => {
  const orphan = ["K  !", "~f(y) = y / K"];
  const [definition] = definitions(...orphan).slice(-1);
  assert.deepEqual(failed(...orphan), {
    kind: "orphanInverse",
    definition,
  });
  // A built-in has no definition to be the inverse of.
  assert.equal(build("~exp(y) = ln(y)").ok, false);
  const twice = [...TEMP, "~tempC(z) = z / K"];
  const lines = definitions(...twice);
  assert.deepEqual(failed(...twice), {
    kind: "duplicate",
    first: lines[3],
    second: lines[6],
  });
  // An inverse's name is apart from the units: a unit `y` and `~tempC`
  // coexist, and `~tempC` is no name a body could use.
  assert.ok(build(...TEMP, "y  K").ok);
});

test("a function's name may not read as a prefix followed by a unit", () => {
  const lines = ["m-  0.001", "s  !", "ms(x) = x s"];
  const [definition] = definitions(...lines).slice(-1);
  assert.deepEqual(failed(...lines), {
    kind: "prefixedName",
    definition,
    split: { prefix: "m", unit: "s" },
  });
});

test("the annotations are evaluated, and neither may be zero", () => {
  const unknown = [...TEMP, "f(x: bogus) = x"];
  assert.deepEqual(failed(...unknown), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(unknown, "bogus"),
  });
  const zeroArgument = [...TEMP, "nil  0 K", "f(x: nil) = x"];
  const [argumentDefinition] = definitions(...zeroArgument).slice(-1);
  assert.deepEqual(failed(...zeroArgument), {
    kind: "zeroDeclaredUnit",
    definition: argumentDefinition,
    unit: "argument",
    parameter: "x",
  });
  const zeroResult = [...TEMP, "nil  0 K", "f(x): nil = x K"];
  const [resultDefinition] = definitions(...zeroResult).slice(-1);
  assert.deepEqual(failed(...zeroResult), {
    kind: "zeroDeclaredUnit",
    definition: resultDefinition,
    unit: "result",
  });
  // An annotation that cannot be told from zero is no count either.
  const aroundZero = [...TEMP, "fuzz  (2^(1/2))^2 - 2", "f(x: fuzz) = x"];
  const [aroundDefinition] = definitions(...aroundZero).slice(-1);
  assert.deepEqual(failed(...aroundZero), {
    kind: "zeroDeclaredUnit",
    definition: aroundDefinition,
    unit: "argument",
    parameter: "x",
  });
});

test("a body is checked over dimensions, not evaluated: one that fails at a value builds", () => {
  // `1 / (x - 1)` fails at one, the value the check once evaluated at, and
  // `1 / 0` at every value; both build and fail at the call that reaches
  // the value, with the body's error wrapped as a call's.
  const table = built(
    "recip(x) = 1 / (x - 1)",
    "~recip(y) = 1 / y + 1",
    "never(x) = x / 0",
  );
  assertQuantity(quantityIn(table, "recip(3)"), "0.5", {});
  const atOne = resultIn(table, "recip(1)");
  assert.ok(!atOne.ok && atOne.error.kind === "callFailed");
  assert.equal(atOne.error.error.kind, "divisionByZero");
  const never = resultIn(table, "never(2)");
  assert.ok(!never.ok && never.error.kind === "callFailed");
  // A literal is not checked against the significand limit either.
  assert.ok(build("huge(x) = 1e30000 x").ok);
});

test("a body of the wrong shape fails the build, at the fault, without being evaluated", () => {
  // A sum of a length and a time, in a body over lengths.
  const sum = ["m  !", "s  !", "bad(x: m) = x + 1 s"];
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
  const arity = [...TEMP, "bad(x) = tempC(x, 1)"];
  assert.deepEqual(failed(...arity), {
    kind: "arityMismatch",
    name: "tempC",
    span: spanOf(arity, "tempC(x, 1)"),
    expected: { min: 1, max: 1 },
    given: 2,
  });
  // A call whose argument does not conform to what the callee takes.
  const mismatch = [...TEMP, "bad(x: K) = tempC(x)"];
  const error = failed(...mismatch);
  assert.equal(error.kind, "argumentMismatch");
  assert.ok(error.kind === "argumentMismatch");
  assert.deepEqual(error.span, spanOf(mismatch, "tempC(x)", 2));
  // A name the body refers to that means nothing.
  const unknown = ["bad(x) = x bogus"];
  assert.deepEqual(failed(...unknown), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(unknown, "bogus"),
  });
  // The function's name in its body is the function, which is not a unit.
  const nameInBody = ["bad(x) = bad"];
  assert.deepEqual(failed(...nameInBody), {
    kind: "functionAsUnit",
    name: "bad",
    span: spanOf(nameInBody, "bad", 2),
    arity: { min: 1, max: 1 },
  });
  // The function's parameter is bound in its body alone, not its inverse's.
  const parameterInInverse = ["bad(x) = x", "~bad(y) = x"];
  assert.deepEqual(failed(...parameterInInverse), {
    kind: "unknownUnit",
    name: "x",
    span: spanOf(parameterInInverse, "x", 3),
  });
});

test("an inverse's body must conform to what its function's parameter takes", () => {
  // An inverse that gives a temperature where a plain number is taken.
  const inverse = [...TEMP.slice(0, 3), "~tempC(y) = y - 273.15 K"];
  const [inverseDefinition] = definitions(...inverse).slice(-1);
  assert.deepEqual(failed(...inverse), {
    kind: "functionMismatch",
    definition: inverseDefinition,
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ K: 1 }),
      want: DIMENSIONLESS,
    },
  });
  // Its parameter has the function's result's dimension: here a length.
  const length = ["m  !", "f(x) = x m", "~f(y) = y"];
  assert.equal(failed(...length).kind, "functionMismatch");
});

test("a cycle through a function is reported like any other", () => {
  const calls = ["f(x) = g(x)", "g(x) = f(x)"];
  const [f, g] = definitions(...calls);
  const reference = spanOf(calls, "f(x)", 2);
  assert.deepEqual(failed(...calls), {
    kind: "circularDefinition",
    definitions: [f, g],
    span: { start: reference.start, end: reference.start + 1 },
  });
  // Through an annotation: the unit is defined by the function, whose
  // annotation names the unit.
  const declared = [
    "boil  tempC(100)",
    "tempC(x): boil = x K + 273.15 K",
    "K  !",
  ];
  const [boil, tempC] = definitions(...declared);
  assert.deepEqual(failed(...declared), {
    kind: "circularDefinition",
    definitions: [boil, tempC],
    span: spanOf(declared, "boil", 2),
  });
});

test("a function and an inverse keep their conditions, with the parameters each mentions", () => {
  const lines = [
    "K  !",
    "f(x, y, z) | x < y, 0 < z, z^2 + x <= 1 = x",
    "tempC(x) | x >= -273.15 = x K + 273.15 K",
    "~tempC(y) | 0 K <= y = y / K - 273.15",
  ];
  const table = built(...lines);
  const [, f, tempC, inverse] = definitions(...lines);
  assert.ok(f?.kind === "function" && tempC?.kind === "function");
  assert.ok(inverse?.kind === "inverse");
  assert.deepEqual(
    table.functions.get("f")!.conditions,
    f.conditions.map((condition, i) => ({
      ...condition,
      mentions: [["x", "y"], ["z"], ["x", "z"]][i],
    })),
  );
  const built_ = table.functions.get("tempC")!;
  assert.deepEqual(built_.conditions, [
    { ...tempC.conditions[0]!, mentions: ["x"] },
  ]);
  assert.deepEqual(built_.inverse!.conditions, [
    { ...inverse.conditions[0]!, mentions: ["y"] },
  ]);
});

test("the terms of a condition must conform, each to the next", () => {
  const lines = ["K  !", "f(x: K) | x > 0 = x"];
  const [, f] = definitions(...lines);
  assert.ok(f?.kind === "function");
  assert.deepEqual(failed(...lines), {
    kind: "nonconformingComparison",
    definition: f,
    span: spanOf(lines, "x > 0"),
    left: spanOf(lines, "x", 2),
    right: spanOf(lines, "0"),
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ K: 1 }),
      want: DIMENSIONLESS,
    },
  });
  // In a chain, the pair at fault; and `0 K` is what the message suggests.
  const chain = ["K  !", "f(x: K) | 0 K <= x <= 373.15 = x"];
  const error = failed(...chain);
  assert.ok(error.kind === "nonconformingComparison", inspect(error));
  assert.deepEqual(error.left, spanOf(chain, "x", 2));
  assert.deepEqual(error.right, spanOf(chain, "373.15"));
  assert.ok(built("K  !", "f(x: K) | 0 K <= x <= 373.15 K = x"));
  // An inverse's parameter has its function's result's dimension.
  const inverse = [
    "K  !",
    "tempC(x) = x K + 273.15 K",
    "~tempC(y) | y > 0 = y / K - 273.15",
  ];
  const [, , definition] = definitions(...inverse);
  const mismatch = failed(...inverse);
  assert.ok(mismatch.kind === "nonconformingComparison", inspect(mismatch));
  assert.deepEqual(mismatch.definition, definition);
  // A term that refers to nothing fails as a body's would.
  assert.deepEqual(failed("f(x) | x > bogus = x"), {
    kind: "unknownUnit",
    name: "bogus",
    span: spanOf(["f(x) | x > bogus = x"], "bogus"),
  });
});

test("a condition must mention a parameter", () => {
  const lines = ["m  !", "f(x) | 1 < 2 = x", "g(x: m) | 0 m < 1 m = x"];
  const [, f] = definitions(...lines);
  assert.deepEqual(failed(...lines), {
    kind: "conditionWithoutParameter",
    definition: f,
    span: spanOf(lines, "1 < 2"),
  });
  const inverse = ["f(x) = x", "~f(y) | 0 < 1 = y"];
  const error = failed(...inverse);
  assert.equal(error.kind, "conditionWithoutParameter");
});

test("a call in a condition is a dependency, so a cycle through one is reported", () => {
  const own = ["f(x) | f(x) > 0 = x"];
  const [f] = definitions(...own);
  assert.deepEqual(failed(...own), {
    kind: "circularDefinition",
    definitions: [f],
    span: { start: 7, end: 8 },
  });
  const mutual = ["f(x) | g(x) > 0 = x", "g(x) = f(x)"];
  const [first, second] = definitions(...mutual);
  const error = failed(...mutual);
  assert.ok(error.kind === "circularDefinition", inspect(error));
  assert.deepEqual(error.definitions, [first, second]);
  // An inverse is outside the walk, so it may call its function in a condition.
  assert.ok(built("f(x) = 2 x", "~f(y) | f(y) > 0 = y / 2"));
});

test("a unit defined by a call checks the call's conditions when the table is built", () => {
  const lines = [
    "K  !",
    "tempC(x) | x >= -273.15 = x K + 273.15 K",
    "cold  tempC(-300)",
  ];
  assert.deepEqual(failed(...lines), {
    kind: "conditionFailed",
    name: "tempC",
    span: spanOf(lines, "tempC(-300)"),
    condition: "x >= -273.15",
    arguments: [{ parameter: "x", span: spanOf(lines, "-300") }],
  });
  // At the boundary, exactly, it holds.
  const zero = built(
    "K  !",
    "tempC(x) | x >= -273.15 = x K + 273.15 K",
    "absolute  tempC(-273.15)",
  );
  assertQuantity(zero.units.get("absolute"), "0", { K: 1 });
  // Undecided, it fails the build: a unit has nowhere to carry a warning.
  const undecided = [
    "K  !",
    "tempC(x) | x >= -273.15 = x K + 273.15 K",
    "cold  tempC(approx(-273.15))",
  ];
  assert.deepEqual(failed(...undecided), {
    kind: "undecidedCondition",
    name: "tempC",
    span: spanOf(undecided, "tempC(approx(-273.15))"),
    assumption: {
      name: "tempC",
      of: "function",
      condition: "x >= -273.15",
      parameters: 1,
    },
  });
  // So does a list's unit.
  const list = [
    "K  !",
    "tempC(x) | x >= -273.15 = x K + 273.15 K",
    "temps  tempC(approx(-273.15)) + 2 K; K",
  ];
  assert.equal(failed(...list).kind, "undecidedCondition");
});

// ---------------------------------------------------------------------------
// Built-ins

/** `x` doubled, exactly; the product of balls fails only at the exponent bound. */
function doubled(x: Ball): Result<Ball, BuiltinError> {
  const product = multiplyBalls(exact(fr(2n)), x);
  return product.ok ? product : err(fromBallError(product.error, 0));
}

/** A built-in as a test injects one: a plain number doubled, exactly. */
const DBL: Builtin = {
  name: "dbl",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x]) => doubled(x!),
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
    "f(x) = dbl(x) m",
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
  for (const line of ["dbl  2", "dbl  !", "dbl  m;cm", "dbl(x) = x"]) {
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
