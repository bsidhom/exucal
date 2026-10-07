import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MAX_BITS,
  MIN_MAX_BITS,
  maxDigitsFor,
} from "./core/context.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import {
  BUDGET_LINE,
  MODE_LINES,
  NOTATION_LINE,
  PROBE_LINE,
  ROUNDING_LINES,
  UNITS,
  clampLine,
  digitsOfBits,
  displayDigitsLine,
  formatMs,
  measure,
  precisionLimitLine,
  proposalLine,
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
    "Significant digits shown.",
  );
  assert.match(displayDigitsLine(DECIMAL), /every step is rounded to them/);
  assert.match(displayDigitsLine(EXTENDED), /computed with the working digits/);
  assert.match(
    workingDigitsLine(false),
    /^Every step is computed with the display digits\./,
  );
  assert.match(workingDigitsLine(true), /shown at the display digits\.$/);
  // No line says "Digits" as a name any more: the setting is the display digits.
  for (const line of [
    displayDigitsLine(DECIMAL),
    workingDigitsLine(false),
    workingDigitsLine(true),
    MODE_LINES.exact,
    MODE_LINES.decimal,
    ROUNDING_LINES.exact,
    ROUNDING_LINES.decimal,
    NOTATION_LINE,
    BUDGET_LINE,
    PROBE_LINE,
  ]) {
    assert.doesNotMatch(line, /\bDigits\b/, line);
  }
});

test("the precision limit's line says its top under the significand limit and the ceiling as numbers, by mode", () => {
  const exact = precisionLimitLine(DEFAULT_SETTINGS);
  assert.equal(
    exact,
    "The most digits an answer may be asked for, up to 2,453 under the significand limit. To certify an answer the app rounds onto a decimal grid of up to 4,040 digits, so this also bounds the effort an expression may cost: one whose digits can never be certain runs to that grid on every keystroke.",
  );
  assert.equal(
    precisionLimitLine(DECIMAL),
    "The most digits an answer, or the working digits, may be asked for, up to 2,453 under the significand limit. A step's rounding is certified on a grid of up to 4,040 digits.",
  );
  // The numbers follow the settings in force; the formula is never written.
  const small = precisionLimitLine({
    ...DEFAULT_SETTINGS,
    significandLimitBits: 1024,
    precisionLimitDigits: 20,
  });
  assert.match(small, new RegExp(`up to ${maxDigitsFor(1024)} under`));
  assert.match(small, /grid of up to 120 digits/);
  assert.doesNotMatch(exact, /4 ×|\+ 10/);
});

test("the significand limit's line translates the limit to the digits of one part, to three figures", () => {
  assert.equal(
    significandLimitLine(DEFAULT_SETTINGS),
    "The most bits in a number's significand, its numerator and, separately, its denominator: 65,536 bits is a numerator or a denominator of up to about 19,700 digits. An exact result past it is refused and named; the finest grid must fit inside it.",
  );
  assert.equal(digitsOfBits(DEFAULT_MAX_BITS), 19700);
  assert.equal(digitsOfBits(LIMIT_BITS), 316000);
  assert.equal(digitsOfBits(4096), 1230);
  assert.equal(digitsOfBits(1024), 308);
  assert.equal(digitsOfBits(MIN_MAX_BITS), 107);
  assert.match(
    significandLimitLine({ ...DEFAULT_SETTINGS, significandLimitBits: 1024 }),
    /1,024 bits is a numerator or a denominator of up to about 308 digits/,
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
    line(LIMIT_BITS + 1, "significandLimitBits"),
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
        significandLimitBits: MIN_MAX_BITS,
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
