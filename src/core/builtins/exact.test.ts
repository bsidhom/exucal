// The exact functions (devdocs/builtins.md, "The exact functions") through
// the pipeline, over the system
// definitions: the lines and the messages, in every rounding mode and in
// decimal mode. Each module under builtins/ has its own tests beside it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import { ROUNDING_MODES, type RoundingMode } from "../rounding.ts";
import { describeTextError } from "../../messages.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

function at(rounding: RoundingMode): NumberContext {
  return { ...CONTEXT, rounding };
}

const text = readFileSync(new URL("../../units.txt", import.meta.url), "utf8");

const table = (() => {
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, inspect(parsed));
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, inspect(built));
  return built.value;
})();

/** `source` through the pipeline at eight digits: the shown text, or the message. */
function run(source: string, context: NumberContext = CONTEXT): string {
  const result = evaluateText(table, source, context);
  if (!result.ok)
    return describeTextError(result.error, source, table.primitives, "exact");
  const shown = show(result.value.magnitude, {
    digits: 8,
    rounding: context.rounding,
  });
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}`;
}

test("the exact functions through the pipeline, with their messages", () => {
  assert.equal(run("floor(3.7)"), "= 3");
  assert.equal(run("floor(sqrt(2))"), "= 1");
  // The default rounding is half even (devdocs/settings.md, "The model").
  assert.equal(run("round(2.5)"), "= 2");
  assert.equal(run("round(2.5)", at("halfAwayFromZero")), "= 3");
  assert.equal(run("round(3.5)"), "= 4");
  assert.equal(run("round(3.14159, 2)"), "= 3.14");
  assert.equal(run("round(1234, -2)"), "= 1200");
  assert.equal(run("mod(-7, 2)"), "= 1");
  assert.equal(run("mod(7, -2)"), "= -1");
  assert.equal(run("div(-7, 2)"), "= -4");
  assert.equal(run("div(7 ft, 2 ft)"), "= 3");
  assert.equal(run("gcd(-6, 4)"), "= 2");
  assert.equal(run("gcd(5, 0)"), "= 5");
  assert.equal(run("factorial(5)"), "= 120");
  assert.equal(run("binomial(5, 7)"), "= 0");
  assert.equal(run("doublefactorial(-1)"), "= 1");
  assert.equal(run("abs(-3 m) / m"), "= 3");
  assert.equal(run("sign(-2.5 m)"), "= -1");
  // The messages.
  assert.equal(
    run("floor(3.7 ft)"),
    'Cannot apply "floor" to "3.7 ft": "3.7 ft" has dimension m, but the argument of "floor" must be a plain number.',
  );
  assert.equal(
    run("gcd(2.5, 1)"),
    'Cannot compute "gcd(2.5, 1)": "2.5" is not a whole number, and "gcd" is defined only for whole numbers.',
  );
  assert.equal(
    run("factorial(approx(5))"),
    'Cannot compute "factorial(approx(5))": "approx(5)" is not known exactly, and "factorial" needs a whole number known exactly; "gamma" takes any value, with gamma(x + 1) for factorial(x).',
  );
  assert.equal(
    run("factorial(-1)"),
    'Cannot compute "factorial(-1)": "-1" is negative, and "factorial" is defined only from 0 up.',
  );
  assert.equal(
    run("doublefactorial(-2)"),
    'Cannot compute "doublefactorial(-2)": "-2" is below -1, and "doublefactorial" is defined only from -1 up.',
  );
  assert.equal(
    run("factorial(20000)"),
    '"factorial(20000)" would need a significand of about 256,909 bits, past the significand limit, however it is computed.',
  );
  assert.equal(
    run("floor(sqrt(2)^2)"),
    '"sqrt(2)^2" cannot be told from 2 at this precision, and the result depends on which side of 2 it lies.',
  );
  assert.equal(
    run("round(2.5 + sqrt(2) - sqrt(2))"),
    '"2.5 + sqrt(2) - sqrt(2)" cannot be told from 2.5 at this precision, and the result depends on which side of 2.5 it lies.',
  );
  assert.equal(
    run("mod(7 ft, 2 s)"),
    'Cannot apply "mod" to "7 ft" and "2 s": "7 ft" has dimension m, but "2 s" has dimension s.',
  );
  assert.equal(run("mod(1, 0)"), 'Division by zero in "mod(1, 0)".');
  // The identity, through the arithmetic.
  for (const [a, b] of [
    ["7", "2"],
    ["-7", "2"],
    ["7", "-2"],
    ["-7.5", "2"],
    ["1/3", "-0.25"],
  ]) {
    assert.equal(
      run(`(${b}) * div(${a}, ${b}) + mod(${a}, ${b}) - (${a})`),
      "= 0",
    );
  }
});

test("the exact functions take every rounding mode in stride, and decimal mode", () => {
  for (const mode of ROUNDING_MODES) {
    assert.equal(run("floor(-3.7)", at(mode)), "= -4");
    assert.equal(run("mod(-7, 2)", at(mode)), "= 1");
  }
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  // In decimal mode the exact value is rounded once and is exact
  // (devdocs/numbers.md, "Decimal mode").
  assert.equal(run("factorial(20)", decimal), "= 2.432902e+18");
  assert.equal(run("floor(3.7)", decimal), "= 3");
  assert.equal(run("round(2.5)", { ...decimal, rounding: "halfEven" }), "= 2");
});
