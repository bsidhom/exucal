# The fractions display

Status: design note for stage 5 of docs/calculator-plan.md (task 5.0),
written after the hardening phase landed and before any of the stage's
code; the plan's 5.1 and 5.2 were revised against it in the same change,
and D21 records the ruling. The goal is the study's feature 7
(docs/calculator.md, "7. Rational display: feasible, and cheap once
exactness is known"): a setting under which an exact value is written as
a fraction in lowest terms, `1 m = (5000/127) in` rather than
`≈ 39.370079 in`, and nothing in the core changes what it computes.

## The problem

The decimal display writes a value's digits, rounded to the Digits
setting in the rounding mode, and says `=` only when the radius is zero
and every digit held is shown (D7, the plan's 1.9 and 2.4). An exact
value with more digits than Digits is written with `≈` and no note:
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

With the setting on, a value is written as follows, in this order:

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
   trailing zeros moved into the exponent, fit within Digits, and says
   `≈` otherwise; a fraction of denominator one would add nothing.
3. **An exact value that is not an integer is written as its fraction in
   lowest terms, `=`, when the numerator and the denominator each have
   at most Digits digits:** `= 5000/127`, `= 1/3`, `= 127/50` for
   `2.54`, `= 25146/15625` for `1.609344`, `= 1/10000000` for `1e-7` at
   eight digits. The fraction is the ordinary one, the value's power of
   ten multiplied back in (`toRational` on the `Scaled` form of D13), so
   the setting never shows the canonical mantissa and exponent, which are
   how the value is stored and not what it is. A negative value's sign is
   on the numerator, `-5000/127`.
4. **An exact value whose fraction does not fit is written by the decimal
   display,** which says `=` where its own rule allows and `≈` otherwise:
   `1.5e-999999999` is `= 1.5e-999999999`, its fraction having a
   billion-digit denominator and its decimal every digit of the value;
   `5000/127` at three digits is `≈ 39.4`; `(1/3) * 1e30` at eight is
   `≈ 3.3333333e+29`. These are the plan's exponent notation for a short
   mantissa with a large exponent and its third outcome, an exact value
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

The fit rule of rule 3 is provisional, firm for stage 5 and open to a
study after it ([#91](https://github.com/bsidhom/pwa-units/issues/91)).
Digits is the one measure of line length the user already sets, and a
fraction of two parts within it is about as long as a decimal at it; a
fixed constant, a bound on the total length, or a setting of its own are
the alternatives the study weighs. Whatever it decides, the fallback
stays the decimal display, and the rule stays a function of the value
and the settings alone, never of Most bits: values legal under the range
limit run to 15,634 digits (`3^32767`) and further at a raised limit, so
the range limit is not a display rule.

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
each within Digits digits, so within the hard bound on a literal's
mantissa and, since the value was formed within Most bits, within the
range limit when divided (D19). It evaluates to the value it was written
from, exactly.

A decimal the fallback writes is the decimal display's, and stage 4 and
the hardening phase made those parse back: the exponent written is the
value's decimal exponent, the mantissa normalized, never the canonical
`exp` (D17), and a value within the bound has a decimal exponent within
`±10^18`, which `parseDecimal` accepts at the bound (`1e-1000000000000000000`
parses). One literal is the exception: a value whose decimal exponent is
exactly `10^18` and whose rounding at Digits carries into the next power
of ten, `9.5e1000000000000000000` at one digit, is written
`1e+1000000000000000001`, which names a value past the bound and is
refused when typed back, as `overflow`. The display writes it anyway:
it is what the rounding mode gives, and every alternative either shows
digits that were not asked for or rounds in a mode the user did not
choose. The value shown is the correctly rounded one; the refusal on
typing it back is the arithmetic's, and right.

## A zero's bound at the edges

A ball that contains zero without being it is written as `0` with a
bound, `≈ 0 (within 2e-30 of zero)`, the bound being at or above the sum
of the midpoint's magnitude and the radius, rounded up to one digit
(`zeroBound`, the plan's 2.4). Nothing holds a radius to the exponent
bound, so a power of a ball around zero can carry the bound's exponent
far below it, and the power `(approx(1e20) - approx(1e20))^1e100000` is
written with a bound whose exponent has 100,004 digits
([#67](https://github.com/bsidhom/pwa-units/issues/67)).

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

The setting applies in decimal mode as it does in exact mode, and shows
fewer fractions. Every result there is rounded to Digits in the rounding
mode (D15, the plan's 4.5), and a value that fit the digits without
rounding is exact, radius zero, while one that did not is inexact by the
rounding: `1/4` at eight digits is `= 1/4`, `2.54 cm` is `= (127/50) cm`,
and `1/3` is `≈ 0.33333333`. Nothing else changes: the decimal display's
answers in decimal mode are what they were, and a fraction in decimal
mode always fits, its numerator and denominator being within a rounded
mantissa's digits or a power of ten of Digits digits or fewer.

The reciprocal line is computed outside the pipeline today
([#92](https://github.com/bsidhom/pwa-units/issues/92)), so in decimal
mode its value is the exact quotient, unrounded: `3 m` in `m` would show
`= 1/3 × 3 m` under the setting where the mode's rounding should make
`1/3` inexact. That is #92's to fix, by computing the line as the
conversion the other way round; the display's rule is right on the ball
it is handed.

## Where it goes

- `src/core/display.ts`: `show(ball, digits, mode, fractions)`; the
  `exact` kind gains `fraction: true` when its text is a fraction; a
  helper writes the fraction from the `Scaled` midpoint and says whether
  it fits; `zeroBound` clamps the bound's exponent at `-10^18`.
- `src/settings.ts`: a sixth field, `fractions`, a boolean, `false` by
  default, stored with the rest and read as the others are. It is not
  part of the `NumberContext`, which the core takes: nothing in the core
  reads it but `show`, which takes it as an argument.
- `src/unit-converter.ts`: a `fractions` property beside the context;
  `line`, `listResult` and the function line pass it to `show`, and
  parenthesize a fraction that a unit or the reciprocal's `×` follows.
- `src/app-shell.ts`: the checkbox, labeled "Show reduced fractions", with
  the hint "An exact value that is not a whole number is written as a
  fraction in lowest terms when both parts fit within Digits; inexact
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
- **A mixed form** (`39 + 47/127`) or a fraction with an exponent
  (`1e+999999999/3`) for an exact value whose fraction does not fit. The
  decimal display is the fallback; #91's study may reconsider.
- **A fraction for the counts of a unit list**, which are integers by
  construction, or for a `have` echoed back, which is the user's text.
- **Anything in the core's arithmetic.** The setting reaches `show` and
  the component and nothing below them.
