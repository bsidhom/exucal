# Mode, rounding and fractions: one choice, one meaning each

The design note for S2 of docs/settings-plan.md. Four of the plan's
problems are about how the mode, the rounding mode, Digits and the
fractions display read together: decimal mode and the fractions display
promise opposite things and are both on at once (P4, #97); whether a
value is a fraction depends on Digits, so a user who raises Digits to
see a longer fraction changes every decimal line (P5, #91); Digits means
four things (P6); and the rounding mode means two, with a default no
line explains (P8). This note settles the first, the third and the
fourth, decides the names of the modes (P12, the mode half), and sends
the fit rule to a step of its own with the ideas it has gathered.

**Status: resumed.** The review of the first draft reopened what decimal
mode is, and docs/decimal-mode.md restated it (D26): every operation one
correctly rounded step, every value exact, no radius. That restatement
has landed, with the outcome keeping the fractions display out of decimal
mode until this step moves the exclusion into the settings, so every
place this note leans on D26 now describes the code as it is. The first
draft's ruling of one mode with three values, and its fit rule by a
constant, were set aside in the same review and are recorded below as
weighed; the second review ruled the shape of the mode setting and
named the fit rule's candidates.

## Fractions are a setting of exact mode

The mode and the fractions display are two controls with four
combinations, and one of the four is incoherent. Under D26 the reason is
sharper than #97's: in decimal mode every value is a `p`-digit decimal,
exact, and its digits write it entire; the fractions display exists to
write an exact value entire where its digits would lose it, so in
decimal mode it has nothing to do. The two are exclusive (#97), and the
fractions display is a sub-setting of exact mode: it belongs to that
mode, and the owner's ruling is that the type says so. **A setting that
is possible only in one mode lives inside that mode's variant, so that
the shape of the settings states what is and is not possible.**

```ts
/** How an exact value that is not a whole number is written: as its digits, or as a ratio of two whole numbers in lowest terms. */
export type Notation = "digits" | "ratio";

/** The mode and what belongs to it: exact mode carries the notation of its exact values; decimal mode carries nothing. */
export type ModeSetting =
  | { readonly kind: "exact"; readonly notation: Notation }
  | { readonly kind: "decimal" };
```

The discriminant is the core's `Mode`, the two arithmetics, so that
`settings.mode.kind` is what `contextOf` hands the context and no
mapping is needed; the core's type keeps its name and the first draft's
rename to `Arithmetic` is dropped.

The choice inside exact mode is a two-valued enumeration, not a boolean,
by the house rule that a choice is named by its values. The two obvious
names are both taken in the settings' vocabulary: "decimal" is the other
mode, and "fraction" is what the setting has been called ("Show reduced
fractions"), so neither can name one side without a collision. The
values chosen are `digits`, the value's decimal expansion as the display
writes it today, and `ratio`, two whole numbers in lowest terms, which is
what `5000/127` is; "rational" was the alternative (the study's own
name, "Rational display") and was set aside as a word about the number
rather than about how it is written. The user-facing words follow:
README speaks of writing an exact value as its digits or as a ratio, and
"a fraction in lowest terms" stays as the explanation of what a ratio
is. `Notation` is the place a richer setting goes when the fit rule's
step adds one (below): `{ kind: "digits" } | { kind: "ratio"; width:
number }` would replace the two strings here and nowhere else.

Two other shapes were weighed:

- **One mode with three values**, `exact | fractions | decimal`, the
  first draft's ruling. Set aside by the owner: the fractions display is
  not a mode but a way of writing exact mode's answers, and a flat
  enumeration says the three are peers.
- **Two fields, the second scoped to the first,** `mode` and `fractions`
  as today, with the checkbox shown only in exact mode and the stored
  `fractions` remembered through a visit to decimal mode. It keeps the
  stored shape and the preference, and it was set aside by the owner
  because the type then admits a state, `decimal` with `fractions`,
  that the app must know to ignore; the shape should not say what the
  rule then has to unsay.

What the nested shape costs is that preference: a user who chooses
ratios, visits decimal mode and comes back finds digits, since the exact
variant is built afresh with its default. That is one tap and is the
honest reading of the type: decimal mode has no notation to remember.
The panel presents the mode as a select on `kind` and, under it, the
notation's control when the kind is `exact`; whether that control is a
second select or a checkbox labeled for the `ratio` value is the panel's
to choose, and S4's to revisit.

Nothing about this needs a consistency rule between fields: every
`ModeSetting` is valid with every value of every other setting, so
`clampSettings` stays a clamp and keeps its name; the question of a
rename, raised in the review of S1, waits for the first rule that is not
a clamp. `resetSetting("mode")` resets the whole variant, and
`isDefault` compares the field by value, since it is no longer a
primitive.

### The stored shape, version 3

```json
{
  "version": 3,
  "savedBy": "…",
  "settings": {
    "digits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": "ratio" },
    "maxDigits": 1000,
    "maxBits": 65536
  }
}
```

The migration from 2 to 3 is the first that changes meaning. It builds
`mode` from the two stored fields, `{ kind: "decimal" }` when the stored
mode is `decimal` and `{ kind: "exact", notation }` otherwise, with
`notation` `ratio` when the stored `fractions` is `true` and `digits`
for anything else; it drops the stored `fractions`; and it carries the
rounding default's change (below) in the same step. It is total and lax
as S1 requires: a stored mode that is neither value passes through for
the validation to default, and the validation of version 3 accepts a
`mode` only when it is an object whose `kind` is one of the two and,
for `exact`, whose `notation` is one of its two values, defaulting the
whole field otherwise.

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
number by the mode's definition, and under D26 literally so: every value
is a `p`-digit decimal. A second number in the panel would apply in one
mode and would mean, in that mode, "compute with more digits than you
show", which is what exact mode is for. So Digits is the digits an
answer has: in exact mode the app finds them, and in decimal mode it
computes with them.

The rounding of a typed number in decimal mode is that definition
applied to the first step, and is kept, documented rather than
reconsidered: a value in a `p`-digit calculator has `p` digits, and a
literal with more is the one place a value with more could enter.
`2.5400001 cm` in `in` at three digits is `= 1 in` (D26; before it, `≈ 1
in` with the rounding in the radius). Exempting literals would
carry the extra digits into the first operation and round them there,
one step later, for no gain. The panel's line under Digits says it in
decimal mode, and README says it once.

The fourth meaning, the fit of a fraction, is the next section's, and
whether it leaves Digits is that step's to decide.

## The fit rule: retained, and a step of its own

docs/fractions.md writes an exact value as a fraction when its numerator
and its denominator each have at most Digits digits, and otherwise falls
back to the decimal display. The rule is provisional (#91). The first
draft of this note replaced it with a constant of ten digits per part;
the review did not follow it, and the ruling is to **retain the current
behavior** in S2 and decide the fit rule in a step of its own, after
this one, with #95 beside it.

The owner's two candidates, which that step chooses between, and the
constraint on both: the display must be predictable from the value and
the settings alone, never from anything internal to the calculation.

- **A width setting.** A stored field, a sub-setting of the fractions
  display inside the exact variant above (`{ kind: "on"; width: number
}`), giving the most digits a fraction's part may have; a fraction
  within it is written, one past it falls back to the decimal display
  as today. Digits plays no part. The default is the one number to
  choose; Digits' default of eight, or something more generous, say
  twenty, are the candidates.
- **No bound.** With the display on, every exact value that is not a
  whole number is written as its fraction in lowest terms, whatever its
  length. The ground: the display applies in exact mode only, the radius
  says which values are exact, and every bit of the value is in hand.
  The cost: values legal under the range limit run to 15,634 digits
  (`3^32767`) and further at a raised limit, so a line can be tens of
  thousands of characters, wrapped; the copy button copies it
  faithfully.

This note's recommendation is the first, the width setting, for the
reason the second's cost gives: a bound the user sets is as predictable
as no bound, and it keeps the line finite. The second is the first with
the width unbounded, and the step may offer that as a value of the
setting if it is wanted. Neither depends on anything internal. Beside
them, the step settles three smaller points, gathered here so that
nothing is lost:

- **Whole numbers.** docs/fractions.md and D21 send an exact integer to
  the decimal display, which writes it entire only when it fits Digits:
  `3^20` at eight digits is `≈ 3.4867844e+9` with fractions on, for a
  value that is exactly `3486784401`. If the display's purpose is exact
  values entire, a whole number is the simplest case and should follow
  the same width as a fraction's part. #91 raises the example.
- **Per part or in total.** Whether the width bounds each part, as
  today's rule does, or the fraction's total length. A lopsided
  fraction, `1` over fifteen digits, is a power of ten in disguise that
  the decimal display writes shorter and as exactly (`= 1e-15`), which a
  per-part width excludes and a total width of the same size admits.
  Per part is today's measure and the recommendation.
- **A power of ten factored out (#95)**: `1e+30/3` for a third of
  `1e30`, where the fraction's parts are short apart from the power of
  ten. The same study from the other side, which #95 asks be decided
  together with the fit; whatever the width measures, it measures the
  text as written.

For the record, the first draft's proposal was a constant of ten digits
per part, independent of Digits and of any setting, whole numbers
included; it was a bound like the width setting's with the width fixed
by the app rather than the user, and it is superseded by the setting.
What the coupling to Digits costs today, which either candidate
removes: `1/123456789`, typed by the user, is `≈ 8.1000001e-9` at eight
digits and `= 1/123456789` at nine, which also lengthens every decimal
line, and `1 m` in `in` at three digits is `≈ 39.4 in` with fractions
on though `5000/127` is eight characters.

Until that step, S2 leaves `show`'s fit at Digits, and P5's remedy is
the exclusion alone: the rounding mode never meets a fraction, since
fractions are exact mode's and exact mode rounds only the display.

## Rounding: half-even by default, two meanings said where they apply

**The default changes to ties-to-even.** The owner never intended
ties-away-from-zero as the default; `halfEven` is IEEE 754's default,
`printf`'s and the decimal libraries', and it is unbiased over many
roundings where ties-away drifts. `DEFAULT_ROUNDING` in context.ts
changes, the tests that compute at the default follow, and README's
example (`0.125` at two digits is `0.13`) becomes `0.12`. What to do
with stored settings is the one question: `saveSettings` writes every
field on every change, so a stored `halfAwayFromZero` is the old default
echoed by a save of some other setting far more often than a choice.
Two options:

- Leave stored values alone. Every user who ever changed any setting
  stays on ties-away, a default the owner did not intend, until they
  find the control.
- Migrate `halfAwayFromZero` to `halfEven`, version 2 to 3. The few who
  chose ties-away deliberately are moved off it once, with the control
  one tap away, and the first migration that changes a value exercises
  S1's mechanism on the simplest possible change.

The note recommends the migration, which rides in the version 3
migration the mode's shape needs in any case. Either way README gains
the sentence the default lacks: which it is and why.

**Two meanings.** The rounding mode rounds the display's last digit in
exact mode and every step in decimal mode. That is D15's exact-mode half
and D26's decimal mode, and it is right; what is wrong is that the
panel's line under Rounding says neither. The lines under Digits,
Rounding and Mode become functions of the mode in force, so that each
says what the setting means now:

- Rounding in exact mode: how the last digit shown is rounded. In
  decimal mode: how every step is rounded, the last digit shown with it.
- Digits in exact mode: the significant digits shown. In decimal mode:
  the significant digits of every value, a typed number with more being
  rounded to them on the way in.

The first draft recorded a finding here, that in decimal mode under a
directed rounding mode every inexact result reported its last digit
uncertain (`1/3` at eight digits under floor was `≈ 0.3333333 (7 of 8
digits are certain)`), because a one-sided rounding error sat in a
symmetric ball. D26 removes the radius from decimal mode and the finding
with it: `2 / 3` under `towardZero` is `= 0.66666666`. It needs no
issue.

## The names

The modes stay `exact` and `decimal` in the code, the storage and the
docs. P12 notes that both modes compute decimals and the first can show
fractions; the candidates for a better pair, "exact" and "rounded", or
"certified" and "calculator", each describe one mode by a property the
other also has in part (exact mode's display rounds; decimal mode's
`1 ft` in `in` is certified), and "decimal" is the name of the
arithmetic everywhere else, IEEE 754's decimal formats, the General
Decimal Arithmetic specification, Python's `decimal`, the study's feature
5, and under D26 it is that arithmetic exactly. The gain of a rename
would be small and the churn across the design notes, README and
ARCHITECTURE.md large.

What changes is how the panel names them. The option text of the Mode
select becomes the name alone, `exact` and `decimal`, and the
explanation moves to the line under the select, which says what the mode
in force does, as the lines under the number inputs do today. That is
also the remedy of #147, and the reasoning the first draft left unsaid:
a `<select>` is as wide as its widest option's text, and the Mode
select's options are sentences (`exact: every digit shown is certain,
at rising precision`), 547 pixels at the panel's font, wider than a
phone, so the panel overflows the page and the page scrolls sideways
(#147's measurements). Options of one word make the select a few
characters wide, and the overflow has nothing to cause it. #147's CSS
(`min-width: 0` on the labels) is a belt to this; the step may add it,
and the layout itself is S4's. The owner asked to revisit this after
the rest; it is recorded here for that.

The two lines, with the notation's control under the first when exact
mode is in force:

- exact: every digit shown is certain, found at rising precision; an
  exact value is written as its digits or as a ratio.
- decimal: every step is rounded to Digits in the rounding mode, as a
  hand calculator does; every answer is exact in that arithmetic (a
  rounding the precision limit could not certify is marked, which the
  line under the result says, not this one; #173 asks whether it should
  be).

## Where it goes

- `src/core/context.ts`: `DEFAULT_ROUNDING` to `halfEven`.
- `src/settings.ts`: `ModeSetting` as above in place of the `mode` and
  `fractions` fields, its validation, `STORAGE_VERSION` 3 and the
  migration from 2 (the mode's shape and the rounding default in one
  step); `contextOf` reads `mode.kind`; `isDefault` compares the field
  by value; a function that says whether ratios apply (the kind `exact`
  with the notation `ratio`).
- `src/app-shell.ts`: passes that function's answer to the component.
- `src/settings-panel.ts`: the Mode select on `kind` with two short
  options and a line that follows the mode; the notation's control
  rendered under it when the kind is `exact`, emitting the whole
  variant; the lines under Digits and Rounding as functions of the
  settings, which `NUMBER_FIELDS` already allows for the numbers and the
  selects gain.
- `src/outcome.ts`: the guard that keeps the fractions display out of
  decimal mode, which D26's implementation put in `outcomeOf`, goes, the
  settings now making the two exclusive at the source; `src/core/display.ts`
  unchanged.
- Tests: a version 2 fixture with each combination of mode and
  fractions, and the totality test over the new migration; the tests at
  the default rounding; the panel's notation control under exact mode
  only; the outcome's decimal-mode lines unchanged, since D26 already
  made them digits.
- docs: docs/fractions.md ("The decimal mode": no fractions in decimal
  mode, and why), README's "Settings" for the mode, Digits, Rounding
  and the default, ARCHITECTURE.md's settings paragraph; #97 closed,
  #147 closed, #91 and #95 pointed at the fit rule's step.

## Done when

- The settings have a `mode` of the nested shape and no `fractions`
  field beside it; a version 2 object with `mode: "exact"` and
  `fractions: true` loads as the exact variant with the notation
  `ratio`, one with `mode: "decimal"` as the decimal variant whatever
  its `fractions`, and the next save writes version 3.
- In decimal mode no value is written as a fraction, in the display and
  in the panel.
- The panel shows the notation's control under the Mode select in exact
  mode only, the Mode select's options are the bare names, and nothing
  in the panel overflows a phone's width.
- The rounding default is `halfEven`; a version 2 object with
  `halfAwayFromZero` loads as `halfEven`; any other stored rounding mode
  is kept.
- The lines under Digits, Rounding and Mode say what each means in the
  mode in force.
- README's "Settings" says what each mode does, what Digits and Rounding
  mean in each, that a typed number is rounded on the way in in decimal
  mode, and which rounding mode is the default and why.
- The fit rule is as it was, and its step is listed in the plan after
  this one, with the points gathered above.
- `clampSettings` keeps its name.

## Not in this step

- **The fit rule and #95:** the step after this one.
- **The uncertified mark of decimal mode (#173)** and the other studies
  D26's review queued (#171, #172).
- **The precision limit in decimal mode (#86)** and everything about the
  two limits: S3.
- **The panel's layout, grouping and disclosure (P13):** S4. This step
  changes the controls the model requires and no more.
- **The reciprocal's retry and refusals (#92).**
