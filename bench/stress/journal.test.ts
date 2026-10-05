import assert from "node:assert/strict";
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { DEFAULT_SETTINGS } from "../../src/settings.ts";
import {
  append,
  caseKey,
  formatRanges,
  latestRun,
  lock,
  parseRanges,
  readJournal,
  readJson,
  repair,
  writeJson,
  type JournalRecord,
} from "./journal.ts";

/** A directory of its own for `body`, removed afterwards. */
function inTemporary(body: (dir: URL, path: string) => void): void {
  const path = mkdtempSync(join(tmpdir(), "journal-"));
  try {
    body(pathToFileURL(`${path}/run/`), join(path, "run"));
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
}

test("ranges are compact and read back", () => {
  assert.equal(formatRanges([]), "");
  assert.equal(formatRanges([5, 0, 1, 2, 3, 9, 7, 8, 3]), "0-3,5,7-9");
  for (const indices of [[], [0], [0, 1, 2, 3, 5, 7, 8, 9], [4, 10, 11]]) {
    assert.deepEqual(parseRanges(formatRanges(indices)), indices);
  }
});

test("a case's key tells cases apart by texts and settings", () => {
  const c = { have: "1 m", want: "ft", settings: DEFAULT_SETTINGS };
  assert.equal(caseKey(c), caseKey({ ...c }));
  assert.notEqual(caseKey(c), caseKey({ ...c, want: "in" }));
  assert.notEqual(
    caseKey(c),
    caseKey({ ...c, settings: { ...DEFAULT_SETTINGS, digits: 32 } }),
  );
});

test("the journal reads its records back, skipping a line cut short", () => {
  inTemporary((dir, path) => {
    assert.deepEqual(readJournal(dir), { records: [], skipped: 0 });
    const check = (n: number): JournalRecord => ({
      kind: "check",
      case: `case ${n}`,
      date: "d",
      failed: "no",
    });
    append(dir, check(1));
    append(dir, check(2));
    // A process killed in the middle of a line leaves it unfinished.
    appendFileSync(join(path, "journal.jsonl"), '{"kind":"ch');
    const journal = readJournal(dir);
    assert.deepEqual(
      journal.records.map((r) => (r.kind === "check" ? r.case : "")),
      ["case 1", "case 2"],
    );
    assert.equal(journal.skipped, 1);
    assert.equal(readJson(dir, "run.json"), undefined);
    writeJson(dir, "run.json", { target: 40 });
    assert.deepEqual(readJson(dir, "run.json"), { target: 40 });
  });
});

test("a run's lock is held by one live process, and taken over from a dead one", () => {
  inTemporary((dir, path) => {
    const first = lock(dir);
    assert.ok("release" in first);
    const second = lock(dir);
    assert.ok("heldBy" in second);
    assert.match(second.heldBy, new RegExp(`pid ${process.pid}$`));
    first.release();
    const third = lock(dir);
    assert.ok("release" in third);
    third.release();
    // A lock whose process is gone, killed before it released it.
    writeFileSync(
      join(path, "lock"),
      JSON.stringify({ host: hostname(), pid: 2 ** 22 + 12345 }),
    );
    const taken = lock(dir);
    assert.ok("release" in taken);
    assert.match(
      readFileSync(join(path, "lock"), "utf8"),
      new RegExp(`"pid":${process.pid}`),
    );
    taken.release();
  });
});

test("a journal copied in the middle of an append resumes without losing the next record", () => {
  inTemporary((dir, path) => {
    const check = (n: number): JournalRecord => ({
      kind: "check",
      case: `case ${n}`,
      date: "d",
      failed: "no",
    });
    assert.equal(repair(dir), 0, "no journal: nothing to cut");
    append(dir, check(1));
    assert.equal(repair(dir), 0, "whole lines: nothing to cut");
    // The copy holds the start of the second record and no newline.
    appendFileSync(join(path, "journal.jsonl"), '{"kind":"check","ca');
    assert.equal(repair(dir), 19);
    append(dir, check(3));
    assert.deepEqual(
      readJournal(dir).records.map((r) => (r.kind === "check" ? r.case : "")),
      ["case 1", "case 3"],
    );
    assert.equal(readJournal(dir).skipped, 0);
  });
});

test("the run to resume is the one whose journal changed last", () => {
  inTemporary((dir, path) => {
    const runs = new URL("../runs/", dir);
    const root = join(path, "..", "runs");
    assert.equal(
      latestRun(runs, () => true),
      undefined,
    );
    for (const [name, seconds] of [
      ["0123456789abcdef", 100],
      ["fedcba9876543210", 300],
      ["stress-1234", 400],
      ["enumeration", 200],
    ] as const) {
      mkdirSync(join(root, name), { recursive: true });
      const file = join(root, name, "journal.jsonl");
      writeFileSync(file, "");
      utimesSync(file, seconds, seconds);
    }
    const searches = (name: string) => !name.startsWith("stress-");
    assert.equal(latestRun(runs, searches), "fedcba9876543210");
    assert.equal(
      latestRun(runs, () => true),
      "stress-1234",
    );
    // A run with no journal yet is dated by its run.json.
    mkdirSync(join(root, "aaaaaaaaaaaaaaaa"));
    writeFileSync(join(root, "aaaaaaaaaaaaaaaa", "run.json"), "{}");
    assert.equal(latestRun(runs, searches), "aaaaaaaaaaaaaaaa");
  });
});
