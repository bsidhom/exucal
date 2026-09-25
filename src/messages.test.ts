// Checks that each kind of error the pipeline can return comes out as the
// sentence it should, with the right piece of the right text quoted. The
// wording is UX, but the plumbing is not: which side's text a span is
// sliced from, that a code point is quoted whole, and that dimensions are
// rendered through `formatDimension`. One case per kind keeps it to that.
// The system table is the real one, so the cases read as a user would type
// them; building it costs a few milliseconds.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { convertText, evaluateText } from "./core/pipeline.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

const table: UnitTable = (() => {
  const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, DEFAULT_PRECISION);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** The message for the error `text` fails with. */
function textMessage(text: string): string {
  const result = evaluateText(table, text, DEFAULT_PRECISION);
  assert.ok(!result.ok, `expected ${JSON.stringify(text)} to fail`);
  return describeTextError(result.error, text);
}

/** The message for the error converting `have` to `want` fails with. */
function conversionMessage(have: string, want: string): string {
  const result = convertText(table, have, want, DEFAULT_PRECISION);
  assert.ok(!result.ok, `expected ${have} in ${want} to fail`);
  return describeConversionError(result.error, have, want, table.primitives);
}

test("a parse error names what was expected and what was found", () => {
  // The character found is quoted as a whole code point, not a surrogate.
  assert.equal(
    textMessage("3 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/" or end of input.',
  );
  assert.equal(
    textMessage("m /"),
    'Unexpected end of input: expected a number, a unit name or "(".',
  );
  assert.equal(
    textMessage("1e999999999 m"),
    '"1e999999999": this number is too large to represent.',
  );
});

test("an evaluation error quotes the text at fault", () => {
  assert.equal(textMessage("3 bogus"), 'Unknown unit "bogus".');
  assert.equal(textMessage("m / 0"), 'Division by zero in "0".');
  assert.equal(textMessage("2^99999 m"), '"2^99999" is too large to compute.');
  // No expression can be negative yet (there is no `-`), so this error is
  // described from a constructed instance.
  assert.equal(
    describeTextError(
      { kind: "negativeRadicand", degree: 2n, span: { start: 0, end: 5 } },
      "x^0.5",
    ),
    '"x^0.5" takes an even root of a negative value.',
  );
});

test("an input error is sliced from the text of its own side", () => {
  // Both texts have something at the span; only the want's is at fault.
  assert.equal(conversionMessage("3 ft", "3 xy"), 'Unknown unit "xy".');
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

test("a zero want is reported as such", () => {
  assert.equal(
    conversionMessage("3 ft", "0 m"),
    '"0 m" is zero, so nothing is a multiple of it.',
  );
});
