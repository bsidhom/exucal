import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lowerSeriesFixed,
  seriesTermCount,
  upperFractionFixed,
  upperReducedFixed,
} from "./fixed-incomplete.ts";
import {
  bitsFor,
  fixedFromScaled,
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
import { format, toRational as scaledToRational } from "./scaled.ts";
import { dec } from "../testing/scaled.ts";

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

/** Whether `f`'s interval contains the value `text` denotes, within half a unit of its last digit, the reference's own rounding. */
function contains(f: Fixed, text: string): boolean {
  const value = toRational(f);
  const places = BigInt(text.length - text.indexOf(".") - 1);
  const error = add(
    rational(f.error, 1n << BigInt(f.bits)),
    rational(1n, 2n * 10n ** places),
  );
  const point = fraction(text);
  return (
    compare(subtract(value, error), point) <= 0 &&
    compare(add(value, error), point) >= 0
  );
}

/** `Σ' = γ(s, x) s e^x x^-s` at (2.5, 1.5), from mpmath at 60 digits, and to a thousand. */
const SIGMA = "1.621554472951743472513556614510372326937";
const SIGMA_1000 =
  "1.62155447295174347251355661451037232693708592175872550719041359998386640872611324466137790709266842380963176415163117196947955259216901625912620400288256364727250775593227396821520022767454702329147416078624616802002914718623946772629145015972090331327658063239890675068703938172086805606886379719555917306766028320174243348093883875913153319624283189490272101286898204568969430532102279653342654903802271935285793635061970078083066550942335604632276834341966024144071892140968978990906223504223342199384005880375054244667549868427067854004562405613628710392868817142765019390012353517350195935828199274231257653121982453827321153199375010926048637807649250288646173331485161086365200750937079609571095931472697762878893551857097081679284900451591749999740327374376457499378394373708185896467235831862936280772895396308385833209283396788989955789714544636268068710597997123752954580693523642747434683993609504817786313933065937874994977256502610224640711950499215614862062216705644141416902777199210408536";

test("the series matches mpmath and bounds its tail", () => {
  const bits = bitsFor(40);
  const f = lowerSeriesFixed(at("2.5", bits), at("1.5", bits), bits, 10_000);
  assert.equal(format(fixedToScaled(f, 40), 40, "halfAwayFromZero"), SIGMA);
  assert.ok(f.error < 1n << 12n, `error ${f.error} ulps`);
  assert.ok(contains(f, SIGMA));
  // At a thousand digits.
  const high = bitsFor(1000);
  const g = lowerSeriesFixed(at("2.5", high), at("1.5", high), high, 10_000);
  assert.equal(
    format(fixedToScaled(g, 1000), 1000, "halfAwayFromZero").slice(0, 999),
    SIGMA_1000.slice(0, 999),
  );
  // Past the region's edge the terms grow first: x = 20, s = 2 is 1 at
  // the limit, e^20 Σ … and still right.
  const far = lowerSeriesFixed(at("2", bits), at("20", bits), bits, 10_000);
  // Σ' = γ(2, 20) × 2 × e^20 / 400, with γ(2, 20) = 1 - 21 e^-20.
  assert.ok(contains(far, "2425825.872048951389845534152707702793423"));
});

test("the series contains the sum for every order and argument in the intervals", () => {
  // The corners (s ± 2^-50, x ± 2^-50), from mpmath at 60 digits; the
  // sum rises with x and falls with s, so the corners are its extremes.
  const bits = bitsFor(40);
  const f = lowerSeriesFixed(
    { ...at("2.5", bits), error: 1n << BigInt(bits - 50) },
    { ...at("1.5", bits), error: 1n << BigInt(bits - 50) },
    bits,
    10_000,
  );
  for (const corner of [
    "1.6215544729517431581110969017295401160245168359827",
    "1.6215544729517441983995769102154142436071475557333",
    "1.6215544729517427466275363188061044961835323655502",
    "1.6215544729517437869160163272911583981264528980162",
  ]) {
    assert.ok(contains(f, corner), corner);
  }
  assert.ok(f.error < 1n << BigInt(bits - 44), `width ${f.error} ulps`);
});

test("the term count estimate is a few terms for a small argument, and the limit past it", () => {
  const bits = bitsFor(40);
  assert.ok(
    seriesTermCount(at("2.5", bits), at("0.1", bits), bits, 10_000) < 40,
  );
  const near = seriesTermCount(at("2.5", bits), at("1.5", bits), bits, 10_000);
  assert.ok(near > 40 && near < 200, `${near}`);
  // x near a large s: about sqrt(2 s bits ln 2) terms.
  const large = seriesTermCount(
    at("1e6", bits),
    at("1e6", bits),
    bits,
    100_000,
  );
  assert.ok(large > 10_000 && large < 40_000, `${large}`);
  assert.equal(
    seriesTermCount(at("1e8", bits), at("1e8", bits), bits, 10_000),
    10_001,
  );
});

test("the continued fraction matches mpmath, brackets the value, and reduces an order above one", () => {
  const bits = bitsFor(40);
  const { value, bracketed } = upperFractionFixed(
    at("0.5", bits),
    at("3", bits),
    bits,
    10_000,
  );
  assert.ok(bracketed);
  assert.equal(
    format(fixedToScaled(value, 40), 40, "halfAwayFromZero"),
    "0.2940439749423022534950365679322712094257",
  );
  assert.ok(value.error < 1n << 12n, `error ${value.error} ulps`);
  // The corners (a ± 2^-50, x ± 2^-50).
  const wide = upperFractionFixed(
    { ...at("0.5", bits), error: 1n << BigInt(bits - 50) },
    { ...at("3", bits), error: 1n << BigInt(bits - 50) },
    bits,
    10_000,
  );
  for (const corner of [
    "0.2940439749423022692286725076230447778605750506571",
    "0.29404397494230211238224768520168173206195829550846",
    "0.29404397494230239460782545066298797398870149287988",
    "0.29404397494230223776140062824150124689162819475268",
  ]) {
    assert.ok(contains(wide.value, corner), corner);
  }
  // A small argument converges slowly and still brackets.
  const slow = upperFractionFixed(
    at("0.5", bits),
    at("0.1", bits),
    bits,
    10_000,
  );
  assert.ok(slow.bracketed);
  assert.ok(contains(slow.value, "4.055650792041963903296037480589897037175"));
  // The order 3.5 reduced by three steps from 0.5.
  const reduced = upperReducedFixed(
    at("3.5", bits),
    at("3", bits),
    3,
    bits,
    10_000,
  );
  assert.ok(contains(reduced, "0.7704197204821043231593775394397410562101"));
  assert.ok(reduced.error < 1n << 12n, `error ${reduced.error} ulps`);
  // An order above one is not bracketed by the fraction itself.
  assert.equal(
    upperFractionFixed(at("3.5", bits), at("3", bits), bits, 10_000).bracketed,
    false,
  );
  // At the limit, the bracket is wide and sound.
  const cut = upperFractionFixed(at("0.5", bits), at("3", bits), bits, 5);
  assert.ok(contains(cut.value, "0.2940439749423022534950365679322712094257"));
  assert.ok(cut.value.error > 1n << 20n);
});
