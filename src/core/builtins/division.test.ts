import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, isExact } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { ZERO, equals } from "../scaled.ts";
import {
  assertExact,
  assertUnresolved,
  error,
  value,
} from "../../testing/builtins.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { div, mod } from "./division.ts";

const CONTEXT: NumberContext = {
  precision: 8,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

test("div and mod take two quantities of one dimension; div is a count, mod keeps the dimension", () => {
  assert.deepEqual(div.arity, { min: 2, max: 2 });
  assert.deepEqual(mod.arity, { min: 2, max: 2 });
  const primitives = new Map([
    ["m", "dimension" as const],
    ["s", "dimension" as const],
  ]);
  const metre = primitive("m");
  const second = primitive("s");
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
      const side =
        rem.mid.significand.num === 0n
          ? 0
          : rem.mid.significand.num < 0n
            ? -1
            : 1;
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
