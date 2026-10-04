// The catalogue of the costliest expressions (docs/calculator-plan.md,
// tasks 8.2 and 8.3): what runs of the search have found, kept in
// bench/stress/catalogue.json for the stress suite and as a table in
// docs/cost.md for people. Nothing here measures; the search hands in what
// it measured, and this module decides what the catalogue keeps.
//
// A run adds to the catalogue rather than replacing it. Each entry is the
// costliest case found of its family (cases.ts), ranked by its warm cost
// per costly call. A case joins when its family is new to the catalogue
// and it costs at least the floor; it replaces its family's entry only
// when it costs more than that entry measured again in the same run,
// since only timings from one run, on one machine, compare. Every other
// entry is left as it was. Cases that passed their deadline, or whose
// worker failed, are kept apart as hangs, one per family, to be reported.
// Each run is logged with its seed (or the enumeration) and the count of
// cases it ran, so that `--seed` and `--cases` replay it exactly.

import { readFileSync, writeFileSync } from "node:fs";
import type { Settings } from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import type { Machine, Run, Running, Typing } from "./harness.ts";

// ---------------------------------------------------------------------------
// Types

/** Where a case came from: the seed and index that drew it, or the enumeration. */
export type Source =
  | { readonly seed: string; readonly index: number }
  | { readonly enumeration: number };

/** The commit a run measured: its hash, and whether the tree had changes. */
export type Commit = { readonly hash: string; readonly dirty: boolean };

/** A catalogued case: what it is, where it came from, and what it cost. */
export type Entry = {
  readonly family: Family;
  readonly have: string;
  readonly want: string;
  readonly settings: Settings;
  readonly calls: number;
  readonly source: Source;
  readonly commit: Commit;
  readonly date: string;
  readonly machine: Machine;
  readonly cold: Run;
  readonly warm: Run;
  /**
   * The case typed out a keystroke at a time (harness.ts, `typeOut`),
   * measured when it joined the catalogue; absent for an entry not yet
   * typed out.
   */
  readonly typing?: Typing;
};

/** A case that did not finish: past its deadline, or its worker failed. */
export type Hang = {
  readonly family: Family;
  readonly have: string;
  readonly want: string;
  readonly settings: Settings;
  readonly source: Source;
  readonly commit: Commit;
  readonly date: string;
  readonly machine: Machine;
  readonly reason:
    | {
        readonly kind: "deadline";
        readonly deadlineMs: number;
        readonly running: Running | null;
      }
    | { readonly kind: "failed"; readonly message: string };
  /** The issue filed for it, added by hand once it is filed. */
  readonly issue?: number;
};

/** A run of the search, as logged. */
export type RunRecord = {
  readonly source: { readonly seed: string } | { readonly enumeration: true };
  readonly cases: number;
  readonly commit: Commit;
  readonly date: string;
  readonly machine: Machine;
};

export type Catalogue = {
  readonly entries: readonly Entry[];
  readonly hangs: readonly Hang[];
  readonly runs: readonly RunRecord[];
};

/** The catalogue before any run. */
export const EMPTY: Catalogue = { entries: [], hangs: [], runs: [] };

// ---------------------------------------------------------------------------
// Merging

/** A family as a key: its parts, joined unambiguously. */
export function familyKey(family: Family): string {
  return JSON.stringify([
    family.pattern,
    family.functions,
    family.classes,
    family.profile,
  ]);
}

/** A case's warm cost per costly call, in milliseconds: what the catalogue ranks by. */
export function perCall(entry: Pick<Entry, "warm" | "calls">): number {
  return entry.warm.ms / entry.calls;
}

/** What a merge did, beside the catalogue it gives. */
export type MergeReport = {
  readonly catalogue: Catalogue;
  readonly added: readonly Entry[];
  readonly replaced: readonly (readonly [Entry, Entry])[];
};

/**
 * `catalogue` with the `candidates`, each measured again on its own in
 * this run: a candidate of a family the catalogue lacks joins when its
 * warm cost is at least `floorMs`; one of a family the catalogue has
 * replaces the entry when it costs more per call than that entry did
 * when `remeasured` in the same run (keyed by family), and costs at least
 * the floor. An entry not measured again is not replaced, since timings
 * from different runs do not compare. Every other entry is kept as it
 * was, and the entries are ranked by their cost per call.
 */
export function merge(
  catalogue: Catalogue,
  candidates: readonly Entry[],
  remeasured: ReadonlyMap<string, Entry>,
  floorMs: number,
): MergeReport {
  const entries = new Map(
    catalogue.entries.map((entry) => [familyKey(entry.family), entry]),
  );
  const added: Entry[] = [];
  const replaced: (readonly [Entry, Entry])[] = [];
  for (const candidate of candidates) {
    if (candidate.warm.ms < floorMs) continue;
    const key = familyKey(candidate.family);
    const incumbent = entries.get(key);
    if (incumbent === undefined) {
      entries.set(key, candidate);
      added.push(candidate);
      continue;
    }
    const again = remeasured.get(key);
    if (again === undefined || perCall(candidate) <= perCall(again)) continue;
    entries.set(key, candidate);
    replaced.push([incumbent, candidate]);
  }
  const ranked = [...entries.values()].sort((a, b) => perCall(b) - perCall(a));
  return { catalogue: { ...catalogue, entries: ranked }, added, replaced };
}

/** `catalogue` with each of `hangs` whose family has no hang yet. */
export function mergeHangs(
  catalogue: Catalogue,
  hangs: readonly Hang[],
): Catalogue {
  const known = new Set(catalogue.hangs.map((hang) => familyKey(hang.family)));
  const kept = [...catalogue.hangs];
  for (const hang of hangs) {
    const key = familyKey(hang.family);
    if (known.has(key)) continue;
    known.add(key);
    kept.push(hang);
  }
  return { ...catalogue, hangs: kept };
}

/** `catalogue` with `typing` recorded on the entry that is `entry`. */
export function withTyping(
  catalogue: Catalogue,
  entry: Entry,
  typing: Typing,
): Catalogue {
  return {
    ...catalogue,
    entries: catalogue.entries.map((e) => (e === entry ? { ...e, typing } : e)),
  };
}

/** A keystroke that costs at least this is one the interface visibly waits on. */
export const SLOW_KEYSTROKE_MS = 100;

/** `catalogue` with `run` logged. */
export function logRun(catalogue: Catalogue, run: RunRecord): Catalogue {
  return { ...catalogue, runs: [...catalogue.runs, run] };
}

// ---------------------------------------------------------------------------
// Files

/** The catalogue at `path`, or the empty one when there is no file. */
export function readCatalogue(path: string | URL): Catalogue {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return EMPTY;
    throw e;
  }
  return JSON.parse(text) as Catalogue;
}

/** Writes `catalogue` to `path` as JSON. */
export function writeCatalogue(path: string | URL, catalogue: Catalogue): void {
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
}

/** The markers between which docs/cost.md holds the generated table. */
export const TABLE_START =
  "<!-- catalogue table: generated by pnpm stress:search -->";
export const TABLE_END = "<!-- end of catalogue table -->";

/** A cell's text with the characters a Markdown table cannot hold escaped. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** A duration for the table: milliseconds below a second, seconds above. */
function duration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** The catalogue as a Markdown table, ranked as the entries are. */
export function catalogueTable(catalogue: Catalogue): string {
  const rows = catalogue.entries.map((entry) => {
    const want = entry.want === "" ? "" : ` → \`${cell(entry.want)}\``;
    return [
      `\`${cell(entry.have)}\`${want}`,
      cell(entry.family.profile),
      cell(entry.family.pattern),
      duration(entry.cold.ms),
      duration(entry.warm.ms),
      duration(perCall(entry)),
      String(entry.warm.passes.length),
      ...typingCells(entry.typing),
    ];
  });
  const header = [
    "Expression",
    "Settings",
    "Pattern",
    "Cold",
    "Warm",
    "Warm per call",
    "Passes",
    "Slowest keystroke",
    "Slow keystrokes",
  ];
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

/**
 * The typing columns of an entry: its slowest keystroke, and how many of
 * its keystrokes reach `SLOW_KEYSTROKE_MS` out of how many it typed
 * (marked when the typing passed its deadline); dashes when it was not
 * typed out.
 */
function typingCells(typing: Typing | undefined): [string, string] {
  if (typing === undefined || typing.keystrokes.length === 0) return ["—", "—"];
  const slowest = Math.max(...typing.keystrokes.map((k) => k.ms));
  const slow = typing.keystrokes.filter(
    (k) => k.ms >= SLOW_KEYSTROKE_MS,
  ).length;
  const of = `${slow} of ${typing.keystrokes.length}${typing.complete ? "" : "+"}`;
  return [duration(slowest), of];
}

/**
 * `doc` with the text between the table's markers replaced by `table`, or
 * `undefined` when it has no markers.
 */
export function withTable(doc: string, table: string): string | undefined {
  const start = doc.indexOf(TABLE_START);
  const end = doc.indexOf(TABLE_END);
  if (start < 0 || end < start) return undefined;
  return `${doc.slice(0, start + TABLE_START.length)}\n\n${table}\n\n${doc.slice(end)}`;
}
