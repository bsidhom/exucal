# Built-in functions

A **built-in** is a function that the core implements in code. Every
other function is a defined function, a line of the definitions file
([Defined functions](functions.md)).
[Built-in functions](../docs/builtins.md) in the user docs is the
reference: what each built-in computes, what it accepts, and what is an
error or refused for size. The mechanism is described here, with each
design decision, its reasons and the alternatives ruled out.

The built-ins are the functions a calculator is used for: the
elementary functions, `approx`, the exact functions such as `floor` and
`gcd`, and the Gamma and Beta families with the incomplete functions
and the error functions. Each returns an exact value in its exact cases,
and everywhere else a ball whose radius bounds its error.

A built-in computes on balls.
[Numbers and precision](numbers.md) describes the arithmetic it runs on,
and [A built-in](architecture.md#a-built-in) on the architecture page
gives the parts of the `Builtin` type and what a call does with them.

These words are used in a particular sense:

- A scalar is a `Ball`: a midpoint and a radius that bounds the error of
  the midpoint. It is exact when its radius is zero
  ([The types](numbers.md#the-types)). The **interval** of a ball runs
  from the midpoint less the radius to the midpoint plus the radius.
  "Zero within one" names the ball of midpoint zero and radius one.
- A **pass** is one evaluation at one precision. The **retry loop** runs
  passes at rising precision, up to the **ceiling**, the highest
  precision any pass computes at
  ([Passes and errors](architecture.md#passes-and-errors)).
- The **kernel** is the set of routines that compute the inexact
  functions in binary fixed point. A routine takes a `Fixed`, a
  fixed-point integer that carries a bound on its own error. The
  **working bits** of a pass are the bits that its precision needs plus
  32 guard bits, and they are written `bits` in a formula. An **ulp** is
  one unit in the last place of a `Fixed`, `2^-bits`
  ([The kernel](numbers.md#the-kernel)).
- The **working grid** is the decimal grid that a pass rounds its
  inexact results onto, a little finer than the pass's precision
  ([Settling](numbers.md#settling)).
- An **edge** is a point where a result depends on which side of it the
  argument lies: an end of a domain, a pole, zero for a sign, a value at
  which a rounding changes, or the top or bottom of the exponent bound.
  A ball **touches** an edge when one end of its interval lies exactly
  on it, and **straddles** it when the interval reaches across.
- An error has the name that the code gives it, in code font. A `domain`
  error is the error for an argument outside the function's domain. An
  `unresolved` is the error for a ball that the pass cannot place on one
  side of an edge. It carries the edge, and the retry loop tries again
  at the next precision.
- A **refusal** is a result that a size limit keeps from being computed.
  `tooLarge` is the significand limit's refusal, and `overflow` and
  `underflow` are the exponent bound's
  ([Values too big to hold](../docs/numbers.md#values-too-big-to-hold)).
  `significandLimitBits` is the significand limit, in bits.

In an example table an error is described in a few words and not
quoted, as in the user docs. The examples are at the default settings
unless a note says otherwise.

The design rests on these decisions:

- **A built-in's name is lower case, says what the function is, and is never read in parts.**
  No built-in is named `e`, and `log` takes its base ([Names](#names)).
- **Every built-in declares the count of arguments it takes**
  ([Arity](#arity)).
- **A built-in that reaches the kernel applies no rounding mode and does not settle its result.**
  A built-in returns an exact ball in an exact case, an error for an
  argument outside its domain, and an `unresolved` for an argument at an
  edge. A result past the exponent bound is refused before anything is
  computed
  ([The rules every built-in follows](#the-rules-every-built-in-follows)).
- **An argument too small or too large for the kernel is answered before the kernel is entered**
  ([Huge and tiny arguments](#huge-and-tiny-arguments)).
- **Each built-in states the dimensions of its arguments and of its result.**
  The trigonometric functions take an angle, and their inverses return
  one ([Dimension rules](#dimension-rules)).
- **Each elementary function has a domain, a few exact cases and the edges that an `unresolved` can name**
  ([Domains, exact cases and edges](#domains-exact-cases-and-edges)).
- **Each elementary routine reduces its argument and then sums a series.**
  Every series but the exponential's is arranged to need few full
  multiplications
  ([The elementary routines](#the-elementary-routines)).
- **Thirteen functions need no kernel and are exact on exact arguments.**
  `div` and `mod` are the floored pair
  ([The exact functions](#the-exact-functions)).
- **The Gamma family is computed from memoized ratios of Bernoulli numbers, and the incomplete functions by the route that costs less.**
  Every result carries a bound on its error
  ([The Gamma and Beta families](#the-gamma-and-beta-families)).
- **`round` takes no mode argument, and `factorial` takes no non-integer.**
  Both are excluded on purpose, and no built-in takes a complex value
  ([Not in this design](#not-in-this-design)).

The code is laid out this way. Each built-in is in a module of its own
under `src/core/builtins/`, with its test beside it. Several built-ins
share a module only when they share internal machinery. Two more modules
hold what the built-ins share:

- `builtin.ts` holds the `Builtin` type, the error types and the helpers
  for the rules, which every module under `builtins/` imports.
- `builtins.ts` gathers the modules into `BUILTINS`, a map by name. No
  module under `builtins/` depends on the map.

The definitions table, which the build makes from the definitions file,
carries the set of built-ins it was built against
(`UnitTable.builtins`). `buildTable` takes the set as a parameter, with
`BUILTINS` as its default. So the build's checks of names and the
table's lookup work from one set, and a test can build a table against a
built-in of its own.

## Names

[Names](../docs/definitions.md#names) in the user docs states the rules
for the namespace that the built-ins share with the units, and
[Names that are absent or mean something else](../docs/units.md#names-that-are-absent-or-mean-something-else)
lists the names a user might expect and not find. The built-ins' names
follow from these decisions:

- **Euler's number is `exp(1)`.** In the definitions file `e` is the
  elementary charge and `W` is the watt. So `e` is not free for Euler's
  number, and `W` is not free for Lambert's function. That function is
  not a built-in, and the docs call it `lambertw`.
- **`pi()` is a call.** Its value depends on the precision of the pass
  that asks for it, and a literal in a definition has one fixed value
  ([Numbers and precision](numbers.md)).
- **`log` is the two-argument logarithm.** `log(b, x)` takes the base
  first, so that it reads as the logarithm of `x` to the base `b`. The
  one-argument logarithms are `ln`, `log10` and `log2`. A one-argument
  `log(x)` would have to choose between the natural logarithm and the
  common one, and conventions differ.
- **The decibel is `decibel`**, a defined function of the definitions
  file, and not `dB`. `d-` is a prefix and `B` is a unit, and a
  function's name may not read as a prefix followed by a unit: typed
  where a unit is read, the bare name would mean the prefixed unit. The
  file defines the neper and the bel the same way, as `neper` and `bel`
  ([Logarithmic levels](../docs/units.md#logarithmic-levels)).
- **The incomplete functions say what they are.** Their names are lower
  case, as every built-in's name is. Each names its function, with the
  suffix `reg` for the regularized form: `lowergamma`, `uppergamma`,
  `lowergammareg`, `uppergammareg`, `incbeta` and `incbetareg`. A
  one-letter name such as `P` says nothing, and a one-letter name is one
  that a definition would want.
- **No built-in's name collides with a unit's or reads as a prefix followed by a unit.**
  The build checks both for any table it builds.
- **Nothing reads a call's name in parts.** Prefixes apply to units
  alone, and a call's name is looked up exactly. Three things follow:
  - `kpi()` and `mexp(1)` are calls of unknown functions.
  - One built-in's name may begin another's, as `log` begins `log10` and
    `atan` begins `atan2`.
  - A name that reads as a prefix followed by another built-in's name is
    only itself. `asin` is not `a` + `sin`, since no prefix is tried on
    a call.

| You type        | Into  | Exucal shows                       | Note                |
| --------------- | ----- | ---------------------------------- | ------------------- |
| `exp(1)`        |       | `≈ 2.7182818`                      | Euler's number      |
| `log(10, 1000)` |       | `= 3`                              | the base first      |
| `log10(1000)`   |       | `= 3`                              |                     |
| `kpi()`         |       | an error: no function has the name | no prefix on a call |
| `asin(0.5)`     | `deg` | `≈ 30 deg`                         | not `a` + `sin`     |

## Arity

[Calls and arity](../docs/expressions.md#calls-and-arity) in the user
docs states the rule for a user, and [A call](architecture.md#a-call)
says where the evaluator checks the count of arguments and why it checks
before it evaluates any of them.

The grammar accepts a call with any number of arguments: `f()`, `f(x)`,
`f(x, y)`. The count that a function accepts is the function's own. A
built-in declares a range, from a least count to a greatest. `round`
takes one argument or two, and every other built-in takes one fixed
count.

No built-in takes a list of any length: every range has a greatest
count.

| You type          | Exucal shows              | Note                                 |
| ----------------- | ------------------------- | ------------------------------------ |
| `round(2.567)`    | `= 3`                     | one argument                         |
| `round(2.567, 2)` | `= 2.57`                  | two arguments                        |
| `round(1, 2, 3)`  | an error: three arguments | `round` takes one or two             |
| `sqrt(bogus, 1)`  | an error: two arguments   | reported before `bogus` is looked up |

## The rules every built-in follows

[Rules every built-in follows](../docs/builtins.md#rules-every-built-in-follows)
in the user docs states what a built-in takes, where its exact cases are
named and when a call is refused for size. The implementations share
these rules.

### A built-in that reaches the kernel applies no rounding mode

A built-in that reaches the kernel returns the ball that leaves the
kernel. The midpoint is the kernel's value rounded to nearest onto the
working grid (`fixedToBall`), and the radius is the kernel's error plus
that rounding. The rounding mode that the user sets plays no part, and
the built-in does not settle its result, since the evaluator settles
every result it produces ([Settling](numbers.md#settling)). One built-in
does apply the user's rounding mode, and it does not reach the kernel:
`round` ([`round` and the rounding mode](#round-and-the-rounding-mode)).

A built-in never sees a decimal-mode context. In decimal mode the
evaluator runs the built-in at exact-mode contexts until the rounding
asked for is certified ([Decimal mode](numbers.md#decimal-mode)).
`approx` is the one built-in whose purpose is to make a value inexact
([approx](numbers.md#approx)), and it alone declares itself the identity
in decimal mode (`decimal: "identity"`).

### An exact case returns an exact ball

A built-in returns an exact ball, of radius zero, wherever the value is
rational and cheap to recognize
([Operations that stay exact; exact cases of functions](../docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions)
states the rule for a user). Every other result is an inexact ball,
however round its digits look. The cases are listed in
[Domains, exact cases and edges](#domains-exact-cases-and-edges) and in
each module's header.

| You type        | Exucal shows | Note                            |
| --------------- | ------------ | ------------------------------- |
| `log2(8)`       | `= 3`        | an exact case                   |
| `ln(8) / ln(2)` | `≈ 3`        | two inexact values, and a ratio |

### An argument of unbounded radius

A radius is unbounded when no bound on the error is known
([`Radius`](numbers.md#radius)). A built-in answers an argument of
unbounded radius with the function of its midpoint, with an unbounded
radius (`unboundedOf`). The midpoint must lie in the domain, as any
argument must.

### A built-in that reaches the kernel is a module and a routine

- The module under `builtins/` makes the checks on the ball: the domain,
  the edges and the exact cases. It converts the argument to a `Fixed`
  and hands it to a kernel routine, in one of the `fixed-*.ts` modules.
- The routine reduces the argument, runs its series, and cuts the result
  to the bits that its magnitude calls for (`keepSignificant`).

The routine runs its series on the argument with the argument's error
included from the start. Its **error count**, a bound on its error in
ulps, grows with that error at every operation that takes the argument.
So no bound from a derivative has to be written and proved for each
function. The truncation bound of a series is taken at the upper end of
the argument's interval.

Propagating the error this way has a price. Where a series takes the
argument in two places,
the radius of a narrow ball exceeds the derivative's bound by a small
factor. The sine of a
ball of midpoint `1` and radius `1e-20` has a radius of `6e-21`, where
the derivative gives `cos(1) × 1e-20`, about `5.4e-21`.

### A small argument keeps its digits

The odd functions are close to the identity near zero: `sin`, `tan`,
`asin`, `atan`, `sinh`, `tanh`, `asinh` and `atanh`. A small argument
converted at the working bits alone would keep few significant bits,
and the result would keep no more. So the built-in converts a small
argument at the working bits plus the argument's negative binary
exponent (`extraBits`, held to the significand limit).
[Roots and powers](numbers.md#roots-and-powers) gives the reasoning for
the same scaling in `rootBall`.

| You type            | Exucal shows | Note              |
| ------------------- | ------------ | ----------------- |
| `sin(1e-50 radian)` | `≈ 1e-50`    | at the first pass |
| `asinh(1e-50)`      | `≈ 1e-50`    | at the first pass |

### A wide argument gets a trivial bound

An argument can be too wide for a routine's series. Each routine has a
threshold:

- about a fifth of a radian, for `sin` and `cos`;
- one, for `atan`;
- a radius of one half, for `asinh`, `tanh` and `exp`.

The series is not run on such an argument. The answer is a
**trivial bound**: a ball that covers every value the function takes
over the argument.

- `sin`, `cos` and `tanh` give zero within one, the function's whole
  range.
- `atan` gives zero within two, the power of two above `pi/2`.
- `exp` gives zero within the exponential of the signed upper end of the
  interval. That end is formed exactly. The largest magnitude would not
  do:
  a wide negative interval near the bottom edge of the exponent bound
  would then read as an overflow.
- `sinh` and `cosh` give zero within the exponential of the largest
  magnitude in the interval.
- `asinh` gives the value at the midpoint, with the argument's radius
  added to the result's, since the slope of `asinh` is at most one
  everywhere. The routine's own formula, `ln(x + sqrt(x^2 + 1))`, does
  not serve at such a width.
  The product rule centers the interval of `x^2` on the midpoint's
  square
  ([Error bounds for the four operations](numbers.md#error-bounds-for-the-four-operations)),
  so `x^2 + 1` under the root would reach below zero.

A trivial bound certifies no digit. The next pass computes the argument
at a higher precision, which narrows it.

The ends of the interval would give a tighter bound for a monotone
function, as `[tanh(lo), tanh(hi)]` is for the hyperbolic tangent. These
functions do not take them, because the next pass narrows every wide
argument today. The ends are worth writing only for an argument whose
bounded radius no pass narrows. No argument has such a radius today, and
[approx](numbers.md#approx) names the form that would give one, the
binary form of `approx`.

`erf`, `erfc` and the incomplete functions do take the two ends of a
wide ball. The routine of the incomplete gamma functions cannot run on a
wide argument
([The incomplete gamma functions](#the-incomplete-gamma-functions)), and
each of these functions is monotone in its argument `x`. The two results
are **hulled**, that is, covered by one ball (`hullOfEnds`). Three cases
of the hull are special:

- Where one end gives a value and the other is refused past the bottom
  of the exponent bound, the hull is the hull of the value with zero.
- Where one end gives a value and the other is refused past the top of
  the bound, the call is `unresolved` at the bound.
- For two results whose midpoints are too far apart to align, the hull
  takes the sum of their magnitudes as its bound.

### An argument outside the domain is an error, and one at an edge is retried

A built-in applies the rule of the edges
([Values at an edge](../docs/numbers.md#values-at-an-edge) states it for
a user) this way:

- An argument outside the domain throughout its ball is a `domain`
  error. The error is located at the call and names the argument. An
  even root of a negative value is a separate error, `negativeRadicand`
  ([The reasons a `domain` error carries](#the-reasons-a-domain-error-carries)).
- An argument that straddles an edge of the domain is `unresolved` at
  that edge. So is one that straddles any other point where the result
  depends on the side. The retry loop raises the precision, and at the
  ceiling the message says that the value cannot be told from the edge.
- A ball that touches an end of a domain counts as one that straddles
  it, even where the end belongs to the domain. `asin` of the interval
  `[0.5, 1]`, `acosh` of `[1, 1.5]` and `atanh` of `[0.5, 1]` are
  `unresolved` at the edge. The rule is by design: no check of an edge
  has to know whether the end it tests is closed. The rounding functions
  follow it too. Two touches are not straddles, the one in the next
  item and the ends of the incomplete beta function's domain
  ([The incomplete beta function](#the-incomplete-beta-function)).
- A ball that touches zero from below, such as `[-2, 0]`, holds no
  positive value. For a logarithm or for a base it is outside the domain
  throughout, a `domain` error.
- For the exponent of a zero base, a ball that touches zero is
  `unresolved`, since `0^0` differs from zero to a negative power.

The message names the edge that an `unresolved` carries, in one of four
forms:

- Zero.
- A point, written to twelve digits. The point is `1`, `-1`, a value at
  which a rounding changes, a multiple of the divisor for `div` and
  `mod`, or in one case of the rounding functions the result itself
  ([The exact functions on an inexact argument](#the-exact-functions-on-an-inexact-argument)).
- A pole of the function.
- The point where the result passes the exponent bound.

| You type            | Exucal shows                                      | Note                     |
| ------------------- | ------------------------------------------------- | ------------------------ |
| `ln(-1)`            | an error: the argument is not positive            | a `domain` error         |
| `asin(approx(1))`   | an error: the argument cannot be told from `1`    | `unresolved`, at a point |
| `ln(sqrt(2)^2 - 2)` | an error: the argument cannot be told from zero   | `unresolved`, at zero    |
| `tan(90 deg)`       | an error: the argument cannot be told from a pole | `unresolved`, at a pole  |

### A result past the exponent bound is refused before anything is computed

These built-ins test their result against the exponent bound before
they compute it: `exp`, `sinh`, `cosh`, `pow`, `gamma`,
`beta`, `erfc` and the incomplete functions.
[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) in
the user docs states the bound and its refusals, and
[The classifier](numbers.md#the-classifier) describes the test, which
works on an interval that contains the logarithm of the result:

- A result past the exponent bound for every value of the argument's
  ball is refused before anything is computed. The refusal is an
  `underflow` below the bottom of the bound, as for `exp` of a negative
  argument and for a power toward zero, and an `overflow` above the top.
  `sinh` and `cosh` overflow for an argument of either sign.
- An argument whose ball reaches across an edge of the exponent bound is
  `unresolved` there, and it is retried.
- Within the exponent bound no result is refused, whatever its decimal
  exponent, the power of ten of its magnitude
  ([Large and small results](numbers.md#large-and-small-results)).

`tanh` makes no such test, and it is never refused for the size of its
argument. `tanh` **saturates**: past a magnitude that grows with the
working bits, the built-in answers `1` or `-1` within a radius, without
the kernel ([Huge and tiny arguments](#huge-and-tiny-arguments)). So the
kernel is handed only an argument below about 181,727, at the largest
ceiling the settings allow, and it can hold every such argument.

| You type      | Exucal shows                  | Note               |
| ------------- | ----------------------------- | ------------------ |
| `exp(1e30)`   | refused: too large to compute | `overflow`         |
| `exp(-1e30)`  | refused: too small to compute | `underflow`        |
| `sinh(-1e30)` | refused: too large to compute | `overflow`         |
| `tanh(1e30)`  | `≈ 1`                         | saturated, no test |

### Huge and tiny arguments

The kernel holds a value only up to the significand limit
([The kernel's boundary](numbers.md#the-kernels-boundary)). So an
argument at either end of the exponent's range is answered before the
kernel is entered. The entries of
[Built-in functions](../docs/builtins.md) say which of these arguments
are refused. Three sizes of argument matter:

- An argument is **tiny** when it lies below `2^-significandLimitBits`
  throughout its ball (`isTiny`).
- An argument is **huge** when its ball reaches
  `2^significandLimitBits` (`isHuge`).
- An argument is **beyond the working bits** when it lies at or beyond
  `2^bits` throughout its ball (`isBeyond`). The working bits are at
  most half of `significandLimitBits`, so this size starts far below the
  huge one.

#### A tiny argument takes the expansion at zero

A tiny argument is answered by the function's expansion at zero:

- An odd function gives the argument itself within its cube
  (`tinyOdd`).
- `cos` and `cosh` give one within the argument's square (`tinyEven`).
- `exp` gives one within twice the argument's magnitude. The bound is
  sound, since `e^|x| - 1` is at most `2|x|` there.
- `erf` gives `2x / √π` within `|x|^3`, since the next term of its
  series is `-2x^3 / (3 √π)`. `erfc` gives one minus that value.

`asin` and `acos` take their expansion sooner, wherever the argument's
square lies below `2^-bits`. `acos` is then `pi/2` less the argument.
Their formulas hold `sqrt(1 - x^2)`, with `1 - x^2` formed on the ball
([The elementary routines](#the-elementary-routines)). That difference
stops aligning within the significand limit long before `x` is tiny.

A result of one within a radius is a ball that straddles one. At the
default rounding mode it shows `≈ 1`. Under a directed rounding mode it
shows `≈ 1` with the note that no digit is certified, as `approx(1)`
does.

#### An argument below half an ulp that is not tiny

Between `2^-significandLimitBits` and half an ulp of the working bits,
the answer depends on how the built-in converts its argument
([The kernel's boundary](numbers.md#the-kernels-boundary) describes the
conversion):

- A built-in that converts at the working bits alone hands the kernel
  zero within an ulp. `exp` does, and its result is then `≈ 1`, as the
  expansion would give it. So does a power computed as `exp(y ln x)`
  whose exponent `y` is that small.
- The odd functions and the inverses convert at the working bits plus
  the argument's negative binary exponent, so an argument or a ratio of
  that size keeps its digits.
- `atan2` takes the expansion for a tiny ratio over a positive `x`, and
  it never forms a tiny ratio over a negative `x`.

#### A huge argument, and one beyond the working bits

- `sin`, `cos` and `tan` of a huge argument are `tooLarge`, since the
  reduction would need `pi` to that many bits. The refusal carries the
  reach `exceeds`: the step needs more bits than the limit holds
  whatever its operands, so the message offers no remedy
  ([The significand limit](numbers.md#the-significand-limit)).
- `atan` of an argument beyond the working bits is `pi/2` or `-pi/2`
  within `2^-bits`.
- `asinh` and `acosh` of an argument beyond the working bits are
  `ln(2|x|)` within `1/(2x^2)`. The logarithm is taken as
  `ln 2 + ln |x|` (`farLogarithm`).
- `tanh` saturates to `1` or `-1` within `2 e^-2|x|`, from the magnitude
  at which the working bits plus a margin can no longer tell its value
  from one. A `Radius` holds that bound at any magnitude.
- `erf` of an argument beyond the working bits is `1` or `-1` within
  the bound of `erfc(|x|)`, which lies below `10^-(10^18)` there, the
  smallest magnitude the exponent bound holds.
- A logarithm takes an argument of any exponent. `ln(m × 10^e)` is
  `ln m + e ln 10`, with `ln 10` from its memo (`lnScaled`). So
  `ln(1e999999999)` is a value, and `log10(1e999999999)` is exactly
  `999999999`.

#### `atan` and `atan2` at either end

`atan2` compares the magnitudes of its arguments before it forms their
ratio, through the low-precision `Radius` type. For a `y` of definite
sign:

- The result is `pi/2` or `-pi/2`, by the sign of `y`, when `|y|` is at
  least `|x| × 2^bits` throughout.
- The result is `pi` or `-pi` when `x` is negative and `|y| / |x|` lies
  below `2^-bits`.
- For a positive `x`, a tiny ratio is its own arctangent within its
  cube.

Neither `atan` nor `atan2` is refused for the radius of an argument. A
ball can be so wide that it is huge while part of it lies below
`2^bits`. Such a ball gives the function's whole range: zero within two
for `atan`, and zero within four for `atan2`. Two and four are the
powers of two above `pi/2` and `pi`, the kernel's own trivial bound. The
fractions of `pi` themselves would certify nothing more, since a ball
around zero of either radius certifies no digit. They would change only
the radius that the display shows at the ceiling.

`atan2` forms the ratio `x / y` where `x` straddles zero and `y` has a
definite sign ([The elementary routines](#the-elementary-routines)).
Where that ratio is such a ball, the call does not give the whole range:
it is `unresolved` at zero, for `x`. The value could then lie almost
anywhere between `0` and `pi`, and the side of zero that `x` lies on
decides which end it is near.

#### Known defects

- `asin`, `acos` and `acosh` of an exact argument with a long
  significand are refused, as `asin(0.1 + 1e-15000)` is. Their exact
  `1 - x^2` does not align within the significand limit
  ([#63](https://github.com/bsidhom/exucal/issues/63)).
- `tanh` takes one pass more for an argument in a band below the
  magnitude at which it saturates. The band starts where the routine for
  `sinh` and `cosh` stops computing the reciprocal of the exponential
  and adds it to the error
  ([The elementary routines](#the-elementary-routines)). At 32 display
  digits `tanh(75)` takes two passes, where `tanh(60)` and `tanh(100)`
  take one ([#65](https://github.com/bsidhom/exucal/issues/65)).

| You type                           | Exucal shows                           | Note                                             |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `sin(1e-999999999 radian)`         | `≈ 1e-999999999`                       | the expansion, at the first pass                 |
| `exp(1e-999999999)`                | `≈ 1`                                  | one within a radius                              |
| `acos(1e-9860)`                    | `≈ 1.5707963 radian`                   | the expansion on the square                      |
| `erf(1e-999999999)`                | `≈ 1.1283792e-999999999`               | `2x / √π`                                        |
| `sin(1e999999999 radian)`          | refused: past the significand limit    | the reduction needs `pi` to the argument's bits  |
| `atan(1e999999999)`                | `≈ 1.5707963 radian`                   | `pi/2` within `2^-bits`                          |
| `asinh(1e999999999)`               | `≈ 2.3025851e+9`                       | `ln 2 + ln \|x\|`                                |
| `ln(1e999999999)`                  | `≈ 2.3025851e+9`                       | any exponent                                     |
| `log10(1e999999999)`               | `≈ 1e+9`                               | exactly `999999999`, with more digits than shown |
| `atan2(1e-999999999999999999, 1)`  | `≈ 1e-999999999999999999 radian`       | a tiny ratio over a positive `x`                 |
| `atan2(1e-999999999999999999, -1)` | `≈ 3.1415927 radian`                   | `pi`: no ratio is formed                         |
| `atan2(1e-30000, 1 - approx(1))`   | an error: `x` cannot be told from zero | a huge ratio `x / y`, with `x` straddling zero   |
| `asin(0.1 + 1e-15000)`             | refused: past the significand limit    | the first defect                                 |

## Dimension rules

[Rules every built-in follows](../docs/builtins.md#rules-every-built-in-follows)
in the user docs states what each built-in takes, and
[Primitives, dimensions and kinds](../docs/quantities.md#primitives-dimensions-and-kinds)
defines a kind and the radian kind.

Each built-in has a dimension rule: the dimensions that its arguments
must have, and the dimension of its result. The evaluator checks the
rule before it applies the function ([A call](architecture.md#a-call)).
A rule fails with one of three errors:

- `argumentDimension`, for an argument of the wrong dimension or kind;
- `nonconformingArguments`, for two arguments that must conform to each
  other and do not;
- `noAngles`, for a table with no radian kind.

The failure carries every argument's span, its place in the text typed.
So a message can show the corrected call in the user's own text:
`sin(1 radian)` for `sin(1)`, and `(2 m)^2` for `pow(2 m, 2)`.

A **plain number** is a **dimensionless** quantity: one with neither a
dimension nor a kind. "Plain number" is the word of the code's rules
(`plainNumbers`).

| Function                                                                                     | Arguments                                       | Result         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------- |
| `pi()`                                                                                       | none                                            | plain number   |
| `exp`, `ln`, `log10`, `log2`, `sqrt`, `cbrt`                                                 | a plain number                                  | plain number   |
| `log(b, x)`, `pow(x, y)`                                                                     | two plain numbers                               | plain number   |
| `sin`, `cos`, `tan`                                                                          | an angle: the `radian` kind                     | plain number   |
| `asin`, `acos`, `atan`                                                                       | a plain number                                  | `radian` kind  |
| `atan2(y, x)`                                                                                | two quantities of one dimension, kinds included | `radian` kind  |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`                                            | a plain number                                  | plain number   |
| `approx(x)`, `abs(x)`                                                                        | any quantity, kinds included                    | the argument's |
| `sign(x)`                                                                                    | any quantity, kinds included                    | plain number   |
| `floor`, `ceil`, `trunc`, `round(x)`, `round(x, places)`                                     | plain numbers                                   | plain number   |
| `div(a, b)`                                                                                  | two quantities of one dimension, kinds included | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension, kinds included | the arguments' |
| `gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial`                                     | plain numbers                                   | plain number   |
| `digamma`, `gamma`, `lgamma`, `beta`, the incomplete gamma and beta functions, `erf`, `erfc` | plain numbers                                   | plain number   |

### Angles

`sin`, `cos` and `tan` take an angle, a quantity of the radian kind
([Trigonometric](../docs/builtins.md#trigonometric)), and `asin`,
`acos`, `atan` and `atan2` return one
([Inverse trigonometric](../docs/builtins.md#inverse-trigonometric)).
The hyperbolic functions take and return plain numbers, since their
arguments are not angles.

- `radian` is a kind primitive that the definitions file declares, and
  every angle unit carries it. So the kernel sees the scalar in radians.
  `deg` is `pi() radian / 180`, and `sin(30 deg)` reaches the kernel as
  `pi / 6`.
- A plain number where an angle is wanted is a kind mismatch. `sin(0)`
  is that mismatch too, as `1 m + 0` is a dimension mismatch.
  `sin(0 radian)` is the exact zero.
- An inverse's result converts into any angle unit. `asin(0.5)` into
  `turn` is the same angle counted in turns, and it is still an angle.
  The plain number is `asin(0.5) / radian`.
- The rule names the primitive `radian` by convention (`RADIAN` in
  `builtin.ts`). A table that declares no such primitive has no angles,
  and the trigonometric functions report that (`noAngles`).

| You type             | Into   | Exucal shows                                | Note                          |
| -------------------- | ------ | ------------------------------------------- | ----------------------------- |
| `sin(30 deg)`        |        | `≈ 0.5`                                     | the kernel is handed `pi / 6` |
| `sin(1)`             |        | an error: `sin` takes an angle              | a kind mismatch               |
| `sin(0 radian)`      |        | `= 0`                                       | an exact case                 |
| `asin(0.5)`          | `turn` | `≈ 0.083333333 turn`                        | an angle still                |
| `asin(0.5) / radian` |        | `≈ 0.52359878`                              | the plain number              |
| `2 asin(0.5) + 1`    |        | an error: the two terms differ in kind      | an angle and a plain number   |
| `atan2(3 m, 4 m)`    | `deg`  | `≈ 36.869898 deg`                           | two lengths                   |
| `atan2(3 m, 4 s)`    |        | an error: the arguments differ in dimension |                               |

#### The rule is strict on purpose

The alternative is a rule that accepts a plain number as an angle, or
treats the radian kind as `1`, with the inverses returning plain
numbers. It would let two mistakes pass:

- `sin(pi())` would be valid.
- A phase written as a plain number would be valid: `2 pi()` times a
  frequency times a time.

And it would lose two things:

- `asin(0.5)` could not be converted into `deg`.
- `asin(sin(x))` would lose the kind of `x`.

Kinds exist to keep an angle from being mistaken for a number, and the
degree-radian confusion is first among such mistakes. So the rule is
strict. The strictness has two costs:

- `sin(pi())` is written `sin(pi() radian)`.
- A phase is a plain number in the predefined file, where `Hz` carries
  no kind and stays apart from `rad/s`. It is written as a count of
  turns, `sin(50 Hz * 1 ms turn)`.

The inverses return an angle for two reasons:

- The argument of `asin` is a ratio, a plain number, and the result is
  the angle that has that ratio. The radian kind names such a result.
- Only this choice lets the forward functions and the inverses agree:
  `sin(asin(0.5))` evaluates, and `asin(sin(x))` has the kind that `x`
  has.

| You type                     | Exucal shows                   | Note                          |
| ---------------------------- | ------------------------------ | ----------------------------- |
| `sin(pi() radian)`           | `≈ 0`, within a bound of zero  | written with the unit         |
| `sin(2 pi() * 50 Hz * 1 ms)` | an error: `sin` takes an angle | the phase is a plain number   |
| `sin(50 Hz * 1 ms turn)`     | `≈ 0.30901699`                 | the phase as a count of turns |
| `sin(asin(0.5))`             | `≈ 0.5`                        | the two agree                 |

### `floor` and the other rounding functions take a plain number

A quantity's scalar is held in the primitives, so `floor(3.7 ft)` would
floor `1.12776 m` and answer `1 m`. No one means that, and the answer
would change with the choice of primitives
([A quantity carries no unit](../docs/quantities.md#a-quantity-carries-no-unit)
in the user docs says how to floor a length). The rule that follows
sorts the exact functions:

- A function whose result depends on the unit the value is written in is
  defined only on plain numbers: `floor`, `ceil`, `trunc` and `round`.
  The user writes `floor(3.7 ft / ft) ft`, which says which unit the
  floor is in.
- `abs`, `sign`, `div` and `mod` do not depend on the unit's scale, so
  they take quantities. `mod(7 ft, 2 ft)` is `1 ft` whatever the
  primitive is.
- `gcd`, `lcm` and the factorials are about integers, and an integer is
  a plain number.

| You type                | Into  | Exucal shows                                  | Note                    |
| ----------------------- | ----- | --------------------------------------------- | ----------------------- |
| `floor(3.7 ft)`         |       | an error: the argument must be a plain number |                         |
| `floor(3.7 ft / ft) ft` | `ft`  | `= 3 ft`                                      | the floor in feet       |
| `mod(7 ft, 2 ft)`       | `ft`  | `= 1 ft`                                      | independent of the unit |
| `mod(-30 deg, 360 deg)` | `deg` | `≈ 330 deg`                                   | the radian kind is kept |
| `mod(1 rad/s, 1 Hz)`    |       | an error: the arguments differ in kind        | kinds included          |

## Domains, exact cases and edges

The elementary functions have these domains, exact cases and edges, as
the modules hold them. Each entry of
[Built-in functions](../docs/builtins.md) in the user docs gives the
domain and the exact cases for a user.

| Function              | Domain                                                 | Exact cases                                                                                                                                 | Edges an `unresolved` names                                                                                   |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pi()`                |                                                        | none                                                                                                                                        |                                                                                                               |
| `exp`                 | all                                                    | `exp(0)`                                                                                                                                    | the exponent bound                                                                                            |
| `ln`, `log10`, `log2` | `x > 0`                                                | `ln(1)`, `log10(1)`, `log2(1)`; for `log10` and `log2`, an integer power of the base either way                                             | zero                                                                                                          |
| `log(b, x)`           | `b > 0`, `b ≠ 1`, `x > 0`                              | `x` an integer power of `b`, or `b` of `x`; no other rational exponent is looked for ([#200](https://github.com/bsidhom/exucal/issues/200)) | zero for `b` and `x`; `1` for `b`                                                                             |
| `sqrt`                | `x >= 0`                                               | a perfect square                                                                                                                            | zero                                                                                                          |
| `cbrt`                | all                                                    | a perfect cube                                                                                                                              |                                                                                                               |
| `pow(x, y)`           | `x > 0`, or `x <= 0` with a rational `y` as `^` allows | `x` a perfect `q`-th power for `y = p/q`; `pow(x, 0)` is `1`; the bases `0` and `1` for any `y`, and `-1` for an exact `y`, by parity       | zero for `x`; zero for `y` when `x` is zero; the exponent bound                                               |
| `sin`, `cos`, `tan`   | all                                                    | zero: `sin(0 radian)`, `cos(0 radian)`, `tan(0 radian)`                                                                                     | a pole of `tan`                                                                                               |
| `asin`, `acos`        | `[-1, 1]`                                              | `asin(0)`, `acos(1)`                                                                                                                        | `1`, `-1`                                                                                                     |
| `atan`                | all                                                    | `atan(0)`                                                                                                                                   |                                                                                                               |
| `atan2(y, x)`         | not both zero                                          | `atan2(0, x)` for `x > 0`                                                                                                                   | zero for `y` when `x` is not positive; zero for `x` when `y` is zero or `x / y` reaches the significand limit |
| `sinh`, `cosh`        | all                                                    | zero: `sinh(0)`, `cosh(0)`                                                                                                                  | the exponent bound                                                                                            |
| `tanh`                | all                                                    | `tanh(0)`                                                                                                                                   |                                                                                                               |
| `asinh`               | all                                                    | `asinh(0)`                                                                                                                                  |                                                                                                               |
| `acosh`               | `x >= 1`                                               | `acosh(1)`                                                                                                                                  | `1`                                                                                                           |
| `atanh`               | `-1 < x < 1`                                           | `atanh(0)`                                                                                                                                  | `1`, `-1`                                                                                                     |

### The reasons a `domain` error carries

A `domain` error carries a reason, which `messages.ts` words, and its
message quotes the argument. These are the reasons:

- `notPositive`, `baseOne`, `outsideClosedUnitInterval`, `belowOne`,
  `outsideOpenUnitInterval` and `origin`, for the elementary functions;
- `notInteger`, `notExact` and `negative`, for the integer functions;
- `outsideZeroOne`, for the argument of the incomplete beta function;
- `pole`, an exact integer at or below zero, for the Gamma family.

An even root of a negative value is not a `domain` error. It is a
`negativeRadicand`, a separate error, which `sqrt(-1)` shares with
`(-1)^(1/2)`.

### Values taken from a memoized constant

Some round arguments have an irrational value and are no exact case.
`asin(1)`, `asin(-1)`, `acos(-1)`, `atan2(0, x)` for a negative `x` and
`atan2(y, 0)` for a nonzero `y` are the memoized `pi` or its half, as
`exp(1)` is the memoized `e`
([Memoized constants](numbers.md#memoized-constants)).

`atan2` with a `y` of exactly zero has four answers, by `x`:

- the exact zero, for an `x` positive throughout;
- `pi`, for an `x` negative throughout;
- `unresolved` at zero, for an `x` that straddles zero;
- the `origin` error, for an `x` of exactly zero.

### The exact cases of `log`

The exact cases of `log(b, x)` are integer exponents in either
direction: `x` an integer power of `b`, or `b` an integer power of `x`.
The built-in finds them by repeated division. `log(b, 1)` is zero for
any valid base. No other rational exponent is looked for, so `log(4, 8)` is
inexact.

`b` is checked before `x`. A `b` that straddles one is `unresolved` at
the edge `1`, and so is a `b` whose logarithm is a ball around zero at
the working bits.

| You type            | Exucal shows                               | Note                                       |
| ------------------- | ------------------------------------------ | ------------------------------------------ |
| `log(2, 8)`         | `= 3`                                      | `x` a power of `b`                         |
| `log(3, 1/9)`       | `= -2`                                     | a negative exponent                        |
| `log(8, 2)`         | `≈ 0.33333333`                             | exactly `1/3`, with more digits than shown |
| `log(7, 1)`         | `= 0`                                      | any valid base                             |
| `log(4, 8)`         | `≈ 1.5`                                    | inexact: `3/2` is not looked for           |
| `log(1, 5)`         | an error: no logarithm has base one        | `baseOne`                                  |
| `log(approx(1), 5)` | an error: the base cannot be told from `1` | `unresolved`, at `1`                       |

### `pow`, and `^` with it

[Roots and powers](../docs/builtins.md#roots-and-powers) in the user
docs gives the difference a user meets: `pow(x, y)` takes a plain base
and a plain exponent, and a power of a quantity is written with `^`,
whose exponent is typed so that the dimension stays exact. The two share
`powRationalBall`, and [Roots and powers](numbers.md#roots-and-powers)
describes its three routes: the exact root, the root of the power, and
`exp(y ln x)` in log space.

Three terms describe what `pow` adds:

- A value is held in its **canonical form**: a significand, which is a
  fraction in lowest terms, times a power of ten, `10^k`. Every factor
  of ten is in that power, and the significand's denominator has no
  factor of two or five
  ([`Scaled`](numbers.md#scaled)).
- The **fraction of an exponent** is the exponent as one plain fraction
  `p/q`, with the power of ten multiplied in. It can be formed only
  where it fits the significand limit.
- **Log space** is the third route, `exp(y ln x)`.

`pow` takes two exponents that `^` does not: an inexact exponent, and an
exact exponent whose fraction cannot be formed.

- **An exact exponent whose fraction cannot be formed** takes log
  space. An exact base whose power lies past the exponent
  bound is refused first, so `pow(2, 1e999999999)` is an `overflow`. For a
  negative base, the parity of the exponent's fraction decides between a
  value and an even root of a negative value, and the canonical form
  gives the parity.
- **An inexact exponent** takes log space for a positive base. A base
  at or below zero with an inexact exponent is a `domain` error.
- **A negative base under an even root** is a `negativeRadicand`, and a
  base that straddles zero is `unresolved`.
- **An exact zero base** is exactly zero for an exponent positive
  throughout, a division by zero for an exponent negative throughout,
  and `unresolved` at zero for an exponent that straddles zero.
  `pow(0, 0)` is one.

An exact exponent of zero is answered first, as `1`. Three bases then
need no arithmetic, and they are answered in this order, before the
exponent's fraction is formed:

1. `pow(1, y)` is exactly `1` for any `y`, inexact or huge.
2. `pow(0, y)` is decided as the zero base above.
3. `pow(-1, y)`, for an exact `y` whose fraction cannot be formed, is
   decided by the parity that the canonical form gives (`minusOneTo`):
   - With `k > 0`, the fraction's numerator is a multiple of ten over
     an odd denominator, so the power is `1`.
   - With `k < 0`, the fraction's denominator is even unless the
     significand's numerator holds at least `-k` factors of
     two. An even denominator makes the power an even root of a negative
     value. Under an odd denominator, the parity of the fraction's
     numerator gives `-1` or `1`.

   An exponent whose fraction can be formed keeps the rational route, so
   `pow(-1, 1/3)` is `-1` and `pow(-1, 2/3)` is `1`.

| You type                 | Exucal shows                                    | Note                                     |
| ------------------------ | ----------------------------------------------- | ---------------------------------------- |
| `pow(8, 1/3)`            | `= 2`                                           | the exact root                           |
| `pow(1/4, 3/2)`          | `= 0.125`                                       | the exact root                           |
| `pow(2, 1e999999999)`    | refused: too large to compute                   | the bound, tested on the base's value    |
| `pow(2, 1e-30000)`       | `≈ 1`                                           | log space: the fraction cannot be formed |
| `pow(-2, 1e-30000)`      | an error: an even root of a negative value      | the parity, from the canonical form      |
| `pow(-2, approx(1))`     | an error: the base is not positive              | a `domain` error                         |
| `pow(0, -2)`             | an error: a division by zero                    |                                          |
| `pow(0, sqrt(2)^2 - 2)`  | an error: the exponent cannot be told from zero | `unresolved`, at zero                    |
| `pow(1, approx(1e400))`  | `= 1`                                           | the base `1`                             |
| `pow(-1, 1e999999999/3)` | `= 1`                                           | `k > 0`                                  |
| `pow(-1, 1e-30000)`      | an error: an even root of a negative value      | `k < 0`, an even denominator             |
| `pow(-1, 5^-16000)`      | `= -1`                                          | an odd denominator and an odd numerator  |
| `pow(-1, 2 * 5^-16000)`  | `= 1`                                           | an odd denominator and an even numerator |

## The elementary routines

Each elementary function is computed by a kernel routine of one shape
([The kernel](numbers.md#the-kernel)): it reduces its argument, runs a
series in integer arithmetic with an error bound, and hands the result
back as a ball. [Built-in functions](../docs/builtins.md) in the user
docs says what each function computes.

One kernel module per family stands beside `fixed.ts`, named
`fixed-*.ts`. The kernel modules lie below `ball.ts` in the order of
imports, so that `powRationalBall` can reach the routines for `exp` and
`ln`.

A routine's cost is counted in full multiplications, the products of two
integers of the working bits. Two ways of summing a series keep that
count low:

- **Rectangular splitting** computes the powers of the series' variable
  once for a block of about `sqrt(N)` terms, and combines the blocks by
  Horner's rule. A series of `N` terms then takes about `2 sqrt(N)` full
  multiplications. The series of every routine but the exponential's
  are summed this way.
- **Binary splitting** sums a series of rational terms as one fraction,
  by halving the range of the terms. The memoized constants are summed
  this way.

As a rough, illustrative figure, a routine with a series costs on the
order of ten milliseconds at the default ceiling of 4,040 digits, and a
root costs an order less. `bench/kernel.bench.ts` reports each.

### The exponential

`expFixed` (`fixed-exp.ts`) works in three steps:

1. It halves the argument until it is below `2^-8`. The halvings are
   taken over the argument's whole interval, so a wide argument gives a
   ball that covers its range.
2. It sums the Taylor series in fixed point, with the argument's error
   included from the start. The sum stops at the first term whose whole
   interval lies within an ulp. The tail after that term is below a
   255th of an ulp, and one ulp covers it.
3. It squares the sum back, once for each halving. Each squaring doubles
   the relative error and adds one ulp. So the routine works at the bits
   asked for plus the number of squarings plus a few guard bits, and it
   renormalizes into a `Floating` after each squaring
   ([Large and small results](numbers.md#large-and-small-results)).

Its precondition is an argument below `2^62`, which the exponent bound
ensures.

The series is summed term by term, the one series here that is not
summed by rectangular splitting. That costs most at the **hard bound**,
the most the significand limit can be set to.
[The hangs](cost.md#the-hangs) lists the expressions that the cost
measurements could not finish there, and names this sum among the
causes.

`e` is `eSeries` in `constants.ts`: the series `Σ 1/n!` by binary
splitting, with the tail after `N` terms below `2 / (N + 1)!`.

### The hyperbolic sine, cosine and tangent

`sinhCoshFixed` computes `sinh` and `cosh` as a pair, by one of two
routes:

- An argument below one throughout its interval takes the two series in
  `x^2` over the factorials (`factorialSeries`). These are the sine's
  and the cosine's series without the alternating sign. So `sinh` of a
  small argument never forms `(e^x - e^-x) / 2`, whose difference would
  cancel.
- Any other argument goes through `expFixed` on its magnitude, where the
  difference loses at most a bit. Once the binary exponent of `e^|x|`
  passes half the working bits, the reciprocal `e^-|x|` lies below an
  ulp of `e^|x|`. The routine then adds the reciprocal to the error and
  does not compute it.

`tanhFixed` divides the two before either is cut to its bits.

### The logarithm

`lnFixed` (`fixed-log.ts`) works in four steps:

1. It writes the argument as `m × 2^k`, with `m` at or above one and
   below two, and takes `ln 2` from its memo for the power of two.
2. It brings `m` within `2^-8` of one by eight square roots.
3. It takes the logarithm of that root as `2 atanh(z)`, with
   `z = (r - 1) / (r + 1)` for the root `r`. The series in `z^2` is
   summed by rectangular splitting, each power divided by its odd
   number.
4. It scales the logarithm back for the eight roots, adds the multiple
   of `ln 2`, and keeps the bits that the result's magnitude calls for.

A caller whose value is far from one scales it to order one and passes
the power of two as `scale`, so that `ln(1e-300)` loses nothing to the
conversion.

The constants and the other logarithms are built on the same pieces:

- `ln 2` is `2 atanh(1/3)`, and `ln 10` is `3 ln 2 + 2 atanh(1/9)`. Each
  `atanh(1/q)` is summed by binary splitting, within two ulps, and
  memoized ([Memoized constants](numbers.md#memoized-constants)).
- `log10` and `log2` divide by the memoized constants.
- `log(b, x)` is the quotient of two `ln`. `divideFixed` cuts the
  quotient to the bits its magnitude calls for.

### The sine and the cosine

`sinCosFixed` (`fixed-trig.ts`) computes the sine and the cosine
together, since they share the reduction and the powers of the series.

- **The reduction** takes `n = round(2x / pi)` on the integers. It takes
  `pi` at the bits asked for plus the bit length of the argument's
  integer part. So the three ulps of error in `pi`, times `n / 2`, stay
  under one ulp of the result. The quadrant comes from `n`.
- **The two series**, in `v = -r^2` for the reduced argument `r`, share
  their powers and are summed by rectangular splitting. Each block is
  scaled through its largest product of consecutive integers, so that a
  block costs one division where a division per term would cost many.

With those extra bits of `pi`, the margin of the memo of `pi` serves
every argument below `2^256` at the ceiling pass. A larger argument
computes `pi` for the call
([Memoized constants](numbers.md#memoized-constants)).

`tan` is the quotient, formed in `builtins/trig.ts` and cut to the bits
its magnitude calls for. When the cosine's ball contains zero, `tan` is
`unresolved` at a pole. The three share one dimension rule
(`angleToNumber` in `builtin.ts`).

### The arctangent and the inverse trigonometric functions

`atanFixed` works in four steps:

1. It inverts an argument above one, against `pi/2` from the memo.
2. It halves the angle eight times through `sqrtFixed`, with the
   argument's error carried through.
3. It sums the same series as the logarithm, in `-z^2`
   (`oddReciprocalSeries`).
4. It scales the result back for the eight halvings.

Every inverse in `builtins/inverse-trig.ts` is an arctangent:

- `asin(x)` is `2 atan(x / (1 + sqrt(1 - x^2)))`.
- `acos(x)` is `2 atan(sqrt(1 - x^2) / (1 + x))` for an `x` at or above
  zero, and `pi - 2 atan(sqrt(1 - x^2) / (1 - x))` below zero.

Neither form divides by a value near zero, so `acos(1 - 1e-30)`
certifies its digits on the first pass. `1 - x^2` is formed on the ball,
exactly for an exact `x`, and rooted by `rootBall`. The domain is read
from the argument's position against `1` and `-1`, before the square is
formed (`complementRoot`). So an argument far outside the domain gives
the `domain` error without a square.

`atan2` is an arctangent by quadrant:

- For an `x` positive throughout, it is `atan(y / x)`.
- For an `x` negative throughout, it is that value plus or minus `pi`,
  by the sign of `y`.
- For an `x` that straddles zero and a `y` of definite sign, it is
  `pi/2` or `-pi/2`, less `atan(x / y)`.
- For a `y` that straddles zero and an `x` not positive throughout, it
  is `unresolved` at zero, for `y`. The result jumps by `2 pi` there.

[Huge and tiny arguments](#huge-and-tiny-arguments) has the cases in
which a ratio is too large or too small to form. The inverses' dimension
rules are `numberToAngle` and `conformingToAngle`.

### The hyperbolic inverses

The inverses in `builtins/hyperbolic.ts` are logarithms of a root:

- `asinh(x)` is `ln(x + sqrt(x^2 + 1))`. It is computed in the kernel
  from start to end, at the working bits plus the negative binary
  exponent of `x`. A negative `x` is negated by symmetry.
- `acosh(x)` is `ln(x + sqrt(x^2 - 1))`, with `x^2 - 1` formed on the
  ball and rooted by `rootBall`.
- `atanh(x)` is `ln((1 + x) / (1 - x)) / 2`, with the quotient formed on
  the ball.

The logarithm's argument is converted at the bits that keep its small
part. So `asinh(1e-50)`, `atanh(1e-50)` and `acosh(1 + 1e-30)` certify
on the first pass.

### `sqrt`, `cbrt` and `pi()`

`sqrt` and `cbrt` (`builtins/roots.ts`) are `rootBall` under a name,
with the same exact cases as `^(1/2)` and `^(1/3)`
([Roots and powers](numbers.md#roots-and-powers)).

`pi()` (`builtins/pi.ts`) hands the memoized value back as a ball at the
precision of the context. Some units of the definitions file call it,
the angle units and `parsec` among them. Their quantities carry its
radius, so a conversion through one of them is inexact, as `turn` into
`deg` is.

`builtin.ts` holds the helpers that the modules share: `sideOfZero`,
`unboundedOf`, `hullOfEnds` and the dimension rules, named above, with
`checkPositive`, the domain rule for an argument that must be positive,
and `fromBallError`, which turns the error of a ball operation into a
built-in's error.

### The expression that the probe measures

The probe measures how fast the device computes, to propose a precision
limit ([The probe](settings.md#the-probe)). The expression it runs is
`sin(atan(exp(1)) + ln(3) radian)`: the four elementary functions `exp`,
`atan`, `sin` and `ln`, each once. The hyperbolic functions and the
other inverses are compositions of those four. The probe evaluates the
expression at the ceiling it is testing, against a table of the one
primitive that the angle needs.

One cost outside the kernel shows in that expression. Its sum adds two
settled midpoints, which is exact arithmetic on operands of the
ceiling's size, and a sum of fractions takes a gcd. Euclid's algorithm
on such operands would dominate the cost of a sum. So that gcd, which is
not the built-in `gcd`, strips the common power of two first and runs
Lehmer's algorithm on the odd parts.

## The exact functions

[Magnitude, sign and rounding](../docs/builtins.md#magnitude-sign-and-rounding),
[Division](../docs/builtins.md#division) and
[Integer functions](../docs/builtins.md#integer-functions) in the user
docs state what these functions compute. Thirteen functions are exact on
exact arguments, whatever the working precision. On an inexact argument
they fall into three groups:

- `sign`, `floor`, `ceil`, `trunc`, `round` and `div` are exact where
  the argument's interval decides the answer, and `unresolved` where it
  does not.
- `abs` and `mod` carry the radius through, as the arithmetic does.
  `mod` is also `unresolved` wherever `div` is.
- `gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial` take
  integers known exactly, and they report a `domain` error.

Four of the thirteen take quantities. `abs` and `mod` return their
argument's dimension, and `sign` and `div` return a plain number. The
other nine take plain numbers ([Dimension rules](#dimension-rules)).

### The definitions of the thirteen functions

The definitions are those of the user docs, with the corner cases that
the modules fix:

- `abs(x)` is the absolute value, and `sign(x)` is `-1`, `0` or `1`.
- `floor(x)` is the largest integer at or below `x`, `ceil(x)` is the
  smallest integer at or above it, and `trunc(x)` is the integer part,
  toward zero.
- `round(x)` rounds to an integer. `round(x, places)` rounds to `places`
  decimal places, that is, to a multiple of `10^-places`.
  `round(x, 0)` is `round(x)`, and a negative count rounds to the left
  of the point.
- `div(a, b)` is `floor(a / b)`, and `mod(a, b)` is `a - b × div(a, b)`.
  A divisor of zero is a division by zero.
- `gcd(a, b)` and `lcm(a, b)` take integers and are never negative.
  `gcd(a, 0)` is the absolute value of `a`, `gcd(0, 0)` is `0`, and
  `lcm(a, 0)` is `0`.
- `factorial(n)` takes an integer `n >= 0`.
- `doublefactorial(n)` takes an integer `n >= -1`. Both
  `doublefactorial(-1)` and `doublefactorial(0)` are `1`.
- `binomial(n, k)` takes an integer `n >= 0` and any integer `k`. It is
  zero for a `k` outside the range from `0` to `n`.

| You type              | Exucal shows | Note                      |
| --------------------- | ------------ | ------------------------- |
| `trunc(-3.5)`         | `= -3`       | toward zero               |
| `round(3.14159, 2)`   | `= 3.14`     |                           |
| `round(1234, -2)`     | `= 1200`     | to the left of the point  |
| `gcd(-6, 4)`          | `= 2`        | never negative            |
| `gcd(-9, 0)`          | `= 9`        | the absolute value of `a` |
| `lcm(-6, 4)`          | `= 12`       |                           |
| `doublefactorial(-1)` | `= 1`        |                           |
| `binomial(5, 7)`      | `= 0`        | `k` outside `0` to `n`    |

The sign of `gcd` and `lcm` is a normalization, the same choice as the
positive denominator of a fraction. Euclid's identity,
`gcd(a, b) = gcd(b, a - q b)`, holds for any quotient `q`, however a
division defines it, and the implementation takes absolute values
first.

### `round` and the rounding mode

`round` rounds in the rounding mode of the context, which is the
panel's rounding setting
([Rounding modes and where they act](../docs/numbers.md#rounding-modes-and-where-they-act)).
`round(2.5)` is `2` under the default mode, half to even, and `3` under
half away from zero. In exact mode the rounding mode otherwise governs
only the display, and a call of `round` is the user asking for it inside an
expression.

`round` has no mode argument. The grammar has no strings, a bare name is
a unit, and one of the modes' names, `floor`, is a function.

`places` must be an exact integer. Two refusals and one shortcut follow
from the size limits:

- A `places` that cannot be formed within the significand limit is
  `tooLarge`, as in `round(2.5, 1e20000)`.
- A result whose count of units has more digits than the limit holds is
  `tooLarge` too. `round(1/3, 20000)` is refused, where
  `round(1/3, 19000)` is a value of nineteen thousand digits.
- A value below a tenth of the unit forms no power of ten. So
  `round(1e-999999999, 2)` is `0`, or one unit away from zero under a
  directed mode that rounds that way.

### Floored division

`div` and `mod` are floored division and its remainder, **F-division**
in the terms of Raymond T. Boute ("The Euclidean definition of the
functions div and mod", ACM Transactions on Programming Languages and
Systems 14(2), 1992, pages 127 to 144). Three properties hold:

- `a = b × div(a, b) + mod(a, b)`, exactly.
- `|mod(a, b)| < |b|`.
- The remainder is zero or has the divisor's sign.

A pair of `div` and `mod` that satisfies the first property is
**concordant**, which is Boute's requirement of any such pair. The two
are one definition here, so they are concordant by construction. Both
are defined on exact rationals and on quantities of one dimension.

| You type                | Into  | Exucal shows | Note                    |
| ----------------------- | ----- | ------------ | ----------------------- |
| `div(-7, 2)`            |       | `= -4`       | floored                 |
| `mod(-7, 2)`            |       | `= 1`        | the divisor's sign      |
| `mod(7, -2)`            |       | `= -1`       | the divisor's sign      |
| `mod(7.5, 2)`           |       | `= 1.5`      | a rational              |
| `mod(-30 deg, 360 deg)` | `deg` | `≈ 330 deg`  | two angles              |
| `div(7 ft, 2 ft)`       |       | `= 3`        | a count, a plain number |

Boute sets three definitions side by side:

- the truncated pair, whose remainder has the dividend's sign;
- the floored pair, whose remainder has the divisor's sign;
- the Euclidean pair, whose remainder is never negative.

His case is that each is consistent only as a pair, and that the
Euclidean pair has the cleanest theory. The floored pair is chosen here
for two reasons:

- `div(a, b) = floor(a / b)` is one sentence, and it makes `div` agree
  with `floor` as well as with `mod`. The Euclidean pair lacks that
  identity: its quotient of `7` by `-2` is `-3`, where `floor(7 / -2)`
  is `-4`.
- The remainder has the divisor's sign, so a result can be read without
  the divisor at hand.

The floored and the Euclidean pairs differ only for a negative divisor,
and the Euclidean pair is one call away: `mod(a, abs(b))` and
`sign(b) div(a, abs(b))`.

### The exact functions on an inexact argument

`abs` of a ball is the absolute value of the midpoint with the same
radius. That ball contains the absolute value of every value in the
argument. For a ball that straddles zero the result reaches below zero,
as a bound, and the display shows it as zero within a bound.

`sign` of a ball of definite sign is exact. Of a ball that touches
or straddles zero it is `unresolved` at zero.

`floor`, `ceil`, `trunc` and `round` decide a ball by its position
against a cell. A **rounding boundary** is a value at which the
function's result changes, and a **cell** is the open interval between
two neighboring boundaries. For `floor`, `ceil` and `trunc` the
boundaries are the integers. For `round` they depend on `places` and on
the rounding mode, and a **tie** is the boundary of a mode that rounds
to nearest. The cell tested is the one that holds the midpoint.

- A ball inside the cell gives the exact integer, or the exact rounded
  value, of that cell.
- A ball that touches or straddles a boundary is `unresolved` at that
  boundary. The edge is the integer or the rounding boundary, held as a
  `Scaled`.
- A cell whose boundary cannot be formed leaves the ball `unresolved` at
  the result itself, an answer that claims nothing false about the
  value. This happens for an integer midpoint near the top of the
  exponent bound, and for a rounding unit `10^-places` below the bottom
  of it.

The cell is open by design, as the rule of the touch has it
([The rules every built-in follows](#the-rules-every-built-in-follows)). A ball that
ends exactly on the closed end of its cell is therefore `unresolved`,
although every value in it has one answer. The interval `[2, 2.5]` is
such a ball for `floor`.

`div` and `mod` take one division between them. The quotient
`q = a / b` is formed once, as a ball.

- `div` is the floor of `q`, decided against the floor's cell. The
  boundary is named in the terms of `a`: the quotient's boundary times
  `b`.
- `mod` is `(q - floor(q)) × b`, from the same quotient. It is the same
  value as `a - b × floor(q)`, and it is exact on exact arguments. Where
  `div` is `unresolved`, `mod` is too. The
  textbook form builds the product `b × floor(q)`, which passes the
  exponent bound where `a` and `b` lie at its opposite ends, although
  the remainder does not.
- A quotient past the top of the exponent bound makes `div` an
  `overflow` and `mod` a `tooLarge`.
- A quotient below the bottom of the bound, which the division refuses,
  has a floor all the same: zero or minus one, by the signs.
- A remainder whose alignment passes the significand limit is
  `tooLarge`, as the sum of any two exact values so far apart is. The
  reach is `fits`: the same step would succeed if it were computed
  inexactly. So the message offers the remedy that a sum's does, an
  inexact operand.

| You type                          | Exucal shows                                     | Note                                 |
| --------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `abs(-sqrt(2))`                   | `≈ 1.4142136`                                    | the radius carried through           |
| `sign(sqrt(2) - sqrt(2))`         | an error: the argument cannot be told from zero  | `unresolved`, at zero                |
| `round(sqrt(2), 3)`               | `= 1.414`                                        | exact: the ball is inside one cell   |
| `round(approx(2.5))`              | an error: the argument cannot be told from `2.5` | a tie                                |
| `floor(sqrt(2)^2)`                | an error: the argument cannot be told from `2`   | the ball straddles `2` at every pass |
| `div(8 + sqrt(2) - sqrt(2), 2)`   | an error: the argument cannot be told from `8`   | the boundary in the terms of `a`     |
| `mod(7 + sqrt(2) - sqrt(2), 2)`   | `≈ 1`                                            | the radius carried through           |
| `div(-1e-999999999, 1e999999999)` | `= -1`                                           | a quotient below the bound           |
| `mod(-1, 1e20000)`                | refused: past the significand limit              | the message suggests `approx(-1)`    |
| `mod(approx(-1), 1e20000)`        | `≈ 1e+20000`                                     | an inexact operand gives a value     |

### The errors of the integer functions

`gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial` take exact
integers. Three reasons make a `domain` error:

- `notInteger`: an exact argument that is not an integer.
- `notExact`: an inexact argument. The message says that the function
  needs an integer known exactly. A ball of midpoint `5` and radius
  `1e-30` is not known to be `5`, and no pass of the retry loop would
  make it so.
- `negative`: an argument below zero for `factorial`, below `-1` for
  `doublefactorial`, or an `n` below zero for `binomial`.

The messages for `notInteger` and `notExact` point at the function that
takes any value: `gamma(x + 1)` for `factorial`, and
`1 / ((n + 1) beta(n - k + 1, k + 1))` for `binomial`. The message for
a negative integer points nowhere, since `gamma` has a pole there and
`n + 1` is zero at `n = -1`.

| You type               | Exucal shows                                | Note                          |
| ---------------------- | ------------------------------------------- | ----------------------------- |
| `factorial(5.5)`       | an error: the argument is not an integer    | the message points at `gamma` |
| `factorial(approx(5))` | an error: the argument is not known exactly | the message points at `gamma` |
| `factorial(-1)`        | an error: the argument is negative          | no pointer                    |
| `binomial(5.5, 2)`     | an error: the argument is not an integer    | the message points at `beta`  |

### A result past the significand limit

`factorial`, `binomial` and `doublefactorial` grow past the significand
limit at arguments that take no time to type: `factorial(20000)` has
77,338 digits. A value past the limit cannot be held, so each predicts
the bits of its result before it computes. The
prediction is Stirling's formula. It takes
`log2 n!` as the sum of `(n + 1/2) log2 n`, `-n log2 e` and
`log2(2π) / 2`, which is within a bit of the truth for every `n >= 1`.

- `binomial(n, k)` is predicted from three such terms. Where `n` is past
  the range in which a double is exact, it is predicted from
  `n^k / k!`, so that `binomial(1e400, 2)` is a value.
- `n!!` is predicted from `2^k k!` for an even `n = 2k`, and from
  `n! / (2^k k!)` for an odd `n`.

A prediction past the limit is a `tooLarge` at the call, with the reach
`exceeds`, so the message offers no remedy. The two remedies that a
refused sum is offered, `approx` around an operand and decimal mode, do
not apply:

- Decimal mode does not help. The evaluator runs the built-in at an
  exact-mode context there, where it would form the exact product before
  the result is rounded.
- `approx` around the argument does not help. An inexact argument is a
  `domain` error here, and not a way to an inexact result.

`gamma(n + 1)` gives the digits asked for
([`lgamma` and `gamma`](#lgamma-and-gamma)).

For an argument past one million (`FACTORIAL_LIMIT`), or a `binomial`
whose smaller index is past it, the prediction is not evaluated. The
refusal then carries no count of bits, and the message names none.

The other exact functions need no prediction of their own. `gcd` and
`lcm` form nothing larger than the product of their arguments. `div`,
`mod` and the rounding functions form their results through the exact
arithmetic, which holds each result to the significand limit as it
holds any sum or product.

| You type                   | Exucal shows                        | Note                               |
| -------------------------- | ----------------------------------- | ---------------------------------- |
| `factorial(5000)`          | `≈ 4.2285779e+16325`                | exact, a value of 16,326 digits    |
| `factorial(20000)`         | refused: past the significand limit | predicted, with a count of bits    |
| `gamma(20001)`             | `≈ 1.8192063e+77337`                | the digits asked for               |
| `binomial(1e400, 2)`       | `≈ 5e+799`                          | exact, with more digits than shown |
| `doublefactorial(2000001)` | refused: past the significand limit | past one million: no count         |
| `round(1/3, 20000)`        | refused: past the significand limit | the exact arithmetic's own limit   |

## The Gamma and Beta families

`gamma`, `lgamma`, `digamma` and `beta`, the incomplete gamma and beta
functions, and `erf` and `erfc` reach the kernel as the elementary
functions do. [Gamma family](../docs/builtins.md#gamma-family),
[Incomplete gamma](../docs/builtins.md#incomplete-gamma),
[Error functions](../docs/builtins.md#error-functions) and
[Incomplete beta](../docs/builtins.md#incomplete-beta) in the user docs
state what they compute, their exact cases and where a call is refused.

The module handles the exact cases and the conversion, a kernel routine
works on `Fixed` values with the argument's error included, and the
result returns through `fixedToBall`. Every function here takes plain
numbers and returns a plain number. The functions build on one another:

- `digamma` and `lgamma` each **shift** a positive argument up by a
  recurrence, to a value `y` large enough for an asymptotic series. The
  two share the shift, the series' loop and the Bernoulli numbers.
- `gamma` is the exponential of `lgamma`.
- `beta` is three values of `lgamma`.
- The incomplete functions need the Gamma function for their regularized
  forms.
- `erf` is an incomplete gamma function.

### Bernoulli numbers

The asymptotic series of `lgamma` and `digamma` take the even Bernoulli
numbers through the ratios of consecutive ones, `|B_(2k+2) / B_2k|`
(`bernoulli.ts`, `bernoulli-ratios.ts`). Each term of a series is the
term before it times the ratio, an index factor and `1 / y^2`.

- The numbers are exact rationals. A **run** computes as many as a
  series asks for, about `bits / (2 log2 y)`, from the tangent numbers,
  which are integers found by one recurrence.
- The ratios are formed from one run, in fixed point, and memoized by
  their count and by the bits they serve. The run's numbers are released
  once the ratios are formed.
- A ratio holds the bits that the term it makes still needs. So the
  first ratios are held in full, and the last in a few hundred bits.

These figures give the memo's size:

- At the default ceiling the memo holds 730 to 1,430 ratios, about 0.8
  to 1 MB in all. The first are held at the ceiling's bits plus the
  margin, and the last at about two hundred bits.
- While a run is computed, its exact numbers take up to about 1.8 MB and
  the tangent numbers up to about 2.2 MB.
- At a thousand digits the memo is about 80 KB, and at forty digits it
  is under a kilobyte.

A series predicts its count of terms before it sums, from its first term
and a bound on the ratio of consecutive terms, and it reserves that many
ratios. So a pass that needs more ratios than the last pass computes one
run for all that it takes. A memo grown term by term would recompute the
run several times within one pass that starts with an empty memo. The
ratios of a larger run replace those of a smaller one, so the memo holds
one set. [#103](https://github.com/bsidhom/exucal/issues/103) tracks the
memo's footprint.

### `digamma`

For `x > 0`, `digamma` (`builtins/gamma.ts`, `fixed-gamma.ts`) shifts
its argument up and then sums an asymptotic series:

- **The shift.** The recurrence `ψ(x + 1) = ψ(x) + 1/x` shifts the
  argument up to a value of about a third of the working bits, where the
  terms of the series fall fast enough.
- **The series** is `ln y` less `1 / (2y)` less the terms
  `B_2k / (2k y^2k)`, for the shifted argument `y`. It is summed as a
  recurrence on its terms, the exact scaling first and the truncating
  steps last. Two other orders lose precision. A power of `1 / y^2` held
  on its own loses its relative precision as it shrinks. A Bernoulli
  numerator multiplied in turns an ulp of error into a bound that grows
  where the term vanishes.
- **The end of the sum** is the first term within eight ulps. For a
  positive argument the remainder is bounded by the first omitted term,
  and that bound is the truncation bound the routine adds.
- **The exact shift.** An exact argument with a short denominator, as a
  typed decimal or fraction has, is shifted exactly (`digammaRational`):
  the sum of the reciprocals as one fraction, by binary splitting, and
  then one division. It is shifted four times as far, where the series
  is half as long.

Two details keep the bound tight:

- The working bits are the result's plus a guard, whatever bits the
  argument comes at. A small argument comes at extra bits, so that its
  reciprocal, the first term of the shift, keeps its digits. That term
  alone is taken at those bits.
- The square `1 / y^2` is formed as the square of `1 / y`, and not as
  the reciprocal of `y^2`. The interval that the product rule gives
  `y^2` can reach zero where the interval of `y` does not.

For a negative `x` that is not an integer, `digamma` takes the
reflection `ψ(1 - x) - ψ(x) = π cot(π x)`, at the fractional part folded
to the half nearer zero. `floorBall` decides whether the ball lies
inside one integer's cell or reaches a pole, and a sine whose ball
reaches zero is reported as the pole.

The poles are zero and the negative integers:

- An exact pole is a `domain` error.
- A ball that touches or straddles a pole is `unresolved` at the pole,
  as an argument of `tan` is.
- A ball too wide for the series is reported the same way, as
  `unresolved` at the nearest pole below it.

`digamma` has no exact case, since no rational value of it at a rational
argument is known:
`ψ(1)` is the negated Euler–Mascheroni constant. At the two ends of the
exponent it takes an expansion, so that an argument of any exponent has
a value:

- An argument at or beyond `2^bits` gives `ln x` within `1 / x`, through
  `lnScaled`.
- A tiny argument gives `ψ(1) - 1 / x` within `2 |x|`. A tiny negative
  argument takes the expansion too, where the reflection could not form
  the fractional part.

### `lgamma` and `gamma`

`lgamma(x)` is `ln |Γ(x)|`. For `x > 0` it shifts the argument up as
`digamma` does and then sums Stirling's series:

- **The shift** uses the recurrence
  `Γ(x + n) = x (x + 1) … (x + n - 1) Γ(x)`. The product is kept as a
  significand at the working bits with a binary exponent, and it is
  normalized after each factor. So the `n` multiplications stay at the
  working bits, where the whole product has some fifty thousand bits at
  the ceiling. Its logarithm is taken once, with the exponent as the
  scale of `lnFixed`. The first factor may come at extra bits when it is
  small, and its logarithm is taken separately, at those bits.
- **The exact shift.** An exact argument of short denominator takes the
  product exactly, by binary splitting, with one logarithm
  (`lgammaRational`). It is shifted four times as far.
- **Stirling's series**, at the shifted argument `y`, is the sum of
  `(y - 1/2) ln y`, `-y`, `ln(2π) / 2` and the terms
  `B_2k / (2k (2k - 1) y^(2k - 1))`. It
  shares the loop of the series with `digamma`, one routine over the
  index factors of the term ratio. Its remainder for a positive argument
  is again bounded by the first omitted term. `ln π` is memoized at the
  ceiling, as the constants are.

For a negative `x` that is not an integer, the reflection
`Γ(x) Γ(1 - x) = π / sin(π x)` gives `lgamma(x)` as
`ln π - ln |sin(π x)| - lgamma(1 - x)`. `lgamma(1)` and `lgamma(2)` are
exactly `0`. A tiny argument of either sign takes the expansion at zero,
`-ln |x|` within `|x|`.

`gamma(x)` is `exp(lgamma(x))`, with the sign from the reflection: the
parity of the floor, on the negative side. Three points are its own:

- **The bits.** The logarithm is taken at the working bits plus the bits
  of its own magnitude. The logarithm's absolute error is the result's
  relative error, and so it stays below the working ulp. The extra bits
  are capped at 64, since past `2^64` the result passes the exponent
  bound whatever the bits.
- **An exact integer.** An exact integer `x >= 1` whose factorial fits
  the significand limit gives the exact `factorial(x - 1)`
  (`factorialOf`), so that `gamma` and `factorial` agree on what fits.
  An exact integer whose factorial does not fit gives the kernel's
  value. That value is the remedy for a factorial past the significand
  limit, which the refusal itself does not name.
- **The exponent bound.** The result passes the bound for an `x` of the
  order of `10^16`: `lgamma(x)` is about `x ln x`, which reaches
  `10^18 ln 10` near `x = 6 × 10^16`. `gamma` takes the classifier on
  the ball of `lgamma` as its guard. A large negative argument that is
  not an integer is an `underflow`.

The radius is carried through the shift and the series. So no rule from
the derivative, `Γ(x) ψ(x)`, is written, and `gamma` does not depend on
`digamma`. The two share the machinery of the shift and the series, and
neither takes the other's value.

The `gamma` of a wide ball is sound but loose. The product of the shift
and Stirling's part carry the radius at their own slopes, which cancel
in the true function and not in the interval. For a ball of midpoint
`-2.5` and radius `0.1` the result is about six times the true width. A
narrower ball shows its digits, and the retry loop narrows the ball of
an `approx`.

At the ceiling, a call on an inexact argument costs several times a call
on the same argument typed exactly with a short denominator, and the
loop of the shift is most of it. As a rough, illustrative figure, the
factor is between two and seven in timings of `gamma`, `lgamma` and
`digamma` at `1/3`. Far below the ceiling the series is cheap.

[The costliest expressions](cost.md) catalogues the costliest cases
found, and its exact and inexact cases of this family overlap in cost,
since an exact argument of long denominator takes the loop too.
[What the costs come from](cost.md#what-the-costs-come-from) names the
shift of a wide argument among the causes.

| You type                | Exucal shows                                      | Note                                           |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `digamma(1)`            | `≈ -0.57721566`                                   | no exact case                                  |
| `digamma(approx(-2))`   | an error: the argument cannot be told from a pole | `unresolved`, at a pole                        |
| `digamma(1e-999999999)` | `≈ -1e+999999999`                                 | the expansion at zero                          |
| `lgamma(2)`             | `= 0`                                             | an exact case                                  |
| `gamma(5)`              | `= 24`                                            | the exact `factorial(4)`                       |
| `gamma(20001)`          | `≈ 1.8192063e+77337`                              | the kernel's value: the factorial does not fit |
| `gamma(1e19)`           | refused: too large to compute                     | `overflow`                                     |
| `gamma(-1e19 - 0.5)`    | refused: too small to compute                     | `underflow`                                    |

### `beta`

`beta(a, b)` (`builtins/beta.ts`) is `Γ(a) Γ(b) / Γ(a + b)`.

The exact case is two positive integers. The value is then the
reciprocal of `(a + b - 1) binomial(a + b - 2, a - 1)`, within the
significand limit. The binomial comes from `binomialOf`, so that `beta`
and `binomial` agree on what fits, and the bits of the denominator are
checked against the limit once more for the factor `a + b - 1`.
`beta(5000, 5000)` is exact, a fraction of ten thousand bits, and
`beta(40000, 40000)` is the kernel's value.

Every other value is the exponential of
`lgamma(a) + lgamma(b) - lgamma(a + b)`, with the sign from the three
reflections, under the classifier. So large arguments pass through
`lgamma`, and no `Γ` that would not fit is ever formed.

- **The bits.** The three logarithms come from `logGamma`, which
  `gamma.ts` exports. Each is taken at the working bits plus the bits of
  the largest argument's magnitude, with no cap, since the logarithms
  cancel when an argument is large: `beta(1e15, 1.5)` comes from
  logarithms near `2^55`. An argument whose magnitude would need more
  bits than the significand limit allows is `tooLarge`.
- **The sum** `a + b` is formed exactly where it aligns within the
  limit. Otherwise it is the larger argument within the magnitude of the
  smaller, so that `beta(2.5, 1e-20000)` is a value. A sum at or past
  the top of the exponent bound has both arguments positive and within a
  few digits of the bound. The result then lies past the bottom of the
  bound throughout, and the call is an `underflow`.
- **The poles** of all three Gamma values are decided before any
  logarithm is taken (`reachesPole`). The retry loop would otherwise pay
  for a logarithm at every pass up to the ceiling, as for
  `beta(1, approx(-2))`. A pole of `Γ(a)` or of `Γ(b)` is a `domain`
  error. A pole of `Γ(a + b)` alone makes the value exactly zero. A pole
  that the sum reaches is blamed on the argument of the wider radius.

| You type              | Exucal shows                                      | Note                                        |
| --------------------- | ------------------------------------------------- | ------------------------------------------- |
| `beta(2, 3)`          | `≈ 0.083333333`                                   | exactly `1/12`, with more digits than shown |
| `beta(1e15, 1)`       | `= 1e-15`                                         | the exact case: no logarithm                |
| `beta(1e15, 1.5)`     | `≈ 2.8024956e-23`                                 | logarithms near `2^55`                      |
| `beta(1e6, 1e6)`      | `≈ 3.6164047e-602063`                             | through `lgamma`                            |
| `beta(1e20000, 2)`    | refused: past the significand limit               | the bits of the argument's magnitude        |
| `beta(2.5, 1e-20000)` | `≈ 1e+20000`                                      | the sum does not align                      |
| `beta(1e19, 1e19)`    | refused: too small to compute                     | `underflow`                                 |
| `beta(-0.5, -0.5)`    | `= 0`                                             | a pole of `Γ(a + b)` alone                  |
| `beta(1, approx(-2))` | an error: the argument cannot be told from a pole | decided before any logarithm                |

### The incomplete gamma functions

`lowergamma(s, x)` and `uppergamma(s, x)` are the unregularized
functions `γ(s, x)` and `Γ(s, x)`, for an order `s > 0` and an argument
`x >= 0`
(`builtins/incomplete.ts`, `fixed-incomplete.ts`). `lowergammareg` and
`uppergammareg` are the regularized `P` and `Q`.

At `x = 0` the lower function is exactly `0` and the upper function is
`Γ(s)`, so `lowergammareg(s, 0)` is `0` and `uppergammareg(s, 0)` is
`1`. An order of `1` takes the closed forms `1 - e^-x` and `e^-x`.

#### The two routes

Either function can be the one computed, and the other is then its
complement. Two routes exist, a series for the lower function and a
continued fraction for the upper, and the cheaper route is taken.

The lower function's series is
`x^s e^-x Σ x^n / (s (s + 1) … (s + n))`. Its terms are positive, so
nothing cancels. Once the ratio `r = x / (s + n + 1)` is below one, the
tail after a term is bounded by that term times `r / (1 - r)`. The ratio
is taken from `|x|`, since an argument below half an ulp converts to
zero within an ulp.

The upper function's route is Legendre's continued fraction, evaluated
by the modified Lentz method:

- For an order at or below one, every element is positive. The
  convergents of even and of odd index then approach the value from the
  two sides and bracket it, and the difference of the last two is the
  truncation bound. The difference is compared every eighth step, since
  the errors of the convergents grow by an ulp or so a step while the
  difference shrinks to nothing.
- An order above one is reduced into the range above zero and up to one,
  and stepped back up by the recurrence
  `Γ(s + 1, x) = s Γ(s, x) + x^s e^-x`. The recurrence is scaled by
  `e^x x^-s`, so that every quantity is of order one. Each step is a
  multiplication and a division, with every term positive.

A plain rule would take the fraction wherever `x > s + 1`. Two estimates
of the cost refine it:

- The fraction's convergents number about `(bits ln 2)^2 / (7 x)`, a
  measured rate: 768 at forty digits for `x = 1.5`, and 443,000 at a
  thousand digits. Each costs a few times what a term of the series
  costs.
- The series' terms number about `x - s` up to the largest, plus what
  the bits need, or about `sqrt(2 s bits ln 2)` where `x` is near a
  large `s`.

The cheaper route runs, within its limits: 50,000 terms, 20,000
convergents and 20,000 steps of the reduction. One case overrides the
estimate. The upper function takes the fraction wherever the complement
of the series would lose half the working bits to cancellation, since
the pass would then not certify.

#### The exponential, the complement and the limits

The kernel gives the factor of order one. The built-in forms the rest as
one exponential in log space, `e^(s ln x - x - ln s + ln Σ)` for the
series and the like for the fraction, with the classifier on the whole
exponent. So a value past the exponent bound is refused as a value of
`exp` is. The logarithm is formed at the working bits plus the bits of
the magnitudes of `s` and `x`, since the exponent
`s ln x - x - ln Γ(s + 1)` cancels. Past the significand limit that
count of bits is `tooLarge`.

The regularized forms carry `ln Γ(s)` in the exponent, through
`logGamma`, and do not divide by `gamma(s)`. The lower form carries
`ln Γ(s + 1)`.

The complement is taken from whichever function is computed. It is
taken on the working grid, and not at the pass's precision, so that the
digits below one are kept: `uppergammareg(1e6, 1.01e6)` is about
`1.06e-23`. Where the function computed passes the bottom of the
exponent bound, its complement is `Γ(s)`, or one, within `10^-(10^18)`.

Where neither route runs within its limits, the call is refused as past
the significand limit: a `tooLarge` with the reach `exceeds` and no
count of bits
([Rules every built-in follows](../docs/builtins.md#rules-every-built-in-follows)
in the user docs states the rule). A large order with the argument at or
past it is such a call. The refusal is never wrong about the value, as
digits that nothing certifies would be.
[What the costs come from](cost.md#what-the-costs-come-from) names this
regime among the causes.

An argument whose radius is above `2^-16` of its magnitude is taken at
its two ends, and the results are hulled, since each function is
monotone in `x`. The fraction's denominators reach zero over such a
width. An argument whose own two ends cannot be formed within the
significand limit makes the call `tooLarge`, with the reach `exceeds`.

The convergents of the fraction grow with the square of the working
bits, and the terms of the series grow with the bits. So a call far
below the ceiling is cheap, and the cost lies at the ceiling, where each
term of the series also costs a division at full precision
([What the costs come from](cost.md#what-the-costs-come-from)).

| You type                     | Exucal shows                        | Note                            |
| ---------------------------- | ----------------------------------- | ------------------------------- |
| `uppergamma(2, 0)`           | `= 1`                               | `Γ(2)`, at `x = 0`              |
| `lowergamma(1, 2)`           | `≈ 0.86466472`                      | the closed form `1 - e^-x`      |
| `uppergammareg(1e6, 1.01e6)` | `≈ 1.0606997e-23`                   | the digits below one are kept   |
| `uppergammareg(1e6, 1.5e6)`  | refused: past the significand limit | neither route within its limits |
| `lowergammareg(1e8, 1e8)`    | refused: past the significand limit | neither route within its limits |

### `erf` and `erfc`

`erf` and `erfc` (`builtins/erf.ts`) are the incomplete gamma functions
of order one half at `x^2`, through `incompleteGammaBall`. That routine
chooses its route by cost, and it takes the complement where the other
function is the one computed. So nothing in `erf.ts` decides where
`erf` is near one. `erfc(10)` keeps its digits because the routine
computes `Q` by the fraction there and `P` as `1 - Q`.

- `erf` is odd. `erf(0)` is the exact `0`, and `erfc(0)` is the exact
  `1`.
- The incomplete gamma routine applies the classifier to its exponent,
  whose leading term is `-x^2`. So `erfc(1.6e9)` is an `underflow`, and
  `erfc(1.5e9)` is a value with a decimal exponent near `-9.8e17`.
- An argument beyond the working bits is not squared for the routine
  ([Huge and tiny arguments](#huge-and-tiny-arguments)). `erfc` of such
  a positive argument is an `underflow`.
- A ball that touches or straddles zero is not squared either. It is
  taken at its two ends, and the results are hulled, since both
  functions are monotone.

| You type       | Exucal shows                  | Note                      |
| -------------- | ----------------------------- | ------------------------- |
| `erfc(10)`     | `≈ 2.0884876e-45`             | at the first pass         |
| `erfc(1.6e9)`  | refused: too small to compute | `underflow`               |
| `erf(1e400)`   | `≈ 1`                         | the limit, within a bound |
| `erfc(-1e400)` | `≈ 2`                         | the limit, within a bound |

### The incomplete beta function

`incbeta(a, b, x)` is `B(x; a, b)`, and `incbetareg(a, b, x)` is the
regularized `I_x(a, b)`, for `0 <= x <= 1` and positive `a` and `b`
(`builtins/incbeta.ts`, `fixed-incbeta.ts`). The parameters come first,
as the order does in the incomplete gamma functions.

#### The series, and why not the fraction

The function is computed by the series with positive terms,
`I_x(a, b) = x^a (1 - x)^b / (a B(a, b)) Σ ((a + b)_n / (a + 1)_n) x^n`
(DLMF 8.17.22). The continued fraction is ruled out. Its elements have
both signs for every `a` and `b`, so nothing brackets it as the gamma
fraction is bracketed, and this design has no truncation bound for it.

The series has a bound. The ratio of consecutive terms,
`(a + b + n) x / (a + 1 + n)`, tends to `x`. It falls with `n` for
`b >= 1`, and it rises toward `x` for a smaller `b`. So the larger of
the next ratio and `x` bounds every later ratio. With that bound as
`r`, the tail after a term is at most the term times `r / (1 - r)`.
Every result therefore carries a rigorous bound.

#### The orientation

The symmetry `I_x(a, b) = 1 - I_(1-x)(b, a)` offers two orientations,
and the built-in takes the one with fewer estimated terms. The usual
region rule, the direct orientation where `x < (a + 1) / (a + b + 2)`,
approximates that choice. The built-in does not use it, since it can
choose badly. For the parameters `1000` and `1` at `x = 0.99`, the rule
keeps the direct orientation. At forty digits the direct series takes
11,837 terms there, and the swapped one takes 89.

The complement is taken from the swapped orientation. One case
overrides the choice: where the value wanted is tiny, the complement
would lose half the working bits to cancellation, which the factor in
front of the sum estimates.

#### The exponential and the limits

The kernel gives the sum. The built-in forms the rest as one exponential
in log space, `e^(a ln x + b ln(1 - x) - ln a + ln Σ)`, less the three
`ln Γ` for the regularized form. It works at the working bits plus the
bits of the parameters' magnitudes, under the classifier. The
exponential is taken on the working grid, so that a complement keeps the
digits below one. A tiny `x` whose complement does not align within the
significand limit has its complement as one within `|x|`.

Each orientation has a limit of 50,000 terms. Past it in both, the call
is refused as past the significand limit, as an incomplete gamma
function past its limits is. Large parameters
with `x` near the median are such a call, as `incbetareg(1e6, 1e6, 0.5)`
is at a thousand display digits.

A term whose error reaches its value ends the sum, as happens for wide
parameters, whose intervals grow through the ratios. Where no tail bound
holds at that term, the call is `unresolved`, and it is retried with a
narrower ball.

A wide ball of `x` is taken at its two ends, since the function rises
with `x`. So is a ball that touches an end of the domain, `0` or `1`,
which is here no straddle of an edge.

The cost of the series grows with the size of the parameters and with
the bits. Large parameters near the median are the costly case, since
both orientations then take many terms
([What the costs come from](cost.md#what-the-costs-come-from)).

#### The exact cases

- `x = 0` gives `0`.
- `x = 1` gives `1` for the regularized function and `B(a, b)` for the
  unregularized one.
- Positive integers `a` and `b` make the regularized function a
  polynomial in `x`: the sum of
  `binomial(a + b - 1, j) x^j (1 - x)^(a + b - 1 - j)` over `j` from `a`
  to `a + b - 1`. For a rational `x = p / q` the sum is one integer over
  `q^(a + b - 1)`, with the binomial stepped exactly. The polynomial is
  formed where that power fits the significand limit and `a + b - 1` is
  at most ten thousand. The unregularized function takes its `B(a, b)`
  from `beta`.

| You type                      | Exucal shows                        | Note                                     |
| ----------------------------- | ----------------------------------- | ---------------------------------------- |
| `incbetareg(2, 3, 0.5)`       | `= 0.6875`                          | the polynomial                           |
| `incbeta(2, 3, 1)`            | `≈ 0.083333333`                     | exactly `B(2, 3)`, `1/12`                |
| `incbetareg(5001, 5000, 1/2)` | `≈ 0.49601068`                      | exact: `a + b - 1` is ten thousand       |
| `incbetareg(5002, 5000, 1/2)` | `≈ 0.49202215`                      | inexact: past ten thousand               |
| `incbetareg(2, 3, 1e-20)`     | `≈ 6e-40`                           | at the first pass                        |
| `incbetareg(1e7, 1e7, 0.5)`   | refused: past the significand limit | past the term limit in both orientations |

### What the families cost

The memo of Bernoulli ratios is filled on first use, by the first call
that takes a value of the Gamma function, directly or through another
function. These calls pay for a run, each through the dependency named:

- `gamma`, `lgamma` and `digamma` pay outside their exact cases. A huge
  or a tiny argument of `lgamma` or `digamma` takes its expansion and
  pays nothing.
- `beta` pays through `lgamma`, outside its exact cases.
- `lowergammareg` and `uppergammareg` pay through `lgamma`, outside
  their exact cases and apart from an order of `1`. `erf` and `erfc` pay
  through them.
- `incbetareg` pays through `lgamma` of its parameters, outside its
  exact cases. `incbeta` pays through `beta` where it takes `B(a, b)`:
  at `x = 1`, and where it computes the part above `x` and subtracts it.
- `lowergamma` and `uppergamma` pay through `gamma(s)` only where they
  take it: `uppergamma` at `x = 0`, and either function where it
  computes the other part and subtracts it from `gamma(s)`.

The run at the ceiling is paid once, by the first evaluation whose retry
loop reaches the ceiling. An inexact argument asks for a longer run than
an exact argument of short denominator, since its shift stops sooner
and its series is longer. As rough, illustrative figures at the default
ceiling, the run takes a fraction of a second for an exact shift and a
second or two for an inexact argument's.

[The costliest expressions](cost.md) catalogues what these families cost
at raised ceilings, and [The hangs](cost.md#the-hangs) lists the cases
that run past the catalogue's deadline at the highest precision limits.

[#112](https://github.com/bsidhom/exucal/issues/112) tracks an audit of
every numeric routine and its bound against the literature, with
citations.

### The functions that are not built-ins

These functions are not built-ins today, and
[Extensions that fit](future.md#extensions-that-fit) has them under
"More special functions":

- `zeta`, `lambertw`, `ellipk`, `ellipe`, `legendre`, `chebyshev` and
  the Bessel functions `J` and `I`
  ([#115](https://github.com/bsidhom/exucal/issues/115) has their
  context);
- the general hypergeometric functions;
- the Bessel functions `Y` and `K`, and any Bessel function at a large
  argument;
- the polygamma functions beyond `digamma`;
- `gamma` of a complex argument;
- the statistical distributions.

[Not provided, and what to write instead](../docs/builtins.md#not-provided-and-what-to-write-instead)
in the user docs says which of these an expression over the built-ins
stands in for.

## Not in this design

Two designs are excluded on purpose:

- **A mode argument to `round`.** The grammar has no strings, and a bare
  name is a unit
  ([`round` and the rounding mode](#round-and-the-rounding-mode)).
- **A `factorial` or a `binomial` of a value that is not an integer.**
  `gamma` and `beta` give those values, and the errors of the integer
  functions point at them
  ([The errors of the integer functions](#the-errors-of-the-integer-functions)).

These two are facts about today:

- **Truncated and Euclidean division have no built-ins of their own.**
  [Floored division](#floored-division) gives the Euclidean pair as an
  expression, and the truncated quotient is `trunc(a / b)`.
- **No built-in takes or gives a complex value.** No argument leaves the
  real line, since the language has no complex literal
  ([Real values only](../docs/numbers.md#real-values-only) states it for
  a user). `ln(-1)` is a `domain` error, and `sqrt(-1)` is a
  `negativeRadicand`, an even root of a negative value
  ([Complex numbers](future.md#complex-numbers)).
