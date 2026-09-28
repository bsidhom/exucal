import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_MAX_DIGITS,
  ceilingFor,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact } from "./ball.ts";
import { show } from "./display.ts";
import { buildTable } from "./build.ts";
import { parseDefinitions } from "./definitions.ts";
import {
  convertText,
  evaluateText,
  resolve,
  schedule,
  type Conversion,
  type ConversionError,
  type TextError,
} from "./pipeline.ts";
import { evaluate } from "./evaluate.ts";
import { parseExpr } from "./expr.ts";
import type { Quantity } from "./quantity.ts";
import { certifies } from "./ball.ts";
import { DEFAULT_PRECISION } from "./rounding.ts";
import type { Result } from "./result.ts";
import { ONE, divide, equals, format, type Scaled } from "./scaled.ts";
import { unitLookup, type UnitTable } from "./table.ts";
import { dec, fr } from "../testing/scaled.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** The ceiling of the retry schedule the tests run under: the default cap's. */
const CEILING = ceilingFor(DEFAULT_MAX_DIGITS);

// ---------------------------------------------------------------------------
// Helpers

/** A table of a few lengths, times and an angle, enough for every case. */
const table: UnitTable = (() => {
  const definitions = parseDefinitions(
    [
      "m        !",
      "s        !",
      "radian   !kind",
      "k-       1000",
      "m-       0.001",
      "in       0.0254 m",
      "ft       12 in",
      "mi       5280 ft",
      "min      60 s",
      "Hz       1/s",
      "rpm      2 radian / min",
      "deg      pi() radian / 180",
      "zero     0 m",
      "hr       60 min",
      "time     hr;min;s",
      "ftin     ft;in",
      "K        !",
      "degF     5 K / 9",
      "tempC(x) [1;K]  x K + 273.15 K ; tempC / K - 273.15",
      "tempF(x) [1;K]  (x + 459.67) degF ; tempF / degF - 459.67",
      "recip(x) [1;1]  1 / x ; 1 / recip",
      "dozen(x) [in;ft]  12 x ; dozen / 12",
    ].join("\n"),
  );
  assert.ok(
    definitions.ok,
    `expected the text to parse, got ${inspect(definitions)}`,
  );
  const built = buildTable(definitions.value, CONTEXT);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

function converted(
  have: string,
  want: string,
): Result<Conversion, ConversionError> {
  return convertText(table, have, want, CONTEXT);
}

function value(
  have: string,
  want: string,
): Extract<Conversion, { kind: "unit" }> {
  const result = converted(have, want);
  assert.ok(result.ok, `expected a conversion, got ${inspect(result)}`);
  assert.equal(result.value.kind, "unit", `expected one unit, got a list`);
  assert.ok(result.value.kind === "unit");
  return result.value;
}

function list(
  have: string,
  want: string,
): Extract<Conversion, { kind: "list" }> {
  const result = converted(have, want);
  assert.ok(result.ok, `expected a conversion, got ${inspect(result)}`);
  assert.equal(result.value.kind, "list", `expected a list, got one unit`);
  assert.ok(result.value.kind === "list");
  return result.value;
}

function call(
  have: string,
  want: string,
): Extract<Conversion, { kind: "function" }> {
  const result = converted(have, want);
  assert.ok(result.ok, `expected a conversion, got ${inspect(result)}`);
  assert.equal(result.value.kind, "function", `expected a function`);
  assert.ok(result.value.kind === "function");
  return result.value;
}

function failure(have: string, want: string): ConversionError {
  const result = converted(have, want);
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** The value the decimal `text`, or the quotient `a/b` of two, denotes, exactly. */
function number(text: string): Scaled {
  const [numerator, denominator] = text.split("/");
  const num = dec(numerator!);
  if (denominator === undefined) return num;
  const quotient = divide(num, dec(denominator));
  assert.ok(quotient.ok, `${JSON.stringify(text)} divides by zero`);
  return quotient.value;
}

/** `s` written out at forty digits, for a message. */
function written(s: Scaled): string {
  return format(s, 40, DEFAULT_ROUNDING);
}

/** Asserts that `have` converts to exactly the decimal `expected` `want`s. */
function assertConverts(have: string, want: string, expected: string): void {
  const actual = value(have, want).value;
  assert.ok(isExact(actual), `${have} in ${want}: ${inspect(actual)}`);
  assert.ok(
    equals(actual.mid, dec(expected)),
    `${have} in ${want}: expected ${expected}, got ${written(actual.mid)}`,
  );
}

// ---------------------------------------------------------------------------
// Values

test("a conversion is the ratio of the two quantities", () => {
  assertConverts("3 ft", "in", "36");
  assertConverts("1 mi", "km", "1.609344");
  assertConverts("2 * 3 m", "m", "6");
});

test("want may carry a magnitude of its own", () => {
  assertConverts("1 mi", "1000 ft", "5.28");
});

test("either text may be a sum or a difference", () => {
  assertConverts("1 ft + 1 in", "in", "13");
  assertConverts("1 ft - 1 in", "in", "11");
  assertConverts("5 ft + 3 in - 2 in", "in", "61");
  assertConverts("1 mi", "1000 ft + 1000 ft", "2.64");
  assertConverts("ft + in", "in", "13");
  assertConverts("1 in - 1 ft", "in", "-11");
  assertConverts("1 rpm + 1 rpm", "rpm", "2");
});

test("either text may be negated", () => {
  assertConverts("-3 ft", "in", "-36");
  assertConverts("3 ft", "-in", "-36");
  assertConverts("-3 ft", "-in", "36");
  assertConverts("-(1 ft + 1 in)", "in", "-13");
  assertConverts("2 - -3", "1", "5");
});

test("the conversion carries both quantities", () => {
  const { have, want } = value("3 ft", "in");
  assert.ok(equals(have.magnitude.mid, dec("0.9144")));
  assert.ok(equals(want.magnitude.mid, dec("0.0254")));
  assert.deepEqual([...have.dimension.keys()], ["m"]);
  assert.deepEqual([...want.dimension.keys()], ["m"]);
});

test("surrounding spaces are allowed", () => {
  assertConverts("  3 ft ", " in  ", "36");
});

test("the schedule doubles from the digits asked for plus the guard, and ends at the ceiling", () => {
  const precisions = (precision: number, ceiling: number) =>
    schedule({ ...CONTEXT, precision, ceiling }).map((c) => c.precision);
  assert.deepEqual(
    precisions(8, CEILING),
    [18, 36, 72, 144, 288, 576, 1152, 2304, 4040],
  );
  assert.deepEqual(precisions(1000, CEILING), [1010, 2020, 4040]);
  assert.deepEqual(precisions(1, 44), [11, 22, 44]);
  assert.deepEqual(precisions(1, 45), [11, 22, 44, 45]);
  assert.equal(CEILING, 4040);
  // The mode, the range limit and the ceiling are the user's throughout.
  for (const working of schedule({ ...CONTEXT, rounding: "floor" })) {
    assert.equal(working.rounding, "floor");
    assert.equal(working.maxBits, CONTEXT.maxBits);
    assert.equal(working.ceiling, CEILING);
  }
  // A precision above the cap the ceiling was derived from is a bug.
  assert.throws(() => schedule({ ...CONTEXT, precision: 1001 }), RangeError);
  assert.throws(() => schedule({ ...CONTEXT, precision: 0 }), RangeError);
  assert.throws(
    () => evaluateText(table, "1", { ...CONTEXT, precision: 0 }),
    RangeError,
  );
});

/**
 * Runs `text` through `resolve` as `evaluateText` does, at `digits`, and
 * returns the outcome with the working precisions the passes ran at.
 */
function passes(
  text: string,
  digits: number,
): { result: Result<Quantity, TextError>; at: number[] } {
  const context = { ...CONTEXT, precision: digits };
  const expr = parseExpr(text);
  assert.ok(expr.ok, inspect(expr));
  const at: number[] = [];
  const result = resolve(
    context,
    (working) => {
      at.push(working.precision);
      return evaluate(
        expr.value,
        unitLookup(table, working),
        table.primitives,
        working,
      );
    },
    (quantity) =>
      isExact(quantity.magnitude) ||
      certifies(quantity.magnitude, digits, context.rounding),
    (error) => innermost(error).kind === "unresolved",
  );
  return { result, at };
}

/** The error inside any `callFailed` wrappers. */
function innermost(error: TextError): TextError {
  return error.kind === "callFailed" ? innermost(error.error) : error;
}

test("a pass that certifies the digits asked for ends the loop", () => {
  assert.deepEqual(passes("2^(1/2)", 8).at, [18]);
  assert.deepEqual(passes("2^(1/2)", 50).at, [60]);
  assert.deepEqual(passes("2 ft", 8).at, [18]);
  // Cancellation costs passes. The first pass carries eighteen digits and
  // the kernel's guard bits, about twenty-seven in all, so fifteen digits
  // of cancellation still certify on it; twenty need a second pass, sixty
  // a third, a hundred a fourth.
  assert.deepEqual(passes("(2^(1/2) + 1e-15) - 2^(1/2)", 8).at, [18]);
  assert.deepEqual(passes("(2^(1/2) + 1e-20) - 2^(1/2)", 8).at, [18, 36]);
  assert.deepEqual(passes("(2^(1/2) + 1e-60) - 2^(1/2)", 8).at, [18, 36, 72]);
  assert.deepEqual(
    passes("(2^(1/2) + 1e-100) - 2^(1/2)", 8).at,
    [18, 36, 72, 144],
  );
  const certified = passes("(2^(1/2) + 1e-100) - 2^(1/2)", 8).result;
  assert.ok(certified.ok);
  assert.deepEqual(show(certified.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "1e-100",
  });
});

test("a value that never certifies runs to the ceiling and is shown as what it is", () => {
  const zero = passes("(2^(1/2))^2 - 2", 8);
  assert.equal(zero.at.length, 9);
  assert.equal(zero.at[8], CEILING);
  assert.ok(zero.result.ok);
  const shown = show(zero.result.value.magnitude, 8, DEFAULT_ROUNDING);
  assert.equal(shown.kind, "zero");
  assert.ok(
    shown.kind === "zero" && /e-40[0-9][0-9]$/.test(shown.bound),
    shown.bound,
  );
  // Through the pipeline proper, the same.
  const viaPipeline = evaluateText(table, "(2^(1/2))^2 - 2", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(viaPipeline.ok);
  assert.equal(
    show(viaPipeline.value.magnitude, 8, DEFAULT_ROUNDING).kind,
    "zero",
  );
});

test("an unresolved is retried to the ceiling, and any other error returns at once", () => {
  const unresolved = passes("1 / ((2^(1/2))^2 - 2)", 8);
  assert.equal(unresolved.at.length, 9);
  assert.ok(!unresolved.result.ok);
  assert.equal(unresolved.result.error.kind, "unresolved");
  const unknown = passes("bogus", 8);
  assert.deepEqual(unknown.at, [18]);
  assert.ok(!unknown.result.ok);
  assert.equal(unknown.result.error.kind, "unknownUnit");
  const zero = passes("1 / 0", 8);
  assert.deepEqual(zero.at, [18]);
  // The converter's unresolved want is retried too, through the pipeline.
  const want = convertText(table, "3 ft", "((2^(1/2))^2 - 2) m", CONTEXT);
  assert.ok(!want.ok);
  assert.equal(want.error.kind, "unresolvedWant");
  // An unresolved inside a call is retried as well.
  const call = passes("recip((2^(1/2))^2 - 2)", 8);
  assert.equal(call.at.length, 9);
});

test("resolve keeps the best result so far and returns it when a later pass is unaffordable", () => {
  const seen: number[] = [];
  const result = resolve<string, { kind: "tooLarge" | "unresolved" | "other" }>(
    { ...CONTEXT, precision: 8 },
    (working) => {
      seen.push(working.precision);
      if (working.precision === 18)
        return { ok: false, error: { kind: "unresolved" } };
      if (working.precision === 36) return { ok: true, value: "partial at 36" };
      return { ok: false, error: { kind: "tooLarge" } };
    },
    () => false,
    (error) => error.kind === "unresolved",
  );
  assert.deepEqual(seen, [18, 36, 72]);
  assert.deepEqual(result, { ok: true, value: "partial at 36" });
  // With no result before it, the error is returned.
  const failed = resolve<string, { kind: string }>(
    { ...CONTEXT, precision: 8 },
    () => ({ ok: false, error: { kind: "other" } }),
    () => false,
    () => false,
  );
  assert.deepEqual(failed, { ok: false, error: { kind: "other" } });
  // At the ceiling the best so far is returned, or the last error.
  const exhausted = resolve<number, { kind: string }>(
    { ...CONTEXT, precision: 1000 },
    (working) => ({ ok: true, value: working.precision }),
    () => false,
    () => false,
  );
  assert.deepEqual(exhausted, { ok: true, value: 4040 });
  const never = resolve<number, { kind: string }>(
    { ...CONTEXT, precision: 1000 },
    () => ({ ok: false, error: { kind: "unresolved" } }),
    () => false,
    () => true,
  );
  assert.deepEqual(never, { ok: false, error: { kind: "unresolved" } });
});

test("the range limit of the context reaches a literal's mantissa and a power", () => {
  const small = { ...CONTEXT, maxBits: 64 };
  // Twenty-one digits are about seventy bits; the exponent costs nothing.
  const literal = evaluateText(table, "123456789012345678901 m", small);
  assert.ok(!literal.ok);
  assert.deepEqual(literal.error, {
    kind: "tooLarge",
    span: { start: 0, end: 21 },
  });
  assert.ok(evaluateText(table, "1e18 m", small).ok);
  assert.ok(evaluateText(table, "1e30 m", small).ok);
  assert.ok(evaluateText(table, "1e999999999 m", small).ok);
  const power = evaluateText(table, "2^100 m", small);
  assert.ok(!power.ok);
  assert.equal(power.error.kind, "tooLarge");
  // An inexact base is bounded by its magnitude, not by an exact power.
  assert.ok(evaluateText(table, "(2^(1/2))^1000", CONTEXT).ok);
  const huge = evaluateText(table, "(2^(1/2))^10000000", CONTEXT);
  assert.ok(!huge.ok);
  assert.equal(huge.error.kind, "tooLarge");
});

test("a value that looks rational after a root is inexact, and the display says so", () => {
  // The same truncated root divided by itself: the midpoint is exactly 1,
  // the radius is not zero, so the display shows ≈ 1 rather than = 1.
  const ratio = value("2^(1/2) m", "2^(1/2) m").value;
  assert.ok(equals(ratio.mid, ONE));
  assert.ok(!isExact(ratio));
  assert.deepEqual(show(ratio, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "1",
  });
  // Whereas a root with an exact case is exact.
  const two = value("4^(1/2) m", "m").value;
  assert.deepEqual(show(two, 8, DEFAULT_ROUNDING), {
    kind: "exact",
    text: "2",
  });
});

test("evaluateText is the pipeline up to the quantity", () => {
  const result = evaluateText(table, "2 ft", CONTEXT);
  assert.ok(result.ok, `expected a quantity, got ${inspect(result)}`);
  assert.ok(equals(result.value.magnitude.mid, dec("0.6096")));
  assert.deepEqual([...result.value.dimension.keys()], ["m"]);
});

// ---------------------------------------------------------------------------
// Values of any exponent

/** `text` as a plain number at `digits`, through the pipeline, shown at `digits`. */
function shown(text: string, digits: number): ReturnType<typeof show> {
  const result = evaluateText(table, text, { ...CONTEXT, precision: digits });
  assert.ok(result.ok, `${text}: ${inspect(result)}`);
  return show(result.value.magnitude, digits, DEFAULT_ROUNDING);
}

test("a literal of any exponent is a value, exact through the exact operations", () => {
  assertConverts("1e999999999 m", "mm", "1e1000000002");
  assert.deepEqual(shown("1e999999999 m / mm", 8), {
    kind: "exact",
    text: "1e+1000000002",
  });
  assert.deepEqual(shown("1e999999999 * 1e999999999", 8), {
    kind: "exact",
    text: "1e+1999999998",
  });
  assertConverts("1e999999999 + 3e999999998", "1", "1.3e999999999");
  assertConverts("1e999999999 m", "1e999999990 km", "1e6");
});

test("a sum of two exact values that cannot be aligned is too large, at the sum", () => {
  const sum = evaluateText(table, "1e999999999 + 1", CONTEXT);
  assert.ok(!sum.ok);
  assert.deepEqual(sum.error, {
    kind: "tooLarge",
    span: { start: 0, end: 15 },
  });
  assert.deepEqual(failure("1e999999999 m - 1 m", "m"), {
    kind: "inputError",
    side: "have",
    error: { kind: "tooLarge", span: { start: 0, end: 19 } },
  });
  // With an inexact operand the smaller is absorbed into the radius, and
  // the sum certifies on the first pass.
  for (const text of ["sqrt(2) + 1e999999999", "1e999999999 + sqrt(2)"]) {
    assert.deepEqual(passes(text, 8).at, [18]);
    assert.deepEqual(shown(text, 8), {
      kind: "certified",
      text: "1e+999999999",
    });
  }
});

test("the roots and the logarithms take any exponent, and certify on the first pass", () => {
  // References from Python's decimal module at sixty digits.
  const root = "sqrt(1e999999999)";
  assert.deepEqual(passes(root, 8).at, [18]);
  assert.deepEqual(shown(root, 8), {
    kind: "certified",
    text: "3.1622777e+499999999",
  });
  assert.deepEqual(shown(root, 40), {
    kind: "certified",
    text: "3.16227766016837933199889354443271853372e+499999999",
  });
  // ln(1e999999999) = 999999999 ln 10.
  const ln = "ln(1e999999999)";
  assert.deepEqual(passes(ln, 8).at, [18]);
  assert.deepEqual(shown(ln, 8), { kind: "certified", text: "2.3025851e+9" });
  assert.deepEqual(shown(ln, 40), {
    kind: "certified",
    text: "2302585090.691460591023945770666372752917",
  });
  // The exact case reads the exponent.
  const log = evaluateText(table, "log10(1e999999999)", CONTEXT);
  assert.ok(log.ok, inspect(log));
  assert.deepEqual(log.value.magnitude, exact(fr(999999999n)));
  assert.deepEqual(shown("log10(1e999999999)", 9), {
    kind: "exact",
    text: "999999999",
  });
});

test("a root times a power of ten certifies the root's digits on the first pass", () => {
  // sqrt 2 to fifty digits, from Python's decimal module: the product's
  // radius is the root's scaled by the power, far below the fiftieth
  // digit, so the first pass at sixty certifies all fifty.
  const product = "sqrt(2) * 1e999999999";
  assert.deepEqual(passes(product, 50).at, [60]);
  assert.deepEqual(shown(product, 50), {
    kind: "certified",
    text: "1.4142135623730950488016887242096980785696718753769e+999999999",
  });
});

test("the trigonometric functions saturate or refuse an argument of any exponent", () => {
  // The sine needs the argument reduced by pi to its bits, which cannot
  // be: too large, at the call.
  const sine = evaluateText(table, "sin(1e999999999 radian)", CONTEXT);
  assert.ok(!sine.ok);
  assert.deepEqual(sine.error, {
    kind: "tooLarge",
    span: { start: 0, end: 23 },
  });
  assert.deepEqual(failure("sin(1e999999999 radian)", "1"), {
    kind: "inputError",
    side: "have",
    error: { kind: "tooLarge", span: { start: 0, end: 23 } },
  });
  // The arc tangent is pi/2 within 2^-bits: 90 degrees, inexact.
  const right = value("atan(1e999999999)", "deg").value;
  assert.ok(!isExact(right));
  assert.deepEqual(show(right, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "90",
  });
  // asinh(x) is ln(2x) within 1/(4x^2): ln 2 + 999999999 ln 10, from
  // Python's decimal module at sixty digits.
  const asinh = "asinh(1e999999999)";
  assert.deepEqual(passes(asinh, 8).at, [18]);
  assert.deepEqual(shown(asinh, 8), {
    kind: "certified",
    text: "2.3025851e+9",
  });
  assert.deepEqual(shown(asinh, 40), {
    kind: "certified",
    text: "2302585091.384607771583891080083604874375",
  });
});

// ---------------------------------------------------------------------------
// Failures

test("a text that does not parse fails on its side, with the parser's error", () => {
  assert.deepEqual(failure("3 ft ^", "in"), {
    kind: "inputError",
    side: "have",
    error: { kind: "unexpected", pos: 6, expected: ["a number", '"("'] },
  });
  assert.deepEqual(failure("3 ft", "in ^"), {
    kind: "inputError",
    side: "want",
    error: { kind: "unexpected", pos: 4, expected: ["a number", '"("'] },
  });
});

test("an unknown unit fails on its side, at its span", () => {
  assert.deepEqual(failure("3 bogus", "in"), {
    kind: "inputError",
    side: "have",
    error: { kind: "unknownUnit", name: "bogus", span: { start: 2, end: 7 } },
  });
  assert.deepEqual(failure("3 ft", "2 bogus"), {
    kind: "inputError",
    side: "want",
    error: { kind: "unknownUnit", name: "bogus", span: { start: 2, end: 7 } },
  });
});

test("an evaluation error fails on its side, at its span", () => {
  assert.deepEqual(failure("m / 0", "in"), {
    kind: "inputError",
    side: "have",
    error: { kind: "divisionByZero", span: { start: 4, end: 5 } },
  });
});

test("a nonconforming sum is its side's error, checked by the table's roles", () => {
  const error = failure("3 ft", "1 in + 1 min");
  assert.equal(error.kind, "inputError");
  assert.ok(error.kind === "inputError");
  assert.equal(error.side, "want");
  assert.equal(error.error.kind, "nonconformingOperands");
  assert.ok(error.error.kind === "nonconformingOperands");
  assert.deepEqual(error.error.span, { start: 0, end: 12 });
  assert.equal(error.error.mismatch.kind, "dimensionMismatch");
  const kinds = failure("1 rpm + 1 Hz", "Hz");
  assert.equal(kinds.kind, "inputError");
  assert.ok(kinds.kind === "inputError");
  assert.equal(kinds.side, "have");
  assert.equal(kinds.error.kind, "nonconformingOperands");
  assert.ok(kinds.error.kind === "nonconformingOperands");
  assert.equal(kinds.error.mismatch.kind, "kindMismatch");
});

test("have is tried first, so its failure is reported when both fail", () => {
  const error = failure("bogus", "bogus");
  assert.equal(error.kind, "inputError");
  assert.equal(error.side, "have");
});

test("evaluateText reports the text's own error, with no side", () => {
  const result = evaluateText(table, "3 bogus", CONTEXT);
  assert.ok(!result.ok);
  assert.equal(result.error.kind, "unknownUnit");
});

test("a conversion error is passed through as it is", () => {
  const mismatch = failure("3 ft", "min");
  assert.equal(mismatch.kind, "dimensionMismatch");
  const kinds = failure("1 rpm", "Hz");
  assert.equal(kinds.kind, "kindMismatch");
  assert.ok(kinds.kind === "kindMismatch");
  assert.deepEqual(kinds.kinds, ["radian"]);
  assert.deepEqual(failure("3 ft", "zero"), { kind: "zeroWant" });
});

// ---------------------------------------------------------------------------
// Unit lists

/** Asserts that `have` in the list `want` is exactly the `expected` terms, decimals or fractions `a/b`. */
function assertTerms(
  have: string,
  want: string,
  expected: readonly string[],
): void {
  const { terms } = list(have, want);
  assert.deepEqual(
    terms.map((term) => term.mid),
    expected.map(number),
    `${have} in ${want}`,
  );
}

test("a want of several units is a list conversion", () => {
  assertTerms("1 m", "ft;in", ["3", "428/127"]);
  assertTerms("3661 s", "hr;min;s", ["1", "1", "1"]);
  assertTerms("1 mi", "km;m", ["1", "609.344"]);
});

test("a list conversion carries the units with the text each was typed as", () => {
  const { have, units } = list("1 m", " ft ; 2 in ;in/8");
  assert.ok(equals(have.magnitude.mid, dec("1")));
  assert.deepEqual(
    units.map((unit) => unit.text),
    ["ft", "2 in", "in/8"],
  );
  assert.ok(equals(units[1]!.quantity.magnitude.mid, dec("0.0508")));
});

test("a want that names a unit list in the table is that list", () => {
  assertTerms("3661 s", "time", ["1", "1", "1"]);
  assertTerms("1 m", "ftin", ["3", "428/127"]);
  const { units } = list("1 m", " ftin ");
  assert.deepEqual(
    units.map((unit) => unit.text),
    ["ft", "in"],
  );
});

test("a list's name means the list only on its own", () => {
  assert.deepEqual(failure("1 m", "2 ftin"), {
    kind: "inputError",
    side: "want",
    error: { kind: "unknownUnit", name: "ftin", span: { start: 2, end: 6 } },
  });
  assert.deepEqual(failure("1 m", "ftin;in"), {
    kind: "inputError",
    side: "want",
    error: { kind: "unknownUnit", name: "ftin", span: { start: 0, end: 4 } },
  });
  assert.deepEqual(failure("ftin", "in"), {
    kind: "inputError",
    side: "have",
    error: { kind: "unknownUnit", name: "ftin", span: { start: 0, end: 4 } },
  });
});

test("a have that does not conform to a named list is the mismatch of the pair", () => {
  const error = failure("3 ft", "time");
  assert.equal(error.kind, "dimensionMismatch");
  const kinds = failure("1 rpm", "time");
  assert.equal(kinds.kind, "dimensionMismatch");
});

test("an item of a typed list that fails is the want's error, at its span", () => {
  assert.deepEqual(failure("1 m", "ft;bogus"), {
    kind: "inputError",
    side: "want",
    error: { kind: "unknownUnit", name: "bogus", span: { start: 3, end: 8 } },
  });
  assert.deepEqual(failure("1 m", "ft;in;"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "unexpected",
      pos: 6,
      expected: ["a number", "a unit name", '"("', '"-"'],
    },
  });
});

test("a typed list that is not a list is reported with its units' texts", () => {
  const mismatch = failure("1 m", "ft;min");
  assert.equal(mismatch.kind, "unitListError");
  assert.ok(mismatch.kind === "unitListError");
  assert.deepEqual(mismatch.units, ["ft", "min"]);
  assert.equal(mismatch.error.kind, "nonconformingUnit");
  assert.equal(mismatch.error.index, 1);
  const zero = failure("1 m", "ft; zero");
  assert.ok(zero.kind === "unitListError");
  assert.deepEqual(zero.units, ["ft", "zero"]);
  assert.deepEqual(zero.error, { kind: "nonpositiveUnit", index: 1 });
  const order = failure("1 m", "in;ft");
  assert.ok(order.kind === "unitListError");
  assert.deepEqual(order.error, { kind: "unitOutOfOrder", index: 1 });
});

test("a have that fails is reported before the list is read", () => {
  const error = failure("bogus", "ft;in;");
  assert.equal(error.kind, "inputError");
  assert.equal(error.side, "have");
});

// ---------------------------------------------------------------------------
// Functions

/** Asserts that `have` in the function `want` is the call of it at the decimal `expected`. */
function assertCall(have: string, want: string, expected: string): void {
  const conversion = call(have, want);
  assert.equal(conversion.name, want.trim());
  assert.ok(
    equals(conversion.value.mid, dec(expected)),
    `${have} in ${want}: expected ${expected}, got ${written(conversion.value.mid)}`,
  );
}

test("a want that names a function is the call of it that would produce the have", () => {
  assertCall("tempF(212)", "tempC", "100");
  assertCall("tempC(100)", "tempF", "212");
  assertCall("300 K", "tempF", "80.33");
  assertCall("tempF(-40)", "tempC", "-40");
  assertCall("0 K", "tempC", "-273.15");
  assertCall("tempF(212)", " tempC ", "100");
  const { have, argument, unit } = call("tempF(212)", "tempC");
  assert.ok(equals(have.magnitude.mid, dec("373.15")));
  assert.ok(equals(argument.magnitude.mid, dec("100")));
  assert.deepEqual([...argument.dimension.keys()], []);
  assert.equal(unit.text, "1");
});

test("the recovered argument is counted in the declared argument unit", () => {
  const conversion = call("2 ft", "dozen");
  assert.deepEqual(conversion.value, exact(dec("2")));
  assert.equal(conversion.unit.text, "in");
  assert.ok(equals(conversion.unit.quantity.magnitude.mid, dec("0.0254")));
  assert.ok(equals(conversion.argument.magnitude.mid, dec("0.0508")));
});

test("a call as the have or the want is an expression like any other", () => {
  assertConverts("tempC(100)", "K", "373.15");
  assertConverts("tempC(100) - tempC(0)", "degF", "180");
  assertConverts("tempC(100)", "tempC(100)", "1");
  assertConverts("2 tempC(100)", "K", "746.3");
  assert.ok(equals(value("K", "tempC(100)").value.mid, fr(100n, 37315n)));
});

test("a function's name means the function only on its own", () => {
  assert.deepEqual(failure("1 K", "2 tempC"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 2, end: 7 },
      arity: { min: 1, max: 1 },
    },
  });
  assert.deepEqual(failure("1 K", "tempC;K"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 0, end: 5 },
      arity: { min: 1, max: 1 },
    },
  });
  assert.deepEqual(failure("tempC", "K"), {
    kind: "inputError",
    side: "have",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 0, end: 5 },
      arity: { min: 1, max: 1 },
    },
  });
});

test("a have that does not conform to a function is the mismatch of the pair", () => {
  const error = failure("3 ft", "tempC");
  assert.equal(error.kind, "dimensionMismatch");
  assert.ok(error.kind === "dimensionMismatch");
  assert.deepEqual([...error.have.keys()], ["m"]);
  assert.deepEqual([...error.want.keys()], ["K"]);
});

test("a call that fails is its side's error", () => {
  const argument = failure("tempC(1 m)", "K");
  assert.equal(argument.kind, "inputError");
  assert.ok(argument.kind === "inputError");
  assert.equal(argument.side, "have");
  assert.equal(argument.error.kind, "argumentMismatch");
  assert.deepEqual(failure("1 K", "in(2)"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "notAFunction",
      name: "in",
      span: { start: 0, end: 2 },
      call: { start: 0, end: 5 },
      otherwise: "unit",
    },
  });
  const body = failure("recip(0)", "1");
  assert.ok(body.kind === "inputError" && body.side === "have");
  assert.equal(body.error.kind, "callFailed");
});

test("an inverse that fails for the have's value is an inverseFailed on the want side", () => {
  // The body's error is located in the definitions: at the divisor of
  // `1 / recip`, the inverse body.
  const inverse = table.functions.get("recip")!.inverse;
  assert.ok(inverse.node.kind === "binary");
  assert.deepEqual(failure("0", "recip"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "inverseFailed",
      name: "recip",
      error: { kind: "divisionByZero", span: inverse.node.right.span },
    },
  });
  assertCall("4", "recip", "0.25");
});
