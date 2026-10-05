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
  const { digits, rounding, mode, maxDigits, maxBits, fractions } =
    parsed as Record<string, unknown>;
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
        fractions: settings.fractions,
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
