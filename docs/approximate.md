# Approximate values

Status: design note, written during the review of docs/decimal.md
(stage 4 of docs/calculator-plan.md) and placed as task 4.10 of that
stage; "Future work" at the end records the uncertain-measurement form
and how it will be implemented, tentatively. "Implementation notes" is
empty until the task lands.

## The problem

Every literal is exact. `2.54` is `127/50`, `6.674e-11` is
`3337/50000000000000`, and the arithmetic keeps them so: `0.1 + 0.2` is
exactly `0.3`, and `1 in` in `cm` is `= 2.54 cm`. For a unit converter
that is right by default, since a definition is exact and the display's
`=` means exactly that (docs/calculator.md, "The precision model"). But
a value the user types is not always a definition. A measured constant
has digits that are not known, and a value written in exponent form
often means a magnitude rather than an integer; treating either as
exact costs nothing in exact arithmetic, but it shows `=` where `≈` is
the truth, and once the midpoint carries an exponent (docs/decimal.md)
it turns `1e999999999 + 1` into `tooLarge`, since the exact sum of two
exact values cannot be held, where the user meant a value that a `1`
does not change.

The only way to relax exactness today is the decimal mode, which rounds
after every operation in the user's rounding mode. That is a different
thing: it is a policy for the arithmetic, wanted by someone who wants a
hand calculator's semantics, not a statement about one input. A third
mode that rounded every literal to the working precision while keeping
whole-expression rounding was considered and set aside: it is the wrong
granularity. `1 ft` and `6.674e-11` can stand in one expression, and the
first is exact while the second is not; a mode would make `1 ft` in `in`
read `≈ 12 in`, and it would conflate what the user knows about an
input with which rounding policy is in force.

## The design in one line

A built-in, `approx(x)`, marks a value as known only to the working
precision: it returns `x` as an inexact ball, so that everything
downstream treats it as it treats a kernel result, and its two-argument
form, `approx(x, u)`, will mark a value as known to within `u`, which is
future work.

Why a function and not syntax. A call needs no grammar: `approx` is a
built-in like `exp`, with a dimension rule, an arity and the same
evaluation path (docs/builtins.md), and its wording in messages comes
for free. It generalizes: the unary form and the binary form are one
name, and the second argument is where the uncertain-measurement case
goes. It applies to any subexpression, not only a literal, so
`approx(1e999999999) + 1` and `approx(1/3)` mean what they say. And it
precludes nothing: a postfix `~` on a literal (`2.54~`) or a `+/-`
operator (`2.54 +/- 0.005`) can be added later as spellings of the two
forms, once the basic functionality is in place; they are a quality of
life improvement, not a priority.

## `approx(x)`

`approx` is a built-in of one argument, of any dimension, kinds included,
whose result has the argument's dimension: the first built-in with the
rule D14 describes for the exact functions of stage 6, a result that
keeps its argument's dimension, which lands here ahead of them.

The magnitude: the result is the ball whose midpoint is `x`'s and whose
radius is the larger of `x`'s own and one unit in the last of the
working digits, `digitsFor(bitsFor(precision))` significant decimal
digits at the value's magnitude, rounded up to a radius. So an exact
`x` gains that unit; an inexact `x` whose radius is already larger, the
result of a root or a transcendental function, say, keeps it, since a
value known to some precision is not made worse by saying so, and one
whose radius is smaller (a kernel result is within a few ulps, which is
usually more than the unit, but a radius below it is possible) is
widened to it; `approx` is idempotent. An exact zero is returned as it
is, since a value with no digits has no last digit and zero known to
any precision is zero; an unbounded `x` is returned as it is. The
evaluator then settles the result as it settles every inexact result
(D15), which rounds the midpoint to the working digits, so
`approx(1/3)` is the working-precision decimal of a third with a radius
of a unit or two in its last digit.

`approx` never narrows. Its argument is any expression, not only a
literal, and the precision is decided at the approximation point: the
call says "known to this precision, and no better", and a radius the
argument already carries, from an inexact function or an earlier
`approx`, is a fact about the value that the call cannot undo. That is
what makes the built-in sound in the ball model: widening a radius is
always honest, and narrowing one would claim knowledge the computation
does not have. So there is no way to "cast" a value to exact or to raise
its precision through `approx`, and the two intentions should not share
a name: if a reason for the second ever appears (none is known; the
retry loop is how precision is raised, and it raises the working
precision rather than a value's), it belongs to a built-in of its own,
named for what it does, and it would have to say what it claims and why
the claim is true.

`approx` is the one way, in exact mode, to make an exact value inexact
on purpose: nothing else in the arithmetic ever rounds a value of radius
zero (docs/decimal.md, "What stays exact"), and a value that is not
passed through `approx` is as exact as it was before the built-in
existed.

What follows from that, with nothing else changed:

- **Whole-expression precision is kept.** The radius is the working
  precision's, so each pass of the retry loop (D12) makes it smaller,
  and the digits shown converge on the exact expression's: `approx(2.54)
cm` in `in` is `≈ 1` with every digit asked for certified on the first
  pass, and `≈` rather than `=`, which is the point.
- **A large exponent is a value.** `approx(1e999999999) + 1` is
  `≈ 1e+999999999`: the sum's alignment does not fit the range limit, an
  operand is inexact, and the rule of docs/decimal.md absorbs the `1`
  into the radius rather than failing.
- **Identities through approximate values are `≈ 0` with a bound**, as
  they are through any inexact value: the difference
  `approx(0.1) + approx(0.2) - approx(0.3)` is a ball around zero whose
  radius shrinks with each pass and ends at the ceiling with the bound
  the display shows. That is the ball model's honest reading, and the
  price of asking for it.
- **In decimal mode** `approx` works as it does in exact mode, with the
  mode's per-operation rounding on top: it reduces the implied precision
  of its argument from the working precision, which there is the user's
  `p` digits, so `approx(x)` is `x` within one unit in the `p`-th digit,
  the binary form below is `x` within the larger of its radius and `u`,
  and the settle then rounds the result in the user's mode as it rounds
  everything. `approx` does not change what the mode does, and the mode
  does not change what `approx` means.
- **In a definitions file** a body may call `approx` as it may call any
  built-in, so a measured constant can be defined as one:
  `G  approx(6.674e-11) N m^2 / kg^2`. The build evaluates the body at
  the ceiling context, so the unit carries a radius at the ceiling's
  digits, and the lookup settles it to each pass's precision (D6, D15),
  exactly as the angle units carry `pi()`'s. Whether the system file
  marks any of its constants so is a decision for the file, taken
  separately, since it changes `=` to `≈` for every conversion through
  them; today the file's constants are exact by definition (the speed of
  light, the elementary charge, the Planck, Boltzmann and Avogadro
  constants, since the 2019 redefinition of the SI) apart from the
  dalton, a CODATA value written as an exact decimal, which is the one
  candidate.

Errors: none of its own. The dimension rule cannot fail, since any
dimension is accepted; the arity check is the evaluator's. The message
for `approx` used as a unit is the general one for a function's name.

## Alternatives considered

- **A third mode**, rounding every literal to the working precision with
  whole-expression rounding kept: the wrong granularity, as above, and a
  mode where a mark was wanted.
- **Postfix `~` on a literal** (`2.54~`): terse, unambiguous, and it keeps
  prefix `~name` free for the inverse-call notation GNU units uses,
  which docs/functions.md keeps out of the design without closing the
  door; but it needs grammar, applies to literals alone, and has no
  natural binary form. It remains the likely spelling of `approx(x)`
  later.
- **Prefix `~2.54`**: how prose writes "~5 kg", but it takes the symbol
  the inverse notation would want.
- **A `+/-` operator** for the binary form (`2.54 +/- 0.005`): reads
  well, and is the likely spelling of `approx(x, u)` later; `+-` is not
  available, since `2.54 +- 0.01` already parses as `2.54 + (-0.01)`.
- **The CODATA form** `6.67430(15)e-11`: standard in physics, but a
  number followed by `(` is today a product (`2 (3 m)`), and the
  parenthesized digits would have to be read against the literal's own
  digit count, which the canonical form of a `Scaled` does not keep
  (`2.540` and `2.54` are one value); a spelling for later, if at all.

## Future work: uncertain measurements

The binary form, `approx(x, u)`, marks `x` as known to within `u`, an
absolute uncertainty: the result is the ball whose midpoint is `x`'s
and whose radius is the larger of `x`'s own radius and the largest
magnitude in `u`'s ball, rounded up, so that `approx(6.67430e-11,
0.00015e-11) N m^2 / kg^2` is the gravitational constant with its
standard uncertainty, and `approx(2.54, 0.005) cm` is a length measured
to the nearest hundredth of a centimetre. The larger of the two, never
`u` alone, for the reason the unary form gives: `x` may be any
expression, and a radius it already carries is a fact about the value
that the call cannot undo, so `approx(sqrt(2), 1e-30)` at eight digits
keeps the root's radius where that is the larger and
`approx(sqrt(2), 0.001)` is `≈ 1.41` with three digits certain, the
precision decided at the approximation point in either case. (The sum
of the two radii is the other sound choice, and would read as an
uncertainty added to the value's own; the larger of the two reads as
the precision the value is known to, which is what the call says, and
the two differ only where the radii are of one size.) This is
significant-figure propagation, and the ball model does it with no new
machinery: the radius rides through every operation by the rules that
exist, and the display shows the digits it leaves, with the note that
says how many are certain ("3 of 8 digits are certain"). Tentatively:

- **The second argument is absolute, and conforms to the first**, kinds
  included, by the same check a sum applies to its operands; a
  mismatch is a `nonconformingArguments` error worded as `atan2`'s is.
  Absolute rather than relative because it is what measurements report
  (a standard uncertainty is a quantity of the measured thing's
  dimension), because it is dimensionally checked where a relative
  number could not be, and because it is what the ball carries. A
  relative form (`x` within a fraction of itself) and a digit-count form
  (`x` to three significant digits) are spellings that can be added on
  top, as a third argument or a name of their own, when wanted. The
  sign of `u` is ignored, a radius being a magnitude. The arity of
  `approx` becomes one to two, which the arity rule and its message
  already express.
- **The retry loop must learn to stop.** A radius that comes from an
  input does not shrink with the working precision, so a result
  dominated by one never certifies the digits asked for and would run
  every pass to the ceiling on every keystroke. The rule, to be written
  in `resolve` (docs/calculator-plan.md 2.5): a pass whose result's
  radius is not below half the previous pass's ends the loop with that
  result, since the radius is then not the precision's; every
  precision-bound contribution at least halves when the working bits
  double, so a radius that does not halve is dominated by something
  else, and the most the rule can cost is one digit where an
  uncertainty and a rounding are of one size. The unary form needs no
  such rule, its radius being the precision's.
- **Certification at the half-unit.** A measurement written to its last
  digit's half-unit, `approx(2.54, 0.005)`, has its interval's ends on
  the rounding ties, `2.535` and `2.545`, and D7's rule then certifies
  two digits under half away from zero (`2.545` rounds to `2.55`) and
  three under half even; this is correct, and a user who means "to the
  nearest hundredth" gets what the rounding mode makes of the ties.
  The note will say so.
- **Syntax later**: `2.54 +/- 0.005` as `approx(2.54, 0.005)` and `2.54~`
  as `approx(2.54)`, if wanted, each a spelling and nothing more.
- **The system file** may then define measured constants with their
  uncertainties, which is the natural home of the feature: a conversion
  through the gravitational constant would show the digits the
  uncertainty leaves.

## Where it goes

- `src/core/builtins/approx.ts`: the built-in, on the shared helpers of
  builtin.ts, with the dimension rule `sameAsArgument` new in builtin.ts.
- `src/core/builtins.ts`: `approx` in the map.
- docs/builtins.md: its name, rule, and the two rules every built-in
  follows, which it follows trivially; README "Functions in
  expressions": one sentence with an example.
- Tests: the built-in's own (an exact value gains the working radius, an
  inexact one whose radius is larger is unchanged and one whose radius
  is smaller is widened to the unit, `approx` of an `approx` is the same
  ball, zero and unbounded are unchanged, any dimension passes and is
  kept), and through `evaluateText`:
  `approx(2.54) cm` in `in` is `≈ 1` certified on the first pass,
  `approx(1e999999999) + 1` is `≈ 1e+999999999`, `approx(0.1) +
approx(0.2) - approx(0.3)` ends at the ceiling as a zero with a bound,
  `approx(1 ft)` in `in` is `≈ 12`, and a definition calling `approx`
  builds and converts with `≈`.

## Implementation notes

Written when the task lands.
