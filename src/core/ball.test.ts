import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import {
  addBalls,
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

/** sqrt(2) to sixty digits, from a reference table. */
const SQRT2 = dec(
  "1.41421356237309504880168872420969807856967187537694807317667974",
);

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
});

test("rootBall of an exact argument otherwise has a radius of one unit in the last digit", () => {
  for (const precision of [1, 8, 40, 60]) {
    const root = unwrap(rootBall(exact(rational(2n)), 2n, at(precision)));
    assert.ok(!isExact(root));
    // The midpoint is the truncation, and the radius is 10^(1 - precision)
    // for a root in [1, 10).
    const unit =
      precision === 1 ? ONE : rational(1n, 10n ** BigInt(precision - 1));
    assert.deepEqual(root.rad, radiusAbove(unit));
    assert.ok(compare(root.mid, SQRT2) <= 0, "truncated below");
    assertContains(root, SQRT2, `sqrt 2 at ${precision}`);
  }
  // The unit follows the root's exponent: sqrt(2e20) at 6 digits is
  // 1.41421e10, and its last digit is 10^5.
  const large = unwrap(rootBall(exact(dec("2e20")), 2n, at(6)));
  assert.deepEqual(large.mid, dec("1.41421e10"));
  assert.deepEqual(large.rad, radiusAbove(dec("1e5")));
  // A negative odd root is bounded the same way.
  const negative = unwrap(rootBall(exact(rational(-2n)), 3n, at(6)));
  assert.deepEqual(negative.mid, dec("-1.25992"));
  assert.deepEqual(negative.rad, radiusAbove(dec("1e-5")));
  assertError(rootBall(exact(rational(2n)), 10n ** 9n, at(40)), "tooLarge");
});

test("rootBall of an inexact argument is the truncated root of the midpoint, unbounded", () => {
  const root = unwrap(rootBall(ball(rational(2n), dec("1e-30")), 2n, at(10)));
  assert.deepEqual(root, { mid: dec("1.414213562"), rad: UNBOUNDED });
  // Even of a midpoint whose root is rational.
  const four = unwrap(rootBall(ball(rational(4n), dec("1e-30")), 2n, at(10)));
  assert.deepEqual(four, { mid: rational(2n), rad: UNBOUNDED });
  assertError(
    rootBall(ball(rational(-4n), dec("0.1")), 2n, at(10)),
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
  // 2^(3/2) = 2.828427124746...: the root is taken of 8, and the radius is
  // one unit in the fifth digit.
  const power = unwrap(
    powRationalBall(exact(rational(2n)), rational(3n, 2n), at(5)),
  );
  assert.deepEqual(power.mid, dec("2.8284"));
  assert.deepEqual(power.rad, radiusAbove(dec("1e-4")));
  assertError(
    powRationalBall(exact(rational(-2n)), rational(1n, 2n), at(5)),
    "negativeRadicand",
  );
  assertError(
    powRationalBall(exact(ZERO), rational(-1n, 2n), at(5)),
    "divisionByZero",
  );
  assertError(
    powRationalBall(exact(rational(10n)), rational(100_000n, 3n), at(5)),
    "tooLarge",
  );
  // An inexact base under a root is unbounded.
  const inexact = unwrap(
    powRationalBall(ball(rational(2n), dec("1e-30")), rational(1n, 2n), at(5)),
  );
  assert.ok(isUnbounded(inexact.rad));
  // Under an integer power it stays bounded.
  const squared = unwrap(
    powRationalBall(ball(rational(2n), dec("1e-30")), rational(2n), at(5)),
  );
  assert.ok(!isUnbounded(squared.rad));
  assert.deepEqual(squared.mid, rational(4n));
});
