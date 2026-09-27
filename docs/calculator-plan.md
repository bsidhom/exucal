# Implementation plan for the calculator

Status: in progress; stage 1 has landed through task 1.3, and D13 was
revised in review of that first follow-up. docs/calculator.md is the
design study and its
"A sequence for the follow-ups" is the order this plan follows. This
document turns that sequence into tasks small enough that each is one
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
  source (the first hundred digits of `pi`, `e`, `ln 2`, `sqrt 2`), to at
  least fifty digits, so that an algorithm that is wrong in its tail is
  caught.
- **Containment.** For a routine that returns a ball, the ball computed at
  precision `p` must contain the midpoint computed at precision `4p`, over
  a seeded set of arguments across the routine's domain, drawn from the
  shared random source of 1.3. This is the test that the radius is honest,
  and every inexact routine has one.
- **Exact case.** Every input the routine is required to recognize as
  exact gives a ball of radius zero with the exact midpoint (`sqrt(9/4)`,
  `exp(0)`, `log(8, 2)`), and an input next to it does not.

## Decisions

Numbered so that tasks can cite them. Each is a choice the study leaves
open or a detail it does not reach, and the reasoning is given once here.

**D1. One context type, with `precision` meaning the working precision
below the pipeline and the digits wanted at its boundary.** `NumberContext`
is `{ precision, rounding }` in stage 1 and gains `mode` in stage 4. Every
core function that does arithmetic takes one and treats `precision` as the
precision it computes at. The pipeline is the one place that knows the
difference between the digits the user asked for and the precision the
evaluation runs at: it takes the user's context and derives working
contexts from it (a fixed guard in stage 1, the retry schedule from
stage 2). A second type for the user's settings would be the same fields
with one renamed, and the distinction is one of level, stated in the
pipeline's header, not of shape.

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
themselves: `10^±19700` today (`MAX_BITS`) and `10^±(10^18)` once stage 4
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
message says the value cannot be told from zero at this precision.

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
held back by the unit. The schedule of D12 doubles up to one absolute
ceiling, `CEILING_DIGITS`, the same for every setting, so the table is
built once at that ceiling and never rebuilt: the digits setting changes
what the display asks for and what the passes compute at, never the
table. At a ceiling of 1,000 digits `pi()` costs under a millisecond once,
each angle unit holds a rational of a thousand digits, which the exact
operations carry through at microseconds a step, and a conversion at `p`
digits certifies from a unit accurate to a thousand, with `1000 - p`
digits of room for cancellation on the unit's side: `turn` into `deg`
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

**D8. Unit list counts are taken from the midpoint.** In `convertToList`
each count is the truncated ratio of midpoints and the remainder is the
ball `have - count × size`, computed with the exact ball operations, so
that the terms times the units still contain `have`. A remainder that
comes out slightly negative, or slightly above a whole of the unit before
it, is the display's carry case, which `roundTerms` already handles; a
count is never `unresolved`.

**D9. The kernel is fixed point with an integer error count.** A kernel
value is `{ value, error, bits }`: the integer `value` stands for
`value × 2^-bits`, and `error` is an upper bound, in units of `2^-bits`,
on its distance from what it stands for. Every operation updates `error`
by an over-approximation that is a few lines of integer arithmetic, so
the bound can be checked by reading. A series runs on such values with the
argument's error included from the start, which propagates the argument's
radius without a separate derivative bound; the truncation bound of a
series is taken at the upper end of the argument's interval. The kernel
hands back a ball whose midpoint is rounded to the context's decimal
precision in its mode and whose radius covers `error` and that rounding.

Fixed rather than floating point: `bits` is the position of the binary
point, so the integer part is `value >> bits` and the fraction the low
`bits` bits, with no separate field for either. It is fixed for a routine
and chosen after its argument reduction, so that every routine works on
values of order one and the error count, which is absolute, is a relative
error too. What that implies: a routine whose result is small (`sin` near
zero, `exp` of a large negative argument) states its result's scale and
accounts for it in `fixedToBall`, and the count grows by at least one per
operation, so a series of a thousand terms spends ten of the 32 guard
bits, which is why the guard is bits rather than digits. The alternatives
considered: a ball at every step of the kernel, as Arb does, uniform with
the value type but a radius operation per arithmetic operation and a
second representation to reason about inside every series; two integer
endpoints, an interval per intermediate, twice the arithmetic and a
rounding direction to choose per operation; and guard digits with no
error count, the classic approach, which is not rigorous and could not
produce a radius at all. The integer count is the cheapest of these that
yields a proof, and its rules are the textbook ones.

**D10. `pi` and `exp(1)` are memoized privately, and the memo is
bounded.** The core has no globals, but a memo of a pure function of its
precision is unobservable through the core's results, as `lazy` in
parser.ts is, and the study asks for exactly that memo. Through memory it
is observable, so its footprint is fixed by construction rather than
bounded by an eviction policy: each constant's module holds exactly one
value, the digits at `CEILING_DIGITS` of D12, computed on first use, and
every request at or below the ceiling, which is every request the retry
loop can make, rounds from it. The footprint is therefore a constant of
the program (about 415 bytes per constant at a ceiling of 1,000 digits,
two constants), the same whatever the user's setting, so lowering the
setting has nothing to free and raising it nothing to grow; the only way
it changes is stage 8 raising the ceiling. The one request above the
ceiling is the argument reduction of `sin` and `cos` at a large argument,
which needs `pi` to the ceiling plus the argument's bit length (under
`MAX_BITS`; an argument beyond that is refused as `tooLarge`): it is
computed for that call and not kept, so a `sin(1e5000)` costs its
milliseconds each time it is typed and leaves nothing behind. The
alternative, keeping the largest value seen, is what the study describes
and would be bounded too (about 21,000 digits), but its footprint would
depend on what the user had typed, and freeing it would need a policy;
the fixed value needs none.

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

**D12. The retry schedule doubles up to an absolute ceiling.** The
internal precisions are `p + 10`, `2 (p + 10)`, `4 (p + 10)`, ..., for
`p` digits wanted, doubling up to and including `CEILING_DIGITS`, the same
for every setting: 1,000 in stage 2, which is seven passes at `p = 8` and
four at `p = 200`. A pass that certifies ends the loop, so the length of
the schedule costs nothing in the common case; the expressions that never
resolve (`sin(pi() radian)`, `sqrt(2)^2 - 2`) run to the ceiling however
it is set, which is what bounds their latency: every elementary function
at a thousand digits is milliseconds, and the special functions of stage
6 are where the ceiling is measured (stage 8). The digits setting is
capped at `MAX_DIGITS`, 200 in stage 2, so that the schedule always has
room above the setting for cancellation. The fixed ceiling is also what
lets D6 build the table once.

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
(`parseDecimal`, `format`, `roundTo`, `decimalExponent`, the `MAX_BITS`
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
and the build, the change reaches only the readers of `.mid`.

**D14. The exact functions (`abs`, `floor`, `gcd`, ...) come after the
elementary set and before the Gamma family.** They depend only on the
built-in mechanism, and they exercise the one dimension rule the
elementary set does not need, a result that keeps its argument's
dimension. The study lists them with feature 3; they open stage 6 here so
that stage 3 stays about one thing.

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
is `pow(mid, |n|)`, which does the `MAX_BITS` check, the radius is
`n (|mid| + rad)^(n-1) rad` in the coarse arithmetic, and a negative `n`
inverts by the division rule. Midpoints are never rounded here: in exact
mode the exact operations stay exact, and only the radius says what has
been lost upstream. The midpoint is a `Rational` through stages 1 to 3;
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
the remainder's midpoint and keeps its radius on the rounded term.
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

Behavior: one visible change, `sqrt(2)^2` shows `≈ 2.0000000` rather than
`= 2`, which is the fix the study describes (and the case the symbolic
values of docs/future.md would make `= 2`).

### 1.10 Settings and the UI

New `src/settings.ts` (app, not core): `Settings = { digits; rounding }`,
`DEFAULT_SETTINGS`, `loadSettings` and `saveSettings` over `localStorage`
with validation (an integer `digits` in `[1, MAX_DIGITS]`, a name in
`ROUNDING_MODES`; anything else is the default), and `contextOf(settings)`.
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

## Stage 2: the kernel, `root`, `pi`, the retry loop

Firm. What lands: the fixed-point kernel on which every inexact function
will run; `root` on it, honoring the mode and propagating its argument's
radius; certification and the display's rule for fewer digits than asked;
the retry loop in the pipeline; `pi` computed on demand. After this stage
`sqrt(2)^2 - 2` is `≈ 0` with a bound and `sqrt(2)` at 50 digits is 50
correct digits.

### 2.1 The kernel's values and exact operations

New `src/core/fixed.ts`, per D9: `Fixed = { value: bigint; error: bigint;
bits: number }`, fixed point, so `bits` is the position of the binary
point, the integer part is `value >> bits` and the fraction is the low
`bits` bits, with no field for either; `bitsFor(precision)`, the bits for a decimal precision
plus `GUARD_BITS` (32); `fixedFromRational(r, bits)` (rounded to nearest,
error 1); `fixedFromBall(b, bits)` (the midpoint so, plus the radius in
ulps rounded up; unbounded is a precondition failure, since the caller
returns unbounded without computing); `fixedToBall(f, context)` (the
midpoint `value × 2^-bits` rounded to the context's precision in its mode,
the radius `radiusAbove` of `error × 2^-bits` plus the rounding's error,
which is one unit in the last decimal digit at most); `addFixed`,
`subtractFixed`, `multiplyFixed` (the value is the product shifted down
by `bits`; the error is `|a| eb + |b| ea + ea eb` shifted down and rounded
up, plus one for the shift), `divideFixed` (a precondition that the
divisor's interval excludes zero), `shiftFixed`, `absFixed`, `compareFixed`
where the intervals allow it. Every routine's doc comment states its error
rule.

Tests: containment over seeded rationals for every operation, checking
`|exact - value × 2^-bits| <= error × 2^-bits` with rational arithmetic;
`fixedToBall` under each rounding mode contains the exact value.

Behavior: none; unused.

### 2.2 The kernel's roots

`sqrtFixed` and `rootFixed(f, degree)` by Newton on the scaled integer
(the `integerRoot` of rational.ts, moved here), with the error rule:
one ulp of truncation plus the propagated error, bounded by the derivative
`(1/n) x^(1/n - 1)` at the lower end of the argument's interval, which
must be positive (a precondition; the caller decides what a ball around
zero means).

Tests: containment; reference digits of `sqrt 2` and `cbrt 2` at 100
digits through `fixedToBall`.

### 2.3 `rootBall` on the kernel

`rootBall` in ball.ts: the exact cases as before; an exact or inexact
argument whose ball excludes zero goes through `fixedFromBall`, `rootFixed`
and `fixedToBall`, so the midpoint is rounded in the mode and the radius
covers the argument's; a ball containing zero is exact zero if exact, and
otherwise `unresolved` for an even degree (the sign is undecided) and, for
an odd degree, a ball around zero with a radius from the interval's ends
(the root is monotone, so `[root(lo), root(hi)]` is the answer). D5's
unbounded radius goes, and `truncatedRoot` in rational.ts goes with it if
nothing else uses it.

Tests: the stage 1 tests, with the unbounded case replaced by containment
over inexact arguments; directed modes give a midpoint on the side asked;
`sqrt` of a ball straddling zero is `unresolved`, `cbrt` of one contains
zero.

Behavior: `sqrt(2)` at `p` digits now honors the rounding mode.

### 2.4 Certification and the display rule

`src/core/ball.ts`: `certifies(b, digits, mode)`, per D7, and
`certifiedDigits(b, maxDigits, mode)`, the largest `d <= maxDigits` that
`certifies`, or none. `src/core/display.ts`: `show` returns a `Shown`
with a `kind`: `exact` (as in 1.9); `certified` (inexact, all `digits`
certified, `text` rounded to them); `partial` (fewer, `certified: d`,
`text` rounded to `d`); `zero` (no digit certified, the ball contains
zero, `bound` the formatted radius, so the UI can say `≈ 0, within 1e-30`);
`unbounded` (an unbounded radius, `text` the midpoint at `digits`, certifying
none, as the study says the per-operation stage displays). A ball that
certifies no digit and excludes zero is `partial` with zero digits, which
the retry loop below prevents from reaching the display except at the
ceiling.

Tests: each kind from a constructed ball; `certifies` at a tie under each
mode; the carry (`0.99999 ± 0.00002` at three digits certifies under
`halfAwayFromZero`, `9.9999 ± 0.0002` at two digits does not).

Behavior: the display is still called with a single pass, so `partial`
now appears where 1.9 showed digits it could not certify. 2.5 removes
that within the schedule.

### 2.5 The retry loop

`src/core/pipeline.ts`, per D12: `SCHEDULE(p)` yields the working contexts
`p + 10`, `2 (p + 10)`, ..., doubling, and last `CEILING_DIGITS`, which
context.ts holds beside `MAX_DIGITS`; `resolve(context, run, done)` calls
`run` with each working context in turn and returns the first result that
`done` accepts, an error other than `unresolved`, or the last result at
the ceiling; `evaluateText` and `convertText` go through it, with `done`
checking that every value in the result (the unit value, each list term,
the function count) is exact, certified at `context.precision`, or
unbounded. The `unresolved` that survives the ceiling is the error the
user sees. The stage 1 working rule (`max(40, p + 10)`) goes.

Tests: `sqrt(2)` at 8 and at 50 digits certifies on the first pass;
`sqrt(2)^2 - 2` ends at the ceiling as `zero` with a bound;
`1 / (sqrt(2)^2 - 2)` is `unresolved`; `(sqrt(2) + 1e-15) - sqrt(2)` at
8 digits needs a second pass and certifies, and `(sqrt(2) + 1e-60) -
sqrt(2)` a fourth (the test counts passes through a `run` that records its
contexts); at 8 digits the schedule ends at 1,000 digits after seven
passes; an error in the text returns at once.

Behavior: certified digits, or fewer with a note.

### 2.6 The UI for the display kinds

`unit-converter.ts` renders `partial` with a note ("8 of 12 digits are
certain"), `zero` as `≈ 0` with its bound, and `unbounded` with a note
that the digits are not certified. The settings panel caps the digits at
`MAX_DIGITS` in the input's attributes as well as in validation.

Behavior: the notes.

### 2.7 `pi`

New `src/core/constants.ts`: `piFixed(bits)` by Chudnovsky's series with
binary splitting, the error bound of the truncated series stated in the
comment (the terms decrease by a factor of about `10^14` each), memoized
per D10; `piBall(context)` through `fixedToBall`. `bench/kernel.bench.ts`
reports the timing at 1,000, 10,000 and 100,000 digits and asserts that
10,000 digits cost at most thirty times 1,000 (the study measured
twenty).

Tests: reference digits to 100; the 36-digit literal in units.txt as a
second reference; the memo holds the ceiling's value after requests at
three lower precisions, and a request above the ceiling adds nothing to
it.

Behavior: none; unused until stage 3.

### 2.8 Stage 2 docs

ARCHITECTURE.md "Precision and rounding" gains the kernel, certification
and the schedule; "Layout" the new modules; the benchmark section the
kernel benchmark; README "Settings" explains the note about fewer digits.

## Stage 3: built-in functions

Firm in shape; the list of functions is the study's. What lands: calls
with any number of arguments; a built-in kind of function beside defined
ones, with dimension rules and domain errors; the table built at the
ceiling; the build's function check over dimensions; `pi()`
and the elementary set; the definitions file's `pi` replaced and the
neper and the bel defined.

### 3.0 Design note

docs/builtins.md, short: the names (Euler's number is `exp(1)`, Lambert's
function is `lambertw`, no built-in collides with a unit of units.txt),
each function's dimension rule, domain, exact cases and propagation, and
D11 restated with the alternative. Written from this plan; the rest of
the stage implements it.

### 3.1 Calls with any number of arguments

`src/core/expr.ts`: the `call` rule reads `name "(" (expr ("," expr)*)?
")"` and the node holds `arguments: readonly Expr[]`; the comma is a new
symbol and appears nowhere else. `src/core/evaluate.ts`: a call of a
defined function with other than one argument fails with a new
`arityMismatch { name, span, expected, given }`; `src/messages.ts` words
it. `docs/functions.md` and README note the grammar. The decision on
arity: the grammar accepts any number of arguments, and what a function
accepts is its own. A built-in declares a range `{ min, max }` (`log` is
1 to 2, `round` in stage 6 is 1 to 3), a defined function takes exactly
its parameters (one until stage 7), and no function is variadic in this
stage: `max`, `min` or `gcd` over a list would need only an unbounded
`max` in the range and no change to the grammar, and none is planned.

Tests: `f()`, `f(1)`, `f(1, 2 m)`, `f(1,)` is an error at the `)`, the
spans; `tempC(1, 2)` is an arity mismatch.

Behavior: `tempC(1, 2)` is an arity error rather than a parse error.

### 3.2 The built-in kind

New `src/core/builtins.ts`: `Builtin = { name; arity: { min; max };
dimensions(args:
Dimension[], primitives): Result<Dimension, DimensionRuleError>; apply(args:
Ball[], context): Result<Ball, BuiltinError> }`, `BUILTINS` as a map by
name (empty in this task), and the two error types: a dimension rule's
failure (which argument, what it must be) and `domain` (which argument,
why). `src/core/table.ts`: `ResolvedFunction = { kind: "defined"; fn } |
{ kind: "builtin"; fn }`; `Lookup.function` returns it; `unitLookup`
resolves defined functions first and built-ins second (the build keeps
them disjoint); a built-in's name used as a unit is `functionAsUnit`.
`src/core/evaluate.ts`: the `call` case switches on the kind; the built-in
branch evaluates every argument, applies the dimension rule (its failure
is a new `builtinArgument` error at the call, carrying the rule's error
and the argument's span), applies the function, and locates `domain` as
a new `domainError` at the call and the ball errors as usual.
`src/core/build.ts`: a definition named like a built-in is a `duplicate`
(the error's `first` becomes a union of a definition or a built-in name),
and the prefixed-name check runs over the built-in names too. Messages
for the three new errors.

Tests: with a test-only built-in injected through a lookup (the map is
empty), every branch; the build rejects a unit named like a built-in.

Behavior: none visible; no built-in exists.

### 3.3 The table at the ceiling

Per D6 and D12. `src/core/pipeline.ts` exports `ceilingContext()`, the
last context of `SCHEDULE(p)` for every `p`. `src/system-table.ts` builds
the one table at it, as it builds one table today; `app-shell.ts` has no
reason to rebuild when the digits change, and does not. `build.bench.ts`
builds at the ceiling context.

Tests: `ceilingContext()` is the last of `SCHEDULE(p)` for every `p` up
to `MAX_DIGITS`.

Behavior: none visible yet; the table is precision-independent until 3.4.

### 3.4 `pi()`, and the definitions file

`BUILTINS` gains `pi` (arity zero, dimensionless, `piBall`); units.txt
loses the `pi` literal and its six uses become `pi()`. `units.test.ts`:
the angle conversions that were exact are now `≈` (`turn` into `deg`
certifies 360 to the digits asked and is not exact), which the study
accepts; a unit that reads `pi` is now a `functionAsUnit` error whose
message shows `pi()`.

Behavior: angle units carry a radius; `pi` alone is an error that says
to write `pi()`.

### 3.5 The build's check over dimensions

New `src/core/dimension-of.ts`: `dimensionOf(expr, lookup, primitives)`,
the abstract interpretation the study describes: a number is
dimensionless, a unit is its dimension through the lookup (which still
visits the walk, so unknown names and cycles are found as before), a sum
checks conformance and takes the left's, a product or quotient combines,
a power raises, a negation keeps, a call applies the callee's rule (a
defined function's argument must conform to its declared unit and the
result is the declared result's dimension; a built-in's rule is its
`dimensions`). Its errors are the subset of `EvaluateError` a dimension
can cause, so the messages hold. `build.ts`'s `checkFunction` evaluates
the declared units and runs `dimensionOf` on each body with the bound
name at the declared dimension, in place of evaluating at one of the
unit; `applyFunction` and `invertFunction` are no longer called at build
time. docs/functions.md's "Build-time checks" and its acceptance of the
`1 / (x - 1)` failure are updated.

Tests: `recip(x) [1;1] 1 / (x - 1) ; ...` builds; a body of the wrong
dimension still fails with `functionMismatch`; a body that adds a length
to a time fails with `nonconformingOperands` at its span; the walk still
reports a cycle through a function.

Behavior: functions whose bodies fail at `1` now build.

### 3.6 `exp`

`src/core/fixed.ts` gains `expFixed`: reduce by halving until the argument
is below `2^-8`, Taylor with the truncation bound at the interval's upper
end, then square back, each squaring doubling the relative error plus one
ulp, with the guard bits raised by the number of squarings. `constants.ts`
gains `eFixed(bits)`, the series at one by binary splitting, memoized.
`BUILTINS` gains `exp` (one dimensionless argument; `exp(0)` exact;
`exp(1)` from the memo).

Tests: reference digits of `e` to 100; containment; exact case; the
pipeline certifies `exp(1)` at 50 digits in one pass; `exp(1 m)` is a
dimension-rule error whose message names the dimension.

### 3.7 `ln`, `log10`, `log2`, `log(x, b)`

`lnFixed`: the argument as `m × 2^k` with `m` in `[1, 2)`, `ln 2` from the
`atanh` series at `1/3` (memoized), `m` brought near one by a few square
roots, then `2 atanh((m - 1) / (m + 1))`. The built-ins: domain `x > 0`,
with a ball containing zero `unresolved` and one entirely non-positive a
`domain` error; `ln(1)` exact; `log10` and `log2` as quotients by the
memoized constants, with the exact cases where `x` is an exact rational
power of the base (`log10(1000)`, `log2(1/8)`), found by `exactRoot`
style detection on the numerator and denominator; `log(x, b)` as the
quotient of two `ln`, exact when `x` is an exact rational power of `b`
(`log(8, 2)`, `log(1/9, 3)`), and `b` must not be one.

Tests: reference digits of `ln 2` and `ln 10`; containment; every exact
case and its neighbor; `ln(0)`, `ln(-1)` are domain errors; `ln` of
`sqrt(2)^2 - 2` is `unresolved`; the pipeline certifies `exp(ln(3))` and
`ln(exp(3))` at 30 digits.

### 3.8 `sqrt`, `cbrt`, `pow(x, y)`

`sqrt` and `cbrt` are `rootBall` under a name, with the same exact cases
as `^(1/2)` and `^(1/3)`, so `sqrt(9/4)` is exact and `sqrt(-1)` a domain
error (the message says a negative value has no real root). `pow(x, y)`
is for a dimensionless base only (the rule says so): an exact rational
`y` goes through `powRationalBall`, so `pow(2, 1/2)` is `sqrt(2)` and
`pow(8, 1/3)` is exact `2`; otherwise `exp(y ln x)` for `x > 0`, and a
non-positive `x` with an inexact `y` is a domain error.

Tests: exact cases; containment; `pow(2 m, 2)` is a dimension-rule error
whose message says to write `(2 m)^2`; `pow(0, 0)` is exact one as
`0^0` is.

### 3.9 `sin`, `cos`, `tan`

`sinFixed` and `cosFixed`: reduce the argument by the nearest multiple of
`pi / 2`, with `pi` taken at `bits` plus the argument's bit length so the
reduction keeps its digits for large arguments, then Taylor; the quadrant
from the multiple. `tan` is the quotient, `unresolved` when `cos`'s ball
contains zero. The rule requires the `radian` kind (D11) and hands the
kernel the magnitude, which is in radians since `radian` is the
primitive. Exact cases: zero.

Tests: reference digits of `sin 1` and `cos 1`; containment across
`[-100, 100]` and at `10^20`; `sin(30 deg)` certifies `0.5` at the digits
asked and is not exact; `sin(1)` is a kind mismatch whose message says to
write `sin(1 radian)`, and `sin(1 m)` a dimension mismatch;
`sin(pi() radian)` is `zero` with a bound at the ceiling.

### 3.10 `asin`, `acos`, `atan`, `atan2`

`atanFixed` by half-angle reduction a few times, then Taylor; `asin` and
`acos` through `atan` and `sqrt` with the domain `[-1, 1]`, a ball
straddling an end `unresolved`, outside a domain error; `atan2(y, x)` by
quadrant, with `atan2(0, 0)` a domain error. All four return the
`radian` kind (D11), and `atan2` takes two quantities of one dimension.
Exact cases: zero, and `acos(1)`.

Tests: reference digits of `atan 1` (a quarter of `pi`); containment;
`asin(2)` domain; `atan2` in every quadrant against `atan`; `asin(0.5)`
into `deg` certifies `30`; `atan2(3 m, 4 m)` is an angle and
`atan2(3 m, 4 s)` a dimension mismatch; the pipeline certifies
`asin(sin(0.5 radian))` at 30 digits.

### 3.11 The hyperbolic functions and their inverses

`sinh`, `cosh`, `tanh` through `exp`, with `sinh` for small arguments
through its own series to avoid the cancellation of `exp(x) - exp(-x)`;
`asinh`, `acosh`, `atanh` through `ln` and `sqrt`, `asinh` by symmetry
for negative arguments; domains `acosh(x >= 1)` and `atanh(|x| < 1)`, the
edges as in 3.10. Exact cases: zero, `cosh(0)`, `acosh(1)`.

Tests: reference digits; containment, including `sinh(1e-10)`; the domain
errors; identities within the radius (`cosh^2 - sinh^2` contains one).

### 3.12 The neper and the bel

units.txt defines `neper(x) [1;1] exp(x) ; ln(neper)`, `bel(x) [1;1]
pow(10, x) ; log10(bel)` and `dB(x) [1;1] pow(10, x / 10) ; 10 log10(dB)`,
with a comment on what a logarithmic unit is; README's "What the file
contains" loses the sentence that says they cannot be defined.

Tests: `dB(20)` is `= 100`, `bel(2)` is `= 100` (exact cases), `1000` into
`dB` is `dB(30)`.

### 3.13 Stage 3 docs

ARCHITECTURE.md: "Functions" gains the built-in kind and the dimension
rules; "Evaluation" the new errors; "Definitions" the check over
dimensions; "Later" loses built-in functions; "Layout" the new modules.
README: a "Functions in expressions" section listing the built-ins, and
the settings note that the table is rebuilt when the digits change.
docs/builtins.md gains its implementation notes.

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
`MAX_BITS`), `ZERO` and `ONE`, `isZero`, `isInteger`, `sign`, `equals`
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
fail `tooLarge` when the alignment would exceed `MAX_BITS` (`Result`s,
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
roots (`exactRoot`, and `truncatedRoot` if it still exists) move from
rational.ts to scaled.ts and account for the exponent: `parseDecimal`
keeps a literal's exponent lazily, so `1e999999999` parses where it is
`tooLarge` today; `format` writes the exponent form for anything the fixed
form cannot hold; the `MAX_BITS` sizing of `pow` and the roots moves with
them. `rational.ts` keeps construction, comparison, the exact arithmetic,
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
beyond `MAX_BITS` is `tooLarge`, per D10); `certifies` compares the
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

### 4.5 `mode` in the context, and settling

`NumberContext` gains `mode: "exact" | "decimal"`, default exact.
`ball.ts` gains `settle(b, context)`: in decimal mode the midpoint is
rounded to the context's precision in its mode and the radius grows by
the rounding's error; in exact mode it is the identity. `evaluate` settles
every result it produces, in one place, and `unitLookup` settles a unit
once when it is looked up; the table itself stays exact, as built.

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
`binomial` check `MAX_BITS`.

### 6.2 `digamma`

The recurrence up and the asymptotic series with Bernoulli numbers
(exact rationals, computed once per precision and memoized), with the
truncation bound of the asymptotic series stated; needed by `gamma`'s
propagation rule.

### 6.3 `gamma` and `lgamma`

The shift up, the Stirling series, reflection for negative arguments,
poles as domain errors, positive integers as exact factorials;
propagation by `gamma × digamma`; `lgamma` alongside, since `gamma(20000)`
exceeds `MAX_BITS` in exact mode.

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
slowest function at `CEILING_DIGITS` is measured on a phone. If it stays
under tens of milliseconds, `CEILING_DIGITS` and `MAX_DIGITS` are raised
as far as that allows and nothing else happens. If not, the pipeline moves to a Web
Worker: the core is pure and takes plain data, so the worker is a thin
wrapper around `convertText`, the component debounces and shows the last
result until the next arrives, and the table is built in the worker. The
payload is measured against the study's estimate at the end of stages 3
and 6 in any case, and recorded in docs/calculator.md.

## The first follow-up

Tasks 1.1 to 1.3 are pure leaf modules with no callers and complete
tests, and are the right first review: they fix the rounding modes, the
radius and its rounding-up discipline before anything depends on them.
1.4 is the mechanical widening and can go with them or alone. 1.5 to 1.9
are the ball reaching the display, each a state the app runs in. After
1.11 the plan is re-read against what landed, and stage 2 begins.
