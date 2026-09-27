import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DIGITS,
  DEFAULT_MAX_BITS,
  DEFAULT_MAX_DIGITS,
  DEFAULT_ROUNDING,
  GUARD_DIGITS,
  ceilingFor,
  checkContext,
  maxDigitsFor,
  type NumberContext,
} from "./context.ts";
import { bitsFor } from "./fixed.ts";
import { LIMIT_BITS } from "./rational.ts";
import { ROUNDING_MODES } from "./rounding.ts";

test("the defaults are the display's rules: eight digits, half away from zero", () => {
  assert.equal(DEFAULT_DIGITS, 8);
  assert.equal(DEFAULT_ROUNDING, "halfAwayFromZero");
  checkContext({
    precision: DEFAULT_DIGITS,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
  });
});

test("checkContext accepts every mode at any positive integer precision", () => {
  for (const rounding of ROUNDING_MODES) {
    for (const precision of [1, 8, 40, 1000]) {
      checkContext({ precision, rounding, maxBits: DEFAULT_MAX_BITS });
    }
  }
});

test("checkContext rejects a precision that is not a positive integer", () => {
  for (const precision of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(
      () =>
        checkContext({
          precision,
          rounding: DEFAULT_ROUNDING,
          maxBits: DEFAULT_MAX_BITS,
        }),
      RangeError,
      `${precision}`,
    );
  }
});

test("checkContext rejects a name that is not a rounding mode", () => {
  const context = {
    precision: 8,
    rounding: "nearest",
  } as unknown as NumberContext;
  assert.throws(() => checkContext(context), RangeError);
});

test("checkContext rejects a range limit outside [1, LIMIT_BITS]", () => {
  for (const maxBits of [0, -1, 1.5, NaN, LIMIT_BITS + 1]) {
    assert.throws(
      () => checkContext({ precision: 8, rounding: DEFAULT_ROUNDING, maxBits }),
      RangeError,
      `${maxBits}`,
    );
  }
  checkContext({ precision: 8, rounding: DEFAULT_ROUNDING, maxBits: 1 });
  checkContext({
    precision: 8,
    rounding: DEFAULT_ROUNDING,
    maxBits: LIMIT_BITS,
  });
  assert.equal(DEFAULT_MAX_BITS, 1 << 16);
  assert.equal(LIMIT_BITS, 1 << 20);
});

test("the ceiling is four times the cap plus the guard", () => {
  assert.equal(GUARD_DIGITS, 10);
  assert.equal(DEFAULT_MAX_DIGITS, 1000);
  assert.equal(ceilingFor(DEFAULT_MAX_DIGITS), 4040);
  assert.equal(ceilingFor(1), 44);
  assert.equal(ceilingFor(200), 840);
});

test("maxDigitsFor is the largest cap whose ceiling fits half the range limit", () => {
  for (const maxBits of [DEFAULT_MAX_BITS, LIMIT_BITS, 4096, 1000]) {
    const cap = maxDigitsFor(maxBits);
    assert.ok(cap >= 1, `${maxBits}`);
    assert.ok(
      2 * bitsFor(ceilingFor(cap)) <= maxBits,
      `${maxBits}: ${cap} fits`,
    );
    assert.ok(
      2 * bitsFor(ceilingFor(cap + 1)) > maxBits,
      `${maxBits}: ${cap + 1} does not`,
    );
  }
  // About 2,450 at the default range limit, so the default cap has room.
  const cap = maxDigitsFor(DEFAULT_MAX_BITS);
  assert.ok(cap > 2400 && cap < 2500, `${cap}`);
  assert.ok(DEFAULT_MAX_DIGITS <= cap);
  // A range limit too small for any digits gives zero.
  assert.equal(maxDigitsFor(100), 0);
  assert.equal(maxDigitsFor(1), 0);
});
