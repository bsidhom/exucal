import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
  certifiedDigits,
  certifies,
  classifyExp,
  classifyHyperbolic,
  classifyPower,
  containsZero,
  decimalSumApart,
  divideBalls,
  exact,
  isExact,
  magnitudeAbove,
  multiplyBalls,
  negateBall,
  position,
  powBall,
  powLogSpace,
  powRationalBall,
  radiusOfMove,
  radiusValue,
  rootBall,
  step,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  compareRadius,
  isUnbounded,
  powerOfTenRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusBelowScaled,
  radiusUpper,
} from "./radius.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  absolute as absoluteFraction,
  add as addFractions,
  compare as compareFractions,
  divide as divideFractions,
  multiply as multiplyFractions,
  pow as powFraction,
  rational,
  subtract as subtractFractions,
  toFraction,
  type Rational,
} from "./rational.ts";
import { ok, type Result } from "./result.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";
import {
  absolute,
  add,
  compare,
  divide,
  equals,
  fromRational,
  isZero,
  MAX_EXPONENT,
  multiply,
  negate,
  ONE,
  pow,
  roundTo,
  subtract,
  ZERO,
  type Refusal,
  type Scaled,
} from "./scaled.ts";
import { foldIn, key, randomBall, split } from "../testing/random.ts";
import { ball, dec, digitsOf, fr, fraction } from "../testing/scaled.ts";

function unwrap<T, E extends { kind: string }>(result: Result<T, E>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

/** `b` as a step of the expression at `context` (`step` on a value computed already), for a ball it cannot refuse: every test's, but the ones of the bound. */
function settled(b: Ball, context: NumberContext): Ball {
  return unwrap(step(() => ok(b), context));
}

/** The context `at(precision)` in decimal mode, in `rounding`. */
function decimalAt(precision: number, rounding: RoundingMode): NumberContext {
  return { ...at(precision), rounding, mode: "decimal" };
}

/**
 * `num / den × 10^exp` as a `Scaled`, built without the constructor's
 * normalization, for a value whose canonical exponent lies past the bound
 * while its value does not, which the constructor admits since H.13;
 * `num` must not be divisible by ten and `den` must be coprime to it.
 */
function scaledAt(num: bigint, den: bigint, exp: bigint): Scaled {
  return { significand: rational(num, den), exp };
}

/** Whether the ball `b` reaches `point`: on it, straddling it or touching it. */
function covers(b: Ball, point: Scaled): boolean {
  const p = position(b, point);
  return p !== "above" && p !== "below";
}

const E18 = MAX_EXPONENT.toString();

function assertError(result: Result<unknown, BallError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

/** Asserts that `result` was refused with `kind`. */
function assertRefused(
  result: Result<unknown, BallError>,
  kind: Refusal["kind"],
) {
  assert.deepEqual(result, { ok: false, error: { kind } });
}

/** The ends of a bounded ball's interval, with its midpoint between them, as fractions. */
function ends(b: Ball): [Rational, Rational, Rational] {
  const rad = radiusUpper(b.rad);
  const mid = fraction(b.mid);
  return [subtractFractions(mid, rad), mid, addFractions(mid, rad)];
}

/** Asserts that `value` lies within the bounded ball `b`, exactly, as fractions. */
function assertContains(b: Ball, value: Rational | Scaled, label: string) {
  assert.ok(!isUnbounded(b.rad), `${label}: bounded`);
  const v = "significand" in value ? fraction(value) : value;
  const mid = fraction(b.mid);
  assert.ok(
    compareFractions(
      absoluteFraction(subtractFractions(v, mid)),
      radiusUpper(b.rad),
    ) <= 0,
    `${label}: ${toFraction(v)} within ${toFraction(mid)} ± ${toFraction(radiusUpper(b.rad))}`,
  );
}

/** `|a - b| < bound`, on `Scaled`s. */
function within(a: Scaled, b: Scaled, bound: Scaled): boolean {
  return (
    compare(
      absolute(unwrap(subtract(a, b, MAX_SIGNIFICAND_LIMIT_BITS))),
      bound,
    ) < 0
  );
}

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  };
}

/** The seeded balls the property tests are over. */
function seeded(): Ball[] {
  return split(key(1505), 120).map((k) => randomBall(k, 24, 12));
}

// ---------------------------------------------------------------------------
// The type

test("exact balls have radius zero, and contain zero only when zero", () => {
  const two = exact(fr(2n));
  assert.deepEqual(two, { mid: fr(2n), rad: ZERO_RADIUS });
  assert.ok(isExact(two));
  assert.ok(!containsZero(two));
  assert.ok(containsZero(exact(ZERO)));
  assert.ok(!isExact(ball(fr(2n), dec("0.5"))));
  assert.ok(!isExact({ mid: ZERO, rad: UNBOUNDED }));
});

test("containsZero looks at the whole interval", () => {
  assert.ok(containsZero(ball(dec("0.1"), dec("0.1"))));
  assert.ok(containsZero(ball(dec("0.1"), dec("0.2"))));
  assert.ok(containsZero(ball(dec("-0.1"), dec("0.2"))));
  assert.ok(!containsZero(ball(dec("0.1"), dec("0.05"))));
  assert.ok(!containsZero(ball(dec("-0.1"), dec("0.05"))));
  assert.ok(containsZero(ball(ZERO, dec("1e-30"))));
  assert.ok(containsZero({ mid: fr(5n), rad: UNBOUNDED }));
  // Whatever the exponent: the radius is compared by its bounds where it
  // cannot be formed, and a value clear of the radius is told apart.
  assert.ok(!containsZero(ball(dec("1e999999999"), dec("1e999999990"))));
  assert.ok(containsZero(ball(dec("1e-999999999"), dec("1e-999999990"))));
  assert.ok(!containsZero(ball(dec("1e-999999999"), dec("1e-1000000009"))));
});

test("magnitudeAbove bounds |mid| + rad", () => {
  const b = ball(dec("-2.5"), dec("0.25"));
  const bound = radiusUpper(magnitudeAbove(b));
  assert.ok(compareFractions(bound, fraction(dec("2.75"))) >= 0);
  assert.ok(compareFractions(bound, fraction(dec("2.7500001"))) < 0);
  const three = radiusUpper(magnitudeAbove(exact(fr(3n))));
  assert.ok(compareFractions(three, rational(3n)) >= 0);
  assert.ok(compareFractions(three, fraction(dec("3.00000001"))) < 0);
  assert.ok(isUnbounded(magnitudeAbove({ mid: ONE, rad: UNBOUNDED })));
});

test("position places a ball against a point, conservatively where the bounds cannot tell", () => {
  assert.equal(position(exact(fr(2n)), ONE), "above");
  assert.equal(position(exact(fr(-2n)), ONE), "below");
  assert.equal(position(exact(ONE), ONE), "at");
  const quarter = dec("0.25");
  assert.equal(position(ball(fr(2n), quarter), ONE), "above");
  assert.equal(position(ball(ZERO, quarter), ONE), "below");
  assert.equal(position(ball(dec("1.25"), quarter), ONE), "touchingAbove");
  assert.equal(position(ball(dec("0.75"), quarter), ONE), "touchingBelow");
  assert.equal(position(ball(dec("1.1"), quarter), ONE), "straddles");
  assert.equal(position({ mid: fr(5n), rad: UNBOUNDED }, ONE), "straddles");
  // Points the midpoint cannot be aligned with: the difference is at
  // least half the larger, which the radius is measured against.
  const huge = dec("1e999999999");
  assert.equal(position(ball(huge, ONE), ONE), "above");
  assert.equal(position(ball(negate(huge), ONE), ONE), "below");
  assert.equal(position(ball(ONE, dec("0.5")), huge), "below");
  assert.equal(position(ball(huge, huge), ONE), "straddles");
  // A radius too far below the working sizes to form is compared by its
  // bounds, and a midpoint within their `2^-30` of it straddles.
  const tiny = dec("1e-30000");
  assert.equal(position(ball(fr(2n), tiny), ONE), "above");
  assert.equal(position(ball(dec("1e-30000"), dec("1e-30001")), ZERO), "above");
  assert.equal(position(ball(tiny, tiny), ZERO), "straddles");
});

// ---------------------------------------------------------------------------
// Exact balls agree with scaled.ts

test("on exact balls every operation is the exact one, and stays exact", () => {
  const a = exact(dec("2.54"));
  const b = exact(fr(-3n, 7n));
  const context = at(8);
  assert.deepEqual(negateBall(a), exact(negate(a.mid)));
  assert.deepEqual(
    unwrap(addBalls(a, b, context)),
    exact(unwrap(add(a.mid, b.mid, MAX_SIGNIFICAND_LIMIT_BITS))),
  );
  assert.deepEqual(
    unwrap(subtractBalls(a, b, context)),
    exact(unwrap(subtract(a.mid, b.mid, MAX_SIGNIFICAND_LIMIT_BITS))),
  );
  assert.deepEqual(
    unwrap(multiplyBalls(a, b)),
    exact(unwrap(multiply(a.mid, b.mid))),
  );
  assert.deepEqual(
    unwrap(divideBalls(a, b)),
    exact(unwrap(divide(a.mid, b.mid))),
  );
  for (const n of [0n, 1n, 3n, -2n]) {
    assert.deepEqual(
      unwrap(powBall(b, n, context)),
      exact(unwrap(pow(b.mid, n, MAX_SIGNIFICAND_LIMIT_BITS))),
    );
  }
  assertError(divideBalls(a, exact(ZERO)), "divisionByZero");
  assertError(powBall(exact(ZERO), -1n, context), "divisionByZero");
  assertError(powBall(exact(fr(3n)), 100_000n, context), "tooLarge");
  // A power of ten costs nothing: the exponent takes it.
  assert.deepEqual(
    unwrap(powBall(exact(fr(10n)), 100_000n, context)),
    exact(dec("1e100000")),
  );
  assert.deepEqual(unwrap(powBall(exact(ZERO), 0n, context)), exact(ONE));
});

test("the exponent carries through the exact operations", () => {
  const huge = exact(dec("1e999999999"));
  const context = at(8);
  assert.deepEqual(
    unwrap(multiplyBalls(huge, huge)),
    exact(dec("1e1999999998")),
  );
  assert.deepEqual(
    unwrap(divideBalls(exact(ONE), huge)),
    exact(dec("1e-999999999")),
  );
  assert.deepEqual(
    unwrap(addBalls(huge, exact(dec("3e999999998")), context)),
    exact(dec("1.3e999999999")),
  );
  assert.deepEqual(unwrap(subtractBalls(huge, huge, context)), exact(ZERO));
  // Two exact operands that cannot be aligned within the significand limit have
  // an exact sum that cannot be held: `1e999999999 + 1`.
  assertRefused(addBalls(huge, exact(ONE), context), "tooLarge");
  assertRefused(subtractBalls(exact(ONE), huge, context), "tooLarge");
  // Within the limit they align, whatever the exponent.
  assert.deepEqual(
    unwrap(addBalls(huge, exact(dec("1e999999000")), context)),
    exact(dec(`1${"0".repeat(998)}1e999999000`)),
  );
  // The exponent bound: a product beyond `10^(10^18)`, and a quotient
  // below `10^-(10^18)`.
  const edge = exact(dec("1e999999999999999999"));
  assertRefused(multiplyBalls(edge, exact(dec("1e10"))), "overflow");
  assertRefused(
    divideBalls(exact(dec("1e-999999999999999999")), exact(dec("1e10"))),
    "underflow",
  );
});

test("a sum with an inexact operand that cannot be aligned settles first and absorbs the smaller", () => {
  const context = at(8);
  const huge = exact(dec("1e999999999"));
  const root = unwrap(rootBall(exact(fr(2n)), 2n, context));
  for (const sum of [
    unwrap(addBalls(root, huge, context)),
    unwrap(addBalls(huge, root, context)),
  ]) {
    assert.ok(!isExact(sum));
    assert.deepEqual(sum.mid, huge.mid);
    // The radius covers the root: at least 1.4 and under 1.5.
    const rad = radiusUpper(sum.rad);
    assert.ok(compareFractions(rad, fraction(dec("1.41"))) > 0);
    assert.ok(compareFractions(rad, fraction(dec("1.5"))) < 0);
    assert.ok(certifies(sum, 50, "halfEven"));
  }
  const difference = unwrap(subtractBalls(root, huge, context));
  assert.deepEqual(difference.mid, negate(huge.mid));
  // Two inexact operands that align once settled are added exactly.
  const third = settled(ball(fr(1n, 3n), dec("1e-30")), context);
  const sum = unwrap(addBalls(root, third, context));
  assert.ok(
    compare(
      absolute(
        unwrap(
          subtract(
            sum.mid,
            dec("1.7475468957064283821350173307390313"),
            MAX_SIGNIFICAND_LIMIT_BITS,
          ),
        ),
      ),
      dec("1e-17"),
    ) < 0,
  );
});

test("a sum is held to the bound by its whole ball (D18, issue #48)", () => {
  const context = at(8);
  const bottom = `1e-${E18}`;
  const half = exact(dec(`5e${E18}`));
  // Two exact operands whose sum passes the bound are refused in either
  // mode, where the settle-first path absorbed one into the radius.
  assertRefused(addBalls(half, half, context), "overflow");
  assertRefused(addBalls(half, half, decimalAt(8, "halfEven")), "overflow");
  assertRefused(
    subtractBalls(exact(dec(`1.5e-${E18}`)), exact(dec(bottom)), context),
    "underflow",
  );
  // An inexact sum is refused only when the whole ball is past.
  const wide = dec(`1e${E18.replace(/0{10}$/, "")}`);
  assertRefused(
    addBalls(ball(dec(`6e${E18}`), wide), half, context),
    "overflow",
  );
  assertRefused(
    subtractBalls(
      { mid: dec(`1.5e-${E18}`), rad: powerOfTenRadius(-MAX_EXPONENT - 30n) },
      exact(dec(bottom)),
      context,
    ),
    "underflow",
  );
  // One straddling the top is unresolved at the bound; the sum of #48's
  // first row, whose radius reaches back within.
  assert.deepEqual(addBalls(ball(dec(`5e${E18}`), wide), half, context), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  // One containing zero whose midpoint passes below is zero within
  // `|mid| + rad`.
  const around = unwrap(
    subtractBalls(
      ball(dec(`1.5e-${E18}`), dec(bottom)),
      exact(dec(bottom)),
      context,
    ),
  );
  assert.deepEqual(around.mid, ZERO);
  assert.ok(
    compareRadius(around.rad, radiusBelowScaled(dec(`1.5e-${E18}`))) >= 0,
  );
  // A sum within the bound whose `|mid| + rad` reaches the top is
  // unresolved at the bound, as a product's is; below the top it is the
  // sum, radii added.
  const near = exact(dec("1e999999999999999999"));
  assert.deepEqual(
    addBalls(
      ball(dec(`9.5e${E18}`), dec("6e999999999999999999")),
      near,
      context,
    ),
    { ok: false, error: { kind: "unresolved", edge: "bound" } },
  );
  const rad = dec("3e999999999999999999");
  assert.deepEqual(
    unwrap(addBalls(ball(dec(`9.5e${E18}`), rad), near, context)),
    ball(dec(`9.6e${E18}`), rad),
  );
});

// ---------------------------------------------------------------------------
// Containment

test("each operation's interval contains the exact result over the operands' intervals", () => {
  const balls = seeded();
  const powers = [0n, 1n, 2n, 3n, -1n, -2n];
  const context = at(8);
  for (const [i, a] of balls.entries()) {
    for (const b of [
      balls[(i + 1) % balls.length]!,
      balls[(i * 7 + 3) % balls.length]!,
    ]) {
      const sum = unwrap(addBalls(a, b, context));
      const difference = unwrap(subtractBalls(a, b, context));
      const product = unwrap(multiplyBalls(a, b));
      const quotient = divideBalls(a, b);
      if (containsZero(b)) {
        assertError(quotient, isExact(b) ? "divisionByZero" : "unresolved");
      }
      for (const x of ends(a)) {
        for (const y of ends(b)) {
          const label = `${toFraction(x)} and ${toFraction(y)}`;
          assertContains(sum, addFractions(x, y), `sum of ${label}`);
          assertContains(
            difference,
            subtractFractions(x, y),
            `difference of ${label}`,
          );
          assertContains(
            product,
            multiplyFractions(x, y),
            `product of ${label}`,
          );
          if (quotient.ok) {
            assertContains(
              quotient.value,
              unwrap(divideFractions(x, y)),
              `quotient of ${label}`,
            );
          }
        }
      }
    }
    for (const n of powers) {
      const power = powBall(a, n, context);
      if (n < 0n && containsZero(a)) {
        assertError(power, isExact(a) ? "divisionByZero" : "unresolved");
        continue;
      }
      for (const x of ends(a)) {
        assertContains(
          unwrap(power),
          unwrap(powFraction(x, n, MAX_SIGNIFICAND_LIMIT_BITS)),
          `${toFraction(x)}^${n}`,
        );
      }
    }
    assert.deepEqual(negateBall(negateBall(a)), a);
  }
});

test("the radii are tight where the bound is attained, to the coarse type's width", () => {
  // A sum's radius is the sum of the radii, exactly.
  const a = ball(fr(1n), dec("0.25"));
  const b = ball(fr(2n), dec("0.5"));
  assert.deepEqual(
    unwrap(addBalls(a, b, at(8))).rad,
    radiusAbove(fraction(dec("0.75"))),
  );
  // A product's: |a| rb + |b| ra + ra rb = 0.5 + 0.5 + 0.125, the
  // magnitudes taken from the bounds, within `2^-27` above.
  const product = radiusUpper(unwrap(multiplyBalls(a, b)).rad);
  assert.ok(compareFractions(product, fraction(dec("1.125"))) >= 0);
  assert.ok(
    compareFractions(
      product,
      multiplyFractions(
        rational(9n, 8n),
        rational((1n << 27n) + 1n, 1n << 27n),
      ),
    ) < 0,
  );
  // A quotient's: (|a| rb + |b| ra) / (|b| (|b| - rb)) = (0.5 + 0.5) / (2 × 1.5).
  const quotient = radiusUpper(unwrap(divideBalls(a, b)).rad);
  assert.ok(compareFractions(quotient, rational(1n, 3n)) >= 0);
  assert.ok(
    compareFractions(
      quotient,
      multiplyFractions(
        rational(1n, 3n),
        rational((1n << 26n) + 1n, 1n << 26n),
      ),
    ) < 0,
  );
  // A square's is the product's, the base times itself, settled: 2 × 0.25
  // + 0.0625, plus the half unit of the settling.
  const squared = radiusUpper(unwrap(powBall(a, 2n, at(8))).rad);
  assert.ok(compareFractions(squared, fraction(dec("0.5625"))) >= 0);
  assert.ok(compareFractions(squared, fraction(dec("0.5626"))) < 0);
});

test("the quotient rule on the coarse type is within 2^-25 of the exact bound over seeded balls", () => {
  const balls = seeded();
  const slack = rational((1n << 25n) + 1n, 1n << 25n);
  let checked = 0;
  for (const [i, a] of balls.entries()) {
    const b = balls[(i * 5 + 1) % balls.length]!;
    if (containsZero(b) || (isExact(b) && isExact(a))) continue;
    const quotient = unwrap(divideBalls(a, b));
    const ra = radiusUpper(a.rad);
    const rb = radiusUpper(b.rad);
    const am = absoluteFraction(fraction(a.mid));
    const bm = absoluteFraction(fraction(b.mid));
    // (|a| rb + |b| ra) / (|b| (|b| - rb)), exactly.
    const exactBound = unwrap(
      divideFractions(
        addFractions(multiplyFractions(am, rb), multiplyFractions(bm, ra)),
        multiplyFractions(bm, subtractFractions(bm, rb)),
      ),
    );
    const rad = radiusUpper(quotient.rad);
    assert.ok(compareFractions(rad, exactBound) >= 0, `${i}: at or above`);
    assert.ok(
      compareFractions(rad, multiplyFractions(exactBound, slack)) <= 0,
      `${i}: within 2^-25: ${toFraction(rad)} against ${toFraction(exactBound)}`,
    );
    checked++;
  }
  assert.ok(checked > 50, `${checked} quotients checked`);
});

// ---------------------------------------------------------------------------
// Zero, unbounded, unresolved

test("an exact zero times anything is exact zero", () => {
  const wide = ball(fr(5n), fr(100n));
  assert.deepEqual(unwrap(multiplyBalls(exact(ZERO), wide)), exact(ZERO));
  assert.deepEqual(unwrap(multiplyBalls(wide, exact(ZERO))), exact(ZERO));
  assert.deepEqual(
    unwrap(multiplyBalls(exact(ZERO), { mid: ONE, rad: UNBOUNDED })),
    exact(ZERO),
  );
  // Whereas an inexact zero is not.
  const almostZero = ball(ZERO, dec("0.1"));
  const doubled = unwrap(multiplyBalls(almostZero, exact(fr(2n))));
  assert.ok(!isExact(doubled));
  const rad = radiusUpper(doubled.rad);
  assert.ok(compareFractions(rad, fraction(dec("0.2"))) >= 0);
  assert.ok(compareFractions(rad, fraction(dec("0.2000001"))) < 0);
});

test("division by a ball around zero is unresolved, by exact zero a division by zero", () => {
  const one = exact(ONE);
  assertError(divideBalls(one, ball(dec("0.001"), dec("0.002"))), "unresolved");
  assertError(divideBalls(one, ball(ZERO, dec("1e-30"))), "unresolved");
  assertError(divideBalls(one, exact(ZERO)), "divisionByZero");
  assertError(divideBalls(ball(ZERO, ONE), exact(ZERO)), "divisionByZero");
  // A divisor just clear of zero divides.
  assert.ok(divideBalls(one, ball(dec("0.003"), dec("0.002"))).ok);
});

test("every unresolved of the ball names its edge, zero", () => {
  // Every producer here: the three ways a divisor cannot be told from
  // zero, the even root of a ball straddling zero, and the log-space power
  // of a ball that reaches within an ulp of zero at the kernel's bits.
  const one = exact(ONE);
  const unresolved = { ok: false, error: { kind: "unresolved", edge: ZERO } };
  assert.deepEqual(divideBalls(one, ball(ZERO, dec("1e-30"))), unresolved);
  assert.deepEqual(divideBalls(one, { mid: ZERO, rad: UNBOUNDED }), unresolved);
  assert.deepEqual(
    divideBalls(one, {
      mid: dec("1e-20"),
      rad: radiusAbove(rational(1n, 10n ** 20n)),
    }),
    unresolved,
  );
  assert.deepEqual(
    rootBall(ball(dec("0.1"), dec("0.2")), 2n, at(8)),
    unresolved,
  );
  assert.deepEqual(
    powLogSpace(ball(ONE, dec("0.999999999999")), exact(dec("0.5")), at(8)),
    unresolved,
  );
});

test("a ball around zero to a negative power is unresolved", () => {
  const around = ball(dec("0.1"), dec("0.2"));
  assertError(powBall(around, -1n, at(8)), "unresolved");
  assertError(powBall(around, -2n, at(8)), "unresolved");
  assert.deepEqual(unwrap(powBall(around, 0n, at(8))), exact(ONE));
  assert.ok(containsZero(unwrap(powBall(around, 2n, at(8)))));
});

test("an unbounded radius propagates, and a divisor of unbounded radius divides unless its midpoint is zero", () => {
  const unbounded: Ball = { mid: fr(2n), rad: UNBOUNDED };
  const three = exact(fr(3n));
  assert.deepEqual(unwrap(addBalls(unbounded, three, at(8))), {
    mid: fr(5n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(multiplyBalls(unbounded, three)), {
    mid: fr(6n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(divideBalls(three, unbounded)), {
    mid: fr(3n, 2n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(divideBalls(unbounded, three)), {
    mid: fr(2n, 3n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, 3n, at(8))), {
    mid: fr(8n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, -1n, at(8))), {
    mid: fr(1n, 2n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, 0n, at(8))), exact(ONE));
  assertError(divideBalls(three, { mid: ZERO, rad: UNBOUNDED }), "unresolved");
  assertError(divideBalls(three, exact(ZERO)), "divisionByZero");
  assert.ok(isZero(unwrap(divideBalls(exact(ZERO), unbounded)).mid));
});

// ---------------------------------------------------------------------------
// The root

/** References from Python's decimal module: sqrt 2 to sixty digits and others. */
const SQRT2 = dec(
  "1.41421356237309504880168872420969807856967187537694807317667974",
);
const CBRT2 = dec("1.259921049894873164767210607278228350570");
const SQRT_2E20 = dec("14142135623.7309504880168872420969807856967");
const SQRT_2E_40 = dec("1.4142135623730950488016887242096980785696e-20");
const ROOT20_2 = dec(
  "1.035264923841377504347788194211246197729610910324630157976698",
);
const ROOT_BILLIONTH_2 = dec(
  "1.00000000069314718080017181643183694246616754030093",
);
const TWO_TO_3_HALVES = dec("2.8284271247461900976033774484193961571393");
/** `sqrt(1e999999999)`, `3.1622776601683793319988935444327185337196e499999999`, from Python's decimal module. */
const SQRT_HUGE = dec("3.1622776601683793319988935444327185337196e499999999");

/** `10^-digits`. */
function tenTo(digits: number): Rational {
  return rational(1n, 10n ** BigInt(digits));
}

/**
 * Whether the bounded `b` contains the `degree`-th root of every value in
 * `[from, to]`, by monotonicity: the lower end's power is at most `from`
 * and the upper end's at least `to`.
 */
function rootsWithin(b: Ball, from: Rational, to: Rational, degree: bigint) {
  const [low, , high] = ends(b);
  const lowPower = powFraction(low, degree, MAX_SIGNIFICAND_LIMIT_BITS);
  const highPower = powFraction(high, degree, MAX_SIGNIFICAND_LIMIT_BITS);
  assert.ok(lowPower.ok && highPower.ok);
  const below =
    degree % 2n === 0n && low.num < 0n
      ? true
      : compareFractions(lowPower.value, from) <= 0;
  return below && compareFractions(highPower.value, to) >= 0;
}

test("rootBall of an exact argument with a rational root is exact", () => {
  assert.deepEqual(
    unwrap(rootBall(exact(fr(9n, 4n)), 2n, at(8))),
    exact(fr(3n, 2n)),
  );
  assert.deepEqual(unwrap(rootBall(exact(fr(-8n)), 3n, at(8))), exact(fr(-2n)));
  assert.deepEqual(unwrap(rootBall(exact(ZERO), 2n, at(8))), exact(ZERO));
  assert.deepEqual(
    unwrap(rootBall(exact(fr(7n, 3n)), 1n, at(8))),
    exact(fr(7n, 3n)),
  );
  assert.deepEqual(
    unwrap(rootBall(exact(dec("1e999999998")), 2n, at(8))),
    exact(dec("1e499999999")),
  );
  assertError(rootBall(exact(fr(-4n)), 2n, at(8)), "negativeRadicand");
  assert.throws(() => rootBall(exact(fr(4n)), 0n, at(8)), RangeError);
});

test("rootBall of an exact argument otherwise is the kernel's root at the precision", () => {
  for (const precision of [1, 8, 40]) {
    const root = unwrap(rootBall(exact(fr(2n)), 2n, at(precision)));
    assert.ok(!isExact(root));
    assertContains(root, SQRT2, `sqrt 2 at ${precision}`);
    // The radius is the kernel's plus the rounding onto the working
    // digits: a few ulps at the precision plus the guard, between
    // 10^-(p + 12) and 10^-(p + 8).
    const rad = radiusUpper(root.rad);
    assert.ok(
      compareFractions(rad, tenTo(precision + 8)) < 0,
      `${precision}: radius`,
    );
    assert.ok(
      compareFractions(rad, tenTo(precision + 12)) > 0,
      `${precision}: radius`,
    );
    // The midpoint is on the decimal grid of the working digits.
    assert.ok(digitsOf(root.mid) <= workingDigits(at(precision)));
  }
  // Beyond the reference's digits the midpoint agrees with them.
  const sixty = unwrap(rootBall(exact(fr(2n)), 2n, at(60)));
  assert.ok(within(sixty.mid, SQRT2, dec("1e-59")));
  // The magnitude is kept, however large or small the argument.
  const large = unwrap(rootBall(exact(dec("2e20")), 2n, at(6)));
  assertContains(large, SQRT_2E20, "sqrt 2e20");
  assert.ok(
    compareFractions(radiusUpper(large.rad), fraction(dec("1e-3"))) < 0,
  );
  const tiny = unwrap(rootBall(exact(dec("2e-40")), 2n, at(8)));
  assertContains(tiny, SQRT_2E_40, "sqrt 2e-40");
  assert.ok(compareFractions(radiusUpper(tiny.rad), tenTo(36)) < 0);
  // A negative odd root, and higher degrees, at any degree.
  const negative = unwrap(rootBall(exact(fr(-2n)), 3n, at(8)));
  assertContains(negative, negate(CBRT2), "cbrt -2");
  const twentieth = unwrap(rootBall(exact(fr(2n)), 20n, at(1000)));
  assert.ok(within(twentieth.mid, ROOT20_2, dec("1e-59")));
  assert.ok(compareFractions(radiusUpper(twentieth.rad), tenTo(1008)) < 0);
  const billionth = unwrap(rootBall(exact(fr(2n)), 10n ** 9n, at(40)));
  assertContains(billionth, ROOT_BILLIONTH_2, "2^(1/10^9)");
});

test("rootBall scales the exponent off and roots the significand, whatever the exponent", () => {
  // sqrt(1e999999999): the exponent's odd remainder is folded into the
  // significand, and the result is `≈ 3.1622777e+499999999` on the first pass.
  const huge = unwrap(rootBall(exact(dec("1e999999999")), 2n, at(8)));
  assert.ok(!isExact(huge));
  assert.equal(huge.mid.exp + BigInt(digitsOf(huge.mid)) - 1n, 499999999n);
  assert.ok(certifies(huge, 8, "halfEven"));
  assert.ok(within(huge.mid, SQRT_HUGE, dec("1e499999982")));
  // Its square contains the argument.
  const square = unwrap(multiplyBalls(huge, huge));
  assert.notEqual(position(square, dec("1e999999999")), "above");
  assert.notEqual(position(square, dec("1e999999999")), "below");
  // The cube root of a tiny value, and of one whose exponent's remainder
  // does not fit the significand limit, which goes through log space.
  const tiny = unwrap(rootBall(exact(dec("8e-999999999")), 3n, at(8)));
  assert.ok(certifies(tiny, 8, "halfEven"));
  assert.ok(within(tiny.mid, dec("2e-333333333"), dec("1e-333333341")));
  const context = { ...at(8), significandLimitBits: 256 };
  const remainder = unwrap(rootBall(exact(dec("1e101")), 3n, context));
  assert.ok(
    within(
      remainder.mid,
      dec("4.6415888336127788924100763509194465765513e33"),
      dec("1e26"),
    ),
  );
  // A root of a value with a large exponent over a seeded significand: the
  // square of the result contains the argument.
  const seed = key(4401);
  for (let i = 0; i < 30; i++) {
    const b = randomBall(foldIn(seed, i), 24, 3);
    if (containsZero(b) || compare(b.mid, ZERO) < 0) continue;
    const scaled: Ball = {
      mid: { significand: b.mid.significand, exp: b.mid.exp + 999999990n },
      rad: unwrap(
        multiplyBalls(exact(dec("1e999999990")), { mid: ZERO, rad: b.rad }),
      ).rad,
    };
    const root = unwrap(rootBall(scaled, 2n, at(20)));
    const back = unwrap(multiplyBalls(root, root));
    // The argument's midpoint lies within the square's interval.
    assert.notEqual(position(back, scaled.mid), "above", `${i}`);
    assert.notEqual(position(back, scaled.mid), "below", `${i}`);
  }
});

test("rootBall of an inexact argument covers the roots of its interval", () => {
  const root = unwrap(rootBall(ball(fr(2n), dec("1e-30")), 2n, at(10)));
  assert.ok(!isExact(root));
  assertContains(root, SQRT2, "sqrt of 2 ± 1e-30");
  assert.ok(rootsWithin(root, rational(2n), rational(2n), 2n));
  const [from, , to] = ends(ball(fr(2n), dec("1e-30")));
  assert.ok(rootsWithin(root, from, to, 2n));
  // Even of a midpoint whose root is rational: the argument is not exact.
  const four = unwrap(rootBall(ball(fr(4n), dec("1e-30")), 2n, at(10)));
  assert.ok(!isExact(four));
  assertContains(four, rational(2n), "sqrt of 4 ± 1e-30");
  // A wide argument gives a wide root.
  const wide = unwrap(rootBall(ball(fr(4n), fr(2n)), 2n, at(10)));
  assert.ok(rootsWithin(wide, rational(2n), rational(6n), 2n));
  // A negative argument under an even root has no real value.
  assertError(
    rootBall(ball(fr(-4n), dec("0.1")), 2n, at(10)),
    "negativeRadicand",
  );
  const negative = unwrap(rootBall(ball(fr(-8n), dec("0.5")), 3n, at(10)));
  assert.ok(
    rootsWithin(negative, fraction(dec("-8.5")), fraction(dec("-7.5")), 3n),
  );
  // Containment over the shared source, at every small degree.
  for (const b of seeded()) {
    if (containsZero(b) || compare(b.mid, ZERO) < 0) continue;
    const [lo, , hi] = ends(b);
    for (const degree of [2n, 3n, 5n]) {
      const r = unwrap(rootBall(b, degree, at(20)));
      assert.ok(
        rootsWithin(r, lo, hi, degree),
        `root ${degree} of ${toFraction(lo)} to ${toFraction(hi)}`,
      );
    }
  }
});

test("a ball straddling zero is unresolved under an even root and a ball around zero under an odd one", () => {
  const straddling = ball(dec("0.001"), dec("0.002"));
  assertError(rootBall(straddling, 2n, at(10)), "unresolved");
  assertError(rootBall(straddling, 4n, at(10)), "unresolved");
  const cube = unwrap(rootBall(straddling, 3n, at(10)));
  assert.ok(containsZero(cube));
  assert.ok(
    rootsWithin(cube, fraction(dec("-0.001")), fraction(dec("0.003")), 3n),
  );
  // The bound is the root of the farther end, on either side.
  const other = unwrap(rootBall(ball(dec("-0.001"), dec("0.002")), 3n, at(10)));
  assert.ok(
    rootsWithin(other, fraction(dec("-0.003")), fraction(dec("0.001")), 3n),
  );
  assert.ok(
    compareFractions(radiusUpper(other.rad), fraction(dec("0.15"))) < 0,
  );
  assert.ok(isZero(cube.mid));
});

test("rootBall of an unbounded argument is the root of its midpoint, unbounded", () => {
  const root = unwrap(rootBall({ mid: fr(2n), rad: UNBOUNDED }, 2n, at(10)));
  assert.ok(isUnbounded(root.rad));
  assert.ok(within(root.mid, SQRT2, dec("1e-10")));
  assert.deepEqual(
    unwrap(rootBall({ mid: ZERO, rad: UNBOUNDED }, 3n, at(10))),
    {
      mid: ZERO,
      rad: UNBOUNDED,
    },
  );
  assert.deepEqual(
    unwrap(rootBall({ mid: fr(4n), rad: UNBOUNDED }, 2n, at(10))),
    {
      mid: fr(2n),
      rad: UNBOUNDED,
    },
  );
  assertError(
    rootBall({ mid: fr(-4n), rad: UNBOUNDED }, 2n, at(10)),
    "negativeRadicand",
  );
});

test("powRationalBall composes the power and the root, root last", () => {
  assert.deepEqual(
    unwrap(powRationalBall(exact(fr(4n)), rational(1n, 2n), at(8))),
    exact(fr(2n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(fr(8n)), rational(2n, 3n), at(8))),
    exact(fr(4n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(fr(8n)), rational(-2n, 3n), at(8))),
    exact(fr(1n, 4n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(fr(2n, 3n)), rational(-2n), at(8))),
    exact(fr(9n, 4n)),
  );
  // 2^(3/2) = 2.828427124746...: the root is taken of 8.
  const power = unwrap(powRationalBall(exact(fr(2n)), rational(3n, 2n), at(5)));
  assertContains(power, TWO_TO_3_HALVES, "2^(3/2)");
  assert.ok(compareFractions(radiusUpper(power.rad), tenTo(12)) < 0);
  assertError(
    powRationalBall(exact(fr(-2n)), rational(1n, 2n), at(5)),
    "negativeRadicand",
  );
  assertError(
    powRationalBall(ball(fr(-2n), dec("0.1")), rational(1n, 2n), at(5)),
    "negativeRadicand",
  );
  // A ball straddling zero under an even root is undecided, not negative.
  assertError(
    powRationalBall(ball(dec("-0.1"), dec("0.2")), rational(1n, 2n), at(5)),
    "unresolved",
  );
  assertError(
    powRationalBall(exact(ZERO), rational(-1n, 2n), at(5)),
    "divisionByZero",
  );
  // A base that is not a power of ten goes through log space and has the
  // range of its exponent (4.9): 7^(100000/3) is about 8.6e28169, from
  // Python's decimal module, and 7^(10^19) passes the exponent bound.
  const sevenThirds = unwrap(
    powRationalBall(exact(fr(7n)), rational(100_000n, 3n), at(8)),
  );
  assert.ok(
    within(
      sevenThirds.mid,
      dec("8.603341100210093535833101714461038568682e28169"),
      dec("1e28152"),
    ),
  );
  assert.ok(certifies(sevenThirds, 8, "halfEven"));
  assertError(
    powRationalBall(exact(fr(7n)), rational(10n ** 19n, 3n), at(5)),
    "overflow",
  );
  // A power of ten fits at any exponent, and its root is taken of the
  // remainder: 10^(100000/3) is the cube root of 10 times 10^33333, the
  // reference from Python's decimal module.
  const ofTen = unwrap(
    powRationalBall(exact(fr(10n)), rational(100_000n, 3n), at(30)),
  );
  assert.ok(
    within(
      ofTen.mid,
      dec("2.154434690031883721759293566519350495259344942192108582e33333"),
      dec("1e33303"),
    ),
  );
  assert.ok(certifies(ofTen, 30, "halfEven"));
  // Log space where the power of the base does not fit but the result
  // does: 10^2.3456789 was 10^23456789, refused; the reference is Python's
  // decimal module's.
  const logSpace = unwrap(
    powRationalBall(exact(fr(10n)), fraction(dec("2.3456789")), at(30)),
  );
  assertContains(
    logSpace,
    dec(
      "221.65569800753690957294303882914688855431729064360237868185447239495302889375",
    ),
    "10^2.3456789",
  );
  assert.ok(compareFractions(radiusUpper(logSpace.rad), tenTo(30)) < 0);
  // A negative base under an odd root goes the same way, by symmetry:
  // (-1.5)^(100001/3) is -(1.5^(100001/3)), about -5.85e5869.
  const odd = unwrap(
    powRationalBall(exact(dec("-1.5")), rational(100_001n, 3n), at(30)),
  );
  assert.ok(compare(odd.mid, ZERO) < 0);
  const reference = dec(
    "-5.8523767422543352458002555607345319012304088017943258408245655414718118265907283291040595268234950967370653725809544362078355634997244573020e5869",
  );
  assertContains(odd, reference, "(-1.5)^(100001/3)");
  assert.ok(
    compareFractions(
      radiusUpper(odd.rad),
      multiplyFractions(absoluteFraction(fraction(reference)), tenTo(30)),
    ) < 0,
  );
  // A base straddling zero whose power reaches past the top of the
  // exponent bound, while its values near zero stay within, is
  // unresolved at the bound (D18; stage 4 refused it by its midpoint);
  // one whose power fits is a ball around zero under an odd root.
  assert.deepEqual(
    powRationalBall(
      ball(dec("0.5"), dec("1")),
      rational(10n ** 19n, 3n),
      at(5),
    ),
    { ok: false, error: { kind: "unresolved", edge: "bound" } },
  );
  assert.ok(
    containsZero(
      unwrap(
        powRationalBall(
          ball(dec("0.5"), dec("1")),
          rational(100_001n, 3n),
          at(5),
        ),
      ),
    ),
  );
  // An inexact base under a root stays bounded, as under an integer power.
  const inexact = unwrap(
    powRationalBall(ball(fr(2n), dec("1e-30")), rational(1n, 2n), at(5)),
  );
  assert.ok(!isUnbounded(inexact.rad));
  assertContains(inexact, SQRT2, "sqrt of 2 ± 1e-30");
  const squared = unwrap(
    powRationalBall(ball(fr(2n), dec("1e-30")), rational(2n), at(5)),
  );
  assert.ok(!isUnbounded(squared.rad));
  assert.deepEqual(squared.mid, fr(4n));
});

test("a root the kernel cannot take goes to log space, and a significand below one keeps its digits", () => {
  // A degree past 2^32 (issues #45 and #57): 2^(1/10^20), from Python's
  // decimal module, certified to 32 digits on the first pass.
  const tiny = unwrap(rootBall(exact(fr(2n)), 10n ** 20n, at(32)));
  assertContains(
    tiny,
    dec("1.00000000000000000000693147180559945309419634386527767575199"),
    "2^(1/10^20)",
  );
  assert.ok(certifies(tiny, 32, "halfEven"));
  // The same through a rational power: 3^(1e-30) is one within 2e-30.
  const cube = unwrap(
    powRationalBall(exact(fr(3n)), rational(1n, 10n ** 30n), at(8)),
  );
  assertContains(cube, dec("1.0000000000000000000000000000011"), "3^1e-30");
  assert.ok(compareFractions(radiusUpper(cube.rad), tenTo(15)) < 0);
  // A negative base of odd degree past 2^32 keeps its sign through the
  // negative branch.
  const negative = unwrap(
    powRationalBall(exact(fr(-2n)), rational(1n, 3n ** 700n), at(8)),
  );
  assert.ok(compare(negative.mid, ZERO) < 0);
  assertContains(negative, dec("-1"), "(-2)^(1/3^700)");
  assert.ok(compareFractions(radiusUpper(negative.rad), tenTo(15)) < 0);
  // A ball around zero under such a degree is a ball around zero, its
  // radius the root of the farther end, one within a hair.
  const aroundZero = unwrap(
    powRationalBall(ball(ZERO, dec("1e-23")), rational(1n, 3n ** 700n), at(8)),
  );
  assert.ok(containsZero(aroundZero));
  // A significand below one by more than the working bits: 7^-8000 under the
  // 99999th root converted to zero and was shown as zero within 0.9; in
  // log space it is 0.85583783261454849435… (Python's decimal module).
  const deep = unwrap(
    powRationalBall(exact(fr(1n, 7n ** 8000n)), rational(1n, 99999n), at(20)),
  );
  assertContains(
    deep,
    dec("0.85583783261454849434685915305639491567780083343275"),
    "(7^-8000)^(1/99999)",
  );
  assert.ok(certifies(deep, 20, "halfEven"));
  // A significand below one by less than the working bits is converted at
  // that many more bits, and keeps its digits: 3^-20 under the 1000th
  // root certifies eight digits on the first pass.
  const shallow = unwrap(
    powRationalBall(exact(fr(1n, 3n ** 20n)), rational(1n, 1000n), at(8)),
  );
  assertContains(
    shallow,
    dec("0.978267385729171169176703195292398395448347826364178327482926"),
    "(3^-20)^(1/1000)",
  );
  assert.ok(certifies(shallow, 8, "halfEven"));
  assert.ok(compareFractions(radiusUpper(shallow.rad), tenTo(15)) < 0);
});

test("powLogSpace of an exponent below half an ulp converts it to zero within an ulp, and the power is one within a few ulps", () => {
  // The exponent is far below 2^-significandLimitBits: its fraction could not be
  // formed, and the kernel's door answers it (H.2, issue #53).
  // Since H.15 the classifier answers first: one within twice the bound
  // on `|y ln x|`, a radius far below the working sizes, which the
  // bounds compare and no fraction forms.
  for (const y of ["1e-999999999", "-1e-999999999", "1e-400000"]) {
    const power = unwrap(powLogSpace(exact(fr(2n)), exact(dec(y)), at(8)));
    assert.deepEqual(power.mid, ONE, `2^${y}`);
    assert.ok(compareRadius(power.rad, powerOfTenRadius(-15n)) < 0, y);
    const wide = unwrap(
      powLogSpace(exact(fr(10n)), ball(dec(y), dec("1e-999999999")), at(8)),
    );
    assert.deepEqual(wide.mid, ONE, `10^(${y} ± 1e-999999999)`);
    assert.ok(compareRadius(wide.rad, powerOfTenRadius(-15n)) < 0, y);
  }
});

// ---------------------------------------------------------------------------
// The exponent bound on a logarithm

test("the classifier holds exp, sinh and cosh to the bound by the whole argument, exactly at the edges (D18, H.15)", () => {
  const context = at(8);
  // U = (10^18 + 1) ln 10 = 2302585092994045686.32…, and D = -10^18 ln 10
  // = -2302585092994045684.02…: an exact argument on either side of an
  // edge is decided, by the kernel where the coarse bounds cannot tell.
  const near = (text: string) => classifyExp(exact(dec(text)), context);
  assert.equal(near("2302585092994045686"), "compute");
  assert.equal(near("2302585092994045687"), "overflow");
  assert.equal(near("2302585092994045686.3"), "compute");
  assert.equal(near("2302585092994045686.4"), "overflow");
  assert.equal(near("-2302585092994045684"), "compute");
  assert.equal(near("-2302585092994045685"), "underflow");
  assert.equal(near("-2302585092994045684.01"), "compute");
  assert.equal(near("-2302585092994045684.02"), "underflow");
  assert.equal(near("1e18"), "compute");
  assert.equal(near("1e30"), "overflow");
  assert.equal(near("-1e30"), "underflow");
  // A ball straddling an edge, or wider than the whole band within the
  // bound, is unresolved, however its midpoint lies.
  assert.equal(
    classifyExp(ball(dec("2302585092994045686"), dec("1")), context),
    "unresolved",
  );
  assert.equal(classifyExp(ball(ZERO, dec("1e30")), context), "unresolved");
  assert.equal(
    classifyExp(ball(dec("5"), dec("2e948")), context),
    "unresolved",
  );
  assert.equal(
    classifyExp(ball(dec("1e46"), dec("1e46")), context),
    "unresolved",
  );
  // sinh and cosh: |x| - ln 2 against the top alone, either sign alike.
  const hyper = (text: string) => classifyHyperbolic(exact(dec(text)), context);
  assert.equal(hyper("2302585092994045687"), "compute");
  assert.equal(hyper("-2302585092994045687"), "compute");
  assert.equal(hyper("2302585092994045688"), "overflow");
  assert.equal(hyper("-2302585092994045688"), "overflow");
  assert.equal(hyper("-1e30"), "overflow");
  assert.equal(
    classifyHyperbolic(ball(ZERO, dec("1e30")), context),
    "unresolved",
  );
});

test("the classifier holds a power to the bound by the interval of y ln x (D18, H.15)", () => {
  const context = at(8);
  const kind = (x: Ball, y: Ball) => classifyPower(x, y, context).kind;
  // Coarse: far within, and far past on the side the signs give.
  assert.equal(kind(exact(fr(2n)), exact(dec("1e18"))), "compute");
  assert.equal(kind(exact(fr(2n)), exact(dec("1e19"))), "overflow");
  assert.equal(kind(exact(fr(2n)), exact(dec("-1e19"))), "underflow");
  assert.equal(kind(exact(dec("0.5")), exact(dec("1e19"))), "underflow");
  assert.equal(kind(exact(dec("0.5")), exact(dec("-1e19"))), "overflow");
  // On the kernel, within the coarse slack of the edge: 10^(10^18 + 1)
  // is the top exactly, so an exponent on it is unresolved at any
  // precision, and one a hundredth away is decided.
  assert.equal(
    kind(exact(fr(10n)), exact(dec("1000000000000000000.99"))),
    "compute",
  );
  assert.equal(
    kind(exact(fr(10n)), exact(dec("1000000000000000001"))),
    "unresolved",
  );
  assert.equal(
    kind(exact(fr(10n)), exact(dec("1000000000000000001.01"))),
    "overflow",
  );
  // The bottom edge exactly, `10^-(10^18)`, which the kernel cannot tell
  // from a hair past it (an exact integer exponent never comes here: the
  // exact route forms the power and holds it to the bound itself).
  assert.equal(
    kind(exact(fr(10n)), exact(dec("-1000000000000000000"))),
    "unresolved",
  );
  assert.equal(
    kind(exact(fr(10n)), exact(dec("-1000000000000000000.01"))),
    "underflow",
  );
  // A base near one is bounded by its exact difference from one: the
  // interval of an inexact base of one straddles both edges for sure,
  // whatever the bits the kernel would need (#46's `pow(approx(1),
  // 1e999999999)`), and a tiny difference times a huge exponent is one
  // within twice their product, without the kernel.
  const nearOne = ball(ONE, dec("1e-7"));
  assert.deepEqual(classifyPower(nearOne, exact(dec("1e999999999")), context), {
    kind: "unresolved",
    edge: "bound",
  });
  const tiny = classifyPower(
    ball(ONE, dec("1e-30")),
    exact(dec("1e5")),
    context,
  );
  assert.equal(tiny.kind, "one");
  assert.ok(
    tiny.kind === "one" &&
      compareRadius(tiny.rad, powerOfTenRadius(-24n)) < 0 &&
      compareRadius(tiny.rad, powerOfTenRadius(-25n)) > 0,
  );
  // Where the kernel's decision would need more bits than the significand limit
  // holds: the bound answers where it is at most a half, and the rest is
  // too large.
  const wholeUp = exact(dec("1.000000001e0"));
  assert.equal(kind(wholeUp, exact(dec("1e30"))), "overflow");
  const hair = ball(ONE, dec("1e-999999999"));
  assert.equal(kind(hair, exact(dec("2e999999998"))), "one");
  assert.equal(kind(hair, exact(dec("1e999999999"))), "tooLarge");
  // A base reaching zero is held to the top alone: the values near zero
  // are within, and the top is reached through the upper end; one with a
  // zero midpoint is zero within its radius to the power, from the
  // radius's logarithm, quick for a huge exponent (#62), and unresolved
  // at the bound where that radius reaches the top.
  const zero = ball(ZERO, dec("1e12"));
  const start = performance.now();
  const small = unwrap(powBall(zero, 100000n, context));
  assert.deepEqual(small.mid, ZERO);
  assert.ok(compareRadius(small.rad, powerOfTenRadius(1200000n)) >= 0);
  assert.ok(compareRadius(small.rad, powerOfTenRadius(1200001n)) < 0);
  assert.deepEqual(powBall(zero, 10n ** 10000n, context), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  assert.ok(performance.now() - start < 200, "milliseconds, not a minute");
  const around = ball(dec("0.5"), dec("1"));
  assert.equal(kind(around, exact(dec("1e19"))), "unresolved");
  assert.equal(kind(around, exact(dec("100"))), "compute");
  assert.deepEqual(classifyPower(around, exact(dec("-3")), context), {
    kind: "unresolved",
    edge: ZERO,
  });
  // An exponent straddling zero over a base at the bottom edge reaches
  // past the top and within (the ball sweep's `pow(1e-10^18, 0±1e9)`).
  assert.equal(
    kind(exact(dec(`1e-${E18}`)), ball(ZERO, dec("1e9"))),
    "unresolved",
  );
});

// ---------------------------------------------------------------------------
// Certification

test("certifies when both ends round alike, in the mode", () => {
  const nearest = "halfAwayFromZero";
  // 1.2345 ± 1e-30 straddles the tie of the fourth digit.
  const tie = ball(dec("1.2345"), dec("1e-30"));
  assert.ok(!certifies(tie, 4, nearest));
  assert.ok(!certifies(tie, 4, "halfEven"));
  assert.ok(!certifies(tie, 4, "halfTowardZero"));
  assert.ok(certifies(tie, 4, "floor"));
  assert.ok(certifies(tie, 4, "ceiling"));
  assert.ok(certifies(tie, 4, "towardZero"));
  assert.ok(certifies(tie, 4, "awayFromZero"));
  for (const mode of ROUNDING_MODES) {
    assert.ok(certifies(tie, 3, mode), mode);
    assert.ok(!certifies(tie, 40, mode), mode);
  }
  // At five digits 1.2345 is a cell's centre under the nearest modes and a
  // cell's edge under the directed ones, which the ball straddles.
  for (const mode of [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
  ] as const) {
    assert.ok(certifies(tie, 5, mode), mode);
  }
  for (const mode of [
    "towardZero",
    "awayFromZero",
    "ceiling",
    "floor",
  ] as const) {
    assert.ok(!certifies(tie, 5, mode), mode);
  }
  // A directed mode has its own boundaries: 1.234 ± 1e-30 under floor
  // straddles 1.234 at four digits.
  assert.ok(!certifies(ball(dec("1.234"), dec("1e-30")), 4, "floor"));
  assert.ok(certifies(ball(dec("1.234"), dec("1e-30")), 4, nearest));
  // The carry across a power of ten holds when both ends carry.
  assert.ok(certifies(ball(dec("0.99999"), dec("0.00002")), 3, nearest));
  assert.ok(certifies(ball(dec("9.9999"), dec("0.0002")), 2, nearest));
  assert.ok(!certifies(ball(dec("9.9999"), dec("0.0002")), 5, nearest));
  // Exact balls certify every count; unbounded and zero-straddling none.
  assert.ok(certifies(exact(fr(1n, 3n)), 100, nearest));
  assert.ok(certifies(exact(ZERO), 1, nearest));
  assert.ok(!certifies({ mid: ONE, rad: UNBOUNDED }, 1, nearest));
  assert.ok(!certifies(ball(dec("0.001"), dec("0.002")), 1, nearest));
  assert.ok(!certifies(ball(ZERO, dec("1e-30")), 1, nearest));
});

test("certifies by exponents and leading digits where the ends cannot be formed", () => {
  const nearest = "halfAwayFromZero";
  // A radius that cannot be formed, or aligned with the midpoint: the
  // digit interval decides, erring toward certifying less.
  const far = ball(dec("1.2345678e999999999"), dec("1e999999980"));
  assert.ok(certifies(far, 8, nearest));
  assert.ok(certifies(far, 17, nearest));
  assert.ok(!certifies(far, 20, nearest));
  assert.equal(certifiedDigits(far, 30, nearest), 19);
  const tiny = ball(dec("1.2345678e-999999999"), dec("1e-1000000020"));
  assert.ok(certifies(tiny, 8, nearest));
  assert.equal(certifiedDigits(tiny, 30, nearest), 21);
  // A tie is not certified there either: 1.5e999999999 at one digit.
  assert.ok(
    !certifies(ball(dec("1.5e999999999"), dec("1e999999980")), 1, nearest),
  );
  assert.ok(
    certifies(ball(dec("1.5e999999999"), dec("1e999999980")), 1, "floor"),
  );
  // The radius is formed exactly where it can be, and aligned within the
  // hard bound: a radius of `2^-100000` beside a midpoint of order one.
  const formed = ball(dec("1.5"), fromRational(rational(1n, 2n ** 100000n)));
  assert.ok(!certifies(formed, 1, nearest));
  assert.ok(certifies(formed, 2, nearest));
  assert.ok(certifies(formed, 30000, nearest));
  // The radius cannot be formed beyond `2^16` in its exponent, and the
  // digit interval certifies the digits the radius allows.
  const unformed = ball(dec("1.5"), fromRational(rational(1n, 2n ** 70000n)));
  assert.ok(!certifies(unformed, 1, nearest));
  assert.ok(certifies(unformed, 2, nearest));
  assert.ok(certifies(unformed, 21000, nearest));
  assert.ok(!certifies(unformed, 21100, nearest));
});

test("certifies by the boundary distance wherever the digits beyond the count lie, tightly", () => {
  const nearest = "halfAwayFromZero";
  // sqrt(2) × 1e999999999 at the first pass of a fifty-digit request: the
  // midpoint has seventy digits, its 51st and 52nd are 48, and the radius
  // is 5.7e-60 relative, far below them; fifty digits certify. (The first
  // landing widened a two-digit interval by two units and refused this.)
  const root = ball(
    dec(
      "1.414213562373095048801688724209698078569671875376948073176679737990732e999999999",
    ),
    dec("8e999999939"),
  );
  for (const d of [1, 8, 49, 50, 51, 52, 58]) {
    assert.ok(certifies(root, d, nearest), `${d} digits`);
    assert.ok(certifies(root, d, "floor"), `${d} digits, floor`);
  }
  assert.ok(!certifies(root, 61, nearest));
  assert.equal(certifiedDigits(root, 100, nearest), 59);
  // The digits beyond the count at a boundary: ...500 under a nearest
  // mode and ...000 under a directed one straddle, and a hair off does
  // not, at any radius below the hair.
  const tie = ball(dec("1.2345e999999999"), dec("1e999999980"));
  assert.ok(!certifies(tie, 4, nearest));
  assert.ok(certifies(tie, 4, "floor"));
  assert.ok(certifies(tie, 5, nearest));
  assert.ok(!certifies(tie, 5, "floor"));
  const hair = ball(dec("1.23450000000000001e999999999"), dec("1e999999980"));
  assert.ok(certifies(hair, 4, nearest));
  assert.ok(
    !certifies(
      ball(dec("1.23450000000000001e999999999"), dec("1e999999982")),
      4,
      nearest,
    ),
  );
  // The finer cells below a power of ten: 1.0001e999999999 ± 6e999999996
  // reaches 0.9941e999999999, which rounds to 0.99 at two digits.
  assert.ok(
    !certifies(ball(dec("1.0001e999999999"), dec("6e999999996")), 2, nearest),
  );
  assert.ok(
    certifies(ball(dec("1.0001e999999999"), dec("6e999999996")), 1, nearest),
  );
  assert.ok(
    !certifies(ball(dec("1.0001e999999999"), dec("2e999999995")), 2, "floor"),
  );
  assert.ok(
    certifies(ball(dec("1.0001e999999999"), dec("9e999999994")), 2, "floor"),
  );
  // A carry across a power of ten holds when both ends carry.
  assert.ok(
    certifies(ball(dec("9.9999e999999999"), dec("2e999999996")), 2, nearest),
  );
  assert.ok(
    !certifies(ball(dec("9.9999e999999999"), dec("2e999999996")), 5, nearest),
  );
});

test("certifiedDigits is the largest count that certifies, which is not monotone", () => {
  const nearest = "halfAwayFromZero";
  // [1.246, 1.254] certifies three digits (1.25) but not two (1.2 or 1.3).
  const around = ball(dec("1.25"), dec("0.004"));
  assert.ok(certifies(around, 3, nearest));
  assert.ok(!certifies(around, 2, nearest));
  assert.equal(certifiedDigits(around, 8, nearest), 3);
  assert.equal(certifiedDigits(around, 3, nearest), 3);
  assert.equal(certifiedDigits(around, 2, nearest), 1);
  // A root at forty digits certifies its digits and the guard's.
  const root = unwrap(rootBall(exact(fr(2n)), 2n, at(40)));
  const d = certifiedDigits(root, 100, nearest);
  assert.ok(d >= 47 && d <= 50, `${d}`);
  assert.equal(certifiedDigits(root, 8, nearest), 8);
  // None: a straddling ball, an unbounded one, a tie at the first digit.
  assert.equal(
    certifiedDigits(ball(dec("0.001"), dec("0.002")), 8, nearest),
    0,
  );
  assert.equal(certifiedDigits({ mid: ONE, rad: UNBOUNDED }, 8, nearest), 0);
  assert.equal(certifiedDigits(ball(dec("1.5"), dec("1e-30")), 1, nearest), 0);
  // Every count: an exact value, zero included.
  assert.equal(certifiedDigits(exact(fr(1n, 3n)), 12, nearest), 12);
  assert.equal(certifiedDigits(exact(ZERO), 12, nearest), 12);
  // The scan's starting bound never cuts a count that certifies: over the
  // shared source, the count found is one that certifies and the next one
  // up does not, wherever the answer is below the precision limit.
  const seed = key(2401);
  for (let i = 0; i < 60; i++) {
    const b = randomBall(foldIn(seed, i), 24, 6);
    if (containsZero(b) || isExact(b)) continue;
    const found = certifiedDigits(b, 30, nearest);
    if (found === 0) {
      assert.ok(!certifies(b, 1, nearest));
      continue;
    }
    assert.ok(certifies(b, found, nearest), `${found} certifies`);
    for (let more = found + 1; more <= 30; more++) {
      assert.ok(!certifies(b, more, nearest), `${more} does not`);
    }
  }
});

test("radiusValue forms a radius of the working sizes and not one beyond them", () => {
  assert.deepEqual(radiusValue(ZERO_RADIUS), ZERO);
  assert.deepEqual(radiusValue(radiusAbove(rational(3n, 4n))), fr(3n, 4n));
  assert.equal(radiusValue(UNBOUNDED), undefined);
  assert.notEqual(
    radiusValue(radiusAbove(rational(1n, 2n ** 60000n))),
    undefined,
  );
  assert.equal(radiusValue(radiusAbove(rational(1n, 2n ** 70000n))), undefined);
});

// ---------------------------------------------------------------------------
// Settling

test("settle leaves an exact ball, or a zero midpoint, as it is", () => {
  const third = exact(fr(1n, 3n));
  assert.equal(settled(third, at(8)), third);
  const zero = ball(ZERO, dec("1e-30"));
  assert.equal(settled(zero, at(8)), zero);
  // And an inexact midpoint already on the grid.
  const short = ball(dec("1.5"), dec("1e-30"));
  assert.equal(settled(short, at(8)), short);
});

test("settle rounds an inexact midpoint to the working digits and grows the radius by half a unit", () => {
  // 1/3 ± 1e-30 at eight digits: bitsFor(8) is 59 bits, 18 digits, so
  // the midpoint becomes 0.333333333333333333 and the radius grows by
  // half a unit in the eighteenth digit.
  const context = at(8);
  const digits = workingDigits(context);
  assert.equal(digits, 18);
  const b = ball(fr(1n, 3n), dec("1e-30"));
  const after = settled(b, context);
  assert.ok(!equals(after.mid, b.mid));
  assert.deepEqual(after.mid, dec("0.333333333333333333"));
  const grown = radiusUpper(after.rad);
  assert.ok(compareFractions(grown, radiusUpper(b.rad)) > 0);
  assert.ok(compareFractions(grown, fraction(dec("5.00001e-19"))) <= 0);
  // The midpoint's size is the working precision's, whatever the value's
  // was: a 2,000-digit fraction settles to 18 digits at eight digits, and
  // a huge value keeps its magnitude.
  const long = ball(fr(3n ** 2000n, 2n ** 3100n), dec("1e-40"));
  assert.ok(digitsOf(settled(long, context).mid) <= digits);
  const huge = ball(fr(3n ** 2000n), dec("1"));
  const settledHuge = settled(huge, context);
  assert.ok(digitsOf(settledHuge.mid) <= digits);
  assert.ok(
    compareFractions(
      absoluteFraction(
        subtractFractions(fraction(settledHuge.mid), fraction(huge.mid)),
      ),
      rational(2n ** 3110n),
    ) < 0,
  );
  // And a value with a large exponent stays on its magnitude's grid.
  const far = settled(
    ball(dec("1.23456789012345678901234e999999999"), dec("1e999999970")),
    context,
  );
  assert.deepEqual(far.mid, dec("1.23456789012345679e999999999"));
  // Over the shared source: the settled ball contains the original's ends.
  const seed = key(2501);
  for (let i = 0; i < 60; i++) {
    const original = randomBall(foldIn(seed, i), 40, 12);
    const at3 = at(1 + (i % 3) * 20);
    const s = settled(original, at3);
    if (isExact(original) || isZero(original.mid)) {
      assert.equal(s, original);
      continue;
    }
    for (const x of ends(original)) {
      assertContains(s, x, `settled ${inspect(original.mid)}`);
    }
    // The midpoint has at most the working digits.
    assert.ok(digitsOf(s.mid) <= workingDigits(at3));
  }
});

test("settle in decimal mode rounds every value to the precision in the rounding mode and leaves it exact (D26)", () => {
  const decimal = (
    precision: number,
    rounding: RoundingMode,
  ): NumberContext => ({
    ...at(precision),
    rounding,
    mode: "decimal",
  });
  // An exact value with more than p digits is rounded, and is exact: no
  // radius records the rounding, since in this mode the rounded value is
  // the value (docs/decimal-mode.md). 1200/3937 at eight digits.
  const foot = exact(fr(1200n, 3937n));
  assert.deepEqual(
    settled(foot, decimal(8, "halfAwayFromZero")),
    exact(dec("0.30480061")),
  );
  // A value with p digits or fewer is its own rounding and is returned as
  // it is, as is zero, in every mode.
  for (const mode of ROUNDING_MODES) {
    const context = decimal(8, mode);
    for (const b of [
      exact(fr(12n)),
      exact(dec("12345678")),
      exact(dec("1.5e999999999")),
      exact(ZERO),
    ]) {
      assert.equal(settled(b, context), b, `${mode}: ${inspect(b.mid)}`);
    }
  }
  // The mode governs: 0.125 at two digits, and 2/3 at eight.
  assert.deepEqual(
    settled(exact(dec("0.125")), decimal(2, "halfAwayFromZero")).mid,
    dec("0.13"),
  );
  assert.deepEqual(
    settled(exact(dec("0.125")), decimal(2, "halfEven")).mid,
    dec("0.12"),
  );
  assert.deepEqual(
    settled(exact(fr(2n, 3n)), decimal(8, "halfEven")).mid,
    dec("0.66666667"),
  );
  assert.deepEqual(
    settled(exact(fr(2n, 3n)), decimal(8, "towardZero")).mid,
    dec("0.66666666"),
  );
  assert.deepEqual(
    settled(exact(fr(2n, 3n)), decimal(8, "floor")).mid,
    dec("0.66666666"),
  );
  assert.deepEqual(
    settled(exact(fr(-2n, 3n)), decimal(8, "floor")).mid,
    dec("-0.66666667"),
  );
  // An inexact ball, a built-in's result at a working precision, is
  // rounded exactly when it certifies the digits (D7), and is otherwise
  // the midpoint's rounding, marked uncertified; a ball containing zero
  // that certifies nothing is zero, uncertified ("The ceiling").
  assert.deepEqual(
    settled(ball(dec("1.5"), dec("1e-30")), decimal(8, "halfEven")),
    exact(dec("1.5")),
  );
  assert.deepEqual(
    settled(
      ball(dec("0.30480061"), dec("4e-10")),
      decimal(8, "halfAwayFromZero"),
    ),
    exact(dec("0.30480061")),
  );
  assert.deepEqual(
    settled(ball(dec("1.25"), dec("1e-30")), decimal(2, "halfEven")),
    { ...exact(dec("1.2")), uncertified: true },
  );
  assert.deepEqual(settled(ball(ZERO, dec("1e-30")), decimal(8, "halfEven")), {
    ...exact(ZERO),
    uncertified: true,
  });
  // The flag carries over the rounding of a flagged value.
  const flagged: Ball = { ...exact(fr(2n, 3n)), uncertified: true };
  assert.deepEqual(settled(flagged, decimal(8, "halfEven")), {
    ...exact(dec("0.66666667")),
    uncertified: true,
  });
  // Over the shared source, in each of the seven modes: the result is
  // exact, its midpoint `roundTo` at p digits in the mode where the ball
  // certifies them or is exact, and otherwise the midpoint's rounding,
  // flagged.
  const seed = key(4501);
  for (let i = 0; i < 70; i++) {
    const original = randomBall(foldIn(seed, i), 40, 12);
    const mode = ROUNDING_MODES[i % ROUNDING_MODES.length]!;
    const precision = 1 + (i % 4) * 6;
    const context = decimal(precision, mode);
    const s = settled(original, context);
    const label = `${mode} at ${precision}: ${inspect(original.mid)}`;
    assert.ok(isExact(s), label);
    if (isExact(original) || certifies(original, precision, mode)) {
      assert.equal(s.uncertified, undefined, label);
      if (isZero(original.mid)) {
        assert.equal(s, original, label);
        continue;
      }
      const rounded = roundTo(original.mid, precision, mode);
      assert.deepEqual(s.mid, rounded, label);
      if (equals(rounded, original.mid)) assert.equal(s, original, label);
    } else {
      assert.equal(s.uncertified, true, label);
      assert.deepEqual(
        s.mid,
        containsZero(original) ? ZERO : roundTo(original.mid, precision, mode),
        label,
      );
    }
    assert.ok(isZero(s.mid) || digitsOf(s.mid) <= precision, label);
  }
});

test("settle refuses a rounded midpoint past the bound in decimal mode, and never in exact mode (D17)", () => {
  // At the top: eleven nines at 10^18 round to 1e+(10^18 + 1) at eight
  // digits, which is overflow in decimal mode, where stage 4 let it
  // through; in exact mode the settle rounds toward zero instead and adds
  // a whole unit in the last working digit to the radius.
  const nines = "9".repeat(45);
  const top = ball(dec(`${nines[0]}.${nines.slice(1)}e${E18}`), dec("1e-30"));
  assertRefused(
    step(() => ok(top), decimalAt(8, "halfAwayFromZero")),
    "overflow",
  );
  const digits = workingDigits(at(8));
  const truncated = settled(top, at(8));
  assert.deepEqual(
    truncated.mid,
    dec(`${nines[0]}.${nines.slice(1, digits)}e${E18}`),
  );
  assert.ok(
    compareRadius(
      truncated.rad,
      powerOfTenRadius(MAX_EXPONENT - BigInt(digits) + 1n),
    ) >= 0,
  );
  assert.ok(covers(truncated, top.mid));
  // A directed rounding that does not carry is a value in decimal mode.
  assert.deepEqual(
    settled(top, decimalAt(8, "towardZero")).mid,
    dec(`9.9999999e${E18}`),
  );
  // At the bottom: a third of 10^-(10^18 - 1) is 3.3e-(10^18), within the
  // bound, whose rounding at eight digits stays within it and whose half
  // unit lies past it, where the settle threw (issue #44); a value past
  // the bound is underflow in decimal mode.
  const third = ball(scaledAt(1n, 3n, -(MAX_EXPONENT - 1n)), dec("1e-30"));
  const bottom = settled(third, at(8));
  assert.deepEqual(bottom.mid, roundTo(third.mid, digits, "halfEven"));
  assert.ok(covers(bottom, third.mid));
  const inDecimal = settled(exact(third.mid), decimalAt(8, "halfAwayFromZero"));
  // Its canonical exponent lies past the bound, which the value does not.
  assert.deepEqual(
    inDecimal,
    exact(scaledAt(33333333n, 1n, -(MAX_EXPONENT + 7n))),
  );
  const past = exact(scaledAt(1n, 3n, -MAX_EXPONENT));
  assertRefused(
    step(() => ok(past), decimalAt(8, "halfAwayFromZero")),
    "underflow",
  );
});

test("a product or a quotient with an inexact operand is held to the bound by its whole ball (D18)", () => {
  const two = exact(fr(2n));
  const tenth = exact(dec("0.1"));
  // Every value past the top: overflow. Straddling it: unresolved at the
  // bound. Within it throughout: a value.
  const edge = ball(
    dec(`5e${E18}`),
    dec(`5e${(MAX_EXPONENT - 30n).toString()}`),
  );
  assert.deepEqual(multiplyBalls(edge, two), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  assert.deepEqual(divideBalls(edge, exact(dec("0.5"))), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  const above = ball(
    dec(`1.000000001e${E18}`),
    dec(`1e${(MAX_EXPONENT - 27n).toString()}`),
  );
  assertRefused(multiplyBalls(above, exact(fr(10n))), "overflow");
  const within = ball(
    dec(`9.99999999e${E18}`),
    dec(`1e${(MAX_EXPONENT - 27n).toString()}`),
  );
  assert.ok(multiplyBalls(within, exact(ONE)).ok);
  assert.ok(
    multiplyBalls(ball(dec("4.9"), dec("0.05")), exact(dec(`1e${E18}`))).ok,
  );
  // A midpoint within the bound whose radius reaches the top, and a zero
  // midpoint whose radius does: unresolved at the bound.
  const wide = ball(dec(`5e${E18}`), dec(`6e${E18}`));
  assert.deepEqual(multiplyBalls(wide, exact(ONE)), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  const aroundZero = ball(ZERO, dec("1e9"));
  assert.deepEqual(multiplyBalls(aroundZero, exact(dec(`5e${E18}`))), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  assert.ok(
    multiplyBalls(
      aroundZero,
      exact(dec(`1e${(MAX_EXPONENT - 10n).toString()}`)),
    ).ok,
  );
  // At the bottom: every value past it is underflow; a ball containing
  // zero whose midpoint passes below is zero within |mid| + rad; one
  // straddling the edge is unresolved.
  const tiny: Ball = {
    mid: dec(`1e-${E18}`),
    rad: powerOfTenRadius(-(MAX_EXPONENT + 30n)),
  };
  assertRefused(multiplyBalls(tiny, tenth), "underflow");
  const spanning = ball(dec(`1e-${E18}`), dec(`2e-${E18}`));
  const zero = unwrap(multiplyBalls(spanning, tenth));
  assert.deepEqual(zero.mid, ZERO);
  assert.ok(containsZero(zero));
  // 8e-(10^18) within 5e-(10^18), a tenth of which reaches from
  // 3e-(10^18 + 1) to 1.3e-(10^18): the midpoint past the bound, the ball
  // not throughout.
  const straddling = ball(dec(`8e-${E18}`), dec(`5e-${E18}`));
  assert.deepEqual(multiplyBalls(straddling, tenth), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  // Two exact operands are refused by the value, as the constructor
  // decides it, and a ball of unbounded radius by its midpoint alone.
  assertRefused(multiplyBalls(exact(dec(`9.99e${E18}`)), two), "overflow");
  assertRefused(
    divideBalls(exact(dec(`1e-${E18}`)), exact(fr(7n))),
    "underflow",
  );
  assert.ok(
    multiplyBalls({ mid: dec(`5e${E18}`), rad: UNBOUNDED }, exact(ONE)).ok,
  );
  assertRefused(
    multiplyBalls({ mid: dec(`5e${E18}`), rad: UNBOUNDED }, two),
    "overflow",
  );
});

test("radiusOfMove bounds the distance a rounding moved a midpoint, past the bound included", () => {
  const to = { significand: rational(12345679n), exp: -(MAX_EXPONENT + 7n) };
  const from = {
    significand: rational(1234567891n),
    exp: -(MAX_EXPONENT + 9n),
  };
  const moved = radiusOfMove(to, from);
  // The difference is 9e-(10^18 + 9).
  assert.ok(
    compareRadius(
      moved,
      radiusAboveScaled({
        significand: rational(9n),
        exp: -(MAX_EXPONENT + 9n),
      }),
    ) >= 0,
  );
  assert.ok(compareRadius(moved, powerOfTenRadius(-(MAX_EXPONENT + 8n))) < 0);
  // Within the bound the radius is the exact difference, rounded up.
  assert.deepEqual(
    radiusOfMove(dec("0.30480061"), fr(1200n, 3937n)),
    radiusAbove(
      absoluteFraction(
        subtractFractions(fraction(dec("0.30480061")), rational(1200n, 3937n)),
      ),
    ),
  );
  assert.deepEqual(radiusOfMove(dec("1.5"), dec("1.5")), ZERO_RADIUS);
});

test("position reads a difference past the bottom of the bound against the radius", () => {
  // A ball at the bottom edge, 3.33…e-(10^18) to 29 digits within ten
  // units of its last digit: a point four units away is inside, one
  // fourteen units away on either side is outside, and `subtract` refuses
  // every one of the differences, which lie below 10^-(10^18).
  const exp = -(MAX_EXPONENT + 28n);
  const mid = scaledAt(33333333333333333333333333333n, 1n, exp);
  const b: Ball = { mid, rad: powerOfTenRadius(exp + 1n) };
  assert.equal(
    position(b, scaledAt(33333333333333333333333333329n, 1n, exp)),
    "straddles",
  );
  assert.equal(
    position(b, scaledAt(33333333333333333333333333347n, 1n, exp)),
    "below",
  );
  assert.equal(
    position(b, scaledAt(33333333333333333333333333319n, 1n, exp)),
    "above",
  );
});

test("a sum of two exact operands that cannot be aligned is too large, and in decimal mode the evaluator's rule gives the larger, or its neighbor by the smaller's sign in a directed mode (D26)", () => {
  const decimal = (rounding: RoundingMode): NumberContext => ({
    ...at(8),
    rounding,
    mode: "decimal",
  });
  const huge = exact(dec("1e999999999"));
  const minusOne = negateBall(exact(ONE));
  // The sum itself is too large in either mode, at the significand limit; the
  // evaluator answers it in decimal mode by `decimalSumApart`.
  assertRefused(addBalls(huge, exact(ONE), at(8)), "tooLarge");
  assertRefused(addBalls(huge, exact(ONE), decimal("halfEven")), "tooLarge");
  // In a nearest mode the one lies far below half a unit in the last digit.
  for (const rounding of [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
  ] as const) {
    assert.deepEqual(
      unwrap(decimalSumApart(huge, exact(ONE), decimal(rounding))),
      huge,
      rounding,
    );
    assert.deepEqual(
      unwrap(decimalSumApart(huge, minusOne, decimal(rounding))),
      huge,
      rounding,
    );
  }
  // A directed mode steps to the neighbor on the side the one lies on,
  // in the decade the step lands in.
  const up = exact(dec("1.0000001e999999999"));
  const down = exact(dec("9.9999999e999999998"));
  assert.deepEqual(
    unwrap(decimalSumApart(huge, exact(ONE), decimal("ceiling"))),
    up,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, minusOne, decimal("ceiling"))),
    huge,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, exact(ONE), decimal("floor"))),
    huge,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, minusOne, decimal("floor"))),
    down,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, exact(ONE), decimal("awayFromZero"))),
    up,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, minusOne, decimal("awayFromZero"))),
    huge,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, exact(ONE), decimal("towardZero"))),
    huge,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(huge, minusOne, decimal("towardZero"))),
    down,
  );
  // A negative larger operand: the one is toward zero, the neighbor away.
  const negative = negateBall(huge);
  assert.deepEqual(
    unwrap(decimalSumApart(negative, exact(ONE), decimal("ceiling"))),
    negateBall(down),
  );
  assert.deepEqual(
    unwrap(decimalSumApart(negative, exact(ONE), decimal("floor"))),
    negative,
  );
  assert.deepEqual(
    unwrap(decimalSumApart(negative, minusOne, decimal("awayFromZero"))),
    negateBall(up),
  );
  assert.deepEqual(
    unwrap(decimalSumApart(negative, minusOne, decimal("floor"))),
    negateBall(up),
  );
  // A larger operand of eight digits steps in its own last digit.
  const eight = exact(dec("1.2345678e999999999"));
  assert.deepEqual(
    unwrap(decimalSumApart(eight, exact(ONE), decimal("ceiling"))),
    exact(dec("1.2345679e999999999")),
  );
  // A step past the top of the exponent bound is refused.
  const top = exact(dec("9.9999999e1000000000000000000"));
  assertRefused(
    decimalSumApart(top, exact(ONE), decimal("ceiling")),
    "overflow",
  );
});

test("powBall on an inexact base squares with settling, and is guarded by magnitude", () => {
  const root = unwrap(rootBall(exact(fr(2n)), 2n, at(20)));
  const power = unwrap(powBall(root, 1000n, at(20)));
  // 2^500, within the settled precision: the midpoint has the working
  // digits, not the 1000 × 100 of an exact power.
  assert.ok(
    compareFractions(
      absoluteFraction(
        subtractFractions(fraction(power.mid), rational(2n ** 500n)),
      ),
      rational(2n ** 470n),
    ) < 0,
  );
  assert.ok(digitsOf(power.mid) <= workingDigits(at(20)));
  assert.ok(!isExact(power));
  assertContains(power, rational(2n ** 500n), "sqrt(2)^1000");
  // A negative power inverts, and stays settled.
  const inverse = unwrap(powBall(root, -1000n, at(20)));
  assertContains(inverse, rational(1n, 2n ** 500n), "sqrt(2)^-1000");
  // The guard is the exponent bound (4.9): sqrt(2)^(10^7), about
  // 9.5e1505149 (Python's decimal module), is a value, settled at each
  // squaring, and sqrt(2)^(10^19) is not.
  const tenMillionth = unwrap(powBall(root, 10_000_000n, at(20)));
  assert.ok(
    within(
      tenMillionth.mid,
      dec("9.513052773090665611035594663155066669455118047702e1505149"),
      dec("1e1505130"),
    ),
  );
  assert.ok(certifies(tenMillionth, 15, "halfEven"));
  assertRefused(powBall(root, 10n ** 19n, at(20)), "overflow");
  // Below one the power is past the bound below, and a negative power is
  // past it on the other side.
  assertRefused(powBall(root, -(10n ** 19n), at(20)), "underflow");
  const half = ball(dec("0.5"), dec("1e-30"));
  assertRefused(powBall(half, 10n ** 19n, at(20)), "underflow");
  assertRefused(powBall(half, -(10n ** 19n), at(20)), "overflow");
  // The side is the midpoint's against one, told exactly, however near
  // one: 0.9999999999^(10^30) is about 10^-(4.3 × 10^19).
  const justBelow = ball(dec("0.9999999999"), dec("1e-27"));
  assertRefused(powBall(justBelow, 10n ** 30n, at(20)), "underflow");
  assertRefused(powBall(justBelow, -(10n ** 30n), at(20)), "overflow");
  const justAbove = ball(dec("1.0000000001"), dec("1e-27"));
  assertRefused(powBall(justAbove, 10n ** 30n, at(20)), "overflow");
  // A base near one is guarded by its true magnitude, not by its degree.
  const nearOne = ball(dec("1.0000001"), dec("1e-30"));
  assert.ok(powBall(nearOne, 10_000_000n, at(20)).ok);
  // The exact path is unchanged: an exact base is an exact power, under
  // the significand limit.
  assert.deepEqual(unwrap(powBall(exact(fr(3n)), 4n, at(8))), exact(fr(81n)));
  assertRefused(powBall(exact(fr(3n)), 100_000n, at(8)), "tooLarge");
});
