# The width of a ratio: the fit rule

The design note for step S2c of docs/settings-plan.md, the step the S2
note (docs/settings-modes.md, "The fit rule: retained, and a step of its
own") sent the fit rule to, with #91 and #95 beside it. **Status:
implemented**; "As landed" at the end says what the implementation
settled. It decides when an exact value is written as a ratio and how
long a ratio may be, and nothing else: what is exact is the radius's to
say, as before, and the core computes nothing differently.

## The problem

The ratio notation (docs/fractions.md; D21) writes an exact value that
is not a whole number as its fraction in lowest terms when the numerator
and the denominator each have at most Digits digits, and otherwise falls
back to the decimal display, `≈` where the decimal is inexact. The rule
was provisional from the start (#91), and it has three faults:

- **It couples a length to a precision.** Digits is how many significant
  digits an answer is shown with. A ratio's length is a different
  quantity, and tying the two means that a user who raises Digits to
  see `1/123456789` written as itself (nine digits in the denominator)
  lengthens every decimal line too (P5; #91).
- **It hides exact values.** `3^20` at eight digits is `≈ 3.4867844e+9`,
  though the value is exactly `3486784401` and ten characters long; a
  whole number is the simplest exact value there is, and the notation
  that exists to write exact values entire leaves it rounded. And a
  value whose ratio is short apart from a power of ten, `(1/3) * 1e30`,
  is `≈ 3.3333333e+29` where `1e+30/3` would be exact and shorter (#95).
- **It is hard to anticipate.** Whether a line is a ratio depends on
  the reduced parts of the value against a setting named for something
  else, so a user cannot say from the settings what a line will look
  like, which the owner's review of #95 made the constraint on any rule:
  the output must be predictable from the value and the settings alone.

## The ruling: a width of its own

**The ratio notation carries a width, the most digits a ratio may have,
its numerator and its denominator together, set by the user and
independent of Digits.** It is the S2
note's recommendation, chosen over no bound at all for the reason the
note gave: a bound the user sets is as predictable as none, and it keeps
a line finite, where values legal under the range limit run to 15,634
digits (`3^32767`) and further at a raised limit. The width is a setting
of the notation, which is a setting of exact mode, so it lives where the
S2 note said a richer notation would go, and nowhere else:

```ts
/** How an exact value is written in exact mode: as its digits, or as a ratio whose numerator and denominator have at most `width` digits between them. */
export type Notation =
  | { readonly kind: "digits" }
  | { readonly kind: "ratio"; readonly width: number };
```

The two strings of S2 become the two variants; `digits` carries nothing,
as before. The width's range is `[1, 1000]`: one digit at the bottom,
and at the top a constant, `WIDTH_LIMIT`, a thousand digits, past which
a line is a thousand characters that no one reads. The
bound is the notation's own, not the precision limit's, which caps a
different quantity and which S3 may rename or rework; the two have no
dependence, and nothing about the width is a clamp.

**The default is twenty.** Three candidates were weighed:

- **Eight, Digits' default.** Every line at default settings would read
  as it does today. Set aside: it keeps `3^20` rounded, and it makes the
  default look coupled to Digits though it no longer is.
- **No bound.** The owner's other candidate, every exact value written
  entire. Set aside as the default for the cost above, and not offered
  as a value of the setting either: the range's top serves a user who
  wants the longest lines the app will write, and a second variant for
  "unbounded" would be a choice that buys nothing a thousand does not.
- **Twenty.** The ratios conversions produce are short (`5000/127` is
  seven digits, `1250/381` seven, `25146/15625` for the mile in
  kilometers ten); the whole numbers a user forms by hand (`2^64` is
  twenty digits, `20!` nineteen) fit; and twenty digits is about the
  most a person reads as a number rather than copies. Chosen.

## The rule

With the notation `ratio` at width `W`, and Digits `p`, a value is
written as follows, in this order. Rules 1 and 5 are docs/fractions.md's
rules 1 and 4 unchanged; rules 2, 3 and 4 replace its rules 2 and 3.

1. **An inexact value is written by the decimal display at `p`, `≈`.**
   The notation writes exact values, and a ratio of what is held after
   `sqrt(2)` would be honest and useless (docs/fractions.md).
2. **An exact whole number is written entire when it has at most `W`
   significant digits,** by the decimal display at `W` digits, which
   writes every digit it is given and moves trailing zeros into an
   exponent only past `W` places: `= 3486784401` for `3^20`,
   `= 18446744073709551616` for `2^64`, `= 500000000000` for `5e11`,
   `= 1e+20` for `10^20` (one significant digit, an exponent of twenty).
   One with more goes to rule 5: `2^100` at eight digits is
   `≈ 1.2676506e+30`. This is the S2 note's point that a whole number
   should follow the same width as a ratio's part: a ratio of
   denominator one is the simplest case of the notation, and it is
   written as a number because `3486784401/1` would say the same thing
   worse. Its digits are the whole of the width, as a ratio's two parts
   are together.
3. **An exact value that is not a whole number is written as its
   fraction in lowest terms when the numerator and the denominator have
   at most `W` digits between them:** `= 5000/127`, `= 127/50` for
   `2.54`, `= 1/123456789` at any width from ten, `= 1/10000000` for
   `1e-7`. The fraction is the ordinary one, the value's power of ten
   multiplied back in, and a negative value's sign is on the numerator;
   the sign and the slash are not counted. The measure is the two parts
   together, not each part on its own as the fit at Digits measured and
   as the S2 note recommended; the owner ruled for the total in the
   review of this note, and the reason is what the width stands for. A
   width is a bound on the line, and the digits of the two parts
   together are, to within the slash, the characters the value takes
   on it; a bound per part would let "twenty" admit a ratio of forty
   digits, which no one reading the setting expects. The lopsided case
   the S2 note raised, `1` over fifteen digits, comes out as it should:
   it is sixteen digits long, and a width of twenty admits it because
   it is that long, where a width of twelve does not.
4. **When that fraction does not fit, the value is written with its
   power of ten factored out of the numerator, `n e k / d`, when the
   parts left, `n` and `d`, have at most `W` digits between them and
   the denominator is not one** (#95), the exponent not counted, as the
   decimal display's exponent is not counted against Digits: `= 1e+30/3` for `(1/3) * 1e30`, `= 5e+33/127` for
   `(5000/127) * 1e30`, `= 1e-30/3` for `(1/3) * 1e-30`,
   `= 1e+999999999/3` for `1e999999999/3`. The parts are the value's
   canonical mantissa and exponent (scaled.ts: the numerator not
   divisible by ten, the denominator coprime to ten, in lowest terms),
   which is the one form in which the power of ten is all on one side;
   the power is always the numerator's, since `1e+30/3` parses back as
   `(1e30) / 3`, the value, and `1/3e+30` would be `1 / (3e30)`, another.
   The rule meets #95's condition, that the power is factored only
   where it shortens: rule 3 comes first, so a ratio that fits without
   an exponent is written without one (`1/10000000`, never `1e-7/1`),
   and the form appears only for a ratio that would otherwise fall to
   the decimal display. A denominator of one is excluded because the
   value is then a whole number or a terminating decimal, `n × 10^k`,
   which the decimal display writes exactly in the same characters
   (`1.5e-999999999`), and `15e-1000000000/1` would be the same value
   wearing a slash.
5. **Everything else is written by the decimal display at `p`,** which
   says `=` where its own rule allows and `≈` otherwise:
   `= 1.5e-999999999`, `= 2.54` for `2.54` at a width of four (its ratio
   `127/50` being five digits, and its decimal exact), `≈ 39.4` for
   `5000/127` at a width of three and three digits, `≈ 1.2345679` for a
   terminating decimal of twenty-one digits at a width of twenty.

So the width is the most digits of any exact value written entire, a
whole number or a ratio's two parts together, and Digits is the digits
of everything else. A user can read a line from the settings: a ratio
appears when its digits fit the width, a long whole number when its
digits fit the width, and a decimal at Digits otherwise; and the width
is, to within a sign, a slash and an exponent, how many characters that
value will take. Where a ratio is written on a line
(parenthesized before a unit or the reciprocal's `×`, bare alone, term
by term in a unit list) is docs/fractions.md's and is unchanged; a ratio
in the exponent form is parenthesized like any other, `(1e+30/3) in`.

Two forms #91 asks about are ruled out. A **mixed form**, `39 + 47/127`,
does not parse back as it reads before a unit (`39 + 47/127 in` is
`39 + (47/127) in`, a sum that does not conform), and it writes the
value in three numbers where the ratio writes it in two. An **exponent
form with a fractional mantissa**, `1.5e-999999999` for a value whose
ratio does not fit, is rule 5 already: the decimal display's.

## The panel

Under the notation's radio buttons, when `ratio` is chosen, as the
extended count appears beside "extended" in decimal mode:

```
Notation      ( ) digits
              (•) ratio    Width [ 20 ]
              an exact value that is not a whole number is written as a
              ratio of two whole numbers in lowest terms when the two have
              at most the width in digits between them; a whole number is
              written entire when it fits the width; anything longer is a
              decimal at Digits.
```

- The width's input appears with `ratio` and is absent with `digits`,
  since there is nothing to set; its range is `[1, 1000]`, and a value
  outside it snaps back as the other number inputs do. Choosing `ratio`
  again in a session offers the last width, as "extended" offers the
  last count, and the default otherwise.
- The input is labeled "Ratio width" for assistive technology, and the
  line under Notation says the rule in the words above.
- README's "Settings" entry for the notation gains the width, the
  examples `3^20 = 3486784401` and `(1/3) * 1e30 = 1e+30/3`, and the
  sentence that the width is the one thing that decides whether a line
  is a ratio.

## The stored shape, version 4

```json
{
  "version": 4,
  "savedBy": "…",
  "settings": {
    "digits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": { "kind": "ratio", "width": 20 } },
    "maxDigits": 1000,
    "maxBits": 65536
  }
}
```

The migration from 3 to 4 reshapes the notation inside an exact mode:
the string `"digits"` becomes `{ "kind": "digits" }` and the string
`"ratio"` becomes `{ "kind": "ratio", "width": 20 }`, the default width,
since no earlier build stored one; a decimal mode passes through
untouched, and a notation that is neither string passes through for the
validation to default, as S1 requires. The validation of version 4
accepts a notation only when it is an object whose kind is one of the
two and, for `ratio`, whose width is an integer in its range, defaulting
the whole notation otherwise; the width has no dependence on another
setting, so `clampSettings` does not touch it.

## Where it goes

- `src/core/display.ts`: `show(ball, digits, mode, width?)`, the fourth
  argument the ratio's width in place of the flag, absent meaning the
  notation `digits`; `fractionText` takes the width and gains the
  exponent form of rule 4; the whole-number rule 2 formats at the width;
  the `exact` kind keeps `fraction: true` for a ratio in either form, so
  that the outcome parenthesizes it.
- `src/outcome.ts`: the width in place of the flag, passed to `show` in
  exact mode alone, the guard unchanged in substance; the reciprocal
  and the list's remainder follow.
- `src/unit-converter.ts`: the `fractions` property becomes the width,
  `ratioWidth`, absent for `digits`; `src/app-shell.ts` passes it from
  the settings (`ratioWidthOf(settings)` in place of `showsRatios`).
- `src/settings.ts`: `Notation` as above, `WIDTH_LIMIT`, `DEFAULT_WIDTH`,
  the validation, `STORAGE_VERSION` 4 and the migration from 3; the
  ranges gain `width`.
- `src/settings-panel.ts`: the width's input beside the `ratio` radio
  button, and the line under Notation.
- Tests: `show` at several widths over the rows above and #95's table,
  a ratio that fits either way, a whole number at and past the width,
  the denominator-one exclusion; the outcome's lines with the exponent
  form before a unit and in a list; a version 3 fixture for each
  notation and for decimal mode; the panel's input present with `ratio`
  alone.
- Docs: docs/fractions.md ("The rule" rewritten to the five rules
  above, "Not in this design" losing the exponent form, "Where it goes"
  noting the width), D21 amended by D28 below, docs/settings-storage.md
  (version 4), README, ARCHITECTURE.md ("The display rule"); #91 and
  #95 closed, P5 closed.

## D28, proposed

**D28. The ratio notation has a width of its own, the most digits a
ratio, its two parts together, or a whole number may have to be written
entire, twenty by default and independent of Digits; a ratio that does
not fit is written with its power of ten factored onto the numerator
when its parts then fit and its denominator is not one, and otherwise
the value is a decimal at Digits (S2c of docs/settings-plan.md; amends
D21).** docs/ratio-width.md is the design. D21's fit at Digits coupled
a length to a precision, hid exact whole numbers and short ratios of
large magnitude, and could not be read off the settings; the width is
one number that decides what is written entire. The measure is the two
parts together, the sign, the slash and the exponent of the factored
form not counted, since the width stands for the characters a value
takes on the line (ruled by the owner in the review of the note, over
the per-part measure the S2 note recommended); a mixed form and a
fractional mantissa are ruled out; an approximating fraction for an
inexact value stays ruled out.

## Not in this step

- **An approximating fraction for an inexact value** (`355/113` for
  `pi()`), ruled out by D21 and not reopened.
- **The limits and their names (S3)**, including whether the width's
  constant top should become a setting's; nothing here depends on it.
- **The panel's layout (S4, S5).** This step adds one input beside one
  radio button and no more.

## As landed

- **`show(ball, digits, mode, width?)`** in display.ts, the width in
  place of the flag; `ratioText` writes the fraction and then the
  factored form, and the whole-number rule formats at the width. The
  outcome, the converter (`ratioWidth`) and the shell carry the width,
  and the outcome still withholds it in decimal mode.
- **Rule 4 reaches further than the examples showed.** The canonical
  mantissa strips a numerator's tens into the exponent, so `5000/127`
  at a width below seven is `5e+3/127`, not the decimal: the ratio
  does not fit plainly, and the factored form does. That is the rule
  as ruled, where the power is factored only when the ratio would
  otherwise fall to the decimal display, and the tests record it; a
  user who finds `5e+3/127` odd at a width of six has set a width
  below any ratio that conversions produce.
- **The reciprocal of a ratio** is often a terminating decimal and is
  written so (`in = 0.0254 × 1 m` beside `1 m = (5e+3/127) in`), since a
  denominator of one is excluded from the factored form; `127/5000`
  appears when the width admits the plain fraction.
- **The settings** hold the notation as `{ kind: "digits" }` or
  `{ kind: "ratio"; width }`, with `DEFAULT_WIDTH` twenty and
  `WIDTH_LIMIT` a thousand; `rangesOf` gives the width's range beside
  the others, and nothing clamps it. The panel offers the last width
  when `ratio` is chosen again in a session, as "extended" offers the
  last count.
- **The S2 note's forecast** that the two notation strings would become
  `{ kind: "digits" } | { kind: "ratio"; width: number }` "here and
  nowhere else" held: the mode's shape and decimal mode's variant are
  untouched.
