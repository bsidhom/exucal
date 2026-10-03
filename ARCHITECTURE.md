# Architecture

A unit converter inspired by GNU units. The user types a quantity to convert
(**have**) and a unit to convert it to (**want**); the app answers with the
converted value, or with an error saying why the two do not conform.

GNU units is the source of the conceptual patterns: a definitions file that
defines every unit in terms of others down to a few primitives, an expression
language that serves both the definitions and the input, and the have/want
interaction. It is not a specification. Where this design borrows a rule from
GNU units it says so, and where it diverges in grammar (a number may only
start a product; a name is never split into a unit and an exponent) or in
behavior (exact rational arithmetic; kinds that keep angles apart from plain
numbers) it does so deliberately, and the GNU units behavior is not a fallback.

Two rules shape everything below:

- **The core is pure.** Every function in `src/core/` maps immutable inputs to
  immutable outputs, with no I/O, no globals and no exceptions across module
  boundaries: failures are returned as `Result` values. The UI is a thin layer
  that calls into it.
- **No third-party runtime dependencies** beyond Lit. Arithmetic is built on
  `bigint`.

## Pipeline

```
definitions text ──parseDefinitions──▶ Definition[] ──buildTable──▶ UnitTable
                                                                        │
have text ──parseExpr──▶ Expr ──evaluate──▶ Quantity ─┐                 │
                                                      ├─▶ convert ──▶ Result<Conversion>
want text ──parseUnitList──▶ Expr[] ──evaluate──▶ Quantity[] ─┘   (or convertToList)
                                                              └──▶ format ──▶ string
```

Each arrow is one pure function in its own module. Parsing never touches the
table, and conversion never formats. The pipeline (`src/core/pipeline.ts`)
runs the evaluation and the conversion at each working context of a retry
schedule until every value is certified at the digits asked for; "Working
precision and the context" below describes the schedule. Evaluation checks conformance in the
operands of a sum and the argument of a call, and with the same check that
conversion applies to the pair. The `want` is read as a unit list, of which
one expression is a list of one: one unit goes through `convert`, several
(or the name of a list the table defines) through `convertToList`, which
"Unit lists" below describes, and the name of a function the table defines
through `invertFunction`, which "Functions" below describes.

## Numbers: `Scaled` over `Rational`

The number type is an exact fraction times a power of ten: a `Rational`
over `bigint`, a numerator and a positive denominator kept in lowest terms,
as the mantissa, and a `bigint` decimal exponent, in a canonical form (the
denominator coprime to ten, the numerator not divisible by ten), so that
`1e999999999` is a mantissa of one and an exponent, and `2.54` is
`254 × 10^-2`. Exact fractions rather than arbitrary-precision floats
because almost every unit definition is a rational (`2.54 cm`,
`0.45359237 kg`), so conversions are exact and rounding happens only once,
at display time, in the exact mode that is the default; the exponent
beside them because a value's magnitude should cost nothing
(docs/decimal.md). The decimal mode, the other of the two modes of the
plan's D15, rounds every result to the digits asked for in the rounding
mode instead, as a hand calculator or a decimal library does, and the
two differ in nothing else ("Precision and rounding" below). Decimal literals parse exactly
(`1.5e-3` is `15 × 10^-4`). The definitions file holds no irrational
literal: the circle constant is the built-in `pi()`, computed to the
precision of the table it is built in and of the pass an expression is
evaluated at, where GNU units defines `pi` as a decimal literal.

`src/core/rational.ts` provides the fraction's arithmetic and comparison,
integer powers and the exact case of the n-th root, total and unbounded.
`src/core/scaled.ts` (stage 4 of the plan) holds `Scaled` over it: the
arithmetic, which aligns a sum's mantissas within a stated limit on the
shift and bounds a value's decimal exponent by `10^18` (`MAX_EXPONENT`),
comparison, the
parsing of a literal, whose exponent it keeps as the number it is, rounding
to significant digits in a rounding mode, formatting, and the binary
magnitude (`log2Bounds`) from which a radius is taken without forming the
power of ten. `src/core/rounding.ts` names the seven rounding modes and is
the one place a mode is interpreted: `divideRounded`, an integer division
rounded in a mode, which every rounding in the core scales its value down
to; `Precision`, a count of significant digits, lives there too.

### Precision and rounding

Every magnitude is a **ball**: a midpoint, the number computed, and a
radius, a coarse bound on how far the midpoint may lie from the value it
stands for. An exact value has radius zero, and `=` in the display means
exactly that. This is the precision model of docs/calculator.md ("The
precision model"), being built stage by stage along docs/calculator-plan.md;
what is in place is its first four stages, the ball as the value, the
kernel with the root and the elementary functions on it, the retry loop
with certification, and the `Scaled` midpoint with the decimal mode.
Three rules say where, and only where, a value can lose precision:

1. **Exact operations never round an exact midpoint.** Addition,
   subtraction, multiplication, division, integer powers and comparisons
   are exact on the midpoints, and an exact result is as long as it needs
   to be; nothing in exact mode rounds an exact intermediate to keep it
   small (the decimal mode rounds every result, which is what the mode
   is; "Settling" below). A product or a quotient combines the exponents,
   and fails only at the exponent bound, `overflow` or `underflow` when
   every value of its ball is past it, and `unresolved` at the edge
   `bound`, which the retry loop narrows, when some are (the plan's D18);
   an exact result past the range limit is refused by the evaluator at
   the node that forms it (D19, "Size limits" below), and the callers of
   the operations take any refusal. A sum aligns the mantissas by
   the difference of the exponents, which the range limit bounds
   (docs/decimal.md, "Sums, comparisons and the radius"): two exact
   operands that cannot be aligned within it have an exact sum that cannot
   be held and fail `tooLarge` in exact mode (`1e999999999 + 1`), while a
   sum with an inexact operand, which is about to be settled, or any sum
   in decimal mode, settles its operands
   first and, when they still do not align, absorbs the smaller into the
   radius (`sqrt(2) + 1e999999999` is `1e999999999` within `1.5`); a sum
   that aligns and whose value passes the bound is held to the bound as a
   product is, `overflow` or `underflow` when every value of its ball is
   past it and `unresolved` at the edge `bound` when some are (issue #48
   absorbed it as an alignment failure). What
   the operations do to the radii is the elementary propagation (a sum's
   radii add, a product's radius is `|a| rb + |b| ra + ra rb`, a quotient's
   `(|a| rb + |b| ra) / (|b| (|b| - rb))`, a power's the derivative
   bound), the magnitudes taken as coarse radii from the binary bounds so
   that nothing is formed whatever the exponent, every step rounding up,
   so that a result's interval contains the exact result over the
   operands' intervals, and an exact value stays exact through them. A
   divisor whose ball contains zero without being exactly zero cannot be
   divided by, since the true quotient may have either sign: that is
   `unresolved`, an error kind of its own beside `divisionByZero` (the
   plan's D4), because the retry loop of the pipeline retries on the first
   and never on the second. `1 / (sqrt(2)^2 - 2)` reports it where it once
   showed a huge number. Comparing a midpoint with a radius, which the
   built-ins' edge checks do through `position`, is exact where the
   radius's power of two can be formed, every radius of the working
   sizes, and by the coarse bounds otherwise, with the conservative answer
   where they cannot tell.

2. **The inexact operations, the root and the built-in functions, run on
   the kernel and say what they lost.** A root that is rational
   (`sqrt(9/4)`, `sqrt(2.25)`, `cbrt(-8)`) is detected and returned
   exactly, so `(4 m^2)^(1/2)` is exactly `2 m`. Otherwise `rootBall`
   takes an exact power of ten off the exponent and scales the mantissa
   by an exact power of `2^n` so that it is of order one, converts that
   to the kernel's fixed point at the bits of the working precision plus
   a guard (plus as many more bits as the scaled mantissa still lies
   below one, so that it keeps its digits), takes the root there
   (`sqrtFixed`, `rootFixed`), scales back,
   and hands back the kernel's value through `fixedToBall`; a root the
   kernel cannot take, of a degree past `2^32`, of a mantissa too far
   below one for the working bits, or with a remainder of the exponent
   the range limit does not hold, is taken in log space instead,
   `x^(1/n)` as `exp(ln x / n)`, so `pow(3, 1e-30)` and
   `(7^-8000)^(1/99999)` are values (the plan's H.5): the midpoint
   rounded to nearest onto the decimal grid of the working digits
   (`workingDigits`, the digits of those bits), with the kernel's error
   and half a unit of the last digit as the radius, which covers the
   argument's own radius: an inexact argument gives an inexact root with
   a bound, not an unbounded one, and `sqrt(1e999999999)` is
   `≈ 3.1622777e+499999999` on the first pass. Nothing
   rounds in a rounding mode on the way (the plan's D15): the mode is the
   display's. A ball containing zero without being exactly zero is
   `unresolved` under an even root, since whether there is a real root at
   all depends on the sign, and under an odd root a ball around zero
   bounded by the root of the farther end; an even root of a negative
   ball fails as it always did. `x^(p/q)` is the `q`-th root of `x^p`,
   root last, so the one inexact step comes last, or `exp(y ln x)` on the
   kernel when `x^p` is refused, past the range limit or the exponent
   bound. Every built-in
   function does the same (docs/builtins.md): an exact case is returned
   exactly (`exp(0)`, `log(2, 8)`, `cos(0 radian)`), and otherwise the
   argument is converted at the working bits (a small argument of an odd
   function at as many more as its magnitude is below one, so that it
   keeps its digits), the routine runs its reduction and its series with
   the argument's error carried through, and the kernel's ball comes back
   rounded onto the working digits with the error as its radius. The two
   ends of the exponent are answered before the kernel is entered, since
   it holds a value only up to the range limit: an argument throughout
   below `2^-maxBits` is answered by its expansion at zero (`sin`, `tan`,
   `atan`, `asinh` and the rest of the odd functions give the argument
   within its cube, `cos` and `cosh` one within its square, and `exp` one
   within twice the argument's magnitude; any other argument goes in
   through `fixedFromScaled`, whose power of ten is formed within four
   times the hard bound, enough for whatever a built-in hands it at any
   range limit the settings allow, and a value below half an ulp of the
   bits asked is zero within an ulp there, decided from the coarse bounds
   with nothing formed, which is how the log-space power of a tiny
   exponent reaches the kernel), `sin`, `cos`
   and `tan` of one reaching `2^maxBits` are `tooLarge`, since the
   reduction would need `pi` to that many bits, `atan` beyond `2^bits` is
   `±pi/2` within `2^-bits`, `atan2` of a `y` of definite sign is `±pi/2`
   within `2^-bits` when `|y|` is at least `|x| 2^bits` throughout and
   `±pi` within it when `x` is negative and `|y| / |x|` lies below
   `2^-bits`, the ratio not formed, a tiny ratio over a positive `x`
   is its own arctangent within its cube, neither is refused for an
   argument's radius (a ball reaching `2^maxBits` without lying beyond
   `2^bits` throughout is the function's whole range, zero within two
   for `atan` and within four for `atan2`, which certifies nothing and
   lets the retry loop narrow it), and `asinh` and `acosh` beyond it are
   `ln(2|x|)`; the logarithms take any exponent, `ln(m × 10^e)` being
   `ln m + e ln 10` from the memo, so `ln(1e999999999)` is a value and
   `log10(1e999999999)` exactly `999999999`. An argument outside the
   function's domain throughout its ball is a `domain` error, and one
   that straddles an edge of the domain (`ln` at zero, `asin` at one,
   `tan` at a pole) is `unresolved` at that edge, which the retry loop
   retries; a result whose decimal exponent would pass the exponent bound
   for every value of the argument's ball (`exp(1e30)`) is refused before
   it is computed, an `overflow`, or an `underflow` for one that would
   fall below it (`exp(-1e30)`), and one that passes it for some values
   and not for others is `unresolved` at the edge `bound`, retried, the
   classifier of ball.ts holding an interval bounding the result's
   logarithm to the edges for `exp`, `sinh`, `cosh` and the powers alike
   (the plan's D18 and H.15), while
   `exp(1e6)`,
   `cosh(1e6)` and `2^(1e6/3)` are values: the exponential returns a
   `Floating`, a mantissa of the working bits with a binary exponent,
   renormalized after each squaring so that the argument's size costs a
   squaring per bit of its magnitude, twenty for `exp(1e6)` and some
   sixty at the bound, and not a value of a million bits, and it leaves the
   kernel through digits.ts, exactly where the exponent is within the
   range limit and in log space, `10^(t - floor(t))` for `t` the decimal
   logarithm found on the kernel, where it is not.

3. **Display rounds once, in a rounding mode, shows only the digits the
   radius certifies, and `=` is the radius's to decide.** `show(ball,
digits, mode)` in `src/core/display.ts` formats the midpoint at the
   digits the user asked for in one of the seven rounding modes of
   `rounding.ts` (half even, half away from zero, half toward zero, toward
   zero, away from zero, ceiling, floor; `divideRounded` is the one place a
   mode is interpreted, and every rounding in the core scales to an integer
   division and calls it), with the carry across a power of ten (`9.99` at
   two digits is `10`) in every mode that rounds the magnitude up. A digit
   is shown only when it is certified (the plan's D7): the two ends of the
   ball, `mid - rad` and `mid + rad`, round to the same value at that many
   digits, so that, rounding being monotone, the digits shown are what
   rounding the true value would give, correctly rounded and not merely
   close. The ends are formed exactly where the radius can be formed and
   aligned with the midpoint, which is every radius of the working sizes;
   where it cannot (`1e999999999 ± 1.5`, a radius of `2^-70000`), the
   distance from the midpoint to the nearest rounding boundary of those
   digits, exact within the midpoint's own digits, is measured against
   the radius by its coarse bounds, erring only toward certifying less.
   `certifies` and `certifiedDigits` in `ball.ts`
   decide it; certification is not monotone in the digit count (`[1.246,
1.254]` certifies three digits and not two), so the count is found from
   the top down. `show` returns a kind with the text: `exact` (radius zero
   and every digit held shown, the one kind shown with `=`), `certified`
   (every digit asked for is certain), `partial` (fewer are, and the text
   is those), `zero` (a ball containing zero without being it, shown as
   `0` with a bound on how far from zero the value may lie), and
   `unbounded` (a radius not known, the midpoint's digits certifying none).
   With the fractions setting (`show`'s fourth argument; docs/fractions.md,
   the plan's D21), an exact value that is not an integer is `exact` with
   its fraction in lowest terms as the text, `fraction: true` saying so,
   when the numerator and the denominator each fit within the digits
   asked (`127/50` for `2.54`, `5000/127`), and `src/outcome.ts`
   parenthesizes it where a unit follows, since the grammar reads
   `5000/127 in` as `5000 / (127 in)`; an integer, a fraction that does
   not fit, and every inexact value are shown as above, the decimal
   display being the fallback. In decimal mode the pipeline settles the
   quotients it forms outside the evaluator (the ratio, a list's terms, a
   function's count), as every step is settled there, now that the
   display no longer rounds every exact value; the outcome settles the
   reciprocal the same way.
   Exactness is a property of the value, not of the display: a value that
   passes through a root and comes out looking rational (`sqrt(2) /
sqrt(2)`, whose midpoint is exactly `1`) is `≈ 1`, while `sqrt(4)` is
   `= 2` because the exact case was detected and nothing was rounded. The mode is applied here and nowhere else in exact mode (the plan's D15):
   the digits shown are the true value's rounding in it, and no intermediate
   step rounds in a mode; in decimal mode every step rounds in it, through
   the settle, and the display certifies the digits of the exact expression
   as before, so a value the roundings have moved off its cell certifies
   fewer than asked and the note says so. The default mode is half away from
   zero, the rounding people expect from `0.125 → 0.13` (the `halfExpand`
   of `Intl.NumberFormat`; C's `%g` differs only on exact ties, which are
   rare with doubles but ordinary with rationals). The retry loop below
   narrows a `partial` or a `zero` where a pass can, and the component
   shows each kind with its note ("UI" below).

**The types**, each layer adding one concept (the plan's D13 has the
argument): `Rational` (`rational.ts`) is the exact fraction in lowest terms
with total arithmetic, used for the mantissas, the exponents of dimensions
and of `^`, and the exact value of a radius. `Scaled` (`scaled.ts`) is the
fraction times a power of ten, the midpoint's type, in a module of its
own between the fraction and the ball so that `rational.ts` stays the
total fraction it is (the plan's D13). `Radius` (`radius.ts`) is the
coarse bound, `mant × 2^exp` with a 30-bit mantissa and a bigint exponent,
or the distinguished value unbounded, with the operations a propagation
rule needs (`radiusAbove` of a fraction and `radiusAboveScaled` of a
midpoint from its binary bounds, the sum, the product, the quotient
against a lower bound, the power, the maximum, and the exact fraction a
bounded radius stands for), every one rounding the right way so that a
radius is always a true bound; the plan's D3 says why it is binary,
coarse, and neither a `Rational` nor a `number`. `Ball` (`ball.ts`) is a
midpoint beside a radius, and its operations compose the arithmetic of
the midpoint's type with the propagation rules of the radius's; scaled.ts
knows nothing of radii, radius.ts reads a midpoint only for its binary
bounds (`radiusAboveScaled`, through `log2Bounds`), and nothing stores a
radius inside a number.
Beside these, `Fixed` (`fixed.ts`) is the kernel's own representation, on
which the inexact functions run: an integer standing for `value × 2^-bits`
with an error count in ulps, every operation updating the count by a
stated over-approximation (the plan's D9), entered from a `Scaled` or a
ball whose power of ten can be formed (`fixedFromScaled`; the callers
bound their arguments first) and left through `fixedToBall`, which rounds
the value onto the decimal grid of the working digits and hands back the
count and the rounding as a radius. `Floating` (`fixed.ts` too) is a
`Fixed` mantissa with a binary exponent, `mant × 2^exp`, the form of the
results that can be large, the exponential's and the hyperbolic pair's;
`digits.ts`, above the kernel since it calls it, takes one out as a ball,
exactly where the exponent is within the range limit and in log space
otherwise, the one place the program needs log space. Its first routines are the roots: the square
root by Newton on the reciprocal square root, multiplications only with
the precision doubling, and the root of any degree up to `2^32` by
Newton in fixed point, either one's error verified by raising the result
back to the power rather than read off the iteration; a larger degree
would overshoot from the double's first guess and fail the verification,
and the ball takes it in log space. The elementary functions
are the routines beside it, one module per family: `fixed-exp.ts`
(the exponential, by halving, a Taylor series and squaring, and the
hyperbolic sine and cosine through it, or through the sine's series in
`x^2` for a small argument) and
`fixed-log.ts` (the logarithm, by square roots and the `atanh` series
summed by rectangular splitting, with `ln(2)` and `ln(10)` memoized) and
`fixed-trig.ts` (the sine and the cosine together, by a reduction modulo
`pi/2` against the memoized `pi` and the two Taylor series summed by the
same splitting, the tangent being their quotient; and the arctangent, by
inversion above one, eight half-angle steps and the logarithm's series in
`-z^2`, through which `asin`, `acos` and `atan2` go); a
rational power that is neither exact nor small enough for the root of the
power goes through them as `exp(y ln x)` (`powRationalBall`, which `^`
and the built-in `pow` share), so that `2^0.1234567` is a value with a
radius where it was too large. `constants.ts` computes `pi`
on it by Chudnovsky's series with binary splitting, its tail bounded in
the comment, and memoizes one value, the digits at the ceiling of the
retry schedule in force plus a margin of 256 bits, from which every request
at or below that is truncated (the plan's D10); the built-in `pi()`
(`builtins/pi.ts`) hands it back as a ball at the context's precision, and
the angle units of units.txt call it, so their quantities carry its radius
and a conversion between them is `≈`. `bernoulli.ts` computes the
Bernoulli numbers the Gamma family's asymptotic series takes
(`fixed-gamma.ts`), exact rationals from the tangent numbers, and
`bernoulli-ratios.ts` memoizes the ratios of consecutive ones in fixed
point, by count and by the bits they serve, each ratio at the bits the
term it makes still needs, since only the count and the bits depend on
the pass: about twenty ratios at forty digits, three hundred and sixty
at a thousand, and at the default ceiling 730 for an argument typed as
a short decimal or fraction, which the kernel shifts exactly and four
times as far, or 1,423 for an inexact one, which it shifts by a loop to
a third of the bits. Every memo of the core is filled on first use,
none at module load or at the table's build: a page that never
evaluates the Gamma family never computes a Bernoulli number, and the
run at the ceiling, half a second once for the exact shift and about
two for the loop's, is paid by the first evaluation of the family whose
retry loop reaches the ceiling (each pass that needs more ratios than
the last computes one exact run, for the count its series predicts and
reserves before it sums, and forms the ratios from it; #117), after
which a `gamma` or `lgamma` call there is about 0.12 s and a `digamma`
call 0.14 s for an exact argument, and 0.45 s and 1.2 s for an inexact
one, the loop's shift being most of those (measured in #117's session;
before the ratios the series alone was 0.37 s of each); at forty digits
the series is microseconds and at a thousand a call is tens of
milliseconds (docs/special.md, "6.2" and "6.3"). The memo's size is
bounded by the bits it serves: at the default ceiling it holds 730 to
1,430 ratios, the first at the ceiling's bits plus the margin and the
last at about two hundred, about 0.8 to 1 MB in all, with the exact
run, up to about 1.8 MB, and the tangent numbers, up to about 2.2 MB,
held while the run is computed and released after; at a thousand
digits it is about 80 KB and at forty under a kilobyte. A larger run
replaces a smaller one, so the memo never holds more than one (the
representation issue #103 asked for).

**Working precision and the context.** Every core function that does
arithmetic (`evaluate`, `buildTable`, `powQuantity`) takes a `NumberContext` (`src/core/context.ts`: a precision in
significant digits, a rounding mode, the exact or decimal mode, and the
range limit `maxBits`) and computes at its precision; below the pipeline that precision is a working precision, not
the digits shown. The pipeline (`evaluateText`, `convertText`) is the one
place that knows the difference (the plan's D1): the context it takes is
the user's, whose precision is the digits asked for, and it derives the
working contexts it evaluates at by the retry schedule of the plan's D12.
`schedule` yields the digits asked for plus a guard of ten, then twice
that, doubling, and last the context's `ceiling`, a field of its own: the
shell derives it from the cap on the digits setting, `ceilingFor` in
context.ts, four times the cap plus the guard, so that the largest request
has two doublings of room above its first pass (4,040 digits for the
default cap of 1,000; nine passes at eight digits, three at a thousand),
and it is the same in every working context, as the range limit is. The
guard of ten digits is the first pass's headroom for the rounding of each
step and an ordinary cancellation, so that the common case certifies at
once; it is separate from the kernel's `GUARD_BITS`, which is one
routine's headroom for its own error count. The ceiling is one number
for every request because the table (D6) and the memos (D10) are built
at it once; it is set from the largest request the cap allows, and four
is the least factor that leaves that request more than one doubling
without doubling the table's and the memos' cost for every setting.
Both numbers are judgments, not measurements, and README ("Why four
times the limit plus ten") gives the user's account. The
ceiling is in the context so that it reaches the built-ins, whose memoized
constants hold their value at it (the plan's D10); it is static, the
user's, and a routine that needs more headroom than the working precision
takes it inside the kernel rather than moving the ceiling. `resolve` runs the evaluation at each working context in turn
and stops at the first result whose every value is exact, certified at the
digits asked for, or of unbounded radius; a result that certifies fewer
digits is kept as the best so far and the next pass tried, since
cancellation that cost `k` digits is paid for by `k` more working digits;
an `unresolved`, at any depth of a call or an inverse, and the converter's
`unresolvedWant` are retried the same way; any other error ends the loop,
with the best result so far if a pass produced one (the only such error a
later pass can newly raise is a `tooLarge` marking the pass unaffordable)
and otherwise with the error. At the ceiling the best result so far, or
the last error, is returned, and the display shows what is certified.
Expressions that never certify, `sqrt(2)^2 - 2` and `sin(pi()
radian)`, run to the ceiling however it is set, which is what bounds their
latency; the ceiling is therefore a cost setting. The table is built at
the ceiling context (`ceilingContext`), once per ceiling, by
`system-build.ts` (the plan's D6): since the angle units call `pi()`, a
unit's precision is fixed when the table is built and must lie above every pass, and one
ceiling serves every digits setting under one cap, so the table is rebuilt
only when the cap changes. The user's context comes from the settings ("UI" below): the digits, the
rounding mode, the exact or decimal mode, and the two limits, from which
the ceiling is derived. In decimal mode the schedule is the user's
context alone: one pass at the digits asked for, every operation rounding
in the mode, and the display marking what the radius does not certify
without escalating, since a higher internal precision would compute
something other than what the mode asks for.

**Settling.** Every result the evaluator produces, and every unit the
lookup hands out, is settled to the working context (the plan's D15):
an inexact midpoint is rounded to nearest at the working digits
(`workingDigits`, the decimal digits of `bitsFor`, the digits plus 32
guard bits), the grid the kernel's results leave on, with half a unit in
the last digit added to the radius; an exact value is never touched. So
an inexact midpoint never grows beyond the working precision however long
the expression, while exact values stay the exact numbers they are; the
first version of this design let inexact midpoints grow as exact
rationals, and a thirteen-thousand-bit dyadic to the fifth power was then
a size the range limit refused. In decimal mode the same settle rounds
every midpoint, an exact one included, to the digits asked for in the
rounding mode, and the exact difference between the rounded value and
the midpoint goes into the radius, so that the rounding mode governs
every operation there: a literal with more digits than asked is rounded
and the radius records it, a unit is rounded once when it is looked up,
a power of an inexact base at every squaring (an exact power once, on its
result), and a call once on its result; a value with
the digits asked for or fewer is its own rounding and stays exact, so
`1 ft` in `in` is `= 12 in` in either mode. The two modes are one
`roundTo` with two parameters (`settle` in `ball.ts`). `powBall` on an inexact base squares with
settling for the same reason, and only the magnitude of its result is
guarded. In exact mode settling rounds to nearest, not in the user's
mode: it bounds the
size of a number the user never sees, and the mode is applied once, by
the display, to the certified value of the whole expression, which
certification guarantees is the true value's rounding in that mode.

### Size limits

Exact arithmetic cannot overflow, but it can grow without bound:
`3^1000000` and `1e999999999 + 1` are valid input. Two limits on two axes
bound it (the plan's D16 as stage 4 restated it), in two units, because
they bound two kinds of value: the range limit is in bits, the size of
an exact rational's numerator and denominator, which is what an exact
value costs to hold and to multiply; the precision and its ceiling are
in decimal digits, the count an inexact midpoint is settled to, which is
decimal because the exponent is (a midpoint of `w` digits is an integer
of `w` digits times a power of ten, the type's smallest form, and the
form the display writes), and which the kernel converts to bits plus a
guard for its own work (`bitsFor`, `digitsFor`). The two meet once:
`maxDigitsFor` caps the digits so that a settled midpoint at the ceiling
fits the range limit with room for a product. README ("How a number is
held, and what the settings touch") is the user's account. The magnitude is the
value's decimal exponent, bounded by `MAX_EXPONENT`, `10^18`, in
scaled.ts (the plan's D17), beyond which an operation is refused, an
`overflow` above it or an `underflow` below it; within it a magnitude
costs nothing.
The bound is kept by decision, for the exponential's cost beyond it and
the parts of the number type that are exact only within it
(docs/decimal.md, "Decision: the bound stays at `10^18`").
The range limit, `maxBits` in the context, bounds the size of a mantissa's
numerator or denominator and the alignment of a sum: an exact power,
whose mantissa can be exponentially larger than its base's, predicts the
size of its result and returns `tooLarge` instead of computing anything
beyond it (reported at the bound instead when its decimal exponent
passes that too, which no setting moves: `7^1e19`), a sum of two exact
operands whose alignment, `|Δexp| log2 10` bits, exceeds the limit is
`tooLarge` in exact mode, the kernel is handed no argument beyond
`2^maxBits` (the
built-ins answer such an argument or refuse it first), and the evaluator
checks every literal's mantissa against it. A power of an inexact base is
guarded by the exponent bound alone, its midpoint settled at every
squaring. Its default is 2^16 bits
(about 19,700 decimal digits, at which every exact operation still takes
milliseconds, the reduction of a quotient of two mantissas at the limit
included) and it is
the user's to set up to the hard bound
`LIMIT_BITS` in rational.ts (2^20, about 315,000 digits), which the
parser, having no context, applies to a literal's mantissa. What the
limit means is cost: it is a hard limit on the bits the app forms, holds
and multiplies for one number, in time and in memory, which is why its
right value is the device's and the probe recommends it; and so its
measure is the size of what is stored, the canonical mantissa of a
`Scaled`, and not the bits of the value it denotes. The two differ for a
dyadic, whose twos in the denominator the canonical form trades for
fives in the numerator: `2^-30000`, a value of 30,000 bits, is stored as
`5^30000 × 10^-30000`, 69,658 bits, and that is what a product of it
costs (the plan's D16, as restated before stage 5). The rough edge is
narrower than it looks. What makes an exact value expensive is the bits
of the two integers that store it, not how simple its factorization is:
`3^-100000` is as simple as `2^-30000` and is stored as itself,
`1/3^100000`, 158,497 bits under this representation and under any
other short of a factored one, which the app does not use. The canonical
form adds cost in one case only, a denominator with twos: a factor of
`log2 5`, about 2.32, for a pure power of two, less for a mixed
denominator, and nothing for a denominator with no twos, which is every
other fraction. So the factor is bounded, it bites only in a band of a
factor of 2.32 below the limit and only for dyadics, and a value it moves
past the limit was already, by its own bits, within that factor of it, a
big number by the measure that matters; `approx` is the remedy, as for
any other. A binary exponent beside the decimal one, which
docs/decimal.md weighed and withdrew, would have spared `2^-30000` and
done nothing for `3^-100000`: the cost is in storing exact rationals as
digits, not in the power of ten. Every exact result is held to the
limit where the evaluator produces it (the plan's D19): `evaluate()`
measures the settled result of every node, a unit looked up and a
call's result included, and refuses one whose canonical mantissa passes
the limit, `tooLarge` at the node, as the pipeline does again after the
two quotients it forms outside the evaluator, the conversion's ratio and
a function want's count. The measure is after the fact, on the reduced
result, so `x / x` is one and a quotient costs its reduction, not its
unreduced parts; what is formed before the check refuses is at most a
product of two mantissas within the limit, a sum aligned within it or a
quotient's two parts, each at most twice the limit and reduced once,
which is the operation the probe times when it recommends the limit. A
power still predicts its size before forming anything, with the node
check as the backstop. The message names the node and the remedy:
`approx` around the node's first operand, which makes the result inexact
and settled rather than refused (around the node itself it would come
too late, the node being refused before `approx` sees it), or a higher
`maxBits`; exact mode never rounds an exact value on its own to stay
within the limit (the plan's D20). An inexact result, and every result
in decimal mode, is settled to the working digits and never refused for
size; the built-ins' internal intermediates, a unit list's
decomposition, `powBall`'s settled loop and the display's reciprocal
work on node results already held to the limit, within a constant
factor of them, and are not checked. The
precision limit is the cap on the digits setting, from
which the retry schedule's ceiling is derived; its own hard bound,
`maxDigitsFor`, follows from the range limit, since a settled midpoint at
the ceiling must fit it with room for a product of two: about 2,450
digits at the default range limit.
`approx` bears on the range limit alone: in a sum, whose smaller operand
it lets the radius absorb, in an integer power, whose inexact base is
settled at every squaring (`approx(3)^1000000000` is a value where
`3^1000000000` is `tooLarge`), and in any product, quotient or sum
whose exact result would pass the limit, which an inexact operand makes
inexact and settled (`approx(3^32767) * 7^21845` is a value where
`3^32767 * 7^21845` is `tooLarge`). It never changes an exponent, so a
result past the exponent bound is refused with it or without it
(`exp(approx(1e999))`; docs/approximate.md, "`approx` and the exponent
bound"). The two limits refuse with errors of their own, and the message
words them apart: "too large to compute within Most bits" for the range
limit's `tooLarge`, and for the bound that the exponent would pass
`10^18` (`overflow`), or fall below `-10^18` for a value too small to
hold (`underflow`).

### Failures

A value that cannot be computed is a `Result` error, never an exception:
division by zero (including `0` to a negative power), an even root of a
negative number, a result beyond the range limit or the exponent bound,
or text that is not a number. A result beyond the range limit is
`tooLarge`, the fraction's error (rational.ts), and one beyond the
exponent bound is `overflow` or `underflow`, errors of `Scaled`
(scaled.ts), since only a value with an exponent can pass it; so the
message names the limit the user can change apart from the one they
cannot (docs/decimal.md, "Which limit a refusal names").

A violated precondition (a zero denominator passed to the `rational`
constructor, a precision that is not a positive integer, a root degree below
one) is a bug in the caller, not a value that can fail, and throws
`RangeError`, as `1n / 0n` does. Every value that can be zero or negative
because the user typed it reaches the numerics through the ball's
`divideBalls`, `powBall` and `rootBall`, and through them `divide`, `pow`
and `exactRoot`, which report it; the kernel's preconditions (a positive
interval under a root) are checked by the ball before it calls in.

### Formatting

`format(s, digits, mode)` in scaled.ts renders a `Scaled` as a decimal
string in the style of C's `%g`: rounded to `digits` significant digits as
above, trailing zeros dropped, and exponent notation when the decimal
exponent is below -4 or at least `digits`, with the exponent written as
JavaScript writes it (`1.5e+21`, `1e-7`, `1e+999999999`). Nothing goes
through a `number` on the way, and the power of ten is never formed, so a
value of any magnitude renders exactly.

## Quantities, dimensions and kinds

Every unit resolves to a quantity: a magnitude, which is a `Ball` (a
`Scaled` midpoint with a `Radius`; "Precision and rounding" above), and a
dimension, which is an exponent vector over the primitive units, keyed by
primitive name with zero exponents left out. Exponents are rational so that
roots are exact on the dimension side (`m^(1/2)` is a dimension, and
`(m^2)^(1/2)` is `m`).

Primitives come in two roles, declared in the definitions file:

- **Dimension primitives** (`m`, `kg`, `s`, ...) are the physical base
  quantities.
- **Kind primitives** (`radian`, ...) are dimensionless markers. They ride
  along in the same exponent vector, so no separate mechanism is needed, but
  the conformance check treats them differently.

Conformance between `have` and `want` is checked in two steps:

1. Compare the vectors restricted to dimension primitives. A difference is a
   `dimensionMismatch` (length vs time).
2. Compare the full vectors. A remaining difference is a `kindMismatch`: the
   quantities are dimensionally compatible but semantically different, and the
   error names the kind primitives that differ.

So `rad/s` does not conform to `Hz` (`1/s`), because the former carries
`radian^1`. Torque could be separated from energy the same way, by defining
torque units with a `/ radian` factor as the SI brochure suggests; units.txt
defines no torque unit, and its `J` is `N m`. Which kinds exist
is entirely a matter of the definitions file; the core has no list of them.

`src/core/dimension.ts` holds the dimension arithmetic (multiplication,
division and raising to a rational power, with exponents that cancel to zero
dropped), the conformance check and the formatter. The check takes the
primitives with their roles from the table, in declaration order, so the kinds
a `kindMismatch` names come out in that order; a name the table does not
declare counts as a dimension primitive. A dimension formats in the expression
language itself: the primitives in declaration order, those with positive
exponents first and those with negative ones after a `/` (`m^2 kg / s^3 A`
for units.txt's volt, which the grammar reads as `(m^2 kg) / (s^3 A)`), `1`
standing in for an
empty numerator, and a non-integer exponent parenthesized (`m^(1/2)`). So what
the UI shows in an error is something the user could type back.

`src/core/quantity.ts` holds the `Quantity` type itself, and is the layer
that pairs the two below it: a `Ball` from `ball.ts` and a `Dimension` from
`dimension.ts`, neither of which knows about the other. The table stores
quantities, the evaluator produces them, and the converter consumes them.
The arithmetic the evaluator needs lives here as well: multiplication,
division and raising to a rational power, each a ball operation beside the
matching dimension operation. Only the magnitude can fail (a zero divisor,
or one that cannot be told from zero, `0` to a negative power, an even root
of a negative number, a result beyond the range limit or the exponent
bound), so the failures are those of `ball.ts`, and the power is the one
of the three that takes a `NumberContext`: for the range limit of an
exact power, the settling of an inexact base, and the root, or the
log-space route, of a non-integer exponent. Negation touches the
magnitude alone and cannot fail. Addition and subtraction have both
sides: only quantities of one dimension have a sum, so the dimension side
is the conformance check above, the sum has the dimension its terms
share, and the failure is a `ConformanceError`; and the magnitudes align
within the range limit of the `NumberContext` the two take, failing
`tooLarge` as `addBalls` does, or `overflow`, `underflow` or `unresolved`
at the bound for a sum that aligns and passes the exponent bound. Since
that check tells dimensions
from kinds by the roles of the primitives, these two operations take the
primitives as
`convert` does; `1 rad + 1` is a kind mismatch and `1 m + 1 s` a dimension
mismatch, exactly as the same pair would be as `have` and `want`. There is
no special case for zero: `0` is a plain number, and `1 m + 0` is a
mismatch, as in GNU units.

## Definitions

System units are not special: they live in a static definitions file,
`src/units.txt`, that is bundled into the app as an asset of its own (a URL
import, so it is emitted beside the scripts and precached with the rest of
the build, and fetched when the app starts) and go through the same parser
as any user-supplied definitions. `buildTable` takes one list of definitions, so
user definitions are simply appended to the system ones.

The format, the name rules and the expression language are user-facing, so
README.md ("Unit definitions") describes them, along with what the system
file contains and how to add to it. This section covers what the core does
with a definitions file. In short, the format is in the spirit of a GNU
units file, pared down: one definition per line, name then whitespace then
body, `#` comments, where a name with a trailing dash is a prefix, a body
of `!` or `!kind` declares a primitive, a name directly followed by `(`
is a function, `name(parameter) = body`, and a line that starts with `~`
is a function's inverse. The whitespace after a unit's or a prefix's name
is required, so that `inch2.54 cm` is an error rather than a definition
of `inch2`. `src/units.test.ts` builds the system file and checks a sample of
conversions from each of its sections.

A definition is one of six things: a primitive with its role, a prefix
(named without its dash) with a body, a unit with a body, where a body is
an expression, a unit list, whose body is two or more expressions
separated by `;` (a body of one is a unit), each kept with the text it was
written as, since that text is what the UI shows beside its term and the
table has no other way to get at it, a function, named with its parameter
in parentheses, each of the parameter and the result optionally annotated
with a unit expression (kept with its text, as a list's items are), and
its body after `=`, or the inverse of a function, `~name(parameter) =
body` ("Functions" below). The parser rejects an annotation with a number
other than `1`, a sum, a negation or a call, and a parameter named like a
unit its own head's annotations use, each where it is written; it
reserves a `|` after a head and a `[` after a function's name, for the
conditions and dimension variables to come, and rejects them as not
supported yet. `parseDefinitions` returns them in the order written,
duplicates included, and knows nothing about what they mean. Every span is an
offset into the whole text, not the line: a definition carries the span of
its text from name to body, for the errors `buildTable` reports against a
definition as a whole (a duplicate name, a cycle, a prefix that is not
dimensionless), and the spans inside its body serve the errors within it.

`buildTable` evaluates each body to a quantity, resolving references on
demand with memoization and a visiting set, so definitions may appear in any
order and cycles are reported rather than looping. Prefix bodies must be plain
numbers: no dimension and no kind. The result is the unit table: the
primitives with their roles, the prefixes with their factors, and the units
with their quantities, each a map keyed by name in declaration order. The
primitives are among the units, as quantities of one of themselves, so that a
lookup is one map read. The primitives with their roles are collected from
the definitions before any body is evaluated, because a body that is a sum
needs them to check its operands, and a body may refer to a primitive
declared after it.

Prefixes and units are separate namespaces, so `m-` (milli) and `m` (the
metre) coexist, while a primitive and a unit share one. A name in an
expression resolves to an exact unit name if there is one, and otherwise to
one prefix followed by a unit name (the rule README.md states for users).
Prefixes do not stack, and there is no plural handling: `inches  inch` is
an ordinary alias definition. Prefixes apply to units alone: a call's
name resolves among the functions and the built-ins exactly, so
`ktempC(1)` is a call of nothing (`notAFunction`), and a function's or a
built-in's name may not itself read as a prefix followed by a unit, which
the build checks.

Unit lists share the unit namespace (a list and a unit of one name are a
duplicate) but are not units: no expression can refer to one, so they stay
out of the walk, and each is evaluated in its place in the order, item by
item, through the same lookup a body uses, requesting what it refers to
from the top of the walker (which can never close a cycle). Since a list's
name means the list only as a bare `want`, while a unit's name means the
unit everywhere, a list's name that also reads as a prefix followed by a
unit (`ms`) would make one text mean two things in the two fields, and the
build rejects it once the ambiguity check has passed. A list's units are
checked as `convertToList` checks any list, against the first of them, so
that a defined list can fail to convert only for not conforming to the
`have`. The table holds each list as its units with their texts, apart from
the units.

Functions share the unit namespace as lists do, and their names are held
to the same rule against reading as a prefixed unit, for the same reason.
Unlike a list, a function can be referred to, by a call in any body, so a
function is a node of the walk, and evaluating it means checking it
("Functions" below): its annotations are evaluated, and its body's
dimension is taken without evaluating it (`dimension-of.ts`), with the
parameter bound to its annotation's dimension (plain without one),
through the walk's own lookup; that dimension is the function's result,
checked against the result's annotation when there is one. A unit may
then be defined by a call (`boiling  tempC(100)`), a function's body may
call another, and a cycle through a function is reported like any other.
An inverse is keyed by its function's name apart from every namespace,
and nothing can refer to it, so, like a list, it stays out of the walk
and is checked in its place in the order, requesting its function from
the top, which lets it call its own function: its body's dimension, with
its parameter bound to the function's result, must conform to what the
function's parameter takes. The table holds each function as its body,
still an expression, with the unit its parameter takes and its text, its
result's dimension, and its inverse when one is defined: a call evaluates
the body afresh, through the table's lookup.

Every name is known once the table is built, so ambiguity is a property of the
table rather than of the input, and `buildTable` checks for it. A name with
two different prefix-unit splits (`d`+`am` against `da`+`m`, were `am` a unit)
is a build error, so a table that builds has at most one split per name. A
unit name that is also a valid split (`min`, the minute, against `m`+`in`) is
allowed, because real unit conventions are full of them, and the exact name
wins. The check is cheap: for each pair of prefixes where one extends the
other, one map lookup per unit that starts with the extension, found in an
index of the unit names, which for most extensions (`icro`, `eci`) is no
unit at all.

Building is four concerns in four modules. `table.ts` holds the `UnitTable`
itself and the lookup over it that the evaluator resolves user input against.
`names.ts` holds the resolution rule and the ambiguity check, generic in what
a prefix or a unit maps to, because the build applies the same rule over
definitions before any quantity exists; `name-index.ts` is the index the
check searches, the names sorted so that those starting with any text are
one contiguous run. `graph.ts` is the on-demand
evaluation: a walker takes a function that computes a node's value given a
way to request the values of the nodes it depends on, and memoizes each
result; a request for a node whose evaluation is in progress is a cycle, and
the walker returns it to the requester, which knows where the request came
from. Nothing in it knows what a definition is. `build.ts` puts them together
in a fixed order: index the definitions by name, rejecting a duplicate;
check the index for an ambiguous name, and the names of the lists, the
functions and the built-ins for one that reads as a prefixed unit;
collect the primitives and their
roles; then walk every definition in order, where a body is evaluated by
`evaluate` against a lookup that resolves each name through the index and
requests the definitions it means from the walker, with those primitives.
The first failure ends the build.

A build error is one of: a duplicate name, carrying both definitions, or
the built-in's name and the definition that takes it; an
ambiguous name with its two splits; a unit list, function or built-in
whose name reads as a prefix and a unit, carrying the definition (or the
built-in's name) and the split; a
lookup failure at its reference (an unknown name, a function used as a
unit, a call of what is not a function, or a prefix times a unit refused
as too large or too small); a cycle, carrying the
definitions on it in order and the span of the reference that closed it; a
prefix whose body is not a plain number, carrying the definition and the
dimension it has; a unit list whose units do not make a list, carrying the
definition and the list error with the index of the unit at fault; a
function whose body does not conform to its result's annotation, or an
inverse whose body does not conform to what its function's parameter
takes, carrying the definition and the mismatch; an inverse of no defined
function; a function whose parameter's or result's annotation is zero, or
cannot be told from zero, since a recovered argument is written as a
count of the parameter's; or an arithmetic failure from the evaluator, located as the evaluator
locates it. Every span is an offset into the whole definitions text, and a
definition's span covers its text from name to body, so each error points
at something the user can see.

## Expressions

One grammar serves both definition bodies and user input, so anything that can
be typed can also be defined. README.md ("Unit definitions") describes it
from the user's side; this section is about how it is parsed and what the
tree holds. It is a small expression language: decimal
numbers, unit names, juxtaposition and `*` for multiplication, `/`, `+` and
`-`, `^` with a literal exponent, parentheses, and calls. The precedence follows
GNU units: juxtaposition binds tighter than `*` and `/`, which are one
left-associative level, so `kg m / s^2` is `(kg m) / (s^2)` and `m/s*s` is
`(m/s)*s`; `+` and `-` are one more left-associative level below those, so
`1 ft + 3 in` is `(1 ft) + (3 in)` and `2 m * 3 + 1 m` is
`(2 m * 3) + (1 m)`. A `-` before a product negates it, binding tighter than
`*` and `/` and looser than juxtaposition and `^`, so `-2 m` is `-(2 m)`,
`2 * -3` is `2 * (-3)` and `-2^2` is `-(2^2)`, as in arithmetic; it does
not stack, and there is no unary `+`. A unit list, `ft;in`, is one or more
expressions separated by `;`, and is not an expression: `;` binds looser
than anything and cannot appear inside parentheses. `parseUnitList` reads
one, and `expr.ts` exports the list grammar over any item parser, since the
definitions parser wants each item with its text.

A call, `tempC(100)`, is a name directly followed by `(`, zero or more
expressions separated by commas, and `)` (`pi()`, `atan2(3 m, 4 m)`), and
is an atom like a name: `2 tempC(100)`, `tempC(100)^2` and `-tempC(100)`
mean what they look like. The comma appears nowhere else in the grammar,
and how many arguments a function takes is the evaluator's to check, not
the parser's. The parser decides a call by the
text alone, since it cannot ask the table whether a name is a function,
and the rule is lexical: no space before the `(` makes a call, and a space
makes a product, so `kg (m/s)` stays the product it always was and
`kg(m/s)` is a call of `kg`, which the evaluator rejects with a message
that shows the product with the space. That is the one whitespace-sensitive
rule in the grammar; docs/functions.md weighs the alternative. The tree
holds a call as the name with its own span and its arguments.

Juxtaposition means "this many of these units" (`2 m`) or a product of units
(`kg m`), so a number may only be the first factor of a product: `m 2`,
`1 2 3` and `2 3 m` are errors, and multiplying numbers is written with `*`.
In the tree it is an ordinary multiplication, indistinguishable from `*`.

Whether the two sides of a sum can be added is not the parser's concern:
`1 m + 1 s` parses, and the evaluator rejects it. What the parser decides is
where a `-` belongs. A number's literal is read as far as it goes, so `2e-3`
is one number and `2 - 3` a difference, and an exponent's sign is part of
the exponent, so `m^-1` is a power while `m^2 - 1` and `m^2-1` are
differences. Elsewhere a `-` where an operand can start is a negation and a
`-` after an operand is a subtraction, so `2 -3` is a difference and
`2 * -3` a product with a negation. A number is never negative in the tree:
`-2` is the negation of `2`.

An exponent is a signed decimal (`m^2`, `s^-1`, `m^0.5`) or a parenthesized
rational (`m^(1/2)`), never an expression, so it is known at parse time and
travels in the tree as the two literals the parser read, undivided
(`Exponent`): each must be formable within the hard bound and a zero
divisor is rejected, both read off the literals with nothing formed, and
the evaluator takes the quotient where the range limit applies, since a
reduction in the parser, which has no context, took seconds on long
literals and minutes at the hard bound, on every keystroke (the plan's
H.9, issue #66). A unit name is a letter or underscore
followed by letters, digits and underscores, in any script, taken as long as
it goes: `m2` is one name rather than `m` beside `2`, and whether a name
means anything is decided by the table, not the parser. Whitespace is spaces
and tabs, never a newline, because a definition body is one line.

The tree has six kinds of node: a number, a unit name, a binary operation
(a sum, difference, product or quotient) of two subtrees, a negated
subtree, a subtree raised to a rational exponent, and a call. Every
node carries the span of text it came from, so an error found later in the
pipeline (an unknown unit, a dimension mismatch) can point back at the input.
`parseExpr` knows nothing about units, and `evaluate` knows nothing about
text. `ParseError` comes from the parsing toolkit below, which both parsers
are built from; `Span` has its own small module, because it is not a parsing
concept but the vocabulary every later stage uses to locate its errors.

## Parsing

Both parsers are assembled from a small set of parser combinators in
`src/core/parser.ts`. A parser is a plain function from the input text and a
position to a reply: the value it recognized and the position just past it,
or an error. A grammar is plain code that combines parsers into parsers, with
primitives for literals, patterns and the end of input, and combinators for
sequencing, ordered choice, repetition, one left-associative precedence level
(`chainl1`), attaching spans (`spanned`), validating a recognized value
(`check`) and self-reference (`lazy`). The types carry the grammar's shape: a
sequence of parsers is a parser of a tuple and a choice is a parser of a
union, so a grammar that type-checks produces the tree its types say it does.

We chose combinators instead of a hand-written recursive-descent parser or a
Pratt (top-down operator precedence) parser because the grammars are small
and fixed. The expression language has a handful of precedence levels, each
of which is one `chainl1` (or `many`, for juxtaposition) over the level
below, and the definitions file is a line with two or three fields. A Pratt
parser is general: it drives a table of operators with numeric binding powers
from a loop whose invariant has to be checked. That generality buys nothing
here, while a combinator grammar is checked by reading it against the grammar
it transcribes. Should the language ever need user-defined or many-levelled
operators, a Pratt loop can be written with `flatMap` on the same primitives,
without changing them.

Three properties make the combinators simple to reason about:

- **`alt` is ordered choice, and the only backtracking is local.**
  `alt(a, b)` tries `a`; if `a` fails, however far into the input it got
  before failing, the position is rewound and `b` is tried from the same
  place. The first alternative that matches is taken for good: a failure
  later in the parse never reopens an earlier choice to try its remaining
  alternatives, so the parser never searches a space of parse trees.
  "Backtracking" here means only that rewinding, which is what lets an
  alternative be written without lookahead: an optional exponent, written
  `optional(seq(string("^"), exponent))`, may consume the `^` before finding
  no exponent, and still cleanly matches nothing.

  That makes the cost easy to bound. The work of a parse is the number of
  primitive (`string`, `regex`) matches attempted. Text is read more than
  once only when an alternative fails after consuming some of it and the next
  alternative reads the same text again. That is the exponential case of
  unmemoized ordered choice: `alt(seq(p, a), seq(p, b))` parses `p` twice,
  and nesting that pattern `k` deep parses the innermost `p` `2^k` times. Our
  grammars never share a prefix between alternatives. At every `alt`, the
  alternatives are told apart by their first primitive (a digit, a name
  followed by `(`, a name not followed by it, `(`, or an operator symbol),
  so all but at most one of them fail on their first primitive, at
  constant cost. An alternative fails after consuming input in two ways
  only: an operator with nothing valid after it (`3 m ^`), which rewinds
  by one token and is followed at once by a failure at that token; and a
  call whose argument list fails, which has consumed its text, and the
  alternatives after it, a plain name (one not directly followed by `(`,
  decided by a lookahead that includes the name's own characters, so that
  the match cannot back off to a shorter name in front of the `(`) and a
  parenthesized expression, fail at their first primitive, so nothing is
  read twice. So each character is consumed by exactly one primitive, each
  failed alternative costs one primitive attempt, and a parse costs a
  constant number of primitive attempts per token, times the depth of the
  grammar for passing each reply up through the enclosing combinators. A
  hundred-character line is a few hundred primitive attempts. The
  discipline that keeps this true, and that any new grammar built on these
  combinators must follow, is that the alternatives of one `alt` begin with
  different tokens, and repetition is expressed with `many`, `many1` or
  `chainl1` rather than with a recursive alternative. (The call rule broke
  it once: a call and a name began alike, told apart only by a lookahead
  for `(`, so a nested call with an error in it cost `2^k` for `k` levels,
  issue #54.)

- **Every reply carries the furthest expectation.** An `Expectation` is a
  position and the labels of the primitives tried there. Not only failures but
  successes carry one, and every combinator keeps whichever of its parts got
  furthest (merging the labels of those that tie), so the error reported for a
  parse is where the parser got furthest and what it wanted there, whatever
  alternatives it undid afterwards. This is what makes the error for
  `3 m ^` say "expected a number or `(`" after the `^`: the optional
  exponent fails there, the
  parser backs out of it, the product ends, and `eof` fails earlier at the
  `^`; the furthest expectation survives. Without it, backtracking parsers
  report the position where the outermost rule gave up, which is usually not
  where the mistake is.

- **Rejection is final.** `check(parser, validate)` turns a recognized value
  into a `rejected` error carrying its span and a reason when `validate` says
  so, and no combinator retries past a rejection: the text was understood and
  found unacceptable, not misread, so trying another reading would only
  produce a worse error. This is how a numeric literal that `parseDecimal`
  refuses (a mantissa past the hard bound, or an exponent past the
  exponent bound) becomes a parse error pointing at the literal.
  `check` is the only source of `rejected` errors. The reason is data, the
  `R` of `Parser<A, R>`: the expression grammar's is its `Rejection` (a
  literal past the hard bound or past the exponent bound on either side;
  a `^` exponent that cannot be formed; one that divides by zero), and
  `src/messages.ts` words it, as it words every other error, so that no
  sentence is written in the core.

A parse error is therefore one of two things: nothing acceptable at a
position, with the labels of what would have been, or text at a span that was
recognized and rejected, with the reason. Spans are attached with `spanned`
on the leaves, and a composite node spans from its first child to its last.

The combinators are pure: a parser is a closure over its configuration and a
function of `(text, pos)`. The two pieces of mutable state are internal and
unobservable: `regex` reuses one sticky `RegExp` whose `lastIndex` it sets
before every use, and `lazy` memoizes the parser it builds. `many` of a
parser that matches the empty string would loop forever; that is a bug in the
grammar, not an input that can fail, and it throws.

## Evaluation

`evaluate` takes an `Expr`, a `Lookup` for unit and function names, the
table's `Primitives` and the working `NumberContext`, and returns the `Quantity`
the expression denotes. A number is a dimensionless quantity, a unit name
is whatever the lookup says it is, and the operators are the quantity
arithmetic above: juxtaposition and `*` multiply, `/` divides, `+` and `-`
add and subtract, a leading `-` negates, and `^` raises to the exponent the
parser read, made a fraction here within the range limit
(`reduceExponent`, which `dimensionOf` applies under the build's context
too): each literal's mantissa is held to the limit as every literal's is,
the quotient of the two is taken as `Scaled` values, whose powers of ten
cancel for nothing, and the fraction is formed from it within the limit
as `pow` forms an exact exponent, so that `2^(1e30/1e30)` is `2` at any
limit and `2^1e-30000` is refused at the default as `pow(2, 1e-30000)`
is, at the bound when the power would pass it and otherwise at the limit.
A call resolves its name among the functions, through
the lookup, to a function the table defines or a built-in (`ResolvedFunction`),
checks that it gives as many arguments as the function takes
(`arityMismatch` otherwise, before any argument is evaluated, since the
count is about the call's shape; a defined function takes exactly one),
and then, for a defined function, evaluates its argument, checks that the
argument conforms to the unit the function's parameter takes, and
evaluates the body with the parameter bound to the argument ("Functions"
below); for a built-in it evaluates every argument, applies the built-in's
dimension rule to their dimensions (`builtinArgument` at the call when it
fails, carrying the rule's error and every argument's span) and its
function to their magnitudes, and locates a `domain` failure at the call
(`domainError`), an `unresolved` at the argument that straddles the edge
the error names, and any other failure at the call.
The context goes to every power and every built-in, the operations that
can lose digits, and to every sum, which aligns within its range limit,
and every literal's mantissa is checked against that limit; everything
else is exact, and every result is settled. The
primitives go to every sum, whose operands must conform: this is where
evaluation checks conformance, beside a call's argument against what the
function takes, and it is the same check, with the
same roles, that conversion applies to `have` and `want`, so that what can
be added is exactly what can be converted. The primitives come from the
table for user input, and from the definitions, collected before the walk,
while the table is being built.

Names are resolved through a lookup function rather than a table, because the
same evaluator serves both ends of the pipeline. The table supplies a lookup
over its finished units for the user's `have` and `want`, applying the
prefix-splitting rule described under Definitions; `buildTable` supplies one
that evaluates definitions on demand, with its memoization and visiting set,
while the table is still being built. Each lookup defines its own error type
(an unknown name, a cycle among definitions); `evaluate` takes that type as a
type parameter and returns a lookup failure unchanged. The lookup is given
the span of the reference along with the name, so that its error can point
at the text as the evaluator's own errors do.

Operands are evaluated left to right and the first failure ends the
evaluation, so `bogus / 0` reports the unknown unit rather than the division.
The evaluator's own errors are the arithmetic failures, each located in the
input: a division by zero points at the divisor, since its value is what is
wrong, and so does a division by a value that cannot be told from zero at
this precision (`unresolved`: the divisor's ball contains zero without
being exactly zero, as `sqrt(2)^2 - 2` does); a power whose base cannot
be told from zero, raised to a negative power or put under an even root,
points at the base for the same reason, and any other power that fails
(`0^-1`, an even root of a negative magnitude, a result beyond the range
limit or the exponent bound) points at the whole power, since it is the
combination of base and exponent that fails. A sum, a product or a
quotient refused as too large or too small (`tooLarge`, `overflow`,
`underflow`) points at the whole operation, as a power does, and a
literal whose mantissa is beyond the range limit at the literal. A sum
whose operands do not
conform points at the whole sum for the same reason, and carries the span of
each operand and the `ConformanceError` between them, with the left
operand's dimension as its `have` and the right's as its `want`, so that a
message can say what each side is, in the words a conversion error uses.
A call whose argument does not conform points at the whole call and carries
the argument's span the same way. A call whose body fails for the argument
is one `callFailed` at the call, naming the function and carrying the
body's error, whose spans are into the definitions text; only the
evaluator's own failures are wrapped so, and a lookup failure inside a body
(which a table that built cannot produce) comes back as any lookup failure
does. The evaluator never sees the text: the spans in the tree are all it
knows of it.

## Conversion

`convert` takes the two quantities and the table's primitives (whose roles
the conformance check needs) and returns the output value: how many `want`s
make up `have`, which after the conformance check is simply the ratio of their
magnitudes, since each quantity already carries its own scale. `want` may have
a magnitude (`1 mi` into `1000 ft` gives `5.28`), as in GNU units. The
ratio is the ball quotient of the two magnitudes, exact on the midpoints
with the radii propagated, so `1 m` into `in` is exactly `5000/127`, and
the display is where it becomes `39.370079`. A failure is a dimension
mismatch or a kind mismatch, carrying both dimension vectors, a `want`
whose magnitude is zero,
of which nothing is a multiple, or a `want` whose magnitude cannot be told
from zero at this precision (`unresolvedWant`, kept apart from `zeroWant` as
the ball's `unresolved` is from its division by zero, since the retry loop
retries the one and never the other), or a ratio refused as the quotient
it is, today at the exponent bound (`1e999999999999999999 m` into
`1e-999999999999999999 m` is an `overflow`); the conformance check
comes first, so `0 s` as the `want` for a length is reported as the mismatch
it is. A core function formats a
dimension as text (`m^2 / s`), so the UI can explain a mismatch without
interpreting anything itself.

Every failure in the core is a `Result`: a discriminated union of a value or
an error, with each module defining its own error type.

### Unit lists

`convertToList` is the second output mode, over the same conformance check:
`have` as a sum over a list of units, largest first, `1 m` into `ft;in`
being `3 ft` plus `3.37 in`. Each unit but the last gets the integer count
of it that fits in what the earlier units left, truncated toward zero so
that every term has the sign of `have` (`-1 m` is `-3 ft - 3.37 in`), and
the last gets the remainder. The counts are taken from the midpoints (the
plan's D8), so a count is an exact integer and never `unresolved`, and the
remainder is the ball `have` less the counted units, computed with the ball
operations, so the terms times the units add up to `have` exactly when
everything is exact and contain it otherwise. A ratio whose integer part
cannot be formed within the range limit (`1e999999999 m` into `ft;in`) is
counted as its midpoint settled toward zero at the working digits, still
an exact integer, and the remainder is what that count leaves (the plan's
D8 as stage 4 amended it), and a count whose ratio falls below the exponent
bound is zero, nothing of that unit fitting in what is left
(`1e-999999999999999999 s` into `hr;min;s`; D8 as the plan's H.12 clarified
it). Any other refusal of a count, of a count times its unit, or of the
difference it leaves, and an `unresolved` of them, is the list's failure,
which the pipeline reports as the conversion's, as it reports a refused
ratio (`3^32767 m` into `ft/7^21845; in/7^21845` is `tooLarge`, its
remainder not aligning within the range limit, where stage 4 threw). A
ratio whose ball straddles
an integer, as `turn / deg` does once both carry `pi()`'s radius, counts
as that integer rather than its truncation, so that the remainder is a
ball around zero, which the display leaves out, rather than a whole of the
unit (`≈ 360 deg`, not `359 deg + 60 arcmin`). That is only a meaningful sum
when the units run from the largest to the smallest, so the units are
checked in order, each for conformance with `have`, for a positive
magnitude whose ball excludes zero (a unit that cannot be told from zero is
no size to count by), and for being smaller than the one before it by
midpoint, and the first failure is reported with the index of the unit at
fault. The units need not be multiples of one another (`mi;km` works) and
may carry magnitudes (`ft;in/8`).

The terms are exact for exact quantities, as the ratio `convert` returns
is, and rounding them for display is more than rounding each: a remainder
of `11.9999999988 in` shown at eight digits is `12 in`, which beside `2 ft`
reads wrongly. So `roundTerms` is the display rounding that goes with the
sum: it rounds the remainder's midpoint to the display precision, in the
display's rounding mode, as `roundTo` does, widening its radius by the
rounding's shift so that the rounded terms still contain `have`, and, when
that changes it, takes the counts again from the
rounded sum, so that a remainder which rounds up to a whole of an earlier
unit carries into it, through as many units as it must
(`3599.9999999999 s` in `hr;min;s` is `1 hr`; under `floor` nothing rounds
up, and it stays `59 min + 59.999999 s`). That is
one rounding of the whole sum, by less than a unit in the last digit of the
remainder, and the second decomposition is exact. The counts are integers
and are left alone; one too long for the display is the display's to round,
as any value is. When the remainder is already exact at the display
precision, the terms come back as they are, and so do they, uncarried,
when rebuilding the total from the rounded terms fails, since the display
calls `roundTerms` and the uncarried terms still contain `have`: the
carry's rebuilt total can pass the exponent bound where the terms did not
(the plan's H.12).

The pipeline reads the `want` as a unit list. One item that is a bare name
of a list in the table means that list, with the texts of its units from
the definition; any other one item is a unit and goes through `convert`;
two or more items are a list typed out, each evaluated as an expression and
paired with its text, sliced from the `want` by its span. A unit of a
typed list that fails the list's checks is reported with the texts of all
of them, so that a message can quote the one at fault; a list from the
table passed those checks when it was built, and can fail only for not
conforming to the `have`, which is reported as the mismatch of the pair, as
for a single `want`, so that the message quotes the name the user typed.

### Functions

A function (docs/functions.md is the design, with the reasoning) is a body
with one parameter, `tempC(x) = x K + 273.15 K`, and an optional inverse
on a line of its own, `~tempC(y) = y / K - 273.15`. It exists for
readings such as a temperature, which are not multiples of a unit,
without giving `Quantity` an offset that every operation would then need
a rule for, and for compositions of the built-ins that a user would
otherwise type out. Nothing about functions touches quantities: a call
is a quantity like any other once the body has run, and the rest of the
expression goes on as before. A parameter's annotation checks a
dimension and changes no value, since a quantity carries no unit of its
own: `x: kg` admits any mass, as `x: lb` does, and a body that needs a
number in a given unit divides it out.

The pipeline reads a `want` that is the bare name of a function, after a
list's name and before a unit's, as the third output mode: the answer is
the call that would produce the `have`, `tempF(212)` into `tempC` being
`tempC(100)`. It needs the function's inverse, and a function without one
is a `noInverse` on the want side. The `have` must conform to the
function's result, which is the ordinary mismatch of the pair when it
does not, and `invertFunction` evaluates the inverse's body with its
parameter bound to the `have`, through the table's lookup. Since an
inverse is the one part of a definition the build cannot check, the
answer is then checked: the function is applied to the recovered
argument, and a value certainly other than the `have` (two exact values
compared exactly, otherwise a difference wholly on one side of zero) is
an `inverseMismatch`, as is a failure of the function's body there; the
check refutes a wrong answer and proves nothing, overlap being what
balls can decide. The conversion carries the recovered argument, the
unit the parameter takes with its text, and the argument as a count of
that unit, so that the UI writes it as it writes any value beside a
unit; a count refused as a ratio may be (a quotient past the exponent
bound) is the conversion's refusal. An inverse's body that fails for the
value is an `inverseFailed` on the want side, carrying the body's error
as a call carries its body's. A `want` that is a call is not special: it
is an expression, and the conversion is the ratio, with a reciprocal.

A built-in (docs/builtins.md; `src/core/builtin.ts`, and the set in
`builtins.ts`) is a function the
core implements in code rather than a definition: a name, the count of
arguments it takes, a dimension rule from its arguments' dimensions to
its result's, and the function itself from balls to a ball at a working
context, which returns the kernel's ball as it is and rounds in no mode,
the evaluator settling it as it settles every result. Built-ins share the
function namespace: the table carries the set it was built against, the
build rejects a definition named like one as a duplicate and a built-in
whose name reads as a prefixed unit as it rejects a function's, and a
call's name resolves to a defined function first and a built-in second.
A built-in has no inverse, so its name is not a `want`. The set is the
elementary functions: `pi()`, `exp`, the logarithms, the roots, `pow`,
the trigonometric and hyperbolic functions and their inverses; and
`approx`, the value known to the working precision (docs/approximate.md);
docs/builtins.md lists each one's rule, domain, exact cases and edges,
and the modules under `builtins/` hold one function or one family each.
The neper, the bel and the decibel are defined functions in units.txt
whose bodies call the built-ins.

The build checks each function once so that a call at run time can fail
only on its argument or on a value: the annotations are evaluated and
must be nonzero, since an argument is written as a count of the
parameter's; the body's dimension is taken without evaluating it, by
`dimensionOf` in `dimension-of.ts`, the evaluator's rules over dimensions
alone (a number is dimensionless, a unit is its dimension through the
walk's lookup, a sum checks conformance, a product combines, a power
raises, a call applies the callee's rule), with the parameter bound to
its annotation's dimension, so that a body which refers to nothing, or
is put together wrongly, fails the build with its span in the
definitions text; that dimension is the result's, exact because a body's
dimension cannot vary with the value of its argument, and is checked
against the result's annotation when there is one; and an inverse's body
is taken the same way, with its parameter bound to the result, and
checked against what the parameter takes. A body that fails at some value, or at every value, builds and
fails at the call that reaches the value; the first version of the check
evaluated each body at one of the declared unit of the first form of
definitions, which the elementary
functions made untenable (`ln(x - 1)` fails at one). Applying and
inverting are one operation, a body
evaluated under a binding, and `applyFunction` and `invertFunction` share
it: the bound parameter is resolved before any unit or prefix, and the lookup's
failures are boxed on the way in and unboxed on the way out, so that the
body's own failures can be told from the lookup's without the evaluator
knowing the lookup's error type.

## UI

`<unit-converter>` is a Lit component with two text inputs, "you have" and
"you want", and an output area. Its only state is the two strings; on every
change it runs the pipeline and renders either the formatted result or the
error. `<app-shell>` hosts it and owns the `UnitTable`: `src/system-table.ts`
fetches the bundled definitions and parses them on the main thread (a few
milliseconds), once, and `src/system-build.ts` builds the table from them
at the ceiling of the retry schedule in force, memoizing one table by its
ceiling, so that the shell, which starts the load when it is connected and
shows a loading message until the promise settles, builds in `render` and
rebuilds only when the precision limit setting moves the ceiling. Loading
the components never waits on the table. Should the fetch fail, or the
file fail to parse or build (which `units.test.ts` guards against), the
shell says so instead of rendering a converter.

The core's surface to the UI is `(table, haveText, wantText, context) →
Result`, and `src/core/pipeline.ts` is that function: `convertText` parses
and evaluates each text and converts the pair, and returns each step's own
error, a text's tagged with the side (`have` or `want`) it came from, so
that the component can mark the input at fault, and the conversion's
about the pair. `src/outcome.ts` turns that result into the lines the
output area shows: it calls the display's `show` and `roundTerms`, and
parses the `want` again to write it (below), which are views of the
result rather than steps of it, and it has no DOM dependency, so
`outcome.test.ts` checks the lines under Node. `evaluateText` is the first
half alone; with the `want` field blank, the outcome is what `have` is in
the primitives (`1 in = 0.0254 m`), as GNU units does.

A conversion into a function is one line, the `have` and then the call at
the recovered argument, `tempF(212) = tempC(100)`, the argument written as
a count of the unit the function's parameter takes followed by that
unit's text as a `want`'s is written, and by nothing when the unit is
`1`, as for a parameter without an annotation. There is
no reciprocal line: a call is not a ratio, so there is no other way round,
as there is none for a list.

The output shows the two texts and the value between `=` or `≈`, decided by
`show` of `src/core/display.ts` at the digits and in the rounding mode of
the user's settings (eight digits, half away from zero, by default; the
digits asked for are kept apart from the working precision as "Precision
and rounding" describes): `=` when the value's radius is zero and every
digit it holds is shown, `≈` otherwise. What follows the relation is what
`show` certifies: every digit asked for when the value allows, and
otherwise a note in parentheses after the line, "8 of 12 digits are
certain" with the certified digits shown, "within 2e-30 of zero" with the
value shown as `0`, or "the digits are not certified" for a radius not
known. A list is certified on its unrounded terms, its remainder is
rounded at the digits certified, and its counts, exact integers, carry no
note; when the rounding carried into an earlier unit the remainder left
is a new value, judged on its own, and a last term that cannot be told
from zero is left out as a term of zero is, with its note, unless it is
the only term; the reciprocal line shows its own kind. The settings are the shell's
(`src/settings.ts`, kept in `localStorage`, validated on the way in with
the dependent ones clamped, so that a stale entry never leaves the app
without a consistent context): the digits, the rounding mode, the exact
or decimal mode, the cap on the digits and the range limit in bits (the
plan's D16), reaching the component as
its `context` property, the same `NumberContext` the pipeline takes, whose
ceiling, the top of the retry schedule, is derived from the cap, and
whether exact values are shown as reduced fractions, a display setting
that reaches the component as its `fractions` property and the core
never sees. A
button in the panel runs the probe of `src/limits.ts`, which times the
costliest operation the app has on each axis at doubling sizes (an exact
product with its reduction for the range limit, and for the cap one
expression of the four costliest built-ins of the kernel benchmark's
report, evaluated at the candidate's ceiling) and
recommends the largest limits that stay within a latency budget per pass;
it runs only when asked, and it measures time alone (the plan's D16 says
why memory is left out). The line is written so
that it reads as the expression it means: a `want` with a magnitude of its
own is written with a multiplication sign (`1 mi = 5.28 × 1000 ft`), since
juxtaposing two numbers would read as one product, and a `want` that is a
sum, a difference or a negation is parenthesized (`1 m ≈ 3.0284676 (ft + in)`,
`1 m ≈ -3.2808399 (-ft)`), since `3.0284676 ft + in` would read as
`(3.0284676 ft) + in` and `-3.2808399 -ft` as a difference. The component
parses the `want` once more to tell, which is the same parse the pipeline
did a moment earlier.

A conversion into a unit list is shown as the sum of its terms, each unit
written as a single `want` would be, with `roundTerms` applied at the
display precision in the display's mode, and the relation `=` only when
every term is exact by the same rule. The first term keeps its sign and each
later one is joined by `+` or
`-` and written unsigned, so that `-1 m ≈ -3 ft - 3.3700787 in` reads as
the expression it is and could be typed back as a `have`. A term of zero is
left out, as it would be in speech (`1 hr + 1 s`), except that a sum of
nothing but zeros keeps its last term (`0 in`).

GNU units answers every conversion twice, with the number to multiply by
(`* 36`) and the number to divide by (`/ 0.027777778`). Dividing by the
second number converts the other way, from `want`s to `have`s, so it is the
reverse conversion in disguise: one `in` is `0.027777778` of `3 ft`. The
converter shows that reverse conversion on a second line, written as the
first line is with the sides swapped, so that both read as statements about
quantities and could be typed back as a `have`:

```
3 ft = 36 in
in ≈ 0.027777778 × 3 ft
```

The `have` takes the unit's place and is written as a unit is, by the same
rule as a `want`: with a multiplication sign when it starts with a number,
since `0.027777778 3 ft` would read as one product, and parenthesized when
it is a sum, a difference or a negation (`in ≈ -0.027777778 (-3 ft)`). Each
line's relation is decided from its own value: `2 m = 2 m` and `m = 0.5 ×
2 m` are both exact, while `1 in = 2.54 cm` has the approximate `cm ≈
0.39370079 × 1 in`. The reciprocal is the ball quotient of one by the
ratio the pipeline returns (the ratio of `want` to `have`, as `convert`
would give it with the
two swapped), and it stays in the component: it is a second view of the
same value, like the rounding, not a step of the conversion. GNU units'
verbose form writes the second line as `3 ft = (1 / 0.027777778) in`
instead, which is true but reads as nothing; the swapped line says what
the number is for.

Only a conversion into one unit has a reciprocal. That conversion is one
ratio, `have / want`, and the reciprocal is the same ratio the other way
round, `want / have`, which says the same thing. A conversion into a unit
list is not a ratio but a sum, `3 ft + 3.3700787 in`, a positional way of
writing one quantity, and there is no other way round for it: inverting
each term gives numbers that add up to nothing, `1 / have` in the same
list never conforms (its dimension is the inverse), and the reciprocal of
the total in any one unit of the list would be a reciprocal of a different
conversion, for a unit chosen by some rule the user did not ask for. GNU
units prints no reciprocal for a unit list either. So a list, typed or
named, gets no second line, nor does a blank `want`, which shows a
definition, as GNU units shows one without a reciprocal. A value of zero
has no reciprocal (`0 ft = 0 in`, and nothing is a multiple of `0 ft`), nor
has one that cannot be told from zero, and the line is left out rather
than shown as anything, as it is whenever the quotient fails.

The errors the core returns are values with spans and dimensions, not
sentences; `src/messages.ts` puts them into words, quoting the text at fault
and formatting dimensions with `formatDimension`, so that the wording is
tested under Node.js beside the core rather than in a browser. A sum that
does not conform is worded as the same mismatch between `have` and `want`
would be, with the two operands quoted in place of the two texts. Richer UX
later is a matter of new components that edit the same two strings or read
the table: autocomplete lists `table.units` and `table.prefixes`, unit
buttons insert text, and error spans drive highlighting. None of that needs
changes to the core.

## Layout

```
src/core/rational.ts      Rational, the exact fraction: arithmetic, comparison, integer powers, the exact root
src/core/scaled.ts        Scaled, the midpoint's type, a fraction times a power of ten in canonical form: arithmetic within the alignment limit and the exponent bound (MAX_EXPONENT; ScaledError, Refusal, powerRefusal), comparison, parsing, rounding, formatting, the binary magnitude
src/core/rounding.ts      RoundingMode, ROUNDING_MODES, divideRounded: the one place a mode is interpreted; Precision
src/core/context.ts       NumberContext: the precision, the rounding mode, the range limit, the ceiling and the exact or decimal mode arithmetic is done under
src/core/radius.ts        Radius, the coarse bound a ball carries, and its operations, each rounding the way its bound needs, up or down
src/core/ball.ts          Ball (a midpoint with a Radius), its exact operations, the root and the rational power on the kernel, unresolved
src/core/fixed.ts         Fixed, the fixed-point kernel: a value with an error count in ulps, its exact operations, the roots
src/core/fixed-exp.ts     expFixed, sinhCoshFixed and tanhFixed: the exponential on the kernel, by halving, Taylor and squaring into a Floating, and the hyperbolic functions through it
src/core/digits.ts        floatingToBall: a Floating as a ball, exactly within the range limit and by its decimal logarithm in log space beyond it
src/core/fixed-log.ts     lnFixed: the logarithm on the kernel, by square roots and the atanh series; ln(2) and ln(10) memoized
src/core/fixed-gamma.ts   digammaFixed and lgammaFixed, and digammaRational and lgammaRational for an exact argument of short denominator: the shift up, by a loop or exactly by binary splitting, and the asymptotic series on the Bernoulli ratios, ln pi memoized (stage 6, docs/special.md)
src/core/fixed-incomplete.ts the incomplete gamma series with its tail bound, and Legendre's continued fraction with the bracket of its convergents (stage 6, docs/special.md)
src/core/fixed-incbeta.ts the incomplete beta series with positive terms and its geometric tail bound, and the estimate of its terms (stage 6, docs/special.md)
src/core/fixed-trig.ts    sinCosFixed and atanFixed: the sine, cosine and arctangent on the kernel, by reduction and the Taylor series
src/core/constants.ts     pi by Chudnovsky's series and e by its series, both with binary splitting, memoized at the ceiling
src/core/bernoulli.ts     the Bernoulli numbers, exact, from the tangent numbers, a run on request
src/core/bernoulli-ratios.ts the ratios of consecutive Bernoulli numbers in fixed point, each at the bits its term needs, memoized by count and bits
src/core/display.ts       show: a ball's text at the digits it certifies, and its kind (exact, certified, partial, zero, unbounded)
src/core/dimension.ts     Dimension arithmetic, conformance check, formatting
src/core/dimension-of.ts  dimensionOf: a body's dimension without its value, the build's function check
src/core/quantity.ts      Quantity (a Ball with a Dimension), its arithmetic
src/core/span.ts          Span, a location in the input text
src/core/parser.ts        Parser combinators, ParseError
src/core/expr.ts          Expr, parseExpr, parseUnitList, Rejection
src/core/definitions.ts   Definition, parseDefinitions
src/core/graph.ts         on-demand evaluation of a dependency graph, cycles
src/core/names.ts         the prefix-unit resolution rule, the ambiguity check
src/core/name-index.ts    the names that start with a text, by binary search
src/core/builtin.ts       Builtin, its errors and the shared rule helpers: what a built-in is
src/core/builtins.ts      BUILTINS: the app's built-ins gathered by name from builtins/
src/core/builtins/pi.ts   pi(): the circle constant from constants.ts, one module per built-in
src/core/builtins/exp.ts  exp(x): the exponential, on fixed-exp.ts, with e from constants.ts
src/core/builtins/log.ts  ln, log10, log2 and log(b, x): the logarithms, on fixed-log.ts, sharing the domain rule
src/core/builtins/roots.ts sqrt and cbrt: rootBall under a name, with its exact cases and errors
src/core/builtins/pow.ts  pow(x, y): the rational power's rule for an exact exponent, log space for an inexact one
src/core/builtins/trig.ts sin, cos and tan: the trigonometric functions of an angle, on fixed-trig.ts, sharing the reduction
src/core/builtins/inverse-trig.ts asin, acos, atan and atan2: the inverses, returning an angle, every one an arctangent
src/core/builtins/hyperbolic.ts sinh, cosh, tanh, asinh, acosh and atanh: through exp, and through ln of a root
src/core/builtins/approx.ts approx(x): the value known to the working precision and no better, of any dimension, never narrowing
src/core/builtins/abs.ts  abs and sign: the magnitude and the side of any quantity (stage 6, docs/special.md)
src/core/builtins/round.ts floor, ceil, trunc and round(x, places): a plain number to the cell its midpoint's result stands for
src/core/builtins/division.ts div and mod: floored division and its remainder, one quotient serving both
src/core/builtins/integers.ts gcd, lcm, factorial, binomial, doublefactorial: the functions of exact integers, with their size predictions
src/core/builtins/gamma.ts digamma(x), lgamma(x) and gamma(x): the Gamma family, on fixed-gamma.ts, with the poles, the reflection, the routes for any exponent and the classifier on gamma
src/core/builtins/beta.ts beta(a, b): the Beta function through lgamma under the classifier, exact for whole numbers within Most bits, zero at a pole of the sum alone
src/core/builtins/incomplete.ts lowergamma, uppergamma and the regularized pair: the series or the fraction by cost, the rest in log space through the classifier
src/core/builtins/erf.ts  erf(x) and erfc(x) on the incomplete gamma functions of order one half, odd and complementary, the ends of the exponent apart
src/core/builtins/incbeta.ts incbeta and incbetareg: the series in the cheaper orientation of the symmetry, the rest in log space through the classifier, the polynomial exact case
src/core/table.ts         UnitTable, UnitFunction, ResolvedFunction, the lookup over it
src/core/build.ts         buildTable
src/core/evaluate.ts      evaluate, Lookup, applyFunction, invertFunction
src/core/convert.ts       convert, convertToList, roundTerms
src/core/pipeline.ts      convertText, evaluateText: the pipeline over text
src/core/result.ts        Result; each module defines its own error types
src/units.txt             the system definitions; src/units.test.ts checks them
src/testing/random.ts     the seeded random source the tests and benchmarks share: keys, split and folded in, every draw a pure function of one
src/testing/fraction.ts   parseFraction, roundFraction, formatFraction: the decimal representation over the fraction, for the tests that reason on fractions
src/testing/scaled.ts     dec, fr, exactDec, fraction, ball, digitsOf: a literal as a Scaled, a midpoint back to its fraction, a ball from decimals, for the tests of the ball and above
src/testing/edges.ts      the edge sweep's support: the worker under a deadline, the table of known violations, the loose arithmetic and the oracle's checks
src/core/edges.sweep.ts   the edge sweep at the ball level: every built-in and ball operation over the classes of arguments at the edges
src/edges.sweep.ts        the edge sweep at the text level: the pipeline and the display's steps on every issue's reproductions, in both modes
src/messages.ts           the errors as sentences; src/messages.test.ts checks them
src/system-table.ts       loadSystemDefinitions: fetches and parses the system definitions, once
src/system-build.ts       buildSystemTable: builds the system table at the ceiling in force, once per ceiling
src/settings.ts           Settings: the digits, the rounding mode, the exact or decimal mode and the two limits, in localStorage; contextOf
src/limits.ts             recommendLimits: the probe that measures the device and proposes the two limits
src/outcome.ts            outcomeOf: the lines the output area shows for a pair of texts, from the pipeline's result; src/outcome.test.ts checks them
src/unit-converter.ts     the component: the two inputs and the output area, rendering the outcome
src/app-shell.ts          the host: loads the table, renders the component
```

Each core module but the two smallest, span.ts and result.ts, has a
`*.test.ts` beside it, run by `pnpm test`.

Two more files are the edge sweeps, the fourth of the plan's test
patterns (docs/calculator-plan.md, "How to read a task"; the plan's
H.10), named `*.sweep.ts` and run by `pnpm test:sweep` rather than with
every edit, since they are conformance tests that grow with every
built-in (36,000 cases and about 35 s at the ball level after stage 6,
against ten seconds for the rest of the suite): they run before a commit and in CI,
and `pnpm test:all` runs the suite and the sweeps together (issue #108).
At the ball level, src/core/edges.sweep.ts runs every built-in of `BUILTINS`,
enumerated by arity so that a function added later joins it, and the
ball's own operations over the classes of arguments at the edges of the
number type: zero and the units, values at both ends of the exponent
bound and past the range limit's reach, a fraction mantissa at either
edge, a mantissa near one, and wide balls, each exact and with a relative
radius of about `1e-30`, in decimal mode too where an operation reads the
mode. At the text level, src/edges.sweep.ts runs `parseExpr`, `evaluateText`
and `convertText` on the reproductions of every issue filed against stage
4's code, in both modes, with `show` and `roundTerms` called as
outcome.ts calls them. Each case is checked for what this document
rules out: a throw; a refusal where the decisions allow none (`overflow`
or `underflow` only when every value of the true result passes the bound,
`tooLarge` only at a documented site, a domain error only for an argument
outside the domain throughout); a value whose midpoint's exponent or whose
`|mid| + rad` passes the bound; a value that misses a known point (`exp(0)`,
`approx(x)`, the exact result of a sum or a product) or a known range
(`|tanh| <= 1`); and, at the text level, an exact result past `maxBits`,
and a unit list whose shown terms do not add up to the `have`. The
magnitude of the true result is bounded in src/testing/edges.ts from the
arguments' intervals, exactly for the arithmetic and in log space for the
exponential and the powers, on bigint exponents near `±10^18` and never on
doubles. The known violations are a table keyed by issue and by the task
that fixes it: a violation the table does not list fails the sweep, and so
does a listed one that no case shows any more, so that a fix is never
silent. The cases run in a worker under a deadline, since node:test's
`timeout` cannot interrupt a synchronous test, and a case known to hang is
matched by name and not run; each case's time is reported, not asserted.
The ball level runs about 14,000 cases in under two seconds and the text
level about 270 in three.

## Benchmarks

The core has costs that a later change could quietly undo: the ambiguity
check is indexed so that it does not grow with the number of prefixes, and
the walker memoizes so that a definition is evaluated once however many
others refer to it. The benchmarks in `bench/` exist to catch such
regressions; README.md ("Benchmarks") says how and when to run them.

They are `*.bench.ts` files, run by `pnpm bench` through Node's test runner
and nothing else: no benchmark library, in keeping with the rule against
third-party dependencies. The suffix keeps them out of `pnpm test`, whose
default discovery never matches it, so the two are separate without a second
runner. `tsconfig.node.json` includes `bench/`, so they type-check with the
tests. The rest of the directory is what they share:

- `src/testing/random.ts` is the one seeded random source that the tests
  and the benchmarks share, purely applicative in the manner of JAX: a
  key is two 32-bit words, `split` and `foldIn` derive keys from a key,
  and every draw (`uniform`, `between`, `randomBigInt`, `randomRational`,
  `randomBall`) is a function of its key alone, the bits behind them
  threefry2x32 blocks under the key. So every run measures the same data,
  every property test draws its inputs the same way, the `i`-th input of a
  loop is the same whether drawn alone or in order, and no test carries a
  generator of its own. `bench/harness.ts` holds what only
  the benchmarks need: `word`, which draws a name from it, and `bestOf`,
  which times a function several times after one untimed run and takes
  the shortest, the estimate least disturbed by whatever else the machine
  is doing.
- `bench/synthetic.ts` builds tables of a chosen size. Prefix names are
  drawn from the letters `n` to `z` and unit names from `a` to `m`, so
  that no name is ambiguous and the ambiguity check scans everything: its
  cost when it finds nothing is its cost on a table that builds. The names
  are short, like real ones, so prefixes extend one another more often than
  real prefixes do, which makes the tables the hard case for the check. A
  synthetic definitions file has two primitives, the prefixes, and units
  that are each a small expression over one earlier unit, so that building
  it walks reference chains of the depth random references make and every
  body goes through the evaluator.

A timing in milliseconds depends on the machine, so a benchmark reports its
timings as diagnostics, for a person to compare between runs, and asserts
only how a cost scales between two sizes measured in the same run, which
holds anywhere. `names.bench.ts` asserts that the ambiguity check with 1076
prefixes costs at most five times the check with 76 (it costs about the
same; before the index it cost fifty times as much and failed), and with
12000 units at most eight times that with 3000 (the sort makes it a little
more than linear). `build.bench.ts` asserts that parsing and building 6000
units each cost at most eight times parsing and building 1500, since each
definition is parsed once and evaluated once; a walk that re-evaluated its
dependencies would cost more. The thresholds are twice the expected ratios,
so that noise never fails a benchmark that a regression would not fail by a
wide margin. It also reports, without asserting, the cost of a file the size
of the GNU units database, as a reference for the startup cost.
`kernel.bench.ts` times `pi` by Chudnovsky's series at 1,000, 10,000 and
100,000 digits and asserts that the last costs at most fifty times the
middle: binary splitting grows as V8's bigint multiplication does,
Karatsuba at these sizes, about 38 times per decade of digits at most,
where a series summed term by term would be quadratic and show a hundred;
the upper decade is asserted because its timings are well above the
timer's noise. It also times every routine of the kernel (the roots, `exp`,
the series of `e`, and each elementary function as it lands) at the
default ceiling of the retry schedule, the costliest pass an expression
that never certifies runs, and at a quarter of it, asserting that the
ceiling costs at most 64 times the quarter, twice what a series of linear
length over Karatsuba multiplication gives; the report is what the probe
of `limits.ts` chose its composite from, and it notes that the series of
`exp`, summed term by term, is the remaining candidate for the
rectangular splitting the logarithm, the sine and the arctangent use.
`rational.bench.ts` times the probe's range operation, a product of two
fractions and its reduction, at 8,192 to 65,536 bits, one gcd on its own
at 16,384 to 65,536 bits, and the quotients of issue #52, and asserts
that doubling the size costs at most eight times, twice what the
quadratic gcd gives; Lehmer's gcd is about forty times cheaper than
Euclid's at the default range limit and still quadratic, and the
benchmark is what would show a half-gcd's gain should the limit grow.

## Later

Planned extensions, listed to show that they fit without reshaping the core:

- **The rest of the calculator program.** docs/calculator.md weighs the
  special functions, a decimal mode, a rational display and richer
  user-defined functions, with the elementary functions that have landed,
  as one program toward an arbitrary-precision calculator under
  whole-expression precision in the manner of Arb, and
  docs/calculator-plan.md is the plan: stage 1 (the ball as the value, the
  context, the display rule and the settings), stage 2 (the kernel,
  settling, certification, the retry loop, the two limits and `pi`) and
  stage 3 (the built-in kind of function, calls with any number of
  arguments, the elementary set, the table at the ceiling and the
  logarithmic units) and stage 4 (the `Scaled` midpoint, the range of the
  inexact functions, the decimal mode and `approx`) have landed; the
  phase before stage 5, which fixes the issues open against stage 4's
  code, is next, and stage 5, the rational display, follows it.
- **Domain and range** on a function definition (`tempC(-300)` is a
  negative temperature today) are two optional bounds, checked at the call
  and at the inverse; docs/functions.md lists them with the other
  extensions of functions.
- **User definitions** are already supported by `buildTable`; only storage and
  an editor are missing.
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request) is a flag
  to `convert` that skips step 2 of the conformance check. Sums would keep
  the strict check: adding an angle to a plain number is a mistake whether
  or not the user asked to convert between them.
- **Symbolic values and complex numbers** are not planned, and would
  reshape the number type rather than fit around it; docs/future.md
  records what each would take and what keeps it possible, so that no
  design closes the door on them by accident.
