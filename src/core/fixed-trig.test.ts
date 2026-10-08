import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ball } from "./ball.ts";
import { MEMO_MARGIN, piMemoBits } from "./constants.ts";
import { atanFixed, cosFixed, sinCosFixed, sinFixed } from "./fixed-trig.ts";
import {
  bitsFor,
  fixedFromBall,
  fixedFromRational,
  fixedToBall,
  toRational,
  type Fixed,
} from "./fixed.ts";
import { radiusAbove, radiusUpper } from "./radius.ts";
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
import { ZERO, fromRational } from "./scaled.ts";
import { parseFraction } from "../testing/fraction.ts";
import {
  foldIn,
  key,
  randomBall,
  randomRational,
  split,
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

// Reference digits from Python's decimal module: pi by Machin's formula and
// the Taylor series of the sine and the cosine after a reduction by 2 pi,
// all at a precision of 320 (the module has no trigonometry of its own),
// printed to 130 digits; each is correctly rounded there, so the tolerance
// is a unit in the last digit taken.
const SIN1 = dec(
  "0.8414709848078965066525023216302989996225630607983710656727517099919104043912396689486397435430526958543490379079206742932591189210",
);
const COS1 = dec(
  "0.5403023058681397174009366074429766037323104206179222276700972553811003947744717645179518560871830893435717311600300890978606337600",
);
/** `[x, sin x, cos x]`, across every quadrant, and beyond 2^64 and 2^256 in the last two. */
const REFERENCES: [string, string, string][] = [
  [
    "0.5",
    "0.4794255386042030002732879352155713880818033679406006751886166131255350002878148322096312746843482690861320910845057174178110937486",
    "0.8775825618903727161162815826038296519916451971097440529976108683159507632742139474057941840846822583554784005931090539934138279768",
  ],
  [
    "2",
    "0.9092974268256816953960198659117448427022549714478902683789730115309673015407835446201266889249593803099678967423994862612809531087",
    "-0.4161468365471423869975682295007621897660007710755448907551499737819649361240791690745317778601691403673667913652157285592886563999",
  ],
  [
    "-3",
    "-0.1411200080598672221007448028081102798469332642522655841518826412324220099670144719112821728534498637504136729482673274168444570317",
    "-0.9899924966004454572715727947312613023936790966155883288140859329283291975131332204282944793556926021714959931124141691895716292863",
  ],
  [
    "10",
    "-0.5440211108893698134047476618513772816836430129162238915741840126167572096404934257070756738949832161582938242382628322855195070564",
    "-0.8390715290764524522588639478240648345199301651331685468359537310487925868662707684009337127604221389274510544053502436236984233799",
  ],
  [
    "100",
    "-0.5063656411097587936565576104597854320650327212906573234433924735943579134194766964992366645129273922072440893925638404173419525871",
    "0.8623188722876839341019385139508425355100840085355108292801621126927210880509266241030951056842772850671356075551623304811055280680",
  ],
  [
    "123.456",
    "-0.8039373685728220921329487945968415282741322075391678672144359027616933807689279791012731365555388857086810602798078121546921884085",
    "-0.5947139710921599036220965817153155405970792074251270162374434875224893102811280927518086340547340403215609503962678642323894589638",
  ],
  [
    "-0.25",
    "-0.2474039592545229295968487048493891958933909803869658106765448304943981360434868216909848485279737923383271977521765161382595774709",
    "0.9689124217106447841445954494941891998041341902874428311481281242889425611845233272646552027996850255103527096261162026173094644841",
  ],
  [
    "1e-10",
    "9.999999999999999999983333333333333333333341666666666666666666664682539682539682539682815255731922398589065230679814013147346480681e-11",
    "0.9999999999999999999950000000000000000000041666666666666666666652777777777777777777780257936507936507936507660934744268077601410956",
  ],
  [
    "1e20",
    "-0.6452512852657808442058117113125230074069041966868971183031170068878986162188568608555379550092177132355162627714717883721458104903",
    "0.7639704044417283004001468027378811228344734417470044806221890669465897391978234615763701769050965598612007847968278827454485209404",
  ],
  [
    "1180591620717411303424",
    "-0.9981794021933067599641604936283969880501016576089450634162465188768898831957672456462149466533876899658756992542212283290314968583",
    "0.06031484922481978513219882919075331252085090319652492315522693778693677081662772947529325896131884239266897509372087315704817640491",
  ],
  [
    "2037035976334486086268445688409378161051468393665936250636140449354381299763336706183397376",
    "0.9772625210693567771740451338724902417299420024928174371370826298656557715855365086496634654326310701170613894442463140377646797307",
    "0.2120329335578909571204726740048635740271676403117848472901293041880303370654344944465598338782951554826773199572415817750290998474",
  ],
];

test("the reduction takes pi from the memo for arguments below 2^256 at the ceiling pass, and computes it uncached above", () => {
  // The memo grows to this ceiling plus the margin on the first request
  // under it, and no test in this file asks for a higher one.
  const ceiling = bitsFor(600);
  const held = ceiling + MEMO_MARGIN;
  sinFixed(fixedFromRational(rational(10n ** 15n), ceiling), ceiling, ceiling);
  assert.equal(piMemoBits(), held);
  // 2^255 has an integer part of 256 bits: the last argument served.
  sinFixed(fixedFromRational(rational(1n << 255n), ceiling), ceiling, ceiling);
  assert.equal(piMemoBits(), held);
  // 2^70 was once computed uncached while the margin was 64 bits; it is
  // served now, to the reference's digits still.
  const [x70, sin70, cos70] = REFERENCES[REFERENCES.length - 2]!;
  assert.equal(x70, String(1n << 70n));
  const served = sinCosFixed(
    fixedFromRational(dec(x70), ceiling),
    ceiling,
    ceiling,
  );
  assert.equal(piMemoBits(), held);
  assertReference(toBall(served.sin), dec(sin70), tenTo(120), "sin(2^70)");
  assertReference(toBall(served.cos), dec(cos70), tenTo(120), "cos(2^70)");
  // 2^300 needs pi at the ceiling plus 301 bits, above the memo: computed
  // for the call, and the memo is left as it was.
  const [x, sinX, cosX] = REFERENCES[REFERENCES.length - 1]!;
  assert.equal(x, String(1n << 300n));
  const { sin, cos } = sinCosFixed(
    fixedFromRational(dec(x), ceiling),
    ceiling,
    ceiling,
  );
  assert.equal(piMemoBits(), held);
  assertReference(toBall(sin), dec(sinX), tenTo(120), "sin(2^300)");
  assertReference(toBall(cos), dec(cosX), tenTo(120), "cos(2^300)");
  // The arctangent's pi/2 is at the working bits, within the margin.
  atanFixed(fixedFromRational(rational(2n), ceiling), ceiling, ceiling);
  assert.equal(piMemoBits(), held);
});

test("reference digits: sin 1 and cos 1 to 100 digits, and both across the quadrants", () => {
  const bits = bitsFor(100);
  const ceiling = bitsFor(200);
  const one = fixedFromRational(rational(1n), bits);
  assertReference(
    toBall(sinFixed(one, bits, ceiling)),
    SIN1,
    tenTo(100),
    "sin 1",
  );
  assertReference(
    toBall(cosFixed(one, bits, ceiling)),
    COS1,
    tenTo(100),
    "cos 1",
  );
  for (const [x, sinX, cosX] of REFERENCES) {
    const { sin, cos } = sinCosFixed(
      fixedFromRational(dec(x), bitsFor(60)),
      bitsFor(60),
      ceiling,
    );
    assertReference(toBall(sin), dec(sinX), tenTo(60), `sin(${x})`);
    assertReference(toBall(cos), dec(cosX), tenTo(60), `cos(${x})`);
    assert.deepEqual(
      sinFixed(fixedFromRational(dec(x), bitsFor(60)), bitsFor(60), ceiling),
      sin,
    );
    assert.deepEqual(
      cosFixed(fixedFromRational(dec(x), bitsFor(60)), bitsFor(60), ceiling),
      cos,
    );
  }
});

test("containment: sin and cos at a precision contain the values computed at four times it", () => {
  const root = key(3901);
  const ceiling = bitsFor(200);
  const arguments_: Fixed[] = [];
  for (let i = 0; arguments_.length < 60; i++) {
    // Arguments across [-100, 100], as exact values and balls.
    const [a, b] = split(foldIn(root, i));
    const value = randomRational(a!, 24, 2);
    const ball = randomBall(b!, 24, 2);
    for (const candidate of [
      fixedFromRational(value, bitsFor(20)),
      fixedFromBall(ball, bitsFor(20)),
    ]) {
      const magnitude = absolute(toRational(candidate));
      if (magnitude.num <= 100n * magnitude.den) arguments_.push(candidate);
    }
  }
  // Beyond 2^64, and a tiny argument converted at more bits, as the
  // built-in converts it.
  arguments_.push(fixedFromRational(dec("1e20"), bitsFor(20)));
  arguments_.push(
    fixedFromBall(
      { mid: fromRational(dec("1e20")), rad: radiusAbove(dec("1e-15")) },
      bitsFor(20),
    ),
  );
  arguments_.push(fixedFromRational(dec("1e-50"), bitsFor(20) + 167));
  arguments_.push(
    fixedFromBall(
      { mid: fromRational(dec("1e-50")), rad: radiusAbove(dec("1e-60")) },
      bitsFor(20) + 167,
    ),
  );
  for (const f of arguments_) {
    const at = sinCosFixed(f, bitsFor(20), ceiling);
    const fine = sinCosFixed(
      fixedFromRational(
        toRational(f),
        bitsFor(80) + Math.max(0, f.bits - bitsFor(20)),
      ),
      bitsFor(80),
      ceiling,
    );
    const label = toFraction(toRational(f));
    assert.ok(contains(at.sin, toRational(fine.sin)), `sin of ${label}`);
    assert.ok(contains(at.cos, toRational(fine.cos)), `cos of ${label}`);
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const end of [subtract(toRational(f), rad), add(toRational(f), rad)]) {
      const atEnd = sinCosFixed(
        fixedFromRational(end, bitsFor(80) + Math.max(0, f.bits - bitsFor(20))),
        bitsFor(80),
        ceiling,
      );
      assert.ok(
        contains(at.sin, toRational(atEnd.sin)),
        `sin at an end of ${label}`,
      );
      assert.ok(
        contains(at.cos, toRational(atEnd.cos)),
        `cos at an end of ${label}`,
      );
    }
    // The error is small for an exact argument: a few ulps.
    if (f.error === 0n) {
      assert.ok(at.sin.error <= 16n, `sin: ${at.sin.error} ulps`);
      assert.ok(at.cos.error <= 16n, `cos: ${at.cos.error} ulps`);
    }
  }
});

test("the results keep the argument's significant bits for a result of any magnitude, and a wide argument is zero within one", () => {
  const bits = bitsFor(20);
  const ceiling = bitsFor(200);
  // sin(1e-50) is about 2^-166.1: the bits the built-in converts at.
  const tiny = fixedFromRational(dec("1e-50"), bits + 167);
  const { sin, cos } = sinCosFixed(tiny, bits, ceiling);
  assert.equal(sin.bits, bits + 167);
  assert.equal(cos.bits, bits);
  assert.ok(sin.error <= 8n);
  assertReference(
    toBall(sin),
    dec(
      "9.99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999833333333333333333333333333333e-51",
    ),
    tenTo(50 + 24),
    "sin(1e-50)",
  );
  // sin near pi is a ball around zero: pi to 60 digits is 2.4e-61 short.
  const nearPi = fixedFromRational(
    dec("3.141592653589793238462643383279502884197169399375105820974944"),
    bits,
  );
  const { sin: aroundZero } = sinCosFixed(nearPi, bits, ceiling);
  assert.ok(contains(aroundZero, dec("5.92e-61")));
  assert.ok(compare(radiusUpper(toBall(aroundZero).rad), tenTo(20)) < 0);
  // A zero argument with an error is a ball around zero.
  const zero = sinCosFixed({ value: 0n, error: 5n, bits: 8 }, bits, ceiling);
  assert.equal(zero.sin.value, 0n);
  assert.ok(contains(zero.cos, rational(1n)));
  // An argument wider than a fifth of a radian is zero within one, for both.
  const wide = sinCosFixed(
    { value: 0n, error: 1n << 8n, bits: 8 },
    bits,
    ceiling,
  );
  assert.deepEqual(toBall(wide.sin), {
    mid: ZERO,
    rad: radiusAbove(rational(1n)),
  });
  assert.deepEqual(toBall(wide.cos), {
    mid: ZERO,
    rad: radiusAbove(rational(1n)),
  });
  // And a large argument's error survives the reduction: 100 ± 0.5.
  const wideLarge = sinCosFixed(
    { value: 200n, error: 1n, bits: 1 },
    bits,
    ceiling,
  );
  assert.deepEqual(toBall(wideLarge.cos), {
    mid: ZERO,
    rad: radiusAbove(rational(1n)),
  });
  // The preconditions throw: bad bits, and a zero value has no exponent
  // only where it matters, so a zero value is fine.
  assert.throws(() => sinFixed(tiny, -1, ceiling), RangeError);
  assert.throws(() => cosFixed(tiny, 1.5, ceiling), RangeError);
});

// ---------------------------------------------------------------------------
// atan

// Reference digits from Python's decimal module, by eight half-angle
// reductions and the Taylor series at a precision of 320.
const PI_OVER_4 = dec(
  "0.7853981633974483096156608458198757210492923498437764552437361480769541015715522496570087063355292669955370216283205766617734611524",
);
/** `[x, atan x]`, on either side of one and across magnitudes. */
const ATAN_REFERENCES: [string, string][] = [
  [
    "0.5",
    "0.4636476090008061162142562314612144020285370542861202638109330887201978641657417053006002839848878925565298522511908375135058181816",
  ],
  [
    "-3",
    "-1.249045772398254425829917077281090123077829404129896719054669236797151965737293954957608990320417159552066873879511414175279279334",
  ],
  [
    "10",
    "1.471127674303734591852875571761730851855306377183238262471963519343880455695553844893404788236772162411515656847813754353978995238",
  ],
  [
    "123.456",
    "1.562696452097992641892851578114457446196426396820430706100989752052468134370333827729852907956853870063311182144636979913181109317",
  ],
  [
    "1e20",
    "1.570796326794896619221321691639751442098584699687552910487472629487241536476437832647350746004391867304407376589974486656880255638",
  ],
  [
    "2.5",
    "1.190289949682531732927733774829318337601178986029452072911166673829707745314101396955153966575185598813039185930215474374731346632",
  ],
  [
    "-0.75",
    "-0.6435011087932843868028092287173226380415105911153123828656061187135124748116210887128168447012827488780143387542594782965352859415",
  ],
  [
    "0.999",
    "0.7848979133141150013031697743878289438351876122582719422804750355893054110062130002215053111897658766159288449164441380510834878745",
  ],
  [
    "1e-10",
    "9.999999999999999999966666666666666666666866666666666666666665238095238095238095249206349206349206349115440115440115440116209346209e-11",
  ],
];

test("reference digits: atan 1 is a quarter of pi to 100 digits, and atan across magnitudes", () => {
  const ceiling = bitsFor(200);
  assertReference(
    toBall(
      atanFixed(
        fixedFromRational(rational(1n), bitsFor(100)),
        bitsFor(100),
        ceiling,
      ),
    ),
    PI_OVER_4,
    tenTo(100),
    "atan 1",
  );
  for (const [x, atanX] of ATAN_REFERENCES) {
    const at = atanFixed(
      fixedFromRational(dec(x), bitsFor(60)),
      bitsFor(60),
      ceiling,
    );
    assertReference(toBall(at), dec(atanX), tenTo(60), `atan(${x})`);
  }
  // A tiny argument, converted at more bits as the built-in converts it.
  const tiny = atanFixed(
    fixedFromRational(dec("1e-50"), bitsFor(60) + 167),
    bitsFor(60),
    ceiling,
  );
  assertReference(
    toBall(tiny),
    dec(
      "9.999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999666666666666666666666666666667e-51",
    ),
    tenTo(50 + 60),
    "atan(1e-50)",
  );
  assert.equal(tiny.bits, bitsFor(60) + 167);
});

test("containment: atan at a precision contains the value computed at four times it", () => {
  const root = key(3902);
  const ceiling = bitsFor(200);
  const arguments_: Fixed[] = [];
  for (let i = 0; arguments_.length < 60; i++) {
    // Arguments across magnitudes, as exact values and balls.
    const [a, b] = split(foldIn(root, i));
    const value = randomRational(a!, 24, 12);
    const ball = randomBall(b!, 24, 12);
    arguments_.push(fixedFromRational(value, bitsFor(20)));
    arguments_.push(fixedFromBall(ball, bitsFor(20)));
  }
  for (const f of arguments_) {
    const at = atanFixed(f, bitsFor(20), ceiling);
    const fine = atanFixed(
      fixedFromRational(toRational(f), bitsFor(80)),
      bitsFor(80),
      ceiling,
    );
    const label = toFraction(toRational(f));
    assert.ok(contains(at, toRational(fine)), `atan of ${label}`);
    const rad = multiply(rational(f.error), rational(1n, 1n << BigInt(f.bits)));
    for (const end of [subtract(toRational(f), rad), add(toRational(f), rad)]) {
      const atEnd = atanFixed(
        fixedFromRational(end, bitsFor(80)),
        bitsFor(80),
        ceiling,
      );
      assert.ok(contains(at, toRational(atEnd)), `atan at an end of ${label}`);
    }
    if (f.error === 0n) assert.ok(at.error <= 16n, `atan: ${at.error} ulps`);
  }
  // A wide argument is zero within two, and the preconditions throw.
  const wide = atanFixed(
    { value: 0n, error: 1n << 8n, bits: 8 },
    bitsFor(20),
    ceiling,
  );
  assert.deepEqual(toBall(wide), {
    mid: ZERO,
    rad: radiusAbove(rational(2n)),
  });
  const large = atanFixed(
    fixedFromRational(dec("1e20"), bitsFor(20)),
    bitsFor(20),
    ceiling,
  );
  assert.equal(large.bits, bitsFor(20));
  assert.throws(() => atanFixed(large, -1, ceiling), RangeError);
});
