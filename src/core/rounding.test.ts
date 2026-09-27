import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ROUNDING_MODES,
  divideRounded,
  type RoundingMode,
} from "./rounding.ts";

/** The quotients the table below is over, as `[num, den]`. */
const QUOTIENTS: readonly (readonly [bigint, bigint])[] = [
  [7n, 2n],
  [-7n, 2n],
  [5n, 2n],
  [-5n, 2n],
  [1n, 3n],
  [-1n, 3n],
  [2n, 3n],
  [-2n, 3n],
  [1n, 2n],
  [-1n, 2n],
];

/**
 * Every mode on every quotient, written out. The columns are the
 * `QUOTIENTS` in order: 7/2, -7/2, 5/2, -5/2, 1/3, -1/3, 2/3, -2/3, 1/2,
 * -1/2.
 */
const TABLE: Record<RoundingMode, readonly bigint[]> = {
  halfEven: [4n, -4n, 2n, -2n, 0n, 0n, 1n, -1n, 0n, 0n],
  halfAwayFromZero: [4n, -4n, 3n, -3n, 0n, 0n, 1n, -1n, 1n, -1n],
  halfTowardZero: [3n, -3n, 2n, -2n, 0n, 0n, 1n, -1n, 0n, 0n],
  towardZero: [3n, -3n, 2n, -2n, 0n, 0n, 0n, 0n, 0n, 0n],
  awayFromZero: [4n, -4n, 3n, -3n, 1n, -1n, 1n, -1n, 1n, -1n],
  ceiling: [4n, -3n, 3n, -2n, 1n, 0n, 1n, 0n, 1n, 0n],
  floor: [3n, -4n, 2n, -3n, 0n, -1n, 0n, -1n, 0n, -1n],
};

test("ROUNDING_MODES lists the seven modes once each, to nearest first", () => {
  assert.deepEqual(ROUNDING_MODES, [
    "halfEven",
    "halfAwayFromZero",
    "halfTowardZero",
    "towardZero",
    "awayFromZero",
    "ceiling",
    "floor",
  ]);
  assert.deepEqual(new Set(ROUNDING_MODES).size, ROUNDING_MODES.length);
  assert.deepEqual(Object.keys(TABLE).sort(), [...ROUNDING_MODES].sort());
});

test("every mode on every quotient of the table", () => {
  for (const mode of ROUNDING_MODES) {
    const row = TABLE[mode];
    assert.equal(row.length, QUOTIENTS.length);
    QUOTIENTS.forEach(([num, den], i) => {
      assert.equal(
        divideRounded(num, den, mode),
        row[i],
        `${num}/${den} under ${mode}`,
      );
    });
  }
});

test("an exact quotient is itself in every mode", () => {
  for (const mode of ROUNDING_MODES) {
    assert.equal(divideRounded(6n, 3n, mode), 2n, mode);
    assert.equal(divideRounded(-6n, 3n, mode), -2n, mode);
    assert.equal(divideRounded(0n, 7n, mode), 0n, mode);
    assert.equal(divideRounded(5n, 1n, mode), 5n, mode);
    assert.equal(divideRounded(-5n, 1n, mode), -5n, mode);
    assert.equal(divideRounded(10n ** 30n, 10n ** 10n, mode), 10n ** 20n, mode);
  }
});

test("halfEven takes the even neighbour on a tie, and the nearer one otherwise", () => {
  assert.equal(divideRounded(5n, 2n, "halfEven"), 2n);
  assert.equal(divideRounded(7n, 2n, "halfEven"), 4n);
  assert.equal(divideRounded(-5n, 2n, "halfEven"), -2n);
  assert.equal(divideRounded(-7n, 2n, "halfEven"), -4n);
  // 0.5 → 0, 1.5 → 2, 2.5 → 2, 3.5 → 4: the evens.
  assert.deepEqual(
    [1n, 3n, 5n, 7n].map((num) => divideRounded(num, 2n, "halfEven")),
    [0n, 2n, 2n, 4n],
  );
  // Not a tie: 2.51 → 3 and 2.49 → 2, whichever way the tie would go.
  assert.equal(divideRounded(251n, 100n, "halfEven"), 3n);
  assert.equal(divideRounded(249n, 100n, "halfEven"), 2n);
  assert.equal(divideRounded(349n, 100n, "halfEven"), 3n);
});

test("ceiling and floor go up and down the number line on negatives", () => {
  assert.equal(divideRounded(-1n, 3n, "ceiling"), 0n);
  assert.equal(divideRounded(-1n, 3n, "floor"), -1n);
  assert.equal(divideRounded(-7n, 2n, "ceiling"), -3n);
  assert.equal(divideRounded(-7n, 2n, "floor"), -4n);
  assert.equal(divideRounded(-1n, 10n ** 20n, "ceiling"), 0n);
  assert.equal(divideRounded(-1n, 10n ** 20n, "floor"), -1n);
  // Whereas toward and away from zero are symmetric in the sign.
  for (const mode of ["towardZero", "awayFromZero"] as const) {
    for (const [num, den] of QUOTIENTS) {
      assert.equal(
        divideRounded(-num, den, mode),
        -divideRounded(num, den, mode),
        `${num}/${den} under ${mode}`,
      );
    }
  }
});

test("the modes agree with their definitions on large values", () => {
  const den = 10n ** 20n;
  const half = den / 2n;
  const big = 10n ** 40n + 3n * den; // 10^20 + 3, exactly
  assert.equal(divideRounded(big, den, "halfEven"), 10n ** 20n + 3n);
  // A tie just above a huge even integer.
  assert.equal(divideRounded(big + half, den, "halfEven"), 10n ** 20n + 4n);
  assert.equal(
    divideRounded(big + half, den, "halfTowardZero"),
    10n ** 20n + 3n,
  );
  assert.equal(
    divideRounded(big + half, den, "halfAwayFromZero"),
    10n ** 20n + 4n,
  );
  assert.equal(divideRounded(big + 1n, den, "towardZero"), 10n ** 20n + 3n);
  assert.equal(divideRounded(big + 1n, den, "awayFromZero"), 10n ** 20n + 4n);
  assert.equal(divideRounded(big + 1n, den, "floor"), 10n ** 20n + 3n);
  assert.equal(divideRounded(big + 1n, den, "ceiling"), 10n ** 20n + 4n);
  assert.equal(divideRounded(-(big + 1n), den, "floor"), -(10n ** 20n) - 4n);
  assert.equal(divideRounded(-(big + 1n), den, "ceiling"), -(10n ** 20n) - 3n);
});

test("a non-positive divisor is a programming error", () => {
  assert.throws(() => divideRounded(1n, 0n, "halfEven"), RangeError);
  assert.throws(() => divideRounded(1n, -2n, "floor"), RangeError);
});
