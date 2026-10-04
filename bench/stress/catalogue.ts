// The catalogue of the costliest expressions (docs/calculator-plan.md,
// tasks 8.2 and 8.3): what runs of the search have found, kept in
// bench/stress/catalogue.json for the stress suite and as a table in
// docs/cost.md for people. Nothing here measures; the search hands in what
// it measured, and this module decides what the catalogue keeps.
//
// A run adds to the catalogue rather than replacing it. Each entry is the
// costliest case found of its family (cases.ts), ranked by its warm cost
// per costly call. A case takes its family's slot when the catalogue has
// none for it and it costs at least the floor. Another run's entry is
// replaced only by a case that costs more per call measured back to back
// with it, in one lane, since only timings taken together compare; a
// run's own entries compare directly, measured under the same load.
// Cases that passed their deadline, or whose worker failed, are hangs,
// one per family, ranked by their estimated cost. `decide` makes these
// choices for one family at a time, so that a run writes the catalogue as
// each family's cases are measured rather than at its end, and making a
// choice again makes the same. Each run is logged with its seed (or the
// enumeration) and the indices of its cases, so that `--seed` and
// `--cases` replay it exactly.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Settings } from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import type { Machine, Progress, Run, Running, Typing } from "./harness.ts";

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

/** A run of the search, as logged. */
export type RunRecord = {
  readonly source: { readonly seed: string } | { readonly enumeration: true };
  readonly cases: number;
  /** The indices of the cases, as ranges: `0-99`, or `100-199,250` for a later merge. */
  readonly indices: string;
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

/** The run a source belongs to: a seed's sequence, or the enumeration. */
export type RunSource = RunRecord["source"];

/** Whether a case from `source` was found by the run `run`. */
export function fromRun(source: Source, run: RunSource): boolean {
  return "seed" in run
    ? "seed" in source && source.seed === run.seed
    : "enumeration" in source;
}

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

/**
 * How many times costlier a hang must be estimated to replace another
 * run's hang of its family: estimates from different runs compare only
 * roughly, and measuring two hangs back to back would cost two deadlines.
 */
export const HANG_MARGIN = 1.5;

/** What a run found of one family. */
export type Findings = {
  /** The costliest finished case that reached the floor, as the run measured it. */
  readonly best: Entry | undefined;
  /** The hang estimated costliest. */
  readonly worst: Hang | undefined;
  /** Whether every case of the family in the run's range is measured. */
  readonly complete: boolean;
};

/** A family's entry and hang, either of which may be absent. */
export type Slot = { readonly entry?: Entry; readonly hang?: Hang };

/** A case and an entry measured back to back: each as an entry, or `undefined` if it did not finish. */
export type Pair = {
  readonly candidate: Entry | undefined;
  readonly incumbent: Entry | undefined;
};

/** What the catalogue holds for a family after a run, and what the run still owes it. */
export type Decision = Slot & {
  /** An entry of another run that the best case must be measured beside first. */
  readonly pairWith: Entry | undefined;
};

/**
 * What a run's `findings` make of a family's slot. The incumbent is the
 * entry of another run: the one the catalogue holds now (`current`), or
 * else the one it held when the run began (`base`), which the run may
 * since have replaced. The best case takes the slot when there is no
 * incumbent; when there is one, it must be measured beside it (`pair`),
 * once the family's cases are all measured so that only the best is,
 * and takes the slot if it costs more per call there. Until then the
 * slot stays as it is. A hang takes the hang slot when there is no other
 * run's hang there, or when it is estimated `HANG_MARGIN` times costlier
 * than it, keeping the issue filed for the slot. The decision depends on
 * the findings, the base and the incumbent alone, so making it again
 * makes the same: the run's own entries in `current` are replaced, not
 * compared.
 */
export function decide(
  run: RunSource,
  findings: Findings,
  base: Slot,
  current: Slot,
  pair: (best: Entry, incumbent: Entry) => Pair | undefined,
): Decision {
  const other = <T extends { readonly source: Source }>(x: T | undefined) =>
    x !== undefined && !fromRun(x.source, run) ? x : undefined;
  let entry = current.entry;
  let pairWith: Entry | undefined;
  const { best, worst } = findings;
  if (best !== undefined) {
    const incumbent = other(current.entry) ?? other(base.entry);
    if (incumbent === undefined) {
      entry = best;
    } else if (findings.complete) {
      const measured = pair(best, incumbent);
      if (measured === undefined) {
        pairWith = incumbent;
      } else {
        const { candidate, incumbent: again } = measured;
        const wins =
          candidate !== undefined &&
          (again === undefined || perCall(candidate) > perCall(again));
        entry = wins ? candidate : incumbent;
      }
    }
  }
  let hang = current.hang;
  if (worst !== undefined) {
    const incumbent = other(current.hang) ?? other(base.hang);
    const issue = current.hang?.issue ?? incumbent?.issue;
    const replaces =
      incumbent === undefined ||
      hangEstimate(worst) > HANG_MARGIN * hangEstimate(incumbent);
    hang = replaces
      ? issue === undefined
        ? worst
        : { ...worst, issue }
      : incumbent;
  }
  return {
    ...(entry === undefined ? {} : { entry }),
    ...(hang === undefined ? {} : { hang }),
    pairWith,
  };
}

/** The slot of the family `key` in `catalogue`. */
export function slotOf(catalogue: Catalogue, key: string): Slot {
  const entry = catalogue.entries.find((e) => familyKey(e.family) === key);
  const hang = catalogue.hangs.find((h) => familyKey(h.family) === key);
  return {
    ...(entry === undefined ? {} : { entry }),
    ...(hang === undefined ? {} : { hang }),
  };
}

/**
 * `catalogue` with the family `key`'s slot set to `slot`, the entries
 * ranked by their cost per call and the hangs by their estimates.
 */
export function withSlot(
  catalogue: Catalogue,
  key: string,
  slot: Slot,
): Catalogue {
  const entries = catalogue.entries.filter((e) => familyKey(e.family) !== key);
  const hangs = catalogue.hangs.filter((h) => familyKey(h.family) !== key);
  if (slot.entry !== undefined) entries.push(slot.entry);
  if (slot.hang !== undefined) hangs.push(slot.hang);
  return {
    ...catalogue,
    entries: entries.sort((a, b) => perCall(b) - perCall(a)),
    hangs: hangs.sort((a, b) => hangEstimate(b) - hangEstimate(a)),
  };
}

/** A keystroke that costs at least this is one the interface visibly waits on. */
export const SLOW_KEYSTROKE_MS = 100;

/** `catalogue` with `run` logged, in place of an earlier record of its run. */
export function withRun(catalogue: Catalogue, run: RunRecord): Catalogue {
  const same = (r: RunRecord) =>
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

/**
 * Writes `catalogue` to `path` as JSON, whole or not at all: to a file
 * beside it, renamed over it, so that a process killed in the middle
 * leaves the catalogue as it was.
 */
export function writeCatalogue(path: string | URL, catalogue: Catalogue): void {
  writeAtomically(path, `${JSON.stringify(catalogue, null, 2)}\n`);
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
