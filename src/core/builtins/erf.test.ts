import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, type Ball } from "../ball.ts";
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
import { ROUNDING_MODES } from "../rounding.ts";
import { equals } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import { contains } from "../../testing/edges.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { erf, erfBall, erfc, erfcBall } from "./erf.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

type BallFunction = (
  x: Ball,
  context: NumberContext,
) => ReturnType<typeof erfBall>;

/** `fn(x)` at the context, shown. */
function shown(
  fn: BallFunction,
  x: Ball,
  context: NumberContext = CONTEXT,
): string {
  const result = show(
    value(fn(x, context)),
    context.precision,
    context.rounding,
  );
  return `${result.kind === "exact" ? "=" : "≈"} ${result.text}${result.kind === "certified" || result.kind === "exact" ? "" : ` [${result.kind}]`}`;
}

test("erf and erfc take a plain number and give one", () => {
  const primitives = new Map([["m", "dimension" as const]]);
  for (const fn of [erf, erfc]) {
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.ok(fn.dimensions([DIMENSIONLESS], primitives).ok);
    const failed = fn.dimensions([primitive("m")], primitives);
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
  }
  assert.equal(erf.name, "erf");
  assert.equal(erfc.name, "erfc");
});

test("erf and erfc match mpmath to forty digits", () => {
  // From mpmath at 60 digits, rounded to 40 by nstr.
  const rows: readonly [string, string, string][] = [
    [
      "0.5",
      "0.5204998778130465376827466538919645287365",
      "0.4795001221869534623172533461080354712635",
    ],
    [
      "1",
      "0.8427007929497148693412206350826092592961",
      "0.1572992070502851306587793649173907407039",
    ],
    [
      "2",
      "0.9953222650189527341620692563672529286109",
      "0.004677734981047265837930743632747071389108",
    ],
    [
      "-1.5",
      "-0.9661051464753107270669762616459478586814",
      "1.966105146475310727066976261645947858681",
    ],
    [
      "1e-5",
      "0.00001128379167057899934994103529825408521321",
      "0.9999887162083294210006500589647017459148",
    ],
    [
      "3.7",
      "0.9999998328489420908537976259244587813698",
      "0.0000001671510579091462023740755412186302014115",
    ],
    [
      "0.1",
      "0.1124629160182848922032750717439683832217",
      "0.8875370839817151077967249282560316167783",
    ],
    [
      "-1",
      "-0.8427007929497148693412206350826092592961",
      "1.842700792949714869341220635082609259296",
    ],
    [
      "-0.25",
      "-0.2763263901682369329850682677648157120654",
      "1.276326390168236932985068267764815712065",
    ],
    [
      "5",
      "0.9999999999984625402055719651498116565146",
      "0.000000000001537459794428034850188343485383378890118",
    ],
    ["10", "1", "2.088487583762544757000786294957788611561e-45"],
  ];
  for (const [x, erfRef, erfcRef] of rows) {
    const e = shown(erfBall, exact(dec(x)));
    assert.equal(e.slice(0, 2), "≈ ", `erf(${x}): ${e}`);
    assert.ok(equals(dec(e.slice(2)), dec(erfRef)), `erf(${x}): ${e}`);
    const c = shown(erfcBall, exact(dec(x)));
    assert.equal(c.slice(0, 2), "≈ ", `erfc(${x}): ${c}`);
    assert.ok(equals(dec(c.slice(2)), dec(erfcRef)), `erfc(${x}): ${c}`);
  }
});

test("the exact cases at zero, the odd symmetry, and the complement", () => {
  assert.equal(shown(erfBall, exact(dec("0"))), "= 0");
  assert.equal(shown(erfcBall, exact(dec("0"))), "= 1");
  const eight = { ...CONTEXT, precision: 8 };
  assert.equal(shown(erfBall, exact(dec("-2")), eight), "≈ -0.99532227");
  assert.equal(shown(erfcBall, exact(dec("-2")), eight), "≈ 1.9953223");
  assert.equal(shown(erfcBall, exact(dec("-1e400")), eight), "≈ 2");
});

test("the ends of the exponent: large and tiny arguments, and the bound on erfc", () => {
  const eight = { ...CONTEXT, precision: 8 };
  // erfc keeps its digits far out; erf is one within the bound's edge
  // beyond the working bits' reach.
  assert.equal(shown(erfcBall, exact(dec("100")), eight), "≈ 6.4059614e-4346");
  assert.equal(
    shown(erfcBall, exact(dec("1000")), eight),
    "≈ 1.860037e-434298",
  );
  assert.equal(
    shown(erfcBall, exact(dec("1e9")), eight),
    "≈ 1.2597842e-434294481903251837",
  );
  assert.equal(shown(erfBall, exact(dec("1e9")), eight), "≈ 1");
  const far = value(erfBall(exact(dec("1e400")), CONTEXT));
  assert.ok(
    equals(far.mid, dec("1")) &&
      far.rad.kind === "bounded" &&
      far.rad.exp < -(10n ** 17n),
    inspect(far),
  );
  assert.equal(shown(erfBall, exact(dec("-1e400")), eight), "≈ -1");
  // e^-x^2 passes below 10^-(10^18) near x = 1.52e9.
  assert.equal(
    shown(erfcBall, exact(dec("1.5e9")), eight),
    "≈ 2.2924176e-977162584282316622",
  );
  assert.deepEqual(error(erfcBall(exact(dec("1.6e9")), CONTEXT)), {
    kind: "underflow",
  });
  assert.deepEqual(error(erfcBall(exact(dec("1e400")), CONTEXT)), {
    kind: "underflow",
  });
  // A tiny argument: 2x / sqrt(pi), at any exponent, and erfc one.
  assert.equal(
    shown(erfBall, exact(dec("1e-999999999")), eight),
    "≈ 1.1283792e-999999999",
  );
  assert.equal(
    shown(erfBall, exact(dec("1e-600000000000000000")), eight),
    "≈ 1.1283792e-600000000000000000",
  );
  assert.equal(shown(erfcBall, exact(dec("1e-999999999")), eight), "≈ 1");
  assert.equal(
    shown(erfBall, exact(dec("-1e-999999999")), eight),
    "≈ -1.1283792e-999999999",
  );
  const tiny = value(erfBall(exact(dec("1e-20000")), CONTEXT));
  assert.ok(
    contains(
      tiny,
      dec("1.128379167095512573896158903121545171688101258657997713688e-20000"),
    ),
    inspect(tiny),
  );
});

test("balls touching or straddling zero are taken at their ends, and an unbounded radius passes", () => {
  const eight = { ...CONTEXT, precision: 8 };
  const straddling = value(erfBall(ball(dec("0"), dec("0.1")), eight));
  assert.ok(
    contains(straddling, dec("0.11246291601828489220")),
    inspect(straddling),
  );
  assert.ok(
    contains(straddling, dec("-0.11246291601828489220")),
    inspect(straddling),
  );
  assert.ok(contains(straddling, dec("0")), inspect(straddling));
  const complement = value(erfcBall(ball(dec("0.05"), dec("0.1")), eight));
  assert.ok(
    contains(complement, dec("1.0563719777970166")),
    inspect(complement),
  );
  assert.ok(contains(complement, dec("0.83200482")), inspect(complement));
  // A ball from zero far out: erfc runs from two to below the bound,
  // the hull of a value and a refusal past the bottom.
  const wide = value(erfcBall(ball(dec("0"), dec("1e30")), eight));
  assert.ok(
    contains(wide, dec("2")) && contains(wide, dec("0")),
    inspect(wide),
  );
  assert.ok(
    contains(value(erfcBall(ball(dec("0"), dec("1e9")), eight)), dec("2")),
  );
  // Inside, a narrow ball keeps its digits and contains the truth.
  const inside = value(erfBall(ball(dec("1"), dec("1e-20")), CONTEXT));
  assert.ok(
    contains(inside, dec("0.8427007929497148693412206350826092592961")),
    inspect(inside),
  );
  assert.equal(show(inside, 8, DEFAULT_ROUNDING).text, "0.84270079");
  const unbounded: Ball = { mid: dec("1"), rad: UNBOUNDED };
  assert.equal(value(erfBall(unbounded, CONTEXT)).rad.kind, "unbounded");
  assert.equal(value(erfcBall(unbounded, CONTEXT)).rad.kind, "unbounded");
  for (const rounding of ROUNDING_MODES) {
    const result = show(value(erfBall(exact(dec("1")), CONTEXT)), 8, rounding);
    assert.equal(result.kind, "certified", rounding);
    assert.ok(
      /^0\.842700(79|8)$/.test(result.text),
      `${rounding}: ${result.text}`,
    );
  }
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
  const result2 = show(
    result.value.magnitude,
    context.precision,
    context.rounding,
  );
  return `${result2.kind === "exact" ? "=" : "≈"} ${result2.text}`;
}

test("erf and erfc through the pipeline, with their messages", () => {
  assert.equal(run("erf(1)"), "≈ 0.84270079");
  assert.equal(run("erfc(10)"), "≈ 2.0884876e-45");
  assert.equal(run("erf(0)"), "= 0");
  assert.equal(run("erfc(0)"), "= 1");
  assert.equal(run("erf(approx(1))"), "≈ 0.84270079");
  // The normal distribution, as the study promised.
  assert.equal(run("(1 + erf(1.96 / sqrt(2))) / 2"), "≈ 0.9750021");
  assert.equal(run("erfc(1.96 / sqrt(2)) / 2"), "≈ 0.024997895");
  assert.equal(
    run("erf(1)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "≈ 0.84270079",
  );
  assert.equal(
    run("erfc(1e400)"),
    '"erfc(1e400)" is too small to compute: its exponent would fall below -10^18.',
  );
  assert.equal(
    run("erf(2 m)"),
    'Cannot apply "erf" to "2 m": "2 m" has dimension m, but the argument of "erf" must be a plain number.',
  );
});
