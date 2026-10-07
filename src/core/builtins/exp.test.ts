import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  certifies,
  exact,
  isExact,
  position,
  radiusBound,
  type Ball,
} from "../ball.ts";
import { buildTable } from "../build.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import {
  UNBOUNDED,
  compareRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusUpper,
} from "../radius.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS, rational } from "../rational.ts";
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
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

function value(result: ReturnType<typeof expBall>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** `|a - b|` on `Scaled`s of moderate exponent. */
function distance(a: Scaled, b: Scaled): Scaled {
  const d = subtract(a, b, MAX_SIGNIFICAND_LIMIT_BITS);
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

test("an argument whose exponential would pass the exponent bound is an overflow for a positive argument and an underflow for a negative one", () => {
  // Above the bound for a positive argument, below it for a negative one.
  for (const x of ["1e30", "-1e30", "2.4e18", "-2.4e18"]) {
    assert.deepEqual(expBall(exact(dec(x)), CONTEXT), {
      ok: false,
      error: { kind: x.startsWith("-") ? "underflow" : "overflow" },
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
  // A wide ball is judged over its whole extent: one reaching past the
  // bound is unresolved at the bound (D18, H.15; stage 4 refused it for
  // good), and one within it is zero within the exponential of its upper
  // end, containing the exponentials of both ends and of the midpoint
  // (H.3).
  assert.deepEqual(expBall(ball(ZERO, dec("1e30")), CONTEXT), {
    ok: false,
    error: { kind: "unresolved", argument: 0, edge: "bound" },
  });
  assert.deepEqual(
    expBall(ball(dec("2302585092994045686"), dec("1")), CONTEXT),
    {
      ok: false,
      error: { kind: "unresolved", argument: 0, edge: "bound" },
    },
  );
  const wide = value(expBall(ball(ZERO, dec("1e6")), CONTEXT));
  assert.deepEqual(wide.mid, ZERO);
  for (const v of [ONE, dec("3.0332154e434294"), dec("3.2968315e-434295")]) {
    const where = position(wide, v);
    assert.ok(where !== "above" && where !== "below", format(v, 8, "floor"));
  }
  assert.equal(position(wide, dec("3.04e434294")), "below");
  assert.equal(radiusBound(UNBOUNDED), Infinity);
  assert.equal(radiusBound(radiusAbove(rational(0n))), 0);
  assert.ok(Math.abs(radiusBound(radiusAbove(rational(3n))) - 3) < 1e-6);
});

test("an argument below 2^-significandLimitBits throughout is one within twice its magnitude, and one below half an ulp reaches the kernel as zero within an ulp", () => {
  const context = { ...CONTEXT, precision: 8 };
  for (const text of ["1e-999999999", "-1e-999999999", "1e-316000"]) {
    const tiny = value(expBall(exact(dec(text)), context));
    assert.deepEqual(tiny.mid, ONE, text);
    assert.ok(
      compareRadius(tiny.rad, radiusAboveScaled(dec("2e-999999999"))) >= 0 ||
        text === "1e-316000",
      text,
    );
    assert.ok(
      compareRadius(tiny.rad, radiusAboveScaled(dec("2.1e-316000"))) < 0,
      text,
    );
    assert.ok(certifies(tiny, 8, "halfEven"), text);
  }
  // Below half an ulp of the working bits but not below 2^-significandLimitBits: the
  // kernel's door converts it to zero within an ulp, and the result is
  // one within a few ulps.
  const near = value(expBall(exact(dec("1e-10000")), context));
  assert.ok(compare(distance(near.mid, ONE), radiusOf(near)) <= 0);
  assert.ok(compare(radiusOf(near), dec("1e-15")) < 0);
  assert.ok(certifies(near, 8, "halfEven"));
  // Through the pipeline (#53's rows): each is `≈ 1`, where it threw.
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const table = buildTable(parsed.value, {
    ...CONTEXT,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  for (const text of [
    "exp(1e-999999999)",
    "exp(-1e-999999999)",
    "exp(1e-316000)",
    "exp(approx(1e-999999999))",
    "exp(sqrt(2) * 1e-999999999)",
    "exp(1e-10000)",
  ]) {
    const result = evaluateText(table.value, text, context);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, { digits: 8, rounding: DEFAULT_ROUNDING }),
      { kind: "certified", text: "1" },
      text,
    );
  }
});

test("through the pipeline, exp and pow of a wide argument are a ball around zero that certifies nothing, and narrow to their value in milliseconds", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const table = buildTable(parsed.value, {
    ...CONTEXT,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  // #39's texts at 32 digits: the first pass's argument is `0` within
  // about `2e9`, which crashed after seconds in the squarings; the second
  // pass narrows it and the answer is `≈ 1`.
  const start = performance.now();
  for (const text of [
    "exp(1e60 * sqrt(2) - 1e60 * sqrt(2))",
    "exp(approx(1e60) - approx(1e60))",
    "pow(2, approx(1e60) - approx(1e60))",
  ]) {
    const result = evaluateText(table.value, text, {
      ...CONTEXT,
      precision: 32,
    });
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, { digits: 32, rounding: DEFAULT_ROUNDING }),
      { kind: "certified", text: "1" },
      text,
    );
  }
  assert.ok(performance.now() - start < 2000, "milliseconds, not seconds");
  // In decimal mode the third is 0.33333333 exactly and the power is one
  // step, computed at rising precision until its eight digits certify
  // (D26): a value with an exponent of eighteen digits, exact.
  const decimal = evaluateText(table.value, "pow(5e1000000000000000000, 1/3)", {
    ...CONTEXT,
    precision: 8,
    mode: "decimal",
  });
  assert.ok(decimal.ok, inspect(decimal));
  const shown = show(decimal.value.magnitude, {
    digits: 8,
    rounding: DEFAULT_ROUNDING,
  });
  assert.equal(shown.kind, "exact", inspect(shown));
  assert.ok(/^\d\.\d{7}e\+33333333\d{10}$/.test(shown.text), shown.text);
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
  const shown = show(fifty.value.magnitude, {
    digits: 50,
    rounding: DEFAULT_ROUNDING,
  });
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
  assert.deepEqual(
    show(large.value.magnitude, { digits: 8, rounding: DEFAULT_ROUNDING }),
    {
      kind: "certified",
      text: "3.0332154e+434294",
    },
  );
  const huge = evaluateText(table.value, "exp(1e30)", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(!huge.ok);
  assert.deepEqual(huge.error, {
    kind: "overflow",
    span: { start: 0, end: 9 },
  });
  const zero = evaluateText(table.value, "exp(0) m", {
    ...CONTEXT,
    precision: 8,
  });
  assert.ok(zero.ok && isExact(zero.value.magnitude));
});

test("through the pipeline, a wide argument is retried until its exponential is within the bound, and a refusal needs the whole ball past (#40, #61)", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const table = buildTable(parsed.value, {
    ...CONTEXT,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  const at = (text: string, precision: number) =>
    evaluateText(table.value, text, { ...CONTEXT, precision });
  // #40: `5` within about `2e948` at the first pass, unresolved at the
  // bound there and computed once the loop narrows it (the sixth pass);
  // the hyperbolic forms and a power alike (references from Python's
  // decimal module at 40). An argument whose midpoint alone passes the
  // edge at the first pass is a value too.
  for (const [text, precision, digits] of [
    [
      "exp(approx(1e999) - approx(1e999 - 5))",
      32,
      "148.41315910257660342111558004055",
    ],
    [
      "sinh(approx(1e999) - approx(1e999 - 5))",
      32,
      "74.203210577788758977009471996065",
    ],
    [
      "cosh(approx(1e999) - approx(1e999 - 5))",
      32,
      "74.209948524787844444106108044488",
    ],
    ["pow(2, approx(1e999) - approx(1e999 - 5))", 8, "32"],
    [
      "exp(1e46 - approx(1/3) * 3e46 + 1.5e18)",
      8,
      "2.9970458e+651441722854877741",
    ],
  ] as const) {
    const result = at(text, precision);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, {
        digits: precision,
        rounding: DEFAULT_ROUNDING,
      }),
      { kind: "certified", text: digits },
      text,
    );
  }
  // A refusal needs every value past the bound: with `approx` the
  // argument's ball lies wholly past it at every pass.
  for (const [text, kind] of [
    ["exp(approx(1e999))", "overflow"],
    ["exp(2302587288910310144)", "overflow"],
    ["exp(-1e999)", "underflow"],
  ] as const) {
    const result = at(text, 8);
    assert.ok(!result.ok, text);
    assert.equal(result.error.kind, kind, text);
  }
  // Within `10^9` decades of the bound the guards refused values (#61);
  // the classifier decides them on the kernel.
  for (const [text, digits] of [
    ["exp(2302585092994045000)", "8.6e+999999999999999702"],
    ["exp(-2302585092994045000)", "1.2e-999999999999999703"],
    ["exp(2302585092994045685)", "2.7e+1000000000000000000"],
  ] as const) {
    const result = at(text, 2);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.equal(
      format(result.value.magnitude.mid, 2, DEFAULT_ROUNDING),
      digits,
      text,
    );
  }
});
