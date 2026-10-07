# The limits: three numbers, two costs

The design note for step S3 of docs/settings-plan.md: Digits, the
precision limit and Most bits, which the plan's P1, P2, P3, P7, P9, P10
and P12 (its limits half) find intertwined, misnamed and silent, and
which #86 asks whether decimal mode needs at all. It also settles two
questions the earlier steps sent here: whether the defaults should
depend on the device, and whether decimal mode's working digits should
default above Digits (docs/working-digits.md). It changes no stored
field: what it changes is what each number is called, what the panel
says about it, what a coupled edit tells the user, and what the probe
promises. Responsiveness while a cost is paid stays apart (#118, #163;
D25).

## The three numbers, as they are

- **Digits** (`digits`): the significant digits an answer is shown with,
  and in decimal mode the digits of every value; eight by default.
- **The precision limit** (`maxDigits`, "the cap" in the core's docs): the
  most digits an answer may be asked for, 1,000 by default, and through
  the ceiling of the retry schedule, `4 × (maxDigits + 10)` (D12), the
  most digits the app computes with. It bounds Digits, and decimal mode's
  working digits (D27).
- **Most bits** (`maxBits`, "the range limit" in the core's docs): the
  most bits a numerator or a denominator of an exact value may have,
  65,536 by default, about 19,700 decimal digits (D16). It bounds the
  precision limit, since a settled midpoint at the ceiling must fit it
  with room for a product of two (`maxDigitsFor`): 2,453 digits at the
  default.

The chain is Most bits → the precision limit → Digits (and the working
digits), each clamped to the one above it when any changes
(`clampSettings`), so that a stored entry is never inconsistent. The
three are the user's; the ceiling is derived, and so is the precision
limit's own top.

## What the ceiling is for in each mode (#86)

#86 was written before D26, when decimal mode ran one pass at Digits and
read the ceiling only to size the unit table and the constants' memos,
so that the precision limit did nothing for a decimal-mode result. D26
changed what the ceiling is read for: in decimal mode every step whose
exact result is not representable (a built-in, a quotient, a root) is
computed at rising precision up to the ceiling until its rounding is
certified, and D27 lets the working digits rise to the precision limit.
So the ceiling now has one meaning in both modes, **the most digits the
app computes with**: in exact mode the top of the retry schedule, in
decimal mode the top of a step's certification, and in both the
precision the shared constants and the unit table are held at. #86's
core question, whether decimal mode carries a ceiling or the ceiling
should split into the schedule's top and the constants' precision, is
answered by D26: it carries one, and one field serves both readings.
#86's UX question, whether the panel should say what the limit does in
decimal mode, S2 answered with the line under the setting, which
follows the mode. #86 closes with this note.

**Ruling: `NumberContext.ceiling` stays one field, derived from the
precision limit as today, read in both modes.**

## Which numbers are settings (P7)

The precision limit is a cost knob dressed as a precision, P7 says: what
it bounds is effort, and its line shows the ceiling's formula, an
internal. Three shapes were weighed:

- **Derive the precision limit from Most bits**, keeping one cost
  setting. Set aside: the two axes cost differently (an exact product is
  quadratic in bits, a built-in's ceiling pass is in digits of a
  different operation), the probe measures them apart because of it,
  and a user on a device fast at one and slow at the other would have no
  way to say so (D16).
- **Make the ceiling the setting**, "the most digits the app computes
  with", and derive the cap on Digits from it. Set aside: the number a
  user has a reason to set is how many digits an answer may be asked
  for; the ceiling is four times that plus a guard, a number with no
  meaning but effort, and 4,040 is no one's choice.
- **Keep both settings, and say what each is.** The precision limit is
  the most digits an answer may be asked for, and because certifying an
  answer takes more digits than it has, it is also a bound on effort;
  the line says both, with the ceiling as a number and never as a
  formula. Chosen.

**Ruling: the three numbers stay settings, with the clamps as they are;
the ceiling is derived and shown, never set and never written as a
formula.**

## The unit of Most bits (P2)

Bits are the measure of what an exact value costs to store and multiply,
the unit of the hard bound (`LIMIT_BITS`, 2^20) and of the probe's
candidates (powers of two), and the core's throughout (D16). They are
not how a user of a converter thinks, and the relation to the precision
limit, that half the bits must hold the ceiling's digits, is nowhere a
user reads. Two shapes:

- **Digits as the unit**, the setting stored and shown as the most
  decimal digits of an exact value's part, bits derived. Set aside: the
  round numbers of the hard bound and of the probe become 315,652 and
  19,728, the translation is lossy at the edges, and the core's measure
  would differ from the setting's for no gain a sentence does not give.
- **Bits as the unit, with the digits said beside it.** The input stays
  in bits; the line under it says what that is in digits of an exact
  value ("65,536 bits, about 19,700 digits of a numerator or a
  denominator") and what it bounds; and the precision limit's line says
  its own top under the size limit in force ("up to 2,453 under the
  size limit"), so the relation between the two is read where it bites.
  Chosen.

**Ruling: Most bits keeps bits as its unit and gains a line translating
it to digits; the precision limit's line names its top under it.**

## The names (P12, the limits half)

Three vocabularies name the same things: the panel's Digits, Precision
limit and Most bits; the storage's `digits`, `maxDigits` and `maxBits`;
the docs' the digits, the cap and the range limit. The rulings:

- **On screen and in README: Digits, Precision limit, Size limit.** "Most
  bits" says the unit and not the thing; "Size limit" says what it
  bounds, the size of an exact value, and reads beside "Precision limit"
  as its pair, the two cost limits of D16 on their two axes. "Precision
  limit" stays: it is the most digits an answer may be asked for, which
  is a precision, and its cost reading is the line's to say.
- **The storage keys stay** `digits`, `maxDigits`, `maxBits`. A rename
  is a version 5 migration S1 makes cheap, and it would buy nothing a
  user sees; the keys are named in README once, as they are.
- **The core's docs keep "the cap" and "the range limit"**, the names of
  D12 and D16, and ARCHITECTURE.md's settings paragraph states the
  mapping once: the precision limit is the cap, the size limit the
  range limit. The churn of renaming through forty design notes is not
  worth one vocabulary where a stated mapping gives it.

## Coupled edits (P9)

Lowering the size limit can lower the precision limit and Digits;
lowering the precision limit can lower Digits and the working digits;
the probe sets both limits and can lower what depends on them. The
clamp is right, and it is silent. Three policies:

- **Refuse the edit** that would lower another setting, and say why.
  Set aside: a user lowering a limit means to, and a refusal that names
  three other settings to lower first is a chore.
- **Store the value typed and clamp in use**, so that raising the limit
  back restores what it lowered. Set aside: a stored entry would be
  inconsistent, which S1 and D16 rule out, and the panel would show two
  numbers for one setting, the one typed and the one in force.
- **Clamp and tell.** The clamp stands; when a change lowers another
  setting, the panel says so under the setting lowered, once, until the
  next change ("lowered from 1,000 to 990 to fit the size limit"), and
  README says that raising a limit back does not restore what it
  lowered. Chosen. The shell has what it needs: it clamps the merged
  settings and can compare them with what was asked.

**Ruling: a clamp is told where it lands, once; nothing is refused and
nothing is remembered.**

## Guard rails and the defaults (P3)

The defaults are desktop-sized by D25's ruling and stay: 1,000 digits
and 65,536 bits give a value that certifies in milliseconds at any
Digits a user asks for, and only an expression that never certifies
pays for the ceiling pass. Three guard rails were weighed:

- **Device-dependent defaults on first run**, the probe at launch. Set
  aside, as D16 set it aside: a benchmark at every launch (or at the
  first, which a cleared storage repeats) is noise on the main thread
  for a number the user can also type, it makes the app's answers
  depend on the device it first ran on, and the probe is the one
  mechanism the plan has for a slow device, on request. The earlier
  steps' question of device-dependent defaults is answered the same
  way: the defaults are the app's, the probe is the device's, and the
  panel offers it.
- **A safe range with a confirmation past it.** Set aside: the cost of a
  setting is not a function of the setting alone (a value that
  certifies is cheap at any limit; `(2^(1/2))^2 - 2` is costly at every
  one), so no line in the setting's range separates safe from not, and
  a confirmation would be crying wolf at one setting and silent at the
  expression that freezes the page.
- **Say the cost in the line**, which the lines now do: the precision
  limit's says that an expression whose digits can never be certain runs
  to the ceiling on every keystroke, the size limit's that a product
  near it takes the time its bits imply. Kept, and it is all this step
  adds: what makes a slow pass bearable is the interface staying
  responsive while it runs, which is #118's and not a setting's.

**Ruling: the defaults stay and depend on no device; no confirmation;
the lines say the cost.** The working digits of decimal mode default
to Digits (D27 as ruled): a user who has not touched the setting sees
D26's mode, the extended count is one checkbox away, and a default
above Digits would make the first line of decimal mode depend on a
number the panel does not show until the box is checked.

## The probe's promise (P10)

The button says "Recommend limits"; what it does is time the costliest
operation on each axis at a 50 ms budget a pass, then overwrite both
limits, the ones the user set by hand included, and say nothing. The
rulings:

- **It says what it measures.** The button becomes "Measure this
  device", and its line says the rule: the largest size limit and
  precision limit at which the costliest exact product and the costliest
  built-ins stay within a twentieth of a second a pass, so that an
  expression that runs to the ceiling answers within a keystroke.
- **It proposes; the user applies.** The probe's result is shown as a
  proposal with the numbers it found and the timings behind them
  ("exact products up to 65,536 bits and the built-ins at 4,040 digits
  within 50 ms: size limit 65,536, precision limit 1,000"), and an
  "Apply" beside it sets both limits, through the same clamp-and-tell
  as any edit. A proposal that lowers a setting the user raised is
  visible before it lands, which is P10's complaint met without a
  confirmation dialog. The alternative, applying at once and telling
  afterwards, was set aside: a measurement is information first.
- **The budget is a constant, named in the line**, not a setting: a
  user who wants more latency has the limits to raise, and a second
  knob that moves what the first one recommends would be the coupling
  P1 complains of, one level up.
- **Its freeze is #163's**, not this step's: the probe runs on the main
  thread today, and whether it moves to a worker or yields between
  candidates changes nothing above.

## The lines, as the panel will say them

- Digits: as S2 and S2b have them, by mode.
- Precision limit: "The most digits an answer may be asked for, up to
  2,453 under the size limit. To certify an answer the app computes
  with up to 4,040 digits, so this also bounds the effort an expression
  may cost: one whose digits can never be certain runs to that on every
  keystroke." In decimal mode: "The most digits an answer, or the
  working digits, may be asked for, up to 2,453 under the size limit. A
  step's rounding is certified at up to 4,040 hidden digits." The
  numbers are the settings in force; the formula is not written.
- Size limit: "The most bits in an exact value's numerator or
  denominator: 65,536 bits is about 19,700 digits. A hard limit on the
  time and memory an exact value may cost; the app refuses a result
  past it and names it." (#73, when it lands, makes that message say
  how many bits the result needed.)
- A clamp: under the setting lowered, "lowered from 1,000 to 990 to fit
  the size limit", until the next change.
- The probe: "Measure this device", the proposal and "Apply".

## Where it goes

- `src/settings.ts`: nothing in the shape; a function beside
  `clampSettings` that says which settings a clamp lowered and from
  what, for the panel's line (`clampSettings` keeps its name and its
  contract).
- `src/limits.ts`: `recommendLimits` returns the timings it found beside
  the limits, so that the proposal can say them; the budget is exported
  as it is.
- `src/settings-panel.ts`: the labels ("Size limit"), the lines above as
  functions of the settings, the clamp's line, the probe as a proposal
  with "Apply".
- `src/app-shell.ts`: applies a change through the clamp and hands the
  panel what the clamp lowered.
- README ("Settings"): "Most bits" becomes "Size limit" with the digits
  translation, the clamp's sentence, the probe's promise; the defaults'
  sentence. ARCHITECTURE.md: the mapping of the names, the probe's
  proposal. docs/settings-plan.md: S3 done. #86 closed by this note's
  ruling; #73 and #163 referenced.
- Tests: the clamp's report; the probe's timings in its result; the
  panel's lines and the proposal.

## D29, proposed

**D29. The three limits stay three settings in the units they have,
named Digits, Precision limit and Size limit on screen; the ceiling is
derived from the precision limit and read in both modes, as the most
digits the app computes with; a clamp is told where it lands; the
defaults stay and depend on no device; the probe proposes and the user
applies (S3 of docs/settings-plan.md; resolves #86).** D16's two axes
stand, and D12's ceiling gains its decimal-mode reading from D26. What
the step changes is what the user is told: each limit's line says what
it bounds and what it costs with the numbers in force and no formula,
the size limit's line translates bits to digits, a coupled edit names
what it lowered, and the probe says what it measured before anything
moves.

## Not in this step

- **The probe's freeze (#163)** and responsiveness (#118).
- **The bits a refusal needed (#73).**
- **The panel's placement, grouping and controls (S4, S5)**, which may
  present the proposal and the clamp's line otherwise; this step fixes
  the words and the policy.
- **A rename of the storage keys or the core's vocabulary.**
