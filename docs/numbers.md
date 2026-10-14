# Numbers

Exucal is first and foremost a calculator, and it was built to be
exact wherever it can be and explicit wherever it cannot. When a
result can be exact, you get the exact value. When it cannot, you get
the digits the calculator has certified, behind `≈` rather than `=`,
and a note wherever a digit shown could not be certified; and when not
even that is possible, you get a message saying why rather than a
plausible number. Every result is a value of one data type, `Ball`: a
conversion multiplies one, a defined function computes one, a built-in
returns one. `Ball` is built in three layers, each adding one idea to
the one below it:

- **`Rational`** is an exact fraction: a whole number of any size over
  a positive one, kept in lowest terms. `1/3` is one over three, not a
  string of threes.
- **`Scaled`** is a `Rational` times a power of ten, written
  `significand × 10^exp`, with the exponent held as a number of its own.
  That is what lets `1e999999999` be a value rather than a billion
  digits, and it is the form every exact value is held in.
- **`Ball`** is a `Scaled` midpoint together with a `Radius`, a bound on
  how far the number held may lie from the number meant. A `Radius` is
  a coarse binary magnitude, a short significand times a power of two,
  and every operation on radii rounds it up: it is always a true bound
  and never an exact one, which is what lets it be carried through an
  expression at almost no cost. Every value the calculator computes
  with is a `Ball`. When the radius is zero the value is exact; when it
  is not, the value is inexact, and the radius is what lets the
  calculator say which digits of it are right.

Two goals guided this design: the exactness just described; and the
functions a calculator is used for, all the elementary functions and
the special functions that matter most in combinatorics, probability
and physics, each exact where it has an exact case and certified
otherwise. The representation delivers both. Exact arithmetic stays
exact however long the numbers grow, until a limit you set says they
may grow no further. Everything else is computed with an error radius
and shown only to the digits that radius certifies, at rising
precision until they do. So `0.1 + 0.2` is exactly `0.3`, `1/3 * 3`
is exactly `1`, `sqrt(2) / sqrt(2)` is `≈ 1` and not `= 1`, and an
input the limits cannot hold is refused rather than answered wrongly.

To predict what the calculator will show, to trust its digits
and to read its refusals, you need the semantics of `Ball`. This
page gives them from the ground up; the pages on quantities,
expressions, settings and the built-in functions assume them and link
back here.

Examples on this page give what you type and what Exucal shows. The
typed form pastes straight into the field. The shown form is the
result side of an output line, one line of the answer as the
calculator writes it, with the relation, `=` or `≈`, in front of the
value; where a conversion is shown, a middle column gives what the
value is converted into.

This page explains the following rules:

- **A value is exact or inexact.** An exact value is a fraction and is
  never rounded; an inexact one carries an error radius. Only an
  inexact built-in or `approx` makes a value inexact
  ([Exact and inexact values](#exact-and-inexact-values)).
- **A value has one canonical form**, so equal values are held alike
  and cost the same, whatever route produced them
  ([How a value is held](#how-a-value-is-held)).
- **`=` means exact and shown entire; `≈` means digits were left out
  or a step was inexact.** Every digit shown is certified: the
  calculator recomputes at rising precision, up to a ceiling, until the
  digits you asked for certify
  ([Digits you can trust](#digits-you-can-trust)).
- **A value whose radius reaches across an edge is never guessed at**:
  a divisor at zero, a pole, a domain's end. At the ceiling the result is
  an error saying the value cannot be told from the edge
  ([Values at an edge](#values-at-an-edge)).
- **There are two arithmetics**: exact mode, the default; and decimal
  mode, which rounds every step to the display digits as a hand
  calculator does and holds each rounded value as exact, so its results
  are `=` ([The two modes](#the-two-modes)).
- **Two size limits refuse what they cannot hold**: the significand
  limit, a setting, on the bits of a fraction; and the exponent bound,
  fixed, on the power of ten. The message names the limit and what to
  try, `approx` or decimal mode
  ([Values too big to hold](#values-too-big-to-hold)). Three settings
  nest. The display digits say how many digits must certify. The
  precision limit caps how far the retry loop may climb to certify
  them. The significand limit must hold the fraction that climb ends
  at, so it caps the precision limit in turn
  ([Two limits, two units](#two-limits-two-units)).
- **What is written is predictable**: an output line is a function of
  the value, its exactness and the settings, and pastes back as input
  ([How numbers are written](#how-numbers-are-written)).

## Comparison with other approaches

The midpoint-and-radius form comes from ball arithmetic, and the
inspiration is [Arb](https://arblib.org/), now part of
[FLINT](https://flintlib.org/). Arb's midpoint is a binary
floating-point number rounded to a set number of bits, so a value is
exact there only if it is a whole number times a power of two; Exucal's
midpoint is an exact rational, scaled by a power of ten and held in one
canonical form. That decomposition is novel, and it is a trade. Equal
values cost the same by every route; but a power of two in a denominator
becomes a power of five in the significand, so a dyadic value costs more
bits here than its binary size, and the significand limit measures that
cost ([The power of ten is free; a power of two is
not](#the-power-of-ten-is-free-a-power-of-two-is-not)). The developer
page on numbers weighs the rest ([The
types](../devdocs/numbers.md#the-types)). Three calculators share the
aim of exactness, each by its own route:

- [Frink](https://frinklang.org/) keeps exact fractions, its unit
  definitions included, and that is the whole of its exactness:
  everything else is a floating-point number carrying no error bound,
  unless you ask for an interval.
- [Qalculate!](https://qalculate.github.io/) keeps exact fractions and
  symbolic forms and writes `≈` before the rest, which it computes at
  the one precision you set. With its interval arithmetic on, the
  default, it shows only the digits the interval guarantees; with it
  off, the precision's digits, with no guarantee.
- Android's calculator, from Android 6, whose source is named
  [ExactCalculator](https://android.googlesource.com/platform/packages/apps/ExactCalculator/),
  keeps an exact fraction where it can and shows it as such, and
  evaluates the whole expression as a constructive real otherwise,
  never rounding a step: a value computed on demand to whatever
  precision the digits you scroll to need, recomputed as you scroll
  rather than certified to a fixed count, with the digits shown within
  one unit in the last place of the value
  ([Boehm, 2017](https://cacm.acm.org/practice/small-data-computing/)).

Exucal differs in the mechanism this page describes: one canonical
form for every exact value; a ball with an exact midpoint for every
inexact one; digits certified by recomputing at rising precision up to
a ceiling; and a refusal, never a wrong answer, for what its limits
cannot hold.

## Exact and inexact values

The first thing to know about a value is whether it is exact.

A number you type is read exactly, as the fraction it denotes: `2.54`
is `254` times `10^-2`; `1/3` is one over three; and `1e999999999` is
`1` times `10^999999999`, its exponent held as a number. Nothing is lost
on the way in.

| You type      | Exucal shows     |
| ------------- | ---------------- |
| `0.1 + 0.2`   | `= 0.3`          |
| `1/3`         | `≈ 0.33333333`   |
| `1e999999999` | `= 1e+999999999` |

Every value carries an **error radius**, a bound on how far the number
held may lie from the number meant. A value whose error radius is zero
is **exact**; one whose radius is not zero is **inexact**. The relation
on a line tells you which, with one more distinction: `=` means the
value is exact and every digit of it is shown; `≈` means either that
an exact value has more digits than are shown, as `1/3` above, or that
the value is inexact ([Digits you can trust](#digits-you-can-trust)).

Only two things make a value inexact. One is an inexact function, a
built-in or `^` with a fractional exponent, whose value no fraction
holds: a root, `exp`, `ln`, `pi()` and the others each entry names as
such ([Built-in functions](builtins.md)). The units defined through
`pi()` are inexact for the same reason, so a conversion through `deg` or
`turn` is `≈` ([Which factors are
exact](units.md#which-factors-are-exact) lists them). The other is
`approx`, the one operation whose purpose is to make a value inexact
([approx](#approx)). Nothing else does: an operation on an inexact value
rounds it and charges the rounding to the error radius the value already
has, and never gives a new value a radius.

| You type    | Into     | Exucal shows          | Note                                  |
| ----------- | -------- | --------------------- | ------------------------------------- |
| `sqrt(2)`   |          | `≈ 1.4142136`         | an inexact built-in                   |
| `2^(1/3)`   |          | `≈ 1.259921`          | a root by `^`, inexact                |
| `30 deg`    | `radian` | `≈ 0.52359878 radian` | a unit defined through `pi()`         |
| `approx(2)` |          | `≈ 2`                 | inexact on purpose                    |
| `sqrt(4)`   |          | `= 2`                 | an exact case: the root is recognized |
| `8^(1/3)`   |          | `= 2`                 | an exact case by `^`                  |

In decimal mode every step is rounded and the rounded value is the
value, so no value you see there is inexact; the error radius serves
only inside a step ([The two modes](#the-two-modes)).

The calculator never shows the error radius. What it shows is the
digits the radius leaves certified, and a note when they are fewer than
you asked for.

## How a value is held

Two settings bound a value, the significand limit in bits and the
precision limit in decimal digits, and the message that refuses a value
names one of them. To predict both, you need to know how a value is
held. The same knowledge is where the calculator's predictability comes
from.

### The fraction and its canonical form

An exact value is a `Scaled`: a `Rational` fraction times a power of
ten. The significand limit bounds the fraction: neither its numerator
nor its denominator may have more bits than the limit allows. Those
bits are what an exact value costs. They are its memory, and they set
the time of every operation on it, since each operation ends by
reducing its result to lowest terms, a gcd whose cost grows faster
than the numbers' length. `1/3` is small; `3^100000` is not, and its 158,497
bits pass the default limit, so it is refused
([Values too big to hold](#values-too-big-to-hold)).

The fraction is kept in one fixed form, its **canonical form**:

- in lowest terms;
- with every power of ten moved out of the fraction into the exponent;
- with a denominator that has no factor of two or five at all (coprime
  to ten, in the words of number theory).

So `2.54` is held as `254` times `10^-2`, and `1/6` as `5/3` times
`10^-1`: the two of the six is traded for a five above the line and one
power of ten in the exponent.

Each rule earns its place, and only the three together pin a value to
one form. Lowest terms makes `2/4` and `1/2` one fraction. Moving every
power of ten into the exponent keeps the significand small while the
exponent flexes, so that magnitude costs nothing. The third rule is the
one that looks odd, since it turns `1/2` into `5 × 10^-1`; without it,
those would be two forms of one value, and comparing parts would not
decide equality. With it, a value has a finite decimal expansion
exactly when its denominator is `1`, and its significand is then its
digits, which puts exact values and the digits the display writes in
one form. Other conventions were possible, and this one is a choice;
that alignment is what it buys.

A value has exactly one canonical form, whatever route a computation
reaches it by, because each step of building it is forced:

1. The fraction in lowest terms is unique.
2. The only denominator the rule allows is that fraction's with every
   two and five taken out.
3. With the denominator fixed, the exponent can only be the largest
   that still leaves the numerator a whole number.
4. The numerator is then whatever is left.

This is what makes a held value predictable. Equal values are held
alike, whatever expressions produced them, so the calculator can tell
that two values are equal by comparing the parts it holds, with no
arithmetic; and a value costs the same bits, and meets the significand
limit the same way, by every route.

| You type                                  | Held as       |
| ----------------------------------------- | ------------- |
| `2.54`, `254/100`, `127/50`, `2.5 + 0.04` | `254 × 10^-2` |
| `1/6`, `5/30`, `0.5/3`                    | `5/3 × 10^-1` |
| `1e30/3`, `(1/3)*1e30`                    | `1/3 × 10^30` |

Nothing else touches an exact value in exact mode: no digits setting
applies to it, and an exact result of exact operands is never rounded.
Only where an exact value meets an inexact one is any of it rounded,
into the inexact result's error radius ([Operations that stay
exact](#operations-that-stay-exact-exact-cases-of-functions)).

### The digits an inexact value is kept to

An inexact value is never held to more digits than its error radius
makes meaningful. The calculator computes an answer in one or more
passes, each a computation at a set precision, a count of decimal
digits, and retries at a higher precision when the digits asked for do
not certify ([Digits you can trust](#digits-you-can-trust) gives the
schedule). Within a pass, every inexact midpoint is kept on the pass's
**grid**: the set of values with a fixed number of significant digits,
a little beyond the precision the pass works at. After every step the
midpoint is rounded onto the grid, and the rounding is charged to the
error radius. A grid value is decimal digits times a power of ten, the
same `Scaled` form the display writes, so the digits computed and the
digits shown are one thing.

### The power of ten is free; a power of two is not

The exponent costs nothing, whatever its size: `10^1000000000` is
`= 1e+1000000000`, only its exponent counted, against the exponent
bound. That bound caps the exponent itself, not the value, at `10^18`
either way, so `1e1000000000000000000` is a value, and nothing larger
is ([Values too big to hold](#values-too-big-to-hold)).

A power of two in a denominator is another matter. The canonical form
allows no two below the line, so a denominator of `2^k` is held as
`5^k` in the numerator with `10^-k` in the exponent (a five goes the
other way, into a power of two, which costs less). `2^-30000`, a
30,000-bit value, is held as `5^30000` times `10^-30000` and costs about
69,658 bits, so it is refused at the default limit where `2^-28000` is
a value. That is the one case where the cost is more than the value's
own bits, and it only matters for a value already close to the limit: a
number that simple by its factors is still a big number by its digits
(`3^-100000` costs its 158,497 bits under any way of storing it as
digits), and `approx` is the way to compute with one
([approx](#approx)).

### Two limits, two units

Everything the calculator holds lives within the significand limit,
inexact values included: the midpoint of an inexact value is a
fraction too, a whole number of digits over one, and the grid it is
rounded onto must fit within the limit like any other fraction. That
is why the limits come in two units. The **significand limit**, in
bits, bounds the fraction every value is held as. The **precision
limit**, in decimal digits, bounds how far an inexact value is
refined: the highest precision any pass computes at, the **ceiling**,
is set from it, and the midpoint at the ceiling must fit within the
significand limit, so the significand limit caps the precision limit
in turn and bounds how fine any pass's grid can be
([How the settings bound each other](settings.md#how-the-settings-bound-each-other)).

## Operations that stay exact; exact cases of functions

Exactness survives arithmetic. This section says which operations keep
it, what happens when exact and inexact values meet, and when a
built-in returns an exact result.

`+`, `-`, `*`, `/` and a whole-number power on exact values give an
exact result, as long as it needs to be; and a comparison of exact
values is always decided
([Comparison and equality](#comparison-and-equality)). An exact result
of exact operands is never rounded in exact mode, and an exact value is
never replaced by a different exact value.

| You type    | Exucal shows     | Note                                                            |
| ----------- | ---------------- | --------------------------------------------------------------- |
| `1/3 * 3`   | `= 1`            |                                                                 |
| `0.1 + 0.2` | `= 0.3`          |                                                                 |
| `3^20`      | `≈ 3.4867844e+9` | exact and entire, `3486784401`, written to eight display digits |

What the arithmetic cannot do exactly, it does not do inexactly on its
own. A sum whose operands cannot be aligned within the significand
limit is refused rather than rounded.

| You type          | Exucal shows                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `1e999999999 + 1` | refused: the exact sum has a billion digits ([Values too big to hold](#values-too-big-to-hold)) |

Where an exact operand meets an inexact one, the result is inexact in
any case, and the strictness relaxes. If the exact step would pass the
significand limit, the exact operand is rounded onto the pass's grid,
the rounding charged to the result's error radius as `approx` would
charge it, so that the step gives a value rather than a refusal; an
exact operand that already fits the grid is left as it is. The error
radius of such a result covers the rounding of the exact operand
together with the inexact operand's own, so the result still bounds the
true value.

| You type                | Exucal shows     | Note                                       |
| ----------------------- | ---------------- | ------------------------------------------ |
| `1e999999999 + sqrt(2)` | `≈ 1e+999999999` | the root is absorbed into the error radius |

A built-in returns an exact result wherever its value is rational and
cheaply recognized, which its entry calls an **exact case**. Otherwise
its value is inexact, however round it looks.

| You type        | Exucal shows |
| --------------- | ------------ |
| `sqrt(9/4)`     | `= 1.5`      |
| `log(2, 8)`     | `= 3`        |
| `exp(0)`        | `= 1`        |
| `cos(0 radian)` | `= 1`        |
| `gamma(5)`      | `= 24`       |
| `ln(8) / ln(2)` | `≈ 3`        |

Which values each function recognizes is in its entry
([Built-in functions](builtins.md#rules-every-built-in-follows)).

## Digits you can trust

Every digit the calculator shows is one it has certified. This section
says what that means, how it is achieved, and how to read an output line and
its note.

In exact mode the **display digits** are how many digits of the answer
must be certified before it is shown, and a digit is **certified** when
every value within the error radius rounds to it. The calculator
computes at a precision a little above the digits asked, one **pass**,
and where the digits do not certify, computes again at twice the
precision, pass by pass, up to the ceiling, which the precision limit
sets ([Precision limit](settings.md#precision-limit) gives the number).
This is the **retry loop**. The display digits themselves may be set up
to the precision limit. An expression whose digits can never certify
runs every pass up to the ceiling on every keystroke, which is what the
precision limit limits: effort ([What costs time](#what-costs-time); the
passes and the precision each works at are in [the schedule of
passes](../devdocs/numbers.md#working-precision-and-the-schedule)).

Reading a line: `=` means the value is exact and every digit it has is
shown; `≈` means that digits were rounded away or that a step of the
computation was inexact.

| You type    | Into        | Exucal shows      | Note                                                                                                                                                    |
| ----------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1 in`      | `cm`        | `= 2.54 cm`       | exact, entire                                                                                                                                           |
| `3 ft`      | `in`        | `= 36 in`         | exact, entire                                                                                                                                           |
| `1 m`       | `in`        | `≈ 39.370079 in`  | exact, with more digits than shown                                                                                                                      |
| `1/3`       |             | `≈ 0.33333333`    | exact, with more digits than shown                                                                                                                      |
| `2^(1/2) m` | `2^(1/2) m` | `≈ 1 × 2^(1/2) m` | inexact: each root was computed to a finite number of digits, however exactly they cancel ([Identities and cancellation](#identities-and-cancellation)) |

Reading a note: an answer shows every digit asked for when the
computation can vouch for them all. When it cannot, which only the last
pass produces, a note in parentheses says what the digits are worth:

- how many of them are certified: "7 of 8 digits are certified", and
  "0 of 8" when none is;
- or that the value is zero within a bound: "within 2e-30 of zero", the
  value written `0` whatever the sign of the noise it is within.

A partly certified answer is rare, and comes two ways. One is a value
computed inexactly that lies exactly halfway between two roundings of
the digits asked, which no pass can certify. The other is a rounding
mode that rounds in one direction, under which a value whose error
radius reaches across the value shown certifies no digit
([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

| You type                  | Exucal shows                          | Note                                                           |
| ------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| `sqrt(2)^2 * 1.000000025` | `≈ 2 (7 of 8 digits are certified)`   | a value on a halfway point                                     |
| `log(256, 512)`           | `≈ 1.1 (2 of 3 digits are certified)` | at three display digits; its value `9/8` is computed inexactly |
| `approx(1)`               | `≈ 1 (0 of 8 digits are certified)`   | under the rounding mode down                                   |
| `(2^(1/2))^2 - 2`         | `≈ 0 (within 4e-4049 of zero)`        | zero within a bound                                            |

In decimal mode a step whose rounding could not be certified at the
precision limit is written with the **uncertified** mark, `≈` with a
dot above it, and a note says so ([The two modes](#the-two-modes)).

## Comparison and equality

A comparison is decided by the error radii as much as by the values.
This section says when a comparison is decided and when it is not, and
what equality means here.

A comparison appears in the conditions of a defined function
([Functions](definitions.md#functions)) and inside every built-in that
must know which side of a point its argument lies on. Two exact values
compare exactly, always decided and never refused for size.

An inexact value is compared as the whole range within its error
radius. When the range lies on one side of the other value, the
comparison is decided. When it reaches across the other value, the
comparison is **undecided**, the one word this page uses for a
comparison that neither holds nor fails. A range that ends exactly on
the other value is the subtle case: it never decides a strict
comparison (`<`, `>`) in its favour, and decides a non-strict one
(`<=`, `>=`) only from the side the comparison admits.

| You type                 | Exucal shows                                     | Note                                                                                                               |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `tempC(-273.15)`         | `= 0 K`                                          | exact: the condition `x >= -273.15` is met                                                                         |
| `tempC(approx(-273.15))` | `≈ 0 K (within 2e-4047 of zero)`, with a warning | the range reaches across `-273.15`, so the condition cannot be decided at any pass, and the value assumes it holds |

Two inexact values are compared through their difference against zero,
which can always be formed, the smaller operand absorbed into the error
radius where the two cannot be aligned. A difference that cannot be
formed as a value, its exponent passing the bound, counts as reaching
across zero, and the comparison cannot be decided.

There is no equality operator and no `!=`. The comparisons are `<`,
`<=`, `>` and `>=`, and equality appears only as `=` on a result line,
in a function's exact cases, and in the check a conversion into a
function makes
([Conversion into a function](quantities.md#conversion-into-a-function)).

Where a comparison that cannot be decided surfaces is the subject of
the next section: a divisor, a function's domain or pole, a rounding
function, the exponent bound, and that check.

## Values at an edge

Some points are edges: a result would jump if the value lay a hair to
one side of them. This section says what the calculator does when an
inexact value reaches across one.

The edges are zero as a divisor; the end of a function's domain (`1`
for `asin`); a pole of the function (`tan` at `90 deg`, `gamma` at
zero); a whole number for `floor` and a point halfway between two
roundings for `round`; a multiple of the divisor for `div` and `mod`;
and the point where a result passes the exponent bound.

An inexact value whose error radius reaches across such an edge is not
guessed at. The calculator computes again at more digits, pass by pass,
and when the error radius still reaches across the edge at the ceiling,
the result is an error, which says that the value **cannot be told
from** the edge at this precision. An exact value exactly on an edge is
decided.

| You type                                 | Exucal shows                                   | Note                                                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(2^(1/2))^2 - 2`                        | `≈ 0 (within 4e-4049 of zero)`                 | zero within a bound at every precision                                                                                                                               |
| `1 / ((2^(1/2))^2 - 2)`                  | an error: the divisor cannot be told from zero |                                                                                                                                                                      |
| `exp(approx(1e999) - approx(1e999 - 5))` | `≈ 148.41316`                                  | reaches across the exponent bound at its first pass, the difference being `5` only within a wide error radius, and is retried until the radius lies within the bound |
| `floor(2)`                               | `= 2`                                          | an exact value on the edge is decided                                                                                                                                |

A value that still reaches across the bound at the ceiling cannot be
told from the point where the result passes it.

The rounding functions are the one place where some edges decide a
value that cannot be told from zero and others do not:

- `trunc`, and `round` in any of the three modes to nearest or in the
  mode toward zero, give `= 0`;
- `floor`, `ceil`, `sign` and `round` (in the modes away from zero, up
  and down) do not, and the result is an error
  ([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

## Identities and cancellation

An identity that holds on paper does not certify to exactness here,
because its inexact steps are computed to finite digits. This section
says what that costs and how to avoid it.

An identity through an inexact step never certifies exactly.
`(2^(1/2))^2 - 2` is zero within a bound on every pass, since the
cancellation leaves it an error radius of the pass's last digit however
fine the pass. So it runs every pass up to the ceiling, or until a
later pass ends the retry loop with a refusal, when the best result so
far is shown, and dividing by it is an error
([Values at an edge](#values-at-an-edge)). A finer pass is necessary
for more certified digits and never sufficient.

| You type           | Into        | Exucal shows                   |
| ------------------ | ----------- | ------------------------------ |
| `2^(1/2) m`        | `2^(1/2) m` | `≈ 1 × 2^(1/2) m`, not `=`     |
| `1 turn`           | `deg`       | `≈ 360 deg`                    |
| `sin(pi() radian)` |             | `≈ 0 (within 2e-4049 of zero)` |

Every occurrence of a value is independent. `approx(1) - approx(1)` is
a value within a bound of zero, never exactly `0`, and a parameter of a
defined function used twice is two independent copies of its argument's
error radius, so `x - x` in a body is the same bound around zero that
the text typed inline would be ([Functions](definitions.md#functions)).

A function written by hand in place of a built-in is slower, and can
fail where the built-in does not: each step rounds and the error radii
add up; the built-in's exact cases are lost; and a step can pass a
limit the result does not.

| You type                                              | Exucal shows                                 | Note                   |
| ----------------------------------------------------- | -------------------------------------------- | ---------------------- |
| `log(2, 8)`                                           | `= 3`                                        | an exact case          |
| `ln(8) / ln(2)`                                       | `≈ 3`                                        | the same value by hand |
| `tanh(3e18)`                                          | `≈ 1`                                        |                        |
| `(exp(3e18) - exp(-3e18)) / (exp(3e18) + exp(-3e18))` | refused: `exp(3e18)` is too large to compute | the same value by hand |

Prefer the built-in, and where there is none, work in log space
([Values too big to hold](#values-too-big-to-hold)).

## The two modes

Exucal has two arithmetics. Exact mode, the default, is what the rest
of this page describes. Decimal mode is the arithmetic of a hand
calculator, every step rounded to the digits shown. This section states
decimal mode as four rules and says what follows from them.

### Exact mode

An exact value stays exact however long it is, an inexact one carries
its error radius, and the digits shown are certified by passes at
rising precision. Everything on this page is about exact mode unless it
says otherwise.

### Decimal mode

1. **Every step is rounded once, and the rounded value is the value.**
   A **step** is an operation you can see: each `+`, `-`, `*`, `/` and
   `^`; two factors written side by side; a negation (a `-` before a
   product); each number typed; each unit (a prefixed unit being one
   step); and each built-in call as a whole. Its exact result is rounded
   to the display digits in the rounding mode, exact values included,
   and nothing is kept beyond those digits. No value is inexact, so
   every answer is written with `=`, the uncertified mark apart. A
   number typed with more digits than the display digits is rounded as
   it is read, unless it passes the significand limit, which refuses it
   before anything rounds it, in either mode
   ([Values too big to hold](#values-too-big-to-hold)). A sum whose
   operands cannot be aligned within that limit, refused in exact mode,
   is here the correctly rounded sum.

   | You type              | Exucal shows (decimal mode, eight display digits) |
   | --------------------- | ------------------------------------------------- |
   | `1 / 3 * 3`           | `= 0.99999999`                                    |
   | `1 / (1 / 3 * 3 - 1)` | `= -1e+8`                                         |
   | `1e999999999 + 1`     | `= 1e+999999999`                                  |

2. **A built-in call is one step, certified and rounded once.** Its
   value is computed at rising precision, up to the same ceiling as
   exact mode's, until its rounding to the step's digits is certified,
   so the precision limit bounds that certification as it bounds the
   display digits; the error radius serves only inside the step, to
   certify the rounding of a function's value or of a unit defined
   through `pi()`, and the step's one rounding removes it. A value that
   lies exactly halfway between two roundings of the step's digits never
   certifies. It is then shown as it rounds, under the uncertified mark,
   `≈` with a dot above it (`≈̇`), with the note "a step could not be
   certified at the precision limit", which stays with every later
   step. A function defined in the definitions file is not one step but
   its body's steps, each rounded as a hand calculator rounds each
   keystroke, where a built-in's value is rounded once
   ([Functions](definitions.md#functions)).

   | You type                   | Exucal shows                                                 | Note                                                                                            |
   | -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
   | `log(4, 8)`                | `≈̇ 2 (a step could not be certified at the precision limit)` | at one display digit; the value `3/2` is computed inexactly                                     |
   | `(exp(1e-30) - 1) / 1e-30` | `= 0`                                                        | at eight digits: `exp(1e-30)` was rounded to `1` before the subtraction; exact mode gives `≈ 1` |

3. **Decimal mode runs a single pass.** There is no retry loop: nothing
   is computed again at more digits, and an expression that would run
   to the ceiling in exact mode costs one pass here
   ([What costs time](#what-costs-time)). `approx` is the identity
   ([approx](#approx)), and a comparison always decides, since every
   value is exact.

4. **The working digits round every step but the last.** With
   **working digits** above the display digits
   ([Working digits and the extended count](settings.md#working-digits-and-the-extended-count)),
   every step is rounded to the working digits, and only the last step
   of each value shown to the display digits, directly from the exact
   result of its operation. The last steps are the result of the
   expression you typed, when nothing is converted into; the
   conversion's ratio; a unit list's counts and remainder; and the count
   a conversion into a function recovers. When something is converted
   into, the expression typed and what it is converted into are both
   operands, rounded to the working digits. The **reciprocal line**, the
   conversion the other way round, is the exception: it is the
   reciprocal of the ratio shown, at the display digits, whatever the
   working digits.

   | You type        | Into | Exucal shows     | Note                       |
   | --------------- | ---- | ---------------- | -------------------------- |
   | `ln(exp(1/10))` |      | `= 0.099999984`  | eight display digits       |
   | `ln(exp(1/10))` |      | `= 0.1`          | over twelve working digits |
   | `1 / 3 * 3 m`   | `in` | `= 39.370078 in` | eight display digits       |
   | `1 / 3 * 3 m`   | `in` | `= 39.370079 in` | over twelve working digits |

### What decimal mode does to units and edges

Two consequences follow. A unit that carries `pi()` is rounded as it is
looked up, like any other step, so `1 turn` into `deg` is `=` with a
value a little under 360, where exact mode gives `≈ 360 deg`. And no
argument reaches across an edge, since every argument is exact, so
`tan(90 deg)` may give an exact value in decimal mode where exact mode
fails at the pole: the value is the tangent of the rounded degree, not
of a right angle. Under a rounding mode that rounds in one direction,
every step rounds that way
([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

## `approx`

`approx` is the designed escape from the strictness of exact
arithmetic: it makes a value inexact on purpose, so that the arithmetic
may round it. This section says what it does and what it cannot do.

`approx(x)` is `x` known to the precision of the pass and no better: an
exact argument becomes inexact, with an error radius of one unit in the
last of the digits the pass keeps, and an inexact one is left as it is,
never narrowed. It keeps the dimension, leaves a zero as it is (a value
that is zero within a bound keeps its bound), and in decimal mode is the
identity, since every value there is already rounded
([The two modes](#the-two-modes)). Its unit of error lies well beyond
the display digits, so `approx(2.54) cm` into `in` is `≈ 1 in`, written
`≈` rather than `=`, which is the point.

| You type          | Into | Exucal shows |
| ----------------- | ---- | ------------ |
| `approx(2 m)`     |      | `≈ 2 m`      |
| `approx(0)`       |      | `= 0`        |
| `approx(2.54) cm` | `in` | `≈ 1 in`     |

A step the exact arithmetic refuses for its size (a sum that cannot be
aligned; a whole-number power, a product or a quotient whose exact
result would pass the significand limit) is computed to the digits
asked once one operand is inexact, and shown with `≈` instead of `=`
([Values too big to hold](#values-too-big-to-hold)).

| You type                    | Exucal shows            | Note                                                  |
| --------------------------- | ----------------------- | ----------------------------------------------------- |
| `1e999999999 + 1`           | refused                 | the exact value has a billion digits                  |
| `approx(1e999999999) + 1`   | `≈ 1e+999999999`        | the `1` absorbed into the error radius                |
| `3^1000000000`              | refused                 |                                                       |
| `approx(3)^1000000000`      | `≈ 5.243997e+477121254` | the digits kept to the pass's precision at every step |
| `3^32767 * 7^21845`         | refused                 | each power within the limit, their product past it    |
| `approx(3^32767) * 7^21845` | `≈ 9.9732685e+34094`    |                                                       |

`approx` says how well a value is known, not how large it is, so it
never changes an exponent, and it relaxes no limit but the one an
inexact operand changes the arithmetic for. A function that works at
its argument's own size refuses by that size whether the argument is
inexact or not, and `approx` on the base of a power does not help an
exponent that cannot itself be formed within the significand limit.

| You type                          | Exucal shows                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `exp(approx(1e999))`              | too large to compute, as `exp(1e999)` is                    |
| `sin(approx(1e999999999) radian)` | past the significand limit, as `sin(1e999999999 radian)` is |

Nor would `approx` help `exp` if the exponent were allowed, because of
what the exponential does to an error radius: `exp(x ± r)` is `exp(x)`
times a factor between `e^-r` and `e^r`, so the argument's error radius,
in absolute terms, becomes the result's relative error, and `exp` of a
large argument needs that argument to many more digits than the result
shows. At the first pass `exp` finds that the result's exponent passes
the bound for every value within the argument's error radius, refuses,
and the retry loop ends there; an exact argument gives those digits for
free, an inexact one only after passes enough to shrink its error
radius below one.

## Rounding modes and where they act

The rounding mode is one setting with three places to act. This section
says where.

The **rounding mode** ([Rounding](settings.md#rounding)) is the rule for
the last digit kept when a value is cut to fewer digits than it has.
Three modes round to the nearest value and differ on a value exactly
halfway between two roundings, which the default sends to the even
digit and the other two away from zero or toward zero; four round in
one direction: toward zero, away from zero, up or down.

- In exact mode it acts once, at the display, in the rounding of a
  value to the digits shown and in what those digits certify
  ([Digits you can trust](#digits-you-can-trust)).
- In decimal mode it acts at every step
  ([The two modes](#the-two-modes)).
- Inside an expression it acts in one place, `round`, which rounds to a
  whole number, or with a second argument to that many decimal places,
  in the mode.

| You type          | Exucal shows | Note                                            |
| ----------------- | ------------ | ----------------------------------------------- |
| `round(2.5)`      | `= 2`        | under the default, to nearest with ties to even |
| `round(2.5)`      | `= 3`        | under to nearest with ties away from zero       |
| `round(2.345, 2)` | `= 2.34`     | under the default                               |
| `round(2.345, 2)` | `= 2.35`     | under to nearest with ties away from zero       |

The rounding functions' entries are in
[Built-in functions](builtins.md).

## Values too big to hold

Two limits bound a value, on two different parts of it, and a refusal
names the one it passes. This section says what each limit is, what it
refuses, what the message says, and what to try.

A **refusal** is the one failure this page calls by that name: a
value the limits keep from being computed, or a number typed past them.
Everything else that stops a result (a mismatch, a condition that
fails, a value that cannot be told from an edge) is an error.

A value is held as a significand times a power of ten
([How a value is held](#how-a-value-is-held)). The settings bound the
significand: the display digits and the precision limit say how many
of its digits must be certified, and the significand limit how many
bits its numerator and its denominator may have. The exponent has a
fixed bound of its own, `10^18` either way, which is not a setting.
`1e999` is `1 × 10^999`, well within both. `exp(1e999)` has a
significand that 32 digits hold with ease and an exponent that is
itself a number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └───────── significand ─────────┘      └─────── exponent ───────┘
             the settings' part: the display        fixed, not a setting:
             digits, the precision limit and        at most 10^18 either
             the significand limit; 32 digits       way; this one has 999
             fit with ease                          digits, 4.3 × 10^998
```

### The significand limit

The limit is strict: no exact value past it is ever formed, and an
operation predicts the size of its result before forming it. When a
result would need a significand past the limit, the calculator refuses
that part of the expression, names it and says how many bits it would
need, exactly or about, where the operation knows:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
```

Where the operation that refused expects the same step to fit when
computed inexactly, the message suggests what to try: `approx(…)` around the operand it
names, so that the part is computed to the digits asked and shown with
`≈` ([approx](#approx)); or decimal mode, which rounds every step and
so never holds the exact value. Where the
operation expects the value to pass the limit however it is computed,
the message says so and suggests nothing, and what a wider limit would
need is yours to judge. That is the case for a built-in whose value
needs more bits than the limit holds even rounded, `factorial(20000)`
or `sin` of an angle whose reduction passes the limit; for a number
typed with more digits than the limit; and for a power whose exponent
cannot be formed within it, `2^1e-30000`. The suggestion is the
operation's expectation, not a promise.

A refusal is never retried at more digits, and one that a later pass is
the first to meet ends the retry loop with the best result so far: the
message says which failure it is, so that you can decide whether a wider
limit, `approx` or decimal mode would help. A built-in that works at
its argument's own size refuses by that size whether the argument is
exact or not, so `approx` does not help there; the whole-number
functions' refusals, `factorial`'s among them, never offer `approx` or
decimal mode and apply in both modes; and `round(x, places)` and `mod`
are refused when their results would pass the limit. A number typed
longer than the most the significand limit can be set to is refused as
it is typed. The limit is what makes `3^1000000000` a refusal rather
than a hang; the setting is in
[Significand limit](settings.md#significand-limit).

### The exponent bound

A result whose exponent would pass `10^18` is too large to compute, and
one whose exponent would fall below `-10^18` is too small, whether the
value is exact or inexact:

```
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
```

The bound is on the value, not on the form it is held in. Zero is
within the bound at any exponent, so a value that is zero within a
bound is never refused at the bound, however small the bound. A number
typed past the bound is refused as it is typed, and a number within the
bound whose rounding to the display digits would carry past it is
refused the same way, so that every line written pastes back
([How numbers are written](#how-numbers-are-written)).

| You type                         | Exucal shows                                                         | Note                                        |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `1e1000000000000000000 / 3 * 10` | `≈ 3.3333333e+1000000000000000000`                                   | a value: its exponent lies within the bound |
| `1e-1000000000000000000 / 7`     | too small to compute                                                 |                                             |
| `1e1000000000000000001`          | refused as it is typed                                               |                                             |
| `0.001e1000000000000000003`      | `= 1e+1000000000000000000`                                           | within the bound                            |
| `9.5e1000000000000000000`        | refused: rounding it to one display digit would carry past the bound | at one display digit                        |

The exponential of `x` has the exponent `x log10 e`, so `exp(x)` is
refused whenever `x` passes `(10^18 + 1) ln 10`, about `2.3026e18`, for
every value within its error radius, with or without `approx`. `sinh`,
`cosh` and powers share the bound, `sinh` and `cosh` of a negative
argument being too large rather than too small.

| You type                     | Exucal shows                      |
| ---------------------------- | --------------------------------- |
| `exp(2.3e18)`                | `≈ 3.9591004e+998877308377479203` |
| `exp(2.31e18)`               | too large to compute              |
| `exp(-1e999)`                | too small to compute              |
| `pow(10, 1e999)`, `10^1e999` | too large to compute              |

A product, quotient or power that no setting could hold is reported at
the bound even where the significand limit would refuse it first:
`7^1e19`, a whole number of about `8.5 × 10^18` digits, is too large to
compute, where `2.54^1e18`, a hair within the bound, is past the
significand limit. A sum never faces that choice: a sum that aligns and passes the bound
is too large or too small to compute; and one that cannot be aligned is
refused at the significand limit or, with an inexact operand, has the
value of its larger operand, which is within the bound. A refusal at the bound needs every value within the error
radius to lie past it; an argument whose value may lie on either side
of the bound is retried at more digits, and at the ceiling cannot be
told from the point where the result passes the exponent bound
([Values at an edge](#values-at-an-edge)).

The bound is not a setting, and a higher one is ruled out: parts of the
parts of `Ball` are exact only because the exponent is at most `10^18`,
and the cost of an exponential grows fast with its argument once the
bound is raised; the reasons, and the passes an inexact argument costs
`exp` near the bound, are in [Why the exponent bound stays at
10^18](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018).

### Working in log space

Instead, work in log space, as on paper: a quotient of exponentials is
the exponential of a difference.

| You type                      | Exucal shows                                            |
| ----------------------------- | ------------------------------------------------------- |
| `exp(1e999) / exp(1e999 - 5)` | refused: `exp(1e999)` is too large to compute           |
| `exp(1e999 - (1e999 - 5))`    | `≈ 148.41316`                                           |
| `1e999 / ln(10)`              | `≈ 4.3429448e+998`, the exponent of `exp(1e999)` itself |

## How numbers are written

A result is written one way, from the value and the settings alone.
This section says how the digits display and the ratio notation write
a value, how a line pastes back, and why what you see is predictable.

### The digits display

A result is written as digits: the significant digits the value
certifies, up to the display digits, rounded in the rounding mode with
trailing zeros dropped. Exponent form, `1e+21` or `1e-5`, is used when
the value is below `1e-4` or needs more digits before the decimal point
than the display digits allow. The power of ten is never written out,
so any magnitude renders. A value that is zero within a bound is
written `0`, with its note
([Digits you can trust](#digits-you-can-trust)).

| You type              | Exucal shows      | Note                                |
| --------------------- | ----------------- | ----------------------------------- |
| `100000000`           | `= 1e+8`          | nine digits at eight display digits |
| `0.00001`             | `= 1e-5`          |                                     |
| `0.0001`              | `= 0.0001`        |                                     |
| `10^1000000000`       | `= 1e+1000000000` |                                     |
| `1 / (1 / 3 * 3 - 1)` | `= -1e+8`         | decimal mode, eight display digits  |

### The ratio notation

The **ratio notation**
([Notation and ratio width](settings.md#notation-and-ratio-width)), a
setting of exact mode alone, writes an exact value as a fraction where
one fits the **ratio width**, which is independent of the display
digits:

- a whole number is written entire when it has at most the width's
  significant digits;
- a fraction is written as `n/d` when its numerator and denominator
  together have at most that many digits;
- otherwise, where that fits, the value is written as a fraction times
  a power of ten, `1/3 × 1e+30`, the two being the value's canonical
  form ([How a value is held](#how-a-value-is-held));
- anything longer is written as digits, and an inexact value is always
  written as digits.

| You type     | Into | Digits notation   | Ratio notation, width 20 |
| ------------ | ---- | ----------------- | ------------------------ |
| `1 m`        | `in` | `≈ 39.370079 in`  | `= (5000/127) in`        |
| `3^20`       |      | `≈ 3.4867844e+9`  | `= 3486784401`           |
| `1/3 * 1e30` |      | `≈ 3.3333333e+29` | `= 1/3 × 1e+30`          |
| `sqrt(2) m`  |      | `≈ 1.4142136 m`   | `≈ 1.4142136 m`          |

The notation changes how an exact value is written, never what is
exact.

A ratio is written in parentheses where a unit follows it,
`(5000/127) in`, and bare where `×` follows it or nothing does, as on
the reciprocal line `in = 1/36 × 3 ft` of `3 ft = 36 in`. The
parentheses matter: two factors written side by side
(**juxtaposition**) bind tighter than `/`, so `1/2 in` is `1/(2 in)`, a
quantity per inch, unlike `(1/2) in` and `0.5 in`
([Pitfalls](expressions.md#pitfalls)).

### Pasting a result back

Every result pastes back as input. The copy button produces its text
from the value as held, not from the text on the screen, writing `*`
where the screen shows `×` ([What the app writes
back](expressions.md#what-the-app-writes-back)). The one rounding that
could write a number past the exponent bound, a value within the bound
whose rounding to the display digits carries past it, is refused instead
([Values too big to hold](#values-too-big-to-hold)).

### One value, one line

What is written is as fixed as what is held. A line is a function of the
value, of whether it is exact, and of the settings, never of the route
a computation took.

| You type                        | Digits notation   | Ratio notation  |
| ------------------------------- | ----------------- | --------------- |
| `2.54`, `254/100`, `2.5 + 0.04` | `= 2.54`          | `= 127/50`      |
| `1e30/3`, `(1/3)*1e30`          | `≈ 3.3333333e+29` | `= 1/3 × 1e+30` |

What can depend on the route is the value itself, in decimal mode,
where every step is rounded ([The two modes](#the-two-modes)); and
whether the value is exact, where a step was inexact
([Digits you can trust](#digits-you-can-trust)). A given value, exact
or not, is written one way.

## What costs time

What costs time is passes and bits.

An expression whose digits certify at the first pass costs one pass.
One whose digits never certify (an identity through an inexact step,
or a value at an edge) runs every pass up to the ceiling on every
keystroke, so the precision limit is a cost setting before it is
anything else ([Digits you can trust](#digits-you-can-trust)). Decimal
mode runs one pass whatever happens ([The two modes](#the-two-modes)).

Bits cost too. The cost of an exponential grows fast with its argument,
and so does the cost of the functions built on it, which is one reason
the exponent bound stays where it is
([Values too big to hold](#values-too-big-to-hold)). An exact power or
product costs the bits of its result, so a definition that reads small
can be large, a few characters of exponent standing for a number of
thousands of digits ([How a value is held](#how-a-value-is-held)).

A function written by hand is slower than the built-in, and a defined
function costs what its body typed out in its place would cost, a body
that calls a function twice computing it twice, at every pass
([Identities and cancellation](#identities-and-cancellation)). Some
built-ins pay a cost once, the first time they are called at a new
precision, for a constant or a table they then keep, and some are
expensive at any precision; their entries say which
([Built-in functions](builtins.md)).

## Real values only

Exucal computes with real values only: every value is a real number
held within an error radius, and a function asked for a value outside
its real domain, `sqrt(-1)` or `asin(2)`, is an error.
