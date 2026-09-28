import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exact,
  powRationalBall,
  rootBall,
  subtractBalls,
  type Ball,
} from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
} from "./context.ts";
import { show, type Shown } from "./display.ts";
import { UNBOUNDED, radiusAbove } from "./radius.ts";
import { ROUNDING_MODES } from "./rounding.ts";
import {
  ZERO,
  format,
  parseDecimal,
  rational,
  type Rational,
} from "./rational.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok);
  return result.value;
}

/** A ball with the given midpoint and a radius at or above `rad`. */
function ball(mid: Rational | string, rad: string): Ball {
  return {
    mid: typeof mid === "string" ? dec(mid) : mid,
    rad: radiusAbove(dec(rad)),
  };
}

/** `rootBall` of an exact value, which is expected to succeed. */
function root(value: Rational, degree: bigint, precision: number): Ball {
  const result = rootBall(exact(value), degree, {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  });
  assert.ok(result.ok);
  return result.value;
}

const nearest = "halfAwayFromZero";

// ---------------------------------------------------------------------------
// Exact

test("an exact value whose digits all fit is shown exactly", () => {
  assert.deepEqual(show(exact(dec("2.54")), 8, nearest), {
    kind: "exact",
    text: "2.54",
  });
  assert.deepEqual(show(exact(rational(127n, 50n)), 8, nearest), {
    kind: "exact",
    text: "2.54",
  });
  assert.deepEqual(show(exact(rational(36n)), 8, nearest), {
    kind: "exact",
    text: "36",
  });
  assert.deepEqual(show(exact(ZERO), 8, nearest), { kind: "exact", text: "0" });
  // In every mode: a value with no more digits than shown is its own rounding.
  for (const mode of ROUNDING_MODES) {
    assert.deepEqual(show(exact(dec("-1.5e-7")), 8, mode), {
      kind: "exact",
      text: "-1.5e-7",
    });
  }
});

test("an exact value with more digits than shown is certified, not exact", () => {
  assert.deepEqual(show(exact(rational(1n, 3n)), 8, nearest), {
    kind: "certified",
    text: "0.33333333",
  });
  assert.deepEqual(show(exact(rational(5000n, 127n)), 8, nearest), {
    kind: "certified",
    text: "39.370079",
  });
  // The digits decide: 2.54 at two digits is not exact, and rounds in the mode.
  assert.deepEqual(show(exact(dec("2.54")), 2, nearest), {
    kind: "certified",
    text: "2.5",
  });
  assert.deepEqual(show(exact(dec("2.54")), 2, "ceiling"), {
    kind: "certified",
    text: "2.6",
  });
  assert.equal(show(exact(dec("2.54")), 3, "ceiling").kind, "exact");
});

// ---------------------------------------------------------------------------
// Certified and partial

test("an inexact value that certifies every digit asked is certified, never exact", () => {
  for (const digits of [1, 8, 40]) {
    const shown = show(root(rational(2n), 2n, 40), digits, nearest);
    assert.equal(shown.kind, "certified", `${digits} digits`);
  }
  assert.deepEqual(show(root(rational(2n), 2n, 40), 8, nearest), {
    kind: "certified",
    text: "1.4142136",
  });
  // The mode is applied to the digits shown.
  assert.deepEqual(show(root(rational(2n), 2n, 40), 8, "floor"), {
    kind: "certified",
    text: "1.4142135",
  });
  // A midpoint with few digits, or a whole number, is still only certified.
  assert.deepEqual(show(ball("1", "1e-30"), 8, nearest), {
    kind: "certified",
    text: "1",
  });
  assert.deepEqual(show(root(rational(4n), 2n, 40), 8, nearest), {
    kind: "exact",
    text: "2",
  });
});

test("an inexact value that certifies fewer digits than asked is partial, at those digits", () => {
  // A root at forty digits certifies about forty-nine: at 60 asked, fewer.
  const shown = show(root(rational(2n), 2n, 40), 60, nearest);
  assert.equal(shown.kind, "partial");
  assert.ok(shown.kind === "partial");
  assert.ok(
    shown.certified >= 47 && shown.certified < 60,
    `${shown.certified}`,
  );
  assert.equal(shown.text.length, shown.certified + 1);
  const reference = dec(
    "1.41421356237309504880168872420969807856967187537694807317667974",
  );
  assert.equal(shown.text, format(reference, shown.certified, nearest));
  // 1.2345 ± 1e-30 at four digits, to nearest: the fourth digit is a tie the
  // ball straddles, so three digits are certain and shown.
  assert.deepEqual(show(ball("1.2345", "1e-30"), 4, nearest), {
    kind: "partial",
    text: "1.23",
    certified: 3,
  });
  // The same ball under a directed mode certifies all four.
  assert.deepEqual(show(ball("1.2345", "1e-30"), 4, "floor"), {
    kind: "certified",
    text: "1.234",
  });
  assert.deepEqual(show(ball("1.2345", "1e-30"), 4, "ceiling"), {
    kind: "certified",
    text: "1.235",
  });
  // At five digits it is certified under the nearest modes, 1.2345 being a
  // cell's centre there, and partial under the directed ones, where it is
  // a cell's edge that the ball straddles.
  for (const mode of [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
  ] as const) {
    assert.equal(show(ball("1.2345", "1e-30"), 5, mode).kind, "certified");
  }
  assert.deepEqual(show(ball("1.2345", "1e-30"), 5, "floor"), {
    kind: "partial",
    text: "1.234",
    certified: 4,
  });
  // A value on a tie at the first digit asked certifies none; the text is
  // then the midpoint at the digits asked.
  assert.deepEqual(show(ball("1.5", "1e-30"), 1, nearest), {
    kind: "partial",
    text: "2",
    certified: 0,
  });
  // A wide ball certifies few, and the text is formatted at that many.
  assert.deepEqual(show(ball("1234.5678", "0.04"), 8, nearest), {
    kind: "partial",
    text: "1235",
    certified: 4,
  });
  assert.deepEqual(show(ball("1234.5678", "0.4"), 8, nearest), {
    kind: "partial",
    text: "1.23e+3",
    certified: 3,
  });
});

// ---------------------------------------------------------------------------
// Zero and unbounded

test("a ball containing zero without being zero is the zero kind, with a bound", () => {
  // The bound is the farthest the value may lie from zero, rounded up to
  // one digit; a radius is itself rounded up to thirty bits on the way in,
  // so a round number's bound is the next digit up.
  assert.deepEqual(show(ball(ZERO, "1e-30"), 8, nearest), {
    kind: "zero",
    text: "0",
    bound: "2e-30",
  });
  assert.deepEqual(show(ball("1e-31", "1.2e-30"), 8, nearest), {
    kind: "zero",
    text: "0",
    bound: "2e-30",
  });
  assert.deepEqual(show(ball("-0.001", "0.002"), 8, "floor"), {
    kind: "zero",
    text: "0",
    bound: "0.004",
  });
  // sqrt(2)^2 - 2 is such a ball.
  const two = root(rational(2n), 2n, 40);
  const squared = powRationalBall(two, rational(2n), {
    precision: 40,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  });
  assert.ok(squared.ok);
  const almostZero = subtractBalls(squared.value, exact(rational(2n)));
  const shown = show(almostZero, 8, nearest);
  assert.equal(shown.kind, "zero");
  assert.ok(
    shown.kind === "zero" && /e-(4|5)\d$/.test(shown.bound),
    shown.bound,
  );
  // Whereas sqrt(2)^2 itself is certified: ≈ 2.
  assert.deepEqual(show(squared.value, 8, nearest), {
    kind: "certified",
    text: "2",
  });
});

test("an unbounded radius shows the midpoint's digits, certifying none", () => {
  const unbounded: Ball = { mid: rational(2n), rad: UNBOUNDED };
  assert.deepEqual(show(unbounded, 8, nearest), {
    kind: "unbounded",
    text: "2",
  });
  assert.deepEqual(
    show({ mid: rational(1n, 3n), rad: UNBOUNDED }, 4, nearest),
    {
      kind: "unbounded",
      text: "0.3333",
    },
  );
  assert.deepEqual(show({ mid: ZERO, rad: UNBOUNDED }, 4, nearest), {
    kind: "unbounded",
    text: "0",
  });
});

test("the kinds are exclusive and cover every ball", () => {
  const kinds = new Set<Shown["kind"]>();
  const balls: Ball[] = [
    exact(rational(3n)),
    exact(rational(1n, 3n)),
    root(rational(2n), 2n, 40),
    ball("1.2345", "1e-30"),
    ball(ZERO, "1e-30"),
    { mid: rational(2n), rad: UNBOUNDED },
  ];
  for (const b of balls) kinds.add(show(b, 4, nearest).kind);
  assert.deepEqual([...kinds].sort(), [
    "certified",
    "exact",
    "partial",
    "unbounded",
    "zero",
  ]);
});
