import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  ceilingFor,
  type NumberContext,
} from "./core/context.ts";
import { parseDefinitions, type Definition } from "./core/definitions.ts";
import { buildSystemTable } from "./system-build.ts";

const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");

function parsed(): readonly Definition[] {
  const result = parseDefinitions(text);
  assert.ok(result.ok, `expected the file to parse, got ${inspect(result)}`);
  return result.value;
}

/** The user's context at `digits` under a cap of `maxDigits`. */
function context(digits: number, maxDigits: number): NumberContext {
  return {
    precision: digits,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: ceilingFor(maxDigits),
  };
}

test("the table is built at the ceiling, once per ceiling, and again for another", () => {
  const definitions = parsed();
  const first = buildSystemTable(definitions, context(8, 1000));
  assert.ok(first.ok, inspect(first));
  // The digits do not rebuild: same definitions, same ceiling, same table.
  assert.equal(buildSystemTable(definitions, context(50, 1000)), first);
  assert.equal(
    buildSystemTable(definitions, { ...context(8, 1000), rounding: "floor" }),
    first,
  );
  // Another ceiling rebuilds and replaces the table held.
  const lower = buildSystemTable(definitions, context(8, 200));
  assert.ok(lower.ok);
  assert.notEqual(lower, first);
  assert.equal(buildSystemTable(definitions, context(8, 200)), lower);
  // Back at the first ceiling, one table is held, so it is built again.
  const again = buildSystemTable(definitions, context(8, 1000));
  assert.ok(again.ok);
  assert.notEqual(again, first);
  assert.equal(again.value.units.size, first.value.units.size);
  // Other definitions are another table.
  assert.notEqual(buildSystemTable(parsed(), context(8, 1000)), again);
  assert.equal(DEFAULT_CEILING, ceilingFor(1000));
});
