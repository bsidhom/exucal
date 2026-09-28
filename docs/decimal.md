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

`Scaled` is `mant × 10^exp`, one decimal exponent, and the kernel's
binary base never crosses the kernel's boundary: a result leaving the
kernel is rounded onto the decimal grid of the working precision as it
leaves, which is the settling it was about to get anyway (D15), so that
everything above the kernel, the sums, the comparisons, the display, the
certification and the decimal mode, works in one base, exactly and
totally within the range limit, and log space is needed in one place
only, the kernel's exit for a result whose binary exponent cannot be
formed.

Everything below follows from that. Four things produce or consume a
midpoint, and three of them are decimal: a literal or a unit is decimal
or rational and exact; the display and the certification of digits are
decimal (D7); the decimal mode is a decimal grid, an integer of at most
`p` digits times a power of ten. Only the kernel is binary, and every
value crosses its boundary through a conversion already
(`fixedFromRational` divides by the denominator, `fixedToBall` builds a
dyadic), so the one base change goes where the representation changes
anyway, and the binary base does not leak into the ball layer.

## What stays exact

Nothing above changes what exactness means. An exact value has radius
zero, and in exact mode it keeps it through everything exact: a literal
of any length up to the range limit, a unit, an exact operation on exact
operands (`0.1 + 0.2` is exactly `0.3`; `1e999999999 * 1e999999999` is
exactly `1e1999999998`, with the exponents added; `1 ft` in `in` is
`= 12 in`), an exact case of a built-in (`sqrt(9/4)`, `log(2, 8)`,
`exp(0)`), and a comparison. The display's `=` still means radius zero
with every digit shown. What is rounded onto the decimal grid is only
what was already inexact: a kernel result, which is inexact by
construction, and any value downstream of one; `settle` is the identity
on an exact ball, and the sum rule below refuses a sum of two exact
operands it cannot align rather than round either of them. Exactly three
things ever produce a nonzero radius: an inexact function (a root, a
kernel routine, `pi()`), the built-in `approx` (docs/approximate.md),
which makes a value inexact at the user's request, and the decimal
mode's rounding, which is the mode's definition and leaves a value with
`p` digits or fewer exact. Zero-radius arithmetic is available wherever
it was before, and the stage adds to it (the exponent's products and
powers) without taking any away.

## The `Scaled` type

`Scaled = { mant: Rational; exp: bigint }` in `src/core/scaled.ts` stands
for `mant × 10^exp`, in the canonical form D13 gives: `mant` in lowest
terms with its denominator coprime to ten and its numerator not divisible
by ten unless zero, and zero as `exp` zero, so that equal values have
equal representations and `equals` is structural. The constructor
`scaled(mant, exp)` strips the numerator's trailing zeros and moves the
denominator's factors of two and five out (`1/6` is `5/3 × 10^-1`), a
loop of small divisions on top of the lowest-terms invariant `rational`
keeps, each constructor owning one rule; a literal is its digits with
its exponent, and a unit's exact value is a fraction whose denominator's
twos and fives are few. The form is internal: `format`, `roundTo`,
`toRational` and the fraction display of stage 5 are functions of the
value, and `2.54`, `254/100` and `127/50` render alike in every display.
Rounding to significant digits commutes with the power of ten, so
`roundTo` and `format` act on the mantissa alone and add `exp` to the
exponent: the digits of `1e999999999`, of its square and of `exp(1e6)`
are written with nothing formed, and the decimal exponent of any value
is the mantissa's plus `exp`, exact and cheap.

What the type does not hold exactly is a dyadic. A settled midpoint is
`d × 2^-k` today, and as a `Scaled` it would be `d × 5^k × 10^-k`, three
times its size on every midpoint, for a value whose information is `k`
bits. So a kernel result is not entered exactly: `fixedToScaled(f,
digits)` rounds `value × 2^-bits` to nearest at the working number of
decimal digits, `digitsFor(bits)`, the digits `bits` binary digits are
worth, and `fixedToBall` adds the rounding to the radius beside the
kernel's own error. The rounding is at most half a unit in a digit below
the kernel's ulp, a settle at the working precision, which is what D15
does to every inexact result: the kernel's error count is a few ulps and
the radius covers both. A settled midpoint is then a decimal integer of
the working size times a power of ten, the same bits as the dyadic it
replaces, and every exact operation on midpoints costs what it costs
today: a sum aligns by a small power of ten and adds, a product
multiplies the integers.

Settling itself changes grid: `settle` rounds an inexact midpoint to
`digitsFor(bitsFor(precision))` significant decimal digits, to nearest,
and adds half a unit in the last digit to the radius, where it rounds to
a dyadic by a shift today. Rounding onto a decimal grid is a division by
a power of ten rather than a shift, and the cost was measured before
this was chosen: at the default ceiling of 4,040 digits a product of two
midpoints costs 0.04 ms, settling it by a shift 0.04 ms and by the
division 0.20 ms, and the kernel's exit conversion 0.04 ms; at 1,000
digits the division is 0.02 ms. The probe's composite runs seven settles
at the ceiling in 38 ms, so the grid costs about a millisecond there and
nothing below it, which is the whole runtime price of one base above the
kernel.

Why not two exponents. The first draft of this note carried a binary
exponent beside the decimal one, `mant × 2^two × 10^ten`, so that a
kernel result and a literal both entered exactly and settling stayed a
shift. The price was that the mixed base leaked into every operation
that brings the two together: a sum of two large exponents of different
bases needed a rebase in log space, a comparison had an undecidable
case, certification and the radius needed the `log2 10` constant, and
the display had to fold `2^two` into the mantissa before it could write
a digit. No arithmetic library keeps two exponents on a value, and the
reason is the one above: it defers the base change instead of doing it
once at a boundary. The decimal form pays a division per settle for a
single base; the measurement says that is the better trade. A single
binary exponent was never a candidate: a literal's power of ten could
not enter it exactly, and the decimal mode could not hold its own values
at large exponents.

The type is the midpoint of every ball from 4.4 on, and nothing above
the ball sees the change: the evaluator, the table and the build take
balls. Below the ball, `rational.ts` keeps construction, comparison, the
exact arithmetic, `pow` by a bigint against a limit, `trunc`,
`exactRoot` on a fraction and `toFraction`; the decimal representation
(`parseDecimal`, `decimalExponent`, `roundTo`, `format`) moves to
`scaled.ts` and accounts for the exponent; `Precision` and
`DEFAULT_PRECISION` move to `rounding.ts`. `dimension.ts` and the `^`
exponent go on using `Rational`, whose arithmetic stays total; the
exponent grammar converts its literal with `toRational`, which refuses
one that cannot be formed, so `m^1e999999999` is rejected where it is
written.

## The exponent bound

`|exp| <= MAX_EXPONENT`, `10^18`, the study's bound, checked wherever
exponents combine, in `multiply`, `divide`, `pow` and the constructor,
and failing it is `tooLarge`, so that `10^(10^30)` and `exp(1e30)` fail
cleanly before anything is computed rather than loop or form an exponent
that could not be formatted. The parser bounds a literal's exponent by
the same constant, and the hard bound on a literal's mantissa stays
`LIMIT_BITS`, as today. The kernel's guard on the exponential becomes
the same bound: an argument whose magnitude over its whole ball, times
`log10 e`, exceeds `MAX_EXPONENT` is `tooLarge` (`exp(1e30)`; `exp(1e18)`
is a value with the exponent `434294481903251827`).

## Sums, comparisons and the radius

**Alignment.** To add `m1 × 10^e1` and `m2 × 10^e2`, the mantissa of the
larger exponent is multiplied by `10^|Δe|` and the two fractions are
added, which costs `|Δe| log2 10` bits and is exact; the sum is
renormalized. `add(a, b, limit)` in `scaled.ts` fails `tooLarge` when
that shift exceeds the limit given, the range limit (D16): the exact sum
exists and cannot be held, which is what the limit means. The ball's
sum, `addBalls(a, b, context)`, applies the rule for what the result is:

- Two exact operands in exact mode are `tooLarge` at the sum when their
  alignment does not fit (`1e999999999 + 1`, the study's own example and
  4.4's test); exact values never round (D15).
- Otherwise the result is inexact, or the mode is decimal, and the
  evaluator was about to settle it (D15), so it is settled a step
  earlier: each inexact operand is rounded to the working digits first,
  and if the two then align within the limit they are added exactly;
  if they still do not, their exponents differ by more than the limit's
  digits less twice the working digits, so the smaller lies below the
  working precision of the larger and is absorbed into the radius, as a
  floating-point sum absorbs it (`1e999999999 + sqrt(2)` is
  `1e999999999` within a little over the root). This is not a new
  rounding; it is the settle the result was about to get, applied where
  the exact intermediate cannot exist, and in decimal mode it applies to
  exact operands too, since there every operation rounds to the working
  precision: `1e999999999 + 1` is `1e999999999` within one, the reading a
  decimal library gives.

So `addBalls` and `subtractBalls` take the context, for its precision,
its mode and its range limit, and return a `Result`; `multiplyBalls` and
`divideBalls` add and subtract exponents and return a `Result` for the
exponent bound. There is no rebase between bases, since there is one
base.

**Comparison.** `compare` is total and cheap: by the signs, by the
decimal exponents (the mantissa's from its digit counts, plus `exp`,
exact to within one), and, when those are within one of each other, by
exact alignment, whose shift is then bounded by the mantissas' own digit
counts and never by the range limit. `1e999999999` compares with `1`,
with `1.0000000001e999999999` and with `2^3321928094` (which is a kernel
result, entered as a decimal) without forming anything.

**The radius.** The radius stays binary and coarse (D3), and meets a
decimal midpoint in two places. The product rule needs a radius at or
above `|mid|`: `radiusAbove` of a `Scaled` is `2^(exp log2 10 + log2
mant)` rounded up, with `exp × log2 10` taken exactly enough through a
128-bit fraction of `log2 10`, a constant of scaled.ts, and `log2 mant`
from the bit lengths and a double, tight to the radius's own thirty
bits; the quotient rule likewise takes a lower bound on the divisor's
distance from zero from the same bounds, rounded down, and divides the
coarse numerator by it, rounding up (`divideRadius`, new in radius.ts),
which forms no rational and loosens a radius by about `2^-25` relative
over the rule's five coarse roundings (4.4 measured it against the exact
bound over seeded balls).
Certification (D7) needs the two ends `mid ± rad`: where the radius,
as `r × 2^c`, aligns with the midpoint's grid within the range limit,
they are formed exactly, as today; where it does not (a midpoint with a
large exponent and a radius whose binary exponent is far from it), the
ends round alike exactly when no rounding boundary of the digits asked
lies within the radius of the midpoint, so the distance from the
midpoint to the nearest boundary is measured against the radius: in the
units of the last digit asked the boundaries are the whole units under
a directed mode and the half units under a nearest one, with the
boundary just below the midpoint's power of ten taken too, where the
cells are a tenth as wide; the distance is exact, an arithmetic within
the midpoint's own digits, and is compared with the radius by the same
bounds, a distance the bounds cannot tell from the radius certifying
nothing. That is the comparison "by exponents and leading digits" D7
promised, made exact on the midpoint's side, and it costs a few small
operations. (The first landing of 4.4 widened the midpoint taken to two
digits beyond those asked by a unit or two, which refused a count
whenever the two digits beyond it lay within two of a boundary, as
`sqrt(2) × 1e999999999` at fifty digits does; the distance has no such
margin.)

## The kernel's boundary

A kernel routine whose result can be large returns a mantissa with a
binary exponent and never a value of the result's bits. `Floating = {
mant: Fixed; exp: bigint }` in `fixed.ts` stands for `mant × 2^exp`, and
`fixedToScaled` takes one: for an exponent that can be formed within the
range limit, the value is rounded to the working digits exactly (a
multiplication by a memoized power of ten and a shift, 0.04 ms at the
ceiling); for one that cannot, the digits are found in log space, in
`src/core/digits.ts` above the kernel, since it calls it: the decimal
exponent is `floor(exp log10 2 + log10 mant)` and the leading digits are
`10^fraction`, through `lnFixed`, `expFixed` and the memoized `ln 2` and
`ln 10` at the working bits plus the bit length of the exponent plus a
margin, with the computation's error carried in the kernel's own error
counts and added to the radius beside the result's. Nothing else in the
program needs log space: the display writes the decimal it is given.

`expFixed` renormalizes after each squaring of its squaring loop: the
mantissa is kept to the working bits and the rest moved into the
exponent, so that `exp(1e6)` costs what `exp(1)` costs plus sixty
squarings at the working bits, and a negative argument is the same loop
with the exponent going negative rather than a value with a million
fraction bits (the `depth` of today's routine goes). Its precondition on
the argument's magnitude (below `2^40` today) becomes the exponent bound
above, and `expFits` becomes that check. `sinh` and `cosh` inherit it
through the exponential: for an exponent beyond the working bits plus a
margin the reciprocal `1/E` is below an ulp of `E` and is folded into the
error, so that neither is formed; `tanh` already saturates without
forming anything. A power in log space and a large decibel inherit the
range through `expFixed`. `lnScaled` takes the exponent as a decimal
scale, `ln(m × 10^e) = ln m + e ln 10` from the memo, so `ln(1e999999999)`
is `≈ 2302585090.691` on the first pass and `log10(1e999999999)` is
exactly `999999999` by the exact case, read off the exponent; `rootBall`
scales by `10^(q k)` exactly and roots `m × 10^r` on the kernel when the
remainder's power fits the range limit, and takes log space through
`powLogSpace` otherwise, as a rational power does today when its power
does not fit. A power of an inexact base by squaring with settling has
the range of its exponent too, so `sqrt(2)^(10^7)`, refused by magnitude
in stage 2, is a value, and `powBall`'s magnitude guard becomes the
exponent bound.

The way in is always exact: `fixedFromScaled(s, bits)` is `(num ×
2^bits) / (den × 10^-exp)`, or with `10^exp` in the numerator, a division
as `fixedFromRational` is today, and a value whose power of ten cannot
be formed within the range limit is a precondition failure, which every
routine that takes the value itself bounds first: `sin`, `cos` and `tan`
need `pi` to the argument's bits for their reduction, so an argument
whose integer part exceeds the range limit is `tooLarge`, as the literal
was; `atan` of an argument beyond `2^bits` is `±pi/2` within `2^-bits`,
as `tanh` saturates; `asinh` and `acosh` of such an argument are
`ln(2|x|)` within `1/(4x^2)`, through the logarithm's scale. The plan's
4.4 lists them.

A unit list whose count would be an integer that cannot be formed (D8:
`1e999999999 m` into `ft;in`) shows the count as the ratio settled toward
zero at the working precision, an inexact value with an exponent, and
the remainder is then a ball around zero whose radius says what the
count left, which the display leaves out with its note; a count that is
an integer of any size (`1e999999999 m` into `mm;m`) stays exact.

## The decimal mode

`NumberContext` gains `mode: "exact" | "decimal"`, default exact, and
`settle(b, context)` reads it. The two modes are one routine with two
parameters, which is what makes D15's "the two modes differ in nothing
else" literal: in exact mode an inexact midpoint is rounded to
`digitsFor(bitsFor(precision))` significant decimal digits to nearest,
an exact one is never touched, and half a unit in the last digit, the
rounding's bound, goes into the radius; in decimal mode every midpoint,
an exact one included, is rounded to `precision` significant decimal
digits in the context's rounding mode, and the exact difference between
the rounded value and the midpoint goes into the radius. The difference,
not the bound, because the ball's ends must round to the same `p` digits
for the digits to be certified (D7), and a value rounded to `p` digits
with half a unit of radius has its ends on the rounding boundaries:
`1200/3937 m` rounded to `0.30480061` is within `4e-10` of it, and
certifies eight digits with that radius and seven with the bound; in
exact mode the working digits are far below the digits asked, so the
bound costs nothing there. A value with `p` digits or fewer is its own
rounding and stays exact, so `1 ft` in `in` is `= 12 in` in either mode,
as the study requires, and a zero midpoint is left alone in both.

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
mode applies. `1 / 3 * 3` at eight digits under `towardZero` is the
midpoint `0.99999999` with a radius of `1e-8`, the roundings of the two
operations; under `halfEven` the same, since `0.33333333 × 3` has eight
digits and rounds no further (the plan's first text had it rounding to
one, which no decimal library does). The display then shows the digits
the radius certifies: the ball `[0.99999998, 1]` certifies seven, so the
line reads `≈ 1` with the note that seven of eight digits are certain,
the reading the study gives for the case (`0.999...9`, "displays as
`≈ 1`"). A value the mode's roundings have made noise is reported as
such rather than shown with digits the radius does not back, and a
division by it is `unresolved` as in exact mode, reported at once.

The built-in `approx` (docs/approximate.md) works in decimal mode as it
does in exact mode, with the mode's rounding on top: it reduces the
implied precision of its argument from the working precision, which
there is the user's `p` digits, and never raises it, so `approx(x)` is
`x` within one unit in the `p`-th digit and the settle then rounds the
result in the user's mode like every other.

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
  exact arithmetic with the exponent bound, `compare`, the `log2` bounds
  and the `log2 10` constant, `toRational` against a limit, and the
  decimal text and rounding.
- `src/core/rounding.ts` (4.3): `Precision` and `DEFAULT_PRECISION`, and
  `digitsFor(bits)`.
- `src/core/expr.ts` (4.3, 4.4): the literal parsed as a `Scaled` with a
  lazy exponent; the `^` exponent through `toRational`.
- `src/core/fixed.ts` (4.4, 4.9): `fixedFromScaled`, `fixedToScaled` and
  `fixedToBall` rounding to the working digits; `Floating`.
- `src/core/digits.ts` (4.9): the decimal digits of a `Floating` whose
  exponent cannot be formed, in log space.
- `src/core/fixed-exp.ts` (4.9): the renormalizing squaring loop.
- `src/core/radius.ts` (4.4): `radiusAbove` of a `Scaled`; `divideRadius`.
- `src/core/ball.ts` (4.4, 4.5, 4.9): the midpoint's type; the sums and
  products as `Result`s with the settle-first rule; certification by the
  ends or by the distance to the nearest boundary; `settle` on the
  decimal grid, reading the mode; the guards as the exponent bound.
- `src/core/context.ts` (4.5): `mode`.
- `src/core/quantity.ts`, `evaluate.ts`, `convert.ts`, `pipeline.ts`,
  `display.ts`, the built-ins, `src/messages.ts` (4.4, 4.6): the readers
  of `.mid` and the context reaching every sum; one pass in decimal mode.
- `src/settings.ts`, `src/app-shell.ts`, `src/unit-converter.ts` (4.7):
  the mode setting.
- README.md, ARCHITECTURE.md, docs/builtins.md, docs/calculator.md
  (4.8).

## The order of the tasks

4.1 to 4.3 are `scaled.ts`, unused by the app: the type and its
comparison, the arithmetic, and the text, rounding, digits and roots.
4.4 makes the midpoint a `Scaled`, rounds the kernel's results onto the
decimal grid at its exit, moves settling onto that grid and threads the
context into the sums, at which point `1e999999999` parses and
multiplies and every result of moderate exponent is what it is today to
within a settle. 4.9 follows it in the order its number gives, since the
kernel's large results reach a midpoint that can hold them and a display
that can write them: it changes the kernel, adds `digits.ts` for the one
conversion that needs log space, and turns the guards into the exponent
bound; nothing in 4.4 depends on it, because a value of moderate
exponent, `sqrt(1e999999999)` included, is certified in the one base.
4.5 to 4.8 are the mode: the context and `settle`, the pipeline, the
setting, the docs. So the plan's numbering is the order.

## Not in this design

- **A rational display** (stage 5): `format` writes decimals; the
  fraction display of an exact `Scaled` is the value's, not the form's,
  and lands in `display.ts`.
- **An inexact literal**: a literal is exact whatever its length, up to
  the range limit, in exact mode. Marking a value as known only
  approximately is docs/approximate.md's, the built-in `approx` of task
  4.10, which the sum rule above serves (`approx(1e999999999) + 1` is a
  value).
- **A setting for the exponent bound**: it is a constant, generous and
  finite, as the study says; nothing a user computes needs `10^(10^18)`.
- **Decimal arithmetic on the kernel**: the kernel stays binary, and the
  mode rounds its results; a decimal kernel would double the numeric
  surface for every function, which the study rules out.
- **An exact `2^1442695`**: an exact power whose mantissa exceeds the
  range limit is `tooLarge`, as today; `10^1442695` is exact, since the
  ten goes into the exponent.

## Alternatives considered

- **Two exponents, binary and decimal**, on one value: rejected above,
  after being this note's first draft; the measurement of the decimal
  grid's cost is what decided it.
- **One decimal exponent with kernel results entered exactly**: the
  factor `5^k` on every settled midpoint, three times its size, for no
  information; rejected above.
- **One binary exponent**: a literal's power of ten could not enter
  exactly, `1e999999999 × 1e999999999` would be `≈` where the study
  requires `=`, and the decimal mode could not hold `1e999999999`
  rounded to `p` digits at all.
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
