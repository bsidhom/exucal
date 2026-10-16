# Quantities

Everything you type into Exucal, and every result it shows, is a
quantity. A **quantity** is a **magnitude** paired with a
**dimension**. The magnitude is a value as [Numbers](numbers.md)
describes one, exact or inexact; the dimension is the thing the
quantity measures: a length, a speed, an energy. Some quantities also
carry a **kind**, a marker that keeps apart quantities which would
otherwise look alike; the radian, which marks an angle, is one such
marker. A quantity carries its dimension and its kind through every
operation and every conversion.

This awareness of units and kinds, in calculation and in conversion,
is the third of Exucal's goals. It stands beside the two goals that
shaped the numeric model, which [Numbers](numbers.md) describes:
exactness, and the functions a calculator is used for. Unit awareness
promises three things: a result's dimension is right, and the result
is written in the unit you ask for; a conversion is exact wherever the
definitions are exact; and a mismatch of dimension or kind, in a sum,
a conversion or a call, is an error and never a number. To predict
what a conversion answers, to read a mismatch when one is reported, and
to know when a conversion is exact, you need the semantics of a
quantity: how a dimension is formed and compared, what a conversion
computes, and how its answer is written. This page gives them. It
builds on [Numbers](numbers.md), whose sections it links rather than
restates, and it sends you to four later pages, on the expression
language, the definition language, the units and the built-in
functions, for what each of them owns.

The names the calculator knows come from a **definitions file**, a
text file in the definition language that the app loads as it starts
([The definition language](definitions.md) describes the format, and
[The units the app knows](units.md) lists the contents). A **unit** is
a name the file gives to a quantity, the metre or the inch, so that a
magnitude can be written in it; the file also defines prefixes, unit
lists and functions, and it declares the primitives and the kinds. The
app loads the predefined definitions file, the one that ships with it,
and this page describes the calculator with that file loaded.

Examples on this page give what you type, what you convert it into,
and what Exucal shows: the result side of an output line, with the
relation, `=` or `≈`, in front of the value; where a conversion's
second line matters, the page quotes it whole. The quantity you type
is the **have**; the unit, list or function you convert it into is the
**want**. The want may be left blank; a blank want asks for the have
in the primitives, the base quantities the next section defines. The
typed forms paste straight into the two fields, except the examples
that use `bmi`, a function the predefined file does not define and the
page supposes for its examples. A setting or a mode an example depends
on stands in its note. Where the calculator reports
an error, the table says so and describes the message in a few words;
the last section quotes messages as the calculator writes them.

This page explains the following rules:

- **A quantity is a magnitude with a dimension.** The dimension is a
  list of rational exponents over the primitives, exact in both modes,
  and `^` takes its exponent from the text as a number, so that no
  exponent is ever computed ([A quantity](#a-quantity)).
- **The primitives and the kinds come from the definitions file.** The
  predefined file declares one kind, the radian, and a kind keeps apart
  quantities that one dimension cannot
  ([Primitives, dimensions and kinds](#primitives-dimensions-and-kinds)).
- **Two quantities conform when their dimensions agree and then their kinds agree.**
  One check decides a sum, a conversion, a call's argument and a list's
  units, and a failure is a dimension mismatch or a kind mismatch
  ([Conformance](#conformance)).
- **A quantity carries no unit of its own.** Its magnitude is held in
  the primitives, so `100 lb` and `45.359237 kg` are one quantity; the
  unit a function declares for a parameter changes no value, and a
  function that takes a plain number fails for any other quantity
  ([No unit of its own](#no-unit-of-its-own)).
- **Every factor is read exactly as written.** A unit is defined as a
  factor times other units, the factor is read as a number you type is,
  and so a conversion is exact unless a unit calls `pi()`
  ([Units, prefixes and exactness of factors](#units-prefixes-and-exactness-of-factors)).
- **A conversion into one unit answers the ratio of the two magnitudes.**
  The want may carry a magnitude; a blank want answers in the
  primitives; a second line answers the other way round; every line
  pastes back
  ([How a conversion is answered](#how-a-conversion-is-answered)).
- **A unit list answers a sum, largest unit first**: a whole number of
  each unit but the last, and the remainder in the last
  ([Unit lists](#unit-lists)).
- **A function as the want recovers the function's argument** through
  its inverse, and the answer is written as the call
  ([Conversion into a function](#conversion-into-a-function)).
- **A temperature reading and a logarithmic level are functions, not units**:
  a reading, a number on a scale, and a level are multiples of nothing
  ([Temperature and logarithmic levels as functions](#temperature-and-logarithmic-levels-as-functions)).
- **A dimension in a message is written in the expression language**,
  so that it pastes back
  ([How dimensions are written in messages](#how-dimensions-are-written-in-messages)).

## A quantity

This section says what a quantity is made of, why its dimension is
exact, and what the operators do to a dimension.

The magnitude of a quantity is a value as
[Exact and inexact values](numbers.md#exact-and-inexact-values)
describes one. The rest of the quantity is one list of exponents, with
an entry for each of the **primitives**, which the definitions file
declares in two roles ([The primitives](units.md#the-primitives) lists
them). A **dimension primitive** is a base quantity, such as the metre,
the kilogram or the second, and the entries for the dimension
primitives are the quantity's dimension: `6 m kg / s^2` has the
exponent one for the metre, one for the kilogram and minus two for the
second, and a primitive that does not occur has the exponent zero. A
**kind primitive** is a marker of a kind, with no dimension of its own,
and its entry is the quantity's kind; the radian is one.

The exponents are rational numbers, by design, so that a dimension
stays exact: `m^(1/2)` is a dimension, `(m^2)^(1/2)` is `m` again, and
no dimension is ever rounded, in exact mode or in decimal mode, which
rounds magnitudes alone ([The two modes](numbers.md#the-two-modes)).
To keep them rational, `^` takes its exponent from the text, as a
number: a whole number or a decimal, with a sign if needed, or a ratio
of two whole numbers in parentheses, so `2`, `0.5`, `-1` and `(1/2)`.
The exponent is never computed, so no dimension ever depends on a
computed value. An exponent written as an expression, `sqrt(2)` or
`1+1`, is not read at all: `m^sqrt(2)` and `2^(1+1)` are errors as they
are typed, which the grammar reports before anything is computed
([Operators](expressions.md#operators)). The rule holds for a number
without a dimension too, since `^` is one operator; `pow(2, sqrt(2))`
raises such a number to a computed power.

The operators act on dimensions as on paper:

- a juxtaposition, two factors written side by side, multiplies the
  dimensions, and so does `*`: the exponents are added;
- `/` divides them: the exponents are subtracted;
- `^` multiplies every exponent of the dimension by the power it
  raises to;
- `+` and `-` require their two operands to conform
  ([Conformance](#conformance)) and keep the shared dimension;
- a negation, a `-` before a product, touches the magnitude alone.

Only the magnitude can fail in arithmetic: at a divisor at zero, at a
root of a negative, or at a size limit
([Values too big to hold](numbers.md#values-too-big-to-hold)). The
arithmetic on a dimension never fails; a mismatch, which
[Conformance](#conformance) covers, is a failure to combine two
quantities at all, not a failure of arithmetic.

| You type         | Exucal shows     | Note                                 |
| ---------------- | ---------------- | ------------------------------------ |
| `2 kg * 3 m/s^2` | `= 6 m kg / s^2` | the exponents added                  |
| `6 m / 2 s`      | `= 3 m / s`      | the exponents subtracted             |
| `(2 m)^2`        | `= 4 m^2`        | the exponent doubled                 |
| `(1 m^2)^(1/2)`  | `= 1 m`          | the exponent halved, exactly         |
| `1 m^(1/2)`      | `= 1 m^(1/2)`    | a dimension with a rational exponent |
| `1 m + 2 ft`     | `= 1.6096 m`     | the shared dimension kept            |
| `-3 m`           | `= -3 m`         | the magnitude negated                |

## Primitives, dimensions and kinds

This section says where the primitives come from, what a kind is and
what it does, and how the one kind the definitions file declares, the
radian, behaves.

The definitions file declares the primitives, in the two roles the
last section named ([The primitives](units.md#the-primitives)): the
dimension primitives, `m`, `kg`, `s` and the rest, and the kind
primitives. The predefined file declares one kind primitive, the
radian, `radian`; the file decides which kinds exist, and the
calculator only keeps them apart. This page calls a quantity of the
radian kind an **angle**.

A quantity with neither dimension nor kind is **dimensionless**, or a
**plain number**; the two words are synonyms, and this page says plain
number, the words the messages use. A quantity with a kind and no
dimension is not a plain number: `asin(0.5)` is an angle.

A kind exists because a dimension alone cannot tell some quantities
apart. An angle and a plain number have the same dimension, none, and
so do a radian per second and a hertz. Without the radian kind, a value
could pass for either. The kind keeps them apart: `rad/s` does not
convert into `Hz`, a kind mismatch, while `rpm` converts into `rad/s`,
both being angles per time. Where the file declares no kind, two
quantities of one dimension are one quantity: a joule is a newton metre
here, since no kind keeps torque from energy.

There is no special case for zero. `0` is a plain number as much as
`1` is, and a mismatch is decided by the dimensions and kinds alone,
never by a value, so `1 m + 0` is a dimension mismatch and `sin(0)` is
a kind mismatch, exactly as `1 m + 1` and `sin(1)` are.

The **built-in** functions are those the calculator provides; the
**defined functions** are those the definitions file defines. You meet
the angle in the built-ins. The trigonometric functions take an angle,
and the inverse trigonometric functions return one; the hyperbolic
functions take a plain number; each entry of
[Built-in functions](builtins.md#rules-every-built-in-follows) says
what its function takes. `sin(30 deg)` is `≈ 0.5` and not `= 0.5`:
`deg` is defined through `pi()`, so the argument is inexact before the
sine is taken
([Exact and inexact values](numbers.md#exact-and-inexact-values)).
`asin(0.5)` lies outside the exact cases of `asin`, so it is inexact,
and it is an angle whatever unit it is shown in: into `turn` it is
`≈ 0.083333333 turn`, the same angle counted in turns, and only
`asin(0.5) / radian` is the plain number. The table gives the rest.

| You type             | Into    | Exucal shows                                               | Note                                                          |
| -------------------- | ------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `sin(30 deg)`        |         | `≈ 0.5`                                                    | an angle in; `≈` since `deg` is inexact                       |
| `sin(0 radian)`      |         | `= 0`                                                      | an exact case                                                 |
| `sin(1)`             |         | an error, a kind mismatch, saying to write `sin(1 radian)` |                                                               |
| `asin(0.5)`          | `deg`   | `≈ 30 deg`                                                 | an angle out                                                  |
| `asin(0.5)`          | `turn`  | `≈ 0.083333333 turn`                                       | an angle still                                                |
| `asin(0.5) / radian` |         | `≈ 0.52359878`                                             | the plain number                                              |
| `2 asin(0.5) + 1`    |         | an error, a kind mismatch                                  |                                                               |
| `1 rad/s`            | `Hz`    | an error, a kind mismatch: the radian                      |                                                               |
| `1 rpm`              | `rad/s` | `≈ 0.10471976 rad / s`                                     | angles per time on both sides                                 |
| `1 J`                | `N m`   | `= 1 N m`                                                  | no kind keeps torque from energy                              |
| `1 m + 0`            |         | an error, a dimension mismatch                             | zero is a plain number; a message writes its dimension as `1` |

## Conformance

This section says when two quantities conform, where the check is
made, and how a failure is named.

Two quantities **conform** when they measure the same thing. The check
has two steps, in a fixed order. First the dimensions must agree: the
exponent of every dimension primitive must be the same on both sides.
Then the kinds must agree: the entry for every kind primitive must be
the same too. A failure at the first step is a
**dimension mismatch**, and a failure at the second is a
**kind mismatch**, whose message names the kind that differs. Either
is an error: nothing is converted by guess, and no unit is assumed.
[GNU units](https://www.gnu.org/software/units/) calls two such
quantities conformable.

One check decides, at every call, where a quantity meets another:

- the have against the want, in a conversion;
- the two operands of `+`, and the two operands of `-`;
- the two arguments of a built-in that takes two conforming
  quantities, `div`, `mod` or `atan2`;
- a call's argument against its parameter's **annotation**, the unit
  a defined function declares for the parameter; a parameter with no
  annotation takes a plain number
  ([Functions](definitions.md#functions));
- the have against the function's result, in a conversion into a
  function ([Conversion into a function](#conversion-into-a-function));
- each unit of a unit list against the have ([Unit lists](#unit-lists)).

The annotation check shows best on a function that computes with the
number of some unit in its arguments: a body-mass index is computed
from how many kilograms a weight holds and how many metres a height
holds. Suppose the definitions file held one
([Functions](definitions.md#functions) says how a function is
written):

```
bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
```

The annotations say that `weight` takes a mass and `height` a length,
and the `: 1` after the parentheses says that the result is a plain
number. Each argument is checked against its annotation:
`bmi(100, 4 ft)` is a dimension mismatch, since `100` is a plain number
where a mass is needed, and `bmi(100 lb, 4 s)` is a dimension mismatch
too, since `4 s` is a time where a length is needed. The predefined
file does not define `bmi`, and the app loads no other file, the
predefined one being built into it; the examples that use `bmi` are the
ones that do not paste back.

A defined function may also carry a condition, a comparison its
argument must satisfy. `tempC`, which gives the temperature that a
Celsius reading, a number on the Celsius scale, denotes, requires
`x >= -273.15` of its argument `x`. The terms of a condition must
conform to each other; their conformance is checked once, when the
definitions file loads, and never at the call
([When the file does not load](definitions.md#when-the-file-does-not-load)).
Whether an argument satisfies the condition is a question for the
call, not for conformance.

The check comes before anything else. `1 m` into `0 s` is a dimension
mismatch, and the zero is never looked at.

| You type           | Into    | Exucal shows                                                                         | Note                                                                                             |
| ------------------ | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `1 m`              | `s`     | an error, a dimension mismatch: `m` against `s`                                      | the have against the want                                                                        |
| `1 m`              | `0 s`   | an error, the same dimension mismatch                                                | checked before the zero                                                                          |
| `1 m + 1 s`        |         | an error, a dimension mismatch: `m` against `s`                                      | the operands of `+`                                                                              |
| `1 rad/s`          | `Hz`    | an error, a kind mismatch: the radian                                                | the have against the want                                                                        |
| `tempC(20 m)`      |         | an error, a dimension mismatch: `m` against `1`, the parameter taking a plain number | a call's argument                                                                                |
| `bmi(100, 4 ft)`   |         | an error, a dimension mismatch: `1` against `kg`, named for the parameter `weight`   | a call's argument, with `bmi` as above                                                           |
| `bmi(100 lb, 4 s)` |         | an error, a dimension mismatch: `s` against `m`, named for the parameter `height`    | a call's argument, with `bmi` as above                                                           |
| `300 m`            | `tempF` | an error, a dimension mismatch: `m` against `K`                                      | the have against the result of `tempF`, which gives the temperature a Fahrenheit reading denotes |
| `1 m`              | `ft;s`  | an error, a dimension mismatch: `m` against `s`                                      | a list's unit                                                                                    |

## No unit of its own

This section says what follows from a quantity being held in the
primitives rather than in the unit you typed.

A quantity carries no unit of its own. Its magnitude is held in the
primitives, so `100 lb` and `45.359237 kg` are one quantity, and
nothing remembers which was typed: with a blank want, either shows as
`= 45.359237 kg`. The units you type in the have are multiplied in as
the expression is read, each standing for its value in the primitives,
and the unit in the want is applied at the end, to write the answer.
Three things follow.

- An annotation on a defined function's parameter checks conformance
  and changes no value: the argument is held in the primitives whatever
  unit the annotation names ([Functions](definitions.md#functions)).
  With `bmi` as supposed above, `bmi(100 lb, 4 ft)` and
  `bmi(45.359237 kg, 1.2192 m)` are one call, and both give
  `≈ 30.515173`. The body wants the number of kilograms in the weight
  and the number of metres in the height. It gets each by dividing the
  argument by the unit in question, `weight / kg` for the kilograms and
  `height / m` for the metres, since the argument remembers no unit.
- A call of a function that takes a plain number fails for any other
  quantity, with a dimension or a kind, whatever unit it was typed in.
  `floor`, `ceil`, `trunc` and `round` are such functions, and so are
  the functions that take only whole numbers, `factorial` among them.
  `floor(3.7 ft)` is an error: the value is held in metres, and the
  whole number of feet in it is not the whole number of metres, so there
  is no floor of a length. Divide the unit out, take the floor, and
  multiply the unit back: `floor(3.7 ft / ft) ft` is `= 3 ft`.
- A function that takes a quantity with a dimension works on the
  magnitude and says what becomes of the dimension. `abs` keeps it,
  `sign` gives a plain number, and `approx`, the one operation whose
  purpose is to make a value inexact, keeps the dimension and makes the
  magnitude inexact ([approx](numbers.md#approx)). `div`, `mod` and
  `atan2` take two quantities that conform: `div` gives a plain number,
  `mod` keeps the dimension, and `atan2` gives an angle. These are
  examples; the entry of each function says what it takes and gives
  ([Built-in functions](builtins.md#rules-every-built-in-follows)).

| You type                      | Into  | Exucal shows                                             | Note                                                    |
| ----------------------------- | ----- | -------------------------------------------------------- | ------------------------------------------------------- |
| `100 lb`                      |       | `= 45.359237 kg`                                         | held in the primitives                                  |
| `45.359237 kg`                | `lb`  | `= 100 lb`                                               | the same quantity                                       |
| `bmi(100 lb, 4 ft)`           |       | `≈ 30.515173`                                            | with `bmi` as above; exact, with more digits than shown |
| `bmi(45.359237 kg, 1.2192 m)` |       | `≈ 30.515173`                                            | the same call                                           |
| `floor(3.7 ft)`               |       | an error: the argument of `floor` must be a plain number |                                                         |
| `floor(3.7 ft / ft) ft`       | `ft`  | `= 3 ft`                                                 | the unit divided out and back                           |
| `abs(-3 m)`                   |       | `= 3 m`                                                  | the dimension kept                                      |
| `sign(-3 m)`                  |       | `= -1`                                                   | a plain number                                          |
| `approx(2 m)`                 |       | `≈ 2 m`                                                  | the magnitude made inexact on purpose                   |
| `div(7 ft, 2 ft)`             |       | `= 3`                                                    | a plain number                                          |
| `mod(7 ft, 2 ft)`             | `ft`  | `= 1 ft`                                                 | the dimension kept                                      |
| `mod(-30 deg, 360 deg)`       | `deg` | `≈ 330 deg`                                              | angles are quantities too                               |
| `atan2(3 m, 4 m)`             | `deg` | `≈ 36.869898 deg`                                        | an angle from two lengths                               |

## Units, prefixes and exactness of factors

This section says how a unit is defined, how its name is read, and
when a conversion between units is exact.

A unit is defined as a **factor**, an expression that is usually a
number, times other units, down to the primitives
([Units](definitions.md#units) says how a definition is written). A
name you type is read as the unit of that name if there is one, and
otherwise as a prefix followed by a unit, so that `km` is a thousand
metres while `min` is a minute and never a thousandth of an inch.
[Names](expressions.md#names) says how a name is read in full, as a
unit, as a prefix and a unit, as a parameter or as a function.

Every factor in the definitions file is read exactly as written, as a
number you type is
([Exact and inexact values](numbers.md#exact-and-inexact-values)), so
a conversion is exact unless a unit on either side calls `pi()`. Exact
here is the sense of [Numbers](numbers.md): the value is exact,
whatever the relation shown, which is `≈` where digits were left out,
as `1 m` into `in` shows. Most factors are **defined** factors, fixed
by the unit's defining document: an inch is fixed at `2.54 cm` and a
pound at `0.45359237 kg`, so `1 in` into `cm` is `= 2.54 cm`, exact
and entire. A few are **measured** factors, carried to the digits
their source gives and read as exactly as any other. The distinction
matters for what a result means, not for how it is computed: a
conversion through a measured factor is exact in the arithmetic and as
true as the measurement behind the digits.
[Which factors are exact](units.md#which-factors-are-exact) names the
measured ones.

`deg`, `grad`, `turn`, `parsec` and `oersted` are defined through
`pi()`, whose value no fraction holds, so they are inexact units, and
so is every unit built on one of them;
[Which factors are exact](units.md#which-factors-are-exact) lists them
by name. A conversion through an inexact unit is `≈`. `sr`, defined as
`radian^2`, is exact: its factor is one.

The **definitions table** is the table the app builds from the
definitions file when it loads it. It is built once, in exact mode, and
at the ceiling, the highest precision any pass computes at
([Digits you can trust](numbers.md#digits-you-can-trust)). So an
inexact unit's value is known to the ceiling's precision whatever the
display digits, and the unit never limits the digits a conversion
through it can certify. In decimal mode a unit is rounded once as it is
looked up, like any other step
([The two modes](numbers.md#the-two-modes)).

| You type | Into       | Exucal shows          | Note                                  |
| -------- | ---------- | --------------------- | ------------------------------------- |
| `1 in`   | `cm`       | `= 2.54 cm`           | a defined factor                      |
| `1 ft`   | `in`       | `= 12 in`             |                                       |
| `1 mi`   | `km`       | `= 1.609344 km`       | exact through every factor on the way |
| `5 km`   | `m`        | `= 5000 m`            | a prefix and a unit                   |
| `1 min`  | `s`        | `= 60 s`              | the unit `min`, not a milli-inch      |
| `30 deg` | `radian`   | `≈ 0.52359878 radian` | inexact: `deg` calls `pi()`           |
| `1 turn` | `deg`      | `≈ 360 deg`           | inexact on both sides                 |
| `1 grad` | `deg`      | `≈ 0.9 deg`           | inexact on both sides                 |
| `1 sr`   | `radian^2` | `= 1 radian^2`        | exact                                 |

## How a conversion is answered

This section says what a conversion into one unit computes, what the
want may be, when the conversion fails, what the second line under it
is, and how every line is written so that it pastes back.

### The ratio

After the conformance check, the answer is the have's magnitude
divided by the want's magnitude, written in front of the want: `3 ft`
into `in` is `= 36 in`. The relation is decided as for any value: `=`
when the ratio is exact and shown entire, `≈` when digits were left out
or the ratio is inexact
([Digits you can trust](numbers.md#digits-you-can-trust)). The want
may carry a magnitude of its own; the answer is then that multiple of
it, joined with `×`: `1 mi` into `1000 ft` is `= 5.28 × 1000 ft`. A
blank want answers in the primitives: `1 in` with a blank want is
`= 0.0254 m`.

[The want field](expressions.md#the-want-field) says how the want is
read. This page says what each reading answers:

- one unit, or any other expression, a call included, answers the
  ratio of this section;
- units separated by `;`, or the name of a list the definitions file
  defines, answer a sum ([Unit lists](#unit-lists));
- a defined function's name answers a call
  ([Conversion into a function](#conversion-into-a-function));
- a built-in's name is an error, since only a defined function can
  have an inverse written for it in the definitions file, and a
  conversion into a function needs one.

| You type | Into      | Exucal shows                              | Note                               |
| -------- | --------- | ----------------------------------------- | ---------------------------------- |
| `3 ft`   | `in`      | `= 36 in`                                 | exact, entire                      |
| `1 m`    | `in`      | `≈ 39.370079 in`                          | exact, with more digits than shown |
| `1 mi`   | `1000 ft` | `= 5.28 × 1000 ft`                        | a want with a magnitude            |
| `1 m`    | `2 ft`    | `≈ 1.6404199 × 2 ft`                      |                                    |
| `1 in`   |           | `= 0.0254 m`                              | a blank want: the primitives       |
| `1`      | `sin`     | an error: `sin` is a function, not a unit | no inverse in the definitions file |

### When a conversion fails

Once the want reads as a quantity, six things can stop a conversion
into one unit. Four are errors, and two are refusals, a value the size
limits keep from being computed
([Values too big to hold](numbers.md#values-too-big-to-hold)):

- a dimension mismatch or a kind mismatch
  ([Conformance](#conformance));
- a want of zero, since nothing is a multiple of it;
- a want that cannot be told from zero at the ceiling
  ([Values at an edge](numbers.md#values-at-an-edge));
- a ratio whose error radius still reaches across the exponent bound
  at the ceiling, so that the calculator cannot tell whether the value
  is past it ([Values at an edge](numbers.md#values-at-an-edge));
- a ratio past the exponent bound, refused as too large or too small
  to compute;
- a ratio whose exact significand would pass the significand limit,
  refused; the message names the limit and suggests `approx` around
  the have, or decimal mode, to compute the ratio to the digits asked
  ([approx](numbers.md#approx)).

| You type                     | Into                       | Exucal shows                                                                         | Note                                                                                                                                                                                      |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1 m`                        | `0 m`                      | an error: the want is zero                                                           |                                                                                                                                                                                           |
| `1 m`                        | `((2^(1/2))^2 - 2) m`      | an error: the want cannot be told from zero at this precision                        | zero within its error radius at every pass                                                                                                                                                |
| `(10 - ((2^(1/2))^2 - 2)) m` | `1e-1000000000000000000 m` | an error: the ratio cannot be told from the point where it passes the exponent bound | the have is ten within its error radius, so the ratio is `1e1000000000000000001` within its error radius: a value below that point is within the bound, and one at or above it is past it |
| `1e999999999999999999 m`     | `1e-999999999999999999 m`  | refused: too large to compute                                                        | the ratio's exponent would pass `10^18`                                                                                                                                                   |
| `3^30000 m`                  | `5^20000 m`                | refused: past the significand limit                                                  | the exact ratio needs more bits than the default limit holds; the message suggests `approx(3^30000 m)` or decimal mode                                                                    |

### The reciprocal line

A conversion into one unit answers twice. Under the line you asked for
stands the **reciprocal line**, the conversion the other way round,
which gives the want as a multiple of the have: `3 ft = 36 in` and,
under it, `in ≈ 0.027777778 × 3 ft`. Each line's relation is decided
from its own value: the first line here is `=`, since its value is
exact and entire, and the second is `≈`, since `1/36` has more digits
than are shown. There is no reciprocal line:

- for a unit list, a blank want or a function want;
- when the have is zero, or cannot be told from zero: `0 ft` into `in`
  is the one line `= 0 in`;
- when the reciprocal line would itself be refused for its size; it is
  then left out, and no message says so. `5e1000000000000000000 m`
  into `m` shows one line, since the reciprocal is past the exponent
  bound, while the have is a value, its exponent being at the bound and
  not past it.

In decimal mode the reciprocal line is computed from the ratio as
shown, as [The two modes](numbers.md#the-two-modes) describes.

| You type                  | Into      | Exucal shows                 | The reciprocal line                             |
| ------------------------- | --------- | ---------------------------- | ----------------------------------------------- |
| `3 ft`                    | `in`      | `= 36 in`                    | `in ≈ 0.027777778 × 3 ft`                       |
| `1 in`                    | `cm`      | `= 2.54 cm`                  | `cm ≈ 0.39370079 × 1 in`                        |
| `1 mi`                    | `1000 ft` | `= 5.28 × 1000 ft`           | `1000 ft ≈ 0.18939394 × 1 mi`                   |
| `1 in`                    |           | `= 0.0254 m`                 | none: a blank want                              |
| `0 ft`                    | `in`      | `= 0 in`                     | none: the have is zero                          |
| `5e1000000000000000000 m` | `m`       | `= 5e+1000000000000000000 m` | none: the reciprocal is past the exponent bound |

### Lines that paste back

Every line pastes back as a have
([What the app writes back](expressions.md#what-the-app-writes-back)):
the copy button writes the line's result with `*` where the screen
shows `×`, and the text reads as the value shown, so that pasting it as
a have and converting it into the same want writes the same result
again. The result is written as a factor in front of the want, or in
front of the have on the reciprocal line, by these rules:

- The factor is set beside what follows it by juxtaposition,
  `≈ 39.370079 in`, unless what follows starts with a digit, in which
  case `×` joins them: `= 5.28 × 1000 ft`.
- A want or have that is a sum, a difference or a negation stands in
  parentheses, since it is one factor of the product:
  `≈ 3.0284676 (ft + in)`, `≈ -3.2808399 (-ft)` and, on a reciprocal
  line, `in = -0.0254 (-1 m)`.
- A negative value carries its sign on the factor, `≈ -39.370079 in`.
  Where `×` joins, the sign is applied to the whole product, which is
  then parenthesized: `≈ -(0.0032808399 × 1000 ft)`.
- A want that is a call is an expression like any other, so it answers
  a ratio and takes the factor by juxtaposition:
  `373.15 K = 1 tempC(100)`.
- A value written as a fraction, under the ratio notation, is
  parenthesized before a unit and bare before `×`
  ([How numbers are written](numbers.md#how-numbers-are-written)):
  `1 m = (5000/127) in` and `in = 127/5000 × 1 m`.

| You type   | Into         | Exucal shows                  | The reciprocal line         | Note                                 |
| ---------- | ------------ | ----------------------------- | --------------------------- | ------------------------------------ |
| `1 m`      | `ft + in`    | `≈ 3.0284676 (ft + in)`       | `ft + in = 0.3302 × 1 m`    | a sum as the want                    |
| `1 m`      | `-ft`        | `≈ -3.2808399 (-ft)`          | `-ft = -(0.3048 × 1 m)`     | a negation as the want               |
| `-1 m`     | `in`         | `≈ -39.370079 in`             | `in = -0.0254 (-1 m)`       | a negative have                      |
| `-1 m`     | `1000 ft`    | `≈ -(0.0032808399 × 1000 ft)` | `1000 ft = -304.8 (-1 m)`   | a negative value with `×`            |
| `373.15 K` | `tempC(100)` | `= 1 tempC(100)`              | `tempC(100) = 1 × 373.15 K` | a call as the want                   |
| `1 m`      | `in`         | `= (5000/127) in`             | `in = 127/5000 × 1 m`       | under the ratio notation at width 20 |

## Unit lists

This section says what a unit list answers, how its counts and its
remainder are formed and rounded, what a list's units must satisfy,
and what a comparison that cannot be decided does inside a list.

### What a list answers

The want may be a **unit list**: units separated by `;`, largest
first. The answer is then a sum, a whole number of each unit but the
last and the rest in the last: `1 m` into `ft;in` is
`≈ 3 ft + 3.3700787 in`. Each item is any expression, so `ft;in/8`
counts eighths of an inch. A unit whose count is zero is left out, a
negative quantity gives negative terms, and the relation is `=` only
when every term is exact; the table shows each. The line pastes back
as a have, and a list has no reciprocal line.

The definitions file defines some lists under a name, `time` among
them, and such a name typed alone as the want means the list: `3661 s`
into `time` is the same sum as into `hr;min;s`.
[Unit lists](definitions.md#unit-lists) says how a list is defined, and
[Unit lists defined in the file](units.md#unit-lists-defined-in-the-file)
lists the defined ones. A list is an output form only: it can be typed
as the want and never as the have, and a list's name is a unit nowhere
else, so `2 time`, or `time` inside a list, is an unknown unit.

| You type      | Into          | Exucal shows                        | Note                                  |
| ------------- | ------------- | ----------------------------------- | ------------------------------------- |
| `1 m`         | `ft;in`       | `≈ 3 ft + 3.3700787 in`             | `≈`: digits of the remainder left out |
| `3661 s`      | `hr;min;s`    | `= 1 hr + 1 min + 1 s`              | every term exact                      |
| `3601 s`      | `hr;min;s`    | `= 1 hr + 1 s`                      | a zero count left out                 |
| `-1 m`        | `ft;in`       | `≈ -3 ft - 3.3700787 in`            | negative terms                        |
| `1 hr / 7 mi` | `min/mi;s/mi` | `≈ 8 min / mi + 34.285714 s / mi`   | a pace                                |
| `1 m`         | `ft;in/8`     | `≈ 3 ft + 26.96063 in / 8`          | eighths of an inch                    |
| `1.5 deg`     | `deg;arcmin`  | `≈ 1 deg + 30 arcmin`               | `≈`: the angle units are inexact      |
| `3661 s`      | `time`        | `= 1 hr + 1 min + 1 s`              | a defined list, by name               |
| `2 time`      |               | an error: `time` is an unknown unit | a list's name is not a unit           |

### The counts and the remainder

Each count is the whole number of its unit that fits in what is left
of the have, truncated toward zero, so that every term carries the
have's sign. A count is never rounded on its own; only a carry from the
remainder, described below, changes one. The remainder is the rest,
counted in the last unit, and it is the one term that is rounded. It is
rounded to the display digits, as any answer is
([Digits you can trust](numbers.md#digits-you-can-trust)); when a note
says that only some of those digits are certified, it is rounded to the
certified ones instead. When the rounded remainder reaches a whole of
the unit before it, the rounding carries: the sum is rounded as a
whole, so `2.9999999999 ft` into `ft;in` is `≈ 3 ft` and never
`2 ft + 12 in`. Under the rounding mode down nothing rounds up, so
under that mode it is `≈ 2 ft + 11.999999 in`
([Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)).
Under the ratio notation, an exact remainder that fits the ratio width
is written entire, as a fraction, so nothing is rounded and nothing
carries: `1 m` into `ft;in` is `= 3 ft + (428/127) in`. A last term
that cannot be told from zero is left out like a zero count, and a sum
of nothing but zeros keeps its last term: `0 m` into `ft;in` is
`= 0 in`.

| You type            | Into         | Exucal shows            | Note                                                                                    |
| ------------------- | ------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| `2.9999999999 ft`   | `ft;in`      | `≈ 3 ft`                | the remainder rounded up carries into the feet                                          |
| `2.9999999999 ft`   | `ft;in`      | `≈ 2 ft + 11.999999 in` | under the rounding mode down                                                            |
| `3599.9999999999 s` | `hr;min;s`   | `≈ 1 hr`                | the carry runs through two units                                                        |
| `1 m`               | `ft;in`      | `≈ 3 ft + 3.37 in`      | at three display digits                                                                 |
| `1 m`               | `ft;in`      | `= 3 ft + (428/127) in` | under the ratio notation at width 20                                                    |
| `0 m`               | `ft;in`      | `= 0 in`                | a sum of nothing but zeros keeps its last term                                          |
| `1 turn`            | `deg;arcmin` | `≈ 360 deg`             | the remainder cannot be told from zero and is left out; `≈` since the units are inexact |

### What a list's units must satisfy

The units of a list must:

- conform to the have, each of them ([Conformance](#conformance));
- be positive throughout their error radius;
- decrease along the list, each smaller than the one before it:
  `in;ft` is an error, and so is `ft;12 in`.

They need not be multiples of one another: `1.5 mi` into `mi;km` is
`= 1 mi + 0.804672 km`. They may carry magnitudes, as `ft;in/8` does. A
list the definitions file defines is checked by the same rules when
the file loads ([Unit lists](definitions.md#unit-lists)), so it can
fail only for not conforming to the have.

| You type | Into       | Exucal shows                                             |
| -------- | ---------- | -------------------------------------------------------- |
| `1 m`    | `ft;s`     | an error, a dimension mismatch: `m` against `s`          |
| `1 m`    | `ft;0 in`  | an error: `0 in` is not positive                         |
| `1 m`    | `in;ft`    | an error: `ft` is not smaller than the unit before it    |
| `1 m`    | `ft;12 in` | an error: `12 in` is not smaller than the unit before it |
| `1.5 mi` | `mi;km`    | `= 1 mi + 0.804672 km`                                   |
| `1 m`    | `time`     | an error, a dimension mismatch: `m` against `s`          |

### When a count cannot be decided

A count comes from the ratio of what is left to the unit, and an
inexact ratio is compared as the whole range within its error radius
([Comparison and equality](numbers.md#comparison-and-equality)). When
that range reaches across a whole number, or ends exactly on one, so
that the ratio cannot be told from it, the count takes that whole
number, the one nearest the ratio, and the remainder is a value around
zero, left out as a zero term: `approx(36) in` into `ft;in` is `≈ 3 ft`.
This is the design, and it is not a guess: a count chooses how the
quantity is written, not what it is. The doubt goes into the remainder,
a value around zero that is left out, and into the `≈`, which a value
with an error radius always carries. Counting one less would write the
same quantity as `2 ft + 12 in`, a whole of the unit, as if it were a
different one.

A failure of the rule that every unit of a list be positive ends the
retry loop. A unit of a typed list that cannot be told from zero at a
pass is therefore an error, and the calculator does not run it again at
more digits, though it does for the same expression as a single want
([Values at an edge](numbers.md#values-at-an-edge)): `1 m` into
`(1e-30 + approx(1) - 1) m` is `≈ 1e+30 × (1e-30 + approx(1) - 1) m`,
while `1 m` into `ft;(1e-30 + approx(1) - 1) m` is an error.

| You type                   | Into                           | Exucal shows                                                    |
| -------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `approx(36) in`            | `ft;in`                        | `≈ 3 ft`                                                        |
| `(3 + (2^(1/2))^2 - 2) ft` | `ft;in`                        | `≈ 3 ft`                                                        |
| `1 m`                      | `(1e-30 + approx(1) - 1) m`    | `≈ 1e+30 × (1e-30 + approx(1) - 1) m`                           |
| `1 m`                      | `ft;(1e-30 + approx(1) - 1) m` | an error: the unit is not positive, or cannot be told from zero |
| `1 m`                      | `ft;((2^(1/2))^2 - 2) m`       | an error: the unit is not positive, or cannot be told from zero |

## Conversion into a function

This section says what a function as the want answers, the checks the
conversion passes, and how the answer is written.

A defined function's name as the want asks for the argument the
function would need to give the have. This is a
**conversion into a function**, and it recovers the argument through
the function's inverse. `tempF` gives the temperature that a Fahrenheit
reading denotes, so `300 K` into `tempF` is `= tempF(80.33)`, since
`tempF(80.33)` is `300 K`. The conversion passes six steps:

1. The function must have an inverse, written in the definitions file
   ([Inverses](definitions.md#inverses)); a function without one cannot
   be a want. The conversion recovers a single argument from a single
   have, so only a function of one parameter can have an inverse. `25`
   into `bmi`, the function of two parameters supposed in
   [Conformance](#conformance), is an error: `bmi` has no inverse. The
   functions the predefined file defines each have an inverse.
2. The have must conform to the function's result: `300 m` into
   `tempF` is a dimension mismatch.
3. The inverse must accept the have: its conditions must hold, and it
   must compute. `decibel` gives the ratio that a level in decibels
   denotes, and `-1` into `decibel` is an error, since the inverse
   applies `log10` to a value that is not positive.
4. The **recovered argument**, the value the inverse gives, must meet
   the function's own conditions: `-5 K` into `tempC` is an error,
   since the argument it would take does not meet `x >= -273.15`,
   which `tempC` requires.
5. The function is then applied to the recovered argument. A result
   certainly other than the have refutes the inverse, and the
   conversion is an error; two values that cannot be told apart refute
   nothing. The step guards against an inverse that does not undo its
   function: the comparison is the one
   [Comparison and equality](numbers.md#comparison-and-equality)
   describes, exact values compared exactly and inexact ones as ranges,
   so a wrong inverse gives an error rather than a wrong answer.
6. The answer is written as the call, with the recovered argument
   written as a count of the parameter's annotation unit, the number
   of that unit the argument amounts to; where the parameter takes a
   plain number, that count is the number itself: `tempF(80.33)`. The
   predefined file's functions all take a plain number, so every
   example here does. There is no reciprocal line.

An inexact have gives an inexact recovered argument: `approx(300) K`
into `tempF` is `≈ tempF(80.33)`. Under the ratio notation the
recovered argument is written as a fraction where one fits: `300 K`
into `tempF` is `= tempF(8033/100)`.
[Inverses](definitions.md#inverses) says how an inverse is written and
what the definitions file checks about one when it loads.

| You type        | Into      | Exucal shows                                                          | Note                                                       |
| --------------- | --------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `300 K`         | `tempF`   | `= tempF(80.33)`                                                      |                                                            |
| `tempF(212)`    | `tempC`   | `= tempC(100)`                                                        | a Fahrenheit reading into a Celsius one                    |
| `tempF(-40)`    | `tempC`   | `= tempC(-40)`                                                        |                                                            |
| `100`           | `decibel` | `= decibel(20)`                                                       |                                                            |
| `approx(300) K` | `tempF`   | `≈ tempF(80.33)`                                                      | an inexact have                                            |
| `300 K`         | `tempF`   | `= tempF(8033/100)`                                                   | under the ratio notation at width 20                       |
| `25`            | `bmi`     | an error: `bmi` has no inverse                                        | step 1, with `bmi` as above: two parameters, so no inverse |
| `300 m`         | `tempF`   | an error, a dimension mismatch: `m` against `K`                       | step 2                                                     |
| `-1`            | `decibel` | an error: the inverse applies `log10` to a value that is not positive | step 3                                                     |
| `-5 K`          | `tempC`   | an error: the recovered argument does not meet `x >= -273.15`         | step 4                                                     |

## Temperature and logarithmic levels as functions

This section says what the temperature units measure, why a reading
on a temperature scale and a logarithmic level are functions here
rather than units, and how to write each.

A **reading** on a temperature scale, a number on that scale, is not a
multiple of anything: zero degrees Celsius is not zero kelvin, so no
factor turns the one into the other. Exucal has no unit with an offset.
A unit is multiplied in as the expression is read
([No unit of its own](#no-unit-of-its-own)), so no operation sees one.
An offset cannot be multiplied in, so every operation would need a rule
for it: twice a reading is not the reading with twice the number, and
the sum of two readings is not a reading of the sum. A function needs
nothing new: the offset lives in its body, and a call is a quantity
like any other once the body has run. So a reading is a function.

`degC`, `degF` and `degR` are **temperature differences**, not
readings: `1 degC` is `1 K`, and `1 degF` is five ninths of a kelvin. A
reading is a call of `tempC` or `tempF`: `tempC(20)` is `= 293.15 K`.
The functions have inverses, so a function can be the want and a
reading converts into a reading: `tempC(20)` into `tempF` is
`= tempF(68)` ([Conversion into a function](#conversion-into-a-function)).
And twice a reading is twice the temperature: `2 tempC(20)` is
`= 586.3 K`, and into `tempC` it is `= tempC(313.15)`, not `tempC(40)`,
the reading with twice the number.

The distinction matters when you type. `20 degC` is a difference of
twenty kelvin and not a reading of twenty degrees, so into `tempF` it
is `= tempF(-423.67)`; the reading is `tempC(20)`. A reading and a
difference add: `tempC(20) + 5 degC` is `= 298.15 K`.

A logarithmic level is not a multiple either: twenty decibels is a
ratio of a hundred, while thirty decibels is a ratio of a thousand; the
level is a logarithm and not a factor. So `decibel`, `bel` and `neper`
are functions the same way. A call gives the ratio the level denotes,
so `decibel(20)` is `= 100`, and the inverse makes the function a want,
so `100` into `decibel` is `= decibel(20)`. The entries, with the scale
and the ratio each function uses, are
[Temperature: differences and readings](units.md#temperature-differences-and-readings)
and [Logarithmic levels](units.md#logarithmic-levels).

| You type             | Into      | Exucal shows        | Note                                         |
| -------------------- | --------- | ------------------- | -------------------------------------------- |
| `1 degC`             | `K`       | `= 1 K`             | a difference                                 |
| `1 degF`             | `degC`    | `≈ 0.55555556 degC` | five ninths                                  |
| `tempC(20)`          |           | `= 293.15 K`        | a reading                                    |
| `tempC(20)`          | `tempF`   | `= tempF(68)`       | a reading into a reading                     |
| `20 degC`            | `tempF`   | `= tempF(-423.67)`  | a difference of twenty kelvin, not a reading |
| `tempC(20) + 5 degC` |           | `= 298.15 K`        | a reading plus a difference                  |
| `2 tempC(20)`        |           | `= 586.3 K`         | twice the temperature                        |
| `2 tempC(20)`        | `tempC`   | `= tempC(313.15)`   | the reading of twice the temperature         |
| `decibel(20)`        |           | `= 100`             | a level                                      |
| `100`                | `decibel` | `= decibel(20)`     | a ratio into a level                         |
| `neper(1)`           |           | `≈ 2.7182818`       |                                              |

## How dimensions are written in messages

This section says how a message writes a dimension, so that you can
read one and paste it back, and how an error names the text at fault.

A dimension in a message, and in an answer with a blank want, is
written in the expression language:

- the primitives come in the order the definitions file declares them;
- those with positive exponents come first, then a `/`, then those
  with negative exponents, their exponents written positive after the
  `/`;
- `1` stands for an empty numerator, and a plain number's dimension is
  `1` alone, the empty product;
- an exponent that is not a whole number is parenthesized.

The watt's dimension is written `m^2 kg / s^3`, the hertz's `1 / s`,
and a square root of a metre `m^(1/2)`. A kind primitive is written
among the primitives in the same way, so an angular speed is
`radian / s`. The text pastes back as it is, and the same writing
orders an answer: `1 kg m` with a blank want is `= 1 m kg`. When
`1 m + 0` fails, the message says that `0` has dimension `1`.

An error quotes the text at fault as you typed it, so that you can
find it in either field. A mismatch in a sum is worded as the same
mismatch a conversion reports between a have and a want. The table
quotes the messages as the calculator writes them.

| You type          | Into | The message                                                                                          |
| ----------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| `1 m + 1 s`       |      | `Cannot add "1 m" and "1 s": "1 m" has dimension m, but "1 s" has dimension s.`                      |
| `1 m`             | `s`  | `"1 m" has dimension m, but "s" has dimension s.`                                                    |
| `1 m + 0`         |      | `Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1.`                          |
| `1 W / A + 1 s`   |      | `Cannot add "1 W / A" and "1 s": "1 W / A" has dimension m^2 kg / s^3 A, but "1 s" has dimension s.` |
| `1 Hz + 1 m`      |      | `Cannot add "1 Hz" and "1 m": "1 Hz" has dimension 1 / s, but "1 m" has dimension m.`                |
| `1 m^(1/2) + 1 s` |      | `Cannot add "1 m^(1/2)" and "1 s": "1 m^(1/2)" has dimension m^(1/2), but "1 s" has dimension s.`    |
| `1 rad/s`         | `Hz` | `"1 rad/s" (radian / s) and "Hz" (1 / s) differ in kind: radian.`                                    |
