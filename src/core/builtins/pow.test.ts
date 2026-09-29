import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, exact, isExact, position, type Ball } from "../ball.ts";
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
  ONE,
  ZERO,
  absolute,
  compare,
  decimalExponent,
  fromRational,
  multiply,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball as ballOf, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import { pow, powBallOf } from "./pow.ts";

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
/** `10^(100000/3)`, from Python's decimal module at a precision of 60. */
const TEN_TO_100000_THIRDS = dec(
  "2.15443469003188372175929356651935049525934494219210858232388e33333",
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
    value(powBallOf(exact(fr(10n)), exact(fr(2n)), CONTEXT)),
    exact(fr(100n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(fr(8n)), exact(fr(1n, 3n)), CONTEXT)),
    exact(fr(2n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(fr(1n, 4n)), exact(fr(3n, 2n)), CONTEXT)),
    exact(fr(1n, 8n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(fr(-8n)), exact(fr(1n, 3n)), CONTEXT)),
    exact(fr(-2n)),
  );
  assert.deepEqual(
    value(powBallOf(exact(ZERO), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  assert.deepEqual(
    value(powBallOf(exact(fr(7n)), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  assert.deepEqual(
    value(powBallOf(ball("7", "1"), exact(ZERO), CONTEXT)),
    exact(ONE),
  );
  // A power of ten costs nothing: 10^100000 is exactly 1e100000.
  assert.deepEqual(
    value(powBallOf(exact(fr(10n)), exact(fr(100000n)), CONTEXT)),
    exact(dec("1e100000")),
  );
  // Neighbors of the exact cases are inexact, through the root route.
  const half = value(powBallOf(exact(fr(2n)), exact(fr(1n, 2n)), CONTEXT));
  assert.ok(!isExact(half));
  assertNear(half, SQRT2, 45, "pow(2, 1/2)");
  const negative = value(powBallOf(exact(fr(-2n)), exact(fr(1n, 3n)), CONTEXT));
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
    value(powBallOf(exact(fr(10n)), exact(dec("2.3456789")), CONTEXT)),
    TEN_TO_2_3456789,
    45,
    "pow(10, 2.3456789)",
  );
  assertNear(
    value(powBallOf(exact(fr(2n)), exact(dec("0.1234567")), CONTEXT)),
    TWO_TO_0_1234567,
    45,
    "pow(2, 0.1234567)",
  );
  // A base of ten under a large rational exponent is a value, its
  // exponent carried as the exponent it is; a base of seven is not, its
  // power's mantissa beyond the range limit.
  const tenThirds = value(
    powBallOf(exact(fr(10n)), exact(fr(100000n, 3n)), CONTEXT),
  );
  assert.ok(!isExact(tenThirds));
  assert.equal(decimalExponent(tenThirds.mid), 33333n);
  assert.ok(certifies(tenThirds, 40, "halfEven"));
  assert.ok(
    compare(distance(tenThirds.mid, TEN_TO_100000_THIRDS), dec("1e33290")) < 0,
  );
  // A base that is not a power of ten goes through log space, and the
  // result has the range of its exponent (4.9): 7^(100000/3) from
  // Python's decimal module at a precision of 70.
  const sevenThirds = value(
    powBallOf(exact(fr(7n)), exact(fr(100000n, 3n)), CONTEXT),
  );
  assert.equal(decimalExponent(sevenThirds.mid), 28169n);
  assert.ok(certifies(sevenThirds, 30, "halfEven"));
  assert.ok(
    compare(
      distance(
        sevenThirds.mid,
        dec("8.603341100210093535833101714461038568682e28169"),
      ),
      dec("1e28135"),
    ) < 0,
  );
  // Beyond the exponent bound, above it or below: 7^(±10^19) is refused by
  // its mantissa first and 0.7^(10^19) by its exponent, 0.7 being 7 ×
  // 10^-1, and each is reported at the bound, which would refuse it
  // whatever the range limit.
  assert.deepEqual(
    failure(powBallOf(exact(fr(7n)), exact(dec("1e19")), CONTEXT)),
    { kind: "tooLarge", limit: "exponentAbove" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(fr(7n)), exact(dec("-1e19")), CONTEXT)),
    { kind: "tooLarge", limit: "exponentBelow" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(dec("0.7")), exact(dec("1e19")), CONTEXT)),
    { kind: "tooLarge", limit: "exponentBelow" },
  );
  // An exact exponent whose fraction cannot be formed within the range
  // limit: at the bound when the power would pass it, and at the range
  // limit when it would not (2^(1e-999999999) is within a hair of one).
  assert.deepEqual(
    failure(powBallOf(exact(fr(2n)), exact(dec("1e999999999")), CONTEXT)),
    { kind: "tooLarge", limit: "exponentAbove" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(fr(2n)), exact(dec("1e-999999999")), CONTEXT)),
    { kind: "tooLarge", limit: "range" },
  );
  // A base within 2^-30 of one is past the bound by its exact difference
  // from one; a base of magnitude one never is, so its refusal is the
  // exponent's, which cannot be formed.
  assert.deepEqual(
    failure(
      powBallOf(exact(dec("1.0000000001")), exact(dec("1e999999999")), CONTEXT),
    ),
    { kind: "tooLarge", limit: "exponentAbove" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(ONE), exact(dec("1e999999999")), CONTEXT)),
    { kind: "tooLarge", limit: "range" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(fr(-2n)), exact(fr(1n, 2n)), CONTEXT)),
    {
      kind: "negativeRadicand",
      degree: 2n,
    },
  );
  assert.deepEqual(
    failure(powBallOf(exact(ZERO), exact(fr(-1n, 2n)), CONTEXT)),
    {
      kind: "divisionByZero",
    },
  );
  assert.deepEqual(
    failure(powBallOf(ball("0", "1"), exact(fr(1n, 2n)), CONTEXT)),
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
  const result = value(powBallOf(exact(fr(2n)), sqrt2, CONTEXT));
  assert.ok(!isExact(result));
  assertNear(result, TWO_TO_SQRT2, 45, "pow(2, sqrt(2))");
  // The exponent's radius reaches the result: 2^(sqrt 2 ± 1e-20) spans about 2 × 1.85 × 1e-20.
  const wide = value(
    powBallOf(
      exact(fr(2n)),
      ball("1.41421356237309504880168872420969807857", "1e-20"),
      CONTEXT,
    ),
  );
  assertNear(wide, TWO_TO_SQRT2, 19, "pow(2, sqrt(2) ± 1e-20)");
  assert.ok(compare(radiusOf(wide), dec("1.8e-20")) > 0);
  assert.ok(compare(radiusOf(wide), dec("2e-20")) < 0);
  // A base below one, and a negative exponent.
  assertNear(
    value(
      powBallOf(
        exact(dec("0.5")),
        ball(
          "-1.4142135623730950488016887242096980785696718753769480731766797379907324784621",
          "1e-76",
        ),
        CONTEXT,
      ),
    ),
    TWO_TO_SQRT2,
    45,
    "pow(0.5, -sqrt(2))",
  );
  // A non-positive base is a domain error, a straddling one unresolved.
  for (const x of [exact(fr(-2n)), ball("-2", "1"), ball("-1", "1")]) {
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
  // A result beyond the exponent bound; within it, a value however large.
  assert.deepEqual(
    failure(powBallOf(exact(fr(10n)), ball("1e19", "1"), CONTEXT)),
    { kind: "tooLarge", limit: "exponentAbove" },
  );
  assert.deepEqual(
    failure(powBallOf(exact(fr(10n)), ball("-1e19", "1"), CONTEXT)),
    { kind: "tooLarge", limit: "exponentBelow" },
  );
  // An exponent beyond a double is past the bound on the side the signs
  // give, both of them.
  for (const [base, exponent, limit] of [
    ["0.5", "1e400", "exponentBelow"],
    ["0.5", "-1e400", "exponentAbove"],
    ["2", "1e400", "exponentAbove"],
    ["2", "-1e400", "exponentBelow"],
  ] as const) {
    assert.deepEqual(
      failure(powBallOf(exact(dec(base)), ball(exponent, "1"), CONTEXT)),
      { kind: "tooLarge", limit },
    );
  }
  // A wide exponent gives a wide result: a ball that covers 10^100000.
  const wideExponent = value(
    powBallOf(exact(fr(10n)), ball("100000", "1"), CONTEXT),
  );
  assert.notEqual(position(wideExponent, dec("1e100000")), "above");
  assert.notEqual(position(wideExponent, dec("1e100000")), "below");
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
  const unbounded = { mid: fr(2n), rad: UNBOUNDED };
  assert.deepEqual(value(powBallOf(unbounded, exact(fr(3n)), CONTEXT)), {
    mid: fr(8n),
    rad: UNBOUNDED,
  });
  const exponent = value(powBallOf(exact(fr(2n)), unbounded, CONTEXT));
  assert.deepEqual(exponent, { mid: fr(4n), rad: UNBOUNDED });
  const both = value(
    powBallOf(unbounded, { mid: dec("0.5"), rad: UNBOUNDED }, CONTEXT),
  );
  assert.deepEqual(both.rad, UNBOUNDED);
  assert.ok(compare(distance(both.mid, SQRT2), dec("1e-40")) < 0);
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
    ["pow(10, 100000/3)", "2.15443469003188372175929356652e+33333"],
    ["pow(7, 100000/3)", "8.60334110021009353583310171446e+28169"],
    ["pow(2, 1e6 / 3)", "2.14727661156281285594787335594e+100343"],
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
  const tenPower = evaluateText(table.value, "pow(10, 100000) m", {
    ...context,
    precision: 8,
  });
  assert.ok(tenPower.ok && isExact(tenPower.value.magnitude));
  assert.deepEqual(tenPower.value.magnitude.mid, dec("1e100000"));
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
    [
      "pow(7, 1e19)",
      '"pow(7, 1e19)" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "7^10000000000000000000",
      '"7^10000000000000000000" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "pow(2, 1e999999999)",
      '"pow(2, 1e999999999)" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "pow(2, 1e-999999999)",
      '"pow(2, 1e-999999999)" is too large to compute within Most bits.',
    ],
    ["2^1442695", '"2^1442695" is too large to compute within Most bits.'],
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
