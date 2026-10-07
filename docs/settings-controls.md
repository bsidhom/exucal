# The controls: groups, widgets, lines and resets

The design note for step S5 of docs/settings-plan.md: what the sheet
holds and how, now that S4 settled where it is and when a change
applies. The plan gives this step the grouping, the widget for each
setting, the feedback on a refused or a clamped edit, how a number's
range and its coupling to another are shown (P1, P9), whether the
explanations are always shown or on request, the on-screen names (P12),
the phone and desktop layouts, and, from S1, the reset's buttons and
what shows which settings are not at their defaults (P11). **Status:
proposed.** It changes no setting's meaning and nothing in the core; it
changes the panel, the lines it says, and the words of README's
"Settings" for what moves.

## The sheet as it is

Eight controls in one flat run, in the order the model grew: the display
digits with decimal mode's working digits grouped under them, the
precision limit, the significand limit, the rounding, the mode with
exact mode's notation under it, the probe's budget and its button. Each
has a line under it, always shown, from one sentence (the display
digits) to four (the precision limit), so that at a phone's width the
run is about 1,400 pixels tall and the sheet, at three fifths of the
screen, shows a control and a half at a time. The mode is a select of
two options; the notation two radios. The refusal of an out-of-range
number and the clamp of a dependent each say so under the input (S3).
Nothing shows which settings have been changed from their defaults, and
nothing resets one or all (S1's functions exist, with no button).

## Decisions

### Three groups, by what a setting is for, the most-changed first

The settings fall into three kinds, which the plan named: how a result
is shown, how it is computed, and how much it may cost. The sheet
shows them as three sections with a heading each, in that order, since
it is also the order of how often each is touched: a user changes the
display digits or the notation to read a result otherwise several times
an hour, the mode or the rounding a few times a session, and the limits
once per device.

- **How it is shown.** The display digits; the notation, in exact mode.
- **How it is computed.** The mode; under it, what the mode carries,
  the working digits in decimal mode; the rounding.
- **How much it may cost.** The precision limit; the significand limit;
  the probe, its budget, its button and its proposal.

One thing moves: the working digits leave the display digits' side and
sit under the mode, where exact mode's notation already sits. S2b put
them under the display digits because their floor is the display
digits; but they are the decimal mode's field (`mode.working`), they
exist only in that mode, and the notation, the exact mode's field, is
under the mode. The two dependents now swap places under the Mode
control as the mode changes, which shows what each belongs to, and the
line under the working digits says their floor.

### The widgets

- **The display digits**: a number input with its steppers, as S4
  landed them.
- **The notation**: two radios, `digits` and `ratio`, with the width's
  input and steppers beside `ratio` while it is chosen, as S2c landed
  them.
- **The mode**: two radios, `exact` and `decimal`, in place of the
  select. A choice of two is seen whole as radios, one tap, both names
  on screen, and the notation beside it is already radios; the select
  stays for a choice too long to lay out. The line under them follows
  the mode in force, as it does today.
- **The working digits**: the `extended` checkbox with the count's input
  and steppers while it is checked, as S2b and S4 landed them.
- **The rounding**: the select of seven, as it is.
- **The limits**: a number input each, without steppers, as S4 ruled:
  typed with intention and rarely. The budget likewise.
- **The probe**: its button and its proposal with Apply, as S3 landed
  them.

### The range and the chain, said once under each number

P1 and P9 are that the chain among the numbers is nowhere said except
when it bites. Each number's line now opens with its range and names
the setting that sets a bound where the chain does, from `rangesOf`,
which already knows it (`minBy`, `maxBy`): "From 1 to 1,000 digits, the
precision limit." for the display digits; "From 8 to 1,000 digits, the
display digits and the precision limit." for the working digits; "From
1 to 2,453 digits under the significand limit." for the precision
limit; "From 358 to 1,048,576 bits." for the significand limit, whose
bounds are the app's; "From 10 to 10,000 ms." for the budget; "From 1
to 1,000 digits, the precision limit." for the width. The numbers are
the settings in force, so the range moves when its setter does, and the
refusal line ("at most 2,453 digits under the significand limit") and
the clamp's line stay as S3 landed them, now restating a bound the user
has read.

### One sentence always, the rest in the guide

The lines are the reason the sheet is long. Showing them on request
would need a control per line or a switch for all, and a control for
whether to show help is help nobody asks for; hiding them altogether
leaves a number with no word on what it does. The line stays, always,
and is cut to what a user needs at the control: the range as above and
one sentence on what the setting does. The precision limit's four
sentences become "From 1 to 2,453 digits under the significand limit.
The most digits an answer may be asked for; it bounds the effort an
expression may cost." and the significand limit's "From 358 to
1,048,576 bits. The most bits in a number's numerator or denominator,
65,536 being about 19,700 digits; an exact result past it is refused."
The grid, the ceiling, why a refusal names the bits, what the probe
measures: that is the user's guide, S6, which the sheet ends with a
link to ("About these settings"), pointing at README's "Settings" until
the guide lands and at the guide after. The lines live in
settings-lines.ts as today, with their tests following the new words.

### Feedback

A refused number and a clamped one say so under the input, as S3
landed them, and nothing snaps back in silence. Two additions: the
refused input is marked `aria-invalid` while its line shows, so that a
screen reader hears the refusal with the field; and the steppers, which
cannot type a value out of range, refuse at a bound with the same line
(S4 landed that) and are disabled at the bound itself, so that a `+` at
the top does nothing rather than refusing, since a button that refuses
is a button that looks broken.

### Resets, and what is not at its default

S1 wrote `resetSettings`, `resetSetting` and `isDefault` and left the
buttons here. They become one affordance: beside the label of each
setting that is not at its default, a small link-style button that
names the default and resets to it on press ("default 8", "default
exact", "default digits"), through `resetSetting`, which clamps the
dependents as any change does, so resetting the significand limit may
lower the precision limit and say so with the clamp's line. The button
is the indicator: a setting at its default has none, and a glance down
the sheet shows what has been changed. The mode's resets the variant
whole, the notation's and the working digits' their own field within
it. At the sheet's foot, under the groups, "Reset all settings" restores
the defaults through `resetSettings`, with no confirmation, since every
setting is a tap from any value and nothing is lost but a number.

### The names

As S3 settled them for the numbers and S2 for the rest: "Display
digits", "Notation", "Mode", "Working digits", "Rounding", "Precision
limit", "Significand limit", "Probe budget"; the mode's values `exact`
and `decimal` and the notation's `digits` and `ratio` as the bare
lowercase names they are in the storage and the docs; the headings
"How it is shown", "How it is computed", "How much it may cost".

### The layouts

One column at every width: the bottom sheet is a phone's width and the
side sheet is 24rem, and the two-column wrap the flat run had at 32rem
has no room in either. Each group is a `<fieldset>` with its heading as
the `<legend>`, a rule between groups, and the controls at the spacing
they have. The side sheet's column is the same markup at its width.

## Where it goes

- `src/settings-panel.ts`: the three groups as fieldsets in the order
  above; the mode as radios; the working digits under the mode; the
  reset button beside a label whose setting is not at its default,
  and "Reset all settings" at the foot, each emitting through the shell
  as any change does (a `settings-reset` event with the key, or none
  for all, which the shell applies through `resetSetting` and
  `resetSettings` and the clamp's report); `aria-invalid` on a refused
  input; the steppers disabled at the bounds; the link to the guide.
- `src/settings-lines.ts`: the lines rewritten as above, each opening
  with its range from `rangesOf` and naming the setters; the headings;
  the reset buttons' text ("default 8"); their tests.
- `src/app-shell.ts`: applies a reset as it applies a change, through
  the clamp and its report, and saves.
- `src/settings.ts`: unchanged, unless the reset of a field within the
  mode's variant wants a helper beside `resetSetting`.
- README ("Settings"): the groups and their order, the mode as a choice
  of two, the reset and the default marker; ARCHITECTURE.md: the
  panel's and the shell's descriptions; docs/settings-plan.md: S5 done;
  docs/working-digits.md: the working digits' place, as landed.
- Tests: settings-lines.test.ts for every line, heading and reset text;
  settings.test.ts for `resetSetting` on a field within the variant if a
  helper is added. The panel is verified as S4 was, by a Playwright run
  recorded in the change: the groups in order at 390 and at 1,024, the
  mode radios, the reset button present only off the default and
  restoring it, "Reset all settings" restoring every default, the
  steppers disabled at the bounds, `aria-invalid` on a refused input.

## Done when

- The sheet has the three groups, headed and in order, the working
  digits under the mode, one column at every width.
- The mode is two radios; every other widget is as S2 to S4 landed it.
- Every number's line opens with its range and names what sets a bound
  the chain sets; every line is one or two sentences; the sheet ends
  with the link to the guide.
- A setting off its default shows "default …" beside its label and is
  reset by it, with the dependents clamped and told; "Reset all
  settings" restores the defaults.
- A refused input is `aria-invalid` while its line shows; a stepper at
  a bound is disabled.
- Nothing applies otherwise than on `change` (#186 stands).

## D31, proposed

**D31. The settings are three groups, by what a setting is for and in
the order of how often it is touched, each number's line opening with
its range and the setting that bounds it, a default named beside any
setting off it and restored by a press, and the rest of the explanation
in the user's guide.** How it is shown (the display digits, the
notation), how it is computed (the mode with its working digits or
notation under it, the rounding), how much it may cost (the two limits
and the probe); the mode a choice of two radios; one sentence under
each control, always, with the range from `rangesOf` naming the chain
where it bounds; "default 8" beside a changed setting as its indicator
and its reset, "Reset all settings" at the foot, both through the
clamp; a refused input marked invalid and a stepper at a bound
disabled. docs/settings-controls.md is the design.

## Not in this step

- **The user's guide (S6)**, which the sheet's last line links to.
- **Applying a setting as it is typed (#186)**, after #118.
- **The probe's freeze (#163).**
- **A quick change from a result**, deferred by S4.
