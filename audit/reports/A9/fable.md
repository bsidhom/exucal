# Unit A9: Names, the table and the system definitions' exactness (fable)

- Plan revision: 98b7531
- Date: 2026-10-09
- Model: claude-fable-5-1 (as the session reports it)
- Doc sections read: `devdocs/architecture.md#Definitions`; `docs/definitions.md#(top)` (for the §9.4 row), `#What the file contains`, `#Names`; `devdocs/numbers.md#Working precision and the schedule`; `devdocs/builtins.md#Names`
- Modules read: `src/core/names.ts`, `src/core/name-index.ts`, `src/core/table.ts`, `src/core/build.ts`, `src/core/graph.ts`, `src/system-build.ts`, `src/system-table.ts`, `src/units.txt`, `src/units.test.ts`
- Also read: `src/core/context.ts` (`NumberContext`, `ceilingContext`, `ceilingFor`, `precisionLimitFor`, `withoutWorking`); `src/core/evaluate.ts` (the call header, the unit node, `evaluateBound`, the `undecidedCondition` error); `src/core/quantity.ts` (`multiplyQuantities`, `stepQuantity`); `src/core/ball.ts` (`step`, `multiplyBalls`, headers only); `src/core/pipeline.ts` (where `unitLookup` is made); `src/core/dimension.ts` (`isDimensionless`); `src/core/builtins.ts` (the registry's names); `src/core/expr.ts` (`NAME`); `package.json` (the test script); `audit/plan/05-concept-inventory.md`, `08-terminology.md`, `09-structural-observations.md`, `12-open-questions.md` as context

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 3 |
| Claims corrected | 1 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 4 / 1 / 1 |
| Gaps confirmed / refuted / new | 0 / 0 / 2 |
| Proposed edits | 5 |
| Questions for the owner | 8 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| Q9 | confirmed | `src/core/names.ts:45-59` (`resolveName`: the exact unit name first, else one prefix followed by an exact unit name, so prefixes do not stack); `src/core/build.ts:412-451` (`indexDefinitions`: prefixes a namespace apart; units, lists, functions and built-ins one namespace, a repeat a `duplicate`); `src/core/build.ts:309-330` (a list's, function's or built-in's name that reads as a prefixed unit is `prefixedName`); `src/core/table.ts:215-225` and `234-243` (a call's name resolved exactly, so `ktempC` is `notAFunction` with `otherwise: "nothing"`); `src/core/build.ts:305-308` and `src/core/names.ts:68-94` (an ambiguous name is `ambiguousName`, a build error); `src/units.txt:264-266`, `309` (`u` and `at` absent); `src/units.test.ts:252-272` (`min`, `cd`, `ha` win as exact names) | Two orders the claim can carry, both confirmed (§1.2.6 item 4): inside a function body a parameter name is resolved before any unit or prefix (`src/core/evaluate.ts:1096-1112`), and a call's name resolves among the defined functions before the built-ins (`src/core/table.ts:234-243`), an order the build makes moot by rejecting a definition named like a built-in as a duplicate (`src/core/build.ts:426-431`). |
| Q10 | corrected | `src/units.txt:112-118` (the five SI defining constants marked `(exact)`, `gravity` not); `src/units.txt:267` (`Da`, CODATA 2018), `344-345` (`tropicalyear`, `siderealyear`, measured values written as decimals); `src/units.txt:241`, `354`, `357`, `292`, `414` (`deg`, `grad`, `turn`, `oersted`, `parsec` call `pi()`); `src/units.txt:368`, `490` (`in`, `lb`); `src/units.test.ts:558-567` (the constants exact), `572-591` (the 1959 lengths), `416-424` (`1 ft` in `in` is `12`, exact), `484-492` and `747-749` (the `pi()` units inexact, certifying thirty digits at forty) | Every factor is read exactly as written, so a conversion between units defined by such factors is exact (`1 in` is `2.54 cm`; `1 ft` in `in` is `= 12 in`). Most factors are the exact values their defining documents state; a few are measured values carried to the digits their source gives (the dalton, CODATA 2018; the tropical and sidereal years). The angle units `deg`, `grad` and `turn`, everything built on them (`arcmin`, `arcsec`, `gon`, `rev`, `rpm`, the `dms` list), `parsec` and `oersted` call `pi()` and carry its radius; `sr`, as `radian^2`, is exact. The five SI defining constants (`c`, `e`, `planck`, `boltzmann`, `avogadro`) are exact by the 2019 SI; `gravity` is exact by convention, not by the SI. |
| Q11 | confirmed | `src/system-build.ts:75-90` (one table, memoized by the definitions and the ceiling, rebuilt when the ceiling changes); `src/core/context.ts:235-241` (`ceilingContext`: precision set to the ceiling, working digits stripped, mode forced to exact); `src/core/table.ts:194-198` (a unit handed out as built); `src/core/evaluate.ts:525-535` (the unit node steps it under the pass's context); `src/core/ball.ts:1109-1133` (`step`: settled in exact mode; in decimal mode computed at exact working contexts and rounded once to the digits asked for); `src/core/ball.ts:645-648` (`multiplyBalls` forms an exact product without rounding, so a prefixed unit is rounded once, at the node); `src/units.test.ts:402-447` (`surveyfoot` at eight digits is `0.30480061`, exact, and `0.3048006` toward zero) | The memo also rebuilds when the definitions array is a new object (`src/system-build.ts:82`), which a reload of the file would be; the page's "only when the precision limit changes the ceiling" holds for one loaded file. |
| Q12 | confirmed | `src/units.txt:185-228` (`degC` is `K`, `degF` is `5 K / 9`, `degR` is `degF`; `tempC`, `tempF`, `neper`, `bel`, `decibel` as functions of a plain number, each with an inverse); `src/core/build.ts:136-148` and `src/core/table.ts:51-64` (a definition is a primitive, prefix, unit, list, function or inverse, and a unit is a quantity, so there is no affine form); `src/units.test.ts:274-319` (readings, inverses, the condition at absolute zero), `321-400` (the logarithmic units, `1000` into `decibel` is `decibel(30)`), `463-474` (`212 degF - 32 degF` into `degC` is `100`), `536-538` (`1 degC` is `1 K`) | None. |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/numbers.md#Working precision and the schedule` (lines 857-860) | "they moved once, from a fixed ceiling of a thousand digits with the digits limited to two hundred, when the precision limit became a setting" | drop (the plan's §1.1.5 row, confirmed) | The guard of ten and the factor of four are judgments, not measurements. |
| `devdocs/numbers.md#Working precision and the schedule` (lines 879-880) | "the only such error a later pass can newly raise is a `tooLarge` marking the pass unaffordable" | update (the plan's §1.1.5 row, confirmed as a row; the classes of `tooLarge` are A5's to describe) | From A5's findings: name the classes of `tooLarge` and which of them the loop retries. |
| `docs/definitions.md#(top)` (line 5) | "This section describes that file: what it contains, how to read it, and how to add to it." | update (the plan's §9.4 row, confirmed; the page has no section on adding to the file, which the plan's D3 entry places in `devdocs/development.md#Adding a unit`) | This page describes that file: what it contains and how to read it. |
| `devdocs/architecture.md#Definitions` (lines 170-172) | "`buildTable` takes one list of definitions, so user definitions are simply appended to the system ones." | update (describes user definitions, which the app does not take today, as if in place; §12, question 12) | `buildTable` takes one list of definitions and knows nothing of where they came from; today the system file is the whole list, and user definitions, when the app takes them, append to it and pass the same checks. |
| `devdocs/architecture.md#Definitions` (lines 174-177) | "docs/definitions.md describes them, along with what the system file contains and how to add to it" | update (the docs page has no section on adding to the file) | The format, the name rules and the expression language are user-facing, so [docs/definitions.md](../docs/definitions.md) describes them, along with what the definitions file contains; adding a unit is in [development.md](development.md), "Adding a unit". |
| `devdocs/numbers.md#Working precision and the schedule` (lines 916-918) | "Rebuilding at each pass's precision would cost milliseconds per pass and a table per pass for no gain, and a table per setting would hold one per setting the session had seen." | keep as intent (a ruled-out alternative, with a timing to remove; §12, question 25) | Rebuilding at each pass's precision would cost a build per pass for no gain, and a table per setting would hold one for every setting the session had seen; one table, replaced when the ceiling moves, is the whole footprint. |

## Findings

The model of names, the table and the file's exactness holds against the
code with one correction (Q10's account of the constants) and a handful
of page-level inaccuracies, none of them in a rule a user relies on.
`src/units.test.ts` passes in full (25 tests), so every example the
pages quote from the file is confirmed by a test, not only by reading.

- **Name resolution (Q9) is exactly the pages' rule.** `resolveName`
  tries the exact unit name and then each cut of the name into a prefix
  and an exact unit, shortest prefix first (`src/core/names.ts:45-59`),
  so prefixes cannot stack and an exact name always wins. The two
  namespaces are two maps in the index and the table
  (`src/core/build.ts:270-279`, `src/core/table.ts:51-64`); units,
  lists, functions and the built-ins share one, a repeat being a
  `duplicate` whose `first` may be a built-in's name
  (`src/core/build.ts:418-431`). The check that no list's, function's or
  built-in's name reads as a prefixed unit is one `resolveName` per
  such name (`src/core/build.ts:309-330`), run after the ambiguity
  check, as the page says.
- **Two orders the plan asked about (§1.2.6 item 4).** In a function
  body a parameter name is resolved before any unit or prefix: the bound
  lookup consults the bindings first and only then the table's lookup
  (`src/core/evaluate.ts:1096-1112`, stated in the call header at
  `:52-58`). A call's name resolves among the defined functions before
  the built-ins (`src/core/table.ts:234-243`; the build's lookup applies
  the same order, `src/core/build.ts:935-952`), but a definition named
  like a built-in is a `duplicate` at indexing
  (`src/core/build.ts:426-431`), so a table that builds never has both
  and the order decides nothing. The pages should state the rule as the
  prohibition, not as a precedence.
- **The ambiguity check is as cheap as the page claims.** For each
  prefix that extends another, `findAmbiguity` looks up only the unit
  names starting with the extension, found by binary search in a sorted
  index (`src/core/names.ts:68-94`, `src/core/name-index.ts:25-44`); a
  unit that is the extension itself is skipped, since nothing would be
  left to be a unit (`src/core/names.ts:79-81`). The page's example,
  `d`+`am` against `da`+`m` were `am` a unit, is exactly the case the
  loop finds (`long` = `da`, `short` = `d`, extension `a`).
- **The build order on the page omits one step.** `buildTable` checks
  the context, indexes the definitions, rejects an inverse of no defined
  function, finds an ambiguous name, checks the lists', functions' and
  built-ins' names, collects the primitives, then walks
  (`src/core/build.ts:296-390`). The page's "fixed order" at
  `devdocs/architecture.md:316-323` leaves out the orphan-inverse check.
- **The build-error catalogue on the page is short of four kinds.**
  `BuildError` (`src/core/build.ts:158-262`) also carries `inverseArity`
  (an inverse of a function with other than one parameter, `:218-222`),
  `nonconformingComparison` (`:244-251`) and
  `conditionWithoutParameter` (`:257-261`), and the build produces an
  `undecidedCondition` of the evaluator's shape for a unit, a list's
  unit or an annotation whose call left a condition undecided
  (`src/core/build.ts:800-816`, `src/core/evaluate.ts:335-341`). The
  functions paragraph of the page mentions the last three rules, but
  the catalogue at `devdocs/architecture.md:325-345`, which reads as
  complete, names none of the four.
- **The lookup's one throw is precisely located.** The table's lookup
  throws on a refused prefix-times-unit product (`src/core/table.ts:204-212`), as the page says; the build's own lookup returns the same
  refusal as a located error (`src/core/build.ts:917-933`), so a
  definition that itself writes such a form fails the build, and only a
  user's input naming a prefixed form no definition uses reaches the
  throw. The page's "a definition that puts a unit within a prefix's
  factor of the bound, throws" is right about the cause and loose about
  the place.
- **The file's exactness (Q10) needs one qualification.** The file
  marks the five SI defining constants `(exact)` and leaves `gravity`
  unmarked (`src/units.txt:112-118`): `9.80665 m/s^2` is exact by
  convention, not by the 2019 SI, so the claim's "the constants are
  exact by the 2019 SI except the dalton" misfiles it. Outside the
  constants section, the dalton (`:267`, CODATA 2018) and the tropical
  and sidereal years (`:344-345`) are measured values written as
  decimals; every other factor is the exact value of its defining
  document or convention (the conventional millimetre of mercury at
  `:299`, the IT Btu at `:551`, the astronomical unit at `:257`). Since
  a decimal literal is read exactly, conversions between all of them
  are exact; what differs is whether the digits are the truth or a
  measurement, which `docs/definitions.md:44-46` elides.
- **Which units call `pi()`.** `deg` (`src/units.txt:241`), `grad`
  (`:354`), `turn` (`:357`), `oersted` (`:292`) and `parsec` (`:414`),
  and through them `arcmin`, `arcsec`, `gon`, `gradian`, `rev`,
  `revolution`, `circle`, `rpm`, `rps`, `Oe`, `pc` and the `dms` list.
  `sr` is `radian^2` and exact (`:143`). The tests confirm the
  consequence: `turn` into `deg` is inexact, contains `360` and
  certifies thirty digits at a working precision of forty
  (`src/units.test.ts:484-492`), and so do the parsec and the oersted
  (`:747-749`). No docs page in this unit's scope says that a
  conversion among the angle units shows `≈`; the plan's Q10 takes it
  from `devdocs/numbers.md`. That is a gap for the docs (new gap 1).
- **The table at the ceiling (Q11) is the mechanism the pages
  describe.** `buildSystemTable` builds at `ceilingContext(context)`
  and memoizes one table keyed by the definitions and the ceiling
  (`src/system-build.ts:75-90`); `ceilingContext` sets the precision to
  the ceiling, strips the working digits and forces exact mode
  (`src/core/context.ts:235-241`), which is the page's "built in exact
  mode whatever the user's mode". The lookup hands a unit out as built
  (`src/core/table.ts:194-198`) and the evaluator's unit node steps it
  under the pass's context (`src/core/evaluate.ts:525-535`): `step`
  settles in exact mode, and in decimal mode computes at exact working
  contexts and rounds once to the digits asked for
  (`src/core/ball.ts:1109-1133`). A prefixed unit is formed by
  `multiplyBalls`, which gives an exact product with no rounding
  (`src/core/ball.ts:645-648`), so it too is rounded once, at the node;
  the decimal-mode example of the claim is a test
  (`src/units.test.ts:402-447`). The file builds at the least
  significand limit the settings allow (`src/units.test.ts:169-184`),
  which is why the limit is not part of the memo's key
  (`src/system-build.ts:10-16`).
- **Temperature and the logarithmic units (Q12).** `degC`, `degF` and
  `degR` are defined as multiples of the kelvin (`src/units.txt:190-195`), readings and levels as functions of a plain number with
  inverses (`:207-228`), and a definition has no affine form
  (`src/core/build.ts:136-148`). The tests cover every example the
  docs page gives (`src/units.test.ts:274-319`, `321-400`, `463-474`).
- **`devdocs/builtins.md#Names` bullet 5 ends in a false clause.** "no
  built-in is a prefix of another's name either" fails in both
  readings: as strings, `log` begins `log10`, `erf` begins `erfc`,
  `sin` begins `sinh`; as a unit prefix followed by a built-in, `asin`,
  `acos`, `atan`, `asinh`, `acosh` and `atanh` each read as the atto
  prefix `a` (`src/units.txt:78`) followed by a built-in
  (`src/core/builtins.ts:56-107`). Neither matters, for the reason the
  bullet gives: a call's name is never split (`src/core/table.ts:234-243`), and the build's check tries only prefix-and-unit splits
  (`src/core/build.ts:317-330`), which is why `asin` builds. The clause
  should say that.
- **`docs/definitions.md#Names` holds throughout.** The name shape is
  the lexer's `NAME`, a letter or underscore followed by letters, digits
  and underscores (`src/core/expr.ts:290`); the resolution, the
  namespaces, `ktempC(1)`, the absent `u` and `at` and the longer names
  that stand in (`src/units.txt:267-270`, `309`) are all as stated.
  One nuance for D1: `NAME` takes letters of any script but only the
  ASCII digits `0-9`.
- **Gaps.** Section 6 was not in this unit's context, so none of its
  rows is confirmed or refuted here. Two new gaps in the docs pages of
  this unit: that the units defined through `pi()` carry its radius, so
  a conversion among them is `≈` (above), and that a few of the file's
  factors are measured values rather than defined ones.

## Proposed edits

### docs/definitions.md#What the file contains

Old (lines 41-46):

Where the US and the UK give one name to different units, the plain name is the US unit and the name with `imp` or `uk` in front is the imperial one: `gallon` is 231 cubic inches and `impgallon` is 4.54609 litres, `ton` is 2000 pounds and `longton` (or `ukton`) is 2240. Every factor is the exact one its defining document states, so `1 in` is exactly `2.54 cm` and `1 lb` exactly `0.45359237 kg`, and conversions between them are exact.

New:

Where the US and the UK give one name to different units, the plain name is the US unit and the name with `imp` or `uk` in front is the imperial one: `gallon` is 231 cubic inches and `impgallon` is 4.54609 litres, `ton` is 2000 pounds and `longton` (or `ukton`) is 2240. Every factor is read exactly as written, so a conversion between units defined by such factors is exact: `1 in` is exactly `2.54 cm`, `1 lb` exactly `0.45359237 kg`, and `1 ft` in `in` is `= 12 in`. Most factors are the exact values their defining documents state; a few are measured values carried to the digits their source gives, such as the dalton (CODATA 2018) and the tropical and sidereal years. The units defined through the circle constant, the angle units `deg`, `grad` and `turn` with everything built on them, the parsec and the oersted, carry the error radius of `pi()`, so a conversion among them is inexact and is written with `≈` even when every digit shown is certified: `turn` into `deg` is `≈ 360`.

Old (lines 48-56):

The temperature units `degC`, `degF` and `degR` are intervals: they convert temperature differences, so `1 degC` is `1 K` and `212 degF - 32 degF` into `degC` is `100`. A temperature reading is written as a call of `tempC` or `tempF`, which adds the offset for you. The logarithmic units are functions the same way, since a level is the logarithm of a ratio rather than a multiple of a unit: `decibel(20)` is a power ratio of `100`, `bel(2)` the same, `neper(1)` the amplitude ratio `exp(1)`, and `1000` into `decibel` is `decibel(30)`. The decibel is spelled out because `dB` would read as `d` + `B`, a tenth of a byte.

New:

The temperature units `degC`, `degF` and `degR` are temperature differences: `1 degC` is `1 K`, and `212 degF - 32 degF` into `degC` is `100`. A temperature reading is written as a call of `tempC` or `tempF`, which adds the offset for you, and a reading converts into either function: `tempF(212)` into `tempC` is `tempC(100)`. The logarithmic units are functions the same way, since a level is the logarithm of a ratio rather than a multiple of a unit: `decibel(20)` is a power ratio of `100`, `bel(2)` the same, `neper(1)` the amplitude ratio `exp(1)`, and `1000` into `decibel` is `decibel(30)`. The decibel is spelled out because `dB` would read as `d` + `B`, a tenth of a byte.

### docs/definitions.md#Names

Old (lines 119-122):

Prefixes apply to units alone: the name of a function, defined in the file or built into the app, is looked up exactly, so `ktempC(1)` is a call of nothing, and a function's name may not itself read as a prefix followed by a unit (see Functions below).

New:

Prefixes apply to units alone: the name of a function, defined in the file or built into the app, is looked up exactly, so `ktempC(1)` is a call of nothing, and neither a function's name nor a unit list's may itself read as a prefix followed by a unit (see Unit lists and Functions below).

### devdocs/architecture.md#Definitions

Old (lines 170-172):

`buildTable` takes one list of definitions, so user definitions are simply appended to the system ones.

New:

`buildTable` takes one list of definitions and knows nothing of where they came from; today the system file is the whole list, and user definitions, when the app takes them, append to it and pass the same checks.

Old (lines 174-177):

The format, the name rules and the expression language are user-facing, so [docs/definitions.md](../docs/definitions.md) describes them, along with what the system file contains and how to add to it.

New:

The format, the name rules and the expression language are user-facing, so [docs/definitions.md](../docs/definitions.md) describes them, along with what the definitions file contains; adding a unit is in [development.md](development.md), "Adding a unit".

Old (lines 241-244):

A lookup has no error to return for a refusal, so the one case that could reach it, a definition that puts a unit within a prefix's factor of the bound, throws (`table.ts`).

New:

A lookup has no error to return for a refusal, so the one case that could reach it, a user's input naming a prefixed form of a unit that a definition put within a prefix's factor of the bound, throws (`table.ts`); the build's own lookup reports the same product refused at the reference that forms it, so a definition that writes such a form fails the build instead.

Old (lines 316-323):

`build.ts` puts them together in a fixed order: index the definitions by name, rejecting a duplicate; check the index for an ambiguous name, and the names of the lists, the functions and the built-ins for one that reads as a prefixed unit; collect the primitives and their roles; then walk every definition in order, where a body is evaluated by `evaluate` against a lookup that resolves each name through the index and requests the definitions it means from the walker, with those primitives. The first failure ends the build.

New:

`build.ts` puts them together in a fixed order: index the definitions by name, rejecting a duplicate; reject an inverse of no defined function; check the index for an ambiguous name, and the names of the lists, the functions and the built-ins for one that reads as a prefixed unit; collect the primitives and their roles; then walk every definition in order, where a body is evaluated by `evaluate` against a lookup that resolves each name through the index and requests the definitions it means from the walker, with those primitives. The first failure ends the build.

Old (lines 325-345): the build-error catalogue paragraph, from "A build error is one of" to "something the user can see."

New:

A build error is one of: a duplicate name, carrying both definitions, or the built-in's name and the definition that takes it; an ambiguous name with its two splits; a unit list, function or built-in whose name reads as a prefix and a unit, carrying the definition (or the built-in's name) and the split; a lookup failure at its reference (an unknown name, a function used as a unit, a call of what is not a function, or a prefix times a unit refused as too large or too small); a cycle, carrying the definitions on it in order and the span of the reference that closed it; a prefix whose body is not a plain number, carrying the definition and the dimension it has; a unit list whose units do not make a list, carrying the definition and the list error with the index of the unit at fault; a function whose body does not conform to its result's annotation, or an inverse whose body does not conform to what its function's parameter takes, carrying the definition and the mismatch; an inverse of no defined function, or of a function with other than one parameter, carrying the count; a function whose parameter's or result's annotation is zero, or cannot be told from zero, since a recovered argument is written as a count of the parameter's; a condition of a function or an inverse whose terms do not conform, carrying the condition's span, the spans of the two terms and the mismatch, or one that mentions no parameter, carrying the condition's span; a call in a unit's body, a list's unit or an annotation whose condition the build could not decide, since a unit has nowhere to carry the assumption; or an arithmetic failure from the evaluator, located as the evaluator locates it. Every span is an offset into the whole definitions text, and a definition's span covers its text from name to body, so each error points at something the user can see.

### devdocs/builtins.md#Names

Old (lines 57-61):

- No built-in collides with a unit of `units.txt` or reads as a prefix followed by one, and the build checks both for any table it builds. Prefixes apply to units alone: a call's name is looked up exactly, so `kpi()` and `mexp(1)` are calls of nothing, and no built-in is a prefix of another's name either.

New:

- No built-in collides with a unit of `units.txt` or reads as a prefix followed by one, and the build checks both for any table it builds. Prefixes apply to units alone: a call's name is looked up exactly, so `kpi()` and `mexp(1)` are calls of nothing, and a built-in whose name happens to read as a prefix followed by another built-in's (`asin` as `a` + `sin`) is only itself, since no prefix is ever tried on a call.

### devdocs/numbers.md#Working precision and the schedule

Old (lines 857-860):

The guard of ten and the factor of four are judgments, not measurements; they moved once, from a fixed ceiling of a thousand digits with the digits limited to two hundred, when the precision limit became a setting.

New:

The guard of ten and the factor of four are judgments, not measurements.

Old (lines 916-918):

Rebuilding at each pass's precision would cost milliseconds per pass and a table per pass for no gain, and a table per setting would hold one per setting the session had seen.

New:

Rebuilding at each pass's precision would cost a build per pass for no gain, and a table per setting would hold one for every setting the session had seen; one table, replaced when the ceiling moves, is the whole footprint.

## Terminology

- "intervals" for `degC`, `degF`, `degR` (`docs/definitions.md:48`;
  also the comment at `src/units.txt:185-188` and the test names at
  `src/units.test.ts:289`, `463`): **temperature difference** (§12,
  question 19). The page is in the proposed edit above; the comment and
  the test names are a code change, for D3 to record.
- "the system file", "system units", "a static definitions file"
  (`devdocs/architecture.md:166`, `176`): **the definitions file**
  (§8), with "system" kept only where the page contrasts it with user
  definitions.
- "two different prefix-unit pairs" (`docs/definitions.md:124`) against
  "two different prefix-unit splits" (`devdocs/architecture.md:295`,
  `Split` in `src/core/names.ts:33`): not in §8. Proposed: **pair** in
  docs, **split** in devdocs, the code's word.
- "plain number" against "dimensionless" (`devdocs/architecture.md:211`,
  `217`): both are used for a prefix's body, and both mean neither
  dimension nor kind, which `isDimensionless` tests on the whole vector
  (`src/core/dimension.ts:104-106`); consistent with §12, question 20.
  No change.
- "a call of nothing" for `notAFunction` with `otherwise: "nothing"`:
  used identically in both corpora (`docs/definitions.md:121`,
  `devdocs/architecture.md:233`). Keep.
- "the walk", "the walker", "a node of the walk": devdocs-only, the
  code's words (`src/core/graph.ts`). Keep.

## Questions for the owner

1. Should `docs/definitions.md#What the file contains` name the measured
   values (the dalton and the two year lengths) and `gravity`'s
   conventional exactness, as the proposed edit does? Proposed: yes,
   in one sentence, since "every factor is the exact one its defining
   document states" is read as a promise about the truth of the digits.
2. `devdocs/builtins.md#Names`, "no built-in is a prefix of another's
   name either": delete, or restate as the proposed edit does?
   Proposed: restate, since the guarantee that holds (a call's name is
   never split) is worth one clause.
3. For D1: `docs/definitions.md#Names` says "letters, digits and
   underscores, in any script", but `NAME` (`src/core/expr.ts:290`)
   takes letters of any script and only the ASCII digits. Proposed: "a
   letter or underscore followed by letters in any script, the digits 0
   to 9, and underscores".
4. For D3 and V2: `docs/definitions.md:5` and
   `devdocs/architecture.md:174-177` both say the docs page tells how
   to add to the file, which the page does not; the plan's D3 entry
   places that in `devdocs/development.md#Adding a unit`. Proposed: the
   devdocs pointer names `development.md` and the docs page's top drops
   "how to add to it", as the stale-passage rows above propose.
5. For V1: the "milliseconds per pass" at `devdocs/numbers.md:916-917`
   is a timing in a ruled-out alternative (§12, question 25). Proposed:
   the qualitative wording in the stale-passage row above.
6. For D2 and V4: the pages state a precedence, defined functions
   before built-ins, that the build makes unreachable by rejecting a
   definition named like a built-in (`src/core/build.ts:426-431`).
   Proposed: `devdocs/functions.md#Names and shadowing` states the
   prohibition and leaves the lookup's order to the code comment.
7. For V2 and D9: `src/system-build.ts:2` and `src/system-table.ts:10`
   cite `devdocs/architecture.md`, "The shell and its parts", as the
   design of the table at the ceiling, which
   `devdocs/numbers.md#Working precision and the schedule` states in
   full. Proposed: V2 confirms that the shell section carries the
   design or the comments point at `numbers.md` instead (a code-comment
   change).
8. For D3: `src/units.txt:118` leaves `gravity` unmarked where the five
   defining constants say `(exact)`. Proposed: the comment says
   "(exact by convention)", a code change for D3's catalogue.

## Notes on this run

The plan's scope for this unit was right: the four claims live in the
nine modules listed, and only Q11's "settled at the node" and the
decimal-mode rounding needed a look at `context.ts`, `evaluate.ts`,
`quantity.ts` and `ball.ts`, all by the functions the claim names;
`builtins.ts` was needed for one clause of `devdocs/builtins.md#Names`
and `expr.ts` for one sentence of `docs/definitions.md#Names`. The
hardest part was the exactness claim, which is true of every literal
and false of a few digits, a distinction the file's own comments make
(`(exact)` on five constants and not on `gravity`) and the docs page
does not; the next unit to touch the file (D3) should carry the
measured-versus-defined distinction into the catalogue entry by entry.
`devdocs/architecture.md#Definitions` is accurate about the mechanism
to a degree that makes its omissions (the orphan-inverse step, four
error kinds) easy to miss; V2 should check the catalogue against
`BuildError` again after any change to `build.ts`.
