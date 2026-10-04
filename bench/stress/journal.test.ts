import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { DEFAULT_SETTINGS } from "../../src/settings.ts";
import {
  append,
  caseKey,
  formatRanges,
  inShard,
  measureFile,
  parseRanges,
  parseShard,
  readJournal,
  type JournalRecord,
} from "./journal.ts";

test("shards split the indices among them, and name their files", () => {
  assert.deepEqual(parseShard("1/3"), { index: 1, count: 3 });
  assert.deepEqual(parseShard("0/1"), { index: 0, count: 1 });
  for (const bad of ["3/3", "1/0", "-1/2", "1", "a/b", "1/2/3"]) {
    assert.equal(parseShard(bad), undefined, bad);
  }
  const shards = [0, 1, 2].map((index) => ({ index, count: 3 }));
  for (let i = 0; i < 30; i++) {
    assert.equal(shards.filter((s) => inShard(i, s)).length, 1);
    assert.ok(inShard(i, undefined));
  }
  assert.equal(measureFile(undefined), "measure-all.jsonl");
  assert.equal(measureFile(shards[2]), "measure-2-of-3.jsonl");
});

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

test("the journal reads every file's records, skipping a line cut short", () => {
  const path = mkdtempSync(join(tmpdir(), "journal-"));
  try {
    const dir = pathToFileURL(`${path}/runs/`);
    assert.deepEqual(readJournal(dir), { records: [], skipped: 0 });
    const merged = (indices: string): JournalRecord => ({
      kind: "merged",
      indices,
      date: "d",
    });
    append(dir, "measure-1-of-2.jsonl", merged("1"));
    append(dir, "measure-0-of-2.jsonl", merged("0"));
    append(dir, "measure-0-of-2.jsonl", merged("2"));
    // A process killed in the middle of a line leaves it unfinished.
    appendFileSync(join(path, "runs", "measure-1-of-2.jsonl"), '{"kind":"me');
    appendFileSync(join(path, "runs", "notes.txt"), "not a journal\n");
    const journal = readJournal(dir);
    assert.deepEqual(
      journal.records.map((r) => (r.kind === "merged" ? r.indices : "")),
      ["0", "2", "1"],
    );
    assert.equal(journal.skipped, 1);
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
