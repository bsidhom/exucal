# Possible future extensions

Notes on extensions that are not goals now, kept so that no design closes
the door on them by accident. Each entry says what the extension is, why
it is not pursued, what it would take, and what in the current design
keeps it possible. ARCHITECTURE.md ("Later") lists the planned extensions
that fit without reshaping the core; the entries here are the ones that
would reshape part of it, and a design that touches that part should read
the entry first.

## Symbolic constants

**What.** Keeping `pi`, and with it the other transcendental constants a
calculation names, as a symbol rather than as digits, so that identities
hold exactly: `turn` into `deg` is `= 360`, `sin(pi()/6)` is `= 1/2`, and
an angle in radians can be written `pi/6`.

**Why not now.** docs/calculator.md chooses a numeric model,
whole-expression precision over balls, in which `pi()` produces digits at
the precision asked and `sin(pi())` is a ball around zero. Exact
identities are a computer algebra feature, and a general one
(simplification rules, normal forms, decisions of equality) is out of
reach here. The numeric model already gives correct digits and, where a
rounded constant cancels, a conservative `≈` rather than a false `=`.

**What it would take**, in the bounded form worth having: magnitudes that
are rational functions of `pi`, polynomials in `pi` with rational
coefficients over each other. Equality there is decidable, since `pi` is
transcendental: two such values are equal exactly when their normal forms
are. The set is closed under the exact operations (sums, products,
quotients, integer powers), and a root or a transcendental function of a
symbolic value falls back to digits, as any exact value does today, except
at the exact cases a table records (`sin(pi/6)`, `cos(pi/4)`, `tan(pi/4)`,
`exp(0)`), which is where the identities users notice live. The rational
display extends to write `pi/6`; the decimal display is unchanged. The
angle units, all rational multiples of `pi`, become exact, and the
conservative `≈` that docs/calculator.md accepts for `turn` into `deg`
goes away.

**What keeps it possible.** The magnitude is one type behind one module.
An exact value is a ball of radius zero whatever its midpoint holds, so a
symbolic value is such a ball with a richer midpoint, and nothing
downstream of the magnitude changes. `pi()` is a built-in function, so it
can return a symbolic value under a setting and digits otherwise, with no
change to the grammar or the definitions file. The rational display
already has the rule "exact, so write it as a fraction" that `pi/6`
extends. What would change: the midpoint type gains a symbolic kind, every
exact operation gains a case for it, and the kernel's exact-case detection
consults a table.

## Complex numbers

**What.** Values with an imaginary part, so that `sqrt(-1)` is `i`,
`ln(-1)` is `i pi`, `exp(i pi())` is a ball around `-1`, and a phasor such
as `230 exp(i pi()/4) V` is a quantity like any other.

**Why not now.** Every built-in would need a complex implementation
beside its real one (branch cuts for `ln`, `sqrt` and the inverse
trigonometric functions; `gamma` off the real line), the display needs a
form for `3 + 4i`, and there is no complex use in sight. So
docs/calculator.md makes an argument outside a function's real domain a
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
