# Numbers and precision

Every magnitude the calculator computes with is a `Ball`: an exact
fraction times a power of ten as a midpoint, and a radius bounding how
far that number may lie from the number meant.
[Numbers](../docs/numbers.md) in the user docs gives what a user needs
of the model: exact and inexact values, the digits a line certifies, the
two modes and the size limits. The representation and the mechanism
behind those rules are described here, with each design decision, its
reasons and the alternatives ruled out.
[Architecture](architecture.md#numbers) says how the rest of the core is
built around the type, and [Built-in functions](builtins.md) says how
each built-in uses it.

The midpoint is an exact fraction rather than an arbitrary-precision
float because almost every unit definition is a rational (`2.54 cm`,
`0.45359237 kg`). A conversion between such units is then exact, and in
exact mode, the default, rounding happens once, at the display.

The power of ten stands beside the fraction so that a large or a small
magnitude costs nothing to hold. `1e999999999` is stored as the fraction
`1` and the exponent `999999999`, not as an integer of a billion digits.
To **form** a value is to build the integer of its full size, as a
billion digits would be built for `1e999999999`. An operation forms a
power of ten only where it has to, as when it aligns the two operands of
a sum. The significand limit bounds every integer that is formed
([The significand limit](#the-significand-limit)).

The definitions file holds no irrational literal. The circle constant is
the built-in function `pi()`, because a decimal literal for `pi` would
be exact to its digits and wrong past them. `pi()` is computed to the
precision its caller works at. An expression that calls it gets it at
the precision of the current pass. The units defined through it are
built once, at the highest precision any pass reaches
([Working precision and the schedule](#working-precision-and-the-schedule)).

The midpoint-and-radius form is borrowed from ball arithmetic, and
[Arb](https://arblib.org/), now part of [FLINT](https://flintlib.org/),
is the inspiration. Arb's midpoint is a binary floating-point number
rounded to a set number of bits. A value is exact there only when it is
a whole number times a power of two, and a decimal literal enters
rounded. Here the midpoint is an exact rational scaled by a power of ten
and held in one canonical form. Three things follow:

- Every literal and every factor of the definitions file enters exactly.
- Equal values have the same stored form, and so the same size, however
  they were computed.
- A power of two in a denominator costs more bits than its binary size
  ([The significand limit](#the-significand-limit)).

Three calculators share the aim of exactness, each by its own route:

- Android's calculator from Android 6, whose source project is named
  [ExactCalculator](https://android.googlesource.com/platform/packages/apps/ExactCalculator/),
  keeps an exact fraction where it can and evaluates the whole
  expression as a constructive real otherwise, never rounding a step. A
  value is computed on demand to the precision the digits scrolled to
  need, within one unit in the last place. It is recomputed as the user
  scrolls rather than certified to a fixed count.
- [Qalculate!](https://qalculate.github.io/) keeps exact fractions and
  symbolic forms and computes the rest at the one precision set. With
  its interval arithmetic on, it shows only the digits the interval
  guarantees.
- [Frink](https://frinklang.org/) keeps exact fractions, its unit
  definitions included. It computes everything else in floating point,
  with no error bound unless an interval is asked for.

The design here differs in its mechanism:

- one canonical form for every exact value;
- a ball with an exact midpoint for every inexact value;
- digits certified by recomputing at rising precision, up to a ceiling;
- a refusal, never a wrong answer, for a value the limits cannot hold.

The decisions, each with the section that carries it:

- **Four core types, each adding one concept.** The fraction, the power
  of ten, the radius and the ball are separate types. The kernel's
  fixed-point number stands beside them. Each type has alternatives that
  are ruled out, with the reasons ([The types](#the-types)).
- **The exact operations never round an exact value.** The radius of an
  inexact result follows the elementary rules of error propagation. The
  rules read each operand's magnitude from bounds that are rigorous,
  though loose in their last bits, so no rule builds an integer of a
  value's full size ([Exact operations](#exact-operations)).
- **The kernel is binary, and the base changes only at its boundary.**
  The kernel is the set of fixed-point routines that compute the inexact
  functions. A value enters it as a fixed-point integer with an error
  count and leaves rounded onto a decimal grid
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
- **Decimal mode rounds each step once and treats the result as exact.**
  The rounding is correct for the rounding mode. The rounded value has a
  radius of zero, and no later step knows that it was rounded
  ([Decimal mode](#decimal-mode)).
- **The significand limit bounds what is formed.** The size of every
  exact result is predicted before the result is built
  ([The significand limit](#the-significand-limit)).
- **`approx` is a function that widens a radius and never narrows one**
  ([approx](#approx)).
- **A value that cannot be computed is a `Result` error.** It is never
  an exception, with one known breach in a root's verification
  ([Failures](#failures)).
- **The display forms no power of ten** ([Formatting](#formatting)).

## The types

[How a value is held](../docs/numbers.md#how-a-value-is-held) names the
numeric types and the canonical form a user relies on. Behind them the
representation has three layers:

- The exact layer is `Rational` and `Scaled`: an exact fraction, and an
  exact fraction times a power of ten. All arithmetic on midpoints
  happens here, in decimal, on integers of any length.
- The ball layer is `Radius` and `Ball`: a bound on an error, and a
  midpoint paired with that bound. Its rules carry the bound through
  each operation.
- **The kernel** is `Fixed` and `Floating`, binary fixed-point numbers,
  with the routines that compute the inexact functions on them.

The first four types form a ladder. Each adds one concept, and none
stores the concept of the type above it. A `Quantity` is a ball with its
dimension.

The kernel computes the inexact functions and nothing else. A root that
is not rational, `exp`, `ln`, the trigonometric and hyperbolic
functions, the Gamma and error-function families and the constants `pi`
and `e` are all computed there. Exact arithmetic never enters it: sums,
products, quotients and integer powers of exact values, every
comparison, and all rounding and formatting are computed on midpoints
and radii. The kernel is binary and the rest of the type is decimal, and
the base changes only where a value enters or leaves the kernel.
[The kernel](#the-kernel) below gives the shape of a routine.

### `Rational`

`Rational` (`rational.ts`) is the exact fraction in lowest terms: a
`bigint` numerator over a positive `bigint` denominator. Its equality is
structural, since equal fractions in lowest terms have identical fields.
It has no exponent, so its sums never fail for a difference of
magnitude.

`Rational` is the significand of a `Scaled`. It is also used on its own
in three places: a dimension's exponents, the exponent of `^`, and the
exact value of a radius. Each of the three needs a small fraction with
no power of ten. `rational.ts` provides the arithmetic, the comparison,
integer powers and the exact case of the n-th root.

### `Scaled`

`Scaled` (`scaled.ts`) is `significand × 10^exp`, the type of a
midpoint. The significand is a `Rational` and `exp` is a `bigint`. The
form is **canonical**, one form per value:

- the significand is in lowest terms;
- its denominator is coprime to ten, with no factor of two or five;
- its numerator is not divisible by ten, unless it is zero;
- zero has `exp` zero.

Equal values then have equal representations, and `equals` is
structural.

A value has exactly one such form because each part of it is forced. The
fraction in lowest terms is unique. The denominator the rule allows is
the denominator of that fraction with every two and five taken out, so
it is fixed too. With the denominator fixed, the exponent is the largest
that leaves the numerator a whole number, and the numerator is then the
one integer that completes the value. The implementation rests on one
invariant, lowest terms, kept by construction:

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
fives by dividing by `5^(2^k)`, from the largest such power worth trying
downward. That takes a logarithmic number of divisions, where one
division per factor is a quadratic loop on a significand full of tens.

The canonical form is internal. `format`, `roundTo`, `toRational` and
the ratio notation are functions of the value, so `2.54`, `254/100` and
`127/50` are written the same way everywhere. Rounding to significant
digits commutes with the power of ten, so rounding and formatting work
on the significand and then add `exp` to the exponent. The digits of
`1e999999999`, of its square and of `exp(1e6)` are written without
forming any of those values. The decimal exponent of any value is the
significand's decimal exponent plus `exp`, which is exact and cheap to
compute.

The exponent is a type of its own between the fraction and the ball,
rather than a field on `Rational`, because it changes what the type
promises. With an exponent, `add` and `subtract` can fail:
`1e999999999 + 1` cannot be aligned without forming a number of a
billion digits. The fraction's other users need sums that cannot fail
that way. The exponent is not a field of the ball either. A midpoint
must stand as a number on its own, with its own comparison, rounding,
formatting, certification and settling. A literal is parsed to a
`Scaled` first and becomes a ball later.

There is one exponent, and it is decimal. Four things produce or consume
a midpoint, and three of them are decimal:

- a literal or a unit, which is a decimal or a rational, and exact;
- the display, which certifies and writes decimal digits;
- decimal mode, which rounds onto a decimal grid;
- the kernel, which is binary.

Every value that enters or leaves the kernel is converted there already,
so the one change of base happens where the representation changes
anyway ([The kernel's boundary](#the-kernels-boundary)). Three
alternatives are ruled out:

- An exponent of each base, a binary one beside the decimal one. A
  kernel result and a literal would both enter exactly, and settling
  would stay a shift. But the mixed base leaks into every operation that
  brings the two together. A sum of two large exponents of different
  bases needs a rebase in log space. A comparison of two such exponents
  cannot be decided without forming one of them. Certification and the
  radius need the `log2 10` constant. The display has to fold the binary
  power into the significand before it can write a digit.
- A single binary exponent. A literal's power of ten could not enter it
  exactly, and decimal mode could not hold its own values at large
  exponents.
- Binary floats, or a configurable radix, for the whole type. Decimal
  literals would no longer parse exactly, the display would need a
  conversion, and nothing a calculator user types is binary.

Only the kernel uses binary. The one decimal base has a price. Each
settle, the rounding of an inexact result onto the working grid
([Settling](#settling)), takes a division where a binary base would take
a shift. That division costs several times a shift, and it is small
against the cost of a whole settle ([Formatting](#formatting)).

Two other shapes for decimal mode are ruled out. A second number type
beside `Rational`, with the core generic over the two, doubles the
numeric surface of every built-in. Decimal mode as a rounding step in
the evaluator, over the fraction with no exponent, caps a value at the
digits the significand limit holds, about 19,700 at the default.
`exp(100000)` and `gamma(20001)` would then fail in the mode that exists
to represent them. With the exponent, a decimal-mode value is a decimal
float, and the cost of the exponent is confined to `scaled.ts`.

### `Radius`

`Radius` (`radius.ts`) is an upper bound on an error: on the distance
between a computed midpoint and the true value. The bound is absolute.
It is a distance in the midpoint's own units, not a fraction of the
midpoint. A radius is a coarse binary magnitude, `significand × 2^exp`,
with a normalized 30-bit `bigint` significand and a `bigint` exponent.
Beside those magnitudes the type has one distinguished value,
`unbounded`.

Every operation on radii rounds up, so a radius is always a true bound.
Rounding to 30 bits loosens a bound by a relative `2^-29`, far below the
slack the propagation rules add. The radius is binary because the kernel
is binary. It is coarse so that carrying it through an expression costs
almost nothing and its size never grows. The exact value of a bounded
radius is a rational (`radiusUpper`), computed when a comparison needs
it and never stored.

`unbounded` is the radius of a value whose error has no known bound. It
does not mean that the value is infinite, or that the error is. The
midpoint of such a ball is still a finite number, a best estimate, and
only the statement of how far it may lie from the true value is missing.
The number type has no infinite value at all: a magnitude too large to
hold is refused ([The exponent bound](#the-exponent-bound)). No
operation creates an unbounded radius today. The value exists for a
built-in that returns a result before a rule for its error is written,
and every operation carries it through: a result computed from an
unbounded operand is unbounded. The one exception is a product with an
exact zero, which is exactly zero.

A float64 is ruled out for the radius, although it has precision to
spare, because of range. The product rule scales an absolute radius by
the other operand's magnitude, so radii span the range of the values
themselves, `10^±(10^18)`, against a float64's `10^±308`. A radius that
overflowed to infinity would be a true but useless bound on any large
value. A radius that underflowed to zero would be a false claim of
exactness. JavaScript also has no directed rounding, so every float64
operation would need a manual nudge up by one unit in the last place.
The exponent is a `bigint` for the same reason of range: the binary
exponent of a value near `10^(10^18)` is about `3.3 × 10^18`, beyond a
safe integer.

A boolean flag on a value, exact or inexact, in place of a radius is
ruled out as well. A flag records that an error exists and not how large
it is, so no digit of an inexact value could be certified. The ball
already has the flag's two states as special cases: a radius of zero for
an exact value, and the unbounded radius for an inexact value with no
known bound ([Exact mode](#exact-mode)).

### `Ball`

`Ball` (`ball.ts`) is a midpoint and a radius. The true value lies
within the radius of the midpoint, in the interval from `mid - rad` to
`mid + rad`. `ball.ts` also holds the operations on balls. Each combines
the midpoint's exact arithmetic with a rule for the radius. `scaled.ts`
knows nothing of radii, and `radius.ts` reads a midpoint only for bounds
on its magnitude. An exact value is a ball of radius zero, and `=` in
the display means exactly that. A ball may also carry the flag
`uncertified`. Only decimal mode sets it
([Decimal mode](#decimal-mode)).

### The kernel

Every kernel routine has the same shape:

1. The caller converts the argument, a ball, to a `Fixed`: a binary
   fixed-point number that carries a bound on its own error. The number
   of fraction bits comes from the precision of the current pass, plus a
   guard.
2. The routine reduces the argument to a value of order one. The
   exponential halves its argument repeatedly, for example, and the sine
   subtracts a multiple of `pi/2`.
3. It runs a series or a Newton iteration in integer arithmetic. Every
   operation updates the error bound, so the final bound covers the
   argument's own error, each truncation and the tail of the series.
4. The result is converted back to a ball. Its midpoint is rounded onto
   a decimal grid, and its radius is the error bound plus the rounding.

The routines for the roots are in `fixed.ts`. Each family of elementary
functions has a module of its own beside it, such as `fixed-exp.ts` and
`fixed-log.ts`
([The elementary routines](builtins.md#the-elementary-routines)).
[The kernel's boundary](#the-kernels-boundary) describes the two
conversions.

### `Fixed`

`Fixed` (`fixed.ts`) is the kernel's number. It is a record of three
fields:

- `value` is a `bigint` of either sign. The number it stands for is
  `value × 2^-bits`.
- `bits` is a non-negative integer, held as a `number`. It is the count
  of fraction bits, the position of the binary point within `value`.
- `error` is a non-negative `bigint`. It is an upper bound on the
  distance between `value × 2^-bits` and the true value, counted in
  units of `2^-bits`.

One unit of `2^-bits` is an **ulp**, a unit in the last place of a
kernel value. For example, `{ value: 181n, bits: 7, error: 1n }` stands
for `181/128`, about `1.4141`, and says that the true value lies within
`1/128` of it. The square root of two is such a value.

Every operation on `Fixed` values updates `error` by a short rule in
integer arithmetic, and the rule never underestimates. Each bound can
therefore be checked by reading the code
([Error bounds for the four operations](#error-bounds-for-the-four-operations)
derives the rules). A series runs on such values with the argument's
error included from its first term. The argument's radius is thereby
carried through the series, and no separate bound on the function's
derivative is needed. The truncation bound of a series is taken at the
upper end of the argument's interval.

The point is fixed rather than floating so that a routine can choose its
result's `bits` after its argument reduction. A result of magnitude
`2^k` is then given as many significant bits as an argument of order one
has. A routine whose result is small or large states its scale this way:
`sin` near zero, `exp` of a large negative argument and a root of a tiny
argument are examples. `shiftFixed` moves the binary point, exactly.

After its reduction every routine works on values of order one, so the
absolute error count is also a relative error. The count grows by at
least one ulp per operation. Every routine is therefore given 32 guard
bits (`GUARD_BITS`) beyond the bits its precision needs. The guard is
counted in bits because the error count grows in bits: a series of a
thousand terms spends ten of them.

Three alternatives are ruled out. A ball at every step of the kernel, as
Arb does, is uniform with the value type. It costs a radius operation
per arithmetic operation and a second representation to reason about
inside every series. Two integer endpoints cost twice the arithmetic and
a rounding direction to choose per operation. Guard digits with no error
count, the classic approach, are not rigorous and could not produce a
radius at all. The integer count is the cheapest design that yields a
proof, and its rules are the textbook ones.

### `Floating`

`Floating` (`fixed.ts`) is a `Fixed` significand with a binary exponent,
`significand × 2^exp`. It is the form of the results that can be very
large or very small: those of the exponential and of the hyperbolic sine
and cosine. `digits.ts` converts a `Floating` to a ball. That module
sits above the kernel, since it calls the kernel's logarithm and
exponential.

### `Quantity`

`Quantity` (`quantity.ts`) is a ball with a dimension
([Quantities, dimensions and kinds](architecture.md#quantities-dimensions-and-kinds)).

### Rounding modes and digit counts

`rounding.ts` names the seven rounding modes (`halfEven`,
`halfAwayFromZero`, `halfTowardZero`, `towardZero`, `awayFromZero`,
`ceiling`, `floor`). It is the one place that interprets a mode:
`divideRounded` is an integer division rounded in a mode. Every rounding
in the core scales its value so that the digits to keep form an integer,
divides there, and scales back. `Precision`, a count of significant
digits, is defined there too, with `digitsFor(bits)`, the number of
decimal digits that `bits` binary digits are worth. `bitsFor(precision)`
is in `fixed.ts`. It is `ceil(precision × log2 10)` plus the guard bits.

## Exact operations

[Operations that stay exact](../docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions)
states that `+`, `-`, `*`, `/`, a whole-number power and a comparison
are exact on exact values, and
[Values at an edge](../docs/numbers.md#values-at-an-edge) states what a
divisor that cannot be told from zero does.

The arithmetic has two layers. On midpoints, `scaled.ts` computes every
sum, difference, product, quotient, integer power and comparison
exactly. On balls, `ball.ts` calls that arithmetic for the midpoint and
adds a rule for the radius.

On midpoints an exact result is as long as it needs to be: nothing in
exact mode rounds an exact intermediate to keep it small. Apart from a
division by zero, an operation on midpoints can fail for two reasons,
both of size:

- The result would pass the significand limit. A sum, a product, a
  quotient or a power whose numerator or denominator would have more
  bits than the limit allows is refused before it is built
  ([The significand limit](#the-significand-limit)).
- The result would pass the exponent bound. A product adds its operands'
  exponents and a quotient subtracts them, and a result whose decimal
  exponent leaves `±10^18` is refused
  ([The exponent bound](#the-exponent-bound)).

On balls, the radius of a result follows the elementary rules of error
propagation. For operands `a` and `b` with radii `ra` and `rb`:

- A sum or a difference has the radius `ra + rb`.
- A product has the radius `|a| rb + |b| ra + ra rb`.
- A quotient has the radius `(|a| rb + |b| ra) / (|b| (|b| - rb))`.

[Error bounds for the four operations](#error-bounds-for-the-four-operations)
derives each rule and says how it is evaluated. When both radii are zero
each rule gives zero, so exact operands give an exact result. An integer
power of an inexact base applies the product rule by repeated squaring,
and each product is settled before the next. To settle a product is to
round it onto the **working grid**, the decimal digits a pass keeps its
inexact midpoints to, and to add the rounding to the radius
([Settling](#settling)).

A divisor whose ball contains zero, without being exactly zero, cannot
be divided by, since the true quotient may have either sign. The error
is `unresolved`, a kind of its own beside `divisionByZero`: the retry
loop retries after `unresolved` and never after `divisionByZero`.
`1 / (sqrt(2)^2 - 2)` reports it. `unresolved` carries the **edge**, the
point that the value's ball reaches across and that the result depends
on (`Edge`: a point, `"pole"`, or `"bound"`). The message says that the
value cannot be told, at this precision, from that edge. Whether a
divisor contains zero is decided as every comparison of a midpoint with
a radius is decided ([Comparison](#comparison)). A midpoint that the
bounds cannot tell from the radius counts as within it, so the answer is
`unresolved` rather than a quotient of the wrong sign.

A ball of unbounded radius ([`Radius`](#radius)) follows rules of its
own in a quotient and a product. As a divisor with a nonzero midpoint it
divides, and the quotient is unbounded. As a divisor with a zero
midpoint it is `unresolved`. An exact zero times an unbounded value is
exactly zero, because an unbounded radius stands for an unknown error on
a finite value, not for an infinite value. In every other operation an
unbounded operand makes the result unbounded.

`rational.ts` reduces each result with the smallest gcds the operands
allow. Each rule is a textbook one:

- A sum or a difference uses Henrici's rule: the gcd of the
  denominators, then the gcd of that with the new numerator.
- A product cross-cancels: the gcd of each numerator with the other
  denominator.
- A quotient is the product by the divisor's reciprocal: the gcd of the
  two numerators and the gcd of the two denominators.
- An inverse or a negative power swaps the numerator and the
  denominator, with no gcd.

So a quotient is reduced where it is formed, by those two gcds, and
nothing reduces it again. The rules are correct only for operands in
lowest terms, the invariant that the one reducing constructor keeps
([The types](#the-types)). The gcd is Lehmer's (Knuth's Algorithm L). It
takes its steps on the leading bits in doubles and applies their
cofactors to the `bigint`s about twenty-six bits at a time, after
stripping the common power of two. It is still quadratic, but about
forty times cheaper than Euclid's at 65,536 bits;
[Benchmarks](benchmarks.md) holds the figures. A half-gcd is
subquadratic but gains only above `2^16` bits, and is left for a larger
limit.

### Error bounds for the four operations

The ball's radius rules and the kernel's error rules are the same three
bounds, each a few lines of algebra. Let `a` and `b` be two computed
values. Let the true values be `a + δa` and `b + δb`, with `|δa| <= ra`
and `|δb| <= rb`. Each rule bounds the distance between the computed
result and the true result.

- **Sum and difference.** The true sum `(a + δa) + (b + δb)` differs
  from `a + b` by `δa + δb`, and the true difference differs from
  `a - b` by `δa - δb`. Either is at most `ra + rb` in magnitude.
- **Product.** The true product is `(a + δa)(b + δb)`. Subtracting `ab`
  leaves `a δb + b δa + δa δb`, which is at most
  `|a| rb + |b| ra + ra rb` in magnitude.
- **Quotient.** The true quotient is `(a + δa) / (b + δb)`. Subtracting
  `a / b` leaves `(b δa - a δb) / (b (b + δb))`. The numerator is at
  most `|b| ra + |a| rb` in magnitude. The divisor's interval excludes
  zero, so `rb < |b|`, and `|b + δb|` is at least `|b| - rb`, which is
  positive. The difference is therefore at most
  `(|a| rb + |b| ra) / (|b| (|b| - rb))`.

Each bound holds for every pair of true values within the two intervals,
so the result's interval contains every result the true values can give.

A ball evaluates these bounds on the coarse `Radius` type, and every
step of the evaluation errs on the safe side:

- In a numerator, `|a|` and `|b|` are replaced by upper bounds on the
  midpoints' magnitudes.
- Each sum and each product of radii is rounded up to 30 bits.
- In the quotient's divisor, `|b|` is replaced by a lower bound,
  `|b| - rb` is rounded down, and the division is rounded up
  (`divideRadius`).

A radius computed this way is at or above the bound derived above, so it
is still a true bound. It is looser by a relative `2^-29` or so for each
rounding in the rule, a handful in all.

The bounds on a midpoint's magnitude come from `log2Bounds`. It returns
a lower and an upper bound on `log2 |mid|`. Both are rigorous: the true
logarithm always lies between them. They are loose only in that they lie
up to `2^-30` from it. `log2Bounds` reads the significand's logarithm
from the top bits of its numerator and denominator, through a double,
and adds the exponent's share, `exp × log2 10`, through a 128-bit
fraction. A magnitude is therefore read from a few leading bits and the
exponent, and no rule forms the value. The radius of
`1e999999999 * sqrt(2)` costs what the radius of `10 * sqrt(2)` costs.

The kernel applies the same three bounds to `Fixed` values. The
arithmetic is on integers, and the error counts are in ulps. Where the
result's own value is truncated, the rule adds one ulp:

- **`addFixed`, `subtractFixed`.** The two operands are first brought to
  the larger `bits`, which is exact. The values are added or subtracted,
  and the errors are added. Nothing is truncated.
- **`multiplyFixed`.** The product of the two values is shifted down to
  the result's `bits`. The error is `|a| eb + |b| ea + ea eb`, for error
  counts `ea` and `eb`, shifted down by the same amount and rounded up.
  One ulp is added when the shift dropped any bit of the product.
- **`divideFixed`.** The value is the integer quotient, truncated toward
  zero. The error is `(|a| eb + |b| ea) / (|b| (|b| - eb))` in ulps,
  rounded up. One ulp is added when the division left a remainder. A
  divisor whose interval contains zero is a precondition failure: the
  ball layer decides what such a divisor means before it calls the
  kernel.

### Sums and alignment

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold)
states that a sum of two exact values that cannot be aligned within the
significand limit is refused in exact mode, and
[The two modes](../docs/numbers.md#the-two-modes) gives its decimal-mode
counterpart, the correctly rounded sum. A sum with an inexact operand is
never refused for its alignment. Its smaller operand is absorbed into
the radius, as described below.

To add `m1 × 10^e1` and `m2 × 10^e2`, the two significands are first
brought to one exponent. Let `Δe = e1 - e2` be the difference of the
exponents. The significand with the larger exponent is multiplied by
`10^|Δe|`, and the two fractions are added. The sum is exact. The
multiplication adds about `|Δe| × log2 10` bits to that significand, and
the sum is then put back in canonical form. `add` fails with `tooLarge`
when the multiplied significand would pass the significand limit: the
exact sum exists and cannot be held. `addBalls` then decides the result
by the operands and the mode:

- **Two exact operands in exact mode.** The sum is refused as `tooLarge`
  (`1e999999999 + 1`), because an exact value is never rounded.
- **At least one inexact operand,** which only exact mode has. The
  result is inexact in any case, and the evaluator would settle it next,
  so the operands are settled first instead:
  - Each inexact operand is rounded onto the working grid.
  - An exact operand with more digits than the grid is rounded onto the
    grid too, and the rounding is added to the radius, as `approx` would
    add it (`onGrid` in `ball.ts`). So `(1 + 1/3^41300) + sqrt(2)` keeps
    its digits, although its first alignment passes the limit. An exact
    operand already on the grid stays exact and costs nothing.
  - If the two then align within the limit, they are added exactly.
  - If they still do not align, their exponents differ by more than the
    limit's digits less twice the grid's digits. The smaller operand
    then lies below the last working digit of the larger. It is absorbed
    into the radius, as a floating-point sum absorbs a small addend:
    `sqrt(2) + 1e999999999` is `≈ 1e+999999999`, with the root inside
    the radius.
- **Two exact operands in decimal mode.** The sum is decided without
  being formed (`decimalSumApart`), by the **neighbor rule**. The
  smaller operand lies below half a unit in the larger operand's last
  digit. In a nearest mode the result is the larger operand. In a
  directed mode it is the larger operand or its neighbor at those
  digits, on the side that the smaller operand's sign gives.

The operands are settled first only after `tooLarge`. A sum that aligns
and whose value passes the exponent bound is held to the bound as a
product is ([The exponent bound](#the-exponent-bound)).

| You type (decimal mode, eight display digits) | Exucal shows             | Note             |
| --------------------------------------------- | ------------------------ | ---------------- |
| `1e999999999 + 1`                             | `= 1e+999999999`         | under `halfEven` |
| `1e999999999 + 1`                             | `= 1.0000001e+999999999` | under `ceiling`  |

The functions take different arguments at the two layers. On `Scaled`, a
sum, a product and a quotient each take the significand limit, and each
returns a `Result` that reports a result past the limit or past the
exponent bound. On balls each takes the whole context. A sum needs the
context's precision, mode and limit. A product and a quotient need the
limit for their size prediction. They also need the working grid, for an
operand that is rounded onto it when the prediction refuses the exact
step ([The significand limit](#the-significand-limit)).

### Comparison

[Comparison and equality](../docs/numbers.md#comparison-and-equality)
states when a comparison is decided and what a range that ends exactly
on the other value does. Every comparison in the core is written on two
primitives: `compare` on `Scaled`, which always decides, and `position`
on `Ball`, which places a ball against a point.

`compare` on `Scaled` always decides, and cheaply. It compares the
signs, then the decimal exponents, and only when those are equal the
aligned significands. A value's decimal exponent is the decimal exponent
of its significand, found from the digit counts and one comparison, plus
`exp`. With equal decimal exponents the alignment's shift is bounded by
the significands' own digit counts and never by the significand limit.
`1e999999999` compares with `1`, with `1.0000000001e999999999` and with
a kernel result without any of them being formed.

`position` in `ball.ts` is the one comparison of a ball with a point.
The built-ins' domain checks, the logarithm's test of its base against
one, the edges at which the rounding functions jump and a unit list's
counts are all written on it.

`position` is exact wherever the radius can be formed as an exact value:
for every radius whose binary exponent is within `2^16` in magnitude
(`FORMABLE_RADIUS_BITS`), which is every radius between `2^-65536` and
`2^65536`. Forming such a radius costs a canonical form of up to about
150,000 bits, once per comparison. That is past the default significand
limit, and it is allowed: the limit bounds the results of an
expression's operations, not an intermediate that a comparison forms and
drops ([The significand limit](#the-significand-limit)). For a radius
outside that range `position` decides by the coarse bounds. Where the
bounds cannot tell, it answers that the ball reaches across the point.
That is the conservative answer: it can turn a verdict into "undecided",
and never into a wrong verdict.

A ball is closed, so `position` tells two cases apart. A **touch** is a
ball whose end lies exactly on the point (`touchingAbove`,
`touchingBelow`). A **straddle** is a ball that reaches across the point
(`straddles`). The callers of `position` decide what a touch means:

- Every edge check of a built-in, and every edge of a rounding function,
  treats a touch as a straddle. The value may lie on the edge, where the
  answer jumps.
- A unit list's count takes the integer nearest its ratio's midpoint,
  whether the ball touches that integer or reaches across it.
- A condition of a defined function lets a touch decide a non-strict
  comparison and leaves a strict one undecided
  ([The check at a call](functions.md#the-check-at-a-call)).

`orderOf` places two balls against each other for those conditions:

- Two exact values are compared exactly, as the numbers they are, so the
  comparison is never refused for size.
- An inexact value is compared with an exact one directly, through
  `position`. A difference would be rounded, which could only widen the
  ball.
- Two inexact values are compared through their difference against zero.
  That difference always aligns, with the smaller operand absorbed into
  the radius ([Sums and alignment](#sums-and-alignment)). A difference
  that cannot be formed as a value, because it lies past the exponent
  bound or straddles it, counts as reaching across zero.

## The kernel's boundary

A kernel routine runs on `Fixed` values of order one after its argument
reduction. The base changes at the kernel's boundary, in two
conversions, one in and one out. Both are sized against the
**hard bound**, the largest value the significand limit can be set to
(`MAX_SIGNIFICAND_LIMIT_BITS`;
[The significand limit](#the-significand-limit) gives its value and its
reasons).

- **In.** `fixedFromScaled(s, bits)` is one division:
  `(num × 2^bits) / (den × 10^-exp)` for a negative `exp`, and
  `(num × 10^exp × 2^bits) / den` otherwise. It requires that the
  value's power of ten can be formed within four times the hard bound. A
  value past that is a precondition failure, and every routine that
  takes such a value bounds it first
  ([Huge and tiny arguments](builtins.md#huge-and-tiny-arguments)).

  Four times the hard bound is enough for the largest value a built-in
  hands the kernel at any limit the settings allow. Such a value has a
  significand within a significand limit of `S` bits and a magnitude
  between `2^-S` and `2^S`, which the built-ins' own bounds ensure. Its
  power of ten then has at most `2S` bits, so one part of the fraction
  that the conversion forms has a little over `3S` bits. At the hard
  bound `H`, where `S` equals `H`, that is a little over `3H`: `4H`
  holds it and `3H` would not.

  A nonzero value below half an ulp at the bits asked for is returned as
  zero within one ulp. The coarse bounds decide this without forming the
  value, and the division's rounding would give the same result. The
  conversion therefore takes an argument of any exponent within its
  precondition, however small, and a log-space power with a tiny
  exponent reaches the kernel as zero within an ulp.

- **Out.** `fixedToBall(f, digits)` rounds `value × 2^-bits` to nearest
  at the working grid's digits (`workingDigits`). The rounding is a
  multiplication by a power of ten and a shift (`fixedToScaled`, which
  `fixedToBall` wraps). The radius is the kernel's error count plus half
  a unit in the last digit for the rounding. The half unit is added only
  when the rounding moved the value, so a kernel value with no error
  that lies on the grid is exact.

  The powers of ten come from a memo, a map from an exponent `k` to the
  integer `10^k`. The memo is bounded: it is emptied whenever it reaches
  256 entries, and each entry is one power that a rounding asked for.

  A kernel result is rounded as it leaves because an exact binary
  fraction is expensive in a decimal type. A dyadic value `d × 2^-k`
  entered exactly would be `d × 5^k × 10^-k`. Its numerator has the bits
  of `d` plus `k × log2 5` bits, more than three times the size of a `d`
  of `k` bits, and the extra bits carry no information. The rounding
  adds no cost of its own, since every inexact result is settled onto
  the same grid in any case.

  A `Floating` leaves through `floatingToBall` in `digits.ts`. When its
  exponent can be formed within the significand limit, it leaves
  exactly, through `floatingToFixed`. Otherwise it leaves in log space.
  The decimal exponent is `floor(exp × log10 2 + log10 significand)` and
  the leading digits are `10^fraction`, both computed with `lnFixed` and
  `expFixed` at the working bits plus the bit length of the exponent
  plus a margin. The computation's error is carried in the kernel's
  error counts and added to the radius. This conversion costs a
  logarithm and an exponential at those bits. `ln 2` and `ln 10` come
  from their memos, whose margin covers the exponent's bits at every
  pass ([Memoized constants](#memoized-constants)).

`expFixed` renormalizes after each squaring of its squaring loop: it
keeps the significand to the working bits and moves the rest into the
exponent. So `exp(1e6)` costs what `exp(1)` costs plus one squaring per
bit of the argument's magnitude, twenty for `exp(1e6)` and about sixty
at the exponent bound. A negative argument runs the same loop with the
exponent going negative, and no value with a million fraction bits is
built.

An argument whose interval is wider than one takes another route. The
result is zero within the exponential of the interval's signed upper
end, and nothing is halved or squared. The upper end is formed exactly,
and its exponential's value plus its error bounds the exponential of
every value in the interval. So `exp(approx(1e60) - approx(1e60))` at
the first pass of 32 display digits, which is `0` within about `2e9`,
costs milliseconds. Squaring the whole interval instead would double the
bit length of a relative error of `e^(2 × 10^9)` at every step.

The other functions with large results inherit the exponential's range.
`sinh` and `cosh` are computed from `E = e^|x|`. For an exponent beyond
half the working bits, the reciprocal `1/E` lies below an ulp of `E`, so
it is added to the error and never computed. `tanh` saturates, and no
exponential is computed for it. A power in log space goes through
`expFixed`. A large decibel is an exact power of ten, held in the
exponent: `decibel(1e30)` is refused at the exponent bound by the exact
power, before any exponential is reached.

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

Each is computed once, on its first use, at the ceiling of the retry
schedule plus a margin of 256 bits (`MEMO_MARGIN`), whatever precision
that first request asks for. Every request at or below that size is cut
from the memo, and every request the retry loop can make is at or below
it. The cut (`truncateFixed`) converts the error count to the new ulps,
rounded up, and adds one for the bits dropped: `ceil(error / 2^k) + 1`.
Rounding the count down would lose up to an ulp. For example,
`3/4 ± 2/4` cut to whole units is `0 ± 2` and not `0 ± 1`, since the
interval reaches `5/4`.

A request at a higher ceiling, after the precision limit is raised,
replaces the stored value. A request at a lower ceiling leaves it. Each
memo therefore holds one value, and its footprint is fixed by the
ceiling: about 1.7 KB per constant at the default ceiling of 4,040
digits. The footprint does not depend on what the user has typed, and it
needs no eviction policy. Its largest possible size is set by the
largest precision limit, which follows from the hard bound
([The significand limit](#the-significand-limit)). The core keeps no
global state apart from such memos. A memo of a pure function of its
precision cannot change any result of the core, and `lazy` in
`parser.ts` is state of the same kind.

The margin serves two purposes:

- The argument reduction of `sin` and `cos` needs `pi` to the working
  bits plus the argument's bit length. At the ceiling pass that exceeds
  the ceiling by the argument's bit length. With the margin, every
  argument below `2^256` is served from the memo at every pass.
- The Gamma family and the logarithm add guard bits above a pass's bits.
  The margin holds them, so `ln 2` and `ln π` are served from their
  memos inside an `lgamma` at the ceiling pass.

Two kinds of request ask for more bits than the memo holds:

- the reduction of an argument at or above `2^256`, which is taken up to
  the significand limit and refused past it;
- a logarithm inside `beta` at a large argument, since `beta` takes its
  three logarithms at the working bits plus the bits of its largest
  argument's magnitude.

Each such request computes the constant for that call and keeps nothing.
`sin(1e5000 radian)` therefore pays for `pi` at its argument's bits each
time it is typed. The most such a call can pay for is `pi` to the
significand limit plus the ceiling, and the benchmarks measure it.

Every memo of the core is filled on first use, and none at module load.
The build of the definitions table is the first use of `pi`, through the
angle units, so the first build fills the memo of `pi`. `e`, `ln 2`,
`ln 10` and `ln π` wait for the first expression that needs them. The
Bernoulli ratios that the Gamma family's series use hold the same margin
for the same reason. They are memoized by the count the series reserve
and the bits they ask for
([The Gamma and Beta families](builtins.md#the-gamma-and-beta-families)
describes that memo and its footprint).

Stored digits of `pi` or `e` are ruled out. Chudnovsky's series computes
`pi` to any precision the settings allow in a time nobody notices. As a
rough, illustrative figure, a thousand digits take a fraction of a
millisecond and a hundred thousand digits take a few hundred
milliseconds. A Machin formula is slower by a small factor, and spigot
algorithms are quadratic and buy nothing. Stored digits compress to no
better than their entropy, about 0.42 bytes a digit. Ten thousand digits
would add some 4 KB to a payload of a few tens of kilobytes compressed,
for a range that costs milliseconds to compute. Stored digits buy
nothing at any precision a user will set, since the constants are
computed on demand and memoized.

## Roots and powers

[Operations that stay exact](../docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions)
states that a built-in returns an exact result in its exact cases, and
[Roots and powers](../docs/builtins.md#roots-and-powers) gives the
user's side of the roots and of `pow` against `^`. A root or a power
takes the first of three routes that applies: the exact case, the
kernel's root, and log space.

A root that is rational (`sqrt(9/4)`, `sqrt(2.25)`, `cbrt(-8)`) is
detected and returned exactly, and `(4 m^2)^(1/2)` is exactly `2 m`.
`exactRoot` divides the exponent by the degree and folds the remainder's
power of ten into the significand, when that power can be formed within
the limit. It returns the rational root when both the numerator and the
denominator are perfect powers. So `sqrt(1e999999998)` is exactly
`1e499999999`.

Otherwise `rootBall` takes the root on the kernel, in five steps. With
`n` the degree:

1. It takes a power of ten off the exponent, exactly: a multiple of `n`,
   with the remainder folded into the significand.
2. It scales the significand by an exact power of `2^n`, so that the
   scaled significand lies within a factor of `2^n` of one. Under the
   root that scaling is a plain power of two, which step 5 takes back
   out.
3. It converts the scaled significand to a `Fixed`. A fixed-point number
   with `b` fraction bits holds a value near `2^-d` to only `b - d`
   significant bits, and the scaled significand can lie below one, by
   fewer than `n` bits. So a significand that lies `d` bits below one is
   converted at `d` bits more than the working bits. The conversion
   rounds by at most half an ulp. At those bits half an ulp is at most
   `2^-b` of the value, for `b` the working bits, which is the relative
   accuracy a value of order one has at the working bits. No significant
   bit of the argument is lost. A `d` above the working bits goes to log
   space instead, the third case below.
4. It takes the root there (`sqrtFixed`, `rootFixed`).
5. It scales the root back by the power of two, hands the kernel's value
   back through `fixedToBall`
   ([The kernel's boundary](#the-kernels-boundary)), and restores the
   power of ten in the exponent.

The argument's own radius enters at step 3, as part of the `Fixed`
value's error count, so the radius of the result covers it: an inexact
argument gives an inexact root with a bound. `sqrt(1e999999999)` is
`≈ 3.1622777e+499999999` on the first pass. The scalings are exact.
`scaleByPowerOfTwo` cancels the power against the trailing zero bits
rather than running a gcd, and `shiftRadius` moves the radius's
exponent.

The kernel has two roots: the square root, and the root of any degree.

The square root is Newton's iteration on the reciprocal square root. It
uses multiplications only, and the precision doubles at each step. An
integer square root by division would cost about ten times `pi`'s whole
series at a hundred thousand digits, since V8 divides big integers in
quadratic time. The result is verified by squaring. With `s` the
computed root and `D` a bound on the distance of `s^2` from the
argument, the error is at most `D s / (2 s^2 - D)`, about `D / 2s`. The
looser bound `D / s` would double the argument's error at each of the
eight square roots that the logarithm's reduction takes
([The elementary routines](builtins.md#the-elementary-routines)).

The root of any degree up to `2^32` (`ROOT_DEGREE_LIMIT`) is Newton's
iteration in fixed point, from a first guess taken through a double. Its
cost is logarithmic in the degree, and it never forms an integer of
`degree × bits` bits.

The error of either root is verified by raising the result back to the
power, and is not read off the iteration. For `y^n = a (1 + ε)` with
`|ε| <= 1/2`, the bound is `|y - a^(1/n)| <= (4 |ε| / n) y`. The
distance is taken over the whole of the argument's interval, so the
argument's own error enters the same bound. The degree limit has two
causes. The first guess is good to `2^-52`, and Newton's step overshoots
unless `n × 2^-52` stays well below one. The verification needs
`n × 2^-bits` below one half.

Three cases go to one helper, `rootInLogSpace`, which computes `x^(1/n)`
as `exp(ln x / n)`:

- a degree past the limit (`pow(3, 1e-30)`, whose root is the
  `10^30`-th);
- a significand whose remainder's power of ten does not fit the
  significand limit;
- a significand scaled so far below one that its exponent, less the
  degree's multiple, passes the working bits. The conversion would turn
  it to zero within an ulp and report a false `unresolved`
  (`(7^-8000)^(1/99999)` is `≈ 0.85583783`).

The helper returns `undefined` for one outcome of the log-space power
(`powLogSpace`, described below), `unresolved` at zero, and for no
other. `rootBall` then applies its own handling of a ball around zero.
The remaining cases of `rootBall`:

- A negative ball under an odd degree gives the negated root of its
  magnitude.
- A ball that contains zero and is exact is exactly zero.
- An inexact ball that contains zero is `unresolved` under an even
  degree, since the sign decides whether a real root exists. Under an
  odd degree it gives a ball around zero whose radius is the root of the
  ball's farther end.
- An even root of a ball that is negative throughout is
  `negativeRadicand`. A ball that reaches across zero is the
  `unresolved` above, never `negativeRadicand`.
- An argument of unbounded radius gives the root of its midpoint, with
  an unbounded radius. The sign of its midpoint decides
  `negativeRadicand`.

A root of degree three or more of a wide positive ball still throws in
the kernel's verification
([#79](https://github.com/bsidhom/exucal/issues/79)).

`powBall(b, n, context)` raises a ball to a `bigint` power `n`, by one
of two routes. An exact base takes the exact power, which its size
prediction holds to the significand limit
([The significand limit](#the-significand-limit)). An inexact base takes
exponentiation by squaring, with each product settled, so `sqrt(2)^1000`
costs one or two multiplications per bit of its exponent at the working
precision. For an inexact base only the magnitude of the result needs a
guard. The classifier of [The exponent bound](#the-exponent-bound)
provides it: it holds a result to the bound by the logarithm of its
magnitude. A base whose ball contains zero is tested against the top
edge only. A base with a zero midpoint takes its result's radius from
the radius's logarithm times `n`, not by squaring. A negative `n`
inverts by the division rule, so a negative power of a ball around zero
is `unresolved`.

`powRationalBall(b, p/q, context)` serves both `^` and the built-in
`pow`. It takes the first of three routes that applies:

1. The exact root of the base (`exactRoot`). `8^(2/3)` is exact without
   forming `64`, and `x^(p/q)` is exact whenever `x` is a perfect `q`-th
   power.
2. The root of the power, when `x^p` fits the significand limit. The
   root comes last so that the one inexact step is the last step. This
   route also serves a negative base under an odd root.
3. `exp(y ln x)` on the kernel (`powLogSpace`), for a bounded base that
   is positive as a rational and for any bounded exponent. A negative
   base under an odd root with an odd numerator is negated by symmetry.
   `lnScaled` scales the base to order one before the conversion. It
   takes the logarithm at the working bits plus the magnitudes of the
   exponent and of the logarithm, so that their product keeps the
   working bits, and `expFixed` takes the exponential.

So `2^0.1234567` and `pow(10, 2.3456789)` are values with a radius.
`2^1234567` fits no significand limit. `10^23456789` is exact and cheap,
a pure power of ten, but its root of degree `10^7` leaves `10^3456789`
for the significand, which the limit does not hold. Log space gives up
exactness only where no exact result was reachable. A base that
straddles zero and whose power does not fit stays `tooLarge`, since the
result over its interval does not fit either. `^` and `pow` still
disagree on a dimensionless base with an exact exponent that the `^`
grammar cannot form, as the last two rows below show
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
two kinds of site: a check on the exponent wherever exponents combine,
and a classifier in the functions whose result is an exponential.

A value is within the bound when its decimal exponent,
`floor(log10 |v|)`, lies within `±MAX_EXPONENT`, which is `10^18`. That
exponent is the one the display writes. Zero is within the bound at any
exponent.

The bound is on the value, not on the representation. The canonical
`exp` can differ from the value's decimal exponent: it may lie above it
by up to the denominator's digit count, or below it by up to the
numerator's digit count. So `exp` can pass `±10^18` while the value is
within the bound, and nothing needs `exp` itself to stay within. The
128-bit `log2 10` of `log2Bounds` contributes an error below `2^-68` at
such an exponent, well inside the `2^-30` that the bounds allow, and
every conversion of an exponent to a `Number` is guarded first.

The bound is on the value because it exists so that a value can always
be written. A refusal at it must therefore never be false about the
value. The significand limit is on the representation for the opposite
reason: it bounds what the device forms
([The significand limit](#the-significand-limit)).

Holding the canonical `exp` to the bound instead is ruled out, for three
reasons:

- It would refuse `1e1000000000000000000 / 3 * 10`, whose value is
  within the bound, with a message that says its exponent passes
  `10^18`. That is false about the value.
- Whether a value is held would depend on whether it is exact, since an
  exact fraction and its settled form can lie on different sides of such
  an edge.
- It would have to overrule `powerRefusal`, which already reads the
  value, for no gain.

| You type                         | Exucal shows                       | Note                                               |
| -------------------------------- | ---------------------------------- | -------------------------------------------------- |
| `1e1000000000000000000 / 3 * 10` | `≈ 3.3333333e+1000000000000000000` | a value, though its canonical exponent is one past |
| `1e-1000000000000000000 / 7`     | too small to compute               | `underflow`, though its canonical form is within   |
| `0.001e1000000000000000003`      | `= 1e+1000000000000000000`         | the parser leaves a literal to the constructor     |
| `0e2000000000000000000`          | `= 0`                              | zero is within the bound at any exponent           |
| `1e1000000000000000001`          | refused as it is typed             | the same `overflow` a computed value past it is    |

`powerOfTenRadius(k)` gives a radius at or above `10^k`, from the same
bounds on the magnitude, without forming the power. Every site that
needs only the radius of a power of ten uses it: the power that a root
takes off, `lnScaled`, the unit that `approx` adds, and the half unit of
a settle. It accepts `|k|` below `2^90`. The bounds keep their accuracy
to about `2^97`.

`scaled()` checks the value's exponent only when `|exp|` lies within a
band of the bound (`BOUND_BAND`). The band is four hundred million
digits, more than any `bigint` holds, since V8 caps a `bigint` at `2^30`
bits, about 323 million digits. An integer significand's digit count has
a fast path, so the common case costs one comparison. A value that fails
the check is an `overflow` above the bound or an `underflow` below it,
both errors of `Scaled`. The check runs wherever exponents combine, in
`multiply`, `divide` and `pow`. So `10^1e30` and `exp(1e30)` fail
cleanly before anything is computed: they neither loop nor form an
exponent that could not be formatted. A literal past the bound is the
same `overflow`, refused as it is typed, and the parser words the
message from the exponent of the literal's value.

A ball is held to the bound by every value in it, and a refusal needs
the whole ball past the edge. A result can pass the bound for some
values of its ball and not for others. Such a result is `unresolved` at
the edge `"bound"` ("the point where the result passes the exponent
bound"), as a divisor that straddles zero is `unresolved` at zero. The
answer, a value or a refusal, depends on which side the true value lies
on, and a refusal is final and must never be wrong. The retry loop
narrows the ball until that is decided. The rule applies in three
places:

- **A product or a quotient with an inexact operand** is `overflow` or
  `underflow` only when its whole ball lies past the bound:
  `|mid| - rad` is at or above `10^(10^18 + 1)`, or `|mid| + rad` is
  below `10^-(10^18)` and the ball excludes zero. The coarse bounds
  decide first. Within their slack, which no pass narrows, the exact
  distance of `|mid|` from the power of ten decides, formed from the
  midpoint's digits (`held`, `againstPowerOfTen`). A ball that contains
  zero and whose midpoint passes the bottom of the bound is zero within
  `|mid| + rad`. Any other result is `unresolved` at the bound,
  including a result whose `|mid| + rad` reaches the top. A ball of
  unbounded radius is held by its midpoint.
- **A sum that aligns and whose value passes the bound** is held the
  same way. Two exact operands are refused in either mode
  (`5e1000000000000000000 + 5e1000000000000000000`). An inexact sum
  whose ball reaches back within the bound is `unresolved`. The midpoint
  of `approx(5e1000000000000000000) + 5e1000000000000000000` sits on the
  bound at every precision, for example, so the retry loop ends with the
  `unresolved` message, as it does for `1 / (approx(1) - 1)`.
- **A guarded built-in** computes a result only when every value of the
  result lies within the bound, with a margin for the kernel's error.
  One classifier in `ball.ts` makes that decision. It works on an
  interval `[L_lo, L_hi]` that bounds the natural logarithm of the
  result's magnitude. It tests the interval against two edges,
  `U = (10^18 + 1) ln 10` and `D = -10^18 ln 10`, taken from the memo of
  `ln 10`. It keeps a margin `m` that covers the kernel's error and half
  a unit of the working grid: `2^(40 - bits)` for a kernel at `bits`
  bits, forty bits above an ulp (`MARGIN_BITS`). Its verdict:

  - `overflow` when `L_lo >= U` is certified;
  - `underflow` when `L_hi < D`;
  - compute when `D + m <= L_lo` and `L_hi < U - m`;
  - `unresolved` at the bound otherwise.

  The coarse bounds decide first (`log2` of radii, and near one the
  exact difference from one). The interval is formed on the kernel only
  within their slack. So an exact argument is left `unresolved` only
  when it lies within the ceiling's precision of an edge. Each site has
  its own `L`:

  - `classifyExp` works on `x` itself.
  - `classifyHyperbolic` works on `|x| - ln 2`, widened by the working
    ulp on each side, against the top edge only. `sinh` and `cosh` are
    `overflow` for either sign.
  - `classifyPower` works on `y ln x` for `powLogSpace`, and on
    `n ln |b|` for `powBall`. It runs before `lnScaled` is asked for the
    bits that `y`'s size needs. When the bound on `|y ln x|` is below
    `2^-bits`, the result is one within twice that bound, without the
    kernel. When the bits the decision would need pass the significand
    limit, the answer comes from the bound or is `tooLarge`.
  - `gamma` classifies its `lgamma` ball through `classifyExp`.
  - `erfc` goes through the upper incomplete gamma function of order one
    half. That function's exponential is classified on the exponent
    `s ln x - x`, less the logarithm of its prefactor, with the square
    of the argument for `x`, so that the leading term is `-x^2`. The
    incomplete functions classify their own exponents the same way
    ([The Gamma and Beta families](builtins.md#the-gamma-and-beta-families)).
  - `floatingToBall` classifies its decimal exponent's interval too, and
    handles its own rounding's carry at the top.

  When a power is `unresolved` at the bound, `pow` blames the argument
  whose radius contributes more to `y ln x`, so that the message names
  it (`logPowerBlame`).

A retryable error kind of its own for a result that straddles the bound
is ruled out. It would cost as many sites, it would be a second word for
the meaning `unresolved` already has, and it would need a second retry
predicate kept in step with the first.

Within the bound, the results of the exponential family span the whole
range of exponents. The threshold for `exp` is an argument at
`(10^18 + 1) ln 10`, about `2.3026e18`, throughout its ball. An argument
whose ball reaches across an edge is retried until the ball is within
the bound or past it. If the retries run out, the message says that the
value cannot be told from the point where the result passes the bound. A
rule on the midpoint would be wrong. It would refuse
`exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` with no retry: the first pass
puts the midpoint past the edge, though the argument is `1.5e18`.

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

Each limit refuses with an error kind of its own, so that the message
can say which limit the user can change, or that no setting helps:

- `tooLarge`, an error of the fraction (`rational.ts`), for the
  significand limit;
- `overflow` and `underflow`, errors of `Scaled` (`scaled.ts`), for the
  exponent bound, since only a value with an exponent can pass it.

`Refusal` is the union of the three, and `isRefusal` tells them from the
other errors. `BallError`, `BuiltinError`, `EvaluateError`,
`ConvertError` and the grammar's rejections forward the kind. The retry
loop never retries a refusal. Two retries do happen inside a **node**,
which is one operation of the expression tree as the evaluator walks it,
a step in the user docs' terms: an exact operand is put on the grid, and
a quotient is taken again
([Working precision and the schedule](#working-precision-and-the-schedule),
[The significand limit](#the-significand-limit)). Those retries belong
to the operations and not to the loop. The messages, as the tests pin
them:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
"exp(-1e999)" is too small to compute: its exponent would fall below -10^18.
```

The second sentence of the first message is the remedy. A refusal
carries it when `approx`, decimal mode or a wider limit would compute
the value (`fits` in [The significand limit](#the-significand-limit)). A
refusal of a value that passes the limit however it is computed says so
instead.

A refusal at the bound names its side, `overflow` above or `underflow`
below:

- In `scaled()` the side is the sign of the exponent that passes the
  bound.
- In the guards the side is the sign of `exp`'s argument, or the sign of
  `y ln x` in `powLogSpace`. In `powBall` it is the side of one that the
  midpoint lies on, flipped for a negative power.

An exact power is reported by its value's decimal exponent, not by
whichever check fails first (`powerRefusal`). `7^1e19` is refused by the
significand limit's size prediction, and it is reported as an
`overflow`, since its value is past the bound, which no setting moves.
`2.54^1e18` has a canonical exponent of `-2 × 10^18`, past the bottom of
the bound, but its value is `10^(0.40 × 10^18)`, within the bound. It is
reported as `tooLarge`, a refusal at the significand limit.

`powerRefusal` finds the side exactly, by comparing the base's magnitude
with one. It finds the size from bounds on the logarithm of the value's
exponent. For a base within `2^-30` of one, those bounds come from the
base's exact difference from one, so `1.0000000001^1e30`, about
`10^(4.3 × 10^19)`, is too large. Within a relative `2^-20` of the
bound, measured in that logarithm, the check does not decide, and the
refusal stays `tooLarge` (`POWER_MARGIN`, a margin beyond the bounds'
own `2^-30`). `7^1.1832946e18`, about `10^(10^18)`, is `tooLarge`, where
`7^1.1833e18` is an `overflow`.

A product or a quotient past both limits is reported at the bound when
every decimal exponent its result can have lies past the bound. The test
reads the operands' decimal exponents (`pastBoundBetween`). When some
possible exponent lies within the bound, the result is `tooLarge`. A sum
never faces the choice. A sum that aligns and passes the bound is
`overflow` or `underflow`. A sum that cannot be aligned is `tooLarge`,
or, with an inexact operand, it takes the value of its larger operand,
which is within the bound.

### Why the exponent bound stays at `10^18`

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) says
that the bound is not a setting, that a higher one is ruled out, and
that log space is the way to work past it. The bound stays where it is
for four reasons, all from the implementation.

The exponent is a `bigint`, so `10^18` is a check and not a storage
limit. It is kept by decision. A result beyond it is computed in log
space: `1e999 / ln(10)` is the decimal exponent of `exp(1e999)`, and a
quotient of exponentials is the exponential of a difference, so
`exp(1e999) / exp(1e999 - 5)` is `exp(1e999 - (1e999 - 5))`. `approx`
does not help here. It never changes an exponent, so a result past the
bound is refused with it or without it ([approx](#approx)).

- **Cost.** The kernel squares once per bit of the argument, and each
  squaring works at the working bits plus as many bits as the argument's
  magnitude has. So the cost of `exp` grows at least as the square of
  the argument's length. In a scratch build with the bound raised (and
  `MOST_MAGNITUDE` in `fixed-exp.ts` raised to match), the first pass of
  `exp` at 32 digits takes milliseconds for `exp(1e100)` and seconds
  once the argument has a few thousand digits. These are rough,
  illustrative figures. Anything past about `exp(1e500)` would exceed
  the probe's default budget for one pass, on every keystroke. The probe
  is the timing of the device that recommends the limits
  ([Probe budget and "Measure this device"](../docs/settings.md#probe-budget-and-measure-this-device)).
- **Soundness.** Parts of the number type are exact only within the
  bound. `log2Bounds` and `decimalExponentOfLog2` take the exponent
  through the 128-bit `log2 10`, which is sized for an exponent at the
  bound (an error of `2^-68`). Every radius taken from a midpoint, the
  product rule, certification and the display's bound rest on those two
  functions. An exponent of 3,300 bits would put the error near
  `2^3200`. The classifier's edges are fixed at the bound too. In a
  build with the bound raised, the digits are right by the construction
  of the midpoint, and no certificate vouches for them.
- **A bound is needed anyway.** `exp(exp(1000))` has a 434-digit
  exponent, and `exp` of that has an exponent of `10^434` digits, which
  no `bigint` holds. Raising the bound moves the wall without removing
  it.
- **Little to show.** An answer beyond the bound is mostly its exponent.
  32 digits of `exp(1e999)` take 1,034 characters, where log space gives
  the part that can be read.

Raising the bound is ruled out on those grounds. It would take four
things:

- `MAX_EXPONENT` and a reason for its new value. One candidate ties it
  to the significand limit, an exponent of as many bits as a significand
  may have.
- The classifier's edges and `MOST_MAGNITUDE`.
- `log2 10` computed to the exponent's bits plus a margin, from a memo.
- A display for an exponent of thousands of digits.

One rule would stay: a pass whose argument is too wide for the result to
have a digit is `unresolved` at the bound. A setting for the bound is
ruled out as well. The bound is a constant, generous and finite, and
nothing a user computes needs `10^(10^18)`.

`approx` would not help even if the bound were raised, because of what
the exponential does to a radius. `exp(x ± r)` is `exp(x)` times a
factor between `e^-r` and `e^r`. The argument's absolute radius
therefore becomes the result's relative error, and `exp` of a large
argument needs that argument to many more digits than the result shows.
The relative precision of `approx(1e999)` bounds the precision of the
result's logarithm, not of the result. At 32 display digits, with the
default precision limit of 1,000 and the default significand limit of
65,536 bits, the schedule gives:

| Pass | Working grid (digits) | Radius of `approx(1e999)` | `exp` of it, known within | Exponent digits known |
| ---: | --------------------: | ------------------------: | ------------------------- | --------------------: |
|    1 |                    52 |                  `1e+948` | a factor of `e^(10^948)`  |             51 of 999 |
|    2 |                    94 |                  `1e+906` | a factor of `e^(10^906)`  |                    93 |
|    3 |                   178 |                  `1e+822` | a factor of `e^(10^822)`  |                   177 |
|    4 |                   346 |                  `1e+654` | a factor of `e^(10^654)`  |                   345 |
|    5 |                   682 |                  `1e+318` | a factor of `e^(10^318)`  |                   681 |
|    6 |                 1,354 |                  `1e-354` | a relative `1e-354`       |                   all |

The exact argument needs none of these passes. `expFixed` halves an
argument once per bit of its magnitude and works that many bits beyond
the working bits. So `exp(1e999)` would certify at the first pass if the
bound were raised. `exp(approx(1e999))` would be `unresolved` at passes
one to five and certified at the sixth, at several times the cost. It
would cost more still without the rule that answers a wide argument from
the exponential of its upper end
([The kernel's boundary](#the-kernels-boundary)). The first pass would
then square an interval whose error doubles its bit length at each
squaring, until the kernel gives up.

## Certification and the display rule

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
what a certified digit is and how an output line and its note read, and
[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states how a value that is zero within a bound is written.

`show(ball, { digits, rounding, ratio })` in `display.ts` is the only
place where a value is rounded in the user's rounding mode. It formats
the midpoint at the digits asked for, in that mode. In every mode that
rounds a magnitude up, the rounding can carry across a power of ten:
`9.99` at two digits is `10`.

A ball certifies `d` digits in a rounding mode when `mid - rad` and
`mid + rad`, as exact values, round to the same `d`-digit value in that
mode. Rounding is monotone, so every value between the two ends rounds
to that value too. The digits shown are therefore what rounding the true
value would give: correctly rounded, not merely close.

The rule looks at the two ends, and not at the size of the radius,
because of where the rounding cells lie. A rounding cell is the interval
of values that round to one `d`-digit value. The ball is symmetric about
its midpoint, and the cells are not aligned with it. A radius below half
a unit in the `d`-th digit is necessary and not sufficient. A ball of
radius `10^-30` around `1.2345` fails at four digits under
`halfAwayFromZero`, since the true value may lie on either side of the
tie.

The two-ended rule costs a retry when the true value lies near a
**rounding boundary**, the end of a rounding cell: the next pass narrows
the ball past the boundary. A boundary of a nearest mode is a **tie**, a
value halfway between two roundings. A boundary of a directed mode is a
**grid point**, a value that the mode leaves unchanged. A value that
lies exactly on a boundary, and was reached through an irrational step,
is the one case that no pass resolves. It ends at the ceiling with one
digit fewer than asked.

A one-sided radius, a ball that extends from its midpoint in one
direction only, is ruled out. Every error the ball carries is symmetric:
the kernel's count bounds the distance from the true value in either
direction, and every settle rounds to nearest. A second end would be a
second number carrying no information.

The one definition covers the nearest modes, the directed modes, ties,
and the carry across a power of ten. Certification is not monotone in
the digit count. Under a nearest mode, `[1.246, 1.254]` certifies three
digits, since both ends round to `1.25`. It does not certify two, since
`1.25` is a two-digit tie. So `certifiedDigits` (`ball.ts`, over
`certifies`) scans down from the digits asked for and takes the first
count that certifies.

The two ends are formed exactly where the radius can be formed and
aligned with the midpoint. Two cases remain: a radius too small or too
large to form (`2^-70000`), and a radius that cannot be aligned with its
midpoint (`1e999999999 ± 1.5`). In both, the ends round to the same
value exactly when no rounding boundary of the digits asked for lies
within the radius of the midpoint. So the distance from the midpoint to
the nearest boundary is measured against the radius. In units of the
last digit asked for, the boundaries are the whole units under a
directed mode and the half units under a nearest mode. The boundary just
below the midpoint's power of ten is tested too, since the cells below
it are a tenth as wide. The distance is exact, an arithmetic within the
midpoint's own digits. It is compared with the radius by the coarse
bounds, and a distance that the bounds cannot tell from the radius
certifies nothing.

`show` returns a kind with the text:

- `exact`: the radius is zero and every digit held is shown. It is the
  one kind shown with `=`. With the ratio notation, an exact value is
  written entire, as a whole number or a ratio
  ([The rule](notation.md#the-rule)).
- `certified`: every digit asked for is certified. This includes an
  exact value with more digits than shown, such as `1/3` at eight
  digits, which is `≈` with no note.
- `partial`: fewer digits than asked for are certified, and the text is
  those digits. With none certified, the text is the midpoint at the
  digits asked for. The kind has two sources. One is a rounding boundary
  at the digits asked for, reached through an irrational step. The other
  is the ceiling, for a value that no count down to one digit certifies:
  a one-digit tie in a nearest mode, or a grid point under a directed
  mode, which lies on a cell's edge at every count.
- `zero`: a ball that contains zero without being exactly zero, which
  certifies no digit. It is shown as `0`, whatever the sign of the
  midpoint, with a written bound at or above `|mid| + rad`. The
  midpoint's sign is noise within that bound. The written bound is
  rounded up twice, the radius to thirty bits and then the sum to one
  significant digit, so a round radius shows the next digit up.

  The written bound has an edge case at each end of the exponent bound.
  A written bound whose decimal exponent lies below `-10^18` is written
  as `1e-1000000000000000000` (`zeroBound`). A power of a ball around
  zero can carry such a bound, since nothing holds a radius to the
  bottom edge: `(approx(1e20) - approx(1e20))^1e10000` carries a bound
  whose exponent runs to ten thousand digits. The value written is
  larger than any such bound, so the line stays sound. It is the
  smallest positive value within the exponent bound, so nothing shorter
  could be written, and it parses back. At the top edge, a ball around
  zero whose upper end reaches `10^(10^18 + 1)` is `unresolved` before
  it reaches the display. A written bound that its rounding up carries
  past the edge (`1e+1000000000000000001`) is written as it is: it is
  larger, so the line stays sound, and it is a note, not a literal. The
  written bound is never typed back as the result. Rounding it up at
  either edge therefore loses only the fact that the value is even
  closer to zero than the line says, which the line does not claim to
  know.

- `unbounded`: the radius is not known, and the midpoint's digits
  certify none. No operation of the app produces one today. The kind is
  what a built-in without a propagation rule would return
  ([Exact mode](#exact-mode)).
- `uncertified`: a value that decimal mode has flagged
  ([Decimal mode](#decimal-mode)).

| You type                  | Exucal shows                        | Note                                                  |
| ------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `sqrt(2)^2 * 1.000000025` | `≈ 2 (7 of 8 digits are certified)` | a tie at the eighth digit, through an irrational step |
| `sqrt(2)^2 * 0.75`        | `≈ 1 (0 of 1 digits are certified)` | at one display digit: a one-digit tie                 |
| `approx(1)`               | `≈ 1 (0 of 8 digits are certified)` | under `floor`: a grid point                           |
| `sin(pi() radian)`        | `≈ 0 (within 2e-4049 of zero)`      | the `zero` kind                                       |

`show` tests the kinds in this order: uncertified, unbounded, exact,
zero, and then the digit count. Exactness is a property of the value,
not of the display. A value that passes through a root and comes out
looking rational is still inexact: `sqrt(2) / sqrt(2)`, whose midpoint
is exactly `1`, is `≈ 1`. `sqrt(4)` is `= 2`, because the exact case was
detected and nothing was rounded. The default rounding mode is
`halfEven`, the default of
[IEEE 754](https://ieeexplore.ieee.org/document/4610935). It is unbiased
over many roundings, where rounding ties away from zero drifts. The
display never writes the radius. It writes the certified digits, and a
note where they are fewer than asked for or where the value is zero
within a bound.

One rounding could write a value past the exponent bound: the rounding
to the display digits of a value within the bound, when it carries the
value's exponent past the bound. That rounding is refused as the bound's
`overflow`, and no line is written, so that every line parses back
([Every literal parses back](notation.md#every-literal-parses-back)).
[The converter and its lines](architecture.md#the-converter-and-its-lines)
describes what the outcome writes around the text: the notes, the
relation and the lines.

## Working precision and the schedule

[Digits you can trust](../docs/numbers.md#digits-you-can-trust) states
the retry loop as a user meets it, and
[Precision limit](../docs/settings.md#precision-limit) states the
setting that caps it.

Every core function that does arithmetic (`evaluate`, `buildTable`,
`powQuantity`, the built-ins) takes a `NumberContext` (`context.ts`),
which holds:

- A precision, in significant digits.
- A rounding mode.
- The mode, exact or decimal. The field `mode` is optional, and a
  context without it is an exact one (`modeOf` reads it).
- The significand limit.
- The ceiling.
- In decimal mode, an optional count of working digits.

Below the pipeline, `precision` is the **working precision**: the
precision of one pass, not the digits shown. The pipeline
(`evaluateText`, `convertText`) is the one place that knows the
difference. It takes the user's context, whose precision is the digits
asked for, and derives from it the working contexts it evaluates at.

There is one context type for both levels. A second type for the user's
settings would have the same fields with one renamed. The two differ in
level and not in shape, and the pipeline's header states the level. The
significand limit and the ceiling are the same at both levels: the
significand limit bounds what any pass may form, and the ceiling bounds
how far the passes may rise. The ceiling is a field of the context,
rather than a parameter beside it or a lookup closing over it, so that
it reaches a built-in. The memos are sized by it, and `pi()` reads it
from the context it is called with.

`checkContext` requires `precision <= ceiling`. When working digits are
given, it also requires `working >= precision` and
`4 (working + GUARD_DIGITS) <= ceiling`. It checks these in either mode,
though exact mode carries the working digits and ignores them.

`workingContexts` yields the schedule of passes. The first pass is at
the digits asked for plus a guard of ten (`GUARD_DIGITS`). Each later
pass doubles the one before, and the last pass is at the context's
ceiling. `ceilingFor(precisionLimitDigits)` is four times the sum of the
precision limit and the guard, `4 × (L + 10)`. That is 4,040 digits for
the default limit of 1,000, which gives nine passes at eight display
digits and three at a thousand.

A pass's precision is not the grid its values settle onto. A pass at `p`
digits runs the kernel at `bitsFor(p)` bits and settles onto the working
grid of `workingDigits(p)` digits, which is `digitsFor(bitsFor(p))`. The
grid has about ten digits more than `p`, for the kernel's guard bits.
The first pass at eight display digits settles onto 28 digits, and the
ceiling pass onto 4,050 ([Settling](#settling)).

`resolve` runs `schedule` in `pipeline.ts`, which is `workingContexts`
in exact mode. The schedule is geometric, so the passes together cost at
most about twice the pass that succeeds, with one exception.
`workingContexts` keeps every doubled precision strictly below the
ceiling and adds the ceiling after the last of them. Where the ceiling
lies just above a doubled precision, as a ceiling of 45 does after a
pass at 44, the last two passes are nearly one size, and the passes
together cost about three times the last
([#199](https://github.com/bsidhom/exucal/issues/199)).

Cancellation costs digits: `k` of them when two values agree to `k`
digits before they are subtracted. Each doubling pays for as many digits
again as the pass before had. The ten is **the schedule's guard**, the
guard of the first pass. A short expression loses a few digits to the
rounding of each step and a little more to an ordinary cancellation. Ten
covers that, so the common case certifies on its first pass. The
schedule's guard is separate from **the kernel's guard bits**,
`GUARD_BITS`, which are one routine's headroom for its own error count.

The ceiling is the top of the schedule. It has to be one number for
every count of display digits, since the definitions table and the memos
are built once, at it. It is set from the largest request the limit
allows. At display digits equal to the limit, the first pass is the
limit plus ten. Four times that puts the ceiling two doublings above
that first pass, which gives the largest request two chances to pay for
a cancellation, and a smaller request correspondingly more. Four is the
least factor that gives two doublings, and eight would double what the
table and the memos cost for every setting. The guard of ten and the
factor of four are judgments, not measurements.

A routine that needs more headroom than the working precision takes it
inside the kernel: the guard bits, the extra terms of a series, or `pi`
to the working bits plus the argument's bit length for a reduction. It
never moves the ceiling. Headroom is a property of one routine at one
argument, and the ceiling is a property of the whole schedule.

`resolve` in `pipeline.ts` runs the evaluation at each working context
in turn, parsing once, outside the passes. Each pass's outcome steers
the loop:

- A result ends the loop when every value in it is exact, certified at
  the digits asked for, or of unbounded radius. The values are the unit
  value, each list term unrounded, and a function want's count. Such a
  result is the answer.
- A result that certifies fewer digits is kept as the best so far, and
  the next pass is tried. A cancellation that cost `k` digits is paid
  for by `k` more working digits.
- A result that assumes an undecided condition is kept the same way and
  is never final ([Conditions](functions.md#conditions)).
- Four errors continue to the next pass: an `unresolved` at any depth of
  a call or an inverse, the converter's `unresolvedWant`, a ratio that
  is `unresolved` at the bound, and an `undecidedCondition`.
- Any other error ends the loop, with the best result so far if a pass
  produced one and otherwise with the error. A later pass that fails
  outright beats an earlier result that assumed a condition, since more
  digits may have decided the condition against the argument.
- At the ceiling the best result so far, or the last error, is returned,
  and the display shows what is certified.

A refusal is never retried, and a refusal first raised at a later pass
ends the loop with the best earlier result. Only two sites can refuse at
a later pass what an earlier pass computed, since only their counts grow
with the pass's bits. One is the log-space power's decision, which
refuses by the bits the decision itself would work at (`unaffordable`).
The other is a series' working bits.

Expressions that never certify, such as `sqrt(2)^2 - 2` and
`sin(pi() radian)`, run to the ceiling however it is set, and the
ceiling bounds their latency. The precision limit is therefore a cost
setting. [The costliest expressions](cost.md) catalogues what such
expressions cost.

Two gaps are accepted:

- A list unit whose ball straddles zero is the list's `nonpositiveUnit`,
  and the loop ends on it rather than retrying, though a later pass
  might narrow the unit. The check is on the whole ball, not on the
  midpoint, because a unit that cannot be told from zero is no size to
  count by. Failing there also keeps a remainder's division from ever
  being `unresolved` ([Unit lists](architecture.md#unit-lists) carries
  the gap and its issue).
- The outcome's reciprocal line is one step at the user's context,
  outside the loop
  ([The converter and its lines](architecture.md#the-converter-and-its-lines)).

Two details of the pipeline remain. A `want` that fails to parse is
reported after a `have` that fails to evaluate. The `have` is tried
once, at the first pass, so the pipeline's rule that `have` is tried
first holds. And `resolve` takes an optional `PassObserver`, called as
each pass starts and ends. The stress harness times passes through it,
and it changes nothing it observes.

The definitions table is built once, at the ceiling context
(`ceilingContext`), by `system-build.ts`. It is rebuilt only when the
precision limit changes the ceiling, never when the display digits
change. The angle units call `pi()`, so their quantities carry a radius
that is fixed when the table is built. The passes re-evaluate the
expression and not the table. A unit's precision must therefore lie
above every pass, or the unit holds back a pass that would otherwise
certify `p` digits. One ceiling serves every count of display digits
under one precision limit, so one table serves them all.

The lookup hands each unit out as built, and the evaluator's unit node
settles it to the pass's precision, so that no pass carries more of the
unit than it computes at. `turn` into `deg` certifies every one of its
digits of `360` and shows `≈` only because the radius is not zero.
Rebuilding the table at each pass's precision would cost a build per
pass, milliseconds each, for no gain. A table per setting would hold one
table for every setting the session had seen. One table, replaced when
the ceiling moves, is the whole footprint. The table is built in exact
mode whatever the user's mode, and a unit is settled in the user's mode
at the node that names it.

In decimal mode the schedule is one pass, at the user's context and the
digits asked for. A higher internal precision would compute something
other than what the mode asks for. The retry happens inside each step
instead ([Decimal mode](#decimal-mode)).

## Settling

Every result the evaluator produces, and every unit the lookup hands
out, is settled to the working context. To **settle** an inexact value
is to round its midpoint onto the working grid, to nearest with ties to
even, and to add the rounding to the radius. The working grid is the
grid on which the kernel's results leave. An exact value is never
settled. So an inexact midpoint never grows beyond the working
precision, however long the expression, while an exact value stays the
exact number it is.

Every inexact result is settled because an unsettled midpoint grows.
Left to grow as an exact rational, an inexact midpoint reaches the
significand limit within a few operations. A kernel result at the
default ceiling has some thirteen thousand bits, and its fifth power
already passes the default limit. That power would be refused for digits
that carry no information. `powBall` on an inexact base squares with
settling for the same reason. An inexact value is a number computed, not
a number known. Keeping its midpoint as the exact result of exact
operations on kernel outputs would spend exactness on a value that has
none. Arb follows the same discipline. Whole-expression precision is
untouched: the errors that settling adds are at the working precision,
far below the digits asked for, and the retry loop raises that precision
until the digits certify.

Settling rounds to nearest, not in the user's rounding mode. It bounds
the size of a number the user never sees. In exact mode the user's mode
is applied once, by the display, to the certified value of the whole
expression, and certification guarantees that the result is the true
value's rounding in that mode. A mode applied inside the expression
would change nothing that is certified, and would be a double rounding
besides.

A settle charges the radius for its rounding:

- When the rounding moved the midpoint, the charge is half a cell of the
  working grid, as a radius at or above that half cell.
- When rounding to nearest would carry the midpoint past the top of the
  exponent bound, the settle rounds toward zero instead and charges a
  whole cell. Settling never refuses a value in exact mode.
- A zero midpoint is left unchanged.

The half cell is a radius read from the exponent (`powerOfTenRadius`),
not a value formed and checked against the bound. A midpoint at the
bottom edge, whose half cell lies past the bound, therefore settles:
`1e-999999999999999999 / approx(3)` is
`≈ 3.3333333e-1000000000000000000`. The same rounding puts an exact
operand on the grid when the strict limit refuses the exact step of a
sum, a product or a quotient with an inexact operand
([Sums and alignment](#sums-and-alignment)).

`step` in `ball.ts` is the one entrance through which a computed value
becomes a value of the expression, in either mode. Every node goes
through `step` (`stepQuantity` in `quantity.ts`), plain arithmetic
included. So do the pipeline's own quotients (the conversion's ratio, a
list's terms, a function want's count) and the outcome's reciprocal. In
exact mode `step` runs the computation once, at the context, and settles
the value. In decimal mode it runs the computation at the working
contexts until the rounding is certified, and rounds once, which is the
mode's one rounding of each step ([Decimal mode](#decimal-mode)). Its
primitive, `settle`, is not exported. A settle that any caller could
apply to any ball, beside a step that only some call sites take, would
be a contract kept in documentation rather than in the one entrance.

## Exact mode

[The two modes](../docs/numbers.md#the-two-modes) states exact mode's
promise, and
[Identities and cancellation](../docs/numbers.md#identities-and-cancellation)
states what it cannot do.

Exact mode is the default. Its one promise is that an exact value, a
value of radius zero, is an exact rational however it was formed. Every
exact operation on exact operands keeps it so: a literal, a unit, a sum,
a conversion, an exact case of a built-in and a comparison. Exactly two
things ever produce a nonzero radius. One is an inexact function: a
root, a kernel routine, `pi()`. The other is the built-in `approx`,
which makes a value inexact at the user's request. Decimal mode's
rounding of a step produces an exact value
([Decimal mode](#decimal-mode)).

The design adds no rounding the user did not ask for. It declines a
rounding on that ground three times:

- A sum that cannot be aligned is refused rather than rounded
  ([Sums and alignment](#sums-and-alignment)).
- A mode that rounds every literal is ruled out in favor of `approx`
  ([approx](#approx)).
- An exact result past the significand limit is refused rather than
  rounded at the node ([The significand limit](#the-significand-limit)).

A value the user wrote exactly is never silently replaced by a different
value.

Whole-expression precision is the practice of raising the passes'
precision until the whole expression's ball certifies the digits asked
for, in the manner of Arb. Whole-expression rounding is its counterpart
([Settling](#settling) says why no rounding inside the expression takes
the user's mode). The user page lists what the mode cannot do, and the
cause is the same each time: an irrational step leaves a ball that no
pass closes. `sin(pi() radian)` is a ball around zero whose relative
accuracy never improves, since `pi()` is rounded before `sin` sees it.
The ceiling ends the escalation, and the display shows `≈ 0` with a
bound. Exactness for such identities needs symbolic values
([Symbolic values](future.md#symbolic-values)), and Arb does not do
otherwise. `turn` into `deg` shows a conservative `≈`: the result is
exactly `360`, but it is computed through a rounded `pi()`. That is the
one visible cost of `pi()` being a function rather than a literal, and
it is accepted. A conservative `≈` is honest, and a false `=` is not.

The alternative is per-operation precision, the guarantee
[MPFR](https://www.mpfr.org/) gives. Every inexact operation returns its
value correctly rounded to a working precision the user sets, and
nothing is said about the expression around it. `exp(x) - 1` at a small
`x` then loses its digits to cancellation, and the display does not
know. It is ruled out because the digits shown would be no promise, and
the user would have to choose a working precision beside the display
digits. Over that model, the ball model costs a radius beside every
midpoint, a propagation rule per built-in and the retry loop, and it
needs no new structure. The per-operation model is in fact a state of
the ball model, the state in which every radius is unbounded
([Certification and the display rule](#certification-and-the-display-rule)).
A built-in without a propagation rule would still work, under
per-operation semantics, and would gain whole-expression semantics the
day its rule is written.

## Decimal mode

[The two modes](../docs/numbers.md#the-two-modes) states decimal mode as
four rules a user can apply, with the uncertified mark.

Decimal mode is a calculator's arithmetic. Every operation is one
correctly rounded step: its exact result is rounded once, in the
rounding mode, to the digits of the step. The rounded value is then
treated as exact. It has a radius of zero, it is the step's value for
every later step, and nothing records that it was rounded. So "exact" in
decimal mode means "carries no error bound", not "equal to the value
that exact mode would compute". At `p` digits in the rounding mode `R`,
the mechanism behind the rules is this:

1. A decimal-mode value is an integer of at most `p` significant digits
   times a power of ten. That is the `Scaled` form with a denominator of
   one.
2. The operation that is rounded once is a node of the expression tree:
   each `+`, `-`, `*`, `/`, juxtaposition, `^`, a negation (a `-` before
   a product), each literal, each unit looked up, and each function call
   as a whole. Every step but the last is rounded to the working digits
   rather than to `p` ([The working digits](#the-working-digits)).
3. A function call is one node because of what the user can observe.
   Every partial expression visible in the user's expression tree is a
   step. An accumulator inside a built-in is visible to no one, so there
   the radius is kept and used to certify the rounded result. A defined
   function's body is visible in the expression, so its operations are
   steps. Decomposing a built-in into its series and rounding each term
   is ruled out. It loses precision in aggregate, and it throws away the
   one thing the ball model is good for, certifying a rounding.
4. The app does not report how far the roundings have carried the value,
   because in this mode the rounded value is the value.

A radius carried through the mode's steps is ruled out. Under it,
`1 / 3 * 3` would show `≈ 1` with a note that seven of the eight digits
are certified. There are three reasons:

- The radius answers a question the mode does not ask.
- A directed rounding could never certify its last digit, since the
  symmetric ball reaches across the boundary the result sits on.
- It adds no behavior that exact mode lacks.

The ball model stays where it is needed, inside a built-in, whose result
must be certified at extra digits before it is rounded.

A float with a rational significand, as a third number type, is ruled
out as subsumed. Unbounded, it is the exact rational with its power of
ten. Bounded, it is decimal mode. Rationals of bounded denominator are
not closed under addition (`1/3 + 1/7` is `10/21`). Rounding a rational
significand to a nearby rational of bounded size would be a
continued-fraction step that no rounding mode describes and no
calculator's user expects. The rounding modes are defined for a
significand that is an integer of at most `p` decimal digits.

Each kind of operation, in turn:

- **A literal** with more than `p` significant digits is rounded to `p`
  in `R` as it is read, and is exact after that. `2.5400001 cm` at three
  digits is `2.54 cm`, and in `in` it is `= 1 in`. The one exception is
  a literal whose significand passes the significand limit: the limit
  refuses it before anything rounds it, in either mode
  ([The significand limit](#the-significand-limit)). A `p`-digit
  calculator holds `p` digits. Exempting literals would carry the extra
  digits into the first operation and round them there, one step later,
  for no gain.
- **Arithmetic** forms the exact result of two `p`-digit decimals, which
  always exists and is small, and rounds it once. Division by an exact
  zero is the only error, since no value straddles anything. Two
  decimals whose exponents differ by more than the significand limit
  holds take the neighbor rule
  ([Sums and alignment](#sums-and-alignment)).
- **A power** `x^n` for an integer `n` is one operation, the exact power
  rounded once: `2^100` at eight digits is `= 1.2676506e+30`. Where the
  exact power does not fit the significand limit, it is computed on the
  base widened to the working precision, and certified. The limit is a
  cost limit, and a correctly rounded power costs little: `3^1000000000`
  at eight digits is `= 5.243997e+477121254`. A rational exponent is a
  root, an inexact function, and the exact cases of `^` stay exact.
- **A unit** is built exactly at the ceiling, as every unit is, and the
  lookup hands it out as built. The evaluator's unit node rounds it to
  `p` digits in `R`, once. `surveyfoot` at eight digits is
  `0.30480061 m`. `1 ft` is `0.3048 m`, which has fewer digits and is
  unchanged. A unit that holds an inexact value, such as an angle unit
  defined through `pi`, is certified at `p` as a call is. A prefixed
  unit is the product of the prefix's factor and the unit, rounded once:
  the factors are not rounded first.
- **A built-in's call** is certified. The evaluator runs the built-in in
  exact mode at the working contexts of the retry schedule, from `p`
  plus the guard up to the ceiling. It stops when the ball returned
  certifies the digits asked for in `R`, both ends rounding to the same
  value, and takes that rounding as an exact value. IEEE 754-2008
  recommends this for the decimal transcendental functions. A built-in
  therefore never sees a decimal-mode context. `approx` is the one
  exception: it declares itself the identity there
  (`decimal: "identity"` in its definition), since every decimal-mode
  value is already at the user's precision. A built-in's exact cases
  return exact values, which are then rounded to `p` digits if they have
  more. The kernel stays binary in decimal mode, and the mode rounds
  what it returns. A decimal kernel, rounding in `R` inside each
  routine, is ruled out, since it would double the numeric surface for
  every function.
- **The ceiling.** Certification can fail at every pass when the true
  value lies exactly on a rounding boundary of `p` digits: a tie in a
  nearest mode, or a `p`-digit value in a directed one. No precision
  separates the ball's two ends there.

  For `exp`, `ln` and the trigonometric and hyperbolic functions the
  case cannot arise outside their exact cases. At a rational argument
  their value is transcendental, by Lindemann and Weierstrass, so it is
  never a finite decimal. For `gamma`, `erf` and their kin no such
  theorem is relied on. A value can sit on a boundary only when it is
  rational and the built-in computes it on the kernel without
  recognizing it. Roots and powers with rational exponents have their
  exact cases detected before the kernel runs: `sqrt(6.25)`, `6.25^0.5`
  and `pow(6.25, 0.5)` are each exactly `2.5`. But `log(b, x)` looks
  only for an integer exponent or its reciprocal. So `log(4, 8)`, which
  is `3/2`, at one display digit, and `log(256, 512)`, which is `9/8`,
  at three, reach the ceiling under a nearest mode.

  The ceiling is therefore a computation limit that lets the mode always
  answer. At the ceiling, the result is the midpoint's rounding in `R`,
  as a calculator would print it, and the value is flagged
  `uncertified`. The flag is an optional field of `Ball`. It is never
  set to anything but `true`, so that balls compare structurally. Every
  operation carries it from an operand to the result (`carrying`), and
  the evaluator carries it from a built-in's arguments to its result, so
  it is sticky, as the inexact flag of IEEE 754 is.

  The display writes such a value with the `≈` sign bearing a dot above
  it, U+2248 U+0307 as text, and the note "a step could not be certified
  at the precision limit". The component draws the dot itself over an
  `≈` labeled "approximately, uncertified" for assistive technology. `≆`
  is ruled out because it asserts an inequality the app cannot attest:
  the uncertified digits may be exactly right. The value is exact under
  the mode's rounding, and yet the computation could not vouch for its
  last digit. Every operation after it rounds a value that may already
  be a unit off, and the error can compound. The tests exercise the
  ceiling with an injected built-in whose value sits on a tie.

- **A result that is zero** is an exact case where the argument makes
  the function zero exactly (`sin(0 radian)`, `ln(1)`, `atan(0)`). An
  inexact argument is rounded first and misses zero. So
  `sin(pi() radian)` at eight digits is `sin(3.1415927 radian)`, which
  is `= -4.6410207e-8`, a calculator's answer. A ball that contains zero
  without the exact case applying certifies no digit and takes the
  ceiling's rounding. A midpoint within the radius of zero is taken as
  zero.
- **Domains and edges.** With exact arguments every domain check is
  decided, and no argument straddles an edge, so `unresolved` does not
  arise at a call's argument. A result whose exponent would pass the
  exponent bound is `overflow` or `underflow`, decided by the classifier
  on an exact argument. A classifier interval that straddles the bound's
  edge is narrowed by the retry inside the step. An `unresolved` at the
  bound that survives the step is final, as every `unresolved` is in
  decimal mode. A rounded midpoint whose decimal exponent passes the
  bound is refused, since there the rounded value is the result. It is
  `overflow` at the top (`99999999999e999999999999999990` at eight
  digits rounds to `1e+1000000000000000001`) and `underflow` at the
  bottom (`1e-1000000000000000000 / 3`).
- **`approx(x)`** is `x`, the identity.
- **A defined function** is its body, ordinary arithmetic evaluated by
  the same evaluator. Each step of the body rounds, as a programmable
  calculator rounds each step of a program. Calling the function and
  typing its body inline round at the same subexpressions and give the
  same value. Treating a function as one operation, like a built-in, is
  ruled out. A mode that rounded a body once would make `tempF(37)` and
  its inlined body differ, the opposite surprise. A function's
  conditions compare exact values and are always decided.
- **The pipeline's own quotients** are each one operation, rounded once,
  with an exact result: the conversion's ratio, a unit list's counts and
  remainder, a function's count and the outcome's reciprocal.
- **Comparisons** compare exact values. **Dimensions** carry exact
  rational powers whatever the mode: `m^(1/3)` is a third power of
  length, never `m^0.33333333`. Decimal mode rounds scalars, and a
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

In decimal mode every value is exact. A displayed value has at most `p`
digits, and a step before the last has at most the working digits. So
the display's `exact` kind applies to every line: `=`, every digit, no
note. `≈`, "n of m digits are certified", "within … of zero" and "the
digits are not certified" never appear for a rounding that the mode
certified. The ratio notation is not used in decimal mode, and the
outcome never asks for it there
([Not in decimal mode](notation.md#not-in-decimal-mode)). The precision
limit has one meaning in both modes, the finest grid the app rounds
onto. In decimal mode it bounds the display digits and the working
digits, and a step's certification runs on grids up to the same ceiling.

The denominator is fixed at one. A decimal-mode value is then always
representable in the decimal system directly, with no interference from
the rational's reduction. The cost is at the bottom of the exponent
range: a value whose `p` digits would need an exponent below the bound
has nowhere to put them, and is refused. The alternative is a
denominator that flexes by powers of ten. It would give such a value a
representation with reduced precision, as the subnormals of IEEE 754
have, and `Scaled` can hold it, since the invariant is on the value and
not on the stored fraction. It is recorded here so that a change to the
decision is a decision and not a rediscovery.

The midpoint's rounding at the ceiling is the answer for an uncertified
call, rather than an error. An error would withhold a value that every
calculator answers, because an exact case is missing. Keeping the
ceiling's ball on the uncertified value, and letting the display rule
mark what it does not certify, is ruled out too. The radius would then
propagate through the rest of the expression, which is the mismatch that
the mode's definition removes.

The significand limit is nearly idle in decimal mode. With the
denominator fixed it binds four things:

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

The working digits are a setting of decimal mode. With `p` the display
digits and `w >= p` the working digits:

- Every step but the last is rounded to `w` digits in the rounding mode,
  and is exact after that: each literal, each unit, each operator, and
  each built-in's call as a whole, certified at `w`.
- The last step of a displayed value is rounded to `p` digits directly
  from the exact result of its operation, not from a `w`-digit
  intermediate. The last step is the root of the `have` expression when
  the `want` is blank. With a `want`, it is the conversion's ratio, a
  list's counts and remainder, or a function want's recovered count. The
  `have` and `want` texts are then operands of that ratio, those terms
  or that count, and their roots are rounded to `w`.
- Rounding the exact result once avoids the double rounding that a
  calculator's display has. There, a `w`-digit value that its own
  rounding put on a `p`-digit tie is rounded again. Here the answer is
  the correctly rounded value of the last operation on `w`-digit
  operands.
- The reciprocal line is the exception. It is the correctly rounded
  reciprocal of the `p`-digit ratio shown. So `3 m` in `in` at eight
  digits gives `0.0084666664` whatever the working digits, where the
  reciprocal of the exact ratio rounds to `0.0084666667`.
- The answer is exact and written with `=`. Under a directed mode the
  answer is the neighbor of a value that sits on the grid, as that mode
  asks. The working digits change what is rounded, never how.
- With `w = p` nothing changes, which is the default.

| You type (decimal mode, eight display digits) | Into | Exucal shows     | Note                                         |
| --------------------------------------------- | ---- | ---------------- | -------------------------------------------- |
| `ln(exp(1/10))`                               |      | `= 0.099999984`  | the first rounding's error amplified by `ln` |
| `ln(exp(1/10))`                               |      | `= 0.1`          | over twelve working digits                   |
| `ln(exp(1/10))`                               |      | `= 0.099999999`  | over twelve, under `towardZero`              |
| `ln(exp(1/10))`                               |      | `= 0.10000001`   | over twelve, under `awayFromZero`            |
| `1 / 3 * 3 m`                                 | `in` | `= 39.370078 in` | the `have` rounded to eight before the ratio |
| `1 / 3 * 3 m`                                 | `in` | `= 39.370079 in` | over twelve working digits                   |

`operandContext` in `context.ts` is the context at which a step's
operands are computed. In decimal mode with working digits above the
precision, it is the context at the working digits. Otherwise it is the
context itself. It is idempotent, so an operand's operands are at the
same context. The evaluator uses it for every node's operands, a
built-in's arguments, and a function's conditions, whose terms are no
part of a displayed value. A defined function's body is the call's step,
so the body's root is at the call's context. The pipeline evaluates the
`have` and `want` texts at the operand context, and steps the ratio, a
list's terms and a function's count at the user's context.
`evaluateText`, whose value is the one shown, keeps its root at the
user's context. A context derived at another precision
(`workingContexts`, `ceilingContext`) drops the field.

The ceiling applies as it does without the setting. A built-in's
rounding at `w` is certified on grids from `w` plus the guard up to the
ceiling, so `w` may not exceed the precision limit. Exact mode has no
such setting. Its working precision comes from the retry schedule, and a
floor on it would be a floor on the schedule's first pass, a different
control with a different purpose. The retry schedule's contexts are
called "working contexts" throughout the core, and the step callbacks
name their parameter `working`, beside a field `working` that holds this
setting's digits. The choice of that vocabulary is
[#172](https://github.com/bsidhom/exucal/issues/172).

Hand calculators commonly round each step to more digits than they show,
a ten-digit display over twelve or thirteen internal digits, so that the
error of a step lands below the last digit shown. The setting does the
same, and a user of decimal mode expects it from the name. Its default
is the display digits, for three reasons. A user who has not touched the
setting sees the mode as defined. The extended count is one checkbox
away. And a default above the display digits would make the first line
of decimal mode depend on a number that the panel does not show until
the box is checked.

## The significand limit

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold)
states what the limit refuses, what the message suggests and what
`approx` and decimal mode change, and
[How a value is held](../docs/numbers.md#how-a-value-is-held) states the
cost of a power of two in a denominator.

Exact arithmetic cannot overflow, but it can grow without bound:
`3^1000000` and `1e999999999 + 1` are valid input. Beside the exponent
bound, two settings bound that growth, the significand limit and the
precision limit. They are two settings in two units because they bound
two kinds of value, as a float's exponent width and significand width
are different quantities that one number cannot stand for:

- The significand limit is in bits. It bounds the size of an exact
  rational's numerator and denominator, which is the cost of holding an
  exact value and of multiplying it.
- The precision limit and its ceiling are in decimal digits. They bound
  the count of digits an inexact midpoint is settled to. The count is
  decimal because the exponent is: a midpoint of `k` digits is an
  integer of `k` digits times a power of ten, which is the type's
  smallest form and the form the display writes. The kernel converts the
  count to bits, plus a guard, for its own work.

The user sets both
([How the settings bound each other](../docs/settings.md#how-the-settings-bound-each-other)),
since both are cost limits whose right value depends on the device. The
two limits meet in one relation. A settled midpoint at the ceiling is
itself a significand, an integer over one. It must fit the significand
limit with room for a product of two such midpoints, which is
`2 × bitsFor(4 × (L + 10)) ≤ S` for a precision limit `L` and a
significand limit `S`. `precisionLimitFor(S)` is the largest `L` that
satisfies the relation. At the default `S` of 65,536 bits it is 2,453
digits: a ceiling of 9,852 digits is 32,760 bits, and twice that is just
under 65,536. The only slack in the relation is the guard's 32 bits,
which the derivation counts.

The limit has a hard bound, a floor and a default:

- The hard bound is `MAX_SIGNIFICAND_LIMIT_BITS`, `2^20` in
  `rational.ts`, about 315,000 digits. The parser has no context, so it
  applies the hard bound to a literal's significand. The evaluator then
  applies the setting to the same digits at the literal's node, before
  anything rounds them, in either mode.
- The floor is `MIN_SIGNIFICAND_LIMIT_BITS`: twice the kernel's bits at
  a precision limit of one digit, which is 358. Below it no digit fits.
- The default is `2^16`, about 19,700 decimal digits. At that size every
  exact operation still takes milliseconds, the reduction of a quotient
  of two significands at the limit included.

The limit is a limit on cost: it bounds the bits that the app forms,
holds and multiplies for one number, in time and in memory. Its right
value therefore depends on the device, and the probe recommends one. So
the limit measures the size of what is stored, the canonical significand
of a `Scaled`, and not the bits of the value it denotes. The two sizes
differ for a dyadic value. The canonical form trades the twos in its
denominator for fives in the numerator: `2^-30000`, a value of 30,000
bits, is stored as `5^30000 × 10^-30000`, about 69,658 bits, and a
product with it costs those bits.

The extra cost is narrower than it looks. An exact value is expensive by
the bits of the two integers that store it, not by how simple its
factorization is. `3^-100000` is as simple as `2^-30000`, and it is
stored as itself, `1/3^100000`, in 158,497 bits. Any other
representation needs as many, short of a factored one, which the app
does not use. The canonical form adds cost in one case only, a
denominator with twos. The factor is `log2 5`, about 2.32, for a pure
power of two. It is less for a mixed denominator, and it is nothing for
a denominator with no twos, which is every other fraction. So the added
cost is bounded, and it changes the outcome only for a dyadic value
within a factor of 2.32 below the limit. A value that it moves past the
limit was already within that factor of the limit by its own bits, and
so a big number by the measure that matters. `approx` is the remedy, as
it is for any other value past the limit. A binary exponent beside the
decimal one would spare `2^-30000` and do nothing for `3^-100000`: the
cost lies in storing exact rationals as digits, not in the power of ten.
So `1 / 2^n` is refused from `n = 28,225` at the default: `5^28225` has
65,537 bits, and `1 / 2^28224` is a value. `0.5^30000` is refused
likewise, since each is stored with `5^n`.

Every node is held to the limit, sums included, because nothing bounds
an expression's length. Each operation grows its operands by a bounded
factor, but a product of powers that are each within the limit reaches a
million bits in a few factors. A conversion between two such products
costs half a minute if it is formed, as a rough figure on a laptop.

The limit is strict: no exact value is formed past it, and nothing is
measured after the fact. Every operation that forms an exact value first
predicts the result's size from its operands. If the size passes the
limit, it refuses with the bits the result would need (`tooLarge` with a
`Need`):

- **A product or a quotient** predicts after its two cross-cancelling
  gcds, which run on operands within the limit. The predicted size is
  the larger of the two parts' bit sums, which is the true size or one
  bit over it. So `x / x` is one and `(a/b) * (b/a)` is one, and
  `3^32767 * 7^21845` is refused with 113,262 bits, with nothing formed
  (`multiplyWithin`, `divideWithin`).
- **A sum** is refused on the size of its unreduced sum, Henrici's form
  with the common factor taken out first (`addWithin`). That is the
  price of never forming the sum: `1/3^32767 + 1/7^21845` is refused.
- **A power** `x^n` predicts `floor(|n| log2 m) + 1` for `m` the larger
  of `x`'s numerator and denominator, which is the true size or one bit
  over it. `2^65535` is a value at the default and `2^65536` is not.
- **A canonical form** is sized too, before it is made, for a quotient
  or a power whose fraction fits, since a denominator's twos become
  fives in the numerator (`scaledWithin`). `2^-30000` is refused with
  about 69,659 bits, the prediction's count, one over the 69,658 stored,
  and `2^-28000` stays a value. A product and a sum of canonical
  significands need no such check, since their denominators are coprime
  to ten.
- **A sum's alignment** is predicted the same way: the shift is sized
  before it runs ([Sums and alignment](#sums-and-alignment)). A
  literal's digits are measured as they are typed.
- **The built-ins that compute at an argument's bits** refuse on their
  own counts: the trigonometric reduction, `beta`, the incomplete
  functions and `factorial`.

`evaluate()` asserts the limit on every node's result. The pipeline
asserts it on the two quotients it forms outside the evaluator, the
conversion's ratio and a function want's count. An exact result past the
limit at either place is a bug in a prediction, and it is thrown, never
reported as a refusal. A result past both limits is refused by the
prediction before anything is formed, and it is reported at the bound
([Which limit a refusal names](#which-limit-a-refusal-names)).
`multiplyBalls`, `divideBalls`, `convert`, the table's lookup and the
built-ins that multiply or divide all take the context, since a
prediction needs the limit.

| You type            | Exucal shows                                   |
| ------------------- | ---------------------------------------------- |
| `2^65535`           | `≈ 1.001765e+19728`                            |
| `2^65536`           | past the significand limit, about 65,537 bits  |
| `3^32767 * 7^21845` | past the significand limit, about 113,262 bits |
| `2^-28000`          | `≈ 1.4458439e-8429`                            |
| `2^-30000`          | past the significand limit, about 69,659 bits  |
| `1 / 2^28224`       | `≈ 5.3629331e-8497`                            |
| `1 / 2^28225`       | past the significand limit                     |

The largest integers ever formed are the operands of the gcds, and the
probe times those when it recommends the limit. The prediction runs
after the cross-cancelling gcds and never on the unreduced sizes. A
prediction from the unreduced sizes would refuse `x / x`, whose result
is one, since those sizes measure the operands and not the result.
Measuring the result after forming it is ruled out: it would bound what
is kept and not what is formed, and the limit is a bound on what the
device forms.

Every `tooLarge` carries two fields. `Need` is the bits needed:

- `exact` where a value exists, such as a literal's digits or a
  reduction's working bits;
- `bound` where the size is predicted;
- `unknown` where the function cannot say.

`Reach` says whether the same step would succeed if it were computed
inexactly, in the refusing function's own judgment:

- `fits`, where only the exact result exceeds the limit, as for a sum's
  alignment, an exact power's prediction or a product measured;
- `exceeds`, where the computation needs more bits than the limit holds
  whatever its operands, as for a literal's digits, an exponent that
  cannot be formed, or a kernel's reach.

The `Reach` field is required, so no refusal site can be silent about
it. It is stated where the refusal is made and carried through
unchanged. Nothing above the refusing function infers the reach from the
expression's shape, so a function that learns to reach further changes
its own refusal and its own test.

The message names the subexpression and the bits ("of 113,262 bits", "of
about 69,659 bits"; nothing where the need is unknown). On `fits` it
suggests two things to try: decimal mode, or `approx` around the
subexpression's first operand, so that the part is computed to the
digits asked for and shown with `≈`. The evaluator names that operand: a
binary operator's left operand, a power's base, or a call's first
argument. On `exceeds` the message says that the value passes the limit
however it is computed, and suggests nothing. Whether to raise the limit
is left to the user, who can judge from the bits. `approx` around the
refused subexpression itself would come too late, since the node is
refused before `approx` sees it. Around an operand it works, because an
inexact operand makes the result inexact. The suggestion states what the
operation expects to work, and is not a promise.

Exact mode refuses at the node and never rounds an exact result on its
own to stay within the limit. The alternative is to round the result at
the node to the working grid, as `approx` at that node would, and to let
the retry loop certify the digits asked for. It is ruled out, for four
reasons:

- It would be a third source of inexactness, and the only one the user
  cannot see in the expression.
- The limit depends on the device. Under rounding, the same expression
  would be `= 0` on one machine and `≈ 0` within a bound on another,
  with nothing in the expression to say why.
- The remedy is one token, and the choice belongs to the user: a user
  checking an exact identity wants a higher limit, and a user converting
  a measurement wants `approx`.
- Refusing ends the work at the node, where rounding would carry on. And
  the calculator's behavior exists already, in decimal mode and in
  `approx`.

The alternative's rounding is recorded here so that it is not
rediscovered. The node's exact result past the limit would be settled
onto the working grid, with half a cell added to the radius. The
quantity would be marked as rounded, with the node's span, and the
pipeline would carry the mark to the display as a note beside the value.
Nothing downstream would change. A literal past the limit, the kernel's
reach and the exponent bound would still refuse.

An inexact result of the exact operations, and every result in decimal
mode, is settled to the working grid and never refused for size. Four
kinds of intermediate are not checked against the limit: a built-in's
internal intermediates, a unit list's decomposition, the settled loop of
`powBall`, and the display's reciprocal. Each works on node results that
are already held to the limit, and stays within a constant factor of
them. A built-in that computes at an argument's own bits is different.
The trigonometric reduction, `beta`, the incomplete functions and
`factorial` refuse by those bits whether the argument is exact or not,
so `sin(approx(1e999999999) radian)` is refused as
`sin(1e999999999 radian)` is.

A product or a quotient with one inexact operand is inexact in any case,
so it is never refused for its exact operand's size. When the prediction
refuses the exact step, each operand is first put on the working grid by
`onGrid`, as in a sum that cannot align
([Sums and alignment](#sums-and-alignment)), and the product or quotient
is taken again. Two grid significands always fit, by the relation that
`precisionLimitFor` keeps between the two limits. The retry therefore
cannot be refused, and a `tooLarge` there is a bug, thrown. The exact
operand is rounded only because the result was inexact already. Two
exact operands are refused at the node, as described above.

`approx` changes the significand limit's reach in three places, and
nothing else about the limit:

- in a sum, where it lets the radius absorb the smaller operand;
- in an integer power, where an inexact base is settled at every
  squaring;
- in any product, quotient or sum whose exact result would pass the
  limit, where an inexact operand makes the result inexact and settled.

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

`approx(x)` is a built-in of one argument. The argument may have any
dimension, kinds included, and the result has the same dimension. The
result is the value of `x`, known to the working precision and no
better. It is the ball whose midpoint is the midpoint of `x`, and whose
radius is the larger of two radii: the radius of `x`, and one unit in
the last digit of the working grid at the value's magnitude, rounded up
(`widened` in `ball.ts`). The evaluator then settles the result as it
settles every inexact result. The cases:

- An exact `x` gains that unit.
- An inexact `x` whose radius is already larger keeps its radius. The
  result of a root or of a transcendental function is such a value.
- An inexact `x` whose radius is smaller is widened to the unit. So
  `approx` is idempotent.
- A zero midpoint, exact or not, is returned unchanged, since a unit in
  the last digit of zero would be a unit of nothing.
  `approx(sqrt(2) - sqrt(2))` keeps its argument's radius around zero.
- An unbounded `x` is returned unchanged.

The unit is read from the exponent and never formed. For a value near
the bottom of the exponent bound, such as
`approx(1e-999999999999999999)`, the unit lies past the bound.

`approx` never narrows. The precision is decided at the call, which says
"known to this precision, and no better". A radius that the argument
already carries is a fact about the value that the call cannot undo.
Widening a radius is always honest, and narrowing one would claim
knowledge the computation does not have. So `approx` cannot cast a value
to exact, and it cannot raise a value's precision. No reason to raise a
precision by a call is known, since the retry loop raises precision. If
one appeared, it would belong to a built-in of its own, named for what
it does.

`approx` never turns an inexact value exact and never decides an edge.
`factorial(approx(5))` is an error where `factorial(5)` is a value, and
`1 / approx(sqrt(2) - sqrt(2))` is as undecided as
`1 / (sqrt(2) - sqrt(2))`. Of the limits, it changes only the reach of
the significand limit, and only where an inexact operand makes a result
inexact, and so settled rather than formed
([The significand limit](#the-significand-limit) lists the three cases).
It does not help with an exponent literal past the limit, since the
literal is refused before the result of `approx` is raised to it:
`(approx(1e20) - approx(1e20))^1e100000` is refused as `2^1e100000` is.
It raises no error of its own, since its dimension rule accepts any
dimension.

Four things follow:

- Whole-expression precision is kept, since the radius is set by the
  working precision and each pass makes it smaller. `approx(2.54) cm` in
  `in` is `≈ 1 in`, with every digit asked for certified on the first
  pass. It shows `≈` rather than `=`, as intended.
- Identities through inexact values are `≈ 0` with a bound, the ball
  model's honest reading.
- In decimal mode `approx(x)` is `x`.
- A definitions-file body may call it. A measured constant can be
  defined as `G approx(6.674e-11) N m^2 / kg^2`, built at the ceiling
  and settled to each pass's precision as the angle units are. The
  definitions file decides whether to mark any measured factor this way.
  Its measured factors, such as the dalton, are written as exact
  decimals
  ([Which factors are exact](../docs/units.md#which-factors-are-exact)).

`approx` is a function rather than syntax for four reasons:

- a call needs no grammar;
- it has a dimension rule, an arity and the same evaluation path as
  every built-in;
- it gets its wording in messages for free;
- it applies to any subexpression and not only to a literal.

A third mode, rounding every literal to the working precision with
whole-expression rounding kept, is ruled out as the wrong granularity.
`1 ft` and `6.674e-11` can stand in one expression, and such a mode
would make `1 ft` in `in` read `≈ 12 in`.

Four spellings are ruled out, each for its own reasons:

- A postfix `~` on a literal (`2.54~`) is terse, but it needs grammar,
  applies only to literals, and has no binary form.
- A prefix `~` takes the symbol that a notation for the inverse of a
  function would want.
- A `+/-` operator states an absolute uncertainty, which is the binary
  form below. It also cannot be spelled `+-`, since `2.54 +- 0.01`
  already parses as a subtraction.
- The CODATA form `6.67430(15)e-11` reads a number followed by `(`,
  which is a product today. The canonical form also keeps no digit count
  to read the parenthesized digits against.

A binary form, `approx(x, u)`, a value known to within an absolute
uncertainty, is future work
([Extensions that fit](future.md#extensions-that-fit)).

## Failures

[Values too big to hold](../docs/numbers.md#values-too-big-to-hold) and
[Values at an edge](../docs/numbers.md#values-at-an-edge) together list
what stops a result as a user meets it.

A value that cannot be computed is a `Result` error, never an exception.
Every failure in the core is a discriminated union of a value or an
error, and each module defines its own error type.

A violated precondition is different. It is a bug in the caller, not a
value that can fail, and it throws `RangeError`, as `1n / 0n` does.
Examples are a zero denominator passed to the `rational` constructor, a
precision that is not a positive integer, a root degree below one, and a
value past four times the hard bound at the kernel's entry. Every value
that can be zero or negative because the user typed it reaches the
numerics through `divideBalls`, `powBall` and `rootBall`, which report
it. The ball checks the kernel's preconditions, such as a positive
interval under a root, before it calls the kernel. The one known breach
of the rule is the root's verification, which throws
([Roots and powers](#roots-and-powers)).

## Formatting

[How numbers are written](../docs/numbers.md#how-numbers-are-written)
states the written form and the rule that a line is a function of the
value, its exactness and the settings.

`format(s, digits, mode)` in `scaled.ts` renders a `Scaled` as a decimal
string in the style of C's `%g`. The value is rounded to `digits`
significant digits in the mode, and trailing zeros are dropped. Exponent
notation is used when the decimal exponent is below -4 or at least
`digits`, with the exponent written as JavaScript writes it (`1.5e+21`,
`1e-7`, `1e+999999999`). Nothing goes through a `number` on the way, and
the power of ten is never formed, so a value of any magnitude renders
exactly.

`roundTo` builds the canonical form directly from the rounded integer.
It takes an integer's digit count from its bit length and one comparison
(`decimalDigits`), and its powers of ten from the memo (`powerOfTen`). A
settle at the ceiling, a product of two settled balls and the kernel's
exit conversion therefore each stay a small fixed cost;
[Benchmarks](benchmarks.md) holds the figures.
