import assert from "node:assert/strict";
import { DEFAULT_ROUNDING, type NumberContext } from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact } from "./ball.ts";
import { show } from "./display.ts";
import { buildTable } from "./build.ts";
import { parseDefinitions } from "./definitions.ts";
import {
  convertText,
  evaluateText,
  type Conversion,
  type ConversionError,
} from "./pipeline.ts";
import {
  DEFAULT_PRECISION,
  compare,
  equals,
  parseDecimal,
  rational,
  toFraction,
  type Rational,
} from "./rational.ts";
import { radiusUpper } from "./radius.ts";
import { type Result } from "./result.ts";
import { type UnitTable } from "./table.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
};

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
      "in       0.0254 m",
      "ft       12 in",
      "mi       5280 ft",
      "min      60 s",
      "Hz       1/s",
      "rpm      2 radian / min",
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

/** The rational the decimal `text` denotes, exactly. */
function decimal(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok, `${JSON.stringify(text)} is not a number`);
  return result.value;
}

/** Asserts that `have` converts to exactly the decimal `expected` `want`s. */
function assertConverts(have: string, want: string, expected: string): void {
  const actual = value(have, want).value;
  assert.ok(isExact(actual), `${have} in ${want}: ${inspect(actual)}`);
  assert.ok(
    equals(actual.mid, decimal(expected)),
    `${have} in ${want}: expected ${expected}, got ${toFraction(actual.mid)}`,
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
  assert.ok(equals(have.magnitude.mid, decimal("0.9144")));
  assert.ok(equals(want.magnitude.mid, decimal("0.0254")));
  assert.deepEqual([...have.dimension.keys()], ["m"]);
  assert.deepEqual([...want.dimension.keys()], ["m"]);
});

test("surrounding spaces are allowed", () => {
  assertConverts("  3 ft ", " in  ", "36");
});

test("the working precision is derived from the digits asked for: max(40, digits + 10)", () => {
  // The kernel's root at a working precision of `w` digits carries a
  // radius of a few units at `bitsFor(w)` bits: between 10^-(w + 12) and
  // 10^-(w + 8), which tells the working precisions apart.
  const assertWorking = (precision: number, working: number) => {
    const result = evaluateText(table, "2^(1/2)", {
      precision,
      rounding: DEFAULT_ROUNDING,
    });
    assert.ok(result.ok, inspect(result));
    const rad = radiusUpper(result.value.magnitude.rad);
    const label = `${precision} digits asked for compute at ${working}`;
    assert.ok(
      compare(rad, rational(1n, 10n ** BigInt(working + 8))) < 0,
      label,
    );
    assert.ok(
      compare(rad, rational(1n, 10n ** BigInt(working + 12))) > 0,
      label,
    );
  };
  assertWorking(1, 40);
  assertWorking(8, 40);
  assertWorking(30, 40);
  assertWorking(31, 41);
  assertWorking(50, 60);
  assert.throws(
    () =>
      evaluateText(table, "1", { precision: 0, rounding: DEFAULT_ROUNDING }),
    RangeError,
  );
});

test("a value that looks rational after a root is inexact, and the display says so", () => {
  // The same truncated root divided by itself: the midpoint is exactly 1,
  // the radius is not zero, so the display shows ≈ 1 rather than = 1.
  const ratio = value("2^(1/2) m", "2^(1/2) m").value;
  assert.ok(equals(ratio.mid, rational(1n)));
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
  assert.ok(equals(result.value.magnitude.mid, decimal("0.6096")));
  assert.deepEqual([...result.value.dimension.keys()], ["m"]);
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
    terms.map((term) => toFraction(term.mid)),
    expected.map((text) => {
      const [numerator, denominator] = text.split("/");
      const num = decimal(numerator!);
      if (denominator === undefined) return toFraction(num);
      const den = decimal(denominator);
      return toFraction(rational(num.num * den.den, num.den * den.num));
    }),
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
  assert.ok(equals(have.magnitude.mid, decimal("1")));
  assert.deepEqual(
    units.map((unit) => unit.text),
    ["ft", "2 in", "in/8"],
  );
  assert.ok(equals(units[1]!.quantity.magnitude.mid, decimal("0.0508")));
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
    equals(conversion.value.mid, decimal(expected)),
    `${have} in ${want}: expected ${expected}, got ${toFraction(conversion.value.mid)}`,
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
  assert.ok(equals(have.magnitude.mid, decimal("373.15")));
  assert.ok(equals(argument.magnitude.mid, decimal("100")));
  assert.deepEqual([...argument.dimension.keys()], []);
  assert.equal(unit.text, "1");
});

test("the recovered argument is counted in the declared argument unit", () => {
  const conversion = call("2 ft", "dozen");
  assert.deepEqual(conversion.value, exact(decimal("2")));
  assert.equal(conversion.unit.text, "in");
  assert.ok(equals(conversion.unit.quantity.magnitude.mid, decimal("0.0254")));
  assert.ok(equals(conversion.argument.magnitude.mid, decimal("0.0508")));
});

test("a call as the have or the want is an expression like any other", () => {
  assertConverts("tempC(100)", "K", "373.15");
  assertConverts("tempC(100) - tempC(0)", "degF", "180");
  assertConverts("tempC(100)", "tempC(100)", "1");
  assertConverts("2 tempC(100)", "K", "746.3");
  assert.ok(equals(value("K", "tempC(100)").value.mid, rational(100n, 37315n)));
});

test("a function's name means the function only on its own", () => {
  assert.deepEqual(failure("1 K", "2 tempC"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 2, end: 7 },
    },
  });
  assert.deepEqual(failure("1 K", "tempC;K"), {
    kind: "inputError",
    side: "want",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 0, end: 5 },
    },
  });
  assert.deepEqual(failure("tempC", "K"), {
    kind: "inputError",
    side: "have",
    error: {
      kind: "functionAsUnit",
      name: "tempC",
      span: { start: 0, end: 5 },
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
