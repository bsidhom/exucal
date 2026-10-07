# The decimal mode, restated: a calculator's arithmetic

Status: design note, written after S1 of docs/settings-plan.md landed
and before S2, which it interrupts (docs/settings-modes.md, paused on
this); implemented in the change after its review, with "As landed" at
the end saying where the code settled what the note left open. It
restates what the decimal mode is, and the restatement is the owner's
ruling: **in decimal mode every operation is one correctly
rounded step, its result is exact, and nothing carries a radius.** The
mode stage 4 built (docs/decimal.md, "The decimal mode"; D15) rounds
every step and also tracks, in the radius, how far the roundings have
carried the value from the true one, so that `1 / 3 * 3` at eight digits
is `0.99999999` shown as `≈ 1` with "7 of 8 digits are certain". That
tracking is withdrawn here: it was built before what "decimal mode" meant
had been settled, and as it stands the mode is not coherent. What it
means is the arithmetic of a traditional calculator or a hand
computation under a rounding mode: every operation the user can see,
built-in function calls included, rounds once to the digits, and every
intermediate result counts as exact because it was certified to the
target precision before it was rounded. The sections say what the mode promises,
what each kind of operation does under the promise, where the subtleties
are, and what changes in the core, the display and the docs. The plan's
D15 keeps its exact-mode half; its decimal-mode half is superseded by
D26, proposed at the end.

## The mismatch

Decimal mode was designed as per-operation rounding in the user's mode,
"a hand calculator or a decimal library" (docs/calculator.md, "4 and 5"),
and built as a second parameterization of the ball model: `settle`
rounds every midpoint to the display digits in the mode and adds the exact rounding
error to the radius, so that the display can mark what the roundings
destroyed. The specific error was to carry a nonzero radius on every
intermediate value a user could observe, and every mismatch below
follows from it. The ball model itself is not the error, and it stays
where it is needed: inside a built-in, whose result must be certified at
extra digits before it is rounded, the ball is what certifies. The two
ideas pull against each other wherever a radius reaches a value the user
can see, and the seams show:

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
answer. A calculator that printed `≈ 1` would be the strange one, and
`≈ 1` with a note is what exact mode already shows for a value it
cannot certify, so the mode as built added no behavior and served no
use case that exact mode did not.

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
   looked up, and each function call as a whole. D27
   (docs/working-digits.md) amends the `p`: every step but the last is
   rounded to the working digits `w >= p`, a setting of the mode that
   defaults to `p`, and the last step of a displayed value to `p`,
   directly from its exact result.
3. **A function call is one operation.** `gamma(1/2)` is spelled as one
   step and is one, as far as a user can observe: its value at the exact
   argument is computed to whatever precision certifying the `p`-digit
   rounding takes, and the rounding is the result, exact. The alternative,
   decomposing the function into its series or continued fraction and
   rounding each term as the mode rounds a step, is set aside: it loses
   precision in aggregate, is not what any calculator does, and throws
   away the one thing the ball model is good for, certifying a rounding.
   The line between the two is observability. Every partial expression
   visible in the user's expression tree, which the language evaluates in
   one defined order, is a step and is subject to the decimal rounding;
   an accumulator or an intermediate inside a built-in surfaces to no
   one, and there the radius is kept and used to certify the rounded
   result. Today that hidden interior exists only in built-ins; a
   user-defined function's body is visible and is steps.
4. **Rounding is the only source of difference from the real number**,
   and it is the user's, chosen by choosing the mode, step by step as a
   calculator rounds. The app does not report how far the roundings have
   carried the value, because in this mode the rounded value is the
   value.

Exact mode is untouched: its promise stays D15's, that exact values are
never rounded, inexact ones are settled at a working precision and
certified at the digits asked, and the rounding mode is applied once by
the display.

### The denominator, and what fixing it costs

Point 1 fixes the significand's denominator at one: a decimal-mode value
is `n × 10^e` with `n` an integer of at most `p` digits. That is the
spelling of General Decimal Arithmetic and of every calculator, it is
tentative here, and it has two costs that should be stated rather than
implied.

- **Precision at the bottom of the exponent range.** A value's digits
  are the significand's, and its magnitude is the exponent's; at the
  exponent bound (`10^18`, docs/decimal.md) a value whose `p` digits
  would need an exponent below the bound has nowhere to put them, and
  the settle refuses it, `underflow`, as today's decimal mode does
  (`1e-1000000000000000000 / 3`). Letting the denominator flex by powers
  of ten, so that the significand may hold fewer digits than `p` while
  the exponent stays at the bound, would give such a value a
  representation with reduced precision, which is what IEEE 754's
  subnormals do. `Scaled` can hold it, since its canonical significand is a
  reduced fraction whose denominator carries the twos and fives a power
  of ten leaves (`2.54` is `127/50 × 10^0` as stored); the invariant is
  on the value, a `p`-digit decimal, not on the stored fraction. The
  note keeps the refusal, which is D17's rule for decimal mode already,
  and records the gradual alternative for the day the bound is reached
  in practice.

  The owner's ruling, in the review: a denominator of one is the
  provisional rule and representation. Its merit is that a decimal-mode
  value is then always representable in the decimal system directly,
  without fighting the rational's reduction, where a flexing denominator
  means trading powers of ten between the significand and the exponent to
  keep the two balanced, as the `2.54` example shows. Neither fix is
  wholly satisfying; this one is taken, and it is a point to come back
  to as the implementation gels, listed under "Provisional, to revisit"
  below so that the backtracking point is on record, which the first
  decimal-mode design did not do for its radius propagation.

- **The significand limit is nearly idle.** the significand limit bounds the size of a
  numerator or a denominator. With the denominator fixed, only the
  numerator can grow, to `p` digits, and the limit binds only the exact
  intermediate before a rounding (a product of `2p` digits, a quotient
  of two `p`-digit parts) and the alignment of a sum. A setting that
  speaks of bits a value may take, in a mode where no value takes more
  than `p` digits, says something that is not quite so; the smell is
  noted here and belongs to S3, which decides what the limits mean in
  each mode.

## What each operation does

**Literals.** A literal with more than `p` significant digits is rounded
to `p` in `R` as it is read, and is exact after that: `2.5400001 cm` at
three digits is `2.54 cm`, and in `in` it is `= 1 in`, not `≈ 1 in`. This
is the invariant applied to the one place a value enters: a `p`-digit
calculator holds `p` digits, and the user who typed more into it knows
where they went. The radius that recorded the rounding today goes;
README says it once, under the display digits.

**Arithmetic.** `+`, `-`, `*`, `/` and juxtaposition form the exact
result of two `p`-digit decimals, which always exists and is small (at
most `2p` digits for a product or a sum that aligns, a rational of two
`p`-digit parts for a quotient), and round it once. `1 / 3` at eight
digits is `0.33333333`; `0.33333333 * 3` is `0.99999999`; and
`1 / (1 / 3 * 3 - 1)` is `-100000000`, as every calculator has it, where
exact mode has a division by zero. Division by an exact zero is an
error, and nothing else is: no value straddles anything.

**Sums that do not align.** Two decimals whose exponents differ by more
than the significand limit holds cannot be added exactly (`1e999999999 + 1`;
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
does not fit the significand limit the power is computed as the inexact
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
runs (`sqrt(6.25)`, `6.25^0.5` and `pow(6.25, 0.5)` are each exactly
`2.5`). The ceiling is therefore a computation limit that lets the mode
always answer: at it, the result is the midpoint's rounding in `R`,
which is what a calculator prints, and it is wrong only for an algebraic
boundary value the exact cases missed, a gap to close where it is found.
No built-in of the app is known to reach it today; the implementation
exercises it with a built-in injected by its tests, and the first draft
of this note named `6.25^0.5` at one digit as a case, which it is not:
the root is an exact case, and in decimal mode the literal is `6` before
the root is taken.

The owner's ruling is that such a result is rounded and answered, and
that the app says it was not certified: the value is exact under the
mode's fixed-precision rounding, and its last digit is nonetheless one
the computation could not vouch for, because the step secretly worked at
a higher precision and the collapse to `p` digits lost the one fact it
needed. That is exact only of the step at which certification failed.
Every operation after it rounds a value that may already be a unit off,
and the error can compound, so the final result may differ from the
correctly rounded one in more than its last digit; exact mode has no
such compounding, since it rounds once, at the end, and knows exactly
what a failed certification cost. This is how decimal-mode calculators
behave by default, with every step rounded and no account kept; where
this one differs is that it carries extra hidden precision inside each
step, as the extended internal formats of IEEE 754 do, so that the
uncertified step is the rare exception rather than the rule. How the
exception is carried is new ground, and the decimal design session
settles it; the candidates, so that it starts from something:

- **A flag on the value, not a radius.** The decimal-mode value stays
  exact, radius zero, and carries a bit that says a step in its history
  was rounded without certification; every operation on a flagged
  operand produces a flagged result, as IEEE 754's inexact flag is
  sticky through a computation, and the display marks the line. How it
  marks it, by the owner's proposal: the line's relation is `≈` as
  exact mode uses it, with a dot above the glyph, an equality-like sign
  with a special semantic, here that the value is not known to be equal;
  beside it a note in the style of exact mode's ("a step could not be
  certified at the precision limit"), since `≈` alone would read as
  exact mode's rounding. `≆`, "approximately but not actually equal to",
  was weighed and rejected: it asserts an inequality the app cannot
  attest, since the uncertified digits may be exactly right. Unicode has
  no precomposed "almost equal to with dot above", so the text form is
  `≈` followed by the combining dot above (U+2248 U+0307, `≈̇`), used
  where a plain string is needed, and the component draws the dot itself
  over the `≈` so that the mark does not depend on a font's placement of
  a combining mark; the accessible name says "approximately,
  uncertified", and README explains the sign once. This keeps the
  promise's invariant, every value a `p`-digit decimal, and reports the
  one thing the radius was good for without carrying a radius.
- **A radius at the ceiling alone.** The uncertified result keeps the
  ball the ceiling produced instead of collapsing it, and the existing
  display rule then marks what it does not certify. Set aside in
  advance: the radius would then propagate through the rest of the
  expression, which is the mismatch this note removes.
- **A refusal**, `unresolved` at the call: set aside, since it would
  refuse a value every calculator answers, over a case that is a missing
  exact case.

The flag is the direction; its shape in `Ball` or beside it, what the
display says, and whether the pipeline reports it as the notes report
partial digits today, are the session's to decide. Whatever the shape,
the ball with its radius stays in use for the hidden steps inside a
built-in, where it certifies that the observed result is correctly
rounded; the flag records the one case where it could not. The ceiling thereby
has a meaning in decimal mode, the most digits any one call's
certification may compute at, which #86 found it lacked; S3 takes that
up.

**A result that is zero.** A function whose exact value is zero at an
exact argument is an exact case (`sin(0 radian)`, `ln(1)`, `atan(0)`) and
returns zero. A ball that contains zero without the exact case firing
cannot certify any digit, and at the ceiling the midpoint's rounding
applies as above, flagged as uncertified, which for a midpoint within
the radius of zero is taken as zero. In practice the arguments that make a function zero are
exact-case arguments; an inexact argument is rounded first and misses
zero (`sin(pi() radian)` at eight digits is `sin(3.1415927 radian)`,
which is `= -4.6410207e-8`, a calculator's answer, where today the mode
shows `≈ -0 (within 1e-7 of zero)`). How the kernel computes near a
function's zeros is itself due for work: the owner intends fixes to the
argument reduction that should improve the series expansions there,
not yet filed as issues, so the behavior at such arguments may differ
from a traditional calculator's once they land; the promise is
unchanged by them.

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
(docs/approximate.md), and its decimal-mode clause there goes. This is
true of the one-argument form that exists. An `approx(x, precision)`
that names a precision, not yet designed, could reduce the implied
precision below the user's `p` and would not be the identity; what its
precision means (an absolute radius, the initial intent, since it fits
the ball directly; a relative error; a count of digits) is that design's
to settle, and its decimal-mode behavior with it.

**User-defined functions.** A function the definitions file defines,
as distinct from a built-in, is its body, ordinary arithmetic evaluated
by the same evaluator, and each step of the body rounds, as
docs/functions.md says today and as a programmable calculator rounds
each step of a program. The ruling is that a user-defined function
behaves exactly as its expanded form does: calling it and typing its
body inline round at the same subexpressions and give the same value.
The alternative, treating a user-defined function as one operation like
a built-in, was weighed and set aside: the spelling `tempF(37)` suggests
it, but the body is the user's own arithmetic, the same steps typed
inline, and a mode that rounded a body once would make `tempF(37)` and
its inlined body differ, the opposite surprise.

**Conditions.** A user-defined function's conditions compare exact values and
are always decided; the `undecidedCondition` report cannot arise in
decimal mode.

**The pipeline's own quotients.** The conversion's ratio, a unit list's
counts and remainder, a function's count and the outcome's reciprocal
are each one operation and rounded once, exact, as #96 already settles
them; only the radius they carried goes.

**Comparisons** compare exact values.

**Dimensions carry strictly rational powers, whatever the mode.** A
dimension's exponents are exact rationals (`m^(1/3)` is a third power of
length, never `m^0.33333333`), formed by the exact arithmetic of
dimension.ts, and the mode does not reach them: decimal mode rounds
magnitudes, and a dimension is not a magnitude. This is the study's
rule (docs/calculator.md, "4 and 5": "dimensions stay exact in both
modes") and nothing here changes it.

## The display

In decimal mode every value is exact and has at most `p` digits, so the
display's `exact` kind applies to every line: `=`, every digit, no note.
`≈`, "n of m digits are certain", "within … of zero" and "no digit
certain" never appear in decimal mode for a rounding the mode certified;
they are exact mode's, where the value is a real number known to a
radius. The one exception is a value carrying the uncertified flag of
"The ceiling" above, whose rendering is decided there: `≈` with a dot
above, and a note. The display rule
itself does not change for the rest: it reads the radius, and the radius
is zero.

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
  is `roundTo(mid, p, R)`, exact; at the ceiling the midpoint's rounding,
  flagged as uncertified in the shape the session decides. The schedule
  is the pipeline's (`schedule` in pipeline.ts) at the node.
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
  clauses, docs/fractions.md's "The decimal mode", README's Mode, the display digits
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
of its ball round alike, and at the ceiling the midpoint's rounding is
taken and the result flagged as uncertified, the ceiling being the
computation limit that lets the mode always answer; a user-defined
function is its body and rounds at each step, exactly as its expanded
form does; dimensions carry rational powers in every mode; the display
writes every decimal-mode value with `=`, the flagged ones with the
`≈` sign bearing a dot above it and a note; the fractions display does
not apply. D15's decimal-mode half, under which the exact
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
- `sqrt(9/4)` is `= 1.5`; a built-in injected by a test whose value
  sits on a tie is answered as the midpoint's rounding and reported as
  uncertified, and one whose value lies near a tie certifies at its
  second working precision.
- An uncertified step is reported on the line, in the shape the session
  decides, and the flag survives the operations after it.
- `1e999999999 + 1` at eight digits is `= 1e+999999999`, and under
  `ceiling` it is `= 1.0000001e+999999999`.
- `approx(1/3)` in decimal mode is `= 0.33333333`, as `1/3` is.
- The docs listed above say what the mode does, and no doc describes a
  decimal-mode value as inexact.

## Provisional, to revisit

Rulings taken here that the implementation may show to be wrong, kept
on record so that backtracking from them is a decision and not a
rediscovery:

- **The uncertified result itself** ("The ceiling"; #173). The review of
  the implementation questioned whether a rounding the ceiling cannot
  certify should be marked at all: a step certified to digits far beyond
  the working precision that still cannot decide the last digit sits at
  a rounding boundary, which could count as a tie for the rounding mode
  to decide, exact under the mode's rounding as every other value is,
  and the mark, with the field, the carrying, the display kind and the
  glyph it needs, would go. The flag stands for now; #173 is the study.
- **The denominator fixed at one** ("The denominator, and what fixing it
  costs"): the alternative is a denominator flexing by powers of ten,
  which gives gradual underflow at the exponent bound.
- **The uncertified flag's shape**, in `Ball` or beside it, and whether
  the pipeline reports it as the notes report partial digits today ("The
  ceiling"). The mark it is shown with is decided; where the bit lives is
  not.
- **The midpoint's rounding at the ceiling** as the answer for an
  uncertified call, rather than a refusal, should an exact case prove
  common enough to be missed in practice.

## Not in this note

- **The shape of the settings** that make fractions and decimal mode
  exclusive: docs/settings-modes.md.
- **The precision limit's role in decimal mode (#86):** this note gives
  the ceiling a job there; S3 decides the setting.
- **A one-sided radius in exact mode.** The symmetric ball is right for
  exact mode, whose roundings are the kernel's to nearest; nothing here
  changes it.

## As landed

- **The flag** is an optional field of `Ball`, `uncertified?: true`,
  never set to anything else, so that balls compare structurally as
  before; the ball operations carry it from operand to result through
  one wrapper each (`carrying` in ball.ts), and the evaluator carries it
  from a built-in's arguments to its result. Where the bit lives was
  among the provisional rulings above; this is the simplest shape that
  propagates without each operation knowing of it. The flag is itself
  provisional: #173 asks whether an uncertified rounding should instead
  be decided as a tie and shown as exact, which would remove it.
- **One entrance.** `step` in ball.ts is the one way a computed value
  becomes a value of the expression, in either mode: it runs a
  computation at the working contexts the retry schedule now gets from
  context.ts (`workingContexts`) until its rounding is certified, and
  rounds it once; `settle`, its primitive, is no longer exported. Every
  node of the evaluator goes through it (`stepQuantity` in quantity.ts),
  plain arithmetic included, and so do the pipeline's own quotients and
  the outcome's reciprocal, which exact mode now settles as it settles
  every node. The review of the first implementation found the previous
  shape, a `settle` any inexact ball could reach beside a retry only two
  call sites used, to be a contract that lived in documentation; this
  shape puts it in the API. The two rules decimal mode adds on top of the
  ball operations, the neighbor rule for a sum that does not align and
  the widened base for a power that does not fit, are the evaluator's,
  applied inside the step's computation.
- **`approx`** declares itself the identity in decimal mode through a
  field of `Builtin` (`decimal: "identity"`), since the built-ins never
  see a decimal-mode context: the certifying step runs them in exact
  mode.
- **The mark** is the `Relation` `≈` with the combining dot above
  (U+2248 U+0307) in outcome.ts, which `displayText` and the tests use,
  and the component draws the dot itself over an `≈` named
  "approximately, uncertified" for assistive technology. The note is "a
  step could not be certified at the precision limit".
- **The fractions display** is kept out of decimal mode by the outcome
  (`outcomeOf` passes `fractions` only in exact mode), until the settings
  of docs/settings-modes.md make the two exclusive at the source.
- **No built-in reaches the ceiling fallback** with the app's functions,
  the algebraic exact cases catching every rational root tried; the
  tests exercise it with an injected built-in whose value sits on a tie.
- **The sweeps** judge decimal mode by the promise: the operands rounded
  first, the operation run as the evaluator runs it, and the result
  required to be exact and the rounding of the exact result where that
  can be formed.
- **The working digits** (D27, docs/working-digits.md) landed with the
  settings of docs/settings-modes.md: the context carries them, the
  evaluator computes a node's operands at them and the node at its own
  context, and the pipeline's quotients are the last step of what they
  show. With the setting at its default nothing above changes.
