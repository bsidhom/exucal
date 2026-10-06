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

**Status: paused.** The review of the first draft reopened what decimal
mode is, and docs/decimal-mode.md now restates it (D26, proposed): every
operation one correctly rounded step, every value exact, no radius. That
restatement lands first, and this note resumes after it merges. What
here depends on it is marked; the rest stands on its own. The first
draft's ruling of one mode with three values, and its fit rule by a
constant, were set aside in the same review and are recorded below as
weighed.

## Fractions are a setting of exact mode

The mode and the fractions display are two controls with four
combinations, and one of the four is incoherent. Under D26 the reason is
sharper than #97's: in decimal mode every value is a `p`-digit decimal,
exact, and its digits write it entire; the fractions display exists to
write an exact value entire where its digits would lose it, so in
decimal mode it has nothing to do. The two are exclusive (#97), and the
fractions display is a sub-setting of exact mode: it belongs to that
mode and is shown with it.

Three shapes were weighed:

- **One mode with three values**, `exact | fractions | decimal`, the
  first draft's ruling: three admissible states, three values. Set
  aside by the owner: the fractions display is not a mode but a way of
  writing exact mode's answers, and the panel should say so by placing
  it under exact mode rather than beside it.
- **A nested choice,** `{ kind: "exact"; fractions: boolean } | { kind:
"decimal" }`: the type says the flag exists only where it applies.
  It forgets the fractions preference when the user visits decimal mode
  and comes back, and it reshapes the stored object for that.
- **Two fields, the second scoped to the first:** `mode: "exact" |
"decimal"` and `fractions: boolean`, where `fractions` means "in exact
  mode, write exact values as fractions" and is remembered while the
  mode is decimal. The panel shows the checkbox under the Mode select
  only when exact mode is in force; the shell passes `mode === "exact"
&& fractions` to the component.

The third is the decision, pending the owner's confirmation. It is the
stored shape of today, so S2 needs no migration for it and the first
migration with meaning waits for a change that needs one; the stored
`fractions: true` under decimal mode is not an inert state but a
remembered preference, which the first draft's objection to this shape
missed. One function, the view the shell takes, says where the flag
applies, and it is not a consistency rule between stored values, so
`clampSettings` stays a clamp and keeps its name; the question of a
rename, raised in the review of S1, waits for the first rule that is
not a clamp. The nested shape is the alternative if the owner would
rather the type say it; the cost is the forgotten preference and a
version 3.

The core's two-valued `Mode` keeps its name and its place: the user's
mode and the context's mode are the same two values again, and the
first draft's rename of the core's type to `Arithmetic` is not needed.

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
`2.5400001 cm` in `in` at three digits is `= 1 in` under D26, where today
it is `≈ 1 in` with the rounding in the radius. Exempting literals would
carry the extra digits into the first operation and round them there,
one step later, for no gain. The panel's line under Digits says it in
decimal mode, and README says it once.

The fourth meaning, the fit of a fraction, is the next section's, and
whether it leaves Digits is that step's to decide.

## The fit rule: retained, and a step of its own

docs/fractions.md writes an exact value as a fraction when its numerator
and its denominator each have at most Digits digits, and otherwise falls
back to the decimal display. The rule is provisional (#91). The first
draft of this note replaced it with a constant of ten digits per part,
whole numbers written entire when they fit; the review did not follow
it, and the ruling is to **retain the current behavior** in S2 and decide
the fit rule in a step of its own, after this one, with #95 beside it.
What that step weighs, gathered here so that nothing is lost:

- **The owner's inclinations.** Either a new setting, shown with the
  fractions display, that sets the width a fraction may take; or no
  bound at all, every exact value written as its fraction when the
  display is on. The ground for the second: the display applies in
  exact mode only, the radius says which values are exact, and every
  bit of the value is in hand, so nothing stops the app from writing it.
- **The two together.** The second inclination with the first as its
  bound: fractions always, up to a width the user sets, with a generous
  default, and the decimal display past it. A width setting is a
  fourth number in the panel, which P13 counts against; a sub-setting
  of the fractions display, shown only when it is on, costs less.
- **Unbounded length.** Values legal under the range limit run to
  15,634 digits (`3^32767`) and further at a raised limit, and a
  fraction with parts that long is a line of thirty thousand characters
  that wraps for screens; the copy button copies it faithfully. Whether
  that is what a user who asked for fractions wants, or whether the
  decimal display's `≈ 1.9e15634` serves them better past some length,
  is the question a width answers.
- **Whole numbers.** docs/fractions.md and D21 send an exact integer to
  the decimal display, which writes it entire only when it fits Digits:
  `3^20` at eight digits is `≈ 3.4867844e+9` with fractions on, for a
  value that is exactly `3486784401`. If the display's purpose is exact
  values entire, a whole number is the simplest case and should follow
  the same bound as a fraction's part. #91 raises the example; the step
  decides.
- **Per part or in total.** A bound on each part, as today's rule and
  the first draft's constant, or on the fraction's total length. A
  lopsided fraction, `1` over fifteen digits, is a power of ten in
  disguise that the decimal display writes shorter and as exactly
  (`= 1e-15`), which a per-part bound excludes and a total bound of the
  same size admits.
- **The coupling to Digits.** Under today's rule `1/123456789`, typed by
  the user, is `≈ 8.1000001e-9` at eight digits and `= 1/123456789` at
  nine, which also lengthens every decimal line; `1 m` in `in` at three
  digits is `≈ 39.4 in` with fractions on though `5000/127` is eight
  characters. Any bound that is not Digits removes this.
- **A power of ten factored out (#95)**: `1e+30/3` for a third of
  `1e30`, where the fraction's parts are short apart from the power of
  ten. The same study from the other side, which #95 asks be decided
  together with the fit; whatever the bound measures, it measures the
  text as written.
- **What the first draft proposed**, for the record: each part at most
  ten digits, a constant independent of Digits and of any setting,
  whole numbers included; ten as "about what a phone's line holds beside
  the units, and about the longest fraction anyone reads as one". At
  eight digits it would have changed `1/123456789`, `3^20` and `1 lb` in
  `kg` (to `(45359237/100000000) kg`, a fraction over a power of ten
  where the decimal `0.45359237` was exact and shorter) and left the
  rest of the common conversions as they are.

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

The note recommends the migration, and that is a version 3 whatever the
shape decision above. Either way README gains the sentence the default
lacks: which it is and why.

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

The two lines, with the fractions checkbox under the first when exact
mode is in force:

- exact: every digit shown is certain, found at rising precision; an
  exact value may be written as a fraction.
- decimal: every step is rounded to Digits in the rounding mode, as a
  hand calculator does; every answer is exact in that arithmetic.

## Where it goes

Marked "after D26" where the text or the test depends on the decimal
restatement.

- `src/core/context.ts`: `DEFAULT_ROUNDING` to `halfEven`.
- `src/settings.ts`: the migration from 2 to 3 for the rounding default,
  `STORAGE_VERSION` 3; the shape of the two fields unchanged; a function
  that says whether fractions apply (`mode === "exact" && fractions`).
- `src/app-shell.ts`: passes that function's answer to the component.
- `src/settings-panel.ts`: the Mode select with two short options and a
  line that follows the mode; the fractions checkbox rendered under it
  in exact mode only; the lines under Digits and Rounding as functions
  of the settings, which `NUMBER_FIELDS` already allows for the numbers
  and the selects gain.
- `src/outcome.ts`, `src/core/display.ts`: unchanged in logic; `show` is
  never asked for a fraction in decimal mode.
- Tests: the decimal-mode fraction rows of `display.test.ts` and
  `outcome.test.ts` become digits (after D26 they are `=` with the
  rounded digits); a version 2 fixture and the totality test over the
  new migration; the tests at the default rounding; the panel's
  checkbox under exact mode only.
- docs: docs/fractions.md ("The decimal mode": no fractions in decimal
  mode, and why), README's "Settings" for the mode, Digits, Rounding
  and the default, ARCHITECTURE.md's settings paragraph; #97 closed,
  #147 closed, #91 and #95 pointed at the fit rule's step.

## Done when

- In decimal mode no value is written as a fraction, in the display and
  in the panel, and the stored `fractions` is kept and applies again in
  exact mode.
- The panel shows the fractions checkbox under the Mode select in exact
  mode only, the Mode select's options are the bare names, and nothing
  in the panel overflows a phone's width.
- The rounding default is `halfEven`; a version 2 object with
  `halfAwayFromZero` loads as `halfEven` and is saved at version 3; any
  other stored mode is kept.
- The lines under Digits, Rounding and Mode say what each means in the
  mode in force.
- README's "Settings" says what each mode does, what Digits and Rounding
  mean in each, that a typed number is rounded on the way in in decimal
  mode, and which rounding mode is the default and why.
- The fit rule is as it was, and its step is listed in the plan after
  this one, with the points gathered above.
- `clampSettings` keeps its name.

## Not in this step

- **The decimal mode's restatement (D26):** docs/decimal-mode.md, which
  lands before this step resumes.
- **The fit rule and #95:** the step after this one.
- **The precision limit in decimal mode (#86)** and everything about the
  two limits: S3.
- **The panel's layout, grouping and disclosure (P13):** S4. This step
  changes the controls the model requires and no more.
- **The reciprocal's retry and refusals (#92).**
