import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  certifies,
  exact,
  expFits,
  isExact,
  radiusBound,
  type Ball,
} from "../ball.ts";
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
import { LIMIT_BITS, rational } from "../rational.ts";
import {
  absolute,
  compare,
  format,
  fromRational,
  ONE,
  subtract,
  ZERO,
  type Scaled,
} from "../scaled.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import { exp, expBall } from "./exp.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function value(result: ReturnType<typeof expBall>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** `|a - b|` on `Scaled`s of moderate exponent. */
function distance(a: Scaled, b: Scaled): Scaled {
  const d = subtract(a, b, LIMIT_BITS);
  assert.ok(d.ok, `${inspect(a)} - ${inspect(b)} aligns`);
  return absolute(d.value);
}

/** The radius of the bounded `b` as a `Scaled`. */
function radiusOf(b: Ball): Scaled {
  return fromRational(radiusUpper(b.rad));
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
  assert.deepEqual(value(expBall(exact(ZERO), CONTEXT)), exact(ONE));
  const e = value(expBall(exact(ONE), CONTEXT));
  assert.ok(!isExact(e));
  assert.ok(compare(distance(e.mid, E), radiusOf(e)) <= 0);
  assert.ok(compare(radiusOf(e), dec("1e-48")) < 0);
  const near = value(expBall(exact(dec("1e-30")), CONTEXT));
  assert.ok(!isExact(near));
  assert.ok(
    compare(
      distance(near.mid, dec("1.000000000000000000000000000001")),
      radiusOf(near),
    ) <= 0,
  );
});

test("an inexact argument's exponential contains the exponentials of its ends", () => {
  const x = ball(fr(2n), dec("1e-20"));
  const result = value(expBall(x, CONTEXT));
  // e^2 = 7.38905609893065022723042746057500781318031557055184732408712782...
  const e2 = dec(
    "7.38905609893065022723042746057500781318031557055184732408712782",
  );
  assert.ok(compare(distance(result.mid, e2), radiusOf(result)) <= 0);
  // The radius covers the argument's: about e^2 × 1e-20.
  assert.ok(compare(radiusOf(result), dec("7e-20")) > 0);
  assert.ok(compare(radiusOf(result), dec("8e-20")) < 0);
});

test("an unbounded argument gives an unbounded exponential of its midpoint", () => {
  const result = value(expBall({ mid: ONE, rad: UNBOUNDED }, CONTEXT));
  assert.deepEqual(result.rad, UNBOUNDED);
  assert.ok(compare(distance(result.mid, E), dec("1e-45")) < 0);
});

test("an argument whose exponential would exceed the exponent bound is tooLarge, either way from one", () => {
  for (const x of ["1e30", "-1e30", "2.4e18", "-2.4e18"]) {
    assert.deepEqual(expBall(exact(dec(x)), CONTEXT), {
      ok: false,
      error: { kind: "tooLarge" },
    });
  }
  // Within it, on either side: the range of an exponent (4.9), with the
  // digits from Python's decimal module at a precision of 70.
  for (const [x, digits] of [
    ["1e6", "3.0332154e+434294"],
    ["-1e6", "3.2968315e-434295"],
    ["50000", "5.2977952e+21714"],
    ["-50000", "1.8875777e-21715"],
    ["1e18", "4.4784623e+434294481903251827"],
  ] as const) {
    const result = value(expBall(exact(dec(x)), CONTEXT));
    assert.ok(certifies(result, 8, "halfEven"), x);
    assert.equal(format(result.mid, 8, "halfEven"), digits, x);
  }
  const thirty = value(
    expBall(exact(dec("1e6")), { ...CONTEXT, precision: 30 }),
  );
  assert.ok(certifies(thirty, 30, "halfEven"));
  assert.equal(
    format(thirty.mid, 30, "halfEven"),
    "3.03321539680208754508640214142e+434294",
  );
  // A wide ball is judged over its whole extent, and computed over it.
  assert.ok(!expBall(ball(ZERO, dec("1e30")), CONTEXT).ok);
  const wide = value(expBall(ball(ZERO, dec("1e6")), CONTEXT));
  assert.ok(compare(wide.mid, ZERO) > 0);
  assert.ok(expFits(2.3e18));
  assert.ok(!expFits(2.31e18));
  assert.equal(radiusBound(UNBOUNDED), Infinity);
  assert.equal(radiusBound(radiusAbove(rational(0n))), 0);
  assert.ok(Math.abs(radiusBound(radiusAbove(rational(3n))) - 3) < 1e-6);
});

test("through the pipeline, exp(1) certifies fifty digits on the first pass, exp(1e6) is a value and exp(1e30) is too large", () => {
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
  assert.ok(compare(radiusOf(fifty.value.magnitude), dec("1e-60")) < 0);
  const large = evaluateText(table.value, "exp(1e6)", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(large.ok, inspect(large));
  assert.deepEqual(show(large.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "3.0332154e+434294",
  });
  const huge = evaluateText(table.value, "exp(1e30)", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(!huge.ok);
  assert.deepEqual(huge.error, {
    kind: "tooLarge",
    span: { start: 0, end: 9 },
  });
  const zero = evaluateText(table.value, "exp(0) m", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(zero.ok && isExact(zero.value.magnitude));
});
