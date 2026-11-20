# On-ramp: the numeric core

Exucal computes every value as a `Ball`: an exact rational midpoint and
a bound on its error. Exact inputs stay exact under `+`, `-`, `*`, `/`
and integer powers. Every other result carries a rigorous error bound,
and the display shows the digits that the bound certifies. This is ball
arithmetic, as in [Arb](https://arblib.org/), except that the midpoint
is an exact rational and not a rounded float.

Six types carry the design, in three layers. The first four form a
ladder: each adds one idea to the type before it. The last two belong
to the **kernel**, the integer routines that compute irrational values.

| Layer  | Type       | Denotes                            | Fields                   | Adds                        |
| ------ | ---------- | ---------------------------------- | ------------------------ | --------------------------- |
| exact  | `Rational` | $p/q$                              | `num`, `den`             | an exact fraction           |
| exact  | `Scaled`   | $m \cdot 10^{e}$                   | `significand`, `exp`     | a power of ten, held apart  |
| ball   | `Radius`   | $s \cdot 2^{j}$                    | `significand`, `exp`     | a cheap upper bound         |
| ball   | `Ball`     | $c \pm r$                          | `mid`, `rad`             | an error bound on a value   |
| kernel | `Fixed`    | $(v \pm \varepsilon) \cdot 2^{-k}$ | `value`, `error`, `bits` | the kernel's number         |
| kernel | `Floating` | $f \cdot 2^{j}$, $f$ a `Fixed`     | `significand`, `exp`     | a kernel result of any size |

[Numbers and precision](numbers.md) is the full design, with the
alternatives it rules out. Two things built on the ball are out of
scope here: the built-in functions, and quantities, which pair a ball
with a dimension.

## The ladder

### `Rational`

A `Rational` is $p/q$ for `bigint` $p$ and $q$, with $q \gt 0$ and
$\gcd(p, q) = 1$. Equal values have equal fields. Arithmetic is exact,
and nothing here bounds the length of $p$ and $q$. The significand
limit does ([Size limits](#size-limits)).

### `Scaled`

A `Scaled` is a `Rational` $m$ times $10^{e}$, with a `bigint` $e$.
Every midpoint is a `Scaled`, and so is every exact value. The form is
**canonical**, one per value. For $x \ne 0$:

$$e = \min(\nu_2(x), \nu_5(x)) \qquad m = x / 10^{e}$$

Here $\nu_p(x)$ is the exponent of the prime $p$ in $x$, and zero is
$0 \cdot 10^{0}$. Equivalently, $m$ is in lowest terms, its denominator
is coprime to ten, and its numerator is not divisible by ten. `2.54`,
`254/100` and `127/50` are all $254 \cdot 10^{-2}$, and `1/6` is
$\frac{5}{3} \cdot 10^{-1}$.

Five things follow:

- **Equality is structural.** Equal values have equal fields and equal
  cost, whatever computed them.
- **A decimal is an integer.** $x$ has a finite decimal expansion
  exactly when $m$ is an integer, and $m$ is then its digits. So a
  literal enters exactly.
- **Magnitude is free.** `1e999999999` is $1 \cdot 10^{999999999}$. A
  product adds exponents, and a quotient subtracts them. Comparison,
  rounding and formatting never form $10^{e}$.
- **A sum must align.** One significand is multiplied by
  $10^{\lvert \Delta e \rvert}$, the gap between the two exponents.
  `1e999999999 + 1` is an exact value too long to hold.
- **A power of two in a denominator costs extra.** $2^{-n}$ is held as
  $5^{n} \cdot 10^{-n}$, about 2.32 times its binary length.

The exponent is decimal because literals, the display and decimal mode
are decimal. Only the kernel is binary.

Two readings of a magnitude never form $10^{e}$. The **decimal
exponent** $\lfloor \log_{10} \lvert x \rvert \rfloor$ is exact. The
**coarse bounds** are a lower and an upper bound on
$\log_2 \lvert x \rvert$, about $2^{-30}$ apart, read from the leading
bits of $m$.

### `Radius`

A `Radius` is an upper bound on an absolute error: a 30-bit integer
times a power of two, with a `bigint` exponent. Zero is the radius of
an exact value, and `unbounded` says that no bound is known.

Every operation rounds toward safety: up, or down where a lower bound
is needed, as in a divisor. A radius is therefore always a true bound,
loosened by a relative $2^{-29}$ per operation. Its length is fixed, so
carrying it costs almost nothing. Its exponent is a `bigint` because a
radius spans the range of the values themselves, far beyond a float64.

### `Ball`

A `Ball` is a midpoint $c$, a `Scaled`, and a radius $r$, a `Radius`.
Its contract is that the true value $x$ satisfies
$\lvert x - c \rvert \le r$. A ball is **exact** when $r = 0$ and
**inexact** otherwise. Only two things create a nonzero radius: an
inexact function, which the kernel computes, and `approx`, the one
operation whose purpose is to make a value inexact.

An operation computes the midpoint exactly, on `Scaled`, and the radius
by a rule. For operands $a \pm r_a$ and $b \pm r_b$, let
$N = \lvert a \rvert r_b + \lvert b \rvert r_a$. Then:

$$r_{a \pm b} = r_a + r_b \qquad r_{ab} = N + r_a r_b \qquad r_{a/b} = \frac{N}{\lvert b \rvert (\lvert b \rvert - r_b)}$$

The proof writes the true values as $a + \alpha$ and $b + \beta$, with
$\lvert \alpha \rvert \le r_a$ and $\lvert \beta \rvert \le r_b$:

$$(a + \alpha)(b + \beta) - ab = a \beta + b \alpha + \alpha \beta \qquad \frac{a + \alpha}{b + \beta} - \frac{a}{b} = \frac{b \alpha - a \beta}{b (b + \beta)}$$

Here $\lvert b + \beta \rvert \ge \lvert b \rvert - r_b \gt 0$, since
the divisor's ball must exclude zero. So a result contains $f(x, y)$
for every $x$ and $y$ in its operands. By induction, every ball
contains the true value of its expression.

The rules are evaluated on `Radius` so that every approximation errs
upward. $\lvert a \rvert$ and $\lvert b \rvert$ come from the upper
coarse bound in $N$ and from the lower one in the divisor. With
$r_a = r_b = 0$ each rule gives zero, so exact operands give an exact
result.

Four rules complete the arithmetic:

- **Division.** A divisor that is exactly zero is `divisionByZero`. A
  divisor whose ball contains zero without being exactly zero is
  `unresolved`: the quotient has no bound, and a narrower ball might
  exclude zero.
- **Powers.** An integer power of an exact ball is the exact power. For
  an inexact ball it is the product rule under repeated squaring.
- **Comparison.** A ball lies below a point, lies above it or straddles
  it. An operation whose result depends on the side returns
  `unresolved` for a ball that straddles. It never guesses.
- **No correlation.** Each occurrence of a value is independent.
  `sqrt(2) - sqrt(2)` is $0 \pm 2r$, not an exact zero.

### Settling

The midpoint of an inexact ball is still an exact rational. Its length
doubles with each product, and nothing below $r$ carries information.
So every inexact result is **settled**. Its midpoint is rounded
half-even onto the **working grid**, the values with $p + 10$
significant digits, and half a unit of the last digit is added to $r$.
Here $p$ is the **working precision**, a count of digits that the
evaluation runs at ([The retry loop](#the-retry-loop)).

An exact ball is never settled. Exact values stay exact and may grow.
Inexact midpoints stay short.

## The kernel

### Why the kernel exists

No fraction holds an irrational value such as a root, an exponential or
a logarithm. Something must produce a midpoint for it and prove a
radius. That takes an iteration or a series: hundreds or thousands of
multiplications at one precision. On the ladder, each multiplication
would need a rounding onto a decimal grid, which is a long division,
and a radius update. Left unrounded, the fractions would double in
length each time.

The kernel does the same work on plain integers: one multiplication and
one shift per step, with the error bound as one more small integer. It
is binary so that scaling is a shift. A value changes base only where
it enters or leaves, and exact arithmetic never enters at all.

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
$N = \lvert v_a \rvert \varepsilon_b + \lvert v_b \rvert \varepsilon_a$.
Then:

| Operation     | `value`                                 | `error`                                                                               |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| $a \pm b$     | $v_a \pm v_b$                           | $\varepsilon_a + \varepsilon_b$                                                       |
| $ab$          | $\lfloor v_a v_b / 2^{k} \rfloor$       | $\lceil (N + \varepsilon_a \varepsilon_b) / 2^{k} \rceil + 1$                         |
| $a/b$         | $\operatorname{trunc}(2^{k} v_a / v_b)$ | $\lceil 2^{k} N / (\lvert v_b \rvert (\lvert v_b \rvert - \varepsilon_b)) \rceil + 1$ |
| drop $t$ bits | $\lfloor v / 2^{t} \rfloor$             | $\lceil \varepsilon / 2^{t} \rceil + 1$                                               |

The first three rows are the ball's rules with $a = v_a \cdot 2^{-k}$
and $r_a = \varepsilon_a \cdot 2^{-k}$, counted in ulps:

- The product's bound is
  $(N + \varepsilon_a \varepsilon_b) \cdot 2^{-2k}$, which is
  $(N + \varepsilon_a \varepsilon_b) / 2^{k}$ ulps.
- The quotient's bound is a pure ratio, so it is multiplied by $2^{k}$
  to count ulps. It requires $\lvert v_b \rvert \gt \varepsilon_b$,
  which the ball layer checks before it calls the kernel.

Two roundings remain, and both err upward. A ceiling keeps each count
an integer. The stored value is the exact result on the midpoints,
rounded down or toward zero. That moves it by less than one ulp, which
the final 1 covers. The product and the quotient add it only when the
rounding cut something. Dropping bits is that rounding alone.

A routine works on values of order one, so the count is a relative
error too. It grows by about one ulp per operation, and a series of a
thousand terms loses about ten bits. A pass at working precision $p$
therefore runs the kernel at $\lceil p \log_2 10 \rceil + 32$ bits, of
which 32 are guard bits.

An integer count is the cheapest design that still gives a proof. A
ball at every step costs a radius operation per step. Two endpoints
cost twice the arithmetic. Guard digits alone prove nothing.

### Entering and leaving the kernel

- **In.** A ball $c \pm r$ becomes a `Fixed` at $k$ bits. $v$ is
  $c \cdot 2^{k}$ rounded to nearest. $\varepsilon$ counts one ulp for
  that rounding, when it moved the value, plus
  $\lceil r \cdot 2^{k} \rceil$. The argument's radius is thus in the
  count from the first step. A series runs on the whole interval and
  needs no bound on a derivative.
- **Out.** $v \cdot 2^{-k}$ is rounded half-even onto the working grid.
  The radius is $\varepsilon \cdot 2^{-k}$ plus half a unit of the last
  digit, rounded up. An exact dyadic would cost $5^{k}$ in canonical
  form, and the result would be settled in any case.

A `Floating` is a `Fixed` in $[1, 2)$ times a power of two, with a
`bigint` exponent, for a result such as `exp(1e6)`. The routine keeps
the significand in that range as it runs, so no integer of the result's
full length is formed. A `Floating` leaves exactly where its power of
two can be formed, and through its decimal logarithm otherwise, with
the error still counted.

### The shape of a routine: the square root

Every routine has one shape: reduce the argument exactly to order one,
iterate in integers, bound the error, scale back.

An exact case comes first and never enters the kernel: `sqrt(9/4)` is
$3/2$, by the integer roots of the numerator and the denominator.
Otherwise the argument $a$ is scaled by an exact power of four into
$[1, 4)$. Newton's iteration $y \leftarrow y (3 - a y^{2}) / 2$
converges to $a^{-1/2}$ with multiplications only, and $w = a y$ is the
root.

The iteration is not trusted. Its result is checked. $w$ is squared,
and $D$ bounds $\lvert w^{2} - a \rvert$ over the argument's whole
interval: the difference found, one ulp for the squaring's own
rounding, and the argument's $\varepsilon$. Then

$$\lvert w - \sqrt{a} \rvert = \frac{\lvert w^{2} - a \rvert}{w + \sqrt{a}} \le \frac{D w}{2 w^{2} - D}$$

since $\sqrt{a} \ge w - D/w$. A root of any degree is verified the same
way: the result is raised back to the power under the product rule. The
proof never depends on how the iteration converged.

For `sqrt(2)` at eight display digits, the first pass has $p = 18$. The
kernel returns a `Fixed` at 92 bits with two ulps of error. The ball
that leaves is $c = 1.414213562373095048801688724$, on the grid of 28
digits, with $r \approx 9.04 \cdot 10^{-28}$.

## From a ball to digits

### Certification

A ball **certifies** $d$ digits in a rounding mode when $c - r$ and
$c + r$ round to the same value of $d$ digits. Rounding is monotone, so
every value in the ball rounds to that value. The digits shown are then
the true value's, correctly rounded. A small radius is not enough: a
ball that straddles a rounding boundary does not certify, however
narrow it is.

### The retry loop

The whole expression is evaluated in **passes** at a rising working
precision $p$. The first pass has $p = d + 10$, where $d$ is the
**display digits**, the count of digits asked for. Each later pass
doubles $p$, up to the **ceiling** $4 (L + 10)$. Here $L$ is the
precision limit, the setting that caps $d$. The ceiling is 4,040 at the
default $L$ of 1,000.

The loop ends at the first pass whose result is exact or certifies $d$
digits. An `unresolved` result goes to the next pass. At the ceiling
the loop returns what it has: a line that says how many digits certify,
or the `unresolved` error. The guarantee is on the whole expression: a
later pass pays for the digits that a cancellation cost.

On a line, `=` marks an exact value shown entire, and `≈` marks every
other value. At the default settings:

| You type                  | Exucal shows                                   | Reason                                  |
| ------------------------- | ---------------------------------------------- | --------------------------------------- |
| `0.1 + 0.2`               | `= 0.3`                                        | exact, shown entire                     |
| `1/3`                     | `≈ 0.33333333`                                 | exact, with more digits than shown      |
| `sqrt(2)`                 | `≈ 1.4142136`                                  | inexact, certified on the first pass    |
| `sqrt(2)^2 * 1.000000025` | `≈ 2 (7 of 8 digits are certified)`            | the true value is a tie at eight digits |
| `sqrt(2)^2 - 2`           | `≈ 0 (within 4e-4049 of zero)`                 | never certifies, so every pass runs     |
| `1 / (sqrt(2)^2 - 2)`     | an error: the divisor cannot be told from zero | `unresolved` at the ceiling             |

### Size limits

Two limits bound a value. A result past either is a **refusal**.

- The **significand limit** $S$ bounds the bits of the numerator of $m$
  and the bits of its denominator. It is a setting, $2^{16}$ by default
  and at most $2^{20}$. An exact operation predicts the length of its
  result and forms nothing past $S$.
- The **exponent bound** keeps the decimal exponent within
  $\pm 10^{18}$. It is fixed.

A refusal is final: no pass retries it, and exact mode never rounds an
exact value to make it fit. An inexact operand changes that. The result
is inexact in any case, so where the exact step would pass $S$, the
operands are first rounded onto the working grid, and the rounding goes
into $r$. `approx(x)` is the way to ask for it: it widens $r$ to one
unit of the grid's last digit and never narrows it.

The limits meet in one relation,
$2 (\lceil 4 (L + 10) \log_2 10 \rceil + 32) \le S$, so that two
midpoints settled at the ceiling multiply within $S$.

| You type                  | Exucal shows                                    |
| ------------------------- | ----------------------------------------------- |
| `2^65535`                 | `≈ 1.001765e+19728`                             |
| `2^65536`                 | a refusal: past the significand limit           |
| `1e999999999 + 1`         | a refusal: the sum cannot be aligned within $S$ |
| `approx(1e999999999) + 1` | `≈ 1e+999999999`, the `1` absorbed into $r$     |
| `10^1e19`                 | a refusal: too large to compute                 |

### Decimal mode

**Decimal mode** is the second arithmetic, a hand calculator's. Each
step's exact result is rounded once, in the rounding mode, to a set
number of digits. It is exact from then on, with $r = 0$. A call of a
built-in is one step: the retry schedule runs inside the step until the
rounding certifies. A call that never certifies is rounded at the
ceiling and flagged `uncertified`, the third field of a `Ball`.
`1 / 3 * 3` is `= 0.99999999` there.

### Failures

A failure that input can cause is a `Result` error and never an
exception: a refusal, `unresolved`, `divisionByZero` or
`negativeRadicand`. A violated precondition throws, since it is a bug
in the caller.

## Where each part lives

The code is in `src/core/`. The arithmetic on balls takes a
`NumberContext`: the working precision, the rounding mode, the limits
and the mode. The tests of `radius.ts`, `ball.ts` and `fixed.ts` check
each rule by containment, with exact rational arithmetic.

| Part                            | Code                        | Design                                                                                                               |
| ------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Rational`                      | `rational.ts`               | [The types](numbers.md#the-types), [Exact operations](numbers.md#exact-operations)                                   |
| `Scaled`                        | `scaled.ts`                 | [The types](numbers.md#the-types), [Sums and alignment](numbers.md#sums-and-alignment)                               |
| `Radius`                        | `radius.ts`                 | [Error bounds for the four operations](numbers.md#error-bounds-for-the-four-operations)                              |
| `Ball`, settling, certification | `ball.ts`                   | [Settling](numbers.md#settling), [Certification and the display rule](numbers.md#certification-and-the-display-rule) |
| `Fixed`, `Floating`, the roots  | `fixed.ts`, `digits.ts`     | [The kernel's boundary](numbers.md#the-kernels-boundary), [Roots and powers](numbers.md#roots-and-powers)            |
| The passes                      | `context.ts`, `pipeline.ts` | [Working precision and the schedule](numbers.md#working-precision-and-the-schedule)                                  |
| The limits                      | `rational.ts`, `scaled.ts`  | [The significand limit](numbers.md#the-significand-limit), [The exponent bound](numbers.md#the-exponent-bound)       |
| Decimal mode                    | `ball.ts`                   | [Decimal mode](numbers.md#decimal-mode)                                                                              |
