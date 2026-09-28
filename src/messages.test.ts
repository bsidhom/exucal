// Checks that each kind of error the pipeline can return comes out as the
// sentence it should, with the right piece of the right text quoted. The
// wording is UX, but the plumbing is not: which side's text a span is
// sliced from, that a code point is quoted whole, and that dimensions are
// rendered through `formatDimension`. One case per kind keeps it to that.
// The system table is the real one, so the cases read as a user would type
// them; building it costs a few milliseconds.

import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  ceilingContext,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./core/context.ts";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, type Ball } from "./core/ball.ts";
import { buildTable } from "./core/build.ts";
import {
  angle,
  checkArgument,
  plainNumbers,
  type Builtin,
  type Builtins,
  type DomainReason,
} from "./core/builtin.ts";
import { pi } from "./core/builtins/pi.ts";
import { checkConformance } from "./core/dimension.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { ONE, sign } from "./core/rational.ts";
import { err, ok } from "./core/result.ts";
import type { EvaluateError } from "./core/evaluate.ts";
import { convertText, evaluateText } from "./core/pipeline.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import type { UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

const table: UnitTable = (() => {
  const text = readFileSync(new URL("./units.txt", import.meta.url), "utf8");
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** A table of functions whose bodies fail for some value, which the system table has none of. */
const failing: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      "recip(x)  [1;1]  1 / x ; 1 / recip",
      "bad(x)  [1;1]  recip(x) ; recip(bad)",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** The message for the error `text` fails with, in `against`. */
function textMessage(text: string, against: UnitTable = table): string {
  const result = evaluateText(against, text, CONTEXT);
  assert.ok(!result.ok, `expected ${JSON.stringify(text)} to fail`);
  return describeTextError(result.error, text, against.primitives);
}

/** The message for the error converting `have` to `want` fails with, in `against`. */
function conversionMessage(
  have: string,
  want: string,
  against: UnitTable = table,
): string {
  const result = convertText(against, have, want, CONTEXT);
  assert.ok(!result.ok, `expected ${have} in ${want} to fail`);
  return describeConversionError(result.error, have, want, against.primitives);
}

test("a parse error names what was expected and what was found", () => {
  // The character found is quoted as a whole code point, not a surrogate.
  assert.equal(
    textMessage("3 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.',
  );
  // A want may go on as a list, and says so.
  assert.equal(
    conversionMessage("3 ft", "in 😀"),
    'Unexpected "😀": expected "^", a unit name, "(", "*", "/", "+", "-", ";" or end of input.',
  );
  assert.equal(
    textMessage("m /"),
    'Unexpected end of input: expected a number, a unit name, "(" or "-".',
  );
  assert.equal(
    textMessage("1e999999999 m"),
    '"1e999999999": this number is too large to represent.',
  );
});

test("an evaluation error quotes the text at fault", () => {
  assert.equal(textMessage("3 bogus"), 'Unknown unit "bogus".');
  assert.equal(textMessage("m / 0"), 'Division by zero in "0".');
  assert.equal(
    textMessage("m / ((2^(1/2))^2 - 2)"),
    '"((2^(1/2))^2 - 2)" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
  );
  // The base of a power is quoted the same way, under a negative power or
  // an even root.
  assert.equal(
    textMessage("((2^(1/2))^2 - 2)^0.5 m"),
    '"((2^(1/2))^2 - 2)" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
  );
  assert.equal(textMessage("2^99999 m"), '"2^99999" is too large to compute.');
  assert.equal(
    textMessage("(-4)^0.5 m"),
    '"(-4)^0.5" takes an even root of a negative value.',
  );
});

test("a nonconforming sum quotes both operands with their dimensions", () => {
  assert.equal(
    textMessage("3 ft + 1 min"),
    'Cannot add "3 ft" and "1 min": "3 ft" has dimension m, but "1 min" has dimension s.',
  );
  assert.equal(
    textMessage("2 (3 ft - 1 min)"),
    'Cannot subtract "1 min" from "3 ft": "3 ft" has dimension m, but "1 min" has dimension s.',
  );
  assert.equal(
    textMessage("1 rpm + 1 Hz"),
    'Cannot add "1 rpm" and "1 Hz": "1 rpm" (radian / s) and "1 Hz" (1 / s) differ in kind: radian.',
  );
  assert.equal(
    textMessage("1 m + 0"),
    'Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1.',
  );
});

test("an input error is sliced from the text of its own side", () => {
  // Both texts have something at the span; only the want's is at fault.
  assert.equal(conversionMessage("3 ft", "3 xy"), 'Unknown unit "xy".');
  assert.equal(
    conversionMessage("3 ft + 1 in", "1 in + 1 s"),
    'Cannot add "1 in" and "1 s": "1 in" has dimension m, but "1 s" has dimension s.',
  );
});

test("a conformance error shows both dimensions", () => {
  assert.equal(
    conversionMessage(" 3 ft ", "min"),
    '"3 ft" has dimension m, but "min" has dimension s.',
  );
  assert.equal(
    conversionMessage("1 rpm", "Hz"),
    '"1 rpm" (radian / s) and "Hz" (1 / s) differ in kind: radian.',
  );
});

test("a zero want is reported as such, and one that cannot be told from zero too", () => {
  assert.equal(
    conversionMessage("3 ft", "0 m"),
    '"0 m" is zero, so nothing is a multiple of it.',
  );
  assert.equal(
    conversionMessage("3 ft", "((2^(1/2))^2 - 2) m"),
    '"((2^(1/2))^2 - 2) m" cannot be told from zero at this precision, so nothing can be converted into it.',
  );
});

test("a unit in a typed list at fault is quoted from the list", () => {
  assert.equal(
    conversionMessage("3 ft", "ft; min"),
    '"3 ft" has dimension m, but "min" has dimension s.',
  );
  assert.equal(
    conversionMessage("1 rpm", "rev/min;Hz"),
    '"1 rpm" (radian / s) and "Hz" (1 / s) differ in kind: radian.',
  );
  assert.equal(
    conversionMessage("3 ft", "ft;0 in"),
    '"0 in" is not positive (or cannot be told from zero), and every unit in a list must be.',
  );
  assert.equal(
    conversionMessage("3 ft", "in;ft"),
    '"ft" is not smaller than the unit before it; a list runs from the largest unit to the smallest.',
  );
  assert.equal(conversionMessage("3 ft", "ft;bogus"), 'Unknown unit "bogus".');
});

test("a named list that does not conform is the mismatch of the pair", () => {
  assert.equal(
    conversionMessage("3 ft", "time"),
    '"3 ft" has dimension m, but "time" has dimension s.',
  );
});

test("a call of something that is not a function says what it is", () => {
  assert.equal(
    textMessage("kg(m/s)"),
    '"kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.',
  );
  assert.equal(
    textMessage("2 km( 2 )"),
    '"km" is a unit, not a function. For a product, write "km ( 2 )", with a space.',
  );
  assert.equal(textMessage("foo(2)"), 'Unknown function "foo".');
  assert.equal(conversionMessage("1 K", "time(2)"), 'Unknown function "time".');
});

test("a function used as a unit shows the call form", () => {
  assert.equal(
    textMessage("2 tempC"),
    '"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".',
  );
  assert.equal(
    conversionMessage("1 K", "tempC;degC"),
    '"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".',
  );
});

test("a call with the wrong count of arguments says how many the function takes", () => {
  assert.equal(
    textMessage("tempC(1, 2)"),
    '"tempC" takes 1 argument, but "tempC(1, 2)" gives 2 arguments.',
  );
  assert.equal(
    textMessage("2 tempC( )"),
    '"tempC" takes 1 argument, but "tempC( )" gives no arguments.',
  );
  assert.equal(
    conversionMessage("1 K", "tempF(1, 2, 3)"),
    '"tempF" takes 1 argument, but "tempF(1, 2, 3)" gives 3 arguments.',
  );
});

test("an argument that does not conform is worded as a mismatch with what the function takes", () => {
  assert.equal(
    textMessage("tempC(1 m)"),
    'Cannot apply "tempC" to "1 m": "1 m" has dimension m, but the argument of "tempC" has dimension 1.',
  );
  assert.equal(
    textMessage("tempC(1 radian)"),
    'Cannot apply "tempC" to "1 radian": "1 radian" (radian) and the argument of "tempC" (1) differ in kind: radian.',
  );
});

test("a body that fails is described by what the definition does", () => {
  assert.equal(
    textMessage("recip(0)", failing),
    'Cannot compute "recip(0)": the definition of "recip" divides by zero.',
  );
  assert.equal(
    textMessage("2 bad( 0 )", failing),
    'Cannot compute "bad( 0 )": the definition of "bad" calls "recip", whose definition divides by zero.',
  );
  assert.equal(
    textMessage("recip((2^(1/2))^2 - 2)", failing),
    'Cannot compute "recip((2^(1/2))^2 - 2)": the definition of "recip" depends on a value that cannot be told from zero at this precision.',
  );
  assert.equal(
    conversionMessage(" 0 ", "recip", failing),
    'Cannot invert "recip" for "0": the inverse of "recip" divides by zero.',
  );
  assert.equal(
    conversionMessage("0", "bad", failing),
    'Cannot invert "bad" for "0": the inverse of "bad" calls "recip", whose definition divides by zero.',
  );
});

test("a have that does not conform to a function is the mismatch of the pair", () => {
  assert.equal(
    conversionMessage("3 ft", "tempC"),
    '"3 ft" has dimension m, but "tempC" has dimension K.',
  );
});

// ---------------------------------------------------------------------------
// Built-ins, as stand-ins injected into a build: the map of builtins.ts is
// empty, and these carry the names the real ones will, so that the wording
// keyed on a name (`pow`, and the angle) is what the user will read.

/** A built-in of `count` plain numbers, failing with `reason` on a non-positive first argument. */
function domainStandIn(
  name: string,
  count: number,
  reason: DomainReason,
  argument = 0,
): Builtin {
  return {
    name,
    arity: { min: count, max: count },
    dimensions: plainNumbers(count),
    apply: (args) =>
      sign(args[argument]!.mid) <= 0
        ? err({ kind: "domain", argument, reason })
        : ok(args[0]!),
  };
}

const STAND_IN_LIST: Builtin[] = [
  // The real `pi`, since units.txt calls it.
  pi,
  domainStandIn("ln", 1, "notPositive"),
  domainStandIn("log10", 1, "notPositive"),
  domainStandIn("log", 2, "baseOne"),
  domainStandIn("asin", 1, "outsideClosedUnitInterval"),
  domainStandIn("acosh", 1, "belowOne"),
  domainStandIn("atanh", 1, "outsideOpenUnitInterval"),
  domainStandIn("atan2", 2, "origin"),
  domainStandIn("pow", 2, "notPositive"),
  {
    name: "tau",
    arity: { min: 0, max: 0 },
    dimensions: plainNumbers(0),
    apply: () => ok(exact(ONE)),
  },
  {
    name: "exp",
    arity: { min: 1, max: 1 },
    dimensions: plainNumbers(1),
    apply: ([x]) => ok(x!),
  },
  {
    name: "sin",
    arity: { min: 1, max: 1 },
    dimensions: (args, primitives) => {
      const radian = angle(primitives);
      if (radian === undefined) return err({ kind: "noAngles" });
      const checked = checkArgument(args, 0, radian, primitives);
      return checked.ok ? ok(new Map()) : checked;
    },
    apply: ([x]) => ok(x!),
  },
  {
    name: "hypot",
    arity: { min: 2, max: 2 },
    dimensions: (args, primitives) => {
      const conformance = checkConformance(args[0]!, args[1]!, primitives);
      return conformance.ok
        ? ok(args[0]!)
        : err({
            kind: "nonconformingArguments",
            left: 0,
            right: 1,
            mismatch: conformance.error,
          });
    },
    apply: ([x]) => ok(x!),
  },
  {
    // Unresolved at an edge of one, on the second argument, and at a pole.
    name: "edge",
    arity: { min: 2, max: 2 },
    dimensions: plainNumbers(2),
    apply: ([, b]): ReturnType<Builtin["apply"]> =>
      b!.mid.num === 2n
        ? err({ kind: "unresolved", argument: 1, edge: ONE })
        : ok(b as Ball),
  },
  {
    name: "tan",
    arity: { min: 1, max: 1 },
    dimensions: plainNumbers(1),
    apply: ([x]): ReturnType<Builtin["apply"]> =>
      x!.mid.num === 2n
        ? err({ kind: "unresolved", argument: 0, edge: "pole" })
        : ok(x as Ball),
  },
];

const STAND_INS: Builtins = new Map(STAND_IN_LIST.map((fn) => [fn.name, fn]));

/** The system table built against the stand-ins, with a few definitions that call them. */
const withBuiltins: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      readFileSync(new URL("./units.txt", import.meta.url), "utf8"),
      "lnx(x)  [1;1]  ln(x) ; lnx",
      "edgex(x)  [1;1]  edge(1, x) ; edgex",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT), STAND_INS);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

test("a built-in used as a unit shows its call form, with as many arguments as it takes", () => {
  assert.equal(
    textMessage("2 pi"),
    '"pi" is a function, not a unit. To call it, write "pi()".',
  );
  assert.equal(
    textMessage("2 tau", withBuiltins),
    '"tau" is a function, not a unit. To call it, write "tau()".',
  );
  assert.equal(
    textMessage("exp", withBuiltins),
    '"exp" is a function, not a unit. To apply it to a value, write "exp(value)".',
  );
  assert.equal(
    conversionMessage("1", "log", withBuiltins),
    '"log" is a function, not a unit. To apply it to values, write "log(value, value)".',
  );
});

test("a built-in's dimension rule is worded from its data", () => {
  assert.equal(
    textMessage("exp(1 m)", withBuiltins),
    'Cannot apply "exp" to "1 m": "1 m" has dimension m, but the argument of "exp" must be a plain number.',
  );
  assert.equal(
    textMessage("log(2, 3 s)", withBuiltins),
    'Cannot apply "log" to "3 s": "3 s" has dimension s, but the second argument of "log" must be a plain number.',
  );
  assert.equal(
    textMessage("sin(1)", withBuiltins),
    'Cannot apply "sin" to "1": "1" is a plain number, but "sin" takes an angle; write "sin(1 radian)".',
  );
  assert.equal(
    textMessage("sin(tau() / 4)", withBuiltins),
    'Cannot apply "sin" to "tau() / 4": "tau() / 4" is a plain number, but "sin" takes an angle; write "sin(tau() / 4 radian)".',
  );
  assert.equal(
    textMessage("sin(1 m)", withBuiltins),
    'Cannot apply "sin" to "1 m": "1 m" has dimension m, but "sin" takes an angle.',
  );
  assert.equal(
    textMessage("pow(2 m, 2)", withBuiltins),
    'Cannot apply "pow" to "2 m": the base must be a plain number; for a power of a quantity, write "(2 m)^2".',
  );
  assert.equal(
    textMessage("hypot(3 m, 4 s)", withBuiltins),
    'Cannot apply "hypot" to "3 m" and "4 s": "3 m" has dimension m, but "4 s" has dimension s.',
  );
  // A body whose rule fails does so for every argument, and cannot build;
  // the body form is worded all the same, from an error built by hand.
  const call = { start: 0, end: 6 };
  const bodyForm = (error: EvaluateError) =>
    describeTextError(
      { kind: "callFailed", name: "f", span: call, error },
      "f(1 m)",
      withBuiltins.primitives,
    );
  assert.equal(
    bodyForm({
      kind: "builtinArgument",
      name: "hypot",
      span: call,
      arguments: [call, call],
      error: {
        kind: "nonconformingArguments",
        left: 0,
        right: 1,
        mismatch: {
          kind: "dimensionMismatch",
          have: new Map(),
          want: new Map(),
        },
      },
    }),
    'Cannot compute "f(1 m)": the definition of "f" passes "hypot" arguments that do not conform.',
  );
  assert.equal(
    bodyForm({
      kind: "builtinArgument",
      name: "sin",
      span: call,
      arguments: [call],
      error: {
        kind: "argumentDimension",
        argument: 0,
        want: new Map([["radian", ONE]]),
        mismatch: {
          kind: "kindMismatch",
          have: new Map(),
          want: new Map(),
          kinds: ["radian"],
        },
      },
    }),
    'Cannot compute "f(1 m)": the definition of "f" passes "sin" an argument that is not an angle.',
  );
  assert.equal(
    bodyForm({
      kind: "builtinArgument",
      name: "sin",
      span: call,
      arguments: [call],
      error: { kind: "noAngles" },
    }),
    'Cannot compute "f(1 m)": the definition of "f" passes "sin" an angle in units that declare none.',
  );
  assert.equal(
    bodyForm({
      kind: "arityMismatch",
      name: "exp",
      span: call,
      expected: { min: 1, max: 1 },
      given: 2,
    }),
    'Cannot compute "f(1 m)": the definition of "f" gives "exp" 2 arguments, where it takes 1 argument.',
  );
});

test("a built-in's domain error quotes the argument and says the domain", () => {
  assert.equal(
    textMessage("ln(-1)", withBuiltins),
    'Cannot compute "ln(-1)": "-1" is not positive, and a logarithm is defined only for positive values.',
  );
  assert.equal(
    textMessage("log(0, 8)", withBuiltins),
    'Cannot compute "log(0, 8)": the base "0" is one, and no logarithm has base one.',
  );
  assert.equal(
    textMessage("asin(-2)", withBuiltins),
    'Cannot compute "asin(-2)": "-2" lies outside [-1, 1], where "asin" is defined.',
  );
  assert.equal(
    textMessage("acosh(0)", withBuiltins),
    'Cannot compute "acosh(0)": "0" is less than 1, and "acosh" is defined only from 1 up.',
  );
  assert.equal(
    textMessage("atanh(-1)", withBuiltins),
    'Cannot compute "atanh(-1)": "-1" is not strictly between -1 and 1, where "atanh" is defined.',
  );
  assert.equal(
    textMessage("atan2(0, 0)", withBuiltins),
    'Cannot compute "atan2(0, 0)": both arguments are zero, and the origin has no direction.',
  );
  assert.equal(
    textMessage("pow(-2, 3)", withBuiltins),
    'Cannot compute "pow(-2, 3)": "-2" is not positive, and a power with an inexact exponent is defined only for a positive base.',
  );
  assert.equal(
    textMessage("2 lnx(0)", withBuiltins),
    'Cannot compute "lnx(0)": the definition of "lnx" applies "ln" to a value that is not positive.',
  );
});

test("a value that straddles an edge names the edge", () => {
  assert.equal(
    textMessage("edge(1, 1 + 1)", withBuiltins),
    '"1 + 1" cannot be told from 1 at this precision, and the result depends on which side of 1 it lies.',
  );
  assert.equal(
    textMessage("tan(2)", withBuiltins),
    '"2" cannot be told from a pole of the tangent at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    textMessage("edgex(2)", withBuiltins),
    'Cannot compute "edgex(2)": the definition of "edgex" depends on a value that cannot be told from 1 at this precision.',
  );
});
