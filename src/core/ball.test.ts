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
  powBall,
  powRationalBall,
  rootBall,
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
import { DEFAULT_ROUNDING, type NumberContext } from "./context.ts";
import {
  UNBOUNDED,
  ZERO_RADIUS,
  isUnbounded,
  radiusAbove,
  radiusUpper,
} from "./radius.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  isZero,
  multiply,
  negate,
  parseDecimal,
  pow,
  rational,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import type { Result } from "./result.ts";
import { ROUNDING_MODES } from "./rounding.ts";
import { random, randomBall } from "../testing/random.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok);
  return result.value;
}

function unwrap<T>(result: Result<T, BallError>): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

function assertError(result: Result<unknown, BallError>, kind: string) {
  assert.ok(!result.ok, `expected ${kind}, got ${inspect(result)}`);
  assert.equal(result.error.kind, kind);
}

/** A ball with the given midpoint and a radius at or above `rad`. */
function ball(mid: Rational, rad: Rational): Ball {
  return { mid, rad: radiusAbove(rad) };
}

/** The ends of a bounded ball's interval, with its midpoint between them. */
function ends(b: Ball): [Rational, Rational, Rational] {
  const rad = radiusUpper(b.rad);
  return [subtract(b.mid, rad), b.mid, add(b.mid, rad)];
}

/** Asserts that `value` lies within the bounded ball `b`. */
function assertContains(b: Ball, value: Rational, label: string) {
  assert.ok(!isUnbounded(b.rad), `${label}: bounded`);
  assert.ok(
    compare(absolute(subtract(value, b.mid)), radiusUpper(b.rad)) <= 0,
    `${label}: ${toFraction(value)} within ${toFraction(b.mid)} ± ${toFraction(radiusUpper(b.rad))}`,
  );
}

/** A context at `precision` digits, in the default mode. */
function at(precision: number): NumberContext {
  return { precision, rounding: DEFAULT_ROUNDING };
}

/** The seeded balls the property tests are over. */
function seeded(): Ball[] {
  const rand = random(1505);
  return Array.from({ length: 120 }, () => randomBall(rand, 24, 12));
}

// ---------------------------------------------------------------------------
// The type

test("exact balls have radius zero, and contain zero only when zero", () => {
  const two = exact(rational(2n));
  assert.deepEqual(two, { mid: rational(2n), rad: ZERO_RADIUS });
  assert.ok(isExact(two));
  assert.ok(!containsZero(two));
  assert.ok(containsZero(exact(ZERO)));
  assert.ok(!isExact(ball(rational(2n), dec("0.5"))));
  assert.ok(!isExact({ mid: ZERO, rad: UNBOUNDED }));
});

test("containsZero looks at the whole interval", () => {
  assert.ok(containsZero(ball(dec("0.1"), dec("0.1"))));
  assert.ok(containsZero(ball(dec("0.1"), dec("0.2"))));
  assert.ok(containsZero(ball(dec("-0.1"), dec("0.2"))));
  assert.ok(!containsZero(ball(dec("0.1"), dec("0.05"))));
  assert.ok(!containsZero(ball(dec("-0.1"), dec("0.05"))));
  assert.ok(containsZero(ball(ZERO, dec("1e-30"))));
  assert.ok(containsZero({ mid: rational(5n), rad: UNBOUNDED }));
});

test("magnitudeAbove bounds |mid| + rad", () => {
  const b = ball(dec("-2.5"), dec("0.25"));
  const bound = radiusUpper(magnitudeAbove(b));
  assert.ok(compare(bound, dec("2.75")) >= 0);
  assert.ok(compare(bound, dec("2.7500001")) < 0);
  assert.deepEqual(
    magnitudeAbove(exact(rational(3n))),
    radiusAbove(rational(3n)),
  );
  assert.ok(isUnbounded(magnitudeAbove({ mid: ONE, rad: UNBOUNDED })));
});

// ---------------------------------------------------------------------------
// Exact balls agree with rational.ts

test("on exact balls every operation is the rational one, and stays exact", () => {
  const a = exact(dec("2.54"));
  const b = exact(rational(-3n, 7n));
  assert.deepEqual(negateBall(a), exact(negate(a.mid)));
  assert.deepEqual(addBalls(a, b), exact(add(a.mid, b.mid)));
  assert.deepEqual(subtractBalls(a, b), exact(subtract(a.mid, b.mid)));
  assert.deepEqual(multiplyBalls(a, b), exact(multiply(a.mid, b.mid)));
  assert.deepEqual(
    unwrap(divideBalls(a, b)),
    exact(unwrap(divide(a.mid, b.mid))),
  );
  for (const n of [0n, 1n, 3n, -2n]) {
    assert.deepEqual(unwrap(powBall(b, n)), exact(unwrap(pow(b.mid, n))));
  }
  assertError(divideBalls(a, exact(ZERO)), "divisionByZero");
  assertError(powBall(exact(ZERO), -1n), "divisionByZero");
  assertError(powBall(exact(rational(10n)), 100_000n), "tooLarge");
  assert.deepEqual(unwrap(powBall(exact(ZERO), 0n)), exact(ONE));
});

// ---------------------------------------------------------------------------
// Containment

test("each operation's interval contains the exact result over the operands' intervals", () => {
  const balls = seeded();
  const powers = [0n, 1n, 2n, 3n, -1n, -2n];
  for (const [i, a] of balls.entries()) {
    for (const b of [
      balls[(i + 1) % balls.length]!,
      balls[(i * 7 + 3) % balls.length]!,
    ]) {
      const sum = addBalls(a, b);
      const difference = subtractBalls(a, b);
      const product = multiplyBalls(a, b);
      const quotient = divideBalls(a, b);
      if (containsZero(b)) {
        assertError(quotient, isExact(b) ? "divisionByZero" : "unresolved");
      }
      for (const x of ends(a)) {
        for (const y of ends(b)) {
          const label = `${toFraction(x)} and ${toFraction(y)}`;
          assertContains(sum, add(x, y), `sum of ${label}`);
          assertContains(difference, subtract(x, y), `difference of ${label}`);
          assertContains(product, multiply(x, y), `product of ${label}`);
          if (quotient.ok) {
            assertContains(
              quotient.value,
              unwrap(divide(x, y)),
              `quotient of ${label}`,
            );
          }
        }
      }
    }
    for (const n of powers) {
      const power = powBall(a, n);
      if (n < 0n && containsZero(a)) {
        assertError(power, isExact(a) ? "divisionByZero" : "unresolved");
        continue;
      }
      for (const x of ends(a)) {
        assertContains(
          unwrap(power),
          unwrap(pow(x, n)),
          `${toFraction(x)}^${n}`,
        );
      }
    }
    assert.deepEqual(negateBall(negateBall(a)), a);
  }
});

test("the radii are tight where the bound is attained", () => {
  // A sum's radius is the sum of the radii, exactly.
  const a = ball(rational(1n), dec("0.25"));
  const b = ball(rational(2n), dec("0.5"));
  assert.deepEqual(addBalls(a, b).rad, radiusAbove(dec("0.75")));
  // A product's: |a| rb + |b| ra + ra rb = 0.5 + 0.5 + 0.125.
  assert.deepEqual(multiplyBalls(a, b).rad, radiusAbove(dec("1.125")));
  // A quotient's: (|a| rb + |b| ra) / (|b| (|b| - rb)) = (0.5 + 0.5) / (2 × 1.5).
  assert.deepEqual(
    unwrap(divideBalls(a, b)).rad,
    radiusAbove(rational(1n, 3n)),
  );
  // A square's: 2 (|mid| + rad) rad = 2 × 1.25 × 0.25.
  assert.deepEqual(unwrap(powBall(a, 2n)).rad, radiusAbove(dec("0.625")));
});

// ---------------------------------------------------------------------------
// Zero, unbounded, unresolved

test("an exact zero times anything is exact zero", () => {
  const wide = ball(rational(5n), rational(100n));
  assert.deepEqual(multiplyBalls(exact(ZERO), wide), exact(ZERO));
  assert.deepEqual(multiplyBalls(wide, exact(ZERO)), exact(ZERO));
  assert.deepEqual(
    multiplyBalls(exact(ZERO), { mid: ONE, rad: UNBOUNDED }),
    exact(ZERO),
  );
  // Whereas an inexact zero is not.
  const almostZero = ball(ZERO, dec("0.1"));
  assert.ok(!isExact(multiplyBalls(almostZero, exact(rational(2n)))));
  assert.deepEqual(
    multiplyBalls(almostZero, exact(rational(2n))).rad,
    radiusAbove(dec("0.2")),
  );
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
  assertError(powBall(around, -1n), "unresolved");
  assertError(powBall(around, -2n), "unresolved");
  assert.deepEqual(unwrap(powBall(around, 0n)), exact(ONE));
  assert.ok(containsZero(unwrap(powBall(around, 2n))));
});

test("an unbounded radius propagates, and a divisor of unbounded radius divides unless its midpoint is zero", () => {
  const unbounded: Ball = { mid: rational(2n), rad: UNBOUNDED };
  const three = exact(rational(3n));
  assert.deepEqual(addBalls(unbounded, three), {
    mid: rational(5n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(multiplyBalls(unbounded, three), {
    mid: rational(6n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(divideBalls(three, unbounded)), {
    mid: rational(3n, 2n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(divideBalls(unbounded, three)), {
    mid: rational(2n, 3n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, 3n)), {
    mid: rational(8n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, -1n)), {
    mid: rational(1n, 2n),
    rad: UNBOUNDED,
  });
  assert.deepEqual(unwrap(powBall(unbounded, 0n)), exact(ONE));
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
  const lowPower = pow(low, degree);
  const highPower = pow(high, degree);
  assert.ok(lowPower.ok && highPower.ok);
  const below =
    degree % 2n === 0n && low.num < 0n
      ? true
      : compare(lowPower.value, from) <= 0;
  return below && compare(highPower.value, to) >= 0;
}

test("rootBall of an exact argument with a rational root is exact", () => {
  assert.deepEqual(
    unwrap(rootBall(exact(rational(9n, 4n)), 2n, at(8))),
    exact(rational(3n, 2n)),
  );
  assert.deepEqual(
    unwrap(rootBall(exact(rational(-8n)), 3n, at(8))),
    exact(rational(-2n)),
  );
  assert.deepEqual(unwrap(rootBall(exact(ZERO), 2n, at(8))), exact(ZERO));
  assert.deepEqual(
    unwrap(rootBall(exact(rational(7n, 3n)), 1n, at(8))),
    exact(rational(7n, 3n)),
  );
  assertError(rootBall(exact(rational(-4n)), 2n, at(8)), "negativeRadicand");
  assert.throws(() => rootBall(exact(rational(4n)), 0n, at(8)), RangeError);
});

test("rootBall of an exact argument otherwise is the kernel's root at the precision", () => {
  for (const precision of [1, 8, 40]) {
    const root = unwrap(rootBall(exact(rational(2n)), 2n, at(precision)));
    assert.ok(!isExact(root));
    assertContains(root, SQRT2, `sqrt 2 at ${precision}`);
    // The radius is the kernel's: a few ulps at the precision plus the
    // guard, between 10^-(p + 12) and 10^-(p + 8).
    const rad = radiusUpper(root.rad);
    assert.ok(compare(rad, tenTo(precision + 8)) < 0, `${precision}: radius`);
    assert.ok(compare(rad, tenTo(precision + 12)) > 0, `${precision}: radius`);
  }
  // Beyond the reference's digits the midpoint agrees with them.
  const sixty = unwrap(rootBall(exact(rational(2n)), 2n, at(60)));
  assert.ok(compare(absolute(subtract(sixty.mid, SQRT2)), tenTo(59)) < 0);
  // The magnitude is kept, however large or small the argument.
  const large = unwrap(rootBall(exact(dec("2e20")), 2n, at(6)));
  assertContains(large, SQRT_2E20, "sqrt 2e20");
  assert.ok(compare(radiusUpper(large.rad), dec("1e-3")) < 0);
  const tiny = unwrap(rootBall(exact(dec("2e-40")), 2n, at(8)));
  assertContains(tiny, SQRT_2E_40, "sqrt 2e-40");
  assert.ok(compare(radiusUpper(tiny.rad), tenTo(36)) < 0);
  // A negative odd root, and higher degrees, at any degree.
  const negative = unwrap(rootBall(exact(rational(-2n)), 3n, at(8)));
  assertContains(negative, negate(CBRT2), "cbrt -2");
  const twentieth = unwrap(rootBall(exact(rational(2n)), 20n, at(1000)));
  assert.ok(
    compare(absolute(subtract(twentieth.mid, ROOT20_2)), tenTo(59)) < 0,
  );
  assert.ok(compare(radiusUpper(twentieth.rad), tenTo(1008)) < 0);
  const billionth = unwrap(rootBall(exact(rational(2n)), 10n ** 9n, at(40)));
  assertContains(billionth, ROOT_BILLIONTH_2, "2^(1/10^9)");
});

test("rootBall of an inexact argument covers the roots of its interval", () => {
  const root = unwrap(rootBall(ball(rational(2n), dec("1e-30")), 2n, at(10)));
  assert.ok(!isExact(root));
  assertContains(root, SQRT2, "sqrt of 2 ± 1e-30");
  assert.ok(rootsWithin(root, dec("2"), dec("2"), 2n));
  const [from, , to] = ends(ball(rational(2n), dec("1e-30")));
  assert.ok(rootsWithin(root, from, to, 2n));
  // Even of a midpoint whose root is rational: the argument is not exact.
  const four = unwrap(rootBall(ball(rational(4n), dec("1e-30")), 2n, at(10)));
  assert.ok(!isExact(four));
  assertContains(four, rational(2n), "sqrt of 4 ± 1e-30");
  // A wide argument gives a wide root.
  const wide = unwrap(rootBall(ball(rational(4n), rational(2n)), 2n, at(10)));
  assert.ok(rootsWithin(wide, rational(2n), rational(6n), 2n));
  // A negative argument under an even root has no real value.
  assertError(
    rootBall(ball(rational(-4n), dec("0.1")), 2n, at(10)),
    "negativeRadicand",
  );
  const negative = unwrap(
    rootBall(ball(rational(-8n), dec("0.5")), 3n, at(10)),
  );
  assert.ok(rootsWithin(negative, dec("-8.5"), dec("-7.5"), 3n));
  // Containment over the shared source, at every small degree.
  for (const b of seeded()) {
    if (containsZero(b) || b.mid.num < 0n) continue;
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
  assert.ok(rootsWithin(cube, dec("-0.001"), dec("0.003"), 3n));
  // The bound is the root of the farther end, on either side.
  const other = unwrap(rootBall(ball(dec("-0.001"), dec("0.002")), 3n, at(10)));
  assert.ok(rootsWithin(other, dec("-0.003"), dec("0.001"), 3n));
  assert.ok(compare(radiusUpper(other.rad), dec("0.15")) < 0);
  assert.ok(isZero(cube.mid));
});

test("rootBall of an unbounded argument is the root of its midpoint, unbounded", () => {
  const root = unwrap(
    rootBall({ mid: rational(2n), rad: UNBOUNDED }, 2n, at(10)),
  );
  assert.ok(isUnbounded(root.rad));
  assert.ok(compare(absolute(subtract(root.mid, SQRT2)), tenTo(10)) < 0);
  assert.deepEqual(
    unwrap(rootBall({ mid: ZERO, rad: UNBOUNDED }, 3n, at(10))),
    {
      mid: ZERO,
      rad: UNBOUNDED,
    },
  );
  assert.deepEqual(
    unwrap(rootBall({ mid: rational(4n), rad: UNBOUNDED }, 2n, at(10))),
    {
      mid: rational(2n),
      rad: UNBOUNDED,
    },
  );
  assertError(
    rootBall({ mid: rational(-4n), rad: UNBOUNDED }, 2n, at(10)),
    "negativeRadicand",
  );
});

test("powRationalBall composes the power and the root, root last", () => {
  assert.deepEqual(
    unwrap(powRationalBall(exact(rational(4n)), rational(1n, 2n), at(8))),
    exact(rational(2n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(rational(8n)), rational(2n, 3n), at(8))),
    exact(rational(4n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(rational(8n)), rational(-2n, 3n), at(8))),
    exact(rational(1n, 4n)),
  );
  assert.deepEqual(
    unwrap(powRationalBall(exact(rational(2n, 3n)), rational(-2n), at(8))),
    exact(rational(9n, 4n)),
  );
  // 2^(3/2) = 2.828427124746...: the root is taken of 8.
  const power = unwrap(
    powRationalBall(exact(rational(2n)), rational(3n, 2n), at(5)),
  );
  assertContains(power, TWO_TO_3_HALVES, "2^(3/2)");
  assert.ok(compare(radiusUpper(power.rad), tenTo(12)) < 0);
  assertError(
    powRationalBall(exact(rational(-2n)), rational(1n, 2n), at(5)),
    "negativeRadicand",
  );
  assertError(
    powRationalBall(ball(rational(-2n), dec("0.1")), rational(1n, 2n), at(5)),
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
  assertError(
    powRationalBall(exact(rational(10n)), rational(100_000n, 3n), at(5)),
    "tooLarge",
  );
  // An inexact base under a root stays bounded, as under an integer power.
  const inexact = unwrap(
    powRationalBall(ball(rational(2n), dec("1e-30")), rational(1n, 2n), at(5)),
  );
  assert.ok(!isUnbounded(inexact.rad));
  assertContains(inexact, SQRT2, "sqrt of 2 ± 1e-30");
  const squared = unwrap(
    powRationalBall(ball(rational(2n), dec("1e-30")), rational(2n), at(5)),
  );
  assert.ok(!isUnbounded(squared.rad));
  assert.deepEqual(squared.mid, rational(4n));
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
  assert.ok(certifies(exact(rational(1n, 3n)), 100, nearest));
  assert.ok(certifies(exact(ZERO), 1, nearest));
  assert.ok(!certifies({ mid: ONE, rad: UNBOUNDED }, 1, nearest));
  assert.ok(!certifies(ball(dec("0.001"), dec("0.002")), 1, nearest));
  assert.ok(!certifies(ball(ZERO, dec("1e-30")), 1, nearest));
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
  const root = unwrap(rootBall(exact(rational(2n)), 2n, at(40)));
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
  assert.equal(certifiedDigits(exact(rational(1n, 3n)), 12, nearest), 12);
  assert.equal(certifiedDigits(exact(ZERO), 12, nearest), 12);
  // The scan's starting bound never cuts a count that certifies: over the
  // shared source, the count found is one that certifies and the next one
  // up does not, wherever the answer is below the cap.
  const rand = random(2401);
  for (let i = 0; i < 60; i++) {
    const b = randomBall(rand, 24, 6);
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
