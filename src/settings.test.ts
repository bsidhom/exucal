import assert from "node:assert/strict";
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
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  clampSettings,
  contextOf,
  isMaxBits,
  isIntegerIn,
  isRoundingMode,
  isDefault,
  isMode,
  rangesOf,
  loadSettings,
  resetSetting,
  resetSettings,
  saveSettings,
  STORAGE_VERSION,
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

/** The settings `value` loads as, through a storage holding its JSON. */
function load(value: unknown): Settings {
  return loadSettings(storage({ [SETTINGS_KEY]: JSON.stringify(value) }));
}

test("an empty storage gives the defaults", () => {
  assert.deepEqual(loadSettings(storage()), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, {
    digits: 8,
    rounding: "halfAwayFromZero",
    mode: "exact",
    maxDigits: 1000,
    maxBits: 65536,
    fractions: false,
  });
});

test("stored settings are parsed", () => {
  const stored = {
    digits: 12,
    rounding: "floor",
    mode: "decimal",
    maxDigits: 100,
    maxBits: 4096,
    fractions: true,
  };
  assert.deepEqual(load(stored), stored);
});

test("the fractions setting loads, defaults to off when missing or not a boolean, and saves", () => {
  assert.equal(load({ fractions: true }).fractions, true);
  assert.equal(load({ fractions: false }).fractions, false);
  for (const fractions of [undefined, "true", 1, null, "yes", []]) {
    assert.equal(load({ fractions }).fractions, false, String(fractions));
  }
  // Settings stored before the setting existed load with it off.
  assert.deepEqual(load({ digits: 12, rounding: "floor", mode: "decimal" }), {
    ...DEFAULT_SETTINGS,
    digits: 12,
    rounding: "floor",
    mode: "decimal",
  });
  const store = storage();
  saveSettings(store, { ...DEFAULT_SETTINGS, fractions: true }, BUILD);
  assert.equal(loadSettings(store).fractions, true);
  // A display setting: the context the pipeline takes does not carry it.
  assert.ok(
    !("fractions" in contextOf({ ...DEFAULT_SETTINGS, fractions: true })),
  );
});

test("the mode loads, defaults to exact when missing or neither, saves and reaches the context", () => {
  assert.equal(load({ mode: "decimal" }).mode, "decimal");
  assert.equal(load({ mode: "exact" }).mode, "exact");
  for (const mode of [undefined, "approximate", "Decimal", 1, null, ""]) {
    assert.equal(load({ mode }).mode, "exact", String(mode));
  }
  // Settings stored before the mode existed load with it exact.
  assert.deepEqual(
    load({ digits: 12, rounding: "floor", maxDigits: 100, maxBits: 4096 }),
    {
      digits: 12,
      rounding: "floor",
      mode: "exact",
      maxDigits: 100,
      maxBits: 4096,
      fractions: false,
    },
  );
  const store = storage();
  saveSettings(store, { ...DEFAULT_SETTINGS, mode: "decimal" }, BUILD);
  assert.equal(loadSettings(store).mode, "decimal");
  assert.equal(
    contextOf({ ...DEFAULT_SETTINGS, mode: "decimal" }).mode,
    "decimal",
  );
  assert.equal(contextOf(DEFAULT_SETTINGS).mode, "exact");
  assert.ok(isMode("exact") && isMode("decimal"));
  assert.ok(!isMode("Exact") && !isMode(undefined) && !isMode(0));
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

test("the dependent settings are clamped: the cap to the range limit, the digits to the cap", () => {
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
  const stored = storage();
  const settings: Settings = {
    digits: 30,
    rounding: "halfEven",
    mode: "decimal",
    maxDigits: 2000,
    maxBits: 1 << 17,
    fractions: true,
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
});

/** A stored object at version 2 holding `settings`. */
function envelope(settings: unknown, version: unknown = 2): unknown {
  return { version, savedBy: BUILD, settings };
}

test("a version 1 object, the fields bare, loads as it did and is saved back as version 2", () => {
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
  assert.deepEqual(loaded, bare);
  saveSettings(store, loaded, BUILD);
  assert.deepEqual(JSON.parse(store.map.get(SETTINGS_KEY)!), envelope(bare));
});

test("a version 2 object loads the settings it holds, with the fallbacks and clamps", () => {
  const settings = { ...DEFAULT_SETTINGS, digits: 12, rounding: "floor" };
  assert.deepEqual(load(envelope(settings)), settings);
  // A field missing or malformed inside the envelope falls back on its own.
  assert.deepEqual(load(envelope({ digits: 12, mode: 7 })), {
    ...DEFAULT_SETTINGS,
    digits: 12,
  });
  // The dependents are clamped as for a bare object.
  assert.equal(load(envelope({ digits: 50, maxDigits: 20 })).digits, 20);
  // An envelope whose settings are not an object gives the defaults.
  assert.deepEqual(load(envelope(5)), DEFAULT_SETTINGS);
  assert.deepEqual(load(envelope(null)), DEFAULT_SETTINGS);
  assert.deepEqual(load({ version: 2 }), DEFAULT_SETTINGS);
});

test("a version from the future, or one that is not a positive integer, gives the defaults", () => {
  const settings = { ...DEFAULT_SETTINGS, digits: 12 };
  for (const version of [STORAGE_VERSION + 1, 99, 0, -1, 1.5, "2", null, {}]) {
    assert.deepEqual(
      load(envelope(settings, version)),
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
  const fixtures: Record<number, unknown> = {
    1: {
      digits: 12,
      rounding: "floor",
      mode: "decimal",
      maxDigits: 100,
      maxBits: 4096,
      fractions: true,
    },
  };
  assert.deepEqual(Object.keys(fixtures).map(Number), [
    ...Array.from({ length: STORAGE_VERSION - 1 }, (_, i) => i + 1),
  ]);
  for (const [version, fixture] of Object.entries(fixtures)) {
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
    assert.deepEqual(
      loadSettings(storage({ [SETTINGS_KEY]: JSON.stringify(fixture) })),
      fixture,
    );
  }
});

test("reset gives the defaults, for all the settings or for one with the clamp after it", () => {
  const settings: Settings = {
    digits: 30,
    rounding: "halfEven",
    mode: "decimal",
    maxDigits: 50,
    maxBits: DEFAULT_MAX_BITS,
    fractions: true,
  };
  assert.deepEqual(resetSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(resetSetting(settings, "rounding"), {
    ...settings,
    rounding: DEFAULT_SETTINGS.rounding,
  });
  assert.deepEqual(resetSetting(settings, "digits"), {
    ...settings,
    digits: DEFAULT_SETTINGS.digits,
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
  };
  const reset = resetSetting(high, "maxBits");
  assert.equal(reset.maxBits, DEFAULT_SETTINGS.maxBits);
  assert.equal(reset.maxDigits, maxDigitsFor(DEFAULT_SETTINGS.maxBits));
  assert.equal(reset.digits, reset.maxDigits);
  assert.ok(isDefault(DEFAULT_SETTINGS, "digits"));
  assert.ok(!isDefault(settings, "digits"));
  assert.ok(isDefault(resetSetting(settings, "digits"), "digits"));
});

test("contextOf is the settings as the pipeline takes them, with the cap's ceiling", () => {
  const settings: Settings = {
    digits: 12,
    rounding: "floor",
    mode: "decimal",
    maxDigits: 300,
    maxBits: 4096,
    fractions: false,
  };
  assert.deepEqual(contextOf(settings), {
    precision: 12,
    rounding: "floor",
    maxBits: 4096,
    ceiling: ceilingFor(300),
    mode: "decimal",
  });
  assert.equal(contextOf(DEFAULT_SETTINGS).ceiling, 4040);
});

test("the ranges of the number settings follow the settings above them", () => {
  const cap = maxDigitsFor(DEFAULT_MAX_BITS);
  assert.deepEqual(rangesOf(DEFAULT_SETTINGS), {
    maxBits: { min: MIN_MAX_BITS, max: LIMIT_BITS },
    maxDigits: { min: 1, max: cap },
    digits: { min: 1, max: DEFAULT_MAX_DIGITS },
  });
  assert.deepEqual(rangesOf({ ...DEFAULT_SETTINGS, maxBits: 100 }).maxDigits, {
    min: 1,
    max: maxDigitsFor(100),
  });
  assert.deepEqual(rangesOf({ ...DEFAULT_SETTINGS, maxDigits: 8 }).digits, {
    min: 1,
    max: 8,
  });
});

test("the validators accept the integers of their ranges and nothing else", () => {
  const digits = { min: 1, max: 8 };
  assert.ok(isIntegerIn(1, digits));
  assert.ok(isIntegerIn(8, digits));
  assert.ok(!isIntegerIn(9, digits));
  assert.ok(!isIntegerIn(0, digits));
  assert.ok(!isIntegerIn(1.5, digits));
  assert.ok(!isIntegerIn(NaN, digits));
  assert.ok(!isIntegerIn("8", digits));
  assert.ok(!isIntegerIn(undefined, digits));
  const cap = maxDigitsFor(DEFAULT_MAX_BITS);
  const { maxDigits } = rangesOf(DEFAULT_SETTINGS);
  assert.ok(isIntegerIn(1, maxDigits));
  assert.ok(isIntegerIn(DEFAULT_MAX_DIGITS, maxDigits));
  assert.ok(isIntegerIn(cap, maxDigits));
  assert.ok(!isIntegerIn(cap + 1, maxDigits));
  assert.ok(!isIntegerIn(0, maxDigits));
  assert.ok(
    !isIntegerIn(1, rangesOf({ ...DEFAULT_SETTINGS, maxBits: 100 }).maxDigits),
  );
  assert.ok(isMaxBits(MIN_MAX_BITS));
  assert.ok(isMaxBits(DEFAULT_MAX_BITS));
  assert.ok(isMaxBits(LIMIT_BITS));
  assert.ok(!isMaxBits(MIN_MAX_BITS - 1));
  assert.ok(!isMaxBits(LIMIT_BITS + 1));
  assert.ok(!isMaxBits(65536.5));
  assert.ok(!isMaxBits("65536"));
  assert.ok(isRoundingMode("halfEven") && isRoundingMode("floor"));
  assert.ok(!isRoundingMode("nearest") && !isRoundingMode(undefined));
});
