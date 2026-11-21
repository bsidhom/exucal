# On-ramp: numbers and quantities

Exucal computes every value as a `Ball`: a rational midpoint and a
bound on its error. Exact inputs stay exact under `+`, `-`, `*`, `/`
and integer powers. Every other result carries a rigorous error bound,
and the display says which digits the bound **certifies**: those that
every value within the bound rounds to. This is ball arithmetic, as in
[Arb](https://arblib.org/), with one change: the midpoint is a
rational, and it is rounded only once the value is inexact.

A `Quantity` pairs a ball with a dimension, a vector of exponents over
base quantities such as the meter. A unit is a name for a quantity, and
a conversion is one quotient of two quantities.

An expression is evaluated in **passes**. A pass computes everything at
one **working precision** $p$, a count of digits that sets how long its
inexact values are kept. A later pass has a larger $p$. The first pass
has $p = d + 10$, where $d$ is the **display digits**, the count of
digits asked for.

Eight types carry the design, in four layers. The **kernel** is the set
of integer routines that compute irrational values.

| Layer    | Type        | Is                                                     | Fields                            |
| -------- | ----------- | ------------------------------------------------------ | --------------------------------- |
| exact    | `Rational`  | an exact fraction                                      | `num`, `den`                      |
| exact    | `Scaled`    | a `Rational` times a power of ten, $m \cdot 10^{e}$    | `significand`, `exp`              |
| ball     | `Radius`    | a coarse bound: a 30-bit integer times a power of two  | `significand`, `exp`              |
| ball     | `Ball`      | a midpoint and its error bound, $c \pm r$              | `mid`, `rad`, `uncertified`       |
| kernel   | `Fixed`     | a ball in integers, $(v \pm \varepsilon) \cdot 2^{-k}$ | `value`, `error`, `bits`          |
| kernel   | `Floating`  | a `Fixed` times a power of two                         | `significand`, `exp`              |
| quantity | `Dimension` | a vector of rational exponents over the primitives     | a map from a name to a `Rational` |
| quantity | `Quantity`  | a ball with a dimension                                | `magnitude`, `dimension`          |

[Numbers and precision](numbers.md) is the full design of the numbers,
with the alternatives it rules out, and [Architecture](architecture.md)
has the rest. The built-in functions are out of scope here.

## The exact layer

### `Rational`

A `Rational` is a fraction of two `bigint` values in lowest terms, with
a positive denominator. Arithmetic is exact, at whatever length the
result needs.

### `Scaled`

A `Scaled` is a `Rational` $m$ times $10^{e}$, with a `bigint` $e$.
Every midpoint is a `Scaled`, and so is every exact value. The form is
**canonical**: a value $x \ne 0$ has exactly one,

$$e = \min(\nu_2(x), \nu_5(x)) \qquad m = x / 10^{e}$$

where $\nu_2$ and $\nu_5$ are the 2-adic and 5-adic valuations. Zero is
$0 \cdot 10^{0}$. Equivalently, $m$ is in lowest terms, its denominator
is coprime to ten, and its numerator is not divisible by ten. `2.54`,
`254/100` and `127/50` are all $254 \cdot 10^{-2}$, and `1/6` is
$\frac{5}{3} \cdot 10^{-1}$.

Four things follow:

- **Equality is structural.** Equal values have equal fields and equal
  cost, whatever computed them.
- **A finite decimal has an integer significand.** $x$ has a finite
  decimal expansion exactly when $m$ is an integer, and $m$ is then its
  digits.
- **Magnitude is free.** `1e999999999` is $1 \cdot 10^{999999999}$. A
  product adds exponents, and a quotient subtracts them. Comparison,
  rounding and formatting never form $10^{e}$.
- **Two things cost extra.** A sum must first align its operands: one
  significand is multiplied by ten to the gap between the exponents.
  And $2^{-n}$ is held as $5^{n} \cdot 10^{-n}$, about 2.32 times its
  binary length.

The exponent is decimal because the input and the output are decimal: a
literal enters exactly, and digits leave without a change of base.

## The ball layer

### `Radius`

A `Radius` is a coarse magnitude: a 30-bit integer times a power of
two, with a `bigint` exponent. It has two uses. The radius of a ball is
an upper bound on an absolute error. The **coarse bounds** of a
midpoint bracket its magnitude: one lies at or below it and one at or
above it, each within a relative $2^{-28}$. They are read from the
leading bits of $m$ and from $e$, so $10^{e}$ is never formed.

Every operation rounds to the safe side: up for a bound, and down for a
magnitude that a rule divides by. A radius is therefore always a true
bound, loosened by a relative $2^{-29}$ per sum, product or quotient.
Its length is fixed, so carrying it costs almost nothing.

Zero is the radius of an exact value. The value `unbounded` stands for
a bound that is not known, and nothing creates one.

### `Ball`

A `Ball` is a midpoint $c$, a `Scaled`, and a radius $r$, a `Radius`.
Its contract is that the true value $x$ satisfies
$\lvert x - c \rvert \le r$. A ball is **exact** when $r = 0$ and
**inexact** otherwise. In an expression, only two things create a
nonzero radius: an inexact function, and `approx`, the one operation
whose purpose is to make a value inexact.

An operation computes the midpoint exactly, on `Scaled`, and the radius
by a rule. For operands $a \pm r_a$ and $b \pm r_b$, let
$N = \lvert a \rvert r_b + \lvert b \rvert r_a$. Then:

$$r_{a \pm b} = r_a + r_b \qquad r_{ab} = N + r_a r_b \qquad r_{a/b} = \frac{N}{\lvert b \rvert (\lvert b \rvert - r_b)}$$

The proof writes the true values as $a + \alpha$ and $b + \beta$, with
$\lvert \alpha \rvert \le r_a$ and $\lvert \beta \rvert \le r_b$:

$$(a + \alpha)(b + \beta) - ab = a \beta + b \alpha + \alpha \beta \qquad \frac{a + \alpha}{b + \beta} - \frac{a}{b} = \frac{b \alpha - a \beta}{b (b + \beta)}$$

Here $\lvert b + \beta \rvert \ge \lvert b \rvert - r_b \gt 0$, since
the divisor's ball must exclude zero. So the result's ball contains the
true result for every pair of true values in the operands' balls. By
induction, every ball contains the true value of its expression.

The rules are evaluated on `Radius`, with every rounding on the safe
side. In $N$, $\lvert a \rvert$ and $\lvert b \rvert$ are upper coarse
bounds. In the divisor, $\lvert b \rvert$ is a lower one. With
$r_a = r_b = 0$ each rule gives zero, so exact operands give an exact
result.

Four rules complete the arithmetic:

- **Division.** A divisor that is exactly zero is the error
  `divisionByZero`. A divisor whose ball contains zero without being
  exactly zero is `unresolved`: the quotient has no bound, and a
  narrower ball might exclude zero.
- **Powers.** An integer power of an exact ball is the exact power. For
  an inexact ball it is the product rule under repeated squaring.
- **Comparison.** A ball lies below a point, lies above it or straddles
  it. An operation whose result depends on the side returns
  `unresolved` for a ball that straddles.
- **No correlation.** Each occurrence of a value is independent.
  `sqrt(2) - sqrt(2)` is $0 \pm 2r$, not an exact zero.

### Settling

The midpoint of an inexact ball is still an exact rational. Its length
doubles with each product, and nothing below $r$ carries information.
So every inexact result is **settled**. Its midpoint is rounded
half-even onto the **working grid**, the values with $p + 10$
significant digits. When that moves the midpoint, half a unit of the
last digit is added to $r$. An exact ball is never settled: it stays
exact, at whatever length.

## The kernel

### Why the kernel exists

No fraction holds an irrational value such as a root, an exponential or
a logarithm. Something must produce a midpoint for it and prove a
radius. That takes an iteration or a series: tens to hundreds of
multiplications at one precision. On balls, each of them would end in a
rounding onto a decimal grid, which is a long division.

The kernel does the same work on plain integers: one multiplication and
one shift per step, with the error bound as one more small integer.
Without that count the extra bits would be guard digits, which prove
nothing. The kernel is binary so that scaling is a shift. A value
changes base only where it enters or leaves, and exact arithmetic never
enters at all.

### `Fixed`

A `Fixed` has three fields: an integer `value` $v$, an integer `error`
$\varepsilon \ge 0$ and a count of fraction `bits` $k \ge 0$. Its
contract is that the true value $x$ satisfies
$\lvert x - v \cdot 2^{-k} \rvert \le \varepsilon \cdot 2^{-k}$. One
$2^{-k}$ is an **ulp**. A `Fixed` is a ball whose midpoint and radius
are integers, counted in ulps.

The point is fixed: nothing renormalizes, and $k$ changes only where a
routine says so. Operands are first brought to one $k$ by an exact
shift. Let
$M = \lvert v_a \rvert \varepsilon_b + \lvert v_b \rvert \varepsilon_a$.
Then:

| Operation     | `value`                                 | `error`                                                                               |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| $a \pm b$     | $v_a \pm v_b$                           | $\varepsilon_a + \varepsilon_b$                                                       |
| $ab$          | $\lfloor v_a v_b / 2^{k} \rfloor$       | $\lceil (M + \varepsilon_a \varepsilon_b) / 2^{k} \rceil + 1$                         |
| $a/b$         | $\operatorname{trunc}(2^{k} v_a / v_b)$ | $\lceil 2^{k} M / (\lvert v_b \rvert (\lvert v_b \rvert - \varepsilon_b)) \rceil + 1$ |
| drop $t$ bits | $\lfloor v / 2^{t} \rfloor$             | $\lceil \varepsilon / 2^{t} \rceil + 1$                                               |

The first three rows are the ball's rules with $a = v_a \cdot 2^{-k}$
and $r_a = \varepsilon_a \cdot 2^{-k}$, counted in ulps:

- The product's bound $N + r_a r_b$ is
  $(M + \varepsilon_a \varepsilon_b) \cdot 2^{-2k}$, which is
  $(M + \varepsilon_a \varepsilon_b) / 2^{k}$ ulps.
- The quotient's bound is a pure ratio, so it is multiplied by $2^{k}$
  to count ulps. It requires $\lvert v_b \rvert \gt \varepsilon_b$. The
  caller must establish that before it divides: a breach is a bug, and
  it throws.

Two roundings remain, and the count covers both. The count itself is
rounded up to an integer. The stored value is the exact result on the
midpoints, rounded down or toward zero. That moves it by less than one
ulp, which the final 1 covers. The product and the quotient add it only
when the rounding cut something.

A routine works on values of order one, so the count is a relative
error too. It grows by about one ulp per operation. A pass therefore
runs the kernel at $\lceil p \log_2 10 \rceil + 32$ bits. The 32 guard
bits are 9.6 digits, which round up to the ten of the working grid.
They are headroom and no part of the proof. When a routine spends more
of them, the count says so, fewer digits certify, and a later pass
makes up for it.

### Entering and leaving the kernel

- **In.** A ball $c \pm r$ becomes a `Fixed` at $k$ bits. $v$ is
  $c \cdot 2^{k}$ rounded to nearest. $\varepsilon$ counts one ulp for
  that rounding, when it moved the value, plus $r \cdot 2^{k}$ rounded
  up. The argument's radius is thus in the count from the first step. A
  series runs on the whole interval and needs no bound on a derivative.
- **Out.** $v \cdot 2^{-k}$ is rounded half-even onto the working grid.
  The radius is $\varepsilon \cdot 2^{-k}$, plus half a unit of the
  last digit when that rounding moved the value. An exact dyadic would
  cost $5^{k}$ in canonical form, and the result would be settled in
  any case.

A `Floating` is a `Fixed` significand with a `bigint` binary exponent,
under the same contract scaled by the power of two. It holds a result
such as `exp(1e6)`. The exponential keeps the significand between one
and two in magnitude, so no integer of the result's length is formed.
On the way out, a small exponent is folded back into a `Fixed`. A large
one becomes a decimal exponent and leading digits through the kernel's
own logarithm and exponential, with the error still counted
([The kernel's boundary](numbers.md#the-kernels-boundary)).

### The shape of a routine: the square root

Every routine has one shape: reduce the argument to order one, iterate
in integers, bound the error, scale back.

An exact case comes first and never enters the kernel: `sqrt(9/4)` is
$3/2$, found by integer square roots. Otherwise the reduction is exact
and free. The ball takes an even power of ten off the exponent. The
kernel then scales by a power of four, a move of the binary point, into
$[1, 4)$. Let $u$ be the reduced midpoint. Newton's iteration
$y \leftarrow y (3 - u y^{2}) / 2$ converges to $u^{-1/2}$ with
multiplications only, and $w = u y$ approximates the root.

The iteration is not trusted. Its result is checked. $w$ is squared,
and $D$ bounds $\lvert w^{2} - x \rvert$ for every $x$ in the
argument's interval: the difference found, one ulp for the squaring's
own rounding, and the argument's $\varepsilon$. Then

$$\lvert w - \sqrt{x} \rvert = \frac{\lvert w^{2} - x \rvert}{w + \sqrt{x}} \le \frac{D w}{2 w^{2} - D}$$

The identity with $\sqrt{x} \ge 0$ gives
$\lvert w - \sqrt{x} \rvert \le D/w$. So $\sqrt{x} \ge w - D/w$, and
the identity again gives the bound, for $D \lt 2 w^{2}$, which the code
checks.

For `sqrt(2)` at eight display digits, the first pass has $p = 18$. The
kernel returns a `Fixed` at 92 bits with two ulps of error. The ball
that leaves is $c = 1.414213562373095048801688724$, on the grid of 28
digits, with $r \approx 9.04 \cdot 10^{-28}$: the two ulps, plus half a
unit of the last digit.

## From a ball to digits

### Certification

A ball certifies the $d$ display digits, in a rounding mode, when
$c - r$ and $c + r$ round to the same value of $d$ digits. Rounding is
monotone, so every value in the ball rounds to that value. The digits
shown are then the true value's, correctly rounded. A small radius is
not enough: a ball that straddles a rounding boundary does not certify,
however narrow it is.

### The retry loop

Each pass after the first doubles $p$, and the last pass runs at the
**ceiling** $4 (L + 10)$. Here $L$ is the precision limit, the setting
that caps $d$. The ceiling is 4,040 at the default $L$ of 1,000. The
ten digits that the first pass adds to $d$ absorb the roundings of a
short expression, so that it certifies at once.

The loop ends at the first pass whose result is exact or certifies. A
result that certifies fewer digits is kept, and the next pass runs. The
next pass also runs after an `unresolved` error, and any other error
ends the loop. At its end the loop returns the best result it kept,
with a note that says how many digits certify, or the last error when
it kept none. The guarantee is thus on the whole expression: a later
pass recovers the digits that a cancellation loses.

On a line, `=` marks an exact value shown entire, and `≈` marks every
other value. At the default settings, with eight display digits:

| You type                  | Exucal shows       | Reason                                               |
| ------------------------- | ------------------ | ---------------------------------------------------- |
| `0.1 + 0.2`               | `= 0.3`            | exact, shown entire                                  |
| `1/3`                     | `≈ 0.33333333`     | exact, with more digits than shown                   |
| `sqrt(2)`                 | `≈ 1.4142136`      | inexact, certified on the first pass                 |
| `sqrt(2)^2 * 1.000000025` | `≈ 2`, with a note | a tie at eight digits: seven certify                 |
| `sqrt(2)^2 - 2`           | `≈ 0`, with a note | never certifies: within `4e-4049` of zero at the end |
| `1 / (sqrt(2)^2 - 2)`     | an error           | the divisor is `unresolved` at the ceiling           |

### Size limits

A value has two size limits. A result past either is a **refusal**.

- The **significand limit** $S$ bounds the bits of the numerator of $m$
  and the bits of its denominator. It is a setting, $2^{16}$ by default
  and at most $2^{20}$. An exact operation predicts the length of its
  result and forms nothing past $S$.
- The **exponent bound** keeps
  $\lfloor \log_{10} \lvert x \rvert \rfloor$ within $\pm 10^{18}$. It
  is fixed, and it is on the value, not on $e$.

A refusal is final. No pass retries it, and an exact value is never
rounded to make it fit. An inexact operand changes that, since the
result is inexact in any case. Where the exact step would pass $S$, the
operands are first rounded onto the working grid, and the rounding goes
into $r$. A sum that still cannot align keeps its larger operand and
adds the whole of the smaller one to $r$.

`approx(x)` is the way to ask for this. It widens $r$ to at least one
unit of the grid's last digit, never narrows it, and leaves a zero as
it is.

| You type                  | Exucal shows     | Reason                                     |
| ------------------------- | ---------------- | ------------------------------------------ |
| `1e999999999 + 1`         | a refusal        | the exact sum cannot be aligned within $S$ |
| `approx(1e999999999) + 1` | `≈ 1e+999999999` | the `1` goes into $r$                      |
| `10^1e19`                 | a refusal        | past the exponent bound                    |

### Decimal mode

The arithmetic above is **exact mode**, the default. **Decimal mode**
is a hand calculator's arithmetic. Each step's exact result is rounded
once, in the rounding mode, to a set number of digits, the display
digits by default. The rounded value is exact from then on, with
$r = 0$, so `1 / 3 * 3` is `= 0.99999999`. A call of a built-in is one
step: the passes run inside the step until its rounding certifies. A
call that never certifies is rounded at the ceiling and flagged
`uncertified`, the optional third field of a `Ball`.

### Failures

By design, a failure that input can cause is a `Result` error and never
an exception, such as a refusal, `unresolved`, `divisionByZero` or
`negativeRadicand`. A violated precondition throws, since it is a bug
in the caller. [Failures](numbers.md#failures) names the known
breaches.

## The quantity layer

### `Dimension`

The **definitions file** is a text file that the app loads as it
starts. It declares the **primitives**, base quantities such as `m`,
`kg` and `s`. A `Dimension` is a vector of rational exponents over
them, held as a map with the zeros left out. `N` is `kg m / s^2`, the
vector $(1, 1, -2)$ on `m`, `kg` and `s`.

Dimensions form a vector space over $\mathbb{Q}$. A product of two
quantities adds their vectors, a quotient subtracts them, and a power
multiplies the vector by the exponent. So `(1 m^2)^(1/2)` is exactly
`1 m`, and this arithmetic never fails. The exponents stay rational
because `^` reads its exponent from the text, as a number or a ratio of
two numbers, and never computes it.

A primitive has one of two roles. A **dimension primitive** is a base
quantity. A **kind primitive**, such as `radian`, is a marker with no
dimension of its own. It keeps apart quantities that the dimension
primitives cannot: an angle from a dimensionless quantity, and `rad/s`
from `Hz`. Both roles are coordinates of the one vector, and the
arithmetic does not tell them apart.

### `Quantity`

A `Quantity` is a `Ball`, its **scalar**, with a `Dimension`. The code
names the scalar `magnitude`. A quantity carries no unit. A **unit** is
a name that the definitions file gives to a quantity, and a quantity is
held in the primitives as soon as it is read. So `100 lb` and
`45.359237 kg` are one quantity: the scalar 45.359237 with the
dimension `kg`.

Each operation is a ball operation beside a dimension operation, and
only the ball operation can fail. Rounding touches the scalar alone, so
a dimension is exact in both modes.

A sum or a difference has one more requirement. Its operands must
**conform**: their vectors must be equal. The check compares the
dimension primitives first, and a difference there is a
**dimension mismatch**. It then compares the kind primitives, where a
difference is a **kind mismatch**. Zero is no exception: `0` is
dimensionless, so `1 m + 0` is a dimension mismatch.

| You type         | Into | Exucal shows     | Reason                |
| ---------------- | ---- | ---------------- | --------------------- |
| `2 kg * 3 m/s^2` |      | `= 6 m kg / s^2` | the vectors added     |
| `(1 m^2)^(1/2)`  |      | `= 1 m`          | the vector halved     |
| `1 m + 2 ft`     |      | `= 1.6096 m`     | operands that conform |
| `1 m + 1 s`      |      | an error         | a dimension mismatch  |
| `1 rad/s`        | `Hz` | an error         | a kind mismatch       |

### The definitions table

The definitions file gives every name its meaning, in six forms: a
primitive, a prefix, a unit, a unit list, a function and an inverse.
Seven of its lines show them, with the primitive in both roles:

```
m         !
radian    !kind
kilo-     1e3
in        2.54 cm
time      hr;min;s
tempC(x) | x >= -273.15 = x K + 273.15 K
~tempC(y) = y / K - 273.15
```

The **definitions table** is built from the file. A unit's body is an
expression, and its value is the quantity that the name stands for:
`in` is the scalar 0.0254 with the dimension `m`. A literal is read
exactly, so a unit is exact unless its definition goes through an
inexact function, as that of `deg` goes through `pi()`. The table is
built once, at the ceiling, so an inexact unit never holds a pass back.

A name is read as the unit of that name, and otherwise as one prefix
followed by a unit. So `min` is the minute, and `km` is a thousand
meters. A prefix is a dimensionless factor. Building the table fails
for a name that divides two ways, so no reading is ambiguous.

### Conversion

A conversion takes two quantities, the **have** and the **want**, which
must conform. Its answer is the ball quotient of the two scalars. No
factor is looked up, since both are held in the primitives. `3 ft` is
0.9144 and `in` is 0.0254, both with the dimension `m`, and the
quotient is exactly 36.

The form of the want selects the form of the answer:

- **One unit**, or any other expression, answers with that ratio. A
  want of exact zero is an error, and a want whose ball contains zero
  is `unresolved`.
- **A blank want** answers with the have in the primitives.
- **A unit list**, such as `ft;in`, answers with a sum. Its units must
  conform to the have, be positive and decrease. Each unit but the last
  gets a count: the quotient of what is left by the unit, truncated
  toward zero. A quotient whose ball straddles an integer takes that
  integer. The counts are exact integers. The last unit gets the
  remainder, a ball computed from what the counts leave, so the terms
  contain the have.
- **A function that has an inverse** answers with the call that gives
  the have.

The passes cover the conversion. The value that must certify is the
ratio, each term of a list, or the argument of the call.

| You type | Into    | Exucal shows            | Reason                                        |
| -------- | ------- | ----------------------- | --------------------------------------------- |
| `3 ft`   | `in`    | `= 36 in`               | an exact ratio                                |
| `1 m`    | `in`    | `≈ 39.370079 in`        | exactly 5000/127, with more digits than shown |
| `1 in`   |         | `= 0.0254 m`            | a blank want                                  |
| `1 m`    | `ft;in` | `≈ 3 ft + 3.3700787 in` | a count and a remainder                       |
| `300 K`  | `tempF` | `= tempF(80.33)`        | a function as the want                        |

### Functions

A unit acts by multiplication, so a scale with an offset is not a unit.
A Celsius reading is such a scale: zero degrees is not zero kelvin. It
is a **defined function** instead, a body with parameters, as `tempC`
is above with its condition and its inverse. A call evaluates the body
with the parameters bound to the arguments, and its result is a
quantity like any other.

A function may declare three more things:

- An **annotation** on a parameter is a unit that the argument must
  conform to. Without one, the argument must be dimensionless.
- A **condition** is a comparison that the arguments must meet. A
  comparison of balls holds, fails or is undecided. An undecided
  condition is assumed to hold, and the next pass tries again. At the
  ceiling the result carries a warning.
- An **inverse** recovers the argument from the value. It is written by
  hand, and nothing checks at the build that it undoes the function.

A conversion into a function therefore checks its own answer. It
computes the **recovered argument** by the inverse and applies the
function to it. A result that is certainly other than the have is an
error. Two balls that overlap refute nothing, so the check catches a
wrong inverse and proves no inverse right.

A **built-in** pairs a function on balls with a rule on dimensions:
`sin` takes an angle, and `abs` keeps the dimension of its argument.

## Where each part lives

The code is in `src/core/`. The arithmetic on balls takes a
`NumberContext`: the working precision, the rounding mode, the
significand limit, the ceiling and the mode. The tests of `radius.ts`,
`ball.ts` and `fixed.ts` check each rule by containment, with exact
rational arithmetic. [Quantities](../docs/quantities.md) states the
rules of the quantity layer as a user meets them.

| Part                            | Code                                     | Design                                                                                                               |
| ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Rational`                      | `rational.ts`                            | [The types](numbers.md#the-types), [Exact operations](numbers.md#exact-operations)                                   |
| `Scaled`                        | `scaled.ts`                              | [The types](numbers.md#the-types), [Sums and alignment](numbers.md#sums-and-alignment)                               |
| `Radius`                        | `radius.ts`                              | [Error bounds for the four operations](numbers.md#error-bounds-for-the-four-operations)                              |
| `Ball`, settling, certification | `ball.ts`                                | [Settling](numbers.md#settling), [Certification and the display rule](numbers.md#certification-and-the-display-rule) |
| `Fixed`, `Floating`, the roots  | `fixed.ts`, `digits.ts`                  | [The kernel's boundary](numbers.md#the-kernels-boundary), [Roots and powers](numbers.md#roots-and-powers)            |
| The passes                      | `context.ts`, `pipeline.ts`              | [Working precision and the schedule](numbers.md#working-precision-and-the-schedule)                                  |
| The limits                      | `rational.ts`, `scaled.ts`, `context.ts` | [The significand limit](numbers.md#the-significand-limit), [The exponent bound](numbers.md#the-exponent-bound)       |
| Decimal mode                    | `ball.ts`                                | [Decimal mode](numbers.md#decimal-mode)                                                                              |
| `Dimension`, conformance        | `dimension.ts`                           | [Quantities, dimensions and kinds](architecture.md#quantities-dimensions-and-kinds)                                  |
| `Quantity`                      | `quantity.ts`                            | [The arithmetic on quantities](architecture.md#the-arithmetic-on-quantities)                                         |
| The definitions table           | `table.ts`, `build.ts`, `names.ts`       | [Definitions](architecture.md#definitions)                                                                           |
| Conversion, unit lists          | `convert.ts`, `pipeline.ts`              | [Conversion](architecture.md#conversion)                                                                             |
| Functions                       | `evaluate.ts`, `builtin.ts`              | [Defined functions](functions.md), [Built-in functions](builtins.md)                                                 |
