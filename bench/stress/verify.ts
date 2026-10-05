// The stress suite (docs/calculator-plan.md, task 8.3), run by hand:
//
//   pnpm stress [<function> ...] [--profile <name>] [--skip-hangs]
//               [--jobs <n>]
//
// The catalogue's cases (bench/stress/catalogue.json) that call the
// functions named, or every case when none is named, measured again:
// before and after a change aimed at those functions, after a change to
// a kernel, and when the interface's work (#118) wants a fresh target.
// `--profile` keeps the cases of one settings profile. Neither `pnpm test`
// nor `pnpm bench` runs it, so `pnpm test:all` never does.
//
// Each case is measured cold and warm in a worker of its own: the entries
// first, the cheapest first by their catalogued time so that results come
// early, then the hangs, unless `--skip-hangs`. Lanes, one per core
// (`--jobs`), take the next as they come free (pool.ts), as the search
// measured them, so that the timings are the catalogue's kind, and each
// result is printed as it comes. Stopped, it has printed what it checked.
//
// `--record` writes back what it measured, after a change has made the
// cases cheaper, say: an entry that passed takes its new timings and is
// typed out again (no margin applies, as it is the case's own cost), a
// hang its new progress and estimate, and a hang that now finishes
// becomes its family's entry. Entries that have become cheap stay: they
// guard against the cost coming back, their value is still checked, and
// a costlier case of their family found later replaces them. A changed
// value or a passed deadline is never recorded.

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
// than catalogued, and for each hang how far it got and its estimated
// cost, or that it now finishes.

import { availableParallelism } from "node:os";
import { parseArgs } from "node:util";
import { costlyCalls } from "./cases.ts";
import {
  hangEstimate,
  perCall,
  readCatalogue,
  summarizeTyping,
  withEntryAgain,
  withHangAgain,
  withHit,
  withTyping,
  type Commit,
  type Entry,
  type Hang,
} from "./catalogue.ts";
import {
  caseOf,
  estimateMs,
  machine,
  typeOut,
  type Case,
  type Measurement,
  type OutcomeSummary,
} from "./harness.ts";
import { runPool } from "./pool.ts";
import {
  CATALOGUE,
  currentCommit,
  measureCase,
  update,
  type Outcome,
} from "./tooling.ts";

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
        line: `  ${name}: now finishes, warm ${seconds(m.warm.ms)} (catalogued as ${was})`,
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

/**
 * Records in the catalogue what measuring `unit` again found, for
 * `--record`, through the search's locked, atomic `update`: an entry its
 * new timings, then its typing again; a hang still past its deadline its
 * new progress and estimate; a hang that now finishes leaves the hangs,
 * and becomes its family's entry as a hit of the search would. Called
 * only for a unit that passed: a changed value is never recorded.
 */
async function record(
  unit: Unit,
  m: Measurement,
  commit: Commit,
  deadlineMs: number,
): Promise<void> {
  const date = new Date().toISOString();
  const c = caseOfUnit(unit);
  let typed: Entry | undefined;
  if (unit.kind === "entry") {
    if (m.status !== "done") return;
    const { typing: _stale, ...rest } = unit.entry;
    typed = {
      ...rest,
      commit,
      date,
      machine: m.machine,
      cold: m.cold,
      warm: m.warm,
    };
    const fresh = typed;
    await update((catalogue) => withEntryAgain(catalogue, fresh));
  } else if (m.status === "deadline") {
    const hang: Hang = {
      ...unit.hang,
      commit,
      date,
      machine: m.machine,
      reason: {
        kind: "deadline",
        deadlineMs: m.deadlineMs,
        running: m.running ?? null,
        progress: m.progress,
        estimateMs: Math.round(estimateMs(m)),
      },
    };
    await update((catalogue) => withHangAgain(catalogue, c, hang));
    return;
  } else {
    const { hang } = unit;
    typed = {
      family: hang.family,
      ...c,
      calls: Math.max(1, costlyCalls(hang.have).count),
      source: hang.source,
      commit,
      date,
      machine: m.machine,
      cold: m.cold,
      warm: m.warm,
    };
    const entry = typed;
    await update(
      (catalogue) =>
        withHit(withHangAgain(catalogue, c, undefined), { entry }).catalogue,
    );
  }
  try {
    const typing = await typeOut(c, 2 * deadlineMs);
    await update((catalogue) =>
      withTyping(catalogue, c, summarizeTyping(typing)),
    );
  } catch {
    // The timings are recorded; the typing stays unrecorded.
  }
}

/** Whether `functions`, the names asked for, select a family that calls `called`; no names select every family. */
export function selects(
  functions: readonly string[],
  called: readonly string[],
): boolean {
  return functions.length === 0 || called.some((f) => functions.includes(f));
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        profile: { type: "string" },
        record: { type: "boolean", default: false },
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
  const functions = parsed.positionals;
  if (options.help) {
    console.log(
      "usage: pnpm stress [<function> ...] [--profile <name>] [--skip-hangs] [--record] [--jobs <n>]",
    );
    return;
  }
  const jobs =
    options.jobs === undefined ? availableParallelism() : Number(options.jobs);
  if (!(Number.isInteger(jobs) && jobs >= 1)) {
    console.error(`--jobs takes a positive whole number: ${options.jobs}`);
    process.exit(2);
  }

  const catalogue = readCatalogue(CATALOGUE);
  const chosen = (x: Entry | Hang) =>
    selects(functions, x.family.functions) &&
    (options.profile === undefined || x.family.profile === options.profile);
  const entries = catalogue.entries
    .filter(chosen)
    .sort((a, b) => a.cold.ms + a.warm.ms - (b.cold.ms + b.warm.ms));
  const hangs = options["skip-hangs"] ? [] : catalogue.hangs.filter(chosen);
  const units: Unit[] = [
    ...entries.map((entry): Unit => ({ kind: "entry", entry })),
    ...hangs.map((hang): Unit => ({ kind: "hang", hang })),
  ];
  if (units.length === 0) {
    console.error(
      `no catalogued case calls ${functions.join(", ") || "anything"}${options.profile === undefined ? "" : ` under ${options.profile}`}`,
    );
    process.exit(2);
  }
  // What the catalogue's own timings say the run will take, for the
  // person waiting on it.
  const expectedMs =
    (entries.reduce((sum, e) => sum + e.cold.ms + e.warm.ms, 0) +
      hangs.reduce(
        (sum, h) => sum + deadlineOf({ kind: "hang", hang: h }),
        0,
      )) /
    jobs;
  const m = machine();
  console.log(
    `${m.cpu}, ${m.cores} cores, Node ${m.node}; ${jobs} lanes; ${entries.length} entries and ${hangs.length} hangs, about ${Math.ceil(expectedMs / 60_000)} minute${Math.ceil(expectedMs / 60_000) === 1 ? "" : "s"}`,
  );

  // The reference, alone, before the lanes start.
  const reference = await measureCase(REFERENCE, 120_000);
  const referenceMs =
    "measured" in reference && reference.measured.status === "done"
      ? reference.measured.warm.ms
      : undefined;
  console.log(
    referenceMs === undefined
      ? `${REFERENCE.have}: did not finish; no ratios`
      : `${REFERENCE.have}: warm ${referenceMs.toFixed(1)} ms, the unit of the ratios`,
  );

  const commit = options.record ? currentCommit() : undefined;
  const verdicts: Verdict[] = [];
  let i = 0;
  await runPool<Unit>({
    jobs,
    next: () => units[i++],
    run: async (unit) => {
      const outcome = await measureCase(caseOfUnit(unit), deadlineOf(unit));
      const v = verdict(unit, outcome, referenceMs);
      verdicts.push(v);
      console.log(`[${verdicts.length}/${units.length}] ${v.line}`);
      if (commit !== undefined && !v.failed && "measured" in outcome) {
        await record(unit, outcome.measured, commit, deadlineOf(unit));
      }
    },
  });
  const failed = verdicts.filter((v) => v.failed);
  console.log(
    `\n${units.length} checked: ${failed.length} failed, ${units.length - failed.length} passed or reported`,
  );
  for (const v of failed) console.log(v.line);
  process.exitCode = failed.length > 0 ? 1 : 0;
}

await main();
