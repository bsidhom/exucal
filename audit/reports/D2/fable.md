# Unit D2: Definition language (fable)

- Plan revision: c29f5e8
- Date: 2026-10-09
- Model: claude-fable-5-1
- Doc sections read: `docs/definitions.md#The format`, `#Names`, `#Unit lists`, `#Functions`; `devdocs/functions.md#Definitions`, `#Annotations`, `#Names and shadowing`, `#Conditions` (the section's own text; its subsections `#The check at a call` and `#An undecided condition` are A6's and were not read), `#Calls`, `#Build-time checks`; `devdocs/architecture.md#Definitions`
- Modules read: `src/core/definitions.ts`, `src/core/build.ts`, `src/core/dimension-of.ts`, `src/core/table.ts`, `src/units.test.ts`, `src/messages.ts`, `src/core/definitions.test.ts` (each in full)
- Also read: `src/core/evaluate.ts:55-95`, `:300-345`, `:660-800`, `:885-1130`, `:1185-1200` (the call case, `applyFunction`, `invertFunction`, `checkConditions`, `decide`, `evaluateBound`, needed for `#Calls`); `src/core/names.ts` (in full, for `#Names`); `src/core/expr.ts:286-290` (`NAME`); `src/core/dimension.ts:104-106` (`isDimensionless`); `src/core/context.ts:235-241`, `:272-286` (`ceilingContext`, `checkContext`); `src/core/pipeline.ts:173-299`, `:425-462` (the exported types and the two entry points, to drive the scratch checks); `src/core/display.ts:238-244` (`show`'s signature); `docs/definitions.md:1-9` (whether the page states that only the system file is loaded); `devdocs/functions.md:710` and `:826-830` (a grep hit for `inverseAnnotation`, and the reference-style link targets); `audit/plan/01-core-abstractions.md` §1.3 (pointed to by §12, question 12); `audit/plan/06-coverage-gaps.md` (the gaps this unit confirms or refutes); `package.json` (the test script); a grep over `src/` for where `BuildError` and `DefinitionRejection` are consumed (`src/system-build.ts`, `src/system-table.ts`, imports only)

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 0 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 17 / 0 / 1 |
| Gaps confirmed / refuted / new | 5 / 1 / 6 |
| Proposed edits | 9 |
| Questions for the owner | 7 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |

None assigned. The context claims (N14 to N16, Q1 to Q12, Q16) were checked only where this unit's modules touch them; none is contradicted (see "Findings", "Context claims met in these modules").

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/functions.md#Build-time checks` (lines 636-638) | "(The first version of the check evaluated each body at one of the declared unit, which the elementary functions made untenable.)" | drop (plan row confirmed) | delete |
| `devdocs/functions.md#Annotations` (173-177) | "No message is worded for a definitions rejection today, since definitions cannot be typed ([#132][132]); the wording meant for this one is …" | update (plan row confirmed) | No message is worded for a definitions rejection today: only the system file is loaded, and definitions typed into the app are open ([#132](https://github.com/bsidhom/exucal/issues/132)). |
| `devdocs/functions.md#Conditions` (273-276) | "**There is no equality and no `!=`.** `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument." | update (plan row confirmed) | see "Proposed edits", `devdocs/functions.md#Conditions` |
| `docs/definitions.md#The format` (66, 80-82) | "# kind primitive (dimensionless)" and "a dimensionless marker that keeps quantities apart" | update (terminology, §12 question 20) | "# kind primitive" and "a marker that keeps apart quantities which would otherwise look alike" |
| `docs/definitions.md#The format` (98-102) | "A name defined twice, a circular definition, a prefix whose body has a dimension, a unit list that breaks the rules below, a function whose body does not fit its annotations, or an inverse of no function is an error." | update (the list names six of some twenty checks) | see "Proposed edits", `docs/definitions.md#The format` (the table of checks) |
| `docs/definitions.md#Functions` (291-293) | "and is an error that says to write the scale in the body" | update (no message is worded for any definitions error; `src/messages.ts` has no case for one) | "and is rejected; write the scale in the body" |
| `devdocs/functions.md#Definitions` (36-48) | the grammar block, unmarked | update (interim state, §2.2.3: marked hand-maintained until generated) | see "Proposed edits", `devdocs/functions.md#Definitions` |
| `devdocs/functions.md#Annotations` (146-149) | "is deferred ([#130][130])" | update (reference-style link; Markdown principle) | "is open ([#130](https://github.com/bsidhom/exucal/issues/130))" |
| `devdocs/functions.md#Annotations` (190-192) | "An annotation must be nonzero (`zeroDeclaredUnit`), since a count of zero means nothing; with the restriction above, that can fail only for a unit defined as zero." | update (`src/core/build.ts:833-838` rejects a ball containing zero) | An annotation must be nonzero, and certainly so: a value that is zero or cannot be told from zero is rejected (`zeroDeclaredUnit`), since a count of either means nothing; with the restriction above, that can fail only for a unit defined as zero or as an inexact value around it. |
| `devdocs/functions.md#Names and shadowing` (234-239) | "The rejection carries the parameter, and the message meant for it names the parameter and the annotation and suggests renaming the parameter. The error is meant to become a warning once … ([#131][131]) …" | update (describes a message that does not exist; reference-style link) | see "Proposed edits", `devdocs/functions.md#Names and shadowing` |
| `devdocs/functions.md#Conditions` (284-285) | "with `x: K`, `\| x > 0` is an error, whose message suggests `0 K`." | update (no message is worded for a build error) | "with `x: K`, `\| x > 0` is an error carrying both terms' spans and the mismatch; the fix is `0 K`." |
| `devdocs/functions.md#Calls` (494-499) | steps 3 and 4: the arguments are evaluated, then each must conform | update (`src/core/evaluate.ts:692-719` checks each argument as soon as it is evaluated) | see "Proposed edits", `devdocs/functions.md#Calls` |
| `devdocs/functions.md#Build-time checks` (604-618) | the numbered steps: "Evaluating its annotations" first, the result check third | update (`src/core/build.ts:538-598`: the result's annotation is evaluated after the body and the conditions are checked) | see "Proposed edits", `devdocs/functions.md#Build-time checks` |
| `devdocs/functions.md#Build-time checks` (625-626) | "finding its function (a build error when there is none, or when the function has several parameters)" | update (an inverse of no function is found before the walk, `src/core/build.ts:300-304`; a function of no parameters fails too, `src/core/build.ts:643-650`) | see "Proposed edits", `devdocs/functions.md#Build-time checks` |
| `devdocs/architecture.md#Definitions` (202-206) | "The parser rejects an annotation with a number other than `1`, a sum, a negation or a call, and a parameter named like a unit its own head's annotations use, each where it is written; it reserves a `[` …" | update (omits a duplicate parameter, an annotated inverse parameter and a mixed chain; `src/core/definitions.ts:208-224`) | see "Proposed edits", `devdocs/architecture.md#Definitions` |
| `devdocs/architecture.md#Definitions` (288-291) | "A unit, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built" | update (a prefix's body is evaluated the same way, `src/core/build.ts:485-491`) | "A unit, a prefix, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built, …" |
| `devdocs/architecture.md#Definitions` (316-323) | "`build.ts` puts them together in a fixed order: index the definitions by name, rejecting a duplicate; check the index for an ambiguous name, …" | update (the check that every inverse names a defined function runs between the two, `src/core/build.ts:300-304`) | see "Proposed edits", `devdocs/architecture.md#Definitions` |
| `devdocs/architecture.md#Definitions` (325-345) | the build-error catalogue | update (omits `inverseArity`, `nonconformingComparison`, `conditionWithoutParameter` and the build's `undecidedCondition`; `src/core/build.ts:158-262`) | see "Proposed edits", `devdocs/architecture.md#Definitions` |

## Findings

### The line grammar's facts, verified against `definitions.ts` and the property test

The prose of `docs/definitions.md#The format` and `devdocs/architecture.md#Definitions`, and the head-grammar block of `devdocs/functions.md#Definitions`, agree with the parser. The complete line grammar exists in one place only, the comment at the top of `src/core/definitions.ts:19-32`; the block in `devdocs/functions.md:38-48` is its function and inverse part, written with the same productions (`params`, `param`, `conditions`, `condition`, `cmp`) and equivalent in every detail, with `dims` added as the reserved production.

- **The head decides the line.** A name read with an optional trailing `-` or a leading `~` as one token (`src/core/definitions.ts:250-253`); `~` makes an inverse (`:560-571`), `-` a prefix (`:573-579`), a `(` directly after the name a function (`:598-599`), a `[` the reserved and rejected dimension variables (`:600-608`), and anything else a unit, primitive or list (`:587-597`, `:609`). Tests: `src/core/definitions.test.ts:176-188` (`m -1000` is the unit `m` with a negated body), `:650-660` (`tempC (x) K` is a unit), `:630-636`.
- **Whitespace.** The gap after a unit's or prefix's name is required (`src/core/definitions.ts:255-256`, `:574`, `:587`; `src/core/definitions.test.ts:286-290`: `inch2.54 cm`, `m!`, `kilo-1000` all fail with "a space" expected). Inside a head, blanks are free around every token (`:258-260`, `:434`; tests `:675-676`, `:708`), and none is allowed between the name and `(`.
- **Bodies.** `!` and `!kind` only, with nothing else after the `!` (`:262-270`; `src/core/definitions.test.ts:204-212`: `!foo`, `! kind`, `!kinds` fail). A body of two or more `;`-separated expressions is a list and a body of one is a unit (`:300-313`; tests `:357-394`); a list may not end in `;` or have an empty item (`:403-406`). A prefix's body is one expression: neither `!` nor a list (`:574`; tests `:197-202`, `:396-401`), and its value must be a plain number, which the build checks (`src/core/build.ts:493-496`).
- **Lines and comments.** `#` to the end of the line, with or without a space before it; blank and comment-only lines skipped; indentation allowed; `\n` or `\r\n`; no newline needed after the last line (`src/core/definitions.ts:614-628`; tests `:241-284`). A body cannot continue onto the next line (`:298-303`), and a line must start with a name or a comment (`:305-311`).
- **Functions.** Zero or more parameters, comma-separated, each a name with an optional `: annotation` (`:433-447`); an optional result `: annotation`; optional `| conditions`; `=` and an expression, in that order (`:457-473`; tests `:663-677`, `:690-714`). A parameter named twice is rejected at its second occurrence (`:492-501`; `:716-722`), and a parameter named like a unit that any annotation of the same head uses is rejected at that unit (`:502-517`; `:473-488`, `:724-733`), while shadowing a unit the head does not name is silent (`f(t) = t s`, `f(m: km) = m` parse).
- **Annotations** are unit expressions: a unit name, products, quotients and powers of them (the base checked, the exponent being a literal), parentheses, and the number `1` by its text, so `1.0` is a scale (`:328-351`, `:353-359`; tests `:440-471`); a sum or difference, a negation or a call is `annotationNotUnits`, any other number `annotationScale`.
- **Inverses.** `~name(parameter)`, exactly one parameter, with an annotation on it rejected as `inverseAnnotation` (`:530-552`; tests `:426-438`, `:490-496`, `:679-688`).
- **Conditions.** Two or more terms joined by `<`, `<=`, `>`, `>=`, `≤`, `≥`, with `<=` and `>=` read before `<` and `>`, `≤` and `≥` read as `<=` and `>=` and the text kept as written (`:385-416`; tests `:535-558`, `:593-601`); a chain whose comparisons do not all point one way is `mixedComparison` at the whole chain (`:402-406`; `:580-591`); a term ends at a comparison, a comma outside parentheses or `=`, and `|` comes once (tests `:603-628`).
- **Spans** are offsets into the whole text; a definition's span runs from its name to the end of its body, excluding indentation, comment and line ending (tests `:330-352`).
- **The property test** (`src/core/definitions.test.ts:738-986`) draws 400 heads from the seeded source (`key(71)`, `:864-866`): function or inverse, names in several scripts, none to three parameters (one for an inverse), each annotated or bare, the result annotated or bare, none to two conditions, blanks wherever the grammar allows, a comment or none; each parses to what it was built from, with the spans of the body and of every condition checked against the text (`:868-916`). Into each it injects a mixed chain, a scale in an annotation, a repeated parameter, an annotation on an inverse's parameter and `[D]` after the name, each rejected where written (`:918-986`). The hand-written rejections it does not draw are `annotationNotUnits` and `parameterNamesUnit` (`:455-488`).

Both suites named by the plan pass as read: `node --test src/core/definitions.test.ts src/units.test.ts` reports 75 tests, none failing.

### The build-error table

No message is worded for any definitions or build error: `src/messages.ts` handles `TextError` and `ConversionError` only (`:64-151`, `:452-512`); its `describeRejection` covers the expression's literal rejections (`:316-328`) and nothing of `DefinitionRejection`; `BuildError` is consumed only by `src/system-build.ts` and `src/system-table.ts`. So the table below is of causes, not messages, and the user-facing version in "Proposed edits" names no error kind (§12, question 6). The order is the build's: the whole file is parsed first (`parseDefinitions`, `src/core/definitions.ts:234-238`), then `buildTable` indexes, checks the inverses, the ambiguity and the prefixed names, collects the primitives and walks the definitions in file order; the first failure ends the build (`src/core/build.ts:291-395`).

| Stage | Kind | Cause | What it carries or points at |
| --- | --- | --- | --- |
| parse | `unexpected` | a syntax error: no whitespace after a unit's or prefix's name; a name alone; a body on the next line; a line not starting with a name or `#`; a prefix body that is `!` or a list; a list ending in `;` or with an empty item; a function head without `=`, or a parameter that is not a name; an inverse with none or two parameters | the position and what was expected there (`src/core/definitions.test.ts:286-325`, `:663-688`) |
| parse | the expression's own rejections (`numberTooLarge`, `numberOverflow`, `numberUnderflow`, `exponentTooLarge`, `exponentDividesByZero`) | a literal in a body past the hard bound or the exponent bound (D1's territory) | the literal's span in the whole text (`src/core/definitions.test.ts:336-344`) |
| parse | `annotationScale` | a number other than `1` in an annotation | the number (`src/core/definitions.ts:336-339`) |
| parse | `annotationNotUnits` | a sum or difference, a negation or a call in an annotation | the offending node (`:340-349`) |
| parse | `inverseAnnotation` | an annotation on an inverse's parameter | the annotation (`:541-545`) |
| parse | `duplicateParameter` | a parameter named twice | its second occurrence (`:492-501`) |
| parse | `parameterNamesUnit` | a parameter named like a unit an annotation of the same head uses | the annotation's use of the name (`:502-517`) |
| parse | `mixedComparison` | a chain whose comparisons do not all point one way | the whole chain (`:402-406`) |
| parse | `unsupported` (`dimensionVariables`) | `[` directly after a function's name | the name and the `[` (`:600-608`) |
| index | `duplicate` | a second definition of a name in its namespace: units, primitives, lists, functions and the built-ins share one; prefixes have their own; inverses are keyed by their function's name | both definitions, or the built-in's name and the definition (`src/core/build.ts:417-431`) |
| inverses | `orphanInverse` | a `~` line whose function is not defined | the inverse (`:300-304`) |
| ambiguity | `ambiguousName` | a name readable as two prefix-unit pairs | the name and its two splits (`:305-308`; `src/core/names.ts:68-94`) |
| names | `prefixedName` | a list's, a function's or a built-in's name that reads as a prefix followed by a unit | the definition (or the built-in's name) and the split (`:309-329`) |
| walk | `unknownUnit`, `functionAsUnit`, `notAFunction` | a body, an item, an annotation or a condition names nothing, uses a function as a unit, or calls what is not a function | the name's span (`:902-911`, `:935-949`) |
| walk | `tooLarge`, `overflow`, `underflow` at a name | a prefix times a unit refused by the arithmetic | the name's span (`:917-933`) |
| walk | `circularDefinition` | definitions referring to one another in a circle, through bodies, calls or conditions | the definitions on the cycle, in order, and the reference that closed it (`:957-966`) |
| walk | `dimensionedPrefix` | a prefix whose body has a dimension or a kind | the definition and the dimension (`:485-497`; `src/core/dimension.ts:104-106`) |
| walk | `invalidUnitList` (`nonconformingUnit`, `nonpositiveUnit`, `unitOutOfOrder`) | a list whose units are not all of one dimension, not all certainly positive, or not decreasing | the definition and the list error with the index of the unit at fault (`:853-885`) |
| walk | `zeroDeclaredUnit` (`argument` or `result`) | an annotation whose value is zero or cannot be told from zero | the definition and the parameter (`:823-845`) |
| walk | `nonconformingComparison` | adjacent terms of a condition that do not conform | the definition, the condition, both terms and the mismatch (`:739-750`) |
| walk | `conditionWithoutParameter` | a condition that mentions no parameter, a mention inside a call's argument counting | the definition and the condition (`:754-763`, `:770-792`) |
| walk | `functionMismatch` | a function's body not conforming to its result's annotation, or an inverse's body not conforming to what its function's parameter takes | the definition and the mismatch (`:586-597`, `:670-681`) |
| walk | `inverseArity` | an inverse of a function of other than one parameter | the inverse and the function's parameter count (`:643-650`) |
| walk | `nonconformingOperands`, `arityMismatch`, `argumentMismatch`, `builtinArgument`, `tooLarge` | in a function's or inverse's body or conditions, taken over dimensions alone: a sum of non-conforming operands, a call of the wrong count, an argument of the wrong dimension to a defined function or a built-in, or a `^` exponent that cannot be formed within the significand limit | the evaluator's own spans (`src/core/dimension-of.ts:107-124`, `:140-149`, `:162-215`) |
| walk | any `EvaluateError` | in a body the build evaluates (a unit's, a prefix's, a list's item or an annotation): the same, plus the arithmetic's failures (a division by zero, an even root of a negative, a refusal, a value at an edge, a built-in's domain, a call's condition certainly failing, a body failing) | as the evaluator locates it (`src/core/build.ts:800-809`) |
| walk | `undecidedCondition` (no inner error) | a call in such a body whose condition is undecided at the ceiling | the body's span and the assumption (`:810-815`) |

Checked on the harness from a scratch file outside the tree, appending one definition at a time to the system file: every kind in the table was produced by the cause named, including `f(x) = sin(x)` (`builtinArgument`, a kind mismatch against the radian), `weird- 2 radian` (`dimensionedPrefix`), an annotation `approx(1e-50 m) - approx(1e-50 m)` (`zeroDeclaredUnit`), `cold tempC(approx(-273.15))` (`undecidedCondition`), `f(x) | f(x) > 0 = x` (`circularDefinition`), `sqrt(x) = x` (`duplicate` with the built-in first), and `x^(1e30000)` (`tooLarge` at build); `bad(x) = 1 / 0`, `big(x) = 1e30000 x`, `kilo2- 10^3` and a one-item list all build.

What the build does not check, confirmed: a function's body is never evaluated (`src/core/build.ts:561-567` takes its dimension only), so a body that fails at some or every value builds; a literal in a body is not held to the significand limit (`src/core/dimension-of.ts:26-30`), though the hard bound still applies at parse (`src/core/definitions.test.ts:336-344`); nothing checks a function's result against a range.

### The exactness and dimension interaction list

Exactness:

- The caller builds the table once at the ceiling in exact mode: `ceilingContext` sets the precision to the ceiling and forces exact mode (`src/core/context.ts:235-241`), and `buildTable` evaluates every unit's and prefix's body, every list item and every annotation under the context it is given (`src/core/build.ts:477-491`, `:831`, `:861`; `src/units.test.ts:72-78`). Q11 agrees.
- A function's body is not evaluated at build; a call evaluates it afresh through the table's lookup at the pass's working precision (`src/core/evaluate.ts:763-770`; `src/core/table.ts:20-30`), so a function of no parameters names a computed constant without fixing it in the table (`devdocs/functions.md:64-72`, confirmed).
- A condition of a call made inside an evaluated body is decided at the ceiling, and one left undecided fails the build, since no later pass could decide it and a unit has nowhere to carry the warning (`src/core/build.ts:794-816`; `docs/definitions.md:277-279` confirmed).
- An annotation must be certainly nonzero: `containsZero` on the ball (`src/core/build.ts:833-838`). A list's units must be certainly positive and decreasing at the ceiling (`src/core/build.ts:865-883`; the message for a typed list says "or cannot be told from zero", `src/messages.ts:530-531`).
- A `^` exponent in a body is reduced within the significand limit at build and one that cannot be formed fails the build; a literal is not held to the limit (`src/core/dimension-of.ts:140-149`, `:26-30`).
- At a call, conditions are decided on balls in three-valued logic (`src/core/evaluate.ts:1050-1093`, the verdict table, agreeing with N14: a strict comparison at a touching bound is undecided, a non-strict one holds), with the terms computed at the operand context (`:979-982`); a certain failure ends the check at once, and a guard that certainly fails keeps a later term from being evaluated (`:1016`; `docs/definitions.md:255-257` confirmed on the harness: `guard(-1)` fails `x > 0` and never reaches `ln`). A term that fails to evaluate after an undecided comparison leaves its condition undecided rather than failing the call (`:1023-1027`), which is A6's section to state.
- In decimal mode each step of a body is one rounded step (`devdocs/functions.md:518-520`); on the harness `em(x) = (exp(x) - 1) / x` at `1e-30` is `≈ 1` in exact mode and `0` in decimal mode at eight digits, the pattern `docs/definitions.md:326-329` describes.
- Q10 (which unit factors are exact) is D3's and A9's; not checked here.

Dimensions:

- A function's result dimension is inferred from the body with each parameter bound to its annotation's dimension, a plain number without one, and checked against the result's annotation (`src/core/build.ts:555-598`; `:609-617` for `PLAIN`).
- Adjacent terms of a condition must conform, and each condition must mention a parameter (`src/core/build.ts:739-763`).
- An inverse's parameter is bound to the function's result dimension; its body must conform to what the function's parameter takes (`src/core/build.ts:651-681`).
- A prefix's body must have neither dimension nor kind: `isDimensionless` is an empty exponent vector (`src/core/dimension.ts:104-106`), and kinds ride in that vector (Q2); `weird- 2 radian` is rejected.
- An annotation is a dimension check and changes no value (`src/core/evaluate.ts:701-717`; `src/core/dimension-of.ts:197-213`); a unit of any magnitude is accepted, `: percent` included, and the magnitude matters only for writing a recovered argument (`src/core/table.ts:20-24`; confirmed: `2 ft` into a `dozn(n: in)` is `dozn(2 in)`).
- A built-in's dimension rule applies at build to a body or condition: `f(x) = sin(x)` fails to build, since `x` is a plain number and `sin` takes an angle; `f(x: radian) = sin(x)` builds (`src/core/dimension-of.ts:185-195`). Neither corpus states this.
- A call in a body or condition is checked for its count and its arguments' dimensions at build (`src/core/dimension-of.ts:162-215`).
- A parameter shadows a unit by its exact name, and a prefixed name is always a unit, at build and at a call alike (`src/core/build.ts:694-707`; `src/core/evaluate.ts:1109-1115`); parameter annotations are evaluated among the units alone (`src/core/build.ts:542-549`).

### The gaps of §6.4

- **A line-level grammar for all six kinds:** confirmed. The docs give prose by example and the devdocs a block for heads only; the complete grammar is the parser's comment (`src/core/definitions.ts:19-32`). By §2.2.3 the interim is prose, verified above; the block is to be marked hand-maintained (proposed).
- **The build-time checks as a table:** confirmed; produced above and, for users, in "Proposed edits". Every kind the gap names exists, and `inverseAnnotation` is to be added to it.
- **How definitions interact with exactness:** confirmed; the list above.
- **How definitions interact with dimensions:** confirmed; the list above, with one fact new to both corpora (built-in rules at build).
- **Inverse conditions and what a conversion into a function checks:** refuted in part. `docs/definitions.md:259-261` already states that an inverse's conditions restrict what converts into its function, and `:300-303` that the function is reapplied and a mismatch refused (`src/messages.ts:466-472`, `:551-561`); the full sequence of checks is Q16's and belongs to `quantities.md` (§12, question 13).
- **The status of user definitions:** confirmed. `docs/definitions.md` nowhere says that only the system file is loaded today (no line of the page mentions user definitions or the issue); §12, question 12 asks the reference to say so.
- **`#What the file contains` as a catalogue:** D3's; not assessed.

New gaps:

- `inverseAnnotation` is named only in `devdocs/functions.md#Where it lives` (line 710); the sections that list the parser's rejections, `devdocs/functions.md#Definitions`, `#Annotations` and `devdocs/architecture.md#Definitions`, omit it.
- The order of the build's checks is stated nowhere in full, and the place of the inverse check is misdescribed in both devdocs pages (it runs right after indexing, before the ambiguity check, `src/core/build.ts:300-304`).
- That a built-in's dimension rule applies at build (`f(x) = sin(x)` fails to build) is stated nowhere.
- `docs/definitions.md` says of lists that the name "cannot also be a unit" (line 196) but not that functions and lists share one set of names with the units and the built-in functions, so that `sqrt(x) = …` is a duplicate; the devdocs say it (`devdocs/functions.md:99-101`).
- Line-level facts absent from the docs prose: indentation, a comment directly after a body, `\r\n`, no continuation lines, a one-item list being a unit, a prefix's body being an expression and never `!` or a list.
- The example `dozen(n: in) = 12 n` (`docs/definitions.md:282-284`; `devdocs/functions.md:32-33`, `:190`) names a unit the system file defines (`src/units.test.ts:745`, `1 dozen` is `12`); appended to the file it is a `duplicate`. The scratch checks had to rename it, as they did `g` (the gram) and `h` (the hour).

### Context claims met in these modules

- Q2: primitives and their roles come from the file, `!` and `!kind` (`src/core/definitions.ts:262-270`; `src/core/build.ts:397-406`).
- Q3: the same conformance check decides a call's argument against its annotation (`src/core/evaluate.ts:701-717`), adjacent terms of a condition (`src/core/build.ts:740`) and the body against the result's annotation (`src/core/build.ts:586-590`).
- Q5: an annotation checks a dimension and changes no value (`src/core/table.ts:20-30`; `src/core/dimension-of.ts:197-215`).
- Q9: an exact unit name wins, else one prefix and a unit, no stacking (`src/core/names.ts:45-59`); lists, functions and built-ins share the unit namespace and may not read as a prefixed unit (`src/core/build.ts:309-329`, `:417-431`); a call's name resolves among the functions and the built-ins exactly, so `ktempC(1)` is "Unknown function" (`src/core/table.ts:215-225`; `src/messages.ts:83-85`).
- Q11: built at the ceiling in exact mode (`src/core/context.ts:235-241`; `src/units.test.ts:72-78`).
- N14: the verdict table (`src/core/evaluate.ts:1059-1093`).
- N16: the comparators are the four orderings, with `≤` and `≥` as spellings (`src/core/definitions.ts:385-393`).

### Worked examples checked on the harness

`kinetic(2 kg, 3 m/s)` into `J` is exactly `9`; `bmi(100 lb, 4 ft)` with a blank want shows `30.515173 kg / m^2` as certified and into `lb/ft^2` exactly `6.25`; `tempC(approx(-273.15))` into `K` is a value around zero with exactly the warning `docs/definitions.md:269-271` quotes; `tempC(-300)`, `-5 K` into `tempC`, `kg(m/s)`, `tempC(1, 2)`, `tempC()`, `2 tempC`, `ktempC(1)`, a function without an inverse as the want, `recip(0)`, `tempC(1 m)` and `2 time` each give the error the pages describe, with `kg(m/s)` worded exactly as `devdocs/functions.md:480-481` quotes it; `kcond(0.1 + 0.2)` meets `x <= 0.3`; `ident(approx(1))` with `| x - x >= 0` is assumed with a warning; `tanhh(3e18)` written out is refused where `tanh(3e18)` is `≈ 1`; `boiling tempC(100)` builds and is `373.15 K`. The list examples of `docs/definitions.md:176-192` (`1 hr / 7 mi`, `3601 s`, `2.9999999999 ft`) depend on the rounding and display of terms in `convert.ts` and the outcome layer, which this unit's modules do not cover (Q15); the pipeline's raw terms agree with the first two.

## Proposed edits

### docs/definitions.md#The format

Complete proposed text for the body of the section (the heading stays), replacing lines 60-102. The table at its end replaces the summary sentence of lines 98-102; whether it gets a heading of its own is for the page skeleton of §7. It names causes, not messages, since none is worded today and no error kind may appear in the docs.

```
One definition per line: a name, whitespace, then a body, except that a
function is written `name(parameters) = body` and an inverse
`~name(parameter) = body`. `#` starts a comment that runs to the end of
the line, with or without a space before it, and blank lines are skipped.
A definition may be indented, and a body cannot continue onto the next
line.

    m         !                 # dimension primitive
    radian    !kind             # kind primitive
    kilo-     1000              # prefix (trailing dash)
    inch      2.54 cm           # unit, defined by an expression
    newton    kg m / s^2
    hertz     1 / s
    time      hr;min;s          # unit list (expressions separated by `;`)
    tempC(x) = x K + 273.15 K   # function
    ~tempC(y) = y / K - 273.15  # its inverse

A definition is one of six things:

- **A primitive**, with a body of `!`, is a unit that everything else is
  defined in terms of: the metre, the kilogram, the second and the other
  SI base units. A body of `!kind` declares a kind primitive instead: a
  marker that keeps apart quantities which would otherwise look alike. The
  radian is one, so that `rad/s` does not convert to `Hz` (a revolution
  per second is not a cycle per second) and `rpm` converts to `rad/s` but
  not to `Hz`.
- **A prefix**, written with a trailing dash (`kilo-`), has a body that is
  an expression whose value is a plain number; it cannot be `!` or a list.
- **A unit** has a body that is an expression over numbers, other units
  and calls.
- **A unit list** has a body of two or more expressions separated by `;`,
  the same thing that can be typed as the unit to convert to; Unit lists
  below describes both. A body of one expression defines a unit.
- **A function**, written with its parameters in parentheses (`tempC(x)`),
  then `=` and an expression in which each parameter stands for an
  argument; Functions below describes it.
- **An inverse**, written with a `~` before a function's name
  (`~tempC(y)`), gives back the argument that produces a value, which
  lets the function be the unit to convert to; it is optional.

Definitions may appear in any order; a unit may be defined by one that
comes later, and an inverse may come before its function. Units, lists
and functions share one set of names, and the built-in functions are in
it too; prefixes have a set of their own, which is how `m-` (milli) and
`m` (the metre) coexist. The file is checked when it is loaded, and the
first fault found rejects it:

| The file is rejected when | Example | What to write instead |
| --- | --- | --- |
| a unit's or prefix's name is not followed by whitespace | `inch2.54 cm` | `inch 2.54 cm` |
| a name has no body, or a body runs onto the next line | `inch` alone | the whole definition on one line |
| a prefix's body is `!` or a list | `kilo- !`, `k- 1000;100` | a body whose value is a plain number |
| a list ends in `;` or has an empty item | `time hr;min;` | two or more expressions separated by `;` |
| a function's head lacks `=`, or a parameter is not a name | `tempC(x)`, `f(2) = 2` | `name(parameters) = body` |
| an inverse has none or several parameters, or an annotated one | `~f() = 2`, `~f(y: K) = y` | exactly one parameter, bare: its unit is the function's result |
| an annotation has a number other than `1`, a sum or difference, a negation or a call | `f(x: 2)`, `f(x: 1000 m)`, `f(x): kg/2` | the scale in the body; `1` for a plain number |
| a parameter is named twice | `f(x, y, x)` | distinct names |
| a parameter is named like a unit an annotation on the same line uses | `kinetic(m: kg, v: m/s)` | another name for the parameter (`mass`); a unit the line's annotations do not name is fine (`f(t) = t s`) |
| a condition's comparisons do not all point one way | `\| 0 < x > 1` | a chain that bounds an interval, `0 < x < 1` |
| a function's name is directly followed by `[` | `hypot[D](a: D)` | reserved for later; no form of it is accepted today |
| a name is defined twice in its set, a built-in function's name included | `foo 1 m` and `foo(x) = x`; `sqrt(x) = x`; a second `~tempC` line | one definition per name |
| an inverse names no function | `~nothing(y) = y` | the function's own name after the `~` |
| a name could be read as two prefix-unit pairs | `dau` as `d` + `au` and `da` + `u` | one of the two units under another name (see Names) |
| a list's or a function's name reads as a prefix followed by a unit | `ms hr;min;s`, `ms(x) = x` | a name that is not a prefixed unit |
| a body, an item, an annotation or a condition names nothing, uses a function as a unit, or calls what is not a function | `foo 2 bar`, `foo 2 tempC`, `foo kg(2)` | a defined name; `tempC(…)` for a call; `kg (2)` for a product |
| definitions refer to one another in a circle, through bodies, calls or conditions | `a 2 b` with `b a / 2`; `f(x) \| f(x) > 0 = x` | a chain that ends in primitives |
| a prefix's body has a dimension or a kind | `weird- 2 m`, `weird- 2 radian` | a plain number |
| a list's units are not all of one dimension, not all certainly positive, or do not decrease | `in;ft`, `ft;12 in` | largest first, each smaller than the one before |
| a parameter's or the result's annotation is zero or cannot be told from zero | `f(x: zero)` with `zero 0 m` | a unit of nonzero size: a converted quantity is written as a count of it |
| the body's dimension does not fit the result's annotation | `f(x: kg): m = x` | a body of that dimension, or no result annotation; `: 1` asserts a plain number |
| an inverse's body does not give back what the function's parameter takes | `f(x: kg) = x` with `~f(y) = y / kg` | a body of the parameter's dimension |
| the sides of a condition are not of one dimension | `band(t: K) \| t > 0` | `0 K` |
| a condition mentions no parameter | `\| 1 > 0` | a bound on an argument |
| a body or a condition gives a function or a built-in an argument of the wrong dimension or count | `f(x) = sin(x)`, `f(x) = tempC(x, 2)` | `f(x: radian) = sin(x)`, or `sin(x radian)`; one argument per parameter |
| a body adds quantities that do not conform | `f(x: kg) = x + 1 m` | operands of one dimension |
| a `^` exponent in a body is too large a fraction to form | `f(x) = x^(1e30000)` | an exponent within the significand limit |
| a unit, a prefix, a list item or an annotation cannot be computed, or calls a function whose condition cannot be decided | `recip 1 / 0`; `cold tempC(approx(-273.15))` | a value the arithmetic gives; an argument the condition decides |

A function's body is not computed when the file is loaded, only checked
for the units it gives, so a body that fails at some value, or at every
value, loads and fails at the call that reaches it; Functions below says
what else is and is not checked. Today only this file is loaded;
definitions typed into the app are open
([#132](https://github.com/bsidhom/exucal/issues/132)).
```

### docs/definitions.md#Functions

Two pairs.

Old (lines 265-267): "An inexact value can straddle the bound, and then the condition cannot be decided: the calculator computes again at more digits, and if the doubt remains at the last pass, it shows the value anyway, marked `≈`, with a warning that names the condition it assumed:"

New: "An inexact value can straddle the bound, and then the condition is undecided: the calculator computes again at more digits, and if the doubt remains at the last pass, it shows the value anyway, marked `≈`, with a warning that names the condition it assumed:"

Old (lines 291-293): "An annotation names units only: `: 2` or `: 1000 m` would read as a scale that it does not apply, and is an error that says to write the scale in the body."

New: "An annotation names units only: `: 2` or `: 1000 m` would read as a scale that it does not apply, and is rejected; write the scale in the body."

### devdocs/functions.md#Definitions

Old (line 36): "The grammar of a function line:"

New: "The grammar of a function line, hand-maintained until the references' grammars are generated from the parser's own data; the whole line grammar, every kind of definition included, is the comment at the top of `src/core/definitions.ts`:"

Old (lines 87-90): "The inverse's parameter has `name`'s result dimension and takes no annotation, since that dimension is known, but may take conditions, which restrict the `have`s a conversion into the function accepts; its body must conform to `name`'s parameter."

New: "The inverse's parameter has `name`'s result dimension and takes no annotation, since that dimension is known (one written there is rejected where it stands, `inverseAnnotation`), but may take conditions, which restrict the `have`s a conversion into the function accepts; its body must conform to `name`'s parameter."

### devdocs/functions.md#Annotations

Old (lines 146-149): "but the alternatives below are worse, and the `want` is always there; showing a lone call's value in its annotated result unit by default is deferred ([#130][130])."

New: "but the alternatives below are worse, and the `want` is always there; showing a lone call's value in its annotated result unit by default is open ([#130](https://github.com/bsidhom/exucal/issues/130))."

Old (lines 173-177): "No message is worded for a definitions rejection today, since definitions cannot be typed ([#132][132]); the wording meant for this one is "An annotation names units and cannot scale. Write a scale in the body; for a plain number, write 1." Conformance ignores magnitude, so `: 2` could only be read two ways, and both bite:"

New: "No message is worded for a definitions rejection today: only the system file is loaded, and definitions typed into the app are open ([#132](https://github.com/bsidhom/exucal/issues/132)). Conformance ignores magnitude, so `: 2` could only be read two ways, and both bite:"

Old (lines 190-192): "An annotation must be nonzero (`zeroDeclaredUnit`), since a count of zero means nothing; with the restriction above, that can fail only for a unit defined as zero."

New: "An annotation must be nonzero, and certainly so: a value that is zero or cannot be told from zero is rejected (`zeroDeclaredUnit`), since a count of either means nothing; with the restriction above, that can fail only for a unit defined as zero or as an inexact value around it."

### devdocs/functions.md#Names and shadowing

Old (lines 230-239): the second bullet from "The rejection carries the parameter" to the end.

New:

```
- **A parameter named like a unit that the same head uses**
  (`parameterNamesUnit`, at the annotation's use of the name):
  `kinetic(m: kg, v: m/s) = m v^2 / 2`, where the head's `m` is the metre
  and the body's is the mass. The name resolves one way in each place,
  but the line reads both ways. The rejection carries the parameter and
  points at the annotation; no message is worded for it, as for every
  definitions rejection ("Annotations" above). It is an error rather than
  a warning because the build has no way to report a warning and nothing
  edits a definition yet; relaxing it later breaks no file, where
  tightening a silence would
  ([#131](https://github.com/bsidhom/exucal/issues/131)).
```

### devdocs/functions.md#Conditions

Old (lines 273-276): "- **There is no equality and no `!=`.** `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument. A body that cannot be computed at a point already fails there."

New: "- **The comparisons are the four orderings; `=` and `!=` are not among them.** `=` ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument: any design that adds equality operators or conditional expressions has to say what an undecidable comparison yields ([future.md](future.md), "Extensions that fit"). A body that cannot be computed at a point already fails there."

Old (lines 284-285): "with `x: K`, `| x > 0` is an error, whose message suggests `0 K`."

New: "with `x: K`, `| x > 0` is an error carrying both terms' spans and the mismatch; the fix is `0 K`."

### devdocs/functions.md#Calls

Old (lines 494-499), steps 3 and 4:

```
3. The arguments are evaluated, left to right, each once: a call is by
   value.
4. Each argument must conform to its parameter's annotation, or be a
   plain number without one; a failure is `argumentMismatch`, carrying
   the parameter and the count, so that the message names the parameter
   only where there is more than one.
```

New, with steps 5 and 6 renumbered 4 and 5:

```
3. The arguments are evaluated left to right, each once (a call is by
   value), and each is checked as soon as it is evaluated: it must
   conform to its parameter's annotation, or be a plain number without
   one; a failure is `argumentMismatch`, carrying the parameter and the
   count, so that the message names the parameter only where there is
   more than one, and it is reported before any later argument is
   evaluated.
```

### devdocs/functions.md#Build-time checks

Old (lines 604-618), the numbered list.

New:

```
1. Evaluating each parameter's annotation among the units; each must be
   nonzero, and certainly so, since an argument is written as a count of
   the parameter's.
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

Old (lines 636-638): "(The first version of the check evaluated each body at one of the declared unit, which the elementary functions made untenable.)"

New: delete.

### devdocs/architecture.md#Definitions

Old (lines 199-206): "A condition is a chain of expressions joined by comparisons that all point one way, kept with its text for the messages that quote it; a chain that turns, `0 < x > 1`, is rejected. The parser rejects an annotation with a number other than `1`, a sum, a negation or a call, and a parameter named like a unit its own head's annotations use, each where it is written; it reserves a `[` after a function's name, for dimension variables, and rejects it (`unsupported`)."

New: "A condition is a chain of expressions joined by comparisons that all point one way, kept with its text for the messages that quote it. The parser rejects, each where it is written: a chain that turns, `0 < x > 1`; an annotation with a number other than `1`, a sum or difference, a negation or a call; an annotation on an inverse's parameter; a parameter named twice, at its second occurrence; and a parameter named like a unit its own head's annotations use, at the annotation's use of the name. It reserves a `[` after a function's name, for dimension variables, and rejects it (`unsupported`)."

Old (lines 288-291): "A unit, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built, at the ceiling, and one left undecided fails the build, since a unit has nowhere to carry the warning."

New: "A unit, a prefix, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built, at the ceiling, and one left undecided fails the build, since a definition has nowhere to carry the warning."

Old (lines 316-323): "`build.ts` puts them together in a fixed order: index the definitions by name, rejecting a duplicate; check the index for an ambiguous name, and the names of the lists, the functions and the built-ins for one that reads as a prefixed unit; collect the primitives and their roles; then walk every definition in order, where a body is evaluated by `evaluate` against a lookup that resolves each name through the index and requests the definitions it means from the walker, with those primitives. The first failure ends the build."

New: "`build.ts` puts them together in a fixed order: index the definitions by name, rejecting a duplicate; check that every inverse names a defined function; check the index for an ambiguous name, and the names of the lists, the functions and the built-ins for one that reads as a prefixed unit; collect the primitives and their roles; then walk every definition in order, where a body is evaluated by `evaluate` against a lookup that resolves each name through the index and requests the definitions it means from the walker, with those primitives, a function is checked over dimensions, and a list or an inverse is checked in its place through the same lookup. The first failure ends the build."

Old (lines 325-345): the catalogue paragraph.

New:

```
A build error is one of, in the order the build looks: a duplicate name
(`duplicate`), carrying both definitions, or the built-in's name and the
definition that takes it; an inverse of no defined function
(`orphanInverse`); an ambiguous name with its two splits
(`ambiguousName`); a unit list, function or built-in whose name reads as
a prefix and a unit (`prefixedName`), carrying the definition (or the
built-in's name) and the split; and then, in definition order, whatever
the first faulty definition fails with: a lookup failure at its
reference (an unknown name, a function used as a unit, a call of what is
not a function, or a prefix times a unit refused as too large or too
small); a cycle (`circularDefinition`), carrying the definitions on it in
order and the span of the reference that closed it; a prefix whose body
is not a plain number (`dimensionedPrefix`), carrying the definition and
the dimension it has; a unit list whose units do not make a list
(`invalidUnitList`), carrying the definition and the list error with the
index of the unit at fault; a function whose parameter's or result's
annotation is zero, or cannot be told from zero (`zeroDeclaredUnit`),
since a recovered argument is written as a count of the parameter's; a
condition whose adjacent terms do not conform
(`nonconformingComparison`), carrying the definition, the condition and
both terms with the mismatch; a condition that mentions no parameter
(`conditionWithoutParameter`); a function whose body does not conform to
its result's annotation, or an inverse whose body does not conform to
what its function's parameter takes (`functionMismatch`), carrying the
definition and the mismatch; an inverse of a function of other than one
parameter (`inverseArity`), carrying the count; in a function's or an
inverse's body or conditions, taken over dimensions alone, a sum whose
operands do not conform, a call of the wrong count, an argument of the
wrong dimension to a defined function or to a built-in, or a `^`
exponent that cannot be formed within the significand limit, each the
evaluator's own error located as it locates it; and, in a body the build
evaluates (a unit's, a prefix's, a list's item or an annotation), any
failure of the evaluator, located as it locates it, with a call's
condition left undecided at the ceiling coming back as an
`undecidedCondition` that carries no inner error. Every span is an offset
into the whole definitions text, and a definition's span covers its text
from name to body, so each error points at something the user can see.
No message is worded for a build error today, only the system file being
loaded ([functions.md](functions.md), "Annotations").
```

## Terminology

| Term met | Where | Section 8 | Proposed |
| --- | --- | --- | --- |
| "dimensionless marker", "kind primitive (dimensionless)" | `docs/definitions.md:66`, `:80-82`; the same example block in `src/core/definitions.ts:11` | conflicts: dimensionless is reserved for a plain scalar, a kind is never called dimensionless (§12, question 20) | **kind**, "a kind primitive"; the gloss "a marker that keeps apart quantities which would otherwise look alike" |
| "the unit to convert to", "the quantity to convert" | throughout `docs/definitions.md#The format`, `#Unit lists`, `#Functions` | covered: **have** and **want**, introduced once in getting started | adopt once the guide introduces them; the proposed texts above keep the page's current phrasing so that the change is made in one pass |
| "cannot be decided" (of a condition) | `docs/definitions.md:266`, `:275`, `:278` | covered: docs say **undecided** for conditions | name "undecided" once (proposed above) and keep the plain phrasing after it |
| "when the file is loaded", "fails to load" (docs) against "build", "build error", "fails the build" (devdocs, `buildTable`) | `docs/definitions.md:125`, `:203`, `:278`, `:296`; both devdocs sections | not covered | **loaded** in docs (the user's view: the file is read when the app starts), **build** in devdocs, mapped once in `devdocs/architecture.md#Definitions` |
| "head" (the part of a function or inverse line before `=`) | `devdocs/functions.md#Definitions`, `#Names and shadowing`; `src/core/definitions.ts` | not covered | devdocs-only, glossed once at its first use |
| "user-defined function" (the page title), "defined function" (`table.ts`, `evaluate.ts`), "a function the file defines" (docs) against "built-in" | both corpora | not covered (C40 calls the concept "User-defined functions") | **defined function**, one the definitions file defines, system or user, against **built-in**; "user-defined" only for definitions a user types, which do not exist yet; the page title is a V unit's to settle |
| "base unit" | `docs/definitions.md:78` | covered: only when quoting the SI | the sentence quotes the SI base units; keep, as proposed above |
| "interval" for a temperature difference | `src/units.test.ts:289`, `:463-465` (test names and comments) | conflicts: **temperature difference** (§12, question 19) | a code change, outside this unit; noted below |
| "the unit it takes" | `docs/definitions.md:282`; `devdocs/functions.md:643` | covered: **annotation**, with this as its gloss | keep as the gloss |

## Questions for the owner

1. The example `dozen(n: in) = 12 n` with `~dozen(len) = len / 12` (`docs/definitions.md:282-284`; `devdocs/functions.md:32-33`, `:190`) names a unit the system file defines, so it cannot be added to the file as written. Proposed: rename the example to a name the file does not define, keeping its shape.
2. Issues 130 to 133 are each linked from two or more places (`devdocs/functions.md:149`, `:175`, `:238`, `:754-763`; `devdocs/future.md:166-175`; `devdocs/cost.md:155`), against §12, question 26. Proposed owners: #130 `devdocs/functions.md#Annotations`, #131 `#Names and shadowing`, #132 `docs/definitions.md#The format` (the user statement) with `devdocs/future.md#Extensions that fit` keeping the intent without a second link, #133 `devdocs/functions.md#Deferred`; the other occurrences become plain mentions. The pages other than this unit's are theirs to change.
3. `devdocs/architecture.md:174-176` says `docs/definitions.md` describes "how to add to it", echoing `docs/definitions.md:5-6`; §5 (C50) places "Adding a unit" in `devdocs/development.md`. Proposed: the architecture sentence points at the docs page for the format and names and at `development.md#Adding a unit` for adding; D3 or the owner of `docs/definitions.md#(top)` settles the top.
4. The code comments at `src/core/build.ts:50-53` ("where the first version of the check, which evaluated the body at one of the declared unit, refused it") and `src/core/dimension-of.ts:3-4` ("in place of evaluating them at one of the declared unit") carry the history the plan drops from `devdocs/functions.md#Build-time checks`; the style guide applies the same rule to comments. Proposed: drop the clauses in a code change outside this audit.
5. `src/units.test.ts:289` and `:463-465` call the temperature differences "intervals" in a test name and comments, against §12, question 19. Proposed: a code change to "temperature difference", recorded with A2's note-wording change.
6. `docs/definitions.md#Unit lists`, lines 176-192, describes conversion into a list (counts, the remainder, zero terms, the rounding carry), which rests on `convert.ts`, `pipeline.ts` and the outcome layer rather than on this unit's modules (Q15). Proposed: the unit that owns Q15 verifies those lines; this unit verified only the definition side of lists (lines 194-204).
7. On the harness, a condition term that fails to evaluate after an undecided comparison leaves its condition undecided and assumed rather than failing the call (`src/core/evaluate.ts:1023-1027`; `gd0(x) | x > 0, ln(x) > -1` on a value around zero warns on both conditions). Proposed: A6 confirms that `devdocs/functions.md#The check at a call` states it.

## Notes on this run

The plan's section pointers overlap neighbouring units more than its module list allows for: `#Conditions` is one heading whose subsections belong to A6, `#Names` rests on `names.ts` and the `NAME` regex of `expr.ts` (A9's and D1's), `#Calls` describes `evaluate.ts` step by step although §2.2.4 lists that module and the D2 entry does not, and most of `#Unit lists` is conversion semantics that none of this unit's modules decide; the "Also read" list above is the cost of that, and a next revision of the entry could list `evaluate.ts` (the call case, `checkConditions`, `evaluateBound`) and `names.ts` outright. The harder judgment was the build-error table: since no message is worded for any definitions or build error, it cannot be a message table, so the user-facing version names causes and fixes and the developer version the kinds, and both had to be checked by building files, where the system file's short names (`g`, `h`, `dozen`) collide with natural example names and `convertText` runs the whole retry schedule itself. The next unit on these pages should know that the parser's grammar comment is the only complete grammar of the language, that `inverseAnnotation` is the one rejection the pages' lists miss, and that a built-in's dimension rule applying at build (`f(x) = sin(x)` does not build) is in neither corpus.
