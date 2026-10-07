import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
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
import { equals, fromRational } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import { contains } from "../../testing/edges.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { beta, betaBall } from "./beta.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

/** `beta(a, b)` at the context, shown. */
function b(a: Ball, c: Ball, context: NumberContext = CONTEXT): string {
  const shown = show(value(betaBall(a, c, context)), {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}${shown.kind === "certified" || shown.kind === "exact" ? "" : ` [${shown.kind}]`}`;
}

test("beta takes two plain numbers and gives one", () => {
  assert.equal(beta.name, "beta");
  assert.deepEqual(beta.arity, { min: 2, max: 2 });
  const primitives = new Map([["m", "dimension" as const]]);
  assert.ok(beta.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
  const failed = beta.dimensions([DIMENSIONLESS, primitive("m")], primitives);
  assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
});

test("beta matches mpmath to forty digits", () => {
  // From mpmath's `beta` at 60 digits, rounded to 40 by `nstr`.
  const rows: readonly [string, string, string][] = [
    ["0.5", "0.5", "3.141592653589793238462643383279502884197"],
    ["2.5", "3.5", "0.03681553890925538951323410214780667442419"],
    ["0.5", "1.5", "1.570796326794896619231321691639751442099"],
    ["7", "0.5", "0.681984681984681984681984681984681984682"],
    ["0.3", "0.7", "3.883222077450933154693731259925391915269"],
    ["1e-6", "1e-6", "1999999.999996710136674526289315414522538"],
    ["1e-20", "1e-20", "200000000000000000000"],
    ["-0.5", "0.25", "2.622057554292119810464839589891119413683"],
    ["-1.5", "0.25", "2.185047961910099842054032991575932844736"],
    ["-2.5", "0.75", "-0.4193490821574572726039728722981133573795"],
    ["-0.5", "-0.75", "4.370095923820199684108065983151865689471"],
    ["-0.5", "3", "-5.333333333333333333333333333333333333333"],
    ["3.7", "-1e-6", "-1000001.744371393125542925839801441090455"],
    ["1e15", "2.5", "4.203743412298438642464563765827011335882e-38"],
    ["100.5", "200.25", "1.879257192717390533080670316346745940951e-84"],
    ["1e6", "1e6", "3.616404690941285543468606180329420600357e-602063"],
  ];
  for (const [x, y, reference] of rows) {
    const shown = b(exact(dec(x)), exact(dec(y)));
    assert.equal(shown.slice(0, 2), "≈ ", `B(${x}, ${y}): ${shown}`);
    assert.ok(
      equals(dec(shown.slice(2)), dec(reference)),
      `B(${x}, ${y}): ${shown}`,
    );
  }
  // Large arguments pass through lgamma, cancelling: 1 / (a (a + 1)).
  assert.equal(
    b(exact(dec("1e400")), exact(dec("2")), { ...CONTEXT, precision: 8 }),
    "≈ 1e-800",
  );
  // Tiny arguments: 1 / a + 1 / b, at any exponent.
  assert.equal(
    b(exact(dec("1e-999999999")), exact(dec("1e-999999999")), {
      ...CONTEXT,
      precision: 8,
    }),
    "≈ 2e+999999999",
  );
  // A sum that does not align within the significand limit is the larger within the
  // smaller's magnitude: B(2.5, b) ≈ 1 / b for a tiny b.
  assert.equal(
    b(exact(dec("2.5")), exact(dec("1e-20000")), { ...CONTEXT, precision: 8 }),
    "≈ 1e+20000",
  );
});

test("beta of exact positive integers is the exact reciprocal where it fits the significand limit", () => {
  assert.equal(
    b(exact(dec("2")), exact(dec("3"))),
    "≈ 0.08333333333333333333333333333333333333333",
  );
  const twoThree = value(betaBall(exact(dec("2")), exact(dec("3")), CONTEXT));
  assert.ok(isExact(twoThree));
  assert.ok(equals(twoThree.mid, fromRational(rational(1n, 12n))));
  assert.equal(b(exact(dec("1")), exact(dec("1"))), "= 1");
  assert.equal(b(exact(dec("1e15")), exact(dec("1"))), "= 1e-15");
  assert.equal(
    b(exact(dec("4")), exact(dec("5"))),
    "≈ 0.003571428571428571428571428571428571428571",
  );
  // binomial(9998, 4999) has some ten thousand bits, within the significand limit.
  assert.ok(
    isExact(value(betaBall(exact(dec("5000")), exact(dec("5000")), CONTEXT))),
  );
  assert.equal(
    b(exact(dec("5000")), exact(dec("5000")), { ...CONTEXT, precision: 8 }),
    "≈ 2.5128939e-3012",
  );
  // binomial(79998, 39999) has eighty thousand, past them: the kernel's value.
  const large = value(
    betaBall(exact(dec("40000")), exact(dec("40000")), CONTEXT),
  );
  assert.ok(!isExact(large));
  assert.equal(
    b(exact(dec("40000")), exact(dec("40000")), { ...CONTEXT, precision: 8 }),
    "≈ 7.0619262e-24085",
  );
});

test("the poles: a domain error at an argument, zero at a pole of the sum alone, unresolved for a ball reaching one", () => {
  assert.deepEqual(error(betaBall(exact(dec("0")), exact(dec("1")), CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "pole",
  });
  assert.deepEqual(
    error(betaBall(exact(dec("1")), exact(dec("-2")), CONTEXT)),
    {
      kind: "domain",
      argument: 1,
      reason: "pole",
    },
  );
  assert.deepEqual(
    error(betaBall(exact(dec("-1")), exact(dec("-1")), CONTEXT)),
    {
      kind: "domain",
      argument: 0,
      reason: "pole",
    },
  );
  assert.equal(b(exact(dec("-0.5")), exact(dec("-0.5"))), "= 0");
  assert.equal(b(exact(dec("-1.5")), exact(dec("0.5"))), "= 0");
  assert.equal(b(exact(dec("2.5")), exact(dec("-2.5"))), "= 0");
  assert.deepEqual(
    error(betaBall(ball(dec("-2"), dec("0.1")), exact(dec("0.5")), CONTEXT)),
    {
      kind: "unresolved",
      argument: 0,
      edge: "pole",
    },
  );
  assert.deepEqual(
    error(betaBall(exact(dec("0.5")), ball(dec("0"), dec("1e-30")), CONTEXT)),
    {
      kind: "unresolved",
      argument: 1,
      edge: "pole",
    },
  );
  // The sum reaching a pole: blamed on the wider argument.
  assert.deepEqual(
    error(
      betaBall(ball(dec("-0.5"), dec("0.01")), exact(dec("-0.5")), CONTEXT),
    ),
    {
      kind: "unresolved",
      argument: 0,
      edge: "pole",
    },
  );
  assert.deepEqual(
    error(
      betaBall(exact(dec("-0.5")), ball(dec("-0.5"), dec("0.01")), CONTEXT),
    ),
    {
      kind: "unresolved",
      argument: 1,
      edge: "pole",
    },
  );
  // Inside the cells, a ball is a value containing the truth.
  const inside = value(
    betaBall(ball(dec("-2.5"), dec("0.001")), exact(dec("0.75")), CONTEXT),
  );
  assert.ok(
    contains(inside, dec("-0.4193490821574572726039728722981133573795")),
    inspect(inside),
  );
});

test("beta is held to the exponent bound by the classifier, and to the significand limit by the bits its logarithms need", () => {
  assert.deepEqual(
    error(betaBall(exact(dec("1e19")), exact(dec("1e19")), CONTEXT)),
    { kind: "underflow" },
  );
  assert.deepEqual(
    error(betaBall(exact(dec("1e20000")), exact(dec("2")), CONTEXT)),
    { kind: "tooLarge", inexact: "exceeds" },
  );
  assert.deepEqual(
    error(betaBall(exact(dec("2")), exact(dec("-1e999999999")), CONTEXT)),
    {
      kind: "domain",
      argument: 1,
      reason: "pole",
    },
  );
  // A huge negative argument within the limit: through the reflection,
  // 1 / (a (a + 1)).
  const huge = fromRational(rational(-(10n ** 400n), 3n));
  assert.equal(
    b(exact(huge), exact(dec("2")), { ...CONTEXT, precision: 8 }),
    "≈ 9e-800",
  );
  // A sum at or past the top of the bound: both arguments huge, the
  // result past the bottom.
  const nearTop = exact(dec("5e1000000000000000000"));
  assert.deepEqual(error(betaBall(nearTop, nearTop, CONTEXT)), {
    kind: "underflow",
  });
  // A logarithm across the bottom of the bound: beta(a, a) is near
  // 2^-2a, which crosses 10^-(10^18) near a = 1.66e18; a ball of a
  // there is unresolved at the bound, blamed on the wider argument.
  assert.deepEqual(
    error(
      betaBall(
        ball(dec("1.66e18"), dec("2e16")),
        exact(dec("1.66e18")),
        CONTEXT,
      ),
    ),
    { kind: "unresolved", argument: 0, edge: "bound" },
  );
  assert.deepEqual(
    error(betaBall(exact(dec("1.7e18")), exact(dec("1.7e18")), CONTEXT)),
    { kind: "underflow" },
  );
  assert.ok(betaBall(exact(dec("1.6e18")), exact(dec("1.6e18")), CONTEXT).ok);
});

test("an unbounded radius, and the rounding modes", () => {
  const unbounded: Ball = { mid: dec("0.5"), rad: UNBOUNDED };
  const result = value(betaBall(unbounded, exact(dec("0.5")), CONTEXT));
  assert.equal(result.rad.kind, "unbounded");
  assert.equal(
    show(result, { digits: 8, rounding: DEFAULT_ROUNDING }).text,
    "3.1415927",
  );
  assert.equal(
    value(betaBall(exact(dec("0.5")), unbounded, CONTEXT)).rad.kind,
    "unbounded",
  );
  for (const rounding of ROUNDING_MODES) {
    const shown = show(
      value(betaBall(exact(dec("0.5")), exact(dec("1.5")), CONTEXT)),
      { digits: 8, rounding },
    );
    assert.equal(shown.kind, "certified", rounding);
    assert.ok(/^1\.570796[34]$/.test(shown.text), `${rounding}: ${shown.text}`);
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
    return describeTextError(result.error, source, table.primitives, "exact");
  const shown = show(result.value.magnitude, {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}`;
}

test("beta through the pipeline, with its messages", () => {
  assert.equal(run("beta(0.5, 0.5)"), "≈ 3.1415927");
  assert.equal(run("beta(2, 3)"), "≈ 0.083333333");
  assert.equal(run("1 / beta(2, 3)"), "= 12");
  assert.equal(run("beta(1, 1)"), "= 1");
  assert.equal(run("beta(approx(2), 3)"), "≈ 0.083333333");
  assert.equal(run("beta(-0.5, -0.5)"), "= 0");
  assert.equal(run("beta(1e6, 1e6)"), "≈ 3.6164047e-602063");
  assert.equal(
    run("beta(2, 3)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "= 0.083333333",
  );
  assert.equal(
    run("beta(0, 1)"),
    'Cannot compute "beta(0, 1)": "0" is a pole of "beta", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("beta(1, approx(-2))"),
    '"approx(-2)" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    run("beta(1e19, 1e19)"),
    '"beta(1e19, 1e19)" is too small to compute: its exponent would fall below -10^18.',
  );
  assert.equal(
    run("beta(1e20000, 2)"),
    '"beta(1e20000, 2)" would need a significand past the significand limit, however it is computed.',
  );
  assert.equal(
    run("beta(2 m, 3)"),
    'Cannot apply "beta" to "2 m": "2 m" has dimension m, but the first argument of "beta" must be a plain number.',
  );
  // The binomial's refusals of a value it does not take point here.
  assert.equal(
    run("binomial(2.5, 1)"),
    'Cannot compute "binomial(2.5, 1)": "2.5" is not a whole number, and "binomial" is defined only for whole numbers; "beta" takes any values, with 1 / ((n + 1) beta(n - k + 1, k + 1)) for binomial(n, k).',
  );
  assert.equal(run("1 / ((5 + 1) beta(5 - 2 + 1, 2 + 1))"), "= 10");
  assert.equal(run("1 / ((2.5 + 1) beta(2.5 - 1 + 1, 1 + 1))"), "≈ 2.5");
});
