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
- No built-in of this stage collides with a unit of units.txt or reads as
  a prefix followed by one: `pi`, `exp`, `ln`, `log`, `log10`, `log2`,
  `sqrt`, `cbrt`, `pow`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`,
  `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh`. The build
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
  the dyadic `fixedToBall` hands back, its radius the kernel's error, and
  it rounds in no mode. The evaluator settles every result it produces,
  so the built-in does not; the mode is the display's alone.
- **An exact case returns an exact ball**, radius zero, wherever the value
  is rational and cheaply recognized. Which cases are listed per function
  below; the rest of the time the result is a ball however round it looks
  (`ln(8) / ln(2)` is `≈ 3`).
- **An argument of unbounded radius** gives the function of its midpoint
  with an unbounded radius, as `rootBall` rules.
- **A tiny argument keeps its digits.** The odd functions (`sin`, `tan`,
  `asin`, `atan`, `sinh`, `tanh`, `asinh`, `atanh`) are close to the
  identity near zero, so the built-in converts a tiny argument to the
  kernel at the working bits plus its negative binary exponent, as
  `rootBall` scales its argument, and `sin(1e-50 radian)` certifies on the
  first pass rather than at the ceiling.
- **A result whose magnitude would exceed the range limit** is `tooLarge`
  before anything is computed: `exp`, `sinh`, `cosh` and `pow` predict it
  from the argument. This is a limit of the midpoint's representation, not
  of the functions: an inexact midpoint is a dyadic whose size is its
  exponent, so `exp(1e6)`, about `2^1442695`, cannot be held, though it is
  an ordinary value, `≈ 3.0332e434294`. Stage 4 of the plan (the `Scaled`
  midpoint, its 4.9) lifts it, after which these functions have the range
  of an exponent and only the exponent bound refuses.
- **Propagation** is by running the series on the argument with its error
  included (D9), so no derivative bound is written separately; the
  truncation bound of a series is taken at the upper end of the argument's
  interval.

## Dimension rules

Each built-in states the dimensions its arguments must have and the
dimension of its result, checked before it is applied; a failure is a
`builtinArgument` error at the call, worded from the data (3.2).

| Function                                          | Arguments                                       | Result        |
| ------------------------------------------------- | ----------------------------------------------- | ------------- |
| `pi()`                                            | none                                            | plain number  |
| `exp`, `ln`, `log10`, `log2`, `sqrt`, `cbrt`      | a plain number                                  | plain number  |
| `log(b, x)`, `pow(x, y)`                          | two plain numbers                               | plain number  |
| `sin`, `cos`, `tan`                               | an angle: the `radian` kind                     | plain number  |
| `asin`, `acos`, `atan`                            | a plain number                                  | `radian` kind |
| `atan2(y, x)`                                     | two quantities of one dimension, kinds included | `radian` kind |
| `sinh`, `cosh`, `tanh`, `asinh`, `acosh`, `atanh` | a plain number                                  | plain number  |

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

| Function               | Domain                                                 | Exact cases                                                  | Edges an `unresolved` names                 |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------- |
| `pi()`                 |                                                        | none                                                         |                                             |
| `exp`                  | all                                                    | `exp(0)`                                                     |                                             |
| `ln`, `log10`, `log2`  | `x > 0`                                                | `ln(1)`; an integer power of the base                        | zero                                        |
| `log(b, x)`            | `b > 0`, `b ≠ 1`, `x > 0`                              | `x` an integer power of `b`, or `b` of `x`                   | zero for `b` and `x`; `1` for `b`           |
| `sqrt`                 | `x >= 0`                                               | a perfect square                                             | zero                                        |
| `cbrt`                 | all                                                    | a perfect cube                                               |                                             |
| `pow(x, y)`            | `x > 0`, or `x <= 0` with a rational `y` as `^` allows | `x` a perfect `q`-th power for `y = p/q`; `pow(0, 0)` is `1` | zero for `x`; zero for `y` when `x` is zero |
| `sin`, `cos`, `tan`    | all                                                    | zero: `sin(0)`, `cos(0)`, `tan(0)`                           | a pole of `tan`                             |
| `asin`, `acos`         | `[-1, 1]`                                              | `asin(0)`, `acos(1)`                                         | `1`, `-1`                                   |
| `atan`                 | all                                                    | `atan(0)`                                                    |                                             |
| `atan2(y, x)`          | not both zero                                          | `atan2(0, x)` for `x > 0`                                    | zero for `y`, when `x` is not positive      |
| `sinh`, `cosh`, `tanh` | all                                                    | zero: `sinh(0)`, `cosh(0)`, `tanh(0)`                        |                                             |
| `asinh`                | all                                                    | `asinh(0)`                                                   |                                             |
| `acosh`                | `x >= 1`                                               | `acosh(1)`                                                   | `1`                                         |
| `atanh`                | `-1 < x < 1`                                           | `atanh(0)`                                                   | `1`, `-1`                                   |

**`pow`, and `^` with it.** `pow(x, y)` is for a plain base and a plain
exponent; a power of a quantity is written with `^`, whose exponent is a
literal so that the dimension stays exact. The two share one rule for the
magnitude (3.8): an integer exponent is the exact power; a rational
exponent `p/q` is exact when `x` is a perfect `q`-th power (`pow(8, 1/3)`
is `2`, `pow(1/4, 3/2)` is `1/8`), which `exactRoot(x, q)` finds without
forming `x^p`; otherwise the root of the power when `x^p` fits the range
limit, which also serves a negative base under an odd root; otherwise,
and for an inexact exponent, `exp(y ln x)` for a positive base. Log space
is where `pow(10, 2.3456789)` and `2^0.1234567` compute, since `10^23456789`
does not fit any range limit; what it gives up is exactness where none
was reachable. A non-positive base with an inexact exponent is a domain
error, a negative base under an even root the `negativeRadicand` that
`(-1)^(1/2)` is, and a base straddling zero `unresolved`.

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
- `src/core/builtins/`: one module per built-in (`pi.ts`, `exp.ts`, ...),
  several sharing a module only when they share internal machinery (the
  logarithms, the trigonometric functions and their reduction), each with
  its test beside it (3.4, 3.6 to 3.11).
- `src/core/builtins.ts`: `BUILTINS`, the app's built-ins gathered by name
  from those modules; the table and the build take it as their default
  set.
- `src/core/fixed-exp.ts`, `fixed-log.ts`, `fixed-trig.ts`: the kernel
  routines, `expFixed`, `lnFixed`, `sinFixed`, `cosFixed`, `atanFixed`,
  beside fixed.ts, which keeps the representation, the exact operations
  and the roots; the routines are below the ball so that `powRationalBall`
  can reach `exp` and `ln`.
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

Written as the stage lands (3.13).
