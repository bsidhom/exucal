// Checks the wording of every message, one per kind of error the pipeline
// can return, against the errors the core actually produces for the input
// quoted, so that a change in what the core reports shows up here.

import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { convertText, evaluateText } from "./core/pipeline.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

const table: UnitTable = (() => {
  const definitions = parseDefinitions(
    [
      "m        !",
      "s        !",
      "radian   !kind",
      "in       0.0254 m",
      "ft       12 in",
      "min      60 s",
      "Hz       1/s",
      "rpm      2 radian / min",
      "zero     0 m",
    ].join("\n"),
  );
  assert.ok(
    definitions.ok,
    `expected the text to parse, got ${inspect(definitions)}`,
  );
  const built = buildTable(definitions.value, DEFAULT_PRECISION);
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
  assert.equal(
    textMessage("3 ×"),
    'Unexpected "×": expected "^", a unit name, "(", "*", "/" or end of input.',
  );
  assert.equal(
    textMessage("m /"),
    'Unexpected end of input: expected a number, a unit name or "(".',
  );
  assert.equal(
    textMessage(""),
    'Unexpected end of input: expected a number, a unit name or "(".',
  );
  // The character shown is a whole code point, not a surrogate half.
  assert.equal(
    textMessage("3 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/" or end of input.',
  );
});

test("a rejected literal is quoted with the reason", () => {
  assert.equal(
    textMessage("1e999999999 m"),
    '"1e999999999": this number is too large to represent.',
  );
  assert.equal(textMessage("m^(1/0)"), '"1/0": the exponent divides by zero.');
});

test("an unknown unit is named", () => {
  assert.equal(textMessage("3 bogus"), 'Unknown unit "bogus".');
});

test("an evaluation error quotes the text at fault", () => {
  assert.equal(textMessage("m / 0"), 'Division by zero in "0".');
  assert.equal(textMessage("0^-1"), 'Division by zero in "0^-1".');
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

test("an input error is described against the text of its side", () => {
  assert.equal(conversionMessage("3 bogus", "in"), 'Unknown unit "bogus".');
  assert.equal(
    conversionMessage("3 ft", "in /"),
    'Unexpected end of input: expected a number, a unit name or "(".',
  );
});

test("a dimension mismatch shows both dimensions", () => {
  assert.equal(
    conversionMessage(" 3 ft ", "min"),
    '"3 ft" has dimension m, but "min" has dimension s.',
  );
  assert.equal(
    conversionMessage("3", "ft"),
    '"3" has dimension 1, but "ft" has dimension m.',
  );
});

test("a kind mismatch names the kinds that differ", () => {
  assert.equal(
    conversionMessage("1 rpm", "Hz"),
    '"1 rpm" (radian / s) and "Hz" (1 / s) differ in kind: radian.',
  );
});

test("a zero want is reported as such", () => {
  assert.equal(
    conversionMessage("3 ft", "zero"),
    '"zero" is zero, so nothing is a multiple of it.',
  );
});
