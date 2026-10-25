# Built-in functions

Exucal's **built-in functions** are the functions it computes in code.
Every other function the calculator knows is a **defined function**,
written in the definitions file
([The definition language](definitions.md)), and the two are called the
same way ([Calls and arity](expressions.md#calls-and-arity)). Exucal
provides, under the same guarantee as the arithmetic
([Numbers](numbers.md)), the functions a calculator is used for: all the
elementary functions, and the special functions that matter most in
combinatorics, probability and physics.

The built-ins follow these rules:

- **Every built-in takes plain numbers unless its entry says otherwise, and a call that would need more working precision than the significand limit holds is refused as past it**
  ([Rules every built-in follows](#rules-every-built-in-follows)).
- **The elementary functions are exact at a few arguments and inexact everywhere else.**
  - `pi()` has no exact case ([Constants](#constants)).
  - `exp` is exact at zero, and a logarithm at `1` and where its argument
    or its base is a whole-number power of the other
    ([Exponential and logarithms](#exponential-and-logarithms)).
  - `sqrt`, `cbrt` and `pow` are exact at perfect powers and whole-number
    exponents ([Roots and powers](#roots-and-powers)).
  - `sin`, `cos` and `tan` are exact at zero ([Trigonometric](#trigonometric)),
    and `asin`, `acos`, `atan` and `atan2` at the zero results
    ([Inverse trigonometric](#inverse-trigonometric)).
  - The hyperbolic functions are exact at zero, `acosh` at one instead
    ([Hyperbolic](#hyperbolic)).
- **`approx` is the one built-in whose purpose is to make a value inexact**
  ([`approx`](#approx)).
- **`abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `div` and `mod` are exact on exact arguments, and all but `abs` and `mod` are exact on an inexact argument whose error radius lies on one side of an edge**
  ([Magnitude, sign and rounding](#magnitude-sign-and-rounding),
  [Division](#division)).
- **`gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial` take only whole numbers known exactly, and every result is exact**
  ([Integer functions](#integer-functions)).
- **The Gamma family is exact at whole numbers, where `gamma` and `beta` are factorials that fit the significand limit, at `lgamma(1)` and `lgamma(2)`, and at `beta`'s exact zeros, and inexact everywhere else**, and is computed from a table of Bernoulli ratios built on first use
  ([Gamma family](#gamma-family)). The incomplete gamma and beta
  functions and the error functions are built on the family
  ([Incomplete gamma](#incomplete-gamma),
  [Error functions](#error-functions), [Incomplete beta](#incomplete-beta)).
- **The functions the definitions file defines are not built-ins**
  ([Functions defined in the file](#functions-defined-in-the-file)).
- **`zeta`, `lambertw`, the Bessel functions and some others are not provided**,
  and for some of them an expression over the functions provided stands in
  ([Not provided, and what to write instead](#not-provided-and-what-to-write-instead)).

## Rules every built-in follows

Every built-in takes plain numbers
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)),
apart from the trigonometric functions, which take an angle, and six
functions that take quantities of any dimension:

- `approx`, `abs` and `sign` take one quantity;
- `div`, `mod` and `atan2` take two quantities that conform
  ([Conformance](quantities.md#conformance)).

Each entry gives its function's signature and names its exact cases
([Operations that stay exact; exact cases of functions](numbers.md#operations-that-stay-exact-exact-cases-of-functions));
every other result is inexact.

A value the size limits cannot hold is a refusal
([Values too big to hold](numbers.md#values-too-big-to-hold)). The
significand limit also caps the working precision, so a call that would
need more of it than the limit holds is refused as past the limit even
where its result would fit: the incomplete gamma functions at large
orders and arguments ([Incomplete gamma](#incomplete-gamma)), and the
incomplete beta functions at large parameters with the argument near the
point where the value is one half ([Incomplete beta](#incomplete-beta)).

## Constants

`pi()` is the circle constant and has no exact case. Euler's number is
written `exp(1)`
([Names that are absent or mean something else](units.md#names-that-are-absent-or-mean-something-else)).

| You type | Exucal shows  |
| -------- | ------------- |
| `pi()`   | `≈ 3.1415927` |
| `exp(1)` | `≈ 2.7182818` |

## Exponential and logarithms

`exp(x)` is the exponential of a plain number. `ln(x)`, `log10(x)` and
`log2(x)` are the natural, decimal and binary logarithms of a positive
plain number, and `log(b, x)` is the logarithm of `x` to the base `b`, a
positive plain number other than one. `exp` is exact at zero. A
logarithm is exact at `1`; `log10` and `log2` are exact where the
argument is a whole-number power of the base, and `log(b, x)` where `x`
is a whole-number power of `b` or `b` is a whole-number power of `x`.
Every other value is inexact. No argument is too large or too small for
a logarithm, while `exp` reaches the exponent bound
([Values too big to hold](numbers.md#values-too-big-to-hold)).

| You type             | Exucal shows                        | Note                                                                          |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `log10(1000)`        | `= 3`                               | a power of the base                                                           |
| `log2(1/8)`          | `= -3`                              | a negative exponent                                                           |
| `log(8, 2)`          | `≈ 0.33333333`                      | exact, `1/3`, with more digits than shown                                     |
| `log(4, 8)`          | `≈ 1.5`                             | inexact: `3/2` is neither a whole number nor the reciprocal of a whole number |
| `log(1, 8)`          | an error: no logarithm has base one |                                                                               |
| `ln(1e-300)`         | `≈ -690.77553`                      | no argument is too small                                                      |
| `log10(1e999999999)` | `≈ 1e+9`                            | exact, `999999999`, with more digits than shown                               |
| `exp(1e30)`          | refused: too large to compute       | the exponent bound                                                            |
| `exp(-1e30)`         | refused: too small to compute       | the exponent bound                                                            |

## Roots and powers

`sqrt(x)` and `cbrt(x)` are the square and cube roots of a plain number,
and `pow(x, y)` raises a plain number to a plain number. A root is exact
where the argument is a perfect square or cube, and `pow` for a
whole-number exponent and for a fraction whose root is exact; every
other value is inexact. An even root of a negative value is an error; a
cube root of a negative value is a value.

`pow` differs from `^` ([Operators](expressions.md#operators)) in what
it takes: a plain number, where `^` takes a quantity, and a computed
exponent, where a `^` exponent is typed. Outside the exact cases `pow`
goes through the logarithm, so `pow(2, 1e-30000)` is `≈ 1` where
`2^1e-30000` is refused as past the significand limit.

| You type          | Exucal shows                               | Note                                |
| ----------------- | ------------------------------------------ | ----------------------------------- |
| `sqrt(9/4)`       | `= 1.5`                                    | an exact case                       |
| `cbrt(-8)`        | `= -2`                                     | a cube root of a negative value     |
| `pow(4, 1/2)`     | `= 2`                                      | the root is exact                   |
| `pow(2, sqrt(2))` | `≈ 2.6651441`                              | a computed exponent                 |
| `sqrt(-1)`        | an error: an even root of a negative value |                                     |
| `pow(2 m, 2)`     | an error: the base must be a plain number  | the message says to write `(2 m)^2` |

## Trigonometric

`sin(x)`, `cos(x)` and `tan(x)` take an angle
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)).
The exact cases are at zero alone: `sin(0 radian)` and `tan(0 radian)`
are `= 0`, and `cos(0 radian)` is `= 1`. Every other value is inexact.
`tan` has a pole at every odd multiple of a right angle. A huge angle is
refused as past the significand limit.

| You type                  | Exucal shows                                      | Note                                           |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `sin(30 deg)`             | `≈ 0.5`                                           |                                                |
| `tan(90 deg)`             | an error: the argument cannot be told from a pole | at the ceiling                                 |
| `sin(1e999999999 radian)` | refused: past the significand limit               | reducing the angle needs π to a billion digits |

## Inverse trigonometric

`asin(x)`, `acos(x)`, `atan(x)` and `atan2(y, x)` return an angle
([Primitives, dimensions and kinds](quantities.md#primitives-dimensions-and-kinds)).
`asin` and `acos` take a plain number within `[-1, 1]`, and `atan` takes
any plain number. `atan2` takes a rise `y` and a run `x`, two quantities
that conform, and gives the angle of the point they mark, in its
quadrant. The exact cases are the zero results: `asin(0)`, `atan(0)`,
`acos(1)` and `atan2(0, 1)` are `= 0 radian`. Every other value is
inexact, a right angle among them.

| You type          | Into  | Exucal shows      | Note                      |
| ----------------- | ----- | ----------------- | ------------------------- |
| `atan2(3 m, 4 m)` | `deg` | `≈ 36.869898 deg` | an angle from two lengths |
| `asin(1)`         | `deg` | `≈ 90 deg`        | inexact: a right angle    |

## Hyperbolic

`sinh(x)`, `cosh(x)` and `tanh(x)` and their inverses `asinh(x)`,
`acosh(x)` and `atanh(x)` take plain numbers and give plain numbers. The
exact cases are at zero, and `acosh`'s at one; every other value is
inexact. `acosh` takes an argument at or above `1`, and `atanh` one
strictly between `-1` and `1`. `sinh` and `cosh` reach the exponent
bound as `exp` does
([Values too big to hold](numbers.md#values-too-big-to-hold)).

| You type     | Exucal shows                            | Note               |
| ------------ | --------------------------------------- | ------------------ |
| `acosh(1)`   | `= 0`                                   | an exact case      |
| `acosh(0.5)` | an error: the argument is less than `1` |                    |
| `sinh(1e30)` | refused: too large to compute           | the exponent bound |

## `approx`

`approx(x)` takes any quantity, angles included, and returns it with its
dimension and kind kept and its value made inexact
([approx](numbers.md#approx)).

| You type         | Into  | Exucal shows | Note     |
| ---------------- | ----- | ------------ | -------- |
| `approx(30 deg)` | `deg` | `≈ 30 deg`   | an angle |

## Magnitude, sign and rounding

`abs(x)` is the absolute value of a quantity of any dimension and keeps
its dimension and kind. `sign(x)` takes any quantity and gives `-1`, `0`
or `1`, a plain number. `floor(x)`, `ceil(x)`, `trunc(x)` and `round(x)`
take a plain number
([A quantity carries no unit](quantities.md#a-quantity-carries-no-unit)
says how to floor a length). `round(x)` rounds to a whole number, and
`round(x, places)` rounds to that many decimal places, a negative count
rounding to the left of the point. Both round in the rounding mode in
force
([Rounding modes and where they act](numbers.md#rounding-modes-and-where-they-act)).

All six are exact on an exact argument. On an inexact argument `abs`
keeps the error radius, so its result is inexact. The result of the
other five depends only on which side of an edge the argument lies on,
so it is exact once the whole error radius lies on one side of the edge;
[Values at an edge](numbers.md#values-at-an-edge) says which of them
still has an answer for a value that cannot be told from zero.

| You type                   | Exucal shows                                     | Note                                               |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `round(1234, -2)`          | `= 1200`                                         | to the left of the point                           |
| `round(sqrt(2), 3)`        | `= 1.414`                                        | exact: the side of the edge is known               |
| `abs(sqrt(2) - 2)`         | `≈ 0.58578644`                                   | inexact: the radius kept                           |
| `floor(sqrt(2)^2)`         | an error: the argument cannot be told from `2`   | the argument reaches across `2` at every precision |
| `sign(approx(0))`          | `= 0`                                            | `approx(0)` is exactly `0`                         |
| `sign(sqrt(2) - sqrt(2))`  | an error: the argument cannot be told from zero  | at the ceiling                                     |
| `trunc(sqrt(2) - sqrt(2))` | `= 0`                                            | the same on both sides of zero                     |
| `round(2.5)`               | `= 2`                                            | a tie, to even in the default mode                 |
| `round(approx(2.5))`       | an error: the argument cannot be told from `2.5` | a tie it cannot settle                             |

## Division

`div(a, b)` is the floor of `a / b`, and `mod(a, b)` is
`a - b div(a, b)`, so the remainder is zero or has the divisor's sign.
`div` gives a count, a plain number, and `mod` keeps the dimension. Both
are exact on exact arguments. On an inexact argument `div` answers as
the rounding functions do
([Magnitude, sign and rounding](#magnitude-sign-and-rounding)), and
`mod` is inexact, or an error where `div` is. A remainder that would
need a significand past the significand limit is refused.

| You type                   | Exucal shows                                                                           | Note                                     |
| -------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `div(-7, 2)`               | `= -4`                                                                                 | floored                                  |
| `mod(-7, 2)`               | `= 1`                                                                                  | the divisor's sign                       |
| `mod(approx(4.5), 2)`      | `≈ 0.5`                                                                                | inexact                                  |
| `div(approx(4), 2)`        | an error: the argument cannot be told from `4`                                         | the quotient straddles a whole number    |
| `mod(-1, 1e20000)`         | refused: past the significand limit; the message suggests `approx(-1)` or decimal mode | the remainder has twenty thousand digits |
| `mod(approx(-1), 1e20000)` | `≈ 1e+20000`                                                                           | the `1` absorbed into the error radius   |

## Integer functions

`gcd(a, b)`, `lcm(a, b)`, `factorial(n)`, `binomial(n, k)` and
`doublefactorial(n)` take whole numbers known exactly, `factorial` and
`binomial` from zero up and `doublefactorial` from `-1` up, and every
result is exact. `gcd` and `lcm` are never negative. `factorial`,
`binomial` and `doublefactorial` are refused past the significand limit;
`gamma(20001)` gives the value `factorial(20000)` cannot hold
([Gamma family](#gamma-family)).

| You type               | Exucal shows                                 | Note                                 |
| ---------------------- | -------------------------------------------- | ------------------------------------ |
| `gcd(-12, 18)`         | `= 6`                                        | never negative                       |
| `gcd(5, 0)`            | `= 5`                                        |                                      |
| `binomial(5, 2)`       | `= 10`                                       |                                      |
| `doublefactorial(7)`   | `= 105`                                      |                                      |
| `factorial(approx(5))` | an error: the argument is not known exactly  | `approx(5)` is inexact in exact mode |
| `factorial(5.5)`       | an error: the argument is not a whole number |                                      |
| `factorial(5000)`      | `≈ 4.2285779e+16325`                         | exact, a value of 16,326 digits      |
| `factorial(20000)`     | refused: past the significand limit          |                                      |

## Gamma family

The family is four functions of plain numbers.

- `gamma(x)` is the Gamma function.
- `lgamma(x)` is the logarithm of its absolute value.
- `digamma(x)` is its logarithmic derivative.
- `beta(a, b)` is the Beta function, `gamma(a) gamma(b) / gamma(a + b)`.

The family's exact cases are at whole numbers, `gamma` and `beta` where
the factorials they reduce to fit the significand limit and `lgamma` at
`1` and `2`, and `beta` is exactly `0` where the sum of its arguments is
a pole and neither argument is. `digamma` has no exact case. Every other
value is inexact.

### The Gamma function and its logarithm

`gamma(x + 1)` is `factorial(x)` for a whole number `x` and extends the
factorial to every other value. For a whole number whose factorial is
past the significand limit it gives the value inexactly. The poles are
zero and the negative whole numbers, where `gamma`, `lgamma` and
`digamma` are errors. `lgamma` gives the logarithm of a Gamma value the
exponent bound refuses.

### The Beta function

A whole number at or below zero in either argument is a pole, an error.
Outside its exact cases, the magnitude of `beta` is the exponential of
`lgamma(a) + lgamma(b) - lgamma(a + b)`, the three logarithms taken to
the precision of the pass plus the digits of the largest argument's
whole part, so that their cancellation leaves the precision of the pass.
So `beta` has a value where `gamma` of an argument is refused as too
large, as long as its own value fits the exponent bound and the digits
the logarithms need fit the significand limit. For whole numbers `n` and
`k` with `k` from `0` to `n`, `1 / ((n + 1) beta(n - k + 1, k + 1))` is
`binomial(n, k)`, and the same expression gives a binomial of values
that are inexact or not whole numbers.

### What the family costs

`lgamma` and `digamma` are computed from a table of the ratios of
consecutive Bernoulli numbers, and the magnitude of `gamma` is the
exponential of `lgamma`. The table grows with the precision. The
calculator builds it on first use, for the precision in force, and keeps
it until a call needs a larger one. Outside their exact cases, `gamma`,
`lgamma` and `digamma` pay for the table the first time; huge and tiny
arguments of `lgamma` and `digamma` take a shorter route and pay
nothing. Every other call pays only where it needs `lgamma`, `gamma` or
`beta` on the way to its own value:

- `beta` pays through `lgamma` outside its exact cases, and a call that
  needs `beta` pays through `beta`.
- `lowergammareg` and `uppergammareg` pay through `lgamma` outside their
  exact cases, except where their first argument is `1`
  ([Incomplete gamma](#incomplete-gamma)); `erf` and `erfc`, built on
  them, pay too, apart from huge arguments
  ([Error functions](#error-functions)).
- `incbetareg` pays through `lgamma` outside its exact cases. `incbeta`
  pays through `beta` at an argument of `1`, where it is `beta`, and
  where its value is reached by subtraction from `beta`
  ([Incomplete beta](#incomplete-beta)).
- `lowergamma` and `uppergamma` pay through `gamma`: `uppergamma` at an
  argument of `0`, where it is `gamma`, and either of them where its
  value is reached by subtraction from `gamma`
  ([Incomplete gamma](#incomplete-gamma)). `lowergamma(2.5, 1)` is
  computed directly and pays nothing, while `uppergamma(2.5, 1)` is
  `gamma(2.5)` less it and pays.

A result certified at its first pass pays little at the default digits,
while a result that runs to the ceiling pays noticeably for it the first
time.

| You type                 | Exucal shows                        | Note                                                                                                                              |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `gamma(-1.5)`            | `≈ 2.3632718`                       |                                                                                                                                   |
| `gamma(20001)`           | `≈ 1.8192063e+77337`                | the value `factorial(20000)` cannot hold                                                                                          |
| `gamma(0)`               | an error: a pole                    |                                                                                                                                   |
| `gamma(1e19)`            | refused: too large to compute       | the exponent bound                                                                                                                |
| `lgamma(1e19)`           | `≈ 4.2749117e+20`                   |                                                                                                                                   |
| `digamma(1)`             | `≈ -0.57721566`                     | minus the Euler–Mascheroni constant                                                                                               |
| `beta(2, 3)`             | `≈ 0.083333333`                     | exact, `1/12`, with more digits than shown                                                                                        |
| `beta(-0.5, -0.5)`       | `= 0`                               | a pole in the denominator alone                                                                                                   |
| `beta(1e17, 1.5)`        | `≈ 2.8024956e-26`                   | where `gamma(1e17)` is refused                                                                                                    |
| `beta(1e19, 1e19)`       | refused: too small to compute       | the exponent bound                                                                                                                |
| `beta(1e20000, 2)`       | refused: past the significand limit | the digits the logarithms need                                                                                                    |
| `1 / (5.5 beta(4.5, 2))` | `≈ 4.5`                             | the binomial of `4.5` and `1`                                                                                                     |
| `beta(0.5, 0.5) - pi()`  | `≈ 0 (within 4e-4049 of zero)`      | runs to the ceiling ([Identities and cancellation](numbers.md#identities-and-cancellation)) and pays for the table the first time |

## Incomplete gamma

`lowergamma(s, x)` and `uppergamma(s, x)` are the incomplete gamma
functions, which split `gamma(s)` at `x` into the part below `x` and the
part above it. `lowergammareg(s, x)` and `uppergammareg(s, x)` are their
regularized forms, the same divided by `gamma(s)` so that they run from
`0` to `1`. All take plain numbers, the order `s` positive and the
argument `x` at or above zero. The exact cases are at `x = 0`: the lower
forms are `= 0`, `uppergammareg` is `= 1`, and `uppergamma` is
`gamma(s)`, exact where `gamma(s)` is. An order of `1` is not an exact
case: `lowergammareg(1, x)` is `1 - exp(-x)` and `uppergammareg(1, x)`
is `exp(-x)`, inexact for an `x` above zero. Every other value is
inexact. An order or argument with more digits before the point than the
significand limit holds is refused as past it.

The working precision a value needs grows with the order and the
argument together, and with the precision asked for; a call that needs
more than the significand limit holds is refused as past it
([Rules every built-in follows](#rules-every-built-in-follows)). A very
large order can be past the limit, and a smaller one with the argument
far past it or at a high precision.

| You type                    | Exucal shows                        | Note                                             |
| --------------------------- | ----------------------------------- | ------------------------------------------------ |
| `lowergammareg(0.5, 0.5)`   | `≈ 0.68268949`                      | a normal value within one standard deviation     |
| `uppergamma(2, 0)`          | `= 1`                               | `gamma(2)`, exact                                |
| `uppergamma(2.5, 0)`        | `≈ 1.3293404`                       | `gamma(2.5)`, inexact                            |
| `lowergammareg(1e20000, 1)` | refused: past the significand limit | the digits before the point                      |
| `uppergammareg(1e4, 1e6)`   | `≈ 1.170002e-409956`                | a large argument at a moderate order             |
| `uppergammareg(1e5, 1e6)`   | refused: past the significand limit | a very large order with the argument far past it |
| `uppergammareg(1e5, 1.1e5)` | `≈ 2.6554005e-206`                  | the argument a tenth past the order              |
| `uppergammareg(1e5, 1.5e5)` | refused: past the significand limit | the argument half again past the order           |
| `lowergammareg(1e6, 1e6)`   | `≈ 0.50013298`                      |                                                  |
| `lowergammareg(1e6, 1e6)`   | refused: past the significand limit | at a thousand display digits                     |
| `lowergammareg(1e7, 1e7)`   | refused: past the significand limit | a very large order                               |

## Error functions

`erf(x)` and `erfc(x)` are the error function and its complement, built
on the incomplete gamma functions of order one half; both take a plain
number. A small tail, the probability beyond a point, is written with
`erfc` rather than as `1 - erf`, which reaches the same digits only
after the retry loop has raised the precision enough to certify them.
The exact cases are at zero; every other value is inexact. `erfc` of an
argument past about `1.5e9` is refused as too small to compute.

| You type      | Exucal shows                  | Note                               |
| ------------- | ----------------------------- | ---------------------------------- |
| `erfc(10)`    | `≈ 2.0884876e-45`             | at the first pass                  |
| `1 - erf(10)` | `≈ 2.0884876e-45`             | the same digits, after more passes |
| `erfc(2e9)`   | refused: too small to compute | the exponent bound                 |

## Incomplete beta

`incbeta(a, b, x)` is the incomplete beta function, the part of
`beta(a, b)` below `x`, and `incbetareg(a, b, x)` is its regularized
form, that part divided by `beta(a, b)` so that it runs from `0` to `1`.
Both take positive `a` and `b` and an `x` within `[0, 1]`, all plain
numbers. For whole numbers `a` and `b` the regularized function is a
polynomial in `x` of degree `a + b - 1`, and the calculator forms the
polynomial exactly when:

- `x` is exact;
- the degree is at most ten thousand, a cap on the work;
- the polynomial's terms fit the significand limit.

The other exact cases are the ends: at `x = 0` both are `= 0`, and at
`x = 1` `incbetareg` is `= 1` and `incbeta` is `beta(a, b)`, exact where
that is. Every other value is inexact. A parameter with more digits
before the point than the significand limit holds is refused as past it.

A call with large parameters and `x` near the median, the point where
the regularized value is one half, can need more working precision than
the significand limit holds and is then refused as past it
([Rules every built-in follows](#rules-every-built-in-follows)). A
higher precision moves the refusal to smaller parameters.

| You type                                | Exucal shows                        | Note                                                           |
| --------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `incbetareg(2, 3, 0.5)`                 | `= 0.6875`                          | an exact case: a polynomial at a fraction                      |
| `incbetareg(3/2, 1/2, 3/(3 + 2^2)) / 2` | `≈ 0.069662984`                     | Student's t, three degrees of freedom, beyond `2`              |
| `incbetareg(5001, 5000, 1/2)`           | `≈ 0.49601068`                      | exact, with more digits than shown: the degree is ten thousand |
| `incbetareg(5002, 5000, 1/2)`           | `≈ 0.49202215`                      | inexact: the degree is past ten thousand                       |
| `incbetareg(1e20000, 2, 0.5)`           | refused: past the significand limit | the digits before the point                                    |
| `incbetareg(1e6, 1e6, 0.5)`             | `≈ 0.5`                             | the default digits                                             |
| `incbetareg(1e6, 1e6, 0.5)`             | refused: past the significand limit | at a thousand display digits                                   |
| `incbetareg(1e7, 1e7, 0.5)`             | refused: past the significand limit | the default digits                                             |
| `incbetareg(1e7, 1e7, 0.49)`            | `≈ 1.3300101e-1740`                 | off the median                                                 |

## Functions defined in the file

[Units](units.md) describes the functions the definitions file defines,
such as `tempC` and `decibel`, and
[Temperature and logarithmic levels as functions](quantities.md#temperature-and-logarithmic-levels-as-functions)
says why they are functions and not units.

## Not provided, and what to write instead

These functions are not provided:

- `zeta`;
- `lambertw`;
- the complete elliptic integrals, `ellipk` and `ellipe`;
- the Legendre and Chebyshev polynomials as functions, `legendre` and
  `chebyshev`;
- the Bessel functions;
- the polygamma functions beyond `digamma`;
- `gamma` of a complex argument
  ([Real values only](numbers.md#real-values-only));
- the statistical distributions as functions of their own.

For some of these an expression over the functions provided stands in.

- A Chebyshev polynomial of the first kind is a cosine of a multiple of
  an arccosine, `cos(n acos(x))`, or `cosh(n acosh(x))` for an `x` above
  `1`.
- A Legendre polynomial of a fixed degree is typed out as its formula,
  `(3 x^2 - 1) / 2` for the second.
- The common distributions are written with the regularized incomplete
  functions and the complementary error function.
  - A normal value lies below `x` with probability
    `erfc(-x / sqrt(2)) / 2`.
  - A chi-squared value with `k` degrees of freedom lies below `x` with
    probability `lowergammareg(k / 2, x / 2)`.
  - At most `k` events occur at a Poisson mean `m` with probability
    `uppergammareg(k + 1, m)`.
  - The probability of at most `k` successes in `n` trials, each a
    success with probability `p`, is `incbetareg(n - k, k + 1, 1 - p)`.
  - Student's t with `v` degrees of freedom lies beyond `t` with
    probability `incbetareg(v / 2, 1/2, v / (v + t^2)) / 2`.

Nothing stands in for the others.

| You type                    | Exucal shows   | Note                                             |
| --------------------------- | -------------- | ------------------------------------------------ |
| `cos(3 acos(0.5))`          | `≈ -1`         | the third Chebyshev polynomial at `0.5`          |
| `erfc(-1.96 / sqrt(2)) / 2` | `≈ 0.9750021`  | a normal value below `1.96`                      |
| `lowergammareg(3/2, 1)`     | `≈ 0.4275933`  | chi-squared, three degrees of freedom, below `2` |
| `uppergammareg(3, 3)`       | `≈ 0.42319008` | at most two events at a Poisson mean of `3`      |
| `incbetareg(7, 4, 1/2)`     | `= 0.171875`   | at most three heads in ten tosses: an exact case |
