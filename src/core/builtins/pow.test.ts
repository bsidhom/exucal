import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, type Ball } from "../ball.ts";
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
  ONE,
  ZERO,
  absolute,
  compare,
  multiply,
  rational,
  subtract,
  type Rational,
} from "../rational.ts";
import { parseFraction } from "../../testing/fraction.ts";
import type { Result } from "../result.ts";
import { describeTextError } from "../../messages.ts";
import { pow, powBallOf } from "./pow.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function dec(text: string): Rational {
  const result = parseFraction(text);
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

/** Asserts that `ball` contains `reference` and its radius is below `|reference| × 10^-digits`. */
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
    compare(
      radiusUpper(ball.rad),
      multiply(absolute(reference), rational(1n, 10n ** BigInt(digits))),
    ) < 0,
    `${label}: radius`,
  );
}

/** A ball of `mid` with the radius `rad`, as decimals. */
function ball(mid: string, rad: string): Ball {
  return { mid: dec(mid), rad: radiusAbove(dec(rad)) };
}

// References from Python's decimal module at a precision of 140.
const SQRT2 = dec(
  "1.4142135623730950488016887242096980785696718753769480731766797379907324784621",
);
const TWO_TO_SQRT2 = dec(
  "2.6651441426902251886502972498731398482742113137146594928359795933649204461787",
);
const TEN_TO_2_3456789 = dec(
  "221.65569800753690957294303882914688855431729064360237868185447239495302889375",
);
const TWO_TO_0_1234567 = dec(
  "1.0893418031470773148891376479448623493688955711270801735985376572257842801640",
);

test("pow is two plain numbers to a plain number", () => {
  assert.equal(pow.name, "pow");
  assert.deepEqual(pow.arity, { min: 2, max: 2 });
  assert.deepEqual(pow.dimensions([DIMENSIONLESS, DIMENSIONLESS], new Map()), {
    ok: true,
    value: DIMENSIONLESS,
  });
  assert.equal(BUILTINS.get("pow"), pow);
});

test("an exact exponent follows the rule of ^: integer powers, perfect roots, the root route and log space", () => {
  assert.deepEqual(
    value(powBallOf(exact(rational(10n)), exact(rational(2n)), CONTEXT)),
    exact(rational(100n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(rational(8n)), exact(rational(1n, 3n)), CONTEXT)),
    exact(rational(2n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(rational(1n, 4n)), exact(rational(3n, 2n)), CONTEXT)),
    exact(rational(1n, 8n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(rational(-8n)), exact(rational(1n, 3n)), CONTEXT)),
    exact(rational(-2n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(ZERO), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  assert.deepEqual(
    value(powBallOf(exact(rational(7n)), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  assert.deepEqual(
    value(powBallOf(ball("7", "1"), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  // Neighbors of the exact cases are inexact, through the root route.
  const half = value(
    powBallOf(exact(rational(2n)), exact(rational(1n, 2n)), CONTEXT),
  );
  assert.ok(!isExact(half));
  assertNear(half, SQRT2, 45, "pow(2, 1/2)");
  const negative = value(
    powBallOf(exact(rational(-2n)), exact(rational(1n, 3n)), CONTEXT),
  );
  assertNear(
    negative,
    dec(
      "-1.2599210498948731647672106072782283505702514647015079800819751121552996765139",
    ),
    45,
    "pow(-2, 1/3)",
  );
  // Log space, where the power of the base does not fit the range limit.
  assertNear(
    value(powBallOf(exact(rational(10n)), exact(dec("2.3456789")), CONTEXT)),
    TEN_TO_2_3456789,
    45,
    "pow(10, 2.3456789)",
  );
  assertNear(
    value(powBallOf(exact(rational(2n)), exact(dec("0.1234567")), CONTEXT)),
    TWO_TO_0_1234567,
    45,
    "pow(2, 0.1234567)",
  );
  // And the result is still held to the range limit.
  assert.deepEqual(
    failure(
      powBallOf(exact(rational(10n)), exact(rational(100000n, 3n)), CONTEXT),
    ),
    {
      kind: "tooLarge",
    },
  );
  assert.deepEqual(
    failure(powBallOf(exact(rational(-2n)), exact(rational(1n, 2n)), CONTEXT)),
    {
      kind: "negativeRadicand",
      degree: 2n,
    },
  );
  assert.deepEqual(
    failure(powBallOf(exact(ZERO), exact(rational(-1n, 2n)), CONTEXT)),
    {
      kind: "divisionByZero",
    },
  );
  assert.deepEqual(
    failure(powBallOf(ball("0", "1"), exact(rational(1n, 2n)), CONTEXT)),
    {
      kind: "unresolved",
      argument: 0,
      edge: ZERO,
    },
  );
});

test("an inexact exponent is log space for a positive base, and the base's sign decides otherwise", () => {
  const sqrt2 = ball(
    "1.4142135623730950488016887242096980785696718753769480731766797379907324784621",
    "1e-76",
  );
  const result = value(powBallOf(exact(rational(2n)), sqrt2, CONTEXT));
  assert.ok(!isExact(result));
  assertNear(result, TWO_TO_SQRT2, 45, "pow(2, sqrt(2))");
  // The exponent's radius reaches the result: 2^(sqrt 2 ± 1e-20) spans about 2 × 1.85 × 1e-20.
  const wide = value(
    powBallOf(
      exact(rational(2n)),
      ball("1.41421356237309504880168872420969807857", "1e-20"),
      CONTEXT,
    ),
  );
  assertNear(wide, TWO_TO_SQRT2, 19, "pow(2, sqrt(2) ± 1e-20)");
  assert.ok(compare(radiusUpper(wide.rad), dec("1.8e-20")) > 0);
  assert.ok(compare(radiusUpper(wide.rad), dec("2e-20")) < 0);
  // A base below one, and a negative exponent.
  assertNear(
    value(
      powBallOf(
        exact(dec("0.5")),
        {
          mid: dec(
            "-1.4142135623730950488016887242096980785696718753769480731766797379907324784621",
          ),
          rad: radiusAbove(dec("1e-76")),
        },
        CONTEXT,
      ),
    ),
    TWO_TO_SQRT2,
    45,
    "pow(0.5, -sqrt(2))",
  );
  // A non-positive base is a domain error, a straddling one unresolved.
  for (const x of [exact(rational(-2n)), ball("-2", "1"), ball("-1", "1")]) {
    assert.deepEqual(failure(powBallOf(x, sqrt2, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
  }
  assert.deepEqual(failure(powBallOf(ball("0.5", "1"), sqrt2, CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: ZERO,
  });
  // A result beyond the range limit.
  assert.deepEqual(
    failure(powBallOf(exact(rational(10n)), ball("100000", "1"), CONTEXT)),
    {
      kind: "tooLarge",
    },
  );
});

test("an exact zero base under an inexact exponent: zero, division by zero, or unresolved at the exponent", () => {
  assert.deepEqual(
    value(powBallOf(exact(ZERO), ball("1.5", "0.5"), CONTEXT)),
    exact(ZERO),
  );
  assert.deepEqual(
    failure(powBallOf(exact(ZERO), ball("-1.5", "0.5"), CONTEXT)),
    {
      kind: "divisionByZero",
    },
  );
  for (const y of [ball("0", "1"), ball("1", "1"), ball("-1", "1")]) {
    assert.deepEqual(failure(powBallOf(exact(ZERO), y, CONTEXT)), {
      kind: "unresolved",
      argument: 1,
      edge: ZERO,
    });
  }
});

test("unbounded arguments give the power of the midpoints with an unbounded radius", () => {
  const unbounded = { mid: rational(2n), rad: UNBOUNDED };
  assert.deepEqual(value(powBallOf(unbounded, exact(rational(3n)), CONTEXT)), {
    mid: rational(8n),
    rad: UNBOUNDED,
  });
  const exponent = value(powBallOf(exact(rational(2n)), unbounded, CONTEXT));
  assert.deepEqual(exponent, { mid: rational(4n), rad: UNBOUNDED });
  const both = value(
    powBallOf(unbounded, { mid: dec("0.5"), rad: UNBOUNDED }, CONTEXT),
  );
  assert.deepEqual(both.rad, UNBOUNDED);
  assert.ok(compare(absolute(subtract(both.mid, SQRT2)), dec("1e-40")) < 0);
});

test("through the pipeline: 2^0.1234567 and pow(10, 2.3456789) certify, pow(2 m, 2) says to write (2 m)^2, and the other errors are worded", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  for (const [text, digits] of [
    ["2^0.1234567", "1.08934180314707731488913764794"],
    ["pow(10, 2.3456789)", "221.655698007536909572943038829"],
    ["pow(2, sqrt(2))", "2.66514414269022518865029724987"],
    ["pow(2, 1/2)", "1.41421356237309504880168872421"],
  ]) {
    const result = evaluateText(table.value, text!, {
      ...context,
      precision: 30,
    });
    assert.ok(result.ok, inspect(result));
    const shown = show(result.value.magnitude, 30, DEFAULT_ROUNDING);
    assert.equal(shown.kind, "certified", text);
    assert.equal(shown.text, digits, text);
  }
  const zero = evaluateText(table.value, "pow(0, 0) m", {
    ...context,
    precision: 8,
  });
  assert.ok(zero.ok && isExact(zero.value.magnitude));
  assert.deepEqual(zero.value.magnitude.mid, ONE);
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "pow(2 m, 2)",
      'Cannot apply "pow" to "2 m": the base must be a plain number; for a power of a quantity, write "(2 m)^2".',
    ],
    ["pow(-2, 1/2)", '"pow(-2, 1/2)" takes an even root of a negative value.'],
    [
      "pow(-2, sqrt(2))",
      'Cannot compute "pow(-2, sqrt(2))": "-2" is not positive, and a power with an inexact exponent is defined only for a positive base.',
    ],
    ["pow(0, -sqrt(2))", 'Division by zero in "pow(0, -sqrt(2))".'],
    [
      "pow(0, (2^(1/2))^2 - 2)",
      '"(2^(1/2))^2 - 2" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
    ],
    ["pow(10, 100000/3)", '"pow(10, 100000/3)" is too large to compute.'],
    ["10^(100000/3)", '"10^(100000/3)" is too large to compute.'],
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
  const zeroPower = evaluateText(table.value, "pow(0, sqrt(2))", {
    ...context,
    precision: 8,
  });
  assert.ok(zeroPower.ok && isExact(zeroPower.value.magnitude));
  assert.deepEqual(zeroPower.value.magnitude.mid, ZERO);
});
