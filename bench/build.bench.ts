import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "../src/core/build.ts";
import { parseDefinitions, type Definition } from "../src/core/definitions.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
} from "../src/core/context.ts";
import { DEFAULT_PRECISION } from "../src/core/rounding.ts";
import { key } from "../src/testing/random.ts";
import { bestOf, millis } from "./harness.ts";
import { syntheticDefinitions, syntheticFunctions } from "./synthetic.ts";

type Timings = { readonly parse: number; readonly build: number };

/** Parses and builds a synthetic file of the given size and reports both timings. */
function timePipeline(
  report: (message: string) => void,
  prefixCount: number,
  unitCount: number,
): Timings {
  const text = syntheticDefinitions(key(3), prefixCount, unitCount);
  let definitions: readonly Definition[] = [];
  const parse = bestOf(5, () => {
    const result = parseDefinitions(text);
    assert.ok(result.ok, `expected the text to parse, got ${inspect(result)}`);
    definitions = result.value;
  });
  const build = bestOf(5, () => {
    const result = buildTable(definitions, {
      precision: DEFAULT_PRECISION,
      rounding: DEFAULT_ROUNDING,
      significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
      ceiling: DEFAULT_CEILING,
    });
    assert.ok(result.ok, `expected a table, got ${inspect(result)}`);
  });
  const count = definitions.length;
  report(
    `${prefixCount} prefixes, ${unitCount} units: parse ${millis(parse)} (${((parse * 1000) / count).toFixed(1)} µs per definition), build ${millis(build)} (${((build * 1000) / count).toFixed(1)} µs per definition)`,
  );
  return { parse, build };
}

test("parsing and building grow linearly with the number of definitions", (t) => {
  // Each definition is parsed once and, thanks to memoization, evaluated
  // once, so four times the definitions should cost about four times as
  // much; a walk that re-evaluated its dependencies would show as more.
  const small = timePipeline((m) => t.diagnostic(m), 76, 1500);
  const large = timePipeline((m) => t.diagnostic(m), 76, 6000);
  assert.ok(
    large.parse <= 8 * small.parse,
    `expected parsing 6000 units (${millis(large.parse)}) to cost at most eight times parsing 1500 (${millis(small.parse)})`,
  );
  assert.ok(
    large.build <= 8 * small.build,
    `expected building 6000 units (${millis(large.build)}) to cost at most eight times building 1500 (${millis(small.build)})`,
  );
});

test("a file the size of the GNU units database is built in one go", (t) => {
  // About the size of GNU units' definitions file: a reference point for
  // the startup cost, since the app builds its table once, at startup.
  timePipeline((m) => t.diagnostic(m), 76, 3000);
});

test("functions and their inverses parse and build linearly with their number", (t) => {
  // Each function line is parsed once, each function checked once however
  // many call it, and each inverse checked once against its function, so
  // four times the functions should cost about four times as much.
  const time = (count: number): Timings => {
    const text = syntheticFunctions(key(5), count);
    let definitions: readonly Definition[] = [];
    const parse = bestOf(5, () => {
      const result = parseDefinitions(text);
      assert.ok(
        result.ok,
        `expected the text to parse, got ${inspect(result)}`,
      );
      definitions = result.value;
    });
    const build = bestOf(5, () => {
      const result = buildTable(definitions, {
        precision: DEFAULT_PRECISION,
        rounding: DEFAULT_ROUNDING,
        significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
        ceiling: DEFAULT_CEILING,
      });
      assert.ok(result.ok, `expected a table, got ${inspect(result)}`);
    });
    t.diagnostic(
      `${count} functions with inverses: parse ${millis(parse)}, build ${millis(build)}`,
    );
    return { parse, build };
  };
  const small = time(500);
  const large = time(2000);
  assert.ok(
    large.parse <= 8 * small.parse,
    `expected parsing 2000 functions (${millis(large.parse)}) to cost at most eight times parsing 500 (${millis(small.parse)})`,
  );
  assert.ok(
    large.build <= 8 * small.build,
    `expected building 2000 functions (${millis(large.build)}) to cost at most eight times building 500 (${millis(small.build)})`,
  );
});
