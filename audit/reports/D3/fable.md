# Unit D3: The system units catalogue (fable)

- Plan revision: 48b4c2b
- Date: 2026-10-09
- Model: claude-fable-5-1 (the session reports it as both the configured model and the model that served the turn)
- Doc sections read: `docs/definitions.md#What the file contains`; `devdocs/development.md#Adding a unit`; `devdocs/functions.md#Definitions` (the five functions)
- Modules read: `src/units.txt` (in full), `src/units.test.ts` (in full)
- Also read: `docs/definitions.md#(top)` and `devdocs/development.md#Commands` (the §9.4 rows for these pages); `devdocs/functions.md#(top)` (the twenty lines the section builds on). No other module was read. A scratch script outside the tree ran the existing harness (`parseDefinitions`, `buildTable`, `convertText`, `show`) over the file, and the whole test suite was run; "scratch" in the evidence below names that run.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 23 |
| Claims corrected | 6 |
| Claims not verifiable here | 3 |
| Stale passages: update / keep as intent / drop | 4 / 0 / 0 |
| Gaps confirmed / refuted / new | 2 / 1 / 7 |
| Proposed edits | 3 |
| Questions for the owner | 6 |

## Claims

The two §1 claims of this unit's context that rest on `#What the file contains` come first, reported for the file's side (they are A9's; the plan is not rewritten here). The page's own claims follow in the plan's order, then `#Adding a unit` and the five functions.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| Q10: every unit factor is exact as its defining document states; the angle units, `parsec` and `oersted` call `pi()`; the constants are exact by the 2019 SI except the dalton | corrected | `src/units.txt:241`, `:292`, `:354`, `:357`, `:414` (the five `pi()` calls: `deg`, `oersted`, `grad`, `turn`, `parsec`, and every unit defined through them); `:267` (`Da`, "CODATA 2018"); `:344-345` (`tropicalyear`, `siderealyear`, no source); `:112-118` (the constants); `src/units.test.ts:558-567`, `:748-749`, `:484-492` | Every factor is written exactly, so a conversion between units that do not call `pi()` is exact. Where a document fixes a unit, the factor is that document's; the dalton (CODATA 2018) and the tropical and sidereal years are measured values, written exactly to the digits the file gives. The angle units, the parsec and the oersted, and every unit defined through them, call `pi()` and carry its radius. `c`, `e`, `planck`, `boltzmann` and `avogadro` are exact by the 2019 SI; `gravity` is exact by convention, not an SI defining constant. |
| Q12: `degC`, `degF`, `degR` are differences; a reading is a call of `tempC` or `tempF`, whose inverses let the function be the want; the logarithmic units are functions the same way | confirmed | `src/units.txt:190-195`, `:207-210`, `:223-228`; `src/units.test.ts:274-319`, `:321-400`, `:463-474`; scratch: `212 degF - 32 degF` into `degC` is `= 100`, `tempF(212)` into `tempC` is `tempC(100)`, `1000` into `decibel` is `decibel(30)` | "differences", never "intervals" (§12, question 19). |
| The radian is the only `!kind` primitive (§12, question 20) | confirmed | `src/units.txt:24` is the file's one `!kind` line; `src/units.test.ts:186-200` asserts the primitives exactly; scratch: a second `!kind` line builds, so the count is the file's choice and not the core's (Q2) | The file declares nine primitives: the seven SI base units, `radian` as the kind and `bit` (`src/units.txt:17-25`). The page's "the seven base units" is right about the SI; the test's header and title (`src/units.test.ts:2-3`, `:186`) say the primitives are the SI base units and omit `bit`. |
| Sections: the page's six bullets cover the file | corrected | the file's twenty-one sections: `src/units.txt:15`, `:28`, `:84`, `:105`, `:122`, `:140`, `:231`, `:273`, `:336`, `:352`, `:365`, `:418`, `:425`, `:466`, `:487`, `:536`, `:562`, `:570`, `:577`, `:585`, `:608` | Five sections are named by no bullet: angles and rotation (`:352-362`), astronomical (`:410-415`), light (`:570-574`), counts and ratios (`:608-615`), and most of "other common metric and scientific units" (`:273-333`: `Å`, `micron`, `fermi`, `cc`, the radiation units, `carat`, `barn`) beyond the CGS and pressure units the extras bullet names. |
| "after the 9th edition of the SI brochure with the 2022 prefixes" | not verifiable here | `src/units.txt:32-33`, `:55-58`, `:81-82` (quetta, ronna, ronto, quecto and their symbols); the file names no brochure | The 2022 prefixes are confirmed; the attribution appears neither in the file nor in the test. |
| The seven base units | confirmed | `src/units.txt:17-23`; `src/units.test.ts:189-196` | |
| Every prefix by name and by symbol | confirmed | `src/units.txt:32-82`; `src/units.test.ts:203-240` (all twenty-four, by name and by symbol) | `deka-` is a second spelling of `deca-` (`:43-44`) that the page does not mention. |
| Three spellings of micro, `µ`, `μ` and `u` | confirmed | `src/units.txt:72-74`; `src/units.test.ts:241-244`; scratch: `1 µm`, `1 μm` and `1 um` are each `= 1e-6 m` | |
| The binary prefixes `Ki`, `Mi`, … beside them | confirmed | `src/units.txt:84-102` (by name, `kibi-` to `yobi-`, and by symbol, `Ki-` to `Yi-`); `src/units.test.ts:245-248` | |
| The derived units with special names | confirmed | `src/units.txt:142-183` and `:190` (`degC`): the twenty-two of the brochure, `rad` and `sr` included; `src/units.test.ts:498-540` | `mho` (`:165`) is an extra alias of the siemens. |
| The non-SI units accepted for use with the SI (`min`, `h`, `d`, `ha`, `L`, `t`, `au`, `eV`, `Da`, the degree and its subdivisions) | confirmed | `src/units.txt:233-270`; `t` at `:135-136`, in the base-units section, with the comment "accepted for use with the SI"; `src/units.test.ts:542-556` | The brochure's neper, bel and decibel are the three functions (`:223-228`), not units. |
| US customary: the international inch, foot, yard and mile with their subdivisions and multiples, the survey foot and the land-survey units, liquid and dry measure, avoirdupois, troy and apothecaries' mass, the customary force, pressure, energy, power and speed units | confirmed | `src/units.txt:364-408`, `:425-464`, `:486-533`, `:535-567`; `src/units.test.ts:572-725` | |
| "after NIST Handbook 44" | not verifiable here | the file cites the 1959 agreement (`src/units.txt:365-366`) and the Mendenhall Order (`:394-396`), never Handbook 44 | |
| UK imperial: the imperial gallon and its subdivisions, stone, quarter, long hundredweight and long ton, rood and cental | confirmed | `src/units.txt:468-484`, `:500-517`, `:421`, `:503`; `src/units.test.ts:647-663`, `:665-689` | The gallon's multiples, `imppeck` and `impbushel` (`:481-484`), are there too. |
| "after the Weights and Measures Act 1985" | not verifiable here | the section comment (`src/units.txt:466`) and `impgallon  4.54609 L` (`:468`) cite no document | |
| Some common extras: the constants the definitions need, `pi()` a built-in and not a definition, CGS units, conventional pressure units (`atm`, `torr`, `mmHg`, `inH2O`), calories, time units beyond the day, bits and bytes | confirmed | `src/units.txt:105-119`, `:282-293`, `:295-309`, `:311-313`, `:336-349`, `:577-582` | |
| `imp`/`uk`: the plain name is the US unit and the name with `imp` or `uk` in front the imperial one; `gallon` is 231 cubic inches and `impgallon` 4.54609 litres, `ton` 2000 pounds and `longton` (or `ukton`) 2240 | confirmed | `src/units.txt:427`, `:468-470`, `:512-517`; `src/units.test.ts:617`, `:649-650`, `:676-677`; scratch: `1 ton` into `longton` is `≈ 0.89285714` | A third marker, `long` and `short`, serves the ton and the hundredweight (`:504-505`, `:512-513`); `stone`, `quarter`, `rood` and `cental` carry no marker, the US having no unit of the name. |
| The lists: `time` (`hr;min;s`, also `hms`), `dhms`, `ydhms`, `dms`, `ftin`, `ydftin`, `miftin`, `lboz`, `stlb`, `tonlb`, `galqtpt`, `cups`, `mipace`, `kmpace` | confirmed | `src/units.txt:591-605`; `src/units.test.ts:777-801` asserts the fifteen names and bodies exactly | |
| The absent `u` and `at` (from `#Names`, cited by the unit's entry) | confirmed | no `u` or `at` definition in `src/units.txt`; the reason at `:264-266` and `:309`; scratch: adding `u  Da` fails the build with `ambiguousName` (`dau` as `d` + `au` or `da` + `u`), adding `at  technicalatmosphere` with `ambiguousName` (`dat`) | `1 u` is an unknown unit, but `1 at` is a mass today: `a` + `t`, an attotonne (`:52`, `:79`, `:136`). |
| Every factor is the exact one its defining document states, so `1 in` is exactly `2.54 cm` and `1 lb` exactly `0.45359237 kg`, and conversions between them are exact | corrected | `src/units.txt:368`, `:490`; `src/units.test.ts:574`, `:667`; scratch: both exact; the exceptions as under Q10 | The examples hold. The rule is: every factor is written exactly, so a conversion is exact unless a unit calls `pi()`; a few factors are measured values written exactly (the dalton, the tropical and sidereal years), not a document's definition. |
| Temperature readings as `tempC` and `tempF`: `tempC(20)` is a temperature, `tempF(212)` into `tempC` is `tempC(100)` | confirmed | `src/units.txt:207-210`; `src/units.test.ts:285-293`; scratch: `tempC(20)` into `K` is `= 293.15` | |
| `degC`, `degF` and `degR` are intervals: `1 degC` is `1 K`, `212 degF - 32 degF` into `degC` is `100` | confirmed | `src/units.txt:190-195`; `src/units.test.ts:536-538`, `:469`; scratch | "temperature differences" (§12, question 19). |
| A reading is a call of `tempC` or `tempF`, which adds the offset | confirmed | `src/units.txt:197-210` | |
| The logarithmic units are functions: `decibel(20)` is `100`, `bel(2)` the same, `neper(1)` is `exp(1)`, `1000` into `decibel` is `decibel(30)` | confirmed | `src/units.txt:212-228`; `src/units.test.ts:323-332`, `:348-352`; scratch | |
| The decibel is spelled out because `dB` would read as `d` + `B`, a tenth of a byte | confirmed | `src/units.txt:219-221`; `d-` at `:69`, `B` at `:580`; scratch: `1 dB` into `bit` is `= 0.8`, and a function named `dB` fails the build with `prefixedName` (`d` + `B`) | |
| `#Adding a unit`: `pnpm test` loads the file and "fails with the offending definition if it does not build" | corrected | `src/units.test.ts:72-78` (`inspect(parsed)`, `inspect(built)`); scratch: an unknown unit in a body fails with the unit's name and its character span, a duplicate with both definitions | The test fails with the build error, which names the text at fault and its position as character offsets, or both definitions of a duplicate; it does not quote the line. |
| `#Adding a unit`: keep a new unit in its section, prefer the exact factor from a defining document, say where a factor comes from in a comment when it is not obvious | confirmed | `src/units.txt:12` states the same rule; the comments at `:112-118`, `:257`, `:267`, `:299`, `:365-366`, `:394-396`, `:551` | The passage says "the section its kind belongs to"; "kind" is reserved (§8). |
| `#Adding a unit`: unit lists have a section of their own at the end of the file | corrected | `src/units.txt:585` (the lists), `:608-615` ("Counts and ratios" follows and ends the file) | Unit lists have a section of their own, after the units and before the counts and ratios that end the file. |
| `#Adding a unit`: `src/units.test.ts` checks the list of unit lists, so adding one means adding it there too | confirmed | `src/units.test.ts:777-801` | |
| `#Adding a unit`: a function goes in the file the same way | corrected | `src/units.test.ts:275-278` asserts the five functions exactly and `:186-200` the primitives; `:203-240` checks each prefix's presence only | A function or a primitive goes in the file the same way and into the test's list of them, which pins both; a prefix needs no test change. |
| `devdocs/functions.md#Definitions`: "the functions of `units.txt`" are the five shown, each with an inverse | confirmed | `devdocs/functions.md:107-120` against `src/units.txt:207-210`, `:223-228`; `src/units.test.ts:275-283` | |
| `devdocs/functions.md#Definitions`: a function's name must not read as a prefix followed by a unit (`prefixedName`) | confirmed | scratch: `dB(x)` fails the build with `prefixedName`, split `d` + `B`; a unit whose body is a function's bare name fails with `functionAsUnit` | |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/definitions.md#(top)` (the §9.4 row) | "This section describes that file: what it contains, how to read it, and how to add to it." | update | "This page describes the file's format and how to read it; the units it defines are described in [units.md](units.md)." Confirmed at `docs/definitions.md:5-6`. The page is not a README section, and it does not say how to add to the file: that is `devdocs/development.md#Adding a unit`, and what the file contains goes to `units.md`. |
| `devdocs/development.md#Commands` (the §9.4 row) | "(The one place the flag is still written out is the cloud session hook, so that the hook reads as what it does.)" | update | "The cloud session hook writes the flag out so that the hook reads as what it does." Confirmed at `devdocs/development.md:66-67`; the section is V8's, so only the row is confirmed here. |
| `devdocs/development.md#Adding a unit` (found) | "Unit lists have a section of their own at the end of the file" | update | "Unit lists have a section of their own, after the units and before the counts and ratios that end the file" (`src/units.txt:585`, `:608`). |
| `devdocs/development.md#Adding a unit` (found) | "A function goes in the file the same way" | update | "A function or a primitive goes in the file the same way, and into the list of them in `src/units.test.ts`, which pins both; a prefix needs no test change" (`src/units.test.ts:186-200`, `:275-278`). |

The §1.2.5 rows for `devdocs/functions.md` (`#Build-time checks`, `#Alternatives considered`, `#Annotations`, `#Conditions`) lie outside `#Definitions` and are V4's; none falls in this unit's section, and the section itself holds no superseded design.

## Findings

The gaps of section 6 that touch this unit, and the ones it adds.

- **§6.2, exactness of unit factors and which units are inexact through `pi()`: confirmed.** The page states the rule (`docs/definitions.md:44-46`) but names no inexact unit. The file settles it: five definitions call `pi()` (`src/units.txt:241`, `:292`, `:354`, `:357`, `:414`), so `deg`, `degree`, `arcmin`, `arcminute`, `arcsec`, `arcsecond`, `grad`, `gon`, `gradian`, `turn`, `rev`, `revolution`, `circle`, `rpm`, `rps`, `parsec`, `pc`, `oersted`, `Oe` and the list `dms` are inexact, and every other unit is exact (`src/units.test.ts:484-492`, `:748-749`). The rule's owner is `quantities.md` (§7); the list is `units.md`'s.
- **§6.2, why temperature readings and logarithmic levels are functions and not units: refuted as a content gap.** The page gives both reasons (`docs/definitions.md:48-56`), as do the file's comments (`src/units.txt:185-188`, `:197-205`, `:212-221`), and the fuller reason, that a `Quantity` carries no offset, is at `devdocs/functions.md:10-16`. What remains is placement: the reason belongs to `quantities.md` per §7 and §12 question 13, with `units.md` holding the entries.
- **§6.4 (last bullet) and §9.3, the catalogue sits inside a language page: confirmed.** The section's six bullets and three paragraphs describe the file's contents and its naming conventions, not the language; the one language rule among them, that `dB` would read as `d` + `B`, is already stated as a rule in `#Names` and `#Functions` (D2's). The section becomes `units.md`; the skeleton is under "Proposed edits".
- **New: five sections of the file are described nowhere in docs.** Angles and rotation, astronomical, light, counts and ratios, and the bulk of "other common metric and scientific units" (`src/units.txt:273-333`, `:352-362`, `:410-415`, `:570-574`, `:608-615`).
- **New: the naming conventions beyond `imp` and `uk`.** `long` and `short` (`:504-505`, `:512-513`); symbol-and-name pairs throughout; `metre` and `meter`, `litre` and `liter`, `deca-` and `deka-` (`:124-125`, `:254-255`, `:43-44`); Unicode names with ASCII stand-ins (`Ω` and `ohm`, `Å` and `angstrom`, `µ`, `μ` and `u`: `:161-162`, `:275-276`, `:72-74`); case-sensitive near-collisions (`Gal` and `gal`, `St` and `st`, `T` and `t`, `S` and `s`: `:285`, `:428`, `:287`, `:501`, `:168`, `:136`, `:163`, `:19`). Nothing in docs.
- **New: names that mean something other than a reader may expect.** `rad` is the radian and the absorbed-dose rad is not defined (`:142`, `:328`); `e` is the elementary charge and Euler's number is `exp(1)` (`:113`; `src/units.test.ts:368`, `:398-399`); `at` is an attotonne (scratch); `h` is the hour and `planck` the constant (`:235`, `:114`); `c`, `d`, `t`, `g` are the speed of light, the day, the tonne and the gram. Nothing in docs.
- **New: which factors are measured rather than defined.** The dalton (CODATA 2018, `:267`), the tropical year and the sidereal year (`:344-345`, no source) are measured values written exactly; the page's "every factor is the exact one its defining document states" contradicts it.
- **New: the primitives as the file declares them.** Nine, with `bit` among them (`:25`); no page states this, `#The format` (D2's) lists only the SI base units and the radian, and no page or comment says why information is a dimension rather than a count.
- **New: the sources.** The page names three documents the file never cites (the SI brochure, Handbook 44, the 1985 Act); the file cites five the page never names (the 1959 agreement, the Mendenhall Order, IAU 2012, CODATA 2018, IEC 80000-13: `:365-366`, `:394-396`, `:257`, `:267`, `:84`), the International Table for `Btu` and `cal_IT` (`:551`, `:313`) and the conventional `mmHg` and `mmH2O` (`:299`, `:302`). `units.md` should cite what the file cites.
- **New: the unit lists' semantics and the one inexact list.** The page lists the fifteen but nothing says that `dms` alone is inexact (through the angle units), nor where a list's counting rule lives (`quantities.md`, §7; `src/units.test.ts:803-828` shows the straddled count that follows).

Findings on the read-only context, reported and not rewritten:

- **§7, `units.md`, "Names deliberately absent (`u`, `at`, `dB`, `e`)".** `e` is defined (`src/units.txt:113`) and tested (`src/units.test.ts:398-399`) as the elementary charge; what is absent is a name for Euler's number. `at` is absent as the technical atmosphere but resolves as an attotonne. The bullet should read "names that are absent or mean something else", with `rad` added.
- **§12, question 20: confirmed.** The radian is the file's only kind (`src/units.txt:24`); the core accepts more (scratch), so the statement is about the file.
- **Q9's "`u`, `at` are absent for this reason" and Q2's "which kinds exist is the file's business": consistent with the file** (scratch, as above). **Q10: corrected** as in the Claims table; `gravity` is exact by convention, not by the 2019 SI.
- **Code comments that the pages' terms will diverge from** (outside this unit's hands): `src/units.test.ts:2-3` and `:186` call the primitives the SI base units though the assertion includes `bit`; `src/units.txt:185`, `src/units.test.ts:289` and `:463-465` say "interval" where §12 question 19 says "temperature difference"; `src/units.txt:1` says "the system unit definitions" where §8 says "the definitions file".
- **Markdown subset.** `#What the file contains`, `#Adding a unit` and `#Definitions` hold no reference-style link, raw HTML or footnote. The reference-style issue links of `devdocs/functions.md` (`devdocs/functions.md:826-830`, used at `:149`, `:175`, `:238`, `:739`, `:754-763`) all lie outside `#Definitions` and are V4's.

## Proposed edits

### `docs/units.md`

A new page, the skeleton of §7's "The units the app knows", with every fact verified above; `src/units.txt` is the source of truth it defers to (§12, question 4). Complete proposed text:

```markdown
# The units the app knows

Every unit, prefix, unit list and function the app knows is defined in
one file, `src/units.txt`, which is the source of truth: it lists every
name, and a comment beside a factor says where it comes from when that
is not obvious. This page is the guide to what the file holds, by
system and by family, and defers to the file for the full list. The
file's format, and how a name is read, are in
[definitions.md](definitions.md); what a dimension, a kind and a
conversion are is in [quantities.md](quantities.md).

## The primitives

Everything is defined down to nine primitives: the seven SI base units
(`m`, `kg`, `s`, `A`, `K`, `mol`, `cd`), the `radian`, which is the one
kind, declared so that `rad/s` and `Hz` stay apart, and the `bit`. How
a dimension is written in these names is in
[quantities.md](quantities.md).

## The SI

- **Base units**, by symbol and by name (`m` and `metre` or `meter`,
  `kg` and `kilogram`, and so on), with the gram, the tonne (`t`,
  `tonne`, `metricton`) and both spellings of the litre.
- **Prefixes**, every one of the SI by name and by symbol, the 2022
  prefixes included (`quetta-` to `quecto-`, `Q-` to `q-`); `deca-` is
  also spelled `deka-`, and micro has three spellings, `µ` (the micro
  sign), `μ` (the Greek mu) and `u`. A prefix applies to any unit, once,
  and an exact name wins over a split, so `min` is the minute; how a
  prefixed name is read is in [definitions.md](definitions.md),
  "Names".
- **Binary prefixes** for bits and bytes, by name (`kibi-` to `yobi-`)
  and by symbol (`Ki-` to `Yi-`), as IEC 80000-13 defines them.
- **Derived units with special names**, all twenty-two, by symbol and
  by name: `Hz`, `N`, `Pa`, `J`, `W`, `C`, `V`, `F`, `Ω` (or `ohm`),
  `S` (or `mho`), `Wb`, `T`, `H`, `lm`, `lx`, `Bq`, `Gy`, `Sv`, `kat`,
  `rad`, `sr` and `degC`.
- **Non-SI units accepted for use with the SI**: `min`, `h`, `d`, the
  degree and its subdivisions, `ha`, `L`, `t`, `au`, `eV`, `Da`. The
  brochure's neper, bel and decibel are functions here, under
  "Logarithmic levels".

## Constants

The SI's defining constants are definitions, exact by the 2019 SI:
`c`, `e` (the elementary charge), `planck`, `boltzmann` and `avogadro`
(`N_A`). `gravity` (`g0`) is the standard acceleration of gravity,
exact by convention. The circle constant is not a definition but the
built-in function `pi()` ([functions.md](functions.md)), and Euler's
number is `exp(1)`: `e` is the charge.

## Other metric and scientific units

The ångström (`Å`, `angstrom`), the micron, the fermi and `cc`; the CGS
units (`dyn`, `erg`, `Gal`, `poise`, `St`, `gauss`, `Mx`, `Oe`); the
conventional pressure units (`bar`, `atm`, `torr`, `mmHg`, `cmHg`,
`inHg`, `mmH2O`, `cmH2O`, `inH2O`, `kgf` or `kp`, `gf`,
`technicalatmosphere`); the calories (`cal`, the thermochemical one,
and `cal_IT`), `Wh`, `Ah` and `tonTNT`; the metric horsepower
(`metrichp`, `PS`); `kph`; the radiation units `Ci`, `rem` and
`roentgen` (the absorbed-dose rad is not defined, since `rad` is the
radian; `Gy` is there); the carat (`ct`) and the barn.

## Time beyond the day

The week, the fortnight, the Julian year (`year`, `yr`, `julianyear`,
365.25 days), the tropical and sidereal years, the month as a twelfth
of the Julian year, the decade, the century and the millennium.

## Angles and rotation

The degree and its subdivisions (`deg`, `arcmin`, `arcsec`), the grad
(`gon`, `gradian`), the turn (`rev`, `revolution`, `circle`), `rpm` and
`rps`. Every one is defined through `pi()`, so a conversion between
them, or into radians, is inexact and shown with `≈` however round it
is: `turn` into `deg` is `≈ 360`. An angle is a quantity of the radian
kind, not a plain number ([quantities.md](quantities.md), "Kinds").

## US customary

- **Length**: the international inch, foot, yard and mile of the 1959
  agreement (`in` is exactly `2.54 cm`), with `mil`, `hand`, `fathom`,
  `chain`, `link`, `rod`, `furlong`, `league`, the nautical mile, and
  the desktop-publishing point and pica.
- **The survey foot** (`surveyfoot`, exactly `1200 m / 3937`) and the
  land-survey units built on it (`surveymile`, `surveychain`,
  `surveyacre`, `section`, `township`).
- **Astronomical**: the light year and the parsec (through `pi()`).
- **Area**: the international acre, the rood and the acre-foot.
- **Liquid measure**: the gallon of 231 cubic inches and its
  subdivisions down to the minim (the cup is half a pint), the
  petroleum barrel and the hogshead.
- **Dry measure**: the bushel of 2150.42 cubic inches, the peck, the
  dry gallon, quart and pint, the dry barrel, the cord and the board
  foot.
- **Mass**: avoirdupois (`lb`, exactly `0.45359237 kg`, with the
  ounce, dram, grain, stone, quarter, hundredweight and ton), troy and
  apothecaries'.
- **Force, pressure, energy and power**: `lbf`, `poundal`, `slug`,
  `psi`, `psf`, `ksi`, the International Table `Btu`, `therm`, `quad`,
  the mechanical horsepower `hp`, `tonrefrigeration`.
- **Speed**: `mph`, `fps`, the knot.
- **Light**: the footcandle and the phot.

## UK imperial

The imperial gallon (`impgallon`, exactly `4.54609 L`) with its
subdivisions down to the minim and its multiples, the peck and the
bushel; the stone, the quarter, the long hundredweight and the long
ton; the rood and the cental.

## Naming conventions

- Where the US and the UK give one name to different units, the plain
  name is the US unit and the name with `imp` or `uk` in front is the
  imperial one: `gallon` is 231 cubic inches and `impgallon` is
  4.54609 litres. The ton and the hundredweight also come as `short`
  and `long`: `ton` is 2000 pounds and `longton` (`ukton`, `impton`)
  is 2240.
- A unit has a symbol and a name, often both spellings of the name
  (`metre`, `meter`), and a name that is another's bare name is an
  alias of it.
- Names are case-sensitive, and some differ only in case: `Gal` is the
  galileo and `gal` the gallon, `St` the stokes and `st` the stone, `T`
  the tesla and `t` the tonne, `S` the siemens and `s` the second.
- Names in other scripts have ASCII stand-ins: `Ω` and `ohm`, `Å` and
  `angstrom`, `µ` or `μ` and `u`.

## Temperature

`degC`, `degF` and `degR` (`celsius`, `fahrenheit`, `rankine`) are
temperature differences: `1 degC` is `1 K`, and `212 degF - 32 degF`
into `degC` is `100`. A reading is a call of `tempC` or `tempF`, which
adds the offset: `tempC(20)` is a temperature, and `tempF(212)` into
`tempC` is `tempC(100)`. Why a reading is a function and not a unit is
in [quantities.md](quantities.md).

## Logarithmic levels

`neper`, `bel` and `decibel` are functions of a plain number, since a
level is the logarithm of a ratio: `decibel(20)` is a power ratio of
`100`, `bel(2)` the same, `neper(1)` the amplitude ratio `exp(1)`, and
`1000` into `decibel` is `decibel(30)`. `dB` is deliberately absent: it
would read as `d` + `B`, a tenth of a byte, and a function's name may
not read as a prefix followed by a unit.

## Information

The bit is a primitive; the byte (`B`, `byte`) is eight bits, `b` is
the bit and `bps` a bit per second. The binary prefixes apply as any
prefix does: `KiB`, `MiB`, `kibibyte`.

## Counts and ratios

`percent`, `permille`, `ppm`, `ppb`, `dozen` and `gross` are plain
numbers.

## Unit lists

Fifteen lists are defined, each a name typed alone as the want
([quantities.md](quantities.md), "Unit lists"):

| List | Units |
| --- | --- |
| `time`, `hms` | `hr;min;s` |
| `dhms` | `day;hr;min;s` |
| `ydhms` | `year;day;hr;min;s` |
| `dms` | `deg;arcmin;arcsec` |
| `ftin` | `ft;in` |
| `ydftin` | `yd;ft;in` |
| `miftin` | `mi;ft;in` |
| `lboz` | `lb;oz` |
| `stlb` | `stone;lb` |
| `tonlb` | `ton;lb` |
| `galqtpt` | `gal;qt;pt;floz` |
| `cups` | `cup;tbsp;tsp` |
| `mipace` | `hr/mi;min/mi;s/mi` |
| `kmpace` | `hr/km;min/km;s/km` |

`dms` is the one list whose units are inexact, through `pi()`.

## Names that are absent, or mean something else

- `u` (the dalton) and `at` (the technical atmosphere) are absent: with
  `au` and `t` defined, `dau` and `dat` would each read as two
  different prefix-unit pairs, which the file refuses. `Da`, `amu` and
  `technicalatmosphere` are there. Today `at` reads as `a` + `t`, an
  attotonne.
- `dB` is absent (above); write `decibel`.
- `e` is the elementary charge; Euler's number is `exp(1)`.
- `rad` is the radian; the absorbed-dose rad is not defined.
- `h` is the hour, `d` the day, `c` the speed of light, `t` the tonne,
  `g` the gram and `gravity` (`g0`) the standard acceleration.

## Which factors are exact

Every factor is written exactly, so a conversion is exact unless a unit
calls `pi()`: `1 ft` in `in` is `= 12 in`, and `1 in` in `cm` is
`= 2.54`. Where a document fixes a unit, the factor is that document's:
the 2019 SI for the constants, the 1959 agreement for the inch and the
pound, the Mendenhall Order for the survey foot, IAU 2012 for the
astronomical unit, the International Table for `Btu` and `cal_IT`. A
few units have no exact definition and carry a measured value, written
exactly to the digits the file gives: the dalton (CODATA 2018), the
tropical year and the sidereal year. What exact and inexact mean for a
result is in [numbers.md](numbers.md).

To add a unit, see the developer docs:
[development.md](../devdocs/development.md), "Adding a unit".
```

### `docs/definitions.md#What the file contains`

The section (`docs/definitions.md:10-56`) is deleted; its contents are carried into `docs/units.md` above, bullet by bullet (the six bullets into "The SI", "US customary", "UK imperial", "Other metric and scientific units", "Unit lists" and "Temperature"; the `imp` and `uk` paragraph into "Naming conventions"; the exactness paragraph into "Which factors are exact"; the temperature and logarithmic paragraph into "Temperature" and "Logarithmic levels", with "intervals" replaced by "temperature differences"). The rule that `dB` would read as `d` + `B` stays where `#Names` and `#Functions` state it as a rule of the language (D2's sections). In its place, the page's `#(top)` (outside this unit's section, but the §9.4 row's rewrite) reads, old → new:

Old: "This section describes that file: what it contains, how to read it, and how to add to it."

New: "This page describes the file's format and how to read it; the units it defines are described in [units.md](units.md)."

### `devdocs/development.md#Adding a unit`

Complete proposed text:

Append a line to `src/units.txt`, or edit one, and run `pnpm test`: `src/units.test.ts` loads the file and, if it does not build, fails with the build error, which names the text at fault and where it is. Keep a new unit in the section it belongs to, prefer the exact factor from a defining document over a rounded one, and say where the factor comes from in a comment when it is not obvious; a measured value with no defining document (the dalton, the tropical year) names its source and its date. Unit lists have a section of their own, after the units and before the counts and ratios that end the file. The test pins three lists, the primitives, the functions and the unit lists, so adding a primitive, a function or a list means adding it to the test as well; a prefix or a unit needs no test change, though a unit earns a row in the test's table for its section, with the value its defining document gives. A function goes in the file the same way ([functions.md](functions.md)); a built-in is a module under `src/core/builtins/` ([builtins.md](builtins.md), "The rules every built-in follows"). The units the file defines are described for users in [docs/units.md](../docs/units.md), which is revised with the file when a unit is added, renamed or removed.

## Terminology

- "intervals" (`docs/definitions.md:48`; also `src/units.txt:185` and `src/units.test.ts:289`, `:463-465`, which are code and outside this unit): **temperature difference** (§12, question 19); "interval" stays devdocs-only, for a ball.
- "kind" in "the section its kind belongs to" (`devdocs/development.md:138-139`): **the section it belongs to**; "kind" is the quantity model's word (§8).
- "logarithmic units" (`docs/definitions.md:51`; `src/units.txt:212`) beside §7's "Logarithmic levels": the three names are functions, not units, so **the logarithmic functions** `neper`, `bel` and `decibel` for the names and **level** for what a call denotes; "logarithmic units" only when quoting the SI brochure, as "base unit" is kept for quoting the SI.
- "approximate" in §7's "Angle units (approximate through `pi()`)": **inexact** (§8).
- "alias" (`docs/definitions.md:117`; not in §8): **alias** for a unit defined as another's bare name (`metre  m`), and **spelling** for one name in another script or convention (`µ`, `μ`, `u`; `deca-`, `deka-`).
- "symbol" and "name" for a unit's or prefix's short and long forms (`src/units.txt:28`, `:122`; not in §8): keep both, as the SI uses them.
- "the system unit definitions" (`src/units.txt:1`) and "system" for the SI, US customary and imperial: **the definitions file** for the file (§8) and **system** only for a system of units.
- "defined" and "measured" for a factor (not in §8): **defined** when a document fixes it and **measured** when it is a CODATA or astronomical value, both written exactly.

## Questions for the owner

1. **The sources.** The page names three documents the file never cites (the SI brochure, 9th edition; NIST Handbook 44; the Weights and Measures Act 1985), and the file cites five the page never names. Proposed: `units.md` cites what the file cites, as in the skeleton, and the file's header gains the three names beside its rule on comments, a code-comment change outside this unit.
2. **The dalton.** The file's value is CODATA 2018 (`src/units.txt:267`), and CODATA has since published a 2022 adjustment. Proposed: `units.md` says what the file says, "CODATA 2018"; whether the file follows an adjustment, and when, is the owner's call and is recorded in the file's comment.
3. **The tropical and sidereal years** carry no source comment (`src/units.txt:344-345`) and are epoch-dependent. Proposed: a source and an epoch in the comment, and `units.md` names them as measured values written exactly, as the skeleton does.
4. **`bit` as a dimension primitive.** No page or comment says why information is a dimension rather than a count (`src/units.txt:25` says only "information"). Proposed: the reason in the file's comment and in the primitives section of `units.md`: a count of bits must not collapse into a plain number, so that `bit/s` stays apart from `Hz` as `rad/s` does; if the reason is another, it is wanted.
5. **§7's "Names deliberately absent (`u`, `at`, `dB`, `e`)".** `e` is the elementary charge (`src/units.txt:113`), and `at` reads as an attotonne today. Proposed: the bullet becomes "names that are absent or mean something else (`u`, `at`, `dB`, `e`, `rad`)", which the skeleton carries.
6. **The test's wording and its failure message.** Its header and a test's name say the primitives are the SI base units (`src/units.test.ts:2-3`, `:186`) while the assertion includes `bit`; "interval" at `:289` and `:463-465`; and a failing build reports character offsets, not a line. Proposed: fix the comments with the next change to the test and have the failure name the line, both outside this unit; `#Adding a unit` is worded as the test behaves today.

## Notes on this run

The plan assigned this unit the absent `u` and `at` of `#Names`, a section D1 and D2 own; it was verified from the file alone, and the surprise is that `at` resolves today as an attotonne. The plan's "sections" could not be checked bullet by bullet, since the page's six bullets and the file's twenty-one sections do not correspond, so the report maps them and names the five the page omits. §7's skeleton lists `e` among the absent names, but `e` is the elementary charge. The two modules were enough: every example on the page ran through the harness from a scratch script without reading another module, and the build errors for an ambiguous name, a function named like a prefixed unit, a unit named after a function and a bad definition were observed the same way. What later units should know: the test pins three lists exactly (primitives, functions, unit lists), so `#Adding a unit`'s "the same way" is wrong for functions and primitives; the page names three source documents the file never cites and the file cites five the page never names; "every factor is exact as its defining document states" fails for the dalton and the two astronomical years; the pages' "intervals" and the test's wording diverge from §12 question 19; and the whole of `docs/definitions.md` and `devdocs/development.md` were read, beyond the unit's sections, to confirm the §9.4 rows.
