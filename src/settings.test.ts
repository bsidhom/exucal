import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_MAX_BITS, MAX_DIGITS } from "./core/context.ts";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  contextOf,
  isDigits,
  loadSettings,
  saveSettings,
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

test("an empty storage gives the defaults", () => {
  assert.deepEqual(loadSettings(storage()), DEFAULT_SETTINGS);
  assert.deepEqual(DEFAULT_SETTINGS, {
    digits: 8,
    rounding: "halfAwayFromZero",
  });
});

test("stored settings are parsed", () => {
  const stored = storage({
    [SETTINGS_KEY]: JSON.stringify({ digits: 12, rounding: "floor" }),
  });
  assert.deepEqual(loadSettings(stored), { digits: 12, rounding: "floor" });
});

test("each field that is missing or invalid falls back to its default alone", () => {
  const load = (value: unknown) =>
    loadSettings(storage({ [SETTINGS_KEY]: JSON.stringify(value) }));
  assert.deepEqual(load({ digits: 12 }), {
    digits: 12,
    rounding: "halfAwayFromZero",
  });
  assert.deepEqual(load({ rounding: "ceiling" }), {
    digits: 8,
    rounding: "ceiling",
  });
  assert.deepEqual(load({ digits: 0, rounding: "ceiling" }), {
    digits: 8,
    rounding: "ceiling",
  });
  assert.deepEqual(load({ digits: MAX_DIGITS + 1 }), DEFAULT_SETTINGS);
  assert.deepEqual(load({ digits: MAX_DIGITS }), {
    digits: MAX_DIGITS,
    rounding: "halfAwayFromZero",
  });
  assert.deepEqual(load({ digits: 1 }), {
    digits: 1,
    rounding: "halfAwayFromZero",
  });
  assert.deepEqual(load({ digits: 2.5 }), DEFAULT_SETTINGS);
  assert.deepEqual(load({ digits: "12" }), DEFAULT_SETTINGS);
  assert.deepEqual(load({ digits: 12, rounding: "nearest" }), {
    digits: 12,
    rounding: "halfAwayFromZero",
  });
  assert.deepEqual(load({ digits: 12, rounding: 3 }), {
    digits: 12,
    rounding: "halfAwayFromZero",
  });
  assert.deepEqual(load(null), DEFAULT_SETTINGS);
  assert.deepEqual(load([1, 2]), DEFAULT_SETTINGS);
  assert.deepEqual(load("floor"), DEFAULT_SETTINGS);
  assert.deepEqual(load(42), DEFAULT_SETTINGS);
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
  assert.doesNotThrow(() => saveSettings(throwing, DEFAULT_SETTINGS));
});

test("settings round-trip through storage, under one key", () => {
  const stored = storage();
  saveSettings(stored, { digits: 30, rounding: "halfEven" });
  assert.deepEqual([...stored.map.keys()], [SETTINGS_KEY]);
  assert.deepEqual(loadSettings(stored), { digits: 30, rounding: "halfEven" });
  saveSettings(stored, DEFAULT_SETTINGS);
  assert.deepEqual(loadSettings(stored), DEFAULT_SETTINGS);
});

test("contextOf is the settings as the pipeline takes them", () => {
  assert.deepEqual(contextOf({ digits: 12, rounding: "floor" }), {
    precision: 12,
    rounding: "floor",
    maxBits: DEFAULT_MAX_BITS,
  });
});

test("isDigits accepts the integers of the range and nothing else", () => {
  assert.ok(isDigits(1));
  assert.ok(isDigits(8));
  assert.ok(isDigits(MAX_DIGITS));
  assert.ok(!isDigits(0));
  assert.ok(!isDigits(MAX_DIGITS + 1));
  assert.ok(!isDigits(1.5));
  assert.ok(!isDigits(NaN));
  assert.ok(!isDigits("8"));
  assert.ok(!isDigits(undefined));
});
