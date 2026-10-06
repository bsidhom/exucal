# The decimal mode, restated: a calculator's arithmetic

Status: design note, written after S1 of docs/settings-plan.md landed
and before S2, which it interrupts (docs/settings-modes.md, paused on
this). It restates what the decimal mode is, and the restatement is the
owner's ruling: **in decimal mode every operation is one correctly
rounded step, its result is exact, and nothing carries a radius.** The
mode stage 4 built (docs/decimal.md, "The decimal mode"; D15) rounds
every step and also tracks, in the radius, how far the roundings have
carried the value from the true one, so that `1 / 3 * 3` at eight digits
is `0.99999999` shown as `≈ 1` with "7 of 8 digits are certain". That
tracking is withdrawn here. The sections say what the mode promises,
what each kind of operation does under the promise, where the subtleties
are, and what changes in the core, the display and the docs. The plan's
D15 keeps its exact-mode half; its decimal-mode half is superseded by
D26, proposed at the end.

## The mismatch

Decimal mode was designed as per-operation rounding in the user's mode,
"a hand calculator or a decimal library" (docs/calculator.md, "4 and 5"),
and built as a second parameterization of the ball model: `settle`
rounds every midpoint to Digits in the mode and adds the exact rounding
error to the radius, so that the display can mark what the roundings
destroyed. The two ideas pull against each other, and the seams show:

- **A ball reports on a question the mode does not ask.** A calculator's
  answer to `1 / 3 * 3` is `0.99999999`; that is the value the mode
  defines, and the user who chose the mode knows what it means. The
  radius answers a different question, how far that is from the real
  number, and the display then shows `≈ 1` with a note, a value the mode
  never computed.
- **A directed rounding cannot be certified** (docs/decimal.md,
  "Implementation notes"; found again in the S2 note). A rounding toward
  zero puts the true value on one side of the result; the ball is
  symmetric, so it reaches across the boundary the result sits on, and
  D7's "both ends round alike" fails at the last digit for every inexact
  result. `2 / 3` under `towardZero` at eight digits is `≈ 0.6666666`,
  seven digits of an eight-digit mode.
- **The exact value of a rounded step is the one thing the mode knows.**
  Decimal arithmetic is defined by its invariant: a value is an integer
  of at most `p` digits times a power of ten. Every operation on two such
  values has an exact result, and the rounding of that result in the
  mode is a value the type represents, with nothing left over. Carrying
  a radius beside it spends the ball's machinery on a mode built not to
  need it.

Stage 4's note weighed "not tracking the radius in decimal mode" and set
it aside, so that `1 / 3 * 3` would not show "eight digits of a value
that is not the answer". The owner now rules the other way, and the
reason is the first point above: in decimal mode `0.99999999` is the
answer. A calculator that printed `≈ 1` would be the strange one.

## The promise

In decimal mode, at `p` digits in the rounding mode `R`:

1. **Every value is exact**, radius zero: an integer of at most `p`
   significant digits times a power of ten, which is the `Scaled` form
   with a denominator of one. The ball's radius is always zero, and the
   display always writes `=`.
2. **Every operation is correctly rounded.** The result of an operation
   on exact operands is the exact mathematical result rounded once to
   `p` digits in `R`. "Operation" means a node of the expression tree:
   each `+`, `-`, `*`, `/`, juxtaposition, `^`, each literal, each unit
   looked up, and each function call as a whole.
3. **A function call is one operation.** `gamma(x)` is spelled as one
   step and is one: its value at the exact argument is computed to
   whatever precision certifying the `p`-digit rounding takes, and the
   rounding is the result, exact. The alternative, decomposing the
   function into its series or continued fraction and rounding each term
   as the mode rounds a step, is set aside: it loses precision in
   aggregate, is not what any calculator does, and throws away the one
   thing the ball model is good for, certifying a rounding.
4. **Rounding is the only source of difference from the real number**,
   and it is the user's, chosen by choosing the mode, step by step as a
   calculator rounds. The app does not report how far the roundings have
   carried the value, because in this mode the rounded value is the
   value.

Exact mode is untouched: its promise stays D15's, that exact values are
never rounded, inexact ones are settled at a working precision and
certified at the digits asked, and the rounding mode is applied once by
the display.

## What each operation does

**Literals.** A literal with more than `p` significant digits is rounded
to `p` in `R` as it is read, and is exact after that: `2.5400001 cm` at
three digits is `2.54 cm`, and in `in` it is `= 1 in`, not `≈ 1 in`. This
is the invariant applied to the one place a value enters: a `p`-digit
calculator holds `p` digits, and the user who typed more into it knows
where they went. The radius that recorded the rounding today goes;
README says it once, under Digits.

**Arithmetic.** `+`, `-`, `*`, `/` and juxtaposition form the exact
result of two `p`-digit decimals, which always exists and is small (at
most `2p` digits for a product or a sum that aligns, a rational of two
`p`-digit parts for a quotient), and round it once. `1 / 3` at eight
digits is `0.33333333`; `0.33333333 * 3` is `0.99999999`; and
`1 / (1 / 3 * 3 - 1)` is `-100000000`, as every calculator has it, where
exact mode has a division by zero. Division by an exact zero is an
error, and nothing else is: no value straddles anything.

**Sums that do not align.** Two decimals whose exponents differ by more
than the range limit holds cannot be added exactly (`1e999999999 + 1`;
docs/decimal.md, "Sums, comparisons and the radius"). Today the mode
settles the operands and absorbs the smaller into the radius. Under the
promise the rounded sum is still determined without forming it: the
smaller operand is below half a unit in the larger's last digit, so in a
nearest mode the result is the larger operand, and in a directed mode it
is the larger operand or its neighbor by the sign of the smaller, which
is all the direction needs. A sum whose alignment fits the limit is
formed and rounded; the rule above applies only past it.

**Powers.** `x^n` for an integer `n` is one operation: the exact power
rounded once, `2^100` at eight digits being `1.2676506e+30`, not the
squaring loop with a rounding at each product that `powBall` runs today
for an inexact base (every base is exact here). Where the exact power
does not fit the range limit the power is computed as the inexact
functions are, below, through the kernel in log space and certified; the
limit is a cost limit and a correctly rounded power costs little. A
rational exponent, `x^(1/2)`, is a root, an inexact function, and `^`'s
exact cases (`(9/4)^(1/2)` is `3/2`) stay.

**Units.** A unit is built exactly at the ceiling, as every unit is (D6;
the table is exact and shared), and the lookup rounds it to `p` digits
in `R` once, exactly: `surveyfoot` at eight digits is `0.30480061 m`,
exact, and `1 ft` is `0.3048 m`, which has fewer digits and is itself. A
unit that holds an inexact value, the angle units with `pi`, is a ball at
the ceiling's precision and is certified at `p` as a call is, below.

**Function calls.** The whole of the design is here. A built-in's
arguments are exact `p`-digit values; the built-in computes its value at
a working precision through the kernel as it does today, as a ball; and
the call's result is the `p`-digit rounding of that ball in `R` when the
ball certifies it, by D7's test, both ends rounding alike. When the first
working precision does not certify (the true value lies near a rounding
boundary), the working precision is raised and the function recomputed,
as exact mode's retry schedule does for the whole expression, from `p`
plus the guard, doubling, up to the ceiling. The result is exact, radius
zero, the correctly rounded value of the function at the argument; this
is what IEEE 754-2008 recommends for the decimal transcendental functions
and what few calculators achieve. `approx` is exempt, below.

**Exact cases.** A built-in's exact cases (`sqrt(9/4)`, `log(2, 8)`,
`exp(0)`, `log10(1e999999999)`; docs/builtins.md, "Domains, exact cases
and edges") return exact values as today, which are then rounded to `p`
digits if they have more. They matter more in this mode than in exact
mode, next.

**The ceiling.** Certification can fail all the way up when the true
value lies exactly on a rounding boundary of `p` digits, a tie in a
nearest mode or a `p`-digit value in a directed one, since no precision
separates the ball's two ends. A transcendental value is never a finite
decimal, so for `exp`, `ln`, the trigonometric and hyperbolic functions,
`gamma`, `erf` and their kin the case cannot arise, and the only values
that can sit on a boundary are the algebraic ones, roots and powers with
rational exponents, whose exact cases are detected before the kernel
runs where they are recognized: `sqrt(6.25)` and `6.25^(1/2)` are
`= 2.5` today, while `6.25^0.5` and `pow(6.25, 0.5)` are not recognized
and go to the kernel. At the ceiling the result is the midpoint's rounding, exact: that
is what a calculator prints, and it is wrong only for an algebraic
boundary value the exact cases missed, which is a gap in the exact cases
to close where it is found (`6.25^0.5` and `pow(6.25, 0.5)` at one
digit, a tie at `2.5` the exact cases miss, are the known ones; today's
decimal mode shows the second as `≈ 2` with no digit certain). The alternative, refusing the call
as `unresolved`, was weighed and set aside: it would refuse a value every
calculator answers, over a case that is a missing exact case. The
ceiling thereby has a meaning in decimal mode, the most digits any one
call's certification may compute at, which #86 found it lacked; S3 takes
that up.

**A result that is zero.** A function whose exact value is zero at an
exact argument is an exact case (`sin(0 radian)`, `ln(1)`, `atan(0)`) and
returns zero. A ball that contains zero without the exact case firing
cannot certify any digit, and at the ceiling the midpoint's rounding
applies as above, which for a midpoint within the radius of zero is
taken as zero. In practice the arguments that make a function zero are
exact-case arguments; an inexact argument is rounded first and misses
zero (`sin(pi() radian)` at eight digits is `sin(3.1415927 radian)`,
which is `= -4.6410207e-8`, a calculator's answer, where today the mode
shows `≈ -0 (within 1e-7 of zero)`).

**Domains and edges.** With exact arguments, every domain check is
decided: `ln(0)` is a domain error, `sqrt(-1)` a negative radicand, and
no argument straddles an edge, so the `unresolved` reports of D4 do not
arise at a call's argument. A result whose exponent would pass the
exponent bound is `overflow` or `underflow` as today, decided by the
classifier on an exact argument; a classifier interval that straddles
the bound's edge is narrowed by the retry above, as the pipeline narrows
it in exact mode.

**`approx`.** Every value in decimal mode is already at the user's
precision, so `approx(x)` is `x`, the identity. It is exact mode's tool
(docs/approximate.md), and its decimal-mode clause there goes.

**Defined functions.** A function the definitions file defines is its
body, ordinary arithmetic evaluated by the same evaluator, and each step
of the body rounds, as docs/functions.md says today and as a programmable
calculator rounds each step of a program. The alternative, treating a
defined function as one operation like a built-in, was weighed: the
spelling `tempF(37)` suggests it, but the body is the user's own
arithmetic, the same steps typed inline, and a mode that rounded a body
once would make `tempF(37)` and its inlined body differ, the opposite
surprise. The decision is the owner's to confirm; the note recommends
the per-step rounding.

**Conditions.** A defined function's conditions compare exact values and
are always decided; the `undecidedCondition` report cannot arise in
decimal mode.

**The pipeline's own quotients.** The conversion's ratio, a unit list's
counts and remainder, a function's count and the outcome's reciprocal
are each one operation and rounded once, exact, as #96 already settles
them; only the radius they carried goes.

**Comparisons** compare exact values. **Dimensions** were never rounded
and are not now.

## The display

In decimal mode every value is exact and has at most `p` digits, so the
display's `exact` kind applies to every line: `=`, every digit, no note.
`≈`, "n of m digits are certain", "within … of zero" and "no digit
certain" never appear in decimal mode; they are exact mode's, where the
value is a real number known to a radius. The display rule itself does
not change: it reads the radius, and the radius is zero.

The fractions display has no place in decimal mode and is disallowed
there. Its purpose is to write an exact value entire where its digits
would lose it; in decimal mode every value is a `p`-digit decimal, which
its digits write entire and exactly, and a fraction would say nothing
the digits do not. The settings make the two exclusive (#97;
docs/settings-modes.md decides the shape), and `show` is never asked for
a fraction in decimal mode.

## What changes

- **`settle` in decimal mode** (ball.ts) rounds the midpoint to `p` in
  `R` and returns an exact ball, radius zero; the exponent bound's
  refusals stay. The exact-mode branch is untouched.
- **A certifying apply** for built-ins (evaluate.ts, `applyBuiltin`) and
  the inexact paths of `^` (`powQuantity`'s roots): in decimal mode the
  function is computed at working contexts from `p` plus the guard up to
  the ceiling, in exact mode, until `certifies(ball, p, R)`; the result
  is `roundTo(mid, p, R)`, exact; at the ceiling the midpoint's rounding.
  The schedule is the pipeline's (`schedule` in pipeline.ts) at the node.
- **The lookup** rounds a unit once, exactly, and certifies an inexact
  unit as a call.
- **`powBall`** in decimal mode takes the exact power where it fits and
  the kernel's power, certified, where it does not; the squaring loop
  with settling is exact mode's.
- **The sum rule** past the alignment limit, in decimal mode, yields the
  larger operand or its neighbor by the smaller's sign.
- **`approx`** returns its argument in decimal mode.
- **The pipeline** runs one pass in decimal mode as today, and every
  result it hands the display is exact; `settledInMode` and its kin lose
  their radius arithmetic.
- **Tests:** the decimal-mode rows of the display, outcome, pipeline,
  evaluate and built-in tests, which today expect `≈` with notes, become
  `=` with the rounded digits; new tests for a call that needs a second
  pass to certify, for a directed mode's correctly rounded results, for
  the ceiling fallback, for the sum past the alignment limit, and for
  `approx` as the identity. The sweeps that run both modes
  (edges.sweep.ts) are revised against the promise.
- **Docs:** docs/decimal.md's "The decimal mode" gains a status line
  pointing here and the plan's D15 is amended as D26 says; docs/builtins.md's
  first rule, docs/functions.md's and docs/approximate.md's decimal-mode
  clauses, docs/fractions.md's "The decimal mode", README's Mode, Digits
  and Rounding entries and its "How a number is held", ARCHITECTURE.md's
  "Settling" and display rule, and docs/calculator.md's "4 and 5" (which
  reads `1/3 * 3` as `≈ 1`) are brought to the promise.

## D26, proposed

**D26. Decimal mode is a calculator's arithmetic: every operation is one
correctly rounded step, every value is exact, and no radius is carried
(ruled by the owner in the review of the S2 settings note).** A value in
decimal mode is an integer of at most `p` digits times a power of ten,
radius zero; each node of the expression, a function call as a whole
included, forms the exact result of its exact operands and rounds it
once to `p` digits in the rounding mode; a built-in's rounding is
certified by computing the function at rising precision until both ends
of its ball round alike, with the midpoint's rounding at the ceiling;
the display writes every decimal-mode value with `=`; the fractions
display does not apply. D15's decimal-mode half, under which the exact
rounding error of every step went into the radius, is withdrawn: the
radius answered how far the rounded value lies from the real number, and
in this mode the rounded value is the answer. Exact mode is unchanged.

## Done when

- `1 / 3 * 3` at eight digits in decimal mode is `= 0.99999999`; under
  `towardZero`, `2 / 3` is `= 0.66666666`; `1 / (1 / 3 * 3 - 1)` is
  `= -100000000`.
- Every decimal-mode line in the tests and the sweeps is `=`, and no
  decimal-mode value has a nonzero radius at any point in the pipeline.
- `exp(1)`, `gamma(4.5)`, `sin(1 radian)` and `pi()` at eight digits in
  each of the seven rounding modes are the correctly rounded values, and
  a test shows a call that fails to certify at its first working
  precision and succeeds at its second.
- `sqrt(9/4)` is `= 1.5`; `6.25^0.5` and `pow(6.25, 0.5)` at one digit
  are recorded as the ceiling fallback's known cases, or their exact
  case is added.
- `1e999999999 + 1` at eight digits is `= 1e+999999999`, and under
  `ceiling` it is `= 1.0000001e+999999999`.
- `approx(1/3)` in decimal mode is `= 0.33333333`, as `1/3` is.
- The docs listed above say what the mode does, and no doc describes a
  decimal-mode value as inexact.

## Not in this note

- **The shape of the settings** that make fractions and decimal mode
  exclusive: docs/settings-modes.md.
- **The precision limit's role in decimal mode (#86):** this note gives
  the ceiling a job there; S3 decides the setting.
- **A one-sided radius in exact mode.** The symmetric ball is right for
  exact mode, whose roundings are the kernel's to nearest; nothing here
  changes it.
