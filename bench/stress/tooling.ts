// What the stress tools share (docs/calculator-plan.md, task 8.3): the
// commit a measurement was taken at, a case measured into the form the
// journal keeps, and the formatting of the files a run writes.
//
// Commands run as security rules require (ARCHITECTURE.md, "Security"):
// git and Prettier through `execFileSync` and `spawn` with an argument
// array and no shell, git's lists read NUL-separated.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

/**
 * `text` as the repository's Prettier formats the file `file`: Prettier
 * reads it on stdin, in a process of its own so that the lanes are not
 * held, and the caller writes the result once, atomically, so that the
 * file on disk is formatted and whole at every moment (a `--write` would
 * truncate the file and fill it again, and a snapshot taken between the
 * two would hold a file cut short).
 */
export function formatText(text: string, file: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        fileURLToPath(new URL("node_modules/prettier/bin/prettier.cjs", root)),
        "--stdin-filepath",
        fileURLToPath(file),
      ],
      { cwd: fileURLToPath(root), stdio: ["pipe", "pipe", "pipe"] },
    );
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString("utf8"));
      else {
        reject(
          new Error(
            `Prettier exited with ${code}: ${Buffer.concat(err).toString("utf8")}`,
          ),
        );
      }
    });
    child.stdin.end(text);
  });
}

/** The files whose contents decide what a measurement gives: the code, the tools, the catalogue and the dependencies. */
const KEYED = ["src", "bench/stress", "package.json", "pnpm-lock.yaml"];

/**
 * A key for the code and the catalogue as they stand: a hash of the path
 * and contents of every file, tracked or new, under `KEYED`, the runs'
 * journals left out, so that a run keyed by it resumes only while none of
 * them has changed, and a commit that changes none of them (a snapshot
 * of a run) leaves it as it was.
 */
export function treeKey(): string {
  const cwd = fileURLToPath(root);
  const listed = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ...KEYED,
      ":(exclude)bench/stress/runs",
    ],
    { cwd, encoding: "utf8", maxBuffer: 1 << 28 },
  );
  const paths = [...new Set(listed.split("\0").filter((p) => p !== ""))].sort();
  const hash = createHash("sha256");
  for (const path of paths) {
    hash.update(`${path}\0`);
    try {
      hash.update(readFileSync(new URL(path, root)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      hash.update("deleted");
    }
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 16);
}
