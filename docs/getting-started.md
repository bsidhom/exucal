# Getting started

Exucal is a calculator built to be exact wherever it can be and
explicit wherever it cannot. A result that can be exact is the exact
value. One that cannot is shown to the digits the calculator has
checked, with a note wherever it could not check every digit asked
for. The tour below has eight stops and a map of where to go next.
Each stop is something to type, what the calculator answers and, in a
sentence or two, what the answer means, with a link to the page that
explains it in full. Its table gives what you type in each field and
the result as the calculator shows it, from its `=` or `≈` on. Every
example was run at the default settings, which show eight digits.

- [Your first calculation](#your-first-calculation): the two fields,
  an exact product, and two inexact functions.
- [Reading `=`, `≈` and a note](#reading---and-a-note): what the sign
  before a result says, and what a note says.
- [Your first conversion](#your-first-conversion): feet into inches,
  the line under it, and the copy button.
- [Lists of units](#lists-of-units): a meter in feet and inches, and
  seconds as hours, minutes and seconds.
- [Functions and readings](#functions-and-readings): a sine, a Celsius
  reading, and a kelvin temperature read in Fahrenheit.
- [Approximating a value](#approximating-a-value): `approx`, and what
  making a value inexact buys.
- [Changing a setting](#changing-a-setting): the same conversion under
  more digits, the ratio notation and decimal mode.
- [When something fails](#when-something-fails): a mismatch, a value
  too big to hold, and a division by a value that cannot be told from
  zero.
- [Where to go next](#where-to-go-next): the reference pages, by what
  each answers.

## Your first calculation

The calculator has two fields, labeled "You have" and "You want". The
expression you type goes in the first field, the **have**. The second
field, the **want**, takes what to measure the result in, and it may
be left blank ([The two fields](app.md#the-two-fields)). Type
`2 kg * 3 m/s^2` in the have and leave the want blank. The answer
appears as you type, as an output line: your expression as the
calculator writes it, then the sign `=`, then the result, so the
screen reads `2 kg × 3 m / s^2 = 6 m kg / s^2`. The unit of the result
is written in the units every other unit is defined from, here the
meter, the kilogram and the second. The definitions file is the file
that defines every unit the calculator knows. The units come in the
order the file declares them, which is why the meter comes before the
kilogram
([How dimensions are written in messages](quantities.md#how-dimensions-are-written-in-messages)).

The product is exact: an exact value is one the calculator holds as a
fraction, as it holds `6`. `exp(1)` and `sqrt(2)` call two of the
built-in functions ([Built-in functions](builtins.md)), and neither
value is a fraction, so neither is exact. The calculator computes
digits of each and shows eight, behind `≈`
([Exact and inexact values](numbers.md#exact-and-inexact-values)).

| You have         | You want | Exucal shows     |
| ---------------- | -------- | ---------------- |
| `2 kg * 3 m/s^2` |          | `= 6 m kg / s^2` |
| `exp(1)`         |          | `≈ 2.7182818`    |
| `sqrt(2)`        |          | `≈ 1.4142136`    |

## Reading `=`, `≈` and a note

`1/3` is exact: the calculator holds one third as a fraction, not as a
string of threes. It still shows `≈ 0.33333333`, because eight digits
leave the rest of the value out. So `=` says that the value is exact
and shown entire, and `≈` says that digits were left out or that a step
of the computation was inexact
([Exact and inexact values](numbers.md#exact-and-inexact-values)).

The calculator shows only digits it has **certified**, checked to be
right. The digits asked for are the display digits, a setting. When
the first computation certifies fewer of them, the calculator computes
again at more digits. When that is not enough, a note in parentheses
says how far to trust the result: how many of its digits are
certified, or that it is zero within a bound the note gives.
`sqrt(2)^2 * 1.000000025` shows `≈ 2`, which is `2.0000000` with its
zeros dropped, and the note "7 of 8 digits are certified". The value
is `2.00000005` on paper, exactly halfway between `2.0000000` and
`2.0000001`. The root makes it inexact, known only within a bound, and
that bound reaches across the halfway point however small it gets, so
no amount of computing settles the eighth digit. `sqrt(2)^2 - 2` is
zero on paper, but the root was computed to a finite number of digits,
so the difference is zero only within a tiny bound, which the note
gives. How small that bound gets depends on the precision limit, a
setting ([Digits you can trust](numbers.md#digits-you-can-trust)).

| You have                  | You want | Exucal shows                        |
| ------------------------- | -------- | ----------------------------------- |
| `1/3`                     |          | `≈ 0.33333333`                      |
| `sqrt(2)^2 * 1.000000025` |          | `≈ 2 (7 of 8 digits are certified)` |
| `sqrt(2)^2 - 2`           |          | `≈ 0 (within 4e-4049 of zero)`      |

## Your first conversion

Type `3 ft` in the have and `in` in the want. The answer is
`= 36 in`, exact, since an inch is defined as a fixed number of
centimeters and a foot as twelve inches. Under it stands the
reciprocal line, the conversion in the opposite direction, which
gives one inch as a multiple of what you typed:
`in ≈ 0.027777778 × 3 ft`. A conversion into one unit always answers
with the two lines
([How a conversion is answered](quantities.md#how-a-conversion-is-answered)).
A button at the end of each line copies its result as text that pastes
back into the have, `36 in` or `0.027777778 * 3 ft`
([Copying a result](app.md#copying-a-result)).

| You have | You want | Exucal shows | The reciprocal line       |
| -------- | -------- | ------------ | ------------------------- |
| `3 ft`   | `in`     | `= 36 in`    | `in ≈ 0.027777778 × 3 ft` |

## Lists of units

A want of several units separated by `;` answers with a sum: a whole
number of each unit but the last, and the rest in the last. `1 m` into
`ft;in` is `≈ 3 ft + 3.3700787 in`. The units must run from the
largest to the smallest, since each unit after the first counts what
is left over from the one before it, so `in;ft` is an error to ask
for. The definitions file also defines some lists under a name, and
the name alone as the want means the list: `3661 s` into `time` is
`= 1 hr + 1 min + 1 s`, exact and shown entire. A list has no
reciprocal line ([Unit lists](quantities.md#unit-lists)).
[Unit lists defined in the file](units.md#unit-lists-defined-in-the-file)
names the defined ones.

| You have | You want | Exucal shows                                    |
| -------- | -------- | ----------------------------------------------- |
| `1 m`    | `ft;in`  | `≈ 3 ft + 3.3700787 in`                         |
| `3661 s` | `time`   | `= 1 hr + 1 min + 1 s`                          |
| `1 m`    | `in;ft`  | an error: the units do not run from the largest |

## Functions and readings

`sin(30 deg)` is `≈ 0.5` and not `= 0.5`. The sine takes an angle, and
the degree is defined through `pi()`, an inexact value, so the argument
is inexact before the sine is taken
([Trigonometric](builtins.md#trigonometric)).

A temperature reading is a function, not a unit. A unit is a factor
that a quantity is a multiple of, and zero degrees Celsius is not zero
kelvin, so no factor turns the one into the other. `tempC(20)` is the
temperature that twenty degrees Celsius denotes, `= 293.15 K`. The
function has an inverse, so its name can be the want, and the
calculator then recovers the argument that gives the have: `300 K` into
`tempF` is `= tempF(80.33)`, a reading on the Fahrenheit scale. The
functions are in
[Temperature: differences and readings](units.md#temperature-differences-and-readings),
and the conversion is in
[Conversion into a function](quantities.md#conversion-into-a-function).

| You have      | You want | Exucal shows     |
| ------------- | -------- | ---------------- |
| `sin(30 deg)` |          | `≈ 0.5`          |
| `tempC(20)`   |          | `= 293.15 K`     |
| `300 K`       | `tempF`  | `= tempF(80.33)` |

## Approximating a value

`approx` is the one operation whose purpose is to make a value
inexact. `2.54 cm` into `in` is `= 1 in`, exact. `approx(2.54) cm` into
`in` is `≈ 1 in`, the same digits behind `≈`, since the value is now
known only within a bound ([approx](numbers.md#approx)).

Making a value inexact buys something: the exact arithmetic never
rounds, so a value too big to hold exactly is refused even when a few
digits of it would do. `3^1000000000` is a whole number of hundreds of
millions of digits, past the significand limit, the setting that
bounds how big an exact value may be. The calculator refuses it,
answering with a message that names the limit rather than with the
number ([Values too big to hold](numbers.md#values-too-big-to-hold)).
The message suggests `approx(3)` in place of `3`. With the base
inexact, the calculator computes `approx(3)^1000000000` to the digits
asked, within a bound, instead of forming the whole number, and shows
`≈ 5.243997e+477121254`. The eighth digit is a zero, which is dropped.

| You have               | You want | Exucal shows                          |
| ---------------------- | -------- | ------------------------------------- |
| `2.54 cm`              | `in`     | `= 1 in`                              |
| `approx(2.54) cm`      | `in`     | `≈ 1 in`                              |
| `3^1000000000`         |          | a refusal: past the significand limit |
| `approx(3)^1000000000` |          | `≈ 5.243997e+477121254`               |

## Changing a setting

The cog in the top right corner opens the settings panel
([The settings panel](app.md#the-settings-panel)), and
[Settings](settings.md) describes every setting. Three changes show
what the settings do to one conversion, `1 m` into `in`, which at the
defaults is `≈ 39.370079 in`:

- Raising the display digits from eight to twelve shows more of the
  same exact value, `≈ 39.3700787402 in`.
- Choosing the ratio notation writes an exact value as a fraction when
  the fraction is short enough, `= (5000/127) in`, with `=`, since the
  fraction is the whole value.
- Switching from exact mode, the default, to decimal mode rounds every
  step to the digits shown, as a hand calculator does. The rounded
  value is held as exact, so every answer in decimal mode is `=`, here
  `= 39.370079 in`. The rounding shows in `1/3 * 3`, which is `= 1` in
  exact mode and `= 0.99999999` in decimal mode.

| You have  | You want | Exucal shows         | Setting               |
| --------- | -------- | -------------------- | --------------------- |
| `1 m`     | `in`     | `≈ 39.370079 in`     | the defaults          |
| `1 m`     | `in`     | `≈ 39.3700787402 in` | twelve display digits |
| `1 m`     | `in`     | `= (5000/127) in`    | the ratio notation    |
| `1 m`     | `in`     | `= 39.370079 in`     | decimal mode          |
| `1/3 * 3` |          | `= 1`                | the defaults          |
| `1/3 * 3` |          | `= 0.99999999`       | decimal mode          |

## When something fails

A failure is a message in place of a result: a refusal when a size
limit stops the result, as the stop before showed, and an error
otherwise. Three shapes are common, and these are examples of them,
not an inventory.

- A mismatch is an error. `1 m + 1 s` cannot be added, since a length
  and a time do not conform, that is, they measure different things,
  and the message says so:
  `Cannot add "1 m" and "1 s": "1 m" has dimension m, but "1 s" has dimension s.`
  ([Conformance](quantities.md#conformance)).
- A value too big to hold is a refusal. `1e999999999 + 1` would need a
  billion digits as an exact value, and the message names the limit,
  the bits the value would need, and what to try:
  `"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.`
  ([Values too big to hold](numbers.md#values-too-big-to-hold)).
- A division by a value that cannot be told from zero is an error.
  `1 / (sqrt(2)^2 - 2)` divides by a value that is zero within a bound,
  and the calculator does not guess which side of zero it lies on,
  however many digits it computes. The message says that the divisor
  "cannot be told from zero" at this precision, and that the result
  depends on which side of zero it lies
  ([Values at an edge](numbers.md#values-at-an-edge)).

| You have              | You want | The failure                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `1 m + 1 s`           |          | an error: a dimension mismatch                 |
| `1e999999999 + 1`     |          | a refusal: past the significand limit          |
| `1 / (sqrt(2)^2 - 2)` |          | an error: the divisor cannot be told from zero |

## Where to go next

The reference pages, by what each answers:

- [Numbers](numbers.md): what a result means, digit by digit, and why
  a value is refused.
- [Quantities](quantities.md): what a unit, a dimension and a kind are,
  and what a conversion gives.
- [The expression language](expressions.md): what you may type.
- [The definition language](definitions.md) and [Units](units.md): what
  the definitions file defines, and how.
- [Settings](settings.md): what each setting does.
- [Built-in functions](builtins.md): each function, and where it is
  exact.

For installing the app, using it offline and updating it, see
[The app](app.md).
