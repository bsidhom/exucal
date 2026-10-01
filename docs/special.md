# The exact functions, and the Gamma and Beta families

Status: design note for stage 6 of docs/calculator-plan.md (task 6.0),
written after stage 5 landed and before any of the stage's code; the
plan's 6.1 to 6.9 were revised against it in the same change, and D22
records the owner's rulings on it. The goal is the study's feature
3 for the exact functions and feature 2 for the Gamma and Beta families
(docs/calculator.md, "3. Other special functions" and "2. Gamma and Beta
families"), as built-ins in the manner of docs/builtins.md, whose rules
every function here follows unless this note says otherwise.

## The exact functions

Thirteen functions that need no precision: each is exact on exact
arguments, and on an inexact argument is either exact where the
argument's interval decides the answer or `unresolved` where it does
not. They make exact mode a calculator in its own right, and they are
the first functions whose result keeps its argument's dimension (D14).

| Function                 | Arguments                       | Result         |
| ------------------------ | ------------------------------- | -------------- |
| `abs(x)`                 | any quantity, kinds included    | the argument's |
| `sign(x)`                | any quantity, kinds included    | plain number   |
| `floor(x)`, `ceil(x)`    | a plain number                  | plain number   |
| `trunc(x)`               | a plain number                  | plain number   |
| `round(x)`               | a plain number                  | plain number   |
| `round(x, places)`       | two plain numbers               | plain number   |
| `div(a, b)`              | two quantities of one dimension | plain number   |
| `mod(a, b)`              | two quantities of one dimension | the arguments' |
| `gcd(a, b)`, `lcm(a, b)` | two plain numbers               | plain number   |
| `factorial(n)`           | a plain number                  | plain number   |
| `binomial(n, k)`         | two plain numbers               | plain number   |
| `doublefactorial(n)`     | a plain number                  | plain number   |

**Why `floor` and its kin take a plain number** (D22, the owner's ruling
on this note).
The plan had them keep their argument's dimension, as `abs` does. But a
quantity's magnitude is stored in the primitives, so `floor(3.7 ft)`
would floor `1.12776 m` and answer `1 m`, which no one means, and the
answer would change with the choice of primitives. A function whose
result depends on the unit the value is written in is defined only on
plain numbers; the user writes `floor(3.7 ft / ft) ft`, which says which
unit the floor is in. `abs`, `sign`, `div` and `mod` are invariant under
the unit's scale (`mod(7 ft, 2 ft)` is `1 ft` whatever the base unit),
so they take quantities. `gcd`, `lcm` and the factorials are about
integers, and an integer is a plain number.

### Definitions

- **`abs(x)`** is the magnitude; **`sign(x)`** is `-1`, `0` or `1`.
- **`floor(x)`** is the largest integer at or below `x`, **`ceil(x)`**
  the smallest at or above, **`trunc(x)`** the integer part toward zero.
- **`round(x)`** rounds to an integer, and **`round(x, places)`** to
  `places` decimal places: to a multiple of `10^-places`, so `round(3.14159,
2)` is `3.14`, `round(x, 0)` is `round(x)`, and a negative count rounds
  to the left of the point, `round(1234, -2)` being `1200`. `places` must
  be an exact integer. The rounding is in the context's rounding mode, the
  panel's Rounding setting: `round(2.5)` is `3` under the default, half
  away from zero, and `2` under half even or toward zero. This is where
  the mode surfaces inside an expression; in exact mode it otherwise
  governs only the display (D15), and a call of `round` is the user
  asking for it there. The plan's optional mode argument is dropped: the
  grammar has no strings, a bare name is a unit, and two of the modes'
  names, `floor` and `ceiling`, are functions. Rounding to significant
  digits, and entering a reading with its uncertainty, are
  [#98](https://github.com/bsidhom/pwa-units/issues/98).
- **`div(a, b)`** and **`mod(a, b)`** are floored division and its
  remainder, F-division in Boute's terms (Raymond T. Boute, "The Euclidean definition of the functions div and mod", ACM Transactions on Programming Languages and Systems 14(2), 1992, pages 127 to 144; D22): `div(a, b)` is
  `floor(a / b)`, and `mod(a, b)` is `a - b × div(a, b)`, so that
  `a = b × div(a, b) + mod(a, b)` exactly, `|mod(a, b)| < |b|`, and the
  remainder is zero or has the divisor's sign: `mod(7, 2)` is `1`,
  `mod(-7, 2)` is `1`, `mod(7, -2)` is `-1`, `div(-7, 2)` is `-4`. The
  two are one definition, so they are concordant by construction, which
  is Boute's requirement. Both are defined on exact rationals and on
  quantities of one dimension, `mod(7.5, 2)` being `1.5` and `mod(-30 deg,
360 deg)` being `330 deg`; `div` is a count, dimensionless. A divisor
  of zero is a division by zero.
- **`gcd(a, b)`** and **`lcm(a, b)`** take integers and are non-negative:
  `gcd(-6, 4)` is `2`, `lcm(-6, 4)` is `12`, `gcd(0, 0)` is `0`,
  `gcd(a, 0)` is `|a|`, `lcm(a, 0)` is `0`.
- **`factorial(n)`** for an integer `n >= 0`; **`doublefactorial(n)`**
  for an integer `n >= -1`, `doublefactorial(-1)` and `doublefactorial(0)`
  being `1`; **`binomial(n, k)`** for integers `n >= 0` and any integer
  `k`, zero for `k` outside `0..n`.

**Why floored division, and how `gcd` sits beside it** (D22). Boute's
case is that the three common definitions of `div` and `mod`, truncated
(C's `/` and `%`, with the dividend's sign on the remainder), floored
(Python, Excel, Mathematica, Knuth: the divisor's sign) and Euclidean
(the remainder never negative), are each consistent only as a pair, and
that the Euclidean pair is the one with the cleanest theory: `mod(a, m)`
is then the canonical representative of `a` in `Z/mZ` whichever sign `m`
has, and Euclid's algorithm on signed integers lands on the non-negative
divisor without a final absolute value. The floored pair is chosen here
for three reasons. `div(a, b) = floor(a / b)` is one sentence, and makes
`div` concordant with `floor` as well as with `mod`, an identity the
Euclidean pair lacks (`div(7, -2)` is `-3` there, `floor(7 / -2)` is
`-4`). The remainder's sign carries the divisor's, so a result can be
read back without the divisor at hand. And it is what the calculators
this one's users know do. The two differ only for a negative divisor,
and the Euclidean pair is one call away, `mod(a, abs(b))` and
`sign(b) × div(a, abs(b))`.

`gcd` and `lcm` are independent of that choice. The identity Euclid's
algorithm rests on, `gcd(a, b) = gcd(b, a - q b)` for any integer `q`,
holds for every definition of the quotient, floored included, since
`a - q b` and `b` have the common divisors `a` and `b` have; what the
Euclidean remainder buys is that the loop's last nonzero value is
already non-negative, where the floored loop may end on `-2` for
`gcd(6, -4)`. The implementation takes absolute values first, as the
fraction type's own `gcd` already does, so the loop never sees a sign,
and the result's non-negativity is a normalization, the same choice as
a fraction's positive denominator, not a consequence of the division.
So: floored `div` and `mod`, non-negative `gcd` and `lcm`, and no
conflict between them.

### On balls

An exact argument gives an exact result. An inexact one is a ball, and
the rule of D4 decides: the result is exact where every value in the
ball gives the same answer, and `unresolved` at the point it straddles
where the answer depends on the side, which the retry loop narrows and
the ceiling reports.

- **`abs`** of a ball is a ball: the midpoint's magnitude with the same
  radius, which contains the magnitude of every value in it (for a ball
  reaching across zero the result reaches below zero, as a bound, and the
  display's `zero` kind says what it is worth). **`sign`** of a ball of
  definite sign is exact, and of one touching or reaching across zero is
  `unresolved` at zero, since `sign` is the function whose answer is the
  side.
- **`floor`, `ceil`, `trunc` and `round`** of a ball whose interval
  lies inside one cell (strictly between two consecutive integers for the
  first three, or inside one rounding cell at `places` in the mode for
  `round`) are the exact integer, or the exact rounded value, of that
  cell; a ball touching or reaching across a cell's boundary is
  `unresolved` at that boundary, the edge being the integer, or the
  rounding boundary, as a `Scaled`. A ball of a tie under a half-way mode
  is on a boundary and `unresolved` there; `(2^(1/2))^2 - 2` floored is
  `unresolved` at zero to the ceiling, as a division by it is, and the
  message says the value cannot be told from zero. The interval's ends
  are read as `certifies` reads them (D7): exactly where the radius can
  be formed and aligned with the midpoint, and by the coarse bounds
  erring toward `unresolved` where it cannot.
- **`div` and `mod`** of balls are `floor` of the quotient ball and
  `a - b × div(a, b)` on balls, so `div` is `unresolved` at a multiple of
  `b` the quotient straddles, and `mod` with it; a divisor straddling
  zero is `unresolved` at zero, as any division's is.
- **`gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial`** take
  exact integers. An exact argument that is not an integer is a `domain`
  error (`notInteger`); an inexact argument is a `domain` error too
  (`notExact`), worded to say that the function needs a whole number
  known exactly: a ball `5 ± 1e-30` is not known to be `5`, and no pass
  of the retry loop would make it so, since nothing narrows a ball to a
  point. `factorial` of a value below zero, `doublefactorial` below `-1`
  and `binomial` with `n` below zero are `domain` errors (`negative`);
  `gamma(n + 1)` is what a non-integer factorial means, and the message
  for a non-integer may say so once 6.3 lands.
- **An unbounded radius** gives the function of the midpoint with an
  unbounded radius, as every built-in does, for the functions that take
  a ball at all; the integer functions refuse it as inexact.

### Size

`factorial`, `binomial` and `doublefactorial` grow past Most bits long
before they cost anything: `factorial(20000)` has 77,338 digits. Each
predicts its result's bits before computing (D19's "what can be
predicted cheaply before forming still should be"), from Stirling's
formula with its first correction, `log2 n!` as the sum of
`(n + 1/2) log2 n`, `-n log2 e` and `log2(2π) / 2`, which is within a
bit of the truth for every `n >= 1`, so the refusal is sharp: `binomial(n, k)` from three such
terms, and `n!!` from `2^k k!` for even `n = 2k` and `n! / (2^k k!)`
for odd `n = 2k + 1`. A prediction past `maxBits` is a `tooLarge`
refusal at the call, worded as the function's own: `factorial(20000)` is
too large to hold exactly within Most bits, and the remedy is to raise
Most bits, or `gamma(n + 1)` for the digits asked once 6.3 lands. The
generic node check's remedy, `approx` around the first operand, is not
offered: an inexact argument is a `domain` error here, not a way to an
inexact result. The node check of D19 stands behind the prediction for
the product itself. The refusal applies in both modes: Most bits is a
cost limit, and decimal mode would form the exact product before
rounding it.

`gcd` and `lcm` form nothing larger than their arguments' product, `div`,
`mod` and the rounding functions nothing larger than their arguments,
and the node check holds each result as it holds every exact result.

### The sweep

Each function joins the edge sweep by the map of built-ins with an
oracle rule: the domain predicate for the integer functions, the
division by zero for `div` and `mod`, and the exact reference over the
midpoints for every one, so that the sweep checks the identity `a =
b × div(a, b) + mod(a, b)` and the containment of the reference in the
result. `round` is the first built-in with a range of arities; the sweep
enumerates it at each, which its builder gains in 6.1.

### Messages and docs

The dimension-rule failures are worded as every built-in's are. Three
domain reasons are new, `notInteger`, `notExact` and `negative`, worded
in messages.ts. README's "Functions in expressions" gains the thirteen
in 6.1, and docs/builtins.md's list of names that collide with no unit
grows with them (the build checks it: `div`, `mod`, `sign` and the rest
are not units of units.txt, and none reads as a prefix followed by a
unit).

## The Gamma and Beta families

Built-ins that reach the kernel, in the manner of docs/builtins.md: the
module does the exact cases and the conversion, a routine beside fixed.ts
does the work on `Fixed` values with the argument's error included (D9),
and the result returns through `fixedToBall`. Every function here takes
plain numbers and returns a plain number. The order of the tasks is the
order of dependence: `digamma` and `gamma` share the shift and the
Bernoulli numbers, `beta` is three `gamma`s, the incomplete functions
need `gamma` for their regularized forms, and `erf` is an incomplete
gamma.

### Bernoulli numbers

The asymptotic series of `lgamma` and `digamma` take the even Bernoulli
numbers, exact rationals. They are computed once, as many as the largest
ceiling asked for needs (the count grows with the working bits, about
`bits / (2 log2 x)` for the shifted argument `x` below), by the tangent
numbers, integers found by one recurrence, from which `B_2k` is a
division; and memoized, the memo growing when a larger count is asked,
as the constants of D10 are memoized by the ceiling. Nothing about them
depends on the precision but the count.

### `digamma` (6.2)

`ψ(x)`. For `x > 0`: the recurrence `ψ(x + 1) = ψ(x) + 1/x` shifts the
argument up to `x >= N`, with `N` of the order of the working bits over
`2 log2 N`, where the asymptotic series, `ln x` less `1 / (2x)` less the terms
`B_2k / (2k x^2k)`, converges fast enough; the series is truncated where the next term
falls below the target, and for a positive argument the remainder of
this series is bounded in magnitude by the first omitted term, which is
the truncation bound owed. For `x < 0` not an integer: the reflection
`ψ(1 - x) - ψ(x) = π cot(π x)`, with `cot` from the kernel's `sin` and
`cos`. The poles at the non-positive integers are `domain` errors; a
ball touching or reaching across one is `unresolved` at the pole (the
edge `pole`, as `tan`'s). No rational value is known (`ψ(1)` is `-γ`),
so there is no exact case. A large argument costs nothing: for `x` past
the working bits the series is `ln x` within its first correction, and
`ln` takes any exponent. The argument's radius is carried through the
recurrence and the series on balls (D9); a ball too wide for the series
is `unresolved` at the nearest pole below it, since the function then
reaches both ways.

### `gamma` and `lgamma` (6.3)

`lgamma(x)` is `ln |Γ(x)|`. For `x > 0`: the shift up by the recurrence
`Γ(x + n) = x (x + 1) … (x + n - 1) Γ(x)`, the product kept as a ball,
to `x >= N` as for `digamma`, then Stirling's series, the sum of
`(x - 1/2) ln x`, `-x`, `ln(2π) / 2` and the terms
`B_2k / (2k (2k - 1) x^(2k - 1))`, whose remainder for a positive
argument is again bounded by the first omitted term. For a negative `x`
that is not an integer, the reflection `Γ(x) Γ(1 - x) = π / sin(π x)`
gives `lgamma(x)` as `ln π - ln |sin(π x)| - lgamma(1 - x)`. Exact
cases: `lgamma(1)` and `lgamma(2)` are `0`. The poles are `domain`
errors and a ball across one `unresolved` at the pole.

`gamma(x)` is `exp(lgamma(x))` with the sign from the reflection, except
that an exact integer `x >= 1` whose factorial fits Most bits is the
exact `factorial(x - 1)`, and an exact integer whose factorial does not
fit is the kernel's value, inexact and a value, which is the remedy the
factorial's refusal names (`gamma(20001)` is `≈ 1.8192063e+77337`). The
result passes the exponent bound for `x` of the order of `10^16`
(`lgamma(x) ≈ x ln x` reaches `10^18 ln 10` near `x ≈ 6 × 10^16`), and
`gamma` takes the guard every exponential takes: the classifier of
ball.ts (`classifyExp`, the plan's H.15) on the `lgamma` ball, which
refuses `overflow` only when every value of the argument puts the result
past the top, leaves a ball across the edge `unresolved` at the bound,
and otherwise lets the exponential's log space give the digits of a
result whose exponent cannot be formed. Toward zero the same guard gives
`underflow` for a large negative non-integer argument, whose `Γ` is tiny
by the reflection. Propagation is by running the shift and the series on
balls (D9), so the study's derivative rule, `Γ(x) ψ(x)`, is not needed
and `gamma` does not depend on `digamma`; the two still come in the
plan's order, `digamma` first as the simpler of the pair that share the
machinery.

Cost: the shift puts `x` near `N`, which is of the order of the working
bits over `2 log2 N`, so some hundreds at the default ceiling, a product
of that many balls; the series then takes of the order of `N` terms, each
a division at the working bits. 6.3 measures it at the default ceiling
against the study's estimate (approaching a second at 1,000 digits) and
records it in docs/calculator.md; the probe of limits.ts is not changed
unless `gamma` proves costlier than the four routines it times.

### `beta` (6.4)

`beta(a, b)` is `Γ(a) Γ(b) / Γ(a + b)`. Exact case: positive integers,
where it is `(a - 1)! (b - 1)! / (a + b - 1)!`, formed as the reciprocal
of `(a + b - 1) binomial(a + b - 2, a - 1)` within Most bits, and the
kernel's value otherwise. For the rest, the exponential of
`lgamma(a) + lgamma(b) - lgamma(a + b)` with the sign from the three
reflections, under the same classifier, so large arguments pass
through `lgamma` and never form a `Γ` that would not fit. A pole of
`Γ(a)` or `Γ(b)` is a `domain` error; a pole of `Γ(a + b)` alone makes
the value exactly zero.

### The incomplete gamma functions (6.5)

`lowergamma(s, x)` and `uppergamma(s, x)`, the unregularized `γ(s, x)`
and `Γ(s, x)`, for `s > 0` and `x >= 0`, and `lowergammareg(s, x)` and
`uppergammareg(s, x)`, the regularized forms `P` and `Q`. The names are
lower case as every built-in's, say which function they are, and say
whether it is regularized by the suffix `reg`, a convention the
incomplete beta function follows; a one-letter name such as `P` is one
a user's own definitions would want, and says nothing. The lower by its series, `x^s
e^-x Σ x^n / (s (s + 1) … (s + n))`, whose terms are positive, so there
is no cancellation and the tail after a term is bounded by that term
times `r / (1 - r)` once the ratio `r = x / (s + n + 1)` is below one: the
truncation bound owed. The upper by Legendre's continued fraction,
evaluated by the modified Lentz method, in the region where the series
would cancel, which is the region rule mpmath documents (`x > s + 1`);
the fraction's truncation bound is 6.5's to write, and until it is, the
upper form returns an unbounded radius, which the display shows as the
study describes ("the digits are not certified"). The regularized forms
divide by `gamma(s)`, and `uppergammareg` is one less `lowergammareg`
where the lower is the one computed, and the other way round.
Exact cases: `x = 0` gives `0` for the lower and `Γ(s)` for the upper,
so `lowergammareg(s, 0)` is `0` and `uppergammareg(s, 0)` is `1`; `s = 1` gives `1 -
e^-x` and `e^-x`.

### `erf` and `erfc` (6.6)

`erf(x)` is `lowergammareg(1/2, x^2)` for `x >= 0` and odd, `erfc(x)` is
`1 - erf(x)`
for small `x` and `uppergammareg(1/2, x^2)` where `erf` is near one, so
that `erfc`
of a large argument keeps its digits (`erfc(10)` is `≈ 2.0884876e-45`,
not `1 - 1`). Exact cases: `erf(0)` is `0`, `erfc(0)` is `1`. For `x`
beyond the working bits' reach `erf` is `±1` within `erfc(|x|)`'s bound,
`e^-x^2 / (|x| √π)`; `erfc` of such an `x` has the exponent bound to
meet, `e^-x^2` passing below `10^-(10^18)` near `x ≈ 1.5 × 10^9`, and the
classifier on `-x^2` gives `underflow` or `unresolved` at the bound as
`exp` does.

### The incomplete beta function (6.7)

`incbeta(a, b, x)`, the incomplete beta function `B(x; a, b)`, and
`incbetareg(a, b, x)`, the regularized `I_x(a, b)`, for `0 <= x <= 1`
and `a, b > 0`, the parameters first as the incomplete gamma functions
take them: the continued fraction with the symmetry `I_x(a, b) = 1 -
I_(1-x)(b, a)`, taken where `x > (a + 1) / (a + b + 2)` so that the
fraction converges, as the study says; its truncation bound is 6.7's to
write, with the same interim rule as the upper incomplete gamma. Exact
cases: `x = 0` is `0`, `x = 1` is `1`, and positive integers `a` and
`b` make it a polynomial in `x`, `Σ binomial(a + b - 1, j) x^j (1 -
x)^(a + b - 1 - j)` over `j` from `a` to `a + b - 1`, exact for a
rational `x` within Most bits.

### The rest of feature 3 (6.8)

Each its own task and commit, in the plan's order, each with the four
test patterns and a row in the sweep: `zeta(s)` for real `s > 1` by the
Borwein algorithm, whose error bound is explicit; `lambertw(x)` on the
principal branch, for `x` at or above `-1/e`, by Halley's iteration on
`w e^w = x` with the kernel's `exp` and the ball's final containment
check; `ellipk(m)` and `ellipe(m)` by the arithmetic-geometric mean;
`legendre(n, x)` and `chebyshev(n, x)` for integer `n` by the
recurrences, exact for a rational `x`; and Bessel `J` and `I` last, by
their series for small arguments. Each sub-note is a paragraph in the
"Implementation notes" below when its task lands.

## Where it goes

- `src/core/builtin.ts`: the three domain reasons.
- `src/core/builtins/exact.ts`: the thirteen exact functions and the
  machinery they share (the integer checks, `floor` on a ball, the size
  predictions), with `exact.test.ts` beside it; `src/core/builtins.ts`
  gathers them.
- `src/core/builtins/gamma.ts` with `fixed-gamma.ts` beside fixed.ts
  for `digamma`, `lgamma` and `gamma`; `beta.ts`; `incomplete.ts` for
  the incomplete functions and `erf.ts`; `src/core/bernoulli.ts` for the
  memoized Bernoulli numbers.
- `src/core/edges.test.ts`: the rules for each, and the builder's
  enumeration of a range of arities.
- `src/messages.ts`: the domain reasons and the factorial's refusal.
- README ("Functions in expressions"), docs/builtins.md ("Names"), and
  this note's "Implementation notes", per task.

## Not in this design

- A mode argument to `round`, and rounding to significant digits (#98).
- Truncated or Euclidean `div` and `mod`; both are one call away.
- A non-integer `factorial` or `binomial`, which `gamma` and `beta`
  give; a message pointing at them once they land.
- The polygamma functions beyond `digamma`, and `gamma` of a complex
  argument, which the core has no number for.

## Implementation notes

Where the code departed from the note above, or settled what it left
open; docs/calculator-plan.md ("Stage 6 as it landed") will have each
task's rulings when the stage is done.

- **6.1, the exact functions** (`src/core/builtins/exact.ts`). `mod` is
  computed as `(a / b - div(a, b)) × b`, the same value and exact on
  exact arguments: the form `a - b × div(a, b)` forms the product, which
  passes the exponent bound where `a` and `b` lie at its opposite ends
  though the remainder, within `|b|`, does not (`mod(-9.99e+10^18,
5e+10^18)`, which the sweep found). A quotient past the top of the
  bound, whose floor cannot be formed, makes `div` `overflow` and `mod`
  `tooLarge`, no value of the remainder passing the bound; one below the
  bottom, which the division refuses, has a floor all the same, zero or
  minus one by the signs. A remainder whose alignment passes the range
  limit (`mod(-1, 1e20000)` has twenty thousand digits) is `tooLarge`,
  as any exact sum's is. The rounding functions decide a ball by
  `position` against the open cell of the midpoint's result, a ball
  touching a boundary counting as straddling it; a cell whose boundary
  cannot be formed (an integer midpoint near the top of the bound, or a
  unit below the bottom of it) leaves the ball `unresolved` at the
  result itself, which is never wrong about the value. A `places` count
  that cannot be formed within Most bits (`round(x, 1e20000)`) is
  `tooLarge`. `binomial` predicts its size from `n^k / k!` where `n` is
  past a double's exactness, so that `binomial(1e400, 2)` is the value it
  is. The sweep enumerates `round` at both arities, which its builder
  learned here, and checks each function against its exact reference
  over the midpoints and the identity of `div` and `mod`; it runs 23,921
  cases. The message for a value that cannot be told from a rounding
  boundary writes the boundary to twelve digits (`2.5`), where the
  edges before were integers and one digit served.
