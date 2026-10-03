import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { containsZero, exact, isExact, rootBall, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { show } from "../display.ts";
import { convertText, evaluateText } from "../pipeline.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  compareRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusUpper,
} from "../radius.ts";
import { rational } from "../rational.ts";
import type { Result } from "../result.ts";
import { ZERO, compare, fromRational, type Scaled } from "../scaled.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import { describeConversionError, describeTextError } from "../../messages.ts";
import { approx, approxBall } from "./approx.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function value<E>(result: Result<Ball, E>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** The radius of the bounded `b` as a `Scaled`. */
function radiusOf(b: Ball): Scaled {
  return fromRational(radiusUpper(b.rad));
}

test("approx takes one argument of any dimension and keeps it", () => {
  assert.equal(approx.name, "approx");
  assert.deepEqual(approx.arity, { min: 1, max: 1 });
  const primitives = new Map([
    ["m", "dimension" as const],
    ["radian", "kind" as const],
  ]);
  assert.deepEqual(approx.dimensions([DIMENSIONLESS], primitives), {
    ok: true,
    value: DIMENSIONLESS,
  });
  const metre = primitive("m");
  assert.deepEqual(approx.dimensions([metre], primitives), {
    ok: true,
    value: metre,
  });
  const angle = primitive("radian");
  assert.deepEqual(approx.dimensions([angle], primitives), {
    ok: true,
    value: angle,
  });
});

test("approx gives an exact value the working radius and never narrows an inexact one", () => {
  // An exact value gains one unit in the last of the working digits at
  // its magnitude: eighteen digits at a precision of eight, so 2.54 is
  // within 1e-17, and 1e999999999 within 1e999999982.
  assert.equal(workingDigits(CONTEXT), 18);
  const exactValue = value(approxBall(exact(dec("2.54")), CONTEXT));
  assert.deepEqual(exactValue.mid, dec("2.54"));
  assert.ok(!isExact(exactValue));
  assert.ok(compare(radiusOf(exactValue), dec("1e-17")) >= 0);
  assert.ok(compare(radiusOf(exactValue), dec("1.00000001e-17")) < 0);
  // At the bottom of the exponent bound the unit of the last working digit
  // lies past the bound; it is taken as a radius without being formed (#44).
  const bottom = value(
    approxBall(exact(dec("1e-999999999999999999")), CONTEXT),
  );
  assert.deepEqual(bottom.mid, dec("1e-999999999999999999"));
  assert.ok(!isExact(bottom));
  assert.ok(
    compareRadius(bottom.rad, radiusAboveScaled(dec("1e-999999999999999999"))) <
      0,
  );
  const huge = value(approxBall(exact(dec("1e999999999")), CONTEXT));
  assert.deepEqual(huge.mid, dec("1e999999999"));
  assert.deepEqual(
    huge.rad,
    value(approxBall(exact(dec("1e999999999")), CONTEXT)).rad,
  );
  assert.ok(!isExact(huge));
  // An inexact value whose radius is larger keeps it: a root at eight
  // digits has a radius of about 1e-17, and a wide ball its width.
  const root = value(rootBall(exact(fr(2n)), 2n, CONTEXT));
  const wide = ball(dec("1.5"), dec("0.25"));
  assert.deepEqual(value(approxBall(wide, CONTEXT)), wide);
  const approxRoot = value(approxBall(root, CONTEXT));
  assert.deepEqual(approxRoot.mid, root.mid);
  assert.ok(compare(radiusOf(approxRoot), radiusOf(root)) >= 0);
  // One whose radius is smaller is widened to the unit.
  const narrow = ball(dec("1.5"), dec("1e-30"));
  const widened = value(approxBall(narrow, CONTEXT));
  assert.deepEqual(widened.mid, narrow.mid);
  assert.ok(compare(radiusOf(widened), dec("1e-17")) >= 0);
  // approx of an approx is the same ball.
  assert.deepEqual(value(approxBall(exactValue, CONTEXT)), exactValue);
  assert.deepEqual(value(approxBall(widened, CONTEXT)), widened);
  // Zero and an unbounded argument are unchanged.
  assert.deepEqual(value(approxBall(exact(ZERO), CONTEXT)), exact(ZERO));
  const aroundZero: Ball = { mid: ZERO, rad: radiusAbove(rational(1n, 10n)) };
  assert.deepEqual(value(approxBall(aroundZero, CONTEXT)), aroundZero);
  const unbounded: Ball = { mid: fr(3n), rad: UNBOUNDED };
  assert.deepEqual(value(approxBall(unbounded, CONTEXT)), unbounded);
  // In decimal mode the working digits are the user's p.
  const decimal = value(
    approxBall(exact(dec("2.54")), { ...CONTEXT, mode: "decimal" }),
  );
  assert.ok(compare(radiusOf(decimal), dec("1e-7")) >= 0);
  assert.ok(compare(radiusOf(decimal), dec("1.00000001e-7")) < 0);
  assert.deepEqual(exact(ZERO).rad, ZERO_RADIUS);
});

test("through the pipeline: approx makes a value inexact on purpose, keeps its units, and never narrows", () => {
  const parsed = parseDefinitions(
    [
      "m     !",
      "cm    0.01 m",
      "in    2.54 cm",
      "ft    12 in",
      "G     approx(6.674e-11) m^3",
      "gauge(x) = approx(x)",
    ].join("\n"),
  );
  assert.ok(parsed.ok, inspect(parsed));
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const at = (have: string, want: string, precision = 8) =>
    convertText(table.value, have, want, { ...context, precision });
  // approx(2.54) cm in in is ≈ 1 certified on the first pass, where
  // 2.54 cm in in is = 1.
  const one = at("approx(2.54) cm", "in");
  assert.ok(one.ok && one.value.kind === "unit", inspect(one));
  assert.deepEqual(show(one.value.value, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "1",
  });
  const exactOne = at("2.54 cm", "in");
  assert.ok(exactOne.ok && exactOne.value.kind === "unit");
  assert.equal(show(exactOne.value.value, 8, DEFAULT_ROUNDING).kind, "exact");
  // approx(1e999999999) + 1 is ≈ 1e+999999999: the 1 is absorbed.
  const huge = evaluateText(table.value, "approx(1e999999999) + 1", context);
  assert.ok(huge.ok, inspect(huge));
  assert.deepEqual(show(huge.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "1e+999999999",
  });
  // approx(0.1) + approx(0.2) - approx(0.3) is a zero with a bound at the
  // ceiling.
  const identity = evaluateText(
    table.value,
    "approx(0.1) + approx(0.2) - approx(0.3)",
    context,
  );
  assert.ok(identity.ok, inspect(identity));
  assert.ok(containsZero(identity.value.magnitude));
  const shownIdentity = show(identity.value.magnitude, 8, DEFAULT_ROUNDING);
  assert.equal(shownIdentity.kind, "zero");
  // approx(1 ft) in in is ≈ 12: the dimension is the argument's.
  const foot = at("approx(1 ft)", "in");
  assert.ok(foot.ok && foot.value.kind === "unit", inspect(foot));
  assert.deepEqual(show(foot.value.value, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "12",
  });
  // approx(1/3) at eight digits is ≈ 0.33333333, certified.
  const third = evaluateText(table.value, "approx(1/3)", context);
  assert.ok(third.ok, inspect(third));
  assert.deepEqual(show(third.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "0.33333333",
  });
  // approx(2) in decimal mode is 2 within one unit in the last digit.
  const decimal = evaluateText(table.value, "approx(2)", {
    ...context,
    mode: "decimal",
  });
  assert.ok(decimal.ok, inspect(decimal));
  assert.deepEqual(decimal.value.magnitude.mid, fr(2n));
  assert.ok(!isExact(decimal.value.magnitude));
  assert.ok(compare(radiusOf(decimal.value.magnitude), dec("1e-7")) >= 0);
  assert.ok(compare(radiusOf(decimal.value.magnitude), dec("1.1e-7")) < 0);
  // A definition calling approx builds, and a conversion through it is ≈.
  const constant = at("G", "m^3");
  assert.ok(constant.ok && constant.value.kind === "unit", inspect(constant));
  assert.deepEqual(show(constant.value.value, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "6.674e-11",
  });
  const gauged = at("gauge(3)", "1");
  assert.ok(gauged.ok && gauged.value.kind === "unit", inspect(gauged));
  assert.deepEqual(show(gauged.value.value, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "3",
  });
  // The arity errors, worded.
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "approx()",
      '"approx" takes 1 argument, but "approx()" gives no arguments.',
    ],
    [
      "approx(1, 2)",
      '"approx" takes 1 argument, but "approx(1, 2)" gives 2 arguments.',
    ],
  ]) {
    const result = evaluateText(table.value, text!, context);
    assert.ok(!result.ok, text);
    assert.equal(
      describeTextError(result.error, text!, primitives),
      message,
      text,
    );
  }
  const wantError = at("1 m", "approx()");
  assert.ok(!wantError.ok);
  assert.equal(
    describeConversionError(wantError.error, "1 m", "approx()", primitives),
    '"approx" takes 1 argument, but "approx()" gives no arguments.',
  );
});
