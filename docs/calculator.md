# From unit converter to arbitrary-precision calculator: feasibility

Status: design study; docs/calculator-plan.md is the implementation plan
that follows from it, and stages 1 to 4 of the plan have landed. This document
weighs a list of features
against the core as it stands and says which fit together, which have to
be toggled against one another, which are set aside for later, and which
are ruled out. It stays in broad strokes on purpose: each feature it
admits gets a design of its own later, in the manner of docs/functions.md,
and nothing here is that design.

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
runs on phones, so latency, memory and the size of the delivered payload
still matter. The precision is the user's to set, and arbitrary: nothing
below assumes a fixed working precision, and the rule the core applies
today (compute to 40 digits, truncate once, display 8) is replaced, not
extended.

## Verdict in brief

| Feature                        | Verdict                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| 1. Elementary functions        | Feasible; fits the existing `call` node                         |
| 2. Gamma and Beta families     | Feasible; the incomplete forms are the hardest to make rigorous |
| 3. Other special functions     | Feasible for a named list below; a few ruled out                |
| 4. Floating point              | Feasible, but not as a third number type: it merges with 5      |
| 5. Decimal with rounding modes | Feasible; one of two modes of one number type                   |
| 6. User-defined compositions   | Feasible; exists in embryo, needs three extensions              |
| 7. Rational display            | Feasible; a display setting, given exactness on values          |

Everything admitted can be present in the code at once. Two pairs are
toggled at run time: the exact mode (today's rationals) against the
decimal mode (feature 5, which feature 4 turns out to be), and the
decimal display against the rational display (feature 7). The rest is
concurrent.

The features share one precision model, which is settled first, because
every function below plugs into it the same way. The model is
whole-expression precision in the manner of Arb, it is feasible, and it
is the recommendation; the section says what it costs over the simpler
per-operation model, what it cannot do, and how the two relate so that
starting with one never means redoing the other.

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
- **The payload is small.** The production build precaches about 129 KB,
  42 KB compressed, after stage 4: the script is 111 KB (35 KB
  compressed), the definitions file 16 KB (6 KB compressed), and the
  shell, stylesheet, favicon and manifest the rest (the stage 1 build was
  68 KB, 24 KB compressed, with a 48 KB script). Every number below
  about size is measured against that.

## The precision model

Two models are on the table, and the words matter:

- **Per-operation precision**: every inexact operation returns its true
  value correctly rounded to the working precision (the guarantee MPFR
  gives), and nothing is said about the expression around it. `exp(x) - 1`
  for small `x` loses digits to cancellation and the display does not
  know it.
- **Whole-expression precision**: the user asks for `p` digits and the
  digits shown for the whole expression are correct, whatever composition
  produced them, or the display says how many are. This is what Arb and
  FLINT provide, and it is the preference.

**Whole-expression precision is feasible here, without a dependency, and
it is the recommendation.** The mechanism is Arb's, and it is the idiom
Arb's own documentation gives for "evaluate to `p` correct digits":

- Every magnitude is a **ball**: a midpoint, which is the number type of
  features 4 and 5, and a radius, a small non-negative bound on the
  distance to the true value, kept coarsely (a couple of digits and an
  exponent, always rounded up). A literal, a unit and the result of an
  exact operation on exact operands have radius zero. An exact operation
  on balls propagates the radius by the elementary rules (a sum adds
  radii, a product scales each by the other's magnitude, a division
  demands that the divisor's ball exclude zero). An inexact function adds
  its own truncation and rounding error, which it has to bound anyway to
  be correct, and propagates the radius of its argument, either by
  running its series on balls or by a bound on its derivative over the
  argument's ball (trivial for the elementary functions, a `digamma` away
  for `gamma`, the heaviest part of the incomplete functions).
- The expression is evaluated at an **internal precision** that starts a
  little above `p`. If the final ball certifies `p` significant digits,
  they are shown. If not, the internal precision is doubled and the
  expression is evaluated again, up to a ceiling. Cancellation, which
  costs `k` digits, is paid for by `k` more internal digits on the next
  pass, and the user never chooses a working precision at all: the one
  setting is the digits wanted, and a display shorter than that remains a
  preference of the display.
- Correct rounding of what is shown falls out: the midpoint is rounded to
  `p` digits in the rounding mode in force, and the ball, once narrow
  enough, lies inside one rounding cell, so the digits are the true
  value's. When the ball straddles a rounding boundary, the next pass
  narrows it. (A true value exactly on a boundary, reached through
  irrational steps, would never resolve; it is the case below, and the
  ceiling ends it.)

What it costs over the per-operation model, so that the choice is made
with the price known:

- Every numeric primitive carries a radius beside its midpoint: the
  kernel's operations, and the exact operations of `rational.ts` in ball
  form beside the exact ones (which remain for the table, the dimensions
  and radius-zero values). Mechanical, and small.
- Every built-in supplies its propagation rule. For the elementary
  functions that is one derivative bound each. For the special functions
  it is real work, and it is the same work that a correct-rounding
  implementation owes anyway in the form of a truncation bound; the
  difference is doing it on balls. This is where the cost concentrates,
  and it scales with the number of special functions, not with the
  architecture.
- The evaluator threads a radius where it would otherwise thread one bit
  (see below); the pipeline gains the retry loop; the display gains the
  rule for certified digits. None of these is new structure.

Taken together this is more numeric code than the per-operation model,
perhaps half again as much in the kernel and the built-ins, and no more
architecture. It is not an undue challenge, and the recommendation is to
build the value as a ball from the start.

**How the two models relate, and why starting with either redoes
nothing.** The per-operation model is the ball model with the radius
reduced to one bit: zero, or "some". Concretely, the radius has a
distinguished value, unbounded. A built-in whose propagation rule is not
yet written returns an unbounded radius; an exact operation with an
unbounded operand propagates it; the retry loop does not retry on it,
since another pass cannot narrow it; and the display treats an unbounded
result as the per-operation model does: it shows the digits computed at
the working precision, marked `≈`, certifying none. So if the special
functions land before their bounds do, they work under per-operation
semantics, with a working-precision setting and a display-digits setting
beside it, and every function gains whole-expression semantics the day
its bound is written. The type, the evaluator, the pipeline and the
display do not change between the two states. This is the path forward
if the bounds are deferred: per-operation precision is a stage of the
ball design, not an alternative to it, and building it as a flag on the
value instead would be the one choice that has to be redone.

**What whole-expression precision cannot do**, stated now:

- It cannot prove a value exactly zero, or exactly rational, when an
  irrational step produced it. `sin(pi())` is a ball around zero whose
  relative accuracy never improves with precision, since `pi()` is
  rounded before `sin` sees it; `sqrt(2)^2` is `2 ± ε` at every
  precision. Escalation stops at the ceiling and the display shows what
  is true: `≈ 0`, with an absolute bound, or `≈ 2.000...0`. Exactness for
  such identities needs symbolic values, which are not a goal now ("Not
  now, but not ruled out" below); no numeric system, Arb included, does
  otherwise.
- It cannot guarantee `p` digits at every precision the user might set,
  because the retry has a ceiling in time. Beyond it the display shows
  the digits that are certified and says that they are fewer than asked.
- A division by a value that cannot be told from zero
  (`1 / (sqrt(2)^2 - 2)`) never resolves and is an error that says so,
  rather than a huge number.
- In **decimal mode** the model is per-operation by definition, with the
  radius still tracked: a decimal context means arithmetic rounded to `p`
  digits after every operation, and raising the internal precision would
  change the semantics the user chose. The display marks the digits the
  radius does not certify, as in exact mode, but does not escalate. So
  decimal mode is where a user who wants fixed-precision arithmetic with
  a rounding mode gets exactly that, and exact mode is where "compute
  this to `p` digits" is meant literally.

Exactness, the last piece, is then not a flag but a radius of zero. `=`
is shown when the radius is zero and the digits displayed are all the
digits held; everything else is `≈`. This settles the question of a value
that passes through an irrational step and comes out looking rational:
its radius is not zero, so it is `≈`, however round its digits look, and
`sqrt(4)` is `= 2` because the exact case was detected and nothing was
rounded. The radius is conservative by construction: it never claims
exactness falsely, and it will say `≈` where a rounded constant happened
to cancel (`turn` into `deg` is exactly `360`, but both are defined
through a rounded `pi()`, so the display says `≈ 360.00000`). That is the
one visible cost of `pi()` being a runtime function rather than a
literal, and it is accepted: a conservative `≈` is honest, a false `=` is
not.

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
or a library, and each has a derivative bound of one line for the ball
model.

What they need from the core, in broad strokes:

- **A built-in kind of function.** `Lookup.function` today returns a
  `UnitFunction`, two expression bodies. A built-in is code, not an
  expression, so the resolved function becomes a union: a defined
  function with its bodies, or a built-in with an arity, a rule for the
  dimensions of its arguments and result, and a native implementation
  from balls and a context to a ball. The `call` case of the evaluator
  switches on it. Built-ins live in the function namespace, so a user
  definition of the same name is the duplicate the build already rejects.
  The unit names that would collide are `e` (the elementary charge) and
  `W` (the watt), so Euler's number is `exp(1)`, as in GNU units, and
  Lambert's function gets a longer name.
- **Calls with any number of arguments.** The grammar reads `name(expr)`;
  it needs `name()` and `name(expr, expr, ...)`. The comma is unused, so
  this is a local change to the `call` rule and node, and user-defined
  functions can take several parameters with it (feature 6).
- **`pi()` as a function that produces digits at the precision asked.**
  Not a constant and not a literal: a call of no arguments, so that a
  definition body reads `pi() radian / 180` and gets the precision the
  table is built at. Since `deg`, `turn` and `grad` call it, the table's
  quantities depend on the precision, so the table is built at the
  working precision and rebuilt when the setting changes. The definitions
  file loses the literal and its six uses become calls. Where the digits
  come from is a question of payload against computation, and it was
  measured:

  Computing `pi` in `bigint` with Chudnovsky's series and binary
  splitting, which is what QuickJS's libbf does, took on this machine
  0.4 ms for 1,000 digits, 8 ms for 10,000 and 260 ms for 100,000; a
  phone is perhaps three to five times slower. A Machin formula is
  simpler and five to fifteen times slower at those sizes, still under
  2 ms to 1,000 digits. Spigot algorithms are quadratic and buy nothing.
  A stored table, in any encoding, compresses to the entropy of its
  digits, 0.42 bytes per digit: 1,000 digits cost 0.5 KB compressed,
  about 2% of today's payload; 10,000 digits cost 4.4 KB, 18%; 20,000
  digits 8.8 KB, 36%.

  So the recommendation is to **store no digits and compute `pi()` on
  demand**, memoized for the session at the largest precision reached,
  shorter requests rounding from it (the plan's D10 fixes the memo at the
  ceiling of the retry schedule instead, so that its footprint does not
  depend on what was typed). At the precisions a table build or
  a typical calculation uses, the computation is not measurable; at a
  hundred thousand digits it costs a second once per session, against a
  payload that would have grown by a third for a fifth of that range. A
  stored prefix could be added later if a use for it appears, and is not
  part of this design. The same holds for `e`: `exp(1)` is the `exp`
  routine at the precision asked, itself a binary-splitting series when
  the argument is a small rational, memoized the same way and stored
  nowhere.

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
  `negativeRadicand`. With balls, an argument whose ball straddles the
  edge of the domain (`ln` of a value that cannot be told from zero) is
  the same error once escalation has given up. All functions are
  real-valued; a complex result is not a goal now ("Not now, but not
  ruled out" below).
- **Exact cases.** As `root` returns `sqrt(9/4)` exactly today, a
  built-in returns an exact value, radius zero, wherever the value is
  rational and cheaply recognized: `exp(0)`, `ln(1)`, `sin(0)`, `cos(0)`,
  `log10(1000)`, `log(8, 2)`, `pow(x, p/q)` through the existing
  `powRational`. What it cannot do is recognize `ln(8) / ln(2)` as `3`:
  the result is a ball around `3`, shown `≈ 3.0000000`.
- **A fixed-point kernel under `rational.ts`.** The series must not run
  in exact rational arithmetic, whose denominators would grow with every
  term. They run on scaled `bigint`s at the internal precision plus guard
  digits, in binary, where shifting is free, carrying a radius, and hand
  back a ball whose midpoint is rounded to the decimal precision in the
  mode in force. `root` moves onto the same kernel and gives up its
  private truncation.

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
  integers are exact factorials. The propagation rule is the derivative,
  `gamma(x) digamma(x)`, so `digamma` (feature 3) comes with it. At 40
  digits this is a few dozen evaluations of `exp` and `sqrt`; at 1000
  digits it approaches a second, which is one reason the precision has a
  ceiling and the evaluation may have to leave the main thread (see
  "Fitting together").
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
  choices are documented. For the ball model the series is run on balls,
  which propagates the argument's radius without a derivative bound; the
  continued fraction needs its truncation bound, the same one correct
  rounding needs.
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
  should name the modes once for both uses. On a ball that straddles an
  integer, `floor` and its kin cannot decide, and escalation or an error
  follows, as for a division.
- **`erf`, `erfc`**: free with feature 2.
- **`digamma`** (and the polygamma functions): the same recurrence and
  asymptotic series as `gamma`, and needed by it.
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
- **Statistical distributions as built-ins**: they are compositions of
  feature 2, and feature 6 is the right home for them.

Complex values and arguments (`ln(-1)`, `sqrt(-1)`, `gamma` off the real
line) are not a goal of this design either, but they are set aside rather
than ruled out; see "Not now, but not ruled out".

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
of the rational with different invariants. Concretely, one midpoint type
`num / den × 10^e` in lowest terms, with two modes:

- **Exact mode**: `den` is free, `e` is only a lazy factor that keeps
  trailing zeros out of `num` and `den`, and no exact operation rounds.
  Only the inexact functions round, to the internal precision, and the
  ball model above escalates that precision as the expression needs. The
  visible difference from today is that `1e999999999` parses and
  multiplies where it fails today, while `1e999999999 + 1` still fails as
  `tooLarge`, since aligning it is beyond `MAX_BITS`.
- **Decimal mode**: after every operation the value is rounded to the
  context's `p` significant digits with its rounding mode, so `den` is
  always `1` and `num` has at most `p` digits, and each rounding adds
  half a unit in the last place to the radius. `1/3 * 3` is `0.999...9`,
  and displays as `≈ 1`, which is what a user who chose the mode expects.

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
  rounding there is: the midpoint an inexact function hands back, the
  decimal mode's rounding after each operation, the display rounding
  (today fixed at half away from zero), and the `round` function's
  default. There is no separate policy for any of them, and nothing
  truncates unless the mode says toward zero. Under the ball model the
  mode decides which representable value the midpoint is, and the radius
  covers the rest, so a directed mode (ceiling, floor) is honored exactly
  in what is shown.
- **The exponent has a bound**, generous but finite (say `10^18`), so
  that formatting is always possible and `10^(10^30)` fails cleanly
  instead of looping.

### 6. User-defined functions: feasible, three extensions to what exists

Functions defined in the definitions file already are compositions
written as ordinary expressions, with an inverse and declared units, and
a call already evaluates the body through the evaluator with the
parameter bound. So a user function is agnostic to precision and
rounding by construction: its body runs under whatever context the call
does, its values are balls like any other, and the retry loop around the
whole expression re-evaluates the body along with everything else. A
user-defined `f(x) = (exp(x) - 1) / x` is correct to `p` digits at
`x = 1e-30` because the second pass has the digits the cancellation
took, and its author wrote nothing about precision. What remains is:

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

### 7. Rational display: feasible, and cheap once exactness is known

A display setting, toggled against the decimal display: a value is
written as a fraction in lowest terms, `1 m = (5000/127) in`, rather than
as `≈ 39.370079 in`. It is a setting of the display alone; nothing in
the core changes what it computes. What the display needs to know is
whether the fraction it would write is the value's truth or an artifact
of rounding, and that is the radius of the precision model.

- **An exact value (radius zero) is written as its fraction, with `=`.**
  In exact mode most conversions are such values, and this is where the
  mode shines: `1 in = (127/50) cm`, `1 mi = (25146/15625) km`, a unit
  list as `1 m = 3 ft + (428/127) in`. An integer is written as an
  integer.
- **An inexact value is not written as a fraction.** After `sqrt(2)` at
  20 digits the midpoint held is `141421356237309504880 / 10^20`, a true
  fraction of what is held and no truth about `sqrt(2)`. Writing it
  would be honest and useless. So an inexact value falls back to the
  decimal display with `≈`, whatever the setting. A later refinement is
  the simplest fraction within the ball (the continued fraction
  convergent, `355/113` for `pi()` at seven digits), written with `≈`
  and clearly as an approximant; the radius makes "within the ball" a
  precise condition. It is a separate small design, not a condition of
  this one.
- **The fraction is parenthesized before a unit**, because the grammar
  reads `5000/127 in` as `5000 / (127 in)`, the pitfall README.md warns
  about, and every line the app writes must be typeable back as a
  `have`. A dimensionless result needs no parentheses.
- **In decimal mode** the setting still applies, and shows fewer
  fractions: a value that fit the precision without rounding
  (`1/4 = 0.25`) has radius zero and may be written `1/4`; one that did
  not is inexact and shows as a decimal.

Since exactness is a property of the value, not of the display, the
decimal display uses the same radius for its `=` against `≈`, and the two
displays never disagree about what is exact.

## Fitting together

The features are not seven unrelated additions. They call for the same
few cross-cutting changes, each needed by several of them, which is the
strongest sign that the result is one coherent design rather than seven
patched on:

| Change                                                                       | Needed by  |
| ---------------------------------------------------------------------------- | ---------- |
| A number context (mode, precision, rounding) in place of `Precision`         | 4, 5, all  |
| A ball (midpoint and radius) as the magnitude, radius zero for exact values  | 1 to 5, 7  |
| A retry loop in the pipeline that raises the internal precision              | 1, 2, 3, 6 |
| A built-in kind of function beside defined functions, with dimension rules   | 1, 2, 3, 6 |
| Calls with any number of arguments                                           | 1, 2, 3, 6 |
| A fixed-point `bigint` kernel on balls, with exact-case detection            | 1, 2, 3    |
| `pi()` computed at the precision asked; table built at the working precision | 1, 4, 5    |
| The build's function check over dimensions rather than at `1`                | 1, 6       |
| Settings in the UI: mode, digits, rounding mode, fraction display            | 4, 5, 7    |

Three runtime concerns cut across everything:

- **The main thread.** The pipeline runs on every keystroke and today
  takes microseconds. A `gamma` at 1000 digits takes on the order of a
  second, and the retry loop can run the expression several times.
  (Measured when 6.3 landed: `lgamma` 31 ms and `gamma` 34 ms a call at
  1,000 digits, `digamma` 33 ms, each about 0.7 s, `digamma` 1.3 s, at
  the default ceiling of 4,040 digits, plus the Bernoulli numbers' run
  of about 3 s once; the estimate was thirty times too high at 1,000
  digits, and the four routines the probe times cost 9 ms together
  there.)
  Either the precision is capped where every function stays under some
  tens of milliseconds, or evaluation moves to a Web Worker. The core is
  pure and takes plain data, so a worker is a thin wrapper, not a
  redesign; a cap is needed anyway, as `MAX_BITS` is today, and the
  retry's ceiling is a second cap of the same kind.
- **Memory.** Exact mode's growth is bounded by the range limit, Most
  bits, a hard limit on the bits held for one number, measured on what is
  stored (the plan's D16 and D19: literals, a sum's alignment and a
  power's prediction are held to it before anything is formed, and every
  exact result at the node that forms it, products, quotients and sums
  included); the decimal mode bounds values by construction; the
  kernel's intermediates are at most a few times the internal precision;
  a radius is a few digits. Nothing here changes the memory picture on a
  phone as long as the precision has a ceiling.
- **Payload.** No digit tables are shipped, so the growth is code alone.
  A rough expectation for the kernel, the elementary functions and the
  Gamma and Beta families together is 15 to 25 KB of script, 6 to 9 KB
  compressed, against today's 17 KB compressed script: a third to a half
  more, for the whole numeric program, and to be measured as it lands.
  The definitions file grows by a few lines (`pi()` in six places, the
  neper and the bel). Measured at the end of stage 3, after
  `pnpm build`: the script is 94 KB (30 KB compressed) and the whole
  precache 115 KB (39 KB compressed), so stages 1 to 3 added 46 KB of
  script (13 KB compressed), above this estimate before the Gamma family
  exists; the figure includes the settings panel, the display's kinds and
  the probe of the limits as well as the kernel and the elementary set,
  and the definitions file grew by 1 KB (0.4 KB compressed). At the end
  of stage 4 the script is 111 KB (35 KB compressed) and the whole
  precache 129 KB (42 KB compressed): 17 KB of script (5 KB compressed)
  for the `Scaled` midpoint, the `Floating` and its log-space digits, the
  decimal mode and `approx`.

What is toggled, and what is concurrent:

- **Toggled**: exact mode against decimal mode, two invariants of one
  midpoint type, every function written once for the type; and the
  decimal display against the rational display, two renderings of one
  value and one radius.
- **Concurrent**: everything else. Elementary and special functions, the
  exact functions, and user definitions are present in both modes and
  behave in each mode as the mode says. The rounding mode is one setting:
  in exact mode it governs the display's one rounding of the certified
  value of the whole expression, and in decimal mode every operation's
  (the plan's D15 says why the two differ). Whole-expression precision is
  not a mode: it is what exact mode means, and decimal mode is
  per-operation by definition.

## Not now, but not ruled out

Two extensions that this design does not pursue, and takes care not to
prevent. docs/future.md records each in full: what it is, why not now,
what it would take, and what in this design keeps it possible.

- **Symbolic values** (radicals, `pi` and `e` kept exact through the
  steps algebra can keep exact, so that `sqrt(2)^2 - 2` is `= 0`,
  `sin(pi()/6)` is `= 1/2` and `turn` into `deg` is `= 360`): the one
  way to a certified zero, and a cancellation that costs nothing where
  the numeric model pays for it with a retry. Not now, because it is a
  canonical form with its simplification and tables of exact cases,
  which needs the numeric model in place to fall back on. Kept possible,
  because an exact value is a ball of radius zero whatever its midpoint
  holds, `root` already detects the exact rational cases, and `pi()` and
  `exp` are functions that can return a symbolic value under a setting
  and digits otherwise.
- **Complex numbers**, as values and as results of `ln`, `sqrt` and
  `gamma` off the real line. Not now, because every built-in would need
  a second implementation and there is no complex use in sight, so such
  arguments are domain errors. Kept possible, because the magnitude is
  one type behind one module, a complex ball is the next type after the
  real one, and domain errors are `Result` values a mode can turn into
  values.

## Ruled out, and why

- **A float with a rational mantissa as a third number type.** Subsumed:
  unbounded, it is the exact rational; bounded, it is the decimal (see
  features 4 and 5).
- **Binary floats or a configurable radix.** Decimal literals would no
  longer parse exactly and display would need conversion; nothing a
  calculator user types is binary. Binary is the kernel's business
  alone.
- **A radius shown to the user.** The ball is the mechanism, not the
  output: what the user sees is digits, all of them certified, or fewer
  than asked with a note. An interval display is not asked for and not
  planned.
- **Exactness as a flag on values** rather than a radius. It is the
  ball with the radius collapsed to one bit, and it would have to be
  replaced the day the first propagation rule is written; see "The
  precision model" for why the radius is the shape to start with even
  when the rules come later.
- **Stored digits of `pi` or `e`.** Measured against the payload and the
  cost of computing them (feature 1), they buy nothing at any precision a
  user will set. Computation on demand, memoized, instead.
- **General hypergeometric functions, Bessel `Y` and `K`, Bessel
  functions at large argument.** See feature 3: library-sized casework
  for little use here.
- **Statistical distributions as built-ins.** They are one-line user
  functions over feature 2.
- **An unbounded exponent.** Bounded so that every value can be
  formatted and every failure is clean.

## A sequence for the follow-ups

Each is a design of its own; this is only the order that lets each stand
on the one before it.

1. The number context in place of `Precision`, the ball as the magnitude
   with radius zero everywhere (nothing inexact exists yet but `root`),
   and the settings UI. Small, and it fixes the meaning of `=` and the
   shape of the value before any new function exists.
2. The kernel on balls, `root` moved onto it, `pi()` computed on demand,
   and the retry loop in the pipeline. From here `sqrt(2)^2 - 2` is
   `≈ 0` with a bound rather than eight digits of noise.
3. Built-in functions: the union in the lookup, calls with any number of
   arguments, dimension rules, domain errors, the table built at the
   working precision, the dimension-only build check, and the elementary
   set with their one-line propagation rules. The definitions file's `pi`
   becomes `pi()`, and the neper and the bel appear.
4. The exponent field and the decimal mode proper: `num / den × 10^e`,
   rounding after every operation, the rounding modes at their homes.
5. The rational display.
6. The Gamma and Beta families with `erf` and `erfc`, each with its
   propagation rule, or with an unbounded radius until the rule is
   written; then the exact functions and the rest of the feasible list of
   feature 3 as wanted.
7. The user-function extensions: several parameters, optional inverse
   and declaration, domain and range. Storage and an editor for user
   definitions are the "Later" item ARCHITECTURE.md already lists.
