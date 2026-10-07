# The limits: a rational significand, a decimal grid, and their bounds

The design note for step S3 of docs/settings-plan.md: Digits, the
precision limit and Most bits, which the plan's P1, P2, P3, P7, P9, P10
and P12 (its limits half) find intertwined, misnamed and silent, and
which #86 asks whether decimal mode needs at all. It also settles two
questions the earlier steps sent here: whether the defaults should
depend on the device, and whether decimal mode's working digits should
default above Digits (docs/working-digits.md). It changes no number's
meaning: what it changes is what each number is called, with its unit,
what the panel says about it, what a coupled edit tells the user, and
what the probe promises. Responsiveness while a cost is paid stays apart
(#118, #163; D25).

## The representation the limits bound

Every value is a midpoint and a radius. The midpoint is a rational
significand, a numerator over a denominator in lowest terms, times a
power of ten (scaled.ts, D13); the exponent is bounded by a hard
constant and costs nothing. An exact value has radius zero and keeps its
rational significand as it is: `1/3` is one over three, `3^100000` is
that integer, and nothing rounds either. An inexact value, one that has
passed through a root, an elementary function or `approx`, is rounded,
and the rounding does not snap to a nearby rational: it snaps the
midpoint onto a **decimal grid**, an integer of some number of
significant digits times a power of ten (`settle` in ball.ts, D15),
adding half a grid cell to the radius. The number of digits of that
grid is the working precision of the arithmetic: the grid a pass of the
retry schedule computes on in exact mode, and the working digits of
every step in decimal mode (D26, D27). Whether an answer has the digits
asked for is the radius's to say (D7, the certified digits), and the
grid only bounds the radius from below: a finer grid is necessary for
more certified digits and never sufficient, since cancellation keeps
`(2^(1/2))^2 - 2` at a radius of a grid cell on every grid.

Two bounds follow from this, on two different things:

- **The significand's size, in bits.** An exact significand can grow
  without limit through exact arithmetic, and what it costs to hold and
  to multiply is the bits of its numerator and of its denominator. The
  **significand limit** (`maxBits` today) bounds those bits, each part
  on its own, at every node of the expression (D19), and refuses an
  exact result past it, naming it. An inexact value's significand is a
  grid point, an integer of the grid's digits, so its size is the
  grid's, and it is never refused for size.
- **The grid's fineness, in decimal digits.** The **precision limit**
  (`maxDigits` today) is the most digits an answer may be asked for,
  and through the ceiling of the retry schedule, four times the limit
  plus the guard (D12), the finest grid the app computes on: the top of
  the schedule in exact mode, the top of a step's certification in
  decimal mode, and in both the grid the unit table and the constants
  are held at. It bounds display digits and the working digits.

These are not two quantities that could be one setting in one unit, and
not two unrelated knobs either. They meet in the grid: a grid point of
`d` digits is a significand of about `3.32 d` bits, so the finest grid
must fit inside the significand limit. That is the inequality below,
and it is why a reader of mpmath or MPFR, where the precision is the
width of a binary significand and there is nothing else, should not
expect the two to coincide here: an exact value keeps a rational
significand up to the bit limit, and only an inexact one lives on the
decimal grid, whose digits the precision limit bounds.

## The three numbers, and the fourth

- **Display digits** (`digits` today): the significant digits an answer
  is shown with; eight by default. In exact mode they are what the
  schedule certifies; in decimal mode they are also the grid every step
  is rounded to, unless the working digits are extended.
- **Working digits** (decimal mode's `mode.working`, S2b): the grid of
  every step but the last, locked to the display digits or an extended
  count between them and the precision limit.
- **Precision limit** (`maxDigits` today), in decimal digits: the most
  digits an answer, or the working digits, may be asked for, 1,000 by
  default; the ceiling grid, 4,040 digits at the default, is derived
  from it and never set.
- **Significand limit** (`maxBits` today), in bits: the most bits in a
  significand's numerator, and separately in its denominator, 65,536 by
  default. The translation to decimal digits is per part, about 19,700
  digits in a numerator or a denominator at the default, and is never a
  count of the value's digits, which a ratio such as `1/3` does not
  have.

The chain is significand limit → precision limit → display digits →
working digits, each clamped by the one above it (`clampSettings`), so
that a stored entry is never inconsistent. The ceiling is derived, and
so is the precision limit's own top.

## The relation between the two limits

The link the grid implies is enforced today and is tight. A grid of `d`
digits takes `bitsFor(d) = ceil(d × log2 10) + 32` significand bits in
the kernel, the 32 being the guard; the finest grid under a precision
limit `L` is `4 × (L + 10)` digits; and every ball operation forms its
result from its operands' significands under the significand limit,
inexact operands included (`add`, `pow` and the roots all take it), the
worst case being a product of two grid points on the ceiling grid. So:

```
2 × bitsFor(4 × (L + 10)) ≤ S
```

with `S` the significand limit in bits. `maxDigitsFor(S)` is the largest
`L` that satisfies it, and a test pins it: at the default `S` the limit
may be 2,453 (a ceiling of 9,852 digits, 32,760 bits, twice that just
under 65,536) and 2,454 fails. Read one way, a small significand limit
forces a smaller precision limit; read the other, a precision limit
needs a significand limit of at least twice its ceiling grid's bits.
One inequality, both directions, and the only slack in it is the
guard's 32 bits, which the derivation counts. What is missing is not the
clamp but the telling, below.

## What the ceiling is for in each mode (#86)

#86 was written before D26, when decimal mode ran one pass at Digits and
read the ceiling only to size the unit table and the constants' memos,
so that the precision limit did nothing for a decimal-mode result. D26
changed what the ceiling is read for: in decimal mode every step whose
exact result is not representable (a built-in, a quotient, a root) is
computed at rising grids up to the ceiling until its rounding is
certified, and D27 lets the working digits rise to the precision limit.
So the ceiling has one meaning in both modes, the finest grid the app
computes on, and one field serves the schedule, a step's certification,
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

## The names and their units (P2, P12, the limits half)

Three vocabularies name the same things: the panel's Digits, Precision
limit and Most bits; the storage's `digits`, `maxDigits` and `maxBits`;
the docs' the digits, the cap and the range limit. One vocabulary is
wanted, and it must carry two things the present names do not: what
part of the representation each number bounds, and in what unit. The
rulings:

- **Display digits**, in digits, for Digits: it names what the number
  is, the digits of the display, and no longer stands for the working
  precision, which has its own name. Under the ratio notation it still
  governs the decimal fallback and the certification of every step.
- **Working digits**, in digits, as S2b has it.
- **Precision limit**, in decimal digits: the most digits any grid may
  be asked for. "Precision" is the word the numeric libraries use for
  the working grid's digit count (`mpmath`'s `dps`, the `decimal`
  context's precision), and the limit is the cap on that grid; "Digits
  limit" was weighed and set aside, since it suggests the old decimal
  mode's reading, a cap on Digits and nothing else; "Grid limit" and
  "Grid precision" were weighed and set aside with the alternative
  above, the first naming the ceiling rather than the setting, the
  second reading as a value and colliding with the working digits.
- **Significand limit**, in bits: the most bits in the significand's
  numerator or denominator. "Significand" is IEEE 754's word for the
  part a number's exponent scales, which is what this is, a rational
  one; "mantissa" was weighed and set aside as the word IEEE 754 moved
  away from, ambiguous with the logarithm's fractional part; "Size
  limit" said nothing about what is sized; "Most bits" named the unit
  and not the thing; "Rational bit limit" says the representation but
  not that the exponent is apart from it. The core's own word follows:
  the docs say "significand" from here, and the `Scaled` type's `mant`
  is renamed in the alignment change below.
- **Probe budget**, in milliseconds (below).

**The unit is baked in, in both places.** On screen, every number input
carries its unit after it as a suffix, "1000 digits", "65536 bits",
"50 ms", so that no name has to carry it and no number is read without
it; the two digit settings carry "digits" in their names already and
show it once. In the storage and the code the unit is in the key:
`displayDigits`, `precisionLimitDigits`, `significandLimitBits`,
`budgetMs`, so that a reader of the stored object or of `Settings` sees
the unit beside the number as the user does.

**Alignment.** The storage, the code and the docs follow the names in
changes after this step's panel work, not atomically with it: the
stored keys become `displayDigits`, `precisionLimitDigits` and
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
  listed under "The names", `Scaled.mant` included, with D12, D13 and
  D16 amended.
- README ("Settings"): the four names with their units, the grid
  explained in "How a number is held", the clamp's and the refusal's
  sentences, the probe's promise, the defaults' sentence.
  ARCHITECTURE.md: the mapping of the names until the alignment lands,
  the probe's proposal. docs/settings-plan.md: S3 done. #86 closed;
  #73 and #163 referenced.
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
their names).** The model the names state: a value is a rational
significand times a power of ten, kept exact until it must be rounded,
and then rounded not to a nearby rational but onto a decimal grid whose
digits the precision limit bounds; the significand limit bounds the
bits of the rational, and the grid's points, being significands, must
fit inside it, which `2 × bitsFor(4 × (L + 10)) ≤ S` states and
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
