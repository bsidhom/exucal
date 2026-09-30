import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import { RADIAN, type BuiltinError } from "../builtin.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive, type Primitives } from "../dimension.ts";
import { show } from "../display.ts";
import { convertText, evaluateText } from "../pipeline.ts";
import {
  UNBOUNDED,
  compareRadius,
  radiusAbove,
  radiusAboveScaled,
  radiusUpper,
} from "../radius.ts";
import { LIMIT_BITS, rational } from "../rational.ts";
import type { Result } from "../result.ts";
import {
  ONE,
  ZERO,
  absolute,
  add,
  compare,
  equals,
  fromRational,
  multiply,
  negate,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball as ballOf, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import {
  acos,
  acosBall,
  asin,
  asinBall,
  atan,
  atan2,
  atan2Ball,
  atanBall,
} from "./inverse-trig.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** The default context: eight digits, the default range limit. */
const DEFAULT: NumberContext = { ...CONTEXT, precision: 8 };

/** A metre, a second and the radian kind, as units.txt declares them. */
const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  ["s", "dimension"],
  [RADIAN, "kind"],
]);

function value(result: Result<Ball, BuiltinError>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

function failure(result: Result<Ball, BuiltinError>): BuiltinError {
  assert.ok(!result.ok, inspect(result));
  return result.error;
}

/** `|a - b|` on `Scaled`s of moderate exponent. */
function distance(a: Scaled, b: Scaled): Scaled {
  const d = subtract(a, b, LIMIT_BITS);
  assert.ok(d.ok, `${inspect(a)} - ${inspect(b)} aligns`);
  return absolute(d.value);
}

/** `a + b` on `Scaled`s of moderate exponent. */
function plus(a: Scaled, b: Scaled): Scaled {
  const sum = add(a, b, LIMIT_BITS);
  assert.ok(sum.ok, `${inspect(a)} + ${inspect(b)} aligns`);
  return sum.value;
}

/** `s × num / den`. */
function scale(s: Scaled, num: bigint, den = 1n): Scaled {
  const product = multiply(s, fr(num, den));
  assert.ok(product.ok);
  return product.value;
}

/** The radius of the bounded `b` as a `Scaled`. */
function radiusOf(b: Ball): Scaled {
  return fromRational(radiusUpper(b.rad));
}

/** Asserts that `ball` contains `reference` and its radius is below `|reference| × 10^-digits`. */
function assertNear(
  ball: Ball,
  reference: Scaled,
  digits: number,
  label: string,
) {
  assert.ok(
    compare(distance(ball.mid, reference), radiusOf(ball)) <= 0,
    `${label}: midpoint`,
  );
  const bound = multiply(absolute(reference), dec(`1e-${digits}`));
  assert.ok(bound.ok);
  assert.ok(compare(radiusOf(ball), bound.value) < 0, `${label}: radius`);
}

/** A ball of `mid` with the radius `rad`, as decimals. */
function ball(mid: string, rad: string): Ball {
  return ballOf(dec(mid), dec(rad));
}

/** Whether the bounded radius of `b` is below the decimal `bound`, at any exponent. */
function radiusBelow(b: Ball, bound: string): boolean {
  return compareRadius(b.rad, radiusAboveScaled(dec(bound))) < 0;
}

// References from Python's decimal module, by its own reductions and
// series at a precision of 320 (fixed-trig.test.ts says how); the
// fractions of pi are from the pi reference of constants.test.ts.
const PI = dec(
  "3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844610",
);
const PI_OVER_2 = scale(PI, 1n, 2n);
const PI_OVER_4 = scale(PI, 1n, 4n);
const PI_OVER_6 = scale(PI, 1n, 6n);
const PI_OVER_3 = scale(PI, 1n, 3n);
const ASIN_0_3 = dec(
  "0.3046926540153975079720029612275291669545600317067763873929779487464729925120331594385999572313631487317349566307855469247966854234",
);
const ACOS_0_3 = dec(
  "1.266103672779499111259318730412222275144024667980776523094494347407435210631071339875417455439695385259339086625855606398750236881",
);
const ASIN_MINUS_0_75 = dec(
  "-0.8480620789814810080529443389984180800733662132631126428607181635702008212284742343491898017319572303009952272653075318338344538788",
);
const ACOS_MINUS_0_75 = dec(
  "2.418858405776377627284266030638169522171950912950665553348190459724109024371578733663207214403015764292069270521948685157381376184",
);
const ACOS_0_999 = dec(
  "0.04472508716873343124969623267155106990418055676215818283063770598116210048755344195836767648597939106723075958442507265744582295912",
);
const ASIN_NEAR_ONE = dec(
  "1.570796326794895205017759318544702640409860489871623210617838998472360966112531818863105132083775645841904131051717442776048642691",
);
const ACOS_NEAR_ONE = dec(
  "1.414213562373095048801688724209815929699869633297681547237030572680450912280587282888149169912204923710547498279614196494977245284e-15",
);
const ATAN_2_5 = dec(
  "1.190289949682531732927733774829318337601178986029452072911166673829707745314101396955153966575185598813039185930215474374731346632",
);
const ATAN2_3_4 = dec(
  "0.6435011087932843868028092287173226380415105911153123828656061187135124748116210887128168447012827488780143387542594782965352859415",
);
const ATAN2_1_MINUS_2 = dec(
  "2.677945044588987122248387151818288482168632345088985557164011503587618542120467293327434541357229175425618234262091469133588026428",
);

test("asin, acos and atan take a plain number to an angle, and atan2 two conforming quantities", () => {
  for (const [fn, name] of [
    [asin, "asin"],
    [acos, "acos"],
    [atan, "atan"],
  ] as const) {
    assert.equal(fn.name, name);
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.deepEqual(fn.dimensions([DIMENSIONLESS], PRIMITIVES), {
      ok: true,
      value: primitive(RADIAN),
    });
    const length = fn.dimensions([primitive("m")], PRIMITIVES);
    assert.ok(
      !length.ok &&
        length.error.kind === "argumentDimension" &&
        length.error.argument === 0 &&
        length.error.mismatch.kind === "dimensionMismatch",
    );
    const angle = fn.dimensions([primitive(RADIAN)], PRIMITIVES);
    assert.ok(
      !angle.ok &&
        angle.error.kind === "argumentDimension" &&
        angle.error.mismatch.kind === "kindMismatch",
    );
    assert.deepEqual(fn.dimensions([DIMENSIONLESS], new Map()), {
      ok: false,
      error: { kind: "noAngles" },
    });
    assert.equal(BUILTINS.get(name), fn);
  }
  assert.equal(atan2.name, "atan2");
  assert.deepEqual(atan2.arity, { min: 2, max: 2 });
  for (const dimension of [DIMENSIONLESS, primitive("m"), primitive(RADIAN)]) {
    assert.deepEqual(atan2.dimensions([dimension, dimension], PRIMITIVES), {
      ok: true,
      value: primitive(RADIAN),
    });
  }
  const mixed = atan2.dimensions([primitive("m"), primitive("s")], PRIMITIVES);
  assert.ok(
    !mixed.ok &&
      mixed.error.kind === "nonconformingArguments" &&
      mixed.error.left === 0 &&
      mixed.error.right === 1 &&
      mixed.error.mismatch.kind === "dimensionMismatch",
  );
  const kinds = atan2.dimensions(
    [primitive(RADIAN), DIMENSIONLESS],
    PRIMITIVES,
  );
  assert.ok(
    !kinds.ok &&
      kinds.error.kind === "nonconformingArguments" &&
      kinds.error.mismatch.kind === "kindMismatch",
  );
  assert.deepEqual(
    atan2.dimensions([DIMENSIONLESS, DIMENSIONLESS], new Map()),
    {
      ok: false,
      error: { kind: "noAngles" },
    },
  );
  assert.equal(BUILTINS.get("atan2"), atan2);
});

test("the exact cases: asin(0), atan(0), acos(1) and atan2(0, x) for a positive x, and their neighbors are inexact", () => {
  assert.deepEqual(value(asinBall(exact(ZERO), CONTEXT)), exact(ZERO));
  assert.deepEqual(value(atanBall(exact(ZERO), CONTEXT)), exact(ZERO));
  assert.deepEqual(value(acosBall(exact(ONE), CONTEXT)), exact(ZERO));
  assert.deepEqual(
    value(atan2Ball(exact(ZERO), exact(fr(2n)), CONTEXT)),
    exact(ZERO),
  );
  assert.deepEqual(
    value(atan2Ball(exact(ZERO), ball("2", "1"), CONTEXT)),
    exact(ZERO),
  );
  for (const near of [dec("1e-30"), dec("-1e-30")]) {
    assert.ok(!isExact(value(asinBall(exact(near), CONTEXT))));
    assert.ok(!isExact(value(atanBall(exact(near), CONTEXT))));
    assert.ok(!isExact(value(atan2Ball(exact(near), exact(ONE), CONTEXT))));
  }
  assert.ok(!isExact(value(acosBall(exact(dec("0.999999999")), CONTEXT))));
  assert.ok(!isExact(value(asinBall(ball("0", "1e-30"), CONTEXT))));
  // The ends of the domain are pi's memo, inexact.
  assertNear(value(asinBall(exact(ONE), CONTEXT)), PI_OVER_2, 45, "asin(1)");
  assertNear(
    value(asinBall(exact(negate(ONE)), CONTEXT)),
    negate(PI_OVER_2),
    45,
    "asin(-1)",
  );
  assertNear(value(acosBall(exact(negate(ONE)), CONTEXT)), PI, 45, "acos(-1)");
  assertNear(value(acosBall(exact(ZERO), CONTEXT)), PI_OVER_2, 45, "acos(0)");
});

test("the values are the kernel's, within the radius: fractions of pi and the references", () => {
  const half = exact(fr(1n, 2n));
  assertNear(value(atanBall(exact(ONE), CONTEXT)), PI_OVER_4, 45, "atan(1)");
  assertNear(value(asinBall(half, CONTEXT)), PI_OVER_6, 45, "asin(1/2)");
  assertNear(value(acosBall(half, CONTEXT)), PI_OVER_3, 45, "acos(1/2)");
  assertNear(
    value(asinBall(exact(dec("0.3")), CONTEXT)),
    ASIN_0_3,
    45,
    "asin(0.3)",
  );
  assertNear(
    value(acosBall(exact(dec("0.3")), CONTEXT)),
    ACOS_0_3,
    45,
    "acos(0.3)",
  );
  assertNear(
    value(asinBall(exact(dec("-0.75")), CONTEXT)),
    ASIN_MINUS_0_75,
    45,
    "asin(-0.75)",
  );
  assertNear(
    value(acosBall(exact(dec("-0.75")), CONTEXT)),
    ACOS_MINUS_0_75,
    45,
    "acos(-0.75)",
  );
  assertNear(
    value(acosBall(exact(dec("0.999")), CONTEXT)),
    ACOS_0_999,
    45,
    "acos(0.999)",
  );
  assertNear(
    value(atanBall(exact(dec("2.5")), CONTEXT)),
    ATAN_2_5,
    45,
    "atan(2.5)",
  );
  // Near the ends of the domain the digits are kept: acos(1 - 1e-30) is
  // about 1.4e-15 with a relative radius, and asin of it is pi/2 less that.
  const nearOne = exact(dec("0.999999999999999999999999999999"));
  assertNear(
    value(acosBall(nearOne, CONTEXT)),
    ACOS_NEAR_ONE,
    45,
    "acos(1 - 1e-30)",
  );
  assertNear(
    value(asinBall(nearOne, CONTEXT)),
    ASIN_NEAR_ONE,
    45,
    "asin(1 - 1e-30)",
  );
  // A tiny argument keeps its digits.
  const tiny = value(atanBall(exact(dec("1e-50")), CONTEXT));
  assertNear(tiny, dec("1e-50"), 40, "atan(1e-50)");
  assert.ok(compare(radiusOf(tiny), dec("1e-96")) < 0);
  assertNear(
    value(asinBall(exact(dec("1e-30")), CONTEXT)),
    dec(
      "1.0000000000000000000000000000000000000000000000000000000000001666667e-30",
    ),
    45,
    "asin(1e-30)",
  );
});

test("asin and acos of an argument whose square lies below the working bits are their expansion at zero", () => {
  // At the default range limit 1 - x^2 stops aligning below about 1e-9840,
  // and isTiny's 2^-maxBits is about 1e-19728, so these were refused (#47).
  for (const text of ["1e-9860", "8e-9865", "-1e-15000", "1e-20000"]) {
    const x = dec(text);
    const s = value(asinBall(exact(x), CONTEXT));
    assert.ok(equals(s.mid, x), `asin(${text})`);
    assert.ok(certifies(s, 40, "halfEven"), `asin(${text})`);
    const c = value(acosBall(exact(x), CONTEXT));
    const reference = subtract(PI_OVER_2, x, LIMIT_BITS);
    assert.ok(reference.ok);
    assertNear(c, reference.value, 45, `acos(${text})`);
  }
  // The expansion holds the working bits: the reference for asin(1e-30)
  // is 1e-30 + 1.67e-91, within the cube.
  assertNear(
    value(asinBall(exact(dec("1e-30")), CONTEXT)),
    dec(
      "1.0000000000000000000000000000000000000000000000000000000000001666667e-30",
    ),
    45,
    "asin(1e-30)",
  );
  // An argument beyond the exponent bound's reach for the square is a
  // value too: acos(1e-600000000000000000) is pi/2 less that.
  const far = value(acosBall(exact(dec("1e-600000000000000000")), CONTEXT));
  assertNear(far, PI_OVER_2, 45, "acos(1e-600000000000000000)");
  const nearer = value(asinBall(exact(dec("1e-600000000000000000")), CONTEXT));
  assert.ok(equals(nearer.mid, dec("1e-600000000000000000")));
  assert.ok(certifies(nearer, 40, "halfEven"));
  // Above the threshold the kernel answers: asin(1e-20) at forty digits
  // has a square of 1e-40, above 2^-165.
  assertNear(
    value(asinBall(exact(dec("1e-20")), CONTEXT)),
    dec("1.00000000000000000000000000000000000000001666666666666667e-20"),
    45,
    "asin(1e-20)",
  );
});

test("atan at or beyond 2^bits throughout is ±pi/2 within 2^-bits, and below 2^-maxBits is the argument within its cube", () => {
  /** pi/2 to forty digits, from Python's decimal module. */
  const halfPi = dec("1.5707963267948966192313216916397514420986");
  const far = value(atanBall(exact(dec("1e999999999")), DEFAULT));
  assert.ok(!isExact(far));
  assert.ok(compare(distance(far.mid, halfPi), dec("1e-17")) < 0);
  assert.ok(certifies(far, 8, "halfEven"));
  const negative = value(atanBall(exact(dec("-1e999999999")), DEFAULT));
  assert.ok(compare(distance(negative.mid, negate(halfPi)), dec("1e-17")) < 0);
  assert.ok(certifies(negative, 8, "halfEven"));
  // The saturation's radius is 2^-bits plus pi's, and a wide argument far
  // out keeps it.
  assert.ok(radiusBelow(far, "1e-17"));
  const wide = value(atanBall(ballOf(dec("1e100"), dec("1e90")), DEFAULT));
  assert.ok(compare(distance(wide.mid, halfPi), dec("1e-17")) < 0);
  assert.ok(certifies(wide, 8, "halfEven"));
  // Below the range limit's reciprocal, the argument itself within its cube.
  const tiny = dec("1e-999999999");
  const small = value(atanBall(exact(tiny), DEFAULT));
  assert.ok(!isExact(small));
  assert.ok(equals(small.mid, tiny));
  assert.ok(radiusBelow(small, "1e-2999999990"));
  assert.ok(
    compareRadius(small.rad, radiusAboveScaled(dec("1e-2999999998"))) > 0,
  );
  assert.ok(certifies(small, 8, "halfEven"));
  const asinSmall = value(asinBall(exact(tiny), DEFAULT));
  assert.ok(equals(asinSmall.mid, tiny));
  assert.ok(certifies(asinSmall, 8, "halfEven"));
  // A ball reaching 2^maxBits without lying beyond 2^bits throughout is
  // the whole range, zero within two, where the kernel's door refused it
  // at the range limit (#64).
  const wholeRange = { mid: ZERO, rad: radiusAbove(rational(2n)) };
  assert.deepEqual(
    value(atanBall(ballOf(ZERO, dec("1e19729")), DEFAULT)),
    wholeRange,
  );
  assert.deepEqual(
    value(atanBall(ball("1e19729", "2e19729"), DEFAULT)),
    wholeRange,
  );
  assert.deepEqual(value(atanBall(ball("1", "1e30000"), DEFAULT)), wholeRange);
  // atan2's ratio reaching it: the whole range, zero within four, for a
  // y straddling zero over a positive x, and unresolved at x for an x
  // straddling zero, whose width keeps the ratio from the kernel.
  const wholeRange2 = { mid: ZERO, rad: radiusAbove(rational(4n)) };
  assert.deepEqual(
    value(atan2Ball(ball("1", "1e30000"), exact(ONE), DEFAULT)),
    wholeRange2,
  );
  assert.deepEqual(
    value(atan2Ball(ball("1", "1e30000"), ball("2", "1"), DEFAULT)),
    wholeRange2,
  );
  for (const [y, x] of [
    [exact(dec("1e-30000")), ball("0", "1e-52")],
    [exact(ONE), ball("-1", "1e30000")],
    [exact(negate(ONE)), ball("1", "1e30000")],
  ] as const) {
    assert.deepEqual(failure(atan2Ball(y, x, DEFAULT)), {
      kind: "unresolved",
      argument: 1,
      edge: ZERO,
    });
  }
});

test("through the pipeline, atan and atan2 are never refused for a radius (#64)", () => {
  const parsed = parseDefinitions("m  !\nradian  !kind");
  assert.ok(parsed.ok);
  const context = { ...DEFAULT, ceiling: DEFAULT_CEILING };
  const table = buildTable(parsed.value, {
    ...context,
    precision: DEFAULT_CEILING,
  });
  assert.ok(table.ok, inspect(table));
  const at = (text: string) => evaluateText(table.value, text, context);
  // The argument's radius reaches past 2^maxBits at every pass up to the
  // ceiling, so the loop ends as a zero with a bound, the whole range.
  const wide = at("atan(approx(1e30000) - approx(1e30000))");
  assert.ok(wide.ok, inspect(wide));
  assert.equal(show(wide.value.magnitude, 8, DEFAULT_ROUNDING).kind, "zero");
  const ratio = at("atan2(approx(1e30000) - approx(1e30000) + 1, 1)");
  assert.ok(ratio.ok, inspect(ratio));
  assert.equal(show(ratio.value.magnitude, 8, DEFAULT_ROUNDING).kind, "zero");
  // With a radius the ceiling does narrow below the kernel's reach, the
  // same shape certifies: 1e3000's radius is 1e-1049 at the ceiling.
  const narrowed = at("atan2(approx(1e3000) - approx(1e3000) + 1, 1)");
  assert.ok(narrowed.ok, inspect(narrowed));
  assert.deepEqual(show(narrowed.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "0.78539816",
  });
  // An x straddling zero at every pass is unresolved at zero at the ceiling.
  const straddling = at("atan2(1e-30000, 1 - approx(1))");
  assert.ok(!straddling.ok);
  assert.equal(
    describeTextError(
      straddling.error,
      "atan2(1e-30000, 1 - approx(1))",
      table.value.primitives,
    ),
    '"1 - approx(1)" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
  );
});

test("an inexact argument's inverse contains those of its ends, and a wide one is the trivial bound", () => {
  const x = ball("0.5", "1e-20");
  // Over the derivatives: 1 / sqrt(1 - x^2) is 1.1547 at one half, and
  // 1 / (1 + x^2) is 0.8.
  const s = value(asinBall(x, CONTEXT));
  assertNear(s, PI_OVER_6, 19, "asin(0.5 ± 1e-20)");
  assert.ok(compare(radiusOf(s), dec("1.15e-20")) > 0);
  assert.ok(compare(radiusOf(s), dec("3e-20")) < 0);
  const c = value(acosBall(x, CONTEXT));
  assertNear(c, PI_OVER_3, 19, "acos(0.5 ± 1e-20)");
  assert.ok(compare(radiusOf(c), dec("1.15e-20")) > 0);
  assert.ok(compare(radiusOf(c), dec("3e-20")) < 0);
  const t = value(atanBall(x, CONTEXT));
  assert.ok(compare(radiusOf(t), dec("8e-21")) > 0);
  assert.ok(compare(radiusOf(t), dec("1.6e-20")) < 0);
  const wide = value(atanBall(ball("0", "10"), CONTEXT));
  assert.deepEqual(wide, { mid: ZERO, rad: radiusAbove(rational(2n)) });
  assert.deepEqual(value(atan2Ball(ball("0", "1"), exact(fr(2n)), CONTEXT)), {
    mid: ZERO,
    rad: radiusAbove(rational(2n)),
  });
});

test("asin and acos outside [-1, 1] are domain errors, and a ball reaching an end is unresolved at it", () => {
  for (const x of [
    exact(fr(2n)),
    exact(dec("-1.5")),
    ball("2", "0.5"),
    ball("-3", "1"),
    exact(dec("1.000000000000000000000000000001")),
  ]) {
    for (const fn of [asinBall, acosBall]) {
      assert.deepEqual(failure(fn(x, CONTEXT)), {
        kind: "domain",
        argument: 0,
        reason: "outsideClosedUnitInterval",
      });
    }
  }
  for (const [x, edge] of [
    [ball("1", "1e-10"), ONE],
    [ball("0.5", "0.5"), ONE],
    [ball("0.9", "0.2"), ONE],
    [ball("-1", "1e-10"), negate(ONE)],
    [ball("-0.5", "0.5"), negate(ONE)],
    [ball("-1.5", "0.6"), negate(ONE)],
  ] as const) {
    for (const fn of [asinBall, acosBall]) {
      assert.deepEqual(failure(fn(x, CONTEXT)), {
        kind: "unresolved",
        argument: 0,
        edge,
      });
    }
  }
  // A huge argument is the domain error, read off the argument's position
  // against the ends before its square is formed, where the square passed
  // the range limit or the exponent bound first (#47).
  for (const x of [
    exact(dec("1e30000")),
    exact(dec("-1e30000")),
    exact(dec("1e600000000000000000")),
    exact(dec("-1e600000000000000000")),
    ball("1e600000000000000000", "1e599999999999999999"),
  ]) {
    for (const fn of [asinBall, acosBall]) {
      assert.deepEqual(failure(fn(x, CONTEXT)), {
        kind: "domain",
        argument: 0,
        reason: "outsideClosedUnitInterval",
      });
    }
  }
  // A huge ball that reaches an end is unresolved at it, where its square
  // was refused as overflow: at 1 for a positive midpoint, at -1 for a
  // negative one, and at 1 for a ball around zero.
  const vast = ball("1e600000000000000000", "2e600000000000000000");
  for (const [x, edge] of [
    [vast, ONE],
    [{ mid: negate(vast.mid), rad: vast.rad }, negate(ONE)],
    [ballOf(ZERO, dec("1e600000000000000000")), ONE],
  ] as const) {
    for (const fn of [asinBall, acosBall]) {
      assert.deepEqual(failure(fn(x, CONTEXT)), {
        kind: "unresolved",
        argument: 0,
        edge,
      });
    }
  }
  // A ball close to one whose complement is positive resolves, since the
  // complement is formed on the ball and its root is scaled to order one:
  // 1 - x^2 is about 2e-60 ± 2e-70, and so does an exact value there.
  const near = ball(
    "0.999999999999999999999999999999999999999999999999999999999999",
    "1e-70",
  );
  assert.ok(asinBall(near, CONTEXT).ok && acosBall(near, CONTEXT).ok);
  const close = exact(
    dec("0.999999999999999999999999999999999999999999999999999999999999"),
  );
  assert.ok(asinBall(close, CONTEXT).ok);
  assertNear(
    value(acosBall(close, CONTEXT)),
    dec("1.4142135623730950488016887242096980785696718753769480731766797e-30"),
    30,
    "acos(1 - 1e-60)",
  );
});

test("atan2 by quadrant, its exact and unresolved cases, and the origin", () => {
  const three = exact(fr(3n));
  const four = exact(fr(4n));
  assertNear(
    value(atan2Ball(three, four, CONTEXT)),
    ATAN2_3_4,
    45,
    "atan2(3, 4)",
  );
  assertNear(
    value(atan2Ball(exact(ONE), exact(fr(-2n)), CONTEXT)),
    ATAN2_1_MINUS_2,
    45,
    "atan2(1, -2)",
  );
  assertNear(
    value(atan2Ball(exact(negate(ONE)), exact(fr(-2n)), CONTEXT)),
    negate(ATAN2_1_MINUS_2),
    45,
    "atan2(-1, -2)",
  );
  for (const [y, x, reference] of [
    ["1", "1", PI_OVER_4],
    ["-1", "1", negate(PI_OVER_4)],
    ["1", "-1", scale(PI, 3n, 4n)],
    ["-1", "-1", scale(PI, -3n, 4n)],
    ["1", "0", PI_OVER_2],
    ["-1", "0", negate(PI_OVER_2)],
    ["0", "-1", PI],
    // atan(y / x) + pi, with atan(-2e30) a hair above -pi/2.
    ["2", "-1e-30", plus(PI_OVER_2, dec("5e-31"))],
  ] as const) {
    assertNear(
      value(atan2Ball(exact(dec(y)), exact(dec(x)), CONTEXT)),
      reference,
      44,
      `atan2(${y}, ${x})`,
    );
  }
  // Against atan: the same ratio in the first quadrant, and its
  // quantities' scale cancels.
  const ratio = value(atanBall(exact(fr(3n, 4n)), CONTEXT));
  const scaled = value(atan2Ball(exact(fr(300n)), exact(fr(400n)), CONTEXT));
  assert.ok(compare(distance(ratio.mid, scaled.mid), dec("1e-45")) < 0);
  // A straddling x with a y of definite sign is pi/2 less atan(x / y).
  const straddling = value(
    atan2Ball(exact(fr(2n)), ball("0", "1e-30"), CONTEXT),
  );
  assertNear(straddling, PI_OVER_2, 30, "atan2(2, 0 ± 1e-30)");
  assert.ok(compare(radiusOf(straddling), dec("4.9e-31")) > 0);
  assert.ok(compare(radiusOf(straddling), dec("6e-31")) < 0);
  // A straddling y with an x not positive throughout is unresolved at y.
  for (const x of [
    exact(negate(ONE)),
    ball("-1", "0.5"),
    ball("0", "1"),
    exact(ZERO),
  ]) {
    assert.deepEqual(failure(atan2Ball(ball("0", "1"), x, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: ZERO,
    });
  }
  // A y of exactly zero: the sign of x decides.
  assertNear(
    value(atan2Ball(exact(ZERO), ball("-1", "0.5"), CONTEXT)),
    PI,
    45,
    "atan2(0, -1 ± 0.5)",
  );
  assert.deepEqual(failure(atan2Ball(exact(ZERO), ball("0", "1"), CONTEXT)), {
    kind: "unresolved",
    argument: 1,
    edge: ZERO,
  });
  assert.deepEqual(failure(atan2Ball(exact(ZERO), exact(ZERO), CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "origin",
  });
});

test("atan2 compares magnitudes before forming a ratio: the quadrants at both extremes, and a tiny ratio keeps its value (#47)", () => {
  /** pi and pi/2 to forty digits, from Python's decimal module. */
  const piDigits = dec("3.141592653589793238462643383279502884197");
  const halfPi = dec("1.570796326794896619231321691639751442099");
  const huge = "1e600000000000000000";
  const tinyText = "1e-600000000000000000";
  for (const [y, x, reference] of [
    ["1e30000", "1", halfPi],
    ["-1e30000", "1", negate(halfPi)],
    ["1e30000", "-1", halfPi],
    ["-1e30000", "-1", negate(halfPi)],
    ["1", "1e-30000", halfPi],
    [huge, tinyText, halfPi],
    [`-${huge}`, `-${tinyText}`, negate(halfPi)],
    ["1", "0", halfPi],
    ["-1", "0", negate(halfPi)],
    ["1", "-1e30000", piDigits],
    ["-1", "-1e30000", negate(piDigits)],
    ["1", "-1e999999999999999999", piDigits],
    ["1e-999999999999999999", "-1", piDigits],
    [tinyText, `-${huge}`, piDigits],
    [`-${tinyText}`, `-${huge}`, negate(piDigits)],
  ] as const) {
    const at = value(atan2Ball(exact(dec(y)), exact(dec(x)), DEFAULT));
    assert.ok(
      compare(distance(at.mid, reference), dec("2e-17")) < 0,
      `atan2(${y}, ${x})`,
    );
    assert.ok(radiusBelow(at, "2e-17"), `atan2(${y}, ${x})`);
    assert.ok(certifies(at, 8, "halfEven"), `atan2(${y}, ${x})`);
  }
  // The saturation's radius: 2^-bits beside pi's, at forty digits.
  const far = value(atan2Ball(exact(dec("1e30000")), exact(ONE), CONTEXT));
  assert.ok(radiusBelow(far, "1e-48"));
  // Just inside the comparison the ratio is formed and the kernel
  // answers: |y| = |x| 2^160 at 165 bits is not 2^165.
  const inside = value(atan2Ball(exact(fr(1n << 160n)), exact(ONE), CONTEXT));
  assert.ok(compare(distance(inside.mid, PI_OVER_2), dec("1e-47")) < 0);
  assert.ok(compare(distance(inside.mid, PI_OVER_2), dec("6e-49")) > 0);
  // A tiny ratio over a positive x is itself within its cube, in both
  // signs, where it went into the kernel as zero within an ulp.
  for (const [y, x] of [
    ["1e-999999999999999999", "1"],
    ["-1e-999999999999999999", "1"],
    ["1", "1e30000"],
    ["-1", "1e30000"],
    ["1e-30000", "2"],
  ] as const) {
    const at = value(atan2Ball(exact(dec(y)), exact(dec(x)), DEFAULT));
    const ratio = value(atanBall(exact(dec(y)), DEFAULT));
    if (x === "1") assert.deepEqual(at, ratio, `atan2(${y}, ${x})`);
    assert.ok(certifies(at, 8, "halfEven"), `atan2(${y}, ${x})`);
  }
  // A ratio past the exponent bound is the quotient's refusal, since its
  // value cannot be written.
  assert.deepEqual(
    failure(atan2Ball(exact(dec(`-${tinyText}`)), exact(dec(huge)), DEFAULT)),
    { kind: "underflow" },
  );
  // A wide x with a y of definite sign is still pi/2 less atan(x / y)
  // where |y| is not |x| 2^bits: 2 against 0 ± 1e-30 at forty digits.
  const straddling = value(
    atan2Ball(exact(fr(2n)), ball("0", "1e-30"), CONTEXT),
  );
  assert.ok(compare(radiusOf(straddling), dec("4.9e-31")) > 0);
});

test("an unbounded argument gives the function of its midpoint with an unbounded radius", () => {
  const half = { mid: fr(1n, 2n), rad: UNBOUNDED };
  for (const [result, reference] of [
    [asinBall(half, CONTEXT), PI_OVER_6],
    [acosBall(half, CONTEXT), PI_OVER_3],
    [
      atan2Ball(half, exact(ONE), CONTEXT),
      dec("0.4636476090008061162142562314612144020285370542861202638109330887"),
    ],
    [
      atan2Ball(exact(ONE), half, CONTEXT),
      dec("1.1071487177940905030170654601785370400700476454014326466765392074"),
    ],
    [atan2Ball(half, half, CONTEXT), PI_OVER_4],
  ] as const) {
    const at = value(result);
    assert.deepEqual(at.rad, UNBOUNDED);
    assert.ok(compare(distance(at.mid, reference), dec("1e-40")) < 0);
  }
  const unboundedAtan = value(atanBall({ mid: ONE, rad: UNBOUNDED }, CONTEXT));
  assert.deepEqual(unboundedAtan.rad, UNBOUNDED);
  assert.ok(compare(distance(unboundedAtan.mid, PI_OVER_4), dec("1e-40")) < 0);
  // The midpoint is still held to the domain.
  assert.deepEqual(
    failure(asinBall({ mid: fr(2n), rad: UNBOUNDED }, CONTEXT)),
    {
      kind: "domain",
      argument: 0,
      reason: "outsideClosedUnitInterval",
    },
  );
});

test("through the pipeline: asin(0.5) into deg is 30, atan2(3 m, 4 m) is an angle, asin(sin(0.5 radian)) certifies thirty digits, and the errors are worded", () => {
  const parsed = parseDefinitions(
    readFileSync(new URL("../../units.txt", import.meta.url), "utf8"),
  );
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const at = (text: string, precision: number) =>
    evaluateText(table.value, text, { ...context, precision });
  for (const [have, want, digits] of [
    ["asin(0.5)", "deg", "30"],
    ["acos(0.5)", "deg", "60"],
    ["atan(1)", "deg", "45"],
    ["atan2(3 m, 4 m)", "deg", "36.869898"],
    ["atan2(1 m, -2 m)", "radian", "2.677945"],
    ["asin(0.5)", "turn", "0.083333333"],
    ["asin(3 m / 5 m)", "deg", "36.869898"],
    ["acos(1 - 1e-30)", "radian", "1.4142136e-15"],
    // #47's tiny rows of acos: pi/2 less the argument.
    ["acos(1e-20000)", "radian", "1.5707963"],
    ["acos(1e-999999999)", "radian", "1.5707963"],
    ["acos(1e-600000000000000000)", "radian", "1.5707963"],
    ["asin(1e-9860)", "radian", "1e-9860"],
    ["atan(1e999999999)", "deg", "90"],
    ["atan(-1e999999999)", "radian", "-1.5707963"],
    ["atan(1e-999999999)", "radian", "1e-999999999"],
    // #47's atan2 rows: the ratio's magnitude decides, and no ratio is
    // formed where it cannot be (the crash rows threw in the kernel's
    // door before H.2, and went in as zero within an ulp after it).
    ["atan2(1e-999999999999999999, -1)", "radian", "3.1415927"],
    ["atan2(1, -1e999999999999999999)", "radian", "3.1415927"],
    ["atan2(1e30000, 1)", "radian", "1.5707963"],
    ["atan2(1, 1e-30000)", "radian", "1.5707963"],
    ["atan2(1e600000000000000000, 1e-600000000000000000)", "deg", "90"],
    ["atan2(1e-999999999999999999, 1)", "radian", "1e-999999999999999999"],
    ["atan2(-1, -1e30000)", "deg", "-180"],
  ]) {
    const result = convertText(table.value, have!, want!, {
      ...context,
      precision: 8,
    });
    assert.ok(
      result.ok && result.value.kind === "unit",
      `${have}: ${inspect(result)}`,
    );
    const shown = show(result.value.value, 8, DEFAULT_ROUNDING);
    assert.equal(shown.kind, "certified", have);
    assert.equal(shown.text, digits, have);
  }
  const roundTrip = at("asin(sin(0.5 radian))", 30);
  assert.ok(roundTrip.ok, inspect(roundTrip));
  assert.deepEqual(roundTrip.value.dimension, primitive(RADIAN));
  assert.equal(
    show(roundTrip.value.magnitude, 30, DEFAULT_ROUNDING).text,
    "0.5",
  );
  const other = at("sin(asin(0.5))", 30);
  assert.ok(
    other.ok &&
      show(other.value.magnitude, 30, DEFAULT_ROUNDING).text === "0.5",
  );
  const exactZero = at("atan2(0 s, 2 s) m", 8);
  assert.ok(exactZero.ok && isExact(exactZero.value.magnitude));
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "asin(2)",
      'Cannot compute "asin(2)": "2" lies outside [-1, 1], where "asin" is defined.',
    ],
    [
      "asin(1e30000)",
      'Cannot compute "asin(1e30000)": "1e30000" lies outside [-1, 1], where "asin" is defined.',
    ],
    [
      "acos(1e600000000000000000)",
      'Cannot compute "acos(1e600000000000000000)": "1e600000000000000000" lies outside [-1, 1], where "acos" is defined.',
    ],
    [
      "acos(-1.5)",
      'Cannot compute "acos(-1.5)": "-1.5" lies outside [-1, 1], where "acos" is defined.',
    ],
    [
      "atan2(0, 0)",
      'Cannot compute "atan2(0, 0)": both arguments are zero, and the origin has no direction.',
    ],
    [
      "atan2(3 m, 4 s)",
      'Cannot apply "atan2" to "3 m" and "4 s": "3 m" has dimension m, but "4 s" has dimension s.',
    ],
    [
      "atan2(1 radian, 1)",
      'Cannot apply "atan2" to "1 radian" and "1": "1 radian" (radian) and "1" (1) differ in kind: radian.',
    ],
    [
      "asin(1 m)",
      'Cannot apply "asin" to "1 m": "1 m" has dimension m, but the argument of "asin" must be a plain number.',
    ],
    [
      "atan(1 radian)",
      'Cannot apply "atan" to "1 radian": "1 radian" has dimension radian, but the argument of "atan" must be a plain number.',
    ],
    [
      "2 asin(0.5) + 1",
      'Cannot add "2 asin(0.5)" and "1": "2 asin(0.5)" (radian) and "1" (1) differ in kind: radian.',
    ],
    [
      "asin(1 + ((2^(1/2))^2 - 2))",
      '"1 + ((2^(1/2))^2 - 2)" cannot be told from 1 at this precision, and the result depends on which side of 1 it lies.',
    ],
    [
      "acos(-1 - ((2^(1/2))^2 - 2))",
      '"-1 - ((2^(1/2))^2 - 2)" cannot be told from -1 at this precision, and the result depends on which side of -1 it lies.',
    ],
    [
      "atan2((2^(1/2))^2 - 2, -1)",
      '"(2^(1/2))^2 - 2" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
    ],
    [
      "asin(0.5, 1)",
      '"asin" takes 1 argument, but "asin(0.5, 1)" gives 2 arguments.',
    ],
  ]) {
    const result = at(text!, 8);
    assert.ok(!result.ok, text);
    assert.equal(
      describeTextError(result.error, text!, primitives),
      message,
      text,
    );
  }
});
