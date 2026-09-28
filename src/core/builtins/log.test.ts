import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import type { BuiltinError } from "../builtin.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { show } from "../display.ts";
import { ln2Fixed } from "../fixed-log.ts";
import { bitsFor, fixedToBall } from "../fixed.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED, radiusUpper } from "../radius.ts";
import { LIMIT_BITS } from "../rational.ts";
import type { Result } from "../result.ts";
import {
  ONE,
  ZERO,
  absolute,
  compare,
  fromRational,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball as ballOf, dec, fr } from "../../testing/scaled.ts";
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

/** The default context: eight digits, the default range limit. */
const DEFAULT: NumberContext = { ...CONTEXT, precision: 8 };

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

/** Asserts that `ball` contains `reference` and its radius is below `10^-digits`. */
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
  assert.ok(
    compare(radiusOf(ball), dec(`1e-${digits}`)) < 0,
    `${label}: radius`,
  );
}

/** A ball of `mid` with the radius `rad`, as decimals. */
function ball(mid: string, rad: string): Ball {
  return ballOf(dec(mid), dec(rad));
}

/** A decimal, or a fraction written `n/d`, as a `Scaled`. */
function parse(text: string): Scaled {
  const [n, d] = text.split("/");
  return d === undefined ? dec(n!) : fr(BigInt(n!), BigInt(d));
}

// References from Python's decimal module at a precision of 60 for the
// logarithms of `1e999999999`: `ln`, and `ln` over `ln 2`.
const LN_HUGE = dec(
  "2302585090.69146059102394577066637275291673728102767148740455",
);
const LOG2_HUGE = dec(
  "3321928091.56543425298295708161907074637544121715974921903017",
);

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
    ["1e999999999", "999999999"],
    ["1e-999999999", "-999999999"],
  ]) {
    assert.deepEqual(
      value(log10Ball(exact(dec(x!)), CONTEXT)),
      exact(dec(expected!)),
      `log10(${x})`,
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
    ["100", "1e999999998", "499999999"],
  ]) {
    assert.deepEqual(
      value(logBall(exact(parse(b!)), exact(parse(x!)), CONTEXT)),
      exact(parse(expected!)),
      `log(${b}, ${x})`,
    );
  }
  // A rational exponent is not looked for, and a non-power is inexact.
  const fourEight = value(logBall(exact(fr(4n)), exact(fr(8n)), CONTEXT));
  assert.ok(!isExact(fourEight));
  assertNear(fourEight, dec("1.5"), 45, "log(4, 8)");
  assert.ok(!isExact(value(log10Ball(exact(fr(20n)), CONTEXT))));
  assert.ok(!isExact(value(log2Ball(exact(fr(6n)), CONTEXT))));
  // The integer power is read off the canonical forms, whatever the exponent.
  assert.equal(integerPower(fr(10n), ONE), 0n);
  assert.equal(integerPower(fr(10n), fr(100n)), 2n);
  assert.equal(integerPower(fr(10n), fr(1n, 100n)), -2n);
  assert.equal(integerPower(fr(10n), fr(20n)), undefined);
  assert.equal(integerPower(fr(2n, 3n), fr(9n, 4n)), -2n);
  assert.equal(integerPower(fr(2n, 3n), fr(4n, 3n)), undefined);
  assert.equal(integerPower(dec("10"), dec("1e999999999")), 999999999n);
  assert.equal(integerPower(dec("10"), dec("1e-999999999")), -999999999n);
  assert.equal(integerPower(dec("100"), dec("1000")), undefined);
  assert.equal(integerPower(fr(2n), fr(1n, 8n)), -3n);
  assert.equal(integerPower(dec("0.1"), dec("1000")), -3n);
  assert.equal(integerPower(fr(20n), fr(8000n)), 3n);
});

test("ln(2) and ln(10) are their memos, and other values are the kernel's, within the radius", () => {
  const two = value(lnBall(exact(fr(2n)), CONTEXT));
  assert.deepEqual(
    two,
    fixedToBall(
      ln2Fixed(bitsFor(40), bitsFor(DEFAULT_CEILING)),
      workingDigits(CONTEXT),
    ),
  );
  // References from Python's decimal module.
  assertNear(
    value(lnBall(exact(fr(10n)), CONTEXT)),
    dec(
      "2.302585092994045684017991454684364207601101488628772976033327900967572609677",
    ),
    45,
    "ln(10)",
  );
  assertNear(
    value(lnBall(exact(fr(3n)), CONTEXT)),
    dec(
      "1.098612288668109691395245236922525704647490557822749451734694333637494293218",
    ),
    45,
    "ln(3)",
  );
  assertNear(
    value(log10Ball(exact(fr(2n)), CONTEXT)),
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
    value(log2Ball(exact(fr(10n)), CONTEXT)),
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
    value(logBall(exact(fr(3n)), exact(fr(7n)), CONTEXT)),
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

test("the logarithm takes any exponent: ln and log2 of 1e999999999 certify, and log10 of it is exact", () => {
  const huge = exact(dec("1e999999999"));
  const natural = value(lnBall(huge, DEFAULT));
  assert.ok(!isExact(natural));
  assert.ok(compare(distance(natural.mid, LN_HUGE), dec("1e-7")) < 0);
  assert.ok(certifies(natural, 8, "halfEven"));
  assert.deepEqual(value(log10Ball(huge, DEFAULT)), exact(dec("999999999")));
  const binary = value(log2Ball(huge, DEFAULT));
  assert.ok(!isExact(binary));
  assert.ok(compare(distance(binary.mid, LOG2_HUGE), dec("1e-7")) < 0);
  assert.ok(certifies(binary, 8, "halfEven"));
  // The reciprocal, and a base with a large exponent.
  const tiny = value(lnBall(exact(dec("1e-999999999")), DEFAULT));
  assert.ok(
    compare(
      distance(tiny.mid, dec("-2302585090.6914605910239457706663727529167")),
      dec("1e-7"),
    ) < 0,
  );
  assert.ok(certifies(tiny, 8, "halfEven"));
  const base = value(logBall(huge, exact(fr(10n)), DEFAULT));
  assert.ok(
    compare(distance(base.mid, dec("1.000000001000000001e-9")), dec("1e-25")) <
      0,
  );
  assert.ok(certifies(base, 8, "halfEven"));
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
  assert.ok(compare(radiusOf(result), dec("3.3e-21")) > 0);
  assert.ok(compare(radiusOf(result), dec("3.5e-21")) < 0);
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
    exact(fr(-1n)),
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
    assert.deepEqual(failure(logBall(x, exact(fr(8n)), CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "notPositive",
    });
    assert.deepEqual(failure(logBall(exact(fr(2n)), x, CONTEXT)), {
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
    assert.deepEqual(failure(logBall(exact(fr(2n)), x, CONTEXT)), {
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
    compare(tiny.mid, fr(-140n)) > 0 && compare(tiny.mid, fr(-136n)) < 0,
  );
  assert.ok(compare(radiusOf(tiny), ONE) > 0);
  // A positive ball that reaches within an ulp of zero at the working bits
  // is unresolved too: 1 + 1e-60 ± 1 is positive as numbers, and not at
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
  assert.deepEqual(failure(logBall(exact(ONE), exact(fr(8n)), CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "baseOne",
  });
  assert.deepEqual(
    failure(logBall(ball("1", "1e-10"), exact(fr(8n)), CONTEXT)),
    {
      kind: "unresolved",
      argument: 0,
      edge: ONE,
    },
  );
  assert.deepEqual(
    failure(logBall(ball("1.5", "0.5"), exact(fr(8n)), CONTEXT)),
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
        exact(fr(8n)),
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
      exact(fr(8n)),
      { ...CONTEXT, precision: 80 },
    ),
  );
  assert.ok(compare(fine.mid, dec("2e54")) > 0);
});

test("an unbounded argument gives the function of its midpoint with an unbounded radius", () => {
  const three = { mid: fr(3n), rad: UNBOUNDED };
  for (const result of [
    lnBall(three, CONTEXT),
    log10Ball(three, CONTEXT),
    log2Ball(three, CONTEXT),
    logBall(three, exact(fr(7n)), CONTEXT),
    logBall(exact(fr(7n)), three, CONTEXT),
    logBall(three, three, CONTEXT),
  ]) {
    assert.deepEqual(value(result).rad, UNBOUNDED);
  }
  assert.ok(
    compare(
      distance(
        value(lnBall(three, CONTEXT)).mid,
        dec("1.0986122886681096913952452369225257"),
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
  assert.deepEqual(three.value.magnitude.mid, fr(3n));
  const huge = evaluateText(table.value, "log10(1e999999999) m", {
    ...context,
    precision: 8,
  });
  assert.ok(huge.ok && isExact(huge.value.magnitude));
  assert.deepEqual(huge.value.magnitude.mid, fr(999999999n));
  const natural = evaluateText(table.value, "ln(1e999999999)", {
    ...context,
    precision: 8,
  });
  assert.ok(natural.ok, inspect(natural));
  assert.deepEqual(show(natural.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "2.3025851e+9",
  });
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
