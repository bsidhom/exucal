// The lines the output area shows, through the pipeline over the system
// definitions, with the fractions setting on and off (docs/fractions.md,
// "Where a fraction is written"; the plan's 5.2): where a fraction is
// parenthesized, where it is bare, the reciprocal, a unit list's
// remainder, a function's argument, and both modes.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_DIGITS,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  type NumberContext,
} from "./core/context.ts";
import { parseDefinitions } from "./core/definitions.ts";
import type { UnitTable } from "./core/table.ts";
import { outcomeOf, type Line, type Outcome } from "./outcome.ts";

const CONTEXT: NumberContext = {
  precision: DEFAULT_DIGITS,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");

/** The system table, built once at the ceiling. */
const table: UnitTable = (() => {
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** A line as the component writes it: the terms joined as `renderTerm` joins them, and the note in parentheses. */
function written(line: Line): string {
  const terms = line.terms
    .map((term, i) => {
      const operator = i === 0 ? "" : term.negative ? " - " : " + ";
      const unit = term.unit === "" ? "" : ` ${term.unit}`;
      return `${operator}${term.text}${unit}`;
    })
    .join("");
  const sum = line.call === undefined ? terms : `${line.call}(${terms})`;
  const note = line.note === undefined ? "" : ` (${line.note})`;
  return `${line.have} ${line.relation} ${sum}${note}`;
}

/** The lines for `have` into `want` at `context`, with `fractions`; a test's precondition that it is a result. */
function lines(
  have: string,
  want: string,
  fractions: boolean,
  context: NumberContext = CONTEXT,
): string[] {
  const outcome = outcomeOf(table, have, want, context, fractions);
  assert.equal(outcome.kind, "result", inspect(outcome));
  return (outcome as Extract<Outcome, { kind: "result" }>).lines.map(written);
}

test("a fraction is parenthesized before a unit, and the reciprocal before the have", () => {
  assert.deepEqual(lines("1 m", "in", false), [
    "1 m ≈ 39.370079 in",
    "in = 0.0254 × 1 m",
  ]);
  assert.deepEqual(lines("1 m", "in", true), [
    "1 m = (5000/127) in",
    "in = (127/5000) × 1 m",
  ]);
  assert.deepEqual(lines("3 ft", "in", false), [
    "3 ft = 36 in",
    "in ≈ 0.027777778 × 3 ft",
  ]);
  assert.deepEqual(lines("3 ft", "in", true), [
    "3 ft = 36 in",
    "in = (1/36) × 3 ft",
  ]);
  // A value the decimal writes exactly still becomes a fraction (D21).
  assert.deepEqual(lines("1 in", "cm", false), [
    "1 in = 2.54 cm",
    "cm ≈ 0.39370079 × 1 in",
  ]);
  assert.deepEqual(lines("1 in", "cm", true), [
    "1 in = (127/50) cm",
    "cm = (50/127) × 1 in",
  ]);
  // The sign is inside the parentheses; a negated have is parenthesized
  // as a want is.
  assert.deepEqual(lines("-1 m", "in", true), [
    "-1 m = (-5000/127) in",
    "in = (-127/5000) (-1 m)",
  ]);
  // A definition line, the want blank: the primitives follow the value.
  assert.deepEqual(lines("1 in", "", true), ["1 in = (127/5000) m"]);
  assert.deepEqual(lines("1 in", "", false), ["1 in = 0.0254 m"]);
});

test("a fraction alone, or inside a call, is bare", () => {
  assert.deepEqual(lines("m / (3 m)", "", true), ["m / (3 m) = 1/3"]);
  assert.deepEqual(lines("m / (3 m)", "", false), ["m / (3 m) ≈ 0.33333333"]);
  assert.deepEqual(lines("-m / (3 m)", "", true), ["-m / (3 m) = -1/3"]);
  assert.deepEqual(lines("tempC(37)", "tempF", true), [
    "tempC(37) = tempF(493/5)",
  ]);
  assert.deepEqual(lines("tempC(37)", "tempF", false), [
    "tempC(37) = tempF(98.6)",
  ]);
  assert.deepEqual(lines("tempC(100)", "tempF", true), [
    "tempC(100) = tempF(212)",
  ]);
});

test("a unit list's remainder is a fraction, unrounded, and the counts are integers", () => {
  assert.deepEqual(lines("1 m", "ft;in", false), ["1 m ≈ 3 ft + 3.3700787 in"]);
  assert.deepEqual(lines("1 m", "ft;in", true), ["1 m = 3 ft + (428/127) in"]);
  assert.deepEqual(lines("-1 m", "ft;in", true), [
    "-1 m = -3 ft - (428/127) in",
  ]);
  // A fraction that does not fit the digits falls back to the digits:
  // 428/127 fits at three digits and not at two.
  assert.deepEqual(lines("1 m", "ft;in", true, { ...CONTEXT, precision: 3 }), [
    "1 m = 3 ft + (428/127) in",
  ]);
  assert.deepEqual(lines("1 m", "ft;in", true, { ...CONTEXT, precision: 2 }), [
    "1 m ≈ 3 ft + 3.4 in",
  ]);
  // A remainder that is a whole number of its unit stays an integer.
  assert.deepEqual(lines("15 in", "ft;in", true), ["15 in = 1 ft + 3 in"]);
  // An inexact total has no fraction.
  assert.deepEqual(lines("approx(1) m", "ft;in", true), [
    "approx(1) m ≈ 3 ft + 3.3700787 in",
  ]);
});

test("an inexact value is written as digits with ≈, whatever the setting", () => {
  for (const fractions of [false, true]) {
    assert.deepEqual(lines("sqrt(2) m", "m", fractions), [
      "sqrt(2) m ≈ 1.4142136 m",
      "m ≈ 0.70710678 sqrt(2) m",
    ]);
    assert.deepEqual(lines("pi()", "", fractions), ["pi() ≈ 3.1415927"]);
  }
});

test("in decimal mode a fraction appears only for a value the rounding left exact", () => {
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  assert.deepEqual(lines("m / (4 m)", "", true, decimal), ["m / (4 m) = 1/4"]);
  // The reciprocal is settled at the context, as every step is: 50/127
  // rounded to eight digits is inexact, so no fraction.
  assert.deepEqual(lines("1 in", "cm", true, decimal), [
    "1 in = (127/50) cm",
    "cm ≈ 0.39370079 × 1 in",
  ]);
  assert.deepEqual(lines("3 m", "m", true, decimal), [
    "3 m = 3 m",
    "m ≈ 0.33333333 × 3 m",
  ]);
  assert.deepEqual(lines("3 m", "m", true), ["3 m = 3 m", "m = (1/3) × 3 m"]);
  // The pipeline settles its ratio, a list's terms and a function's count
  // in decimal mode, as every step is settled there.
  assert.deepEqual(lines("1 m", "ft;in", true, decimal), [
    "1 m ≈ 3 ft + 3.3700787 in",
  ]);
  assert.deepEqual(lines("15 in", "ft;in", true, decimal), [
    "15 in = 1 ft + 3 in",
  ]);
  // A function's recovered argument is inexact in decimal mode from the
  // inverse body's own roundings, so no fraction.
  assert.deepEqual(lines("tempC(37)", "tempF", true, decimal), [
    "tempC(37) ≈ tempF(98.6)",
  ]);
  assert.deepEqual(lines("m / (3 m)", "", true, decimal), [
    "m / (3 m) ≈ 0.33333333",
  ]);
  // The ratio is settled, inexact, and so is its reciprocal.
  assert.deepEqual(lines("1 m", "in", true, decimal), [
    "1 m ≈ 39.370079 in",
    "in ≈ 0.0254 × 1 m",
  ]);
});

test("with the setting off, every line is as it was", () => {
  for (const [have, want] of [
    ["1 m", "in"],
    ["3 ft", "in"],
    ["1 in", "cm"],
    ["1 m", "ft;in"],
    ["tempC(37)", "tempF"],
    ["m / (3 m)", ""],
    ["sqrt(2) m", "m"],
    ["0 m", "in"],
  ]) {
    assert.deepEqual(
      outcomeOf(table, have!, want!, CONTEXT, false),
      outcomeOf(table, have!, want!, CONTEXT),
      `${have} in ${want}`,
    );
  }
});
