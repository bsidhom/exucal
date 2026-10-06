// The user's settings: the digits a result is shown with, the rounding
// mode it is rounded in, the mode with what belongs to it (exact mode
// with the notation its exact values are written in, digits or a ratio
// in lowest terms, docs/fractions.md; decimal mode with its working
// digits, docs/working-digits.md), and the two limits of D16, the cap on
// the digits and the range limit in bits, kept in `localStorage` so that
// they survive a reload, and turned into the `NumberContext` the pipeline
// takes, whose ceiling is derived from the cap. This is app code, not
// core: the core takes a context and knows nothing of where it comes
// from. docs/calculator-plan.md (tasks 1.10 and 2.6, D12 and D16) places
// it, docs/settings-modes.md shapes the mode, and README.md ("Settings")
// describes the settings from the user's side.
//
// The mode is a nested choice (docs/settings-modes.md): a setting that is
// possible in one mode alone lives inside that mode's variant, so that
// the shape of the settings states what is and is not possible. The
// notation is exact mode's, since in decimal mode every value is a
// decimal of Digits digits which its digits write entire; the working
// digits are decimal mode's, since exact mode's working precision is the
// retry schedule's. Each choice is named by its values, never a boolean.
//
// Storage is an argument rather than the global, so that this module has no
// DOM dependency and its parsing and validation are tested under Node with
// a fake storage object. What is stored is a JSON object of the five
// fields; anything that does not parse, or a field that is missing or of
// the wrong shape, falls back to that field's default, and the fields are
// then made consistent in the order of their dependence: the range limit
// first (an integer in `[MIN_MAX_BITS, LIMIT_BITS]`), then the cap on the
// digits, clamped to what the range limit holds (`maxDigitsFor`), then the
// digits, clamped to the cap, then the working digits of decimal mode,
// clamped between the digits and the cap. The same clamping applies when
// a setting is changed in the panel, so lowering a limit lowers what
// depends on it and a stored or edited entry can never leave the app with
// an inconsistent context. A storage that throws (private browsing, a
// full quota) is treated as empty on read and ignored on write.
//
// The stored object carries a format version (docs/settings-storage.md):
// version 1 was the six fields bare, version 2 put them in an envelope
// with the version and the build that saved them, and version 3 is the
// mode's nested shape in place of the mode name and the fractions flag,
// with the rounding default's change to ties-to-even carried in the same
// step. A migration takes the whole stored object at one version to the
// whole object at the next, totally, so that a change in how the
// settings interact is one function with one test; loading migrates from
// the stored version up to `STORAGE_VERSION` and then validates and
// clamps as above. A version above `STORAGE_VERSION`, which a rolled-back
// build could meet, gives the defaults and is overwritten on the next
// save. The version is the stored format's alone, never derived from a
// release.

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

/**
 * How an exact value that is not a whole number is written in exact mode:
 * as its digits, or as a ratio of two whole numbers in lowest terms (the
 * plan's 5.2; docs/fractions.md). A display setting: it is not part of
 * the context, and the core never sees it.
 */
export type Notation = "digits" | "ratio";

export const NOTATIONS: readonly Notation[] = ["digits", "ratio"];

/**
 * How many digits every step but the last is rounded to in decimal mode
 * (D27, docs/working-digits.md): Digits, or an extended count above them,
 * which keeps a step's rounding out of the answer as a calculator's
 * hidden digits do. The count's range is Digits to the precision limit.
 */
export type Working =
  | { readonly kind: "digits" }
  | { readonly kind: "extended"; readonly digits: number };

/**
 * The mode (the plan's 4.7) and what belongs to it: exact mode carries
 * the notation of its exact values, decimal mode its working digits. The
 * discriminant is the core's `Mode`, which `contextOf` hands the context.
 */
export type ModeSetting =
  | { readonly kind: "exact"; readonly notation: Notation }
  | { readonly kind: "decimal"; readonly working: Working };

/** The settings: the digits shown, the rounding mode, the mode with what belongs to it, and the two limits. */
export type Settings = {
  readonly digits: number;
  readonly rounding: RoundingMode;
  readonly mode: ModeSetting;
  /** The cap on `digits`: the most digits a result may be asked for. */
  readonly maxDigits: number;
  /** The range limit: the most bits a numerator or denominator may have. */
  readonly maxBits: number;
};

/** Each mode's variant at its defaults: what a choice of the mode alone builds. */
export const DEFAULT_MODES: Readonly<Record<Mode, ModeSetting>> = {
  exact: { kind: "exact", notation: "digits" },
  decimal: { kind: "decimal", working: { kind: "digits" } },
};

export const DEFAULT_SETTINGS: Settings = {
  digits: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
  mode: DEFAULT_MODES.exact,
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
 * The version of the stored format: bumped only in a change that alters
 * the stored shape or a field's meaning, never renumbered, and never
 * derived from a release identifier.
 */
export const STORAGE_VERSION = 3;

/**
 * A migration: the whole stored object at one version to the whole stored
 * object at the next. Total: it never throws, and where it cannot carry a
 * value over it leaves the field for the validation to default. It reads
 * `unknown`, since what an older build wrote is not to be trusted, and it
 * validates nothing itself: a migration moves and reshapes fields, and
 * the validation runs once, after the last migration (`settingsFrom`),
 * over whatever the chain produced. So a migration may pass a malformed
 * field through, and the invariant is that nothing between the parse and
 * the validation trusts a value. What is saved has the fixed shape
 * `saveSettings` writes, so a stored object a migration reads is lax only
 * where storage was edited by hand or written by a build with a bug.
 */
type Migration = (stored: unknown) => unknown;

/** The migrations by source version: `MIGRATIONS[n]` takes version `n` to `n + 1`. */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Version 1 was the six fields bare; version 2 wraps them in the envelope.
  1: (stored) => ({ version: 2, settings: stored }),
  // Version 3 nests the mode (docs/settings-modes.md): the stored mode
  // name and the fractions flag become the variant, `decimal` carrying
  // its working digits at their default and `exact` the notation, `ratio`
  // when the flag was `true`; and the rounding default's change rides
  // with it, a stored `halfAwayFromZero`, the old default echoed by
  // every save, becoming `halfEven`. A mode that is neither name passes
  // through for the validation to default.
  2: (stored) => {
    if (!isRecord(stored)) return stored;
    const { settings, ...envelope } = stored;
    if (!isRecord(settings)) return { ...envelope, version: 3, settings };
    const { mode, fractions, rounding, ...rest } = settings;
    return {
      ...envelope,
      version: 3,
      settings: {
        ...rest,
        rounding: rounding === "halfAwayFromZero" ? "halfEven" : rounding,
        mode:
          mode === "decimal"
            ? DEFAULT_MODES.decimal
            : mode === "exact"
              ? {
                  kind: "exact",
                  notation: fractions === true ? "ratio" : "digits",
                }
              : mode,
      },
    };
  },
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
    // Not expected: a build never writes such a version. A rolled-back
    // build can meet a newer one; the defaults apply and the next save
    // overwrites the stored object.
    console.warn(
      `The stored settings have the version ${String(
        version ?? (parsed as Record<string, unknown> | null)?.version,
      )}, which this build (version ${STORAGE_VERSION}) cannot read; the defaults apply.`,
    );
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
  if (!isRecord(stored)) return undefined;
  const { version } = stored;
  if (version === undefined) return 1;
  return typeof version === "number" &&
    Number.isInteger(version) &&
    version >= 1
    ? version
    : undefined;
}

/** The `settings` field of a stored object at the current version, whatever it holds. */
function fieldsOf(stored: unknown): unknown {
  return isRecord(stored) ? stored.settings : undefined;
}

/** The settings `fields` hold, each validated and defaulted on its own, and the dependent ones clamped. */
function settingsFrom(fields: unknown): Settings {
  if (!isRecord(fields)) return DEFAULT_SETTINGS;
  const { digits, rounding, mode, maxDigits, maxBits } = fields;
  // Each field's own range first; the dependent upper bounds are the clamp's.
  return clampSettings({
    digits: isPositiveInteger(digits) ? digits : DEFAULT_SETTINGS.digits,
    rounding: isRoundingMode(rounding) ? rounding : DEFAULT_SETTINGS.rounding,
    mode: modeSettingFrom(mode) ?? DEFAULT_SETTINGS.mode,
    maxDigits: isPositiveInteger(maxDigits)
      ? maxDigits
      : DEFAULT_SETTINGS.maxDigits,
    maxBits: isMaxBits(maxBits) ? maxBits : DEFAULT_SETTINGS.maxBits,
  });
}

/**
 * The mode setting `value` holds, built afresh from its fields, or
 * `undefined` where it is not one: an object whose `kind` is one of the
 * two modes with, for `exact`, a `notation` among its two values and,
 * for `decimal`, a `working` whose kind is `digits` or `extended` with a
 * positive integer count. The count's range is the clamp's.
 */
function modeSettingFrom(value: unknown): ModeSetting | undefined {
  if (!isRecord(value)) return undefined;
  switch (value.kind) {
    case "exact": {
      const { notation } = value;
      return isNotation(notation) ? { kind: "exact", notation } : undefined;
    }
    case "decimal": {
      const working = workingFrom(value.working);
      return working === undefined ? undefined : { kind: "decimal", working };
    }
    default:
      return undefined;
  }
}

function workingFrom(value: unknown): Working | undefined {
  if (!isRecord(value)) return undefined;
  switch (value.kind) {
    case "digits":
      return { kind: "digits" };
    case "extended": {
      const { digits } = value;
      return isPositiveInteger(digits)
        ? { kind: "extended", digits }
        : undefined;
    }
    default:
      return undefined;
  }
}

/** The three settings that are numbers: the digits, the cap on them, and the range limit. */
export type NumberSetting = "digits" | "maxDigits" | "maxBits";

/** A setting with a range: the three numbers, and the working digits inside decimal mode. */
export type RangedSetting = NumberSetting | "working";

/** A closed range of integers, `[min, max]`. */
export type Range = { readonly min: number; readonly max: number };

/** The range limit's bounds: its floor and the hard bound. */
const MAX_BITS_RANGE: Range = { min: MIN_MAX_BITS, max: LIMIT_BITS };

/**
 * The bounds of each ranged setting under `settings`, the one statement of
 * them, which the panel's inputs, their validation and `clampSettings` all
 * read: the range limit between its floor and the hard bound, the cap on
 * the digits up to what the range limit holds (`maxDigitsFor`), the
 * digits up to the cap, and the working digits of decimal mode from the
 * digits up to the cap. Each but the first depends on the settings above
 * it, so they are read off the settings in force.
 */
export function rangesOf(settings: Settings): Record<RangedSetting, Range> {
  return {
    maxBits: MAX_BITS_RANGE,
    maxDigits: { min: 1, max: maxDigitsFor(settings.maxBits) },
    digits: { min: 1, max: settings.maxDigits },
    working: { min: settings.digits, max: settings.maxDigits },
  };
}

/**
 * `settings` made consistent, in the order of dependence: the cap on the
 * digits is brought within its range under the range limit, the digits
 * within theirs under the clamped cap, and an extended count of working
 * digits within its range under both. The range limit is taken as it is;
 * a caller checks it with `isMaxBits` first.
 */
export function clampSettings(settings: Settings): Settings {
  const maxDigits = clampTo(settings.maxDigits, rangesOf(settings).maxDigits);
  const digits = clampTo(
    settings.digits,
    rangesOf({ ...settings, maxDigits }).digits,
  );
  const clamped = { ...settings, maxDigits, digits };
  return { ...clamped, mode: clampedMode(clamped) };
}

/** The mode of `settings` with an extended count of working digits brought within its range; any other mode as it is. */
function clampedMode(settings: Settings): ModeSetting {
  const { mode } = settings;
  if (mode.kind !== "decimal" || mode.working.kind !== "extended") return mode;
  const digits = clampTo(mode.working.digits, rangesOf(settings).working);
  return digits === mode.working.digits
    ? mode
    : { kind: "decimal", working: { kind: "extended", digits } };
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
 * lower the cap, and the cap the digits. Resetting the mode resets the
 * whole variant.
 */
export function resetSetting(settings: Settings, key: SettingKey): Settings {
  return clampSettings({ ...settings, [key]: DEFAULT_SETTINGS[key] });
}

/** Whether `key` is at its default in `settings`: the mode compared by value, the rest primitives. */
export function isDefault(settings: Settings, key: SettingKey): boolean {
  return key === "mode"
    ? sameMode(settings.mode, DEFAULT_SETTINGS.mode)
    : settings[key] === DEFAULT_SETTINGS[key];
}

/** Whether `a` and `b` are the same mode setting, field for field. */
export function sameMode(a: ModeSetting, b: ModeSetting): boolean {
  if (a.kind === "exact")
    return b.kind === "exact" && a.notation === b.notation;
  if (b.kind !== "decimal") return false;
  return a.working.kind === "digits"
    ? b.working.kind === "digits"
    : b.working.kind === "extended" && a.working.digits === b.working.digits;
}

/** Whether `settings` write an exact value that is not a whole number as a ratio: exact mode with that notation. */
export function showsRatios(settings: Settings): boolean {
  return settings.mode.kind === "exact" && settings.mode.notation === "ratio";
}

/**
 * The context the pipeline takes for `settings`: the digits, in the
 * rounding mode and the exact or decimal mode, within the range limit,
 * under the ceiling the cap gives (D12), with the working digits of
 * decimal mode when they are extended (D27).
 */
export function contextOf(settings: Settings): NumberContext {
  const { mode } = settings;
  const context: NumberContext = {
    precision: settings.digits,
    rounding: settings.rounding,
    maxBits: settings.maxBits,
    ceiling: ceilingFor(settings.maxDigits),
    mode: mode.kind,
  };
  return mode.kind === "decimal" && mode.working.kind === "extended"
    ? { ...context, working: mode.working.digits }
    : context;
}

/** Whether `value` is one of the two modes. */
export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as string[]).includes(value);
}

/** Whether `value` is one of the two notations. */
export function isNotation(value: unknown): value is Notation {
  return typeof value === "string" && (NOTATIONS as string[]).includes(value);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
