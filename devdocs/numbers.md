# Numbers and precision

The number type is an exact fraction times a power of ten, and every
magnitude the app computes with is a ball: that number as a midpoint, and
a radius bounding how far it may lie from the number meant. This page
describes the type, the arithmetic on it, where precision is lost and how
that loss is tracked and certified, the two modes of the arithmetic, and
the limits on size. [architecture.md](architecture.md) says how the rest
of the core is built around it, and [builtins.md](builtins.md) how each
built-in function uses it.

Exact fractions rather than arbitrary-precision floats because almost
every unit definition is a rational (`2.54 cm`, `0.45359237 kg`), so
conversions are exact and rounding happens only once, at display time, in
the exact mode that is the default; the power of ten beside the fraction
because a value's magnitude should cost nothing. Decimal literals parse
exactly (`1.5e-3` is `15 × 10^-4`). The definitions file holds no
irrational literal: the circle constant is the built-in `pi()`, computed
to the precision of the table it is built in and of the pass an
expression is evaluated at, where GNU units defines `pi` as a decimal
literal, exact to its digits and wrong past them.

## The types

Each layer adds one concept, and no layer stores the concept of the one
above it:

- **`Rational`** (`rational.ts`): the exact fraction in lowest terms, a
  `bigint` numerator over a positive `bigint` denominator, with total
  arithmetic and structural equality. It is the significand of a `Scaled`,
  and on its own the type of a dimension's exponents, of the `^`
  exponent, and of the exact value of a radius, which each need a total,
  small fraction with no power of ten. `rational.ts` provides the
  arithmetic and comparison, integer powers and the exact case of the
  n-th root.
- **`Scaled`** (`scaled.ts`): `significand × 10^exp`, the midpoint's
  type, with the significand a `Rational` and `exp` a `bigint`, in a
  canonical form: the significand in lowest terms with its denominator
  coprime to ten and its numerator not divisible by ten unless zero, and
  zero as `exp` zero, so that equal values have equal representations and
  `equals` is structural. The constructor `scaled(significand, exp)`
  strips the numerator's trailing zeros and moves the denominator's
  factors of two and five out (`1/6` is `5/3 × 10^-1`); it counts a
  denominator's fives by dividing by `5^(2^k)` from the largest power
  worth trying downward, a logarithmic number of divisions, since one
  division per factor made normalizing `10^300000` take a minute. The
  form is internal: `format`, `roundTo`, `toRational` and the ratio
  notation are functions of the value, and `2.54`, `254/100` and `127/50`
  render alike everywhere. Rounding to significant digits commutes with
  the power of ten, so rounding and formatting act on the significand
  alone and add `exp` to the exponent: the digits of `1e999999999`, of its
  square and of `exp(1e6)` are written with nothing formed. The decimal
  exponent of any value is the significand's plus `exp`, exact and cheap.

  The exponent is a type of its own between the fraction and the ball,
  rather than a field on `Rational`, because it changes what the type
  promises: with an exponent, `add` and `subtract` can fail
  (`1e999999999 + 1` cannot be aligned without forming a number of a
  billion digits), and the fraction's other users need a total type.
  It is not flat in the ball either, since a midpoint must stand as a
  number on its own, with its own comparison, rounding, formatting,
  certification and settling, and a parsed literal is a number before it
  is a ball.

  There is one exponent, decimal, and the kernel's binary base never
  crosses the kernel's boundary ("The kernel's boundary" below). Four
  things produce or consume a midpoint, and three are decimal: a literal
  or a unit is decimal or rational and exact, the display and the
  certification of digits are decimal, and decimal mode is a decimal
  grid; only the kernel is binary, and every value crosses its boundary
  through a conversion already, so the one base change goes where the
  representation changes anyway. A first design carried a binary
  exponent beside the decimal one, so that a kernel result and a literal
  both entered exactly and settling stayed a shift; the mixed base leaked
  into every operation that brought the two together (a sum of two large
  exponents of different bases needed a rebase in log space, a comparison
  had an undecidable case, certification and the radius needed the
  `log2 10` constant, and the display had to fold the binary power into
  the significand before it could write a digit), which is why no
  arithmetic library keeps two exponents on a value. A single binary
  exponent was never a candidate: a literal's power of ten could not
  enter it exactly, and decimal mode could not hold its own values at
  large exponents. The price of the one base is a division per settle in
  place of a shift: the division alone measured, when the base was
  chosen, at 0.2 ms against 0.04 ms at the default ceiling and nothing
  below it ("Formatting" below gives what a whole settle costs).

  Two other shapes for the decimal mode were set aside: a second number
  type beside `Rational`, with the core generic over the two, which
  doubles the numeric surface of every built-in; and decimal mode as a
  rounding step in the evaluator over the fraction alone, with no
  exponent, which caps a value at the significand limit's digits, about
  19,700 at the default, so that `exp(100000)` and `gamma(20001)` would
  fail in the mode whose point is to represent them. The exponent is what
  makes decimal mode a float, and its cost is confined to `scaled.ts`.

- **`Radius`** (`radius.ts`): a coarse binary magnitude,
  `significand × 2^exp` with a normalized 30-bit `bigint` significand and
  a `bigint` exponent, or the distinguished value unbounded. Every
  operation on radii rounds up, so a radius is always a true bound; the
  tightness lost to 30 bits is a relative `2^-29`, invisible at any
  precision. It is binary because the kernel is binary, and coarse so
  that propagating it through an expression costs nothing and never
  grows. The exact value of a bounded radius is a rational
  (`radiusUpper`), obtained when a comparison needs it and never stored.

  Not a float64, although one has precision to spare, because of range:
  the radius is absolute, and the product rule scales it by the other
  operand's magnitude, so radii span the range of the values themselves,
  `10^±(10^18)`, against a float64's `10^±308`. A radius that overflowed
  to infinity would be an honest but useless bound on any large value,
  and one that underflowed to zero would be a false claim of exactness.
  JavaScript also has no directed rounding, so every float64 operation
  would need a manual nudge up by an ulp. The exponent is a `bigint` for
  the same reason: the binary exponent of a value near `10^(10^18)` is
  about `3.3 × 10^18`, beyond a safe integer.

- **`Ball`** (`ball.ts`): a midpoint beside a radius, and the operations
  that compose the midpoint's arithmetic with the radius's propagation
  rules. `scaled.ts` knows nothing of radii, and `radius.ts` reads a
  midpoint only for its binary bounds (`radiusAboveScaled`, through
  `log2Bounds`). An exact value is a ball of radius zero, and `=` in the
  display means exactly that. A ball may also carry the flag
  `uncertified`, which is decimal mode's alone ("Decimal mode" below).
- **`Fixed`** (`fixed.ts`): the kernel's representation, on which the
  inexact functions run: `{ value, error, bits }`, the integer `value`
  standing for `value × 2^-bits` and `error` an upper bound, in units of
  `2^-bits`, on its distance from what it stands for. Every operation
  updates `error` by an over-approximation that is a few lines of integer
  arithmetic, so the bound can be checked by reading. A series runs on
  such values with the argument's error included from the start, which
  propagates the argument's radius without a separate derivative bound;
  the truncation bound of a series is taken at the upper end of the
  argument's interval. Fixed rather than floating point: `bits` is the
  position of the binary point and belongs to the value. A routine
  chooses its result's `bits` after its argument reduction so that a
  result of magnitude `2^k` keeps as many significant bits as an argument
  of order one, which is how a routine whose result is small or large
  (`sin` near zero, `exp` of a large negative argument, a root of a tiny
  argument) states its scale; `shiftFixed` is the exact rebase that moves
  the binary point. Every routine works on values of order one after its
  reduction, so the absolute error count is a relative error too, and the
  count grows by at least one per operation: a series of a thousand terms
  spends ten of the 32 guard bits (`GUARD_BITS`), which is why the guard
  is bits rather than digits.

  The alternatives: a ball at every step of the kernel, as Arb does,
  uniform with the value type but a radius operation per arithmetic
  operation and a second representation to reason about inside every
  series; two integer endpoints, twice the arithmetic and a rounding
  direction to choose per operation; and guard digits with no error
  count, the classic approach, which is not rigorous and could not
  produce a radius at all. The integer count is the cheapest that yields
  a proof, and its rules are the textbook ones.

- **`Floating`** (`fixed.ts`): a `Fixed` significand with a binary
  exponent, `significand × 2^exp`, the form of the results that can be
  large, the exponential's and the hyperbolic pair's. `digits.ts`, above
  the kernel since it calls it, takes one out as a ball.
- **`Quantity`** (`quantity.ts`): a ball with a dimension
  ([architecture.md](architecture.md), "Quantities, dimensions and
  kinds").

`rounding.ts` names the seven rounding modes (`halfEven`,
`halfAwayFromZero`, `halfTowardZero`, `towardZero`, `awayFromZero`,
`ceiling`, `floor`) and is the one place a mode is interpreted:
`divideRounded`, an integer division rounded in a mode, which every
rounding in the core scales its value down to. `Precision`, a count of
significant digits, lives there too, with `digitsFor(bits)`, the decimal
digits `bits` binary digits are worth, and `bitsFor(precision)`,
`ceil(precision × log2 10)` plus the guard bits, in `fixed.ts`.

## Exact operations

Addition, subtraction, multiplication, division, integer powers and
comparisons are exact on the midpoints, and an exact result is as long as
it needs to be: nothing in exact mode rounds an exact intermediate to
keep it small. A product or a quotient combines the exponents and fails
only at the exponent bound ("The exponent bound" below). What the
operations do to the radii is the elementary propagation: a sum's radii
add, a product's radius is `|a| rb + |b| ra + ra rb`, a quotient's
`(|a| rb + |b| ra) / (|b| (|b| - rb))`, a power's the derivative bound.
The magnitudes are taken as coarse radii from the binary bounds
(`radiusAboveScaled`, from `log2Bounds`: the significand's `log2` from
the top bits of its numerator and denominator through a double, and
`exp × log2 10` through the 128-bit fraction, the two bounds within
`2^-30` of the truth), so that nothing is formed whatever the exponent,
every step rounding up, so that a result's interval contains the exact
result over the operands' intervals, and an exact value stays exact
through them. The quotient rule's divisor is a lower bound on the
divisor's distance from zero from the same bounds, rounded down
(`divideRadius`), which forms no rational and loosens a radius by about
`2^-25` relative over the rule's five coarse roundings.

A divisor whose ball contains zero without being exactly zero cannot be
divided by, since the true quotient may have either sign. That is
`unresolved`, an error kind of its own beside `divisionByZero`, because
the retry loop retries on the first and never on the second; `1 /
(sqrt(2)^2 - 2)` reports it. `unresolved` carries the edge the value
straddles (`Edge`: a point, `"pole"`, or `"bound"`), and the message says
the value cannot be told, at this precision, from that edge. A ball
within an ulp of zero at the kernel's bits is treated as containing zero,
since the kernel cannot tell it apart; a ball of unbounded radius divides
when its midpoint is nonzero, giving an unbounded quotient, and is
`unresolved` when its midpoint is zero. An exact zero times anything,
unbounded included, is exact zero, since unbounded stands for a bound not
known rather than an infinite value; otherwise unbounded absorbs.

`rational.ts` reduces with the smallest gcds the operands allow, each a
textbook rule: a sum and a difference by Henrici's rule (the gcd of the
denominators, then of that with the new numerator), a product by
cross-cancellation (the gcd of each numerator with the other
denominator), a quotient as the product by the divisor's reciprocal, an
inverse or a negative power by swapping with no gcd. The rules are
correct only for operands in lowest terms, the invariant of `Rational`,
so `rational()` is the one constructor that reduces and the invariant is
asserted over every constructor that bypasses it. The gcd is Lehmer's
(Knuth's Algorithm L), which takes steps on the leading word in doubles
and applies the cofactors to the `bigint`s, stripping the common power of
two first: still quadratic, but about forty times cheaper than Euclid's
at 65,536 bits (19 ms against 686 ms). A half-gcd, which is subquadratic,
gains only above `2^16` bits and is left for a larger limit. Where a
quotient's reduction should run is [#78][78].

### Sums and alignment

To add `m1 × 10^e1` and `m2 × 10^e2`, the significand of the larger
exponent is multiplied by `10^|Δe|` and the two fractions are added,
which costs `|Δe| log2 10` bits and is exact; the sum is renormalized.
`add` fails `tooLarge` when that shift exceeds the significand limit: the
exact sum exists and cannot be held. `addBalls` then applies the rule for
what the result is:

- Two exact operands in exact mode are `tooLarge` at the sum when their
  alignment does not fit (`1e999999999 + 1`); exact values never round.
- Otherwise the result is inexact, and the evaluator was about to settle
  it, so it is settled a step earlier: each inexact operand is rounded
  to the working digits first, and an exact operand of more bits than
  the working grid is put on the grid too, rounded to the working digits
  with the rounding charged to the radius, as `approx` would (`onGrid` in
  `ball.ts`, the settle's rounding applied to an exact value), so that
  `(1 + 1/3^41300) + sqrt(2)` keeps its digits where the
  alignment passes the limit; an exact operand already on the grid stays
  exact and costs nothing. If the two then align within the limit they
  are added exactly; if they still do not, their exponents differ by
  more than the limit's digits less twice the working digits, so the
  smaller lies below the working precision of the larger and is absorbed
  into the radius, as a floating-point sum absorbs it (`sqrt(2) +
1e999999999` is `1e999999999` within a little over the root).
- In decimal mode two exact operands whose sum cannot be aligned are
  decided without forming the sum (`decimalSumApart`): the smaller
  operand lies below half a unit in the larger's last digit, so in a
  nearest mode the result is the larger operand, and in a directed mode
  the larger operand or its neighbor at the digits by the smaller's sign
  (`1e999999999 + 1` at eight digits is `1e+999999999`, and under
  `ceiling` `1.0000001e+999999999`).
- The settle-first path is taken on `tooLarge` alone. A sum that aligns
  and whose value passes the exponent bound is held to the bound as a
  product is.

Products and quotients add and subtract exponents and return a `Result`
for the exponent bound; sums take the context, for its precision, its
mode and its significand limit.

### Comparison

`compare` on `Scaled` is total and cheap: by the signs, by the decimal
exponents (the significand's from its digit counts, settled by one
comparison, plus `exp`, exact), and, when those are equal, by exact
alignment, whose shift is then bounded by the significands' own digit
counts and never by the significand limit. `1e999999999` compares with
`1`, with `1.0000000001e999999999` and with a kernel result entered as a
decimal without forming anything.

`position` in `ball.ts` is the one comparison of a ball with a point, on
which the built-ins' domain checks, the logarithm's base against one, the
ends of `acosh` and `atanh`, the rounding functions' cells and a unit
list's counts are written. It is exact where the radius's power of two
can be formed (`FORMABLE_RADIUS_BITS`, `2^16`: every radius of the working
sizes, at a few tens of thousands of bits of canonical form per
comparison), and by the coarse bounds otherwise, with the conservative
answer, "across", where they cannot tell, which can only turn a verdict
into undecided and never into a wrong one. A ball touching a point counts
as straddling it. `orderOf` places two balls against each other for the
conditions of user-defined functions: two exact values exactly, an
inexact value against an exact one directly through `position` rather
than through a difference whose rounding could only widen it, and two
inexact values through their difference, a difference refused as too
large counting as across zero.

## The kernel's boundary

A kernel routine runs on `Fixed` values of order one after its argument
reduction, and the base changes at the kernel's door and exit:

- **In.** `fixedFromScaled(s, bits)` is `(num × 2^bits) / (den ×
10^-exp)`, or with `10^exp` in the numerator, a division, for a value
  whose power of ten can be formed within four times the hard bound on
  the significand limit, which holds any significand within the
  significand limit at a magnitude between `2^-significandLimitBits` and
  `2^significandLimitBits`, the most a built-in hands the kernel at any
  limit the settings allow (the hard bound alone was too small from a
  limit of about 350,000 bits up). A nonzero value below half an ulp at
  the bits asked is zero within one ulp, decided from the coarse bounds
  with nothing formed, which is what the division's rounding would give
  it; so the door takes an argument of any exponent, and the log-space
  power of a tiny exponent reaches the kernel as zero within an ulp. A
  value past four times the hard bound is a precondition failure, which
  every routine that takes the value itself bounds first
  ([builtins.md](builtins.md), "Huge and tiny arguments").
- **Out.** `fixedToBall(f, digits)` rounds `value × 2^-bits` to nearest
  at the working number of decimal digits, `digitsFor(bitsFor(precision))`
  (`workingDigits`), a multiplication by a memoized power of ten and a
  shift (`fixedToScaled`, which `fixedToBall` wraps), and adds the
  rounding, half a unit in the last digit, to the radius beside the
  kernel's own error count, only when the rounding
  moved the value, so that a kernel value of no error on the grid is
  exact. A dyadic `d × 2^-k` entered exactly would be `d × 5^k × 10^-k`,
  three times its size for no information, which is why a kernel result
  is rounded as it leaves: that rounding is the settle every inexact
  result gets in any case. A `Floating` leaves through `floatingToBall`
  in `digits.ts`: exactly, through `floatingToFixed`, for an exponent
  that can be formed within the significand limit, and otherwise in log
  space, the one place the program needs it: the decimal exponent is
  `floor(exp log10 2 + log10 significand)` and the leading digits
  `10^fraction`, through `lnFixed`, `expFixed` and the memoized `ln 2`
  and `ln 10` at the working bits plus the bit length of the exponent
  plus a margin, the computation's error carried in the kernel's error
  counts and added to the radius. The conversion costs about 47 ms at the
  default ceiling, the logarithm and the two memos computed for the call
  at the ceiling's bits plus the exponent's.

`expFixed` renormalizes after each squaring of its squaring loop: the
significand is kept to the working bits and the rest moved into the
exponent, so `exp(1e6)` costs what `exp(1)` costs plus a squaring per bit
of its magnitude, twenty for `exp(1e6)` and some sixty at the exponent
bound, and a negative argument is the same loop with the exponent going
negative rather than a value with a million fraction bits. `sinh` and
`cosh` inherit the range through the exponential: for an exponent beyond
half the working bits plus a margin the reciprocal `1/E` is below an ulp
of `E` and is folded into the error, so neither is formed; `tanh`
saturates without forming anything. A power in log space inherits the
range through `expFixed`; a large decibel is an exact power of ten, which
the exponent takes (`decibel(1e30)` is refused at the bound by the exact
power, before any exponential is reached).

### Memoized constants

`pi` (`constants.ts`, by Chudnovsky's series with binary splitting, its
tail bounded in the comment), `e` (its series by binary splitting),
`ln 2` and `ln 10` (`fixed-log.ts`, from `atanh(1/3)` and `atanh(1/9)` by
binary splitting) and `ln π` (`fixed-gamma.ts`) are each computed once,
at the ceiling of the retry schedule plus a margin of 256 bits
(`MEMO_MARGIN`), on first use however low the first request, and every
request at or below that, which is every request the retry loop can make,
is truncated from the memo. The cut (`truncateFixed`) converts the error
count to the new ulps rounded up and adds one for the bits dropped,
`ceil(error / 2^k) + 1`; rounding the count down would lose up to an ulp
(`3/4 ± 2/4` cut to whole units is `0 ± 2`, not `0 ± 1`, since the
interval reaches `5/4`). A request at a higher ceiling, after the
precision limit is raised, replaces the value; a lower one leaves it. So
the footprint is fixed by the ceiling (about 1.7 KB per constant at the
default ceiling of 4,040 digits), never by what the user has typed, and
needs no eviction policy; the largest it can be is set by the hard bound
on the precision limit. The core has no globals, but a memo of a pure
function of its precision is unobservable through the core's results, as
`lazy` in `parser.ts` is.

The margin serves the argument reduction of `sin` and `cos`, which needs
`pi` to the working bits plus the argument's bit length: at the ceiling
pass that exceeds the ceiling by the argument's bit length, so with the
margin every argument below `2^256` is served from the memo at every
pass, and it holds the guard bits the Gamma family and the logarithm
stack above a pass, so that `ln 2` and `ln π` are served from their memos
inside an `lgamma` at the ceiling pass. The one request above the memo
is the reduction of a larger argument (under the significand limit; an
argument beyond that is refused): it computes `pi` for the call and
keeps nothing, so `sin(1e5000 radian)` costs its milliseconds each time
it is typed, at most `pi` to the significand limit plus the ceiling,
about 25 ms at the defaults. Every memo of the core is filled on first
use, none at module load or at the table's build. The Bernoulli ratios
the Gamma family's series take are memoized the same way
([builtins.md](builtins.md), "The Gamma and Beta families"; the memo's
footprint is [#103][103]).

## Roots and powers

A root that is rational (`sqrt(9/4)`, `sqrt(2.25)`, `cbrt(-8)`) is
detected and returned exactly (`exactRoot`: the rational root if both
numerator and denominator are perfect powers, after the exponent is
divided by the degree and the remainder's power of ten, when it can be
formed within the limit, folded into the significand, so `sqrt(1e999999998)`
is exactly `1e499999999`), and `(4 m^2)^(1/2)` is exactly `2 m`.
Otherwise `rootBall` takes an exact power of ten off the exponent and
scales the significand by an exact power of `2^n` so that it is of order
one (the reduction belongs on the ball, since a tiny ball converted at
the working bits would lose its digits), converts that to the kernel at
the working bits plus a guard (plus as many more bits as the scaled
significand still lies below one, up to the working bits, so that it
keeps its digits), takes the root there (`sqrtFixed`, `rootFixed`),
scales back and hands back the kernel's value through `fixedToBall`: the
midpoint rounded to nearest onto the decimal grid of the working digits,
with the kernel's error and half a unit of the last digit as the radius,
which covers the argument's own radius, so an inexact argument gives an
inexact root with a bound, and `sqrt(1e999999999)` is
`≈ 3.1622777e+499999999` on the first pass. The scalings are exact
(`scaleByPowerOfTwo` cancels the power against the trailing zero bits
rather than running a gcd, and `shiftRadius` moves the exponent).

The kernel's roots: the square root by Newton on the reciprocal square
root, multiplications only with the precision doubling (V8 divides big
integers quadratically, and an integer square root by division cost
more than `pi`'s whole series at a hundred thousand digits, 869 ms
against 80), verified by squaring with the bound `D s / (2 s^2 - D)` (about `D / 2s`; the looser
`D / s` would double the argument's error at every one of the
logarithm's eight roots); the root of any degree up to `2^32`
(`ROOT_DEGREE_LIMIT`) by Newton in fixed point from a first guess taken
through a double, so that the cost is logarithmic in the degree and no
integer of `degree × bits` bits is ever formed, either one's error
verified by raising the result back to the power rather than read off
the iteration (`|y - a^(1/n)| <= (4 |ε| / n) y` for `y^n = a (1 + ε)` with
`|ε| <= 1/2`), the distance taken over the whole of the argument's
interval so that the argument's own error enters the same bound. The
square root's interval is exact, its ends the integer roots of the
argument's ends. A larger degree would overshoot from the double's first
guess, good to `2^-52`, so that `n × 2^-52` must stay well below one,
and fail the verification, which needs `n × 2^-bits` below one half.

Three cases go to one helper, `rootInLogSpace`, `x^(1/n)` as
`exp(ln x / n)`: a degree past the limit (`pow(3, 1e-30)`, whose root is
the `10^30`-th); a significand whose remainder's power of ten does not
fit the significand limit; and a significand scaled so far below one
that its exponent, less the degree's multiple, passes the working bits,
which converted to zero and reported a false `unresolved`
(`(7^-8000)^(1/99999)` is `0.8558…`). The helper maps `powLogSpace`'s
`unresolved` at zero, and only that, to `undefined`, so that `rootBall`
keeps its odd and even handling: a negative ball of odd degree is the
negated root of its magnitude; a ball containing zero is exact zero if
exact, and otherwise `unresolved` for an even degree, since whether there
is a real root at all depends on the sign, and for an odd degree a ball
around zero whose radius is the root of the farther end; an even root of
a negative ball is `negativeRadicand`, for a ball negative throughout
only, a ball straddling zero going on to the root. An argument of
unbounded radius gives the root of its midpoint with an unbounded
radius, its midpoint's sign deciding `negativeRadicand`. A root of degree
three or more of a wide positive ball still throws in the kernel's
verification ([#79][79]).

`powBall(b, n, context)` for a `bigint` `n`: on an exact base the exact
power, held to the significand limit by its prediction ("The significand
limit" below); on an inexact base exponentiation by squaring with
settling at every product, so `sqrt(2)^1000` is ten multiplications at
the working precision and only the magnitude of its result is guarded,
by the exponent bound through the classifier ("The exponent bound"
below): a base whose ball contains zero is tested against the top edge
alone, a negative power of such a base is `unresolved` at zero, and a
zero midpoint's power takes its radius from the radius's logarithm times
`n`, not by squaring. A negative `n` inverts by the division rule, so a
negative power of a ball around zero is `unresolved`.

`powRationalBall(b, p/q, context)`, which `^` and the built-in `pow`
share: `exactRoot` on the base comes first, so `8^(2/3)` is exact without
forming `64`, and `x^(p/q)` is exact when `x` is a perfect `q`-th power;
otherwise the root of the power, root last so that the one inexact step
comes last, when `x^p` fits the significand limit, which also serves a
negative base under an odd root; otherwise `exp(y ln x)` on the kernel
(`powLogSpace`, for a bounded base positive as rationals and any bounded
exponent, on `lnScaled`, which scales the base to order one before the
conversion, and `expFixed`, the logarithm taken at the working bits plus
the magnitudes of the exponent and of the logarithm so that the product
keeps the working bits), negating by symmetry for a negative base under
an odd root with an odd numerator. So `2^0.1234567` and `pow(10,
2.3456789)` are values with a radius, since `2^1234567` fits no
significand limit, and `10^23456789` is exact in the exponent but its
root leaves `10^3456789` to the kernel, which the limit does not hold:
log space gives up exactness only where none was reachable. A base
straddling zero whose power does not fit stays `tooLarge`, since its
interval's result does not fit either. `^` and `pow` still disagree on a
dimensionless base with an exact exponent, and `pow`'s size prediction
refuses powers the node check would admit ([#88][88], [#89][89]).

## The exponent bound

A value is within the bound when its decimal exponent, `floor(log10
|v|)`, the exponent the display writes, lies within `±MAX_EXPONENT`,
`10^18`; zero is within at any exponent. The bound is on the value, not on
the representation: the canonical `exp` may pass `±10^18` by up to the
significand's digits (the denominator's digits above the bound, the
numerator's below: `1e1000000000000000000 / 3 * 10`, whose value is
`3.3 × 10^(10^18)`, is a value though its canonical form is
`1/3 × 10^(10^18 + 1)`, and `1e-1000000000000000000 / 7`,
`1.4 × 10^-(10^18 + 1)`, is `underflow` though its canonical form is
`1/7 × 10^-(10^18)`), and nothing needs it to stay within, since the
128-bit `log2 10` of `log2Bounds` stays within `2^-68` there and every
`Number` taken of an exponent is guarded first. The bound is on the
value because it exists so that a value can always be written, and a
refusal at it must therefore never be false about the value; the
significand limit is on the representation for the opposite reason, that
it bounds what the device forms ("The significand limit" below). Holding
the canonical `exp` to the bound everywhere instead was weighed and set
aside: it refuses the first quotient above, whose value is within the
bound, with a message saying its exponent passes `10^18`, which is false
about the value; it makes whether a value is held depend on whether it
is exact, since an exact fraction and its settled form can lie on
different sides of such an edge; and it would have had to overrule
`powerRefusal`, which already reads the value, for no gain.
`powerOfTenRadius(k)`, a
radius at or above `10^k` from the same bounds with nothing formed,
which every site that needs only the radius of a power of ten reads (a
root's power taken off, `lnScaled`, `approx`'s unit, the settle's half
unit), takes `|k|` below `2^90`, where the bounds keep their margin of
`2^-31` (they hold it to about `2^97`). `scaled()` checks the
value's exponent only when `|exp|` lies within a band of the bound
(`BOUND_BAND`, four hundred million, more than the digits of any
`bigint`), with a fast path for an integer significand's digit count, so
the common case costs one comparison. Failing it is an `overflow` above
the bound or an `underflow` below it, errors of `Scaled`, and the check
runs wherever exponents combine, in `multiply`, `divide` and `pow`, so
that `10^1e30` and `exp(1e30)` fail cleanly before anything is computed
rather than loop or form an exponent that could not be formatted. The
parser leaves a literal to the constructor, so `0.001e1000000000000000003`
parses and `0e2000000000000000000` is zero.

A ball is held to the bound by every value in it, and a refusal needs
the whole ball past the edge: a result that passes the bound for some
values of a ball and not for others is `unresolved` at the edge `"bound"`
("the point where the result passes the exponent bound"), as a divisor
straddling zero is `unresolved` at zero, since the answer, a value or a
refusal, depends on which side the true value lies, and a refusal is
final and must never be wrong. The retry loop narrows the ball until
that is decided. So:

- A product or a quotient with an inexact operand is `overflow` or
  `underflow` only when its whole ball lies past the bound (`|mid| - rad`
  at or above `10^(10^18 + 1)`, or `|mid| + rad` below `10^-(10^18)` with
  the ball excluding zero), decided by the coarse bounds first and,
  within their slack, which no pass narrows, by the exact distance of
  `|mid|` from the power of ten, formed from the midpoint's digits
  (`held`, `againstPowerOfTen`); a ball containing zero whose midpoint
  passes below is zero within `|mid| + rad`; anything else, a result
  whose `|mid| + rad` reaches the top included, is `unresolved` at the
  bound. A ball of unbounded radius keeps its convention: its midpoint
  alone is held to the bound.
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
  `ln 10`, with a margin `m` covering the kernel's error and half a unit
  of the working digits (forty bits below the working bits): `overflow`
  when `L_lo >= U` is certified, `underflow` when `L_hi < D`, compute when
  `D + m <= L_lo` and `L_hi < U - m`, and `unresolved` at the bound
  otherwise. The coarse bounds decide first (`log2` of radii, and near
  one the exact difference from one), and only within their slack is the
  interval formed on the kernel, so an exact argument is left
  `unresolved` only when it lies within the ceiling's precision of an
  edge. Each site has its own `L`: `classifyExp` on `x`;
  `classifyHyperbolic` on `|x| - ln 2`, widened by the working ulp on
  each side, against the top edge alone (`sinh` and `cosh` are `overflow`
  for either sign); `classifyPower` on `y ln x` for `powLogSpace`,
  classified before `lnScaled` is asked for the bits that `y`'s size
  needs (when the bound on `|y ln x|` is below `2^-bits` the result is one
  within twice it, without the kernel, and when the bits it would need
  pass the significand limit the answer comes from the bound or is
  `tooLarge`), and on `n ln |b|` for `powBall`; `gamma` on its `lgamma`
  ball, `erfc` on `-x^2`, and the incomplete functions on their
  exponents ([builtins.md](builtins.md)). `floatingToBall` classifies
  its decimal exponent's interval too, and handles its own rounding's
  carry at the top. `pow` locates a bound `unresolved` at the argument
  whose radius contributes more to `y ln x` (`logPowerBlame`).

A retryable error kind of its own for a result straddling the bound was
weighed and set aside: it would cost as many sites, be a second word for
what `unresolved` already means, and need a second retry predicate kept
in step with the first.

Within the bound the exponential family has the range of an exponent:
`exp(1e6)` is `≈ 3.0332154e+434294` and `exp(1e18)` a value with the
exponent `434294481903251827`. The threshold for `exp` is an argument at
`(10^18 + 1) ln 10`, about `2.3026e18`, throughout its ball:
`exp(2.3e18)` is a value and `exp(2.31e18)` is refused, and `exp(-1e999)`
is too small, its exponent falling below `-10^18`. An argument whose
ball reaches across an edge, because its radius reaches across
(`exp(approx(1e999) - approx(1e999 - 5))` at its first pass, `5` within
about `2e948`), is retried until the ball is within the bound
(`≈ 148.41316`) or past it, or the retries run out, when the message
says the value cannot be told from the point where the result passes the
bound. A rule on the midpoint would be wrong: it would refuse
`exp(1e46 - approx(1/3) * 3e46 + 1.5e18)` for good, since its first pass
puts the midpoint past the edge though the argument is `1.5e18`.

The settle meets the bound at its two edges ("Settling" below), and so
does the display ("Certification and the display rule" below).

### Which limit a refusal names

Each limit refuses with an error of its own, defined where its check
lives, so that the message can say which limit the user can change:
the fraction's `tooLarge` (`rational.ts`) for the significand limit, and
`overflow` or `underflow` of `Scaled` (`scaled.ts`) for the exponent
bound, since only a value with an exponent can pass it. The messages are
`"1e999999999 + 1" would need a significand of about 3,321,928,093 bits
as an exact value, past the significand limit.`, `"exp(1e999)" is too
large to compute: its exponent would pass 10^18.` and `"exp(-1e999)" is
too small to compute: its exponent would fall below -10^18.`
`Refusal` is the three together, and `isRefusal` tells them from the
other errors; `BallError`, `BuiltinError`, `EvaluateError`,
`ConvertError` and the grammar's rejections forward the kind.

The side is the sign of the exponent that passes the bound in
`scaled()`, and in the guards the sign of `exp`'s argument, of `y ln x`
in `powLogSpace`, and of the midpoint's side of one in `powBall`, flipped
for a negative power. An exact power is told by its decimal exponent
rather than by the check that fails first (`powerRefusal`): `7^1e19`,
refused by the significand limit's prediction, is an `overflow`, past
the bound, which no setting moves, and `2.54^1e18`, whose canonical
exponent `-2 × 10^18` is past the bound below, is `10^(0.40 × 10^18)`,
within it, and is `tooLarge`, the significand limit's. The side is told
exactly, by comparing the base's magnitude with one, and the size by
bounds on the exponent's logarithm, taken for a base within `2^-30` of
one from its exact difference from one, so that `1.0000000001^1e30`,
about `10^(4.3 × 10^19)`, is too large; within a relative `2^-20` of the
bound, where the bounds cannot tell, a power refused by its exponent is
past the bound on the side its signs give, and one refused by its
significand is `tooLarge`. A product or a quotient past both limits is
reported at the bound, read off the operands' decimal exponents; a hair
from the bound, it is `tooLarge`. A literal past the bound is the
parser's to word by the exponent of its value, as the constructor
decides it.

### Why the exponent bound stays at `10^18`

The exponent is a `bigint`; `10^18` is a check on it, not a storage
limit, and it is kept by decision. A result beyond it is taken in log
space: `1e999 / ln(10)` is the decimal exponent of `exp(1e999)`, and a
quotient of exponentials is the exponential of a difference, `exp(1e999)
/ exp(1e999 - 5)` being `exp(1e999 - (1e999 - 5))`. `approx` has no part
in it: it never changes an exponent, so a result past the bound is
refused with it or without it ("`approx`" below).

- **Cost.** A scratch build that raised the bound to `10^1100` (with
  `MOST_MAGNITUDE` in `fixed-exp.ts` at 4,000 and `exp`'s guard on the
  midpoint's decimal exponent) computed the first pass of `exp` at 32
  digits in 20 ms for `exp(1e100)`, 127 ms for `exp(1e999)`, 1.0 s for
  `exp(1e3000)` and 13.3 s for `exp(1e9000)`. The kernel squares once per
  bit of the argument, each squaring at the working bits plus as many,
  so the cost grows at least as the square of the argument's length, and
  anything past about `exp(1e500)` would exceed the probe's default
  budget of 50 ms a pass, on every keystroke.
- **Soundness.** Parts of the number type are exact only within the
  bound: `log2Bounds` and `decimalExponentOfLog2` take the exponent
  through the 128-bit `log2 10`, which its comment sizes for an exponent
  at the bound (`2^-68`), and every radius taken from a midpoint, the
  product rule, certification and the display's bound rest on them; an
  exponent of 3,300 bits would put the error near `2^3200`. The
  classifier's edges are the bound's. The scratch build's digits were
  right by construction of the midpoint and not by its certificate.
- **A bound is needed anyway.** `exp(exp(1000))` has a 434-digit
  exponent, and `exp` of that has an exponent of `10^434` digits, which
  no `bigint` holds. Raising the bound moves the wall without removing
  it.
- **Little to show.** An answer beyond the bound is mostly its exponent:
  32 digits of `exp(1e999)` take 1,034 characters, where log space gives
  the part that can be read.

What raising it would take, should the question be reopened:
`MAX_EXPONENT` and a reason for its new value (one candidate is to tie it
to the significand limit, an exponent of as many bits as a significand
may have); the classifier's edges and `MOST_MAGNITUDE`; `log2 10`
computed to the exponent's bits plus a margin, from a memo; and a
display for an exponent of thousands of digits. The rule for a pass
whose argument is too wide for the result to have a digit, `unresolved`
at the bound, would stay. A setting for the bound was weighed and set
aside: it is a constant, generous and finite, and nothing a user
computes needs `10^(10^18)`.

`approx` would not help even if the bound were raised, because of what
the exponential does to a radius: `exp(x ± r)` is `exp(x)` times a factor
between `e^-r` and `e^r`, so the argument's absolute radius becomes the
result's relative error, and `exp` of a large argument needs that
argument to many more digits than the result shows. What the relative
precision of `approx(1e999)` bounds is the precision of the result's
logarithm, not of the result. At 32 digits, with a precision limit of
1,000 and a significand limit of 32,768 bits, the schedule measures:

| Pass | Working digits | Radius of `approx(1e999)` | `exp` of it, known within | Exponent digits known |
| ---: | -------------: | ------------------------: | ------------------------- | --------------------: |
|    1 |             52 |                  `1e+948` | a factor of `e^(10^948)`  |             51 of 999 |
|    2 |             94 |                  `1e+906` | a factor of `e^(10^906)`  |                    93 |
|    3 |            178 |                  `1e+822` | a factor of `e^(10^822)`  |                   177 |
|    4 |            346 |                  `1e+654` | a factor of `e^(10^654)`  |                   345 |
|    5 |            682 |                  `1e+318` | a factor of `e^(10^318)`  |                   681 |
|    6 |          1,354 |                  `1e-354` | a relative `1e-354`       |                   all |

The exact argument needs none of this: `expFixed` halves an argument
once per bit of its magnitude and works that many bits beyond the
working bits, so `exp(1e999)` would certify at the first pass (70 ms in
the scratch build, agreeing with Python's `decimal` at 1,200 digits),
where `exp(approx(1e999))` was `unresolved` at passes one to five and
certified at the sixth, 391 ms in all; without the rule on the radius,
the first pass spent 30 s in the kernel's squarings, the error's bit
length doubling with each once it passed the value's, and threw.

## Certification and the display rule

The display rounds once, in a rounding mode, shows only the digits the
radius certifies, and `=` is the radius's to decide. `show(ball, {
digits, rounding, ratio })` in `display.ts` formats the midpoint at the
digits asked for in the rounding mode, with the carry across a power of
ten (`9.99` at two digits is `10`) in every mode that rounds the
magnitude up.

A ball certifies `d` digits in a rounding mode when `mid - rad` and
`mid + rad`, as exact values, round to the same `d`-digit value in that
mode. Rounding is monotone, so every value between them rounds to it too,
and the digits shown are what rounding the true value would give:
correctly rounded, not merely close. The ball is symmetric about its
midpoint but the rounding cells are not aligned with it, which is why
the rule looks at the two ends rather than at the radius: a radius below
half a unit in the `d`-th digit is necessary but not sufficient, since a
ball of radius `10^-30` around `1.2345` fails at four digits under half
away from zero, the true value lying on either side of the tie. A
one-sided radius was not taken up: the symmetric ball is right for exact
mode, whose roundings are the kernel's, to nearest. The price of the
stronger rule is a retry when the true value lies near a boundary
(the next pass narrows the ball past it), and a value exactly on a
boundary reached through an irrational step, which no pass resolves,
ends at the ceiling with one digit fewer than asked. The one definition
covers the nearest and the directed modes, ties, and the carry across a
power of ten. Certification is not monotone in the digit count (`[1.246,
1.254]` certifies three digits, both ends rounding to `1.25`, and not
two, `1.25` being a two-digit tie), so `certifiedDigits` (`ball.ts`,
over `certifies`) scans down from the digits asked and takes the first
count that certifies.

The ends are formed exactly where the radius can be formed and aligned
with the midpoint, which is every radius of the working sizes. Where it
cannot (`1e999999999 ± 1.5`, a radius of `2^-70000`), the ends round
alike exactly when no rounding boundary of the digits asked lies within
the radius of the midpoint, so the distance from the midpoint to the
nearest boundary is measured against the radius: in the units of the
last digit asked the boundaries are the whole units under a directed
mode and the half units under a nearest one, with the boundary just
below the midpoint's power of ten taken too, where the cells are a tenth
as wide; the distance is exact, an arithmetic within the midpoint's own
digits, and is compared with the radius by its coarse bounds, a distance
the bounds cannot tell from the radius certifying nothing. (A first
version widened the midpoint taken to two digits beyond those asked by
a unit or two, which refused a count whenever the two digits beyond lay
within two of a boundary, as `sqrt(2) × 1e999999999` at fifty digits
does; the distance has no such margin.)

`show` returns a kind with the text:

- `exact`: radius zero and every digit held shown, the one kind shown
  with `=`; with the ratio notation, an exact value written entire as a
  whole number or a ratio ([notation.md](notation.md)).
- `certified`: every digit asked for is certain; this includes an exact
  value with more digits than shown, `1/3` at eight, which is `≈` with
  no note.
- `partial`: fewer are, and the text is those; with none certified,
  which only a value on a rounding tie at the digits asked produces at
  the ceiling, the text is the midpoint at the digits asked.
- `zero`: a ball containing zero without being it, which certifies no
  digit, shown as `0` whatever the sign of the midpoint, which is noise
  within the bound, with a bound at or above `|mid| + rad` rounded up
  to one significant digit, twice (the radius to thirty bits, the bound
  to a digit), so a round radius shows the next digit up. A bound whose
  decimal exponent lies below `-10^18`, which a power of a ball around
  zero can carry since nothing holds a radius to the bottom edge
  (`(approx(1e20) - approx(1e20))^1e100000` carries a bound whose
  exponent has 100,004 digits), is written as `1e-1000000000000000000`
  (`zeroBound`): larger than any such bound, so the line stays sound,
  the smallest positive value within the exponent bound, so nothing
  shorter could be written, and it parses back. At the top edge a ball
  around zero whose upper end reaches `10^(10^18 + 1)` is `unresolved`
  before it reaches the display, and a bound the ceiling rounding
  carries past the edge (`1e+1000000000000000001`) is written so: it is
  larger, so the line stays sound, and it is a note, not a literal. The
  bound is never typed back as the result, so rounding it up at either
  edge costs nothing but the truth that the value is even closer to zero
  than the line says, which the line does not claim to know.
- `unbounded`: a radius not known, the midpoint's digits certifying
  none. No operation of the app produces one today; the kind is the
  per-operation fallback a built-in without a propagation rule would
  show.
- `uncertified`: decimal mode's flagged value ("Decimal mode" below).

The kinds are tested in that order: uncertified, unbounded, exact, zero,
then the digit count. Exactness is a property of the value, not of the
display: a
value that passes through a root and comes out looking rational
(`sqrt(2) / sqrt(2)`, whose midpoint is exactly `1`) is `≈ 1`, while
`sqrt(4)` is `= 2` because the exact case was detected and nothing was
rounded. The default rounding mode is `halfEven`, IEEE 754's default and
`printf`'s, unbiased over many roundings where ties away from zero
drift. In exact mode the mode is applied here and nowhere else; in
decimal mode every step rounds in it. What the outcome writes around the
text, the notes, the relation and the lines, is
[architecture.md](architecture.md) ("The converter and its lines").

## Working precision and the schedule

Every core function that does arithmetic (`evaluate`, `buildTable`,
`powQuantity`, the built-ins) takes a `NumberContext` (`context.ts`): a
precision in significant digits, a rounding mode, the exact or decimal
mode (`mode`, optional and absent meaning exact, so that every context
written before the mode existed is an exact one; `modeOf` reads it), the
significand limit, the ceiling, and in decimal mode an optional count of
working digits. Below the pipeline `precision` is a
working precision, not the digits shown. The pipeline (`evaluateText`,
`convertText`) is the one place that knows the difference: the context it
takes is the user's, whose precision is the digits asked for, and it
derives the working contexts it evaluates at. There is one context type
for both levels: a second type for the user's settings would be the same
fields with one renamed, and the distinction is one of level, stated in
the pipeline's header, not of shape. The ceiling and the significand
limit are the same at both levels, the one bounding what any pass may
form and the other how far the passes may rise. The ceiling is in the
context, rather than a parameter beside it or a lookup closing over it,
so that it reaches a built-in: the memos are sized by it, and `pi()`
reads it from the context it is called with. `checkContext` holds
`precision <= ceiling`, and in decimal mode `working >= precision` and
`4 (working + GUARD_DIGITS) <= ceiling`.

`workingContexts` yields the digits asked for plus a guard of ten
(`GUARD_DIGITS`), then twice that, doubling, and last the context's
ceiling: `ceilingFor(precisionLimitDigits)` is four times the precision
limit plus the guard, 4,040 digits for the default limit of 1,000, nine
passes at eight digits and three at a thousand. `schedule` in
`pipeline.ts` is what `resolve` runs: `workingContexts` in exact mode,
and the context alone in decimal mode ("Decimal mode" below). The
schedule is geometric, so the passes together cost at most about twice
the pass that succeeds, whatever it is. Cancellation costs digits, `k`
of them when two
values agree to `k` digits before they are subtracted, and each doubling
pays for as many again. The ten is the guard of the first pass: a short
expression loses a few digits to the rounding of each step and a little
more to an ordinary cancellation, and ten covers that, so that the
common case certifies on its first pass; it is separate from the
kernel's `GUARD_BITS`, which is one routine's headroom for its own error
count. The ceiling is the top of the schedule, and it has to be one
number for every display digits, since the unit table and the memos are
built once at it. It is set from the largest request the limit allows:
at display digits equal to the limit, the first pass is the limit plus
ten, and four times that gives that request two doublings above its
first pass, two chances to pay for a cancellation, where a smaller
request has correspondingly more. Four is the least factor that gives
the largest request more than one such chance without doubling what the
table and the memos cost for every setting. The guard of ten and the
factor of four are judgments, not measurements; they moved once, from a
fixed ceiling of a thousand digits with the digits limited to two
hundred, when the precision limit became a setting. A routine that needs
more headroom than the working precision takes it inside the kernel
(the guard bits, the extra terms of a series, `pi` to the working bits
plus the argument's bit length for a reduction) and never moves the
ceiling, since headroom is a property of one routine at one argument and
the ceiling a property of the whole schedule.

`resolve` in `pipeline.ts` runs the evaluation at each working context in
turn (parsing once outside the passes) and stops at the first result
whose every value (the unit value, each list term unrounded, a function
want's count) is exact, certified at the digits asked for, or of
unbounded radius; a result that certifies fewer digits is kept as the
best so far and the next pass tried, since cancellation that cost `k`
digits is paid for by `k` more working digits; a result that assumes an
undecided condition is kept the same way, never final
([functions.md](functions.md), "Conditions"). An `unresolved` at any
depth of a call or an inverse, the converter's `unresolvedWant` and a
ratio `unresolved` at the bound, and an `undecidedCondition` are retried
the same way; any other error ends the loop, with the best result so far
if a pass produced one (the only such error a later pass can newly raise
is a `tooLarge` marking the pass unaffordable), and otherwise with the
error; a later pass that fails outright beats an earlier result that
assumed a condition, since more digits may have decided the condition
against the argument. At the ceiling the best result so far, or the last
error, is returned, and the display shows what is certified. Expressions
that never certify, `sqrt(2)^2 - 2` and `sin(pi() radian)`, run to the
ceiling however it is set, which is what bounds their latency; the
precision limit is therefore a cost setting, and
[cost.md](cost.md) catalogues what such expressions cost. A `want` that
fails to parse is reported after a `have` that fails to evaluate, tried
once at the first pass, so that the pipeline's rule that `have` is tried
first holds. Two gaps are accepted. A list unit whose ball straddles
zero is the list's `nonpositiveUnit`, and the loop ends on it rather
than retrying, though a later pass might narrow the unit: the check is
on the whole ball, not the midpoint, because a unit that cannot be told
from zero is no size to count by, and refusing it is what keeps a
remainder's division from ever being `unresolved`. And the outcome's
reciprocal line is one step at the user's context, outside the loop
([architecture.md](architecture.md), "The converter and its lines").
`resolve` takes
an optional `PassObserver`, called as each pass starts and ends, which
the stress harness times passes through and which changes nothing it
observes.

The unit table is built once, at the ceiling context (`ceilingContext`),
by `system-build.ts`, and rebuilt only when the precision limit changes
the ceiling, never when the display digits change: the angle units call
`pi()`, so their quantities carry a radius fixed when the table is built,
and since the passes re-evaluate the expression and not the table, a
unit's precision must lie above every pass or a pass that would
otherwise certify `p` digits is held back by the unit. One ceiling
serves every display digits under one precision limit, so one table
serves them all; the lookup hands each unit out as built, and the
evaluator's unit node settles it to the pass's precision, so that no
pass carries more of it than it computes at, and `turn` into `deg`
certifies every one of its digits of `360` and shows `≈` only because
the radius is not zero. Rebuilding at each pass's precision would cost
milliseconds per pass and a table per pass for no gain, and a table per
setting would hold one per setting the session had seen. The table is
built in exact mode whatever the user's mode, and a unit is settled in
the user's mode at the node that names it.

In decimal mode the schedule is the user's context alone: one pass at
the digits asked for, since a higher internal precision would compute
something other than what the mode asks for; the retry happens inside
each step instead ("Decimal mode" below).

## Settling

Every result the evaluator produces, and every unit the lookup hands
out, is settled to the working context: an inexact midpoint is rounded
to nearest, ties to even, at the working digits,
`digitsFor(bitsFor(precision))`, the
grid the kernel's results leave on, with half a unit in the last digit
added to the radius; an exact value is never touched. So an inexact
midpoint never grows beyond the working precision however long the
expression, while exact values stay the exact numbers they are. (The
first design let inexact midpoints grow as exact rationals, and a
thirteen-thousand-bit dyadic to the fifth power was then a size the
significand limit refused.) `powBall` on an inexact base squares with
settling for the same reason. An inexact value is a number computed, not
a number known, and keeping its midpoint as the exact result of exact
operations on kernel outputs would spend exactness on a value that has
none. This is Arb's discipline: whole-expression precision is untouched,
since the errors settling adds are at the working precision, far below
the digits asked, and the retry loop raises that precision until the
digits certify.

Settling rounds to nearest, not in the user's rounding mode: it bounds
the size of a number the user never sees, and in exact mode the mode is
applied once, by the display, to the certified value of the whole
expression, which certification guarantees is the true value's rounding
in that mode; a mode applied inside would change nothing that is
certified and would be a double rounding besides. Settling never refuses
a value in exact mode: a rounding to nearest that would carry a midpoint
past the top of the exponent bound rounds toward zero instead and adds a
whole unit in the last working digit to the radius, and the half unit an
ordinary rounding adds is a radius taken from the exponent
(`powerOfTenRadius`) rather than a value formed and checked, so that a
midpoint at the bottom edge, whose half unit lies past the bound,
settles (`1e-999999999999999999 / approx(3)` is
`≈ 3.3333333e-1000000000000000000`). A zero midpoint is left alone. The
same rounding puts an exact operand of more bits than the grid on it
when a sum, a product or a quotient with an inexact operand is refused
for its size ("The significand limit" below).

`step` in `ball.ts` is the one entrance through which a computed value
becomes a value of the expression, in either mode: it runs a computation
at the working contexts until its rounding is certified, and rounds it
once; every node of the evaluator goes through it (`stepQuantity` in
`quantity.ts`), plain arithmetic included, and so do the pipeline's own
quotients (the conversion's ratio, a list's terms, a function want's
count) and the outcome's reciprocal. In exact mode it is one computation
and a settle; in decimal mode it is the mode's one rounding of each step,
below. Its primitive, `settle`, is not exported: an earlier shape, a
settle any inexact ball could reach beside a retry only two call sites
used, was a contract that lived in documentation.

## Exact mode

Exact mode is the default. Its one promise is that an exact value, radius
zero, is an exact rational however it was formed, and every exact
operation on exact operands keeps it so: a literal of any length up to
the significand limit, a unit, `0.1 + 0.2` (exactly `0.3`),
`1e999999999 * 1e999999999` (exactly `1e1999999998`), `1 ft` in `in`
(`= 12 in`), an exact case of a built-in (`sqrt(9/4)`, `log(2, 8)`,
`exp(0)`), and a comparison. Exactly three things ever produce a nonzero
radius: an inexact function (a root, a kernel routine, `pi()`), the
built-in `approx`, which makes a value inexact at the user's request, and
decimal mode's rounding. The design has declined, each time on the same
ground, to add a rounding the user did not ask for: a sum that cannot be
aligned is refused rather than rounded ("Sums and alignment" above), a
mode that rounds every literal was set aside for `approx` ("`approx`"
below), and an exact result past the significand limit is refused rather
than rounded at the node ("The significand limit" below). A value the
user wrote exactly is not silently replaced by one that is not it.

The display digits are how many digits of the answer must be certain
before it is shown, and the app raises the grid of the inexact values,
pass by pass, until the two ends of the ball round to the same digits;
the rounding mode is applied once, by the display. That is
whole-expression precision, in the manner of Arb, and whole-expression
rounding its counterpart. What it cannot do: prove a value exactly zero,
or exactly rational, when an irrational step produced it (`sin(pi()
radian)` is a ball around zero whose relative accuracy never improves,
since `pi()` is rounded before `sin` sees it, and `sqrt(2)^2` is `2 ± ε`
at every precision; the ceiling ends the escalation and the display
shows `≈ 0` with a bound, or `≈ 2`), guarantee `p` digits at every
precision the user might set, since the retry has a ceiling in time, or
divide by a value that cannot be told from zero. Exactness for such
identities needs symbolic values ([future.md](future.md)), and no
numeric system, Arb included, does otherwise. The conservative `≈` for
`turn` into `deg`, exactly `360` but computed through a rounded `pi()`,
is the one visible cost of `pi()` being a function rather than a
literal, and it is accepted: a conservative `≈` is honest, a false `=`
is not.

The alternative is per-operation precision, the guarantee MPFR gives:
every inexact operation returns its value correctly rounded to a working
precision the user sets, and nothing is said about the expression around
it, so `exp(x) - 1` at a small `x` loses its digits to cancellation and
the display does not know. It was set aside because the digits shown
would then be no promise, and the user would have to choose a working
precision beside them. What the ball model costs over it is a radius
beside every midpoint, a propagation rule per built-in and the retry
loop, and no new structure; and the per-operation model is a state of
the ball model rather than a rival to it, the radius reduced to one bit,
which is what an unbounded radius is ("Certification and the display
rule" above): a built-in without a propagation rule would still work,
under per-operation semantics, and gain whole-expression semantics the
day its rule is written.

## Decimal mode

Decimal mode is a calculator's arithmetic: every operation is one
correctly rounded step, every value is exact, and no radius is carried.
At `p` digits in the rounding mode `R`:

1. **Every value is exact**, radius zero: an integer of at most `p`
   significant digits times a power of ten, which is the `Scaled` form
   with a denominator of one. The display always writes `=`.
2. **Every operation is correctly rounded.** The result of an operation
   on exact operands is the exact mathematical result rounded once to `p`
   digits in `R` (to the working digits for every step but the last,
   below). An operation is a node of the expression tree: each `+`, `-`,
   `*`, `/`, juxtaposition, `^`, each literal, each unit looked up, and
   each function call as a whole.
3. **A function call is one operation.** `gamma(1/2)` is spelled as one
   step and is one, as far as a user can observe: its value at the exact
   argument is computed to whatever precision certifying the `p`-digit
   rounding takes, and the rounding is the result, exact. Decomposing the
   function into its series and rounding each term was set aside: it
   loses precision in aggregate, is not what any calculator does, and
   throws away the one thing the ball model is good for, certifying a
   rounding. The line between the two is observability: every partial
   expression visible in the user's expression tree is a step; an
   accumulator inside a built-in surfaces to no one, and there the radius
   is kept and used to certify the rounded result. A user-defined
   function's body is visible and is steps.
4. **Rounding is the only source of difference from the real number**,
   and it is the user's, chosen by choosing the mode. The app does not
   report how far the roundings have carried the value, because in this
   mode the rounded value is the value: `1 / 3 * 3` at eight digits is
   `= 0.99999999`, and `1 / (1 / 3 * 3 - 1)` is `= -100000000`, as every
   calculator has it, where exact mode has `= 1` and a division by zero.

An earlier version of the mode rounded every step and also tracked, in
the radius, how far the roundings had carried the value, so that `1 / 3

- 3`showed`≈ 1` with "7 of 8 digits are certain". That was withdrawn:
  the radius answered a question the mode does not ask, a directed
  rounding could never certify its last digit (the symmetric ball reaches
  across the boundary the result sits on), and the mode as built added no
  behavior that exact mode did not already give. The ball model stays
  where it is needed, inside a built-in, whose result must be certified at
  extra digits before it is rounded.

What each kind of operation does:

- **A literal** with more than `p` significant digits is rounded to `p`
  in `R` as it is read, and is exact after that: `2.5400001 cm` at three
  digits is `2.54 cm`, and in `in` it is `= 1 in`. A `p`-digit calculator
  holds `p` digits, and exempting literals would carry the extra digits
  into the first operation and round them there, one step later, for no
  gain.
- **Arithmetic** forms the exact result of two `p`-digit decimals, which
  always exists and is small, and rounds it once. Division by an exact
  zero is an error, and nothing else is: no value straddles anything.
  Two decimals whose exponents differ by more than the significand limit
  holds take the neighbor rule ("Sums and alignment" above).
- **A power** `x^n` for an integer `n` is one operation, the exact power
  rounded once (`2^100` at eight digits is `1.2676506e+30`); where the
  exact power does not fit the significand limit it is computed on the
  base widened to the working precision and certified, the limit being a
  cost limit and a correctly rounded power costing little. A rational
  exponent is a root, an inexact function, and `^`'s exact cases stay.
- **A unit** is built exactly at the ceiling, as every unit is, and the
  lookup hands it out as built; the evaluator's unit node rounds it to
  `p` digits in `R` once, exactly: `surveyfoot` at eight digits is
  `0.30480061 m`, and `1 ft` is `0.3048 m`, which has fewer digits and
  is itself. A unit that holds an inexact value, the angle units with
  `pi`, is certified at `p` as a call is. A prefixed unit is the product
  of the prefix's factor and the unit, rounded once, not each factor and
  then the product.
- **A built-in's call** is certified: the evaluator runs the built-in in
  exact mode at the working contexts of the retry schedule, from `p`
  plus the guard up to the ceiling, until the ball it returns certifies
  the digits asked for in `R`, both ends rounding alike, and takes that
  rounding, exact. This is what IEEE 754-2008 recommends for the decimal
  transcendental functions and what few calculators achieve. A built-in
  therefore never sees a decimal-mode context; `approx` alone declares
  itself the identity there (`decimal: "identity"` in `builtin.ts`),
  since every decimal-mode value is already at the user's precision. A
  built-in's exact cases return exact values, which are then rounded to
  `p` digits if they have more. The kernel stays binary in decimal mode
  and the mode rounds what it returns; a decimal kernel, rounding in `R`
  inside each routine, would double the numeric surface for every
  function, and was ruled out.
- **The ceiling.** Certification can fail all the way up when the true
  value lies exactly on a rounding boundary of `p` digits, a tie in a
  nearest mode or a `p`-digit value in a directed one, since no precision
  separates the ball's two ends. A transcendental value is never a finite
  decimal, so for `exp`, `ln`, the trigonometric and hyperbolic
  functions, `gamma`, `erf` and their kin the case cannot arise; the
  only values that can sit on a boundary are the algebraic ones, roots
  and powers with rational exponents, whose exact cases are detected
  before the kernel runs (`sqrt(6.25)`, `6.25^0.5` and `pow(6.25, 0.5)`
  are each exactly `2.5`). So the ceiling is a computation limit that
  lets the mode always answer: at it, the result is the midpoint's
  rounding in `R`, which is what a calculator prints, and the value is
  flagged `uncertified`. The flag is an optional field of `Ball`, never
  set to anything but `true` so that balls compare structurally, carried
  from operand to result by every operation (`carrying`) and by the
  evaluator from a built-in's arguments to its result, sticky as IEEE
  754's inexact flag. The display writes such a value with the `≈` sign
  bearing a dot above it (U+2248 U+0307 as text; the component draws the
  dot itself over an `≈` named "approximately, uncertified" for assistive
  technology; `≆` was rejected because it asserts an inequality the app
  cannot attest, the uncertified digits possibly being exactly right)
  and the note "a step could not be certified at the precision limit".
  The value is exact under the mode's rounding, and its last digit is
  nonetheless one the computation could not vouch for; every operation
  after it rounds a value that may already be a unit off, and the error
  can compound. No built-in of the app is known to reach the fallback;
  the tests exercise it with an injected built-in whose value sits on a
  tie. Whether an uncertified rounding should instead be decided as a
  tie and shown as exact, which would remove the flag, is [#173][173].
- **A result that is zero** is an exact case where the argument makes
  the function zero exactly (`sin(0 radian)`, `ln(1)`, `atan(0)`); an
  inexact argument is rounded first and misses zero, so `sin(pi()
radian)` at eight digits is `sin(3.1415927 radian)`, `= -4.6410207e-8`,
  a calculator's answer. A ball that contains zero without the exact
  case firing certifies no digit and takes the ceiling's fallback, with
  a midpoint within the radius of zero taken as zero.
- **Domains and edges.** With exact arguments every domain check is
  decided, and no argument straddles an edge, so `unresolved` does not
  arise at a call's argument. A result whose exponent would pass the
  exponent bound is `overflow` or `underflow`, decided by the classifier
  on an exact argument; a classifier interval that straddles the bound's
  edge is narrowed by the retry inside the step, and an `unresolved` at
  the bound that survives the step is final, as every `unresolved` is in
  decimal mode. A rounded midpoint whose decimal exponent passes the
  bound is refused, `overflow` at the top (`99999999999e999999999999999990`
  at eight digits rounds to `1e+1000000000000000001`) and `underflow` at
  the bottom (`1e-1000000000000000000 / 3`), since there the rounded
  value is the result.
- **`approx(x)`** is `x`, the identity.
- **A user-defined function** is its body, ordinary arithmetic evaluated
  by the same evaluator, and each step of the body rounds, as a
  programmable calculator rounds each step of a program: calling it and
  typing its body inline round at the same subexpressions and give the
  same value. Treating a function as one operation like a built-in was
  set aside: a mode that rounded a body once would make `tempF(37)` and
  its inlined body differ, the opposite surprise. Its conditions compare
  exact values and are always decided.
- **The pipeline's own quotients**, the conversion's ratio, a unit
  list's counts and remainder, a function's count and the outcome's
  reciprocal, are each one operation and rounded once, exact.
- **Comparisons** compare exact values. **Dimensions** carry exact
  rational powers whatever the mode: `m^(1/3)` is a third power of
  length, never `m^0.33333333`, since decimal mode rounds magnitudes and
  a dimension is not a magnitude.

In decimal mode every value is exact and has at most `p` digits, so the
display's `exact` kind applies to every line: `=`, every digit, no note;
`≈`, "n of m digits are certain", "within … of zero" and "no digit
certain" never appear for a rounding the mode certified. The ratio
notation has no place in decimal mode and the outcome never asks for it
there ([notation.md](notation.md)). The precision limit has one meaning
in both modes, the finest grid the app rounds onto: in decimal mode it
bounds the display digits and the working digits, and a step's
certification runs on grids up to the same ceiling.

Two rulings are provisional, so that backtracking from them is a decision
and not a rediscovery. The denominator is fixed at one: a decimal-mode
value is always representable in the decimal system directly, without
fighting the rational's reduction, and the cost is at the bottom of the
exponent range, where a value whose `p` digits would need an exponent
below the bound has nowhere to put them and is refused; letting the
denominator flex by powers of ten would give such a value a
representation with reduced precision, as IEEE 754's subnormals do, and
`Scaled` can hold it, the invariant being on the value and not on the
stored fraction. And the midpoint's rounding at the ceiling is the
answer for an uncertified call, rather than a refusal, which would
refuse a value every calculator answers over what is a missing exact
case. Keeping the ceiling's ball on the uncertified value instead, and
letting the display rule mark what it does not certify, was set aside
too: the radius would then propagate through the rest of the
expression, which is the mismatch the mode's definition removes. The
significand limit is nearly idle in decimal mode: with the
denominator fixed it binds only the exact intermediate before a rounding
and the alignment of a sum.

### The working digits

With the display digits `p` and working digits `w >= p`, a setting of
decimal mode ([settings.md](settings.md)):

- Every step but the last is rounded to `w` digits in the rounding mode,
  exact after it: each literal, each unit, each operator, each built-in's
  call as a whole, certified at `w`.
- The last step of a displayed value is rounded to `p` digits directly
  from the exact result of its operation, not from a `w`-digit
  intermediate: the root of the `have` expression, the conversion's
  ratio, a list's counts and remainder, a function want's recovered
  count and the reciprocal are each the last step of what they show.
  Rounding the exact result once avoids the double rounding a
  calculator's display has (a `w`-digit value that lands on a `p`-digit
  tie by its own rounding, rounded again), so the answer is the correctly
  rounded value of the last operation on `w`-digit operands.
- The answer is exact and written with `=`. `ln(exp(1/10))` at eight
  digits over twelve is `= 0.1` where it is `= 0.099999984` without the
  extra digits (the first rounding's error amplified by `ln`), and
  `1 / 3 * 3` is `= 1` where it is `= 0.99999999`. Under a directed mode
  the answer is the neighbor of a value that sits on the grid, as that
  mode asks (`0.099999999` toward zero, `0.10000001` away), since the
  working digits change what is rounded, never how.
- With `w = p` nothing changes, which is the default.

`operandContext` in `context.ts` is the context a step's operands are
computed at: in decimal mode with working digits above the precision,
the context at the working digits, otherwise the context itself;
idempotent, so an operand's operands are at the same context. The
evaluator uses it for every node's operands, a built-in's arguments, and
a function's conditions, whose terms are no part of a displayed value; a
user-defined function's body is the call's step, so its root is at the
call's context. The pipeline evaluates the `have` and `want` texts at it
and steps the ratio, a list's terms and a function's count at the user's
context, and `evaluateText`, whose value is the one shown, keeps its root
at the user's context. A context derived at another precision
(`workingContexts`, `ceilingContext`) drops the field. The ceiling
applies as it does without the setting: a built-in's rounding at `w` is
certified on grids from `w` plus the guard up to the ceiling, so `w` may
not exceed the precision limit. Exact mode has no such setting: its
working precision is the retry schedule's, and a floor on it would be a
floor on the schedule's first pass, a different knob with a different
purpose. The retry schedule's contexts are "working contexts" throughout
the core, and the step callbacks name their parameter `working`, beside
a field `working` that is this setting's digits; settling that
vocabulary is [#172][172].

Every calculator sold rounds each step to more digits than it shows, a
ten-digit display over twelve or thirteen internal digits, so that the
error of a step lands below the last digit shown; the setting is that,
and it is what a user of decimal mode expects from the name. Its default
is the display digits, so that a user who has not touched the setting
sees the mode as defined, the extended count is one checkbox away, and
a default above the display digits would make the first line of decimal
mode depend on a number the panel does not show until the box is
checked.

## The significand limit

Exact arithmetic cannot overflow, but it can grow without bound:
`3^1000000` and `1e999999999 + 1` are valid input. Two limits on two axes
bound it, in two units, because they bound two kinds of value, as a
float's exponent width and significand width are different quantities
that one number cannot stand for: the significand limit is in bits, the
size of an exact rational's numerator and denominator, which is what an
exact value costs to hold and to multiply; the precision limit and its
ceiling are in decimal digits, the count an inexact midpoint is settled
to, which is decimal because the exponent is (a midpoint of `w` digits
is an integer of `w` digits times a power of ten, the type's smallest
form, and the form the display writes), and which the kernel converts to
bits plus a guard for its own work. Both are the user's to set
([settings.md](settings.md)), since both are cost limits whose right
value depends on the device. The two meet once: a settled midpoint at
the ceiling is itself a significand, an integer over one, and must fit
the significand limit with room for a product of two, which is
`2 × bitsFor(4 × (L + 10)) ≤ S` for a precision limit `L` and a
significand limit `S`; `precisionLimitFor(S)` is the largest `L` that
satisfies it, 2,453 digits at the default `S` of 65,536 bits (a ceiling
of 9,852 digits, 32,760 bits, twice that just under 65,536), and the
only slack in it is the guard's 32 bits, which the derivation counts.
The hard bound on the limit is `MAX_SIGNIFICAND_LIMIT_BITS`, `2^20` in
`rational.ts` (about 315,000 digits), which the parser, having no
context, applies to a literal's significand; its floor is
`MIN_SIGNIFICAND_LIMIT_BITS`, twice the kernel's bits at a precision
limit of one digit, 358, below which no digit fits; its default is
`2^16`, about 19,700 decimal digits, at which every exact operation still
takes milliseconds, the reduction of a quotient of two significands at
the limit included.

What the limit means is cost: a hard limit on the bits the app forms,
holds and multiplies for one number, in time and in memory, which is why
its right value is the device's and the probe recommends it. So its
measure is the size of what is stored, the canonical significand of a
`Scaled`, and not the bits of the value it denotes. The two differ for a
dyadic, whose twos in the denominator the canonical form trades for fives
in the numerator: `2^-30000`, a value of 30,000 bits, is stored as
`5^30000 × 10^-30000`, 69,658 bits, and that is what a product of it
costs. The rough edge is narrower than it looks. What makes an exact
value expensive is the bits of the two integers that store it, not how
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
beside the decimal one would have spared `2^-30000` and done nothing for
`3^-100000`: the cost is in storing exact rationals as digits, not in
the power of ten. So `1 / 2^n` is refused past `n ≈ 28,225` at the
default, as `0.5^30000` is, since each is stored with `5^n`.

Every node is held, sums included, because nothing bounds an
expression's length: each operation grows its operands by a bounded
factor, but a product of powers each within the limit reaches a million
bits in a few factors, a sum of three fractions a denominator of 155,588
bits, and a conversion between two such products costs half a minute if
it is formed.

The limit is strict: no exact value is formed past it, and nothing is
measured after the fact. Every operation that forms an exact value
predicts its size from the operands first and refuses with the bits it
would need, `tooLarge` with a `Need`:

- A product and a quotient predict after their two cross-cancelling
  gcds, which run on operands within the limit: the bound is the larger
  of the two parts' bit sums, the truth or a bit over it, so `x / x` is
  one and `(a/b) × (b/a)` is one, and `3^32767 × 7^21845` is refused with
  113,262 bits, nothing formed (`multiplyWithin`, `divideWithin`).
- A sum is refused on the bound of its unreduced sum, Henrici's form
  with the common factor taken out first (`addWithin`), the price of
  never forming it: `1/3^32767 + 1/7^21845` is refused.
- A power predicts `floor(|n| log2 p) + 1` on its larger part, the truth
  or a bit over it: `2^65535` is a value at the default and `2^65536` is
  not. A quotient and a power whose fraction fits size its canonical
  form too, before it is made, since a denominator's twos become fives
  in the numerator (`scaledWithin`): `2^-30000` is refused with 69,659
  bits and `2^-28000` stays a value. A product and a sum of canonical
  significands need no such check, their denominators being coprime to
  ten.
- A sum's alignment and a literal's digits predict as above, and the
  built-ins that compute at an argument's bits (the trigonometric
  reduction, `beta`, the incomplete functions, `factorial`) refuse on
  their own counts.
- `evaluate()` asserts on every node's result, and the pipeline on the
  two quotients it forms outside the evaluator, the conversion's ratio
  and a function want's count: an exact result past the limit there is a
  bug in a prediction, thrown, never a refusal. The exponent bound is
  checked first, so that a result past both is reported at the bound.
- `multiplyBalls`, `divideBalls`, `convert`, the table's lookup and the
  built-ins that multiply or divide take the context, since a prediction
  needs the limit.

What is formed is at most the gcds' operands, which is what the probe
times when it recommends the limit. Measuring after forming, which the
limit did at first, was deliberate while it lasted (a prediction from
unreduced sizes refuses `x / x`, and for a quotient is no bound at all),
and the strict limit keeps its answers by predicting after the gcds.

Every `tooLarge` carries the bits needed (`Need`: exact where a value
exists, such as a literal's digits or a reduction's working bits; a
bound where predicted; unknown where the function cannot say) and the
refusing function's word on the same step computed inexactly (`Reach`:
`fits`, where only the exact result exceeds the limit, as for a sum's
alignment, an exact power's prediction or a product measured; `exceeds`,
where the computation needs more bits than the limit holds whatever its
operands, as for a literal's digits, an exponent that cannot be formed,
or a kernel's reach). The field is required, so no refusal site can be
silent about it, and it is stated where the refusal is made and carried
through unchanged; nothing above the refusing function infers the reach
from the expression's shape, so a function that learns to reach further
changes its own refusal and its own test. The message names the node,
the bits ("of 113,262 bits", "of about 69,659 bits"; nothing where
unknown), and on `fits` suggests, as things to try, `approx` around the
node's first operand (a binary's left, a power's base, a call's first
argument), which the evaluator names, so that the part is computed to the
digits asked and shown with `≈`, or decimal mode; on `exceeds` it says
the value passes the limit however it is computed and suggests nothing,
a higher limit being the user's to judge from the bits. `approx` around
the node itself would come too late, the node being refused before
`approx` sees it; an inexact operand is what makes the result inexact.
The suggestion is the operation's expectation, not a promise.

Exact mode refuses at the node and never rounds an exact result on its
own to stay within the limit. The alternative, rounding the result there
to the working digits as `approx` at that node would, with the retry loop
then certifying the digits asked, was set aside: it would be a fourth
source of inexactness and the only one the user cannot see in the
expression; the limit is the device's, so under rounding the same
expression would be `= 0` on one machine and `≈ 0` within a bound on
another, with nothing in the expression to say why; the remedy is one
token and the user's choice, since a user checking an exact identity
wants a higher limit and a user converting a measurement wants `approx`;
refusing ends the work at the node where rounding would carry on; and
the calculator's behavior exists already, in decimal mode and in
`approx`. Should the ruling ever be reversed, rounding would be: the
node's exact result past the limit settled to the working digits with
half a unit in the last digit into the radius, the quantity marked as
rounded with the node's span, which the pipeline carries to the display
as a note beside the value, and nothing downstream changed; a literal
past the limit, the kernel's reach and the exponent bound would still
refuse.

An inexact result, and every result in decimal mode, is settled to the
working digits and never refused for size; the built-ins' internal
intermediates, a unit list's decomposition, `powBall`'s settled loop and
the display's reciprocal work on node results already held to the
limit, within a constant factor of them, and are not checked.

A product or a quotient with one inexact operand is inexact in any case,
so it is never refused for its exact operand's size: when the prediction
refuses the exact step, each operand is put on the working grid first
(`onGrid` in `ball.ts`: an exact operand of more bits than the grid is
rounded to the working digits with the rounding charged to the radius,
as a sum that cannot align rounds it, and an operand already on the grid
stays exact and costs nothing), and the product or quotient is taken
again. Two grid significands always fit, by the relation
`precisionLimitFor` keeps between the two limits, so the retry cannot be
refused, and a `tooLarge` there is a bug, thrown. The exact operand is
rounded only because the result was inexact already; two exact operands
are refused at the node as above.

`approx` bears on the significand limit alone: in a sum, whose smaller
operand it lets the radius absorb (`approx(1e999999999) + 1` is
`≈ 1e+999999999`); in an integer power, whose inexact base is settled at
every squaring (`approx(3)^1000000000` is `≈ 5.243997e+477121254` where
`3^1000000000` is refused); and in any product, quotient or sum whose
exact result would pass the limit, which an inexact operand makes
inexact and settled (`approx(3^32767) * 7^21845` is a value where
`3^32767 * 7^21845` is `tooLarge`).

## `approx`

`approx(x)` is a built-in of one argument, of any dimension, kinds
included, whose result has the argument's dimension: the value of `x`
known to the working precision and no better, the one way in exact mode
to make an exact value inexact on purpose. The result is the ball whose
midpoint is `x`'s and whose radius is the larger of `x`'s own and one
unit in the last of the working digits at the value's magnitude, rounded
up (`widened` in `ball.ts`); the evaluator then settles it as it settles
every inexact result. An
exact `x` gains that unit; an inexact `x` whose radius is already larger,
the result of a root or a transcendental function, keeps it; one whose
radius is smaller is widened to the unit; `approx` is idempotent. A zero
midpoint, exact or not, is returned as it is, since a unit of the last
digit of zero would be a unit of nothing; an unbounded `x` is returned as
it is.

`approx` never narrows. The precision is decided at the approximation
point: the call says "known to this precision, and no better", and a
radius the argument already carries is a fact about the value that the
call cannot undo. Widening a radius is always honest, and narrowing one
would claim knowledge the computation does not have; so there is no way
to cast a value to exact or to raise its precision through `approx`, and
if a reason for the second ever appeared (none is known; the retry loop
is how precision is raised) it would belong to a built-in of its own,
named for what it does. `approx` can turn a value into a refusal and
never the reverse. Its errors are none of its own, the dimension rule
accepting any dimension.

What follows: whole-expression precision is kept, since the radius is
the working precision's and each pass makes it smaller (`approx(2.54) cm`
in `in` is `≈ 1` with every digit asked for certified on the first pass,
and `≈` rather than `=`, which is the point); identities through
approximate values are `≈ 0` with a bound, the ball model's honest
reading; in decimal mode `approx(x)` is `x`; and a definitions-file body
may call it, so a measured constant can be defined as `G
approx(6.674e-11) N m^2 / kg^2`, built at the ceiling and settled to
each pass's precision as the angle units are. Whether the system file
marks any of its constants so is a decision for the file: today its
constants are exact by definition (the speed of light, the elementary
charge, the Planck, Boltzmann and Avogadro constants, since the 2019
redefinition of the SI) apart from the dalton, a CODATA value written as
an exact decimal, which is the one candidate.

A function rather than syntax: a call needs no grammar, it has a
dimension rule, an arity and the same evaluation path as every built-in,
its wording in messages comes for free, it applies to any subexpression
and not only a literal, and the unary and the future binary form share
one name. A third mode, rounding every literal to the working precision
with whole-expression rounding kept, was set aside as the wrong
granularity: `1 ft` and `6.674e-11` can stand in one expression, and a
mode would make `1 ft` in `in` read `≈ 12 in`. The spellings weighed and
left open: a postfix `~` on a literal (`2.54~`), terse and the likely
spelling of `approx(x)` later, but it needs grammar, applies to literals
alone, and has no binary form; a prefix `~`, which takes the symbol an
inverse-call notation would want; a `+/-` operator for the binary form
(`+-` is not available, since `2.54 +- 0.01` already parses as a
subtraction); and the CODATA form `6.67430(15)e-11`, where a number
followed by `(` is today a product and the canonical form keeps no digit
count to read the parenthesized digits against.

The binary form, `approx(x, u)`, a value known to within an absolute
uncertainty, is [#100][100]. The tentative design: the result is the
ball whose radius is the larger of `x`'s own and the largest magnitude
in `u`'s ball (the larger, never `u` alone, since `x` may carry a radius
the call cannot undo; the sum of the two is the other sound choice, and
the two differ only where the radii are of one size); `u` is absolute,
what measurements report, and conforms to `x`, kinds included, by the
check a sum applies; the retry loop must learn to stop, since a radius
that comes from an input does not shrink with the working precision, by
ending at a pass whose result's radius is not below half the previous
pass's (every precision-bound contribution at least halves when the
working bits double, so a radius that does not halve is dominated by
something else, at a cost of at most one digit); and a measurement
written to its last digit's half-unit has its interval's ends on the
rounding ties, so certification gives what the rounding mode makes of
the ties. Significant-figure propagation then needs no new machinery
([#98][98]), and the system file could define measured constants with
their uncertainties. The semantics of `approx` as a whole are under
study in [#171][171].

## Failures

A value that cannot be computed is a `Result` error, never an exception:
division by zero (including `0` to a negative power), an even root of a
negative number, a result beyond the significand limit or the exponent
bound, a value that cannot be told from an edge, or text that is not a
number. Every failure in the core is a discriminated union of a value or
an error, with each module defining its own error type. A violated
precondition (a zero denominator passed to the `rational` constructor, a
precision that is not a positive integer, a root degree below one, a
value past four times the hard bound at the kernel's door) is a bug in
the caller, not a value that can fail, and throws `RangeError`, as
`1n / 0n` does. Every value that can be zero or negative because the
user typed it reaches the numerics through the ball's `divideBalls`,
`powBall` and `rootBall`, which report it; the kernel's preconditions (a
positive interval under a root) are checked by the ball before it calls
in.

## Formatting

`format(s, digits, mode)` in `scaled.ts` renders a `Scaled` as a decimal
string in the style of C's `%g`: rounded to `digits` significant digits
in the mode, trailing zeros dropped, and exponent notation when the
decimal exponent is below -4 or at least `digits`, with the exponent
written as JavaScript writes it (`1.5e+21`, `1e-7`, `1e+999999999`).
Nothing goes through a `number` on the way, and the power of ten is never
formed, so a value of any magnitude renders exactly. `roundTo` builds the
canonical form from the rounded integer directly, the digit count of an
integer taken from its bit length and a comparison (`decimalDigits`) and
the powers of ten memoized (`powerOfTen`), so that a settle at the
default ceiling costs about 0.4 ms (the 0.2 ms under "The types" is the
division alone, measured when the base was chosen), a product of two
settled balls 0.1 ms and the kernel's exit 0.2 ms.

[78]: https://github.com/bsidhom/exucal/issues/78
[79]: https://github.com/bsidhom/exucal/issues/79
[88]: https://github.com/bsidhom/exucal/issues/88
[89]: https://github.com/bsidhom/exucal/issues/89
[98]: https://github.com/bsidhom/exucal/issues/98
[100]: https://github.com/bsidhom/exucal/issues/100
[103]: https://github.com/bsidhom/exucal/issues/103
[171]: https://github.com/bsidhom/exucal/issues/171
[172]: https://github.com/bsidhom/exucal/issues/172
[173]: https://github.com/bsidhom/exucal/issues/173
