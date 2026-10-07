import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  ceilingFor,
  type NumberContext,
} from "./core/context.ts";
import { parseDefinitions, type Definition } from "./core/definitions.ts";
import { err, ok } from "./core/result.ts";
import { buildSystemTable, tableOf } from "./system-build.ts";

const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");

function parsed(): readonly Definition[] {
  const result = parseDefinitions(text);
  assert.ok(result.ok, `expected the file to parse, got ${inspect(result)}`);
  return result.value;
}

/** The user's context at `digits` under a precision limit of `precisionLimitDigits`. */
function context(digits: number, precisionLimitDigits: number): NumberContext {
  return {
    precision: digits,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: ceilingFor(precisionLimitDigits),
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

test("tableOf is loading without definitions, failed with a failed load or build, else ready", () => {
  const at = context(8, 1000);
  assert.deepEqual(tableOf(undefined, at), { kind: "loading" });
  const failure = { kind: "fetchFailed", reason: "offline" };
  assert.deepEqual(tableOf(err(failure), at), {
    kind: "failed",
    error: failure,
  });
  const definitions = parsed();
  const ready = tableOf(ok(definitions), at);
  assert.equal(ready.kind, "ready");
  assert.ok(ready.kind === "ready");
  // The table is the memo's: the same object buildSystemTable gives.
  const built = buildSystemTable(definitions, at);
  assert.ok(built.ok);
  assert.equal(ready.table, built.value);
  // A build that fails is a failure too, with the build's error.
  const circular = parseDefinitions("m !\na 2 a");
  assert.ok(circular.ok, inspect(circular));
  const failed = tableOf(ok(circular.value), at);
  assert.ok(failed.kind === "failed", inspect(failed));
  assert.equal(failed.error.kind, "circularDefinition");
});
