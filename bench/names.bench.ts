import assert from "node:assert/strict";
import { test } from "node:test";
import { findAmbiguity } from "../src/core/names.ts";
import { random } from "../src/testing/random.ts";
import { bestOf, millis } from "./harness.ts";
import { syntheticPrefixes, syntheticUnits } from "./synthetic.ts";

/** Runs the check on a table of the given size and reports the timing. */
function timeCheck(
  report: (message: string) => void,
  prefixCount: number,
  unitCount: number,
): number {
  const prefixes = syntheticPrefixes(random(1), prefixCount);
  const units = syntheticUnits(random(2), unitCount);
  const ms = bestOf(20, () => {
    assert.equal(findAmbiguity(prefixes, units), undefined);
  });
  report(`${prefixCount} prefixes, ${unitCount} units: ${millis(ms)}`);
  return ms;
}

test("the ambiguity check does not grow with the number of prefixes", (t) => {
  // Without the index over the unit names, the check tried every unit for
  // every pair of prefixes where one extends the other, and grew some
  // thirtyfold over this range.
  const few = timeCheck((m) => t.diagnostic(m), 76, 3000);
  const many = timeCheck((m) => t.diagnostic(m), 1076, 3000);
  assert.ok(
    many <= 5 * few,
    `expected the check with 1076 prefixes (${millis(many)}) to cost at most five times that with 76 (${millis(few)})`,
  );
});

test("the ambiguity check grows no faster than the number of units, near enough", (t) => {
  // The index is a sort, so a little faster than linear is expected.
  const few = timeCheck((m) => t.diagnostic(m), 76, 3000);
  const many = timeCheck((m) => t.diagnostic(m), 76, 12000);
  assert.ok(
    many <= 8 * few,
    `expected the check with 12000 units (${millis(many)}) to cost at most eight times that with 3000 (${millis(few)})`,
  );
});
