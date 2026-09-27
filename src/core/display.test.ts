import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, powRationalBall, rootBall, type Ball } from "./ball.ts";
import { DEFAULT_ROUNDING } from "./context.ts";
import { show } from "./display.ts";
import { UNBOUNDED, radiusAbove } from "./radius.ts";
import { ROUNDING_MODES } from "./rounding.ts";
import { ZERO, parseDecimal, rational, type Rational } from "./rational.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok);
  return result.value;
}

/** `rootBall` of an exact value, which is expected to succeed. */
function root(value: Rational, degree: bigint, precision: number): Ball {
  const result = rootBall(exact(value), degree, {
    precision,
    rounding: DEFAULT_ROUNDING,
  });
  assert.ok(result.ok);
  return result.value;
}

test("an exact value whose digits all fit is shown exactly", () => {
  assert.deepEqual(show(exact(dec("2.54")), 8, "halfAwayFromZero"), {
    text: "2.54",
    exact: true,
  });
  assert.deepEqual(show(exact(rational(127n, 50n)), 8, "halfAwayFromZero"), {
    text: "2.54",
    exact: true,
  });
  assert.deepEqual(show(exact(rational(36n)), 8, "halfAwayFromZero"), {
    text: "36",
    exact: true,
  });
  assert.deepEqual(show(exact(ZERO), 8, "halfAwayFromZero"), {
    text: "0",
    exact: true,
  });
  // In every mode: a value with no more digits than shown is its own rounding.
  for (const mode of ROUNDING_MODES) {
    assert.ok(show(exact(dec("-1.5e-7")), 8, mode).exact, mode);
    assert.equal(show(exact(dec("-1.5e-7")), 8, mode).text, "-1.5e-7");
  }
});

test("an exact value with more digits than shown is not shown exactly", () => {
  assert.deepEqual(show(exact(rational(1n, 3n)), 8, "halfAwayFromZero"), {
    text: "0.33333333",
    exact: false,
  });
  assert.deepEqual(show(exact(rational(5000n, 127n)), 8, "halfAwayFromZero"), {
    text: "39.370079",
    exact: false,
  });
  // The digits decide: 2.54 at two digits is not exact, and rounds in the mode.
  assert.deepEqual(show(exact(dec("2.54")), 2, "halfAwayFromZero"), {
    text: "2.5",
    exact: false,
  });
  assert.deepEqual(show(exact(dec("2.54")), 2, "ceiling"), {
    text: "2.6",
    exact: false,
  });
  assert.ok(show(exact(dec("2.54")), 3, "ceiling").exact);
});

test("an inexact value is never shown exactly, however many digits", () => {
  for (const digits of [1, 8, 40, 100]) {
    const shown = show(root(rational(2n), 2n, 40), digits, "halfAwayFromZero");
    assert.ok(!shown.exact, `${digits} digits`);
  }
  assert.equal(
    show(root(rational(2n), 2n, 40), 8, "halfAwayFromZero").text,
    "1.4142136",
  );
  // Even when the midpoint has few digits, or is a whole number, or zero.
  const one: Ball = { mid: rational(1n), rad: radiusAbove(dec("1e-30")) };
  assert.deepEqual(show(one, 8, "halfAwayFromZero"), {
    text: "1",
    exact: false,
  });
  const zero: Ball = { mid: ZERO, rad: radiusAbove(dec("1e-30")) };
  assert.deepEqual(show(zero, 8, "halfAwayFromZero"), {
    text: "0",
    exact: false,
  });
  const unbounded: Ball = { mid: rational(2n), rad: UNBOUNDED };
  assert.deepEqual(show(unbounded, 8, "halfAwayFromZero"), {
    text: "2",
    exact: false,
  });
});

test("a root's exact case is shown exactly, and an inexact root is not", () => {
  // sqrt(4) is exactly 2: the exact case was detected and nothing was rounded.
  assert.deepEqual(show(root(rational(4n), 2n, 40), 8, "halfAwayFromZero"), {
    text: "2",
    exact: true,
  });
  assert.deepEqual(
    show(root(rational(9n, 4n), 2n, 40), 8, "halfAwayFromZero"),
    {
      text: "1.5",
      exact: true,
    },
  );
  // sqrt(2)^2 has a midpoint a hair below 2 and a radius: ≈ 2.
  const squared = powRationalBall(root(rational(2n), 2n, 40), rational(2n), {
    precision: 40,
    rounding: DEFAULT_ROUNDING,
  });
  assert.ok(squared.ok);
  assert.deepEqual(show(squared.value, 8, "halfAwayFromZero"), {
    text: "2",
    exact: false,
  });
});
