// The user's settings: the digits a result is shown with, the rounding
// mode it is rounded in, the exact or decimal mode, the two limits of
// D16, the cap on the digits and the range limit in bits, and whether an
// exact value is shown as a reduced fraction (docs/fractions.md), kept in
// `localStorage` so that they survive a reload, and turned into the
// `NumberContext` the pipeline takes, whose ceiling is derived from the
// cap. This is app code, not core: the core takes a context and knows
// nothing of where it comes from.
// docs/calculator-plan.md (tasks 1.10 and 2.6, D12 and D16) places it;
// README.md ("Settings") describes the settings from the user's side.
//
// Storage is an argument rather than the global, so that this module has no
// DOM dependency and its parsing and validation are tested under Node with
// a fake storage object. What is stored is a JSON object of the six
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
//
// The stored object carries a format version (docs/settings-storage.md):
// version 1 was the six fields bare, and from version 2 they sit in an
// envelope with the version and the build that saved them. A migration
// takes the whole stored object at one version to the whole object at the
// next, totally, so that a change in how the settings interact is one
// function with one test; loading migrates from the stored version up to
// `STORAGE_VERSION` and then validates and clamps as above. A version
// above `STORAGE_VERSION`, which a rolled-back build could meet, gives
// the defaults and is overwritten on the next save. The version is the
// stored format's alone, never derived from a release.

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

/** The settings: the digits shown, the rounding mode, the exact or decimal mode, the two limits, and the fractions display. */
export type Settings = {
  readonly digits: number;
  readonly rounding: RoundingMode;
  /** Exact or decimal (the plan's 4.7): whether every step rounds to the digits in the rounding mode. */
  readonly mode: Mode;
  /** The cap on `digits`: the most digits a result may be asked for. */
  readonly maxDigits: number;
  /** The range limit: the most bits a numerator or denominator may have. */
  readonly maxBits: number;
  /**
   * Whether an exact value that is not an integer is shown as its fraction
   * in lowest terms (the plan's 5.2; docs/fractions.md). A display setting:
   * it is not part of the context, and the core never sees it.
   */
  readonly fractions: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  digits: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
  mode: "exact",
  maxDigits: DEFAULT_MAX_DIGITS,
  maxBits: DEFAULT_MAX_BITS,
  fractions: false,
};

/** The part of `Storage` the settings use, so that a test can fake it. */
export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** The key the settings are stored under. */
export const SETTINGS_KEY = "settings";

/**
 * The version of the stored format: bumped only in a change that alters
 * the stored shape or a field's meaning, never renumbered, and never
 * derived from a release identifier.
 */
export const STORAGE_VERSION = 2;

/**
 * A migration: the whole stored object at one version to the whole stored
 * object at the next. Total: it never throws, and where it cannot carry a
 * value over it leaves the field for the validation to default. It reads
 * `unknown`, since what an older build wrote is not to be trusted.
 */
type Migration = (stored: unknown) => unknown;

/** The migrations by source version: `MIGRATIONS[n]` takes version `n` to `n + 1`. */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Version 1 was the six fields bare; version 2 wraps them in the envelope.
  1: (stored) => ({ version: 2, settings: stored }),
};

/**
 * The settings `storage` holds: the stored object migrated from its
 * version up to `STORAGE_VERSION`, then each field validated and defaulted
 * on its own and the dependent ones clamped (`clampSettings`). A storage
 * that has no entry, holds something that is not JSON or not an object, or
 * throws, gives the defaults; so does a version above `STORAGE_VERSION`,
 * or one that is not a positive integer. An object with no version is
 * version 1.
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
  const version = versionOf(parsed);
  if (version === undefined || version > STORAGE_VERSION) {
    return DEFAULT_SETTINGS;
  }
  let stored = parsed;
  for (let from = version; from < STORAGE_VERSION; from++) {
    stored = MIGRATIONS[from]!(stored);
  }
  return settingsFrom(fieldsOf(stored));
}

/** The version of a stored object: 1 when it has none, `undefined` when it is not an object or its version is not a positive integer. */
function versionOf(stored: unknown): number | undefined {
  if (typeof stored !== "object" || stored === null) return undefined;
  const { version } = stored as Record<string, unknown>;
  if (version === undefined) return 1;
  return typeof version === "number" &&
    Number.isInteger(version) &&
    version >= 1
    ? version
    : undefined;
}

/** The `settings` field of a stored object at the current version, whatever it holds. */
function fieldsOf(stored: unknown): unknown {
  if (typeof stored !== "object" || stored === null) return undefined;
  return (stored as Record<string, unknown>).settings;
}

/** The settings `fields` hold, each validated and defaulted on its own, and the dependent ones clamped. */
function settingsFrom(fields: unknown): Settings {
  if (typeof fields !== "object" || fields === null) return DEFAULT_SETTINGS;
  const { digits, rounding, mode, maxDigits, maxBits, fractions } =
    fields as Record<string, unknown>;
  // Each field's own range first; the dependent upper bounds are the clamp's.
  return clampSettings({
    digits: isPositiveInteger(digits) ? digits : DEFAULT_SETTINGS.digits,
    rounding: isRoundingMode(rounding) ? rounding : DEFAULT_SETTINGS.rounding,
    mode: isMode(mode) ? mode : DEFAULT_SETTINGS.mode,
    maxDigits: isPositiveInteger(maxDigits)
      ? maxDigits
      : DEFAULT_SETTINGS.maxDigits,
    maxBits: isMaxBits(maxBits) ? maxBits : DEFAULT_SETTINGS.maxBits,
    fractions:
      typeof fractions === "boolean" ? fractions : DEFAULT_SETTINGS.fractions,
  });
}

/** The three settings that are numbers: the digits, the cap on them, and the range limit. */
export type NumberSetting = "digits" | "maxDigits" | "maxBits";

/** A closed range of integers, `[min, max]`. */
export type Range = { readonly min: number; readonly max: number };

/** The range limit's bounds: its floor and the hard bound. */
const MAX_BITS_RANGE: Range = { min: MIN_MAX_BITS, max: LIMIT_BITS };

/**
 * The bounds of each number setting under `settings`, the one statement of
 * them, which the panel's inputs, their validation and `clampSettings` all
 * read: the range limit between its floor and the hard bound, the cap on
 * the digits up to what the range limit holds (`maxDigitsFor`), and the
 * digits up to the cap. The last two depend on the setting above them, so
 * they are read off the settings in force.
 */
export function rangesOf(settings: Settings): Record<NumberSetting, Range> {
  return {
    maxBits: MAX_BITS_RANGE,
    maxDigits: { min: 1, max: maxDigitsFor(settings.maxBits) },
    digits: { min: 1, max: settings.maxDigits },
  };
}

/**
 * `settings` made consistent, in the order of dependence: the cap on the
 * digits is brought within its range under the range limit, and the digits
 * within theirs under the clamped cap. The range limit is taken as it is; a
 * caller checks it with `isMaxBits` first.
 */
export function clampSettings(settings: Settings): Settings {
  const maxDigits = clampTo(settings.maxDigits, rangesOf(settings).maxDigits);
  const digits = clampTo(
    settings.digits,
    rangesOf({ ...settings, maxDigits }).digits,
  );
  return { ...settings, maxDigits, digits };
}

/**
 * Stores `settings` in `storage` at `STORAGE_VERSION`, with `savedBy`, the
 * whole build string of the build saving them (build-id.ts; the shell
 * passes it, so that this module needs no build of its own), which says
 * which build wrote a stored object and nothing more. A storage that
 * throws is ignored.
 */
export function saveSettings(
  storage: SettingsStorage,
  settings: Settings,
  savedBy: string,
): void {
  try {
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        savedBy,
        settings: {
          digits: settings.digits,
          rounding: settings.rounding,
          mode: settings.mode,
          maxDigits: settings.maxDigits,
          maxBits: settings.maxBits,
          fractions: settings.fractions,
        },
      }),
    );
  } catch {
    // Nothing to do: the settings still apply for this session.
  }
}

/** A setting's name. */
export type SettingKey = keyof Settings;

/** The settings reset to their defaults, all of them. */
export function resetSettings(): Settings {
  return DEFAULT_SETTINGS;
}

/**
 * `settings` with `key` reset to its default and the dependent settings
 * clamped after it, as after any change: resetting the range limit can
 * lower the cap, and the cap the digits.
 */
export function resetSetting(settings: Settings, key: SettingKey): Settings {
  return clampSettings({ ...settings, [key]: DEFAULT_SETTINGS[key] });
}

/** Whether `key` is at its default in `settings`. */
export function isDefault(settings: Settings, key: SettingKey): boolean {
  return settings[key] === DEFAULT_SETTINGS[key];
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

/** Whether `value` is an integer in `range`. */
export function isIntegerIn(value: unknown, range: Range): value is number {
  return isInteger(value) && value >= range.min && value <= range.max;
}

/** Whether `value` is a range limit: an integer in `[MIN_MAX_BITS, LIMIT_BITS]`. */
export function isMaxBits(value: unknown): value is number {
  return isIntegerIn(value, MAX_BITS_RANGE);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value >= 1;
}

/** Whether `value` is one of the rounding modes. */
export function isRoundingMode(value: unknown): value is RoundingMode {
  return (
    typeof value === "string" && (ROUNDING_MODES as string[]).includes(value)
  );
}

function clampTo(value: number, { min, max }: Range): number {
  return Math.min(Math.max(value, min), max);
}
