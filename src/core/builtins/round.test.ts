import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, rootBall, type Ball } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { UNBOUNDED, powerOfTenRadius } from "../radius.ts";
import type { RoundingMode } from "../rounding.ts";
import { ZERO, equals } from "../scaled.ts";
import {
  assertExact,
  assertUnresolved,
  error,
  value,
} from "../../testing/builtins.ts";
import { ball, dec, fr } from "../../testing/scaled.ts";
import { ceil, floor, round, truncFn } from "./round.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

function at(rounding: RoundingMode): NumberContext {
  return { ...CONTEXT, rounding };
}

const sqrt2 = (() => {
  const root = rootBall(exact(fr(2n)), 2n, { ...CONTEXT, precision: 40 });
  assert.ok(root.ok);
  return root.value;
})();

test("the rounding functions take a plain number, and round one or two", () => {
  assert.deepEqual(round.arity, { min: 1, max: 2 });
  assert.deepEqual(floor.arity, { min: 1, max: 1 });
  const primitives = new Map([["m", "dimension" as const]]);
  const metre = primitive("m");
  for (const fn of [floor, ceil, truncFn, round]) {
    assert.ok(fn.dimensions([DIMENSIONLESS], primitives).ok, fn.name);
    const failed = fn.dimensions([metre], primitives);
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension", fn.name);
  }
  assert.ok(round.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
  assert.ok(!round.dimensions([DIMENSIONLESS, metre], primitives).ok);
});

test("floor, ceil and trunc on exact values", () => {
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
