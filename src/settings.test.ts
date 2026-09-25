// Checks that the settings survive every way storage can go wrong: no
// store, a store that throws, nothing stored, text that is not JSON or not
// an object, a setting of the wrong type, and settings this version does
// not know. Each must give the defaults for what could not be read and
// never throw, since a bad stored value must not keep the app from
// starting. A round trip through a fake store checks the happy path.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  parseSettings,
  saveSettings,
  type SettingsStore,
} from "./settings.ts";

/** A store over a map, as `localStorage` is over the browser's storage. */
function fakeStore(): SettingsStore & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

test("nothing stored gives the defaults", () => {
  assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(loadSettings(fakeStore()), DEFAULT_SETTINGS);
  assert.deepEqual(loadSettings(undefined), DEFAULT_SETTINGS);
});

test("a stored setting is read, and a missing one is its default", () => {
  assert.deepEqual(parseSettings('{"reciprocal":true}'), { reciprocal: true });
  assert.deepEqual(parseSettings('{"reciprocal":false}'), {
    reciprocal: false,
  });
  assert.deepEqual(parseSettings("{}"), DEFAULT_SETTINGS);
  // A setting this version does not know is ignored, not an error.
  assert.deepEqual(parseSettings('{"reciprocal":true,"later":1}'), {
    reciprocal: true,
  });
});

test("a value that is not a settings object gives the defaults", () => {
  for (const text of ["", "nonsense", "42", "null", "[]", '"reciprocal"']) {
    assert.deepEqual(parseSettings(text), DEFAULT_SETTINGS, text);
  }
});

test("a setting of the wrong type is its default", () => {
  assert.deepEqual(parseSettings('{"reciprocal":"true"}'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"reciprocal":1}'), DEFAULT_SETTINGS);
  assert.deepEqual(parseSettings('{"reciprocal":null}'), DEFAULT_SETTINGS);
});

test("settings round-trip through a store", () => {
  const store = fakeStore();
  saveSettings(store, { reciprocal: true });
  assert.deepEqual(loadSettings(store), { reciprocal: true });
  assert.equal(store.items.get(SETTINGS_KEY), '{"reciprocal":true}');
  saveSettings(store, { reciprocal: false });
  assert.deepEqual(loadSettings(store), { reciprocal: false });
});

test("a store that throws is a store that forgets", () => {
  const broken: SettingsStore = {
    getItem: () => {
      throw new DOMException("denied", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("full", "QuotaExceededError");
    },
  };
  assert.deepEqual(loadSettings(broken), DEFAULT_SETTINGS);
  assert.doesNotThrow(() => saveSettings(broken, { reciprocal: true }));
});
