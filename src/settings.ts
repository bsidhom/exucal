// The app's settings: the few switches the user can flip, kept across
// visits. `<app-shell>` owns the current values, hands them down to the
// components as properties, and saves them through this module whenever one
// changes; the components never read storage themselves.
//
// The settings are stored as one JSON object under one key, in whatever
// `SettingsStore` the shell provides (`localStorage` in the browser). The
// module has no DOM dependency: the store is an argument, so that the
// reading is tested under Node.js with a fake store, and so that the app
// never depends on storage being there. Every way that storage can fail is
// absorbed here: a store that is missing (a browser that denies it, a test),
// one that throws (private browsing on some browsers, a full quota), a
// value that is not JSON, not an object, or an object from an older or a
// newer version of the app. Whatever is wrong, the result is the defaults
// with whichever settings could be read, so that a bad stored value can
// never keep the app from starting.

/** The settings, all of them: a fixed set of switches with defaults. */
export type Settings = {
  /**
   * Whether a conversion into one unit is also shown from the other side,
   * as GNU units shows it: `3 ft = 36 in` and `3 ft ≈ (1 / 0.027777778) in`.
   */
  readonly reciprocal: boolean;
};

export const DEFAULT_SETTINGS: Settings = { reciprocal: false };

/** The key the settings are stored under; the value is a JSON object. */
export const SETTINGS_KEY = "settings";

/** What the settings are read from and written to: the part of `Storage` used. */
export type SettingsStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * The settings in `store`, or the defaults for whatever is not there or
 * cannot be read; never throws. `store` is `undefined` when there is none.
 */
export function loadSettings(store: SettingsStore | undefined): Settings {
  let text: string | null;
  try {
    text = store?.getItem(SETTINGS_KEY) ?? null;
  } catch {
    return DEFAULT_SETTINGS;
  }
  return parseSettings(text);
}

/**
 * Writes `settings` to `store`, replacing what was there; never throws. A
 * store that cannot be written (none, a denied or a full one) is a store
 * that forgets, and the settings hold for the visit anyway.
 */
export function saveSettings(
  store: SettingsStore | undefined,
  settings: Settings,
): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Nothing to do: the settings hold in memory for the visit.
  }
}

/**
 * The settings `text` holds, as a stored value: each setting is taken from
 * `text` when it is there with the right type, and is its default
 * otherwise. `null` (nothing stored) and text that is not a JSON object
 * both give the defaults.
 */
export function parseSettings(text: string | null): Settings {
  if (text === null) return DEFAULT_SETTINGS;
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const reciprocal: unknown = Reflect.get(stored, "reciprocal");
  return {
    reciprocal:
      typeof reciprocal === "boolean"
        ? reciprocal
        : DEFAULT_SETTINGS.reciprocal,
  };
}
