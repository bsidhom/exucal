// What the stress tools share (docs/calculator-plan.md, task 8.3): the
// commit a measurement was taken at, a case measured into the form the
// journal keeps, and the formatting of the files a run writes.
//
// Commands run as security rules require (ARCHITECTURE.md, "Security"):
// git and Prettier through `execFile` with an argument array, git's list
// read NUL-separated.

import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { roundRun, type Commit, type Entry } from "./catalogue.ts";
import { measure, type Case, type Measurement } from "./harness.ts";
import type { Outcome } from "./journal.ts";

/** The repository's root. */
export const root = new URL("../../", import.meta.url);

/** The catalogue, and the doc that holds its tables. */
export const CATALOGUE = new URL("bench/stress/catalogue.json", root);
export const DOC = new URL("docs/cost.md", root);

/** Where the runs' journals are kept (ignored by git). */
export const RUNS = new URL("bench/stress/runs/", root);

/** The commit the tree is at, and whether tracked files have changed. */
export function currentCommit(): Commit {
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

/** A tenth of a millisecond's precision, as the catalogue keeps timings. */
function tenth(ms: number): number {
  return Math.round(ms * 10) / 10;
}

/** `m` with its timings rounded, as the journal and catalogue keep them. */
function rounded(m: Measurement): Measurement {
  if (m.status === "done") {
    return { ...m, cold: roundRun(m.cold), warm: roundRun(m.warm) };
  }
  return {
    ...m,
    cold: m.cold === undefined ? undefined : roundRun(m.cold),
    progress: {
      schedule: m.progress.schedule,
      passes: m.progress.passes.map((p) => ({ ...p, ms: tenth(p.ms) })),
      runningMs: tenth(m.progress.runningMs),
    },
  };
}

/** `c` measured under `deadlineMs`, or the failure of its worker. */
export async function measureCase(
  c: Case,
  deadlineMs: number,
): Promise<Outcome> {
  try {
    return { measured: rounded(await measure(c, deadlineMs)) };
  } catch (e) {
    return { failed: e instanceof Error ? e.message : String(e) };
  }
}

/** The case of `entry`, without the rest of its record. */
export function caseOfEntry(entry: Entry): Case {
  return { have: entry.have, want: entry.want, settings: entry.settings };
}

/** Formats `files` with the repository's Prettier, without blocking the lanes. */
export async function formatFiles(files: readonly URL[]): Promise<void> {
  await promisify(execFile)(
    process.execPath,
    [
      fileURLToPath(new URL("node_modules/prettier/bin/prettier.cjs", root)),
      "--write",
      "--log-level=warn",
      ...files.map((file) => fileURLToPath(file)),
    ],
    { cwd: fileURLToPath(root) },
  );
}

/**
 * A key for the code and the catalogue as they stand: a hash of the commit,
 * the changes to tracked files beside it (`git diff HEAD`, read as bytes)
 * and the catalogue's text, so that a run keyed by it resumes only while
 * none of them has changed.
 */
export function treeKey(): string {
  const cwd = fileURLToPath(root);
  const hash = createHash("sha256");
  hash.update(execFileSync("git", ["rev-parse", "HEAD"], { cwd }));
  hash.update(
    execFileSync("git", ["diff", "HEAD", "--binary"], {
      cwd,
      maxBuffer: 1 << 30,
    }),
  );
  hash.update(readFileSync(CATALOGUE));
  return hash.digest("hex").slice(0, 16);
}
