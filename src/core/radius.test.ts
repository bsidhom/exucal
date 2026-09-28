import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MANT_LIMIT,
  MANT_MIN,
  UNBOUNDED,
  ZERO_RADIUS,
  addRadius,
  isUnbounded,
  isZeroRadius,
  maxRadius,
  multiplyRadius,
  powRadius,
  radiusAbove,
  radiusUpper,
  type Radius,
} from "./radius.ts";
import {
  LIMIT_BITS,
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  isZero,
  multiply,
  pow,
  rational,
  toFraction,
  type Rational,
} from "./rational.ts";
import { key, randomRational, split } from "../testing/random.ts";

/** A bounded radius written out, for the expected side of a `deepEqual`. */
function bounded(mant: bigint, exp: bigint): Radius {
  return { kind: "bounded", mant, exp };
}

/** `1 + 2^-29`, the factor an operation may lose to the 30-bit mantissa. */
const SLACK = add(ONE, rational(1n, MANT_MIN));

/** Asserts that `rad` is normalized: zero as `ZERO_RADIUS`, or a 30-bit mantissa. */
function assertNormalized(rad: Radius) {
  if (rad.kind === "unbounded") return;
  if (rad.mant === 0n) {
    assert.deepEqual(rad, ZERO_RADIUS);
    return;
  }
  assert.ok(rad.mant >= MANT_MIN && rad.mant < MANT_LIMIT, `${rad.mant}`);
}

/**
 * Asserts that `rad` is a true bound on `exact`, at or above it, and within
 * a relative `slack` of it (the tightness D3 claims).
 */
function assertBounds(rad: Radius, exact: Rational, slack = SLACK) {
  assertNormalized(rad);
  const upper = radiusUpper(rad);
  assert.ok(
    compare(upper, exact) >= 0,
    `${toFraction(upper)} is at or above ${toFraction(exact)}`,
  );
  assert.ok(
    compare(upper, multiply(exact, slack)) <= 0,
    `${toFraction(upper)} is within the slack of ${toFraction(exact)}`,
  );
}

/** The seeded set of non-zero rationals every property test is over. */
function seeded(): Rational[] {
  const [ordinary, wide] = split(key(1303));
  // Ordinary magnitudes, then a few very wide ones, so that the exponent's
  // range is exercised beyond what a double could hold.
  const values: Rational[] = [
    ...split(ordinary!, 200).map((k) => randomRational(k, 24, 20)),
    ...split(wide!, 10).map((k) => randomRational(k, 1500, 400)),
  ];
  return values.filter((r) => !isZero(r));
}

// ---------------------------------------------------------------------------
// The type and its constants

test("zero and unbounded are what their predicates say", () => {
  assert.ok(isZeroRadius(ZERO_RADIUS));
  assert.ok(!isUnbounded(ZERO_RADIUS));
  assert.ok(isUnbounded(UNBOUNDED));
  assert.ok(!isZeroRadius(UNBOUNDED));
  assert.ok(!isZeroRadius(radiusAbove(ONE)));
  assert.ok(!isUnbounded(radiusAbove(ONE)));
  assert.deepEqual(radiusUpper(ZERO_RADIUS), ZERO);
  assert.throws(() => radiusUpper(UNBOUNDED), RangeError);
});

test("radiusAbove of a power of two is exact, and of zero is zero", () => {
  assert.deepEqual(radiusAbove(ZERO), ZERO_RADIUS);
  assert.deepEqual(radiusAbove(ONE), bounded(MANT_MIN, -29n));
  assert.deepEqual(radiusAbove(rational(-1n)), bounded(MANT_MIN, -29n));
  assert.deepEqual(radiusAbove(rational(1n, 2n)), bounded(MANT_MIN, -30n));
  assert.deepEqual(radiusAbove(rational(2n)), bounded(MANT_MIN, -28n));
  assert.deepEqual(radiusAbove(rational(MANT_MIN)), bounded(MANT_MIN, 0n));
  assert.deepEqual(radiusAbove(rational(MANT_LIMIT)), bounded(MANT_MIN, 1n));
  assert.deepEqual(
    radiusUpper(radiusAbove(rational(1n, 1024n))),
    rational(1n, 1024n),
  );
});

test("radiusAbove rounds up to the 30-bit mantissa, by the least it can", () => {
  // Every integer below 2^30 is a mantissa of its own.
  assert.deepEqual(radiusAbove(rational(3n)), bounded(3n << 28n, -28n));
  assert.deepEqual(
    radiusAbove(rational(MANT_LIMIT - 1n)),
    bounded(MANT_LIMIT - 1n, 0n),
  );
  // 2^30 + 1 needs 31 bits: the odd bit is rounded up, not off.
  assert.deepEqual(
    radiusAbove(rational(MANT_LIMIT + 1n)),
    bounded(MANT_MIN + 1n, 1n),
  );
  assert.deepEqual(
    radiusAbove(rational(MANT_LIMIT + 2n)),
    bounded(MANT_MIN + 1n, 1n),
  );
  // 1/3 lies in [2^-2, 2^-1): its mantissa is ceil(2^31 / 3).
  assert.deepEqual(radiusAbove(rational(1n, 3n)), bounded(715827883n, -31n));
  assert.deepEqual(radiusAbove(rational(-1n, 3n)), bounded(715827883n, -31n));
  // A value just below a power of two rounds up to it.
  assert.deepEqual(
    radiusAbove(rational(MANT_LIMIT * MANT_LIMIT - 1n)),
    bounded(MANT_MIN, 31n),
  );
});

test("radiusAbove reaches magnitudes no double could hold", () => {
  const huge = rational(10n ** 5000n);
  const tiny = rational(1n, 2n ** 100000n);
  assert.deepEqual(radiusAbove(tiny), bounded(MANT_MIN, -100029n));
  assertBounds(radiusAbove(huge), huge);
  assertBounds(radiusAbove(tiny), tiny);
  const rad = radiusAbove(huge);
  assert.ok(rad.kind === "bounded" && rad.exp > 16000n);
});

test("radiusAbove is at or above its argument, within 2^-29, and the least such", () => {
  for (const r of seeded()) {
    const rad = radiusAbove(r);
    assertBounds(rad, absolute(r));
    // The least: one mantissa step down is below |r|.
    assert.ok(rad.kind === "bounded");
    const below =
      rad.mant > MANT_MIN
        ? bounded(rad.mant - 1n, rad.exp)
        : bounded(MANT_LIMIT - 1n, rad.exp - 1n);
    assert.ok(
      compare(radiusUpper(below), absolute(r)) < 0,
      `${toFraction(r)}: the radius below is below`,
    );
  }
});

// ---------------------------------------------------------------------------
// The operations

test("each operation is at or above the exact result, within 2^-29 of it", () => {
  const values = seeded();
  const radii = values.map((r) => radiusAbove(r));
  const exact = radii.map((rad) => radiusUpper(rad));
  const powers = [0n, 1n, 2n, 3n, 7n, 10n];
  for (const [i, a] of radii.entries()) {
    for (const j of [i, (i + 1) % radii.length, (i * 7 + 3) % radii.length]) {
      const b = radii[j]!;
      assertBounds(addRadius(a, b), add(exact[i]!, exact[j]!));
      assertBounds(multiplyRadius(a, b), multiply(exact[i]!, exact[j]!));
      const max = maxRadius(a, b);
      assert.deepEqual(max, compare(exact[i]!, exact[j]!) >= 0 ? a : b);
    }
    for (const n of powers) {
      const p = pow(exact[i]!, n, LIMIT_BITS);
      assert.ok(p.ok);
      // One product per bit of `n` and one per squaring, each within the slack.
      const products = 2 * n.toString(2).length;
      let slack = ONE;
      for (let k = 0; k < products; k++) slack = multiply(slack, SLACK);
      assertBounds(powRadius(a, n), p.value, slack);
    }
  }
});

test("the operations are exact where the mantissas allow, so equal radii are equal", () => {
  const one = radiusAbove(ONE);
  const two = radiusAbove(rational(2n));
  const three = radiusAbove(rational(3n));
  assert.deepEqual(addRadius(one, one), two);
  assert.deepEqual(addRadius(one, two), three);
  assert.deepEqual(
    multiplyRadius(three, radiusAbove(rational(5n))),
    radiusAbove(rational(15n)),
  );
  assert.deepEqual(
    multiplyRadius(three, radiusAbove(rational(1n, 4n))),
    radiusAbove(rational(3n, 4n)),
  );
  assert.deepEqual(powRadius(two, 10n), radiusAbove(rational(1024n)));
  assert.deepEqual(powRadius(three, 3n), radiusAbove(rational(27n)));
  assert.deepEqual(
    powRadius(radiusAbove(rational(1n, 2n)), 5n),
    radiusAbove(rational(1n, 32n)),
  );
  assert.deepEqual(maxRadius(two, three), three);
  assert.deepEqual(maxRadius(three, two), three);
  assert.deepEqual(maxRadius(two, two), two);
});

test("zero is the identity of add and max, annihilates multiply, and powers as pow does", () => {
  const rad = radiusAbove(rational(7n, 3n));
  assert.deepEqual(addRadius(ZERO_RADIUS, rad), rad);
  assert.deepEqual(addRadius(rad, ZERO_RADIUS), rad);
  assert.deepEqual(addRadius(ZERO_RADIUS, ZERO_RADIUS), ZERO_RADIUS);
  assert.deepEqual(maxRadius(ZERO_RADIUS, rad), rad);
  assert.deepEqual(maxRadius(rad, ZERO_RADIUS), rad);
  assert.deepEqual(maxRadius(ZERO_RADIUS, ZERO_RADIUS), ZERO_RADIUS);
  assert.deepEqual(multiplyRadius(ZERO_RADIUS, rad), ZERO_RADIUS);
  assert.deepEqual(multiplyRadius(rad, ZERO_RADIUS), ZERO_RADIUS);
  assert.deepEqual(powRadius(ZERO_RADIUS, 0n), radiusAbove(ONE));
  assert.deepEqual(powRadius(ZERO_RADIUS, 1n), ZERO_RADIUS);
  assert.deepEqual(powRadius(ZERO_RADIUS, 5n), ZERO_RADIUS);
  assert.deepEqual(powRadius(rad, 0n), radiusAbove(ONE));
  assert.deepEqual(powRadius(rad, 1n), rad);
  assert.throws(() => powRadius(rad, -1n), RangeError);
});

test("unbounded absorbs every operation", () => {
  const rad = radiusAbove(rational(7n, 3n));
  for (const other of [rad, ZERO_RADIUS, UNBOUNDED]) {
    assert.deepEqual(addRadius(UNBOUNDED, other), UNBOUNDED);
    assert.deepEqual(addRadius(other, UNBOUNDED), UNBOUNDED);
    assert.deepEqual(multiplyRadius(UNBOUNDED, other), UNBOUNDED);
    assert.deepEqual(multiplyRadius(other, UNBOUNDED), UNBOUNDED);
    assert.deepEqual(maxRadius(UNBOUNDED, other), UNBOUNDED);
    assert.deepEqual(maxRadius(other, UNBOUNDED), UNBOUNDED);
  }
  assert.deepEqual(powRadius(UNBOUNDED, 0n), UNBOUNDED);
  assert.deepEqual(powRadius(UNBOUNDED, 3n), UNBOUNDED);
});

test("a sum of radii far apart in exponent is one unit up, without a shift by the gap", () => {
  const far = bounded(MANT_MIN, 10n ** 18n);
  const near = bounded(MANT_MIN, 0n);
  assert.deepEqual(addRadius(far, near), bounded(MANT_MIN + 1n, 10n ** 18n));
  assert.deepEqual(addRadius(near, far), bounded(MANT_MIN + 1n, 10n ** 18n));
  // At the edge of the mantissa's width the shifted sum agrees with the
  // shortcut: 2^29 × 2^30 + 2^29 rounds up to (2^29 + 1) × 2^30 either way.
  assert.deepEqual(
    addRadius(bounded(MANT_MIN, 30n), near),
    bounded(MANT_MIN + 1n, 30n),
  );
  assert.deepEqual(
    addRadius(bounded(MANT_MIN, 31n), near),
    bounded(MANT_MIN + 1n, 31n),
  );
  // A product's exponent is the sum of the exponents, however large.
  assert.deepEqual(
    multiplyRadius(far, far),
    bounded(MANT_MIN, 2n * 10n ** 18n + 29n),
  );
  assert.deepEqual(
    powRadius(far, 3n),
    bounded(MANT_MIN, 3n * 10n ** 18n + 58n),
  );
  assert.deepEqual(maxRadius(far, near), far);
});

test("a product whose ceiling carries into a new bit is renormalized", () => {
  // (2^29 + 1)(2^30 - 2) = 2^59 - 2 rounds up, in 30 bits, to 2^30 × 2^29,
  // which is 2^29 × 2^30.
  assert.deepEqual(
    multiplyRadius(bounded(MANT_MIN + 1n, 0n), bounded(MANT_LIMIT - 2n, 0n)),
    bounded(MANT_MIN, 30n),
  );
  // (2^30 - 1)^2 = 2^60 - 2^31 + 1 has room: it is (2^30 - 1) × 2^30.
  const top = bounded(MANT_LIMIT - 1n, 0n);
  assert.deepEqual(multiplyRadius(top, top), bounded(MANT_LIMIT - 1n, 30n));
  assert.deepEqual(addRadius(top, top), bounded(MANT_LIMIT - 1n, 1n));
  // (2^30 - 1) + 1/2 rounds up to 2^30, which is 2^29 × 2^1.
  assert.deepEqual(
    addRadius(top, bounded(MANT_MIN, -30n)),
    bounded(MANT_MIN, 1n),
  );
  // Whereas (2^30 - 1) + 2^28 has room: it is 2^29 + 2^27, one exponent up.
  assert.deepEqual(
    addRadius(top, bounded(MANT_MIN, -1n)),
    bounded(MANT_MIN + (1n << 27n), 1n),
  );
});
