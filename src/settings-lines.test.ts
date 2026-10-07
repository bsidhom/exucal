import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  MIN_SIGNIFICAND_LIMIT_BITS,
  precisionLimitFor,
} from "./core/context.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS } from "./core/rational.ts";
import {
  ABOUT,
  GROUP_HEADINGS,
  MODE_LINES,
  NOTATION_LINE,
  PROBE_LINE,
  RESET_ALL,
  ROUNDING_LINES,
  UNITS,
  budgetLine,
  clampLine,
  defaultLine,
  digitsOfBits,
  displayDigitsLine,
  formatMs,
  measure,
  notationLine,
  precisionLimitLine,
  proposalLine,
  rangeLine,
  refusalLine,
  significandLimitLine,
  workingDigitsLine,
} from "./settings-lines.ts";
import { DEFAULT_SETTINGS, refusalOf, type Settings } from "./settings.ts";

const DECIMAL: Settings = {
  ...DEFAULT_SETTINGS,
  mode: { kind: "decimal", working: { kind: "digits" } },
};
const EXTENDED: Settings = {
  ...DEFAULT_SETTINGS,
  mode: { kind: "decimal", working: { kind: "extended", digits: 12 } },
};

test("every ranged setting has its unit, and the lines name the settings by their labels", () => {
  assert.deepEqual(UNITS, {
    displayDigits: "digits",
    precisionLimitDigits: "digits",
    significandLimitBits: "bits",
    budgetMs: "ms",
    working: "digits",
    width: "digits",
  });
  assert.equal(
    displayDigitsLine(DEFAULT_SETTINGS),
    "From 1 to 1,000 digits, up to the precision limit. Significant digits shown.",
  );
  assert.match(displayDigitsLine(DECIMAL), /every step is rounded to them/);
  assert.match(displayDigitsLine(EXTENDED), /computed with the working digits/);
  assert.match(
    workingDigitsLine(DECIMAL),
    /^Every step is computed with the display digits\./,
  );
  assert.equal(
    workingDigitsLine(EXTENDED),
    "From 8 to 1,000 digits, from the display digits up to the precision limit. The digits every step but the last is computed with; the answer is shown at the display digits.",
  );
  // No line says "Digits" as a name any more: the setting is the display digits.
  for (const line of [
    displayDigitsLine(DECIMAL),
    workingDigitsLine(DECIMAL),
    workingDigitsLine(EXTENDED),
    MODE_LINES.exact,
    MODE_LINES.decimal,
    ROUNDING_LINES.exact,
    ROUNDING_LINES.decimal,
    NOTATION_LINE,
    budgetLine(DEFAULT_SETTINGS),
    PROBE_LINE,
  ]) {
    assert.doesNotMatch(line, /\bDigits\b/, line);
  }
});

test("a number's line opens with its range and names what sets a bound the chain sets", () => {
  assert.equal(
    rangeLine("displayDigits", DEFAULT_SETTINGS),
    "From 1 to 1,000 digits, up to the precision limit.",
  );
  assert.equal(
    rangeLine("working", EXTENDED),
    "From 8 to 1,000 digits, from the display digits up to the precision limit.",
  );
  assert.equal(
    rangeLine("precisionLimitDigits", DEFAULT_SETTINGS),
    "From 1 to 2,453 digits, up to the significand limit.",
  );
  assert.equal(
    rangeLine("significandLimitBits", DEFAULT_SETTINGS),
    "From 358 to 1,048,576 bits.",
  );
  assert.equal(rangeLine("width", DEFAULT_SETTINGS), "From 1 to 1,000 digits.");
  assert.equal(
    budgetLine(DEFAULT_SETTINGS),
    "From 10 to 10,000 ms. The time the probe allows one pass.",
  );
  // The range follows the settings in force.
  assert.equal(
    rangeLine("displayDigits", {
      ...DEFAULT_SETTINGS,
      precisionLimitDigits: 20,
    }),
    "From 1 to 20 digits, up to the precision limit.",
  );
  // The notation's line carries the width's range while a ratio is chosen.
  assert.equal(
    notationLine({ kind: "digits" }, DEFAULT_SETTINGS),
    NOTATION_LINE,
  );
  assert.equal(
    notationLine({ kind: "ratio", width: 20 }, DEFAULT_SETTINGS),
    `The width from 1 to 1,000 digits. ${NOTATION_LINE}`,
  );
});

test("the groups, the resets and the foot say their words", () => {
  assert.deepEqual(Object.values(GROUP_HEADINGS), [
    "How it is shown",
    "How it is computed",
    "How much it may cost",
  ]);
  assert.equal(defaultLine("displayDigits"), "default 8");
  assert.equal(defaultLine("precisionLimitDigits"), "default 1,000");
  assert.equal(defaultLine("significandLimitBits"), "default 65,536");
  assert.equal(defaultLine("budgetMs"), "default 50");
  assert.equal(defaultLine("rounding"), "default to nearest, ties to even");
  assert.equal(defaultLine("mode"), "default exact");
  assert.equal(defaultLine("notation"), "default digits");
  assert.equal(defaultLine("working"), "default not extended");
  assert.equal(RESET_ALL, "Reset all settings");
  assert.equal(ABOUT.text, "About these settings");
  assert.match(ABOUT.href, /#settings$/);
});

test("the precision limit's line says its top under the significand limit as a number, by mode, and no formula", () => {
  const exact = precisionLimitLine(DEFAULT_SETTINGS);
  assert.equal(
    exact,
    "From 1 to 2,453 digits, up to the significand limit. The most digits an answer may be asked for; it bounds the effort an expression may cost.",
  );
  assert.equal(
    precisionLimitLine(DECIMAL),
    "From 1 to 2,453 digits, up to the significand limit. The most digits an answer, or the working digits, may be asked for; it bounds the effort a step's rounding may cost.",
  );
  // The numbers follow the settings in force; the formula is never written.
  const small = precisionLimitLine({
    ...DEFAULT_SETTINGS,
    significandLimitBits: 1024,
    precisionLimitDigits: 20,
  });
  assert.match(
    small,
    new RegExp(`to ${precisionLimitFor(1024)} digits, up to`),
  );
  assert.doesNotMatch(exact, /4 ×|\+ 10/);
});

test("the significand limit's line translates the limit to the digits of one part, to three figures", () => {
  assert.equal(
    significandLimitLine(DEFAULT_SETTINGS),
    "From 358 to 1,048,576 bits. The most bits in a number's numerator or denominator, 65,536 bits being about 19,700 digits; an exact result past it is refused.",
  );
  assert.equal(digitsOfBits(DEFAULT_SIGNIFICAND_LIMIT_BITS), 19700);
  assert.equal(digitsOfBits(MAX_SIGNIFICAND_LIMIT_BITS), 316000);
  assert.equal(digitsOfBits(4096), 1230);
  assert.equal(digitsOfBits(1024), 308);
  assert.equal(digitsOfBits(MIN_SIGNIFICAND_LIMIT_BITS), 107);
  assert.match(
    significandLimitLine({ ...DEFAULT_SETTINGS, significandLimitBits: 1024 }),
    /1,024 bits being about 308 digits/,
  );
});

test("a refusal names the bound and the setting that sets it", () => {
  const line = (value: unknown, setting: Parameters<typeof refusalOf>[1]) =>
    refusalLine(setting, refusalOf(value, setting, EXTENDED)!);
  assert.equal(
    line(5000, "precisionLimitDigits"),
    "At most 2,453 digits under the significand limit.",
  );
  assert.equal(
    line(1001, "displayDigits"),
    "At most 1,000 digits under the precision limit.",
  );
  assert.equal(line(7, "working"), "At least 8 digits, the display digits.");
  assert.equal(
    line(1001, "working"),
    "At most 1,000 digits under the precision limit.",
  );
  assert.equal(line(0, "displayDigits"), "At least 1 digit.");
  assert.equal(line(1001, "width"), "At most 1,000 digits.");
  assert.equal(line(5, "budgetMs"), "At least 10 ms.");
  assert.equal(line(10001, "budgetMs"), "At most 10,000 ms.");
  assert.equal(
    line(MAX_SIGNIFICAND_LIMIT_BITS + 1, "significandLimitBits"),
    "At most 1,048,576 bits.",
  );
  assert.equal(line(2.5, "displayDigits"), "A whole number.");
});

test("a clamp's line says the move and the setting whose bound it was brought to", () => {
  assert.equal(
    clampLine({
      setting: "precisionLimitDigits",
      from: 1000,
      to: 990,
      by: "significandLimitBits",
    }),
    "Lowered from 1,000 to 990 digits to fit the significand limit.",
  );
  assert.equal(
    clampLine({
      setting: "displayDigits",
      from: 100,
      to: 20,
      by: "precisionLimitDigits",
    }),
    "Lowered from 100 to 20 digits to fit the precision limit.",
  );
  assert.equal(
    clampLine({ setting: "working", from: 8, to: 16, by: "displayDigits" }),
    "Raised from 8 to 16 digits to the display digits.",
  );
});

test("the proposal says the sizes timed, what they took against the budget, and the limits proposed", () => {
  assert.equal(
    proposalLine(
      {
        significandLimitBits: 65536,
        productMs: 31.4,
        precisionLimitDigits: 1000,
        builtinsMs: 44,
      },
      50,
    ),
    "Exact products at 65,536 bits took 31 ms and the built-ins on a grid of 4,040 digits took 44 ms, within the 50 ms budget: significand limit 65,536 bits, precision limit 1,000 digits.",
  );
  // A floor that cost more than the budget is said to have.
  assert.equal(
    proposalLine(
      {
        significandLimitBits: MIN_SIGNIFICAND_LIMIT_BITS,
        productMs: 80,
        precisionLimitDigits: 1,
        builtinsMs: 0.04,
      },
      50,
    ),
    "Exact products at 358 bits took 80 ms and the built-ins on a grid of 44 digits took under 0.1 ms, over the 50 ms budget at the least this device may be set to: significand limit 358 bits, precision limit 1 digit.",
  );
  assert.equal(measure(1, "digits"), "1 digit");
  assert.equal(measure(2453, "digits"), "2,453 digits");
  assert.equal(measure(1, "ms"), "1 ms");
  assert.equal(formatMs(0.05), "under 0.1 ms");
  assert.equal(formatMs(0.5), "0.5 ms");
  assert.equal(formatMs(9.96), "10.0 ms");
  assert.equal(formatMs(12.6), "13 ms");
  assert.equal(formatMs(1234.5), "1,235 ms");
});
