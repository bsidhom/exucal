# Unit D1: Expression language (fable)

- Plan revision: 98b7531
- Date: 2026-10-09
- Model: claude-fable-5-1 (configured and served, as the session reports it)
- Doc sections read: `docs/definitions.md#Expressions`, `#Names` (and `#(top)` for its §9.4 row); `devdocs/architecture.md#Expressions`, `#Parsing`, `#Evaluation`
- Modules read: `src/core/expr.ts`, `src/core/parser.ts`, `src/core/print.ts`, `src/core/evaluate.ts`, `src/messages.ts`, `src/testing/expr.ts`
- Also read: `src/core/pipeline.ts` (the reading of the `want`), `src/core/table.ts` (`unitLookup`, `resolveFunction`, `arityOf`), `src/core/names.ts` (`resolveName`, `findAmbiguity`), `src/core/span.ts`, `src/core/print.test.ts` (the property test and the canonical-form cases), `src/core/scaled.ts` (`MAX_EXPONENT`, `formable`, `parseDecimal` only); by grep only: `src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`), `src/settings.ts` (the setting's maximum), `src/outcome.ts` (the blank `want`), `src/core/dimension.ts` (`formatDimension`, `dimensionExpr` exist), `src/unit-converter.ts` (`×` on screen), `src/units.txt` (the names the Names section cites, the lists, the two micro signs). The suites `expr`, `print`, `parser`, `messages`, `evaluate` and `pipeline` were run (227 tests pass), and a scratch script outside the tree ran `parseExpr`, `parseUnitList`, `evaluateText`, `convertText` and the message wording over the cases cited below, against the system table at the default context. Nothing in the tree was changed.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 17 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 2 / 2 / 0 |
| Gaps confirmed / refuted / new | 8 / 0 / 5 |
| Proposed edits | 7 |
| Questions for the owner | 6 |

## Claims

No claims are assigned to D1 (10.b: §1 is read-only context). The rows below are the §1 claims the unit's context cites (A1, A5, A7 and §2.1.2), each checked only in the part that D1's modules and runs reach; the part is named in the last column, and no claim is rewritten.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N1 | confirmed | `src/core/expr.ts:286-315` (`decimal` reads a literal through `parseDecimal`, `UNSIGNED` is the shape it accepts); `src/core/scaled.ts:730-753` (`parseDecimal`: the digits as the significand, times ten to the exponent less the fraction's length); runs: `0.1 + 0.2` is `= 0.3`, `1.5e-3` is `= 0.0015` | The "read exactly" part. The two bounds are N21's and N22's rows. |
| N14 | confirmed | `src/core/evaluate.ts:1050-1093` (`decide`, `VERDICTS`: `<` at `touchingBelow` is `undecided`, `<=` at `touchingBelow` is `holds` and at `touchingAbove` `undecided`, `at` decides every comparator) | The verdict table only; `orderOf` and the refused difference are in `ball.ts`, outside this unit. |
| N17 | confirmed | `src/core/evaluate.ts:505-523` (a literal is one step through `stepQuantity`), `:525-535` (a unit is one step); runs in decimal mode at twelve digits: `1/3` is `= 0.333333333333`, `surveyfoot` is `= 0.304800609601`, `2^70000` computes | The literal, unit and `=` parts. A literal past the significand limit is refused in decimal mode too (`evaluate.ts:510-519`, "in either mode"; a 20,000-digit literal is refused in both modes), so "rounded as read" holds within the limit; one line under Questions. |
| N21 | confirmed | `src/core/evaluate.ts:505-519` (a literal past the limit: `tooLarge`, `inexact: "exceeds"`, at the literal), `:606-623` (an unformable `^` exponent: `exceeds`, or the bound's refusal), `:434-446` (`withOperand` names the node's first operand for `approx`); `src/messages.ts:349-369`; runs: a 20,000-digit literal "would need a significand of … bits, past the significand limit, however it is computed"; `2^1e-30000` the same; `2^-30000` and `2^100000` offer `approx(2)` in place of `2`, or decimal mode | The literal and `^` parts, and the two reaches. |
| N22 | confirmed | `src/core/expr.ts:297-315` (`numberOverflow`, `numberUnderflow` from `parseDecimal`); `src/core/scaled.ts:165` (`MAX_EXPONENT` is `10n ** 18n`), `:187-197`; `src/messages.ts:321-324`, `:390-399`; runs: `1e1000000000000000001` is "this number's exponent passes 10^18", `1e-1000000000000000001` "falls below -10^18", `0.001e1000000000000000003` parses, `2^1e19` "is too large to compute: its exponent would pass 10^18" | The parse-time part and a power's refusal. |
| N24 | confirmed | `src/core/evaluate.ts:606-623` (`powerRefusal` chooses the bound or the limit for an exponent that cannot be formed); runs: `7^1e19` is overflow, `2.54^1e18` is `tooLarge` with `approx(2.54)` offered | As the claim's two examples say. |
| Q1 | confirmed | `src/core/expr.ts:443-470` (`exponent`: a signed decimal, or in parentheses a signed decimal over an unsigned one), `:147` (`Exponent` travels undivided); `src/core/evaluate.ts:1217-1251` (`reduceExponent` forms the fraction in lowest terms); runs: `m^x` and `m^(1/2 + 1)` are parse errors, `m^0.5` has dimension `m^(1/2)`, `(m^2)^(1/2)` is `m`, `m^(2/4)` is `m^(1/2)` | The "only a literal rational exponent" part and exact dimensions. |
| Q3 | confirmed | `src/core/evaluate.ts:548-572` (a sum's `nonconformingOperands` carries the `ConformanceError`, left as `have`, right as `want`), `:702-717` (`checkConformance` on a defined function's argument), `src/core/pipeline.ts:713-718` (the function `want`), `src/messages.ts:634-648` (one wording); runs: `1 m + 1 s` and `1 m` into `s` read alike, `1 rad + 1` is "differ in kind: radian" | The evaluator's and the function want's uses of the check. |
| Q4 | confirmed | `src/core/evaluate.ts:548-572`; runs: `1 m + 0` is "Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1"; `1 rad + 1` is a kind mismatch | |
| Q6 | confirmed | `src/core/evaluate.ts:574-583` (`mul` and `juxtapose` both `multiplyQuantities`), `:584-596` (`divideQuantities`), `:599-648` (`powQuantity` with the reduced exponent), `:649-664` (`negateQuantity`); runs: `kg (m/s)` is `m kg / s`, `1/12 year` is `1 / s`, `(-8)^(1/3)` is `= -2`, `(-4)^(1/2)` "takes an even root of a negative value" | |
| Q7 | confirmed | runs: `m^2 kg / s^3 A` names its dimension `m^2 kg / s^3 A`, `(m/s)^(1/2)` names `m^(1/2) / s^(1/2)`, `1 m + 0` names `1` for a plain number; `src/core/dimension.ts:196`, `:208` (`formatDimension`, `dimensionExpr`; grep only) | The written form; the formatter itself is A7's. |
| Q8 | confirmed | `src/messages.ts:169-176`; runs: `sin(1)` is ""1" is a plain number, but "sin" takes an angle; write "sin(1 radian)"", `sin(30 deg)` is `≈ 0.5`, `asin(0.5)` has the dimension `radian`, `asin(0.5) / radian` is a number | `sin` and `asin` only; the hyperbolic and `atan2` parts not run. |
| Q9 | confirmed | `src/core/names.ts:45-59` (`resolveName`: an exact unit, else the one prefix-unit split, prefixes tried shortest first), `:68-94` (`findAmbiguity`); `src/core/table.ts:179-227` (`unitLookup`: a function's name used as a unit is `functionAsUnit`; a call's name is resolved exactly by `resolveFunction`, else `notAFunction` saying what the name is otherwise), `:234-243` (defined first, built-in second), `:9-12` (a list's name is not a unit); runs: `min` is `60 s`, `ha` is `10000 m^2`, `kkm`, `inches` and `m2` are "Unknown unit", `ktempC(1)` is "Unknown function "ktempC"", `tempC` and `2 tempC` are ""tempC" is a function, not a unit", `time` is "Unknown unit "time""; `src/units.txt:267-269`, `:309` carry `Da`, `amu` and `technicalatmosphere`, and `u` and `at` are absent (grep only) | |
| Q16 | confirmed | `src/core/pipeline.ts:713-718`; run: `1 m` into `tempC` is ""1 m" has dimension m, but "tempC" has dimension K" | The conformance step only. |
| Q17 | confirmed | `src/core/pipeline.ts:494-584` (`convertParsed`: one bare name that is a list, else one that is a function, else a unit expression, else a typed list), `src/core/expr.ts:257-264` (`parseUnitList`); runs: `time` is the list `1 hr + 0 min + 0 s`, `tempC` is `tempC(26.85 …)`, `1000 ft` is `= 5.28 × 1000 ft`, `tempC(0)` is a ratio, `ft;in` a typed list, `2 time` "Unknown unit", `2 tempC` the function-not-a-unit error | |
| Q18 | confirmed | `src/core/print.ts:1-29`, `src/core/print.test.ts:134-151` (print, parse back, same tree, same text, over 400 seeded trees), `:48-117` (the canonical forms) | The printer's part; the `×` join of a `want` with a magnitude is `src/outcome.ts`, V2's. |
| Q19 | confirmed | `src/core/evaluate.ts:565-572`, `src/messages.ts:109-117`; runs: `1 / 0` is "Division by zero in "0"", `1 / (2 - 2)` quotes `(2 - 2)`, `(sqrt(2)^2 - 2)^-1` quotes the base, `1 m + 1 s` is worded as the conversion `1 m` into `s` is | |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/definitions.md#(top)` (§9.4 row, confirmed: line 5) | "This section describes that file: what it contains, how to read it, and how to add to it." | update | "This page describes that file: what it contains, how to read it, and how to add to it." |
| `devdocs/architecture.md#Parsing` (§1.2.5 row, confirmed: the parenthetical closes the first bullet) | "(The call rule broke it once: a call and a name began alike, told apart only by a lookahead for `(`, so a nested call with an error in it cost `2^k` for `k` levels. A cut combinator, which commits an `alt` once a prefix has matched and would serve other grammars, was set aside for the fix: a committed failure skips every enclosing `alt`, `optional` and `many`, so a misplaced cut changes the meaning of valid input, where the local lookahead has no such failure mode.)" | keep as intent | "A call and a plain name begin alike and are told apart by whether `(` follows the name. The plain name's lookahead includes the name's own continuation characters, so that a call whose argument list fails is not read again as a shorter name before a parenthesized factor, which would double the cost at each level of nesting (`plainName` in `expr.ts`). The alternative, a cut combinator that commits an `alt` once a prefix has matched, is ruled out: a committed failure skips every enclosing `alt`, `optional` and `many`, so a misplaced cut changes the meaning of valid input, where the local lookahead has no such failure mode." |
| `devdocs/architecture.md#Expressions` (found: the juxtaposition paragraph) | "In the tree it is an ordinary multiplication, indistinguishable from `*`." | update | "In the tree it is its own operator, `juxtapose`, so that `2 m` is written back as it was read and not as `2 * m`; the evaluator treats it exactly as `*`." (Contradicted by `src/core/expr.ts:131-136`, `:222` and `src/core/print.ts:48-49`, and by the section's own last paragraph; `src/core/evaluate.ts:574-583` evaluates the two alike.) |
| `devdocs/architecture.md#Expressions` (found: the exponent paragraph) | "The parser has no context, and a reduction there took seconds on long literals and minutes at the hard bound, on every keystroke." | keep as intent | "The parser has no context, so a reduction there would run a gcd at the hard bound on every keystroke; the evaluator reduces the exponent under the significand limit in force instead (`reduceExponent`)." |

## Findings

**The precedence and the prose against the code.** The grammar's levels are the six of `LEVELS`, loosest first: `sum` (`+`, `-`), `quotient` (`*`, `/`), `signed` (one leading `-`), `product` (juxtaposition), `power` (`^`), `atom` (`src/core/expr.ts:192-199`, `:214-223`); the two symbol levels are `chainl1` over the table (`:503-508`), juxtaposition is `many(unitPower)` after a `power` so that a number can only lead (`:486-492`, `:429-435`), the negation is one `-` before a product (`:495-501`), and `^` takes one exponent per base (`:472-487`). Every grouping example in `docs/definitions.md#Expressions` and `devdocs/architecture.md#Expressions` parses as the pages say (the trees were printed by the scratch run: `kg m / s^2`, `m/s*s`, `1 ft + 3 in`, `2 m * 3 + 1 m`, `5 ft - 2 in + 1 in`, `-2 m / s`, `-2^2`, `(-2)^2`, `2 * -3`, `2 -3`, `2-3`, `2e-3`, `m^-1`, `m^2-1`, `1/12 year`, `1 m + 1/2 m`, `-tempC(100)`, `2 tempC(100)`, `tempC(100)^2`, `kg(m/s)`, `kg (m/s)`), and `--2`, `+2`, `m 2`, `2 3 m`, `1 2 3` are the errors they are said to be. The printer writes from the same table (`src/core/print.ts:92-108`) with its three positional rules (`:14-23`: a negation's operand at the product, a power's base at the atom, a number that would follow a factor parenthesized), and the property test closes the loop over every node kind (`src/core/print.test.ts:134-151`). The tree has the six node kinds the page lists (`src/core/expr.ts:149-167`); a composite node's span runs from its first part to its last and a parenthesized expression's includes the parentheses (`:91-94`, `:382-385`), which is why `1 / (2 - 2)` quotes `(2 - 2)`.

**The §6.3 gaps.**

1. *A formal grammar and a precedence table.* Confirmed: neither page has a table. The precedence table is proposed below, derived from `LEVELS` and the rules above, with no hand-written EBNF (§2.1.3). Note that `src/core/expr.ts:6-19` carries an EBNF-style sketch of the grammar as a code comment; it is the seed of the generated grammar, not a document, and the table below was derived from the parser, not from it.
2. *The `want` field's own grammar.* Confirmed: the four readings are stated nowhere in `docs/`. From `src/core/pipeline.ts:9-17`, `:494-584` and the runs: one bare name that is a defined list means the list; one bare name that is a function means the function; any other single expression is a unit expression, with a magnitude allowed (`1000 ft`) and a call (`tempC(0)`) being an ordinary expression; two or more `;`-separated expressions are a typed list, each item an expression (`ft;in/8`), an empty item an error (`ft;in;`, `;ft`), and `;` never inside parentheses. A blank `want` is handled before the pipeline (`src/outcome.ts:246-247`, grep only) and answers in the primitives. A list's or a function's name is a unit nowhere else: `2 time` is "Unknown unit "time"", and `2 tempC` is ""tempC" is a function, not a unit" (the header of `pipeline.ts` calls the latter an unknown unit; the code and the run say `functionAsUnit`). Proposed text below.
3. *Literal limits.* Confirmed: `docs/definitions.md#Expressions` names no limit. At parse: a significand of more digits than the hard bound holds (`MAX_SIGNIFICAND_LIMIT_BITS`, `src/core/rational.ts:115`, which is also the largest value the significand limit setting takes, `src/settings.ts:473`, grep only) is `numberTooLarge`, an exponent past `±10^18` is `numberOverflow` or `numberUnderflow` (`src/core/expr.ts:297-315`, `src/core/scaled.ts:730-753`), a `^` literal that cannot be formed within the hard bound is `exponentTooLarge` (`:322-331`, `formable` at `src/core/scaled.ts:249-258`), and a zero divisor is `exponentDividesByZero` (`:450-463`); each is final and points at the literal (`src/core/parser.ts:194-215`). At evaluation: a literal's significand is held to the limit in force, in both modes, and refused with the reach `exceeds`, so the message offers nothing (`src/core/evaluate.ts:505-519`); a `^` exponent is reduced and formed within the limit (`:1217-1251`), refused at the bound when the power would pass it and otherwise at the limit (`:606-623`). Runs: `m^1e999999999` is rejected at parse and `m^300000` parses; `m^1e300000` parses and is refused at evaluation "however it is computed"; `2^1e300000` is overflow.
4. *Name resolution order in full.* Confirmed as thin: `docs/definitions.md#Names` has the exact-then-prefix rule, no stacking, the separate namespaces and "prefixes apply to units alone", and lacks the parameter-before-unit rule (`src/core/evaluate.ts:1109-1115`, a bound name is resolved before any unit or prefix), the defined-before-built-in order of a call's name (`src/core/table.ts:234-243`; the builder keeps the two namespaces disjoint, `:31-34`, so a user never sees the order), that a function's or a list's name used as a unit is its own error (`:184-192`, `:9-12`), and that the prefix tried is the shortest that fits, there being only one split once the file passes `findAmbiguity` (`src/core/names.ts:11-23`, `:52-57`). Proposed edits below.
5. *Evaluation order and which operand an error points at.* Confirmed: absent from `docs/`; `devdocs/architecture.md#Evaluation` states it and the code agrees (`src/core/evaluate.ts:537-546` left to right, first failure ends; `:584-596` a divisor at fault, the whole quotient at a limit; `:633-647` a base that straddles zero, else the whole power; `:565-572` the whole sum with both operands' spans; `:707-717` the whole call with the argument's span; `:505-519` the literal). Runs: `bogus / 0`, `1 / 0`, `1 / (2 - 2)`, `0^-1`, `(sqrt(2)^2 - 2)^-1`, `(1 m + 1 s)`, `tempC(1, 2)`, `2^100000`.
6. *Whitespace and what `×`, `≤`, `≥`, `#` do in the fields.* Confirmed and answered. Whitespace is spaces and tabs (`src/core/expr.ts:275`), allowed before and after the text (`:244-264`) and between any two tokens (`m ^ 2`, `f( 1 , 2 )`, `( 1 )` parse), never inside a number or a name, and never between a call's name and its `(` (`f (1)` and `tempC (1)` are products); a newline is not whitespace. The grammar's only symbols are `+ - * / ^ ( ) ,` and, in the `want`, `;` (`:282-290`, `:443-470`, `:518-529`); `NAME` is a letter or underscore then letters, ASCII digits and underscores (`:290`). So `×`, `÷`, `·`, `²`, `≤`, `≥`, `=`, `<`, `>`, `#`, `[`, `|`, `~`, `:` and an en dash are each "Unexpected "×": expected …" wherever they appear (the scratch run tried each), and nothing in `src/` rewrites them before parsing (grep for `×` finds only the printer's screen glyph and comments). `≤`, `≥`, `=`, `|`, `~`, `:` and `#` belong to the definition language's heads, conditions and comments and mean nothing in the fields; `[` is reserved there too (§2.1.1) and is simply unexpected here. The owner's decision (§12, question 11) stands: no rendering character is accepted today.
7. *The printed form.* Confirmed: `docs/` has only the copy sentence in `docs/README.md`. The canonical text is one space between juxtaposed factors and around the other operators, `^` tight, a call's arguments joined by `, `, a quotient of two literals (the first perhaps negated) tight as a fraction, literals and exponents as typed (`m^(2/4)` is written back as `m^(2/4)`, reduced only at evaluation), and the fewest parentheses that read the tree back (`src/core/print.ts:1-29`, `:165-175`; `src/core/print.test.ts:48-94`); the screen shows `×` for a product written with `*` and the copy text `*` (`src/core/print.ts:48-49`, `src/unit-converter.ts:283` and `src/outcome.ts:156-158`, grep only). Proposed text below, for the section C5 names "How the app writes expressions".
8. *Parse errors and how they read.* Confirmed, and to be filled by the generated catalogue (§12, question 6), so the proposed text says only how an error reads in general. An unmatched text is "Unexpected end of input: expected …" or "Unexpected "c": expected …", the expectations being the labels of the primitives tried furthest, in the order tried (`src/core/parser.ts:379-386`, `src/messages.ts:71-76`); a rejected literal is ""text": this number is too large to represent" or "…'s exponent passes 10^18" or "falls below -10^18", a `^` literal "the exponent divides by zero" (`src/messages.ts:316-328`). The page's example holds exactly: `3 m ^` is "Unexpected end of input: expected a number or "("". After an operand the list reads `"^", a unit name, "(", "*", "/", "+", "-" or end of input`, and the label "a unit name" also stands for a function's name (`src/core/expr.ts:342-349`, `:408-422`); see Terminology.

**New gaps (added).**

1. `^` takes one exponent per base and does not chain: `m^2^3` is a parse error (write `m^6` or `(m^2)^3`); the exponent's forms are stated nowhere in `docs/`: a `+` sign is allowed (`m^+2`), the parenthesized denominator is unsigned (`m^(1/-2)` is an error), `m^(2)` is allowed, and the two rejections of 3 above.
2. A call may take no arguments (`pi()`), and a built-in may take a range: `round(1, 2, 3)` is ""round" takes 1 to 2 arguments, but "round(1, 2, 3)" gives 3 arguments" (`src/core/evaluate.ts:210`, `:668-679`, `src/messages.ts:651-654`); the docs page says "its own number of arguments".
3. Literal spellings the page does not list parse: `7.`, `1E3`, `1e+3` (`src/core/expr.ts:287`; `src/testing/expr.ts:14` draws `1E-2` and `7.`); and an exponent needs digits, so `2e` is `2 e`, two of the unit `e`, which the run evaluates to an electric charge. A pitfall worth one line.
4. A parenthesized expression's span includes its parentheses, so an error quotes it that way (`1 / (2 - 2)` quotes `(2 - 2)`); `devdocs/architecture.md#Parsing` says only that a composite spans from its first child to its last (`src/core/expr.ts:94`, `:382-385`).
5. In decimal mode a literal past the significand limit is refused, not rounded as read (`src/core/evaluate.ts:510-519`; the 20,000-digit run); the literal-limits text says "in both modes" and the decimal-mode page should say so (Questions, 5).

**The prose statements verified in the devdocs sections** (beyond the two stale ones): the combinators named in `#Parsing` all exist (`src/core/parser.ts:112-163`, `:168-343`); `alt` is ordered choice with local rewinding and a rejection ends it (`:264-284`); every reply carries the furthest expectation (`:71-76`, `:372-386`); `check` is the only source of `rejected` (`:194-215`); the `Rejection` kinds are the four named (`src/core/expr.ts:169-178`); `many` throws on an empty match (`src/core/parser.ts:296-321`); `regex` is sticky and `lazy` memoizes (`:136-148`, `:160-163`). In `#Evaluation`: `evaluate`'s signature (`src/core/evaluate.ts:400-406`, plus the optional collector of assumptions the page omits); arity before any argument (`:665-679`); a defined function's arguments checked and bound by position (`:690-719`, `:763-770`); a built-in's dimension rule and the location of its failures (`:799-884`); the lookup given the reference's span and the call's (`:200-207`, `src/core/table.ts:215-225`); `callFailed` wrapping only the evaluator's own failures (`:775-788`, `:1101-1125`); the `^`/`pow` disagreement and its examples (`2^(1e30/1e30)` is `= 2`, `2^1e-30000` refused, `pow(2, 1e-30000)` is `≈ 1`). "The precedence follows GNU units" is rationale and stays (Questions, 6).

## Proposed edits

### docs/definitions.md#(top)

Old: "This section describes that file: what it contains, how to read it, and how to add to it. The same expression language serves the definitions and what you type into the converter, so anything that can be typed can also be defined."

New: "This page describes that file: what it contains, how to read it, and how to add to it. The same expression language serves the definitions and what you type into the have and want fields, so anything that can be typed can also be defined."

### docs/definitions.md#Expressions

The complete replacement for the section. §7 moves it to the expression reference (`expressions.md`); the links name the foundation pages as §5 names them, `numbers.md` and `quantities.md`, and are to be pointed at the sections those pages get.

What you type in the have field, each item of the want field, and the body of a definition is one small expression language: numbers, unit names, products written side by side or with `*`, division, sums and differences, `^` with a written-out exponent, parentheses and function calls.

**How an expression groups.** From the loosest binding to the tightest:

| Binds | Written as | Groups | Example |
| --- | --- | --- | --- |
| loosest | `+` and `-` between two operands | left to right, at one level | `5 ft - 2 in + 1 in` is `(5 ft - 2 in) + 1 in` |
| next | `*` and `/` | left to right, at one level | `m/s*s` is `(m/s)*s` |
| next | one `-` before a product | once; there is no `+` | `-2 m / s` is `(-(2 m)) / s`; `--2` is an error |
| next | juxtaposition, a space or nothing (`2m`) | left to right; a number only as the first factor | `kg m / s^2` is `(kg m) / (s^2)`; `1/12 year` is `1 / (12 year)` |
| next | `^` with a written-out exponent | one exponent per base | `-2^2` is `-(2^2)`; `m^2^3` is an error |
| tightest | a number, a name, a call `f(...)`, parentheses | | `kg(m/s)` is a call; `kg (m/s)` is a product |

- **Numbers** are unsigned decimals with an optional exponent: `2`, `2.54`, `.5`, `7.`, `1e-3`, `1E3`, `1e+3`. They are read exactly, so `0.1 + 0.2` is exactly `0.3` and a unit defined by a decimal converts exactly ([numbers.md](numbers.md)). A sign is part of a number only in its exponent: `1e-3` is a thousandth, `1 - 3` is a difference, and `-2` is the negation of `2`. An exponent needs digits: `2e` is `2 e`, two of the unit `e`. A number of more digits than the largest significand limit allows, or whose exponent passes `10^18` either way, is rejected as it is typed, with a message that quotes it and says which; a number whose digits pass the significand limit in force is refused when it is evaluated, in both modes, and the message says it passes "however it is computed" ([numbers.md](numbers.md), the significand limit).
- **Names** are read as Names below describes: as long as they go, so `m2` is the name `m2` and `2m` is `2 m`.
- **Juxtaposition**, writing two factors side by side, multiplies: `2 m` is two metres and `kg m` is a kilogram-metre. A number may only be the first factor of a product, so `m 2` and `2 3 m` are errors; multiplying numbers is written `2 * 3`.
- **`*` and `/`** multiply and divide, at one level, left to right, and juxtaposition binds tighter than either: `kg m / s^2` is `(kg m) / (s^2)` and `m/s*s` is `(m/s)*s`.
- **`+` and `-`** add and subtract, at one level, left to right, binding loosest of all: `1 ft + 3 in` is fifteen inches, `2 m * 3 + 1 m` is `(2 m * 3) + (1 m)`, and `5 ft - 2 in + 1 in` is `((5 ft - 2 in) + 1 in)`. The two sides must conform, that is, be quantities of the same thing by the test that have and want must pass ([quantities.md](quantities.md)): `1 m + 1 s` is an error (a length and a time), and so are `1 rad + 1` (an angle and a plain number) and `1 m + 0`, since `0` is a plain number and not a length. A difference may be zero or negative.
- **`-` before a product** negates it: `-2 m` is minus two metres and `2 * -3` is minus six. It binds tighter than `*` and `/` and looser than juxtaposition and `^`, so `-2 m / s` is `(-(2 m)) / s` and `-2^2` is `-4`; write `(-2)^2` for `4`. It does not stack (`--2` is an error; write `-(-2)`), and there is no `+` in front of anything.
- **`^`** raises to a written-out exponent, never to an expression: a decimal with an optional sign (`m^2`, `s^-1`, `m^+2`, `m^0.5`), or in parentheses a decimal over an unsigned one (`m^(1/2)`, `m^(-3/2)`, `m^(2)`). `m^x`, `m^(1/2 + 1)` and `m^(1/-2)` are errors, as are a zero denominator (`m^(1/0)`) and an exponent too large to write as a fraction at all (`m^1e999999999`). The fraction is reduced when the expression is evaluated, so `m^(2/4)` is `m^(1/2)` and `(m^2)^(1/2)` is `m`, and its size counts against the significand limit then ([numbers.md](numbers.md), roots and powers). It binds tightest, so `m^2 - 1` is `(m^2) - 1`, and a base takes one exponent: `m^2^3` is an error; write `m^6` or `(m^2)^3`.
- **Parentheses** group.
- **A call**, a name directly followed by parentheses, applies a function to the expressions inside, separated by commas: `pi()`, `tempC(100)`, `atan2(3 m, 4 m)`; Functions below describes it. Each function takes a fixed count of arguments, or for some built-in functions a range (`round(x)` and `round(x, places)`), and a call with another count is an error that says how many. The space matters: `kg (m/s)` is a product, and `kg(m/s)` is a call of `kg`, which is not a function and says so; the other way round, `tempC (1)` is a product, and the error says that `tempC` is a function and shows the call form.
- **Spaces** may come before and after the text and between any two of its parts, around every operator and inside parentheses (`m ^ 2`, `f( 1 , 2 )`), but not inside a number or a name, and never between a function's name and its `(`. A tab counts as a space; a line break is not accepted.
- **Nothing else is accepted.** `×`, `÷`, `·`, a superscript such as `²`, `≤`, `≥`, `=`, `<`, `>`, `#`, `[`, `|`, `~` and `:` are errors wherever they stand, named with the character; write `*`, `/`, a space and `^2` in their place. The semicolon belongs to the want field alone (The want field below) and never inside parentheses, and the comma only between a call's arguments. The characters the definition language reserves for its own lines, `=`, `|`, `~`, `:`, `#` for a comment and the comparisons of a condition, mean nothing in the fields.

**How an error reads.** A text the grammar cannot read is an error at the first place it fails, naming what could have come there: `3 m ^` is "Unexpected end of input: expected a number or "("", and `m 2` is an error at the `2`, since a number can only begin a product. A number the grammar read but cannot hold is an error that quotes it and says why. A text that reads is evaluated left to right, and the first failure ends it, so `bogus / 0` reports the unknown unit and not the division. Each failure quotes the text at fault: a division by zero quotes the divisor, a sum that does not conform quotes both sides ("Cannot add "1 m" and "1 s": "1 m" has dimension m, but "1 s" has dimension s"), a call with the wrong count quotes the call, a refusal for size quotes the whole operation, and a parenthesized part is quoted with its parentheses.

**How the app writes expressions.** Every result is written back in this language, so that it can be typed in again: one space between juxtaposed factors and around `+`, `-`, `*` and `/`, `^` tight, a fraction of two numbers tight (`5000/127`, `-1/3`), a call's arguments separated by `, `, numbers and exponents as they were typed (`1e3` stays `1e3`, `m^(2/4)` stays `m^(2/4)`), and the fewest parentheses that keep the grouping (`(a + b) c`, `a / (b / c)`, `(m^2)^3`, `2 (3 m)`). On screen a product written with `*` shows as `×`; the copy button writes `*`, which the fields accept, where `×` is not accepted.

**Pitfalls.**

- A fraction before a unit: `1/12 year` is `1 / (12 year)`, a frequency, because the juxtaposition is read first. Write `year / 12` or `(1/12) year`. The same rule makes `1 m + 1/2 m` an error, `1 m` plus `1 / (2 m)`; write `1 m + m/2`.
- `-2^2` is `-4`; write `(-2)^2` for `4`.
- `2 -3` is a difference, `2e-3` is one number, and `2 * -3` is a product with a negation.
- `m2` is the name `m2`, not `m` squared; `2m` is `2 m`.
- `m 2` and `2 3 m` are errors: a number can only start a product, and numbers are multiplied with `*`.
- `kg(m/s)` is a call of `kg`, which is not a function; `kg (m/s)` is the product. `tempC (1)` is a product, and `tempC` is a function.
- `^` takes a written-out exponent, once: `m^x`, `m^(1/2 + 1)` and `m^2^3` are errors.
- `2e` is `2 e`, two of the unit `e`; an exponent needs digits.
- `1 m + 0` is an error: `0` is a plain number, not a length.
- `×`, `²`, `≤`, `#` and the other characters outside the grammar are errors; `;` only separates the items of the want field.

### docs/definitions.md#The want field (new section, after Expressions)

The have field holds one expression. The want field holds one or more expressions separated by `;`, and what it means depends on its shape:

- One bare name that is a unit list defined in the file (`time`, `ftin`): the list, and the answer is a sum over its units ([quantities.md](quantities.md), unit lists).
- One bare name that is a function (`tempC`): the function, and the answer is the call that gives the have ([quantities.md](quantities.md), conversion into a function); a function without an inverse says so.
- Any other single expression: a unit expression, and the answer is the ratio. It may carry a magnitude (`1000 ft`, so that a mile is `5.28 × 1000 ft`), and it may be a call (`tempC(0)`), which is an ordinary expression and not a conversion into the function.
- Two or more items (`ft;in`, `mi;km`, `ft;in/8`): a list typed out, each item an expression, held to what a defined list is held to: of the have's dimension, positive, and largest first. An empty item (`ft;in;`, `;ft`) is an error, and `;` cannot stand inside parentheses.
- Blank: the have in the primitives ([quantities.md](quantities.md)).

A list's or a function's name is a unit nowhere else: `2 time` is "Unknown unit "time"", and `tempC` or `2 tempC` in the have field says that `tempC` is a function, not a unit, and shows the call form.

### docs/definitions.md#Names

Three additions and one gloss, old → new.

Old: "A name means the unit of that name if there is one, and otherwise one prefix followed by a unit: `km` is `k` + `m` and `kilometre` is `kilo` + `metre`."

New: "A name means the unit of that name if there is one, and otherwise one prefix followed by a unit: `km` is `k` + `m` and `kilometre` is `kilo` + `metre`. There is only ever one way to split a name, as the end of this section explains, so the split is never a choice. Inside a function's body a parameter's name comes before any unit of that name (Functions below)."

Old: "Prefixes apply to units alone: the name of a function, defined in the file or built into the app, is looked up exactly, so `ktempC(1)` is a call of nothing, and a function's name may not itself read as a prefix followed by a unit (see Functions below)."

New: "Prefixes apply to units alone: the name of a function, defined in the file or built into the app, is looked up exactly, so `ktempC(1)` is "Unknown function "ktempC"", and a function's name may not itself read as a prefix followed by a unit (see Functions below). The file's functions and the built-in functions share one set of names, so no name is both. A function's name, or a unit list's, is not a unit: `tempC` in the have field says so and shows the call form, and `time` there is an unknown unit (The want field below says where the two names do mean something)."

### devdocs/architecture.md#Expressions

Two old → new pairs, the two stale passages above:

Old: "In the tree it is an ordinary multiplication, indistinguishable from `*`."

New: "In the tree it is its own operator, `juxtapose`, so that `2 m` is written back as it was read and not as `2 * m`; the evaluator treats it exactly as `*`."

Old: "The parser has no context, and a reduction there took seconds on long literals and minutes at the hard bound, on every keystroke."

New: "The parser has no context, so a reduction there would run a gcd at the hard bound on every keystroke; the evaluator reduces the exponent under the significand limit in force instead (`reduceExponent`)."

And the opening sentence's pointer, for V2 to carry when it pares the section (§12, question 24): "docs/definitions.md describes it from the user's side" becomes a link to the expression reference, `[expressions.md](../docs/expressions.md)`, once that page exists.

### devdocs/architecture.md#Parsing

Old: the parenthetical "(The call rule broke it once: … has no such failure mode.)" closing the first bullet.

New: the rewrite in the Stale passages table above, as the last two sentences of that bullet, following "…rather than with a recursive alternative."

Also, in "A parse error is therefore one of two things…": old "Spans are attached with `spanned` on the leaves, and a composite node spans from its first child to its last." New: "Spans are attached with `spanned` on the leaves, a composite node spans from its first child to its last, and a parenthesized expression's span includes the parentheses, so that an error quotes them."

### devdocs/architecture.md#Evaluation

Old: "`^` and `pow` disagree on such an exponent, which [#88][88] tracks ([numbers.md](numbers.md), "Roots and powers")."

New: "`^` and `pow` disagree on such an exponent ([numbers.md](numbers.md), "Roots and powers", which carries the open issue)."

With it, the definition `[88]: https://github.com/bsidhom/exucal/issues/88` at the page's end goes, being used nowhere else on the page (`[92]` stays for V2). The one place for the issue is a question below.

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "the converter" for where the text is typed | `docs/definitions.md#Expressions` (first sentence), `#(top)` | "the have and want fields" in docs (§8: **have** and **want**; "the converter" only for the two-field component; §12, question 2) |
| "quantities of the same thing" | `docs/definitions.md#Expressions > + and -` | **conform**, glossed once as "quantities of the same thing" and linked to `quantities.md` (§8) |
| "juxtaposition" without a gloss | `docs/definitions.md#Expressions` | keep, glossed once as "writing two factors side by side" (§8); the proposed text does so |
| "a unit name" as the parser's label for any name, a function's included (`expected a number, a unit name, "(" or "-"`) | `src/core/expr.ts:334-349`, `:418-422`; every parse error | **a name**; a code change to the labels (`src/core/expr.ts`), for the owner |
| "literal" (devdocs, code) against "number" (docs) for a decimal in the text | both | **number** in docs, **literal** in devdocs, mapped once in the expression reference ("a number written out, a literal in devdocs") |
| "the hard bound" | `devdocs/architecture.md#Expressions`, `#Parsing`; `src/core/rational.ts:115` | **hard bound** in devdocs; in docs no new term: it is "the largest significand limit the settings allow" (`src/settings.ts:473`), which C58 (`numbers.md`) can name once |
| "rejected" (a parse-time `check`) against "refused" (a size refusal) | `devdocs/architecture.md#Parsing`; `src/messages.ts:316-328` | in docs an oversized literal is **rejected** as typed (an error) and **refused** at evaluation (a refusal, §8); the proposed text keeps the two words apart |
| "dimensionless quantity" for a number | `devdocs/architecture.md#Evaluation`, `src/core/evaluate.ts:13` | consistent with §8 (a plain scalar); no change |

## Questions for the owner

1. **The one place for issue #88.** `devdocs/numbers.md#Roots and powers` links it beside #89 (grep only) and `devdocs/architecture.md#Evaluation` links it again. Proposed: `numbers.md` keeps the link and `#Evaluation` refers to that section without one, as the edit above does (§12, question 26); the generated `pow` entry inherits whatever the structured comment says.
2. **The label "a unit name".** The parser labels every name, a function's included, "a unit name", by design so that a call and a name are not listed apart (`src/core/expr.ts:342-349`), and after an operand the expectation list opens with `"^"`. Proposed: rename the label to "a name" in a code change of its own; the order is the order tried and can stay.
3. **Quoting a huge literal.** A refused literal is quoted in full, so a 20,000-digit literal yields a message of about as many characters (`src/messages.ts:78`, `:98-105`). Proposed: elide the middle of any quoted span past a fixed width, in `messages.ts`, a code change for the unit that owns messages (C51, §12, question 6).
4. **For V2 (`#Parsing`).** "An alternative fails after consuming input in two ways only" omits a parenthesized expression that fails inside (`(2 m`); it is the last alternative of its `alt` (`src/core/expr.ts:429-433`), so the cost argument holds. Proposed: name it as the third case, or say "the alternatives after one that fails after consuming input all fail at their first primitive".
5. **For A6 or whichever unit owns decimal mode (N17).** A literal past the significand limit is refused in decimal mode too (`src/core/evaluate.ts:510-519`); "rounded as read" holds within the limit. Proposed: one clause in the decimal-mode rules, and the literal-limits text above already says "in both modes".
6. **"The precedence follows GNU units."** §12, question 2 keeps GNU units out of numeric semantics in docs; precedence is syntax. Proposed: devdocs keep the sentence as rationale, and the expression reference does not mention GNU units.

## Notes on this run

The plan's module list for D1 omits `pipeline.ts`, `table.ts` and `names.ts`, which the Names section and the `want` grammar cannot be verified without (§2.1.4 lists them; they are under "Also read"), and the property test lives in `src/core/print.test.ts`, with `src/testing/expr.ts` only the tree generator. The plan says no EBNF for expressions exists anywhere; a sketch exists as the header comment of `src/core/expr.ts:6-19`, which the generated grammar will replace, and the precedence table here was derived from `LEVELS`, `BINARY` and the parser's rules rather than from it. The hardest call was the Claims section for a D unit: the rows are the context claims verified only in their D1 parts, so that the A-unit reports can be compared against them without either rewriting §1. Everything user-observable was checked by running the harness, not by reading alone, and the two pages agree with the code everywhere but the two stale sentences in `devdocs/architecture.md#Expressions`. For the next units: D2 shares `#Names` and owns the function-name and list-name checks at build; D3 can take as confirmed that both micro signs (`µ-` U+00B5 and `μ-` U+03BC) are defined as prefixes (`src/units.txt:72-73`), so the lookalike is not a pitfall; V2 pares the three devdocs sections and carries the `[92]` link and the opening sentences; the header of `src/core/pipeline.ts` calls `2 tempC` an unknown unit where the code answers `functionAsUnit`, a code comment outside the audit's scope.
