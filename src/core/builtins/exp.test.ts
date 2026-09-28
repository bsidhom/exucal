import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, expFits, isExact, radiusBound, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED, radiusAbove, radiusUpper } from "../radius.ts";
import {
  ONE,
  absolute,
  compare,
  rational,
  subtract,
  type Rational,
} from "../rational.ts";
import { parseFraction } from "../../testing/fraction.ts";
import { exp, expBall } from "./exp.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function dec(text: string): Rational {
  const result = parseFraction(text);
  assert.ok(result.ok);
  return result.value;
}

function value(result: ReturnType<typeof expBall>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** e to 60 digits, from Python's decimal module. */
const E = dec(
  "2.718281828459045235360287471352662497757247093699959574966967627724",
);

test("exp is a plain number to a plain number, of one argument", () => {
  assert.equal(exp.name, "exp");
  assert.deepEqual(exp.arity, { min: 1, max: 1 });
  assert.deepEqual(exp.dimensions([DIMENSIONLESS], new Map()), {
    ok: true,
    value: DIMENSIONLESS,
  });
  assert.equal(BUILTINS.get("exp"), exp);
});

test("exp(0) is exactly one, exp(1) is e from the memo, and a neighbor of zero is inexact", () => {
  assert.deepEqual(value(expBall(exact(rational(0n)), CONTEXT)), exact(ONE));
  const e = value(expBall(exact(ONE), CONTEXT));
  assert.ok(!isExact(e));
  assert.ok(compare(absolute(subtract(e.mid, E)), radiusUpper(e.rad)) <= 0);
  assert.ok(compare(radiusUpper(e.rad), rational(1n, 10n ** 48n)) < 0);
  const near = value(expBall(exact(dec("1e-30")), CONTEXT));
  assert.ok(!isExact(near));
  assert.ok(
    compare(
      absolute(subtract(near.mid, dec("1.000000000000000000000000000001"))),
      radiusUpper(near.rad),
    ) <= 0,
  );
});

test("an inexact argument's exponential contains the exponentials of its ends", () => {
  const x: Ball = { mid: rational(2n), rad: radiusAbove(dec("1e-20")) };
  const result = value(expBall(x, CONTEXT));
  // e^2 = 7.38905609893065022723042746057500781318031557055184732408712782...
  const e2 = dec(
    "7.38905609893065022723042746057500781318031557055184732408712782",
  );
  assert.ok(
    compare(absolute(subtract(result.mid, e2)), radiusUpper(result.rad)) <= 0,
  );
  // The radius covers the argument's: about e^2 × 1e-20.
  assert.ok(compare(radiusUpper(result.rad), dec("7e-20")) > 0);
  assert.ok(compare(radiusUpper(result.rad), dec("8e-20")) < 0);
});

test("an unbounded argument gives an unbounded exponential of its midpoint", () => {
  const result = value(expBall({ mid: rational(1n), rad: UNBOUNDED }, CONTEXT));
  assert.deepEqual(result.rad, UNBOUNDED);
  assert.ok(
    compare(absolute(subtract(result.mid, E)), rational(1n, 10n ** 45n)) < 0,
  );
});

test("an argument whose exponential would exceed the range limit is tooLarge, either way from one", () => {
  for (const x of ["1e6", "-1e6", "50000", "-50000"]) {
    assert.deepEqual(expBall(exact(dec(x)), CONTEXT), {
      ok: false,
      error: { kind: "tooLarge" },
    });
  }
  // Within it, on either side.
  assert.ok(expBall(exact(rational(40000n)), CONTEXT).ok);
  assert.ok(expBall(exact(rational(-40000n)), CONTEXT).ok);
  // A wide ball is judged over its whole extent.
  assert.ok(
    !expBall(
      { mid: rational(0n), rad: radiusAbove(rational(10n ** 6n)) },
      CONTEXT,
    ).ok,
  );
  assert.ok(expFits(45000, DEFAULT_MAX_BITS));
  assert.ok(!expFits(46000, DEFAULT_MAX_BITS));
  assert.equal(radiusBound(UNBOUNDED), Infinity);
  assert.equal(radiusBound(radiusAbove(rational(0n))), 0);
  assert.ok(Math.abs(radiusBound(radiusAbove(rational(3n))) - 3) < 1e-6);
});

test("through the pipeline, exp(1) certifies fifty digits on the first pass and exp(1e6) is too large", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const table = buildTable(parsed.value, {
    ...CONTEXT,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  const fifty = evaluateText(table.value, "exp(1)", {
    ...CONTEXT,
    precision: 50,
  });
  assert.ok(fifty.ok, inspect(fifty));
  const shown = show(fifty.value.magnitude, 50, DEFAULT_ROUNDING);
  assert.equal(shown.kind, "certified");
  assert.equal(shown.text, "2.7182818284590452353602874713526624977572470937");
  // The first pass carries the guard beyond the digits asked, so the
  // certification needs no second pass: the radius is below 10^-60.
  assert.ok(
    compare(radiusUpper(fifty.value.magnitude.rad), rational(1n, 10n ** 60n)) <
      0,
  );
  const huge = evaluateText(table.value, "exp(1e6)", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(!huge.ok);
  assert.deepEqual(huge.error, {
    kind: "tooLarge",
    span: { start: 0, end: 8 },
  });
  const zero = evaluateText(table.value, "exp(0) m", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(zero.ok && isExact(zero.value.magnitude));
});
