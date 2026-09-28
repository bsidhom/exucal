import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILTINS } from "./builtins.ts";
import { pi } from "./builtins/pi.ts";

test("the app's built-ins are gathered by name, each from its module", () => {
  assert.deepEqual([...BUILTINS.keys()], ["pi"]);
  assert.equal(BUILTINS.get("pi"), pi);
  for (const [name, fn] of BUILTINS) assert.equal(fn.name, name);
});
