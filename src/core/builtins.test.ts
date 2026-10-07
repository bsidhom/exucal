import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./build.ts";
import { BUILTINS } from "./builtins.ts";
import { exp } from "./builtins/exp.ts";
import { pi } from "./builtins/pi.ts";
import { DEFAULT_CEILING, DEFAULT_ROUNDING } from "./context.ts";
import { parseDefinitions } from "./definitions.ts";
import { show } from "./display.ts";
import { evaluateText } from "./pipeline.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS } from "./rational.ts";

test("the app's built-ins are gathered by name, each from its module", () => {
  assert.deepEqual(
    [...BUILTINS.keys()],
    [
      "pi",
      "exp",
      "ln",
      "log10",
      "log2",
      "log",
      "sqrt",
      "cbrt",
      "pow",
      "sin",
      "cos",
      "tan",
      "asin",
      "acos",
      "atan",
      "atan2",
      "sinh",
      "cosh",
      "tanh",
      "asinh",
      "acosh",
      "atanh",
      "approx",
      "abs",
      "sign",
      "floor",
      "ceil",
      "trunc",
      "round",
      "div",
      "mod",
      "gcd",
      "lcm",
      "factorial",
      "binomial",
      "doublefactorial",
      "digamma",
      "lgamma",
      "gamma",
      "beta",
      "lowergamma",
      "uppergamma",
      "lowergammareg",
      "uppergammareg",
      "erf",
      "erfc",
      "incbeta",
      "incbetareg",
    ],
  );
  assert.equal(BUILTINS.get("exp"), exp);
  assert.equal(BUILTINS.get("pi"), pi);
  for (const [name, fn] of BUILTINS) assert.equal(fn.name, name);
});

test("at a raised significand limit the built-ins near the edges of what the kernel is handed are values, where their conversion threw", () => {
  // Issue #56: at the significand limit 1,048,576 the branch for a tiny argument
  // leaves `1e-315000` to the kernel, and the literal check admits a
  // significand the hard bound could not form; `fixedFromScaled` forms it
  // within four times the hard bound (H.2).
  const parsed = parseDefinitions("m  !\nradian  !kind");
  assert.ok(parsed.ok);
  const context = {
    precision: 8,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: MAX_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  };
  const table = buildTable(parsed.value, {
    ...context,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  const ones = `0.${"1".repeat(200_000)}`;
  for (const [text, digits] of [
    ["sinh(1e-315000)", "1e-315000"],
    ["cosh(1e-315000)", "1"],
    ["tanh(1e-315000)", "1e-315000"],
    ["atan(1e-315000)", "1e-315000"],
    ["exp(1e-315000)", "1"],
    ["sin(1e-315000 radian)", "1e-315000"],
    ["cos(1e-315000 radian)", "1"],
    [`sinh(${ones})`, "0.11133988"],
    ["sin(1e315000 radian)", "0.93186736"],
  ]) {
    const result = evaluateText(table.value, text!, context);
    const label = text!.length > 40 ? `${text!.slice(0, 40)}…` : text!;
    assert.ok(result.ok, `${label}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, { digits: 8, rounding: DEFAULT_ROUNDING }),
      { kind: "certified", text: digits },
      label,
    );
  }
});
