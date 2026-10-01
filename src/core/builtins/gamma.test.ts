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
import { fromRational } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { digamma, digammaBall } from "./gamma.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** `digamma(x)` at forty digits, shown. */
function psi(x: Ball, context: NumberContext = CONTEXT): string {
  const shown = show(
    value(digammaBall(x, context)),
    context.precision,
    context.rounding,
  );
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}${shown.kind === "certified" || shown.kind === "exact" ? "" : ` [${shown.kind}]`}`;
}

test("digamma takes a plain number and gives one", () => {
  assert.equal(digamma.name, "digamma");
  assert.deepEqual(digamma.arity, { min: 1, max: 1 });
  const primitives = new Map([["m", "dimension" as const]]);
  assert.ok(digamma.dimensions([DIMENSIONLESS], primitives).ok);
  const failed = digamma.dimensions([primitive("m")], primitives);
  assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
});

test("digamma matches mpmath to forty digits on positive and negative arguments", () => {
  // From mpmath, `psi(0, x)` at 50 digits rounded to 40 by `nstr`; the
  // negative arguments take the reflection, the small ones the kernel at
  // extra bits, 1e19 and 1e30 the kernel with no shift.
  const rows: readonly [string, string][] = [
    ["1", "-0.5772156649015328606065120900824024310422"],
    ["0.5", "-1.963510026021423479440976332998755567193"],
    ["2", "0.4227843350984671393934879099175975689578"],
    ["7", "1.872784335098467139393487909917597568958"],
    ["10", "2.251752589066721107647456163885851537212"],
    ["100.5", "4.605174352581845211868678785604714548573"],
    ["3.7", "1.167153539361511385873863966145046881174"],
    ["0.25", "-4.227453533376265408089530146096683577367"],
    ["0.9999", "-0.5773801703298691417827632771944969155335"],
    ["1e-6", "-1000000.577214019968668068200913015168235"],
    ["1e-20", "-100000000000000000000.5772156649015328606"],
    ["-0.5", "0.03648997397857652055902366700124443280684"],
    ["-0.75", "-2.894120200042932074756196812763350244034"],
    ["-1.5", "0.7031566406452431872256903336679110994735"],
    ["-2.75", "-1.959055264977997009821131877698415179099"],
    ["-100.5", "4.615124601338064117341315601525112558523"],
    ["-0.000001", "999999.4227826901631982331815675725771205"],
    ["1e19", "43.74911676688686799629183763900291994442"],
    ["1e30", "69.07755278982137052053974364053042622803"],
    ["123456789", "18.63140176211801799087143291307419983533"],
  ];
  for (const [x, reference] of rows) {
    assert.equal(psi(exact(dec(x))), `≈ ${reference}`, `ψ(${x})`);
  }
  // A negative argument of a huge magnitude: the reflection's cotangent is
  // taken at the fractional part, 2/3 here, and ψ(1 - x) is ln(1 - x)
  // within 1 / (1 - x), beyond 2^bits (mpmath at 460 digits).
  const huge = fromRational(rational(-(10n ** 400n), 3n));
  assert.equal(psi(exact(huge)), "≈ 921.7492242731843817663954148944653130681");
  // Beyond the exponent's reach of any kernel value: ln x within 1 / x.
  assert.equal(
    psi(exact(dec("1e999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 2.3025851e+9",
  );
  // Below 2^-maxBits throughout: ψ(1) - 1 / x within 2x.
  assert.equal(
    psi(exact(dec("1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ -1e+999999999",
  );
  assert.equal(psi(exact(dec("4e-400"))), "≈ -2.5e+399");
});

test("the poles: a domain error for an exact non-positive integer, unresolved for a ball reaching one", () => {
  for (const x of ["0", "-1", "-3", "-1e400", "-1e999999999"]) {
    assert.deepEqual(error(digammaBall(exact(dec(x)), CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "pole",
    });
  }
  for (const b of [
    ball(dec("-2"), dec("0.1")),
    ball(dec("0"), dec("1e-30")),
    ball(dec("1e-31"), dec("1e-30")),
    ball(dec("-0.95"), dec("0.1")),
    ball(dec("5"), dec("2e948")),
    ball(dec("-1e400"), dec("1")),
  ]) {
    assert.deepEqual(error(digammaBall(b, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: "pole",
    });
  }
  // Inside a negative cell, a ball is a value.
  const inside = value(digammaBall(ball(dec("-2.5"), dec("0.1")), CONTEXT));
  assert.ok(!isExact(inside));
  const shown = show(inside, 40, DEFAULT_ROUNDING);
  assert.ok(
    shown.kind === "partial" && shown.text.startsWith("1.103"),
    inspect(shown),
  );
});

test("an unbounded radius, and the rounding modes", () => {
  const unbounded: Ball = { mid: dec("2"), rad: UNBOUNDED };
  const result = value(digammaBall(unbounded, CONTEXT));
  assert.equal(result.rad.kind, "unbounded");
  assert.equal(show(result, 8, DEFAULT_ROUNDING).text, "0.42278434");
  for (const rounding of ROUNDING_MODES) {
    const shown = show(
      value(digammaBall(exact(dec("2")), CONTEXT)),
      8,
      rounding,
    );
    assert.equal(shown.kind, "certified", rounding);
    assert.ok(
      /^0\.4227843[34]$/.test(shown.text),
      `${rounding}: ${shown.text}`,
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
  const shown = show(
    result.value.magnitude,
    context.precision,
    context.rounding,
  );
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}`;
}

test("digamma through the pipeline, with its messages", () => {
  assert.equal(run("digamma(1)"), "≈ -0.57721566");
  assert.equal(run("digamma(approx(3))"), "≈ 0.92278434");
  assert.equal(run("digamma(sqrt(2))"), "≈ -0.046909626");
  assert.equal(run("digamma(-1e400/3)"), "≈ 921.74922");
  assert.equal(run("digamma(1e-999999999)"), "≈ -1e+999999999");
  assert.equal(
    run("digamma(1)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "≈ -0.57721566",
  );
  assert.equal(
    run("digamma(0)"),
    'Cannot compute "digamma(0)": "0" is a pole of "digamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("digamma(-3)"),
    'Cannot compute "digamma(-3)": "-3" is a pole of "digamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("digamma(approx(-2))"),
    '"approx(-2)" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    run("digamma(2 m)"),
    'Cannot apply "digamma" to "2 m": "2 m" has dimension m, but the argument of "digamma" must be a plain number.',
  );
  // A ball straddling a pole at the first pass and not at a later one:
  // retried, and resolved.
  assert.equal(run("digamma(-2.5 + 1e-30 * approx(1))"), "≈ 1.1031566");
});
