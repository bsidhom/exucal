import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DIGITS,
  DEFAULT_ROUNDING,
  checkContext,
  type NumberContext,
} from "./context.ts";
import { ROUNDING_MODES } from "./rounding.ts";

test("the defaults are the display's rules: eight digits, half away from zero", () => {
  assert.equal(DEFAULT_DIGITS, 8);
  assert.equal(DEFAULT_ROUNDING, "halfAwayFromZero");
  checkContext({ precision: DEFAULT_DIGITS, rounding: DEFAULT_ROUNDING });
});

test("checkContext accepts every mode at any positive integer precision", () => {
  for (const rounding of ROUNDING_MODES) {
    for (const precision of [1, 8, 40, 1000]) {
      checkContext({ precision, rounding });
    }
  }
});

test("checkContext rejects a precision that is not a positive integer", () => {
  for (const precision of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(
      () => checkContext({ precision, rounding: DEFAULT_ROUNDING }),
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
