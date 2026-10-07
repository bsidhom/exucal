// The words the settings sheet says: the unit each number carries, the
// group headings, the line under each control as a function of the
// settings in force and the mode, which opens with the number's range
// and names the setting that bounds it where the chain does
// (docs/settings-controls.md), the line that refuses an edit past a
// bound, the line that tells where a clamp landed a setting, the reset
// beside a setting off its default ("default 8"), and the probe's
// proposal with the timings behind it (docs/settings-limits.md, "The
// lines, as the panel will say them"). Text alone, with no element in
// it, so that the panel composes it and a test under Node reads it. The
// numbers are the settings in force, written with thousands separators;
// the ceiling is written as a number and never as a formula (D29).

import { ceilingFor, type Mode } from "./core/context.ts";
import type { RoundingMode } from "./core/rounding.ts";
import type { Recommendation } from "./limits.ts";
import {
  DEFAULT_SETTINGS,
  rangesOf,
  type Clamp,
  type Notation,
  type NumberSetting,
  type RangedSetting,
  type Refusal,
  type Resettable,
  type Settings,
} from "./settings.ts";

/** A number setting's unit, as the input shows it after the number. */
export type Unit = "digits" | "bits" | "ms";

/** The unit of each ranged setting. */
export const UNITS: Readonly<Record<RangedSetting, Unit>> = {
  displayDigits: "digits",
  precisionLimitDigits: "digits",
  significandLimitBits: "bits",
  budgetMs: "ms",
  working: "digits",
  width: "digits",
};

/** How each number setting is named in the panel's lines: by its label, lowercased, with the article. */
export const SETTING_NAMES: Readonly<Record<NumberSetting, string>> = {
  displayDigits: "the display digits",
  precisionLimitDigits: "the precision limit",
  significandLimitBits: "the significand limit",
  budgetMs: "the probe budget",
};

/** The headings of the sheet's three groups, in their order: by what a setting is for (docs/settings-controls.md). */
export const GROUP_HEADINGS = {
  shown: "How it is shown",
  computed: "How it is computed",
  cost: "How much it may cost",
} as const;

/** How each rounding mode is named in the sheet, in the modes' order. */
export const ROUNDING_LABELS: Readonly<Record<RoundingMode, string>> = {
  halfEven: "to nearest, ties to even",
  halfAwayFromZero: "to nearest, ties away from zero",
  halfTowardZero: "to nearest, ties toward zero",
  towardZero: "toward zero",
  awayFromZero: "away from zero",
  ceiling: "up (toward +∞)",
  floor: "down (toward −∞)",
};

/** `n` with thousands separators, as the lines write every number. */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * A number's range under the settings in force, opening its line: the
 * two bounds with the unit, and the setting that sets a bound where the
 * chain does ("From 1 to 1,000 digits, up to the precision limit.";
 * "From 8 to 1,000 digits, from the display digits up to the precision
 * limit."; "From 358 to 1,048,576 bits.").
 */
export function rangeLine(setting: RangedSetting, settings: Settings): string {
  const { min, max, minBy, maxBy } = rangesOf(settings)[setting];
  const span = `From ${formatNumber(min)} to ${measure(max, UNITS[setting])}`;
  if (minBy !== undefined && maxBy !== undefined) {
    return `${span}, from ${SETTING_NAMES[minBy]} up to ${SETTING_NAMES[maxBy]}.`;
  }
  if (maxBy !== undefined) return `${span}, up to ${SETTING_NAMES[maxBy]}.`;
  return `${span}.`;
}

/**
 * The reset beside a setting that is not at its default: "default 8",
 * "default exact", "default to nearest, ties to even", "default
 * digits", "default not extended"; a press restores it.
 */
export function defaultLine(key: Resettable): string {
  switch (key) {
    case "mode":
      return `default ${DEFAULT_SETTINGS.mode.kind}`;
    case "rounding":
      return `default ${ROUNDING_LABELS[DEFAULT_SETTINGS.rounding]}`;
    case "notation":
      return "default digits";
    case "working":
      return "default not extended";
    default:
      return `default ${formatNumber(DEFAULT_SETTINGS[key])}`;
  }
}

/** The button at the sheet's foot that restores every default. */
export const RESET_ALL = "Reset all settings";

/** The link at the sheet's foot to the guide: README's "Settings" until the user's guide (S6) lands. */
export const ABOUT = {
  text: "About these settings",
  href: "https://github.com/bsidhom/pwa-units#settings",
} as const;

/** `n` with its unit after it, the digits singular at one: "1 digit", "2,453 digits", "65,536 bits", "50 ms". */
export function measure(n: number, unit: Unit): string {
  return `${formatNumber(n)} ${unit === "digits" && n === 1 ? "digit" : unit}`;
}

/** The line under the display digits: the range, then what they are by mode and, in decimal mode, by whether the working digits are extended. */
export function displayDigitsLine(settings: Settings): string {
  const { mode } = settings;
  const range = rangeLine("displayDigits", settings);
  if (mode.kind === "exact") return `${range} Significant digits shown.`;
  return mode.working.kind === "extended"
    ? `${range} Significant digits of the answer; every step before the last is computed with the working digits.`
    : `${range} Significant digits shown, and of every value: every step is rounded to them, and a typed number with more is rounded to them on the way in.`;
}

/** The line under the working digits: extended, the count's range and what it is; otherwise what extending does. */
export function workingDigitsLine(settings: Settings): string {
  const { mode } = settings;
  return mode.kind === "decimal" && mode.working.kind === "extended"
    ? `${rangeLine("working", settings)} The digits every step but the last is computed with; the answer is shown at the display digits.`
    : "Every step is computed with the display digits. Extended working digits keep a step's rounding out of the answer, as a calculator's hidden digits do: at twelve, ln(exp(1/10)) is 0.1.";
}

/**
 * The line under the precision limit: its range under the significand
 * limit, and what it bounds in a sentence; the grid and the ceiling are
 * the guide's.
 */
export function precisionLimitLine(settings: Settings): string {
  const range = rangeLine("precisionLimitDigits", settings);
  return settings.mode.kind === "exact"
    ? `${range} The most digits an answer may be asked for; it bounds the effort an expression may cost.`
    : `${range} The most digits an answer, or the working digits, may be asked for; it bounds the effort a step's rounding may cost.`;
}

/**
 * The line under the significand limit: its range, what it bounds with
 * the limit in force translated to the digits of one part, and what
 * passes it.
 */
export function significandLimitLine(settings: Settings): string {
  const bits = settings.significandLimitBits;
  return `${rangeLine("significandLimitBits", settings)} The most bits in a number's numerator or denominator, ${measure(bits, "bits")} being about ${measure(digitsOfBits(bits), "digits")}; an exact result past it is refused.`;
}

/** The line under the notation: the width's range while `ratio` is chosen, then the rule. */
export function notationLine(notation: Notation, settings: Settings): string {
  const width =
    notation.kind === "ratio"
      ? `${rangeLine("width", settings).replace(/^From/, "The width from")} `
      : "";
  return `${width}${NOTATION_LINE}`;
}

/** The decimal digits an integer of `bits` bits has, to three significant figures: the translation is per part (docs/settings-limits.md). */
export function digitsOfBits(bits: number): number {
  const digits = Math.floor(bits * Math.log10(2));
  if (digits < 1000) return digits;
  const scale = 10 ** (Math.floor(Math.log10(digits)) - 2);
  return Math.round(digits / scale) * scale;
}

/** The line under the probe budget: its range and what it is. */
export function budgetLine(settings: Settings): string {
  return `${rangeLine("budgetMs", settings)} The time the probe allows one pass.`;
}

/** The line under the probe's button: what it measures and what it promises. */
export const PROBE_LINE =
  "Times the costliest operations at rising sizes and proposes the largest limits that stay within the budget a pass; nothing changes until the proposal is applied.";

/**
 * The line that refuses an edit of `setting`: not a whole number, or past
 * a bound, named with the setting that sets it where one does ("at most
 * 2,453 digits under the significand limit"; "at least 8 digits, the
 * display digits"; "at least 10 ms").
 */
export function refusalLine(setting: RangedSetting, refusal: Refusal): string {
  const unit = UNITS[setting];
  switch (refusal.kind) {
    case "notInteger":
      return "A whole number.";
    case "above": {
      const bound = `at most ${measure(refusal.bound, unit)}`;
      return refusal.by === undefined
        ? `${capital(bound)}.`
        : `${capital(bound)} under ${SETTING_NAMES[refusal.by]}.`;
    }
    case "below": {
      const bound = `at least ${measure(refusal.bound, unit)}`;
      return refusal.by === undefined
        ? `${capital(bound)}.`
        : `${capital(bound)}, ${SETTING_NAMES[refusal.by]}.`;
    }
  }
}

/**
 * The line under a setting a clamp moved: lowered to fit the setting
 * whose limit it passed, or raised to the setting that is its floor
 * ("lowered from 1,000 to 990 digits to fit the significand limit";
 * "raised from 8 to 16 digits to the display digits").
 */
export function clampLine(clamp: Clamp): string {
  const { from, to, by } = clamp;
  const unit = UNITS[clamp.setting];
  const move = `from ${formatNumber(from)} to ${measure(to, unit)}`;
  return to < from
    ? `Lowered ${move} to fit ${SETTING_NAMES[by]}.`
    : `Raised ${move} to ${SETTING_NAMES[by]}.`;
}

/**
 * The probe's proposal: the sizes it timed and what they took, against
 * the budget, and the two limits it proposes. A size at a setting's floor
 * may have cost more than the budget; the line says so rather than
 * claiming the floor fit.
 */
export function proposalLine(
  proposal: Recommendation,
  budgetMs: number,
): string {
  const bits = measure(proposal.significandLimitBits, "bits");
  const digits = measure(proposal.precisionLimitDigits, "digits");
  const grid = measure(ceilingFor(proposal.precisionLimitDigits), "digits");
  const timings = `Exact products at ${bits} took ${formatMs(proposal.productMs)} and the built-ins on a grid of ${grid} took ${formatMs(proposal.builtinsMs)}`;
  const within =
    proposal.productMs <= budgetMs && proposal.builtinsMs <= budgetMs
      ? `within the ${formatNumber(budgetMs)} ms budget`
      : `over the ${formatNumber(budgetMs)} ms budget at the least this device may be set to`;
  return `${timings}, ${within}: significand limit ${bits}, precision limit ${digits}.`;
}

/** A timing in milliseconds: whole above ten, one decimal below, "under 0.1 ms" at the bottom. */
export function formatMs(ms: number): string {
  if (ms < 0.1) return "under 0.1 ms";
  return `${ms < 10 ? ms.toFixed(1) : formatNumber(Math.round(ms))} ms`;
}

/** The line each mode has under the Mode select. */
export const MODE_LINES: Readonly<Record<Mode, string>> = {
  exact:
    "Every digit shown is certain, found at rising precision; an exact value is written as its digits or as a ratio.",
  decimal:
    "Every step is rounded to the display digits in the rounding mode, as a hand calculator does; every answer is exact in that arithmetic.",
};

/** What the rounding mode rounds, in each mode. */
export const ROUNDING_LINES: Readonly<Record<Mode, string>> = {
  exact: "How the last digit shown is rounded.",
  decimal: "How every step is rounded, the last digit shown with it.",
};

/** The notation's rule, under its radios. */
export const NOTATION_LINE =
  "An exact value is written as a ratio of two whole numbers when the two have at most the width in digits between them, a whole number entire when it fits the width, and anything longer as a decimal; an inexact value is always a decimal.";

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
