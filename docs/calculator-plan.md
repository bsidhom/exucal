# Implementation plan for the calculator

Status: in progress; stages 1 and 2 have landed, and "Stage 1 as it
landed" and "Stage 2 as it landed" at the end record where the code
diverged from the tasks as first written. D13 was revised in review of
the first follow-up. Stage 2 was reviewed against the code before its
implementation and revised (D9, D10, D12, the new D15 and D16, and tasks
2.2 and 2.5 among others); the stage's introduction lists the changes.
Stage 3 was reviewed the same way against the stage 2 code and revised
(D1, D4, D10, D12, D16 and every task from 3.1 to 3.13); its introduction
lists the changes. docs/calculator.md is the design study
and its "A sequence for the follow-ups" is the order this plan follows.
This document turns that sequence into tasks small enough that each is one
commit, reviewable on its own, with the tests that prove it and the state
the code is left in. Where the study leaves a choice open, this plan makes
it and says so under "Decisions", so that a reviewer can object to a
decision before any code depends on it.

The plan is firm for stages 1 to 3, whose shape follows from the code as it
stands, and provisional for stages 4 to 8, whose first task is a short
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

Every task ends in the same state: `pnpm typecheck`, `pnpm test` and
`pnpm format:check` pass, and the module headers and ARCHITECTURE.md say
what the code now does (the last task of each stage sweeps the docs, but
a task must not leave a header that lies). The tests are the `*.test.ts`
beside each module, under Node's test runner, with no new dependency.
Numeric tests follow three patterns, named here so that later tasks can
refer to them:

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
forming either is infeasible (4.4). Rounding is
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
digits at the ceiling of D12 plus a margin of 64 bits, computed on first
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
with it, every argument below `2^64` is served from the memo at every
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

`src/core/fixed.ts` gains `expFixed`: reduce by halving until the argument
is below `2^-8`, Taylor with the truncation bound at the interval's upper
end, then square back, each squaring doubling the relative error plus one
ulp, with the guard bits raised by the number of squarings; the result's
`bits` follow its magnitude (D9), so `exp(-1000)` keeps its digits.
`constants.ts` gains `eFixed(bits, ceilingBits)`, the series at one by
binary splitting, memoized as `pi` is (D10). `BUILTINS` gains `exp` (one
dimensionless argument; `exp(0)` exact; `exp(1)` from the memo); the
built-in guards the result's magnitude against the range limit before
computing, `tooLarge` at the call, since `exp(1e6)` is beyond any range
limit. `bench/kernel.bench.ts` gains a report of every kernel routine at
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

Behavior: `exp` exists.

### 3.7 `ln`, `log10`, `log2`, `log(x, b)`

`lnFixed`: the argument as `m × 2^k` with `m` in `[1, 2)`, `ln(2)` from the
`atanh` series at `1/3` (memoized as `pi()` is, D10, with `ln(10)` beside
it for `log10`), `m` brought near one by a few square roots, then `2
atanh((m - 1) / (m + 1))`. The square roots are the first heavy use of
`sqrtFixed`, whose integer square root costs twice the Newton cube root
at the ceiling (the stage 2 re-read): this task replaces it with Newton
on the reciprocal square root, multiplications only and verified by
squaring as `sqrt10005` in constants.ts already is, keeps the integer
root only if the kernel benchmark shows no gain, and records the two
timings. The built-ins: domain `x > 0`, with a ball containing zero
`unresolved` at edge zero and one entirely non-positive a `domain` error
(`notPositive`); `ln(1)` exact; `log10` and `log2` as quotients by the
memoized constants, with the exact cases where `x` is an exact integer
power of the base (`log10(1000)`, `log2(1/8)`), found by repeated
division of the numerator or the denominator; `log(b, x)`, of exactly two
arguments with the base first (3.1), as the quotient of two `ln`, exact
when `x` is an integer power of `b` (`log(2, 8)`, `log(3, 1/9)`) or `b`
of `x` (`log(8, 2)` is `1/3`); `log(4, 8)` is `≈ 1.5`, since a rational
exponent in general is not looked for. `b` must be positive and not one:
`b` exactly one is a `domain` error (`baseOne`), a `b` straddling one is
`unresolved` at edge `1`, and a `b` straddling zero at edge zero.

Tests: reference digits of `ln(2)` and `ln(10)` to 100 from Python's
decimal module; containment across magnitudes; every exact case and its
neighbor; `ln(0)`, `ln(-1)`, `log(1, 8)` and `log(-2, 8)` are domain
errors with their messages; `ln` of `sqrt(2)^2 - 2` is `unresolved` at
the argument, and `log(1 + (sqrt(2)^2 - 2), 8)` at edge one; the pipeline
certifies `exp(ln(3))` and `ln(exp(3))` at 30 digits; the kernel
benchmark's two square roots.

Behavior: the logarithms exist.

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

Behavior: `sqrt`, `cbrt` and `pow` exist, and `2^0.1234567` is a value
where it was `tooLarge`.

### 3.9 `sin`, `cos`, `tan`

`sinFixed` and `cosFixed`: reduce the argument by the nearest multiple of
`pi / 2`, with `pi` taken at `bits` plus the argument's bit length so the
reduction keeps its digits for large arguments (from the memo up to
`2^64`, computed and not kept above it, D10), then Taylor; the quadrant
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

Provisional. The study's features 4 and 5 as one: the midpoint becomes a
`Scaled`, a fraction times a power of ten (D13), and a decimal mode rounds
after every operation. The shape below is firm; the first task refines the
details against the kernel as it landed.

### 4.0 Design note

docs/decimal.md: the `Scaled` type and its canonical form (D13), the
alignment rule for sums and its `tooLarge`, the exponent bound (`10^18`),
what "after every operation" means for a unit looked up, a power, a call,
and a defined function's body (every result the evaluator produces is
settled, in one place), and what the retry loop does in decimal mode
(nothing).

### 4.1 The `Scaled` type, construction and comparison

New `src/core/scaled.ts`, per D13: `Scaled`, the constructor `scaled(mant,
exp)` normalizing to the canonical form, `fromRational`, `toRational`
(which fails `tooLarge` when forming the power of ten would exceed
the range limit), `ZERO` and `ONE`, `isZero`, `isInteger`, `sign`, `equals`
(structural), and `compare`, which compares by exponent and digit count
before any multiplication, so that `1e999999999` compares with `1`
without being formed. `rational.ts` is untouched.

Tests: the canonical form (`2.54`, `254/100` and `127/50` are one value
with one representation); `compare` across exponents that could not be
aligned; the round trip through `toRational` where it fits and its
failure where it does not.

Behavior: none; the module is unused.

### 4.2 The arithmetic with an exponent

`scaled.ts`: `add` and `subtract` align exponents on the mantissas and
fail `tooLarge` when the alignment would exceed the range limit
(`Result`s,
where the fraction's are total); `negate`, `multiply`, `divide`, `invert`
and `pow` combine exponents; every one calls the fraction's operation on
the mantissas and renormalizes. `MAX_EXPONENT` (`10^18`) is checked
wherever an exponent is combined, failing `tooLarge`, so that formatting
is always possible (the study's bound, so that `10^(10^30)` fails cleanly
instead of looping). `dimension.ts` and the `^` exponent go on using
`Rational`, whose arithmetic stays total.

Tests: every operation agrees with rational.ts through `toRational` where
the values fit; the alignment failure; the exponent bound.

### 4.3 Text, rounding, digits and roots on `Scaled`

`parseDecimal`, `decimalExponent`, `roundTo`, `trunc`, `format` and the
root (`exactRoot`) move from
rational.ts to scaled.ts and account for the exponent: `parseDecimal`
keeps a literal's exponent lazily, so `1e999999999` parses where it is
`tooLarge` today; `format` writes the exponent form for anything the fixed
form cannot hold; the range limit's sizing of `pow` and the literal moves
with them. `rational.ts` keeps construction, comparison, the exact arithmetic,
`pow` by a bigint, `trunc` and `toFraction`, and `Precision` moves to
rounding.ts. Nothing else changes yet: the callers still hold rationals,
and convert through `fromRational` and `toRational` at the boundary until
4.4, where that boundary goes.

Tests: the moved tests, with the exponent cases added.

### 4.4 The midpoint becomes a `Scaled`

`Ball.mid` is a `Scaled`; the `number` node of `expr.ts` holds a `Scaled`
(the literal's exponent, lazily), while the `^` exponent stays a
`Rational`, the exponent grammar converting with `toRational` so that
`m^1e999999999` is refused there; `fixedFromRational` becomes
`fixedFromScaled`, with a bound on the exponent it will form (an argument
beyond the range limit is `tooLarge`, per D10); `certifies` compares the
midpoint with the radius by exponents and leading digits where forming
either is infeasible (D7); the readers of `.mid` (the converter, the
pipeline, the display, the messages) change type. The evaluator, the
table and the build see only balls and do not change.

Tests: the type change is covered by the existing tests; new ones for
`1e999999999 * 1e999999999` (exact, with an exponent), `1e999999999 + 1`
(`tooLarge`, located at the sum), `m^1e999999999` (rejected at the
exponent), and certification of `sqrt(1e999999999)`.

Behavior: `1e999999999` parses and multiplies where it fails today;
`1e999999999 + 1` still fails, as `tooLarge`.

### 4.5 `mode` in the context, and settling in decimal mode

`NumberContext` gains `mode: "exact" | "decimal"`, default exact. `settle`
(2.5, D15) reads it: in decimal mode the midpoint is rounded to the
context's precision in the user's mode, as a decimal, and the radius
grows by the rounding's error; in exact mode it rounds to nearest at the
working precision as it does from stage 2. The evaluator and the lookup
already settle every result in one place, so nothing else changes; the
table itself stays exact, as built.

What the user's rounding mode means in each mode, stated once. In exact
mode it is applied once, by the display, to the certified value of the
whole expression (D15). In decimal mode it governs every operation:
`1 / 3 * 3` is `0.99999999` under `towardZero` at eight digits and `1`
under `halfEven`, and the display's rounding is then the identity on a
value that already has `p` digits. The difference is the point of having
two modes rather than a quirk of the second. Decimal mode is where a user
who wants fixed-precision arithmetic with a rounding mode, as a hand
calculator or a decimal library gives it, gets exactly that, and rounding
only at the end, or raising the internal precision as the retry loop
does, would compute something other than what was asked; exact mode is
where "compute this to `p` digits" is meant literally, and there a mode
inside would only be a double rounding of digits certification already
guarantees. The radius tracks each rounding in either mode, so the
display marks the digits it does not certify in decimal mode too, as the
study says, without escalating (4.6).

### 4.6 The pipeline in decimal mode

`resolve` runs one pass in decimal mode, at the context's own precision,
and the display marks what the radius does not certify; the schedule
applies in exact mode only.

### 4.7 The UI

The mode setting beside the digits and the rounding mode; the settings
validation; README.

### 4.8 Stage 4 docs

ARCHITECTURE.md "Numbers" for the type ladder of D13 (`Rational`,
`Scaled`, `Radius`, `Ball`, `Quantity`), the exponent and the two modes;
"Layout" for scaled.ts.

## Stage 5: the rational display

Provisional; small.

### 5.0 Design note

A section in docs/decimal.md or its own page: the rules of feature 7, and
the size at which an exact value's fraction is written in exponent
notation instead (`1e+999999999` is exact and short; its digits are not).

### 5.1 `show` with fractions

`display.ts`: a `fractions` flag; an exact ball is written as an integer
or a fraction in lowest terms (recovering the ordinary fraction from the
`Scaled` form of D13 through `toRational`, or the exponent notation of
5.0 where that would not fit), with `needsParentheses` set for the UI
when a fraction will
precede a unit; an inexact ball falls back to the decimal display and
says so in its kind.

### 5.2 The UI

The setting; the parentheses before a unit and none for a dimensionless
value; README's example lines.

## Stage 6: the exact functions, then the Gamma and Beta families

Provisional; each function is a task with the three test patterns. The
exact functions come first (D14).

### 6.0 Design note

docs/special.md: the dimension rules of the exact functions (`abs`,
`floor`, `ceil`, `trunc`, `round` keep their argument's dimension; `sign`
is dimensionless; `mod` requires conformance and keeps the dimension;
`gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial` take
dimensionless integers), `round(x, digits)` with the context's mode as
the default and an optional mode argument named as in `ROUNDING_MODES`,
`floor` and its kin on a ball straddling an integer (`unresolved`), and
for the Gamma family the algorithm per function and the bound it owes.

### 6.1 The exact functions

`abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `mod`, `gcd`, `lcm`,
`factorial`, `binomial`, `doublefactorial`, each exact on exact balls,
and on an inexact ball either exact where the interval decides (`floor`
of a ball inside one integer's cell) or `unresolved`. `factorial` and
`binomial` check the range limit.

### 6.2 `digamma`

The recurrence up and the asymptotic series with Bernoulli numbers
(exact rationals, computed once per precision and memoized), with the
truncation bound of the asymptotic series stated; needed by `gamma`'s
propagation rule.

### 6.3 `gamma` and `lgamma`

The shift up, the Stirling series, reflection for negative arguments,
poles as domain errors, positive integers as exact factorials;
propagation by `gamma × digamma`; `lgamma` alongside, since `gamma(20000)`
exceeds the range limit in exact mode.

### 6.4 `beta`

Three `gamma`s, or through `lgamma` for large arguments; exact for
integer arguments.

### 6.5 The incomplete gamma functions

Lower by the power series on balls, upper by the continued fraction with
its truncation bound, the region rule as mpmath documents it, and the
regularized `P` and `Q`. Until the continued fraction's bound is written,
the upper form returns an unbounded radius, which the display shows as the
study describes.

### 6.6 `erf` and `erfc`

As `P(1/2, x^2)` and its complement, with the sign handling, and the
exact case at zero.

### 6.7 The incomplete beta function

The continued fraction with the symmetry, its bound, and `I_x(a, b)`.

### 6.8 The rest of feature 3, as wanted

`zeta` (Borwein), `lambertw` (Halley on `exp`), the complete elliptic
integrals `K` and `E` (the arithmetic-geometric mean), `legendre` and
`chebyshev` (exact for integer order at a rational argument), Bessel `J`
and `I` last. Each its own task and commit.

### 6.9 Stage 6 docs

README's list of built-ins; docs/special.md's implementation notes; the
payload measured and recorded in docs/calculator.md against its estimate.

## Stage 7: the user-function extensions

Provisional.

### 7.0 Design note

An update to docs/functions.md: several parameters, the optional
declaration (a missing one means plain numbers), the optional inverse (a
function without one is not usable as a want, with an error that says so),
and domain and range bounds, their syntax and where they are checked.

### 7.1 Several parameters

`definitions.ts`: the head reads `name(a, b)`; `Definition` and
`UnitFunction` hold a list of parameters; `evaluate` binds them by position
and `arityMismatch` covers definitions; the inverse and the want stay
single-parameter, as the study says.

### 7.2 Optional declaration and inverse

The grammar and the build check for each; the pipeline's function want
rejects a function without an inverse.

### 7.3 Domain and range

Two optional bounds on a definition, checked at the call and at the
inverse, with an error that names the bound.

### 7.4 Stage 7 docs

README "Functions", docs/functions.md, ARCHITECTURE.md.

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
