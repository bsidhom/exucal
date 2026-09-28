# pwa-units

An offline-first progressive web app (PWA) that converts units, in the
spirit of GNU units: type a quantity you have (`3 ft`) and a unit you want
(`in`), and it answers `3 ft = 36 in`; want a list of units (`ft;in`) and
it answers `1 m ≈ 3 ft + 3.3700787 in`. As GNU units does, it also
answers the other way round: `3 ft = 36 in` and then `in ≈ 0.027777778 ×
3 ft`. That goes with a conversion into one unit only, since a sum over a
list has no other way round. The app can be
installed to the home screen and works without a network connection once it
has been loaded once.

`ARCHITECTURE.md` describes the design of the unit converter itself: the
conversion pipeline, the number type, and how units, dimensions and kinds are
modeled.

## Settings

The Settings panel under the converter has five settings, kept in the
browser so that they survive a reload:

- **Digits**: how many significant digits an answer is shown with, from 1
  up to the "most digits" setting; eight by default, as GNU units shows.
  `1 m` in `in` is `≈ 39.370079 in` at eight digits and `≈ 39.3700787402
in` at twelve.
- **Rounding**: how the last digit shown is rounded, one of the seven
  standard modes; to nearest with ties away from zero by default (`0.125`
  at two digits is `0.13`). The directed modes (toward zero, away from
  zero, up, down) show the value on the side they name, so at twelve digits
  `1 m` in `in` is `39.3700787401` rounded down and `39.3700787402` to
  nearest.
- **Mode**: exact, the default, or decimal. In exact mode every digit
  shown is certain: the app computes at rising precisions until the
  digits asked for are certified, and nothing rounds before the display,
  so `1 / 3 * 3` is `= 1`. In decimal mode every step is rounded to the
  digits, in the rounding mode, as a hand calculator or a decimal library
  does, in one pass: `1 / 3 * 3` at eight digits is `0.99999999`, shown as
  `≈ 1` with a note that seven of the eight digits are certain, since the
  exact value lies within the roundings. A value with the digits asked
  for or fewer is exact in either mode (`1 ft` in `in` is `= 12 in`), and
  under a directed rounding mode a rounded value's last digit is marked
  uncertain, the exact value lying at the edge of the shown cell.
- **Most digits**: the most digits an answer may be asked for, 1,000 by
  default. It is a cost setting: the app computes at rising precisions
  until the digits asked for are certain, up to four times this many plus
  ten, and an expression whose digits can never be certain (`(2^(1/2))^2 -
2`, which is zero within a bound) runs all the way up on every keystroke.
  Changing it rebuilds the unit table, since the angle units carry `pi()`
  to that ceiling; changing the digits never does.
- **Most bits**: the largest number the app will form, as the bits of a
  numerator or denominator, 65,536 by default (about 19,700 digits). It is
  what makes `3^1000000000` an error rather than a hang (a power of ten
  is free: `10^1000000000` is `1e+1000000000`, and only its exponent,
  bounded at `10^18`, is counted), and it also bounds the most digits:
  lowering it lowers that setting, and the digits, when they no longer
  fit.

Both limits are cost limits, and the right values depend on the device, so
the panel's "Recommend limits" button measures what this one does within
a fraction of a second and sets them; it runs only when pressed.

An answer shows every digit asked for when the computation can vouch for
them all. When it cannot, a note in parentheses says what the digits are
worth: how many of them are certain ("8 of 12 digits are certain"), that
the value is zero within a bound ("within 2e-30 of zero"), or that none
is certified.

An answer is written with `=` when it is exact and every digit it has is
shown (`1 in = 2.54 cm`, `3 ft = 36 in`), and with `≈` when digits were
rounded away or when a step of the computation was inexact: `1 m ≈
39.370079 in`, and `2^(1/2) m` in `2^(1/2) m` is `≈ 1`, since the two roots
were each computed to a finite number of digits, however exactly they
cancel. A value that cannot be told from zero at any precision up to the
ceiling (`(2^(1/2))^2 - 2`) cannot be divided by, and the app says so.

## Unit definitions

Every unit the app knows comes from a definitions file, `src/units.txt`,
which defines each unit in terms of others down to a few primitives, in the
spirit of a GNU units file. This section describes that file: what it
contains, how to read it, and how to add to it. The same expression language
serves the definitions and what you type into the converter, so anything
that can be typed can also be defined.

### What the file contains

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

### The format

One definition per line: a name, whitespace, then a body. `#` starts a
comment that runs to the end of the line, and blank lines are skipped.

```
m         !                 # dimension primitive
radian    !kind             # kind primitive (dimensionless)
kilo-     1000              # prefix (trailing dash)
inch      2.54 cm           # unit, defined by an expression
newton    kg m / s^2
hertz     1 / s
time      hr;min;s          # unit list (expressions separated by `;`)
tempC(x)  [1;K]  x K + 273.15 K ; tempC / K - 273.15   # function
```

A definition is one of five things:

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
  has a body that declares the units of its argument and its result, then
  gives the function and its inverse; Functions below describes it.

Definitions may appear in any order; a unit may be defined by one that
comes later. A name defined twice, a circular definition, a prefix whose
body has a dimension, a unit list that breaks the rules below, or a
function whose bodies do not fit their declaration is an error.

### Names

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

### Expressions

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

### Unit lists

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

### Functions

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
defined in the file takes one argument, so `tempC(1, 2)` and `tempC()`
are errors that say so.

Typed as the unit to convert to, a function's name asks for the reading
that gives the quantity, and the answer is written as the call that would
produce it: `tempF(212)` into `tempC` is `tempC(100)`, `300 K` into `tempF`
is `tempF(80.33)`, and `tempF(-40)` into `tempC` is `tempC(-40)`. The line
reads as what it is and can be typed back as a quantity. A function's name
is not a unit anywhere else: `2 tempC`, or `tempC` in a list, is an error
that shows the call form.

A function is defined by a line with its parameter in parentheses after
the name, and a body in three parts: the units of the argument and the
result in brackets, the expression that computes the function, and after a
`;` the expression that inverts it, in which the function's own name
stands for its value:

```
tempC(x)  [1;K]  x K + 273.15 K       ; tempC / K - 273.15
tempF(x)  [1;K]  (x + 459.67) degF    ; tempF / degF - 459.67
```

`[1;K]` says the argument is a plain number and the result a temperature.
The argument may have a unit of its own, declared in place of the `1`, and
a converted quantity is then written as a count of that unit inside the
call: with a function `dozen` declared `[in;ft]`, `2 ft` converted to
`dozen` is `dozen(2 in)`. Both bodies are checked when the file is loaded,
for the units they give against what they declare, without being evaluated
at any value, so a call can fail only for its argument (`tempC(1 m)`) or
for a value its body cannot compute (`recip(0)` for a body of `1 / x`). A function's name may not read as a prefix followed by a unit,
for the reason a list's may not, and no prefix applies to a function:
`ktempC(1)` is a call of nothing, not a thousand Celsius readings. There is no domain checking yet:
`tempC(-300)` is a negative temperature rather than an error. Nor can a
call be inverted inside an expression; only the unit to convert to may
name a function.

### Functions in expressions

Beside the functions the file defines, the app has built-in functions,
which go anywhere a unit goes and are called the same way. They are:

- `pi()`, the circle constant, as a call of no arguments so that it is
  computed to the precision in force; Euler's number is `exp(1)`, since
  `e` is the elementary charge.
- `exp`, `ln`, `log10`, `log2` and `log(b, x)`, the logarithm of `x` in
  the base `b`, written base first so that it reads as log-base-b of x.
- `sqrt`, `cbrt` and `pow(x, y)`. A power of a quantity is written with
  `^`, whose exponent is a literal (`(2 m)^2`, `m^(1/2)`); `pow` is for a
  number to a number, and its exponent may be anything computed, so
  `pow(2, sqrt(2))` and `2^0.1234567` are values.
- `sin`, `cos` and `tan` of an angle: `sin(30 deg)`, `sin(pi() radian /
4)`, `tan(1 radian)`. A plain number is not an angle, so `sin(1)` is an
  error that says to write `sin(1 radian)`.
- `asin`, `acos`, `atan` and `atan2(y, x)`, which return an angle, so
  `asin(0.5)` into `deg` is `30` and `atan2(3 m, 4 m)` into `deg` is
  `36.869898`; `asin(0.5)` into `turn`, or `asin(0.5) / radian`, is the
  number.
- `sinh`, `cosh`, `tanh`, `asinh`, `acosh` and `atanh`, of plain numbers.
- `approx(x)`, the value of `x` known to the working precision and no
  better: its argument is any quantity, its result has the argument's
  units, and it is the one way to make an exact value inexact on purpose,
  so `approx(2.54) cm` in `in` is `≈ 1` where `2.54 cm` in `in` is `= 1`.
  It never narrows a value that is already inexact.

Every built-in takes plain numbers, apart from the angles above, and
`exp(1 m)` is an error that names the dimension. A value the function
recognizes as exact is shown with `=` (`sqrt(9/4) = 1.5`, `log(2, 8) =
3`, `decibel(20) = 100`, `cos(0 radian) = 1`); the rest are computed to
the digits asked for and shown with `≈`, however round they look
(`ln(8) / ln(2) ≈ 3`). An argument outside a function's domain is an
error that says what the domain is (`ln(-1)`, `asin(2)`, `acosh(0.5)`),
one that cannot be told from an edge of it at any precision up to the
ceiling says so (`tan(90 deg)` at a pole), and a result whose exponent
would pass `10^18` is refused as too large (`exp(1e30)`, `sinh(1e30)`),
where `exp(1e6)` is `≈ 3.0332154e+434294`; the next section says why
`approx` does not change that.
No prefix applies to a function: `kpi()` is a call of nothing.

### Very large results and `approx`

`approx` says how well a value is known, not how large it is, so it
cannot rescue a result that is too large: `exp(approx(1e999))` is refused
exactly as `exp(1e999)` is. The message, that it is too large to compute,
covers two different limits.

A value is held as a mantissa times a power of ten. The settings limit
the mantissa: Digits and Most digits say how many of its digits must be
certain, and Most bits how large its numerator and denominator may grow.
The exponent has a fixed bound of its own, `10^18` either way, which is
not a setting. `1e999` is `1 × 10^999`, well within both. `exp(1e999)` has
a mantissa that 32 digits hold with ease and an exponent that is itself a
number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └────────── mantissa ───────────┘      └─────── exponent ───────┘
             the settings' part: Digits,            fixed, not a setting:
             Most digits and Most bits;             at most 10^18 either
             32 digits fit with ease                way; this one has 999
                                                    digits, 4.3 × 10^998
```

The exponential of `x` has the decimal exponent `x log10 e`, so `exp(x)`
is refused whenever `|x|` passes `10^18 ln 10`, about `2.3026e18`, with or
without `approx`: `exp(2.3e18)` is `≈ 3.9591004e+998877308377479203` and
`exp(2.31e18)` is refused. So is `exp(-1e999)`, whose exponent is as far
below the bound as `exp(1e999)`'s is above it, although the message says
"too large"; `sinh`, `cosh` and powers (`pow(10, 1e999)`, `10^1e999`)
share the limit. What `approx` does relax is Most bits, in a sum:
`1e999999999 + 1` is refused, since its exact value has a billion digits,
while `approx(1e999999999) + 1` is `≈ 1e+999999999`, the `1` absorbed into
the radius. It never changes an exponent.

Nor would `approx` help if the exponent were allowed, because of what the
exponential does to a radius: `exp(x ± r)` is `exp(x)` times a factor
between `e^-r` and `e^r`, so the argument's radius, in absolute terms,
becomes the result's relative error, and `exp` of a large argument needs
that argument to many more digits than the result shows. `exp(1e999)` to
32 digits needs `1e999` to about 1,033: its 1,000 digits before the point
and 33 after. `approx(1e999)` is `1e999` within one unit in its last
working digit, and the app computes at rising precisions until the digits
asked for are certain, so the radius shrinks with each pass; but at 32
digits, with Most digits 1,000 and Most bits 32,768, it stays above one,
where `exp` would have no digit to show, until the sixth pass:

```
                   log10 r, where r is the radius of approx(1e999)
            -400    -200      0      200     400     600     800     1000
pass  digits  ┊       ┊       ┊       ┊       ┊       ┊       ┊       ┊
  1      52                   ├─────────────────────────────────────●
  2      94                   ├───────────────────────────────────●
  3     178                   ├────────────────────────────────●
  4     346                   ├─────────────────────────●
  5     682                   ├────────────●
  6    1354     ●─────────────┤
              ┊       ┊       ┊       ┊       ┊       ┊       ┊       ┊
         digits certain ◄── r = 1 ──► no digit certain
```

| Pass | Working digits | `approx(1e999)`  | `exp` of it, were its exponent allowed                  |
| ---: | -------------: | ---------------- | ------------------------------------------------------- |
|    1 |             52 | `1e999 ± 1e948`  | within a factor of `e^(10^948)`: no digit certain       |
|    2 |             94 | `1e999 ± 1e906`  | within a factor of `e^(10^906)`: no digit certain       |
|    3 |            178 | `1e999 ± 1e822`  | within a factor of `e^(10^822)`: no digit certain       |
|    4 |            346 | `1e999 ± 1e654`  | within a factor of `e^(10^654)`: no digit certain       |
|    5 |            682 | `1e999 ± 1e318`  | within a factor of `e^(10^318)`: no digit certain       |
|    6 |          1,354 | `1e999 ± 1e-354` | within a relative `1e-354`: all 32 digits certain, done |

What the relative precision of `approx(1e999)` bounds is the precision
of the result's logarithm, not of the result: at the first pass the
exponent would be known to 51 of its 999 digits, and the mantissa not at
all. The app never gets that far today. At the first pass `exp` measures
its argument over the whole ball, finds that the result's exponent would
pass the bound, and refuses before computing anything; no later pass can
change that, so the refusal is the answer. Without `approx`, `exp(1e999)`
would be certain at the first pass, were its exponent allowed, since the
exponential of an exact argument works to as many extra digits as the
argument has: `approx` would cost it five passes.

So the settings are not what stands in the way. The sixth pass is within
the ceiling of 4,040 digits that Most digits of 1,000 gives, and its
1,354-digit midpoint fits Most bits of 32,768. A test build with the
exponent bound raised to `10^1100` answered `exp(1e999)` at the first
pass and `exp(approx(1e999))` at the sixth, each in under half a second,
with the value above: a 32-digit answer 1,034 characters long, most of
them the exponent. Raising the bound is a change to the number type, not
to `approx`, and `docs/approximate.md` records what it would take.

Until then, work in log space, as on paper: `1e999 / ln(10)` is the
decimal exponent of `exp(1e999)`, `≈ 4.3429448e+998`, and a quotient of
exponentials is the exponential of a difference, so `exp(1e999) /
exp(1e999 - 5)`, which is refused, is `exp(1e999 - (1e999 - 5))`, `≈
148.41316`. Keep the arguments exact there: the difference
`approx(1e999) - approx(1e999 - 5)` is `5` within about `2e948` at the
first pass, and `exp` refuses it for the size that radius allows,
although by the sixth pass it would be `5` within `2e-354`.

### Adding a unit

Append a line to `src/units.txt`, or edit one, and run `pnpm test`:
`src/units.test.ts` loads the file and fails with the offending definition
if it does not build. Keep a new unit in the section its kind belongs to,
prefer the exact factor from a defining document over a rounded one, and
say where the factor comes from in a comment when it is not obvious. Unit
lists have a section of their own at the end of the file, and
`src/units.test.ts` checks the list of them, so adding one means adding it
there too.

## Development

The app is built with [Lit](https://lit.dev) and [Vite](https://vite.dev),
written in TypeScript, formatted with [Prettier](https://prettier.io), and
uses [pnpm](https://pnpm.io) for package management.

**Every command goes through pnpm. Never run `npm`, `npx`, `yarn` or
`corepack` in this repository, by hand, in a script, or in a hook.** The
supply-chain settings in `pnpm-workspace.yaml` (a minimum release age, a
trust policy, no install scripts without an explicit decision, no running
scripts against a stale `node_modules`) are pnpm's and protect nothing when
another tool installs or runs a package; `package.json` declares pnpm as
the package manager and the other tools refuse to run under that
declaration (`npx`, for one, stops with `EBADDEVENGINES`). The equivalents:

| Instead of                    | Run                                        |
| ----------------------------- | ------------------------------------------ |
| `npm install`, `npm ci`       | `pnpm install`                             |
| `npm run <script>`            | `pnpm <script>`                            |
| `npx <bin>` of a dependency   | `pnpm exec <bin>`                          |
| `npx <package>` not installed | Do not. Add it as a `devDependency` first. |

`pnpm dlx` is the one pnpm command that installs outside the lockfile, and
Deployment below says why it is not used either.

### Prerequisites

- Node.js 24 (the current LTS line) or newer. pnpm refuses to run on an older
  Node.js (`ERR_PNPM_BAD_RUNTIME_VERSION`); `pnpm env use --global lts`
  installs a suitable one.
- pnpm 12. The exact version is pinned in `package.json`; pnpm 10 or newer
  switches to it automatically.

A Claude Code cloud session gets both from the repository's own setup (see
Cloud environment below), so nothing above has to be done there by hand.

### Commands

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm install`      | Install the dependencies the lockfile records.      |
| `pnpm dev`          | Start the development server with hot reloading.    |
| `pnpm build`        | Type-check and build a production bundle in `dist`. |
| `pnpm preview`      | Serve the production bundle locally.                |
| `pnpm typecheck`    | Type-check without building.                        |
| `pnpm test`         | Run the tests with Node's built-in test runner.     |
| `pnpm bench`        | Run the performance benchmarks (see Benchmarks).    |
| `pnpm format`       | Format all source files with Prettier.              |
| `pnpm format:check` | Verify that all source files are formatted.         |

The lockfile is frozen for every install, everywhere, not only in CI:
`frozenLockfile: true` in `pnpm-workspace.yaml` makes `pnpm install` fail
when `pnpm-lock.yaml` is out of step with `package.json`, rather than
rewrite it. The lockfile changes only when a dependency is changed on
purpose, with `pnpm add`, `pnpm remove` or `pnpm update`, which the setting
does not affect; the resulting lockfile change is committed and reviewed
with the `package.json` change it belongs to. There is no reason to pass
`--frozen-lockfile` by hand, and no reason ever to pass
`--no-frozen-lockfile`. (The one place the flag is still written out is the
cloud session hook, so that the hook reads as what it does.)

Run `pnpm format` before every commit: the repository is expected to be
formatted with Prettier at all times, and `pnpm format:check` is how that is
verified.

The service worker is only registered in production builds, so `pnpm dev`
never caches anything. To try the offline behavior, run `pnpm build` and then
`pnpm preview`, load the page once, and reload it with the network disabled
(or with the preview server stopped).

### Cloud environment

Sessions of Claude Code on the web (claude.ai/code) run in a container that
starts from a base image with Node.js 22 on its `PATH` and no dependencies
installed, so the project supplies its own environment in three parts, each
a file in the repository:

- `scripts/cloud-setup.sh` is the environment's **setup script**. The cloud
  runs it once, as root and with no repository checked out, and snapshots
  the filesystem for later sessions. It installs Node.js 24 and pnpm 12 (the
  exact versions pinned at its top, each verified against the checksum its
  publisher provides) under `/opt/node24`, and nothing else, since a
  snapshot cannot hold per-session state.
- `scripts/cloud-env` holds the environment's **variables**, one `KEY=VALUE`
  per line after the comments. The project needs none to build, test or
  run; the file says what is deliberately absent and why, and sets the one
  policy variable that is there.
- `.claude/hooks/session-start.sh` is the **SessionStart hook**, registered
  in `.claude/settings.json` and run by Claude Code at the start of every
  session before its first command. It puts `/opt/node24/bin` first on the
  session's `PATH` (the shells a session runs commands in are not login
  shells, so the setup script's `profile.d` entry does not reach them) and
  runs `pnpm install --frozen-lockfile`. It does nothing outside the cloud,
  and it fails with a message naming the setup script if the toolchain is
  missing.

The hook is read from the repository, but the setup script and the
variables are **pasted copies**: the environment's settings on claude.ai
(the cloud environment menu in a session's title bar, then Edit) hold the
text of `scripts/cloud-setup.sh` under Setup script and the assignments of
`scripts/cloud-env` under Environment variables, and neither is read from
the repository at session start. When either file changes, paste it again;
when the pinned pnpm version in `package.json` or the Node.js line in
`engines` changes, bump the pins at the top of the setup script (their
comments name the fields they mirror) and paste it again.
`scripts/cloud-setup.test.ts` enforces the second half of that: it fails
`pnpm test` when the script's pins disagree with `package.json` or with
the integrity strings in `pnpm-lock.yaml`, and its message says which pin
to bump and to paste the script again. The pasting itself cannot be
checked from the repository, so the failing test is the reminder. A
session that starts with the wrong toolchain, or with `npx` or `npm` on
its path, is what this arrangement exists to prevent; if one does, the
hook's output at session start says which part is out of date.

### Layout

- `index.html` is the single page Vite serves and builds. It links the web app
  manifest and sets the theme color that installed copies of the app use.
- `src/main.ts` is the entry point. It registers the app's components and the
  service worker.
- `src/core/` is the pure conversion core that `ARCHITECTURE.md` describes:
  no I/O, no DOM, and failures returned as `Result` values. Each module has
  a `*.test.ts` beside it.
- `src/units.txt` is the system definitions file: the units and prefixes the
  app knows, described under Unit definitions above. `src/units.test.ts`
  checks that it builds and that a sample of its units converts as its
  sources say.
- `src/testing/` is test support, not part of the app: the seeded random
  source that the core's property tests and the benchmarks draw from.
- `bench/` holds the performance benchmarks of the core, run by
  `pnpm bench` (see Benchmarks below); `ARCHITECTURE.md` describes them.
- `src/app-shell.ts` defines `<app-shell>`, the top-level component that every
  part of the app renders inside. It loads the unit table when it is
  connected, shows a loading message until it arrives, and hands it to the
  converter.
- `src/system-table.ts` fetches `units.txt`, which the build emits as an
  asset of its own, and parses it, once; `src/system-build.ts` builds the
  table from it at the ceiling of the retry schedule the settings give,
  once per ceiling, and `src/system-build.test.ts` checks that memo.
- `src/settings.ts` holds the settings (see Settings above): reading and
  validating them from the browser's storage, clamping the ones that
  depend on others, saving them, and turning them into the context the
  core computes with, whose ceiling is derived from the "most digits"
  setting.
  `src/settings.test.ts` checks the parsing under Node.js with a fake
  storage.
- `src/limits.ts` is the probe behind the "Recommend limits" button: it
  times the app's costliest operations on this device and proposes the two
  limits. `src/limits.test.ts` checks it against a fake clock.
- `src/unit-converter.ts` defines `<unit-converter>`, the two inputs and the
  output area that make up the app; `ARCHITECTURE.md` ("UI") describes it.
- `src/messages.ts` turns the errors the core returns into the sentences the
  converter shows. It has no DOM dependency, so `src/messages.test.ts` checks
  the wording under Node.js.
- `src/register-service-worker.ts` registers `sw.js` once the page has loaded,
  in production builds only.
- `src/sw.ts` is the service worker (see Offline behavior below).
- `src/index.css` holds the few global styles for the document. Component
  styles live in each component.
- `public/manifest.webmanifest` is the web app manifest that makes the app
  installable, and `public/icons/` holds the icons it points to. They are the
  source of every icon the app has (see Icons below).
- `vite-plugin-icons.ts` is the Vite plugin that renders the PNG icons that
  some platforms need from the SVG ones, at build time and on request during
  development. `rasterize-svg.ts` does the rendering without any dependencies,
  and `rasterize-svg.test.ts` checks it.
- `vite-plugin-precache.ts` is the Vite plugin that builds the service worker
  and injects the list of files to cache into it. `vite.config.ts` enables it.
  `vite-plugin-precache.test.ts` checks the injection (see Offline behavior
  below).
- `tsconfig.json` type-checks three separate programs, each with its own
  config, because they need different `lib` settings: `tsconfig.app.json`
  covers the app (`dom`), `tsconfig.sw.json` the service worker
  (`webworker`, which cannot be combined with `dom` in one program), and
  `tsconfig.node.json` the Vite config and plugin (Node.js), along with the
  tests and benchmarks, which run under Node.js and need its types, and the
  core they exercise. The options they share live in `tsconfig.base.json`.
- Components use TypeScript's `experimentalDecorators`, as Vite's own Lit
  template does, because Vite does not yet transform standard (TC39)
  decorators.
- `pnpm-workspace.yaml` holds the pnpm settings, including the supply-chain
  protections described in the comments there.
- `wrangler.jsonc` configures the Cloudflare Workers deployment (see
  Deployment below).
- `.env` holds wrangler's system environment variables. It is committed, so it
  must never contain secrets; those belong in the gitignored `.env.local`.
- `scripts/cloud-setup.sh` and `scripts/cloud-env` are the setup script and
  the environment variables of the Claude Code cloud environment, and
  `.claude/hooks/session-start.sh` with `.claude/settings.json` the hook
  that runs at the start of each of its sessions (see Cloud environment
  above). The two under `scripts/` are pasted into the environment's
  settings and kept in sync by hand; `scripts/cloud-setup.test.ts` fails
  when the setup script's version pins drift from `package.json` or
  `pnpm-lock.yaml`.

### Benchmarks

`pnpm bench` runs the performance benchmarks in `bench/`. They take a few
seconds and need nothing beyond Node.js. Each prints the timings it measured
as diagnostics, for comparison with an earlier run on the same machine:

```
ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)
```

A benchmark fails when a cost no longer scales with the size of its input
as it should, not when a timing is slow, so a failure is a regression
whatever the machine. Run them after any change to the core's data
structures or algorithms, alongside `pnpm test`, and add one when a change
introduces a cost that a later change could quietly undo. `ARCHITECTURE.md`
("Benchmarks") describes how they are built and what each one asserts.

### Offline behavior

The app is cached in full the first time it is loaded and served from that
cache from then on, so it works offline and loads instantly. Updates are picked
up automatically after a deploy. The pieces involved:

- **Precaching.** When `src/sw.ts` is installed, it downloads every file of the
  build into a cache named after the build's version: the page, the hashed
  scripts and styles, and everything in `public/`, except the app icons (see
  Icons below for why). Requests for those files are then answered from the
  cache without touching the network; any other same-origin request goes to
  the network as usual. The page is cached under
  `/` and served for navigations regardless of the query string.
- **The precache manifest.** The service worker does not know what the build
  contains, so `vite-plugin-precache.ts` builds it as a second entry point of
  `vite build`, emitted unhashed as `dist/sw.js` (its location decides the
  scope it controls, which must be the whole site), and prepends a
  `__PRECACHE__` constant listing the URL of every other file in `dist`, minus
  the ones its `exclude` option in `vite.config.ts` rules out, along with a
  version hashed from all of their contents. That constant is generated
  code, so the plugin makes sure file names cannot end up as anything but
  strings in it: the manifest is serialized with `JSON.stringify` (JSON is a
  subset of JavaScript, so its output is always a valid expression), every URL
  is validated against a conservative character set first, and the result is
  parsed with Vite's own JavaScript parser and rejected unless it starts with
  a `const` declaration whose value is a literal of plain objects, arrays and
  strings. `pnpm test` covers these checks.
- **Updates.** Because the version is derived from the contents of the build,
  any change to the app changes `sw.js`, and browsers check for a changed
  worker on every navigation (at most once a day, bypassing the HTTP cache).
  A new worker installs in the background, downloading the new build into a
  new cache while the current one keeps serving, and takes over once every tab
  running the old version has closed. At that point it deletes the old cache.
  Nothing tells the user that an update is waiting; that is a good first
  feature to add on top of this skeleton.
- **Installation.** `public/manifest.webmanifest` gives the app its name,
  icons, and standalone display mode. The icons are SVG, which Chromium-based
  browsers accept for installation. Safari ignores manifest icons and needs a
  PNG `apple-touch-icon`, which the build renders from the SVG (see Icons
  below).

### Icons

The SVG files in `public/icons/` are the only icon sources; every other form
of the icon is rendered from them, so changing an SVG updates them all on the
next build. Nothing rendered is committed.

- `icon.svg` is the regular icon, with its own rounded corners, and
  `icon-maskable.svg` is the maskable variant: it fills its whole square and
  keeps its content inside the safe zone, for platforms that cut the icon into
  their own shape. The manifest points at both.
- `apple-touch-icon.png` is what Safari uses for the iOS home screen, since
  it ignores the manifest's icons and cannot use SVG there. `index.html` links
  it, and it is placed at the site root, where iOS also looks for it by name.
  It is rendered at 180 pixels (the largest size iOS uses, 60 points at 3x)
  from the maskable variant, because iOS rounds the corners itself and shows
  transparent pixels as black, so a full-bleed square is the right source.

`vite-plugin-icons.ts` does the rendering. It is configured in
`vite.config.ts` with a list of PNGs to make (source SVG, output file name and
size), and adds each one to the bundle on every `vite build`, so they end up
in `dist` like every other file. During `pnpm dev` it renders them on request
instead, from the current SVG. To add a PNG, add an entry to the list; nothing
needs to be checked in.

The icons, rendered and SVG alike, are deliberately left out of the service
worker's precache (the `exclude` option of `precache()` in `vite.config.ts`).
The browser or OS fetches an icon when the app is installed, which happens
online, and keeps its own copy with the installed app; the page never requests
icons itself. Precaching them would make every visitor download the whole
icon set on their first visit, which with several sizes can outweigh the app,
and would ship a new service worker on every icon change, for no benefit. The
favicon is the exception and stays precached, because the browser requests it
on every page load.

How a changed icon reaches users is up to each platform, and the service
worker plays no part in it on any of them: the worker only sees the page's
own requests, and browsers only check it for updates when the page is
visited, while icons are never requested by the page. On iOS the home screen
icon is copied when the user adds the app and never fetched again; only
removing and re-adding the app picks up a new one, and nothing served by the
site can change that. Chromium-based browsers re-read the manifest when an
installed app is launched, at most once a day, and fetch its icons from the
network as part of that check. A changed icon URL is what that check is
guaranteed to notice, so an icon that must update reliably there should get a
new file name (and a matching manifest entry) rather than new contents under
the old name. Precaching would not have helped either platform: on iOS
nothing re-fetches, and on Chromium the check goes to the network regardless.
At worst, a precached icon could have been served to that check from the
cache, which is one more reason to leave icons out.

Node.js cannot render SVG on its own, and the alternatives (a native or
WebAssembly rendering library, or a headless browser) all add a dependency,
which this project avoids where it reasonably can; Cloudflare Workers Builds,
which runs the deploy, has no browser to lean on either. So `rasterize-svg.ts`
is a small rasterizer of its own, written for the subset of SVG that flat
icons use: the basic shapes and paths (with curves and arcs), transforms,
solid colors with opacity, both fill rules, and strokes with every cap and
join. Its header comment lists exactly what it accepts. Anything outside that
subset, such as gradients, `style` attributes, text or filters, fails the
build with a message naming the feature, rather than rendering it wrong. The
strictness is deliberate: it is what makes the SVG safe to treat as the
source of truth. If an icon ever needs something beyond the subset, either
extend the rasterizer or replace the call in `vite-plugin-icons.ts` with a
rendering library; the plugin and the rest of the build do not care how the
PNG is made.

### Deployment

The site is deployed to Cloudflare Workers as static assets, with Cloudflare
Workers Builds running these commands from the repository root:

| Step   | Command                     |
| ------ | --------------------------- |
| Build  | `pnpm run build`            |
| Deploy | `pnpm exec wrangler deploy` |

`wrangler.jsonc` holds the Worker name, the assets directory (`dist`), and the
compatibility date. Keep the compatibility date as recent as the pinned
wrangler supports, and bump it whenever wrangler is updated.

Wrangler sends usage telemetry to Cloudflare unless told otherwise, and its
[telemetry docs](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/telemetry.md)
describe the opt-outs. This project turns it off in two places so that it stays
off for every contributor and for Workers Builds, without anyone running
`wrangler telemetry disable` on their own machine:

- `send_metrics: false` in `wrangler.jsonc` is the documented project-level
  setting.
- `WRANGLER_SEND_METRICS=false` in `.env` is a belt-and-braces backstop. Wrangler
  (as of 4.130.0) sends its "autoconfig" events without reading the project
  config, so `send_metrics` alone does not silence them, but the environment
  variable does, and wrangler loads `.env` before those events are sent.

Either setting is overridden by `DO_NOT_TRACK=1` in the environment, which
also disables telemetry.

`wrangler` is a pinned `devDependency`, so the deploy uses the exact version
recorded in `pnpm-lock.yaml`, installed by the same `pnpm install` that the
build step already runs and covered by the same supply-chain settings as every
other dependency. Do not deploy with `pnpm dlx wrangler`: `dlx` installs the
newest wrangler into a temporary directory on every deploy, and that install
fails under `strictDepBuilds` because two of wrangler's dependencies, `esbuild`
and `workerd`, ship install scripts. Those scripts are explicitly denied under
`allowBuilds` in `pnpm-workspace.yaml` (see the comment there for why they are
not needed), which satisfies the strict policy without running any third-party
code at install time.

### Style guide

- **Reference source files with relative paths and static assets with
  root-absolute paths.** In `index.html`, anything Vite transforms (files under
  `src/`) is referenced as `./src/main.ts`, while files in `public/` are
  referenced as `/favicon.svg`. Vite accepts either form for source files, so
  this is a convention for readers rather than a requirement: a relative path
  makes it obvious that the file is part of the source tree and that Vite
  resolves and rewrites the reference at build time, whereas a root-absolute
  path signals a static asset that is served from the URL root and copied to
  the build output verbatim. The same applies inside modules: import other
  source files with relative paths such as `./app-shell.ts`.
