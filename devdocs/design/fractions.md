# The fractions display

Status: design note for stage 5 of devdocs/history/calculator-plan.md (task 5.0),
written after the hardening phase landed and before any of the stage's
code; the plan's 5.1 and 5.2 were revised against it in the same change,
and D21 records the ruling. The goal is the study's feature 7
(devdocs/history/calculator-study.md, "7. Rational display: feasible, and cheap once
exactness is known"): a setting under which an exact value is written as
a fraction in lowest terms, `1 m = (5000/127) in` rather than
`≈ 39.370079 in`, and nothing in the core changes what it computes.

## The problem

The decimal display writes a value's digits, rounded to the display digits
in the rounding mode, and says `=` only when the radius is zero
and every digit held is shown (D7, the plan's 1.9 and 2.4). An exact
value with more digits than the display digits are written with `≈` and no note:
`1 m` in `in` is `≈ 39.370079 in`, though the value is exactly
`5000/127` inches, and `1/3` is `≈ 0.33333333`. The display is right that
the digits shown are not the whole value, and it has no way to show the
whole value, which has no last digit. A fraction has: `5000/127` is the
value entire, in ten characters, and it parses back as the same value.

That is the display the setting adds. It is a display alone: the value
is what the pipeline computed, the radius says whether it is exact, and
the setting says how an exact value is written. The two displays never
disagree about what is exact, since both read the radius.

## The rule

Amended by D28 (devdocs/design/ratio-width.md): the fit at the display digits of rule 3 is
replaced by the notation's own width, a whole number is written entire
when it fits the width, and a ratio that fits only with its power of
ten factored onto the numerator is written so. The rule as it stands:

1. **An inexact value is written by the decimal display at the display digits,
   `≈`,** whatever the notation.
2. **An exact whole number is written entire when it has at most the
   width in significant digits,** by the decimal display at the width
   (`= 3486784401` for `3^20` at twenty), and otherwise by the decimal
   display at the display digits (`≈ 1.2676506e+30` for `2^100` at eight).
3. **An exact value that is not a whole number is written as its
   fraction in lowest terms when the numerator and the denominator have
   at most the width in digits between them** (`= 5000/127`, `= 127/50`
   for `2.54`).
4. **When that does not fit, it is written as a ratio times a power of
   ten, `n/d × 1e+k`, when the parts then fit and the denominator is not
   one** (`= 1/3 × 1e+30`, `= 5/127 × 1e+33`; #95).
5. **Everything else is written by the decimal display at the display digits.**

The rule as it was ruled for stage 5, with the display digits as the fit, follows
for the record, with the setting on:

1. **An inexact value is written by the decimal display, `≈`,** whatever
   the setting. After `sqrt(2)` at eight digits the midpoint held is
   `141421356237309504880 / 10^20`, a true fraction of what is held and no
   truth about `sqrt(2)`; writing it would be honest and useless. The
   decimal display's kinds (`certified`, `partial`, `zero`, `unbounded`)
   and notes are unchanged.
2. **An exact integer is written as the decimal display writes it:**
   `= 12`, `= 1e+20`, `= 1e+999999999`, and `≈ 3.4867844e+9` for `3^20`
   at eight digits, which is exact but has ten. The decimal display
   already writes an integer exactly wherever its digits, with the
   trailing zeros moved into the exponent, fit within the display digits, and says
   `≈` otherwise; a fraction of denominator one would add nothing.
3. **An exact value that is not an integer is written as its fraction in
   lowest terms, `=`, when the numerator and the denominator each have
   at most the display digits:** `= 5000/127`, `= 1/3`, `= 127/50` for
   `2.54`, `= 25146/15625` for `1.609344`, `= 1/10000000` for `1e-7` at
   eight digits. The fraction is the ordinary one, the value's power of
   ten multiplied back in (`toRational` on the `Scaled` form of D13), so
   the setting never shows the canonical significand and exponent, which are
   how the value is stored and not what it is. A negative value's sign is
   on the numerator, `-5000/127`.
4. **An exact value whose fraction does not fit is written by the decimal
   display,** which says `=` where its own rule allows and `≈` otherwise:
   `1.5e-999999999` is `= 1.5e-999999999`, its fraction having a
   billion-digit denominator and its decimal every digit of the value;
   `5000/127` at three digits is `≈ 39.4`; `(1/3) * 1e30` at eight is
   `≈ 3.3333333e+29`. These are the plan's exponent notation for a short
   significand with a large exponent and its third outcome, an exact value
   too long to write as a fraction, and they need no rule of their own:
   the decimal display is the fallback, and it already knows when it is
   exact.

The ruling behind rule 3 is the owner's (D21): the setting shows
fractions, for understanding as much as for exactness, so a value the
decimal display could write exactly is still written as a fraction when
the setting is on. `2.54` becomes `127/50`. The alternative weighed, a
fraction only where the decimal is inexact, would have left `2.54` and
`1.609344` as they are and turned only `≈` lines into `=` lines; it was
set aside because a user who asks for fractions asks to see them.

The fit rule of rule 3 was provisional, firm for stage 5 and open to a
study after it ([#91](https://github.com/bsidhom/exucal/issues/91)),
which D28 settled with the width above.
The display digits are the one measure of line length the user already sets, and a
fraction of two parts within it is about as long as a decimal at it; a
fixed constant, a bound on the total length, or a setting of its own are
the alternatives the study weighs. Whatever it decides, the fallback
stays the decimal display, and the rule stays a function of the value
and the settings alone, never of the significand limit: values legal under the significand
limit run to 15,634 digits (`3^32767`) and further at a raised limit, so
the significand limit is not a display rule.

Exactness is the ball's radius being zero, the same test as `=` today,
and the rounding mode plays no part in a fraction, which is not rounded.

## Where a fraction is written

Every line the app writes must be typeable back as a `have` (README,
"Expressions"), and the grammar reads a juxtaposition before a
quotient: `5000/127 in` is `5000 / (127 in)`, a frequency. So:

- **Before a unit, the fraction is parenthesized**, as in
  `1 m = (5000/127) in`, and with its sign inside, `-1 m = (-5000/127) in`,
  which the grammar reads as `(-5000) / 127` times `in`, the same value.
- **Before the reciprocal's `× 3 ft`, the same:** `in = (1/36) × 3 ft`.
  The grammar would read `1/36 × 3 ft` correctly, `*` and `/` being one
  level read left to right, but the parentheses cost two characters and
  save the reader the rule.
- **Alone, the fraction is bare:** a dimensionless result is `= 1/3`,
  `= -5000/127`, and the argument of a function line is written inside
  the call, `tempC(37) = tempF(493/5)`, where nothing follows it.
- **In a unit list, term by term:** the counts are exact integers and are
  written as they are, and the remainder follows the rule, as in
  `1 m = 3 ft + (428/127) in`. The relation is `=` when every term is
  exact, as today, so a remainder whose fraction does not fit makes the
  line `≈`, with its decimal.

`show` says which it wrote, the `exact` kind carrying `fraction: true`
when the text is a fraction, and the component parenthesizes, since only
it knows what follows the value on the line.

## Every literal parses back

A fraction the setting writes is a quotient of two integer literals,
each within the display digits, so within the hard bound on a literal's
significand and, since the value was formed within the significand limit, within the
significand limit when divided (D19). It evaluates to the value it was written
from, exactly.

A decimal the fallback writes is the decimal display's, and stage 4 and
the hardening phase made those parse back: the exponent written is the
value's decimal exponent, the significand normalized, never the canonical
`exp` (D17), and a value within the bound has a decimal exponent within
`±10^18`, which `parseDecimal` accepts at the bound (`1e-1000000000000000000`
parses). One literal is the exception: a value whose decimal exponent is
exactly `10^18` and whose rounding at the display digits carries into the next power
of ten, `9.5e1000000000000000000` at one digit, is written
`1e+1000000000000000001`, which names a value past the bound and is
refused when typed back, as `overflow`. The display writes it anyway:
it is what the rounding mode gives, and every alternative either shows
digits that were not asked for or rounds in a mode the user did not
choose. The value shown is the correctly rounded one; the refusal on
typing it back is the arithmetic's, and right.

## A zero's bound at the edges

A ball that contains zero without being it is written as `0` with a
bound, `≈ 0 (within 2e-30 of zero)`, never `-0`, whatever the sign of
its midpoint, which is noise within the bound; the bound is at or above the sum
of the midpoint's magnitude and the radius, rounded up to one digit
(`zeroBound`, the plan's 2.4). Nothing holds a radius to the exponent
bound, so a power of a ball around zero can carry the bound's exponent
far below it, and the power `(approx(1e20) - approx(1e20))^1e100000` is
written with a bound whose exponent has 100,004 digits
([#67](https://github.com/bsidhom/exucal/issues/67)).

The rule: **a bound whose decimal exponent lies below `-10^18` is written
as `1e-1000000000000000000`.** That literal is `10^-(10^18)`, larger than
any such bound, so the line stays sound (the value is within it of
zero), it is the smallest positive value within the exponent bound, so
no bound the display can write is shorter, and it parses back. The
bound is a bound, not a value: it is never typed back as the result, so
rounding it up costs nothing but the truth that the value is even
closer to zero than the line says, which the line does not claim to
know. 5.1 lands it in `zeroBound`.

At the top edge nothing is needed: a ball around zero whose upper end
reaches `10^(10^18 + 1)` is `unresolved` at the bound before it
reaches the display (D18), and a bound the ceiling rounding carries past
the edge is larger and so still sound, and is a note, not a literal.

## The decimal mode

The setting does not apply in decimal mode (D26; devdocs/design/decimal-mode.md,
"The display"; #97). Every value there is a decimal of the display digits,
exact under the mode's rounding, which its digits write entire; a
fraction would say nothing the digits do not, and the outcome never asks
`show` for one in decimal mode, whatever the setting says. The settings'
own shape puts the display inside exact mode, as its notation, `digits`
or `ratio` (devdocs/design/settings-modes.md, landed): the combination cannot be
stored or chosen, and the outcome's guard is what enforces it at the
display's two-valued API.

Before D26 the setting applied in decimal mode and showed fewer
fractions, for the values the roundings happened to leave exact, and 5.2
settled the pipeline's own quotients in decimal mode so that an exact
ratio would not become a fraction there (`1 m` in `in` was
`≈ 39.370079 in`, `1 in` in `cm` `= (127/50) cm`). The settle stays, as
the mode's one rounding of those steps; the fractions do not.

## Where it goes

- `src/core/display.ts`: `show(ball, digits, mode, fractions)`, since
  D28 `show(ball, { digits, rounding, ratio: { width } })`; the `exact` kind gains
  `fraction: true` when its text is a fraction; a helper writes the
  fraction from the `Scaled` midpoint and says whether it fits;
  `zeroBound` clamps the bound's exponent at `-10^18`.
- `src/settings.ts`: a sixth field, `fractions`, a boolean, `false` by
  default, stored with the rest and read as the others are. It is not
  part of the `NumberContext`, which the core takes: nothing in the core
  reads it but `show`, which takes it as an argument.
- `src/unit-converter.ts`: a `fractions` property beside the context;
  `line`, `listResult` and the function line pass it to `show`, and
  parenthesize a fraction that a unit or the reciprocal's `×` follows.
- `src/settings-panel.ts` (then part of `src/app-shell.ts`): the checkbox,
  labeled "Show reduced fractions", with
  the hint "An exact value that is not a whole number is written as a
  fraction in lowest terms when both parts fit within the display digits; inexact
  values stay decimal."
- README ("Settings"): the sixth setting, with the example lines
  `1 m = (5000/127) in`, `1 in = (127/50) cm`, `1 m = 3 ft + (428/127) in`
  and `1 m ≈ 39.4 in` at three digits; ARCHITECTURE.md ("The display
  rule") the rule and the kind.

## Not in this design

- **An approximating fraction for an inexact value**, the simplest
  fraction within the ball (`355/113` for `pi()` at seven digits), which
  the study names as a later refinement. Ruled out for now by the owner:
  an inexact value is shown as a decimal, which says what is known and no
  more, and a fraction written with `≈` reads as a claim the ball does not
  make.
- **A mixed form** (`39 + 47/127`) for an exact value whose fraction
  does not fit: it does not parse back as it reads before a unit. A
  fraction times a power of ten (`1/3 × 1e+999999999`) was ruled out
  here and ruled in by D28 (devdocs/design/ratio-width.md, rule 4).
- **A fraction for the counts of a unit list**, which are integers by
  construction, or for a `have` echoed back, which is the user's text.
- **Anything in the core's arithmetic.** The setting reaches `show` and
  the component and nothing below them.

## Implementation notes

As it landed (5.1 in #94, 5.2 after it):

- The line logic moved out of the component into `src/outcome.ts`, so
  that the lines are tested under Node (`outcome.test.ts`) with the
  setting on and off, through the pipeline, in both modes; the component
  renders what the module returns. "Where it goes" names the component
  for what is now the module's.
- A unit list's exact remainder whose fraction fits is written entire,
  unrounded, so nothing is rounded and nothing carries; a remainder whose
  fraction does not fit takes `roundTerms` as before.
- The pipeline settles its quotients in decimal mode, and the outcome
  the reciprocal, as "The decimal mode" above says.
- The setting is the sixth field of settings.ts, `fractions`, off by
  default, a boolean validated as one; it is not part of the context.
