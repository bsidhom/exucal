# Implementation plan for the calculator

Status: in progress; stages 1 to 6 and the hardening phase before stage
5 have landed, and "Stage 1 as it landed", "Stage 2 as it landed",
"Stage 3 as it landed", "Stage 4 as it landed", "The hardening phase
as it landed", "Stage 5 as it landed" and "Stage 6 as it landed" at the
end record where the code diverged from the tasks as first written;
stage 6's task 6.8, the rest of feature 3, was deferred by the owner
after 6.7 landed and is no longer part of this plan (issue #115 holds
it); "After stage 4" records the two follow-ups that
landed between stage 4 and the phase, and the issues they filed.
"Before stage 5: hardening", between stage 4's tasks and stage 5's, is
the phase that fixed those issues before stage 5, with the decisions it
added (D17 to D20) and amended (D4, D8, D15 and D16); D20, on what exact
mode does past the range limit, was ruled on in review of its pull
request, and D18's answer for a sum whose ball reaches back within the
bound in review of H.13's. Stage 5's design note (5.0,
docs/fractions.md) was written after the phase landed and the stage
revised against it (D21 added, and 5.1 and 5.2); its introduction lists
the changes. Stage 6's design note (6.0, docs/special.md) was written
after stage 5 landed and the stage revised against it (D22 added, and
6.1 to 6.9); its introduction lists the changes, and 6.8 was deferred
after 6.7 landed. D23 and D24 were added before stage 7, from the
owner's review of the syntax options for user functions, and stage 7
was revised against them. D13 was
revised in review of the first follow-up. Stage 2 was reviewed against the code before its
implementation and revised (D9, D10, D12, the new D15 and D16, and tasks
2.2 and 2.5 among others); the stage's introduction lists the changes.
Stage 3 was reviewed the same way against the stage 2 code and revised
(D1, D4, D10, D12, D16 and every task from 3.1 to 3.13); its introduction
lists the changes. Stage 4's design note (4.0, docs/decimal.md) was
written against the stage 3 code and the stage revised against it (D13
settled, D8, D15 and D16 restated, and every task from 4.1 to 4.9); its
introduction lists the changes. docs/calculator.md is the design study
and its "A sequence for the follow-ups" is the order this plan follows.
This document turns that sequence into tasks small enough that each is one
commit, reviewable on its own, with the tests that prove it and the state
the code is left in. Where the study leaves a choice open, this plan makes
it and says so under "Decisions", so that a reviewer can object to a
decision before any code depends on it.

The plan is firm for stages 1 to 6 and the phase before stage 5, whose
shape follows from the code as it stands, and provisional for stages 7
and 8, whose first task is a short
design note in the manner of docs/functions.md, written once the stages
before it have landed and refined against what they turned out to need.
The provisional stages are still listed task by task, so that the whole
program is visible and nothing in an early stage closes a door on a late
one.

## How to read a task

Every task is one commit on the branch, in the order given. Each names the
files it touches, what changes, what must not change, and the tests. The
order is topological: a task depends only on the tasks before it, and the
cross-cutting primitives (rounding modes, the radius, the context, the
ball, the kernel) come before anything that uses them. A task that only
adds a module leaves the app's behavior untouched, and says so; a task
that changes behavior says exactly which behavior.

Every task ends in the same state: `pnpm typecheck`, `pnpm test:all`
(the tests and the edge sweeps, which `pnpm test` alone leaves out since
issue #108) and `pnpm format:check` pass, and the module headers and ARCHITECTURE.md say
what the code now does (the last task of each stage sweeps the docs, but
a task must not leave a header that lies). The tests are the `*.test.ts`
beside each module, under Node's test runner, with no new dependency.
Numeric tests follow four patterns, named here so that later tasks can
refer to them (the fourth was added before stage 5, H.10):

- **Reference digits.** A value checked against digits from a trusted
  source (the first hundred digits of `pi()`, `exp(1)`, `ln(2)`,
  `sqrt(2)`), to at
  least fifty digits, so that an algorithm that is wrong in its tail is
  caught.
- **Containment.** For a routine that returns a ball, the ball computed at
  precision `p` must contain the midpoint computed at precision `4p`, over
  a seeded set of arguments across the routine's domain, drawn from the
  shared random source of 1.3. This is the test that the radius is honest,
  and every inexact routine has one.
- **Exact case.** Every input the routine is required to recognize as
  exact gives a ball of radius zero with the exact midpoint (`sqrt(9/4)`,
  `exp(0)`, `log(2, 8)`), and an input next to it does not.
- **Edge sweep.** Every built-in and every ball operation runs over the
  classes of arguments at the edges of the number type: tiny, huge, at
  the exponent bound, wide, near one, exact and inexact, in both modes.
  Each case is checked for what ARCHITECTURE.md rules out: a throw, a
  refusal where a value exists, and a value that misses a known point or
  range. Known violations are a table keyed by issue, which the task that
  fixes the issue empties, so that no fix is silent.

## Decisions

Numbered so that tasks can cite them. Each is a choice the study leaves
open or a detail it does not reach, and the reasoning is given once here.

**D1. One context type, with `precision` meaning the working precision
below the pipeline and the digits wanted at its boundary.** `NumberContext`
is `{ precision, rounding }` in stage 1, gains `maxBits` (the range limit
of D16) in stage 2, `ceiling` (the top of the retry schedule, D12) in
stage 3 and `mode` in stage 4. Every
core function that does arithmetic takes one and treats `precision` as the
precision it computes at. The pipeline is the one place that knows the
difference between the digits the user asked for and the precision the
evaluation runs at: it takes the user's context and derives working
contexts from it (a fixed guard in stage 1, the retry schedule from
stage 2). A second type for the user's settings would be the same fields
with one renamed, and the distinction is one of level, stated in the
pipeline's header, not of shape. `maxBits` and `ceiling` are the same at
both levels: the one bounds what any pass may form, the other how far the
passes may rise, and `checkContext` holds `precision <= ceiling`. The
ceiling is in the context so that it reaches a built-in: the memos of D10
are sized by it, and `pi()` reads it from the context it is called with.
Stage 3's review weighed the alternatives, a parameter beside the context
on every function that does arithmetic, which is what this decision
exists to avoid, and a lookup closing over the ceiling, which the table's
lookup and the build's would each have to carry; the field removed the
parameter the pipeline and the shell already passed beside the context
rather than adding one.

**D2. `mode` enters the context in stage 4, not stage 1.** A field with no
effect is a field a reviewer cannot audit. The rounding mode has an
effect from stage 1 (the display's rounding, `roundTerms`, and from stage
2 every inexact midpoint), so it is in the context from the start; the
exact-or-decimal mode has none until the decimal mode exists.

**D3. The radius is a coarse binary magnitude, a type of its own.**
`Radius`, in radius.ts, is `{ mant, exp }` standing for `mant × 2^exp`,
with `mant` zero or a normalized 30-bit bigint and `exp` a bigint, or the
distinguished value unbounded; it is neither a `Rational` nor a `number`.
Every operation on radii rounds up, so a radius is always a true bound;
the tightness lost to 30 bits is a relative `2^-29`, invisible at any
precision. It is binary because the kernel is binary, and coarse so that
propagating it through an expression costs nothing and never grows. The
exact value of a bounded radius is a rational, obtained when a comparison
needs it (certification, division), and never stored.

Not a float64, although one has precision to spare, because of range. The
radius is absolute, and the product rule scales it by the other operand's
magnitude (`|a| rb + |b| ra`), so radii span the range of the values
themselves: `10^±19700` at the default range limit (D16) and
`10^±(10^18)` once stage 4
adds the exponent, against a float64's `10^±308`. A radius that overflowed
to infinity would be an honest but useless bound on any large value, and
one that underflowed to zero would be a false claim of exactness.
JavaScript also has no directed rounding, so every float64 operation would
need a manual nudge up by an ulp, the same care as the integer arithmetic
here with less to show for it. The exponent is a bigint for the same
reason: the binary exponent of a value near `10^(10^18)` is about
`3.3 × 10^18`, beyond a safe integer.

**D4. `unresolved` is an error kind of its own.** An operation whose
answer depends on which side of a boundary the true value lies, when the
ball straddles that boundary (a divisor that cannot be told from zero; in
later stages `ln` at a ball straddling zero, `floor` at a ball straddling
an integer), fails with `unresolved`. It is distinct from `divisionByZero`
(the divisor is exactly zero), because the retry loop retries on the first
and never on the second. At the ceiling the pipeline reports it, and the
message says the value cannot be told, at this precision, from the edge
the result depends on: zero for a divisor or a base, and from stage 3
also `1` or `-1` (`asin` at the end of its domain, `log` at base one) or a
pole of `tan`. The error carries the edge as data (`edge: Rational |
"pole"`, zero at every producer before stage 3) and messages.ts words it,
so that one sentence pattern serves every case.

Amended before stage 5 (D18): the exponent bound is an edge too, named
`"bound"`, at which a result straddling the bound is `unresolved`; and
`BallError`'s `unresolved` carries its edge, as the built-in's does.

**D5. Stage 1's `root` is the least that is honest.** It returns the
truncated digits it computes today with a radius of one unit in the last
digit, ignores the rounding mode (truncation is the toward-zero mode), and
returns an unbounded radius when its argument is inexact. Stage 2 moves it
onto the kernel, where it honors the mode and propagates its argument's
radius by the derivative bound. Writing that propagation on the decimal
path in stage 1 would be work thrown away a stage later.

**D6. The table is built once, at the ceiling of the retry schedule, for
every setting.** From stage 3 the angle units call `pi()`, so their
quantities carry a radius, and a unit's radius is fixed when the table is
built: the passes of the retry loop re-evaluate the expression, not the
table, so no pass can shrink it. A unit's precision must therefore lie
above every pass, or a pass that would otherwise certify `p` digits is
held back by the unit. The schedule of D12 doubles up to one
ceiling, the same for every request under the cap setting, so the table
is built once at that ceiling and rebuilt only when the cap changes it:
the digits setting changes what the display asks for and what the passes
compute at, never the table. At the default ceiling of 4,040 digits
`pi()` costs a few milliseconds once, each angle unit holds a rational of
four thousand digits, which the lookup settles to the pass's precision
(D15) so that no pass carries more of it than it computes at, and a
conversion at `p` digits certifies from a unit accurate to the ceiling,
with the rest of the ceiling as room for cancellation on the unit's side:
`turn` into `deg`
certifies every one of its `p` digits of `360`, and shows `≈` only
because the radius is not zero, as the study accepts. So the precision a
user asks for is always reachable through `pi`; what is not reachable is
exactness, which is the symbolic layer's business (docs/future.md). The
alternatives: rebuilding the table at each pass's precision, milliseconds
per pass and a table per pass, for no gain, since no pass needs a unit
beyond the ceiling; and a table per setting at the setting's own ceiling,
which the absolute ceiling makes unnecessary and which would hold one
table per setting the session had seen. `system-table.ts` holds the one
table, and the definitions text is fetched once.

**D7. Certification is "both ends round alike".** A ball certifies `d`
digits in a rounding mode when `mid - rad` and `mid + rad`, as exact
rationals, round to the same `d`-digit value in that mode. That is the
definition; the implementation forms the two ends only where it can, and
once the midpoint carries an exponent (stage 4) it compares a decimal
midpoint with a binary radius by their exponents and leading digits where
forming either is infeasible (4.4: the distance from the midpoint to the
nearest rounding boundary, exact on the midpoint's side, against the
radius by its bounds). Rounding is
monotone, so every value between them rounds to it too, and the shown
digits are what rounding the true value would give: correctly rounded,
not merely close. The ball is symmetric about its midpoint but the
rounding cells are not aligned with it, which is why the rule looks at
the two ends rather than at the radius. The natural alternative, a radius
below half a unit in the `d`-th digit, is necessary but not sufficient:
a ball of radius `10^-30` around `1.2345` fails it at four digits under
half away from zero, because the true value may lie on either side of the
tie and the fourth digit is `4` or `5` accordingly, and showing `1.235`
there would show a digit the ball does not know. The price of the
stronger rule is a retry when the true value lies near a boundary (the
next pass narrows the ball past it), and a value exactly on a boundary
reached through an irrational step, which no pass resolves, ends at the
ceiling with one digit fewer than asked; the study lists that case, and
it is the one the radius-only rule would get wrong rather than slow. This
one definition covers the nearest and the directed modes, ties, and the
carry across a power of ten, without special cases.

Certification is not monotone in the digit count: the ball `[1.246,
1.254]` certifies three digits, both ends rounding to `1.25`, and not two,
`1.25` being a two-digit tie, so `certifiedDigits` scans down from the
digits asked and takes the first count that certifies, and the boundary
case above ends with one digit fewer than asked in the usual case and with
none when the digit asked for is the first. In stage 2 the two ends are
formed as they are written here, the midpoint being a `Rational` under
the range limit; the comparison by exponents is stage 4's.

**D8. Unit list counts are taken from the midpoint.** In `convertToList`
each count is the truncated ratio of midpoints and the remainder is the
ball `have - count × size`, computed with the exact ball operations, so
that the terms times the units still contain `have`; a count is never
`unresolved`. One case goes the other way (amended at 3.4): when the
ratio's ball straddles an integer, the count is that integer, not the
truncation. Once the angle units carried `pi()`'s radius, `turn / deg` was
`359.999... ± ε`, truncated to 359 with a remainder of `60 - ε arcmin`, and
the carry `roundTerms` makes by exact arithmetic could not restore `360`
from units settled on their own, so `1 turn` in `deg;arcmin` read `359
deg + 60 arcmin`. A count that cannot be told from a boundary is best
taken as the boundary: the count stays exact, the remainder is a ball
around zero (a hair negative, perhaps), which the display leaves out as a
zero, and the line reads `≈ 360 deg`, which under `≈` is the better
reading. Exact units are untouched, since a ball of radius zero straddles
an integer only when it is one. A remainder that comes out slightly
negative that way, or slightly above a whole of the unit before it, is the
display's carry case, which `roundTerms` handles.

Amended in 4.0 for the exponent of stage 4: a count that would be an
integer too large to form (`1e999999999 m` into `ft;in`) is the ratio's
midpoint settled toward zero at the working digits, which is an integer
of that many digits times a power of ten and is kept exact, and the
remainder is what that count leaves, exactly for exact operands
(`5.2598425e+999999972 in` there); a count that is an integer of any size
stays exact, and a count is still never `unresolved` (landed in 4.4,
where `countOf` first read the exponent; this amendment as first
written had the count inexact and the remainder a ball around zero).

Clarified before stage 5 (H.12): a count other than the last whose ratio
falls below the exponent bound is exact zero, the unit being too large to
count by (`1e-999999999999999999 s` in `hr;min;s` is `0 hr + 0 min +
1e-999999999999999999 s`), and the rest is left as it was; so is one whose
ratio is `unresolved` at the bottom of the bound (D18), since every value
it may have truncates to zero. A ratio past the bound above, a last ratio
that falls below it, and a remainder whose subtraction falls below it
stay refusals of the conversion, and any other `unresolved` is the
conversion's, retried.

**D9. The kernel is fixed point with an integer error count.** A kernel
value is `{ value, error, bits }`: the integer `value` stands for
`value × 2^-bits`, and `error` is an upper bound, in units of `2^-bits`,
on its distance from what it stands for. Every operation updates `error`
by an over-approximation that is a few lines of integer arithmetic, so
the bound can be checked by reading. A series runs on such values with the
argument's error included from the start, which propagates the argument's
radius without a separate derivative bound; the truncation bound of a
series is taken at the upper end of the argument's interval. The kernel
hands back a ball whose midpoint is the dyadic `value × 2^-bits` itself
and whose radius is `error × 2^-bits` rounded up to a radius: nothing
between the kernel and the display rounds in a mode (D15), the mode being
the display's, applied once to a certified value, so that the digits shown
are the true value's rounding in that mode whatever happened inside.

Fixed rather than floating point: `bits` is the position of the binary
point, so the integer part is `value >> bits` and the fraction the low
`bits` bits, with no separate field for either. `bits` belongs to the
value: a routine chooses its result's `bits` after its argument reduction
so that a result of magnitude `2^k` keeps as many significant bits as an
argument of order one, which is how a routine whose result is small or
large (`sin` near zero, `exp` of a large negative argument, a root of a
tiny argument) states its scale, and `shiftFixed` is the exact rebase that
moves the binary point. Every routine works on values of order one after
its reduction, so the error count, which is absolute, is a relative error
too, and the count grows by at least one per operation, so a series of a
thousand terms spends ten of the 32 guard bits, which is why the guard is
bits rather than digits. The alternatives considered: a ball at every
step of the kernel, as Arb does, uniform with the value type but a radius
operation per arithmetic operation and a second representation to reason
about inside every series; two integer endpoints, an interval per
intermediate, twice the arithmetic and a rounding direction to choose per
operation; and guard digits with no error count, the classic approach,
which is not rigorous and could not produce a radius at all. The integer
count is the cheapest of these that yields a proof, and its rules are the
textbook ones.

**D10. `pi` and `exp(1)` are memoized privately, and the memo is
bounded.** The core has no globals, but a memo of a pure function of its
precision is unobservable through the core's results, as `lazy` in
parser.ts is, and the study asks for exactly that memo. Through memory it
is observable, so its footprint is fixed by construction rather than
bounded by an eviction policy: each constant holds exactly one value, the
digits at the ceiling of D12 plus a margin of 256 bits (64 until the
Gamma family's guards were found to exceed it at the ceiling pass, #117),
computed on first
use however low the first request, and every request at or below that,
which is every request the retry loop can make, is truncated from it. A
request at a higher ceiling, after the cap setting is raised, replaces
the value; a lower one leaves it. The footprint is therefore fixed by the
ceiling (about 1.7 KB per constant at the default ceiling of 4,040
digits; four constants, `pi()`, `exp(1)`, `ln(2)` and `ln(10)`), never by what the
user has typed, and the largest it can be is set by the hard bound on the
cap (D16). The margin is for the argument reduction of `sin` and `cos`,
which needs `pi` to the working bits plus the argument's bit length: at
the ceiling pass that exceeds the ceiling by the argument's bit length,
so without the margin every `sin(1 radian)` would recompute `pi` there;
with it, every argument below `2^256` is served from the memo at every
pass. The one request above the memo is that reduction at a larger
argument (under the range limit; an argument beyond that is refused as
`tooLarge`): it is computed for that call and not kept, so a `sin(1e5000
radian)` costs its milliseconds each time it is typed, at most `pi` to the
range limit plus the ceiling, about 25 ms at the defaults, and leaves
nothing behind.
The alternative, keeping the largest value seen, is what the study
describes and would be bounded too, but its footprint would depend on
what the user had typed, and freeing it would need a policy; the value at
the ceiling needs none.

**D11. The trigonometric functions take an angle, and their inverses
return one.** `sin`, `cos` and `tan` require an argument of the `radian`
kind, the kind primitive units.txt declares and every angle unit carries
(`deg` is `pi() radian / 180`, so `sin(30 deg)` is `sin(pi() / 6)` inside
the kernel, which sees the magnitude in radians); a plain number is a kind
mismatch, worded to say that an angle is wanted and how to write one
(`sin(1 radian)`, `sin(pi() radian / 4)`). `asin`, `acos`, `atan` and
`atan2` return a value of the `radian` kind, so `asin(0.5)` converts to
`deg`, `asin(sin(x))` has the kind `x` has, and `2 asin(0.5) + 1` is the
kind mismatch it is. `atan2(y, x)` takes two quantities of one dimension
and returns their angle, so `atan2(3 m, 4 m)` works. The hyperbolic
functions and their inverses take and return plain numbers, since their
arguments are not angles. The study says either choice fits; this one is
chosen because kinds exist to keep an angle from being mistaken for a
number, and the degree-radian confusion is the mistake they were
introduced against. Its cost is that `sin(pi())` is an error and is
written `sin(pi() radian)`, and a physicist's `sin(2 pi() f t)`, whose
argument is a plain number in this table (`Hz` carries no kind, as the
table's own separation of `rad/s` from `Hz` decides), is written
`sin(f t turn)`, which is what it says. The rule names the primitive
`radian` by convention; a table that declares no such primitive has no
angles, and the trigonometric functions say so.

Why the inverses return an angle rather than a number, since that half is
the less obvious: the argument of `asin` is a ratio, a plain number
(`asin(3 m / 5 m)` works, the metres cancelling), and the result is the
angle that has that ratio, which is exactly what the kind system has a
word for. Returning it as an angle is what lets `asin(0.5)` be converted
into `deg` at all, the one thing a converter's user does with an angle;
as a plain number it could not be, since `1` does not conform to `deg`.
It is also the only choice under which the forward and inverse functions
agree: `sin(asin(0.5))` evaluates and `asin(sin(x))` has the kind `x` has,
where a number-valued inverse would make `sin(asin(0.5))` a kind error
and the round trip lose the kind. What it costs is the places where an
angle is wanted as a bare number: `2 asin(0.5) + 1` is a kind mismatch,
correctly, and `asin(0.5) / pi()` is an angle, not a fraction of a turn.
Three ways to the number exist, each one token: the `want` field
(`asin(0.5)` into `turn` is `≈ 0.083333`, into `radian` the count in
radians), `/ radian` in the expression, or the lenient kind conversion
that ARCHITECTURE.md already lists under "Later", a flag on `convert`
that would let `asin(0.5)` into `1` succeed on request. None of these is
needed to use an inverse the way the app is for: an angle in, an angle
out, a unit to show it in.

**D12. The retry schedule doubles up to a ceiling derived from the cap on
the digits setting.** The internal precisions are `p + 10`, `2 (p + 10)`,
`4 (p + 10)`, ..., for `p` digits wanted, doubling up to and including
the ceiling, which is the same for every `p`: `ceilingFor(maxDigits) =
4 (maxDigits + 10)`, where `maxDigits` is the cap on the digits setting,
itself a setting (D16) with the default `DEFAULT_MAX_DIGITS`, 1,000, so
that the default ceiling is 4,040 digits, nine passes at `p = 8` and
three at `p = 1000`. The factor four gives the largest request two
doublings of room for cancellation above it, and a smaller request has
correspondingly more. A pass that certifies ends the loop, so the length
of the schedule costs nothing in the common case; the expressions that
never resolve (`sin(pi() radian)`, `sqrt(2)^2 - 2`) run to the ceiling
however it is set, which is what bounds their latency, and the cap is
therefore a cost setting: every elementary function at four thousand
digits is milliseconds, and the special functions of stage 6 are where
the cost is measured (stage 8). The ceiling is a field of the context (D1), set by
the shell from the cap it owns and the same in every working context the
schedule derives; a context whose precision exceeds the cap is a
precondition failure of the schedule. The ceiling is static, the user's:
it bounds the schedule, and so the latency, and it sizes the memos of
D10. An operation that needs more headroom than the working precision
takes it inside the kernel (the guard bits, the extra terms of a series,
`pi` to the working bits plus the argument's bit length for a reduction)
and never moves the ceiling, since headroom is a property of one routine
at one argument and the ceiling a property of the whole schedule. The
hard bound on the cap comes from the range limit, D16, since a settled
midpoint at the ceiling must fit it with room for a product of two: at
the default range limit the cap may be raised to about 2,400 digits, and
a test pins the relation. The ceiling being the same for every `p` is
also what lets D6 build the table once for the setting in force.

**D13. The midpoint's exponent is a type of its own, `Scaled`, between
the fraction and the ball (stage 4).** `Scaled = { mant: Rational; exp:
bigint }` in `scaled.ts` stands for `mant × 10^exp`, in a canonical form:
`mant` in lowest terms with its denominator coprime to 10 and its
numerator not divisible by 10 unless zero, and zero as `exp` 0, so that
equal values have equal representations and `equals` stays structural.
Stripping the factors of 2 and 5 from a denominator and the trailing
zeros from a numerator is a loop of small divisions, done in the
constructor `scaled` on top of the lowest-terms invariant `rational`
already keeps, each constructor owning one rule. The form is internal:
`format`, `roundTo`, `toRational` and the fraction display of stage 5 are
functions of the value, not of where its powers of ten sit, and a test
asserts that `2.54`, `254/100` and `127/50` render alike in every display.
The decimal mode is an invariant on the same type, a denominator of one
and a numerator below `10^p`, not a type of its own.

This revises the first version of the plan, which put `exp` on `Rational`
itself, after review. The exponent does not change what the fraction
denotes (`num / den × 10^e` is an exact rational) but it changes what
the type promises: with an exponent, `add` and `subtract` can fail, since
`1e999999999 + 1` cannot be aligned without forming a number of a billion
digits, and `Rational` has users that need a total, small fraction with
structural equality and no power of ten: the exponents of dimensions,
which dimension.ts adds and subtracts through rational.ts, the `^`
exponent the parser reads, and the exact value of a radius. One type
would serve the magnitudes by degrading those. The canonical 10-free form
belongs with the exponent, not with every fraction. And nearly everything
in rational.ts beyond fraction arithmetic is decimal representation
(`parseDecimal`, `format`, `roundTo`, `decimalExponent`, the range limit's
sizing, the roots' scaling) and changes with the exponent, so it moves to
scaled.ts and rational.ts is left the exact fraction. Not flat in the
ball either: a midpoint must stand as a number on its own, with its own
comparison, rounding, formatting, certification and settling, and a
parsed literal is a number before it is a ball. The types then form a
ladder in which each layer adds one concept: `Rational` exactness (a
fraction in lowest terms, total arithmetic), `Scaled` range (a power of
ten, fallible alignment, the exponent bound, the decimal mode's
invariant), `Radius` a coarse bound, `Ball` uncertainty (a midpoint with
a radius), `Quantity` a dimension. The radius is not a field on the
number because it is a new concept; the exponent is not a field on the
fraction because it is a new contract. Nothing in stages 1 to 3 changes:
the ball's midpoint is a `Rational` until 4.4 makes it a `Scaled`, and
since the ball hides the midpoint's type from the evaluator, the table
and the build, the change reaches only the readers of `.mid`. How a
settled dyadic midpoint (D15), `num × 2^-k`, becomes a `Scaled` with its
power of ten is 4.1's to decide, by settling to a decimal in that stage
or by a binary exponent beside the decimal one; nothing in stages 2 and 3
depends on the answer.

Settled in 4.0 (docs/decimal.md): the kernel's binary scale is settled
into the power of ten at the kernel's exit, and the type carries one
exponent, as written above. A dyadic `d × 2^-k` entered exactly would be
`d × 5^k × 10^-k`, three times its size for no information, so a kernel
result is rounded to nearest at the working number of decimal digits as
it leaves the kernel, the rounding into the radius, which is the settle
D15 gives every inexact result; and `settle` rounds onto the same
decimal grid, a division by a power of ten in place of a shift, measured
at 0.2 ms against 0.04 ms at the default ceiling and nothing below it.
Everything above the kernel then works in one base, exactly and totally
within the range limit, and log space is needed only at the kernel's
exit for a result whose binary exponent cannot be formed (4.9). The
note's first draft carried a binary exponent beside the decimal one,
which let both enter exactly but leaked the mixed base into every sum,
comparison, certification and radius; the note records why that was
withdrawn.

**D14. The exact functions (`abs`, `floor`, `gcd`, ...) come after the
elementary set and before the Gamma family.** They depend only on the
built-in mechanism, and they exercise the one dimension rule the
elementary set does not need, a result that keeps its argument's
dimension. The study lists them with feature 3; they open stage 6 here so
that stage 3 stays about one thing.

**D15. Inexact midpoints are settled to the working precision; exact
values never are.** Two things wear the name "exact mode" and only one of
them is about exactness. An exact value, radius zero, is an exact rational
however it was formed, and every exact operation on exact operands keeps
it so: that is what `=` means, what stage 5 displays as a fraction, and
what the range limit of D16 guards. An inexact value is a ball, and its
midpoint is a number computed, not a number known; keeping it as the
exact rational result of exact operations on kernel outputs spends
exactness on a value that has none, and lets its size grow without bound
through an expression (`x^5` of a 13,000-bit dyadic is an exact
67,000-bit rational whose information is 13,000 bits), which is where the
range limit and the precision collided in the first version of this plan.
So the evaluator settles every inexact result it produces, in one place,
as 4.5 planned for the decimal mode: `settle(b, context)` rounds the
midpoint to nearest at `bitsFor(precision)` significant bits, a dyadic,
and adds the rounding to the radius; an exact ball is returned as it is.
The lookup settles a unit once when it is looked up (a unit built at the
ceiling is thereby cut to the pass's precision, which is what makes D6's
one table cheap at every pass), and `powBall` on an inexact base
exponentiates by squaring with settling, so `sqrt(2)^1000` is ten
multiplications at the working precision and only its magnitude is
guarded. This is Arb's discipline: whole-expression precision is
untouched, since the errors settling adds are at the working precision,
far below the digits asked, and the retry loop raises that precision
until the digits certify; the midpoint that settling changes is one that
nothing but the tests can see.

Where the user's rounding mode applies, then, is settled here for both
modes. In exact mode it applies exactly once, by the display, to the
certified value of the whole expression, and no intermediate operation
rounds in it: settling rounds to nearest at the working precision, which
is not a rounding the user chose but a bound on the size of a number the
user never sees, and certification guarantees that the display's rounding
of the midpoint is the true value's rounding in the mode, so a mode
applied inside would change nothing that is certified and would be a
double rounding besides. That is whole-expression rounding, the
counterpart of whole-expression precision. In stage 4's decimal mode the
same `settle` rounds every result at the user's precision in the user's
mode, and the mode therefore applies at every operation: that is the
per-operation semantics the user chooses by choosing the mode, and 4.5
says why. The two modes differ in nothing else.

Restated in 4.0 for the `Scaled` midpoint: in exact mode `settle` rounds
an inexact midpoint to nearest at the working number of decimal digits,
`digitsFor(bitsFor(precision))`, on the decimal grid the kernel's results
are rounded onto as they leave the kernel, so the dyadic it speaks of
becomes a decimal of the same size and the two modes are one `roundTo`
with two parameters; in decimal mode the radius grows by the exact
rounding error rather than the half-unit bound, since a value rounded to
`p` digits with half a unit of radius has its ends on the rounding
boundaries and would never certify its last digit (4.5). And a sum whose
exact alignment does not fit the range limit settles its operands first
and absorbs the smaller into the radius when they still do not align,
whenever an operand is inexact, or in decimal mode, since the result was
about to be settled anyway; two exact operands in exact mode are
`tooLarge`, as exact values never round (4.4).

Amended before stage 5 (D17, H.11): in exact mode, a settle whose
rounding to nearest would carry a midpoint past the top of the exponent
bound rounds toward zero instead and adds a whole unit in the last digit
to the radius, so that settling never refuses a value; in decimal mode
the rounded value is the result, and one past the bound is refused.

**D16. Two limits, on two axes, both the user's to set.** Range and
precision are different quantities, as a float's exponent width and
mantissa width are, and one number cannot stand for both. The range
limit, `maxBits`, bounds the size of an exact value, numerator and
denominator, and so the magnitude of anything: it is what turns
`10^(10^9)`, `1e999999999` and a power of an inexact value beyond any use
into a clean `tooLarge` rather than a hang, and it is needed at every
precision. It is the third field of `NumberContext`, since `pow` and the
literal check apply it and every core function that does arithmetic
already takes the context; the parser, which has no context, checks a
literal against the hard bound `LIMIT_BITS` (2^20, about 315,000 digits,
the most the setting may take), and the evaluator checks it against the
setting when it reads the literal. Its default is the `MAX_BITS` of stage
1, 2^16. The precision limit is the cap on the digits setting,
`maxDigits`, from which D12 derives the ceiling; its default is 1,000 and
its hard bound follows from the range limit as D12 says. Both are
settings beside the digits and the mode, validated on the way in with the
dependent one clamped (a range limit lowered below what the cap needs
lowers the cap, and a cap lowered below the digits lowers the digits), so
that a stored entry can never leave the app with an inconsistent context.
And because both are cost limits whose right value depends on the device,
the settings panel offers to recommend them: a probe (app code, beside
settings.ts) times the app's costliest operations at increasing sizes, an
exact operation on values of a given size for the range limit and the
costliest inexact operation the app has at a given precision for the cap
(the root in stage 2; from stage 3 a composite expression of the
costliest built-ins, chosen from the kernel benchmark's report of every
routine, 3.11), and takes the
largest values whose cost stays under a latency budget per pass. The
probe runs only when asked, since a benchmark at every launch would be
noise on the main thread for a number the user can also type; stage 8's
measurements of the special functions revise its budget and the defaults.
The probe measures time alone, and memory is an explicit omission. A
browser exposes no portable measure of the memory a page may use:
`performance.memory` is one vendor's and deprecated,
`navigator.deviceMemory` is a coarse bucket absent from two of the three
engines, and `measureUserAgentSpecificMemory` needs cross-origin
isolation; and the one way to find the limit without an API, allocating
geometrically until something fails, can leave the page in an
indeterminate state or crash the tab, neither of which is acceptable. The
budget on time bounds memory indirectly for these workloads, since a
value of `n` bits is `n / 8` bytes and the operations timed hold a few of
them, kilobytes to a few megabytes at any latency a phone can meet. The
decision is revisited if a portable measure appears.

Restated in 4.0, as the stage 4 introduction says: once the midpoint
carries exponents (D13), the range limit bounds the size of an exact
value, a mantissa's numerator and denominator, and the alignment of a
sum, which is the size the exact result would have (a comparison aligns
only values of one decimal exponent and needs no limit; a product and a
quotient are not held to it yet, issue #52); it no
longer bounds the magnitude of a value, which the exponent bound
`MAX_EXPONENT` (`10^18`, 4.2) bounds for exact and inexact values alike. The literal
check is the mantissa's digits against `LIMIT_BITS` in the parser and
against the range limit in the evaluator, and the exponent against the
exponent bound in the parser; `maxDigitsFor` is unchanged, since a
settled midpoint at the ceiling must still fit the range limit with room
for a product of two.

Restated again before stage 5: the exponent bound is on a value's decimal
exponent, not on the exponent of its representation (D17), and the range
limit holds every exact result where the evaluator produces it, sums,
products and quotients alike, not only a sum's alignment and a power
(D19).

Restated once more, with D19 and D20, on what the range limit is. It is
a hard limit on cost: on the bits the app forms, holds and multiplies
for one number, in time and in memory, which is why its right value is
the device's and the probe recommends it. Its measure is therefore the
size of what is stored, the canonical mantissa of a `Scaled` (D13), a
numerator and a denominator each in bits, and not the bits of the value
the mantissa denotes. The two differ for a dyadic: `2^-30000`, a value
of 30,000 bits, is stored as `5^30000 × 10^-30000`, whose numerator has
69,658 bits, and that is what a product of it costs. The case deserves
its context, since it looks worse than it is. What makes a value
expensive is the bits of the two integers that store it, not how simple
its factorization is: `3^-100000` is as simple as `2^-30000` in that
sense, and is stored as itself, `1/3^100000`, 158,497 bits under this
representation and under any other short of a factored one, which the
app does not use and does not plan to. The canonical form adds cost in
one case only, a denominator with twos, which it trades for fives in the
numerator: a factor of `log2 5`, about 2.32, for a pure power of two,
less for a mixed denominator, and nothing at all for a denominator with
no twos, which is every other fraction. So the factor is bounded, it
bites only in a band of a factor of 2.32 below the limit, and only for
dyadics, and a value it moves past the limit was already, by its own
bits, within that factor of it: a big number by the measure that
matters, for which `approx` is the remedy as for any other. A
representation with a binary exponent beside the decimal one, the
draft docs/decimal.md withdrew, would have kept `2^-30000` at 30,000
bits and done nothing for `3^-100000`; the cost is in storing exact
rationals as digits, not in the power of ten. The owner's ruling, on
review of this restatement, is to keep the representation and the
decision and to document the rough edge plainly, which README ("Most
bits") and ARCHITECTURE.md ("Size limits") do. That is where the
range limit differs from the exponent bound, and deliberately so. The
bound is on the value (D17), since it exists so that a value can always
be written, and a refusal at it must never be false about the value; the
range limit is on the representation, since it exists so that the app
never forms more than the device can afford, which is a fact about the
representation and not about the value, and nothing else could be
measured without forming what the limit forbids. So a refusal at the
range limit says that a result was too large to hold, names the node
that formed it, and names the remedy, `approx` around an operand of that
node or a higher `maxBits`; and README's "Most bits" says what is
counted. Whether exact
mode rounds instead of refusing there is D20.

**D17. The exponent bound is on the value, not on its representation
(added before stage 5).** A value is within the bound when its decimal
exponent, `floor(log10 |v|)`, lies within `±MAX_EXPONENT`. That is the
exponent the display writes and the messages speak of. Zero is within at
any exponent.

D13's canonical `exp` may then pass `±10^18` by up to the mantissa's
digits: the denominator's digits above the bound, the numerator's below.
Nothing needs it to stay within. The 128-bit `log2 10` of `log2Bounds`
stays within `2^-68` there, and every `Number` taken of an exponent is
guarded first.

Stage 4 checked the bound in four ways:

- the canonical `exp` in `scaled()`;
- the exponent as written in `parseDecimal`;
- nothing in `roundTo`;
- the decimal exponent in `powerRefusal` and the guards.

So the edge moved with the representation:

- `1e1000000000000000000 / 3 * 10`, whose value `3.3e+10^18` is within,
  was refused with a message saying its exponent passes `10^18`.
- `1e-1000000000000000000 / 7`, which is past, was held.
- The same quotient by `approx(3)` crashed once settled (#44), since
  settling moved a fraction mantissa's canonical exponent past the edge.

With the bound on the value, an exact value and its settled form lie on
the same side of the edge, except at the top. There a rounding can carry
`9.99…e(10^18)` to `1e(10^18+1)`, and three rules apply:

- `settle` in exact mode rounds toward zero instead, and adds a whole unit
  to the radius. Settling is a bound on size (D15) and never refuses a
  value.
- Decimal mode refuses it, since there the rounded value is the result.
- The display's own carry is 5.0's to rule on.

The check is cheap. `scaled()` computes the decimal exponent only when
`|exp|` lies within `4 × 10^8` of the bound, which is more than the digits
of any bigint, so the common case costs one comparison. A ball is within
the bound when its midpoint is within it and `|mid| + rad` lies below
`10^(10^18+1)` (D18), save that exact mode's `settle` at the top may carry
`|mid| + rad` to that edge by the unit it adds. A ball may reach below
`10^-(10^18)`, around zero or not: zero is within at any exponent, and a
radius is not held to the bottom edge.

The alternative was to make the canonical check consistent everywhere. It
was weighed and rejected:

- It keeps a refusal whose message is false for a fraction mantissa.
- It makes whether a value is held depend on whether it is exact.
- It would have to overrule `powerRefusal`, which already reads the value,
  for no gain.

The sites that read the bound, and the tasks that bring them to this rule:

- `scaled()` and `parseDecimal` (H.13, #50), and `pow`'s canonical
  pre-check, which goes (H.13).
- `settle` (H.11).
- The product and the quotient of balls, and the sum of #48 (H.13, D18).
- The guards of the exponential family and of `powBall`, and `digits.ts`'s
  `floatingToBall` (H.15).
- The sites that form `10^±exp` only to take its radius: `positiveRoot`,
  `lnScaled`, `halfUnitOf` and `approxBall` (H.4, H.11).
- `farLogarithm`, which formed `2|x|` (H.4).
- convert.ts's `decompose` and `roundTerms`, which assumed that a
  quotient, a product and a difference of values within the bound stay
  within it (H.12).

**D18. The exponent bound is an edge of D4, and a refusal needs the whole
ball past it (added before stage 5).** A result that passes the exponent
bound for some values of a ball and not for others is `unresolved` at the
edge `bound`, as a divisor straddling zero is `unresolved` at the edge
zero. The answer, a value or a refusal, depends on which side the true
value lies. The retry loop, which retries every `unresolved`
(`isUnresolved` in pipeline.ts), narrows the ball until that is decided.
Apart from decimal mode's rounding, whose rounded value is the result and
is refused past the bound even when the value before it was within (D15,
as amended), `overflow` and `underflow` are returned only when every value
of the ball passes the bound on the same side, since a refusal is final
(`resolve` does not retry it) and must never be wrong. A guarded built-in
computes a result only when every value lies within the bound, with a
margin for the kernel's error; `sinh`, `cosh` and a power of a base whose
ball contains zero are tested against the top edge alone (H.15). The
arithmetic computes a result when its midpoint is within the bound and
`|mid| + rad` lies below the top (H.13). Either may return a ball that
reaches below `10^-(10^18)`, since zero is within at any exponent (D17). A
ball of unbounded radius keeps its convention: its midpoint alone is held
to the bound.

This holds for the guarded built-ins and for the ball arithmetic:

- Stage 4's guards refused on the whole ball's magnitude, so
  `exp(approx(1e999) - approx(1e999 - 5))`, an argument of 5 within
  `2e948`, was refused (#40).
- Stage 4's arithmetic refused on the midpoint (#60). Under D18, a
  product, a quotient or a sum whose midpoint passes the bound while its
  ball reaches back within it is `unresolved`. One whose ball contains
  zero while its midpoint passes below is zero within its bound.

Under D17, the arithmetic's midpoint rule would have turned values stage 4
certifies into final refusals, so D17 and this rule land together (H.13).
Stage 4 certified
`(approx(9999999999999999999999999999510000000000000000) - 9999999999999999999999999997310000000000000000) * 4e999999999999999982`
as `≈ 8.8e+1000000000000000000` only because the canonical check left a
settled midpoint the slack of its digits.

The edge is a name, not a number, since for a power it lies on `y ln x`
rather than on an argument. `Edge` gains `"bound"`, worded "the point
where the result passes the exponent bound". `BallError`'s `unresolved`
carries its edge, so that the evaluator, `fromBallError` and the converter
pass it on rather than assuming zero.

The alternative, a retryable error kind of its own (#40's suggestion), was
weighed. It costs about as many sites, and it would be a second word for
what D4 already means, with a second retry predicate to keep in step. In
decimal mode one pass is the whole schedule (4.6), so an `unresolved` at
the bound is final there, as every `unresolved` is.

**D19. Every exact result is held to the range limit where the evaluator
produces it (added before stage 5).** Stage 4 held a sum's alignment and a
power's predicted mantissa to `maxBits`, and no other result an expression
forms; the literal check holds what is typed, and the kernel is handed no
argument past `2^maxBits`. The argument was that an operation which grows
its inputs by a constant factor needs no check, since an expression of
bounded length applies a bounded number of them. But nothing bounds the
length (#52):

- an exact product of coprime powers, each within Most bits, reached
  1,096,425 bits;
- a sum of three fractions reached a denominator of 155,588 bits in 2.7 s;
- a conversion between two such products took half a minute.

The rule:

- Every exact node result in exact mode is `tooLarge` at the node's span
  when its reduced canonical mantissa has a numerator or a denominator
  past `maxBits`. The measure is the canonical form's size, the cost the
  limit bounds (D16 as restated once more): it is what is stored and what
  the next operation multiplies, it is the measure the literal check
  already uses, and the value's own bits could not be read without
  forming the power of ten the form moved out. For a dyadic the two
  differ by a factor of up to 2.32, which matters less than it seems: a
  value the factor moves past the limit was already, by its own bits,
  within that factor of it, a big number by the measure that matters
  (D16 as restated once more has the limiting cases).
- The refusal names the node and the remedy (D20): the message quotes the
  subexpression, says it is too large to hold exactly within `maxBits`,
  and says to write `approx` around its first operand (a binary's left,
  a power's base, a call's first argument) to compute it to the digits
  asked, or to raise `maxBits`. `approx` around the node itself would
  come too late, the node being refused before `approx` sees it, which
  H.14 found; an inexact operand is what makes the result inexact.
- The exponent bound is checked first, so that a result past both is
  reported at the bound.
- The check runs in `evaluate()`'s wrapper on the settled result, which
  every node, every unit looked up and every call's result passes through.
  It runs again after the pipeline's two quotients that lie outside the
  evaluator: the conversion's ratio and a function want's count.
- Inexact results, and every result in decimal mode, are settled (D15) and
  never refused for size.
- Some operations are exempt, since each works on node results already
  held to the limit, within a constant factor of them: the built-ins'
  internal intermediates, a unit list's decomposition, `powBall`'s settled
  loop and the display's reciprocal.
- No signature changes. `multiplyBalls`, `divideBalls` and `convert` take
  no context, as 4.4 left them. The table's prefix lookup keeps its
  assertion, since the node that names a unit checks it.

Measuring after the fact, rather than predicting from the operands' sizes
as a power does, is deliberate. A prediction from unreduced sizes refuses
`x / x`, and for a quotient it is no bound at all: `1/2^30000` has a
69,658-bit canonical numerator. The cost is one reduction per node on
operands within the limit, which H.9's reductions make milliseconds. The
hard limit on cost still holds: the most that is formed before the check
refuses is a product of two mantissas within the limit, a sum aligned
within it, or a quotient's two unreduced parts, each at most twice the
limit and reduced once, which is the operation the probe times when it
recommends the limit, so the budget already includes that factor of two.
What can be predicted cheaply before forming still should be, as a power
is today and `factorial` and `binomial` will be in stage 6, with the node
check as the backstop.

Sums are included, since a sum of fractions grows as a product does, and
README ("Most bits") already promises a bound on how large a numerator and
a denominator may grow. One visible consequence, of the measure as much
as of the rule: `1 / 2^n` is refused past `n ≈ 28,225` at the default, as
`0.5^30000` already is, since each is stored with `5^n`.

`approx` is the escape hatch: an inexact operand makes the result inexact,
so it is settled rather than refused. Whether the app should apply that
rounding on its own, rather than refuse and name the node, is the question
D20 answers.

**D20. Past the range limit, exact mode refuses at the node and names the
remedy; it does not round on its own (added before stage 5; ruled by the
owner in review, #72).** The range limit is a hard
limit on cost (D16), and there are two things an exact computation can
do when an exact result would pass it: refuse, at the node, with a
message that says where in the expression the precision the user asked
for, or the exactness they implied by writing exact values, was more
than the limit holds; or round the result there to the working digits,
as `approx` at that node would, and carry on, the retry loop then
certifying the digits asked as it does for any inexact value, and the
display saying `≈`. #52 records the owner's leaning toward rounding.
The decision is to refuse, for these reasons:

- **The mode's contract.** Exact mode's one promise (D15; docs/decimal.md,
  "What stays exact") is that exactly three things ever make a value
  inexact: an inexact function, `approx`, and the decimal mode. The
  design has twice declined to add a rounding the user did not ask for
  (docs/decimal.md's "Alternatives considered", on a sum that cannot be
  aligned; docs/approximate.md, on a mode that rounds every literal),
  each time on the same ground: a value the user wrote exactly is not
  silently replaced by one that is not it. A rounding at the range limit
  would be a fourth source, and the only one the user cannot see in the
  expression.
- **The limit is the device's.** The probe recommends `maxBits` per
  device, so under rounding the same expression would be `= 0` on one
  machine and `≈ 0` within a bound on another, with nothing in the
  expression to say why. A refusal is loud, local, and the same
  everywhere but for where it fires.
- **The remedy is one token, and it is the user's choice.** The message
  names the node and the two ways out: `approx` there, which accepts `≈`
  for that part and nothing else, or a higher `maxBits`, which pays. The
  app cannot know which the user wants; a user checking an exact
  identity wants the second, a user converting a measurement the first.
- **Cost.** Refusing ends the work at the node. Rounding would carry on,
  and every downstream operation would run on a value that the user may
  not have wanted computed that way.
- **The calculator's behavior exists already.** Decimal mode is the mode
  where every step rounds, and `approx` is the per-value form of the
  same thing. A user who wants the app never to refuse has both.

Two things follow from the ruling. Knowing the node lets the user
either round there with `approx` or raise `maxBits`; to make the second
realistic without trial and error, the refusal should also say how many
bits the result needed, or a bound, which is known where the check
measures after forming and predictable where it refuses before. That is
a feature of its own, #73, to be studied there and landed after H.14,
whose message it extends. And what rounding would be, should the ruling
ever be reversed, so that the reversal is one amendment of D15 and D19
rather than a redesign: the
node's exact result past the limit is settled to the working digits by
D15's settle, half a unit in the last digit into the radius, and the
quantity is marked as rounded with the node's span, which the pipeline
carries to the display as a note beside the value ("rounded within Most
bits at `…`", quoting the subexpression), `=` being denied as for any
inexact value; the retry loop certifies the digits asked as it does for
`approx`, and nothing downstream changes. What would still refuse under
either rule: a literal past the limit where it is typed, the kernel's
reach (`sin(1e999999999 radian)`, which no rounding of the argument
helps), and the exponent bound. The tasks the reversal would touch are
H.14 (the check's action and its message), the display's note and the
README; the check's place, its measure and its tests are the same under
both.

**D21. The fractions display writes every exact value that is not an
integer as a reduced fraction, when it fits, and writes every inexact
value as a decimal (added before stage 5; ruled by the owner in the
review of 5.0).** docs/fractions.md is the design. The study's feature 7
writes an exact value as its fraction in lowest terms and an inexact one
as a decimal with `≈`; the choice it left open was whether a value the
decimal display already writes exactly (`2.54`, `1.609344`, `1e-7`)
should still become a fraction (`127/50`, `25146/15625`, `1/10000000`)
under the setting. The alternative weighed, a fraction only where the
decimal is inexact, has one property to recommend it, that the setting
only ever turns a `≈` line into a `=` line, and was set aside: the
setting shows fractions, for understanding as much as for exactness, and
a user who asks for them asks to see them. So an exact integer is
written as the decimal display writes it, every other exact value as its
fraction when the numerator and the denominator each fit within Digits
digits, and everything else by the decimal display, which says `=` where
its own rule allows. The fit rule is provisional, firm for stage 5 and
studied after it (#91). An approximating fraction for an inexact value,
the study's later refinement, is ruled out for now: a decimal says what
is known and no more.

**D22. The exact functions: `floor` and its kin take a plain number;
`div` and `mod` are floored division; `gcd` and `lcm` are non-negative
(added before stage 6; ruled by the owner on the design note 6.0).**
docs/special.md is the design. The plan had `floor`, `ceil`, `trunc` and
`round` keep their argument's dimension; a quantity's magnitude is
stored in the primitives, so `floor(3.7 ft)` would answer `1 m`, and a
function whose answer depends on the unit the value is written in is
defined only on plain numbers (`abs`, `sign`, `div` and `mod` are
invariant under the unit's scale and take quantities). `round(x,
places)` rounds to decimal places, in the context's rounding mode, with
no mode argument, since the grammar has no way to pass one (#98 tracks
significant digits and uncertain readings). `div` and `mod` come as a
pair, concordant as Boute requires (Raymond T. Boute, "The Euclidean definition of the functions div and mod", ACM Transactions on Programming Languages and Systems 14(2), 1992, pages 127 to 144), and the pair is the floored one:
`div(a, b) = floor(a / b)` makes `div` concordant with `floor` too, the
remainder carries the divisor's sign, and it is what Python, Excel and
Mathematica do; the Euclidean pair, which Boute prefers, is one call
away. `gcd` and `lcm` are non-negative on absolute values, a
normalization independent of the division, since Euclid's identity
holds for any quotient.

**D23. A function is a signature, `=` and a body, and its inverse is a
definition of its own (added before stage 7; ruled by the owner on the
syntax options for 7.0).** The bracketed form of docs/functions.md,
`tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`, is replaced
outright, and the five functions of units.txt are rewritten in it. No
user definitions are stored anywhere yet (storage and an editor are a
"Later" item of ARCHITECTURE.md), so a change of syntax costs nothing
now and would cost a migration later. A function and an inverse read:

```
normcdf(x) = (1 + erf(x / sqrt(2))) / 2
kinetic(mass: kg, v: m/s) = mass v^2 / 2
bmi(weight: kg, height: m): kg/m^2 = weight / height^2
tempC(x) = x K + 273.15 K
~tempC(y) = y / K - 273.15
```

- **The head** is the name, then its parameters in parentheses separated
  by commas, each optionally annotated with `: unit`; then, optionally,
  `: unit` for the result; then `=` and the body. Spaces are allowed
  inside the head, so it is read by a parser rather than by today's
  single-token regex. The head still decides the grammar: a name
  followed directly by `(` makes the line a function, and a line that
  starts with `~` makes it an inverse.
- **A parameter without an annotation is a plain number.** An annotation
  is checked against the argument by conformance, the test a sum
  applies, at the call and in the build's dimension check of the body.
- **The result's annotation is optional.** If it is absent, the result's
  dimension is inferred by `dimensionOf` from the parameters'
  dimensions. That inference is exact, since a body's dimension never
  depends on its argument's value. If it is present, it is checked
  against the inferred dimension. A plain result is asserted with `1`.
- **`~name(p) = body` defines the inverse of `name`, and is optional.**
  It requires `name` to be defined with exactly one parameter. Its
  parameter has the dimension of `name`'s result, and its body must
  conform to `name`'s parameter. A function without an inverse cannot be
  the want, and the error says so and names the `~` form. The two lines
  may appear anywhere in the file, as every definition may, and are
  conventionally adjacent. A `~` line without its function is a build
  error.
- **`=` ends the head because an annotation is an expression** and
  juxtaposition multiplies: after `: J  mass v^2 / 2`, whitespace alone
  would read `J mass v^2 / 2` as one product. `=`, `:` and `~` appear
  nowhere in the expression grammar, so every decision is still made
  from the text alone.
- **Annotations are evaluated among the units alone.** A parameter's
  name means the parameter in the body and nowhere else, so an
  annotation can name neither a parameter nor itself.

The alternatives weighed were:

- **The bracketed form extended in place,** `kinetic(mass, v) [kg, m/s;
J] …`. It matches annotations to parameters by position, it is all or
  nothing, and it has no natural home for bounds.
- **Annotated signatures with the inverse after a `;` on the same
  line.** This keeps the old form's use of the function's own name for
  its value, and crowds the line.
- **GNU-style keyword clauses** (`units=[…] domain=[…]`).
- **A multi-line block,** which would make the file sensitive to
  indentation for one kind of definition.

The inverse on its own line makes "optional" literal. A function has no
inverse slot to leave empty, and adding an inverse adds a line. The line
reads as what it is, it gives the inverse a parameter of its own, and it
leads to `~tempC(373.15 K)` in an expression, a call of a name that
already exists (docs/functions.md, "Not in this design").

D23 leaves room for these evolutions:

- **Dimension-generic parameters** (task 7.3). A parameter that takes
  any dimension, `hypot(a: *, b: *) = sqrt(a^2 + b^2)`, has its body's
  dimension taken at the call from the actual arguments' dimensions.
  The spelling is for 7.0 to settle, but it must not be a name, since an
  annotation is evaluated among the units, which may grow.
- **Domain bounds on a parameter** (task 7.4). The range of a function
  becomes the domain of its inverse, so it needs no syntax of its own.
- **Definitions typed into the converter.** `f(x) = …` in the have field
  could define a function for the session, unambiguously, since `=` is
  in no expression. An issue is to be opened for it. It is not part of
  this plan.
- **The result annotation as the default want of a bare call.** This
  is deferred from stage 7 (see "Deferred from stage 7").

Three further rulings, from the owner's review of the questions D23 first
left open:

- **An annotation checks a dimension and changes no value.** A quantity
  carries no unit of its own; its magnitude is held in the primitives
  (D22). So `weight: kg` means "a mass", exactly as `weight: lb` does.
  An argument in any conformable unit is accepted as it stands, with no
  conversion step: `bmi(100 lb, 4 ft)` is exactly `bmi(45.359237 kg,
1.2192 m)`. The result has a dimension, not a unit. The want chooses
  its unit, as for any value, and a blank want writes the primitives:
  `bmi(weight: lb, height: ft): lb/ft^2 = weight / height^2` shows
  `bmi(100 lb, 4 ft)` as `≈ 30.515173 kg / m^2`, and as `= 6.25 lb/ft^2`
  into `lb/ft^2`. That surprises a reader of the head, but it is the
  rule every blank want follows (`tempC(100) = 373.15 K`). An
  annotation's unit matters beyond its dimension in one place only: a
  recovered argument is written in it (`dozen(2 in)`).

  A body that needs a number in a particular unit divides that unit out,
  and the division, not the annotation, is what makes it right. A result
  that is an index on a defined scale is such a number, and is
  annotated `: 1` so that a division left out fails the build rather
  than quietly giving a dimension:

  ```
  bmi(weight: kg, height: m): 1 = (weight / kg) / (height / m)^2
  ```

  A physical result keeps its dimension: `kinetic(mass: kg, v: m/s) =
mass v^2 / 2`. Temperature is the one case where dividing out a unit
  is not enough. A formula fitted to Fahrenheit readings recovers the
  reading as `T / degF - 459.67`, or as `~tempF(T)` once an inverse can
  be called in an expression, since `T / degF` alone is measured from
  absolute zero.

- **A parameter shadows a unit of its name, except where the definition
  also uses that unit in its head.** Annotations are evaluated among the
  units alone, and the body resolves a parameter before any unit, by the
  exact name only (with a parameter `m`, `km` in the body is still the
  kilometre). So a name resolves the same way wherever it appears; the
  only ambiguity is a reader's. Shadowing as such is allowed and silent:
  `tcdf(t, nu)` hides the tonne, and forbidding it would take the short
  names the unit list grows into, and let a unit added to the system
  file break a user's function. Two cases are errors:
  - **A duplicate parameter name** is a parse error at its second
    occurrence.
  - **A parameter whose name also appears as a unit in the same
    definition's annotations** is an error, as in `kinetic(m: kg, v:
m/s) = m v^2 / 2`, where the head's `m` is the metre and the body's
    is the mass. The check needs only the definition's own text.

  The second error is meant to be relaxed to a warning once user
  definitions have an editor and the build has a way to report
  warnings. There is nowhere to show a warning today, and relaxing an
  error later breaks no file where tightening a silence would. An issue
  is to be opened to track it; "Deferred from stage 7" lists it.

- **An annotation is a unit expression, with no number but `1`.** It
  may hold unit names, juxtaposition, `*`, `/`, `^` with its literal
  exponent, parentheses, and `1`, which a plain result and `1 / s`
  need. Any other number (`: 2`, `: 1000 m`, `: kg / 2`) is rejected in
  either position, a parameter's or the result's, with a message that
  sends a scale to the body. Conformance ignores magnitude, so a number
  there would be either a lie, read as `1`, or a scale, which breaks the
  rule that an annotation changes no value. A unit name is accepted
  whatever its magnitude, `percent` included: `: percent` asserts a
  plain number and multiplies by nothing, as `: lb` converts nothing.
  Scaled results, and lists, in the result's annotation are use cases
  for the deferred default want, and the restriction is to be relaxed
  for them when that design takes them up, if it does.

**D24. A user function's value is its body's value as an expression,
and the machinery that certifies an expression certifies it (added
before stage 7).** A call is by value. The arguments are evaluated once,
to balls (the `call` case of evaluate.ts). The body is then evaluated
with the parameters bound to those balls (`evaluateBound`), and every
operation in it is an operation that already exists on balls, settled
at each node as anywhere else. Each pass of the retry loop evaluates
the whole expression again, bodies included, so a cancellation inside a
body is paid for by the next pass's digits, as one typed inline is: the
study's `(exp(x) - 1) / x` is correct at `x = 1e-30` and its author
wrote nothing about precision. An `unresolved` at any depth of a call is
retried. Cycles are rejected at build time, so evaluation terminates.
The build's check takes dimensions without evaluating anything. A user
can write no primitive, series or loop, only compositions of operations
that already carry honest radii, so nothing new is needed of the radius.

The caveats, each of which the stage's docs state:

- **A parameter used twice is two occurrences of one ball,** and they
  are treated as independent: this is the dependency problem of interval
  arithmetic. `x - x` and `sin(x)^2 + cos(x)^2` of an inexact argument
  never certify an exact `0` or `1`. They are shown as zero within a
  bound, or as one to the digits certified, exactly as the same text
  typed inline would be.
- **A hand-written equivalent of a built-in is slower, and can fail where
  the built-in does not.** A built-in is one kernel routine:
  - it computes at the bits its result needs plus a guard;
  - its radius comes from one derivative or truncation bound over the
    whole ball;
  - it recognizes its exact cases (`log(2, 8) = 3`, where `ln(8) / ln(2)
≈ 3`);
  - and it handles its own edges (H.1's `tanh` of a wide argument,
    H.15's classifier at the exponent bound).

  A composition pays at every operation instead. Each step rounds to
  the working precision and adds its rounding to the radius. The radii
  compound, and the dependency above widens them further. A cancellation
  inside the body costs digits that only a later pass buys back, as in
  `(exp(x) - exp(-x)) / 2` for `sinh` near zero. An intermediate value
  can pass a bound that the result does not, as in `(exp(x) - exp(-x)) /
(exp(x) + exp(-x))`, which is refused at `x = 3e18` where `tanh(3e18)`
  is `≈ 1`. The retry loop still makes a composition's digits right, but
  at more passes, up to the ceiling, past which the display shows what
  certified.

- **Decimal mode rounds each step of the body to Digits,** as it does an
  expression typed inline. `f(x)` there is the hand calculator's
  sequence of keystrokes, not a correctly rounded `f`.
- **A written inverse is trusted.** The build checks its dimensions, not
  that it inverts. One possible check at the want is that `f(~f(y))`
  overlaps `y`, refusing only when the two are disjoint, since overlap
  is what balls can decide and equality is not. 7.0 rules on it.
- **A domain bound on a ball is three-valued** (task 7.4). A ball that
  straddles the bound is `unresolved` and retried. An inexact argument
  exactly at a bound, such as `tempC(approx(-273.15))`, stays unresolved
  to the ceiling, as `floor` does at a cell's edge.
- **There is no inversion without a written inverse.** Certifying a root
  of a composition needs monotonicity, or an enclosure of the derivative
  over the bracket, and the evaluator has neither. That is the one place
  user functions would make the radius hard, and the optional inverse
  stays clear of it: a function without one is not a want.
- **Calls are not memoized.** A body that calls a function twice
  evaluates it twice, so nesting such calls `k` levels deep costs `2^k`
  evaluations of the innermost, at every pass of the retry loop. That
  is what the same expression written out in full costs, so it is not a
  new limit, but README ("Functions") and ARCHITECTURE.md ("Functions")
  say so in 7.5.

## Stage 1: the context and the ball

Firm. What lands: the seven rounding modes, named once; the context in
place of `Precision`; the radius and the ball; the magnitude a ball
everywhere, with radius zero except after `root`; the display's `=`
decided by the radius; the settings UI for digits and rounding mode.
Nothing new can be computed after this stage, and a user sees two
differences: the digits and the rounding mode are theirs to set, and
`sqrt(4 m^2)` is `= 2 m` where `sqrt(2) m^2 ...` is `≈`, as it was, but for
the right reason.

### 1.1 The rounding modes

New `src/core/rounding.ts`. `RoundingMode` is the union of the seven
names (`halfEven`, `halfAwayFromZero`, `halfTowardZero`, `towardZero`,
`awayFromZero`, `ceiling`, `floor`), `ROUNDING_MODES` lists them in that
order for the UI, and `divideRounded(num, den, mode)` is the integer
division of a signed `num` by a positive `den` rounded in `mode`. This is
the one place a rounding mode is interpreted; everything else rounds by
scaling to an integer division and calling it, as `roundWith` in
rational.ts does today with a fixed rule.

Tests: a table over `±7/2`, `±5/2`, `±1/3`, `±2/3`, `±1/2` and exact
quotients, one row per mode, every cell written out; `halfEven` on `5/2`
and `7/2` (2 and 4); `ceiling` and `floor` on negatives.

Behavior: none; the module is unused.

### 1.2 Rounding to digits in a mode

`src/core/rational.ts`: `roundTo(r, digits, mode)` replaces `round` and
`truncate` (`roundWith` takes the mode and calls `divideRounded`);
`format(r, digits, mode)` rounds in the mode too, keeping the carry
across a power of ten, which holds in every mode. `trunc` (to an integer)
stays. The two callers change with it: `roundTerms` in convert.ts takes a
mode, and `shownExactly` and `renderTerm` in unit-converter.ts pass
`halfAwayFromZero`, the rule they apply today.

Tests: the existing `round` and `truncate` tests become `roundTo` tests
with the mode written out; `format` under `ceiling` and `floor` (`2.54`
at two digits is `2.6` and `2.5`); the carry under `ceiling` (`9.99` at
two digits is `10`); `roundTerms` under a directed mode.

Behavior: none; every call site passes the mode it applied before.

### 1.3 The radius

New `src/core/radius.ts`, per D3. The type, `ZERO_RADIUS`, `UNBOUNDED`,
`isZeroRadius`, `isUnbounded`; `radiusAbove(r)`, the least representable
radius at or above `|r|`; `addRadius`, `multiplyRadius`, `maxRadius`, and
`powRadius(rad, n)` for a non-negative bigint `n` by squaring, all
rounding up and all absorbing unbounded; `radiusUpper(rad)`, the exact
rational a bounded radius stands for, which throws on unbounded (a caller
checks first). The type is written out: `Radius = { kind: "bounded";
mant: bigint; exp: bigint } | { kind: "unbounded" }`, with `mant` zero or
in `[2^29, 2^30)`; it is a type of its own, and D3 says why neither a
`Rational` nor a `number` serves.

Also new, first: `src/testing/random.ts`, the one seeded random source
for tests and benchmarks. The generator (mulberry32) moves out of
`bench/harness.ts`, which imports it from here, and gains `randomBigInt`,
`randomRational` and, from 1.5, `randomBall`, so that every numeric test
draws its seeded inputs the same way and no test carries a generator of
its own. `tsconfig.node.json` includes the directory.

Tests: `radiusAbove` is at or above its argument and within a relative
`2^-29` of it, over a seeded set of rationals from the shared source;
each operation's `radiusUpper` is at or above the exact result over the
same set; unbounded absorbs; zero is the identity of `add` and
annihilates `multiply`.

Behavior: none; the module is unused.

### 1.4 The context, threaded

New `src/core/context.ts`: `NumberContext = { precision: Precision;
rounding: RoundingMode }`, `DEFAULT_ROUNDING` (`halfAwayFromZero`, the
display's rule today), `DEFAULT_DIGITS` (8, `DISPLAY_PRECISION` today),
and `checkContext`. `Precision` stays in rational.ts. Then the parameter
widening the study calls the natural first step, with no change of
behavior: `evaluate`, `applyFunction`, `invertFunction`, `powQuantity`,
`buildTable`, `evaluateText` and `convertText` take a `NumberContext`
where they took a `Precision`, and pass its `precision` where they passed
the number. The pipeline derives its working context here already
(`max(40, precision + 10)`, with 40 the working precision of today, so
that nothing regresses before stage 2 replaces the rule); `system-table.ts`
and `bench/build.bench.ts` build at a working context of 40 digits. Every
test that passed `DEFAULT_PRECISION` passes a context of the same
precision.

Behavior: none, by construction; the tests do not change beyond the
parameter.

### 1.5 The ball

New `src/core/ball.ts`. `Ball = { mid: Rational; rad: Radius }`, the
radius being the type of 1.3 and not a number;
`BallError = RationalError | { kind: "unresolved" }` (D4), `exact(r)`,
`isExact`, `containsZero`, `magnitudeAbove(b)` (a radius at or above
`|mid| + rad`), and the exact operations on balls: `negateBall`,
`addBalls`, `subtractBalls` (radii add), `multiplyBalls` (the midpoint is
the exact product; the radius is `|a| rb + |b| ra + ra rb`, rounded up),
`divideBalls` (fails `divisionByZero` when the divisor is exactly zero and
`unresolved` when it contains zero; otherwise the midpoint is the exact
quotient and the radius `(|a| rb + |b| ra) / (|b| (|b| - rb))` rounded up,
which is the bound for `a / b` over the two intervals), and `powBall(b, n)`
for a bigint `n`: an exact ball goes through `pow`; otherwise the midpoint
is `pow(mid, |n|)`, which does the size check, the radius is
`n (|mid| + rad)^(n-1) rad` in the coarse arithmetic, and a negative `n`
inverts by the division rule. Midpoints are never rounded here: in exact
mode the exact operations stay exact, and only the radius says what has
been lost upstream (2.5 adds `settle`, per D15, a step the evaluator
applies after them; the operations here stay exact on the midpoints). The
midpoint is a `Rational` through stages 1 to 3;
4.4 makes it a `Scaled` (D13), and nothing above the ball sees the change.

Tests: on exact balls every operation agrees with rational.ts; containment
over seeded balls (the result's interval contains the exact result at the
interval's ends and midpoint); `divideBalls` by a ball around zero is
`unresolved` and by exact zero `divisionByZero`; `powBall` with a negative
exponent of a ball around zero is `unresolved`.

Behavior: none; the module is unused.

### 1.6 `root` split, and `rootBall`

`src/core/rational.ts`: `root` becomes two functions with the same tests
between them: `exactRoot(r, degree)`, the rational root if both numerator
and denominator are perfect powers (the negative and even-degree rules as
today), and `truncatedRoot(r, degree, precision)`, the digits (today's
scaling and integer root, unchanged). `src/core/ball.ts`: `rootBall(b,
degree, context)`, per D5: an exact argument with an exact root is exact;
an exact argument otherwise is `truncatedRoot` with a radius of one unit
in its last digit (`radiusAbove` of `10^(e - precision + 1)` for the
result's decimal exponent `e`); an inexact argument gives the truncated
root of the midpoint with an unbounded radius. `powRationalBall(b,
exponent, context)` composes `powBall` and `rootBall` as `powRational`
does, root last. `powRational` is rewritten over the two new functions
with the same behavior, so that `powQuantity` and its tests are untouched
until 1.7 moves them onto the ball and deletes it; `root` is deleted here.

Tests: the `root` tests split between `exactRoot` and `truncatedRoot`;
`rootBall` on `9/4` is exact, on `2` has radius one ulp and contains the
reference `sqrt 2`, on an inexact ball is unbounded; `powRationalBall` on
`(4)^(1/2)` is exact.

Behavior: none; nothing calls `rootBall` yet.

### 1.7 The magnitude becomes a ball

`Quantity.magnitude` is a `Ball`. Mechanical, and confined to what the
type change forces:

- `src/core/quantity.ts`: `scalar` takes a `Rational` and makes an exact
  ball; the arithmetic calls the ball operations; `powQuantity` calls
  `powRationalBall`; the error type is `BallError`.
- `src/core/evaluate.ts`: `EvaluateError` gains an `unresolved` kind with
  a span, located at the divisor as `divisionByZero` is, or at the power;
  `locate` maps it.
- `src/core/table.ts`: a prefix's factor is a `Ball`; `unitLookup` scales
  by it with `multiplyQuantities`.
- `src/core/build.ts`: `zeroDeclaredUnit` fires when the declared unit's
  ball contains zero (an exact zero, or an inexact ball around it, of
  which nothing is a count either).
- `src/core/convert.ts` and `src/core/pipeline.ts`: every site that reads a
  magnitude as a rational reads `.mid`, and nothing else changes; the
  radius is dropped at the converter until 1.8, which is stated in a
  comment at each site.
- `src/messages.ts`: the wording for `unresolved` ("cannot be told from
  zero at this precision"), in `describeTextError` and `describeBody`.
- Tests: `deepEqual` on quantities compares balls; helpers that built a
  magnitude build an exact ball.

Behavior: none visible. The one new outcome, `unresolved`, needs an
inexact divisor around zero (`1 / (sqrt(2)^2 - 2)`), which today shows a
huge number and now reports the error; that is a fix, and a test.

### 1.8 The converter and the pipeline on balls

`convert` returns a `Ball`, the quotient of the two balls; a `want` whose
ball contains zero without being exactly zero is a new `ConvertError`,
`unresolvedWant`, apart from `zeroWant` as the ball's `unresolved` is from
its division by zero, so that the retry loop of 2.5 can retry the one and
never the other, and messages.ts words it. `convertToList` returns balls
per D8, with the ordering check on midpoints and the positivity check over
the whole ball: a unit that cannot be told from zero is not positive
(`nonpositiveUnit`), since it is no size to divide by, which is what keeps
the remainder's division from ever being `unresolved`. `roundTerms` rounds
the remainder's midpoint and widens its radius by the rounding's shift, so
that the rounded terms still contain `have` (amended at 3.4, whose angle
units showed that a kept radius let a remainder left after a carry claim
digits that were the rounding's).
`Conversion.value` and the list's `terms` are balls, and the function
conversion's count is the ball quotient of the argument by the declared
unit (its ball excludes zero, as the build checked). The UI's reciprocal
is `divideBalls(exact(1), value)`, still in the component, and still left
out when it fails.

Tests: `convert` of an inexact `have` carries its radius; a `want` around
zero is `unresolvedWant`; a list of an inexact `have` has the radius on its
remainder alone, and a unit around zero is `nonpositiveUnit`; `roundTerms`
keeps the radius; the pipeline tests read `.mid` where they read the value.

Behavior: none visible; the radius now reaches the UI and is ignored
there until 1.9.

### 1.9 The display rule

New `src/core/display.ts`: `show(ball, digits, mode)` returns `{ text,
exact }`: `text` is `format(mid, digits, mode)` and `exact` is true when
the radius is zero and `roundTo(mid, digits, mode)` equals `mid`, which is
the study's rule for `=` (radius zero, and every digit held is shown).
`unit-converter.ts` calls it for every term and `shownExactly` goes; the
list's relation is `=` when every term is `exact`. The digits and the
mode come from the component's context property, which 1.11 wires; until
then it passes `DEFAULT_DIGITS` and `DEFAULT_ROUNDING`.

Tests: `show` on an exact `127/50` at eight digits is exact, on `1/3` is
not, on `sqrt 2` (a ball of one ulp) is not however many digits, on
`2 ± 0` from `sqrt(4)` is exact. These are the decimal display's answers:
stage 5's fractions setting changes what `show` returns for an exact
value (`1/3` becomes `= 1/3`), and 5.1 restates them under that setting.

Behavior: one visible change, a value that passes through a root and comes
out looking rational is `≈`: `sqrt(2) / sqrt(2)`, whose midpoint is exactly
`1` because the same truncated value is divided by itself, shows `≈ 1`
rather than `= 1`, which is the fix the study describes (and the case the
symbolic values of docs/future.md would make `= 1`). `sqrt(2)^2` was
already `≈ 2`, its midpoint being a hair below `2`; the plan's first
version named it as the change by mistake.

### 1.10 Settings and the UI

New `src/settings.ts` (app, not core): `Settings = { digits; rounding }`,
`DEFAULT_SETTINGS`, `loadSettings` and `saveSettings` over `localStorage`
with validation (an integer `digits` in `[1, MAX_DIGITS]`, 200 until 2.6,
and a name in `ROUNDING_MODES`; anything else is the default), and
`contextOf(settings)`.
`app-shell.ts` owns the settings, renders a `<details>` with a number
input for the digits and a `<select>` for the mode, saves on change, and
passes the context to `<unit-converter>` as a property. The component
uses it in `evaluateText`, `convertText`, `roundTerms` and `show`.
`DISPLAY_PRECISION` goes; `MAX_DIGITS` lives in context.ts (its value is
D12's, set here at 200 and cited there).

Tests: `settings.ts` under Node with a fake storage object (parse, clamp,
round trip). The component is not tested, as today.

Behavior: the digits and the rounding mode are the user's.

### 1.11 Stage 1 docs

ARCHITECTURE.md: "Precision and rounding" rewritten around the ball and
the context, "UI" for the settings and the `=` rule, "Layout" for the new
modules; README.md gains a short "Settings" section; module headers that
mention truncation or `DEFAULT_PRECISION` are corrected; docs/calculator.md
gets a status line naming this plan.

## Stage 2: the kernel, `root`, settling, `pi`, the retry loop

Firm. Reviewed against the code before implementation, and revised: the
kernel hands back its dyadic midpoint unrounded and the mode is the
display's alone (D9); inexact midpoints are settled to the working
precision (D15), moved here from 4.5; the roots are Newton in fixed point
at any degree rather than the integer root on a scaled integer (2.2); the
cap on the digits setting and the range limit are settings with a derived
ceiling and a probe that recommends them (D12, D16), which adds 2.7 and
moves `pi` and the docs to 2.8 and 2.9. What lands: the fixed-point
kernel on which every inexact function will run; `root` on it,
propagating its argument's radius; certification and the display's rule
for fewer digits than asked; settling, the retry loop and the two limits
in the pipeline and the settings; `pi` computed on demand. After this
stage `sqrt(2)^2 - 2` is `≈ 0` with a bound and `sqrt(2)` at 50 digits is
50 correct digits.

### 2.1 The kernel's values and exact operations

New `src/core/fixed.ts`, per D9: `Fixed = { value: bigint; error: bigint;
bits: number }`, fixed point, so `bits` is the position of the binary
point, the integer part is `value >> bits` and the fraction is the low
`bits` bits, with no field for either, and `bits`, a non-negative
integer, belongs to the value; `GUARD_BITS` (32) and `bitsFor(precision)`,
`ceil(precision × log2 10)` plus the guard; `fixedFromRational(r, bits)`
(rounded to nearest; error 1, or 0 when the scaling is exact);
`fixedFromBall(b, bits)` (the midpoint so, plus the radius in ulps
rounded up; unbounded is a precondition failure, since the caller returns
unbounded without computing); `fixedToBall(f)` (the midpoint the dyadic
`value × 2^-bits` itself, the radius `radiusAbove` of `error × 2^-bits`;
no context, since nothing here rounds in a mode); `addFixed` and
`subtractFixed` (the operand with fewer bits rebased to the other's,
exactly, then the values combined and the errors added); `multiplyFixed`
(the value is the product shifted down by `bits`; the error is `|a| eb +
|b| ea + ea eb` shifted down and rounded up, plus one for the shift);
`divideFixed` (a precondition that the divisor's interval excludes zero;
the quotient rounded down with one ulp for the rounding, and the
propagated error bounded over the two intervals); `shiftFixed(f, k)`, the
exact rebase that multiplies by `2^k` by moving the binary point;
`absFixed`; `compareFixed`, which returns -1 or 1 when the intervals are
disjoint, 0 when both are exact and equal, and `undefined` otherwise.
Every routine's doc comment states its error rule, and a violated
precondition throws `RangeError`, as `rational` does.

Tests: containment over seeded rationals and balls from the shared random
source for every operation, checking `|exact - value × 2^-bits| <= error
× 2^-bits` with rational arithmetic at both ends of the operands'
intervals; `fixedToBall` contains the exact value; the rebase is exact;
the preconditions throw.

Behavior: none; unused.

### 2.2 The kernel's roots

`sqrtFixed(f)`: the integer square root of the value scaled to twice the
bits, by Newton, the `integerRoot` of rational.ts, which stays there for
`exactRoot` and is exported; the root is monotone, so the result's
interval is exact, its ends the integer roots of the argument's ends,
floor below and floor plus one above, and no derivative bound is needed.
`rootFixed(f, degree)` for any degree (two goes to `sqrtFixed`): Newton in
fixed point at
the argument's `bits`, `x ← ((n - 1) x + a / x^(n-1)) / n` with the power
by squaring in fixed point, from a first guess taken through a double, so
that the cost is logarithmic in the degree and no integer of `degree ×
bits` bits is ever formed (the integer root on a scaled integer, which
the first version of this task planned, admits only degree 4 at the
default ceiling under the default range limit). The result's error is not
read off the iteration but verified: the power `y^n` is recomputed with
the error rule, its distance from the argument bounded, and the root's
error follows by `|y - a^(1/n)| <= (4 |ε| / n) y` for `y^n = a (1 + ε)`
with `|ε| <= 1/2`, one line of integer arithmetic stated in the comment;
the distance is taken over the whole of the argument's interval, so the
argument's own error enters the same bound and no derivative bound is
needed. The lower end must be positive (a precondition; the caller
decides what a ball around zero means). Both choose the result's `bits`
so that a root of magnitude `2^k` keeps the argument's significant bits
(D9), and a small argument keeps its digits only if it was converted at
bits enough to hold them, which is the caller's reduction (2.3).

Tests: containment over seeded arguments across magnitudes and degrees,
including degrees in the thousands, checked on the integers by
monotonicity; the error a few ulps for an exact argument; the result's
bits at large and small arguments; reference digits of `sqrt 2` and
`cbrt 2` at 100 digits through `fixedToBall`, and `10^(1/7)` and
`2^(1/1000000)` at fewer, all from Python's decimal module as the
independent source; the preconditions throw.

Behavior: none; unused.

### 2.3 `rootBall` on the kernel

`rootBall` in ball.ts: the exact cases as before; a ball, exact or
inexact, whose interval excludes zero is scaled by an exact power of
`2^degree` so that it is of order one (the reduction belongs here, on the
ball, since a tiny ball converted at `bitsFor(precision)` would lose its
digits), goes through `fixedFromBall`, `rootFixed` and `fixedToBall`, and
is scaled back, so the radius covers the argument's; a negative ball of
odd degree is the negated root of its magnitude; a ball containing zero
is exact zero if exact, and otherwise `unresolved` for an even degree
(the sign is undecided) and, for an odd degree, a ball around zero whose
radius is the root of the larger of the interval's ends, computed the
same way. Three rulings the task did not reach: an argument of unbounded
radius gives the root of its midpoint with an unbounded radius, as the
other operations propagate unbounded, and its midpoint's sign decides
`negativeRadicand`; a ball whose interval is positive as rationals but
reaches within an ulp of zero at the kernel's bits is treated as
containing zero, since the kernel cannot tell it apart; and
`powRationalBall`'s refusal of a negative base under an even root applies
only to a ball that is negative throughout, a ball straddling zero going
on to the root, which reports it `unresolved`. The scalings are exact:
`scaleByPowerOfTwo` in rational.ts cancels the power against the trailing
zero bits rather than running a gcd, and `shiftRadius` in radius.ts moves
the exponent. D5's unbounded radius goes; `truncatedRoot` goes, and
`powRational`, which nothing but its tests has called since 1.7, with it;
the `tooLarge` a root of absurd degree returned is no longer needed.
`unresolved` from a power (this root, or the negative power of 1.7) is
located at the power's base in evaluate.ts, since the base is what cannot
be told from zero, as the divisor is for a quotient; messages.ts words it
for both: "`X` cannot be told from zero at this precision, and the result
depends on which side of zero it lies", and for a body, "depends on a
value that cannot be told from zero at this precision".

Tests: the stage 1 tests, with the unbounded case replaced by containment
over inexact arguments from the shared source; a tiny and a huge exact
argument keep their digits; `sqrt` of a ball straddling zero is
`unresolved`, `cbrt` of one contains zero and its ends; `2^(1/20)` at
1,000 digits and `2^(1/10^9)`; an unbounded argument; the location and
the wording of `unresolved` from a root. The tests in build.test.ts,
pipeline.test.ts, quantity.test.ts and evaluate.test.ts that computed an
expected midpoint through `truncatedRoot`, or pinned its digits, compare
against reference digits and the kernel's radius instead; the pipeline's
test of the stage 1 working rule reads the working precision off the
radius.

Behavior: none visible. An inexact argument's root now has a bounded
radius, which the display of 2.4 and 2.6 will show as certified digits
rather than as uncertified ones; the digits shown at this task are the
same.

### 2.4 Certification and the display rule

`src/core/ball.ts`: `certifies(b, digits, mode)`, per D7, forming the two
ends as exact rationals (an unbounded ball certifies nothing; an exact one
certifies every count), and `certifiedDigits(b, maxDigits, mode)`, the
largest `d <= maxDigits` that certifies, found by scanning down since
certification is not monotone in `d`, or 0. `src/core/display.ts`: `show`
returns a `Shown` with a `kind`: `exact` (as in 1.9); `certified` (all
`digits` certified, `text` rounded to them; this includes an exact value
with more digits than shown, `1/3` at eight, which is `≈` with no note as
today); `partial` (fewer, `certified: d`, `text` rounded to `d`; with `d`
zero, which only a value on a rounding tie at the digits asked produces at
the ceiling, `text` is the midpoint at `digits`); `zero` (the ball
contains zero without being exactly zero, which certifies no digit;
`text` is `0` and `bound` is `|mid| + rad` rounded up to one significant
digit, so the UI can say `≈ 0, within 2e-30`); `unbounded` (an unbounded
radius, `text` the midpoint at `digits`, certifying none, as the study
says the per-operation stage displays). The tests are applied in that
order: unbounded, exact, zero, then the digit count. The `exact` boolean
of 1.9 goes; the component reads the kind.

Tests: each kind from a constructed ball; `certifies` at a tie under each
mode; the carry (`0.99999 ± 0.00002` at three digits certifies under
`halfAwayFromZero`, and so does `9.9999 ± 0.0002` at two, both ends
rounding to `10`, where the first version of this task had it failing;
at five digits it does not); the
non-monotone case (`1.25 ± 0.004` certifies three digits and not two).

Behavior: the display is still called with a single pass, so `partial`
now appears where 1.9 showed digits it could not certify, and the
component says `≈` for it as before, since it does not yet read the kind.
2.5 removes that within the schedule and 2.6 shows the kinds.

### 2.5 Settling, the range limit and the retry loop

Per D15, D16 and D12, in that order within the task. `src/core/ball.ts`
gains `settle(b, context)`: an inexact midpoint rounded to nearest at
`bitsFor(context.precision)` significant bits, a dyadic built in lowest
terms without a gcd, its rounding added to the radius; an exact ball
returned as it is. `powBall(b, n, context)` on an inexact base
exponentiates by squaring with settling, and inverts by the division rule
for a negative `n`; on an exact base it is `pow` as before.
`src/core/quantity.ts` gains `settleQuantity`; `src/core/evaluate.ts`
settles every result it produces, in one place, and `unitLookup(table,
context)` settles a unit once when it is looked up. `NumberContext` gains
`maxBits`, the range limit: `MAX_BITS` in rational.ts becomes
`LIMIT_BITS` (2^20), the hard bound the parser applies through
`parseDecimal`; context.ts holds `DEFAULT_MAX_BITS` (2^16), and
`checkContext` accepts an integer in `[1, LIMIT_BITS]`; `pow` takes the
limit as a parameter, and the evaluator's `number` case checks a literal
against the setting, `tooLarge` at the literal's span. The comments of
both constants say what each bounds.

Then the schedule: `schedule(context, ceiling)` yields the working
contexts `p + 10`, `2 (p + 10)`, ..., doubling, and last `ceiling`, with
the user's mode and range limit throughout;
`ceilingFor(maxDigits)` is `4 (maxDigits + GUARD_DIGITS)` in context.ts
beside `DEFAULT_MAX_DIGITS` (1,000) and `maxDigitsFor(maxBits)`, the hard
bound on the cap (`bitsFor` of the ceiling at most half the range limit);
`resolve(context, ceiling, run, done, retries)` calls `run` with each
working context in turn and returns the first result that `done` accepts;
a result `done` rejects is kept as the best so far; an error that
`retries` accepts (`unresolved` and `unresolvedWant`, at any depth of
`callFailed` or `inverseFailed`) continues; any other error ends the loop
with the best result so far if there is one, since the only such error a
later pass can raise that an earlier one did not is a `tooLarge` that
marks a pass as unaffordable, and otherwise with the error; at the
ceiling the best result so far, or the last error, is returned.
`evaluateText` and `convertText` take the ceiling beside the user's
context and go through `resolve`, parsing once outside the passes, with
`done` checking that every value in the result (the unit value, each list
term unrounded, the function count) is exact, certified at
`context.precision`, or unbounded; a context whose precision exceeds the
cap the ceiling was derived from is a precondition failure. The stage 1
working rule (`max(40, p + 10)`) goes, and `DEFAULT_PRECISION`'s comment
says it is the table's build precision until 3.3. Two gaps are accepted
and stated here: a list unit whose ball straddles zero is
`nonpositiveUnit` and not retried, and the reciprocal line the component
computes is shown with whatever kind `1 / value` has, not retried on its
own. Rulings the task did not reach: `settle` rounds to nearest with ties
to even, leaves a zero midpoint as it is, and adds half an ulp, the
rounding's bound, rather than the exact difference, which would cost a
gcd; `powBall`'s magnitude guard is `|log2|` of the base's magnitude
bound and of its midpoint, whichever is larger, plus one, times the
exponent, against the range limit, so that a base near one is guarded by
its true magnitude and not by its degree; a `want` that fails to parse is
still reported after the `have`, which is evaluated once at the first
pass for that, so that the pipeline's rule that `have` is tried first
holds; and `MAX_DIGITS` (200) stays the settings' cap until 2.6 replaces
it.

Tests: `settle` is the identity on an exact ball, rounds an inexact one
to the bits and grows the radius by the difference, over the shared
source; `sqrt(2)^1000` settles at every squaring and `sqrt(2)^(10^7)` is
`tooLarge` by magnitude; a literal beyond the setting is `tooLarge` at
its span and one beyond the hard bound fails at parse; `sqrt(2)` at 8 and
at 50 digits certifies on the first pass; `sqrt(2)^2 - 2` ends at the
ceiling as `zero` with a bound; `1 / (sqrt(2)^2 - 2)` is `unresolved`;
`(sqrt(2) + 1e-15) - sqrt(2)` at 8 digits still certifies on the first
pass, which carries the kernel's 32 guard bits beyond its 18 digits, and
`(sqrt(2) + 1e-20) - sqrt(2)` needs a second, `(sqrt(2) + 1e-60) -
sqrt(2)` a third and `(sqrt(2) + 1e-100) - sqrt(2)` a fourth (the test
counts passes through a `run` that records its contexts); at 8 digits the
default schedule ends at 4,040 digits after nine passes; a later pass that fails `tooLarge` returns the
earlier result; an error in the text returns at once; `ceilingFor` and
`maxDigitsFor` at the defaults and the relation between them.

Behavior: certified digits, or fewer with a note; `1e30000` is `tooLarge`
as before, and remains so until the range limit is raised.

### 2.6 The UI for the display kinds and the two limits

`unit-converter.ts` renders `partial` with a note ("8 of 12 digits are
certain"), `zero` as `≈ 0` with its bound ("within 2e-30"), and
`unbounded` with a note that the digits are not certified; a list is
certified on its unrounded terms, its remainder rounded by `roundTerms`
at the digits certified, and its counts are exact and carry no note; the
reciprocal line shows its own kind. `settings.ts` gains `maxDigits`
(default `DEFAULT_MAX_DIGITS`, at most `maxDigitsFor(maxBits)`) and
`maxBits` (default `DEFAULT_MAX_BITS`, in `[1, LIMIT_BITS]`), validated
with the dependent clamps of D16, `contextOf` carrying `maxBits` and a new
`ceilingOf(settings)`; `app-shell.ts` renders the two as number inputs
beside the digits, whose `max` follows `maxDigits`, and passes the
ceiling to the converter with the context, which the converter passes to
the pipeline. `MAX_DIGITS` goes. Rulings the task did not reach: the
inputs are labelled "Digits", "Most digits" and "Most bits", each with
`min` and `max` from the settings above it, and `MIN_MAX_BITS` in
context.ts, twice the kernel's bits at a cap of one digit, is the floor
of the range limit, below which no digit fits; the panel applies a change
through `clampSettings`, so lowering a limit lowers what depends on it;
a list's counts are formatted at the digits asked for and its remainder
at the digits certified, as `0` when it cannot be told from zero; the
note is written in parentheses after the line; and (amended at 3.4) when
the rounding carried into an earlier unit, the remainder left is a new
value, what remains after the carried units, so its kind is judged on the
rounded remainder rather than the unrounded one, and a last term that
cannot be told from zero is left out as a term of zero is, with its note,
unless it is the only term. README's "Settings" describes the four
settings and the notes.

Behavior: the notes, and the two limits are the user's.

### 2.7 The recommended limits

New `src/limits.ts` (app code, beside settings.ts): `recommendLimits(
budget, now)` times, through a clock passed in so that it is tested under
Node, the app's costliest operations at increasing sizes, an exact
multiplication and reduction of two rationals of `n` bits for the range
limit and a `rootBall` at a working precision for the cap, doubling until
one exceeds `budget` milliseconds, and returns the largest values under
it, clamped to the hard bounds and to the dependency between the two, and
rounded down to round numbers. The budget is a constant of the module,
with the argument for it in the header; the operations it times are named
in one place, so that a later stage with a costlier built-in changes the
list and nothing else. It measures time and not memory, for the reasons
D16 gives. `app-shell.ts` gains a button in the settings panel that runs
it and applies the result to both limits, disabled while it runs. Rulings
the task did not reach: the clock and the two operations travel together
as a `Probe`, which the test fakes and the shell takes as the real one;
the range candidates are powers of two from 2^9 and the cap candidates 1,
2 and 5 times a power of ten, so the recommendation is a round number by
construction; each size is timed as the shortest of three runs after one
untimed; the budget is 50 ms per pass, since the schedule's doubling makes
an expression that runs to the ceiling cost about twice its last pass;
the precision operation is a cube root, the kernel's Newton iteration, at
the candidate cap's ceiling; the real probe's inputs come from a small
congruential generator in the module, since the tests' random source is
not part of the app; and the button yields a frame before the probe runs
so that its disabled state is painted.

Tests: with a fake clock that charges a set cost per bit, the
recommendation is the largest size under the budget, is clamped, and
respects the dependency between the two.

Behavior: the button.

### 2.8 `pi`

New `src/core/constants.ts`: `chudnovsky(bits)`, the series with binary
splitting, exported so that the benchmark times it uncached, with the
error bound of the truncated series stated in the comment (each term is
below the one before it by a factor above `1.5 × 10^14`, and the tail of
an alternating series of decreasing terms is below its first omitted
term); `piFixed(bits, ceilingBits)`, memoized per D10 at the ceiling in
force; `piBall(context, ceiling)` through `fixedToBall`; and
`piMemoBits()`, which reports the memo's precision for the tests.
`bench/kernel.bench.ts` reports the timing at 1,000, 10,000 and 100,000
digits and asserts that 100,000 digits cost at most fifty times 10,000,
and reports the roots at the default ceiling. Rulings the task did not
reach: the term count is `ceil((bits + 40) / 46)`, since the terms shrink
by a factor above `2^47` in their factorial part and by at most two less
in their linear part; the error is stated as three ulps, one each for the
tail, the square root and the final truncation; the square root of 10005
is Newton on the reciprocal square root with multiplications only,
verified by squaring, because V8 divides big integers quadratically and
the integer square root of fixed.ts cost more than the series itself at a
hundred thousand digits (869 ms against the series' 80); the memo hands
out fewer bits through `truncateFixed`, exported from fixed.ts for it;
and the benchmark asserts the upper decade at fifty rather than the lower
at thirty, since at a thousand digits the series takes a tenth of a
millisecond, within the timer's noise, and binary splitting grows as V8's
Karatsuba multiplication does, about 38 times per decade, not linearly.

Tests: reference digits to 100; the 36-digit literal in units.txt, read
from the file, as a second reference; the memo holds the ceiling's value
after requests at three lower precisions, a request above the ceiling
adds nothing to it, and a higher ceiling replaces it.

Behavior: none; unused until stage 3.

### 2.9 Stage 2 docs

ARCHITECTURE.md "Precision and rounding" gains the kernel, settling,
certification, the schedule and the two limits; "Layout" the new modules;
the benchmark section the kernel benchmark; README "Settings" explains
the note about fewer digits, the two limits and the recommendation;
docs/calculator.md's status line names stage 2 as landed, and its "one
mode governs every rounding" gains the qualification of D15.

## Stage 3: built-in functions

Firm in shape; the list of functions is the study's. Reviewed against
the stage 2 code before implementation, and revised: the ceiling is a
field of the context, which is how it reaches `pi()` (D1, D12, 3.3); the
memos hold the ceiling plus a margin, and there are four (D10);
`unresolved` carries the edge the value straddles, since stage 3's edges
are not all zero (D4); `log` takes exactly two arguments and the decibel
is `decibel`, since `dB` reads as a prefixed unit (3.1, 3.12); a power
with a rational exponent falls back to `exp(y ln x)` where the exact
power would not fit the range limit, which is a behavior change for `^`
(3.8); the build's lookup resolves built-ins and the tests build the
system table at the ceiling as the app does (3.2, 3.3); the kernel
benchmark reports every routine at the ceiling and the probe times a
composite of the costliest (3.6, 3.11); and each task says what its
errors are worded as. Two rules hold for every built-in and are stated
here once: a built-in returns the kernel's ball as `fixedToBall` hands it
back, or an exact ball for an exact case, and rounds in no mode, since
the evaluator settles every result it produces (D15); and an argument of
unbounded radius gives the function of its midpoint with an unbounded
radius, as `rootBall` rules. What lands: calls with any number of
arguments; a built-in kind of function beside defined ones, with
dimension rules and domain errors; the table built at the ceiling; the
build's function check over dimensions; `pi()` and the elementary set;
the definitions file's `pi` replaced and the neper, the bel and the
decibel defined.

### 3.0 Design note

docs/builtins.md, short: the names (Euler's number is `exp(1)`, Lambert's
function is `lambertw`, `log` is the two-argument logarithm and `ln`,
`log10` and `log2` the one-argument ones, the decibel is `decibel`
because `dB` reads as `d` + `B`, and no built-in collides with a unit or
reads as a prefix followed by one in units.txt), each function's
dimension rule, domain, exact cases and propagation, the two rules the
stage's introduction states (the evaluator settles, unbounded propagates),
the edges an `unresolved` can name, and D11 restated with the
alternative. Written from this plan; the rest of the stage implements it,
and 3.13 adds the implementation notes.

Behavior: none; a document.

### 3.1 Calls with any number of arguments

`src/core/expr.ts`: the `call` rule reads `name "(" (expr ("," expr)*)?
")"` and the node holds `arguments: readonly Expr[]`; the comma is a new
symbol and appears nowhere else. `src/core/evaluate.ts`: `Arity = { min;
max }` is defined here (builtins.ts imports it in 3.2), and a call of a
defined function with other than one argument fails with a new
`arityMismatch { name, span, expected: Arity, given }`, checked once the
name has resolved and before any argument is evaluated, since it is about
the call's shape as `notAFunction` is, so `tempC(bogus, 1)` is the arity
error and not the unknown unit. `src/messages.ts` words it: `"tempC"
takes 1 argument, but "tempC(1, 2)" gives 2`, and `takes no arguments`,
`takes 2 arguments`, `takes 1 to 3 arguments` for the ranges. The
`argumentMismatch` error keeps its one argument's span. `docs/functions.md`
and README note the grammar. The decision on arity: the grammar accepts
any number of arguments, and what a function accepts is its own. A
built-in declares a range `{ min, max }` (every elementary function is
one fixed count, `round` in stage 6 is 1 to 3), a defined function takes
exactly its parameters (one until stage 7), and no function is variadic
in this stage: `max`, `min` or `gcd` over a list would need only an
unbounded `max` in the range and no change to the grammar, and none is
planned. `log` takes exactly two arguments, `log(b, x)` with the base
first so that it reads as `log_b(x)`, so that `log(x)` never has to
choose between the natural logarithm and the common one; `ln`, `log10`
and `log2` are the one-argument forms.

Tests: `f()`, `f(1)`, `f(1, 2 m)`, `f(1,)` is an error at the `)`, the
spans; `tempC(1, 2)` and `tempC()` are arity mismatches, and the message.

Behavior: `tempC(1, 2)` and `tempC()` are arity errors rather than parse
errors.

### 3.2 The built-in kind

New `src/core/builtins.ts`: `Builtin = { name; arity: Arity;
dimensions(args: Dimension[], primitives): Result<Dimension,
DimensionRuleError>; apply(args: Ball[], context): Result<Ball,
BuiltinError> }`, `BUILTINS` as a map by name (empty in this task), and
the two error types. `DimensionRuleError` is `{ kind:
"argumentDimension"; argument; want: Dimension; mismatch:
ConformanceError }` (the argument at that index must have the dimension
`want`, a plain number or the radian kind, and does not, as the
conformance check says), `{ kind: "nonconformingArguments"; left; right;
mismatch }` (two arguments must conform to each other, `atan2`'s) or `{
kind: "noAngles" }` (the rule wants the radian kind and the table
declares no `radian` primitive, D11's last sentence). `BuiltinError` is
`{ kind: "domain"; argument; reason }` with `reason` one of
`notPositive`, `baseOne`, `outsideClosedUnitInterval`, `belowOne`,
`outsideOpenUnitInterval` and `origin`, `{ kind: "unresolved"; argument;
edge }` with the edge of D4, and the ball's `divisionByZero`,
`negativeRadicand` and `tooLarge`. `apply` returns the kernel's ball as
it is, or an exact ball for an exact case; the evaluator settles it
(D15, stated in the stage's introduction). `src/core/table.ts`:
`ResolvedFunction = { kind: "defined"; fn } | { kind: "builtin"; fn }`;
`Lookup.function` returns it; `unitLookup` resolves defined functions
first and built-ins second (the build keeps them disjoint), and so does
the build's own lookup in build.ts, so that a body may call a built-in
(3.4's `pi()`); a built-in's name used as a unit, or typed as a `want`,
is `functionAsUnit`, which gains the function's `arity` so that the
message writes `pi()` for arity zero and `exp(value)` otherwise; no
built-in has an inverse. `src/core/evaluate.ts`: `EvaluateError.unresolved`
gains `edge: Rational | "pole"`, zero at the divisor and the base; the
`call` case switches on the kind; the built-in branch checks the arity,
evaluates every argument, applies the dimension rule (its failure is a
new `builtinArgument` error at the call, carrying the rule's error and
the spans of all the arguments, so that a message can write `sin(1
radian)` or `(2 m)^2` from the text), applies the function, and locates
`domain` as a new `domainError` at the call with the argument's index,
`unresolved` at the argument at fault with its edge, and the other ball
errors at the call. `src/core/build.ts`: a definition named like a
built-in is a `duplicate` (the error's `first` becomes a union of a
definition or a built-in name), and the prefixed-name check runs over the
built-in names too, the error carrying the built-in's name in place of a
definition. Messages for the new errors, from the data alone: `Cannot
apply "exp" to "1 m": "1 m" has dimension m, but the argument of "exp"
must be a plain number`; `Cannot apply "sin" to "1": "1" is a plain
number, but "sin" takes an angle; write "sin(1 radian)"` (a kind
mismatch against the radian kind), and `"1 m" has dimension m, but "sin"
takes an angle` (a dimension mismatch); `Cannot apply "pow" to "2 m":
the base must be a plain number; for a power of a quantity, write "(2
m)^2"`; `Cannot apply "atan2" to "3 m" and "4 s": "3 m" has dimension m,
but "4 s" has dimension s`; `"sin" takes an angle, and these units
declare none`; the domain reasons, located at the call and quoting the
argument: `Cannot compute "ln(-1)": "-1" is not positive, and a
logarithm is defined only for positive values`, `Cannot compute "log(8,
1)": the base "1" is one, and no logarithm has base one`, `Cannot compute
"asin(2)": "2" lies outside [-1, 1], where "asin" is defined`, `Cannot
compute "acosh(0.5)": "0.5" is less than 1, and "acosh" is defined only
from 1 up`, `Cannot compute "atanh(1)": "1" is not strictly between -1
and 1, where "atanh" is defined`, `Cannot compute "atan2(0, 0)": both
arguments are zero, and the origin has no direction`, `Cannot compute
"pow(-2, sqrt(2))": "-2" is not positive, and a power with an inexact
exponent is defined only for a positive base`; and `unresolved` as one
pattern, `"X" cannot be told from E at this precision, and the result
depends on which side of E it lies`, with E `zero`, `1`, `-1` or `a pole
of "tan"`, and for a body `depends on a value that cannot be told from E
at this precision`. Each is a predicate for `describeBody` too.

Rulings the task did not reach: the table carries the set of built-ins
it was built against (`UnitTable.builtins`), and `buildTable` takes the
set as a parameter with the module's `BUILTINS` as its default, so that
the build's disjointness check and the table's lookup work from one set
and a test can build against a built-in of its own; `resolveFunction` and
`functionArity` in table.ts are the one order and the one arity rule the
two lookups share; the pole is worded `a pole of the tangent`, since
`tan` is the one function with poles in this stage; and the body form of
a dimension rule's failure can be reached only from an error built by
hand, since a body whose rule fails does so for every argument and the
build refuses it.

Tests: with test-only built-ins injected through a lookup and through the
build's parameter (the map is empty), every branch: the arity check
before the arguments, each dimension-rule error with every argument's
span, a domain error, an unresolved at an argument with an edge and at a
pole, the ball errors at the call, a settled result and an unbounded one;
the build rejects a unit, a primitive, a list and a function named like a
built-in and a built-in whose name reads as a prefixed unit, and builds a
body that calls one; the messages, through stand-ins that carry the real
names.

Behavior: none visible; no built-in exists.

### 3.3 The ceiling in the context, and the table at the ceiling

Per D1, D6 and D12. `NumberContext` gains `ceiling`, the top of the
retry schedule; `checkContext` requires a positive integer at or above
the precision, and `schedule` keeps its own precondition that four times
the first pass fits under it. `schedule`, `resolve`, `evaluateText`,
`convertText` and `piBall` lose their `ceiling` parameter and read the
context's; `context.ts` exports `ceilingContext(context)`, the context at
the ceiling, which is the last context of `schedule(context)` for every
precision; `settings.ts`'s `contextOf` carries the ceiling and
`ceilingOf` goes; the component loses its `ceiling` property. Every
test's context literal gains the field, the default cap's ceiling unless
the test is about the ceiling. Then the table: `src/system-table.ts`
fetches and parses the definitions once, as now, and a new
`src/system-build.ts`, without the asset import so that it is tested
under Node, builds the table at the ceiling context and memoizes one
table, keyed by the ceiling alone, since nothing in a build depends on
the range limit beyond the clamp that already makes the ceiling fit it;
`app-shell.ts` rebuilds when a settings change moves the ceiling, which
is the one reason it ever rebuilds, and not when the digits change, and
keeps the table it has on screen until the new one is built, which is
synchronous and takes milliseconds (the present build plus `pi` from the
memo and five products of it). The tests that build the system table
(units.test.ts, messages.test.ts, build.bench.ts) build it at the ceiling
context as the app does, so that no unit holds a pass back;
`DEFAULT_PRECISION`'s comment loses its "until 3.3".

Rulings the task did not reach: `DEFAULT_CEILING` in context.ts is the
default cap's ceiling, 4,040, which the component's default context and
the tests use; `ceilingContext` returns the context itself when it is
already at its ceiling; the memo of system-build.ts is keyed by the
definitions' identity and the ceiling, holds a failed build too (the
system file is checked by its test, so a failure is a bug and rebuilding
on every render would not change it), and the shell calls it from
`render`, so the rebuild is a consequence of the settings changing rather
than an event the shell handles.

Tests: `checkContext` on the new field; `ceilingContext` is the context
at its ceiling and the same for every precision under it; the pipeline's
tests pass the ceiling in the context and its schedule test reads it off
the working contexts; a table is built once per ceiling, again for
another, and again on returning, since one is held; the component was
checked in headless Chromium against the production build.

Behavior: none visible yet; the table is precision-independent until 3.4.

### 3.4 `pi()`, and the definitions file

`BUILTINS` gains `pi` (arity zero, dimensionless, `piBall(context)`,
whose memo now holds the ceiling plus the margin of D10); units.txt loses
the `pi` literal and its five uses (`deg`, `grad`, `turn`, `oersted`,
`parsec`) become `pi()`. `constants.test.ts`'s second reference, the
36-digit literal it read from units.txt, moves into the test as a named
constant from GNU units. `units.test.ts`: the conversions that were exact
through `pi` are now `≈` and are checked by containment and certified
digits (`turn` into `deg` certifies 360 to the digits asked and is not
exact, `gon` into `deg`, `rpm` into `rad/s`, `parsec` into `au`), which
the study accepts; `1.5 deg` in `dms` ends in a term that cannot be told
from zero; a unit that reads `pi` is now a `functionAsUnit` error whose
message shows `pi()`.

Rulings the task did not reach: each built-in lives in a module of its
own under `src/core/builtins/` (several share one only when they share
internal machinery), with its test beside it; builtin.ts holds the type,
the errors and the rule helpers, which every such module imports, and
builtins.ts gathers the modules into `BUILTINS`, so that no module under
builtins/ depends on the map and the two cannot import each other in a
cycle; the memo's margin is `MEMO_MARGIN` in constants.ts. And a finding:
`deg` and `arcmin` are each settled on their own from the ceiling's `pi`,
so `1.5 deg` in `dms` decomposes to `1 deg + 29 arcmin + 59.99... arcsec`
before display, which is D8's carry case and `roundTerms` carries into
`1 deg + 30 arcmin` at the display's digits. The last term after the
carry is then a hair from zero, and since `roundTerms` moves the
remainder's midpoint without widening its radius (1.8), the recomposed
remainder's ball excluded zero and the component showed it as a certified
`3.3e-4049 arcsec`, the digits of a rounding artefact. Raised at this task
and fixed in the commit after it: `roundTerms` adds the rounding's shift
to the radius, so that the rounded terms contain `have` as 1.8 intends,
and the component judges the last term's kind on the rounded remainder
when the counts changed and leaves out a last term that cannot be told
from zero as it leaves out a zero, so the line reads `≈ 1 deg + 30
arcmin` (1.8 and 2.6 are amended). A second finding followed: `1 turn` in
`deg;arcmin` read `359 deg + 60 arcmin`, since the carry by exact
arithmetic cannot restore a whole from units settled on their own; D8 is
amended so that a count whose ratio straddles an integer is that integer,
and the line reads `≈ 360 deg`.

Behavior: angle units carry a radius; `pi` alone is an error that says
to write `pi()`.

### 3.5 The build's check over dimensions

New `src/core/dimension-of.ts`: `dimensionOf(expr, lookup, primitives)`,
the abstract interpretation the study describes: a number is
dimensionless, a unit is its dimension through the lookup (which still
visits the walk, so unknown names and cycles are found as before), a sum
checks conformance and takes the left's, a product or quotient combines,
a power raises, a negation keeps, a call checks the arity and applies the
callee's rule (a defined function's argument must conform to its declared
unit and the result is the declared result's dimension; a built-in's rule
is its `dimensions`). The lookup it takes is over dimensions, with the
bound parameter resolved before any unit as `evaluateBound` does. Its
errors are the subset of `EvaluateError` a dimension can cause
(`nonconformingOperands`, `argumentMismatch`, `arityMismatch`,
`builtinArgument`, and the lookup's), so the messages hold; a literal is
not checked against the range limit, so a body of `1e30000` builds and
fails at the call, as a body that fails for every value (`1 / 0`,
`ln(0)`) now does, which the study accepts. `build.ts`'s `checkFunction`
evaluates the declared units and runs `dimensionOf` on each body with
the bound name at the declared dimension, in place of evaluating at one
of the unit; `applyFunction` and `invertFunction` are no longer called at
build time. docs/functions.md's "Build-time checks" and its acceptance of
the `1 / (x - 1)` failure are updated.

Rulings the task did not reach: the lookup `dimensionOf` takes,
`DimensionLookup`, has the evaluator's two resolvers with the unit one
giving a dimension, and the build wraps its own lookup in one with the
bound name resolved first (`boundDimensions`); the errors are the subset
`DimensionError` of `EvaluateError`; `applyFunction` and `invertFunction`
stay in evaluate.ts for the evaluator and the pipeline, which still
evaluate bodies at values.

Tests: `recip(x) [1;1] 1 / (x - 1) ; ...` builds, and so does a body of
`x / 0` and one with a literal beyond the range limit, each of which then
fails at the call; a body of the wrong dimension still fails with
`functionMismatch`; a body that adds a length to a time fails with
`nonconformingOperands` at its span, one that calls a function with the
wrong count of arguments with `arityMismatch`, and one whose argument
does not conform to the callee's declaration with `argumentMismatch`;
the walk still reports a cycle through a function; dimension-of.test.ts
checks every node kind, both callee kinds and the lookup's failures.

Behavior: functions whose bodies fail at `1` now build.

### 3.6 `exp`

New `src/core/fixed-exp.ts` (the kernel routines live in modules beside
fixed.ts, one per family, so that fixed.ts stays the representation, the
exact operations and the roots, and the routines stay below the ball,
where `powRationalBall` can reach them; fixed.ts exports the helpers they
share, `rebaseFixed`, `scaleFixed`, `divideFixedByInteger`, `exponentOf`
and `keepSignificant`, the last being D9's rule for a result's bits):
`expFixed(f, bits)` reduces by halving until the argument is below `2^-8`,
sums the Taylor series in fixed point with the argument's error included
from the start, stopping at the first term whose whole interval lies
within an ulp, after which the tail is below a 255th of an ulp and one
ulp covers it, then squares back, each squaring doubling the relative
error plus one ulp, working at the bits plus the number of squarings plus
a guard, and for a negative argument at as many more fraction bits as the
result is below one; the result's `bits` follow its magnitude (D9), so
`exp(-1000)` keeps its digits. `constants.ts` gains `eSeries(bits)`, `Σ
1/n!` by binary splitting with the tail below `2 / (N + 1)!`, and
`eFixed(bits, ceilingBits)`, memoized as `pi` is by one rule,
`memoAtCeiling` (D10). `builtins/exp.ts` holds `expBall` and the built-in
(one dimensionless argument; `exp(0)` exact; `exp(1)` from the memo; an
unbounded argument gives an unbounded result); it guards the result's
magnitude against the range limit before computing, `tooLarge` at the
call, on either side of one, so that `exp(1e6)` and `exp(-1e6)` are
refused alike, since the settled midpoint of the second would need a
denominator beyond the limit. `bench/kernel.bench.ts` gains a report of every kernel routine at
the default ceiling and at a quarter of it, one line per routine as each
lands (this task's are `exp` and the roots), asserting that the ceiling
costs at most 64 times the quarter, twice what a series of linear length
over Karatsuba multiplication gives; the report is what 3.11 chooses the
probe's composite from, and it is where D12's "milliseconds at four
thousand digits" is measured rather than assumed.

Tests: reference digits of `e` to 100 from Python's decimal module;
containment over the shared source across magnitudes; exact case and its
neighbor; the pipeline certifies `exp(1)` at 50 digits in one pass;
`exp(1 m)` is a dimension-rule error whose message names the dimension;
`exp(1e6)` is `tooLarge` at the call.

Two findings as it landed. The containment test caught `truncateFixed`
(2.x) rounding its error down: cutting `bits` from a value loses up to an
ulp of the new size, and the old error, converted to the new ulps, must
be rounded up, not down, before that ulp is added (3/4 ± 2/4 truncated to
whole units is 0 ± 2, not 0 ± 1, since the interval reaches 5/4); the
rule is now `ceil(error / 2^k) + 1`, a unit test holds the case, and the
memo tests' exact error counts moved by one. And the kernel's modules had
an import cycle through fixed.ts, ball.ts and context.ts that only
type-only imports kept alive: under `verbatimModuleSyntax` an `import {
type X }` still loads its module for side effects, so the cycle ran a
module's top level before its constants existed once a test imported
fixed-exp.ts first. Every type-only import in src and bench is now
`import type`, which is erased, and the cycle is gone; nothing else about
those modules changed.

Behavior: `exp` exists.

Known limit, to be lifted in stage 4. `exp(1e6)` is `tooLarge`, and so is
every argument beyond about 45,000 at the default range limit and
727,000 at the hard bound, because a midpoint is a `Rational` and an
inexact one is a dyadic `num × 2^-k` whose size is its exponent: `exp(1e6)`
is about `2^1442695`, a numerator of 1.4 million bits, beyond
`LIMIT_BITS`. The value asked for is an ordinary one, `≈ 3.0332e434294`,
a mantissa at the working precision times an exponent, and `exp` is
inexact whatever its argument, so nothing is lost by giving it as such.
That is the `Scaled` midpoint of D13 and stage 4, which this limit adds a
requirement to: the kernel's results must reach the midpoint as a
mantissa and an exponent without the exponent ever being formed as bits
(4.4 amended, and 4.9 added). Until then the guard stands, and `sinh`,
`cosh` (3.11), a power in log space (3.8) and a large decibel (3.12) share
it, since each ends in `exp`.

### 3.7 `ln`, `log10`, `log2`, `log(b, x)`

New `src/core/fixed-log.ts`, beside fixed-exp.ts: `lnFixed(f, bits,
ceilingBits, scale)` writes the argument as `m × 2^k` with `m` in `[1,
2)`, takes `ln(2)` from a memo at the ceiling (D10, `memoAtCeiling` from
constants.ts, with `ln(10)` beside it for `log10`; `ln(2)` is `2
atanh(1/3)` and `ln(10)` is `3 ln(2) + 2 atanh(1/9)`, each `atanh(1/q)` by
binary splitting, two ulps), brings `m` within `2^-8` of one by eight
square roots, and takes `2 atanh((m - 1) / (m + 1))` as the series in
`z^2`, summed by rectangular splitting (the powers within a block of
about `sqrt(N)` terms computed once and divided by their odd numbers,
the blocks combined by Horner), so that the full multiplications number
about `2 sqrt(N)`; the result keeps the bits its magnitude calls for
(D9). The `scale` is the power of two a caller took off its value to
convert it at order one, so that `ln(1e-300)` loses nothing to the
conversion: builtins/log.ts scales every argument so. The square roots
are the first heavy use of `sqrtFixed`, whose integer square root cost
twice the Newton cube root at the ceiling (the stage 2 re-read): this
task replaced it with Newton on the reciprocal square root,
multiplications only with the precision doubling, verified by squaring
with the bound `D s / (2 s^2 - D)`, about `D / 2s`, since the looser `D /
s` would double the argument's error at every one of the logarithm's
eight roots; `sqrt10005` in constants.ts, which had a Newton of its own,
now calls it. The kernel benchmark's two square roots at the default
ceiling of 4,040 digits: 5.09 ms before, 0.57 ms after (0.57 ms and 0.10
ms at a quarter of it); `ln 3` there costs 19 ms, from 46 ms with the
series summed term by term, since V8 multiplies at these sizes by the
schoolbook rule, sixty microseconds a product, and the sum took 655 of
them. `exp`'s series is a candidate for the same splitting, left for the
report of 3.11.

New `src/core/builtins/log.ts`, one module for the four since they share
the domain rule and the kernel call: domain `x > 0`, an argument
non-positive throughout its ball a `domain` error (`notPositive`), one
straddling zero `unresolved` at edge zero, and one positive as rationals
but reaching within an ulp of zero at the working bits `unresolved` the
same way (a ball wider than its value at order one); `ln(1)` exact;
`ln(2)` and `ln(10)` their memos; `log10` and `log2` as quotients by the
memoized constants, exact where `x` is an exact integer power of the
base either way (`log10(1000)`, `log2(1/8)`), found by repeated division
of the numerator or the denominator with the other checked; `log(b, x)`,
of exactly two arguments with the base first (3.1), as the quotient of
two `ln`, exact when `x` is an integer power of `b` (`log(2, 8)`, `log(3,
1/9)`, `log(2/3, 8/27)`) or `b` of `x` (`log(8, 2)` is `1/3`), and
`log(b, 1)` zero for any valid base; `log(4, 8)` is `≈ 1.5`, since a
rational exponent in general is not looked for. `b` must be positive and
not one, checked before `x`: `b` exactly one is a `domain` error
(`baseOne`), a `b` straddling one, or whose logarithm is a ball around
zero at the working bits, is `unresolved` at edge `1`, and a `b`
straddling zero at edge zero. An unbounded argument gives the function
of its midpoint with an unbounded radius, the midpoint held to the
domain. The quotient of two kernel logarithms is `divideFixed`, cut to
the bits its magnitude calls for.

Tests: reference digits of `ln(2)` and `ln(10)` to 100 from Python's
decimal module, and `ln` at six arguments including two through the
scale; the memos hold the ceiling's value plus the margin; containment
across magnitudes at a precision against four times it, at the value and
both ends; the result's bits at three magnitudes and the preconditions;
every exact case and its neighbor, with `integerPower` on its own; the
domain and `unresolved` cases of each function with the argument index
and the edge; `ln(0)`, `ln(-1)`, `log(1, 8)` and `log(-2, 8)` are domain
errors with their messages, `ln(1 m)` a dimension-rule error; `ln` of
`(2^(1/2))^2 - 2` is `unresolved` at the argument, and `log(1 +
((2^(1/2))^2 - 2), 8)` at edge one, worded as such after the ceiling; the
pipeline certifies `exp(ln(3))` and `ln(exp(3))` at 30 digits; the kernel
benchmark gains `ln 3` and the two constants' series.

Behavior: the logarithms exist, and the square root's radius is what the
new bound gives, an ulp or two, where the integer root's was exact to
the ulp.

### 3.8 `sqrt`, `cbrt`, `pow(x, y)`

`sqrt` and `cbrt` are `rootBall` under a name, with the same exact cases
as `^(1/2)` and `^(1/3)`, so `sqrt(9/4)` is exact and `sqrt(-1)` is the
`negativeRadicand` that `(-1)^(1/2)` is, worded as it is: `"sqrt(-1)"
takes an even root of a negative value`. `pow(x, y)` is for a
dimensionless base and exponent (the rule says so). Its rule, and
`powRationalBall`'s, which `^` shares: an integer `y` is `powBall`; a
rational `y = p/q` in lowest terms is exact when `x` is exact and a
perfect `q`-th power, found by `exactRoot(x, q)` and raised to `p`
without ever forming `x^p`, since `x^(p/q)` is rational exactly when `x`
is a perfect `q`-th power; otherwise, when `x^p` would fit the range
limit, the root route as today, `rootBall` of `powBall`, which also
serves a negative `x` under an odd `q` and reports a straddling `x`
`unresolved`; otherwise, and for an inexact `y`, log space: `exp(y ln x)`
for an `x` positive throughout, a `domain` error (`notPositive`) for one
non-positive throughout with an inexact `y`, `negativeRadicand` for one
negative throughout under an even `q`, and `unresolved` at edge zero for
one straddling zero. Log space expands what can be computed at the cost
of exactness only where nothing exact was reachable: `pow(10,
2.3456789)` and `2^0.1234567` were `10^23456789` and `2^1234567`, refused
as `tooLarge`, and are now values with a radius, which is what `decibel`
needs for an ordinary reading (3.12). An exact zero base with an inexact
exponent is exact zero when the exponent is positive throughout,
`divisionByZero` when negative throughout, and `unresolved` at edge zero
when it straddles zero; `pow(0, 0)` is exact one as `0^0` is.

Tests: exact cases and their neighbors, including `pow(8, 1/3)`,
`pow(1/4, 3/2)`, `pow(10, 2)`; containment over the shared source for
both routes; `pow(2 m, 2)` is a dimension-rule error whose message says to
write `(2 m)^2`; `pow(0, 0)` is exact one; `pow(10, 2.3456789)` and
`2^0.1234567` compute, against Python's decimal power at a working
precision well above the digits taken; `pow(-2, 1/3)` is the negated
root, `pow(-2, 1/2)` a `negativeRadicand`, `pow(-2, sqrt(2))` a domain
error; the zero base's three cases.

As it landed. `sqrt` and `cbrt` share `builtins/roots.ts` (one rule under
two names) and `pow` has `builtins/pow.ts`; the helpers the three share
with the logarithms, `checkPositive` (the domain rule for a positive
argument), `sideOfZero`, `unboundedOf` and `fromBallError` (a ball
operation's error as a built-in's, an `unresolved` naming the argument
and edge zero), moved into builtin.ts, and `radiusBound` and `expFits`
from builtins/exp.ts into ball.ts, since `powLogSpace` there holds the
result to the range limit as `exp` does. The log-space route is ball.ts's
`powLogSpace(x, y, context)`, for a bounded base positive as rationals and
any bounded exponent, on `lnScaled` (the scaling of the base to order one
before conversion, which builtins/log.ts's `ln` shares) and `expFixed`:
the logarithm is taken at the working bits plus the magnitudes of the
exponent and of the logarithm, so that the product keeps the working
bits, and `^` reaches it whenever `powBall` reports `x^p` too large for a
base that excludes zero, negating by symmetry for a negative base under
an odd root with an odd numerator; a base straddling zero whose power
does not fit stays `tooLarge`, since its interval's result does not fit
either. `exactRoot` on the base now comes first in `powRationalBall`, so
that `8^(2/3)` is exact without forming `64`, as the task asks; the
results are the ones the root route gave. A ball touching zero from below
(`[-2, 0]`) is not positive anywhere, so it is a `domain` error for a
logarithm or a base, while for the exponent of a zero base it is
`unresolved`, since `0^0` differs from `0^-ε`; `sideOfZero` counts such
a ball as straddling. Division by zero is worded as the evaluator words
it everywhere (`Division by zero in "pow(0, -sqrt(2))"`).

Behavior: `sqrt`, `cbrt` and `pow` exist, and `2^0.1234567` is a value
where it was `tooLarge`.

### 3.9 `sin`, `cos`, `tan`

`sinFixed` and `cosFixed`: reduce the argument by the nearest multiple of
`pi / 2`, with `pi` taken at `bits` plus the argument's bit length so the
reduction keeps its digits for large arguments (from the memo up to
`2^256`, computed and not kept above it, D10), then Taylor; the quadrant
from the multiple. `tan` is the quotient, `unresolved` at the argument
with edge `"pole"` when `cos`'s ball contains zero. The rule requires the
`radian` kind (D11) and hands the kernel the magnitude, which is in
radians since `radian` is the primitive; `sin(0)` is the kind mismatch
`1 m + 0` is, and `sin(0 radian)` the exact zero. The odd functions of
this stage (`sin`, `tan`, and in 3.10 and 3.11 `asin`, `atan`, `sinh`,
`tanh`, `asinh`, `atanh`) convert a tiny argument at the working bits
plus its negative binary exponent, as `rootBall` scales its argument, so
that `sin(1e-50 radian)` certifies on the first pass and not at the
ceiling; the built-in does the scaling, the kernel sees a value of order
one or larger. Exact cases: zero for `sin` and `tan`, one for `cos`.

Tests: reference digits of `sin 1` and `cos 1` to 100 from Python's
decimal module (its own series at a higher precision, named in the test);
containment across `[-100, 100]`, at `10^20` and at `1e-50`; `sin(30
deg)` certifies `0.5` at the digits asked and is not exact; `sin(1)` is a
kind mismatch whose message says to write `sin(1 radian)`, and `sin(1 m)`
a dimension mismatch; `sin(pi() radian)` is `zero` with a bound at the
ceiling; `tan(pi() radian / 2)` is `unresolved` at the argument with the
pole's wording.

As it landed. `sinCosFixed` in fixed-trig.ts computes the sine and the
cosine together, since they share the reduction and the powers of the
series, `sinFixed` and `cosFixed` are each one of the pair, and `tan` is
their quotient in builtins/trig.ts, cut to the bits its magnitude calls
for; `angleToNumber` in builtin.ts is the rule the three share. The
reduction takes `n = round(2x / pi)` on the integers and pi at the bits
asked for plus the bit length of the argument's integer part, so that
pi's three ulps times `n / 2` are under one ulp of the result, which is
what makes the memo's margin serve exactly the arguments below `2^256`
at the ceiling pass (a test pins `2^255` served and `2^300` computed
uncached; the margin was 64 bits, and the pins `2^63` and `2^70`, until
#117).
The two series, in `v = -r^2` with the powers shared, are summed by the
rectangular splitting of 3.7, each block scaled through its largest
product of consecutive integers so that it costs one division rather
than one per term (a division per term cost more than all the rest),
which puts `sin` and `cos` at the ceiling at the cost of `exp` and `ln`
there (11 and 12 ms against 12 and 10 ms in the kernel benchmark, which
gains `sin 1` and `cos 1`). Two rulings the task did not reach: an
argument whose interval is wider than about a fifth of a radian after
the reduction admits no series of shrinking terms, and both functions are
then the trivial bound, zero within one, which the retry loop narrows and
of which `tan` is `unresolved` at the pole; and the tiny argument's
scaling is a conversion at the working bits plus its negative binary
exponent, the kernel working at the larger of the bits asked for and the
argument's bits, so `sin(1e-50 radian)` at forty digits has a radius of
`1e-96`. The propagation counts the argument's error in `r` and in `r^2`
both, so a radius exceeds the derivative bound by a small factor
(`sin(1 ± 1e-20)` has radius `6e-21` against `cos(1) × 1e-20`, `5.4e-21`),
which is the price of D9's rule over a derivative bound and is accepted.

Behavior: `sin`, `cos` and `tan` exist.

### 3.10 `asin`, `acos`, `atan`, `atan2`

`atanFixed` by half-angle reduction a few times, then Taylor; `asin` and
`acos` through `atan` and `sqrt` with the domain `[-1, 1]`, a ball
straddling an end `unresolved` at edge `1` or `-1`, one outside a
`domain` error (`outsideClosedUnitInterval`); `atan2(y, x)` by quadrant:
`atan(y / x)` for an `x` positive throughout, that plus or minus `pi`
by the sign of `y` for an `x` negative throughout, `±pi / 2 - atan(x /
y)` for a `y` of definite sign when `x` straddles zero, `unresolved` at
`y` with edge zero when `y` straddles zero and `x` is not positive
throughout (the result jumps by `2 pi` there), and `atan2(0, 0)` a
`domain` error (`origin`). All four return the `radian` kind (D11), and
`atan2` takes two quantities of one dimension (`nonconformingArguments`
otherwise). Exact cases: zero for `asin` and `atan`, `acos(1)`, and
`atan2(0, x)` for an `x` positive throughout.

Tests: reference digits of `atan 1` (a quarter of `pi`) and `asin(1/2)`
(a sixth) against the pi reference; containment, including near the
ends of the domain; `asin(2)` and `acosh`'s neighbours' domain messages;
`atan2` in every quadrant against `atan`, and its unresolved case;
`asin(0.5)` into `deg` certifies `30`; `atan2(3 m, 4 m)` is an angle and
`atan2(3 m, 4 s)` a dimension mismatch; the pipeline certifies
`asin(sin(0.5 radian))` at 30 digits.

As it landed. The four share builtins/inverse-trig.ts, every one being an
arctangent, and `numberToAngle` and `conformingToAngle` in builtin.ts are
their rules. `atanFixed` in fixed-trig.ts inverts an argument above one
against `pi/2` from the memo, halves the angle eight times through
`sqrtFixed` with the argument's error carried through, and takes the
logarithm's series in `-z^2` (`oddReciprocalSeries`, exported from
fixed-log.ts for it), 12 ms at the ceiling in the kernel benchmark, which
gains `atan 1`. `asin(x)` is `2 atan(x / (1 + sqrt(1 - x^2)))` and
`acos(x)` is `2 atan(sqrt(1 - x^2) / (1 + x))` for `x` at or above zero
and `pi - 2 atan(sqrt(1 - x^2) / (1 - x))` below it, so that neither
divides by a value near zero and `acos(1 - 1e-30)` certifies its digits on
the first pass; `1 - x^2` is formed on the ball, exactly for an exact `x`,
and rooted by `rootBall`, which scales a tiny value to order one. The
domain is read off that ball, and two rulings follow: a ball touching an
end of the domain counts as straddling it, as `sideOfZero` counts a ball
touching zero, and one the root cannot tell from the end at the working
bits is the same `unresolved`, at the edge on the side of the midpoint;
and `asin(±1)` and `acos(-1)` are the memo's `pi` in the same way as
`exp(1)` is the memo's `e`. `atan2` with `y` exactly zero is the exact
zero for an `x` positive throughout, `pi` for one negative throughout,
`unresolved` at `x` with edge zero for one straddling it, and the `origin`
error for one exactly zero, the case the task's list did not reach. An
argument of `atan` whose interval is wider than one radian is zero within
two, the trivial bound, as 3.9's wide arguments are; `atan2(0 ± 1, 2)` is
that bound and the retry loop narrows it. The inverses cannot produce a
large magnitude, so the limit of 3.6 does not reach them.

Behavior: the inverse trigonometric functions exist.

### 3.11 The hyperbolic functions and their inverses

`sinh`, `cosh`, `tanh` through `exp`, with `sinh` for small arguments
through its own series to avoid the cancellation of `exp(x) - exp(-x)`,
and `sinh` and `cosh` guarded by magnitude as `exp` is; `asinh`, `acosh`,
`atanh` through `ln` and `sqrt`, `asinh` by symmetry for negative
arguments; domains `acosh(x >= 1)` (`belowOne`) and `atanh(|x| < 1)`
(`outsideOpenUnitInterval`), a ball straddling an edge `unresolved` at
it as in 3.10. Exact cases: zero for `sinh`, `tanh`, `asinh` and
`atanh`, `cosh(0)`, `acosh(1)`. The elementary set is complete here, so
this task also settles what the probe times (D16, 2.7): from the kernel
benchmark's report, `limits.ts`'s precision operation becomes a composite
expression of the costliest built-ins at the candidate ceiling,
evaluated through the pipeline at that one precision, named in one place
with the measurements that chose it; the header says which and why.

Tests: reference digits of `sinh 1`, `cosh 1` and `atanh(1/2)` (half of
`ln(3)`) from Python's decimal module; containment, including
`sinh(1e-10)`; the domain errors and their messages; identities within
the radius (`cosh^2 - sinh^2` contains one, `asinh(sinh(x))` contains
`x`); the probe's test with the composite.

As it landed. The six share builtins/hyperbolic.ts, the three forward
functions one kernel routine and the three inverses one route through
`ln` of a root. `sinhCoshFixed` in fixed-exp.ts computes the pair: an
argument below one throughout its interval takes the two series in `x^2`
over the factorials, which are 3.9's series without the alternating sign
(`factorialSeries`, exported from fixed-trig.ts for it), so that `sinh`
of a small argument never forms `(e^x - e^-x) / 2`, and any other
argument goes through `expFixed` on its magnitude, where the difference
loses at most a bit; the kernel benchmark gains `sinh 1/2` and `cosh 2`,
9 and 12 ms at the ceiling. `sinh` and `cosh` share the limit of 3.6
through `expFits`, the one guard, and nothing else in the module can
reach a large magnitude: `tanh` of an argument whose magnitude throughout
its ball is beyond what the working bits plus a margin can tell from one
is `±1` within `2 e^-2|x|`, a radius the coarse type holds at any
magnitude, so `tanh(1e6)` is `1` where `sinh(1e6)` is `tooLarge`, and
4.9's retouch reaches this module only at the branch through `expFixed`.
`asinh(x)` is `ln(x + sqrt(x^2 + 1))` on the kernel throughout, at the
working bits plus the negative binary exponent of `x`, negated by
symmetry for a negative `x`; `acosh(x)` is `ln(x + sqrt(x^2 - 1))` with
`x^2 - 1` formed on the ball and rooted by `rootBall`; `atanh(x)` is `ln((1

- x) / (1 - x)) / 2`with the quotient formed on the ball; the logarithm's
argument is converted at the working bits plus the negative binary
exponent of the small part it carries, so that`ln(1 + small)`keeps the
digits of`small`and`asinh(1e-50)`, `atanh(1e-50)`and`acosh(1 +
  1e-30)`certify on the first pass. Rulings the task did not reach: a ball
touching an end of a domain counts as reaching it, as in 3.10, so`acosh`of a ball touching one from above and`atanh`of one touching`±1`are`unresolved`at the edge; an argument of`asinh`whose interval
is wider than one half is taken at its midpoint with the argument's
radius added,`asinh` being within the identity's slope everywhere,
  since the square under the root would not stay positive under the error
  rules; and the wide arguments of the forward functions go through the
  exponential of the whole interval, which is honest and wide.

The probe's composite is `sin(atan(exp(1)) + ln(3) radian)`, the four
costliest routines of the kernel benchmark's report each once (`exp`,
`atan`, `sin` and `ln`, about 12, 12, 11 and 10 ms at the default ceiling
on the machine of this task, the roots 0.5 and 1.6, the hyperbolic
functions and the remaining inverses compositions of those), evaluated
through the evaluator at the candidate's ceiling against a table of the
one primitive the angle needs, built at that context; the report notes
that `exp`'s series, summed term by term, is the remaining candidate for
the rectangular splitting the logarithm, the sine and the arctangent use
(V8 multiplies integers of 13,500 bits by the schoolbook rule, about 60
µs a product). Evaluating the composite found a cost of stage 2's: the
sum of two settled midpoints cost 66 ms at the ceiling, more than the
four routines together, because `rational` reduces every result by
Euclid's algorithm, which on a dyadic of thirteen thousand bits over a
power of two takes a step per few bits with a division of the whole
number at each. The gcd now takes the common power of two off both
numbers by their trailing zeros and runs Euclid on the odd parts, a step
or two when one of them is small and none when both are one, so that sum
costs 1.5 ms and the composite 38 ms, the sum of its routines; nothing
about the results changes, and the range probe, which times Euclid on two
random numerators, is unaffected and stays as it was. On this project's
cloud container the probe recommends 8,192 bits and 200 digits under
Node and 4,096 bits and 100 digits under headless Chromium, the range
limit binding the cap in both, as in 2.7.

Behavior: the hyperbolic functions exist, and the "Recommend limits"
button measures the new costliest operation.

### 3.12 The neper, the bel and the decibel

units.txt defines `neper(x) [1;1] exp(x) ; ln(neper)`, `bel(x) [1;1]
pow(10, x) ; log10(bel)` and `decibel(x) [1;1] pow(10, x / 10) ; 10
log10(decibel)`, with a comment on what a logarithmic unit is and on why
`dB` is absent: it reads as `d` + `B`, deci-byte, and a function's name
may not read as a prefixed unit, the rule that keeps `u` and `at` out
too. README's "What the file contains" loses the sentence that says
logarithmic units cannot be defined and gains the three.

Tests: `decibel(20)` is `= 100`, `bel(2)` is `= 100` (exact cases, through
3.8's exact power), `decibel(23.4)` is `≈ 218.77616` (the log-space
route), `1000` into `decibel` is `decibel(30)` and into `bel` is `bel(3)`
(exact, through the logarithm's exact case), `neper(1)` is `exp(1)`, and
`e` is still the elementary charge.

As it landed. The three follow the temperature readings in units.txt, so
that the functions of the file stand together, with the comment the task
asks for; `decibel(x / 10)` reaches the exact power for an integer level
and the root or log-space route of 3.8 for any other, so a large level
shares the limit of 3.6 through `pow`'s log-space route and its guard
(`decibel(1000001)` is `tooLarge` inside the call, as `exp(1e6)` is), and
nothing else about the units can reach a large magnitude. The message
tests build units.txt against stand-ins for the built-ins, and gain one
for `log10`, which the bel's inverse calls.

Behavior: the three logarithmic units.

### 3.13 Stage 3 docs

ARCHITECTURE.md: "Functions" gains the built-in kind and the dimension
rules; "Evaluation" the new errors; "Definitions" the check over
dimensions; "Precision and rounding" the elementary functions beside the
root and the ceiling in the context; "Later" loses built-in functions;
"Layout" the new modules; "Benchmarks" the kernel report. README: a
"Functions in expressions" section listing the built-ins, and the
settings note that the table is rebuilt when the "most digits" setting
changes (not the digits, which never rebuild it: D6). docs/builtins.md
gains its implementation notes; docs/calculator.md's status line names
stage 3 as landed and records the payload after `pnpm build` against the
study's estimate, as stage 8 asks at the end of this stage; and the plan
gains "Stage 3 as it landed", as stages 1 and 2 have.

Behavior: none; documentation.

## Stage 4: the `Scaled` midpoint and the decimal mode

Firm in shape, as 4.0 settled it; docs/decimal.md is the design note and
the reasoning, and this introduction lists what the note changed in the
tasks as first written. The study's features 4 and 5 as one: the midpoint
becomes a `Scaled`, a fraction times a power of ten (D13), and a decimal
mode rounds after every operation in the user's mode.

Amended during stage 3 (3.6): the stage also lifts the magnitude limit on
the inexact functions. Today an inexact midpoint is a dyadic whose size is
its exponent, so `exp(1e6)`, about `2^1442695`, is refused as `tooLarge`
at any range limit, though it is an ordinary value, `≈ 3.0332e434294`, a
mantissa at the working precision times an exponent. With a `Scaled`
midpoint the exponent is a number, not bits, so the stage must carry a
large result from the kernel to the midpoint without ever forming its
bits, and display it. That reaches the kernel (a routine that squares up
to a large magnitude renormalizes its mantissa as it goes), the
conversion `fixedToScaled`, the display (the decimal digits of `m × 2^e`
for a large `e` are found in log space, through the memoized `ln 2` and
`ln 10`, not by forming `10^E`), and D16, whose range limit then bounds
the size of exact values and the alignment of sums, not the magnitude of
an inexact result, which the exponent bound `MAX_EXPONENT` bounds.

Revised by 4.0 against the stage 3 code (docs/decimal.md has each
argument): the type is the one decimal exponent D13 wrote down, and the
kernel's binary base stops at the kernel's boundary, a result being
rounded onto the decimal grid of the working precision as it leaves
(`fixedToScaled`, 4.4) and `settle` rounding onto the same grid, a
division by a power of ten in place of a shift, measured at 0.2 ms
against 0.04 ms per settle at the default ceiling and nothing below it;
the two modes are thereby one `settle` with two parameters (4.5); a sum
whose alignment does not fit the range limit is `tooLarge` for two exact
operands in exact mode and otherwise settles its operands first and
absorbs the smaller into the radius when they still do not align, so
`addBalls` and `subtractBalls` take the context and every sum, product
and quotient of balls is a `Result` (4.4); the readers of `.mid` include
the built-ins, and the quotient rule moves onto the coarse type (4.4);
the kernel's large results travel as a `Floating`, a `Fixed` with a
binary exponent, the log-space digits of one whose exponent cannot be
formed are a module of their own, `digits.ts`, written in 4.9 since
nothing in 4.4 needs them, and `powBall`'s magnitude guard becomes the
exponent bound too, so `sqrt(2)^(10^7)` is a value (4.9); a unit list
whose count cannot be formed shows it settled toward zero (4.4, D8
amended); the decimal mode's radius is the exact rounding error, not the
half-unit bound, so that a rounded value certifies its last digit, and
`1 / 3 * 3` is `0.99999999` under `halfEven` at eight digits as under
`towardZero`, the first text's `1` under `halfEven` being wrong (4.5,
whose landing says what each mode certifies); the retry loop runs one
pass in decimal mode and the table is built in exact mode at the ceiling
whatever the user's mode (4.6); `Precision` and `DEFAULT_PRECISION` move
to rounding.ts (4.3); and
4.10, added in review, is the built-in `approx(x)`, which marks a value
as known only to the working precision and never narrows a radius its
argument carries (docs/approximate.md), placed
after 4.9 since it is a use of the exponent and needs nothing after it,
with its two-argument form, an absolute uncertainty, left as future work
with the retry loop's stopping rule it will need.

Amended after stage 4 (the second follow-up of "After stage 4", at the
end): the exponent bound refuses with errors of its own, `overflow` above
it and `underflow` below it, where the tasks below, written and landed
before that, say `tooLarge`: the constructor's check and the arithmetic's
(4.1, 4.2), a product's and a quotient's (4.4, and so the converter's
ratio and a prefix times a unit), and the guards of the exponential, the
log-space power and a power of an inexact base, with the log-space
conversion's failure (4.9). `tooLarge` is the range limit's alone: a
sum's alignment, an exact power's predicted mantissa, a literal's
mantissa, a fraction's power of ten, and the reach of the kernel
(`sin(1e999999999 radian)`). The messages name the limit; where the
tasks quote "too large to compute", it now reads "too large to compute
within Most bits", "too large to compute: its exponent would pass
10^18" or "too small to compute: its exponent would fall below -10^18".

### 4.0 Design note

docs/decimal.md: the `Scaled` type and its canonical form (D13), the
alignment rule for sums and its `tooLarge`, the exponent bound (`10^18`),
what "after every operation" means for a unit looked up, a power, a call,
and a defined function's body (every result the evaluator produces is
settled, in one place), and what the retry loop does in decimal mode
(nothing). Written against `fixedToBall`, which hands back `value ×
2^-bits`, and against `lnFixed` and `lnScaled`, which already take a
binary scale: the kernel's binary scale is settled into the power of ten
at the kernel's exit, and the type carries one exponent; the note's
first draft carried a binary exponent beside the decimal one, and the
note records why that was withdrawn. The stage's tasks below were
revised against it, and the note is reviewed before any code depends on
it.

Behavior: none; a document.

### 4.1 The `Scaled` type, construction and comparison

New `src/core/scaled.ts`, per D13: `Scaled = { mant, exp }` standing for
`mant × 10^exp`, the constructor `scaled(mant, exp)` normalizing to the
canonical form (the mantissa in lowest terms, its denominator coprime to
ten and its numerator not divisible by ten unless zero, zero as `exp`
zero), stripping the numerator's trailing zeros and moving the
denominator's twos and fives into the exponent (`1/6` is `5/3 × 10^-1`),
and checking the exponent bound of 4.2 (`tooLarge`; a `Result`);
`fromRational`; `toRational(s, limit)`, which fails `tooLarge` when
forming `10^|exp|` would exceed `limit` bits; `ZERO` and `ONE`; `isZero`,
`isInteger` (a denominator of one and `exp` at or above zero), `sign`,
`equals` (structural); `decimalExponent`, the mantissa's from its digit
counts plus `exp`, exact for any exponent and moved here from
rational.ts; `log2Bounds(s)`, a lower and an upper bound on `log2 |s|`
within `2^-30`, from the bit lengths of the mantissa and `exp` times
`log2 10` held as a 128-bit fraction, a constant of the module, for the
radius (4.4); and `compare`, total, decided by the signs, by the decimal
exponents, and, when those are within one of each other, by exact
alignment, whose shift is then bounded by the mantissas' digit counts
and never by the range limit. `rational.ts` is untouched. As it landed
(found by 4.2's tests): the constructor counts a mantissa's fives by
dividing by `5^(2^k)` from the largest power worth trying down to five,
each once, a logarithmic number of divisions, where one division per
factor made normalizing `10^300000` take a minute; a test holds the cost
on `10^20000`, `5^-20000` and `2^-20000`. `decimalExponent` is exact,
the digit counts' estimate settled by one comparison, so `compare`
aligns only values whose decimal exponents are equal.

Tests: the canonical form (`2.54`, `254/100` and `127/50` are one value
with one representation, and so are `1e3`, `1000` and `8 × 125`; `1/6`
and `1/1024` move their twos and fives, and a numerator's trailing zeros
move); a hundred seeded rationals drawn by key round-trip through
`fromRational` and `toRational` and equal structurally whichever form
they were built from; `compare` across exponents that could not be
aligned (`1e999999999` against `1`, against `-1`, against
`1.0000000001e999999999`, and `1e-999999999` against zero); the `log2`
bounds contain `log2` of seeded values within `2^-30`, at exponents up
to the bound; the round trip through `toRational` where it fits and its
failure where it does not.

Behavior: none; the module is unused.

### 4.2 The arithmetic with an exponent

`scaled.ts`: `add(a, b, limit)` and `subtract` align the mantissas by
`10^|Δexp|` and fail `tooLarge` when the shift, `|Δexp| log2 10` bits,
exceeds `limit` (`Result`s, where the fraction's are total); `negate`,
`absolute`, `multiply`, `divide`, `invert` and `pow(s, n, limit)` combine
exponents, the mantissa's power sized against `limit` as `pow` sizes it
today and the exponent times `n` against the bound; every one calls the
fraction's operation on the mantissas and renormalizes. `MAX_EXPONENT`
(`10^18`) bounds `|exp|`, checked wherever an exponent is combined,
failing `tooLarge`, so that formatting is always possible (the study's
bound, so that `10^(10^30)` fails cleanly instead of looping).
`dimension.ts` and the `^` exponent go on using `Rational`, whose
arithmetic stays total.

Tests: every operation agrees with rational.ts through `toRational` over
seeded pairs drawn by key where the values fit; sums with large exponents
(`1e999999999 + 3e999999998`, `1e999999999 - 1e999999999`) form exactly;
the alignment failure (`1e999999999 + 1` at the default range limit and
at the hard bound, which no limit holds, and `1e19000 + 1`, which the
default range limit holds and 60,000 bits do not); the exponent bound at the
bound and one past it, in a product, a quotient and a power; `pow` of
`10` to `1442695` is `{1, 1442695}` where `2` to the same is `tooLarge`
by the mantissa and `1e9` to `1e9` is `{1, 9e9}`.

Behavior: none; the module is unused.

### 4.3 Text, rounding, digits and roots on `Scaled`

`parseDecimal`, `roundTo`, `trunc` and `format` move from rational.ts to
scaled.ts and account for the exponent: `parseDecimal` keeps a literal's
exponent lazily, checking the mantissa against `LIMIT_BITS` and the
exponent against `MAX_EXPONENT`, so `1e999999999` parses where it is
`tooLarge` today; rounding to significant digits commutes with the power
of ten, so `roundTo` and `format` act on the mantissa as they do today
and add `exp` to the exponent, and a value of any exponent is rounded
and written with nothing formed; `format` writes the exponent form for
anything the fixed form cannot hold; `roundTo` gives a `Scaled`; `trunc`
is the value itself for an integer, the exact truncation where the value
can be formed within the bound given, zero for a value below one, and
`undefined` for a fractional value whose integer part cannot be formed
(4.9's count). `exactRoot(s, degree)` divides the exponent by the degree,
folds the remainder's power of ten into the mantissa when it can be
formed within the bound, and takes rational.ts's `exactRoot` of that,
so `sqrt(1e999999998)` is exactly `1e499999999`, `sqrt(1e999999999)` is
the kernel's, and a remainder that cannot be formed is no exact root.
rational.ts keeps construction, comparison, the exact arithmetic, `pow`
by a bigint, `trunc`, `exactRoot` on a fraction and `toFraction`;
`Precision` and `DEFAULT_PRECISION` move to rounding.ts with
`digitsFor(bits)`, the decimal digits `bits` binary digits are worth,
`ceil(bits log10 2)`. The parser's literal becomes a `Scaled` with a lazy
exponent, and the `number` node of expr.ts holds it; the `^` exponent
stays a `Rational`, the exponent grammar converting with `toRational` at
`LIMIT_BITS`, so that `m^1e999999999` is rejected where it is written
and `m^1e300000` is what it is today. Nothing else changes yet: the
callers still hold rationals, and convert through `fromRational` and
`toRational` at the boundary until 4.4, where that boundary goes.

Tests: the moved tests, with the exponent cases added; `format`,
`roundTo`, `trunc` and `decimalExponent` are functions of the value, not
of where its power of ten sits (`2.54`, `254/100`, `127/50` and `{127/50,
0}` against `{254, -2}` before normalization render alike in every mode
at every digit count tried, and so do `1e3` and `1000`); `1e999999999`,
its square and `1.5e-999999999` format and round in each of the seven
modes at 1, 8 and 30 digits without forming a power, against Python's
decimal module (name the source in the test); `exactRoot` of a value
whose exponent divides and of one whose does not; the literal
`1e999999999` parses and `1e1000000000000000001` is rejected, as is
`m^1e999999999` with its message.

As it landed. The tests of the modules that still hold fractions read a
literal, and round and format a fraction, through `src/testing/fraction.ts`
(`parseFraction`, `roundFraction`, `formatFraction`), test support beside
the random source that converts at the boundary as the app does; the
evaluator forms a literal's fraction with `toRational` at the context's
range limit and then applies the same size check as before, so a literal
beyond the setting is still `tooLarge` at its span; and since the
parser no longer refuses a large exponent, `1e999999999 m` is refused by
the evaluator, worded as a value too large to compute rather than a
number too large to represent, which the parser still says of a mantissa
beyond the hard bound and of a `^` exponent that cannot be formed.

Behavior: a literal with a large exponent parses where the parser
refused it, and is refused by the evaluator instead, at its span, with
the evaluator's wording; nothing reads the exponent yet, so no value
changes.

### 4.4 The midpoint becomes a `Scaled`

`Ball.mid` is a `Scaled`, and the kernel's boundary is where the base
changes. `fixedToScaled(f, digits)` rounds `value × 2^-bits` to nearest
at `digits` significant decimal digits, a multiplication by a memoized
power of ten and a shift, and `fixedToBall(f, context)` takes the
working digits, `digitsFor(bitsFor(precision))`, from the context and
adds the rounding, half a unit in the last digit, to the radius beside
the kernel's error; every built-in passes its context, and `piBall`,
`eBall` and the memos' balls likewise. `fixedFromRational` becomes
`fixedFromScaled(s, bits)`, the same division with the power of ten on
one side, a precondition failure for a value whose power of ten cannot
be formed within the range limit, which every routine that takes the
value itself bounds first (`sin`, `cos` and `tan` refuse an argument
whose integer part exceeds the range limit as `tooLarge`, since the
reduction needs `pi` to its bits; `atan` beyond `2^bits` is `±pi/2`
within `2^-bits`, and `asinh` and `acosh` beyond it are `ln(2|x|)` within
`1/(2x^2)`, the saturations the note lists, put in here so that no
argument reaches a routine it cannot enter); `lnScaled` takes the
exponent as a decimal scale, `ln(m × 10^e) = ln m + e ln 10` from the
memo, so `ln(1e999999999)` is `≈ 2302585090.691` on the first pass, and
the logarithms' exact cases read exponents (`log10(1e999999999)` is
exactly `999999999`); `positiveRoot` and `rootAroundZero` scale by
`10^(q k)` in the exponent and root `m × 10^r` on the kernel when the
remainder's power fits the range limit, and take `powLogSpace`
otherwise, as a rational power does today when its power does not fit.
`settle` in exact mode rounds an inexact midpoint to the working digits
to nearest, `roundTo` on the decimal grid in place of the shift, and
adds half a unit in the last digit to the radius (D15 restated).

The ball's sums: `addBalls(a, b, context)` and `subtractBalls` align
exactly where the shift fits the context's range limit; where it does
not, two exact operands in exact mode are `tooLarge`, and otherwise (an
inexact operand, or the decimal mode of 4.5, read here from the mode
field 4.5 adds, exact until then) each inexact operand is settled first,
the two are added exactly if they then align, and if they still do not
the smaller, which then lies below the working precision of the larger,
is absorbed into the radius; `multiplyBalls` and `divideBalls` combine
exponents and fail `tooLarge` at the exponent bound; so all four are
`Result`s, and `quantity.ts`, `evaluate.ts` (the sum, the product and the
quotient located as the division is today, and the context reaching
every sum) and `convert.ts` (`convert`, `convertToList` and `roundTerms`
take the context, as the study foresaw; a failure the checks rule out
throws, as `decompose` throws today) follow. The quotient rule moves
onto the coarse type: `(|a| rb + |b| ra) / (|b| (|b| - rb))` with the
magnitudes as radii from `radiusAbove` of a `Scaled`, new in radius.ts
on scaled.ts's `log2Bounds`, and the divisor's distance from zero as a
lower bound the quotient rounds up against (`divideRadius`, new), which
loosens a radius by `2^-28` relative and forms no rational. `containsZero`,
`magnitudeAbove`, `certifiedDigits`'s bound and every comparison of a
midpoint with an edge (`checkPositive`, `sideOfZero`, the logarithm's base
against one, `acosh` and `atanh` against their ends, `tanh`'s and
`asinh`'s widths, the list's order and `countOf`) go through scaled.ts's
`compare`; `extraBits` and `scaleOf` read `decimalExponent` and the
bounds instead of bit lengths.

`certifies` compares the midpoint with the radius by exponents and
leading digits where forming the ends is infeasible (D7): where the
radius aligns with the midpoint's grid within the range limit, the two
ends are formed exactly, as today; otherwise the radius is rounded up to
a decimal through the `log2 10` constant, the midpoint is taken to two
digits beyond those asked, and the ends are that interval widened by the
radius rounded up to a unit there, both of which must round alike at the
digits asked, and a digit the interval cannot resolve is not certified.
The display formats through scaled.ts; the readers of `.mid` (the
converter, the pipeline, the display, the messages, the built-ins) change
type. The evaluator, the table and the build see only balls and do not
change beyond the context reaching the sums. The stage 2 tests that
assert a dyadic midpoint (`settle`, `fixedToBall`, the memos' balls)
assert the decimal within the rounding instead.

Tests: the type change is covered by the existing tests; new ones for
`1e999999999 * 1e999999999` (exact, with an exponent, shown
`= 1e+1999999998`), `1e999999999 + 1` (`tooLarge`, located at the sum,
with its message through `evaluateText` and `describeTextError`), the sum
`1e999999999 + 3e999999998` (exact), `sqrt(2) + 1e999999999` and its
reverse (a value, `≈ 1e+999999999` certified on the first pass, the root
absorbed into the radius), `m^1e999999999` (rejected at the exponent),
certification of `sqrt(1e999999999)` (`≈ 3.1622777e+499999999`, first
pass) and of `sqrt(2) * 1e999999999` at 50 digits, `ln(1e999999999)`,
`log10(1e999999999)` (exact), `1e999999999 m` into `mm` (exact),
`sin(1e999999999 radian)` (`tooLarge` at the call), `atan(1e999999999)`
into `deg` (`≈ 90`), `asinh(1e999999999)`; `fixedToBall`'s rounding is
within half a unit of the working digits and its radius covers the
dyadic, over seeded values drawn by key; the quotient rule's radius
against the exact one over seeded balls, within `2^-27`; the kernel
benchmark reports a settle and a product on the decimal grid at the
ceiling beside the routines; and the containment tests of every routine
still hold.

As it landed. `fixedToBall(f, digits)` takes the digit count rather than
the context, every built-in passing `workingDigits(context)`, so that
fixed.ts stays below the context. The kernel is handed no argument it
cannot hold at either end of the exponent: beside the saturations above
for a large argument (`isBeyond`, `isHuge` in builtin.ts), an argument
throughout below `2^-maxBits` is answered by its expansion at zero, the
odd functions (`sin`, `tan`, `atan`, `asin`, `sinh`, `tanh`, `asinh`,
`atanh`) giving the argument itself within its cube and `cos` and `cosh`
one within its square (`isTiny`, `tinyOdd`, `tinyEven`), and `extraBits`
is held to the range limit; a tiny ratio formed inside `asin`, `acos` or
`atan2` converts to zero within an ulp at the limit's bits and gives a
ball around zero that certifies nothing, correct and the one case the
expansion does not reach, since those combine the kernel's arctangent
with `pi` before the ball is formed. `acos(1e-999999999)` is `tooLarge`,
its `1 - x^2` being a sum of two exact values that cannot be aligned, as
`1 + 1e-999999999` is. `convert` takes no context, a quotient aligning
nothing; `convertToList` and `roundTerms` do, and `ConvertError` gains
`tooLarge` for a ratio at the exponent bound, worded "`have` into `want`
is too large to compute". D8's amended count landed here rather than in
4.9, since `countOf` reads `trunc(s, limit)` and its `undefined` had to
be answered: the count is the midpoint settled toward zero at the working
digits, an integer, and the remainder is what it leaves. A power of ten
costs nothing in the exponent, so `10^100000` is exactly `1e100000` where
it was `tooLarge`, `10^(100000/3)` is a value, the cube root of ten times
`10^33333`, and `7^(100000/3)` is `tooLarge` as `10^(100000/3)` was; the
exact ball tests use the base seven where they used ten. The quotient
rule's radius is within `2^-25` of the exact bound over the seeded balls,
not `2^-27`: five coarse roundings, each `2^-29` to `2^-30`, and the
divisor's distance from zero rounded down; the test asserts `2^-25`.
`log2Of` reads the coarse bounds, since the bit-length estimate it
replaced was off by one for a base near one and refused
`1.0000001^10000000` under the magnitude guard. `roundTo` builds the
canonical form from the rounded integer directly instead of through
`rational`, whose gcd against the power of ten cost a settle at the
ceiling 2 ms; with the digit count of an integer taken from its bit
length and a comparison (`decimalDigits`) and the powers of ten memoized
(`powerOfTen`), a settle at the ceiling costs about 0.4 ms, a product
of two settled balls 0.1 ms and the kernel's exit 0.2 ms on the machine
of 4.4, which the kernel benchmark reports. The literal's range check is
on the mantissa, so `1e999999999 m` evaluates where 4.3 refused it.
`Edge` is a `Scaled`, worded through `format` at one digit. A prefix
times a unit at the exponent bound is `tooLarge` at the name's span in
the build and a thrown error in the table's lookup, unreachable with
definitions short of the bound. `position(b, point)` in ball.ts is the
one comparison of a ball with a point, on which `checkPositive`,
`sideOfZero`, the logarithm's base, `acosh`'s and `atanh`'s ends and the
list's counts are written. Certification where the ends cannot be
formed measures the distance from the midpoint to the nearest rounding
boundary against the radius, rather than widening a two-digit interval
by a unit or two: the interval refused any count whose two digits beyond
lay within two of a boundary, which `sqrt(2) * 1e999999999` at fifty
digits does (its 51st and 52nd digits are 48), and the distance is exact
and has no margin
(docs/decimal.md restated). `fixedToBall` adds the half unit only when
the rounding moved the value, so a kernel value of no error on the grid
is exact, as it was. A quotient at the exponent bound is located at the
whole quotient, where a division by zero points at the divisor. The
tests of the ball and above take a literal, a fraction and a ball through
`src/testing/scaled.ts` (`dec`, `fr`, `fraction`, `ball`, `digitsOf`),
beside `src/testing/fraction.ts` for the fraction side. Of the names
above, the radius of a `Scaled` is `radiusAboveScaled`, `radiusAbove`
keeping the fraction; `fixedFromRational` stays beside `fixedFromScaled`;
`scaleOf` went, `lnScaled` scaling the mantissa alone and `powLogSpace`
reading `log2Of`, the coarse bounds, in its place; and
`fixedFromScaled`'s precondition is the hard bound `LIMIT_BITS`, not the
range limit, so that a value below about `10^-315000` cannot be entered at
all, which the tiny ratio of `atan2` (issue #47) and the argument of `exp`
(issue #53) can reach.

Behavior: `1e999999999` parses and multiplies where it fails today, and
the values above are values; `1e999999999 + 1` still fails, as `tooLarge`;
every other result is what it is today to within a settle at the working
precision, except that a power of ten of any size, and a rational power
whose base is a power of ten, are values where they were `tooLarge`, and
an argument of a built-in below `2^-maxBits` or beyond `2^maxBits`, which
did not parse today, is answered as above; `exp(1e6)` and its family are
still `tooLarge` until 4.9.

### 4.5 `mode` in the context, and settling in decimal mode

`NumberContext` gains `mode: "exact" | "decimal"`, default exact, checked
by `checkContext`; `settle` (2.5, D15) reads it, and the two modes are one
`roundTo` with two parameters: in decimal mode every midpoint, an exact
one included, is rounded to the context's precision in the user's mode,
and the radius grows by the rounding's error, the exact difference
between the rounded value and the midpoint (not the half-unit bound of
exact mode: a value rounded to `p` digits with half a unit of radius has
its ends on the rounding boundaries and certifies `p - 1`, where with
the difference it certifies `p`; `1200/3937 m` rounded to `0.30480061` is
within `4e-10`); a value with `p` digits or fewer is its own rounding and
stays exact, and a zero midpoint is left alone; in exact mode it rounds
an inexact midpoint to the working digits to nearest as it does from
4.4. The evaluator and the lookup already settle every result in one
place, so nothing else changes; the table itself stays exact, as built
(`system-build.ts` and the tests build at the ceiling context in exact
mode whatever the user's mode, 4.6). The sum rule of 4.4 reads the mode
too: in decimal mode two exact operands whose sum cannot be aligned are
settled and added as inexact ones are, since every operation rounds
there, so `1e999999999 + 1` is `1e999999999` within one.

What the user's rounding mode means in each mode, stated once. In exact
mode it is applied once, by the display, to the certified value of the
whole expression (D15). In decimal mode it governs every operation, since
every result the evaluator produces is settled: a literal with more than
`p` digits is rounded and the radius records it; a unit is settled once
when it is looked up, exactly when it has `p` digits or fewer (`1 ft` in
`in` is `= 12 in` in either mode) and rounded otherwise; a power rounds
at every squaring, as `powBall` settles each product; a call rounds once,
on the kernel's result; a defined function's body is evaluated by the
same evaluator, so every operation in it rounds. `1 / 3 * 3` at eight
digits is the midpoint `0.99999999` under `towardZero` and under
`halfEven` alike, since `0.33333333 × 3` has eight digits and rounds no
further (the first text's `1` under `halfEven` was wrong), with the two
roundings in the radius, and the display then shows the digits the
radius certifies, `≈ 1` with seven of eight certain, as the study reads
the case; `0.125 * 1` at two digits is `0.13` under `halfAwayFromZero`
and `0.12` under `halfEven`, and `2 / 3` at eight is `0.66666667` to
nearest and `0.66666666` under `towardZero` and `floor`. The difference is
the point of having two modes rather than a quirk of the second. Decimal
mode is where a user who wants fixed-precision arithmetic with a
rounding mode, as a hand calculator or a decimal library gives it, gets
exactly that, and rounding only at the end, or raising the internal
precision as the retry loop does, would compute something other than
what was asked; exact mode is where "compute this to `p` digits" is
meant literally, and there a mode inside would only be a double rounding
of digits certification already guarantees. The radius tracks each
rounding in either mode, so the display marks the digits it does not
certify in decimal mode too, as the study says, without escalating (4.6).

Tests: `settle` in decimal mode rounds a seeded midpoint drawn by key to
`p` digits in each of the seven modes against `roundTo`, grows the
radius by exactly the difference, and is the identity on a value of `p`
digits or fewer and on zero; the examples above through `evaluate` at a
decimal context, midpoint and radius both; `1e999999999 + 1` in decimal
mode; `checkContext` rejects a mode that is neither.

As it landed. `mode` is an optional field of `NumberContext`, absent
meaning exact (`modeOf` reads it), so that every context written before
the mode existed is an exact one without a word changed; `MODES` names
the two, `checkContext` rejects a third, and `ceilingContext` sets exact
mode only where the context's is decimal, keeping a context without a
mode as it was. In decimal mode the settle's radius is `radiusAbove` of
the exact difference where the difference can be formed and the coarse
bound of scaled.ts otherwise. The reading of `1 / 3 * 3` above holds
under the nearest modes: the ball is `[0.99999998, 1]` to within the
coarse type, which certifies seven digits under `halfEven` and
`halfAwayFromZero` and none under `towardZero`, since a directed mode
has a boundary at `1` and the ends lie on either side of it; the display
then shows the midpoint `0.99999999` with the note that none of its
digits is certain, which is the honest reading of a value the roundings
have made noise, and no decimal library's `0.99999999` is a digit the
exact expression has. More generally, a value rounded in a directed
mode certifies at most `p - 1` digits and never `p`: the rounded value
is the boundary of its own cell, the exact value lies just inside the
cell on one side, and the ball, which has no one-sided radius, reaches
into the cell below by the same difference, so `2 / 3` under
`towardZero` at eight digits is `0.66666666` shown as `≈ 0.6666666` with
seven of eight certain, and a rounded value ending in zeros, on the
boundary of wider cells too, certifies fewer (`1 surveyfoot` in `m` is
`0.30480060`, shown as `≈ 0.3048` with six certain). The digit shown is
the mode's rounding of the computed value,
as a decimal library would show it, and the note says what the radius
can vouch for; under the nearest modes the rounded value is inside its
cell and the `p`-th digit certifies, as the text above says. Under
`awayFromZero` and `ceiling`, `1 / 3 * 3` is `1.0000001`, the third
rounded up to `0.33333334` and the product up again, and certifies no
digit either.

Behavior: none until 4.6 gives the mode a way in; `mode` defaults to
exact and every existing caller builds an exact context.

### 4.6 The pipeline in decimal mode

`schedule` yields the user's context alone in decimal mode, so `resolve`
runs one pass at the context's own precision, the kernel computing at
its bits with the guard, and the display marks what the radius does not
certify; an `unresolved` is final and reported at once, since no pass
can narrow it; the schedule applies in exact mode only. The table is
built at the ceiling context in exact mode whatever the user's mode
(`ceilingContext` sets it), and `unitLookup` settles a unit in the user's
mode. The conversion needs no settle of its own: the ratio is exact, and
the display's rounding of it in the mode is the division's per-operation
rounding; a list's counts and remainder are exact operations and
`roundTerms` rounds in the mode; the reciprocal line is the display's
rounding of the reciprocal. The probe of limits.ts is untouched.

Tests: through `evaluateText` and `convertText` at a decimal context:
`1 / 3 * 3` at eight digits under `towardZero` shows `≈ 1` with seven of
eight digits certain, and the same under `halfEven`; `1 ft` in `in` is
`= 12 in`; `1 surveyfoot` in `m` is `≈ 0.30480061`, certified; the
quotient `1 / (1 / 3 * 3 - 1)` is `unresolved` at once, with its message,
where exact mode reports the same after the ceiling; `exp(1)` at eight
digits is `2.7182818` within the rounding, one pass (a `run` that records
its contexts sees one); `sqrt(2)^2 - 2` is the mode's `0` or its rounded
residue, one pass; a list and a function want in decimal mode.

As it landed. `schedule` returns the context alone in decimal mode and
`resolve` is untouched, one pass being a schedule of one; `1 / 3 * 3`
under `towardZero` shows `0.99999999` with no digit certain, as 4.5
records, and `≈ 1` with seven under the nearest modes; the residue of
`sqrt(2)^2 - 2` is a ball around zero with the mode's bound in one pass.
The quotient `1 / (1 / 3 * 3 - 1)` is `unresolved` at once in decimal
mode, but in exact mode the difference is exactly zero and the quotient
a division by zero, not an `unresolved` after the ceiling as the text
above has it; `1 / (sqrt(2)^2 - 2)` is the quotient that is `unresolved`
in both modes, at once in the one and after the ceiling in the other.

Behavior: the decimal mode exists, reachable through the context, and
nothing in the app sets it until 4.7.

### 4.7 The UI

The mode setting beside the digits and the rounding mode: a "Mode"
select in the settings panel, `exact` ("every digit shown is certain, at
rising precision") and `decimal` ("every step rounded to the digits, in
the rounding mode"), stored as `mode` in settings.ts, validated on the
way in with the rest (a value that is neither is the default), clamped
with nothing, since it depends on nothing, and passed down in the
context; the table is built in exact mode regardless (4.6). README
"Settings" gains the setting, in 4.8's sweep.

Tests: settings.ts loads, defaults and saves the mode; `contextOf` carries
it; the UI check of the commit message records `1 / 3 * 3` at eight
digits in each mode with "Rounding" toward zero, and `1 ft` in `in` in
decimal mode.

As it landed. The mode is a "Mode" select after "Rounding", its two
options worded "exact: every digit shown is certain, at rising
precision" and "decimal: every step rounded to the digits, in the
rounding mode"; settings stored before the mode existed load with it
exact, and `isMode` is the validator beside the others. The UI check
records what the pipeline's tests record: `1 / 3 * 3` in decimal mode
is `≈ 1` with seven of eight digits certain under the nearest modes and
`≈ 0.99999999` with none under `towardZero`, and `= 1` in exact mode
under both.

Behavior: the mode setting.

### 4.8 Stage 4 docs

ARCHITECTURE.md "Numbers" for the type ladder of D13 (`Rational`,
`Scaled`, `Radius`, `Ball`, `Quantity`), the exponent, its bound and the
two modes; "Precision and rounding" for the decimal grid at the kernel's
boundary, the sums that settle first, certification by the digit
interval, and the decimal mode's settle; "Size limits" for D16 restated;
"Layout" for scaled.ts and digits.ts. README "Settings" for the mode,
and "Functions in expressions" for the range of the inexact functions
(`exp(1e6)` is a value; `exp(1e30)` is not). docs/builtins.md's rule on
a large result and its implementation note on the limit.
docs/calculator.md's status line names stage 4 as landed and the
payload line is measured again after `pnpm build`. docs/decimal.md's
"Implementation notes" and the plan's "Stage 4 as it landed", in the
style of "Stage 3 as it landed".

As it landed. The sweep covered ARCHITECTURE.md ("Numbers", "Precision
and rounding" with the settle in decimal mode and the one pass, "Working
precision and the context", "Size limits", "UI", "Layout" and "Later"),
README ("Settings" with the mode, "Functions in expressions" with the
range of the inexact functions and `approx`, "Most bits" with the free
power of ten), docs/builtins.md (the rules under the two modes, the
large-argument rules, the limit on large results, `approx`),
docs/decimal.md and docs/approximate.md ("Implementation notes" written,
the status lines), docs/calculator.md (the status line and the payload)
and this plan ("Stage 4 as it landed"); much of it was written task by
task as each landed, since every commit leaves the module headers and
ARCHITECTURE.md truthful. The production build after stage 4 precaches
129 KB, 42 KB compressed: the script is 111 KB (35 KB compressed), 17 KB
more than after stage 3 for scaled.ts, digits.ts, the `Floating` and
`approx`, and the definitions file 16 KB (6 KB compressed).

Behavior: none; documentation.

### 4.9 Large results of the inexact functions

Added during stage 3 (3.6), after 4.4 in the order, since the midpoint
can then hold a large result and the display write it; this task changes
the kernel and the guards, and nothing in 4.4 depends on it. `Floating =
{ mant: Fixed; exp: bigint }` in fixed.ts stands for `mant × 2^exp`, and
`fixedToScaled` takes one: exactly, as 4.4 has it, for an exponent that
can be formed within the range limit, and otherwise through new
`src/core/digits.ts`, above the kernel, which finds the decimal digits
in log space: the decimal exponent is `floor(exp log10 2 + log10 mant)`
and the leading digits are `10^fraction`, through `lnFixed`, `expFixed`
and the memoized `ln 2` and `ln 10` at the working bits plus the bit
length of the exponent plus a margin, the computation's error carried in
the kernel's error counts and added to the radius beside the result's;
it is the one place the program needs log space. `expFixed(f, bits)`
returns a `Floating`: after each squaring of its loop the mantissa is
cut to the working bits and the rest moved into the exponent (so
`exp(1e6)` costs what `exp(1)` costs plus sixty squarings at the working
bits), and a negative argument is the same loop with the exponent going
negative, the `depth` of today's routine going with it; its precondition
on the argument's magnitude (`MOST_MAGNITUDE`, `2^40`) becomes the
exponent bound, and `expFits` becomes that check, an argument whose
magnitude over its whole ball times `log10 e` exceeds `MAX_EXPONENT`
being `tooLarge` before anything is computed. `sinhCoshFixed` and
`tanhFixed` take the pair from the `Floating`: for an exponent beyond the
working bits plus a margin the reciprocal `1/E` is below an ulp of `E`
and is folded into the error, so that `sinh`, `cosh` and `tanh` of a
large argument form nothing (`tanh`'s saturation stands and comes first);
`powLogSpace` and `decibel` inherit the range through `expFixed`;
`powBall`'s magnitude guard becomes the exponent bound, a power of an
inexact base by squaring with settling having the range of its
exponent. The kernel benchmark gains `exp 1e6` and `cosh 1e6` at the
ceiling and asserts the first within a small factor of `exp 1`. (A unit
list whose count would be an integer that cannot be formed, D8 amended,
was to land here; 4.4 carried it, since `countOf` reads the exponent
there, and the tests of it are 4.4's.)

Tests: `exp(1e6)` against Python's decimal module at 30 digits
(`3.0332153968...e434294`), `exp(-1e6)`, `pow(10, 1e6 / 3)`, `cosh(1e6)`,
`sinh(-1e6)` and `1e6 decibel`, each certified and displayed with its
exponent through `evaluateText`; `digits.ts` against Python's decimal
module for `2^1442695`, `2^-1442695`, `3 × 2^1442695` and `7 × 2^(3 ×
10^18)` at 8, 30 and 60 digits, and its agreement with the exact
conversion on every value both can form (`2^100000`, `2^-100000`, at the
range limit and on both sides of it); `exp(1e18)` is a value and
`exp(1e30)` is `tooLarge` at the exponent bound, with its message; the
containment test of `exp` extended to arguments up to `1e6` of either
sign, at a precision against four times it, at the value and both ends,
drawn by key; `sqrt(2)^(10^7)` is a value where 2.5's test had it
`tooLarge`, and `sqrt(2)^(10^19)` is `tooLarge` at the bound;
`1e999999999 m` into `ft;in` shows `≈ 3.2808399e+999999999 ft`, the count
settled at the working digits (D8 amended), and into `km;m` is exact;
the kernel benchmark's `exp 1e6` at the
ceiling costs within a small factor of `exp 1`.

As it landed. `Floating` and its helpers (`floatingOf`,
`normalizeFloating`, which brings a mantissa to `[1, 2)` at the working
bits and moves the rest into the exponent, and `floatingToFixed`, the
exact way back within a limit) are in fixed.ts, and `expFixed` returns
one, normalizing after each squaring; its precondition is an argument
below `2^62`, the exponent bound's own, and the halvings are taken over
the argument's whole interval, so that a wide argument (`exp(0 ± 1e6)`)
is a ball that covers its range rather than a refusal. `sinhCoshFixed`
returns a pair of `Floating`s and folds the reciprocal beyond half the
working bits in the exponent; `tanhFixed` is one within two ulps there,
which the built-in's saturation never lets it reach. `digits.ts`'s
`floatingToBall(fl, context)` is the one way out, a `Result` that fails
`tooLarge` only where the decimal exponent passes the bound by the
guard's double slack: exactly through `floatingToFixed` at the range
limit, and otherwise `t = (e ln 2 + ln m) / ln 10` at the working bits
plus the exponent's bit length plus 24, the decimal exponent `floor(t)`
and the leading digits `exp((t - floor(t)) ln 10)` as a ball on the
grid times the power of ten; the first landing scaled `ln 2` by the
exponent less the mantissa's bits, which the mantissa's own fraction
bits already say, and gave `exp(1e6)` eighteen digits short. `expFits`
takes the bound alone and compares `bound log10 e` with `MAX_EXPONENT`,
`powBall`'s guard is `log10` of the base's magnitude times the exponent
against the same, and the squaring loop returns a product's `tooLarge`
where it threw. `exp`, `sinh` and `cosh` map the exponent bound failure
of the way out to the argument's. The kernel benchmark reports `exp 1e6`
at 14 ms against `exp 1` at 13 ms at the ceiling, and the log-space
digits of the result at 47 ms, the logarithm and the two memos computed
for the call at the ceiling's bits plus the exponent's, on the machine
of 4.9. `7^(100000/3)`, `pow(7, 100000/3)` and `pow(2, 1e6/3)` are
values through log space, and `pow(10, 100000 ± 1)` is a ball that
covers `10^100000`, where the range limit refused all four; `1e999999999
m` into `ft;in` is the settled count of 4.4. The tests take
`neper(1000001)` for the large logarithmic unit, `decibel` being a
function whose large argument is an exact power of ten that the exponent
takes (`decibel(1e6)` is exactly `1e100000`), and `pow(2, 1e6 / 3)` for
the power in log space, `pow(10, 1e6 / 3)` being the kernel's cube root
of a power of ten.

Behavior: the inexact functions have the range of their exponent, not of
the bits of their value; a power of an inexact base likewise.

### 4.10 `approx(x)`

Added in review of 4.0 (docs/approximate.md is the design). New
`src/core/builtins/approx.ts`: a built-in of one argument of any
dimension, kinds included, whose result has the argument's dimension
(`sameAsArgument`, new in builtin.ts, the rule D14 describes for the
exact functions of stage 6, landing here ahead of them); the
result is the ball whose midpoint is the argument's and whose radius is
the larger of the argument's own and one unit in the last of the
working digits, `digitsFor(bitsFor(precision))`, at the value's
magnitude, rounded up, so that an exact argument gains the unit and an
inexact one is never narrowed; a zero or unbounded argument is returned
as it is; the evaluator settles the result as it settles every inexact
one. In decimal mode the working digits are the user's `p`, and the
mode's rounding follows as for every result. The
retry loop needs no change, since the radius is the precision's and
shrinks with each pass. docs/builtins.md and README "Functions in
expressions" name it; the two-argument form, an absolute uncertainty,
is future work the note lays out, with the retry loop's stopping rule
it will need.

Tests: the built-in's own (an exact value gains the working radius, an
inexact one whose radius is larger is unchanged and one whose radius is
smaller is widened to the unit, `approx` of an `approx` is the same
ball, zero and unbounded are unchanged, any dimension passes and is
kept, `approx(1 m)` included); through
`evaluateText`: `approx(2.54) cm` in `in` is `≈ 1` certified on the first
pass, `approx(1e999999999) + 1` is `≈ 1e+999999999`, `approx(0.1) +
approx(0.2) - approx(0.3)` ends at the ceiling as a zero with a bound,
`approx(1 ft)` in `in` is `≈ 12`, `approx(1/3)` at eight digits is
`≈ 0.33333333` certified, and `approx(2)` in decimal mode is `2` within
one unit in the last digit; a definition calling `approx` builds, and a
conversion through it shows `≈`; `approx()` and `approx(1, 2)` are arity
errors with their messages.

As it landed. `sameAsArgument` returns the first argument's dimension
and checks nothing, the arity check having seen to the count; the
working digits are the context's precision in decimal mode and
`workingDigits(context)` in exact mode, read in the built-in, so that
the settle rounds the result in the mode as it rounds every result; a
zero midpoint, exact or not, is returned as it is, since a unit of the
last digit of zero would be a unit of nothing. `approx` is named in
docs/builtins.md's names, dimension table and layout, and in README
"Functions in expressions". The tests' definitions file defines `G
approx(6.674e-11) m^3` and a function whose body calls `approx`, and
converts through both with `≈`.

Behavior: `approx` exists.

## Before stage 5: hardening

Firm. Stage 4 landed with thirteen issues open against its code ("After
stage 4" lists them): a wrong answer, crashes where ARCHITECTURE.md
("Failures") requires a `Result`, values refused that could be computed, a
sum shown as zero, and two costs past their budget. This phase fixes them
before stage 5. Its order was checked against the code at 32192ed (main
after #55): every issue was reproduced there, each part of the order was
reviewed against the code with a prototype in a scratch copy, and the
measurements below are from this project's cloud container. The review
found more defects of the same kinds, which the tasks below take on, and
changed the order first proposed in three places (the error paths before
the bound, the size check at the evaluator, and a refusal needing the
whole ball past the bound); what follows is the corrected order.

Why this phase goes before stage 5 is severity, not dependency. There are
two wrong answers: `tanh` of a wide ball around zero certified as `±1`
(#38), and a unit list near the bound certified at a tenth below its value
(#59). And there are crashes on ordinary inputs, `pow(3, 1e-30)` among
them (#57). Stage 5 depends on none of the fixes. It depends on D17 alone,
since its exponent notation must write literals that parse back under it.
Its design note can be written at any time, and its code is best written
after H.13, so that its tests meet the final bound. Stage 6 does wait for
the whole phase. Its tasks 6.2 to 6.7 add eleven kernel-backed functions,
and 6.8 eight more as wanted. They would copy the handling of tiny, wide
and huge arguments that eight of the issues show to be inconsistent (#38,
#39, #40, #45, #46, #47, #49, #53), and they are built on this phase's
work: the kernel's door of H.2, the guard of H.15, the sweep of H.10
(which they join by the map of built-ins), and the size rule of D19 (which
`factorial` and `binomial` follow).

The issues fall into four groups. The argument handling of the built-ins
before the kernel covers the eight above. The exponent bound's definition
covers #44, #48 and #50. Size and cost is #52, and the parser is #54. The
tasks come in two tiers:

- **Tier 1** needs no decision and can land in parallel, except for the
  order the table marks (H.1 before H.3, H.2 before H.7, H.4 before H.5,
  H.5 before H.6). It is H.1 to H.9: the fixes of the argument handling,
  the roots, the bases of `pow`, the inverse trigonometric functions, the
  parser and the gcd.
- **Tier 2** needs the decisions above, under "Decisions" (D17 to D20, and
  the amendments to D4, D8, D15 and D16), which land with this section. It
  is H.10 to H.16, in their order: the sweep, `settle` as a `Result` (with
  the edge on `BallError`'s `unresolved`), the unit lists, the bound on
  the value, the size check, the guard, and `pow`'s exponent past Most
  bits.

H.17 records the phase as it landed. Each task is one commit unless it
says otherwise, and each says what closes which issue. The table gives the
order and the edges; "text" marks an edge that exists only because two
tasks edit the same lines, and "preferred" an order the task asks for but
does not need.

| Task                                           | Closes                  | Depends on                        |
| ---------------------------------------------- | ----------------------- | --------------------------------- |
| H.1 `tanh` of a wide argument                  | #38, #49                |                                   |
| H.2 Tiny arguments at the kernel's door        | #53, #56                |                                   |
| H.3 `exp` of a wide argument                   | #39                     | H.1 (text)                        |
| H.4 The radius of a power of ten               | part of #44             |                                   |
| H.5 Roots of a large degree or a tiny mantissa | #45, #57                | H.4 (text)                        |
| H.6 `pow` of the exact bases 0, 1 and −1       | part of #46             | H.5 (text)                        |
| H.7 The inverse trigonometric functions        | #47, #64                | H.2 (text)                        |
| H.8 A name followed by `(` is only a call      | #54                     |                                   |
| H.9 Smaller reductions, then Lehmer's gcd      | part of #52, #66        |                                   |
| H.10 The edge sweep                            |                         | the decisions; tier 1 (preferred) |
| H.11 `settle` returns a `Result`               | part of #44             | H.4                               |
| H.12 Unit lists report refusals                | #58, part of #44        | H.11                              |
| H.13 The exponent bound is on the value        | #50, #48, #44, #59, #60 | H.4, H.11, H.12; H.2 (preferred)  |
| H.14 Exact results are held to `maxBits`       | #52                     | H.9, H.13 (text)                  |
| H.15 One guard for the exponential and powers  | #40, #46, #61, #62      | H.1, H.2, H.3, H.6, H.13          |
| H.16 `pow`'s exponent past `maxBits`           | part of #46             | H.2, H.6, H.15                    |
| H.17 The phase as it landed                    |                         | all                               |

The pull requests: H.1; H.2 with H.3; H.4 with H.5; H.6; H.7; H.8; H.9;
then, in tier 2, H.10; H.11 with H.12; H.13; H.14; H.15; H.16; H.17.
Each pull request leaves `main` without a known regression, since each
is reviewed and merged on its own and may sit on `main` for a while: a
task whose first version would have refused a value within a bound until
a later task (H.11's settle check, as first written) is written against
the final rule instead. No function changes shape twice. The error types
this phase changes are fixed here, so that each task implements them
once, where #43 reshaped its error three times in review:

- `BallError`'s `unresolved` carries a required edge.
  `BallEdge = Scaled | "bound"` lives in ball.ts, and
  `Edge = BallEdge | "pole"` in builtin.ts (H.11's first commit, a
  refactor with no change in behavior, so that H.12 and H.13 build on
  the final shape).
- `settle` returns `Result<Ball, BallError>`, and `settleQuantity` returns
  `Result<Quantity, BallError>` (H.11).
- `decompose` returns a `Result` whose error is a `Refusal` or
  `BallError`'s `unresolved`, and `convertToList` fails with a
  `UnitListError`, a `Refusal` or that `unresolved` (H.12). H.13's
  arithmetic produces the `unresolved`, at the edge `bound`, inside a list
  whose `have` or unit is inexact (`approx(1e1000000000000000000) m` into
  `dm;cm`). The pipeline reports it as `ConvertError`'s new variant, which
  the retry loop retries, and `roundTerms` returns the terms uncarried on
  it as on a refusal (H.13). A count other than the last whose ratio is
  `unresolved` at the bottom of the bound is zero, as one below it is
  (D8).
- `ConvertError` gains a variant for a ratio `unresolved` at the bound,
  which the retry loop retries and messages.ts words (H.13).
- No new error kind, and no refusal on `LookupError`.

Some issues ask for things the decisions rule otherwise. Each fixing pull
request quotes the ruling:

- #38's texts end as a zero with a bound rather than certifying `≈ 0`,
  since a ball containing zero never certifies.
- #40 asks the guard to refuse on the midpoint alone. Under D18 it refuses
  only when the whole ball is past the bound, and a straddle is
  `unresolved` at the edge `bound`, worded as every edge is, not with a
  message of its own.
- Three of #44's rows become values rather than refusals, under D17 and D8
  as clarified: `approx(1e-999999999999999999)`, and the rows into
  `hr;min;s` and into `time`.
- #45's scope is wider than exponents below `1e-308` (H.5, #57).
- #53 asks `powLogSpace` to answer a tiny `y` as one within about
  `2|y ln x|`, or to form `y ln x` without converting `y` alone. H.2
  converts `y` to zero within an ulp, which already makes
  `pow(2, approx(1e-999999999))` a value; the branch itself needs a
  certified bound on `|ln x|`, which can reach about `2.3 × 10^18`, so it
  lands with H.15.
- #48's first constraint uses an input past the bound by value, which is
  refused where it is typed. The constraint is kept with an input within
  the bound (H.12).
- #50's fourth row already parses. And the value's decimal exponent
  decides, not the canonical exponent (D17).
- #52's size is measured on the reduced result where the evaluator forms
  it, not predicted from the operands, and sums are included (D19); its
  measure is the canonical form's, the cost the limit bounds (D16 as
  restated once more); and of the two resolutions it asks a decision
  between, a check and an input length limit, D19 chooses the check, and
  D20 chooses refusing at the node over rounding there, with the message
  naming the node and the remedy.

The review found defects that no issue listed. Each is now filed as an
issue, or added to the issue of its kind, and the tasks named here take
them on:

- Crashes on ordinary inputs:
  - `pow(3, 1e-30)`, `3^1e-30`, `pow(2, 5e-28)`, `pow(10, 1e-100)` and
    `pow(1/3, 1e-30)` throw (H.5, #57).
  - `pow(2e200, 1e-20)` runs half a minute and then throws, and
    `pow(1e-5 - approx(1e-5), 3^-700)` throws in the radius (H.5, #57).
  - At a range limit from about 350,000 bits up, which the settings allow,
    `exp`, `sinh`, `tanh`, `atan` and `sin` of values near the edges of
    what the kernel is handed throw (H.2, #56).
  - `cbrt(1e-1000000000000000000)` and `cbrt(2e-1000000000000000000)`
    throw, as does `pow(2e-1000000000000000000, 1/7)` (H.4, added to #44).
  - `1e-999999999999999999 m` into `ft;in` throws in the display's
    rounding (H.12, added to #44).
  - `3^32767 m` into `ft/7^21845; in/7^21845` throws (H.12, #58).
  - `pow(5e1000000000000000000, 1/3)` throws after twenty seconds in
    decimal mode (H.3, added to #39).
- Roots of a tiny mantissa that no pass resolves: `pow(3^-10000, 2^-30)`
  is reported as not told from zero, and `(7^-8000)^(1/99999)` is shown as
  zero within `0.9` (H.5, #57).
- A wrong answer: a unit list near the bound is certified at a tenth below
  its value (H.12, H.13, #59).
- Values refused by the ball arithmetic's midpoint, and a radius past the
  bound around a zero midpoint (H.13, #60).
- Guards that refuse values within `10^9` decades of the bound (H.15,
  #61), with related cases:
  - `powBall` at `n = ±1` (#61);
  - `pow(approx(1), 1e999999999)` (added to #46);
  - `floatingToBall`'s decision on its midpoint (#61);
  - the cost of a zero midpoint's power (#62).
- Sums of fractions not held to Most bits (H.14, added to #52).

Three more the review found are taken on by this phase or by stage 5,
since each is the twin of a fix here, and stage 6's functions would copy
whichever handling is in place:

- `atan` and `atan2` refuse a wide ball that reaches `2^maxBits`, as #49
  had `tanh` do (#64): H.7, by H.1's rule.
- The parser reduces a `^` exponent's fraction on literals up to the hard
  bound, which takes minutes with Euclid's gcd and seconds with Lehmer's
  (#66): H.9, by moving the reduction to the evaluator, where the range
  limit applies, as D19 asks of what can be bounded before forming.
- A zero's bound far below the exponent bound is written with every digit
  of its exponent. `(approx(1e20) - approx(1e20))^1e100000`, which H.15
  makes fast, is still shown within a bound whose exponent has 100,004
  digits (#67): 5.0 settles it with the top edge's carry, the display's
  other edge, and 5.1 lands it.

Three go to follow-up issues rather than this phase:

- `asin`, `acos` and `acosh` of an exact argument with a long mantissa
  (`asin(0.1 + 1e-15000)`) are refused, since their exact `1 - x^2` does
  not align (#63).
- `tanhFixed`'s fold band costs an extra pass (`tanh(75)`, #65).
- The table's prefix lookup still throws on a prefix times a unit that
  the arithmetic refuses or, from H.13, leaves `unresolved` at the bound.
  The shipped file is nowhere near the bound and its units are exact, so
  only a user definition that puts a unit within a prefix's factor of
  the bound reaches it, which needs the editor that user definitions
  still lack; to be filed with that feature, since the lookup has no
  error to return and the plan adds no error kind here.

The sweep's table (H.10) names each of these by its issue.

Every sentence in the docs and comments that names an open issue is
corrected by the task that closes it:

- The `#52` comments in scaled.ts, ball.ts, quantity.ts, table.ts,
  build.ts and hyperbolic.ts, ARCHITECTURE.md's three (rule 1, and two in
  "Size limits"), and docs/decimal.md's go with H.14. convert.ts's, in
  `decompose` and `settled`, go with H.12, and the one in `ConvertError`'s
  doc goes with H.14.
- ARCHITECTURE.md's `#48` goes with H.13, its `#53` with H.2, and its
  `#54` with H.8.
- docs/builtins.md's `#49` goes with H.1.
- docs/approximate.md's `#38`, `#39` and `#40` go with H.1, H.3 and H.15,
  and README's `#40` with H.15.
- docs/decimal.md's `#50` and `#48` go with H.13, and its `#53` and `#47`
  with H.2 and H.7.
- `farLogarithm`'s `#44` goes with H.4.

The stage 4 records in this plan (4.4's landing, D16's restatement, "After
stage 4") stay as they were written.

### H.1 `tanh` of a wide argument

Two commits, each green alone. The kernel's commit changes `tanhFixed`
(fixed-exp.ts). It answers an interval of width one or more (an error of
at least one half, the built-in's rule stated on the `Fixed`) with zero
within one, before it forms the pair. This is not `pair`'s wide test,
which `pair` makes only after its series test: an error from one half to
one whose interval stays within `(-1, 1)` now gets zero within one too
(`0 ± 0.5` was `0 ± 0.597`), and a wide interval far out on one side loses
the kernel's saturation (`5000 ± 0.6` was one within two ulps), which
`tanhBall`'s saturation takes first. Stage 4's shortcut read a pair beyond
the working bits as saturation, so it returned `±1` within two ulps for a
wide interval, around zero (#38) or on one side (`100 ± 99.9`, whose
`tanh` ranges over `[0.0997, 1]`). The shortcut stays only for the fold,
where the interval is far out on one side.

The built-in's commit changes `tanhBall` (builtins/hyperbolic.ts). After
the saturation, it answers an argument of radius at least one half with
zero within one, before the kernel is handed a midpoint it may not hold.
It loses the exponential's guard, which can no longer fire: with no
saturation and a radius below one half, `|mid| + rad` stays below about
181,727 at the largest ceiling the settings allow. So `tanh` is never
refused for its argument's size (#49). Zero within one is `tanh`'s whole
range and certifies nothing, and the retry loop narrows the argument. The
monotone ends `[tanh(lo), tanh(hi)]` would be tighter. They wait until an
argument can carry a radius of its own that no pass narrows, the
two-argument `approx` of docs/approximate.md.

Tests:

- The kernel at `0 ± 1e6`, at one-sided `100 ± 99.9` and at an error of
  exactly one half gives zero within one. An error of `127/256` stays on
  the kernel.
- `tanhBall` of `0 ± 1e9`, `-1 ± 1e13`, `50 ± 49.5`, `0 ± 1e30`,
  `0 ± 1e999999999` and `1e40 ± 1e41` gives zero within one.
  `1e999999999 ± 1e999999998` is still saturated.
- `sinhBall` and `coshBall` of `0 ± 1e9`, `100 ± 99.9` and `1 ± 2`, which
  this task leaves alone, contain the functions at both ends and at the
  midpoint (#38's check of the pair).
- Through `evaluateText`, #38's texts at 32 digits end as kind `zero`, and
  #49's texts show `0` within `1`. `tanh(approx(1e40) - approx(1e40) - 1)`
  at eight digits certifies `-0.76159416`, where it certified `-1`.

Docs: fixed-exp.ts's header and `tanhFixed`'s doc; hyperbolic.ts's header,
whose sentence that the guard never refuses `tanh` is false;
docs/builtins.md, "The limit on large results" and the trivial bounds; the
#38 clause of docs/approximate.md.

Behavior: `tanh` of a wide argument is zero within one, where it was `±1`
certified or a refusal.

### H.2 Tiny arguments at the kernel's door

`fixedFromScaled` (fixed.ts) returns zero within one ulp for a nonzero
value below half an ulp at the bits asked. It decides this from
`log2Bounds`, without forming the value's power of ten, and the result is
what `fixedFromRational`'s rounding gives such a value. Stage 4 threw
instead for a value below about `10^-315000`, whose fraction the hard
bound cannot hold: the argument of `exp` and of the log-space power (#53),
and `atan2`'s tiny ratio (#47). The threshold is half an ulp, not an ulp,
so that the result equals the rounding it replaces.

The hard bound it forms the fraction within is also too small for the
range limits the settings allow. `isTiny` hands the kernel an argument
down to `2^-maxBits`, about `1.5e-315653` at Most bits 1,048,576, and a
caller of `extraBits` converts it at more bits than its magnitude, so it
is never below half an ulp there. `toRational` at `LIMIT_BITS`, at 3.33
bits a digit, forms nothing below about `1e-314887`, nor a literal of
170,000 digits of order one, which Most bits 600,000 admits; and `sin`'s
`2^maxBits` lets `1e315000` through. So from a range limit of about
350,000 bits up, `exp`, `sinh`, `tanh`, `atan` and `sin` of such values
throw today (#56). `fixedFromScaled` therefore forms the fraction within
`4 × LIMIT_BITS`, which holds any mantissa within the range limit at a
magnitude between `2^-maxBits` and `2^maxBits` (about `3 × LIMIT_BITS`),
and it still throws past that.

`expBall` answers an argument throughout below `2^-maxBits` with one
within twice its magnitude bound, which is sound since `e^|x| - 1 <= 2|x|`
there. That is how the other built-ins answer a tiny argument, by their
expansion at zero (4.4). #53 also asks `powLogSpace` to answer a tiny `y`
as one within about `2|y ln x|`; here `y` converts to zero within an ulp,
which already makes `pow(2, approx(1e-999999999))` a value, and the branch
itself, which needs a certified bound on `|ln x|`, lands with H.15. The
pull request that closes #53 quotes this.

The total conversion, with the larger bound, is the root fix: it closes
the crash for every caller at every range limit, stage 6's included. The
expansion keeps the digits where a function has one, and the sweep (H.10)
keeps a missing expansion visible.

Tests:

- fixed.test.ts's case at the hard bound becomes zero within one ulp, with
  cases on either side of half an ulp.
- `exp` of `±1e-999999999`, exact, through `approx` and as
  `sqrt(2) * 1e-999999999`.
- `powLogSpace` of a tiny exponent, and `pow(2, approx(1e-999999999))`.
- `atan2(1e-999999999999999999, -1)` is `≈ pi`, as the crash's regression
  test; H.7 gives the ratio its value.
- At Most bits 1,048,576: `sinh`, `cosh`, `tanh`, `atan` and `sin` of
  `1e-315000`, `sinh` of `0.` followed by 200,000 ones, and
  `sin(1e315000 radian)` are values.

Under a directed rounding mode these show `≈ 1` with no digit certain,
since the ball straddles one, as `cosh(1e-999999999)` and `approx(1)`
already do. The docs say so.

Docs: ARCHITECTURE.md's rule 2, whose exception for `exp` goes; fixed.ts's
header and `fixedFromScaled`'s precondition; exp.ts's header ("A tiny
argument needs no scaling"); docs/builtins.md; docs/decimal.md, "The
kernel's boundary".

Behavior: `exp` and the log-space power of a tiny argument are values
where they threw, and so are the built-ins near the edges of what the
kernel is handed at a raised range limit.

### H.3 `exp` of a wide argument

`expFixed` (fixed-exp.ts) answers an interval of width one or more (an
error of at least one half) with zero within the exponential of its signed
upper end. That end, `value + error`, is formed exactly, with no error,
and the bound is the exponential's value plus its error: every value of
the interval has its exponential between zero and that. `floatingToBall`
(digits.ts) takes such a result, whose mantissa's interval contains zero
and so has no logarithm, as zero within the bound of its extent.

Stage 4 halved and squared the whole interval. A relative error of
`e^(2 × 10^9)` doubled its bit length at every squaring, until V8 refused
a bigint after seconds (#39). The upper end is the signed one, not
`pair`'s largest magnitude, which for a wide negative interval near
`-2.3 × 10^18` would report an overflow. The guard before it bounds the
upper end until H.15 replaces the guard.

Tests:

- Containment at both ends for wide intervals around zero, around a
  positive center and around a negative one.
- The three texts of #39, at 32 digits, end `≈ 1` in milliseconds.
- `pow(5e1000000000000000000, 1/3)` in decimal mode, whose `y ln x`
  carries the settled third's radius, which crashed after twenty seconds.
- exp.test.ts's wide-argument test becomes a containment test.

Docs: fixed-exp.ts's header; the #39 clause of docs/approximate.md;
docs/builtins.md's list of trivial bounds (an error of one half for `exp`,
which gets zero within the exponential of the upper end).

Behavior: `exp` and `pow` of a wide argument are a ball around zero that
certifies nothing, in milliseconds, where they crashed.

### H.4 The radius of a power of ten

`powerOfTenRadius(k)` in radius.ts is a radius at or above `10^k` for any
bigint `k` below `2^90` in magnitude, its documented domain (the 128-bit
`log2 10` keeps `log2Bounds`'s margin of `2^-31` only to about `2^97`),
from the coarse bounds (`radiusAboveScaled` of `{1, k}`, which forms
nothing). It replaces a checked `Scaled` power of ten wherever one was
formed only to take its radius: `positiveRoot`'s power taken off,
`lnScaled`'s (both in ball.ts), and `approxBall`'s unit
(builtins/approx.ts). Each threw past the bound.
`approx(1e-999999999999999999)` threw (#44). So did
`cbrt(1e-1000000000000000000)`, `cbrt(2e-1000000000000000000)` and
`pow(2e-1000000000000000000, 1/7)`, where the root's multiple of the
degree overshoots the exponent by up to the degree less one; no issue
listed these, and they are added to #44.

`farLogarithm` (builtins/hyperbolic.ts) takes `ln 2 + ln |x|` from
`lnScaled` and the memo of `ln 2`. It formed `2|x|`, which passes the
bound for `5e1000000000000000000` (#44). `scaledPowerOfTen` keeps its
callers within the bound, and `halfUnitOf` moves onto the helper with
`settle` (H.11).

Tests: the three roots and `approx(1e-999999999999999999)` are values;
`asinh` and `acosh` of `5e1000000000000000000` are `≈ 2.3025851e+18`; the
helper brackets `10^k` at `k` of `0`, `±1`, `±10^18` and
`-(10^18 + 315000)`.

Docs: radius.ts's header; the comment in `farLogarithm`.

Behavior: the six inputs above are values where they threw.

### H.5 Roots of a large degree or a tiny mantissa

`rootFixed` (fixed.ts) takes a degree up to `ROOT_DEGREE_LIMIT`, `2^32`,
as a precondition. Its doc gives the reasons. The first guess is a
double's, good to `2^-52`, so `n · 2^-52` must stay well below one, and
the verification needs `n · 2^-working` below one half. Past the limit the
reduction took `Number(degree)`, which is `Infinity` beyond a double
(#45's `NaN`), and well below it the iteration failed its own check.

`positiveRoot` (ball.ts) sends three cases to one helper,
`rootInLogSpace`, which computes the root in log space, `x^(1/n)` as
`exp(ln x / n)`, and maps `powLogSpace`'s `unresolved` at zero (and only
that) to `undefined`, so that `rootBall` keeps its odd and even handling
(`pow(-2, 3^-700)` is `≈ -1` through its negative branch):

- a degree past the limit;
- a mantissa whose remainder's power of ten does not fit the range limit
  (stage 4's fallback);
- a mantissa scaled so far below one that its exponent, less `j` times the
  degree, passes `-bitsFor(precision)`. That mantissa converted to zero
  and reported a false `unresolved`. A mantissa below one by less than
  that is converted at the working bits plus the deficit, as `extraBits`
  converts a small argument of an odd function, so that it keeps its
  digits through the root rather than certifying fewer per pass; the
  deficit is at most the working bits, so the kernel is handed at most
  twice them.

`rootRadiusAbove` (radius.ts) divides by a large degree in bigints, where
`Number(degree)` gave `NaN`.

These crashes are more reachable than #45 says (#57):

- `pow(3, 1e-30)`, `3^1e-30`, `pow(2, 5e-28)`, `pow(10, 1e-100)` and
  `pow(1/3, 1e-30)` throw "Newton's root is not within half of its
  argument".
- `pow(2e200, 1e-20)` runs half a minute before V8 refuses a bigint.
- `pow(1e-5 - approx(1e-5), 3^-700)` throws in the radius.
- `pow(3^-10000, 2^-30)` is reported as not told from zero.
- `(7^-8000)^(1/99999)` is shown as zero within `0.9`, though it is
  `0.8558`.

Tests:

- These inputs, #45's (`pow(2, 1e-400)` and `2^1e-400`), `2^1e-310000` and
  `pow(-2, 3^-700)`, against references: `2^1e-20` and `pow(2, 1e-20)` are
  `1.0000000000000000000069314718056` (written `2^(1/10^20)` it does not
  parse, since `^`'s exponent takes no `^`), `(7^-8000)^(1/99999)` is
  `0.85583783261454849435`, and `pow(3^-10000, 2^-30)` is
  `0.99998976842809102303`.
- `rootFixed` at degree `2^32`, over arguments across its range at 36, 69
  and 200 bits, and the precondition at `2^32 + 1`.
- A mantissa below one by less than the working bits keeps its digits:
  `pow(3^-20, 1/1000)` certifies the digits asked at the first pass.
- `rootRadiusAbove` at degrees `10^400` and `3^700`.

Docs: pow.ts's header; ball.ts's header on the root, and `positiveRoot`'s
doc; `rootRadiusAbove`'s comment; ARCHITECTURE.md's rule 2 and its
paragraph on the kernel; docs/builtins.md, `pow`.

Behavior: the inputs above are values where they threw or were refused.
H.4 edits other lines of `positiveRoot`, so the two go in one pull
request, H.4 first.

### H.6 `pow` of the exact bases 0, 1 and −1

`powBallOf` (builtins/pow.ts) answers these cases in this order, before it
forms the exponent's fraction within the range limit:

1. An exact exponent of zero gives one.
2. An exact base of one gives exactly one, for any exponent, an inexact or
   an unbounded one included.
3. An exact base of zero is decided by the side of zero the exponent lies
   on, the switch it has, moved up.
4. An exact base of minus one, with an exact exponent whose fraction
   cannot be formed, is decided by the parity the canonical form gives,
   where `toRational` fails and without forming the fraction. An exponent
   with `exp > 0` has a numerator that is a multiple of ten over an odd
   denominator (the mantissa's denominator is coprime to ten), so the
   power is `1`, `1e999999999/3` included. With `exp < 0` the fraction's
   denominator is even unless the mantissa's numerator holds at least
   `-exp` twos: with fewer the power is the even root of a negative number
   (`1e-30000`), with exactly `-exp` it is `-1` (`5^-16000`), and with
   more it is `1` (`2 * 5^-16000`). A formable exponent keeps the rational
   route.

Stage 4 formed the fraction first. So it refused `pow(1, 1e999999999)`,
`pow(-1, 1e999999999)` and `pow(0, 1e999999999)` as `tooLarge`, and it
took `pow(1, approx(1e400))` to log space, which refused it (#46's rows 2
and 4 to 6).

Tests:

- The four rows give their exact values.
- `pow(0, -1e999999999)` is a division by zero, and `pow(-1, 1e-30000)` is
  the even root of a negative number.
- `pow(-1, 1/3)` is `-1`, and `pow(-1, 2/3)` is `1`.
- At the default range limit, `pow(-1, 5^-16000)` is `-1`, and
  `pow(-1, 2 * 5^-16000)` and `pow(-1, 1e999999999/3)` are `1`; `5^-15000`
  still forms, and `pow(-1, 5^-15000)` stays `-1` by the rational route.
- The test that pins `pow(1, 1e999999999)` as refused changes, and so does
  its comment.
- `approx(1.0000001)^1e30` and `pow(2, approx(1e400))` stay refused.

Docs: pow.ts's header; docs/builtins.md's exact cases.

Behavior: the four powers are exact values where they were refused.

### H.7 The inverse trigonometric functions at extreme arguments

Four commits in builtins/inverse-trig.ts, which close #47 and #64.

- `complementRoot` reads the domain from the argument's position against
  `±1` before it forms `1 - x^2`. So a huge argument of `asin` or `acos`
  gives the domain error, where before its square passed a limit first.
- `asin` and `acos` answer an argument whose square lies below
  `2^-bitsFor(precision)` by their expansion: `asin` as the argument
  within its cube, and `acos` as `pi/2` less that. The threshold is on the
  square at the working bits, not `isTiny`'s `2^-maxBits`. That would
  leave `1e-9841` to `1e-19728` refused at the default range limit, where
  `1 - x^2` does not align.
- `atan2`, for a `y` of definite sign, compares magnitudes as radii and
  forms no ratio where it cannot:
  - `±pi/2`, by `y`'s sign, when `|y|` is at least `|x| · 2^bits`
    throughout;
  - `±pi`, by `y`'s sign, when `x` is negative and `|y| / |x|` lies below
    `2^-bits`;
  - for a positive `x`, a tiny quotient is its own arctangent within its
    cube.

  `atan2`'s tiny ratio stopped crashing with H.2. Here it is given its
  value, rather than a ball around zero that certifies nothing.

- `atan` and `atan2` are never refused for an argument's radius (#64),
  by H.1's rule for `tanh`: a ball that reaches `2^maxBits` without lying
  beyond `2^bits` throughout, which `atanKernel` refused as `tooLarge`,
  is the function's whole range, zero within two for `atan` (the
  kernel's own trivial bound for a wide interval) and zero within four
  for `atan2`, which certifies nothing and lets the retry loop narrow
  the argument. A refusal is final, and no value of either function
  reaches any limit.

Tests:

- Every row of #47, and the four quadrants at both extremes.
- #64's rows: `atan(approx(1e30000) - approx(1e30000))` ends as a zero
  with a bound, `atan2(approx(1e30000) - approx(1e30000) + 1, 1)`
  certifies `≈ 0.78539816`, and `atan2(1e-30000, 1 - approx(1))` runs to
  the ceiling and is `unresolved` at zero there, its `x` straddling zero
  at every pass.
- `atan2(1e-999999999999999999, 1)` is `≈ 1e-999999999999999999 radian`.
- `acos` of `1e-9860`, `8e-9865` and `-1e-15000`, and `asin(1e-50)`
  unchanged.
- A ball of midpoint `1e600000000000000000` and radius
  `2e600000000000000000` is `unresolved` at `1`, and its negation at `-1`,
  where its square was refused as `overflow`. A ball around zero of radius
  `1e600000000000000000` stays `unresolved` at `1`.

Docs: inverse-trig.ts's header; docs/builtins.md; ARCHITECTURE.md's rule
2; docs/decimal.md, "The kernel's boundary", whose sentences H.2 edits
first.

Behavior: the arguments of #47 give their angles or the domain error, and
`atan` and `atan2` are never refused for a radius.

### H.8 A name followed by `(` is only a call

In expr.ts, `unitAtom` takes a plain name only when no `(` follows it
directly. It does so by a lookahead that includes the name's own
continuation characters, so that the regular expression cannot back off to
a shorter name: `alt(call, map(plainName, leaf), parenthesized)`. A call
whose argument list fails is then not read again as a name before a
parenthesized factor. So a nested call with an error in it costs a
constant per level, where each level doubled the cost (#54). The
alternatives of `unitAtom` again begin with different tokens, as
ARCHITECTURE.md ("Parsing") requires.

A cut combinator in parser.ts was weighed. It would serve other grammars,
but a committed failure skips every enclosing `alt`, `optional` and
`many`, so a misplaced cut changes the meaning of valid input; the local
lookahead has no such failure mode. In the review, the lookahead parsed
203,000 fuzzed strings exactly as the current grammar does.

Tests: nestings of 20 levels (with an error inside, unclosed, and
`sin(asin(` repeated) each parse within 50 ms, as #54 asks, with today's
error, position and expectations; a balanced nesting parses; a definition
body with a broken call of 20 levels does the same.

Docs: ARCHITECTURE.md, "Parsing". Its sentence on the call rule goes, and
"first character" becomes "first primitive". The sentence that an operator
with nothing after it is "the one way an alternative fails after consuming
input" gains the call: one whose argument list fails has consumed its
text, and the alternatives after it fail at their first primitive, so
nothing is read twice.

Behavior: parsing is linear in the nesting of calls.

### H.9 Smaller reductions, then Lehmer's gcd

Three commits: two in rational.ts, which make #52's quotients fast (H.14
bounds their size), and one that moves the `^` exponent's reduction out
of the parser (#66).

The first commit reduces with the smaller gcds the operands allow, each a
textbook rule:

- a sum and a difference by Henrici's rule: the gcd of the denominators,
  then of that with the new numerator;
- a product by cross-cancellation, the gcd of each numerator with the
  other denominator, and a quotient as the product by the divisor's
  reciprocal (so the gcd of the two numerators and of the two
  denominators);
- an inverse or a negative power by swapping, with no gcd.

Stage 4 reduced every result with a full gcd on its unreduced parts. The
reciprocal of a reduced pair paid a gcd for nothing: the display's
reciprocal line doubled #52's conversion to 27 s, and `(7/3)^-20000` spent
its 130 ms there.

The second commit replaces Euclid's gcd with Lehmer's (Knuth's Algorithm
L). It takes steps on the leading word in doubles and applies the
cofactors to the bigints. It tracks the bit length as it goes, rather than
through `toString(2)` at each step, and still strips the common power of
two first. It is still quadratic, but about forty times cheaper in V8 at
65,536 bits: one gcd there took 686 ms and takes 19 ms, and the probe's
range operation took about 4.4 s and takes 0.11 s. A half-gcd, which is
subquadratic, gains only above `2^16` bits (about 1.6 times at `2^17`),
and is left for a larger limit.

The third commit takes the reduction of a `^` exponent out of the parser
(#66). The parser has no context, so it reduced the fraction of two
literals through Euclid's gcd at the hard bound, quadratic in their
length, on every keystroke: 80,000-digit literals took 14 s, and the
second commit's gcd makes that seconds, not milliseconds. The tree now
carries the exponent as the parser read it, `Exponent = { num: bigint;
den: bigint }` with `den` positive and the pair unreduced (a `Rational`
promises lowest terms, which the parser can no longer promise), and the
evaluator reduces it where the range limit applies, `reduceExponent(e,
maxBits)`: a numerator or a denominator past `maxBits` is `tooLarge` at
the power's span before any gcd runs, as D19 asks of what can be bounded
before forming, and the rest is `rational(num, den)` with the gcd of the
second commit, milliseconds at any setting. `dimensionOf` reduces the
same way under the build's context, since a dimension's exponent must be
in lowest terms. The parser's own rejections stay: a literal whose power
of ten cannot be formed within the hard bound, and a quotient by zero,
are read off the literals without a gcd.

Tests: agreement with the reduce-after formula, and reducedness, on seeded
rationals (zero, integers, negatives, integral results, large over small);
the gcd against a reference Euclid written in the test, at 1 to 4,000 bits
and across the switch to doubles, and on large pairs whose gcd is known by
construction; reducedness asserted over every constructor that bypasses
`rational()` and feeds the arithmetic (`scaleByPowerOfTwo`, fixed.ts's
`dyadic`, scaled.ts's `normalize` and `toRational`, the test generators),
since the smaller reductions are correct only for operands in lowest
terms, and a full reduction of the result no longer forgives a broken
invariant upstream; `2^(a/b)` with pseudo-random literals of 315,000
digits parses in milliseconds and is `tooLarge` at the default range
limit, and with 10,000-digit literals evaluates to its value. A
benchmark, bench/rational.bench.ts, reports the probe's operation, one gcd
and #52's quotients, and asserts only ratios within the run;
ARCHITECTURE.md ("Benchmarks") names it.

Docs: rational.ts's header says what each operation reduces with, that the
gcd is quadratic, and that the rules hold only for operands in lowest
terms, the invariant of `Rational`, with `rational` the one constructor
that reduces; expr.ts's header and ARCHITECTURE.md ("Expressions"), whose
exponent "travels in the tree as a `Rational`" no longer.

Behavior: none but speed, and a `^` exponent past the range limit refused
at the power rather than reduced for minutes. The range limit that
"Recommend limits" proposes rises, from 8,192 to 32,768 bits on this
project's cloud container. H.14 redefines the probe.

### H.10 The edge sweep

Tests only, in two commits: src/testing/edges.ts with
src/core/edges.test.ts at the ball level, and src/edges.test.ts at the
text level (both `*.sweep.ts` since issue #108, run by `pnpm test:sweep`), which joins src/units.test.ts in tsconfig.node.json's list so
that `pnpm typecheck` checks it. This is the fourth test pattern of "How
to read a task".

The ball level runs these operations:

- every built-in of `BUILTINS`, enumerated by arity, so that stage 6's
  functions join it;
- `addBalls`, `subtractBalls`, `multiplyBalls` and `divideBalls`;
- `powBall`, with `n` of `1`, `2`, `3`, `-1` and `10^30`;
- `rootBall`, of degrees 2 and 3, and `settle`.

It runs them over these classes of arguments, each exact and with a
relative radius of `1e-30`:

- zero, `±1`, a half and two, and the negatives of the classes below that
  are not symmetric;
- `1e-400`, `1e±20000`, `1e-400000`, `1e-999999999`, `1e-10^18` and
  `1e-(10^18 - 1)`;
- `1e19`, `1e400`, `5e10^18`, `9.99e10^18`, and a long all-nines mantissa
  at the top;
- a fraction mantissa at either edge, `1e10^18 / 3` and
  `1e-(10^18 - 1) / 3`; the second reaches both of #44's settle crashes,
  as `1e-10^18 / 3` does, and stays within the bound under D17, where
  `scaled()` refuses `1e-10^18 / 3` from H.13; and a mantissa of 25 digits
  near one;
- wide balls: `0 ± 1e9`, `0 ± 1e30`, `0 ± 1e948`, `5 ± 2e948`,
  `1 ± 1e-400` and `3e18 ± 2e18`, and the exact `1 + 1e-400`.

The radii at the bottom edge are built with `powerOfTwoRadius`, or H.4's
`powerOfTenRadius`, since `ball()` in src/testing/scaled.ts takes its
radius as a `Scaled` and `scaled()` refuses `10^-(10^18+30)`.

The binary operations take a subset of these as their second argument. The
operations that read the mode also run in decimal mode.

The text level runs `parseExpr`, `evaluateText` and `convertText` (into
`hr;min;s`, `time` and `ft;in` at both edges) in both modes, on every
issue's reproductions except #52's conversions, which H.14 tests, with
`show` and `roundTerms` called as unit-converter.ts calls them.

The oracle, per case:

- No throw.
- The case's time is reported, not asserted, since a per-case budget on
  a loaded runner is a flaky assertion; the deadline on the whole sweep
  below is what catches a hang.
- A refusal only where the decisions allow one:
  - `overflow` and `underflow` only when every value of the ball passes
    the bound, or, in decimal mode, when the rounded value does (D17:
    `99999999999e999999999999999990` and the all-nines class are
    `overflow` there), decided by exact bigint exponents near `±10^18`,
    never by doubles;
  - `tooLarge` only at the documented sites;
  - a domain error only for a ball outside the domain throughout, as
    docs/builtins.md has it.
- On a value:
  - the midpoint is zero or has a decimal exponent within `±10^18`, and
    `|mid| + rad` is below `10^(10^18+1)`, both compared exactly, save a
    ball that `settle` truncated at the top in exact mode, whose added
    whole unit takes it to that edge (D17); a radius below `10^-(10^18)`,
    and a ball that reaches below the bottom edge or surrounds zero, are
    allowed, as H.13 computes them;
  - the ball contains the known value at known points: `sin(0)`, `exp(0)`,
    `ln(1)`, `pow(1, y)`, `pow(x, 0)`; `approx(x)` contains `x`; a sum or
    a product contains its exact result where that can be formed;
  - the range facts hold by intersection: `|tanh| <= 1` within the radius,
    `acos` in `[0, pi]`, `exp` positive.

Known violations are a table of patterns keyed by issue. Each test fails
on a violation the table does not list, and on a listed one that no longer
occurs, so that the task that fixes an issue deletes its entries and no
fix is silent. Node's `todo` is not used, since a passing `todo` is silent
and a failing one prints its stack on every run.

node:test's `timeout` neither interrupts nor fails a synchronous test, so
it cannot stop a computation that hangs. Instead the cases run in a
`Worker`, with an overall deadline of tens of seconds, since `node --test`
runs the files in parallel; the deadline fails the run and names the case,
and a hang already known when the sweep lands is matched by a predicate
and not run. The whole sweep stays within a few seconds: a prototype ran
6,437 cases in 3.2 s.

Docs: ARCHITECTURE.md gains a paragraph on the sweep.

Behavior: none; tests. It lands after the decisions, which its oracle
encodes, and best after tier 1, so that its table holds only what tier 2
fixes and the parallel pull requests of tier 1 do not all edit it.

### H.11 `settle` returns a `Result`

Two commits. The first is a refactor with no change in behavior, moved
here from H.13 so that H.12 and H.13 build on the final shape:
`BallError`'s `unresolved` carries its edge, set at every producer, and
the three consumers that assumed zero pass it on: `fromBallError`, and
the evaluator's power case and its `locate`. The compiler would not have
flagged those three.

The second: `settle` (ball.ts) returns `Result<Ball, BallError>`, and
`settleQuantity` (quantity.ts) returns `Result<Quantity, BallError>`. Its
check is D17's from the start, on the rounded midpoint's decimal
exponent against `±10^18`, one comparison, so that no pull request leaves
`main` refusing a value within the bound; H.13 then brings `scaled()` to
the same rule, and the check `settle` makes stays as it is. In decimal
mode `1e-1000000000000000000 / 3` is `underflow`, rightly, its value
`3.3 × 10^-(10^18+1)` being past the bound, where it threw. In exact
mode, where `settle` acts only on a carry past the top,
`1e-1000000000000000000 / approx(3)` (#44's first row) is shown as
`≈ 3.3333333e-1000000000000000001` from H.11 until H.13 refuses the
quotient, whose own check is `scaled()`'s.

In decimal mode:

- A rounded midpoint past the bound is `overflow` (at the bottom,
  `underflow`, until H.13). Stage 4 let it through silently:
  `99999999999e999999999999999990` was shown as
  `≈ 1e+1000000000000000001`.
- The radius grows by the exact difference, formed by
  `radiusOfMove(to, from)` as a subtraction at an offset exponent. Stage
  4's subtraction could not align below the bound and threw (#44's decimal
  row). A bound on the difference from `powerOfTenRadius` would cost a
  certified digit: `1/3` would certify seven of eight.

In exact mode `settle` stays total, as a bound on size must:

- A rounding to nearest that would carry past the top of the bound rounds
  toward zero instead, and adds a whole unit to the radius (D17).
- `halfUnitOf` takes its radius from `powerOfTenRadius`. It formed the
  half unit as a checked `Scaled` and threw (#44's first row).

The callers:

- `addBalls` and `powBall` return the error.
- The evaluator locates it at the node
  (`locate(settleQuantity(…), span)`).
- The table's lookup asserts, since a unit is within the bound.
- The kernel benchmark unwraps.

Tests:

- `99999999999e999999999999999990` in decimal mode is `overflow` at the
  literal.
- `1e-1000000000000000000 / 3` in decimal mode is `underflow`.
- `approx(9.99…9e1000000000000000000) / 7`, with forty-five nines, is a
  value in exact mode.
- `1e-999999999999999999 / approx(3)` in exact mode is
  `≈ 3.3333333e-1000000000000000000`, where `halfUnitOf` threw.
- `radiusOfMove(12345679e-1000000000000000007, 1234567891e-1000000000000000009)`,
  both built without `scaled()`, is at or above their difference,
  `9e-1000000000000000009`, and below `1e-1000000000000000008`.
- ball.test.ts's eighteen calls of `settle` unwrap.
- The edge on `unresolved`: every producer's edge, and the three
  consumers pass it on (a test each, on the first commit).

Docs: `settle`'s doc and ball.ts's header; docs/decimal.md, "The decimal
mode".

Behavior: a settled midpoint past the top of the bound is refused in
decimal mode and truncated in exact mode, where it threw or was shown.

### H.12 Unit lists report refusals

`decompose` (convert.ts) returns a `Result` over its quotient, product and
difference whose error is a `Refusal` or `BallError`'s `unresolved`, and
`convertToList` fails with a `UnitListError`, a `Refusal` or that
`unresolved`, so that neither changes shape when H.13 applies D18. The
pipeline's two list conversions pass the refusal on as the conversion's,
and the build's list check asserts against it. A count other than the last
whose ratio falls below the bound, or from H.13 is `unresolved` at its
bottom, is exact zero (D8, as clarified), so `1e-999999999999999999 s`
into `hr;min;s` is `0 hr + 0 min + 1e-999999999999999999 s`. Any other
`unresolved` is passed on, and from H.13 the pipeline reports it as the
converter's retried variant (`approx(1e1000000000000000000) m` into
`dm;cm`).

`roundTerms` stays total, since the display calls it:

- Its rounding's shift comes from `radiusOfMove`. A subtraction below the
  bound threw there in the display: `1e-999999999999999999 m` into
  `ft;in`, in both modes.
- When any step of rebuilding the total from the rounded terms fails (the
  product, the sum or the second decomposition), it returns the terms
  uncarried, which still contain `have`. A step fails with a refusal, or,
  once H.13 applies D18, with an `unresolved` at the bound: for the inputs
  below, the rebuilt total or its count of the first unit straddles the
  top.
- `settled` stays, for `nearestInteger` alone.

Stage 4 threw on every such refusal; #43 marked the sites.

This also covers three defects no issue listed:

- `3^32767 m` into `ft/7^21845; in/7^21845` threw at an ordinary size,
  since the settled count's exponent left a remainder that could not
  align (#58).
- `3047999999999999999999999999999999996953e999999999999999961 m` into
  `ft;in`, within the bound, throws in `roundTerms`. This is #48's first
  constraint, in a form D17 does not refuse where it is typed.
- `9.99999999999e1000000000000000000 m` into
  `1e1000000000000000000 m; 1e999999999999999990 m` is shown
  `≈ 9 × 1e1000000000000000000 m`, certified, dropping a tenth of the
  value. The carry's rebuilt total passes the bound and `addBalls` absorbs
  it (#48's class). It shows the uncarried terms once H.13's commit for
  #48 makes that sum `unresolved` at the bound: its ball,
  `10 × 1e1000000000000000000 m` within the rounding's shift, straddles
  the top (#59).

Tests:

- #44's list rows: into `hr;min;s`, into `time`, and into the two units
  `1e-999999999999999998 m; 1e-999999999999999999 m`, which is `overflow`.
- The three inputs above.
- A list at the lower edge: `1e-999999999999999999 m` into `ft;in` is
  `≈ 3.9370079e-999999999999999998 in` in both modes, where the display's
  rounding threw. `1.234567891e-999999999999999999 m` into `m;mm` is
  refused where it is typed until H.13, and moves to H.13's tests.
- messages.test.ts for a list's refusal.

Docs: convert.ts's header, the comments that name #44 and #48, and the
`#52` clauses in `decompose`'s and `settled`'s comments (`ConvertError`'s
sentence that a quotient is not held to the range limit stays until H.14);
ARCHITECTURE.md, "Unit lists".

Behavior: a unit list's refusal is an error, and the display's rounding
never throws.

### H.13 The exponent bound is on the value

Two commits, each green alone; the refactor that put the edge on
`BallError`'s `unresolved` is H.11's first commit.

The first commit lands D17 and D18's rule for the arithmetic together,
since either alone regresses.

- `scaled()` checks the decimal exponent inside D17's band, with a fast
  path for an integer mantissa's digit count. `parseDecimal`'s check of
  the exponent as written goes, and so does `pow`'s canonical pre-check.
  The check that `settle` imports takes the new body.
- `multiplyBalls` and `divideBalls` apply D18 when an operand is inexact
  (#60):
  - a midpoint past the bound is `overflow` or `underflow` only when the
    whole ball is past: `|mid| - rad` at or above `10^(10^18+1)`, or
    `|mid| + rad` below `10^-(10^18)` with the ball excluding zero.
    `powerOfTenRadius` decides first. Within its slack, which no pass
    narrows, the exact distance of `|mid|` from the power of ten decides
    against the radius; that distance is formed from the midpoint's
    digits, which align with the power. The last bullet's `|mid| + rad`
    against the top is decided the same way, so that
    `approx(9.99999999e1000000000000000000) m` stays a value and
    `approx(1.000000001e1000000000000000000) * 10` is `overflow`;
  - a ball containing zero whose midpoint passes below is zero within
    `|mid| + rad`;
  - anything else is `unresolved` at `bound`, and so is a result whose
    `|mid| + rad` passes the top. A ball of unbounded radius keeps its
    convention: its midpoint alone is held to the bound, and the result's
    radius stays unbounded.
- The check `settle` makes (H.11) is unchanged, being D17's already; the
  constructor now agrees with it.
- `Edge` gains `"bound"`, worded "the point where the result passes the
  exponent bound". messages.ts stops quoting an edge as a number when it
  is a name.
- The evaluator locates a quotient's `unresolved` at the bound at the
  whole quotient.
- The converter reports a ratio `unresolved` at the bound as its own
  variant, which is retried and worded, where it mapped every `unresolved`
  to `unresolvedWant`. The unit lists do the same: `decompose` passes on
  an `unresolved` at the bound from its quotient, product or difference as
  it passes on a refusal, the pipeline's list conversions report it as
  that retried variant, and `roundTerms` falls back to the uncarried terms
  on it as it does on a refusal. `atan2`'s `quotient` (inverse-trig.ts)
  threw on anything but a refusal, and now passes it on through
  `fromBallError`.
- `powRationalBall` falls through to log space on a bound `unresolved`
  from `powBall`, as it does on a refusal.

The second commit is #48. `addBalls` takes its settle-first path only on
`tooLarge`, an alignment, and applies D18 to a sum past the bound, and to
one whose `|mid| + rad` passes the top, as a product does.

Tests:

- #50's literals: `0e2000000000000000000` is zero, and
  `10e-1000000000000000001` and `1000e-1000000000000000002` parse.
- Literals whose verdict flips each way: `12345678e-1000000000000000007`
  parses, and
  `3047999999999999999999999999999999996953e999999999999999978` is
  refused.
- `1e1000000000000000000 / 3 * 10` is `≈ 3.3333333e+1000000000000000000`,
  and `1e-1000000000000000000 / 7` is `underflow`.
- #44's first two rows are `underflow` at the quotient.
- `ln`, `log10`, `asinh`, `acosh` and `pow(x, 0.3)` of
  `1e1000000000000000000 / 3 * 10`, and `ln`, `sqrt`, `cbrt` and
  `pow(x, 0.5)` of `12345678e-1000000000000000007`, are values, where
  `lnScaled` and `positiveRoot` would have thrown on the newly admitted
  values without H.4.
- `1.234567891e-1000000000000000000 * 1` in decimal mode certifies eight
  digits, and `1.234567891e-999999999999999999 m` into `m;mm` is a value
  (H.12's list at the lower edge).
- The arithmetic keeps its values:
  - `(approx(9999999999999999999999999999510000000000000000) - 9999999999999999999999999997310000000000000000) * 4e999999999999999982`
    stays `≈ 8.8e+1000000000000000000`, and the same times
    `3e999999999999999982`, plus `3e1000000000000000000`, stays a value;
  - `approx(1/3) * 3 * 1e-999999999999999990 - 1e-999999999999999990` is
    zero within a bound;
  - `5e1000000000000000000 * (approx(1e5000) - approx(1e5000))` is
    `unresolved` at the bound, where it was zero within
    `3e+1000000000000000952`.
- #48's exact row, `5e1000000000000000000 + 5e1000000000000000000`, is
  `overflow` in either mode. Its `approx` row is `unresolved` at the
  bound, not the `overflow` the issue asks for: the ball of
  `approx(5e1000000000000000000)` reaches back within the bound, and D18
  refuses only when the whole ball is past. The midpoint sits on the
  bound at every precision, so the retry loop ends with the `unresolved`
  message, as `1 / (approx(1) - 1)` does (decided with the owner at the
  review of H.13; a refusal on the midpoint is the one rule that can be
  wrong, and the two words for one idea were weighed under D18). Its
  second constraint,
  `1e999999999999999980/3 + approx(333333333333333333333e999999999999999980)`,
  is `≈ 3.3333333e+1000000000000000000`, and H.12's list inputs show their
  uncarried terms.
- `pow(10, approx(-999999999999999990.5))`, refused as `underflow`, is a
  value.
- scaled.test.ts's tests of `log2Bounds` at the canonical extremes, of
  `0e99999999999999999999999`, and of `1.5^5678870000000000000` (now
  `tooLarge`) change.

Docs: docs/decimal.md, "The exponent bound" and "Which limit a refusal
names", whose examples reverse; ARCHITECTURE.md, "Numbers", rule 1 of
"Precision and rounding", "Size limits" and "Formatting"; the headers of
scaled.ts and ball.ts; messages.ts's comment on the literal's message.

Behavior: the bound is on the value. A value within it is never refused
for its representation, and a ball that straddles it is retried. It is
best landed after H.2, so that `exp` of a newly admitted tiny literal does
not throw.

### H.14 Exact results are held to `maxBits`

The check of D19 runs in `evaluate()`'s wrapper, on the settled result,
and after the pipeline's ratio and a function want's count. The exponent
bound is checked first, and no signature changes. Its action is D20's:
the node is refused, `tooLarge` at its span, and messages.ts words it
with the remedy, `"3^32767 * 7^21845" is too large to hold exactly within
Most bits: write "approx(3^32767)" in place of "3^32767" to compute it to
the digits asked, or raise Most bits.` (the message keeps the panel's
label, "Most bits", which is what the user sees; the setting is `maxBits`
in the code; the remedy is `approx` around the node's first operand,
whose span the error carries, since `approx(3^32767 * 7^21845)` is
refused at the product before `approx` sees it, as H.14 found), where
the range limit's other refusals (a
literal, a sum's alignment, a power's prediction, the kernel's reach)
keep their wording, since `approx` is not their remedy in the same way
(a literal is exact by being typed, and the kernel's reach is not a
matter of exactness). The conversion's ratio and a function want's count
are worded the same way about the pair. Saying how many bits the result
needed is #73, which extends this message after it lands.

The range probe (limits.ts) times the costliest exact operation the limits
still run: a product of two fractions of `bits` bits in each part, whose
two cross-cancelling gcds (H.9) run before its result is measured and
refused, with its operands built outside the timed call. It timed a
product of that size with three gcds, the last on the full product.
`DEFAULT_MAX_BITS` stays 65,536, at which that operation takes about two
of H.9's 19 ms gcds.

Tests:

- `3^32767 * 7^21845` is `tooLarge` at the product.
- `3^32767 / 7^21845` is `≈ 4.6288093e-2828` within 50 ms, and
  `3^32767 / 7^21845 / 11^16383` is `tooLarge` at the second quotient.
- The products of ten and of twenty powers, and #52's conversion, are
  `tooLarge` within 50 ms, with the message naming the node.
  `approx(3^30000) * 7^20000 * …` is a value.
- `1/3^32767 + 1/7^21845` is `tooLarge`, and `x / x` for a large `x` is
  one.
- `(1 + 1/(3^30000 * 3^11300)) + sqrt(2)` at 32 digits keeps its digits.
- `asin`, `acosh` and `atan2` of large exact arguments are unchanged.
- Every repro is a value in decimal mode.
- A product past both limits is `overflow`.
- The shipped definitions build at `MIN_MAX_BITS`.
- `3^25000/7^14000 m` into `11^15000/13^14000 ft`, whose two sides are
  within the limit, is `tooLarge` at the conversion's ratio, where it was
  a value after 3.7 s.
- `2^-30000` and `1/2^30000`, whose canonical numerators have 69,658 bits,
  are `tooLarge`, and `2^-28000` stays a value (D19, by the measure of
  D16 as restated once more).
- messages.test.ts: the refusal names the node and the remedy, and the
  remedy works: `approx(3^32767) * 7^21845` is a value, where
  `approx(3^32767 * 7^21845)` is refused at the product.

Docs:

- ARCHITECTURE.md: "Size limits", whose constant-factor argument goes, and
  rule 1.
- docs/calculator.md's "Memory", which says exact growth is already
  bounded.
- docs/decimal.md, "The range limit, restated".
- README, "Most bits": already says what is counted (the bits of what is
  stored, fives for a dyadic's twos) and what the app does at the limit,
  as D16 and D20 have it; this task removes its "not yet" on products and
  quotients. README's `approx` paragraph: products and quotients join
  sums and powers, and a sum's growth joins its alignment.
- The comments on the default in context.ts and limits.ts, and
  system-build.ts's header.
- scaled.ts's header sentence that the range limit's reasoning allows the
  canonical form's growth.
- The comments that name #52 (see the list above).

Behavior: an exact result past Most bits is refused at the node that forms
it, and `approx` lifts the refusal. "Recommend limits" recommends from the
new operation.

An optional follow-up commit brings `pow`'s own prediction into agreement
with the check, bounding each component of a negative power. Today
`2^40000` is refused while `2^20000 * 2^20000` is a value.

### H.15 One guard for the exponential and the powers

One classifier in ball.ts works on an interval `[L_lo, L_hi]` that bounds
the natural logarithm of the result's magnitude. `U = (10^18 + 1) ln 10`
and `D = -10^18 ln 10` are D17's edges, taken from the memo of `ln 10` at
the working bits plus a margin. `m` is a margin covering the kernel's
error and half a unit of the working digits. The classifier returns:

- `overflow` when `L_lo >= U` is certified;
- `underflow` when `L_hi < D` is certified;
- compute when `D + m <= L_lo` and `L_hi < U - m`;
- `unresolved` at `bound` otherwise.

The coarse bounds decide first: `log2` of radii and, near one, the exact
difference from one. Only within their slack is the interval formed on the
kernel, so an exact argument is left `unresolved` only when it lies within
the ceiling's precision of an edge, never for the coarse bounds' slack.

Each site has its own `L`:

- `expBall`: `x`.
- `sinhCosh`: `|x| - ln 2`, widened by the working ulp on each side
  (`ln |sinh x|` lies below `|x| - ln 2` by about `e^(-2|x|)`, and
  `ln cosh x` above it by as much), against the top edge alone.
- `powLogSpace`: `y ln x`, classified before `lnScaled` is asked for the
  bits that `y`'s size needs, taken from `log2OfRadius` of `y`'s magnitude
  (`radiusBound`, which it used, is infinite past about `2^1030`). When
  `|L|max`, the bound on `|y ln x|`, is below `2^-bits`, the result is one
  within `2|L|max`, without the kernel. When the bits it would need pass
  the range limit, the answer comes from its bound, or is `tooLarge`.
- `powBall`: `n ln |b|`, taken at the midpoint alone for a ball of
  unbounded radius, as `log2Scale` took it, with three special cases:
  - a base whose ball contains zero is tested against the top edge alone;
  - a negative power of such a base is `unresolved` at zero;
  - a band case is decided on the interval, not by the squaring loop's
    midpoint, and a zero midpoint's power takes its radius from `log2` of
    the radius times `n`, not by squaring.

`floatingToBall` (digits.ts) classifies its `t`'s interval too, and
handles its own rounding's carry at the top (#61). `expFits` and
`log2Scale` go. `pow` locates a bound `unresolved` at the argument whose
radius contributes more to `y ln x`. `powBallOf`'s refusal of an exact
exponent it cannot form went by an inexact base's midpoint:
`pow(approx(1), 1e999999999)` was `tooLarge`, and
`pow(1 + (approx(1/3) - 1/3) * 1e20, 1e999999999)`, whose value is one,
was `underflow` (both added to #46). For an inexact base the classifier
decides it, and both are `unresolved` at the bound (a test each). Where
the classifier would compute, the refusal stays `tooLarge`, which H.16
lifts.

What stage 4's guards got wrong:

- They refused on the whole ball's magnitude, in doubles, so a radius
  alone refused `exp` (#40).
- `powBall`'s absolute slack of `10^-9` on `|log2|` refused a base of
  magnitude one past `n ≈ 3.3 × 10^27` (#46's first row).
- `powLogSpace` refused an exponent a double cannot hold before it looked
  at `ln x` (#46's third row).
- The slack of the doubles and of the 30-bit radius refused values within
  `10^9` decades of the bound (#61): `exp(-2302585092994045000)`,
  `approx(1e499999999900000000)^2`, and
  `(1e-999999999999999999 * (1 + approx(1e-30)))^-1`, where `1 / (…)` is a
  value.

A rule on the midpoint would be wrong too. It would refuse
`exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` for good, since its first pass
puts the midpoint past the edge though the argument is `1.5e18`.

Tests:

- #40's text at 32 digits is `≈ 148.41316`, and its `sinh`, `cosh` and
  `pow(2, …)` forms are `≈ 74.203211`, `≈ 74.209949` and `≈ 32`. #46's
  rows 1 and 3 give their values.
- `exp(approx(1e999))`, `approx(1.0000001)^1e30` and
  `pow(2, approx(1e400))` stay refused.
- `exp(2302587288910310144)` is `overflow`.
- `exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` and
  `(10 + (1e40 - approx(1/3) * 3e40) * 1e-20)^1e18` are values.
- `pow(1 + (approx(1e-999999999) - 1e-999999999), approx(1e999999999))`
  neither throws nor hangs. The near-one bound admits it, and without the
  cap on the bits it would.
- `(sqrt(2)^2 - 2)^2` stays a zero, and
  `(approx(1e20) - approx(1e20))^1e100000` is quick where it took fifty
  seconds (#62).
- The refusals within `10^9` decades of the bound are values.
- ball.test.ts's test of the midpoint rule expects `unresolved`.
- In decimal mode an `unresolved` at the bound is final.

Docs:

- README, "Very large results and `approx`": the refusal needs the whole
  argument past the edge, and #40's workaround goes.
- docs/approximate.md: "Two axes" changes, and "A related gap" goes.
- docs/builtins.md: "The rules every built-in follows", whose result past
  the bound "is refused before anything is computed", and "The limit on
  large results", which names `expFits`.
- docs/decimal.md: "The exponent bound", whose kernel guard refuses on the
  whole ball's magnitude; "Which limit a refusal names"; and "Decision:
  the bound stays" and "The kernel's boundary", which name `expFits`.
- docs/approximate.md, "What raising the bound would take", which names
  `expFits` and says `unresolved` speaks of an edge.
- fixed-exp.ts's header, which names `expFits`.
- README's edge for `exp`, `10^18 ln 10`, which becomes
  `(10^18 + 1) ln 10` at the top.
- ARCHITECTURE.md's rule 2.
- The headers of exp.ts, hyperbolic.ts, ball.ts, pow.ts and digits.ts.

Behavior: the exponential family and the powers are refused only when
every value of the argument passes the bound, and retried when some do.

### H.16 `pow`'s exponent past `maxBits`

`pow` forms an exact exponent as a fraction within the range limit, and
refuses one it cannot form, as documented: `pow(2, 1e-999999999)` is
`tooLarge`, though its value is about one, while H.2 makes
`pow(2, approx(1e-999999999))` a value. That is the asymmetry D17 exists
to remove, whether a value is held depending on whether it is exact, so
this task is adopted rather than optional, and lands after H.15, whose
classifier it needs. It sends such an exponent to log space where H.15
leaves it `tooLarge`: for an exact base, where `powerRefusal` does not
put the power past the bound, and for an inexact base, where H.15's
classifier would compute it. `powerRefusal` reads the base's midpoint
alone, so for an inexact base the classifier's refusals and its
`unresolved` stand:

- a base positive throughout goes through `powLogSpace`;
- a base negative throughout follows H.6's parity rule;
- a base reaching zero keeps what H.15 gives it.

It closes the rows of #46 that H.6 and H.15 leave: a power whose
exponent cannot be formed but whose value the classifier can bound.
Landed before H.2, H.6 and H.15, it would turn `pow(2, 1e-999999999)`
into a crash and `pow(approx(1), 1e999999999)` into a wrong `overflow`,
which is why it is last.

Tests: `pow(2, 1e-30000)`, `pow(2, 1e-999999999)` and
`pow(0.5, -1e-30000)` are `≈ 1`; `pow(-2, 1e-30000)` is the even root of a
negative number; `pow(2, 1e999999999)` stays `overflow`; pow.test.ts's two
tests that pin the refusal change.

Docs: pow.ts's header; docs/builtins.md.

### H.17 The phase as it landed

Docs only. A record of each task, in the manner of "Stage 4 as it landed",
with the issues each closed. The tasks above stay as they were written.

## Stage 5: the rational display

Firm from its design note. 5.0 was written after the hardening phase
landed (docs/fractions.md) and the stage revised against it: D21 added,
the rule of "The rule" there in place of the four open questions below,
`fraction: true` on the `exact` kind in place of `needsParentheses`, the
setting named "Show reduced fractions", the fit rule marked provisional
(#91), and the reciprocal line's holes filed apart (#92) rather than
fixed here.

### 5.0 Design note

docs/fractions.md: the rules of feature 7, and the size at which an exact
value's fraction gives way to the decimal display (`1e+999999999` is
exact and short; its digits are not).

Written after the hardening phase, from D17. The note settles the four
questions this task carried, and one more:

- A display length that does not depend on Most bits. Values legal under
  the range limit already run to 15,634 digits (`3^32767`), and far more
  at a raised limit, so the range limit is not a display rule. The rule:
  a fraction is written when its numerator and its denominator each fit
  within the Digits setting; provisional, studied after the stage (#91).
- A third outcome, beside the fraction and the exponent notation for a
  short mantissa with a large exponent: an exact value too long to write
  as a fraction falls back to the decimal display, which says `=` where
  its own rule allows (`= 1.5e-999999999`) and `≈` otherwise
  (`≈ 3.4867844e+9` for `3^20` at eight digits). The two outcomes are one
  rule, the fallback.
- Every literal it writes parses back under D17. It writes the value's
  decimal exponent with a normalized mantissa, never the canonical
  `exp`; a fraction is a quotient of two literals within Digits. The one
  exception, a value at the exponent `10^18` whose rounding carries it to
  `1e+1000000000000000001`, is written as the rounding mode gives it and
  refused when typed back, which the note argues is right.
- A zero's bound below `10^-(10^18)`, which today is written with every
  digit of its exponent, 100,004 of them for
  `(approx(1e20) - approx(1e20))^1e100000` (#67), is written as
  `1e-1000000000000000000`, larger than any such bound and so still
  sound, the shortest the display can write, and it parses; 5.1 lands it
  in `zeroBound`. At the top edge such a ball is `unresolved` before the
  display sees it (D18).
- What a fraction is in decimal mode, where every result is rounded to
  the digits asked and a rounded value with those digits or fewer is
  exact: `1/4` at eight digits is `= 1/4`, `2.54 cm` is `= (127/50) cm`,
  and `1/3` is `≈ 0.33333333`, the rounding having made it inexact; the
  flag changes nothing else there.
- Which exact values become fractions (D21): every one that is not an
  integer, `2.54` included, when it fits; an integer as the decimal
  display writes it; an inexact value as a decimal, always.

### 5.1 `show` with fractions

`display.ts`: a `fractions` argument; an exact ball is written as the
decimal display writes it when it is an integer, as its fraction in
lowest terms when it is not and the numerator and denominator each fit
within `digits` (recovering the ordinary fraction from the `Scaled` form
of D13 through `toRational`), and by the decimal display otherwise; the
`exact` kind carries `fraction: true` when its text is a fraction, so
that the component can parenthesize it where a unit or the reciprocal's
`×` follows; an inexact ball is written by the decimal display as
today, whatever the flag; and `zeroBound` writes a bound whose decimal
exponent lies below `-10^18` as `1e-1000000000000000000` (#67), which
closes it.

Tests: 1.9's restated under the flag (`127/50` at eight digits is
`= 127/50`, `1/3` is `= 1/3`, `sqrt 2` is `≈` with its decimal at any
digit count, `2 ± 0` from `sqrt(4)` is `= 2`); the fit at the edge
(`1/10000000` at eight digits, `= 1e-8` at eight for `1e-8`, `5000/127`
at three digits is `≈ 39.4`, `3^20` at eight is `≈ 3.4867844e+9` and at
ten `= 3486784401`); the fallback exact (`1.5e-999999999` is
`= 1.5e-999999999`) and inexact (`(1/3) * 1e30` at eight is
`≈ 3.3333333e+29`); a negative fraction (`-5000/127`); the flag off
leaves every kind and text as today; #67's three rows, the bound written
in a bounded length and the reproduction's line short; and the decimal
mode rows above through the pipeline.

Behavior: none until 5.2 passes the flag; with it, an exact non-integer
that fits is a fraction with `=`.

### 5.2 The UI

The setting, "Show reduced fractions", a checkbox, `false` by default,
the sixth field of settings.ts, stored and validated as the others are
and not part of the `NumberContext`; the component's property beside the
context, passed to `show` for every term; the parentheses before a unit
(`= (5000/127) in`, `(-5000/127) in`) and before the reciprocal's
`× 3 ft`, none for a dimensionless value or a function line's argument
(`tempF(493/5)`); a unit list's remainder as a fraction, as in
`1 m = 3 ft + (428/127) in`; README's
"Settings" bullet with the example lines, and ARCHITECTURE.md ("The
display rule") the rule and the kind.

Tests: the settings field (parsed, defaulted, saved); the component's
lines through the pipeline, in both modes, with the flag on and off,
including the parenthesized, bare and list cases and the reciprocal
(`in = (1/36) × 3 ft`).

## Stage 6: the exact functions, then the Gamma and Beta families

Firm from its design note. 6.0 was written after stage 5 landed
(docs/special.md) and the stage revised against it: D22 added; `div`
added beside `mod`, `floor` and its kin on plain numbers, `round` to
decimal places with no mode argument, and the factorials' refusal
worded as their own (6.1); `gamma`'s propagation on balls rather than
through `digamma`, and the classifier on `lgamma` as its guard (6.2,
6.3); the names and exact cases of the incomplete functions (6.5 to
6.7); README's list per task rather than at the end (6.9). Each
function is a task with the four test patterns, the edge sweep taking
it from the map of built-ins. After 6.7 landed the owner deferred 6.8,
the rest of feature 3, so as not to hold the rest of the calculator on
eight functions wanted less than stage 7; it is no longer part of this
plan, and issue [#115](https://github.com/bsidhom/pwa-units/issues/115)
holds its functions with the context to take them up later, one
sub-issue each. The exact functions come first (D14). The
stage follows the whole of the phase before stage 5: its functions
enter the kernel through that phase's door (H.2), are guarded by its
classifier where their results can pass the bound (H.15), and the
factorials predict their size under D19.

### 6.0 Design note

docs/special.md: the dimension rules of the exact functions (`abs`,
`sign`, `div` and `mod` take quantities, `abs` and `mod` keeping the
dimension; `floor`, `ceil`, `trunc`, `round`, `gcd`, `lcm`, `factorial`,
`binomial` and `doublefactorial` take plain numbers), `round(x, places)`
to decimal places in the context's mode, floored `div` and `mod` as one
definition, non-negative `gcd` and `lcm`, `floor` and its kin on a ball
straddling a cell's boundary (`unresolved` at it), the integer
functions' refusal of an inexact argument and their size prediction
from Stirling's formula, and for the Gamma family the algorithm per
function and the bound it owes. Written; D22 records the rulings.

### 6.1 The exact functions

`abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `div`, `mod`, `gcd`,
`lcm`, `factorial`, `binomial`, `doublefactorial`, in one module
(`builtins/exact.ts`) since they share the integer checks and `floor`
on a ball, each exact on exact balls, and on an inexact ball either exact
where the interval decides (`floor` of a ball inside one integer's
cell) or `unresolved` at the boundary it straddles; `sign` `unresolved`
at zero; the integer functions refusing an inexact argument as a
`domain` error (`notExact`) and a non-integer as another (`notInteger`);
`factorial`, `binomial` and `doublefactorial` predicting their bits
from Stirling's formula and refusing past `maxBits` with a `tooLarge`
worded as their own, the remedy being Most bits. `round` is the first
built-in with a range of arities, one or two; the sweep's builder
enumerates each. Three domain reasons in builtin.ts, worded in
messages.ts.

Tests: the four patterns per function; the identities `a = b × div(a,
b) + mod(a, b)` over signs and over quantities, `mod(-7, 2)` is `1` and
`mod(7, -2)` is `-1`; `round(2.5)` under each mode, `round(1234, -2)`,
`round(3.14159, 2)`; `floor` of `(2^(1/2))^2 - 2` `unresolved` at zero
to the ceiling, of `sqrt(2)` exactly `1`; `gcd(-6, 4)` is `2`,
`lcm(a, 0)` is `0`; `factorial(20000)` refused at the default with its
message, `factorial(5000)` a value; `binomial(5, 7)` is `0`; a
dimensioned `floor` the dimension-rule error; the sweep's rows. README
("Functions in expressions") and docs/builtins.md ("Names") gain them.

### 6.2 `digamma`

The Bernoulli numbers (`bernoulli.ts`, exact rationals from the tangent
numbers, memoized by count; their ratios in fixed point since #117,
`bernoulli-ratios.ts`), the recurrence up to the shifted argument
and the asymptotic series with its remainder bounded by the first
omitted term, the reflection for negative arguments, the poles as
`domain` errors and a ball across one `unresolved` at the pole; on
balls throughout (D9). No exact case.

### 6.3 `gamma` and `lgamma`

`lgamma` by the shift and Stirling's series with the same bound, the
reflection, the poles; `gamma` as its exponential with the sign, an
exact integer whose factorial fits Most bits exact, one that does not
the kernel's value (the factorial refusal's remedy), and the classifier
on the `lgamma` ball as the guard at the exponent bound; propagation by
running on balls, so `gamma` does not depend on `digamma`. The cost at
the default ceiling measured and recorded in docs/calculator.md against
the study's estimate.

### 6.4 `beta`

Through `lgamma` under the classifier; exact for positive integers
within Most bits; a pole of `Γ(a + b)` alone exactly zero.

### 6.5 The incomplete gamma functions

Lower by the series on balls with the tail bound, upper by the continued
fraction with the region rule as mpmath documents it, the regularized
forms through `gamma`; the names `lowergamma`, `uppergamma`,
`lowergammareg` and `uppergammareg`, lower case, saying which function
and whether regularized, as the note rules. Until
the continued fraction's bound is written, the upper form returns an
unbounded radius, which the display shows as the study describes.

### 6.6 `erf` and `erfc`

As `lowergammareg(1/2, x^2)` and `uppergammareg(1/2, x^2)` with the sign
handling, `erfc` from the upper form where `erf` is near one, the exact
cases at zero, and the
classifier on `-x^2` at the exponent bound.

### 6.7 The incomplete beta function

The continued fraction with the symmetry, its bound, `incbeta(a, b, x)`
and `incbetareg(a, b, x)` (the latter `I_x(a, b)`), and the polynomial
exact case for integer `a` and `b`.

### 6.8 The rest of feature 3, deferred

Deferred after 6.7 landed, by the owner's decision not to block the rest
of the calculator on it, and no longer part of this plan; issue
[#115](https://github.com/bsidhom/pwa-units/issues/115) holds the
functions and the context to take them up later. 6.9 and stage 7 do not
depend on it.

### 6.9 Stage 6 docs

docs/special.md's implementation notes gathered; the payload measured
and recorded in docs/calculator.md against its estimate; this plan's
record of the stage, with 6.8's deferral noted wherever the plan speaks
of it. README's list of built-ins grows with each task, not here.

## Stage 7: the user-function extensions

Provisional, and revised before 7.0 against D23 and D24, which came out
of the owner's review of the syntax options. The tasks change as
follows:

- The bracketed form gives way to signatures and `~` lines.
- The optional declaration and the optional inverse come with the new
  form in 7.1, rather than after several parameters.
- Dimension-generic parameters join as 7.3.
- Range bounds fold into the domain of the inverse in 7.4.

### 7.0 Design note

docs/functions.md rewritten for D23. It covers:

- the grammar of a head and of a `~` line;
- the scope of annotations;
- the conformance of an argument to its annotation;
- the inferred result and the check of an annotated one;
- the want through `~f`, and the error when there is none;
- the radius and its caveats, after D24;
- the spelling of a dimension-generic parameter;
- the syntax of domain bounds.

It also covers D23's rulings: annotations as checks of dimension that
change no value, with the BMI example of dividing a unit out; the
annotation as a unit expression with no number but `1`; and shadowing,
with its two errors. Written. It makes three choices of its own, for
review before 7.1 ("Choices for review"): `*` for a generic parameter,
bounds as comparisons around the parameter (`-1 <= x <= 1`), and a
check of a written inverse at the want, which it recommends adopting
in 7.1: the function applied to the recovered argument, and the
conversion refused when that value is disjoint from the have.

### 7.1 The new form, one parameter

`definitions.ts` replaces the head's regex with a parser that reads:

- `name(p[: unit])[: unit] = body`, one parameter for now, an
  annotation being a unit expression with no number but `1` (D23);
- `~name(p) = body`, with no annotations;
- the bracketed grammar, which is removed.

It reports a parameter named like a unit that its own head uses, as a
parse error (D23).

`Definition` gains the function's parameter and its optional
annotation, the optional result annotation, the body, and an `inverse`
kind.

The build:

- checks an annotation as a declared unit is checked today (nonzero,
  evaluated among the units);
- infers the result's dimension by `dimensionOf`, and checks an
  annotated result against it;
- pairs each `~f` with `f`, and reports a dangling `~f`;
- checks both directions: `~f`'s parameter has `f`'s result dimension,
  and `~f`'s body conforms to `f`'s parameter.

`UnitFunction` holds the inverse as optional. The pipeline's function
want rejects a function without one, with an error that names the `~`
form, worded in messages.ts. A recovered argument is written in the
parameter's annotation, or as a plain number without one. If the review
of 7.0 adopts it, the want also applies the function to the recovered
argument and refuses a value disjoint from the have
(`inverseMismatch`).

units.txt rewrites `tempC`, `tempF`, `neper`, `bel` and `decibel` in
the same commit, since the old form stops parsing. Their conversions are
unchanged, and `src/units.test.ts` holds them.

Tests:

- each form parses, and each error lands at its span: a missing `=`, an
  annotation run into the body, a `~` line with annotations, a parameter
  named like a unit in its own head;
- the build's new errors;
- the want of a function without an inverse;
- the inferred result of `tempC(x) = x K + 273.15 K`.

### 7.2 Several parameters

The head reads `name(a, b: unit, …)`. `Definition` and `UnitFunction`
hold a list of parameters. `evaluate` and `dimensionOf` bind them by
position, and `arityMismatch` covers definitions, the arity being the
function's own in place of `ONE_ARGUMENT`. A duplicate parameter name is
a parse error at its second occurrence. The inverse and the want stay
single-parameter, as the study says, so a `~f` whose `f` takes several
parameters is a build error.

### 7.3 Dimension-generic parameters

A parameter annotated to take any dimension (`hypot(a: *, b: *) =
sqrt(a^2 + b^2)`, `mean(a: *, b: *) = (a + b) / 2`; the spelling is
7.0's) has its body's dimension taken at the call, by `dimensionOf`
with the actual arguments' dimensions, before anything is evaluated.

- **At the call,** a failure is reported as an error on the arguments,
  saying which operation of the body they fail (`hypot`'s sum needs `a`
  and `b` of one dimension). So a call can still fail only on its
  arguments or on a value.
- **At build time,** the body of a generic function is checked for what
  does not depend on dimensions: names that resolve, and the arity of
  the calls inside it. An annotated result is checked at the call.
- **No inverse:** a `~` line for a function with a generic parameter is
  a build error, since a recovered argument with no unit has nothing to
  be written in.

### 7.4 Domain bounds

Bounds on a parameter, in the syntax 7.0 settles (for example
`tempC(x >= -273.15)`), are checked at the call on the argument's ball.
The check is three-valued: a ball that straddles a bound is
`unresolved` and retried (D24). The range of `f` is written as the
domain of `~f`, and is checked at the want, where the recovered
argument is checked against `f`'s own bounds too. The error names the
bound.

### 7.5 Stage 7 docs

README "Functions", docs/functions.md's implementation notes, and
ARCHITECTURE.md "Functions". The README and ARCHITECTURE.md each gain
two notes from D24: that calls are not memoized, so nesting costs what
the expression written out would; and the caveats of compositions
against built-ins.

### Deferred from stage 7

The following are not tasks of this plan. Each is to have an issue
opened for it, to study the options later:

- **The result annotation as the default want of a bare call.** When
  the have is exactly one call of a function with an annotated result,
  and the want is blank, the value could be shown in the annotated unit
  (`lb/ft^2`, `percent`) rather than in the primitives. This changes
  only the display, never how a quantity or a dimension is held. The
  precedent is a recovered argument, which is already written in its
  parameter's annotation. The open point is that the default applies to
  a lone call only, and `2 bmi(…)` would show the primitives again. Scaled results
  and lists in the result's annotation are its use cases, so the
  restriction to unit expressions with no number but `1` is to be
  revisited with it.
- **Shadowing in the head as a warning.** D23's error for a parameter
  whose name is also a unit in its definition's annotations is relaxed
  to a warning once user definitions have an editor and the build has a
  way to report warnings. The same change could warn about a body that
  seems to need the unit its parameter hides.
- **Definitions typed into the converter** (D23).

## Stage 8: runtime

Provisional, and possibly unnecessary. After stage 6 the cost of the
slowest function at the default ceiling is measured on a phone, and the
probe of 2.7 is revised to time it. If the default cap keeps every pass
under the probe's budget, the defaults stay and nothing else happens; if
not, the defaults are lowered or the pipeline moves to a Web Worker: the
core is pure and takes plain data, so the worker is a thin wrapper around
`convertText`, the component debounces and shows the last result until
the next arrives, and the table is built in the worker. The payload is
measured against the study's estimate at the end of stages 3 and 6 in
any case, and recorded in docs/calculator.md.

## The first follow-up

Tasks 1.1 to 1.3 are pure leaf modules with no callers and complete
tests, and are the right first review: they fix the rounding modes, the
radius and its rounding-up discipline before anything depends on them.
1.4 is the mechanical widening and can go with them or alone. 1.5 to 1.9
are the ball reaching the display, each a state the app runs in. After
1.11 the plan is re-read against what landed, and stage 2 begins.

## Stage 1 as it landed

The re-read after 1.11. Each task landed as one commit in the order
given, and the tests pass under every task; where the code settled a
question the task left open, or corrected the task, the task's text above
was amended in the same commit, and this is the list of those points, so
that stage 2 starts from what is rather than from what was planned.

- **1.3.** Unbounded absorbs zero in `multiplyRadius` and `powRadius(rad,
0)`, where the task's "zero annihilates multiply" and "all absorbing
  unbounded" met: a loosened bound is always honest, and the ball is where
  an exact zero times an unbounded value is recognized as exact (1.5).
  `between` moved to the shared random source with the generator; `word`
  stayed in the harness; tsconfig.app.json excludes `src/testing`.
- **1.5.** Two rulings the task did not reach: an exact zero times
  anything is exact zero, unbounded included, since unbounded stands for a
  bound not known rather than an infinite value; and a divisor of
  unbounded radius divides when its midpoint is nonzero, giving an
  unbounded quotient (the study's per-operation fallback), and is
  `unresolved` when its midpoint is zero.
- **1.8.** `unresolvedWant` beside `zeroWant`, and a list unit that
  cannot be told from zero is `nonpositiveUnit`; the task's text says why.
- **1.9.** The visible change is `sqrt(2) / sqrt(2)` showing `≈ 1`, not
  `sqrt(2)^2` showing `≈ 2`, which it already did; corrected in the task.
- **1.10.** `loadSettings` and `saveSettings` take the storage as an
  argument, so that settings.ts has no DOM dependency and is tested under
  Node with a fake; the shell passes `localStorage`. A term of a result
  carries its shown text, so that rendering needs no context.
- **D13**, revised in review of the first follow-up: the exponent of stage
  4 is a `Scaled` type between the fraction and the ball, not a field on
  `Rational`; stage 4's tasks were rewritten to match, and D7 notes what
  certification does at magnitudes that cannot be formed.

What stage 2 inherits unchanged: the ball's midpoint is a `Rational`; the
root is D5's; the pipeline's working rule is `max(40, p + 10)`, which 2.5
replaces; the display shows every digit of the midpoint and says `≈`
without saying how many digits are certain, which 2.4 and 2.6 change.

## Stage 2 as it landed

The re-read after 2.9. Each task landed as one commit in the order given,
in four pull requests, and the tests pass under every task; the rulings
each task settled on its own were written into the task's text in the
same commit, and this is the list of them, with what stage 3 inherits.

- **2.1.** `fixedToBall` takes no context, since nothing in the kernel
  rounds in a mode (D9 as revised); `bits` belongs to the value, and
  `fixedFromRational` has error zero when its scaling is exact.
- **2.2.** The square root's interval is exact, its ends the integer roots
  of the argument's ends, and the general root's verified bound covers the
  argument's error too, so neither needs a derivative bound. The reference
  digits come from Python's decimal module.
- **2.3.** An unbounded argument gives the root of its midpoint,
  unbounded; a ball within an ulp of zero at the kernel's bits is treated
  as containing zero; `powRationalBall` refuses a negative base under an
  even root only when the ball is negative throughout; the scalings are
  `scaleByPowerOfTwo` and `shiftRadius`, exact and without a gcd.
- **2.4.** An exact value with more digits than shown is `certified`; the
  zero kind's bound is one digit, rounded up twice (the radius to thirty
  bits, the bound to a digit), so a round radius shows the next digit up;
  a partial with no digit certified shows the midpoint at the digits asked;
  `certifiedDigits` scans down from a bound the exponents give. The
  plan's carry example was wrong: `9.9999 ± 0.0002` at two digits does
  certify, both ends rounding to `10`.
- **2.5.** `settle` rounds to nearest with ties to even, leaves a zero
  midpoint alone and adds half an ulp as the rounding's bound; `powBall`'s
  magnitude guard is `|log2|` of the base through doubles, so a base near
  one is guarded by its magnitude and not its degree; a `want` that fails
  to parse is reported after a `have` that fails to evaluate, tried once
  at the first pass; the first pass carries the kernel's guard bits beyond
  its digits, so the cancellation tests start at `1e-20`, not `1e-15`;
  `schedule` is the function's name.
- **2.6.** The inputs are "Digits", "Most digits" and "Most bits", with
  `MIN_MAX_BITS`, twice the kernel's bits at a cap of one digit, as the
  floor of the range limit; `clampSettings` applies in the panel as on
  loading; a list's counts are formatted at the digits asked for and its
  remainder at the digits certified, `0` when it cannot be told from zero;
  the notes are in parentheses after the line. `MAX_DIGITS` went.
- **2.7.** The clock and the operations travel as a `Probe`; the range
  candidates are powers of two and the cap candidates 1, 2 and 5 times a
  power of ten; the budget is 50 ms per pass; the precision operation is
  a cube root; the real inputs come from a small congruential generator;
  the button yields a frame before the probe runs. Memory is an explicit
  omission (D16). On this project's cloud container, under headless
  Chromium, the probe recommended 8,192 bits and 200 digits: a slow
  sandbox against the budget, and the case the button exists for.
- **2.8.** The term count is `ceil((bits + 40) / 46)`; the error is three
  ulps; the square root of 10005 is Newton on the reciprocal square root,
  since V8 divides big integers quadratically and the integer square root
  cost ten times the series at a hundred thousand digits; `truncateFixed`
  is exported for the memo; the benchmark asserts the upper decade at a
  factor of fifty, binary splitting growing as V8's Karatsuba
  multiplication does, not linearly.

What stage 3 inherits: the table is built at 40 digits by system-table.ts
until 3.3 builds it at the ceiling in force and the shell rebuilds it when
the cap changes; every unit in units.txt is exact, so nothing is held back
by the table until `pi()` enters it in 3.4; the integer square root of
`sqrtFixed` costs twice the Newton cube root at the default ceiling (3.8
against 1.7 ms in the kernel benchmark), which 3.8's `sqrt` may revisit;
the probe times the root and `pi`, and a stage that adds a costlier
built-in names it in limits.ts; the two gaps of 2.5 stand, a list unit
straddling zero not retried and the reciprocal line not retried on its
own; and the display's `unbounded` kind has no producer yet, since every
operation now bounds its radius.

## Stage 3 as it landed

The re-read after 3.13. Each task landed as one commit in the order
given, in five pull requests, and the tests pass under every task; the
rulings each task settled on its own were written into the task's text in
the same commit, and this is the list of them, with what stage 4
inherits.

- **3.1.** The comma is a symbol of the call rule alone, and the arity
  check comes before any argument is evaluated, so `tempC(bogus, 1)` is
  the arity error.
- **3.2.** The table carries the set of built-ins it was built against,
  and `buildTable` takes the set with builtins.ts's `BUILTINS` as its
  default; `resolveFunction` and `functionArity` in table.ts are the one
  order and the one arity rule the two lookups share; the pole is worded
  `a pole of the tangent`.
- **3.3.** `DEFAULT_CEILING` is the default cap's ceiling; the memo of
  system-build.ts is keyed by the definitions' identity and the ceiling,
  holds a failed build too, and the shell calls it from `render`.
- **3.4.** Each built-in lives in a module of its own under builtins/,
  several sharing one only when they share machinery, gathered by
  builtins.ts so that no module depends on the map; `MEMO_MARGIN` is 64
  bits (256 since #117). Two findings: `roundTerms` now widens a
  remainder's radius by its shift (1.8 amended), and a count whose ratio
  straddles an integer is that integer (D8 amended), so `1 turn` in
  `deg;arcmin` reads `≈ 360 deg`.
- **3.5.** `DimensionLookup` and `DimensionError` are the lookup and the
  error subset the check over dimensions takes; `applyFunction` and
  `invertFunction` stay in evaluate.ts for the evaluator and the pipeline.
- **3.6.** `truncateFixed` rounded its converted error down and now rounds
  it up; every type-only import is `import type`, which is erased, so the
  kernel's modules no longer form an initialization cycle; and `exp(1e6)`
  is `tooLarge` because an inexact midpoint is a dyadic whose size is its
  exponent, the limit that stage 4's 4.9 lifts.
- **3.7.** `sqrtFixed` is Newton on the reciprocal square root, verified
  by squaring with the bound `D s / (2 s^2 - D)`; the logarithm's series
  is summed by rectangular splitting, `2 sqrt(N)` multiplications for `N`
  terms; a caller scales its value to order one and passes the power to
  `lnFixed` as `scale`.
- **3.8.** `sqrt` and `cbrt` share roots.ts and `pow` has pow.ts; the
  shared helpers (`checkPositive`, `sideOfZero`, `unboundedOf`,
  `fromBallError`) live in builtin.ts and `radiusBound`, `expFits`,
  `powLogSpace` and `lnScaled` in ball.ts; `exactRoot` on the base comes
  first, so `8^(2/3)` is exact without forming `64`; a ball touching zero
  from below is not positive anywhere.
- **3.9.** The sine and the cosine are computed together, the reduction
  taking pi at the bits asked for plus the bit length of the argument's
  integer part, so the memo's margin serves exactly the arguments below
  two to the margin at the ceiling pass (`2^64` then, `2^256` since
  #117); the two series are summed by rectangular
  splitting with one division per block; an argument wider than about a
  fifth of a radian is zero within one; the propagation counts the
  argument's error in `r` and `r^2` both.
- **3.10.** Every inverse is an arctangent: `asin` and `acos` through
  `1 - x^2` formed on the ball and rooted by `rootBall`, so `acos(1 -
1e-30)` certifies on the first pass; a ball touching an end of the
  domain counts as reaching it; `atan2` with `y` exactly zero has its own
  four cases; an argument of `atan` wider than one radian is zero within
  two.
- **3.11.** `sinh` and `cosh` take the sine's and the cosine's series in
  `x^2` below one and the exponential above it, `tanh` divides before the
  cut and saturates to `±1` within `2 e^-2|x|` far out, so only `sinh` and
  `cosh` share the limit of 3.6; the inverses go through `ln` of a root at
  the bits that keep the small part. The probe times `sin(atan(exp(1)) +
ln(3) radian)` at the candidate's ceiling, and timing it found that
  `rational`'s gcd ran Euclid on dyadics of the ceiling's size, tens of
  milliseconds a sum, so the gcd now strips the common power of two
  first. `exp`'s series is the remaining candidate for rectangular
  splitting.
- **3.12.** The three logarithmic units follow the temperature readings;
  a large decibel shares the limit of 3.6 through `pow`'s log-space route.
- **3.13.** The payload after stage 3 is 94 KB of script (30 KB
  compressed), 46 KB (13 KB) above the study's baseline and above its
  estimate for the whole numeric program before the Gamma family exists,
  recorded in docs/calculator.md with what the figure includes.

What stage 4 inherits: the midpoint is a `Rational`, an inexact one a
dyadic whose size is its exponent, so `exp`, `sinh`, `cosh`, a power in
log space and a large decibel are `tooLarge` beyond about 45,000 at the
default range limit through the one guard `expFits`, which 4.9 lifts
together with the squaring loop of `expFixed`, the kernel-to-ball
conversion and the hyperbolic module's branch through the exponential;
`lnFixed` and `lnScaled` already take a scale, and `tanh` already answers
far out without forming anything large; the four memos hold the ceiling
plus the margin and the probe leaves them at the largest ceiling it tried;
the wide-argument bounds of the routines are trivial bounds the retry
loop narrows; the two gaps of 2.5 still stand; the display's `unbounded`
kind still has no producer; and the random source of the tests is, since
the follow-up after stage 3, purely applicative in the style of JAX
(src/testing/random.ts: keys of two 32-bit words, `split` and `foldIn`
deriving keys, every draw a function of its key alone, the bits from
threefry2x32 blocks under the key, checked against the published
vectors), so that every seeded input is a function of its key and its
index rather than of the draws before it; the seeded inputs of every
containment test changed with it, and every test holds on the new ones.

## Stage 4 as it landed

The re-read after 4.10. Each task landed as one commit in the order of
the stage's introduction (4.0, 4.1 to 4.3, 4.4 and 4.9, then 4.5 to 4.7,
4.10 and 4.8), in four pull requests, and the tests pass under every
task; the rulings each task settled on its own were written into the
task's text in the same commit, and this is the list of them, with what
stage 5 inherits.

- **4.0.** The design note settled on one decimal exponent after a first
  draft with two (a binary one beside it), the user's review having asked
  for the representation to follow from the design intent; `approx`
  (docs/approximate.md, 4.10) came out of the same review, a built-in
  rather than a syntax, never narrowing, with exact values keeping their
  radius of zero everywhere in exact mode.
- **4.1.** The canonical form counts the fives of a denominator by
  doubling (`fivesIn`), after one division per factor made `10^300000`
  take a minute; `MAX_EXPONENT` is `10^18`.
- **4.2.** The alignment limit is on the shift alone, not on the
  mantissas' sizes; `1e19000 + 1` at the default range limit is the test
  of it.
- **4.3.** The tests of the modules that still held fractions read a
  literal through `src/testing/fraction.ts`; the evaluator formed a
  literal's fraction at the range limit until 4.4.
- **4.4.** `fixedToBall(f, digits)` takes the digit count; an argument
  below `2^-maxBits` throughout is answered by its expansion at zero, and
  `extraBits` is held to the range limit; `convert` takes no context;
  `ConvertError` gains `tooLarge`; D8's amended count landed here; a
  power of ten costs nothing, so `10^100000` and `10^(100000/3)` are
  values; the quotient rule is within `2^-25` of the exact bound; `log2Of`
  reads the coarse bounds; `roundTo` and `decimalDigits` were rewritten
  for speed; `Edge` is a `Scaled`; `position` is the one comparison of a
  ball with a point; certification where the ends cannot be formed
  measures the distance to the nearest rounding boundary, the two-digit
  interval of the first landing having refused `sqrt(2) * 1e999999999`
  at fifty digits; `fixedToBall` adds the half unit only when the
  rounding moved the value; a quotient at the exponent bound is located
  at the whole quotient; `src/testing/scaled.ts` is the test support.
- **4.9.** `Floating` and its helpers are in fixed.ts and `expFixed`
  returns one, its precondition an argument below `2^62` and its halvings
  taken over the argument's whole interval; `floatingToBall` of digits.ts
  is a `Result`; the first landing scaled `ln 2` by the wrong exponent;
  `expFits` compares `bound log10 e` with `MAX_EXPONENT`; `powBall`'s
  guard is the exponent bound and its loop returns a product's
  `tooLarge`; `exp 1e6` costs what `exp 1` costs at the ceiling, and its
  log-space digits 47 ms.
- **4.5.** `mode` is optional, absent meaning exact; `ceilingContext`
  sets exact mode only for a decimal context; the decimal settle's radius
  is the exact difference where it can be formed; under a directed
  rounding mode a rounded value certifies at most one digit fewer than
  asked, and `1 / 3 * 3` under `towardZero` certifies none.
- **4.6.** `schedule` returns the context alone in decimal mode and
  `resolve` is untouched; `1 / (1 / 3 * 3 - 1)` is a division by zero in
  exact mode, and `1 / (sqrt(2)^2 - 2)` the quotient `unresolved` in both.
- **4.7.** A "Mode" select after "Rounding", worded "exact: every digit
  shown is certain, at rising precision" and "decimal: every step rounded
  to the digits, in the rounding mode"; settings stored before the mode
  existed load with it exact; the UI check records `1 / 3 * 3` in each
  mode under three rounding modes.
- **4.10.** `sameAsArgument` returns the first argument's dimension; the
  working digits are the precision in decimal mode; a zero midpoint is
  returned as it is; `approx` is the last built-in by name.
- **4.8.** The payload is 129 KB, 42 KB compressed.

What stage 5 inherits: the midpoint is a `Scaled` and every reader of it
formats through scaled.ts, so the rational display of stage 5 has the
fraction at hand in the mantissa and the exponent beside it; the kernel's
results leave on the decimal grid of the working digits and a
`Floating` leaves through digits.ts, the one place that needs log space;
the two modes are one settle with two parameters, and the display
certifies the exact expression's digits in both, marking a decimal-mode
value that the roundings moved off its cell; `approx` is the one way to
make an exact value inexact in exact mode, and its two-argument form
waits on the retry loop's stopping rule docs/approximate.md lays out;
the log-space
conversion at the ceiling costs 47 ms, the logarithm and the two memos
computed for the call, which a stage that runs it often may memoize at
the ceiling plus the exponent's bits; the two gaps of 2.5 still stand;
the display's `unbounded` kind still has no producer; the probe of
limits.ts still times an exact product for the range limit and, for the
cap, the one expression of the four costliest built-ins of 3.11 at their
moderate arguments, the large arguments of 4.9 costing a few more
squarings; and what "After stage 4" adds.

## After stage 4

Two follow-ups landed after the re-read above and before stage 5, each a
pull request of its own outside the task numbering. The stage's tasks
are left as they landed, and its introduction says which of their
statements the second changed.

- **The exponent bound stays at `10^18`**
  ([#42](https://github.com/bsidhom/pwa-units/pull/42)), documentation
  alone. A report that `exp(approx(1e999))` is refused led to a scratch
  build with the bound raised to `10^1100`. It computed, but the
  exponential's cost grows at least as the square of its argument's
  length (13 s for `exp(1e9000)`), the parts of the number type that are
  exact only within the bound (`log2Bounds`, and the guards in doubles)
  would be unsound beyond it, and a bound is needed anyway, so the bound
  is kept by decision (docs/decimal.md, "Decision: the bound stays at
  `10^18`"; docs/approximate.md, "`approx` and the exponent bound", with
  the measurements; README, "Very large results and `approx`").
- **Each limit refuses with an error of its own**
  ([#43](https://github.com/bsidhom/pwa-units/pull/43), fixing
  [#41](https://github.com/bsidhom/pwa-units/issues/41)). Every refusal
  was `tooLarge`, worded "too large to compute" whichever limit it
  passed, so `exp(1e999)` read as a precision limit that `approx` might
  lift. The fraction's `tooLarge` (rational.ts) is now the range limit's
  alone, and the exponent bound refuses with `overflow` above it or
  `underflow` below it, errors of `Scaled` (`ScaledError`, with `Refusal`
  and `isRefusal` for the three together), since only a value with an
  exponent can pass it. `BallError`, `BuiltinError`, `EvaluateError` (with
  its span), `ConvertError` and the grammar's rejections forward the
  kind, and messages.ts words them "too large to compute within Most
  bits", "too large to compute: its exponent would pass 10^18" and "too
  small to compute: its exponent would fall below -10^18"
  (docs/decimal.md, "Which limit a refusal names"). The side is the sign
  of the exponent that passes the bound in `scaled()`, and in the guards
  the sign of `exp`'s argument, of `y ln x` in `powLogSpace`, and of the
  midpoint's side of one in `powBall`, flipped for a negative power;
  `sinh` and `cosh` are `overflow` for either sign. An exact power is
  told by its decimal exponent rather than by the check that fails first
  (`powerRefusal`, `powerSide`): `7^1e19` is an `overflow` where the
  range limit's prediction refuses it first, and `2.54^1e18` is
  `tooLarge`, since `approx(2.54)^1e18` computes. Products and quotients
  are held to the exponent bound alone, not to the range limit (issue
  #52), and their callers take any refusal, so that a check added there
  changes none of them; the three that have no error to return (the
  prefix lookup of table.ts, a unit list's decomposition in convert.ts,
  and `farLogarithm` of hyperbolic.ts) throw on one and name the issue
  that must change them. A conversion into a function whose argument's
  count passes the bound is refused where it threw. The parser's
  combinators are generic in the reason a `check` rejects for
  (`Parser<A, R>`, `R` never by default), and the expression grammar
  rejects with `Rejection` data that messages.ts words, as it words
  every other error.

What stage 5 inherits from them, besides what "Stage 4 as it landed"
lists: the three refusals, so that a stage adding a check reports it as
the limit the check belongs to; and the issues filed with the two
follow-ups and in checking these documents against the code after them,
open against the stage 4 code, none of which stage 5 depends on:

- a wrong answer: `tanh` of a wide ball around zero certified as `±1`
  ([#38](https://github.com/bsidhom/pwa-units/issues/38));
- crashes where "Failures" in ARCHITECTURE.md requires a `Result`: `exp`
  and `pow` of a wide argument
  ([#39](https://github.com/bsidhom/pwa-units/issues/39)), values at the
  edge of the exponent bound
  ([#44](https://github.com/bsidhom/pwa-units/issues/44)), `pow` with an
  exact exponent below about `1e-308`
  ([#45](https://github.com/bsidhom/pwa-units/issues/45)), and `exp` and
  the log-space power of an argument below about `1e-315000`
  ([#53](https://github.com/bsidhom/pwa-units/issues/53));
- values refused that could be computed: by a radius alone in `exp`
  ([#40](https://github.com/bsidhom/pwa-units/issues/40)), powers near one
  and of `0` and `±1`
  ([#46](https://github.com/bsidhom/pwa-units/issues/46)), the inverse
  trigonometric functions of a tiny or huge argument, `acos(1e-999999999)`
  among them ([#47](https://github.com/bsidhom/pwa-units/issues/47), which
  crash as well), `tanh` of a ball reaching both sides of zero
  ([#49](https://github.com/bsidhom/pwa-units/issues/49)), and a literal
  by its written exponent
  ([#50](https://github.com/bsidhom/pwa-units/issues/50));
- a sum past the exponent bound with an inexact operand shown as zero
  ([#48](https://github.com/bsidhom/pwa-units/issues/48));
- costs past their budget: products and quotients not held to the range
  limit, and a large quotient's reduction taking seconds
  ([#52](https://github.com/bsidhom/pwa-units/issues/52), which asks for
  a decision between a check and an input length limit, recorded in
  ARCHITECTURE.md, "Size limits"), and a nested call
  with a syntax error parsed in time exponential in its depth
  ([#54](https://github.com/bsidhom/pwa-units/issues/54)).

[#51](https://github.com/bsidhom/pwa-units/issues/51), that the docs had
`approx` relax the range limit only in a sum where it does in an integer
power too, is corrected in ARCHITECTURE.md and the README with this
record.

"Before stage 5: hardening", between stage 4's tasks and stage 5's, is
the phase that fixed these issues, and the defects its review found
beside them, before stage 5; "The hardening phase as it landed" below
records it.

## The hardening phase as it landed

The re-read after H.16. The phase landed as fourteen pull requests in
the order its introduction gives, tier 1 as H.1, H.2 with H.3, H.8, H.4
with H.5, H.6, H.7 and H.9
([#69](https://github.com/bsidhom/pwa-units/pull/69),
[#70](https://github.com/bsidhom/pwa-units/pull/70),
[#71](https://github.com/bsidhom/pwa-units/pull/71),
[#74](https://github.com/bsidhom/pwa-units/pull/74),
[#75](https://github.com/bsidhom/pwa-units/pull/75),
[#76](https://github.com/bsidhom/pwa-units/pull/76),
[#77](https://github.com/bsidhom/pwa-units/pull/77)), and tier 2 as
H.10, H.11 with H.12, H.13, H.14, H.15 and H.16
([#80](https://github.com/bsidhom/pwa-units/pull/80),
[#81](https://github.com/bsidhom/pwa-units/pull/81),
[#82](https://github.com/bsidhom/pwa-units/pull/82),
[#83](https://github.com/bsidhom/pwa-units/pull/83),
[#84](https://github.com/bsidhom/pwa-units/pull/84),
[#87](https://github.com/bsidhom/pwa-units/pull/87)), each reviewed and
merged on its own with the tests passing under it, and the tasks above
left as they were written except where a ruling in review changed a
row, which the task's text now says. A change outside the phase landed
between H.15 and H.16
([#85](https://github.com/bsidhom/pwa-units/pull/85)): the cap on the
digits setting is labeled "Precision limit", the panel says what each
setting does, and README ("How a number is held, and what the settings
touch") says why one limit is in bits and the others in digits, and
where the ceiling's four times plus ten comes from. The list, with the
issues each closed:

- **H.1** (#38, #49). `tanhFixed` answers an interval wider than one
  as zero within one before computing anything, and `tanhBall` a ball of
  radius one half or more that is not saturated the same way; the guard
  borrowed from `exp` is gone, since with no saturation and a radius
  below one half nothing the kernel is handed reaches 181,727.
- **H.2** (#53, #56). `fixedFromScaled` answers a value below half an
  ulp as zero within one ulp from its size, with nothing formed, and
  forms any other within four times the hard bound; `exp` gained the
  series-at-zero rule. The tighter bound for a log-space power of a tiny
  exponent, which #53 also asked, came with H.15's classifier.
- **H.3** (#39). `expFixed` answers an interval wider than one as zero
  within the exponential of its signed upper end, formed exactly; the
  signed end, not the largest magnitude, since a wide negative interval
  near the bottom edge would otherwise read as an overflow.
- **H.8** (#54). `unitAtom` takes a plain name only when no `(` follows
  it, by a lookahead over the name's own continuation characters; a cut
  combinator was weighed and set aside, since a committed failure skips
  every enclosing `alt`, `optional` and `many`.
- **H.4** (part of #44). `powerOfTenRadius(k)` for any `k` below `2^90`
  in magnitude; the three sites read it, and `farLogarithm` takes
  `ln(2|x|)` as `ln 2 + ln |x|`.
- **H.5** (#45, #57). `rootFixed` takes a degree up to `2^32` as a
  precondition, and `positiveRoot` sends three cases to
  `rootInLogSpace`: a degree past that, a remainder of the exponent
  whose power of ten does not fit the range limit, and a mantissa below
  one by more than the working bits; one below by less converts at that
  many more bits. `rootRadiusAbove` divides by the degree in bigints.
- **H.6** (part of #46). The bases 0, 1 and -1 are answered before the
  exponent's fraction, in that order, an exact exponent of zero first;
  `minusOneTo` reads the parity off the canonical form.
- **H.7** (#47, #64). Four commits: `complementRoot` reads the argument's
  position against `±1` before forming its square; `asin` and `acos`
  take their expansion at zero as soon as the square lies below `2^-bits`
  of the working precision, not `isTiny`'s `2^-maxBits`; `atan2`
  compares its magnitudes as radii before forming a ratio, `±pi/2` or
  `±pi` within `2^-bits` where one dominates, a tiny ratio over a
  positive `x` its own arctangent within its cube, and a ratio past the
  bound the quotient's refusal; and neither `atan` nor `atan2` is
  refused for an argument's radius, a ball reaching `2^maxBits` without
  lying beyond `2^bits` being the whole range, zero within two and
  within four, the powers of two above `pi/2` and `pi`, with a ratio
  whose `x` straddles zero `unresolved` at `x`. #64 was closed with this
  record, its pull request not having closed it.
- **H.9** (part of #52, #66). Four commits: the smaller reductions
  (Henrici's rule for a sum, cross-cancellation for a product, the
  reciprocal's swap with no gcd), correct only for operands in lowest
  terms, so the invariant is asserted over every constructor that
  bypasses `rational()`; Lehmer's gcd, about forty times cheaper than
  Euclid's at the default limit and still quadratic, a half-gcd left for
  a larger limit; the `^` exponent reduced in the evaluator within the
  range limit, `Exponent` carrying the two literals unreduced; and, from
  review, the quotient taken as `Scaled` values so that a literal's
  power of ten is not counted (`2^(1e30000/1e30000)` is a value at any
  limit). Where a quotient's reduction should run is
  [#78](https://github.com/bsidhom/pwa-units/issues/78).
- **H.10.** Two levels, 14,241 ball cases and 274 text cases, each
  judged against the decisions rather than the code, with a table of
  known violations keyed by issue that fails on a violation it does not
  list and on a listed one no case shows any more; from review, the
  oracle's bound on an unformable radius rests on bigint roots of ten
  (`tenToAbove`, a relative `5.4 × 10^-10`) rather than a double, since
  no bound of such a radius can be exact and a stated slack rounded
  outward is what any check of it rests on. The sweep found what the
  tasks then fixed: `settle`'s zero-midpoint shortcut, `position` on a
  refused difference, and the `cbrt` of #79.
- **H.11** (part of #44). Three commits, the first carrying the edge on
  `BallError`'s `unresolved`; `settle` returns a `Result`, refusing a
  rounded midpoint past the bound in decimal mode and truncating toward
  zero with a whole unit in exact mode; `radiusOfMove` and
  `differenceOf` form a difference without the bound. The owner's
  question at review, whether exact mode's semantics were preserved at
  radius zero: they are, `settle` being the identity on an exact ball
  before any rounding.
- **H.12** (#58, part of #44). `decompose` returns a `Result` with
  `ListRefusal`, the pipeline reports a list's refusal as the
  conversion's, and `roundTerms` falls back to the uncarried terms where
  rebuilding the total fails, so that it stays total.
- **H.13** (#50, #48, #44, #59, #60). Two commits as planned, and a
  third amending the plan: `scaled()` checks the value's decimal
  exponent inside a band of the canonical exponent (`BOUND_BAND`, four
  hundred million) where the two can differ; `held` and
  `againstPowerOfTen` hold an inexact product or quotient by the whole
  ball, the coarse bounds first and the exact distance from the power
  of ten within their slack; `addBalls` takes the settle-first path on
  `tooLarge` alone. The ruling at review: #48's `approx` row is
  `unresolved` at the bound, not the `overflow` the issue asked, since
  the ball reaches back within the bound and a refusal must never be
  wrong; the exact row is `overflow` in both modes.
- **H.14** (#52). The check in `evaluate()`'s wrapper and after the
  pipeline's two quotients, with `mantissaWithin` moved to scaled.ts;
  the error carries `exact` and the span of the node's first operand,
  since `approx` around the node itself comes too late, the node being
  refused before `approx` sees it, which the plan's message had assumed
  would work; the message reads "write approx(3^32767) in place of
  3^32767". The probe times the product's two cross-cancelling gcds with
  the operands built outside the timed call. The optional commit
  aligning `pow`'s prediction with the check is
  [#89](https://github.com/bsidhom/pwa-units/issues/89).
- **H.15** (#40, #61, #62; #46's rows 1 and 3). One classifier on an
  interval bounding the natural logarithm of the result's magnitude,
  the coarse radii first, a base near one by its exact difference from
  one, and the kernel within their slack, with a margin of forty bits
  below the working bits on `compute`; `powLogSpace` takes the bits from
  `log2OfRadius` of `y`'s magnitude and answers from the bound where
  those pass the range limit; `powRadiusAbove` takes a zero midpoint's
  power from the radius's logarithm; `floatingToBall` holds its decimal
  exponent to the bound by the interval of `t`. Two kinds of
  expectations changed beyond the issues' rows: in decimal mode the
  argument is settled to the Digits setting first, so
  `exp(2302585092994045000)` and `approx(1.0000001)^1e30` at eight digits
  straddle an edge and are `unresolved`; and a ball around zero whose
  power's radius reaches the top is `unresolved` there, as a product's
  is. An exact exponent putting `y ln x` exactly on the bottom edge is
  `unresolved` at every precision, which only log space reaches.
- **H.16** (#46). An unformable exact exponent goes to log space; an
  exact base is told past the bound by `powerRefusal` first, a negative
  base takes the parity rule times the magnitude's power, and a base
  reaching zero keeps the classifier's answer. The `^` operator keeps
  its refusal, which is
  [#88](https://github.com/bsidhom/pwa-units/issues/88).

What stage 5 inherits: D17 to D20 as the tasks landed them, the bound
on the value and a refusal needing the whole ball past it, so that its
exponent notation writes literals that parse back and its display of a
ball at an edge has one rule to follow; the edge sweep at two levels,
which a built-in joins by the map of built-ins and a display rule by a
row; the three refusals and the edge `bound`, worded in messages.ts;
and the classifier, which stage 6's functions take their guard from.
The work set aside, each with its issue:

- `asin`, `acos` and `acosh` of an exact argument with a long mantissa
  are refused, since their exact `1 - x^2` does not align
  ([#63](https://github.com/bsidhom/pwa-units/issues/63)); the text
  sweep's one remaining known entry.
- A root of degree three or more of a wide positive ball throws in the
  kernel's verification
  ([#79](https://github.com/bsidhom/pwa-units/issues/79)); the ball
  sweep's one remaining known entry.
- `tanhFixed`'s fold band costs an extra pass
  ([#65](https://github.com/bsidhom/pwa-units/issues/65)).
- A zero's bound far below the exponent bound is written with every
  digit of its exponent
  ([#67](https://github.com/bsidhom/pwa-units/issues/67)); stage 5's
  design note rules on it and 5.1 lands it.
- The message for an exact result past Most bits should say how many
  bits it needed ([#73](https://github.com/bsidhom/pwa-units/issues/73)).
- Where a quotient's reduction should run
  ([#78](https://github.com/bsidhom/pwa-units/issues/78)).
- The precision limit does nothing for results in decimal mode, and the
  panel does not say so; whether to hide it there, and whether decimal
  mode should carry a ceiling at all
  ([#86](https://github.com/bsidhom/pwa-units/issues/86)).
- `^` and `pow` disagree on a dimensionless base with an exact exponent;
  one shared rule for an exact exponent, and the parser handing an
  exponent literal through as a number
  ([#88](https://github.com/bsidhom/pwa-units/issues/88)).
- `pow`'s size prediction refuses powers the node check would admit
  ([#89](https://github.com/bsidhom/pwa-units/issues/89)).
- The table's prefix lookup still throws on a prefix times a unit that
  the arithmetic refuses or leaves `unresolved`; only a user definition
  within a prefix's factor of the bound reaches it, so it is filed with
  the editor that user definitions still lack.

## Stage 5 as it landed

The re-read after 5.2. The stage landed as three pull requests, 5.0, 5.1
and 5.2 ([#93](https://github.com/bsidhom/pwa-units/pull/93),
[#94](https://github.com/bsidhom/pwa-units/pull/94),
[#96](https://github.com/bsidhom/pwa-units/pull/96)), each reviewed and
merged on its own, the tasks as revised against the design note:

- **5.0.** docs/fractions.md, and D21 from the owner's ruling in its
  review: every exact value that is not an integer is a reduced fraction
  when it fits, an integer is written as the decimal display writes it,
  and an inexact value is a decimal, always; the alternative, a fraction
  only where the decimal is inexact, was set aside. The fit rule, each
  part within Digits, is provisional
  ([#91](https://github.com/bsidhom/pwa-units/issues/91)). The study's
  unit-list example was corrected (`428/127`, not `437/127`). The
  reciprocal line's holes were filed apart
  ([#92](https://github.com/bsidhom/pwa-units/issues/92)).
- **5.1** (#67). `show` takes `fractions` as a fourth argument, off by
  default; the `exact` kind carries `fraction: true`; `fractionText`
  forms the ordinary fraction only when it can fit, by the guards its
  comment argues; `zeroBound` writes a bound below `10^-(10^18)` as
  `1e-1000000000000000000`. From review: writing a fraction with its
  power of ten where that shortens the line is
  [#95](https://github.com/bsidhom/pwa-units/issues/95), to be settled
  with #91.
- **5.2.** The sixth setting, "Show reduced fractions"; the line logic
  moved from the component into outcome.ts so that the lines are tested
  under Node, through the pipeline, in both modes; a fraction
  parenthesized where a unit or the reciprocal's `×` follows, bare alone
  or in a call; a list's exact remainder whose fraction fits written
  entire, unrounded, so nothing carries. One change beyond the task: the
  pipeline's quotients (the ratio, a list's terms, a function's count)
  and the outcome's reciprocal are settled in decimal mode, which stage
  4 had left to the display's rounding; with an exact value no longer
  rounded by the display, `1 m` in `in` would have been `= (5000/127)
in` in decimal mode. docs/decimal.md ("The decimal mode") says so in
  place of "needs no settle of its own". Exact mode is unchanged.

What stage 6 inherits: nothing new in the core's arithmetic; a display
that says `=` for a fraction, which an exact function's result (`abs`,
`floor`, `gcd`, a `binomial`) takes without a rule of its own. Set
aside: #91 and #95, the one study of what a fraction may look like; #92,
the reciprocal's retry and a word on its refusal.

## Stage 6 as it landed

The re-read after 6.9. The stage landed as ten pull requests, 6.0 to
6.7 and 6.9 and one between 6.5 and 6.6 that moved the sweeps to their
own run ([#99](https://github.com/bsidhom/pwa-units/pull/99),
[#101](https://github.com/bsidhom/pwa-units/pull/101),
[#102](https://github.com/bsidhom/pwa-units/pull/102),
[#104](https://github.com/bsidhom/pwa-units/pull/104),
[#105](https://github.com/bsidhom/pwa-units/pull/105),
[#106](https://github.com/bsidhom/pwa-units/pull/106),
[#109](https://github.com/bsidhom/pwa-units/pull/109),
[#111](https://github.com/bsidhom/pwa-units/pull/111),
[#113](https://github.com/bsidhom/pwa-units/pull/113) and 6.9's), each
reviewed and merged on its own; 6.8 did not land and is deferred (below).
docs/special.md's "Implementation notes" has each task's departures
from the design in full; this is the record of the rulings and of what
each task left behind:

- **6.0** (#99). docs/special.md, and D22 from the owner's rulings in
  its review: `floor` and its kin on plain numbers, `div` and `mod` the
  floored pair, `gcd` and `lcm` non-negative, `round` to decimal places
  with no mode argument
  ([#98](https://github.com/bsidhom/pwa-units/issues/98) for
  significant digits). The plan's 6.1 to 6.9 were revised against it in
  the same change.
- **6.1** (#101). The one module `exact.ts` became four by subject
  (`abs.ts`, `round.ts`, `division.ts`, `integers.ts`); `div` and `mod`
  share one quotient so that neither builds the product that passes the
  bound where the remainder does not; the rounding functions decide a
  ball by `position` against the open cell; `binomial` predicts its size
  from `n^k / k!`; the sweep's builder enumerates `round` at both
  arities, the first built-in with a range of them.
- **6.2** (#102). The series as a recurrence on its terms, the working
  bits the result's plus a guard whatever bits the argument comes at,
  and the square of `1 / y` for `1 / y^2`, each from a first version that
  never terminated or never reached the floor. From review: the
  Bernoulli numbers are computed on first use and memoized, and their cost, 2.9 s once at
  the default ceiling, and footprint, about 3 MB there, are documented
  in ARCHITECTURE.md and README at the owner's asking, and
  [#103](https://github.com/bsidhom/pwa-units/issues/103) is to
  reconsider the footprint (eviction, no memo, or a cheaper
  representation).
- **6.3** (#104). `lgamma` and `gamma` sharing the series loop with
  `digamma`; the shift's product normalized at the working bits; the
  classifier on the `lgamma` ball as `gamma`'s guard; the exact integer
  case through `factorialOf`. Two rulings: the probe's composite
  (`src/limits.ts`) was not changed to time the new routines, and pull
  request titles say what the change does from here on. The costs
  measured and recorded in docs/calculator.md: at a thousand digits 31
  and 34 ms a call, where the study's estimate said a second.
- **6.4** (#105). `beta` through `logGamma`, exported from gamma.ts with
  the bits uncapped since the logarithms cancel; the poles decided
  before any logarithm; a sum at or past the top of the bound is
  `underflow`, not the sum's `overflow` passed on (D18, the sweep's
  finding); the exact case through `binomialOf`; a sum that does not
  align within Most bits taken as the larger within the smaller's
  magnitude.
- **6.5** (#106). The continued fraction's bound was written, by the
  bracketing of consecutive convergents for an order at or below one and
  the recurrence up from there, so the interim unbounded radius the task
  allowed was never shipped; the route chosen by measured cost; the
  exponential classified with its factor, not apart. Past the limits a
  large order with the argument at or past it is `tooLarge`, which
  [#107](https://github.com/bsidhom/pwa-units/issues/107) maps with the
  ways out. From review: three threads answered on the PR, and the
  sweep's 14 s on every edit led to
  [#108](https://github.com/bsidhom/pwa-units/issues/108), fixed at once
  as #109 (the sweeps named `*.sweep.ts`, run by `pnpm test:sweep` and
  `pnpm test:all`, before a commit and in CI, not by `pnpm test`), and
  [#110](https://github.com/bsidhom/pwa-units/issues/110) for the
  suite's speed, to be taken up later.
- **6.6** (#111). `erf` and `erfc` through `incompleteGammaBall`, which
  takes the complement where the other form is computed, so no rule of
  their own near one; `hullOfEnds` and `moveBetween` moved into
  builtin.ts for every function taken at the ends of a wide ball.
- **6.7** (#113). The positive-term series in place of the continued
  fraction, by the owner's ruling on the proposal ("Proceed with the
  certified series as you propose"): the beta fraction's elements have
  both signs and nothing brackets it, where the series certifies every
  value. The orientation by estimated cost with a cancellation guard;
  the exact polynomial over one common denominator; a sweep over a cube
  for three-argument functions, whose oracle took tighter Gamma bounds
  and forty-digit constants to certify the refusals it met. At the
  owner's asking,
  [#112](https://github.com/bsidhom/pwa-units/issues/112): document,
  cite and audit every numeric routine and rigorous bound, since the
  values are certified through balls and the logic must be auditable;
  from review, [#114](https://github.com/bsidhom/pwa-units/issues/114),
  the sweep split into modules by subject without a change to its cases.
- **6.8.** Deferred, and no longer part of this plan: after 6.7 the
  owner chose not to block the rest of the calculator on the eight
  functions, and [#115](https://github.com/bsidhom/pwa-units/issues/115)
  holds them with the context to resume, one sub-issue each when they
  are taken up. The task's text stays above, marked deferred, as the
  record of what was intended.
- **6.9.** This record and the payload. After `pnpm build` the script is
  160 KB (50 KB compressed) and the whole precache 178 KB (56 KB
  compressed), against 129 KB (41 KB) of script at the end of stage 5
  measured by the same build: stage 6 added 30 KB of script (9 KB
  compressed), at the top of the study's estimate of 6 to 9 KB
  compressed, which was for the kernel and the elementary functions too.
  The suite is 880 tests in ten seconds; the sweeps 36,353 cases at the
  ball level in about 35 s and 274 at the text level in 5 s.

What stage 7 inherits: the built-in mechanism unchanged, with forty-eight
functions on it, twenty-five from this stage; the kernel's door, the classifier and the size rule
exercised by every function of the stage, so a user-defined function
composing them meets nothing new; `hullOfEnds` for a function taken at
the ends of a wide ball; and `logGamma`, `incompleteGammaBall` and
`incbetaBall` exported for a composition in code. Set aside: #103 (the
Bernoulli memo's footprint), #107 (the incomplete gamma's large-order
regime), #110 (the suite's speed), #112 (the audit of every bound), #114
(the sweep's modules) and #115 (the rest of feature 3).
