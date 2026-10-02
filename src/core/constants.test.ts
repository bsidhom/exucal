import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ball } from "./ball.ts";
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
import {
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import { bitsFor, fixedToBall, toRational, type Fixed } from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  add,
  bitLength,
  compare,
  multiply,
  rational,
  subtract,
  type Rational,
} from "./rational.ts";
import { digitsFor } from "./rounding.ts";
import { fromRational, roundTo } from "./scaled.ts";
import { parseFraction } from "../testing/fraction.ts";
import { digitsOf, fraction } from "../testing/scaled.ts";

function dec(text: string): Rational {
  const result = parseFraction(text);
  assert.ok(result.ok);
  return result.value;
}

/** pi to 130 digits, from Python's decimal module by Machin's formula at a precision of 150, as an independent reference. */
const PI = dec(
  "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095",
);

/** `10^-digits`. */
function tenTo(digits: number): Rational {
  return rational(1n, 10n ** BigInt(digits));
}

/**
 * The ball of `f` at two digits more than its significant bits are worth,
 * so that the rounding onto the decimal grid, half a unit in the last
 * digit added to the radius, stays under a tenth of an ulp and the
 * tolerances below measure the series alone; `piBall` and `eBall` take
 * the memo out at `workingDigits` instead.
 */
function toBall(f: Fixed): Ball {
  const magnitude = f.value < 0n ? -f.value : f.value;
  return fixedToBall(f, digitsFor(Math.max(1, bitLength(magnitude))) + 2);
}

/** A context at `precision` digits under `ceiling`, in the default mode. */
function at(precision: number, ceiling: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling,
  };
}

/**
 * Asserts that `b`, a constant's ball at `context`, has its midpoint on the
 * decimal grid of the working digits, within half a unit of the last of
 * them plus the memo's two ulps from `reference` (which has more digits
 * than that), and that its radius covers the reference. The midpoint is
 * the memo's value rounded to nearest, and the memo's value is within its
 * error of the constant: at eight digits, e's nineteenth to twenty-first
 * digits, 536, put it 0.536 of a unit above the grid and the two ulps
 * are 0.35 of a unit, so the rounding may land on either neighbour.
 */
function assertWorkingDigits(
  b: Ball,
  reference: Rational,
  context: NumberContext,
  label: string,
) {
  const digits = workingDigits(context);
  const distance = absolute(subtract(fraction(b.mid), reference));
  assert.ok(digitsOf(b.mid) <= digits, `${label}: ${digits} digits`);
  // The constants are above one and below ten, so a unit in the last of
  // the digits is 10^(1 - digits).
  const halfUnit = multiply(rational(5n), tenTo(digits));
  const memoError = rational(2n, 1n << BigInt(bitsFor(context.precision)));
  assert.ok(
    compare(distance, add(halfUnit, memoError)) <= 0,
    `${label}: within half a unit of the last of ${digits} digits plus the memo's error`,
  );
  assert.ok(
    compare(distance, radiusUpper(b.rad)) <= 0,
    `${label}: the radius covers the reference`,
  );
}

test("chudnovsky gives the reference digits of pi, with its radius", () => {
  for (const digits of [1, 8, 40, 100, 120]) {
    const pi = toBall(chudnovsky(bitsFor(digits)));
    const distance = absolute(subtract(fraction(pi.mid), PI));
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
  const pi = toBall(chudnovsky(bitsFor(40)));
  assert.ok(
    compare(absolute(subtract(fraction(pi.mid), reference)), tenTo(35)) < 0,
  );
});

test("the memo holds the ceiling's value plus the margin, and every request under it is that value truncated", () => {
  assert.equal(piMemoBits(), undefined);
  assert.equal(MEMO_MARGIN, 256);
  const ceiling = bitsFor(500);
  const held = ceiling + MEMO_MARGIN;
  const a = piFixed(bitsFor(8), ceiling);
  assert.equal(piMemoBits(), held);
  const b = piFixed(bitsFor(40), ceiling);
  const c = piFixed(bitsFor(100), ceiling);
  assert.equal(piMemoBits(), held);
  for (const f of [a, b, c]) {
    const pi = toBall(f);
    assert.ok(
      compare(absolute(subtract(fraction(pi.mid), PI)), radiusUpper(pi.rad)) <=
        0,
    );
    // The ceiling's three ulps are a fraction of one at fewer bits, rounded
    // up to one, and the truncation's ulp is added.
    assert.equal(f.error, 2n);
  }
  assert.equal(a.bits, bitsFor(8));
  // At the ceiling itself the memo is truncated by the margin; at the
  // margin it is handed out as it is, and an argument of up to 256 bits
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

test("piBall is pi at the context's precision, rounded to its working digits", () => {
  const context = at(50, 4040);
  // Fifty digits and the guard are 199 bits, worth sixty digits.
  assert.equal(workingDigits(context), 60);
  const pi = piBall(context);
  assertWorkingDigits(pi, PI, context, "pi at 50");
  // pi's digits beyond the sixtieth, 459..., are far enough from a tie
  // that the memo's error cannot move the rounding: the midpoint is the
  // reference rounded to sixty digits.
  assert.deepEqual(pi.mid, roundTo(fromRational(PI), 60, "halfEven"));
  // The radius is the memo's two ulps plus the rounding's half unit.
  assert.ok(compare(radiusUpper(pi.rad), tenTo(58)) < 0);
  assert.equal(piMemoBits(), bitsFor(4040) + MEMO_MARGIN);
  // At the default precision the grid is eighteen digits.
  const eight = piBall(at(8, 4040));
  assert.equal(workingDigits(at(8, 4040)), 18);
  assertWorkingDigits(eight, PI, at(8, 4040), "pi at 8");
});

/** e to 130 digits, from Python's decimal module (`Decimal(1).exp()` at a precision of 140). */
const E = dec(
  "2.7182818284590452353602874713526624977572470936999595749669676277240766303535475945713821785251664274274663919320030599218174135966",
);

test("eSeries gives the reference digits of e, with its radius", () => {
  for (const digits of [1, 8, 40, 100]) {
    const e = toBall(eSeries(bitsFor(digits)));
    const distance = absolute(subtract(fraction(e.mid), E));
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
      absolute(subtract(fraction(toBall(a).mid), E)),
      radiusUpper(toBall(a).rad),
    ) <= 0,
  );
  assert.equal(eFixed(held, ceiling).error, 2n);
  assert.equal(eFixed(bitsFor(700), ceiling).bits, bitsFor(700));
  assert.equal(eMemoBits(), held);
  eFixed(bitsFor(8), bitsFor(1000));
  assert.equal(eMemoBits(), bitsFor(1000) + MEMO_MARGIN);
  const context = at(50, 1000);
  const e = eBall(context);
  assertWorkingDigits(e, E, context, "e at 50");
  // e's digits beyond the sixtieth, 762..., are 0.26 of a unit past the
  // tie and the memo's two ulps are 0.25 of one: the rounding is decided,
  // narrowly, and the midpoint is the reference rounded to sixty digits.
  assert.deepEqual(e.mid, roundTo(fromRational(E), 60, "halfEven"));
  assert.ok(compare(radiusUpper(e.rad), tenTo(58)) < 0);
  assertWorkingDigits(eBall(at(8, 1000)), E, at(8, 1000), "e at 8");
});
