import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, type Ball } from "./ball.ts";
import {
  GUARD_BITS,
  absFixed,
  addFixed,
  bitsFor,
  compareFixed,
  divideFixed,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  multiplyFixed,
  shiftFixed,
  subtractFixed,
  toRational,
  type Fixed,
} from "./fixed.ts";
import { UNBOUNDED, ZERO_RADIUS, radiusAbove, radiusUpper } from "./radius.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  divide,
  equals,
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
import { random, randomBall, randomRational } from "../testing/random.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
  assert.ok(result.ok);
  return result.value;
}

/** `2^-bits` as a rational. */
function ulp(bits: number): Rational {
  return rational(1n, 1n << BigInt(bits));
}

/** The ends and the middle of the interval `f` stands for, as rationals. */
function ends(f: Fixed): [Rational, Rational, Rational] {
  const mid = toRational(f);
  const rad = multiply(rational(f.error), ulp(f.bits));
  return [subtract(mid, rad), mid, add(mid, rad)];
}

/** Asserts that `value` lies within the interval of `f`. */
function assertContains(f: Fixed, value: Rational, label: string) {
  const distance = absolute(subtract(value, toRational(f)));
  const bound = multiply(rational(f.error), ulp(f.bits));
  assert.ok(
    compare(distance, bound) <= 0,
    `${label}: ${toFraction(value)} within ${toFraction(toRational(f))} ± ${f.error} ulps at ${f.bits} bits`,
  );
}

/** The seeded rationals the property tests are over: a few digits to 10^±12. */
function seededRationals(): Rational[] {
  const rand = random(2101);
  return Array.from({ length: 80 }, () => randomRational(rand, 24, 12));
}

function seededBalls(): Ball[] {
  const rand = random(2102);
  return Array.from({ length: 80 }, () => randomBall(rand, 24, 12));
}

// ---------------------------------------------------------------------------
// The type and the sizing

test("bitsFor is the bits of the digits plus the guard", () => {
  assert.equal(GUARD_BITS, 32);
  assert.equal(bitsFor(1), 4 + 32);
  assert.equal(bitsFor(8), 27 + 32);
  assert.equal(bitsFor(40), 133 + 32);
  assert.equal(bitsFor(1000), 3322 + 32);
  assert.throws(() => bitsFor(0), RangeError);
  assert.throws(() => bitsFor(1.5), RangeError);
});

test("fixedFromRational rounds to nearest, with error 1, or 0 when exact", () => {
  assert.deepEqual(fixedFromRational(rational(3n, 4n), 4), {
    value: 12n,
    error: 0n,
    bits: 4,
  });
  assert.deepEqual(fixedFromRational(rational(1n, 3n), 4), {
    value: 5n,
    error: 1n,
    bits: 4,
  });
  assert.deepEqual(fixedFromRational(rational(-1n, 3n), 4), {
    value: -5n,
    error: 1n,
    bits: 4,
  });
  assert.deepEqual(fixedFromRational(rational(7n), 0), {
    value: 7n,
    error: 0n,
    bits: 0,
  });
  assert.deepEqual(fixedFromRational(ZERO, 100), {
    value: 0n,
    error: 0n,
    bits: 100,
  });
  for (const r of seededRationals()) {
    const f = fixedFromRational(r, 100);
    assertContains(f, r, `from ${toFraction(r)}`);
    // Within half an ulp, in fact.
    const distance = absolute(subtract(r, toRational(f)));
    assert.ok(compare(distance, rational(1n, 1n << 101n)) <= 0);
    assert.equal(f.error, equals(toRational(f), r) ? 0n : 1n);
  }
  assert.throws(() => fixedFromRational(ONE, -1), RangeError);
  assert.throws(() => fixedFromRational(ONE, 1.5), RangeError);
});

test("fixedFromBall adds the radius in ulps, rounded up", () => {
  const b: Ball = { mid: rational(1n, 2n), rad: radiusAbove(dec("0.3")) };
  const f = fixedFromBall(b, 4);
  assert.equal(f.value, 8n);
  // 0.3 is 4.8 sixteenths, rounded up to a radius and then to 5 ulps.
  assert.equal(f.error, 5n);
  // A radius far below an ulp still counts as one.
  const tiny: Ball = { mid: ONE, rad: radiusAbove(dec("1e-300")) };
  assert.deepEqual(fixedFromBall(tiny, 10), {
    value: 1024n,
    error: 1n,
    bits: 10,
  });
  // An exact ball is exact.
  assert.deepEqual(fixedFromBall(exact(rational(5n, 8n)), 3), {
    value: 5n,
    error: 0n,
    bits: 3,
  });
  for (const ball of seededBalls()) {
    const g = fixedFromBall(ball, 96);
    const rad = radiusUpper(ball.rad);
    for (const x of [subtract(ball.mid, rad), ball.mid, add(ball.mid, rad)]) {
      assertContains(g, x, `from ball ${toFraction(ball.mid)}`);
    }
  }
  assert.throws(
    () => fixedFromBall({ mid: ONE, rad: UNBOUNDED }, 8),
    RangeError,
  );
});

test("fixedToBall hands back the dyadic midpoint and the error as a radius", () => {
  const f: Fixed = { value: 12n, error: 0n, bits: 3 };
  assert.deepEqual(fixedToBall(f), exact(rational(3n, 2n)));
  const g: Fixed = { value: -5n, error: 3n, bits: 4 };
  assert.deepEqual(fixedToBall(g), {
    mid: rational(-5n, 16n),
    rad: radiusAbove(rational(3n, 16n)),
  });
  assert.deepEqual(
    fixedToBall({ value: 0n, error: 0n, bits: 50 }),
    exact(ZERO),
  );
  assert.deepEqual(fixedToBall({ value: 0n, error: 2n, bits: 1 }), {
    mid: ZERO,
    rad: radiusAbove(ONE),
  });
  // Lowest terms without a gcd: the trailing zeros cancel.
  assert.deepEqual(
    toRational({ value: 96n, error: 0n, bits: 5 }),
    rational(3n),
  );
  assert.deepEqual(
    toRational({ value: 96n, error: 0n, bits: 7 }),
    rational(3n, 4n),
  );
  assert.equal(fixedToBall({ value: 7n, error: 0n, bits: 2 }).rad, ZERO_RADIUS);
  // The round trip through a ball contains the ball.
  for (const ball of seededBalls()) {
    const back = fixedToBall(fixedFromBall(ball, 96));
    const rad = radiusUpper(ball.rad);
    const backRad = radiusUpper(back.rad);
    for (const x of [subtract(ball.mid, rad), add(ball.mid, rad)]) {
      assert.ok(
        compare(absolute(subtract(x, back.mid)), backRad) <= 0,
        `round trip of ${toFraction(ball.mid)}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Containment

test("each operation's interval contains the exact result over the operands' intervals", () => {
  const rationals = seededRationals();
  const balls = seededBalls();
  // Operands of unequal bits, so that the alignment is exercised too.
  const operands: Fixed[] = [
    ...rationals.map((r, i) => fixedFromRational(r, 64 + (i % 3) * 8)),
    ...balls.map((b, i) => fixedFromBall(b, 64 + (i % 5) * 4)),
  ];
  for (const [i, a] of operands.entries()) {
    for (const b of [
      operands[(i + 1) % operands.length]!,
      operands[(i * 11 + 5) % operands.length]!,
    ]) {
      const sum = addFixed(a, b);
      const difference = subtractFixed(a, b);
      const product = multiplyFixed(a, b);
      const divisorExcludesZero =
        b.value - b.error > 0n || b.value + b.error < 0n;
      const quotient = divisorExcludesZero ? divideFixed(a, b) : undefined;
      if (!divisorExcludesZero) {
        assert.throws(() => divideFixed(a, b), RangeError);
      }
      assert.equal(sum.bits, Math.max(a.bits, b.bits));
      for (const x of ends(a)) {
        for (const y of ends(b)) {
          const label = `${toFraction(x)} and ${toFraction(y)}`;
          assertContains(sum, add(x, y), `sum of ${label}`);
          assertContains(difference, subtract(x, y), `difference of ${label}`);
          assertContains(product, multiply(x, y), `product of ${label}`);
          if (quotient !== undefined) {
            const exactQuotient = divide(x, y);
            assert.ok(exactQuotient.ok);
            assertContains(
              quotient,
              exactQuotient.value,
              `quotient of ${label}`,
            );
          }
        }
      }
    }
  }
});

test("the error rules are tight where the bound is attained", () => {
  const a: Fixed = { value: 16n, error: 2n, bits: 4 }; // 1 ± 1/8
  const b: Fixed = { value: 32n, error: 4n, bits: 4 }; // 2 ± 1/4
  assert.deepEqual(addFixed(a, b), { value: 48n, error: 6n, bits: 4 });
  assert.deepEqual(subtractFixed(a, b), { value: -16n, error: 6n, bits: 4 });
  // |a| eb + |b| ea + ea eb = 64 + 64 + 8 = 136 ulps², over 16 = 8.5 → 9;
  // the product 512 >> 4 = 32 is exact, so nothing is added for the shift.
  assert.deepEqual(multiplyFixed(a, b), { value: 32n, error: 9n, bits: 4 });
  // (|a| eb + |b| ea) / (|b| (|b| - eb)) = 128 / (32 × 28) ulps of 2^-4,
  // scaled by 16: 2048 / 896 = 2.28... → 3; the quotient 8 is exact.
  assert.deepEqual(divideFixed(a, b), { value: 8n, error: 3n, bits: 4 });
  // An inexact shift or truncation adds one.
  const c: Fixed = { value: 3n, error: 0n, bits: 1 }; // 1.5 exactly
  assert.deepEqual(multiplyFixed(c, c), { value: 4n, error: 1n, bits: 1 });
  assert.deepEqual(divideFixed({ value: 2n, error: 0n, bits: 1 }, c), {
    value: 1n,
    error: 1n,
    bits: 1,
  });
  // Exact operands give exact results where nothing is discarded.
  const two: Fixed = { value: 8n, error: 0n, bits: 2 };
  assert.deepEqual(multiplyFixed(two, two), { value: 16n, error: 0n, bits: 2 });
  assert.deepEqual(divideFixed(two, two), { value: 4n, error: 0n, bits: 2 });
});

test("operands of different bits are aligned to the larger, exactly", () => {
  const a: Fixed = { value: 3n, error: 1n, bits: 1 }; // 1.5 ± 0.5
  const b: Fixed = { value: 5n, error: 0n, bits: 3 }; // 0.625
  assert.deepEqual(addFixed(a, b), { value: 17n, error: 4n, bits: 3 });
  assert.deepEqual(addFixed(b, a), { value: 17n, error: 4n, bits: 3 });
  assert.deepEqual(subtractFixed(b, a), { value: -7n, error: 4n, bits: 3 });
});

// ---------------------------------------------------------------------------
// Shift, abs, compare

test("shiftFixed multiplies by a power of two by moving the binary point", () => {
  const f: Fixed = { value: 5n, error: 1n, bits: 4 };
  assert.deepEqual(shiftFixed(f, 3), { value: 5n, error: 1n, bits: 1 });
  assert.deepEqual(shiftFixed(f, -6), { value: 5n, error: 1n, bits: 10 });
  assert.deepEqual(shiftFixed(f, 4), { value: 5n, error: 1n, bits: 0 });
  // Beyond the fraction bits the value and the error shift up instead.
  assert.deepEqual(shiftFixed(f, 6), { value: 20n, error: 4n, bits: 0 });
  for (const k of [-70, -3, 0, 2, 4, 9, 70]) {
    const shifted = shiftFixed(f, k);
    const factor = pow(rational(2n), BigInt(k));
    assert.ok(factor.ok);
    assert.ok(
      equals(toRational(shifted), multiply(toRational(f), factor.value)),
    );
    assert.ok(
      equals(
        multiply(rational(shifted.error), ulp(shifted.bits)),
        multiply(multiply(rational(f.error), ulp(f.bits)), factor.value),
      ),
    );
  }
  assert.throws(() => shiftFixed(f, 0.5), RangeError);
});

test("absFixed keeps the error", () => {
  assert.deepEqual(absFixed({ value: -5n, error: 2n, bits: 3 }), {
    value: 5n,
    error: 2n,
    bits: 3,
  });
  assert.deepEqual(absFixed({ value: 5n, error: 2n, bits: 3 }), {
    value: 5n,
    error: 2n,
    bits: 3,
  });
  assert.deepEqual(absFixed({ value: 0n, error: 2n, bits: 3 }), {
    value: 0n,
    error: 2n,
    bits: 3,
  });
});

test("compareFixed decides only where the intervals allow it", () => {
  const one: Fixed = { value: 16n, error: 0n, bits: 4 };
  const two: Fixed = { value: 32n, error: 0n, bits: 4 };
  assert.equal(compareFixed(one, two), -1);
  assert.equal(compareFixed(two, one), 1);
  assert.equal(compareFixed(one, one), 0);
  assert.equal(compareFixed(one, { value: 4n, error: 0n, bits: 2 }), 0);
  // Overlapping intervals are undecided, exact equality of values included.
  const wide: Fixed = { value: 16n, error: 3n, bits: 4 };
  assert.equal(compareFixed(wide, one), undefined);
  assert.equal(
    compareFixed(wide, { value: 18n, error: 0n, bits: 4 }),
    undefined,
  );
  assert.equal(compareFixed(wide, { value: 20n, error: 0n, bits: 4 }), -1);
  assert.equal(compareFixed(wide, { value: 12n, error: 0n, bits: 4 }), 1);
  // Touching intervals are undecided too.
  assert.equal(
    compareFixed(wide, { value: 19n, error: 0n, bits: 4 }),
    undefined,
  );
  // The comparison agrees with the rational order where it decides.
  const rand = random(2103);
  for (let i = 0; i < 60; i++) {
    const a = fixedFromBall(randomBall(rand, 16, 3), 40);
    const b = fixedFromBall(randomBall(rand, 16, 3), 40);
    const decided = compareFixed(a, b);
    if (decided === undefined) continue;
    const [aLow, , aHigh] = ends(a);
    const [bLow, , bHigh] = ends(b);
    if (decided === -1) assert.ok(compare(aHigh, bLow) < 0);
    if (decided === 1) assert.ok(compare(aLow, bHigh) > 0);
    if (decided === 0) assert.ok(equals(toRational(a), toRational(b)));
  }
});

test("a zero value is a value like any other", () => {
  const zero: Fixed = { value: 0n, error: 1n, bits: 8 };
  const one: Fixed = { value: 256n, error: 0n, bits: 8 };
  assert.deepEqual(multiplyFixed(zero, one), { value: 0n, error: 1n, bits: 8 });
  assert.deepEqual(addFixed(zero, one), { value: 256n, error: 1n, bits: 8 });
  assert.ok(isZero(toRational(zero)));
  assert.deepEqual(negate(toRational(one)), rational(-1n));
});
