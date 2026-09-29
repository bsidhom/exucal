import assert from "node:assert/strict";
import { test } from "node:test";
import { exact, isExact, type Ball } from "./ball.ts";
import {
  GUARD_BITS,
  absFixed,
  addFixed,
  bitsFor,
  compareFixed,
  divideFixed,
  fixedFromBall,
  fixedFromRational,
  fixedFromScaled,
  fixedToBall,
  fixedToScaled,
  multiplyFixed,
  rootFixed,
  shiftFixed,
  sqrtFixed,
  subtractFixed,
  toRational,
  truncateFixed,
  type Fixed,
} from "./fixed.ts";
import { UNBOUNDED, radiusAbove, radiusUpper } from "./radius.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  bitLength,
  compare,
  divide,
  equals,
  isZero,
  multiply,
  negate,
  pow,
  rational,
  subtract,
  toFraction,
  type Rational,
  LIMIT_BITS,
} from "./rational.ts";
import { digitsFor } from "./rounding.ts";
import {
  ONE as ONE_SCALED,
  ZERO as ZERO_SCALED,
  decimalExponent,
  fromRational,
  roundTo,
  scaled,
  type Scaled,
} from "./scaled.ts";
import {
  between,
  foldIn,
  key,
  randomBall,
  randomBigInt,
  randomRational,
  split,
  uniform,
} from "../testing/random.ts";
import {
  ball,
  dec as decimal,
  digitsOf,
  fr,
  fraction,
} from "../testing/scaled.ts";

/** The decimal literal `text` as the fraction it denotes. */
function dec(text: string): Rational {
  return fraction(decimal(text));
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

/**
 * The ball of `f` at two digits more than its significant bits are worth,
 * so that the rounding onto the decimal grid, half a unit in the last
 * digit added to the radius, stays under a tenth of an ulp and the
 * tolerances below measure the kernel alone; a built-in takes a result
 * out at `workingDigits` instead, and the tests of `fixedToBall` pass the
 * digits themselves.
 */
function toBall(f: Fixed): Ball {
  const magnitude = f.value < 0n ? -f.value : f.value;
  return fixedToBall(f, digitsFor(Math.max(1, bitLength(magnitude))) + 2);
}

/**
 * Asserts that the radius of `b` is at or above `bound` and within `2^-25`
 * relative above it: the radius type's rounding up, on each part and on
 * the sum.
 */
function assertRadiusAbove(b: Ball, bound: Rational, label: string) {
  const rad = radiusUpper(b.rad);
  assert.ok(
    compare(rad, bound) >= 0,
    `${label}: radius ${toFraction(rad)} at or above ${toFraction(bound)}`,
  );
  assert.ok(
    compare(rad, multiply(bound, rational((1n << 25n) + 1n, 1n << 25n))) < 0,
    `${label}: radius ${toFraction(rad)} within 2^-25 above ${toFraction(bound)}`,
  );
}

/** Half a unit in the last of `digits` significant digits of the non-zero `s`. */
function halfUnit(s: Scaled, digits: number): Rational {
  const half = scaled(rational(5n), decimalExponent(s) - BigInt(digits));
  assert.ok(half.ok);
  return fraction(half.value);
}

/** The seeded rationals the property tests are over: a few digits to 10^±12. */
function seededRationals(): Rational[] {
  return split(key(2101), 80).map((k) => randomRational(k, 24, 12));
}

function seededBalls(): Ball[] {
  return split(key(2102), 80).map((k) => randomBall(k, 24, 12));
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

test("fixedFromScaled converts the fraction the value denotes, and refuses one whose power of ten cannot be formed", () => {
  assert.deepEqual(fixedFromScaled(decimal("0.75"), 4), {
    value: 12n,
    error: 0n,
    bits: 4,
  });
  assert.deepEqual(fixedFromScaled(decimal("1.5e3"), 0), {
    value: 1500n,
    error: 0n,
    bits: 0,
  });
  // -0.1 is -1.6 sixteenths, rounded to -2 with the rounding counted.
  assert.deepEqual(fixedFromScaled(decimal("-1e-1"), 4), {
    value: -2n,
    error: 1n,
    bits: 4,
  });
  assert.deepEqual(fixedFromScaled(ZERO_SCALED, 100), {
    value: 0n,
    error: 0n,
    bits: 100,
  });
  // On seeded values of moderate exponent it is `fixedFromRational` of the fraction.
  const root = key(2105);
  for (let i = 0; i < 80; i++) {
    const r = randomRational(foldIn(foldIn(root, i), 0), 24, 12);
    assert.deepEqual(
      fixedFromScaled(fromRational(r), 100),
      fixedFromRational(r, 100),
    );
    // With a power of ten of its own beside the fraction's.
    const s = scaled(r, BigInt(between(foldIn(foldIn(root, i), 1), -40, 40)));
    assert.ok(s.ok);
    assert.deepEqual(
      fixedFromScaled(s.value, 100),
      fixedFromRational(fraction(s.value), 100),
    );
  }
  // A nonzero value below half an ulp is zero within one ulp, what the
  // rounding gives it, whatever its exponent; one at or above half an ulp
  // is rounded as the fraction is. At 8 bits half an ulp is 1/512.
  for (const text of ["1e-999999999", "-1e-999999999", "1e-400000", "0.0019"]) {
    assert.deepEqual(
      fixedFromScaled(decimal(text), 8),
      { value: 0n, error: 1n, bits: 8 },
      text,
    );
  }
  assert.deepEqual(fixedFromScaled(decimal("0.002"), 8), {
    value: 1n,
    error: 1n,
    bits: 8,
  });
  assert.deepEqual(
    fixedFromScaled(decimal("0.001953125"), 8),
    fixedFromRational(rational(1n, 512n), 8),
  );
  assert.deepEqual(fixedFromScaled(decimal("-0.0021"), 8), {
    value: -1n,
    error: 1n,
    bits: 8,
  });
  // A power of ten the hard bound cannot hold, but four times it can, is
  // formed: 1e-400000 at 1,400,000 bits is 2^(1400000 - 1328771.24...),
  // an integer of 71,229 bits, rounded.
  const deep = fixedFromScaled(decimal("1e-400000"), 1400000);
  assert.equal(deep.bits, 1400000);
  assert.equal(bitLength(deep.value), 71229);
  assert.equal(deep.error, 1n);
  // A power of ten beyond four times the hard bound is a precondition failure.
  assert.throws(() => fixedFromScaled(decimal("1e999999999"), 8), RangeError);
  assert.throws(() => fixedFromScaled(ONE_SCALED, -1), RangeError);
});

test("fixedFromBall adds the radius in ulps, rounded up", () => {
  const b = ball(fr(1n, 2n), decimal("0.3"));
  const f = fixedFromBall(b, 4);
  assert.equal(f.value, 8n);
  // 0.3 is 4.8 sixteenths, rounded up to a radius and then to 5 ulps.
  assert.equal(f.error, 5n);
  // A midpoint with a power of ten: 2.5e-3 is 163.84 units of 2^-16,
  // rounded to 164 with the rounding counted, and 1e-4 is 6.55 units,
  // rounded up to 7.
  assert.deepEqual(
    fixedFromBall(ball(decimal("2.5e-3"), decimal("1e-4")), 16),
    {
      value: 164n,
      error: 8n,
      bits: 16,
    },
  );
  // A radius far below an ulp still counts as one.
  const tiny = ball(ONE_SCALED, decimal("1e-300"));
  assert.deepEqual(fixedFromBall(tiny, 10), {
    value: 1024n,
    error: 1n,
    bits: 10,
  });
  // An exact ball is exact.
  assert.deepEqual(fixedFromBall(exact(fr(5n, 8n)), 3), {
    value: 5n,
    error: 0n,
    bits: 3,
  });
  for (const ball of seededBalls()) {
    const g = fixedFromBall(ball, 96);
    const rad = radiusUpper(ball.rad);
    const mid = fraction(ball.mid);
    for (const x of [subtract(mid, rad), mid, add(mid, rad)]) {
      assertContains(g, x, `from ball ${toFraction(mid)}`);
    }
  }
  assert.throws(
    () => fixedFromBall({ mid: ONE_SCALED, rad: UNBOUNDED }, 8),
    RangeError,
  );
  // A midpoint whose power of ten cannot be formed is refused as `fixedFromScaled` refuses it.
  assert.throws(
    () => fixedFromBall(ball(decimal("1e999999999"), ONE_SCALED), 8),
    RangeError,
  );
});

test("fixedToScaled rounds the dyadic to nearest at the digits, halfEven, and finds the exponent next to a power of ten", () => {
  // A value on the grid is itself, at any digits that hold it.
  const threeHalves: Fixed = { value: 12n, error: 0n, bits: 3 };
  assert.deepEqual(fixedToScaled(threeHalves, 8), decimal("1.5"));
  assert.deepEqual(fixedToScaled(threeHalves, 2), decimal("1.5"));
  assert.deepEqual(
    fixedToScaled({ value: -12n, error: 0n, bits: 3 }, 8),
    decimal("-1.5"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 1000n, error: 0n, bits: 0 }, 1),
    decimal("1e3"),
  );
  // The error plays no part in the midpoint.
  assert.deepEqual(
    fixedToScaled({ value: 1000n, error: 7n, bits: 0 }, 1),
    decimal("1e3"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 123456789n, error: 0n, bits: 0 }, 3),
    decimal("1.23e8"),
  );
  // Ties, all dyadic here, go to even: 1.5 → 2, 2.5 → 2, 3.5 → 4, -2.5 →
  // -2, 0.125 → 0.12, 0.375 → 0.38, 125 → 120, 135 → 140.
  assert.deepEqual(fixedToScaled(threeHalves, 1), fr(2n));
  assert.deepEqual(fixedToScaled({ value: 5n, error: 0n, bits: 1 }, 1), fr(2n));
  assert.deepEqual(fixedToScaled({ value: 7n, error: 0n, bits: 1 }, 1), fr(4n));
  assert.deepEqual(
    fixedToScaled({ value: -5n, error: 0n, bits: 1 }, 1),
    fr(-2n),
  );
  assert.deepEqual(
    fixedToScaled({ value: 1n, error: 0n, bits: 3 }, 2),
    decimal("0.12"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 3n, error: 0n, bits: 3 }, 2),
    decimal("0.38"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 125n, error: 0n, bits: 0 }, 2),
    decimal("1.2e2"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 135n, error: 0n, bits: 0 }, 2),
    decimal("1.4e2"),
  );
  // Just below a power of ten the exponent estimated from the bit length
  // is one too low, and the rounding may carry across the power: with its
  // neighbours on either side.
  const at = (text: string, bits: number) =>
    fixedFromScaled(decimal(text), bits);
  assert.deepEqual(fixedToScaled(at("0.999999999999", 64), 8), ONE_SCALED);
  assert.deepEqual(fixedToScaled(at("-0.999999999999", 64), 8), fr(-1n));
  assert.deepEqual(
    fixedToScaled(at("0.999999999999", 64), 12),
    decimal("0.999999999999"),
  );
  assert.deepEqual(
    fixedToScaled(at("0.999999999999", 64), 13),
    decimal("0.999999999999"),
  );
  assert.deepEqual(
    fixedToScaled(at("0.99999999", 64), 8),
    decimal("0.99999999"),
  );
  assert.deepEqual(
    fixedToScaled(at("0.999999994", 64), 8),
    decimal("0.99999999"),
  );
  assert.deepEqual(fixedToScaled(at("0.999999996", 64), 8), ONE_SCALED);
  assert.deepEqual(fixedToScaled(at("9.9999999996", 64), 10), fr(10n));
  assert.deepEqual(
    fixedToScaled(at("9.9999999994", 64), 10),
    decimal("9.999999999"),
  );
  // 9.9999999995 is a decimal tie at ten digits but not a dyadic: its
  // nearest at 64 bits lies below it, so the rounding stays below ten.
  const tie = at("9.9999999995", 64);
  assert.ok(compare(toRational(tie), dec("9.9999999995")) < 0);
  assert.deepEqual(fixedToScaled(tie, 10), decimal("9.999999999"));
  // Zero is zero at any digits, whatever the error and the bits.
  assert.deepEqual(
    fixedToScaled({ value: 0n, error: 5n, bits: 50 }, 8),
    ZERO_SCALED,
  );
  assert.deepEqual(
    fixedToScaled({ value: 0n, error: 0n, bits: 0 }, 1),
    ZERO_SCALED,
  );
  // Any magnitude: 2^200 and 2^-200 at five digits.
  assert.deepEqual(
    fixedToScaled({ value: 1n << 200n, error: 0n, bits: 0 }, 5),
    decimal("1.6069e60"),
  );
  assert.deepEqual(
    fixedToScaled({ value: 1n, error: 0n, bits: 200 }, 5),
    decimal("6.2230e-61"),
  );
  assert.throws(() => fixedToScaled(threeHalves, 0), RangeError);
  assert.throws(() => fixedToScaled(threeHalves, 1.5), RangeError);
});

test("fixedToBall rounds the midpoint to the digits and adds half a unit in the last to the error's radius when the rounding moved it", () => {
  // 3/2 exactly, at eight digits: the midpoint is on the grid already, so
  // no half unit is added and the ball is exact, as 7/4 is.
  const f: Fixed = { value: 12n, error: 0n, bits: 3 };
  assert.deepEqual(fixedToBall(f, 8), exact(decimal("1.5")));
  assert.deepEqual(
    fixedToBall({ value: 7n, error: 0n, bits: 2 }, 8),
    exact(decimal("1.75")),
  );
  // 3/2 at one digit rounds to 2 (half even), and the half unit is added.
  const one = fixedToBall(f, 1);
  assert.deepEqual(one.mid, decimal("2"));
  assertRadiusAbove(one, dec("0.5"), "3/2 at 1 digit");
  assert.ok(!isExact(one));
  // -5/16 ± 3/16, at eight digits, on the grid, and at two, where the
  // midpoint rounds and the half unit joins the error.
  const g: Fixed = { value: -5n, error: 3n, bits: 4 };
  const eight = fixedToBall(g, 8);
  assert.deepEqual(eight.mid, decimal("-0.3125"));
  assertRadiusAbove(eight, rational(3n, 16n), "-5/16 at 8");
  const two = fixedToBall(g, 2);
  assert.deepEqual(two.mid, decimal("-0.31"));
  assertRadiusAbove(two, add(rational(3n, 16n), dec("5e-3")), "-5/16 at 2");
  // A zero value is zero, exact when the error is, and no half unit is
  // added, a zero having no last digit.
  assert.deepEqual(
    fixedToBall({ value: 0n, error: 0n, bits: 50 }, 8),
    exact(ZERO_SCALED),
  );
  assert.deepEqual(fixedToBall({ value: 0n, error: 2n, bits: 1 }, 8), {
    mid: ZERO_SCALED,
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
  // The round trip through a ball contains the ball.
  for (const ball of seededBalls()) {
    const back = toBall(fixedFromBall(ball, 96));
    const rad = radiusUpper(ball.rad);
    const backRad = radiusUpper(back.rad);
    const mid = fraction(ball.mid);
    for (const x of [subtract(mid, rad), add(mid, rad)]) {
      assert.ok(
        compare(absolute(subtract(x, fraction(back.mid))), backRad) <= 0,
        `round trip of ${toFraction(mid)}`,
      );
    }
  }
  assert.throws(() => fixedToBall(f, 0), RangeError);
});

test("fixedToBall's midpoint is the dyadic rounded to the digits, within half a unit, and its ball contains the kernel's interval", () => {
  const root = key(2104);
  for (let i = 0; i < 150; i++) {
    // The value's width and bits, the fraction bits, the sign and the
    // error, each from its own fold.
    const k = foldIn(root, i);
    const width = between(foldIn(k, 0), 1, 100);
    const magnitude = randomBigInt(foldIn(k, 1), width);
    const bits = between(foldIn(k, 2), 0, 130);
    const value = uniform(foldIn(k, 3)) < 0.5 ? -magnitude : magnitude;
    const error = randomBigInt(foldIn(k, 4), 6);
    const f: Fixed = { value, error, bits };
    const dyadic = toRational(f);
    for (const digits of [1, 8, 18, 40]) {
      const label = `${toFraction(dyadic)} ± ${error} ulps at ${bits} bits, ${digits} digits`;
      const b = fixedToBall(f, digits);
      if (value === 0n) {
        assert.deepEqual(b.mid, ZERO_SCALED, label);
        continue;
      }
      // The midpoint is the dyadic rounded to nearest, halfEven, at the
      // digits: on the grid and within half a unit of the last digit.
      assert.deepEqual(
        b.mid,
        roundTo(fromRational(dyadic), digits, "halfEven"),
        label,
      );
      assert.ok(digitsOf(b.mid) <= digits, label);
      const half = halfUnit(b.mid, digits);
      assert.ok(
        compare(absolute(subtract(fraction(b.mid), dyadic)), half) <= 0,
        `${label}: within half a unit`,
      );
      // The radius is the error's plus that half unit when the rounding
      // moved the value, rounded up, so the dyadic and the ends of the
      // kernel's interval lie in the ball; a dyadic on the grid gets no
      // half unit, and is exact when the error is zero.
      const moved = !equals(fraction(b.mid), dyadic);
      const expected = multiply(rational(error), ulp(bits));
      if (moved) {
        assertRadiusAbove(b, add(expected, half), label);
      } else if (error === 0n) {
        assert.ok(isExact(b), `${label}: exact on the grid`);
      } else {
        assertRadiusAbove(b, expected, label);
      }
      const rad = radiusUpper(b.rad);
      for (const x of ends(f)) {
        assert.ok(
          compare(absolute(subtract(x, fraction(b.mid))), rad) <= 0,
          `${label}: contains ${toFraction(x)}`,
        );
      }
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
    const factor = pow(rational(2n), BigInt(k), LIMIT_BITS);
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

test("truncateFixed contains the interval it truncates, at any error", () => {
  // The value loses up to an ulp less a fraction and the error, rounded up
  // to the new ulps, keeps what it covered: 3/4 ± 2/4 is [1/4, 5/4], and at
  // no fraction bits it must still reach 5/4, so its error is 2, not 1 (an
  // error rounded down there missed the upper end by a fraction of an ulp).
  assert.deepEqual(truncateFixed({ value: 3n, error: 2n, bits: 2 }, 0), {
    value: 0n,
    error: 2n,
    bits: 0,
  });
  assert.deepEqual(truncateFixed({ value: 3n, error: 0n, bits: 2 }, 0), {
    value: 0n,
    error: 1n,
    bits: 0,
  });
  const root = key(3113);
  for (let i = 0; i < 400; i++) {
    const [a, b, c] = split(foldIn(root, i), 3);
    const f = fixedFromBall(randomBall(a!, 40, 3), between(b!, 40, 70));
    const bits = between(c!, 0, f.bits);
    const t = truncateFixed(f, bits);
    for (const end of [
      subtract(toRational(f), multiply(rational(f.error), ulp(f.bits))),
      add(toRational(f), multiply(rational(f.error), ulp(f.bits))),
    ]) {
      const distance = absolute(subtract(end, toRational(t)));
      assert.ok(
        compare(distance, multiply(rational(t.error), ulp(t.bits))) <= 0,
        `truncating ${toFraction(toRational(f))} ± ${f.error} ulps at ${f.bits} bits to ${bits}`,
      );
    }
  }
  assert.throws(
    () => truncateFixed({ value: 1n, error: 0n, bits: 2 }, 3),
    RangeError,
  );
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
  const root = key(2103);
  for (let i = 0; i < 60; i++) {
    const [left, right] = split(foldIn(root, i));
    const a = fixedFromBall(randomBall(left!, 16, 3), 40);
    const b = fixedFromBall(randomBall(right!, 16, 3), 40);
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

// ---------------------------------------------------------------------------
// The roots

/** sqrt 2, cbrt 2 and 10^(1/7), from Python's decimal module at 140 digits. */
const SQRT2 = dec(
  "1.4142135623730950488016887242096980785696718753769480731766797379907324784621070388503875343276415727",
);
const CBRT2 = dec(
  "1.2599210498948731647672106072782283505702514647015079800819751121552996765139594837293965624362550941",
);
const ROOT7_10 = dec(
  "1.389495494373137637129985217353011622113046714491000204945628",
);
/** 2^(1/1000000) = 1 + ln 2 / 10^6 + ..., from the same source. */
const ROOT_MILLIONTH_2 = dec("1.0000006931474207865077726362274070303773");

/** `10^-digits`. */
function tenTo(digits: number): Rational {
  return rational(1n, 10n ** BigInt(digits));
}

/**
 * Asserts that the ball's midpoint is within `tolerance` of `reference`,
 * which is a truncation of the true value at that tolerance, and that its
 * radius is within it too.
 */
function assertReference(
  ball: Ball,
  reference: Rational,
  tolerance: Rational,
  label: string,
) {
  const distance = absolute(subtract(fraction(ball.mid), reference));
  assert.ok(compare(distance, tolerance) <= 0, `${label}: midpoint`);
  assert.ok(compare(radiusUpper(ball.rad), tolerance) <= 0, `${label}: radius`);
}

/**
 * Whether `[low, high]` contains the `degree`-th root of every value in
 * `[from, to]`, all positive: by monotonicity, `low^degree <= from` and
 * `high^degree >= to`, checked on the integers so that degrees in the
 * thousands are affordable.
 */
function rootWithin(
  low: Rational,
  high: Rational,
  from: Rational,
  to: Rational,
  degree: bigint,
): boolean {
  const below =
    low.num <= 0n ||
    low.num ** degree * from.den <= from.num * low.den ** degree;
  const above = high.num ** degree * to.den >= to.num * high.den ** degree;
  return below && above;
}

/** Positive seeded arguments: rationals as exact values and balls with a positive interval. */
function positiveArguments(): Fixed[] {
  const root = key(2201);
  const args: Fixed[] = [];
  for (let i = 0; args.length < 60; i++) {
    const bits = 60 + (args.length % 4) * 10;
    const f =
      args.length % 2 === 0
        ? fixedFromRational(randomRational(foldIn(root, i), 24, 12), bits)
        : fixedFromBall(randomBall(foldIn(root, i), 24, 12), bits);
    if (f.value - f.error > 0n) args.push(f);
  }
  return args;
}

test("sqrtFixed contains the root of every value in the argument's interval, tightly", () => {
  for (const f of positiveArguments()) {
    const root = sqrtFixed(f);
    const [from, , to] = ends(f);
    const [low, , high] = ends(root);
    assert.ok(
      rootWithin(low, high, from, to, 2n),
      `sqrt of ${toFraction(from)}`,
    );
    // The error is at most two ulps beyond the argument's contribution.
    if (f.error === 0n)
      assert.ok(root.error <= 2n, `exact argument: ${root.error} ulps`);
  }
});

test("rootFixed contains the root of every value in the argument's interval, at any degree", () => {
  const degrees = [1n, 2n, 3n, 5n, 7n, 20n, 100n, 1234n];
  for (const [i, f] of positiveArguments().entries()) {
    for (const degree of degrees) {
      if (degree > 20n && i % 4 !== 0) continue;
      const root = rootFixed(f, degree);
      const [from, , to] = ends(f);
      const [low, , high] = ends(root);
      assert.ok(
        rootWithin(low, high, from, to, degree),
        `root ${degree} of ${toFraction(from)} to ${toFraction(to)}`,
      );
      // Tight: a few ulps beyond what the argument's error forces.
      if (f.error === 0n) {
        assert.ok(
          root.error <= 16n,
          `exact argument, degree ${degree}: ${root.error} ulps`,
        );
      }
    }
  }
});

test("the roots keep the argument's significant bits for a root of any magnitude", () => {
  const f = fixedFromRational(dec("2e20"), 64);
  const root = sqrtFixed(f);
  // sqrt(2e20) is about 2^33.7: 33 fewer fraction bits.
  assert.equal(root.bits, 64 - 33);
  assert.ok(root.error <= 2n);
  assertReference(
    toBall(root),
    dec("14142135623.73095048801688724209698078569671875376948073176679"),
    tenTo(9),
    "sqrt 2e20",
  );
  // A small argument needs the bits to hold it: 2e-20 is about 2^-65.4, so
  // at 160 fraction bits it has 95 significant ones, and its root gains 33.
  const tiny = sqrtFixed(fixedFromRational(dec("2e-20"), 160));
  assert.equal(tiny.bits, 160 + 33);
  assertReference(
    toBall(tiny),
    dec("1.414213562373095048801688724209698078569671875376948073176679e-10"),
    tenTo(38),
    "sqrt 2e-20",
  );
  const cube = rootFixed(fixedFromRational(dec("8e30"), 64), 3n);
  // cbrt(8e30) = 2e10, about 2^34.2.
  assert.equal(cube.bits, 64 - 34);
  assertReference(toBall(cube), dec("2e10"), tenTo(8), "cbrt 8e30");
  // 1e-30 is about 2^-99.7: at 160 bits, 60 significant ones.
  const small = rootFixed(fixedFromRational(dec("1e-30"), 160), 3n);
  assert.equal(small.bits, 160 + 33);
  assertReference(toBall(small), dec("1e-10"), tenTo(27), "cbrt 1e-30");
  // At too few bits a small argument is no argument at all.
  assert.throws(
    () => sqrtFixed(fixedFromRational(dec("2e-20"), 64)),
    RangeError,
  );
});

test("reference digits: sqrt 2 and cbrt 2 at 100 digits, and other roots", () => {
  const two = fixedFromRational(rational(2n), bitsFor(100));
  assertReference(toBall(sqrtFixed(two)), SQRT2, tenTo(100), "sqrt 2");
  assertReference(toBall(rootFixed(two, 3n)), CBRT2, tenTo(100), "cbrt 2");
  const ten = fixedFromRational(rational(10n), bitsFor(60));
  assertReference(toBall(rootFixed(ten, 7n)), ROOT7_10, tenTo(60), "10^(1/7)");
  const millionth = rootFixed(
    fixedFromRational(rational(2n), bitsFor(40)),
    1_000_000n,
  );
  assertReference(toBall(millionth), ROOT_MILLIONTH_2, tenTo(40), "2^(1/10^6)");
  // A perfect power comes out exact in value, within an ulp.
  const nine = rootFixed(fixedFromRational(rational(9n), 80), 2n);
  assert.deepEqual(toRational(nine), rational(3n));
  const eighth = rootFixed(fixedFromRational(rational(1n, 8n), 80), 3n);
  assert.ok(
    compare(
      absolute(subtract(toRational(eighth), rational(1n, 2n))),
      ulp(80),
    ) <= 0,
  );
});

test("a root of degree one is the argument, and the preconditions throw", () => {
  const f: Fixed = { value: 5n, error: 1n, bits: 2 };
  assert.deepEqual(rootFixed(f, 1n), f);
  assert.throws(() => rootFixed(f, 0n), RangeError);
  assert.throws(() => rootFixed(f, -3n), RangeError);
  // An interval that reaches zero, or is negative, has no root here.
  assert.throws(() => sqrtFixed({ value: 1n, error: 1n, bits: 2 }), RangeError);
  assert.throws(() => sqrtFixed({ value: 0n, error: 0n, bits: 2 }), RangeError);
  assert.throws(
    () => rootFixed({ value: -8n, error: 0n, bits: 2 }, 3n),
    RangeError,
  );
  assert.throws(
    () => rootFixed({ value: 3n, error: 4n, bits: 2 }, 5n),
    RangeError,
  );
});

test("a wide argument gives a wide root, and a root of a root composes", () => {
  const wide: Fixed = { value: 1024n, error: 512n, bits: 8 }; // 4 ± 2
  const root = sqrtFixed(wide);
  const [low, , high] = ends(root);
  assert.ok(rootWithin(low, high, rational(2n), rational(6n), 2n));
  const fourth = sqrtFixed(sqrtFixed(fixedFromRational(rational(16n), 64)));
  assert.deepEqual(toRational(fourth), rational(2n));
  const viaRoot = rootFixed(fixedFromRational(rational(16n), 64), 4n);
  assert.ok(
    compare(absolute(subtract(toRational(viaRoot), rational(2n))), ulp(60)) <=
      0,
  );
});
