import assert from "node:assert/strict";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  UNBOUNDED,
  powerOfTenRadius,
  powerOfTwoRadius,
  radiusUpper,
} from "./radius.ts";
import {
  certifies,
  containsZero,
  exact,
  isExact,
  multiplyBalls,
  type Ball,
} from "./ball.ts";
import { angle, checkArgument, plainNumbers, type Builtin } from "./builtin.ts";
import { approx } from "./builtins/approx.ts";
import { BUILTINS as APP_BUILTINS } from "./builtins.ts";
import {
  DIMENSIONLESS,
  checkConformance,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import {
  applyFunction,
  decide,
  evaluate,
  invertFunction,
  type EvaluateError,
  type Lookup,
} from "./evaluate.ts";
import { parseExpr, type Expr } from "./expr.ts";
import { key, randomBigInt } from "../testing/random.ts";
import type { Quantity } from "./quantity.ts";
import {
  bitLength,
  absolute as absoluteFraction,
  compare as compareFractions,
  rational,
  subtract as subtractFractions,
  type Rational,
} from "./rational.ts";
import {
  ONE,
  ZERO,
  bitsOfTens,
  format,
  fromRational,
  type Scaled,
} from "./scaled.ts";
import { dec, fr, fraction } from "../testing/scaled.ts";
import { DEFAULT_PRECISION, type RoundingMode } from "./rounding.ts";
import type { Result } from "./result.ts";
import type { Span } from "./span.ts";
import type { UnitFunction } from "./table.ts";
import { err, ok } from "./result.ts";

/** The context every test computes at: the working precision, in the default mode. */
const CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
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
  return { magnitude: exact(dec(text)), dimension: dim(exponents) };
}

/** A quantity with the exact magnitude `value`. */
function of(
  value: Scaled,
  exponents: Record<string, number | Rational> = {},
): Quantity {
  return { magnitude: exact(value), dimension: dim(exponents) };
}

/** Asserts that the bounded ball `b` contains `reference`, exactly, as fractions. */
function assertContains(b: Ball, reference: Scaled): void {
  assert.ok(
    compareFractions(
      absoluteFraction(subtractFractions(fraction(b.mid), fraction(reference))),
      radiusUpper(b.rad),
    ) <= 0,
    `${inspect(b)} contains ${inspect(reference)}`,
  );
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
 * A function as the table would hold it, with its body parsed from
 * `forward` and its inverse's from `inverse`, so that the spans of a
 * body's errors are into those texts. The inverse's parameter is named
 * after the function, as the first form of the definitions wrote it.
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
    parameters: [
      {
        name: parameter,
        unit: {
          text: "argument",
          expr: parsed("argument"),
          quantity: argument,
        },
      },
    ],
    result: result.dimension,
    conditions: [],
    body: parsed(forward),
    inverse: { parameter: name, conditions: [], body: parsed(inverse) },
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

/** A decimal-mode context at `precision` digits in `rounding`. */
function decimal(precision: number, rounding: RoundingMode): NumberContext {
  return { ...CONTEXT, precision, rounding, mode: "decimal" };
}

// ---------------------------------------------------------------------------
// The decimal mode

test('in decimal mode every result is rounded to the precision in the rounding mode and is exact (devdocs/numbers.md, "Decimal mode")', () => {
  // 1 / 3 * 3 at eight digits: 0.33333333 times three, 0.99999999 with
  // eight digits and no further rounding, exact, under every mode: the
  // rounded value is the value, and no radius records the roundings.
  for (const mode of ["towardZero", "halfEven", "halfAwayFromZero"] as const) {
    const q = value(run("1 / 3 * 3", decimal(8, mode))).magnitude;
    assert.deepEqual(q, exact(dec("0.99999999")), mode);
  }
  // 0.125 * 1 at two digits: the mode decides the tie.
  assert.deepEqual(
    value(run("0.125 * 1", decimal(2, "halfAwayFromZero"))).magnitude.mid,
    dec("0.13"),
  );
  assert.deepEqual(
    value(run("0.125 * 1", decimal(2, "halfEven"))).magnitude.mid,
    dec("0.12"),
  );
  // 2 / 3 at eight: to nearest, and under the directed modes.
  assert.deepEqual(
    value(run("2 / 3", decimal(8, "halfEven"))).magnitude,
    exact(dec("0.66666667")),
  );
  assert.deepEqual(
    value(run("2 / 3", decimal(8, "towardZero"))).magnitude,
    exact(dec("0.66666666")),
  );
  assert.deepEqual(
    value(run("2 / 3", decimal(8, "floor"))).magnitude,
    exact(dec("0.66666666")),
  );
  // A literal with more than p digits is rounded as it is read, and is
  // exact; one with p digits or fewer is itself.
  assert.deepEqual(
    value(run("3.14159265358979", decimal(8, "halfEven"))).magnitude,
    exact(dec("3.1415927")),
  );
  assert.ok(isExact(value(run("2.54", decimal(8, "halfEven"))).magnitude));
  // An integer power of an exact base is one step, rounded once.
  assert.deepEqual(
    value(run("2^100", decimal(8, "halfEven"))).magnitude,
    exact(dec("1.2676506e30")),
  );
  // A sum that cannot be aligned is the larger operand, or its neighbor in
  // a directed mode, by the smaller's sign.
  assert.deepEqual(
    value(run("1e999999999 + 1", decimal(8, "halfEven"))).magnitude,
    exact(dec("1e999999999")),
  );
  assert.deepEqual(
    value(run("1e999999999 + 1", decimal(8, "ceiling"))).magnitude,
    exact(dec("1.0000001e999999999")),
  );
  // The noise of the roundings is a value, as on a calculator.
  assert.deepEqual(
    value(run("1 / (1 / 3 * 3 - 1)", decimal(8, "halfEven"))).magnitude,
    exact(dec("-1e8")),
  );
  // In exact mode none of this rounds: 2 / 3 is the exact fraction.
  assert.ok(isExact(value(run("2 / 3", at(8))).magnitude));
});

test('in decimal mode with working digits every step but the last is rounded to them, and the last to the precision from its exact result (devdocs/numbers.md, "The working digits")', () => {
  const over = (
    precision: number,
    working: number,
    rounding: RoundingMode,
  ): NumberContext => ({ ...decimal(precision, rounding), working });
  const withApp = lookupIn(UNITS, FUNCTIONS, APP_BUILTINS_RECORD);
  const run12 = (text: string, rounding: RoundingMode) =>
    value(evaluate(parsed(text), withApp, PRIMITIVES, over(8, 12, rounding)))
      .magnitude;
  // ln(exp(1/10)) at eight digits over twelve: exp(0.1) is 1.10517091808
  // at twelve, which drops 4.4e-12, and ln of it is 0.1 within 4e-12,
  // which the eighth digit does not see under the modes to nearest; a
  // directed mode sees it, since 0.1 is on the grid and any error crosses
  // it, and gives the neighbor in its direction. Without working digits
  // the first rounding's error, 1.8e-8, is visible in the answer.
  for (const mode of [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
  ] as const) {
    assert.deepEqual(run12("ln(exp(1/10))", mode), exact(dec("0.1")), mode);
    assert.deepEqual(run12("1 / 3 * 3", mode), exact(dec("1")), mode);
  }
  for (const mode of ["towardZero", "floor"] as const) {
    assert.deepEqual(
      run12("ln(exp(1/10))", mode),
      exact(dec("0.099999999")),
      mode,
    );
    assert.deepEqual(run12("1 / 3 * 3", mode), exact(dec("0.99999999")), mode);
  }
  for (const mode of ["awayFromZero", "ceiling"] as const) {
    assert.deepEqual(
      run12("ln(exp(1/10))", mode),
      exact(dec("0.10000001")),
      mode,
    );
    assert.deepEqual(run12("1 / 3 * 3", mode), exact(dec("1.0000001")), mode);
  }
  assert.deepEqual(
    value(
      evaluate(
        parsed("ln(exp(1/10))"),
        withApp,
        PRIMITIVES,
        decimal(8, "halfEven"),
      ),
    ).magnitude,
    exact(dec("0.099999984")),
  );
  // The root alone is rounded to the precision: a literal there has eight
  // digits, one below the root twelve, so 1/3 * 3 and 3 * 1/3 differ in
  // what is rounded and agree in the answer, and a product at the root
  // of twelve-digit operands is rounded once.
  assert.deepEqual(
    run12("3.14159265358979", "halfEven"),
    exact(dec("3.1415927")),
  );
  assert.deepEqual(
    run12("3.14159265358979 * 1", "halfEven"),
    exact(dec("3.1415927")),
  );
  assert.deepEqual(
    run12("1.00000000004 * 1.00000000004", "halfEven"),
    exact(dec("1")),
  );
  // A user-defined function's body is the call's step: its root is rounded
  // to the call's digits, and its argument is an operand.
  const twice = fn(
    "twice",
    "x",
    quantity("1"),
    quantity("1"),
    "ln(exp(x))",
    "twice",
  );
  const look = lookupIn(UNITS, { twice }, APP_BUILTINS_RECORD);
  assert.deepEqual(
    value(
      evaluate(
        parsed("twice(1/10)"),
        look,
        PRIMITIVES,
        over(8, 12, "halfEven"),
      ),
    ).magnitude,
    exact(dec("0.1")),
  );
  // Working digits equal to the precision are plain decimal mode, and exact
  // mode ignores them: the results are the same, operand for operand.
  assert.deepEqual(
    value(
      evaluate(
        parsed("ln(exp(1/10))"),
        withApp,
        PRIMITIVES,
        over(8, 8, "halfEven"),
      ),
    ),
    value(
      evaluate(
        parsed("ln(exp(1/10))"),
        withApp,
        PRIMITIVES,
        decimal(8, "halfEven"),
      ),
    ),
  );
  assert.deepEqual(
    value(
      evaluate(parsed("ln(exp(1/10))"), withApp, PRIMITIVES, {
        ...at(8),
        working: 12,
      }),
    ),
    value(evaluate(parsed("ln(exp(1/10))"), withApp, PRIMITIVES, at(8))),
  );
});

// ---------------------------------------------------------------------------
// Leaves

test("a number is a dimensionless quantity", () => {
  assertEvaluates("2", quantity("2"));
  assertEvaluates("2.54", quantity("2.54"));
  assertEvaluates("1e-3", of(fr(1n, 1000n)));
  assertEvaluates("0", quantity("0"));
});

test("a literal of any exponent is a value, and one whose significand exceeds the significand limit is too large at its span", () => {
  assertEvaluates("1e999999999", quantity("1e999999999"));
  assertEvaluates("1.5e-999999999", quantity("1.5e-999999999"));
  assertEvaluates("1e999999999 m", quantity("1e999999999", { m: 1 }));
  // The exponent costs nothing; the significand is what the significand limit
  // bounds: twenty thousand digits are more bits than the default allows.
  const long = "1".repeat(20000);
  // The digits typed are the significand: nothing rounds them smaller.
  const need = { kind: "exact", bits: bitLength(BigInt(long)) } as const;
  assert.deepEqual(failure(run(long)), {
    kind: "tooLarge",
    span: { start: 0, end: long.length },
    inexact: "exceeds",
    need,
  });
  assert.deepEqual(failure(run(`2 * ${long} m`)), {
    kind: "tooLarge",
    span: { start: 4, end: 4 + long.length },
    inexact: "exceeds",
    need,
  });
  // Whereas the `^` exponent is read as a fraction, and one whose power
  // of ten cannot be formed within the hard bound is rejected by the parser.
  const rejected = parseExpr("m^1e999999999");
  assert.ok(!rejected.ok);
  assert.deepEqual(rejected.error, {
    kind: "rejected",
    span: { start: 2, end: 13 },
    reason: { kind: "exponentTooLarge" },
  });
  assertEvaluates("m^1e3", quantity("1", { m: 1000 }));
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
  assertEvaluates("m / -2 s", of(fr(-1n, 2n), { m: 1, s: -1 }));
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
  assertEvaluates("1/2 m", of(fr(1n, 2n), { m: -1 }));
  assertEvaluates("(1/2) m", of(fr(1n, 2n), { m: 1 }));
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
  assertEvaluates("2^-2", of(fr(1n, 4n)));
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
    compareFractions(
      radiusUpper(root5.magnitude.rad),
      rational(1n, 10n ** 13n),
    ) < 0,
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
  // 3 / sqrt 2, from Python's decimal module.
  const reference = dec("2.1213203435596425732025330863145471178545");
  const rad = radiusUpper(nested.magnitude.rad);
  assertContains(nested.magnitude, reference);
  assert.ok(compareFractions(rad, rational(1n, 10n ** 11n)) < 0);
  // The radius reaches the result: the quotient is not exact.
  assert.ok(!isExact(nested.magnitude));
});

test("exact operations never round", () => {
  // 1 m in feet is 1250/381, which no decimal writes.
  assertEvaluates("m / ft", of(fr(1250n, 381n)));
  // A long exact product stays exact.
  const big = value(run("1e30 m * 1e30 m / 3"));
  assert.deepEqual(big.magnitude, exact(fr(10n ** 60n, 3n)));
});

test("the exponent carries through the exact operations, and a sum that cannot be aligned is too large at the sum", () => {
  assertEvaluates("1e999999999 * 1e999999999", quantity("1e1999999998"));
  assertEvaluates(
    "1e999999999 m / 1e-999999999 s",
    quantity("1e1999999998", { m: 1, s: -1 }),
  );
  assertEvaluates("1e999999999 + 3e999999998", quantity("1.3e999999999"));
  assertEvaluates("1e999999999 - 1e999999999", quantity("0"));
  assertEvaluates("-1e999999999 m", quantity("-1e999999999", { m: 1 }));
  // Two exact operands whose exponents cannot be aligned within the significand
  // limit have an exact sum that cannot be held: `1e999999999 + 1`.
  // The sum says an inexact operand fits, and the evaluator names the
  // left one as the span `approx` around would make inexact.
  assert.deepEqual(failure(run("1e999999999 + 1")), {
    kind: "tooLarge",
    span: { start: 0, end: 15 },
    inexact: "fits",
    need: { kind: "bound", bits: 1 + bitsOfTens(999999999) },
    operand: { start: 0, end: 11 },
  });
  assert.deepEqual(failure(run("2 m * (1 - 1e999999999)")), {
    kind: "tooLarge",
    span: { start: 6, end: 23 },
    need: { kind: "bound", bits: 1 + bitsOfTens(999999999) },
    inexact: "fits",
    operand: { start: 7, end: 8 },
  });
  // A product or a quotient that passes the exponent bound is too large
  // at the whole operation, where a division by zero points at the
  // divisor, and on the side of the bound it passes.
  assert.deepEqual(failure(run("1e999999999999999999 * 1e10")), {
    kind: "overflow",
    span: { start: 0, end: 27 },
  });
  assert.deepEqual(failure(run("m (1e999999999999999999 * 1e10)")), {
    kind: "overflow",
    span: { start: 2, end: 31 },
  });
  assert.deepEqual(failure(run("1e-999999999999999999 / 1e10")), {
    kind: "underflow",
    span: { start: 0, end: 28 },
  });
  assert.deepEqual(failure(run("1 / 0")), {
    kind: "divisionByZero",
    span: { start: 4, end: 5 },
  });
});

test("a sum with an inexact operand that cannot be aligned absorbs the smaller into the radius", () => {
  // `sqrt(2) + 1e999999999`, either way round: the value is `1e999999999`
  // within a radius that covers the root, which certifies fifty digits.
  const huge = dec("1e999999999");
  for (const text of ["2^(1/2) + 1e999999999", "1e999999999 + 2^(1/2)"]) {
    const sum = value(run(text, at(8)));
    assert.deepEqual(sum.dimension, DIMENSIONLESS);
    assert.ok(!isExact(sum.magnitude), text);
    assert.deepEqual(sum.magnitude.mid, huge, text);
    const rad = radiusUpper(sum.magnitude.rad);
    assert.ok(compareFractions(rad, fraction(dec("1.41"))) > 0, text);
    assert.ok(compareFractions(rad, fraction(dec("1.5"))) < 0, text);
    assert.ok(certifies(sum.magnitude, 50, "halfEven"), text);
  }
  const difference = value(run("2^(1/2) - 1e999999999 m / m", at(8)));
  assert.deepEqual(difference.magnitude.mid, dec("-1e999999999"));
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
  // The exact power says an inexact base fits; the base is the operand.
  assert.deepEqual(failure(run("7^100000")), {
    kind: "tooLarge",
    span: { start: 0, end: 8 },
    inexact: "fits",
    need: { kind: "bound", bits: bitLength(7n ** 100_000n) },
    operand: { start: 0, end: 1 },
  });
  assert.deepEqual(failure(run("m (7^100000)")), {
    kind: "tooLarge",
    span: { start: 2, end: 12 },
    inexact: "fits",
    need: { kind: "bound", bits: bitLength(7n ** 100_000n) },
    operand: { start: 3, end: 4 },
  });
  // Whereas a power of ten costs nothing: the exponent takes it.
  assertEvaluates("10^100000", quantity("1e100000"));
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
  assertEvaluates("K / tempC(100)", of(fr(100n, 37315n)));
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
    parameter: "x",
    parameters: 1,
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
    parameter: "x",
    parameters: 1,
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
    [quantity("3", { m: 1 })],
    lookup,
    PRIMITIVES,
    CONTEXT,
  );
  assert.ok(applied.ok, inspect(applied));
  assert.deepEqual(applied.value, quantity("6", { m: 1 }));
  const inverted = invertFunction(
    FUNCTIONS.tempC!.inverse!,
    quantity("373.15", { K: 1 }),
    lookup,
    PRIMITIVES,
    CONTEXT,
  );
  assert.ok(inverted.ok, inspect(inverted));
  assert.deepEqual(inverted.value, quantity("100"));
  assert.deepEqual(
    invertFunction(
      FUNCTIONS.recip!.inverse!,
      quantity("0"),
      lookup,
      PRIMITIVES,
      CONTEXT,
    ),
    {
      ok: false,
      error: {
        kind: "body",
        error: { kind: "divisionByZero", span: { start: 4, end: 9 } },
      },
    },
  );
  assert.deepEqual(
    applyFunction(
      FUNCTIONS.broken,
      [quantity("1")],
      lookup,
      PRIMITIVES,
      CONTEXT,
    ),
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
  dbl: builtin("dbl", 1, ([x], context) => {
    const product = multiplyBalls(exact(fr(2n)), x!, context);
    if (!product.ok) throw new Error("Doubling passes the bound");
    return ok(product.value);
  }),
  // No arguments: the constant three.
  three: builtin("three", 0, () => ok(exact(fr(3n)))),
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
  huge: builtin("huge", 1, () => err({ kind: "overflow" })),
  tiny: builtin("tiny", 1, () => err({ kind: "underflow" })),
  long: builtin("long", 1, () =>
    err({ kind: "tooLarge", inexact: "exceeds", need: { kind: "unknown" } }),
  ),
  longFits: builtin("longFits", 2, () =>
    err({ kind: "tooLarge", inexact: "fits", need: { kind: "unknown" } }),
  ),
  even: builtin("even", 1, () => err({ kind: "negativeRadicand", degree: 2n })),
  byzero: builtin("byzero", 1, () => err({ kind: "divisionByZero" })),
  // An unbounded argument, propagated as the rules say.
  wide: builtin("wide", 1, ([x]) => ok({ mid: x!.mid, rad: UNBOUNDED })),
};

const withBuiltins = lookupIn(UNITS, FUNCTIONS, BUILTINS);

/** The app's built-ins as `lookupIn` takes them. */
const APP_BUILTINS_RECORD: Record<string, Builtin> =
  Object.fromEntries(APP_BUILTINS);

function runBuiltin(text: string): Result<Quantity, Failure> {
  return evaluate(parsed(text), withBuiltins, PRIMITIVES, CONTEXT);
}

test('in decimal mode a built-in is computed at rising precision until its rounding is certified, and marked uncertified at the ceiling (devdocs/numbers.md, "Decimal mode")', () => {
  // A function whose value lies 1e-22 above the two-digit tie at 1.25,
  // known within one unit in the working precision's last digit: at the
  // first working precision, twelve digits, the ball straddles the tie;
  // at the second, twenty-four, it does not, and the call is 1.3 under
  // halfEven, exact.
  const seen: number[] = [];
  const near = builtin("near", 0, (_, working) => {
    seen.push(working.precision);
    return ok({
      mid: dec("1.2500000000000000000001"),
      rad: powerOfTenRadius(-BigInt(working.precision)),
    });
  });
  // A value exactly on the tie never certifies: at the ceiling the
  // midpoint's rounding is taken and the result is flagged, and the flag
  // carries through what follows.
  const tie = builtin("tie", 0, (_, working) =>
    ok({ mid: dec("1.25"), rad: powerOfTenRadius(-BigInt(working.precision)) }),
  );
  const lookup = lookupIn(UNITS, FUNCTIONS, { near, tie });
  const context = decimal(2, "halfEven");
  const certified = evaluate(parsed("near()"), lookup, PRIMITIVES, context);
  assert.ok(certified.ok, inspect(certified));
  assert.deepEqual(certified.value.magnitude, exact(dec("1.3")));
  assert.deepEqual(seen, [12, 24]);
  const uncertified = evaluate(parsed("tie()"), lookup, PRIMITIVES, context);
  assert.ok(uncertified.ok, inspect(uncertified));
  assert.deepEqual(uncertified.value.magnitude, {
    ...exact(dec("1.2")),
    uncertified: true,
  });
  const carried = evaluate(
    parsed("tie() * 2 + 1"),
    lookup,
    PRIMITIVES,
    context,
  );
  assert.ok(carried.ok, inspect(carried));
  assert.deepEqual(carried.value.magnitude, {
    ...exact(dec("3.4")),
    uncertified: true,
  });
  // In exact mode the built-in runs once, at the context.
  seen.length = 0;
  const once = evaluate(parsed("near()"), lookup, PRIMITIVES, at(2));
  assert.ok(once.ok, inspect(once));
  assert.deepEqual(seen, [2]);
});

test('the exponent bound is on the value, and a result straddling it is unresolved at the bound (devdocs/numbers.md, "The exponent bound")', () => {
  const app = lookupIn(UNITS, FUNCTIONS, Object.fromEntries(APP_BUILTINS));
  const run8 = (text: string, context: NumberContext = at(8)) =>
    evaluate(parsed(text), app, PRIMITIVES, context);
  const shown = (text: string, digits: number, context?: NumberContext) =>
    format(
      value(run8(text, context)).magnitude.mid,
      digits,
      "halfAwayFromZero",
    );
  // The canonical exponent passes the bound by the significand's digits where
  // the value does not, and the other way.
  assert.equal(
    shown("1e1000000000000000000 / 3 * 10", 8),
    "3.3333333e+1000000000000000000",
  );
  const seventh = "1e-1000000000000000000 / 7";
  assert.deepEqual(failure(run8(seventh)), {
    kind: "underflow",
    span: { start: 0, end: seventh.length },
  });
  // Both texts are refused at the quotient in either mode.
  for (const text of [
    "1e-1000000000000000000 / 3",
    "1e-1000000000000000000 / approx(3)",
  ]) {
    for (const context of [at(8), decimal(8, "halfAwayFromZero")]) {
      assert.equal(failure(run8(text, context)).kind, "underflow", text);
    }
  }
  assert.deepEqual(value(run8("12345678e-1000000000000000007")).magnitude.mid, {
    significand: rational(12345678n),
    exp: -1000000000000000007n,
  });
  // The built-ins take the newly admitted values.
  const top = "(1e1000000000000000000 / 3 * 10)";
  for (const fn of ["ln", "log10", "asinh", "acosh"])
    value(run8(`${fn}${top}`));
  value(run8(`pow(${top}, 0.3)`));
  const bottom = "(12345678e-1000000000000000007)";
  for (const fn of ["ln", "sqrt", "cbrt"]) value(run8(`${fn}${bottom}`));
  value(run8(`pow(${bottom}, 0.5)`));
  // In decimal mode a value at the bottom edge certifies its digits.
  const settled = value(
    run8(
      "1.234567891e-1000000000000000000 * 1",
      decimal(8, "halfAwayFromZero"),
    ),
  );
  assert.ok(certifies(settled.magnitude, 8, "halfAwayFromZero"));
  // The arithmetic keeps the values certified: at eight digits
  // the first pass leaves the product straddling the top, and the retry
  // loop's later passes, at forty digits here, decide it.
  const wide =
    "(approx(9999999999999999999999999999510000000000000000) - 9999999999999999999999999997310000000000000000)";
  assert.equal(
    failure(run8(`${wide} * 4e999999999999999982`)).kind,
    "unresolved",
  );
  assert.equal(
    shown(`${wide} * 4e999999999999999982`, 2, at(40)),
    "8.8e+1000000000000000000",
  );
  value(run8(`${wide} * 3e999999999999999982 + 3e1000000000000000000`, at(40)));
  assert.ok(
    containsZero(
      value(
        run8("approx(1/3) * 3 * 1e-999999999999999990 - 1e-999999999999999990"),
      ).magnitude,
    ),
  );
  // A product whose ball straddles the top is unresolved at the bound, at
  // the whole product; a quotient's, at the whole quotient.
  const straddling =
    "5e1000000000000000000 * (approx(1e5000) - approx(1e5000))";
  assert.deepEqual(failure(run8(straddling)), {
    kind: "unresolved",
    edge: "bound",
    span: { start: 0, end: straddling.length },
  });
  const quotient = "approx(1e1000000000000000000) / 0.1";
  assert.deepEqual(failure(run8(quotient)), {
    kind: "unresolved",
    edge: "bound",
    span: { start: 0, end: quotient.length },
  });
  // A log-space power at the bottom edge is a value, where the canonical
  // check refused its midpoint's digits.
  value(run8("pow(10, approx(-999999999999999990.5))"));
  // A sum that aligns and passes the bound: two exact operands are
  // past it throughout, in either mode, where the settle-first path
  // absorbed one into the radius and showed zero; with `approx`'s radius
  // the sum reaches back within the bound, unresolved at the bound at the
  // whole sum.
  const past = "5e1000000000000000000 + 5e1000000000000000000";
  for (const context of [at(8), decimal(8, "halfAwayFromZero")]) {
    assert.deepEqual(failure(run8(past, context)), {
      kind: "overflow",
      span: { start: 0, end: past.length },
    });
  }
  const approxPast = "approx(5e1000000000000000000) + 5e1000000000000000000";
  assert.deepEqual(failure(run8(approxPast)), {
    kind: "unresolved",
    edge: "bound",
    span: { start: 0, end: approxPast.length },
  });
  // A second case: a sum within the bound whose canonical
  // exponent is past it, reached through the settle path before.
  assert.equal(
    shown(
      "1e999999999999999980/3 + approx(333333333333333333333e999999999999999980)",
      8,
    ),
    "3.3333333e+1000000000000000000",
  );
});

test('an exact result past the significand limit is refused at the node that forms it, and approx lifts the refusal (devdocs/numbers.md, "The significand limit")', () => {
  const app = lookupIn(UNITS, FUNCTIONS, Object.fromEntries(APP_BUILTINS));
  const run8 = (text: string, context: NumberContext = at(8)) =>
    evaluate(parsed(text), app, PRIMITIVES, context);
  const tooLarge = (text: string, operandEnd: number, bits: number) =>
    assert.deepEqual(failure(run8(text)), {
      kind: "tooLarge",
      span: { start: 0, end: text.length },
      inexact: "fits",
      need: { kind: "bound", bits },
      operand: { start: 0, end: operandEnd },
    });
  const three = bitLength(3n ** 32767n);
  const seven = bitLength(7n ** 21845n);
  const eleven = bitLength(11n ** 16383n);
  const within = (ms: number, label: string, f: () => void) => {
    const start = performance.now();
    f();
    const took = performance.now() - start;
    assert.ok(took <= ms, `${label} took ${took.toFixed(1)} ms, over ${ms}`);
  };
  // A product of two powers each within the limit passes it, predicted
  // from the parts after their gcds, which
  // cancel nothing here: the need is the two parts' bits, and nothing is
  // formed.
  tooLarge("3^32767 * 7^21845", "3^32767".length, three + seven);
  // A quotient's reduction is what is measured: within the limit, the
  // plan's 50 ms with a margin for a slow runner, where its unreduced
  // parts would have been past it; a second quotient passes it.
  within(200, "3^32767 / 7^21845", () => {
    assert.equal(
      format(value(run8("3^32767 / 7^21845")).magnitude.mid, 8, "halfEven"),
      "4.6288093e-2828",
    );
  });
  // The second quotient's need is the larger of its two parts' bounds:
  // the denominator's, `7^21845 × 11^16383`.
  tooLarge(
    "3^32767 / 7^21845 / 11^16383",
    "3^32767 / 7^21845".length,
    Math.max(three + 1, seven + eleven),
  );
  // A long product is refused at the first node past the limit, which
  // the span names, before anything larger is formed; the operand named
  // is that node's left one.
  const powers = COPRIME_POWERS.slice(0, 10).join(" * ");
  const [first, second] = COPRIME_POWERS.slice(0, 2).map((text) => {
    const [base, exponent] = text.split("^");
    return bitLength(BigInt(base!) ** BigInt(exponent!));
  });
  within(200, "ten coprime powers", () => {
    assert.deepEqual(failure(run8(powers)), {
      kind: "tooLarge",
      span: { start: 0, end: COPRIME_POWERS.slice(0, 2).join(" * ").length },
      inexact: "fits",
      need: { kind: "bound", bits: first! + second! },
      operand: { start: 0, end: COPRIME_POWERS[0]!.length },
    });
  });
  within(200, "twenty coprime powers", () => {
    failure(run8(COPRIME_POWERS.join(" * ")));
  });
  // An inexact operand makes the result inexact, settled and never
  // refused for size: `approx` around an operand is the remedy the
  // message names. Around the node itself it comes too late, the node
  // being refused before `approx` sees it.
  value(
    run8(
      `approx(${COPRIME_POWERS[0]}) * ${COPRIME_POWERS.slice(1, 4).join(" * ")}`,
    ),
  );
  value(run8("approx(3^32767) * 7^21845"));
  assert.deepEqual(failure(run8("approx(3^32767 * 7^21845)")), {
    kind: "tooLarge",
    span: { start: 7, end: 24 },
    inexact: "fits",
    need: { kind: "bound", bits: three + seven },
    operand: { start: 7, end: 14 },
  });
  // A sum of fractions grows as a product does, and is refused on the
  // bound of its unreduced sum, the denominators' product; `x / x` is
  // one, the quotient's parts cancelling before its size is predicted.
  tooLarge("1/3^32767 + 1/7^21845", "1/3^32767".length, three + seven + 1);
  assertEvaluatesWith(app, "(3^32767/7^21845) / (3^32767/7^21845)", of(ONE));
  // A tiny exact term within the limit keeps the digits of an inexact sum.
  assert.equal(
    format(
      value(run8("(1 + 1/(3^30000 * 3^11300)) + sqrt(2)", at(32))).magnitude
        .mid,
      32,
      "halfEven",
    ),
    "2.4142135623730950488016887242097",
  );
  // The measure is the canonical form's size (devdocs/numbers.md, "The
  // significand limit"): a dyadic is stored with fives for its twos, so
  // `2^-30000` costs 69,658 bits, predicted before the form is made,
  // within a bit.
  const dyadic = 1 + Math.ceil(30000 * Math.log2(5));
  tooLarge("2^-30000", 1, dyadic);
  tooLarge("1/2^30000", 1, dyadic);
  value(run8("approx(2)^-30000"));
  value(run8("2^-28000"));
  // The exponent bound is checked first: a product past both is overflow.
  const both = "3^32767 * (7^21845 * 1e999999999999980000)";
  assert.deepEqual(failure(run8(both)), {
    kind: "overflow",
    span: { start: 0, end: both.length },
  });
  // In decimal mode every result is settled, and none is refused for size.
  for (const text of [
    "3^32767 * 7^21845",
    "3^32767 / 7^21845 / 11^16383",
    powers,
    "1/3^32767 + 1/7^21845",
    "2^-30000",
    "1/2^30000",
    both.replace(" * 1e999999999999980000", ""),
  ]) {
    value(run8(text, decimal(8, "halfAwayFromZero")));
  }
});

/** Coprime powers, each within the default significand limit. */
const COPRIME_POWERS = [
  3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79,
].map((p) => `${p}^${Math.floor(60000 / BigInt(p).toString(2).length)}`);

/** Asserts that `text` evaluates under `lookup` to exactly `expected`. */
function assertEvaluatesWith(
  lookup: typeof withBuiltins,
  text: string,
  expected: Quantity,
): void {
  const actual = value(evaluate(parsed(text), lookup, PRIMITIVES, CONTEXT));
  assert.deepEqual(actual.magnitude, expected.magnitude, text);
  assert.deepEqual(actual.dimension, expected.dimension, text);
}

test('a settled midpoint past the bound is refused in decimal mode and truncated in exact mode (devdocs/numbers.md, "Settling")', () => {
  const lookupWithApprox = lookupIn(UNITS, FUNCTIONS, { approx });
  const withApprox = (text: string, context: NumberContext) =>
    evaluate(parsed(text), lookupWithApprox, PRIMITIVES, context);
  const at8 = decimal(8, "halfAwayFromZero");
  // Eleven nines at 10^18 round to 1e+(10^18 + 1) at eight digits: overflow
  // at the literal, where an earlier version showed it as a value past
  // the bound.
  const nines = "99999999999e999999999999999990";
  assert.deepEqual(failure(run(nines, at8)), {
    kind: "overflow",
    span: { start: 0, end: nines.length },
  });
  // A third of 10^-(10^18) is past the bound, and was a throw at the
  // quotient's settle; it is underflow at the quotient.
  const third = "1e-1000000000000000000 / 3";
  assert.deepEqual(failure(run(third, at8)), {
    kind: "underflow",
    span: { start: 0, end: third.length },
  });
  // In exact mode the settle refuses nothing: forty-five nines, made
  // inexact, round toward zero at the working digits instead of carrying
  // past the top, and the quotient by seven is a value.
  const long = `approx(9.${"9".repeat(44)}e1000000000000000000) / 7`;
  const seventh = value(withApprox(long, at(8)));
  assert.equal(
    format(seventh.magnitude.mid, 8, "halfAwayFromZero"),
    "1.4285714e+1000000000000000000",
  );
  // And a third of 10^-(10^18 - 1) by an inexact three settles at the
  // bottom edge, where its half unit lies past the bound and threw.
  const bottom = value(withApprox("1e-999999999999999999 / approx(3)", at(8)));
  assert.equal(
    format(bottom.magnitude.mid, 8, "halfAwayFromZero"),
    "3.3333333e-1000000000000000000",
  );
});

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
  // A refused value keeps the kind of its refusal.
  assert.deepEqual(failure(runBuiltin("huge(1)")), {
    kind: "overflow",
    span: { start: 0, end: 7 },
  });
  assert.deepEqual(failure(runBuiltin("2 tiny(1)")), {
    kind: "underflow",
    span: { start: 2, end: 9 },
  });
  assert.deepEqual(failure(runBuiltin("long(1)")), {
    kind: "tooLarge",
    span: { start: 0, end: 7 },
    inexact: "exceeds",
    need: { kind: "unknown" },
  });
  // The reach is the built-in's word, carried through: a call that says
  // an inexact argument fits gets its first argument named as the operand,
  // and one that says the value passes anyway gets no operand, whatever
  // the evaluator could have named.
  assert.deepEqual(failure(runBuiltin("longFits(1, 2)")), {
    kind: "tooLarge",
    span: { start: 0, end: 14 },
    inexact: "fits",
    need: { kind: "unknown" },
    operand: { start: 9, end: 10 },
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
  // the working precision (its midpoint is on the decimal grid of the
  // working digits), which the built-in itself did not do. The reference
  // is twice sqrt 2 to 60 digits from Python's decimal module.
  const root = value(runBuiltin("dbl(2^(1/2))"));
  assert.ok(!isExact(root.magnitude));
  assertContains(
    root.magnitude,
    dec("2.82842712474619009760337744841939615713934375075389614635336"),
  );
  const wide = value(runBuiltin("wide(3) m"));
  assert.deepEqual(wide.magnitude, { mid: fr(3n), rad: UNBOUNDED });
});

test("a ^ exponent is reduced by the evaluator within the significand limit, and one past it is too large at the power", () => {
  // The parser hands the pair over unreduced; the reduction here is one
  // gcd of numbers within the limit, so a fraction of long literals that
  // reduces to a small one gets its value: 3c / 2c for a c of ten
  // thousand digits is 3/2, and 2^(3/2) is sqrt(8).
  const c = randomBigInt(key(6601), 33_000) | 1n;
  // sqrt(8) as twice sqrt(2)'s first 76 decimals, exact within 2e-76,
  // well inside the radius at forty digits.
  const sqrt8 = fromRational(
    rational(
      2n *
        14142135623730950488016887242096980785696718753769480731766797379907324784621n,
      10n ** 76n,
    ),
  );
  const power = value(run(`2^(${3n * c}/${2n * c})`));
  assert.ok(!isExact(power.magnitude));
  assertContains(power.magnitude, sqrt8);
  assert.ok(certifies(power.magnitude, DEFAULT_PRECISION, DEFAULT_ROUNDING));
  assert.deepEqual(
    value(run(`m^(${3n * c}/${2n * c})`)).dimension,
    dim({ m: rational(3n, 2n) }),
  );
  assertEvaluates("2^(6/3)", quantity("4"));
  assert.deepEqual(value(run("2^(12/8)")), value(run("2^(3/2)")));
  // The quotient is taken as Scaled values, whose powers of ten cancel
  // for nothing, so a pair of long powers of ten is its value at any
  // limit; and the fraction is formed within the limit, as pow forms an
  // exact exponent, so a tiny exponent is refused at the default, where
  // pow(2, 1e-30000) goes to log space instead (devdocs/numbers.md,
  // "Roots and powers"; the disagreement is #88).
  const small = { ...CONTEXT, significandLimitBits: 64 };
  assert.deepEqual(value(run("2^(1e30/1e30)", small)), quantity("2"));
  assertEvaluates("2^(1e30000/1e30000)", quantity("2"));
  assertEvaluates("2^(1e20000/1e19999)", quantity("1024"));
  assertEvaluates("m^(1e30000/2e30000)", quantity("1", { m: half }));
  // An exponent that cannot be formed: its own bits pass the limit, which
  // no base changes, so no operand is named.
  // The need is the exponent's as a fraction: one over `10^30000`.
  assert.deepEqual(failure(run("2^1e-30000")), {
    kind: "tooLarge",
    span: { start: 0, end: 10 },
    inexact: "exceeds",
    need: { kind: "bound", bits: 1 + bitsOfTens(30000) },
  });
  // The need is the quotient's bound: the bits of 10^30 and of one.
  assert.deepEqual(failure(run("m^(1e30/7)", small)), {
    kind: "tooLarge",
    span: { start: 0, end: 10 },
    inexact: "exceeds",
    need: { kind: "bound", bits: bitLength(10n ** 30n) + 1 },
  });
  assert.deepEqual(
    value(run("m^(1e30/7)", { ...CONTEXT, significandLimitBits: 128 }))
      .dimension,
    dim({ m: rational(10n ** 30n, 7n) }),
  );
  // 2^(1e30/7) is past the bound at any limit, and says so.
  assert.deepEqual(failure(run("2^(1e30/7)", small)), {
    kind: "overflow",
    span: { start: 0, end: 10 },
  });
  // One whose power would pass the bound is refused at the bound, as
  // pow's is, when the fraction cannot be formed.
  assert.deepEqual(failure(run("2^(1e300000/1e-300000)")), {
    kind: "overflow",
    span: { start: 0, end: 22 },
  });
  assert.deepEqual(failure(run("0.5^(1e300000/1e-300000)")), {
    kind: "underflow",
    span: { start: 0, end: 24 },
  });
  // A literal's significand past the limit is too large at the power before
  // any gcd runs, as devdocs/numbers.md ("The significand limit") asks of
  // what can be bounded before forming: two
  // literals of 314,000 digits at the default limit, in milliseconds,
  // and at a small limit a literal of 23 digits.
  const literal = (seed: number) => {
    let text = "";
    while (text.length < 314_000) {
      text += randomBigInt(key(seed + text.length), 3000).toString();
    }
    return text.slice(0, 314_000).replace(/^0+/, "1");
  };
  const long = `2^(${literal(3)}/${literal(4)})`;
  const start = performance.now();
  // An exponent that cannot be formed: `exceeds`, with no operand named,
  // and the need the exponent's bits, measured: the larger literal's.
  assert.deepEqual(failure(run(long)), {
    kind: "tooLarge",
    span: { start: 0, end: long.length },
    inexact: "exceeds",
    need: {
      kind: "exact",
      bits: Math.max(
        bitLength(BigInt(literal(3))),
        bitLength(BigInt(literal(4))),
      ),
    },
  });
  const ms = performance.now() - start;
  assert.ok(ms < 2000, `refused in ${ms.toFixed(0)} ms`);
  // The literal's own bits are the need, measured.
  const literalNeed = {
    kind: "exact",
    bits: bitLength(12345678901234567890123n),
  };
  assert.deepEqual(failure(run("2^(12345678901234567890123/3)", small)), {
    kind: "tooLarge",
    span: { start: 0, end: 29 },
    inexact: "exceeds",
    need: literalNeed,
  });
  assert.deepEqual(failure(run("3 m^(2/12345678901234567890123)", small)), {
    kind: "tooLarge",
    span: { start: 2, end: 31 },
    inexact: "exceeds",
    need: literalNeed,
  });
});

// ---------------------------------------------------------------------------
// Conditions: comparisons on balls

test('a comparison on balls gives each verdict of the table of devdocs/functions.md ("The check at a call")', () => {
  // `[1, 2]`: a radius of a power of two, so that its ends are exact.
  const ball: Ball = { mid: dec("1.5"), rad: powerOfTwoRadius(-1n) };
  const verdicts = (a: Ball, b: Ball) =>
    (["<", "<=", ">", ">="] as const).map((op) => decide(a, op, b, CONTEXT));
  // Below throughout, and its upper end exactly on the bound.
  assert.deepEqual(verdicts(ball, exact(dec("3"))), [
    "holds",
    "holds",
    "fails",
    "fails",
  ]);
  assert.deepEqual(verdicts(ball, exact(dec("2"))), [
    "undecided",
    "holds",
    "fails",
    "undecided",
  ]);
  // Exactly equal, as two exact sides are.
  assert.deepEqual(verdicts(exact(dec("2")), exact(dec("2"))), [
    "fails",
    "holds",
    "fails",
    "holds",
  ]);
  // Above, its lower end exactly on the bound, and throughout.
  assert.deepEqual(verdicts(ball, exact(dec("1"))), [
    "fails",
    "undecided",
    "undecided",
    "holds",
  ]);
  assert.deepEqual(verdicts(ball, exact(dec("0"))), [
    "fails",
    "fails",
    "holds",
    "holds",
  ]);
  // Across it, and unbounded.
  const across = ["undecided", "undecided", "undecided", "undecided"];
  assert.deepEqual(verdicts(ball, exact(dec("1.5"))), across);
  assert.deepEqual(
    verdicts({ mid: dec("1.5"), rad: UNBOUNDED }, exact(dec("100"))),
    across,
  );
  // An exact side on the left is placed against the inexact one, the
  // other way round.
  assert.deepEqual(verdicts(exact(dec("2")), ball), [
    "fails",
    "undecided",
    "undecided",
    "holds",
  ]);
  // Two inexact sides, by their difference.
  const far: Ball = { mid: dec("5"), rad: powerOfTwoRadius(-1n) };
  assert.deepEqual(verdicts(ball, far), ["holds", "holds", "fails", "fails"]);
  const near: Ball = { mid: dec("1.75"), rad: powerOfTwoRadius(-1n) };
  assert.deepEqual(verdicts(ball, near), across);
});

test("two exact values compare exactly, past the significand limit and the exponent bound, and are never refused", () => {
  const digits = "7".repeat(400);
  const big = exact(dec(digits));
  const bigger = exact(dec(`${digits}1e-1`));
  assert.equal(decide(big, "<", bigger, CONTEXT), "holds");
  assert.equal(decide(bigger, "<=", big, CONTEXT), "fails");
  assert.equal(decide(big, ">=", big, CONTEXT), "holds");
  // Their difference could not be formed, nor aligned.
  const top = exact(dec("1e999999999"));
  const bottom = exact(dec("-1e-999999999"));
  assert.equal(decide(top, ">", bottom, CONTEXT), "holds");
  assert.equal(decide(bottom, ">", top, CONTEXT), "fails");
});
