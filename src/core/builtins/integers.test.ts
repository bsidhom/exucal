import assert from "node:assert/strict";
import { test } from "node:test";
import { exact } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { bitLength } from "../rational.ts";
import { decimalDigits } from "../scaled.ts";
import { assertExact, error, value } from "../../testing/builtins.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import {
  binomial,
  binomialOf,
  doubleFactorialOf,
  doublefactorial,
  factorial,
  factorialOf,
  gcd,
  lcm,
  log2Factorial,
} from "./integers.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

test("the integer functions take plain numbers", () => {
  assert.deepEqual(factorial.arity, { min: 1, max: 1 });
  assert.deepEqual(binomial.arity, { min: 2, max: 2 });
  const primitives = new Map([["m", "dimension" as const]]);
  const metre = primitive("m");
  for (const fn of [factorial, doublefactorial]) {
    assert.ok(fn.dimensions([DIMENSIONLESS], primitives).ok, fn.name);
    assert.ok(!fn.dimensions([metre], primitives).ok, fn.name);
  }
  for (const fn of [gcd, lcm, binomial]) {
    assert.ok(fn.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
    assert.ok(!fn.dimensions([metre, DIMENSIONLESS], primitives).ok, fn.name);
  }
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
  // A zero on either side: the other's magnitude, in full (devdocs/builtins.md,
  // "The exact functions"), on whichever side the zero is.
  assertExact(g("5", "0"), "5");
  assertExact(g("0", "5"), "5");
  assertExact(g("-10", "0"), "10");
  assertExact(g("7", "0"), "7");
  assertExact(g("12", "0"), "12");
  assertExact(g("2", "0"), "2");
  assertExact(g("1", "0"), "1");
  assertExact(g("1000000007", "0"), "1000000007");
  assertExact(g("1e400", "0"), "1e400");
  assertExact(l("-6", "4"), "12");
  assertExact(l("5", "0"), "0");
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
  // An integer whose power of ten does not fit the significand limit is refused.
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
    decimalDigits(large.mid.significand.num) + Number(large.mid.exp),
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
  assert.ok(factorialOf(300n, { ...CONTEXT, significandLimitBits: bits }).ok);
  assert.ok(
    factorialOf(300n, { ...CONTEXT, significandLimitBits: bits + 1 }).ok,
  );
  assert.ok(
    !factorialOf(300n, { ...CONTEXT, significandLimitBits: bits - 3 }).ok,
  );
  assert.ok(
    binomialOf(300n, 150n, { ...CONTEXT, significandLimitBits: 300 }).ok,
  );
  assert.ok(
    !binomialOf(300n, 150n, { ...CONTEXT, significandLimitBits: 290 }).ok,
  );
  assert.ok(
    doubleFactorialOf(301n, { ...CONTEXT, significandLimitBits: 1100 }).ok,
  );
  assert.ok(
    !doubleFactorialOf(301n, { ...CONTEXT, significandLimitBits: 1000 }).ok,
  );
});
