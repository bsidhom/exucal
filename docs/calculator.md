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

The constraints: no external dependencies, correctness first, but the app
runs on phones, so latency and memory still matter.

## Verdict in brief

| Feature                        | Verdict                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| 1. Elementary functions        | Feasible; fits the existing `call` node and precision rule      |
| 2. Gamma and Beta families     | Feasible; the incomplete forms are the hardest to make rigorous |
| 3. Other special functions     | Feasible for a named list below; a few ruled out                |
| 4. Floating point              | Feasible, but not as a third number type: it merges with 5      |
| 5. Decimal with rounding modes | Feasible; one of two modes of one number type                   |
| 6. User-defined compositions   | Feasible; exists in embryo, needs three extensions              |

Everything admitted can be present in the code at once. Only one pair is
toggled at run time: the exact mode (today's rationals) and the decimal
mode (feature 5, which feature 4 turns out to be). The rest is concurrent.

The one finding that reshapes the plan is not any single feature but the
precision model they share, which the next section explains before the
features are taken one by one.

## What the core gives us

The pieces that matter here, from ARCHITECTURE.md:

- **The number type is an exact rational** over `bigint`. Exact operations
  never round. The one inexact operation, the n-th root, computes its
  result correct to a working `Precision` of significant digits and
  truncates it once to exactly that many; the truncated value is an
  ordinary rational and everything downstream is exact again. The app
  works at 40 digits and displays 8, rounding to nearest once at display.
- **`Precision` is already threaded** through `evaluate`, `buildTable`
  and the pipeline as a parameter. There is no global.
- **A `Quantity` is a magnitude and a dimension**, and the dimension's
  exponents are rationals too, so roots are exact on the dimension side.
- **Functions exist**: a definition `tempC(x) [1;K] body ; inverse` is a
  pair of expressions with declared units, a call `tempC(100)` is a node
  of the tree, and the evaluator resolves the callee through a `Lookup`
  that today knows only defined functions. The build checks a function by
  evaluating its body at one of the declared argument unit.
- **Irrational constants are decimal literals**: `pi` is a 36-digit
  literal in `src/units.txt`, as in GNU units.
- **Failures are `Result` values**, never exceptions, and every module has
  its own error type.

## The finding: the precision rule does not survive composition

ARCHITECTURE.md argues that a working precision of 40 digits keeps the
truncation errors of inexact operations out of the 8 displayed digits,
because the exact operations that follow a truncation "combine such errors
at worst additively". That is true of absolute errors, but a subtraction
can leave a result far smaller than its operands, and then a fixed
absolute error is an unbounded relative one. The app shows this today:

```
2^(1/2) * 2^(1/2) - 2      displays as   ≈ -1.9003505e-39
(10^(1/3))^3 - 10          displays as   ≈ -4.8032395e-39
```

Both are zero. What is shown is the truncation error of one root, with
eight confident digits that mean nothing. With roots alone this is a
curiosity, because roots rarely cancel. With elementary functions it is
everyday arithmetic: `exp(x) - 1` for small `x`, `ln(1 + x)`,
`1 - cos(x)`, `sin(pi)`, or a user-defined function whose body is any of
these. And `sin(pi)` has a second problem: with `pi` a 36-digit literal,
`sin(pi)` is about `4e-36` at every working precision, since the
argument is not pi. Raising the working precision cannot fix a constant
that has 36 digits.

Feature 6 asks that user-defined compositions "handle rounding and
precision correctly" while being written without regard to either. Under
the current rule they cannot: the body `(exp(x) - 1) / x` would display
eight wrong digits for `x = 1e-30`, and no working precision the user did
not choose by hand would save it. So the precision rule has to change,
and the change is shared by features 1, 2, 3 and 6. Three ways to change
it, all compatible with every feature:

- **A. Keep the rule, expose the knob.** Leave the fixed working
  precision and let the user raise it in settings. Cheapest, and not
  correct: the display still cannot tell a cancelled zero from a small
  number, and the user has to know when to reach for the knob.
- **B. Carry an error bound with every value.** A magnitude becomes a
  midpoint and a radius (a ball, in the sense of Arb). Exact operations
  propagate the radius exactly (a sum adds radii, a product scales them),
  and every inexact function adds its own truncation error and bounds how
  it magnifies the error of its argument. A value with no inexact
  operation behind it has radius zero, so nothing changes for the
  converter as it is today. The display then shows only the digits the
  radius certifies, shows a value whose radius covers zero as `0` with
  `≈`, and writes `=` only for radius zero. Rigorous, and it makes
  feature 6 true by construction: a composition is correct because the
  digits it displays are proven, whatever its body does. The cost is a
  radius beside every magnitude and an error rule for every built-in
  function, both well understood.
- **C. Re-evaluate at rising precision until the displayed digits
  settle.** No type change; two or three evaluations per keystroke; can
  never conclude that a value is zero (each evaluation of `sin(pi)` gives
  a different tiny number), so it needs a heuristic cutoff.

The recommendation is B, with C as the fallback if the radius is judged
too heavy for the first iteration. Whichever is chosen, it is one
decision, made once, and every function below plugs into it the same
way: a built-in computes its value to the working precision and reports
its error; the evaluator does the rest. In decimal mode (below) every
rounding step adds half a unit in the last place to the radius, so the
decimal mode gets certified digits for free too.

What none of the three can give is exactness for transcendental
identities: no arithmetic on approximations will find that `sin(pi)` is
exactly `0`. That needs symbolic constants, and it is ruled out below.

## The features, one by one

### 1. Elementary functions: feasible

`exp`, `ln`, `log10`, `log2`, `log(x, b)`, `sqrt`, `cbrt`, `pow(x, y)`,
the six trigonometric functions and their inverses, `atan2`, the
hyperbolic functions and their inverses. All are computable to any
number of significant digits from a handful of series with argument
reduction: `exp` by halving and squaring, `ln` by Newton on `exp` or by
the `atanh` series after reduction by powers of two, `sin` and `cos` by
reducing the argument modulo `pi/2` against a `pi` computed to the
working precision, `atan` by half-angle reduction. At 40 digits each is
a few dozen multiplications of 130-bit integers, well under a
millisecond on a phone; at 1000 digits, milliseconds. None needs a
table, a polynomial fit or a library.

What they need from the core, in broad strokes:

- **A built-in kind of function.** `Lookup.function` today returns a
  `UnitFunction`, two expression bodies. A built-in is code, not an
  expression, so the resolved function becomes a union: a defined
  function with its bodies, or a built-in with an arity, a rule for the
  dimensions of its arguments and result, and a native implementation
  from magnitudes and a precision to a magnitude with its error. The
  `call` case of the evaluator switches on it. Built-ins live in the
  function namespace, so a user definition of the same name is the
  duplicate the build already rejects. The names that collide with
  units today are `pi`, `e` (the elementary charge) and `W` (the watt),
  so Euler's number is `exp(1)`, as in GNU units, and Lambert's function
  gets a longer name.
- **Calls with several arguments.** The grammar reads `name(expr)`; it
  needs `name(expr, expr, ...)`. The comma is unused, so this is a local
  change to the `call` rule and node, and user-defined functions can
  take several parameters with it (feature 6).
- **Dimension rules.** The argument of `exp`, `ln` or `asin` must be a
  plain number, and `exp(1 m)` is an error that names the dimension.
  Trigonometric functions must also accept an angle, which in this table
  carries the `radian` kind (`30 deg` is `pi radian / 6`), so their rule
  is "dimensionless, or the radian kind treated as 1". Whether `asin`
  returns a plain number or an angle in radians is a choice for the
  design: the second makes `asin(0.5)` convert to `deg` and is
  consistent with the kind system, at the price that `2 asin(0.5) + 1`
  is a kind mismatch. Either fits.
- **Domain errors.** `ln(0)`, `ln(-1)`, `asin(2)`, `acosh(0.5)` are a new
  evaluator error, located at the call, beside `divisionByZero` and
  `negativeRadicand`. All functions are real-valued; there is no complex
  result (see "Ruled out").
- **Exact cases.** As `root` returns `sqrt(9/4)` exactly, a built-in
  returns an exact rational wherever the value is rational and cheaply
  recognized: `exp(0)`, `ln(1)`, `sin(0)`, `cos(0)`, `log10(1000)`,
  `log(8, 2)`, `pow(x, p/q)` through the existing `powRational`. The
  rule is the one the architecture already states for roots. What it
  cannot do is recognize `ln(8) / ln(2)` as `3`: two truncations and a
  division give a value within `1e-39` of `3`, displayed as `≈ 3`, which
  option B above makes honest by showing exactly the digits that are
  certain.
- **`pi` as a built-in, not a literal.** A constant computed to the
  working precision is an inexact operation of no arguments, truncated
  once as the rule requires. Since `deg`, `turn` and `grad` are defined
  through `pi`, the table's quantities depend on the working precision,
  so the table is built at the working precision and rebuilt when the
  setting changes (a few milliseconds). The definitions file loses the
  literal and gains nothing: `pi` resolves as a built-in name in the
  unit namespace.
- **A fixed-point kernel under `rational.ts`.** The series must not run
  in exact rational arithmetic, whose denominators would grow with every
  term. They run on scaled `bigint`s at the working precision plus guard
  digits, a small module that `root` could be moved onto as well, and
  hand back a rational (or a coefficient and exponent in decimal mode).
  This is where the "correct to at least that many digits, then
  truncated once" promise is kept, with the Ziv strategy (retry with more
  guard digits in the rare case the result sits too near a digit
  boundary) if the promise is to be exact about the leading digits.

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
  second, which is why the working precision needs a ceiling and the
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
  choices are documented.
- **The incomplete beta function** and its regularized form
  `I_x(a, b)`: one continued fraction with a symmetry that keeps it
  converging, the same shape of work as the upper incomplete gamma.

Nothing here touches the core beyond what feature 1 adds; these are more
built-ins with more delicate implementations. Their error rules under
option B are the rules of the series and fractions they are built from.
They also make `erf` and `erfc` free (`erf(x) = P(1/2, x^2)`), and they
turn the common statistical distributions into one-line user-defined
functions (feature 6): the normal, chi-squared, Student's t and F
cumulative distributions are `erfc`, `P` and `I_x` at the right
arguments, so they need not be built-ins.

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
  trailing zeros out of `num` and `den`, and no operation rounds. This
  is today's behavior; the only visible difference is that `1e999999999`
  parses and multiplies where it fails today, while `1e999999999 + 1`
  still fails as `tooLarge`, since aligning it is beyond `MAX_BITS`.
- **Decimal mode**: after every operation the value is rounded to the
  context's `p` significant digits with its rounding mode, so `den` is
  always `1` and `num` has at most `p` digits. `1/3 * 3` is
  `0.999...9` and displays as `≈ 1`, which is what a user who chose the
  mode expects, and which option B above reports honestly.

The alternative, a second number type beside `Rational` with the core
made generic over the two, doubles the numeric surface for every special
function. The alternative at the other extreme, decimal mode as a
rounding step in the evaluator over the current type with no exponent
field, is smaller still but caps values at `MAX_BITS`, about 19,700
digits, so `20000!` and `exp(100000)` fail in a mode whose point is to
represent them. The exponent field is what makes the decimal mode a
float; it is worth its cost, which is confined to `rational.ts`.

The consequences that reach beyond `rational.ts`:

- **`Precision` becomes a context**: the mode, the working precision, the
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
  floor). They govern the decimal mode's rounding after each operation,
  the display rounding (today fixed at half away from zero), and the
  `round` function. They do not govern the exact mode's inexact
  functions, which keep truncating for the reason ARCHITECTURE.md gives:
  truncation composes, so the digits an inexact result carries are true
  leading digits of the exact value. Making a transcendental function
  honor a directed rounding mode exactly is the correctly-rounded
  problem, and it is deferred (see "Ruled out").
- **The exponent has a bound**, generous but finite (say `10^18`), so
  that formatting is always possible and `10^(10^30)` fails cleanly
  instead of looping.

### 6. User-defined functions: feasible, three extensions to what exists

Functions defined in the definitions file already are compositions
written as ordinary expressions, with an inverse and declared units, and
a call already evaluates the body through the evaluator with the
parameter bound. So a user function is agnostic to precision and
rounding by construction: its body runs under whatever context the call
does, and nothing in the definition mentions either. What remains is:

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

And "handles rounding and precision correctly" is the finding above: a
user function is correct because the digits it displays are certified,
not because its author chose a working precision. Nothing about that is
specific to user functions; it is what makes them safe to write freely.

## Fitting together

The features are not six unrelated additions. They call for the same few
cross-cutting changes, each needed by several of them, which is the
strongest sign that the result is one coherent design rather than six
patched on:

| Change                                                                     | Needed by  |
| -------------------------------------------------------------------------- | ---------- |
| A number context (mode, precision, rounding) in place of `Precision`       | 4, 5, all  |
| A built-in kind of function beside defined functions, with dimension rules | 1, 2, 3, 6 |
| Calls with several arguments                                               | 1, 2, 3, 6 |
| Certified digits (error bounds, or re-evaluation)                          | 1, 2, 3, 6 |
| A fixed-point `bigint` kernel for series and fractions                     | 1, 2, 3    |
| `pi` as a precision-aware built-in; table built at the working precision   | 1, 4, 5    |
| The build's function check over dimensions rather than at `1`              | 1, 6       |
| Settings in the UI: mode, working precision, rounding, display digits      | 4, 5       |

Two runtime concerns cut across everything:

- **The main thread.** The pipeline runs on every keystroke and today
  takes microseconds. A `gamma` at 1000 digits takes on the order of a
  second, which would freeze the input. Either the working precision is
  capped where every function stays under some tens of milliseconds, or
  evaluation moves to a Web Worker. The core is pure and takes plain
  data, so a worker is a thin wrapper, not a redesign; the cap is
  needed anyway, as `MAX_BITS` is today.
- **Memory.** Exact mode's growth is already bounded by `MAX_BITS`; the
  decimal mode bounds values by construction; the kernel's intermediates
  are at most a few times the working precision. Nothing here changes the
  memory picture on a phone as long as the precision has a ceiling.

What is toggled, and what is concurrent:

- **Toggled**: exact mode against decimal mode. They are two invariants
  of one type, and every function is written once for the type; the
  setting changes which invariant the evaluator maintains.
- **Concurrent**: everything else. Elementary and special functions, the
  exact functions, and user definitions are present in both modes and
  behave in each mode as the mode says. The rounding mode is a setting
  that has effect in decimal mode, at display, and in `round`, and none
  in exact mode's arithmetic, which is not a conflict but a definition.

## Ruled out, and why

- **A float with a rational mantissa as a third number type.** Subsumed:
  unbounded, it is the exact rational; bounded, it is the decimal (see
  features 4 and 5).
- **Binary floats or a configurable radix.** Decimal literals would no
  longer parse exactly and display would need conversion; nothing a
  calculator user types is binary.
- **Symbolic constants** (`pi` kept as a symbol so that `sin(pi)` is
  exactly `0`). That is a computer algebra system: simplification rules,
  a normal form for expressions in `pi`, and decisions of equality that
  are undecidable in general. The certified-digits design says `0` with
  `≈` and a radius instead, which is the truth about an approximation.
- **Complex numbers**, as values or as results of `ln`, `sqrt` and
  `gamma` off the real line. Every function would need a second
  implementation and every conversion a meaning for a complex magnitude.
  Negative arguments outside a function's real domain are errors.
- **Correctly-rounded transcendental functions under every rounding
  mode**, as a guarantee. It is achievable with the Ziv strategy in the
  kernel, and the kernel should be built so that it can be added, but
  the certified digits of option B already tell the user what is known,
  and the guarantee is not needed for correctness in that sense.
  Deferred rather than refused.
- **General hypergeometric functions, Bessel `Y` and `K`, Bessel
  functions at large argument.** See feature 3: library-sized casework
  for little use here.
- **Statistical distributions as built-ins.** They are one-line user
  functions over feature 2.
- **A rounding mode inside exact mode's inexact functions.** Truncation
  stays, for its composition property; the mode has its three homes
  above.
- **An unbounded exponent.** Bounded so that every value can be
  formatted and every failure is clean.

## A sequence for the follow-ups

Each is a design of its own; this is only the order that lets each stand
on the one before it.

1. The number context in place of `Precision`, threaded everywhere,
   with the settings UI. Small, and it unlocks the decimal mode's
   semantics before any new function exists.
2. Built-in functions: the union in the lookup, calls with several
   arguments, dimension rules, domain errors, the kernel, `pi` as a
   built-in with the table built at the working precision, the
   dimension-only build check, and the elementary set. The neper and
   the bel in the definitions file.
3. Certified digits (option B, or C), and the display rules that use
   them. Before the special functions, so that they are born under it.
4. The exponent field and the decimal mode proper: `num / den × 10^e`,
   rounding after every operation, the rounding modes at their three
   homes.
5. The Gamma and Beta families with `erf` and `erfc`; then the exact
   functions and the rest of the feasible list of feature 3 as wanted.
6. The user-function extensions: several parameters, optional inverse
   and declaration, domain and range. Storage and an editor for user
   definitions are the "Later" item ARCHITECTURE.md already lists.
