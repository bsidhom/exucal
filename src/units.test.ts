// Checks of the system definitions in units.txt: that the file parses and
// builds, that the primitives are the SI base units, and that a sample of
// units from every part of the file converts to the value its defining
// document gives. The core's own behavior is tested beside each module in
// core/; these tests only exercise the data.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import { convert, convertToList, type ConvertError } from "./core/convert.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { evaluate } from "./core/evaluate.ts";
import { parseExpr } from "./core/expr.ts";
import { type Quantity } from "./core/quantity.ts";
import {
  DEFAULT_PRECISION,
  divide,
  equals,
  parseDecimal,
  toFraction,
  type Rational,
} from "./core/rational.ts";
import { type Result } from "./core/result.ts";
import { unitLookup, type UnitTable } from "./core/table.ts";

// ---------------------------------------------------------------------------
// Helpers

const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");

/** The table the file builds; every test starts from it. */
const table: UnitTable = (() => {
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, DEFAULT_PRECISION);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

const lookup = unitLookup(table);

/** The quantity the expression `source` denotes in the table. */
function quantity(source: string): Quantity {
  const expr = parseExpr(source);
  assert.ok(expr.ok, `${JSON.stringify(source)} does not parse`);
  const value = evaluate(
    expr.value,
    lookup,
    table.primitives,
    DEFAULT_PRECISION,
  );
  assert.ok(
    value.ok,
    `${JSON.stringify(source)} does not evaluate: ${inspect(value)}`,
  );
  return value.value;
}

function converted(have: string, want: string): Result<Rational, ConvertError> {
  return convert(quantity(have), quantity(want), table.primitives);
}

/** The rational `text` denotes: a decimal, or a quotient `a/b` of two. */
function number(text: string): Rational {
  const [numerator, denominator] = text.split("/").map((part) => {
    const result = parseDecimal(part);
    assert.ok(result.ok, `${JSON.stringify(part)} is not a number`);
    return result.value;
  });
  if (denominator === undefined) return numerator;
  const result = divide(numerator, denominator);
  assert.ok(result.ok, `${JSON.stringify(text)} divides by zero`);
  return result.value;
}

/** Asserts that `have` converts to exactly `expected` `want`s. */
function assertConverts(have: string, want: string, expected: string): void {
  const result = converted(have, want);
  assert.ok(
    result.ok,
    `${have} does not convert to ${want}: ${inspect(result)}`,
  );
  assert.ok(
    equals(result.value, number(expected)),
    `${have} in ${want}: expected ${expected}, got ${toFraction(result.value)}`,
  );
}

/** Runs `assertConverts` over rows of `[have, want, expected]`. */
function assertAll(rows: readonly (readonly [string, string, string])[]): void {
  for (const [have, want, expected] of rows) {
    assertConverts(have, want, expected);
  }
}

// ---------------------------------------------------------------------------
// The file as a whole

test("the SI base units are the dimension primitives, and the radian a kind", () => {
  assert.deepEqual(
    [...table.primitives],
    [
      ["m", "dimension"],
      ["kg", "dimension"],
      ["s", "dimension"],
      ["A", "dimension"],
      ["K", "dimension"],
      ["mol", "dimension"],
      ["cd", "dimension"],
      ["radian", "kind"],
      ["bit", "dimension"],
    ],
  );
});

test("every SI prefix is defined by name and by symbol", () => {
  const prefixes: readonly (readonly [string, string, string])[] = [
    ["quetta", "Q", "1e30"],
    ["ronna", "R", "1e27"],
    ["yotta", "Y", "1e24"],
    ["zetta", "Z", "1e21"],
    ["exa", "E", "1e18"],
    ["peta", "P", "1e15"],
    ["tera", "T", "1e12"],
    ["giga", "G", "1e9"],
    ["mega", "M", "1e6"],
    ["kilo", "k", "1e3"],
    ["hecto", "h", "1e2"],
    ["deca", "da", "1e1"],
    ["deci", "d", "1e-1"],
    ["centi", "c", "1e-2"],
    ["milli", "m", "1e-3"],
    ["micro", "µ", "1e-6"],
    ["nano", "n", "1e-9"],
    ["pico", "p", "1e-12"],
    ["femto", "f", "1e-15"],
    ["atto", "a", "1e-18"],
    ["zepto", "z", "1e-21"],
    ["yocto", "y", "1e-24"],
    ["ronto", "r", "1e-27"],
    ["quecto", "q", "1e-30"],
  ];
  for (const [name, symbol, factor] of prefixes) {
    for (const prefix of [name, symbol]) {
      const actual = table.prefixes.get(prefix);
      assert.ok(actual !== undefined, `the prefix ${prefix} is missing`);
      assert.ok(
        equals(actual, number(factor)),
        `${prefix}: expected ${factor}, got ${toFraction(actual)}`,
      );
    }
  }
  // The other spellings of micro, and the binary prefixes.
  assertAll([
    ["1 μm", "m", "1e-6"],
    ["1 um", "m", "1e-6"],
    ["1 KiB", "byte", "1024"],
    ["1 MiB", "kibibyte", "1024"],
    ["1 GiB", "B", "1073741824"],
    ["1 YiB", "B", "1208925819614629174706176"],
  ]);
});

test("a prefix applies to any unit, and an exact name wins over a split", () => {
  assertAll([
    ["1 km", "m", "1000"],
    ["1 kilometre", "m", "1000"],
    ["1 kilogram", "g", "1000"],
    ["1 mg", "kg", "1e-6"],
    ["1 daN", "N", "10"],
    ["1 hPa", "Pa", "100"],
    ["1 kWh", "J", "3600000"],
    ["1 mAh", "C", "3.6"],
    ["1 kΩ", "ohm", "1000"],
    ["1 µs", "s", "1e-6"],
    ["1 mL", "cm^3", "1"],
    ["1 Mbps", "bit/s", "1e6"],
    // `min` and `cd` are units of their own, not `m`+`in` or `c`+`d`.
    ["1 min", "s", "60"],
    ["1 cd", "candela", "1"],
    // `ha` is a unit of its own, and also what `h`+`a` would give.
    ["1 ha", "are", "100"],
  ]);
});

test("temperature readings convert by adding the offset by hand", () => {
  // The units are intervals, so a reading is converted by writing out the
  // offset: 20 °C is 293.15 K, and 300 K is 80.33 °F.
  assertAll([
    ["20 degC + 273.15 K", "K", "293.15"],
    ["300 K - 459.67 degR", "degF", "80.33"],
    ["212 degF - 32 degF", "degC", "100"],
    ["98.6 degF + 459.67 degR", "K", "310.15"],
    ["-40 degC + 273.15 K", "K", "233.15"],
    ["-40 degC + 273.15 K - 459.67 degR", "degF", "-40"],
  ]);
});

test("angles are a kind of their own", () => {
  const result = converted("1 rpm", "Hz");
  assert.ok(!result.ok && result.error.kind === "kindMismatch");
  assert.deepEqual(result.error.kinds, ["radian"]);
  assertAll([
    ["1 turn", "deg", "360"],
    ["1 deg", "arcsec", "3600"],
    ["1 gon", "deg", "0.9"],
    ["1 rpm", "rad/s", "3.14159265358979323846264338327950288/30"],
    ["1 lm", "cd sr", "1"],
    ["1 lx", "cd sr / m^2", "1"],
  ]);
});

// ---------------------------------------------------------------------------
// SI

test("the SI derived units are coherent, by symbol and by name", () => {
  assertAll([
    ["1 Hz", "1/s", "1"],
    ["1 N", "kg m / s^2", "1"],
    ["1 Pa", "N / m^2", "1"],
    ["1 J", "N m", "1"],
    ["1 W", "J / s", "1"],
    ["1 C", "A s", "1"],
    ["1 V", "W / A", "1"],
    ["1 F", "C / V", "1"],
    ["1 Ω", "V / A", "1"],
    ["1 S", "A / V", "1"],
    ["1 Wb", "V s", "1"],
    ["1 T", "Wb / m^2", "1"],
    ["1 H", "Wb / A", "1"],
    ["1 Bq", "1/s", "1"],
    ["1 Gy", "J / kg", "1"],
    ["1 Sv", "J / kg", "1"],
    ["1 kat", "mol / s", "1"],
    ["1 hertz", "Hz", "1"],
    ["1 newton", "N", "1"],
    ["1 pascal", "Pa", "1"],
    ["1 joule", "J", "1"],
    ["1 watt", "W", "1"],
    ["1 coulomb", "C", "1"],
    ["1 volt", "V", "1"],
    ["1 farad", "F", "1"],
    ["1 ohm", "Ω", "1"],
    ["1 siemens", "S", "1"],
    ["1 weber", "Wb", "1"],
    ["1 tesla", "T", "1"],
    ["1 henry", "H", "1"],
    ["1 lumen", "lm", "1"],
    ["1 lux", "lx", "1"],
    ["1 becquerel", "Bq", "1"],
    ["1 gray", "Gy", "1"],
    ["1 sievert", "Sv", "1"],
    ["1 katal", "kat", "1"],
    ["1 degC", "K", "1"],
    ["1 degF", "K", "5/9"],
    ["1 degR", "degF", "1"],
  ]);
});

test("the non-SI units accepted for use with the SI have their SI values", () => {
  assertAll([
    ["1 min", "s", "60"],
    ["1 h", "s", "3600"],
    ["1 d", "s", "86400"],
    ["1 ha", "m^2", "10000"],
    ["1 L", "m^3", "1e-3"],
    ["1 l", "L", "1"],
    ["1 t", "kg", "1000"],
    ["1 au", "m", "149597870700"],
    ["1 eV", "J", "1.602176634e-19"],
    ["1 Da", "kg", "1.66053906660e-27"],
    ["1 amu", "Da", "1"],
  ]);
});

test("the defining constants are exact", () => {
  assertAll([
    ["c", "m/s", "299792458"],
    ["e", "C", "1.602176634e-19"],
    ["planck", "J s", "6.62607015e-34"],
    ["boltzmann", "J/K", "1.380649e-23"],
    ["avogadro", "1/mol", "6.02214076e23"],
    ["gravity", "m/s^2", "9.80665"],
  ]);
});

// ---------------------------------------------------------------------------
// US customary and imperial

test("length: the international yard and pound agreement of 1959", () => {
  assertAll([
    ["1 in", "cm", "2.54"],
    ["1 ft", "m", "0.3048"],
    ["1 yd", "m", "0.9144"],
    ["1 mi", "m", "1609.344"],
    ["1 mi", "ft", "5280"],
    ["1 mil", "in", "0.001"],
    ["1 hand", "in", "4"],
    ["1 fathom", "ft", "6"],
    ["1 chain", "ft", "66"],
    ["1 link", "in", "7.92"],
    ["1 rod", "ft", "16.5"],
    ["1 furlong", "yd", "220"],
    ["1 league", "mi", "3"],
    ["1 nmi", "m", "1852"],
    ["1 point", "in", "1/72"],
    ["1 pica", "point", "12"],
  ]);
});

test("length: the US survey foot", () => {
  assertAll([
    ["1 surveyfoot", "m", "1200/3937"],
    ["1 surveymile", "surveyft", "5280"],
    ["1 surveychain", "surveyft", "66"],
    ["1 surveyacre", "surveychain^2", "10"],
    ["1 section", "surveymile^2", "1"],
    ["1 township", "section", "36"],
    // The survey foot is two parts per million longer.
    ["1 surveymile", "mi", "500000/499999"],
  ]);
});

test("area", () => {
  assertAll([
    ["1 acre", "yd^2", "4840"],
    ["1 acre", "m^2", "4046.8564224"],
    ["1 rood", "acre", "1/4"],
    ["1 acrefoot", "ft^3", "43560"],
  ]);
});

test("volume: US liquid measure", () => {
  assertAll([
    ["1 gallon", "in^3", "231"],
    ["1 gallon", "L", "3.785411784"],
    ["1 gal", "quart", "4"],
    ["1 quart", "pint", "2"],
    ["1 pint", "cup", "2"],
    ["1 pint", "gill", "4"],
    ["1 pint", "floz", "16"],
    ["1 floz", "mL", "29.5735295625"],
    ["1 floz", "tbsp", "2"],
    ["1 tbsp", "tsp", "3"],
    ["1 floz", "fldram", "8"],
    ["1 fldram", "minim", "60"],
    ["1 barrel", "gallon", "42"],
    ["1 hogshead", "gallon", "63"],
  ]);
});

test("volume: US dry measure", () => {
  assertAll([
    ["1 bushel", "in^3", "2150.42"],
    ["1 bushel", "peck", "4"],
    ["1 bushel", "drygallon", "8"],
    ["1 drygallon", "dryquart", "4"],
    ["1 dryquart", "drypint", "2"],
    ["1 drybarrel", "in^3", "7056"],
    ["1 cord", "ft^3", "128"],
    ["1 boardfoot", "in^3", "144"],
  ]);
});

test("volume: imperial measure", () => {
  assertAll([
    ["1 impgallon", "L", "4.54609"],
    ["1 ukgallon", "impgallon", "1"],
    ["1 impgallon", "impquart", "4"],
    ["1 impquart", "imppint", "2"],
    ["1 imppint", "impgill", "4"],
    ["1 imppint", "impfloz", "20"],
    ["1 impfloz", "mL", "28.4130625"],
    ["1 impfloz", "impfldram", "8"],
    ["1 impfldram", "impminim", "60"],
    ["1 imppeck", "impgallon", "2"],
    ["1 impbushel", "impgallon", "8"],
    // The two fluid ounces differ, as the two gallons do.
    ["1 impfloz", "floz", "454609000/473176473"],
  ]);
});

test("mass: avoirdupois, troy and apothecaries'", () => {
  assertAll([
    ["1 lb", "kg", "0.45359237"],
    ["1 lb", "oz", "16"],
    ["1 oz", "dr", "16"],
    ["1 lb", "grain", "7000"],
    ["1 stone", "lb", "14"],
    ["1 quarter", "lb", "28"],
    ["1 cental", "lb", "100"],
    ["1 hundredweight", "lb", "100"],
    ["1 imphundredweight", "lb", "112"],
    ["1 ton", "lb", "2000"],
    ["1 longton", "lb", "2240"],
    ["1 longton", "kg", "1016.0469088"],
    ["1 troyounce", "grain", "480"],
    ["1 troyounce", "g", "31.1034768"],
    ["1 troypound", "troyounce", "12"],
    ["1 pennyweight", "grain", "24"],
    ["1 scruple", "grain", "20"],
    ["1 apdram", "scruple", "3"],
    ["1 apounce", "troyounce", "1"],
    ["1 appound", "troypound", "1"],
    ["1 slug", "lb", "9.80665/0.3048"],
  ]);
});

test("force, pressure, energy and power", () => {
  assertAll([
    ["1 lbf", "N", "4.4482216152605"],
    ["1 poundal", "N", "0.138254954376"],
    ["1 kip", "lbf", "1000"],
    ["1 psi", "Pa", "8896443230521/1290320000"],
    ["1 psf", "psi", "1/144"],
    ["1 atm", "Pa", "101325"],
    ["1 atm", "torr", "760"],
    ["1 bar", "Pa", "100000"],
    ["1 mmHg", "Pa", "133.322387415"],
    ["1 inHg", "Pa", "3386.388640341"],
    ["1 inH2O", "Pa", "249.08891"],
    ["1 kgf", "N", "9.80665"],
    ["1 Btu", "J", "1055.05585262"],
    ["1 therm", "Btu", "100000"],
    ["1 cal", "J", "4.184"],
    ["1 cal_IT", "J", "4.1868"],
    ["1 kcal", "J", "4184"],
    ["1 tonTNT", "J", "4.184e9"],
    ["1 hp", "W", "745.69987158227022"],
    ["1 metrichp", "W", "735.49875"],
    ["1 tonrefrigeration", "Btu/h", "12000"],
  ]);
});

test("speed", () => {
  assertAll([
    ["1 mph", "m/s", "0.44704"],
    ["1 kph", "m/s", "5/18"],
    ["1 knot", "m/s", "463/900"],
    ["1 fps", "m/s", "0.3048"],
    ["60 mph", "km/h", "96.56064"],
  ]);
});

// ---------------------------------------------------------------------------
// The rest

test("time, CGS, radiation and information", () => {
  assertAll([
    ["1 week", "day", "7"],
    ["1 year", "day", "365.25"],
    ["1 month", "day", "30.4375"],
    ["1 lightyear", "m", "9460730472580800"],
    ["1 parsec", "au", "648000/3.14159265358979323846264338327950288"],
    ["1 dyn", "N", "1e-5"],
    ["1 erg", "J", "1e-7"],
    ["1 poise", "Pa s", "0.1"],
    ["1 gauss", "T", "1e-4"],
    ["1 Ci", "Bq", "3.7e10"],
    ["1 rem", "Sv", "0.01"],
    ["1 byte", "bit", "8"],
    ["1 B", "byte", "1"],
    ["1 percent", "1", "0.01"],
    ["1 dozen", "1", "12"],
  ]);
});

// ---------------------------------------------------------------------------
// Unit lists

/** Asserts that `have` in the list `name` is exactly the `expected` terms, as `number` reads them. */
function assertList(
  have: string,
  name: string,
  expected: readonly string[],
): void {
  const list = table.unitLists.get(name);
  assert.ok(list !== undefined, `no unit list ${JSON.stringify(name)}`);
  const result = convertToList(
    quantity(have),
    list.map((unit) => unit.quantity),
    table.primitives,
  );
  assert.ok(result.ok, `${have} in ${name}: ${inspect(result)}`);
  assert.deepEqual(
    result.value.map(toFraction),
    expected.map((text) => toFraction(number(text))),
    `${have} in ${name}`,
  );
}

test("the unit lists are defined, with the units named in the file", () => {
  assert.deepEqual(
    [...table.unitLists].map(([name, units]) => [
      name,
      units.map((unit) => unit.text).join(";"),
    ]),
    [
      ["time", "hr;min;s"],
      ["hms", "hr;min;s"],
      ["dhms", "day;hr;min;s"],
      ["ydhms", "year;day;hr;min;s"],
      ["dms", "deg;arcmin;arcsec"],
      ["ftin", "ft;in"],
      ["ydftin", "yd;ft;in"],
      ["miftin", "mi;ft;in"],
      ["lboz", "lb;oz"],
      ["stlb", "stone;lb"],
      ["tonlb", "ton;lb"],
      ["galqtpt", "gal;qt;pt;floz"],
      ["cups", "cup;tbsp;tsp"],
      ["mipace", "hr/mi;min/mi;s/mi"],
      ["kmpace", "hr/km;min/km;s/km"],
    ],
  );
});

test("the unit lists convert", () => {
  assertList("3661.5 s", "time", ["1", "1", "1.5"]);
  assertList("100000 s", "dhms", ["1", "3", "46", "40"]);
  assertList("1.5 deg", "dms", ["1", "30", "0"]);
  assertList("1 m", "ftin", ["3", "428/127"]);
  assertList("100 in", "ydftin", ["2", "2", "4"]);
  assertList("1 km", "miftin", ["0", "3280", "1280/127"]);
  assertList("1 kg", "lboz", ["2", "148504416/45359237"]);
  assertList("80 kg", "stlb", ["12", "379648184/45359237"]);
  assertList("1 gal", "galqtpt", ["1", "0", "0", "0"]);
  assertList("1 L", "cups", ["4", "3", "297176309/157725491"]);
  // A ten-minute mile, as time per distance.
  assertList("1 hr / 6 mi", "mipace", ["0", "10", "0"]);
  assertList("2 hr / 26.2 mi", "mipace", ["0", "4", "4560/131"]);
  assertList("1 hr / 12 km", "kmpace", ["0", "5", "0"]);
});
