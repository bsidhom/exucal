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
//
// An entry's settings are stored as the app stores its own, in the
// envelope of docs/settings-storage.md with the format version, and read
// back through the same migrations (`settingsFromStored`), so that a
// step that reshapes the settings (S2 nested the mode, S3 renamed the
// limits) leaves every catalogued case readable, as it leaves every
// user's storage readable: the catalogue is data the settings module
// owns the shape of, not a copy of it. The first catalogue stored the
// fields bare, which reads as version 1, as a bare object in the
// browser does. The build string the envelope carries is the commit the
// case was measured at.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  settingsFromStored,
  storedSettings,
  type Settings,
} from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import type { Machine, Progress, Run, Running, Typing } from "./harness.ts";
import { UNCERTIFIED } from "../../src/outcome.ts";

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

/**
 * What of a result's line `verify.ts` holds an entry to: the line from
 * its relation on (`≈ 0 K`, `= 3 ft + 2 in`), without the note after
 * the value. The echo of the expression before the relation is the
 * printer's writing of what was typed and no value, and changes with
 * the printer; the note states a bound or the digits certified, which a
 * kernel made sharper tightens without changing the value. A line with
 * no relation, which no result has, is held whole.
 */
export function comparableLine(line: string): string {
  let at = -1;
  for (const relation of RELATIONS) {
    const i = line.indexOf(relation);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  const result = at < 0 ? line : line.slice(at + 1);
  return result.replace(
    / \((?:within [^()]*|\d+ of \d+ digits are certain|the digits are not certified)\)$/,
    "",
  );
}

/** The relations a line is written with (outcome.ts), each with the spaces around it. */
const RELATIONS = [" = ", " ≈ ", ` ${UNCERTIFIED} `];

/**
 * `n` of `entries` chosen the same way on every machine and every run,
 * whatever order they come in: the entries ranked by a hash of their
 * case (FNV-1a over the profile, the have and the want), the first `n`
 * taken, so that `pnpm stress --sample <n>` is a spot check that can be
 * repeated and compared. All of them when `n` is not less than their
 * count.
 */
export function sample<T extends Pick<Entry, "family" | "have" | "want">>(
  entries: readonly T[],
  n: number,
): T[] {
  const keyed = entries.map((entry) => ({
    entry,
    hash: fnv1a(`${entry.family.profile}\n${entry.have}\n${entry.want}`),
  }));
  keyed.sort((a, b) => a.hash - b.hash || compareText(a.entry, b.entry));
  return keyed.slice(0, Math.max(0, n)).map((k) => k.entry);
}

/** FNV-1a over the UTF-16 units of `text`, 32 bits: a fixed hash with no dependency, for an order that is the same everywhere. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** The order of two cases' texts, for a tie of the hash. */
function compareText(
  a: Pick<Entry, "family" | "have" | "want">,
  b: Pick<Entry, "family" | "have" | "want">,
): number {
  const ka = `${a.family.profile}\n${a.have}\n${a.want}`;
  const kb = `${b.family.profile}\n${b.have}\n${b.want}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
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
 * The warm cost at which a finished case is a hit: a second, which stays
 * among the costliest when measured again, where one machine's noise is
 * milliseconds.
 */
export const FLOOR_MS = 1000;

/**
 * How long a case may run, cold and warm, before it is a hang. Fixed, as
 * the floor is, so that every run of the search records hits by the same
 * measure and any run can be committed.
 */
export const DEADLINE_MS = 120_000;

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

/** An entry or a hang as the file holds it: its settings stored, whatever shape an earlier version gave them. */
type Stored<T extends { readonly settings: Settings }> = Omit<T, "settings"> & {
  readonly settings: unknown;
};

/** The catalogue as the file holds it. */
type StoredCatalogue = {
  readonly entries: readonly Stored<Entry>[];
  readonly hangs: readonly Stored<Hang>[];
  readonly runs: readonly RunRecord[];
};

/** The catalogue at `path`, or the empty one when there is no file; each case's settings read through the settings migrations. */
export function readCatalogue(path: string | URL): Catalogue {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return EMPTY;
    throw e;
  }
  return catalogueFromStored(JSON.parse(text));
}

/** `stored`, the parsed file, as the catalogue: the settings of each entry and hang migrated and validated. */
export function catalogueFromStored(stored: unknown): Catalogue {
  const { entries, hangs, runs } = stored as StoredCatalogue;
  const read = <T extends { readonly settings: Settings }>(c: Stored<T>): T =>
    ({ ...c, settings: settingsFromStored(c.settings) }) as T;
  return { entries: entries.map(read), hangs: hangs.map(read), runs };
}

/** `catalogue` as the file holds it, as text: each case's settings in the storage envelope, saved by the commit that measured it. */
export function catalogueText(catalogue: Catalogue): string {
  const store = <
    T extends { readonly settings: Settings; readonly commit: Commit },
  >(
    c: T,
  ): Stored<T> => ({
    ...c,
    settings: storedSettings(c.settings, buildOf(c.commit)),
  });
  const stored: StoredCatalogue = {
    entries: catalogue.entries.map(store),
    hangs: catalogue.hangs.map(store),
    runs: catalogue.runs,
  };
  return `${JSON.stringify(stored, null, 2)}\n`;
}

/** `commit` as a build string, as build-id.ts writes one: the hash, `-dirty` when the tree had changes. */
function buildOf(commit: Commit): string {
  return commit.dirty ? `${commit.hash}-dirty` : commit.hash;
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
