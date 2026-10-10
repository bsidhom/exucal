# Unit V4: `devdocs/functions.md` (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1
- Doc sections read: `devdocs/functions.md`, all sections (`#(top)`, `#Definitions`, `#Annotations`, `#Names and shadowing`, `#Conditions`, `#The check at a call`, `#An undecided condition`, `#Calls`, `#A function as the want`, `#Display`, `#Build-time checks`, `#Precision, the radius and cost`, `#Where it lives`, `#Not in this design`, `#Deferred`, `#Alternatives considered`); `docs/definitions.md#Functions` (read-only context)
- Modules read: `src/core/definitions.ts`, `src/core/build.ts`, `src/core/dimension-of.ts`, `src/core/evaluate.ts`, `src/core/pipeline.ts`, `src/outcome.ts` (each in full)
- Also read: `src/core/table.ts` (in full: `UnitFunction`, `arityOf`, `unitLookup`, `resolveFunction`, which the page's steps rest on); `src/messages.ts:81-151`, `:462-487`, `:584-623` (the call and want messages the page quotes, `describeAssumption`); `src/core/ball.ts:329-339`, `:355-439` (`containsZero`, `position`, `orderOf`); `src/core/expr.ts:163`, `:230`, `:290`, `:335-348`, `:395-420` (`NAME` and the call grammar); `src/core/context.ts:82-125`, `:186-250` (`NumberContext`, the schedule, `ceilingContext`); `src/core/display.ts:211-221` (`RatioDisplay`); `src/core/rational.ts:109-115` (the parser's hard bound); `src/units.txt:17-21`, `:112-136`, `:168`, `:190-192`, `:197-228`, `:235`, `:368-370`, `:610-615` (the five functions and the short unit names the page cites); `src/unit-converter.ts:31`, `:128-133`, `:261-263` (the warning's style); `src/core/definitions.test.ts:736-760`, `:858-870` (the property test's parameters); `bench/build.bench.ts:60-110` and `bench/synthetic.ts:111-123` (the function benchmark); `src/units.test.ts:1-95`, the headers of `src/system-build.ts` and `src/system-table.ts`, and `package.json` (how to build the table from a scratch script); the D2, A6 and A8 entries of `audit/plan/10-audit-units.md` (the module cross-reference); `audit/reports/D2/fable.md` (the D2 output the unit's context names)

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 6 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 15 / 1 / 1 |
| Gaps confirmed / refuted / new | 0 / 0 / 0 |
| Proposed edits | 14 |
| Questions for the owner | 7 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N14 | confirmed | `src/core/ball.ts:417-422` (`orderOf`: an exact right side is placed by `position`, an exact left side the same way flipped, two inexact sides by their difference, and a difference that cannot be formed answers `straddles`); `src/core/ball.ts:366-370` (two exact values: `compare` on the midpoints, no difference formed, so never refused for size); `src/core/ball.ts:376-378`, `:391`, `:398` (`touchingAbove` and `touchingBelow` for an end exactly on the point, `straddles` where the coarse bounds cannot tell); `src/core/evaluate.ts:1059-1093` (`VERDICTS`: a touching end leaves a strict comparison undecided and decides the non-strict one on its side); scratch run: `tempC(approx(-273.15))` stays undecided at every pass to the ceiling, `tempC(-273.15)` meets `x >= -273.15`, `kcond(0.1 + 0.2)` meets `x <= 0.3` | A touching ball is an order of its own in the code (`touchingBelow`, `touchingAbove`), not a straddle; the claim's consequences hold as stated, since the verdict table treats a touch as undecided for a strict comparison and as decided for the non-strict one on that side. |
| N15 | confirmed | `src/core/pipeline.ts:376-391` (`isUnresolved`: an `unresolved` at any depth of a call, an inverse or a mismatch is retried), `:350-358` (at the ceiling the last error is returned); `src/core/evaluate.ts:1059-1093` (`at`: two exact equal sides decide every comparator); scratch run: `floor(sqrt(2)^2)` is refused with "cannot be told from 2 at this precision", `tempC(-273.15)` into `K` is `= 0 K` | Confirmed for what this unit's modules decide: the retry of an `unresolved` through a call and the exact case on a condition's bound. Which edges the built-ins have is A6's and V3's. |
| N16 | confirmed | `src/core/definitions.ts:178-179`, `:385-393` (the comparators are the four orderings, `≤` and `≥` read as `<=` and `>=`); `src/core/expr.ts:290` (`NAME`) and the scratch run (`(x < 1) + 1` does not parse: no comparison in an expression); `src/core/pipeline.ts:876-882` (`disjoint`: equality of two exact values refutes an inverse, overlap proves nothing); `src/outcome.ts:372-377` (`=` on a line is the value's exactness) | The page's passage "There is no equality and no `!=`" is rewritten below as the claim words it: absent today, not ruled out, with the constraint any design must answer. |
| Q3 | confirmed | `src/core/evaluate.ts:702-717` (a call's argument against its parameter's annotation), `:551-572` (a sum's operands at a call, the mismatch kept as `dimensionMismatch` or `kindMismatch`); `src/core/dimension-of.ts:110-123` (a sum's operands at build), `:198-213` (an argument at build); `src/core/build.ts:740-750` (adjacent terms of a condition), `:586-597` (a body against its result's annotation), `:670-681` (an inverse's body against its function's parameter); `src/core/pipeline.ts:713-718` (the `have` against a want function's result) | Every site calls `checkConformance` with the table's `primitives`; the two-step split by role is `dimension.ts`'s, which the A units own. |
| Q5 | confirmed | `src/core/evaluate.ts:701-718` (an argument is bound as it stands once it conforms; nothing converts it); `src/core/table.ts:20-24`, `:102-110` (the parameter's unit is kept for writing a recovered argument, `1` without an annotation); `src/core/build.ts:609-617` (`PLAIN`); `src/core/pipeline.ts:796-800` (the one place the annotation's magnitude is used: the count of it); scratch run: `bmi(100 lb, 4 ft)` is `≈ 30.515173`, `pctof(0.5)` with a result annotated `: percent` is `= 0.5`, `kinetic(2 kg, 3 m/s)` into `J` is `= 9 J` | The `floor` and `abs` parts of the claim are the built-ins' (V3). |
| Q16 | confirmed | `src/core/pipeline.ts:708-710` (`noInverse`), `:713-718` (the `have` conforms to the result), `:725-737` (the inverse's conditions), `:738-758` (`invertFunction`), `:759-771` (the function's conditions on the recovered argument), `:772-795` (reapplied; `disjoint` refutes), `:796-808` (the count of the parameter's unit, settled in the mode); `src/outcome.ts:620-652` (one line, the call, no reciprocal); scratch run: `2 ft` into `dozn` is `dozn(2 in)`, `300 K` into `tempF` is `tempF(80.33)`, `-5 K` into `tempC` is refused by `tempC`'s own condition | Also: an assumed condition on either side is warned of as at a call (`src/core/pipeline.ts:809`; `src/outcome.ts:224-234`). |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/functions.md#Build-time checks` (lines 636-638) | "(The first version of the check evaluated each body at one of the declared unit, which the elementary functions made untenable.)" | drop (plan row confirmed) | delete |
| `devdocs/functions.md#Alternatives considered > The syntax` (802-814) | "The first form, `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`, declared the units of the argument and the result in brackets, both required, with the inverse after a `;` in which the function's own name stood for its value, and took one argument. Extending it in place … keep the first form's use of the function's own name …" | keep as intent (plan row confirmed) | see "Proposed edits", `devdocs/functions.md#Alternatives considered` |
| `devdocs/functions.md#Annotations` (173-177) | "No message is worded for a definitions rejection today, since definitions cannot be typed ([#132][132]); the wording meant for this one is "An annotation names units and cannot scale. Write a scale in the body; for a plain number, write 1."" | update (plan row confirmed) | No message is worded for a definitions rejection today: only the system file is loaded, and definitions typed into the app are deferred ("Deferred" below). |
| `devdocs/functions.md#Conditions` (273-276) | "**There is no equality and no `!=`.** `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument." | update (plan row confirmed) | see "Proposed edits", `devdocs/functions.md#Conditions` |
| `devdocs/functions.md#Annotations` (190-192) | "An annotation must be nonzero (`zeroDeclaredUnit`), since a count of zero means nothing; with the restriction above, that can fail only for a unit defined as zero." | update (D2's row confirmed: `src/core/build.ts:833-838` rejects a ball that contains zero, `src/core/ball.ts:334-339`) | An annotation must be certainly nonzero: a value that is zero, or that cannot be told from zero, is rejected (`zeroDeclaredUnit`), since a count of either means nothing; with the restriction above, that can fail only for a unit defined as zero or as an inexact value around it. |
| `devdocs/functions.md#Names and shadowing` (234-239) | "The rejection carries the parameter, and the message meant for it names the parameter and the annotation and suggests renaming the parameter. The error is meant to become a warning once user definitions have an editor and the build has a way to report warnings ([#131][131]) …" | update (D2's row confirmed: no message is worded for a definitions rejection, as the page itself says under "Annotations"; the issue's link moves to "Deferred") | see "Proposed edits", `devdocs/functions.md#Names and shadowing` |
| `devdocs/functions.md#Conditions` (284-285) | "with `x: K`, `\| x > 0` is an error, whose message suggests `0 K`." | update (D2's row confirmed: `src/core/build.ts:742-749` carries both terms' spans and the mismatch, and nothing words it) | with `x: K`, `\| x > 0` is an error carrying both terms and the mismatch; the fix is `0 K`. |
| `devdocs/functions.md#Calls` (494-499), steps 3 and 4 | "The arguments are evaluated, left to right, each once: a call is by value. Each argument must conform to its parameter's annotation …" | update (D2's row confirmed: `src/core/evaluate.ts:692-719` checks each argument as soon as it is evaluated, before the next) | see "Proposed edits", `devdocs/functions.md#Calls` |
| `devdocs/functions.md#Build-time checks` (604-618), the numbered steps | "1. Evaluating its annotations … 2. Taking the body's dimension … Each condition's terms are taken the same way. 3. Checking the result against its annotation" | update (D2's row confirmed: `src/core/build.ts:539-553` the parameters' annotations, `:555-567` the body, `:568-575` the conditions, `:576-598` the result's annotation, evaluated and checked last) | see "Proposed edits", `devdocs/functions.md#Build-time checks` |
| `devdocs/functions.md#Build-time checks` (625-626) | "finding its function (a build error when there is none, or when the function has several parameters)" | update (D2's row confirmed: `src/core/build.ts:300-304` finds an orphan before any body is looked at; `:643-650` rejects a function of no parameters as well as one of several) | see "Proposed edits", `devdocs/functions.md#Build-time checks` |
| `devdocs/functions.md#Build-time checks` (638-639) | "A literal in a body is not checked against the significand limit either, so a body of `1e30000` builds and fails at the call" | update (new: `1e30000` has the significand `1` and an exponent far within the exponent bound, so the call succeeds, `big(1) = 1e+30000` on the scratch run, `src/core/evaluate.ts:505-523`; what builds and fails at the call is a literal whose significand passes the limit while the parser's hard bound admits it, `src/core/rational.ts:115`, a 20,000-digit literal on the scratch run; the same example is in `src/core/dimension-of.ts:26-28`) | A literal in a body is not checked against the significand limit either, so a body whose literal has more digits than the limit holds, within the parser's hard bound, builds and fails at the call |
| `devdocs/functions.md#A function as the want` (570-572) | "A function's name is not a unit anywhere else: in a unit list (`tempC;degC`) it is an unknown unit, as a list's name is." | update (new: a function's name typed as a unit is `functionAsUnit`, whose message shows the call form, `src/core/table.ts:184-192`; a list's name is `unknownUnit`; scratch run: `1 K` into `tempC;degC` says "tempC" is a function, not a unit, where `1 s` into `time;s` says Unknown unit "time") | A function's name is not a unit anywhere else: in a unit list (`tempC;degC`) it is `functionAsUnit`, as it is in an expression ("Calls"), where a list's name is an unknown unit. |
| `devdocs/functions.md#A function as the want` (528-531) | the `noInverse` message quoted as `Define ~normcdf(y) = … to give it one.` | update (new: the define form is quoted in the message, `src/messages.ts:464-465`; scratch run) | `"normcdf" has no inverse, so it cannot be the unit to convert to. Define "~normcdf(y) = …" to give it one.` |
| `devdocs/functions.md#A function as the want` (566-570) | "The conversion (`Conversion`'s `function` kind) carries the `have`, the want's text, the recovered argument, the parameter's annotation with its text, and the argument as a count of that unit" | update (new: `src/core/pipeline.ts:237-250` carries the `have` as read and as evaluated, the function's name, the recovered argument, the parameter's unit with its text and expression, and the count) | The conversion (`Conversion`'s `function` kind) carries the `have`, as read and as evaluated, the function's name, the recovered argument, the parameter's annotation with its text, and the argument as a count of that unit |
| `devdocs/functions.md#Display` (578-581) | "followed by the annotation's text by the rule a `want`'s text follows, and by nothing when the annotation is `1` or absent" | update (new: the argument's unit is the annotation as read, written back by the printer as a `want` is, `src/outcome.ts:634-647`, the text being used only to tell `1`; scratch run: an annotation written `(in)` shows as `paren(2 in)`, an annotation written `1` as `one(3)`) | followed by the annotation, written back by the printer as a `want` is, and by nothing when the annotation is `1`, written or absent |
| `devdocs/functions.md#Annotations` (149), `#Names and shadowing` (238), `#An undecided condition` (457), `#Not in this design` (739), `#Deferred` (754-763), and the definitions at 826-830 | the reference-style issue links `[#130][130]` to `[#134][134]` and their `[130]: https://…` definitions | update (Markdown principle; §12, question 26: one link per issue, at the passage that owns it) | each issue linked inline once, #130 to #133 in "Deferred" and #134 in "An undecided condition"; every other mention a plain reference to that section (see "Proposed edits") |
| `devdocs/functions.md#Precision, the radius and cost` (699-704) | "the benchmark builds 500 and 2,000 functions, each calling an earlier one and each with an inverse, and the cost grows about fourfold" | update (§12, question 25: a measurement in prose; the benchmark asserts a bound, `bench/build.bench.ts:69-110`, four times the functions at most eight times the cost, over the file `bench/synthetic.ts:114-123` writes) | see "Proposed edits", `devdocs/functions.md#Precision, the radius and cost` |

## Findings

### What becomes a link and what stays

The page's user-level restatements duplicate `docs/definitions.md#Functions` (§9.1 names the cost paragraph, the three-valued check and the call rule; the rest is the same pattern) and §12, question 24 settles the shape: one sentence and a link to the owning docs section, then mechanism and rationale. The owners are §5's: `definitions.md` for writing a function, an annotation, a condition and an inverse (C40 to C44), `quantities.md` for what a conversion into a function answers (C41; §12, question 13), `expressions.md` for the call rule (C45), `numbers.md` for the dependency problem (C27). Until the §7 pages exist, every such link resolves to `docs/definitions.md`, "Functions" ("Questions for the owner", 7).

| Section | Becomes a link | Stays |
| --- | --- | --- |
| `#(top)` | one sentence each to `definitions.md`, "Functions" and `quantities.md`, "Conversion into a function" | why functions exist (readings without an offset on `Quantity`; compositions of the built-ins): intent |
| `#Definitions` | the user rules (any number of parameters, `name()`, a plain parameter, the optional inverse, the namespace) each kept to a line; the `units.txt` block to a sentence, `src/units.txt` being the source of truth (§12, question 4) | the grammar block, marked hand-maintained; the head's rules and their reasons; the build errors; `Definition`'s shape: mechanism |
| `#Annotations` | the opening rule, linked | the rationale (why an annotation changes no value, why `: 1`, why `: 2` is rejected) and the alternatives weighed: intent |
| `#Names and shadowing` | the user rule (a parameter may shadow a unit, not one its own head names), linked | why shadowing is allowed, the sigil alternative, the two parse errors: intent and mechanism |
| `#Conditions` | the syntax and its meaning, linked; the examples block goes | the grammar's reasons, the parse and build checks, the N16 constraint: mechanism and intent |
| `#The check at a call` | nothing (the user statement, decided on the value's bounds with no tolerance, is already in the docs) | the three-valued conjunction, the verdict table, `orderOf` and `position`: mechanism |
| `#An undecided condition` | "why conditions differ from the built-ins' edges", quoted in one line with the link; the conversion's checks, a pointer to the want's steps | the retry loop's treatment, the warning, the collector, the build's refusal, "no assertion on a result": mechanism and intent |
| `#Calls` | the call rule, the `kg (m/s)` product and the messages, linked to `expressions.md` | the steps of a call (five once steps 3 and 4 merge): mechanism |
| `#A function as the want` | the opening sentence, linked to `quantities.md` | the six steps, the refutation check and the alternatives set aside: mechanism and intent |
| `#Display` | the line's meaning, linked | how the outcome writes the argument, the ratio and the warnings: mechanism |
| `#Build-time checks` | nothing | all mechanism, corrected as the stale rows say |
| `#Precision, the radius and cost` | the user consequences (the dependency problem, the hand-written equivalent, calls not memoized, decimal mode), linked to `definitions.md` and `numbers.md` | why the radius needs nothing new, no inversion without a written inverse, the benchmark and the property test: intent and mechanism |
| `#Where it lives` | nothing | the map, verified identifier by identifier |
| `#Not in this design` | nothing | ruled-out alternatives with their reasons: intent |
| `#Deferred` | nothing | the deferred designs with their reasons, and the one home of the issue links: intent |
| `#Alternatives considered` | nothing | intent, the first form rewritten as one alternative among the others |

### What the page states correctly, verified

- `#Definitions`: the head decides the line (`src/core/definitions.ts:554-611`: `~` an inverse, a trailing `-` a prefix, `(` directly after the name a function, `[` reserved and rejected as `unsupported`, else a unit); no whitespace is skipped between the name and `(` (`:598-599`); `=` ends the head and the comparisons are no part of the expression grammar (`:70-76`; the scratch run parses `2 tempC(100)`, `tempC(100)^2` and `-tempC(100)` and rejects `(x < 1) + 1`); a function of none is a node evaluated afresh at every call (`src/core/evaluate.ts:763-770`), where a unit is evaluated once at the ceiling (`src/core/build.ts:477-483`); a parameter without an annotation takes `1`, written `1` (`src/core/build.ts:609-617`); the result's dimension is inferred and checked (`:555-598`); `orphanInverse`, `inverseArity` and the duplicate `~` line (`:300-304`, `:643-650`, `:417-431`); the namespace rule and `prefixedName` (`:309-329`; the scratch run rejects a function named `pct` as the prefix `p` and the unit `ct`, and `sqrt(x) = x` as a duplicate of the built-in); an inverse's name cannot be a unit's, `NAME` admitting no `~` (`src/core/expr.ts:290`); the five functions and their conditions (`src/units.txt:207-210`, `:223-228`); the shape of `Definition`'s two kinds (`src/core/definitions.ts:151-176`).
- `#Annotations`: an annotation is a unit expression and the number `1` (`src/core/definitions.ts:328-359`); `annotationScale` and `annotationNotUnits` as described, `f(x: 2)`, `f(x: 1000 m)` and `f(x): kg/2` each `annotationScale` on the scratch run; a unit of any magnitude is accepted (`pctof(0.5)` is `= 0.5`); the recovered argument is a count of the annotation (`src/core/pipeline.ts:796-800`); the `bmi` displays (`≈ 30.515173 kg / m^2` with a blank `want`, `= 6.25 lb / ft^2` into `lb/ft^2`, and `≈ 30.515173` for the result annotated `: 1`).
- `#Names and shadowing`: annotations are evaluated among the units alone (`src/core/build.ts:542-549`), the body and the conditions resolve a bound name before any unit (`:694-707`; `src/core/evaluate.ts:1109-1115`), a prefixed name is always a unit (the scratch run builds `pre(m: km) = m`); `t`, `s`, `m`, `c`, `g`, `h` and `T` are units (`src/units.txt:17`, `:19`, `:112`, `:134-136`, `:168`, `:235`); `duplicateParameter` and `parameterNamesUnit` where the page says (`src/core/definitions.ts:492-517`).
- `#Conditions`: the comparator tokens and their order (`src/core/definitions.ts:385-393`), `mixedComparison` at the whole chain (`:402-406`), `conditionWithoutParameter` and `nonconformingComparison` (`src/core/build.ts:729-763`), calls in conditions as dependencies (`:717-738` through the walk's lookup; the scratch run reports `f(x) | f(x) > 0 = x` as a cycle), the exclusive and inclusive bounds (`ln1p(-1)` fails `x > -1`, `tempC(-273.15)` meets `x >= -273.15`).
- `#The check at a call`: after the arguments and before the body (`src/core/evaluate.ts:720-770`); at the operand context (`:979-982`); conditions and pairs left to right, the first certain failure ending the check even after an undecided comparison, a term that fails ending it only when nothing before was undecided, else leaving the condition undecided (`:985-1036`; the scratch run warns on both conditions of `guard(approx(1e-50) - 1e-50)`, written `| x > 0, ln(x) > 1`); the verdict table (`:1059-1093`); every value exact in decimal mode, so every comparison decides (`tempC(approx(-273.15))` is `= 0 K` there, with no warning).
- `#An undecided condition`: an assumed result is kept as the best so far and a later certain failure ends the loop with the error (`src/core/pipeline.ts:344-361`; the scratch run: `nonneg(1 + 1e-40 - exp(1e-40))` is assumed at the first and second passes and refused at the third); the warnings are the outcome's, one per distinct wording, every line's relation `≈` (`src/outcome.ts:224-234`), styled apart from the notes (`src/unit-converter.ts:128-133`, `:261-263`); `undecidedCondition` for a body failing under an assumption (`src/core/evaluate.ts:777-788`), retried like an `unresolved` (`src/core/pipeline.ts:381-382`); the collector (`src/core/evaluate.ts:722`, `:772`, `:983-984`, `:1037`; `src/core/pipeline.ts:344-360`); a unit's condition certainly failing or undecided fails the build (`src/core/build.ts:800-816`; `cold tempC(-300)` and `cold2 tempC(approx(-273.15))` on the scratch run); nothing checks a result's value.
- `#Calls`: `notAFunction` with `otherwise` and its two messages (`src/core/table.ts:215-225`; `src/messages.ts:83-89`; the scratch run words `kg(m/s)` and `foo(2)` exactly as the page quotes them); `functionAsUnit` carrying the arity, its message showing the call form (`src/core/table.ts:184-192`; `src/messages.ts:81-82`); the arity check before any argument (`src/core/evaluate.ts:668-679`; `tempC(1, 2)` and `tempC()`); `argumentMismatch` naming the parameter only where there is more than one (`src/messages.ts:120-128`); the body through `evaluateBound` with the lookup's failures boxed (`src/core/evaluate.ts:1101-1125`); `callFailed` carrying the body's error, and the message for a literal past the limit on the scratch run.
- `#A function as the want`: the order list, then function, then unit (`src/core/pipeline.ts:505-529`); the six steps (`:699-819`) and `disjoint` (`:876-882`); the count refused as a ratio may be (`:801-804`); `applyFunction` and `invertFunction` sharing `evaluateBound` (`src/core/evaluate.ts:893-946`); a `want` that is a call converting as a ratio with a reciprocal (the scratch run: `373.15 K` into `tempC(100)` gives two lines).
- `#Display`: one line, no reciprocal (`src/outcome.ts:629-651`); `=` when the count shows exactly; a ratio bare inside the call and parenthesized before a unit (`tempC(-475/27)` against `(1/10) kg` under the ratio notation on the scratch run); a call as the `have` with a blank `want` showing the primitives and with a unit `want` a ratio with its reciprocal (`src/outcome.ts:247-274`, `:323-337`).
- `#Build-time checks`: functions are nodes of the walk (`src/core/build.ts:147-148`, `:386-388`); an inverse is checked in its place through the walker from the top (`:348-361`); the bodies are never evaluated (`:561-567`), a `^` exponent is reduced within the limit (`src/core/dimension-of.ts:140-149`; `s2(x) = x^(1e30000)` fails the build on the scratch run) and a built-in's dimension rule applies (`:185-195`; `r3(x) = sin(x)` fails the build); the table's shape (`src/core/table.ts:93-129`); the inverses attached at the end (`src/core/build.ts:391-393`).
- `#Precision, the radius and cost`: no memo at a call (`src/core/evaluate.ts:763-770`); the scratch run gives `em(1e-30)` as `≈ 1` in exact mode and `= 0` in decimal mode, `log(2, 8)` as `= 3` against `ln(8) / ln(2)` as `≈ 3`, the written-out `tanh` refused at `3e18` where `tanh(3e18)` is `≈ 1`, and `ident(approx(1))` under `| x - x >= 0` assumed and warned of; the property test draws four hundred heads with none to three parameters and none to two conditions and injects each rejected piece (`src/core/definitions.test.ts:736-760`, `:858-870`); the benchmark's file has each function call an earlier one, each with an inverse (`bench/synthetic.ts:114-123`).
- `#Where it lives`: every identifier is where the page puts it (`src/core/definitions.ts:208-224`; `src/core/table.ts:93-100`, `:261-266`; `src/core/dimension-of.ts:80-85`; `src/core/evaluate.ts:893`, `:930`, `:969`, `:1050`, `:405`; `src/core/ball.ts:417`; `src/core/build.ts:158-262`, `:810-815`; `src/core/pipeline.ts:334-361`, `:699-819`; `src/messages.ts:81-89`, `:129-143`, `:462-474`, `:609-612`; `src/outcome.ts:224-234`; `src/unit-converter.ts:128-133`, `:261-263`; `src/units.txt:207-228`).
- `#Not in this design`: an inverse call in an expression, `~tempC2(y) = ~tempC(y)`, is a parse error on the scratch run.

### The §9.1 duplications that touch this page

- **The cost paragraph**, triplicated with `docs/definitions.md#Functions` (last paragraph) and `devdocs/architecture.md#Functions` (last paragraph): the user statement is the docs page's, the dependency problem's owner is `numbers.md` (C27), and this page keeps the mechanism and the reasons; the proposed `#Precision, the radius and cost` below is that reduction. The architecture page's paragraph is V2's.
- **The three-valued check and "why conditions differ from the built-ins' edges"**, duplicated with `docs/definitions.md#Functions`: the verdict table and the retry mechanics stay here as mechanism; the rationale is quoted in one line with the link (proposed `#An undecided condition`).
- **The call rule**, in four places: this page's `#Calls` keeps only what the rule buys the parser and the error (proposed `#Calls`).

### New to both corpora, found on the way

- A body of `1e30000` builds and its call succeeds, since the literal's significand is `1`; the literal that builds and fails at the call is one with more digits than the significand limit holds and fewer than the parser's hard bound admits (`src/core/rational.ts:115`).
- A function's name in a unit list is `functionAsUnit`, not an unknown unit; a list's name there is.
- A touching ball (one end exactly on the bound) is its own order in `orderOf`, decided by the comparator's strictness; the page's verdict table has it, the plan's N14 glosses it as a straddle.
- An explicit `: 1` annotation writes no unit in the call, exactly as an absent one does.

## Proposed edits

Links to `quantities.md`, `expressions.md` and `numbers.md` below name the §7 pages; until they exist the target is `../docs/definitions.md`, "Functions" ("Questions for the owner", 7). The example `dozen` is renamed `twelve` throughout, a name the definitions file does not define (question 4).

### devdocs/functions.md#(top)

Old (lines 3-8): "A function in the definitions file is a signature, `=` and a body; an inverse is a definition of its own, on a line that starts with `~`; and a `want` that names a function is answered by writing the call that would produce the `have`, `tempF(212) = tempC(100)`, which needs the inverse. [docs/definitions.md](../docs/definitions.md) describes functions from the user's side; this page is the design and its reasons."

New: "A function in the definitions file is a signature, `=` and a body; an inverse is a definition of its own, on a line that starts with `~`; and a `want` that names a function is answered by the call that would produce the `have`, `tempF(212) = tempC(100)`, which needs the inverse. How to write one and what a call does is in [definitions.md](../docs/definitions.md), "Functions", and what a conversion into a function answers in [quantities.md](../docs/quantities.md), "Conversion into a function"; this page is the mechanism and its reasons."

The second paragraph (lines 10-19) stays as it is.

### devdocs/functions.md#Definitions

Old (lines 32-33): "dozen(n: in) = 12 n" and "~dozen(len) = len / 12" in the example block.

New: "twelve(n: in) = 12 n" and "~twelve(len) = len / 12".

Old (line 36): "The grammar of a function line:"

New: "The grammar of a function line, hand-maintained until the references' grammars are generated from the parser's own data; the whole line grammar, every kind of definition included, is the comment at the top of `src/core/definitions.ts`:"

Old (lines 64-72), the bullet "A function has any number of parameters, none included":

New:

```
- **A function has any number of parameters, none included,** bound by
  position at a call; a parameter may not be named twice
  (`duplicateParameter`). A function of none, `twopi() = 2 pi()`, is
  called with empty parentheses, as `pi()` is. It differs from a unit of
  the same body, `twopi  2 pi()`, in when it is evaluated: a unit is
  evaluated once, when the table is built at the ceiling, and a call
  afresh at the working precision of every pass, so a function of none is
  the way to name a computed constant without fixing it in the table. It
  has no inverse, since it has no argument to recover (`inverseArity`).
```

Old (lines 87-90): "The inverse's parameter has `name`'s result dimension and takes no annotation, since that dimension is known, but may take conditions, which restrict the `have`s a conversion into the function accepts; its body must conform to `name`'s parameter."

New: "The inverse's parameter has `name`'s result dimension and takes no annotation, since that dimension is known (one written there is rejected where it stands, `inverseAnnotation`), but may take conditions, which restrict the `have`s a conversion into the function accepts; its body must conform to `name`'s parameter."

Old (lines 107-120): "The functions of `units.txt`:" and the block of ten lines.

New: "The definitions file ships five functions, each with an inverse: the temperature readings `tempC` and `tempF`, each with a condition, and the logarithmic units `neper`, `bel` and `decibel`. `src/units.txt` is their source of truth, and the units page of the user docs describes them."

### devdocs/functions.md#Annotations

Old (line 131): "**An annotation checks a dimension and changes no value.** A quantity carries no unit of its own:"

New: "**An annotation checks a dimension and changes no value** ([definitions.md](../docs/definitions.md), "Functions"). A quantity carries no unit of its own:"

Old (lines 146-149): "That surprises a reader of the head, but the alternatives below are worse, and the `want` is always there; showing a lone call's value in its annotated result unit by default is deferred ([#130][130])."

New: "That surprises a reader of the head, but the alternatives below are worse, and the `want` is always there; showing a lone call's value in its annotated result unit by default is deferred ("Deferred" below)."

Old (lines 173-177): "No message is worded for a definitions rejection today, since definitions cannot be typed ([#132][132]); the wording meant for this one is "An annotation names units and cannot scale. Write a scale in the body; for a plain number, write 1." Conformance ignores magnitude, so `: 2` could only be read two ways, and both bite:"

New: "No message is worded for a definitions rejection today: only the system file is loaded, and definitions typed into the app are deferred ("Deferred" below). Conformance ignores magnitude, so `: 2` could only be read two ways, and both bite:"

Old (lines 188-192): "An annotation's unit matters beyond its dimension in one place only: a recovered argument is written as a count of it ("Display" below), so `2 ft` into `dozen` is `dozen(2 in)`. An annotation must be nonzero (`zeroDeclaredUnit`), since a count of zero means nothing; with the restriction above, that can fail only for a unit defined as zero."

New: "An annotation's unit matters beyond its dimension in one place only: a recovered argument is written as a count of it ("Display" below), so `2 ft` into `twelve` is `twelve(2 in)`. An annotation must be certainly nonzero: a value that is zero, or that cannot be told from zero, is rejected (`zeroDeclaredUnit`), since a count of either means nothing; with the restriction above, that can fail only for a unit defined as zero or as an inexact value around it."

### devdocs/functions.md#Names and shadowing

Old (line 218): "Shadowing a unit is allowed and silent."

New: "Shadowing a unit is allowed and silent ([definitions.md](../docs/definitions.md), "Functions")."

Old (lines 230-239), the second bullet from "**A parameter named like a unit that the same head uses**" to its end.

New:

```
- **A parameter named like a unit that the same head uses**
  (`parameterNamesUnit`, at the annotation's use of the name):
  `kinetic(m: kg, v: m/s) = m v^2 / 2`, where the head's `m` is the metre
  and the body's is the mass. The name resolves one way in each place,
  but the line reads both ways. The rejection carries the parameter and
  points at the annotation; no message is worded for it, as for every
  definitions rejection ("Annotations" above). It is an error rather
  than a warning because the build has no way to report a warning and
  nothing edits a definition yet; relaxing it later breaks no file,
  where tightening a silence would ("Deferred" below).
```

### devdocs/functions.md#Conditions

Complete proposed text for the section's own body, up to its two subsections, which stay as they are:

```
## Conditions

A function or an inverse restricts its arguments by conditions, written
behind a `|` after the head's parameters and result annotation and
separated by commas; what a condition is, how it is written and what it
means for a call is in [definitions.md](../docs/definitions.md),
"Functions". This section is the grammar's reasons and the build's
checks; the check at a call and what an undecided condition does are
the two subsections.

- **A condition is a chain of comparisons,** two or more terms joined by
  `<`, `<=`, `>` or `>=`, with `≤` and `≥` read as `<=` and `>=`, all
  pointing one way; a chain that turns, `0 < x > 1`, bounds nothing as an
  interval does and is a parse error (`mixedComparison`, at the whole
  chain). `<` and `>` exclude their bound and `<=` and `>=` include it,
  which is what decides the exact boundary ("The check at a call").
- **Several conditions are a conjunction.** There is no disjunction: a
  domain in two pieces is usually one condition on an expression
  (`abs(x) >= 1`).
- **The comparisons are the four orderings; `=` and `!=` are not among
  them.** `=` ends the head, and equality of an inexact argument can never
  be decided on a ball, so an equality condition would be undecided for
  every inexact argument: a design that adds equality operators or
  conditional expressions to the language has to say what an undecidable
  comparison of inexact values yields ([future.md](future.md),
  "Extensions that fit"). A body that cannot be computed at a point
  already fails there.
- **Conditions see the parameters before the units,** as the body does,
  so a condition is written as the body would write the same expression.
  Each must mention a parameter (`conditionWithoutParameter`): one that
  does not could only always hold or never.
- **Dimensions are checked at build time.** `dimensionOf` takes each
  term's dimension with the parameters bound as in the body, and adjacent
  terms must conform, as a sum's operands must
  (`nonconformingComparison`, carrying both terms and the mismatch): with
  `x: K`, `| x > 0` is an error, and the fix is `0 K`.
- **A term is any expression** of the language, calls of the built-ins
  and of other defined functions included, which check their own
  conditions in turn. A unit list is not an expression, and neither is a
  comparison: there are no truth values, so a comparison cannot stand
  inside a term (`(x < 1) + 1` is a parse error), and a condition is only
  ever a chain at the top level.
- **Calls in conditions are dependencies,** as calls in a body are. The
  build's walk follows them, on functions and on inverses alike, so
  `f(x) | f(x) > 0 = …` is a cycle reported at build time, and evaluation
  still terminates.

The grammar is unambiguous, and still decided by the text alone: an
annotation ends at `,`, `)`, `|` or `=`, none of which a unit expression
contains; a term ends at a comparison, at a comma outside parentheses,
or at `=`, none of which can continue an expression (a comma inside a
call's parentheses belongs to the call, by nesting); comparisons bind
looser than anything in a term, since they are not part of the
expression grammar, so `| a + b < c d` compares `a + b` with `c d` and
`| x > -1` compares `x` with the negation of `1`; `<=` and `>=` are each
one token, read before `<` and `>`; `|` appears once, and only in a head;
and the deferred dimension variables fit before the parameters without
touching any of this.
```

### devdocs/functions.md#An undecided condition

Old (lines 404-414), the bullet "Why conditions differ from the built-ins' edges".

New:

```
- **Why conditions differ from the built-ins' edges.** The user's
  statement is in [definitions.md](../docs/definitions.md), "Functions":
  at an edge of a built-in the value jumps or does not exist, so a guess
  would be a wrong value and `floor(sqrt(2)^2)` is refused, where a
  condition restricts a body that usually computes on both sides of it,
  and where the body cannot compute it fails or is unresolved itself. So
  the value shown is the body's honest ball, and the only thing in doubt
  is whether the definition admits the argument, which the warning says.
  A traditional calculator would return a `NaN`, or a value from the
  wrong side, without saying why.
```

Old (lines 455-457): "Whether ranges, on defined functions and more systematically on the built-ins, could instead narrow a result's ball and so carry their knowledge through the pipeline is [#134][134]."

New: "Whether ranges, on defined functions and more systematically on the built-ins, could instead narrow a result's ball and so carry their knowledge through the pipeline is open ([#134](https://github.com/bsidhom/exucal/issues/134))."

Old (lines 459-468), the last paragraph.

New: "What a conversion into a function checks is two things, neither a range on forward calls: the inverse's conditions, its own, which restrict the `have`s the conversion accepts, and the function's conditions, checked on the recovered argument ("A function as the want", steps 3 and 5). An inverse's condition is worth writing where the inverse's body would otherwise fail less clearly: `~neper(y) | y > 0 = ln(y)` refuses `-1` into `neper` by naming `y > 0`, where without it `ln` refuses by its own domain."

### devdocs/functions.md#Calls

Complete proposed text:

```
## Calls

A call is a name directly followed by `(`, its arguments and `)`, an
atom of the expression grammar decided by the text alone, since parsing
never touches the table: the rule, the product `kg (m/s)` against the
call `kg(m/s)`, and the messages are in
[expressions.md](../docs/expressions.md), "Calls". The lexical rule is
what lets the parser stay ignorant of the table. The message for a call
of a unit shows the product with the space because the error carries
what the name is otherwise (`notAFunction` and its `otherwise`, in
`table.ts`), and a bare function name in an expression is
`functionAsUnit`, which carries the function's arity so that the message
can show the call form.

A call of a defined function evaluates in these steps, and the first
failure ends it:

1. The name resolves among the functions and the built-ins, the defined
   functions first; a name that is neither is `notAFunction`.
2. The call must give as many arguments as the function has parameters
   (`arityOf` in `table.ts`); another count is `arityMismatch`, checked
   before any argument is evaluated.
3. The arguments are evaluated left to right, each once (a call is by
   value), and each is checked as soon as it is evaluated: it must
   conform to its parameter's annotation, or be a plain number without
   one; a failure is `argumentMismatch`, carrying the parameter and the
   count, so that the message names the parameter only where there is
   more than one, and it is reported before any later argument is
   evaluated.
4. The conditions are checked ("The check at a call"); a certain failure
   is `conditionFailed`, and a condition not decided is assumed to hold,
   the assumption travelling with the result.
5. The body is evaluated with each parameter bound to its argument
   (`evaluateBound`), through the table's lookup, the bound parameters
   resolved before any unit or prefix. Its failures carry spans into the
   definitions text, so they come back as `callFailed`, naming the
   function and carrying the body's error; an `unresolved` inside the
   body, at any depth, is still retried; under an assumption, a failure
   of the body is an `undecidedCondition` instead. Only the evaluator's
   own failures are wrapped so: the lookup's failures are boxed on the
   way in and unboxed on the way out, so that the body's own failures
   can be told from the lookup's without the evaluator knowing the
   lookup's error type, and a lookup failure inside a body, which a
   table that built cannot produce, comes back as any lookup failure
   does.

The result is a quantity like any other. Its dimension is not checked at
the call, the build having checked or inferred it once. In decimal mode
each step of the body is one rounded step, as the same text typed inline
would be ([numbers.md](numbers.md), "Decimal mode").
```

### devdocs/functions.md#A function as the want

Old (lines 524-526): "The pipeline reads a `want` of one bare name specially: a name that is a list means the list, a name that is a function comes next, and only then is the name read as a unit. For a function:"

New: "What a conversion into a function answers, and when one exists, is in [quantities.md](../docs/quantities.md), "Conversion into a function"; this section is the pipeline's steps. It reads a `want` of one bare name specially: a name that is a list means the list, a name that is a function comes next, and only then is the name read as a unit. For a function:"

Old (lines 528-531), step 1's quoted message: "`"normcdf" has no inverse, so it cannot be the unit to convert to. Define ~normcdf(y) = … to give it one.`"

New: "`"normcdf" has no inverse, so it cannot be the unit to convert to. Define "~normcdf(y) = …" to give it one.`"

Old (lines 566-574), the last paragraph.

New: "The conversion (`Conversion`'s `function` kind) carries the `have`, as read and as evaluated, the function's name, the recovered argument, the parameter's annotation with its text, and the argument as a count of that unit, so that the UI does no arithmetic; a count refused as a ratio may be (a quotient past the exponent bound) is the conversion's refusal. A function's name is not a unit anywhere else: in a unit list (`tempC;degC`) it is `functionAsUnit`, as it is in an expression ("Calls"), where a list's name is an unknown unit. A `want` that is a call, `tempC(100)`, is not special: it is an expression, and the conversion is the ratio, with a reciprocal."

### devdocs/functions.md#Display

Complete proposed text:

```
## Display

A conversion into a function is one line, `have = name(argument)`, with
no reciprocal line, since the answer is a call and not a ratio; what the
line says is in [quantities.md](../docs/quantities.md), "Conversion into
a function". The outcome writes it from the conversion alone, with no
arithmetic of its own (`functionResult` in `outcome.ts`):

- The argument is the count the conversion carries, written as any value
  is (`show`, at the display digits in the rounding mode), as the first
  factor of the parameter's annotation, the annotation written back by
  the printer as a `want` is; an annotation that is `1`, written or
  absent, adds no unit, so a plain number's argument is bare
  (`tempF(212) = tempC(100)`, `300 K = tempF(80.33)`,
  `2 ft = twelve(2 in)`).
- The relation is the count's, `=` when it shows exactly, as for any
  value. Under the ratio notation an exact count is a ratio, written bare
  inside the call (`tempC(-475/27)`), where before a unit it would be
  parenthesized ([notation.md](notation.md), "Where a ratio is written").
- A call as the `have` is not special: with a blank `want` it shows its
  value in the primitives, `tempC(100) = 373.15 K`, and with a unit
  `want` it is a ratio and gets its reciprocal.
- A condition assumed on either side, the inverse's or the function's,
  adds its warning beside the line, as in every output mode ("An
  undecided condition").
```

### devdocs/functions.md#Build-time checks

Old (lines 604-618), the numbered list.

New:

```
1. Evaluating each parameter's annotation among the units; each must be
   certainly nonzero, since an argument is written as a count of the
   parameter's.
2. Taking the body's dimension by `dimensionOf` (`dimension-of.ts`, the
   evaluator's rules over dimensions alone: a number is dimensionless, a
   unit is its dimension through the walk's lookup, a sum checks
   conformance, a product combines, a power raises, a call applies the
   callee's rule, a built-in's dimension rule included), with each
   parameter bound to its annotation's dimension (plain without one),
   through the walk's own lookup, so that a name that means nothing, a
   sum whose operands do not conform, or a call of the wrong count or
   dimension is an ordinary build error with its span in the definitions
   text; that dimension is the function's result, exact because a body's
   dimension cannot vary with the value of its argument.
3. Taking each condition's terms the same way, each conforming to the
   next, and each condition mentioning a parameter.
4. Evaluating the result's annotation, when there is one, under the rule
   of step 1, and checking the body's dimension against it; a failure is
   `functionMismatch`, naming the result.
```

Old (lines 625-631): "Checking it means finding its function (a build error when there is none, or when the function has several parameters), taking its conditions' and its body's dimensions with its parameter bound to the function's result dimension, and checking the body against what the function's parameter takes (`functionMismatch`, naming the inverse). The checked inverses are attached to their functions at the end of the build."

New: "An inverse of no defined function is found as soon as the definitions are indexed, before any body is looked at (`orphanInverse`). Checking an inverse in its place means requesting its function, which must have exactly one parameter (`inverseArity` otherwise, for none as for several), taking its conditions' and its body's dimensions with its parameter bound to the function's result dimension, and checking the body against what the function's parameter takes (`functionMismatch`, naming the inverse). The checked inverses are attached to their functions at the end of the build."

Old (lines 633-641), the paragraph from "The bodies are not evaluated at build time at all" to "the build's context supplies it."

New: "The bodies are not evaluated at build time at all: a body that fails at some value, or at every value, builds and fails at the call that reaches it, since `ln(x - 1)`, `asin(x + 1)` and `1 / ln(x)` fail at some value and are fine functions. A literal in a body is not checked against the significand limit either, so a body whose literal has more digits than the limit holds, within the parser's hard bound, builds and fails at the call; a `^` exponent is (`reduceExponent`), since its reduction is what the limit bounds and the build's context supplies it."

### devdocs/functions.md#Precision, the radius and cost

Complete proposed text:

```
## Precision, the radius and cost

A defined function is a shorthand for its body, and a call is computed
as the body typed out in its place would be. What that means for a
user, that a parameter used twice is two independent copies of its
argument's bounds, that a hand-written equivalent of a built-in is
slower and can fail where the built-in does not, that calls are not
memoized and that decimal mode rounds each step of the body, is in
[definitions.md](../docs/definitions.md), "Functions", and the
dependency problem behind the first in [numbers.md](../docs/numbers.md).
This section is why the machinery needs nothing new for functions, and
where it stops.

The arguments are evaluated once, to balls; the body is evaluated with
the parameters bound to those balls, and every operation in it is one
that already exists on balls, settled at each node as anywhere else.
Each pass of the retry loop evaluates the whole expression again, bodies
included, so a cancellation inside a body is paid for by the next pass's
digits, as one typed inline is. Cycles are build errors, so evaluation
terminates. A user can write no primitive, no series and no loop, only
compositions of operations that already carry honest radii, so the
radius needs nothing new. What follows from that, and what is left out:

- **Calls are not memoized.** A body that calls a function twice
  evaluates it twice, so nesting such calls `k` levels deep evaluates the
  innermost `2^k` times, at every pass of the retry loop. That is what
  the same expression written out in full costs, so it is no new limit,
  and the ceiling bounds it as it bounds any expression; but a definition
  that reads small can be large.
- **A composition pays at every operation,** where a built-in is one
  kernel routine at the bits its result needs plus a guard, with its
  radius from one bound over the whole ball, its exact cases recognized
  and its own edges handled; the retry loop makes the composition's
  digits right all the same, at more passes, up to the ceiling.
- **A written inverse is checked where it is used,** which refutes a
  wrong answer and proves nothing about other values ("A function as the
  want").
- **There is no inversion without a written inverse.** Certifying a root
  of a composition needs monotonicity, or an enclosure of the derivative
  over the bracket, which the evaluator has neither of; that is the one
  place user functions would make the radius hard, and the optional
  inverse stays clear of it.
- **A condition on a ball is three-valued,** and one left undecided is
  assumed and warned of ("An undecided condition").

The build of a file of functions scales as the build of units does,
linearly with their number: the benchmark builds a file of functions,
each calling an earlier one and each with an inverse, then one four
times as long, and asserts that the cost grows in proportion, within a
margin; a seeded property test draws hundreds of function and inverse
lines, with none to three parameters and up to two conditions, and
injects each rejected piece where it should be rejected.
```

### devdocs/functions.md#Not in this design

Old (lines 737-739): "**Disjunctions and `!=` in conditions**, and **an assertion on a result's value** ("Conditions" says why; ranges that narrow balls are [#134][134])."

New: "**Disjunctions and `!=` in conditions**, and **an assertion on a result's value** ("Conditions" says why; ranges that narrow balls are an open question, "An undecided condition")."

### devdocs/functions.md#Deferred

Old (line 751): "Each has an issue of its own:"

New: "Each has an issue of its own, linked here and nowhere else on this page:"

Old (lines 753-754): "- **The result annotation as the default `want` of a bare call** ([#130][130]):"

New: "- **The result annotation as the default `want` of a bare call** ([#130](https://github.com/bsidhom/exucal/issues/130)):"

Old (lines 759-760): "- **The shadowing error as a warning** ([#131][131]), once there is somewhere to show one."

New: "- **The shadowing error as a warning** ([#131](https://github.com/bsidhom/exucal/issues/131)), once user definitions have an editor and the build has a way to report a warning."

Old (line 761): "- **Definitions typed into the converter** ([#132][132]):"

New: "- **Definitions typed into the converter** ([#132](https://github.com/bsidhom/exucal/issues/132)); until then only the system file is loaded, and no message is worded for a definitions rejection:"

Old (line 763): "- **Dimension-generic functions** ([#133][133]). The intended design:"

New: "- **Dimension-generic functions** ([#133](https://github.com/bsidhom/exucal/issues/133)). The intended design:"

The rest of the section, the design of the dimension variables with its reasons, stays as it is.

### devdocs/functions.md#Alternatives considered

Old (lines 802-814), the bullet "The syntax".

New:

```
- **The syntax.** The forms set aside, each with what it loses. A
  bracketed head, `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`,
  declares the argument's and the result's units in brackets, both
  required, with the inverse after a `;` in which the function's own
  name stands for its value, and takes one argument only; extended in
  place to several parameters (`kinetic(mass, v) [kg, m/s; J] …`) it
  matches annotations to parameters by position, all or nothing, and has
  no home for bounds. Annotated signatures with the inverse after a `;`
  keep the function's own name standing for its value and crowd the
  line. GNU units' keyword clauses (`units=[…] domain=[…]`) lengthen every
  line and grow the ways to get one wrong. A multi-line block makes the
  file indentation-sensitive for one kind of definition. The inverse on
  its own line makes "optional" literal: a function has no inverse slot
  to leave empty, and adding an inverse adds a line.
```

Old (lines 826-830): the five reference-style link definitions.

New: delete.

## Terminology

| Term met | Where | Section 8 | Proposed |
| --- | --- | --- | --- |
| "User-defined functions" (the title), "a user function", "user functions" | `devdocs/functions.md:1`, `:650`, `:690` | not covered; D2 proposed **defined function** against **built-in** | the title "Defined functions" and "a defined function" in prose: the functions of the definitions file, the system's today and a user's once typing them lands; "user-defined" only for that deferred case (question 2) |
| "function conversion", "a function want's line", "a function as the want" | `devdocs/functions.md:578`, `:591-592`, `:395`, the heading at `:522` | covered: **conversion into a function** | the canonical term in prose (the proposed texts use it); the heading is question 3 |
| "certainly holds", "certainly fails", "certain failure", "a value certainly other than the `have`" | `devdocs/functions.md#The check at a call`, `#An undecided condition`, `#A function as the want` | **certified** is reserved for digits on the ball (§12, question 8); a verdict is another sense | the code's verdict words, **holds**, **fails** and **undecided** (`Verdict` in `evaluate.ts`), with "certainly" as their gloss, and never "certain" of digits |
| "its own domain" (of an inverse's conditions) | `devdocs/functions.md:460` | conflicts: **domain** is reserved for built-ins | "its own conditions" (the proposed `#An undecided condition` says so) |
| "head" (a function or inverse line before `=`) | `devdocs/functions.md#Definitions`, `#Names and shadowing`, `#Conditions` | not covered (D2 proposed devdocs-only, glossed once) | the same |
| "a restriction" (of a condition) | `devdocs/functions.md:407` | **condition**; "restriction" is a listed synonym | "restricts" as the verb only; the proposed text keeps "a condition restricts a body" |
| "plain number" | throughout the page | **dimensionless** is reserved for a plain scalar, glossed "a plain number" in docs; the page never calls a kind dimensionless | keep "a plain number" in this page's prose, "dimensionless" where the code's `DIMENSIONLESS` is meant (step 2 of the build-time checks) |
| "interval" (of a chain that bounds one; interval notation) | `devdocs/functions.md:265`, `:818` | **interval** devdocs-only, of a ball | no conflict: the mathematical sense, kept |

## Questions for the owner

1. **Where the issue links live on this page.** §12, question 26 allows one link per issue. Proposed: #130 to #133 in "Deferred", which is the page's list of what is open, with "Annotations", "Names and shadowing" and the rest referring to that section by name; #134 in "An undecided condition", where the reason it is open is stated, with "Not in this design" referring there. D2 proposed instead #130 under "Annotations", #131 under "Names and shadowing" and #132 under `docs/definitions.md#The format`, leaving "Deferred" with plain mentions; either satisfies the rule, and the proposed edits above follow the first.
2. **The page title.** "User-defined functions" names five functions the system file defines and no user wrote; §12, question 12 settles that the definition language is the language of definitions, system and user alike. Proposed: the title "Defined functions", the file name `functions.md` unchanged for the links, and `devdocs/README.md:23` and `devdocs/architecture.md:42`, which describe the page as "user-defined functions", reworded by V8 and V2.
3. **The heading "A function as the want".** §8's canonical term is "conversion into a function". Proposed: keep the heading, since it names the want's form and `src/core/pipeline.ts:19-20` cites it, and use the canonical term in the prose; renaming it to "Conversion into a function" costs that one comment and the plan's pointers.
4. **The `dozen` example** (D2's question 1): `dozen` is a unit of the file (`src/units.txt:614`), so the example cannot be added as written. Proposed: `twelve`, which the file does not define, in `devdocs/functions.md:32-33`, `:190`, `:586` and in `docs/definitions.md:282-284`; the proposed edits above use it.
5. **Code comments outside the audit.** `src/core/dimension-of.ts:26-28` carries the `1e30000` example the page carries, which does not fail at a call; `src/core/build.ts:50-53` and `src/core/dimension-of.ts:3-4` carry the first version's history that the plan drops from the page (D2's question 4). Proposed: one code change fixing the example and dropping the history, under the style guide's rule for comments.
6. **The triplicated cost paragraph** (§9.1). Proposed split: `docs/definitions.md#Functions` keeps the user statement, `numbers.md` the dependency problem (C27), this page the mechanism as proposed, and `devdocs/architecture.md#Functions` (last paragraph, V2's) a pointer here.
7. **Links to pages that do not exist yet.** The proposed texts link to `quantities.md`, `expressions.md` and `numbers.md` in `docs/`, which are §7's. Proposed: apply the texts when the skeleton lands; applied earlier, each such link points at `../docs/definitions.md`, "Functions", which holds the rules today.

## Notes on this run

The entry's module list names `outcome.ts` but not `table.ts`, `messages.ts` or `ball.ts`, which the page's `#Where it lives` names and whose `unitLookup`, `orderOf`, `position` and the quoted messages the page's steps rest on; the "Also read" list above is that gap, and a next revision of the entry could add the three. The context's D2 output covers `#Definitions` to `#Build-time checks` closely, and this run re-verified its rows for this page from the code rather than taking them on trust, confirming every one. What was hard was not the mechanism, which the code states almost sentence for sentence, but the page's examples: three had to be tried before they were believed, and two were wrong in ways no reading would catch (`1e30000` has a one-digit significand; `approx(0)` is an exact zero, so a probe of an undecided comparison needs a ball that straddles zero, such as `approx(1e-50) - 1e-50`). The next unit on these pages should know that the system file's short names collide with natural example names (`dozen`, `pct` as `p` plus `ct`, `g`, `h`), that the harness runs the whole retry schedule per `outcomeOf` call, and that the ratio notation reaches a function's argument through `OutcomeOptions`'s `ratio`, which decimal mode drops.
