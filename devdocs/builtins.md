# Built-in functions

A built-in is a function the core implements in code rather than a
definition in `units.txt`: `pi()`, `exp`, the logarithms, the roots,
`pow`, the trigonometric and hyperbolic functions and their inverses,
`approx`, the exact functions (`abs`, `floor`, `gcd`, `factorial` and
their kin), and the Gamma and Beta families with the incomplete
functions, `erf` and `erfc`. [docs/functions.md](../docs/functions.md)
lists them from the user's side; this page says how they are built and
the rules each one follows. [numbers.md](numbers.md) is the arithmetic
they run on.

A built-in (`Builtin` in `builtin.ts`) is a name, the count of arguments
it takes, a dimension rule from its arguments' dimensions to its
result's, and the function itself from balls to a ball at a working
context. It lives in the function namespace beside the defined
functions, so it is called as they are, a definition body may call it,
and a definition of the same name is the duplicate the build rejects; a
call's name resolves to a defined function first and a built-in second
(`resolveFunction` in `table.ts`, the one order the table's lookup and
the build's share). It has no inverse, so its name is not a `want`; used
as a unit, or typed as a `want`, it is `functionAsUnit`, whose message
writes `pi()` for arity zero, `exp(value)` for one argument and
`log(value, value)` for two. Each built-in lives in a module of its own
under `builtins/`, several sharing one only when they share internal
machinery, with its test beside it; `builtin.ts` holds the type, the
error types and the rule helpers every such module
imports, and `builtins.ts` gathers the modules into `BUILTINS`, a map by
name, so that no module under `builtins/` depends on the map. The table
carries the set it was built against (`UnitTable.builtins`), and
`buildTable` takes the set as a parameter with `BUILTINS` as its default,
so that the build's disjointness check and the table's lookup work from
one set and a test can build against a built-in of its own.

## Names

- **Euler's number is `exp(1)`**, as in GNU units: `e` is the elementary
  charge in `units.txt` and `W` is the watt, so neither is free for a
  constant, and `pi()` is a call for the same reason a body can write it,
  to get the precision of the table it is built in.
- **`log` is the two-argument logarithm**, `log(b, x)`, the base first so
  that it reads as `log_b(x)`, and `ln`, `log10` and `log2` are the
  one-argument ones. `log(x)` alone would have to choose between the
  natural logarithm (C, Python, JavaScript) and the common one (GNU
  units), and a call that never has to choose is not ambiguous.
- **The decibel is `decibel`**, a defined function in `units.txt`, not
  `dB`: `d-` is a prefix and `B` a unit, and a function's name may not
  read as a prefix followed by a unit, the rule that keeps `u` and `at`
  out of the file. The neper is `neper` and the bel `bel`; the three
  stand with the temperature readings in the file, their bodies calling
  `exp`, `pow`, `ln` and `log10`.
- **The incomplete functions** are `lowergamma`, `uppergamma`,
  `lowergammareg`, `uppergammareg`, `incbeta` and `incbetareg`: lower
  case as every built-in's, saying which function they are and whether it
  is regularized by the suffix `reg`. A one-letter name such as `P` is
  one a user's own definitions would want, and says nothing.
- No built-in collides with a unit of `units.txt` or reads as a prefix
  followed by one, and the build checks both for any table it builds.
  Prefixes apply to units alone: a call's name is looked up exactly, so
  `kpi()` and `mexp(1)` are calls of nothing, and no built-in is a prefix
  of another's name either.

## Arity

The grammar accepts a call with any number of arguments, `f()`, `f(x)`,
`f(x, y)`, and what a function accepts is its own: a built-in declares a
range `{ min, max }` (`round` takes one or two, every other built-in one
fixed count), a defined function takes exactly its parameters, and no
function is variadic (`max`, `min` or `gcd` over a list would need only an
unbounded `max` in the range and no change to the grammar, and none is
planned). A call with the wrong count is an `arityMismatch`, checked once
the name has resolved and before any argument is evaluated, since the
count is about the call's shape: `tempC(bogus, 1)` is the arity error and
not the unknown unit.

## The rules every built-in follows

- **A built-in returns the kernel's ball as it is**: its midpoint the
  value `fixedToBall` hands back, rounded onto the working digits, its
  radius the kernel's error and that rounding, and it rounds in no mode.
  The evaluator settles every result it produces, so the built-in does
  not; the mode is the display's alone in exact mode. In decimal mode a
  call is one step: the evaluator runs the built-in at the working
  precisions of the retry schedule, in exact mode, until the ball it
  returns certifies the digits asked for in the rounding mode, and takes
  that rounding ([numbers.md](numbers.md), "Decimal mode"). A built-in
  therefore never sees a decimal-mode context; `approx` alone declares
  itself the identity there (`decimal: "identity"`).
- **An exact case returns an exact ball**, radius zero, wherever the
  value is rational and cheaply recognized; the rest of the time the
  result is a ball however round it looks (`ln(8) / ln(2)` is `≈ 3`).
- **An argument of unbounded radius** gives the function of its midpoint
  with an unbounded radius (`unboundedOf`), the midpoint held to the
  domain.
- **A built-in that reaches the kernel is two parts.** The module under
  `builtins/` does the dimensionless checks, the exact cases and the
  conversion, and hands a routine beside `fixed.ts` a `Fixed`; the
  routine reduces, runs its series with the argument's error included
  from the start, and cuts the result to the bits its magnitude calls
  for (`keepSignificant`). Propagation is by running the series on the
  argument with its error, so no derivative bound is written separately,
  and the truncation bound of a series is taken at the upper end of the
  argument's interval. The count follows the argument's error wherever
  the argument appears in a series, so a radius exceeds the derivative
  bound by a small factor where it appears twice (`sin(1 ± 1e-20)` has
  radius `6e-21` against `cos(1) × 1e-20`), the price of the rule over a
  derivative bound.
- **A tiny argument keeps its digits.** The odd functions (`sin`, `tan`,
  `asin`, `atan`, `sinh`, `tanh`, `asinh`, `atanh`) are close to the
  identity near zero, so the built-in converts a small argument to the
  kernel at the working bits plus its negative binary exponent
  (`extraBits`, held to the significand limit), as `rootBall` scales its
  argument, and `sin(1e-50 radian)` certifies on the first pass rather
  than at the ceiling.
- **A wide argument gets a trivial bound.** An argument whose interval is
  too wide for a routine's series (about a fifth of a radian for `sin`
  and `cos`, one radian for `atan`, one half for `asinh`, an error of one
  half for `tanh` and for `exp`) is answered without the kernel: zero
  within one for the sine, the cosine and the hyperbolic tangent, zero
  within two for the arctangent, zero within the exponential of the
  signed upper end (formed exactly; the signed end rather than the
  largest magnitude, since a wide negative interval near the bottom edge
  would otherwise read as an overflow) for `exp`, the exponential of the
  largest magnitude for the hyperbolic pair, the value at the midpoint
  plus the radius for `asinh`, whose slope is within one everywhere,
  since `x^2 + 1` under its root would not stay positive under the error
  rules at such a width. Such a bound is the function's whole range,
  certifies nothing, and lets the retry loop narrow the argument. The
  monotone ends, `[tanh(lo), tanh(hi)]` for the hyperbolic tangent, would
  be tighter and are not taken: every wide argument today is narrowed by
  the next pass, and the ends are worth writing only once an argument
  can carry a radius of its own that no pass narrows, the two-argument
  `approx` ([#100][100]). A function monotone in its argument (`erf`, `erfc`, the incomplete
  functions in `x`) is taken at the two ends of a wide ball and the
  results hulled (`hullOfEnds`): a value beside a refusal past the
  bottom of the exponent bound is the value's hull with zero, one beside
  a refusal past the top is `unresolved` at the bound, and two midpoints
  too far apart to align take the sum of their magnitudes.
- **An argument outside the domain throughout its ball is a `domain`
  error**, located at the call and naming the argument; one that
  straddles an edge of the domain, or another point where the result
  depends on which side the true value lies, is `unresolved` at that
  edge: the retry loop raises the precision, and at the ceiling the
  message says the value cannot be told from the edge. A ball touching an
  end of a domain counts as straddling it (`asin` of `[0.5, 1]`, `acosh`
  of `[1, 1.5]`, `atanh` of `[0.5, 1]` are `unresolved` at the edge), as
  `sideOfZero` counts a ball touching zero; a ball touching zero from
  below (`[-2, 0]`) is not positive anywhere, so it is a `domain` error
  for a logarithm or a base, while for the exponent of a zero base it is
  `unresolved`, since `0^0` differs from `0^-ε`. The edges a message can
  name are `zero`, `1`, `-1`, a rounding boundary written to twelve
  digits, `a pole of the function`, and the point where the result passes
  the exponent bound.
- **A result whose decimal exponent would pass the exponent bound is
  refused before anything is computed** when every value of the
  argument's ball puts it past the bound, through the classifier of
  `ball.ts` ([numbers.md](numbers.md), "The exponent bound"): `exp`,
  `sinh`, `cosh`, `pow`, `gamma`, `beta`, `erfc` and the incomplete
  functions each hold an interval bounding the result's logarithm to the
  bound's edges, an `underflow` for `exp` of a negative argument and a
  power toward zero, an `overflow` otherwise, `sinh` and `cosh` of either
  sign included; an argument whose ball reaches across an edge is
  `unresolved` at the bound and retried. Within it these functions have
  the range of an exponent: the kernel returns a `Floating`, and the
  digits of one whose exponent cannot be formed are found in log space.
  `tanh` has no guard and is never refused for its argument's size: a
  ball of radius one half or more that is not saturated is zero within
  one, and with no saturation and a radius below one half the argument
  the kernel is handed stays below about 181,727 at the largest ceiling
  the settings allow.

### Huge and tiny arguments

The two ends of the exponent are answered before the kernel is entered,
since the kernel holds a value only up to the significand limit
([numbers.md](numbers.md), "The kernel's boundary"):

- An argument throughout below `2^-significandLimitBits` (`isTiny`) is
  answered by its expansion at zero: the odd functions give the argument
  itself within its cube (`tinyOdd`), `cos` and `cosh` one within its
  square (`tinyEven`), and `exp` one within twice the argument's
  magnitude (sound since `e^|x| - 1 <= 2|x|` there), so that
  `sin(1e-999999999 radian)` is `≈ 1e-999999999` on the first pass and
  `exp(1e-999999999)` is `≈ 1`. `asin` and `acos` take their expansion
  already where the argument's square lies below `2^-bits` of the working
  precision, `acos` as `pi/2` less the argument, since `1 - x^2` stops
  aligning within the significand limit long before
  `2^-significandLimitBits` (`acos(1e-9860)` was refused at the default
  limit). `erf` of a tiny argument is `2x / √π` within `|x|^3`, the next
  term of its series being `-2x^3 / (3 √π)`, and `erfc` one less that.
  Under a directed rounding mode these show `≈ 1` with no digit certain,
  since the ball straddles one, as `cosh(1e-999999999)` and `approx(1)`
  do.
- Between that and half an ulp of the working bits, the kernel's door
  converts the argument to zero within an ulp, which is what the
  log-space power of a tiny exponent goes in as; a tiny ratio formed
  inside `asin`, `acos` or `atan2` converts to zero within an ulp and
  gives a ball around zero that certifies nothing, the one case the
  expansion does not reach, since those combine the kernel's arctangent
  with `pi` before the ball is formed.
- `sin`, `cos` and `tan` of an argument reaching `2^significandLimitBits`
  (`isHuge`) are `tooLarge` at the significand limit, since the reduction
  would need `pi` to that many bits, with the reach `exceeds`.
- `atan` of an argument at or beyond `2^bits` throughout is `±pi/2`
  within `2^-bits`; `asinh` and `acosh` beyond it are `ln(2|x|)` within
  `1/(2x^2)`, as `ln 2 + ln |x|` through the logarithm's scale
  (`farLogarithm`); `tanh` saturates to `±1` within `2 e^-2|x|` beyond
  what the working bits plus a margin can tell from one, a radius the
  coarse type holds at any magnitude; `erf` beyond the working bits'
  reach is `±1` within `erfc(|x|)`'s bound; the logarithms take any
  exponent, `ln(m × 10^e)` being `ln m + e ln 10` from the memo
  (`lnScaled`), so `ln(1e999999999)` is a value and `log10(1e999999999)`
  exactly `999999999`.
- `atan2` compares the magnitudes of its arguments as radii before it
  forms their ratio: for a `y` of definite sign, `±pi/2` by `y`'s sign
  when `|y|` is at least `|x| · 2^bits` throughout, `±pi` when `x` is
  negative and `|y| / |x|` lies below `2^-bits`, and for a positive `x` a
  tiny ratio is its own arctangent within its cube, so that
  `atan2(1e-999999999999999999, 1)` is its argument and the same over
  `-1` is `pi`.
- Neither `atan` nor `atan2` is refused for an argument's radius: a ball
  that reaches `2^significandLimitBits` without lying beyond `2^bits`
  throughout is the function's whole range, zero within two for `atan`
  and within four for `atan2` (the powers of two above `pi/2` and `pi`,
  the kernel's own trivial bound; the fractions of pi themselves would
  change nothing certified, since a ball around zero of either radius
  certifies no digit, only the bound the display shows at the ceiling),
  except a ratio `x / y` with `x` straddling zero and `y` of definite
  sign, which is `unresolved` at `x`, since the value then ranges over
  nearly all of `(0, pi)` and which end it lies near is `x`'s side of
  zero.

`asin`, `acos` and `acosh` of an exact argument with a long significand
(`asin(0.1 + 1e-15000)`) are refused, since their exact `1 - x^2` does
not align within the significand limit ([#63][63]); `tanh`'s fold band
costs an extra pass ([#65][65]).

## Dimension rules

Each built-in states the dimensions its arguments must have and the
dimension of its result, checked before it is applied; a failure is a
`builtinArgument` error at the call, carrying the rule's error
(`argumentDimension`, `nonconformingArguments` for two arguments that
must conform to each other, or `noAngles`) and every argument's span, so
that a message can write `sin(1 radian)` or `(2 m)^2` from the text.

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
| `div(a, b)`                                                                                  | two quantities of one dimension                 | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension                 | the arguments' |
| `gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial`                                     | plain numbers                                   | plain number   |
| `digamma`, `gamma`, `lgamma`, `beta`, the incomplete gamma and beta functions, `erf`, `erfc` | plain numbers                                   | plain number   |

**Angles.** `sin`, `cos` and `tan` require the `radian` kind, the kind
primitive `units.txt` declares and every angle unit carries (`deg` is
`pi() radian / 180`, so `sin(30 deg)` is `sin(pi() / 6)` inside the
kernel, which sees the magnitude in radians because `radian` is the
primitive). A plain number is a kind mismatch, worded to say that an
angle is wanted and how to write one: `sin(1 radian)`, `sin(pi() radian /
4)`. `sin(0)` is that mismatch too, as `1 m + 0` is; `sin(0 radian)` is
the exact zero. The inverses return the `radian` kind, so `asin(0.5)`
converts into `deg`, `sin(asin(0.5))` evaluates and `asin(sin(x))` has
the kind `x` has; `2 asin(0.5) + 1` is the kind mismatch it is, and the
number is one token away: `asin(0.5)` into `turn`, or `/ radian`.
`atan2(y, x)` takes two quantities of one dimension, so `atan2(3 m, 4 m)`
works and `atan2(3 m, 4 s)` is a dimension mismatch. The hyperbolic
functions take and return plain numbers, since their arguments are not
angles. The rule names the primitive `radian` by convention; a table that
declares no such primitive has no angles, and the trigonometric functions
say so.

The alternative, "dimensionless, or the radian kind treated as 1" with
the inverses returning plain numbers, would make `sin(pi())` valid and
`asin(0.5)` unconvertible into `deg`, and would let a physicist's `sin(2
pi() f t)` pass while `asin(sin(x))` lost its kind. Kinds exist to keep
an angle from being mistaken for a number, and the degree-radian
confusion is the mistake they were introduced against, so the rule is
strict; its cost is that `sin(pi())` is written `sin(pi() radian)` and
`sin(2 pi() f t)`, whose argument is a plain number in this table (`Hz`
carries no kind, as the table's own separation of `rad/s` from `Hz`
decides), is written `sin(f t turn)`, which is what it says. The inverses
return an angle because the argument of `asin` is a ratio, a plain
number, and the result is the angle that has that ratio, which is
exactly what the kind system has a word for; returning it as an angle is
what lets `asin(0.5)` be converted into `deg` at all, the one thing a
converter's user does with an angle, and the only choice under which the
forward and inverse functions agree.

**`floor` and its kin take a plain number.** A quantity's magnitude is
stored in the primitives, so `floor(3.7 ft)` would floor `1.12776 m` and
answer `1 m`, which no one means, and the answer would change with the
choice of primitives. A function whose result depends on the unit the
value is written in is defined only on plain numbers; the user writes
`floor(3.7 ft / ft) ft`, which says which unit the floor is in. `abs`,
`sign`, `div` and `mod` are invariant under the unit's scale (`mod(7 ft,
2 ft)` is `1 ft` whatever the base unit), so they take quantities. `gcd`,
`lcm` and the factorials are about integers, and an integer is a plain
number.

## Domains, exact cases and edges

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

The domain reasons (`notPositive`, `baseOne`, `outsideClosedUnitInterval`,
`belowOne`, `outsideOpenUnitInterval`, `origin`, the integer functions'
`notInteger`, `notExact` and `negative`, the incomplete beta function's
`outsideZeroOne`, and the Gamma family's `pole`, an exact non-positive
integer) are data that `messages.ts` words, located at the call and
quoting the argument:
`Cannot compute "ln(-1)": "-1" is not positive, and a logarithm is
defined only for positive values`. `asin(±1)`, `acos(-1)`, `atan2(0, x <
0)` and `atan2(±y, 0)` are the memo's `pi` and its halves rather than
exact cases, as `exp(1)` is the memo's `e`. `atan2` with `y` exactly zero
is the exact zero for `x` positive throughout, `pi` for `x` negative
throughout, `unresolved` at `x` for one straddling zero, and the
`origin` error for one exactly zero.

**`log`'s exact cases** are integer exponents either way: `log(2, 8)` is
`3`, `log(3, 1/9)` is `-2`, `log(8, 2)` is `1/3`, found by repeated
division of the numerator or the denominator with the other checked;
`log(b, 1)` is zero for any valid base; a rational exponent in general is
not looked for, so `log(4, 8)` is `≈ 1.5`. `b` is checked before `x`: a
`b` straddling one, or whose logarithm is a ball around zero at the
working bits, is `unresolved` at edge `1`.

**`pow`, and `^` with it.** `pow(x, y)` is for a plain base and a plain
exponent; a power of a quantity is written with `^`, whose exponent is a
literal so that the dimension stays exact. The two share
`powRationalBall` ([numbers.md](numbers.md), "Roots and powers"): an
integer exponent is the exact power; a rational exponent `p/q` is exact
when `x` is a perfect `q`-th power (`pow(8, 1/3)` is `2`, `pow(1/4, 3/2)`
is `1/8`), which `exactRoot(x, q)` finds without forming `x^p`; otherwise
the root of the power when `x^p` fits the significand limit, which also
serves a negative base under an odd root; otherwise, and for an inexact
exponent, `exp(y ln x)` for a positive base. An exact exponent whose
fraction does not fit the significand limit takes the same log space, an
exact base told past the bound by its value first: `pow(2, 1e999999999)`
is `overflow`, `pow(2, 1e-999999999)` and `pow(2, 1e-30000)` are `≈ 1`,
and a negative base takes the exponent's parity from its canonical form,
so `pow(-2, 1e-30000)` is the even root of a negative number. A
non-positive base with an inexact exponent is a `domain` error, a
negative base under an even root the `negativeRadicand` that
`(-1)^(1/2)` is, and a base straddling zero `unresolved`. An exact zero
base is exact zero for an exponent positive throughout, a division by
zero for one negative throughout, and `unresolved` at zero for one
straddling it; `pow(0, 0)` is one. Three bases need no arithmetic and
are answered before the exponent's fraction is formed, in this order
after an exact exponent of zero: `pow(1, y)` is exactly `1` for any `y`,
an inexact or a huge one included; `pow(0, y)` by the side of zero `y`
lies on; and `pow(-1, y)` for an exact `y` whose fraction cannot be
formed is decided by the parity the canonical form gives (`minusOneTo`:
an exponent with `exp > 0` has a numerator that is a multiple of ten
over an odd denominator, so the power is `1`, `1e999999999/3` included;
with `exp < 0` the fraction's denominator is even unless the
significand's numerator holds at least `-exp` twos, so `pow(-1,
1e-30000)` is the even root of a negative number, `pow(-1, 5^-16000)` is
`-1` and `pow(-1, 2 * 5^-16000)` is `1`); a formable exponent keeps the
rational route, so `pow(-1, 1/3)` is `-1` and `pow(-1, 2/3)` is `1`.

## The elementary routines

One module per family beside `fixed.ts`, below the ball so that
`powRationalBall` can reach `exp` and `ln`. Every routine costs 9 to 13
ms at the default ceiling of 4,040 digits (`bench/kernel.bench.ts`
reports each), V8 multiplying integers of that size by the schoolbook
rule, about sixty microseconds a product.

- **`expFixed`** (`fixed-exp.ts`) reduces by halving until the argument
  is below `2^-8`, sums the Taylor series in fixed point with the
  argument's error included from the start, stopping at the first term
  whose whole interval lies within an ulp (after which the tail is below
  a 255th of an ulp and one ulp covers it), then squares back, each
  squaring doubling the relative error plus one ulp, working at the bits
  plus the number of squarings plus a guard and renormalizing into a
  `Floating` after each squaring; the halvings are taken over the
  argument's whole interval, so a wide argument is a ball that covers
  its range. Its precondition is an argument below `2^62`, the exponent
  bound's own. The series is summed term by term, the remaining
  candidate for the rectangular splitting the other routines use
  ([#152][152]). `e` is `eSeries` in `constants.ts`, `Σ 1/n!` by binary
  splitting with the tail below `2 / (N + 1)!`.
- **`sinhCoshFixed`** computes the pair: an argument below one
  throughout its interval takes the two series in `x^2` over the
  factorials (`factorialSeries`, the sine's and the cosine's series
  without the alternating sign), so that `sinh` of a small argument never
  forms `(e^x - e^-x) / 2`, and any other argument goes through
  `expFixed` on its magnitude, where the difference loses at most a bit,
  the reciprocal folded into the error beyond half the working bits.
  **`tanhFixed`** divides before either is cut; an interval of width one
  or more is zero within one before the pair is formed.
- **`lnFixed`** (`fixed-log.ts`) writes the argument as `m × 2^k` with
  `m` in `[1, 2)`, takes `ln 2` from its memo, brings `m` within `2^-8` of
  one by eight square roots, and takes `2 atanh((m - 1) / (m + 1))` as
  the series in `z^2`, summed by rectangular splitting (the powers within
  a block of about `sqrt(N)` terms computed once and divided by their odd
  numbers, the blocks combined by Horner), so that the full
  multiplications number about `2 sqrt(N)`; the result keeps the bits its
  magnitude calls for. A caller scales its value to order one and passes
  the power of two as `scale`, so that `ln(1e-300)` loses nothing to the
  conversion. `ln 2` is `2 atanh(1/3)` and `ln 10` is `3 ln 2 + 2
atanh(1/9)`, each `atanh(1/q)` by binary splitting, two ulps, memoized
  as the constants are. `log10` and `log2` divide by the memoized
  constants, and `log(b, x)` is the quotient of two `ln`, the quotient
  `divideFixed` cut to the bits its magnitude calls for.
- **`sinCosFixed`** (`fixed-trig.ts`) computes the sine and the cosine
  together, since they share the reduction and the powers of the series:
  the reduction takes `n = round(2x / pi)` on the integers and `pi` at the
  bits asked for plus the bit length of the argument's integer part, so
  that `pi`'s three ulps times `n / 2` are under one ulp of the result
  (which is what makes the memo's margin serve the arguments below
  `2^256` at the ceiling pass), and the quadrant from the multiple; the
  two series, in `v = -r^2` with the powers shared, are summed by
  rectangular splitting, each block scaled through its largest product of
  consecutive integers so that it costs one division rather than one per
  term. `tan` is the quotient in `builtins/trig.ts`, cut to the bits its
  magnitude calls for, and `unresolved` at the argument with the edge
  `pole` when the cosine's ball contains zero; `angleToNumber` in
  `builtin.ts` is the rule the three share.
- **`atanFixed`** inverts an argument above one against `pi/2` from the
  memo, halves the angle eight times through `sqrtFixed` with the
  argument's error carried through, and takes the logarithm's series in
  `-z^2` (`oddReciprocalSeries`). Every inverse in
  `builtins/inverse-trig.ts` is an arctangent: `asin(x)` is `2 atan(x /
(1 + sqrt(1 - x^2)))` and `acos(x)` is `2 atan(sqrt(1 - x^2) / (1 +
x))` for `x` at or above zero and `pi - 2 atan(sqrt(1 - x^2) / (1 - x))`
  below it, so that neither divides by a value near zero and `acos(1 -
1e-30)` certifies its digits on the first pass; `1 - x^2` is formed on
  the ball, exactly for an exact `x`, and rooted by `rootBall`, and the
  domain is read off that ball (`complementRoot` reads the argument's
  position against `±1` before forming the square, so a huge argument
  gives the domain error); `atan2` is an arctangent by quadrant:
  `atan(y / x)` for an `x` positive throughout, that plus or minus `pi`
  by the sign of `y` for an `x` negative throughout, `±pi / 2 - atan(x /
y)` for a `y` of definite sign when `x` straddles zero, `unresolved` at
  `y` with edge zero when `y` straddles zero and `x` is not positive
  throughout (the result jumps by `2 pi` there). `numberToAngle` and
  `conformingToAngle` are their rules.
- **The hyperbolic inverses** (`builtins/hyperbolic.ts`) are logarithms
  of a root: `asinh(x)` is `ln(x + sqrt(x^2 + 1))` on the kernel
  throughout, at the working bits plus the negative binary exponent of
  `x`, negated by symmetry for a negative `x`; `acosh(x)` is `ln(x +
sqrt(x^2 - 1))` with `x^2 - 1` formed on the ball and rooted by
  `rootBall`; `atanh(x)` is `ln((1 + x) / (1 - x)) / 2` with the quotient
  formed on the ball; the logarithm's argument is converted at the bits
  that keep its small part, so that `asinh(1e-50)`, `atanh(1e-50)` and
  `acosh(1 + 1e-30)` certify on the first pass.

`sqrt` and `cbrt` (`builtins/roots.ts`) are `rootBall` under a name, with
the same exact cases as `^(1/2)` and `^(1/3)`, so `sqrt(9/4)` is exact
and `sqrt(-1)` is the `negativeRadicand` that `(-1)^(1/2)` is. `pi()`
(`builtins/pi.ts`) hands the memo's value back as a ball at the context's
precision, and the angle units of `units.txt` call it, as do `oersted`
and `parsec`, so their quantities carry its radius and a conversion
through any of them is `≈` (`turn` into `deg`, `parsec` into `au`). The
helpers the modules share (`checkPositive`, the domain rule for a
positive argument; `sideOfZero`; `unboundedOf`; `fromBallError`, a ball
operation's error as a built-in's, an `unresolved` naming the argument
and the edge; `hullOfEnds` and `moveBetween`) live in `builtin.ts`.

The probe of `limits.ts` times `sin(atan(exp(1)) + ln(3) radian)`, the
four costliest routines of the kernel benchmark's report each once
(`exp`, `atan`, `sin` and `ln`; the roots are an order cheaper, and the
hyperbolic functions and the remaining inverses are compositions of
those), evaluated at the candidate's ceiling against a table of the one
primitive the angle needs ([settings.md](settings.md), "The probe").
Timing it once found that the exact arithmetic on settled midpoints ran
Euclid's gcd on dyadics of the ceiling's size, tens of milliseconds a
sum, which is why the gcd strips the common power of two first.

## The exact functions

Thirteen functions that need no precision: each is exact on exact
arguments, and on an inexact argument is either exact where the
argument's interval decides the answer or `unresolved` where it does
not. They are the functions whose result keeps its argument's dimension
(`abs`, `mod`), or takes any quantity (`sign`, `div`).

- **`abs(x)`** is the magnitude; **`sign(x)`** is `-1`, `0` or `1`.
- **`floor(x)`** is the largest integer at or below `x`, **`ceil(x)`** the
  smallest at or above, **`trunc(x)`** the integer part toward zero.
- **`round(x)`** rounds to an integer, and **`round(x, places)`** to
  `places` decimal places, a multiple of `10^-places`, so `round(3.14159,
2)` is `3.14`, `round(x, 0)` is `round(x)`, and a negative count rounds
  to the left of the point, `round(1234, -2)` being `1200`; `places` must
  be an exact integer, and one that cannot be formed within the
  significand limit (`round(x, 1e20000)`) is `tooLarge`. The rounding is
  in the context's rounding mode, the panel's Rounding setting:
  `round(2.5)` is `2` under the default, half even, and `3` under half
  away from zero. This is where the mode surfaces inside an expression;
  in exact mode it otherwise governs only the display, and a call of
  `round` is the user asking for it there. There is no mode argument: the
  grammar has no strings, a bare name is a unit, and two of the modes'
  names, `floor` and `ceiling`, are functions. Rounding to significant
  digits is [#98][98].
- **`div(a, b)`** and **`mod(a, b)`** are floored division and its
  remainder, F-division in Boute's terms (Raymond T. Boute, "The
  Euclidean definition of the functions div and mod", ACM Transactions
  on Programming Languages and Systems 14(2), 1992, pages 127 to 144):
  `div(a, b)` is `floor(a / b)` and `mod(a, b)` is `a - b × div(a, b)`, so
  that `a = b × div(a, b) + mod(a, b)` exactly, `|mod(a, b)| < |b|`, and
  the remainder is zero or has the divisor's sign: `mod(7, 2)` is `1`,
  `mod(-7, 2)` is `1`, `mod(7, -2)` is `-1`, `div(-7, 2)` is `-4`. The two
  are one definition, so they are concordant by construction, which is
  Boute's requirement. Both are defined on exact rationals and on
  quantities of one dimension, `mod(7.5, 2)` being `1.5` and `mod(-30 deg,
360 deg)` being `330 deg`; `div` is a count, dimensionless. A divisor
  of zero is a division by zero.

  Boute's case is that the three common definitions, truncated (C's `/`
  and `%`, with the dividend's sign on the remainder), floored (Python,
  Excel, Mathematica, Knuth: the divisor's sign) and Euclidean (the
  remainder never negative), are each consistent only as a pair, and
  that the Euclidean pair has the cleanest theory. The floored pair is
  chosen here for three reasons: `div(a, b) = floor(a / b)` is one
  sentence, and makes `div` concordant with `floor` as well as with
  `mod`, an identity the Euclidean pair lacks (`div(7, -2)` is `-3` there,
  `floor(7 / -2)` is `-4`); the remainder's sign carries the divisor's,
  so a result can be read back without the divisor at hand; and it is
  what the calculators this one's users know do. The two differ only
  for a negative divisor, and the Euclidean pair is one call away,
  `mod(a, abs(b))` and `sign(b) × div(a, abs(b))`.

- **`gcd(a, b)`** and **`lcm(a, b)`** take integers and are
  non-negative: `gcd(-6, 4)` is `2`, `lcm(-6, 4)` is `12`, `gcd(0, 0)` is
  `0`, `gcd(a, 0)` is `|a|`, `lcm(a, 0)` is `0`. The choice is independent
  of the division's: Euclid's identity `gcd(a, b) = gcd(b, a - q b)` holds
  for any quotient, and the implementation takes absolute values first,
  so the result's non-negativity is a normalization, the same choice as a
  fraction's positive denominator.
- **`factorial(n)`** for an integer `n >= 0`; **`doublefactorial(n)`**
  for an integer `n >= -1`, `doublefactorial(-1)` and `doublefactorial(0)`
  being `1`; **`binomial(n, k)`** for integers `n >= 0` and any integer
  `k`, zero for `k` outside `0..n`.

On balls: `abs` of a ball is the midpoint's magnitude with the same
radius, which contains the magnitude of every value in it (for a ball
reaching across zero the result reaches below zero, as a bound, and the
display's `zero` kind says what it is worth); `sign` of a ball of
definite sign is exact, and of one touching or reaching across zero is
`unresolved` at zero. `floor`, `ceil`, `trunc` and `round` decide a ball
by `position` against the open cell of the midpoint's result (strictly
between two consecutive integers, or inside one rounding cell at
`places` in the mode): inside it the exact integer or rounded value of
that cell, and touching or reaching across a boundary `unresolved` at
that boundary, the edge being the integer or the rounding boundary as a
`Scaled`, so a ball of a tie under a half-way mode is `unresolved` and
`(2^(1/2))^2 - 2` floored is `unresolved` at zero to the ceiling, as a
division by it is; a cell whose boundary cannot be formed (an integer
midpoint near the top of the exponent bound, or a unit below the bottom
of it) leaves the ball `unresolved` at the result itself, which is never
wrong about the value. `div` and `mod` take one division between them:
the quotient `q = a / b` is formed once, as a ball, `div` is its floor,
and `mod` is `(q - floor(q)) × b` from the same quotient, the same value
as `a - b × floor(q)` and exact on exact arguments; the textbook form
builds the product `b × floor(q)`, which passes the exponent bound where
`a` and `b` lie at its opposite ends though the remainder does not. A
quotient past the top of the bound makes `div` `overflow` and `mod`
`tooLarge`; one below the bottom, which the division refuses, has a
floor all the same, zero or minus one by the signs; a remainder whose
alignment passes the significand limit (`mod(-1, 1e20000)`) is
`tooLarge`, as any exact sum's is. `gcd`, `lcm`, `factorial`, `binomial`
and `doublefactorial` take exact integers: an exact argument that is not
an integer is a `domain` error (`notInteger`), and an inexact argument
is a `domain` error too (`notExact`), worded to say that the function
needs a whole number known exactly, since a ball `5 ± 1e-30` is not known
to be `5` and no pass of the retry loop would make it so; `factorial` of
a value below zero, `doublefactorial` below `-1` and `binomial` with `n`
below zero are `domain` errors (`negative`). The refusals of a value
`factorial` does not take point at `gamma(x + 1)`, and `binomial`'s at
`1 / ((n + 1) beta(n - k + 1, k + 1))`.

`factorial`, `binomial` and `doublefactorial` grow past the significand
limit long before they cost anything: `factorial(20000)` has 77,338
digits. Each predicts its result's bits before computing, from
Stirling's formula with its first correction (`log2 n!` as the sum of
`(n + 1/2) log2 n`, `-n log2 e` and `log2(2π) / 2`, within a bit of the
truth for every `n >= 1`): `binomial(n, k)` from three such terms, or
from `n^k / k!` where `n` is past a double's exactness, so that
`binomial(1e400, 2)` is the value it is; `n!!` from `2^k k!` for even
`n = 2k` and `n! / (2^k k!)` for odd `n`. A prediction past the limit is
a `tooLarge` refusal at the call with the reach `exceeds`, so the message
suggests nothing: `factorial(20000)` would need a significand past the
limit however it is computed; `approx` around the argument is not
offered, since an inexact argument is a `domain` error here and not a
way to an inexact result; and `gamma(n + 1)` for the digits asked is the
way on. The refusal applies in both modes, since decimal mode would
form the exact product before rounding it. `gcd` and `lcm` form nothing
larger than their arguments' product, and `div`, `mod` and the rounding
functions nothing larger than their arguments.

## The Gamma and Beta families

Built-ins that reach the kernel like the elementary ones: the module does
the exact cases and the conversion, a routine beside `fixed.ts` does the
work on `Fixed` values with the argument's error included, and the
result returns through `fixedToBall`. Every function here takes plain
numbers and returns a plain number. `digamma` and `gamma` share the
shift and the Bernoulli numbers, `beta` is three `gamma`s, the
incomplete functions need `gamma` for their regularized forms, and
`erf` is an incomplete gamma.

**Bernoulli numbers** (`bernoulli.ts`, `bernoulli-ratios.ts`). The
asymptotic series of `lgamma` and `digamma` take the even Bernoulli
numbers through the ratios of consecutive ones, `|B_(2k+2) / B_2k|`, each
term being the last times the ratio, an index factor and `1 / y^2` for
the shifted argument `y`. The numbers are exact rationals, computed by
the tangent numbers, integers found by one recurrence, as many as the
count asked for (about `bits / (2 log2 y)`); the ratios are formed from
one such run in fixed point and memoized, by count and by the bits they
serve, the run released once they are formed. A ratio holds the bits the
term it makes still needs, so the first ratios are held in full and the
last in a few hundred bits: at the default ceiling the memo holds 730 to
1,430 ratios, the first at the ceiling's bits plus the margin and the
last at about two hundred, about 0.8 to 1 MB in all, with the exact run
(up to about 1.8 MB) and the tangent numbers (up to about 2.2 MB) held
while the run is computed and released after; at a thousand digits it is
about 80 KB and at forty under a kilobyte. A series predicts its count of
terms from its first term and a bound on the ratio of consecutive terms
before it sums, and reserves that many, so that a pass needing more than
the last computes one run for what it will take (growing the memo term
by term had a cold ceiling pass recompute the run five times over). A
larger run replaces a smaller one, so the memo never holds more than
one; its footprint is [#103][103]. The memo is filled on first use: a
page that never evaluates the Gamma family never computes a Bernoulli
number, and the run at the ceiling, half a second once for an exact
shift and about two for an inexact argument's, is paid by the first
evaluation whose retry loop reaches the ceiling.

**`digamma`** (`builtins/gamma.ts`, `fixed-gamma.ts`): for `x > 0` the
recurrence `ψ(x + 1) = ψ(x) + 1/x` shifts the argument up to a third of
the working bits, where the asymptotic series, `ln x` less `1 / (2x)`
less the terms `B_2k / (2k x^2k)`, converges fast enough; the series is
summed as a recurrence on its terms, the exact scaling first and the
truncating steps last (a power of `1 / y^2` held on its own loses its
relative precision as it shrinks, and a Bernoulli numerator multiplied
in turns an ulp of error into a bound that grows where the term
vanishes), ending at the first term within eight ulps, and for a
positive argument its remainder is bounded by the first omitted term,
the truncation bound owed. An exact argument whose denominator is
short, which a typed decimal or fraction is, shifts exactly
(`digammaRational`): the sum of reciprocals as one fraction by binary
splitting, then one division, and four times as far, where the series is
half as long. The working bits are the result's plus a guard, whatever
bits the argument comes at: a small argument comes at extra bits so that
its reciprocal, the shift's first term, keeps its digits, and that term
alone is taken from it at those bits. The square `1 / y^2` is the square
of `1 / y`, since a wide interval's square can reach zero where the
interval does not. For `x < 0` not an integer the reflection `ψ(1 - x) -
ψ(x) = π cot(π x)`, at the fractional part folded to the half nearer
zero, with `floorBall` deciding whether the ball lies inside one
integer's cell or reaches a pole and the sine's ball reaching zero
reported as the pole. The poles at the non-positive integers are
`domain` errors; a ball touching or reaching across one is `unresolved`
at the pole, worded "a pole of the function" as `tan`'s is, and a ball
too wide for the series is `unresolved` at the nearest pole below it,
since the function then reaches both ways. No rational value is known
(`ψ(1)` is `-γ`), so there is no exact case. An argument at or beyond
`2^bits` is `ln x` within `1 / x` through `lnScaled`, and one below
`2^-significandLimitBits` is `ψ(1) - 1 / x` with `ψ(1)` within `2 |x|`,
so that any exponent is a value; `digamma(-1e-999999999)` takes the
expansion too, where the reflection could not form the fractional part.

**`lgamma` and `gamma`**: `lgamma(x)` is `ln |Γ(x)|`. For `x > 0` the
shift up by the recurrence `Γ(x + n) = x (x + 1) … (x + n - 1) Γ(x)`, the
product kept as a significand at the working bits with a binary
exponent, normalized after each factor so that the `n` multiplications
stay at the working bits (the product has some fifty thousand bits at
the ceiling) and its logarithm taken once with the exponent as
`lnFixed`'s scale, the first factor, which may come at extra bits when it
is small, having its logarithm taken apart at those bits; an exact
argument of short denominator takes the product exactly by binary
splitting with one logarithm (`lgammaRational`), four times as far. Then
Stirling's series, the sum of `(x - 1/2) ln x`, `-x`, `ln(2π) / 2` and
the terms `B_2k / (2k (2k - 1) x^(2k - 1))`, sharing the series loop with
`digamma` (one routine over the term ratio's index factors), its
remainder for a positive argument again bounded by the first omitted
term; `ln π` is memoized at the ceiling as the constants are. For a
negative `x` that is not an integer the reflection `Γ(x) Γ(1 - x) = π /
sin(π x)` gives `lgamma(x)` as `ln π - ln |sin(π x)| - lgamma(1 - x)`.
Exact cases: `lgamma(1)` and `lgamma(2)` are `0`. Both functions take
the expansion at zero for a tiny argument of either sign, `-ln |x|`
within `|x|` for `lgamma`. `gamma(x)` is `exp(lgamma(x))` with the sign
from the reflection, the parity of the floor on the negative side, taken
at the working bits plus the bits of its own magnitude, capped at 64
since past `2^64` the result passes the bound whatever the bits, so that
the logarithm's absolute error, the result's relative one, stays below
the working ulp; except that an exact integer `x >= 1` whose factorial
fits the significand limit is the exact `factorial(x - 1)`
(`factorialOf`, so that `gamma` and `factorial` agree on what fits), and
an exact integer whose factorial does not fit is the kernel's value, the
remedy the factorial's refusal names (`gamma(20001)` is
`≈ 1.8192063e+77337`). The result passes the exponent bound for `x` of
the order of `10^16` (`lgamma(x) ≈ x ln x` reaches `10^18 ln 10` near `x
≈ 6 × 10^16`), and `gamma` takes the classifier on the `lgamma` ball as
its guard, an `underflow` toward zero for a large negative non-integer
argument. The radius is carried through the shift and the series, so no
derivative rule (`Γ(x) ψ(x)`) is written and `gamma` does not depend on
`digamma`; the two share the machinery of the shift and the series, not
each other's values. A wide ball's `gamma` is sound but loose: the
shift's product and Stirling's part carry the radius at their own
slopes, which cancel in
the truth and not in the interval, about six times the true width at
`-2.5 ± 0.1`; a narrower ball shows its digits, and the retry loop
narrows an `approx` one. Costs at the default ceiling: `gamma` or
`lgamma` about 0.12 s and `digamma` 0.14 s a call for an exact argument
of short denominator, and 0.45 s and 1.2 s for an inexact one, the
loop's shift being most of those; at a thousand digits a call is tens of
milliseconds and at forty the series is microseconds. Shifting a wide
argument by rectangular splitting of the rising factorial is
[#125][125].

**`beta(a, b)`** (`builtins/beta.ts`) is `Γ(a) Γ(b) / Γ(a + b)`. Exact
case: positive integers, where it is the reciprocal of `(a + b - 1)
binomial(a + b - 2, a - 1)` within the significand limit (`binomialOf`,
so that `beta` and `binomial` agree on what fits, the denominator's own
bits checked against the limit once more for the factor `a + b - 1`;
`beta(5000, 5000)` is exact, a fraction of ten thousand bits, and
`beta(40000, 40000)` the kernel's value). Otherwise the exponential of
`lgamma(a) + lgamma(b) - lgamma(a + b)` with the sign from the three
reflections, under the classifier, so that large arguments pass through
`lgamma` and never form a `Γ` that would not fit (`beta(1e6, 1e6)` is
`≈ 3.6164047e-602063`); the three logarithms come from `logGamma`,
exported from `gamma.ts`, each at the working bits plus the bits of the
largest argument's magnitude, uncapped, since the logarithms cancel when
an argument is large (`beta(1e15, 1)` is `1e-15` from logarithms near
`2^55`), and an argument whose magnitude would need more bits than the
limit allows is `tooLarge` (`beta(1e20000, 2)`). The sum `a + b` is
formed exactly where it aligns within the limit and otherwise as the
larger within the magnitude of the smaller, so that `beta(2.5, 1e-20000)`
is a value; a sum at or past the top of the bound has both arguments
positive and within a few digits of it, so the result lies past the
bottom throughout and the call is `underflow`. The poles of all three
are decided before any logarithm (`reachesPole`), since the retry loop
would otherwise pay a logarithm at every pass up to the ceiling for
`beta(1, approx(-2))`: a pole of `Γ(a)` or `Γ(b)` is a `domain` error, a
pole of `Γ(a + b)` alone makes the value exactly zero, and a pole the
sum reaches is blamed on the argument of the wider radius.

**The incomplete gamma functions** (`builtins/incomplete.ts`,
`fixed-incomplete.ts`): `lowergamma(s, x)` and `uppergamma(s, x)`, the
unregularized `γ(s, x)` and `Γ(s, x)`, for `s > 0` and `x >= 0`, and the
regularized `lowergammareg` and `uppergammareg`, `P` and `Q`. Exact
cases: `x = 0` gives `0` for the lower and `Γ(s)` for the upper, so
`lowergammareg(s, 0)` is `0` and `uppergammareg(s, 0)` is `1`; `s = 1`
gives `1 - e^-x` and `e^-x`. The lower by its series, `x^s e^-x Σ x^n /
(s (s + 1) … (s + n))`, whose terms are positive, so there is no
cancellation and the tail after a term is bounded by that term times
`r / (1 - r)` once the ratio `r = x / (s + n + 1)` is below one, the
ratio taken from `|x|` since a tiny argument converts to zero within an
ulp. The upper by Legendre's continued fraction, evaluated by the
modified Lentz method: for an order at or below one every element is
positive, so the convergents of even and odd index approach the value
from the two sides and bracket it, and the difference of the last two is
the truncation bound, compared every eighth step since the convergents'
errors grow by an ulp or so a step while the difference shrinks to
nothing; an order above one is reduced into `(0, 1]` and stepped back up
by the recurrence `Γ(a + 1, x) = a Γ(a, x) + x^a e^-x`, scaled by `e^x
x^-a` so that every quantity is of order one, each step a multiplication
and a division with every term positive. The kernel gives the factor of
order one, and the built-in forms the rest as one exponential in log
space, `e^(s ln x - x - ln s + ln Σ)` and its kin, with the classifier on
the whole, so that a value past the bound is refused as `exp`'s is; the
logarithm is formed at the working bits plus the bits of the magnitudes
of `s` and `x`, since the exponent `s ln x - x - ln Γ(s + 1)` cancels, and
past the significand limit that is `tooLarge`. The route is chosen by
cost, mpmath's region rule (the fraction where `x > s + 1`) refined: the
fraction's convergents number about `(bits ln 2)^2 / (7 x)`, measured
(768 at forty digits for `x = 1.5`, 443,000 at a thousand), each a few
times a series term's cost, and
the series' terms about `x - s` to the largest plus what the bits need,
or `sqrt(2 s bits ln 2)` where `x` is near a large `s`; the cheaper runs
within the limits (50,000 terms, 20,000 convergents, 20,000 reduction
steps), except that the upper form takes the fraction where the series'
complement would lose half the working bits to cancellation and the
pass would not certify. The regularized forms divide by `gamma(s)`, and
the complement is taken from whichever form is computed, at the working
digits rather than the context's so that the digits below one are kept
(`uppergammareg(1e6, 1.01e6)` is `1.06e-23`); where the form computed
passes the bottom of the bound, its complement is `Γ(s)` or one within
`10^-(10^18)`. Past both limits, a large order with the argument at or
past it (`uppergammareg(1e6, 1.5e6)`, `lowergammareg(1e8, 1e8)`), the call
is `tooLarge`, a refusal that is never wrong about the value, rather
than digits nothing certifies; the uniform asymptotic expansions that
regime wants are [#107][107], and the refusal's message speaks of the
significand limit where the limit is one of cost. An argument whose
radius is above `2^-16` of its magnitude is taken at its two ends and
the results hulled, each form being monotone in `x`, since the
fraction's denominators reach zero over such a width. Measured for the
regularized upper form: one to two milliseconds a call at forty digits,
forty to eighty at a thousand, and about a second at the default
ceiling, two for `x = 1000`; the series' full-precision division on
every term is [#149][149].

**`erf` and `erfc`** (`builtins/erf.ts`) are the incomplete gamma
functions of order one half at `x^2`, through `incompleteGammaBall`,
which chooses its route by cost and takes the complement where the other
form is the one computed, so nothing here decides where `erf` is near
one: `erfc(10)` keeps its digits (`≈ 2.0884876e-45`) because the routine
computes `Q` by the fraction there and `P` as `1 - Q`. `erf` is odd;
`erf(0)` is the exact `0` and `erfc(0)` the exact `1`. The classifier on
`-x^2` is the routine's on its exponent, so `erfc(1.6e9)` is `underflow`
and `erfc(1.5e9)` a value of exponent `-9.8e17`; an argument at or
beyond `2^bits`, whose square the routine is not handed, is the limit
within the bound's edge, `erfc` of such a positive argument being
`underflow`; a ball touching or straddling zero, whose square the
routine refuses, is taken at its ends and hulled, both functions being
monotone. A call is one to three milliseconds at forty digits.

**The incomplete beta function** (`builtins/incbeta.ts`,
`fixed-incbeta.ts`): `incbeta(a, b, x)`, `B(x; a, b)`, and
`incbetareg(a, b, x)`, the regularized `I_x(a, b)`, for `0 <= x <= 1` and
`a, b > 0`, the parameters first as the incomplete gamma functions take
them. By the series with positive terms, `I_x(a, b) = x^a (1 - x)^b / (a
B(a, b)) Σ ((a + b)_n / (a + 1)_n) x^n` (DLMF 8.17.22), rather than the
continued fraction: the fraction's elements have both signs for every
`a` and `b`, so unlike the gamma fraction nothing brackets it and no
truncation bound is known, where the series' ratio of consecutive terms
`(a + b + n) x / (a + 1 + n)` tends to `x`, falling with `n` for `b >= 1`
and rising toward `x` below, so the larger of the next ratio and `x`
bounds every later one and the tail after a term is at most that term
times `r / (1 - r)`. Every result is therefore certified. The symmetry
`I_x(a, b) = 1 - I_(1-x)(b, a)` is the choice of orientation by estimated
terms, which the region rule `x < (a + 1) / (a + b + 2)` approximates
(`(1000, 1, 0.99)` takes 89 terms swapped against 11,837 direct at forty
digits), with the complement taken from it, except where the complement
would lose half the working bits to cancellation, the value wanted being
tiny, which the prefactor estimates. The kernel gives the sum and the
built-in forms the rest as one exponential in log space, `e^(a ln x + b
ln(1 - x) - ln a + ln Σ)` less the three `ln Γ` regularized, at the
working bits plus the bits of the parameters' magnitudes, under the
classifier; the exponential is taken at the working digits so that a
complement keeps the digits below one, and a tiny `x` whose complement
does not align within the significand limit has it as one within `|x|`.
Past the term limit of 50,000 in both orientations, large parameters
near the median (`incbetareg(1e6, 1e6, 0.5)` at a thousand digits), the
call is `tooLarge`; a term whose error reaches its value ends the sum,
wide parameters' intervals growing through the ratios, and where no
tail bound holds there the call is `unresolved`, retried narrower. Exact
cases: `x = 0` is `0`, `x = 1` is `1`, and positive integers `a` and `b`
make it a polynomial in `x`, `Σ binomial(a + b - 1, j) x^j (1 - x)^(a +
b - 1 - j)` over `j` from `a` to `a + b - 1`, one integer over `q^(a + b

- 1)`for a rational`x = p / q`, the binomial stepped exactly, formed
where that power fits the significand limit and `a + b - 1`is at most
ten thousand, the whole numbers'`B(a, b)`coming from`beta`. A wide or
edge-touching ball of `x`is taken at its ends, the function rising with`x`. Measured at forty digits: a few milliseconds a call for moderate
parameters, fifty for `(1e4, 1e4, 0.5)`; the series' cost at the
  ceiling is [#150][150].

The costs of these families at raised ceilings are catalogued in
[cost.md](cost.md); the hangs at the highest precision limit the default
significand limit allows are [#151][151], and at the hard bound
[#152][152]. Eight more special functions (`zeta`, `lambertw`, `ellipk`,
`ellipe`, `legendre`, `chebyshev`, Bessel `J` and `I`) were designed and
deferred ([#115][115] holds the context: `zeta` by the Borwein algorithm,
`lambertw` by Halley's iteration with a containment check, the elliptic
integrals by the arithmetic-geometric mean, the orthogonal polynomials
by their recurrences, exact for a rational argument, and Bessel `J` and
`I` by their series for small arguments). Ruled out as built-ins: the
general hypergeometric functions (every region of the argument plane
needs its own transformation), Bessel `Y` and `K` and any Bessel function
at large argument (the asymptotic expansions and logarithmic limits are
library-sized casework), the polygamma functions beyond `digamma`,
`gamma` of a complex argument, and the statistical distributions, which
are one-line user functions over the incomplete functions (the normal,
chi-squared, Student's t and F cumulative distributions are `erfc`, `P`
and `I_x` at the right arguments). An audit of every numeric routine and
rigorous bound, with citations, is [#112][112].

## Not in this design

- A mode argument to `round`, and rounding to significant digits
  ([#98][98]); a value entered with its uncertainty ([#100][100]).
- Truncated or Euclidean `div` and `mod`; both are one call away.
- A non-integer `factorial` or `binomial`, which `gamma` and `beta` give.
- Complex values and arguments: `ln(-1)`, `sqrt(-1)` and `gamma` off the
  real line are domain errors ([future.md](future.md)).

[63]: https://github.com/bsidhom/exucal/issues/63
[65]: https://github.com/bsidhom/exucal/issues/65
[98]: https://github.com/bsidhom/exucal/issues/98
[100]: https://github.com/bsidhom/exucal/issues/100
[103]: https://github.com/bsidhom/exucal/issues/103
[107]: https://github.com/bsidhom/exucal/issues/107
[112]: https://github.com/bsidhom/exucal/issues/112
[115]: https://github.com/bsidhom/exucal/issues/115
[125]: https://github.com/bsidhom/exucal/issues/125
[149]: https://github.com/bsidhom/exucal/issues/149
[150]: https://github.com/bsidhom/exucal/issues/150
[151]: https://github.com/bsidhom/exucal/issues/151
[152]: https://github.com/bsidhom/exucal/issues/152
