// The lines the output area shows, through the pipeline over the system
// definitions, with the fractions setting on and off (docs/fractions.md,
// "Where a fraction is written"; the plan's 5.2): where a fraction is
// parenthesized, where it is bare, the reciprocal, a unit list's
// remainder, a function's argument, and both modes.

import type { RatioDisplay } from "./core/display.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { buildTable } from "./core/build.ts";
import { plainNumbers, type Builtin } from "./core/builtin.ts";
import { powerOfTenRadius } from "./core/radius.ts";
import { ok } from "./core/result.ts";
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
import { text as joined } from "./core/print.ts";
import { format, parseDecimal } from "./core/scaled.ts";
import {
  UNCERTIFIED,
  copyText,
  displayText,
  outcomeOf,
  resultPieces,
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

/** The ratio notation a test asks for: `true` is the default width, `false` the digits notation, a number a width. */
function ratioDisplayOf(ratio: boolean | number): RatioDisplay | undefined {
  return ratio === true
    ? { width: 20 }
    : ratio === false
      ? undefined
      : { width: ratio };
}

/** The lines for `have` into `want` at `context`, with the ratio notation (`ratio`); a test's precondition that it is a result. */
function lines(
  have: string,
  want: string,
  ratio: boolean | number,
  context: NumberContext = CONTEXT,
): string[] {
  const outcome = outcomeOf(table, have, want, {
    context,
    ratio: ratioDisplayOf(ratio),
  });
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
    "in = 127/5000 × 1 m",
  ]);
  assert.deepEqual(lines("3 ft", "in", false), [
    "3 ft = 36 in",
    "in ≈ 0.027777778 × 3 ft",
  ]);
  assert.deepEqual(lines("3 ft", "in", true), [
    "3 ft = 36 in",
    "in = 1/36 × 3 ft",
  ]);
  // A value the decimal writes exactly still becomes a fraction (D21).
  assert.deepEqual(lines("1 in", "cm", false), [
    "1 in = 2.54 cm",
    "cm ≈ 0.39370079 × 1 in",
  ]);
  assert.deepEqual(lines("1 in", "cm", true), [
    "1 in = (127/50) cm",
    "cm = 50/127 × 1 in",
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
  assert.deepEqual(lines("m / (3 m)", "", true), ["m / 3 m = 1/3"]);
  assert.deepEqual(lines("m / (3 m)", "", false), ["m / 3 m ≈ 0.33333333"]);
  assert.deepEqual(lines("-m / (3 m)", "", true), ["-m / 3 m = -1/3"]);
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
  // A ratio that does not fit the width falls back to the digits: 428/127
  // is six digits, and at two digits the remainder is rounded.
  assert.deepEqual(lines("1 m", "ft;in", 6), ["1 m = 3 ft + (428/127) in"]);
  // A ratio scaled by a power of ten (D28, rule 4) is written as the
  // ratio times the power, parenthesized before a unit like any ratio.
  assert.deepEqual(lines("1 m", "in", 6), [
    "1 m = (5/127 × 1e+3) in",
    "in = 0.0254 × 1 m",
  ]);
  assert.deepEqual(lines("(1/3) * 1e30 m", "m", true), [
    "1/3 × 1e30 m = (1/3 × 1e+30) m",
    "m = 3e-30 × (1/3 × 1e30 m)",
  ]);
  assert.deepEqual(lines("-(1/3) * 1e30", "", true), [
    "-(1/3) × 1e30 = -1/3 × 1e+30",
  ]);
  assert.deepEqual(lines("1 m", "ft;in", 5), ["1 m ≈ 3 ft + 3.3700787 in"]);
  assert.deepEqual(lines("1 m", "ft;in", 5, { ...CONTEXT, precision: 2 }), [
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

test("in decimal mode no value is written as a fraction, and every line is exact (D26)", () => {
  // The fractions display is exact mode's: in decimal mode every value is
  // a decimal of the digits asked for, written entire by its digits,
  // whatever the setting says.
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  assert.deepEqual(lines("m / (4 m)", "", true, decimal), ["m / 4 m = 0.25"]);
  assert.deepEqual(lines("1 in", "cm", true, decimal), [
    "1 in = 2.54 cm",
    "cm = 0.39370079 × 1 in",
  ]);
  assert.deepEqual(lines("3 m", "m", true, decimal), [
    "3 m = 3 m",
    "m = 0.33333333 × 3 m",
  ]);
  assert.deepEqual(lines("3 m", "m", true), ["3 m = 3 m", "m = 1/3 × 3 m"]);
  // The pipeline's ratio, a list's terms and a function's count are each
  // one rounded step, exact.
  assert.deepEqual(lines("1 m", "ft;in", true, decimal), [
    "1 m = 3 ft + 3.3700787 in",
  ]);
  assert.deepEqual(lines("15 in", "ft;in", true, decimal), [
    "15 in = 1 ft + 3 in",
  ]);
  assert.deepEqual(lines("tempC(37)", "tempF", true, decimal), [
    "tempC(37) = tempF(98.6)",
  ]);
  assert.deepEqual(lines("m / (3 m)", "", true, decimal), [
    "m / 3 m = 0.33333333",
  ]);
  assert.deepEqual(lines("1 m", "in", true, decimal), [
    "1 m = 39.370079 in",
    "in = 0.0254 × 1 m",
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
      outcomeOf(table, have!, want!, { context: CONTEXT, ratio: undefined }),
      outcomeOf(table, have!, want!, { context: CONTEXT }),
      `${have} in ${want}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Conditions

const ASSUMED_TEMP_C =
  'Could not tell whether the argument of "tempC" meets "x >= -273.15"; the value assumes it does.';

/** The outcome for `have` into `want` at `context`, in the digits notation. */
function outcome(
  have: string,
  want: string,
  context: NumberContext = CONTEXT,
): Outcome {
  return outcomeOf(table, have, want, { context });
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
  // In decimal mode approx is the identity (D26): the argument is exactly
  // absolute zero, the condition holds, and nothing is assumed.
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  assert.equal(
    warnings(outcome("tempC(approx(-273.15))", "", decimal)),
    undefined,
  );
  assert.deepEqual(lines("tempC(approx(-273.15))", "", false, decimal), [
    "tempC(approx(-273.15)) = 0 K",
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
  // The have is written back canonically: its `*` as `×`.
  assert.deepEqual(lines(list, "hr;min;s", false), [
    "(tempC(approx(-273.15)) + 1 K) / K × 3700 s ≈ 1 hr + 1 min + 40 s",
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
  ratio: boolean | number,
  context: NumberContext = CONTEXT,
): readonly Line[] {
  const result = outcomeOf(table, have, want, {
    context,
    ratio: ratioDisplayOf(ratio),
  });
  assert.equal(result.kind, "result", inspect(result));
  return (result as Extract<Outcome, { kind: "result" }>).lines;
}

/** The result of `line` as the screen shows it. */
function resultText(line: Line): string {
  return joined(resultPieces(line));
}

test("the copy text is the result with `*` for the product the screen writes as `×`", () => {
  const copied = (
    have: string,
    want: string,
    ratio: boolean | number = false,
  ) => resultLines(have, want, ratio).map(copyText);
  assert.deepEqual(copied("3 ft", "in"), ["36 in", "0.027777778 * 3 ft"]);
  assert.deepEqual(copied("1 mi", "1000 ft"), [
    "5.28 * 1000 ft",
    "0.18939394 * 1 mi",
  ]);
  assert.deepEqual(copied("1 m", "in", true), [
    "(5000/127) in",
    "127/5000 * 1 m",
  ]);
  assert.deepEqual(copied("-1 m", "in", true), [
    "(-5000/127) in",
    "(-127/5000) (-1 m)",
  ]);
  assert.deepEqual(copied("1 m", "in", 6), [
    "(5/127 * 1e+3) in",
    "0.0254 * 1 m",
  ]);
  assert.deepEqual(copied("(1/3) * 1e30", "", true), ["1/3 * 1e+30"]);
  assert.deepEqual(copied("1 m", "ft;in"), ["3 ft + 3.3700787 in"]);
  assert.deepEqual(copied("-1 m", "ft;in"), ["-3 ft - 3.3700787 in"]);
  assert.equal(copied("1 m", "ft + in")[0], "3.0284676 (ft + in)");
  assert.equal(copied("1 m", "m/s*s")[0], "1 m / s * s");
  assert.deepEqual(copied("tempF(212)", "tempC"), ["tempC(100)"]);
  assert.deepEqual(copied("ft", "in"), ["12 in", "0.083333333 ft"]);
  assert.deepEqual(copied("in", ""), ["0.0254 m"]);
  assert.deepEqual(copied("2 * 3", ""), ["6"]);
});

test("what is copied, typed back as a have and converted into the line's own unit, gives the line again", () => {
  const decimal: NumberContext = { ...CONTEXT, precision: 3, mode: "decimal" };
  // Each case: the texts, the fractions setting, the want that reads each
  // line's result back (the want, then the have for the reciprocal), and
  // the context.
  const cases: [string, string, boolean | number, string[], NumberContext?][] =
    [
      ["3 ft", "in", false, ["in", "3 ft"]],
      ["1 mi", "1000 ft", false, ["1000 ft", "1 mi"]],
      ["1 m", "in", true, ["in", "1 m"]],
      ["1 m", "in", 6, ["in", "1 m"]],
      ["(1/3) * 1e30 m", "m", true, ["m", "(1/3) * 1e30 m"]],
      ["-1 m", "in", true, ["in", "-1 m"]],
      ["-3 ft", "in", false, ["in", "-3 ft"]],
      ["1 m", "ft;in", false, ["ft;in"]],
      ["-1 m", "ft;in", true, ["ft;in"]],
      ["1 m", "ft + in", false, ["ft + in", "1 m"]],
      ["1 m", "-ft", false, ["-ft", "1 m"]],
      ["1 m", "m/s*s", false, ["m/s*s", "1 m"]],
      ["1 m", "(2 m)", false, ["(2 m)", "1 m"]],
      ["sqrt(2) m", "m", false, ["m", "sqrt(2) m"]],
      ["tempF(212)", "tempC", false, ["tempC"]],
      ["2 * 3", "", false, [""]],
      ["in", "", false, ["m"]],
      ["3 ft", "in", false, ["in", "3 ft"], decimal],
      ["1 m", "in", false, ["in", "1 m"], decimal],
    ];
  for (const [have, want, fractions, wantsBack, context = CONTEXT] of cases) {
    const lines = resultLines(have, want, fractions, context);
    lines.forEach((line, i) => {
      const copied = copyText(line);
      const back = resultLines(copied, wantsBack[i]!, fractions, context)[0]!;
      const where = `${have} into ${want}: ${displayText(line)} copied as ${copied}, read back as ${displayText(back)}`;
      if (context.mode !== "decimal" && line.note === undefined) {
        // Every digit shown is certain: the copy is the value, and reads
        // back as the same result.
        assert.equal(resultText(back), resultText(line), where);
      } else {
        // The copy is the digits shown: it reads back as those digits, at
        // as many of them as the reading certifies, which in decimal mode,
        // with every step rounded, can be fewer.
        assert.ok(
          readsBackAs(firstNumber(line), firstNumber(back), context),
          where,
        );
      }
    });
  }
});

/** The first number of a line's result, as written. */
function firstNumber(line: Line): string {
  const piece = resultPieces(line).find((p) => p.kind === "number");
  assert.ok(piece !== undefined, displayText(line));
  return piece.text;
}

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

// ---------------------------------------------------------------------------
// The uncertified mark (D26; docs/decimal-mode.md, "The ceiling")

test("in decimal mode a step whose rounding the ceiling left uncertified is written with the ≈ sign bearing a dot above it, and a note", () => {
  // A built-in whose value sits on the two-digit tie at 1.25, known within
  // one unit in the working precision's last digit, certifies at no
  // precision: at the ceiling the midpoint's rounding is taken, 1.2 under
  // halfEven, flagged, and the flag carries through what follows, into
  // the reciprocal line too.
  const quarter = parseDecimal("1.25");
  assert.ok(quarter.ok);
  const tie: Builtin = {
    name: "tie",
    arity: { min: 0, max: 0 },
    dimensions: plainNumbers(0),
    apply: (_, working) =>
      ok({
        mid: quarter.value,
        rad: powerOfTenRadius(-BigInt(working.precision)),
      }),
  };
  const parsed = parseDefinitions("m  !\nin  0.0254 m");
  assert.ok(parsed.ok, inspect(parsed));
  const built = buildTable(
    parsed.value,
    ceilingContext(CONTEXT),
    new Map([["tie", tie]]),
  );
  assert.ok(built.ok, inspect(built));
  const context: NumberContext = {
    ...CONTEXT,
    precision: 2,
    rounding: "halfEven",
    mode: "decimal",
  };
  const note = "(a step could not be certified at the precision limit)";
  const alone = outcomeOf(built.value, "tie()", "", { context });
  assert.equal(alone.kind, "result", inspect(alone));
  const [line] = (alone as Extract<Outcome, { kind: "result" }>).lines;
  assert.equal(line!.relation, UNCERTIFIED);
  assert.equal(displayText(line!), `tie() ${UNCERTIFIED} 1.2 ${note}`);
  const carried = outcomeOf(built.value, "tie() * 2 m", "in", {
    context,
  });
  assert.equal(carried.kind, "result", inspect(carried));
  assert.deepEqual(
    (carried as Extract<Outcome, { kind: "result" }>).lines.map(displayText),
    [
      `tie() × 2 m ${UNCERTIFIED} 96 in ${note}`,
      `in ${UNCERTIFIED} 0.01 tie() × 2 m ${note}`,
    ],
  );
  // Without the flagged step every line is `=`: the inch is `0.025 m` at
  // two digits, so `2 m` is `80 in`, and the reciprocal `0.012`.
  const plain = outcomeOf(built.value, "2 m", "in", { context });
  assert.equal(plain.kind, "result", inspect(plain));
  assert.deepEqual(
    (plain as Extract<Outcome, { kind: "result" }>).lines.map(displayText),
    ["2 m = 80 in", "in = 0.012 × 2 m"],
  );
});
