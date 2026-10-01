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
- `src/core/edges.sweep.ts`: the rules for each, and the builder's
  enumeration of a range of arities.
- `src/messages.ts`: the domain reasons and the factorial's refusal.
- README ("Functions in expressions"), docs/builtins.md ("Names"), and
  this note's "Implementation notes", per task.

## Not in this design

- A mode argument to `round`, and rounding to significant digits (#98).
- Truncated or Euclidean `div` and `mod`; both are one call away.
- A non-integer `factorial` or `binomial`, which `gamma` and `beta`
  give; a message pointing at them once they land (`factorial`'s points
  at `gamma` since 6.3, `binomial`'s at `beta` since 6.4).
- The polygamma functions beyond `digamma`, and `gamma` of a complex
  argument, which the core has no number for.

## Implementation notes

Where the code departed from the note above, or settled what it left
open; docs/calculator-plan.md ("Stage 6 as it landed") will have each
task's rulings when the stage is done.

- **6.1, the exact functions** (`src/core/builtins/abs.ts`, `round.ts`,
  `division.ts`, `integers.ts`). `div` and `mod` take one division
  between them: the quotient `q = a / b` is formed once, as a ball, `div`
  is its floor, and `mod` is `(q - floor(q)) × b` from the same quotient,
  the same value as `a - b × floor(q)` and exact on exact arguments. The
  textbook form builds the product `b × floor(q)`, which passes the
  exponent bound where `a` and `b` lie at its opposite ends though the
  remainder, within `|b|`, does not (`mod(-9.99e+10^18, 5e+10^18)`,
  which the sweep found); this form never builds it. A quotient past the top of the
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
- **6.2, `digamma`** (`src/core/builtins/gamma.ts`, `src/core/fixed-gamma.ts`,
  `src/core/bernoulli.ts`). The series is summed as a recurrence on its
  terms, each the last times `1 / y^2` and the ratio of consecutive
  Bernoulli numbers with its index factors, the exact scaling first and
  the two truncating steps last: a power of `1 / y^2` held on its own in
  fixed point loses its relative precision as it shrinks, and the
  Bernoulli numerator it is multiplied by turns an ulp of error into a
  bound that grows where the term vanishes, which the first version
  found by never terminating; the same happens when a truncation's ulp is
  multiplied by the ratio, which grows like `k^2`. The loop ends at the
  first term within eight ulps, a term's error being a few ulps however
  small the term. The Bernoulli numbers are exact rationals from the
  tangent numbers, memoized to a quarter past the count asked for, so a
  pass needing a few more does not recompute them while the ceiling pass,
  needing about twice the pass before, pays for little it does not use.
  The working bits are the result's plus a guard, whatever bits the
  argument comes at: a small argument comes at extra bits so that its
  reciprocal, the shift's first term, keeps its digits, and that term
  alone is taken from it at those bits; the first version worked at the
  argument's bits throughout, so that `digamma(4e-400)` at forty digits
  summed a series sized for 165 bits at 1,514, whose terms bottom out
  near `2^-500` and never reach the floor. The square `1 / y^2` is the
  square of `1 / y`, since a wide interval's square can reach zero where
  the interval does not. The shift target is a third of the working
  bits: at the default ceiling
  the shift costs some 4,500 divisions and the series some 1,500 terms,
  each a multiplication by a numerator of thirty thousand bits and a
  division, which measured as 1.3 s a call, the Bernoulli run to
  `B_3800` another two or three seconds once; at a thousand digits a
  call is 37 ms and the run 0.1 s. A floating memo of the ratios at the
  memo's bits would cut a term's cost to two multiplications at the
  working bits, if the ceiling pass needs to be faster. The built-in
  routes an argument at or beyond `2^bits` to `ln x` within `1 / x`
  through `lnScaled`, and one below `2^-maxBits` to `ψ(1) - 1 / x` with
  `ψ(1)` within `2 |x|`, so that any exponent is a value; a negative
  argument takes the reflection at its fractional part, folded to the
  half nearer zero, with `floorBall` deciding whether the ball lies inside
  one integer's cell or reaches a pole, and the sine's ball reaching zero
  reported as the pole. The message for the edge `pole` now reads "a pole
  of the function", `tan` and `digamma` sharing it.
- **6.3, `lgamma` and `gamma`** (the same modules). `lgammaFixed` shares
  the shift and the series loop with `digammaFixed`: the loop is one
  routine over the term ratio's index factors, `2k / (2k + 2)` for
  `digamma` and `2k (2k - 1) / ((2k + 2) (2k + 1))` for `lgamma`. The
  shift's product `x (x + 1) … (x + n - 1)` is kept as a mantissa at the
  working bits with a binary exponent, normalized after each factor, so
  that the `n` multiplications stay at the working bits (the product has
  some fifty thousand bits at the ceiling) and its logarithm is taken
  once, with the exponent as `lnFixed`'s scale; the first factor, `x`,
  which may come at extra bits when it is small, has its logarithm
  taken apart at those bits. `ln π` is memoized at the ceiling as the
  constants of D10 are, and `ln(2π) / 2` formed from it and `ln 2` per
  call. `gamma` takes the `lgamma` ball at the working bits plus the
  bits of its own magnitude, capped at 64 since past `2^64` the result
  passes the bound whatever the bits, so that the logarithm's absolute
  error, the result's relative one, stays below the working ulp:
  `gamma(1e15)` has a logarithm near `2^55`. The exact integer case
  calls `factorialOf`, so that `gamma` and `factorial` agree on what
  fits Most bits, and the kernel's value in log space is the remedy
  past it (`gamma(20001)`). Both functions take the expansion at zero
  for a tiny argument of either sign, `-ln |x|` within `|x|` for
  `lgamma`, and `digamma` now takes its own for a negative one too, so
  that `digamma(-1e-999999999)` is a value where the reflection could
  not form the fractional part. The sign of `Γ` on the negative side is
  the parity of the floor. A wide ball's `gamma` is sound but loose:
  the shift's product and Stirling's part carry the radius at their own
  slopes, `ψ(y) - ψ(x)` and `ψ(y)`, which cancel in the truth to `ψ(x)`
  and not in the interval, about six times the true width at `-2.5 ±
0.1`, and the exponential widens that into a ball reaching zero; a
  narrower ball shows its digits, and the retry loop narrows an
  `approx` one. Measured at the default ceiling: `lgamma`
  0.7 s a call and `gamma` 0.7 to 0.9 s, against `digamma`'s 1.3 s, the
  shift being a multiplication a step rather than a division; at a
  thousand digits 31 and 34 ms, where docs/calculator.md's estimate said
  a second (recorded there). The sweep's rules bound `ln Γ` from
  Stirling's series for an argument at or above ten, so that `gamma`'s
  `overflow` and `underflow` are checked as `exp`'s are. The factorial's
  refusals of a value it does not take (`notInteger`, `notExact`) now
  point at `gamma(x + 1)`.
- **6.4, `beta`** (`src/core/builtins/beta.ts`). The three logarithms
  come from `logGamma` of gamma.ts, exported with `magnitudeBits` and
  `isPole`, each at the working bits plus the bits of the largest
  argument's magnitude, uncapped: the logarithms cancel when an argument
  is large (`beta(1e15, 1)` is `1e-15` from logarithms near `2^55`),
  where `gamma`'s cap at 64 bits rests on its result passing the bound
  past `2^64`, which no difference does. An argument whose magnitude
  would need more bits than Most bits allows is `tooLarge`
  (`beta(1e20000, 2)`), since no value of the difference can be
  certified within the limit; the sweep's rule names that site. The sum
  `a + b` is formed exactly where it aligns within Most bits and
  otherwise as the larger within the magnitude of the smaller, as an
  inexact sum that does not align is formed, so that `beta(2.5,
1e-20000)` is a value and not the `tooLarge` of an exact sum; a sum
  at or past the top of the bound has both arguments positive and
  within a few digits of it, so the result lies past the bottom
  throughout and the call is `underflow`, which the sweep found where a
  first version passed the sum's `overflow` on (D18). The poles of all
  three are decided before any logarithm (`reachesPole`), since the
  retry loop would otherwise pay a logarithm at every pass up to the
  ceiling for `beta(1, approx(-2))`, seven seconds in a first version;
  a pole the sum reaches is blamed on the argument of the wider radius,
  as the classifier's `unresolved` at the bound is. The exact case
  calls `binomialOf`, so that `beta` and `binomial` agree on what fits,
  with the denominator's own bits checked against the limit once more
  for the factor `a + b - 1`; `beta(5000, 5000)` is exact, a fraction
  of ten thousand bits, and `beta(40000, 40000)` the kernel's value.
  The sweep's magnitude rule bounds `beta` for both arguments at or
  above two, where it decreases in each, by the integrand's maximum
  from above and `2^-(2 (a + b))` from below. The binomial's refusals of
  a value it does not take now point at `1 / ((n + 1) beta(n - k + 1, k
  - 1))`.
- **6.5, the incomplete gamma functions** (`src/core/builtins/incomplete.ts`,
  `src/core/fixed-incomplete.ts`). The continued fraction's bound is
  written, so the unbounded radius the note allowed until then is not
  used: for an order at or below one every element of Legendre's
  fraction is positive, so its convergents of even and odd index
  approach the value from the two sides and bracket it, and the
  difference of the last two is the truncation bound; an order above
  one is reduced into `(0, 1]` and stepped back up by the recurrence
  `Γ(a + 1, x) = a Γ(a, x) + x^a e^-x`, scaled by `e^x x^-a` so that
  every quantity is of order one, each step a multiplication and a
  division with every term positive. The series' tail bound is as the
  note has it, with the ratio taken from `|x|`, since a tiny argument
  converts to zero within an ulp. The kernel gives the factor of order
  one, `Σ` or `h`, and the built-in forms the rest as one exponential
  in log space, `e^(s ln x - x - ln s + ln Σ)` and its kin, with
  `expBall`'s classifier on the whole, so that a value past the bound
  is refused as `exp`'s is; a first version classified the exponential
  apart from the factor, which the sweep caught where the factor was
  large. The route is chosen by cost, mpmath's region rule refined: the
  fraction's convergents number about `(bits ln 2)^2 / (7 x)`, measured
  (768 at forty digits for `x = 1.5`, 443,000 at a thousand), each a few
  times a series term's cost, and the series' terms about `x - s` to
  the largest plus what the bits need, or `sqrt(2 s bits ln 2)` where
  `x` is near a large `s`; the cheaper runs within the limits (50,000
  terms, 20,000 convergents, 20,000 reduction steps), except that the
  upper form takes the fraction where the series' complement would lose
  half the working bits to cancellation and the pass would not certify.
  Past both limits, a large order with the argument at or past it
  (`uppergammareg(1e6, 1.5e6)`, `lowergammareg(1e8, 1e8)`), the call is
  `tooLarge`, a refusal that is never wrong about the value, rather than
  digits nothing certifies; the uniform asymptotic expansions that
  regime wants are not in this design, and the refusal's message speaks
  of Most bits where the limit is one of cost (issue #107 has the
  regime's map and the ways out). Within the limits the complement
  keeps the digits below one, since the exponential is taken at the
  working digits rather than the context's:
  `uppergammareg(1e6, 1.01e6)` is `1.06e-23`. The logarithm is formed at
  the working bits plus the bits of the magnitudes of `s` and `x`, as
  `beta`'s is, since the exponent `s ln x - x - ln Γ(s + 1)` cancels;
  past Most bits that is `tooLarge` too. Where the form computed passes
  the bottom of the bound, its complement is `Γ(s)` or one within
  `10^-(10^18)`. An argument whose radius is above `2^-16` of its
  magnitude is taken at its two ends and the results hulled, each form
  being monotone in `x`, since the fraction's denominators reach zero
  over such a width (the sweep's `3e18 ± 2e18`). The fraction's stop is
  the difference of the last two convergents alone, compared every
  eighth step, since their errors grow by an ulp or so a step while the
  difference shrinks to nothing; a first version compared the
  difference with the errors added and ran every fraction to its limit.
  Measured for the regularized upper form: one to two milliseconds a
  call at forty digits, forty to eighty at a thousand, and about a
  second at the default ceiling, two for `x = 1000`, the logarithm of
  `Γ` and the series or fraction at the ceiling's bits. The sweep's
  rules bound the four functions from the series' first term and
  `x^s / s`, and the upper form from `x^(s - 1) e^-x`, the fraction's
  third convergent, and `Γ(s)`.
- **6.6, `erf` and `erfc`** (`src/core/builtins/erf.ts`). Both are
  the incomplete gamma functions of order one half at `x^2`, through
  `incompleteGammaBall`, which chooses its route by cost and takes the
  complement where the other form is the one computed, so nothing here
  decides where `erf` is near one: `erfc(10)` keeps its digits because
  the routine computes `Q` by the fraction there and `P` as `1 - Q`.
  The classifier on `-x^2` is the routine's `expBall` on its exponent
  `s ln x^2 - x^2 + …`, so `erfc(1.6e9)` is `underflow` and
  `erfc(1.5e9)` a value of exponent `-9.8e17`. An argument at or beyond
  `2^bits`, whose square the routine is not handed, is the limit within
  the bound's edge, `erfc(|x|)` being below `e^-x^2 < 10^-(10^18)` there,
  and `erfc` of such a positive argument is `underflow`; a tiny argument,
  whose square passes below the bound or below `2^-maxBits`, is `2x /
√π` within `|x|^3`, the series' next term being `-2x^3 / (3 √π)`. A
  ball touching or straddling zero, whose square the routine refuses, is
  taken at its ends and the results hulled, both functions being
  monotone, by `hullOfEnds` of builtin.ts, which the incomplete gamma
  functions' wide argument now shares: a value beside a refusal past the
  bottom is the value's hull with zero (`erfc(0 ± 1e30)` covers two
  and zero), one beside a refusal past the top is `unresolved` at the
  bound, and two midpoints too far apart to align take the sum of their
  magnitudes, which a first version's exact difference overflowed on
  (`erfc(0 ± 1e9)`, the sweep). The sweep's rule bounds `erfc` between `e^-x^2 / (√π (x +
1))` and `e^-x^2` for `x` at or above one, and between one and two
  below zero. A call is one to three milliseconds at forty digits, the
  routine's cost.
- **6.7, the incomplete beta function** (`src/core/builtins/incbeta.ts`,
  `src/core/fixed-incbeta.ts`). The series with positive terms stands in
  for the note's continued fraction, by the ruling on the PR of 6.7: the
  fraction's elements have both signs for every `a` and `b`, so unlike
  the gamma fraction nothing brackets it, and no truncation bound is
  known; the series `I_x(a, b) = x^a (1 - x)^b / (a B(a, b)) Σ ((a +
b)_n / (a + 1)_n) x^n` (DLMF 8.17.22) has every term positive and a
  ratio of consecutive terms `(a + b + n) x / (a + 1 + n)` tending to
  `x`, falling with `n` for `b >= 1` and rising toward `x` below, so the
  larger of the next ratio and `x` bounds every later one and the tail
  after a term is at most that term times `r / (1 - r)`, the bound
  owed. Every result is therefore certified, and the interim rule of an
  unbounded radius is not used. The symmetry `I_x(a, b) = 1 - I_(1-x)(b,
a)` is the choice of orientation by estimated terms, which the region
  rule `x < (a + 1) / (a + b + 2)` approximates: in that region the
  terms fall from the first, and the cheaper orientation is often the
  other one (`(1000, 1, 0.99)` takes 89 terms swapped against 11,837
  direct at forty digits), with the complement taken from it, except
  where the complement would lose half the working bits to
  cancellation, the value wanted being tiny, which the prefactor
  estimates. The kernel gives the sum and the built-in forms the rest as
  one exponential in log space, `e^(a ln x + b ln(1 - x) - ln a + ln
Σ)` less the three `ln Γ` regularized, at the working bits plus the
  bits of the parameters' magnitudes, under `expBall`'s classifier
  (D18); the exponential is taken at the working digits so that a
  complement keeps the digits below one, and a tiny `x` whose complement
  does not align within Most bits has it as one within `|x|`. Past the
  term limit of 50,000 in both orientations, large parameters near the
  median (`incbetareg(1e6, 1e6, 0.5)` at a thousand digits), the call is
  `tooLarge`, the regime of issue #107; a term whose error reaches its
  value ends the sum, wide parameters' intervals growing through the
  ratios, and where no tail bound holds there the call is `unresolved`,
  retried narrower. The exact polynomial for whole
  numbers at a rational `x = p / q` is one integer over `q^(a + b - 1)`,
  the binomial stepped exactly, formed where that power fits Most bits
  and `a + b - 1` is at most ten thousand; a first version took a power
  and a reduction per term, 600 ms for `(1, 1000, 0.01)`, now 60 ms,
  and the whole numbers' `B(a, b)` comes from `beta`. A wide or
  edge-touching ball of `x` is taken at its ends (`hullOfEnds`), the
  function rising with `x`. The sweep gained a third-operand set and the
  cube of the second operands for three-argument functions, closed-form
  references at a parameter of one (`x^a` and `1 - (1 - x)^b`), and
  bounds from the series' prefactor and the ratio `ρ = max(1, (a + b) /
(a + 1)) x`. Measured at forty digits: a few milliseconds a call for
  moderate parameters, fifty for `(1e4, 1e4, 0.5)`.
