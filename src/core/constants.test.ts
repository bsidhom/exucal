import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { chudnovsky, piBall, piFixed, piMemoBits } from "./constants.ts";
import { DEFAULT_MAX_BITS, DEFAULT_ROUNDING } from "./context.ts";
import { bitsFor, fixedToBall, toRational } from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  compare,
  parseDecimal,
  rational,
  subtract,
  type Rational,
} from "./rational.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
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

test("the 36-digit literal of units.txt is a second reference", () => {
  const text = readFileSync(new URL("../units.txt", import.meta.url), "utf8");
  const literal = /^pi\s+([\d.]+)/m.exec(text);
  assert.ok(literal !== null);
  const reference = dec(literal[1]!);
  assert.equal(literal[1]!.length, 37);
  const pi = fixedToBall(chudnovsky(bitsFor(40)));
  assert.ok(compare(absolute(subtract(pi.mid, reference)), tenTo(35)) < 0);
});

test("the memo holds the ceiling's value, and every request under it is that value truncated", () => {
  assert.equal(piMemoBits(), undefined);
  const ceiling = bitsFor(500);
  const a = piFixed(bitsFor(8), ceiling);
  assert.equal(piMemoBits(), ceiling);
  const b = piFixed(bitsFor(40), ceiling);
  const c = piFixed(bitsFor(100), ceiling);
  assert.equal(piMemoBits(), ceiling);
  for (const f of [a, b, c]) {
    const pi = fixedToBall(f);
    assert.ok(
      compare(absolute(subtract(pi.mid, PI)), radiusUpper(pi.rad)) <= 0,
    );
    // The ceiling's three ulps are below one at fewer bits: the truncation's
    // ulp alone remains.
    assert.equal(f.error, 1n);
  }
  assert.equal(a.bits, bitsFor(8));
  // At the ceiling itself the memo is handed out as it is.
  assert.equal(piFixed(ceiling, ceiling).error, 3n);
  // Above the ceiling nothing is kept.
  const above = piFixed(bitsFor(700), ceiling);
  assert.equal(above.bits, bitsFor(700));
  assert.equal(piMemoBits(), ceiling);
  // A higher ceiling replaces the value; a lower one leaves it.
  piFixed(bitsFor(8), bitsFor(1000));
  assert.equal(piMemoBits(), bitsFor(1000));
  piFixed(bitsFor(8), bitsFor(200));
  assert.equal(piMemoBits(), bitsFor(1000));
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
  assert.equal(piMemoBits(), bitsFor(4040));
});
