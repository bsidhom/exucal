// What the stress tools share (docs/calculator-plan.md, task 8.3): the
// commit a measurement was taken at, a case measured into the form the
// catalogue keeps, and the one way the catalogue and its tables are
// changed (`update`).
//
// Commands run as security rules require (ARCHITECTURE.md, "Security"):
// git and Prettier through `execFileSync` and `spawn` with an argument
// array and no shell, git's lists read NUL-separated.

import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  HANGS_END,
  HANGS_START,
  catalogueTable,
  hangsTable,
  readCatalogue,
  roundRun,
  withTable,
  catalogueText,
  writeAtomically,
  type Catalogue,
  type Commit,
} from "./catalogue.ts";
import { measure, type Case, type Measurement } from "./harness.ts";

/** What measuring a case gave: a measurement, or the failure of its worker. */
export type Outcome =
  { readonly measured: Measurement } | { readonly failed: string };

/** The repository's root. */
export const root = new URL("../../", import.meta.url);

/** The catalogue, and the doc that holds its tables. */
export const CATALOGUE = new URL("bench/stress/catalogue.json", root);
const DOC = new URL("docs/cost.md", root);

/** The lock taken while the catalogue and its tables are changed (ignored by git). */
const LOCK = new URL("bench/stress/catalogue.lock", root);

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

/** `m` with its timings rounded, as the catalogue keeps them. */
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

/**
 * `text` as the repository's Prettier formats the file `file`: Prettier
 * reads it on stdin, in a process of its own so that the lanes are not
 * held, and the caller writes the result once, atomically, so that the
 * file on disk is formatted and whole at every moment (a `--write` would
 * truncate the file and fill it again, and a snapshot taken between the
 * two would hold a file cut short).
 */
function formatText(text: string, file: URL): Promise<string> {
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

/** A lock held longer than this is left by a process that is stuck or gone: no update takes it. */
const STALE_LOCK_MS = 60_000;

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
 * Takes the catalogue's lock, waiting while another process holds it. A
 * lock whose process on this host is gone, or that has been held past
 * `STALE_LOCK_MS`, is taken over. Gives its release.
 */
async function takeLock(): Promise<() => void> {
  const me = JSON.stringify({ host: hostname(), pid: process.pid });
  for (;;) {
    try {
      writeFileSync(LOCK, me, { flag: "wx" });
      return () => rmSync(LOCK, { force: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    let stale = false;
    try {
      const holder = JSON.parse(readFileSync(LOCK, "utf8")) as {
        host?: string;
        pid?: number;
      };
      stale =
        (holder.host === hostname() &&
          typeof holder.pid === "number" &&
          !alive(holder.pid)) ||
        Date.now() - statSync(LOCK).mtimeMs > STALE_LOCK_MS;
    } catch {
      // Gone already, or being written: try again.
    }
    if (stale) rmSync(LOCK, { force: true });
    else await sleep(20 + Math.random() * 80);
  }
}

/**
 * Changes the catalogue by `change`, under the lock, so that processes
 * running in one working tree at once take turns: the catalogue read as
 * it is now, changed, and it and the tables of docs/cost.md formatted and
 * then each written whole, through a file renamed over it, so that a copy
 * taken at any moment, or a process stopped at any moment, leaves both
 * files formatted and complete. Gives the catalogue written.
 */
export async function update(
  change: (catalogue: Catalogue) => Catalogue,
): Promise<Catalogue> {
  const release = await takeLock();
  try {
    const catalogue = change(readCatalogue(CATALOGUE));
    const text = await formatText(catalogueText(catalogue), CATALOGUE);
    let doc: string | undefined;
    if (existsSync(DOC)) {
      doc = withTable(readFileSync(DOC, "utf8"), catalogueTable(catalogue));
      if (doc !== undefined) {
        doc =
          withTable(doc, hangsTable(catalogue), HANGS_START, HANGS_END) ?? doc;
        doc = await formatText(doc, DOC);
      }
    }
    writeAtomically(CATALOGUE, text);
    if (doc !== undefined) writeAtomically(DOC, doc);
    return catalogue;
  } finally {
    release();
  }
}
