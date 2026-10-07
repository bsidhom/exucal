// The words the settings panel says about its numbers: the unit each
// carries, the line under each number setting as a function of the
// settings in force and the mode, the line that refuses an edit past a
// bound, the line that tells where a clamp landed a setting, and the
// probe's proposal with the timings behind it (docs/settings-limits.md,
// "The lines, as the panel will say them"). Text alone, with no element
// in it, so that the panel composes it and a test under Node reads it.
// The numbers are the settings in force, written with thousands
// separators; the ceiling is written as a number and never as a formula
// (D29).

import { ceilingFor, maxDigitsFor, type Mode } from "./core/context.ts";
import type { Recommendation } from "./limits.ts";
import type {
  Clamp,
  NumberSetting,
  RangedSetting,
  Refusal,
  Settings,
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

/** `n` with thousands separators, as the lines write every number. */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** `n` with its unit after it, the digits singular at one: "1 digit", "2,453 digits", "65,536 bits", "50 ms". */
export function measure(n: number, unit: Unit): string {
  return `${formatNumber(n)} ${unit === "digits" && n === 1 ? "digit" : unit}`;
}

/** The line under the display digits, by mode and, in decimal mode, by whether the working digits are extended. */
export function displayDigitsLine(settings: Settings): string {
  const { mode } = settings;
  if (mode.kind === "exact") return "Significant digits shown.";
  return mode.working.kind === "extended"
    ? "Significant digits of the answer; every step before the last is computed with the working digits."
    : "Significant digits shown, and of every value: every step is rounded to them, and a typed number with more is rounded to them on the way in.";
}

/** The line under the working digits, by whether they are extended. */
export function workingDigitsLine(extended: boolean): string {
  return extended
    ? "The digits every step but the last is computed with; the answer is shown at the display digits."
    : "Every step is computed with the display digits. Extended working digits keep a step's rounding out of the answer, as a calculator's hidden digits do: at twelve, ln(exp(1/10)) is 0.1.";
}

/**
 * The line under the precision limit: the most digits an answer (and in
 * decimal mode the working digits) may be asked for, its own top under
 * the significand limit, and the finest grid the app rounds onto, which
 * is what bounds the effort an expression may cost.
 */
export function precisionLimitLine(settings: Settings): string {
  const most = formatNumber(maxDigitsFor(settings.significandLimitBits));
  const ceiling = measure(ceilingFor(settings.precisionLimitDigits), "digits");
  return settings.mode.kind === "exact"
    ? `The most digits an answer may be asked for, up to ${most} under the significand limit. To certify an answer the app rounds onto a decimal grid of up to ${ceiling}, so this also bounds the effort an expression may cost: one whose digits can never be certain runs to that grid on every keystroke.`
    : `The most digits an answer, or the working digits, may be asked for, up to ${most} under the significand limit. A step's rounding is certified on a grid of up to ${ceiling}.`;
}

/**
 * The line under the significand limit: what it bounds, the limit in
 * force translated to the digits of one part, and what passes it.
 */
export function significandLimitLine(settings: Settings): string {
  const bits = settings.significandLimitBits;
  return `The most bits in a number's significand, its numerator and, separately, its denominator: ${measure(bits, "bits")} is a numerator or a denominator of up to about ${measure(digitsOfBits(bits), "digits")}. An exact result past it is refused and named; the finest grid must fit inside it.`;
}

/** The decimal digits an integer of `bits` bits has, to three significant figures: the translation is per part (docs/settings-limits.md). */
export function digitsOfBits(bits: number): number {
  const digits = Math.floor(bits * Math.log10(2));
  if (digits < 1000) return digits;
  const scale = 10 ** (Math.floor(Math.log10(digits)) - 2);
  return Math.round(digits / scale) * scale;
}

/** The line under the probe budget. */
export const BUDGET_LINE =
  "The time the probe allows one pass; it proposes the largest limits that stay within it.";

/** The line under the probe's button: what it measures and what it promises. */
export const PROBE_LINE =
  "Times the costliest exact product and the costliest built-ins at rising sizes, and proposes the largest significand limit and precision limit at which each stays within the budget a pass, so that an expression that runs to the ceiling answers within a keystroke. Nothing changes until the proposal is applied.";

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
 * whose cap it passed, or raised to the setting that is its floor
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

/** The line under the notation. */
export const NOTATION_LINE =
  "An exact value that is not a whole number is written as a ratio of two whole numbers in lowest terms when the two have at most the width in digits between them; a whole number is written entire when it fits the width; anything longer is a decimal at the display digits. An inexact value is always a decimal.";

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
