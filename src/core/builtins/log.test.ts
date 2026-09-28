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
import { ln2Fixed } from "../fixed-log.ts";
import { bitsFor, fixedToBall } from "../fixed.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED, radiusAbove, radiusUpper } from "../radius.ts";
import {
  ONE,
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
import {
  integerPower,
  ln,
  lnBall,
  log,
  log10,
  log10Ball,
  log2,
  log2Ball,
  logBall,
} from "./log.ts";

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

/** A ball of `mid` with the radius `rad`, as decimals. */
function ball(mid: string, rad: string): Ball {
  return { mid: dec(mid), rad: radiusAbove(dec(rad)) };
}

test("the logarithms are plain numbers to a plain number, ln, log10 and log2 of one argument and log of two", () => {
  for (const [fn, name, count] of [
    [ln, "ln", 1],
    [log10, "log10", 1],
    [log2, "log2", 1],
    [log, "log", 2],
  ] as const) {
    assert.equal(fn.name, name);
    assert.deepEqual(fn.arity, { min: count, max: count });
    assert.deepEqual(
      fn.dimensions(
        Array<typeof DIMENSIONLESS>(count).fill(DIMENSIONLESS),
        new Map(),
      ),
      { ok: true, value: DIMENSIONLESS },
    );
    assert.equal(BUILTINS.get(name), fn);
  }
});

test("the exact cases: ln(1), integer powers of ten and two, and log of integer powers either way", () => {
  assert.deepEqual(value(lnBall(exact(ONE), CONTEXT)), exact(ZERO));
  for (const [x, expected] of [
    ["1000", "3"],
    ["1", "0"],
    ["0.01", "-2"],
    ["10", "1"],
  ]) {
    assert.deepEqual(
      value(log10Ball(exact(dec(x!)), CONTEXT)),
      exact(dec(expected!)),
    );
  }
  for (const [x, expected] of [
    ["1024", "10"],
    ["0.125", "-3"],
    ["2", "1"],
  ]) {
    assert.deepEqual(
      value(log2Ball(exact(dec(x!)), CONTEXT)),
      exact(dec(expected!)),
    );
  }
  for (const [b, x, expected] of [
    ["2", "8", "3"],
    ["3", "1/9", "-2"],
    ["8", "2", "1/3"],
    ["2/3", "8/27", "3"],
    ["1/2", "8", "-3"],
    ["8", "1/2", "-1/3"],
    ["7", "1", "0"],
    ["0.1", "1000", "-3"],
  ]) {
    const [n, d] = expected!.split("/");
    assert.deepEqual(
      value(logBall(exact(fraction(b!)), exact(fraction(x!)), CONTEXT)),
      exact(rational(BigInt(n!), d === undefined ? 1n : BigInt(d))),
      `log(${b}, ${x})`,
    );
  }
  // A rational exponent is not looked for, and a non-power is inexact.
  const fourEight = value(
    logBall(exact(rational(4n)), exact(rational(8n)), CONTEXT),
  );
  assert.ok(!isExact(fourEight));
  assertNear(fourEight, dec("1.5"), 45, "log(4, 8)");
  assert.ok(!isExact(value(log10Ball(exact(rational(20n)), CONTEXT))));
  assert.ok(!isExact(value(log2Ball(exact(rational(6n)), CONTEXT))));
  assert.equal(integerPower(rational(10n), rational(1n)), 0n);
  assert.equal(integerPower(rational(10n), rational(100n)), 2n);
  assert.equal(integerPower(rational(10n), rational(1n, 100n)), -2n);
  assert.equal(integerPower(rational(10n), rational(20n)), undefined);
  assert.equal(integerPower(rational(2n, 3n), rational(9n, 4n)), -2n);
  assert.equal(integerPower(rational(2n, 3n), rational(4n, 3n)), undefined);
});

function fraction(text: string): Rational {
  const [n, d] = text.split("/");
  return d === undefined ? dec(n!) : rational(BigInt(n!), BigInt(d));
}

test("ln(2) and ln(10) are their memos, and other values are the kernel's, within the radius", () => {
  const two = value(lnBall(exact(rational(2n)), CONTEXT));
  assert.deepEqual(
    two,
    fixedToBall(ln2Fixed(bitsFor(40), bitsFor(DEFAULT_CEILING))),
  );
  // References from Python's decimal module.
  assertNear(
    value(lnBall(exact(rational(10n)), CONTEXT)),
    dec(
      "2.302585092994045684017991454684364207601101488628772976033327900967572609677",
    ),
    45,
    "ln(10)",
  );
  assertNear(
    value(lnBall(exact(rational(3n)), CONTEXT)),
    dec(
      "1.098612288668109691395245236922525704647490557822749451734694333637494293218",
    ),
    45,
    "ln(3)",
  );
  assertNear(
    value(log10Ball(exact(rational(2n)), CONTEXT)),
    dec(
      "0.301029995663981195213738894724493026768189881462108541310427461127108189274",
    ),
    45,
    "log10(2)",
  );
  assertNear(
    value(log10Ball(exact(dec("123.456")), CONTEXT)),
    dec(
      "2.091512201627771681069399777067905794653584187688700440639999592554934757321",
    ),
    45,
    "log10(123.456)",
  );
  assertNear(
    value(log2Ball(exact(rational(10n)), CONTEXT)),
    dec(
      "3.321928094887362347870319429489390175864831393024580612054756395815934776608",
    ),
    45,
    "log2(10)",
  );
  assertNear(
    value(log2Ball(exact(dec("0.3")), CONTEXT)),
    dec(
      "-1.736965594166206166416580485541573667105016985332099551599003741274836548814",
    ),
    45,
    "log2(0.3)",
  );
  assertNear(
    value(logBall(exact(rational(3n)), exact(rational(7n)), CONTEXT)),
    dec(
      "1.771243749161422260067928307082457718066471334594243479368992577279886198702",
    ),
    45,
    "log(3, 7)",
  );
  // A tiny argument loses nothing to the conversion.
  assertNear(
    value(lnBall(exact(dec("1e-300")), CONTEXT)),
    dec(
      "-690.7755278982137052053974364053092622803304465886318928099983702902717829032",
    ),
    44,
    "ln(1e-300)",
  );
});

test("an inexact argument's logarithm contains the logarithms of its ends", () => {
  const x = ball("3", "1e-20");
  const result = value(lnBall(x, CONTEXT));
  assertNear(
    result,
    dec(
      "1.098612288668109691395245236922525704647490557822749451734694333637494293218",
    ),
    19,
    "ln(3 ± 1e-20)",
  );
  // The radius covers the argument's over the derivative 1/3: about 3.3e-21.
  assert.ok(compare(radiusUpper(result.rad), dec("3.3e-21")) > 0);
  assert.ok(compare(radiusUpper(result.rad), dec("3.5e-21")) < 0);
  const quotient = value(
    logBall(ball("3", "1e-20"), ball("7", "1e-20"), CONTEXT),
  );
  assertNear(
    quotient,
    dec(
      "1.771243749161422260067928307082457718066471334594243479368992577279886198702",
    ),
    19,
    "log(3 ± 1e-20, 7 ± 1e-20)",
  );
});

test("an argument that is not positive is a domain error, and one straddling zero is unresolved at zero", () => {
  for (const x of [
    exact(ZERO),
    exact(rational(-1n)),
    ball("-1", "0.5"),
    ball("-1", "1"),
  ]) {
    assert.deepEqual(failure(lnBall(x, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(failure(log10Ball(x, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(failure(log2Ball(x, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(failure(logBall(x, exact(rational(8n)), CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(failure(logBall(exact(rational(2n)), x, CONTEXT)), {
      kind: "domain",
      argument: 1,
      reason: "notPositive",
    });
  }
  for (const x of [ball("0", "1"), ball("1", "1"), ball("-1", "2")]) {
    assert.deepEqual(failure(lnBall(x, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: ZERO,
    });
    assert.deepEqual(failure(log2Ball(x, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: ZERO,
    });
    assert.deepEqual(failure(logBall(exact(rational(2n)), x, CONTEXT)), {
      kind: "unresolved",
      argument: 1,
      edge: ZERO,
    });
  }
  assert.deepEqual(failure(lnBall(ball("1e-60", "1e-60"), CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: ZERO,
  });
  // A tiny positive ball computes, since the value is scaled to order one
  // before it is converted: 1e-60 ± 9e-61 is [1e-61, 1.9e-60], and its
  // logarithm is about -138 with a radius above one.
  const tiny = value(lnBall(ball("1e-60", "9e-61"), CONTEXT));
  assert.ok(
    compare(tiny.mid, rational(-140n)) > 0 &&
      compare(tiny.mid, rational(-136n)) < 0,
  );
  assert.ok(compare(radiusUpper(tiny.rad), ONE) > 0);
  // A positive ball that reaches within an ulp of zero at the working bits
  // is unresolved too: 1 + 1e-60 ± 1 is positive as rationals, and not at
  // 140 bits.
  assert.deepEqual(
    failure(
      lnBall(
        ball(
          "1.000000000000000000000000000000000000000000000000000000000001",
          "1",
        ),
        CONTEXT,
      ),
    ),
    { kind: "unresolved", argument: 0, edge: ZERO },
  );
});

test("a base of one is a domain error, and a base straddling one, or whose logarithm cannot be told from zero, is unresolved at one", () => {
  assert.deepEqual(failure(logBall(exact(ONE), exact(rational(8n)), CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "baseOne",
  });
  assert.deepEqual(
    failure(logBall(ball("1", "1e-10"), exact(rational(8n)), CONTEXT)),
    {
      kind: "unresolved",
      argument: 0,
      edge: ONE,
    },
  );
  assert.deepEqual(
    failure(logBall(ball("1.5", "0.5"), exact(rational(8n)), CONTEXT)),
    {
      kind: "unresolved",
      argument: 0,
      edge: ONE,
    },
  );
  // The base is checked before the argument, and one is checked after zero.
  assert.deepEqual(failure(logBall(exact(ONE), exact(ZERO), CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "baseOne",
  });
  assert.deepEqual(failure(logBall(ball("0.5", "0.5"), exact(ZERO), CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: ZERO,
  });
  // A base an ulp from one at the working bits: its logarithm is a ball
  // around zero, and the quotient depends on its sign.
  assert.deepEqual(
    failure(
      logBall(
        exact(dec("1.000000000000000000000000000000000000000000000000000001")),
        exact(rational(8n)),
        CONTEXT,
      ),
    ),
    {
      kind: "unresolved",
      argument: 0,
      edge: ONE,
    },
  );
  // And with more digits it resolves.
  const fine = value(
    logBall(
      exact(dec("1.000000000000000000000000000000000000000000000000000001")),
      exact(rational(8n)),
      { ...CONTEXT, precision: 80 },
    ),
  );
  assert.ok(compare(fine.mid, dec("2e54")) > 0);
});

test("an unbounded argument gives the function of its midpoint with an unbounded radius", () => {
  const three = { mid: rational(3n), rad: UNBOUNDED };
  for (const result of [
    lnBall(three, CONTEXT),
    log10Ball(three, CONTEXT),
    log2Ball(three, CONTEXT),
    logBall(three, exact(rational(7n)), CONTEXT),
    logBall(exact(rational(7n)), three, CONTEXT),
    logBall(three, three, CONTEXT),
  ]) {
    assert.deepEqual(value(result).rad, UNBOUNDED);
  }
  assert.ok(
    compare(
      absolute(
        subtract(
          value(lnBall(three, CONTEXT)).mid,
          dec("1.0986122886681096913952452369225257"),
        ),
      ),
      dec("1e-30"),
    ) < 0,
  );
  // The midpoint of an unbounded ball is still held to the domain.
  assert.deepEqual(failure(lnBall({ mid: ZERO, rad: UNBOUNDED }, CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "notPositive",
  });
});

test("through the pipeline: exp(ln(3)) and ln(exp(3)) certify thirty digits, the exact cases stay exact, and the errors are worded", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  for (const text of ["exp(ln(3))", "ln(exp(3))"]) {
    const result = evaluateText(table.value, text, {
      ...context,
      precision: 30,
    });
    assert.ok(result.ok, inspect(result));
    const shown = show(result.value.magnitude, 30, DEFAULT_ROUNDING);
    assert.equal(shown.kind, "certified", text);
    assert.equal(shown.text, text === "exp(ln(3))" ? "3" : "3", text);
  }
  const three = evaluateText(table.value, "log(2, 8) m", {
    ...context,
    precision: 8,
  });
  assert.ok(three.ok && isExact(three.value.magnitude));
  assert.deepEqual(three.value.magnitude.mid, rational(3n));
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "ln(0)",
      'Cannot compute "ln(0)": "0" is not positive, and a logarithm is defined only for positive values.',
    ],
    [
      "ln(-1)",
      'Cannot compute "ln(-1)": "-1" is not positive, and a logarithm is defined only for positive values.',
    ],
    [
      "log(1, 8)",
      'Cannot compute "log(1, 8)": the base "1" is one, and no logarithm has base one.',
    ],
    [
      "log(-2, 8)",
      'Cannot compute "log(-2, 8)": "-2" is not positive, and a logarithm is defined only for positive values.',
    ],
    [
      "ln(1 m)",
      'Cannot apply "ln" to "1 m": "1 m" has dimension m, but the argument of "ln" must be a plain number.',
    ],
    [
      "ln((2^(1/2))^2 - 2)",
      '"(2^(1/2))^2 - 2" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
    ],
    [
      "log(1 + ((2^(1/2))^2 - 2), 8)",
      '"1 + ((2^(1/2))^2 - 2)" cannot be told from 1 at this precision, and the result depends on which side of 1 it lies.',
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
});
