# The settings: triage and plan

The six settings grew one stage at a time, each sound on its own, and
they no longer cohere: two of them mean different things depending on a
third, two make opposite promises, two are coupled by a formula the panel
does not explain, and the panel that holds them has outgrown the
disclosure it sits in. This is a triage of everything known to be wrong
with the settings, as a model and as a surface, chunked into steps that
can each be designed in one review and then implemented. It designs
nothing: every step starts with its own design note. Responsiveness
(#118 and its sub-issues, and #163, the probe's own freeze) is apart, as
D25 of docs/calculator-plan.md rules, and is not in this plan.

## The settings as they are

| Setting                | Stored      | Range                                 | What it means                                                                                                                                            | Depends on                    |
| ---------------------- | ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Digits                 | `digits`    | 1 to the precision limit              | Significant digits shown; in decimal mode the precision of every step; the bound a fraction must fit; in decimal mode what a typed literal is rounded to | the precision limit           |
| Rounding               | `rounding`  | the seven modes                       | In exact mode, how the last digit shown is rounded; in decimal mode, how every step is rounded                                                           | the mode, for what it touches |
| Mode                   | `mode`      | exact, decimal                        | Exact: certify every digit shown, at rising precision. Decimal: one pass, every step rounded to Digits                                                   |                               |
| Precision limit        | `maxDigits` | 1 to what the significand limit holds | The cap on Digits, and through the ceiling `4 × (cap + 10)` the effort exact mode spends; in decimal mode only the precision limit (#86)                 | the significand limit         |
| Significand limit      | `maxBits`   | 358 to 2^20                           | The most bits of an exact value's numerator or denominator: a cost limit, in time and memory                                                             |                               |
| Show reduced fractions | `fractions` | on, off                               | An exact non-integer is written as its fraction in lowest terms when both parts fit within Digits; in decimal mode almost never applies (#97)            | Digits, the mode              |

The "Recommend limits" button runs a synchronous probe (limits.ts) that
times the app's costliest operations against a budget of 50 ms a pass and
sets both limits to what the device manages, lowering Digits if the precision limit
it sets is below it.

Persistence (settings.ts): one JSON object under the key `settings`, with
no version; a field that is missing or malformed falls back to its
default on its own, and the dependent fields are clamped in the order of
their dependence (the significand limit, then the limit, then Digits). There is no
way to reset to the defaults short of clearing the browser's storage, and
nothing shows which settings are not at their defaults.

The surface (settings-panel.ts): a `<details>` under the converter's
output, six controls and the probe's button in a wrapping row, each with
a line of explanation, applied and saved on every change. A number
outside its range is not applied and the input snaps back, with no
message. The Mode select's option text is wider than a phone (#147).

## The problems

The first five are the ones raised in the request; the rest came out of
reading the settings end to end.

**P1. Digits and the precision limit are intertwined.** Digits may not
exceed the limit, the limit may not exceed what the significand limit holds, and
lowering either lowers what depends on it. The panel shows the limit's
hint with the ceiling formula and the input's `max`, and nothing else
about the chain.

**P2. The significand limit sets the most digits an exact value can have.** The
relation runs through the ceiling: half the bits must hold `4 × (cap +
10)` digits, so the precision limit's maximum moves when the significand limit does
(2,453 at the default 65,536 bits), and the panel does not say why. Bits
are not how a user of a converter thinks, and the only documentation of
the setting is a dense paragraph in README's "Settings".

**P3. Nothing stops a user from setting limits that freeze the page.** An
expression that never certifies runs to the ceiling on every keystroke,
and the significand limit admits exact values of a million bits whose
reductions take seconds. The probe is the one mitigation, and it freezes
the page itself (#163). The defaults are desktop-sized by D25's ruling.
Whether to add guard rails (a safe range, a confirmation past it,
device-aware defaults on first run, which D16 argued against as noise at
every launch) is a settings policy, apart from how the interface stays
responsive while a cost is paid.

**P4. Decimal mode and the fractions display cut against each other
(#97).** Decimal mode promises every step rounded; the fractions display
promises the value entire. Together they show mostly decimals with the
occasional fraction, and no line says which rule produced it. The
exclusion is the right call and already written up; its shape (a third
mode value, or a checkbox disabled in decimal mode) decides how much of
the core it touches, since the pipeline's decimal-mode settle of #96
stays either way.

**P5. Fractions and rounding are subtle together.** A fraction is never
rounded and the rounding mode plays no part in it, yet whether a value
_is_ a fraction depends on Digits through the fit rule (#91), and in
decimal mode on whether the rounding left the value exact. A user who
raises Digits to see a longer fraction changes every decimal line, and in
decimal mode every computation.

**P6. Digits is four settings in one.** The significant digits shown; in
decimal mode the working precision of every step; the bound a fraction's
numerator and denominator must each fit (#91); and in decimal mode the
digits a typed literal is rounded to on the way in, so that `2.5400001 cm`
at three digits is `2.54 cm` before anything is computed
(docs/decimal.md, "The decimal mode"). The last is unmentioned anywhere
a user looks.

**P7. The precision limit is a cost knob dressed as a precision.** What it
bounds is the effort exact mode may spend, and the hint says so with the
ceiling formula, an internal of the retry schedule. In decimal mode it
only bounds Digits and the panel shows it unchanged (#86), with the
question underneath of whether decimal mode should carry a ceiling at
all, which touches how the limits are wired through `NumberContext`.

**P8. Rounding means two things.** In exact mode it rounds the display's
last digit; in decimal mode it rounds every step. The directed modes mark
the last digit uncertain in either, so a mode chosen for the display
changes which lines read `=`. The default, ties away from zero, is the
hand calculator's and the schoolroom's rather than the half-even of IEEE
and `printf`, which deserves a sentence somewhere a user finds it.

**P9. Coupled edits clamp silently.** Lowering the significand limit can lower the
precision limit and Digits; the probe sets both limits and can lower
Digits below what the user chose; nothing says so, and raising a limit
back does not restore what it lowered. The behavior is right (a stored
entry can never be inconsistent); the silence is not.

**P10. The probe's promise is hidden.** The button says "Recommend
limits"; what it does is time a composite at a 50 ms budget a pass and
overwrite both limits, including ones the user set by hand, and nothing
reports what it found or why. The budget is a policy a user never sees.

**P11. Persistence has no version.** A renamed or regrouped field would
silently reset to its default on the next load, which rules out renames
until there is a migration path; a mode that gains a third value (P4) or
a Digits that splits in two (P6) needs one. There is no reset to
defaults, no indication of what is not at its default, and two tabs do
not see each other's changes (minor).

**P12. Three vocabularies name the same things.** The panel says Digits,
Precision limit and the significand limit; the storage says `digits`, `maxDigits` and
`maxBits`; the docs and code say the digits, the precision limit and the significand limit,
and once said "Most digits". The modes are "exact" and "decimal", though
both compute decimals and the first can show fractions.

**P13. The surface has outgrown its disclosure.** Settings sit under the
output, so a long result pushes them off a phone's screen; the six
controls and the button are a flat wrapping row with no grouping by what
they are (how to compute, how to show, how much to spend); the Mode
select overflows a phone (#147); every explanation is a line under its
control whether the user wants it or not; apply-on-change is right for an
inline panel and an open question for a modal; and a rejected number is
rejected without a word.

**P14. The precision limit rebuilds the unit table when it changes.** A
synchronous build of a few milliseconds, which is fine today, and a
constraint on any apply-on-close design that would change several
settings at once. A constraint rather than a problem, recorded so that S4
does not forget it.

## The steps

Each step is one design note in docs/, reviewed, then one or more
implementation PRs that also update README's "Settings" and
ARCHITECTURE.md for what they change. The order is by dependency: the
model before the surface, the storage before any rename, the user's guide
last. S2 and S3 are independent of each other and could swap; S2b
extends S2 and lands with it.

### S1. Persistence: a version, migrations, and reset

- **Scope.** A version in the stored settings; a migration step per
  version with a test per step; a `reset` that restores the defaults; the
  policy for a field the current version does not know (drop, or keep
  for a newer version). The reset's button waits for S5.
- **Decisions.** Version field or versioned key; whether an unknown
  version resets everything or reads what it can; whether migrations run
  on load only.
- **Depends on.** Nothing. Every later step that renames, regroups or
  reshapes a setting depends on it.
- **Touches.** settings.ts and its test; P11.
- **Core impact.** None. **Size.** Small.

### S2. Mode, rounding and fractions

Implemented, with S2b, in one change (docs/settings-modes.md, "As
landed"); the fit rule is retained and is S2c below, with #91 and #95.

- **Scope.** What the mode setting is and how it relates to the fractions
  display (P4, #97); what Digits means in each mode and whether it should
  be one setting or two, digits shown apart from working precision (P6);
  how rounding's two meanings are presented (P8); the fit rule of the
  fractions display (P5, #91), which can also run as a step of its own if
  it slows this one down; the names of the modes (P12, the mode half).
- **Decisions.** The shape of the exclusion: a third mode value (`exact`,
  `exact with fractions`, `decimal`) or a checkbox that decimal mode
  disables, and what the stored setting becomes. Whether a split of
  Digits is worth a second number in the panel. Whether decimal mode's
  rounding of typed literals is a feature to document or a behavior to
  reconsider. The fit rule: Digits, a constant, a bound on the total
  length, or a setting of its own (#91's options).
- **Depends on.** S1 if the stored shape changes.
- **Touches.** #97, #91, #95 (its decimal-mode clause), docs/fractions.md
  and docs/decimal.md, D21.
- **Core impact.** Low for the checkbox shape (display and tests), medium
  for a third mode value (the mode type reaches `NumberContext`), high if
  Digits splits (every reader of `precision`). **Size.** Medium to large,
  by the decisions.

### S2b. The working digits of decimal mode

Implemented with S2 (docs/working-digits.md, "As landed"; D27).

- **Scope.** A floor on the digits every step of decimal mode is
  computed at, apart from Digits, which the answer is shown with: the
  guard digits a calculator keeps hidden, so that `ln(exp(1/10))` at
  eight digits can show `0.1` rather than the first rounding's error.
  Added after S2's note, on the owner's ruling (docs/working-digits.md,
  D27). Decimal mode alone; exact mode's working precision is the retry
  schedule's.
- **Decisions.** In the note: the last step of a displayed value is
  rounded to Digits directly from its exact result, every other step to
  the working digits; the setting lives inside the decimal variant of
  the mode setting as `Working`, locked to Digits by default or an
  extended count in `[Digits, precision limit]`, clamped in that order;
  the panel shows an "extended" checkbox under the Mode select in
  decimal mode, unchecked by default, and a number input for the count
  while it is checked.
- **Depends on.** S2, whose mode setting it extends; implemented with
  S2 in one change by the note's recommendation.
- **Touches.** context.ts (an optional `working` in `NumberContext`),
  evaluate.ts (children at the working context), settings.ts, the
  panel, D26 (amended by D27).
- **Core impact.** Low: one field and one line in the evaluator; the
  display is unchanged. **Size.** Small, on top of S2.

### S2c. The width of a ratio: the fit rule

Implemented (docs/ratio-width.md, "As landed"; D28).

- **Scope.** When an exact value is written as a ratio and how long a
  ratio may be (P5, #91), with #95's power-of-ten form decided in the
  same rule, and whether a whole number follows the same width. Sent
  here by the S2 note, which retained the fit at Digits and gathered the
  candidates (docs/ratio-width.md).
- **Decisions.** In the note: a width of the notation's own, the most
  digits a ratio's two parts may have between them, twenty by default,
  in `[1, 1000]`, independent of Digits; the measure the two parts
  together, as the owner ruled in review; a whole number written entire
  when it fits the width; the scaled form `n/d × 1e+k` for a ratio that
  fits with its power of ten factored out and not without,
  the denominator not one; a mixed form and a fractional significand ruled
  out; the notation as `{ kind: "digits" } | { kind: "ratio"; width }`
  at stored version 4.
- **Depends on.** S2, whose notation it extends.
- **Touches.** display.ts (`show`'s `ratio` option), outcome.ts,
  unit-converter.ts, settings.ts, the panel; docs/fractions.md, D21
  (amended by D28); #91, #95, P5.
- **Core impact.** Low: the display's fit and one form; nothing in the
  arithmetic. **Size.** Small to medium.

### S3. The limits: Digits, the precision limit, the significand limit

Implemented (docs/settings-limits.md, "As landed"; D29). The terms are
now the display digits, the working digits, the precision limit in
digits, the significand limit in bits and the probe budget in
milliseconds, in the panel, the storage, the core and the docs alike
(the core's renames landed in the change after the panel's).

- **Scope.** Which of the three are settings and which are derived
  (P7, #86): whether the precision limit is a user's number or a cost knob with a
  better name, and whether decimal mode carries a ceiling at all. The
  unit the significand limit is expressed in, bits or digits, and how its
  relation to the precision limit is shown (P2). What a coupled edit does and says
  (P9). Guard rails and the defaults (P3), within D25's ruling that the
  defaults stay unless this step argues otherwise. The probe's role and
  promise (P10): what the button says, whether it may lower a value the
  user set, whether it reports what it found, and what the budget is;
  its freeze is #163's and not this step's. The names (P12, the limits
  half).
- **Decisions.** Those above, and #86's core question in particular,
  since it decides whether `NumberContext` keeps `ceiling` as one field
  or separates the top of the schedule from the precision the shared
  constants are held at.
- **Depends on.** S1 for any rename. Independent of S2.
- **Touches.** #86, #73 (the message that could name the bits an exact
  result needed), #163 (referenced, not fixed), context.ts, settings.ts,
  limits.ts, D12 and D16.
- **Core impact.** Medium: the ceiling's wiring if #86's first or third
  option is taken; none otherwise. **Size.** Large.

### S4. The surface

Design note: docs/settings-surface.md (proposed; D30).

- **Scope.** Where the settings live: the disclosure under the output as
  today, a modal, a popover from a control in the shell, or a page of
  their own; how they are reached on a phone when a result is long; apply
  on change against apply on close, with the table rebuild (P14) and the
  reset (S1) in mind; whether a result should offer a quick change of the
  settings that shaped it (more digits, the other mode) without opening
  the panel, which is a question for the note to answer or defer.
- **Decisions.** The container, the apply semantics, the entry point.
- **Depends on.** S2 and S3, to know the final set of settings and their
  groups.
- **Touches.** app-shell.ts, settings-panel.ts; P13's placement half.
- **Core impact.** None. **Size.** Medium.

### S5. The controls

- **Scope.** The grouping (how to compute, how to show, how much to
  spend); the widget for each setting (a number input, a stepper or a
  slider for a limit; a segmented control or a select for the mode; a
  select for rounding); feedback instead of the silent snap-back, and
  how the range of a number and its coupling to another are shown (P1,
  P9); the explanations, always shown or on request; the on-screen names
  (P12); phone and desktop layouts; #147.
- **Decisions.** Those above, per control.
- **Depends on.** S4.
- **Touches.** settings-panel.ts, styles.ts; #147, which is a CSS fix
  that can land on its own at any time before this.
- **Core impact.** None. **Size.** Medium to large, all UI.

### S6. The user's guide

- **Scope.** Friendly documentation of the settings as they stand after
  S2 to S5: what each does, what the modes and the rounding modes mean
  for a line, what a fraction is and when it appears, what the limits
  cost and why the significand limit bounds digits, with the relation written for a
  reader who has never seen a rational; where it lives (README, a docs
  page, in-app help reached from the panel); and the rewrite of README's
  "Settings", which is written for a developer today.
- **Depends on.** All of the above. Each earlier step keeps README and
  ARCHITECTURE.md true for what it changes; this step writes the guide.
- **Core impact.** None. **Size.** Medium.

## Not in this plan

- Keeping the interface responsive while a cost is paid: #118, #119,
  #120, #121, and the probe's own freeze, #163.
- The reciprocal line's place in the pipeline (#92), which is a display
  rule rather than a setting, though S2 may touch its decimal-mode
  clause.
- Anything about the app beyond the settings and the panel.
