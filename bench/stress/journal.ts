// The journal of the stress tools (docs/calculator-plan.md, task 8.3):
// what a run has done, written a line at a time as each unit of work
// finishes, so that a run can stop anywhere, by a budget, a signal or a
// lost machine, and the same command carries on with only the units
// that were running lost.
//
// A run's journal is a directory under bench/stress/runs/ (ignored by
// git): a search's is named by its seed or `enumeration`, the stress
// suite's by what it checks (verify.ts). It holds `journal.jsonl`, the
// records; `run.json`, what the run is to cover, which only grows; for a
// search, `base.json`, the catalogue as it was when the run began; and
// `lock`, which names the process working on the run while it does, so
// that two processes never journal one run at once. A line cut short by
// a killed process is skipped when read.
//
// The records:
//
// - **case**: one case measured, by its index in the search, with the
//   case it was (checked against the case the index draws when read, so
//   that a journal from a different generator is not mixed in) and the
//   measurement, or the failure of its worker.
// - **pair**: a case that may replace another run's entry, measured back
//   to back with that entry in one lane, so that the two compare under
//   the same load.
// - **typing**: an entry typed out, a keystroke at a time.
// - **check**: an entry or a hang the stress suite measured again.

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import type { Commit, TypingSummary } from "./catalogue.ts";
import type { Case, Measurement } from "./harness.ts";

/** What measuring a case gave: a measurement, or the failure of its worker. */
export type Outcome =
  { readonly measured: Measurement } | { readonly failed: string };

/** One case of a search measured. */
export type CaseRecord = {
  readonly kind: "case";
  readonly index: number;
  readonly case: Case;
  readonly commit: Commit;
  readonly date: string;
} & Outcome;

/** A case measured back to back with another run's entry. */
export type PairRecord = {
  readonly kind: "pair";
  readonly index: number;
  /** The entry's case, as `caseKey` gives it. */
  readonly incumbent: string;
  readonly commit: Commit;
  readonly date: string;
  readonly candidate: Outcome;
  readonly entry: Outcome;
};

/** A case typed out a keystroke at a time, or the failure of its worker. */
export type TypingRecord = {
  readonly kind: "typing";
  /** The case, as `caseKey` gives it. */
  readonly case: string;
  readonly commit: Commit;
  readonly date: string;
} & ({ readonly typing: TypingSummary } | { readonly failed: string });

/** A catalogued case the stress suite measured again. */
export type CheckRecord = {
  readonly kind: "check";
  /** The case, as `caseKey` gives it. */
  readonly case: string;
  readonly date: string;
} & Outcome;

export type JournalRecord =
  CaseRecord | PairRecord | TypingRecord | CheckRecord;

/** A case as a key: its texts and settings, joined unambiguously. */
export function caseKey(c: Case): string {
  return JSON.stringify([c.have, c.want, c.settings]);
}

// ---------------------------------------------------------------------------
// Ranges

/** `indices` as ascending ranges, `0-9,12,15-20`. */
export function formatRanges(indices: Iterable<number>): string {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(",");
}

/** The indices `formatRanges` wrote. */
export function parseRanges(text: string): number[] {
  if (text === "") return [];
  return text.split(",").flatMap((part) => {
    const [from, to = from] = part.split("-").map(Number) as [number, number?];
    return Array.from({ length: to - from + 1 }, (_, k) => from + k);
  });
}

// ---------------------------------------------------------------------------
// Files

/** The file of a run's records. */
const RECORDS = "journal.jsonl";

/** Appends `record` to the journal in `dir` as one line, creating both as needed. */
export function append(dir: URL, record: JournalRecord): void {
  mkdirSync(dir, { recursive: true });
  appendFileSync(new URL(RECORDS, dir), `${JSON.stringify(record)}\n`);
}

/** What reading a journal gave: its records, and the lines it skipped. */
export type Journal = {
  readonly records: readonly JournalRecord[];
  readonly skipped: number;
};

/**
 * The records of the journal in `dir`, line by line, with a count of the
 * lines that did not parse, such as one cut short by a killed process.
 * No journal is an empty one.
 */
export function readJournal(dir: URL): Journal {
  let text: string;
  try {
    text = readFileSync(new URL(RECORDS, dir), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { records: [], skipped: 0 };
    }
    throw e;
  }
  const records: JournalRecord[] = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (line === "") continue;
    try {
      records.push(JSON.parse(line) as JournalRecord);
    } catch {
      skipped++;
    }
  }
  return { records, skipped };
}

/** The JSON file `name` in `dir`, or `undefined` when there is none. */
export function readJson<T>(dir: URL, name: string): T | undefined {
  try {
    return JSON.parse(readFileSync(new URL(name, dir), "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

/** Writes `value` to the JSON file `name` in `dir`, creating `dir` as needed. */
export function writeJson(dir: URL, name: string, value: unknown): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(name, dir), `${JSON.stringify(value, null, 2)}\n`);
}

/** Whether the process `pid` on this host is alive. */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Takes the lock of the run in `dir` for this process, or gives the
 * process that holds it. A lock left by a process that is gone, killed
 * before it could release it, is taken over.
 */
export function lock(
  dir: URL,
): { readonly release: () => void } | { readonly heldBy: string } {
  mkdirSync(dir, { recursive: true });
  const file = new URL("lock", dir);
  const me = { host: hostname(), pid: process.pid };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(file, JSON.stringify(me), { flag: "wx" });
      return { release: () => rmSync(file, { force: true }) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    let holder: { host?: string; pid?: number } = {};
    try {
      holder = JSON.parse(readFileSync(file, "utf8")) as typeof holder;
    } catch {
      // A lock being written, or cut short: treated as held.
    }
    const local = holder.host === me.host && typeof holder.pid === "number";
    if (!local || alive(holder.pid!)) {
      return { heldBy: `${holder.host ?? "?"} pid ${holder.pid ?? "?"}` };
    }
    rmSync(file, { force: true });
  }
  return { heldBy: "another process, which took it over first" };
}
