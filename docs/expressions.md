# The expression language

Exucal has one small expression language, and everything you type is
written in it: the have, the want you convert it into, and the body of
each definition in the definitions file
([The definition language](definitions.md)). An expression is built
from factors joined by operators or written side by side, as in
`2 kg * 3 m/s^2`. A **factor** is a number, a name, a call or an
expression in parentheses. Two rules decide most of what a text means:
factors written side by side multiply and bind tighter than `*` and
`/`, and every word is a name, never an instruction. So `1/2 in` is
half per inch, and `1 m in ft` is a volume. The calculator parses the
text you type into an expression and then computes it. A text that does
not parse is an **error as it is typed**, reported as you type and
before the text is computed. A text that parses may still fail when it
is computed. [Numbers](numbers.md) says what a value is, and
[Quantities](quantities.md) says what a quantity is.

An expression follows these rules:

- **An expression binds at six levels**, which the table under
  [Grammar and precedence](#grammar-and-precedence) gives, loosest
  first.
- **A number is an unsigned decimal with an optional exponent**, read
  exactly in exact mode, and a number past a size limit is refused
  ([Numbers](#numbers)).
- **A name starts with a letter or an underscore and takes every letter, digit and underscore after it**,
  and it means a unit, a prefixed unit, a function, a list or, in a
  function's body, a parameter ([Names](#names)).
- **Factors written side by side multiply and bind tighter than `*` and `/`**
  ([Operators](#operators)).
- **`^` takes one exponent per factor, typed as a number or a fraction and never computed**
  ([Operators](#operators)).
- **A call is a name followed by its arguments in parentheses, with no space before the `(`**,
  and a call with the wrong count of arguments is an error before any
  argument is computed
  ([Calls and arity](#calls-and-arity)).
- **The have is one expression**, and its error is reported before the
  want's ([The have field](#the-have-field)).
- **The shape of the want decides what it means**: blank, a list's
  name, a function's name, one expression, or items separated by `;`
  ([The want field](#the-want-field)).
- **Operands are computed left to right, and the first failure ends the computation**
  ([Evaluation order and error locations](#evaluation-order-and-error-locations)).
- **The app writes an expression back in one canonical form**
  ([What the app writes back](#what-the-app-writes-back)).
- **Some texts do not parse as they look**, `1/2 in` and `-2^2` among
  them ([Pitfalls](#pitfalls)).
- **Any character that cannot be parsed where it stands is an error as it is typed**,
  `×`, `÷` and `²` among them
  ([What is not accepted](#what-is-not-accepted)).
- **An error names the first character that could not be parsed, or quotes the part at fault**
  ([Errors](#errors)).

## Grammar and precedence

An expression binds at six levels. Each construct binds as the table
says, loosest first, and where two operators share a level they parse
left to right.

| Level       | Construct                                                                | Grouping                                                     | Example, and how it parses                                                               |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1, loosest  | sum and difference: `+`, `-`                                             | left to right                                                | `5 ft - 2 in + 1 in` is `(5 ft - 2 in) + 1 in`                                           |
| 2           | product and quotient: `*`, `/`                                           | left to right                                                | `m/s*s` is `(m/s)*s`                                                                     |
| 3           | **negation**: one `-` before a product of factors written side by side   | over all the factors after it, exponents included; once only | `-2 m / s` is `(-(2 m)) / s`; `--2` is an error                                          |
| 4           | **juxtaposition**: factors written side by side, with a space or without | left to right; a number only as the first factor             | `kg m / s^2` is `(kg m) / (s^2)`; `1/12 year` is `1 / (12 year)`                         |
| 5           | power: one `^` and an exponent typed as a number or a fraction           | one exponent per factor                                      | `-2^2` is `-(2^2)`; `m^2^3` is an error                                                  |
| 6, tightest | a factor: a number, a name, a call or an expression in parentheses       | none                                                         | `2.54`, `ft`, `tempC(100)`, `(1/12)`; `kg(m/s)` is a call and `kg (m/s)` a juxtaposition |

So `2 kg * 3 m/s^2` parses as `((2 kg) * (3 m)) / (s^2)`: the power
first, then each juxtaposition, then the product and the quotient from
the left. In the want, `;` separates the items of a unit list and binds
looser than all of these ([The want field](#the-want-field)). Spaces
and tabs, in any amount, may stand before and after the text and around
every operator except function application, where the `(` of a call
takes no space before it ([Calls and arity](#calls-and-arity)). So
`m ^ 2` and `atan2( 1 , 2 )` parse as `m^2` and `atan2(1, 2)`. A space
changes the parse in one other place, inside a number: `2e -19` is not
the number `2e-19`, and `m^- 1` is not the power `m^-1`
([Numbers](#numbers), [Operators](#operators)).

## Numbers

A **number** is an unsigned decimal with an optional exponent: `2`,
`2.54`, `.5`, `5.`, `1e-3`, `1E3` and `2E+2` are numbers. The app calls
a typed number a literal. In exact mode a number is read exactly, as
the fraction it denotes, so `0.1 + 0.2` is exactly `0.3`
([Exact and inexact values](numbers.md#exact-and-inexact-values)). In
decimal mode it is rounded to the working digits as it is read
([The two modes](numbers.md#the-two-modes)). A sign is part of a number
only in its exponent: `1e-3` is a thousandth, `2 -3` is the difference
`2 - 3`, and `-2` is the negation of `2`. The exponent belongs to the
number only when it is written without a space and has digits. The
predefined definitions file names the elementary charge `e`, so
`2e-19 C` is one number followed by a unit, `2e -19 C` is `2 e - 19 C`,
and `2e` is `2 e`. No space and no comma stands inside a number:
`1 000`, `1,000` and `2,54` are errors as they are typed
([What is not accepted](#what-is-not-accepted)).

| You type        | Into | Exucal shows            | Note                                                        |
| --------------- | ---- | ----------------------- | ----------------------------------------------------------- |
| `.5`            |      | `= 0.5`                 |                                                             |
| `5.`            |      | `= 5`                   |                                                             |
| `2E+2`          |      | `= 200`                 | a `+` sign in an exponent                                   |
| `0.1 + 0.2`     |      | `= 0.3`                 | read exactly                                                |
| `1.23456789012` |      | `= 1.2345679`           | decimal mode at eight working digits: rounded as it is read |
| `2 -3`          |      | `= -1`                  | a difference, not a signed number                           |
| `2e-19 C`       | `C`  | `= 2e-19 C`             | one number                                                  |
| `2e -19 C`      | `C`  | `≈ -19 C`               | `2 e - 19 C`: two elementary charges minus 19 coulombs      |
| `2e`            | `C`  | `≈ 3.2043533e-19 C`     | `2 e`                                                       |
| `1 000`         |      | an error as it is typed | write `1000`                                                |

### The limits on a number

A typed number is checked against the two size limits that bound every
value: the exponent bound and the significand limit
([Values too big to hold](numbers.md#values-too-big-to-hold)). The
exponent bound, `10^18` either way, is checked as the number is typed.
It applies to the value's power of ten as scientific notation writes
it, not to the exponent written in the text: `0.001e1000000000000000003`
is `1 × 10^(10^18)`, within the bound, and `12e1000000000000000000` is
`1.2 × 10^(10^18 + 1)`, refused as it is typed. The message of that
refusal calls the value's power of ten the number's exponent. The
significand limit is checked when the expression is computed, against
its current setting: a number with more digits than the setting allows
is refused then, in either mode
([The significand limit](numbers.md#the-significand-limit)). The
significand limit has one check as the number is typed: a number with
more digits than the largest setting allows is refused there, since no
setting admits it.

| You type                    | Into | Exucal shows                                                          | Note                      |
| --------------------------- | ---- | --------------------------------------------------------------------- | ------------------------- |
| `0.001e1000000000000000003` |      | `= 1e+1000000000000000000`                                            | within the exponent bound |
| `12e1000000000000000000`    |      | refused as it is typed: the value's power of ten passes `10^18`       |                           |
| `1e-1000000000000000001`    |      | refused as it is typed: the value's power of ten falls below `-10^18` |                           |

## Names

A **name** is a letter or an underscore, optionally followed by
letters, the digits `0` to `9` and underscores, and it takes every such
character that follows: `m2` is the name `m2`, not `m` squared, and
`2m` is `2 m`, a number and a name. Names are case-sensitive: `mm` and
`Mm` are two names, and so are `S` and `s`. Any other character ends
the name or is an error as it is typed: `m²` is an error as it is
typed, and the square is written `m^2`. So is `m٢`, with a digit of
another script. A letter is any character of Unicode's general category
Letter, `L`, in any script: `µm`, `Ω`, `Å`, `degF` and `N_A` are names.
An accent typed as a separate mark after its letter, a combining mark,
is not a letter, and it is an error as it is typed. `é` typed as one
character is a letter. Two characters that look alike are distinct
letters, the micro sign `µ` and the Greek `μ` among them. The
predefined definitions file defines both as the prefix micro.

### What a name means

A name that does not name a function or a list means a unit, or one
prefix followed by a unit, a prefix being a multiplier the definitions
file names: `km` is `k` + `m`, and `kilometre` is `kilo` + `metre`. Six
rules settle what a name means.

- A unit's own name wins over a prefix and a unit, so `min` is the
  minute and not `m` + `in`.
- A name splits into a prefix and a unit in at most one way: the
  definitions file is checked as it loads so that no name can be two
  different prefix-and-unit pairs ([Names](definitions.md#names)).
- Prefixes do not stack: `kkm` is an unknown unit.
- There is no plural handling: `inches` is an unknown unit unless the
  file defines it as an alias.
- Prefixes and units are separate namespaces, so `m` is both the prefix
  milli and the unit metre, and `h` is both the prefix hecto and the
  unit hour.
- Inside a function's body, a parameter's name wins over any unit of
  that name ([Functions](definitions.md#functions)).

The rules can make a familiar symbol another unit. `dB` is `d` + `B`, a
tenth of a byte, and the predefined file gives the decibel as a
function, `decibel`. `at` is `a` + `t`, an attotonne, and not an
atmosphere.
[Names that are absent or mean something else](units.md#names-that-are-absent-or-mean-something-else)
lists such names.

### Functions and lists

Prefixes apply to units alone: a function's name, defined in the file
or built into the app, is looked up as written, so `ktempC(1)` is an
error, a call of an unknown function. A name is a unit, a prefixed
unit, a function or a list, never two of these, and the definitions
file is checked as it loads to keep it so
([Names](definitions.md#names)). `tempC` typed in the have is an error,
since a function's name is not a unit. `time` typed in the have is an
unknown unit, since a list's name means the list only where it stands
alone as the want ([The want field](#the-want-field)).

| You type    | Into | Exucal shows                                                                  | Note                                   |
| ----------- | ---- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `1 µm`      | `m`  | `= 1e-6 m`                                                                    | a prefix and a unit, in another script |
| `1 km`      | `m`  | `= 1000 m`                                                                    | `k` + `m`                              |
| `1 min`     | `s`  | `= 60 s`                                                                      | the unit's own name wins: the minute   |
| `1 hm`      | `m`  | `= 100 m`                                                                     | the prefix `h`                         |
| `1 h`       | `s`  | `= 3600 s`                                                                    | the unit `h`                           |
| `m2`        |      | an error: unknown unit `m2`                                                   | one name                               |
| `Ft`        |      | an error: unknown unit `Ft`                                                   | case-sensitive                         |
| `m٢`        |      | an error as it is typed                                                       | a digit of another script              |
| `1 kkm`     |      | an error: unknown unit `kkm`                                                  | prefixes do not stack                  |
| `1 dB`      |      | `= 0.8 bit`                                                                   | `d` + `B`                              |
| `1 at`      | `kg` | `= 1e-15 kg`                                                                  | `a` + `t`                              |
| `ktempC(1)` |      | an error: unknown function `ktempC`                                           | no prefix on a function                |
| `tempC`     |      | an error: `tempC` is a function, not a unit; the message shows `tempC(value)` |                                        |
| `time`      |      | an error: unknown unit `time`                                                 | a list's name is not a unit            |

## Operators

### `+` and `-`

`+` and `-` add and subtract, and the two sides must conform, that is,
agree in dimension and in kind
([Conformance](quantities.md#conformance)). `1 m + 1 s` is an error, a
length and a time, and `1 rad + 1` is an error, an angle and a plain
number. `1 m + 0` is an error too, since `0` is a plain number and not
a length.

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
| `6 m / 2 s` |      | `= 3 m / s`  | `(6 m) / (2 s)`: juxtaposition first |

### Negation

A negation is one `-` before factors written side by side. It binds
tighter than `*` and `/` and looser than juxtaposition and `^`, so it
applies to every factor written side by side after it, exponents
included: `-2 m` is `-(2 m)` and not `(-2) m`, `-2^2` is `-(2^2)`, and
`-2 m / s` is `(-(2 m)) / s`. Write `(-2)^2` for the square of minus
two. A negation does not stack: `--2` is an error as it is typed, and
`-(-2)` is `2`. It may stand wherever a factor may begin, after another
operator among them: `2 * -3` is `-6`, and `2 - -3` is `5`. There is no
`+` before a factor as there is a `-`: `+2` and `2 * +3` are errors as
they are typed. Besides the addition operator, a `+` is accepted only
as a sign, in two places: in a number's exponent, as `2E+2`; and on a
`^` exponent, as `m^+2`.

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
two metres, and `kg m` is a kilogram metre. A number may only be the
first factor, a count of what follows, so `m 2`, `2 3 m` and
`5 ft 3 in` are errors as they are typed. Two numbers are multiplied
with `*` or with parentheses, `2 * 3` or `2 (3)`, and five feet three
inches is `5 ft + 3 in`.

| You type    | Into | Exucal shows            | Note                                          |
| ----------- | ---- | ----------------------- | --------------------------------------------- |
| `2 m`       |      | `= 2 m`                 | a count of a unit                             |
| `kg m`      |      | `= 1 m kg`              | a product of units, written in the primitives |
| `m 2`       |      | an error as it is typed | a number only as the first factor             |
| `5 ft 3 in` |      | an error as it is typed | write `5 ft + 3 in`                           |
| `2 (3)`     |      | `= 6`                   | two numbers multiplied                        |

### `^`

`^` raises a factor to an exponent typed as a number or a fraction,
never computed from an expression. The dimension of a power depends on
its exponent, so the exponent must be known when the text is parsed and
the dimension is never computed
([A quantity](quantities.md#a-quantity)). The exponent takes one of two
forms.

- A number with an optional sign, bare or in parentheses: `m^2`,
  `s^-1`, `m^0.5` and `m^(2)`.
- In parentheses, such a number over an unsigned one: `m^(1/2)` and
  `m^(-3/2)`.

Any other exponent is an error as it is typed. `m^x` and `m^(1/2 + 1)`
are errors, since an exponent is never computed. `m^(1/-2)` is an
error, since the denominator is unsigned: write `m^(-1/2)`. `m^(1/0)`
has the fraction's form and is an error all the same, since it divides
by zero. A factor takes one exponent, so `2^3^2` is an error as it is
typed: the second `^` has no factor to raise, since `2^3` is not a
factor. Write `(2^3)^2` for two cubed and then squared. The parentheses
make `2^3` a factor with an exponent of its own. For two to the ninth
write `2^9`, since `3^2` as an exponent would be computed. `^` binds
tightest of the operators, so `m^1/2` is `(m^1) / 2`, half a metre. An
exponent's sign is written without a space before its digits: `m^-1` is
a power, and `m^- 1` is an error as it is typed.

The exponent is held as a fraction of two whole numbers, reduced, and
its numerator and denominator must each fit the significand limit:
`m^(2/4)` is `m^(1/2)`, and `2^1e-30000` is refused, since its
denominator is `10^30000`. An exponent that no setting of the limit
could hold, `m^1e999999999`, is refused as it is typed. `pow` raises a
plain number to a computed exponent instead, so `pow(2, 1e-30000)` is
`≈ 1` ([Built-in functions](builtins.md)).

| You type           | Into | Exucal shows                                          | Note                                     |
| ------------------ | ---- | ----------------------------------------------------- | ---------------------------------------- |
| `m^0.5`            |      | `= 1 m^(1/2)`                                         | a decimal exponent                       |
| `m^x`              |      | an error as it is typed                               | the exponent must be a number            |
| `m^(1/0)`          |      | an error as it is typed: the exponent divides by zero |                                          |
| `m^1e999999999`    |      | refused as it is typed, at any setting of the limit   |                                          |
| `2^2 - 1`          |      | `= 3`                                                 | `^` binds tightest                       |
| `m^1/2`            |      | `= 0.5 m`                                             | `(m^1) / 2`                              |
| `2^3^2`            |      | an error as it is typed                               | write `(2^3)^2`, which is `= 64`         |
| `m^(2/4)`          |      | `= 1 m^(1/2)`                                         | the fraction reduced                     |
| `2^1e-30000`       |      | refused: past the significand limit                   | the exponent's denominator is `10^30000` |
| `pow(2, 1e-30000)` |      | `≈ 1`                                                 | a computed exponent                      |

### Parentheses

Parentheses group any expression: `(1/12) year` is a twelfth of a
year.

| You type      | Into | Exucal shows  | Note                |
| ------------- | ---- | ------------- | ------------------- |
| `(1/12) year` |      | `= 2629800 s` | a twelfth of a year |

## Calls and arity

A call is a name, `(`, zero or more expressions separated by commas,
and `)`, with no space between the name and the `(`: `tempC(100)`,
`pi()` and `atan2(3 m, 4 m)` are calls. A call applies the function of
that name to the expressions inside, its arguments, and it stands where
a name may, as a factor in `2 tempC(100)` and negated in `-tempC(100)`.

A function's arity is the count of arguments it takes, a fixed count
or, for some built-in functions, a range: `round(x)` and
`round(x, places)` are both calls of `round`, and `pi()` takes none. A
call with another count is an error that says how many the function
takes, reported before any argument is computed. Each built-in
function's entry gives its count
([Rules every built-in follows](builtins.md#rules-every-built-in-follows)),
and a defined function takes one argument per parameter
([Functions](definitions.md#functions)).

The space before `(` decides between a call and a juxtaposition.
`kg(m/s)` is a call of `kg`, which is not a function, and the error's
message shows the juxtaposition, `kg (m/s)`. In the opposite direction,
`tempC (1)` is a juxtaposition and not a call, and its error is the one
`tempC` alone gets ([Names](#names)). `pi ()` is an error as it is
typed, since `()` after a space is an empty pair of parentheses and not
a list of arguments.

| You type          | Into  | Exucal shows                                                                  | Note                                 |
| ----------------- | ----- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `tempC(100)`      |       | `= 373.15 K`                                                                  | one argument                         |
| `pi()`            |       | `≈ 3.1415927`                                                                 | no arguments                         |
| `atan2(3 m, 4 m)` | `deg` | `≈ 36.869898 deg`                                                             | two arguments                        |
| `2 tempC(100)`    |       | `= 746.3 K`                                                                   | a call as a factor                   |
| `-tempC(100)`     |       | `= -373.15 K`                                                                 | a call negated                       |
| `round(2.567, 2)` |       | `= 2.57`                                                                      | the second argument of a range       |
| `round(1, 2, 3)`  |       | an error: `round` takes 1 to 2 arguments                                      |                                      |
| `pi(1)`           |       | an error: `pi` takes no arguments                                             |                                      |
| `sqrt(bogus, 1)`  |       | an error: `sqrt` takes 1 argument                                             | reported before `bogus` is looked up |
| `kg(m/s)`         |       | an error: `kg` is a unit, not a function; the message shows `kg (m/s)`        | a call                               |
| `tempC (1)`       |       | an error: `tempC` is a function, not a unit; the message shows `tempC(value)` | a juxtaposition                      |
| `pi ()`           |       | an error as it is typed                                                       | the call is `pi()`                   |

## The have field

The have is one expression and nothing more: a `;` in the have is an
error as it is typed. While the have is blank, nothing is computed and
nothing is reported, whatever the want holds. The app handles the have
in full, parsing and computing it, before it turns to the want, so a
failure of the have is reported before any failure of the want, even
before a want that cannot be parsed: `bogus` into `ft;` reports the
unknown unit `bogus`. [The two fields](app.md#the-two-fields) says
which field an error marks on the screen.

| You type | Into    | Exucal shows                   | Note                            |
| -------- | ------- | ------------------------------ | ------------------------------- |
| `bogus`  | `ft;`   | an error: unknown unit `bogus` | the have's error first          |
| `1 m`    | `bogus` | an error: unknown unit `bogus` | the have is sound               |
| `1 m;ft` |         | an error as it is typed        | `;` is not accepted in the have |

## The want field

The shape of the want decides what it means, and each shape answers in
its own way
([How a conversion is answered](quantities.md#how-a-conversion-is-answered)).

| The want holds                           | It means                                                                                                                                                                                                                             | Example                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| nothing                                  | the have alone, in the primitives ([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds))                                                                                                                |                                |
| the name of a unit list, alone           | that list ([Unit lists](quantities.md#unit-lists))                                                                                                                                                                                   | `time`                         |
| the name of a defined function, alone    | a conversion into the function, which answers with the call that gives the have ([Conversion into a function](quantities.md#conversion-into-a-function)); a defined function without an inverse, or a built-in function, is an error | `tempF`                        |
| any other single expression              | a quantity to measure the have in, which may carry a number, be a sum or be a call; the answer is the ratio of the two                                                                                                               | `in`, `1000 ft`, `tempC(1)`    |
| two or more expressions separated by `;` | a unit list typed out, checked by the same rules as a defined list ([Unit lists](quantities.md#unit-lists))                                                                                                                          | `ft;in`, `hr;min;s`, `ft;in/8` |

A `;` stands only between the items of the want, never inside
parentheses and never with an item missing: `ft;`, `;in`, `ft;;in` and
`(ft;in)` are errors as they are typed. A conversion is two fields, not
one text: `1 m in ft` typed as the have is a volume, since `in` is the
inch, `1 m to ft` is an error, since `to` is an unknown unit, and
`1 m` into `ft` is the conversion.

| You type    | Into       | Exucal shows                | Note                                    |
| ----------- | ---------- | --------------------------- | --------------------------------------- |
| `1 in`      |            | `= 0.0254 m`                | a blank want: the primitives            |
| `3661 s`    | `time`     | `= 1 hr + 1 min + 1 s`      | a list by name                          |
| `300 K`     | `tempF`    | `= tempF(80.33)`            | a function by name                      |
| `1 m`       | `in`       | `≈ 39.370079 in`            | one unit                                |
| `1 mi`      | `1000 ft`  | `= 5.28 × 1000 ft`          | a unit with a number                    |
| `373.15 K`  | `tempC(1)` | `≈ 1.3611162 tempC(1)`      | a call as an expression                 |
| `1 m`       | `ft;in`    | `≈ 3 ft + 3.3700787 in`     | a list typed out                        |
| `1 m`       | `ft;in/8`  | `≈ 3 ft + 26.96063 in / 8`  | each item any expression                |
| `1 m`       | `ft;`      | an error as it is typed     | an item missing                         |
| `1 m`       | `(ft;in)`  | an error as it is typed     | `;` never in parentheses                |
| `1 m in ft` |            | `= 0.00774192 m^3`          | `in` is the inch: write `1 m` into `ft` |
| `1 m to ft` |            | an error: unknown unit `to` |                                         |

## Evaluation order and error locations

Once a text has been parsed, its parts are computed from the left, and
the first failure is reported: `bogus / 0` reports the unknown unit
and never reaches the division. The message quotes the part at fault.

- A division by zero, or by a value that cannot be told from zero,
  quotes the divisor: `1 / (2 - 2)` quotes `(2 - 2)`.
- A power whose result depends on the sign of a base that cannot be
  told from zero quotes the base: `((2^(1/2))^2 - 2)^(1/2)` quotes
  `((2^(1/2))^2 - 2)`. A power that fails for another reason is quoted
  whole: `(-8)^(1/2)`, an even root of a negative value.
- A sum, product, quotient or power refused for its size quotes the
  operation refused and nothing around it: `2 m * 3^100000` quotes
  `3^100000`.
- A number past the significand limit quotes the number.
- A sum or difference whose sides do not conform quotes both sides.
- A call with the wrong count of arguments quotes the call, and a call
  whose argument does not conform quotes the argument.

| You type                  | Into | Exucal shows                                                                                  | Note                          |
| ------------------------- | ---- | --------------------------------------------------------------------------------------------- | ----------------------------- |
| `bogus / 0`               |      | an error: unknown unit `bogus`                                                                | the division is never reached |
| `1 / 0 + bogus`           |      | an error: division by zero in `0`                                                             | `bogus` is never looked up    |
| `1 / (2 - 2)`             |      | an error: division by zero in `(2 - 2)`                                                       | the divisor                   |
| `((2^(1/2))^2 - 2)^(1/2)` |      | an error: the base cannot be told from zero                                                   | the base alone is quoted      |
| `(-8)^(1/2)`              |      | an error: an even root of a negative value                                                    | the whole power is quoted     |
| `2 m * 3^100000`          |      | refused: `3^100000` would need a significand past the limit                                   | the power alone is quoted     |
| `1 m + 1 s + bogus`       |      | an error, a dimension mismatch: `1 m` against `1 s`                                           | the first sum fails first     |
| `tempC(20 m)`             |      | an error: `tempC` cannot be applied to `20 m`, a length, where its argument is a plain number | the argument is quoted        |

## What the app writes back

The output line does not echo your text. The app puts the parsed
expression into one **canonical** form, the one way it writes that
expression whatever text produced it, and writes that form back: the
have on the left, and on the right the result, written in the want
where there is one. The canonical form uses the fewest parentheses that
keep the grouping, so `((ft + in))` is written `ft + in`. On the screen
a product written with `*` is shown with `×`, which the fields do not
accept. The copy button copies the result side with `*`, and that text
pastes back as the same expression, where text selected on the screen
may not. The result's value is written as
[How numbers are written](numbers.md#how-numbers-are-written) says.

## Pitfalls

Some texts do not parse as they look. One is a fraction before a unit,
which parses with the juxtaposition first: `1/2 in` is `1/(2 in)`,
half per inch, while `(1/2) in` and `0.5 in` are half an inch. For
half an inch, a twelfth of a year and a metre and a half, write
`(1/2) in`, `year / 12` and `1 m + m/2`.

| You type      | Into | It parses as                                         | Exucal shows                                | Rule                                |
| ------------- | ---- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------- |
| `1/12 year`   |      | `1 / (12 year)`, a frequency                         | `≈ 2.640674e-9 × (1 / s)`                   | [Operators](#operators)             |
| `1/2 in`      |      | `1/(2 in)`, half per inch                            | `≈ 19.685039 × (1 / m)`                     | [Operators](#operators)             |
| `(1/2) in`    |      | half an inch                                         | `= 0.0127 m`                                | [Operators](#operators)             |
| `1 m + 1/2 m` |      | `1 m` plus `1 / (2 m)`                               | an error, a dimension mismatch              | [Operators](#operators)             |
| `m^1/2`       |      | `(m^1) / 2`, half a metre                            | `= 0.5 m`                                   | [Operators](#operators)             |
| `-2^2`        |      | `-(2^2)`                                             | `= -4`                                      | [Operators](#operators)             |
| `2^3^2`       |      | does not parse: one exponent per factor              | an error as it is typed                     | [Operators](#operators)             |
| `m^(1/2 + 1)` |      | does not parse: an exponent is never computed        | an error as it is typed                     | [Operators](#operators)             |
| `m^(1/-2)`    |      | does not parse: a fraction's denominator is unsigned | an error as it is typed                     | [Operators](#operators)             |
| `5 ft 3 in`   |      | does not parse: a number only as the first factor    | an error as it is typed                     | [Operators](#operators)             |
| `2 -3`        |      | the difference `2 - 3`                               | `= -1`                                      | [Numbers](#numbers)                 |
| `2e -19 C`    | `C`  | `2 e - 19 C`                                         | `≈ -19 C`                                   | [Numbers](#numbers)                 |
| `m2`          |      | the name `m2`                                        | an error: unknown unit `m2`                 | [Names](#names)                     |
| `1 dB`        |      | `d` + `B`, a tenth of a byte                         | `= 0.8 bit`                                 | [Names](#names)                     |
| `1 at`        | `kg` | `a` + `t`, an attotonne                              | `= 1e-15 kg`                                | [Names](#names)                     |
| `kg(m/s)`     |      | a call of `kg`                                       | an error: `kg` is a unit, not a function    | [Calls and arity](#calls-and-arity) |
| `tempC (1)`   |      | a juxtaposition of `tempC` and `(1)`                 | an error: `tempC` is a function, not a unit | [Calls and arity](#calls-and-arity) |
| `pi ()`       |      | does not parse: `()` is not a list of arguments      | an error as it is typed                     | [Calls and arity](#calls-and-arity) |
| `1 m in ft`   |      | a product of three units                             | `= 0.00774192 m^3`                          | [The want field](#the-want-field)   |

## What is not accepted

Any character that cannot be parsed where it stands is an error as it
is typed. A line break is one, and so is any whitespace other than a
space or a tab. Common notations from elsewhere, each with its spelling
in the app:

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

The marks of a definition, `=`, `<`, `<=`, `>`, `>=`, `≤`, `≥`, `|`,
`~`, `:` and `#`, belong to the definitions file
([The definition language](definitions.md)), and `[`, `]`, `'` and `"`
have no meaning anywhere: the foot and the inch are `ft` and `in`.

## Errors

Where the text cannot be parsed, the message names the first character
that could not be parsed, and then what could have come there instead,
such as a number, a name, an operator or a parenthesis. It says
`Unexpected end of input: expected …` where the text ends too soon, and
`Unexpected "c": expected …` where a character `c` cannot follow what
came before. A number refused as it is typed is quoted with its reason.
An error in a text that has been parsed quotes the part at fault
([Evaluation order and error locations](#evaluation-order-and-error-locations)).

| You type                 | The message                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `3 m ^`                  | `Unexpected end of input: expected a number or "(".`             |
| `12e1000000000000000000` | `"12e1000000000000000000": this number's exponent passes 10^18.` |
| `1 / (2 - 2)`            | `Division by zero in "(2 - 2)".`                                 |

These three are examples of the shapes a message takes, not a list of
the messages.
