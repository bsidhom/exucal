import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, rootBall, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import type { BuiltinError } from "../builtin.ts";
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
import { UNBOUNDED, radiusUpper } from "../radius.ts";
import { LIMIT_BITS } from "../rational.ts";
import type { Result } from "../result.ts";
import {
  ZERO,
  absolute,
  compare,
  fromRational,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { cbrt, rootOf, sqrt } from "./roots.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function value(result: Result<Ball, BuiltinError>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

function failure(result: Result<Ball, BuiltinError>): BuiltinError {
  assert.ok(!result.ok, inspect(result));
  return result.error;
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

/** Asserts that `ball` contains `reference` and its radius is below `10^-digits`. */
function assertNear(
  ball: Ball,
  reference: Scaled,
  digits: number,
  label: string,
) {
  assert.ok(
    compare(distance(ball.mid, reference), radiusOf(ball)) <= 0,
    `${label}: midpoint`,
  );
  assert.ok(
    compare(radiusOf(ball), dec(`1e-${digits}`)) < 0,
    `${label}: radius`,
  );
}

// References from Python's decimal module.
const SQRT2 = dec(
  "1.4142135623730950488016887242096980785696718753769480731766797379907324784621",
);
const CBRT2 = dec(
  "1.2599210498948731647672106072782283505702514647015079800819751121552996765139",
);

test("sqrt and cbrt are plain numbers to a plain number, of one argument", () => {
  for (const [fn, name] of [
    [sqrt, "sqrt"],
    [cbrt, "cbrt"],
  ] as const) {
    assert.equal(fn.name, name);
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.deepEqual(fn.dimensions([DIMENSIONLESS], new Map()), {
      ok: true,
      value: DIMENSIONLESS,
    });
    assert.equal(BUILTINS.get(name), fn);
  }
});

test("the roots are rootBall under a name: the exact cases of ^(1/2) and ^(1/3), and the kernel otherwise", () => {
  assert.deepEqual(
    value(rootOf(exact(fr(9n, 4n)), 2n, CONTEXT)),
    exact(fr(3n, 2n)),
  );
  assert.deepEqual(
    value(sqrt.apply([exact(fr(9n, 4n))], CONTEXT)),
    exact(fr(3n, 2n)),
  );
  assert.deepEqual(value(sqrt.apply([exact(ZERO)], CONTEXT)), exact(ZERO));
  assert.deepEqual(
    value(cbrt.apply([exact(fr(-8n))], CONTEXT)),
    exact(fr(-2n)),
  );
  assert.deepEqual(
    value(cbrt.apply([exact(fr(27n, 1000n))], CONTEXT)),
    exact(fr(3n, 10n)),
  );
  const two = value(sqrt.apply([exact(fr(2n))], CONTEXT));
  assert.ok(!isExact(two));
  assertNear(two, SQRT2, 45, "sqrt(2)");
  const direct = rootBall(exact(fr(2n)), 2n, CONTEXT);
  assert.ok(direct.ok);
  assert.deepEqual(two, direct.value);
  const cube = value(cbrt.apply([exact(fr(2n))], CONTEXT));
  assertNear(cube, CBRT2, 45, "cbrt(2)");
  const negative = value(cbrt.apply([exact(fr(-2n))], CONTEXT));
  assert.ok(compare(negative.mid, ZERO) < 0);
  assertNear(
    negative,
    dec(
      "-1.2599210498948731647672106072782283505702514647015079800819751121552996765139",
    ),
    45,
    "cbrt(-2)",
  );
  // An inexact argument's root contains the roots of its ends.
  const wide = value(sqrt.apply([ball(fr(2n), dec("1e-20"))], CONTEXT));
  assertNear(wide, SQRT2, 19, "sqrt(2 ± 1e-20)");
  assert.ok(compare(radiusOf(wide), dec("3.5e-21")) > 0);
});

test("the errors are the root's: an even root of a negative value, and a ball straddling zero", () => {
  assert.deepEqual(failure(sqrt.apply([exact(fr(-1n))], CONTEXT)), {
    kind: "negativeRadicand",
    degree: 2n,
  });
  assert.deepEqual(failure(sqrt.apply([ball(fr(-2n), dec("0.1"))], CONTEXT)), {
    kind: "negativeRadicand",
    degree: 2n,
  });
  assert.deepEqual(
    failure(sqrt.apply([ball(dec("0.1"), dec("0.2"))], CONTEXT)),
    { kind: "unresolved", argument: 0, edge: ZERO },
  );
  // The cube root of a ball around zero is a ball around zero.
  const around = value(cbrt.apply([ball(dec("0.1"), dec("0.2"))], CONTEXT));
  assert.deepEqual(around.mid, ZERO);
  assert.ok(compare(radiusOf(around), dec("0.66")) > 0);
  assert.ok(compare(radiusOf(around), dec("0.68")) < 0);
  // Unbounded arguments give the root of the midpoint, unbounded.
  const unbounded = value(
    sqrt.apply([{ mid: fr(4n), rad: UNBOUNDED }], CONTEXT),
  );
  assert.deepEqual(unbounded, { mid: fr(2n), rad: UNBOUNDED });
});

test("through the pipeline: sqrt(2) certifies, sqrt(9/4) m is exact, and the errors are worded as the power's", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const two = evaluateText(table.value, "sqrt(2)", {
    ...context,
    precision: 30,
  });
  assert.ok(two.ok, inspect(two));
  const shown = show(two.value.magnitude, {
    digits: 30,
    rounding: DEFAULT_ROUNDING,
  });
  assert.equal(shown.kind, "certified");
  assert.equal(shown.text, "1.41421356237309504880168872421");
  const exactCase = evaluateText(table.value, "sqrt(9/4) m", {
    ...context,
    precision: 8,
  });
  assert.ok(exactCase.ok && isExact(exactCase.value.magnitude));
  assert.deepEqual(exactCase.value.magnitude.mid, fr(3n, 2n));
  const primitives = table.value.primitives;
  for (const [text, message] of [
    ["sqrt(-1)", '"sqrt(-1)" takes an even root of a negative value.'],
    ["(-1)^(1/2)", '"(-1)^(1/2)" takes an even root of a negative value.'],
    [
      "sqrt((2^(1/2))^2 - 2)",
      '"(2^(1/2))^2 - 2" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
    ],
    [
      "sqrt(1 m)",
      'Cannot apply "sqrt" to "1 m": "1 m" has dimension m, but the argument of "sqrt" must be a plain number.',
    ],
  ]) {
    const result = evaluateText(table.value, text!, {
      ...context,
      precision: 8,
    });
    assert.ok(!result.ok, text);
    assert.equal(
      describeTextError(result.error, text!, primitives),
      message,
      text,
    );
  }
  // cbrt of a value straddling zero is a value around zero, not an error.
  const cube = evaluateText(table.value, "cbrt((2^(1/2))^2 - 2)", {
    ...context,
    precision: 8,
  });
  assert.ok(cube.ok, inspect(cube));
  // A root at the bottom of the exponent bound: the power of ten the root
  // takes off overshoots the exponent by up to the degree less one, and
  // was refused past the bound where only its radius was needed (#44).
  for (const [text, digits] of [
    ["cbrt(1e-1000000000000000000)", "4.6415888e-333333333333333334"],
    ["cbrt(2e-1000000000000000000)", "5.8480355e-333333333333333334"],
    ["pow(2e-1000000000000000000, 1/7)", "7.945974e-142857142857142858"],
  ]) {
    const result = evaluateText(table.value, text!, {
      ...context,
      precision: 8,
    });
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, { digits: 8, rounding: DEFAULT_ROUNDING }),
      { kind: "certified", text: digits },
      text,
    );
  }
});
