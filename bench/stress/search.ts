// The cost search (docs/calculator-plan.md, tasks 8.2 and 8.3), run by
// hand:
//
//   pnpm stress:search [--seed <hex> | --enumerate] [--cases <n>]
//                      [--budget <minutes>] [--list] [--deadline <seconds>]
//                      [--floor <ms>] [--jobs <n>] [--dry-run]
//
// It draws cases from a seed (cases.ts), or takes the fixed enumeration,
// measures them with the harness, and keeps the costliest of each family
// in bench/stress/catalogue.json (catalogue.ts), with its tables in
// docs/cost.md.
//
// What is searched depends on the seed alone. A run given `--seed` uses
// it; one without draws a fresh seed from the cryptographic source first
// and prints it. `--cases n` takes the first `n` cases of the sequence
// (100 by default, the whole enumeration), and `--list` prints them
// without evaluating any. Wall-clock time decides only what is kept and
// when a run stops, never what is searched.
//
// The work is split into units, each the least that can be done alone:
//
// - **measure** a case, cold then warm in a worker of its own (the warm
//   evaluation needs the cold one's memos, so the two are one unit);
// - **pair** a family's best case with another run's entry for the
//   family, back to back in one lane, so that the two see the same load;
// - **type out** an entry that joins, a keystroke at a time in one worker
//   (each keystroke needs the memos of the ones before it).
//
// Lanes, one per core (`--jobs`), pull the next ready unit as they come
// free (pool.ts): a pair or a typing as soon as its family's cases are
// all measured, else the next case. Each unit is journaled as it finishes
// (journal.ts), under bench/stress/runs/<seed>/, so a run can stop
// anywhere and the same command carries on, losing only the units that
// were running; a larger `--cases` extends a run, and `--budget` stops
// one after that many minutes for the next to carry on. Every fifteen
// seconds, and at the end, the run writes what it has found into the
// catalogue and the tables: each family as its cases come in, a new
// family's best case at once, a pair's outcome once measured, a hang as
// soon as it is found. Timings under that load stay within a few percent
// of timings taken alone, which is why they are kept.
//
// Commands run as tooling.ts runs them, as security rules require
// (ARCHITECTURE.md, "Security").

import { existsSync, readFileSync } from "node:fs";
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
  HANGS_END,
  HANGS_START,
  catalogueTable,
  decide,
  familyKey,
  fromRun,
  hangEstimate,
  hangsTable,
  perCall,
  readCatalogue,
  slotOf,
  summarizeTyping,
  withRun,
  withSlot,
  withTable,
  writeAtomically,
  writeCatalogue,
  type Catalogue,
  type Commit,
  type Decision,
  type Entry,
  type Hang,
  type Pair,
  type RunSource,
  type Source,
} from "./catalogue.ts";
import { estimateMs, machine, typeOut, type Measurement } from "./harness.ts";
import {
  append,
  caseKey,
  formatRanges,
  lock,
  readJournal,
  readJson,
  writeJson,
  type CaseRecord,
  type JournalRecord,
  type Outcome,
  type PairRecord,
  type TypingRecord,
} from "./journal.ts";
import { runPool } from "./pool.ts";
import {
  CATALOGUE,
  DOC,
  RUNS,
  caseOfEntry,
  currentCommit,
  formatFiles,
  measureCase,
} from "./tooling.ts";

/** The most cases a seed's sequence holds: the indices `foldIn` takes. */
const MAX_CASES = 2 ** 32 - 1;

/** How often a run writes what it has found, in milliseconds. */
const WRITE_EVERY_MS = 15_000;

/** A search: a seed's sequence of cases, or the enumeration. */
type Search = {
  /** The seed's text, or `enumeration`: the journal's directory. */
  readonly name: string;
  /** How many cases there are. */
  readonly count: number;
  readonly draw: (index: number) => Drawn;
  readonly source: (index: number) => Source;
  readonly run: RunSource;
  /** The flags that name the search, for the commands printed. */
  readonly flags: string;
};

/** What `run.json` holds: how many of the search's cases the run covers. */
type RunFile = { readonly target: number };

/** A unit of work. */
type Unit =
  | { readonly kind: "measure"; readonly index: number }
  | {
      readonly kind: "pair";
      readonly family: string;
      readonly index: number;
      readonly incumbent: Entry;
    }
  | { readonly kind: "typing"; readonly family: string; readonly entry: Entry };

/** What the run knows of one family. */
type Family = {
  readonly key: string;
  /** How many of its cases are in the run's range, and how many are measured. */
  members: number;
  measured: number;
  /** Its costliest finished case that reached the floor, and its index. */
  best: { readonly index: number; readonly entry: Entry } | undefined;
  /** Its hang estimated costliest. */
  worst: Hang | undefined;
};

/** Prints the usage, and exits with `code`. */
function usage(code = 2): never {
  console.log(
    "usage: pnpm stress:search [--seed <hex> | --enumerate] [--cases <n>]\n" +
      "                          [--budget <minutes>] [--list] [--deadline <seconds>]\n" +
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

/** The index of a case in its search, from its source. */
function indexOf(source: Source): number {
  return "seed" in source ? source.index : source.enumeration;
}

/** A case's timings as one line of progress. */
function progressLine(record: CaseRecord, drawn: Drawn): string {
  const what = `${drawn.family.profile}  ${record.case.have}`;
  const index = record.index;
  if ("failed" in record) return `[${index}] FAILED: ${record.failed}  ${what}`;
  const m = record.measured;
  if (m.status === "deadline") {
    const at =
      m.running === undefined
        ? "before its first pass"
        : `in the ${m.running.run} run's pass ${m.running.pass + 1} of ${m.progress.schedule.length} (${m.running.precision} digits)`;
    return `[${index}] past the deadline ${at}, ≈ ${Math.round(estimateMs(m) / 1000)} s warm  ${what}`;
  }
  const per = m.warm.ms / drawn.calls;
  return `[${index}] warm ${Math.round(m.warm.ms)} ms (${Math.round(per)} ms a call, ${m.warm.passes.length} passes), cold ${Math.round(m.cold.ms)} ms  ${what}`;
}

/** A run of a search: its state, its units and its writes. */
class Run {
  readonly cases = new Map<number, CaseRecord>();
  readonly pairs = new Map<string, PairRecord>();
  readonly typings = new Map<string, TypingRecord>();
  readonly families = new Map<string, Family>();
  readonly familyOf: string[] = [];
  /** Families whose cases are all measured and that may still owe a pair or a typing. */
  readonly open = new Set<string>();
  readonly running = new Set<string>();
  catalogue: Catalogue;
  cursor = 0;
  changed = false;
  measuredNow = 0;

  readonly search: Search;
  readonly dir: URL;
  readonly target: number;
  readonly base: Catalogue;
  readonly floorMs: number;
  readonly deadlineMs: number;
  readonly commit: Commit;

  constructor(
    search: Search,
    dir: URL,
    target: number,
    base: Catalogue,
    floorMs: number,
    deadlineMs: number,
    commit: Commit,
    records: readonly JournalRecord[],
  ) {
    this.search = search;
    this.dir = dir;
    this.target = target;
    this.base = base;
    this.floorMs = floorMs;
    this.deadlineMs = deadlineMs;
    this.commit = commit;
    this.catalogue = readCatalogue(CATALOGUE);
    for (let index = 0; index < target; index++) {
      const key = familyKey(search.draw(index).family);
      this.familyOf[index] = key;
      let family = this.families.get(key);
      if (family === undefined) {
        family = {
          key,
          members: 0,
          measured: 0,
          best: undefined,
          worst: undefined,
        };
        this.families.set(key, family);
      }
      family.members++;
    }
    let foreign = 0;
    for (const record of records) {
      if (record.kind === "case") {
        if (!this.accept(record)) foreign++;
      } else if (record.kind === "pair") {
        this.pairs.set(pairKey(record.index, record.incumbent), record);
      } else if (record.kind === "typing") {
        this.typings.set(record.case, record);
      }
    }
    if (foreign > 0) {
      console.log(
        `skipped ${foreign} journaled cases outside the range or drawn differently by this generator`,
      );
    }
  }

  /** Takes a journaled or new case into the run's state, unless it is not the run's. */
  accept(record: CaseRecord): boolean {
    const { index } = record;
    if (!(Number.isInteger(index) && index >= 0 && index < this.target)) {
      return false;
    }
    if (this.cases.has(index)) return true;
    if (caseKey(this.search.draw(index).case) !== caseKey(record.case)) {
      return false;
    }
    this.cases.set(index, record);
    const family = this.families.get(this.familyOf[index]!)!;
    family.measured++;
    if ("measured" in record && record.measured.status === "done") {
      const entry = this.entryOf(
        index,
        record.measured,
        record.commit,
        record.date,
      );
      if (
        entry.warm.ms >= this.floorMs &&
        (family.best === undefined ||
          perCall(entry) > perCall(family.best.entry))
      ) {
        family.best = { index, entry };
      }
    } else {
      const hang = this.hangOf(record);
      if (
        family.worst === undefined ||
        hangEstimate(hang) > hangEstimate(family.worst)
      ) {
        family.worst = hang;
      }
    }
    if (family.measured === family.members) this.open.add(family.key);
    this.changed = true;
    return true;
  }

  /** An entry from a finished measurement of the case at `index`. */
  entryOf(
    index: number,
    measured: Extract<Measurement, { status: "done" }>,
    commit: Commit,
    date: string,
  ): Entry {
    const drawn = this.search.draw(index);
    return {
      family: drawn.family,
      have: drawn.case.have,
      want: drawn.case.want,
      settings: drawn.case.settings,
      calls: drawn.calls,
      source: this.search.source(index),
      commit,
      date,
      machine: measured.machine,
      cold: measured.cold,
      warm: measured.warm,
    };
  }

  /** A hang from a case that did not finish. */
  hangOf(record: CaseRecord): Hang {
    const drawn = this.search.draw(record.index);
    const base = {
      family: drawn.family,
      have: drawn.case.have,
      want: drawn.case.want,
      settings: drawn.case.settings,
      source: this.search.source(record.index),
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
    const m = record.measured as Extract<Measurement, { status: "deadline" }>;
    return {
      ...base,
      machine: m.machine,
      reason: {
        kind: "deadline",
        deadlineMs: m.deadlineMs,
        running: m.running ?? null,
        progress: m.progress,
        estimateMs: Math.round(estimateMs(m)),
      },
    };
  }

  /** The family `key` decided against `catalogue`, the run's entry carrying its typing. */
  decision(key: string, catalogue: Catalogue): Decision {
    const family = this.families.get(key)!;
    const findings = {
      best: family.best?.entry,
      worst: family.worst,
      complete: family.measured === family.members,
    };
    const pair = (best: Entry, incumbent: Entry): Pair | undefined => {
      const record = this.pairs.get(
        pairKey(indexOf(best.source), caseKey(caseOfEntry(incumbent))),
      );
      if (record === undefined) return undefined;
      const done = (o: Outcome) =>
        "measured" in o && o.measured.status === "done"
          ? o.measured
          : undefined;
      const candidate = done(record.candidate);
      const again = done(record.entry);
      return {
        candidate:
          candidate === undefined
            ? undefined
            : this.entryOf(
                indexOf(best.source),
                candidate,
                record.commit,
                record.date,
              ),
        incumbent:
          again === undefined
            ? undefined
            : { ...incumbent, cold: again.cold, warm: again.warm },
      };
    };
    const decided = decide(
      this.search.run,
      findings,
      slotOf(this.base, key),
      slotOf(catalogue, key),
      pair,
    );
    const { entry } = decided;
    if (entry === undefined || !fromRun(entry.source, this.search.run)) {
      return decided;
    }
    const typed = this.typings.get(caseKey(caseOfEntry(entry)));
    return typed !== undefined && "typing" in typed
      ? { ...decided, entry: { ...entry, typing: typed.typing } }
      : decided;
  }

  /** The next ready unit, taking it: a family's pair or typing first, else the next case. */
  next(): Unit | undefined {
    for (const key of this.open) {
      const decided = this.decision(key, this.catalogue);
      if (decided.pairWith !== undefined) {
        const index = this.families.get(key)!.best!.index;
        const id = `pair ${pairKey(index, caseKey(caseOfEntry(decided.pairWith)))}`;
        if (!this.running.has(id)) {
          this.running.add(id);
          return {
            kind: "pair",
            family: key,
            index,
            incumbent: decided.pairWith,
          };
        }
        continue;
      }
      const { entry } = decided;
      if (
        entry !== undefined &&
        fromRun(entry.source, this.search.run) &&
        !this.typings.has(caseKey(caseOfEntry(entry)))
      ) {
        const id = `typing ${caseKey(caseOfEntry(entry))}`;
        if (!this.running.has(id)) {
          this.running.add(id);
          return { kind: "typing", family: key, entry };
        }
        continue;
      }
      this.open.delete(key);
    }
    while (this.cursor < this.target) {
      const index = this.cursor++;
      if (!this.cases.has(index)) return { kind: "measure", index };
    }
    return undefined;
  }

  /** Runs `unit`, journals it, and takes it into the run's state. */
  async run(unit: Unit): Promise<void> {
    const date = () => new Date().toISOString();
    switch (unit.kind) {
      case "measure": {
        const drawn = this.search.draw(unit.index);
        const outcome = await measureCase(drawn.case, this.deadlineMs);
        const record = {
          kind: "case",
          index: unit.index,
          case: drawn.case,
          commit: this.commit,
          date: date(),
          ...outcome,
        } as CaseRecord;
        append(this.dir, record);
        this.accept(record);
        this.measuredNow++;
        console.log(progressLine(record, drawn));
        return;
      }
      case "pair": {
        const drawn = this.search.draw(unit.index);
        const incumbent = caseOfEntry(unit.incumbent);
        const candidate = await measureCase(drawn.case, this.deadlineMs);
        const entry = await measureCase(incumbent, this.deadlineMs);
        const record: PairRecord = {
          kind: "pair",
          index: unit.index,
          incumbent: caseKey(incumbent),
          commit: this.commit,
          date: date(),
          candidate,
          entry,
        };
        append(this.dir, record);
        const id = pairKey(record.index, record.incumbent);
        this.pairs.set(id, record);
        this.running.delete(`pair ${id}`);
        this.changed = true;
        const per = (o: Outcome, calls: number) =>
          "failed" in o
            ? "failed"
            : o.measured.status === "done"
              ? `${Math.round(o.measured.warm.ms / calls)} ms a call`
              : "past its deadline";
        console.log(
          `  pair: ${per(candidate, drawn.calls)}  ${drawn.case.have}; its family's entry: ${per(entry, unit.incumbent.calls)}  ${unit.incumbent.have}`,
        );
        return;
      }
      case "typing": {
        const c = caseOfEntry(unit.entry);
        let record: TypingRecord;
        let line: string;
        try {
          const typing = await typeOut(c, 2 * this.deadlineMs);
          const slowest = Math.max(0, ...typing.keystrokes.map((k) => k.ms));
          line = `slowest keystroke ${Math.round(slowest)} ms of ${typing.keystrokes.length}${typing.complete ? "" : " (incomplete)"}`;
          record = {
            kind: "typing",
            case: caseKey(c),
            commit: this.commit,
            date: date(),
            typing: summarizeTyping(typing),
          };
        } catch (e) {
          line = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
          record = {
            kind: "typing",
            case: caseKey(c),
            commit: this.commit,
            date: date(),
            failed: line,
          };
        }
        append(this.dir, record);
        this.typings.set(record.case, record);
        this.running.delete(`typing ${record.case}`);
        this.changed = true;
        console.log(`  typed: ${line}  ${c.have}`);
        return;
      }
    }
  }

  /**
   * What the run has found, written: the catalogue as it is on disk now,
   * with each family the run has found something of decided again, its
   * run logged, and the tables of docs/cost.md regenerated.
   */
  async write(dryRun: boolean): Promise<void> {
    let catalogue = readCatalogue(CATALOGUE);
    for (const family of this.families.values()) {
      if (family.best === undefined && family.worst === undefined) continue;
      const decided = this.decision(family.key, catalogue);
      catalogue = withSlot(catalogue, family.key, decided);
    }
    const indices = [...this.cases.keys()];
    catalogue = withRun(catalogue, {
      source: this.search.run,
      cases: indices.length,
      indices: formatRanges(indices),
      commit: this.commit,
      date: new Date().toISOString(),
      machine: machine(),
    });
    this.catalogue = catalogue;
    this.changed = false;
    if (dryRun) return;
    writeCatalogue(CATALOGUE, catalogue);
    const written = [CATALOGUE];
    if (existsSync(DOC)) {
      let doc: string | undefined = readFileSync(DOC, "utf8");
      doc = withTable(doc, catalogueTable(catalogue));
      if (doc !== undefined) {
        doc =
          withTable(doc, hangsTable(catalogue), HANGS_START, HANGS_END) ?? doc;
        writeAtomically(DOC, doc);
        written.push(DOC);
      }
    }
    await formatFiles(written);
  }

  /** One line on where the run stands. */
  summary(): string {
    const fromThis = (x: { readonly source: Source }) =>
      fromRun(x.source, this.search.run);
    const entries = this.catalogue.entries.filter(fromThis).length;
    const hangs = this.catalogue.hangs.filter(fromThis).length;
    return `${this.cases.size} of ${this.target} cases measured; the catalogue holds ${entries} entries and ${hangs} hangs of this run (${this.catalogue.entries.length} and ${this.catalogue.hangs.length} in all)`;
  }
}

/** The key of a pair: the candidate's index and the entry's case. */
function pairKey(index: number, incumbent: string): string {
  return `${index} ${incumbent}`;
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
    refuse("--enumerate takes no seed: the enumeration is fixed");
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
      run: { enumeration: true },
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
      run: { seed: seed.text },
      flags: `--seed ${seed.text}`,
    };
    console.log(`seed ${seed.text}${seed.fresh ? " (fresh)" : ""}`);
  }
  const dir = new URL(`${search.name}/`, RUNS);
  const stored = readJson<RunFile>(dir, "run.json");
  // The run covers the larger of what it covered and what is asked: a
  // seed's sequence has no end, so a new run takes 100 cases (20 to list).
  const asked = Math.floor(
    positive(
      options.cases,
      options.enumerate ? search.count : options.list ? 20 : 100,
      "--cases",
    ),
  );
  const target = Math.min(
    search.count,
    options.list ? asked : Math.max(asked, stored?.target ?? 0),
  );

  if (options.list) {
    for (let index = 0; index < target; index++) {
      console.log(describeCase(index, search.draw(index)));
    }
    return;
  }

  const held = lock(dir);
  if ("heldBy" in held) {
    refuse(`another process is working on this run: ${held.heldBy}`);
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      held.release();
      console.log(
        `\nstopped; carry on with: pnpm stress:search ${search.flags}`,
      );
      process.exit(130);
    });
  }
  try {
    writeJson(dir, "run.json", { target } satisfies RunFile);
    let base = readJson<Catalogue>(dir, "base.json");
    if (base === undefined) {
      base = readCatalogue(CATALOGUE);
      writeJson(dir, "base.json", base);
    }
    const journal = readJournal(dir);
    if (journal.skipped > 0) {
      console.log(`skipped ${journal.skipped} unreadable lines of the journal`);
    }
    const run = new Run(
      search,
      dir,
      target,
      base,
      floorMs,
      deadlineMs,
      currentCommit(),
      journal.records,
    );
    console.log(`journal: ${fileURLToPath(dir)}`);
    if (run.cases.size > 0) {
      console.log(`${run.cases.size} of ${target} cases already measured`);
    }
    console.log(
      `${jobs} lanes, each case under ${deadlineMs / 1000} s${budgetMs === undefined ? "" : `, for ${budgetMs / 60_000} minutes`}`,
    );

    const dryRun = options["dry-run"];
    let writing: Promise<void> = Promise.resolve();
    const writeNow = () => {
      writing = writing.then(async () => {
        await run.write(dryRun);
        console.log(`-- ${run.summary()}`);
      });
      return writing;
    };
    const timer = setInterval(() => {
      if (run.changed) void writeNow();
    }, WRITE_EVERY_MS);
    const start = performance.now();
    try {
      await runPool<Unit>({
        jobs,
        next: () => run.next(),
        run: (unit) => run.run(unit),
        stop: () =>
          budgetMs !== undefined && performance.now() - start >= budgetMs,
      });
    } finally {
      clearInterval(timer);
    }
    await writeNow();
    const left = run.next() !== undefined;
    console.log(
      `measured ${run.measuredNow} cases in this process${left ? "; stopped by the budget" : ""}`,
    );
    if (left) {
      console.log(
        `carry on with: pnpm stress:search ${search.flags}${options.budget === undefined ? "" : ` --budget ${options.budget}`}`,
      );
    } else {
      console.log(
        `replay with: pnpm stress:search ${search.flags} --cases ${target}`,
      );
    }
    if (dryRun) console.log("dry run: the catalogue and docs are not written");
  } finally {
    held.release();
  }
}

await main();
