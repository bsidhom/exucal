# Built-in functions

Exucal's **built-in functions** are the functions it computes in code,
from `pi()` and `exp` to the Gamma family. Every other function the
calculator knows is a **defined function**, written in the definitions
file ([The definition language](definitions.md)), and the two are called
the same way ([Calls and arity](expressions.md#calls-and-arity)). The
set covers the functions a calculator is used for: all the elementary
functions, and the special functions that matter most in combinatorics,
probability and physics. Each is held to the arithmetic's guarantee
([Numbers](numbers.md)): a built-in returns the exact value wherever it
recognizes one, and otherwise a value shown to the digits it has
certified, or a message saying why there is none.

Three things about a built-in decide what a call shows. Its dimension
rule, the dimensions its arguments must have, decides whether the call
is an error before anything is computed. Its exact cases, the arguments
at which its value is a fraction, decide whether the result is exact.
Its edges and its limits decide where the result is an error or a
refusal instead of a value.

An example gives what you type, what you convert it into where that
matters, and what Exucal shows: the result side of an output line, with
its relation, `=` or `≈`, at the default settings unless the note says
otherwise. An error is described in a few words, not quoted.

The built-ins follow these rules:

- **Every built-in takes plain numbers, apart from the trigonometric functions and six that take any quantity; an argument outside the domain or at an edge is an error, and a value past a size limit, or a call past a limit of cost, is a refusal**
  ([Rules every built-in follows](#rules-every-built-in-follows)).
- **The elementary functions are exact at a few arguments and inexact everywhere else.**
  - `pi()` is inexact at every precision ([Constants](#constants)).
  - `exp` is exact at zero, and a logarithm is exact at `1` and where
    its argument and its base are whole-number powers of each other
    ([Exponential and logarithms](#exponential-and-logarithms)).
  - `sqrt`, `cbrt` and `pow` share the exact cases of `^`
    ([Roots and powers](#roots-and-powers)).
  - `sin`, `cos` and `tan` take an angle and are exact at zero
    ([Trigonometric](#trigonometric)), and `asin`, `acos`, `atan` and
    `atan2` return an angle
    ([Inverse trigonometric](#inverse-trigonometric)).
  - The hyperbolic functions take plain numbers and are exact at zero,
    and `acosh` is exact at one ([Hyperbolic](#hyperbolic)).
- **`approx` is the one built-in whose purpose is to make a value inexact**
  ([`approx`](#approx)).
- **`abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `div` and `mod` are exact on exact arguments, and all but `abs` and `mod` are exact on an inexact argument whose error radius lies on one side of a boundary**
  ([Magnitude, sign and rounding](#magnitude-sign-and-rounding),
  [Division](#division)).
- **`gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial` take only whole numbers known exactly, and every result is exact**
  ([Integer functions](#integer-functions)).
- **The Gamma family is exact only at whole numbers, where `gamma` and `beta` are factorials that fit the significand limit, and inexact everywhere else.**
  The first call at a new precision builds a table of Bernoulli ratios
  once, which the family's functions are computed from
  ([Gamma family](#gamma-family)). The incomplete gamma functions
  ([Incomplete gamma](#incomplete-gamma)), the error functions
  ([Error functions](#error-functions)) and the incomplete beta function
  ([Incomplete beta](#incomplete-beta)) are built on the family.
- **A function the definitions file defines, such as `tempC` or `decibel`, is a defined function, not a built-in**
  ([Functions defined in the file](#functions-defined-in-the-file)).
- **`zeta`, `lambertw`, the Bessel functions and some others are not provided**,
  and for some of them an expression over the functions provided stands in
  ([Not provided, and what to write instead](#not-provided-and-what-to-write-instead)).

## Rules every built-in follows

A built-in is called by its name followed by its arguments in
parentheses, with no space before the `(`. A call stands anywhere a unit
stands, in the have, the quantity you type, in the want, what you
convert it into, and in a definition's body: `exp(1)`, `2 sqrt(2) m` and
`sin(30 deg)` are calls.

### What a built-in takes

Every built-in takes **plain numbers**, quantities with neither
dimension nor kind, which [Quantities](quantities.md) calls
dimensionless
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)).
The exceptions are the trigonometric functions, which take an angle, and
six functions that take quantities of any dimension:

- `approx`, `abs` and `sign` take one quantity;
- `div`, `mod` and `atan2` take two quantities that conform, in
  dimension and in kind ([Conformance](quantities.md#conformance)).

An argument of the wrong dimension or kind is an error that names the
dimension, before anything is computed: `exp(1 m)` is an error, and a
plain number where an angle is needed is a kind mismatch
([Trigonometric](#trigonometric)). Each built-in takes a fixed count of
arguments, or a range: `round` takes one or two, and `pi()` takes none.
A call with another count is an error that says how many the function
takes ([Calls and arity](expressions.md#calls-and-arity)).

### Exact cases

A built-in recognizes some arguments at which its value is a fraction,
its **exact cases**, and there the result is exact: `sqrt(9/4)` is
`= 1.5` and `gamma(5)` is `= 24`. An exact result is shown with `=` when
the display holds all of its digits, and with `≈` when it has more, as
`factorial(20)` has at eight display digits
([Digits you can trust](numbers.md#digits-you-can-trust)). Every other
result is inexact. It is computed to the digits asked for and shown with
`≈`, however round it looks: `ln(8) / ln(2)` is `≈ 3`
([Operations that stay exact; exact cases of functions](numbers.md#operations-that-stay-exact-exact-cases-of-functions)).

### Errors and refusals

An argument outside the function's domain is an error that says what the
domain is: `ln(-1)`, `asin(2)` and `acosh(0.5)` are errors. An inexact
argument whose error radius reaches across an edge, either the end of
the domain or a pole, makes the calculator compute the call again at
more digits. At the ceiling the call is an error saying that the value
cannot be told from the edge
([Values at an edge](numbers.md#values-at-an-edge)), unless the result
is the same on both sides of the edge, as it is for `trunc` at zero
([Magnitude, sign and rounding](#magnitude-sign-and-rounding)):
`tan(90 deg)` is such an error, at the pole of `tan`. A value the size
limits cannot hold is a refusal, never a wrong value
([Values too big to hold](numbers.md#values-too-big-to-hold)), and so is
a call that would take more work than the calculator allows:

- A result whose exponent would pass `10^18` is too large to compute,
  and one whose exponent would fall below `-10^18` is too small:
  `exp(1e30)` and `sinh(1e30)` are too large, `exp(-1e30)` is too small,
  and `exp(1e6)` is a value, `≈ 3.0332154e+434294`. `approx` around the
  argument changes nothing here, since `approx` says how well a value is
  known and not how large it is. - A result that would need a
  significand past the significand limit is refused as past it:
  `factorial(20000)`. So is a call that needs its argument to more
  digits than the limit holds: a huge angle
  ([Trigonometric](#trigonometric)), or a huge argument of `beta` or of
  the incomplete functions, whose logarithms need as many digits more as
  the argument has before the point ([Gamma family](#gamma-family)).
  `approx` lifts such a refusal only where the refused operation can
  round an inexact operand instead, as the subtraction inside `mod`
  rounds `approx(-1)` and absorbs the `1` into the error radius
  ([Division](#division)). It does not shorten the digits a function
  needs of its argument ([approx](numbers.md#approx)). - A few calls are
  refused for the work they would take rather than for the size of a
  value: the incomplete gamma functions at large arguments
  ([Incomplete gamma](#incomplete-gamma)), and the incomplete beta
  function at large parameters with the argument near the point where
  the value is one half ([Incomplete beta](#incomplete-beta)). The
  message of such a refusal says that the call is past the significand
  limit, though the limit there is one of cost rather than of size.

### Decimal mode

Decimal mode is the arithmetic that rounds every step to a set number of
digits ([The two modes](numbers.md#the-two-modes)), and there a call is
one step. The calculator computes the call's value at rising precision
until its rounding to the step's digits is certified, then rounds it
once, and an exact case is rounded like any other value. So
`ln(8) / ln(2)` is `= 2.9999999` there, `factorial(20)` is
`= 2.432902e+18`, and `approx` is the identity
([approx](numbers.md#approx)).

### Names

No prefix applies to a function: `kpi()` is a call of an unknown
function ([Names](expressions.md#names)). A built-in's name is in the
one namespace that the units, the unit lists and the defined functions
share, so the definitions file cannot define a function of a built-in's
name ([Names](definitions.md#names)).

| You type                  | Exucal shows                                           | Note                                       |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `exp(1 m)`                | an error: the argument of `exp` must be a plain number | the dimension rule                         |
| `round(1, 2, 3)`          | an error: `round` takes 1 to 2 arguments               | the count of arguments                     |
| `gamma(5)`                | `= 24`                                                 | an exact case                              |
| `factorial(20)`           | `≈ 2.432902e+18`                                       | an exact case, with more digits than shown |
| `ln(8) / ln(2)`           | `≈ 3`                                                  | inexact, however round                     |
| `ln(-1)`                  | an error: the argument is not positive                 | the domain                                 |
| `exp(1e30)`               | refused: too large to compute                          | the exponent bound                         |
| `exp(1e6)`                | `≈ 3.0332154e+434294`                                  | within the bound                           |
| `factorial(20000)`        | refused: past the significand limit                    | the size of the value                      |
| `lowergammareg(1e7, 1e7)` | refused: past the significand limit                    | the work, not the size                     |
| `ln(8) / ln(2)`           | `= 2.9999999`                                          | decimal mode                               |
| `factorial(20)`           | `= 2.432902e+18`                                       | decimal mode: the exact case rounded once  |
| `kpi()`                   | an error: unknown function `kpi`                       | no prefix on a function                    |

## Constants

`pi()` is the circle constant, written as a call of no arguments so that
it is computed to the precision in force, in an expression and in a
definition's body alike. It has no exact case: π is irrational, so
`pi()` is inexact at every precision, and so is every unit defined
through it ([Angles and rotation](units.md#angles-and-rotation)).
Euler's number has no call of its own and is written `exp(1)`, since `e`
is the elementary charge
([Names that are absent or mean something else](units.md#names-that-are-absent-or-mean-something-else)).

| You type | Into  | Exucal shows        | Note                                                      |
| -------- | ----- | ------------------- | --------------------------------------------------------- |
| `pi()`   |       | `≈ 3.1415927`       | inexact at every precision                                |
| `1 turn` | `deg` | `≈ 360 deg`         | both units carry `pi()`                                   |
| `exp(1)` |       | `≈ 2.7182818`       | Euler's number                                            |
| `e`      | `C`   | `≈ 1.6021766e-19 C` | the elementary charge: exact, with more digits than shown |

## Exponential and logarithms

`exp(x)` is the exponential of a plain number. `ln(x)`, `log10(x)` and
`log2(x)` are the natural, decimal and binary logarithms of a positive
plain number. `log(b, x)` is the logarithm of `x` to the base `b`,
written base first so that it reads as the logarithm to base `b` of `x`;
the base is a positive plain number other than one. The exact cases are
these. `exp(0)` is `= 1`. `ln(1)` is `= 0`, and so is every logarithm of
`1`. `log10` and `log2` of a whole-number power of their base, with a
positive or a negative exponent, give that exponent: `log10(1000)` is
`= 3` and `log2(1/8)` is `= -3`. `log(b, x)` is exact where `x` is a
whole-number power of `b` or `b` is a whole-number power of `x`:
`log(2, 8)` is `= 3` and `log(8, 2)` is the exact `1/3`. The exact cases
stop there. `exp(1)` and `ln(2)` are inexact, and so is `log(4, 8)`,
whose exponent `3/2` is neither a whole number nor the reciprocal of
one: it is computed inexactly, `≈ 1.5`. No argument is too large or too
small for a logarithm: `ln(1e-300)` is `≈ -690.77553`, and
`log10(1e999999999)` is the whole number `999999999`.

| You type             | Exucal shows                           | Note                                            |
| -------------------- | -------------------------------------- | ----------------------------------------------- |
| `exp(0)`             | `= 1`                                  | an exact case                                   |
| `exp(1)`             | `≈ 2.7182818`                          |                                                 |
| `ln(1)`              | `= 0`                                  | an exact case                                   |
| `ln(2)`              | `≈ 0.69314718`                         |                                                 |
| `log10(1000)`        | `= 3`                                  | a power of the base                             |
| `log2(1/8)`          | `= -3`                                 | a negative exponent                             |
| `log(2, 8)`          | `= 3`                                  |                                                 |
| `log(8, 2)`          | `≈ 0.33333333`                         | exact, `1/3`, with more digits than shown       |
| `log(4, 8)`          | `≈ 1.5`                                | inexact: `3/2` is not an exact case             |
| `ln(0)`              | an error: the argument is not positive |                                                 |
| `log(-2, 8)`         | an error: the base is not positive     |                                                 |
| `log(1, 8)`          | an error: no logarithm has base one    |                                                 |
| `ln(1e-300)`         | `≈ -690.77553`                         | any exponent                                    |
| `log10(1e999999999)` | `≈ 1e+9`                               | exact, `999999999`, with more digits than shown |

## Roots and powers

`sqrt(x)` and `cbrt(x)` are the square and cube roots of a plain number,
and `pow(x, y)` raises a plain number to a plain number. The three share
the exact cases of `^` ([Operators](expressions.md#operators)). A root
is exact where the argument is a perfect square or cube: `sqrt(9/4)` is
`= 1.5` and `cbrt(-8)` is `= -2`. `pow` is exact for a whole-number
exponent and for a fraction whose root is exact: `pow(2, 3)` is `= 8`
and `pow(4, 1/2)` is `= 2`. Every other value is inexact, `sqrt(2)` and
`pow(2, sqrt(2))` among them. An even root of a negative value is an
error, so `sqrt(-1)` is an error, while a cube root of a negative value
is a value.

`pow` and `^` differ in what they take. `^` raises a quantity of any
dimension to an exponent typed as a number or a fraction, never
computed, so that the dimension stays exact. `pow` raises a plain number
to an exponent that may be anything computed. So `(2 m)^2` is the square
of a quantity, while `pow(2 m, 2)` is an error whose message says to
write `(2 m)^2`; and `pow(2, sqrt(2))` is a value, while `2^sqrt(2)` is
an error as it is typed, reported before anything is computed, since a
`^` exponent must be a number. A `^` exponent is held as a fraction that
must fit the significand limit, while `pow` computes the exponential of
`y` times the logarithm of `x` instead, which no exponent can overfill
([Values too big to hold](numbers.md#values-too-big-to-hold)):
`2^1e-30000` is refused, while `pow(2, 1e-30000)` is `≈ 1`.

| You type           | Exucal shows                               | Note                                     |
| ------------------ | ------------------------------------------ | ---------------------------------------- |
| `sqrt(9/4)`        | `= 1.5`                                    | an exact case                            |
| `cbrt(-8)`         | `= -2`                                     | a cube root of a negative value          |
| `sqrt(2)`          | `≈ 1.4142136`                              |                                          |
| `pow(2, 3)`        | `= 8`                                      | a whole-number exponent                  |
| `pow(4, 1/2)`      | `= 2`                                      | the root is exact                        |
| `pow(2, sqrt(2))`  | `≈ 2.6651441`                              | a computed exponent                      |
| `sqrt(-1)`         | an error: an even root of a negative value |                                          |
| `(2 m)^2`          | `= 4 m^2`                                  | `^` for a quantity                       |
| `pow(2 m, 2)`      | an error: the base must be a plain number  | the message says to write `(2 m)^2`      |
| `2^sqrt(2)`        | an error as it is typed                    | a `^` exponent is never computed         |
| `2^1e-30000`       | refused: past the significand limit        | the exponent's denominator is `10^30000` |
| `pow(2, 1e-30000)` | `≈ 1`                                      | through the logarithm                    |

## Trigonometric

`sin(x)`, `cos(x)` and `tan(x)` take an angle, a quantity of the radian
kind
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)):
`sin(30 deg)`, `sin(pi() radian / 4)` and `tan(1 radian)` are calls. A
plain number is not an angle, so `sin(1)` is an error that says to write
`sin(1 radian)`. The exact cases are at zero alone: `sin(0 radian)` and
`tan(0 radian)` are `= 0`, and `cos(0 radian)` is `= 1`. Every other
value is inexact. An angle typed in degrees is inexact before the
function is applied, since `deg` is defined through `pi()`, so
`sin(30 deg)` is `≈ 0.5`
([Units, prefixes and exactness of factors](quantities.md#units-prefixes-and-exactness-of-factors)).
`sin(pi() radian)` is zero only within a bound, since `pi()` is inexact,
and no pass certifies a digit of it, so the retry loop runs to the
ceiling
([Identities and cancellation](numbers.md#identities-and-cancellation)).
`tan` has a pole at every odd multiple of a right angle, and an inexact
argument there cannot be told from the pole, so `tan(90 deg)` is an
error at the ceiling. A huge angle is refused as past the significand
limit, since reducing it needs π to as many digits as the angle has
before its decimal point: `sin(1e999999999 radian)` would need a billion
of them.

| You type                  | Exucal shows                                               | Note                                      |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `sin(30 deg)`             | `≈ 0.5`                                                    | `deg` is inexact                          |
| `sin(pi() radian / 4)`    | `≈ 0.70710678`                                             |                                           |
| `tan(1 radian)`           | `≈ 1.5574077`                                              |                                           |
| `sin(0 radian)`           | `= 0`                                                      | an exact case                             |
| `cos(0 radian)`           | `= 1`                                                      | an exact case                             |
| `sin(1)`                  | an error, a kind mismatch, saying to write `sin(1 radian)` |                                           |
| `tan(90 deg)`             | an error: the argument cannot be told from a pole          | at the ceiling                            |
| `sin(pi() radian)`        | `≈ 0 (within 2e-4049 of zero)`                             | zero within a bound, at the ceiling       |
| `sin(1e999999999 radian)` | refused: past the significand limit                        | the reduction needs π to a billion digits |

## Inverse trigonometric

`asin(x)`, `acos(x)`, `atan(x)` and `atan2(y, x)` return an angle, of
the radian kind. `asin` and `acos` take a plain number within `[-1, 1]`,
and `atan` takes any plain number. `atan2` takes a rise `y` and a run
`x`, two quantities that conform, and gives the angle between the run's
direction and the line from the origin to the point they mark, in that
point's quadrant: `atan2(3 m, 4 m)` is the angle whose tangent is three
quarters. The result is an angle whatever unit it is shown in.
`asin(0.5)` into `deg` is `≈ 30 deg`. Into `turn` it is
`≈ 0.083333333 turn`, the same angle counted in turns, an angle still.
`asin(0.5) / radian` is the angle's measure in radians, a plain number,
`≈ 0.52359878`. The exact cases are the zero results: `asin(0)`,
`atan(0)`, `acos(1)` and `atan2(0, 1)` are `= 0 radian`, and `asin(0)`
into `deg` is `= 0 deg`. Every other value is inexact, a right angle
among them. A conversion of an inexact angle is `≈` for that reason
alone, and `deg` and `turn` are inexact units in any case, being defined
through `pi()`. An argument outside `[-1, 1]` is an error: `asin(2)`.

| You type             | Into   | Exucal shows                                  | Note                        |
| -------------------- | ------ | --------------------------------------------- | --------------------------- |
| `asin(0.5)`          | `deg`  | `≈ 30 deg`                                    |                             |
| `atan2(3 m, 4 m)`    | `deg`  | `≈ 36.869898 deg`                             | an angle from two lengths   |
| `asin(0.5)`          | `turn` | `≈ 0.083333333 turn`                          | an angle still              |
| `asin(0.5) / radian` |        | `≈ 0.52359878`                                | the measure in radians      |
| `asin(0)`            | `deg`  | `= 0 deg`                                     | an exact case               |
| `acos(1)`            |        | `= 0 radian`                                  | an exact case               |
| `asin(1)`            | `deg`  | `≈ 90 deg`                                    | inexact: a right angle      |
| `asin(2)`            |        | an error: the argument lies outside `[-1, 1]` |                             |
| `atan2(3 m, 4 s)`    |        | an error, a dimension mismatch                |                             |
| `2 asin(0.5) + 1`    |        | an error, a kind mismatch                     | an angle and a plain number |

## Hyperbolic

`sinh(x)`, `cosh(x)` and `tanh(x)` and their inverses `asinh(x)`,
`acosh(x)` and `atanh(x)` take plain numbers and give plain numbers.
Their arguments are not angles, so `sinh(1 radian)` is an error. The
exact cases are at zero and one: `sinh(0)`, `tanh(0)`, `asinh(0)` and
`atanh(0)` are `= 0`, `cosh(0)` is `= 1`, and `acosh(1)` is `= 0`. Every
other value is inexact. `acosh` takes an argument at or above `1`, and
`atanh` takes an argument strictly between `-1` and `1`: `acosh(0.5)`
and `atanh(1)` are errors. `sinh` and `cosh` grow as `exp` does and
reach the exponent bound as it does
([Values too big to hold](numbers.md#values-too-big-to-hold)):
`sinh(1e30)` is too large to compute.

| You type         | Exucal shows                                                | Note               |
| ---------------- | ----------------------------------------------------------- | ------------------ |
| `sinh(0)`        | `= 0`                                                       | an exact case      |
| `cosh(0)`        | `= 1`                                                       | an exact case      |
| `acosh(1)`       | `= 0`                                                       | an exact case      |
| `sinh(1)`        | `≈ 1.1752012`                                               |                    |
| `sinh(1 radian)` | an error: the argument must be a plain number               | not an angle       |
| `acosh(0.5)`     | an error: the argument is less than `1`                     |                    |
| `atanh(1)`       | an error: the argument is not strictly between `-1` and `1` |                    |
| `sinh(1e30)`     | refused: too large to compute                               | the exponent bound |

## `approx`

`approx(x)` is the value of `x` known to the precision of the pass and
no better: its argument is any quantity, angles included, and its result
has the argument's dimension. It is the one operation whose purpose is
to make a value inexact, so `approx(2.54) cm` into `in` is `≈ 1 in`
while `2.54 cm` into `in` is `= 1 in` ([approx](numbers.md#approx) says
what it does and what it cannot do).

| You type          | Into  | Exucal shows | Note                         |
| ----------------- | ----- | ------------ | ---------------------------- |
| `approx(2.54) cm` | `in`  | `≈ 1 in`     | inexact on purpose           |
| `2.54 cm`         | `in`  | `= 1 in`     |                              |
| `approx(30 deg)`  | `deg` | `≈ 30 deg`   | an angle, its dimension kept |

## Magnitude, sign and rounding

`abs(x)` is the magnitude of a quantity of any dimension and keeps the
dimension. `sign(x)` takes any quantity and gives `-1`, `0` or `1`, a
plain number. `floor(x)`, `ceil(x)`, `trunc(x)` and `round(x)` take a
plain number, since a quantity is held in the primitives and
`floor(3.7 ft)` would floor the meters: it is an error, and the floor of
a length is `floor(3.7 ft / ft) ft`
([A quantity carries no unit](quantities.md#a-quantity-carries-no-unit)).
`round(x)` rounds to a whole number, and `round(x, places)` rounds to
that many decimal places, a negative count rounding to the left of the
point: `round(3.14159, 2)` is `= 3.14` and `round(1234, -2)` is
`= 1200`. Both round in the rounding mode the settings choose
([Rounding](settings.md#rounding)). Inside an expression that is the one
place where the mode acts, and
[Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)
says how each mode rounds a tie.

All six are exact on an exact argument. On an inexact argument `abs`
keeps the error radius, so its result is inexact. The result of the
other five depends only on which side of a boundary the argument lies.
For `sign` the boundary is zero. For the rounding functions it is a
**rounding boundary**, a point between two values the function could
round to: a whole number for `floor`, `ceil` and `trunc`, and for
`round` either a whole number or a point halfway between two of them, as
the mode decides. So the result is exact once the whole error radius
lies on one side of the boundary: `round(sqrt(2), 3)` is `= 1.414`.
While the radius still reaches across the boundary at the ceiling, the
result is an error: `floor(sqrt(2)^2)` is one such, since its argument
reaches across `2` at every precision. Zero is the one boundary at which
some of them still have an answer for a value that cannot be told from
zero. `trunc`, and `round` in a mode to nearest or toward zero, give
`= 0`, since they give `0` on either side of zero. `floor`, `ceil`,
`sign` and `round` in the other modes make it an error, since their
results differ on the two sides
([Values at an edge](numbers.md#values-at-an-edge)).

| You type                   | Into | Exucal shows                                    | Note                                     |
| -------------------------- | ---- | ----------------------------------------------- | ---------------------------------------- |
| `abs(-3 m)`                |      | `= 3 m`                                         | the dimension kept                       |
| `sign(-3 m)`               |      | `= -1`                                          | a plain number                           |
| `floor(3.7 ft)`            |      | an error: the argument must be a plain number   |                                          |
| `floor(3.7 ft / ft) ft`    | `ft` | `= 3 ft`                                        | the unit divided out and back            |
| `round(3.14159, 2)`        |      | `= 3.14`                                        |                                          |
| `round(1234, -2)`          |      | `= 1200`                                        | to the left of the point                 |
| `round(sqrt(2), 3)`        |      | `= 1.414`                                       | exact: the side of the boundary is known |
| `abs(sqrt(2) - 2)`         |      | `≈ 0.58578644`                                  | inexact: the radius kept                 |
| `floor(sqrt(2)^2)`         |      | an error: the argument cannot be told from `2`  | at the ceiling                           |
| `trunc(sqrt(2) - sqrt(2))` |      | `= 0`                                           | the same on both sides of zero           |
| `floor(sqrt(2) - sqrt(2))` |      | an error: the argument cannot be told from zero | at the ceiling                           |

## Division

`div(a, b)` and `mod(a, b)` are floored division and its remainder, on
two quantities of one dimension. `div(a, b)` is the floor of `a / b`,
and `mod(a, b)` is the rest, `a - b div(a, b)`, so the remainder is zero
or has the divisor's sign: `div(-7, 2)` is `= -4` and `mod(-7, 2)` is
`= 1`. `div` gives a count, a plain number, and `mod` keeps the
dimension: `div(7 ft, 2 ft)` is `= 3`, and `mod(-30 deg, 360 deg)` is
`≈ 330 deg`. Both are exact on exact arguments. On an inexact argument
`div` answers as the rounding functions do, by the side of a whole
number the quotient lies on
([Magnitude, sign and rounding](#magnitude-sign-and-rounding)), and
`mod` is inexact. A divisor of zero is an error. A remainder that would
need a significand past the significand limit is refused, with `approx`
and decimal mode offered: `mod(-1, 1e20000)`, whose remainder
`1e20000 - 1` has twenty thousand digits, is refused, while
`mod(approx(-1), 1e20000)` is `≈ 1e+20000`.

| You type                   | Into  | Exucal shows                                                                           | Note                                     |
| -------------------------- | ----- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `div(-7, 2)`               |       | `= -4`                                                                                 | floored                                  |
| `mod(-7, 2)`               |       | `= 1`                                                                                  | the divisor's sign                       |
| `div(7 ft, 2 ft)`          |       | `= 3`                                                                                  | a count                                  |
| `mod(7 ft, 2 ft)`          | `ft`  | `= 1 ft`                                                                               | the dimension kept                       |
| `mod(-30 deg, 360 deg)`    | `deg` | `≈ 330 deg`                                                                            | an angle; `≈` since `deg` is inexact     |
| `div(7, 0)`                |       | an error: division by zero                                                             |                                          |
| `mod(sqrt(2), 1)`          |       | `≈ 0.41421356`                                                                         | inexact                                  |
| `mod(-1, 1e20000)`         |       | refused: past the significand limit; the message suggests `approx(-1)` or decimal mode | the remainder has twenty thousand digits |
| `mod(approx(-1), 1e20000)` |       | `≈ 1e+20000`                                                                           | the `1` absorbed into the error radius   |

## Integer functions

`gcd(a, b)`, `lcm(a, b)`, `factorial(n)`, `binomial(n, k)` and
`doublefactorial(n)` take whole numbers known exactly, and every result
is exact. `gcd` and `lcm` are never negative. An inexact argument is an
error, since an inexact value is not known to be any whole number:
`factorial(approx(5))` is an error in exact mode, the default, where
`approx(5)` is inexact. A value that is not a whole number is an error
too, and so is one outside the domain the message names:
`factorial(5.5)` and `factorial(-1)` are errors. `factorial`, `binomial`
and `doublefactorial` predict the size of their result and are refused
past the significand limit before anything is computed:
`factorial(5000)` is a value of 16,326 digits, and `factorial(20000)`,
whose value has 77,338 digits, is refused. `gamma(20001)` gives that
value to the digits asked ([Gamma family](#gamma-family)).

| You type               | Exucal shows                                 | Note                            |
| ---------------------- | -------------------------------------------- | ------------------------------- |
| `gcd(12, 18)`          | `= 6`                                        |                                 |
| `gcd(-12, 18)`         | `= 6`                                        | never negative                  |
| `gcd(5, 0)`            | `= 5`                                        |                                 |
| `lcm(4, 6)`            | `= 12`                                       |                                 |
| `factorial(5)`         | `= 120`                                      |                                 |
| `binomial(5, 2)`       | `= 10`                                       |                                 |
| `doublefactorial(7)`   | `= 105`                                      |                                 |
| `factorial(approx(5))` | an error: the argument is not known exactly  | exact mode                      |
| `factorial(5.5)`       | an error: the argument is not a whole number |                                 |
| `factorial(-1)`        | an error: the argument is negative           |                                 |
| `factorial(5000)`      | `≈ 4.2285779e+16325`                         | exact, a value of 16,326 digits |
| `factorial(20000)`     | refused: past the significand limit          | before anything is computed     |

## Gamma family

The family is four functions of plain numbers.

- `gamma(x)` is the Gamma function, which extends the factorial.
- `lgamma(x)` is the logarithm of its magnitude.
- `digamma(x)` is its logarithmic derivative.
- `beta(a, b)` is the Beta function, `gamma(a) gamma(b) / gamma(a + b)`.

The family is exact only at whole numbers: `gamma` and `beta` where the
factorials they reduce to fit the significand limit, and `lgamma` at `1`
and `2`. `digamma` has no exact case. Every other value is inexact.

### The Gamma function and its logarithm

`gamma(x + 1)` is `factorial(x)` for a whole number `x` and extends the
factorial to every other value: `gamma(5)` is `= 24`, `gamma(0.5)^2` is
`≈ 3.1415927`, and `gamma(-1.5)` is `≈ 2.3632718`. So `gamma` gives the
factorial of a value that is inexact or not a whole number, and of a
whole number past the significand limit: `gamma(20001)` is
`≈ 1.8192063e+77337`, the value `factorial(20000)` cannot hold. The
poles are zero and the negative whole numbers, where `gamma` and
`lgamma` are errors. `lgamma` gives the logarithm of a Gamma value the
exponent bound refuses: `lgamma(1e19)` is a value, while `gamma(1e19)`
is refused as too large to compute.

### The logarithmic derivative

`digamma` is the derivative of `lgamma`, with the same poles:
`digamma(1)` is `≈ -0.57721566`, minus the Euler–Mascheroni constant. An
inexact argument that cannot be told from a pole is an error at the
ceiling: `digamma(approx(-2))`.

### The Beta function

`beta(a, b)` is `gamma(a) gamma(b) / gamma(a + b)`, and it is exact for
positive whole numbers: `beta(2, 3)` is the exact `1/12`, and
`beta(0.5, 0.5)` is `≈ 3.1415927`. A whole number at or below zero in
either argument is a pole, an error. When the sum `a + b` is such a
number and neither argument is, the value is exactly `0`, since the pole
is in the denominator: `beta(-0.5, -0.5)` is `= 0`. Outside its exact
cases, the magnitude of `beta` is the exponential of
`lgamma(a) + lgamma(b) - lgamma(a + b)`, and its sign is decided from
the arguments. The three logarithms are taken to the working digits plus
the digits of the largest argument's whole part, so that their
cancellation leaves the working digits. So `beta` has a value where
`gamma` of an argument is refused as too large, as long as its own value
fits the exponent bound and the digits the logarithms need fit the
significand limit. `beta(1e17, 1.5)` is `≈ 2.8024956e-26`, while
`gamma(1e17)` is refused as too large to compute. `beta(1e19, 1e19)` is
refused as too small to compute, and `beta(1e20000, 2)` as past the
significand limit. For whole numbers `n` and `k` with `k` from `0` to
`n`, `1 / ((n + 1) beta(n - k + 1, k + 1))` is `binomial(n, k)`, and the
same expression gives a binomial of values that are inexact or not whole
numbers: `1 / (5.5 beta(4.5, 2))` is `≈ 4.5`, the binomial of `4.5` and
`1`.

### What the family costs

The family's functions are computed from a table of the ratios of
consecutive Bernoulli numbers: `lgamma` and `digamma` are computed from
those ratios, and the magnitude of `gamma` is the exponential of
`lgamma`, with its sign decided from the argument. The table grows with
the precision. The calculator builds it on first use, for the precision
in force, and keeps it until a call needs a larger one. Outside their
exact cases, `gamma`, `lgamma` and `digamma` pay for the table the first
time. Huge and tiny arguments of `lgamma` and `digamma` are the
exception: they take a shorter route and pay nothing. Every other call
pays only where it needs `lgamma`, `gamma` or `beta` on the way to its
own value:

- `beta` pays through `lgamma` outside its exact cases, and a call that
  needs `beta` pays through `beta`.
- `lowergammareg` and `uppergammareg` compute `lgamma` on the way to
  their value outside their exact cases, except where their first
  argument is `1`, so they pay through `lgamma`
  ([Incomplete gamma](#incomplete-gamma)). `erf` and `erfc` are built on
  `lowergammareg` and `uppergammareg`, so they pay through `lgamma` too,
  apart from huge arguments ([Error functions](#error-functions)).
- `incbetareg` computes `lgamma` of each parameter and of their sum
  outside its exact cases, so it pays through `lgamma`. `incbeta` pays
  through `beta` where it needs `beta` of its parameters: at an argument
  of `1`, where it is `beta`, and where the calculator reaches its value
  by subtraction from `beta` ([Incomplete beta](#incomplete-beta)).
- `lowergamma` and `uppergamma` pay through `gamma` where they need
  `gamma` of their first argument: `uppergamma` at an argument of `0`,
  where it is `gamma`, and either of them where the calculator reaches
  its value by subtraction from `gamma`
  ([Incomplete gamma](#incomplete-gamma)). `lowergamma(2.5, 1)` is
  computed directly and pays nothing, while `uppergamma(2.5, 1)` is
  `gamma(2.5)` less it and pays.

A result certified at its first pass pays little at the default digits,
since the table for that pass is small, while a result that runs to the
ceiling pays noticeably for it the first time. `beta(0.5, 0.5) - pi()`
is such a result, an exact cancellation that no pass certifies
([Identities and cancellation](numbers.md#identities-and-cancellation)).
The same expression again, or another that needs no larger table, pays
nothing more ([What costs time](numbers.md#what-costs-time)).

| You type                 | Exucal shows                                      | Note                                                   |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------ |
| `gamma(5)`               | `= 24`                                            | an exact case: `factorial(4)`                          |
| `gamma(0.5)^2`           | `≈ 3.1415927`                                     |                                                        |
| `gamma(-1.5)`            | `≈ 2.3632718`                                     |                                                        |
| `gamma(20001)`           | `≈ 1.8192063e+77337`                              | the value `factorial(20000)` cannot hold               |
| `gamma(0)`               | an error: a pole                                  |                                                        |
| `gamma(1e19)`            | refused: too large to compute                     | the exponent bound                                     |
| `lgamma(1e19)`           | `≈ 4.2749117e+20`                                 |                                                        |
| `lgamma(1)`              | `= 0`                                             | an exact case                                          |
| `lgamma(3)`              | `≈ 0.69314718`                                    | `ln(2)`, inexact                                       |
| `digamma(1)`             | `≈ -0.57721566`                                   | minus the Euler–Mascheroni constant                    |
| `digamma(approx(-2))`    | an error: the argument cannot be told from a pole | at the ceiling                                         |
| `beta(0.5, 0.5)`         | `≈ 3.1415927`                                     |                                                        |
| `beta(2, 3)`             | `≈ 0.083333333`                                   | exact, `1/12`, with more digits than shown             |
| `beta(-0.5, -0.5)`       | `= 0`                                             | a pole in the denominator alone                        |
| `beta(0, 1)`             | an error: a pole                                  |                                                        |
| `beta(1e17, 1.5)`        | `≈ 2.8024956e-26`                                 | where `gamma(1e17)` is refused                         |
| `beta(1e6, 1e6)`         | `≈ 3.6164047e-602063`                             |                                                        |
| `beta(1e19, 1e19)`       | refused: too small to compute                     | the exponent bound                                     |
| `beta(1e20000, 2)`       | refused: past the significand limit               | the digits the logarithms need                         |
| `1 / (5.5 beta(4.5, 2))` | `≈ 4.5`                                           | the binomial of `4.5` and `1`                          |
| `1 / (6 beta(4, 3))`     | `= 10`                                            | `binomial(5, 2)` through `beta`                        |
| `beta(0.5, 0.5) - pi()`  | `≈ 0 (within 4e-4049 of zero)`                    | runs to the ceiling; pays for the table the first time |

## Incomplete gamma

`lowergamma(s, x)` and `uppergamma(s, x)` are the incomplete gamma
functions, which split `gamma(s)` at `x` into the part below `x` and the
part above it. `lowergammareg(s, x)` and `uppergammareg(s, x)` are their
regularized forms, the same divided by `gamma(s)` so that they run from
`0` to `1`, which statistics uses as probabilities. All take plain
numbers, the order `s` positive and the argument `x` at or above zero.
`lowergammareg(0.5, 0.5)` is `≈ 0.68268949`, the probability that a
normal value lies within one standard deviation, and
`uppergammareg(1/2, 1.96^2 / 2) / 2` is the tail beyond `1.96`,
`≈ 0.024997895`. The exact cases are at `x = 0`: the lower forms are
`= 0`, `uppergammareg` is `= 1`, and `uppergamma` is `gamma(s)`, exact
where `gamma(s)` is. An order of `1` is not an exact case:
`lowergammareg(1, x)` is `1 - exp(-x)` and `uppergammareg(1, x)` is
`exp(-x)`, inexact for an `x` above zero. Every other value is inexact.

Apart from an order of `1`, an inexact value is computed by one of two
routes: a series, which gives the lower function, or a continued
fraction, which gives the upper. The calculator chooses the route by the
order, the argument, the precision and which of the pair is asked for.
The other function of the pair is `gamma(s)` less the one computed. For
the regularized forms it is `1` less the one computed. How much work
either route takes depends on the order and the argument together, and
grows with the precision. Each route has a limit on its work, and where
neither route is within its limit the calculator refuses the call rather
than run it, a refusal of cost
([Rules every built-in follows](#rules-every-built-in-follows)). Very
large orders can be past both limits. The continued fraction is stepped
up to the order one unit at a time, and the steps are limited, so at a
very large order only the series is left: `uppergammareg(1e4, 1e6)` is a
value, while `uppergammareg(1e5, 1e6)` is refused. The series' work
grows with how far the argument lies past the order, as well as with the
order and the precision: `uppergammareg(1e5, 1.1e5)` is a value, while
`uppergammareg(1e5, 1.5e5)` is refused. `lowergammareg(1e6, 1e6)` is a
value at the default digits and refused at a thousand display digits,
and `lowergammareg(1e7, 1e7)` is refused at the default digits.

| You type                             | Exucal shows                        | Note                                                    |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------- |
| `lowergammareg(0.5, 0.5)`            | `≈ 0.68268949`                      | within one standard deviation                           |
| `uppergammareg(1/2, 1.96^2 / 2) / 2` | `≈ 0.024997895`                     | the tail beyond `1.96`                                  |
| `lowergamma(2, 0)`                   | `= 0`                               | an exact case                                           |
| `uppergammareg(2, 0)`                | `= 1`                               | an exact case                                           |
| `uppergamma(2, 0)`                   | `= 1`                               | `gamma(2)`, exact                                       |
| `uppergamma(2.5, 0)`                 | `≈ 1.3293404`                       | `gamma(2.5)`, inexact                                   |
| `uppergammareg(1, 2)`                | `≈ 0.13533528`                      | `exp(-2)`                                               |
| `lowergammareg(0, 1)`                | an error: the order is not positive |                                                         |
| `lowergammareg(1, -1)`               | an error: the argument is negative  |                                                         |
| `uppergammareg(1e4, 1e6)`            | `≈ 1.170002e-409956`                | the continued fraction                                  |
| `uppergammareg(1e5, 1e6)`            | refused: past the significand limit | a limit of cost: only the series is left                |
| `uppergammareg(1e5, 1.1e5)`          | `≈ 2.6554005e-206`                  | the argument a tenth past the order                     |
| `uppergammareg(1e5, 1.5e5)`          | refused: past the significand limit | a limit of cost: the argument half again past the order |
| `lowergammareg(1e6, 1e6)`            | `≈ 0.50013298`                      |                                                         |
| `lowergammareg(1e6, 1e6)`            | refused: past the significand limit | at a thousand display digits: a limit of cost           |
| `lowergammareg(1e7, 1e7)`            | refused: past the significand limit | a limit of cost                                         |

## Error functions

`erf(x)` and `erfc(x)` are the error function and its complement, built
on the incomplete gamma functions of order one half; both take a plain
number. `erf(1)` is `≈ 0.84270079`. `erfc(10)` is `≈ 2.0884876e-45` at
the first pass. `1 - erf(10)` reaches the same digits only after the
retry loop has raised the precision enough to certify them. So a small
tail is written with `erfc` rather than by subtracting `erf` from `1`:
the probability that a normal value lies beyond `1.96` is
`erfc(1.96 / sqrt(2)) / 2`, `≈ 0.024997895`. The exact cases are
`erf(0)`, which is `= 0`, and `erfc(0)`, which is `= 1`; every other
value is inexact. `erfc` of an argument past about `1.5e9`, whose value
passes below `10^-(10^18)`, is refused as too small to compute, as the
exponential of a large negative argument is.

| You type                   | Exucal shows                  | Note                                    |
| -------------------------- | ----------------------------- | --------------------------------------- |
| `erf(1)`                   | `≈ 0.84270079`                |                                         |
| `erfc(10)`                 | `≈ 2.0884876e-45`             | at the first pass                       |
| `1 - erf(10)`              | `≈ 2.0884876e-45`             | the same digits, after more passes      |
| `erfc(1.96 / sqrt(2)) / 2` | `≈ 0.024997895`               | the normal tail beyond `1.96`           |
| `erf(0)`                   | `= 0`                         | an exact case                           |
| `erfc(0)`                  | `= 1`                         | an exact case                           |
| `erf(-1)`                  | `≈ -0.84270079`               | an odd function: `erf(-1)` is `-erf(1)` |
| `erfc(2e9)`                | refused: too small to compute | the exponent bound                      |

## Incomplete beta

`incbeta(a, b, x)` is the incomplete beta function, the part of
`beta(a, b)` below `x`, all of it at `x = 1`, and `incbetareg(a, b, x)`
is its regularized form, that part divided by `beta(a, b)` so that it
runs from `0` to `1`. Both take positive `a` and `b` and an `x` within
`[0, 1]`, all plain numbers. The parameters come first, in the order the
incomplete gamma functions take theirs. For whole numbers `a` and `b`
the regularized function is a polynomial in `x` of degree `a + b - 1`,
and the calculator forms the polynomial exactly when all three of these
hold:

- `x` is a fraction;
- the degree is at most ten thousand, a cap on the work;
- the polynomial's terms fit the significand limit.

So `incbetareg(2, 3, 0.5)` is `= 0.6875`. The other exact cases are the
ends: at `x = 0` both are `= 0`, and at `x = 1` `incbetareg` is `= 1`
and `incbeta` is `beta(a, b)`, exact where that is. Every other value is
inexact. `incbetareg(v / 2, 1/2, v / (v + t^2)) / 2` is the one-sided
tail of Student's t with `v` degrees of freedom beyond `t`, so
`incbetareg(3/2, 1/2, 3/(3 + 2^2)) / 2` is `≈ 0.069662984`, the tail
with three degrees of freedom beyond `2`.

An inexact value is computed by a series in `x`, or by the same series
for the swapped parameters in `1 - x`, which gives the part above `x`.
The calculator chooses by `a`, `b`, `x` and the precision. In the second
case the value wanted is `beta(a, b)` less the part above `x`. For
`incbetareg` it is `1` less it. The median is the point where the
regularized value is one half. A call with large parameters and `x` near
the median can take more work than the limit on the series allows, in
`x` and in `1 - x` alike, and is then refused, a refusal of cost
([Rules every built-in follows](#rules-every-built-in-follows)). A
higher precision moves the refusal to smaller parameters.
`incbetareg(1e7, 1e7, 0.5)` is refused at the default digits, while
`incbetareg(1e7, 1e7, 0.49)` is `≈ 1.3300101e-1740`, and
`incbetareg(1e6, 1e6, 0.5)` is `≈ 0.5` at the default digits and refused
at a thousand display digits.

| You type                                | Exucal shows                                 | Note                                                           |
| --------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `incbetareg(2, 3, 0.5)`                 | `= 0.6875`                                   | an exact case: a polynomial at a fraction                      |
| `incbetareg(3/2, 1/2, 3/(3 + 2^2)) / 2` | `≈ 0.069662984`                              | Student's t, three degrees of freedom, beyond `2`              |
| `incbetareg(2, 3, 0)`                   | `= 0`                                        | an end                                                         |
| `incbetareg(2, 3, 1)`                   | `= 1`                                        | an end                                                         |
| `incbeta(2, 3, 1)`                      | `≈ 0.083333333`                              | `beta(2, 3)`: exact, with more digits than shown               |
| `incbetareg(5001, 5000, 1/2)`           | `≈ 0.49601068`                               | exact, with more digits than shown: the degree is ten thousand |
| `incbetareg(5002, 5000, 1/2)`           | `≈ 0.49202215`                               | inexact: the degree is past ten thousand                       |
| `incbetareg(0, 1, 0.5)`                 | an error: a parameter is not positive        |                                                                |
| `incbetareg(1, 1, 2)`                   | an error: the argument lies outside `[0, 1]` |                                                                |
| `incbetareg(1e6, 1e6, 0.5)`             | `≈ 0.5`                                      | the default digits                                             |
| `incbetareg(1e6, 1e6, 0.5)`             | refused: past the significand limit          | at a thousand display digits: a limit of cost                  |
| `incbetareg(1e7, 1e7, 0.5)`             | refused: past the significand limit          | the default digits: a limit of cost                            |
| `incbetareg(1e7, 1e7, 0.49)`            | `≈ 1.3300101e-1740`                          | off the median                                                 |

## Functions defined in the file

The functions the definitions file defines are not built-ins but defined
functions, each written in the definition language
([Functions](definitions.md#functions)). `tempC` and `tempF`, the
temperature readings, and `decibel`, `bel` and `neper`, the logarithmic
levels, are such functions. A defined function may have an inverse, so
that a quantity converts into it, as `tempF` and `decibel` do.
[Units](units.md) lists the file's functions with each one's scale and
ratio
([Temperature: differences and readings](units.md#temperature-differences-and-readings),
[Logarithmic levels](units.md#logarithmic-levels)), and
[Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)
says why a reading and a level are functions and not units.

| You type      | Into      | Exucal shows    | Note                |
| ------------- | --------- | --------------- | ------------------- |
| `tempC(20)`   |           | `= 293.15 K`    | a reading           |
| `tempF(212)`  | `tempC`   | `= tempC(100)`  | through the inverse |
| `decibel(20)` |           | `= 100`         | a level's ratio     |
| `100`         | `decibel` | `= decibel(20)` |                     |
| `neper(1)`    |           | `≈ 2.7182818`   |                     |

## Not provided, and what to write instead

These functions are not provided:

- `zeta`;
- `lambertw`;
- the complete elliptic integrals, `ellipk` and `ellipe`;
- the Legendre and Chebyshev polynomials as functions, `legendre` and
  `chebyshev`;
- the Bessel functions;
- the polygamma functions beyond `digamma`;
- `gamma` of a complex argument, since every value is real
  ([Real values only](numbers.md#real-values-only));
- the statistical distributions as functions of their own.

No definition can be typed into the app: the predefined definitions file
alone is loaded
([What the app loads](definitions.md#what-the-app-loads)). An expression
over the functions provided stands in for some of these.

- A Chebyshev polynomial of the first kind is a cosine of a multiple of
  an arccosine: `cos(3 acos(0.5))` is the third Chebyshev polynomial at
  `0.5`, and `cosh(2 acosh(2))` is the second at `2`, an argument above
  `1`.
- A Legendre polynomial of a fixed degree is typed out:
  `(3 * 0.5^2 - 1) / 2` is the second Legendre polynomial at `0.5`.
- The common distributions are the regularized incomplete functions and
  the complementary error function, each giving a cumulative probability.
  - A normal value lies below `x` with probability
    `erfc(-x / sqrt(2)) / 2`.
  - A chi-squared value with `k` degrees of freedom lies below `x` with
    probability `lowergammareg(k / 2, x / 2)`.
  - At most `k` events occur at a Poisson mean `m` with probability
    `uppergammareg(k + 1, m)`.
  - The probability of at most `k` successes in `n` trials, each a
    success with probability `p`, is `incbetareg(n - k, k + 1, 1 - p)`.
  - Student's t lies beyond `t` with the probability
    [Incomplete beta](#incomplete-beta) gives.

Nothing stands in for the others.

| You type                    | Exucal shows   | Note                                             |
| --------------------------- | -------------- | ------------------------------------------------ |
| `cos(3 acos(0.5))`          | `≈ -1`         | the third Chebyshev polynomial at `0.5`          |
| `cosh(2 acosh(2))`          | `≈ 7`          | the second Chebyshev polynomial at `2`           |
| `(3 * 0.5^2 - 1) / 2`       | `= -0.125`     | the second Legendre polynomial at `0.5`          |
| `erfc(-1.96 / sqrt(2)) / 2` | `≈ 0.9750021`  | a normal value below `1.96`                      |
| `lowergammareg(3/2, 1)`     | `≈ 0.4275933`  | chi-squared, three degrees of freedom, below `2` |
| `uppergammareg(3, 3)`       | `≈ 0.42319008` | at most two events at a Poisson mean of `3`      |
| `incbetareg(7, 4, 1/2)`     | `= 0.171875`   | at most three heads in ten tosses: an exact case |
