import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspect } from "node:util";
import { test } from "node:test";
import { parseExpr, parseUnitList } from "../../src/core/expr.ts";
import {
  DEFAULT_SETTINGS,
  STORAGE_VERSION,
  settingsFromStored,
  storedSettings,
} from "../../src/settings.ts";
import { PROFILE_NAMES, type Family } from "./cases.ts";
import { checkSettings } from "./harness.ts";
import { CATALOGUE } from "./tooling.ts";
import {
  HANGS_END,
  HANGS_START,
  MARGIN,
  TABLE_END,
  TABLE_START,
  catalogueFromStored,
  catalogueTable,
  catalogueText,
  hangEstimate,
  readCatalogue,
  hangsTable,
  summarizeTyping,
  withEntryAgain,
  withHangAgain,
  withHit,
  withRun,
  withTable,
  withTyping,
  type Catalogue,
  type Entry,
  type Hang,
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
test("a hit takes its family's empty slot, or one it costs MARGIN times", () => {
  const empty: Catalogue = { entries: [], hangs: [], runs: [] };
  const first = entry(A, "gamma(a) - gamma(a)", 3000, OURS);
  const added = withHit(empty, { entry: first });
  assert.equal(added.change, "added");
  assert.deepEqual(added.catalogue.entries, [first]);
  // Near-equal cases do not trade places: a hit must cost MARGIN times.
  const close = entry(A, "gamma(b) - gamma(b)", 3000 * MARGIN - 1);
  assert.equal(withHit(added.catalogue, { entry: close }).change, "kept");
  const costlier = entry(A, "gamma(c) - gamma(c)", 3000 * MARGIN);
  const replaced = withHit(added.catalogue, { entry: costlier });
  assert.equal(replaced.change, "replaced");
  assert.deepEqual(replaced.catalogue.entries, [costlier]);
  // The cost compared is per call: more calls cost less each.
  const diluted = entry(A, "gamma(d) - …", 6000, OURS, 4);
  assert.equal(withHit(added.catalogue, { entry: diluted }).change, "kept");
  // Other families are left as they were, and the entries ranked.
  const other = entry(B, "beta(a, b) - …", 5000);
  const both = withHit(added.catalogue, { entry: other }).catalogue;
  assert.deepEqual(
    both.entries.map((e) => e.have),
    ["beta(a, b) - …", "gamma(a) - gamma(a)"],
  );
});

test("a hang takes its family's hang slot in the same way, keeping the issue", () => {
  const theirs = { ...hang(A, "theirs", 500_000), issue: 151 };
  const catalogue: Catalogue = { entries: [], hangs: [theirs], runs: [] };
  assert.equal(
    withHit(catalogue, { hang: hang(A, "close", 500_000 * MARGIN - 1) }).change,
    "kept",
  );
  const worse = hang(A, "worse", 900_000, OURS);
  const replaced = withHit(catalogue, { hang: worse });
  assert.equal(replaced.change, "replaced");
  assert.deepEqual(replaced.catalogue.hangs, [{ ...worse, issue: 151 }]);
  // A hang recorded before estimates is ranked by its deadline.
  assert.equal(hangEstimate(hang(A, "old", undefined)), 120_000);
  // A failed worker outranks any hang and is never replaced by one.
  const failed: Hang = {
    ...hang(A, "failed", undefined),
    reason: { kind: "failed", message: "boom" },
  };
  assert.equal(hangEstimate(failed), Infinity);
  const kept = { ...catalogue, hangs: [failed] };
  assert.equal(withHit(kept, { hang: worse }).change, "kept");
  // Hangs are ranked by their estimates.
  const two = withHit(catalogue, { hang: hang(B, "b", 2_000_000) }).catalogue;
  assert.deepEqual(
    two.hangs.map((h) => h.have),
    ["b", "theirs"],
  );
});

test("typing is recorded on the entry for its case, if the catalogue still holds it", () => {
  const e = entry(A, "gamma(a) - gamma(a)", 3000, OURS);
  const catalogue: Catalogue = { entries: [e], hangs: [], runs: [] };
  const typing = summarizeTyping({
    keystrokes: [{ length: 1, ms: 50, kind: "error" }],
    complete: true,
  });
  assert.deepEqual(withTyping(catalogue, e, typing).entries, [
    { ...e, typing },
  ]);
  // Replaced meanwhile: nothing to record it on.
  const other = { have: "gamma(b) - gamma(b)", want: "", settings: e.settings };
  assert.deepEqual(withTyping(catalogue, other, typing), catalogue);
});

test("a case measured again takes its new cost, cheaper or not, and a hang that finishes leaves", () => {
  const slow = entry(A, "gamma(a) - gamma(a)", 8000, OURS);
  const other = entry(B, "beta(a, b) - …", 4000);
  const catalogue: Catalogue = {
    entries: [slow, other],
    hangs: [{ ...hang(A, "h", 600_000), issue: 151 }],
    runs: [],
  };
  // No margin: the case's own new cost, here a quarter of what it was,
  // and the entries ranked again.
  const cheaper = { ...slow, warm: run(2000), cold: run(4000) };
  const again = withEntryAgain(catalogue, cheaper);
  assert.deepEqual(
    again.entries.map((e) => [e.have, e.warm.ms]),
    [
      ["beta(a, b) - …", 4000],
      ["gamma(a) - gamma(a)", 2000],
    ],
  );
  // A case the catalogue no longer holds is not added back.
  const gone = entry(A, "gamma(z) - gamma(z)", 9000, OURS);
  assert.equal(withEntryAgain(catalogue, gone), catalogue);
  // A hang measured again keeps its issue; one that finishes leaves.
  const h = catalogue.hangs[0]!;
  const refreshed = withHangAgain(catalogue, h, hang(A, "h", 700_000));
  assert.equal(refreshed.hangs[0]?.issue, 151);
  assert.equal(hangEstimate(refreshed.hangs[0]!), 700_000);
  assert.deepEqual(withHangAgain(catalogue, h, undefined).hangs, []);
});

test("a run's record replaces the earlier record of the same run", () => {
  const record = {
    source: { seed: "0123456789abcdef" },
    cases: 16,
    hits: 2,
    commit: COMMIT,
    date: "d",
    machine: MACHINE,
  };
  const empty: Catalogue = { entries: [], hangs: [], runs: [] };
  const logged = withRun(withRun(empty, record), { ...record, cases: 20 });
  assert.deepEqual(
    logged.runs.map((r) => r.cases),
    [20],
  );
  // Another run of the same seed, begun later, is a record of its own.
  assert.equal(withRun(logged, { ...record, date: "e" }).runs.length, 2);
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

test("the committed catalogue reads as cases the stress suite can run: every entry's and hang's settings are ones the panel could hold, of a profile that exists, and its texts parse", () => {
  // The smoke test the suite needs, since the catalogue is data no type
  // checks: it reads the real file, as `pnpm stress` does. S2 reshaped
  // the mode and the suite failed on every case until this test existed.
  const catalogue = readCatalogue(CATALOGUE);
  assert.ok(catalogue.entries.length > 0);
  for (const c of [...catalogue.entries, ...catalogue.hangs]) {
    const where = inspect({ have: c.have, want: c.want, family: c.family });
    assert.doesNotThrow(() => checkSettings(c.settings), where);
    assert.ok(PROFILE_NAMES.includes(c.family.profile), where);
    assert.ok(parseExpr(c.have).ok, where);
    if (c.want !== "") assert.ok(parseUnitList(c.want).ok, where);
  }
  // Every case's settings are stored as the current version writes them,
  // read from the file itself: a case stored under an earlier version, or
  // with a field the current version would not write, reads through the
  // migrations above but fails here, so that a step that changes the
  // settings' shape rewrites the catalogue (`pnpm stress:rewrite`) in the
  // same change rather than leaving the file to a migration.
  const raw = JSON.parse(readFileSync(CATALOGUE, "utf8")) as {
    entries: { have: string; settings: StoredSettings }[];
    hangs: { have: string; settings: StoredSettings }[];
  };
  for (const c of [...raw.entries, ...raw.hangs]) {
    assert.deepEqual(
      c.settings,
      storedSettings(settingsFromStored(c.settings), c.settings.savedBy),
      `${c.have}: the catalogue's settings are not as version ${STORAGE_VERSION} stores them; run pnpm stress:rewrite`,
    );
  }
});

/** A case's settings as the file holds them: the envelope, whatever version. */
type StoredSettings = {
  readonly version: number;
  readonly savedBy: string;
  readonly settings: object;
};

test("a case's settings are read through the settings migrations and written in the storage envelope", () => {
  // The first catalogue stored the fields bare, in the shape of stored
  // version 1: they read as the settings they meant, the mode nested and
  // the old rounding default become the new.
  const bare = {
    digits: 32,
    rounding: "halfAwayFromZero",
    mode: "exact",
    maxDigits: 2453,
    maxBits: 65536,
    fractions: false,
  };
  const f = family("cancel");
  const e = entry(f, "exp(1) - exp(1)", 1500);
  const stored = {
    entries: [{ ...e, settings: bare }],
    hangs: [{ ...hang(f, "gamma(1/3)", 100), settings: bare }],
    runs: [],
  };
  const catalogue = catalogueFromStored(stored);
  const expected = {
    ...DEFAULT_SETTINGS,
    displayDigits: 32,
    precisionLimitDigits: 2453,
  };
  assert.deepEqual(catalogue.entries[0]!.settings, expected);
  assert.deepEqual(catalogue.hangs[0]!.settings, expected);
  // Written back, each case's settings are the envelope the app stores,
  // saved by the commit that measured the case, and read back the same.
  const text = catalogueText(catalogue);
  const written = JSON.parse(text) as {
    entries: {
      settings: { version: number; savedBy: string; settings: object };
    }[];
  };
  assert.equal(written.entries[0]!.settings.version, STORAGE_VERSION);
  assert.equal(written.entries[0]!.settings.savedBy, COMMIT.hash);
  assert.deepEqual(catalogueFromStored(JSON.parse(text)), catalogue);
  // A dirty tree is said in the build string, as build-id.ts says it.
  const dirty = catalogueText({
    ...catalogue,
    entries: [{ ...catalogue.entries[0]!, commit: { ...COMMIT, dirty: true } }],
  });
  assert.equal(
    (JSON.parse(dirty) as typeof written).entries[0]!.settings.savedBy,
    `${COMMIT.hash}-dirty`,
  );
});
