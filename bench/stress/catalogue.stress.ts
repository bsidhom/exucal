// The stress suite (docs/calculator-plan.md, task 8.3): every case of the
// catalogue, measured again. Run by `pnpm stress`, by hand, when stress
// testing: before and after a change aimed at one of its cases, after a
// change to a kernel, and when the interface's work (#118) wants a fresh
// target. Neither `pnpm test` nor `pnpm bench` discovers a `*.stress.ts`
// file, so `pnpm test:all` never runs it: it runs for minutes.
//
// Each case is measured with the harness, cold and warm, under a deadline
// of four times the time the catalogue recorded for it, and at least two
// minutes. The cases run in parallel, one per core (`STRESS_JOBS` to
// change it), as the search measured them, so that the timings are the
// catalogue's kind. `STRESS_SHARD=k/n` runs only the entries `i` with
// `i % n === k`, to share the suite among processes or machines, and
// node's `--test-name-pattern` selects by name, which starts with the
// settings profile: `pnpm stress --test-name-pattern='^default'`. The
// suite asserts only what holds on any machine:
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
import { availableParallelism } from "node:os";
import { describe, test } from "node:test";
import { inspect } from "node:util";
import { perCall, readCatalogue, type Entry } from "./catalogue.ts";
import {
  caseOf,
  machine,
  measure,
  type OutcomeSummary,
  type Run,
} from "./harness.ts";
import { inShard, parseShard } from "./journal.ts";

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

/** The shard of the entries to run, from `STRESS_SHARD`, or all of them. */
const shard = (() => {
  const text = process.env["STRESS_SHARD"];
  if (text === undefined || text === "") return undefined;
  const parsed = parseShard(text);
  if (parsed === undefined) {
    throw new Error(`STRESS_SHARD takes k/n with k below n: ${text}`);
  }
  return parsed;
})();

/** How many cases run at once, from `STRESS_JOBS`, one per core by default. */
const jobs = (() => {
  const text = process.env["STRESS_JOBS"];
  if (text === undefined || text === "") return availableParallelism();
  const n = Number(text);
  if (!(Number.isInteger(n) && n >= 1)) {
    throw new Error(`STRESS_JOBS takes a positive whole number: ${text}`);
  }
  return n;
})();

let referenceMs: number | undefined;

test("the reference case", async (t) => {
  const measured = await measure(REFERENCE, 120_000);
  assert.ok(measured.status === "done", inspect(measured));
  referenceMs = measured.warm.ms;
  const m = machine();
  t.diagnostic(
    `${m.cpu}, ${m.cores} cores, Node ${m.node}; ${jobs} cases at a time${shard === undefined ? "" : `, shard ${shard.index}/${shard.count}`}`,
  );
  t.diagnostic(
    `${REFERENCE.have}: warm ${seconds(measured.warm.ms)}, alone, the unit of the ratios below`,
  );
});

describe("the catalogue", { concurrency: jobs }, () => {
  for (const [i, entry] of catalogue.entries.entries()) {
    if (!inShard(i, shard)) continue;
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
});

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
