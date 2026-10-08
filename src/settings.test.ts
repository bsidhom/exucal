import assert from "node:assert/strict";
import { inspect } from "node:util";
import { test } from "node:test";
import {
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_PRECISION_LIMIT_DIGITS,
  MIN_SIGNIFICAND_LIMIT_BITS,
  ceilingFor,
  precisionLimitFor,
} from "./core/context.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS } from "./core/rational.ts";
import {
  DEFAULT_MODES,
  DEFAULT_SETTINGS,
  DEFAULT_WIDTH,
  SETTINGS_KEY,
  WIDTH_LIMIT,
  BUDGET_MS_RANGE,
  DEFAULT_BUDGET_MS,
  clampSettings,
  clampsOf,
  contextOf,
  isSignificandLimit,
  isIntegerIn,
  isNotationKind,
  isRoundingMode,
  isAtDefault,
  isDefault,
  isMode,
  rangesOf,
  loadSettings,
  resetSetting,
  resetSettings,
  withDefault,
  sameMode,
  sameNotation,
  saveSettings,
  settingsFromStored,
  storedSettings,
  ratioOf,
  refusalOf,
  STORAGE_VERSION,
  type Clamp,
  type ModeSetting,
  type Settings,
  type SettingsStorage,
} from "./settings.ts";

/** A storage in memory, as `localStorage` behaves. */
function storage(entries: Record<string, string> = {}): SettingsStorage & {
  readonly map: Map<string, string>;
} {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

/** A build string as the shell passes it: the whole commit, never shortened. */
const BUILD = "6c0d0946da31e92eb7d2737a1aebfdf61c1ebf86-dirty";

/** A stored object at `version` (the current one by default) holding `settings`. */
function envelope(
  settings: unknown,
  version: unknown = STORAGE_VERSION,
): unknown {
  return { version, savedBy: BUILD, settings };
}

/** The settings `fields` load as, stored at the current version. */
function load(fields: unknown): Settings {
  return loadSettings(
    storage({ [SETTINGS_KEY]: JSON.stringify(envelope(fields)) }),
  );
}

/** The settings `value`, stored as it is, loads as. */
function loadStored(value: unknown): Settings {
  return loadSettings(storage({ [SETTINGS_KEY]: JSON.stringify(value) }));
}

const RATIO: ModeSetting = {
  kind: "exact",
  notation: { kind: "ratio", width: 20 },
};
const WIDE: ModeSetting = {
  kind: "exact",
  notation: { kind: "ratio", width: 1000 },
};
const DECIMAL: ModeSetting = DEFAULT_MODES.decimal;
const EXTENDED: ModeSetting = {
  kind: "decimal",
  working: { kind: "extended", digits: 12 },
};

test("an empty storage gives the defaults", () => {
  assert.deepEqual(loadSettings(storage()), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, {
    displayDigits: 8,
    rounding: "halfEven",
    mode: { kind: "exact", notation: { kind: "digits" } },
    precisionLimitDigits: 1000,
    significandLimitBits: 65536,
    budgetMs: 50,
  });
  assert.deepEqual(DEFAULT_MODES, {
    exact: { kind: "exact", notation: { kind: "digits" } },
    decimal: { kind: "decimal", working: { kind: "digits" } },
  });
  assert.equal(DEFAULT_WIDTH, 20);
  assert.equal(WIDTH_LIMIT, 1000);
  assert.equal(DEFAULT_BUDGET_MS, 50);
  assert.deepEqual(BUDGET_MS_RANGE, { min: 10, max: 10000 });
});

test("stored settings are parsed", () => {
  const stored = {
    displayDigits: 12,
    rounding: "floor",
    mode: EXTENDED,
    precisionLimitDigits: 100,
    significandLimitBits: 4096,
    budgetMs: 200,
  };
  assert.deepEqual(load(stored), stored);
});

test("the mode is one of two variants, each built afresh from its fields, and anything else is the default", () => {
  assert.deepEqual(load({ mode: RATIO }).mode, RATIO);
  assert.deepEqual(load({ mode: WIDE }).mode, WIDE);
  assert.deepEqual(load({ mode: DECIMAL }).mode, DECIMAL);
  assert.deepEqual(load({ mode: EXTENDED }).mode, EXTENDED);
  // Extra fields are dropped, and a field of the other variant is not carried.
  assert.deepEqual(
    load({
      mode: {
        kind: "exact",
        notation: { kind: "ratio", width: 20, digits: 4 },
        working: 3,
        x: 1,
      },
    }).mode,
    RATIO,
  );
  assert.deepEqual(
    load({ mode: { kind: "exact", notation: { kind: "digits", width: 9 } } })
      .mode,
    DEFAULT_SETTINGS.mode,
  );
  assert.deepEqual(
    load({ mode: { kind: "decimal", working: { kind: "digits", digits: 9 } } })
      .mode,
    DECIMAL,
  );
  // The names of the old shape, and every malformed variant, default.
  for (const mode of [
    undefined,
    "exact",
    "decimal",
    { kind: "exact" },
    { kind: "exact", notation: "digits" },
    { kind: "exact", notation: "ratio" },
    { kind: "exact", notation: { kind: "fraction" } },
    { kind: "exact", notation: { kind: "ratio" } },
    { kind: "exact", notation: { kind: "ratio", width: 0 } },
    { kind: "exact", notation: { kind: "ratio", width: 1001 } },
    { kind: "exact", notation: { kind: "ratio", width: 2.5 } },
    { kind: "exact", notation: { kind: "ratio", width: "20" } },
    { kind: "exact", notation: true },
    { kind: "decimal" },
    { kind: "decimal", working: "digits" },
    { kind: "decimal", working: { kind: "extended" } },
    { kind: "decimal", working: { kind: "extended", digits: 0 } },
    { kind: "decimal", working: { kind: "extended", digits: 2.5 } },
    { kind: "decimal", working: { kind: "extended", digits: "12" } },
    { kind: "decimal", working: { kind: "fixed", digits: 12 } },
    { kind: "approximate" },
    1,
    null,
    [],
  ]) {
    assert.deepEqual(load({ mode }).mode, DEFAULT_SETTINGS.mode, inspect(mode));
  }
  assert.ok(isMode("exact") && isMode("decimal"));
  assert.ok(!isMode("Exact") && !isMode(undefined) && !isMode(0));
  assert.ok(isNotationKind("digits") && isNotationKind("ratio"));
  assert.ok(!isNotationKind("fraction") && !isNotationKind(undefined));
  // The width's range is its own, in the ranges the panel reads.
  assert.deepEqual(rangesOf(DEFAULT_SETTINGS).width, { min: 1, max: 1000 });
});

test("the mode reaches the context as its kind, with the working digits when they are extended; the notation never does", () => {
  assert.equal(contextOf(DEFAULT_SETTINGS).mode, "exact");
  const ratio = contextOf({ ...DEFAULT_SETTINGS, mode: RATIO });
  assert.equal(ratio.mode, "exact");
  assert.ok(!("notation" in ratio) && !("working" in ratio));
  const decimal = contextOf({ ...DEFAULT_SETTINGS, mode: DECIMAL });
  assert.equal(decimal.mode, "decimal");
  assert.ok(!("working" in decimal));
  assert.deepEqual(contextOf({ ...DEFAULT_SETTINGS, mode: EXTENDED }), {
    precision: 8,
    rounding: "halfEven",
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: ceilingFor(DEFAULT_PRECISION_LIMIT_DIGITS),
    mode: "decimal",
    working: 12,
  });
  // The budget is the probe's and never reaches the context.
  assert.ok(!("budgetMs" in contextOf({ ...DEFAULT_SETTINGS, budgetMs: 99 })));
  // Whether ratios are shown is exact mode's notation alone.
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: RATIO })?.width, 20);
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: WIDE })?.width, 1000);
  assert.equal(ratioOf(DEFAULT_SETTINGS), undefined);
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: DECIMAL }), undefined);
});

test("each field that is missing or invalid falls back to its default alone", () => {
  assert.deepEqual(load({ displayDigits: 12 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
  });
  assert.deepEqual(load({ rounding: "ceiling" }), {
    ...DEFAULT_SETTINGS,
    rounding: "ceiling",
  });
  assert.deepEqual(load({ precisionLimitDigits: 50 }), {
    ...DEFAULT_SETTINGS,
    precisionLimitDigits: 50,
  });
  assert.deepEqual(load({ significandLimitBits: 1 << 17 }), {
    ...DEFAULT_SETTINGS,
    significandLimitBits: 1 << 17,
  });
  assert.deepEqual(load({ budgetMs: 10 }), {
    ...DEFAULT_SETTINGS,
    budgetMs: 10,
  });
  assert.deepEqual(load({ budgetMs: 10000 }), {
    ...DEFAULT_SETTINGS,
    budgetMs: 10000,
  });
  for (const displayDigits of [0, -1, 2.5, "12", null]) {
    assert.deepEqual(load({ displayDigits, rounding: "ceiling" }), {
      ...DEFAULT_SETTINGS,
      rounding: "ceiling",
    });
  }
  assert.deepEqual(load({ displayDigits: 1 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 1,
  });
  assert.deepEqual(load({ displayDigits: 12, rounding: "nearest" }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
  });
  assert.deepEqual(load({ displayDigits: 12, rounding: 3 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
  });
  for (const bits of [
    0,
    MIN_SIGNIFICAND_LIMIT_BITS - 1,
    MAX_SIGNIFICAND_LIMIT_BITS + 1,
    1.5,
    "65536",
  ]) {
    assert.deepEqual(
      load({ significandLimitBits: bits }),
      DEFAULT_SETTINGS,
      `${bits}`,
    );
  }
  assert.deepEqual(load({ significandLimitBits: MIN_SIGNIFICAND_LIMIT_BITS }), {
    ...DEFAULT_SETTINGS,
    significandLimitBits: MIN_SIGNIFICAND_LIMIT_BITS,
    precisionLimitDigits: 1,
    displayDigits: 1,
  });
  assert.deepEqual(load({ significandLimitBits: MAX_SIGNIFICAND_LIMIT_BITS }), {
    ...DEFAULT_SETTINGS,
    significandLimitBits: MAX_SIGNIFICAND_LIMIT_BITS,
  });
  for (const limit of [0, -3, 2.5, "500"]) {
    assert.deepEqual(
      load({ precisionLimitDigits: limit }),
      DEFAULT_SETTINGS,
      `${limit}`,
    );
  }
  // The budget's range is its own: outside it, the default, never a clamp.
  for (const budgetMs of [0, 9, 10001, 50.5, "50", null]) {
    assert.deepEqual(load({ budgetMs }), DEFAULT_SETTINGS, `${budgetMs}`);
  }
  // The old keys are not read at the current version: they default.
  assert.deepEqual(
    load({ digits: 12, maxDigits: 100, maxBits: 4096 }),
    DEFAULT_SETTINGS,
  );
  assert.deepEqual(load(null), DEFAULT_SETTINGS);
  assert.deepEqual(load([1, 2]), DEFAULT_SETTINGS);
  assert.deepEqual(load("floor"), DEFAULT_SETTINGS);
  assert.deepEqual(load(42), DEFAULT_SETTINGS);
});

test("the dependent settings are clamped: the precision limit to the significand limit, the display digits to the precision limit, the working digits between them", () => {
  // A precision limit above what the significand limit holds comes down to it.
  const most = precisionLimitFor(DEFAULT_SIGNIFICAND_LIMIT_BITS);
  assert.deepEqual(load({ precisionLimitDigits: most + 1 }), {
    ...DEFAULT_SETTINGS,
    precisionLimitDigits: most,
  });
  assert.deepEqual(load({ precisionLimitDigits: most }), {
    ...DEFAULT_SETTINGS,
    precisionLimitDigits: most,
  });
  // Display digits above the precision limit come down to it.
  assert.deepEqual(load({ displayDigits: 1001 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 1000,
  });
  assert.deepEqual(load({ displayDigits: 300, precisionLimitDigits: 200 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 200,
    precisionLimitDigits: 200,
  });
  // A small significand limit lowers both.
  const small = load({
    displayDigits: 100,
    precisionLimitDigits: 500,
    significandLimitBits: 1024,
  });
  assert.equal(small.significandLimitBits, 1024);
  assert.equal(small.precisionLimitDigits, precisionLimitFor(1024));
  assert.ok(small.precisionLimitDigits < 100);
  assert.equal(small.displayDigits, small.precisionLimitDigits);
  // `clampSettings` is the same rule on its own, for the shell.
  assert.deepEqual(
    clampSettings({ ...DEFAULT_SETTINGS, significandLimitBits: 1024 }),
    {
      ...DEFAULT_SETTINGS,
      significandLimitBits: 1024,
      precisionLimitDigits: precisionLimitFor(1024),
      displayDigits: Math.min(8, precisionLimitFor(1024)),
    },
  );
  assert.deepEqual(clampSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  assert.deepEqual(
    clampSettings({ ...DEFAULT_SETTINGS, precisionLimitDigits: 4 }),
    {
      ...DEFAULT_SETTINGS,
      precisionLimitDigits: 4,
      displayDigits: 4,
    },
  );
  // The budget is never clamped: it depends on nothing.
  assert.equal(
    clampSettings({ ...DEFAULT_SETTINGS, budgetMs: 10000 }).budgetMs,
    10000,
  );
  // An extended count of working digits is clamped last, between the
  // display digits and the precision limit: raising the display digits
  // above it raises it, lowering the precision limit below it lowers it,
  // and a count between them is kept.
  const extended = (digits: number): ModeSetting => ({
    kind: "decimal",
    working: { kind: "extended", digits },
  });
  const at = (
    displayDigits: number,
    working: number,
    precisionLimitDigits = 1000,
  ): Settings => ({
    ...DEFAULT_SETTINGS,
    displayDigits,
    precisionLimitDigits,
    mode: extended(working),
  });
  assert.deepEqual(clampSettings(at(8, 12)), at(8, 12));
  assert.deepEqual(clampSettings(at(8, 8)), at(8, 8));
  assert.deepEqual(clampSettings(at(16, 12)), at(16, 16));
  assert.deepEqual(clampSettings(at(8, 1001)), at(8, 1000));
  assert.deepEqual(clampSettings(at(8, 500, 100)), at(8, 100, 100));
  assert.deepEqual(clampSettings(at(300, 500, 100)), at(100, 100, 100));
  assert.deepEqual(load(at(8, 1001)), at(8, 1000));
  assert.deepEqual(load(at(16, 12)), at(16, 16));
  // A clamp that changes nothing leaves the mode itself.
  const kept = at(8, 12);
  assert.equal(clampSettings(kept).mode, kept.mode);
  // The ranges the panel reads, each bound with the setting that sets it:
  // the working digits from the display digits to the precision limit.
  assert.deepEqual(rangesOf(at(8, 12, 100)), {
    significandLimitBits: {
      min: MIN_SIGNIFICAND_LIMIT_BITS,
      max: MAX_SIGNIFICAND_LIMIT_BITS,
    },
    precisionLimitDigits: {
      min: 1,
      max: precisionLimitFor(DEFAULT_SIGNIFICAND_LIMIT_BITS),
      maxBy: "significandLimitBits",
    },
    displayDigits: { min: 1, max: 100, maxBy: "precisionLimitDigits" },
    working: {
      min: 8,
      max: 100,
      minBy: "displayDigits",
      maxBy: "precisionLimitDigits",
    },
    width: { min: 1, max: 1000 },
    budgetMs: { min: 10, max: 10000 },
  });
  assert.ok(isIntegerIn(12, rangesOf(at(8, 12)).working));
  assert.ok(!isIntegerIn(7, rangesOf(at(8, 12)).working));
  assert.ok(
    isSignificandLimit(DEFAULT_SIGNIFICAND_LIMIT_BITS) &&
      !isSignificandLimit(0),
  );
  assert.ok(isRoundingMode("floor") && !isRoundingMode("nearest"));
});

test("the clamp reports what it moved, from what to what and by which setting, in the order it moved them", () => {
  const extended = (digits: number): ModeSetting => ({
    kind: "decimal",
    working: { kind: "extended", digits },
  });
  // Consistent settings: nothing moved.
  assert.deepEqual(clampsOf(DEFAULT_SETTINGS), []);
  assert.deepEqual(clampsOf({ ...DEFAULT_SETTINGS, mode: extended(12) }), []);
  // The significand limit lowered: the precision limit comes down to what
  // it holds, and the display digits and the working digits to that in
  // turn, each naming the setting whose bound it was brought to.
  const lowered = clampsOf({
    ...DEFAULT_SETTINGS,
    significandLimitBits: 1024,
    displayDigits: 100,
    mode: extended(200),
  });
  const held = precisionLimitFor(1024);
  const expected: Clamp[] = [
    {
      setting: "precisionLimitDigits",
      from: 1000,
      to: held,
      by: "significandLimitBits",
    },
    {
      setting: "displayDigits",
      from: 100,
      to: held,
      by: "precisionLimitDigits",
    },
    { setting: "working", from: 200, to: held, by: "precisionLimitDigits" },
  ];
  assert.deepEqual(lowered, expected);
  // The one upward move: the working digits raised to the display digits.
  assert.deepEqual(
    clampsOf({ ...DEFAULT_SETTINGS, displayDigits: 16, mode: extended(12) }),
    [{ setting: "working", from: 12, to: 16, by: "displayDigits" }],
  );
  // The report and the clamp agree.
  for (const settings of [
    DEFAULT_SETTINGS,
    { ...DEFAULT_SETTINGS, significandLimitBits: 1024, displayDigits: 100 },
    { ...DEFAULT_SETTINGS, displayDigits: 16, mode: extended(12) },
    { ...DEFAULT_SETTINGS, precisionLimitDigits: 4, mode: extended(12) },
  ]) {
    const clamped = clampSettings(settings);
    for (const { setting, to } of clampsOf(settings)) {
      const value =
        setting === "working"
          ? clamped.mode.kind === "decimal" &&
            clamped.mode.working.kind === "extended"
            ? clamped.mode.working.digits
            : undefined
          : clamped[setting];
      assert.equal(value, to);
    }
  }
});

test("a refusal says why an edit is out of range: the bound passed and the setting that sets it", () => {
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    mode: { kind: "decimal", working: { kind: "extended", digits: 12 } },
  };
  // Within range: no refusal.
  assert.equal(refusalOf(8, "displayDigits", settings), undefined);
  assert.equal(refusalOf(1000, "displayDigits", settings), undefined);
  assert.equal(refusalOf(1, "displayDigits", settings), undefined);
  // Past a bound another setting sets: the bound and the setter.
  assert.deepEqual(refusalOf(1001, "displayDigits", settings), {
    kind: "above",
    bound: 1000,
    by: "precisionLimitDigits",
  });
  assert.deepEqual(refusalOf(5000, "precisionLimitDigits", settings), {
    kind: "above",
    bound: precisionLimitFor(DEFAULT_SIGNIFICAND_LIMIT_BITS),
    by: "significandLimitBits",
  });
  assert.deepEqual(refusalOf(7, "working", settings), {
    kind: "below",
    bound: 8,
    by: "displayDigits",
  });
  assert.deepEqual(refusalOf(1001, "working", settings), {
    kind: "above",
    bound: 1000,
    by: "precisionLimitDigits",
  });
  // Past a fixed bound: the bound alone.
  assert.deepEqual(refusalOf(0, "displayDigits", settings), {
    kind: "below",
    bound: 1,
    by: undefined,
  });
  assert.deepEqual(
    refusalOf(MAX_SIGNIFICAND_LIMIT_BITS + 1, "significandLimitBits", settings),
    {
      kind: "above",
      bound: MAX_SIGNIFICAND_LIMIT_BITS,
      by: undefined,
    },
  );
  assert.deepEqual(
    refusalOf(MIN_SIGNIFICAND_LIMIT_BITS - 1, "significandLimitBits", settings),
    {
      kind: "below",
      bound: MIN_SIGNIFICAND_LIMIT_BITS,
      by: undefined,
    },
  );
  assert.deepEqual(refusalOf(1001, "width", settings), {
    kind: "above",
    bound: 1000,
    by: undefined,
  });
  assert.deepEqual(refusalOf(5, "budgetMs", settings), {
    kind: "below",
    bound: 10,
    by: undefined,
  });
  // Not a whole number: refused before any bound is read.
  for (const value of [2.5, NaN, Infinity, "12", undefined]) {
    assert.deepEqual(refusalOf(value, "displayDigits", settings), {
      kind: "notInteger",
    });
  }
  // The refusal and the validation agree on every ranged setting.
  for (const setting of [
    "displayDigits",
    "precisionLimitDigits",
    "significandLimitBits",
    "working",
    "width",
    "budgetMs",
  ] as const) {
    const { min, max } = rangesOf(settings)[setting];
    for (const value of [min - 1, min, max, max + 1, 2.5]) {
      assert.equal(
        refusalOf(value, setting, settings) === undefined,
        isIntegerIn(value, rangesOf(settings)[setting]),
        `${setting} ${value}`,
      );
    }
  }
});

test("text that is not JSON, and a storage that throws, give the defaults", () => {
  assert.deepEqual(
    loadSettings(storage({ [SETTINGS_KEY]: "{digits" })),
    DEFAULT_SETTINGS,
  );
  assert.deepEqual(
    loadSettings(storage({ [SETTINGS_KEY]: "" })),
    DEFAULT_SETTINGS,
  );
  const throwing: SettingsStorage = {
    getItem: () => {
      throw new Error("no storage");
    },
    setItem: () => {
      throw new Error("no storage");
    },
  };
  assert.deepEqual(loadSettings(throwing), DEFAULT_SETTINGS);
  assert.doesNotThrow(() => saveSettings(throwing, DEFAULT_SETTINGS, BUILD));
});

test("settings round-trip through storage, under one key", () => {
  for (const mode of [RATIO, DECIMAL, EXTENDED, DEFAULT_SETTINGS.mode]) {
    const stored = storage();
    const settings: Settings = {
      displayDigits: 10,
      rounding: "halfAwayFromZero",
      mode,
      precisionLimitDigits: 2000,
      significandLimitBits: 1 << 17,
      budgetMs: 200,
    };
    saveSettings(stored, settings, BUILD);
    assert.deepEqual([...stored.map.keys()], [SETTINGS_KEY]);
    assert.deepEqual(loadSettings(stored), settings);
    // The stored object is the envelope: the version, the whole build string, the fields.
    assert.deepEqual(JSON.parse(stored.map.get(SETTINGS_KEY)!), {
      version: STORAGE_VERSION,
      savedBy: BUILD,
      settings,
    });
    saveSettings(stored, DEFAULT_SETTINGS, BUILD);
    assert.deepEqual(loadSettings(stored), DEFAULT_SETTINGS);
  }
  assert.equal(STORAGE_VERSION, 5);
  // The envelope and its reading are one pair, for any store that keeps
  // settings (the stress catalogue keeps a case's): what `storedSettings`
  // shapes, `settingsFromStored` reads back, and a bare object is version 1.
  const settings: Settings = { ...DEFAULT_SETTINGS, displayDigits: 12 };
  assert.deepEqual(storedSettings(settings, BUILD), envelope(settings));
  assert.deepEqual(
    settingsFromStored(storedSettings(settings, BUILD)),
    settings,
  );
  assert.deepEqual(
    settingsFromStored({ digits: 12, mode: "exact", fractions: false }),
    settings,
  );
  assert.deepEqual(settingsFromStored(null), DEFAULT_SETTINGS);
  assert.deepEqual(settingsFromStored({ version: 99 }), DEFAULT_SETTINGS);
});

test("a version 1 object, the fields bare, loads through every migration and is saved back at the current version", () => {
  const bare = {
    digits: 12,
    rounding: "floor",
    mode: "decimal",
    maxDigits: 100,
    maxBits: 4096,
    fractions: true,
  };
  const store = storage({ [SETTINGS_KEY]: JSON.stringify(bare) });
  const loaded = loadSettings(store);
  const expected: Settings = {
    displayDigits: 12,
    rounding: "floor",
    mode: DECIMAL,
    precisionLimitDigits: 100,
    significandLimitBits: 4096,
    budgetMs: DEFAULT_BUDGET_MS,
  };
  assert.deepEqual(loaded, expected);
  saveSettings(store, loaded, BUILD);
  assert.deepEqual(
    JSON.parse(store.map.get(SETTINGS_KEY)!),
    envelope(expected),
  );
});

/** The three numbers under the keys of versions 1 to 4, as a fixture stores them. */
const OLD_KEYS = { digits: 12, maxDigits: 100, maxBits: 4096 };

/** The same three under the current keys, with the budget at its default, as they load. */
const NEW_KEYS = {
  displayDigits: 12,
  precisionLimitDigits: 100,
  significandLimitBits: 4096,
  budgetMs: DEFAULT_BUDGET_MS,
};

test('a version 2 object loads as the nested mode: the mode name and the fractions flag become the variant, and the old rounding default becomes the new (devdocs/settings.md, "Storage")', () => {
  const two = (settings: unknown) => loadStored(envelope(settings, 2));
  const fields = { ...OLD_KEYS, rounding: "floor" };
  const loads = { ...NEW_KEYS, rounding: "floor" };
  // Each combination of the mode and the flag.
  assert.deepEqual(two({ ...fields, mode: "exact", fractions: false }), {
    ...loads,
    mode: { kind: "exact", notation: { kind: "digits" } },
  });
  assert.deepEqual(two({ ...fields, mode: "exact", fractions: true }), {
    ...loads,
    mode: RATIO,
  });
  assert.deepEqual(two({ ...fields, mode: "decimal", fractions: false }), {
    ...loads,
    mode: DECIMAL,
  });
  assert.deepEqual(two({ ...fields, mode: "decimal", fractions: true }), {
    ...loads,
    mode: DECIMAL,
  });
  // The flag is `ratio` only when it is `true`; a missing or malformed
  // flag, or a missing or malformed mode, defaults.
  for (const fractions of [undefined, "true", 1, null]) {
    assert.deepEqual(
      two({ ...fields, mode: "exact", fractions }).mode,
      DEFAULT_SETTINGS.mode,
      String(fractions),
    );
  }
  for (const mode of [undefined, "approximate", 7, null, { kind: "exact" }]) {
    assert.deepEqual(
      two({ ...fields, mode, fractions: true }).mode,
      DEFAULT_SETTINGS.mode,
      String(mode),
    );
  }
  // The old default rounding, echoed by every save, becomes the new; any
  // other stored mode is kept.
  assert.equal(
    two({ ...fields, rounding: "halfAwayFromZero" }).rounding,
    "halfEven",
  );
  for (const rounding of ["halfEven", "halfTowardZero", "floor", "ceiling"]) {
    assert.equal(two({ ...fields, rounding }).rounding, rounding);
  }
  assert.equal(two({ ...fields, rounding: "nearest" }).rounding, "halfEven");
  // At version 3 and after the old default is a choice and is kept.
  assert.equal(
    loadStored(envelope({ ...fields, rounding: "halfAwayFromZero" }, 3))
      .rounding,
    "halfAwayFromZero",
  );
  // A field missing or malformed inside the envelope falls back on its own,
  // and the dependents are clamped as for a bare object.
  assert.deepEqual(two({ digits: 12, mode: 7 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
  });
  assert.equal(two({ digits: 50, maxDigits: 20 }).displayDigits, 20);
  // An envelope whose settings are not an object gives the defaults.
  assert.deepEqual(two(5), DEFAULT_SETTINGS);
  assert.deepEqual(two(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 2 }), DEFAULT_SETTINGS);
  // The next save writes the current version, under the current keys.
  const store = storage({
    [SETTINGS_KEY]: JSON.stringify(
      envelope({ ...fields, mode: "exact", fractions: true }, 2),
    ),
  });
  saveSettings(store, loadSettings(store), BUILD);
  assert.deepEqual(
    JSON.parse(store.map.get(SETTINGS_KEY)!),
    envelope({ ...loads, mode: RATIO }),
  );
});

test('a version 3 object loads with the notation nested: the string becomes the variant, a ratio at the default width (devdocs/settings.md, "Storage")', () => {
  const three = (settings: unknown) => loadStored(envelope(settings, 3));
  const fields = { ...OLD_KEYS, rounding: "floor" };
  const loads = { ...NEW_KEYS, rounding: "floor" };
  assert.deepEqual(
    three({ ...fields, mode: { kind: "exact", notation: "digits" } }),
    {
      ...loads,
      mode: { kind: "exact", notation: { kind: "digits" } },
    },
  );
  assert.deepEqual(
    three({ ...fields, mode: { kind: "exact", notation: "ratio" } }),
    {
      ...loads,
      mode: RATIO,
    },
  );
  // A decimal mode passes through untouched; a notation that is neither
  // string, and a malformed mode, default.
  assert.deepEqual(three({ ...fields, mode: EXTENDED }), {
    ...loads,
    mode: EXTENDED,
  });
  for (const notation of [undefined, "fraction", 7, null, { kind: "ratio" }]) {
    assert.deepEqual(
      three({ ...fields, mode: { kind: "exact", notation } }).mode,
      DEFAULT_SETTINGS.mode,
      String(notation),
    );
  }
  assert.deepEqual(
    three({ ...fields, mode: "exact" }).mode,
    DEFAULT_SETTINGS.mode,
  );
  assert.deepEqual(three(5), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 3 }), DEFAULT_SETTINGS);
  // Through every migration from version 2, and saved at the current version.
  const store = storage({
    [SETTINGS_KEY]: JSON.stringify(
      envelope({ ...fields, mode: "exact", fractions: true }, 2),
    ),
  });
  assert.deepEqual(loadSettings(store), { ...loads, mode: RATIO });
  saveSettings(store, loadSettings(store), BUILD);
  assert.equal(JSON.parse(store.map.get(SETTINGS_KEY)!).version, 5);
});

test('a version 4 object loads with the three numbers under their new keys, and the budget at its default (devdocs/settings.md, "Storage")', () => {
  const four = (settings: unknown) => loadStored(envelope(settings, 4));
  const fields = { ...OLD_KEYS, rounding: "floor", mode: RATIO };
  assert.deepEqual(four(fields), {
    ...NEW_KEYS,
    rounding: "floor",
    mode: RATIO,
  });
  // Each old key is carried as it is, malformed or not, for the validation
  // to default; a missing one stays missing.
  assert.deepEqual(four({ ...fields, maxBits: "4096" }), {
    ...NEW_KEYS,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    rounding: "floor",
    mode: RATIO,
  });
  assert.deepEqual(four({ rounding: "floor" }), {
    ...DEFAULT_SETTINGS,
    rounding: "floor",
  });
  // A budget stored at version 4, which no build wrote, is passed through.
  assert.equal(four({ ...fields, budgetMs: 200 }).budgetMs, 200);
  // The new keys at version 4 are not read: version 4 did not have them.
  assert.deepEqual(four({ ...fields, displayDigits: 20 }).displayDigits, 12);
  assert.deepEqual(four(5), DEFAULT_SETTINGS);
  assert.deepEqual(four(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 4 }), DEFAULT_SETTINGS);
});

test("a version 5 object loads the settings it holds, with the fallbacks and clamps", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
    rounding: "floor",
  };
  assert.deepEqual(load(settings), settings);
  assert.deepEqual(load({ displayDigits: 12, mode: 7 }), {
    ...DEFAULT_SETTINGS,
    displayDigits: 12,
  });
  assert.equal(
    load({ displayDigits: 50, precisionLimitDigits: 20 }).displayDigits,
    20,
  );
  assert.deepEqual(load(5), DEFAULT_SETTINGS);
  assert.deepEqual(load(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 5 }), DEFAULT_SETTINGS);
  // A version 5 object still carrying old fields: they are ignored.
  assert.deepEqual(load({ ...settings, fractions: true, digits: 3 }), settings);
});

test("a version from the future, or one that is not a positive integer, gives the defaults", () => {
  const settings = { ...DEFAULT_SETTINGS, displayDigits: 12 };
  for (const version of [STORAGE_VERSION + 1, 99, 0, -1, 1.5, "2", null, {}]) {
    assert.deepEqual(
      loadStored(envelope(settings, version)),
      DEFAULT_SETTINGS,
      String(version),
    );
  }
  // Then the next save overwrites it at the current version.
  const store = storage({
    [SETTINGS_KEY]: JSON.stringify(envelope(settings, STORAGE_VERSION + 1)),
  });
  saveSettings(store, loadSettings(store), BUILD);
  assert.deepEqual(
    JSON.parse(store.map.get(SETTINGS_KEY)!),
    envelope(DEFAULT_SETTINGS),
  );
});

test("every migration is total: a fixture of its source version, with each field missing or malformed, migrates without throwing", () => {
  const fixtures: Record<number, { stored: unknown; loads: Settings }> = {
    1: {
      stored: {
        ...OLD_KEYS,
        rounding: "floor",
        mode: "decimal",
        fractions: true,
      },
      loads: { ...NEW_KEYS, rounding: "floor", mode: DECIMAL },
    },
    2: {
      stored: {
        ...OLD_KEYS,
        rounding: "halfAwayFromZero",
        mode: "exact",
        fractions: true,
      },
      loads: { ...NEW_KEYS, rounding: "halfEven", mode: RATIO },
    },
    3: {
      stored: {
        ...OLD_KEYS,
        rounding: "floor",
        mode: { kind: "exact", notation: "ratio" },
      },
      loads: { ...NEW_KEYS, rounding: "floor", mode: RATIO },
    },
    4: {
      stored: { ...OLD_KEYS, rounding: "floor", mode: RATIO },
      loads: { ...NEW_KEYS, rounding: "floor", mode: RATIO },
    },
  };
  assert.deepEqual(Object.keys(fixtures).map(Number), [
    ...Array.from({ length: STORAGE_VERSION - 1 }, (_, i) => i + 1),
  ]);
  for (const [version, { stored: fixture, loads }] of Object.entries(
    fixtures,
  )) {
    const malformed = [fixture, 5, null, "text", [], {}];
    for (const [key] of Object.entries(fixture as object)) {
      const { [key]: _dropped, ...rest } = fixture as Record<string, unknown>;
      malformed.push(
        rest,
        { ...rest, [key]: "bogus" },
        { ...rest, [key]: null },
      );
    }
    for (const stored of malformed) {
      const text = JSON.stringify(
        Number(version) === 1
          ? stored
          : { version: Number(version), settings: stored },
      );
      assert.doesNotThrow(() =>
        loadSettings(storage({ [SETTINGS_KEY]: text })),
      );
    }
    const text = JSON.stringify(
      Number(version) === 1
        ? fixture
        : { version: Number(version), settings: fixture },
    );
    assert.deepEqual(loadSettings(storage({ [SETTINGS_KEY]: text })), loads);
  }
});

test("reset gives the defaults, for all the settings or for one with the clamp after it", () => {
  const settings: Settings = {
    displayDigits: 30,
    rounding: "halfAwayFromZero",
    mode: { kind: "decimal", working: { kind: "extended", digits: 40 } },
    precisionLimitDigits: 50,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    budgetMs: 200,
  };
  assert.deepEqual(resetSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(resetSetting(settings, "rounding"), {
    ...settings,
    rounding: DEFAULT_SETTINGS.rounding,
  });
  assert.deepEqual(resetSetting(settings, "budgetMs"), {
    ...settings,
    budgetMs: DEFAULT_BUDGET_MS,
  });
  // Resetting the display digits to eight leaves an extended count of
  // forty, still within its range, as it is.
  assert.deepEqual(resetSetting(settings, "displayDigits"), {
    ...settings,
    displayDigits: DEFAULT_SETTINGS.displayDigits,
  });
  // Resetting the mode resets the whole variant.
  assert.deepEqual(resetSetting(settings, "mode"), {
    ...settings,
    mode: DEFAULT_SETTINGS.mode,
  });
  // Resetting the precision limit to its default raises what the display
  // digits may be; they stay.
  assert.deepEqual(resetSetting(settings, "precisionLimitDigits"), {
    ...settings,
    precisionLimitDigits: DEFAULT_SETTINGS.precisionLimitDigits,
  });
  // Resetting the significand limit below what the precision limit needs
  // lowers the precision limit, and the display digits with it: the clamp
  // after a reset is the clamp after any change.
  const high: Settings = {
    ...DEFAULT_SETTINGS,
    significandLimitBits: 1 << 18,
    precisionLimitDigits: 5000,
    displayDigits: 4000,
    mode: { kind: "decimal", working: { kind: "extended", digits: 4500 } },
  };
  const reset = resetSetting(high, "significandLimitBits");
  assert.equal(
    reset.significandLimitBits,
    DEFAULT_SETTINGS.significandLimitBits,
  );
  assert.equal(
    reset.precisionLimitDigits,
    precisionLimitFor(DEFAULT_SETTINGS.significandLimitBits),
  );
  assert.equal(reset.displayDigits, reset.precisionLimitDigits);
  assert.deepEqual(reset.mode, {
    kind: "decimal",
    working: { kind: "extended", digits: reset.precisionLimitDigits },
  });
  assert.ok(isDefault(DEFAULT_SETTINGS, "displayDigits"));
  assert.ok(!isDefault(settings, "displayDigits"));
  assert.ok(
    isDefault(resetSetting(settings, "displayDigits"), "displayDigits"),
  );
  // The mode is compared by value, since it is no longer a primitive.
  assert.ok(
    isDefault({ ...settings, mode: { ...DEFAULT_SETTINGS.mode } }, "mode"),
  );
  assert.ok(!isDefault(settings, "mode"));
  assert.ok(!isDefault({ ...settings, mode: RATIO }, "mode"));
  assert.ok(sameMode(EXTENDED, { ...EXTENDED }));
  assert.ok(
    sameMode(DECIMAL, { kind: "decimal", working: { kind: "digits" } }),
  );
  assert.ok(!sameMode(DECIMAL, EXTENDED));
  assert.ok(
    !sameMode(EXTENDED, {
      kind: "decimal",
      working: { kind: "extended", digits: 13 },
    }),
  );
  assert.ok(!sameMode(RATIO, DECIMAL) && !sameMode(DECIMAL, RATIO));
  assert.ok(!sameMode(RATIO, DEFAULT_SETTINGS.mode));
  assert.ok(sameMode(RATIO, { ...RATIO }) && !sameMode(RATIO, WIDE));
  assert.ok(sameNotation({ kind: "digits" }, { kind: "digits" }));
  assert.ok(!sameNotation({ kind: "digits" }, { kind: "ratio", width: 20 }));
});

test("a reset of a field within the mode's variant is within the variant in force, and shows as off its default only there", () => {
  const ratio: Settings = {
    ...DEFAULT_SETTINGS,
    mode: { kind: "exact", notation: { kind: "ratio", width: 30 } },
  };
  assert.ok(!isAtDefault(ratio, "notation"));
  assert.deepEqual(withDefault(ratio, "notation"), DEFAULT_SETTINGS);
  assert.ok(isAtDefault(withDefault(ratio, "notation"), "notation"));
  const extended: Settings = {
    ...DEFAULT_SETTINGS,
    mode: { kind: "decimal", working: { kind: "extended", digits: 12 } },
  };
  assert.ok(!isAtDefault(extended, "working"));
  assert.deepEqual(withDefault(extended, "working"), {
    ...DEFAULT_SETTINGS,
    mode: { kind: "decimal", working: { kind: "digits" } },
  });
  // A field of the variant not in force has no value: at its default, and a reset of it changes nothing.
  assert.ok(isAtDefault(ratio, "working"));
  assert.ok(isAtDefault(extended, "notation"));
  assert.deepEqual(withDefault(ratio, "working"), ratio);
  assert.deepEqual(withDefault(extended, "notation"), extended);
  // The mode's own reset is the whole variant; a key's is the key, unclamped.
  assert.deepEqual(withDefault(extended, "mode"), DEFAULT_SETTINGS);
  assert.ok(!isAtDefault(extended, "mode"));
  const high: Settings = {
    ...DEFAULT_SETTINGS,
    precisionLimitDigits: 20,
    displayDigits: 20,
  };
  assert.deepEqual(withDefault(high, "precisionLimitDigits"), {
    ...high,
    precisionLimitDigits: DEFAULT_SETTINGS.precisionLimitDigits,
  });
  assert.ok(isAtDefault(DEFAULT_SETTINGS, "displayDigits"));
});
