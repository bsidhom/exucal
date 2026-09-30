import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { certifies, exact, isExact, position, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import type { BuiltinError } from "../builtin.ts";
import { BUILTINS } from "../builtins.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import {
  UNBOUNDED,
  compareRadius,
  powerOfTwoRadius,
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
  format,
  fromRational,
  multiply,
  negate,
  subtract,
  type Scaled,
} from "../scaled.ts";
import { ball as ballOf, dec, fr } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import {
  acosh,
  acoshBall,
  asinh,
  asinhBall,
  atanh,
  atanhBall,
  cosh,
  coshBall,
  sinh,
  sinhBall,
  tanh,
  tanhBall,
} from "./hyperbolic.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

/** The default context: eight digits, the default range limit. */
const DEFAULT: NumberContext = { ...CONTEXT, precision: 8 };

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

/** `a - b` on `Scaled`s of moderate exponent. */
function minus(a: Scaled, b: Scaled): Scaled {
  const d = subtract(a, b, LIMIT_BITS);
  assert.ok(d.ok, `${inspect(a)} - ${inspect(b)} aligns`);
  return d.value;
}

/** `a + b` on `Scaled`s of moderate exponent. */
function plus(a: Scaled, b: Scaled): Scaled {
  const sum = add(a, b, LIMIT_BITS);
  assert.ok(sum.ok, `${inspect(a)} + ${inspect(b)} aligns`);
  return sum.value;
}

/** `a × b`. */
function times(a: Scaled, b: Scaled): Scaled {
  const product = multiply(a, b);
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

// References from Python's decimal module: its own exp, ln and sqrt,
// correctly rounded, at a precision of 320.
const SINH1 = dec(
  "1.175201193643801456882381850595600815155717981334095870229565413013307567304323895607117452089623391840419533327579532356785218902",
);
const COSH1 = dec(
  "1.543080634815243778477905620757061682601529112365863704737402214710769063049223698964264726435543035587046858604423527565032194695",
);
const TANH1 = dec(
  "0.7615941559557648881194582826047935904127685972579365515968105001219532445766384834589475216736767144219027597015540775323683091148",
);
/** `atanh(1/2)`, half of `ln 3`. */
const ATANH_HALF = dec(
  "0.5493061443340548456976226184612628523237452789113747258673471668187471466093044834368078774068660443939850145329789328711840021130",
);
const ASINH1 = dec(
  "0.8813735870195430252326093249797923090281603282616354107532956086533771842220260878337068919102560428567398161921064921887620725120",
);
const ACOSH2 = dec(
  "1.316957896924816708625046347307968444026981971467516479768472256920460185416443976074219013450101783556465436565604979319809816862",
);
/** `ln(2e999999999)`, from Python's decimal module at a precision of 60: `asinh` and `acosh` of `1e999999999`. */
const LN_TWICE_HUGE = dec(
  "2302585091.38460777158389108008360487437491384910317162176481",
);
/** `[x, sinh x, cosh x, tanh x]`, on either side of one and far out. */
const FORWARD: [string, string, string, string][] = [
  [
    "0.5",
    "0.5210953054937473616224256264114915591059289826114805279460935764528022508902335923170644542741885934882214239811341359140666794448",
    "1.127625965206380785226225161402672012547847118098667483628985735187858770303982016315712065782178049514645213775173661090604487530",
    "0.4621171572600097585023184836436725487302892803301130385527318158380809061404092787749490641519624905843489329862815491328822654619",
  ],
  [
    "-2",
    "-3.626860407847018767668213982801261704886342012321135721309484474934250210988785036723607181294232373009337937037922656955717628410",
    "3.762195691083631459562213477773746108293973558230711602777643347588323585090272726660705303784889421764415224227556209168166975282",
    "-0.9640275800758168839464137241009231502550299762409347760482632174131079463176102025594748500452076891494616122189245966682730670219",
  ],
  [
    "0.999",
    "1.173658700352451883061120209095534209368181982879749848447929030947908982368374977808428880200723429106685846491258348158106918792",
    "1.541906204966114804270862524249752698119601416325177799105759604217424388101545440030682226882228122541890433514445745121051068927",
    "0.7611738616605699490958284545784303046860480084257319529801322298507567682490911854706973109134559800879558896332444018172806408294",
  ],
  [
    "20",
    "242582597.7048951379539766040514913653593493043945131389889017623584371515852325392684079134340939980839614307666899796607179047622",
    "242582597.7048951400151302264900491933252896845503341153647090379575408445574772008975719372186533513638723586722713466971057955544",
    "0.9999999999999999915032914894168220454385581911909872571304745642276638501339630549302037948311628672388440131922547961033043483375",
  ],
  [
    "-0.25",
    "-0.2526123168081683079141251505420579055197542874276608074880949653019810769068593790606537020961198741487692473633089323967065549475",
    "1.031413099879573176159295417520378552816526577853802281729412331570226688960378623692652717343433694752893584386370754909148199289",
    "-0.2449186624037091292778011314910169575065587306178203261188743253170899912800493590051673894494847461340872870718459141240722790505",
  ],
];
/** `[x, asinh x]`. */
const ASINH: [string, string][] = [
  [
    "-2",
    "-1.443635475178810342493276740273105269405553003156981558983054506520491602824665323236028287368170424991695519874880969233817704971",
  ],
  [
    "1e20",
    "46.74484904044085898977706121514546072009755490693571477478723802884484581551674431938830742878838465438135716186629565840192811287",
  ],
  [
    "123.456",
    "5.509048400149604577132726533356424504530273673290821151551564067658282843998237202968532995185987628747036308551175323058386833900",
  ],
  [
    "1e-10",
    "9.999999999999999999983333333333333333333408333333333333333332886904761904761904764942956349206349206326834190115440115440288967760e-11",
  ],
];
/** `[x, acosh x]`. */
const ACOSH: [string, string][] = [
  [
    "1.5",
    "0.9624236501192068949955178268487368462703686687713210393220363376803277352164435488240188582454469499944636799165873128225451366475",
  ],
  [
    "1e20",
    "46.74484904044085898977706121514546072009750490693571477478723802884484581551674431938830742878838465438135716186629565840182394620",
  ],
  [
    "1.000000000000000000000000000001",
    "1.414213562373095048801688724209580227439474117456214599116328956334022633634691124875953056606756168122175520817763141680367972300e-15",
  ],
];
/** `[x, atanh x]`. */
const ATANH: [string, string][] = [
  [
    "-0.75",
    "-0.9729550745276566525526763717215898648185423647909305942296950749687899313760346338938292492939357634965308471029255704558618761288",
  ],
  [
    "0.999",
    "3.800201167250200031775967267809004462263675695230499890921632009823410881906052135593956996275152118361678342481436207341302339711",
  ],
  [
    "0.999999999999999999999999999999",
    "34.88534998519065791497848788099430139805427239661172226756025845676028595614513456134288973982135048556718416781124573903464449626",
  ],
  [
    "1e-10",
    "1.000000000000000000003333333333333333333353333333333333333333476190476190476190477301587301587301587310678210678210678210755133755e-10",
  ],
];

test("the hyperbolic functions and their inverses take a plain number to a plain number, of one argument", () => {
  for (const [fn, name] of [
    [sinh, "sinh"],
    [cosh, "cosh"],
    [tanh, "tanh"],
    [asinh, "asinh"],
    [acosh, "acosh"],
    [atanh, "atanh"],
  ] as const) {
    assert.equal(fn.name, name);
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.deepEqual(fn.dimensions([DIMENSIONLESS], new Map()), {
      ok: true,
      value: DIMENSIONLESS,
    });
    assert.equal(BUILTINS.get(name), fn);
  }
});

test("the exact cases are zero for sinh, tanh, asinh and atanh, one for cosh(0), zero for acosh(1), and their neighbors are inexact", () => {
  for (const fn of [sinhBall, tanhBall, asinhBall, atanhBall]) {
    assert.deepEqual(value(fn(exact(ZERO), CONTEXT)), exact(ZERO));
    assert.ok(!isExact(value(fn(exact(dec("1e-30")), CONTEXT))));
    assert.ok(!isExact(value(fn(exact(dec("-1e-30")), CONTEXT))));
    assert.ok(!isExact(value(fn(ball("0", "1e-30"), CONTEXT))));
  }
  assert.deepEqual(value(coshBall(exact(ZERO), CONTEXT)), exact(ONE));
  assert.ok(!isExact(value(coshBall(exact(dec("1e-30")), CONTEXT))));
  assert.deepEqual(value(acoshBall(exact(ONE), CONTEXT)), exact(ZERO));
  assert.ok(!isExact(value(acoshBall(exact(dec("1.000000001")), CONTEXT))));
  assert.ok(!isExact(value(acoshBall(ball("1.5", "0.1"), CONTEXT))));
});

test("the values are the kernel's, within the radius, on both routes of the forward functions", () => {
  const one = exact(ONE);
  assertNear(value(sinhBall(one, CONTEXT)), SINH1, 45, "sinh(1)");
  assertNear(value(coshBall(one, CONTEXT)), COSH1, 45, "cosh(1)");
  assertNear(value(tanhBall(one, CONTEXT)), TANH1, 45, "tanh(1)");
  for (const [x, sinhX, coshX, tanhX] of FORWARD) {
    const at = exact(dec(x));
    assertNear(value(sinhBall(at, CONTEXT)), dec(sinhX), 45, `sinh(${x})`);
    assertNear(value(coshBall(at, CONTEXT)), dec(coshX), 45, `cosh(${x})`);
    assertNear(value(tanhBall(at, CONTEXT)), dec(tanhX), 45, `tanh(${x})`);
  }
  // A tiny argument keeps its digits: sinh(1e-50) and tanh(1e-50) are
  // 1e-50 within a relative 1e-45, and sinh(1e-10) carries its second term.
  const tiny = exact(dec("1e-50"));
  assertNear(
    value(sinhBall(tiny, CONTEXT)),
    dec(
      "1.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016666667e-50",
    ),
    45,
    "sinh(1e-50)",
  );
  assertNear(
    value(tanhBall(tiny, CONTEXT)),
    dec(
      "9.99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999966667e-51",
    ),
    45,
    "tanh(1e-50)",
  );
  assertNear(
    value(sinhBall(exact(dec("1e-10")), CONTEXT)),
    dec(
      "1.000000000000000000001666666666666666666667500000000000000000000198412698412698412698440255731922398589065258237133237133237133237e-10",
    ),
    45,
    "sinh(1e-10)",
  );
  assert.ok(
    compare(radiusOf(value(sinhBall(tiny, CONTEXT))), dec("1e-96")) < 0,
  );
  // Far out, sinh and cosh agree to the digits kept and tanh is one within
  // 2 e^-2x; and the identity cosh^2 - sinh^2 = 1 holds within the radii.
  const far = exact(dec("123.456"));
  const s = value(sinhBall(far, CONTEXT));
  const c = value(coshBall(far, CONTEXT));
  assertNear(
    c,
    dec(
      "206647217638904672478842720613671573307297196873287719.3626468450949729646926786902573682020908354155126281774924577185871250599545",
    ),
    40,
    "cosh(123.456)",
  );
  const t = value(tanhBall(far, CONTEXT));
  assert.deepEqual(t.mid, ONE);
  assert.ok(compare(radiusOf(t), dec("1e-106")) < 0);
  assert.ok(compare(radiusOf(t), dec("1e-108")) > 0);
  const identity = minus(times(c.mid, c.mid), times(s.mid, s.mid));
  assert.ok(compare(distance(identity, ONE), dec("1e+8")) < 0);
  for (const x of ["1", "0.5", "-2", "20"]) {
    const at = exact(dec(x));
    const sx = value(sinhBall(at, CONTEXT));
    const cx = value(coshBall(at, CONTEXT));
    const difference = minus(times(cx.mid, cx.mid), times(sx.mid, sx.mid));
    assert.ok(compare(distance(difference, ONE), dec("1e-30")) < 0, x);
  }
});

test("the inverses are the kernel's, within the radius, and keep their digits near one and near zero", () => {
  assertNear(value(asinhBall(exact(ONE), CONTEXT)), ASINH1, 45, "asinh(1)");
  assertNear(value(acoshBall(exact(fr(2n)), CONTEXT)), ACOSH2, 45, "acosh(2)");
  assertNear(
    value(atanhBall(exact(fr(1n, 2n)), CONTEXT)),
    ATANH_HALF,
    45,
    "atanh(1/2)",
  );
  for (const [x, reference] of ASINH) {
    assertNear(
      value(asinhBall(exact(dec(x)), CONTEXT)),
      dec(reference),
      45,
      `asinh(${x})`,
    );
  }
  for (const [x, reference] of ACOSH) {
    assertNear(
      value(acoshBall(exact(dec(x)), CONTEXT)),
      dec(reference),
      45,
      `acosh(${x})`,
    );
  }
  for (const [x, reference] of ATANH) {
    assertNear(
      value(atanhBall(exact(dec(x)), CONTEXT)),
      dec(reference),
      45,
      `atanh(${x})`,
    );
  }
  // Tiny arguments keep their digits.
  const tiny = exact(dec("1e-50"));
  assertNear(
    value(asinhBall(tiny, CONTEXT)),
    dec(
      "9.99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999983333e-51",
    ),
    45,
    "asinh(1e-50)",
  );
  assertNear(
    value(atanhBall(tiny, CONTEXT)),
    dec(
      "1.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000033333e-50",
    ),
    45,
    "atanh(1e-50)",
  );
  // Identities within the radii: asinh(sinh(x)) contains x, and so on.
  for (const x of ["0.5", "-2", "3", "1e-10"]) {
    const at = exact(dec(x));
    assertNear(
      value(asinhBall(value(sinhBall(at, CONTEXT)), CONTEXT)),
      dec(x),
      35,
      `asinh(sinh(${x}))`,
    );
    assertNear(
      value(atanhBall(value(tanhBall(at, CONTEXT)), CONTEXT)),
      dec(x),
      30,
      `atanh(tanh(${x}))`,
    );
  }
  for (const x of ["1.5", "2", "20"]) {
    const at = exact(dec(x));
    assertNear(
      value(acoshBall(value(coshBall(at, CONTEXT)), CONTEXT)),
      dec(x),
      30,
      `acosh(cosh(${x}))`,
    );
  }
});

test("the two ends of the exponent: the odd functions of a tiny argument are itself within its cube, cosh is one within its square, and far out asinh and acosh are ln(2x) and tanh is one", () => {
  const tiny = dec("1e-999999999");
  for (const fn of [sinhBall, tanhBall, asinhBall, atanhBall]) {
    const result = value(fn(exact(tiny), DEFAULT));
    assert.ok(!isExact(result));
    assert.ok(equals(result.mid, tiny));
    assert.ok(radiusBelow(result, "1e-2999999990"));
    assert.ok(
      compareRadius(result.rad, radiusAboveScaled(dec("1e-2999999998"))) > 0,
    );
    assert.ok(certifies(result, 8, "halfEven"));
    const negative = value(fn(exact(negate(tiny)), DEFAULT));
    assert.ok(equals(negative.mid, negate(tiny)));
    assert.ok(certifies(negative, 8, "halfEven"));
  }
  const one = value(coshBall(exact(tiny), DEFAULT));
  assert.ok(!isExact(one));
  assert.ok(equals(one.mid, ONE));
  assert.ok(radiusBelow(one, "1e-1999999990"));
  assert.ok(
    compareRadius(one.rad, radiusAboveScaled(dec("1e-1999999999"))) > 0,
  );
  assert.ok(certifies(one, 8, "halfEven"));
  // Far out: ln(2|x|) within 1/(2x^2), certified on the first pass.
  const huge = dec("1e999999999");
  for (const fn of [asinhBall, acoshBall]) {
    const result = value(fn(exact(huge), DEFAULT));
    assert.ok(!isExact(result));
    assert.ok(compare(distance(result.mid, LN_TWICE_HUGE), dec("1e-7")) < 0);
    assert.ok(certifies(result, 8, "halfEven"));
    // An argument's radius reaches the result over its distance from zero.
    const wide = value(fn(ballOf(huge, dec("1e999999990")), DEFAULT));
    assert.ok(compare(distance(wide.mid, LN_TWICE_HUGE), dec("1e-7")) < 0);
    assert.ok(certifies(wide, 8, "halfEven"));
  }
  const negative = value(asinhBall(exact(negate(huge)), DEFAULT));
  assert.ok(
    compare(distance(negative.mid, negate(LN_TWICE_HUGE)), dec("1e-7")) < 0,
  );
  // At the top of the exponent bound, where twice the argument would pass
  // it: ln(2x) is taken as ln 2 + ln x, and 2x is never formed (#44).
  // ln(1e1000000000000000001) = (10^18 + 1) ln 10.
  for (const fn of [asinhBall, acoshBall]) {
    const top = value(fn(exact(dec("5e1000000000000000000")), DEFAULT));
    assert.ok(certifies(top, 8, "halfEven"));
    assert.equal(format(top.mid, 8, "halfEven"), "2.3025851e+18");
  }
  // The saturation of tanh stands: ±1 within a radius far below anything.
  const saturated = value(tanhBall(exact(huge), DEFAULT));
  assert.deepEqual(saturated.mid, ONE);
  assert.ok(radiusBelow(saturated, "1e-1000"));
  assert.ok(certifies(saturated, 8, "halfEven"));
  assert.deepEqual(
    value(tanhBall(exact(negate(huge)), DEFAULT)).mid,
    negate(ONE),
  );
  // sinh and cosh of it are still past the exponent bound.
  assert.deepEqual(failure(sinhBall(exact(huge), DEFAULT)), {
    kind: "overflow",
  });
  assert.deepEqual(failure(coshBall(exact(huge), DEFAULT)), {
    kind: "overflow",
  });
});

test("an inexact argument's functions contain those of its ends, and a wide asinh argument is taken at its midpoint", () => {
  const x = ball("1", "1e-20");
  // Over the derivatives cosh 1 (1.54) and sinh 1 (1.18).
  const s = value(sinhBall(x, CONTEXT));
  assertNear(s, SINH1, 19, "sinh(1 ± 1e-20)");
  assert.ok(compare(radiusOf(s), dec("1.54e-20")) > 0);
  assert.ok(compare(radiusOf(s), dec("2e-20")) < 0);
  const c = value(coshBall(x, CONTEXT));
  assertNear(c, COSH1, 19, "cosh(1 ± 1e-20)");
  assert.ok(compare(radiusOf(c), dec("1.17e-20")) > 0);
  assert.ok(compare(radiusOf(c), dec("2e-20")) < 0);
  const t = value(tanhBall(x, CONTEXT));
  assertNear(t, TANH1, 19, "tanh(1 ± 1e-20)");
  // Over 1 / sqrt(2), 1 / sqrt(3) and 4/3 for the inverses at one, two and one half.
  const a = value(asinhBall(x, CONTEXT));
  assertNear(a, ASINH1, 19, "asinh(1 ± 1e-20)");
  assert.ok(compare(radiusOf(a), dec("7e-21")) > 0);
  assert.ok(compare(radiusOf(a), dec("1.5e-20")) < 0);
  const h = value(acoshBall(ball("2", "1e-20"), CONTEXT));
  assertNear(h, ACOSH2, 19, "acosh(2 ± 1e-20)");
  assert.ok(compare(radiusOf(h), dec("5.7e-21")) > 0);
  assert.ok(compare(radiusOf(h), dec("1.2e-20")) < 0);
  const g = value(atanhBall(ball("0.5", "1e-20"), CONTEXT));
  assertNear(g, ATANH_HALF, 19, "atanh(0.5 ± 1e-20)");
  assert.ok(compare(radiusOf(g), dec("1.33e-20")) > 0);
  assert.ok(compare(radiusOf(g), dec("2e-20")) < 0);
  // A wide argument: asinh at the midpoint with the radius added, and the
  // forward functions through the exponential of the whole interval.
  const wide = value(asinhBall(ball("0", "5"), CONTEXT));
  assert.deepEqual(wide.mid, ZERO);
  assert.deepEqual(wide.rad, radiusAbove(rational(5n)));
  const wideSinh = value(sinhBall(ball("0", "5"), CONTEXT));
  assert.deepEqual(wideSinh.mid, ZERO);
  assert.ok(compare(radiusOf(wideSinh), dec("74.2")) > 0);
  assert.ok(compare(radiusOf(wideSinh), dec("74.3")) < 0);
  const wideCosh = value(coshBall(ball("1", "2"), CONTEXT));
  assert.ok(compare(minus(wideCosh.mid, radiusOf(wideCosh)), ONE) <= 0);
  const top = plus(wideCosh.mid, radiusOf(wideCosh));
  assert.ok(compare(top, dec("10.06")) > 0 && compare(top, dec("10.07")) < 0);
  const wideTanh = value(tanhBall(ball("0", "5"), CONTEXT));
  assert.deepEqual(wideTanh, { mid: ZERO, rad: powerOfTwoRadius(0n) });
  // tanh far out with an error: one within 2 e^-2m for the least magnitude.
  const saturated = value(tanhBall(ball("1000", "1"), CONTEXT));
  assert.deepEqual(saturated.mid, ONE);
  assert.ok(compare(radiusOf(saturated), dec("1e-867")) < 0);
  assert.ok(compare(radiusOf(saturated), dec("1e-869")) > 0);
  assert.deepEqual(
    value(tanhBall(exact(dec("-1e6")), CONTEXT)).mid,
    negate(ONE),
  );
});

test("sinh and cosh share the exponential's range, the exponent bound, and tanh saturates", () => {
  // Past the bound above whatever the sign, sinh and cosh being large in
  // magnitude on both sides of zero, where exp is past it below.
  for (const x of ["1e30", "-1e30", "2.4e18", "-2.4e18"]) {
    assert.deepEqual(failure(sinhBall(exact(dec(x)), CONTEXT)), {
      kind: "overflow",
    });
    assert.deepEqual(failure(coshBall(exact(dec(x)), CONTEXT)), {
      kind: "overflow",
    });
    const t = value(tanhBall(exact(dec(x)), CONTEXT));
    assert.deepEqual(t.mid, x.startsWith("-") ? negate(ONE) : ONE);
  }
  // Within it, the values (4.9): cosh(1e6) and sinh(1e6) are exp(1e6) / 2
  // to every digit, 1.5166076984010437725432010707090571635e434294 from
  // Python's decimal module, and sinh(-1e6) the negation.
  for (const [x, digits] of [
    ["1e6", "1.5166077e+434294"],
    ["50000", "2.6488976e+21714"],
  ] as const) {
    for (const f of [sinhBall, coshBall]) {
      const result = value(f(exact(dec(x)), CONTEXT));
      assert.ok(certifies(result, 8, "halfEven"), `${f.name}(${x})`);
      assert.equal(
        format(result.mid, 8, "halfEven"),
        digits,
        `${f.name}(${x})`,
      );
    }
  }
  const negative = value(sinhBall(exact(dec("-1e6")), CONTEXT));
  assert.equal(format(negative.mid, 8, "halfEven"), "-1.5166077e+434294");
  assert.ok(sinhBall(exact(fr(40000n)), CONTEXT).ok);
  assert.ok(coshBall(exact(fr(-40000n)), CONTEXT).ok);
  // A wide ball reaching past the bound is unresolved at the bound, not
  // refused (D18, H.15), and one within it is a value.
  assert.deepEqual(coshBall(ballOf(ZERO, dec("1e30")), CONTEXT), {
    ok: false,
    error: { kind: "unresolved", argument: 0, edge: "bound" },
  });
  assert.ok(coshBall(ballOf(ZERO, dec("1e6")), CONTEXT).ok);
  // The top edge for sinh and cosh is U + ln 2, either sign alike.
  assert.ok(sinhBall(exact(dec("-2302585092994045687")), CONTEXT).ok);
  assert.deepEqual(
    failure(coshBall(exact(dec("2302585092994045688")), CONTEXT)),
    {
      kind: "overflow",
    },
  );
});

test("tanh of a wide argument is zero within one, never refused for its size, and sinh and cosh of one contain the functions", () => {
  // Around zero, one-sided, and far past the exponential's guard: the
  // whole range, which certifies nothing (issues #38 and #49).
  for (const [mid, rad] of [
    ["0", "1e9"],
    ["-1", "1e13"],
    ["50", "49.5"],
    ["0", "1e30"],
    ["0", "1e999999999"],
    ["1e40", "1e41"],
    ["0", "0.5"],
  ]) {
    const wide = value(tanhBall(ball(mid!, rad!), CONTEXT));
    assert.deepEqual(
      wide,
      { mid: ZERO, rad: powerOfTwoRadius(0n) },
      `tanh(${mid} ± ${rad})`,
    );
  }
  // Far out on one side throughout, the saturation still comes first.
  const saturated = value(
    tanhBall(ball("1e999999999", "1e999999998"), CONTEXT),
  );
  assert.deepEqual(saturated.mid, ONE);
  assert.ok(radiusBelow(saturated, "1e-1000"));
  // An argument narrower than one half stays on the kernel.
  const narrow = value(tanhBall(ball("0", "0.49"), CONTEXT));
  assert.deepEqual(narrow.mid, ZERO);
  assert.ok(compare(radiusOf(narrow), ONE) < 0);
  assert.ok(compare(radiusOf(narrow), dec("0.45")) > 0);
  // sinh and cosh of the same wide arguments, which this leaves alone,
  // contain the functions at the midpoint and at both ends (the values
  // from Python's decimal module, or points just inside them).
  const contains = (b: Ball, v: Scaled, label: string) => {
    const where = position(b, v);
    assert.ok(where !== "above" && where !== "below", label);
  };
  const wideZero = ball("0", "1e9");
  const s0 = value(sinhBall(wideZero, CONTEXT));
  const c0 = value(coshBall(wideZero, CONTEXT));
  for (const v of [ZERO, dec("4e434294481"), dec("-4e434294481")]) {
    contains(s0, v, `sinh(0 ± 1e9) contains ${format(v, 3, "halfEven")}`);
  }
  for (const v of [ONE, dec("4e434294481")]) {
    contains(c0, v, `cosh(0 ± 1e9) contains ${format(v, 3, "halfEven")}`);
  }
  const oneSided = ball("100", "99.9");
  const s100 = value(sinhBall(oneSided, CONTEXT));
  const c100 = value(coshBall(oneSided, CONTEXT));
  for (const v of ["0.10016675", "1.3440585709e43", "3.269e86"]) {
    contains(s100, dec(v), `sinh(100 ± 99.9) contains ${v}`);
  }
  for (const v of ["1.0050041681", "1.3440585709e43", "3.269e86"]) {
    contains(c100, dec(v), `cosh(100 ± 99.9) contains ${v}`);
  }
  const acrossZero = ball("1", "2");
  const s1 = value(sinhBall(acrossZero, CONTEXT));
  const c1 = value(coshBall(acrossZero, CONTEXT));
  for (const v of [negate(SINH1), SINH1, dec("10.017874927")]) {
    contains(s1, v, `sinh(1 ± 2) contains ${format(v, 5, "halfEven")}`);
  }
  for (const v of [COSH1, dec("10.067661996")]) {
    contains(c1, v, `cosh(1 ± 2) contains ${format(v, 5, "halfEven")}`);
  }
});

test("acosh below one and atanh at or beyond an end are domain errors, and a ball reaching an end is unresolved at it", () => {
  for (const x of [
    exact(ZERO),
    exact(dec("0.5")),
    exact(fr(-2n)),
    ball("0.5", "0.4"),
    ball("-3", "1"),
  ]) {
    assert.deepEqual(failure(acoshBall(x, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "belowOne",
    });
  }
  for (const x of [
    ball("1", "0.5"),
    ball("1.5", "0.5"),
    ball("0.9", "0.2"),
    ball("1", "1e-30"),
  ]) {
    assert.deepEqual(failure(acoshBall(x, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: ONE,
    });
  }
  for (const x of [
    exact(ONE),
    exact(negate(ONE)),
    exact(fr(2n)),
    exact(dec("-1.5")),
    ball("1.5", "0.5"),
    ball("-2", "1"),
  ]) {
    assert.deepEqual(failure(atanhBall(x, CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "outsideOpenUnitInterval",
    });
  }
  for (const [x, edge] of [
    [ball("0.5", "0.5"), ONE],
    [ball("1", "1e-30"), ONE],
    [ball("0.9", "0.2"), ONE],
    [ball("-0.9", "0.2"), negate(ONE)],
    [ball("-1", "1e-30"), negate(ONE)],
  ] as const) {
    assert.deepEqual(failure(atanhBall(x, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge,
    });
  }
});

test("an unbounded argument gives the function of its midpoint with an unbounded radius", () => {
  const one = { mid: ONE, rad: UNBOUNDED };
  const two = { mid: fr(2n), rad: UNBOUNDED };
  const half = { mid: fr(1n, 2n), rad: UNBOUNDED };
  for (const [result, reference] of [
    [sinhBall(one, CONTEXT), SINH1],
    [coshBall(one, CONTEXT), COSH1],
    [tanhBall(one, CONTEXT), TANH1],
    [asinhBall(one, CONTEXT), ASINH1],
    [acoshBall(two, CONTEXT), ACOSH2],
    [atanhBall(half, CONTEXT), ATANH_HALF],
  ] as const) {
    const at = value(result);
    assert.deepEqual(at.rad, UNBOUNDED);
    assert.ok(compare(distance(at.mid, reference), dec("1e-40")) < 0);
  }
  // The midpoint is still held to the domain.
  assert.deepEqual(failure(acoshBall(half, CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "belowOne",
  });
  assert.deepEqual(failure(atanhBall(two, CONTEXT)), {
    kind: "domain",
    argument: 0,
    reason: "outsideOpenUnitInterval",
  });
});

test("through the pipeline: the values certify, the identities hold, and the errors are worded", () => {
  const parsed = parseDefinitions("m  !");
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const at = (text: string, precision: number) =>
    evaluateText(table.value, text, { ...context, precision });
  for (const [text, digits] of [
    ["sinh(1)", "1.1752012"],
    ["cosh(1)", "1.5430806"],
    ["tanh(1)", "0.76159416"],
    ["asinh(1)", "0.88137359"],
    ["acosh(2)", "1.3169579"],
    ["atanh(0.5)", "0.54930614"],
    ["sinh(1e-10)", "1e-10"],
    ["cosh(1000)", "9.8503556e+433"],
    ["cosh(1e6)", "1.5166077e+434294"],
    ["sinh(-1e6)", "-1.5166077e+434294"],
    ["tanh(1e6)", "1"],
    ["acosh(1 + 1e-30)", "1.4142136e-15"],
    ["asinh(1e-50)", "1e-50"],
    ["atanh(1e-50)", "1e-50"],
    ["cosh(1)^2 - sinh(1)^2", "1"],
    ["asinh(sinh(3))", "3"],
    ["2 atanh(1/2)", "1.0986123"],
    ["tanh(1e999999999)", "1"],
    ["asinh(1e999999999)", "2.3025851e+9"],
    ["acosh(1e999999999)", "2.3025851e+9"],
    ["sinh(1e-999999999)", "1e-999999999"],
    ["cosh(1e-999999999)", "1"],
  ]) {
    const result = at(text!, 8);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    const shown = show(result.value.magnitude, 8, DEFAULT_ROUNDING);
    assert.equal(shown.kind, "certified", text);
    assert.equal(shown.text, digits, text);
  }
  const thirty = at("atanh(tanh(0.5))", 30);
  assert.ok(thirty.ok);
  assert.equal(show(thirty.value.magnitude, 30, DEFAULT_ROUNDING).text, "0.5");
  const exactOne = at("cosh(0) m", 8);
  assert.ok(exactOne.ok && isExact(exactOne.value.magnitude));
  const exactZero = at("acosh(1) m", 8);
  assert.ok(exactZero.ok && isExact(exactZero.value.magnitude));
  const primitives = table.value.primitives;
  for (const [text, message] of [
    [
      "acosh(0.5)",
      'Cannot compute "acosh(0.5)": "0.5" is less than 1, and "acosh" is defined only from 1 up.',
    ],
    [
      "atanh(1)",
      'Cannot compute "atanh(1)": "1" is not strictly between -1 and 1, where "atanh" is defined.',
    ],
    [
      "atanh(-2)",
      'Cannot compute "atanh(-2)": "-2" is not strictly between -1 and 1, where "atanh" is defined.',
    ],
    [
      "sinh(1 m)",
      'Cannot apply "sinh" to "1 m": "1 m" has dimension m, but the argument of "sinh" must be a plain number.',
    ],
    [
      "sinh(1e30)",
      '"sinh(1e30)" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "cosh(-1e30)",
      '"cosh(-1e30)" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "sinh(-1e30)",
      '"sinh(-1e30)" is too large to compute: its exponent would pass 10^18.',
    ],
    [
      "acosh(1 + ((2^(1/2))^2 - 2))",
      '"1 + ((2^(1/2))^2 - 2)" cannot be told from 1 at this precision, and the result depends on which side of 1 it lies.',
    ],
    [
      "atanh(-1 - ((2^(1/2))^2 - 2))",
      '"-1 - ((2^(1/2))^2 - 2)" cannot be told from -1 at this precision, and the result depends on which side of -1 it lies.',
    ],
    ["tanh()", '"tanh" takes 1 argument, but "tanh()" gives no arguments.'],
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

test("through the pipeline, tanh of a wide argument ends as a zero with a bound or narrows to its value, and is never refused", () => {
  const parsed = parseDefinitions("m  !\nradian  !kind");
  assert.ok(parsed.ok);
  const context = { ...CONTEXT, ceiling: 200 };
  const table = buildTable(parsed.value, { ...context, precision: 200 });
  assert.ok(table.ok, inspect(table));
  const at = (text: string, precision: number) =>
    evaluateText(table.value, text, { ...context, precision });
  // #38's texts: at every pass the argument is a ball around zero, and at
  // the last it is narrow enough for the kernel, whose tanh is a ball
  // around zero too; a ball containing zero never certifies, so the
  // result is a zero with a bound, not `≈ 0` certified, and never `±1`.
  for (const text of [
    "tanh(1e60 * sqrt(2) - 1e60 * sqrt(2))",
    "tanh(approx(1e60) - approx(1e60))",
  ]) {
    const result = at(text, 32);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    const shown = show(result.value.magnitude, 32, DEFAULT_ROUNDING);
    assert.equal(shown.kind, "zero", text);
  }
  // #49's texts: the argument stays wide to the ceiling, and the answer
  // is the whole range, `0` within `1`, where it was refused.
  for (const text of [
    "tanh(1e5000 * (sin(1 radian)^2 + cos(1 radian)^2 - 1))",
    "tanh(1e20000 - approx(1e20000))",
  ]) {
    const result = at(text, 8);
    assert.ok(result.ok, `${text}: ${inspect(result)}`);
    assert.deepEqual(
      show(result.value.magnitude, 8, DEFAULT_ROUNDING),
      { kind: "zero", text: "0", bound: "1" },
      text,
    );
  }
  // An argument that narrows: wide at the first passes, then on the kernel.
  const narrowed = at("tanh(approx(1e40) - approx(1e40) - 1)", 8);
  assert.ok(narrowed.ok, inspect(narrowed));
  assert.deepEqual(show(narrowed.value.magnitude, 8, DEFAULT_ROUNDING), {
    kind: "certified",
    text: "-0.76159416",
  });
});
