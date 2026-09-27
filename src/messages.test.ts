// Checks that each kind of error the pipeline can return comes out as the
// sentence it should, with the right piece of the right text quoted. The
// wording is UX, but the plumbing is not: which side's text a span is
// sliced from, that a code point is quoted whole, and that dimensions are
// rendered through `formatDimension`. One case per kind keeps it to that.
// The system table is the real one, so the cases read as a user would type
// them; building it costs a few milliseconds.

import assert from "node:assert/strict";
import { DEFAULT_ROUNDING, type NumberContext } from "./core/context.ts";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { convertText, evaluateText } from "./core/pipeline.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
};

const table: UnitTable = (() => {
  const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, CONTEXT);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** A table of functions whose bodies fail for some value, which the system table has none of. */
const failing: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      "recip(x)  [1;1]  1 / x ; 1 / recip",
      "bad(x)  [1;1]  recip(x) ; recip(bad)",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, CONTEXT);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** The message for the error `text` fails with, in `against`. */
function textMessage(text: string, against: UnitTable = table): string {
  const result = evaluateText(against, text, CONTEXT);
  assert.ok(!result.ok, `expected ${JSON.stringify(text)} to fail`);
  return describeTextError(result.error, text, against.primitives);
}

/** The message for the error converting `have` to `want` fails with, in `against`. */
function conversionMessage(
  have: string,
  want: string,
  against: UnitTable = table,
): string {
  const result = convertText(against, have, want, CONTEXT);
  assert.ok(!result.ok, `expected ${have} in ${want} to fail`);
  return describeConversionError(result.error, have, want, against.primitives);
}

test("a parse error names what was expected and what was found", () => {
  // The character found is quoted as a whole code point, not a surrogate.
  assert.equal(
    textMessage("3 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.',
  );
  // A want may go on as a list, and says so.
  assert.equal(
    conversionMessage("3 ft", "in 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/", "+", "-", ";" or end of input.',
  );
  assert.equal(
    textMessage("m /"),
    'Unexpected end of input: expected a number, a unit name, "(" or "-".',
  );
  assert.equal(
    textMessage("1e999999999 m"),
    '"1e999999999": this number is too large to represent.',
  );
});

test("an evaluation error quotes the text at fault", () => {
  assert.equal(textMessage("3 bogus"), 'Unknown unit "bogus".');
  assert.equal(textMessage("m / 0"), 'Division by zero in "0".');
  assert.equal(
    textMessage("m / ((2^(1/2))^2 - 2)"),
    '"((2^(1/2))^2 - 2)" cannot be told from zero at this precision, so nothing can be divided by it.',
  );
  assert.equal(textMessage("2^99999 m"), '"2^99999" is too large to compute.');
  assert.equal(
    textMessage("(-4)^0.5 m"),
    '"(-4)^0.5" takes an even root of a negative value.',
  );
});

test("a nonconforming sum quotes both operands with their dimensions", () => {
  assert.equal(
    textMessage("3 ft + 1 min"),
    'Cannot add "3 ft" and "1 min": "3 ft" has dimension m, but "1 min" has dimension s.',
  );
  assert.equal(
    textMessage("2 (3 ft - 1 min)"),
    'Cannot subtract "1 min" from "3 ft": "3 ft" has dimension m, but "1 min" has dimension s.',
  );
  assert.equal(
    textMessage("1 rpm + 1 Hz"),
    'Cannot add "1 rpm" and "1 Hz": "1 rpm" (radian / s) and "1 Hz" (1 / s) differ in kind: radian.',
  );
  assert.equal(
    textMessage("1 m + 0"),
    'Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1.',
  );
});

test("an input error is sliced from the text of its own side", () => {
  // Both texts have something at the span; only the want's is at fault.
  assert.equal(conversionMessage("3 ft", "3 xy"), 'Unknown unit "xy".');
  assert.equal(
    conversionMessage("3 ft + 1 in", "1 in + 1 s"),
    'Cannot add "1 in" and "1 s": "1 in" has dimension m, but "1 s" has dimension s.',
  );
});

test("a conformance error shows both dimensions", () => {
  assert.equal(
    conversionMessage(" 3 ft ", "min"),
    '"3 ft" has dimension m, but "min" has dimension s.',
  );
  assert.equal(
    conversionMessage("1 rpm", "Hz"),
    '"1 rpm" (radian / s) and "Hz" (1 / s) differ in kind: radian.',
  );
});

test("a zero want is reported as such, and one that cannot be told from zero too", () => {
  assert.equal(
    conversionMessage("3 ft", "0 m"),
    '"0 m" is zero, so nothing is a multiple of it.',
  );
  assert.equal(
    conversionMessage("3 ft", "((2^(1/2))^2 - 2) m"),
    '"((2^(1/2))^2 - 2) m" cannot be told from zero at this precision, so nothing can be converted into it.',
  );
});

test("a unit in a typed list at fault is quoted from the list", () => {
  assert.equal(
    conversionMessage("3 ft", "ft; min"),
    '"3 ft" has dimension m, but "min" has dimension s.',
  );
  assert.equal(
    conversionMessage("1 rpm", "rev/min;Hz"),
    '"1 rpm" (radian / s) and "Hz" (1 / s) differ in kind: radian.',
  );
  assert.equal(
    conversionMessage("3 ft", "ft;0 in"),
    '"0 in" is not positive (or cannot be told from zero), and every unit in a list must be.',
  );
  assert.equal(
    conversionMessage("3 ft", "in;ft"),
    '"ft" is not smaller than the unit before it; a list runs from the largest unit to the smallest.',
  );
  assert.equal(conversionMessage("3 ft", "ft;bogus"), 'Unknown unit "bogus".');
});

test("a named list that does not conform is the mismatch of the pair", () => {
  assert.equal(
    conversionMessage("3 ft", "time"),
    '"3 ft" has dimension m, but "time" has dimension s.',
  );
});

test("a call of something that is not a function says what it is", () => {
  assert.equal(
    textMessage("kg(m/s)"),
    '"kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.',
  );
  assert.equal(
    textMessage("2 km( 2 )"),
    '"km" is a unit, not a function. For a product, write "km ( 2 )", with a space.',
  );
  assert.equal(textMessage("foo(2)"), 'Unknown function "foo".');
  assert.equal(conversionMessage("1 K", "time(2)"), 'Unknown function "time".');
});

test("a function used as a unit shows the call form", () => {
  assert.equal(
    textMessage("2 tempC"),
    '"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".',
  );
  assert.equal(
    conversionMessage("1 K", "tempC;degC"),
    '"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".',
  );
});

test("an argument that does not conform is worded as a mismatch with what the function takes", () => {
  assert.equal(
    textMessage("tempC(1 m)"),
    'Cannot apply "tempC" to "1 m": "1 m" has dimension m, but the argument of "tempC" has dimension 1.',
  );
  assert.equal(
    textMessage("tempC(1 radian)"),
    'Cannot apply "tempC" to "1 radian": "1 radian" (radian) and the argument of "tempC" (1) differ in kind: radian.',
  );
});

test("a body that fails is described by what the definition does", () => {
  assert.equal(
    textMessage("recip(0)", failing),
    'Cannot compute "recip(0)": the definition of "recip" divides by zero.',
  );
  assert.equal(
    textMessage("2 bad( 0 )", failing),
    'Cannot compute "bad( 0 )": the definition of "bad" calls "recip", whose definition divides by zero.',
  );
  assert.equal(
    textMessage("recip((2^(1/2))^2 - 2)", failing),
    'Cannot compute "recip((2^(1/2))^2 - 2)": the definition of "recip" divides by a value that cannot be told from zero at this precision.',
  );
  assert.equal(
    conversionMessage(" 0 ", "recip", failing),
    'Cannot invert "recip" for "0": the inverse of "recip" divides by zero.',
  );
  assert.equal(
    conversionMessage("0", "bad", failing),
    'Cannot invert "bad" for "0": the inverse of "bad" calls "recip", whose definition divides by zero.',
  );
});

test("a have that does not conform to a function is the mismatch of the pair", () => {
  assert.equal(
    conversionMessage("3 ft", "tempC"),
    '"3 ft" has dimension m, but "tempC" has dimension K.',
  );
});
