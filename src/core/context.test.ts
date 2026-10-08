import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CEILING,
  DEFAULT_DISPLAY_DIGITS,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_PRECISION_LIMIT_DIGITS,
  DEFAULT_ROUNDING,
  GUARD_DIGITS,
  MODES,
  ceilingContext,
  ceilingFor,
  checkContext,
  precisionLimitFor,
  modeOf,
  operandContext,
  workingContexts,
  type NumberContext,
} from "./context.ts";
import { bitsFor } from "./fixed.ts";
import { MAX_SIGNIFICAND_LIMIT_BITS } from "./rational.ts";
import { ROUNDING_MODES } from "./rounding.ts";

test('the defaults are eight digits and half even (devdocs/settings.md, "The model")', () => {
  assert.equal(DEFAULT_DISPLAY_DIGITS, 8);
  assert.equal(DEFAULT_ROUNDING, "halfEven");
  checkContext({
    precision: DEFAULT_DISPLAY_DIGITS,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  });
});

test("checkContext accepts every mode at any positive integer precision", () => {
  for (const rounding of ROUNDING_MODES) {
    for (const precision of [1, 8, 40, 1000]) {
      checkContext({
        precision,
        rounding,
        significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
        ceiling: DEFAULT_CEILING,
      });
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
          significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
          ceiling: DEFAULT_CEILING,
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

test("checkContext rejects a significand limit outside [1, MAX_SIGNIFICAND_LIMIT_BITS]", () => {
  for (const significandLimitBits of [
    0,
    -1,
    1.5,
    NaN,
    MAX_SIGNIFICAND_LIMIT_BITS + 1,
  ]) {
    assert.throws(
      () =>
        checkContext({
          precision: 8,
          rounding: DEFAULT_ROUNDING,
          significandLimitBits,
          ceiling: DEFAULT_CEILING,
        }),
      RangeError,
      `${significandLimitBits}`,
    );
  }
  checkContext({
    precision: 8,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: 1,
    ceiling: DEFAULT_CEILING,
  });
  checkContext({
    precision: 8,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: MAX_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  });
  assert.equal(DEFAULT_SIGNIFICAND_LIMIT_BITS, 1 << 16);
  assert.equal(MAX_SIGNIFICAND_LIMIT_BITS, 1 << 20);
});

test("checkContext rejects a ceiling that is not an integer at or above the precision", () => {
  const at = (precision: number, ceiling: number) => ({
    precision,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling,
  });
  for (const ceiling of [7, 0, -1, 8.5, NaN, Infinity]) {
    assert.throws(() => checkContext(at(8, ceiling)), RangeError, `${ceiling}`);
  }
  // The precision may equal the ceiling: that is the schedule's last pass.
  checkContext(at(8, 8));
  checkContext(at(4040, 4040));
  checkContext(at(1, DEFAULT_CEILING));
});

test("ceilingContext is the context at its ceiling, the same for every precision under it", () => {
  const context = {
    precision: 8,
    rounding: "floor" as const,
    significandLimitBits: 4096,
    ceiling: 840,
  };
  assert.deepEqual(ceilingContext(context), { ...context, precision: 840 });
  assert.deepEqual(
    ceilingContext({ ...context, precision: 200 }),
    ceilingContext(context),
  );
  // At the ceiling already, the context itself.
  const top = { ...context, precision: 840 };
  assert.equal(ceilingContext(top), top);
  assert.equal(DEFAULT_CEILING, 4040);
  // In exact mode whatever the user's mode (devdocs/numbers.md, "Decimal
  // mode"): the table is built exactly, and a unit is settled in the
  // user's mode when looked up.
  assert.deepEqual(ceilingContext({ ...context, mode: "decimal" }), {
    ...context,
    precision: 840,
    mode: "exact",
  });
  assert.deepEqual(ceilingContext({ ...top, mode: "decimal" }), {
    ...top,
    mode: "exact",
  });
  assert.equal(ceilingContext({ ...top, mode: "exact" }).mode, "exact");
});

test("the mode is exact where none is given, and checkContext rejects a mode that is neither", () => {
  const context = {
    precision: 8,
    rounding: "floor" as const,
    significandLimitBits: 4096,
    ceiling: 840,
  };
  assert.equal(modeOf(context), "exact");
  assert.equal(modeOf({ ...context, mode: "exact" }), "exact");
  assert.equal(modeOf({ ...context, mode: "decimal" }), "decimal");
  assert.deepEqual(MODES, ["exact", "decimal"]);
  for (const mode of MODES) checkContext({ ...context, mode });
  for (const mode of ["approximate", "", "Exact", 1, null]) {
    assert.throws(
      () => checkContext({ ...context, mode: mode as never }),
      RangeError,
      String(mode),
    );
  }
});

test("the ceiling is four times the precision limit plus the guard", () => {
  assert.equal(GUARD_DIGITS, 10);
  assert.equal(DEFAULT_PRECISION_LIMIT_DIGITS, 1000);
  assert.equal(ceilingFor(DEFAULT_PRECISION_LIMIT_DIGITS), 4040);
  assert.equal(ceilingFor(1), 44);
  assert.equal(ceilingFor(200), 840);
});

test("precisionLimitFor is the largest precision limit whose ceiling fits half the significand limit", () => {
  for (const significandLimitBits of [
    DEFAULT_SIGNIFICAND_LIMIT_BITS,
    MAX_SIGNIFICAND_LIMIT_BITS,
    4096,
    1000,
  ]) {
    const limit = precisionLimitFor(significandLimitBits);
    assert.ok(limit >= 1, `${significandLimitBits}`);
    assert.ok(
      2 * bitsFor(ceilingFor(limit)) <= significandLimitBits,
      `${significandLimitBits}: ${limit} fits`,
    );
    assert.ok(
      2 * bitsFor(ceilingFor(limit + 1)) > significandLimitBits,
      `${significandLimitBits}: ${limit + 1} does not`,
    );
  }
  // About 2,450 at the default significand limit, so the default precision limit has room.
  const limit = precisionLimitFor(DEFAULT_SIGNIFICAND_LIMIT_BITS);
  assert.ok(limit > 2400 && limit < 2500, `${limit}`);
  assert.ok(DEFAULT_PRECISION_LIMIT_DIGITS <= limit);
  // A significand limit too small for any digits gives zero.
  assert.equal(precisionLimitFor(100), 0);
  assert.equal(precisionLimitFor(1), 0);
});

test("the working digits are an integer at or above the precision within the precision limit, and checkContext rejects the rest", () => {
  const decimal: NumberContext = {
    precision: 8,
    rounding: "halfEven",
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
    mode: "decimal",
  };
  for (const working of [8, 12, 100, DEFAULT_PRECISION_LIMIT_DIGITS]) {
    checkContext({ ...decimal, working });
  }
  for (const working of [
    7,
    0,
    -1,
    8.5,
    NaN,
    Infinity,
    DEFAULT_PRECISION_LIMIT_DIGITS + 1,
  ]) {
    assert.throws(
      () => checkContext({ ...decimal, working }),
      RangeError,
      `${working}`,
    );
  }
  // The same bounds in exact mode, where the field is carried and ignored.
  checkContext({ ...decimal, mode: "exact", working: 12 });
  assert.throws(
    () => checkContext({ ...decimal, mode: "exact", working: 7 }),
    RangeError,
  );
});

test("operandContext is the context at the working digits in decimal mode, and the context itself otherwise", () => {
  const decimal: NumberContext = {
    precision: 8,
    rounding: "floor",
    significandLimitBits: 4096,
    ceiling: 840,
    mode: "decimal",
  };
  const extended = { ...decimal, working: 12 };
  assert.deepEqual(operandContext(extended), { ...extended, precision: 12 });
  // Idempotent: an operand's operands are computed at the same context.
  const inner = operandContext(extended);
  assert.equal(operandContext(inner), inner);
  // Absent or equal to the precision, and in exact mode, the context itself.
  assert.equal(operandContext(decimal), decimal);
  const locked = { ...decimal, working: 8 };
  assert.equal(operandContext(locked), locked);
  const exact = { ...decimal, mode: "exact" as const, working: 12 };
  assert.equal(operandContext(exact), exact);
  const plain = { ...decimal, mode: undefined, working: 12 };
  assert.equal(operandContext(plain), plain);
});

test("a context derived at another precision does not carry the working digits", () => {
  const context: NumberContext = {
    precision: 8,
    rounding: "halfEven",
    significandLimitBits: 4096,
    ceiling: 840,
    mode: "decimal",
    working: 12,
  };
  const { working: _working, ...plain } = context;
  // The schedule's contexts, which the decimal mode's steps run through in
  // exact mode, and the ceiling context the table is built at.
  assert.deepEqual(workingContexts(context), workingContexts(plain));
  for (const each of workingContexts(context)) checkContext(each);
  assert.deepEqual(ceilingContext(context), ceilingContext(plain));
  assert.ok(!("working" in ceilingContext(context)));
  checkContext(ceilingContext(context));
  // At the ceiling in exact mode, the field still makes a new context.
  const top = {
    ...plain,
    mode: "exact" as const,
    precision: 840,
    working: 840,
  };
  assert.deepEqual(ceilingContext(top), {
    ...plain,
    mode: "exact",
    precision: 840,
  });
  assert.ok(!("working" in ceilingContext(top)));
});
