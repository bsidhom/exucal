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
  That exponent lets `1e999999999` be a value rather than a billion
  digits, and `Scaled` is the form every exact value is held in.
- **`Ball`** is a `Scaled` midpoint together with a `Radius`, a bound on
  how far the number held may lie from the number meant. A `Radius` is
  a coarse binary magnitude, a short significand times a power of two,
  and every operation on radii rounds it up: it is always a true bound
  and never an exact one, which lets it be carried through an
  expression at almost no cost. Every value the calculator computes
  with is a `Ball`. When the radius is zero the value is exact; when it
  is not, the value is inexact, and the radius lets the calculator say
  which digits of it are right.

Two goals guided this design: the exactness just described; and the
functions a calculator is used for, all the elementary functions and the
special functions that matter most in combinatorics, probability and
physics, each exact where it can be and certified otherwise. The
representation delivers both. Exact arithmetic stays exact however long
the numbers grow, until a limit you set says they may grow no further.
Everything else is computed with an error radius and shown only to the
digits that radius certifies, at rising precision until they do. So
`0.1 + 0.2` is exactly `0.3`, `1/3 * 3` is exactly `1`,
`sqrt(2) / sqrt(2)` is `≈ 1` and not `= 1`, and an input the limits
cannot hold is refused rather than answered wrongly.

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
- **`=` means exact and shown entire; `≈` means digits were left out or a step was inexact.**
  Every digit shown is certified: the calculator recomputes at rising
  precision, up to a ceiling, until the digits you asked for certify
  ([Digits you can trust](#digits-you-can-trust)).
- **A value whose radius reaches across an edge is never guessed at**:
  a divisor at zero, a pole, a domain's end. At the ceiling the result is
  an error saying the value cannot be told from the edge
  ([Values at an edge](#values-at-an-edge)).
- **There are two arithmetics**: exact mode, the default; and decimal
  mode, which rounds every step as a hand calculator does and holds each
  rounded value as exact, so its results are `=`
  ([The two modes](#the-two-modes)).
- **Two size limits refuse what they cannot hold**: the significand
  limit, a setting, on the bits of a fraction; and the exponent bound,
  fixed, on the power of ten. The message names the limit and what to
  try, `approx` or decimal mode
  ([Values too big to hold](#values-too-big-to-hold)). Three settings
  nest. The display digits say how many digits must certify. The
  precision limit caps how far the retry loop may climb to certify
  them. The significand limit must hold the fraction that climb ends
  at, so it caps the precision limit in turn
  ([Two limits, bits and digits](#two-limits-bits-and-digits)).
- **An output line is predictable**: it is a function of the value, its
  exactness and the settings, never of the route, and it pastes back as
  input ([How numbers are written](#how-numbers-are-written)).

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
cost
([The power of ten is free; a power of two is not](#the-power-of-ten-is-free-a-power-of-two-is-not)).
The developer page on numbers weighs the rest
([The types](../devdocs/numbers.md#the-types)). Three calculators share
the aim of exactness, each by its own route:

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
`turn` is `≈`
([Which factors are exact](units.md#which-factors-are-exact) lists them).
The other is
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

The calculator never shows the error radius. It shows the digits the
radius leaves certified, and a note when they are fewer than you asked
for.

## How a value is held

Two settings bound a value: the significand limit, in bits, and the
precision limit, in decimal digits. A message that refuses a value
names one of them. To predict both, and to see why the calculator is
predictable, you need to know how a value is held.

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
- with a denominator coprime to ten: no factor of two or five at all.

So `2.54` is held as `254` times `10^-2`, and `1/6` as `5/3` times
`10^-1`: the two of the six is traded for a five above the line and one
power of ten in the exponent.

Each rule earns its place. Lowest terms makes `2/4` and `1/2` one
fraction. Moving every power of ten into the exponent keeps the
significand small while the exponent flexes, so magnitude costs
nothing. The third rule looks odd, since it turns `1/2` into
`5 × 10^-1`. The three together pin a value to one form, but another
rule for the twos and fives would pin it just as well, to a different
form. The real reason for this one is decimal: with it, a value has a
finite decimal expansion if and only if its denominator is `1`, and
its significand is then exactly its digits. That puts exact values and
the digits the display writes in one form.

A value has exactly one canonical form, whatever route a computation
reaches it by, because each step of building it is forced:

1. The fraction in lowest terms is unique.
2. The only denominator the rule allows is that fraction's with every
   two and five taken out.
3. With the denominator fixed, the exponent can only be the largest
   that still leaves the numerator a whole number.
4. The numerator is then whatever is left.

This makes a held value predictable. Equal values are held
alike, whatever expressions produced them, so the calculator can tell
that two values are equal by comparing the parts it holds, with no
arithmetic; and a value costs the same bits, and meets the significand
limit the same way, by every route.

| You type                                  | Held as       |
| ----------------------------------------- | ------------- |
| `2.54`, `254/100`, `127/50`, `2.5 + 0.04` | `254 × 10^-2` |
| `1/6`, `5/30`, `0.5/3`                    | `5/3 × 10^-1` |
| `1e30/3`, `(1/3)*1e30`                    | `1/3 × 10^30` |

In exact mode nothing else touches an exact value. No digits setting
applies to it, and an exact result of exact operands is never rounded.
An exact value is rounded only where it meets an inexact one, and that
rounding goes into the inexact result's error radius
([Operations that stay exact](#operations-that-stay-exact-exact-cases-of-functions)).

### The digits an inexact value is kept to

An inexact value is never held to more digits than its error radius
makes meaningful. The calculator computes an answer in passes, each at
a precision counted in decimal digits. The first pass runs ten digits
above the display digits. Each retry doubles the precision. No pass
runs above the **ceiling**, the highest precision any pass computes
at, which the precision limit sets
([Digits you can trust](#digits-you-can-trust) gives the schedule).
Within a pass, every inexact midpoint is kept on the pass's **grid**:
the set of values with a fixed number of significant digits, ten
beyond the pass's precision. After every step the midpoint is rounded
onto the grid, and the rounding is charged to the error radius. A grid
value is decimal digits times a power of ten, the same `Scaled` form
the display writes, so the digits computed and the digits shown are
one thing.

### The power of ten is free; a power of two is not

The exponent costs nothing, whatever its size. `10^1000000000` is
`= 1e+1000000000`, and the calculator counts only its exponent, against
the exponent bound. That bound caps the exponent itself at `10^18`
either way, so `1e1000000000000000000` is a value and nothing larger
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

### Two limits, bits and digits

The significand limit bounds every value the calculator holds, exact or
inexact. An inexact midpoint is a grid value, a finite decimal, so its
canonical denominator is `1` and its significand is its digits; the grid
it is rounded onto must fit within the limit like any other fraction. So
one limit is counted in bits and the other in digits. The
**significand limit**, in bits, bounds the fraction every value is held
as. The **precision limit**, in decimal digits, bounds how far an
inexact value is refined: it sets the ceiling, and the grid of the
ceiling's pass must fit within the significand limit. The significand
limit therefore caps the precision limit in turn, and with it the
finest grid, the grid of the ceiling's pass. Every pass's grid has ten
digits more than the pass's precision, so the finest grid has ten
digits more than the ceiling, and it is the finest grid an inexact
value is ever rounded onto
([How the settings bound each other](settings.md#how-the-settings-bound-each-other)).

## Operations that stay exact; exact cases of functions

Exactness survives arithmetic. This section says which operations keep
it, what happens when exact and inexact values meet, and when a
built-in returns an exact result.

On exact values, `+`, `-`, `*`, `/` and a whole-number power give an
exact result, however long it needs to be, and a comparison is always
decided ([Comparison and equality](#comparison-and-equality)). In
exact mode an exact result of exact operands is never rounded, and an
exact value is never replaced by a different exact value.

| You type    | Exucal shows     | Note                                                            |
| ----------- | ---------------- | --------------------------------------------------------------- |
| `1/3 * 3`   | `= 1`            |                                                                 |
| `0.1 + 0.2` | `= 0.3`          |                                                                 |
| `3^20`      | `≈ 3.4867844e+9` | exact and entire, `3486784401`, written to eight display digits |

An exact step that the limits cannot hold is refused, never done
inexactly in its place. A sum first aligns its operands at one scale,
as on paper; when they
cannot both be written at that scale within the significand limit, the
sum is refused rather than rounded.

| You type          | Exucal shows                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `1e999999999 + 1` | refused: the exact sum has a billion digits ([Values too big to hold](#values-too-big-to-hold)) |

Where an exact operand meets an inexact one, the result is inexact in
any case, so the strictness relaxes. If the exact step would pass the
significand limit, the calculator rounds the exact operand onto the
pass's grid and charges the rounding to the result's error radius, as
`approx` would, so that the step gives a value rather than a refusal.
An exact operand that already fits the grid is left as it is. The
result's error radius covers that rounding together with the inexact
operand's own radius, so the result still bounds the true value.

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

Each function's entry says which values it recognizes
([Built-in functions](builtins.md#rules-every-built-in-follows)).

## Digits you can trust

Every digit the calculator shows is one it has certified. This section
says what that means, how the calculator achieves it, and how to read
an output line and its note.

In exact mode the **display digits** say how many digits of the answer
must be certified before it is shown. A digit is **certified** when
every value within the error radius rounds to it. The calculator first
computes at a precision ten digits above the display digits; that
computation is one **pass**. Where the digits do not certify, it
computes again at twice the precision, pass by pass, up to the ceiling
([Precision limit](settings.md#precision-limit) gives the number). This is the **retry loop**. The display digits themselves may be set
as high as the precision limit. An expression whose digits never
certify runs every pass up to the ceiling on every keystroke, so the
precision limit limits effort ([What costs time](#what-costs-time);
the passes and the precision each works at are in
[the schedule of passes](../devdocs/numbers.md#working-precision-and-the-schedule)).

The loop runs over the whole computation, never over a part of it.
Each pass evaluates everything you typed, conversion included, from
the start at its own precision, and keeps from the pass before only
the best result so far, which the ceiling shows when no pass
certifies. A subexpression is never recomputed on its own: when a step
certifies poorly, the whole expression runs again at twice the
precision. In decimal mode the loop belongs to each built-in call
instead ([The two modes](#the-two-modes)).

On an output line, `=` means that the value is exact and every digit
it has is shown; `≈` means that digits were rounded away or that a
step of the computation was inexact.

| You type    | Into        | Exucal shows      | Note                                                                                                                                                    |
| ----------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1 in`      | `cm`        | `= 2.54 cm`       | exact, entire                                                                                                                                           |
| `3 ft`      | `in`        | `= 36 in`         | exact, entire                                                                                                                                           |
| `1 m`       | `in`        | `≈ 39.370079 in`  | exact, with more digits than shown                                                                                                                      |
| `1/3`       |             | `≈ 0.33333333`    | exact, with more digits than shown                                                                                                                      |
| `2^(1/2) m` | `2^(1/2) m` | `≈ 1 × 2^(1/2) m` | inexact: each root was computed to a finite number of digits, however exactly they cancel ([Identities and cancellation](#identities-and-cancellation)) |

An answer shows every digit asked for when the computation can vouch
for them all. Only the last pass can end without vouching for them,
and then a note in parentheses says what the digits are worth:

- how many of them are certified: "7 of 8 digits are certified", and
  "0 of 8" when none is;
- or that the value is zero within a bound: "within 2e-30 of zero", the
  value written `0` whatever the sign of the noise it is within.

A partly certified answer is rare and comes two ways. One is a value
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

A comparison is decided by both the midpoints and the radii. This
section says when a comparison is decided and when it is not; it also
says what equality means here.

A comparison appears in the conditions of a defined function
([Functions](definitions.md#functions)) and inside every built-in that
must know which side of a point its argument lies on. Two exact values
compare exactly: the comparison is always decided and never refused for
size.

An inexact value is compared as the whole range within its error radius.
When the range lies on one side of the other value, the comparison is
decided. When it reaches across the other value, the comparison is
**undecided**: it neither holds nor fails. A range that ends exactly on
the other value is the subtle case. It never decides a strict
comparison, `<` or `>`, in its favor, and it decides a non-strict one,
`<=` or `>=`, only from the side the comparison admits.

| You type                 | Exucal shows                                     | Note                                                                                                               |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `tempC(-273.15)`         | `= 0 K`                                          | exact: the condition `x >= -273.15` is met                                                                         |
| `tempC(approx(-273.15))` | `≈ 0 K (within 2e-4047 of zero)`, with a warning | the range reaches across `-273.15`, so the condition cannot be decided at any pass, and the value assumes it holds |

To compare two inexact values, the calculator subtracts one from the
other and compares the difference with zero. The difference carries
both error radii, so it decides the comparison when it lies on one
side of zero and leaves it undecided when it reaches across. Two cases
need care. When the values differ so much in magnitude that the
smaller cannot be written at the larger's scale within the significand
limit, the smaller is absorbed into the error radius, and the
difference is still formed. When the difference's exponent would pass
the exponent bound, the difference cannot be held as a value; it
counts as reaching across zero, and the comparison is undecided.

There is no equality operator and no `!=`. The comparisons are `<`,
`<=`, `>` and `>=`. Equality appears in three places only: as `=` on
an output line; in a function's exact cases; and in the check a
conversion into a function makes
([Conversion into a function](quantities.md#conversion-into-a-function)).

The next section says where an undecided comparison surfaces: at a
divisor, a function's domain or pole, a rounding function, the
exponent bound, and the check a conversion into a function makes.

## Values at an edge

Some points are edges: a result would jump if the value lay a hair to
one side of them. This section says what the calculator does when an
inexact value reaches across one.

The edges are:

- zero, as a divisor;
- the end of a function's domain, as `1` for `asin`;
- a pole of a function, as `90 deg` for `tan` or zero for `gamma`;
- a whole number, for `floor`, `ceil` and `trunc`, and for `round` in
  a mode that rounds in one direction;
- a point halfway between two roundings, for `round` in a mode to
  nearest;
- zero, for `sign`;
- a multiple of the divisor, for `div` and `mod`;
- the point where a result passes the exponent bound.

An inexact value whose error radius reaches across such an edge is not
guessed at. The calculator computes again at more digits, pass by pass.
When the error radius still reaches across the edge at the ceiling, the
result is an error: the value **cannot be told from** the edge at this
precision. An exact value exactly on an edge is decided.

| You type                                 | Exucal shows                                     | Note                                                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(2^(1/2))^2 - 2`                        | `≈ 0 (within 4e-4049 of zero)`                   | zero within a bound at every precision                                                                                                                                          |
| `1 / ((2^(1/2))^2 - 2)`                  | an error: the divisor cannot be told from zero   |                                                                                                                                                                                 |
| `exp(approx(1e999) - approx(1e999 - 5))` | `≈ 148.41316`                                    | at its first pass the difference is `5` only within a wide error radius, which reaches across the exponent bound; the calculator retries until the radius lies within the bound |
| `floor(2)`                               | `= 2`                                            | an exact value on the edge is decided                                                                                                                                           |
| `round(approx(2.5))`                     | an error: the argument cannot be told from `2.5` | a tie: the radius reaches across the halfway point at every precision, so every pass runs and the ceiling fails                                                                 |

A value that still reaches across the bound at the ceiling cannot be
told from the point where the result passes it.

The rounding functions are the one place where some edges decide a
value that cannot be told from zero and others do not:

- `trunc`, and `round` in any of the three modes to nearest or in the
  mode toward zero, give `= 0`;
- `floor`, `ceil`, `sign` and `round` (in the modes away from zero, up
  and down) do not, and the result is an error
  ([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

`round` has an edge of its own in the three modes to nearest: a point
halfway between two roundings. An inexact value whose error radius
reaches across one cannot be told from it at any pass, however small
the radius, so `round(approx(2.5))` runs to the ceiling and is an error
there, where `round(2.5)` is decided. In a mode that rounds in one
direction the halfway point is no edge, and the whole numbers are.

## Identities and cancellation

An identity that holds on paper does not certify to exactness here,
because its inexact steps are computed to finite digits. This section
says what that costs and how to avoid it.

An identity through an inexact step never certifies exactly.
`(2^(1/2))^2 - 2` is zero within a bound on every pass: the
cancellation leaves an error radius of the pass's last digit, however
fine the pass. So the expression runs every pass up to the ceiling,
unless a later pass ends the retry loop with a refusal and the best
result so far is shown. Dividing by it is an error
([Values at an edge](#values-at-an-edge)). A finer pass is necessary
for more certified digits and never sufficient.

| You type           | Into        | Exucal shows                   |
| ------------------ | ----------- | ------------------------------ |
| `2^(1/2) m`        | `2^(1/2) m` | `≈ 1 × 2^(1/2) m`, not `=`     |
| `1 turn`           | `deg`       | `≈ 360 deg`                    |
| `sin(pi() radian)` |             | `≈ 0 (within 2e-4049 of zero)` |

Every occurrence of a value is independent. `approx(1) - approx(1)` is
a value within a bound of zero, never exactly `0`. A parameter of a
defined function used twice is two independent copies of its
argument's error radius, so `x - x` in a body is the same bound around
zero that the text typed inline would be
([Functions](definitions.md#functions)).

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

Exucal has two arithmetics: exact mode, the default, and decimal mode,
the arithmetic of a hand calculator, in which every step is rounded to
a set number of digits. This section states decimal mode as four rules
and says what follows from them.

### Exact mode

Exact mode is the arithmetic every other section of this page
describes, and the mode a section means when it names none. An exact
value stays exact however long it is, an inexact one carries its error
radius, and the digits shown are certified by passes at rising
precision.

### Decimal mode

1. **Every step is rounded once, and the rounded value is the step's exact result.**

   A **step** is an operation you can see:

   - each `+`, `-`, `*`, `/` and `^`;
   - two factors written side by side;
   - a negation, a `-` before a product;
   - each number typed;
   - each unit, a prefixed unit being one step;
   - each built-in call, as a whole.

   A call of a defined function is not one step but its body's steps;
   rule 2 says more.

   The calculator rounds each step's exact result in the rounding mode
   to the **working digits**, a setting that equals the display digits
   unless you raise it
   ([Working digits and the extended count](settings.md#working-digits-and-the-extended-count)),
   and keeps nothing beyond those digits. Exact values are rounded like
   any other. Under a rounding mode that rounds in one direction, every
   step rounds that way
   ([Rounding modes and where they act](#rounding-modes-and-where-they-act)).
   The rounded value is exact, so no value is inexact, and every answer
   is written with `=`, apart from the uncertified mark.

   A number typed with more digits than the working digits is rounded
   as it is read, unless it passes the significand limit; the limit
   refuses it before anything rounds it, in either mode
   ([Values too big to hold](#values-too-big-to-hold)). A sum whose
   operands cannot be aligned within that limit is refused in exact
   mode and correctly rounded here.

   | You type              | Exucal shows (decimal mode, eight display digits) |
   | --------------------- | ------------------------------------------------- |
   | `1 / 3 * 3`           | `= 0.99999999`                                    |
   | `1 / (1 / 3 * 3 - 1)` | `= -1e+8`                                         |
   | `1e999999999 + 1`     | `= 1e+999999999`                                  |

2. **A built-in call is one step, certified and rounded once.**

   The calculator computes the call's value at rising precision, up to
   the same ceiling as in exact mode, until its rounding to the step's
   digits is certified; so the precision limit bounds that
   certification as it bounds the display digits. The error radius
   serves only inside the step, to certify the rounding of a function's
   value or of a unit defined through `pi()`, and the step's one
   rounding removes it.

   An inexact value whose true value lies exactly halfway between two
   roundings of the step's digits never certifies: its error radius
   reaches across the tie at every precision. It is then shown as it
   rounds, under the uncertified mark, `≈` with a dot above it (`≈̇`),
   with the note "a step could not be certified at the precision
   limit", and the note stays with every later step. An exact value on
   a tie is simply rounded by the mode.

   A function defined in the definitions file is not one step but its
   body's steps, each rounded as a hand calculator rounds each
   keystroke, where a built-in's value is rounded once
   ([Functions](definitions.md#functions)).

   | You type                   | Exucal shows                                                 | Note                                                                                                 |
   | -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
   | `log(4, 8)`                | `≈̇ 2 (a step could not be certified at the precision limit)` | at one display digit; the value `3/2` is computed inexactly                                          |
   | `(exp(1e-30) - 1) / 1e-30` | `= 0`                                                        | at eight digits: `exp(1e-30)` was rounded to `1` before the subtraction; exact mode gives `≈ 1`      |
   | `pow(2.25, 1/2)`           | `= 2`                                                        | at one display digit over twelve working digits: an exact case, `1.5`, on a tie, rounded by the mode |

3. **Decimal mode runs a single outer pass.**

   There is no outer retry loop: nothing you typed is computed again at
   more digits, and only a built-in call retries, inside its own step,
   as rule 2 says. An expression that would run to the ceiling in exact
   mode costs one pass here ([What costs time](#what-costs-time)).
   `approx` is the identity ([approx](#approx)), and a comparison
   always decides, since every value is exact.

4. **The last step of each value shown is rounded to the display digits.**

   When the working digits are above the display digits, the flow is
   this. The calculator rounds every intermediate step to the working
   digits. It rounds only the last step of each value it shows to the
   display digits, directly from that step's exact result. The last
   steps are:

   - the result of the expression you typed, when nothing is converted
     into;
   - the conversion's ratio;
   - a unit list's counts and remainder;
   - the count a conversion into a function recovers.

   When something is converted into, the expression you typed and what
   it is converted into are both operands, so both are rounded to the
   working digits. The **reciprocal line**, the line under a conversion
   that gives the unit you asked for as a multiple of what you typed,
   is the exception. The calculator computes it from the ratio as
   shown: it takes the reciprocal of the rounded ratio and rounds that
   to the display digits, so the working digits play no part in it.

   | You type        | Into | Exucal shows     | Note                       |
   | --------------- | ---- | ---------------- | -------------------------- |
   | `ln(exp(1/10))` |      | `= 0.099999984`  | eight display digits       |
   | `ln(exp(1/10))` |      | `= 0.1`          | over twelve working digits |
   | `1 / 3 * 3 m`   | `in` | `= 39.370078 in` | eight display digits       |
   | `1 / 3 * 3 m`   | `in` | `= 39.370079 in` | over twelve working digits |

### What decimal mode does to units and edges

Two consequences follow. A unit that carries `pi()` is rounded as it is
looked up, like any other step, so `1 turn` into `deg` is `=` with a
value a little under 360, where exact mode gives `≈ 360 deg`. And since
every argument is exact, no argument reaches across an edge:
`tan(90 deg)` may give a value in decimal mode where exact mode fails
at the pole, because the value is the tangent of the rounded degree,
not of a
right angle.

## `approx`

`approx` is the designed escape from the strictness of exact
arithmetic: it makes a value inexact on purpose, so that the arithmetic
may round it. This section says what it does and what it cannot do.

`approx(x)` is `x` known to the precision of the pass and no better.
An exact argument becomes inexact, with an error radius of one unit in
the last of the digits the pass keeps; an inexact argument is left as
it is, never narrowed. The radius is set on the magnitude as the
calculator holds it, in the primitive units
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)),
so its absolute size follows that magnitude and not the number you
typed; relative to the value it is the same either way, one part in
the digits the pass keeps. `approx` takes a quantity with a unit as well as a plain number; it
keeps the unit and makes only the magnitude inexact, so `approx(2 m)`
is `≈ 2 m`. It leaves a zero as it is, and a value that is zero within a bound
keeps its bound. In exact mode the radius it sets lies at least ten
digits beyond the display digits, whatever the settings: the first pass
computes ten digits above the display digits and each later pass more
([Digits you can trust](#digits-you-can-trust)), and raising the
display digits raises every pass with them. So an exact argument's
digits are shown as they are, and the `≈` is the point:
`approx(2.54) cm` into `in` is `≈ 1 in`. The one exception is an
argument on a tie at the display digits, whose last digit no radius
certifies ([Values at an edge](#values-at-an-edge)). In decimal mode `approx` is
the identity, since every value there is already rounded
([The two modes](#the-two-modes)).

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

`approx` says how well a value is known, not how large it is. It never
changes an exponent, and it relaxes a limit only where an inexact
operand changes the arithmetic, as the table above shows. Where the
arithmetic is the same either way, `approx` does not help. `sin` of a huge angle must first subtract a multiple of `2π` from it,
and for that it needs `π` to as many digits as the angle has before its
decimal point, which the significand limit cannot hold for
`1e999999999 radian` whether the angle is exact or not. `exp` of a huge argument is refused
at the exponent bound for every value within the error radius. A
power's exponent must be formed within the significand limit before
anything is computed, so `approx(2)^1e-30000` is refused as
`2^1e-30000` is. And the whole-number functions, `factorial` among
them, take only an exact argument.

| You type                          | Exucal shows                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `exp(approx(1e999))`              | too large to compute, as `exp(1e999)` is                    |
| `sin(approx(1e999999999) radian)` | past the significand limit, as `sin(1e999999999 radian)` is |
| `approx(2)^1e-30000`              | past the significand limit, as `2^1e-30000` is              |

`approx` would not help `exp` even if the exponent were allowed,
because of what the exponential does to an error radius. `exp(x ± r)`
is `exp(x)` times a factor between `e^-r` and `e^r`: the argument's
absolute error radius becomes the result's relative error. So `exp` of
a large argument needs that argument to many more digits than the
result shows. An exact argument has those digits already. An inexact
argument has them only after enough passes to shrink its error radius
below one, and the loop never gets there: at the first pass `exp`
finds that the result's exponent passes the bound for every value
within the argument's error radius, refuses, and the retry loop ends.

## Rounding modes and where they act

The rounding mode is one setting with three places to act. This section
says where.

The **rounding mode** ([Rounding](settings.md#rounding)) decides the
last digit kept when the calculator cuts a value to fewer digits than
it has.
Three modes round to the nearest value and differ only on a value
exactly halfway between two roundings: the default sends it to the
even digit, and the other two send it away from zero or toward zero.
Four modes round in one direction: toward zero, away from zero, up or
down.

- In exact mode it acts once, at the display, in the rounding of a
  value to the digits shown and in what those digits certify
  ([Digits you can trust](#digits-you-can-trust)).
- In decimal mode it acts at every step
  ([The two modes](#the-two-modes)).
- Inside an expression it acts in one place, `round`, which rounds to a
  whole number in the mode, or to a given number of decimal places with
  a second argument.

| You type          | Exucal shows | Note                                            |
| ----------------- | ------------ | ----------------------------------------------- |
| `round(2.5)`      | `= 2`        | under the default, to nearest with ties to even |
| `round(2.5)`      | `= 3`        | under to nearest with ties away from zero       |
| `round(2.345, 2)` | `= 2.34`     | under the default                               |
| `round(2.345, 2)` | `= 2.35`     | under to nearest with ties away from zero       |

The rounding functions' entries are in
[Built-in functions](builtins.md).

## Values too big to hold

Two limits bound a value, each on one of its parts:

- the significand limit, in bits, on the fraction it is held as;
- the exponent bound, on its power of ten.

A refusal names the one it passes. This section
says what each limit refuses, what the message says, and what to try.

A **refusal** is the one failure this page calls by that name: a
value the limits keep from being computed, or a number typed past them.
Everything else that stops a result (a mismatch, a condition that
fails, a value that cannot be told from an edge) is an error.

A value is held as a significand times a power of ten
([How a value is held](#how-a-value-is-held)). The settings bound the
significand. The significand limit says how many bits its numerator may have and
how many bits its denominator may have, each counted on its own. The precision limit, which the
significand limit bounds in turn, says how far an inexact value is
refined, and the display digits say how many of its digits must be
certified. The exponent has a fixed bound of its own, `10^18` either
way, and that bound is not a setting. `1e999` is `1 × 10^999`, well
within both. `exp(1e999)` has a significand that 32 digits hold with
ease and an exponent that is itself a number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └───────── significand ─────────┘      └─────── exponent ───────┘
             the settings' part: the significand    fixed, not a setting:
             limit, the precision limit and the     at most 10^18 either
             display digits; 32 digits fit with     way; this one has 999
             ease                                   digits, 4.3 × 10^998
```

### The significand limit

The limit is strict: no exact value past it is ever formed, because
an operation predicts the size of its result before forming it. When
a result would need a significand past the limit, the calculator
refuses that part of the expression, names it, and says how many bits
it would need, exactly or about, where the operation knows:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
```

Where the operation that refused expects the same step to fit when
computed inexactly, the message suggests what to try:

- `approx(…)` around the operand it names, so that the part is computed
  to the digits asked and shown with `≈` ([approx](#approx));
- decimal mode, which rounds every step and so never holds the exact
  value ([The two modes](#the-two-modes)).

Where the operation expects the value to pass the limit however it is computed, the message
says so and suggests nothing; whether a wider limit would help is yours
to judge. That is the case for a built-in whose value needs more bits
than the limit holds even when rounded (`factorial(20000)`, or `sin` of
an angle whose reduction passes the limit); for a number typed with more
digits than the limit; and for a power whose exponent cannot be formed
within it (`2^1e-30000`). The suggestion is the operation's expectation,
not a promise.

A refusal is never retried at more digits. A refusal that the early
passes did not meet but a later, finer pass does ends the retry loop.
If an earlier pass produced a result, and that result rests on no
undecided condition, the result is shown, with its note; otherwise the
refusal is shown, and its message says which limit was passed, so that
you can decide whether a wider limit, `approx` or decimal mode would
help. Some built-ins need their argument to more
digits than the result shows, as `sin` of a huge angle needs `π` to the
angle's own length; they are refused at the significand limit when the
argument is too large, exact or inexact, so `approx` does not help
them. The whole-number functions' refusals, `factorial`'s among them,
never offer `approx` or decimal mode and apply in both modes.
`round(x, places)` and `mod` are refused when their results would pass
the limit. A number you type with more digits than the significand
limit can ever be set to hold is refused as you type it, whatever the
limit is set to. The limit makes `3^1000000000` a refusal rather than
a hang; the setting is in
[Significand limit](settings.md#significand-limit).

### The exponent bound

A result whose exponent would pass `10^18` is too large to compute, and
one whose exponent would fall below `-10^18` is too small, whether the
value is exact or inexact:

```
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
```

The bound is on the value's magnitude, the power of ten of its leading
digit, and not on the exponent of its canonical form, which can differ
from that by the length of the significand:
`1e1000000000000000000 / 3 * 10` is a value, its magnitude
`3.3e1000000000000000000` within the bound, though its canonical
exponent is one past it. The bound is on the value so that a refusal at
it is never false about the value
([The exponent bound](../devdocs/numbers.md#the-exponent-bound) gives
the reasons). Zero is within the bound at any exponent, so a value that
is zero within a bound is never refused at the bound, however small the
bound. A number typed past the bound is refused as
it is typed. So is a number within the bound whose rounding to the
display digits would carry past it, so that every line written pastes
back ([How numbers are written](#how-numbers-are-written)).

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
`cosh` and powers share the bound; `sinh` and `cosh` of a large negative
argument are too large rather than too small.

| You type                     | Exucal shows                      |
| ---------------------------- | --------------------------------- |
| `exp(2.3e18)`                | `≈ 3.9591004e+998877308377479203` |
| `exp(2.31e18)`               | too large to compute              |
| `exp(-1e999)`                | too small to compute              |
| `pow(10, 1e999)`, `10^1e999` | too large to compute              |

A product, quotient or power that no setting could hold is reported
at the bound even where the significand limit would refuse it first.
`7^1e19`, a whole number of about `8.5 × 10^18` digits, is too large
to compute, where `2.54^1e18`, a hair within the bound, is past the
significand limit. A sum never faces that choice. A sum that aligns
and passes the bound is too large or too small to compute; one that
cannot be aligned is refused at the significand limit or, with an
inexact operand, takes the value of its larger operand, which is
within the bound. A refusal at the bound needs every value within the
error radius to lie past it. An argument whose value may lie on either
side of the bound is retried at more digits, and at the ceiling it
cannot be told from the point where the result passes the bound
([Values at an edge](#values-at-an-edge)).

The bound is not a setting, and a higher one is ruled out. Parts of
`Ball` are exact only because the exponent is at most `10^18`, and the
cost of an exponential grows fast with its argument once the bound is
raised. The reasons, and the passes an inexact argument costs `exp` near
the bound, are in
[Why the exponent bound stays at 10^18](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018).

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

The digits display writes a result as digits: the significant digits
the value certifies, up to the display digits, rounded in the rounding
mode, with trailing zeros dropped. It uses exponent form, `1e+21` or
`1e-5`, when the value is below `1e-4` or needs more digits before the
decimal point than the display digits allow. It never writes the power
of ten out, so any magnitude renders. It writes a value that is zero
within a bound as `0`, with its note
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
- otherwise, where that fits, as a fraction times a power of ten,
  `1/3 × 1e+30`, which are the value's canonical parts
  ([How a value is held](#how-a-value-is-held));
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
the reciprocal line `in = 1/36 × 3 ft` of `3 ft = 36 in`. The parentheses matter: two
factors written side by side, a **juxtaposition**, bind tighter than
`/`, so `1/2 in` is `1/(2 in)`, a quantity per inch, unlike `(1/2) in`
and `0.5 in` ([Pitfalls](expressions.md#pitfalls)).

### Pasting a result back

Every result pastes back as input. The copy button produces its text
from the value as held, not from the text on the screen, and writes
`*` where the screen shows `×`
([What the app writes back](expressions.md#what-the-app-writes-back)).
One rounding could write a number past the exponent bound: a value
within the bound whose rounding to the display digits carries past it.
That rounding is refused instead
([Values too big to hold](#values-too-big-to-hold)).

### One value, one line

An output line is a function of the value, of whether it is exact,
and of the settings, and of nothing else. The route a computation took
leaves no trace: two expressions that reach the same value are written
the same way.

| You type                        | Digits notation   | Ratio notation  |
| ------------------------------- | ----------------- | --------------- |
| `2.54`, `254/100`, `2.5 + 0.04` | `= 2.54`          | `= 127/50`      |
| `1e30/3`, `(1/3)*1e30`          | `≈ 3.3333333e+29` | `= 1/3 × 1e+30` |

The route can change the value itself, in decimal mode, where every
step is rounded ([The two modes](#the-two-modes)), and it can change
whether the value is exact, where a step was inexact
([Digits you can trust](#digits-you-can-trust)). A given value, exact
or not, is still written one way.

## What costs time

Two things cost time, passes and bits. This section says where each
is spent.

An expression whose digits certify at the first pass costs one pass.
One whose digits never certify (an identity through an inexact step,
or a value at an edge) runs every pass up to the ceiling on every
keystroke, so the precision limit is a cost setting
([Digits you can trust](#digits-you-can-trust)). Decimal
mode runs one pass whatever happens ([The two modes](#the-two-modes)).

Bits cost too. The cost of an exponential grows fast with its argument,
and so does the cost of the functions built on it, which is one reason
the exponent bound stays where it is
([Values too big to hold](#values-too-big-to-hold)). An exact power or product costs the
bits of its result, so a definition that reads small can be large: a few
characters of exponent can stand for a number of thousands of digits
([How a value is held](#how-a-value-is-held)).

A function written by hand is slower than the built-in. A defined
function costs what its body typed out in its place would cost: a body
that calls a function twice computes it twice, at every pass
([Identities and cancellation](#identities-and-cancellation)). Some
built-ins pay a cost once, the first time they are called at a new
precision, for a constant or a table they then keep; some are
expensive at any precision; their entries say which
([Built-in functions](builtins.md)).

## Real values only

Exucal computes with real values only: every value is a real number
held within an error radius, and a function asked for a value outside
its real domain, `sqrt(-1)` or `asin(2)`, is an error.
