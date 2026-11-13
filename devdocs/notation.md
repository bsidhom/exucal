# The ratio notation

The **ratio notation** writes an exact value entire, as an integer or as
a ratio of two integers in lowest terms, instead of rounding it to the
display digits. `1 m` into `in` is `= (5000/127) in` under the ratio
notation and `≈ 39.370079 in` without it.
[How numbers are written](../docs/numbers.md#how-numbers-are-written) in
the user docs gives the rule a user needs, and
[Notation and ratio width](../docs/settings.md#notation-and-ratio-width)
gives the setting. The mechanism behind the rule is described here, with
each design decision, its reasons and the alternatives ruled out.

Three words differ from the user docs:

- A **ratio** is always the written form `n/d`. "Fraction" is kept for
  the form that a value is held in, a fraction times a power of ten
  ([`Scaled`](numbers.md#scaled)). The user docs say "fraction" for
  both.
- An integer is the whole number of the user docs.
- The **decimal display** is the mechanism that writes a value as
  digits, rounded to a count of significant digits. It is the digits
  display of the user docs. It serves both modes, and its name does not
  refer to decimal mode.

Every value is a `Ball`: a midpoint, which is an exact number, and a
radius that bounds the error of the midpoint. A value is exact when its
radius is zero ([The types](numbers.md#the-types)).

The decimal display cannot write every exact value entire. `5000/127`
has no last digit, so the decimal display rounds it to the display
digits, and the line says `≈`
([Certification and the display rule](numbers.md#certification-and-the-display-rule)).
The ratio `5000/127` is the whole value.

The ratio notation is one value of a setting. The notation setting
belongs to exact mode
([The two modes](../docs/numbers.md#the-two-modes)) and has two values:
`digits`, the default, and `ratio`, which carries a width. The setting
changes how a value is written and nothing else:

- An expression evaluates to the same ball under either value of the
  setting.
- The arithmetic never reads the setting. The `NumberContext`, which
  holds the settings of the arithmetic, does not include it. Two pieces
  of code read it: `show`, which writes the text of a value, and the
  outcome, the module that composes the output lines
  ([Where it lives](#where-it-lives)).

The design rests on these decisions, each described in the section
linked:

- **Five rules, tested in order, write a value.** They read the value,
  its exactness, the width and the display digits, and nothing else
  ([The rule](#the-rule)).
- **The width counts the digits of an exact value written entire.** It
  is independent of the display digits, and its default is twenty
  ([The width](#the-width)).
- **The printer decides the parentheses around a ratio.** The outcome
  composes each line as an expression, and the printer parenthesizes it
  from the precedence levels of the grammar
  ([Where a ratio is written](#where-a-ratio-is-written)).
- **Every literal written has to parse back.** For that reason a
  rounding that carries a value past the exponent bound, the limit on a
  value's power of ten, is refused and not written. Two cases under the
  ratio notation fail the requirement today
  ([Every literal parses back](#every-literal-parses-back)).
- **The ratio notation applies in exact mode alone**
  ([Not in decimal mode](#not-in-decimal-mode)).
- **The ratio notation writes no other form.** A ratio for an inexact
  value, a mixed form, a decimal at the width and a ratio for a count of
  a unit list are ruled out ([Not in this design](#not-in-this-design)).

## The rule

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states the rule as a user reads it. `show` in `display.ts` applies it as
five rules. The rules use three terms:

- The **width** `W` is the most digits that an exact value written
  entire may have. It is the ratio notation's own setting.
- The display digits `p` are the significant digits that the decimal
  display rounds to.
- The **canonical** form is the one form that a value is held in: a
  fraction in lowest terms times a power of ten. The exponent is chosen
  so that the denominator has no factor of two or five and the numerator
  is not divisible by ten ([`Scaled`](numbers.md#scaled)). `2.54` is
  held as `254 × 10^-2`, `1/2` as `5 × 10^-1`, and a third of `10^30` as
  `1/3 × 10^30`.

A value is written by the first rule that applies:

1. **An inexact value is written by the decimal display at `p`,** with
   `≈`.
2. **An exact integer is written entire** when it has at most `W`
   significant digits. The decimal display writes it, at `W` digits.
3. **An exact value that is not an integer is written as its ratio,**
   the quotient `n/d` of two integers in lowest terms, when `n` and `d`
   have at most `W` digits between them.
4. **A value whose ratio does not fit is written as a scaled ratio,**
   its canonical fraction times its power of ten, `a/b × 1e+k`, when `a`
   and `b` have at most `W` digits between them and `b` is not one.
5. **Every other exact value is written by the decimal display at `p`,**
   with `=` where that display writes every digit held and `≈`
   otherwise.

The rules read the value, its exactness and the two settings, and
nothing internal to the calculation. Any rule for the ratio notation has
to keep to that, so that a user can tell from the two settings how a
given value is written
([How numbers are written](../docs/numbers.md#how-numbers-are-written)).

In the examples below, the text typed is the have, and the want is the
unit in the "Into" column, or blank where a table has no such column.
The settings are the defaults with the ratio notation, a width of twenty
and eight display digits, unless a row says otherwise.

### Rule 1: an inexact value

The midpoint of an inexact value is an exact number, and it describes
the computation, not the value. After `sqrt(2)`, the midpoint is the
digits of the root that were computed, over a power of ten. A ratio of
those digits is true of the midpoint and says nothing true about
`sqrt(2)`. So an inexact value keeps the decimal display
([Certification and the display rule](numbers.md#certification-and-the-display-rule)).

The rule tests the radius, not the midpoint. `sqrt(2) / sqrt(2)` has a
midpoint of exactly `1` and a radius above zero, so it is written as a
decimal.

| You type            | Exucal shows                   | Note                             |
| ------------------- | ------------------------------ | -------------------------------- |
| `sqrt(2)`           | `≈ 1.4142136`                  |                                  |
| `sqrt(2) / sqrt(2)` | `≈ 1`                          | the midpoint is exactly `1`      |
| `sin(pi() radian)`  | `≈ 0 (within 2e-4049 of zero)` | as the decimal display writes it |

### Rule 2: an integer

An integer is a ratio whose denominator is one, and `3486784401/1` says
nothing that `3486784401` does not. So an integer is written as a
number, and its significant digits count against the width as the two
parts of a ratio do.

`show` rounds the integer to `W` digits. When the rounding leaves it
unchanged, `format` in `scaled.ts`, the code of the decimal display,
writes it at `W` digits. `format` writes every significant digit. It
writes the trailing zeros too, unless the integer has more than `W`
digits with them, and then it moves them into an exponent. An integer of
more than `W` significant digits goes on to rule 5.

| You type | Exucal shows             | Note                                  |
| -------- | ------------------------ | ------------------------------------- |
| `3^20`   | `= 3486784401`           | ten digits                            |
| `2^64`   | `= 18446744073709551616` | twenty digits                         |
| `5e11`   | `= 500000000000`         | twelve digits with its zeros          |
| `10^20`  | `= 1e+20`                | twenty-one digits with its zeros      |
| `2^100`  | `≈ 1.2676506e+30`        | thirty-one significant digits: rule 5 |

### Rule 3: a ratio

The ratio of rule 3 is the value as one quotient, with the power of ten
of the canonical form multiplied into the fraction. `ratioParts` in
`display.ts` multiplies it in and reduces, so `254 × 10^-2` is written
`127/50`. Rule 3 never shows how a value is stored. A ratio is not
rounded, so the rounding mode plays no part in it.

The width measures the digits of the two parts together. The sign, which
is written on the numerator, and the slash are not counted. The width
bounds the length of the text written, and the two parts together are
that length to within the sign and the slash. `1/123456789012347` has a
numerator of one digit and a denominator of fifteen, so it is sixteen
digits long. A width of sixteen admits it, and a width of fifteen does
not. A bound on each part is ruled out: with such a bound, a width of
twenty admits a ratio of forty digits.

Rule 3 applies to every exact value that is not an integer, a
terminating decimal included. `2.54` is written `127/50`, though the
decimal display writes it exactly. Writing a ratio only where the
decimal display rounds has one merit: under that rule the setting only
ever turns a `≈` line into a `=` line. It is ruled out. A ratio shows
which two integers a value is the quotient of, which its digits do not
show, and a user who chooses the ratio notation asks to see that.

`ratioParts` forms the quotient only when it can fit, so that no long
integer is built for a value that goes on to rule 4 or 5. With `k` the
canonical exponent, it tests that `k` lies within `4W` of zero and that
the canonical numerator has at most `3W` digits. Nothing is formed for a
value that fails either test. `1e999999999/3` reaches rule 4 without an
integer of a billion digits being built.

Every value whose quotient fits passes both tests, for these reasons:

- For `k` above zero, the numerator of the quotient is the canonical
  numerator times `10^k`. It has more than `k` digits, so `k` is below
  `W`, and the canonical numerator has fewer than `W` digits.
- For `k` below zero, write `m` for `-k`. Before it is reduced, the
  quotient is the canonical numerator over the canonical denominator
  times `10^m`. The canonical numerator is not divisible by ten, so it
  has twos or fives and never both, and reducing leaves at least `2^m`
  in the denominator. `2^m` has about `0.3 × m` digits, so `m` is below
  about `3.3 × W`.
- For `k` below zero, the numerator of the quotient then has at most
  about `W - 0.3 × m` digits. The canonical numerator is at most `5^m`
  times as large, which adds about `0.7 × m` digits. So the canonical
  numerator has at most about `W + 0.4 × m` digits, which is under
  `2.4 × W`.

The margins of the two tests, `4W` against `3.3 × W` and `3W` against
`2.4 × W`, cover the rounding of the digit counts.

| You type            | Into | Exucal shows              | Note                              |
| ------------------- | ---- | ------------------------- | --------------------------------- |
| `1 m`               | `in` | `= (5000/127) in`         | seven digits                      |
| `2.54`              |      | `= 127/50`                | held as `254 × 10^-2`             |
| `1e-7`              |      | `= 1/10000000`            | nine digits                       |
| `2^-63`             |      | `= 1/9223372036854775808` | twenty digits                     |
| `-5000/127`         |      | `= -5000/127`             | at a width of seven: seven digits |
| `1/123456789012347` |      | `= 1/123456789012347`     | at a width of sixteen             |
| `1/123456789012347` |      | `≈ 8.1000001e-15`         | at a width of fifteen: rule 5     |

### Rule 4: a scaled ratio

The parts of a scaled ratio are the canonical form's own: `a/b` is the
canonical fraction and `k` is the canonical exponent. The canonical form
puts every factor of ten in the exponent, so the value alone fixes the
split. Four decisions shape the rule:

- **The power of ten is not counted against the width.** The decimal
  display treats its exponent the same way: the exponent is not counted
  against the display digits.
- **The power is written after the ratio, as a multiplier.** The text
  then reads, left to right, as the ratio times the power. A power
  inside the numerator, `1e+30/3`, is ruled out. Its numerator is a
  literal in exponent form, and the text no longer reads as a ratio of
  two integers.
- **Rule 3 comes first.** A ratio that fits without a power is written
  without one: `1e-7` is `1/10000000`, never `1/1 × 1e-7`. A scaled
  ratio is written only for a value that otherwise goes to the decimal
  display.
- **A denominator of one is excluded.** The value is then an integer or
  a terminating decimal, `a × 10^k`, and the decimal display writes the
  digits of `a` with an exponent. `15/1 × 1e-1000000000` writes the
  digits of `1.5e-999999999` with a slash added.

The canonical form moves the tens of a numerator into the exponent. So
at a small width rule 4 writes ratios that rule 3 writes at the default:
`5000/127` has seven digits, and at a width of six it is written
`5/127 × 1e+3`.

| You type            | Into | Exucal shows           | Note                         |
| ------------------- | ---- | ---------------------- | ---------------------------- |
| `(1/3) * 1e30`      |      | `= 1/3 × 1e+30`        |                              |
| `(1/3) * 1e-30`     |      | `= 1/3 × 1e-30`        |                              |
| `(5000/127) * 1e30` |      | `= 5/127 × 1e+33`      | the tens are in the exponent |
| `1e999999999/3`     |      | `= 1/3 × 1e+999999999` |                              |
| `1 m`               | `in` | `= (5/127 × 1e+3) in`  | at a width of six            |

### Rule 5: every other exact value

Rules 2 to 4 leave two groups of exact values to the decimal display at
`p`. The first is an integer of more than `W` significant digits. The
second is a value whose ratio does not fit and whose scaled ratio either
does not fit or has a denominator of one.

The decimal display says `=` when rounding the value to `p` digits
leaves it unchanged, and `≈` otherwise. So a terminating decimal of at
most `p` digits is written exactly, and a longer one is rounded when its
ratio does not fit. The width measures a value that is not an integer by
its ratio and never by its decimal digits. `1.23456789012` has twelve
digits and is rounded at a width of twenty, where rule 2 writes the
integer `123456789012` entire.

| You type         | Exucal shows       | Note                                                       |
| ---------------- | ------------------ | ---------------------------------------------------------- |
| `1.5e-999999999` | `= 1.5e-999999999` | the canonical denominator is one                           |
| `1e-19`          | `= 1e-19`          | its ratio has twenty-one digits                            |
| `2.54`           | `= 2.54`           | at a width of four: `127/50` has five digits               |
| `1.23456789012`  | `≈ 1.2345679`      | its ratio has twenty-two digits                            |
| `5000/127`       | `≈ 39.4`           | at a width of three and three display digits               |
| `2^-63 / 1e100`  | `≈ 1.0842022e-119` | held as `5^63 × 10^-163`: the canonical denominator is one |

### The width

The range of the width is 1 to 1,000 digits (`WIDTH_LIMIT`). The top of
the range keeps a line to about a thousand characters. No other setting
bounds the width. It is independent of the display digits and of the
[precision limit](../docs/settings.md#precision-limit), which bounds
them. The default is twenty (`DEFAULT_WIDTH`), for three reasons:

- The ratios that conversions produce are short. `5000/127` and
  `1250/381`, the meter in inches and in feet, have seven digits.
  `25146/15625`, the mile in kilometers, has ten.
- The integers a user forms by hand fit. `2^64` has twenty digits, and
  `factorial(20)` has nineteen.
- Twenty digits is about the longest number that a person reads at a
  glance.

Three alternatives are ruled out:

- The default could be eight, the default of the display digits. That
  default keeps `3^20` rounded. It also makes the width look coupled to
  the display digits, which it is not.
- The width could have no bound, as its default or as a value that a
  user can choose. The significand limit is the setting that bounds the
  bits of a held fraction
  ([The significand limit](numbers.md#the-significand-limit)). An exact
  integer within its default can run to thousands of digits: `3^32767`
  has 15,634, and a raised limit allows more. A line of that length is
  not read. The top of the range serves a user who wants the longest
  lines the app writes.
- The fit could be tied to the display digits, with each part of a ratio
  fitting within them and no width. That fit couples a length to a
  precision: a user who raises the display digits to see `1/123456789`
  written as itself lengthens every decimal line too. It hides exact
  values: under it `3^20` is `≈ 3.4867844e+9` at eight display digits.
  And under it no setting says how long an exact value may be written.

## Where a ratio is written

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states where a ratio is parenthesized and why. Juxtaposition, writing
two factors side by side, binds tighter than `/`, so `5000/127 in` reads
as `5000/(127 in)`, a reciprocal length. No code decides the parentheses
of a ratio as such. The outcome composes each line as an expression, and
the printer writes the parentheses that the grammar needs.

### `show` says which form it wrote

`show` returns the text of a value with a `kind`, and `exact` is the
kind that is shown with `=`. The `exact` kind carries `fraction: true`
when its text is a ratio or a scaled ratio. The code calls a ratio a
fraction in that one name. For a scaled ratio the kind also carries the
power of ten as `scale`, a literal such as `1e+3`, beside the text of
the ratio. The scale is a field of its own, so the outcome and not
`show` decides how the product is written.

### The outcome composes the line

A conversion into one unit is written as two lines. The first gives the
have in the want's unit. The **reciprocal line** is the second, and it
gives the want's unit as a multiple of the have. `3 ft` into `in` is
written `= 36 in`, and its reciprocal line is `in = 1/36 × 3 ft`
([The converter and its lines](architecture.md#the-converter-and-its-lines)).

`quantityExpr` in `outcome.ts` builds the expression of each value:

- A ratio is a quotient of two literals. The sign of a negative value is
  a negation of the numerator.
- A scaled ratio is that quotient times its scale.
- `timesFirst` joins the value to the unit or the have that follows it.
  It joins the two by juxtaposition, except where the have leads with a
  number, as `3 ft` does. In that case it joins them with `*`, since a
  number cannot follow a factor by juxtaposition.

### The printer parenthesizes

The printer (`print.ts`) writes the fewest parentheses that read the
expression back as the same tree. The grammar gives each operator a
precedence level, and the printer parenthesizes an operand that binds
looser than its place in the expression allows. `*` and `/` share one
level and read left to right, and juxtaposition binds tighter. Three
cases follow for a ratio:

- **A ratio is parenthesized before a factor joined by juxtaposition.**
  A unit is such a factor. So is a negated have on the reciprocal line,
  which the printer parenthesizes too. The sign and the scale of the
  ratio are inside its parentheses.
- **A ratio is bare before `×`.** The quotient is the left operand of a
  product at its own level, so the grammar reads `1/36 × 3 ft` as
  `(1/36) × 3 ft`.
- **A ratio with nothing after it is bare.** A dimensionless result has
  no unit after it. A conversion into a function is written as a call,
  and the ratio is the argument of the call, with nothing after it
  inside the parentheses.

| You type    | Into    | Exucal shows       | Reciprocal line           |
| ----------- | ------- | ------------------ | ------------------------- |
| `1 m`       | `in`    | `= (5000/127) in`  | `in = 127/5000 × 1 m`     |
| `-1 m`      | `in`    | `= (-5000/127) in` | `in = (-127/5000) (-1 m)` |
| `3 ft`      | `in`    | `= 36 in`          | `in = 1/36 × 3 ft`        |
| `in`        | `m`     | `= (127/5000) m`   | `m = (5000/127) in`       |
| `1/3`       |         | `= 1/3`            | none                      |
| `tempC(37)` | `tempF` | `= tempF(493/5)`   | none                      |

The printer writes a quotient of two literals tight, `5000/127`, where
every other operator has a space on each side. It writes a product as
`×` on the screen and as `*` in the **copy text**, the text that the
copy button gives. At a width of six, the screen shows
`(5/127 × 1e+3) in` and the copy text is `(5/127 * 1e+3) in`.

### In a unit list

A unit list is a want of several units, such as `ft;in`. Its result is a
sum of terms: an integer count of each unit but the last, and a
remainder in the last unit. The ratio notation applies to the remainder.
Each count is written by the decimal display at the display digits,
under either value of the setting, and rule 2 does not apply to it. The
relation is `=` when every term is exact.

A rounded remainder can round up to a whole of the unit before it and
carry into the count of that unit. An exact remainder that fits as a
ratio or as a scaled ratio is written entire, so it is not rounded and
nothing carries. Every other remainder goes through `roundTerms`, the
rounding that every remainder gets under `digits`.

| You type | Into    | Exucal shows            | Note               |
| -------- | ------- | ----------------------- | ------------------ |
| `1 m`    | `ft;in` | `= 3 ft + (428/127) in` |                    |
| `1 m`    | `ft;in` | `≈ 3 ft + 3.3700787 in` | at a width of five |

## Every literal parses back

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states the principle: every result pastes back as input. The text pasted
is the copy text. The principle sets two requirements. The parser must
accept each literal that is written, and the text of a line with `=`
must evaluate to the value it was written from. The decimal display
meets them by refusing one rounding, under either value of the setting:
a rounding that carries a value past the exponent bound. The ratio
notation meets them except in two cases.

### A decimal at the exponent bound

The decimal display writes the decimal exponent of the value, the
exponent with one digit before the decimal point, and never the
canonical exponent. A value within the exponent bound has a decimal
exponent within `±10^18`
([The exponent bound](numbers.md#the-exponent-bound)), and the parser
accepts a literal at the bound.

One rounding passes the bound. A value whose decimal exponent is exactly
`10^18` can round up into the next power of ten at the display digits.
`9.5e1000000000000000000` at one display digit rounds to
`1e+1000000000000000001`, a value that no literal within the bound
writes. The outcome refuses that rounding as the bound's `overflow`, the
refusal that a computed value past the bound gets, and it writes no
line. The message names the rounding as the cause and quotes the have,
with the want in a conversion:

```text
Rounding "9.5e1000000000000000000" to the display digits causes an overflow: the rounded value's exponent would pass 10^18.
```

`numberExpr` in `outcome.ts` parses the text that `show` wrote. When
`parseDecimal`, the parser of a decimal literal, refuses that text as
past the bound, `numberExpr` returns the refusal, and
`describeRoundingRefusal` in `messages.ts` words it. A rounding never
lowers an exponent, so the bottom of the bound has no such case.

Writing the literal anyway is ruled out. A line written that way shows
the correctly rounded value and does not parse back.

Under the ratio notation, rule 2 writes such a value entire when it has
at most `W` significant digits, and nothing is rounded.

| You type                         | Settings                    | Exucal shows                        |
| -------------------------------- | --------------------------- | ----------------------------------- |
| `9.5e1000000000000000000`        | `digits`, one display digit | the refusal above                   |
| `9.99999999e1000000000000000000` | `digits`                    | the same refusal, quoting this have |
| `9.99999999e1000000000000000000` | `ratio`, width twenty       | `= 9.99999999e+1000000000000000000` |
| `1e1000000000000000000`          | `digits`                    | `= 1e+1000000000000000000`          |

### The literals of a ratio

A ratio is a quotient of two integer literals that have at most `W`
digits between them, and a scaled ratio adds its power of ten as a third
literal. Typed back, the text has to evaluate to the value it was
written from, exactly. Two cases fail that in today's behavior:

- A scale can lie past the exponent bound, which is a defect. The bound
  is on the decimal exponent, and the scale is the canonical exponent,
  which can be larger. `1e1000000000000000000 / 3 * 10` has a decimal
  exponent of `10^18`, within the bound, and its canonical form is `1/3`
  times ten to the power `10^18 + 1`. Its scaled ratio needs the literal
  `1e+1000000000000000001`, which is past the bound. The outcome throws
  on that value and composes no line
  ([#206](https://github.com/bsidhom/exucal/issues/206)).
- A denominator can pass a lowered significand limit. `ratioParts` tests
  the two parts against the width and never against that limit, and a
  typed literal is held within the limit as every value is. At the
  default limit of 65,536 bits every part fits, since an integer of
  1,000 digits needs at most 3,322 bits. A limit lowered below that can
  hold a value and refuse the denominator of its ratio, because the
  canonical form holds a power of five in a denominator as a power of
  two, in fewer bits. At the lowest limit, 358 bits, and a width of 200,
  `0.2^160` is held as `2^160 × 10^-160` and written as `1` over the 112
  digits of `5^160`. Typed back, that denominator needs 372 bits and is
  refused as past the significand limit. `0.2^150` parses back at the
  same settings.

## Not in decimal mode

[The two modes](../docs/numbers.md#the-two-modes) gives decimal mode's
rules: every step is rounded, and the rounded value is the step's exact
result. Every value shown there is a decimal of at most `p` digits,
which the decimal display writes entire
([Decimal mode](numbers.md#decimal-mode)). No value in decimal mode
needs a ratio to be written exactly, and the setting exists in exact
mode alone. Two mechanisms keep the ratio notation out of decimal mode:

- **The settings cannot hold the combination.** `ModeSetting` in
  `settings.ts` nests the notation setting inside exact mode. Decimal
  mode carries no notation, so `ratioOf`, which reads the ratio settings
  out of the settings, has none to return for it.
- **`outcomeOf` gives `show` the ratio settings in exact mode alone.**
  `outcomeOf` is the entry of the outcome. The context, which holds the
  mode, and the ratio settings are two of its arguments, and nothing in
  the signatures ties them. So `outcomeOf` drops the ratio settings when
  the mode of the context is decimal. A caller that passes ratio
  settings with such a context gets the decimal display.

The quotients that are computed for a line are steps of decimal mode
too, each rounded once. The value of `1 m` in inches is rounded to
`39.370079` before `show` writes it.

| You type (decimal mode) | Into | Exucal shows     |
| ----------------------- | ---- | ---------------- |
| `1 m`                   | `in` | `= 39.370079 in` |
| `1/3`                   |      | `= 0.33333333`   |

## Not in this design

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states which forms the ratio notation writes. Four further forms are
ruled out:

- An inexact value could be written as the simplest ratio within its
  ball. The radius makes that ratio well defined, unlike the ratio of
  the midpoint that [rule 1](#rule-1-an-inexact-value) sets aside. It is
  ruled out all the same. The decimal display says what is known of an
  inexact value and no more, and a ratio written with `≈` reads as a
  claim about the value that the ball does not make.
- An exact value whose ratio does not fit could be written in a mixed
  form, such as `39 + 47/127` for `5000/127`. The mixed form writes the
  value in three numbers where the ratio writes it in two. Before a unit
  it needs parentheses as a ratio does: `39 + 47/127 in` reads as
  `39 + 47/(127 in)`, a sum whose terms do not conform.
- An exact decimal whose ratio does not fit could be written entire at
  the width, as an integer is under rule 2. The ratio notation has no
  such form, and [rule 5](#rule-5-every-other-exact-value) rounds the
  value to `p` digits where it has more.
- A count of a unit list, or the have, could be written as a ratio. A
  count is an integer by construction. The have is the user's own text,
  and the printer writes each of its literals as it was typed.

## Where it lives

These modules hold the ratio notation:

- `scaled.ts` holds `format`, the code of the decimal display.
- `display.ts` holds `show(ball, { digits, rounding, ratio })`. The
  settings of the ratio notation are a type of their own,
  `RatioDisplay`, which holds the width alone. A setting added to the
  ratio notation then reaches every caller of `show` without a change of
  signature. `ratioParts` writes rules 3 and 4, and `show` itself tests
  rule 2. The `exact` kind of `Shown` carries `fraction` and `scale`.
- `outcome.ts` holds `outcomeOf`, which passes the ratio settings to
  `show` in exact mode alone. `quantityExpr` and `timesFirst` compose
  the ratio into the line, and `numberExpr` returns the refusal of a
  rounding past the bound. The reciprocal line and the remainder of a
  unit list are written here.
- `print.ts` holds the printer: the parentheses, from the precedence
  levels of the grammar, the tight quotient of two literals, and `×` for
  the screen where the copy text gets `*`.
- `messages.ts` holds `describeRoundingRefusal`.
- `unit-converter.ts` holds the converter component, whose `ratio`
  property is absent under `digits`. `app-shell.ts` sets the property
  from the settings with `ratioOf`.
- `settings.ts` holds `Notation`, `ModeSetting`, `DEFAULT_WIDTH`,
  `WIDTH_LIMIT`, the range of the width in `rangesOf`, and `ratioOf`.
