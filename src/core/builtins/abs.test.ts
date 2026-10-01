import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, isExact, type Ball } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { UNBOUNDED } from "../radius.ts";
import { ZERO, equals } from "../scaled.ts";
import {
  assertExact,
  assertUnresolved,
  value,
} from "../../testing/builtins.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { abs, signFn } from "./abs.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

test("abs keeps the dimension and sign takes any quantity", () => {
  assert.deepEqual(abs.arity, { min: 1, max: 1 });
  assert.deepEqual(signFn.arity, { min: 1, max: 1 });
  const primitives = new Map([
    ["m", "dimension" as const],
    ["radian", "kind" as const],
  ]);
  const metre = primitive("m");
  assert.deepEqual(abs.dimensions([metre], primitives), {
    ok: true,
    value: metre,
  });
  assert.deepEqual(abs.dimensions([DIMENSIONLESS], primitives), {
    ok: true,
    value: DIMENSIONLESS,
  });
  assert.deepEqual(signFn.dimensions([metre], primitives), {
    ok: true,
    value: DIMENSIONLESS,
  });
});

test("abs and sign on exact values", () => {
  assertExact(abs.apply([exact(dec("-3"))], CONTEXT), "3");
  assertExact(abs.apply([exact(dec("2.5"))], CONTEXT), "2.5");
  assertExact(abs.apply([exact(dec("-1e999999999"))], CONTEXT), "1e999999999");
  assertExact(signFn.apply([exact(dec("-2.5"))], CONTEXT), "-1");
  assertExact(signFn.apply([exact(ZERO)], CONTEXT), "0");
  assertExact(signFn.apply([exact(dec("1e-999999999"))], CONTEXT), "1");
});

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
