import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
  exact,
  isExact,
  powRationalBall,
  rootBall,
  subtractBalls,
  type Ball,
} from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./context.ts";
import { show, type Shown } from "./display.ts";
import { UNBOUNDED, powerOfTenRadius, powerOfTwoRadius } from "./radius.ts";
import { rational } from "./rational.ts";
import { ROUNDING_MODES } from "./rounding.ts";
import { ZERO, compare, format, type Scaled } from "./scaled.ts";
import { ball, dec, fr } from "../testing/scaled.ts";

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };
}

/** A ball with the midpoint `mid` and a radius at or above `rad`, both decimals. */
function about(mid: Scaled | string, rad: string): Ball {
  return ball(typeof mid === "string" ? dec(mid) : mid, dec(rad));
}

/** `rootBall` of an exact value, which is expected to succeed. */
function root(value: Scaled, degree: bigint, precision: number): Ball {
  const result = rootBall(exact(value), degree, at(precision));
  assert.ok(result.ok, inspect(result));
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
  assert.deepEqual(show(exact(fr(127n, 50n)), 8, nearest), {
    kind: "exact",
    text: "2.54",
  });
  assert.deepEqual(show(exact(fr(36n)), 8, nearest), {
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
  // Whatever the exponent: the digits are the mantissa's.
  assert.deepEqual(show(exact(dec("1e999999999")), 8, nearest), {
    kind: "exact",
    text: "1e+999999999",
  });
  assert.deepEqual(show(exact(dec("1e1999999998")), 1, nearest), {
    kind: "exact",
    text: "1e+1999999998",
  });
  assert.deepEqual(show(exact(dec("-1.3e-999999999")), 8, nearest), {
    kind: "exact",
    text: "-1.3e-999999999",
  });
});

test("an exact value with more digits than shown is certified, not exact", () => {
  assert.deepEqual(show(exact(fr(1n, 3n)), 8, nearest), {
    kind: "certified",
    text: "0.33333333",
  });
  assert.deepEqual(show(exact(fr(5000n, 127n)), 8, nearest), {
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
  assert.deepEqual(show(exact(dec("1.3e999999999")), 1, nearest), {
    kind: "certified",
    text: "1e+999999999",
  });
});

// ---------------------------------------------------------------------------
// Certified and partial

test("an inexact value that certifies every digit asked is certified, never exact", () => {
  for (const digits of [1, 8, 40]) {
    const shown = show(root(fr(2n), 2n, 40), digits, nearest);
    assert.equal(shown.kind, "certified", `${digits} digits`);
  }
  assert.deepEqual(show(root(fr(2n), 2n, 40), 8, nearest), {
    kind: "certified",
    text: "1.4142136",
  });
  // The mode is applied to the digits shown.
  assert.deepEqual(show(root(fr(2n), 2n, 40), 8, "floor"), {
    kind: "certified",
    text: "1.4142135",
  });
  // A midpoint with few digits, or a whole number, is still only certified.
  assert.deepEqual(show(about("1", "1e-30"), 8, nearest), {
    kind: "certified",
    text: "1",
  });
  assert.deepEqual(show(root(fr(4n), 2n, 40), 8, nearest), {
    kind: "exact",
    text: "2",
  });
});

test("a radius that cannot be aligned with the midpoint certifies by digits", () => {
  // `sqrt(2) + 1e999999999`: the root is absorbed into the radius, and the
  // sum is `1e999999999` within about 1.42, which certifies every digit a
  // display asks for, the radius being a billion digits below.
  const huge = exact(dec("1e999999999"));
  const sum = addBalls(root(fr(2n), 2n, 8), huge, at(8));
  assert.ok(sum.ok, inspect(sum));
  assert.deepEqual(sum.value.mid, huge.mid);
  for (const digits of [1, 8, 50, 1000]) {
    assert.deepEqual(show(sum.value, digits, nearest), {
      kind: "certified",
      text: "1e+999999999",
    });
  }
  // A ball written with such a radius directly, and one that reaches into
  // the digits shown, which is partial at the digits before it.
  assert.deepEqual(show(about("1e999999999", "1.5"), 8, nearest), {
    kind: "certified",
    text: "1e+999999999",
  });
  const wide = show(about("1.2345e999999999", "4e999999996"), 8, nearest);
  assert.equal(wide.kind, "partial");
  assert.ok(wide.kind === "partial");
  assert.ok(wide.certified >= 1 && wide.certified <= 2, `${wide.certified}`);
  assert.equal(
    wide.text,
    format(dec("1.2345e999999999"), wide.certified, nearest),
  );
});

test("an inexact value that certifies fewer digits than asked is partial, at those digits", () => {
  // A root at forty digits certifies about forty-nine: at 60 asked, fewer.
  const shown = show(root(fr(2n), 2n, 40), 60, nearest);
  assert.equal(shown.kind, "partial");
  assert.ok(shown.kind === "partial");
  assert.ok(
    shown.certified >= 47 && shown.certified < 60,
    `${shown.certified}`,
  );
  assert.equal(shown.text.length, shown.certified + 1);
  // sqrt 2 to sixty digits, from Python's decimal module.
  const reference = dec(
    "1.41421356237309504880168872420969807856967187537694807317667974",
  );
  assert.equal(shown.text, format(reference, shown.certified, nearest));
  // 1.2345 ± 1e-30 at four digits, to nearest: the fourth digit is a tie the
  // ball straddles, so three digits are certain and shown.
  assert.deepEqual(show(about("1.2345", "1e-30"), 4, nearest), {
    kind: "partial",
    text: "1.23",
    certified: 3,
  });
  // The same ball under a directed mode certifies all four.
  assert.deepEqual(show(about("1.2345", "1e-30"), 4, "floor"), {
    kind: "certified",
    text: "1.234",
  });
  assert.deepEqual(show(about("1.2345", "1e-30"), 4, "ceiling"), {
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
    assert.equal(show(about("1.2345", "1e-30"), 5, mode).kind, "certified");
  }
  assert.deepEqual(show(about("1.2345", "1e-30"), 5, "floor"), {
    kind: "partial",
    text: "1.234",
    certified: 4,
  });
  // A value on a tie at the first digit asked certifies none; the text is
  // then the midpoint at the digits asked.
  assert.deepEqual(show(about("1.5", "1e-30"), 1, nearest), {
    kind: "partial",
    text: "2",
    certified: 0,
  });
  // A wide ball certifies few, and the text is formatted at that many.
  assert.deepEqual(show(about("1234.5678", "0.04"), 8, nearest), {
    kind: "partial",
    text: "1235",
    certified: 4,
  });
  assert.deepEqual(show(about("1234.5678", "0.4"), 8, nearest), {
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
  assert.deepEqual(show(about(ZERO, "1e-30"), 8, nearest), {
    kind: "zero",
    text: "0",
    bound: "2e-30",
  });
  assert.deepEqual(show(about("1e-31", "1.2e-30"), 8, nearest), {
    kind: "zero",
    text: "0",
    bound: "2e-30",
  });
  assert.deepEqual(show(about("-0.001", "0.002"), 8, "floor"), {
    kind: "zero",
    text: "0",
    bound: "0.004",
  });
  // sqrt(2)^2 - 2 is such a ball.
  const two = root(fr(2n), 2n, 40);
  const squared = powRationalBall(two, rational(2n), at(40));
  assert.ok(squared.ok);
  const almostZero = subtractBalls(squared.value, exact(fr(2n)), at(40));
  assert.ok(almostZero.ok);
  const shown = show(almostZero.value, 8, nearest);
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

test("a bound whose radius cannot be formed is one digit above the coarse magnitude", () => {
  // `1e-999999999 ± 1e-999999990` contains zero, and neither its radius
  // nor the sum of the two can be formed: the bound is a one-digit value
  // at or above `|mid| + rad`, within an order of magnitude of it.
  const shown = show(about("1e-999999999", "1e-999999990"), 8, nearest);
  assert.equal(shown.kind, "zero");
  assert.ok(shown.kind === "zero");
  assert.equal(shown.text, "0");
  assert.match(shown.bound, /^[1-9]e-9999999(90|89)$/);
  const bound = dec(shown.bound);
  assert.ok(compare(bound, dec("1.000000001e-999999990")) >= 0, shown.bound);
  assert.ok(compare(bound, dec("1e-999999989")) <= 0, shown.bound);
  // A zero midpoint with such a radius, the same.
  const zero = show(about(ZERO, "1e-999999990"), 8, nearest);
  assert.ok(zero.kind === "zero");
  assert.ok(compare(dec(zero.bound), dec("1e-999999990")) >= 0, zero.bound);
  assert.ok(compare(dec(zero.bound), dec("1e-999999989")) <= 0, zero.bound);
  // A midpoint clear of such a radius is not the zero kind.
  assert.equal(
    show(about("1e-999999999", "1e-1000000009"), 8, nearest).kind,
    "certified",
  );
});

test("an unbounded radius shows the midpoint's digits, certifying none", () => {
  const unbounded: Ball = { mid: fr(2n), rad: UNBOUNDED };
  assert.deepEqual(show(unbounded, 8, nearest), {
    kind: "unbounded",
    text: "2",
  });
  assert.deepEqual(show({ mid: fr(1n, 3n), rad: UNBOUNDED }, 4, nearest), {
    kind: "unbounded",
    text: "0.3333",
  });
  assert.deepEqual(show({ mid: ZERO, rad: UNBOUNDED }, 4, nearest), {
    kind: "unbounded",
    text: "0",
  });
});

test("the kinds are exclusive and cover every ball", () => {
  const kinds = new Set<Shown["kind"]>();
  const balls: Ball[] = [
    exact(fr(3n)),
    exact(fr(1n, 3n)),
    root(fr(2n), 2n, 40),
    about("1.2345", "1e-30"),
    about(ZERO, "1e-30"),
    { mid: fr(2n), rad: UNBOUNDED },
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

// ---------------------------------------------------------------------------
// Fractions (docs/fractions.md, "The rule")

test("with fractions, an exact value that is not an integer is its fraction when it fits", () => {
  // 1.9's rows, restated under the setting.
  assert.deepEqual(show(exact(fr(127n, 50n)), 8, nearest, true), {
    kind: "exact",
    text: "127/50",
    fraction: true,
  });
  assert.deepEqual(show(exact(dec("2.54")), 8, nearest, true), {
    kind: "exact",
    text: "127/50",
    fraction: true,
  });
  assert.deepEqual(show(exact(fr(1n, 3n)), 8, nearest, true), {
    kind: "exact",
    text: "1/3",
    fraction: true,
  });
  assert.deepEqual(show(exact(fr(5000n, 127n)), 8, nearest, true), {
    kind: "exact",
    text: "5000/127",
    fraction: true,
  });
  for (const digits of [1, 8, 40]) {
    const shown = show(root(fr(2n), 2n, 40), digits, nearest, true);
    assert.equal(shown.kind, "certified", `${digits} digits`);
  }
  assert.deepEqual(show(root(fr(4n), 2n, 40), 8, nearest, true), {
    kind: "exact",
    text: "2",
  });
  // The fraction is the ordinary one, the power of ten multiplied back in.
  assert.deepEqual(show(exact(dec("1.609344")), 8, nearest, true), {
    kind: "exact",
    text: "25146/15625",
    fraction: true,
  });
  assert.deepEqual(show(exact(dec("1e-7")), 8, nearest, true), {
    kind: "exact",
    text: "1/10000000",
    fraction: true,
  });
  assert.deepEqual(show(exact(dec("0.5")), 1, nearest, true), {
    kind: "exact",
    text: "1/2",
    fraction: true,
  });
  // The sign is on the numerator, and the rounding mode plays no part.
  for (const mode of ROUNDING_MODES) {
    assert.deepEqual(show(exact(fr(-5000n, 127n)), 8, mode, true), {
      kind: "exact",
      text: "-5000/127",
      fraction: true,
    });
    assert.deepEqual(show(exact(dec("-2.54")), 8, mode, true), {
      kind: "exact",
      text: "-127/50",
      fraction: true,
    });
  }
});

test("with fractions, an exact integer is shown as the decimal display shows it", () => {
  assert.deepEqual(show(exact(fr(36n)), 8, nearest, true), {
    kind: "exact",
    text: "36",
  });
  assert.deepEqual(show(exact(ZERO), 8, nearest, true), {
    kind: "exact",
    text: "0",
  });
  assert.deepEqual(show(exact(dec("1e20")), 8, nearest, true), {
    kind: "exact",
    text: "1e+20",
  });
  assert.deepEqual(show(exact(dec("1e999999999")), 8, nearest, true), {
    kind: "exact",
    text: "1e+999999999",
  });
  // 3^20 is exact and has ten digits: certified at eight, exact at ten.
  assert.deepEqual(show(exact(fr(3486784401n)), 8, nearest, true), {
    kind: "certified",
    text: "3.4867844e+9",
  });
  assert.deepEqual(show(exact(fr(3486784401n)), 10, nearest, true), {
    kind: "exact",
    text: "3486784401",
  });
});

test("with fractions, a fraction that does not fit falls back to the decimal display", () => {
  // The numerator and the denominator each fit within the digits asked.
  assert.deepEqual(show(exact(fr(5000n, 127n)), 3, nearest, true), {
    kind: "certified",
    text: "39.4",
  });
  assert.deepEqual(show(exact(fr(5000n, 127n)), 4, nearest, true), {
    kind: "exact",
    text: "5000/127",
    fraction: true,
  });
  assert.deepEqual(show(exact(dec("1.609344")), 4, nearest, true), {
    kind: "certified",
    text: "1.609",
  });
  assert.deepEqual(show(exact(dec("1e-8")), 8, nearest, true), {
    kind: "exact",
    text: "1e-8",
  });
  assert.deepEqual(show(exact(dec("1e-8")), 9, nearest, true), {
    kind: "exact",
    text: "1/100000000",
    fraction: true,
  });
  // The decimal display says `=` where its own rule allows.
  assert.deepEqual(show(exact(dec("1.5e-999999999")), 8, nearest, true), {
    kind: "exact",
    text: "1.5e-999999999",
  });
  assert.deepEqual(show(exact(dec("-1.3e-999999999")), 8, nearest, true), {
    kind: "exact",
    text: "-1.3e-999999999",
  });
  // (1/3) × 1e30: a numerator of thirty-one digits.
  const third = { mant: rational(1n, 3n), exp: 30n };
  assert.deepEqual(show(exact(third), 8, nearest, true), {
    kind: "certified",
    text: "3.3333333e+29",
  });
  assert.deepEqual(show(exact(third), 31, nearest, true), {
    kind: "exact",
    text: "1000000000000000000000000000000/3",
    fraction: true,
  });
  // A power of two with a negative exponent cancels against the power of
  // ten: 2^20 × 10^-20 is 1/5^20, which fits at fourteen digits.
  const dyadic = dec("1048576e-20");
  assert.deepEqual(show(exact(dyadic), 14, nearest, true), {
    kind: "exact",
    text: "1/95367431640625",
    fraction: true,
  });
  // At thirteen the fraction does not fit, and the decimal is exact.
  assert.deepEqual(show(exact(dyadic), 13, nearest, true), {
    kind: "exact",
    text: "1.048576e-14",
  });
});

test("with fractions off, or an inexact value, nothing changes", () => {
  const balls: Ball[] = [
    exact(fr(3n)),
    exact(fr(1n, 3n)),
    exact(dec("2.54")),
    exact(dec("1e999999999")),
    root(fr(2n), 2n, 40),
    about("1.2345", "1e-30"),
    about(ZERO, "1e-30"),
    { mid: fr(2n), rad: UNBOUNDED },
    { mid: fr(1n, 3n), rad: UNBOUNDED },
  ];
  for (const b of balls) {
    for (const digits of [1, 4, 8]) {
      assert.deepEqual(
        show(b, digits, nearest, false),
        show(b, digits, nearest),
      );
      if (!isExact(b)) {
        assert.deepEqual(
          show(b, digits, nearest, true),
          show(b, digits, nearest),
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// A zero's bound at the edges (docs/fractions.md; #67)

test("a zero's bound below the exponent bound is written as 1e-1000000000000000000", () => {
  // A radius of 2^-(10^19), far below the bound: the bound written is the
  // smallest positive value within the exponent bound, larger and so
  // still sound, and short.
  const far: Ball = { mid: ZERO, rad: powerOfTwoRadius(-(10n ** 19n)) };
  assert.deepEqual(show(far, 8, nearest), {
    kind: "zero",
    text: "0",
    bound: "1e-1000000000000000000",
  });
  // A nonzero midpoint is within the exponent bound, so its bound is too,
  // and is written as it is.
  const off: Ball = {
    mid: dec("1e-1000000000000000000"),
    rad: powerOfTenRadius(-(10n ** 18n) + 1n),
  };
  const shownOff = show(off, 8, nearest);
  assert.ok(shownOff.kind === "zero", inspect(shownOff));
  assert.match(shownOff.bound, /^[1-9]e-999999999999999999$/);
  assert.ok(
    compare(dec(shownOff.bound), dec("1.1e-999999999999999999")) >= 0,
    shownOff.bound,
  );
  // A bound within the exponent bound is written as it is.
  const near: Ball = { mid: ZERO, rad: powerOfTenRadius(-(10n ** 18n) + 5n) };
  const shownNear = show(near, 8, nearest);
  assert.ok(shownNear.kind === "zero");
  assert.match(shownNear.bound, /^[1-9]e-99999999999999999[45]$/);
  assert.ok(compare(dec(shownNear.bound), dec("1e-999999999999999995")) >= 0);
  assert.ok(compare(dec(shownNear.bound), dec("1e-999999999999999993")) <= 0);
  // The bound parses back, at the bound.
  assert.ok(compare(dec("1e-1000000000000000000"), ZERO) > 0);
});

// The uncertified kind (D26; docs/decimal-mode.md, "The ceiling")

test("a decimal-mode value flagged uncertified is shown as its digits, whatever else the ball would be", () => {
  const flagged: Ball = { ...exact(dec("1.2")), uncertified: true };
  assert.deepEqual(show(flagged, 2, "halfEven"), {
    kind: "uncertified",
    text: "1.2",
  });
  // The fractions display does not reach it.
  assert.deepEqual(show(flagged, 2, "halfEven", true), {
    kind: "uncertified",
    text: "1.2",
  });
  assert.deepEqual(show({ ...exact(ZERO), uncertified: true }, 8, "halfEven"), {
    kind: "uncertified",
    text: "0",
  });
});
