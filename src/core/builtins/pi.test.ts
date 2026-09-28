import assert from "node:assert/strict";
import { test } from "node:test";
import { isExact } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
} from "../context.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { radiusUpper } from "../radius.ts";
import { absolute, compare, rational } from "../rational.ts";
import { parseFraction } from "../../testing/fraction.ts";
import { pi } from "./pi.ts";

/** pi to 60 digits, from Python's decimal module (mpmath's digits agree). */
const PI = (() => {
  const result = parseFraction(
    "3.14159265358979323846264338327950288419716939937510582097494459",
  );
  assert.ok(result.ok);
  return result.value;
})();

test("pi takes no arguments and gives a plain number", () => {
  assert.equal(pi.name, "pi");
  assert.deepEqual(pi.arity, { min: 0, max: 0 });
  assert.deepEqual(pi.dimensions([], new Map()), {
    ok: true,
    value: DIMENSIONLESS,
  });
});

test("pi() is the kernel's ball of pi at the context's precision, never exact", () => {
  for (const precision of [1, 8, 40, 50]) {
    const result = pi.apply([], {
      precision,
      rounding: DEFAULT_ROUNDING,
      maxBits: DEFAULT_MAX_BITS,
      ceiling: DEFAULT_CEILING,
    });
    assert.ok(result.ok);
    const ball = result.value;
    assert.ok(!isExact(ball), `${precision}`);
    assert.ok(
      compare(
        absolute(subtractRational(ball.mid, PI)),
        radiusUpper(ball.rad),
      ) <= 0,
      `${precision}: contains pi`,
    );
    assert.ok(
      compare(
        radiusUpper(ball.rad),
        rational(1n, 10n ** BigInt(precision + 8)),
      ) < 0,
      `${precision}: the radius is below the guard`,
    );
  }
});

function subtractRational(
  a: { num: bigint; den: bigint },
  b: { num: bigint; den: bigint },
) {
  return rational(a.num * b.den - b.num * a.den, a.den * b.den);
}
