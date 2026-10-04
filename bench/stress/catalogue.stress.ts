// The stress suite (docs/calculator-plan.md, task 8.3): every case of the
// catalogue, measured again. Run by `pnpm stress`, by hand, when stress
// testing: before and after a change aimed at one of its cases, after a
// change to a kernel, and when the interface's work (#118) wants a fresh
// target. Neither `pnpm test` nor `pnpm bench` discovers a `*.stress.ts`
// file, so `pnpm test:all` never runs it: it runs for minutes.
//
// Each case is measured with the harness, one at a time so that the
// timings are the catalogue's kind, cold and warm, under a deadline of
// four times the time the catalogue recorded for it, and at least two
// minutes. The suite asserts only what holds on any machine:
//
// - Each case gives the outcome it was catalogued with: the same kind, the
//   same value and the same warnings, so that an optimization that changes
//   a value fails. The note after the value is left out of the comparison,
//   since a kernel made sharper tightens the bound it states without
//   changing the value (`≈ 0`, "within 2e-4049 of zero").
// - No case passes its deadline.
//
// Everything else is reported, not asserted, since it depends on the
// machine: the timings beside the catalogue's, each case's warm cost as a
// multiple of a reference case measured in the same run (which compares
// across machines as a timing does not), and a case that has become much
// cheaper than the catalogue says, so that the catalogue is measured
// again. The hangs the catalogue keeps apart are not run; each is listed,
// with the issue that tracks it.

import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { perCall, readCatalogue, type Entry } from "./catalogue.ts";
import {
  caseOf,
  machine,
  measure,
  type OutcomeSummary,
  type Run,
} from "./harness.ts";

const catalogue = readCatalogue(new URL("catalogue.json", import.meta.url));

/** The reference: an elementary cancellation that runs to the ceiling in milliseconds. */
const REFERENCE = caseOf("exp(1) - exp(1)");

/** A case much cheaper than this fraction of its catalogued cost is reported. */
const MUCH_CHEAPER = 0.5;

/** The deadline of an entry: four times what the catalogue recorded, and two minutes at least. */
function deadlineOf(entry: Entry): number {
  return Math.max(120_000, 4 * (entry.cold.ms + entry.warm.ms));
}

/**
 * What of an outcome must not change: its kind, its warnings, and its
 * first line without the note after the value, which states a bound or
 * the digits certified and may sharpen.
 */
function comparable(outcome: OutcomeSummary): OutcomeSummary {
  if (outcome.kind !== "result") return outcome;
  const line = outcome.line.replace(
    / \((?:within [^()]*|\d+ of \d+ digits are certain|the digits are not certified)\)$/,
    "",
  );
  return { ...outcome, line };
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}

let referenceMs: number | undefined;

test("the reference case", async (t) => {
  const measured = await measure(REFERENCE, 120_000);
  assert.ok(measured.status === "done", inspect(measured));
  referenceMs = measured.warm.ms;
  const m = machine();
  t.diagnostic(`${m.cpu}, ${m.cores} cores, Node ${m.node}`);
  t.diagnostic(
    `${REFERENCE.have}: warm ${seconds(measured.warm.ms)}, the unit of the ratios below`,
  );
});

for (const entry of catalogue.entries) {
  const name = `${entry.family.profile}: ${entry.have}${entry.want === "" ? "" : ` into ${entry.want}`}`;
  test(name, async (t) => {
    const deadline = deadlineOf(entry);
    const measured = await measure(
      { have: entry.have, want: entry.want, settings: entry.settings },
      deadline,
    );
    assert.ok(
      measured.status === "done",
      `past its deadline of ${seconds(deadline)}: ${inspect(measured)}`,
    );
    for (const [run, then] of [
      [measured.cold, entry.cold],
      [measured.warm, entry.warm],
    ] as const satisfies readonly (readonly [Run, Run])[]) {
      assert.deepEqual(comparable(run.outcome), comparable(then.outcome));
    }
    const ratio =
      referenceMs === undefined
        ? ""
        : `, ${(measured.warm.ms / referenceMs).toFixed(0)} references`;
    t.diagnostic(
      `cold ${seconds(measured.cold.ms)} (catalogued ${seconds(entry.cold.ms)}), warm ${seconds(measured.warm.ms)} (catalogued ${seconds(entry.warm.ms)})${ratio}; ${perCall({ warm: measured.warm, calls: entry.calls }).toFixed(0)} ms a call`,
    );
    if (measured.warm.ms < MUCH_CHEAPER * entry.warm.ms) {
      t.diagnostic(
        `much cheaper than catalogued (on ${entry.machine.cpu}): measure the catalogue again, or let the search replace the entry`,
      );
    }
  });
}

test("the hangs are skipped", (t) => {
  for (const hang of catalogue.hangs) {
    const why =
      hang.reason.kind === "deadline"
        ? `past ${seconds(hang.reason.deadlineMs)}`
        : `failed: ${hang.reason.message}`;
    const issue = hang.issue === undefined ? "no issue yet" : `#${hang.issue}`;
    t.diagnostic(
      `skipped (${issue}, ${why}): ${hang.family.profile}: ${hang.have}`,
    );
  }
});
