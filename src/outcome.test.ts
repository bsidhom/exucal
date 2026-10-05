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
import { format, parseDecimal } from "./core/scaled.ts";
import {
  copyText,
  displayText,
  outcomeOf,
  type Line,
  type Outcome,
} from "./outcome.ts";

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

/** The lines for `have` into `want` at `context`, with `fractions`; a test's precondition that it is a result. */
function lines(
  have: string,
  want: string,
  fractions: boolean,
  context: NumberContext = CONTEXT,
): string[] {
  const outcome = outcomeOf(table, have, want, context, fractions);
  assert.equal(outcome.kind, "result", inspect(outcome));
  return (outcome as Extract<Outcome, { kind: "result" }>).lines.map(
    displayText,
  );
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

// ---------------------------------------------------------------------------
// Conditions

const ASSUMED_TEMP_C =
  'Could not tell whether the argument of "tempC" meets "x >= -273.15"; the value assumes it does.';

/** The outcome for `have` into `want` at `context`, without fractions. */
function outcome(
  have: string,
  want: string,
  context: NumberContext = CONTEXT,
): Outcome {
  return outcomeOf(table, have, want, context, false);
}

/** The warnings of a result. */
function warnings(result: Outcome): readonly string[] | undefined {
  assert.equal(result.kind, "result", inspect(result));
  return (result as Extract<Outcome, { kind: "result" }>).warnings;
}

test("a value that assumes a condition is shown, `≈`, with a warning apart from its note", () => {
  // At the ceiling, the reading is still within noise of absolute zero.
  const zero = outcome("tempC(approx(-273.15))", "");
  assert.deepEqual(lines("tempC(approx(-273.15))", "", false), [
    "tempC(approx(-273.15)) ≈ 0 K (within 2e-4047 of zero)",
  ]);
  assert.deepEqual(warnings(zero), [ASSUMED_TEMP_C]);
  // At once in decimal mode, which runs one pass.
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  assert.deepEqual(warnings(outcome("tempC(approx(-273.15))", "", decimal)), [
    ASSUMED_TEMP_C,
  ]);
  // A value whose digits are all certain is `≈` all the same, on the
  // reciprocal line too, and the same assumption is warned of once.
  assert.deepEqual(lines("tempC(approx(-273.15)) + 1 K", "K", false), [
    "tempC(approx(-273.15)) + 1 K ≈ 1 K",
    "K ≈ 1 (tempC(approx(-273.15)) + 1 K)",
  ]);
  assert.deepEqual(
    warnings(
      outcome("tempC(approx(-273.15)) + tempC(approx(-273.15)) + 1 K", "K"),
    ),
    [ASSUMED_TEMP_C],
  );
  // A unit list's line, and a function want's.
  const list = "(tempC(approx(-273.15)) + 1 K) / K * 3700 s";
  assert.deepEqual(lines(list, "hr;min;s", false), [
    `${list} ≈ 1 hr + 1 min + 40 s`,
  ]);
  assert.deepEqual(warnings(outcome(list, "hr;min;s")), [ASSUMED_TEMP_C]);
  assert.deepEqual(lines("approx(1 K) - 1 K", "tempC", false), [
    "approx(1 K) - 1 K ≈ tempC(-273.15)",
  ]);
  assert.deepEqual(warnings(outcome("approx(1 K) - 1 K", "tempC")), [
    ASSUMED_TEMP_C,
  ]);
  // A value that assumes nothing has no warnings.
  assert.equal(warnings(outcome("tempC(-273.15)", "")), undefined);
});

test("a reading below absolute zero is refused, naming the condition", () => {
  assert.deepEqual(outcome("tempC(-300)", ""), {
    kind: "error",
    side: "have",
    message:
      'Cannot compute "tempC(-300)": "tempC" requires "x >= -273.15", and x is "-300".',
  });
  assert.deepEqual(outcome("tempF(-500)", "K"), {
    kind: "error",
    side: "have",
    message:
      'Cannot compute "tempF(-500)": "tempF" requires "x >= -459.67", and x is "-500".',
  });
  assert.deepEqual(outcome("-5 K", "tempC"), {
    kind: "error",
    side: "want",
    message:
      'Cannot convert "-5 K" into "tempC": the argument it would take does not meet "x >= -273.15", which "tempC" requires.',
  });
});

/** The result lines for `have` into `want`; a test's precondition that it is a result. */
function resultLines(
  have: string,
  want: string,
  fractions: boolean,
  context: NumberContext = CONTEXT,
): readonly Line[] {
  const result = outcomeOf(table, have, want, context, fractions);
  assert.equal(result.kind, "result", inspect(result));
  return (result as Extract<Outcome, { kind: "result" }>).lines;
}

/** The want that reads a line's result back: the call it is, or the units of its terms as a list. */
function wantOf(line: Line): string {
  if (line.call !== undefined) return line.call;
  return line.terms
    .map((t) => (t.unit.kind === "none" ? "" : t.unit.unit.text))
    .join(";");
}

test("the copy text is the sum with `*` for the product the screen writes as `×`", () => {
  const copied = (have: string, want: string, fractions = false) =>
    resultLines(have, want, fractions).map(copyText);
  assert.deepEqual(copied("3 ft", "in"), ["36 in", "0.027777778 * 3 ft"]);
  assert.deepEqual(copied("1 mi", "1000 ft"), [
    "5.28 * 1000 ft",
    "0.18939394 * 1 mi",
  ]);
  assert.deepEqual(copied("1 m", "in", true), [
    "(5000/127) in",
    "(127/5000) * 1 m",
  ]);
  assert.deepEqual(copied("-1 m", "in", true), [
    "(-5000/127) in",
    "(-127/5000) (-1 m)",
  ]);
  assert.deepEqual(copied("1 m", "ft;in"), ["3 ft + 3.3700787 in"]);
  assert.deepEqual(copied("-1 m", "ft;in"), ["-3 ft - 3.3700787 in"]);
  assert.equal(copied("1 m", "ft + in")[0], "3.0284676 (ft + in)");
  assert.deepEqual(copied("tempF(212)", "tempC"), ["tempC(100)"]);
  assert.deepEqual(copied("ft", "in"), ["12 in", "0.083333333 ft"]);
  assert.deepEqual(copied("in", ""), ["0.0254 m"]);
});

test("what is copied, typed back as a have and converted into the line's own unit, gives the line again", () => {
  const decimal: NumberContext = { ...CONTEXT, precision: 3, mode: "decimal" };
  const cases: [string, string, boolean, NumberContext?][] = [
    ["3 ft", "in", false],
    ["1 mi", "1000 ft", false],
    ["1 m", "in", true],
    ["-1 m", "in", true],
    ["-3 ft", "in", false],
    ["1 m", "ft;in", false],
    ["-1 m", "ft;in", true],
    ["1 m", "ft + in", false],
    ["1 m", "-ft", false],
    ["1 m", "m/s*s", false],
    ["tempF(212)", "tempC", false],
    ["2", "", false],
    ["in", "", false],
    ["3 ft", "in", false, decimal],
    ["1 m", "in", false, decimal],
  ];
  for (const [have, want, fractions, context = CONTEXT] of cases) {
    for (const line of resultLines(have, want, fractions, context)) {
      const copied = copyText(line);
      const back = resultLines(copied, wantOf(line), fractions, context);
      const where = `${have} into ${want}: ${displayText(line)} copied as ${copied}`;
      if (context.mode !== "decimal" && line.note === undefined) {
        // Every digit shown is certain: the copy is the value, and reads back as the same terms.
        assert.deepEqual(back[0]!.terms, line.terms, where);
      } else {
        // The copy is the digits shown: it reads back as those digits, at as
        // many of them as the reading certifies, which in decimal mode, with
        // every step rounded, can be fewer.
        const [original, read] = [line.terms[0]!, back[0]!.terms[0]!];
        assert.ok(
          readsBackAs(original.value.text, read.value.text, context),
          `${where}, read back as ${displayText(back[0]!)}`,
        );
      }
    }
  }
});

/**
 * Whether the decimal `copied`, rounded in `context`'s mode to the digits
 * `read` shows, is `read`: what a value read back through the pipeline
 * must be, the reading's own digits being the ones it certifies.
 */
function readsBackAs(
  copied: string,
  read: string,
  context: NumberContext,
): boolean {
  const value = parseDecimal(copied);
  return (
    value.ok &&
    format(value.value, significantDigits(read), context.rounding) === read
  );
}

/** How many significant digits a decimal text shows. */
function significantDigits(text: string): number {
  const mantissa = text
    .replace(/[eE].*$/, "")
    .replace(/[-.]/g, "")
    .replace(/^0+/, "");
  return Math.max(mantissa.length, 1);
}
