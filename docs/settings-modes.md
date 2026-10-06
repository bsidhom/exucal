# Mode, rounding and fractions: one choice, one meaning each

The design note for S2 of docs/settings-plan.md. Four of the plan's
problems are about how the mode, the rounding mode, Digits and the
fractions display read together: decimal mode and the fractions display
promise opposite things and are both on at once (P4, #97); whether a
value is a fraction depends on Digits, so a user who raises Digits to
see a longer fraction changes every decimal line (P5, #91); Digits means
four things (P6); and the rounding mode means two, with a default no
line explains (P8). This note settles each, and the names of the modes
(P12, the mode half). It changes the stored shape, which S1's version
and migrations make possible, and it touches the core in one place, the
display rule, where the fit of a fraction is decided.

## Three states, not four

The mode and the fractions display are two controls with four
combinations, and one of the four is incoherent. Decimal mode rounds
every step to Digits in the rounding mode, so that almost nothing it
produces is exact; the fractions display writes an exact value entire.
Together they show decimals with the occasional fraction, for a value
the rounding happened to leave exact (`m / (4 m) = 1/4`, `1 in = (127/50)
cm`, where `1 m ≈ 39.370079 in`), and no line says which rule produced
it. #97 rules the two exclusive, and leaves the shape open: a third mode
value, or a checkbox that decimal mode disables.

Three shapes were weighed:

- **A checkbox disabled in decimal mode, read as off.** The stored
  boolean stays, so the preference survives a trip through decimal mode
  and back. But the stored object can then hold a state that means
  nothing (`mode: "decimal", fractions: true`), every reader of the two
  fields must know the rule that makes it inert, and the rule is the
  first consistency rule on the settings that is not a clamp.
- **A nested choice,** `{ kind: "exact", fractions: boolean } | { kind:
"decimal" }`: the flag exists only in the variant it applies to. The
  type is the rule, which is right, and it costs a second control that
  appears and disappears, and a nested stored shape, for three states.
- **One mode with three values.** Three admissible states, three values:
  the type is the rule, the storage holds nothing inert, the panel has
  one control where it had two, and reset is of one field.

The third is the decision. The one thing it loses, that switching to
decimal mode and back forgets the fractions, is one tap to restore and
is the honest reading: the user chose decimal mode, and fractions are a
way of writing exact answers, which decimal mode does not have.

The setting:

```ts
/**
 * How an answer is computed and written: `exact`, every digit shown
 * certain and written as a decimal; `fractions`, exact, and an exact
 * value that fits written entire, as a fraction in lowest terms or a
 * whole number; `decimal`, every step rounded to Digits in the rounding
 * mode, in one pass.
 */
export type Mode = "exact" | "fractions" | "decimal";
```

The `fractions` field goes. What the core takes is unchanged: two of the
three values compute the same way, and the context's mode stays the two
arithmetics of docs/decimal.md, exact and decimal. settings.ts maps the
one to the other, a `Record<Mode, …>` for the arithmetic and one for
whether exact values are written entire, so that a fourth value could
not be added without the compiler asking what it computes and what it
shows. `show` keeps its fourth argument; the shell passes what the
record says.

Nothing about this needs a consistency rule between fields: the three
values are each valid with every value of every other setting, so
`clampSettings` stays a clamp and keeps its name. The question of a
rename, raised in the review of S1, waits for the first rule that is
not a clamp, which this step does not add.

### The stored shape, version 3

```json
{
  "version": 3,
  "savedBy": "…",
  "settings": {
    "digits": 8,
    "rounding": "halfAwayFromZero",
    "mode": "fractions",
    "maxDigits": 1000,
    "maxBits": 65536
  }
}
```

The migration from 2 to 3 is the first that changes meaning: `mode`
becomes `fractions` where the stored mode is `exact` and the stored
`fractions` is `true`, and is carried over unchanged otherwise; the
`fractions` field is dropped. It is total and lax as S1 requires: a
malformed `mode` passes through for the validation to default, and a
`fractions` that is not `true` counts as off. A decimal-mode user with
fractions on, the inert state, lands in decimal mode, which is what they
had: no line of theirs changes.

### Two names for two things

The core's two-valued type is called `Mode` today, named for the user's
control. The user's control now has three values and keeps the name,
since "mode" is what the panel says and what the stored field is called,
and a second name for it would add a vocabulary where P12 asks for one
fewer. The core's own concept is which arithmetic `settle` does, and
`Arithmetic` names it: `"exact" | "decimal"`, the type of the context's
`mode` field, as `RoundingMode` is the type of its `rounding` field. The
rename is of the type and its helpers only, in the ten files that name
them; the field keeps its name, so the forty-odd contexts the tests
write are untouched. The alternative, leaving the core's name and
calling the user's type something else, was set aside for the reason
above.

## Digits: one meaning in each mode

Digits means four things today: the significant digits shown; in
decimal mode the precision of every step; the bound a fraction's parts
must fit; and in decimal mode the digits a typed number is rounded to on
the way in. P6 asks whether it should split, the digits shown apart from
the working precision.

It should not. In exact mode the working precision is not the user's:
the schedule raises it until the digits asked for are certified, and
the only number the user has a say in is how many digits the answer
has. In decimal mode the digits shown and the digits computed are one
number by the mode's definition: a hand calculator with eight digits
computes with eight, and a decimal context has one precision. A second
number in the panel would apply in one mode and would mean, in that
mode, "compute with more digits than you show", which is what exact mode
is for. So Digits is the digits an answer has: in exact mode the app
finds them, and in decimal mode it computes with them.

The rounding of a typed number in decimal mode is that definition
applied to the first step, and is kept, documented rather than
reconsidered: a value in a `p`-digit calculator has `p` digits, and a
literal with more is the one place a value with more could enter. The
radius records the rounding, so nothing is claimed that is not so:
`2.5400001 cm` in `in` at three digits is `≈ 1 in` in both modes, `≈`
because the digits dropped are accounted for. Exempting literals would
carry the extra digits into the first operation and round them there,
one step later, for no gain. The panel's line under Digits says it in
decimal mode, and README says it once.

The fourth meaning, the fit of a fraction, leaves Digits in the next
section, so that after this step Digits has one meaning in each mode
and the mode's line says which.

## Written entire: the fit rule

docs/fractions.md writes an exact value as a fraction when its numerator
and its denominator each have at most Digits digits, and says the rule is
provisional (#91). It couples two unrelated quantities. Digits is a
precision, how many digits a decimal answer carries; the length of a
fraction is a property of the value, and a user has no reason to want
the two to move together. The coupling shows at eight digits:
`1/123456789`, typed by the user, is shown as `≈ 8.1000001e-9`, and
becomes `= 1/123456789` only at nine digits, which also lengthens every
decimal line in the app; `1 m` in `in` at three digits is `≈ 39.4 in`
with fractions on, though `5000/127` is eight characters.

The rule becomes: **in the `fractions` mode, an exact value is written
entire when each of its parts has at most ten digits, the numerator
and the denominator of its fraction in lowest terms, or the one part of
a whole number; otherwise the decimal display writes it, as today.**
Ten is a constant of the display rule, named in display.ts and stated
in README, and it is a judgment as the ceiling's factor of four is
(README, "Why four times the limit plus ten"): two parts of ten digits
are about what a phone's line holds beside the units, and about the
longest fraction anyone reads as one, where two parts of twenty are a
string of digits the decimal display compresses better. It is a bound
on each part rather than on the total because a lopsided fraction, `1`
over fifteen digits, is a power of ten in disguise and the decimal
display writes it shorter and as exactly (`= 1e-15`).

Two things change under it beside the coupling:

- **A whole number is written entire when it fits.** docs/fractions.md
  and D21 send an exact integer to the decimal display, "a fraction of
  denominator one would add nothing", which was true while the bound
  was Digits: an integer that fit the bound fit the display. With the
  bound above Digits it is not, and `3^20` at eight digits, #91's own
  example, is `≈ 3.4867844e+9` for a value that is exactly `3486784401`.
  The mode shows exact values entire; a whole number is the simplest
  case. D21 is amended to say so.
- **Digits no longer decides what is a fraction.** `1 m` in `in` is
  `= (5000/127) in` at three digits as at eight; the decimal lines
  change with Digits, the fractions do not. That is P5's remedy: with
  decimal mode excluded, the rounding mode never meets a fraction, and
  now Digits does not either.

At eight digits, as the examples run today and under the rule:

| Typed             | Today                    | Under the rule              |
| ----------------- | ------------------------ | --------------------------- |
| `1 m` in `in`     | `= (5000/127) in`        | the same                    |
| `1 mi` in `km`    | `= (25146/15625) km`     | the same                    |
| `1/123456789`     | `≈ 8.1000001e-9`         | `= 1/123456789`             |
| `1 lb` in `kg`    | `= 0.45359237 kg`        | `= (45359237/100000000) kg` |
| `1 gal` in `l`    | `≈ 3.7854118 l`          | `= (473176473/125000000) l` |
| `1 oz` in `g`     | `= (45359237/1600000) g` | the same                    |
| `3^20`            | `≈ 3.4867844e+9`         | `= 3486784401`              |
| `2^64`            | `≈ 1.8446744e+19`        | the same, twenty digits     |
| `1e-7`            | `= 1/10000000`           | the same                    |
| `1e-15`           | `= 1e-15`                | the same, sixteen digits    |
| `(1/3) * 1e30`    | `≈ 3.3333333e+29`        | the same                    |
| `1 m` in `in`, 3d | `≈ 39.4 in`              | `= (5000/127) in`           |

The `1 lb` row is the ruling of D21 reaching a longer value: a fraction
over a power of ten where the decimal was exact and shorter. It is what
a user who chose fractions asked for, and the one place the rule may
want revisiting once it is used; the constant is where that revisiting
happens. The last three rows are #95's: a short fraction apart from a
power of ten, which the rule measures as written, so a factored form,
if #95 adopts one, is judged by the parts it writes. #95 stays its own
study, and its decimal-mode clause is gone with the exclusion.

Everything else in docs/fractions.md holds: an inexact value is never a
fraction, the fraction is the ordinary one with the power of ten
multiplied back in, the sign is on the numerator, and the fallback is
the decimal display, which says `=` where its own rule allows. Rule 2
and rule 3 of "The rule" become one rule with the constant, and "The
decimal mode" says that in decimal mode nothing is written entire.

## Rounding: two meanings, said where they apply

The rounding mode rounds the display's last digit in exact mode and
every step in decimal mode. That is D15 and it is right: exact mode
certifies the value and rounds it once, decimal mode is the per-step
rounding the user chose by choosing it. What is wrong is that the
panel's line under Rounding says neither. The lines under Digits,
Rounding and Mode become functions of the mode in force, so that each
says what the setting means now:

- Rounding in exact mode: how the last digit shown is rounded. In
  decimal mode: how every step is rounded, and so the last digit shown.
- Digits in exact mode: the significant digits shown. In decimal mode:
  the significant digits shown and the precision of every step; a typed
  number with more is rounded to them on the way in.

The default, to nearest with ties away from zero, is the hand
calculator's and the schoolroom's, where half-even is IEEE's and
`printf`'s; a converter's users round as they were taught, and the
mode is one choice away for those who want the other. README says so in
one sentence, which it does not today.

One finding came out of running the modes against each other, and it is
recorded here and not fixed in this step. In decimal mode under a
directed rounding mode, every inexact result reports its last digit
uncertain: `1/3` at eight digits under floor is `≈ 0.3333333 (7 of 8
digits are certain)`, and the reciprocal of `1 m` in `in` is `≈ 0.025 ×
1 m (2 of 8 digits are certain)`, where under ties away from zero both
show their eight. The cause is the model, not the settings: a directed
rounding's error is one-sided, the true value lies on one side of the
result, and the ball is symmetric about its midpoint, so it extends as
far on the other side, across the rounding boundary the result sits on,
and D7's "both ends round alike" cannot certify the last digit. In exact
mode nothing of the sort happens, since the ball around an inexact value
is far smaller than a digit and the rounding is the display's. A remedy
would be a one-sided bound in the ball or a certification that knows the
settle's direction, either a change to the core's value model, which is
outside a settings step; an issue records it, with the examples above,
and the panel's line under Rounding does not mention it.

## The names

The modes stay `exact` and `decimal` in the code, the storage and the
docs, with `fractions` beside them. P12 notes that both modes compute
decimals and the first can show fractions; the candidates for a better
pair, "exact" and "rounded", or "certified" and "calculator", each
describe one mode by a property the other also has in part (exact mode's
display rounds; decimal mode's `1 ft` in `in` is certified), and
"decimal" is the name of the arithmetic everywhere else, IEEE 754's
decimal formats, the General Decimal Arithmetic specification, Python's
`decimal`, the study's feature 5. The gain of a rename would be small and
the churn across three design notes, README and ARCHITECTURE.md large.

What changes is how the panel names them. The option text of the Mode
select is the name alone, `exact`, `exact, as fractions`, `decimal`, and
the explanation moves to the line under the select, which says what the
mode in force does; the long option text was the overflow of #147, which
this closes on the way. The three lines:

- exact: every digit shown is certain, found at rising precision, and
  written as a decimal.
- exact, as fractions: as exact, and an exact value that fits is written
  entire, as a fraction in lowest terms or a whole number.
- decimal: every step is rounded to Digits in the rounding mode, as a
  hand calculator does, in one pass.

## Where it goes

- `src/settings.ts`: `Mode` with three values, `MODES` and `isMode` over
  them, the two records that map a mode to the context's arithmetic and
  to whether exact values are written entire; `STORAGE_VERSION` 3 and
  the migration from 2; the `fractions` field removed from `Settings`,
  the defaults, the validation and `saveSettings`.
- `src/core/context.ts`: `Mode` renamed `Arithmetic` with its list and
  `modeOf`, and the files that name them; the field, the values and the
  behavior unchanged.
- `src/core/display.ts`: the fit rule by the constant on each part, over
  fractions and whole numbers alike; the per-part checks of
  `fractionText` keep their shape with the constant in place of
  `digits`, and a whole number within it is `exact` with its digits.
- `src/outcome.ts`: unchanged in logic; the flag it passes to `show`
  comes from the mode.
- `src/app-shell.ts` and `src/unit-converter.ts`: the component's
  `fractions` property is set from the mode's record.
- `src/settings-panel.ts`: the checkbox removed; the Mode select with
  three short options and a line that follows the mode; the lines under
  Digits and Rounding as functions of the settings, which `NUMBER_FIELDS`
  already allows for the numbers and the selects gain.
- Tests: the decimal-mode fraction rows of `display.test.ts` and
  `outcome.test.ts` become digits; the fit tests at the constant,
  including a whole number entire and the rows of the table above; a
  version 2 fixture with each combination of mode and fractions, and
  the totality test over it; the panel's two controls.
- docs: docs/fractions.md ("The rule", "The decimal mode", "Not in this
  design"), D21 amended in docs/calculator-plan.md, README's "Settings"
  for the mode, Digits, Rounding and the fit rule, ARCHITECTURE.md's
  display rule and file table; #97, #91 closed, #95 and #147 updated.

## Done when

- The settings have a `mode` of three values and no `fractions` field; a
  version 2 object with `mode: "exact"` and `fractions: true` loads as
  `fractions`, every other combination as its mode, and the next save
  writes version 3.
- In decimal mode no value is written as a fraction or entire; the
  pipeline's decimal-mode settle of #96 stays.
- In the `fractions` mode an exact value is written entire when each
  part has at most ten digits, whole numbers included, at every Digits;
  `1 m` in `in` is `= (5000/127) in` at three digits, `3^20` is
  `= 3486784401` at eight, and `2^64` is `≈ 1.8446744e+19`.
- The panel has one Mode select with three short options and a line
  that says what the mode in force does; the lines under Digits and
  Rounding say what each means in that mode; nothing in the panel
  overflows a phone's width.
- README's "Settings" says what each mode does, what Digits and
  Rounding mean in each, that a typed number is rounded on the way in
  in decimal mode, why the rounding default is what it is, and the fit
  rule with its constant.
- An issue records the directed-rounding finding in decimal mode.
- `clampSettings` keeps its name, there being no rule that is not a
  clamp.

## Not in this step

- **The precision limit in decimal mode (#86)** and everything about
  the two limits: S3.
- **The panel's layout, grouping and disclosure (P13):** S4. This step
  changes the controls the model requires and no more.
- **A fraction written with its power of ten (#95):** its own study,
  now without a decimal-mode clause.
- **The reciprocal's retry and refusals (#92).**
- **The one-sided error of a directed rounding in decimal mode:** the
  core's value model, recorded as an issue above.
