import assert from "node:assert/strict";
import { bitsOfTens } from "./scaled.ts";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact } from "./ball.ts";
import { angle, checkArgument, plainNumbers, type Builtin } from "./builtin.ts";
import {
  DIMENSIONLESS,
  primitive,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import {
  dimensionOf,
  type DimensionError,
  type DimensionLookup,
} from "./dimension-of.ts";
import { parseExpr, type Expr } from "./expr.ts";
import type { Quantity } from "./quantity.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  rational,
  type Rational,
} from "./rational.ts";
import { err, ok, type Result } from "./result.ts";
import { ONE } from "./scaled.ts";
import type { Span } from "./span.ts";
import type { UnitFunction } from "./table.ts";

const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  ["s", "dimension"],
  ["K", "dimension"],
  ["radian", "kind"],
]);

function dim(exponents: Record<string, number | Rational>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [
      name,
      typeof e === "number" ? rational(BigInt(e)) : e,
    ]),
  );
}

function parsed(text: string): Expr {
  const result = parseExpr(text);
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** A quantity of one, in `dimension`: what a declared unit holds. */
function one(dimension: Dimension): Quantity {
  return { magnitude: exact(ONE), dimension };
}

/** `tempC` as the table would hold it: a plain number to a temperature. */
const TEMP_C: UnitFunction = {
  name: "tempC",
  parameters: [
    {
      name: "x",
      unit: { text: "1", expr: parsed("1"), quantity: one(DIMENSIONLESS) },
    },
  ],
  result: dim({ K: 1 }),
  conditions: [],
  body: parsed("x K + 273.15 K"),
  inverse: { parameter: "y", conditions: [], body: parsed("y / K - 273.15") },
};

/** Two built-ins: a plain number to a plain number, and an angle to a plain number. */
const DBL: Builtin = {
  name: "dbl",
  arity: { min: 1, max: 1 },
  dimensions: plainNumbers(1),
  apply: ([x]) => ok(x!),
};
const ANG: Builtin = {
  name: "ang",
  arity: { min: 1, max: 1 },
  dimensions: (args, primitives) => {
    const radian = angle(primitives);
    if (radian === undefined) return err({ kind: "noAngles" });
    const checked = checkArgument(args, 0, radian, primitives);
    return checked.ok ? ok(DIMENSIONLESS) : checked;
  },
  apply: ([x]) => ok(x!),
};

type UnknownName = {
  readonly kind: "unknownUnit" | "unknownFunction";
  readonly name: string;
  readonly span: Span;
};

const UNITS: Record<string, Dimension> = {
  m: dim({ m: 1 }),
  cm: dim({ m: 1 }),
  s: dim({ s: 1 }),
  K: dim({ K: 1 }),
  radian: dim({ radian: 1 }),
  deg: dim({ radian: 1 }),
  N: dim({ m: 1, s: -2 }),
};

/** A lookup over the dimensions above, with `x` bound to `bound` when given. */
function lookupWith(bound?: Dimension): DimensionLookup<UnknownName> {
  return {
    unit: (name, span) => {
      if (name === "x" && bound !== undefined) return ok(bound);
      const unit = Object.hasOwn(UNITS, name) ? UNITS[name] : undefined;
      return unit === undefined
        ? err({ kind: "unknownUnit", name, span })
        : ok(unit);
    },
    function: (name, span) => {
      if (name === "tempC") return ok({ kind: "defined", fn: TEMP_C });
      if (name === "dbl") return ok({ kind: "builtin", fn: DBL });
      if (name === "ang") return ok({ kind: "builtin", fn: ANG });
      return err({ kind: "unknownFunction", name, span });
    },
  };
}

type Failure = UnknownName | DimensionError;

function of(
  text: string,
  bound?: Dimension,
  significandLimitBits = MAX_SIGNIFICAND_LIMIT_BITS,
): Result<Dimension, Failure> {
  return dimensionOf(
    parsed(text),
    lookupWith(bound),
    PRIMITIVES,
    significandLimitBits,
  );
}

function value(
  text: string,
  bound?: Dimension,
  significandLimitBits?: number,
): Dimension {
  const result = of(text, bound, significandLimitBits);
  assert.ok(result.ok, `${text}: ${inspect(result)}`);
  return result.value;
}

function failing(
  text: string,
  bound?: Dimension,
  significandLimitBits?: number,
): Failure {
  const result = of(text, bound, significandLimitBits);
  assert.ok(!result.ok, `${text}: expected a failure`);
  return result.error;
}

test("a number is dimensionless, a unit is its dimension, and the operators combine them", () => {
  assert.deepEqual(value("2"), DIMENSIONLESS);
  assert.deepEqual(value("m"), dim({ m: 1 }));
  assert.deepEqual(value("2 m"), dim({ m: 1 }));
  assert.deepEqual(value("N s^2 / m"), DIMENSIONLESS);
  assert.deepEqual(value("m^(1/2)"), dim({ m: rational(1n, 2n) }));
  assert.deepEqual(value("-3 m / s"), dim({ m: 1, s: -1 }));
  assert.deepEqual(value("m + 2 cm"), dim({ m: 1 }));
  assert.deepEqual(value("m - cm"), dim({ m: 1 }));
  // The value never matters: a body that fails at a value has a dimension.
  assert.deepEqual(value("1 / (x - 1)", DIMENSIONLESS), DIMENSIONLESS);
  assert.deepEqual(value("m / 0"), dim({ m: 1 }));
  assert.deepEqual(value("(x - 1 m)^-1", dim({ m: 1 })), dim({ m: -1 }));
});

test("a sum whose operands do not conform fails as the evaluator's does, at the sum", () => {
  const text = "2 m + 3 s";
  assert.deepEqual(failing(text), {
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
  const kinds = failing("radian - 1");
  assert.ok(kinds.kind === "nonconformingOperands" && kinds.op === "sub");
  assert.equal(kinds.mismatch.kind, "kindMismatch");
});

test("a call applies the callee's rule: a defined function's declaration, a built-in's dimensions", () => {
  assert.deepEqual(value("tempC(20)"), dim({ K: 1 }));
  assert.deepEqual(value("tempC(x) / K", DIMENSIONLESS), DIMENSIONLESS);
  assert.deepEqual(value("dbl(3)"), DIMENSIONLESS);
  assert.deepEqual(value("ang(2 deg) m"), dim({ m: 1 }));
  assert.deepEqual(value("dbl(tempC(1) / K)"), DIMENSIONLESS);
  assert.deepEqual(failing("tempC(1 m)"), {
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
  assert.deepEqual(failing("tempC(1, 2)"), {
    kind: "arityMismatch",
    name: "tempC",
    span: { start: 0, end: 11 },
    expected: { min: 1, max: 1 },
    given: 2,
  });
  assert.deepEqual(failing("dbl()").kind, "arityMismatch");
  const rule = failing("dbl(2 m)");
  assert.ok(rule.kind === "builtinArgument");
  assert.deepEqual(rule.arguments, [{ start: 4, end: 7 }]);
  assert.equal(rule.error.kind, "argumentDimension");
  const plain = failing("ang(1)");
  assert.ok(
    plain.kind === "builtinArgument" &&
      plain.error.kind === "argumentDimension",
  );
  assert.deepEqual(plain.error.want, primitive("radian"));
});

test("a lookup's failure comes back unchanged, from wherever it is in the tree", () => {
  assert.deepEqual(failing("2 bogus / s"), {
    kind: "unknownUnit",
    name: "bogus",
    span: { start: 2, end: 7 },
  });
  assert.deepEqual(failing("dbl(nosuch(1))"), {
    kind: "unknownFunction",
    name: "nosuch",
    span: { start: 4, end: 10 },
  });
  // The first failure, left to right, ends it.
  assert.equal(failing("bogus + 1 / 0").kind, "unknownUnit");
});

test("a ^ exponent is reduced within the significand limit, and one past it fails at the power", () => {
  // The exponent travels as its two literals (the plan's H.9, issue #66)
  // and is reduced here as the evaluator reduces it: `m^(6/4)` is
  // `m^(3/2)`, the powers of ten cancel, and a literal past the limit or
  // a fraction that cannot be formed within it is `tooLarge` at the
  // power, so a body with such a power fails the build where the call
  // would fail.
  assert.deepEqual(value("m^(6/4)"), new Map([["m", rational(3n, 2n)]]));
  assert.deepEqual(value("m^(6/3)"), new Map([["m", rational(2n)]]));
  assert.deepEqual(
    value("m^(1e30/1e30)", undefined, 64),
    new Map([["m", rational(1n)]]),
  );
  // The need is the exponent's as a fraction: `10^30` over three.
  assert.deepEqual(failing("m^(1e30/3)", undefined, 64), {
    kind: "tooLarge",
    span: { start: 0, end: 10 },
    inexact: "exceeds",
    need: { kind: "bound", bits: 1 + bitsOfTens(30) },
  });
  assert.deepEqual(failing("s m^(2/1e30)", undefined, 64), {
    kind: "tooLarge",
    span: { start: 2, end: 12 },
    inexact: "exceeds",
    need: { kind: "bound", bits: 1 + bitsOfTens(30) },
  });
  assert.ok(of("m^(1e30/3)", undefined, 128).ok);
});
