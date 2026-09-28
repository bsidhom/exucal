import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { UNBOUNDED } from "./radius.ts";
import { containsZero, exact, isExact, multiplyBalls } from "./ball.ts";
import {
  angle,
  checkArgument,
  plainNumbers,
  type Builtin,
} from "./builtins.ts";
import {
  DIMENSIONLESS,
  checkConformance,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import {
  applyFunction,
  evaluate,
  invertFunction,
  type EvaluateError,
  type Lookup,
} from "./evaluate.ts";
import { parseExpr, type Expr } from "./expr.ts";
import { type Quantity } from "./quantity.ts";
import {
  DEFAULT_PRECISION,
  ONE,
  ZERO,
  absolute,
  compare,
  format,
  parseDecimal,
  rational,
  subtract,
  type Rational,
} from "./rational.ts";
import { radiusUpper } from "./radius.ts";
import type { Result } from "./result.ts";
import { type Span } from "./span.ts";
import { type UnitFunction } from "./table.ts";
import { err, ok } from "./result.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };
}

/** Builds a dimension from integer exponents (or rationals, for roots). */
function dim(exponents: Record<string, number | Rational>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [
      name,
      typeof e === "number" ? rational(BigInt(e)) : e,
    ]),
  );
}

/** A quantity with the magnitude the decimal `text` denotes, exactly. */
function quantity(
  text: string,
  exponents: Record<string, number | Rational> = {},
): Quantity {
  const magnitude = parseDecimal(text);
  assert.ok(magnitude.ok, `${JSON.stringify(text)} is not a number`);
  return { magnitude: exact(magnitude.value), dimension: dim(exponents) };
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(
    result.ok,
    `expected ${JSON.stringify(text)} to parse, got ${inspect(result)}`,
  );
  return result.value;
}

/** What the lookup over a plain record of units fails with. */
type UnknownUnit = {
  readonly kind: "unknownUnit";
  readonly name: string;
  readonly span: Span;
};

/** What the lookup fails with for a call of a name that is not a function. */
type UnknownFunction = {
  readonly kind: "unknownFunction";
  readonly name: string;
  readonly span: Span;
  readonly call: Span;
};

/** A lookup over the units and functions given, as the table's would be. */
function lookupIn(
  units: Record<string, Quantity>,
  functions: Record<string, UnitFunction> = {},
  builtins: Record<string, Builtin> = {},
): Lookup<UnknownUnit | UnknownFunction> {
  return {
    unit: (name, span) => {
      const unit = Object.hasOwn(units, name) ? units[name] : undefined;
      return unit === undefined
        ? { ok: false, error: { kind: "unknownUnit", name, span } }
        : { ok: true, value: unit };
    },
    function: (name, span, call) => {
      const fn = Object.hasOwn(functions, name) ? functions[name] : undefined;
      if (fn !== undefined) return { ok: true, value: { kind: "defined", fn } };
      const builtin = Object.hasOwn(builtins, name)
        ? builtins[name]
        : undefined;
      return builtin === undefined
        ? { ok: false, error: { kind: "unknownFunction", name, span, call } }
        : { ok: true, value: { kind: "builtin", fn: builtin } };
    },
  };
}

/** Some units, as the table would hold them: SI magnitudes over `m`, `s`... */
const UNITS: Record<string, Quantity> = {
  m: quantity("1", { m: 1 }),
  cm: quantity("0.01", { m: 1 }),
  ft: quantity("0.3048", { m: 1 }),
  inch: quantity("0.0254", { m: 1 }),
  kg: quantity("1", { kg: 1 }),
  s: quantity("1", { s: 1 }),
  h: quantity("3600", { s: 1 }),
  radian: quantity("1", { radian: 1 }),
  N: quantity("1", { kg: 1, m: 1, s: -2 }),
  K: quantity("1", { K: 1 }),
  zero: quantity("0", { m: 1 }),
  neg: quantity("-4", { m: 2 }),
  neg8: quantity("-8", { m: 3 }),
};

/**
 * A function as the table would hold it, with its bodies parsed from
 * `forward` and `inverse`, so that the spans of a body's errors are into
 * those texts.
 */
function fn(
  name: string,
  parameter: string,
  argument: Quantity,
  result: Quantity,
  forward: string,
  inverse: string,
): UnitFunction {
  return {
    name,
    parameter,
    argument: { text: "argument", quantity: argument },
    result: { text: "result", quantity: result },
    forward: parsed(forward),
    inverse: parsed(inverse),
  };
}

/** Some functions over the units above. */
const FUNCTIONS: Record<string, UnitFunction> = {
  tempC: fn(
    "tempC",
    "x",
    quantity("1"),
    UNITS.K,
    "x K + 273.15 K",
    "tempC / K - 273.15",
  ),
  double: fn("double", "x", UNITS.m, UNITS.m, "2 x", "double / 2"),
  recip: fn("recip", "x", quantity("1"), quantity("1"), "1 / x", "1 / recip"),
  twice: fn(
    "twice",
    "x",
    quantity("1"),
    UNITS.K,
    "tempC(2 x)",
    "(twice / K - 273.15) / 2",
  ),
  // A parameter named like a unit: the binding wins inside the body.
  shadow: fn("shadow", "m", quantity("1"), quantity("1"), "2 m", "shadow / 2"),
  // Bodies that fail: for a lookup, and through another function.
  broken: fn("broken", "x", quantity("1"), quantity("1"), "x bogus", "broken"),
  bad: fn("bad", "x", quantity("1"), quantity("1"), "recip(x)", "recip(bad)"),
};

const lookup = lookupIn(UNITS, FUNCTIONS);

/** The primitives the units above are over, with the radian as a kind. */
const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  ["kg", "dimension"],
  ["s", "dimension"],
  ["K", "dimension"],
  ["radian", "kind"],
]);

type Failure = EvaluateError | UnknownUnit | UnknownFunction;

/** Evaluates `text` with the units above at the working precision given. */
function run(text: string, precision = CONTEXT): Result<Quantity, Failure> {
  return evaluate(parsed(text), lookup, PRIMITIVES, precision);
}

function value(result: Result<Quantity, Failure>): Quantity {
  assert.ok(result.ok, `expected a value, got ${inspect(result)}`);
  return result.value;
}

function failure(result: Result<Quantity, Failure>): Failure {
  assert.ok(!result.ok, `expected a failure, got ${inspect(result)}`);
  return result.error;
}

/** Asserts that `text` evaluates to exactly `expected`, dimension included. */
function assertEvaluates(text: string, expected: Quantity): void {
  const actual = value(run(text));
  assert.deepEqual(actual.magnitude, expected.magnitude, text);
  assert.deepEqual(actual.dimension, expected.dimension, JSON.stringify(text));
}

const half = rational(1n, 2n);

// ---------------------------------------------------------------------------
// Leaves

test("a number is a dimensionless quantity", () => {
  assertEvaluates("2", quantity("2"));
  assertEvaluates("2.54", quantity("2.54"));
  assertEvaluates("1e-3", {
    magnitude: exact(rational(1n, 1000n)),
    dimension: DIMENSIONLESS,
  });
  assertEvaluates("0", quantity("0"));
});

test("a unit is whatever the lookup says it is", () => {
  assertEvaluates("m", UNITS.m);
  assertEvaluates("ft", UNITS.ft);
  assertEvaluates("N", UNITS.N);
  // The lookup's value is taken as is, not copied or inspected.
  assert.equal(value(run("N")), UNITS.N);
});

test("the lookup is given the name and the span of the reference", () => {
  const seen: [string, Span][] = [];
  const spy: Lookup<never> = {
    unit: (name, span) => {
      seen.push([name, span]);
      return { ok: true, value: UNITS.m };
    },
    function: () => {
      throw new Error("no call here");
    },
  };
  evaluate(parsed("  kg m / s^2"), spy, PRIMITIVES, CONTEXT);
  assert.deepEqual(seen, [
    ["kg", { start: 2, end: 4 }],
    ["m", { start: 5, end: 6 }],
    ["s", { start: 9, end: 10 }],
  ]);
});

test("the lookup is given a call's name with its span, and the span of the call", () => {
  const seen: [string, Span, Span][] = [];
  const spy: Lookup<never> = {
    unit: () => ({ ok: true, value: UNITS.m }),
    function: (name, span, call) => {
      seen.push([name, span, call]);
      return { ok: true, value: { kind: "defined", fn: FUNCTIONS.double } };
    },
  };
  evaluate(parsed(" 2 double( m )"), spy, PRIMITIVES, CONTEXT);
  assert.deepEqual(seen, [
    ["double", { start: 3, end: 9 }, { start: 3, end: 14 }],
  ]);
});

// ---------------------------------------------------------------------------
// Operators

test("juxtaposition and * multiply", () => {
  assertEvaluates("2 m", quantity("2", { m: 1 }));
  assertEvaluates("2 * m", quantity("2", { m: 1 }));
  assertEvaluates("3 ft", quantity("0.9144", { m: 1 }));
  assertEvaluates("kg m", quantity("1", { kg: 1, m: 1 }));
  assertEvaluates("2 * 3 * 4", quantity("24"));
  assertEvaluates("m m", quantity("1", { m: 2 }));
});

test("/ divides", () => {
  assertEvaluates("m / s", quantity("1", { m: 1, s: -1 }));
  assertEvaluates("1 / s", quantity("1", { s: -1 }));
  assertEvaluates("6 / 3", quantity("2"));
  assertEvaluates("cm / m", quantity("0.01"));
  assertEvaluates("m / cm", quantity("100"));
  assertEvaluates("kg m / s / s", UNITS.N);
});

test("+ and - add and subtract quantities of one dimension", () => {
  assertEvaluates("2 + 3", quantity("5"));
  assertEvaluates("5 - 3", quantity("2"));
  assertEvaluates("2 m + 3 m", quantity("5", { m: 1 }));
  assertEvaluates("ft + inch", quantity("0.3302", { m: 1 }));
  assertEvaluates("ft - inch", quantity("0.2794", { m: 1 }));
  assertEvaluates("h + s", quantity("3601", { s: 1 }));
  assertEvaluates("2 N - kg m / s^2", UNITS.N);
  assertEvaluates("radian + radian", quantity("2", { radian: 1 }));
  assertEvaluates("m + m - m + m", quantity("2", { m: 1 }));
});

test("a difference may be zero or negative", () => {
  assertEvaluates("m - m", quantity("0", { m: 1 }));
  assertEvaluates("3 - 5", quantity("-2"));
  assertEvaluates("inch - ft", quantity("-0.2794", { m: 1 }));
  assertEvaluates("(0 m^3 - 8 m^3)^(1/3)", quantity("-2", { m: 1 }));
  assertEvaluates("(m - m) / s", quantity("0", { m: 1, s: -1 }));
});

test("a leading - negates the magnitude and keeps the dimension", () => {
  assertEvaluates("-2", quantity("-2"));
  assertEvaluates("-2 m", quantity("-2", { m: 1 }));
  assertEvaluates("-ft", quantity("-0.3048", { m: 1 }));
  assertEvaluates("-kg m / s^2", quantity("-1", { kg: 1, m: 1, s: -2 }));
  assertEvaluates("-(ft + inch)", quantity("-0.3302", { m: 1 }));
  assertEvaluates("-neg", quantity("4", { m: 2 }));
  assertEvaluates("-zero", quantity("0", { m: 1 }));
  assertEvaluates("-(-2 m)", quantity("2", { m: 1 }));
  assertEvaluates("-radian", quantity("-1", { radian: 1 }));
});

test("negation follows the tree: below ^ and juxtaposition, above * and /", () => {
  assertEvaluates("-2^2", quantity("-4"));
  assertEvaluates("(-2)^2", quantity("4"));
  assertEvaluates("2 * -3", quantity("-6"));
  assertEvaluates("2 - -3", quantity("5"));
  assertEvaluates("-2 m * -3", quantity("6", { m: 1 }));
  assertEvaluates("m / -2 s", {
    magnitude: exact(rational(-1n, 2n)),
    dimension: dim({ m: 1, s: -1 }),
  });
  assertEvaluates("-8^(1/3)", quantity("-2"));
  // `neg` is -4 m^2: the root comes first, so it is the root of a negative.
  assertEvaluates("(-neg)^(1/2)", quantity("2", { m: 1 }));
  assert.deepEqual(failure(run("-neg^(1/2)")), {
    kind: "negativeRadicand",
    degree: 2n,
    span: { start: 1, end: 10 },
  });
});

test("evaluation follows the tree the parser built", () => {
  // Juxtaposition binds tighter than `/`: 1 / (2 m).
  assertEvaluates("1/2 m", {
    magnitude: exact(half),
    dimension: dim({ m: -1 }),
  });
  assertEvaluates("(1/2) m", {
    magnitude: exact(half),
    dimension: dim({ m: 1 }),
  });
  // `*` and `/` are one left-associative level: (m / s) * s.
  assertEvaluates("m/s*s", UNITS.m);
  assertEvaluates("m/(s*s)", quantity("1", { m: 1, s: -2 }));
  // Exponents bind tightest: kg (m / (s^2)) is a newton.
  assertEvaluates("kg m / s^2", UNITS.N);
  assertEvaluates("2 m^2", quantity("2", { m: 2 }));
  assertEvaluates("(2 m)^2", quantity("4", { m: 2 }));
  // `+` and `-` bind loosest: (2 m * 3) + (m / 2), and 1 / (2 m) is not a
  // length.
  assertEvaluates("2 m * 3 + m / 2", quantity("6.5", { m: 1 }));
  assertEvaluates("(m + m) m", quantity("2", { m: 2 }));
  assertEvaluates("(2 m - m)^2", quantity("1", { m: 2 }));
  assert.equal(failure(run("1 m + 1/2 m")).kind, "nonconformingOperands");
  assert.equal(failure(run("m - 1 / s^-1")).kind, "nonconformingOperands");
});

test("an integer power is exact", () => {
  assertEvaluates("m^2", quantity("1", { m: 2 }));
  assertEvaluates("s^-1", quantity("1", { s: -1 }));
  assertEvaluates("ft^2", quantity("0.09290304", { m: 2 }));
  assertEvaluates("2^10", quantity("1024"));
  assertEvaluates("2^-2", {
    magnitude: exact(rational(1n, 4n)),
    dimension: DIMENSIONLESS,
  });
  assertEvaluates("m^0", quantity("1"));
});

test("a rational power that is exact stays exact", () => {
  assertEvaluates("(4 m^2)^(1/2)", quantity("2", { m: 1 }));
  assertEvaluates("(4 m^2)^0.5", quantity("2", { m: 1 }));
  assertEvaluates("(8 m^3)^(1/3)", quantity("2", { m: 1 }));
  assertEvaluates("(8 m^3)^(2/3)", quantity("4", { m: 2 }));
  assertEvaluates("m^(1/2)", quantity("1", { m: half }));
  assertEvaluates("(m^(1/2))^2", UNITS.m);
});

test("an inexact root is computed at the precision given", () => {
  const root5 = value(run("(2 m^2)^(1/2)", at(5)));
  // Five digits plus the kernel's guard: a radius below 10^-13.
  assert.equal(
    format(root5.magnitude.mid, 10, "halfAwayFromZero"),
    "1.414213562",
  );
  assert.deepEqual(root5.dimension, dim({ m: 1 }));
  assert.ok(!isExact(root5.magnitude));
  assert.ok(
    compare(radiusUpper(root5.magnitude.rad), rational(1n, 10n ** 13n)) < 0,
  );
  const root40 = value(run("(2 m^2)^(1/2)"));
  assert.equal(
    format(root40.magnitude.mid, 40, "halfAwayFromZero"),
    "1.41421356237309504880168872420969807857",
  );
  // The precision reaches a root anywhere in the tree: 3 / sqrt 2 at three
  // digits is within its radius of the reference, and that radius is the
  // kernel's, below 10^-11, not one unit in the third digit.
  const nested = value(run("3 / (2^(1/2) s)", at(3)));
  assert.deepEqual(nested.dimension, dim({ s: -1 }));
  const reference = parseDecimal("2.1213203435596425732025330863145471178545");
  assert.ok(reference.ok);
  const rad = radiusUpper(nested.magnitude.rad);
  assert.ok(
    compare(absolute(subtract(nested.magnitude.mid, reference.value)), rad) <=
      0,
  );
  assert.ok(compare(rad, rational(1n, 10n ** 11n)) < 0);
  // The radius reaches the result: the quotient is not exact.
  assert.ok(!isExact(nested.magnitude));
});

test("exact operations never round", () => {
  // 1 m in feet is 1250/381, which no decimal writes.
  assertEvaluates("m / ft", {
    magnitude: exact(rational(1250n, 381n)),
    dimension: DIMENSIONLESS,
  });
  // A long exact product stays exact.
  const big = value(run("1e30 m * 1e30 m / 3"));
  assert.deepEqual(big.magnitude, exact(rational(10n ** 60n, 3n)));
});

test("exponents that cancel are dropped", () => {
  assert.deepEqual(value(run("m / m")).dimension, DIMENSIONLESS);
  assert.deepEqual(value(run("m^2 / m")).dimension, dim({ m: 1 }));
  assert.deepEqual(value(run("N s^2 / kg")).dimension, dim({ m: 1 }));
  assert.deepEqual(value(run("s^-1 s")).dimension, DIMENSIONLESS);
});

test("kinds ride along in the dimension", () => {
  assertEvaluates("radian / s", quantity("1", { radian: 1, s: -1 }));
  assertEvaluates(
    "N m / radian",
    quantity("1", { kg: 1, m: 2, s: -2, radian: -1 }),
  );
  assertEvaluates("radian / radian", quantity("1"));
});

test("a zero magnitude is an ordinary value except as a divisor", () => {
  assertEvaluates("0 m", quantity("0", { m: 1 }));
  assertEvaluates("zero / s", quantity("0", { m: 1, s: -1 }));
  assertEvaluates("zero^2", quantity("0", { m: 2 }));
  assertEvaluates("zero^(1/2)", quantity("0", { m: half }));
  assertEvaluates("0^0", quantity("1"));
});

test("a value that cannot be told from zero is unresolved, at the divisor or the base", () => {
  // sqrt(2)^2 - 2 is a ball around zero: its midpoint is within a hair of
  // zero and its radius covers zero, so nothing can be divided by it, and
  // neither a negative power nor an even root of it has a value.
  const text = "1 / ((2^(1/2))^2 - 2)";
  assert.deepEqual(failure(run(text)), {
    kind: "unresolved",
    span: { start: 4, end: text.length },
    edge: ZERO,
  });
  const base = "((2^(1/2))^2 - 2)";
  assert.deepEqual(failure(run(`${base}^-1`)), {
    kind: "unresolved",
    span: { start: 0, end: base.length },
    edge: ZERO,
  });
  assert.deepEqual(failure(run(`${base}^(1/2)`)), {
    kind: "unresolved",
    span: { start: 0, end: base.length },
    edge: ZERO,
  });
  // An odd root of it is a ball around zero.
  const cube = value(run(`${base}^(1/3)`));
  assert.ok(containsZero(cube.magnitude));
  assert.ok(!isExact(cube.magnitude));
  // Whereas the value itself evaluates, inexactly, and so does its product.
  const almostZero = value(run("(2^(1/2))^2 - 2"));
  assert.ok(!isExact(almostZero.magnitude));
  assert.ok(containsZero(almostZero.magnitude));
  assert.ok(value(run("((2^(1/2))^2 - 2) m")).dimension.has("m"));
});

// ---------------------------------------------------------------------------
// Failures

test("a lookup failure comes back unchanged", () => {
  assert.deepEqual(failure(run("bogus")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 0, end: 5 },
  });
  assert.deepEqual(failure(run("2 m / bogus^2")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 6, end: 11 },
  });
  // Whatever the lookup's error type is.
  const failing: Lookup<string> = {
    unit: (name) => ({ ok: false, error: `no ${name}` }),
    function: (name) => ({ ok: false, error: `no function ${name}` }),
  };
  assert.deepEqual(evaluate(parsed("2 m"), failing, PRIMITIVES, CONTEXT), {
    ok: false,
    error: "no m",
  });
  assert.deepEqual(evaluate(parsed("f(2)"), failing, PRIMITIVES, CONTEXT), {
    ok: false,
    error: "no function f",
  });
});

test("operands are evaluated left to right and the first failure wins", () => {
  assert.deepEqual(failure(run("bogus other")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 0, end: 5 },
  });
  assert.equal(failure(run("bogus / 0")).kind, "unknownUnit");
  assert.equal(failure(run("m / 0 / bogus")).kind, "divisionByZero");
  assert.equal(failure(run("(m / 0) bogus")).kind, "divisionByZero");
  assert.equal(failure(run("bogus (m / 0)")).kind, "unknownUnit");
  assert.equal(failure(run("bogus + s")).kind, "unknownUnit");
  assert.equal(failure(run("-bogus")).kind, "unknownUnit");
  assert.equal(failure(run("-(m / 0)")).kind, "divisionByZero");
  assert.equal(failure(run("m + bogus")).kind, "unknownUnit");
  assert.equal(failure(run("m + s + bogus")).kind, "nonconformingOperands");
  assert.equal(failure(run("m + s / 0")).kind, "divisionByZero");
});

test("a division by zero points at the divisor", () => {
  assert.deepEqual(failure(run("m / 0")), {
    kind: "divisionByZero",
    span: { start: 4, end: 5 },
  });
  assert.deepEqual(failure(run("1 / 0 s")), {
    kind: "divisionByZero",
    span: { start: 4, end: 7 },
  });
  assert.deepEqual(failure(run("kg m / zero")), {
    kind: "divisionByZero",
    span: { start: 7, end: 11 },
  });
  assert.deepEqual(failure(run("m / (2 zero)")), {
    kind: "divisionByZero",
    span: { start: 4, end: 12 },
  });
  assert.deepEqual(failure(run("0 / 0")), {
    kind: "divisionByZero",
    span: { start: 4, end: 5 },
  });
});

test("a power that fails points at the whole power", () => {
  assert.deepEqual(failure(run("zero^-1")), {
    kind: "divisionByZero",
    span: { start: 0, end: 7 },
  });
  assert.deepEqual(failure(run("m (0 s)^-2")), {
    kind: "divisionByZero",
    span: { start: 2, end: 10 },
  });
  assert.deepEqual(failure(run("neg^(1/2)")), {
    kind: "negativeRadicand",
    degree: 2n,
    span: { start: 0, end: 9 },
  });
  assert.deepEqual(failure(run("2 neg^0.25")), {
    kind: "negativeRadicand",
    degree: 4n,
    span: { start: 2, end: 10 },
  });
  assert.deepEqual(failure(run("10^100000")), {
    kind: "tooLarge",
    span: { start: 0, end: 9 },
  });
  assert.deepEqual(failure(run("m (10^100000)")), {
    kind: "tooLarge",
    span: { start: 2, end: 13 },
  });
  // An odd root of a negative magnitude is fine.
  assertEvaluates("neg8^(1/3)", quantity("-2", { m: 1 }));
});

test("a division by zero inside a power is the division's", () => {
  assert.deepEqual(failure(run("(m / 0)^2")), {
    kind: "divisionByZero",
    span: { start: 5, end: 6 },
  });
});

test("a sum of nonconforming operands points at the sum and both operands", () => {
  // A dimension mismatch, carrying both dimensions as a conversion would.
  assert.deepEqual(failure(run("2 m + 3 s")), {
    kind: "nonconformingOperands",
    op: "add",
    span: { start: 0, end: 9 },
    left: { start: 0, end: 3 },
    right: { start: 6, end: 9 },
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: dim({ s: 1 }),
    },
  });
  // A parenthesized sum spans its parentheses, as any parenthesized node does.
  assert.deepEqual(failure(run("kg (m - 2 s^2)")), {
    kind: "nonconformingOperands",
    op: "sub",
    span: { start: 3, end: 14 },
    left: { start: 4, end: 5 },
    right: { start: 8, end: 13 },
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: dim({ s: 2 }),
    },
  });
  // A kind mismatch: the same physical dimension, told apart by the roles.
  assert.deepEqual(failure(run("radian / s + 1 / s")), {
    kind: "nonconformingOperands",
    op: "add",
    span: { start: 0, end: 18 },
    left: { start: 0, end: 10 },
    right: { start: 13, end: 18 },
    mismatch: {
      kind: "kindMismatch",
      have: dim({ radian: 1, s: -1 }),
      want: dim({ s: -1 }),
      kinds: ["radian"],
    },
  });
  assert.equal(failure(run("radian - 1")).kind, "nonconformingOperands");
});

test("a plain number is not a quantity of anything, zero included", () => {
  assert.equal(failure(run("m + 0")).kind, "nonconformingOperands");
  assert.equal(failure(run("0 + zero")).kind, "nonconformingOperands");
  assert.equal(failure(run("2 - m")).kind, "nonconformingOperands");
  assertEvaluates("zero + 0 m", quantity("0", { m: 1 }));
});

test("the roles given decide what a mismatch is", () => {
  // With the radian declared as a dimension, the mismatch is a dimension's.
  const asDimension: Primitives = new Map([["radian", "dimension"]]);
  const result = evaluate(parsed("radian + 1"), lookup, asDimension, CONTEXT);
  assert.ok(!result.ok);
  assert.equal(result.error.kind, "nonconformingOperands");
  assert.ok(result.error.kind === "nonconformingOperands");
  assert.equal(result.error.mismatch.kind, "dimensionMismatch");
});

// ---------------------------------------------------------------------------
// Purity

test("evaluation leaves the tree and the units alone", () => {
  const expr = parsed("2 kg m / s^2 / zero");
  const copy = structuredClone(expr);
  evaluate(expr, lookup, PRIMITIVES, CONTEXT);
  evaluate(parsed("(3 N)^(1/2)"), lookup, PRIMITIVES, CONTEXT);
  evaluate(parsed("2 ft + inch - cm"), lookup, PRIMITIVES, CONTEXT);
  evaluate(parsed("-N"), lookup, PRIMITIVES, CONTEXT);
  assert.deepEqual(expr, copy);
  assert.deepEqual(UNITS.N, quantity("1", { kg: 1, m: 1, s: -2 }));
  assert.deepEqual(UNITS.zero, quantity("0", { m: 1 }));
  assert.deepEqual(UNITS.m.magnitude, exact(ONE));
  assert.deepEqual(UNITS.zero.magnitude, exact(ZERO));
});

// ---------------------------------------------------------------------------
// Calls

test("a call applies the function's forward body to its argument", () => {
  assertEvaluates("tempC(100)", quantity("373.15", { K: 1 }));
  assertEvaluates("tempC(20 + 5)", quantity("298.15", { K: 1 }));
  assertEvaluates("tempC(-40)", quantity("233.15", { K: 1 }));
  assertEvaluates("double(3 m)", quantity("6", { m: 1 }));
  assertEvaluates("double(2 cm)", quantity("0.04", { m: 1 }));
});

test("a call is an atom, and its value is a quantity like any other", () => {
  assertEvaluates("2 tempC(100)", quantity("746.3", { K: 1 }));
  assertEvaluates("tempC(100)^2", quantity("139240.9225", { K: 2 }));
  assertEvaluates("-tempC(100)", quantity("-373.15", { K: 1 }));
  assertEvaluates("tempC(100) - tempC(0)", quantity("100", { K: 1 }));
  assertEvaluates("K / tempC(100)", {
    magnitude: exact(rational(100n, 37315n)),
    dimension: DIMENSIONLESS,
  });
});

test("a call may nest, and a body may call another function", () => {
  assertEvaluates("double(double(1 m))", quantity("4", { m: 1 }));
  assertEvaluates("twice(50)", quantity("373.15", { K: 1 }));
});

test("the parameter is bound before any unit, and only inside the body", () => {
  assertEvaluates("shadow(3)", quantity("6"));
  assertEvaluates("shadow(3) m", quantity("6", { m: 1 }));
});

test("the name of a call resolves among the functions alone", () => {
  assert.deepEqual(failure(run("m(2)")), {
    kind: "unknownFunction",
    name: "m",
    span: { start: 0, end: 1 },
    call: { start: 0, end: 4 },
  });
  // And a function's name is not a unit.
  assert.deepEqual(failure(run("2 tempC")), {
    kind: "unknownUnit",
    name: "tempC",
    span: { start: 2, end: 7 },
  });
});

test("a defined function takes exactly one argument, checked before the arguments are evaluated", () => {
  assert.deepEqual(failure(run("tempC(1, 2)")), {
    kind: "arityMismatch",
    name: "tempC",
    span: { start: 0, end: 11 },
    expected: { min: 1, max: 1 },
    given: 2,
  });
  assert.deepEqual(failure(run("2 tempC()")), {
    kind: "arityMismatch",
    name: "tempC",
    span: { start: 2, end: 9 },
    expected: { min: 1, max: 1 },
    given: 0,
  });
  // The count is about the call's shape: an unknown unit among too many
  // arguments is not reached.
  assert.equal(failure(run("tempC(bogus, 1)")).kind, "arityMismatch");
  // But the name resolves first.
  assert.equal(failure(run("nosuch(1, 2)")).kind, "unknownFunction");
});

test("the argument must conform to the declared argument unit", () => {
  assert.deepEqual(failure(run("tempC(1 m)")), {
    kind: "argumentMismatch",
    name: "tempC",
    span: { start: 0, end: 10 },
    argument: { start: 6, end: 9 },
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: DIMENSIONLESS,
    },
  });
  assert.deepEqual(failure(run("2 double(2)")), {
    kind: "argumentMismatch",
    name: "double",
    span: { start: 2, end: 11 },
    argument: { start: 9, end: 10 },
    mismatch: {
      kind: "dimensionMismatch",
      have: DIMENSIONLESS,
      want: dim({ m: 1 }),
    },
  });
  const kind = failure(run("double(radian m)"));
  assert.ok(kind.kind === "argumentMismatch");
  assert.equal(kind.mismatch.kind, "kindMismatch");
});

test("a body that fails for the argument is a callFailed at the call, carrying the body's error", () => {
  // The body's error is located in the body's own text: the `x` of `1 / x`.
  assert.deepEqual(failure(run("2 recip(0)")), {
    kind: "callFailed",
    name: "recip",
    span: { start: 2, end: 10 },
    error: { kind: "divisionByZero", span: { start: 4, end: 5 } },
  });
  // Through a body's call: each call wraps its own body's failure.
  assert.deepEqual(failure(run("bad(0)")), {
    kind: "callFailed",
    name: "bad",
    span: { start: 0, end: 6 },
    error: {
      kind: "callFailed",
      name: "recip",
      span: { start: 0, end: 8 },
      error: { kind: "divisionByZero", span: { start: 4, end: 5 } },
    },
  });
});

test("the argument is evaluated first, and its failure is its own", () => {
  assert.deepEqual(failure(run("tempC(bogus)")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 6, end: 11 },
  });
  assert.deepEqual(failure(run("recip(recip(0))")).span, {
    start: 6,
    end: 14,
  });
  assert.equal(failure(run("bogus(recip(0))")).kind, "unknownFunction");
});

test("a lookup failure inside a body is passed up unchanged", () => {
  assert.deepEqual(failure(run("broken(1)")), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 2, end: 7 },
  });
});

test("applyFunction and invertFunction evaluate a body under a binding, telling its failure from the lookup's", () => {
  const applied = applyFunction(
    FUNCTIONS.double,
    quantity("3", { m: 1 }),
    lookup,
    PRIMITIVES,
    CONTEXT,
  );
  assert.ok(applied.ok, inspect(applied));
  assert.deepEqual(applied.value, quantity("6", { m: 1 }));
  const inverted = invertFunction(
    FUNCTIONS.tempC,
    quantity("373.15", { K: 1 }),
    lookup,
    PRIMITIVES,
    CONTEXT,
  );
  assert.ok(inverted.ok, inspect(inverted));
  assert.deepEqual(inverted.value, quantity("100"));
  assert.deepEqual(
    invertFunction(FUNCTIONS.recip, quantity("0"), lookup, PRIMITIVES, CONTEXT),
    {
      ok: false,
      error: {
        kind: "body",
        error: { kind: "divisionByZero", span: { start: 4, end: 9 } },
      },
    },
  );
  assert.deepEqual(
    applyFunction(FUNCTIONS.broken, quantity("1"), lookup, PRIMITIVES, CONTEXT),
    {
      ok: false,
      error: {
        kind: "lookup",
        error: {
          kind: "unknownUnit",
          name: "bogus",
          span: { start: 2, end: 7 },
        },
      },
    },
  );
});

// ---------------------------------------------------------------------------
// Built-ins, injected through the lookup: the map of builtins.ts is empty

/** A built-in of `count` plain numbers that returns `body` of their magnitudes. */
function builtin(
  name: string,
  count: number,
  body: Builtin["apply"],
  dimensions: Builtin["dimensions"] = plainNumbers(count),
): Builtin {
  return { name, arity: { min: count, max: count }, dimensions, apply: body };
}

const BUILTINS: Record<string, Builtin> = {
  // A plain number doubled, exactly.
  dbl: builtin("dbl", 1, ([x]) => ok(multiplyBalls(exact(rational(2n)), x!))),
  // No arguments: the constant three.
  three: builtin("three", 0, () => ok(exact(rational(3n)))),
  // An angle to a plain number: the argument itself, as the kernel would see it.
  ang: builtin(
    "ang",
    1,
    ([x]) => ok(x!),
    (args, primitives) => {
      const radian = angle(primitives);
      if (radian === undefined) return err({ kind: "noAngles" });
      const checked = checkArgument(args, 0, radian, primitives);
      return checked.ok ? ok(DIMENSIONLESS) : checked;
    },
  ),
  // Two quantities of one dimension to an angle: the first, as an angle.
  pair: builtin(
    "pair",
    2,
    ([y]) => ok(y!),
    (args, primitives) => {
      const conformance = checkConformance(args[0]!, args[1]!, primitives);
      if (!conformance.ok) {
        return err({
          kind: "nonconformingArguments",
          left: 0,
          right: 1,
          mismatch: conformance.error,
        });
      }
      return ok(angle(primitives)!);
    },
  ),
  // Failures, each on its argument.
  domain: builtin("domain", 1, () =>
    err({ kind: "domain", argument: 0, reason: "notPositive" }),
  ),
  edge: builtin("edge", 2, () =>
    err({ kind: "unresolved", argument: 1, edge: ONE }),
  ),
  pole: builtin("pole", 1, () =>
    err({ kind: "unresolved", argument: 0, edge: "pole" }),
  ),
  huge: builtin("huge", 1, () => err({ kind: "tooLarge" })),
  even: builtin("even", 1, () => err({ kind: "negativeRadicand", degree: 2n })),
  byzero: builtin("byzero", 1, () => err({ kind: "divisionByZero" })),
  // An unbounded argument, propagated as the rules say.
  wide: builtin("wide", 1, ([x]) => ok({ mid: x!.mid, rad: UNBOUNDED })),
};

const withBuiltins = lookupIn(UNITS, FUNCTIONS, BUILTINS);

function runBuiltin(text: string): Result<Quantity, Failure> {
  return evaluate(parsed(text), withBuiltins, PRIMITIVES, CONTEXT);
}

test("a call of a built-in evaluates its arguments, applies its rule and its function", () => {
  assert.deepEqual(value(runBuiltin("dbl(3)")), quantity("6"));
  assert.deepEqual(
    value(runBuiltin("2 dbl(1 + 2) m")),
    quantity("12", { m: 1 }),
  );
  assert.deepEqual(value(runBuiltin("three()")), quantity("3"));
  assert.deepEqual(value(runBuiltin("dbl(three())")), quantity("6"));
  // A built-in inside a defined function's body, and the other way about.
  assert.deepEqual(value(runBuiltin("recip(dbl(4))")), quantity("0.125"));
  assert.deepEqual(value(runBuiltin("dbl(recip(4))")), quantity("0.5"));
  // The result takes the rule's dimension: an angle from a pair of lengths.
  assert.deepEqual(
    value(runBuiltin("pair(3 m, 4 m)")),
    quantity("3", { radian: 1 }),
  );
  assert.deepEqual(value(runBuiltin("ang(2 radian)")), quantity("2"));
});

test("a built-in's arity is checked before its arguments are evaluated", () => {
  assert.deepEqual(failure(runBuiltin("dbl()")), {
    kind: "arityMismatch",
    name: "dbl",
    span: { start: 0, end: 5 },
    expected: { min: 1, max: 1 },
    given: 0,
  });
  assert.deepEqual(failure(runBuiltin("three(1)")), {
    kind: "arityMismatch",
    name: "three",
    span: { start: 0, end: 8 },
    expected: { min: 0, max: 0 },
    given: 1,
  });
  assert.equal(failure(runBuiltin("dbl(bogus, 1)")).kind, "arityMismatch");
  // Then the arguments, left to right, and the first failure ends it.
  assert.equal(failure(runBuiltin("pair(bogus, 1 / 0)")).kind, "unknownUnit");
  assert.equal(failure(runBuiltin("pair(1, 1 / 0)")).kind, "divisionByZero");
});

test("a built-in whose rule rejects its arguments is a builtinArgument at the call, with every argument's span", () => {
  assert.deepEqual(failure(runBuiltin("2 dbl(3 m)")), {
    kind: "builtinArgument",
    name: "dbl",
    span: { start: 2, end: 10 },
    arguments: [{ start: 6, end: 9 }],
    error: {
      kind: "argumentDimension",
      argument: 0,
      want: DIMENSIONLESS,
      mismatch: {
        kind: "dimensionMismatch",
        have: dim({ m: 1 }),
        want: DIMENSIONLESS,
      },
    },
  });
  const plain = failure(runBuiltin("ang(1)"));
  assert.ok(
    plain.kind === "builtinArgument" &&
      plain.error.kind === "argumentDimension",
  );
  assert.deepEqual(plain.error.want, dim({ radian: 1 }));
  assert.equal(plain.error.mismatch.kind, "kindMismatch");
  const lengths = failure(runBuiltin("pair(3 m, 4 s)"));
  assert.ok(lengths.kind === "builtinArgument");
  assert.deepEqual(lengths.arguments, [
    { start: 5, end: 8 },
    { start: 10, end: 13 },
  ]);
  assert.deepEqual(lengths.error, {
    kind: "nonconformingArguments",
    left: 0,
    right: 1,
    mismatch: {
      kind: "dimensionMismatch",
      have: dim({ m: 1 }),
      want: dim({ s: 1 }),
    },
  });
  // A table without the radian kind has no angles.
  const noAngles = evaluate(
    parsed("ang(1)"),
    withBuiltins,
    new Map([["m", "dimension"]]),
    CONTEXT,
  );
  assert.ok(!noAngles.ok && noAngles.error.kind === "builtinArgument");
  assert.deepEqual(noAngles.error.error, { kind: "noAngles" });
});

test("a built-in's failures are located: domain and the rest at the call, unresolved at the argument with its edge", () => {
  assert.deepEqual(failure(runBuiltin("2 domain(-1)")), {
    kind: "domainError",
    name: "domain",
    span: { start: 2, end: 12 },
    arguments: [{ start: 9, end: 11 }],
    argument: 0,
    reason: "notPositive",
  });
  assert.deepEqual(failure(runBuiltin("edge(1, 2 + 3)")), {
    kind: "unresolved",
    span: { start: 8, end: 13 },
    edge: ONE,
  });
  assert.deepEqual(failure(runBuiltin("pole(7)")), {
    kind: "unresolved",
    span: { start: 5, end: 6 },
    edge: "pole",
  });
  assert.deepEqual(failure(runBuiltin("huge(1)")), {
    kind: "tooLarge",
    span: { start: 0, end: 7 },
  });
  assert.deepEqual(failure(runBuiltin("even(1)")), {
    kind: "negativeRadicand",
    degree: 2n,
    span: { start: 0, end: 7 },
  });
  assert.deepEqual(failure(runBuiltin("byzero(1)")), {
    kind: "divisionByZero",
    span: { start: 0, end: 9 },
  });
});

test("a built-in's result is settled like any other, and an unbounded one propagates", () => {
  // dbl of an inexact value: the product is settled by the evaluator to
  // the working precision (its midpoint is a dyadic of at most that many
  // bits), which the built-in itself did not do. The reference is twice
  // sqrt 2 to 60 digits from Python's decimal module.
  const root = value(runBuiltin("dbl(2^(1/2))"));
  assert.ok(!isExact(root.magnitude));
  const reference = parseDecimal(
    "2.82842712474619009760337744841939615713934375075389614635336",
  );
  assert.ok(reference.ok);
  assert.ok(
    compare(
      absolute(subtract(root.magnitude.mid, reference.value)),
      radiusUpper(root.magnitude.rad),
    ) <= 0,
  );
  const wide = value(runBuiltin("wide(3) m"));
  assert.deepEqual(wide.magnitude, { mid: rational(3n), rad: UNBOUNDED });
});
