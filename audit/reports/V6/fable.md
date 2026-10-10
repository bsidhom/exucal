# Unit V6: devdocs/future.md and devdocs/cost.md (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session reports it as both its configured and its last served model)
- Doc sections read: `devdocs/future.md` in full (`#(top)`, `#Symbolic values`, `#Complex numbers`, `#Extensions that fit`, `#Ruled out, and why`, and the link definitions after it); `devdocs/cost.md` in full (`#(top)`, `#How a case is measured`, `#Reproducing a case`, `#What the costs come from`, `#What the search has not reached`, `#The hangs`, `#The catalogue`; the two generated tables read as data through `bench/stress/catalogue.json` and sampled as text)
- Modules read: `bench/stress/harness.ts`, `bench/stress/catalogue.ts`, `bench/stress/search.ts`, `bench/stress/cases.ts`, `bench/stress/tooling.ts`, `bench/stress/verify.ts`, `bench/stress/pool.ts`, `bench/stress/rewrite.ts` (in full); `bench/stress/cases.test.ts`, `bench/stress/catalogue.test.ts`, `bench/stress/harness.test.ts`, `bench/stress/pool.test.ts` (headers; the first, second and fourth run, 20 tests passing); `bench/stress/catalogue.json` (analysed by a scratch script outside the tree); `src/core/pipeline.ts` (the module header, `PassEvent`, `PassObserver`, `resolve`, `schedule`, `evaluateText`, `convertText`)
- Also read: `src/core/constants.ts` (header), `src/core/bernoulli-ratios.ts` (header), `src/core/fixed-exp.ts` (header), `src/core/dimension.ts` (the conformance check), `src/core/build.ts` (`buildTable`'s signature), `src/core/ball.ts` (`exactRoot`, by grep), `src/core/definitions.ts` (the `name[` reservation, by grep), `src/core/builtins.ts` (header), `src/core/builtins/pi.ts` and `src/core/builtins/exp.ts` (the names, by grep), `src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`, by grep), `src/units.txt` (a grep for a unit named `i`), `package.json` (the `stress` scripts), `docs/functions.md` (its cost sentences, as the unit's context), a grep of issue numbers and of links into the two pages over `docs/` and `devdocs/`, and the repository's issue list on GitHub (the state of every issue the two pages name, read on 2026-10-10). Two scratch scripts ran the existing harness and `schedule` on the profiles' settings; nothing in the tree was changed.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 1 |
| Claims corrected | 1 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 13 / 1 / 0 |
| Gaps confirmed / refuted / new | 0 / 0 / 2 |
| Proposed edits | 7 |
| Questions for the owner | 8 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N7 | corrected | `src/core/pipeline.ts:325-327` (`resolve`: "an error `retries` accepts continues; any other error ends the loop with the best result so far"); `src/core/pipeline.ts:425-441` (`evaluateText` retries `isUnresolved` to the ceiling); `bench/stress/cases.ts:12-28` (the four patterns, each a value that never certifies, which "the retry loop retries to the ceiling and then refuses" at an edge); `bench/stress/catalogue.json` (every one of the 225 `default` entries ran nine passes to the ceiling of 4,040 digits; one `extreme` entry, `incbeta(0.3, 0.001, approx(0.5)) - incbeta(0.3, 0.001, approx(0.5))`, ran eleven of its fifteen passes, the eleventh ending the loop in milliseconds, and shows the tenth pass's result, "≈ 0 (within 2e-9225 of zero)"; an `edge:divide` entry's refusal reads "cannot be told from zero at this precision, and the result depends on which side of zero it lies") | The cost half of the claim, this unit's, holds with one qualification: a pass can end the loop before the ceiling with a refusal the loop does not retry, and the best result so far is then shown. The identity examples are the A units'. Corrected statement: "As the numeric model stands, an identity through an irrational step never certifies zero or a rational: `sqrt(2)^2 - 2` is `≈ 0` within a bound, `turn` into `deg` is `≈ 360`, `sin(pi() radian)` is `≈ 0`; such expressions run every pass up to the ceiling, or until a pass ends the loop with a refusal the loop does not retry, when the best result so far is shown (cost), and dividing by such a value is refused ("cannot be told from zero"). This is a consequence of the current representation and computation paths, not a design goal: the user docs state it as today's behaviour, and the intended remedy, if one comes, is a symbolic layer for a subset of identities (§1.3; `devdocs/future.md#Symbolic values`)." |
| N25 | confirmed | `bench/stress/harness.ts:7-13` (the constants' memos, the Bernoulli run and the table are module state; the cold evaluation pays for what is computed once); `src/core/constants.ts:1-2` and `:38-45` (`pi` and `e` computed on the first request at the ceiling plus a margin and kept; a request at a higher ceiling replaces the value); `src/core/bernoulli-ratios.ts:17-21` and `:40-42` (the memo holds one run, grown on a larger count or more bits; "the tangent-number run is the cost of a reservation, a few seconds at the ceiling once per count"); `bench/stress/catalogue.json` (of the 18,524 keystrokes typed over the default-limit entries, 531 reach 10 ms and 253 reach 100 ms, all but one of them the keystroke that completes the expression; the Gamma family's cold evaluations exceed their warm ones by half in the median at the defaults and by twice at the highest precision limit); a decimal-mode cancellation measured through the harness settled in one pass in a few milliseconds | Holds. Two notes: the Bernoulli run is paid by every call that takes a Gamma value, the regularized incomplete gamma functions and the incomplete beta functions included, not only by the Gamma family's own calls (`bench/stress/catalogue.json`: `lowergammareg` entries at the highest precision limit pay as much cold as the Gamma family's); and "milliseconds" is one machine's figure, which the user docs state qualitatively (§12, question 9). |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/cost.md#What the costs come from`, `#What the search has not reached` | "Typing out the 229 entries at the default precision limit … took 16,548 keystrokes. Exactly 229 of them took 100 ms or more"; "what four runs found, 714 cases in all" | update (the plan's row, confirmed: the default-limit profiles now hold 272 entries, 252 of them typed out over 18,524 keystrokes, 253 of which reach 100 ms, one case carrying two; the four logged runs still sum to 714 cases, a figure every run changes) | the typing paragraph and the section's opening without counts; see "Proposed edits" |
| `devdocs/future.md#Ruled out, and why` > hypergeometric and Bessel bullet | "General hypergeometric functions, Bessel `Y` and `K`, Bessel functions at large argument. Library-sized casework for little use here." | update (the plan's row, confirmed) | moved under `#Extensions that fit` > "More special functions" as deferred, with the reason kept as why they wait; see "Proposed edits" |
| `devdocs/future.md#Ruled out, and why` > "Statistical distributions as built-ins" | "They are one-line user functions over the Gamma and Beta families." | update (the plan's row; the owner's clarification covers it as a deferral only if the distributions are meant to come as built-ins, question 4) | "**Statistical distributions as built-ins.** Each is a one-line function over the Gamma and Beta families, so they belong in definitions, the system file's or a user's, not in the kernel." |
| `devdocs/future.md#Ruled out, and why` > "Stored digits of `pi` or `e`" | "about 0.4 ms for a thousand digits, 8 ms for ten thousand and 260 ms for a hundred thousand (a phone perhaps three to five times slower; a Machin formula is five to fifteen times slower and still under 2 ms at a thousand digits …)", "4.4 KB … for a range that costs 8 ms to compute", and "`e` the same way, as the `exp` routine's series" | keep as intent | the ruled-out alternative with its reason and no timings: computing on demand costs nothing a user notices at any precision the settings allow, and stored digits compress no better than their entropy, so a table costs more payload than it saves; `e` is computed by a binary-splitting series of its own (`eSeries`, `src/core/constants.ts:32-37`), not by the `exp` routine's; see "Proposed edits" |
| `devdocs/future.md#Extensions that fit` > "More special functions" | "The eight special functions deferred when the Gamma and Beta families landed are #115" | update (a chronology) | "Eight special functions are deferred, not ruled out ([builtins.md](builtins.md), "Not in this design", which says which are which and carries the issue)" |
| `devdocs/future.md#Extensions that fit`, and the link definitions after `#Ruled out, and why` | the `[#118][118]` references and the block from `[103]: https://…` to `[152]: https://…` | update (outside the Markdown subset; §12, question 26) | inline links at the one place that owns each issue, the block deleted; see "Proposed edits" |
| `devdocs/cost.md#What the costs come from` | the hand-copied timings: "0.7 to 7 s a call", "0.3 to 1.5 s a call … and 3 to 5 s at a large one", "0.6 to 2 s a call", "several seconds at the defaults and about a minute at the highest precision limit", "0.3 to 0.8 s a call", "tens of milliseconds", "`exp(355/113) - exp(355/113)` costs 0.8 s a call", "`cos` costs 20 s" | update (measurements the tables carry, copied by hand; several no longer match them, see "Findings") | orderings and ratios the tables bear out, with no timings; see "Proposed edits" |
| `devdocs/cost.md#What the costs come from` | "Its cost is the passes times the cost of its costliest call at the last pass, and the last pass, at the ceiling, outweighs all the earlier ones together." | update (the two halves contradict each other) | "Its cost is the sum of its passes, and the last, at the ceiling, usually outweighs all the earlier ones together" |
| `devdocs/cost.md#What the costs come from` | "except in the Gamma family, whose cold run also builds the Bernoulli numbers" | update | "except for the calls that take a Gamma value, the Gamma family itself, the regularized incomplete gamma functions and the incomplete beta functions, whose cold run also builds the Bernoulli numbers" |
| `devdocs/cost.md#What the costs come from` | "At the highest precision limit, the first keystroke that completes a call also costs 150 to 200 ms, against about 50 ms at the defaults" | update | "at the highest precision limit it is several times what it is at the defaults" |
| `devdocs/cost.md#How a case is measured` > Passes | "Every case here runs the whole schedule to the ceiling, since its value never certifies: nine passes at the default settings, eleven at the highest precision limit the default significand limit allows." | update (eight passes at thirty-two display digits; a refusal the loop does not retry ends it short of the ceiling) | see "Proposed edits" |
| `devdocs/cost.md#What the search has not reached` | "The decimal profile has no entries: its cases have settled in one pass in every sample so far." | update (the reason is structural, not empirical) | "**The decimal profile has no entries,** and can hardly have any: decimal mode has no schedule, its one pass being the context itself ([numbers.md](numbers.md), "Decimal mode"), so a case there costs a single pass at the working digits, and none has reached the floor." |
| `devdocs/cost.md#What the search has not reached` | "Four functions it draws have no entry yet: `log10`, `acos`, `asinh` and `acosh`." | update (a count the tool could write; `sqrt` has a hang and no entry) | "**Elementary functions without an entry.** `log10`, `acos`, `asinh` and `acosh` are drawn and have none: they are cheap at the defaults, and no sample has caught them at a raised precision limit." |
| `devdocs/cost.md#(top)`, `#What the costs come from`, `#The hangs` | the bare issue numbers (`#118`, `#119 to #121`, `#149`, `#150`, `#107`, `#125`, `#103`, `#121`, `#132`, `#151`, `#152`, `#120`) | update (§12, question 26: an inline link at the one owning place) | inline links where cost.md owns the issue, links to the owning page elsewhere (question 1); the generated hangs table's Issue column is the tool's to change (question 3) |

## Findings

### The prose of cost.md against its tables

The catalogue read on this revision holds 342 entries, 45 hangs and 4 logged runs, every one measured on one machine (the same four-core container, named on each entry, hang and run). The hand-written prose was compared with it figure by figure. Timings below are the catalogue's own and belong in this report, not in a page.

| Prose | The catalogue now | Verdict |
| --- | --- | --- |
| "what four runs found, 714 cases in all" | 4 runs, 257 + 274 + 144 + 39 = 714 cases measured, 97 hits logged on the last two | current, but a count every run changes |
| "the 229 entries at the default precision limit (the default, `digits32` and fractions profiles)", "16,548 keystrokes", "Exactly 229 of them took 100 ms or more: the last keystroke of each case" | 272 entries in those profiles (225, 32 and 15); 252 typed out; 18,524 keystrokes; 253 at or above 100 ms; 251 cases with exactly one, one `digits32` case with two, the extra on the keystroke that completes its inner composed call; in all 252 the slow keystroke is the last | stale |
| "nine passes at the default settings, eleven at the highest precision limit the default significand limit allows" | `default` and `fractions` 9, `digits32` 8 (the schedule starts at 42 digits: 42, 84, …, 2,688, 4,040), `maxcap` 11, `extreme` 15, with one `extreme` entry at 11 | right as far as it goes; incomplete |
| "the last pass, at the ceiling, outweighs all the earlier ones together" | the last pass's share of the warm time: median 0.66, above one half in 271 entries of 342 | holds as "usually" |
| "The incomplete beta function, 0.7 to 7 s a call" | warm per call at the default-limit profiles: 0.59 to 6.85 s, median 2.5 s; exact-only parameters median 3.1 s against 2.2 s with an inexact one | roughly current; "exact parameters cost as much as inexact ones" holds; the incomplete beta heads the catalogue and costs several times the Gamma family a call |
| "`erf`, `erfc` and the incomplete gamma functions, 0.3 to 1.5 s a call at a moderate argument and 3 to 5 s at a large one" | without a `large` argument: 0.26 to 1.45 s, median 0.69 s; with one: 0.53 to 5.15 s, median 1.25 s | roughly current; the large range now starts lower |
| "The Gamma family at an inexact argument, 0.6 to 2 s a call … A short exact argument costs about half as much, 0.3 to 0.8 s a call" | inexact or composed: 0.21 to 2.05 s, median 0.76 s; exact-only: 0.32 to 1.71 s, median 0.56 s | stale at both ends; "about half" holds in the median only; `beta(0.3, 7)` is not an entry |
| "The cold run also pays for the Bernoulli run … several seconds at the defaults and about a minute at the highest precision limit" | cold minus warm on the Gamma family's entries: median 2.0 s, at most 5.4 s at the defaults; median 15 s, at most 66 s at `maxcap`; the same surcharge on `lowergammareg` and `uppergammareg` entries (up to 68 s at `maxcap`) and on `incbeta` entries (up to 5 s at the defaults) | current in order; the scope is wider than the Gamma family |
| "no function's value is [memoized]. So a warm run costs about what a cold one does, except in the Gamma family" | cold over warm, median: elementary 1.02, incomplete beta 1.19, incomplete gamma and `erf` 1.43, Gamma family 1.77 | holds, with the wider scope above |
| "the stress suite's reference case, `exp(1) - exp(1)`, takes tens of milliseconds" | 17 ms warm through the harness on this container, nine passes, the last 1.4 ms | current |
| "no elementary case reaches the catalogue's one-second floor" at the defaults | no entry of a default-limit profile calls only elementary functions | current |
| "at the highest precision limit … `exp(355/113) - exp(355/113)` costs 0.8 s a call" | 0.62 s a call; the costliest elementary `maxcap` entry is `pow(355/113, approx(2.5)) - pow(355/113, approx(2.5))` at 1.21 s a call | stale |
| "at the hard bound `cos` costs 20 s" | `cos((355/113) radian) - cos((355/113) radian)`: 21.5 s a call; the costliest `extreme` entry is an `incbeta` cancellation at 27 s a call | roughly current |
| "the first keystroke that completes a call also costs 150 to 200 ms [at the highest precision limit], against about 50 ms at the defaults" | the first costly keystroke other than the last: `maxcap` 11 to 200 ms, median 115 ms, with 31 of 63 typed entries at or above 100 ms; `default` 10 to 88 ms, median 47 ms | stale |
| "Four functions it draws have no entry yet: `log10`, `acos`, `asinh` and `acosh`" | without an entry: those four and `sqrt`, which has a hang only | current, counting hangs |
| "The decimal profile has no entries" | none, and `schedule` gives decimal mode one pass (`src/core/pipeline.ts:299-303`); two cancellations measured through the harness under the decimal profile settled in one pass, `= 0` | current; the reason given is wrong |
| "Every timing so far is from one four-core container" | one machine on every record | current |
| "none of these cases hangs at the defaults"; the hangs' issues | hangs: `maxcap` 23, `extreme` 22; #151 on 21, #152 on 19, none on 5 | current |

The reconciliation the plan asks for is done in the proposed text by stating what the tables bear out as orderings and ratios and never copying a timing, which the next run or machine invalidates. The counts (runs, cases, entries typed, keystrokes) are dropped; whether the tool should write them between markers is question 2.

### future.md's "Extensions that fit" against the issue list in both corpora

Every issue the two pages name is open on GitHub as of this run: #103, #107, #115, #118, #119, #120, #121, #125, #126, #130, #131, #132, #133, #134, #149, #150, #151, #152. The issue titles match what the pages say they carry; #119, #120 and #121 are the three parts future.md lists for #118, and #115's title names the eight special functions. #120 is implied by "[#119][119] to [#121][121]" and has no link definition. No issue named on either page is closed. Across both corpora the same issues are named in more than one place:

| Issue | Pages that name it |
| --- | --- |
| #103 | `devdocs/builtins.md`, `devdocs/cost.md`, `devdocs/future.md` |
| #107, #125, #149, #150, #151, #152 | `devdocs/builtins.md`, `devdocs/cost.md`, `devdocs/future.md` |
| #115 | `devdocs/builtins.md`, `devdocs/future.md` |
| #118 | `devdocs/cost.md`, `devdocs/future.md`, `devdocs/settings.md` |
| #119, #121 | `devdocs/cost.md`, `devdocs/future.md` |
| #120 | `devdocs/cost.md` (and implied in `devdocs/future.md`) |
| #126 | `devdocs/future.md` |
| #130, #131, #133, #134 | `devdocs/functions.md`, `devdocs/future.md` |
| #132 | `devdocs/functions.md`, `devdocs/future.md`, `devdocs/cost.md` |

Against §12, question 26, each is to be linked from one place only. The proposed ownership (question 1): cost.md owns the responsiveness work (#118 to #121) and the kernel costs and hangs it catalogues (#107, #125, #149 to #152); builtins.md owns the Bernoulli memo's footprint (#103) and the deferred special functions (#115); functions.md owns the user functions (#130 to #134); future.md owns #126 alone and otherwise points at the owning section. The proposed text below is written under that mapping. `docs/` names one issue, #40 in `docs/functions.md:253`, which is closed (question 6).

The list's code-facing statements hold: `root` detects the exact rational cases (`src/core/ball.ts:110`, `:1254`, `exactRoot`); `pi()` and `exp` are built-in functions (`src/core/builtins/pi.ts:21`, `src/core/builtins/exp.ts:95`); `i` is not a unit name (`src/units.txt` has no definition of it); the parser reserves `name[` for dimension variables (`src/core/definitions.ts:79`, `:223`); `buildTable` takes one list of definitions (`src/core/build.ts:291-295`); the conformance check has two steps, the dimensions and then the kinds, and its header notes the step a lenient conversion could skip (`src/core/dimension.ts:27`, `:165-183`); the built-ins are a map of native implementations gathered from their modules (`src/core/builtins.ts:1-15`). Of "Ruled out, and why": `pi` is Chudnovsky's series with binary splitting (`src/core/constants.ts:8-16`); `e` is a binary-splitting sum of its own, `eSeries` (`src/core/constants.ts:32-37`), not the `exp` routine's series, so that sentence is corrected in the proposed text; `expFixed` reduces the argument below `2^-8` and sums its series term by term (`src/core/fixed-exp.ts:7-16`), as cost.md's hangs section says.

### Which sections become links to docs/ and which stay

- `devdocs/future.md#(top)`, `#Symbolic values`, `#Complex numbers`: stay, as intent (what the extension is, why not now, what it would take, what keeps it possible). Nothing in `docs/` is to link to; the user docs state today's behaviour (N7) and never mirror future work. When `docs/numbers.md` exists, "Why not now" in `#Symbolic values` can cite it in one sentence for the `≈` the user sees.
- `devdocs/future.md#Extensions that fit`: stays, as the map of extensions; its issue links move to the owning pages (above).
- `devdocs/future.md#Ruled out, and why`: stays, as ruled-out alternatives; the two bullets the owner called deferred move to `#Extensions that fit`; the stored-digits bullet keeps its reason without its timings.
- `devdocs/cost.md#(top)`, `#How a case is measured`, `#Reproducing a case`, `#The hangs`, `#The catalogue`: stay, as mechanism (the tool's measures, the catalogue's rules, the generated tables).
- `devdocs/cost.md#What the costs come from`: its first sentences restate user semantics (a value that never certifies runs every pass to the ceiling and costs seconds, one that certifies costs little). Under §12, question 24, they become one sentence and a link to the owning docs section, `numbers.md`'s "What costs time" in the target (§5, C33), once that page exists; until then the proposed text links to `devdocs/numbers.md`, "Working precision and the schedule". The rest stays as mechanism.
- `devdocs/cost.md#What the search has not reached`: stays, as the tool's coverage.

### Other findings

- **A refusal can end the retry loop before the ceiling.** The one `extreme` entry with eleven passes of fifteen shows it: its eleventh pass, at 18,432 digits, ended in milliseconds and the result shown is the tenth pass's (`bench/stress/catalogue.json`; `src/core/pipeline.ts:325-327`). cost.md's "every case here runs the whole schedule to the ceiling" needs the qualification, and the plan's `tooLarge` row in §1.1.5 (V1's) should name the refusals that end the loop with a result (question 7).
- **Decimal mode has one pass.** `schedule` returns the context alone in decimal mode (`src/core/pipeline.ts:286-303`), so the decimal profile cannot produce a case that runs a schedule; cost.md presents its absence from the catalogue as an empirical observation.
- **The `digits32` profile runs eight passes**, its schedule starting at 42 digits (a scratch run of `schedule` on `{ ...DEFAULT_SETTINGS, displayDigits: 32 }`), against the nine the prose implies for every default-limit case.
- **The Bernoulli run's cold cost reaches past the Gamma family**: the regularized incomplete gamma functions and the incomplete beta functions take Gamma values and pay it (the table above).
- **The deadline is the search's constant.** `DEADLINE_MS` lives in `bench/stress/catalogue.ts:222-227` and the harness enforces whatever it is given (`bench/stress/harness.ts:301-304`); cost.md says "the harness's two-minute deadline". `pnpm stress` gives an entry four times its catalogued time and two minutes at least (`bench/stress/verify.ts:117-125`).
- **`calls` counts occurrences**: `costlyCalls` counts every costly call in the text and names each function once (`bench/stress/cases.ts:652-663`), so "warm cost per costly call" is as the prose says.
- **The catalogue's own tests pass** on this revision: `bench/stress/cases.test.ts`, `catalogue.test.ts` and `pool.test.ts`, 20 tests, among them that the committed catalogue reads as cases the stress suite can run.
- **The links into the two pages** from `devdocs/README.md`, `builtins.md`, `numbers.md`, `benchmarks.md`, `settings.md`, `layout.md` and `development.md` are repo-relative already; `docs/` does not link to either page.
- **Gaps for §6, which this unit did not read**, so they may already be listed: (1) `docs/` has no qualitative statement of what a value that never certifies costs, beyond the timings in `docs/functions.md`'s gamma bullet, where the target's `numbers.md` has "What costs time" (§5, C33); (2) `docs/` does not say that decimal mode runs a single pass and so never pays the schedule, to be confirmed against `docs/settings.md` by its unit.

## Proposed edits

The texts below assume the issue ownership of question 1. If the owner keeps the issue links on future.md instead, the reference links there become inline links in place and cost.md's bare numbers become links to future.md.

### devdocs/cost.md#(top)

The catalogue lists the costliest inputs the cost search has found, what each pays for, and the issue that would make it cheaper. Runs of the search add to it over time: each is a short sample, safe to repeat and to run as often as wanted, since a hit only fills an empty slot or replaces a case of its family that it out-costs by a margin. The tables below are regenerated by each run. The prose around them says what the tables bear out, as orderings and ratios rather than as their timings, which change with every run and every machine, and is revised by hand when a run changes the picture.

The catalogue is the target for two kinds of work. Making the kernels cheaper takes a case off the list or moves it down; keeping the interface responsive whatever an evaluation costs ([#118](https://github.com/bsidhom/exucal/issues/118), with [#119](https://github.com/bsidhom/exucal/issues/119), [#120](https://github.com/bsidhom/exucal/issues/120) and [#121](https://github.com/bsidhom/exucal/issues/121) for its parts) is measured against the same cases, since they are the ones that freeze it today. The issues named below carry the work.

### devdocs/cost.md#How a case is measured

Old, the Passes bullet:

"**Passes** is how many passes of the retry loop the warm evaluation ran. Every case here runs the whole schedule to the ceiling, since its value never certifies: nine passes at the default settings, eleven at the highest precision limit the default significand limit allows."

New:

"**Passes** is how many passes of the retry loop the warm evaluation ran. A case runs the whole schedule to the ceiling, since its value never certifies, so the count is the schedule's length for its settings ([numbers.md](numbers.md), "Working precision and the schedule"): nine passes at the default settings, eight at thirty-two display digits, where the schedule starts higher, eleven at the highest precision limit the default significand limit allows, and fifteen at the hard bound. A count short of the schedule marks a pass that ended the loop with a refusal the loop does not retry, after which the best result so far is shown."

Old, in the paragraph after the bullets:

"A case that passes the deadline is a hang."

New:

"A case that passes the search's deadline (`DEADLINE_MS` of catalogue.ts, which the harness enforces) is a hang."

### devdocs/cost.md#What the costs come from

Every case in the catalogue has a value that never certifies: an exact cancellation (`f(a) - f(a)`), an identity (`erf(x) + erfc(x) - 1`), an edge (`floor` of a value on an integer), or a condition left undecided. Such a value runs every pass of the retry loop up to the ceiling ([numbers.md](numbers.md), "Working precision and the schedule"), unless a pass ends the loop with a refusal the loop does not retry. Its cost is the sum of its passes, and the last, at the ceiling, usually outweighs all the earlier ones together, so a case costs about what its costliest call costs at the ceiling, times the number of such calls. A value that certifies stops at the first pass that settles it, and pays for the cheap passes only. Exact cancellation is not a contrived case: `beta(0.5, 0.5) - pi()` is one, and so is any expression that subtracts a quantity from itself by a longer route.

The causes, costliest first, at the default settings:

- **The incomplete beta functions** ([#150](https://github.com/bsidhom/exucal/issues/150)). The series takes about `bits ln 2 / ln(1 / x)` terms, several thousand at the ceiling for `x` near a third, and each term costs a full-precision division. Exact parameters cost as much as inexact ones. These cases head the catalogue, and cost several times a call what the Gamma family's do.
- **`erf`, `erfc` and the incomplete gamma functions** ([#149](https://github.com/bsidhom/exucal/issues/149)). They have the same shape, a term count that grows with the bits and a full-precision division per term, at a fraction of the incomplete beta's cost for a moderate argument. A large argument costs several times more, and is the regime of [#107](https://github.com/bsidhom/exucal/issues/107): `erfc(-40.5)`, `lowergammareg(500, 2500.25)`, `lowergammareg(0.01, 2500.25)`.
- **The Gamma family.** A wide argument is shifted up through a rising factorial before the Stirling series; [#125](https://github.com/bsidhom/exucal/issues/125) would make the shift cheap. An inexact argument (`digamma(approx(1/3))`, `beta(approx(1/3), e)`, `gamma(cosh(…))`) costs more than an exact one, whose shift is exact, though the two ranges overlap. The cold run also pays for the Bernoulli run at the new ceiling ([builtins.md](builtins.md), "The Gamma and Beta families", which carries the memo's issue; [#121](https://github.com/bsidhom/exucal/issues/121) would move the run to a worker): a surcharge of about half the warm cost at the defaults that grows faster than the ceiling, to about twice the warm cost at the highest precision limit.
- **The elementary functions** are cheap at the defaults: the stress suite's reference case, `exp(1) - exp(1)`, runs to the ceiling in a small fraction of the floor, and no elementary case reaches the catalogue. Their cost grows faster than the digits: at the highest precision limit, two and a half times the digits, an exponential or a power with an inexact exponent reaches the floor, and at the hard bound the trigonometric, inverse trigonometric and hyperbolic functions cost as much a call as the incomplete beta does at the defaults, and more ([#152](https://github.com/bsidhom/exucal/issues/152)).

The memos help only the first run. The constants and the Bernoulli numbers are memoized, but no function's value is. So a warm run costs about what a cold one does, except for the calls that take a Gamma value, the Gamma family itself, the regularized incomplete gamma functions and the incomplete beta functions, whose cold run also builds the Bernoulli numbers.

Typing tells the same story from the user's side. Typed out a keystroke at a time, a case costs on one keystroke, the last, the one that completes the expression (the Slow keystrokes column): every prefix before it is either incomplete, an error found at once, or a value that certifies at the first pass; `incbeta(0.3, 7, 1/3)` alone has nothing to cancel. So the interface freezes once per expression, on the keystroke that completes it, for the case's whole cost. That keystroke is the one [#118](https://github.com/bsidhom/exucal/issues/118) has to keep responsive. The one other keystroke that costs anything to notice is the first that completes a call, a one-time cost that grows with the ceiling, most likely the memoized constants built to it: at the highest precision limit it is several times what it is at the defaults.

### devdocs/cost.md#What the search has not reached

The catalogue is what the logged runs have found (`runs` in bench/stress/catalogue.json), and runs add to it. What they cannot find, as the search stands:

- **The exact functions.** `factorial`, `binomial`, `doublefactorial`, `gcd`, `lcm`, `div`, `mod`, `abs`, `ceil` and `trunc` are never drawn. Their cost is the size of an exact result, held by the significand limit's refusals rather than by passes, so a search for them would vary sizes rather than look for values that never certify.
- **Elementary functions without an entry.** `log10`, `acos`, `asinh` and `acosh` are drawn and have none: they are cheap at the defaults, and no sample has caught them at a raised precision limit.
- **The decimal profile has no entries,** and can hardly have any: decimal mode has no schedule, its one pass being the context itself ([numbers.md](numbers.md), "Decimal mode"), so a case there costs a single pass at the working digits, and none has reached the floor.
- **Settings outside the six profiles:** other digit counts, and significand limits between the default and the hard bound.
- **Expressions of other shapes.** A costly call is composed into an argument at most one level deep, with exact arguments of its own; there are no long inputs of many terms; the wants are blank, `1`, `deg`, `K` or `tempF`, so no dimensioned quantities and no unit lists; and user-defined functions are reached only through the system file until definitions can be typed ([functions.md](functions.md), "Deferred").
- **Other machines.** Every timing so far is from one machine, the four-core container each entry names. No phone has been measured, which the interface's work needs.

### devdocs/cost.md#The hangs

Some cases run past the search's deadline (`DEADLINE_MS` of catalogue.ts). They are the most pathological cases the search finds, and the catalogue keeps them apart, in `hangs`, one per family, ranked by their estimated cost (the table below), each with the issue that tracks it; `pnpm stress` measures them again last and reports how far each gets. Two settings produce them. Both raise the ceiling, and none of these cases hangs at the defaults.

- **The highest precision limit under the default significand limit** (2,453 digits, a ceiling of 9,852): the Gamma family at an inexact argument, the incomplete beta function, and the incomplete gamma functions at an inexact or large argument. All are [#151](https://github.com/bsidhom/exucal/issues/151), and the causes above apply at two and a half times the digits.
- **The hard bound** (`MAX_SIGNIFICAND_LIMIT_BITS`, a ceiling of 157,816 digits): the special functions by the pass at 18,432 or 36,864 digits, and the elementary functions too, e.g. `cosh(2.5)^2 - sinh(2.5)^2 - 1` in its pass at 147,456 digits. This is [#152](https://github.com/bsidhom/exucal/issues/152). Each step of `expFixed`'s series gains a fixed eight bits, and the series is summed term by term.

The defaults stay as they are. These settings are a user's to choose, and the response to them is the interface's (#118, with #120's workers, linked above), helped by whatever the kernel issues above make cheaper.

### devdocs/future.md#Extensions that fit

Each of these fits without reshaping the core. The page that owns a part names the issue that carries it; this list maps them:

- **A responsive interface whatever an evaluation costs.** Every keystroke runs the pipeline on the main thread, and the catalogue of [cost.md](cost.md) lists the expressions that freeze it for seconds or hang it. Moving the evaluation off the main thread, with the cases of the catalogue as the measure, is the work cost.md names at its top, in three parts: interactive results at a reduced precision, finalized at full precision after a debounce; the finalization in a web worker above a threshold; and the slow, separable computations such as the Bernoulli run in a worker.
- **Cheaper kernels.** The incomplete beta function, the incomplete gamma functions and the error functions, and the Gamma family's shift at an inexact argument head the catalogue, whose causes name the issue for each ([cost.md](cost.md), "What the costs come from"); the hangs at a raised precision limit and at the hard bound are listed there too ("The hangs"), and the Bernoulli memo's footprint with the family that builds it ([builtins.md](builtins.md), "The Gamma and Beta families"). One declarative language for each function's own switch points (the Gamma family's exact shift against its loop, the incomplete gamma's series against its fraction, `tanh`'s saturation, a power's three routes), built from reusable measures, is [#126](https://github.com/bsidhom/exucal/issues/126).
- **More special functions.** Eight special functions are deferred, not ruled out ([builtins.md](builtins.md), "Not in this design", which says which are which and carries the issue). Behind them wait the general hypergeometric functions, Bessel `Y` and `K`, and the Bessel functions at large argument: library-sized casework, for little use yet.
- **More of the user functions** ([functions.md](functions.md), "Deferred", which carries the issues): a bare call's value shown in its function's result annotation; the shadowing error in a head relaxed to a warning; definitions typed into the converter; and dimension-generic functions, with type bounds on their variables, for which the parser already reserves `name[`. A function's result is never checked against a range, since nothing would act on it; whether ranges could instead narrow a result's ball is a study listed there.
- **User definitions** are already supported by `buildTable`, which takes one list of definitions; only storage and an editor are missing, and definitions typed into the converter are the first step ([functions.md](functions.md), "Deferred").
- **Lenient kind conversion** (converting `rad/s` to `Hz` on request) is a flag to `convert` that skips the second step of the conformance check, the kinds. Sums would keep the strict check: adding an angle to a dimensionless number is a mistake whether or not the user asked to convert between them.
- **Richer UX** is new components that edit the same two strings or read the table ([architecture.md](architecture.md), "Messages"): autocomplete, unit buttons, highlighting from error spans.

### devdocs/future.md#Ruled out, and why

Old, three bullets:

"**Stored digits of `pi` or `e`.** Chudnovsky's series with binary splitting computes `pi` in about 0.4 ms for a thousand digits, 8 ms for ten thousand and 260 ms for a hundred thousand (a phone perhaps three to five times slower; a Machin formula is five to fifteen times slower and still under 2 ms at a thousand digits; spigot algorithms are quadratic and buy nothing), while stored digits compress to no better than their entropy, 0.42 bytes a digit, so ten thousand digits would add 4.4 KB to a payload of a few tens of kilobytes compressed for a range that costs 8 ms to compute. They buy nothing at any precision a user will set: computation on demand, memoized, instead ([numbers.md](numbers.md), "Memoized constants"), and `e` the same way, as the `exp` routine's series."

"**General hypergeometric functions, Bessel `Y` and `K`, Bessel functions at large argument.** Library-sized casework for little use here."

"**Statistical distributions as built-ins.** They are one-line user functions over the Gamma and Beta families."

New, two bullets, the hypergeometric and Bessel bullet having moved to "Extensions that fit":

"**Stored digits of `pi` or `e`.** Chudnovsky's series with binary splitting computes `pi` to any precision the settings allow in a time nobody notices, and its cost grows slowly enough with the digits that a table could never pay for itself (a Machin formula is slower by a small factor and still unnoticeable at a thousand digits; spigot algorithms are quadratic and buy nothing), while stored digits compress to no better than their entropy, about 0.42 bytes a digit, so a table for the range a user reaches would add more to the payload than it saves in computation. So the constants are computed on demand and memoized ([numbers.md](numbers.md), "Memoized constants"), `pi` by that series and `e` by a binary-splitting sum of its own beside it (`eSeries` of constants.ts)."

"**Statistical distributions as built-ins.** Each is a one-line function over the Gamma and Beta families, so they belong in definitions, the system file's or a user's, not in the kernel."

The block of link definitions after the section, from `[103]: https://github.com/bsidhom/exucal/issues/103` to `[152]: https://github.com/bsidhom/exucal/issues/152`: delete.

## Terminology

- **"hang"** has two senses on these pages: cost.md's, a case past the deadline (the catalogue's `hangs`), and future.md's "freeze it for seconds or hang it" for the interface. Proposed: **hang** for the catalogue's case only; the interface **freezes**.
- **"the hard bound"** (cost.md, and `numbers.md` per §1.1.5) for the most the significand limit can be set to, `MAX_SIGNIFICAND_LIMIT_BITS`. Not in section 8. Proposed canonical: **the hard bound**, glossed once as the significand limit's maximum; "hard precision bound" (issue titles) is not used in the pages.
- **"profile"** (cost.md, cases.ts) for a named bundle of settings the search draws. Proposed: **settings profile** on first use, then "profile"; devdocs-only.
- **"fractions profile"** (cost.md) names the profile by its code name where section 8 settles "ratio notation". Proposed: write the name in code font, `fractions`, glossed as the ratio-notation profile, as cases.ts does.
- **"plain number"** (future.md, "adding an angle to a plain number"): section 8 reserves "plain number" for the docs' gloss and **dimensionless** for devdocs. Proposed: "a dimensionless number".
- **"case", "family", "entry", "hit", "hang"**, the catalogue's terms as catalogue.ts and cases.ts define them, are used consistently on cost.md but defined only in passing. Proposed: define the five in one sentence at the top of `#How a case is measured`; never "row" for an entry.
- **"the converter"** (cost.md, "what the converter runs on each keystroke") is the two-field component, within §12, question 2. No change.

## Questions for the owner

1. **Issue ownership (§12, question 26).** Which page carries each issue link named on both pages? Proposed: cost.md owns #118 to #121 and #107, #125, #149 to #152; builtins.md owns #103 and #115; functions.md owns #130 to #134; future.md owns #126 and otherwise links to the owning section; builtins.md's and settings.md's mentions become links to cost.md (their units).
2. **Counts in cost.md's prose.** Should the tool write a summary line between markers (runs, cases measured, entries typed, keystrokes, slow keystrokes) so the prose can state them, or are they dropped for good? Proposed: dropped now; a generated summary is a small addition to `tooling.ts`'s `update` for later, since the tool already owns both tables.
3. **The hangs table's Issue column** is generated as bare numbers (`bench/stress/catalogue.ts:561`). Should it emit inline links once cost.md owns those issues? Proposed: yes, a one-line change to `hangsTable`.
4. **Statistical distributions.** The owner's clarification makes the ruled-out built-ins "deferred for the initial calculator". Does it cover the distributions, which future.md rules out because they are one-line functions over the Gamma and Beta families? Proposed: not deferred but placed, in definitions rather than the kernel, as the proposed text says.
5. **`docs/functions.md`'s gamma bullet** (a D unit's) states timings ("about half a second the first time and a tenth of a second a call", "a few seconds then half a second") that the catalogue no longer bears out even in order (exact and inexact Gamma cancellations overlap, from a fifth of a second to two seconds a call); under question 9 it becomes qualitative. Proposed: the D unit rewrites it as one qualitative sentence.
6. **`docs/functions.md:253` cites #40**, which is closed (a D unit's). Proposed: delete the reference and state the current design (question 26).
7. **V1's `tooLarge` row (§1.1.5).** A refusal the loop does not retry ends the loop and the best result so far is shown (`src/core/pipeline.ts:325-327`; one catalogued case). Proposed: V1 names, among the classes of refusal, which end the loop with a result and which with the error.
8. **`devdocs/builtins.md`'s Gamma section** (V3's) repeats the kernel issues and the ruled-out list (§9.4). Proposed: it links to cost.md for the costs and keeps #103 and the deferred list, per question 1.

## Notes on this run

The plan sized this unit right, but "`bench/stress/*` by header" undersells what verifying cost.md takes: the prose makes a dozen numeric claims that only the catalogue itself can settle, so a scratch analysis of `catalogue.json` (profiles, passes, per-call costs, cold against warm, the typing summaries) was the bulk of the work, and `cases.ts` and `catalogue.ts` had to be read in full for the families, the floor, the margin and the deadline. The hard part was the rule against timings in proposed text on a page whose subject is timings: the rewrite keeps orderings and ratios the tables bear out and leaves every figure to the generated tables, which is what the page's own top paragraph promises. Three things the next unit should know: the `extreme` entry that stops at eleven passes is a refusal ending the loop, not noise (V1's territory); decimal mode's single pass is in `schedule`, not in the data; and the `digits32` schedule has eight passes, so "nine passes" is a statement about the default settings only. V7 (`benchmarks.md`) owns the harness, the search and the stress suite as tools, which cost.md only names; the two pages should not both explain cold, warm and the deadline, and benchmarks.md already defers to cost.md for the first two.
