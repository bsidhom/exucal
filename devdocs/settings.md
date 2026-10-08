# The settings

Six settings, kept in the browser: the display digits, the rounding
mode, the mode (exact, carrying the notation its exact values are written
in, or decimal, carrying its working digits), the precision limit in
digits, the significand limit in bits, and the probe's budget in
milliseconds. [docs/settings.md](../docs/settings.md) is the user's
account of what each does; this page is the model behind them, how they
are stored and migrated, how a change is applied, and the sheet that
holds them. `settings.ts` holds the model, `settings-lines.ts` the words
the sheet says, `settings-panel.ts` the sheet, and `app-shell.ts` applies
every change; the core never sees a setting but through the
`NumberContext` that `contextOf` builds and the ratio notation's settings
that `ratioOf` hands the converter.

The settings, the storage, the code and the docs speak one vocabulary:
`Settings.displayDigits` is `NumberContext.precision`, the grid's digits
below the pipeline; `Settings.significandLimitBits` is
`NumberContext.significandLimitBits`; `Settings.precisionLimitDigits`
derives `NumberContext.ceiling` through `ceilingFor` and has its top
under the significand limit from `precisionLimitFor`. Every number
carries its unit, on screen after the input ("1,000 digits", "65,536
bits", "50 ms", a count of one as "1 digit") and in the stored key
(`displayDigits`, `precisionLimitDigits`, `significandLimitBits`,
`budgetMs`), so that no name has to carry it and no number is read
without it.

## The model

**The terms.** A value is a significand, a rational kept exact until a
rounding has to happen, times a power of ten that costs nothing
([numbers.md](numbers.md)). "Significand" is IEEE 754's word for the
part an exponent scales, and it is the word everywhere in the code and
the docs over "mantissa": IEEE 754 moved away from that word, and it
also names the fractional part of a logarithm. When a value is rounded,
its significand is snapped onto a decimal grid, an integer of some
number of significant digits times a power of ten, and the number of
digits of the grid is the working precision of the arithmetic at that
moment; a grid point is itself a significand, an integer over one, which
is what ties the two limits together. A rounding adds half a grid cell
to the value's radius, the error bound that decides which digits are
certain; the grid is the floor of that error and never its ceiling,
since a finer grid is necessary for more certain digits and never
sufficient (cancellation keeps `(2^(1/2))^2 - 2` at a radius of a grid
cell on every grid).

- **Display digits**, in decimal digits (8 by default): the significant
  digits an answer is shown with. In exact mode the schedule raises the
  grid until that many digits are certain; in decimal mode they are also
  the grid every step is rounded onto, unless the working digits extend
  it, and a typed number with more digits is rounded to them as it is
  read. The display digits are not split into digits shown and digits
  computed with: in exact mode the working precision is not the user's
  (the schedule raises it until the digits asked for are certified), and
  in decimal mode the digits shown and the digits computed are one number
  by the mode's definition, the working digits being the one exception,
  for decimal mode alone.
- **Working digits**, in decimal digits (`mode.working` of decimal mode;
  locked to the display digits by default, or an extended count): the
  grid of every observable step but the last in decimal mode
  ([numbers.md](numbers.md), "The working digits"). A built-in is one
  observable step, and inside it the kernel rounds onto finer grids, up
  to the ceiling, until its rounding onto the working grid is certified:
  the working digits bound what a user can see, not what a built-in may
  use to behave as one operation.
- **Precision limit**, in decimal digits (1,000 by default): the most
  digits any grid may be asked for, the cap on the display digits and on
  the working digits, and, through the ceiling of the retry schedule,
  four times the limit plus the guard of ten (`4 × (L + 10)` for a limit
  `L`, 4,040 digits at the default), the finest grid the app rounds onto,
  in either mode. The ceiling is derived from it and never set.
  "Precision" is the word the numeric libraries use for the digit count
  of the working grid (mpmath's `dps`, the `decimal` context's
  precision), and this is the cap on that; "digits limit" would suggest
  a cap on the display digits and nothing else, "grid limit" would name
  the ceiling grid itself, and "grid precision" reads as a value rather
  than a bound and collides with the working digits.
- **Significand limit**, in bits (65,536 by default): the most bits in a
  significand's numerator, and separately in its denominator; an exact
  result past it is refused and named, and a grid point, being a
  significand, must fit inside it. The name says the part of the
  representation it bounds ("size limit" said nothing about what is
  sized, "most bits" named the unit and not the thing). The unit is
  right only with care: the limit `S` applies to each part on its own,
  so a significand at the limit holds up to `2S` bits, but a claim of
  `2S` bits of precision would promise more than the representation
  holds (only reduced representations are admitted, so the values a
  significand of `S` bits per part can take number fewer than
  `2^(2S)`), while `S` bits is a lower bound on the precision reachable
  within the limit (an integer of `S` bits is such a significand), so
  the setting says `S` bits and claims nothing about `2S`. The
  translation to decimal digits is per part and never a count of the
  value's digits: 65,536 bits is a numerator or a denominator of up to
  about 19,700 digits, and `1/3` has no digit count of its own; the
  sheet's line says so, at three significant figures, following the
  limit in force. A reader of mpmath or MPFR, where the precision is the
  width of a binary significand and there is nothing else, should not
  expect the limit to coincide with the precision limit.
- **Probe budget**, in milliseconds (50 by default; from 10, below which
  no candidate fits, to 10,000, ten seconds a pass being past any use):
  the time the probe allows one pass. A setting of the probe, not of
  the arithmetic, stored with the rest and never seen by the core.

**The two limits meet in the grid.** A grid of `d` digits takes
`bitsFor(d) = ceil(d × log2 10) + 32` significand bits in the kernel, the
32 being the guard; the finest grid under a precision limit `L` is
`4 × (L + 10)` digits; and every ball operation forms its result from its
operands' significands under the significand limit, inexact operands
included, the worst case being a product of two grid points on the
ceiling grid. So `2 × bitsFor(4 × (L + 10)) ≤ S`, and `precisionLimitFor(S)`
is the largest `L` that satisfies it: 2,453 at the default `S`, and
2,454 fails. Read one way, a small significand limit forces a smaller
precision limit; read the other, a precision limit needs a significand
limit of at least twice its ceiling grid's bits. An exact value is
bounded by the significand limit alone (it is never rounded, so no
digits setting touches it, and the display writes as many of its digits
as the display digits ask for and marks the rest rounded away); an
inexact value is bounded by the precision limit alone (its significand is
a grid point, so its size is the grid's, and it is never refused for
size).

**The chain.** Significand limit → precision limit → display digits →
working digits, each clamped by the one above it, the working digits
last and by both their bounds (the display digits their floor, the
precision limit their cap). The ceiling is derived from the precision
limit, and so is the precision limit's own top under the significand
limit. The ratio notation's width (`[1, 1000]`) and the probe's budget
depend on nothing and nothing clamps them. A stored entry is therefore
never inconsistent.

The three numbers stay settings, with the clamps as they are, and the
ceiling is derived and shown, never set and never written as a formula.
Two other shapes were weighed. Deriving the precision limit from the
significand limit, keeping one cost setting, was set aside because the
two bound different things that cost differently (a product of two
significands is quadratic in bits, a built-in's ceiling pass is in
digits of a different operation), the probe measures them apart because
of it, and a user on a device fast at one and slow at the other would
have no way to say so. Making the ceiling the setting, the finest grid
itself, with the most digits an answer may be asked for derived from it,
is the honest pairing with the significand limit, since the inequality
above becomes direct, and it is the quantity the mechanism uses; it was
set aside because the number a user has a reason to set is how many
digits an answer may be asked for, the schedule's room for certification
would then surface as the derivation of that maximum instead of the
ceiling, and the default, 4,040, is no one's choice. It is recorded as
the alternative, should the setting ever be re-based on the grid. The
ceiling is one field of the context, read in both modes: in decimal mode
every step whose exact result is not representable is computed on rising
grids up to the ceiling until its rounding is certified, so the limit has
one meaning in both modes.

**The mode is a nested choice.** A setting that is possible only in one
mode lives inside that mode's variant, so that the shape of the settings
states what is and is not possible:

```ts
export type Notation =
  | { readonly kind: "digits" }
  | { readonly kind: "ratio"; readonly width: number };

export type Working =
  | { readonly kind: "digits" }
  | { readonly kind: "extended"; readonly digits: number };

export type ModeSetting =
  | { readonly kind: "exact"; readonly notation: Notation }
  | { readonly kind: "decimal"; readonly working: Working };
```

The discriminant is the core's `Mode`, the two arithmetics, so that
`settings.mode.kind` is what `contextOf` hands the context and no mapping
is needed. The ratio notation and decimal mode are exclusive, since in
decimal mode every value is a `p`-digit decimal that its digits write
entire ([notation.md](notation.md)); the working digits apply to decimal
mode alone. Two other shapes were set aside: one mode with three values,
`exact | fractions | decimal`, because the notation is not a mode but a
way of writing exact mode's answers, and a flat enumeration would say the
three are peers; and two fields with the second scoped to the first, the
checkbox shown only in exact mode and the stored flag remembered through
a visit to decimal mode, because the type then admits a state, `decimal`
with fractions, that the app must know to ignore, and the shape should
not say what the rule then has to unsay. What the nested shape costs is
that preference: a user who chooses ratios, visits decimal mode and comes
back finds digits, since the exact variant is built afresh with its
default (`DEFAULT_MODES`); the panel offers the last width when `ratio`
is chosen again in a session, and the last extended count when
`extended` is checked again, as a convenience of its own. Every
`ModeSetting` is valid with every value of every other setting, so
`clampSettings` is a clamp and keeps its name. The choices inside a
variant are enumerations named by their values, not booleans: `digits`
(the value's decimal expansion as the display writes it) and `ratio`
(two whole numbers in lowest terms), since "decimal" is the other mode
and "fraction" is the explanation of what a ratio is, and "rational" is a
word about the number rather than about how it is written.

The modes are `exact` and `decimal` in the code, the storage and the
docs. Both modes compute decimals and the first can show ratios, and the
candidates for a better pair ("exact" and "rounded", "certified" and
"calculator") each describe one mode by a property the other also has
in part; "decimal" is the name of the arithmetic everywhere else (IEEE
754's decimal formats, the General Decimal Arithmetic specification,
Python's `decimal`), and decimal mode is that arithmetic exactly.

**Rounding.** The default is `halfEven`, IEEE 754's default, `printf`'s
and the decimal libraries', unbiased over many roundings where ties away
from zero drift; the stored value of the earlier default,
`halfAwayFromZero`, echoed by every save of some other setting far more
often than chosen, was migrated to `halfEven` once, with the control one
tap away. The rounding mode rounds the display's last digit in exact
mode and every step in decimal mode, and the sheet's lines under the
display digits, the rounding and the mode are functions of the mode in
force, so that each says what the setting means now.

## Storage

The settings are one JSON object in `localStorage` under the key
`settings` (`SETTINGS_KEY`), in an envelope:

```json
{
  "version": 5,
  "savedBy": "6c0d0946da31e92eb7d2737a1aebfdf61c1ebf86",
  "settings": {
    "displayDigits": 8,
    "rounding": "halfEven",
    "mode": { "kind": "exact", "notation": { "kind": "digits" } },
    "precisionLimitDigits": 1000,
    "significandLimitBits": 65536,
    "budgetMs": 50
  }
}
```

- `version` is the format version (`STORAGE_VERSION`), an integer: it
  says what shape the stored object has and what its fields mean, so that
  a later build can read it. It is bumped only in the commit that changes
  the stored format, never renumbered, and never computed from any
  release identifier. The app's own version is a different thing (a
  release is named by the commit it was built from), and the two answer
  different questions: the format version "can this build read this
  stored object", a release version "what changed for the user between
  two releases". They move at different rates, since most releases leave
  the stored format alone, and deriving either from the other is the one
  thing that would create a mismatch. Every system that persists data
  keeps the two apart in just this way: a database schema, a file format,
  IndexedDB's own `version`.
- `savedBy` is the build that last wrote the object: the whole build
  string of `build-id.ts`, a full commit hash with `-dirty` when the tree
  was, never the shortened form the footer shows, which could collide.
  It is diagnostic (when a user reports a strange setting, it says which
  build wrote it), and nothing reads it to make a decision. `settings.ts`
  has no DOM dependency and does not import `build-id.ts`: `saveSettings`
  takes the build string as an argument, and the shell passes
  `BUILD_ID`.
- `settings` is the record the rest of the app uses, and its type is
  `Settings` with no version field mixed in.

The version is the record's, not each field's: the settings interact (the
display digits are clamped to the precision limit and that to what the
significand limit holds, and the mode carries fields of its own), so a
migration must be able to read several fields to write one, which a
per-field version cannot express. A migration is a function from the
stored settings at version `n` to the stored settings at version `n + 1`,
the whole record to the whole record. Each is total, never failing and
never throwing; where it cannot carry a value over it leaves the field
for the validation to default, which is the fallback policy applied at
the granularity of a field rather than the whole record; each is pure,
takes the record as data (an `unknown` it validates, not a typed object
it trusts, since it is reading what an older build wrote), and is tested
against a fixture of a real stored object of its source version, with
the totality test over every field of every fixture missing or
malformed. The migrations are a list indexed by source version, so that
adding a version is appending one function and one fixture:

- **1 → 2.** Version 1 is the bare object of `digits`, `rounding`,
  `mode` (a string), `maxDigits`, `maxBits` and `fractions`, with no
  `version` field, which is how it is recognized. The migration wraps it
  in the envelope and changes nothing else, so that the mechanism was
  exercised end to end before a migration with a semantic change
  existed.
- **2 → 3.** The mode becomes the nested choice in place of the mode
  name and the `fractions` flag: `{ kind: "decimal", working: { kind:
"digits" } }` for a stored `"decimal"`, and `{ kind: "exact", notation }`
  otherwise, with `notation` `"ratio"` when the stored `fractions` was
  `true` and `"digits"` for anything else; `fractions` is dropped; and a
  stored rounding of `halfAwayFromZero` becomes `halfEven`. A mode that
  is neither name passes through for the validation to default.
- **3 → 4.** The notation nests inside the exact mode: the string
  `"digits"` becomes `{ kind: "digits" }` and `"ratio"` becomes `{ kind:
"ratio", width: 20 }`, the default width, since no earlier build stored
  one; a decimal mode passes through untouched, and so does a notation
  that is neither string, for the validation to default.
- **4 → 5.** `digits` becomes `displayDigits`, `maxDigits`
  `precisionLimitDigits` and `maxBits` `significandLimitBits`, each
  carried over as it is, malformed or not, and a missing one staying
  missing; `budgetMs`, which no earlier build stored, is left for the
  validation to default. The old keys are not read at version 5: a
  version 5 object carrying `digits` loads the default display digits.

Loading (`loadSettings`, `settingsFromStored`) is a pipeline: read the
text under the key and parse it as JSON (text that is missing or does not
parse gives the defaults); read the version (a missing `version` is 1, an
integer is itself, anything else is treated as a newer version); apply
each migration from that version up to the current one, in order; then
validate each field on its own and clamp the dependent ones, a missing or
malformed field falling back to its default (a version 3 or later `mode`
is validated as a whole and built afresh from its fields, so a stray
field of the other variant is never carried; a `ratio` needs a width in
its range, an `extended` a count the clamp then brings between the
display digits and the precision limit, and the significand limit is
accepted in its own range). The validation stays the first line of
defense, so that the version only has to carry renames and changes of
meaning, not corruption. Where a field's default is not the right
fallback on its own, the migration or the validation of the change that
added the interaction handles it, case by case and not by a general
policy; the mode validated as a whole is the one instance. Saving writes
the envelope at the current version, with the build that saved it, every
time a setting changes. The storage is read once, when the shell is
created, and never watched: two tabs do not see each other's changes,
and the last to save wins.

A stored version above the one the build knows can occur after a deploy
is rolled back, or when a page served from an old cache runs after a
newer build has written storage. The policy is the simple and robust
one: a newer version is treated like text that failed to parse, the
defaults are used in memory, and the next save overwrites the stored
object at the current version. Reading fields out of a newer object is
not done, since a renamed field can mean something else. Keeping the
newer object as an opaque snapshot beside the current one, to offer back
when a build that knows the version arrives, was weighed and left
undone: by then the user may have changed the current settings, and
reconciling the snapshot with those changes has no coherent answer in
general.

The stress catalogue (`bench/stress/catalogue.json`) keeps each case's
settings in the same envelope, `savedBy` the commit the case was measured
at, and reads them through the same migrations (`settingsFromStored`), so
a change here carries the catalogue with it; a test over the committed
file checks that every case still reads as one the suite can run and
that the file stores each case's settings as the current version does,
so a change to the stored shape fails it until `pnpm stress:rewrite` has
rewritten the file ([benchmarks.md](benchmarks.md)).

## Applying a change

Each ranged setting has its range from `rangesOf`, which gives each its
`Bounds`: the range, with `minBy` and `maxBy` naming the setting that
sets a bound where the chain sets one (the display digits from 1 to the
precision limit; the working digits from the display digits to the
precision limit; the precision limit from 1 to `precisionLimitFor` of the
significand limit; the significand limit from `MIN_SIGNIFICAND_LIMIT_BITS`
to the hard bound, bounds that are the app's; the width from 1 to 1,000;
the budget from 10 to 10,000). The template's `min` and `max`, the
validation and the clamp all read it, so the range cannot drift between
them. One rule decides every edit:

- **An edit within the setting's range is accepted; one outside it is
  refused, and the refusal names the bound and the setting that sets
  it** (`refusalOf`: not a whole number, or below or above a bound with
  its setter; "At most 2,453 digits under the significand limit.", "At
  least 8 digits, the display digits.", "A whole number."), under the
  input, with the input marked `aria-invalid` while the line shows. The
  refusal never leaves the panel, and clears on the next change of the
  settings. A refused value does not stay in the input: the panel
  re-renders, and the input shows the setting in force again. The
  input's `.value` is bound through Lit's `live()` directive, which
  compares the bound value with the input's live DOM value rather than
  with the last value Lit committed, so the snap-back is the render
  itself and never an imperative write; a plain `.value` binding would
  not re-set a property whose bound value has not changed, and the
  refused text would stay.
- **An accepted edit re-clamps every setting whose range it changed, and
  says so under each setting moved**, once, until the next change that
  comes through the shell ("lowered from 1,000 to 990 digits to fit the
  significand limit"). `clampSettings` is the fold in the order of
  dependence; `clampsOf` is the same fold with its report, each `Clamp`
  the setting moved, from what to what, by which setting, in the order
  moved; the shell computes the report beside the clamp and passes it to
  the panel as a property with the settings (`clampLine`). A refused
  edit leaves a clamp's line standing. A clamp writes the value, so
  raising the limit back afterwards does not restore what it lowered.

So the bounding setting always wins: setting the significand limit too
small for the precision limit lowers the precision limit, because a
limit is the user's hard cost bound and an edit to it means it; raising
the precision limit past what the significand limit holds is refused,
because accepting it would silently raise a cost bound the user did not
touch. The same pair holds for the display digits under the precision
limit, and for the working digits, which are clamped last, by both the
display digits (their floor) and the precision limit (their cap), the
display digits having been clamped first: raising the display digits
above an extended count raises the count, the one upward move, and it is
the floor doing its job. Refusing an edit to a limit that would lower
another setting was set aside (a user lowering a limit means to, and a
refusal that names three settings to lower first is a chore); following
the ask, an edit to a dependent raising the limit above it, was set aside
(it makes every cost limit soft, so that an edit to the display digits
could raise the time and memory a device is asked for); storing the
value typed and clamping in use was set aside (a stored entry would be
inconsistent). The load path follows the same clamps and tells nothing:
a stored field that is missing, malformed or clamped on loading falls
back silently, since the app has no path yet for a warning a user sees
([#167][167]).

The shell is the one place a change becomes state and an effect. The
panel takes the settings as a property and reports each change the user
makes as a `settings-change` event, and each reset, of one setting or of
all, as `settings-reset`, which the shell applies alike: `withDefault` or
`resetSettings`, then the clamp with its report, then the save; the panel
never reaches for storage. A change to the precision limit rebuilds the
unit table, a few milliseconds that the shell memoizes by the ceiling and
that no other setting incurs.

**Resets.** Beside the label of each setting that is not at its default,
a link-style button names the default and resets to it on press
("default 8", "default exact", "default to nearest, ties to even", the
rounding named by its label), through `withDefault`, which clamps the
dependents as any change does, so resetting the significand limit may
lower the precision limit and say so with the clamp's line. The button is
the indicator: a setting at its default has none (`isAtDefault`), and a
glance down the sheet shows what has been changed. A field within the
mode's variant (`notation`, `working`) resets within the variant in force
and counts as at its default when its variant is not in force; the
mode's own reset is the whole variant. At the sheet's foot, under the
groups, "Reset all settings" restores every default through
`resetSettings`, with no confirmation, since every setting is a tap from
any value and nothing is lost but a number.

## The probe

Both limits are cost limits whose right values depend on the device, so
the sheet's "Measure this device" button runs the probe of `limits.ts`
(`recommendLimits`, over a `Probe` that carries the clock and the two
operations, which the tests fake and the shell takes as the real one).
It times the app's costliest operation on each axis at doubling sizes,
within the stored budget a pass: for the significand limit an exact
product of two fractions of the candidate's bits in each part, whose two
cross-cancelling gcds run before the product is refused by its
prediction, with the operands built outside the timed call (what the
strict limit forms is at most those gcds' operands); for the precision
limit the composite `sin(atan(exp(1)) + ln(3) radian)`, the four
costliest routines of the kernel benchmark's report each once
([builtins.md](builtins.md)), evaluated through the evaluator at the
candidate's ceiling against a table of the one primitive the angle
needs, built at that context. The candidates are the significand
limit's floor, which is tried first so that the size it recommends was
always timed, and then the powers of two from 512 up to the hard bound;
and 1, 2 and 5 times a power of ten for the precision limit, so the
recommendation is a round number by construction; each size is timed as
the shortest of three runs after one untimed. The
budget is per pass, since the schedule's doubling makes an expression
that runs to the ceiling cost about twice its last pass, so that an
expression that runs to the finest grid answers within a keystroke. It
proposes the largest limits whose cost stays within the budget, clamped
to the hard bounds and to the dependency between the two, and its
`Recommendation` carries the time of each operation at the recommended
size, so that the proposal can say them ("exact products up to 65,536
bits and the built-ins at 4,040 digits within 50 ms: significand limit
65,536 bits, precision limit 1,000 digits"); a floor that cost more than
the budget is said to have ("over the 50 ms budget at the least this
device may be set to") rather than claimed to fit. The user applies the
proposal with "Apply", through the same clamp-and-tell as any edit: a
proposal that lowers a setting the user raised is visible before it
lands. Applying at once and telling afterwards was set aside, since a
measurement is information first.

The composite is the elementary routines and not the Gamma and Beta
families, though a ceiling pass of those costs seconds
([cost.md](cost.md)): a precision limit low enough to keep such a pass
within the budget would put out of reach values that are in reach now,
since a value that certifies is cheap at any digits a user asks for (a
thousand digits of `gamma(0.3)` take tens of milliseconds) and only an
expression that never certifies pays for the ceiling pass. What such a
pass costs is the interface's responsiveness, which is [#118][118]'s
and not a limit's.

The probe runs only when pressed, on the main thread, for a fraction of
a second (its freeze is [#163][163]); the button yields a frame before it
runs so that its disabled state is painted, and the probe leaves the
memos at the largest ceiling it tried. The budget is a stored setting
rather than a transient one, which would be the one setting that comes
back different after a reload, so that a user who found the right budget
for a phone keeps it. The probe measures time alone, and memory is an
explicit omission: a browser exposes no portable measure of the memory a
page may use (`performance.memory` is one vendor's and deprecated,
`navigator.deviceMemory` is a coarse bucket absent from two of the three
engines, `measureUserAgentSpecificMemory` needs cross-origin isolation),
and the one way to find the limit without an API, allocating
geometrically until something fails, can leave the page in an
indeterminate state or crash the tab. The budget on time bounds memory
indirectly for these workloads, since a value of `n` bits is `n / 8`
bytes and the operations timed hold a few of them, kilobytes to a few
megabytes at any latency a phone can meet; the decision is revisited if
a portable measure appears.

The defaults are the app's and depend on no device: a precision limit of
1,000 digits and a significand limit of 65,536 bits give a value that
certifies in milliseconds at any display digits a user asks for, and only
an expression that never certifies pays for the ceiling pass. A probe at
launch was set aside: a benchmark at every launch, or at the first, which
a cleared storage repeats, is noise on the main thread for a number the
user can also type, it makes the app's answers depend on the device it
first ran on, and the probe on request is the mechanism for a slow
device. A safe range with a confirmation past it was set aside: the cost
of a setting is not a function of the setting alone (a value that
certifies is cheap at any limit, and `(2^(1/2))^2 - 2` is costly at every
one), so no line in the setting's range separates safe from not, and a
confirmation would be crying wolf at one setting and silent at the
expression that freezes the page. What the sheet does is say the cost in
each limit's line; what makes a slow pass bearable is the interface
staying responsive while it runs, which is [#118][118]'s and not a
setting's.

## The sheet

The settings open as a sheet over the page: a non-modal `<dialog>`
(`show()`, not `showModal()`: the element the platform has for a panel
that is opened and closed, with its `open` state, its role and its
labelling, and without the modal's backdrop, focus trap and inert page,
since the page behind it is exactly what must stay usable), fixed to the
viewport, with the page behind it live and scrollable. On a narrow
viewport it is a bottom sheet that takes the lower three fifths of the
screen, so that the inputs and the first lines of the result stay in
view, and a handle at its top edge drags it to nearly the full height and
back; the handle is a button, so a keyboard's Enter or Space toggles the
height as a tap does, and a pointer drag past 24 pixels changes it
and marks the press as a drag, so that the click that ends the press is
not also a tap. The controls scroll inside the sheet, which is a window
onto its own content: a finger on the sheet scrolls the sheet and a
finger on the page scrolls the page. On a wide viewport, 60rem and up, it
is a side sheet along the right edge, the full height, with no handle,
and the shell pads `<main>` on the right by the sheet's width while it
is open, so that the centered 32rem column and the 24rem sheet never
overlap. One element, two placements by a media query. It closes from
its own Done button, from Escape (which a non-modal dialog does not
handle on its own; the panel does) and from the cog, and not on a tap
outside it, since on a desktop the user may type in the inputs with it
open and watch the result, and on a phone a tap on the result above the
sheet is reading, not dismissing. It is closed on every load.

The on-screen keyboard is part of the design, since the sheet holds
number inputs: the page declares `interactive-widget=resizes-content` in
its viewport meta, so that the keyboard shrinks the layout viewport, and
the sheet's heights are in `dvh`, so that they follow it; without the
declaration the keyboard covers the lower half of the sheet on Android
Chrome, the input being typed in included. A number input's `change`
fires on blur or on Enter, and the numeric keypad has no Enter key on
iOS, so each number input asks for the decimal keypad
(`inputmode="decimal"`) with `enterkeyhint="done"`: Done is Enter, Enter
fires `change`, and the keyboard goes. The Done button in the sheet's
header commits whatever has focus and closes the sheet, the inert place
to tap that the page lacks. Focus lands on the sheet itself
(`tabindex="-1"` on the dialog), not on its first control, since focusing
a number input on a phone would raise the keyboard the moment the sheet
opened; Tab from there reaches the handle, Done and then the controls.
The sheet lives in the panel's shadow root and the cog in the shell's,
and an id reference does not cross a shadow boundary, so the cog carries
no `aria-controls`; the sheet is labelled by its own heading.

**The cog** (`settings-button.ts`) is the one entry point: an icon button
in the top right corner of the page, on the page from the first paint
and above the inputs, so that it is in the same place whatever the
result's length. It is built as the copy button is, a `<button>` holding
an inline SVG, quiet until hovered or focused, with a hit area of at
least 44 by 44 CSS pixels whatever the glyph's size (0.625rem of padding
around the 1.5rem glyph, 44 pixels at 16, the shell pulling it 0.625rem
past the page's gutter so that the glyph's edge sits at the gutter and
the hit area past it, where the copy button, which sits in the flow
beside its line, pulls its padding back with a negative margin instead).
It is a plain button and not a switch: it opens and closes a panel,
which is a disclosure, so it carries `aria-expanded` for the sheet's
state and an `aria-label` of "Settings", which a title repeats for the
pointer, and no switch role. It is first in the tab order, so that the
order of focus is the order on the screen; Enter and Space open it; its
focus ring is the browser's own; focus moves into the sheet when it
opens and back to the cog when it closes. It sits in the shell's header
row, absolutely at the right edge within the safe area insets, at the
title's height, so that the centered title does not move. The header is
not made sticky: it would cost a line of every screen for the one case
of a long result, and the browser's own scroll to the top is a flick.

**A change applies as it is made**, on the control's `change` event,
uniformly: a select or a radio the moment it is picked, a number input
when it is committed, a stepper's tap at once. The display digits, the
rounding, the mode and the notation are each a change the user makes to
see the result written otherwise, and the sheet exists to let them see
it. Apply-on-close would need a draft copy of the settings, a dirty
state, a Cancel, and a rule for what a reset does to a draft, and would
take away the one thing the sheet is for; a modal or a page of their own
would hide the result. Applying the cheap settings keystroke by
keystroke, on `input` with a debounce, was set aside: it would mix two
events and a debounce of the panel's own across the settings, by a
per-setting judgement of what is cheap, and the debounce is the device
the converter itself is to get ([#118][118]); once that scheduler lands,
the settings' typing rides it, with `change` as the commit, one device
for the expression and the settings alike ([#186][186]). A result does
not offer a quick change of the settings that shaped it (more digits,
the other mode, a ratio): the sheet is a tap away and shows the result
live, and such an affordance would have to be designed per line against
the display rules. If the sheet proves too far for the display digits in
particular, a stepper beside the output is the shape to consider, as a
convenience over the same setting and never a second place it is kept.

## The controls

The settings sit in three groups, each a `<fieldset>` with its heading
as the `<legend>` in small capitals and a rule under it, by what a
setting is for and in the order of how often each is touched: a user
changes the display digits or the notation to read a result otherwise
several times an hour, the mode or the rounding a few times a session,
and the limits once per device.

- **How it is shown.** The display digits: a number input with `−` and
  `+` steppers. The notation, in exact mode: two radios, `digits` and
  `ratio` (a choice among ways of writing a value is not an on/off
  toggle, and a radio group shows every value it has, which a third
  notation would join), with the width's input and steppers beside
  `ratio` while it is chosen (the input labelled "Ratio width" for
  assistive technology).
- **How it is computed.** The mode: two radios, `exact` and `decimal`,
  since a choice of two is seen whole as radios, one tap, both names on
  screen, and a select is as wide as its widest option's text (sentences
  as options once made the panel overflow a phone; `min-width: 0` on the
  labels is a belt to that). Under it, what the mode carries: the
  notation's radios in exact mode, and in decimal mode the working
  digits, an `extended` checkbox with the count's input and steppers
  while it is checked (the input labelled "Extended working digits"),
  the two dependents swapping places under the Mode control as the mode
  changes, which shows what each belongs to. The rounding: a select of
  the seven modes (`ROUNDING_LABELS`), the select kept for a choice too
  long to lay out as radios.
- **How much it may cost.** The precision limit and the significand
  limit: a number input each, without steppers, typed with intention and
  rarely; the probe's budget likewise; the probe's button, "Measure this
  device", and its proposal with Apply.

The labels are "Display digits", "Notation", "Mode", "Working digits",
"Rounding", "Precision limit", "Significand limit" and "Probe budget",
with the probe's button under "Limits"; the mode's and the notation's
values are the bare lowercase names they have in the storage.

Each control emits the whole of what it changes, so a change of mode is
one event carrying the chosen mode's variant at its defaults. The
steppers (`step-button.ts`, a `−` and a `+` around the input, each a
square the input's own height in the input's border and radius, so that
the three read as one control, with a thumb's hit area past the square)
change the setting by one through `refusalOf` as a typed value goes, so
a step past a bound shows the same refusal line, and they are disabled at
the bound itself, since a button that refuses is a button that looks
broken. The small numbers have steppers because they are nearly always
nudged by a few; the input stays for a jump to a far value.

Under each control a line, always shown, cut to what a user needs at the
control: each number's line opens with its range and names the setting
that sets a bound where the chain does, from `rangesOf` (`rangeLine`:
"From 1 to 1,000 digits, up to the precision limit." for the display
digits; "From 8 to 1,000 digits, from the display digits up to the
precision limit." for the working digits; "From 1 to 2,453 digits, up to
the significand limit." for the precision limit; "From 358 to 1,048,576
bits." for the significand limit, whose bounds are the app's; and "The
width from 1 to 1,000 digits." opening the notation's line while `ratio`
is chosen), the numbers being the settings in force, so the range moves
when its setter does; then one sentence on what the setting
does, following the mode where the meaning does (`displayDigitsLine`,
`workingDigitsLine`, `precisionLimitLine`, `significandLimitLine`,
`notationLine`, `budgetLine`, `MODE_LINES`, `ROUNDING_LINES`). Showing the
lines on request would need a control per line or a switch for all, and
a control for whether to show help is help nobody asks for; hiding them
altogether leaves a number with no word on what it does. The grid, the
ceiling, why a refusal names the bits, what the probe measures: that is
the user's guide, which the sheet ends with a link to ("About these
settings", `ABOUT`), pointing at [docs/settings.md](../docs/settings.md)
until the guide lands ([#191][191]). The lines, the refusal, the clamp's
line, the resets' text and the proposal are text functions in
`settings-lines.ts`, which the panel composes and a test under Node
reads, since a Lit component is not what a Node test loads.

The reset is a `link-button` (`link-button.ts`), a component the
footer's "reload" and "update" share, the press seen in the text; it
sits inside the control's `<label>`, beside the name, and its click
cancels the label's activation, which would otherwise focus the input or
toggle the checkbox. Every button with words in it (Done, Apply, Retry,
the probe's) is an `app-button` (`app-button.ts`), the one place its look
is defined, and `pressableStyles` in `styles.ts` is the feedback every
button gives, a tint on hover, a deeper tint and a slight shrink while
pressed, the focus ring, the faded disabled look, composed by the cog,
the copy button, the steppers, the handle and the footer's links as
well. The layout is one column at every width: the bottom sheet is a
phone's width and the side sheet is 24rem, and a two-column wrap has no
room in either.

## Where it lives

- `settings.ts`: `Settings`, `ModeSetting`, `Notation`, `Working`, the
  defaults (`DEFAULT_SETTINGS`, `DEFAULT_MODES`, `DEFAULT_NOTATIONS`,
  `DEFAULT_WIDTH`, `WIDTH_LIMIT`, `DEFAULT_BUDGET_MS`, `BUDGET_MS_RANGE`),
  the storage (`loadSettings`, `settingsFromStored`, `storedSettings`,
  `saveSettings`, `STORAGE_VERSION`, the migrations), `rangesOf` and
  `Bounds`, `clampSettings`, `clampsOf`, `refusalOf`, `resetSettings`,
  `withDefault`, `isAtDefault`, `resetSetting`, `contextOf`, `ratioOf`,
  `extendedWorkingOf`, and the validators.
- `settings-lines.ts`: the units, the names, the group headings, the
  rounding labels, the lines, the refusal, the clamp's line, the resets'
  text (`defaultLine`, `RESET_ALL`), the probe's line and proposal, the
  guide link.
- `settings-panel.ts`: the sheet, the groups and their controls, the
  events `settings-change`, `settings-reset` and `settings-close`.
- `settings-button.ts`, `step-button.ts`, `link-button.ts`,
  `app-button.ts`, `styles.ts`: the cog, the steppers, the link-style and
  the worded buttons, and the feedback they share.
- `limits.ts`: `recommendLimits`, `Probe`, `realProbe`, `Recommendation`,
  `COMPOSITE`, `evaluateComposite`.
- `app-shell.ts`: the state, the open flag, the handlers that apply a
  change or a reset through the clamp and save, the table rebuilt by
  ceiling, and focus back to the cog.
- `index.html`: the viewport meta.

[118]: https://github.com/bsidhom/exucal/issues/118
[163]: https://github.com/bsidhom/exucal/issues/163
[167]: https://github.com/bsidhom/exucal/issues/167
[186]: https://github.com/bsidhom/exucal/issues/186
[191]: https://github.com/bsidhom/exucal/issues/191
