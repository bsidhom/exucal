// The user's settings: the digits a result is shown with and the rounding
// mode it is rounded in, kept in `localStorage` so that they survive a
// reload, and turned into the `NumberContext` the pipeline takes. This is
// app code, not core: the core takes a context and knows nothing of where
// it comes from. docs/calculator-plan.md (task 1.10) places it; README.md
// ("Settings") describes the settings from the user's side.
//
// Storage is an argument rather than the global, so that this module has no
// DOM dependency and its parsing and validation are tested under Node with
// a fake storage object. What is stored is a JSON object of the two
// fields; anything that does not parse, or a field that is missing or out
// of range (`digits` must be an integer in `[1, MAX_DIGITS]`, `rounding` a
// name in `ROUNDING_MODES`), falls back to that field's default, so a
// stale or hand-edited entry can never leave the app without a usable
// context, and a storage that throws (private browsing, a full quota) is
// treated as empty on read and ignored on write.

import {
  DEFAULT_DIGITS,
  DEFAULT_ROUNDING,
  MAX_DIGITS,
  type NumberContext,
} from "./core/context.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";

/** The settings: the digits shown, and the rounding mode. */
export type Settings = {
  readonly digits: number;
  readonly rounding: RoundingMode;
};

export const DEFAULT_SETTINGS: Settings = {
  digits: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
};

/** The part of `Storage` the settings use, so that a test can fake it. */
export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** The key the settings are stored under. */
export const SETTINGS_KEY = "settings";

/**
 * The settings `storage` holds, each field validated and defaulted on its
 * own: an integer `digits` in `[1, MAX_DIGITS]` and a `rounding` that is a
 * mode; anything else is the default. A storage that has no entry, holds
 * something that is not JSON, or throws, gives the defaults.
 */
export function loadSettings(storage: SettingsStorage): Settings {
  let parsed: unknown;
  try {
    const text = storage.getItem(SETTINGS_KEY);
    if (text === null) return DEFAULT_SETTINGS;
    parsed = JSON.parse(text);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_SETTINGS;
  const { digits, rounding } = parsed as Record<string, unknown>;
  return {
    digits: isDigits(digits) ? digits : DEFAULT_SETTINGS.digits,
    rounding: isRoundingMode(rounding) ? rounding : DEFAULT_SETTINGS.rounding,
  };
}

/** Stores `settings` in `storage`; a storage that throws is ignored. */
export function saveSettings(
  storage: SettingsStorage,
  settings: Settings,
): void {
  try {
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ digits: settings.digits, rounding: settings.rounding }),
    );
  } catch {
    // Nothing to do: the settings still apply for this session.
  }
}

/** The context the pipeline takes for `settings`: the digits, in the mode. */
export function contextOf(settings: Settings): NumberContext {
  return { precision: settings.digits, rounding: settings.rounding };
}

/** Whether `value` is a digits setting: an integer in `[1, MAX_DIGITS]`. */
export function isDigits(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_DIGITS
  );
}

function isRoundingMode(value: unknown): value is RoundingMode {
  return (
    typeof value === "string" && (ROUNDING_MODES as string[]).includes(value)
  );
}
