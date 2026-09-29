import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
  certifiedDigits,
  certifies,
  containsZero,
  divideBalls,
  exact,
  isExact,
  magnitudeAbove,
  multiplyBalls,
  negateBall,
  position,
  powBall,
  powRationalBall,
  radiusValue,
  rootBall,
  settle,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  isUnbounded,
  radiusAbove,
  radiusUpper,
} from "./radius.ts";
import {
  LIMIT_BITS,
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
import { addRadius } from "./radius.ts";
import type { Result } from "./result.ts";
import { ROUNDING_MODES, type RoundingMode } from "./rounding.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  equals,
  fromRational,
  isZero,
  multiply,
  negate,
  pow,
  roundTo,
  subtract,
  type Limit,
  type Scaled,
} from "./scaled.ts";
import { foldIn, key, randomBall, split } from "../testing/random.ts";
import { ball, dec, digitsOf, fr, fraction } from "../testing/scaled.ts";

function unwrap<T, E extends { kind: string }>(result: Result<T, E>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function assertError(result: Result<unknown, BallError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

/** Asserts that `result` failed `tooLarge` at `limit`. */
function assertTooLarge(result: Result<unknown, BallError>, limit: Limit) {
  assert.deepEqual(result, { ok: false, error: { kind: "tooLarge", limit } });
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
  const v = "mant" in value ? fraction(value) : value;
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
  return compare(absolute(unwrap(subtract(a, b, LIMIT_BITS))), bound) < 0;
}

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
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
    exact(unwrap(add(a.mid, b.mid, LIMIT_BITS))),
  );
  assert.deepEqual(
    unwrap(subtractBalls(a, b, context)),
    exact(unwrap(subtract(a.mid, b.mid, LIMIT_BITS))),
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
      exact(unwrap(pow(b.mid, n, LIMIT_BITS))),
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
  // Two exact operands that cannot be aligned within the range limit have
  // an exact sum that cannot be held: `1e999999999 + 1`.
  assertTooLarge(addBalls(huge, exact(ONE), context), "range");
  assertTooLarge(subtractBalls(exact(ONE), huge, context), "range");
  // Within the limit they align, whatever the exponent.
  assert.deepEqual(
    unwrap(addBalls(huge, exact(dec("1e999999000")), context)),
    exact(dec(`1${"0".repeat(998)}1e999999000`)),
  );
  // The exponent bound: a product beyond `10^(10^18)`, and a quotient
  // below `10^-(10^18)`.
  const edge = exact(dec("1e999999999999999999"));
  assertTooLarge(multiplyBalls(edge, exact(dec("1e10"))), "exponentAbove");
  assertTooLarge(
    divideBalls(exact(dec("1e-999999999999999999")), exact(dec("1e10"))),
    "exponentBelow",
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
  const third = settle(ball(fr(1n, 3n), dec("1e-30")), context);
  const sum = unwrap(addBalls(root, third, context));
  assert.ok(
    compare(
      absolute(
        unwrap(
          subtract(
            sum.mid,
            dec("1.7475468957064283821350173307390313"),
            LIMIT_BITS,
          ),
        ),
      ),
      dec("1e-17"),
    ) < 0,
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
          unwrap(powFraction(x, n, LIMIT_BITS)),
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
  const lowPower = powFraction(low, degree, LIMIT_BITS);
  const highPower = powFraction(high, degree, LIMIT_BITS);
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

test("rootBall scales the exponent off and roots the mantissa, whatever the exponent", () => {
  // sqrt(1e999999999): the exponent's odd remainder is folded into the
  // mantissa, and the result is `≈ 3.1622777e+499999999` on the first pass.
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
  // does not fit the range limit, which goes through log space.
  const tiny = unwrap(rootBall(exact(dec("8e-999999999")), 3n, at(8)));
  assert.ok(certifies(tiny, 8, "halfEven"));
  assert.ok(within(tiny.mid, dec("2e-333333333"), dec("1e-333333341")));
  const context = { ...at(8), maxBits: 256 };
  const remainder = unwrap(rootBall(exact(dec("1e101")), 3n, context));
  assert.ok(
    within(
      remainder.mid,
      dec("4.6415888336127788924100763509194465765513e33"),
      dec("1e26"),
    ),
  );
  // A root of a value with a large exponent over a seeded mantissa: the
  // square of the result contains the argument.
  const seed = key(4401);
  for (let i = 0; i < 30; i++) {
    const b = randomBall(foldIn(seed, i), 24, 3);
    if (containsZero(b) || compare(b.mid, ZERO) < 0) continue;
    const scaled: Ball = {
      mid: { mant: b.mid.mant, exp: b.mid.exp + 999999990n },
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
    "tooLarge",
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
  // A base straddling zero whose power passes the exponent bound is too
  // large; one whose power fits is a ball around zero under an odd root.
  assertError(
    powRationalBall(
      ball(dec("0.5"), dec("1")),
      rational(10n ** 19n, 3n),
      at(5),
    ),
    "tooLarge",
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
  // up does not, wherever the answer is below the cap.
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
  assert.equal(settle(third, at(8)), third);
  const zero = ball(ZERO, dec("1e-30"));
  assert.equal(settle(zero, at(8)), zero);
  // And an inexact midpoint already on the grid.
  const short = ball(dec("1.5"), dec("1e-30"));
  assert.equal(settle(short, at(8)), short);
});

test("settle rounds an inexact midpoint to the working digits and grows the radius by half a unit", () => {
  // 1/3 ± 1e-30 at eight digits: bitsFor(8) is 59 bits, 18 digits, so
  // the midpoint becomes 0.333333333333333333 and the radius grows by
  // half a unit in the eighteenth digit.
  const context = at(8);
  const digits = workingDigits(context);
  assert.equal(digits, 18);
  const b = ball(fr(1n, 3n), dec("1e-30"));
  const settled = settle(b, context);
  assert.ok(!equals(settled.mid, b.mid));
  assert.deepEqual(settled.mid, dec("0.333333333333333333"));
  const grown = radiusUpper(settled.rad);
  assert.ok(compareFractions(grown, radiusUpper(b.rad)) > 0);
  assert.ok(compareFractions(grown, fraction(dec("5.00001e-19"))) <= 0);
  // The midpoint's size is the working precision's, whatever the value's
  // was: a 2,000-digit fraction settles to 18 digits at eight digits, and
  // a huge value keeps its magnitude.
  const long = ball(fr(3n ** 2000n, 2n ** 3100n), dec("1e-40"));
  assert.ok(digitsOf(settle(long, context).mid) <= digits);
  const huge = ball(fr(3n ** 2000n), dec("1"));
  const settledHuge = settle(huge, context);
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
  const far = settle(
    ball(dec("1.23456789012345678901234e999999999"), dec("1e999999970")),
    context,
  );
  assert.deepEqual(far.mid, dec("1.23456789012345679e999999999"));
  // Over the shared source: the settled ball contains the original's ends.
  const seed = key(2501);
  for (let i = 0; i < 60; i++) {
    const original = randomBall(foldIn(seed, i), 40, 12);
    const at3 = at(1 + (i % 3) * 20);
    const s = settle(original, at3);
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

test("settle in decimal mode rounds every midpoint to the precision in the rounding mode and grows the radius by the difference", () => {
  const decimal = (
    precision: number,
    rounding: RoundingMode,
  ): NumberContext => ({
    ...at(precision),
    rounding,
    mode: "decimal",
  });
  // An exact value with more than p digits is rounded, exactly the
  // difference going into the radius: 1200/3937 at eight digits.
  const foot = exact(fr(1200n, 3937n));
  const settledFoot = settle(foot, decimal(8, "halfAwayFromZero"));
  assert.deepEqual(settledFoot.mid, dec("0.30480061"));
  const difference = absoluteFraction(
    subtractFractions(fraction(settledFoot.mid), rational(1200n, 3937n)),
  );
  assert.deepEqual(settledFoot.rad, radiusAbove(difference));
  assert.ok(compareFractions(difference, fraction(dec("4e-10"))) < 0);
  // With the difference the ball certifies eight digits, where half a
  // unit would certify seven.
  assert.ok(certifies(settledFoot, 8, "halfAwayFromZero"));
  assert.ok(
    !certifies(ball(dec("0.30480061"), dec("5e-9")), 8, "halfAwayFromZero"),
  );
  // A value with p digits or fewer is its own rounding and stays exact,
  // as does zero, in every mode; an inexact one already on the grid too.
  for (const mode of ROUNDING_MODES) {
    const context = decimal(8, mode);
    for (const b of [
      exact(fr(12n)),
      exact(dec("12345678")),
      exact(dec("1.5e999999999")),
      exact(ZERO),
      ball(ZERO, dec("1e-30")),
      ball(dec("1.5"), dec("1e-30")),
    ]) {
      assert.equal(settle(b, context), b, `${mode}: ${inspect(b.mid)}`);
    }
  }
  // The mode governs: 0.125 at two digits, and 2/3 at eight.
  assert.deepEqual(
    settle(exact(dec("0.125")), decimal(2, "halfAwayFromZero")).mid,
    dec("0.13"),
  );
  assert.deepEqual(
    settle(exact(dec("0.125")), decimal(2, "halfEven")).mid,
    dec("0.12"),
  );
  assert.deepEqual(
    settle(exact(fr(2n, 3n)), decimal(8, "halfEven")).mid,
    dec("0.66666667"),
  );
  assert.deepEqual(
    settle(exact(fr(2n, 3n)), decimal(8, "towardZero")).mid,
    dec("0.66666666"),
  );
  assert.deepEqual(
    settle(exact(fr(2n, 3n)), decimal(8, "floor")).mid,
    dec("0.66666666"),
  );
  assert.deepEqual(
    settle(exact(fr(-2n, 3n)), decimal(8, "floor")).mid,
    dec("-0.66666667"),
  );
  // Over the shared source, in each of the seven modes: the midpoint is
  // `roundTo` at p digits in the mode, the radius grows by exactly the
  // difference, and the original's ends lie within the settled ball.
  const seed = key(4501);
  for (let i = 0; i < 70; i++) {
    const original = randomBall(foldIn(seed, i), 40, 12);
    const mode = ROUNDING_MODES[i % ROUNDING_MODES.length]!;
    const precision = 1 + (i % 4) * 6;
    const context = decimal(precision, mode);
    const s = settle(original, context);
    const label = `${mode} at ${precision}: ${inspect(original.mid)}`;
    if (isZero(original.mid)) {
      assert.equal(s, original, label);
      continue;
    }
    const rounded = roundTo(original.mid, precision, mode);
    assert.deepEqual(s.mid, rounded, label);
    assert.ok(digitsOf(s.mid) <= precision, label);
    if (equals(rounded, original.mid)) {
      assert.equal(s, original, label);
      continue;
    }
    const moved = absoluteFraction(
      subtractFractions(fraction(rounded), fraction(original.mid)),
    );
    assert.deepEqual(s.rad, addRadius(original.rad, radiusAbove(moved)), label);
    if (!isExact(original)) {
      for (const x of ends(original)) assertContains(s, x, label);
    }
  }
});

test("a sum of two exact operands that cannot be aligned is settled and absorbed in decimal mode", () => {
  const context: NumberContext = { ...at(8), mode: "decimal" };
  const huge = exact(dec("1e999999999"));
  const sum = unwrap(addBalls(huge, exact(ONE), context));
  assert.deepEqual(sum.mid, huge.mid);
  // The absorbed one, as the coarse bound on its magnitude.
  const rad = radiusUpper(sum.rad);
  assert.ok(compareFractions(rad, rational(1n)) >= 0);
  assert.ok(compareFractions(rad, rational((1n << 27n) + 1n, 1n << 27n)) < 0);
  assert.ok(certifies(sum, 8, "halfEven"));
  const difference = unwrap(subtractBalls(exact(ONE), huge, context));
  assert.deepEqual(difference.mid, negate(huge.mid));
  // In exact mode the same sum is too large, at the range limit.
  assertTooLarge(addBalls(huge, exact(ONE), at(8)), "range");
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
  assertTooLarge(powBall(root, 10n ** 19n, at(20)), "exponentAbove");
  // Below one the power is past the bound below, and a negative power is
  // past it on the other side.
  assertTooLarge(powBall(root, -(10n ** 19n), at(20)), "exponentBelow");
  const half = ball(dec("0.5"), dec("1e-30"));
  assertTooLarge(powBall(half, 10n ** 19n, at(20)), "exponentBelow");
  assertTooLarge(powBall(half, -(10n ** 19n), at(20)), "exponentAbove");
  // The side is the midpoint's against one, told exactly, however near
  // one: 0.9999999999^(10^30) is about 10^-(4.3 × 10^19).
  const justBelow = ball(dec("0.9999999999"), dec("1e-27"));
  assertTooLarge(powBall(justBelow, 10n ** 30n, at(20)), "exponentBelow");
  assertTooLarge(powBall(justBelow, -(10n ** 30n), at(20)), "exponentAbove");
  const justAbove = ball(dec("1.0000000001"), dec("1e-27"));
  assertTooLarge(powBall(justAbove, 10n ** 30n, at(20)), "exponentAbove");
  // A base near one is guarded by its true magnitude, not by its degree.
  const nearOne = ball(dec("1.0000001"), dec("1e-30"));
  assert.ok(powBall(nearOne, 10_000_000n, at(20)).ok);
  // The exact path is unchanged: an exact base is an exact power, under
  // the range limit.
  assert.deepEqual(unwrap(powBall(exact(fr(3n)), 4n, at(8))), exact(fr(81n)));
  assertTooLarge(powBall(exact(fr(3n)), 100_000n, at(8)), "range");
});
