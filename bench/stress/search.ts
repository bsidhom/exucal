// The cost search (docs/calculator-plan.md, task 8.2), run by hand:
//
//   pnpm stress:search [--seed <hex>] [--cases <n> | --budget <minutes>]
//                      [--list] [--enumerate] [--deadline <seconds>]
//                      [--floor <ms>] [--jobs <n>] [--dry-run]
//
// It draws cases from a seed (cases.ts), or takes the fixed enumeration,
// measures them with the harness, and merges what it found into
// bench/stress/catalogue.json (catalogue.ts), regenerating the table in
// docs/cost.md when that file holds the table's markers.
//
// What is searched depends on the seed alone. A run given `--seed` uses
// it; one without draws a fresh seed from the cryptographic source first
// and prints it. `--cases n` runs the first `n` cases of the sequence;
// `--budget` stops dispatching cases after that many minutes, so a run
// still covers a prefix of the sequence, whose length it prints and logs,
// and `--cases` with that count replays it. `--list` prints the cases
// without evaluating any. Wall-clock time decides only what is kept, never
// what is searched next:
//
// 1. Every case is measured, `--jobs` at a time (one per core by default),
//    each in a worker of its own under `--deadline`. A case past its
//    deadline, or whose worker failed, is a hang, kept apart and not
//    ranked.
// 2. Of the cases whose warm cost under that load reached half the floor,
//    the costliest of each family (by warm cost per costly call) is
//    measured again on its own, since timings under load are not the
//    catalogue's, and so is the catalogue's entry for its family, if it
//    has one, so that the two compare.
// 3. The catalogue keeps a new family's case if its warm cost reaches the
//    floor, and replaces an entry by a case that costs more per call than
//    the entry measured again; everything else is left as it was.
//
// Commands run as security rules require (ARCHITECTURE.md, "Security"):
// git through `execFileSync` with an argument array, its list read
// NUL-separated.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  chooseSeed,
  describeCase,
  drawCase,
  enumerateCases,
  type Drawn,
} from "./cases.ts";
import {
  catalogueTable,
  familyKey,
  logRun,
  merge,
  mergeHangs,
  perCall,
  readCatalogue,
  withTable,
  writeCatalogue,
  type Commit,
  type Entry,
  type Hang,
  type Source,
  roundRun,
  withTyping,
} from "./catalogue.ts";
import { machine, measure, typeOut, type Measurement } from "./harness.ts";

const root = new URL("../../", import.meta.url);
const CATALOGUE = new URL("bench/stress/catalogue.json", root);
const DOC = new URL("docs/cost.md", root);

/** The most cases a seed's sequence holds: the indices `foldIn` takes. */
const MAX_CASES = 2 ** 32 - 1;

/** A case to measure, with where it came from. */
type Job = { readonly drawn: Drawn; readonly source: Source };

/** What measuring a job gave: a measurement, or the failure of its worker. */
type Result =
  | { readonly job: Job; readonly measured: Measurement }
  | { readonly job: Job; readonly failed: string };

/** Prints the usage, and exits with `code`. */
function usage(code = 2): never {
  console.log(
    "usage: pnpm stress:search [--seed <hex>] [--cases <n> | --budget <minutes>]\n" +
      "                          [--list] [--enumerate] [--deadline <seconds>]\n" +
      "                          [--floor <ms>] [--jobs <n>] [--dry-run]",
  );
  process.exit(code);
}

/** A positive number from the command line, or `fallback` when absent. */
function positive(
  text: string | undefined,
  fallback: number,
  what: string,
): number {
  if (text === undefined) return fallback;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`${what} must be a positive number: ${text}`);
    process.exit(2);
  }
  return value;
}

/** The commit the tree is at, and whether tracked files have changed. */
function currentCommit(): Commit {
  const cwd = fileURLToPath(root);
  const hash = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd,
    encoding: "utf8",
  }).trim();
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=no"],
    { cwd, encoding: "utf8" },
  );
  return { hash, dirty: status.split("\0").some((line) => line !== "") };
}

/** The cases' timings as one line of progress. */
function progress(index: number, result: Result): string {
  const { job } = result;
  const what = `${job.drawn.family.profile}  ${job.drawn.case.have}`;
  if ("failed" in result) return `[${index}] FAILED: ${result.failed}  ${what}`;
  const m = result.measured;
  if (m.status === "deadline") {
    const at =
      m.running === undefined
        ? "before its first pass"
        : `in the ${m.running.run} run's pass ${m.running.pass} (${m.running.precision} digits)`;
    return `[${index}] past the deadline ${at}  ${what}`;
  }
  const per = m.warm.ms / job.drawn.calls;
  return `[${index}] warm ${Math.round(m.warm.ms)} ms (${Math.round(per)} ms a call, ${m.warm.passes.length} passes), cold ${Math.round(m.cold.ms)} ms  ${what}`;
}

/**
 * Measures the jobs `get` gives for indices from zero, `jobs` at a time,
 * until `limit` or, past `budgetMs`, the next dispatch; the jobs
 * dispatched are a prefix of the indices, whose length is returned.
 */
async function measureAll(
  get: (index: number) => Job | undefined,
  limit: number,
  budgetMs: number | undefined,
  jobs: number,
  deadlineMs: number,
): Promise<{ results: Result[]; count: number }> {
  const results: Result[] = [];
  const start = performance.now();
  let next = 0;
  const lane = async () => {
    for (;;) {
      if (next >= limit) return;
      if (budgetMs !== undefined && performance.now() - start >= budgetMs) {
        return;
      }
      const index = next++;
      const job = get(index);
      if (job === undefined) {
        next = limit;
        return;
      }
      let result: Result;
      try {
        result = { job, measured: await measure(job.drawn.case, deadlineMs) };
      } catch (e) {
        result = { job, failed: e instanceof Error ? e.message : String(e) };
      }
      results[index] = result;
      console.log(progress(index, result));
    }
  };
  await Promise.all(Array.from({ length: jobs }, lane));
  return { results: results.filter((r) => r !== undefined), count: next };
}

/** An entry from a finished measurement of `job`. */
function entryOf(
  job: Job,
  measured: Extract<Measurement, { status: "done" }>,
  commit: Commit,
  date: string,
): Entry {
  return {
    family: job.drawn.family,
    have: job.drawn.case.have,
    want: job.drawn.case.want,
    settings: job.drawn.case.settings,
    calls: job.drawn.calls,
    source: job.source,
    commit,
    date,
    machine: measured.machine,
    cold: roundRun(measured.cold),
    warm: roundRun(measured.warm),
  };
}

/** A hang from a measurement of `job` that did not finish, or `undefined`. */
function hangOf(
  result: Result,
  commit: Commit,
  date: string,
): Hang | undefined {
  const { job } = result;
  const base = {
    family: job.drawn.family,
    have: job.drawn.case.have,
    want: job.drawn.case.want,
    settings: job.drawn.case.settings,
    source: job.source,
    commit,
    date,
  };
  if ("failed" in result) {
    return {
      ...base,
      machine: machine(),
      reason: { kind: "failed", message: result.failed },
    };
  }
  const m = result.measured;
  if (m.status !== "deadline") return undefined;
  return {
    ...base,
    machine: m.machine,
    reason: {
      kind: "deadline",
      deadlineMs: m.deadlineMs,
      running: m.running ?? null,
    },
  };
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        seed: { type: "string" },
        cases: { type: "string" },
        budget: { type: "string" },
        list: { type: "boolean", default: false },
        enumerate: { type: "boolean", default: false },
        deadline: { type: "string" },
        floor: { type: "string" },
        jobs: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    usage();
  }
  const options = parsed.values;
  if (options.help) usage(0);
  if (options.enumerate && options.seed !== undefined) {
    console.error("--enumerate takes no seed: the enumeration is fixed");
    process.exit(2);
  }
  const budgetMs =
    options.budget === undefined
      ? undefined
      : positive(options.budget, 0, "--budget") * 60_000;
  const limit = Math.min(
    MAX_CASES,
    Math.floor(
      positive(
        options.cases,
        // The enumeration runs whole, and so does a budget; a seed's
        // sequence has no end, so it runs 100 cases (20 to list).
        options.enumerate || budgetMs !== undefined
          ? MAX_CASES
          : options.list
            ? 20
            : 100,
        "--cases",
      ),
    ),
  );
  const deadlineMs = positive(options.deadline, 120, "--deadline") * 1000;
  const floorMs = positive(options.floor, 1000, "--floor");
  const jobs = Math.floor(
    positive(options.jobs, availableParallelism(), "--jobs"),
  );

  // The cases: the enumeration, or a seed's sequence.
  let get: (index: number) => Job | undefined;
  let seedText: string | undefined;
  if (options.enumerate) {
    const all = enumerateCases();
    get = (index) =>
      index < all.length
        ? { drawn: all[index]!, source: { enumeration: index } }
        : undefined;
    console.log(`the enumeration, ${all.length} cases`);
  } else {
    const seed = chooseSeed(options.seed);
    seedText = seed.text;
    get = (index) => ({
      drawn: drawCase(seed.key, index),
      source: { seed: seed.text, index },
    });
    console.log(`seed ${seed.text}${seed.fresh ? " (fresh)" : ""}`);
  }

  if (options.list) {
    for (let index = 0; index < limit; index++) {
      const job = get(index);
      if (job === undefined) break;
      console.log(describeCase(index, job.drawn));
    }
    return;
  }

  const commit = currentCommit();
  const date = new Date().toISOString();
  console.log(
    `measuring ${jobs} at a time, each under ${deadlineMs / 1000} s; floor ${floorMs} ms warm`,
  );
  const { results, count } = await measureAll(
    get,
    limit,
    budgetMs,
    jobs,
    deadlineMs,
  );

  const hangs = results
    .map((result) => hangOf(result, commit, date))
    .filter((hang): hang is Hang => hang !== undefined);

  // The costliest finished case of each family whose warm cost under load
  // reached half the floor, costliest first.
  const best = new Map<string, { job: Job; per: number }>();
  for (const result of results) {
    if ("failed" in result || result.measured.status !== "done") continue;
    const { warm } = result.measured;
    if (warm.ms < floorMs / 2) continue;
    const key = familyKey(result.job.drawn.family);
    const per = warm.ms / result.job.drawn.calls;
    const known = best.get(key);
    if (known === undefined || per > known.per)
      best.set(key, { job: result.job, per });
  }
  const candidates = [...best.values()].sort((a, b) => b.per - a.per);

  // Each candidate measured again on its own, with its family's entry.
  const catalogue = readCatalogue(CATALOGUE);
  const incumbents = new Map(
    catalogue.entries.map((entry) => [familyKey(entry.family), entry]),
  );
  const measured: Entry[] = [];
  const remeasured = new Map<string, Entry>();
  if (candidates.length > 0) {
    console.log(
      `measuring ${candidates.length} candidates again, one at a time`,
    );
  }
  for (const { job } of candidates) {
    const again = await measure(job.drawn.case, deadlineMs).catch(
      () => undefined,
    );
    if (again === undefined || again.status !== "done") continue;
    const entry = entryOf(job, again, commit, date);
    measured.push(entry);
    const key = familyKey(job.drawn.family);
    const incumbent = incumbents.get(key);
    let line = `  ${Math.round(again.warm.ms)} ms warm (${Math.round(perCall(entry))} ms a call)  ${job.drawn.case.have}`;
    if (incumbent !== undefined) {
      const old = await measure(
        {
          have: incumbent.have,
          want: incumbent.want,
          settings: incumbent.settings,
        },
        deadlineMs,
      ).catch(() => undefined);
      if (old !== undefined && old.status === "done") {
        remeasured.set(key, { ...incumbent, cold: old.cold, warm: old.warm });
        line += `; the entry for its family: ${Math.round(old.warm.ms / incumbent.calls)} ms a call`;
      }
    }
    console.log(line);
  }

  const report = merge(catalogue, measured, remeasured, floorMs);
  let updated = mergeHangs(report.catalogue, hangs);
  // Each entry that joined is typed out a keystroke at a time, the profile
  // the interface's evaluation on every keystroke is designed against.
  const joined = [
    ...report.added,
    ...report.replaced.map(([, entry]) => entry),
  ];
  if (joined.length > 0) {
    console.log(`typing out ${joined.length} entries, a keystroke at a time`);
  }
  for (const entry of joined) {
    const typing = await typeOut(
      { have: entry.have, want: entry.want, settings: entry.settings },
      2 * deadlineMs,
    ).catch(() => undefined);
    if (typing === undefined) continue;
    updated = withTyping(updated, entry, typing);
    const slowest = Math.max(0, ...typing.keystrokes.map((k) => k.ms));
    console.log(
      `  slowest keystroke ${Math.round(slowest)} ms of ${typing.keystrokes.length}${typing.complete ? "" : " (incomplete)"}  ${entry.have}`,
    );
  }
  updated = logRun(updated, {
    source: seedText === undefined ? { enumeration: true } : { seed: seedText },
    cases: count,
    commit,
    date,
    machine: machine(),
  });

  console.log("");
  console.log(
    seedText === undefined
      ? `ran ${count} cases of the enumeration`
      : `ran ${count} cases of seed ${seedText}; replay with: pnpm stress:search --seed ${seedText} --cases ${count}`,
  );
  console.log(
    `${report.added.length} added, ${report.replaced.length} replaced, ${hangs.length} hangs (${updated.hangs.length - catalogue.hangs.length} new families)`,
  );
  for (const entry of report.added) console.log(`  added: ${entry.have}`);
  for (const [old, entry] of report.replaced) {
    console.log(`  replaced: ${old.have}\n        by: ${entry.have}`);
  }
  if (options["dry-run"]) {
    console.log("dry run: the catalogue is not written");
    return;
  }
  writeCatalogue(CATALOGUE, updated);
  const written = [CATALOGUE];
  console.log(`wrote ${fileURLToPath(CATALOGUE)}`);
  if (existsSync(DOC)) {
    const doc = withTable(readFileSync(DOC, "utf8"), catalogueTable(updated));
    if (doc !== undefined) {
      writeFileSync(DOC, doc);
      written.push(DOC);
      console.log(`regenerated the table in ${fileURLToPath(DOC)}`);
    }
  }
  formatFiles(written);
}

/**
 * Formats `files` with the repository's Prettier, so that a run leaves
 * `pnpm format:check` green: the JSON and the table are written as they
 * come and laid out by the same tool as every other file.
 */
function formatFiles(files: readonly URL[]): void {
  execFileSync(
    process.execPath,
    [
      fileURLToPath(new URL("node_modules/prettier/bin/prettier.cjs", root)),
      "--write",
      "--log-level=warn",
      ...files.map((file) => fileURLToPath(file)),
    ],
    { cwd: fileURLToPath(root), stdio: "inherit" },
  );
}

await main();
