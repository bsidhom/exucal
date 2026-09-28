// The user's settings: the digits a result is shown with, the rounding
// mode it is rounded in, and the two limits of D16, the cap on the digits
// and the range limit in bits, kept in `localStorage` so that they survive
// a reload, and turned into the `NumberContext` the pipeline takes, whose
// ceiling is derived from the cap. This is app code, not core: the core
// takes a context and knows nothing of where it comes from.
// docs/calculator-plan.md (tasks 1.10 and 2.6, D12 and D16) places it;
// README.md ("Settings") describes the settings from the user's side.
//
// Storage is an argument rather than the global, so that this module has no
// DOM dependency and its parsing and validation are tested under Node with
// a fake storage object. What is stored is a JSON object of the four
// fields; anything that does not parse, or a field that is missing or of
// the wrong shape, falls back to that field's default, and the fields are
// then made consistent in the order of their dependence: the range limit
// first (an integer in `[MIN_MAX_BITS, LIMIT_BITS]`), then the cap on the
// digits, clamped to what the range limit holds (`maxDigitsFor`), then the
// digits, clamped to the cap. The same clamping applies when a setting is
// changed in the panel, so lowering a limit lowers what depends on it and
// a stored or edited entry can never leave the app with an inconsistent
// context. A storage that throws (private browsing, a full quota) is
// treated as empty on read and ignored on write.

import {
  DEFAULT_DIGITS,
  DEFAULT_MAX_BITS,
  DEFAULT_MAX_DIGITS,
  DEFAULT_ROUNDING,
  MIN_MAX_BITS,
  MODES,
  ceilingFor,
  maxDigitsFor,
  type Mode,
  type NumberContext,
} from "./core/context.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";

/** The settings: the digits shown, the rounding mode, the exact or decimal mode, and the two limits. */
export type Settings = {
  readonly digits: number;
  readonly rounding: RoundingMode;
  /** Exact or decimal (the plan's 4.7): whether every step rounds to the digits in the rounding mode. */
  readonly mode: Mode;
  /** The cap on `digits`: the most digits a result may be asked for. */
  readonly maxDigits: number;
  /** The range limit: the most bits a numerator or denominator may have. */
  readonly maxBits: number;
};

export const DEFAULT_SETTINGS: Settings = {
  digits: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
  mode: "exact",
  maxDigits: DEFAULT_MAX_DIGITS,
  maxBits: DEFAULT_MAX_BITS,
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
 * own and the dependent ones clamped (`clampSettings`). A storage that has
 * no entry, holds something that is not JSON, or throws, gives the
 * defaults.
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
  const { digits, rounding, mode, maxDigits, maxBits } = parsed as Record<
    string,
    unknown
  >;
  // Each field's own range first; the dependent upper bounds are the clamp's.
  return clampSettings({
    digits: isPositiveInteger(digits) ? digits : DEFAULT_SETTINGS.digits,
    rounding: isRoundingMode(rounding) ? rounding : DEFAULT_SETTINGS.rounding,
    mode: isMode(mode) ? mode : DEFAULT_SETTINGS.mode,
    maxDigits: isPositiveInteger(maxDigits)
      ? maxDigits
      : DEFAULT_SETTINGS.maxDigits,
    maxBits: isMaxBits(maxBits) ? maxBits : DEFAULT_SETTINGS.maxBits,
  });
}

/**
 * `settings` made consistent, in the order of dependence: the cap on the
 * digits is brought within `[1, maxDigitsFor(maxBits)]`, and the digits
 * within `[1, maxDigits]`. The range limit is taken as it is; a caller
 * checks it with `isMaxBits` first.
 */
export function clampSettings(settings: Settings): Settings {
  const maxDigits = clamp(
    settings.maxDigits,
    1,
    maxDigitsFor(settings.maxBits),
  );
  const digits = clamp(settings.digits, 1, maxDigits);
  return { ...settings, maxDigits, digits };
}

/** Stores `settings` in `storage`; a storage that throws is ignored. */
export function saveSettings(
  storage: SettingsStorage,
  settings: Settings,
): void {
  try {
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        digits: settings.digits,
        rounding: settings.rounding,
        mode: settings.mode,
        maxDigits: settings.maxDigits,
        maxBits: settings.maxBits,
      }),
    );
  } catch {
    // Nothing to do: the settings still apply for this session.
  }
}

/**
 * The context the pipeline takes for `settings`: the digits, in the
 * rounding mode and the exact or decimal mode, within the range limit,
 * under the ceiling the cap gives (D12).
 */
export function contextOf(settings: Settings): NumberContext {
  return {
    precision: settings.digits,
    rounding: settings.rounding,
    maxBits: settings.maxBits,
    ceiling: ceilingFor(settings.maxDigits),
    mode: settings.mode,
  };
}

/** Whether `value` is one of the two modes. */
export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as string[]).includes(value);
}

/** Whether `value` is a digits setting under the cap `maxDigits`: an integer in `[1, maxDigits]`. */
export function isDigits(value: unknown, maxDigits: number): value is number {
  return isInteger(value) && value >= 1 && value <= maxDigits;
}

/**
 * Whether `value` is a cap on the digits under the range limit `maxBits`:
 * an integer in `[1, maxDigitsFor(maxBits)]`.
 */
export function isMaxDigits(value: unknown, maxBits: number): value is number {
  return isInteger(value) && value >= 1 && value <= maxDigitsFor(maxBits);
}

/** Whether `value` is a range limit: an integer in `[MIN_MAX_BITS, LIMIT_BITS]`. */
export function isMaxBits(value: unknown): value is number {
  return isInteger(value) && value >= MIN_MAX_BITS && value <= LIMIT_BITS;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value >= 1;
}

function isRoundingMode(value: unknown): value is RoundingMode {
  return (
    typeof value === "string" && (ROUNDING_MODES as string[]).includes(value)
  );
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
