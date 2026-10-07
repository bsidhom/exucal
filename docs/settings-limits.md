# The limits: a rational significand, a decimal grid, and their bounds

The design note for step S3 of docs/settings-plan.md: Digits, the
precision limit and Most bits, which the plan's P1, P2, P3, P7, P9, P10
and P12 (its limits half) find intertwined, misnamed and silent, and
which #86 asks whether decimal mode needs at all. **Status:
implemented**; "As landed" at the end says what the implementation
settled. It also settles two
questions the earlier steps sent here: whether the defaults should
depend on the device, and whether decimal mode's working digits should
default above Digits (docs/working-digits.md). It changes no number's
meaning: what it changes is what each number is called, with its unit,
what the panel says about it, what a coupled edit tells the user, and
what the probe promises. Responsiveness while a cost is paid stays apart
(#118, #163; D25).

## The terms

The definitions below stand on their own: everything after them, the
relation between the limits, the clamps and the lines, follows from
them. Each names a quantity, gives its unit, and says why it is called
what it is. The first two are not settings but the words the settings
are defined with.

**Significand.** A value is a significand times a power of ten. The
significand is a rational number, a numerator over a denominator in
lowest terms, kept exactly as it is until a rounding has to happen; the
power of ten is a separate exponent, bounded by a hard constant and
costing nothing. "Significand" is IEEE 754's word for the part a
number's exponent scales, and that is what this is, with the one
difference that here it is a rational rather than a binary fraction.
"Mantissa", the code's and the earlier notes' word, is set aside: IEEE
754 moved away from it, and it also names the fractional part of a
logarithm; the code base follows in the alignment change below.

**Grid.** When a value is rounded, it is not snapped to a nearby
rational. Its significand is snapped onto a decimal grid: an integer of
some number of significant digits times a power of ten. The number of
digits of the grid is the working precision of the arithmetic at that
moment: the grid a pass of the retry schedule rounds onto in exact mode
(D12, D15), and the grid every step is rounded onto in decimal mode
(D26). A rounding adds half a grid cell to the value's radius, which is
the error bound that decides what digits of an answer are certain (D7).
The grid is the floor of that error and never its ceiling: a finer grid
is necessary for more certain digits, and never sufficient, since
cancellation keeps `(2^(1/2))^2 - 2` at a radius of a grid cell on every
grid. A grid point is itself a significand, an integer of the grid's
digits over a denominator of one, which is what ties the two limits
below together.

**Display digits**, in decimal digits (`digits` today; 8 by default).
The significant digits an answer is shown with. In exact mode the
schedule raises the grid until that many digits are certain; in decimal
mode they are also the grid every step is rounded onto, unless the
working digits extend it. The name says what the number is, the digits
of the display, and no longer stands for a working precision, which has
its own name below. Under the ratio notation it still governs the
decimal fallback and the certification of every step.

**Working digits**, in decimal digits (`mode.working` of decimal mode,
S2b). The grid of every observable step but the last in decimal mode,
a step being a node of the expression a user can see (D26): locked to
the display digits, or an extended count between them and the precision
limit. A built-in is one observable step, and inside it the kernel
rounds onto finer grids, up to the ceiling, until its rounding onto the
working grid is certified: the working digits bound what a user can
see, not what a built-in may use to behave as one operation.

**Precision limit**, in decimal digits (`maxDigits` today; 1,000 by
default). The most digits any grid may be asked for: the cap on the
display digits and on the working digits, and, through the ceiling of
the retry schedule, four times the limit plus the guard (D12), the
finest grid the app rounds onto, in either mode. The ceiling is derived
from it and never set. "Precision" is the word the numeric libraries
use for the digit count of the working grid (`mpmath`'s `dps`, the
`decimal` context's precision), and this is the cap on that; the name
is kept over three alternatives. "Digits limit" was set aside as
suggesting the old decimal mode's reading, a cap on Digits and nothing
else. "Grid limit" was set aside with the alternative recorded under
"Which numbers are settings", where the setting would be the ceiling
grid itself. "Grid precision" was set aside as reading as a value
rather than a bound, and as colliding with the working digits, which
are the grid in use in decimal mode.

**Significand limit**, in bits (`maxBits` today; 65,536 by default).
The most bits in a significand's numerator, and separately in its
denominator; an exact result past it is refused and named, and a grid
point, being a significand, must fit inside it, which is the relation
below. The name says the part of the representation it bounds; "Size
limit" said nothing about what is sized, "Most bits" named the unit and
not the thing, and "Rational bit limit" says the representation but not
that the exponent stands apart from it. The unit deserves its own
paragraph, since "bits" is right only with care:

- _It is bits per part._ The limit `S` applies to the numerator and to
  the denominator each on its own, so a significand at the limit holds
  up to `2S` bits. Read as a size, `S` is a strict upper bound on half
  the significand's storage, and the significand's size is nearly `S`
  in double-bits.
- _The double-bits reading would overstate the precision of a
  rational,_ which is why the setting is not styled that way. Only
  reduced representations are admitted, so not every pair of integers
  within `S` bits each is a distinct significand, and the values a
  significand of `S` bits per part can take number fewer than `2^(2S)`:
  a claim of `2S` bits of precision would promise more than the
  representation holds. The setting says `S` bits, and claims nothing
  about `2S`.
- _`S` bits is a lower bound on the significand's precision,_ which is
  what makes the styling honest. With the denominator fixed at one, a
  significand of `S` bits is an integer of `S` bits, so every precision
  up to `S` binary digits is reachable within the limit; a user who
  reads the limit as a bit precision is promised `S`, and `S` is
  always there.
- _The translation to decimal digits is per part_ and never a count of
  the value's digits: 65,536 bits is a numerator or a denominator of up
  to about 19,700 digits, and a ratio such as `1/3` has no digit count
  of its own.

So the setting is styled as a bit size and named for the significand,
with the line under it saying "its numerator and, separately, its
denominator"; a reader of mpmath or MPFR, where the precision is the
width of a binary significand and there is nothing else, should not
expect it to coincide with the precision limit, because here an exact
value keeps a rational significand up to this limit and only an inexact
one lives on the grid, whose digits the precision limit bounds.

**Probe budget**, in milliseconds (`budgetMs`; 50 by default). The time
the probe of limits.ts allows one pass when it measures what the device
can do; a setting of the probe, not of the arithmetic, and stored with
the rest (below).

**The unit is baked in, in both places.** On screen, every number input
carries its unit after it as a suffix, "1000 digits", "65536 bits",
"50 ms", so that no name has to carry it and no number is read without
it; the two digit settings carry "digits" in their names already and
show it once. In the storage and the code the unit is in the key:
`displayDigits`, `precisionLimitDigits`, `significandLimitBits`,
`budgetMs`, so that a reader of the stored object or of `Settings` sees
the unit beside the number as the user does.

## The relation between the two limits

The two limits bound different things, the bits of a rational and the
digits of a grid, and they meet in the grid: a grid of `d` digits takes
`bitsFor(d) = ceil(d × log2 10) + 32` significand bits in the kernel,
the 32 being the guard; the finest grid under a precision limit `L` is
`4 × (L + 10)` digits; and every ball operation forms its result from
its operands' significands under the significand limit, inexact
operands included (`add`, `pow` and the roots all take it), the worst
case being a product of two grid points on the ceiling grid. So:

```
2 × bitsFor(4 × (L + 10)) ≤ S
```

with `S` the significand limit in bits. `maxDigitsFor(S)` is the largest
`L` that satisfies it, and a test pins it: at the default `S` the limit
may be 2,453 (a ceiling of 9,852 digits, 32,760 bits, twice that just
under 65,536) and 2,454 fails. Read one way, a small significand limit
forces a smaller precision limit; read the other, a precision limit
needs a significand limit of at least twice its ceiling grid's bits.
One inequality, both directions, enforced today by `clampSettings` and
`rangesOf`, and the only slack in it is the guard's 32 bits, which the
derivation counts. What is missing is not the clamp but the telling,
below.

Two consequences for the other numbers. An exact value is bounded by the
significand limit alone: it is never rounded, so no digits setting
touches it, and the display writes as many of its digits as the display
digits ask for and marks the rest rounded away. An inexact value is
bounded by the precision limit alone: its significand is a grid point,
so its size is the grid's, and it is never refused for size (D19).

## The chain

Significand limit → precision limit → display digits → working digits,
each clamped by the one above it, the working digits last and by both
their bounds. The ceiling is derived from the precision limit, and so is
the precision limit's own top under the significand limit. A stored
entry is therefore never inconsistent (S1, D16).

## What the ceiling is for in each mode (#86)

#86 was written before D26, when decimal mode ran one pass at Digits and
read the ceiling only to size the unit table and the constants' memos,
so that the precision limit did nothing for a decimal-mode result. D26
changed what the ceiling is read for: in decimal mode every step whose
exact result is not representable (a built-in, a quotient, a root) is
computed on rising grids up to the ceiling until its rounding is
certified, and D27 lets the working digits rise to the precision limit.
So the ceiling has one meaning in both modes, the finest grid the app
rounds onto, and one field serves the schedule, a step's certification,
the table and the memos. #86's UX question, whether the panel should
say what the limit does in decimal mode, S2 answered with the line
under the setting, which follows the mode. #86 is closed on this note.

**Ruling: `NumberContext.ceiling` stays one field, derived from the
precision limit as today, read in both modes.**

## Which numbers are settings (P7)

The precision limit is a cost knob dressed as a precision, P7 says: what
it bounds is effort, and its line shows the ceiling's formula, an
internal. Three shapes were weighed:

- **Derive the precision limit from the significand limit**, keeping one
  cost setting. Set aside: the two bound different things that cost
  differently (a product of two significands is quadratic in bits, a
  built-in's ceiling pass is in digits of a different operation), the
  probe measures them apart because of it, and a user on a device fast
  at one and slow at the other would have no way to say so (D16).
- **Make the ceiling the setting**, the finest grid itself, and derive
  the most digits an answer may be asked for from it. Weighed at
  length: it is the honest pairing with the significand limit, since
  the inequality above becomes direct, and it is the quantity the
  mechanism uses. Set aside for this step: the number a user has a
  reason to set is how many digits an answer may be asked for, the
  schedule's room for certification (D12's factor of four) would then
  surface as the derivation of that maximum instead of the ceiling, and
  the default, 4,040, is no one's choice without a change D25 would
  have to bless. It is recorded as the alternative, should the setting
  ever be re-based on the grid.
- **Keep both settings, and say what each is.** The precision limit is
  the most digits an answer may be asked for, and because certifying an
  answer takes a finer grid than it has, it is also a bound on effort;
  the line says both, with the ceiling as a number and never as a
  formula. Chosen.

**Ruling: the three numbers stay settings, with the clamps as they are;
the ceiling is derived and shown, never set and never written as a
formula.**

## Alignment of the code, the storage and the docs

The terms above are the one vocabulary, in the panel, the storage, the
code and the docs. The storage, the code and the docs follow in changes
after this step's panel work, not atomically with it: the stored keys
become `displayDigits`, `precisionLimitDigits` and
`significandLimitBits` at a version 5 with one migration (S1 makes it a
few lines); `Settings` and `rangesOf` take the same names;
`NumberContext.maxBits` becomes `significandLimitBits` (`precision` and
`ceiling` stay, the first being the grid's digits below the pipeline and
the second derived); `maxDigitsFor` becomes `precisionLimitFor`, and
`LIMIT_BITS` and `MIN_MAX_BITS` the significand limit's hard bound and
floor under names that say so; `Scaled.mant` becomes `significand`; and
the core's docs retire "the cap", "the range limit" and "mantissa" for
"the precision limit", "the significand limit" and "significand", D12,
D13 and D16 amended by D29 to say so. The churn is mechanical and the
compiler finds every site. Until then ARCHITECTURE.md's settings
paragraph states the mapping once.

## Coupled edits (P1, P9)

Each setting's range is set by the settings above it in the chain, and
one rule decides every edit:

- **An edit within the setting's range is accepted; one outside it is
  refused, and the refusal names the bound and the setting that sets
  it** ("at most 2,453 digits under the significand limit"). Today the
  refusal is a silent snap-back of the input.
- **An accepted edit re-clamps every setting whose range it changed, and
  says so under the setting moved**, once, until the next change
  ("lowered from 1,000 to 990 digits to fit the significand limit").

So the bounding setting always wins. Setting the significand limit too
small for the precision limit lowers the precision limit, because a
limit is the user's hard cost bound and an edit to it means it; raising
the precision limit past what the significand limit holds is refused,
because accepting it would silently raise a cost bound the user did not
touch. The same pair holds for the display digits under the precision
limit, and for the working digits, which are clamped last, by both the
display digits (their floor) and the precision limit (their cap), the
display digits having been clamped first: raising the display digits
above an extended count raises the count, the one upward move, and it
is the floor doing its job.

| Pair                                        | Range set by   | Lowering the setter | Raising the dependent past it |
| ------------------------------------------- | -------------- | ------------------- | ----------------------------- |
| precision limit under the significand limit | `maxDigitsFor` | clamps, tells       | refused, names the limit      |
| display digits under the precision limit    | the limit      | clamps, tells       | refused, names the limit      |
| working digits under the precision limit    | the limit      | clamps, tells       | refused, names the limit      |
| working digits above the display digits     | display digits | raises, tells       | n/a, a floor                  |

Two other policies were weighed. **Refusing an edit to a limit** that
would lower another setting was set aside: a user lowering a limit
means to, and a refusal that names three settings to lower first is a
chore. **Following the ask**, an edit to a dependent raising the limit
above it, was set aside: it makes every cost limit soft, so that an edit
to the display digits could raise the time and memory a device is
asked for. **Storing the value typed and clamping in use** was set
aside: a stored entry would be inconsistent, which S1 and D16 rule out.

The load path follows the same clamps and tells nothing: a stored field
that is missing, malformed or clamped on loading falls back silently
(S1's policy), and the app has no path yet for a warning a user sees
(#167). This step tells the user about edits; telling them about what
loading changed waits on that path.

## Guard rails and the defaults (P3)

The defaults are desktop-sized by D25's ruling and stay: a precision
limit of 1,000 digits and a significand limit of 65,536 bits give a
value that certifies in milliseconds at any display digits a user asks
for, and only an expression that never certifies pays for the ceiling
pass. Three guard rails were weighed:

- **Device-dependent defaults on first run**, the probe at launch. Set
  aside, as D16 set it aside: a benchmark at every launch (or at the
  first, which a cleared storage repeats) is noise on the main thread
  for a number the user can also type, it makes the app's answers
  depend on the device it first ran on, and the probe is the one
  mechanism the plan has for a slow device, on request. The defaults are
  the app's, the probe is the device's, and the panel offers it.
- **A safe range with a confirmation past it.** Set aside: the cost of a
  setting is not a function of the setting alone (a value that
  certifies is cheap at any limit; `(2^(1/2))^2 - 2` is costly at every
  one), so no line in the setting's range separates safe from not, and
  a confirmation would be crying wolf at one setting and silent at the
  expression that freezes the page.
- **Say the cost in the line**, which the lines now do. Kept, and it is
  all this step adds: what makes a slow pass bearable is the interface
  staying responsive while it runs, which is #118's and not a
  setting's.

**Ruling: the defaults stay and depend on no device; no confirmation;
the lines say the cost.** The working digits of decimal mode default
to the display digits (D27 as ruled): a user who has not touched the
setting sees D26's mode, the extended count is one checkbox away, and a
default above the display digits would make the first line of decimal
mode depend on a number the panel does not show until the box is
checked.

## The probe's promise (P10)

The button says "Recommend limits"; what it does is time the costliest
operation on each axis at a 50 ms budget a pass, then overwrite both
limits, the ones the user set by hand included, and say nothing. The
rulings:

- **It says what it measures.** The button becomes "Measure this
  device", and its line says the rule: the largest significand limit
  and precision limit at which the costliest exact product and the
  costliest built-ins stay within the budget a pass, so that an
  expression that runs to the ceiling answers within a keystroke.
- **It proposes; the user applies.** The probe's result is shown as a
  proposal with the numbers it found and the timings behind them
  ("exact products up to 65,536 bits and the built-ins at 4,040 digits
  within 50 ms: significand limit 65,536 bits, precision limit 1,000
  digits"), and an "Apply" beside it sets both limits, through the same
  clamp-and-tell as any edit. A proposal that lowers a setting the user
  raised is visible before it lands, which is P10's complaint met
  without a confirmation dialog. The alternative, applying at once and
  telling afterwards, was set aside: a measurement is information first.
- **The budget is a setting, stored with the rest** (the owner's
  ruling): `budgetMs`, in milliseconds, 50 by default, in `[10, 10000]`
  (below ten no candidate fits; ten seconds a pass is past any use),
  saved, migrated and reset like any setting, and never seen by the
  core. A transient budget, lost on reload, was weighed and set aside:
  it would be the one setting that comes back different after a reload,
  and a user who found the right budget for a phone would find it gone.
- **Its freeze is #163's**, not this step's: the probe runs on the main
  thread today, and whether it moves to a worker or yields between
  candidates changes nothing above.

## The lines, as the panel will say them

Each number input carries its unit as a suffix; the lines say the rest.

- Display digits: as S2 and S2b have them, by mode.
- Working digits: as S2b has it.
- Precision limit, "digits": "The most digits an answer may be asked
  for, up to 2,453 under the significand limit. To certify an answer the
  app rounds onto a decimal grid of up to 4,040 digits, so this also
  bounds the effort an expression may cost: one whose digits can never
  be certain runs to that grid on every keystroke." In decimal mode:
  "The most digits an answer, or the working digits, may be asked for,
  up to 2,453 under the significand limit. A step's rounding is
  certified on a grid of up to 4,040 digits." The numbers are the
  settings in force; the formula is not written.
- Significand limit, "bits": "The most bits in a number's significand,
  its numerator and, separately, its denominator: 65,536 bits is a
  numerator or a denominator of up to about 19,700 digits. An exact
  result past it is refused and named; the finest grid must fit inside
  it." (#73, when it lands, makes the refusal say how many bits the
  result needed.)
- Probe budget, "ms": "The time the probe allows one pass; it proposes
  the largest limits that stay within it."
- A refusal: under the input, "at most 2,453 digits under the
  significand limit". A clamp: under the setting lowered, "lowered from
  1,000 to 990 digits to fit the significand limit", until the next
  change.
- The probe: "Measure this device", the proposal and "Apply".

## Where it goes

- `src/settings.ts`: the budget as a stored field with its range and
  default, a version 5 migration carrying the keys' renames and the new
  field in one step; a function beside `clampSettings` that says which
  settings a clamp lowered and from what, and one that says why an
  edit is out of range, for the panel's lines (`clampSettings` keeps
  its name and its contract).
- `src/limits.ts`: `recommendLimits` takes the budget and returns the
  timings it found beside the limits, so that the proposal can say them.
- `src/settings-panel.ts`: the labels and the unit suffixes, the lines
  above as functions of the settings, the refusal's and the clamp's
  lines, the probe as a proposal with "Apply", the budget's input.
- `src/app-shell.ts`: applies a change through the clamp and hands the
  panel what the clamp lowered.
- The alignment change, after: the core's and the storage's renames
  listed under "Alignment", `Scaled.mant` included, with D12, D13 and
  D16 amended.
- README ("Settings"): the terms with their units, the grid explained
  in "How a number is held", the clamp's and the refusal's sentences,
  the probe's promise, the defaults' sentence. ARCHITECTURE.md: the
  mapping of the names until the alignment lands, the probe's proposal.
  docs/settings-plan.md: S3 done. #86 closed; #73 and #163 referenced.
- Tests: the clamp's report and the refusal's reason; the probe's
  timings in its result; the panel's lines, suffixes and the proposal;
  the version 5 migration.

## D29, proposed

**D29. The limits are a precision limit in decimal digits, the most
digits any grid may be asked for, and a significand limit in bits, the
most bits in a significand's numerator or denominator; with the display
digits and the working digits they are four settings in the units their
names and keys carry, clamped top-down with the working digits last, a
clamp told where it lands and an edit past a bound refused with the
bound named; the ceiling is derived from the precision limit and read
in both modes as the finest decimal grid the app rounds onto; the
defaults stay and depend on no device; the probe's budget is a stored
setting in milliseconds, and the probe proposes and the user applies
(S3 of docs/settings-plan.md; resolves #86; amends D12, D13 and D16 in
their names).** The model the terms state: a value is a rational
significand times a power of ten, kept exact until it must be rounded,
and then rounded not to a nearby rational but onto a decimal grid whose
digits the precision limit bounds; the significand limit bounds the
bits of the rational's parts, and the grid's points, being significands,
must fit inside it, which `2 × bitsFor(4 × (L + 10)) ≤ S` states and
`maxDigitsFor` enforces.

## Not in this step

- **The probe's freeze (#163)** and responsiveness (#118).
- **The bits a refusal needed (#73).**
- **The panel's placement, grouping and controls (S4, S5)**, which may
  present the proposal, the refusal and the clamp's line otherwise; this
  step fixes the words and the policy.
- **The renames of the storage keys, the code and the core's
  vocabulary**, ruled above and landed in a change of their own after
  the panel's.
- **Re-basing the precision limit on the grid itself**, weighed above
  and recorded as the alternative.
- **A warning path for what loading changed (#167).**

## As landed

- **The storage's renames landed with the panel**, not after it: the
  budget needed a version 5, and the note asks that the keys' renames
  and the new field ride one migration, so `Settings` and the stored
  object say `displayDigits`, `precisionLimitDigits`,
  `significandLimitBits` and `budgetMs` now (docs/settings-storage.md,
  version 5). The core's renames (`NumberContext.maxBits`,
  `maxDigitsFor`, `LIMIT_BITS`, `MIN_MAX_BITS`, `Scaled.mant`, the
  docs' "cap", "range limit" and "mantissa", D12, D13 and D16) wait for
  the alignment change as ruled; `contextOf` is where the two
  vocabularies meet, and ARCHITECTURE.md states the mapping.
- **The bound's setter is in the range.** `rangesOf` gives each ranged
  setting its `Bounds`, the range with `minBy` and `maxBy` naming the
  setting that sets a bound where the chain sets one, and the refusal
  (`refusalOf`: not a whole number, or below or above a bound with its
  setter) and the clamp's report (`clampsOf`: each setting moved, from
  what to what, by which setting, in the order moved) read it from
  there; `clampSettings` is the same fold without the report.
- **The clamp's line reaches the panel through the shell**, which
  computes the report beside the clamp and passes it as a property with
  the settings; the refusal never leaves the panel. Both lines sit
  under the input, above the setting's own line, and a refusal clears
  on the next change of the settings, the clamp's line on the next
  change that comes through the shell, so a refused edit leaves a
  clamp's line standing.
- **The unit after the input, once.** Every number input shows its
  unit after it ("digits", "bits", "ms"), the two digit settings
  included, since the suffix sits on the number and the name on the
  label, and the ratio's width shows "digits" as well, having no unit
  in its label. A count of one is "1 digit".
- **The probe times its floor.** `recommendLimits` tries the
  significand limit's floor before the powers of two, so that the size
  it recommends was always timed, and its result carries the time of
  each operation at the recommended size; a floor that cost more than
  the budget is said to have ("over the 50 ms budget at the least this
  device may be set to") rather than claimed to fit. The budget is the
  caller's, the panel passing the stored setting; the module has no
  budget of its own.
- **The words are a module.** The lines, the refusal, the clamp's line
  and the proposal are text functions in settings-lines.ts, which the
  panel composes and a test under Node reads, since a Lit component is
  not what a Node test loads.
- **The significand limit's line translates per part** at three
  significant figures ("65,536 bits is a numerator or a denominator of
  up to about 19,700 digits"), following the limit in force.
