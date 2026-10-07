import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EXACT_DENOMINATOR_BITS,
  digammaFixed,
  digammaRational,
  exactShiftTarget,
  lgammaFixed,
  lgammaRational,
  lnPiFixed,
  lnPiMemoBits,
  shiftTarget,
} from "./fixed-gamma.ts";
import {
  bitsFor,
  fixedFromScaled,
  fixedToBall,
  fixedToScaled,
  toRational,
  type Fixed,
} from "./fixed.ts";
import {
  MAX_SIGNIFICAND_LIMIT_BITS,
  add,
  compare,
  rational,
  subtract,
} from "./rational.ts";
import {
  ratioGrowths,
  ratioMemoBits,
  ratioMemoCount,
} from "./bernoulli-ratios.ts";
import { MEMO_MARGIN } from "./constants.ts";
import { format, toRational as scaledToRational } from "./scaled.ts";
import { dec } from "../testing/scaled.ts";

/** The reference values of `ψ(x)` to forty digits, from mpmath (`psi(0, x)` at 50 digits, rounded by `nstr`). */
const REFERENCES: readonly [string, string][] = [
  ["1", "-0.5772156649015328606065120900824024310422"],
  ["0.5", "-1.963510026021423479440976332998755567193"],
  ["2", "0.4227843350984671393934879099175975689578"],
  ["7", "1.872784335098467139393487909917597568958"],
  ["10", "2.251752589066721107647456163885851537212"],
  ["100.5", "4.605174352581845211868678785604714548573"],
  ["3.7", "1.167153539361511385873863966145046881174"],
  ["0.25", "-4.227453533376265408089530146096683577367"],
  ["2.5", "0.7031566406452431872256903336679110994735"],
  ["0.9999", "-0.5773801703298691417827632771944969155335"],
  ["1e-6", "-1000000.577214019968668068200913015168235"],
  ["1e19", "43.74911676688686799629183763900291994442"],
  ["1e30", "69.07755278982137052053974364053042622803"],
  ["123456789", "18.63140176211801799087143291307419983533"],
];

/** `ψ(3.7)` to a thousand digits and more, from mpmath at 1010 digits. */
const PSI_3_7 =
  "1.1671535393615113858738639661450468811737487878768991645596507407802378955018539582146816685949177396799460474931956999138296942296292517868804928895243589328953996811415900924927257358628151529692816820030729368132811170465170237591285841535275864120725491091202070217415146680999384144466982862091421348104433813446842558189341825805683739402584229012553707827740016755493073030710965860756286946295167865678194550778385113967792561642509405078444221572726604006711768136943398911599835967036303902930441481613573461119442513468828622058844947565193352626794588128303269300836099998376211365701301246438100552778632048729416064086906310109413211862208712410805660780365388162351372847935228697672478918729187889418228825730829047338262343284313196735515876632279069936196334129738393140834885131104327420885208372853708985567776734007213980721582599115121869435277465340347922056420296916898012319585455393828896307532864736819132279243894828169761863414898765791797396803159503840424400122752981974299";

/** A `Fixed` of the decimal `text` at `bits`. */
function at(text: string, bits: number): Fixed {
  return fixedFromScaled(dec(text), bits);
}

/** The exact fraction a decimal reference denotes. */
function fraction(text: string) {
  const r = scaledToRational(dec(text), MAX_SIGNIFICAND_LIMIT_BITS);
  assert.ok(r.ok);
  return r.value;
}

test("the shift target is about a third of the working bits, and at least two", () => {
  assert.equal(shiftTarget(100), 34);
  assert.equal(shiftTarget(3), 2);
  assert.equal(shiftTarget(bitsFor(1000)), Math.ceil(bitsFor(1000) / 3));
});

test("a series reserves the Bernoulli ratios it will take, so that a pass computes its run once", () => {
  // The first call of the kernel in this file: the memo is empty, and the
  // series must never fall back to growing it a quarter at a time.
  assert.equal(ratioMemoCount(), 0);
  const growths = ratioGrowths();
  // At 336 digits (1,149 bits, the schedule's fourth pass) the shift
  // target is 383, the working bits 1,174 and the series takes 124 terms:
  // the prediction is 125, and the reservation four more, at the working
  // bits plus the margin.
  lgammaFixed(at("0.5", bitsFor(336)), bitsFor(336), bitsFor(1000));
  assert.equal(ratioMemoCount(), 129);
  assert.equal(ratioMemoBits(), 1174 + MEMO_MARGIN);
  assert.equal(ratioGrowths(), growths);
  // A pass at fewer bits is served from the run.
  digammaFixed(at("2.5", bitsFor(40)), bitsFor(40), bitsFor(1000));
  assert.equal(ratioMemoCount(), 129);
  assert.equal(ratioMemoBits(), 1174 + MEMO_MARGIN);
  // The next pass, at 672 digits and 2,291 working bits, takes 242 terms:
  // one run, to its count and bits.
  digammaFixed(at("0.5", bitsFor(672)), bitsFor(672), bitsFor(1000));
  assert.equal(ratioMemoCount(), 246);
  assert.equal(ratioMemoBits(), 2291 + MEMO_MARGIN);
  assert.equal(ratioGrowths(), growths);
});

test("digammaFixed matches mpmath to forty digits, with an error of a few ulps", () => {
  const bits = bitsFor(40);
  for (const [x, reference] of REFERENCES) {
    // A small argument comes at extra bits, as the built-in sends it, so
    // that its reciprocal keeps the digits; the result is at the working bits.
    const extra = x === "1e-6" ? 20 : 0;
    const g = digammaFixed(at(x, bits + extra), bits, bits);
    assert.equal(
      format(fixedToScaled(g, 40), 40, "halfAwayFromZero"),
      reference,
      `ψ(${x})`,
    );
    // The value is within a few hundred ulps of the working bits, and the
    // true value within the error of it: the reference's own rounding is
    // half a unit in its last digit, which the slack allows for.
    assert.ok(g.error < 1n << 12n, `ψ(${x}) error ${g.error} ulps`);
    const places = BigInt(reference.length - reference.indexOf(".") - 1);
    const half = rational(1n, 2n * 10n ** places);
    const distance = subtract(toRational(g), fraction(reference));
    const magnitude =
      distance.num < 0n ? rational(-distance.num, distance.den) : distance;
    const bound = add(rational(g.error, 1n << BigInt(g.bits)), half);
    assert.ok(
      compare(magnitude, bound) <= 0,
      `ψ(${x}) is within its error of the reference`,
    );
  }
});

test("the error contains the digamma of every value in the argument's interval", () => {
  // 2.5 ± 2^-50: the ends, from mpmath at 60 digits.
  const bits = bitsFor(40);
  const f: Fixed = { ...at("2.5", bits), error: 1n << BigInt(bits - 50) };
  const g = digammaFixed(f, bits, bits);
  const lower = fraction(
    "0.7031566406452427517005134328617721143203806742838273153",
  );
  const upper = fraction(
    "0.7031566406452436227508672344738637524846384860298420692",
  );
  const value = toRational(g);
  const error = rational(g.error, 1n << BigInt(g.bits));
  const lo = subtract(value, error);
  const hi = {
    num: value.num * error.den + error.num * value.den,
    den: value.den * error.den,
  };
  assert.ok(compare(lo, lower) <= 0, "the lower end is contained");
  assert.ok(compare(hi, upper) >= 0, "the upper end is contained");
  // And the interval is not wastefully wide: a few times the argument's.
  const width = rational(2n * g.error, 1n << BigInt(g.bits));
  assert.ok(
    compare(width, rational(1n, 1n << 46n)) < 0,
    "the width is of the argument's order",
  );
});

test("digammaFixed at a thousand digits", () => {
  const bits = bitsFor(1000);
  const g = digammaFixed(at("3.7", bits), bits, bits);
  const shown = format(fixedToScaled(g, 1000), 1000, "halfAwayFromZero");
  assert.equal(shown.slice(0, 999), PSI_3_7.slice(0, 999));
  // The argument's own ulp through the shift and the series, which adds two.
  assert.ok(g.error <= 32n, `error ${g.error} ulps`);
  const ball = fixedToBall(g, 1000);
  assert.ok(ball.rad.kind === "bounded" && ball.rad.exp < -3300n);
});

test("digammaFixed takes a positive interval", () => {
  const bits = bitsFor(20);
  assert.throws(() => digammaFixed(at("0", bits), bits, bits), RangeError);
  assert.throws(() => digammaFixed(at("-1.5", bits), bits, bits), RangeError);
  assert.throws(
    () =>
      digammaFixed(
        { ...at("1e-9", bits), error: 1n << BigInt(bits) },
        bits,
        bits,
      ),
    RangeError,
  );
});

// ---------------------------------------------------------------------------
// lgamma

/** The reference values of `ln Γ(x)` to forty digits, from mpmath (`loggamma` at 60 digits, rounded by `nstr`). */
const LGAMMA_REFERENCES: readonly [string, string][] = [
  ["3", "0.6931471805599453094172321214581765680755"],
  ["7", "6.579251212010100995060178292903945321123"],
  ["10", "12.80182748008146961120771787456670616428"],
  ["0.5", "0.5723649429247000870717136756765293558236"],
  ["100.5", "361.4355404677776215552519127025207628588"],
  ["3.7", "1.428072326665387921872381125047550334507"],
  ["0.25", "1.288022524698077457370610440219717295925"],
  ["2.5", "0.2846828704729191596324946696827019243201"],
  ["1.5", "-0.1207822376352452223455184457816472122519"],
  ["0.1", "2.252712651734205959869701646368495118616"],
  ["1e-6", "13.81550998074943166920782687100640098472"],
  ["1e19", "427491167668868679942.4627565397904381878"],
  ["1e30", "68077552789821370520539743640497.30639017"],
  ["1e15", "33538776394910668.90982020756959565809274"],
  ["123456789", "2176716239.223269991667882156745419998727"],
];

/** `ln Γ(3.7)` to a thousand digits and more, from mpmath at 1010 digits. */
const LGAMMA_3_7 =
  "1.42807232666538792187238112504755033450691711187523830219538845475675017769217069533815286907655034836632947898122635870759459288943226045601899656864396713977612147899764640815956956720136251110539821266222895793507775057003504918406803210085503244175989591571833128351304958820478153996429360836812801160809804488812912221603939531824442012744297882170625783488889051775518879560799912421418537945977745619786721959993069172933662379991837772703499531058276721451043771475457638743175659535941476298199623452854772479708643665473717169031991549107572833584574408072838056607259191225346033990567719003539332857472025842304967566868828115732015239820235926400214315545612172637168131858551573021537567496892821840651234114653384674505419303063228714455277070808772751623060355364252475608988916913846535554080466343979061879575740911144331984739283404013453614167379483083108099168444228278862454226386653499855470755137118597677967597971104260068384473104374562164785394047236232401851647939121371270173";

test("lgammaFixed matches mpmath to forty digits, with an error of a few ulps", () => {
  const bits = bitsFor(40);
  for (const [x, reference] of LGAMMA_REFERENCES) {
    const extra = x === "1e-6" ? 20 : 0;
    const g = lgammaFixed(at(x, bits + extra), bits, bits);
    assert.equal(
      format(fixedToScaled(g, 40), 40, "halfAwayFromZero"),
      reference,
      `ln Γ(${x})`,
    );
    assert.ok(g.error < 1n << 12n, `ln Γ(${x}) error ${g.error} ulps`);
    const places = BigInt(reference.length - reference.indexOf(".") - 1);
    const half = rational(1n, 2n * 10n ** places);
    const distance = subtract(toRational(g), fraction(reference));
    const magnitude =
      distance.num < 0n ? rational(-distance.num, distance.den) : distance;
    const bound = add(rational(g.error, 1n << BigInt(g.bits)), half);
    assert.ok(
      compare(magnitude, bound) <= 0,
      `ln Γ(${x}) is within its error of the reference`,
    );
  }
});

test("lgammaFixed at one and two is zero within its error, by cancellation", () => {
  const bits = bitsFor(40);
  for (const x of ["1", "2"]) {
    const g = lgammaFixed(at(x, bits), bits, bits);
    assert.ok(
      (g.value < 0n ? -g.value : g.value) <= g.error,
      `ln Γ(${x}) contains zero`,
    );
    assert.ok(g.error < 1n << 12n, `ln Γ(${x}) error ${g.error} ulps`);
  }
});

test("the error contains the log-gamma of every value in the argument's interval", () => {
  // 2.5 ± 2^-50: the ends, from mpmath at 60 digits.
  const bits = bitsFor(40);
  const f: Fixed = { ...at("2.5", bits), error: 1n << BigInt(bits - 50) };
  const g = lgammaFixed(f, bits, bits);
  const lower = fraction(
    "0.2846828704729185351039407797419550333221280051879802137",
  );
  const upper = fraction(
    "0.2846828704729197841610485596238356393815067613310775984",
  );
  const value = toRational(g);
  const error = rational(g.error, 1n << BigInt(g.bits));
  const lo = subtract(value, error);
  const hi = add(value, error);
  assert.ok(compare(lo, lower) <= 0, "the lower end is contained");
  assert.ok(compare(hi, upper) >= 0, "the upper end is contained");
  // The width is a few times the argument's: the shift's product and
  // Stirling's part each carry the argument's error at their own slope,
  // about ln(N / x) and ln N, where the true slope is ψ(2.5), below one.
  const width = rational(2n * g.error, 1n << BigInt(g.bits));
  assert.ok(
    compare(width, rational(1n, 1n << 44n)) < 0,
    "the width is of the argument's order",
  );
});

test("lgammaFixed at a thousand digits", () => {
  const bits = bitsFor(1000);
  const g = lgammaFixed(at("3.7", bits), bits, bits);
  const shown = format(fixedToScaled(g, 1000), 1000, "halfAwayFromZero");
  assert.equal(shown.slice(0, 999), LGAMMA_3_7.slice(0, 999));
  // The argument's own ulp through the shift and the series, which adds two.
  assert.ok(g.error <= 32n, `error ${g.error} ulps`);
});

test("lgammaFixed takes a positive interval", () => {
  const bits = bitsFor(20);
  assert.throws(() => lgammaFixed(at("0", bits), bits, bits), RangeError);
  assert.throws(() => lgammaFixed(at("-1.5", bits), bits, bits), RangeError);
});

test("ln pi is memoized at the ceiling plus the margin, as the constants are (D10)", () => {
  const ceilingBits = bitsFor(60);
  const f = lnPiFixed(bitsFor(20), ceilingBits);
  assert.equal(f.bits, bitsFor(20));
  // The tests above have filled the memo at a thousand digits already.
  const held = lnPiMemoBits();
  assert.ok(held !== undefined && held >= ceilingBits + MEMO_MARGIN);
  // ln pi = 1.1447298858494001741434273513530587116472948129153…
  assert.equal(
    format(fixedToScaled(f, 20), 20, "halfAwayFromZero"),
    "1.1447298858494001741",
  );
  const higher = bitsFor(2000);
  lnPiFixed(higher, higher);
  assert.equal(lnPiMemoBits(), higher + MEMO_MARGIN);
});

test("the exact shift's target is four times the bits for a short denominator, shorter for a wide one, and never below the loop's", () => {
  const bits = bitsFor(1000);
  assert.equal(exactShiftTarget(bits, 2n), 4 * bits);
  assert.equal(exactShiftTarget(bits, 10n ** 18n), 4 * bits);
  // At the default ceiling a denominator of sixty bits makes factors of
  // seventy-six, and two megabits of product hold 27,594 of them.
  const ceiling = 13471;
  assert.equal(exactShiftTarget(ceiling, 2n), 4 * ceiling);
  assert.equal(
    exactShiftTarget(ceiling, 10n ** 18n),
    Math.floor(2 ** 21 / (60 + 16)),
  );
  assert.ok(exactShiftTarget(100, (1n << 63n) + 1n) >= shiftTarget(100));
  assert.equal(EXACT_DENOMINATOR_BITS, 64);
});

test("lgammaRational matches the references and lies within the loop's interval", () => {
  const bits = bitsFor(40);
  for (const [x, reference] of LGAMMA_REFERENCES) {
    const r = fraction(x);
    const g = lgammaRational(r.num, r.den, bits, bits);
    assert.equal(
      format(fixedToScaled(g, 40), 40, "halfAwayFromZero"),
      reference,
      `ln Γ(${x})`,
    );
    assert.ok(g.error <= 16n, `ln Γ(${x}) error ${g.error} ulps`);
    const extra = x === "1e-6" ? 20 : 0;
    const loop = lgammaFixed(at(x, bits + extra), bits, bits);
    const apart = subtract(toRational(g), toRational(loop));
    const distance = apart.num < 0n ? rational(-apart.num, apart.den) : apart;
    const bound = add(
      rational(g.error, 1n << BigInt(g.bits)),
      rational(loop.error, 1n << BigInt(loop.bits)),
    );
    assert.ok(compare(distance, bound) <= 0, `ln Γ(${x}) agrees with the loop`);
  }
  assert.throws(() => lgammaRational(0n, 1n, bits, bits), RangeError);
  assert.throws(() => lgammaRational(1n, 0n, bits, bits), RangeError);
  assert.throws(() => lgammaRational(-1n, 2n, bits, bits), RangeError);
});

test("digammaRational matches the references and lies within the loop's interval", () => {
  const bits = bitsFor(40);
  for (const [x, reference] of REFERENCES) {
    const r = fraction(x);
    const g = digammaRational(r.num, r.den, bits, bits);
    assert.equal(
      format(fixedToScaled(g, 40), 40, "halfAwayFromZero"),
      reference,
      `ψ(${x})`,
    );
    assert.ok(g.error <= 16n, `ψ(${x}) error ${g.error} ulps`);
    const extra = x === "1e-6" ? 20 : 0;
    const loop = digammaFixed(at(x, bits + extra), bits, bits);
    const apart = subtract(toRational(g), toRational(loop));
    const distance = apart.num < 0n ? rational(-apart.num, apart.den) : apart;
    const bound = add(
      rational(g.error, 1n << BigInt(g.bits)),
      rational(loop.error, 1n << BigInt(loop.bits)),
    );
    assert.ok(compare(distance, bound) <= 0, `ψ(${x}) agrees with the loop`);
  }
  assert.throws(() => digammaRational(1n, -2n, bits, bits), RangeError);
});

test("the exact entries at a thousand digits, within a few ulps", () => {
  const bits = bitsFor(1000);
  const lg = lgammaRational(37n, 10n, bits, bits);
  assert.equal(
    format(fixedToScaled(lg, 1000), 1000, "halfAwayFromZero").slice(0, 999),
    LGAMMA_3_7.slice(0, 999),
  );
  assert.ok(lg.error <= 8n, `error ${lg.error} ulps`);
  const psi = digammaRational(37n, 10n, bits, bits);
  assert.equal(
    format(fixedToScaled(psi, 1000), 1000, "halfAwayFromZero").slice(0, 999),
    PSI_3_7.slice(0, 999),
  );
  assert.ok(psi.error <= 8n, `error ${psi.error} ulps`);
});
