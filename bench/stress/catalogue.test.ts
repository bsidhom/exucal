import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SETTINGS } from "../../src/settings.ts";
import type { Family } from "./cases.ts";
import {
  HANGS_END,
  HANGS_START,
  TABLE_END,
  TABLE_START,
  catalogueTable,
  decide,
  familyKey,
  hangEstimate,
  hangsTable,
  slotOf,
  summarizeTyping,
  withRun,
  withSlot,
  withTable,
  type Catalogue,
  type Entry,
  type Findings,
  type Hang,
  type Pair,
  type RunSource,
  type Source,
} from "./catalogue.ts";
import type { Machine, Run } from "./harness.ts";

const MACHINE: Machine = {
  node: "v24",
  cpu: "test",
  cores: 1,
  platform: "linux",
};
const COMMIT = { hash: "0".repeat(40), dirty: false };
const RUN: RunSource = { seed: "0123456789abcdef" };
const OURS: Source = { seed: "0123456789abcdef", index: 0 };
const THEIRS: Source = { enumeration: 3 };

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
function entry(
  f: Family,
  have: string,
  ms: number,
  source: Source = THEIRS,
  calls = 2,
): Entry {
  return {
    family: f,
    have,
    want: "",
    settings: DEFAULT_SETTINGS,
    calls,
    source,
    commit: COMMIT,
    date: "2026-10-05T00:00:00.000Z",
    machine: MACHINE,
    cold: run(ms * 2),
    warm: run(ms),
  };
}

/** A hang of `f` estimated at `estimateMs`. */
function hang(
  f: Family,
  have: string,
  estimateMs: number | undefined,
  source: Source = THEIRS,
): Hang {
  return {
    family: f,
    have,
    want: "",
    settings: DEFAULT_SETTINGS,
    source,
    commit: COMMIT,
    date: "d",
    machine: MACHINE,
    reason: {
      kind: "deadline",
      deadlineMs: 120_000,
      running: { run: "cold", pass: 9, precision: 9852 },
      ...(estimateMs === undefined
        ? {}
        : {
            progress: { schedule: Array(10).fill(1), passes: [], runningMs: 1 },
            estimateMs,
          }),
    },
  };
}

const A = family("cancel");
const B = family("identity:beta-gamma", ["beta", "gamma"]);
const noPair = () => undefined;

function findings(
  best: Entry | undefined,
  complete = true,
  worst?: Hang,
): Findings {
  return { best, worst, complete };
}

test("a family the catalogue lacks takes the run's best case at once", () => {
  const best = entry(A, "gamma(a) - gamma(a)", 3000, OURS);
  for (const complete of [false, true]) {
    const decided = decide(RUN, findings(best, complete), {}, {}, noPair);
    assert.equal(decided.entry, best);
    assert.equal(decided.pairWith, undefined);
  }
});

test("another run's entry is replaced only by a case measured beside it", () => {
  const incumbent = entry(A, "gamma(b) - gamma(b)", 4000);
  const best = entry(A, "gamma(a) - gamma(a)", 5000, OURS);
  const slot = { entry: incumbent };
  // While the family's cases are still coming in, the slot waits.
  assert.deepEqual(decide(RUN, findings(best, false), slot, slot, noPair), {
    entry: incumbent,
    pairWith: undefined,
  });
  // Once they are all in, the best is owed a pair with the incumbent.
  const owed = decide(RUN, findings(best), slot, slot, noPair);
  assert.equal(owed.entry, incumbent);
  assert.equal(owed.pairWith, incumbent);
  // Measured beside it: costlier per call takes the slot, cheaper does not.
  const paired = (candidate: number, again: number) => (): Pair => ({
    candidate: entry(A, best.have, candidate, OURS),
    incumbent: entry(A, incumbent.have, again),
  });
  const wins = decide(RUN, findings(best), slot, slot, paired(5000, 4500));
  assert.equal(wins.entry?.have, best.have);
  assert.equal(wins.entry?.warm.ms, 5000, "the pair's timings are kept");
  const loses = decide(RUN, findings(best), slot, slot, paired(4400, 4500));
  assert.equal(loses.entry, incumbent);
  // An incumbent that no longer finishes cannot hold the slot.
  const gone = decide(RUN, findings(best), slot, slot, () => ({
    candidate: entry(A, best.have, 5000, OURS),
    incumbent: undefined,
  }));
  assert.equal(gone.entry?.have, best.have);
});

test("deciding again decides the same: the run's own entries are replaced, not compared", () => {
  const incumbent = entry(A, "gamma(b) - gamma(b)", 4000);
  const best = entry(A, "gamma(a) - gamma(a)", 5000, OURS);
  const pair = (): Pair => ({
    candidate: entry(A, best.have, 5100, OURS),
    incumbent: entry(A, incumbent.have, 4500),
  });
  const base = { entry: incumbent };
  const first = decide(RUN, findings(best), base, base, pair);
  // The catalogue now holds the run's entry; the base still names the
  // incumbent it replaced, which stays the one to beat.
  const again = decide(
    RUN,
    findings(best),
    base,
    { entry: first.entry! },
    pair,
  );
  assert.deepEqual(again, first);
  // A run's own earlier entry, with no other run's before it, gives way
  // to its best, whatever their timings.
  const earlier = entry(A, "gamma(c) - gamma(c)", 9000, OURS);
  assert.equal(
    decide(RUN, findings(best), {}, { entry: earlier }, noPair).entry,
    best,
  );
});

test("a hang takes its family's hang slot unless another run's is close in cost", () => {
  const ours = hang(A, "ours", 600_000, OURS);
  // A new family's hang joins.
  assert.equal(
    decide(RUN, findings(undefined, true, ours), {}, {}, noPair).hang,
    ours,
  );
  // Another run's hang is replaced only by one estimated HANG_MARGIN times
  // costlier, and its issue carries over.
  const theirs = { ...hang(A, "theirs", 500_000), issue: 151 };
  const slot = { hang: theirs };
  assert.equal(
    decide(RUN, findings(undefined, true, ours), slot, slot, noPair).hang,
    theirs,
  );
  const much = hang(A, "much", 900_000, OURS);
  assert.deepEqual(
    decide(RUN, findings(undefined, true, much), slot, slot, noPair).hang,
    { ...much, issue: 151 },
  );
  // A hang recorded before estimates is ranked by its deadline.
  assert.equal(hangEstimate(hang(A, "old", undefined)), 120_000);
  // A failed worker outranks any hang and is never replaced by one.
  const failed: Hang = {
    ...hang(A, "failed", undefined),
    reason: { kind: "failed", message: "boom" },
  };
  assert.equal(hangEstimate(failed), Infinity);
  const kept = { hang: failed };
  assert.equal(
    decide(RUN, findings(undefined, true, much), kept, kept, noPair).hang,
    failed,
  );
});

test("a slot is set in place, entries ranked by cost per call and hangs by estimate", () => {
  const catalogue: Catalogue = {
    entries: [entry(A, "a", 4000), entry(B, "b", 2000)],
    hangs: [hang(A, "slow", 200_000)],
    runs: [],
  };
  const key = familyKey(B);
  const updated = withSlot(catalogue, key, {
    entry: entry(B, "b2", 9000, OURS),
    hang: hang(B, "slower", 900_000, OURS),
  });
  assert.deepEqual(
    updated.entries.map((e) => e.have),
    ["b2", "a"],
  );
  assert.deepEqual(
    updated.hangs.map((h) => h.have),
    ["slower", "slow"],
  );
  assert.equal(slotOf(updated, key).entry?.have, "b2");
  assert.equal(slotOf(updated, familyKey(family("edge"))).entry, undefined);
  // A run's record replaces the earlier record of the same run.
  const record = {
    source: RUN,
    cases: 16,
    indices: "0-15",
    commit: COMMIT,
    date: "d",
    machine: MACHINE,
  };
  const logged = withRun(withRun(updated, record), { ...record, cases: 20 });
  assert.deepEqual(
    logged.runs.map((r) => r.cases),
    [20],
  );
});

test("the tables replace the text between their markers, and only there", () => {
  const catalogue: Catalogue = {
    entries: [entry(A, "gamma(a) - gamma(a)", 4000)],
    hangs: [
      { ...hang(B, "beta(a, b) - …", 600_000), issue: 151 },
      hang(A, "old", undefined),
    ],
    runs: [],
  };
  const table = catalogueTable(catalogue);
  assert.match(table, /^\| Expression \| Settings \| Pattern \|/);
  assert.match(
    table,
    /`gamma\(a\) - gamma\(a\)` \| default \| cancel \| 8\.0 s \| 4\.0 s \| 2\.0 s \| 1 \| — \| — \|$/m,
  );
  // An entry typed out shows its slowest keystroke and how many were slow,
  // a `+` when the typing did not finish.
  const typed = (typing: Entry["typing"]) =>
    catalogueTable({
      ...catalogue,
      entries: [{ ...catalogue.entries[0]!, typing }],
    });
  assert.match(
    typed(
      summarizeTyping({
        keystrokes: [
          { length: 1, ms: 50, kind: "error" },
          { length: 2, ms: 150, kind: "result" },
          { length: 3, ms: 2000, kind: "result" },
        ],
        complete: true,
      }),
    ),
    /\| 1 \| 2\.0 s \| 2 of 3 \|$/m,
  );
  assert.match(
    typed(
      summarizeTyping({
        keystrokes: [{ length: 1, ms: 50, kind: "error" }],
        complete: false,
      }),
    ),
    /\| 50 ms \| 0 of 1\+ \|$/m,
  );
  // The hangs: how far each got, its estimate, its issue.
  const hangs = hangsTable(catalogue);
  assert.match(
    hangs,
    /`beta\(a, b\) - …` \| default \| identity:beta-gamma \| cold pass 10 of 10 \(9,852 digits\) \| ≈ 10 min \| #151 \|$/m,
  );
  assert.match(
    hangs,
    /`old` .*\| cold pass 10 \(9,852 digits\) \| > 2 min \| — \|$/m,
  );
  const doc = `# Costs\n\n${TABLE_START}\n\nSTALE TABLE\n\n${TABLE_END}\n\nBetween.\n\n${HANGS_START}\n\nSTALE HANGS\n\n${HANGS_END}\n\nAfter.\n`;
  const updated = withTable(
    withTable(doc, table)!,
    hangs,
    HANGS_START,
    HANGS_END,
  )!;
  assert.ok(updated.startsWith(`# Costs\n\n${TABLE_START}\n\n${table}\n\n`));
  assert.ok(
    updated.includes(
      `${TABLE_END}\n\nBetween.\n\n${HANGS_START}\n\n${hangs}\n\n${HANGS_END}`,
    ),
  );
  assert.ok(updated.endsWith(`${HANGS_END}\n\nAfter.\n`));
  assert.ok(!updated.includes("STALE"));
  assert.equal(withTable("no markers", table), undefined);
});
