import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEMO_MARGIN,
  chudnovsky,
  eBall,
  eFixed,
  eMemoBits,
  eSeries,
  piBall,
  piFixed,
  piMemoBits,
} from "./constants.ts";
import { DEFAULT_MAX_BITS, DEFAULT_ROUNDING } from "./context.ts";
import { bitsFor, fixedToBall, toRational } from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  compare,
  rational,
  subtract,
  type Rational,
} from "./rational.ts";
import { parseFraction } from "../testing/fraction.ts";

function dec(text: string): Rational {
  const result = parseFraction(text);
  assert.ok(result.ok);
  return result.value;
}

/** pi to 130 digits, by Machin's formula in integer arithmetic, as an independent reference. */
const PI = dec(
  "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095",
);

/** `10^-digits`. */
function tenTo(digits: number): Rational {
  return rational(1n, 10n ** BigInt(digits));
}

test("chudnovsky gives the reference digits of pi, with its radius", () => {
  for (const digits of [1, 8, 40, 100, 120]) {
    const pi = fixedToBall(chudnovsky(bitsFor(digits)));
    const distance = absolute(subtract(pi.mid, PI));
    assert.ok(compare(distance, tenTo(digits + 8)) < 0, `${digits} digits`);
    assert.ok(
      compare(distance, radiusUpper(pi.rad)) <= 0,
      `${digits}: contains`,
    );
    assert.ok(
      compare(radiusUpper(pi.rad), tenTo(digits + 8)) < 0,
      `${digits}: radius`,
    );
  }
  // Few bits still give a value of pi.
  assert.deepEqual(toRational(chudnovsky(0)), rational(3n));
  assert.deepEqual(toRational(chudnovsky(4)), rational(50n, 16n));
  assert.throws(() => chudnovsky(-1), RangeError);
});

/** The 36-digit literal GNU units defines `pi` as, and units.txt did until 3.4: a second reference. */
const GNU_UNITS_PI = "3.14159265358979323846264338327950288";

test("the 36-digit literal of GNU units is a second reference", () => {
  const reference = dec(GNU_UNITS_PI);
  assert.equal(GNU_UNITS_PI.length, 37);
  const pi = fixedToBall(chudnovsky(bitsFor(40)));
  assert.ok(compare(absolute(subtract(pi.mid, reference)), tenTo(35)) < 0);
});

test("the memo holds the ceiling's value plus the margin, and every request under it is that value truncated", () => {
  assert.equal(piMemoBits(), undefined);
  assert.equal(MEMO_MARGIN, 64);
  const ceiling = bitsFor(500);
  const held = ceiling + MEMO_MARGIN;
  const a = piFixed(bitsFor(8), ceiling);
  assert.equal(piMemoBits(), held);
  const b = piFixed(bitsFor(40), ceiling);
  const c = piFixed(bitsFor(100), ceiling);
  assert.equal(piMemoBits(), held);
  for (const f of [a, b, c]) {
    const pi = fixedToBall(f);
    assert.ok(
      compare(absolute(subtract(pi.mid, PI)), radiusUpper(pi.rad)) <= 0,
    );
    // The ceiling's three ulps are a fraction of one at fewer bits, rounded
    // up to one, and the truncation's ulp is added.
    assert.equal(f.error, 2n);
  }
  assert.equal(a.bits, bitsFor(8));
  // At the ceiling itself the memo is truncated by the margin; at the
  // margin it is handed out as it is, and an argument of up to 64 bits
  // reduced at the ceiling pass is served from it.
  assert.equal(piFixed(ceiling, ceiling).error, 2n);
  assert.equal(piFixed(held, ceiling).error, 3n);
  assert.equal(piFixed(ceiling + 40, ceiling).bits, ceiling + 40);
  assert.equal(piMemoBits(), held);
  // Above the memo nothing is kept.
  const above = piFixed(bitsFor(700), ceiling);
  assert.equal(above.bits, bitsFor(700));
  assert.equal(piMemoBits(), held);
  // A higher ceiling replaces the value; a lower one leaves it.
  piFixed(bitsFor(8), bitsFor(1000));
  assert.equal(piMemoBits(), bitsFor(1000) + MEMO_MARGIN);
  piFixed(bitsFor(8), bitsFor(200));
  assert.equal(piMemoBits(), bitsFor(1000) + MEMO_MARGIN);
});

test("piBall is pi at the context's precision", () => {
  const context = {
    precision: 50,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: 4040,
  };
  const pi = piBall(context);
  assert.ok(compare(absolute(subtract(pi.mid, PI)), radiusUpper(pi.rad)) <= 0);
  assert.ok(compare(radiusUpper(pi.rad), tenTo(58)) < 0);
  assert.equal(piMemoBits(), bitsFor(4040) + MEMO_MARGIN);
});

/** e to 110 digits, from Python's decimal module (`Decimal(1).exp()` at a precision of 130). */
const E = dec(
  "2.71828182845904523536028747135266249775724709369995957496696762772407663035354759457138217852516642742746639193",
);

test("eSeries gives the reference digits of e, with its radius", () => {
  for (const digits of [1, 8, 40, 100]) {
    const e = fixedToBall(eSeries(bitsFor(digits)));
    const distance = absolute(subtract(e.mid, E));
    assert.ok(compare(distance, tenTo(digits + 8)) < 0, `${digits} digits`);
    assert.ok(
      compare(distance, radiusUpper(e.rad)) <= 0,
      `${digits}: contains`,
    );
    assert.ok(
      compare(radiusUpper(e.rad), tenTo(digits + 8)) < 0,
      `${digits}: radius`,
    );
  }
  assert.deepEqual(toRational(eSeries(0)), rational(2n));
  assert.equal(eSeries(4).error, 2n);
  assert.throws(() => eSeries(-1), RangeError);
});

test("the memo of e follows the same rule as pi's", () => {
  assert.equal(eMemoBits(), undefined);
  const ceiling = bitsFor(300);
  const held = ceiling + MEMO_MARGIN;
  const a = eFixed(bitsFor(8), ceiling);
  assert.equal(eMemoBits(), held);
  assert.equal(a.bits, bitsFor(8));
  // The memo's two ulps round up to one at fewer bits, plus the truncation's.
  assert.equal(a.error, 2n);
  assert.ok(
    compare(
      absolute(subtract(fixedToBall(a).mid, E)),
      radiusUpper(fixedToBall(a).rad),
    ) <= 0,
  );
  assert.equal(eFixed(held, ceiling).error, 2n);
  assert.equal(eFixed(bitsFor(700), ceiling).bits, bitsFor(700));
  assert.equal(eMemoBits(), held);
  eFixed(bitsFor(8), bitsFor(1000));
  assert.equal(eMemoBits(), bitsFor(1000) + MEMO_MARGIN);
  const e = eBall({
    precision: 50,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: 1000,
  });
  assert.ok(compare(absolute(subtract(e.mid, E)), radiusUpper(e.rad)) <= 0);
  assert.ok(compare(radiusUpper(e.rad), tenTo(58)) < 0);
});
