import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { isExact, type Ball } from "../ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
} from "../context.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { radiusUpper } from "../radius.ts";
import { LIMIT_BITS } from "../rational.ts";
import {
  absolute,
  compare,
  fromRational,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { dec } from "../../testing/scaled.ts";
import { pi } from "./pi.ts";

/** pi to 60 digits, from Python's decimal module (mpmath's digits agree). */
const PI = dec(
  "3.14159265358979323846264338327950288419716939937510582097494459",
);

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
      compare(distance(ball.mid, PI), radiusOf(ball)) <= 0,
      `${precision}: contains pi`,
    );
    assert.ok(
      compare(radiusOf(ball), dec(`1e-${precision + 8}`)) < 0,
      `${precision}: the radius is below the guard`,
    );
  }
});
