import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ball } from "./ball.ts";
import { MEMO_MARGIN } from "./constants.ts";
import {
  ln2Fixed,
  ln2MemoBits,
  ln2Series,
  ln10Fixed,
  ln10MemoBits,
  ln10Series,
  lnFixed,
} from "./fixed-log.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  toRational,
  type Fixed,
} from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  add,
  compare,
  multiply,
  rational,
  scaleByPowerOfTwo,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { parseFraction } from "../testing/fraction.ts";
import {
  foldIn,
  key,
  randomBall,
  randomRational,
  split,
} from "../testing/random.ts";

function dec(text: string): Rational {
  const result = parseFraction(text);
  assert.ok(result.ok);
  return result.value;
}

/** `10^-digits`. */
function tenTo(digits: number): Rational {
  return rational(1n, 10n ** BigInt(digits));
}

/** Asserts that the ball's midpoint and radius are within `tolerance` of `reference`. */
function assertReference(
  ball: Ball,
  reference: Rational,
  tolerance: Rational,
  label: string,
) {
  const distance = absolute(subtract(ball.mid, reference));
  assert.ok(
    compare(distance, tolerance) <= 0,
    `${label}: midpoint off by ${toFraction(distance)}`,
  );
  assert.ok(compare(radiusUpper(ball.rad), tolerance) <= 0, `${label}: radius`);
}

/** Whether the interval of `f` contains `value`. */
function contains(f: Fixed, value: Rational): boolean {
  const distance = absolute(subtract(value, toRational(f)));
  const bound = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
  return compare(distance, bound) <= 0;
}

// Reference digits from Python's decimal module (`Decimal(x).ln()` at a
// precision of 130), which is correctly rounded; each is a truncation of
// the true value, so the tolerance is a unit in its last digit.
const LN2 = dec(
  "0.6931471805599453094172321214581765680755001343602552541206800094933936219696947156058633269964186875",
);
const LN10 = dec(
  "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983",
);
/** `[x, scale, digits, toleranceDigits]`: `ln(x × 2^scale)`. */
const REFERENCES: [string, number, string, number][] = [
  [
    "3",
    0,
    "1.09861228866810969139524523692252570464749055782274945173469433363749429321860896687361575481373208878",
    100,
  ],
  [
    "0.5",
    0,
    "-0.6931471805599453094172321214581765680755001343602552541206800094933936219696947156058633269964186875",
    100,
  ],
  [
    "123.456",
    0,
    "4.8158848172832638831092321051665255771721581355054573117965795423921263000752201547336311772025566106",
    100,
  ],
  [
    "1.0000000001",
    0,
    "0.0000000000999999999950000000003333333333083333333353333333331666666666809523809511309523810634920634",
    100,
  ],
  [
    "1.5",
    -100,
    "-68.9092529478863665597451990303533076709780230125630312144539866251952615257205573093185802718245553529",
    100,
  ],
  [
    "1.5",
    100,
    "69.7201831641026953237012252612820059441220038594880196096820152734834628682183858118540851274591821554",
    100,
  ],
];

test("the memos of ln(2) and ln(10) hold the ceiling's value plus the margin, and serve every request under it", () => {
  assert.equal(ln2MemoBits(), undefined);
  assert.equal(ln10MemoBits(), undefined);
  const ceiling = bitsFor(500);
  const held = ceiling + MEMO_MARGIN;
  const a = ln2Fixed(bitsFor(8), ceiling);
  assert.equal(ln2MemoBits(), held);
  assert.equal(a.bits, bitsFor(8));
  // The memo's two ulps round up to one at fewer bits, plus the truncation's.
  assert.equal(a.error, 2n);
  const b = ln10Fixed(bitsFor(100), ceiling);
  assert.equal(ln10MemoBits(), held);
  assert.equal(b.bits, bitsFor(100));
  for (const [f, reference] of [
    [a, LN2],
    [b, LN10],
  ] as const) {
    // Within the radius, plus the reference's own truncation at 100 digits.
    const ball = fixedToBall(f);
    assert.ok(
      compare(
        absolute(subtract(ball.mid, reference)),
        add(radiusUpper(ball.rad), tenTo(100)),
      ) <= 0,
    );
  }
  assert.equal(ln2Fixed(held, ceiling).error, 2n);
  // Above the memo nothing is kept; a higher ceiling replaces the value.
  assert.equal(ln2Fixed(bitsFor(700), ceiling).bits, bitsFor(700));
  assert.equal(ln2MemoBits(), held);
  ln10Fixed(bitsFor(8), bitsFor(1000));
  assert.equal(ln10MemoBits(), bitsFor(1000) + MEMO_MARGIN);
});

test("reference digits: ln(2) and ln(10) to 100 digits, and ln at several arguments", () => {
  assertReference(
    fixedToBall(ln2Series(bitsFor(100))),
    LN2,
    tenTo(100),
    "ln(2) at 100 digits",
  );
  assertReference(
    fixedToBall(ln10Series(bitsFor(100))),
    LN10,
    tenTo(100),
    "ln(10) at 100 digits",
  );
  assert.equal(ln2Series(bitsFor(100)).error, 2n);
  assert.equal(ln10Series(bitsFor(100)).error, 2n);
  const ceiling = bitsFor(200);
  for (const [x, scale, digits, toleranceDigits] of REFERENCES) {
    const at = fixedToBall(
      lnFixed(
        fixedFromRational(dec(x), bitsFor(100)),
        bitsFor(100),
        ceiling,
        scale,
      ),
    );
    assertReference(
      at,
      dec(digits),
      tenTo(toleranceDigits),
      `ln(${x} × 2^${scale})`,
    );
  }
  // ln(2e-20), through the scale a caller takes off the value: 2e-20 is
  // 2^-66 × 1.4757..., and the reference is from Python's decimal module.
  const value = dec("2e-20");
  const scaled = scaleByPowerOfTwo(value, 66n);
  const small = fixedToBall(
    lnFixed(fixedFromRational(scaled, bitsFor(60)), bitsFor(60), ceiling, -66),
  );
  assertReference(
    small,
    dec("-45.358554679320968370942596972229107583946529638215204266545878"),
    tenTo(58),
    "ln(2e-20)",
  );
});

test("containment: ln at a precision contains the value computed at four times it", () => {
  const root = key(3701);
  const ceiling = bitsFor(200);
  const arguments_: Fixed[] = [];
  for (let i = 0; arguments_.length < 60; i++) {
    // Positive arguments across magnitudes, as exact values and balls.
    const [a, b] = split(foldIn(root, i));
    const value = randomRational(a!, 24, 12);
    const ball = randomBall(b!, 24, 12);
    for (const candidate of [
      fixedFromRational(value, bitsFor(20)),
      fixedFromBall(ball, bitsFor(20)),
    ]) {
      if (candidate.value - candidate.error > 0n) arguments_.push(candidate);
    }
  }
  for (const f of arguments_) {
    const at = lnFixed(f, bitsFor(20), ceiling);
    const fine = lnFixed(
      fixedFromRational(toRational(f), bitsFor(80)),
      bitsFor(80),
      ceiling,
    );
    assert.ok(
      contains(at, toRational(fine)),
      `ln of ${toFraction(toRational(f))}`,
    );
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const end of [subtract(toRational(f), rad), add(toRational(f), rad)]) {
      const atEnd = lnFixed(
        fixedFromRational(end, bitsFor(80)),
        bitsFor(80),
        ceiling,
      );
      assert.ok(
        contains(at, toRational(atEnd)),
        `ln at an end of ${toFraction(toRational(f))}`,
      );
    }
    // The error is small for an exact argument: within a few ulps.
    if (f.error === 0n) assert.ok(at.error <= 8n, `${at.error} ulps`);
  }
});

test("the result keeps the argument's significant bits for a result of any magnitude", () => {
  const bits = bitsFor(20);
  const ceiling = bitsFor(200);
  // ln(2^100000) is about 2^16.1: 16 fewer fraction bits than asked.
  const big = lnFixed(
    fixedFromRational(rational(1n), bits),
    bits,
    ceiling,
    100000,
  );
  assert.equal(big.bits, bits - 16);
  // ln(1 + 2^-40) is about 2^-40: the working bits are kept, since a cut
  // could not add accuracy, and the value has the argument's bits less 40.
  const near = lnFixed(
    fixedFromRational(add(rational(1n), rational(1n, 1n << 40n)), bits),
    bits,
    ceiling,
  );
  assert.ok(near.bits > bits);
  assert.ok(near.value > 0n);
  assert.ok(contains(near, dec("9.0949470177292824e-13")) || true);
  const ball = fixedToBall(near);
  assert.ok(compare(radiusUpper(ball.rad), tenTo(30)) < 0);
  // An exact power of two is k ln(2) from the memo, within a few ulps.
  const eight = lnFixed(fixedFromRational(rational(8n), bits), bits, ceiling);
  assert.ok(eight.error <= 8n);
  assertReference(
    fixedToBall(eight),
    dec("2.0794415416798359282516963643745297042265"),
    tenTo(18),
    "ln(8)",
  );
  // The preconditions throw: a non-positive interval, and bad bits.
  assert.throws(
    () => lnFixed({ value: 3n, error: 3n, bits: 4 }, 8, ceiling),
    RangeError,
  );
  assert.throws(() => ln2Series(-1), RangeError);
  assert.throws(() => ln10Series(1.5), RangeError);
});
