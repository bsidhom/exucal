import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import type { Ball } from "./ball.ts";
import {
  expFixed,
  sinhCoshFixed,
  tanhFixed,
  type SinhCosh,
} from "./fixed-exp.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  floatingToFixed,
  toRational,
  type Fixed,
  type Floating,
} from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  add,
  bitLength,
  compare,
  multiply,
  rational,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { digitsFor } from "./rounding.ts";
import { parseFraction } from "../testing/fraction.ts";
import {
  between,
  foldIn,
  key,
  randomBall,
  randomRational,
  split,
  uniform,
} from "../testing/random.ts";
import { fraction } from "../testing/scaled.ts";

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
  const distance = absolute(subtract(fraction(ball.mid), reference));
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

/** A `Floating` of moderate exponent as the `Fixed` it stands for, exactly. */
function fixed(fl: Floating): Fixed {
  const f = floatingToFixed(fl, 1 << 20);
  assert.ok(f !== undefined, `exponent ${fl.exp} within the hard bound`);
  return f;
}

/** `exp(f)` at `bits` as a `Fixed`, for the tests of moderate arguments. */
function expAt(f: Fixed, bits: number): Fixed {
  return fixed(expFixed(f, bits));
}

/** The pair at `bits` as `Fixed`s, for the tests of moderate arguments. */
function pairAt(f: Fixed, bits: number): { sinh: Fixed; cosh: Fixed } {
  const { sinh, cosh } = sinhCoshFixed(f, bits);
  return { sinh: fixed(sinh), cosh: fixed(cosh) };
}

/**
 * The ball of `f` at two digits more than its significant bits are worth,
 * so that the rounding onto the decimal grid, half a unit in the last
 * digit added to the radius, stays under a tenth of an ulp and the
 * tolerances below measure the kernel alone; a built-in takes a result
 * out at `workingDigits` instead.
 */
function toBall(f: Fixed): Ball {
  const magnitude = f.value < 0n ? -f.value : f.value;
  return fixedToBall(f, digitsFor(Math.max(1, bitLength(magnitude))) + 2);
}

// Reference digits from Python's decimal module (`Decimal(x).exp()` at a
// precision of 130), which is correctly rounded; each is a truncation of
// the true value, so the tolerance is a unit in its last digit.
const E = dec(
  "2.71828182845904523536028747135266249775724709369995957496696762772407663035354759457138217852516642742746639193",
);
const REFERENCES: [string, string, number][] = [
  [
    "0.5",
    "1.6487212707001281468486507878141635716537761007101480115750793116",
    64,
  ],
  [
    "-3",
    "0.049787068367863942979342415650061776631699592188423215567627727606",
    66,
  ],
  [
    "10",
    "22026.465794806716516957900645284244366353512618556781074235426355",
    60,
  ],
  [
    "-0.25",
    "0.77880078307140486824517026697832064729677229042614147424131736626",
    65,
  ],
  [
    "123.456",
    "4.13294435277809344957685441227343146614594393746575438725293690189945e53",
    14,
  ],
  [
    "1e-10",
    "1.00000000010000000000500000000016666666667083333333341666666666805",
    65,
  ],
];

test("reference digits: e to 100 digits, and exp at several arguments", () => {
  const e = toBall(
    expAt(fixedFromRational(rational(1n), bitsFor(100)), bitsFor(100)),
  );
  assertReference(e, E, tenTo(100), "exp(1) at 100 digits");
  for (const [x, digits, toleranceDigits] of REFERENCES) {
    const at = toBall(
      expAt(fixedFromRational(dec(x), bitsFor(60)), bitsFor(60)),
    );
    assertReference(at, dec(digits), tenTo(toleranceDigits), `exp(${x})`);
  }
});

test("exp(-1000) keeps its digits, far below one", () => {
  // 5.07595889754945676529180947957433691930559928289283736183239384541054e-435, from Python's decimal module.
  const at = toBall(
    expAt(fixedFromRational(rational(-1000n), bitsFor(50)), bitsFor(50)),
  );
  const reference = dec(
    "5.0759588975494567652918094795743369193055992828928e-435",
  );
  assertReference(at, reference, tenTo(435 + 48), "exp(-1000)");
});

test("containment: exp at a precision contains the value computed at four times it", () => {
  const root = key(3601);
  const arguments_: Fixed[] = [];
  for (let i = 0; arguments_.length < 60; i++) {
    // Arguments of moderate size, |x| below about 2^10, as exact values and balls.
    const [a, b] = split(foldIn(root, i));
    const value = randomRational(a!, 24, 2);
    const ball = randomBall(b!, 24, 2);
    for (const candidate of [
      fixedFromRational(value, bitsFor(20)),
      fixedFromBall(ball, bitsFor(20)),
    ]) {
      if (
        absolute(toRational(candidate)).num <
        1000n * absolute(toRational(candidate)).den
      ) {
        arguments_.push(candidate);
      }
    }
  }
  for (const f of arguments_) {
    const at = expAt(f, bitsFor(20));
    // The midpoint's exponential at four times the precision, of the
    // argument's own value: a value in the argument's interval.
    const fine = expAt(
      fixedFromRational(toRational(f), bitsFor(80)),
      bitsFor(80),
    );
    assert.ok(
      contains(at, toRational(fine)),
      `exp of ${toFraction(toRational(f))}`,
    );
    // And of the ends of the argument's interval.
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const end of [subtract(toRational(f), rad), add(toRational(f), rad)]) {
      const atEnd = expAt(fixedFromRational(end, bitsFor(80)), bitsFor(80));
      assert.ok(
        contains(at, toRational(atEnd)),
        `exp at an end of ${toFraction(toRational(f))}`,
      );
    }
    // The error is small for an exact argument: within a few hundred ulps.
    if (f.error === 0n) assert.ok(at.error <= 512n, `${at.error} ulps`);
  }
});

test("the result keeps the argument's significant bits for a result of any magnitude", () => {
  const bits = bitsFor(20);
  const big = expAt(fixedFromRational(rational(100n), bits), bits);
  // exp(100) is about 2^144.3, beyond 2^bits: an integer with at least
  // `bits` significant bits (none of the fraction bits are needed).
  assert.equal(big.bits, 0);
  assert.ok(bitLength(big.value) >= bits);
  const middling = expAt(fixedFromRational(rational(20n), bits), bits);
  // exp(20) is about 2^28.9: 28 fewer fraction bits than asked.
  assert.equal(middling.bits, bits - 28);
  const small = expAt(fixedFromRational(rational(-100n), bits), bits);
  assert.equal(small.bits, bits + 145);
  assert.ok(small.value > 0n);
  // A zero argument is exactly one, and an argument beyond 2^62, whose
  // exponential would pass the exponent bound, is refused.
  const one = expAt({ value: 0n, error: 0n, bits: 32 }, 32);
  assert.deepEqual(toRational(one), rational(1n));
  assert.throws(
    () => expFixed(fixedFromRational(rational(1n << 63n), 8), 8),
    RangeError,
  );
});

// Reference digits from Python's decimal module at a precision of 70:
// exp(1e6), exp(-1e6) and exp(1e18), whose exponents no `Fixed` could
// hold, and cosh(1e6), which is half of exp(1e6) to every digit.
const EXP_1E6 =
  "3.033215396802087545086402141418114327083973794813477409606194999786226";
const EXP_MINUS_1E6 =
  "3.296831478088558578968907969107724208561401506658370159647088489895349";
const EXP_1E18 =
  "4.478462261548457493131813872087885906143911135991518352069114937569770";

/**
 * The leading digits of the `Floating` `fl`, as a fraction in `[1, 10)`,
 * and its decimal exponent, through a double for the exponent's fraction:
 * `significand × 2^exp = 10^(exp log10 2 + log10 significand)`, with `bits` fraction
 * bits of the significand read by the kernel's own dyadic value.
 */
function leadingDigits(fl: Floating, digits: number): [string, bigint] {
  const significand = toRational(fl.significand);
  const log10 =
    Number(fl.exp) * Math.log10(2) +
    Math.log10(Number(significand.num) / Number(significand.den));
  const exponent = BigInt(Math.floor(log10));
  // The digits from the exact value over the power of ten, formed as a
  // fraction of moderate size: significand × 2^exp × 10^-e is significand × 2^(exp - e)
  // × 5^-e, the twos cancelling.
  const twos = fl.exp - exponent;
  const num =
    significand.num *
    (twos >= 0n ? 1n << twos : 1n) *
    (exponent < 0n ? 5n ** -exponent : 1n);
  const den =
    significand.den *
    (twos < 0n ? 1n << -twos : 1n) *
    (exponent >= 0n ? 5n ** exponent : 1n);
  const scaled = (num * 10n ** BigInt(digits - 1)) / den;
  return [scaled.toString(), exponent];
}

test("exp of a large argument is a Floating with the exponent, and costs the squarings alone", () => {
  const bits = bitsFor(30);
  for (const [x, reference, exponent] of [
    ["1000000", EXP_1E6, 434294n],
    ["-1000000", EXP_MINUS_1E6, -434295n],
  ] as const) {
    const fl = expFixed(fixedFromRational(dec(x), bits), bits);
    // The significand is in [1, 2) at the bits asked, and the exponent is the
    // binary one of the reference, floor(x log2 e).
    assert.equal(fl.significand.bits, bits);
    assert.ok(
      fl.significand.value >= 1n << BigInt(bits) &&
        fl.significand.value < 2n << BigInt(bits),
      x,
    );
    assert.equal(fl.exp, BigInt(Math.floor(Number(x) * Math.LOG2E)), x);
    assert.ok(
      fl.significand.error < 4096n,
      `${x}: ${fl.significand.error} ulps`,
    );
    // The exponent cannot be formed as a Fixed within the significand limit.
    assert.equal(floatingToFixed(fl, 65536), undefined);
    // Its leading digits agree with the reference to the bits asked.
    const [digits, e] = leadingDigits(fl, 25);
    assert.equal(e, exponent, x);
    assert.equal(
      digits.slice(0, 24),
      reference.replace(".", "").slice(0, 24),
      x,
    );
  }
  // exp(1e18): the exponent bound's edge, sixty halvings; its digits are
  // digits.ts's to find (the reference `EXP_1E18` is checked there
  // through the built-in), and here the binary exponent is
  // floor(1e18 log2 e).
  const huge = expFixed(fixedFromRational(dec("1e18"), bits), bits);
  assert.equal(huge.exp, 1442695040888963407n);
  assert.ok(
    huge.significand.value >= 1n << BigInt(bits) &&
      huge.significand.value < 2n << BigInt(bits),
  );
  assert.equal(EXP_1E18.length, 71);
});

test("containment: exp of an argument up to 1e6 either way contains the value computed at four times the precision", () => {
  const root = key(3602);
  for (let i = 0; i < 40; i++) {
    // The magnitude's scale and its significand, the sign, and whether it is
    // a ball, each from its own fold.
    const k = foldIn(root, i);
    const scale = between(foldIn(k, 0), 0, 6);
    const significand = randomRational(foldIn(k, 1), 20, 0);
    const negative = uniform(foldIn(k, 2)) < 0.5;
    const magnitude = multiply(
      absolute(significand),
      rational(10n ** BigInt(scale)),
    );
    const x = negative ? subtract(rational(0n), magnitude) : magnitude;
    const rounded = fixedFromRational(x, bitsFor(20));
    const error = uniform(foldIn(k, 3)) < 0.5 ? rounded.error : 3n;
    const f: Fixed = { ...rounded, error };
    const at = expFixed(f, bitsFor(20));
    const dyadic = toRational(f);
    const label = `exp of ${toFraction(dyadic)} ± ${error} ulps`;
    // The value at four times the precision, of the argument's own
    // dyadic value and of both ends of its interval, each within the
    // coarse interval.
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const v of [dyadic, subtract(dyadic, rad), add(dyadic, rad)]) {
      const fine = expFixed(fixedFromRational(v, bitsFor(80)), bitsFor(80));
      assert.ok(
        containsFloating(at, fine),
        `${label} contains exp of ${toFraction(v)}`,
      );
    }
    if (error === 0n)
      assert.ok(
        at.significand.error <= 512n,
        `${label}: ${at.significand.error} ulps`,
      );
  }
});

test("exp of a wide interval is zero within the exponential of its signed upper end, containing the exponential of every value in it", () => {
  const bits = bitsFor(20);
  // Around zero, around a positive center, around a negative one, and at
  // an error of exactly one half; each at 8 fraction bits.
  for (const [value, error] of [
    [0n, 3n << 8n],
    [5n << 8n, 2n << 8n],
    [-20n << 8n, 30n << 8n],
    [-1000n << 8n, 1n << 7n],
    [0n, 1000000n << 8n],
  ] as const) {
    const f: Fixed = { value, error, bits: 8 };
    const at = expFixed(f, bits);
    assert.equal(at.significand.value, 0n, inspect(at));
    assert.ok(at.significand.error > 0n);
    const dyadic = toRational(f);
    const rad = multiply(rational(error), rational(1n, 256n));
    const label = `exp of ${toFraction(dyadic)} ± ${toFraction(rad)}`;
    for (const v of [dyadic, subtract(dyadic, rad), add(dyadic, rad)]) {
      const fine = expFixed(fixedFromRational(v, bitsFor(80)), bitsFor(80));
      assert.ok(
        containsFloating(at, fine),
        `${label} contains exp of ${toFraction(v)}`,
      );
    }
    // The bound is the exponential of the upper end, not far beyond it: the
    // upper end's exponential at the coarse bits lies within a few ulps of
    // the bound's edge.
    const upper = expFixed(fixedFromRational(add(dyadic, rad), 8), bits);
    assert.equal(upper.exp, at.exp);
    assert.ok(
      at.significand.error -
        upper.significand.value -
        upper.significand.error <=
        0n,
    );
  }
  // Just below one half, the interval is halved and squared as before.
  const narrow = expFixed({ value: 0n, error: 127n, bits: 8 }, bits);
  assert.ok(narrow.significand.value > 0n);
});

/**
 * Whether the interval of `coarse` contains the value of `fine`, both
 * `Floating`s: compared at the coarse exponent, the fine significand shifted
 * to it exactly (the exponents differ by a few bits at most).
 */
function containsFloating(coarse: Floating, fine: Floating): boolean {
  const shift = fine.exp - coarse.exp;
  const fineValue = toRational(fine.significand);
  const value =
    shift >= 0n
      ? multiply(fineValue, rational(1n << shift))
      : multiply(fineValue, rational(1n, 1n << -shift));
  return contains(coarse.significand, value);
}

test("sinh and cosh of a large argument fold the reciprocal into the error, and tanh is one there", () => {
  const bits = bitsFor(30);
  const { sinh, cosh } = sinhCoshFixed(
    fixedFromRational(dec("1e6"), bits),
    bits,
  );
  // Both are exp(1e6) / 2: the exponent one less, the same leading digits.
  assert.equal(cosh.exp, 1442694n, inspect(cosh));
  assert.deepEqual(sinh, cosh);
  const [digits, e] = leadingDigits(cosh, 25);
  assert.equal(e, 434294n);
  assert.equal(digits.slice(0, 22), "1516607698401043772543".slice(0, 22));
  // A negative argument negates the sine, its truncation toward minus
  // infinity leaving it within an ulp of the negation.
  const negative = sinhCoshFixed(fixedFromRational(dec("-1e6"), bits), bits);
  assert.equal(negative.sinh.exp, cosh.exp);
  assert.ok(negative.sinh.significand.value <= -cosh.significand.value);
  assert.ok(negative.sinh.significand.value >= -cosh.significand.value - 1n);
  assert.deepEqual(negative.cosh, cosh);
  // tanh of it is one within two ulps.
  const t = tanhFixed(fixedFromRational(dec("1e6"), bits), bits);
  assert.equal(t.value, 1n << BigInt(t.bits));
  assert.ok(t.error <= 2n);
  // A wide interval is zero within one, tanh's whole range, before the
  // pair is formed: around zero, far out on one side, and at an error of
  // exactly one half; an error just below one half stays on the kernel.
  for (const [value, error] of [
    [0n, 1000000n << 8n],
    [100n << 8n, (999n << 8n) / 10n],
    [0n, 1n << 7n],
    [5000n << 8n, (6n << 8n) / 10n],
  ] as const) {
    const wide = tanhFixed({ value, error, bits: 8 }, bits);
    assert.equal(wide.value, 0n, inspect(wide));
    assert.equal(wide.error, 1n << BigInt(wide.bits), inspect(wide));
  }
  const narrow = tanhFixed({ value: 0n, error: 127n, bits: 8 }, bits);
  assert.ok(narrow.error < 1n << BigInt(narrow.bits), inspect(narrow));
  assert.ok(contains(narrow, rational(0n)));
  // A one-sided interval of error 99.9 around 100: tanh ranges over
  // [0.0997, 1], and zero within one contains it.
  const oneSided = tanhFixed(
    { value: 100n << 8n, error: 999n * 25n, bits: 8 },
    bits,
  );
  assert.equal(oneSided.value, 0n);
  assert.equal(oneSided.error, 1n << BigInt(oneSided.bits));
  // A wide argument beyond the fold: a ball around zero and one around
  // M / 2 that covers [1, M].
  const wide: SinhCosh = sinhCoshFixed(
    { value: 0n, error: 1000000n << 8n, bits: 8 },
    bits,
  );
  assert.equal(wide.sinh.significand.value, 0n);
  assert.ok(wide.sinh.significand.error > 0n);
  assert.equal(wide.cosh.exp, wide.sinh.exp);
});

// ---------------------------------------------------------------------------
// sinh and cosh

// Reference digits from Python's decimal module (its own `exp` at a
// precision of 320), printed to 130 digits: `[x, sinh x, cosh x]`, on the
// series route below one and the exponential route above it.
const HYPERBOLIC: [string, string, string][] = [
  [
    "1",
    "1.175201193643801456882381850595600815155717981334095870229565413013307567304323895607117452089623391840419533327579532356785218902",
    "1.543080634815243778477905620757061682601529112365863704737402214710769063049223698964264726435543035587046858604423527565032194695",
  ],
  [
    "0.5",
    "0.5210953054937473616224256264114915591059289826114805279460935764528022508902335923170644542741885934882214239811341359140666794448",
    "1.127625965206380785226225161402672012547847118098667483628985735187858770303982016315712065782178049514645213775173661090604487530",
  ],
  [
    "-2",
    "-3.626860407847018767668213982801261704886342012321135721309484474934250210988785036723607181294232373009337937037922656955717628410",
    "3.762195691083631459562213477773746108293973558230711602777643347588323585090272726660705303784889421764415224227556209168166975282",
  ],
  [
    "10",
    "11013.23287470339337723652455484636440290145119031934610383522854807694858378568548044841965781976067475188658969220137348319739933",
    "11013.23292010332313972137609043787996345206142823743497040019780714825423478510709475070131034476522069966891140025646316922589228",
  ],
  [
    "-0.25",
    "-0.2526123168081683079141251505420579055197542874276608074880949653019810769068593790606537020961198741487692473633089323967065549475",
    "1.031413099879573176159295417520378552816526577853802281729412331570226688960378623692652717343433694752893584386370754909148199289",
  ],
  [
    "1e-10",
    "1.000000000000000000001666666666666666666667500000000000000000000198412698412698412698440255731922398589065258237133237133237133237e-10",
    "1.000000000000000000005000000000000000000004166666666666666666668055555555555555555555803571428571428571428598985890652557319223988",
  ],
];

test("reference digits: sinh and cosh on both routes, and the tiny argument keeps its bits", () => {
  for (const [x, sinhX, coshX] of HYPERBOLIC) {
    const { sinh, cosh } = pairAt(
      fixedFromRational(dec(x), bitsFor(60)),
      bitsFor(60),
    );
    assertReference(toBall(sinh), dec(sinhX), tenTo(55), `sinh(${x})`);
    assertReference(toBall(cosh), dec(coshX), tenTo(55), `cosh(${x})`);
  }
  const bits = bitsFor(20);
  // sinh(1e-50) is about 2^-166.1, converted at the bits the built-in uses.
  const tiny = pairAt(fixedFromRational(dec("1e-50"), bits + 167), bits);
  assert.equal(tiny.sinh.bits, bits + 167);
  assert.equal(tiny.cosh.bits, bits);
  assertReference(
    toBall(tiny.sinh),
    dec(
      "1.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000166667e-50",
    ),
    tenTo(50 + 24),
    "sinh(1e-50)",
  );
  // A large argument's results have few fraction bits and the bits asked for.
  const large = pairAt(fixedFromRational(rational(100n), bits), bits);
  assert.equal(large.cosh.bits, 0);
  assert.ok(bitLength(large.cosh.value) >= bits);
  assert.equal(large.sinh.bits, 0);
  // A zero argument with an error is a ball around zero and one around one.
  const zero = pairAt({ value: 0n, error: 5n, bits: 8 }, bits);
  assert.equal(zero.sinh.value, 0n);
  assert.ok(contains(zero.cosh, rational(1n)));
});

test("containment: sinh and cosh at a precision contain the values computed at four times it", () => {
  const root = key(3611);
  const arguments_: Fixed[] = [];
  for (let i = 0; arguments_.length < 60; i++) {
    // Arguments of moderate size, |x| below about 2^10, as exact values and balls.
    const [a, b] = split(foldIn(root, i));
    const value = randomRational(a!, 24, 2);
    const ball = randomBall(b!, 24, 2);
    for (const candidate of [
      fixedFromRational(value, bitsFor(20)),
      fixedFromBall(ball, bitsFor(20)),
    ]) {
      const magnitude = absolute(toRational(candidate));
      if (magnitude.num < 1000n * magnitude.den) arguments_.push(candidate);
    }
  }
  arguments_.push(fixedFromRational(dec("1e-50"), bitsFor(20) + 167));
  for (const f of arguments_) {
    const at = pairAt(f, bitsFor(20));
    const fine = pairAt(
      fixedFromRational(
        toRational(f),
        bitsFor(80) + Math.max(0, f.bits - bitsFor(20)),
      ),
      bitsFor(80),
    );
    const label = toFraction(toRational(f));
    assert.ok(contains(at.sinh, toRational(fine.sinh)), `sinh of ${label}`);
    assert.ok(contains(at.cosh, toRational(fine.cosh)), `cosh of ${label}`);
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const end of [subtract(toRational(f), rad), add(toRational(f), rad)]) {
      const atEnd = pairAt(
        fixedFromRational(end, bitsFor(80) + Math.max(0, f.bits - bitsFor(20))),
        bitsFor(80),
      );
      assert.ok(
        contains(at.sinh, toRational(atEnd.sinh)),
        `sinh at an end of ${label}`,
      );
      assert.ok(
        contains(at.cosh, toRational(atEnd.cosh)),
        `cosh at an end of ${label}`,
      );
    }
    // The error is small for an exact argument: within a few hundred ulps
    // on the exponential route, a few on the series.
    if (f.error === 0n) {
      assert.ok(at.sinh.error <= 512n, `sinh: ${at.sinh.error} ulps`);
      assert.ok(at.cosh.error <= 512n, `cosh: ${at.cosh.error} ulps`);
    }
  }
});
