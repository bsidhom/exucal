# The expression language

Everything you type into Exucal is written in one small language. The
have, the quantity you type, is a text in it. So is the want, what you
convert it into, and so is the body of each definition in the
definitions file ([The definition language](definitions.md)). The
calculator first reads such a text into an expression, built from
numbers, names, the operators `*`, `/`, `+`, `-` and `^`, parentheses,
calls of functions, and factors written side by side, and then it
evaluates the expression. A few rules fix the reading, and the reading
decides what is computed. `1/2 in` is a quantity per inch and not half
an inch. A space before `(` makes a product where no space makes a
call. The exponent of `^` is read from the text as a number, so that a
dimension is never computed. A text the grammar does not read is
stopped by the reading, as it is typed, and is an error. A number that
no setting of the significand limit could hold, or that passes the
exponent bound, is stopped by the reading too, and is a refusal.
Everything else fails, if it fails, when the expression is evaluated. A
number past the significand limit as it is set is one such failure
([Errors](#errors)). [Numbers](numbers.md) says what a value
is, and [Quantities](quantities.md) says what a quantity is. The rules
here say how a typed text becomes a quantity, and how the app writes an
expression back as text.

Each example gives what you type, what you convert it into where that
matters, and what Exucal shows. The shown text is the result side of an
output line, with the relation, `=` or `≈`, in front of the value.
Where a line's left side is the point, the example quotes the whole
line. The typed forms paste straight into the have and want fields.
Where the calculator reports an error, the table says so and describes
the message in a few words; [Errors](#errors) says how a message is
worded.

An expression follows these rules:

- **A text groups by six levels of binding**, loosest first: `+` and
  `-`; `*` and `/`; negation; juxtaposition; `^`; and the atoms, a
  number, a name, a call or a parenthesized expression. The two-sided
  operators of one level are read left to right
  ([Grammar and precedence](#grammar-and-precedence)).
- **A number is an unsigned decimal with an optional exponent, read exactly.**
  A number past a size limit is refused ([Numbers](#numbers)).
- **A name takes every letter, digit and underscore that follows its first character**,
  and it means a unit, a prefix and a unit, a function, a list or, in a
  function's body, a parameter. A unit's own name wins over a prefix
  and a unit ([Names](#names)).
- **Juxtaposition multiplies and binds tighter than `*` and `/`.** A
  number may only start a juxtaposition, and `^` takes an exponent
  written as a number, never computed ([Operators](#operators)).
- **A call is a name directly followed by `(`.** A function takes a
  fixed count of arguments, or a range, and a call with another count
  is an error before any argument is computed
  ([Calls and arity](#calls-and-arity)).
- **The have is one expression**, and its error is reported before the
  want's ([The have field](#the-have-field)).
- **The want is read by its shape**: blank, a list's name, a function's
  name, one expression, or items separated by `;`
  ([The want field](#the-want-field)).
- **Operands are computed left to right, and the first failure ends the computation**,
  quoting the part at fault
  ([Evaluation order and error locations](#evaluation-order-and-error-locations)).
- **The app writes an expression back in one canonical text, which pastes back.**
  The screen shows `×` for a product's `*`, and the copy button writes
  `*` ([What the app writes back](#what-the-app-writes-back)).
- **Some texts do not read as they look**, `1/2 in` and `-2^2` among
  them ([Pitfalls](#pitfalls)).
- **Any character the grammar does not read is an error as it is typed.**
  The typographic characters people type, `×`, `÷` and `²` among them,
  each have a plain form to type instead
  ([What is not accepted](#what-is-not-accepted)).
- **An error names the first character that could not be read, or quotes the part at fault**
  ([Errors](#errors)).

## Grammar and precedence

A text groups by six levels of binding. Each construct binds as the
table says, loosest first, and the two-sided operators of one level
are read left to right.

| Level       | Construct                                                                | Grouping                                         | Example, and how it reads                                                                |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1, loosest  | sum and difference: `+`, `-`                                             | left to right                                    | `5 ft - 2 in + 1 in` is `(5 ft - 2 in) + 1 in`                                           |
| 2           | product and quotient: `*`, `/`                                           | left to right                                    | `m/s*s` is `(m/s)*s`                                                                     |
| 3           | **negation**: one `-` before a product of factors written side by side   | once; it does not stack                          | `-2 m / s` is `(-(2 m)) / s`; `--2` is an error                                          |
| 4           | **juxtaposition**: factors written side by side, with a space or without | left to right; a number only as the first factor | `kg m / s^2` is `(kg m) / (s^2)`; `1/12 year` is `1 / (12 year)`                         |
| 5           | power: one `^` and an exponent written as a number                       | one exponent per factor                          | `-2^2` is `-(2^2)`; `m^2^3` is an error                                                  |
| 6, tightest | an atom: a number, a name, a call or an expression in parentheses        | none                                             | `2.54`, `ft`, `tempC(100)`, `(1/12)`; `kg(m/s)` is a call and `kg (m/s)` a juxtaposition |

So `2 kg * 3 m/s^2` is read as `((2 kg) * (3 m)) / (s^2)`: the power
first, then each juxtaposition, then the product and the quotient from
the left. In the want, `;` separates the items of a unit list and binds
looser than all of these ([The want field](#the-want-field)).
[Operators](#operators) says what each operator does.

Whitespace is spaces and tabs, any amount. It may stand before and
after the text, between any two of its parts, around every operator and
inside parentheses: `m ^ 2` and `atan2( 1 , 2 )` are read as `m^2` and
`atan2(1, 2)`. It never stands inside a number or a name. A space
between a name and `(` is allowed, and it makes a juxtaposition of the
two where no space makes a call ([Calls and arity](#calls-and-arity)).

## Numbers

A **number** is an unsigned decimal with an optional exponent: `2`,
`2.54`, `.5`, `5.`, `1e-3`, `1E3` and `2E+2` are numbers. Exucal's own
term for a typed number is a literal, and the word has that one meaning
throughout. A number is read exactly, as the fraction it denotes, so
`0.1 + 0.2` is exactly `0.3` and a unit defined by a decimal converts
exactly
([Exact and inexact values](numbers.md#exact-and-inexact-values)). A
sign is part of a number only in its exponent: `1e-3` is a thousandth,
`2 -3` is the difference `2 - 3`, and `-2` is the negation of `2`. The
exponent belongs to the number only when it is written without a space
and has digits. The predefined definitions file names the elementary
charge `e`, so `2e-19 C` is one number followed by a unit, `2e -19 C`
is `2 e - 19 C`, and `2e` is `2 e`, a number and a name, since an
exponent needs digits. No space and no comma stands inside a number:
`1 000`, `1,000` and `2,54` are errors as they are typed
([What is not accepted](#what-is-not-accepted)).

| You type    | Into | Exucal shows            | Note                                                  |
| ----------- | ---- | ----------------------- | ----------------------------------------------------- |
| `2.54`      |      | `= 2.54`                |                                                       |
| `.5`        |      | `= 0.5`                 |                                                       |
| `5.`        |      | `= 5`                   |                                                       |
| `1E3`       |      | `= 1000`                |                                                       |
| `2E+2`      |      | `= 200`                 | a `+` sign in an exponent                             |
| `0.1 + 0.2` |      | `= 0.3`                 | read exactly                                          |
| `2 -3`      |      | `= -1`                  | a difference, not a signed number                     |
| `2e-19 C`   | `C`  | `= 2e-19 C`             | one number                                            |
| `2e -19 C`  | `C`  | `≈ -19 C`               | `2 e - 19 C`: two elementary charges less 19 coulombs |
| `2e`        | `C`  | `≈ 3.2043533e-19 C`     | `2 e`                                                 |
| `1 000`     |      | an error as it is typed | write `1000`                                          |

### The limits on a number

A typed number is checked against the two size limits every value is
checked against, the exponent bound and the significand limit, and each
refuses what it cannot hold
([Values too big to hold](numbers.md#values-too-big-to-hold)). The
exponent bound is a bound on the value's power of ten as scientific
notation writes it, and not on the exponent as typed. A number whose
value has a power of ten past `10^18`, or below `-10^18`, is refused as
it is typed: `0.001e1000000000000000003` is a value, and
`12e1000000000000000000` is refused. A number with more digits than the
significand limit holds is refused when the expression is computed, in
exact mode and in decimal mode alike, and inside `approx`. The limit
refuses the number rather than cutting it to fit. A number longer than
any setting of the limit could hold is stopped by the reading instead,
as it is typed. In decimal mode a number within the limit is rounded to
the working digits as it is read
([The two modes](numbers.md#the-two-modes)).

| You type                    | Into | Exucal shows                                                          | Note                                                        |
| --------------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `0.001e1000000000000000003` |      | `= 1e+1000000000000000000`                                            | within the exponent bound                                   |
| `12e1000000000000000000`    |      | refused as it is typed: the value's power of ten passes `10^18`       |                                                             |
| `1e-1000000000000000001`    |      | refused as it is typed: the value's power of ten falls below `-10^18` |                                                             |
| `1.23456789012`             |      | `= 1.2345679`                                                         | decimal mode at eight working digits: rounded as it is read |

## Names

A **name** is a letter or an underscore, alone or followed by letters,
the digits `0` to `9` and underscores. A letter is a letter of any
script, so `µm`, `Ω`, `Å`, `degF` and `N_A` are names. Nothing else is
part of a name: `°`, `%`, `'`, a superscript such as `²` and an accent
typed as a separate mark are not. So `m²` is an error as it is typed,
and the square is written `m^2`. Names are case-sensitive: `mm` and
`Mm` are two names, and so are `S` and `s`. A name takes every letter,
digit and underscore that follows its first character: `m2` is the
name `m2`, not `m` squared, and `2m` is `2 m`, since a name cannot
start with a digit.

### What a name means

A name that does not name a function or a list means the unit of that
name if there is one, and otherwise one prefix followed by a unit:
`km` is `k` + `m`, and `kilometre` is `kilo` + `metre`. Six rules
govern that reading.

- A unit's own name wins over a prefix and a unit, so `min` is the
  minute and not `m` + `in`.
- The reading is never a choice: the definitions file is checked as it
  loads so that no name reads as two different prefix-and-unit pairs
  ([Names](definitions.md#names)).
- Prefixes do not stack: `kkm` is an unknown unit.
- There is no plural handling: `inches` is an unknown unit unless the
  file defines it as an alias.
- Prefixes and units are separate namespaces, so `m` is both the prefix
  milli and the unit metre, and `h` is both the prefix hecto and the
  unit hour.
- Inside a function's body, a parameter's name wins over any unit of
  that name ([Functions](definitions.md#functions)).

The rule can make a familiar symbol another unit: `dB` is `d` + `B`, a
tenth of a byte, and the decibel is the function `decibel`; `at` is
`a` + `t`, an attotonne, and not an atmosphere.
[Names that are absent or mean something else](units.md#names-that-are-absent-or-mean-something-else)
lists such names, and [Units](units.md) says which names the predefined
definitions file gives.

### Functions and lists

Prefixes apply to units alone. The name of a function, defined in the
file or built into the app, is looked up as written, never as a prefix
and a name, so `ktempC(1)` is an error, a call of an unknown function.
A function's name, or a unit list's, is not a unit. `tempC` typed in
the have is an error whose message says so and shows the call form. A
list's name is looked up only where it stands alone as the want, and
anywhere else it is an unknown unit, so `time` typed in the have is one
([The want field](#the-want-field)). Outside a function's body, a name
has one meaning: a unit, with or without a prefix, a function or a
list. The definition language page says what the file checks to keep
it so, and which names it may not give ([Names](definitions.md#names)).

| You type      | Into | Exucal shows                                                                  | Note                                   |
| ------------- | ---- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `1 µm`        | `m`  | `= 1e-6 m`                                                                    | a prefix and a unit, in another script |
| `1 km`        | `m`  | `= 1000 m`                                                                    | `k` + `m`                              |
| `1 kilometre` | `m`  | `= 1000 m`                                                                    | `kilo` + `metre`                       |
| `1 min`       | `s`  | `= 60 s`                                                                      | the unit's own name wins: the minute   |
| `1 hm`        | `m`  | `= 100 m`                                                                     | the prefix `h`                         |
| `1 h`         | `s`  | `= 3600 s`                                                                    | the unit `h`                           |
| `1 Mm`        | `m`  | `= 1000000 m`                                                                 | not `mm`                               |
| `m2`          |      | an error: unknown unit `m2`                                                   | one name                               |
| `Ft`          |      | an error: unknown unit `Ft`                                                   | case-sensitive                         |
| `1 kkm`       |      | an error: unknown unit `kkm`                                                  | prefixes do not stack                  |
| `1 dB`        |      | `= 0.8 bit`                                                                   | `d` + `B`                              |
| `1 at`        | `kg` | `= 1e-15 kg`                                                                  | `a` + `t`                              |
| `ktempC(1)`   |      | an error: unknown function `ktempC`                                           | no prefix on a function                |
| `tempC`       |      | an error: `tempC` is a function, not a unit; the message shows `tempC(value)` |                                        |
| `time`        |      | an error: unknown unit `time`                                                 | a list's name is not a unit            |

## Operators

### `+` and `-`

`+` and `-` add and subtract, at one level, left to right, and they
bind loosest of all, so `2 m * 3 + 1 m` is `(2 m * 3) + (1 m)`. The two
sides must conform, that is, agree in dimension and in kind
([Conformance](quantities.md#conformance)). `1 m + 1 s` is an error, a
length and a time, and `1 rad + 1` is an error, an angle and a plain
number. `1 m + 0` is an error too, since `0` is a plain number and not
a length. A difference may be zero or negative.

| You type        | Into | Exucal shows                   | Note                   |
| --------------- | ---- | ------------------------------ | ---------------------- |
| `1 ft + 3 in`   | `in` | `= 15 in`                      |                        |
| `2 m * 3 + 1 m` |      | `= 7 m`                        | `(2 m * 3) + (1 m)`    |
| `1 m + 1 s`     |      | an error, a dimension mismatch | the sides must conform |
| `1 m + 0`       |      | an error, a dimension mismatch | `0` is a plain number  |
| `1 m - 2 m`     |      | `= -1 m`                       | a negative difference  |

### `*` and `/`

`*` and `/` multiply and divide, at one level, left to right, and
juxtaposition binds tighter than either.

| You type    | Into | Exucal shows | Note                                 |
| ----------- | ---- | ------------ | ------------------------------------ |
| `m/s*s`     |      | `= 1 m`      | `(m/s)*s`                            |
| `6 m / 2 s` |      | `= 3 m / s`  | `(6 m) / (2 s)`: juxtaposition first |

### Negation

A negation, a `-` before a product, negates the factors written side
by side after it and nothing more: `-2 m` is minus two metres, and
`2 * -3` is minus six. It binds tighter than `*` and `/` and looser
than juxtaposition and `^`. Write `(-2)^2` for the square of minus two.
A negation is one sign on a product, not an operator that can be
applied again, so it does not stack: `--2` is an error as it is typed.
Write `-(-2)`. A negation may follow `+`, `-`, `*` or `/`, so `2 - -3`
is `5`. The grammar has no unary `+`: `+2` and `2 * +3` are errors as
they are typed. A `+` that is a sign and not an operator is accepted
only in a number's exponent, `2E+2`, and on a `^` exponent, `m^+2` and
`m^(+3/2)`.

| You type   | Into | Exucal shows            | Note                      |
| ---------- | ---- | ----------------------- | ------------------------- |
| `2 * -3 m` | `m`  | `= -6 m`                | a negation after `*`      |
| `-2^2`     |      | `= -4`                  | `-(2^2)`                  |
| `(-2)^2`   |      | `= 4`                   | the square of minus two   |
| `2 - -3`   |      | `= 5`                   | a negation after `-`      |
| `--2`      |      | an error as it is typed | write `-(-2)`             |
| `+2`       |      | an error as it is typed | no unary `+`              |
| `m^+2`     |      | `= 1 m^2`               | a `+` sign on an exponent |

### Juxtaposition

Juxtaposition multiplies the factors written side by side: `2 m` is
two metres, and `kg m` is a kilogram metre. It means a count of a unit
or a product of units, so a number may only be the first factor, and a
number after a factor is an error as it is typed: `m 2`, `2 3 m` and
`5 ft 3 in` are errors. Two numbers are multiplied with `*` or with
parentheses, `2 * 3` or `2 (3)`, and five feet three inches is
`5 ft + 3 in`.

| You type    | Into | Exucal shows            | Note                              |
| ----------- | ---- | ----------------------- | --------------------------------- |
| `2 m`       |      | `= 2 m`                 | a count of a unit                 |
| `kg m`      |      | `= 1 m kg`              | a product of units                |
| `m 2`       |      | an error as it is typed | a number only as the first factor |
| `5 ft 3 in` |      | an error as it is typed | write `5 ft + 3 in`               |
| `2 (3)`     |      | `= 6`                   | two numbers multiplied            |

### `^`

`^` raises a factor to an exponent written as a number, never as an
expression, so that the dimension of a power is fixed by the reading
and never computed ([A quantity](quantities.md#a-quantity)). The
exponent takes one of two forms.

- A number with an optional sign, bare or in parentheses: `m^2`,
  `s^-1`, `m^+2`, `m^0.5` and `m^(2)`.
- In parentheses, such a number over an unsigned one: `m^(1/2)` and
  `m^(-3/2)`.

Any other exponent is an error as it is typed: `m^x`, `m^(1/2 + 1)`
and `m^(1/-2)` are errors, and so is a zero divisor, `m^(1/0)`. `^` is
a suffix on one factor, not an operator between two expressions, so a
factor takes one exponent: `2^3^2` is an error as it is typed. Write
`(2^3)^2`. `^` binds tightest of the operators, so `m^1/2` is
`(m^1) / 2`, half a metre. The sign of an exponent is written against
its digits: `m^-1` is a power, and `m^- 1` is an error as it is typed.

An exponent is held as a fraction of two whole numbers, with no power
of ten of its own, so a power of ten written in an exponent costs its
digits: `1e-30000` as an exponent is held as one over `10^30000`, while
the same text as a value has a power of ten that costs nothing
([How a value is held](numbers.md#how-a-value-is-held)). The fraction
is reduced, so `m^(2/4)` is `m^(1/2)`. Its numerator and denominator
must fit the significand limit as it is set: `2^(1e30/1e30)` is `2`,
its fraction being `1`, while `2^1e-30000` is refused. An exponent that
no setting of the limit could hold, `m^1e999999999`, is refused as it
is typed, as such a number is. `pow` differs here. It raises a plain
number to a computed exponent, so `pow(2, 1e-30000)` is `≈ 1`
([Built-in functions](builtins.md)).

| You type           | Into | Exucal shows                                          | Note                                     |
| ------------------ | ---- | ----------------------------------------------------- | ---------------------------------------- |
| `m^0.5`            |      | `= 1 m^(1/2)`                                         | a decimal exponent                       |
| `m^(3/2)`          |      | `= 1 m^(3/2)`                                         | a fraction as the exponent               |
| `m^x`              |      | an error as it is typed                               | the exponent must be a number            |
| `m^(1/0)`          |      | an error as it is typed: the exponent divides by zero |                                          |
| `m^1e999999999`    |      | refused as it is typed, at any setting of the limit   |                                          |
| `2^2 - 1`          |      | `= 3`                                                 | `^` binds tightest                       |
| `m^1/2`            |      | `= 0.5 m`                                             | `(m^1) / 2`                              |
| `2^3^2`            |      | an error as it is typed                               | write `(2^3)^2`, which is `= 64`         |
| `m^(2/4)`          |      | `= 1 m^(1/2)`                                         | the fraction reduced                     |
| `2^(1e30/1e30)`    |      | `= 2`                                                 | the fraction fits the limit              |
| `2^1e-30000`       |      | refused: past the significand limit                   | the exponent's denominator is `10^30000` |
| `pow(2, 1e-30000)` |      | `≈ 1`                                                 | a computed exponent                      |

### Parentheses

Parentheses group any expression: `(1/12) year` is a twelfth of a
year. A factor in parentheses may follow a number: `2 (3 m)` is `6 m`.

| You type      | Into | Exucal shows  | Note                                  |
| ------------- | ---- | ------------- | ------------------------------------- |
| `(1/12) year` |      | `= 2629800 s` | a twelfth of a year                   |
| `2 (3 m)`     |      | `= 6 m`       | a parenthesized factor after a number |

## Calls and arity

A call is a name directly followed by `(`, zero or more expressions
separated by commas, and `)`: `tempC(100)`, `pi()` and
`atan2(3 m, 4 m)` are calls. A call applies the function of that name
to the expressions inside, its arguments, and each argument is any
expression. A call stands where a name may: `2 tempC(100)`,
`tempC(100)^2` and `-tempC(100)` mean what they look like.

A function takes a fixed count of arguments, its arity, or, for some
built-in functions, a range: `round(x)` and `round(x, places)` are both
calls of `round`, and `pi()` takes none. A call with another count is
an error that says how many the function takes, and it is reported
before any argument is computed. The count each built-in function
takes is in its entry
([Rules every built-in follows](builtins.md#rules-every-built-in-follows)),
and a defined function takes one argument per parameter
([Functions](definitions.md#functions)).

The space before `(` decides between a call and a juxtaposition.
`kg(m/s)` is a call of `kg`, which is not a function: the error's
message says so and shows the product with its space, `kg (m/s)`. In
the opposite direction, `tempC (1)` is a juxtaposition of `tempC` and
`(1)`, a product, and `tempC` is not a unit: the message says so and
shows the call form. `pi ()` is an error as it is typed, since the `()`
after the space is an empty pair of parentheses and not a list of
arguments.

| You type          | Into  | Exucal shows                                                                  | Note                                 |
| ----------------- | ----- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `tempC(100)`      |       | `= 373.15 K`                                                                  | one argument                         |
| `pi()`            |       | `≈ 3.1415927`                                                                 | no arguments                         |
| `atan2(3 m, 4 m)` | `deg` | `≈ 36.869898 deg`                                                             | two arguments                        |
| `2 tempC(100)`    |       | `= 746.3 K`                                                                   | a call as a factor                   |
| `-tempC(100)`     |       | `= -373.15 K`                                                                 | a call negated                       |
| `round(2.345, 2)` |       | `= 2.34`                                                                      | the second argument of a range       |
| `round(1, 2, 3)`  |       | an error: `round` takes 1 to 2 arguments                                      |                                      |
| `pi(1)`           |       | an error: `pi` takes no arguments                                             |                                      |
| `sqrt(bogus, 1)`  |       | an error: `sqrt` takes 1 argument                                             | reported before `bogus` is looked up |
| `kg(m/s)`         |       | an error: `kg` is a unit, not a function; the message shows `kg (m/s)`        | a call                               |
| `tempC (1)`       |       | an error: `tempC` is a function, not a unit; the message shows `tempC(value)` | a juxtaposition                      |
| `pi ()`           |       | an error as it is typed                                                       | the call is `pi()`                   |

## The have field

The have is one expression and nothing more: a `;` in the have is an
error as it is typed. While the have is blank, nothing is computed,
whatever the want holds. The have is read and computed before the want,
so a failure of the have is reported before one of the want, even
before a want that cannot be read. `bogus` into `ft;` reports the
unknown unit `bogus`. [The two fields](app.md#the-two-fields) says
which field an error marks on the screen.

| You type | Into    | Exucal shows                   | Note                            |
| -------- | ------- | ------------------------------ | ------------------------------- |
| `bogus`  | `ft;`   | an error: unknown unit `bogus` | the have's error first          |
| `1 m`    | `bogus` | an error: unknown unit `bogus` | the have is sound               |
| `1 m;ft` |         | an error as it is typed        | `;` is not accepted in the have |

## The want field

The want is read by its shape, and each shape answers in its own way
([How a conversion is answered](quantities.md#how-a-conversion-is-answered)).

| The want holds                           | It is read as                                                                                                                                                                                       | Example                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| nothing                                  | the have alone, in the primitives                                                                                                                                                                   |                                |
| the name of a unit list, alone           | that list ([Unit lists](quantities.md#unit-lists))                                                                                                                                                  | `time`                         |
| the name of a defined function, alone    | a conversion into the function, which answers with the call that gives the have ([Conversion into a function](quantities.md#conversion-into-a-function)); a function without an inverse is an error | `tempF`                        |
| any other single expression              | a quantity to measure the have in, which may carry a number, be a sum or be a call; the answer is the ratio of the two                                                                              | `in`, `1000 ft`, `tempC(1)`    |
| two or more expressions separated by `;` | a unit list typed out, checked by the same rules as a defined list ([Unit lists](quantities.md#unit-lists))                                                                                         | `ft;in`, `hr;min;s`, `ft;in/8` |

A `;` stands only between the items of the want: never in the have,
never inside parentheses, and never with an item missing. `ft;`, `;in`,
`ft;;in` and `(ft;in)` are errors as they are typed. A list's name or
a function's name is read as the list or the function only when it
stands alone ([Names](#names)). Words are names, not instructions:
`1 m in ft` typed as the have is a volume, since `in` is the inch, and
`to` and `per` are unknown units. The unit to convert into goes in the
want.

| You type    | Into       | Exucal shows                | Note                         |
| ----------- | ---------- | --------------------------- | ---------------------------- |
| `1 in`      |            | `= 0.0254 m`                | a blank want: the primitives |
| `3661 s`    | `time`     | `= 1 hr + 1 min + 1 s`      | a list by name               |
| `300 K`     | `tempF`    | `= tempF(80.33)`            | a function by name           |
| `1 m`       | `in`       | `≈ 39.370079 in`            | one unit                     |
| `1 mi`      | `1000 ft`  | `= 5.28 × 1000 ft`          | a unit with a number         |
| `373.15 K`  | `tempC(1)` | `≈ 1.3611162 tempC(1)`      | a call as an expression      |
| `1 m`       | `ft;in`    | `≈ 3 ft + 3.3700787 in`     | a list typed out             |
| `1 m`       | `ft;in/8`  | `≈ 3 ft + 26.96063 in / 8`  | each item any expression     |
| `1 m`       | `ft;`      | an error as it is typed     | an item missing              |
| `1 m`       | `(ft;in)`  | an error as it is typed     | `;` never in parentheses     |
| `1 m in ft` |            | `= 0.00774192 m^3`          | `in` is the inch             |
| `1 m to ft` |            | an error: unknown unit `to` |                              |

## Evaluation order and error locations

Once a text has been read, its parts are computed from the left, and
the first failure is reported: `bogus / 0` reports the unknown unit
and never reaches the division. The message quotes the part at fault.

- A division by zero, or by a value that cannot be told from zero,
  quotes the divisor: `1 / (2 - 2)` quotes `(2 - 2)`.
- A power whose base cannot be told from zero, when the result depends
  on which side of zero the base lies, quotes the base:
  `((2^(1/2))^2 - 2)^(1/2)` quotes `((2^(1/2))^2 - 2)`. A power that
  fails for another reason is quoted whole: `(-8)^(1/2)`, an even root
  of a negative value.
- A sum, product, quotient or power refused for its size quotes the
  operation refused and nothing around it: `2 m * 3^100000` quotes
  `3^100000`.
- A number past the significand limit quotes the number.
- A sum whose sides do not conform quotes both sides.
- A call with the wrong count of arguments quotes the call, and a call
  whose argument does not conform quotes the argument.

The have's error is reported before the want's
([The have field](#the-have-field)).

| You type                  | Into | Exucal shows                                                | Note                               |
| ------------------------- | ---- | ----------------------------------------------------------- | ---------------------------------- |
| `bogus / 0`               |      | an error: unknown unit `bogus`                              | the division is never reached      |
| `1 / 0 + bogus`           |      | an error: division by zero in `0`                           | `bogus` is never looked up         |
| `1 / (2 - 2)`             |      | an error: division by zero in `(2 - 2)`                     | the divisor                        |
| `((2^(1/2))^2 - 2)^(1/2)` |      | an error: the base cannot be told from zero                 | the base alone is quoted           |
| `(-8)^(1/2)`              |      | an error: an even root of a negative value                  | the whole power is quoted          |
| `2 m * 3^100000`          |      | refused: `3^100000` would need a significand past the limit | the power alone is quoted          |
| `1 m + 1 s + bogus`       |      | an error, a dimension mismatch: `1 m` against `1 s`         | the first sum fails first          |
| `tempC(20 m)`             |      | an error, a dimension mismatch: `m` against `1`             | the parameter takes a plain number |

## What the app writes back

Every output line writes both its sides as text: the have on the left,
as it was read, and the result on the right. The result's value is
written as [How numbers are written](numbers.md#how-numbers-are-written)
says; the have, and the expression around the value, are written as
here. The text is **canonical**: one text for one expression, whatever
typing produced it. The spelling is the app's and not yours, with the
fewest parentheses that keep the reading, so `((ft + in))` is written
`ft + in` and `m^(2)` is written `m^2`. Of the text, one thing is
promised: it pastes back as the same expression. On the screen, a
product written with `*` is shown with `×`, which the fields do not
accept. The copy button copies the result side with `*`, so what you
copy pastes back, where text selected on the screen may not.

| You type      | Into      | The line Exucal writes           | Note                                   |
| ------------- | --------- | -------------------------------- | -------------------------------------- |
| `2m`          |           | `2 m = 2 m`                      | the spacing is the app's               |
| `((ft + in))` |           | `ft + in = 0.3302 m`             | the fewest parentheses                 |
| `m^(2)`       |           | `m^2 = 1 m^2`                    | the fewest parentheses                 |
| `1/(2 in)`    |           | `1 / 2 in ≈ 19.685039 × (1 / m)` | none needed: juxtaposition binds first |
| `2 * 3 m`     |           | `2 × 3 m = 6 m`                  | `×` on the screen                      |
| `1 mi`        | `1000 ft` | `1 mi = 5.28 × 1000 ft`          | the result copied as `5.28 * 1000 ft`  |

## Pitfalls

Some texts do not read as they look. The commonest is a fraction
before a unit, which is read with the juxtaposition first: `1/12 year`
is `1 / (12 year)`, a frequency. Write `year / 12` or `(1/12) year`.
For the same reason `1/2 in` is `1/(2 in)`, a quantity per inch, where
`(1/2) in` and `0.5 in` are half an inch, and `1 m + 1/2 m` is an
error, `1 m` plus `1 / (2 m)`. Write `1 m + m/2`.

| You type      | Into | Exucal shows                   | Note                            |
| ------------- | ---- | ------------------------------ | ------------------------------- |
| `1/2 in`      |      | `≈ 19.685039 × (1 / m)`        | `1/(2 in)`, a quantity per inch |
| `(1/2) in`    |      | `= 0.0127 m`                   | half an inch                    |
| `0.5 in`      |      | `= 0.0127 m`                   | half an inch                    |
| `1 m + 1/2 m` |      | an error, a dimension mismatch | `1 m` plus `1 / (2 m)`          |
| `1 m + m/2`   |      | `= 1.5 m`                      |                                 |

The other readings to watch each have their rule in the section
linked:

- `m^1/2` is half a metre, and `-2^2` is `-4`
  ([Operators](#operators)).
- `2 -3` is the difference `2 - 3`, and `2e-3` is one number
  ([Numbers](#numbers)).
- `2e -19 C` is `2 e - 19 C`, two elementary charges less nineteen
  coulombs ([Numbers](#numbers)).
- `5 ft 3 in` and `m 2` are errors as they are typed, since a number
  may only start a juxtaposition ([Operators](#operators)).
- `kg(m/s)` is a call and `kg (m/s)` a juxtaposition; `tempC (1)` is a
  juxtaposition and `pi ()` an error as it is typed
  ([Calls and arity](#calls-and-arity)).
- `m^x` and `2^3^2` are errors as they are typed, since `^` takes one
  exponent, written as a number ([Operators](#operators)).
- `m2` is a name, `m²` is an error as it is typed, and `Ft` is not
  `ft` ([Names](#names)).
- `1 dB` is `d` + `B`, and `1 at` is `a` + `t` ([Names](#names)).
- `1 m in ft` typed as the have is a volume
  ([The want field](#the-want-field)).

## What is not accepted

Any character the grammar cannot read where it stands is an error as it
is typed. A line break is one, and so is any whitespace other than a
space or a tab. The table shows some of the characters people type from
other notations, each with the plain form to type instead.

| You type | Instead write                  |
| -------- | ------------------------------ |
| `2 × 3`  | `2 * 3`                        |
| `2 · 3`  | `2 * 3`, or `2 (3)`            |
| `2 ÷ 3`  | `2 / 3`                        |
| `2 − 3`  | `2 - 3`, with the hyphen-minus |
| `m²`     | `m^2`                          |
| `2 ** 3` | `2^3`                          |
| `30°`    | `30 deg`                       |
| `50%`    | `50 percent`                   |
| `1,000`  | `1000`                         |
| `2,54`   | `2.54`                         |

Comparisons and the other marks of a definition, `=`, `<`, `<=`, `>`,
`>=`, `≤`, `≥`, `|`, `~` and `:`, have no meaning in an expression and
belong to the definitions file
([The definition language](definitions.md)). `#` starts a comment
there and nowhere in an expression. `[`, `]`, `'` and `"` belong to
nothing: the foot and the inch are `ft` and `in`.

## Errors

Where the text cannot be read, the message names the first character
the calculator could not read, and then what could have come there
instead, such as a number, a name, an operator, a parenthesis or the end
of the text. The message reads
`Unexpected end of input: expected …` where the text ends too soon, and
`Unexpected "c": expected …` where a character `c` cannot follow what
came before. A number refused as it is typed is quoted with its reason.
Where the text has been read but cannot be computed, the message quotes
the part at fault and says what failed
([Evaluation order and error locations](#evaluation-order-and-error-locations)).
The three messages below are examples of the shapes a message takes,
not a list of the messages.

| You type                 | The message                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `3 m ^`                  | `Unexpected end of input: expected a number or "(".`             |
| `12e1000000000000000000` | `"12e1000000000000000000": this number's exponent passes 10^18.` |
| `1 / (2 - 2)`            | `Division by zero in "(2 - 2)".`                                 |
