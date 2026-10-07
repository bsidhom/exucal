import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import { RADIAN, type BuiltinError } from "../builtin.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive, type Primitives } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import {
  UNBOUNDED,
  compareRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusUpper,
} from "../radius.ts";
import { LIMIT_BITS, rational } from "../rational.ts";
import type { Result } from "../result.ts";
import {
  ONE,
  ZERO,
  absolute,
  compare,
  equals,
  fromRational,
  multiply,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball as ballOf, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { cos, cosBall, sin, sinBall, tan, tanBall } from "./trig.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** The default context: eight digits, the default range limit. */
const DEFAULT: NumberContext = { ...CONTEXT, precision: 8 };

/** A metre and the radian kind, as units.txt declares them. */
const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  [RADIAN, "kind"],
]);

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

/** Asserts that `ball` contains `reference` and its radius is below `|reference| × 10^-digits`. */
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
  const bound = multiply(absolute(reference), dec(`1e-${digits}`));
  assert.ok(bound.ok);
  assert.ok(compare(radiusOf(ball), bound.value) < 0, `${label}: radius`);
}

/** A ball of `mid` with the radius `rad`, as decimals. */
function ball(mid: string, rad: string): Ball {
  return ballOf(dec(mid), dec(rad));
}

/** Whether the bounded radius of `b` is below the decimal `bound`, at any exponent. */
function radiusBelow(b: Ball, bound: string): boolean {
  return compareRadius(b.rad, radiusAboveScaled(dec(bound))) < 0;
}

// References from Python's decimal module, by its own series at a
// precision of 320 (fixed-trig.test.ts says how).
const SIN1 = dec(
  "0.8414709848078965066525023216302989996225630607983710656727517099919104043912396689486397435430526958543490379079206742932591189210",
);
const COS1 = dec(
  "0.5403023058681397174009366074429766037323104206179222276700972553811003947744717645179518560871830893435717311600300890978606337600",
);
const TAN1 = dec(
  "1.557407724654902230506974807458360173087250772381520038383946605698861397151727289555099965202242983804633821411748166613323554618",
);
const TAN100 = dec(
  "-0.5872139151569290766778096356445878942587659868729195441266396836098940155500919143837403920410274580571658975315468749045133855714",
);
const COS1E20 = dec(
  "0.7639704044417283004001468027378811228344734417470044806221890669465897391978234615763701769050965598612007847968278827454485209404",
);
const SIN1E50 = dec(
  "9.999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999833333333333333333333333333333e-51",
);

test("sin, cos and tan take an angle to a plain number, of one argument", () => {
  for (const [fn, name] of [
    [sin, "sin"],
    [cos, "cos"],
    [tan, "tan"],
  ] as const) {
    assert.equal(fn.name, name);
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.deepEqual(fn.dimensions([primitive(RADIAN)], PRIMITIVES), {
      ok: true,
      value: DIMENSIONLESS,
    });
    // A plain number is a kind mismatch, a length a dimension mismatch, and
    // a table without the radian has no angles.
    const plain = fn.dimensions([DIMENSIONLESS], PRIMITIVES);
    assert.ok(!plain.ok);
    assert.equal(plain.error.kind, "argumentDimension");
    assert.ok(
      plain.error.kind === "argumentDimension" &&
        plain.error.mismatch.kind === "kindMismatch",
    );
    const length = fn.dimensions([primitive("m")], PRIMITIVES);
    assert.ok(
      !length.ok &&
        length.error.kind === "argumentDimension" &&
        length.error.mismatch.kind === "dimensionMismatch",
    );
    assert.deepEqual(fn.dimensions([DIMENSIONLESS], new Map()), {
      ok: false,
      error: { kind: "noAngles" },
    });
    assert.equal(BUILTINS.get(name), fn);
  }
});

test("the exact cases are zero for sin and tan and one for cos, and their neighbors are inexact", () => {
  assert.deepEqual(value(sinBall(exact(ZERO), CONTEXT)), exact(ZERO));
  assert.deepEqual(value(tanBall(exact(ZERO), CONTEXT)), exact(ZERO));
  assert.deepEqual(value(cosBall(exact(ZERO), CONTEXT)), exact(ONE));
  for (const near of [dec("1e-30"), dec("-1e-30")]) {
    for (const fn of [sinBall, cosBall, tanBall]) {
      const result = value(fn(exact(near), CONTEXT));
      assert.ok(!isExact(result));
    }
  }
  // A ball around zero is not the exact case.
  assert.ok(!isExact(value(sinBall(ball("0", "1e-30"), CONTEXT))));
});

test("the values are the kernel's, within the radius, and a tiny argument keeps its digits", () => {
  const one = exact(ONE);
  assertNear(value(sinBall(one, CONTEXT)), SIN1, 45, "sin(1)");
  assertNear(value(cosBall(one, CONTEXT)), COS1, 45, "cos(1)");
  assertNear(value(tanBall(one, CONTEXT)), TAN1, 45, "tan(1)");
  assertNear(value(tanBall(exact(fr(100n)), CONTEXT)), TAN100, 45, "tan(100)");
  assertNear(
    value(cosBall(exact(dec("1e20")), CONTEXT)),
    COS1E20,
    45,
    "cos(1e20)",
  );
  // sin(1e-50 radian) and tan(1e-50 radian) go through the kernel and
  // certify on the first pass: the radius is relative to the value, not
  // to one, and the midpoint carries the series' second term.
  const tiny = value(sinBall(exact(dec("1e-50")), CONTEXT));
  assertNear(tiny, SIN1E50, 45, "sin(1e-50)");
  assert.ok(!equals(tiny.mid, dec("1e-50")));
  assert.ok(certifies(tiny, 40, "halfEven"));
  assertNear(
    value(tanBall(exact(dec("1e-50")), CONTEXT)),
    dec(
      "1.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000033333e-50",
    ),
    45,
    "tan(1e-50)",
  );
  assert.ok(compare(radiusOf(tiny), dec("1e-96")) < 0);
});

test("an argument below 2^-maxBits throughout is its own sine and tangent within its cube, and its cosine is one within its square", () => {
  const tiny = dec("1e-999999999");
  for (const fn of [sinBall, tanBall]) {
    const result = value(fn(exact(tiny), DEFAULT));
    assert.ok(!isExact(result));
    assert.ok(equals(result.mid, tiny));
    assert.ok(radiusBelow(result, "1e-2999999990"));
    assert.ok(
      compareRadius(result.rad, radiusAboveScaled(dec("1e-2999999998"))) > 0,
    );
    assert.ok(certifies(result, 8, "halfEven"));
    // A negative one, and one with a radius of its own, which is kept.
    const negative = value(fn(exact(dec("-1e-999999999")), DEFAULT));
    assert.ok(equals(negative.mid, dec("-1e-999999999")));
    assert.ok(certifies(negative, 8, "halfEven"));
    const wide = value(fn(ballOf(tiny, dec("1e-1000000009")), DEFAULT));
    assert.ok(equals(wide.mid, tiny));
    assert.ok(
      compareRadius(wide.rad, radiusAboveScaled(dec("1e-1000000009"))) >= 0,
    );
    assert.ok(certifies(wide, 8, "halfEven"));
  }
  const one = value(cosBall(exact(tiny), DEFAULT));
  assert.ok(!isExact(one));
  assert.ok(equals(one.mid, ONE));
  assert.ok(radiusBelow(one, "1e-1999999990"));
  assert.ok(
    compareRadius(one.rad, radiusAboveScaled(dec("1e-1999999999"))) > 0,
  );
  assert.ok(certifies(one, 8, "halfEven"));
  // sin(1e-50) is not that tiny: it goes through the kernel, whose radius
  // at eighteen working digits is far above the cube, and certifies on the
  // first pass.
  const kernel = value(sinBall(exact(dec("1e-50")), DEFAULT));
  assert.ok(compareRadius(kernel.rad, radiusAboveScaled(dec("1e-100"))) > 0);
  assert.ok(radiusBelow(kernel, "1e-60"));
  assert.ok(certifies(kernel, 8, "halfEven"));
});

test("an argument reaching 2^maxBits is too large, since the reduction would need pi to that many bits", () => {
  // The range limit, which the setting moves, whatever the sign.
  const tooLarge = { kind: "tooLarge" };
  for (const fn of [sinBall, cosBall, tanBall]) {
    assert.deepEqual(failure(fn(exact(dec("1e999999999")), DEFAULT)), tooLarge);
    assert.deepEqual(
      failure(fn(exact(dec("-1e999999999")), DEFAULT)),
      tooLarge,
    );
    // 2^65536 is about 2.0e19728: just below computes, at and above does not.
    assert.ok(fn(exact(dec("1e19728")), DEFAULT).ok);
    assert.deepEqual(failure(fn(exact(dec("1e19729")), DEFAULT)), tooLarge);
    assert.deepEqual(failure(fn(ball("0", "1e19729"), DEFAULT)), tooLarge);
  }
});

test("an inexact argument's functions contain those of its ends", () => {
  const x = ball("1", "1e-20");
  const s = value(sinBall(x, CONTEXT));
  assertNear(s, SIN1, 19, "sin(1 ± 1e-20)");
  // The radius covers the argument's over the derivative cos 1, 5.4e-21,
  // by a little: the series counts the argument's error in `r` and in
  // `r^2` both, without the cancellation the derivative sees.
  assert.ok(compare(radiusOf(s), dec("5.4e-21")) > 0);
  assert.ok(compare(radiusOf(s), dec("7e-21")) < 0);
  const c = value(cosBall(x, CONTEXT));
  assertNear(c, COS1, 19, "cos(1 ± 1e-20)");
  // Over the derivative sin 1, 8.4e-21, the same way.
  assert.ok(compare(radiusOf(c), dec("8.4e-21")) > 0);
  assert.ok(compare(radiusOf(c), dec("1.2e-20")) < 0);
  const t = value(tanBall(x, CONTEXT));
  assertNear(t, TAN1, 19, "tan(1 ± 1e-20)");
  // An argument wider than a fifth of a radian is zero within one, and its
  // tangent cannot be told from a pole.
  const wide = ball("0", "10");
  for (const fn of [sinBall, cosBall]) {
    const result = value(fn(wide, CONTEXT));
    assert.deepEqual(result.mid, ZERO);
    assert.deepEqual(result.rad, radiusAbove(rational(1n)));
  }
  assert.deepEqual(failure(tanBall(wide, CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: "pole",
  });
});

test("tan at a ball straddling a pole is unresolved at the argument, and near one is a large value", () => {
  const halfPi =
    "1.5707963267948966192313216916397514420985846996875529104874722961";
  assert.deepEqual(failure(tanBall(ball(halfPi, "1e-20"), CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: "pole",
  });
  // An exact value a hair from the pole: the cosine is about 5.4e-65,
  // which forty digits cannot tell from zero and eighty can, where the
  // tangent is about 1.9e64 with a radius the division makes honest.
  assert.deepEqual(failure(tanBall(exact(dec(halfPi)), CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: "pole",
  });
  const near = value(
    tanBall(exact(dec(halfPi)), { ...CONTEXT, precision: 80 }),
  );
  assert.ok(compare(near.mid, dec("1.8e64")) > 0);
  assert.ok(compare(near.mid, dec("1.9e64")) < 0);
  assert.ok(compare(radiusOf(near), dec("1e40")) < 0);
});

test("an unbounded argument gives the function of its midpoint with an unbounded radius", () => {
  const one = { mid: ONE, rad: UNBOUNDED };
  for (const [fn, reference] of [
    [sinBall, SIN1],
    [cosBall, COS1],
    [tanBall, TAN1],
  ] as const) {
    const result = value(fn(one, CONTEXT));
    assert.deepEqual(result.rad, UNBOUNDED);
    assert.ok(compare(distance(result.mid, reference), dec("1e-40")) < 0);
  }
  assert.deepEqual(value(sinBall({ mid: ZERO, rad: UNBOUNDED }, CONTEXT)), {
    mid: ZERO,
    rad: UNBOUNDED,
  });
});

test("through the pipeline: sin(30 deg) certifies 0.5, sin(pi() radian) is zero within a bound, and the errors are worded", () => {
  const parsed = parseDefinitions(
    readFileSync(new URL("../../units.txt", import.meta.url), "utf8"),
  );
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const at = (text: string, precision: number) =>
    evaluateText(table.value, text, { ...context, precision });
  for (const [text, digits] of [
    ["sin(30 deg)", "0.5"],
    ["cos(60 deg)", "0.5"],
    ["tan(45 deg)", "1"],
    ["sin(1 radian)", "0.84147098"],
    ["cos(1 radian)", "0.54030231"],
    ["tan(1 radian)", "1.5574077"],
    ["sin(pi() radian / 6)", "0.5"],
    ["cos(1e20 radian)", "0.7639704"],
    ["sin(1e-50 radian)", "1e-50"],
    ["sin(1e-999999999 radian)", "1e-999999999"],
    ["cos(1e-999999999 radian)", "1"],
  ]) {
    const result = at(text!, 8);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.ok(!isExact(result.value.magnitude), text);
    const shown = show(result.value.magnitude, {
      digits: 8,
      rounding: DEFAULT_ROUNDING,
    });
    assert.equal(shown.kind, "certified", text);
    assert.equal(shown.text, digits, text);
  }
  const thirty = at("sin(1 radian)", 30);
  assert.ok(thirty.ok);
  assert.equal(
    show(thirty.value.magnitude, { digits: 30, rounding: DEFAULT_ROUNDING })
      .text,
    "0.84147098480789650665250232163",
  );
  // The value is a ball around zero at every pass, and ends at the ceiling
  // as the zero kind with a bound.
  const zero = at("sin(pi() radian)", 8);
  assert.ok(zero.ok, inspect(zero));
  const shownZero = show(zero.value.magnitude, {
    digits: 8,
    rounding: DEFAULT_ROUNDING,
  });
  assert.equal(shownZero.kind, "zero");
  assert.ok(
    shownZero.kind === "zero" &&
      compare(dec(shownZero.bound), dec("1e-200")) < 0 &&
      compare(dec(shownZero.bound), dec("1e-240")) > 0,
  );
  const exactOne = at("cos(0 radian) m", 8);
  assert.ok(exactOne.ok && isExact(exactOne.value.magnitude));
  assert.deepEqual(exactOne.value.magnitude.mid, ONE);
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "sin(1)",
      'Cannot apply "sin" to "1": "1" is a plain number, but "sin" takes an angle; write "sin(1 radian)".',
    ],
    [
      "sin(0)",
      'Cannot apply "sin" to "0": "0" is a plain number, but "sin" takes an angle; write "sin(0 radian)".',
    ],
    [
      "cos(pi())",
      'Cannot apply "cos" to "pi()": "pi()" is a plain number, but "cos" takes an angle; write "cos(pi() radian)".',
    ],
    [
      "sin(1 m)",
      'Cannot apply "sin" to "1 m": "1 m" has dimension m, but "sin" takes an angle.',
    ],
    [
      "tan(1 rpm)",
      'Cannot apply "tan" to "1 rpm": "1 rpm" has dimension radian / s, but "tan" takes an angle.',
    ],
    [
      "tan(pi() radian / 2)",
      '"pi() radian / 2" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
    ],
    [
      "tan(90 deg)",
      '"90 deg" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
    ],
    [
      "sin(1 radian, 2)",
      '"sin" takes 1 argument, but "sin(1 radian, 2)" gives 2 arguments.',
    ],
    [
      "sin(1e999999999 radian)",
      '"sin(1e999999999 radian)" is too large to compute within Most bits.',
    ],
  ]) {
    const result = at(text!, 8);
    assert.ok(!result.ok, text);
    assert.equal(
      describeTextError(result.error, text!, primitives),
      message,
      text,
    );
  }
});
