# From unit converter to arbitrary-precision calculator: feasibility

Status: design study, no code. This document weighs a list of features
against the core as it stands and says which fit together, which have to
be toggled against one another, and which are ruled out. It stays in broad
strokes on purpose: each feature it admits gets a design of its own later,
in the manner of docs/functions.md, and nothing here is that design.

The features, in the order of their priority:

1. All elementary functions in expressions (`exp`, `log`, `sin`, ...).
2. The Gamma and Beta families of special functions, including the upper
   and lower incomplete forms.
3. Other selected special functions, whichever can be computed at
   arbitrary precision with reasonable performance.
4. A floating-point representation: a rational mantissa and a nearly
   arbitrary integer exponent.
5. A decimal representation (an integer coefficient times a power of ten)
   with configurable rounding modes.
6. User-defined functions as shorthand compositions of the above, written
   as ordinary expressions and agnostic to the precision and rounding mode
   in force.
7. Optional rational (fractional) display, toggled against the decimal
   display.

The constraints: no external dependencies, correctness first, but the app
runs on phones, so latency and memory still matter. The precision is the
user's to set, and arbitrary: nothing below assumes a fixed working
precision, and the rule the core applies today (compute to 40 digits,
truncate once, display 8) is replaced, not extended.

## Verdict in brief

| Feature                        | Verdict                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| 1. Elementary functions        | Feasible; fits the existing `call` node                         |
| 2. Gamma and Beta families     | Feasible; the incomplete forms are the hardest to make rigorous |
| 3. Other special functions     | Feasible for a named list below; a few ruled out                |
| 4. Floating point              | Feasible, but not as a third number type: it merges with 5      |
| 5. Decimal with rounding modes | Feasible; one of two modes of one number type                   |
| 6. User-defined compositions   | Feasible; exists in embryo, needs three extensions              |
| 7. Rational display            | Feasible; a display setting, given one bit of state on values   |

Everything admitted can be present in the code at once. Two pairs are
toggled at run time: the exact mode (today's rationals) against the
decimal mode (feature 5, which feature 4 turns out to be), and the
decimal display against the rational display (feature 7). The rest is
concurrent.

The features share one precision model, which is fixed first, because
every function below plugs into it the same way.

## What the core gives us

The pieces that matter here, from ARCHITECTURE.md:

- **The number type is an exact rational** over `bigint`. Exact operations
  never round. The one inexact operation, the n-th root, takes a
  `Precision` in significant digits. How it uses that precision (compute
  beyond it, truncate to it) is the rule this document replaces; that it
  takes one, and that the evaluator, the build and the pipeline thread
  one through as a parameter, is what carries over. There is no global.
- **A `Quantity` is a magnitude and a dimension**, and the dimension's
  exponents are rationals too, so roots are exact on the dimension side.
- **Functions exist**: a definition `tempC(x) [1;K] body ; inverse` is a
  pair of expressions with declared units, a call `tempC(100)` is a node
  of the tree, and the evaluator resolves the callee through a `Lookup`
  that today knows only defined functions. The build checks a function by
  evaluating its body at one of the declared argument unit.
- **Irrational constants are decimal literals**: `pi` is a 36-digit
  literal in `src/units.txt`, as in GNU units. Six definitions use it.
- **Failures are `Result` values**, never exceptions, and every module has
  its own error type.

## The precision model

Everything transcendental in this program is computed under one rule,
which is the rule MPFR gives its users and mpmath approximates:

**Every inexact operation returns the true value correctly rounded to the
working precision, in the rounding mode in force.** Correctly rounded
means the nearest representable value in that mode, not "within one unit
in the last place": given the precision, the result of the operation is
right to that many digits, with no qualification. The mechanism is the
standard one: detect the exactly representable cases first (`exp(0)`,
`sqrt(9/4)`, `log10(1000)`), compute the rest with guard digits, and
retry with more when the guard digits do not settle which way to round
(the Ziv strategy). For the elementary functions at rational arguments
the retry always terminates, because their values off the exact cases
are irrational, and in practice it is rarely taken at all. For the
special functions, where irrationality is not always known, the retry has
a cap and falls back to a faithful rounding; a case that reaches the cap
would be a discovery in number theory.

What the rule does and does not promise about a composition:

- It promises nothing about the whole expression, and the design does not
  propagate error through compositional steps. `exp(x) - 1` for small `x`
  loses digits to cancellation and gets them back only if the user raises
  the precision; `sin(pi())` is not zero but a value of the order of
  `10^-p`, since `pi()` is rounded before `sin` sees it. This is the
  arithmetic every arbitrary-precision library exposes to a user who
  asked for a precision and got it per operation, and it is what "the
  result is correct to the precision" means here: per operation, exactly.
- A user-defined function is a composition and inherits this: its body is
  evaluated under the context of the call, each operation correctly
  rounded, and the definition never mentions precision. It is agnostic by
  construction.
- Should a whole-expression guarantee ever be wanted, nothing here blocks
  it: it is either an error bound carried internally beside each value
  and used only to raise the precision and re-evaluate (never shown), or
  a re-evaluation at rising precision until the leading digits settle.
  Both are out of scope, and the second is the one to reach for, since it
  touches no type.

The precision itself:

- **One setting, in significant decimal digits**, as `Precision` already
  is. Bits are the natural unit inside the kernel, and the conversion is
  a constant factor; the user sees digits. A display shorter than the
  precision remains a display preference, not a second precision, because
  a value correct to `p` digits shown at `p` digits needs no cushion of
  extra working digits, which is what today's 40-against-8 split was for.
- **The precision has a ceiling**, for the reasons under "Fitting
  together": evaluation is synchronous on every keystroke, and a
  special function at ten thousand digits takes seconds.

Exactness, the last piece of the model, is one bit:

**Every value carries an inexact flag.** A literal, a unit and the result
of an exact operation on exact values are exact; any operation that
rounded (an inexact function; in decimal mode, any operation whose result
did not fit the precision) produces an inexact value, and any operation
with an inexact operand does too. This is the `Inexact` condition of IEEE
754 and of Python's decimal context, and it is what decides `=` against
`≈` in every display below. Today the app decides that by whether the
displayed digits are all the digits of the held value; under arbitrary
precision that test fails, since `sqrt(2)` computed to 20 digits and
shown at 20 would read as `=`. The flag says what the test cannot: not
whether the digits shown are the digits held, but whether the digits held
are the truth. And it settles the worry that a value which passed
through an irrational step might come out looking rational: it may, and
it is still inexact, because the flag remembers the step. `sqrt(2)^2` is
`≈ 2.0000000000000000000` (or a string of nines), never `= 2`, and
`sqrt(4)` is `= 2`, because the exact case was detected and nothing
rounded. The flag is conservative by design: it never claims exactness
falsely, and it will say `≈` where a rounded constant happened to cancel
(`turn` into `deg` is exactly `360`, but both are defined through a
rounded `pi()`, so the flag says `≈ 360`). That is the one visible cost
of `pi()` being a runtime function rather than a literal, and it is
accepted: a conservative `≈` is honest, a false `=` is not.

## The features, one by one

### 1. Elementary functions: feasible

`exp`, `ln`, `log10`, `log2`, `log(x, b)`, `sqrt`, `cbrt`, `pow(x, y)`,
the six trigonometric functions and their inverses, `atan2`, the
hyperbolic functions and their inverses, and the constants as functions,
`pi()` and `exp(1)`. All are computable to any number of significant
digits from a handful of series with argument reduction: `exp` by halving
and squaring, `ln` by Newton on `exp` or by the `atanh` series after
reduction by powers of two, `sin` and `cos` by reducing the argument
modulo `pi/2`, `atan` by half-angle reduction. At 40 digits each is a few
dozen multiplications of 130-bit integers, well under a millisecond on a
phone; at 1000 digits, milliseconds. None needs a table, a polynomial fit
or a library.

What they need from the core, in broad strokes:

- **A built-in kind of function.** `Lookup.function` today returns a
  `UnitFunction`, two expression bodies. A built-in is code, not an
  expression, so the resolved function becomes a union: a defined
  function with its bodies, or a built-in with an arity, a rule for the
  dimensions of its arguments and result, and a native implementation
  from magnitudes and a context to a magnitude with its inexact flag. The
  `call` case of the evaluator switches on it. Built-ins live in the
  function namespace, so a user definition of the same name is the
  duplicate the build already rejects. The unit names that would collide
  are `e` (the elementary charge) and `W` (the watt), so Euler's number
  is `exp(1)`, as in GNU units, and Lambert's function gets a longer
  name.
- **Calls with any number of arguments.** The grammar reads `name(expr)`;
  it needs `name()` and `name(expr, expr, ...)`. The comma is unused, so
  this is a local change to the `call` rule and node, and user-defined
  functions can take several parameters with it (feature 6).
- **`pi()` as a function that produces digits at the precision asked.**
  Not a constant and not a literal: a call of no arguments, so that a
  definition body reads `pi() radian / 180` and gets the precision the
  table is built at. Its digits come from a hard-coded prefix up to a
  limit chosen against the asset size (ten thousand digits is ten
  kilobytes of text, about four and a half compressed, which covers
  every precision a user will set in practice) and from computation
  beyond it: a Machin-type formula is enough to some thousands of digits,
  and Chudnovsky's series with binary splitting, which is what QuickJS's
  libbf uses, beyond that. Spigot algorithms produce digits one at a time
  but cost quadratic time and bring nothing here over a stored prefix.
  Whatever is computed is cached for the session at the largest precision
  reached, and shorter requests round from it. Since `deg`, `turn` and
  `grad` call `pi()`, the table's quantities depend on the working
  precision, so the table is built at the working precision and rebuilt
  when the setting changes (a few milliseconds). The definitions file
  loses the literal and its six uses become calls.
- **Dimension rules.** The argument of `exp`, `ln` or `asin` must be a
  plain number, and `exp(1 m)` is an error that names the dimension.
  Trigonometric functions must also accept an angle, which in this table
  carries the `radian` kind (`30 deg` is `pi() radian / 6`), so their
  rule is "dimensionless, or the radian kind treated as 1". Whether
  `asin` returns a plain number or an angle in radians is a choice for
  the design: the second makes `asin(0.5)` convert to `deg` and is
  consistent with the kind system, at the price that `2 asin(0.5) + 1`
  is a kind mismatch. Either fits.
- **Domain errors.** `ln(0)`, `ln(-1)`, `asin(2)`, `acosh(0.5)` are a new
  evaluator error, located at the call, beside `divisionByZero` and
  `negativeRadicand`. All functions are real-valued; there is no complex
  result (see "Ruled out").
- **Exact cases.** As `root` returns `sqrt(9/4)` exactly today, a
  built-in returns an exact rational wherever the value is rational and
  cheaply recognized: `exp(0)`, `ln(1)`, `sin(0)`, `cos(0)`,
  `log10(1000)`, `log(8, 2)`, `pow(x, p/q)` through the existing
  `powRational`. What it cannot do is recognize `ln(8) / ln(2)` as `3`:
  two roundings and a division give a value within a unit in the last
  place of `3`, flagged inexact and shown `≈ 3`.
- **A fixed-point kernel under `rational.ts`.** The series must not run
  in exact rational arithmetic, whose denominators would grow with every
  term. They run on scaled `bigint`s at the working precision plus guard
  digits, in binary, where shifting is free, and hand back a value
  rounded to the decimal precision in the mode in force; the Ziv retry
  lives here, once, for every function. `root` moves onto the same
  kernel and gives up its private truncation.

The payoff beyond the calculator: with `ln` and `log10` available in
definition bodies, the definitions file can at last define the neper and
the bel as functions, which README.md today says it cannot.

### 2. Gamma and Beta families: feasible, the heaviest of the list

- **`gamma(x)`** for real `x`: shift the argument up by the recurrence
  until it is large relative to the precision, then the Stirling series
  with Bernoulli numbers (exact rationals, computed once per precision)
  or Spouge's approximation, whose error bound is explicit in the number
  of terms. Negative arguments by the reflection formula through `sin`;
  the poles at the non-positive integers are domain errors. Positive
  integers are exact factorials. At 40 digits this is a few dozen
  evaluations of `exp` and `sqrt`; at 1000 digits it approaches a
  second, which is one reason the precision has a ceiling and the
  evaluation may have to leave the main thread (see "Fitting together").
- **`lgamma(x)`** beside it, because `gamma(20000)` has 77,000 digits and
  cannot be a value under `MAX_BITS` in exact mode; in decimal mode it
  can (see feature 4), and `lgamma` is what statistics wants anyway.
- **`beta(a, b)`** as three gammas, or through `lgamma` for large
  arguments, with the exact rational case for integer arguments.
- **The incomplete gamma functions**, lower and upper, and their
  regularized forms `P(s, x)` and `Q(s, x)`: the lower by its power
  series, whose terms are all positive (no cancellation, but the count
  of terms grows with `x`), the upper by a continued fraction where `x`
  is large relative to `s`, since `Γ(s) - γ(s, x)` cancels catastrophically
  there. Choosing the region and bounding the truncation of the continued
  fraction is where the rigor is; mpmath does exactly this, and its
  choices are documented. These bounds are what let the kernel round
  correctly rather than merely closely.
- **The incomplete beta function** and its regularized form
  `I_x(a, b)`: one continued fraction with a symmetry that keeps it
  converging, the same shape of work as the upper incomplete gamma.

Nothing here touches the core beyond what feature 1 adds; these are more
built-ins with more delicate implementations. They also make `erf` and
`erfc` free (`erf(x) = P(1/2, x^2)`), and they turn the common
statistical distributions into one-line user-defined functions
(feature 6): the normal, chi-squared, Student's t and F cumulative
distributions are `erfc`, `P` and `I_x` at the right arguments, so they
need not be built-ins.

### 3. Other special functions: a list is feasible, a list is not

Feasible at arbitrary precision with simple, bounded algorithms, roughly
in order of value:

- **Exact functions** that need no precision at all: `abs`, `sign`,
  `floor`, `ceil`, `trunc`, `round(x, digits)`, `mod`, `gcd`, `lcm`,
  `factorial`, `binomial`, `doublefactorial`. Cheap, and they make the
  exact mode a calculator in its own right. `round` is where a rounding
  mode surfaces as a function argument, and the design of feature 5
  should name the modes once for both uses.
- **`erf`, `erfc`**: free with feature 2.
- **`digamma`** (and the polygamma functions): the same recurrence and
  asymptotic series as `gamma`.
- **`zeta(s)`** for real `s > 1`: the Borwein algorithm, an alternating
  series acceleration with an explicit error bound, a few hundred terms
  at 40 digits.
- **Lambert W** (as `lambertw`): Halley's iteration on `exp`, a handful
  of steps.
- **The complete elliptic integrals** `K(k)` and `E(k)`: the arithmetic
  geometric mean, which converges quadratically and is a dozen lines.
- **Bessel `J` and `I`** of real order by their series: feasible, but
  the series alternate and cancel for large arguments, so they need
  guard digits proportional to the argument and belong after the rest.
- **Orthogonal polynomials** (`legendre(n, x)`, `chebyshev(n, x)`) for
  integer `n`: exact rationals at a rational `x`, and cheap.

Ruled out, at least as built-ins:

- **The general hypergeometric functions** (`2F1` and beyond): every
  region of the argument plane needs its own transformation, and the
  conditions are the bulk of a library, not a function.
- **Bessel `Y` and `K`**, and any Bessel function at large argument:
  they need the asymptotic expansions and the logarithmic limits for
  integer order; too much machinery for the use they would get here.
- **Anything with a complex value or argument**: `ln(-1)`, `sqrt(-1)`,
  `gamma` off the real line. The number type is real and stays real.
- **Statistical distributions as built-ins**: they are compositions of
  feature 2, and feature 6 is the right home for them.

### 4 and 5. Floating point and decimal: one feature, not two

Feature 4 pictures a rational mantissa with a nearly arbitrary integer
exponent, `m × 10^e` with `m` a `Rational`. Consider what the mantissa
can be:

- **Unbounded.** Then the type is today's rational with a power of ten
  kept aside, exact in every operation. Multiplication, division and
  powers are exact and cheap however large `e` is. Addition must align
  the exponents, which for `1e999999999 + 1` means a number of a billion
  digits, so it must either fail (as `tooLarge` does today) or round. As
  long as it fails, this is an exact rational with a wider range for
  products and powers, and nothing more.
- **Bounded.** Then every operation must bring the mantissa back within
  its bound, which is rounding. But rationals of bounded denominator are
  not closed under addition (`1/3 + 1/7 = 10/21`), so rounding a rational
  mantissa to a "nearby rational of bounded size" means a continued
  fraction or Stern–Brocot step, a rounding no user of a calculator
  expects and no rounding mode describes. The mantissa that rounding
  modes are defined for is an integer of at most `p` decimal digits.

So a float with a bounded mantissa is a decimal float: an integer
coefficient, a power-of-ten exponent, a precision and a rounding mode.
That is feature 5 exactly, and it is the arithmetic of the General
Decimal Arithmetic specification that IEEE 754-2008 and Python's
`decimal` module implement, well specified and implementable on
`bigint` without a dependency. Feature 4 is therefore feasible precisely
by being feature 5, and its one distinct contribution is the exponent.

Which leaves the question of how the decimal mode relates to the exact
one. The user's own suggestion is right: the decimal is a special case
of the rational with different invariants. Concretely, one number type
`num / den × 10^e` in lowest terms, with two modes:

- **Exact mode**: `den` is free, `e` is only a lazy factor that keeps
  trailing zeros out of `num` and `den`, and no exact operation rounds.
  Only the inexact functions round, to the precision, in the mode in
  force. The visible difference from today is that `1e999999999` parses
  and multiplies where it fails today, while `1e999999999 + 1` still
  fails as `tooLarge`, since aligning it is beyond `MAX_BITS`.
- **Decimal mode**: after every operation the value is rounded to the
  context's `p` significant digits with its rounding mode, so `den` is
  always `1` and `num` has at most `p` digits, and the inexact flag is
  raised whenever the rounding changed the value. `1/3 * 3` is
  `0.999...9`, inexact, and displays as `≈ 1`, which is what a user who
  chose the mode expects.

The alternative, a second number type beside `Rational` with the core
made generic over the two, doubles the numeric surface for every special
function. The alternative at the other extreme, decimal mode as a
rounding step in the evaluator over the current type with no exponent
field, is smaller still but caps values at `MAX_BITS`, about 19,700
digits, so `20000!` and `exp(100000)` fail in a mode whose point is to
represent them. The exponent field is what makes the decimal mode a
float; it is worth its cost, which is confined to `rational.ts`.

The consequences that reach beyond `rational.ts`:

- **`Precision` becomes a context**: the mode, the precision, the
  rounding mode. It goes where `precision` goes today (`evaluate`,
  `buildTable`, the pipeline) and to the two places that do arithmetic
  without it: `convert` and `roundTerms`, and the reciprocal the UI
  computes. That is a mechanical widening of a parameter that is already
  threaded, and it is the natural first step of the whole program.
- **Dimensions stay exact in both modes.** A dimension exponent is a
  rational and must remain one: `m^(1/3)` in decimal mode must not
  become `m^0.333...3`. So `^` keeps its literal exponent (a rational
  known at parse time), and the new `pow(x, y)` with an evaluated
  exponent is for dimensionless bases only, where the exponent may be
  anything. `dimension.ts` goes on using the exact operations, which the
  type keeps in both modes.
- **The table is always built exact**, at the working precision, so
  `surveyfoot` is exactly `1200/3937 m` whatever the mode, and in decimal
  mode a unit is rounded once when it is looked up, an inexact operation
  like any other. Conversions that are exact in decimals (`1 ft` in
  `in`) stay exact; those that are not are shown with `≈`, as they are
  now.
- **The rounding modes** are the standard seven (half even, half away
  from zero, half toward zero, toward zero, away from zero, ceiling,
  floor), named once. One mode is in force at a time and governs every
  rounding there is: the inexact functions in both modes, the decimal
  mode's rounding after each operation, the display rounding (today
  fixed at half away from zero), and the `round` function's default.
  There is no separate policy for any of them, and nothing truncates
  unless the mode says toward zero.
- **The exponent has a bound**, generous but finite (say `10^18`), so
  that formatting is always possible and `10^(10^30)` fails cleanly
  instead of looping.

### 6. User-defined functions: feasible, three extensions to what exists

Functions defined in the definitions file already are compositions
written as ordinary expressions, with an inverse and declared units, and
a call already evaluates the body through the evaluator with the
parameter bound. So a user function is agnostic to precision and
rounding by construction: its body runs under whatever context the call
does, each operation correctly rounded, and nothing in the definition
mentions either. What remains is:

- **Several parameters**, from the call grammar of feature 1: `f(x, y)`
  in the definition and in the call. The inverse and the function want
  stay single-parameter, since only a function of one argument can be
  the answer to "which argument gives this value".
- **An optional inverse and an optional declaration.** A composition
  such as `normcdf(x) = (1 + erf(x / sqrt(2))) / 2` has no inverse worth
  writing and takes a plain number to a plain number; requiring
  `[1;1]` and a `;` is noise. A function without an inverse is simply
  not usable as a want, and a missing declaration means plain numbers.
- **A different build-time check.** Today the build evaluates a body at
  one of the declared argument unit, so that a body which fails for
  every argument fails the build, and docs/functions.md accepts that a
  body which fails only at `1` fails too, "since no function in sight is
  like that". With elementary functions, most are: `ln(x - 1)`,
  `asin(x + 1)`, `gamma(x - 1)`, `1 / ln(x)`. The check has to become
  an evaluation over dimensions alone, which is well defined because a
  body's dimension never depends on the value of its argument: numbers
  are ignored, sums check conformance, and a call applies the callee's
  dimension rule. That is an abstract interpretation of the evaluator
  over dimensions, a small module, and it catches the same class of
  errors at load time without evaluating anything. Domain and range
  bounds on a definition (already listed in docs/functions.md as a later
  addition) become worth having at the same time, since `normcdf` has a
  meaning outside its domain but `ln` does not.

### 7. Rational display: feasible, and cheap once the flag exists

A display setting, toggled against the decimal display: a value is
written as a fraction in lowest terms, `1 m = (5000/127) in`, rather than
as `≈ 39.370079 in`. It is a setting of the display alone; nothing in
the core changes what it computes. What the display needs to know is
whether the fraction it would write is the value's truth or an artifact
of rounding, and that is the inexact flag of the precision model.

- **An exact value is written as its fraction, with `=`.** In exact mode
  most conversions are such values, and this is where the mode shines:
  `1 in = (127/50) cm`, `1 mi = (25146/15625) km`, a unit list as
  `1 m = 3 ft + (437/127) in`. An integer is written as an integer.
- **An inexact value is not written as a fraction.** After `sqrt(2)` at
  20 digits the value held is `141421356237309504880 / 10^20`, a true
  fraction of what is held and no truth about `sqrt(2)`. Writing it
  would be honest and useless. So an inexact value falls back to the
  decimal display with `≈`, whatever the setting. A later refinement is
  the simplest fraction within the precision (the continued fraction
  convergent, `355/113` for `pi()` at seven digits), written with `≈`
  and clearly as an approximant; it is a separate small design, not a
  condition of this one.
- **The fraction is parenthesized before a unit**, because the grammar
  reads `5000/127 in` as `5000 / (127 in)`, the pitfall README.md warns
  about, and every line the app writes must be typeable back as a
  `have`. A dimensionless result needs no parentheses.
- **In decimal mode** the setting still applies, and shows fewer
  fractions: a value that fit the precision without rounding
  (`1/4 = 0.25`) is exact and may be written `1/4`; one that did not is
  inexact and shows as a decimal.

Since exactness is a property of the value, not of the display, the
decimal display uses the same flag for its `=` against `≈`, and the two
displays never disagree about what is exact.

## Fitting together

The features are not seven unrelated additions. They call for the same
few cross-cutting changes, each needed by several of them, which is the
strongest sign that the result is one coherent design rather than seven
patched on:

| Change                                                                       | Needed by  |
| ---------------------------------------------------------------------------- | ---------- |
| A number context (mode, precision, rounding) in place of `Precision`         | 4, 5, all  |
| A built-in kind of function beside defined functions, with dimension rules   | 1, 2, 3, 6 |
| Calls with any number of arguments                                           | 1, 2, 3, 6 |
| Correct rounding to the precision in the kernel, with exact-case detection   | 1, 2, 3    |
| An inexact flag on every value                                               | 1 to 5, 7  |
| A fixed-point `bigint` kernel for series and fractions                       | 1, 2, 3    |
| `pi()` as a function of the precision; table built at the working precision  | 1, 4, 5    |
| The build's function check over dimensions rather than at `1`                | 1, 6       |
| Settings in the UI: mode, precision, rounding mode, display digits, fraction | 4, 5, 7    |

Two runtime concerns cut across everything:

- **The main thread.** The pipeline runs on every keystroke and today
  takes microseconds. A `gamma` at 1000 digits takes on the order of a
  second, which would freeze the input. Either the precision is capped
  where every function stays under some tens of milliseconds, or
  evaluation moves to a Web Worker. The core is pure and takes plain
  data, so a worker is a thin wrapper, not a redesign; a cap is needed
  anyway, as `MAX_BITS` is today.
- **Memory.** Exact mode's growth is already bounded by `MAX_BITS`; the
  decimal mode bounds values by construction; the kernel's intermediates
  are at most a few times the precision; the stored digits of `pi()` are
  a fixed asset. Nothing here changes the memory picture on a phone as
  long as the precision has a ceiling.

What is toggled, and what is concurrent:

- **Toggled**: exact mode against decimal mode, two invariants of one
  type, every function written once for the type; and the decimal
  display against the rational display, two renderings of one value and
  one flag.
- **Concurrent**: everything else. Elementary and special functions, the
  exact functions, and user definitions are present in both modes and
  behave in each mode as the mode says. The rounding mode is one setting
  and governs every rounding in either mode.

## Ruled out, and why

- **A float with a rational mantissa as a third number type.** Subsumed:
  unbounded, it is the exact rational; bounded, it is the decimal (see
  features 4 and 5).
- **Binary floats or a configurable radix.** Decimal literals would no
  longer parse exactly and display would need conversion; nothing a
  calculator user types is binary. Binary is the kernel's business
  alone.
- **Error bounds carried with values and reported** (Arb-style balls as
  a user-facing thing). The requirement is that each result be correct to
  the precision, which per-operation correct rounding gives without
  propagating anything; a radius beside every value would be paid for on
  every operation and shown to no one. The one bit that is wanted, exact
  or not, is kept.
- **Symbolic constants** (`pi` kept as a symbol so that `sin(pi())` is
  exactly `0`). That is a computer algebra system: simplification rules,
  a normal form for expressions in `pi`, and decisions of equality that
  are undecidable in general. `pi()` is a function that produces digits,
  and `sin(pi())` is a small inexact number, as in every numeric system.
- **Complex numbers**, as values or as results of `ln`, `sqrt` and
  `gamma` off the real line. Every function would need a second
  implementation and every conversion a meaning for a complex magnitude.
  Negative arguments outside a function's real domain are errors.
- **General hypergeometric functions, Bessel `Y` and `K`, Bessel
  functions at large argument.** See feature 3: library-sized casework
  for little use here.
- **Statistical distributions as built-ins.** They are one-line user
  functions over feature 2.
- **A whole-expression precision guarantee.** Out of scope, not refused;
  see "The precision model" for the two ways it could be added later
  without disturbing anything here.
- **An unbounded exponent.** Bounded so that every value can be
  formatted and every failure is clean.

## A sequence for the follow-ups

Each is a design of its own; this is only the order that lets each stand
on the one before it.

1. The number context in place of `Precision`, the inexact flag on
   values, and the settings UI. Small, and it fixes the meaning of `=`
   before any new function exists.
2. The kernel with correct rounding and the Ziv retry, `root` moved onto
   it, and `pi()` with its stored digits.
3. Built-in functions: the union in the lookup, calls with any number of
   arguments, dimension rules, domain errors, the table built at the
   working precision, the dimension-only build check, and the elementary
   set. The definitions file's `pi` becomes `pi()`, and the neper and the
   bel appear.
4. The exponent field and the decimal mode proper: `num / den × 10^e`,
   rounding after every operation, the rounding modes at their homes.
5. The rational display.
6. The Gamma and Beta families with `erf` and `erfc`; then the exact
   functions and the rest of the feasible list of feature 3 as wanted.
7. The user-function extensions: several parameters, optional inverse
   and declaration, domain and range. Storage and an editor for user
   definitions are the "Later" item ARCHITECTURE.md already lists.
