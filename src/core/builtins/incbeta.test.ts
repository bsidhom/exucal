import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED } from "../radius.ts";
import { rational } from "../rational.ts";
import { ROUNDING_MODES } from "../rounding.ts";
import { ONE, ZERO, equals, fromRational } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import { contains } from "../../testing/edges.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { incbeta, incbetaBall, incbetareg } from "./incbeta.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function call(
  regularized: boolean,
  a: Ball,
  b: Ball,
  x: Ball,
  context: NumberContext = CONTEXT,
) {
  return incbetaBall(a, b, x, regularized, context);
}

/** The function at the context, shown. */
function shown(
  regularized: boolean,
  a: Ball,
  b: Ball,
  x: Ball,
  context: NumberContext = CONTEXT,
): string {
  const result = show(value(call(regularized, a, b, x, context)), {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${result.kind === "exact" ? "=" : "≈"} ${result.text}${result.kind === "certified" || result.kind === "exact" ? "" : ` [${result.kind}]`}`;
}

const d = (t: string) => exact(dec(t));

test("incbeta and incbetareg take three plain numbers and give one", () => {
  const primitives = new Map([["m", "dimension" as const]]);
  for (const fn of [incbeta, incbetareg]) {
    assert.deepEqual(fn.arity, { min: 3, max: 3 });
    assert.ok(
      fn.dimensions([DIMENSIONLESS, DIMENSIONLESS, DIMENSIONLESS], primitives)
        .ok,
    );
    const failed = fn.dimensions(
      [DIMENSIONLESS, primitive("m"), DIMENSIONLESS],
      primitives,
    );
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
  }
  assert.equal(incbeta.name, "incbeta");
  assert.equal(incbetareg.name, "incbetareg");
});

test("both forms match mpmath to forty digits, in either orientation", () => {
  // mpmath's betainc at 60 digits, rounded to 40 by nstr: (a, b, x, B(x; a, b), I_x(a, b)).
  const rows: readonly [string, string, string, string, string][] = [
    ["2", "3", "0.5", "0.05729166666666666666666666666666666666667", "0.6875"],
    [
      "0.5",
      "0.5",
      "0.3",
      "1.159279480727408599846583794022415837243",
      "0.3690101195655453827554305587787365146547",
    ],
    [
      "1000",
      "1",
      "0.99",
      "0.00000004317124741065825098863282863525973921088",
      "0.00004317124741065825098863282863525973921088",
    ],
    [
      "1",
      "1000",
      "0.01",
      "0.0009999568287525893417490113671713647402608",
      "0.9999568287525893417490113671713647402608",
    ],
    [
      "10",
      "10",
      "0.9",
      "0.000001082504568314612648033081469613977353915",
      "0.999996070117672872",
    ],
    [
      "10",
      "10",
      "0.1",
      "0.000000000004254132290294225897941068219705990603823",
      "0.000003929882327128",
    ],
    [
      "0.5",
      "1000",
      "0.001",
      "0.04724212114913817237534060978179781386926",
      "0.842752725733275987586759224672191811871",
    ],
    [
      "100",
      "100",
      "0.6",
      "2.203989560406747137434303299733433856541e-61",
      "0.99783990506194485552796753675303716261",
    ],
    [
      "2.5",
      "3.5",
      "0.4",
      "0.01792564020820931180652051675211512862528",
      "0.486904191526117355254032731262758242434",
    ],
    [
      "1e-6",
      "2",
      "0.5",
      "999998.8068539062391297397077666027375627",
      "0.9999998068527130930359788375063105041654",
    ],
    [
      "2",
      "1e-6",
      "0.5",
      "0.1931470937598702612922323972634373233119",
      "0.0000001931472869069640211624936894958345867492",
    ],
    [
      "3",
      "7",
      "0.25",
      "0.001584613133990575396825396825396825396825",
      "0.399322509765625",
    ],
    ["1", "1", "0.3", "0.3", "0.3"],
    ["5", "2", "0.75", "0.0177978515625", "0.533935546875"],
    [
      "0.1",
      "0.2",
      "0.8",
      "10.85372689557624292206351179472493085379",
      "0.7434379555965914668126371555967405287055",
    ],
    [
      "1e4",
      "1e4",
      "0.5",
      "4.453147551833643657667552942197322668613e-6023",
      "0.5",
    ],
    [
      "1e4",
      "1e4",
      "0.49",
      "2.081454006874013845446340580554867549418e-6025",
      "0.002337059330110167853967114490566900136986",
    ],
    [
      "2",
      "3",
      "1e-20",
      "4.999999999999999999933333333333333333334e-41",
      "5.99999999999999999992e-40",
    ],
    [
      "1000",
      "1",
      "0.999",
      "0.0003676954247709640446268061392204613439725",
      "0.3676954247709640446268061392204613439725",
    ],
  ];
  for (const [a, b, x, unreg, reg] of rows) {
    for (const [regularized, reference] of [
      [false, unreg],
      [true, reg],
    ] as const) {
      const text = shown(regularized, d(a), d(b), d(x));
      assert.ok(
        equals(dec(text.slice(2)), dec(reference)),
        `incbeta${regularized ? "reg" : ""}(${a}, ${b}, ${x}): ${text}`,
      );
    }
  }
});

test("the exact cases: the ends of the argument, and the polynomial for whole numbers", () => {
  assert.equal(shown(false, d("2.5"), d("3.5"), d("0")), "= 0");
  assert.equal(shown(true, d("2.5"), d("3.5"), d("0")), "= 0");
  assert.equal(shown(true, d("2.5"), d("3.5"), d("1")), "= 1");
  assert.equal(
    shown(false, d("2"), d("3"), d("1")),
    "≈ 0.08333333333333333333333333333333333333333",
  );
  assert.ok(isExact(value(call(false, d("2"), d("3"), d("1")))));
  // Whole numbers and a rational argument: exact fractions.
  const reg = value(call(true, d("2"), d("3"), d("0.5")));
  assert.ok(isExact(reg) && equals(reg.mid, dec("0.6875")), inspect(reg));
  const unreg = value(call(false, d("2"), d("3"), d("0.5")));
  assert.ok(
    isExact(unreg) && equals(unreg.mid, fromRational(rational(11n, 192n))),
    inspect(unreg),
  );
  assert.ok(isExact(value(call(true, d("1"), d("1000"), d("0.01")))));
  // A rational argument whose power would pass Most bits: the kernel's value.
  const dense = value(
    call(
      true,
      d("2"),
      d("3"),
      dec("0.123456789012345678901234567890123456789") !== undefined
        ? d("0.123456789012345678901234567890123456789")
        : d("0.5"),
    ),
  );
  assert.ok(isExact(dense));
  const large = value(
    call(
      true,
      d("5000"),
      d("5000"),
      d("0.123456789012345678901234567890123456789"),
    ),
  );
  assert.ok(!isExact(large));
});

test("the domain: positive parameters, an argument within [0, 1], and balls at the edges", () => {
  for (const regularized of [false, true]) {
    assert.deepEqual(error(call(regularized, d("0"), d("1"), d("0.5"))), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(error(call(regularized, d("1"), d("-2"), d("0.5"))), {
      kind: "domain",
      argument: 1,
      reason: "notPositive",
    });
    assert.deepEqual(error(call(regularized, d("1"), d("2"), d("-0.5"))), {
      kind: "domain",
      argument: 2,
      reason: "outsideZeroOne",
    });
    assert.deepEqual(error(call(regularized, d("1"), d("2"), d("1.5"))), {
      kind: "domain",
      argument: 2,
      reason: "outsideZeroOne",
    });
    assert.deepEqual(
      error(call(regularized, ball(dec("0"), dec("1e-30")), d("2"), d("0.5"))),
      { kind: "unresolved", argument: 0, edge: ZERO },
    );
    assert.deepEqual(
      error(call(regularized, d("2"), d("2"), ball(dec("2"), dec("0.5")))),
      { kind: "domain", argument: 2, reason: "outsideZeroOne" },
    );
  }
});

test("balls of the argument at the ends and wide ones are taken at their ends, and the parameters' balls ride through", () => {
  const eight = { ...CONTEXT, precision: 8 };
  // Touching zero: from zero to I at the upper end.
  const touching = value(
    call(true, d("2"), d("3"), ball(dec("0.05"), dec("0.05")), eight),
  );
  assert.ok(
    contains(touching, ZERO) && contains(touching, dec("0.0523")),
    inspect(touching),
  );
  // Straddling one: the hull reaches one.
  const atOne = value(
    call(true, d("2"), d("3"), ball(dec("0.995"), dec("0.01")), eight),
  );
  assert.ok(contains(atOne, ONE), inspect(atOne));
  // Wide inside: both ends covered.
  const wide = value(
    call(true, d("2"), d("3"), ball(dec("0.5"), dec("0.25")), eight),
  );
  assert.ok(
    contains(wide, dec("0.2617187500")) && contains(wide, dec("0.9492187500")),
    inspect(wide),
  );
  // Narrow balls of the parameters and the argument contain the truth.
  const inside = value(
    call(
      true,
      ball(dec("2.5"), dec("1e-20")),
      ball(dec("3.5"), dec("1e-20")),
      ball(dec("0.4"), dec("1e-20")),
    ),
  );
  assert.ok(
    contains(inside, dec("0.486904191526117355254032731262758242434")),
    inspect(inside),
  );
  assert.equal(
    show(inside, { digits: 8, rounding: DEFAULT_ROUNDING }).text,
    "0.48690419",
  );
  const unbounded: Ball = { mid: dec("0.4"), rad: UNBOUNDED };
  assert.equal(
    value(call(true, d("2.5"), d("3.5"), unbounded)).rad.kind,
    "unbounded",
  );
  assert.equal(
    value(call(false, unbounded, d("3.5"), d("0.4"))).rad.kind,
    "unbounded",
  );
  for (const rounding of ROUNDING_MODES) {
    const result = show(value(call(true, d("2.5"), d("3.5"), d("0.4"))), {
      digits: 8,
      rounding: rounding,
    });
    assert.equal(result.kind, "certified", rounding);
    assert.ok(
      /^0\.486904(19|2)$/.test(result.text),
      `${rounding}: ${result.text}`,
    );
  }
});

test("the ends of the exponent and the term limit", () => {
  const eight = { ...CONTEXT, precision: 8 };
  // A tiny argument: x^a / (a B(a, b)), at any exponent.
  assert.equal(
    shown(true, d("2"), d("3"), d("1e-999999999"), eight),
    "≈ 6e-1999999998",
  );
  assert.equal(
    shown(false, d("2"), d("3"), d("1e-999999999"), eight),
    "≈ 5e-1999999999",
  );
  // Past the bottom of the bound.
  assert.deepEqual(
    error(call(true, d("2"), d("3"), d("1e-600000000000000000"), eight)),
    { kind: "underflow" },
  );
  // The complement of a value past the bottom: the whole within the edge.
  const whole = value(
    call(
      true,
      d("3"),
      d("2"),
      dec("1") !== undefined ? ball(dec("1"), dec("0")) : d("1"),
      eight,
    ),
  );
  assert.ok(contains(whole, ONE));
  // A tiny parameter: I near one for a, near zero for b.
  assert.equal(shown(true, d("1e-999999999"), d("2"), d("0.5"), eight), "≈ 1");
  assert.equal(
    shown(true, d("2"), d("1e-999999999"), d("0.5"), eight),
    "≈ 1.9314718e-1000000000",
  );
  // Large parameters near the median at a high precision: past the limit.
  assert.deepEqual(
    error(
      call(true, d("1e6"), d("1e6"), d("0.5"), { ...CONTEXT, precision: 1000 }),
    ),
    { kind: "tooLarge" },
  );
  assert.equal(shown(true, d("1e6"), d("1e6"), d("0.5"), eight), "≈ 0.5");
});

// ---------------------------------------------------------------------------
// Through the pipeline

const text = readFileSync(new URL("../../units.txt", import.meta.url), "utf8");

const table = (() => {
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, inspect(parsed));
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, inspect(built));
  return built.value;
})();

/** `source` through the pipeline at eight digits: the shown text, or the message. */
function run(
  source: string,
  context: NumberContext = { ...CONTEXT, precision: 8 },
): string {
  const result = evaluateText(table, source, context);
  if (!result.ok)
    return describeTextError(result.error, source, table.primitives);
  const result2 = show(result.value.magnitude, {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${result2.kind === "exact" ? "=" : "≈"} ${result2.text}`;
}

test("the incomplete beta function through the pipeline, with its messages", () => {
  assert.equal(run("incbetareg(2, 3, 0.5)"), "= 0.6875");
  assert.equal(run("incbeta(2, 3, 0.5)"), "≈ 0.057291667");
  assert.equal(run("incbetareg(0.5, 0.5, 0.3)"), "≈ 0.36901012");
  assert.equal(run("incbetareg(2, 3, 0)"), "= 0");
  assert.equal(run("incbetareg(2, 3, 1)"), "= 1");
  assert.equal(run("incbetareg(approx(2), 3, 0.5)"), "≈ 0.6875");
  // Student's t with 3 degrees of freedom at t = 2: the one-sided tail
  // is I_(3/(3+4))(3/2, 1/2) / 2 = 0.069662...
  assert.equal(run("incbetareg(3/2, 1/2, 3/(3 + 2^2)) / 2"), "≈ 0.069662984");
  assert.equal(
    run("incbetareg(2, 3, 0.5)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "= 0.6875",
  );
  assert.equal(
    run("incbeta(0, 3, 0.5)"),
    'Cannot compute "incbeta(0, 3, 0.5)": "0" is not positive, and the incomplete beta function takes positive parameters.',
  );
  assert.equal(
    run("incbetareg(2, 3, 1.5)"),
    'Cannot compute "incbetareg(2, 3, 1.5)": "1.5" lies outside [0, 1], where "incbetareg" is defined.',
  );
  assert.equal(
    run("incbetareg(2, 3, 2 m)"),
    'Cannot apply "incbetareg" to "2 m": "2 m" has dimension m, but the third argument of "incbetareg" must be a plain number.',
  );
});
