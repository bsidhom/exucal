import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, rootBall, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import { BUILTINS } from "../builtins.ts";
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
import { UNBOUNDED, powerOfTenRadius } from "../radius.ts";
import { bitLength } from "../rational.ts";
import type { Result } from "../result.ts";
import { ROUNDING_MODES, type RoundingMode } from "../rounding.ts";
import { ZERO, decimalDigits, equals, type Scaled } from "../scaled.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import type { BuiltinError } from "../builtin.ts";
import {
  EXACT_FUNCTIONS,
  abs,
  binomial,
  binomialOf,
  ceil,
  div,
  doubleFactorialOf,
  doublefactorial,
  factorial,
  factorialOf,
  floor,
  gcd,
  lcm,
  log2Factorial,
  mod,
  round,
  signFn,
  truncFn,
} from "./exact.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function at(rounding: RoundingMode): NumberContext {
  return { ...CONTEXT, rounding };
}

function value<E>(result: Result<Ball, E>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

function error<E>(result: Result<Ball, E>): E {
  assert.ok(!result.ok, inspect(result));
  return result.error;
}

/** Asserts that `result` is the exact value `expected`. */
function assertExact<E>(result: Result<Ball, E>, expected: Scaled | string) {
  const b = value(result);
  const want = typeof expected === "string" ? dec(expected) : expected;
  assert.ok(isExact(b), `expected an exact result, got ${inspect(b)}`);
  assert.ok(
    equals(b.mid, want),
    `expected ${inspect(want)}, got ${inspect(b.mid)}`,
  );
}

/** Asserts that `result` is `unresolved` on `argument` at `edge`. */
function assertUnresolved(
  result: Result<Ball, BuiltinError>,
  argument: number,
  edge: Scaled | string,
) {
  const e = error(result);
  const want = typeof edge === "string" ? dec(edge) : edge;
  assert.equal(e.kind, "unresolved", inspect(e));
  assert.ok(e.kind === "unresolved");
  assert.equal(e.argument, argument);
  assert.ok(
    typeof e.edge !== "string" && equals(e.edge, want),
    `expected the edge ${inspect(want)}, got ${inspect(e.edge)}`,
  );
}

const sqrt2 = (() => {
  const root = rootBall(exact(fr(2n)), 2n, { ...CONTEXT, precision: 40 });
  assert.ok(root.ok);
  return root.value;
})();

// ---------------------------------------------------------------------------
// Names, arities and dimension rules

test("the thirteen are registered under their names, with their arities", () => {
  const names = EXACT_FUNCTIONS.map((fn) => fn.name);
  assert.deepEqual(names, [
    "abs",
    "sign",
    "floor",
    "ceil",
    "trunc",
    "round",
    "div",
    "mod",
    "gcd",
    "lcm",
    "factorial",
    "binomial",
    "doublefactorial",
  ]);
  for (const fn of EXACT_FUNCTIONS) assert.equal(BUILTINS.get(fn.name), fn);
  assert.deepEqual(round.arity, { min: 1, max: 2 });
  assert.deepEqual(div.arity, { min: 2, max: 2 });
  assert.deepEqual(factorial.arity, { min: 1, max: 1 });
});

test("the dimension rules: abs keeps the dimension, sign takes any, the rest take plain numbers or conforming pairs", () => {
  const primitives = new Map([
    ["m", "dimension" as const],
    ["s", "dimension" as const],
    ["radian", "kind" as const],
  ]);
  const metre = primitive("m");
  const second = primitive("s");
  assert.deepEqual(abs.dimensions([metre], primitives), {
    ok: true,
    value: metre,
  });
  assert.deepEqual(signFn.dimensions([metre], primitives), {
    ok: true,
    value: DIMENSIONLESS,
  });
  for (const fn of [floor, ceil, truncFn, round, factorial, doublefactorial]) {
    assert.ok(fn.dimensions([DIMENSIONLESS], primitives).ok, fn.name);
    const failed = fn.dimensions([metre], primitives);
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension", fn.name);
  }
  assert.ok(round.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
  assert.ok(!round.dimensions([DIMENSIONLESS, metre], primitives).ok);
  for (const fn of [gcd, lcm, binomial]) {
    assert.ok(fn.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
    assert.ok(!fn.dimensions([metre, DIMENSIONLESS], primitives).ok, fn.name);
  }
  assert.deepEqual(div.dimensions([metre, metre], primitives), {
    ok: true,
    value: DIMENSIONLESS,
  });
  assert.deepEqual(mod.dimensions([metre, metre], primitives), {
    ok: true,
    value: metre,
  });
  for (const fn of [div, mod]) {
    const failed = fn.dimensions([metre, second], primitives);
    assert.ok(
      !failed.ok && failed.error.kind === "nonconformingArguments",
      fn.name,
    );
  }
});

// ---------------------------------------------------------------------------
// Exact values

test("abs, sign, floor, ceil and trunc on exact values", () => {
  assertExact(abs.apply([exact(dec("-3"))], CONTEXT), "3");
  assertExact(abs.apply([exact(dec("2.5"))], CONTEXT), "2.5");
  assertExact(abs.apply([exact(dec("-1e999999999"))], CONTEXT), "1e999999999");
  assertExact(signFn.apply([exact(dec("-2.5"))], CONTEXT), "-1");
  assertExact(signFn.apply([exact(ZERO)], CONTEXT), "0");
  assertExact(signFn.apply([exact(dec("1e-999999999"))], CONTEXT), "1");
  const rows: readonly [string, string, string, string][] = [
    // value, floor, ceil, trunc
    ["3.7", "3", "4", "3"],
    ["-3.7", "-4", "-3", "-3"],
    ["3", "3", "3", "3"],
    ["-3", "-3", "-3", "-3"],
    ["0.2", "0", "1", "0"],
    ["-0.2", "-1", "0", "0"],
    ["0", "0", "0", "0"],
    ["1e999999999", "1e999999999", "1e999999999", "1e999999999"],
    ["1e-999999999", "0", "1", "0"],
    ["-1e-999999999", "-1", "0", "0"],
    ["123456789.5", "123456789", "123456790", "123456789"],
  ];
  for (const [x, f, c, t] of rows) {
    assertExact(floor.apply([exact(dec(x))], CONTEXT), f);
    assertExact(ceil.apply([exact(dec(x))], CONTEXT), c);
    assertExact(truncFn.apply([exact(dec(x))], CONTEXT), t);
  }
  assertExact(floor.apply([exact(fr(-7n, 2n))], CONTEXT), "-4");
  assertExact(ceil.apply([exact(fr(7n, 2n))], CONTEXT), "4");
  // An integer part that cannot be formed within Most bits is refused.
  const huge = { mant: { num: 1n, den: 3n }, exp: 30000n };
  assert.equal(error(floor.apply([exact(huge)], CONTEXT)).kind, "tooLarge");
});

test("round to an integer and to places, in the context's rounding mode", () => {
  const r = (
    x: string,
    places?: string,
    mode: RoundingMode = DEFAULT_ROUNDING,
  ) =>
    round.apply(
      places === undefined
        ? [exact(dec(x))]
        : [exact(dec(x)), exact(dec(places))],
      at(mode),
    );
  assertExact(r("2.5"), "3");
  assertExact(r("-2.5"), "-3");
  assertExact(r("2.5", undefined, "halfEven"), "2");
  assertExact(r("3.5", undefined, "halfEven"), "4");
  assertExact(r("2.5", undefined, "halfTowardZero"), "2");
  assertExact(r("2.4", undefined, "ceiling"), "3");
  assertExact(r("-2.4", undefined, "ceiling"), "-2");
  assertExact(r("2.4", undefined, "floor"), "2");
  assertExact(r("-2.4", undefined, "floor"), "-3");
  assertExact(r("2.9", undefined, "towardZero"), "2");
  assertExact(r("2.1", undefined, "awayFromZero"), "3");
  assertExact(r("3.14159", "2"), "3.14");
  assertExact(r("3.14159", "4"), "3.1416");
  assertExact(r("3.14159", "0"), "3");
  assertExact(r("1234", "-2"), "1200");
  assertExact(r("1250", "-2"), "1300");
  assertExact(r("1250", "-2", "halfEven"), "1200");
  assertExact(r("-1250", "-2"), "-1300");
  assertExact(r("0.125", "2"), "0.13");
  assertExact(r("0.125", "2", "halfEven"), "0.12");
  // A value already a multiple of the unit is itself, whatever its size.
  assertExact(r("1e999999999", "2"), "1e999999999");
  assertExact(r("3.14", "5"), "3.14");
  assertExact(r("0"), "0");
  // Below a tenth of the unit nothing is formed: zero, or a unit away from
  // zero in the directed modes that round away on that side.
  assertExact(r("1e-999999999", "2"), "0");
  assertExact(r("1e-999999999", "2", "ceiling"), "0.01");
  assertExact(r("-1e-999999999", "2", "ceiling"), "0");
  assertExact(r("-1e-999999999", "2", "floor"), "-0.01");
  assertExact(r("1e-999999999", "2", "awayFromZero"), "0.01");
  assertExact(r("1e-999999999", "2", "towardZero"), "0");
  assertExact(r("1e-400", "-5"), "0");
  // Negative places far out: a unit of 10^(10^18) is at the bound.
  assertExact(
    r("5", "-1000000000000000000", "ceiling"),
    "1e1000000000000000000",
  );
  // `places` must be an exact integer.
  assert.deepEqual(error(r("2.5", "0.5")), {
    kind: "domain",
    argument: 1,
    reason: "notInteger",
  });
  assert.deepEqual(
    error(
      round.apply([exact(dec("2.5")), ball(dec("2"), dec("1e-30"))], CONTEXT),
    ),
    { kind: "domain", argument: 1, reason: "notExact" },
  );
  // A count with more digits than Most bits holds is refused.
  const third = { mant: { num: 1n, den: 3n }, exp: 0n };
  assert.equal(
    error(round.apply([exact(third), exact(dec("30000"))], CONTEXT)).kind,
    "tooLarge",
  );
});

test("div and mod are floored division, concordant, on rationals and over signs", () => {
  const d = (a: string, b: string) =>
    div.apply([exact(dec(a)), exact(dec(b))], CONTEXT);
  const m = (a: string, b: string) =>
    mod.apply([exact(dec(a)), exact(dec(b))], CONTEXT);
  const rows: readonly [string, string, string, string][] = [
    // a, b, div, mod
    ["7", "2", "3", "1"],
    ["-7", "2", "-4", "1"],
    ["7", "-2", "-4", "-1"],
    ["-7", "-2", "3", "-1"],
    ["6", "3", "2", "0"],
    ["-6", "3", "-2", "0"],
    ["7.5", "2", "3", "1.5"],
    ["-7.5", "2", "-4", "0.5"],
    ["7.5", "-2", "-4", "-0.5"],
    ["0", "5", "0", "0"],
    ["1", "3", "0", "1"],
    ["-1", "3", "-1", "2"],
    ["0.3", "0.1", "3", "0"],
    ["1e400", "7", (10n ** 400n / 7n).toString(), "4"],
    ["1", "1e-400", "1e400", "0"],
    ["1e-400", "1e999999999", "0", "1e-400"],
    ["-1e-400", "1e30", "-1", `${"9".repeat(430)}e-400`],
  ];
  for (const [a, b, q, r] of rows) {
    assertExact(d(a, b), q);
    assertExact(m(a, b), r);
  }
  // The remainder is exact, and zero or of the divisor's sign.
  for (const a of ["7", "-7", "7.5", "-7.5", "0", "1e-20"]) {
    for (const b of ["2", "-2", "0.3", "-0.3", "1e-21"]) {
      const rem = value(m(a, b));
      assert.ok(isExact(rem), `${a} mod ${b}`);
      const side = rem.mid.mant.num === 0n ? 0 : rem.mid.mant.num < 0n ? -1 : 1;
      assert.ok(
        side === 0 || side === (b.startsWith("-") ? -1 : 1),
        `${a} mod ${b}`,
      );
    }
  }
  assert.equal(error(d("1", "0")).kind, "divisionByZero");
  assert.equal(error(m("1", "0")).kind, "divisionByZero");
  // A quotient past the top: div is overflow, mod is tooLarge.
  const top = `5e${(10n ** 18n).toString()}`;
  assert.equal(error(d(top, "1e-400")).kind, "overflow");
  assert.equal(error(m(top, "1e-400")).kind, "tooLarge");
});

test("gcd and lcm on integers are non-negative", () => {
  const g = (a: string, b: string) =>
    gcd.apply([exact(dec(a)), exact(dec(b))], CONTEXT);
  const l = (a: string, b: string) =>
    lcm.apply([exact(dec(a)), exact(dec(b))], CONTEXT);
  assertExact(g("6", "4"), "2");
  assertExact(g("-6", "4"), "2");
  assertExact(g("6", "-4"), "2");
  assertExact(g("-6", "-4"), "2");
  assertExact(g("0", "0"), "0");
  assertExact(g("0", "-5"), "5");
  assertExact(g("1e400", "1e300"), "1e300");
  assertExact(l("-6", "4"), "12");
  assertExact(l("6", "0"), "0");
  assertExact(l("0", "0"), "0");
  assertExact(l("4", "6"), "12");
  assertExact(l("7", "13"), "91");
  assert.deepEqual(error(g("2.5", "1")), {
    kind: "domain",
    argument: 0,
    reason: "notInteger",
  });
  assert.deepEqual(error(g("1", "2.5")), {
    kind: "domain",
    argument: 1,
    reason: "notInteger",
  });
  assert.deepEqual(
    error(gcd.apply([ball(dec("4"), dec("1e-30")), exact(dec("2"))], CONTEXT)),
    { kind: "domain", argument: 0, reason: "notExact" },
  );
  // An integer whose power of ten does not fit Most bits is refused.
  assert.equal(error(g("1e20000", "2")).kind, "tooLarge");
});

test("factorial, binomial and doublefactorial are exact, and refuse by their size", () => {
  const f = (n: string) => factorial.apply([exact(dec(n))], CONTEXT);
  const b = (n: string, k: string) =>
    binomial.apply([exact(dec(n)), exact(dec(k))], CONTEXT);
  const df = (n: string) => doublefactorial.apply([exact(dec(n))], CONTEXT);
  assertExact(f("0"), "1");
  assertExact(f("1"), "1");
  assertExact(f("5"), "120");
  assertExact(f("20"), "2432902008176640000");
  assertExact(f("25"), "15511210043330985984000000");
  assertExact(b("5", "2"), "10");
  assertExact(b("5", "0"), "1");
  assertExact(b("5", "5"), "1");
  assertExact(b("5", "7"), "0");
  assertExact(b("5", "-1"), "0");
  assertExact(b("0", "0"), "1");
  assertExact(b("50", "25"), "126410606437752");
  assertExact(b("100", "3"), "161700");
  assertExact(b("1e400", "2"), fr((10n ** 400n * (10n ** 400n - 1n)) / 2n));
  assertExact(df("-1"), "1");
  assertExact(df("0"), "1");
  assertExact(df("1"), "1");
  assertExact(df("7"), "105");
  assertExact(df("8"), "384");
  assertExact(df("9"), "945");
  assertExact(df("10"), "3840");
  for (const [fn, n, reason] of [
    [factorial, "-1", "negative"],
    [doublefactorial, "-2", "negative"],
    [factorial, "2.5", "notInteger"],
    [doublefactorial, "1.5", "notInteger"],
  ] as const) {
    assert.deepEqual(error(fn.apply([exact(dec(n))], CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason,
    });
  }
  assert.deepEqual(error(b("-1", "0")), {
    kind: "domain",
    argument: 0,
    reason: "negative",
  });
  assert.deepEqual(error(b("3", "1.5")), {
    kind: "domain",
    argument: 1,
    reason: "notInteger",
  });
  assert.deepEqual(error(f("2.5")), {
    kind: "domain",
    argument: 0,
    reason: "notInteger",
  });
  assert.deepEqual(
    error(factorial.apply([ball(dec("5"), dec("1e-30"))], CONTEXT)),
    { kind: "domain", argument: 0, reason: "notExact" },
  );
  // The size: 5000! has 16,326 digits and fits the default; 20000! does
  // not, and nor does any factorial of a huge argument.
  const large = value(f("5000"));
  assert.equal(
    decimalDigits(large.mid.mant.num) + Number(large.mid.exp),
    16326,
  );
  assert.equal(error(f("20000")).kind, "tooLarge");
  assert.equal(error(f("1e400")).kind, "tooLarge");
  assert.equal(error(f("1e20000")).kind, "tooLarge");
  assert.equal(error(df("40000")).kind, "tooLarge");
  // binomial(50000, 25000) has about 50,000 bits and fits the default;
  // binomial(100000, 50000) has about 100,000 and does not.
  assert.ok(b("50000", "25000").ok);
  assert.equal(error(b("100000", "50000")).kind, "tooLarge");
  assert.ok(b("50000", "2").ok);
  assert.equal(error(b("1e400", "1000000000")).kind, "tooLarge");
});

test("the size predictions are within a bit of the truth, and sharp at the limit", () => {
  let n = 1n;
  for (let i = 2; i <= 400; i++) {
    n *= BigInt(i);
    const predicted = log2Factorial(i);
    const actual = bitLength(n);
    assert.ok(
      Math.abs(predicted - actual) <= 1.5,
      `${i}!: predicted ${predicted}, actual ${actual} bits`,
    );
  }
  // A limit just at the true size admits the value, and one below refuses it.
  let f300 = 1n;
  for (let i = 2n; i <= 300n; i++) f300 *= i;
  const bits = bitLength(f300);
  assert.ok(factorialOf(300n, { ...CONTEXT, maxBits: bits }).ok);
  assert.ok(factorialOf(300n, { ...CONTEXT, maxBits: bits + 1 }).ok);
  assert.ok(!factorialOf(300n, { ...CONTEXT, maxBits: bits - 3 }).ok);
  assert.ok(binomialOf(300n, 150n, { ...CONTEXT, maxBits: 300 }).ok);
  assert.ok(!binomialOf(300n, 150n, { ...CONTEXT, maxBits: 290 }).ok);
  assert.ok(doubleFactorialOf(301n, { ...CONTEXT, maxBits: 1100 }).ok);
  assert.ok(!doubleFactorialOf(301n, { ...CONTEXT, maxBits: 1000 }).ok);
});

// ---------------------------------------------------------------------------
// Balls

test("abs and sign on balls", () => {
  const b = ball(dec("-2"), dec("0.5"));
  const absolute = value(abs.apply([b], CONTEXT));
  assert.ok(equals(absolute.mid, dec("2")) && !isExact(absolute));
  assertExact(signFn.apply([b], CONTEXT), "-1");
  assertExact(signFn.apply([ball(dec("1e-30"), dec("1e-31"))], CONTEXT), "1");
  assertUnresolved(
    signFn.apply([ball(dec("0.1"), dec("0.2"))], CONTEXT),
    0,
    ZERO,
  );
  assertUnresolved(signFn.apply([ball(ZERO, dec("1e-30"))], CONTEXT), 0, ZERO);
  // Touching zero counts as straddling it.
  assertUnresolved(
    signFn.apply([ball(dec("0.5"), dec("0.5"))], CONTEXT),
    0,
    ZERO,
  );
  // An unbounded radius: the sign of the midpoint, unbounded.
  const unbounded: Ball = { mid: dec("-3"), rad: UNBOUNDED };
  const s = value(signFn.apply([unbounded], CONTEXT));
  assert.ok(equals(s.mid, dec("-1")) && s.rad.kind === "unbounded");
  assert.equal(value(abs.apply([unbounded], CONTEXT)).rad.kind, "unbounded");
});

test("floor, ceil and trunc on balls: exact inside a cell, unresolved at a boundary", () => {
  assertExact(floor.apply([sqrt2], CONTEXT), "1");
  assertExact(ceil.apply([sqrt2], CONTEXT), "2");
  assertExact(truncFn.apply([sqrt2], CONTEXT), "1");
  const inside = ball(dec("3.5"), dec("0.4"));
  assertExact(floor.apply([inside], CONTEXT), "3");
  assertExact(ceil.apply([inside], CONTEXT), "4");
  assertExact(truncFn.apply([inside], CONTEXT), "3");
  const negativeInside = ball(dec("-3.5"), dec("0.4"));
  assertExact(floor.apply([negativeInside], CONTEXT), "-4");
  assertExact(ceil.apply([negativeInside], CONTEXT), "-3");
  assertExact(truncFn.apply([negativeInside], CONTEXT), "-3");
  // Across an integer: unresolved at it.
  const across = ball(dec("3"), dec("0.1"));
  assertUnresolved(floor.apply([across], CONTEXT), 0, "3");
  assertUnresolved(ceil.apply([across], CONTEXT), 0, "3");
  assertUnresolved(truncFn.apply([across], CONTEXT), 0, "3");
  // Touching an integer from above: floor is 3 throughout, but touching
  // counts as straddling, as the note rules.
  assertUnresolved(
    floor.apply([ball(dec("3.05"), dec("0.05"))], CONTEXT),
    0,
    "3",
  );
  // Around zero: trunc's cell is (-1, 1).
  const aroundZero = ball(dec("0.1"), dec("0.3"));
  assertExact(truncFn.apply([aroundZero], CONTEXT), "0");
  assertUnresolved(floor.apply([aroundZero], CONTEXT), 0, ZERO);
  assertUnresolved(ceil.apply([aroundZero], CONTEXT), 0, ZERO);
  // A wide ball: unresolved at the boundary of the midpoint's cell.
  assertUnresolved(floor.apply([ball(dec("10"), dec("5"))], CONTEXT), 0, "10");
  // A tiny radius on an integer midpoint cannot be told from the integer.
  assertUnresolved(
    floor.apply(
      [{ mid: dec("7"), rad: powerOfTenRadius(-999999999n) }],
      CONTEXT,
    ),
    0,
    "7",
  );
  // An unbounded radius: the floor of the midpoint, unbounded.
  const unbounded: Ball = { mid: dec("2.5"), rad: UNBOUNDED };
  const f = value(floor.apply([unbounded], CONTEXT));
  assert.ok(equals(f.mid, dec("2")) && f.rad.kind === "unbounded");
});

test("round on balls: exact inside the mode's cell, unresolved at its boundary", () => {
  const r = (
    b: Ball,
    mode: RoundingMode = DEFAULT_ROUNDING,
    places?: bigint,
  ) =>
    places === undefined
      ? round.apply([b], at(mode))
      : round.apply([b, exact(fr(places))], at(mode));
  assertExact(r(sqrt2), "1");
  assertExact(r(sqrt2, DEFAULT_ROUNDING, 3n), "1.414");
  assertExact(r(sqrt2, "ceiling", 3n), "1.415");
  // A tie inside the ball: unresolved at it, in every half-way mode.
  for (const mode of [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
  ] as const) {
    assertUnresolved(r(ball(dec("2.5"), dec("0.1")), mode), 0, "2.5");
    assertExact(r(ball(dec("2.3"), dec("0.1")), mode), "2");
    assertExact(r(ball(dec("2.7"), dec("0.1")), mode), "3");
  }
  // The directed modes' cells are the unit on the side they round from.
  assertExact(r(ball(dec("2.5"), dec("0.4")), "ceiling"), "3");
  assertUnresolved(r(ball(dec("3"), dec("0.1")), "ceiling"), 0, "3");
  assertExact(r(ball(dec("2.5"), dec("0.4")), "floor"), "2");
  assertUnresolved(r(ball(dec("3"), dec("0.1")), "floor"), 0, "3");
  assertExact(r(ball(dec("-2.5"), dec("0.4")), "towardZero"), "-2");
  assertExact(r(ball(dec("0.1"), dec("0.5")), "towardZero"), "0");
  assertUnresolved(r(ball(dec("0.1"), dec("0.5")), "awayFromZero"), 0, ZERO);
  assertExact(r(ball(dec("2.5"), dec("0.4")), "awayFromZero"), "3");
  // Places: the cell scales with the unit.
  assertExact(
    r(ball(dec("3.14159"), dec("0.0001")), DEFAULT_ROUNDING, 2n),
    "3.14",
  );
  assertUnresolved(
    r(ball(dec("3.145"), dec("0.001")), DEFAULT_ROUNDING, 2n),
    0,
    "3.145",
  );
  assertExact(r(ball(dec("1234"), dec("10")), DEFAULT_ROUNDING, -2n), "1200");
  assertUnresolved(
    r(ball(dec("1250"), dec("20")), DEFAULT_ROUNDING, -2n),
    0,
    "1250",
  );
});

test("div and mod on balls", () => {
  const a = ball(dec("7.5"), dec("0.1"));
  const b = exact(dec("2"));
  assertExact(div.apply([a, b], CONTEXT), "3");
  const remainder = value(mod.apply([a, b], CONTEXT));
  assert.ok(!isExact(remainder) && equals(remainder.mid, dec("1.5")));
  // The quotient straddles an integer: unresolved on `a` at that multiple of `b`.
  const straddling = ball(dec("8"), dec("0.1"));
  assertUnresolved(div.apply([straddling, b], CONTEXT), 0, "8");
  assertUnresolved(mod.apply([straddling, b], CONTEXT), 0, "8");
  assertUnresolved(
    div.apply([ball(dec("9"), dec("0.5")), exact(dec("3"))], CONTEXT),
    0,
    "9",
  );
  // A divisor straddling zero.
  assertUnresolved(
    div.apply([b, ball(dec("0.1"), dec("0.2"))], CONTEXT),
    1,
    ZERO,
  );
  // A tiny quotient floors to zero or minus one, within the bound and,
  // where the division refuses it as underflow, past it all the same.
  const tiny = exact(dec("1e-400"));
  const huge = exact(dec("1e999999999"));
  const top = exact(dec(`5e${(10n ** 18n).toString()}`));
  for (const b of [huge, top]) {
    assertExact(div.apply([tiny, b], CONTEXT), "0");
    assertExact(div.apply([exact(dec("-1e-400")), b], CONTEXT), "-1");
    assertExact(mod.apply([tiny, b], CONTEXT), "1e-400");
    assertUnresolved(
      div.apply([ball(ZERO, dec("1e-400")), b], CONTEXT),
      0,
      ZERO,
    );
  }
  assertExact(div.apply([exact(ZERO), top], CONTEXT), "0");
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
function run(source: string, context: NumberContext = CONTEXT): string {
  const result = evaluateText(table, source, context);
  if (!result.ok)
    return describeTextError(result.error, source, table.primitives);
  const shown = show(result.value.magnitude, 8, context.rounding);
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}`;
}

test("the exact functions through the pipeline, with their messages", () => {
  assert.equal(run("floor(3.7)"), "= 3");
  assert.equal(run("floor(sqrt(2))"), "= 1");
  assert.equal(run("round(2.5)"), "= 3");
  assert.equal(run("round(2.5)", at("halfEven")), "= 2");
  assert.equal(run("round(3.14159, 2)"), "= 3.14");
  assert.equal(run("round(1234, -2)"), "= 1200");
  assert.equal(run("mod(-7, 2)"), "= 1");
  assert.equal(run("mod(7, -2)"), "= -1");
  assert.equal(run("div(-7, 2)"), "= -4");
  assert.equal(run("div(7 ft, 2 ft)"), "= 3");
  assert.equal(run("gcd(-6, 4)"), "= 2");
  assert.equal(run("factorial(5)"), "= 120");
  assert.equal(run("binomial(5, 7)"), "= 0");
  assert.equal(run("doublefactorial(-1)"), "= 1");
  assert.equal(run("abs(-3 m) / m"), "= 3");
  assert.equal(run("sign(-2.5 m)"), "= -1");
  // The messages.
  assert.equal(
    run("floor(3.7 ft)"),
    'Cannot apply "floor" to "3.7 ft": "3.7 ft" has dimension m, but the argument of "floor" must be a plain number.',
  );
  assert.equal(
    run("gcd(2.5, 1)"),
    'Cannot compute "gcd(2.5, 1)": "2.5" is not a whole number, and "gcd" is defined only for whole numbers.',
  );
  assert.equal(
    run("factorial(approx(5))"),
    'Cannot compute "factorial(approx(5))": "approx(5)" is not known exactly, and "factorial" needs a whole number known exactly.',
  );
  assert.equal(
    run("factorial(-1)"),
    'Cannot compute "factorial(-1)": "-1" is negative, and "factorial" is defined only from 0 up.',
  );
  assert.equal(
    run("doublefactorial(-2)"),
    'Cannot compute "doublefactorial(-2)": "-2" is below -1, and "doublefactorial" is defined only from -1 up.',
  );
  assert.equal(
    run("factorial(20000)"),
    '"factorial(20000)" is too large to compute within Most bits.',
  );
  assert.equal(
    run("floor(sqrt(2)^2)"),
    '"sqrt(2)^2" cannot be told from 2 at this precision, and the result depends on which side of 2 it lies.',
  );
  assert.equal(
    run("round(2.5 + sqrt(2) - sqrt(2))"),
    '"2.5 + sqrt(2) - sqrt(2)" cannot be told from 2.5 at this precision, and the result depends on which side of 2.5 it lies.',
  );
  assert.equal(
    run("mod(7 ft, 2 s)"),
    'Cannot apply "mod" to "7 ft" and "2 s": "7 ft" has dimension m, but "2 s" has dimension s.',
  );
  assert.equal(run("mod(1, 0)"), 'Division by zero in "mod(1, 0)".');
  // The identity, through the arithmetic.
  for (const [a, b] of [
    ["7", "2"],
    ["-7", "2"],
    ["7", "-2"],
    ["-7.5", "2"],
    ["1/3", "-0.25"],
  ]) {
    assert.equal(
      run(`(${b}) * div(${a}, ${b}) + mod(${a}, ${b}) - (${a})`),
      "= 0",
    );
  }
});

test("the exact functions take every rounding mode in stride, and decimal mode", () => {
  for (const mode of ROUNDING_MODES) {
    assert.equal(run("floor(-3.7)", at(mode)), "= -4");
    assert.equal(run("mod(-7, 2)", at(mode)), "= 1");
  }
  const decimal: NumberContext = { ...CONTEXT, mode: "decimal" };
  assert.equal(run("factorial(20)", decimal), "≈ 2.432902e+18");
  assert.equal(run("floor(3.7)", decimal), "= 3");
  assert.equal(run("round(2.5)", { ...decimal, rounding: "halfEven" }), "= 2");
});
