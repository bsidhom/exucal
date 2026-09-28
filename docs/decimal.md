# The exponent and the decimal mode

Status: design note for stage 4 of docs/calculator-plan.md, written after
stage 3 landed and before any of the stage's code; the plan's stage 4 was
revised against it in the same change. The goal is the study's features
4 and 5 (docs/calculator.md, "4 and 5. Floating point and decimal: one
feature, not two") as one: a midpoint that carries an exponent, so that
`1e999999999` is a value and `exp(1e6)` is `≈ 3.0332154e434294` rather
than `tooLarge`, and a decimal mode that rounds after every operation in
the user's rounding mode, as a hand calculator or a decimal library does.
"Implementation notes" at the end is empty until the stage lands, and
the plan's "Stage 4 as it landed" will record where the code departed.

## The problem

After stage 3 a midpoint is a `Rational`, and an inexact midpoint is a
dyadic `d × 2^-k` settled to the working bits (D15). The size of a dyadic
is its exponent: `exp(1e6)`, about `2^1442695`, is a numerator of 1.4
million bits, beyond the hard bound on the range limit, though it is an
ordinary value, a mantissa at the working precision times an exponent.
So `exp`, `sinh`, `cosh`, a power in log space and a large decibel are
refused beyond about 45,000 at the default range limit, through the one
guard `expFits` in ball.ts, and a literal `1e999999999` is refused by the
parser, because the only way to hold either is to form its digits.

D13 chose the shape of the remedy: a type of its own, `Scaled`, between
the fraction and the ball, a mantissa times a power of ten in a canonical
form, with `rational.ts` left the total fraction it is (the exponents of
dimensions, the `^` exponent and a radius's exact value need a fraction
with total arithmetic and structural equality). It left one question to
this note: a kernel result arrives as `value × 2^-bits`, a binary scale,
and a literal arrives as digits times a power of ten, a decimal one, and
the type has to take both without ever forming an exponent as bits. The
question is whether the type settles the kernel's binary scale into a
power of ten, or carries a binary exponent beside the decimal one.

## The design in one line

`Scaled` is `mant × 2^two × 10^ten`, a fraction coprime to ten with two
exponents, so that a kernel result and a literal both enter it exactly
and without a multiplication, and everything that needs the two bases
brought together (a sum, a comparison, the decimal digits of a binary
result) does so exactly where the range limit lets the alignment be
formed and in log space, through the kernel's logarithm and exponential
and the memoized `ln 2` and `ln 10`, where it does not.

Everything below follows from that. The kernel's routines hand back a
mantissa with a binary exponent and never form the value's bits; the
display finds the decimal digits of such a result in log space; sums
whose alignment does not fit are refused for exact operands and rounded
for inexact ones; and the decimal mode is one more use of the same
rounding, applied by `settle` to every result in the user's mode at the
user's precision.

## The `Scaled` type

`Scaled = { mant: Rational; two: bigint; ten: bigint }` in
`src/core/scaled.ts` stands for `mant × 2^two × 10^ten`. The canonical
form: `mant` is in lowest terms with its numerator and denominator both
coprime to ten, so that `ten` is the value's 5-adic valuation and `two`
the excess of its 2-adic valuation over it (a literal `2.54` is `127 ×
2^-1 × 5^-2`, that is `127 × 2^1 × 10^-2`; a settled dyadic `d × 2^-k`
with `d` odd and not divisible by five is `d × 2^-k × 10^0`); zero is
`mant` zero with both exponents zero. The two valuations determine the
form, so equal values have equal representations and `equals` is
structural, as D13 asks. The constructor `scaled(mant, two, ten)` strips
the factors of two by the trailing zero bits and the factors of five by
repeated division, on top of the lowest-terms invariant `rational`
keeps: a settled midpoint costs it a shift and a division or two, since
a random odd integer has a factor of five one time in five.

Why two exponents rather than one. A single decimal exponent, the form
D13 wrote down, would take a literal exactly but would take a kernel
result `d × 2^-k` only as `d × 5^k × 10^-k`: every settled midpoint, of
`k` about 13,500 bits at the default ceiling, would gain a factor `5^k`
of 31,000 bits, three times its size, and every exact operation on
midpoints would pay for it, on values whose information is the working
bits and no more; and the conversion would still need log space for a
result whose `k` cannot be formed, which is the case the stage exists
for. A single binary exponent would take a kernel result exactly but not
`1e999999999`, whose factor `5^999999999` cannot be formed either. With
one exponent of each base, both enter exactly and cheaply, and the cost
moves to the operations that must bring the bases together, which are
the ones that cannot be total anyway (a sum of `1e999999999` and `1` has
no representation of any size) and are dealt with below.

The type is the midpoint of every ball from 4.4 on, and nothing above
the ball sees the change: the evaluator, the table and the build take
balls. Below the ball, `rational.ts` keeps construction, comparison, the
exact arithmetic, `pow` by a bigint against a limit, `trunc`,
`exactRoot` on a fraction and `toFraction`; the decimal representation
(`parseDecimal`, `decimalExponent`, `roundTo`, `format`) moves to
`scaled.ts` and accounts for the exponents; `Precision` and
`DEFAULT_PRECISION` move to `rounding.ts`. `dimension.ts` and the `^`
exponent go on using `Rational`, whose arithmetic stays total; the
exponent grammar converts its literal with `toRational`, which refuses
one that cannot be formed, so `m^1e999999999` is rejected where it is
written.

## The exponent bound

Each exponent is bounded on its own: `|ten| <= MAX_EXPONENT`, `10^18`,
the study's bound, and `|two| <= MAX_EXPONENT × log2 10`, about
`3.32 × 10^18`, so that the value's decimal exponent is within twice
`10^18` either way and can always be written. The bound is checked
wherever exponents combine, in `multiply`, `divide`, `pow` and the
constructor, and failing it is `tooLarge`, so that `10^(10^30)` and
`exp(1e30)` fail cleanly before anything is computed rather than loop or
form an exponent that could not be formatted. The check is two
comparisons of bigints; a value whose two exponents nearly cancel to a
moderate magnitude while each exceeds its bound is refused too, which is
conservative and costs nothing anyone will type. The parser bounds a
literal's exponent by the same constant, so that a literal's `ten` is
always within it, and the hard bound on a literal's mantissa stays
`LIMIT_BITS`, as today.

## Bringing the bases together

Three operations must see the two exponents as one magnitude: a sum,
which aligns; a comparison; and rounding to decimal digits, for the
display and for the decimal mode. Each has an exact regime and a
log-space one, and the rule for choosing is the same: the exact regime
whenever the power to be formed fits the bound the caller gives (the
range limit, D16), and log space otherwise.

**Alignment.** To add `m1 × 2^a1 × 10^b1` and `m2 × 2^a2 × 10^b2`, both
are brought over `2^min(a) × 10^min(b)` by multiplying the mantissas by
`2^|Δa|` and `10^|Δb|`, which costs `|Δa| + |Δb| log2 10` bits and is
exact; the sum of the mantissas is then a fraction, renormalized. When
the two values are of one base, or of the same magnitude in both, the
shift is bounded by the mantissas' own sizes, so every sum stage 3
accepts today, and every sum of a literal with a large exponent and
another of the same base, is formed exactly. The shift is unbounded only
when the two values are of different bases with large exponents in both
(`exp(1e6) + 1e434294`, whose values are within a factor of ten of each
other, but whose exact sum has no short representation in either base),
or when their magnitudes are too far apart for the smaller to be written
over the larger's grid (`1e999999999 + 1`). Then:

- In exact mode, two exact operands fail `tooLarge` at the sum: the exact
  result exists and cannot be held, which is what the range limit means
  (the study's own example, and the plan's 4.4 test).
- A sum with an inexact operand is inexact, and the evaluator settles it
  to the working precision as soon as it is formed (D15); so it is formed
  at the working precision instead: the operands are rebased to one base
  at the working bits, in log space, with the rounding added to the
  radius (into the exact operand's base when one is exact, so that the
  exact one is rebased exactly and only the inexact one rounds; into the
  larger's when neither is), and then added exactly. A value far below
  the working precision of the other is thereby absorbed into the radius,
  as a floating-point sum absorbs it. This is not a new rounding: it is
  the settling the result was about to get, applied a step earlier
  because the exact intermediate cannot exist.
- In decimal mode every operation rounds to the working precision (below),
  so the second rule applies to exact operands too: `1e999999999 + 1` is
  `1e999999999` with a radius of one, the reading a decimal library gives.

So `addBalls` and `subtractBalls` take the context, for its precision,
its mode and its range limit, and return a `Result`; `multiplyBalls` and
`divideBalls` combine exponents exactly and return a `Result` for the
exponent bound. The exact operations of `scaled.ts` are the same shape:
`add` and `subtract` take the bound they may align within and fail
`tooLarge` beyond it; the rounding fallback belongs to the ball, which
has the radius to put the rounding in.

**Comparison.** `compare(a, b)` in `scaled.ts` is decided by the signs,
by structural equality, and otherwise by the binary magnitudes: a bound
on `log2 |s|` within `2^-30` is cheap for any `Scaled`, from the bit
lengths of the mantissa, `two`, and `ten` times `log2 10` held as a
128-bit fraction (a constant of the module), with no call into the
kernel, and it separates any two values that differ by more than that.
Two values within `2^-30` of each other are aligned exactly, which is
always possible when they are of one base, since their exponents then
differ by at most the mantissas' sizes, and possible in the mixed case
when the alignment fits a fixed bound; the one case left, two values of
different bases that agree to thirty bits and cannot be aligned, is
`undefined`, which nothing that types can produce without a mantissa
tuned to it outside the app. Every caller treats `undefined`
conservatively and says so: `containsZero` counts the ball as containing
zero, certification certifies nothing, a domain check reports
`unresolved` at the edge, a unit list reports the unit out of order. The
same bound gives `radiusAbove` of a midpoint, which the product rule and
`magnitudeAbove` take, tight to the radius's own thirty bits.

**Rounding to digits.** The decimal digits of a `Scaled` at `d` digits in
a mode, and its decimal exponent, are exact whenever `2^|two|` can be
formed within the bound given: the digits of `mant × 2^two` are found as
`format` finds them today, and `ten` is added to the exponent, so every
literal and every settled midpoint of today's sizes is formatted
exactly, `2.54`, `254/100` and `127/50` alike, and `1e999999999` and its
square are written from their mantissa and exponent with nothing formed.
When `2^|two|` cannot be formed (a kernel result with a large exponent,
an exact power of two such as `2^1442695`, a value rebased in log space),
the digits are found in log space: the decimal exponent is `floor(two
log10 2 + ten + log10 mant)` and the leading digits are `10^fraction`,
computed through `lnFixed`, `expFixed` and the memoized `ln 2` and `ln
10` at the digits' bits plus the bit length of the exponents plus a
margin, with the error of the computation carried as an interval. The
interval decides the rounding when it lies within one rounding cell;
when it straddles a boundary the bits are doubled and the digits found
again, which terminates because a value with an unformable `two` has no
short decimal expansion and so never lies on a boundary; a value that
comes within a fixed cap of bits of one without clearing it is shown
with one digit fewer, which is D7's boundary case and cannot arise
without a run of nines longer than the cap allows. The routine is above
the kernel, in `src/core/digits.ts`, since it calls it; `scaled.ts`
below the kernel holds the exact regime, which `digits.ts` takes for
every value that can be formed.

## The kernel's large results

A kernel routine whose result can be large returns a mantissa with a
binary exponent and never a value of the result's bits. `Floating = {
mant: Fixed; exp: bigint }` in `fixed.ts` stands for `mant × 2^exp`, and
`fixedToScaled(x)` builds the midpoint from it exactly, the dyadic's
binary point and the exponent going into `two`; `floatingFromScaled(s,
bits)` is the way in for a routine that takes a scale, the mantissa
scaled to order one at `bits` fraction bits and the exponent beside it,
exact when the power of ten can be formed and rounded in log space, with
the rounding in the `Fixed`'s error, when it cannot; `fixedFromScaled(s,
bits)` is the way in for a routine that takes the value itself, and is a
precondition failure for a value that cannot be formed, which every such
routine bounds first.

`expFixed` renormalizes after each squaring of its squaring loop: the
mantissa is kept to the working bits and the rest moved into the
exponent, so that `exp(1e6)` costs what `exp(1)` costs plus sixty
squarings at the working bits, and a negative argument is the same loop
with the exponent going negative rather than a value with a million
fraction bits (the `depth` of today's routine goes). Its precondition on
the argument's magnitude (below `2^40` today) becomes the exponent bound:
an argument whose magnitude, over its whole ball, times `log2 e` exceeds
the bound on `two` is `tooLarge` before anything is computed (`exp(1e30)`;
`exp(1e18)` is a value), and `expFits` becomes that check. `sinh` and
`cosh` inherit it through the exponential: for an exponent beyond the
working bits plus a margin the reciprocal `1/E` is below an ulp of `E`
and is folded into the error, so that neither is formed; `tanh` already
saturates without forming anything. A power in log space and a large
decibel inherit it through `expFixed`; `lnFixed` and `lnScaled` already
take a binary scale, and `lnScaled` adds `ten × ln 10` from the memo for
a decimal one, so `ln(1e999999999)` is `≈ 2302585092.994` on the first
pass and `log10(1e999999999)` is exactly `999999999` by the exact case,
read off the exponent. `rootFixed` and the powers combine exponents
exactly, the remainder of an exponent under the degree folded into the
mantissa first. A power of an inexact base by squaring with settling has
the range of its exponent too, so `sqrt(2)^(10^7)`, refused by magnitude
in stage 2, is a value, and `powBall`'s magnitude guard becomes the
exponent bound.

The routines that take the value itself keep a bound on it: `sin`, `cos`
and `tan` need `pi` to the argument's bits for their reduction, so an
argument whose integer part exceeds the range limit is `tooLarge`, as
the literal was; `atan` of an argument beyond `2^bits` is `±pi/2` within
`2^-bits`, as `tanh` saturates; `asinh` and `acosh` of such an argument
are `ln(2|x|)` within `1/(4x^2)`, through the logarithm's scale. The
plan's 4.9 lists them.

## Display and certification

The display formats a midpoint through `digits.ts`, and `show`'s rule is
unchanged: `=` for an exact value every digit of which is shown, and
otherwise the digits both ends of the ball round to (D7). Certification
compares the two ends by their digits and exponents, as D7 says: where
`mid ± rad` can be formed, exactly, as today; where it cannot, the
decimal interval of the midpoint at the digits asked plus a margin, from
`digits.ts` with its error, is widened by the radius in units of the last
digit, the radius's magnitude against the midpoint's coming from the
same `log2` bounds, and the digits are certified when both ends of that
interval round alike, and not otherwise. The rule errs only toward
certifying less, so what is shown is what rounding the true value would
give, as it is today; a retry narrows the radius but not the formatting
error, which is why the formatting works at a margin of bits beyond the
digits, well below any radius a pass can produce. `1e999999999 *
1e999999999` is `= 1e+1999999998`; `sqrt(1e999999999)` is `≈
3.1622777e+499999999`, certified on the first pass; `exp(1e6)` is `≈
3.0332154e+434294`.

A unit list whose count would be an integer that cannot be formed (D8:
`1e999999999 m` into `ft;in`) shows the count as the ratio settled toward
zero at the working precision, an inexact value with an exponent, and
the remainder is then a ball around zero whose radius says how much the
count left, which the display leaves out with its note; a count that is
an integer of any size (`1e999999999 m` into `mm;m`) stays exact.

## The decimal mode

`NumberContext` gains `mode: "exact" | "decimal"`, default exact, and
`settle(b, context)` reads it. In exact mode it rounds an inexact
midpoint to nearest at the working bits as it does from stage 2, the
mantissa `mant × 2^two` rounded to `bitsFor(precision)` significant bits
and `ten` kept as it is, so that nothing is formed and the midpoint's
size stays the working precision whatever its exponents; the promise of
D15 is unchanged, and the dyadic it spoke of is a dyadic times the power
of ten the value carries. In decimal mode it rounds every midpoint, an
exact one included, to `precision` significant decimal digits in the
context's rounding mode, through `digits.ts`, and adds the rounding to
the radius: the exact difference between the rounded value and the
midpoint where the midpoint can be formed, and the digits' error bound
where it cannot. The difference, not the half-unit bound of exact mode,
because the ball's ends must round to the same `p` digits for the digits
to be certified (D7), and a value rounded to `p` digits with half a unit
of radius has its ends on the rounding boundaries: `1200/3937 m` rounded
to `0.30480061` is within `4e-10` of it, and certifies eight digits with
that radius and seven with the bound. A value with `p` digits or fewer is
its own rounding and stays exact, so `1 ft` in `in` is `= 12 in` in either
mode, as the study requires, and a zero midpoint is left alone in both.

What "after every operation" means, since the mode is the settle and the
settle is applied in one place: every result `evaluate` produces is
settled, so in decimal mode

- a literal is rounded to `p` digits if it has more, and the radius
  records it (`3.14159265358979` at eight digits is `3.1415927` within
  `3.6e-9`); a literal with `p` digits or fewer is exact;
- a unit looked up is settled once, by `unitLookup`, so `surveyfoot`,
  built exactly at the ceiling as every unit is (D6, the table always
  exact), is `0.30480061 m` within `4e-10` at eight digits, and `1 ft`
  is exact; a prefixed unit is the product of the two, settled once;
- a power rounds at every squaring, as `powBall` settles each product;
  an exact power of an exact base (`2^10`) is `pow`'s exact result
  settled once, so `2^100` at eight digits is `1.2676506e30` within a
  bound;
- a call rounds once, on its result: the built-in's arguments are
  settled values, the kernel computes at the bits of `p` with its guard
  and rounds in no mode, and the result is rounded to `p` digits in the
  mode, which is the per-operation semantics of a decimal library for a
  function;
- a defined function's body is ordinary arithmetic evaluated by the same
  evaluator, so every operation in it rounds, `tempC(100)` being `100 K`
  settled, `273.15 K` settled and their sum settled: a function is
  agnostic to the mode, as the study asks, because the mode is in the
  context it is evaluated under.

The pipeline's conversion needs no settle of its own: the ratio of the
two magnitudes is exact, and the display's rounding of it to `p` digits
in the mode is the division's per-operation rounding; a list's counts
and remainder are exact operations and `roundTerms` rounds in the mode;
the reciprocal line is the display's rounding of the reciprocal.

The rounding mode therefore governs every operation in decimal mode and
only the display in exact mode, which is D15's statement of where the
mode applies, and the two modes differ in nothing else. `1 / 3 * 3` at
eight digits under `towardZero` is the midpoint `0.99999999` with a
radius of `1e-8`, the roundings of the two operations; under `halfEven`
the same, since `0.33333333 × 3` has eight digits and rounds no further
(the plan's first text had it rounding to one, which no decimal library
does). The display then shows the digits the radius certifies: the ball
`[0.99999998, 1]` certifies seven, so the line reads `≈ 1` with the note
that seven of eight digits are certain, the reading the study gives for
the case (`0.999...9`, "displays as `≈ 1`"). A value the mode's roundings
have made noise is reported as such rather than shown with digits the
radius does not back, and a division by it is `unresolved` as in exact
mode, reported at once.

The retry loop does nothing in decimal mode: `resolve` runs one pass, at
the context's own precision, and the display marks what the radius does
not certify without escalating, since raising the internal precision
would compute something other than what the mode asks for. The schedule
applies in exact mode only, and the table is built in exact mode at the
ceiling whatever the user's mode, since a unit is settled in the user's
mode when it is looked up.

## The range limit, restated

D16's two limits stay, on their two axes, and the range limit's meaning
narrows to what it always guarded: the size of an exact value, that is
of a mantissa's numerator and denominator, and the alignment of a sum or
a comparison, which is the size the exact result would have. The
magnitude of a value is no longer its size, so the range limit does not
bound it; the exponent bound does, for exact and inexact values alike,
and a result's magnitude is refused only there (`exp(1e30)`) or where a
routine needs the value's bits (`sin(1e999999999 radian)`). The literal
check is the mantissa's digits against `LIMIT_BITS` in the parser and
against the range limit in the evaluator, and the exponent against the
exponent bound in the parser. `maxDigitsFor` is unchanged: a settled
midpoint at the ceiling must still fit the range limit with room for a
product of two.

## Where it goes

- `src/core/scaled.ts` (4.1 to 4.3): the type, the canonical form, the
  exact arithmetic with the exponent bound, `compare` and the `log2`
  bounds, `toRational` against a limit, and the decimal text and
  rounding in the exact regime.
- `src/core/digits.ts` (4.3): the decimal digits, exponent and rounding
  of any `Scaled`, in log space where the exact regime cannot form the
  value; the display and certification take it.
- `src/core/rounding.ts` (4.3): `Precision` and `DEFAULT_PRECISION`.
- `src/core/expr.ts` (4.3, 4.4): the literal parsed as a `Scaled` with a
  lazy exponent; the `^` exponent through `toRational`.
- `src/core/fixed.ts` and `fixed-exp.ts` (4.4, 4.9): `Floating`,
  `fixedToScaled`, `floatingFromScaled`, `fixedFromScaled`; the
  renormalizing squaring loop.
- `src/core/radius.ts` (4.4): `radiusAbove` of a `Scaled`, from the
  `log2` bounds; a division by a lower bound, for the quotient rule.
- `src/core/ball.ts` (4.4, 4.5, 4.9): the midpoint's type; the sums and
  products as `Result`s with the rebase rule; certification in log
  space; `settle` reading the mode; the guards as the exponent bound.
- `src/core/context.ts` (4.5): `mode`.
- `src/core/quantity.ts`, `evaluate.ts`, `convert.ts`, `pipeline.ts`,
  `display.ts`, the built-ins, `src/messages.ts` (4.4, 4.6): the readers
  of `.mid` and the context reaching every sum; one pass in decimal mode.
- `src/settings.ts`, `src/app-shell.ts`, `src/unit-converter.ts` (4.7):
  the mode setting.
- README.md, ARCHITECTURE.md, docs/builtins.md, docs/calculator.md
  (4.8).

## The order of the tasks

4.1 to 4.3 are `scaled.ts` and `digits.ts`, unused by the app: the type
and its comparison, the arithmetic, and the text, rounding, digits and
roots, with the log-space digits in 4.3 because 4.4 needs them to
certify a value whose ends cannot be formed (`sqrt(1e999999999)`), and
they need only the kernel as it stands. 4.4 makes the midpoint a `Scaled`
and threads the context into the sums, at which point `1e999999999`
parses and multiplies and a kernel result of moderate size enters
through `fixedToScaled`; 4.9 follows it in the order its number gives,
since the kernel's large results reach a midpoint that can hold them and
a display that can write them, and it changes the kernel alone with the
guards. 4.5 to 4.8 are the mode: the context and `settle`, the pipeline,
the setting, the docs. So the plan's numbering is the order, with 4.3
carrying the one part of 4.9's work that 4.4 depends on.

## Not in this design

- **A rational display** (stage 5): `format` writes decimals; the
  fraction display of an exact `Scaled` is the value's, not the form's,
  and lands in `display.ts`.
- **Rounding a literal in exact mode**: a literal is exact whatever its
  length, up to the range limit.
- **A setting for the exponent bound**: it is a constant, generous and
  finite, as the study says; nothing a user computes needs `10^(10^18)`.
- **Decimal arithmetic on the kernel**: the kernel stays binary, and the
  mode rounds its results; a decimal kernel would double the numeric
  surface for every function, which the study rules out.

## Alternatives considered

- **One decimal exponent, the kernel's scale settled into it**: rejected
  above for the factor `5^k` on every settled midpoint and the log-space
  conversion it needs anyway for a result whose scale cannot be formed.
- **One binary exponent**: rejected above, since a literal's power of ten
  could not enter exactly, and `1e999999999 × 1e999999999` is required to
  be exact.
- **Rounding every sum that cannot be aligned**, exact operands included,
  in exact mode: it would give `1e999999999 + 1` a value, but one that is
  not the sum, with `=` denied and a radius of one on a value the user
  wrote exactly; the study chose `tooLarge`, and exact mode keeps exact
  values exact (D15).
- **Settling in decimal mode with the half-unit bound** as the radius, as
  exact mode does: rejected above, since no result would then certify its
  last digit.
- **Not tracking the radius in decimal mode**, showing every digit the
  roundings produced: the study keeps the radius so that the display can
  mark what the roundings destroyed, and `1 / 3 * 3` reads `≈ 1` with a
  note rather than eight digits of a value that is not the answer.

## Implementation notes

Written when the stage lands.
