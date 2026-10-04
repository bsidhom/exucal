import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import {
  EMPTY,
  TABLE_END,
  TABLE_START,
  catalogueTable,
  familyKey,
  logRun,
  merge,
  mergeHangs,
  withTable,
  type Catalogue,
  type Entry,
  type Hang,
} from "./catalogue.ts";
import type { Machine, Run } from "./harness.ts";

const MACHINE: Machine = {
  node: "v24",
  cpu: "test",
  cores: 1,
  platform: "linux",
};
const COMMIT = { hash: "0".repeat(40), dirty: false };

function family(pattern: string, functions: string[] = ["gamma"]): Family {
  return { pattern, functions, classes: ["exact"], profile: "default" };
}

function run(ms: number): Run {
  return {
    ms,
    passes: [{ precision: 18, ms }],
    outcome: { kind: "result", line: "x ≈ 0", warnings: 0 },
  };
}

/** An entry of `f` whose warm run took `ms` over `calls` calls. */
function entry(f: Family, have: string, ms: number, calls = 2): Entry {
  return {
    family: f,
    have,
    want: "",
    settings: DEFAULT_SETTINGS,
    calls,
    source: { seed: "0123456789abcdef", index: 0 },
    commit: COMMIT,
    date: "2026-10-05T00:00:00.000Z",
    machine: MACHINE,
    cold: run(ms * 2),
    warm: run(ms),
  };
}

const A = family("cancel");
const B = family("identity:beta-gamma", ["beta", "gamma"]);
const C = family("edge:floor/cancel");

const CATALOGUE: Catalogue = {
  entries: [entry(A, "gamma(a) - gamma(a)", 4000), entry(C, "floor(…)", 2000)],
  hangs: [],
  runs: [],
};

test("a case of a new family joins when it reaches the floor", () => {
  const joining = entry(B, "beta(a, b) - …", 3000);
  const report = merge(CATALOGUE, [joining], new Map(), 1000);
  assert.deepEqual(report.added, [joining]);
  assert.deepEqual(report.replaced, []);
  assert.deepEqual(
    report.catalogue.entries.map((e) => e.have),
    ["gamma(a) - gamma(a)", "beta(a, b) - …", "floor(…)"],
  );
  // Below the floor, it does not.
  const cheap = merge(CATALOGUE, [entry(B, "beta", 900)], new Map(), 1000);
  assert.deepEqual(cheap.added, []);
  assert.deepEqual(cheap.catalogue.entries, CATALOGUE.entries);
});

test("an entry is replaced only by a costlier case of its family, measured against it in the same run", () => {
  const challenger = entry(A, "gamma(b) - gamma(b)", 5000);
  // The entry measured again costs less per call: replaced.
  const again = new Map([
    [familyKey(A), entry(A, "gamma(a) - gamma(a)", 4500)],
  ]);
  const replaced = merge(CATALOGUE, [challenger], again, 1000);
  assert.deepEqual(replaced.replaced, [[CATALOGUE.entries[0], challenger]]);
  assert.equal(replaced.catalogue.entries[0], challenger);
  // It costs more: kept as it was.
  const stronger = new Map([
    [familyKey(A), entry(A, "gamma(a) - gamma(a)", 5500)],
  ]);
  const kept = merge(CATALOGUE, [challenger], stronger, 1000);
  assert.deepEqual(kept.replaced, []);
  assert.deepEqual(kept.catalogue.entries, CATALOGUE.entries);
  // Not measured again in this run: no comparison, so kept.
  const unmeasured = merge(CATALOGUE, [challenger], new Map(), 1000);
  assert.deepEqual(unmeasured.catalogue.entries, CATALOGUE.entries);
  // The cost compared is per call: more calls cost less each.
  const diluted = entry(A, "gamma(b) - gamma(b) + …", 6000, 4);
  assert.deepEqual(merge(CATALOGUE, [diluted], again, 1000).replaced, []);
});

test("a merge leaves the other entries as they were", () => {
  const challenger = entry(A, "gamma(b) - gamma(b)", 5000);
  const again = new Map([[familyKey(A), entry(A, "gamma(a) - gamma(a)", 100)]]);
  const report = merge(CATALOGUE, [challenger], again, 1000);
  const untouched = report.catalogue.entries.find((e) => e.family === C);
  assert.equal(untouched, CATALOGUE.entries[1]);
});

test("a hang joins when its family has none, and runs are logged in order", () => {
  const hang = (f: Family, have: string): Hang => ({
    family: f,
    have,
    want: "",
    settings: DEFAULT_SETTINGS,
    source: { enumeration: 3 },
    commit: COMMIT,
    date: "2026-10-05T00:00:00.000Z",
    machine: MACHINE,
    reason: { kind: "deadline", deadlineMs: 120_000, running: null },
  });
  const once = mergeHangs(EMPTY, [
    hang(A, "first"),
    hang(A, "second"),
    hang(B, "third"),
  ]);
  assert.deepEqual(
    once.hangs.map((h) => h.have),
    ["first", "third"],
  );
  const record = {
    source: { seed: "0123456789abcdef" },
    cases: 16,
    commit: COMMIT,
    date: "d",
    machine: MACHINE,
  };
  const logged = logRun(logRun(once, record), { ...record, cases: 20 });
  assert.deepEqual(
    logged.runs.map((r) => r.cases),
    [16, 20],
  );
});

test("the table replaces the text between its markers, and only there", () => {
  const doc = `# Costs\n\nBefore.\n\n${TABLE_START}\n\nSTALE TABLE\n\n${TABLE_END}\n\nAfter.\n`;
  const table = catalogueTable(CATALOGUE);
  assert.match(table, /^\| Expression \| Settings \| Pattern \|/);
  assert.match(
    table,
    /`gamma\(a\) - gamma\(a\)` \| default \| cancel \| 8\.0 s \| 4\.0 s \| 2\.0 s \| 1 \|/,
  );
  const updated = withTable(doc, table)!;
  assert.ok(updated.startsWith("# Costs\n\nBefore.\n\n"));
  assert.ok(updated.endsWith(`${TABLE_END}\n\nAfter.\n`));
  assert.ok(updated.includes(table) && !updated.includes("STALE TABLE"));
  assert.equal(withTable("no markers", table), undefined);
});
