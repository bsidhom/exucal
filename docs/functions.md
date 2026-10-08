# Functions in expressions

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
- `abs`, `sign`, `floor`, `ceil`, `trunc` and `round`. `abs` keeps its
  argument's units and `sign` takes any quantity, giving `-1`, `0` or
  `1`. The other four take a plain number, since a quantity is stored in
  the base units and `floor(3.7 ft)` would floor the metres; write
  `floor(3.7 ft / ft) ft`. `round(x)` rounds to a whole number and
  `round(x, places)` to that many decimal places, in the Rounding
  setting's mode, a negative count rounding to the left of the point:
  `round(3.14159, 2)` is `3.14` and `round(1234, -2)` is `1200`. A value
  that cannot be told from a boundary (`floor(sqrt(2)^2)`, a hair from
  `2` at any precision) is reported as such rather than guessed.
- `div(a, b)` and `mod(a, b)`, floored division and its remainder, on
  two quantities of one dimension: `div(-7, 2)` is `-4` and `mod(-7, 2)`
  is `1`, the remainder zero or of the divisor's sign, so that
  `a = b × div(a, b) + mod(a, b)` exactly; `mod(-30 deg, 360 deg)` is
  `330 deg`, and `div(7 ft, 2 ft)` is the count `3`.
- `gcd(a, b)` and `lcm(a, b)` of whole numbers, never negative; and
  `factorial(n)`, `binomial(n, k)` and `doublefactorial(n)` of whole
  numbers known exactly (`factorial(approx(5))` is refused, since a
  value known to a precision is not known to be `5`), refused past the significand
  limit before anything is computed: `factorial(5000)` is a value of
  16,326 digits and `factorial(20000)`, with 77,338, is not
  (`gamma(20001)` gives it to the digits asked).
- `digamma(x)`, the logarithmic derivative of the Gamma function, of a
  plain number: `digamma(1)` is `≈ -0.57721566`, minus Euler's constant.
  Its poles are zero and the negative whole numbers, where it is an
  error, and a value that cannot be told from one (`digamma(approx(-2))`)
  is reported as such.
- `gamma(x)` and `lgamma(x)`, the Gamma function and the logarithm of
  its magnitude, with the same poles: `gamma(5)` is the exact `24`,
  `gamma(0.5)^2` is `≈ 3.1415927`, and `gamma(-1.5)` is `≈ 2.3632718`.
  `gamma(x + 1)` is `factorial(x)` for any `x`, which is where a
  factorial of a value that is not a whole number known exactly, or one
  past the significand limit, is pointed: `gamma(20001)` is `≈ 1.8192063e+77337`,
  the value `factorial(20000)` cannot hold. `lgamma` is the way to a
  Gamma value whose exponent passes `10^18` (`lgamma(1e19)` is a value
  where `gamma(1e19)` is refused), and `lgamma(1)` and `lgamma(2)` are
  the exact `0`. The family's series take the ratios of consecutive
  Bernoulli numbers, computed once per page load for each precision asked
  for beyond the last and kept: at the default digits that is nothing to notice, and a result
  that needs the retry schedule's ceiling, as `tan(90 deg)` does, pays
  about half a second the first time and a tenth of a second a call
  after that for an argument typed as a decimal or a fraction, which the
  kernel shifts exactly, and a few seconds then half a second for one
  that is not exact, such as `gamma(pi())`.
- `beta(a, b)`, the Beta function `gamma(a) gamma(b) / gamma(a + b)`,
  of two plain numbers: `beta(0.5, 0.5)` is `≈ 3.1415927`, and
  `beta(2, 3)` is the exact `1/12`, as it is for any whole numbers
  whose value fits the significand limit. A whole number at or below zero in either
  argument is a pole, an error; a sum at one with neither argument
  there makes the value exactly `0` (`beta(-0.5, -0.5)`). Large
  arguments go through `lgamma`, so `beta(1e6, 1e6)` is
  `≈ 3.6164047e-602063` where no `gamma` of them would fit, and
  `1 / ((n + 1) beta(n - k + 1, k + 1))` is `binomial(n, k)` for any
  `n` and `k`, which is where a binomial of values that are not whole
  numbers known exactly is pointed.
- `lowergamma(s, x)` and `uppergamma(s, x)`, the incomplete Gamma
  functions `γ(s, x)` and `Γ(s, x)`, which split `gamma(s)` at `x`, and
  `lowergammareg(s, x)` and `uppergammareg(s, x)`, the same divided by
  `gamma(s)`, the `P` and `Q` of statistics: `lowergammareg(0.5, 0.5)`
  is `≈ 0.68268949`, the probability a normal value lies within one
  standard deviation, and `uppergammareg(1/2, 1.96^2 / 2) / 2` the tail
  `≈ 0.024997895`. The order `s` must be positive and `x` at or above
  zero; `x = 0` gives the exact `0`, `gamma(s)` and `1`, and `s = 1`
  gives `1 - exp(-x)` and `exp(-x)`. Every result is certified: the
  series and the continued fraction both carry their truncation bounds.
  A large order within a few percent of a large argument, past some
  millions, is not computed and says so.
- `erf(x)` and `erfc(x)`, the error function and its complement, on
  the incomplete Gamma functions of order one half: `erf(1)` is
  `≈ 0.84270079`, `(1 + erf(1.96 / sqrt(2))) / 2` is `≈ 0.9750021`, the
  normal distribution at `1.96`, and `erfc(10)` is `≈ 2.0884876e-45`,
  its digits kept where `1 - erf(10)` would be `0`. `erf(0)` is the
  exact `0` and `erfc(0)` the exact `1`; `erfc` of an argument past about
  `1.5e9`, whose value passes below `10^-(10^18)`, is refused as `exp`
  would refuse it.
- `incbeta(a, b, x)` and `incbetareg(a, b, x)`, the incomplete Beta
  function `B(x; a, b)` and the regularized `I_x(a, b)`, for positive
  `a` and `b` and `x` within `[0, 1]`, the parameters first as the
  incomplete Gamma functions take them: `incbetareg(2, 3, 0.5)` is the
  exact `0.6875`, as it is for any whole numbers at a fraction whose
  powers fit the significand limit, and `incbetareg(3/2, 1/2, 3/(3 + 2^2)) / 2` is
  `≈ 0.069662984`, the one-sided tail of Student's t with three degrees
  of freedom at `2`. Every result is certified: the series carries its
  truncation bound, and the symmetry `I_x(a, b) = 1 - I_(1-x)(b, a)`
  chooses the cheaper side. Large parameters within a few percent of the
  median, past some millions, are not computed and say so.

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
and one whose exponent would fall below `-10^18` as too small
(`exp(-1e30)`), where `exp(1e6)` is `≈ 3.0332154e+434294`; the next
section says why `approx` does not change that.
No prefix applies to a function: `kpi()` is a call of nothing.

## Very large results and `approx`

`approx` says how well a value is known, not how large it is, so it
cannot rescue a result that is too large: `exp(approx(1e999))` is refused
exactly as `exp(1e999)` is. The message says which of two limits a
result passes:

```
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
```

A value is held as a significand times a power of ten. The settings
limit the significand: the display digits and the precision limit say
how many of its digits must be certain, and the significand limit how
large its numerator and denominator may grow.
The exponent has a fixed bound of its own, `10^18` either way, which is
not a setting. `1e999` is `1 × 10^999`, well within both. `exp(1e999)` has
a significand that 32 digits hold with ease and an exponent that is itself a
number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └───────── significand ─────────┘      └─────── exponent ───────┘
             the settings' part: the display        fixed, not a setting:
             digits, the precision limit and        at most 10^18 either
             the significand limit; 32 digits       way; this one has 999
             fit with ease                          digits, 4.3 × 10^998
```

The exponential of `x` has the decimal exponent `x log10 e`, so `exp(x)`
is refused whenever `x` passes `(10^18 + 1) ln 10`, about `2.3026e18`,
throughout its value's ball, with or without `approx`: `exp(2.3e18)` is
`≈ 3.9591004e+998877308377479203` and `exp(2.31e18)` is refused. So is
`exp(-1e999)`, whose exponent is as far below the bound as
`exp(1e999)`'s is above it, and whose message says so: it is too small
to compute, its exponent would fall below `-10^18`. `sinh`, `cosh` and
powers (`pow(10, 1e999)`, `10^1e999`) share the limit, `sinh` and `cosh`
of a negative argument being too large rather than too small, and a
power that no setting could hold is reported at the bound even where
The significand limit refuses it first (`7^1e19`, an integer of about `8.5 × 10^18`
digits). A refusal needs the whole ball past the edge: an argument whose
value may lie on either side of it, because its radius reaches across
(`exp(approx(1e999) - approx(1e999 - 5))` at its first pass, `5` within
about `2e948`), is not refused but retried at more digits, until the
ball is within the bound (`≈ 148.41316`) or past it, or the retries run
out, when the message says the value cannot be told from the point
where the result passes the bound. What `approx` does relax is the significand limit, in a sum,
in an integer power, and in any product, quotient or sum whose exact
result would grow past the limit: `1e999999999 + 1` is refused, since
its exact value has a billion digits, while `approx(1e999999999) + 1` is
`≈ 1e+999999999`, the `1` absorbed into the radius; `3^1000000000` is
refused, its exact value needing more bits than the significand limit allows, while
`approx(3)^1000000000` is `≈ 5.243997e+477121254`, its digits kept to the
working precision at every step; and `3^32767 * 7^21845` is refused,
each power within the limit and their product past it, while
`approx(3^32767) * 7^21845` is `≈ 9.9732685e+34094`. It never changes an
exponent.

Nor would `approx` help if the exponent were allowed, because of what the
exponential does to a radius: `exp(x ± r)` is `exp(x)` times a factor
between `e^-r` and `e^r`, so the argument's radius, in absolute terms,
becomes the result's relative error, and `exp` of a large argument needs
that argument to many more digits than the result shows. `exp(1e999)` to
32 digits needs `1e999` to about 1,033: its 1,000 digits before the point
and 33 after. `approx(1e999)` is `1e999` within one unit in its last
working digit, and the app computes at rising precisions until the digits
asked for are certain, so the radius shrinks with each pass; but at 32
digits, with a precision limit of 1,000 and a significand limit of 32,768 bits, it stays
above one, where `exp` would have no digit to show, until the sixth pass:

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
exponent would be known to 51 of its 999 digits, and the significand not at
all. The app never gets that far. At every pass `exp` measures its
argument over the whole ball and finds that the result's exponent passes
the bound for every value in it, so it refuses, and the refusal is the
answer. Without `approx`, `exp(1e999)` would be certain at the first
pass, were its exponent allowed, since the exponential of an exact
argument works to as many extra digits as the argument has: `approx`
would cost it five passes.

So the settings are not what stands in the way. The sixth pass is within
the ceiling of 4,040 digits that a precision limit of 1,000 gives, and its
1,354-digit midpoint fits a significand limit of 32,768 bits. The bound
stays, though: parts of the number type are exact only because the
exponent is at most `10^18`, and the cost of an exponential grows fast
with its argument once the bound is raised. Keeping the bound is a
decision, recorded with its reasons and the measurements of a test build
that raised it in `devdocs/numbers.md` ("Why the exponent bound stays at
`10^18`").

Instead, work in log space, as on paper: `1e999 / ln(10)` is the
decimal exponent of `exp(1e999)`, `≈ 4.3429448e+998`, and a quotient of
exponentials is the exponential of a difference, so `exp(1e999) /
exp(1e999 - 5)`, which is refused, is `exp(1e999 - (1e999 - 5))`, `≈
148.41316`. Keep the arguments exact there: the difference
`approx(1e999) - approx(1e999 - 5)` is `5` within about `2e948` at the
first pass, and `exp` refuses it for the size that radius allows,
although by the sixth pass it would be `5` within `2e-354` (issue
[#40](https://github.com/bsidhom/exucal/issues/40)).
