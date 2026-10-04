// The search's journal (docs/calculator-plan.md, task 8.3): what each
// run of `pnpm stress:search` measured, written a line at a time as each
// measurement finishes, so that a run can stop anywhere, by a budget, a
// signal or a lost machine, and the next run of the same command carries
// on from where it stopped, and so that shards of one search can run in
// separate processes or on separate machines and be merged afterwards.
//
// A search's journal is a directory under bench/stress/runs/ (ignored by
// git), named by its seed or `enumeration`, holding JSON Lines files:
// `measure-all.jsonl` for an unsharded run and `measure-<k>-of-<n>.jsonl`
// for a shard, which only that shard appends to, and `merge.jsonl`,
// which the merge step appends to. Every file in the directory is read,
// so journals from other machines are merged by copying their files in.
// A line cut short by a killed process is skipped when read.
//
// The records:
//
// - **case**: one case measured, by its index in the search, with the
//   case it was (checked against the case the index draws when read, so
//   that a journal from a different generator is not mixed in) and the
//   measurement, or the failure of its worker.
// - **pair**: a case that may replace its family's entry, measured back
//   to back with that entry in one lane, so that the two compare under
//   the same load.
// - **typing**: a catalogue entry typed out, a keystroke at a time.
// - **merged**: the indices a merge took into the catalogue, which a
//   later merge leaves out.

import { appendFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import type { Commit, TypingSummary } from "./catalogue.ts";
import type { Case, Measurement } from "./harness.ts";

/** One case measured, or whose worker failed. */
export type CaseRecord = {
  readonly kind: "case";
  readonly index: number;
  readonly case: Case;
  readonly commit: Commit;
  readonly date: string;
} & ({ readonly measured: Measurement } | { readonly failed: string });

/** A case measured back to back with its family's entry. */
export type PairRecord = {
  readonly kind: "pair";
  readonly index: number;
  /** The entry's case, as `caseKey` gives it. */
  readonly incumbent: string;
  readonly commit: Commit;
  readonly date: string;
  readonly candidate: Measurement;
  readonly entry: Measurement;
};

/** A case typed out a keystroke at a time. */
export type TypingRecord = {
  readonly kind: "typing";
  /** The case, as `caseKey` gives it. */
  readonly case: string;
  readonly commit: Commit;
  readonly date: string;
  readonly typing: TypingSummary;
};

/** The indices a merge took into the catalogue. */
export type MergedRecord = {
  readonly kind: "merged";
  readonly indices: string;
  readonly date: string;
};

export type JournalRecord =
  CaseRecord | PairRecord | TypingRecord | MergedRecord;

/** A case as a key: its texts and settings, joined unambiguously. */
export function caseKey(c: Case): string {
  return JSON.stringify([c.have, c.want, c.settings]);
}

// ---------------------------------------------------------------------------
// Shards and ranges

/** One shard of `count`: the indices `i` with `i % count === index`. */
export type Shard = { readonly index: number; readonly count: number };

/** The shard `k/n` names, zero-based, or `undefined` when it names none. */
export function parseShard(text: string): Shard | undefined {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (match === null) return undefined;
  const index = Number(match[1]);
  const count = Number(match[2]);
  if (!(count >= 1 && index < count)) return undefined;
  return { index, count };
}

/** Whether `index` is in `shard` (every index is in no shard at all). */
export function inShard(index: number, shard: Shard | undefined): boolean {
  return shard === undefined || index % shard.count === shard.index;
}

/** The file a run of `shard` appends its cases to. */
export function measureFile(shard: Shard | undefined): string {
  return shard === undefined
    ? "measure-all.jsonl"
    : `measure-${shard.index}-of-${shard.count}.jsonl`;
}

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

/** Appends `record` to `file` in `dir` as one line, creating both as needed. */
export function append(dir: URL, file: string, record: JournalRecord): void {
  mkdirSync(dir, { recursive: true });
  appendFileSync(new URL(file, dir), `${JSON.stringify(record)}\n`);
}

/** What reading a journal gave: its records, and the lines it skipped. */
export type Journal = {
  readonly records: readonly JournalRecord[];
  readonly skipped: number;
};

/**
 * Every record in every `.jsonl` file of `dir`, file by file in name
 * order and line by line, with a count of the lines that did not parse,
 * such as one cut short by a killed process. No directory is an empty
 * journal.
 */
export function readJournal(dir: URL): Journal {
  let files: string[];
  try {
    files = readdirSync(dir).filter((name) => name.endsWith(".jsonl"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { records: [], skipped: 0 };
    }
    throw e;
  }
  const records: JournalRecord[] = [];
  let skipped = 0;
  for (const name of files.sort()) {
    for (const line of readFileSync(new URL(name, dir), "utf8").split("\n")) {
      if (line === "") continue;
      try {
        records.push(JSON.parse(line) as JournalRecord);
      } catch {
        skipped++;
      }
    }
  }
  return { records, skipped };
}
