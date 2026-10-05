// The catalogue of the costliest expressions (docs/calculator-plan.md,
// tasks 8.2 and 8.3): what runs of the search have found, kept in
// bench/stress/catalogue.json for the stress suite and as a table in
// docs/cost.md for people. Nothing here measures; the search hands in what
// it measured, and this module decides what the catalogue keeps.
//
// A run adds to the catalogue rather than replacing it, a hit at a time.
// Each entry is the costliest case found of its family (cases.ts), ranked
// by its warm cost per costly call; each hang, a case that passed its
// deadline or whose worker failed, is the costliest of its family by its
// estimated cost. A hit takes its family's entry or hang when there is
// none, or when it costs `MARGIN` times the one there: timings taken at
// different times, or on different machines, differ by a few percent,
// and the margin keeps near-equal cases from trading places. Each run is
// logged with its seed and how many cases it measured, and each entry
// with the seed and index that drew it, so that any case replays.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Settings } from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import type { Machine, Progress, Run, Running, Typing } from "./harness.ts";

// ---------------------------------------------------------------------------
// Types

/** Where a case came from: the seed and index that drew it, or its place in the fixed enumeration the first catalogue was built from. */
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
   * measured when it joined the catalogue, as a summary; absent for an
   * entry not yet typed out.
   */
  readonly typing?: TypingSummary;
};

/**
 * A case typed out, as the catalogue keeps it: how many keystrokes were
 * typed, whether the typing finished within its deadline, and the
 * keystrokes that cost at least `COSTLY_KEYSTROKE_MS`, each as the length
 * typed and its time. The cheaper keystrokes, almost all of them, are left
 * out: they are noise beside the few that are not.
 */
export type TypingSummary = {
  readonly keystrokes: number;
  readonly complete: boolean;
  readonly costly: readonly (readonly [length: number, ms: number])[];
};

/** A keystroke the catalogue keeps in a typing's summary. */
export const COSTLY_KEYSTROKE_MS = 10;

/** `typing` as the catalogue keeps it. */
export function summarizeTyping(typing: Typing): TypingSummary {
  return {
    keystrokes: typing.keystrokes.length,
    complete: typing.complete,
    costly: typing.keystrokes
      .filter((k) => k.ms >= COSTLY_KEYSTROKE_MS)
      .map((k) => [k.length, tenth(k.ms)] as const),
  };
}

/** `ms` rounded to a tenth of a millisecond, finer than any timing is worth. */
function tenth(ms: number): number {
  return Math.round(ms * 10) / 10;
}

/** `run` with its timings rounded to a tenth of a millisecond, as the catalogue keeps it. */
export function roundRun(run: Run): Run {
  return {
    ...run,
    ms: tenth(run.ms),
    passes: run.passes.map((pass) => ({ ...pass, ms: tenth(pass.ms) })),
  };
}

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
        /** How far it got; absent on a hang recorded before progress was. */
        readonly progress?: Progress;
        /** Its estimated warm cost (`estimateMs`); absent likewise. */
        readonly estimateMs?: number;
      }
    | { readonly kind: "failed"; readonly message: string };
  /** The issue filed for it, added by hand once it is filed. */
  readonly issue?: number;
};

/** A run of the search, as logged: its seed, when it began, how many cases it measured and how many were hits. */
export type RunRecord = {
  readonly source: { readonly seed: string } | { readonly enumeration: true };
  readonly cases: number;
  readonly hits?: number;
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
const EMPTY: Catalogue = { entries: [], hangs: [], runs: [] };

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

/**
 * How many times costlier a hit must be than its family's entry, or hang,
 * to replace it.
 */
export const MARGIN = 1.1;

/**
 * A hang's estimated warm cost, which ranks hangs: as estimated when it
 * was found (`estimateMs` of the harness), its deadline for a hang
 * recorded before estimates were, and without bound for a worker that
 * failed, which is a bug and outranks any hang.
 */
export function hangEstimate(hang: Hang): number {
  if (hang.reason.kind === "failed") return Infinity;
  return hang.reason.estimateMs ?? hang.reason.deadlineMs;
}

/** What a hit did to the catalogue. */
export type Change = "added" | "replaced" | "kept";

/**
 * `catalogue` with `hit`, a finished case or a hang, in its family's slot
 * if the slot is empty or holds a case it costs `MARGIN` times, and what
 * it did. A hang that replaces another keeps the issue filed for it. The
 * entries stay ranked by their cost per call, and the hangs by their
 * estimates.
 */
export function withHit(
  catalogue: Catalogue,
  hit: { readonly entry: Entry } | { readonly hang: Hang },
): { readonly catalogue: Catalogue; readonly change: Change } {
  if ("entry" in hit) {
    const key = familyKey(hit.entry.family);
    const there = catalogue.entries.find((e) => familyKey(e.family) === key);
    if (there !== undefined && perCall(hit.entry) < MARGIN * perCall(there)) {
      return { catalogue, change: "kept" };
    }
    const entries = [
      ...catalogue.entries.filter((e) => e !== there),
      hit.entry,
    ].sort((a, b) => perCall(b) - perCall(a));
    return {
      catalogue: { ...catalogue, entries },
      change: there === undefined ? "added" : "replaced",
    };
  }
  const key = familyKey(hit.hang.family);
  const there = catalogue.hangs.find((h) => familyKey(h.family) === key);
  if (
    there !== undefined &&
    !(hangEstimate(hit.hang) >= MARGIN * hangEstimate(there))
  ) {
    return { catalogue, change: "kept" };
  }
  const issue = there?.issue;
  const hang = issue === undefined ? hit.hang : { ...hit.hang, issue };
  const hangs = [...catalogue.hangs.filter((h) => h !== there), hang].sort(
    (a, b) => hangEstimate(b) - hangEstimate(a),
  );
  return {
    catalogue: { ...catalogue, hangs },
    change: there === undefined ? "added" : "replaced",
  };
}

/**
 * `catalogue` with `typing` recorded on the entry for the case `c`, if the
 * catalogue still holds one: a later hit may have replaced it meanwhile.
 */
export function withTyping(
  catalogue: Catalogue,
  c: {
    readonly have: string;
    readonly want: string;
    readonly settings: Settings;
  },
  typing: TypingSummary,
): Catalogue {
  return {
    ...catalogue,
    entries: catalogue.entries.map((e) =>
      sameCase(e, c) ? { ...e, typing } : e,
    ),
  };
}

/** Whether `x` is the case `c`: the same texts and settings. */
function sameCase(
  x: {
    readonly have: string;
    readonly want: string;
    readonly settings: Settings;
  },
  c: {
    readonly have: string;
    readonly want: string;
    readonly settings: Settings;
  },
): boolean {
  return (
    x.have === c.have &&
    x.want === c.want &&
    JSON.stringify(x.settings) === JSON.stringify(c.settings)
  );
}

/**
 * `catalogue` with the entry for `entry`'s case replaced by `entry`, the
 * same case measured again (after a change that made it cheaper, say), and
 * the entries ranked again; as it was if the catalogue no longer holds the
 * case. No margin applies: it is the case's own new cost.
 */
export function withEntryAgain(catalogue: Catalogue, entry: Entry): Catalogue {
  if (!catalogue.entries.some((e) => sameCase(e, entry))) return catalogue;
  const entries = catalogue.entries
    .map((e) => (sameCase(e, entry) ? entry : e))
    .sort((a, b) => perCall(b) - perCall(a));
  return { ...catalogue, entries };
}

/**
 * `catalogue` with the hang for the case `c` replaced by `hang`, the case
 * measured again, keeping its issue, or removed when `hang` is undefined
 * (the case now finishes), and the hangs ranked again.
 */
export function withHangAgain(
  catalogue: Catalogue,
  c: {
    readonly have: string;
    readonly want: string;
    readonly settings: Settings;
  },
  hang: Hang | undefined,
): Catalogue {
  const there = catalogue.hangs.find((h) => sameCase(h, c));
  if (there === undefined) return catalogue;
  const others = catalogue.hangs.filter((h) => h !== there);
  const kept =
    hang === undefined
      ? others
      : [
          ...others,
          there.issue === undefined ? hang : { ...hang, issue: there.issue },
        ];
  return {
    ...catalogue,
    hangs: kept.sort((a, b) => hangEstimate(b) - hangEstimate(a)),
  };
}

/** A keystroke that costs at least this is one the interface visibly waits on. */
export const SLOW_KEYSTROKE_MS = 100;

/** `catalogue` with `run` logged, in place of an earlier record of the same run (its source and start). */
export function withRun(catalogue: Catalogue, run: RunRecord): Catalogue {
  const same = (r: RunRecord) =>
    r.date === run.date &&
    JSON.stringify(r.source) === JSON.stringify(run.source);
  return {
    ...catalogue,
    runs: [...catalogue.runs.filter((r) => !same(r)), run],
  };
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

/** Writes `text` to `path` through a file beside it, renamed over it. */
export function writeAtomically(path: string | URL, text: string): void {
  const file = path instanceof URL ? fileURLToPath(path) : path;
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, file);
}

/** The markers between which docs/cost.md holds the generated table. */
export const TABLE_START =
  "<!-- catalogue table: generated by pnpm stress:search -->";
export const TABLE_END = "<!-- end of catalogue table -->";

/** A cell's text with the characters a Markdown table cannot hold escaped. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** A duration for the tables: milliseconds below a second, then seconds, minutes and hours. */
function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 120_000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms < 7_200_000) return `${Math.round(ms / 60_000)} min`;
  return `${Math.round(ms / 3_600_000).toLocaleString("en-US")} h`;
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
function typingCells(typing: TypingSummary | undefined): [string, string] {
  if (typing === undefined || typing.keystrokes === 0) return ["—", "—"];
  const slowest = Math.max(0, ...typing.costly.map(([, ms]) => ms));
  const slow = typing.costly.filter(([, ms]) => ms >= SLOW_KEYSTROKE_MS).length;
  const of = `${slow} of ${typing.keystrokes}${typing.complete ? "" : "+"}`;
  return [
    slowest === 0 ? `< ${COSTLY_KEYSTROKE_MS} ms` : duration(slowest),
    of,
  ];
}

/** The markers between which docs/cost.md holds the generated table of hangs. */
export const HANGS_START =
  "<!-- hangs table: generated by pnpm stress:search -->";
export const HANGS_END = "<!-- end of hangs table -->";

/** How far a hang got: the evaluation and the pass running at its deadline. */
function reached(hang: Hang): string {
  const { reason } = hang;
  if (reason.kind === "failed") return `failed: ${cell(reason.message)}`;
  if (reason.running === null) return "before its first pass";
  const { run, pass, precision } = reason.running;
  const of =
    reason.progress === undefined
      ? ""
      : ` of ${reason.progress.schedule.length}`;
  return `${run} pass ${pass + 1}${of} (${precision.toLocaleString("en-US")} digits)`;
}

/** The hangs as a Markdown table, ranked by their estimated cost. */
export function hangsTable(catalogue: Catalogue): string {
  const rows = catalogue.hangs.map((hang) => {
    const want = hang.want === "" ? "" : ` → \`${cell(hang.want)}\``;
    const estimate =
      hang.reason.kind === "failed"
        ? "—"
        : hang.reason.estimateMs === undefined
          ? `> ${duration(hang.reason.deadlineMs)}`
          : `≈ ${duration(hang.reason.estimateMs)}`;
    return [
      `\`${cell(hang.have)}\`${want}`,
      cell(hang.family.profile),
      cell(hang.family.pattern),
      reached(hang),
      estimate,
      hang.issue === undefined ? "—" : `#${hang.issue}`,
    ];
  });
  const header = [
    "Expression",
    "Settings",
    "Pattern",
    "Reached",
    "Estimated warm",
    "Issue",
  ];
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

/**
 * `doc` with the text between the markers `start` and `end` (the
 * catalogue table's by default) replaced by `table`, or `undefined` when
 * it has no such markers.
 */
export function withTable(
  doc: string,
  table: string,
  start = TABLE_START,
  end = TABLE_END,
): string | undefined {
  const from = doc.indexOf(start);
  const to = doc.indexOf(end);
  if (from < 0 || to < from) return undefined;
  return `${doc.slice(0, from + start.length)}\n\n${table}\n\n${doc.slice(to)}`;
}
