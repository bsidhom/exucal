// The stress suite (docs/calculator-plan.md, task 8.3), run by hand:
//
//   pnpm stress [--jobs <n>] [--skip-hangs]
//
// Every case of the catalogue (bench/stress/catalogue.json), measured
// again: before and after a change aimed at one of its cases, after a
// change to a kernel, and when the interface's work (#118) wants a fresh
// target. Neither `pnpm test` nor `pnpm bench` runs it, so `pnpm test:all`
// never does: it runs for minutes.
//
// Each catalogued case is a unit, measured cold and warm in a worker of
// its own: the entries first, the cheapest first by their catalogued
// time so that results come early and the longest units end the run, then
// the hangs, unless `--skip-hangs`. Lanes, one per core (`--jobs`), pull the
// next as they come free (pool.ts), as the search measured them, so that
// the timings are the catalogue's kind, and each result is printed and
// journaled as it comes (journal.ts), under bench/stress/runs/stress-<key>/
// for a key of the code and the catalogue (`treeKey`): run again on the
// same code and catalogue, the suite carries on where it stopped, and
// after a change to either it starts afresh. A commit that changes
// neither, such as a snapshot of a run, keeps the key.
//
// It fails only on what holds on any machine:
//
// - **An entry gives another outcome than catalogued:** another kind,
//   value or warnings, so that an optimization that changes a value
//   fails. The note after the value is left out, since a kernel made
//   sharper tightens the bound it states without changing the value
//   (`≈ 0`, "within 2e-4049 of zero").
// - **An entry passes its deadline,** four times the time catalogued for
//   it and two minutes at least.
//
// The rest is reported: the timings beside the catalogue's, each entry's
// warm cost as a multiple of a reference case measured first (which
// compares across machines as a timing does not), an entry much cheaper
// than catalogued, which the search will replace when it measures its
// family again, and for each hang how far it got and its estimated cost,
// or that it now finishes, which a search will catalogue.

import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  hangEstimate,
  perCall,
  readCatalogue,
  type Entry,
  type Hang,
} from "./catalogue.ts";
import {
  caseOf,
  estimateMs,
  machine,
  type Case,
  type OutcomeSummary,
} from "./harness.ts";
import {
  append,
  caseKey,
  lock,
  readJournal,
  repair,
  type CheckRecord,
  type Outcome,
} from "./journal.ts";
import { runPool } from "./pool.ts";
import { CATALOGUE, RUNS, measureCase, treeKey } from "./tooling.ts";

/** The reference: an elementary cancellation that runs to the ceiling in milliseconds. */
const REFERENCE = caseOf("exp(1) - exp(1)");

/** An entry much cheaper than this fraction of its catalogued cost is reported. */
const MUCH_CHEAPER = 0.5;

/** A catalogued case to measure again. */
type Unit =
  | { readonly kind: "entry"; readonly entry: Entry }
  | { readonly kind: "hang"; readonly hang: Hang };

/** What checking a unit found: whether it fails the suite, and its line. */
type Verdict = { readonly failed: boolean; readonly line: string };

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}

/** The case of a catalogued entry or hang. */
function caseOfUnit(unit: Unit): Case {
  const { have, want, settings } =
    unit.kind === "entry" ? unit.entry : unit.hang;
  return { have, want, settings };
}

/** The deadline of a unit: an entry's four times its catalogued time and two minutes at least, a hang's its own. */
function deadlineOf(unit: Unit): number {
  if (unit.kind === "entry") {
    return Math.max(120_000, 4 * (unit.entry.cold.ms + unit.entry.warm.ms));
  }
  return unit.hang.reason.kind === "deadline"
    ? unit.hang.reason.deadlineMs
    : 120_000;
}

/**
 * What of an outcome must not change: its kind, its warnings, and its
 * first line without the note after the value, which states a bound or
 * the digits certified and may sharpen.
 */
export function comparable(outcome: OutcomeSummary): OutcomeSummary {
  if (outcome.kind !== "result") return outcome;
  const line = outcome.line.replace(
    / \((?:within [^()]*|\d+ of \d+ digits are certain|the digits are not certified)\)$/,
    "",
  );
  return { ...outcome, line };
}

/** What measuring `unit` again found, against a reference warm time. */
function verdict(
  unit: Unit,
  outcome: Outcome,
  referenceMs: number | undefined,
): Verdict {
  if (unit.kind === "hang") {
    const { hang } = unit;
    const name = `hang ${hang.family.profile}: ${hang.have}`;
    const was =
      hangEstimate(hang) === Infinity
        ? "a failed worker"
        : `≈ ${seconds(hangEstimate(hang))} warm`;
    if ("failed" in outcome) {
      return {
        failed: false,
        line: `  ${name}: worker failed: ${outcome.failed}`,
      };
    }
    const m = outcome.measured;
    if (m.status === "done") {
      return {
        failed: false,
        line: `  ${name}: now finishes, warm ${seconds(m.warm.ms)} (catalogued as ${was}): the next search of its seed catalogues it`,
      };
    }
    const at =
      m.running === undefined
        ? "before its first pass"
        : `${m.running.run} pass ${m.running.pass + 1} of ${m.progress.schedule.length}`;
    return {
      failed: false,
      line: `  ${name}: still past ${seconds(m.deadlineMs)}, in ${at}, ≈ ${seconds(estimateMs(m))} warm (catalogued as ${was})${hang.issue === undefined ? "" : `, #${hang.issue}`}`,
    };
  }
  const { entry } = unit;
  const name = `${entry.family.profile}: ${entry.have}${entry.want === "" ? "" : ` into ${entry.want}`}`;
  if ("failed" in outcome) {
    return {
      failed: true,
      line: `✖ ${name}: worker failed: ${outcome.failed}`,
    };
  }
  const m = outcome.measured;
  if (m.status !== "done") {
    return {
      failed: true,
      line: `✖ ${name}: past its deadline of ${seconds(m.deadlineMs)}`,
    };
  }
  for (const [run, then] of [
    [m.cold, entry.cold],
    [m.warm, entry.warm],
  ] as const) {
    const now = comparable(run.outcome);
    const before = comparable(then.outcome);
    if (JSON.stringify(now) !== JSON.stringify(before)) {
      return {
        failed: true,
        line: `✖ ${name}: gave ${JSON.stringify(now)}, catalogued ${JSON.stringify(before)}`,
      };
    }
  }
  const ratio =
    referenceMs === undefined || referenceMs <= 0
      ? ""
      : `, ${(m.warm.ms / referenceMs).toFixed(0)} references`;
  const cheaper =
    m.warm.ms < MUCH_CHEAPER * entry.warm.ms
      ? `; much cheaper than catalogued (on ${entry.machine.cpu})`
      : "";
  return {
    failed: false,
    line: `✔ ${name}: cold ${seconds(m.cold.ms)} (catalogued ${seconds(entry.cold.ms)}), warm ${seconds(m.warm.ms)} (catalogued ${seconds(entry.warm.ms)})${ratio}; ${perCall({ warm: m.warm, calls: entry.calls }).toFixed(0)} ms a call${cheaper}`,
  };
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        jobs: { type: "string" },
        "skip-hangs": { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
  const options = parsed.values;
  if (options.help) {
    console.log("usage: pnpm stress [--jobs <n>] [--skip-hangs]");
    return;
  }
  const jobs =
    options.jobs === undefined ? availableParallelism() : Number(options.jobs);
  if (!(Number.isInteger(jobs) && jobs >= 1)) {
    console.error(`--jobs takes a positive whole number: ${options.jobs}`);
    process.exit(2);
  }

  const catalogue = readCatalogue(CATALOGUE);
  const dir = new URL(`stress-${treeKey()}/`, RUNS);
  const held = lock(dir);
  if ("heldBy" in held) {
    console.error(
      `another process is running this suite: ${held.heldBy}; if it is gone (on another machine, say), delete ${fileURLToPath(new URL("lock", dir))}`,
    );
    process.exit(2);
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      held.release();
      console.log("\nstopped; run pnpm stress again to carry on");
      process.exit(130);
    });
  }
  try {
    repair(dir);
    const checks = new Map<string, CheckRecord>();
    const journal = readJournal(dir);
    for (const record of journal.records) {
      if (record.kind === "check") checks.set(record.case, record);
    }
    const m = machine();
    console.log(`journal: ${fileURLToPath(dir)}`);
    console.log(`${m.cpu}, ${m.cores} cores, Node ${m.node}; ${jobs} lanes`);

    // The reference, alone, before the lanes start.
    let reference = checks.get(caseKey(REFERENCE));
    if (reference === undefined) {
      reference = {
        kind: "check",
        case: caseKey(REFERENCE),
        date: new Date().toISOString(),
        ...(await measureCase(REFERENCE, 120_000)),
      } as CheckRecord;
      append(dir, reference);
    }
    const referenceMs =
      "measured" in reference && reference.measured.status === "done"
        ? reference.measured.warm.ms
        : undefined;
    console.log(
      referenceMs === undefined
        ? `${REFERENCE.have}: did not finish; no ratios`
        : `${REFERENCE.have}: warm ${referenceMs.toFixed(1)} ms, the unit of the ratios`,
    );

    const units: Unit[] = [
      ...[...catalogue.entries]
        .sort((a, b) => a.cold.ms + a.warm.ms - (b.cold.ms + b.warm.ms))
        .map((entry): Unit => ({ kind: "entry", entry })),
      ...(options["skip-hangs"]
        ? []
        : catalogue.hangs.map((hang): Unit => ({ kind: "hang", hang }))),
    ];
    const verdicts: Verdict[] = [];
    const todo: Unit[] = [];
    for (const unit of units) {
      const record = checks.get(caseKey(caseOfUnit(unit)));
      if (record === undefined) todo.push(unit);
      else verdicts.push(verdict(unit, record, referenceMs));
    }
    if (verdicts.length > 0) {
      const failed = verdicts.filter((v) => v.failed);
      console.log(
        `${verdicts.length} of ${units.length} already checked on this tree, ${failed.length} failed`,
      );
      for (const v of failed) console.log(v.line);
    }
    let i = 0;
    await runPool<Unit>({
      jobs,
      next: () => todo[i++],
      run: async (unit) => {
        const c = caseOfUnit(unit);
        const outcome = await measureCase(c, deadlineOf(unit));
        const record = {
          kind: "check",
          case: caseKey(c),
          date: new Date().toISOString(),
          ...outcome,
        } as CheckRecord;
        append(dir, record);
        const v = verdict(unit, outcome, referenceMs);
        verdicts.push(v);
        console.log(`[${verdicts.length}/${units.length}] ${v.line}`);
      },
    });
    const failed = verdicts.filter((v) => v.failed).length;
    console.log(
      `\n${units.length} checked: ${failed} failed, ${verdicts.length - failed} passed or reported`,
    );
    process.exitCode = failed > 0 ? 1 : 0;
  } finally {
    held.release();
  }
}

await main();
