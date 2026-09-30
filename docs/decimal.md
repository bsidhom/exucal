# The exponent and the decimal mode

Status: design note for stage 4 of docs/calculator-plan.md, written after
stage 3 landed and before any of the stage's code; the plan's stage 4 was
revised against it in the same change. The goal is the study's features
4 and 5 (docs/calculator.md, "4 and 5. Floating point and decimal: one
feature, not two") as one: a midpoint that carries an exponent, so that
`1e999999999` is a value and `exp(1e6)` is `≈ 3.0332154e434294` rather
than `tooLarge`, and a decimal mode that rounds after every operation in
the user's rounding mode, as a hand calculator or a decimal library does.
The stage has landed; "Implementation notes" at the end says where the
code departed from this note, and the plan's "Stage 4 as it landed"
records it task by task. Two follow-ups since (the plan's "After stage
4") added "Which limit a refusal names" and "Decision: the bound stays
at `10^18`" under "The exponent bound".

## The problem

After stage 3 a midpoint is a `Rational`, and an inexact midpoint is a
dyadic `d × 2^-k` settled to the working bits (D15). The size of a dyadic
is its exponent: `exp(1e6)`, about `2^1442695`, is a numerator of 1.4
million bits, beyond the hard bound on the range limit, though it is an
ordinary value, a mantissa at the working precision times an exponent.
So `exp`, `sinh`, `cosh`, a power in log space and a large decibel are
refused beyond about 45,000 at the default range limit, through the one
guard on the exponential in ball.ts, and a literal `1e999999999` is
refused by the parser, because the only way to hold either is to form
its digits.

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

A value is within the bound when its decimal exponent, `floor(log10
|v|)`, the exponent the display writes, lies within `±MAX_EXPONENT`,
`10^18`, the study's bound, and zero is within at any exponent (D17, the
plan's H.13; stage 4 checked the canonical `exp`, which passes the bound
by the mantissa's digits where the value does not, and the other way).
The constructor checks it after normalizing, so it is checked wherever
exponents combine, in `multiply`, `divide` and `pow`, and failing it is
an `overflow` above it or an `underflow` below it, so that `10^1e30` and
`exp(1e30)` fail cleanly before anything is computed rather than loop or
form an exponent that could not be formatted. The parser leaves a
literal to the constructor, so `0.001e1000000000000000003` parses and
`0e2000000000000000000` is zero, and the hard bound on a literal's
mantissa stays `LIMIT_BITS`, as today. The kernel's guard on the
exponential becomes the same bound, on the whole ball of the argument
(D18, the plan's H.15): the classifier of ball.ts holds an interval
bounding the result's natural logarithm to the edges
`(10^18 + 1) ln 10` and `-10^18 ln 10`, refusing only an argument whose
every value puts the result past an edge (`exp(1e30)`; `exp(1e18)` is a
value with the exponent `434294481903251827`), computing only one whose
every value keeps it within, with a margin for the kernel's error, and
leaving the rest `unresolved` at the bound, retried; `sinh`, `cosh` and
the powers share it, on `|x| - ln 2` and on `y ln x`.

A ball is held to the bound by every value in it (D18). A product or a
quotient with an inexact operand is refused only when its whole ball
lies past the bound, `overflow` above `10^(10^18 + 1)` and `underflow`
below `10^-(10^18)` with the ball excluding zero; a ball containing zero
whose midpoint passes below is zero within `|mid| + rad`, zero being
within the bound at any exponent; and one that straddles an edge, or
whose `|mid| + rad` reaches the top, is `unresolved` at the edge
`bound`, which the retry loop narrows as it narrows a divisor straddling
zero, and which decimal mode's one pass reports at once. Stage 4 decided
by the midpoint, refusing `(1e46 - approx(1/3) * 3e46) * 1e999999999999999983`
for good at eight digits and showing
`5e1000000000000000000 * (approx(1e5000) - approx(1e5000))` as zero
within a bound past the bound (issue #60). The converter reports a ratio,
a count or a remainder at the edge as its own retried variant, worded
apart from an unresolved want.

### Which limit a refusal names

Each limit refuses with an error of its own, defined where its check
lives, so that the message can say which: the fraction's `tooLarge`
(rational.ts) for the range limit, at the alignment of a sum, at the
sizes predicted for a power's mantissa or a fraction's power of ten, at
a literal's mantissa, and at the reach of the kernel
(`sin(1e999999999 radian)`); and
`overflow` or `underflow` of `Scaled` (scaled.ts) for this bound, by
the sign of the exponent that passes it, or from the classifier, of the
argument of `exp`, of the product `y ln x` of a power, and `overflow`
for `sinh` and `cosh` of either sign, each only where the whole ball is
past the edge, and in `settle`, of a rounded midpoint past the bound in
decimal mode ("The decimal mode").
Only a value with an
exponent can pass the bound, so the fraction has no such error, and a
`Scaled` operation reports the fraction's `tooLarge` unchanged, a power
aside, as below. The
messages are `"1e999999999 + 1" is too large
to compute within Most bits.`, `"exp(1e999)" is too large to compute:
its exponent would pass 10^18.` and `"exp(-1e999)" is too small to
compute: its exponent would fall below -10^18.` An exact power is told
by its decimal exponent rather than by the check that fails first
(`powerRefusal` of scaled.ts), neither of its two checks, the canonical
exponent's against the bound and then the mantissa's predicted size,
being that exponent: `7^1e19`, refused by the range limit's prediction, is an
`overflow`, past the bound, which no setting moves; and `2.54^1e18`,
whose canonical exponent, `-2 × 10^18`, is past the bound below, is
`10^(0.40 × 10^18)`, within it, and is `tooLarge`, the range limit's.
The side is told exactly,
by comparing the base's magnitude with one, and the size by bounds on
the exponent's logarithm, taken for a base within `2^-30` of one from
its exact difference from one, so that `1.0000000001^1e30`, about
`10^(4.3 × 10^19)`, is too large; within a relative `2^-20` of the
bound, where the bounds cannot tell, a power refused by its exponent is
past the bound on the side its signs give, and one refused by its
mantissa is `tooLarge`. A power of an inexact base that the guard
refuses is past the bound on the side of one its midpoint lies, and a
negative power on the other side. A literal past the bound is the
parser's to word: its exponent passes `10^18`, or falls below `-10^18`,
the exponent of its value, as the constructor decides it (stage 4
checked the exponent as written, less the fraction digits, and then the
canonical form's, and refused `0e2000000000000000000` and
`10e-1000000000000000001`, whose values are within the bound, issue
#50). Where the constructor's check refuses, for a product, a quotient or
a sum, the exponent a message speaks of is the value's:
`1e1000000000000000000 / 3 * 10`, whose value is `3.3 × 10^(10^18)`, is
a value, though its canonical form is `1/3 × 10^(10^18 + 1)`, and
`1e-1000000000000000000 / 7`, `1.4 × 10^-(10^18 + 1)`, is `underflow`,
though its canonical form is `1/7 × 10^-(10^18)`; stage 4 had the two
the other way (D17).

### Decision: the bound stays at `10^18`

The exponent is a bigint; `10^18` is a check on it, not a storage limit,
and it stays. A result beyond it is taken in log space: `1e999 / ln(10)`
is the decimal exponent of `exp(1e999)`, and a quotient of exponentials
is the exponential of a difference.

- **Cost.** With the bound raised in a test build, the first pass of
  `exp` at 32 digits took 127 ms for `exp(1e999)`, 1.0 s for
  `exp(1e3000)` and 13.3 s for `exp(1e9000)`. The kernel squares once per
  bit of the argument, each squaring at the working bits plus as many,
  so the cost grows at least as the square of the argument's length.
  The app evaluates on every keystroke within 50 ms (`BUDGET_MS`), which
  anything past about `exp(1e500)` would exceed.
- **Soundness.** Parts of the number type are exact only within the
  bound. `log2Bounds` and `decimalExponentOfLog2` take the exponent
  through a 128-bit `log2 10`, and every radius taken from a midpoint
  rests on them, certification included. The classifier's edges are the
  bound's, as coarse radii and from the memo of `ln 10`, and
  `MOST_MAGNITUDE` in fixed-exp.ts is a thrown precondition. All of them
  would need rework.
- **A bound is needed anyway.** `exp(exp(1000))` has a 434-digit
  exponent, and `exp` of that has an exponent of `10^434` digits, which
  no bigint holds. Raising the bound moves the wall without removing it.
- **Little to show.** An answer beyond the bound is mostly its exponent:
  32 digits of `exp(1e999)` take 1,034 characters, where log space gives
  the part that can be read.

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
- The settle-first path is taken on `tooLarge` alone. A sum that aligns
  and whose value passes the exponent bound is held to the bound as a
  product is (D18): two exact operands are refused, `overflow` or
  `underflow`, in either mode (`5e1000000000000000000 +
5e1000000000000000000`); an inexact sum is refused only when every
  value of its ball is past the bound, and is `unresolved` at the bound
  when the ball reaches back within it (`approx(5e1000000000000000000) +
5e1000000000000000000`, whose midpoint sits on the bound at every
  precision). Issue #48 took the bound's refusal for an alignment
  failure, absorbed one operand into the radius and showed zero. A sum
  within the bound whose `|mid| + rad` reaches the top is `unresolved` at
  the bound as well.

So `addBalls` and `subtractBalls` take the context, for its precision,
its mode and its range limit, and return a `Result`; `multiplyBalls` and
`divideBalls` add and subtract exponents and return a `Result` for the
exponent bound. There is no rebase between bases, since there is one
base.

**Comparison.** `compare` is total and cheap: by the signs, by the
decimal exponents (the mantissa's from its digit counts, settled by one
comparison, plus `exp`, exact), and, when those are equal, by
exact alignment, whose shift is then bounded by the mantissas' own digit
counts and never by the range limit. `1e999999999` compares with `1`,
with `1.0000000001e999999999` and with `2^3321928094` (which is a kernel
result, entered as a decimal) without forming anything.

**The radius.** The radius stays binary and coarse (D3), and meets a
decimal midpoint in two places. The product rule needs a radius at or
above `|mid|`: the radius of a `Scaled` (`radiusAboveScaled`) is
`2^(exp log2 10 + log2 mant)` rounded up, with `exp × log2 10` taken
exactly enough through a
128-bit fraction of `log2 10`, a constant of scaled.ts, and `log2 mant`
from the bit lengths and a double, tight to the radius's own thirty
bits; the quotient rule likewise takes a lower bound on the divisor's
distance from zero from the same bounds, rounded down, and divides the
coarse numerator by it, rounding up (`divideRadius`, new in radius.ts),
which forms no rational and loosens a radius by about `2^-25` relative
over the rule's five coarse roundings (4.4 measured it against the exact
bound over seeded balls).
Certification (D7) needs the two ends `mid ± rad`: where the radius,
as `r × 2^c`, can be formed (`|c|` up to `2^16`) and aligns with the
midpoint's grid within the hard bound, they are formed exactly, as
today; where it does not (a midpoint with a
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
`floatingToBall` of digits.ts takes one: for an exponent that can be
formed within the range limit, the value is rounded to the working
digits exactly (`fixedToScaled`, a multiplication by a memoized power of
ten and a shift, 0.04 ms at the
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
exponent, so that `exp(1e6)` costs what `exp(1)` costs plus a squaring
per bit of its magnitude, twenty at the working bits, and a negative
argument is the same loop
with the exponent going negative rather than a value with a million
fraction bits (the `depth` of today's routine goes). Its precondition on
the argument's magnitude (below `2^40` today) becomes the exponent bound
above, and the guard on the exponential becomes that check (since H.15
the classifier, on the whole ball). `sinh` and `cosh` inherit it
through the exponential: for an exponent beyond half the working bits
plus a margin the reciprocal `1/E` is below an ulp of `E` and is folded
into the error, so that neither is formed; `tanh` already saturates
without forming anything. A power in log space and a large neper inherit
the range through `expFixed`; a large decibel is an exact power of ten,
which the exponent takes. `lnScaled` takes the exponent as a decimal
scale, `ln(m × 10^e) = ln m + e ln 10` from the memo, so `ln(1e999999999)`
is `≈ 2302585090.691` on the first pass and `log10(1e999999999)` is
exactly `999999999` by the exact case, read off the exponent; `rootBall`
scales by `10^(q k)` exactly and roots `m × 10^r` on the kernel when the
remainder's power fits the range limit, and takes log space through
`powLogSpace` otherwise, as a rational power does today when its power
does not fit. A power of an inexact base by squaring with settling has
the range of its exponent too, so `sqrt(2)^1e7`, refused by magnitude
in stage 2, is a value, and `powBall`'s magnitude guard becomes the
exponent bound.

The way in is exact but for one rounding: `fixedFromScaled(s, bits)` is
`(num × 2^bits) / (den × 10^-exp)`, or with `10^exp` in the numerator, a
division as `fixedFromRational` is today, for a value whose power of ten
can be formed within four times the hard bound, which holds any
mantissa within the range limit at a magnitude between `2^-maxBits` and
`2^maxBits`, the most a built-in hands the kernel at any range limit the
settings allow (the hard bound alone was too small from a range limit of
about 350,000 bits up, issue #56); a nonzero value below half an ulp at
the bits asked is zero within one ulp, which is what the division's
rounding gives it, decided from the coarse bounds with nothing formed,
so that the door takes an argument of any exponent (the plan's H.2); and
a value past four times the hard bound is a precondition failure, which
every routine that takes the value itself bounds first: `sin`, `cos`
and `tan` need `pi` to the argument's bits for their reduction, so an
argument whose integer part exceeds the range limit is `tooLarge`, as
the literal was; `atan` of an argument beyond `2^bits` is `±pi/2` within
`2^-bits`, as `tanh` saturates; `asinh` and `acosh` of such an argument
are `ln(2|x|)` within `1/(2x^2)`, through the logarithm's scale. The
plan's 4.4 lists them, with the tiny end the code added (an argument
below `2^-maxBits` answered by its expansion at zero, `exp` giving one
within twice its magnitude, since `e^|x| - 1 <= 2|x|` there); the
log-space power of a tiny exponent reaches the door, where the exponent
is zero within an ulp, which makes `pow(2, approx(1e-999999999))` a
value (issue #53); `atan2` compares the magnitudes of its arguments as
radii before it forms their ratio, and answers `±pi/2` or `±pi` within
`2^-bits` where the ratio lies within that of a multiple of `pi`, and a
tiny ratio over a positive `x` by the arctangent's expansion, so that
`atan2(1e-999999999999999999, 1)` is its argument and
`atan2(1e-999999999999999999, -1)` is `pi` (the plan's H.7, issue #47).

A unit list whose count would be an integer that cannot be formed (D8:
`1e999999999 m` into `ft;in`) shows the count as the ratio's midpoint
settled toward zero at the working digits, an integer of that many
digits times a power of ten, kept exact, and the remainder is what the
count leaves, exactly for exact operands; a count that is an integer of
any size (`1e999999999 m` into `km;m`) stays exact.

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

The settle meets the exponent bound at its two edges, and the two modes
differ there (D17; the plan's H.11). In decimal mode the rounded value is
the result, so a rounded midpoint whose decimal exponent passes the bound
is refused, `overflow` at the top (`99999999999e999999999999999990` at
eight digits rounds to `1e+1000000000000000001`, which stage 4 showed as
a value) and `underflow` at the bottom (`1e-1000000000000000000 / 3`, a
value past the bound that stage 4 threw on); `settle` returns a `Result`,
and the evaluator locates the refusal at the node. In exact mode a settle
is a bound on size and never refuses: a rounding to nearest that would
carry the midpoint past the top rounds toward zero instead and adds a
whole unit in the last working digit to the radius, and the half unit
added by an ordinary rounding is a radius taken from the exponent
(`powerOfTenRadius`) rather than a value formed and checked, so that a
midpoint at the bottom edge, whose half unit lies past the bound, settles
(`1e-999999999999999999 / approx(3)` is `≈ 3.3333333e-1000000000000000000`,
where it threw). The difference a decimal-mode rounding adds to the radius
is formed the same way, at an offset exponent with no bound checked, since
at the bottom edge the difference itself lies past it.

What "after every operation" means, since the mode is the settle and the
settle is applied in one place: every result `evaluate` produces is
settled, so in decimal mode

- a literal is rounded to `p` digits if it has more, and the radius
  records it (`3.14159265358979` at eight digits is `3.1415927` within
  `4.7e-8`); a literal with `p` digits or fewer is exact;
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
of a mantissa's numerator and denominator, and the alignment of a sum,
which is the size the exact result would have (a comparison aligns only
values of one decimal exponent, above, and needs no limit; a product, a
quotient and a sum are held to it by the evaluator's check on every
exact node result, D19). The
magnitude of a value is no longer its size, so the range limit does not
bound it; the exponent bound does, for exact and inexact values alike,
and a result's magnitude is refused only there (`exp(1e30)`) or where a
routine needs the value's bits (`sin(1e999999999 radian)`). The literal
check is the mantissa's digits against `LIMIT_BITS` in the parser and
against the range limit in the evaluator, and the exponent against the
exponent bound in the parser. `maxDigitsFor` is unchanged: a settled
midpoint at the ceiling must still fit the range limit with room for a
product of two.

What the range limit measures, restated before stage 5 (the plan's D16,
D19 and D20): it is a hard limit on cost, on the bits the app forms,
holds and multiplies for one number, so its measure is the canonical
mantissa's size, what is stored, and not the bits of the value the
mantissa denotes; a dyadic is stored with fives for its twos and costs
up to 2.33 times its bits, and that is what the next product of it
costs. That is the one place the two limits read differently, and on
purpose: the exponent bound is on the value, since a refusal at it must
never be false about the value; the range limit is on the
representation, since nothing else could be measured without forming
what the limit forbids. A result past it is refused at the node that
forms it, with the node and the remedy named, `approx` around the
node's first operand or a higher setting, and exact mode does not round
an exact value on its own to stay within it; the study's alternative,
rounding at the limit, is recorded with the decision.

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
- `src/core/radius.ts` (4.4): `radiusAboveScaled`, the radius of a
  `Scaled`; `divideRadius`.
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
  Raising it was considered again and declined ("Decision: the bound
  stays at `10^18`" above).
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

The stage landed in four pull requests, one task per commit, and the
plan's "Stage 4 as it landed" lists the rulings task by task. What
departed from this note:

- **The exponent's cost.** A power of ten costs nothing, so `10^100000`
  is exactly `1e100000` and `10^(100000/3)` is a value, where the range
  limit refused both; `7^(100000/3)` and its kind are values
  too, through log space, since 4.9 gave the exponential the range of
  its exponent, and only the exponent bound refuses.
- **The kernel's boundary.** `fixedToBall` takes the digit count, not the
  context, and adds the half unit only when the rounding moved the value,
  so a kernel value of no error on the grid is exact; `roundTo` and the
  digit count of an integer were rewritten without a gcd and without
  `toString`, after a settle at the ceiling measured 2 ms on the first
  landing (0.4 ms after).
- **Certification.** Where the ends cannot be formed, the distance from
  the midpoint to the nearest rounding boundary is measured against the
  radius, exact on the midpoint's side; the two-digit interval this note
  described refused any count whose two digits beyond lay within two of
  a boundary.
- **The quotient rule** is within `2^-25` of the exact bound, not
  `2^-28`, over the rule's five coarse roundings.
- **The tiny end.** An argument below `2^-maxBits` throughout is answered
  by its expansion at zero, which the note did not list beside the
  saturations, and `extraBits` is held to the range limit.
- **The decimal mode under a directed rounding mode** certifies at most
  one digit fewer than asked: the rounded value is the boundary of its
  own cell and the ball has no one-sided radius, so `2 / 3` under
  `towardZero` at eight digits is `0.66666666` shown as `≈ 0.6666666`
  with seven certain; and `1 / 3 * 3` under `towardZero` certifies no
  digit, its ball reaching `1` from below. The note's reading holds under
  the nearest modes. The quotient `1 / (1 / 3 * 3 - 1)` is a division by
  zero in exact mode, the difference being exactly zero there.
- **`mode`** is an optional field, absent meaning exact, so that every
  context written before it existed is an exact one; `ceilingContext`
  sets exact mode only for a decimal context.
- **Log space** is `src/core/digits.ts`, entered through `floatingToBall`,
  a `Result` that fails at the bound only where the guard's double let an
  exponent at the bound through; the first landing scaled `ln 2` by the
  exponent less the mantissa's bits and gave `exp(1e6)` eighteen digits
  short, which the tests against Python's digits caught. The log-space
  conversion costs about 47 ms at the ceiling, the logarithm and the two
  memos computed for the call at the ceiling's bits plus the exponent's.
