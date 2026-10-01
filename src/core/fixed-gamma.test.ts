import assert from "node:assert/strict";
import { test } from "node:test";
import { digammaFixed, shiftTarget } from "./fixed-gamma.ts";
import {
  bitsFor,
  fixedFromScaled,
  fixedToBall,
  fixedToScaled,
  toRational,
  type Fixed,
} from "./fixed.ts";
import { LIMIT_BITS, add, compare, rational, subtract } from "./rational.ts";
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
  const r = scaledToRational(dec(text), LIMIT_BITS);
  assert.ok(r.ok);
  return r.value;
}

test("the shift target is about a third of the working bits, and at least two", () => {
  assert.equal(shiftTarget(100), 34);
  assert.equal(shiftTarget(3), 2);
  assert.equal(shiftTarget(bitsFor(1000)), Math.ceil(bitsFor(1000) / 3));
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
  assert.ok(g.error < 1n << 20n, `error ${g.error} ulps`);
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
