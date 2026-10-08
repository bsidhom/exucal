# Future extensions, and what is ruled out

Notes on extensions that are not goals now, kept so that no design
closes the door on them by accident, and on the ones that are ruled
out, so that nobody designs them twice. The first two entries, symbolic
values and complex numbers, would reshape the number type: each says
what the extension is, why it is not pursued, what it would take, and
what in the current design keeps it possible, and a design that touches
the number type should read them first. "Extensions that fit" lists the
ones that fit around the core as it is, with the issues that carry
them. The pages of the parts that exist record their own non-intent:
[builtins.md](builtins.md), [functions.md](functions.md),
[notation.md](notation.md) and [architecture.md](architecture.md)
("UI") each have a "Not in this design".

## Symbolic values

**What.** Keeping a value exact through the irrational steps that
algebra can keep exact, so that zeros and equalities survive as late
into an evaluation as possible: `sqrt(2)^2 - 2` is `= 0`,
`sqrt(8) / sqrt(2)` is `= 2`, `turn` into `deg` is `= 360`,
`sin(pi()/6)` is `= 1/2`, and `exp(1)^2 / exp(2)` is `= 1`. The value
goes to digits only when a step that no bounded algebra keeps exact
forces it (`exp(sqrt(2))`, `ln(3)`, `gamma(1/3)`), and from the exact
form, so that nothing has been lost before that step. The goal is final
precision, not a symbolic calculator: a certified `= 0` where the
numeric model can only say `≈ 0` with a bound, and a cancellation that
costs nothing where the numeric model pays for it with a retry at
higher precision.

**Why not now.** The design is a numeric model, whole-expression
precision over balls ([numbers.md](numbers.md)), in which `sqrt(2)` and
`pi()` are digits at the working precision and `sqrt(2)^2 - 2` is a
ball around zero. The numeric model already gives correct digits, and
where a rounded value cancels, a conservative `≈` rather than a false
`=`. The symbolic layer is the one way to a certified zero, and it is
real work: canonical forms, the simplification that keeps them
canonical, and tables of the exact cases of the functions. It belongs
on top of the numeric model, which it falls back on.

**What it would take**, in the bounded form worth having: a symbolic
midpoint that is a sum of rational multiples of monomials, each
monomial a product of prime radicals with rational exponents
(`2^(1/2)`, `3^(-1/3)`) and integer powers of the transcendental
symbols `pi` and `e`. That form is closed under sums, products and
integer powers, and under roots of a monomial (a root of a sum is not a
monomial and goes to digits, or stays a root over a sum if the layer is
taken further). It has a canonical form, so equality is a comparison,
not a search: like monomials combine, a monomial's exponents are
reduced so that the rational part is factored out, and a sum is zero
exactly when every coefficient is. Simplification is that normalization
and nothing more. Three facts make the form sound. Radicals of distinct
prime powers are linearly independent over the rationals, so a sum of
radical monomials is zero only when its coefficients are. `pi` and `e`
are each transcendental, so a rational function of either alone
vanishes only when it does formally. Their algebraic independence from
each other is conjectured (it follows from Schanuel's conjecture) and
not proven, so a value that mixes `pi` and `e` is exact on that
assumption, and the design should say so; a case where the assumption
fails would be a theorem nobody has.

Division by a sum needs the denominator rationalized, which the norm
over the radicals gives for a pure radical sum and which has no general
form with `pi` and `e` in it, so the layer decides once where division
goes to digits. The radicand of a root has to be factored into primes,
which trial division does for the sizes that occur in practice, and a
radicand it cannot factor goes to digits, as does anything past a bound
on the number of terms. The functions gain exact cases on symbolic
arguments: `exp` of a rational is a monomial in `e`; `ln` of a monomial
in `e` is rational; `sin`, `cos` and `tan` at a rational multiple of
`pi` with a small denominator come from a table of the values in
radicals (`sin(pi/6)`, `sin(pi/4)`, `cos(pi/5)`); `sqrt` and the other
roots of a monomial are monomials. Everything else evaluates the
symbolic argument to a ball at the working precision and proceeds
numerically. A further symbol set (`ln 2`, `ln 3`, `sqrt(pi)`) could be
adjoined the same way, and is where "not a symbolic calculator" draws
the line.

The ratio notation ([notation.md](notation.md)) extends to write a
symbolic value as it is (`sqrt(2)/2`, `pi/6`, `2 e`); the decimal
display is unchanged. The angle units, all rational multiples of `pi`,
become exact, and the conservative `≈` the design accepts for `turn`
into `deg` goes away; `(2 m^2)^(1/2)` becomes exactly `sqrt(2) m`.

**What keeps it possible.** The magnitude is one type behind one
module. An exact value is a ball of radius zero whatever its midpoint
holds, so a symbolic value is such a ball with a richer midpoint, and
nothing downstream of the magnitude changes; the retry loop, which
re-evaluates from the expression, would re-evaluate a symbolic value to
any precision on demand. `root` already detects the exact rational
cases, which is the degenerate form of the radical monomial. `pi()` and
`exp` are built-in functions, so they can return a symbolic value under
a setting and digits otherwise, with no change to the grammar or the
definitions file. The ratio notation already has the rule "exact, so
write it as it is" that `sqrt(2)/2` extends. What would change: the
midpoint type gains a symbolic kind, every exact operation gains a case
for it and a rule for when it gives up, the kernel's exact-case
detection consults the tables, and the radicand factoring joins the
kernel.

## Complex numbers

**What.** Values with an imaginary part, so that `sqrt(-1)` is `i`,
`ln(-1)` is `i pi`, `exp(i pi())` is a ball around `-1`, and a phasor
such as `230 exp(i pi()/4) V` is a quantity like any other.

**Why not now.** Every built-in would need a complex implementation
beside its real one (branch cuts for `ln`, `sqrt` and the inverse
trigonometric functions; `gamma` off the real line), the display needs
a form for `3 + 4i`, and there is no complex use in sight. So an
argument outside a function's real domain is a domain error, which is
what a real-only calculator should do.

**What it would take.** The ball becomes a complex ball, a real and an
imaginary ball, as Arb's `acb` is beside its `arb`; the exact
operations extend to it, and each built-in gets its complex form and
propagation rule. The parser gains `i`, which is not a unit name today,
or a built-in `i()`. The number context gains a switch, so that
`sqrt(-1)` stays a domain error unless complex results are allowed. The
display writes `a + bi`, and the ratio notation writes both parts.
Dimensions are untouched: a complex magnitude carries a dimension as a
real one does, and conformance never looks at the magnitude. What has
no complex meaning stays real-only and reports an error on a complex
argument: the order comparisons, so a unit list (`ft;in`) needs a real
value; `floor` and its kin; the inverse of a defined function as a
want.

**What keeps it possible.** The magnitude behind one module, and the
ball with radius zero for exact values. The built-ins as a table of
native implementations with dimension rules, to which a complex
implementation is a second field. Domain errors as `Result` values
that a mode can turn into values. Conformance and dimensions
independent of the magnitude. What would change: the midpoint type,
the kernel's primitive operations, every built-in, and the display.

## Extensions that fit

Each of these fits without reshaping the core, and the issues carry
them:

- **A responsive interface whatever an evaluation costs.** Every
  keystroke runs the pipeline on the main thread, and the catalogue of
  [cost.md](cost.md) lists the expressions that freeze it for seconds
  or hang it. Moving the evaluation off the main thread, with the
  cases of the catalogue as the measure, is [#118][118], with
  [#119][119] to [#121][121] for its parts: interactive results at a
  reduced precision, finalized at full precision after a debounce; the
  finalization in a web worker above a threshold; and the slow,
  separable computations such as the Bernoulli run in a worker.
- **Cheaper kernels.** The incomplete beta function ([#150][150]), the
  incomplete gamma functions and the error functions ([#149][149],
  [#107][107] at a large order past the argument), the Gamma family's shift at an
  inexact argument ([#125][125]) head the catalogue, and the Bernoulli memo's footprint is
  [#103][103]; the hangs at a raised precision limit are
  [#151][151] and at the hard bound [#152][152]. One declarative
  language for each function's own switch points (the Gamma family's
  exact shift against its loop, the incomplete gamma's series against
  its fraction, `tanh`'s saturation, a power's three routes), built from
  reusable measures, is [#126][126].
- **More special functions.** The eight special functions deferred when
  the Gamma and Beta families landed are [#115][115]
  ([builtins.md](builtins.md), "Not in this design", says which were
  ruled out instead).
- **More of the user functions** ([functions.md](functions.md),
  "Deferred"): a bare call's value shown in its function's result
  annotation ([#130][130]); the shadowing error in a head relaxed to a
  warning ([#131][131]); definitions typed into the converter
  ([#132][132]); and dimension-generic functions, with type bounds on
  their variables ([#133][133]), for which the parser already reserves
  `name[`. A function's result is never checked against a range, since
  nothing would act on it; whether ranges could instead narrow a
  result's ball is studied in [#134][134].
- **User definitions** are already supported by `buildTable`, which
  takes one list of definitions; only storage and an editor are
  missing, and [#132][132] is the first step.
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request)
  is a flag to `convert` that skips the second step of the conformance
  check. Sums would keep the strict check: adding an angle to a plain
  number is a mistake whether or not the user asked to convert between
  them.
- **Richer UX** is new components that edit the same two strings or
  read the table ([architecture.md](architecture.md), "Messages"):
  autocomplete, unit buttons, highlighting from error spans.

## Ruled out, and why

- **A float with a rational significand as a third number type.**
  Subsumed: unbounded, it is the exact rational with its power of ten;
  bounded, it is decimal mode, since rationals of bounded denominator
  are not closed under addition (`1/3 + 1/7` is `10/21`), so rounding a
  rational significand to a nearby rational of bounded size would be a
  continued-fraction step that no rounding mode describes and no
  calculator's user expects, and the significand the rounding modes are
  defined for is an integer of at most `p` decimal digits
  ([numbers.md](numbers.md), "Decimal mode").
- **Binary floats or a configurable radix.** Decimal literals would no
  longer parse exactly and the display would need conversion; nothing a
  calculator user types is binary. Binary is the kernel's business
  alone.
- **A radius shown to the user.** The ball is the mechanism, not the
  output: what the user sees is digits, all of them certified, or fewer
  than asked with a note. An interval display is not asked for and not
  planned.
- **Exactness as a flag on values** rather than a radius. It is the
  ball with the radius collapsed to one bit, and it would have to be
  replaced the day the first propagation rule is written.
- **Stored digits of `pi` or `e`.** Chudnovsky's series with binary
  splitting computes `pi` in about 0.4 ms for a thousand digits, 8 ms
  for ten thousand and 260 ms for a hundred thousand (a phone perhaps
  three to five times slower; a Machin formula is five to fifteen times
  slower and still under 2 ms at a thousand digits; spigot algorithms
  are quadratic and buy nothing), while stored digits compress to no
  better than their entropy, 0.42 bytes a digit, so ten thousand digits
  would add 4.4 KB to a payload of a few tens of kilobytes compressed
  for a range that costs 8 ms to compute. They buy nothing at any
  precision a user will set: computation on demand, memoized, instead
  ([numbers.md](numbers.md), "Memoized constants"), and `e` the same
  way, as the `exp` routine's series.
- **General hypergeometric functions, Bessel `Y` and `K`, Bessel
  functions at large argument.** Library-sized casework for little use
  here.
- **Statistical distributions as built-ins.** They are one-line user
  functions over the Gamma and Beta families.
- **An unbounded exponent.** Bounded so that every value can be
  formatted and every failure is clean ([numbers.md](numbers.md), "Why
  the exponent bound stays at `10^18`").
- **An offset in `Quantity`** for temperatures: every operation would
  need a rule for it, where a function with an inverse needs nothing
  new ([functions.md](functions.md)).

[103]: https://github.com/bsidhom/exucal/issues/103
[107]: https://github.com/bsidhom/exucal/issues/107
[115]: https://github.com/bsidhom/exucal/issues/115
[118]: https://github.com/bsidhom/exucal/issues/118
[119]: https://github.com/bsidhom/exucal/issues/119
[121]: https://github.com/bsidhom/exucal/issues/121
[125]: https://github.com/bsidhom/exucal/issues/125
[126]: https://github.com/bsidhom/exucal/issues/126
[130]: https://github.com/bsidhom/exucal/issues/130
[131]: https://github.com/bsidhom/exucal/issues/131
[132]: https://github.com/bsidhom/exucal/issues/132
[133]: https://github.com/bsidhom/exucal/issues/133
[134]: https://github.com/bsidhom/exucal/issues/134
[149]: https://github.com/bsidhom/exucal/issues/149
[150]: https://github.com/bsidhom/exucal/issues/150
[151]: https://github.com/bsidhom/exucal/issues/151
[152]: https://github.com/bsidhom/exucal/issues/152
