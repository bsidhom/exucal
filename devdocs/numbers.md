# Numbers and precision

Every magnitude the calculator computes with is a `Ball`: an exact
fraction times a power of ten as a midpoint, and a radius bounding how
far that number may lie from the number meant.
[Numbers](../docs/numbers.md) in the user docs gives what a user needs
of the model: exact and inexact values, the digits a line certifies, the
two modes and the size limits. This page keeps the representation and
the mechanism behind those rules, and the decisions with their reasons,
among them the alternatives ruled out.
[Architecture](architecture.md#numbers) says how the rest of the core is
built around the type, and [Built-in functions](builtins.md) says how
each built-in uses it.

The midpoint is an exact fraction rather than an arbitrary-precision
float because almost every unit definition is a rational (`2.54 cm`,
`0.45359237 kg`). A conversion between such units is then exact, and in
exact mode, the default, rounding happens once, at the display. The
power of ten stands beside the fraction so that a value's magnitude
costs nothing: `1e999999999` is a value, not a billion digits. To
**form** a value, on this page, is to build the integer of its full
size, as a billion digits would be built for `1e999999999`. The power of
ten of a value is never formed as a number; where an operation forms
one, as a sum's alignment and the kernel's door do, the significand
limit bounds it as it bounds everything formed
([The significand limit](#the-significand-limit)). The definitions file
holds no irrational literal. The circle constant is the built-in `pi()`,
computed to the precision of the pass an expression is evaluated at and
of the definitions table, the units' values built from `units.txt`,
where a decimal literal for `pi` would be exact to its digits and wrong
past them.

The midpoint-and-radius form is borrowed from ball arithmetic, and
[Arb](https://arblib.org/), now part of [FLINT](https://flintlib.org/),
is the inspiration. Arb's midpoint is a binary floating-point number
rounded to a set number of bits, so a value is exact there only when it
is a whole number times a power of two, and a decimal literal enters
rounded. Here the midpoint is an exact rational scaled by a power of ten
and held in one canonical form: every literal and every factor of the
definitions file enters exactly, a value costs the same whichever
expression produced it, and the price is that a power of two in a
denominator costs more bits than its binary size
([The significand limit](#the-significand-limit)). Three calculators
share the aim of exactness, each by its own route. Android's calculator
from Android 6, whose source project is named
[ExactCalculator](https://android.googlesource.com/platform/packages/apps/ExactCalculator/),
keeps an exact fraction where it can and evaluates the whole expression
as a constructive real otherwise, never rounding a step. A value is
computed on demand to the precision the digits scrolled to need, within
one unit in the last place, and recomputed as the user scrolls rather
than certified to a fixed count.
[Qalculate!](https://qalculate.github.io/) keeps exact fractions and
symbolic forms, computes the rest at the one precision set, and, with
its interval arithmetic on, shows only the digits the interval
guarantees. [Frink](https://frinklang.org/) keeps exact fractions, its
unit definitions included, and computes everything else in floating
point with no error bound unless an interval is asked for. The design
here differs in its mechanism: one canonical form for every exact value,
a ball with an exact midpoint for every inexact one, digits certified by
recomputing at rising precision up to a ceiling, and a refusal, never a
wrong answer, for what the limits cannot hold.

The decisions, each with the section that carries it:

- **Four core types, each adding one concept.** The fraction, the power
  of ten, the radius and the ball are separate types, with the kernel's
  fixed-point value beside them, and the alternatives to each are ruled
  out with their reasons ([The types](#the-types)).
- **The exact operations never round an exact value.** The radii follow
  the elementary propagation rules, computed on coarse bounds so that
  nothing is formed whatever the exponent
  ([Exact operations](#exact-operations)).
- **The kernel is binary, and the base changes only at its boundary.**
  **The kernel** is the set of fixed-point routines every inexact
  function runs on. A value enters it as a fixed-point integer with an
  error count and leaves rounded onto a decimal grid
  ([The kernel's boundary](#the-kernels-boundary)).
- **A root or a power takes the exact case first.** The kernel's root
  comes next, and last log space, `exp(y ln x)` on the kernel
  ([Roots and powers](#roots-and-powers)).
- **The exponent bound is on the value.** A refusal at it needs the
  whole ball past the edge ([The exponent bound](#the-exponent-bound)).
- **A digit is shown only when both ends of the ball round to it**
  ([Certification and the display rule](#certification-and-the-display-rule)).
- **The retry schedule doubles from the digits asked for plus ten.** Its
  ceiling is four times the sum of the precision limit and ten
  ([Working precision and the schedule](#working-precision-and-the-schedule)).
- **Every inexact result is settled onto the working grid.** The grid is
  a little finer than the pass's precision, and an exact value is never
  settled ([Settling](#settling)).
- **Exact mode adds no rounding the user did not ask for**
  ([Exact mode](#exact-mode)).
- **Decimal mode rounds every step once, and the rounded value is exact**
  ([Decimal mode](#decimal-mode)).
- **The significand limit bounds what is formed.** Every size is
  predicted before forming
  ([The significand limit](#the-significand-limit)).
- **`approx` is a function that widens a radius and never narrows one**
  ([approx](#approx)).
- **A value that cannot be computed is a `Result` error.** It is never
  an exception, with one known breach in a root's verification
  ([Failures](#failures)).
- **The display forms no power of ten** ([Formatting](#formatting)).

## The types

[How a value is held](../docs/numbers.md#how-a-value-is-held) names the
numeric types and the canonical form a user relies on. The
representation behind them is a ladder of four types, `Rational`,
`Scaled`, `Radius` and `Ball`, in which each adds one concept and none
stores the concept of the one above it. The kernel's two forms, `Fixed`
and `Floating`, stand beside the ladder, and a `Quantity` is a ball with
its dimension.

### `Rational`

`Rational` (`rational.ts`) is the exact fraction in lowest terms, a
`bigint` numerator over a positive `bigint` denominator, with total
arithmetic and structural equality. It is the significand of a `Scaled`,
and on its own the type of a dimension's exponents, of the `^` exponent
and of the exact value of a radius, which each need a total, small
fraction with no power of ten. `rational.ts` provides the arithmetic and
the comparison, integer powers and the exact case of the n-th root.

### `Scaled`

`Scaled` (`scaled.ts`) is `significand × 10^exp`, the midpoint's type,
with the significand a `Rational` and `exp` a `bigint`. The form is
**canonical**, one form per value: the significand is in lowest terms,
its denominator is coprime to ten (no factor of two or five), its
numerator is not divisible by ten unless it is zero, and zero has `exp`
zero. Equal values then have equal representations, and `equals` is
structural.

A value has exactly one such form because each part of it is forced. The
fraction in lowest terms is unique. The denominator the rule allows is
that fraction's with every two and five taken out, so it is fixed too.
With the denominator fixed, the exponent is the largest that leaves the
numerator a whole number, and the numerator is then whatever is left.
The implementation rests on one invariant, lowest terms, kept by
construction:

- `rational` is the one constructor that reduces.
- Every operation of `rational.ts` preserves lowest terms by its own
  smaller gcds ([Exact operations](#exact-operations)).
- `normalize` in `scaled.ts` relies on the invariant and runs no gcd of
  its own.
- The tests assert the invariant over every constructor that bypasses
  `rational`.

The constructor `scaled(significand, exp)` strips the numerator's
trailing zeros into the exponent and moves the denominator's factors of
two and five out (`1/6` is `5/3 × 10^-1`). It counts a denominator's
fives by dividing by `5^(2^k)` from the largest power worth trying
downward, a logarithmic number of divisions, since one division per
factor is a quadratic loop on a significand full of tens. The form is
internal: `format`, `roundTo`, `toRational` and the ratio notation are
functions of the value, and `2.54`, `254/100` and `127/50` are written
alike everywhere. Rounding to significant digits commutes with the power
of ten, so rounding and formatting act on the significand alone and add
`exp` to the exponent. The digits of `1e999999999`, of its square and of
`exp(1e6)` are written with nothing formed, and the decimal exponent of
any value is the significand's plus `exp`, exact and cheap.

The exponent is a type of its own between the fraction and the ball,
rather than a field on `Rational`, because it changes what the type
promises. With an exponent, `add` and `subtract` can fail
(`1e999999999 + 1` cannot be aligned without forming a number of a
billion digits), and the fraction's other users need a total type. Nor
is the exponent a field of the ball. A midpoint must stand as a number
on its own, with its own comparison, rounding, formatting, certification
and settling, and a parsed literal is a number before it is a ball.

There is one exponent, decimal, and the kernel's binary base never
crosses the kernel's boundary
([The kernel's boundary](#the-kernels-boundary)). Four things produce or
consume a midpoint, and three of them are decimal: a literal or a unit,
which is decimal or rational and exact; the display with its
certification of digits, which is decimal; decimal mode, which is a
decimal grid; and the kernel, which is binary. Every value crosses the
kernel's boundary through a conversion already, so the one base change
goes where the representation changes anyway. An exponent of each base,
a binary one beside the decimal one, is ruled out. It would let a kernel
result and a literal both enter exactly, and settling would stay a
shift, but the mixed base leaks into every operation that brings the two
together: a sum of two large exponents of different bases needs a rebase
in log space, a comparison of two such exponents cannot be decided
without forming one of them, certification and the radius need the
`log2 10` constant, and the display has to fold the binary power into
the significand before it can write a digit. A single binary exponent is
ruled out too: a literal's power of ten could not enter it exactly, and
decimal mode could not hold its own values at large exponents. Binary
floats, or a configurable radix, are ruled out for the same reason at
the level of the whole type: decimal literals would no longer parse
exactly, the display would need a conversion, and nothing a calculator
user types is binary. Binary is the kernel's business alone. The price
of the one decimal base is a division per settle, the rounding of an
inexact result onto the working grid ([Settling](#settling)), in place
of a shift. That division costs several times a shift and is small
against what a whole settle costs ([Formatting](#formatting)).

Two other shapes for decimal mode are ruled out. A second number type
beside `Rational`, with the core generic over the two, doubles the
numeric surface of every built-in. Decimal mode as a rounding step in
the evaluator over the fraction alone, with no exponent, caps a value at
the significand limit's digits, about 19,700 at the default, so that
`exp(100000)` and `gamma(20001)` would fail in the mode whose point is
to represent them. The exponent makes decimal mode a float, and its cost
is confined to `scaled.ts`.

### `Radius`

`Radius` (`radius.ts`) is a coarse binary magnitude,
`significand × 2^exp` with a normalized 30-bit `bigint` significand and
a `bigint` exponent, or the distinguished value unbounded. Every
operation on radii rounds up, so a radius is always a true bound; the
tightness lost to 30 bits is a relative `2^-29`, far below the slack the
propagation rules add. It is binary because the kernel is binary, and
coarse so that propagating it through an expression costs nothing and
never grows. The exact value of a bounded radius is a rational
(`radiusUpper`), obtained when a comparison needs it and never stored.

A float64 is ruled out, although one has precision to spare, because of
range. The radius is absolute, and the product rule scales it by the
other operand's magnitude, so radii span the range of the values
themselves, `10^±(10^18)`, against a float64's `10^±308`. A radius that
overflowed to infinity would be an honest but useless bound on any large
value, and one that underflowed to zero would be a false claim of
exactness. JavaScript also has no directed rounding, so every float64
operation would need a manual nudge up by one unit in the last place.
The exponent is a `bigint` for the same reason: the binary exponent of a
value near `10^(10^18)` is about `3.3 × 10^18`, beyond a safe integer.
Exactness as a flag on values, in place of a radius, is ruled out as
well. The flag is the ball with the radius collapsed to one bit, and it
would have to be replaced the day the first propagation rule is written;
the unbounded radius is that flag already ([Exact mode](#exact-mode)).

### `Ball`

`Ball` (`ball.ts`) is a midpoint beside a radius, and the operations
that compose the midpoint's arithmetic with the radius's propagation
rules. `scaled.ts` knows nothing of radii, and `radius.ts` reads a
midpoint only for its binary bounds (`radiusAboveScaled`, through
`log2Bounds`). An exact value is a ball of radius zero, and `=` in the
display means exactly that. A ball may also carry the flag
`uncertified`, which is decimal mode's alone
([Decimal mode](#decimal-mode)).

### `Fixed`

`Fixed` (`fixed.ts`) is the kernel's representation. A kernel value is
`{ value, error, bits }`: the integer `value` stands for
`value × 2^-bits`, and `error` is an upper bound, in units of `2^-bits`,
on its distance from what it stands for. One such unit is an **ulp**, a
unit in the last place of a kernel value. Every operation updates
`error` by an overestimate that is a few lines of integer arithmetic, so
the bound can be checked by reading. A series runs on such values with
the argument's error included from the start, which propagates the
argument's radius without a separate derivative bound; the truncation
bound of a series is taken at the upper end of the argument's interval.
The point is fixed rather than floating so that a routine can choose its
result's `bits` after its argument reduction, and keep for a result of
magnitude `2^k` as many significant bits as an argument of order one
has. That is how a routine whose result is small or large (`sin` near
zero, `exp` of a large negative argument, a root of a tiny argument)
states its scale, and `shiftFixed` is the exact rebase that moves the
binary point. Every routine works on values of order one after its
reduction, so the absolute error count is a relative error too, and the
count grows by at least one ulp per operation. The headroom for that
growth, the 32 guard bits (`GUARD_BITS`), is counted in bits, the unit
the count grows in, rather than in digits: a series of a thousand terms
spends ten of them.

Three alternatives are ruled out. A ball at every step of the kernel, as
Arb does, is uniform with the value type but costs a radius operation
per arithmetic operation and a second representation to reason about
inside every series. Two integer endpoints cost twice the arithmetic and
a rounding direction to choose per operation. Guard digits with no error
count, the classic approach, are not rigorous and could not produce a
radius at all. The integer count is the cheapest that yields a proof,
and its rules are the textbook ones.

### `Floating`

`Floating` (`fixed.ts`) is a `Fixed` significand with a binary exponent,
`significand × 2^exp`, the form of the results that can be large, the
exponential's and the hyperbolic pair's. `digits.ts` converts one to a
ball; it sits above the kernel, since it calls the kernel's logarithm
and exponential.

### `Quantity`

`Quantity` (`quantity.ts`) is a ball with a dimension
([Quantities, dimensions and kinds](architecture.md#quantities-dimensions-and-kinds)).

`rounding.ts` names the seven rounding modes (`halfEven`,
`halfAwayFromZero`, `halfTowardZero`, `towardZero`, `awayFromZero`,
`ceiling`, `floor`) and is the one place a mode is interpreted:
`divideRounded`, an integer division rounded in a mode. Every rounding
in the core scales its value so that the digits to keep form an integer,
divides there, and scales back. `Precision`, a count of significant
digits, lives there too, with `digitsFor(bits)`, the decimal digits
`bits` binary digits are worth. `bitsFor(precision)`,
`ceil(precision × log2 10)` plus the guard bits, is in `fixed.ts`.

## Exact operations

[Operations that stay exact](../docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions)
states that `+`, `-`, `*`, `/`, a whole-number power and a comparison
are exact on exact values, and
[Values at an edge](../docs/numbers.md#values-at-an-edge) states what a
divisor that cannot be told from zero does.

Addition, subtraction, multiplication, division, integer powers and
comparisons are exact on the midpoints, and an exact result is as long
as it needs to be: nothing in exact mode rounds an exact intermediate to
keep it small. A product or a quotient combines the exponents and fails
only at the exponent bound ([The exponent bound](#the-exponent-bound)).
The radii follow the elementary propagation: a sum's radii add, a
product's radius is `|a| rb + |b| ra + ra rb`, a quotient's is
`(|a| rb + |b| ra) / (|b| (|b| - rb))`, and an integer power of an
inexact base takes the product rule by squaring, settled after each
product. To settle a product is to round it onto the **working grid**,
the decimal digits a pass keeps its inexact midpoints to, with the
rounding charged to the radius ([Settling](#settling)). The magnitudes
in those rules are taken as coarse radii from the binary bounds, so that
nothing is formed whatever the exponent. `radiusAboveScaled` takes them
from `log2Bounds`, which bounds the significand's `log2` from the top
bits of its numerator and denominator through a double, and the
exponent's share, `exp × log2 10`, through a 128-bit fraction. The two
bounds lie within `2^-30` of the truth. Every step rounds up, so a
result's interval contains the exact result over the operands'
intervals, and an exact value stays exact through them. The quotient
rule's divisor is a lower bound on the divisor's distance from zero from
the same bounds, rounded down (`divideRadius`), which forms no rational
and loosens a radius by a few times `2^-29`, one unit of the coarse
type's rounding for each of the rule's handful of roundings.

A divisor whose ball contains zero without being exactly zero cannot be
divided by, since the true quotient may have either sign. That is
`unresolved`, an error kind of its own beside `divisionByZero`, because
the retry loop retries on the first and never on the second;
`1 / (sqrt(2)^2 - 2)` reports it. `unresolved` carries the **edge** the
value's ball reaches across, the point a result depends on (`Edge`: a
point, `"pole"`, or `"bound"`), and the message says the value cannot be
told, at this precision, from that edge. Whether a divisor contains zero
is decided as every comparison of a midpoint with a radius is
([Comparison](#comparison)), a midpoint the bounds cannot tell from the
radius counting as within it, so that the answer is `unresolved` rather
than a quotient of the wrong sign. A ball of unbounded radius divides
when its midpoint is nonzero, giving an unbounded quotient, and is
`unresolved` when its midpoint is zero. An exact zero times anything,
unbounded included, is exact zero, since unbounded stands for a bound
not known rather than an infinite value; otherwise unbounded absorbs.

`rational.ts` reduces with the smallest gcds the operands allow, each a
textbook rule: a sum and a difference by Henrici's rule (the gcd of the
denominators, then of that with the new numerator), a product by
cross-cancellation (the gcd of each numerator with the other
denominator), a quotient as the product by the divisor's reciprocal (the
gcd of the two numerators and of the two denominators), and an inverse
or a negative power by swapping with no gcd. So a quotient is reduced
where it is formed, by those two gcds, and nothing reduces it again. The
rules are correct only for operands in lowest terms, the invariant the
one reducing constructor keeps ([The types](#the-types)). The gcd is
Lehmer's (Knuth's Algorithm L), which takes its steps on the leading
bits in doubles and applies their cofactors to the `bigint`s some
twenty-six bits at a time, stripping the common power of two first. It
is still quadratic, but about forty times cheaper than Euclid's at
65,536 bits; [Benchmarks](benchmarks.md) holds the figures. A half-gcd,
which is subquadratic, gains only above `2^16` bits and is left for a
larger limit.

### Sums and alignment

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold)
states that a sum whose operands cannot be aligned within the
significand limit is refused in exact mode, and
[The two modes](../docs/numbers.md#the-two-modes) gives its decimal-mode
counterpart, the correctly rounded sum.

To add `m1 × 10^e1` and `m2 × 10^e2`, the significand of the larger
exponent is multiplied by `10^|Δe|` and the two fractions are added,
which costs `|Δe| log2 10` bits and is exact; the sum is renormalized.
`add` fails `tooLarge` when that shift exceeds the significand limit:
the exact sum exists and cannot be held. `addBalls` then applies the
rule for what the result is:

- Two exact operands in exact mode are `tooLarge` at the sum when their
  alignment does not fit (`1e999999999 + 1`); exact values never round.
- Otherwise the result is inexact, and the evaluator was about to settle
  it, so it is settled a step earlier. Each inexact operand is rounded
  onto the working grid. An exact operand of more bits than the grid is
  put on the grid too, rounded to the grid's digits with the rounding
  charged to the radius, as `approx` would (`onGrid` in `ball.ts`, the
  settle's rounding applied to an exact value), so that
  `(1 + 1/3^41300) + sqrt(2)` keeps its digits where the alignment
  passes the limit. An exact operand already on the grid stays exact and
  costs nothing. If the two then align within the limit they are added
  exactly. If they still do not, their exponents differ by more than the
  limit's digits less twice the grid's digits, so the smaller lies below
  the working precision of the larger and is absorbed into the radius,
  as a floating-point sum absorbs it: `sqrt(2) + 1e999999999` is
  `≈ 1e+999999999`, the root inside the radius.
- In decimal mode two exact operands whose sum cannot be aligned are
  decided without forming the sum (`decimalSumApart`), by the
  **neighbor rule**. The smaller operand lies below half a unit in the
  larger's last digit, so in a nearest mode the result is the larger
  operand, and in a directed mode the larger operand or its neighbor at
  the digits, by the smaller's sign.
- The settle-first path is taken on `tooLarge` alone. A sum that aligns
  and whose value passes the exponent bound is held to the bound as a
  product is ([The exponent bound](#the-exponent-bound)).

| You type (decimal mode, eight display digits) | Exucal shows             | Note             |
| --------------------------------------------- | ------------------------ | ---------------- |
| `1e999999999 + 1`                             | `= 1e+999999999`         | under `halfEven` |
| `1e999999999 + 1`                             | `= 1.0000001e+999999999` | under `ceiling`  |

On `Scaled`, a sum, a product and a quotient each take the significand
limit and return a `Result` for it and for the exponent bound. On balls
each takes the context: a sum for its precision, its mode and its limit,
a product and a quotient for the limit their prediction needs and for
the working grid an operand is put on when the prediction refuses the
exact step ([The significand limit](#the-significand-limit)).

### Comparison

[Comparison and equality](../docs/numbers.md#comparison-and-equality)
states when a comparison is decided and states what a range that ends
exactly on the other value does. Every comparison in the core is written
on two primitives: `compare` on `Scaled`, which is total, and `position`
on `Ball`, which places a ball against a point.

`compare` on `Scaled` is total and cheap: by the signs, then by the
decimal exponents (the significand's from its digit counts, decided by
one comparison, plus `exp`, exact), and, when those are equal, by exact
alignment, whose shift is then bounded by the significands' own digit
counts and never by the significand limit. `1e999999999` compares with
`1`, with `1.0000000001e999999999` and with a kernel result entered as a
decimal without forming anything.

`position` in `ball.ts` is the one comparison of a ball with a point, on
which the built-ins' domain checks, the logarithm's base against one,
the edges at which the rounding functions jump and a unit list's counts
are written. It is exact where the radius's power of two can be formed,
which is every radius whose binary exponent is within `2^16`
(`FORMABLE_RADIUS_BITS`), every radius a pass's grid produces. Forming
the power of two of such a radius costs a canonical form of up to about
150,000 bits, once per comparison, which the significand limit does not
hold: the limit bounds the results of the expression's operations, not
an intermediate a comparison forms and drops
([The significand limit](#the-significand-limit)). Otherwise it decides
by the coarse bounds, and where they cannot tell it answers "across",
the conservative answer, which can only turn a verdict into undecided
and never into a wrong one. A ball is closed, so `position` tells a
**touch**, a ball whose end lies exactly on the point (`touchingAbove`,
`touchingBelow`), from a **straddle**, a ball reaching across it
(`straddles`), and its callers decide what a touch means. Every edge
check of the built-ins and every edge of the rounding functions treats a
touch as a straddle, since the value may lie on the edge, where the
answer jumps. A unit list's count takes the integer nearest its ratio's
midpoint whether the ball touches that integer or reaches across it. A
condition of a defined function lets a touch decide a non-strict
comparison and leaves a strict one undecided
([The check at a call](functions.md#the-check-at-a-call)). `orderOf`
places two balls against each other for those conditions:

- two exact values exactly, as the numbers they are, so that the
  comparison is never refused for size;
- an inexact value against an exact one directly through `position`,
  rather than through a difference whose rounding could only widen it;
- two inexact values through their difference against zero. That
  difference always aligns, the smaller operand absorbed into the radius
  ([Sums and alignment](#sums-and-alignment)), and it counts as across
  zero when it cannot be formed as a value, past the exponent bound or
  straddling it.

## The kernel's boundary

A kernel routine runs on `Fixed` values of order one after its argument
reduction, and the base changes at the kernel's two doors, the
conversion in and the conversion out. **The hard bound** is the most the
significand limit can be set to, `MAX_SIGNIFICAND_LIMIT_BITS`
([The significand limit](#the-significand-limit) gives its value and its
reasons).

- **In.** `fixedFromScaled(s, bits)` is a division,
  `(num × 2^bits) / (den × 10^-exp)`, or with `10^exp` in the numerator,
  for a value whose power of ten can be formed within four times the
  hard bound. A value past four times the hard bound is a precondition
  failure, which every routine that takes the value itself bounds first
  ([Huge and tiny arguments](builtins.md#huge-and-tiny-arguments)). Four
  times is enough for the most a built-in hands the kernel at any limit
  the settings allow: a significand within a significand limit of `S`
  bits at a magnitude between `2^-S` and `2^S`, which those bounds keep.
  Its power of ten is then of at most `2S` bits, so the fraction the
  door forms has a part of a little over `3S` bits. At the hard bound
  `H`, where `S` is `H`, that is a little over `3H`, which `4H` holds
  and `3H` would not. A nonzero value below half an ulp at the bits
  asked is zero within one ulp, decided from the coarse bounds with
  nothing formed, which the division's rounding would give it too. So
  the door takes an argument of any exponent within that precondition,
  however small, and the log-space power of a tiny exponent reaches the
  kernel as zero within an ulp.
- **Out.** `fixedToBall(f, digits)` rounds `value × 2^-bits` to nearest
  at the working grid's digits (`workingDigits`). The rounding is a
  multiplication by a memoized power of ten and a shift
  (`fixedToScaled`, which `fixedToBall` wraps). Beside the kernel's own
  error count, the radius takes half a unit in the last digit for the
  rounding, and only when the rounding moved the value, so that a kernel
  value of no error on the grid is exact. A dyadic `d × 2^-k` entered
  exactly would be `d × 5^k × 10^-k`, whose numerator has the bits of
  `d` plus `k log2 5`, more than three times the size of a `d` of `k`
  bits, for no information. That is why a kernel result is rounded as it
  leaves: the rounding is the settle every inexact result gets in any
  case. A `Floating` leaves through `floatingToBall` in `digits.ts`:
  exactly, through `floatingToFixed`, for an exponent that can be formed
  within the significand limit, and otherwise in log space. The decimal
  exponent is `floor(exp log10 2 + log10 significand)` and the leading
  digits `10^fraction`, through `lnFixed` and `expFixed` at the working
  bits plus the bit length of the exponent plus a margin, the
  computation's error carried in the kernel's error counts and added to
  the radius. The conversion costs a logarithm and an exponential at
  those bits; `ln 2` and `ln 10` come from their memos, whose margin
  covers the exponent's bits at every pass
  ([Memoized constants](#memoized-constants)).

`expFixed` renormalizes after each squaring of its squaring loop: the
significand is kept to the working bits and the rest moved into the
exponent, so `exp(1e6)` costs what `exp(1)` costs plus a squaring per
bit of its magnitude, twenty for `exp(1e6)` and some sixty at the
exponent bound. A negative argument is the same loop with the exponent
going negative rather than a value with a million fraction bits. An
argument whose interval is wider than one takes another route: the
result is zero within the exponential of the interval's signed upper
end, and nothing is halved or squared. The upper end is formed exactly,
and its exponential's value plus its error bounds the exponential of
every value in the interval. So `exp(approx(1e60) - approx(1e60))` at
the first pass of 32 display digits, `0` within about `2e9`, costs
milliseconds. Squaring the whole interval instead would double the bit
length of a relative error of `e^(2 × 10^9)` at every step. `sinh` and
`cosh` inherit the range through the exponential, `E = e^|x|`. For an
exponent beyond half the working bits the reciprocal `1/E` lies below an
ulp of `E` and is folded into the error, so neither function forms it,
and `tanh` saturates without forming anything. A power in log space
inherits the range through `expFixed`. A large decibel is an exact power
of ten, which the exponent takes: `decibel(1e30)` is refused at the
bound by the exact power, before any exponential is reached.

### Memoized constants

[What costs time](../docs/numbers.md#what-costs-time) says that some
built-ins pay a cost once, the first time they are called at a new
precision, for a constant they then keep.

Five constants are memoized:

- `pi` (`constants.ts`), by Chudnovsky's series with binary splitting,
  its tail bounded in `constants.ts`;
- `e` (`eSeries` in `constants.ts`), the series `Σ 1/n!` by binary
  splitting;
- `ln 2` and `ln 10` (`fixed-log.ts`), from `atanh(1/3)` and
  `atanh(1/9)` by binary splitting;
- `ln π` (`fixed-gamma.ts`).

Each is computed once, at the ceiling of the retry schedule plus a
margin of 256 bits (`MEMO_MARGIN`), on its first use, whatever the
precision of that first request. Every request at or below that, which
is every request the retry loop can make, is truncated from the memo.
The cut (`truncateFixed`) converts the error count to the new ulps
rounded up and adds one for the bits dropped, `ceil(error / 2^k) + 1`;
rounding the count down would lose up to an ulp (`3/4 ± 2/4` cut to
whole units is `0 ± 2`, not `0 ± 1`, since the interval reaches `5/4`).
A request at a higher ceiling, after the precision limit is raised,
replaces the value; a lower one leaves it. So the footprint is fixed by
the ceiling, about 1.7 KB per constant at the default ceiling of 4,040
digits, never by what the user has typed, and needs no eviction policy;
the largest it can be is set by the most the precision limit can be,
which follows from the hard bound
([The significand limit](#the-significand-limit)). The core has no
globals, but a memo of a pure function of its precision is unobservable
through the core's results, as `lazy` in `parser.ts` is.

The margin serves two purposes. The argument reduction of `sin` and
`cos` needs `pi` to the working bits plus the argument's bit length,
which at the ceiling pass exceeds the ceiling by that length, so with
the margin every argument below `2^256` is served from the memo at every
pass. And the margin holds the guard bits that the Gamma family and the
logarithm add above a pass's bits, so that `ln 2` and `ln π` are served
from their memos inside an `lgamma` at the ceiling pass. Two kinds of
request ask for more bits than the memo holds: the reduction of a larger
argument (under the significand limit; an argument beyond that is
refused), and a logarithm of `beta` at a larger argument, since `beta`
takes its three logarithms at the working bits plus the bits of its
largest argument's magnitude. Each computes the constant for the call
and keeps nothing, so `sin(1e5000 radian)` pays for `pi` at its
argument's bits each time it is typed, at most `pi` to the significand
limit plus the ceiling; the benchmarks measure it. Every memo of the
core is filled on first use and none at module load. The build of the
definitions table is `pi`'s first use, through the angle units, so the
first build fills the memo of `pi`, and `e`, `ln 2`, `ln 10` and `ln π`
wait for the first expression that needs them. The Bernoulli ratios the
Gamma family's series take hold the same margin for the same reason,
memoized by the count the series reserve and the bits they ask for
([The Gamma and Beta families](builtins.md#the-gamma-and-beta-families)
owns that memo and its footprint).

Stored digits of `pi` or `e` are ruled out. Chudnovsky's series computes
`pi` to any precision the settings allow in a time nobody notices: as a
rough, illustrative figure, a thousand digits in a fraction of a
millisecond and a hundred thousand digits in a few hundred milliseconds.
A Machin formula is slower by a small factor, and spigot algorithms are
quadratic and buy nothing. Stored digits compress to no better than
their entropy, about 0.42 bytes a digit, so ten thousand digits would
add some 4 KB to a payload of a few tens of kilobytes compressed, for a
range that costs milliseconds to compute. They buy nothing at any
precision a user will set: the constants are computed on demand and
memoized.

## Roots and powers

[Operations that stay exact](../docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions)
states that a built-in returns an exact result in its exact cases, and
[Roots and powers](../docs/builtins.md#roots-and-powers) gives the
user's side of the roots and of `pow` against `^`. A root or a power
takes the first of three routes that applies: the exact case, the
kernel's root, and log space.

A root that is rational (`sqrt(9/4)`, `sqrt(2.25)`, `cbrt(-8)`) is
detected and returned exactly, and `(4 m^2)^(1/2)` is exactly `2 m`.
`exactRoot` divides the exponent by the degree, folds the remainder's
power of ten into the significand when that power can be formed within
the limit, and returns the rational root when both the numerator and the
denominator are perfect powers; so `sqrt(1e999999998)` is exactly
`1e499999999`. Otherwise `rootBall` reduces the ball before the kernel
sees it, since a tiny ball converted at the working bits would lose its
digits. It takes an exact power of ten off the exponent. It scales the
significand by an exact power of `2^n`, so that the significand lies
within a factor of `2^n` of one; the root undoes that scaling as a power
of two. It converts the scaled significand to the kernel at the working
bits plus a guard, and plus as many more bits as the significand still
lies below one, up to the working bits, so that no digit is lost. It
takes the root there (`sqrtFixed`, `rootFixed`), scales back and hands
the kernel's value back through `fixedToBall`
([The kernel's boundary](#the-kernels-boundary)). The radius that exit
charges covers the argument's own, so an inexact argument gives an
inexact root with a bound, and `sqrt(1e999999999)` is
`≈ 3.1622777e+499999999` on the first pass. The scalings are exact
(`scaleByPowerOfTwo` cancels the power against the trailing zero bits
rather than running a gcd, and `shiftRadius` moves the exponent).

The kernel's roots are the square root and the root of any degree. The
square root is Newton on the reciprocal square root, multiplications
only with the precision doubling, since V8 divides big integers
quadratically and an integer square root by division would cost about
ten times `pi`'s whole series at a hundred thousand digits. It is
verified by squaring: with `s` the computed root and `D` a bound on the
distance of `s^2` from the argument, the error is at most
`D s / (2 s^2 - D)`, about `D / 2s`. The looser `D / s` would double the
argument's error at every one of the eight square roots the logarithm's
reduction takes
([The elementary routines](builtins.md#the-elementary-routines)). The
root of any degree up to `2^32` (`ROOT_DEGREE_LIMIT`) is Newton in fixed
point from a first guess taken through a double, so that the cost is
logarithmic in the degree and no integer of `degree × bits` bits is ever
formed. Either root's error is verified by raising the result back to
the power rather than read off the iteration
(`|y - a^(1/n)| <= (4 |ε| / n) y` for `y^n = a (1 + ε)` with
`|ε| <= 1/2`), the distance taken over the whole of the argument's
interval so that the argument's own error enters the same bound. A
larger degree would overshoot from the double's first guess, good to
`2^-52`, so that `n × 2^-52` must stay well below one, and fail the
verification, which needs `n × 2^-bits` below one half.

Three cases go to one helper, `rootInLogSpace`, `x^(1/n)` as
`exp(ln x / n)`:

- a degree past the limit (`pow(3, 1e-30)`, whose root is the
  `10^30`-th);
- a significand whose remainder's power of ten does not fit the
  significand limit;
- a significand scaled so far below one that its exponent, less the
  degree's multiple, passes the working bits, which the conversion would
  turn to zero within an ulp and report as a false `unresolved`
  (`(7^-8000)^(1/99999)` is `≈ 0.85583783`).

The helper maps the `unresolved` at zero of the log-space power
(`powLogSpace`, below), and only that, to `undefined`, so that
`rootBall` keeps its odd and even handling. A negative ball of odd
degree is the negated root of its magnitude. A ball containing zero is
exact zero if exact. Otherwise, under an even degree it is `unresolved`,
since whether there is a real root at all depends on the sign, and under
an odd degree it is a ball around zero whose radius is the root of the
farther end. An even root of a ball negative throughout is
`negativeRadicand`; a ball reaching across zero is the `unresolved`
above, never `negativeRadicand`. An argument of unbounded radius gives
the root of its midpoint with an unbounded radius, its midpoint's sign
deciding `negativeRadicand`. A root of degree three or more of a wide
positive ball still throws in the kernel's verification
([#79](https://github.com/bsidhom/exucal/issues/79)).

`powBall(b, n, context)` for a `bigint` `n` has two routes. On an exact
base it takes the exact power, held to the significand limit by its
prediction ([The significand limit](#the-significand-limit)). On an
inexact base it takes exponentiation by squaring with settling at every
product, so `sqrt(2)^1000` costs a multiplication or two per bit of its
exponent at the working precision. Only the magnitude of such a result
is guarded, by the classifier of
[The exponent bound](#the-exponent-bound), which holds a result to the
bound by the logarithm of its magnitude: a base whose ball contains zero
is tested against the top edge alone, and a zero midpoint's power takes
its radius from the radius's logarithm times `n`, not by squaring. A
negative `n` inverts by the division rule, so a negative power of a ball
around zero is `unresolved`.

`powRationalBall(b, p/q, context)`, which `^` and the built-in `pow`
share, has three routes. `exactRoot` on the base comes first, so
`8^(2/3)` is exact without forming `64`, and `x^(p/q)` is exact when `x`
is a perfect `q`-th power. Otherwise, when `x^p` fits the significand
limit, the route is the root of the power, root last so that the one
inexact step comes last; it also serves a negative base under an odd
root. Otherwise the route is `exp(y ln x)` on the kernel
(`powLogSpace`), for a bounded base positive as rationals and any
bounded exponent, negating by symmetry for a negative base under an odd
root with an odd numerator. `lnScaled` scales the base to order one
before the conversion and takes the logarithm at the working bits plus
the magnitudes of the exponent and of the logarithm, so that the product
keeps the working bits, and `expFixed` takes the exponential. So
`2^0.1234567` and `pow(10, 2.3456789)` are values with a radius, since
`2^1234567` fits no significand limit, and `10^23456789` is exact in the
exponent but its root leaves `10^3456789` to the kernel, which the limit
does not hold: log space gives up exactness only where none was
reachable. A base straddling zero whose power does not fit stays
`tooLarge`, since its interval's result does not fit either. `^` and
`pow` still disagree on a dimensionless base with an exact exponent the
`^` grammar cannot form, the table's last two rows
([#88](https://github.com/bsidhom/exucal/issues/88)).

| You type           | Exucal shows                                       | Note                                                                                  |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `8^(2/3)`          | `= 4`                                              | the exact root first                                                                  |
| `2^0.1234567`      | `≈ 1.0893418`                                      | log space: `2^1234567` fits no limit                                                  |
| `7^(100000/3)`     | `≈ 8.6033411e+28169`                               | log space: the power passes the limit                                                 |
| `pow(3, 1e-30)`    | `≈ 1`                                              | a root of degree `10^30`, in log space                                                |
| `2^1e-30000`       | past the significand limit, however it is computed | the `^` exponent is a `Rational` with no power of ten, so `1e-30000` cannot be formed |
| `pow(2, 1e-30000)` | `≈ 1`                                              | where `^` refuses, `pow` computes                                                     |

## The exponent bound

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold)
states the bound, that it is on the value's magnitude and not on the
canonical form, and what a refusal at it needs. The bound is enforced at
two kinds of site: a check on the exponent where exponents combine, and
a classifier in the functions whose result is an exponential.

A value is within the bound when its decimal exponent,
`floor(log10 |v|)`, the exponent the display writes, lies within
`±MAX_EXPONENT`, `10^18`; zero is within at any exponent. The bound is
on the value, not on the representation: the canonical `exp` may lie
above the value's decimal exponent by up to the denominator's digit
count, or below it by up to the numerator's, and so pass `±10^18` while
the value is within. Nothing needs it to stay within. The 128-bit
`log2 10` of `log2Bounds` contributes an error below `2^-68` there, well
inside the `2^-30` the bounds allow, and every `Number` taken of an
exponent is guarded first. The bound is on the value because it exists
so that a value can always be written, and a refusal at it must
therefore never be false about the value; the significand limit is on
the representation for the opposite reason, that it bounds what the
device forms ([The significand limit](#the-significand-limit)). Holding
the canonical `exp` to the bound everywhere instead is ruled out. It
would refuse `1e1000000000000000000 / 3 * 10`, whose value is within the
bound, with a message saying its exponent passes `10^18`, which is false
about the value. It would make whether a value is held depend on whether
it is exact, since an exact fraction and its settled form can lie on
different sides of such an edge. And it would have to overrule
`powerRefusal`, which already reads the value, for no gain.

| You type                         | Exucal shows                       | Note                                               |
| -------------------------------- | ---------------------------------- | -------------------------------------------------- |
| `1e1000000000000000000 / 3 * 10` | `≈ 3.3333333e+1000000000000000000` | a value, though its canonical exponent is one past |
| `1e-1000000000000000000 / 7`     | too small to compute               | `underflow`, though its canonical form is within   |
| `0.001e1000000000000000003`      | `= 1e+1000000000000000000`         | the parser leaves a literal to the constructor     |
| `0e2000000000000000000`          | `= 0`                              | zero is within the bound at any exponent           |
| `1e1000000000000000001`          | refused as it is typed             | the same `overflow` a computed value past it is    |

`powerOfTenRadius(k)` gives a radius at or above `10^k` from the same
bounds with nothing formed. Every site that needs only the radius of a
power of ten reads it: a root's power taken off, `lnScaled`, `approx`'s
unit, the settle's half unit. It takes `|k|` below `2^90`, within which
the bounds keep their accuracy (they keep it to about `2^97`).
`scaled()` checks the value's exponent only when `|exp|` lies within a
band of the bound (`BOUND_BAND`, four hundred million digits, more than
any `bigint` holds, V8 capping one at `2^30` bits, about 323 million
digits), with a fast path for an integer significand's digit count, so
the common case costs one comparison. Failing it is an `overflow` above
the bound or an `underflow` below it, errors of `Scaled`, and the check
runs wherever exponents combine, in `multiply`, `divide` and `pow`, so
that `10^1e30` and `exp(1e30)` fail cleanly before anything is computed
rather than loop or form an exponent that could not be formatted. A
literal past the bound is the same `overflow`, refused as it is typed,
worded by the parser from the exponent of its value.

A ball is held to the bound by every value in it, and a refusal needs
the whole ball past the edge. A result that passes the bound for some
values of a ball and not for others is `unresolved` at the edge
`"bound"` ("the point where the result passes the exponent bound"), as a
divisor straddling zero is `unresolved` at zero, since the answer, a
value or a refusal, depends on which side the true value lies, and a
refusal is final and must never be wrong. The retry loop narrows the
ball until that is decided. So:

- A product or a quotient with an inexact operand is `overflow` or
  `underflow` only when its whole ball lies past the bound:
  `|mid| - rad` at or above `10^(10^18 + 1)`, or `|mid| + rad` below
  `10^-(10^18)` with the ball excluding zero. The coarse bounds decide
  first. Within their slack, which no pass narrows, the exact distance
  of `|mid|` from the power of ten decides, formed from the midpoint's
  digits (`held`, `againstPowerOfTen`). A ball containing zero whose
  midpoint passes below is zero within `|mid| + rad`. Anything else, a
  result whose `|mid| + rad` reaches the top included, is `unresolved`
  at the bound. A ball of unbounded radius keeps its convention: its
  midpoint alone is held to the bound.
- A sum that aligns and whose value passes the bound is held the same
  way: two exact operands are refused in either mode
  (`5e1000000000000000000 + 5e1000000000000000000`), and an inexact sum
  whose ball reaches back within the bound is `unresolved`
  (`approx(5e1000000000000000000) + 5e1000000000000000000`, whose
  midpoint sits on the bound at every precision, so the retry loop ends
  with the `unresolved` message, as `1 / (approx(1) - 1)` does).
- A guarded built-in computes a result only when every value lies within
  the bound, with a margin for the kernel's error. One classifier in
  `ball.ts` works on an interval `[L_lo, L_hi]` that bounds the natural
  logarithm of the result's magnitude, against the edges
  `U = (10^18 + 1) ln 10` and `D = -10^18 ln 10` taken from the memo of
  `ln 10`, with a margin `m` that covers the kernel's error and half a
  unit of the working grid, `2^(40 - bits)` for a kernel at `bits` bits,
  forty bits above an ulp (`MARGIN_BITS`). Its verdict:

  - `overflow` when `L_lo >= U` is certified;
  - `underflow` when `L_hi < D`;
  - compute when `D + m <= L_lo` and `L_hi < U - m`;
  - `unresolved` at the bound otherwise.

  The coarse bounds decide first (`log2` of radii, and near one the
  exact difference from one), and only within their slack is the
  interval formed on the kernel, so an exact argument is left
  `unresolved` only when it lies within the ceiling's precision of an
  edge. Each site has its own `L`:
  - `classifyExp` works on `x` itself.
  - `classifyHyperbolic` works on `|x| - ln 2`, widened by the working
    ulp on each side, against the top edge alone; `sinh` and `cosh` are
    `overflow` for either sign.
  - `classifyPower` works on `y ln x` for `powLogSpace`, and on
    `n ln |b|` for `powBall`. It runs before `lnScaled` is asked for the
    bits that `y`'s size needs. When the bound on `|y ln x|` is below
    `2^-bits`, the result is one within twice it, without the kernel.
    When the bits the decision would need pass the significand limit,
    the answer comes from the bound or is `tooLarge`.
  - `gamma` classifies its `lgamma` ball through `classifyExp`.
  - `erfc` goes through the upper incomplete gamma function of order one
    half, whose exponential is classified on the exponent `s ln x - x`,
    less the logarithm of its prefactor, with the square of the argument
    for `x`, so that the leading term is `-x^2`. The incomplete
    functions classify their own exponents the same way
    ([The Gamma and Beta families](builtins.md#the-gamma-and-beta-families)).
  - `floatingToBall` classifies its decimal exponent's interval too, and
    handles its own rounding's carry at the top.

  When a power is `unresolved` at the bound, `pow` blames the argument
  whose radius contributes more to `y ln x`, so that the message names
  it (`logPowerBlame`).

A retryable error kind of its own for a result straddling the bound is
ruled out: it would cost as many sites, be a second word for what
`unresolved` already means, and need a second retry predicate kept in
step with the first.

Within the bound the exponential family's results span the whole range
of exponents. The threshold for `exp` is an argument at
`(10^18 + 1) ln 10`, about `2.3026e18`, throughout its ball. An argument
whose ball reaches across an edge, because its radius reaches across, is
retried until the ball is within the bound or past it, or the retries
run out, when the message says the value cannot be told from the point
where the result passes the bound. A rule on the midpoint would be
wrong: it would refuse `exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` for
good, since its first pass puts the midpoint past the edge though the
argument is `1.5e18`.

| You type                                  | Exucal shows                      | Note                                                             |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| `exp(1e6)`                                | `≈ 3.0332154e+434294`             |                                                                  |
| `exp(1e18)`                               | `≈ 4.4784623e+434294481903251827` | an exponent of eighteen digits                                   |
| `exp(2.3e18)`                             | `≈ 3.9591004e+998877308377479203` | within the threshold                                             |
| `exp(2.31e18)`                            | too large to compute              | past it throughout its ball                                      |
| `exp(-1e999)`                             | too small to compute              | its exponent falls below `-10^18`                                |
| `exp(approx(1e999) - approx(1e999 - 5))`  | `≈ 148.41316`                     | `5` within about `2e948` at the first pass; retried until within |
| `exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` | `≈ 2.9970458e+651441722854877741` | the midpoint of the first pass lies past the edge                |

The settle meets the bound at its two edges ([Settling](#settling)), and
so does the display
([Certification and the display rule](#certification-and-the-display-rule)).

### Which limit a refusal names

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) says
that a refusal names the limit it passes and says what the message
suggests.

Each limit refuses with an error of its own, so that the message can say
which limit the user can change, or that none helps: the fraction's
`tooLarge` (`rational.ts`) for the significand limit, and `overflow` or
`underflow` of `Scaled` (`scaled.ts`) for the exponent bound, since only
a value with an exponent can pass it. `Refusal` is the three together,
and `isRefusal` tells them from the other errors; `BallError`,
`BuiltinError`, `EvaluateError`, `ConvertError` and the grammar's
rejections forward the kind. The retry loop never retries a refusal. The
retries inside a **node**, one operation of the expression tree as the
evaluator walks it, the user docs' step, belong to the operations, not
to the loop: an exact operand put on the grid and a quotient taken again
([Working precision and the schedule](#working-precision-and-the-schedule),
[The significand limit](#the-significand-limit)). The messages, as the
tests pin them:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
"exp(-1e999)" is too small to compute: its exponent would fall below -10^18.
```

The first's second sentence is the remedy a refusal carries when
`approx`, decimal mode or a wider limit would compute the value (`fits`
in [The significand limit](#the-significand-limit)), and a refusal that
passes the limit however it is computed says so in its place.

A refusal at the bound names its side, `overflow` above or `underflow`
below. In `scaled()` the side is the sign of the exponent that passes
the bound. In the guards it is the sign of `exp`'s argument, of `y ln x`
in `powLogSpace`, and of the midpoint's side of one in `powBall`,
flipped for a negative power. An exact power is told by its decimal
exponent rather than by the check that fails first (`powerRefusal`):
`7^1e19` is refused by the significand limit's prediction and reported
as an `overflow`, since its value is past the bound, which no setting
moves. `2.54^1e18`, whose canonical exponent `-2 × 10^18` is past the
bound below, is `10^(0.40 × 10^18)`, within it, and is `tooLarge`, the
significand limit's. The side is told exactly, by comparing the base's
magnitude with one, and the size by bounds on the exponent's logarithm,
taken for a base within `2^-30` of one from its exact difference from
one, so that `1.0000000001^1e30`, about `10^(4.3 × 10^19)`, is too
large. Within a relative `2^-20` of the bound in the exponent's
logarithm, the margin the power's check keeps beyond the bounds' own
`2^-30` (`POWER_MARGIN`), the refusal stays the significand limit's:
`7^1.1832946e18`, about `10^(10^18)`, is `tooLarge`, where `7^1.1833e18`
is an `overflow`. A product or a quotient past both limits is reported
at the bound, read off the operands' decimal exponents
(`pastBoundBetween`); when some exponent the result can have lies within
the bound, it is `tooLarge`. A sum never faces the choice: a sum that
aligns and passes the bound is `overflow` or `underflow`, and a sum that
cannot be aligned is `tooLarge` or, with an inexact operand, takes the
value of its larger operand, which is within the bound.

### Why the exponent bound stays at `10^18`

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) says
that the bound is not a setting, that a higher one is ruled out, and
that log space is the way to work past it. The reasons are four, and
they are the implementation's.

The exponent is a `bigint`; `10^18` is a check on it, not a storage
limit, and it is kept by decision. A result beyond it is taken in log
space: `1e999 / ln(10)` is the decimal exponent of `exp(1e999)`, and a
quotient of exponentials is the exponential of a difference,
`exp(1e999) / exp(1e999 - 5)` being `exp(1e999 - (1e999 - 5))`. `approx`
has no part in it: it never changes an exponent, so a result past the
bound is refused with it or without it ([approx](#approx)).

- **Cost.** The kernel squares once per bit of the argument, each
  squaring at the working bits plus as many bits as the argument's
  magnitude has, so the cost of `exp` grows at least as the square of
  the argument's length. In a scratch build with the bound raised (and
  `MOST_MAGNITUDE` in `fixed-exp.ts` raised to match), the first pass of
  `exp` at 32 digits takes milliseconds for `exp(1e100)` and seconds
  once the argument has a few thousand digits, as rough, illustrative
  figures, and anything past about `exp(1e500)` would exceed, for one
  pass on every keystroke, the default budget of the probe, the timing
  of the device that recommends the limits
  ([Probe budget and "Measure this device"](../docs/settings.md#probe-budget-and-measure-this-device)).
- **Soundness.** Parts of the number type are exact only within the
  bound: `log2Bounds` and `decimalExponentOfLog2` take the exponent
  through the 128-bit `log2 10`, which its comment sizes for an exponent
  at the bound (`2^-68`), and every radius taken from a midpoint, the
  product rule, certification and the display's bound rest on them. An
  exponent of 3,300 bits would put the error near `2^3200`. The
  classifier's edges are the bound's. In such a build the digits are
  right by the construction of the midpoint, and no certificate vouches
  for them.
- **A bound is needed anyway.** `exp(exp(1000))` has a 434-digit
  exponent, and `exp` of that has an exponent of `10^434` digits, which
  no `bigint` holds. Raising the bound moves the wall without removing
  it.
- **Little to show.** An answer beyond the bound is mostly its exponent:
  32 digits of `exp(1e999)` take 1,034 characters, where log space gives
  the part that can be read.

Raising the bound is ruled out on those grounds. It would take four
things:

- `MAX_EXPONENT` and a reason for its new value; one candidate is to tie
  it to the significand limit, an exponent of as many bits as a
  significand may have.
- The classifier's edges and `MOST_MAGNITUDE`.
- `log2 10` computed to the exponent's bits plus a margin, from a memo.
- A display for an exponent of thousands of digits.

The rule for a pass whose argument is too wide for the result to have a
digit, `unresolved` at the bound, would stay. A setting for the bound is
ruled out as well: it is a constant, generous and finite, and nothing a
user computes needs `10^(10^18)`.

`approx` would not help even if the bound were raised, because of what
the exponential does to a radius. `exp(x ± r)` is `exp(x)` times a
factor between `e^-r` and `e^r`, so the argument's absolute radius
becomes the result's relative error, and `exp` of a large argument needs
that argument to many more digits than the result shows. The relative
precision of `approx(1e999)` bounds the precision of the result's
logarithm, not of the result. At 32 display digits, with the default
precision limit of 1,000 and the default significand limit of 65,536
bits, the schedule gives:

| Pass | Working grid (digits) | Radius of `approx(1e999)` | `exp` of it, known within | Exponent digits known |
| ---: | --------------------: | ------------------------: | ------------------------- | --------------------: |
|    1 |                    52 |                  `1e+948` | a factor of `e^(10^948)`  |             51 of 999 |
|    2 |                    94 |                  `1e+906` | a factor of `e^(10^906)`  |                    93 |
|    3 |                   178 |                  `1e+822` | a factor of `e^(10^822)`  |                   177 |
|    4 |                   346 |                  `1e+654` | a factor of `e^(10^654)`  |                   345 |
|    5 |                   682 |                  `1e+318` | a factor of `e^(10^318)`  |                   681 |
|    6 |                 1,354 |                  `1e-354` | a relative `1e-354`       |                   all |

The exact argument needs none of this. `expFixed` halves an argument
once per bit of its magnitude and works that many bits beyond the
working bits, so `exp(1e999)` would certify at the first pass were the
bound raised, where `exp(approx(1e999))` is `unresolved` at passes one
to five and certified at the sixth, several times the cost. And without
the rule that answers a wide argument from the exponential of its upper
end ([The kernel's boundary](#the-kernels-boundary)), the first pass
squares an interval whose error's bit length doubles at each squaring
once it passes the value's, until the kernel gives up.

## Certification and the display rule

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
what a certified digit is and how an output line and its note read, and
[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states how a value that is zero within a bound is written. The mechanism
is one definition of certification, one scan for the count it gives, and
a display that writes the certified digits and the note and never the
radius.

`show(ball, { digits, rounding, ratio })` in `display.ts` is the one
rounding in a rounding mode. It formats the midpoint at the digits asked
for in the rounding mode, with the carry across a power of ten (`9.99`
at two digits is `10`) in every mode that rounds the magnitude up.

A ball certifies `d` digits in a rounding mode when `mid - rad` and
`mid + rad`, as exact values, round to the same `d`-digit value in that
mode. Rounding is monotone, so every value between them rounds to it
too, and the digits shown are what rounding the true value would give:
correctly rounded, not merely close. The ball is symmetric about its
midpoint but the rounding cells, the intervals of values that round to
one `d`-digit value, are not aligned with it, which is why the rule
looks at the two ends rather than at the radius. A radius below half a
unit in the `d`-th digit is necessary but not sufficient, since a ball
of radius `10^-30` around `1.2345` fails at four digits under half away
from zero, the true value lying on either side of the tie. The price of
the stronger rule is a retry when the true value lies near a
**rounding boundary**, the end of a rounding cell; the next pass narrows
the ball past it. A value exactly on a boundary, reached through an
irrational step, is the one case no pass resolves, and it ends at the
ceiling with one digit fewer than asked. A boundary of a mode to nearest
is a **tie**, a value halfway between two roundings; a boundary of a
directed mode is a **grid point**, a value the mode leaves as it is. A
one-sided radius, a ball that extends from its midpoint in one direction
only, is ruled out. Every error the ball carries is symmetric: the
kernel's count bounds its value's distance from the truth in either
direction, and every settle rounds to nearest. A second end would be a
second number carrying no information. The one definition covers the
nearest and the directed modes, ties, and the carry across a power of
ten. Certification is not monotone in the digit count (under a nearest
mode `[1.246, 1.254]` certifies three digits, both ends rounding to
`1.25`, and not two, `1.25` being a two-digit tie), so `certifiedDigits`
(`ball.ts`, over `certifies`) scans down from the digits asked and takes
the first count that certifies.

The ends are formed exactly where the radius can be formed and aligned
with the midpoint, which is every radius of the working sizes. Where the
radius cannot be formed (one of `2^-70000`) or cannot be aligned with
the midpoint (`1e999999999 ± 1.5`), the ends round alike exactly when no
rounding boundary of the digits asked lies within the radius of the
midpoint, so the distance from the midpoint to the nearest boundary is
measured against the radius. In the units of the last digit asked the
boundaries are the whole units under a directed mode and the half units
under a nearest one, with the boundary just below the midpoint's power
of ten taken too, where the cells are a tenth as wide. The distance is
exact, an arithmetic within the midpoint's own digits, and is compared
with the radius by its coarse bounds; a distance the bounds cannot tell
from the radius certifies nothing.

`show` returns a kind with the text:

- `exact`: radius zero and every digit held shown, the one kind shown
  with `=`; with the ratio notation, an exact value written entire as a
  whole number or a ratio ([The rule](notation.md#the-rule)).
- `certified`: every digit asked for is certified; this includes an
  exact value with more digits than shown, `1/3` at eight, which is `≈`
  with no note.
- `partial`: fewer digits than asked are certified, and the text is
  those. With none certified, the text is the midpoint at the digits
  asked. The ceiling produces that for a value that no count down to one
  digit certifies: a one-digit tie in a nearest mode, or a grid point
  under a directed mode, which lies on a cell's edge at every count. A
  rounding boundary at the digits asked, reached through an irrational
  step, is the other route to the kind.
- `zero`: a ball containing zero without being it, which certifies no
  digit. It is shown as `0` whatever the sign of the midpoint, which is
  noise within the written bound, a bound at or above `|mid| + rad`. The
  written bound is rounded up twice, the radius to thirty bits and then
  the sum to one significant digit, so a round radius shows the next
  digit up. A written bound whose decimal exponent lies below `-10^18`
  is written as `1e-1000000000000000000` (`zeroBound`). A power of a
  ball around zero can carry such a bound, since nothing holds a radius
  to the bottom edge: `(approx(1e20) - approx(1e20))^1e10000` carries a
  bound whose exponent runs to ten thousand digits. The written bound is
  larger than any such bound, so the line stays sound. It is the
  smallest positive value within the exponent bound, so nothing shorter
  could be written. And it parses back. At the top edge a ball around
  zero whose upper end reaches `10^(10^18 + 1)` is `unresolved` before
  it reaches the display, and a written bound that its rounding up
  carries past the edge (`1e+1000000000000000001`) is written so: it is
  larger, so the line stays sound, and it is a note, not a literal. The
  bound is never typed back as the result, so rounding it up at either
  edge costs nothing but the truth that the value is even closer to zero
  than the line says, which the line does not claim to know.
- `unbounded`: a radius not known, the midpoint's digits certifying
  none. No operation of the app produces one today; the kind is what a
  built-in without a propagation rule would return
  ([Exact mode](#exact-mode)).
- `uncertified`: decimal mode's flagged value
  ([Decimal mode](#decimal-mode)).

| You type                  | Exucal shows                        | Note                                                  |
| ------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `sqrt(2)^2 * 1.000000025` | `≈ 2 (7 of 8 digits are certified)` | a tie at the eighth digit, through an irrational step |
| `sqrt(2)^2 * 0.75`        | `≈ 1 (0 of 1 digits are certified)` | at one display digit: a one-digit tie                 |
| `approx(1)`               | `≈ 1 (0 of 8 digits are certified)` | under `floor`: a grid point                           |
| `sin(pi() radian)`        | `≈ 0 (within 2e-4049 of zero)`      | the `zero` kind                                       |

`show` tests the kinds in the order uncertified, unbounded, exact, zero,
then the digit count. Exactness is a property of the value, not of the
display. A value that passes through a root and comes out looking
rational (`sqrt(2) / sqrt(2)`, whose midpoint is exactly `1`) is `≈ 1`,
while `sqrt(4)` is `= 2` because the exact case was detected and nothing
was rounded. The default rounding mode is `halfEven`,
[IEEE 754](https://ieeexplore.ieee.org/document/4610935)'s default,
unbiased over many roundings where ties away from zero drift. The
display never writes the radius: it writes the certified digits, and a
note where they are fewer than asked or where the value is zero within a
bound. One rounding could write a value past the bound: a value within
the bound whose rounding to the display digits carries its exponent past
it. That rounding is refused as the bound's `overflow`, and no line is
written, so that every line parses back
([Every literal parses back](notation.md#every-literal-parses-back)).
[The converter and its lines](architecture.md#the-converter-and-its-lines)
owns what the outcome writes around the text: the notes, the relation
and the lines.

## Working precision and the schedule

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
the retry loop as a user meets it, and
[Precision limit](../docs/settings.md#precision-limit) states the
setting that caps it.

Every core function that does arithmetic (`evaluate`, `buildTable`,
`powQuantity`, the built-ins) takes a `NumberContext` (`context.ts`),
which holds:

- a precision, in significant digits;
- a rounding mode;
- the exact or decimal mode (`mode`, optional and absent meaning exact,
  so that a context that says nothing of the mode is an exact one;
  `modeOf` reads it);
- the significand limit;
- the ceiling;
- in decimal mode, an optional count of working digits.

Below the pipeline `precision` is the **working precision**, a pass's
precision and not the digits shown. The pipeline (`evaluateText`,
`convertText`) is the one place that knows the difference: the context
it takes is the user's, whose precision is the digits asked for, and it
derives the working contexts it evaluates at. There is one context type
for both levels. A second type for the user's settings would be the same
fields with one renamed, and the distinction is one of level, stated in
the pipeline's header, not of shape. The significand limit and the
ceiling are the same at both levels, the significand limit bounding what
any pass may form and the ceiling bounding how far the passes may rise.
The ceiling is in the context, rather than a parameter beside it or a
lookup closing over it, so that it reaches a built-in: the memos are
sized by it, and `pi()` reads it from the context it is called with.
`checkContext` holds `precision <= ceiling` and, when working digits are
given, `working >= precision` and
`4 (working + GUARD_DIGITS) <= ceiling`, in either mode; exact mode
carries the field and ignores it.

`workingContexts` yields the digits asked for plus a guard of ten
(`GUARD_DIGITS`), then twice that, doubling, and last the context's
ceiling: `ceilingFor(precisionLimitDigits)` is four times the sum of the
precision limit and the guard, `4 × (L + 10)`, 4,040 digits for the
default limit of 1,000, nine passes at eight digits and three at a
thousand. A pass's precision is not the grid its values settle onto. A
pass at `p` digits runs the kernel at `bitsFor(p)` bits and settles onto
the working grid of `workingDigits(p)` digits, `digitsFor(bitsFor(p))`,
about ten more than `p` for the kernel's guard bits, so the first pass
at eight digits settles onto 28 digits and the ceiling pass onto 4,050
([Settling](#settling)). `resolve` runs `schedule` in `pipeline.ts`,
which is `workingContexts` in exact mode. The schedule is geometric, so
the passes together cost at most about twice the pass that succeeds,
whatever it is, with one exception. `workingContexts` keeps every
doubled precision strictly below the ceiling and adds the ceiling after
it, so where the ceiling lies just above a doubled precision (a ceiling
of 45 after a pass at 44) the last two passes are nearly one size and
the passes together cost about three times the last
([#199](https://github.com/bsidhom/exucal/issues/199)).

Cancellation costs digits, `k` of them when two values agree to `k`
digits before they are subtracted, and each doubling pays for as many
again. The ten is **the schedule's guard**, the guard of the first pass:
a short expression loses a few digits to the rounding of each step and a
little more to an ordinary cancellation, and ten covers that, so that
the common case certifies on its first pass. It is separate from
**the kernel's guard bits**, `GUARD_BITS`, which are one routine's
headroom for its own error count. The ceiling is the top of the
schedule, and it has to be one number for every display digits, since
the definitions table and the memos are built once at it. It is set from
the largest request the limit allows. At display digits equal to the
limit, the first pass is the limit plus ten, and four times that gives
that request two doublings above its first pass, two chances to pay for
a cancellation, where a smaller request has correspondingly more. Four
is the least factor that gives the largest request two doublings above
its first pass, and eight would double what the table and the memos cost
for every setting. The guard of ten and the factor of four are
judgments, not measurements. A routine that needs more headroom than the
working precision takes it inside the kernel (the guard bits, the extra
terms of a series, `pi` to the working bits plus the argument's bit
length for a reduction) and never moves the ceiling, since headroom is a
property of one routine at one argument and the ceiling a property of
the whole schedule.

`resolve` in `pipeline.ts` runs the evaluation at each working context
in turn, parsing once outside the passes. Each pass's outcome steers the
loop:

- A result whose every value (the unit value, each list term unrounded,
  a function want's count) is exact, certified at the digits asked for,
  or of unbounded radius ends the loop: it is the answer.
- A result that certifies fewer digits is kept as the best so far and
  the next pass is tried, since cancellation that cost `k` digits is
  paid for by `k` more working digits.
- A result that assumes an undecided condition is kept the same way,
  never final ([Conditions](functions.md#conditions)).
- An `unresolved` at any depth of a call or an inverse, the converter's
  `unresolvedWant`, a ratio `unresolved` at the bound, and an
  `undecidedCondition` continue to the next pass.
- Any other error ends the loop: with the best result so far if a pass
  produced one, and otherwise with the error. A later pass that fails
  outright beats an earlier result that assumed a condition, since more
  digits may have decided the condition against the argument.
- At the ceiling the best result so far, or the last error, is returned,
  and the display shows what is certified.

A refusal is never retried, and one first raised at a later pass ends
the loop with the best earlier result. Only two sites can refuse at a
later pass what an earlier pass computed, since only their counts grow
with the pass's bits: the log-space power's decision, which refuses by
the bits the decision itself would work at (`unaffordable`), and a
series' working bits. Expressions that never certify, `sqrt(2)^2 - 2`
and `sin(pi() radian)`, run to the ceiling however it is set, which
bounds their latency; the precision limit is therefore a cost setting,
and [The costliest expressions](cost.md) catalogues what such
expressions cost.

Two gaps are accepted. A list unit whose ball straddles zero is the
list's `nonpositiveUnit`, and the loop ends on it rather than retrying,
though a later pass might narrow the unit. The check is on the whole
ball, not the midpoint, because a unit that cannot be told from zero is
no size to count by, and failing it there keeps a remainder's division
from ever being `unresolved` ([Unit lists](architecture.md#unit-lists)
carries the gap and its issue). And the outcome's reciprocal line is one
step at the user's context, outside the loop
([The converter and its lines](architecture.md#the-converter-and-its-lines)).
Two details of the pipeline remain. A `want` that fails to parse is
reported after a `have` that fails to evaluate, tried once at the first
pass, so that the pipeline's rule that `have` is tried first holds. And
`resolve` takes an optional `PassObserver`, called as each pass starts
and ends, which the stress harness times passes through and which
changes nothing it observes.

The definitions table is built once, at the ceiling context
(`ceilingContext`), by `system-build.ts`, and rebuilt only when the
precision limit changes the ceiling, never when the display digits
change. The angle units call `pi()`, so their quantities carry a radius
fixed when the table is built, and since the passes re-evaluate the
expression and not the table, a unit's precision must lie above every
pass or a pass that would otherwise certify `p` digits is held back by
the unit. One ceiling serves every display digits under one precision
limit, so one table serves them all. The lookup hands each unit out as
built, and the evaluator's unit node settles it to the pass's precision,
so that no pass carries more of it than it computes at, and `turn` into
`deg` certifies every one of its digits of `360` and shows `≈` only
because the radius is not zero. Rebuilding at each pass's precision
would cost a build per pass, milliseconds each, for no gain, and a table
per setting would hold one for every setting the session had seen; one
table, replaced when the ceiling moves, is the whole footprint. The
table is built in exact mode whatever the user's mode, and a unit is
settled in the user's mode at the node that names it.

In decimal mode the schedule is the user's context alone: one pass at
the digits asked for, since a higher internal precision would compute
something other than what the mode asks for; the retry happens inside
each step instead ([Decimal mode](#decimal-mode)).

## Settling

Every result the evaluator produces, and every unit the lookup hands
out, is settled to the working context. To **settle** an inexact value
is to round its midpoint to nearest, ties to even, onto the working
grid, the grid the kernel's results leave on, with the rounding charged
to the radius; an exact value is never touched. So an inexact midpoint
never grows beyond the working precision however long the expression,
while exact values stay the exact numbers they are. Left to grow as an
exact rational, an inexact midpoint reaches the significand limit within
a few operations. A kernel result at the default ceiling, some thirteen
thousand bits, raised to the fifth power already passes the default
limit, refused for digits that carry no information: that is why every
inexact result is settled. `powBall` on an inexact base squares with
settling for the same reason. An inexact value is a number computed, not
a number known, and keeping its midpoint as the exact result of exact
operations on kernel outputs would spend exactness on a value that has
none. This is Arb's discipline. Whole-expression precision is untouched,
since the errors settling adds are at the working precision, far below
the digits asked, and the retry loop raises that precision until the
digits certify.

Settling rounds to nearest, not in the user's rounding mode. It bounds
the size of a number the user never sees, and in exact mode the mode is
applied once, by the display, to the certified value of the whole
expression, which certification guarantees is the true value's rounding
in that mode. A mode applied inside would change nothing that is
certified and would be a double rounding besides. The charge of a
rounding is half a cell of the working grid, as a radius at or above it,
added to the radius when the rounding moved the midpoint, and a whole
cell where the rounding to nearest would carry the midpoint past the top
of the exponent bound, since settling never refuses a value in exact
mode. Such a rounding rounds toward zero instead and adds the whole
cell. The half cell is a radius taken from the exponent
(`powerOfTenRadius`) rather than a value formed and checked, so that a
midpoint at the bottom edge, whose half cell lies past the bound,
settles (`1e-999999999999999999 / approx(3)` is
`≈ 3.3333333e-1000000000000000000`). A zero midpoint is left alone. The
same rounding puts an exact operand on the grid where the strict limit
refuses the exact step of a sum, a product or a quotient with an inexact
operand ([Sums and alignment](#sums-and-alignment)).

`step` in `ball.ts` is the one entrance through which a computed value
becomes a value of the expression, in either mode. Every node goes
through `step` (`stepQuantity` in `quantity.ts`), plain arithmetic
included, and so do the pipeline's own quotients (the conversion's
ratio, a list's terms, a function want's count) and the outcome's
reciprocal. In exact mode `step` runs the computation once, at the
context, and settles the value. In decimal mode it runs the computation
at the working contexts until the rounding is certified and rounds it
once, the mode's one rounding of each step
([Decimal mode](#decimal-mode)). Its primitive, `settle`, is not
exported: a settle that any caller could apply to any ball, beside a
step that only some call sites take, would be a contract that lives in
documentation rather than in the one entrance.

## Exact mode

[The two modes](../docs/numbers.md#the-two-modes) states exact mode's
promise, and
[Identities and cancellation](../docs/numbers.md#identities-and-cancellation)
states what it cannot do.

Exact mode is the default. Its one promise is that an exact value,
radius zero, is an exact rational however it was formed, and every exact
operation on exact operands keeps it so, a literal, a unit, a sum, a
conversion, an exact case of a built-in and a comparison alike. Exactly
two things ever produce a nonzero radius: an inexact function (a root, a
kernel routine, `pi()`) and the built-in `approx`, which makes a value
inexact at the user's request. Decimal mode's rounding of a step
produces an exact value ([Decimal mode](#decimal-mode)). The design adds
no rounding the user did not ask for, and it declines one on the same
ground three times: a sum that cannot be aligned is refused rather than
rounded ([Sums and alignment](#sums-and-alignment)), a mode that rounds
every literal is ruled out in favor of `approx` ([approx](#approx)), and
an exact result past the significand limit is refused rather than
rounded at the node ([The significand limit](#the-significand-limit)). A
value the user wrote exactly is not silently replaced by one that is not
it.

Raising the passes' precision until the whole expression's ball
certifies the digits asked is whole-expression precision, in the manner
of Arb, and whole-expression rounding is its counterpart
([Settling](#settling) says why no rounding inside takes the mode). The
user page lists what the mode cannot do. The reason is one: an
irrational step leaves a ball, which no pass closes, so
`sin(pi() radian)` is a ball around zero whose relative accuracy never
improves, since `pi()` is rounded before `sin` sees it, so the ceiling
ends the escalation and the display shows `≈ 0` with a bound. Exactness
for such identities needs symbolic values
([Symbolic values](future.md#symbolic-values)), and Arb does not do
otherwise. The conservative `≈` for `turn` into `deg`, exactly `360` but
computed through a rounded `pi()`, is the one visible cost of `pi()`
being a function rather than a literal, and it is accepted: a
conservative `≈` is honest, a false `=` is not.

The alternative is per-operation precision, the guarantee
[MPFR](https://www.mpfr.org/) gives: every inexact operation returns its
value correctly rounded to a working precision the user sets, and
nothing is said about the expression around it, so `exp(x) - 1` at a
small `x` loses its digits to cancellation and the display does not
know. It is ruled out because the digits shown would then be no promise,
and the user would have to choose a working precision beside them. The
ball model costs over it a radius beside every midpoint, a propagation
rule per built-in and the retry loop, and no new structure. The
per-operation model is a state of the ball model rather than a rival to
it, every radius unbounded
([Certification and the display rule](#certification-and-the-display-rule)):
a built-in without a propagation rule would still work, under
per-operation semantics, and gain whole-expression semantics the day its
rule is written.

## Decimal mode

[The two modes](../docs/numbers.md#the-two-modes) states decimal mode as
four rules a user can apply, with the uncertified mark.

Decimal mode is a calculator's arithmetic: every operation is one
correctly rounded step, every value is exact, and no radius is carried.
At `p` digits in the rounding mode `R`, the mechanism behind the rules
is this:

1. A decimal-mode value is an integer of at most `p` significant digits
   times a power of ten, which is the `Scaled` form with a denominator
   of one.
2. The operation that is rounded once is a node of the expression tree:
   each `+`, `-`, `*`, `/`, juxtaposition, `^`, a negation (a `-` before
   a product), each literal, each unit looked up, and each function call
   as a whole. Every step but the last is rounded to the working digits
   rather than to `p` ([The working digits](#the-working-digits)).
3. A function call is one node because of observability. Every partial
   expression visible in the user's expression tree is a step; an
   accumulator inside a built-in surfaces to no one, and there the
   radius is kept and used to certify the rounded result. A defined
   function's body is visible in the expression, so its operations are
   steps. Decomposing a built-in into its series and rounding each term
   is ruled out: it loses precision in aggregate and throws away the one
   thing the ball model is good for, certifying a rounding.
4. The app does not report how far the roundings have carried the value,
   because in this mode the rounded value is the value.

A radius carried through the mode's steps, so that `1 / 3 * 3` would
show `≈ 1` with a note that seven of the eight digits are certified, is
ruled out. The radius answers a question the mode does not ask, a
directed rounding could never certify its last digit (the symmetric ball
reaches across the boundary the result sits on), and it adds no behavior
that exact mode lacks. The ball model stays where it is needed, inside a
built-in, whose result must be certified at extra digits before it is
rounded. A float with a rational significand, as a third number type, is
ruled out as subsumed: unbounded, it is the exact rational with its
power of ten; bounded, it is decimal mode. Rationals of bounded
denominator are not closed under addition (`1/3 + 1/7` is `10/21`), so
rounding a rational significand to a nearby rational of bounded size
would be a continued-fraction step that no rounding mode describes and
no calculator's user expects, and the significand the rounding modes are
defined for is an integer of at most `p` decimal digits.

Each kind of operation, in turn:

- **A literal** with more than `p` significant digits is rounded to `p`
  in `R` as it is read, and is exact after that, unless its significand
  passes the significand limit, which refuses the literal before
  anything rounds it, in either mode
  ([The significand limit](#the-significand-limit)). `2.5400001 cm` at
  three digits is `2.54 cm`, and in `in` it is `= 1 in`. A `p`-digit
  calculator holds `p` digits, and exempting literals would carry the
  extra digits into the first operation and round them there, one step
  later, for no gain.
- **Arithmetic** forms the exact result of two `p`-digit decimals, which
  always exists and is small, and rounds it once. Division by an exact
  zero is an error, and nothing else is: no value straddles anything.
  Two decimals whose exponents differ by more than the significand limit
  holds take the neighbor rule
  ([Sums and alignment](#sums-and-alignment)).
- **A power** `x^n` for an integer `n` is one operation, the exact power
  rounded once (`2^100` at eight digits is `= 1.2676506e+30`). Where the
  exact power does not fit the significand limit it is computed on the
  base widened to the working precision and certified, the limit being a
  cost limit and a correctly rounded power costing little:
  `3^1000000000` at eight digits is `= 5.243997e+477121254`. A rational
  exponent is a root, an inexact function, and `^`'s exact cases stay.
- **A unit** is built exactly at the ceiling, as every unit is, and the
  lookup hands it out as built; the evaluator's unit node rounds it to
  `p` digits in `R` once, exactly. `surveyfoot` at eight digits is
  `0.30480061 m`, and `1 ft` is `0.3048 m`, which has fewer digits and
  is itself. A unit that holds an inexact value, the angle units with
  `pi`, is certified at `p` as a call is. A prefixed unit is the product
  of the prefix's factor and the unit, rounded once, not each factor and
  then the product.
- **A built-in's call** is certified: the evaluator runs the built-in in
  exact mode at the working contexts of the retry schedule, from `p`
  plus the guard up to the ceiling, until the ball it returns certifies
  the digits asked for in `R`, both ends rounding alike, and takes that
  rounding, exact. IEEE 754-2008 recommends this for the decimal
  transcendental functions. A built-in therefore never sees a
  decimal-mode context; `approx` alone declares itself the identity
  there (`decimal: "identity"` in its definition), since every
  decimal-mode value is already at the user's precision. A built-in's
  exact cases return exact values, which are then rounded to `p` digits
  if they have more. The kernel stays binary in decimal mode and the
  mode rounds what it returns; a decimal kernel, rounding in `R` inside
  each routine, is ruled out, since it would double the numeric surface
  for every function.
- **The ceiling.** Certification can fail all the way up when the true
  value lies exactly on a rounding boundary of `p` digits, a tie in a
  nearest mode or a `p`-digit value in a directed one, since no
  precision separates the ball's two ends. For `exp`, `ln` and the
  trigonometric and hyperbolic functions the case cannot arise outside
  their exact cases: at a rational argument the value is transcendental,
  by Lindemann and Weierstrass, so it is never a finite decimal. For
  `gamma`, `erf` and their kin the page relies on no such theorem. A
  value can sit on a boundary only when it is rational and the built-in
  computes it on the kernel without recognizing it. Roots and powers
  with rational exponents have their exact cases detected before the
  kernel runs (`sqrt(6.25)`, `6.25^0.5` and `pow(6.25, 0.5)` are each
  exactly `2.5`), but `log(b, x)` looks for an integer exponent or its
  reciprocal alone, so `log(4, 8)`, which is `3/2`, at one display digit
  and `log(256, 512)`, which is `9/8`, at three reach the ceiling under
  a nearest mode. So the ceiling is a computation limit that lets the
  mode always answer: at it, the result is the midpoint's rounding in
  `R`, which a calculator prints, and the value is flagged
  `uncertified`. The flag is an optional field of `Ball`, never set to
  anything but `true` so that balls compare structurally, carried from
  operand to result by every operation (`carrying`) and by the evaluator
  from a built-in's arguments to its result, sticky as IEEE 754's
  inexact flag. The display writes such a value with the `≈` sign
  bearing a dot above it, U+2248 U+0307 as text, and the note "a step
  could not be certified at the precision limit". The component draws
  the dot itself over an `≈` labeled "approximately, uncertified" for
  assistive technology. `≆` is ruled out because it asserts an
  inequality the app cannot attest, the uncertified digits possibly
  being exactly right. The value is exact under the mode's rounding, and
  its last digit is nonetheless one the computation could not vouch for;
  every operation after it rounds a value that may already be a unit
  off, and the error can compound. The tests exercise the ceiling with
  an injected built-in whose value sits on a tie.
- **A result that is zero** is an exact case where the argument makes
  the function zero exactly (`sin(0 radian)`, `ln(1)`, `atan(0)`); an
  inexact argument is rounded first and misses zero, so
  `sin(pi() radian)` at eight digits is `sin(3.1415927 radian)`,
  `= -4.6410207e-8`, a calculator's answer. A ball that contains zero
  without the exact case firing certifies no digit and takes the
  ceiling's rounding, with a midpoint within the radius of zero taken as
  zero.
- **Domains and edges.** With exact arguments every domain check is
  decided, and no argument straddles an edge, so `unresolved` does not
  arise at a call's argument. A result whose exponent would pass the
  exponent bound is `overflow` or `underflow`, decided by the classifier
  on an exact argument; a classifier interval that straddles the bound's
  edge is narrowed by the retry inside the step, and an `unresolved` at
  the bound that survives the step is final, as every `unresolved` is in
  decimal mode. A rounded midpoint whose decimal exponent passes the
  bound is refused, `overflow` at the top
  (`99999999999e999999999999999990` at eight digits rounds to
  `1e+1000000000000000001`) and `underflow` at the bottom
  (`1e-1000000000000000000 / 3`), since there the rounded value is the
  result.
- **`approx(x)`** is `x`, the identity.
- **A defined function** is its body, ordinary arithmetic evaluated by
  the same evaluator, and each step of the body rounds, as a
  programmable calculator rounds each step of a program: calling it and
  typing its body inline round at the same subexpressions and give the
  same value. Treating a function as one operation like a built-in is
  ruled out: a mode that rounded a body once would make `tempF(37)` and
  its inlined body differ, the opposite surprise. Its conditions compare
  exact values and are always decided.
- **The pipeline's own quotients**, the conversion's ratio, a unit
  list's counts and remainder, a function's count and the outcome's
  reciprocal, are each one operation and rounded once, exact.
- **Comparisons** compare exact values. **Dimensions** carry exact
  rational powers whatever the mode: `m^(1/3)` is a third power of
  length, never `m^0.33333333`, since decimal mode rounds scalars and a
  dimension is not a scalar.

| You type (decimal mode) | Exucal shows                                                    | Note                                                          |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| `1 / 3 * 3`             | `= 0.99999999`                                                  | eight display digits                                          |
| `1 / (1 / 3 * 3 - 1)`   | `= -1e+8`                                                       |                                                               |
| `2^-30000`              | `= 1.2593025e-9031`                                             | the base widened; exact mode refuses it                       |
| `sin(pi() radian)`      | `= -4.6410207e-8`                                               | the unit rounded before `sin` sees it                         |
| `log(256, 512)`         | `≈̇ 1.12 (a step could not be certified at the precision limit)` | at three display digits: `9/8`, a tie, computed on the kernel |
| `log(4, 8)`             | `≈̇ 2 (a step could not be certified at the precision limit)`    | at one display digit: `3/2`                                   |
| `tan(90 deg)`           | `= -13660250`                                                   | the degree rounded first; exact mode fails at the pole        |

In decimal mode every value is exact, a displayed value having at most
`p` digits and a step before the last at most the working digits, so the
display's `exact` kind applies to every line: `=`, every digit, no note.
`≈`, "n of m digits are certified", "within … of zero" and "the digits
are not certified" never appear for a rounding the mode certified. The
ratio notation has no place in decimal mode and the outcome never asks
for it there ([Not in decimal mode](notation.md#not-in-decimal-mode)).
The precision limit has one meaning in both modes, the finest grid the
app rounds onto: in decimal mode it bounds the display digits and the
working digits, and a step's certification runs on grids up to the same
ceiling.

The denominator is fixed at one: a decimal-mode value is always
representable in the decimal system directly, without fighting the
rational's reduction, and the cost is at the bottom of the exponent
range, where a value whose `p` digits would need an exponent below the
bound has nowhere to put them and is refused. The alternative, a
denominator that flexes by powers of ten, would give such a value a
representation with reduced precision, as IEEE 754's subnormals do, and
`Scaled` can hold it, the invariant being on the value and not on the
stored fraction; it is recorded here so that a change to the decision is
a decision and not a rediscovery. The midpoint's rounding at the ceiling
is the answer for an uncertified call, rather than an error, which would
withhold a value every calculator answers because an exact case is
missing. Keeping the ceiling's ball on the uncertified value instead,
and letting the display rule mark what it does not certify, is ruled out
too: the radius would then propagate through the rest of the expression,
which is the mismatch the mode's definition removes. The significand
limit is nearly idle in decimal mode. With the denominator fixed it
binds four things:

- the exact intermediate before a rounding;
- the alignment of a sum;
- the significand of a literal as typed, which is refused past the limit
  in either mode rather than rounded;
- the prediction of an exact power, which sends a power past the limit
  to the widened base.

### The working digits

[Working digits and the extended count](../docs/settings.md#working-digits-and-the-extended-count)
is the setting, and [The two modes](../docs/numbers.md#the-two-modes)
states its rule for the last step.

With the display digits `p` and working digits `w >= p`, a setting of
decimal mode:

- Every step but the last is rounded to `w` digits in the rounding mode,
  exact after it: each literal, each unit, each operator, each
  built-in's call as a whole, certified at `w`.
- The last step of a displayed value is rounded to `p` digits directly
  from the exact result of its operation, not from a `w`-digit
  intermediate. The root of the `have` expression when the `want` is
  blank, the conversion's ratio, a list's counts and remainder and a
  function want's recovered count are each the last step of what they
  show; with a `want`, the `have` and `want` texts are operands of the
  ratio, the terms or the count, and their roots are rounded to `w`.
  Rounding the exact result once avoids the double rounding a
  calculator's display has (a `w`-digit value that lands on a `p`-digit
  tie by its own rounding, rounded again), so the answer is the
  correctly rounded value of the last operation on `w`-digit operands.
  The reciprocal line is the exception: it is the correctly rounded
  reciprocal of the `p`-digit ratio shown, so `3 m` in `in` at eight
  digits gives `0.0084666664` whatever the working digits, where the
  reciprocal of the exact ratio rounds to `0.0084666667`.
- The answer is exact and written with `=`. Under a directed mode the
  answer is the neighbor of a value that sits on the grid, as that mode
  asks, since the working digits change what is rounded, never how.
- With `w = p` nothing changes, which is the default.

| You type (decimal mode, eight display digits) | Into | Exucal shows     | Note                                                |
| --------------------------------------------- | ---- | ---------------- | --------------------------------------------------- |
| `ln(exp(1/10))`                               |      | `= 0.099999984`  | the first rounding's error amplified by `ln`        |
| `ln(exp(1/10))`                               |      | `= 0.1`          | over twelve working digits                          |
| `ln(exp(1/10))`                               |      | `= 0.099999999`  | over twelve, under the rounding mode toward zero    |
| `ln(exp(1/10))`                               |      | `= 0.10000001`   | over twelve, under the rounding mode away from zero |
| `1 / 3 * 3 m`                                 | `in` | `= 39.370078 in` | the `have` rounded to eight before the ratio        |
| `1 / 3 * 3 m`                                 | `in` | `= 39.370079 in` | over twelve working digits                          |

`operandContext` in `context.ts` is the context a step's operands are
computed at: in decimal mode with working digits above the precision,
the context at the working digits, otherwise the context itself;
idempotent, so an operand's operands are at the same context. The
evaluator uses it for every node's operands, a built-in's arguments, and
a function's conditions, whose terms are no part of a displayed value; a
defined function's body is the call's step, so its root is at the call's
context. The pipeline evaluates the `have` and `want` texts at it and
steps the ratio, a list's terms and a function's count at the user's
context, and `evaluateText`, whose value is the one shown, keeps its
root at the user's context. A context derived at another precision
(`workingContexts`, `ceilingContext`) drops the field. The ceiling
applies as it does without the setting: a built-in's rounding at `w` is
certified on grids from `w` plus the guard up to the ceiling, so `w` may
not exceed the precision limit. Exact mode has no such setting. Its
working precision is the retry schedule's, and a floor on it would be a
floor on the schedule's first pass, a different knob with a different
purpose. The retry schedule's contexts are "working contexts" throughout
the core, and the step callbacks name their parameter `working`, beside
a field `working` that is this setting's digits; the choice of that
vocabulary is [#172](https://github.com/bsidhom/exucal/issues/172).

Hand calculators commonly round each step to more digits than they show,
a ten-digit display over twelve or thirteen internal digits, so that the
error of a step lands below the last digit shown; the setting is that,
and a user of decimal mode expects it from the name. Its default is the
display digits, so that a user who has not touched the setting sees the
mode as defined, the extended count is one checkbox away, and a default
above the display digits would make the first line of decimal mode
depend on a number the panel does not show until the box is checked.

## The significand limit

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold)
states what the limit refuses, what the message suggests and what
`approx` and decimal mode change, and
[How a value is held](../docs/numbers.md#how-a-value-is-held) states the
cost of a power of two in a denominator.

Exact arithmetic cannot overflow, but it can grow without bound:
`3^1000000` and `1e999999999 + 1` are valid input. Beside the exponent
bound, two settings bound that growth, the significand limit and the
precision limit, on two axes and in two units, because they bound two
kinds of value, as a float's exponent width and significand width are
different quantities that one number cannot stand for. The significand
limit is in bits, the size of an exact rational's numerator and
denominator, the cost of holding an exact value and of multiplying it.
The precision limit and its ceiling are in decimal digits, the count an
inexact midpoint is settled to, which is decimal because the exponent is
(a midpoint of `k` digits is an integer of `k` digits times a power of
ten, the type's smallest form, and the form the display writes), and
which the kernel converts to bits plus a guard for its own work. Both
are the user's to set
([How the settings bound each other](../docs/settings.md#how-the-settings-bound-each-other)),
since both are cost limits whose right value depends on the device. The
two meet once: a settled midpoint at the ceiling is itself a
significand, an integer over one, and must fit the significand limit
with room for a product of two, which is `2 × bitsFor(4 × (L + 10)) ≤ S`
for a precision limit `L` and a significand limit `S`.
`precisionLimitFor(S)` is the largest `L` that satisfies it, 2,453
digits at the default `S` of 65,536 bits (a ceiling of 9,852 digits,
32,760 bits, twice that just under 65,536), and the only slack in it is
the guard's 32 bits, which the derivation counts. The hard bound on the
limit is `MAX_SIGNIFICAND_LIMIT_BITS`, `2^20` in `rational.ts` (about
315,000 digits), which the parser, having no context, applies to a
literal's significand. The evaluator then applies the setting to the
same digits at the literal's node, before anything rounds them in either
mode. Its floor is `MIN_SIGNIFICAND_LIMIT_BITS`, twice the kernel's bits
at a precision limit of one digit, 358, below which no digit fits. Its
default is `2^16`, about 19,700 decimal digits, at which every exact
operation still takes milliseconds, the reduction of a quotient of two
significands at the limit included.

The limit means cost: a hard limit on the bits the app forms, holds and
multiplies for one number, in time and in memory, which is why its right
value is the device's and the probe recommends it. So its measure is the
size of what is stored, the canonical significand of a `Scaled`, and not
the bits of the value it denotes. The two differ for a dyadic, whose
twos in the denominator the canonical form trades for fives in the
numerator: `2^-30000`, a value of 30,000 bits, is stored as
`5^30000 × 10^-30000`, about 69,658 bits, and a product of it costs
those bits. The extra cost is narrower than it looks. An exact value is
expensive by the bits of the two integers that store it, not by how
simple its factorization is: `3^-100000` is as simple as `2^-30000` and
is stored as itself, `1/3^100000`, 158,497 bits under this
representation and under any other short of a factored one, which the
app does not use. The canonical form adds cost in one case only, a
denominator with twos: a factor of `log2 5`, about 2.32, for a pure
power of two, less for a mixed denominator, and nothing for a
denominator with no twos, which is every other fraction. The factor is
bounded, it bites only in a band of a factor of 2.32 below the limit and
only for dyadics, and a value it moves past the limit was already, by
its own bits, within that factor of it, a big number by the measure that
matters; `approx` is the remedy, as for any other. A binary exponent
beside the decimal one would spare `2^-30000` and do nothing for
`3^-100000`: the cost is in storing exact rationals as digits, not in
the power of ten. So `1 / 2^n` is refused from `n = 28,225` at the
default (`5^28225` has 65,537 bits, and `1 / 2^28224` is a value), as
`0.5^30000` is, since each is stored with `5^n`.

Every node is held, sums included, because nothing bounds an
expression's length: each operation grows its operands by a bounded
factor, but a product of powers each within the limit reaches a million
bits in a few factors, and a conversion between two such products costs
half a minute if it is formed, as a rough figure on a laptop.

The limit is strict: no exact value is formed past it, and nothing is
measured after the fact. Every operation that forms an exact value
predicts its size from the operands first and refuses with the bits it
would need, `tooLarge` with a `Need`:

- A product and a quotient predict after their two cross-cancelling
  gcds, which run on operands within the limit: the bound is the larger
  of the two parts' bit sums, the truth or a bit over it, so `x / x` is
  one and `(a/b) * (b/a)` is one, and `3^32767 * 7^21845` is refused
  with 113,262 bits, nothing formed (`multiplyWithin`, `divideWithin`).
- A sum is refused on the bound of its unreduced sum, Henrici's form
  with the common factor taken out first (`addWithin`), the price of
  never forming it: `1/3^32767 + 1/7^21845` is refused.
- A power `x^n` predicts `floor(|n| log2 m) + 1` for `m` the larger of
  `x`'s numerator and denominator, the truth or a bit over it: `2^65535`
  is a value at the default and `2^65536` is not. A quotient and a power
  whose fraction fits size its canonical form too, before it is made,
  since a denominator's twos become fives in the numerator
  (`scaledWithin`): `2^-30000` is refused with about 69,659 bits, the
  prediction's count, one over the 69,658 stored, and `2^-28000` stays a
  value. A product and a sum of canonical significands need no such
  check, their denominators being coprime to ten.
- A sum's alignment is predicted the same way, the shift before it runs
  ([Sums and alignment](#sums-and-alignment)), and a literal's digits
  are measured as they are typed. The built-ins that compute at an
  argument's bits (the trigonometric reduction, `beta`, the incomplete
  functions, `factorial`) refuse on their own counts.
- `evaluate()` asserts on every node's result, and the pipeline on the
  two quotients it forms outside the evaluator, the conversion's ratio
  and a function want's count: an exact result past the limit there is a
  bug in a prediction, thrown, never a refusal. A result past both
  limits is refused by the prediction before anything is formed and
  reported at the bound
  ([Which limit a refusal names](#which-limit-a-refusal-names)).
- `multiplyBalls`, `divideBalls`, `convert`, the table's lookup and the
  built-ins that multiply or divide take the context, since a prediction
  needs the limit.

| You type            | Exucal shows                                   |
| ------------------- | ---------------------------------------------- |
| `2^65535`           | `≈ 1.001765e+19728`                            |
| `2^65536`           | past the significand limit, about 65,537 bits  |
| `3^32767 * 7^21845` | past the significand limit, about 113,262 bits |
| `2^-28000`          | `≈ 1.4458439e-8429`                            |
| `2^-30000`          | past the significand limit, about 69,659 bits  |
| `1 / 2^28224`       | `≈ 5.3629331e-8497`                            |
| `1 / 2^28225`       | past the significand limit                     |

The gcds' operands are the most that is formed, which the probe times
when it recommends the limit. The prediction runs after the
cross-cancelling gcds and never on the unreduced sizes: a prediction
from those would refuse `x / x`, whose result is one, since the
unreduced sizes measure the operands and not the result. Measuring the
result after forming it is the ruled-out alternative: it would bound
what is kept and not what is formed, and the limit is a bound on what
the device forms.

Every `tooLarge` carries two fields. `Need` is the bits needed:

- `exact` where a value exists, such as a literal's digits or a
  reduction's working bits;
- `bound` where predicted;
- `unknown` where the function cannot say.

`Reach` is the refusing function's word on the same step computed
inexactly:

- `fits`, where only the exact result exceeds the limit, as for a sum's
  alignment, an exact power's prediction or a product measured;
- `exceeds`, where the computation needs more bits than the limit holds
  whatever its operands, as for a literal's digits, an exponent that
  cannot be formed, or a kernel's reach.

The `Reach` field is required, so no refusal site can be silent about
it, and it is stated where the refusal is made and carried through
unchanged; nothing above the refusing function infers the reach from the
expression's shape, so a function that learns to reach further changes
its own refusal and its own test. The message names the subexpression
and the bits ("of 113,262 bits", "of about 69,659 bits"; nothing where
unknown). On `fits` it suggests, as things to try, `approx` around the
subexpression's first operand (a binary's left, a power's base, a call's
first argument), which the evaluator names, so that the part is computed
to the digits asked and shown with `≈`, or decimal mode. On `exceeds` it
says the value passes the limit however it is computed and suggests
nothing, a higher limit being the user's to judge from the bits.
`approx` around the subexpression itself would come too late, the node
being refused before `approx` sees it; the inexact operand makes the
result inexact. The suggestion is the operation's expectation, not a
promise.

Exact mode refuses at the node and never rounds an exact result on its
own to stay within the limit. The alternative, rounding the result there
to the working grid as `approx` at that node would, with the retry loop
then certifying the digits asked, is ruled out. It would be a third
source of inexactness and the only one the user cannot see in the
expression. The limit is the device's, so under rounding the same
expression would be `= 0` on one machine and `≈ 0` within a bound on
another, with nothing in the expression to say why. The remedy is one
token and the user's choice, since a user checking an exact identity
wants a higher limit and a user converting a measurement wants `approx`.
Refusing ends the work at the node where rounding would carry on. And
the calculator's behavior exists already, in decimal mode and in
`approx`. The rounding, as the alternative would have it, is recorded so
that it is not rediscovered: the node's exact result past the limit
settled onto the working grid with half a cell into the radius, the
quantity marked as rounded with the node's span, which the pipeline
would carry to the display as a note beside the value, and nothing
downstream changed; a literal past the limit, the kernel's reach and the
exponent bound would still refuse.

An inexact result of the exact operations, and every result in decimal
mode, is settled to the working grid and never refused for size. The
built-ins' internal intermediates, a unit list's decomposition,
`powBall`'s settled loop and the display's reciprocal work on node
results already held to the limit, within a constant factor of them, and
are not checked. A built-in that computes at an argument's own bits is
another matter: the trigonometric reduction, `beta`, the incomplete
functions and `factorial` refuse by those bits whatever the argument's
exactness, so `sin(approx(1e999999999) radian)` is refused as
`sin(1e999999999 radian)` is.

A product or a quotient with one inexact operand is inexact in any case,
so it is never refused for its exact operand's size. When the prediction
refuses the exact step, each operand is put on the working grid first,
by `onGrid`, as a sum that cannot align puts it
([Sums and alignment](#sums-and-alignment)), and the product or quotient
is taken again. Two grid significands always fit, by the relation
`precisionLimitFor` keeps between the two limits, so the retry cannot be
refused, and a `tooLarge` there is a bug, thrown. The exact operand is
rounded only because the result was inexact already; two exact operands
are refused at the node as above.

`approx` bears on the significand limit alone: in a sum, whose smaller
operand it lets the radius absorb; in an integer power, whose inexact
base is settled at every squaring; and in any product, quotient or sum
whose exact result would pass the limit, which an inexact operand makes
inexact and settled.

| You type                    | Exucal shows               | Note                                               |
| --------------------------- | -------------------------- | -------------------------------------------------- |
| `1e999999999 + 1`           | past the significand limit | the exact sum has a billion digits                 |
| `approx(1e999999999) + 1`   | `≈ 1e+999999999`           | the `1` absorbed into the radius                   |
| `3^1000000000`              | past the significand limit |                                                    |
| `approx(3)^1000000000`      | `≈ 5.243997e+477121254`    | settled at every squaring                          |
| `3^32767 * 7^21845`         | past the significand limit | each power within the limit, their product past it |
| `approx(3^32767) * 7^21845` | `≈ 9.9732685e+34094`       | the exact operand put on the grid                  |

## `approx`

[approx](../docs/numbers.md#approx) states what the user sees of the one
operation whose purpose is to make a value inexact.

`approx(x)` is a built-in of one argument, of any dimension, kinds
included, whose result has the argument's dimension: the value of `x`
known to the working precision and no better. The result is the ball
whose midpoint is `x`'s and whose radius is the larger of `x`'s own and
one unit in the last digit of the working grid at the value's magnitude,
rounded up (`widened` in `ball.ts`); the evaluator then settles it as it
settles every inexact result. An exact `x` gains that unit; an inexact
`x` whose radius is already larger, the result of a root or a
transcendental function, keeps it; one whose radius is smaller is
widened to the unit; `approx` is idempotent. A zero midpoint, exact or
not, is returned as it is, since a unit of the last digit of zero would
be a unit of nothing, so `approx(sqrt(2) - sqrt(2))` keeps its
argument's radius around zero; an unbounded `x` is returned as it is.
The unit is taken from the exponent without forming it, which lies past
the exponent bound for a value near the bottom of it
(`approx(1e-999999999999999999)`).

`approx` never narrows. The precision is decided at the call, which says
"known to this precision, and no better", and a radius the argument
already carries is a fact about the value that the call cannot undo.
Widening a radius is always honest, and narrowing one would claim
knowledge the computation does not have; so there is no way to cast a
value to exact or to raise its precision through `approx`, and if a
reason for the second ever appeared (none is known; the retry loop is
how precision is raised) it would belong to a built-in of its own, named
for what it does. `approx` never turns an inexact value exact and never
decides an edge: `factorial(approx(5))` is an error where `factorial(5)`
is a value, and `1 / approx(sqrt(2) - sqrt(2))` is as undecided as
`1 / (sqrt(2) - sqrt(2))`. It changes the significand limit's reach
alone, and only where an inexact operand makes a result inexact, settled
rather than formed ([The significand limit](#the-significand-limit)
lists the three cases). It does not relax an exponent literal past the
limit, since the literal is refused before `approx`'s result is raised
to it: `(approx(1e20) - approx(1e20))^1e100000` is refused as
`2^1e100000` is. It raises no error of its own, the dimension rule
accepting any dimension.

Four things follow.

- Whole-expression precision is kept, since the radius is the working
  precision's and each pass makes it smaller. `approx(2.54) cm` in `in`
  is `≈ 1 in` with every digit asked for certified on the first pass,
  and `≈` rather than `=`, which is the point.
- Identities through inexact values are `≈ 0` with a bound, the ball
  model's honest reading.
- In decimal mode `approx(x)` is `x`.
- A definitions-file body may call it, so a measured constant can be
  defined as `G approx(6.674e-11) N m^2 / kg^2`, built at the ceiling
  and settled to each pass's precision as the angle units are. Whether
  the definitions file marks any of its measured factors so is the
  file's decision; its measured factors, such as the dalton, are written
  as exact decimals
  ([Which factors are exact](../docs/units.md#which-factors-are-exact)).

`approx` is a function rather than syntax for four reasons:

- a call needs no grammar;
- it has a dimension rule, an arity and the same evaluation path as
  every built-in;
- it gets its wording in messages for free;
- it applies to any subexpression and not only a literal.

A third mode, rounding every literal to the working precision with
whole-expression rounding kept, is ruled out as the wrong granularity:
`1 ft` and `6.674e-11` can stand in one expression, and a mode would
make `1 ft` in `in` read `≈ 12 in`. Four spellings are ruled out with
their reasons. A postfix `~` on a literal (`2.54~`) is terse, but it
needs grammar, applies to literals alone, and has no binary form. A
prefix `~` takes the symbol a notation for the inverse of a function
would want. A `+/-` operator states an absolute uncertainty, which is
the binary form below, and cannot be spelled `+-`, since `2.54 +- 0.01`
already parses as a subtraction. The CODATA form `6.67430(15)e-11` reads
a number followed by `(` as what is today a product, and the canonical
form keeps no digit count to read the parenthesized digits against. A
binary form, `approx(x, u)`, a value known to within an absolute
uncertainty, is future work
([Extensions that fit](future.md#extensions-that-fit)).

## Failures

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) and
[Values at an edge](../docs/numbers.md#values-at-an-edge) together list
what stops a result as a user meets it.

A value that cannot be computed is a `Result` error, never an exception.
Every failure in the core is a discriminated union of a value or an
error, with each module defining its own error type. A violated
precondition (a zero denominator passed to the `rational` constructor, a
precision that is not a positive integer, a root degree below one, a
value past four times the hard bound at the kernel's door) is a bug in
the caller, not a value that can fail, and throws `RangeError`, as
`1n / 0n` does. Every value that can be zero or negative because the
user typed it reaches the numerics through the ball's `divideBalls`,
`powBall` and `rootBall`, which report it; the kernel's preconditions (a
positive interval under a root) are checked by the ball before it calls
in. The one known breach of the rule is the root's verification throw of
[Roots and powers](#roots-and-powers).

## Formatting

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states the written form and the rule that a line is a function of the
value, its exactness and the settings.

`format(s, digits, mode)` in `scaled.ts` renders a `Scaled` as a decimal
string in the style of C's `%g`: rounded to `digits` significant digits
in the mode, trailing zeros dropped, and exponent notation when the
decimal exponent is below -4 or at least `digits`, with the exponent
written as JavaScript writes it (`1.5e+21`, `1e-7`, `1e+999999999`).
Nothing goes through a `number` on the way, and the power of ten is
never formed, so a value of any magnitude renders exactly. `roundTo`
builds the canonical form from the rounded integer directly, the digit
count of an integer taken from its bit length and a comparison
(`decimalDigits`) and the powers of ten memoized (`powerOfTen`), so that
a settle at the ceiling, a product of two settled balls and the kernel's
exit each stay a small fixed cost; [Benchmarks](benchmarks.md) holds the
figures.
