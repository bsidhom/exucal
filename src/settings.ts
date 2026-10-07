// The user's settings: the display digits a result is shown with, the
// rounding mode it is rounded in, the mode with what belongs to it (exact
// mode with the notation its exact values are written in, digits or a
// ratio in lowest terms with the width a ratio may have, docs/fractions.md
// and docs/ratio-width.md; decimal mode with its working digits,
// docs/working-digits.md), the two limits of D16 and D29, the precision
// limit in decimal digits and the significand limit in bits
// (docs/settings-limits.md), and the probe's budget in milliseconds, kept
// in `localStorage` so that they survive a reload, and turned into the
// `NumberContext` the pipeline takes, whose ceiling is derived from the
// precision limit. This is app code, not core: the core takes a context
// and knows nothing of where it comes from. docs/calculator-plan.md
// (tasks 1.10 and 2.6, D12 and D16) places it, docs/settings-modes.md
// shapes the mode, docs/settings-limits.md names the limits, and
// README.md ("Settings") describes the settings from the user's side.
//
// The names here are the user's, with the unit in the key (D29):
// `displayDigits`, `precisionLimitDigits`, `significandLimitBits`,
// `budgetMs`. The core still says `maxBits` for the significand limit,
// `maxDigitsFor` for the precision limit under it and `LIMIT_BITS` and
// `MIN_MAX_BITS` for its hard bound and floor; `contextOf` is where the
// two vocabularies meet, until the alignment change the note lists
// renames the core's (ARCHITECTURE.md states the mapping).
//
// The mode is a nested choice (docs/settings-modes.md): a setting that is
// possible in one mode alone lives inside that mode's variant, so that
// the shape of the settings states what is and is not possible. The
// notation is exact mode's, since in decimal mode every value is a
// decimal of the display digits which its digits write entire; the
// working digits are decimal mode's, since exact mode's working precision
// is the retry schedule's. Each choice is named by its values, never a
// boolean.
//
// Storage is an argument rather than the global, so that this module has no
// DOM dependency and its parsing and validation are tested under Node with
// a fake storage object. What is stored is a JSON object of the six
// fields; anything that does not parse, or a field that is missing or of
// the wrong shape, falls back to that field's default, and the fields are
// then made consistent in the order of their dependence, the chain of
// docs/settings-limits.md: the significand limit first (an integer in
// `[MIN_MAX_BITS, LIMIT_BITS]`), then the precision limit, clamped to what
// the significand limit holds (`maxDigitsFor`), then the display digits,
// clamped to the precision limit, then the working digits of decimal
// mode, clamped between the display digits and the precision limit. The
// budget is a setting of the probe alone and depends on nothing. The same
// clamping applies when a setting is changed in the panel, so lowering a
// limit lowers what depends on it and a stored or edited entry can never
// leave the app with an inconsistent context; `clampsOf` says what a
// clamp moved and `refusalOf` why an edit is out of range, for the panel
// to tell the user (D29's clamp-and-tell). A storage that throws (private
// browsing, a full quota) is treated as empty on read and ignored on
// write.
//
// The stored object carries a format version (docs/settings-storage.md):
// version 1 was the six fields bare, version 2 put them in an envelope
// with the version and the build that saved them, version 3 is the
// mode's nested shape in place of the mode name and the fractions flag,
// with the rounding default's change to ties-to-even carried in the same
// step, version 4 nests the notation, the ratio carrying its width, and
// version 5 renames the three numbers' keys to carry their units and adds
// the budget. A migration takes the whole stored object at one version to
// the whole object at the next, totally, so that a change in how the
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
import type { RatioDisplay } from "./core/display.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";

/**
 * How an exact value is written in exact mode: as its digits, or as a
 * ratio of two whole numbers in lowest terms whose parts have at most
 * `width` digits between them, a whole number written entire within the
 * same width (the plan's 5.2; docs/fractions.md, docs/ratio-width.md). A
 * display setting: it is not part of the context, and the core never
 * sees it but through `show`'s width.
 */
export type Notation =
  { readonly kind: "digits" } | ({ readonly kind: "ratio" } & RatioDisplay);

export type NotationKind = Notation["kind"];

export const NOTATION_KINDS: readonly NotationKind[] = ["digits", "ratio"];

/** The ratio notation's width by default: twenty digits (docs/ratio-width.md). */
export const DEFAULT_WIDTH = 20;

/** The most a ratio's width may be: a thousand digits, past which a line is past reading. */
export const WIDTH_LIMIT = 1000;

/** Each notation at its defaults: what a choice of the notation alone builds. */
export const DEFAULT_NOTATIONS: Readonly<Record<NotationKind, Notation>> = {
  digits: { kind: "digits" },
  ratio: { kind: "ratio", width: DEFAULT_WIDTH },
};

/**
 * How many digits every observable step but the last is rounded to in
 * decimal mode (D27, docs/working-digits.md): the display digits, or an
 * extended count above them, which keeps a step's rounding out of the
 * answer as a calculator's hidden digits do. The count's range is the
 * display digits to the precision limit.
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

/**
 * The settings: the display digits, the rounding mode, the mode with what
 * belongs to it, the two limits and the probe's budget, each number's key
 * carrying its unit (docs/settings-limits.md, "The terms").
 */
export type Settings = {
  /** The significant digits an answer is shown with. */
  readonly displayDigits: number;
  readonly rounding: RoundingMode;
  readonly mode: ModeSetting;
  /** The precision limit: the most digits any grid may be asked for, the cap on the display and working digits. */
  readonly precisionLimitDigits: number;
  /** The significand limit: the most bits in a significand's numerator, and separately its denominator. */
  readonly significandLimitBits: number;
  /** The probe's budget: the time it allows one pass when it measures the device, in milliseconds. */
  readonly budgetMs: number;
};

/** Each mode's variant at its defaults: what a choice of the mode alone builds. */
export const DEFAULT_MODES: Readonly<Record<Mode, ModeSetting>> = {
  exact: { kind: "exact", notation: DEFAULT_NOTATIONS.digits },
  decimal: { kind: "decimal", working: { kind: "digits" } },
};

/**
 * The probe's budget by default, 50 ms a pass: the retry schedule
 * doubles, so an expression that runs to the ceiling costs about twice
 * its last pass, and 50 ms a pass keeps that under the tenth of a second
 * an interactive keystroke has (limits.ts, D16).
 */
export const DEFAULT_BUDGET_MS = 50;

export const DEFAULT_SETTINGS: Settings = {
  displayDigits: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
  mode: DEFAULT_MODES.exact,
  precisionLimitDigits: DEFAULT_MAX_DIGITS,
  significandLimitBits: DEFAULT_MAX_BITS,
  budgetMs: DEFAULT_BUDGET_MS,
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
export const STORAGE_VERSION = 5;

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
  // Version 4 nests the notation (docs/ratio-width.md): the string
  // `digits` becomes `{ kind: "digits" }` and `ratio` becomes
  // `{ kind: "ratio", width: 20 }`, the default width, no earlier build
  // having stored one; a decimal mode, and a notation that is neither
  // string, pass through for the validation to default.
  3: (stored) => {
    if (!isRecord(stored)) return stored;
    const { settings, ...envelope } = stored;
    if (!isRecord(settings)) return { ...envelope, version: 4, settings };
    const { mode } = settings;
    if (!isRecord(mode) || mode.kind !== "exact") {
      return { ...envelope, version: 4, settings };
    }
    const { notation } = mode;
    return {
      ...envelope,
      version: 4,
      settings: {
        ...settings,
        mode: {
          ...mode,
          notation:
            notation === "digits" || notation === "ratio"
              ? DEFAULT_NOTATIONS[notation]
              : notation,
        },
      },
    };
  },
  // Version 5 names the three numbers with their units
  // (docs/settings-limits.md, D29): `digits` becomes `displayDigits`,
  // `maxDigits` `precisionLimitDigits` and `maxBits`
  // `significandLimitBits`, each carried over as it is, malformed or not;
  // and the probe's budget joins as `budgetMs`, which no earlier build
  // stored, so it is left for the validation to default. A field under
  // an old key that is missing stays missing under the new.
  4: (stored) => {
    if (!isRecord(stored)) return stored;
    const { settings, ...envelope } = stored;
    if (!isRecord(settings)) return { ...envelope, version: 5, settings };
    const { digits, maxDigits, maxBits, ...rest } = settings;
    return {
      ...envelope,
      version: 5,
      settings: {
        ...rest,
        ...("digits" in settings ? { displayDigits: digits } : {}),
        ...("maxDigits" in settings ? { precisionLimitDigits: maxDigits } : {}),
        ...("maxBits" in settings ? { significandLimitBits: maxBits } : {}),
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
  const {
    displayDigits,
    rounding,
    mode,
    precisionLimitDigits,
    significandLimitBits,
    budgetMs,
  } = fields;
  // Each field's own range first; the dependent upper bounds are the clamp's.
  return clampSettings({
    displayDigits: isPositiveInteger(displayDigits)
      ? displayDigits
      : DEFAULT_SETTINGS.displayDigits,
    rounding: isRoundingMode(rounding) ? rounding : DEFAULT_SETTINGS.rounding,
    mode: modeSettingFrom(mode) ?? DEFAULT_SETTINGS.mode,
    precisionLimitDigits: isPositiveInteger(precisionLimitDigits)
      ? precisionLimitDigits
      : DEFAULT_SETTINGS.precisionLimitDigits,
    significandLimitBits: isSignificandLimit(significandLimitBits)
      ? significandLimitBits
      : DEFAULT_SETTINGS.significandLimitBits,
    budgetMs: isIntegerIn(budgetMs, BUDGET_MS_RANGE)
      ? budgetMs
      : DEFAULT_SETTINGS.budgetMs,
  });
}

/**
 * The mode setting `value` holds, built afresh from its fields, or
 * `undefined` where it is not one: an object whose `kind` is one of the
 * two modes with, for `exact`, a `notation` of one of its two shapes
 * (`ratio` with a width in its range) and, for `decimal`, a `working`
 * whose kind is `digits` or `extended` with a positive integer count.
 * The count's range is the clamp's; the width's is its own.
 */
function modeSettingFrom(value: unknown): ModeSetting | undefined {
  if (!isRecord(value)) return undefined;
  switch (value.kind) {
    case "exact": {
      const notation = notationFrom(value.notation);
      return notation === undefined ? undefined : { kind: "exact", notation };
    }
    case "decimal": {
      const working = workingFrom(value.working);
      return working === undefined ? undefined : { kind: "decimal", working };
    }
    default:
      return undefined;
  }
}

function notationFrom(value: unknown): Notation | undefined {
  if (!isRecord(value)) return undefined;
  switch (value.kind) {
    case "digits":
      return { kind: "digits" };
    case "ratio": {
      const { width } = value;
      return isIntegerIn(width, WIDTH_RANGE)
        ? { kind: "ratio", width }
        : undefined;
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

/** The four settings that are numbers: the display digits, the two limits, and the budget. */
export type NumberSetting =
  | "displayDigits"
  | "precisionLimitDigits"
  | "significandLimitBits"
  | "budgetMs";

/** A setting with a range: the four numbers, the working digits inside decimal mode, and the ratio's width inside exact mode. */
export type RangedSetting = NumberSetting | "working" | "width";

/** A closed range of integers, `[min, max]`. */
export type Range = { readonly min: number; readonly max: number };

/**
 * A ranged setting's range under the settings in force, with the setting
 * that sets each bound where one does (the chain of
 * docs/settings-limits.md): a bound without a setter is the setting's
 * own, fixed. The panel names the setter in a refusal ("at most 2,453
 * digits under the significand limit") and in a clamp's line.
 */
export type Bounds = Range & {
  readonly minBy?: NumberSetting;
  readonly maxBy?: NumberSetting;
};

/** The significand limit's bounds: its floor and the hard bound. */
const SIGNIFICAND_LIMIT_RANGE: Range = { min: MIN_MAX_BITS, max: LIMIT_BITS };

/** The ratio's width: one digit up to `WIDTH_LIMIT`, depending on nothing. */
const WIDTH_RANGE: Range = { min: 1, max: WIDTH_LIMIT };

/**
 * The probe's budget: from ten milliseconds, below which no candidate
 * fits, to ten seconds a pass, past any use (docs/settings-limits.md).
 */
export const BUDGET_MS_RANGE: Range = { min: 10, max: 10_000 };

/**
 * The bounds of each ranged setting under `settings`, the one statement of
 * them, which the panel's inputs, their validation, `clampSettings` and
 * `refusalOf` all read: the significand limit between its floor and the
 * hard bound, the precision limit up to what the significand limit holds
 * (`maxDigitsFor`), the display digits up to the precision limit, the
 * working digits of decimal mode from the display digits up to the
 * precision limit, the ratio's width and the budget each between their
 * own bounds. The three in the middle depend on the settings above them,
 * so they are read off the settings in force, and each says which.
 */
export function rangesOf(settings: Settings): Record<RangedSetting, Bounds> {
  return {
    significandLimitBits: SIGNIFICAND_LIMIT_RANGE,
    precisionLimitDigits: {
      min: 1,
      max: maxDigitsFor(settings.significandLimitBits),
      maxBy: "significandLimitBits",
    },
    displayDigits: {
      min: 1,
      max: settings.precisionLimitDigits,
      maxBy: "precisionLimitDigits",
    },
    working: {
      min: settings.displayDigits,
      max: settings.precisionLimitDigits,
      minBy: "displayDigits",
      maxBy: "precisionLimitDigits",
    },
    width: WIDTH_RANGE,
    budgetMs: BUDGET_MS_RANGE,
  };
}

/** A setting the clamp may move: the three below the significand limit in the chain, in the order they are clamped. */
export type ClampedSetting =
  "precisionLimitDigits" | "displayDigits" | "working";

const CLAMP_ORDER: readonly ClampedSetting[] = [
  "precisionLimitDigits",
  "displayDigits",
  "working",
];

/**
 * A setting a clamp moved: from its value to the bound it was brought to,
 * and the setting that sets that bound, for the panel's line ("lowered
 * from 1,000 to 990 digits to fit the significand limit"; "raised from 8
 * to 16 digits to the display digits"). `to` below `from` is a lowering
 * to a cap; above it, the one upward move, the working digits raised to
 * their floor.
 */
export type Clamp = {
  readonly setting: ClampedSetting;
  readonly from: number;
  readonly to: number;
  readonly by: NumberSetting;
};

/**
 * `settings` made consistent, in the order of dependence: the precision
 * limit is brought within its range under the significand limit, the
 * display digits within theirs under the clamped precision limit, and an
 * extended count of working digits within its range under both. The
 * significand limit and the budget are taken as they are; a caller
 * checks them with `isSignificandLimit` and `isIntegerIn` first.
 */
export function clampSettings(settings: Settings): Settings {
  return CLAMP_ORDER.reduce(
    (clamped, setting) => clampOne(clamped, setting).settings,
    settings,
  );
}

/**
 * What `clampSettings` moves in `settings` and where to, in the order it
 * moves them: empty when they are consistent already. Beside the clamp,
 * for the panel to tell the user (docs/settings-limits.md, "Coupled
 * edits").
 */
export function clampsOf(settings: Settings): readonly Clamp[] {
  const clamps: Clamp[] = [];
  let clamped = settings;
  for (const setting of CLAMP_ORDER) {
    const step = clampOne(clamped, setting);
    clamped = step.settings;
    if (step.clamp !== undefined) clamps.push(step.clamp);
  }
  return clamps;
}

/** `settings` with `setting` alone brought within its range under them, and the move when there was one. */
function clampOne(
  settings: Settings,
  setting: ClampedSetting,
): { readonly settings: Settings; readonly clamp?: Clamp } {
  const from = clampedValueOf(settings, setting);
  if (from === undefined) return { settings };
  const bounds = rangesOf(settings)[setting];
  const to = clampTo(from, bounds);
  if (to === from) return { settings };
  // `to` is a bound, and each bound of a clamped setting has a setter.
  const by = to < from ? bounds.maxBy! : bounds.minBy!;
  return {
    settings: withClampedValue(settings, setting, to),
    clamp: { setting, from, to, by },
  };
}

/** The value of `setting` in `settings`; `undefined` for the working digits unless they are extended. */
function clampedValueOf(
  settings: Settings,
  setting: ClampedSetting,
): number | undefined {
  return setting === "working"
    ? extendedWorkingOf(settings)
    : settings[setting];
}

/** `settings` with `setting` at `value`: an extended count of working digits inside the mode, a number in its field. */
function withClampedValue(
  settings: Settings,
  setting: ClampedSetting,
  value: number,
): Settings {
  return setting === "working"
    ? {
        ...settings,
        mode: { kind: "decimal", working: { kind: "extended", digits: value } },
      }
    : { ...settings, [setting]: value };
}

/**
 * Why `value` is not a value of `setting` under `settings`: not a whole
 * number, or past one of the setting's bounds, with the bound and the
 * setting that sets it where one does (`rangesOf`); `undefined` when it
 * is a value of the setting. For the panel's refusal line ("at most
 * 2,453 digits under the significand limit"). A refused edit changes
 * nothing: the bounding setting always wins (docs/settings-limits.md).
 */
export type Refusal =
  | { readonly kind: "notInteger" }
  | {
      readonly kind: "below";
      readonly bound: number;
      readonly by?: NumberSetting;
    }
  | {
      readonly kind: "above";
      readonly bound: number;
      readonly by?: NumberSetting;
    };

export function refusalOf(
  value: unknown,
  setting: RangedSetting,
  settings: Settings,
): Refusal | undefined {
  if (!isInteger(value)) return { kind: "notInteger" };
  const bounds = rangesOf(settings)[setting];
  if (value < bounds.min) {
    return { kind: "below", bound: bounds.min, by: bounds.minBy };
  }
  if (value > bounds.max) {
    return { kind: "above", bound: bounds.max, by: bounds.maxBy };
  }
  return undefined;
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
          displayDigits: settings.displayDigits,
          rounding: settings.rounding,
          mode: settings.mode,
          precisionLimitDigits: settings.precisionLimitDigits,
          significandLimitBits: settings.significandLimitBits,
          budgetMs: settings.budgetMs,
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
 * clamped after it, as after any change: resetting the significand limit
 * can lower the precision limit, and the precision limit the display
 * digits. Resetting the mode resets the whole variant.
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
  if (a.kind === "exact") {
    return b.kind === "exact" && sameNotation(a.notation, b.notation);
  }
  if (b.kind !== "decimal") return false;
  return a.working.kind === "digits"
    ? b.working.kind === "digits"
    : b.working.kind === "extended" && a.working.digits === b.working.digits;
}

/** Whether `a` and `b` are the same notation, field for field. */
export function sameNotation(a: Notation, b: Notation): boolean {
  return a.kind === "digits"
    ? b.kind === "digits"
    : b.kind === "ratio" && a.width === b.width;
}

/** The extended count of working digits under `settings`, or `undefined` when they are locked to the display digits or the mode is exact. */
export function extendedWorkingOf(settings: Settings): number | undefined {
  const { mode } = settings;
  return mode.kind === "decimal" && mode.working.kind === "extended"
    ? mode.working.digits
    : undefined;
}

/** The ratio notation's settings under `settings`, as `show` takes them, or `undefined` for the digits notation or decimal mode. */
export function ratioOf(settings: Settings): RatioDisplay | undefined {
  const { mode } = settings;
  return mode.kind === "exact" && mode.notation.kind === "ratio"
    ? mode.notation
    : undefined;
}

/**
 * The context the pipeline takes for `settings`: the display digits as
 * the precision, in the rounding mode and the exact or decimal mode,
 * within the significand limit (the core's `maxBits`), under the ceiling
 * the precision limit gives (D12), with the working digits of decimal
 * mode when they are extended (D27). The budget is the probe's and never
 * reaches the core.
 */
export function contextOf(settings: Settings): NumberContext {
  const { mode } = settings;
  const context: NumberContext = {
    precision: settings.displayDigits,
    rounding: settings.rounding,
    maxBits: settings.significandLimitBits,
    ceiling: ceilingFor(settings.precisionLimitDigits),
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

/** Whether `value` names one of the two notations. */
export function isNotationKind(value: unknown): value is NotationKind {
  return (
    typeof value === "string" && (NOTATION_KINDS as string[]).includes(value)
  );
}

/** Whether `value` is an integer in `range`. */
export function isIntegerIn(value: unknown, range: Range): value is number {
  return isInteger(value) && value >= range.min && value <= range.max;
}

/** Whether `value` is a significand limit: an integer in `[MIN_MAX_BITS, LIMIT_BITS]`. */
export function isSignificandLimit(value: unknown): value is number {
  return isIntegerIn(value, SIGNIFICAND_LIMIT_RANGE);
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
