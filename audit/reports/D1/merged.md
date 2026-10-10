# Unit D1: Expression language (merged)

- Plan revision: f9f31d3 (the two runs merged here read 98b7531; nothing outside `audit/reports/` changed between the two)
- Date: 2026-10-10
- Model: claude-fable-5-1, merging the opus run (model unknown) and the fable run (claude-fable-5-1) of this unit, with every citation re-read against the checkout
- Doc sections read: `docs/definitions.md#Expressions`, `#Names`, and `#(top)` for its §9.4 row; `devdocs/architecture.md#Expressions`, `#Parsing`, `#Evaluation`
- Modules read: `src/core/expr.ts`, `src/core/parser.ts`, `src/core/print.ts`, `src/core/evaluate.ts`, `src/messages.ts`, `src/testing/expr.ts`
- Also read: `src/core/pipeline.ts` (its header, `convertText`, `convertParsed`, the function want's conformance check, `evaluateExpr`); `src/core/table.ts` (its header, `unitLookup`, `resolveFunction`, `functionArity`, `arityOf`); `src/core/names.ts` (`resolveName`, `findAmbiguity`); `src/core/build.ts` (`BuildError`, `ambiguousName`, `prefixedName`, `declaredPrimitives`); `src/core/definitions.ts` (its header grammar, imports, comparators and comment rule); `src/core/scaled.ts` (`MAX_EXPONENT`, `scaled`, `formable`, `parseDecimal`); `src/core/quantity.ts` (`multiplyQuantities`, `divideQuantities`); `src/core/dimension.ts` and `src/core/dimension-of.ts` (`formatDimension`, `dimensionExpr`, the call of `reduceExponent`); `src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`); `src/settings.ts` (the setting's maximum); `src/outcome.ts` (`outcomeOf`, the blank want, `resultPieces`, `copyText`); `src/unit-converter.ts` (`×` on screen); `src/core/builtins/pi.ts` and `src/core/builtins/round.ts` (their arities); `src/core/expr.test.ts`, `src/core/print.test.ts` (the property test and the canonical-form cases), `src/core/parser.test.ts:223` and `src/outcome.test.ts:38-54` (the harness), as evidence; `src/units.txt` (the names the Names section cites, the prefixes, the are, the two micro signs); `docs/definitions.md:293-294` (the parameter rule), `docs/README.md#(top)` and searches of `docs/` and of `devdocs/numbers.md` for the issue link, to confirm the gaps of §6.3 and to settle the one place for issue 88. Both merged runs ran the suites `expr`, `print`, `parser`, `messages`, `evaluate` and `pipeline`, which pass at this revision, and checked user-visible behaviour through `outcomeOf` over the system table at the default settings, from scratch scripts outside the tree; every output quoted below was re-derived from the code. Nothing in the tree was changed.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 0 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 2 / 2 / 1 |
| Gaps confirmed / refuted / new | 8 / 0 / 6 |
| Proposed edits | 12 |
| Questions for the owner | 9 |

## Claims

None assigned. §1 is read-only context for a docs unit (10.b). The statements of the unit's own five sections are verified under Findings, "The prose verified": 67 confirmed, 8 corrected and 1 not verifiable here. What the code says about the context claims the unit's entry cites is under Findings, "Read-only context, checked"; none is rewritten.

## Stale passages

The plan's rows for these pages are the §9.4 row for `docs/definitions.md#(top)` and the §1.2.5 row for `devdocs/architecture.md#Parsing`; §1.1.5 has none. Both are confirmed, and three passages were found.

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/definitions.md#(top)` (line 5; §9.4, confirmed) | "This section describes that file: what it contains, how to read it, and how to add to it." | update | "This page describes that file: what it contains, how to read it, and how to add to it." (Proposed edits) |
| `devdocs/architecture.md#Parsing` (lines 512-519; §1.2.5, confirmed) | "(The call rule broke it once: a call and a name began alike, told apart only by a lookahead for `(`, so a nested call with an error in it cost `2^k` for `k` levels. A cut combinator, … was set aside for the fix: …)" | keep as intent | A call and a plain name begin alike, and a lookahead for `(` alone would let the match back off to a shorter name in front of the `(`: a call whose argument list fails would then be read again as a name before a parenthesized factor, and a nested call with an error in it would cost `2^k` for `k` levels. The plain name's lookahead therefore includes the name's own characters, which keeps each level to a constant. A cut combinator, which commits an `alt` once a prefix has matched and would serve other grammars, is not used for this: a committed failure skips every enclosing `alt`, `optional` and `many`, so a misplaced cut changes the meaning of valid input, where the local lookahead has no such failure mode. |
| `devdocs/architecture.md#Expressions` (lines 377-378) | "so `kg (m/s)` stays the product it always was" | update | so `kg (m/s)` is a product |
| `devdocs/architecture.md#Expressions` (lines 387-388) | "In the tree it is an ordinary multiplication, indistinguishable from `*`." | drop | delete; the paragraph that begins "The grammar's levels of binding" states that juxtaposition is its own operator, `juxtapose`, and why: so that a tree can be written back as it was read. |
| `devdocs/architecture.md#Expressions` (lines 406-408) | "The parser has no context, and a reduction there took seconds on long literals and minutes at the hard bound, on every keystroke." | keep as intent | The parser has no context to bound a reduction by: reducing there would run Euclid's gcd at the hard bound on every keystroke, far too slowly for long literals, so the evaluator reduces the exponent within the significand limit in force instead. |

## Findings

**1. The precedence table, verified** against `LEVELS`, `BINARY`, the grammar and the property test:

| Level, loosest first | Construct | Grouping | Evidence |
| --- | --- | --- | --- |
| `;`, in the want only | the items of a unit list | not an expression; never inside parentheses; no item may be empty | `src/core/expr.ts:513-529` (`unitListOf`, `unitList`); `src/core/expr.test.ts:706-741` |
| 1, `sum` | `+`, `-` | left to right | `src/core/expr.ts:218-219`, `:508` |
| 2, `quotient` | `*`, `/` | left to right | `src/core/expr.ts:220-221`, `:503-506` |
| 3, `signed` | one `-` before a product | does not stack; may follow `+`, `-`, `*`, `/` | `src/core/expr.ts:494-501`; `src/core/expr.test.ts:205-222` |
| 4, `product` | juxtaposition | left to right; a number only as the first factor | `src/core/expr.ts:222`, `:489-492`; `src/core/expr.test.ts:131-147` |
| 5, `power` | one `^` and a literal exponent | one exponent per factor | `src/core/expr.ts:472-487`; `src/core/expr.test.ts:363-368` |
| 6, `atom` | a number, a name, a call, an expression in parentheses | none | `src/core/expr.ts:429-435` |

The two symbol levels are `chainl1` over the table (`src/core/expr.ts:503-508`), juxtaposition is `many(unitPower)` after a `power`, so that a number can only lead (`:486-492`, `:429-435`), the negation is one `-` before a product (`:495-501`), and `^` takes one exponent per base (`:472-487`). Every grouping example in `docs/definitions.md#Expressions` and `devdocs/architecture.md#Expressions` parses as the pages say, and `--2`, `+2`, `m 2`, `2 3 m` and `1 2 3` are the errors they are said to be (`src/core/expr.test.ts:131-241`). The printer places parentheses by the same `LEVELS` (`src/core/print.ts:131-147`, `:177-183`), with three positional rules the levels do not express: a negation's operand is written at the product, a power's base at the atom, and a right operand of a juxtaposition that leads with a number is parenthesized (`src/core/print.ts:14-23`, `:96-103`, `:111-118`). The property test (`src/core/print.test.ts:134-151`) prints 400 random trees from `src/testing/expr.ts` (every node kind and operator, literals in eight spellings, exponents with and without a denominator) and parses each back to the same tree and the same text. The hand-written grammar in the header of `src/core/expr.ts:6-19` matches the combinators of `src/core/expr.ts:379-529` production by production; the table above was derived from the parser, not from it.

**2. The prose verified.** The statements of the five sections, in the order the plan lists the sections and then in page order. "Harness" means `outcomeOf` (`src/outcome.ts:194-217`) over the system table built as `src/outcome.test.ts:38-54` builds it, at the default settings, run from a scratch script outside the tree; a tree is what `parseExpr` returns.

| Statement | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| `docs/definitions.md#Expressions` (top): "A body, like the text typed into the converter, is a small expression language" | confirmed | `src/core/expr.ts:1-4` (`parseExpr`: "what the user types as `have` and `want`, and what the body of a unit or prefix definition is"); `src/core/definitions.ts:90-98` (imports `expr`, `unitListOf`) | It also serves annotations, the terms of conditions and function bodies (`src/core/definitions.ts:24-31`); the want adds `;` (`src/core/expr.ts:252-264`). "The converter" is under Terminology. |
| `#Expressions > Numbers`: unsigned decimals with an optional exponent, "read exactly" | confirmed | `src/core/expr.ts:287` (`UNSIGNED`), `:297-315` (`decimal`, through `parseDecimal`); `src/core/scaled.ts:730-753`; `src/core/expr.test.ts:373-382` | Also `5.`, `1E3` and `2E+2` (`src/core/expr.test.ts:377`, `:380`; `src/testing/expr.ts:14`). |
| `#Expressions > Numbers`: "A sign is part of a number only in its exponent" | confirmed | `src/core/expr.ts:287-288` (`UNSIGNED`, `SIGNED`), `:494-501` (`signed`); `src/core/expr.test.ts:233-241`, `:384-394` | The exponent belongs to the literal only without a space and only with digits: `2e -19 C` is `2 e - 19 C` and `2e` is `2 e` (`src/core/expr.test.ts:236`, `:396-400`). |
| `#Expressions > Juxtaposition`: a number only as the first factor; `m 2` and `2 3 m` are errors | confirmed | `src/core/expr.ts:429-435` (`unitAtom` holds no number), `:489-492` (`product`); `src/core/expr.test.ts:131-147` | A factor in parentheses may follow a number: `2 (3 m)` and `2(3)` are products (`src/core/expr.test.ts:136`, `:586`). |
| `#Expressions > * and /`: one level, left to right; juxtaposition binds tighter | confirmed | `src/core/expr.ts:214-223` (`BINARY`), `:503-506` (`quotient`); `src/core/expr.test.ts:149-163` | None. |
| `#Expressions > + and -`: one level, left to right, loosest; the three examples | confirmed | `src/core/expr.ts:218-219`, `:508` (`sum`); `src/core/expr.test.ts:165-180` | None. |
| `#Expressions > + and -`: the sides must pass the test the have and the want pass; `1 m + 1 s`, `1 rad + 1`, `1 m + 0` are errors | confirmed | `src/core/evaluate.ts:548-572` (`nonconformingOperands`), `:702-717` (`checkConformance`); `src/messages.ts:109-117`, `:634-648`; harness: `Cannot add "1 rad" and "1": "1 rad" (radian) and "1" (1) differ in kind: radian.`, `Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1.` | The canonical word is "conform" (§8); the wording is the conversion error's. |
| `#Expressions > - before a product`: tighter than `*` and `/`, looser than juxtaposition and `^`; `-2^2` is `-4` | confirmed | `src/core/expr.ts:192-199` (`LEVELS`), `:494-501` (`signed`); `src/core/expr.test.ts:182-203` | None. |
| `#Expressions > - before a product`: "It does not stack (`--2` is an error; write `-(-2)`)" | confirmed | `src/core/expr.ts:495-501`; `src/core/expr.test.ts:214-222` | A negation may follow `+`, `-`, `*` or `/`: `2 - -3` is `5` (`src/core/expr.test.ts:205-212`). |
| `#Expressions > - before a product`: "there is no `+` in front of anything" | corrected | `src/core/expr.ts:287-288` (`UNSIGNED` takes a signed exponent, `SIGNED` a leading sign); `src/core/expr.test.ts:218-219`, `:265`, `:277`, `:380` | There is no unary `+`: `+2` and `2 * +3` are errors. A `+` sign is accepted only in a literal's exponent (`2E+2`) and as the sign of a `^` exponent (`m^+2`, `m^(+3/2)`). |
| `#Expressions > ^`: a signed decimal or a parenthesized fraction, never an expression | confirmed | `src/core/expr.ts:437-470` (`exponent`); `src/core/expr.test.ts:262-284`, `:345-350` | The second literal takes no sign (`m^(1/-2)` is an error); one literal may stand alone in parentheses (`m^(2)`); `m^x` and `m^(1/2 + 1)` are errors; a zero divisor is an error as typed (`src/core/expr.test.ts:352-361`). |
| `#Expressions > ^`: "It binds tightest, so `m^2 - 1` is `(m^2) - 1`" | confirmed | `src/core/expr.ts:472-487` (`raised`); `src/core/expr.test.ts:224-231`, `:251-257` | A factor takes one exponent: `m^2^3` is an error (`src/core/expr.test.ts:363-368`); `m^1/2` is `(m^1)/2` (`:254`). |
| `#Expressions > Parentheses`: "group" | confirmed | `src/core/expr.ts:382-385` (`parenthesized`); `src/core/expr.test.ts:243-249` | A `;` never stands inside (`src/core/expr.test.ts:706-715`). |
| `#Expressions > A call`: a name directly followed by parentheses, arguments separated by commas | confirmed | `src/core/expr.ts:347-349` (`callName`), `:387-406` (`argumentList`, `call`); `src/core/expr.test.ts:550-570` | A call may take no arguments: `pi()` (`src/core/builtins/pi.ts:21-22`). |
| `#Expressions > A call`: "Each function takes its own number of arguments, and a call with another number is an error that says how many" | corrected | `src/core/evaluate.ts:210` (`Arity` is a range), `:668-679` (checked before any argument); `src/core/builtins/round.ts:346-347` (`round` takes 1 to 2); `src/messages.ts:118-119`, `:651-654`; harness: `"tempC" takes 1 argument, but "tempC(1, 2)" gives 2 arguments.`, `"round" takes 1 to 2 arguments, but "round(1, 2, 3)" gives 3 arguments.` | Each function takes a fixed count of arguments or, for some built-ins, a range (`round(x)` and `round(x, places)`); a call with another count is an error that says how many, reported before any argument is computed. |
| `#Expressions > A call`: "`kg (m/s)` is a product, and `kg(m/s)` is a call of `kg`, which is not a function and says so" | confirmed | `src/core/expr.ts:418-422` (`plainName`); `src/core/table.ts:215-225` (`notAFunction`); `src/messages.ts:83-89`; `src/core/expr.test.ts:581-587` | The other way round, `tempC (1)` is a product, and the message says that `tempC` is a function, not a unit, and shows the call form (`src/core/table.ts:184-192`; `src/messages.ts:81-82`, `:421-429`). |
| `#Expressions` (last paragraph): `1/12 year` is `1 / (12 year)`, `1 m + 1/2 m` is an error, and the rewrites given | confirmed | `src/core/expr.test.ts:153`, `:176`; harness: `Cannot add "1 m" and "1/2 m": "1 m" has dimension m, but "1/2 m" has dimension 1 / m.` | None. |
| `#Expressions` (last paragraph): "The one thing to watch is a fraction before a unit" | confirmed | `src/core/expr.ts:21-29` | True of what the section states. Finding 4 adds `m^1/2`, `-2^2`, `5 ft 3 in`, `2e -19 C`, `kg(m/s)`, `m²` and a prefix that makes a familiar symbol another unit (`dB`, `at`), and the proposed text lists them. |
| `docs/definitions.md#Names`: "a letter or underscore followed by letters, digits and underscores, in any script"; `°`, `%` and `'` cannot be | corrected | `src/core/expr.ts:290` (`NAME` is `/[\p{L}_][\p{L}0-9_]*/u`); `src/core/expr.test.ts:437-456` | A name is a letter of any script or an underscore, followed by letters of any script, the digits `0` to `9` and underscores; superscripts and subscripts, other scripts' digits, combining marks and symbols are not name characters, so `m²`, `H₂O` and an `Å` typed as `A` with a combining ring are errors. |
| `#Names`: case-sensitive, and "read as long as they go, so `m2` is the name `m2`" | confirmed | `src/core/names.ts:50-56` (exact `Map` reads); `src/core/expr.ts:418-422`; `src/core/expr.test.ts:443-447`; harness: `1 Mm = 1e+9 mm`, `Unknown unit "m2".` | None. |
| `#Names`: the unit of that name, else one prefix followed by a unit (`km`, `kilometre`) | confirmed | `src/core/names.ts:45-59` (`resolveName`); `src/core/table.ts:184-213` (`unitLookup`); harness: `1 kilometre = 1000 m` | The prefix tried is the shortest that fits, and a table that passed `findAmbiguity` has only one split for any name (`src/core/names.ts:21-23`). |
| `#Names`: "An exact name always wins, so `min` is the minute and not `m` + `in`" | confirmed | `src/core/names.ts:50-51`; `src/units.txt:233` (`min 60 s`) | None. |
| `#Names`: "`ha` is defined as the hectare even though `h` + `a` would give the same" | corrected | `src/units.txt:248-250` (`ha`, `hectare`, `are 100 m^2`; no line defines a unit `a`); harness: `Unknown unit "a".` | `ha` is the hectare by its own definition; the are is `are` and no unit `a` exists, so `h` + `a` would read as nothing, and `ha` does not illustrate the rule. |
| `#Names`: prefixes do not stack (`kkm`); no plural handling (`inches`) | confirmed | `src/core/names.ts:52-57`; harness: `Unknown unit "kkm".`, `Unknown unit "inches".` | None. |
| `#Names`: prefixes and units are separate namespaces (`m-` and `m`) | confirmed | `src/core/names.ts:45-49`; `src/core/table.ts:54-57` (`prefixes`, `units`); `src/units.txt:67`, `:71`, `:235` | So are `h-` (hecto) and `h` (the hour); and the rule can make a familiar symbol another unit: `dB` is `d` + `B`, a tenth of a byte (`src/units.txt:69`, `:579-580`), where decibels are the function `decibel` (`:227`). |
| `#Names`: a function's name is looked up exactly; `ktempC(1)` is a call of nothing | confirmed | `src/core/table.ts:234-243` (`resolveFunction`); `src/messages.ts:84-86`; harness: `Unknown function "ktempC".` | None. |
| `#Names`: "a function's name may not itself read as a prefix followed by a unit" | confirmed | `src/core/build.ts:309-330` (`prefixedName`) | The build checks the names of unit lists and of built-ins the same way, and refuses a definition that takes a built-in's name (`src/core/build.ts:158-164`; `src/core/table.ts:62`). |
| `#Names`: a name read as two prefix-unit pairs is an error when the file is loaded | confirmed | `src/core/build.ts:305-308` (`ambiguousName`); `src/core/names.ts:61-94` (`findAmbiguity`) | None. |
| `#Names`: `u` and `at` are missing for that reason; `Da`, `amu`, `technicalatmosphere` are there | confirmed | `src/units.txt:74` (`u-`), `:78` (`a-`), `:136` (`t`), `:257` (`au`), `:265-270` (the comment, `Da`, `amu`), `:309` (`technicalatmosphere`); harness: `Unknown unit "u".`, `1 at = 1e-15 kg` | Neither symbol is defined, for the reason the page gives. Typed anyway, `u` is an unknown unit, and `at` reads as `a` + `t`, an attotonne, which the proposed text says. |
| `devdocs/architecture.md#Expressions`: "One grammar serves both definition bodies and user input" | confirmed | `src/core/expr.ts:1-4`, `:379-380` (`expr`, "for embedding in another grammar"); `src/core/definitions.ts:90-98` | None. |
| `#Expressions`: "The precedence follows GNU units" | not verifiable here | `src/core/expr.test.ts:150` ("As in GNU units: the first `/` starts the denominator of what follows") repeats it; the tree holds no grammar of GNU units | Question 2. |
| `#Expressions`: the levels and their associativity, the negation and "there is no unary `+`" (lines 354-362) | confirmed | `src/core/expr.ts:192-223`, `:494-508`; `src/core/expr.test.ts:149-222` | None. |
| `#Expressions`: a unit list is not an expression; `parseUnitList`; the list grammar over any item parser | confirmed | `src/core/expr.ts:252-264`, `:513-529` (`unitListOf`); `src/core/definitions.ts:306`; `src/core/expr.test.ts:690-741` | An empty item is an error: `ft;`, `;in`, `ft;;in`. |
| `#Expressions`: a call is an atom; `2 tempC(100)`, `tempC(100)^2`, `-tempC(100)` | confirmed | `src/core/expr.ts:429-435`; `src/core/expr.test.ts:572-579`; harness: `2 tempC(100) = 746.3 K` | None. |
| `#Expressions`: the comma appears nowhere else; the count of arguments is the evaluator's | confirmed | `src/core/expr.ts:387-392`; `src/core/evaluate.ts:668-679`; `src/core/expr.test.ts:624-628` | None. |
| `#Expressions`: the lexical call rule; the evaluator's message shows the product with the space | confirmed | `src/core/expr.ts:347-349`, `:418-422`; `src/core/table.ts:215-225`; `src/messages.ts:83-89` | The wording "stays the product it always was" is tagged under Stale passages. |
| `#Expressions`: "That is the one whitespace-sensitive rule in the grammar" | confirmed | `src/core/expr.ts:51-56` | Below the grammar a space ends a token, which users meet as `2e -19` and `m^- 1`. |
| `#Expressions`: "The tree holds a call as the name with its own span and its arguments" | confirmed | `src/core/expr.ts:161-167` (`nameSpan`) | None. |
| `#Expressions`: juxtaposition "In the tree it is an ordinary multiplication, indistinguishable from `*`" | corrected | `src/core/expr.ts:130-136`, `:222` (`juxtapose`); `src/core/evaluate.ts:574-583`; `src/core/print.ts:95-103` | In the tree, juxtaposition is its own operator, `juxtapose`, which the evaluator multiplies as it does `*` and the printer writes back with a space; the section's last paragraph says so, and the sentence is tagged drop under Stale passages. |
| `#Expressions`: where a `-` belongs; "A number is never negative in the tree" | confirmed | `src/core/expr.ts:287-288`, `:494-501`; `src/core/expr.test.ts:224-241`, `:384-394` | None. |
| `#Expressions`: the exponent travels as two literals, each formable within the hard bound, a zero divisor rejected, the quotient taken by the evaluator | confirmed | `src/core/expr.ts:138-147` (`Exponent`), `:317-331` (`exponentLiteral`), `:437-470`; `src/core/scaled.ts:249-258` (`formable`); `src/core/evaluate.ts:1217-1251` (`reduceExponent`); `src/core/expr.test.ts:286-315`, `:352-361`, `:402-432` | `m^1e999999999` is rejected as typed; `m^1e300000` parses and is refused when evaluated; the printer writes the two literals as typed, so `m^(2/4)` is written back unreduced (`src/core/print.ts:150-163`). |
| `#Expressions`: a unit name's characters, taken as long as it goes; "Whitespace is spaces and tabs, never a newline" | confirmed | `src/core/expr.ts:274-275` (`ws`), `:290` (`NAME`); `src/core/expr.test.ts:437-469` | Digits are `0` to `9` only, as under `#Names`; blanks are allowed before and after the text and between any two tokens (`src/core/expr.ts:244-264`, `:277-284`). |
| `#Expressions`: "The tree has six kinds of node" | confirmed | `src/core/expr.ts:149-167` (`ExprNode`); `src/core/print.test.ts:153-174` | The binary operation includes juxtaposition, a fifth operator (Proposed edits). |
| `#Expressions`: every node carries the span of text it came from | confirmed | `src/core/expr.ts:91-94`, `:121` | None. |
| `#Expressions`: `LEVELS` and `BINARY` build the parser's levels and drive the printer, "so the two cannot disagree" | corrected | `src/core/expr.ts:360-370` (`operatorsAt`), `:486-508`; `src/core/print.ts:14-23`, `:92-119`; `src/core/print.test.ts:134-151` | The binary operators' levels and symbols are shared data, so the parser and the printer cannot disagree on an operator; the nesting of the levels, the negation, the power and the rule that a number only starts a product are written in each, and the property test keeps the two in step. |
| `#Expressions`: the printer's canonical text, and "The printer never changes a tree" | confirmed | `src/core/print.ts:1-29`, `:83-129`, `:165-175` (`isFraction`); `src/core/print.test.ts:48-94` | A tight quotient's first literal may be negated (`-1/3`); a call's arguments are joined by `, `; a right factor that leads with a number is parenthesized (`2 (3 m)`, `src/core/print.test.ts:96-117`). |
| `#Expressions`: the output is pieces, and `text` joins them | confirmed | `src/core/print.ts:42-61` (`Piece`, `text`); `src/core/print.test.ts:119-132` | None. |
| `#Expressions`: "A property test prints random trees (`src/testing/expr.ts`) and parses them back" | confirmed | `src/core/print.test.ts:134-151`; `src/testing/expr.ts:30-75` (`randomExpr`) | The test lives in `src/core/print.test.ts`, with `src/testing/expr.ts` the tree generator; it also checks that printing the tree read back gives the same text. |
| `#Expressions`: `formatDimension` is the printer over a dimension built as an expression (`dimensionExpr`) | confirmed | `src/core/dimension.ts:196-210` | None. |
| `devdocs/architecture.md#Parsing`: the furthest expectation, so that `3 m ^` says "expected a number or `(`" after the `^` | confirmed | `src/core/parser.ts:71-76`, `:264-284` (`alt`), `:372-386` (`merged`, `further`); `src/core/expr.test.ts:520-527`; `src/messages.ts:71-76`; harness: `Unexpected end of input: expected a number or "(".` | The labels come in the order tried: after an operand, `"^", a unit name, "(", "*", "/", "+", "-" or end of input`. |
| `#Parsing`: "Rejection is final" | confirmed | `src/core/parser.ts:200-215` (`check`), `:279`, `:304`; `src/core/parser.test.ts:223` | None. |
| `#Parsing`: a literal past the hard bound or the exponent bound "becomes a parse error pointing at the literal" | confirmed | `src/core/expr.ts:297-315`; `src/core/scaled.ts:187-197`, `:730-753`; `src/core/expr.test.ts:402-432`; `src/messages.ts:77-78`, `:316-328` (`describeRejection`) | The bound reads the value's power of ten as scientific notation writes it: `0.001e1000000000000000003` parses and `12e1000000000000000000` does not (`src/messages.ts:307-314`). |
| `#Parsing`: `check` is the only source of `rejected` errors; the grammar's `Rejection` is worded by `src/messages.ts` | confirmed | `src/core/parser.ts:194-199`; `src/core/expr.ts:169-178` (`Rejection`); `src/messages.ts:316-328` | The four kinds are the four the page names. |
| `#Parsing`: a parse error is nothing acceptable at a position, or text recognized and rejected | confirmed | `src/core/parser.ts:55-63` (`ParseError`); `src/messages.ts:71-78` | None. |
| `#Parsing`: "a composite node spans from its first child to its last" | corrected | `src/core/expr.ts:93-94`, `:382-385`, `:395-406`, `:497-499`; `src/core/expr.test.ts:484-515`, `:589-610` | A composite node spans from its first part to its last: a negation from its `-`, a call from its name to its `)`, and an expression in parentheses with its parentheses, which is what a message quotes (`1 / (2 - 2)` quotes `(2 - 2)`). |
| `#Parsing`: the combinators it names exist, and its user-observable statements hold | confirmed | `src/core/parser.ts:112-163`, `:168-343` | The mechanics of `alt`, `many`, `regex` and `lazy` are V2's (question 8). |
| `devdocs/architecture.md#Evaluation`: `evaluate` takes an `Expr`, a `Lookup`, the `Primitives` and the working `NumberContext` and returns a `Quantity` | confirmed | `src/core/evaluate.ts:400-406` | It also takes an optional collector of the conditions a call assumes. |
| `#Evaluation`: a number is a dimensionless quantity, and the operators are the quantity arithmetic | confirmed | `src/core/evaluate.ts:505-664` (`evaluateNode`) | None. |
| `#Evaluation`: `^`'s exponent made a fraction within the significand limit (`reduceExponent`, also under `dimensionOf`); `2^(1e30/1e30)` is `2`, `2^1e-30000` refused, `pow(2, 1e-30000)` is `≈ 1` | confirmed | `src/core/evaluate.ts:599-624`, `:1217-1251`; `src/core/dimension-of.ts:46`, `:140`; harness: `2^(1e30/1e30) = 2`, `pow(2, 1e-30000) ≈ 1` | The refusal carries the reach `exceeds`, so the message offers nothing: `"2^1e-30000" would need a significand of about … bits, past the significand limit, however it is computed.` |
| `#Evaluation`: "`^` and `pow` disagree on such an exponent, which `[#88][88]` tracks" | confirmed | `src/core/evaluate.ts:24-26` ("the disagreement is #88") | The link is reference-style, outside the Markdown subset, and `devdocs/numbers.md:480` links the issue too (Proposed edits; question 3). |
| `#Evaluation`: the count of arguments checked before any argument; a defined function takes exactly its parameters | confirmed | `src/core/evaluate.ts:665-679`; `src/core/table.ts:260-266` (`arityOf`); harness: `tempC(bogus, 2)` reports the count, not the unknown unit | A built-in may take a range (the call row above). |
| `#Evaluation`: a defined function's arguments checked to conform, then its body evaluated with the parameters bound by position | confirmed | `src/core/evaluate.ts:690-719`, `:763-770`, `:1095-1125` (`evaluateBound`) | The function's conditions are checked between the two (`src/core/evaluate.ts:720-762`), and a bound name is resolved before any unit or prefix (`:1109-1115`). |
| `#Evaluation`: a built-in's dimension rule (`builtinArgument` at the call), `domainError` at the call, `unresolved` at the argument, any other failure at the call | confirmed | `src/core/evaluate.ts:799-884` (`applyBuiltin`) | None. |
| `#Evaluation`: "The context goes to every power and every built-in, … and to every sum …; everything else is exact" | corrected | `src/core/evaluate.ts:520-533`, `:551-556`, `:574-596`, `:628-632`, `:658-663` (`stepQuantity` at every node); `src/core/quantity.ts:171-199` (`multiplyQuantities` and `divideQuantities` take the context) | Every node is a step at the context; the arithmetic takes the context at every sum, which aligns within its significand limit, at every product, quotient and power, whose exact results are held to that limit and to the exponent bound, and at every built-in; every literal's significand is checked against the limit. Exact values are never rounded. |
| `#Evaluation`: the primitives go to every sum; the same check, with the same roles, as conversion | confirmed | `src/core/evaluate.ts:32-35`, `:548-572`, `:702-717` (`checkConformance`); `src/core/pipeline.ts:713-718` | None. |
| `#Evaluation`: the primitives come from the table for user input and from the definitions while the table is built | confirmed | `src/core/pipeline.ts:904-917` (`evaluateExpr`); `src/core/build.ts:331-334` (`declaredPrimitives`) | None. |
| `#Evaluation`: names resolved through a lookup; the table's applies the prefix rule, the build's evaluates definitions on demand | confirmed | `src/core/evaluate.ts:194-207` (`Lookup`); `src/core/table.ts:179-227` (`unitLookup`) | A call's name resolves among the defined functions first and the built-ins second (`src/core/table.ts:234-243`), an order a user never sees, since the build keeps the two disjoint. |
| `#Evaluation`: each lookup's own error type, returned unchanged; the spans given to the lookup; how `notAFunction` shows the product | confirmed | `src/core/evaluate.ts:400-406`, `:526-527`, `:666-667`; `src/core/table.ts:215-225`; `src/messages.ts:83-89` | None. |
| `#Evaluation`: operands left to right, the first failure ends it; `bogus / 0` reports the unknown unit | confirmed | `src/core/evaluate.ts:537-546`; harness: `Unknown unit "bogus".` | None. |
| `#Evaluation`: a division by zero, or by a value that cannot be told from zero, points at the divisor | confirmed | `src/core/evaluate.ts:584-596`; harness: `Division by zero in "0".`, and `1 / (2 - 2)` quotes `(2 - 2)` | None. |
| `#Evaluation`: a power's base that cannot be told from zero points at the base; any other failing power at the whole power | confirmed | `src/core/evaluate.ts:612-647`; harness: `Division by zero in "0^-1".`, `"(-4)^(1/2)" takes an even root of a negative value.` | None. |
| `#Evaluation`: a sum, product or quotient refused points at the whole operation; a literal past the significand limit at the literal | confirmed | `src/core/evaluate.ts:505-519`, `:557-564`, `:576-596`; `src/messages.ts:349-369` | A literal is refused in both modes, since nothing rounds its digits before the check (`src/core/evaluate.ts:510-512`; question 9). |
| `#Evaluation`: a nonconforming sum points at the whole sum, with each operand's span and dimension as have and want | confirmed | `src/core/evaluate.ts:565-572`; `src/messages.ts:109-117` | None. |
| `#Evaluation`: a nonconforming argument points at the whole call and carries the argument's span | confirmed | `src/core/evaluate.ts:707-716`; `src/messages.ts:120-128`; harness: `Cannot apply "tempC" to "1 m": …` | None. |
| `#Evaluation`: a failing body is one `callFailed` at the call; a lookup failure inside a body comes back as any lookup failure does | confirmed | `src/core/evaluate.ts:771-788`, `:1101-1125` | A body that fails under a condition the call assumed is an `undecidedCondition`, and a condition that certainly fails is a `conditionFailed` (`src/core/evaluate.ts:746-760`, `:777-787`). |
| `#Evaluation`: "The evaluator never sees the text" | confirmed | `src/core/evaluate.ts:1-5` | None. |

**3. The want-field grammar, verified.** The have is one expression (`parseExpr`, `src/core/pipeline.ts:463`), and a blank have computes nothing (`src/outcome.ts:200`). The want is read by its shape:

| The want holds | Read as | Evidence |
| --- | --- | --- |
| nothing, once trimmed | the have alone, in the primitives | `src/outcome.ts:246-273` |
| one bare name of a unit list | that list | `src/core/pipeline.ts:505-517` |
| one bare name of a function | conversion into the function; one without an inverse says so | `src/core/pipeline.ts:518-528`, `:707-710`; `src/messages.ts:465` |
| any other single expression, a number or a call in it included | a unit; the answer is the ratio | `src/core/pipeline.ts:529-548`; harness: `1000 ft` as the want of a mile gives `5.28 × 1000 ft`, and `300 K` into `tempC(1)` is `300 K ≈ 1.0942914 tempC(1)` |
| two or more expressions separated by `;` | a unit list typed out, each item an expression (`ft;in/8`), held to a defined list's rules: of the have's dimension, positive, largest first | `src/core/pipeline.ts:550-583`; `src/core/expr.ts:257-264`; `src/messages.ts:520-535` |

A failure of the have is reported before one of the want, even before a want that does not parse (`src/core/pipeline.ts:463-474`, `:503-504`; harness: `bogus` into `ft;` reports `Unknown unit "bogus".`). An empty item (`ft;`, `;in`, `ft;;in`) is an error, and `;` cannot stand inside parentheses (`src/core/expr.ts:518-529`; `src/core/expr.test.ts:706-741`). A list's or a function's name is a unit nowhere else: `2 time` and `time;s` are `Unknown unit "time".`, and `2 tempC`, like `tempC` alone in the have, is `"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".` (`src/core/table.ts:9-12`, `:184-192`; `src/messages.ts:81-82`). One edge is left out of the proposed text on purpose: a bare name in parentheses still counts as bare, since parentheses make no node (`src/core/expr.ts:382-385`; harness: `(time)` reads as the list).

**4. The readings to watch, verified** through the harness at the defaults:

| Typed | Read as | Output |
| --- | --- | --- |
| `1/12 year` as the want of `1 m` | `1 / (12 year)`, a frequency | `"1 m" has dimension m, but "1/12 year" has dimension 1 / s.` |
| `m^1/2` | `(m^1) / 2` | the tree `div(pow(m, 1), 2)` |
| `-2^2` | `-(2^2)` | the tree `neg(pow(2, 2))` |
| `2^3^2` | an error | `Unexpected "^": expected a unit name, "(", "*", "/", "+", "-" or end of input.` |
| `m^x`, `m^(1/2 + 1)` | errors | `Unexpected "x": expected a number or "(".`, and the like |
| `5 ft 3 in` | an error | `Unexpected "3": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.` |
| `2e -19 C` | `2 e - 19 C`, with no error | `2 e - 19 C ≈ -19 s A` |
| `2e` | `2 e`, two elementary charges | a charge, with no error |
| `kg(m/s)` | a call of `kg` | `"kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.` |
| `tempC (1)` | a product of `tempC` and `1` | `"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".` |
| `pi ()` | an error | `Unexpected ")": expected a number, a unit name, "(" or "-".` |
| `m²`, `30°`, `50%` | errors | `Unexpected "²": …` and the like |
| `1 dB` | `d` + `B` | `1 dB = 0.8 bit` |
| `1 at` | `a` + `t` | `1 at = 1e-15 kg` |
| `1 m in ft` as the have | a volume | `1 m in ft = 0.00774192 m^3` |
| `1 m to ft`, `1 mile per hour` | unknown units | `Unknown unit "to".`, `Unknown unit "per".` |
| `1 m + 0` | a length plus a plain number | `Cannot add "1 m" and "0": "1 m" has dimension m, but "0" has dimension 1.` |
| `1,000`, `2,54`, `1 000` | errors | `Unexpected ",": …`, `Unexpected "0": …` |
| `2 × 3`, `2 · 3`, `6 ÷ 2`, `2 − 3` | errors | `Unexpected "×": …` and the like |
| `2 m` typed with a non-breaking space | an error | `Unexpected " ": …`, where the quoted character is the non-breaking space |
| `x # comment`, `1 m ≤ 2 m`, `1 m = 2 m` | errors | `Unexpected "#": …`, `Unexpected "≤": …`, `Unexpected "=": …` |
| `m ^ 2`, `f( 1 , 2 )`, `( 1 )` | the same as without the blanks | no error |

**5. `×`, `#`, `≤`/`≥` and whitespace in the fields** (§12, question 11). None of the characters is accepted. The grammar's only symbols are `+ - * / ^ ( ) ,` and, in the want, `;` (`src/core/expr.ts:282-290`, `:443-470`, `:518-529`), and `NAME` admits no symbol (`:290`), so `×`, `÷`, `·`, `²`, `≤`, `≥`, `=`, `<`, `>`, `#`, `[`, `|`, `~`, `:` and a typographic minus are each `Unexpected "×": expected …` wherever they stand, and nothing in `src/` rewrites them before parsing. The screen shows `×` for a product written with `*` (`src/core/print.ts:48-56`; `src/outcome.ts:156-158`; `src/unit-converter.ts:283`) and the copy button writes `*` (`src/outcome.ts:167-169`), so only text selected by hand carries it back, as decided. `#` starts no comment in an expression (`src/core/expr.ts:6-19` has none); comments belong to the definitions file's lines (`src/core/definitions.ts:7`, `:614`). `≤` and `≥`, with `<`, `<=`, `>`, `>=` and `=`, belong only to the heads and conditions of a definition, where `≤` and `≥` read as `<=` and `>=` (`src/core/definitions.ts:31-32`, `:388-389`); an expression has no comparison (N16), and `[` is reserved for the definition language (§2.1.1). Whitespace is spaces and tabs (`src/core/expr.ts:275`), allowed before and after the text and between any two tokens (`:244-264`, `:277-284`), so `m ^ 2`, `f( 1 , 2 )` and `( 1 )` parse; it is never inside a number or a name, never between a call's name and its `(` (`f (1)` is a product), and a newline is not whitespace. Any other space, a non-breaking space included, is an unexpected character whose message shows what looks like a space (`src/messages.ts:75`, `:670-673`).

**6. Literal limits.** At parse: a significand of more digits than the hard bound holds (`MAX_SIGNIFICAND_LIMIT_BITS`, `src/core/rational.ts:115`, which is also the largest value the significand limit setting takes, `src/settings.ts:471-474`) is `numberTooLarge`, an exponent past `±10^18` is `numberOverflow` or `numberUnderflow` (`src/core/expr.ts:297-315`; `src/core/scaled.ts:165`, `:187-197`, `:730-753`), a `^` literal that cannot be formed within the hard bound is `exponentTooLarge` (`src/core/expr.ts:322-331`; `src/core/scaled.ts:249-258`), and a zero divisor is `exponentDividesByZero` (`src/core/expr.ts:450-463`); each is final and points at the literal (`src/core/parser.ts:194-215`), worded "this number is too large to represent", "this number's exponent passes 10^18", "this number's exponent falls below -10^18" and "the exponent divides by zero" (`src/messages.ts:316-328`). The bound is the value's power of ten, not the exponent as typed: `0.001e1000000000000000003` parses and `12e1000000000000000000` does not. At evaluation: a literal's significand is held to the limit in force, in both modes, and refused with the reach `exceeds`, so the message offers nothing, even inside `approx` (`src/core/evaluate.ts:505-519`; `src/messages.ts:349-369`); a `^` exponent is reduced and formed within the limit (`:1217-1251`), refused at the bound when the power would pass it and otherwise at the limit (`:606-623`). So `m^1e999999999` is rejected as typed, `m^300000` parses and evaluates, `m^1e300000` parses and is refused "however it is computed", and `2^1e300000` is "too large to compute: its exponent would pass 10^18" (`src/messages.ts:390-399`).

**7. Parse errors and how they read.** An unmatched text is `Unexpected end of input: expected …` or `Unexpected "c": expected …`, the expectations being the labels of the primitives tried furthest, in the order tried (`src/core/parser.ts:379-386`; `src/messages.ts:71-76`); a rejected literal is quoted with its reason (`src/messages.ts:77-78`). The page's example holds exactly: `3 m ^` is `Unexpected end of input: expected a number or "(".`. After an operand the list reads `"^", a unit name, "(", "*", "/", "+", "-" or end of input`, and the label "a unit name" also stands for a function's name (`src/core/expr.ts:342-349`, `:408-422`; Terminology). The catalogue itself is generated later (§12, question 6), so the proposed text says only how an error reads in general.

**8. The printed form.** `docs/` has only the copy sentence in `docs/README.md#(top)`. The canonical text is one space between juxtaposed factors and around the other operators, `^` tight, a call's arguments joined by `, `, a quotient of two literals, the first perhaps negated, tight as a fraction, literals and exponents as typed (`1e3` stays `1e3`, `m^(2/4)` stays `m^(2/4)`), and the fewest parentheses that read the tree back (`src/core/print.ts:1-29`, `:165-175`; `src/core/print.test.ts:48-117`); on screen a product written with `*` shows as `×`, and the copy text has `*` (finding 5). Proposed text below, for the section C5 names "How the app writes expressions".

**9. Gaps of §6.3:**

| Gap | Verdict | Evidence |
| --- | --- | --- |
| A formal grammar and a precedence table | confirmed | neither is in `docs/`; the code holds a grammar in a comment, `src/core/expr.ts:6-19`, which the generated grammar will replace (question 1); the table of finding 1 was derived from the parser, not from it |
| The want field's own grammar | confirmed | `docs/definitions.md#Unit lists` and `#Functions` state lists and function wants apart; no page of `docs/` states the blank want, a want with a number, a call as the want, the empty item, or that `;` never stands in parentheses (finding 3) |
| Literal limits at parse and at evaluation | confirmed | only `docs/settings.md#(top) > Significand limit` ("a literal of more digits than the limit"); the limits at parse appear nowhere in `docs/` (finding 6) |
| Name resolution order in full | confirmed, in part | `#Names` states the exact name, the prefix, the separate namespaces and the exact call names; the parameter rule is stated under `#Functions` (`docs/definitions.md:293-294`), not where names are explained; that a function's or a list's name is not a unit, and that a name has only one split, are stated nowhere; the order "defined function before built-in" is never observable, since the build refuses a definition that takes a built-in's name (`src/core/build.ts:158-164`; `src/core/table.ts:31-34`), so the reference need not state it |
| Evaluation order and which operand an error points at | confirmed | nothing in `docs/`; `devdocs/architecture.md#Evaluation` states it and the code agrees (finding 2, the `#Evaluation` rows) |
| Whitespace, and `×`, `≤`, `≥`, `#` in the fields | confirmed | nothing in `docs/`; settled under finding 5 |
| The printed form | confirmed | `docs/README.md#(top)` says what the copy button writes; the canonical spacing, the parentheses and `×` on the screen appear nowhere in `docs/` (finding 8) |
| Parse errors and how they read | confirmed | nothing in `docs/`; finding 7, to be filled by the generated catalogue (§12, question 6) |
| New: readings to watch beyond a fraction before a unit | new | finding 4 |
| New: the have and the want as two grammars, and which error comes first | new | `src/core/pipeline.ts:463-474`, `:505-584`; `src/outcome.ts:200`, `:246-273` |
| New: the characters of names and of whitespace | new | `src/core/expr.ts:274-275`, `:290` |
| New: the literal forms beyond the four examples (`5.`, `1E3`, `2E+2`, no space inside a literal, `2e` as `2 e`) | new | `src/core/expr.ts:287-288`; `src/core/expr.test.ts:373-382`, `:396-400` |
| New: the forms and limits of a `^` exponent (one per factor, a `+` sign allowed, an unsigned second literal, `m^(2)`, formed within the significand limit, `^` against `pow`) | new | `src/core/expr.ts:437-470`; `src/core/evaluate.ts:599-624`, `:1217-1251` |
| New: calls with no arguments, and built-ins that take a range of arguments | new | `src/core/builtins/pi.ts:21-22`; `src/core/builtins/round.ts:346-347`; `src/core/evaluate.ts:210`; `src/messages.ts:651-654` |

**10. Read-only context, checked** (reported, not rewritten):

- §2.1.3, "No EBNF for expressions appears anywhere": contradicted. `src/core/expr.ts:6-19` holds an EBNF-style grammar of twelve productions, accurate against the parser, and `src/core/definitions.ts:20-32` one for the definition lines. Both are hand-maintained beside the code, the second source of truth §2.1.3 advises the docs against (question 1).
- §2.1.3, the printer "driven by the same table so 'the two cannot disagree'": true of the binary operators only (finding 2, the `LEVELS` row); `LEVELS` and `BINARY` seed the DSL for those, and the property test covers the rest.
- §2.1.1, "defined function before built-in": true of `resolveFunction` (`src/core/table.ts:234-243`) and never observable, the build keeping the two disjoint (`src/core/build.ts:158-164`).
- Q9 holds: `u` and `at` are undefined for the reason it gives, and `at` typed anyway reads as `a` + `t` (`src/units.txt:78`, `:136`), which the units guide may note (question 7).
- N1, N21, N22, N24, Q1, Q3, Q4, Q6, Q16, Q17, Q18 and Q19 are not contradicted by these sections or modules, in the parts they reach: a literal is read exactly through `parseDecimal` (`src/core/scaled.ts:730-753`); its exponent bound reads the value's power of ten, as N22 says (finding 6); a literal past the significand limit is refused with the reach `exceeds`, so the message suggests nothing, as N21 says, even inside `approx`; an unformable `^` exponent is refused at the bound when the power would pass it and otherwise at the limit, as N24 says (`src/core/evaluate.ts:606-623`); the exponent of `^` is a literal rational known at parse time, as Q1 says, so a dimension is exact; a sum's conformance check is the conversion's, with the same roles, as Q3 and Q4 say, and the function want applies it too (`src/core/pipeline.ts:713-718`, Q16); the want's readings are Q17's (finding 3); the printer's text parses back, as Q18 says (finding 8); and errors point at the text at fault, as Q19 says (finding 2, the `#Evaluation` rows).

**11. Code observations** (no change made):

- `src/core/parser.ts:18-20` says the error for `3 m ^` reads "expected a number"; it reads "expected a number or "("" (`src/core/expr.test.ts:524`).
- The rejection of a `^` exponent that divides by zero spans the blanks after the divisor, so the message quotes them: `m^(1/0 )` gives `"1/0 ": the exponent divides by zero.` (`src/core/expr.ts:450-463`; `src/core/expr.test.ts:357-360`).
- Parse messages label every name "a unit name", a function's in a call included, by design (`src/core/expr.ts:342-346`); the docs say "name" (Terminology; question 5).
- The header of `src/core/pipeline.ts:15-17` says `2 tempC` is an unknown unit; the code answers `functionAsUnit`, "a function, not a unit" (`src/core/table.ts:184-192`).
- A refused literal is quoted in full in its message, so a literal of thousands of digits yields a message about as long (`src/messages.ts:78`, `:98-105`); eliding the middle of a long quoted span is a code change for the unit that owns messages (C51).

## Proposed edits

### docs/definitions.md#(top)

Old (lines 5-8):

```text
spirit of a GNU units file. This section describes that file: what it
contains, how to read it, and how to add to it. The same expression language
serves the definitions and what you type into the converter, so anything
that can be typed can also be defined.
```

New:

```text
spirit of a GNU units file. This page describes that file: what it
contains, how to read it, and how to add to it. The same expression language
serves the definitions and what you type into the have and want fields, so
anything that can be typed can also be defined.
```

### docs/definitions.md#Names

Complete proposed text:

```markdown
## Names

A name is a letter or an underscore followed by letters, digits and
underscores. A letter is a letter of any script, so `µm`, `Ω`, `Å`,
`degF` and `N_A` are names; a digit is one of `0` to `9`. Nothing else
is part of a name: `°`, `%`, `'`, superscripts such as `²` and accents
typed as separate marks are not, so `m²` is an error and the square is
written `m^2`. Names are case-sensitive (`mm` and `Mm`, `S` and `s`)
and read as long as they go, so `m2` is the name `m2`, not `m` squared.

A name means the unit of that name if there is one, and otherwise one
prefix followed by a unit: `km` is `k` + `m` and `kilometre` is
`kilo` + `metre`. An exact name always wins, so `min` is the minute and
not `m` + `in`. There is only ever one way to split a name, as the end
of this section explains, so the split is never a choice. Prefixes do
not stack (`kkm` is nothing), and there is no plural handling (`inches`
is nothing unless it is defined as an alias). Prefixes and units are
separate namespaces, which is how `m-` (milli) and `m` (the metre), or
`h-` (hecto) and `h` (the hour), coexist. The rule can make a familiar
symbol another unit: `dB` is `d` + `B`, a tenth of a byte, and decibels
are the function `decibel`. Inside a function's body a parameter's name
comes before any unit of that name (Functions below).

Prefixes apply to units alone: the name of a function, defined in the
file or built into the app, is looked up exactly, so `ktempC(1)` is a
call of nothing and says so, and the name of a function or a unit list
may not itself read as a prefix followed by a unit (see Functions
below). The file's functions and the built-in functions share one set of
names, so no name is both. A function's name, or a unit list's, is not a
unit: `tempC` typed in the have field says so and shows the call form,
and `time` there is an unknown unit; The two fields, under Expressions,
says where the two names do mean something.

A name that could be read as two different prefix-unit pairs is an
error when the file is loaded, not an ambiguity resolved by some rule.
That is why two conventional symbols are missing: `u` for the dalton,
because with `au` a unit `dau` would be both `d` + `au` and `da` + `u`,
and `at` for the technical atmosphere, for the same reason against `t`.
The longer names (`Da`, `amu`, `technicalatmosphere`) are there. Typed
anyway, `u` is an unknown unit, and `at` reads as `a` + `t`, an
attotonne, which converts to no pressure.
```

### docs/definitions.md#Expressions

Complete proposed text, written to move into `docs/expressions.md` when it exists:

```markdown
## Expressions

The have, each item of the want and the body of a definition are
written in one small expression language: numbers, names, juxtaposition,
`*`, `/`, `+`, `-`, `^` with a literal exponent, parentheses and calls.
Each construct binds as the table says, loosest first, and the operators
of one level are read left to right:

| Level | Construct | Grouping | Example, and how it reads |
| --- | --- | --- | --- |
| 1, loosest | sum and difference: `+`, `-` | left to right | `5 ft - 2 in + 1 in` is `(5 ft - 2 in) + 1 in` |
| 2 | product and quotient: `*`, `/` | left to right | `m/s*s` is `(m/s)*s` |
| 3 | negation: one `-` before a product | once; it does not stack | `-2 m / s` is `(-(2 m)) / s`; `--2` is an error |
| 4 | juxtaposition: factors side by side, with a space or without | left to right; a number only as the first factor | `kg m / s^2` is `(kg m) / (s^2)`; `1/12 year` is `1 / (12 year)` |
| 5 | power: one `^` and a literal exponent | one exponent per factor | `-2^2` is `-(2^2)`; `m^2^3` is an error |
| 6, tightest | a number, a name, a call, an expression in parentheses | none | `2.54`, `ft`, `tempC(100)`, `(1/12)`; `kg(m/s)` is a call and `kg (m/s)` a product |

In the want, `;` separates the items of a unit list and binds looser
than all of these (The two fields, below).

- **Numbers** are unsigned decimals, with an optional exponent: `2`,
  `2.54`, `.5`, `5.`, `1e-3`, `1E3`, `2E+2`. They are read exactly, so
  `0.1 + 0.2` is exactly `0.3` and a unit defined by a decimal converts
  exactly. A sign is part of a number only in its exponent: `1e-3` is a
  thousandth, `1 - 3` is a difference, and `-2` is the negation of `2`.
  The exponent belongs to the number only when it is written without a
  space and has digits: `2e-19 C` is a number of coulombs, `2e -19 C` is
  `2 e - 19 C`, and `2e` is `2 e`, since `e` is the elementary charge.
- **Literal limits.** A number with more digits than the significand
  limit holds is refused where it stands when the expression is
  evaluated, in both modes and even inside `approx`: its message says
  that it would need a significand past the significand limit, however
  it is computed. A number with more digits than the largest significand
  limit the settings allow, or whose power of ten passes 10^18 or falls
  below -10^18, is an error as it is typed: "this number is too large to
  represent", "this number's exponent passes 10^18" or "this number's
  exponent falls below -10^18". The power of ten is the value's, as
  scientific notation writes it, not the exponent as typed:
  `0.001e1000000000000000003` is accepted, and `12e1000000000000000000`
  is not.
- **Names** are read as Names above describes: as long as they go, so
  `m2` is one name and `2m` is `2 m`.
- **Juxtaposition**, writing two factors side by side, multiplies:
  `2 m` is two metres and `kg m` is a kilogram-metre. A number may only
  be the first factor of a product, so `m 2`, `2 3 m` and `5 ft 3 in`
  are errors: multiplying numbers is written `2 * 3` or `2 (3)`, and
  five feet three inches is `5 ft + 3 in`.
- **`*` and `/`** multiply and divide, at one level, left to right, and
  juxtaposition binds tighter than either: `kg m / s^2` is
  `(kg m) / (s^2)` and `m/s*s` is `(m/s)*s`.
- **`+` and `-`** add and subtract, at one level, left to right,
  binding loosest of all: `1 ft + 3 in` is fifteen inches, and
  `2 m * 3 + 1 m` is `(2 m * 3) + (1 m)`. The two sides must conform,
  that is, be quantities of the same thing by the test the have and the
  want must pass: `1 m + 1 s` is an error (a length and a time), and so
  are `1 rad + 1` (an angle and a plain number) and `1 m + 0`, since `0`
  is a plain number and not a length. A difference may be zero or
  negative.
- **`-` before a product** negates it: `-2 m` is minus two metres and
  `2 * -3` is minus six. It binds tighter than `*` and `/` and looser
  than juxtaposition and `^`, so `-2 m / s` is `(-(2 m)) / s` and
  `-2^2` is `-4`; write `(-2)^2` for `4`. A negation may follow `+`,
  `-`, `*` or `/` (`2 - -3` is `5`) but does not stack: `--2` is an
  error; write `-(-2)`. There is no unary `+`: `+2` is an error, and a
  `+` sign is accepted only in an exponent (`2E+2`, `m^+2`).
- **`^`** raises to a literal exponent, never an expression, so that
  the dimension of a power is known exactly: a decimal with an optional
  sign (`m^2`, `s^-1`, `m^+2`, `m^0.5`) or, in parentheses, a decimal
  over an unsigned one (`m^(1/2)`, `m^(-3/2)`, `m^(2)`). `m^x`,
  `m^(1/2 + 1)` and `m^(1/-2)` are errors, as are a zero divisor
  (`m^(1/0)`) and an exponent too large to write as a fraction at all
  (`m^1e999999999`). It binds tightest, so `m^2 - 1` is `(m^2) - 1` and
  `m^1/2` is `(m^1) / 2`. A factor takes one exponent: `2^3^2` is an
  error; write `(2^3)^2`. The sign of an exponent touches its digits:
  `m^-1` is a power, `m^- 1` an error, and `m -1` the difference
  `m - 1`. The fraction is reduced when the expression is evaluated, so
  `m^(2/4)` is `m^(1/2)` and `(m^2)^(1/2)` is `m`, and its numerator and
  denominator must then fit the significand limit: `2^(1e30/1e30)` is
  `2`, while `2^1e-30000`, whose denominator would be `10^30000`, is
  refused, and `pow(2, 1e-30000)` is `≈ 1`.
- **Parentheses** group any expression: `(1/12) year` is a twelfth of
  a year. A factor in parentheses may follow a number: `2 (3 m)` is
  `6 m`.
- **A call**, a name directly followed by parentheses (`tempC(100)`,
  `pi()`, `atan2(3 m, 4 m)`), applies a function to the expressions
  inside, separated by commas; Functions below describes it. A call
  stands where a name may: `2 tempC(100)`, `tempC(100)^2` and
  `-tempC(100)` mean what they look like. Each function takes a fixed
  count of arguments or, for some built-in functions, a range
  (`round(x)` and `round(x, places)`), and a call with another count is
  an error that says how many. The space matters: `kg (m/s)` is a
  product, and `kg(m/s)` is a call of `kg`, which is not a function and
  says so; the other way round, `tempC (1)` is a product, and its error
  says that `tempC` is a function and shows the call form.
- **Whitespace** is spaces and tabs, any amount, before and after the
  text and between any two of its parts, around every operator and
  inside parentheses (`m ^ 2`, `f( 1 , 2 )`), but never inside a number
  or a name, and never between a function's name and its `(`. A line
  break is not accepted, and neither is any other space: a non-breaking
  space pasted from elsewhere is an error, and its message shows what
  looks like a space.

### What an expression does not contain

There are no other operators, no comments and no comparisons. `×`,
`·`, `÷`, the typographic minus `−`, superscripts such as `²`, `°`,
`%`, `'`, `"`, `**`, `|`, `~`, `:`, `[`, `#`, `=`, `<`, `<=`, `>`,
`>=`, `≤`, `≥`, and a comma outside a call (`1,000`, `2,54`) are errors
where they stand, each named in its message; write `*`, `/`, a space
and `^2` in their place. Comparisons, `|`, `~`, `:` and `[` belong to
the lines of the definitions file, and `#` to its comments.

### The two fields

The have is one expression; while it is blank, nothing is computed.
The want is read by its shape:

| The want holds | It is read as | Example |
| --- | --- | --- |
| nothing | the have alone, in the primitives | `1 in` gives `1 in = 0.0254 m` |
| the name of a unit list, alone | that list (Unit lists, below) | `time` |
| the name of a function, alone | conversion into the function: the call that gives the have (Functions, below); a function without an inverse says so | `tempF` |
| any other single expression | a unit, which may carry a number, be a sum or be a call; the answer is the ratio | `in`, `1000 ft`, `tempC(1)` |
| two or more expressions separated by `;` | a unit list typed out, held to what a defined list is held to: every item of the have's dimension, positive, and each smaller than the one before | `ft;in`, `hr;min;s`, `ft;in/8` |

A `;` stands only between the items of the want: never in the have,
never inside parentheses, and never with an item missing (`ft;`, `;in`
and `ft;;in` are errors). The name of a unit list or a function means
the list or the function only alone: `2 time` and `time;s` are unknown
units, and `2 tempC` says that `tempC` is a function, not a unit. Words
are names, not instructions: `1 m in ft` typed as the have is a volume,
since `in` is the inch, and `to` and `per` are unknown units; the unit
to convert to goes in the want.

### When an expression fails

An error marks its field, the have's before the want's, and quotes the
text at fault. Where the text cannot be read, the message names the
first character the app could not read and what could have come
there: `3 m ^` gives `Unexpected end of input: expected a number or "(".`,
`m 2` is an error at the `2`, since a number can only begin a product,
and `5 ft 3 in` gives
`Unexpected "3": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.`
A number the app read but cannot hold is an error that quotes it and
says why. Where the text reads but cannot be computed, its parts are
computed from the left and the first failure is reported, so `bogus / 0`
reports the unknown unit and not the division. Each failure quotes the
part at fault: a division by zero quotes the divisor
(`Division by zero in "0"`), a sum that does not conform quotes both
sides, a call with the wrong count of arguments quotes the call, a
value refused for size quotes the whole operation, and a part in
parentheses is quoted with its parentheses. A call with the wrong
number of arguments is reported before any argument is computed.

### How the app writes an expression back

The answer writes the have, and the want where a line shows it, in a
canonical form that reads back as the same expression: one space
between factors and around `+`, `-`, `*` and `/` (`2m` is shown as
`2 m`, and `kg m/s^2` as `kg m / s^2`), `^` and a quotient of two
numbers written tight (`m^2`, `5000/127`, `-1/3`), a call's arguments
separated by `, `, each number and exponent as it was typed (`1e3`
stays `1e3`, `.5` stays `.5`, `m^(2/4)` stays `m^(2/4)`), and only the
parentheses the reading needs (`((ft + in))` is shown as `ft + in`, and
`2 (m / s)` keeps its own). A product written with `*` is shown with
`×`, which the fields do not accept; the copy button writes `*`, so
what it copies reads back, while text selected on the screen may not.

### Readings to watch

- A fraction before a unit: `1/12 year` is `1 / (12 year)`, a
  frequency, because juxtaposition is read first; write `year / 12` or
  `(1/12) year`. The same rule makes `1 m + 1/2 m` an error, `1 m`
  plus `1 / (2 m)`; write `1 m + m/2`.
- `m^1/2` is half a metre; the square root is `m^(1/2)`.
- `-2^2` is `-4`; the square of minus two is `(-2)^2`.
- `2 -3` is a difference, `2e-3` is one number, and `2 * -3` is a
  product with a negation.
- `5 ft 3 in` is an error; write `5 ft + 3 in`.
- `2e -19 C` is two elementary charges less 19 coulombs, with no
  error, and `2e` is `2 e`; the number is `2e-19`.
- `kg(m/s)` is a call; the product is `kg (m/s)`. `tempC (1)` is a
  product; the call is `tempC(1)`.
- `^` takes a literal exponent, once: `m^x`, `m^(1/2 + 1)` and `m^2^3`
  are errors.
- `m2` is a name and `m²` an error; the square is `m^2`. Names are
  case-sensitive: `Ft` is not `ft`.
- `dB` is a tenth of a byte, and `at` an attotonne (Names, above).
- `1 m + 0` is an error: `0` is a plain number, not a length.
- `1,000` and `1 000` are errors; write `1000`. A decimal comma is an
  error too: write `2.54`, not `2,54`.
```

Links to add once the foundation pages exist (§6.8): "must conform" to `quantities.md`; "read exactly" and the literal limits to `numbers.md`; "so what it copies reads back" to `numbers.md`, which states the principle (§12, question 11); the conversion into a function and the unit list rules of "The two fields" to `quantities.md`. Nothing above links to a page that does not exist yet.

### devdocs/architecture.md#Expressions

Old (lines 377-378):

```text
call, and a space makes a product, so `kg (m/s)` stays the product it
always was and `kg(m/s)` is a call of `kg`, which the evaluator rejects
```

New:

```text
call, and a space makes a product, so `kg (m/s)` is a product and
`kg(m/s)` is a call of `kg`, which the evaluator rejects
```

Old (lines 386-388):

```text
`m 2`, `1 2 3` and `2 3 m` are errors, and multiplying numbers is
written with `*`. In the tree it is an ordinary multiplication,
indistinguishable from `*`.
```

New:

```text
`m 2`, `1 2 3` and `2 3 m` are errors, and multiplying numbers is
written with `*`.
```

Old (lines 405-408):

```text
nothing formed, and the evaluator takes the quotient where the
significand limit applies. The parser has no context, and a reduction
there took seconds on long literals and minutes at the hard bound, on
every keystroke. A unit name is a letter or underscore followed by
```

New:

```text
nothing formed, and the evaluator takes the quotient where the
significand limit applies. The parser has no context to bound a
reduction by: reducing there would run Euclid's gcd at the hard bound
on every keystroke, far too slowly for long literals, so the evaluator
reduces the exponent within the significand limit in force instead. A
unit name is a letter or underscore followed by
```

Old (lines 415-416):

```text
The tree has six kinds of node: a number, a unit name, a binary
operation (a sum, difference, product or quotient) of two subtrees, a
```

New:

```text
The tree has six kinds of node: a number, a unit name, a binary
operation (a sum, difference, product, quotient or juxtaposition) of
two subtrees, a
```

Old (lines 426-430):

```text
The grammar's levels of binding and its binary operators are data in
`src/core/expr.ts` (`LEVELS`, `BINARY`): the two left-associative levels
of the parser are built from the table, and the printer,
`src/core/print.ts`, writes a tree back by it, so the two cannot
disagree. Juxtaposition is its own operator in the tree, `juxtapose`,
```

New:

```text
The grammar's levels of binding and its binary operators are data in
`src/core/expr.ts` (`LEVELS`, `BINARY`): the two left-associative levels
of the parser are built from the table, and the printer,
`src/core/print.ts`, places its parentheses by it, so the two cannot
disagree on an operator's level or symbol. The rest of the grammar, the
negation, the power and the rule that a number only starts a product,
is written in each, and the property test described below keeps the
two in step. Juxtaposition is its own operator in the tree, `juxtapose`,
```

When V2 pares the section (§12, question 24), the opening sentence's "docs/definitions.md describes it from the user's side" becomes a link to the expression reference once that page exists.

### devdocs/architecture.md#Parsing

Old (lines 512-519):

```text
  recursive alternative. (The call rule broke it once: a call and a
  name began alike, told apart only by a lookahead for `(`, so a nested
  call with an error in it cost `2^k` for `k` levels. A cut combinator,
  which commits an `alt` once a prefix has matched and would serve other
  grammars, was set aside for the fix: a committed failure skips every
  enclosing `alt`, `optional` and `many`, so a misplaced cut changes the
  meaning of valid input, where the local lookahead has no such failure
  mode.)
```

New:

```text
  recursive alternative. A call and a plain name begin alike, and a
  lookahead for `(` alone would let the match back off to a shorter
  name in front of the `(`: a call whose argument list fails would then
  be read again as a name before a parenthesized factor, and a nested
  call with an error in it would cost `2^k` for `k` levels. The plain
  name's lookahead therefore includes the name's own characters, which
  keeps each level to a constant. A cut combinator, which commits an
  `alt` once a prefix has matched and would serve other grammars, is
  not used for this: a committed failure skips every enclosing `alt`,
  `optional` and `many`, so a misplaced cut changes the meaning of
  valid input, where the local lookahead has no such failure mode.
```

Old (lines 551-553):

```text
that was recognized and rejected, with the reason. Spans are attached
with `spanned` on the leaves, and a composite node spans from its first
child to its last.
```

New:

```text
that was recognized and rejected, with the reason. Spans are attached
with `spanned` on the leaves, and a composite node spans from its first
part to its last: a negation from its `-`, a call from its name to its
`)`, and an expression in parentheses with its parentheses, which is
what a message quotes.
```

### devdocs/architecture.md#Evaluation

Old (lines 580-581):

```text
instead and is `≈ 1`: `^` and `pow` disagree on such an exponent, which
[#88][88] tracks ([numbers.md](numbers.md), "Roots and powers"). A call resolves its
```

New:

```text
instead and is `≈ 1`: `^` and `pow` disagree on such an exponent
([numbers.md](numbers.md), "Roots and powers", which carries the open
issue). A call resolves its
```

With it, delete the reference-style definition for `[88]` at `devdocs/architecture.md:1119`, which nothing else on the page uses (`[92]` stays, for V2). If the owner would rather have the one link here (question 3), the sentence takes `[#88](https://github.com/bsidhom/exucal/issues/88)` inline instead, and `numbers.md` drops its link.

Old (lines 595-600):

```text
the edge the error names, and any other failure at the call. The
context goes to every power and every built-in, the operations that can
lose digits, and to every sum, which aligns within its significand
limit, and every literal's significand is checked against that limit;
everything else is exact, and every result is settled
([numbers.md](numbers.md), "Settling"). The primitives go to every sum,
```

New:

```text
the edge the error names, and any other failure at the call. Every
node is a step at the context, settled in exact mode and rounded once
in decimal mode ([numbers.md](numbers.md), "Settling"); the arithmetic
takes the context too, at every sum, which aligns within its
significand limit, at every product, quotient and power, whose exact
results are held to that limit and to the exponent bound, and at every
built-in, and every literal's significand is checked against the
limit; exact values are never rounded. The primitives go to every sum,
```

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "the converter", "the text typed into the converter" | `docs/definitions.md#(top)`, `#Expressions` (first sentence) | "the have and want fields", "the have" and "the want" (§8); "the converter" only for the two-field component (§12, question 2) |
| "quantities of the same thing", "the same test" | `docs/definitions.md#Expressions > + and -` | **conform**, glossed once as "quantities of the same thing" and linked to `quantities.md` (§8); the proposed text does so |
| "juxtaposition" without a gloss | `docs/definitions.md#Expressions` | keep, glossed once as "writing two factors side by side" (§8); the proposed text does so |
| "negation", "unary minus", "`-` before a product" | `docs/definitions.md#Expressions`; `devdocs/architecture.md#Expressions` | "negation", glossed once as "a `-` before a product" |
| "literal" (devdocs, code) against "number" (docs) for a decimal in the text | both | **number** in docs, **literal** in devdocs, mapped once in the expression reference |
| "parenthesized fraction" (docs), "parenthesized rational" (devdocs) for `m^(1/2)` | `docs/definitions.md:159`; `devdocs/architecture.md:401` | docs: "a decimal over an unsigned one, in parentheses", leaving "fraction" to the value's representation (§8); devdocs keep "rational" for the `Exponent` |
| "hard bound" | `devdocs/architecture.md#Expressions`, `#Parsing`; `src/core/rational.ts:115` | devdocs keep **hard bound**, defined once as the largest significand limit the settings allow; docs say "the largest significand limit the settings allow" (`src/settings.ts:471-474`), which the numbers page can name once |
| "rejection", "rejected" (the parser's `check`) beside "refusal" (§8) | `devdocs/architecture.md#Parsing`; `src/core/parser.ts:194-215` | devdocs keep "rejection" for text the parser recognized and refused; docs call a literal past the limits at parse "an error as it is typed" and keep **refusal** for the three size refusals of evaluation |
| "a unit name", the parse messages' label for any name, a function's in a call included | `src/core/expr.ts:335`, `:348`, `:420` | docs: "name"; aligning the label to "a name" is a code change for the owner (question 5) |
| "canonical text", "the printed form" | `devdocs/architecture.md#Expressions`; `src/core/print.ts` | docs: "how the app writes an expression back" (C5's owner); "canonical" devdocs-only |
| "dimensionless quantity" for a number | `devdocs/architecture.md#Evaluation`; `src/core/evaluate.ts:13` | consistent with §8 (a plain scalar); no change |

## Questions for the owner

1. **The grammar in the module header.** §2.1.3 says no EBNF for expressions exists anywhere, but `src/core/expr.ts:6-19` holds one, accurate against the parser, and `src/core/definitions.ts:20-32` one for the definition lines. Should the pages point to it? Proposed answer: `docs/` keeps prose and the precedence table, as §2.1.3 decides; `devdocs/architecture.md#Expressions` names the header grammar as the hand-maintained form until the DSL generates one, quoting none of it, so that the header stays the one copy.
2. **GNU units and the precedence.** `devdocs/architecture.md:354-355` says the precedence follows GNU units and `src/core/expr.test.ts:150` repeats it; nothing in the tree confirms it. Proposed answer: devdocs keep one clause as the rationale, a familiar convention for `kg m / s^2`; the user reference says nothing of GNU units for the grammar (§12, question 2), since a likeness stated there would owe the differences (`|` and `**` are errors here).
3. **Where issue 88 is linked** (§12, question 26). `devdocs/numbers.md:480` links it beside issue 89, and `devdocs/architecture.md#Evaluation` links it again. Proposed answer: `numbers.md` keeps the one link, in the passage that owns the mechanism; `#Evaluation` refers to that section without one, as the edit above does; the user reference states the current difference without a link; and the generated `pow` entry inherits whatever its structured comment says.
4. **Typographic characters.** §12, question 11 keeps `×` out of the grammar for now, and §1.3 records accepting it as intent. The proposed text lists `×`, `·`, `÷`, `−`, superscripts and non-breaking spaces among the errors. Should the intent, when `devdocs/future.md` records it, cover those too? Proposed answer: yes, as one intent: accept the characters the screen or pasted text produces where each has one meaning (`×`, `·`, `−`, non-breaking and thin spaces), and keep `÷` and superscripts out unless asked for.
5. **The label "a unit name".** The parser labels every name, a function's included, "a unit name", by design so that a call and a name are not listed apart (`src/core/expr.ts:342-349`). Proposed answer: rename the label to "a name" in a code change of its own; the order of the labels is the order tried and can stay.
6. (D2's territory.) `docs/definitions.md#Functions` restates the call rule and the arity error of `#Expressions > A call` (§2.1.1 lists both); proposed answer: `#Functions` keeps the function semantics and points to the call bullet.
7. (D3's and A9's territory.) The definitions file has no unit `a` (the are is `are`), and `at` reads as an attotonne; proposed answer: the units guide notes both, and Q9's "`u`, `at` are absent" gains "`at` reads as `a` + `t`".
8. (V2's territory.) `devdocs/architecture.md:495-503` says an alternative fails after consuming input "in two ways only", omitting a parenthesized expression that fails inside (`(2 m`), the last alternative of its `alt` (`src/core/expr.ts:429-433`), so the cost argument holds; proposed answer: name it as the third case.
9. (The decimal-mode unit's territory, N17.) A literal past the significand limit is refused in decimal mode too (`src/core/evaluate.ts:510-519`), so "rounded as read" holds within the limit; proposed answer: one clause in the decimal-mode rules, and the literal-limits text above says "in both modes".

## Notes on this run

This report merges two runs of the unit, read side by side, with every citation re-read against the checkout and the few errors of the runs removed: one run had checked the issue's state outside the checkout, which this report does not rely on, and had tagged two factual corrections as stale passages; the other had verified claims of other units' assignments under Claims, repeated the page's "there is no `+`" beside `m^+2` in its proposed text, and linked that text to pages that do not exist yet. No claim of section 1 is assigned to D1, so the Claims section reads as the template asks, and the unit's required output, the prose verified, sits under Findings. The plan's module list falls short of the output: the want-field grammar needs `src/core/pipeline.ts` and `src/outcome.ts`, the claims of `#Names` need `src/core/names.ts`, `src/core/table.ts` and `src/core/build.ts`, the arity claims need two built-ins, and the property test lives in `src/core/print.test.ts`, with `src/testing/expr.ts` only the tree generator; all are under Also read. §2.1.3 says no EBNF for expressions exists; a sketch is the header comment of `src/core/expr.ts`, which the generated grammar will replace, and the precedence table here was derived from the parser rather than from it. The hardest call was where the want-field grammar, the errors and the readings to watch go before `docs/expressions.md` exists: the proposed text extends the current `#Expressions` section with subsections, ready to move, adds no link to a page that does not exist yet, and lists the links to add under §6.8. D2 should know that comparisons and `#` comments live only in `src/core/definitions.ts`, that the call rule is stated twice in `docs/definitions.md`, and that it shares `#Names` and owns the function-name and list-name checks at build; D3, that there is no unit `a`, that `at` reads as an attotonne, and that both micro signs, U+00B5 and U+03BC, are defined as prefixes (`src/units.txt:72-73`), so the lookalike is not a pitfall; V2, that the stale passages of `devdocs/architecture.md#Expressions`, `#Parsing` and `#Evaluation` are tagged here, that the `[92]` link stays for it, that the opening sentence of `#Expressions` becomes a link to the expression reference once that page exists (§12, question 24), and that the header of `src/core/pipeline.ts` calls `2 tempC` an unknown unit where the code answers otherwise, a code comment outside the audit's scope.
