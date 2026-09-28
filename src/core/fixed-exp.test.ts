import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ball } from "./ball.ts";
import { expFixed, sinhCoshFixed } from "./fixed-exp.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  toRational,
  type Fixed,
} from "./fixed.ts";
import { radiusUpper } from "./radius.ts";
import {
  absolute,
  add,
  bitLength,
  compare,
  multiply,
  parseDecimal,
  rational,
  subtract,
  toFraction,
  type Rational,
} from "./rational.ts";
import { random, randomBall, randomRational } from "../testing/random.ts";

function dec(text: string): Rational {
  const result = parseDecimal(text);
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
  const distance = absolute(subtract(ball.mid, reference));
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
  const e = fixedToBall(
    expFixed(fixedFromRational(rational(1n), bitsFor(100)), bitsFor(100)),
  );
  assertReference(e, E, tenTo(100), "exp(1) at 100 digits");
  for (const [x, digits, toleranceDigits] of REFERENCES) {
    const at = fixedToBall(
      expFixed(fixedFromRational(dec(x), bitsFor(60)), bitsFor(60)),
    );
    assertReference(at, dec(digits), tenTo(toleranceDigits), `exp(${x})`);
  }
});

test("exp(-1000) keeps its digits, far below one", () => {
  // 5.07595889754945676529180947957433691930559928289283736183239384541054e-435, from Python's decimal module.
  const at = fixedToBall(
    expFixed(fixedFromRational(rational(-1000n), bitsFor(50)), bitsFor(50)),
  );
  const reference = dec(
    "5.0759588975494567652918094795743369193055992828928e-435",
  );
  assertReference(at, reference, tenTo(435 + 48), "exp(-1000)");
});

test("containment: exp at a precision contains the value computed at four times it", () => {
  const rand = random(3601);
  const arguments_: Fixed[] = [];
  while (arguments_.length < 60) {
    // Arguments of moderate size, |x| below about 2^10, as exact values and balls.
    const value = randomRational(rand, 24, 2);
    const ball = randomBall(rand, 24, 2);
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
    const at = expFixed(f, bitsFor(20));
    // The midpoint's exponential at four times the precision, of the
    // argument's own value: a value in the argument's interval.
    const fine = expFixed(
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
      const atEnd = expFixed(fixedFromRational(end, bitsFor(80)), bitsFor(80));
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
  const big = expFixed(fixedFromRational(rational(100n), bits), bits);
  // exp(100) is about 2^144.3, beyond 2^bits: an integer with at least
  // `bits` significant bits (D9: none of the fraction bits are needed).
  assert.equal(big.bits, 0);
  assert.ok(bitLength(big.value) >= bits);
  const middling = expFixed(fixedFromRational(rational(20n), bits), bits);
  // exp(20) is about 2^28.9: 28 fewer fraction bits than asked.
  assert.equal(middling.bits, bits - 28);
  const small = expFixed(fixedFromRational(rational(-100n), bits), bits);
  assert.equal(small.bits, bits + 145);
  assert.ok(small.value > 0n);
  // A zero argument is exactly one, and an argument beyond 2^40 is refused.
  const one = expFixed({ value: 0n, error: 0n, bits: 32 }, 32);
  assert.deepEqual(toRational(one), rational(1n));
  assert.throws(
    () => expFixed(fixedFromRational(rational(1n << 41n), 8), 8),
    RangeError,
  );
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
    const { sinh, cosh } = sinhCoshFixed(
      fixedFromRational(dec(x), bitsFor(60)),
      bitsFor(60),
    );
    assertReference(fixedToBall(sinh), dec(sinhX), tenTo(55), `sinh(${x})`);
    assertReference(fixedToBall(cosh), dec(coshX), tenTo(55), `cosh(${x})`);
  }
  const bits = bitsFor(20);
  // sinh(1e-50) is about 2^-166.1, converted at the bits the built-in uses.
  const tiny = sinhCoshFixed(fixedFromRational(dec("1e-50"), bits + 167), bits);
  assert.equal(tiny.sinh.bits, bits + 167);
  assert.equal(tiny.cosh.bits, bits);
  assertReference(
    fixedToBall(tiny.sinh),
    dec(
      "1.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000166667e-50",
    ),
    tenTo(50 + 24),
    "sinh(1e-50)",
  );
  // A large argument's results have few fraction bits and the bits asked for.
  const large = sinhCoshFixed(fixedFromRational(rational(100n), bits), bits);
  assert.equal(large.cosh.bits, 0);
  assert.ok(bitLength(large.cosh.value) >= bits);
  assert.equal(large.sinh.bits, 0);
  // A zero argument with an error is a ball around zero and one around one.
  const zero = sinhCoshFixed({ value: 0n, error: 5n, bits: 8 }, bits);
  assert.equal(zero.sinh.value, 0n);
  assert.ok(contains(zero.cosh, rational(1n)));
});

test("containment: sinh and cosh at a precision contain the values computed at four times it", () => {
  const rand = random(3611);
  const arguments_: Fixed[] = [];
  while (arguments_.length < 60) {
    // Arguments of moderate size, |x| below about 2^10, as exact values and balls.
    const value = randomRational(rand, 24, 2);
    const ball = randomBall(rand, 24, 2);
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
    const at = sinhCoshFixed(f, bitsFor(20));
    const fine = sinhCoshFixed(
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
      const atEnd = sinhCoshFixed(
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
