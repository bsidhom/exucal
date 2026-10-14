# Numbers

How the app holds a number, when a result is exact, which digits you can
trust, what the two size limits refuse and why, and how a result is
written. One idea runs through it: what the app holds, and what it
writes, depends on the value and the settings alone, never on the route
a computation took to it. Every other page assumes this one: a
conversion, a definition and a built-in function all produce values of
the kind described here, and the pages on them link back to the section
that owns each rule.

## Exact and inexact values

A value is a fraction times a power of ten, both exact. `2.54` is `254`
times `10^-2`, `1/3` is one over three and not a string of threes, and
`1e999999999` is `1` times `10^999999999`, the power of ten kept as an
exponent apart from the fraction. A number you type is read exactly, so
`0.1 + 0.2` is `= 0.3`, and the arithmetic on exact values stays exact
([Operations that stay exact](#operations-that-stay-exact-exact-cases-of-functions)).

Every value also carries an error radius: a bound on how far the number
held may lie from the number meant. An exact value has an error radius
of zero, and a result written with `=` is such a value, shown entire. A
value with a nonzero error radius is inexact. A nonzero error radius
comes from exactly two things. One is an inexact built-in function: a
root, `exp`, `ln`, the trigonometric, hyperbolic, Gamma and Beta
families, and `pi()`, whose value no fraction holds. The units defined
through `pi()` are inexact for the same reason, so `30 deg` in `radian`
is `≈ 0.52359878 radian` ([Which factors are exact](units.md#which-factors-are-exact)
lists them). The other is `approx`, which makes a value inexact on
purpose ([approx](#approx)). Nothing else does: an operation on an
inexact value rounds it, charging the rounding to the error radius it
already has, and never makes a new value inexact. In decimal mode every
step, an operation you can see, is rounded and the rounded value is the
value, so no value you see there is inexact; the error radius serves
only inside a step ([The two modes](#the-two-modes)).

The app never shows the error radius. What a line shows is the digits
the error radius leaves certified, and a note when they are fewer than
asked for ([Digits you can trust](#digits-you-can-trust)).

## How a value is held

What a value costs, and what the two limits bound, follows from how it
is held.

- **An exact value costs its fraction's bits.** The fraction is kept in
  one fixed form, its canonical form: in lowest terms, with every power
  of ten moved out into the exponent, and with a denominator that has
  no factor of two or five at all (coprime to ten, in the words of
  number theory), so that `2.54` is held as `254` times `10^-2`, and
  `1/6` as `5/3` times `10^-1`, the two of the six traded for a five
  above the line and one power of ten in the exponent. A value has
  exactly one canonical form, whatever route a computation reaches it
  by. Its fraction in lowest terms is unique; the only denominator the
  rule allows is that fraction's with every two and five taken out;
  with the denominator fixed, the exponent can only be the largest that
  still leaves the numerator a whole number; and the numerator is then
  whatever is left. Each step is forced, which is what makes the held
  value predictable: equal values are held alike, whatever expressions
  produced them, so the app can tell two values are equal by comparing
  the parts it holds, with no arithmetic, and a value costs the same
  bits, and meets the significand limit the same way, by every route.
  `1/3` is small and `3^100000` is not: what an exact value
  costs to hold and to compute with is the bits of its numerator and of
  its denominator, and the significand limit bounds each of them, so
  that `3^100000`, whose 158,497 bits pass the default limit, is refused
  ([Values too big to hold](#values-too-big-to-hold)). Nothing else
  touches an exact value in exact mode: no digits setting applies to it,
  and an exact result of exact operands is never rounded. Only where an
  exact value meets an inexact one is any of it rounded, into the
  inexact result's error radius, which is why `approx` on one operand of
  a sum, a product or a quotient is enough to make the whole step
  computable ([Operations that stay exact](#operations-that-stay-exact-exact-cases-of-functions)).
- **An inexact value is kept to the digits of the current pass.** What
  is known of it lies within its error radius, and the app keeps it to a
  fixed number of significant digits, a little beyond the precision the
  pass works at: those digits are the pass's grid, the evenly spaced
  decimal values the app rounds an inexact value onto after every step,
  each rounding charged to the error radius, so that an inexact value
  never carries digits past what its error radius makes meaningful. Grid
  digits are decimal digits times a power of ten, the same kind of thing
  the display writes, so the digits shown and the digits computed are
  one thing. The passes, and the precision each works at, are
  [Digits you can trust](#digits-you-can-trust)'s.
- **The power of ten is free, and a power of two is not.** The exponent
  costs nothing, whatever its size: `10^1000000000` is
  `= 1e+1000000000`, only its exponent counted, against the exponent
  bound, which holds every value, exact or inexact, within `10^18`
  either way ([Values too big to hold](#values-too-big-to-hold)). A
  power of two in a denominator, though, is held as a power of five in
  the numerator, since no two or five may stay below the line (a five
  goes the other way, into a power of two, which costs less): `2^-30000`,
  a 30,000-bit value, is held as `5^30000` times
  `10^-30000` and costs about 69,658 bits, so it is refused at the
  default limit where `2^-28000` is a value. That is the one case where
  the cost is more than the value's own bits, and it only matters for a
  value already close to the limit: a number that simple by its factors
  is still a big number by its digits (`3^-100000` costs its 158,497
  bits under any way of storing it as digits), and `approx` is the way
  to compute with one ([approx](#approx)).

The two kinds of value are limited by two different things, which is
why the limits come in two units: the significand limit, in bits,
bounds an exact value, and the precision limit, in decimal digits,
bounds how far an inexact one is refined. An inexact value at the
ceiling, the highest precision any pass computes at, is itself a
fraction, a whole number over one, and must fit within the significand
limit, which is how the significand limit also bounds the precision
limit ([How the settings bound each other](settings.md#how-the-settings-bound-each-other)).

## Operations that stay exact; exact cases of functions

`+`, `-`, `*`, `/` and a whole-number power on exact values give an
exact result, as long as it needs to be: `1/3 * 3` is `= 1`,
`0.1 + 0.2` is `= 0.3`, and `3^20` is `3486784401` entire, written
`≈ 3.4867844e+9` at eight display digits and exact all the same
([How numbers are written](#how-numbers-are-written)); a comparison of
exact values is always decided
([Comparison and equality](#comparison-and-equality)). An exact result
of exact operands is never rounded in exact mode, and an exact value is
never replaced by a different exact value. What the arithmetic cannot do
exactly it does not do inexactly on its own: a sum whose operands cannot
be aligned within the significand limit, `1e999999999 + 1`, is refused
rather than rounded ([Values too big to hold](#values-too-big-to-hold)).

Where an exact operand meets an inexact one, the result is inexact in
any case, and the strictness relaxes: if the exact step would pass the
significand limit, the exact operand is rounded onto the pass's grid,
the rounding charged to the result's error radius as `approx` would
charge it, so that the step gives a value rather than a refusal; an
exact operand that already fits the grid is left as it is. The error
radius of such a result covers the rounding of the exact operand
together with the inexact operand's own, so the result still bounds the
true value. `1e999999999 + sqrt(2)` is `≈ 1e+999999999` this way, the
root absorbed into the error radius, where `1e999999999 + 1` is refused.

A built-in function returns an exact result wherever its value is
rational and cheaply recognized, which its entry calls an exact case:
`sqrt(9/4)` is `= 1.5`, `log(2, 8)` is `= 3`, `exp(0)` is `= 1`,
`cos(0 radian)` is `= 1` and `gamma(5)` is `= 24`. Otherwise its value
is inexact however round it looks: `ln(8) / ln(2)` is `≈ 3`. Which
values each function recognizes is in its entry
([Built-in functions](builtins.md#rules-every-built-in-follows)).

## Digits you can trust

In exact mode the display digits are how many digits of the answer must
be certified before it is shown, and a digit is certified when every
value within the error radius rounds to it. The app computes at a
precision a little above the digits asked, one pass, and where the
digits do not certify computes again at twice the precision, pass by
pass, up to the ceiling, which the precision limit sets
([Precision limit](settings.md#precision-limit) gives the number); this
is the retry loop. The display digits themselves may be set up to the
precision limit. An expression whose digits can never certify,
`(2^(1/2))^2 - 2`, runs every pass up to the ceiling on every keystroke,
which is what the precision limit limits: effort
([What costs time](#what-costs-time); the passes and the precision each
works at are in
[the schedule of passes](../devdocs/numbers.md#working-precision-and-the-schedule)).

An answer is written with `=` when it is exact and every digit it has is
shown (`1 in = 2.54 cm`, `3 ft = 36 in`), and with `≈` when digits were
rounded away or when a step of the computation was inexact:
`1 m ≈ 39.370079 in` and `1/3 ≈ 0.33333333`, both exact values with
more digits than shown, and `2^(1/2) m` in `2^(1/2) m` is `≈ 1`, since
the two roots were each computed to a finite number of digits, however
exactly they cancel
([Identities and cancellation](#identities-and-cancellation)).

An answer shows every digit asked for when the computation can vouch
for them all. When it cannot, which only the last pass produces, a note
in parentheses says what the digits are worth: how many of them are
certified ("7 of 8 digits are certified", and "0 of 8" when none is),
or that the value is zero within a bound ("within 2e-30 of zero", the
value written `0` whatever the sign of the noise it is within). A partly
certified answer is rare, and comes two ways. One is a value computed
inexactly that lies exactly halfway between two roundings of the digits
asked, which no pass can certify: `sqrt(2)^2 * 1.000000025` is
`≈ 2 (7 of 8 digits are certified)`, and `log(256, 512)`, whose value
`9/8` the function computes inexactly, is
`≈ 1.1 (2 of 3 digits are certified)` at three display digits. The
other is a rounding mode that rounds in one direction, under which a
value whose error radius reaches across the value shown certifies no
digit: `approx(1)` under rounding down is
`≈ 1 (0 of 8 digits are certified)`
([Rounding modes and where they act](#rounding-modes-and-where-they-act)).
In decimal mode a step whose rounding could not be certified at the
precision limit is written with `≈` bearing a dot above it, the
uncertified mark, and a note says so ([The two modes](#the-two-modes)).

## Comparison and equality

A comparison appears in the conditions of a defined function
([Functions](definitions.md#functions)) and inside every built-in that
must know which side of a point its argument lies on. Two exact values
compare exactly, always decided and never refused for size. An inexact
value is compared as the whole range within its error radius: when the
range lies on one side of the other value the comparison is decided,
and when it reaches across the other value the comparison is undecided,
the one word this page uses for a comparison that neither holds nor
fails. A range that ends exactly on the other value is the subtle case:
it never decides a strict comparison (`<`, `>`) in its favour, and
decides a non-strict one (`<=`, `>=`) only from the side the comparison
admits, so `tempC(-273.15)` meets the condition `x >= -273.15` and is
`= 0 K`, while `tempC(approx(-273.15))`, whose range reaches across
`-273.15`, cannot be decided at any pass and is shown with a warning
that the value assumes the condition holds. Two inexact values are
compared through their difference against zero, which can always be
formed, the smaller operand absorbed into the error radius where the
two cannot be aligned; a difference that cannot be formed as a value,
its exponent passing the bound, counts as reaching across zero, and the
comparison cannot be decided.

There is no equality operator and no `!=`: the comparisons are `<`,
`<=`, `>` and `>=`, and equality appears only as `=` on a result line,
in a function's exact cases, and in the check a conversion into a
function makes ([Conversion into a function](quantities.md#conversion-into-a-function)).

Where a comparison that cannot be decided surfaces is
[Values at an edge](#values-at-an-edge): a divisor, a function's domain
or pole, a rounding function, the exponent bound, and that check.

## Values at an edge

A result would jump if the value lay a hair to one side of an edge:
zero as a divisor, the end of a function's domain (`1` for `asin`), a
pole of the function (`tan` at `90 deg`, `gamma` at zero), a whole
number for `floor` and a point halfway between two roundings for
`round`, a multiple of the divisor for `div` and `mod`, and the point
where a result passes the exponent bound. An inexact value whose error
radius reaches across such an edge is not guessed at: the app computes
again at more digits, pass by pass, and when the error radius still
reaches across the edge at the ceiling the result is an error, which
says that the value cannot be told from the edge at this precision.
`(2^(1/2))^2 - 2` is zero within a bound at every precision, so
`1 / ((2^(1/2))^2 - 2)` is an error: the value cannot be told from
zero. `exp(approx(1e999) - approx(1e999 - 5))` reaches across the
exponent bound at its first pass, the difference being `5` only within
a wide error radius, and is retried until the error radius lies within
the bound (`≈ 148.41316`); a value that still reaches across the bound
at the ceiling cannot be told from the point where the result passes
it. An exact value exactly on an edge is decided: `floor(2)` is `= 2`.

The rounding functions are the one place where some edges decide a
value that cannot be told from zero and others do not: `trunc`, and
`round` in any of the three modes to nearest or in the mode toward
zero, give `= 0`, while `floor`, `ceil`, `sign`, and `round` in the
modes away from zero, up and down, do not, and the result is an error
([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

## Identities and cancellation

An identity through an inexact step never certifies exactly.
`2^(1/2) m` in `2^(1/2) m` is `≈ 1`, not `= 1`: the two roots were each
computed to a finite number of digits, however exactly they cancel.
`(2^(1/2))^2 - 2` is zero within a bound on every pass, since the
cancellation leaves it an error radius of the pass's last digit however
fine the pass, so it runs every pass up to the ceiling, or until a
later pass ends the retry loop with a refusal, when the best result so
far is shown, and dividing by it is an error
([Values at an edge](#values-at-an-edge)). `turn` into `deg` is
`≈ 360 deg` and `sin(pi() radian)` is `≈ 0` for the same reason. A
finer pass is necessary for more certified digits and never sufficient.

Every occurrence of a value is independent. `approx(1) - approx(1)` is
a value within a bound of zero, never exactly `0`, and a parameter of a
defined function used twice is two independent copies of its argument's
error radius, so `x - x` in a body is the same bound around zero that
the text typed inline would be ([Functions](definitions.md#functions)).

A function written by hand in place of a built-in is slower, and can
fail where the built-in does not: each step rounds and the error radii
add up; the built-in's exact cases are lost (`log(2, 8)` is `= 3`,
`ln(8) / ln(2)` is `≈ 3`); and a step can pass a limit the result does
not (`(exp(x) - exp(-x)) / (exp(x) + exp(-x))` is refused at `3e18`,
where `tanh(3e18)` is `≈ 1`, because `exp(3e18)` is too large to
compute). Prefer the built-in, and where there is none, work in log
space ([Values too big to hold](#values-too-big-to-hold)).

## The two modes

Exact mode, the default, is what the rest of this page describes: an
exact value stays exact however long it is, an inexact one carries its
error radius, and the digits shown are certified by passes at rising
precision. Decimal mode is the arithmetic a hand calculator does, and it
follows four rules.

1. **Every step is rounded once, and the rounded value is the value.**
   A step is an operation you can see: each `+`, `-`, `*`, `/` and `^`,
   two factors written side by side, a negation (a `-` before a
   product), each number typed, each unit (a prefixed unit being one
   step), and each built-in call as a whole. Its exact result is rounded
   to the display digits in the rounding mode, exact values included,
   and nothing is kept beyond those digits, so at eight display digits
   `1 / 3 * 3` is `= 0.99999999` and `1 / (1 / 3 * 3 - 1)` is
   `= -1e+8`. No value is inexact, so every answer is written with `=`,
   the uncertified mark apart. A number typed with more digits than the
   display digits is rounded as it is read, unless it passes the
   significand limit, which refuses it before anything rounds it, in
   either mode ([Values too big to hold](#values-too-big-to-hold)); and
   a sum whose operands cannot be aligned within that limit, refused in
   exact mode, is here the correctly rounded sum, `1e999999999 + 1`
   being `= 1e+999999999`.
2. **A built-in call is one step, certified and rounded once.** Its
   value is computed at rising precision, up to the same ceiling as
   exact mode's, until its rounding to the step's digits is certified,
   so the precision limit bounds that certification as it bounds the
   display digits; the error radius serves only inside the step, to
   certify the rounding of a function's value or of a unit defined
   through `pi()`, and the step's one rounding removes it. A value that
   lies exactly halfway between two roundings of the step's digits never
   certifies, and is then shown as it rounds, under the uncertified
   mark, `≈` with a dot above it (`≈̇`), with the note "a step could not
   be certified at the precision limit", which stays with every later
   step: `log(4, 8)`, whose value `3/2` the function computes
   inexactly, shows it at one display digit. A function defined in the
   definitions file is not one step but its body's steps, each rounded
   as a hand calculator rounds each keystroke, where a built-in's value
   is rounded once: a function defined as `em(x) = (exp(x) - 1) / x`
   gives `≈ 1` at `1e-30` in exact mode and `= 0` in decimal mode at
   eight digits, `exp(1e-30)` having been rounded to `1` before the
   subtraction ([Functions](definitions.md#functions)).
3. **Decimal mode runs a single pass.** There is no retry loop: nothing
   is computed again at more digits, and an expression that would run
   to the ceiling in exact mode costs one pass here
   ([What costs time](#what-costs-time)). `approx` is the identity
   ([approx](#approx)), and a comparison always decides, since every
   value is exact.
4. **The working digits round every step but the last.** With working
   digits above the display digits
   ([Working digits and the extended count](settings.md#working-digits-and-the-extended-count)),
   every step is rounded to the working digits, and only the last step
   of each value shown to the display digits, directly from the exact
   result of its operation: `ln(exp(1/10))` is `= 0.099999984` at eight
   display digits and `= 0.1` over twelve working digits. The last steps
   are the result of the expression typed, when nothing is converted
   into; the conversion's ratio; a unit list's counts and remainder; and
   the count a conversion into a function recovers. When something is
   converted into, the expression typed and what it is converted into
   are both operands, rounded to the working digits, so `1 / 3 * 3 m`
   in `in` is `= 39.370078 in` at eight display digits and
   `= 39.370079 in` over twelve working digits. The reciprocal line, the
   conversion the other way round, is the exception: it is the
   reciprocal of the ratio shown, at the display digits, whatever the
   working digits.

Two consequences follow for units and edges. A unit that carries `pi()`
is rounded as it is looked up, like any other step, so `turn` into
`deg` is `=` with a value a little under `360`, where exact mode gives
`≈ 360 deg`. And no argument reaches across an edge, since every
argument is exact, so `tan(90 deg)` may give an exact value in decimal
mode where exact mode fails at the pole: the value is the tangent of
the rounded degree, not of a right angle. Under a rounding mode that
rounds in one direction, every step rounds that way
([Rounding modes and where they act](#rounding-modes-and-where-they-act)).

## `approx`

`approx(x)` is `x` known to the precision of the pass and no better: an
exact argument becomes inexact, with an error radius of one unit in the
last of the digits the pass keeps, and an inexact one is left as it is,
never narrowed. It keeps the dimension (`approx(2 m)` is `≈ 2 m`),
leaves a zero as it is (`approx(0)` is `= 0`, and a value that is zero
within a bound keeps its bound), and in decimal mode is the identity,
since every value there is already rounded
([The two modes](#the-two-modes)). Its unit of error lies well beyond
the display digits, so `approx(2.54) cm` into `in` is `≈ 1 in`, written
`≈` rather than `=`, which is the point.

It is the designed escape from the strictness of exact arithmetic: a
step the exact arithmetic refuses for its size, a sum that cannot be
aligned, a whole-number power, a product or a quotient whose exact
result would pass the significand limit, is computed to the digits
asked once one operand is inexact, and shown with `≈` instead of `=`
([Values too big to hold](#values-too-big-to-hold)). `1e999999999 + 1`
is refused, since its exact value has a billion digits, while
`approx(1e999999999) + 1` is `≈ 1e+999999999`, the `1` absorbed into
the error radius; `3^1000000000` is refused and `approx(3)^1000000000`
is `≈ 5.243997e+477121254`, its digits kept to the pass's precision at
every step; and `3^32767 * 7^21845` is refused, each power within the
limit and their product past it, while `approx(3^32767) * 7^21845` is
`≈ 9.9732685e+34094`.

`approx` says how well a value is known, not how large it is, so it
never changes an exponent, and it relaxes no limit but the one an
inexact operand changes the arithmetic for: a function that works at
its argument's own size refuses by that size whether the argument is
inexact or not, so `exp(approx(1e999))` is too large to compute as
`exp(1e999)` is and `sin(approx(1e999999999) radian)` is past the
significand limit as `sin(1e999999999 radian)` is; and `approx` on the
base of a power does not help an exponent that cannot itself be formed
within the significand limit. Nor would `approx` help `exp` if the
exponent were allowed, because of what the exponential does to an error
radius: `exp(x ± r)` is `exp(x)` times a factor between `e^-r` and
`e^r`, so the argument's error radius, in absolute terms, becomes the
result's relative error, and `exp` of a large argument needs that
argument to many more digits than the result shows. At the first pass
`exp` finds that the result's exponent passes the bound for every value
within the argument's error radius, refuses, and the retry loop ends
there; an exact argument gives those digits for free, an inexact one
only after passes enough to shrink its error radius below one.

## Rounding modes and where they act

The rounding mode ([Rounding](settings.md#rounding)) is the rule for the
last digit kept when a value is cut to fewer digits than it has: three
modes round to the nearest value and differ on a value exactly halfway
between two roundings, which the default sends to the even digit and
the other two away from zero or toward zero, and four round in one
direction, toward zero, away from zero, up or down. In exact mode it
acts once, at the display, in the rounding of a value to the digits
shown and in what those digits certify
([Digits you can trust](#digits-you-can-trust)). In decimal mode it acts
at every step ([The two modes](#the-two-modes)). Inside an expression
it acts in one place, `round`, which rounds to a whole number, or with
a second argument to that many decimal places, in the mode:
`round(2.5)` is `= 2` under the default and `= 3` under the mode to nearest with
ties away from zero, and `round(2.345, 2)` is `= 2.34` and `= 2.35` the
same way ([Built-in functions](builtins.md)).

## Values too big to hold

Two limits bound a value, on two different parts of it, and a refusal
names the one it passes. A refusal is the one kind of failure this page
calls by that name: a value the limits keep from being computed, or a
number typed past them. Everything else that stops a result, a
mismatch, a condition that fails, a value that cannot be told from an
edge, is an error.

A value is held as a significand times a power of ten
([How a value is held](#how-a-value-is-held)). The settings bound the
significand: the display digits and the precision limit say how many
of its digits must be certified, and the significand limit how many
bits its numerator and its denominator may have. The exponent has a
fixed bound of its own, `10^18` either way, which is not a setting.
`1e999` is `1 × 10^999`, well within both. `exp(1e999)` has a
significand that 32 digits hold with ease and an exponent that is
itself a number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └───────── significand ─────────┘      └─────── exponent ───────┘
             the settings' part: the display        fixed, not a setting:
             digits, the precision limit and        at most 10^18 either
             the significand limit; 32 digits       way; this one has 999
             fit with ease                          digits, 4.3 × 10^998
```

**The significand limit.** The limit is strict: no exact value past it
is ever formed, and an operation predicts the size of its result before
forming it. When a result would need a significand past the limit, the
app refuses that part of the expression, names it and says how many
bits it would need, exactly or about, where the operation knows:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
```

Where the operation that refused expects the same step to fit when
computed inexactly, the message suggests what to try: `approx(…)`
around the operand it names, so that the part is computed to the digits
asked and shown with `≈` ([approx](#approx)), or decimal mode, which
rounds every step and so never holds the exact value. Where the
operation expects the value to pass the limit however it is computed (a
built-in whose value needs more bits than the limit holds even rounded,
`factorial(20000)` or `sin` of an angle whose reduction passes the
limit; a number typed with more digits than the limit; a power whose
exponent cannot be formed within it, `2^1e-30000`), the message says so
and suggests nothing; what a wider limit would need is yours to judge.
The suggestion is the operation's expectation, not a promise. A refusal
is never retried at more digits, and one that a later pass is the first
to meet ends the retry loop with the best result so far: the message
names the failure's kind so that you can decide whether a wider limit,
`approx` or decimal mode would help. A built-in that works at its
argument's own size refuses by that size whether the argument is exact
or not, so `approx` does not help there ([approx](#approx)); the
whole-number functions' refusals, `factorial`'s among them, never offer
`approx` or decimal mode and apply in both modes, and `round(x, places)`
and `mod` are refused when their results would pass the limit. A number
typed longer than the most the significand limit can be set to is
refused as it is typed. The limit is what makes `3^1000000000` a
refusal rather than a hang; the setting is in
[Significand limit](settings.md#significand-limit).

**The exponent bound.** A result whose exponent would pass `10^18` is
too large to compute, and one whose exponent would fall below `-10^18`
is too small, whether the value is exact or inexact:

```
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
```

The bound is on the value, not on the form it is held in:
`1e1000000000000000000 / 3 * 10` is a value, while
`1e-1000000000000000000 / 7` is too small to compute. Zero is within the
bound at any exponent, so a value that is zero within a bound is never
refused at the bound, however small the bound. A number typed past the
bound is refused as it is typed, `1e1000000000000000001` passing it
where `0.001e1000000000000000003` does not, and a number within the
bound whose rounding to the display digits would carry past it,
`9.5e1000000000000000000` at one display digit, is refused the same
way, so that every line written pastes back
([How numbers are written](#how-numbers-are-written)).

The exponential of `x` has the exponent `x log10 e`, so `exp(x)` is
refused whenever `x` passes `(10^18 + 1) ln 10`, about `2.3026e18`, for
every value within its error radius, with or without `approx`:
`exp(2.3e18)` is `≈ 3.9591004e+998877308377479203` and `exp(2.31e18)`
is too large to compute. `exp(-1e999)` is too small to compute, its
exponent as far below the bound as `exp(1e999)`'s is above it. `sinh`,
`cosh` and powers (`pow(10, 1e999)`, `10^1e999`) share the bound,
`sinh` and `cosh` of a negative argument being too large rather than
too small, and a product, quotient or power that no setting could hold
is reported at the bound even where the significand limit would refuse
it first (`7^1e19`, a whole number of about `8.5 × 10^18` digits, is
too large to compute, where `2.54^1e18`, a hair within the bound, is
past the significand limit). A sum never faces that choice: a sum that
aligns and passes the bound is too large or too small to compute, and
one that cannot be aligned is refused at the significand limit, or,
with an inexact operand, has the value of its larger operand, which is
within the bound. A refusal at the bound needs every value within the
error radius to lie past it; an argument whose value may lie on either
side of the bound is retried at more digits, and at the ceiling cannot
be told from the point where the result passes the exponent bound
([Values at an edge](#values-at-an-edge)).

The bound is not a setting, and a higher one is ruled out: parts of the
number type are exact only because the exponent is at most `10^18`, and
the cost of an exponential grows fast with its argument once the bound
is raised; the reasons, and the passes an inexact argument costs `exp`
near the bound, are in
[Why the exponent bound stays at 10^18](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018).
Instead, work in log space, as on paper: a quotient of exponentials is
the exponential of a difference, so `exp(1e999) / exp(1e999 - 5)`,
which is refused, is `exp(1e999 - (1e999 - 5))`, `≈ 148.41316`; and the
exponent of `exp(1e999)` itself is `1e999 / ln(10)`,
`≈ 4.3429448e+998`.

## How numbers are written

A result is written as digits: the significant digits the value
certifies, up to the display digits, rounded in the rounding mode with
trailing zeros dropped, and in exponent form, `1e+21` or `1e-5`, when
the value is below `1e-4` or needs more digits before the decimal point
than the display digits allow, so that at eight display digits
`100000000` is `= 1e+8` and `1 / (1 / 3 * 3 - 1)` in decimal mode is
`= -1e+8`. The power of ten is never written out, so any magnitude
renders: `10^1000000000` is `= 1e+1000000000`. A value that is zero
within a bound is written `0`, with its note
([Digits you can trust](#digits-you-can-trust)).

The ratio notation ([Notation and ratio width](settings.md#notation-and-ratio-width)),
a setting of exact mode alone, writes an exact value as a fraction
where one fits the ratio width, which is independent of the display
digits: a whole number is written entire when it has at most the
width's significant digits, a fraction as `n/d` when its numerator and
denominator together have at most that many digits, and otherwise,
where that fits, as a fraction times a power of ten, `1/3 × 1e+30`, the
two being the value's canonical form
([How a value is held](#how-a-value-is-held)); anything longer is
written as digits, and an inexact value is always written as digits
(`sqrt(2) m ≈ 1.4142136 m`). So under the notation `1 m` in `in`
is `= (5000/127) in` and `3^20` is `= 3486784401`, where the digits
notation writes `≈ 39.370079 in` and `≈ 3.4867844e+9` at eight display
digits. The notation changes how an exact value is written, never what
is exact.

A ratio is written in parentheses where a unit follows it,
`(5000/127) in`, and bare where `×` follows it or nothing does, as on
the reciprocal line `in = 1/36 × 3 ft` of `3 ft = 36 in`. The
parentheses matter: two factors written side by side (juxtaposition)
bind tighter than `/`, so `1/2 in` is `1/(2 in)`, a quantity per inch,
unlike `(1/2) in` and `0.5 in` ([Pitfalls](expressions.md#pitfalls)).

Every result pastes back as input. The copy button produces its text
from the value as held, not from the text on the screen, writing `*`
where the screen shows `×`
([What the app writes back](expressions.md#what-the-app-writes-back)),
and the one rounding that could write a number past the exponent
bound, a value within the bound whose rounding to the display digits
carries past it, is refused instead
([Values too big to hold](#values-too-big-to-hold)).

What is written is as fixed as what is held. A line is a function of the
value, of whether it is exact, and of the settings, never of the route
a computation took: `2.54`, `254/100` and `2.5 + 0.04` are all `= 2.54`,
or `= 127/50` under the ratio notation, and `1e30/3` and `(1/3) * 1e30`
are both `≈ 3.3333333e+29`, or `= 1/3 × 1e+30`. What can depend on the
route is the value itself, in decimal mode, where every step is rounded
([The two modes](#the-two-modes)), and whether the value is exact, where
a step was inexact ([Digits you can trust](#digits-you-can-trust)); a
given value, exact or not, is written one way.

## What costs time

What costs time is passes and bits. An expression whose digits certify
at the first pass costs one pass, and one whose digits never certify,
an identity through an inexact step or a value at an edge, runs every
pass up to the ceiling, on every keystroke, so the precision limit is a
cost setting before it is anything else
([Digits you can trust](#digits-you-can-trust)). Decimal mode runs one
pass whatever happens ([The two modes](#the-two-modes)). The cost of an
exponential grows fast with its argument, and so does the cost of the
functions built on it, which is one reason the exponent bound stays
where it is ([Values too big to hold](#values-too-big-to-hold)); an
exact power or product costs the bits of its result, so a definition
that reads small can be large, a few characters of exponent standing
for a number of thousands of digits
([How a value is held](#how-a-value-is-held)). A function written by
hand is slower than the built-in, and a defined function costs what its
body typed out in its place would cost, a body that calls a function
twice computing it twice, at every pass
([Identities and cancellation](#identities-and-cancellation)). Some
built-ins pay a cost once, the first time they are called at a new
precision, for a constant or a table they then keep, and some are
expensive at any precision; their entries say which
([Built-in functions](builtins.md)).

## Real values only

The app computes with real values only: every value is a real number
held within an error radius, and a function asked for a value outside
its real domain, `sqrt(-1)` or `asin(2)`, is an error.
