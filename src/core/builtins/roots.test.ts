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
import { UNBOUNDED, radiusAbove, radiusUpper } from "../radius.ts";
import {
  ZERO,
  absolute,
  compare,
  parseDecimal,
  rational,
  subtract,
  type Rational,
} from "../rational.ts";
import type { Result } from "../result.ts";
import { describeTextError } from "../../messages.ts";
import { cbrt, rootOf, sqrt } from "./roots.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function dec(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok);
  return result.value;
}

function value(result: Result<Ball, BuiltinError>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

function failure(result: Result<Ball, BuiltinError>): BuiltinError {
  assert.ok(!result.ok, inspect(result));
  return result.error;
}

/** Asserts that `ball` contains `reference` and its radius is below `10^-digits`. */
function assertNear(
  ball: Ball,
  reference: Rational,
  digits: number,
  label: string,
) {
  assert.ok(
    compare(absolute(subtract(ball.mid, reference)), radiusUpper(ball.rad)) <=
      0,
    `${label}: midpoint`,
  );
  assert.ok(
    compare(radiusUpper(ball.rad), rational(1n, 10n ** BigInt(digits))) < 0,
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
    value(rootOf(exact(rational(9n, 4n)), 2n, CONTEXT)),
    exact(rational(3n, 2n)),
  );
  assert.deepEqual(
    value(sqrt.apply([exact(rational(9n, 4n))], CONTEXT)),
    exact(rational(3n, 2n)),
  );
  assert.deepEqual(value(sqrt.apply([exact(ZERO)], CONTEXT)), exact(ZERO));
  assert.deepEqual(
    value(cbrt.apply([exact(rational(-8n))], CONTEXT)),
    exact(rational(-2n)),
  );
  assert.deepEqual(
    value(cbrt.apply([exact(rational(27n, 1000n))], CONTEXT)),
    exact(rational(3n, 10n)),
  );
  const two = value(sqrt.apply([exact(rational(2n))], CONTEXT));
  assert.ok(!isExact(two));
  assertNear(two, SQRT2, 45, "sqrt(2)");
  const direct = rootBall(exact(rational(2n)), 2n, CONTEXT);
  assert.ok(direct.ok);
  assert.deepEqual(two, direct.value);
  const cube = value(cbrt.apply([exact(rational(2n))], CONTEXT));
  assertNear(cube, CBRT2, 45, "cbrt(2)");
  const negative = value(cbrt.apply([exact(rational(-2n))], CONTEXT));
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
  const wide = value(
    sqrt.apply(
      [{ mid: rational(2n), rad: radiusAbove(dec("1e-20")) }],
      CONTEXT,
    ),
  );
  assertNear(wide, SQRT2, 19, "sqrt(2 ± 1e-20)");
  assert.ok(compare(radiusUpper(wide.rad), dec("3.5e-21")) > 0);
});

test("the errors are the root's: an even root of a negative value, and a ball straddling zero", () => {
  assert.deepEqual(failure(sqrt.apply([exact(rational(-1n))], CONTEXT)), {
    kind: "negativeRadicand",
    degree: 2n,
  });
  assert.deepEqual(
    failure(
      sqrt.apply(
        [{ mid: rational(-2n), rad: radiusAbove(dec("0.1")) }],
        CONTEXT,
      ),
    ),
    { kind: "negativeRadicand", degree: 2n },
  );
  assert.deepEqual(
    failure(
      sqrt.apply([{ mid: dec("0.1"), rad: radiusAbove(dec("0.2")) }], CONTEXT),
    ),
    { kind: "unresolved", argument: 0, edge: ZERO },
  );
  // The cube root of a ball around zero is a ball around zero.
  const around = value(
    cbrt.apply([{ mid: dec("0.1"), rad: radiusAbove(dec("0.2")) }], CONTEXT),
  );
  assert.deepEqual(around.mid, ZERO);
  assert.ok(compare(radiusUpper(around.rad), dec("0.66")) > 0);
  assert.ok(compare(radiusUpper(around.rad), dec("0.68")) < 0);
  // Unbounded arguments give the root of the midpoint, unbounded.
  const unbounded = value(
    sqrt.apply([{ mid: rational(4n), rad: UNBOUNDED }], CONTEXT),
  );
  assert.deepEqual(unbounded, { mid: rational(2n), rad: UNBOUNDED });
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
  const shown = show(two.value.magnitude, 30, DEFAULT_ROUNDING);
  assert.equal(shown.kind, "certified");
  assert.equal(shown.text, "1.41421356237309504880168872421");
  const exactCase = evaluateText(table.value, "sqrt(9/4) m", {
    ...context,
    precision: 8,
  });
  assert.ok(exactCase.ok && isExact(exactCase.value.magnitude));
  assert.deepEqual(exactCase.value.magnitude.mid, rational(3n, 2n));
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
});
