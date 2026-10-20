# The definition language

Every unit, prefix and unit list the calculator knows, and every
function but the built-in ones, comes from the **definitions file**, a
text file that the app loads as it starts. The file defines the units,
the prefixes, the unit lists, the functions and their inverses, and it
declares the primitives that every unit is defined from. It is written
in the **definition language**: one definition per line, a name and a
body, most bodies being expressions of the expression language
([The expression language](expressions.md)). A definition takes one of
six forms: primitive, prefix, unit, unit list, function or inverse. The
shape of its line tells them apart. The format is modelled on the
definitions file of [GNU units](https://www.gnu.org/software/units/).
The rules and examples here assume the predefined definitions file, the
one that ships with the app, and no definition can be typed into the
app. [Units](units.md) lists what the predefined file defines.

The file stands behind every result, and its semantics say what a result
can be trusted for. A unit's factor is read exactly, so an inexact
conversion can come only from an inexact definition, never from the
arithmetic. A defined function, one the file defines, is under the same
guarantee as a built-in: its digits can be trusted as far as any
result's, and a call costs what its body typed out in its place would
cost. And the rules on names make every typed name mean one thing. The
predefined file leaves out a few familiar symbols, `dB` among them, to
keep it so.

Each example gives what you type, what you convert it into where there
is a want, and what Exucal shows. The shown text is the result side of
an output line, with the relation, `=` or `≈`, in front of the value.
Where an example fails, the table says so and describes the error in a
few words. Some examples use a definition the predefined file does not
hold, to show a rule the file's own lines do not exercise. That
definition then stands above the table that uses it, and the result is
what the calculator would show with that line in the file.

A definition follows these rules:

- **One definition per line: a name and a body.** A `#` starts a
  comment, blank lines are skipped, and definitions may stand in any
  order, though never in a circle ([The file](#the-file)).
- **The shape of a line says which of the six forms it takes**
  ([Grammar](#grammar)).
- **A primitive is a base quantity that everything else is defined from**,
  declared with `!`, or with `!kind` for a marker of a kind
  ([Primitives](#primitives)).
- **A prefix's body is a plain number**, and prefixes have a set of
  names of their own ([Prefixes](#prefixes)).
- **A unit's body is evaluated once, when the file loads**, at the
  ceiling and in exact mode, so a conversion is exact wherever the
  factors are exact ([Units](#units)).
- **A unit list is checked when the file loads**, and its name means
  the list only as the want ([Unit lists](#unit-lists)).
- **A parameter's argument must conform to the unit its annotation names, and a condition is a comparison the arguments must meet**
  ([Functions](#functions)).
- **A function's body is checked for its dimension when the file loads and computed only at a call**,
  as the body typed out in its place would be
  ([Functions](#functions)).
- **An inverse gives back the argument that produces a value**, and
  lets the function be a want ([Inverses](#inverses)).
- **Units, lists, functions and built-ins share one set of names**, each
  name defined once, and a list's or a function's name may not read as
  a prefix followed by a unit ([Names](#names)).
- **The first fault the app finds keeps the whole file from loading**,
  a fault being anything in the file it cannot accept, and each fault
  has a fix ([When the file does not load](#when-the-file-does-not-load)).
- **Only the predefined definitions file is loaded**
  ([What the app loads](#what-the-app-loads)).

## The file

A definition occupies one line, and the next line is a definition of its
own: a body cannot continue onto it. A primitive, a prefix, a unit or a
unit list is written as a name, whitespace, then a body. The whitespace
is required: `inch2.54 cm` does not define the inch, since `inch2` would
be the name, and the file does not load. A function and an inverse have
no whitespace between the name and the `(`, as a call has none. Inside
the parentheses, and around the `=`, spaces may stand anywhere. A `#`
starts a comment that runs to the end of the line, with or without a
space before it, so a comment may follow a body directly. Blank lines
and lines holding only a comment are skipped. A definition may be
indented, and a line may end with either line ending, `\n` or `\r\n`.
Definitions may stand in any order: a unit may be defined by one that
comes later in the file, and an inverse may come before its function.
They may not refer to one another in a circle, through bodies, calls or
conditions: a circle keeps the file from loading.

```
# A comment on a line of its own.
inch      2.54 cm           # a comment after a body
    foot  12 inch           # an indented definition
```

## Grammar

Seven lines of the predefined file, one of each form and one more for
the second primitive, with a comment added to each:

```
m         !                                # a dimension primitive
radian    !kind                            # a kind primitive
kilo-     1e3                              # a prefix: the name ends in a dash
in        2.54 cm                          # a unit: a body of one expression
time      hr;min;s                         # a unit list: two or more items
tempC(x) | x >= -273.15 = x K + 273.15 K   # a function
~tempC(y) = y / K - 273.15                 # its inverse
```

- A primitive has a body of `!`, or of `!kind` for a kind
  ([Primitives](#primitives)).
- A prefix has a name ending in `-` and a body whose value is a plain
  number ([Prefixes](#prefixes)).
- A unit has a body of one expression over numbers, units and calls
  ([Units](#units)).
- A unit list has a body of two or more expressions separated by `;`
  ([Unit lists](#unit-lists)).
- A function has `(` directly after its name, its parameters between
  the parentheses, then an annotation for its result where it has one,
  then its conditions where it has them, then `=` and a body in which
  each parameter stands for an argument. A parameter may carry an
  annotation, a unit its argument must conform to, after a colon; a
  condition is a comparison the arguments must meet
  ([Functions](#functions)).
- An inverse has `~` before a function's name, one parameter in
  parentheses, conditions where it has them, `=`, and a body that
  gives back the argument ([Inverses](#inverses)).

A name has the shape of a name in the expression language, a letter or
an underscore followed by letters, digits and underscores
([Names](expressions.md#names)). A prefix's name carries its `-` after
that. A body, a list's item, an annotation and the terms a condition
compares are expressions, read with the expression language's precedence
and its pitfalls: `1 / 7000 lb` is `1 / (7000 lb)`, a reciprocal mass,
and the grain is written `lb / 7000`
([Pitfalls](expressions.md#pitfalls)).

## Primitives

A **primitive** is a base quantity that everything else is defined in
terms of. The calculator takes its primitives from the file alone, and a
dimension is a list of exponents over them
([A quantity](quantities.md#a-quantity)). A **dimension primitive**,
declared with a body of `!`, is a base quantity such as the metre. A
**kind primitive**, declared with `!kind`, is a marker of a kind with no
dimension of its own. It keeps apart quantities that would otherwise
look alike. The file, not the calculator, chooses which kinds exist: a
second `!kind` line declares a second kind. The predefined file declares
the SI base units, `m`, `kg`, `s` and the rest, as dimension primitives,
and the bit beside them, so that a count of information is a dimension
and not a plain number. It declares the radian as a kind primitive, so
that `rad/s` does not convert into `Hz`.
[The primitives](units.md#the-primitives) lists the primitives with
their meaning and says why information is a dimension, and
[Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)
says what a kind does.

| You type  | Into    | Exucal shows                                              | Note                                                                     |
| --------- | ------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `1 in`    |         | `= 0.0254 m`                                              | a blank want answers in the primitives                                   |
| `1 bps`   | `Hz`    | an error, a dimension mismatch: `bit / s` against `1 / s` | information is a dimension                                               |
| `1 rad/s` | `Hz`    | an error, a kind mismatch: the radian                     | a kind keeps the two apart                                               |
| `1 rpm`   | `rad/s` | `≈ 0.10471976 rad / s`                                    | angles per time on both sides; `≈` since `rpm` is defined through `pi()` |

## Prefixes

A **prefix** is a multiplier a user writes before a unit's name: `km` is
`k` + `m`. It is defined with a trailing dash and a body that is an
expression whose value is a plain number, such as `1e3` or `1024^2`. The
body is evaluated once, when the file loads, as a unit's body is. A
second name for a prefix is a second definition, so the predefined file
defines a prefix by name and by symbol, `kilo-` and `k-` among them, and
both `km` and `kilometre` name a thousand metres. The body may be
neither `!` nor a list, and it may have neither a dimension nor a kind:
`weird- 2 m` keeps the file from loading. Prefixes have a set of names
of their own, apart from the units, so `m-` (milli) coexists with `m`
(the metre), and `h-` (hecto) coexists with `h` (the hour). The
expression language settles how a typed name divides into a prefix and a
unit ([Names](expressions.md#names)). The file adds two rules of its
own: no name divides two ways, and no list's or function's name reads as
a divided one ([Names](#names)). A prefix applies to units alone: no
prefix applies to a function's or a list's name.

| You type      | Into   | Exucal shows                              | Note                                        |
| ------------- | ------ | ----------------------------------------- | ------------------------------------------- |
| `1 km`        | `m`    | `= 1000 m`                                | `k` + `m`                                   |
| `1 kilometre` | `m`    | `= 1000 m`                                | `kilo` + `metre`                            |
| `1 mebibyte`  | `byte` | `= 1048576 byte`                          | a prefix defined by an expression, `1024^2` |
| `ktempC(1)`   |        | an error: `ktempC` is an unknown function | no prefix applies to a function             |

## Units

A **unit** is a name the file gives to a quantity, so that other
quantities can be written as multiples of it. It is defined by a body of
one expression over numbers, units and calls: `in 2.54 cm`,
`N kg m / s^2`, `Hz 1 / s`. A body that is a name alone makes an alias,
as `metre m` does. Every unit is evaluated once, when the file loads.
The evaluation runs at the ceiling and in exact mode, whatever mode you
compute in afterwards. In decimal mode the unit's value is then rounded
as it is looked up, like any other step
([The two modes](numbers.md#the-two-modes)). Every factor is read
exactly as written, as a typed number is, so a conversion between units
defined by exact factors is exact. A unit defined through an inexact
function is inexact, as `deg` is through `pi()`, and a conversion
through it is `≈`. Such a unit is known to the ceiling's precision
whatever the display digits, and no pass computes above the ceiling, so
the unit never limits the digits a conversion can certify.
[Units, prefixes and exactness of factors](quantities.md#units-prefixes-and-exactness-of-factors)
states the rule, and
[Which factors are exact](units.md#which-factors-are-exact) names the
predefined file's measured factors and its inexact units.

A body may call a defined function, so a unit may be a reading, a
temperature on a scale: with `boil tempC(100)` in the file, `1 boil` is
the boiling point of water. A call whose condition cannot be decided
keeps the file from loading: a call you type shows such a doubt as a
warning, but a unit has nowhere to show it. A body may also call
`approx`, the one operation whose purpose is to make a value inexact.
The unit is then inexact on purpose: it carries an error radius, as any
value `approx` gives does, so every conversion through it is `≈` and
never `=`, which suits a measured constant. Say the file defines:

```
boil  tempC(100)
G     approx(6.67430e-11) m^3 / (kg s^2)
```

| You type | Into    | Exucal shows                | Note                                   |
| -------- | ------- | --------------------------- | -------------------------------------- |
| `1 in`   | `cm`    | `= 2.54 cm`                 | an exact factor                        |
| `1 mi`   | `km`    | `= 1.609344 km`             | exact through every factor on the way  |
| `1 turn` | `deg`   | `≈ 360 deg`                 | inexact: both units call `pi()`        |
| `1 boil` | `K`     | `= 373.15 K`                | a unit defined by a call               |
| `1 boil` | `tempC` | `= tempC(100)`              |                                        |
| `1 G`    |         | `≈ 6.6743e-11 m^3 / kg s^2` | inexact on purpose                     |
| `2 G`    | `G`     | `≈ 2 G`                     | `≈` even between multiples of the unit |

## Unit lists

A **unit list** is a name and a body of two or more expressions
separated by `;`, largest unit first: `time hr;min;s`. Typed alone as
the want, the name means the list, and the answer is a sum, a whole
number of each unit but the last and the rest in the last.
[Unit lists](quantities.md#unit-lists) says how the sum is formed, and
[The want field](expressions.md#the-want-field) says how a list is typed
out, as `ft;in`. The name means the list nowhere else: `2 time` is an
unknown unit. Each item is any expression: the predefined file defines a
running pace as `mipace hr/mi;min/mi;s/mi`. When the file loads, each
list is checked by the rules a typed list is checked by, all decided at
the ceiling:

- The units conform to one another.
- Each unit is certainly positive.
- The units decrease along the list, each smaller than the one before
  it.

So a list the file defines can fail at the want only for not conforming
to the have.
[Unit lists defined in the file](units.md#unit-lists-defined-in-the-file)
lists the predefined file's lists.

| You type      | Into     | Exucal shows                                    | Note                                                     |
| ------------- | -------- | ----------------------------------------------- | -------------------------------------------------------- |
| `3661 s`      | `time`   | `= 1 hr + 1 min + 1 s`                          | a defined list, by name                                  |
| `1 hr / 7 mi` | `mipace` | `≈ 8 min / mi + 34.285714 s / mi`               | a defined list; the count of `hr / mi` is zero, left out |
| `2 time`      |          | an error: `time` is an unknown unit             | a list's name is not a unit                              |
| `1 m`         | `time`   | an error, a dimension mismatch: `m` against `s` | the one way a defined list fails                         |

## Functions

A **defined function** turns its arguments into a value by a rule that
is not a plain factor. The predefined file's temperature readings and
logarithmic levels are such functions
([Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)).
A function has a name, parameters and a body, and it may carry
annotations and conditions.

### The parameters and the body

The parameters stand between the parentheses, separated by commas, and
the body is an expression in which each parameter stands for the
argument in its position. A parameter may carry an annotation, a unit
its argument must conform to, after a colon:

```
kinetic(mass: kg, v: m/s) = mass v^2 / 2
three() = 3 m
```

`kinetic` takes a mass and a speed, in that order. A function may have
no parameters, as `three` has, and is then called as `three()`. A
parameter may not be named twice. A call gives one argument per
parameter, in their order. A call with another count is an error before
any argument is computed, and a function's name typed without
parentheses is not a call
([Calls and arity](expressions.md#calls-and-arity)).

| You type               | Into | Exucal shows                          | Note                                          |
| ---------------------- | ---- | ------------------------------------- | --------------------------------------------- |
| `kinetic(2 kg, 3 m/s)` | `J`  | `= 9 J`                               | the result's dimension inferred from the body |
| `kinetic(2 kg)`        |      | an error: `kinetic` takes 2 arguments |                                               |
| `three()`              |      | `= 3 m`                               | a function of no parameters                   |

### Annotations

An **annotation** is the unit a parameter takes, in this sense alone:
the argument must conform to it, and nothing is converted into it. An
annotation changes no value, since the argument is held in the
primitives whatever unit the annotation names, so `n: in` means a
length, any length
([A quantity carries no unit](quantities.md#a-quantity-carries-no-unit)).
A parameter without an annotation takes a plain number. So an annotation
is a unit expression and nothing more: unit names, with products,
quotients and powers of them, as `m/s`, or the number `1`, which means a
plain number, as leaving the annotation out does. Any other number would
read as a scale that the annotation does not apply: `: 2` and `: 1000 m`
are errors, and the scale is written in the body. A sum, a negation or a
call names no unit, and is an error too. A formula that needs the number
of some unit in its argument divides that unit out in the body, as the
body-mass index does with `weight / kg`
([Conformance](quantities.md#conformance) defines `bmi`, which the
predefined file does not hold).

The result's dimension, its kind included, is inferred from the body,
with each parameter standing for a quantity of its annotation's
dimension: `kinetic` gives an energy. An annotation after the
parentheses, `): K`, checks the inferred dimension against the one
written, and `): 1` says that the result is a plain number. An
annotation names a unit, and zero is no unit, since nothing is a count
or a multiple of it. So an annotation that is zero, or cannot be told
from zero, keeps the file from loading, for a parameter's annotation and
the result's alike: `f(x: zero)` with `zero 0 m` is a fault. Say the
file defines a function of one annotated parameter:

```
twelve(n: in) = 12 n
```

`twelve(1 ft)` is twelve feet, since `n` takes any length. A quantity
converted into the function is written as a count of the parameter's
annotation, which [Inverses](#inverses) shows with this function.

| You type            | Into | Exucal shows                                                                   | Note                              |
| ------------------- | ---- | ------------------------------------------------------------------------------ | --------------------------------- |
| `twelve(1 ft)`      | `ft` | `= 12 ft`                                                                      | any length                        |
| `twelve(2)`         |      | an error, a dimension mismatch: `2` is a plain number where a length is needed |                                   |
| `kinetic(2, 3 m/s)` |      | an error, a dimension mismatch, named for the parameter `mass`                 |                                   |
| `bmi(100 lb, 4 ft)` |      | `≈ 30.515173`                                                                  | the units divided out in the body |

### Conditions

A **condition** is a comparison the arguments must meet. It is written
after a `|`, after the parameters and after the result annotation where
there is one: `tempC(x) | x >= -273.15 = x K + 273.15 K` admits only a
reading at or above absolute zero. A condition is a chain of two or more
terms joined by `<`, `<=`, `>` or `>=`, all pointing one way: `x > 0`,
`0 < p < 1`, `0 K <= t <= 373.15 K`. The signs `≤` and `≥` are read as
`<=` and `>=`. A term is any expression, so a condition may relate
parameters, `| a < b, a <= x <= b`, or bound an expression of them,
`| x^2 + y^2 <= 1`. Several conditions are separated by commas and must
all hold. Each must mention a parameter, and its terms must conform,
which the app checks as it loads the file: `| t > 0` for `t: K` is a
fault, and `| t > 0 K` is the condition meant. Nothing checks a
function's result against a range.

A call checks the conditions before it computes the body. A condition
holds, fails or is **undecided**. The comparison takes the argument's
whole range within its error radius, with no tolerance
([Comparison and equality](numbers.md#comparison-and-equality)). An
exact argument is compared exactly, so `tempC(-273.15)` meets
`x >= -273.15`. An inexact argument whose range reaches across the bound
leaves the condition undecided. A condition that fails makes the call an
error naming the condition and the arguments. A condition that cannot be
decided is tried again at more digits, pass by pass. When the ceiling
still cannot decide it, the calculator shows the body's value anyway,
marked `≈`, with a warning naming the condition it assumed. The value
shown is the body's own, and the doubt is only whether the definition
admits the argument. A built-in's edge, a point where its result would
jump, is different: there a guess would be a wrong value, so the result
is an error ([Values at an edge](numbers.md#values-at-an-edge)). In
decimal mode every argument is exact, so a condition always decides
([The two modes](numbers.md#the-two-modes)).

The conditions are checked in the order written, so one condition may
guard the next: in `| x > 0, ln(x) > 1`, an argument that fails the
first is an error before `ln` is reached. When the first cannot be
decided and a later condition has a term that cannot be computed, that
condition is taken to hold too, with a warning of its own. The call is
not an error: had the guard decided, it might have excluded the argument
before the term was reached, so the doubt is the guard's. A condition
that restates an identity, `| x - x >= 0`, can never be decided for an
inexact argument, since each use of `x` is an independent copy of the
argument, error radius included. Write a condition that bounds the
arguments instead. Say the file defines:

```
guarded(x) | x > 0, ln(x) > 1 = x
ident(x) | x - x >= 0 = x
```

| You type                 | Exucal shows                                      | Note                                                                               |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `tempC(20)`              | `= 293.15 K`                                      | the condition holds                                                                |
| `tempC(-273.15)`         | `= 0 K`                                           | an exact argument on the bound                                                     |
| `tempC(-300)`            | an error: `tempC` requires `x >= -273.15`         | the condition fails                                                                |
| `tempC(approx(-273.15))` | `≈ 0 K (within 2e-4047 of zero)`, with a warning  | undecided at every pass; the value assumes the condition                           |
| `guarded(-1)`            | an error: `guarded` requires `x > 0`              | the first condition fails, and `ln` is never reached                               |
| `guarded(2)`             | an error: `guarded` requires `ln(x) > 1`          | the second fails                                                                   |
| `guarded(4)`             | `= 4`                                             |                                                                                    |
| `guarded(sqrt(2)^2 - 2)` | `≈ 0 (within 4e-4049 of zero)`, with two warnings | the guard cannot be decided, and `ln` of the argument cannot be computed behind it |
| `ident(2)`               | `= 2`                                             |                                                                                    |
| `ident(sqrt(2))`         | `≈ 1.4142136`, with a warning                     | an identity never decides for an inexact argument                                  |

### The check at load, and the check at a call

As it loads the file, the app checks each function's body for the
dimension and kind it gives, and it does not compute the body for any
argument. The check applies every rule the body's operations and calls
follow. The operands of a sum must conform. A defined function called in
the body takes one argument per parameter, each conforming to its
annotation. A built-in follows its own dimension rule, so
`f(x) = sin(x)` keeps the file from loading, since `sin` takes an angle
and `x` is a plain number, while `f(x: radian) = sin(x)` loads. One
number in a body is computed at load: a `^` exponent, since the power's
dimension depends on it. The exponent is formed as a fraction, and one
too large to form within the significand limit is a fault at load. Any
other number in a body meets no limit until a call. A body that fails at
some value, or at every value, loads: `recip(x) = 1 / x` loads, and
`recip(0)` fails at the call. A call can then fail in three ways only:
for the count of its arguments, for an argument that does not conform or
fails a condition, or for a value its body cannot compute. Say the file
defines:

```
recip(x) = 1 / x
f(x: radian) = sin(x)
```

| You type               | Exucal shows                                                              | Note                         |
| ---------------------- | ------------------------------------------------------------------------- | ---------------------------- |
| `recip(2)`             | `= 0.5`                                                                   |                              |
| `recip(0)`             | an error: the definition of `recip` divides by zero                       | the body fails at this value |
| `recip(sqrt(2)^2 - 2)` | an error: the definition depends on a value that cannot be told from zero |                              |
| `f(30 deg)`            | `≈ 0.5`                                                                   | an angle, as `sin` takes     |
| `f(1)`                 | an error, a kind mismatch: `1` is a plain number where `f` takes an angle |                              |

### Exactness and cost

A call is computed as the body typed out in its place would be, afresh
at every pass of the retry loop and at the pass's precision. Its digits
are certified the same way, and a cancellation inside the body is paid
for by the next pass's digits: `em(x) = (exp(x) - 1) / x` gives `≈ 1` at
`1e-30`, and its author wrote nothing about precision to get it. A call
is not remembered, so a body that calls a function twice computes it
twice, at every pass, and a short definition can cost much
([What costs time](numbers.md#what-costs-time)). A parameter used twice
is two independent copies of its argument's error radius, so `x - x` in
a body is a value within a bound of zero and never exactly `0`. A
function written by hand in place of a built-in is slower, and can fail
where the built-in does not.
[Identities and cancellation](numbers.md#identities-and-cancellation)
gives examples of both. In decimal mode a call is not one step but its
body's steps, each rounded as a hand calculator rounds each keystroke,
where a built-in's value is rounded once
([The two modes](numbers.md#the-two-modes)). Say the file defines:

```
em(x) = (exp(x) - 1) / x
```

| You type                   | Exucal shows | Note                                       |
| -------------------------- | ------------ | ------------------------------------------ |
| `em(1e-30)`                | `≈ 1`        | the cancellation paid for by the next pass |
| `(exp(1e-30) - 1) / 1e-30` | `≈ 1`        | the body typed out: the same value         |

In decimal mode, at eight display digits:

| You type    | Exucal shows | Note                                                  |
| ----------- | ------------ | ----------------------------------------------------- |
| `em(1e-30)` | `= 0`        | `exp(1e-30)` is rounded to `1` before the subtraction |

## Inverses

An **inverse** gives back the argument that produces a value. It is
written on a line of its own, `~` before the function's name, and its
body computes the argument from the value its one parameter stands for:

```
tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15
```

An inverse is optional. Only a function of one parameter may have one,
since a conversion recovers one argument from one value. An inverse of a
function of two parameters, or of a function the file does not define,
keeps the file from loading. The parameter carries no annotation: its
argument is the function's result, so `y` in `~tempC` is a temperature.
As it loads the file, the app checks that the body gives back what the
function's parameter takes: `~tempC` gives a plain number, as `x` takes.

The inverse lets the function be a want. Typed alone as the want, the
function's name asks for the argument that gives the have. The argument
the inverse gives back is the **recovered argument**, and the answer is
written as the call, with the recovered argument as a count of the
parameter's annotation. Say the file holds `twelve` and its inverse:

```
twelve(n: in) = 12 n
~twelve(len) = len / 12
```

`~twelve` gives a length, as `n: in` takes, and `2 ft` into `twelve` is
written as the call with the recovered argument counted in inches. An
inverse may have conditions of its own, `~half(y) | y > 0 = 2 y`, which
restrict what can be converted into its function. An inverse is not
trusted on its own: the function is applied again to the recovered
argument, and a value certainly other than the have is an error, since
the inverse is then wrong.
[Conversion into a function](quantities.md#conversion-into-a-function)
gives every step of the conversion. An inverse is applied by a
conversion alone, and no expression calls one: to recover an argument,
convert into the function. Say the file also defines, with `~dbl` wrong
on purpose:

```
half(x) = x / 2
~half(y) | y > 0 = 2 y
dbl(x) = 2 x
~dbl(y) = y
```

| You type     | Into      | Exucal shows                                     | Note                                         |
| ------------ | --------- | ------------------------------------------------ | -------------------------------------------- |
| `300 K`      | `tempF`   | `= tempF(80.33)`                                 | the recovered argument                       |
| `tempF(212)` | `tempC`   | `= tempC(100)`                                   | a reading into a reading                     |
| `2 ft`       | `twelve`  | `= twelve(2 in)`                                 | the recovered argument, as a count of inches |
| `1 m`        | `twelve`  | `≈ twelve(3.2808399 in)`                         |                                              |
| `3`          | `half`    | `= half(6)`                                      |                                              |
| `-3`         | `half`    | an error: the inverse of `half` requires `y > 0` | the inverse's condition                      |
| `4`          | `dbl`     | an error: the inverse of `dbl` is wrong for `4`  | `dbl(4)` is `8`, not the have                |
| `4`          | `kinetic` | an error: `kinetic` has no inverse               | two parameters, so no inverse                |

## Names

The file's names follow four rules of their own, checked as the file
loads, beyond how a typed name is read ([Names](expressions.md#names)).

Units, unit lists, functions and the built-in functions share one set of
names, and a name is defined once in it. A unit and a function of one
name are a duplicate, and so is a function named like a built-in:
`sqrt(x) = x` keeps the file from loading, and no definition can stand
in for a built-in. Prefixes have a set of names of their own
([Prefixes](#prefixes)). An inverse adds no name: it is attached to its
function's name, and a second inverse for one function is a duplicate.

A list's or a function's name may not read as a prefix followed by a
unit. `ms hr;min;s` and `ms(x) = x` keep the file from loading: typed as
the want, `ms` would mean the list or the function, and typed as the
have it would mean the millisecond, so one text would mean two things.
The same rule holds for a built-in's name, so a unit `qrt` beside a
prefix `s-` would make `sqrt` read two ways. The predefined file spells
the decibel `decibel` for this reason: `dB` reads as `d` + `B`, a tenth
of a byte
([Names that are absent or mean something else](units.md#names-that-are-absent-or-mean-something-else)).

A name that could be read as two different prefix-unit pairs is an error
when the file loads, never an ambiguity settled by a rule. With `au` a
unit and `d-` and `da-` prefixes, a unit `u` would make `dau` both `d` +
`au` and `da` + `u`, so the predefined file writes the dalton as `Da`
and not as `u`.

In a function's body and in its conditions, a parameter's name wins over
a unit of that name: `f(t) = t s` uses the parameter `t`, not the tonne.
An annotation names units only. So a parameter may not be named like a
unit that its own line's annotations use: in `kinetic(m: kg, v: m/s)`
the one name `m` would mean the metre in the annotation and the
parameter in the body. The two rules settle which is which, but a person
reading the line sees one name mean two things, so the line is a fault
by design, and the parameter is named `mass` instead.

| The file holds                       | Result                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| `foo 1 m` and `foo(x) = x`           | does not load: `foo` is defined twice                      |
| `sqrt(x) = x`                        | does not load: `sqrt` is a built-in                        |
| `inch- 1000`                         | loads: a prefix and a unit may share a name                |
| `ms hr;min;s`                        | does not load: `ms` reads as `m` + `s`                     |
| `u 1 kg`                             | does not load: `dau` reads as `d` + `au` and as `da` + `u` |
| `f(t) = t s`                         | loads: `t` in the body is the parameter                    |
| `kinetic(m: kg, v: m/s) = m v^2 / 2` | does not load: `m` is the parameter and the metre of `m/s` |

## When the file does not load

The app reads the file whole, and a line that fits none of the six forms
stops the reading there. Then it checks the names, and then each
definition in the order written. The first fault found is the error, and
the file does not load until it is fixed. The faults, each with an
example (the faulty line, or the part of it at fault) and what to write
instead:

| The file does not load when                                                                                                         | Example                                                           | What to write instead                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| a unit's or a prefix's name is not followed by whitespace                                                                           | `inch2.54 cm`                                                     | `inch 2.54 cm`                                                                                            |
| a name has no body, or a body runs onto the next line                                                                               | `inch` alone                                                      | the whole definition on one line                                                                          |
| a prefix's body is `!` or a list                                                                                                    | `kilo- !`, `k- 1000;100`                                          | a body whose value is a plain number                                                                      |
| a list ends in `;` or has an empty item                                                                                             | `time hr;min;`                                                    | two or more expressions separated by `;`                                                                  |
| a function has no `=`, or a parameter is not a name                                                                                 | `tempC(x)`, `f(2) = 2`                                            | `name(parameters) = body`                                                                                 |
| an inverse has no parameter, several, or an annotated one                                                                           | `~f() = 2`, `~f(y: K) = y`                                        | exactly one parameter, without an annotation: it takes the function's result                              |
| an annotation has a number other than `1`, a sum or difference, a negation or a call                                                | `f(x: 2)`, `f(x: 1000 m)`, `f(x): kg/2`                           | the scale in the body; `1` for a plain number                                                             |
| a parameter is named twice                                                                                                          | `f(x, y, x)`                                                      | distinct names                                                                                            |
| a parameter is named like a unit that an annotation on the same line uses                                                           | `kinetic(m: kg, v: m/s)`                                          | another name for the parameter (`mass`); a unit the line's annotations do not name is fine (`f(t) = t s`) |
| a condition's comparisons do not all point one way                                                                                  | `\| 0 < x > 1`                                                    | a chain that bounds a range, `0 < x < 1`                                                                  |
| a function's name is directly followed by `[`                                                                                       | `f[n](x) = x`                                                     | reserved; no form of it is accepted today                                                                 |
| a name is defined twice in its set, a built-in function's name included                                                             | `foo 1 m` and `foo(x) = x`; `sqrt(x) = x`; a second `~tempC` line | one definition per name                                                                                   |
| an inverse names no function                                                                                                        | `~nothing(y) = y`                                                 | the function's own name after the `~`                                                                     |
| a name could be read as two prefix-unit pairs                                                                                       | `dau` as `d` + `au` and `da` + `u`                                | one of the two units under another name ([Names](#names))                                                 |
| a list's, a function's or a built-in's name reads as a prefix followed by a unit                                                    | `ms hr;min;s`, `ms(x) = x`                                        | a name that is not a prefixed unit; for a built-in's name, no unit and prefix that spell it               |
| a body, an item, an annotation or a condition names what is not defined, uses a function as a unit, or calls what is not a function | `foo 2 bogus`, `foo 2 tempC`, `foo kg(2)`                         | a defined name; `tempC(…)` for a call; `2 kg` for a product                                               |
| definitions refer to one another in a circle, through bodies, calls or conditions                                                   | `aa 2 bb` with `bb aa / 2`; `f(x) \| f(x) > 0 = x`                | a chain that ends in primitives                                                                           |
| a prefix's body has a dimension or a kind                                                                                           | `weird- 2 m`, `weird- 2 radian`                                   | a plain number                                                                                            |
| a list's units are not all of one dimension, not all certainly positive, or do not decrease                                         | `in;ft`, `ft;12 in`                                               | largest first, each smaller than the one before                                                           |
| a parameter's or the result's annotation is zero or cannot be told from zero                                                        | `f(x: zero)` with `zero 0 m`                                      | a unit of nonzero size: a converted quantity is written as a count of it                                  |
| the body's dimension does not fit the result's annotation                                                                           | `f(x: kg): m = x`                                                 | a body of that dimension, or no result annotation; `: 1` asserts a plain number                           |
| an inverse's body does not give back what the function's parameter takes                                                            | `f(x: kg) = x` with `~f(y) = y / kg`                              | a body of the parameter's dimension                                                                       |
| the terms of a condition are not of one dimension                                                                                   | `band(t: K) \| t > 0`                                             | `0 K`                                                                                                     |
| a condition mentions no parameter                                                                                                   | `\| 1 > 0`                                                        | a bound on an argument                                                                                    |
| a body or a condition gives a function or a built-in an argument of the wrong dimension or count                                    | `f(x) = sin(x)`, `f(x) = tempC(x, 2)`                             | `f(x: radian) = sin(x)`, or `sin(x radian)`; one argument per parameter                                   |
| a body adds quantities that do not conform                                                                                          | `f(x: kg) = x + 1 m`                                              | operands of one dimension                                                                                 |
| a `^` exponent in a body is too large a fraction to form within the significand limit                                               | `f(x) = x^(1e30000)`                                              | an exponent within the limit                                                                              |
| a unit, a prefix, a list item or an annotation cannot be computed, or calls a function whose condition fails or cannot be decided   | `bad 1 / 0`; `cold tempC(approx(-273.15))`                        | a value the arithmetic gives; an argument the condition decides                                           |

## What the app loads

The app loads one definitions file, the predefined one, `src/units.txt`,
and nothing else. No definition can be typed into the app.
