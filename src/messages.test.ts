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
import { BUILTINS } from "./core/builtins.ts";
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
import { ONE as ONE_FRACTION } from "./core/rational.ts";
import { err, ok } from "./core/result.ts";
import { ONE, ZERO, equals, negate, sign, type Scaled } from "./core/scaled.ts";
import { fr } from "./testing/scaled.ts";
import type { EvaluateError } from "./core/evaluate.ts";
import { convertText, evaluateText } from "./core/pipeline.ts";
import { DEFAULT_PRECISION } from "./core/rounding.ts";
import type { UnitTable } from "./core/table.ts";
import {
  describeAssumption,
  describeConversionError,
  describeTextError,
} from "./messages.ts";

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
      "recip(x) = 1 / x",
      "~recip(y) = 1 / y",
      "bad(x) = recip(x)",
      "~bad(y) = recip(y)",
      "square(x) = x^2",
      "~square(y) = y^(1/2)",
      "half(x) = x / 2",
      "K  !",
      "kelvin(x) = x K",
      "~kelvin(y) = y / K + 1",
      "lnx(x) = ln(x)",
      "~lnx(y) = -1",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** The system table with the app's own built-ins, for `approx`. */
const withApp: UnitTable = (() => {
  const parsed = parseDefinitions(
    readFileSync(new URL("./units.txt", import.meta.url), "utf8"),
  );
  assert.ok(parsed.ok, `expected the file to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT), BUILTINS);
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

/** A product of two coprime powers, each within the default range limit, past it together. */
const COPRIME_PRODUCT = "3^30000 * 7^20000";

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
    textMessage(`${"9".repeat(320000)} m`),
    `"${"9".repeat(320000)}": this number is too large to represent.`,
  );
  // A `^` exponent is a fraction, which must be formed, and must not
  // divide by zero.
  assert.equal(
    textMessage("m^1e999999"),
    '"1e999999": this number is too large to represent.',
  );
  assert.equal(textMessage("m^(1/0)"), '"1/0": the exponent divides by zero.');
  // A literal of any exponent is a value; the sum that cannot align it
  // is what is too large, at the sum, within the range limit.
  assert.equal(
    textMessage("1e999999999 + 1"),
    '"1e999999999 + 1" is too large to compute within Most bits.',
  );
  assert.equal(
    textMessage("1e999999999 m - 1 m"),
    '"1e999999999 m - 1 m" is too large to compute within Most bits.',
  );
  // A literal past the exponent bound is rejected where it is written,
  // with the side it is past.
  assert.equal(
    textMessage("1e1000000000000000001 m"),
    '"1e1000000000000000001": this number\'s exponent passes 10^18.',
  );
  assert.equal(
    textMessage("2 * 0.01e-999999999999999999"),
    '"0.01e-999999999999999999": this number\'s exponent falls below -10^18.',
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
  assert.equal(
    textMessage("2^99999 m"),
    '"2^99999" is too large to compute within Most bits.',
  );
  // A built-in that refuses an argument it cannot reduce fails at the call.
  assert.equal(
    textMessage("sin(1e999999999 radian)"),
    '"sin(1e999999999 radian)" is too large to compute within Most bits.',
  );
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

test("a value too large to compute names the limit it passes, and one too small says so", () => {
  // The range limit is the setting, Most bits; the exponent bound is not,
  // and a value past it below is too small rather than too large.
  assert.equal(
    textMessage("3^1000000000"),
    '"3^1000000000" is too large to compute within Most bits.',
  );
  // An exact result formed and measured past Most bits names the node
  // and the remedy (the plan's D20), and the remedy works; a power's
  // prediction, above, keeps the plain wording.
  assert.equal(
    textMessage("3^32767 * 7^21845", withApp),
    '"3^32767 * 7^21845" is too large to hold exactly within Most bits: write "approx(3^32767)" in place of "3^32767" to compute it to the digits asked, or raise Most bits.',
  );
  assert.equal(
    textMessage(`${COPRIME_PRODUCT} * 11^16000`, withApp),
    `"${COPRIME_PRODUCT}" is too large to hold exactly within Most bits: write "approx(3^30000)" in place of "3^30000" to compute it to the digits asked, or raise Most bits.`,
  );
  assert.equal(
    textMessage("2^-30000", withApp),
    '"2^-30000" is too large to hold exactly within Most bits: write "approx(2)" in place of "2" to compute it to the digits asked, or raise Most bits.',
  );
  assert.ok(evaluateText(withApp, "approx(3^32767) * 7^21845", CONTEXT).ok);
  assert.ok(evaluateText(withApp, "approx(2)^-30000", CONTEXT).ok);
  // The conversion's ratio, about the pair, with `approx` on the have.
  assert.equal(
    conversionMessage("3^25000/7^14000 m", "11^15000/13^14000 ft"),
    '"3^25000/7^14000 m" into "11^15000/13^14000 ft" is too large to hold exactly within Most bits: write "approx(3^25000/7^14000 m)" to compute it to the digits asked, or raise Most bits.',
  );
  assert.ok(
    convertText(
      withApp,
      "approx(3^25000/7^14000 m)",
      "11^15000/13^14000 ft",
      CONTEXT,
    ).ok,
  );
  assert.equal(
    textMessage("exp(1e999)"),
    '"exp(1e999)" is too large to compute: its exponent would pass 10^18.',
  );
  assert.equal(
    textMessage("exp(-1e999)"),
    '"exp(-1e999)" is too small to compute: its exponent would fall below -10^18.',
  );
  assert.equal(
    textMessage("10^1e999"),
    '"10^1e999" is too large to compute: its exponent would pass 10^18.',
  );
  // A power the range limit refuses is reported at the bound when the
  // bound would refuse it too, since no setting could compute it.
  assert.equal(
    textMessage("7^10000000000000000000"),
    '"7^10000000000000000000" is too large to compute: its exponent would pass 10^18.',
  );
  assert.equal(
    textMessage("m / 1e999999999999999999 / 1e999999999999999999"),
    '"m / 1e999999999999999999 / 1e999999999999999999" is too small to compute: its exponent would fall below -10^18.',
  );
});

test("a ratio beyond the exponent bound quotes both texts", () => {
  assert.equal(
    conversionMessage("1e999999999999999999 m", " 1e-999999999999999999 m "),
    '"1e999999999999999999 m" into "1e-999999999999999999 m" is too large to compute: its exponent would pass 10^18.',
  );
  assert.equal(
    conversionMessage("1e-999999999999999999 m", "1e999999999999999999 m"),
    '"1e-999999999999999999 m" into "1e999999999999999999 m" is too small to compute: its exponent would fall below -10^18.',
  );
});

test("a result that straddles the exponent bound names the edge, in an expression and in a conversion", () => {
  assert.equal(
    textMessage("5e1000000000000000000 * (approx(1e5000) - approx(1e5000))"),
    '"5e1000000000000000000 * (approx(1e5000) - approx(1e5000))" cannot be told from the point where the result passes the exponent bound at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    conversionMessage("approx(1e1000000000000000000) m", "dm"),
    '"approx(1e1000000000000000000) m" into "dm" cannot be told from the point where the result passes the exponent bound at this precision.',
  );
});

test("a list refused by its arithmetic names the pair and the limit", () => {
  assert.equal(
    conversionMessage("3^32767 m", "ft/7^21845; in/7^21845"),
    '"3^32767 m" into "ft/7^21845; in/7^21845" is too large to compute within Most bits.',
  );
  assert.equal(
    conversionMessage(
      "1e999999999999999999 m",
      "1e-999999999999999998 m; 1e-999999999999999999 m",
    ),
    '"1e999999999999999999 m" into "1e-999999999999999998 m; 1e-999999999999999999 m" is too large to compute: its exponent would pass 10^18.',
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
  // A value too large or too small names the limit, as a sentence of its
  // own does.
  assert.equal(
    textMessage("square(3^30000)", failing),
    'Cannot compute "square(3^30000)": the definition of "square" computes a value too large to form within Most bits.',
  );
  assert.equal(
    textMessage("square(1e999999999999999999)", failing),
    'Cannot compute "square(1e999999999999999999)": the definition of "square" computes a value whose exponent would pass 10^18.',
  );
  assert.equal(
    textMessage("recip(5e1000000000000000000)", failing),
    'Cannot compute "recip(5e1000000000000000000)": the definition of "recip" computes a value whose exponent would fall below -10^18.',
  );
});

/** The system table with a function of two parameters and one of none. */
const withSeveral: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      readFileSync(new URL("./units.txt", import.meta.url), "utf8"),
      "kinetic(mass: kg, v: m/s) = mass v^2 / 2",
      "twopi() = 2 pi()",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

test("a function of several parameters names the one an argument does not fit, and its count", () => {
  assert.equal(
    textMessage("kinetic(2 kg, 3 s)", withSeveral),
    'Cannot apply "kinetic" to "3 s": "3 s" has dimension s, but the parameter "v" of "kinetic" has dimension m / s.',
  );
  assert.equal(
    textMessage("kinetic(2 kg)", withSeveral),
    '"kinetic" takes 2 arguments, but "kinetic(2 kg)" gives 1 argument.',
  );
  assert.equal(
    textMessage("2 kinetic", withSeveral),
    '"kinetic" is a function, not a unit. To apply it to values, write "kinetic(value, value)".',
  );
  assert.equal(
    textMessage("2 twopi", withSeveral),
    '"twopi" is a function, not a unit. To call it, write "twopi()".',
  );
});

test("a function without an inverse, or with a wrong one, is worded on the want side", () => {
  assert.equal(
    conversionMessage("3", "half", failing),
    '"half" has no inverse, so it cannot be the unit to convert to. Define "~half(y) = …" to give it one.',
  );
  assert.equal(
    conversionMessage("4 K", "kelvin", failing),
    'The inverse of "kelvin" is wrong for "4 K": "kelvin" of the argument it gives is not "4 K".',
  );
  assert.equal(
    conversionMessage("2", "lnx", failing),
    'Cannot check the inverse of "lnx" for "2": at the argument it gives, the definition of "lnx" applies "ln" to a value that is not positive.',
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
    // Unresolved on the second argument, at an edge of one for a value of
    // two, of minus one for three, of zero for four; and at a pole below.
    name: "edge",
    arity: { min: 2, max: 2 },
    dimensions: plainNumbers(2),
    apply: ([, b]): ReturnType<Builtin["apply"]> => {
      const edge = EDGES.find(([at]) => equals(b!.mid, at))?.[1];
      return edge === undefined
        ? ok(b as Ball)
        : err({ kind: "unresolved", argument: 1, edge });
    },
  },
  {
    name: "tan",
    arity: { min: 1, max: 1 },
    dimensions: plainNumbers(1),
    apply: ([x]): ReturnType<Builtin["apply"]> =>
      equals(x!.mid, fr(2n))
        ? err({ kind: "unresolved", argument: 0, edge: "pole" })
        : ok(x as Ball),
  },
];

/** The edge the `edge` stand-in reports for each value of its second argument. */
const EDGES: readonly (readonly [Scaled, Scaled])[] = [
  [fr(2n), ONE],
  [fr(3n), negate(ONE)],
  [fr(4n), ZERO],
];

const STAND_INS: Builtins = new Map(STAND_IN_LIST.map((fn) => [fn.name, fn]));

/** The system table built against the stand-ins, with a few definitions that call them. */
const withBuiltins: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      readFileSync(new URL("./units.txt", import.meta.url), "utf8"),
      "lnx(x) = ln(x)",
      "edgex(x) = edge(1, x)",
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
        want: new Map([["radian", ONE_FRACTION]]),
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
    textMessage("edge(1, 3)", withBuiltins),
    '"3" cannot be told from -1 at this precision, and the result depends on which side of -1 it lies.',
  );
  assert.equal(
    textMessage("edge(1, 4)", withBuiltins),
    '"4" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
  );
  assert.equal(
    textMessage("tan(2)", withBuiltins),
    '"2" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    textMessage("edgex(2)", withBuiltins),
    'Cannot compute "edgex(2)": the definition of "edgex" depends on a value that cannot be told from 1 at this precision.',
  );
});

/** A table of functions with conditions, for the messages about them. */
const conditional: UnitTable = (() => {
  const parsed = parseDefinitions(
    [
      "K  !",
      "m  !",
      "logit(p) | 0 < p < 1 = ln(p / (1 - p))",
      "span(a, b, x) | a < b, a <= x <= b = (x - a) / (b - a)",
      "outer(x) = logit(x)",
      "pole(x) | x >= 1 = 1 / (x - 1)",
      "via(x) = pole(x)",
      "lin(x) = x m",
      "~lin(y) | y > 0 m = y / m",
    ].join("\n"),
  );
  assert.ok(parsed.ok, `expected the text to parse, got ${inspect(parsed)}`);
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, `expected a table, got ${inspect(built)}`);
  return built.value;
})();

test("a condition that fails names it and the arguments it mentions, quoted from the call", () => {
  assert.equal(
    textMessage("logit(1.5)", conditional),
    'Cannot compute "logit(1.5)": "logit" requires "0 < p < 1", and p is "1.5".',
  );
  assert.equal(
    textMessage("span(0, 1, 2 + 1)", conditional),
    'Cannot compute "span(0, 1, 2 + 1)": "span" requires "a <= x <= b", and a is "0", b is "1" and x is "2 + 1".',
  );
  // Within a definition, by what the definition does.
  assert.equal(
    textMessage("outer(2)", conditional),
    'Cannot compute "outer(2)": the definition of "outer" calls "logit" outside its condition "0 < p < 1".',
  );
});

test("a body that fails under an assumed condition names the assumption", () => {
  assert.equal(
    textMessage("via(approx(1))", conditional),
    'Cannot compute "via(approx(1))": the definition of "via" calls "pole", which could not tell whether the argument of "pole" meets "x >= 1", and whose definition, assuming so, depends on a value that cannot be told from zero at this precision.',
  );
  const error: EvaluateError = {
    kind: "undecidedCondition",
    name: "tempC",
    span: { start: 0, end: 22 },
    assumption: {
      name: "tempC",
      of: "function",
      condition: "x >= -273.15",
      parameters: 1,
    },
  };
  assert.equal(
    describeTextError(error, "tempC(approx(-273.15))", table.primitives),
    'Cannot compute "tempC(approx(-273.15))": could not tell whether the argument of "tempC" meets "x >= -273.15".',
  );
});

test("a want's conditions are worded for the have or for the argument it would need", () => {
  assert.equal(
    conversionMessage("-1 m", "lin", conditional),
    'Cannot convert "-1 m" into "lin": the inverse of "lin" requires "y > 0 m", which "-1 m" does not meet.',
  );
  assert.equal(
    conversionMessage("-5 K", "tempC"),
    'Cannot convert "-5 K" into "tempC": the argument it would take does not meet "x >= -273.15", which "tempC" requires.',
  );
});

test("an assumed condition's warning says what is assumed, of an argument, of arguments, or of an inverse's value", () => {
  assert.equal(
    describeAssumption({
      name: "tempC",
      of: "function",
      condition: "x >= -273.15",
      parameters: 1,
    }),
    'Could not tell whether the argument of "tempC" meets "x >= -273.15"; the value assumes it does.',
  );
  assert.equal(
    describeAssumption({
      name: "span",
      of: "function",
      condition: "a < b",
      parameters: 3,
    }),
    'Could not tell whether the arguments of "span" meet "a < b"; the value assumes they do.',
  );
  assert.equal(
    describeAssumption({
      name: "lin",
      of: "inverse",
      condition: "y > 0 m",
      parameters: 1,
    }),
    'Could not tell whether the value given to the inverse of "lin" meets "y > 0 m"; the value assumes it does.',
  );
});
