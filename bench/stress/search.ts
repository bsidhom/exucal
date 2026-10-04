// The cost search (docs/calculator-plan.md, tasks 8.2 and 8.3), run by
// hand:
//
//   pnpm stress:search [--seed <hex> | --enumerate]
//                      [--cases <n>] [--budget <minutes>] [--shard <k>/<n>]
//                      [--merge] [--list] [--deadline <seconds>]
//                      [--floor <ms>] [--jobs <n>] [--dry-run]
//
// It draws cases from a seed (cases.ts), or takes the fixed enumeration,
// measures them with the harness, and merges what it found into
// bench/stress/catalogue.json (catalogue.ts), regenerating the table in
// docs/cost.md when that file holds the table's markers.
//
// What is searched depends on the seed alone. A run given `--seed` uses
// it; one without draws a fresh seed from the cryptographic source first
// and prints it. `--cases n` takes the first `n` cases of the sequence
// (100 by default, the whole enumeration), and `--list` prints them
// without evaluating any. Wall-clock time decides only what is kept and
// when a run stops, never what is searched.
//
// The work is journaled (journal.ts), a line per measurement as each
// finishes, under bench/stress/runs/<seed>/, so it can stop anywhere and
// carry on: a run measures only the cases its journal lacks, so running
// the same command again resumes a run that was stopped, and a larger
// `--cases` extends a finished one. `--budget` stops dispatching cases
// after that many minutes, for a run of bounded length that the next
// run carries on. `--shard k/n` measures only the indices `i` with
// `i % n === k`, so that `n` processes, here or on other machines, share
// a search; each shard journals to a file of its own.
//
// A run takes two steps:
//
// 1. **Measure.** Every case the journal lacks is measured, `--jobs` at a
//    time (one per core by default), each in a worker of its own under
//    `--deadline`. A case past its deadline, or whose worker failed, is a
//    hang, kept apart and not ranked. Timings under that load stay within
//    a few percent of timings taken alone, which is why they are kept.
// 2. **Merge.** The cases measured since the last merge are merged into
//    the catalogue. The costliest of each family the catalogue lacks
//    joins if its warm cost reaches the floor. The costliest of a family
//    the catalogue has is measured again back to back with that family's
//    entry, in one lane so that the load is the same for both, and
//    replaces the entry if it costs more per call. Every entry that joins
//    is typed out a keystroke at a time. These measurements run `--jobs`
//    at a time and are journaled too, so a merge that stops resumes.
//
// A run without `--shard` measures, then merges. A shard only measures,
// and `--merge`, given the seed, merges what every shard journaled once
// they are done.
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
  roundRun,
  summarizeTyping,
  withTable,
  withTyping,
  writeCatalogue,
  type Commit,
  type Entry,
  type Hang,
  type RunRecord,
  type Source,
} from "./catalogue.ts";
import {
  machine,
  measure,
  typeOut,
  type Case,
  type Measurement,
} from "./harness.ts";
import {
  append,
  caseKey,
  formatRanges,
  inShard,
  measureFile,
  parseRanges,
  parseShard,
  readJournal,
  type CaseRecord,
  type JournalRecord,
  type PairRecord,
  type Shard,
  type TypingRecord,
} from "./journal.ts";

const root = new URL("../../", import.meta.url);
const CATALOGUE = new URL("bench/stress/catalogue.json", root);
const DOC = new URL("docs/cost.md", root);
const RUNS = new URL("bench/stress/runs/", root);
const MERGE_FILE = "merge.jsonl";

/** The most cases a seed's sequence holds: the indices `foldIn` takes. */
const MAX_CASES = 2 ** 32 - 1;

/** A search: a seed's sequence of cases, or the enumeration. */
type Search = {
  /** The seed's text, or `enumeration`: the journal's directory. */
  readonly name: string;
  /** How many cases there are. */
  readonly count: number;
  readonly draw: (index: number) => Drawn;
  readonly source: (index: number) => Source;
  readonly runSource: RunRecord["source"];
  /** The flags that name the search, for the commands printed. */
  readonly flags: string;
};

/** A case record that finished, with the measurement narrowed. */
type Done = CaseRecord & {
  readonly measured: Extract<Measurement, { status: "done" }>;
};

/** What measuring a case gave: a measurement, or the failure of its worker. */
type Outcome = { readonly measured: Measurement } | { readonly failed: string };

/** Prints the usage, and exits with `code`. */
function usage(code = 2): never {
  console.log(
    "usage: pnpm stress:search [--seed <hex> | --enumerate]\n" +
      "                          [--cases <n>] [--budget <minutes>] [--shard <k>/<n>]\n" +
      "                          [--merge] [--list] [--deadline <seconds>]\n" +
      "                          [--floor <ms>] [--jobs <n>] [--dry-run]",
  );
  process.exit(code);
}

/** Prints `message` and exits as a usage error does. */
function refuse(message: string): never {
  console.error(message);
  process.exit(2);
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
    refuse(`${what} must be a positive number: ${text}`);
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

/** `m` with its runs' timings rounded, as the journal and catalogue keep them. */
function rounded(m: Measurement): Measurement {
  if (m.status === "done") {
    return { ...m, cold: roundRun(m.cold), warm: roundRun(m.warm) };
  }
  return { ...m, cold: m.cold === undefined ? undefined : roundRun(m.cold) };
}

/** `c` measured under `deadlineMs`, or the failure of its worker. */
async function measureCase(c: Case, deadlineMs: number): Promise<Outcome> {
  try {
    return { measured: rounded(await measure(c, deadlineMs)) };
  } catch (e) {
    return { failed: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Runs `work` on each item `next` gives, `jobs` at a time, until it gives
 * none or `stop` holds before a dispatch.
 */
async function inLanes<T>(
  next: () => T | undefined,
  jobs: number,
  work: (item: T) => Promise<void>,
  stop: () => boolean = () => false,
): Promise<void> {
  const lane = async () => {
    for (;;) {
      if (stop()) return;
      const item = next();
      if (item === undefined) return;
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: jobs }, lane));
}

/** `items` one at a time, for `inLanes`. */
function each<T>(items: readonly T[]): () => T | undefined {
  let i = 0;
  return () => items[i++];
}

/** The case of `entry`, without the rest of its record. */
function caseOfEntry(entry: Entry): Case {
  return { have: entry.have, want: entry.want, settings: entry.settings };
}

/** A case's timings as one line of progress. */
function progress(record: CaseRecord, drawn: Drawn): string {
  const what = `${drawn.family.profile}  ${record.case.have}`;
  const index = record.index;
  if ("failed" in record) return `[${index}] FAILED: ${record.failed}  ${what}`;
  const m = record.measured;
  if (m.status === "deadline") {
    const at =
      m.running === undefined
        ? "before its first pass"
        : `in the ${m.running.run} run's pass ${m.running.pass} (${m.running.precision} digits)`;
    return `[${index}] past the deadline ${at}  ${what}`;
  }
  const per = m.warm.ms / drawn.calls;
  return `[${index}] warm ${Math.round(m.warm.ms)} ms (${Math.round(per)} ms a call, ${m.warm.passes.length} passes), cold ${Math.round(m.cold.ms)} ms  ${what}`;
}

/**
 * The journal's case records, the first for each index, keeping only those
 * whose case is the one the index draws; the count of the others, which
 * a different generator wrote.
 */
function journaledCases(
  search: Search,
  records: readonly JournalRecord[],
): { cases: Map<number, CaseRecord>; foreign: number } {
  const cases = new Map<number, CaseRecord>();
  let foreign = 0;
  for (const record of records) {
    if (record.kind !== "case" || cases.has(record.index)) continue;
    const ok =
      Number.isInteger(record.index) &&
      record.index >= 0 &&
      record.index < search.count &&
      caseKey(search.draw(record.index).case) === caseKey(record.case);
    if (ok) cases.set(record.index, record);
    else foreign++;
  }
  return { cases, foreign };
}

/** Reads the journal in `dir`, saying what it skipped. */
function readAndReport(
  search: Search,
  dir: URL,
): {
  records: readonly JournalRecord[];
  cases: Map<number, CaseRecord>;
} {
  const journal = readJournal(dir);
  if (journal.skipped > 0) {
    console.log(`skipped ${journal.skipped} unreadable lines of the journal`);
  }
  const { cases, foreign } = journaledCases(search, journal.records);
  if (foreign > 0) {
    console.log(
      `skipped ${foreign} journaled cases that this generator draws differently; delete ${fileURLToPath(dir)} to measure afresh`,
    );
  }
  return { records: journal.records, cases };
}

/**
 * Step 1: measures the cases among the first `limit` of `shard` that the
 * journal lacks, `jobs` at a time, until done or past `budgetMs`, and
 * journals each as it finishes. Gives how many of them are left.
 */
async function measureStep(
  search: Search,
  dir: URL,
  limit: number,
  shard: Shard | undefined,
  budgetMs: number | undefined,
  jobs: number,
  deadlineMs: number,
  commit: Commit,
): Promise<{ measured: number; left: boolean }> {
  const { cases } = readAndReport(search, dir);
  const file = measureFile(shard);
  const known = [...cases.keys()].filter(
    (i) => i < limit && inShard(i, shard),
  ).length;
  if (known > 0) console.log(`${known} cases already journaled`);
  console.log(
    `measuring ${jobs} at a time, each under ${deadlineMs / 1000} s${budgetMs === undefined ? "" : `, for ${budgetMs / 60_000} minutes`}`,
  );
  let cursor = 0;
  const next = (): number | undefined => {
    while (cursor < limit) {
      const index = cursor++;
      if (inShard(index, shard) && !cases.has(index)) return index;
    }
    return undefined;
  };
  const start = performance.now();
  const stop = () =>
    budgetMs !== undefined && performance.now() - start >= budgetMs;
  let measured = 0;
  await inLanes(
    next,
    jobs,
    async (index) => {
      const drawn = search.draw(index);
      const outcome = await measureCase(drawn.case, deadlineMs);
      const record = {
        kind: "case",
        index,
        case: drawn.case,
        commit,
        date: new Date().toISOString(),
        ...outcome,
      } as CaseRecord;
      append(dir, file, record);
      measured++;
      console.log(progress(record, drawn));
    },
    stop,
  );
  return { measured, left: next() !== undefined };
}

/** An entry from a finished measurement of the case at `index`. */
function entryOf(
  search: Search,
  index: number,
  measured: Extract<Measurement, { status: "done" }>,
  commit: Commit,
  date: string,
): Entry {
  const drawn = search.draw(index);
  return {
    family: drawn.family,
    have: drawn.case.have,
    want: drawn.case.want,
    settings: drawn.case.settings,
    calls: drawn.calls,
    source: search.source(index),
    commit,
    date,
    machine: measured.machine,
    cold: measured.cold,
    warm: measured.warm,
  };
}

/** A hang from a case that did not finish, or `undefined`. */
function hangOf(search: Search, record: CaseRecord): Hang | undefined {
  const drawn = search.draw(record.index);
  const base = {
    family: drawn.family,
    have: drawn.case.have,
    want: drawn.case.want,
    settings: drawn.case.settings,
    source: search.source(record.index),
    commit: record.commit,
    date: record.date,
  };
  if ("failed" in record) {
    return {
      ...base,
      machine: machine(),
      reason: { kind: "failed", message: record.failed },
    };
  }
  const m = record.measured;
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

/** The key of a pair: the candidate's index and the entry's case. */
function pairKey(index: number, incumbent: string): string {
  return `${index} ${incumbent}`;
}

/**
 * Step 2: merges the journaled cases no merge has taken into the
 * catalogue, measuring each candidate beside its family's entry and
 * typing out each entry that joins, `jobs` at a time and journaled.
 */
async function mergeStep(
  search: Search,
  dir: URL,
  jobs: number,
  deadlineMs: number,
  floorMs: number,
  commit: Commit,
  dryRun: boolean,
): Promise<void> {
  const { records, cases } = readAndReport(search, dir);
  const taken = new Set(
    records.flatMap((r) => (r.kind === "merged" ? parseRanges(r.indices) : [])),
  );
  const fresh = [...cases.values()]
    .filter((r) => !taken.has(r.index))
    .sort((a, b) => a.index - b.index);
  if (fresh.length === 0) {
    console.log("nothing to merge: every journaled case has been merged");
    return;
  }
  const indices = formatRanges(fresh.map((r) => r.index));
  console.log(`merging ${fresh.length} cases (${indices})`);
  const commits = new Set(
    fresh.map((r) => `${r.commit.hash}${r.commit.dirty ? " (dirty)" : ""}`),
  );
  if (commits.size > 1 || fresh.some((r) => r.commit.dirty)) {
    console.log(`note: measured at ${[...commits].join(", ")}`);
  }

  const hangs = fresh
    .map((record) => hangOf(search, record))
    .filter((hang): hang is Hang => hang !== undefined);

  // The costliest finished case of each family that reaches the floor.
  const best = new Map<string, { record: Done; per: number }>();
  for (const record of fresh) {
    if ("failed" in record || record.measured.status !== "done") continue;
    const done = record as Done;
    if (done.measured.warm.ms < floorMs) continue;
    const drawn = search.draw(done.index);
    const key = familyKey(drawn.family);
    const per = done.measured.warm.ms / drawn.calls;
    const known = best.get(key);
    if (known === undefined || per > known.per)
      best.set(key, { record: done, per });
  }

  // Each candidate of a family the catalogue has, beside that entry.
  const catalogue = readCatalogue(CATALOGUE);
  const incumbents = new Map(
    catalogue.entries.map((entry) => [familyKey(entry.family), entry]),
  );
  const pairs = new Map<string, PairRecord>();
  for (const r of records) {
    if (r.kind === "pair") pairs.set(pairKey(r.index, r.incumbent), r);
  }
  const contested = [...best.entries()].flatMap(([key, { record }]) => {
    const incumbent = incumbents.get(key);
    return incumbent === undefined ? [] : [{ record, incumbent }];
  });
  const needed = contested.filter(
    ({ record, incumbent }) =>
      !pairs.has(pairKey(record.index, caseKey(caseOfEntry(incumbent)))),
  );
  if (needed.length > 0) {
    console.log(
      `measuring ${needed.length} cases beside their families' entries, ${jobs} at a time`,
    );
  }
  await inLanes(each(needed), jobs, async ({ record, incumbent }) => {
    const candidate = await measureCase(record.case, deadlineMs);
    const entry = await measureCase(caseOfEntry(incumbent), deadlineMs);
    if (!("measured" in candidate) || !("measured" in entry)) return;
    const pair: PairRecord = {
      kind: "pair",
      index: record.index,
      incumbent: caseKey(caseOfEntry(incumbent)),
      commit,
      date: new Date().toISOString(),
      candidate: candidate.measured,
      entry: entry.measured,
    };
    append(dir, MERGE_FILE, pair);
    pairs.set(pairKey(pair.index, pair.incumbent), pair);
    const per = (m: Measurement, calls: number) =>
      m.status === "done"
        ? `${Math.round(m.warm.ms / calls)} ms a call`
        : "past its deadline";
    console.log(
      `  ${per(pair.candidate, search.draw(record.index).calls)}  ${record.case.have}; its family's entry: ${per(pair.entry, incumbent.calls)}`,
    );
  });

  const candidates: Entry[] = [];
  const remeasured = new Map<string, Entry>();
  for (const [key, { record }] of best) {
    const incumbent = incumbents.get(key);
    if (incumbent === undefined) {
      candidates.push(
        entryOf(
          search,
          record.index,
          record.measured,
          record.commit,
          record.date,
        ),
      );
      continue;
    }
    const pair = pairs.get(
      pairKey(record.index, caseKey(caseOfEntry(incumbent))),
    );
    if (pair === undefined || pair.candidate.status !== "done") continue;
    candidates.push(
      entryOf(search, record.index, pair.candidate, pair.commit, pair.date),
    );
    if (pair.entry.status === "done") {
      remeasured.set(key, {
        ...incumbent,
        cold: pair.entry.cold,
        warm: pair.entry.warm,
      });
    }
  }

  const report = merge(catalogue, candidates, remeasured, floorMs);
  let updated = mergeHangs(report.catalogue, hangs);

  // Each entry that joined, typed out a keystroke at a time: the profile
  // the interface's evaluation on every keystroke is designed against.
  const joined = [
    ...report.added,
    ...report.replaced.map(([, entry]) => entry),
  ];
  const typings = new Map<string, TypingRecord>();
  for (const r of records) {
    if (r.kind === "typing" && !typings.has(r.case)) typings.set(r.case, r);
  }
  const untyped = joined.filter(
    (entry) => !typings.has(caseKey(caseOfEntry(entry))),
  );
  if (untyped.length > 0) {
    console.log(
      `typing out ${untyped.length} entries a keystroke at a time, ${jobs} at a time`,
    );
  }
  await inLanes(each(untyped), jobs, async (entry) => {
    const typing = await typeOut(caseOfEntry(entry), 2 * deadlineMs).catch(
      () => undefined,
    );
    if (typing === undefined) return;
    const record: TypingRecord = {
      kind: "typing",
      case: caseKey(caseOfEntry(entry)),
      commit,
      date: new Date().toISOString(),
      typing: summarizeTyping(typing),
    };
    append(dir, MERGE_FILE, record);
    typings.set(record.case, record);
    const slowest = Math.max(0, ...typing.keystrokes.map((k) => k.ms));
    console.log(
      `  slowest keystroke ${Math.round(slowest)} ms of ${typing.keystrokes.length}${typing.complete ? "" : " (incomplete)"}  ${entry.have}`,
    );
  });
  for (const entry of joined) {
    const record = typings.get(caseKey(caseOfEntry(entry)));
    if (record !== undefined) {
      updated = withTyping(updated, entry, record.typing);
    }
  }

  updated = logRun(updated, {
    source: search.runSource,
    cases: fresh.length,
    indices,
    commit,
    date: new Date().toISOString(),
    machine: machine(),
  });
  console.log(
    `${report.added.length} added, ${report.replaced.length} replaced, ${hangs.length} hangs (${updated.hangs.length - catalogue.hangs.length} new families)`,
  );
  for (const entry of report.added) {
    console.log(
      `  added: ${perCall(entry).toFixed(0)} ms a call  ${entry.have}`,
    );
  }
  for (const [old, entry] of report.replaced) {
    console.log(`  replaced: ${old.have}\n        by: ${entry.have}`);
  }
  if (dryRun) {
    console.log(
      "dry run: the catalogue is not written, nor the merge journaled",
    );
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
  append(dir, MERGE_FILE, {
    kind: "merged",
    indices,
    date: new Date().toISOString(),
  });
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        seed: { type: "string" },
        cases: { type: "string" },
        budget: { type: "string" },
        shard: { type: "string" },
        merge: { type: "boolean", default: false },
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
    refuse("--enumerate takes no seed: the enumeration is fixed");
  }
  if (options.merge) {
    if (!options.enumerate && options.seed === undefined) {
      refuse("--merge needs the search to merge: its --seed, or --enumerate");
    }
    if (
      options.shard !== undefined ||
      options.cases !== undefined ||
      options.budget !== undefined
    ) {
      refuse(
        "--merge merges every journaled case: it takes no --shard, --cases or --budget",
      );
    }
  }
  const shard =
    options.shard === undefined ? undefined : parseShard(options.shard);
  if (options.shard !== undefined && shard === undefined) {
    refuse(`--shard takes k/n with k below n, from zero: ${options.shard}`);
  }
  const budgetMs =
    options.budget === undefined
      ? undefined
      : positive(options.budget, 0, "--budget") * 60_000;
  const deadlineMs = positive(options.deadline, 120, "--deadline") * 1000;
  const floorMs = positive(options.floor, 1000, "--floor");
  const jobs = Math.floor(
    positive(options.jobs, availableParallelism(), "--jobs"),
  );

  let search: Search;
  if (options.enumerate) {
    const all = enumerateCases();
    search = {
      name: "enumeration",
      count: all.length,
      draw: (index) => all[index]!,
      source: (index) => ({ enumeration: index }),
      runSource: { enumeration: true },
      flags: "--enumerate",
    };
    console.log(`the enumeration, ${all.length} cases`);
  } else {
    const seed = chooseSeed(options.seed);
    search = {
      name: seed.text,
      count: MAX_CASES,
      draw: (index) => drawCase(seed.key, index),
      source: (index) => ({ seed: seed.text, index }),
      runSource: { seed: seed.text },
      flags: `--seed ${seed.text}`,
    };
    console.log(`seed ${seed.text}${seed.fresh ? " (fresh)" : ""}`);
  }
  const limit = Math.min(
    search.count,
    Math.floor(
      positive(
        options.cases,
        // A seed's sequence has no end, so a run takes 100 cases (20 to
        // list), and with a budget as many as it reaches.
        options.enumerate || (budgetMs !== undefined && !options.list)
          ? search.count
          : options.list
            ? 20
            : 100,
        "--cases",
      ),
    ),
  );

  if (options.list) {
    for (let index = 0; index < limit; index++) {
      if (inShard(index, shard)) {
        console.log(describeCase(index, search.draw(index)));
      }
    }
    return;
  }

  const commit = currentCommit();
  const dir = new URL(`${search.name}/`, RUNS);
  console.log(`journal: ${fileURLToPath(dir)}`);
  if (!options.merge) {
    const { measured, left } = await measureStep(
      search,
      dir,
      limit,
      shard,
      budgetMs,
      jobs,
      deadlineMs,
      commit,
    );
    const shardFlag = shard === undefined ? "" : ` --shard ${options.shard}`;
    const casesFlag =
      options.cases === undefined ? "" : ` --cases ${options.cases}`;
    console.log(`measured ${measured} cases`);
    if (left) {
      console.log(
        `stopped by the budget; carry on with: pnpm stress:search ${search.flags}${casesFlag}${shardFlag}${options.budget === undefined ? "" : ` --budget ${options.budget}`}`,
      );
    }
    if (shard !== undefined) {
      console.log(
        `once every shard is done, merge with: pnpm stress:search ${search.flags} --merge`,
      );
      return;
    }
  }
  await mergeStep(
    search,
    dir,
    jobs,
    deadlineMs,
    floorMs,
    commit,
    options["dry-run"],
  );
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
