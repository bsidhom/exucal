# Built-in functions

Status: design note for stage 3 of docs/calculator-plan.md, written from
the plan's decisions (D4, D9, D10, D11, D15) and tasks 3.1 to 3.13 before
the stage was implemented; "Implementation notes" at the end records where
the code departed from it. docs/calculator.md ("Elementary functions") is
the study this follows.

A built-in is a function the core implements in code rather than a
definition in units.txt: `pi()`, `exp`, the logarithms, the roots, `pow`,
the trigonometric and hyperbolic functions and their inverses. It lives in
the function namespace beside the defined functions, so it is called as
they are (`exp(1)`, `atan2(3 m, 4 m)`), a definition body may call it, and
a definition of the same name is the duplicate the build already rejects.
It has no inverse, so its name is not a `want`.

## Names

- **Euler's number is `exp(1)`**, as in GNU units: `e` is the elementary
  charge in units.txt and `W` is the watt, so neither is free for a
  constant, and `pi()` is a call for the same reason a body can write it,
  to get the precision of the table it is built in (D6).
- **`log` is the two-argument logarithm**, `log(b, x)`, the base first
  so that it reads as `log_b(x)`, and `ln`, `log10` and `log2` are the
  one-argument ones. `log(x)` alone would have to choose between the
  natural logarithm (C, Python, JavaScript) and the common one (GNU
  units), and a call that never has to choose is not ambiguous.
- **The decibel is `decibel`**, a defined function in units.txt (3.12),
  not `dB`: `d-` is a prefix and `B` a unit, and a function's name may not
  read as a prefix followed by a unit, the rule that keeps `u` and `at`
  out of the file. The neper is `neper` and the bel `bel`.
- **Lambert's function is `lambertw`** when stage 6 adds it, since `W` is
  taken.
- **`approx(x)` is the value known to the working precision and no
  better** (docs/approximate.md; stage 4's 4.10): the one way to make an
  exact value inexact on purpose, of any dimension, never narrowing.
- No built-in collides with a unit of units.txt or reads as a prefix
  followed by one: `pi`, `exp`, `ln`, `log`, `log10`, `log2`, `sqrt`,
  `cbrt`, `pow`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`,
  `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`, `approx`, and the
  exact functions of stage 6 (docs/special.md): `abs`, `sign`, `floor`,
  `ceil`, `trunc`, `round`, `div`, `mod`, `gcd`, `lcm`, `factorial`,
  `binomial`, `doublefactorial`, and its Gamma family: `digamma`,
  `lgamma`, `gamma` and `beta`. The
  build
  checks both for any table it builds. Prefixes apply to units alone: a
  call's name is looked up exactly, so `kpi()` and `mexp(1)` are calls of
  nothing, and no built-in is a prefix of another's name either.

## Arity

The grammar accepts a call with any number of arguments, `f()`, `f(x)`,
`f(x, y)`, and what a function accepts is its own (3.1). A built-in
declares a range `{ min, max }`; every function of this stage takes one
fixed count, and no function is variadic. A defined function takes exactly
its parameters. A call with the wrong count is an `arityMismatch`, checked
once the name has resolved and before any argument is evaluated.

## The rules every built-in follows

- **A built-in returns the kernel's ball as it is** (D15): its midpoint is
  the value `fixedToBall` hands back, rounded onto the working digits, its
  radius the kernel's error and that rounding, and
  it rounds in no mode. The evaluator settles every result it produces,
  so the built-in does not; the mode is the display's alone in exact mode,
  and the settle's in decimal mode, where a call rounds once, on its
  result (stage 4's 4.5).
- **An exact case returns an exact ball**, radius zero, wherever the value
  is rational and cheaply recognized. Which cases are listed per function
  below; the rest of the time the result is a ball however round it looks
  (`ln(8) / ln(2)` is `≈ 3`).
- **An argument of unbounded radius** gives the function of its midpoint
  with an unbounded radius, as `rootBall` rules.
- **A tiny argument keeps its digits.** The odd functions (`sin`, `tan`,
  `asin`, `atan`, `sinh`, `tanh`, `asinh`, `atanh`) are close to the
  identity near zero, so the built-in converts a small argument to the
  kernel at the working bits plus its negative binary exponent, as
  `rootBall` scales its argument, and `sin(1e-50 radian)` certifies on the
  first pass rather than at the ceiling. An argument throughout below
  `2^-maxBits`, which the kernel cannot be handed at any bits within the
  range limit, is answered by its expansion at zero (stage 4's 4.4): the
  odd functions give the argument itself within its cube, `cos` and
  `cosh` give one within its square, and `exp` gives one within twice
  the argument's magnitude, so `sin(1e-999999999 radian)` is
  `≈ 1e-999999999` on the first pass and `exp(1e-999999999)` is `≈ 1`.
  `asin` and `acos` take their expansion already where the argument's
  square lies below `2^-bits` of the working precision, `acos` as `pi/2`
  less the argument, since `1 - x^2` stops aligning within the range
  limit long before `2^-maxBits` (the plan's H.7: `acos(1e-9860)` was
  refused at the default range limit, issue #47).
  Between that and half an ulp of the working bits, the kernel's door
  (`fixedFromScaled`) converts the argument to zero within an ulp, which
  is what the log-space power of a tiny exponent goes in as; `atan2`'s
  tiny ratio over a positive `x` is its own arctangent within its cube,
  as `atan`'s argument is, and against a negative `x` or a `y` far larger
  than `x` the ratio is not formed at all (the plan's H.7, below). Under
  a directed rounding mode these show `≈ 1` with no digit
  certain, since the ball straddles one, as `cosh(1e-999999999)` and
  `approx(1)` already do.
- **A large argument is answered before the kernel is entered** (4.4),
  which holds a value only up to the range limit: `sin`, `cos` and `tan`
  of an argument reaching `2^maxBits` are `tooLarge` at the range limit,
  since the reduction would need `pi` to that many bits; `atan` of one at
  or beyond `2^bits` throughout is `±pi/2` within `2^-bits`, and neither
  `atan` nor `atan2` is refused for an argument's radius: a ball that
  reaches `2^maxBits` without lying beyond `2^bits` throughout is the
  function's whole range, zero within two for `atan` and within four for
  `atan2` (the powers of two above `pi/2` and `pi`, the kernel's own
  trivial bound; nothing certified would differ with the fractions of
  pi themselves), which certifies nothing and lets the retry loop narrow
  it, apart from a ratio `x / y` with `x` straddling zero and `y` of
  definite sign, which is `unresolved` at `x`, since the value then
  ranges over nearly all of `(0, pi)` and which end it lies near is
  `x`'s side of zero (the plan's H.7, issue #64); `asinh` and `acosh` of one are
  `ln(2|x|)` within `1/(2x^2)`; `tanh`'s saturation to `±1` stands; and
  the logarithms take any exponent, `ln(m × 10^e)` being `ln m + e ln 10`
  from the memo, so `ln(1e999999999)` is a value and `log10(1e999999999)`
  exactly `999999999`.
- **A result whose decimal exponent would pass the exponent bound**,
  `10^18`, is refused before anything is computed when every value of
  the argument's ball puts it past the bound: `exp`, `sinh`, `cosh` and
  `pow` hold an interval bounding the result's logarithm to the bound's
  edges (the classifier of ball.ts; the plan's D18 and H.15), and the
  error names the side, an `underflow` for `exp` of a negative argument
  and a power toward zero (`exp(-1e30)`), an `overflow` otherwise, `sinh`
  and `cosh` of either sign included. An argument whose ball reaches
  across an edge, so that the result is a value for some of its values
  and past the bound for others, is `unresolved` at the edge `bound`,
  which the pipeline retries at more digits
  (`exp(approx(1e999) - approx(1e999 - 5))` is `5` within `2e948` at its
  first pass and `≈ 148.41316` at its sixth, issue #40). Within it these
  functions have the
  range of an exponent (4.9): `exp(1e6)` is `≈ 3.0332154e434294` and
  `exp(1e18)` a value with the exponent `434294481903251827`, since the
  kernel returns a `Floating`, a mantissa with a binary exponent, and the
  digits of one whose exponent cannot be formed are found in log space
  (digits.ts).
- **Propagation** is by running the series on the argument with its error
  included (D9), so no derivative bound is written separately; the
  truncation bound of a series is taken at the upper end of the argument's
  interval.

## Dimension rules

Each built-in states the dimensions its arguments must have and the
dimension of its result, checked before it is applied; a failure is a
`builtinArgument` error at the call, worded from the data (3.2).

| Function                                          | Arguments                                       | Result         |
| ------------------------------------------------- | ----------------------------------------------- | -------------- |
| `pi()`                                            | none                                            | plain number   |
| `exp`, `ln`, `log10`, `log2`, `sqrt`, `cbrt`      | a plain number                                  | plain number   |
| `log(b, x)`, `pow(x, y)`                          | two plain numbers                               | plain number   |
| `sin`, `cos`, `tan`                               | an angle: the `radian` kind                     | plain number   |
| `asin`, `acos`, `atan`                            | a plain number                                  | `radian` kind  |
| `atan2(y, x)`                                     | two quantities of one dimension, kinds included | `radian` kind  |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | a plain number                                  | plain number   |
| `approx(x)`                                       | any quantity, kinds included                    | the argument's |

**Angles (D11).** `sin`, `cos` and `tan` require the `radian` kind, which
every angle unit of units.txt carries (`deg` is `pi() radian / 180`, so
`sin(30 deg)` is `sin(pi() / 6)` inside the kernel, which sees the
magnitude in radians because `radian` is the primitive). A plain number
is a kind mismatch, worded to say that an angle is wanted and how to write
one: `sin(1 radian)`, `sin(pi() radian / 4)`. `sin(0)` is that mismatch
too, as `1 m + 0` is; `sin(0 radian)` is the exact zero. The inverses
return the `radian` kind, so `asin(0.5)` converts into `deg`,
`sin(asin(0.5))` evaluates and `asin(sin(x))` has the kind `x` has; `2
asin(0.5) + 1` is the kind mismatch it is, and the number is one token
away: `asin(0.5)` into `turn`, or `/ radian`. `atan2(y, x)` takes two
quantities of one dimension, so `atan2(3 m, 4 m)` works and `atan2(3 m, 4
s)` is a dimension mismatch. The hyperbolic functions take and return
plain numbers, since their arguments are not angles. The rule names the
primitive `radian` by convention; a table that declares no such primitive
has no angles, and the trigonometric functions say so.

The alternative the study allows, "dimensionless, or the radian kind
treated as 1", with the inverses returning plain numbers, would make
`sin(pi())` valid and `asin(0.5)` unconvertible into `deg`, and would let
a physicist's `sin(2 pi() f t)` pass while `asin(sin(x))` lost its kind.
Kinds exist to keep an angle from being mistaken for a number, and the
degree-radian confusion is the mistake they were introduced against, so
this design keeps them strict; its cost is that `sin(pi())` is written
`sin(pi() radian)` and `sin(2 pi() f t)` is written `sin(f t turn)`,
which is what it says.

## Domains, exact cases and edges

A `domain` error is a value outside the function's domain throughout its
ball, located at the call and naming the argument. An `unresolved` is a
ball that straddles an edge of the domain, or another point where the
result depends on which side the true value lies (D4): the error names
the edge, the retry loop raises the precision, and at the ceiling the
message says the value cannot be told from that edge.

| Function               | Domain                                                 | Exact cases                                                                                                   | Edges an `unresolved` names                 |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `pi()`                 |                                                        | none                                                                                                          |                                             |
| `exp`                  | all                                                    | `exp(0)`                                                                                                      |                                             |
| `ln`, `log10`, `log2`  | `x > 0`                                                | `ln(1)`; an integer power of the base                                                                         | zero                                        |
| `log(b, x)`            | `b > 0`, `b ≠ 1`, `x > 0`                              | `x` an integer power of `b`, or `b` of `x`                                                                    | zero for `b` and `x`; `1` for `b`           |
| `sqrt`                 | `x >= 0`                                               | a perfect square                                                                                              | zero                                        |
| `cbrt`                 | all                                                    | a perfect cube                                                                                                |                                             |
| `pow(x, y)`            | `x > 0`, or `x <= 0` with a rational `y` as `^` allows | `x` a perfect `q`-th power for `y = p/q`; `pow(x, 0)` is `1`; the bases `0`, `1` and `-1` for any `y` (below) | zero for `x`; zero for `y` when `x` is zero |
| `sin`, `cos`, `tan`    | all                                                    | zero: `sin(0 radian)`, `cos(0 radian)`, `tan(0 radian)`                                                       | a pole of `tan`                             |
| `asin`, `acos`         | `[-1, 1]`                                              | `asin(0)`, `acos(1)`                                                                                          | `1`, `-1`                                   |
| `atan`                 | all                                                    | `atan(0)`                                                                                                     |                                             |
| `atan2(y, x)`          | not both zero                                          | `atan2(0, x)` for `x > 0`                                                                                     | zero for `y`, when `x` is not positive      |
| `sinh`, `cosh`, `tanh` | all                                                    | zero: `sinh(0)`, `cosh(0)`, `tanh(0)`                                                                         |                                             |
| `asinh`                | all                                                    | `asinh(0)`                                                                                                    |                                             |
| `acosh`                | `x >= 1`                                               | `acosh(1)`                                                                                                    | `1`                                         |
| `atanh`                | `-1 < x < 1`                                           | `atanh(0)`                                                                                                    | `1`, `-1`                                   |

**`pow`, and `^` with it.** `pow(x, y)` is for a plain base and a plain
exponent; a power of a quantity is written with `^`, whose exponent is a
literal so that the dimension stays exact. The two share one rule for the
magnitude (3.8): an integer exponent is the exact power; a rational
exponent `p/q` is exact when `x` is a perfect `q`-th power (`pow(8, 1/3)`
is `2`, `pow(1/4, 3/2)` is `1/8`), which `exactRoot(x, q)` finds without
forming `x^p`; otherwise the root of the power when `x^p` fits the range
limit, which also serves a negative base under an odd root; otherwise,
and for an inexact exponent, `exp(y ln x)` for a positive base. An exact
exponent whose fraction does not fit the range limit takes the same log
space (the plan's H.16), an exact base told past the bound by its value
first: `pow(2, 1e999999999)` is `overflow`, `pow(2, 1e-999999999)` and
`pow(2, 1e-30000)` are `≈ 1` where they were refused at the range limit,
and a negative base takes the exponent's parity from its canonical form,
so `pow(-2, 1e-30000)` is the even root of a negative number. The root
itself goes to log space when the kernel cannot take it: a degree past
`2^32` (`pow(3, 1e-30)`, whose root is the `10^30`-th), or a mantissa too
far below one for the working bits (`(7^-8000)^(1/99999)`), each of
which crashed or was shown as zero before the plan's H.5. Log space
is where `2^0.1234567` computes, since `2^1234567` does not fit any range
limit, and `pow(10, 2.3456789)` too, since 4.4 by the root: `10^23456789`
is exact in the exponent, but its root leaves `10^3456789` to the kernel,
which the range limit does not hold; what log space gives up is
exactness where none was reachable. A non-positive base with an inexact
exponent is a domain error, a negative base under an even root the
`negativeRadicand` that
`(-1)^(1/2)` is, and a base straddling zero `unresolved`. Three bases
need no arithmetic and are answered before the exponent's fraction is
formed (the plan's H.6): `pow(1, y)` is exactly `1` for any `y`, an
inexact or a huge one included (`pow(1, approx(1e400))`,
`pow(1, 1e999999999)`); `pow(0, y)` is `0`, a division by zero or
`unresolved` at zero by the side of zero `y` lies on (`pow(0,
1e999999999)` is `0`); and `pow(-1, y)` for an exact `y` whose fraction
does not fit the range limit is decided by the parity the canonical form
of the exponent gives, `1` for `1e999999999` and `1e999999999/3`, `-1`
for `5^-16000`, and the even root of a negative number for `1e-30000`;
an exponent that fits keeps the rational route, so `pow(-1, 1/3)` is
`-1` and `pow(-1, 2/3)` is `1`. Before that, stage 4 formed the fraction
first and refused each of them (issue #46).

**`log`'s exact cases** are integer exponents either way: `log(2, 8)` is
`3`, `log(3, 1/9)` is `-2`, `log(8, 2)` is `1/3`. A rational exponent in
general is not looked for, so `log(4, 8)` is `≈ 1.5`.

## Memoized constants (D10)

The values of `pi()`, `exp(1)`, `ln(2)` and `ln(10)` are each computed
once, at the ceiling of the retry schedule plus 64 bits, and every request
the schedule can make is truncated from that value; a higher ceiling
replaces it. The four calls are the exact cases the memos serve, and any
other call of `exp` or `ln` computes its own value; `log10` and `log2`
divide by the memoized `ln(10)` and `ln(2)`. The margin serves
the argument reduction of `sin` and `cos`, which needs `pi` to the working
bits plus the argument's bit length, so that arguments below `2^64` are
served from the memo at every pass; a larger argument computes `pi` for
the call and keeps nothing.

## Where it goes

- `src/core/expr.ts`: calls with any number of arguments (3.1).
- `src/core/builtin.ts`: the `Builtin` type, the error types and the rule
  helpers every built-in shares (3.2).
- `src/core/builtins/`: one module per built-in (`pi.ts`, `exp.ts`,
  `pow.ts`, `approx.ts`), several sharing a module only when they share
  internal machinery (`log.ts`, `roots.ts`, `trig.ts`, `inverse-trig.ts`,
  `hyperbolic.ts`), each with its test beside it (3.4, 3.6 to 3.11,
  4.10).
- `src/core/builtins.ts`: `BUILTINS`, the app's built-ins gathered by name
  from those modules; the table and the build take it as their default
  set.
- `src/core/fixed-exp.ts`, `fixed-log.ts`, `fixed-trig.ts`: the kernel
  routines, `expFixed` and `sinhCoshFixed`, `lnFixed`, `sinCosFixed` and
  `atanFixed`, beside fixed.ts, which keeps the representation, the exact
  operations and the roots; the routines are below the ball so that
  `powRationalBall` can reach `exp` and `ln`.
- `src/core/constants.ts`: `pi` and `e`, memoized by one rule; `ln(2)`
  and `ln(10)` are memoized the same way in fixed-log.ts, which computes
  them.
- `src/core/table.ts`, `src/core/evaluate.ts`, `src/core/build.ts`: the
  resolved function as a union, the call case, the duplicate and the
  prefixed-name checks (3.2); the ceiling in the context and the table at
  it (3.3); the check over dimensions (3.5).
- `src/messages.ts`: the wording of the new errors.
- `src/units.txt`: `pi()` in place of the literal (3.4); the neper, the
  bel and the decibel (3.12).
- `src/limits.ts`: the probe's composite of the costliest built-ins
  (3.11).

## Implementation notes

Where the code departed from the note above, or settled what it left
open; docs/calculator-plan.md ("Stage 3 as it landed") has each task's
rulings in full.

- **Two more rules every built-in follows.** A built-in that reaches the
  kernel is one of the modules under `builtins/`, which does the
  dimensionless checks, the exact cases and the conversion (a tiny
  argument of an odd function at the working bits plus its negative
  binary exponent), and hands a routine beside fixed.ts a `Fixed`; the
  routine reduces, runs its series with the argument's error included,
  and cuts the result to the bits its magnitude calls for. And an
  argument whose interval is too wide for a routine's series (about a
  fifth of a radian for `sin` and `cos`, one radian for `atan`, one half
  for `asinh`, one for `tanh` and for `exp`) gets a trivial bound
  instead, zero within one for the sine, the cosine and the hyperbolic
  tangent, zero within two for the arctangent (and for `atan` of a ball
  reaching `2^maxBits`, zero within four for `atan2`'s ratio), zero within the
  exponential of the signed upper end for `exp`, the exponential of
  the largest magnitude for the hyperbolic pair, the value at the
  midpoint plus the radius for `asinh`; the retry loop narrows such an
  argument.
- **The series.** `exp` sums its Taylor series term by term after halving
  the argument below `2^-8`; `ln` takes `2 atanh((m - 1) / (m + 1))` after
  eight square roots, the series in `z^2` summed by rectangular splitting
  (about `2 sqrt(N)` multiplications for `N` terms, since V8 multiplies
  integers of the ceiling's size by the schoolbook rule); `sin` and `cos`
  share one reduction by `pi/2` and one set of powers of `-r^2`, their two
  series summed the same way with one division per block; `atan` inverts
  above one, halves the angle eight times through the square root, and
  takes the logarithm's series in `-z^2`; `sinh` and `cosh` take the
  sine's and the cosine's series in `x^2` below one and the exponential
  above it, `tanh` the quotient before either is cut; `asin` and `acos`
  are arctangents of `x / (1 + sqrt(1 - x^2))` and `sqrt(1 - x^2) / (1 ±
x)`, `atan2` an arctangent by quadrant, and `asinh`, `acosh` and
  `atanh` logarithms of `x + sqrt(x^2 ± 1)` and `(1 + x) / (1 - x)`, the
  logarithm's argument converted at the bits that keep its small part.
  Every routine costs 9 to 13 ms at the default ceiling of 4,040 digits
  on the machine of the plan's 3.11 (bench/kernel.bench.ts reports each).
- **The edges.** A ball touching an end of a domain counts as straddling
  it (`asin` of `[0.5, 1]`, `acosh` of `[1, 1.5]`, `atanh` of `[0.5, 1]`
  are `unresolved` at the edge), as `sideOfZero` counts a ball touching
  zero, and `asin(±1)`, `acos(-1)`, `atan2(0, x < 0)` and `atan2(±y, 0)`
  are the memo's `pi` and its halves rather than exact cases. `atan2` with
  `y` exactly zero is the exact zero for `x` positive throughout, `pi`
  for `x` negative throughout, `unresolved` at `x` for one straddling
  zero, and the `origin` error for one exactly zero.
- **The limit on large results.** `exp`, `sinh`, `cosh`, a power in log
  space and a large decibel shared one guard, `expFits` in ball.ts, and
  were `tooLarge` beyond about 45,000 at the default range limit; `tanh`
  was not, since for an argument beyond what the working bits can tell
  from one it is `±1` within `2 e^-2|x|`, a radius the coarse type holds
  at any magnitude. Since 4.9 the guard is the exponent bound, the squaring loop
  of `expFixed` renormalizes into a binary exponent, so a large argument
  costs sixty squarings at the working bits, and `sinh` and `cosh` fold
  the reciprocal into the error beyond half the working bits; the
  kernel-to-ball conversion rounds onto the decimal grid of the working
  digits since 4.4 and takes any exponent, through digits.ts for one the
  range limit cannot hold. Since the follow-up of the plan's "After stage
  4" the guard refuses with the bound's own errors, an `overflow`, or an
  `underflow` for `exp` of a negative argument and a power toward zero,
  and a large decibel no longer reaches it: its body's power of ten is
  exact, and the exponent takes it (`decibel(1e30)` is refused at the
  bound by the exact power). Since H.15 the guard is the classifier
  (`classifyExp`, `classifyHyperbolic`, `classifyPower` in ball.ts),
  which refuses only when the whole ball is past an edge and leaves a
  ball across one `unresolved` at the bound, as the rule above says.
  `tanh` has no guard, and is never refused
  for its argument's size: a ball of radius one half or more that is not
  saturated, reaching both sides of zero or not, is zero within one, the
  function's whole range, which certifies nothing and lets the retry loop
  narrow it (before that it reached the exponential's guard, issue #49,
  and on the kernel a wide interval read as saturation, issue #38), and
  with no saturation and a radius below one half the argument the kernel
  is handed stays below about 181,727 at the largest ceiling the
  settings allow.
- **The memos.** Four constants at the ceiling plus 64 bits; the margin
  serves the reduction of `sin` and `cos` for every argument below `2^64`
  at the ceiling pass exactly, the reduction taking pi at the bits asked
  for plus the bit length of the argument's integer part, and a larger
  argument computes pi for the call. The probe of limits.ts leaves the
  memos at the largest ceiling it tried.
- **What the probe times.** One expression of the four costliest routines,
  `sin(atan(exp(1)) + ln(3) radian)`, at the candidate's ceiling. Timing
  it found that the evaluator's exact arithmetic on settled midpoints ran
  Euclid's gcd on dyadics of the ceiling's size, tens of milliseconds a
  sum; the gcd in rational.ts now strips the common power of two first.
- **The propagation** counts an argument's error wherever the argument
  appears in a series, so a radius exceeds the derivative bound by a
  small factor where it appears twice (`sin(1 ± 1e-20)` has radius
  `6e-21` against `cos(1) × 1e-20`), the price of D9's rule over a
  derivative bound.
