# The ratio notation

In exact mode an exact value may be written entire, as a whole number or
as a ratio of two whole numbers in lowest terms, rather than as its
digits rounded to the display digits: `1 m = (5000/127) in` rather than
`≈ 39.370079 in`. The notation is a setting of exact mode (`digits`, the
default, or `ratio` with a width; [settings.md](settings.md)), and it is
a display alone: the value is what the pipeline computed, the radius
says whether it is exact, and the setting says how an exact value is
written. The two displays never disagree about what is exact, since
both read the radius, and nothing in the core computes differently under
either.

The decimal display writes a value's digits, rounded to the display
digits in the rounding mode, and says `=` only when the radius is zero
and every digit held is shown. An exact value with more digits than the
display digits is written with `≈` and no note: `1 m` in `in` is
`≈ 39.370079 in`, though the value is exactly `5000/127` inches, and
`1/3` is `≈ 0.33333333`. The display is right that the digits shown are
not the whole value, and it has no way to show the whole value, which
has no last digit. A ratio has: `5000/127` is the value entire, in ten
characters, and it parses back as the same value.

## The rule

With the notation `ratio` at width `W`, and the display digits `p`, a
value is written as follows, in this order:

1. **An inexact value is written by the decimal display at `p`, `≈`,**
   whatever the notation. After `sqrt(2)` at eight digits the midpoint
   held is `141421356237309504880 / 10^20`, a true fraction of what is
   held and no truth about `sqrt(2)`; writing it would be honest and
   useless. The decimal display's kinds and notes are unchanged.
2. **An exact whole number is written entire when it has at most `W`
   significant digits,** by the decimal display at `W` digits, which
   writes every digit it is given and moves trailing zeros into an
   exponent only past `W` places: `= 3486784401` for `3^20`,
   `= 18446744073709551616` for `2^64`, `= 500000000000` for `5e11`,
   `= 1e+20` for `10^20`. One with more goes to rule 5: `2^100` at eight
   digits is `≈ 1.2676506e+30`. A ratio of denominator one is the
   simplest case of the notation, written as a number because
   `3486784401/1` would say the same thing worse, and its digits are the
   whole of the width, as a ratio's two parts are together.
3. **An exact value that is not a whole number is written as its
   fraction in lowest terms when the numerator and the denominator have
   at most `W` digits between them:** `= 5000/127`, `= 127/50` for `2.54`,
   `= 1/123456789` at any width from ten, `= 1/10000000` for `1e-7`. The
   fraction is the ordinary one, the value's power of ten multiplied back
   in (`toRational` on the `Scaled` form), so the notation never shows
   the canonical significand and exponent, which are how the value is
   stored and not what it is; a negative value's sign is on the
   numerator; the sign and the slash are not counted. The measure is the
   two parts together, not each on its own: a width is a bound on the
   line, and the digits of the two parts together are, to within the
   slash, the characters the value takes on it, where a bound per part
   would let "twenty" admit a ratio of forty digits, which no one reading
   the setting expects. A lopsided ratio, `1` over fifteen digits, is
   sixteen digits long, and a width of twenty admits it because it is
   that long, where a width of twelve does not.
4. **When that fraction does not fit, the value is written as a ratio
   times a power of ten, `n/d × 1e+k`, when the parts `n` and `d` have at
   most `W` digits between them and the denominator is not one,** the
   power not counted, as the decimal display's exponent is not counted
   against the display digits: `= 1/3 × 1e+30` for `(1/3) * 1e30`,
   `= 5/127 × 1e+33` for `(5000/127) * 1e30`, `= 1/3 × 1e-30`,
   `= 1/3 × 1e+999999999` for `1e999999999/3`. The parts are the value's
   canonical significand and exponent, the one form in which the power
   of ten is all in one factor. The power is written after the ratio as a
   multiplier, so that the line reads as the ratio scaled and parses back
   left to right as `(1/3) × 1e30`; a power inside the numerator,
   `1e+30/3`, reads as a decimal over a number. Rule 3 comes first, so a
   ratio that fits without a power is written without one
   (`1/10000000`, never `1/1 × 1e-7`), and the form appears only for a
   ratio that would otherwise fall to the decimal display. A denominator
   of one is excluded because the value is then a whole number or a
   terminating decimal, `n × 10^k`, which the decimal display writes
   exactly in the same characters (`1.5e-999999999`), and `15/1 ×
1e-1000000000` would be the same value wearing a slash.
5. **Everything else is written by the decimal display at `p`,** which
   says `=` where its own rule allows and `≈` otherwise:
   `= 1.5e-999999999`, `= 2.54` for `2.54` at a width of four (its ratio
   `127/50` being five digits, and its decimal exact), `≈ 39.4` for
   `5000/127` at a width of three and three digits, `≈ 1.2345679` for a
   terminating decimal of twenty-one digits at a width of twenty.

So the width is the most digits of any exact value written entire, a
whole number or a ratio's two parts together, and the display digits are
the digits of everything else; the width is the one thing that decides
whether a line is a ratio, and a user can read a line from the settings
alone, which is the constraint on any rule here: the output must be
predictable from the value and the settings, never from anything
internal to the calculation. Rule 4 reaches further than its examples
show: the canonical significand strips a numerator's tens into the
exponent, so `5000/127` at a width below seven is `5/127 × 1e+3`, not the
decimal, since the ratio does not fit plainly and the scaled form does; a
user who finds that odd at a width of six has set a width below any
ratio that conversions produce. The reciprocal of a ratio is often a
terminating decimal and is written so (`in = 0.0254 × 1 m` beside `1 m =
(5/127 × 1e+3) in`), since a denominator of one is excluded from the
scaled form.

Exactness is the ball's radius being zero, the same test as `=`, and the
rounding mode plays no part in a ratio, which is not rounded. A value the
decimal display could write exactly (`2.54`, `1.609344`, `1e-7`) still
becomes a ratio under the notation (`127/50`, `25146/15625`,
`1/10000000`): the notation shows ratios for understanding as much as for
exactness, and a user who asks for them asks to see them. The
alternative, a ratio only where the decimal is inexact, has one property
to recommend it, that the setting only ever turns a `≈` line into a `=`
line, and was set aside.

**The width.** The width is the notation's own, in `[1, 1000]`
(`WIDTH_LIMIT`, past which a line is a thousand characters that no one
reads), independent of the display digits and of the precision limit,
and nothing clamps it. Its default is twenty (`DEFAULT_WIDTH`): the
ratios conversions produce are short (`5000/127` is seven digits,
`1250/381` seven, `25146/15625` for the mile in kilometres ten), the
whole numbers a user forms by hand fit (`2^64` is twenty digits, `20!`
nineteen), and twenty digits is about the most a person reads as a
number rather than copies. Eight, the display digits' default, was set
aside because it keeps `3^20` rounded and makes the default look coupled
to the display digits though it is not; no bound was set aside as the
default for its cost, values legal under the significand limit running
to 15,634 digits (`3^32767`) and further at a raised limit, and is not
offered as a value of the setting either, since the range's top serves a
user who wants the longest lines the app will write. The first rule tied
the fit to the display digits, each part fitting within them; that
coupled a length to a precision (a user who raised the display digits to
see `1/123456789` written as itself lengthened every decimal line too),
hid exact values (`3^20` at eight digits was `≈ 3.4867844e+9`, and
`(1/3) * 1e30` was `≈ 3.3333333e+29` where `1/3 × 1e+30` is exact and
shorter), and could not be read off the settings. Whether one uniform
rule should govern digits, ratios and the power of ten in the exact-mode
display is [#178][178].

## Where a ratio is written

Every line the app writes must be typeable back as a `have`, and the
grammar reads a juxtaposition before a quotient: `5000/127 in` is `5000 /
(127 in)`, a frequency. So:

- **Before a unit, the ratio is parenthesized**, `1 m = (5000/127) in`,
  with its sign inside, `-1 m = (-5000/127) in`, which the grammar reads
  as `(-5000) / 127` times `in`, the same value; a ratio times its power
  of ten likewise, `(1/3 × 1e+30) in`.
- **Before the reciprocal's `× 3 ft`, the same:** `in = (1/36) × 3 ft`.
  The grammar would read `1/36 × 3 ft` correctly, `*` and `/` being one
  level read left to right, but the parentheses cost two characters and
  save the reader the rule.
- **Alone, the ratio is bare:** a dimensionless result is `= 1/3`, and
  the argument of a function line is written inside the call,
  `tempC(37) = tempF(493/5)`, where nothing follows it.
- **In a unit list, term by term:** the counts are exact integers and are
  written as they are, and the remainder follows the rule, `1 m = 3 ft +
(428/127) in`. The relation is `=` when every term is exact, so a
  remainder whose ratio does not fit makes the line `≈`, with its
  decimal. An exact remainder whose ratio fits is written entire,
  unrounded, so nothing is rounded and nothing carries; one that does
  not fit takes `roundTerms` as any remainder does.

`show` says which it wrote: the `exact` kind carries `fraction: true`
when the text is a ratio in either form, and the power of ten as a
`scale` beside the text, a literal (`1e+3`) the outcome multiplies after
the ratio, so that a later change can render it as `× 10^3` without the
display's text changing shape; the outcome parenthesizes, since only it
knows what follows the value on the line. The copy text is the printer's
with `*`, `(5/127 * 1e+3) in`, which reads back as the value.

## Every literal parses back

A ratio the notation writes is a quotient of two integer literals, each
within the width, so within the hard bound on a literal's significand
and, since the value was formed within the significand limit, within the
limit when divided; it evaluates to the value it was written from,
exactly. A decimal the fallback writes is the decimal display's: the
exponent written is the value's decimal exponent with the significand
normalized, never the canonical `exp`, and a value within the bound has a
decimal exponent within `±10^18`, which the parser accepts at the bound.
One literal is the exception: a value whose decimal exponent is exactly
`10^18` and whose rounding at the display digits carries into the next
power of ten, `9.5e1000000000000000000` at one digit, is written
`1e+1000000000000000001`, which names a value past the bound and is
refused when typed back, as `overflow`. The display writes it anyway: it
is what the rounding mode gives, and every alternative either shows
digits that were not asked for or rounds in a mode the user did not
choose. The value shown is the correctly rounded one; the refusal on
typing it back is the arithmetic's, and right.

## Not in decimal mode

The notation does not apply in decimal mode. Every value there is a
decimal of the display digits, exact under the mode's rounding, which
its digits write entire; a ratio would say nothing the digits do not.
The settings' own shape puts the notation inside exact mode, so the
combination cannot be stored or chosen, and a user who chooses ratios,
visits decimal mode and comes back finds digits, the exact variant being
built afresh with its default: one tap, and the honest reading of the
type, since decimal mode has no notation to remember. The path from the
settings to the display is two values, a `NumberContext` with its mode
and the notation's settings, and nothing in the signatures ties them, so
`outcomeOf` passes the ratio settings to `show` in exact mode alone,
which is what enforces the exclusion at that API, with its test. The
pipeline settles its own quotients in decimal mode (the ratio, a list's
terms, a function's count) and the outcome the reciprocal, as the mode's
one rounding of those steps, so that an exact ratio does not become a
fraction there.

## Not in this design

- **An approximating fraction for an inexact value**, the simplest
  fraction within the ball (`355/113` for `pi()` at seven digits), which
  the radius would make a precise condition: an inexact value is shown as
  a decimal, which says what is known and no more, and a fraction written
  with `≈` reads as a claim the ball does not make.
- **A mixed form** (`39 + 47/127`) for an exact value whose ratio does
  not fit: it does not parse back as it reads before a unit (`39 +
47/127 in` is `39 + (47/127) in`, a sum that does not conform), and it
  writes the value in three numbers where the ratio writes it in two.
- **An exponent form with a fractional significand** for a value whose
  ratio does not fit: that is rule 5 already, the decimal display's.
- **A ratio for the counts of a unit list**, which are integers by
  construction, or for a `have` echoed back, which is the user's text.
- **Anything in the core's arithmetic.** The setting reaches `show` and
  the outcome and nothing below them; it is not part of the
  `NumberContext`.

## Where it lives

- `display.ts`: `show(ball, { digits, rounding, ratio })`, the ratio
  notation's settings (`RatioDisplay`, today the width alone, the place a
  further setting of the notation goes) named beside the digits and the
  rounding; `ratioText` writes the fraction and then the factored form;
  the whole-number rule formats at the width; the `exact` kind's
  `fraction` and `scale`.
- `outcome.ts`: the ratio settings passed to `show` in exact mode alone;
  the parentheses before a unit and the reciprocal's `×`; the reciprocal
  and a list's remainder.
- `unit-converter.ts`: the `ratio` property, absent for `digits`, which
  `app-shell.ts` passes from the settings (`ratioOf`).
- `settings.ts`: `Notation`, `DEFAULT_WIDTH`, `WIDTH_LIMIT`, the width's
  range in `rangesOf`.

[178]: https://github.com/bsidhom/exucal/issues/178
