import assert from "node:assert/strict";
import { inspect } from "node:util";
import { test } from "node:test";
import {
  DEFAULT_MAX_BITS,
  DEFAULT_MAX_DIGITS,
  MIN_MAX_BITS,
  ceilingFor,
  maxDigitsFor,
} from "./core/context.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import {
  DEFAULT_MODES,
  DEFAULT_SETTINGS,
  DEFAULT_WIDTH,
  SETTINGS_KEY,
  WIDTH_LIMIT,
  clampSettings,
  contextOf,
  isMaxBits,
  isIntegerIn,
  isNotationKind,
  isRoundingMode,
  isDefault,
  isMode,
  rangesOf,
  loadSettings,
  resetSetting,
  resetSettings,
  sameMode,
  sameNotation,
  saveSettings,
  ratioOf,
  STORAGE_VERSION,
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
    digits: 8,
    rounding: "halfEven",
    mode: { kind: "exact", notation: { kind: "digits" } },
    maxDigits: 1000,
    maxBits: 65536,
  });
  assert.deepEqual(DEFAULT_MODES, {
    exact: { kind: "exact", notation: { kind: "digits" } },
    decimal: { kind: "decimal", working: { kind: "digits" } },
  });
  assert.equal(DEFAULT_WIDTH, 20);
  assert.equal(WIDTH_LIMIT, 1000);
});

test("stored settings are parsed", () => {
  const stored = {
    digits: 12,
    rounding: "floor",
    mode: EXTENDED,
    maxDigits: 100,
    maxBits: 4096,
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
    maxBits: DEFAULT_MAX_BITS,
    ceiling: ceilingFor(DEFAULT_MAX_DIGITS),
    mode: "decimal",
    working: 12,
  });
  // Whether ratios are shown is exact mode's notation alone.
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: RATIO })?.width, 20);
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: WIDE })?.width, 1000);
  assert.equal(ratioOf(DEFAULT_SETTINGS), undefined);
  assert.equal(ratioOf({ ...DEFAULT_SETTINGS, mode: DECIMAL }), undefined);
});

test("each field that is missing or invalid falls back to its default alone", () => {
  assert.deepEqual(load({ digits: 12 }), { ...DEFAULT_SETTINGS, digits: 12 });
  assert.deepEqual(load({ rounding: "ceiling" }), {
    ...DEFAULT_SETTINGS,
    rounding: "ceiling",
  });
  assert.deepEqual(load({ maxDigits: 50 }), {
    ...DEFAULT_SETTINGS,
    maxDigits: 50,
  });
  assert.deepEqual(load({ maxBits: 1 << 17 }), {
    ...DEFAULT_SETTINGS,
    maxBits: 1 << 17,
  });
  for (const digits of [0, -1, 2.5, "12", null]) {
    assert.deepEqual(load({ digits, rounding: "ceiling" }), {
      ...DEFAULT_SETTINGS,
      rounding: "ceiling",
    });
  }
  assert.deepEqual(load({ digits: 1 }), { ...DEFAULT_SETTINGS, digits: 1 });
  assert.deepEqual(load({ digits: 12, rounding: "nearest" }), {
    ...DEFAULT_SETTINGS,
    digits: 12,
  });
  assert.deepEqual(load({ digits: 12, rounding: 3 }), {
    ...DEFAULT_SETTINGS,
    digits: 12,
  });
  for (const maxBits of [0, MIN_MAX_BITS - 1, LIMIT_BITS + 1, 1.5, "65536"]) {
    assert.deepEqual(load({ maxBits }), DEFAULT_SETTINGS, `${maxBits}`);
  }
  assert.deepEqual(load({ maxBits: MIN_MAX_BITS }), {
    ...DEFAULT_SETTINGS,
    maxBits: MIN_MAX_BITS,
    maxDigits: 1,
    digits: 1,
  });
  assert.deepEqual(load({ maxBits: LIMIT_BITS }), {
    ...DEFAULT_SETTINGS,
    maxBits: LIMIT_BITS,
  });
  for (const maxDigits of [0, -3, 2.5, "500"]) {
    assert.deepEqual(load({ maxDigits }), DEFAULT_SETTINGS, `${maxDigits}`);
  }
  assert.deepEqual(load(null), DEFAULT_SETTINGS);
  assert.deepEqual(load([1, 2]), DEFAULT_SETTINGS);
  assert.deepEqual(load("floor"), DEFAULT_SETTINGS);
  assert.deepEqual(load(42), DEFAULT_SETTINGS);
});

test("the dependent settings are clamped: the cap to the range limit, the digits to the cap, the working digits between them", () => {
  // A cap above what the range limit holds comes down to it.
  const cap = maxDigitsFor(DEFAULT_MAX_BITS);
  assert.deepEqual(load({ maxDigits: cap + 1 }), {
    ...DEFAULT_SETTINGS,
    maxDigits: cap,
  });
  assert.deepEqual(load({ maxDigits: cap }), {
    ...DEFAULT_SETTINGS,
    maxDigits: cap,
  });
  // Digits above the cap come down to it.
  assert.deepEqual(load({ digits: 1001 }), {
    ...DEFAULT_SETTINGS,
    digits: 1000,
  });
  assert.deepEqual(load({ digits: 300, maxDigits: 200 }), {
    ...DEFAULT_SETTINGS,
    digits: 200,
    maxDigits: 200,
  });
  // A small range limit lowers both.
  const small = load({ digits: 100, maxDigits: 500, maxBits: 1024 });
  assert.equal(small.maxBits, 1024);
  assert.equal(small.maxDigits, maxDigitsFor(1024));
  assert.ok(small.maxDigits < 100);
  assert.equal(small.digits, small.maxDigits);
  // `clampSettings` is the same rule on its own, for the panel.
  assert.deepEqual(clampSettings({ ...DEFAULT_SETTINGS, maxBits: 1024 }), {
    ...DEFAULT_SETTINGS,
    maxBits: 1024,
    maxDigits: maxDigitsFor(1024),
    digits: Math.min(8, maxDigitsFor(1024)),
  });
  assert.deepEqual(clampSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  assert.deepEqual(clampSettings({ ...DEFAULT_SETTINGS, maxDigits: 4 }), {
    ...DEFAULT_SETTINGS,
    maxDigits: 4,
    digits: 4,
  });
  // An extended count of working digits is clamped last, between the
  // digits and the cap: raising the digits above it raises it, lowering
  // the cap below it lowers it, and a count between them is kept.
  const extended = (digits: number): ModeSetting => ({
    kind: "decimal",
    working: { kind: "extended", digits },
  });
  const at = (digits: number, working: number, maxDigits = 1000): Settings => ({
    ...DEFAULT_SETTINGS,
    digits,
    maxDigits,
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
  // The ranges the panel reads: the working digits from the digits to the cap.
  assert.deepEqual(rangesOf(at(8, 12, 100)), {
    maxBits: { min: MIN_MAX_BITS, max: LIMIT_BITS },
    maxDigits: { min: 1, max: maxDigitsFor(DEFAULT_MAX_BITS) },
    digits: { min: 1, max: 100 },
    working: { min: 8, max: 100 },
    width: { min: 1, max: 1000 },
  });
  assert.ok(isIntegerIn(12, rangesOf(at(8, 12)).working));
  assert.ok(!isIntegerIn(7, rangesOf(at(8, 12)).working));
  assert.ok(isMaxBits(DEFAULT_MAX_BITS) && !isMaxBits(0));
  assert.ok(isRoundingMode("floor") && !isRoundingMode("nearest"));
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
      digits: 10,
      rounding: "halfAwayFromZero",
      mode,
      maxDigits: 2000,
      maxBits: 1 << 17,
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
  assert.equal(STORAGE_VERSION, 4);
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
    digits: 12,
    rounding: "floor",
    mode: DECIMAL,
    maxDigits: 100,
    maxBits: 4096,
  };
  assert.deepEqual(loaded, expected);
  saveSettings(store, loaded, BUILD);
  assert.deepEqual(
    JSON.parse(store.map.get(SETTINGS_KEY)!),
    envelope(expected),
  );
});

test("a version 2 object loads as the nested mode: the mode name and the fractions flag become the variant, and the old rounding default becomes the new (docs/settings-modes.md)", () => {
  const two = (settings: unknown) => loadStored(envelope(settings, 2));
  const fields = {
    digits: 12,
    rounding: "floor",
    maxDigits: 100,
    maxBits: 4096,
  };
  // Each combination of the mode and the flag.
  assert.deepEqual(two({ ...fields, mode: "exact", fractions: false }), {
    ...fields,
    mode: { kind: "exact", notation: { kind: "digits" } },
  });
  assert.deepEqual(two({ ...fields, mode: "exact", fractions: true }), {
    ...fields,
    mode: RATIO,
  });
  assert.deepEqual(two({ ...fields, mode: "decimal", fractions: false }), {
    ...fields,
    mode: DECIMAL,
  });
  assert.deepEqual(two({ ...fields, mode: "decimal", fractions: true }), {
    ...fields,
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
  // At version 3 the old default is a choice and is kept.
  assert.equal(
    load({ ...fields, rounding: "halfAwayFromZero" }).rounding,
    "halfAwayFromZero",
  );
  // A field missing or malformed inside the envelope falls back on its own,
  // and the dependents are clamped as for a bare object.
  assert.deepEqual(two({ digits: 12, mode: 7 }), {
    ...DEFAULT_SETTINGS,
    digits: 12,
  });
  assert.equal(two({ digits: 50, maxDigits: 20 }).digits, 20);
  // An envelope whose settings are not an object gives the defaults.
  assert.deepEqual(two(5), DEFAULT_SETTINGS);
  assert.deepEqual(two(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 2 }), DEFAULT_SETTINGS);
  // The next save writes the current version.
  const store = storage({
    [SETTINGS_KEY]: JSON.stringify(
      envelope({ ...fields, mode: "exact", fractions: true }, 2),
    ),
  });
  saveSettings(store, loadSettings(store), BUILD);
  assert.deepEqual(
    JSON.parse(store.map.get(SETTINGS_KEY)!),
    envelope({ ...fields, mode: RATIO }),
  );
});

test("a version 3 object loads with the notation nested: the string becomes the variant, a ratio at the default width (docs/ratio-width.md)", () => {
  const three = (settings: unknown) => loadStored(envelope(settings, 3));
  const fields = {
    digits: 12,
    rounding: "floor",
    maxDigits: 100,
    maxBits: 4096,
  };
  assert.deepEqual(
    three({ ...fields, mode: { kind: "exact", notation: "digits" } }),
    {
      ...fields,
      mode: { kind: "exact", notation: { kind: "digits" } },
    },
  );
  assert.deepEqual(
    three({ ...fields, mode: { kind: "exact", notation: "ratio" } }),
    {
      ...fields,
      mode: RATIO,
    },
  );
  // A decimal mode passes through untouched; a notation that is neither
  // string, and a malformed mode, default.
  assert.deepEqual(three({ ...fields, mode: EXTENDED }), {
    ...fields,
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
  // Through both migrations from version 2, and saved at the current version.
  const store = storage({
    [SETTINGS_KEY]: JSON.stringify(
      envelope({ ...fields, mode: "exact", fractions: true }, 2),
    ),
  });
  assert.deepEqual(loadSettings(store), { ...fields, mode: RATIO });
  saveSettings(store, loadSettings(store), BUILD);
  assert.equal(JSON.parse(store.map.get(SETTINGS_KEY)!).version, 4);
});

test("a version 4 object loads the settings it holds, with the fallbacks and clamps", () => {
  const settings = { ...DEFAULT_SETTINGS, digits: 12, rounding: "floor" };
  assert.deepEqual(load(settings), settings);
  assert.deepEqual(load({ digits: 12, mode: 7 }), {
    ...DEFAULT_SETTINGS,
    digits: 12,
  });
  assert.equal(load({ digits: 50, maxDigits: 20 }).digits, 20);
  assert.deepEqual(load(5), DEFAULT_SETTINGS);
  assert.deepEqual(load(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadStored({ version: 4 }), DEFAULT_SETTINGS);
  // A version 4 object still carrying the old fields: they are ignored.
  assert.deepEqual(load({ ...settings, fractions: true }), settings);
});

test("a version from the future, or one that is not a positive integer, gives the defaults", () => {
  const settings = { ...DEFAULT_SETTINGS, digits: 12 };
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
        digits: 12,
        rounding: "floor",
        mode: "decimal",
        maxDigits: 100,
        maxBits: 4096,
        fractions: true,
      },
      loads: {
        digits: 12,
        rounding: "floor",
        mode: DECIMAL,
        maxDigits: 100,
        maxBits: 4096,
      },
    },
    2: {
      stored: {
        digits: 12,
        rounding: "halfAwayFromZero",
        mode: "exact",
        maxDigits: 100,
        maxBits: 4096,
        fractions: true,
      },
      loads: {
        digits: 12,
        rounding: "halfEven",
        mode: RATIO,
        maxDigits: 100,
        maxBits: 4096,
      },
    },
    3: {
      stored: {
        digits: 12,
        rounding: "floor",
        mode: { kind: "exact", notation: "ratio" },
        maxDigits: 100,
        maxBits: 4096,
      },
      loads: {
        digits: 12,
        rounding: "floor",
        mode: RATIO,
        maxDigits: 100,
        maxBits: 4096,
      },
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
    digits: 30,
    rounding: "halfAwayFromZero",
    mode: { kind: "decimal", working: { kind: "extended", digits: 40 } },
    maxDigits: 50,
    maxBits: DEFAULT_MAX_BITS,
  };
  assert.deepEqual(resetSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(resetSetting(settings, "rounding"), {
    ...settings,
    rounding: DEFAULT_SETTINGS.rounding,
  });
  // Resetting the digits to eight leaves an extended count of forty, still
  // within its range, as it is.
  assert.deepEqual(resetSetting(settings, "digits"), {
    ...settings,
    digits: DEFAULT_SETTINGS.digits,
  });
  // Resetting the mode resets the whole variant.
  assert.deepEqual(resetSetting(settings, "mode"), {
    ...settings,
    mode: DEFAULT_SETTINGS.mode,
  });
  // Resetting the cap to its default raises what the digits may be; they stay.
  assert.deepEqual(resetSetting(settings, "maxDigits"), {
    ...settings,
    maxDigits: DEFAULT_SETTINGS.maxDigits,
  });
  // Resetting the range limit below what the cap needs lowers the cap, and
  // the digits with it: the clamp after a reset is the clamp after any change.
  const high: Settings = {
    ...DEFAULT_SETTINGS,
    maxBits: 1 << 18,
    maxDigits: 5000,
    digits: 4000,
    mode: { kind: "decimal", working: { kind: "extended", digits: 4500 } },
  };
  const reset = resetSetting(high, "maxBits");
  assert.equal(reset.maxBits, DEFAULT_SETTINGS.maxBits);
  assert.equal(reset.maxDigits, maxDigitsFor(DEFAULT_SETTINGS.maxBits));
  assert.equal(reset.digits, reset.maxDigits);
  assert.deepEqual(reset.mode, {
    kind: "decimal",
    working: { kind: "extended", digits: reset.maxDigits },
  });
  assert.ok(isDefault(DEFAULT_SETTINGS, "digits"));
  assert.ok(!isDefault(settings, "digits"));
  assert.ok(isDefault(resetSetting(settings, "digits"), "digits"));
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
