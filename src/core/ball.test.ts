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
  subtractBalls,
  type Ball,
  type BallError,
} from "./ball.ts";
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
