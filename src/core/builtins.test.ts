import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILTINS } from "./builtins.ts";
import { exp } from "./builtins/exp.ts";
import { pi } from "./builtins/pi.ts";

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
    ],
  );
  assert.equal(BUILTINS.get("exp"), exp);
  assert.equal(BUILTINS.get("pi"), pi);
  for (const [name, fn] of BUILTINS) assert.equal(fn.name, name);
});
