# Possible future extensions

Notes on extensions that are not goals now, kept so that no design closes
the door on them by accident. Each entry says what the extension is, why
it is not pursued, what it would take, and what in the current design
keeps it possible. "Planned extensions" at the end lists the extensions
that fit without reshaping the core; the entries before it are the ones
that would reshape part of it, and a design that touches that part should
read the entry first.

## Symbolic values

**What.** Keeping a value exact through the irrational steps that algebra
can keep exact, so that zeros and equalities survive as late into an
evaluation as possible: `sqrt(2)^2 - 2` is `= 0`, `sqrt(8) / sqrt(2)` is
`= 2`, `turn` into `deg` is `= 360`, `sin(pi()/6)` is `= 1/2`, and
`exp(1)^2 / exp(2)` is `= 1`. The value goes to digits only when a step
that no bounded algebra keeps exact forces it (`exp(sqrt(2))`,
`ln(3)`, `gamma(1/3)`), and from the exact form, so that nothing has been
lost before that step. The goal is final precision, not a symbolic
calculator: a certified `= 0` where the numeric model can only say
`≈ 0` with a bound, and a cancellation that costs nothing where the
numeric model pays for it with a retry at higher precision.

**Why not now.** devdocs/history/calculator-study.md chooses a numeric model,
whole-expression precision over balls, in which `sqrt(2)` and `pi()` are
digits at the internal precision and `sqrt(2)^2 - 2` is a ball around
zero. The numeric model already gives correct digits, and where a rounded
value cancels, a conservative `≈` rather than a false `=`. The symbolic
layer is the one way to a certified zero, and it is real work: canonical
forms, the simplification that keeps them canonical, and tables of the
exact cases of the functions. It comes after the numeric model, and only
after the numeric model is in place to fall back on.

**What it would take**, in the bounded form worth having: a symbolic
midpoint that is a sum of rational multiples of monomials, each monomial
a product of prime radicals with rational exponents (`2^(1/2)`,
`3^(-1/3)`) and integer powers of the transcendental symbols `pi` and
`e`. That form is closed under sums, products and integer powers, and
under roots of a monomial (a root of a sum is not a monomial and goes to
digits, or stays a root over a sum if the layer is taken further). It has
a canonical form, so equality is a comparison, not a search: like
monomials combine, a monomial's exponents are reduced so that the
rational part is factored out, and a sum is zero exactly when every
coefficient is. Simplification is that normalization and nothing more.
Three facts make the form sound. Radicals of distinct prime powers are
linearly independent over the rationals, so a sum of radical monomials
is zero only when its coefficients are. `pi` and `e` are each
transcendental, so a rational function of either alone vanishes only
when it does formally. Their algebraic independence from each other is
conjectured (it follows from Schanuel's conjecture) and not proven, so a
value that mixes `pi` and `e` is exact on that assumption, and the
design should say so; a case where the assumption fails would be a
theorem nobody has.

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
symbolic argument to a ball at the internal precision and proceeds
numerically. A further symbol set (`ln 2`, `ln 3`, `sqrt(pi)`) could be
adjoined the same way, and is where "not a symbolic calculator" draws
the line.

The rational display of feature 7 extends to write a symbolic value as
it is (`sqrt(2)/2`, `pi/6`, `2 e`); the decimal display is unchanged. The
angle units, all rational multiples of `pi`, become exact, and the
conservative `≈` that devdocs/history/calculator-study.md accepts for `turn` into `deg`
goes away; `(2 m^2)^(1/2)` becomes exactly `sqrt(2) m`.

**What keeps it possible.** The magnitude is one type behind one module.
An exact value is a ball of radius zero whatever its midpoint holds, so
a symbolic value is such a ball with a richer midpoint, and nothing
downstream of the magnitude changes; the retry loop, which re-evaluates
from the expression, would re-evaluate a symbolic value to any precision
on demand. `root` already detects the exact rational cases, which is the
degenerate form of the radical monomial. `pi()` and `exp` are built-in
functions, so they can return a symbolic value under a setting and digits
otherwise, with no change to the grammar or the definitions file. The
rational display already has the rule "exact, so write it as it is" that
`sqrt(2)/2` extends. What would change: the midpoint type gains a
symbolic kind, every exact operation gains a case for it and a rule for
when it gives up, the kernel's exact-case detection consults the tables,
and the radicand factoring joins the kernel.

## Complex numbers

**What.** Values with an imaginary part, so that `sqrt(-1)` is `i`,
`ln(-1)` is `i pi`, `exp(i pi())` is a ball around `-1`, and a phasor such
as `230 exp(i pi()/4) V` is a quantity like any other.

**Why not now.** Every built-in would need a complex implementation
beside its real one (branch cuts for `ln`, `sqrt` and the inverse
trigonometric functions; `gamma` off the real line), the display needs a
form for `3 + 4i`, and there is no complex use in sight. So
devdocs/history/calculator-study.md makes an argument outside a function's real domain a
domain error, which is what a real-only calculator should do.

**What it would take.** The ball becomes a complex ball, a real and an
imaginary ball, as Arb's `acb` is beside its `arb`; the exact operations
extend to it, and each built-in gets its complex form and propagation
rule. The parser gains `i`, which is not a unit name today, or a built-in
`i()`. The number context gains a switch, so that `sqrt(-1)` stays a
domain error unless complex results are allowed. The display writes
`a + bi`, and the rational display writes both parts. Dimensions are
untouched: a complex magnitude carries a dimension as a real one does, and
conformance never looks at the magnitude. What has no complex meaning
stays real-only and reports an error on a complex argument: the order
comparisons, so a unit list (`ft;in`) needs a real value; `floor` and its
kin; the inverse of a defined function as a want.

**What keeps it possible.** The magnitude behind one module, and the ball
with radius zero for exact values. The built-ins as a table of native
implementations with dimension rules, to which a complex implementation is
a second field. Domain errors as `Result` values that a mode can turn into
values. Conformance and dimensions independent of the magnitude. What
would change: the midpoint type, the kernel's primitive operations, every
built-in, and the display.

## Planned extensions

Planned extensions, listed to show that they fit without reshaping the core:

- **The rest of the calculator program.** devdocs/history/calculator-study.md weighs the
  special functions, a decimal mode, a rational display and richer
  user-defined functions, with the elementary functions, as one program
  toward an arbitrary-precision calculator under whole-expression
  precision in the manner of Arb, and devdocs/history/calculator-plan.md is the
  plan, now complete. Stages 1 to 8 have landed, with the hardening
  phase before stage 5: the ball, the kernel and the retry loop, the
  elementary functions, the `Scaled` midpoint and the decimal mode, the
  rational display, the exact functions and the Gamma and Beta families,
  the user-function extensions, and the search for the costliest
  expressions, whose catalogue (devdocs/cost.md) is the target for keeping
  the interface responsive
  ([#118](https://github.com/bsidhom/exucal/issues/118)) and for
  making the kernels cheaper (#149, #150, #125 and others). The limits
  keep their defaults (D25). Stage 6's eight remaining special functions
  are deferred ([#115](https://github.com/bsidhom/exucal/issues/115)),
  and the plan's "Stage 8 as it landed" lists the issues that carry the
  rest.
- **More of the user functions.** Stage 7 deferred four extensions, each
  to an issue of its own: a bare call's value shown in its function's
  result annotation
  ([#130](https://github.com/bsidhom/exucal/issues/130)); the
  shadowing error in a head relaxed to a warning
  ([#131](https://github.com/bsidhom/exucal/issues/131)); definitions
  typed into the converter
  ([#132](https://github.com/bsidhom/exucal/issues/132)); and
  dimension-generic functions, with type bounds on their variables
  ([#133](https://github.com/bsidhom/exucal/issues/133)), for which
  the parser already reserves `name[`. A function's result is never
  checked against a range, since nothing would act on it; whether ranges
  could instead narrow a result's ball is studied in
  [#134](https://github.com/bsidhom/exucal/issues/134).
- **User definitions** are already supported by `buildTable`; only storage and
  an editor are missing.
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request) is a flag
  to `convert` that skips step 2 of the conformance check. Sums would keep
  the strict check: adding an angle to a plain number is a mistake whether
  or not the user asked to convert between them.
- **Symbolic values and complex numbers** are not planned, and would
  reshape the number type rather than fit around it; devdocs/future.md
  records what each would take and what keeps it possible, so that no
  design closes the door on them by accident.
