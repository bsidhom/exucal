# Unit definitions

Every unit the app knows comes from a definitions file, `src/units.txt`,
which defines each unit in terms of others down to a few primitives, in the
spirit of a GNU units file. This section describes that file: what it
contains, how to read it, and how to add to it. The same expression language
serves the definitions and what you type into the converter, so anything
that can be typed can also be defined.

## What the file contains

- **The SI in full**, after the 9th edition of the SI brochure with the 2022
  prefixes: the seven base units, every prefix by name and by symbol (with
  three spellings of micro, `µ`, `μ` and `u`, and the binary prefixes `Ki`,
  `Mi`, ... beside them), the derived units with special names, and the
  non-SI units accepted for use with the SI (`min`, `h`, `d`, `ha`, `L`,
  `t`, `au`, `eV`, `Da`, the degree and its subdivisions).
- **US customary units**, after NIST Handbook 44: the international inch,
  foot, yard and mile with their subdivisions and multiples, the US survey
  foot and the land-survey units built on it, liquid and dry measure,
  avoirdupois, troy and apothecaries' mass, and the customary force,
  pressure, energy, power and speed units (`lbf`, `psi`, `Btu`, `hp`,
  `mph`, ...).
- **UK imperial units**, after the Weights and Measures Act 1985: the
  imperial gallon and its subdivisions, stone, quarter, long hundredweight
  and long ton, rood and cental.
- **Some common extras**: the physical constants the definitions need
  (`c`, `gravity`, ...; the circle constant is the built-in function
  `pi()`, not a definition), CGS units, conventional pressure units (`atm`, `torr`,
  `mmHg`, `inH2O`), calories, time units beyond the day, and bits and bytes.
- **Unit lists** (see Unit lists below) for the sums people say: `time`
  (`hr;min;s`, also `hms`), `dhms` and `ydhms` with days and years in
  front, `dms` (`deg;arcmin;arcsec`), `ftin`, `ydftin` and `miftin`,
  `lboz`, `stlb` and `tonlb`, `galqtpt` (`gal;qt;pt;floz`), `cups`
  (`cup;tbsp;tsp`), and `mipace` and `kmpace` for a running pace
  (`hr/mi;min/mi;s/mi` and the same per kilometre).
- **Temperature readings** as the functions `tempC` and `tempF` (see
  Functions below): `tempC(20)` is a temperature, and `tempF(212)`
  converted to `tempC` is `tempC(100)`.

Where the US and the UK give one name to different units, the plain name is
the US unit and the name with `imp` or `uk` in front is the imperial one:
`gallon` is 231 cubic inches and `impgallon` is 4.54609 litres, `ton` is
2000 pounds and `longton` (or `ukton`) is 2240. Every factor is the exact
one its defining document states, so `1 in` is exactly `2.54 cm` and `1 lb`
exactly `0.45359237 kg`, and conversions between them are exact.

The temperature units `degC`, `degF` and `degR` are intervals: they convert
temperature differences, so `1 degC` is `1 K` and `212 degF - 32 degF` into
`degC` is `100`. A temperature reading is written as a call of `tempC` or
`tempF`, which adds the offset for you. The logarithmic units are
functions the same way, since a level is the logarithm of a ratio rather
than a multiple of a unit: `decibel(20)` is a power ratio of `100`, `bel(2)`
the same, `neper(1)` the amplitude ratio `exp(1)`, and `1000` into
`decibel` is `decibel(30)`. The decibel is spelled out because `dB` would
read as `d` + `B`, a tenth of a byte.

## The format

One definition per line: a name, whitespace, then a body, except that a
function is written `name(parameter) = body`. `#` starts a comment that
runs to the end of the line, and blank lines are skipped.

```
m         !                 # dimension primitive
radian    !kind             # kind primitive (dimensionless)
kilo-     1000              # prefix (trailing dash)
inch      2.54 cm           # unit, defined by an expression
newton    kg m / s^2
hertz     1 / s
time      hr;min;s          # unit list (expressions separated by `;`)
tempC(x) = x K + 273.15 K   # function
~tempC(y) = y / K - 273.15  # its inverse
```

A definition is one of six things:

- **A primitive**, with a body of `!`, is a base unit that everything else
  is defined in terms of: the metre, the kilogram, the second and the other
  SI base units. A body of `!kind` declares a kind primitive instead: a
  dimensionless marker that keeps quantities apart which would otherwise
  look alike. The radian is one, so that `rad/s` does not convert to `Hz`
  (a revolution per second is not a cycle per second) and `rpm` converts
  to `rad/s` but not to `Hz`.
- **A prefix**, written with a trailing dash (`kilo-`), has a body that is a
  plain number.
- **A unit** has a body that is an expression over numbers and other units.
- **A unit list** has a body of two or more expressions separated by `;`,
  the same thing that can be typed as the unit to convert to; Unit lists
  below describes both.
- **A function**, written with a parameter in parentheses (`tempC(x)`),
  then `=` and an expression in which the parameter stands for the
  argument; Functions below describes it.
- **An inverse**, written with a `~` before a function's name
  (`~tempC(y)`), gives back the argument that produces a value, which
  lets the function be the unit to convert to; it is optional.

Definitions may appear in any order; a unit may be defined by one that
comes later, and an inverse may come before its function. A name defined
twice, a circular definition, a prefix whose body has a dimension, a unit
list that breaks the rules below, a function whose body does not fit its
annotations, or an inverse of no function is an error.

## Names

A name is a letter or underscore followed by letters, digits and
underscores, in any script, so `µm`, `Ω`, `Å`, `degF` and `N_A` are
names while `°`, `%` and `'` cannot be. Names are case-sensitive (`mm` and
`Mm`, `S` and `s`) and read as long as they go, so `m2` is the name `m2`,
not `m` squared.

A name means the unit of that name if there is one, and otherwise one prefix
followed by a unit: `km` is `k` + `m` and `kilometre` is `kilo` + `metre`.
An exact name always wins, so `min` is the minute and not `m` + `in`, and
`ha` is defined as the hectare even though `h` + `a` would give the same.
Prefixes do not stack (`kkm` is nothing), and there is no plural handling
(`inches` is nothing unless it is defined as an alias). Prefixes and units
are separate namespaces, which is how `m-` (milli) and `m` (the metre)
coexist. Prefixes apply to units alone: the name of a function, defined
in the file or built into the app, is looked up exactly, so `ktempC(1)`
is a call of nothing, and a function's name may not itself read as a
prefix followed by a unit (see Functions below).

A name that could be read as two different prefix-unit pairs is an error
when the file is loaded, not an ambiguity resolved by some rule. That is why
two conventional symbols are missing: `u` for the dalton, because with `au`
a unit `dau` would be both `d` + `au` and `da` + `u`, and `at` for the
technical atmosphere, for the same reason against `t`. The longer names
(`Da`, `amu`, `technicalatmosphere`) are there.

## Expressions

A body, like the text typed into the converter, is a small expression
language:

- **Numbers** are unsigned decimals, with an optional exponent: `2`, `2.54`,
  `.5`, `1e-3`. They are read exactly, so a unit defined by a decimal
  converts exactly. A sign is part of a number only in its exponent: `1e-3`
  is a thousandth, `1 - 3` is a difference, and `-2` is the negation of `2`.
- **Juxtaposition** multiplies: `2 m` is two metres and `kg m` is a
  kilogram-metre. A number may only be the first factor of a product, so
  `m 2` and `2 3 m` are errors; multiplying numbers is written `2 * 3`.
- **`*` and `/`** multiply and divide, at one level, left to right, and
  juxtaposition binds tighter than either: `kg m / s^2` is `(kg m) / (s^2)`
  and `m/s*s` is `(m/s)*s`.
- **`+` and `-`** add and subtract, at one level, left to right, binding
  loosest of all: `1 ft + 3 in` is fifteen inches, `2 m * 3 + 1 m` is
  `(2 m * 3) + (1 m)`, and `5 ft - 2 in + 1 in` is `((5 ft - 2 in) + 1 in)`.
  The two sides must be quantities of the same thing, by the same test that
  `have` and `want` must pass: `1 m + 1 s` is an error (length and time),
  and so are `1 rad + 1` (an angle and a plain number) and `1 m + 0`, since
  `0` is a number and not a length. A difference may be zero or negative.
- **`-` before a product** negates it: `-2 m` is minus two metres and
  `2 * -3` is minus six. It binds tighter than `*` and `/` and looser than
  juxtaposition and `^`, so `-2 m / s` is `(-(2 m)) / s` and `-2^2` is `-4`;
  write `(-2)^2` for `4`. It does not stack (`--2` is an error; write
  `-(-2)`), and there is no `+` in front of anything.
- **`^`** raises to a literal exponent, which is a signed decimal (`m^2`,
  `s^-1`, `m^0.5`) or a parenthesized fraction (`m^(1/2)`), never an
  expression. It binds tightest, so `m^2 - 1` is `(m^2) - 1`.
- **Parentheses** group.
- **A call**, a name directly followed by parentheses (`tempC(100)`),
  applies a function to the expressions inside, separated by commas when
  there are several; Functions below describes it. Each function takes its
  own number of arguments, and a call with another number is an error that
  says how many. The space matters: `kg (m/s)` is a product, and `kg(m/s)`
  is a call of `kg`, which is not a function and says so.

The one thing to watch is a fraction before a unit: `1/12 year` is
`1 / (12 year)`, a frequency, because the juxtaposition is read first.
Write `year / 12` or `(1/12) year` instead. The same rule makes
`1 m + 1/2 m` an error, `1 m` plus `1 / (2 m)`; write `1 m + m/2`.

## Unit lists

The unit to convert to may be a list of units separated by `;`, largest
first, and the answer is then a sum: a whole number of each unit but the
last, and the rest in the last. `1 m` in `ft;in` is `3 ft + 3.3700787 in`,
`3661 s` in `hr;min;s` is `1 hr + 1 min + 1 s`, and `1 hr / 7 mi` in
`min/mi;s/mi` is `8 min/mi + 34.285714 s/mi`. A unit that would get a
count of zero is left out (`3601 s` is `1 hr + 1 s`), a negative quantity
gives negative terms (`-3 ft - 3.3700787 in`), and the line is written so
that it can be typed back as a quantity. Each item is any expression, so
`ft;in/8` counts eighths of an inch. The rest is shown rounded to the
digits of the Settings as any answer is, and when that rounding would
reach a whole of the unit before it, the sum is rounded as a whole instead:
`2.9999999999 ft` in `ft;in` is `3 ft`, never `2 ft + 12 in`.

The units of a list must all convert to the quantity, must be positive,
and must decrease along the list (`in;ft` is an error, as is `ft;12 in`).
A list is an output form only: it can be typed as the unit to convert to,
never as the quantity to convert.

A list can be defined under a name in the definitions file, as `time` is
(`time  hr;min;s`), and that name typed alone as the unit to convert to
means the list. The name lives among the unit names, so it cannot also be
a unit, and it may not read as a prefix followed by a unit either (`ms`
could not name a list, because it means milliseconds): unlike a unit's
name, a list's name only means anything as the unit to convert to, and
the same text should not mean different things in the two fields. A
list's name is not a unit anywhere else: `2 time`, or `time` in a list
or in a definition, is an unknown unit. The file checks a defined list by
the rules above when it is loaded, so that a defined list can fail only
for not matching the quantity.

## Functions

A function turns a number, or a quantity, into another by a rule that is
not a plain factor. The temperature readings are the case in point: a
Celsius reading is not a multiple of a kelvin, since the two scales start
in different places, so `tempC` is defined as a function of the number on
the thermometer. To use one, call it with the argument in parentheses:
`tempC(20)` is 293.15 K, `tempF(98.6)` is 310.15 K, and a call goes
anywhere a unit goes, so `tempC(100) - tempC(0)` into `degF` is `180`, and
`tempC(100)` into `K` is `373.15`. A call is a name directly followed by
`(`; with a space between, `kg (m/s)` is the product it looks like, and
`kg(m/s)` is an error that shows the product with the space. A function
takes as many arguments as it has parameters, in their order, so
`tempC(1, 2)` and `tempC()` are errors that say so.

Typed as the unit to convert to, a function's name asks for the reading
that gives the quantity, and the answer is written as the call that would
produce it: `tempF(212)` into `tempC` is `tempC(100)`, `300 K` into `tempF`
is `tempF(80.33)`, and `tempF(-40)` into `tempC` is `tempC(-40)`. The line
reads as what it is and can be typed back as a quantity. That needs the
function's inverse, defined on a line of its own, and a function without
one cannot be the unit to convert to; the message says so and shows how
to define it. A function's name is not a unit anywhere else: `2 tempC`,
or `tempC` in a list, is an error that shows the call form.

A function is defined by its name, its parameters in parentheses
separated by commas, `=`, and the expression that computes it, in which
each parameter stands for the argument in its position:
`kinetic(mass: kg, v: m/s) = mass v^2 / 2` takes a mass and a speed, in
that order, and `kinetic(2 kg, 3 m/s)` is `9 J`. It may have none, called
as `name()`, and a parameter may not be named twice. A function of one
parameter may have an inverse, which is optional: a line that starts
with `~` and the function's name, whose parameter stands for the
function's value and whose expression gives back the argument:

```
tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15
tempF(x) | x >= -459.67 = (x + 459.67) degF
~tempF(y) = y / degF - 459.67
```

The part after `|`, before the `=`, is a condition the arguments must
meet: `tempC(-300)` is an error that names `x >= -273.15`, and so is
`-5 K` converted to `tempC`, whose reading would lie below absolute zero.
A condition is two or more expressions joined by `<`, `<=`, `>` or `>=`
(or `≤` and `≥`), all pointing one way: `x > 0`, `0 < p < 1`,
`0 K <= t <= 373.15 K`. Several are separated by commas and must all
hold, and they may relate parameters, `| a < b, a <= x <= b`, or bound any
expression of them, `| x^2 + y^2 <= 1`. A condition is checked left to
right before the body, so one may guard the next: in `| x > 0, ln(x) > 1`
a negative argument fails the first and never reaches `ln`. Its sides
must be of one dimension (`| t > 0` for `t: K` is an error; write `0 K`),
and it must mention a parameter. An inverse may have conditions too,
`~neper(y) | y > 0 = ln(y)`, which restrict what can be converted into
its function. Nothing checks a function's result against a range.

A condition is decided on the value's bounds, with no tolerance: exact
values are compared exactly, so `tempC(-273.15)` meets `x >= -273.15`
and `0.1 + 0.2 <= 0.3` holds. An inexact value can straddle the bound,
and then the condition cannot be decided: the calculator computes again
at more digits, and if the doubt remains at the last pass, it shows the
value anyway, marked `≈`, with a warning that names the condition it
assumed: `tempC(approx(-273.15))` is `≈ 0 K`, with "Could not tell
whether the argument of "tempC" meets "x >= -273.15"; the value assumes
it does." Unlike a built-in's edge, where `floor(sqrt(2)^2)` is refused
since a guess would be a wrong value, a condition restricts a body that
computes on either side of it, so the value shown is the body's own, and
only whether the definition admits the argument is in doubt. A condition
that restates an identity, `| x - x >= 0`, can never be decided for an
inexact argument, so a condition should bound the arguments rather than
restate what the body guarantees. A unit defined by a call whose
condition cannot be decided fails to load, having nowhere to show the
warning.

A parameter without an annotation is a plain number. One may be
annotated with the unit it takes, `dozen(n: in) = 12 n`, and a converted
quantity is then written as a count of that unit inside the call: with
`~dozen(len) = len / 12`, `2 ft` converted to `dozen` is `dozen(2 in)`.
An annotation checks a dimension and changes no value: `n: in` means a
length, any length, so `dozen(1 ft)` is twelve feet, and a formula that
needs a number in a given unit divides it out in its body
(`(weight / kg) / (height / m)^2`). The result's dimension is inferred
from the body; an annotation after the parentheses checks it, and `: 1`
says the result is a plain number (`bmi(weight: kg, height: m): 1 = …`).
An annotation names units only: `: 2` or `: 1000 m` would read as a
scale that it does not apply, and is an error that says to write the
scale in the body. A parameter may be named like a unit, which it hides
in the body (`f(t) = t s` uses `t`, not the tonne), but not like a unit
its own line names in an annotation, where the line would read both
ways. The body is checked when the file is loaded, for the units it
gives, without being evaluated at any value, and so is an inverse, for
giving back what the parameter takes; a call can then fail only for its
argument (`tempC(1 m)`) or for a value its body cannot compute
(`recip(0)` for a body of `1 / x`). An inverse is trusted for no more
than it shows: converting into a function applies the function to the
argument found, and an answer it does not give back is refused, as
coming from an inverse that is wrong. A function's name may not read as
a prefix followed by a unit, for the reason a list's may not, and no
prefix applies to a function: `ktempC(1)` is a call of nothing, not a
thousand Celsius readings. A call cannot be inverted inside an
expression; only the unit to convert to may name a function.

A defined function is a shorthand for its body, and a call is computed
as the body typed out in its place would be: its digits are certified
the same way, and a cancellation inside the body is paid for by the next
pass's digits, so `em(x) = (exp(x) - 1) / x` gives `≈ 1` at `1e-30`
without its author writing anything about precision. Three things follow
that a built-in does not share. A call is not remembered: a body that
calls a function twice computes it twice, so calls nested `k` deep
compute the innermost `2^k` times, at every pass, which is what the
expression written out in full would cost, but a definition that reads
small can be large. A parameter used twice is two independent copies of
its argument's bounds, so `x - x` of an inexact argument is a value
within a bound of zero, never exactly `0`, as the same text typed inline
would be. And a function written by hand in place of a built-in is
slower, and can fail where the built-in does not: each step rounds and
the uncertainties add up, the built-in's exact cases are lost
(`log(2, 8)` is `= 3`, `ln(8) / ln(2)` is `≈ 3`), and a step can pass a
limit the result does not (`(exp(x) - exp(-x)) / (exp(x) + exp(-x))` is
refused at `x = 3e18`, where `tanh(3e18)` is `≈ 1`). In decimal mode
each step of a body is rounded to the digits, as a hand calculator
rounds each keystroke, rather than the function's value being rounded
once.
