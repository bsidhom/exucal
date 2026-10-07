import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, containsZero, position } from "./ball.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  workingDigits,
  type NumberContext,
} from "./context.ts";
import { floatingToBall } from "./digits.ts";
import {
  fixedFromRational,
  fixedToBall,
  floatingToFixed,
  type Floating,
} from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import { compare, rational } from "./rational.ts";
import { ROUNDING_MODES } from "./rounding.ts";
import { equals, format, type Scaled } from "./scaled.ts";
import {
  between,
  foldIn,
  key,
  randomBigInt,
  uniform,
} from "../testing/random.ts";
import { dec, digitsOf } from "../testing/scaled.ts";

/** A context at `precision` digits with the default limits. */
function at(precision: number): NumberContext {
  return {
    precision,
    rounding: DEFAULT_ROUNDING,
    significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
    ceiling: DEFAULT_CEILING,
  };
}

/** `m × 2^exp` with `m` an exact integer, as a `Floating` of 64 fraction bits. */
function floating(m: bigint, exp: bigint, error = 0n): Floating {
  return { significand: { value: m << 64n, error, bits: 64 }, exp };
}

function unwrap<T, E>(
  result: { ok: true; value: T } | { ok: false; error: E },
): T {
  assert.ok(result.ok, `expected success, got ${inspect(result)}`);
  return result.value;
}

/** Whether `s` agrees with the reference `text` to `digits` significant digits, both rounded half even. */
function agrees(s: Scaled, text: string, digits: number): boolean {
  return (
    format(s, digits, "halfEven") === format(dec(text), digits, "halfEven")
  );
}

// Reference digits from Python's decimal module at a precision of 70:
// 2^1442695, 2^-1442695, 3 × 2^1442695 and 7 × 2^(3 × 10^18).
const TWO_UP =
  "2.948454616339820117304019098684711546522729178349697929658851384553429e434294";
const TWO_DOWN =
  "3.391607231999349055801380422593808005380140588280650392016934379837722e-434295";
const THREE_TWO_UP =
  "8.845363849019460351912057296054134639568187535049093788976554153660287e434294";
const SEVEN_FAR =
  "3.064183179177493984966931430417643166722414753806577472025862219424364e903089986991943586";

test("the digits of a Floating beyond the significand limit are found in log space, to the working digits", () => {
  for (const [fl, reference] of [
    [floating(1n, 1442695n), TWO_UP],
    [floating(1n, -1442695n), TWO_DOWN],
    [floating(3n, 1442695n), THREE_TWO_UP],
    [floating(7n, 3n * 10n ** 18n), SEVEN_FAR],
    [floating(-3n, 1442695n), `-${THREE_TWO_UP}`],
  ] as const) {
    for (const precision of [8, 30, 60]) {
      const context = at(precision);
      const b = unwrap(floatingToBall(fl, context));
      const label = `${inspect(fl.exp)} at ${precision}`;
      assert.ok(
        agrees(b.mid, reference, precision),
        `${label}: ${format(b.mid, precision, "halfEven")}`,
      );
      assert.ok(certifies(b, precision, "halfEven"), `${label}: certifies`);
      assert.ok(digitsOf(b.mid) <= workingDigits(context), label);
      // The reference lies within the ball, by the boundary check of
      // every mode: it is not on any rounding boundary at these digits.
      for (const mode of ROUNDING_MODES) {
        assert.equal(
          format(b.mid, precision, mode),
          format(dec(reference), precision, mode),
          `${label} in ${mode}`,
        );
      }
      assert.equal(position(b, dec(reference)), "straddles", label);
    }
  }
});

test("the log-space digits agree with the exact conversion on every value both can form", () => {
  // Powers of two on both sides of the significand limit: exact within it, in
  // log space beyond it, and the two agree to the working digits; the
  // references from Python's decimal module at a precision of 70.
  for (const [exp, reference] of [
    [
      100000n,
      "9.990020930143845079440327643300335909804291390541816917715292738631458e30102",
    ],
    [
      -100000n,
      "1.000998903798694166816264713193306248499347508305780049202833380079759e-30103",
    ],
    [
      65536n,
      "2.003529930406846464979072351560255750447825475569751419265016973710894e19728",
    ],
    [
      65537n,
      "4.007059860813692929958144703120511500895650951139502838530033947421788e19728",
    ],
    [
      -65536n,
      "4.991190722051929465659057479213245197374677042320767416142504033616313e-19729",
    ],
  ] as const) {
    const fl = floating(1n, exp);
    const context = at(30);
    const exact = floatingToFixed(fl, DEFAULT_SIGNIFICAND_LIMIT_BITS);
    const b = unwrap(floatingToBall(fl, context));
    assert.ok(
      agrees(b.mid, reference, 30),
      `2^${exp}: ${format(b.mid, 30, "halfEven")}`,
    );
    if (exact !== undefined) {
      // Within the limit: the exact conversion, to the last digit.
      assert.deepEqual(
        b,
        fixedToBall(exact, workingDigits(context)),
        `2^${exp} exactly`,
      );
    } else {
      // Beyond it: the same digits as the exact conversion at a wider
      // limit, within the log-space radius.
      const wide = floatingToFixed(fl, 1 << 20);
      assert.ok(wide !== undefined);
      const reference30 = fixedToBall(wide, workingDigits(context));
      assert.ok(
        agrees(b.mid, format(reference30.mid, 40, "halfEven"), 30),
        `2^${exp} against the wide conversion`,
      );
      assert.ok(certifies(b, 30, "halfEven"));
    }
  }
  // The limit is the significand limit of the context: 2^65537 is exact at a
  // wider one.
  const wider = { ...at(30), significandLimitBits: 1 << 17 };
  const b = unwrap(floatingToBall(floating(1n, 65537n), wider));
  assert.deepEqual(
    b,
    fixedToBall(
      floatingToFixed(floating(1n, 65537n), 1 << 17)!,
      workingDigits(wider),
    ),
  );
});

test("the log-space ball contains the value and carries the significand's error, over seeded values drawn by key", () => {
  const root = key(4901);
  for (let i = 0; i < 40; i++) {
    // The significand's width, its bits, the exponent's magnitude and sign,
    // and the error, each from its own fold.
    const k = foldIn(root, i);
    const width = between(foldIn(k, 0), 1, 60);
    const m = randomBigInt(foldIn(k, 1), width) | 1n;
    const magnitude = randomBigInt(foldIn(k, 2), 19) + 70000n;
    const exp = uniform(foldIn(k, 3)) < 0.5 ? magnitude : -magnitude;
    const error = randomBigInt(foldIn(k, 4), 4);
    const fl: Floating = {
      significand: { value: m << 64n, error, bits: 64 },
      exp,
    };
    const context = at(20);
    const b = unwrap(floatingToBall(fl, context));
    const label = `${m} × 2^${exp} ± ${error} ulps`;
    // The wide exact conversion's midpoint, `m × 2^exp` itself, lies in
    // the ball, and the ball's radius covers the error at the exponent.
    const wide = floatingToFixed(
      { ...fl, significand: { ...fl.significand, error: 0n } },
      1 << 20,
    );
    assert.ok(wide !== undefined, label);
    const exact = fixedToBall(wide, 60);
    assert.notEqual(position(b, exact.mid), "above", label);
    assert.notEqual(position(b, exact.mid), "below", label);
    assert.ok(certifies(b, 20, "halfEven") || error > 0n, label);
    assert.ok(!containsZero(b), label);
  }
  // A significand whose interval reaches zero: a ball around zero bounded by
  // the extent at the exponent.
  const zero = unwrap(floatingToBall(floating(2n, 100000n, 3n << 64n), at(8)));
  assert.ok(containsZero(zero));
  assert.ok(equals(zero.mid, dec("0")));
  // (2 + 3) × 2^100000, at least.
  assert.ok(compare(radiusUpper(zero.rad), rational(5n * 2n ** 100000n)) >= 0);
});

test("the log-space digits hold the decimal exponent to the bound by the interval of t (D18, #61)", () => {
  // 2^3321928094887362351 is 10^(10^18 + 0.94…): a significand of one is
  // within the top, of two is past it (10^(10^18 + 1.24…)), and one of
  // one within a half reaches both sides of the edge.
  const top = 3321928094887362351n;
  const within = unwrap(floatingToBall(floating(1n, top), at(8)));
  assert.equal(format(within.mid, 2, "halfEven"), "8.8e+1000000000000000000");
  assert.deepEqual(floatingToBall(floating(2n, top), at(8)), {
    ok: false,
    error: { kind: "overflow" },
  });
  assert.deepEqual(floatingToBall(floating(1n, top, 1n << 63n), at(8)), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
  // At the bottom: 2^-3321928094887362347 is 10^-(10^18 - 0.26…), within,
  // and half of it past; a wide significand reaches both.
  const bottom = -3321928094887362347n;
  const above = unwrap(floatingToBall(floating(1n, bottom), at(8)));
  assert.equal(format(above.mid, 2, "halfEven"), "1.8e-1000000000000000000");
  assert.deepEqual(floatingToBall(floating(1n, bottom - 1n), at(8)), {
    ok: false,
    error: { kind: "underflow" },
  });
  assert.deepEqual(floatingToBall(floating(1n, bottom, 1n << 63n), at(8)), {
    ok: false,
    error: { kind: "unresolved", edge: "bound" },
  });
});

test("a decimal exponent beyond the bound is an overflow or an underflow, and the exact path rounds a value of the significand limit's size", () => {
  const huge = floatingToBall(floating(1n, 4n * 10n ** 18n), at(8));
  assert.deepEqual(huge, {
    ok: false,
    error: { kind: "overflow" },
  });
  const tiny = floatingToBall(floating(1n, -4n * 10n ** 18n), at(8));
  assert.deepEqual(tiny, {
    ok: false,
    error: { kind: "underflow" },
  });
  // Within the significand limit the exact path rounds onto the grid.
  const b = unwrap(floatingToBall(floating(3n, 60000n), at(8)));
  assert.ok(
    agrees(
      b.mid,
      format(
        fixedToBall(fixedFromRational(rational(3n * 2n ** 60000n), 0), 18).mid,
        18,
        "halfEven",
      ),
      18,
    ),
  );
});
