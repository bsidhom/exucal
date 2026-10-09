# Unit D1: Expression language (opus)

- Plan revision: 98b7531
- Date: 2026-10-09
- Model: unknown
- Doc sections read: `docs/definitions.md#Expressions`, `docs/definitions.md#Names`; `devdocs/architecture.md#Expressions`, `devdocs/architecture.md#Parsing`, `devdocs/architecture.md#Evaluation`
- Modules read: `src/core/expr.ts`, `src/core/parser.ts`, `src/core/print.ts`, `src/core/evaluate.ts`, `src/messages.ts`, `src/testing/expr.ts`
- Also read: `src/core/print.test.ts` (the property test) and `src/core/expr.test.ts`, as evidence; `src/core/names.ts` and `src/core/table.ts` (name resolution, for `#Names`); `src/core/pipeline.ts` (its header, `convertText`, `convertParsed`, `evaluateExpr`: how the want is read and which error comes first); `src/outcome.ts` (`outcomeOf`, `copyText`) and the first hundred lines of `src/outcome.test.ts` (the harness); `src/unit-converter.ts` (the fields, and how an error marks one); `src/core/build.ts` (`BuildError`, `ambiguousName`, `prefixedName`, the primitives); `src/core/definitions.ts` (its header grammar, imports, comparators and comment rule); `src/core/quantity.ts` and `src/core/dimension-of.ts` (signatures and the call of `reduceExponent`, by search); `src/units.txt` (single definitions, by search); `docs/README.md:1-14`, `docs/settings.md:145-156`, `docs/definitions.md:210-222` and searches of `docs/` (to confirm the gaps of §6.3); issue #88 on GitHub (its state)

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 64 |
| Claims corrected | 9 |
| Claims not verifiable here | 1 |
| Stale passages: update / keep as intent / drop | 4 / 2 / 1 |
| Gaps confirmed / refuted / new | 7 / 1 / 5 |
| Proposed edits | 11 |
| Questions for the owner | 6 |

## Claims

No claim of section 1 is assigned to D1; its output is the prose of its sections verified, so the rows are the statements of those sections, in the order the plan lists the sections and then in page order. "Harness" means `outcomeOf` (`src/outcome.ts:194-217`) over the system table built as `src/outcome.test.ts:38-54` builds it, at the default settings, run from a scratch script outside the tree; a tree is what `parseExpr` returns.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| `docs/definitions.md#Expressions` (top): "A body, like the text typed into the converter, is a small expression language" | confirmed | `src/core/expr.ts:1-4` (`parseExpr`: "what the user types as `have` and `want`, and what the body of a unit or prefix definition is"); `src/core/definitions.ts:90-98` (imports `expr`, `unitListOf`) | It also serves annotations, the terms of conditions and function bodies (`src/core/definitions.ts:24-31`); the want adds `;` (`src/core/expr.ts:252-264`). |
| `#Expressions > Numbers`: unsigned decimals with an optional exponent, "read exactly" | confirmed | `src/core/expr.ts:287` (`UNSIGNED`), `src/core/expr.ts:297-315` (`decimal`, through `parseDecimal`); `src/core/expr.test.ts:373-382` | Also `5.` and `2E+2` (`src/core/expr.test.ts:377`, `src/core/expr.test.ts:380`). |
| `#Expressions > Numbers`: "A sign is part of a number only in its exponent" | confirmed | `src/core/expr.ts:287-288` (`UNSIGNED`, `SIGNED`), `src/core/expr.ts:494-501` (`signed`); `src/core/expr.test.ts:233-241`, `src/core/expr.test.ts:384-394` | The exponent belongs to the literal only without a space: `2e -19 C` is `2 e - 19 C` (`src/core/expr.test.ts:236`, `src/core/expr.test.ts:396-400`). |
| `#Expressions > Juxtaposition`: a number only as the first factor; `m 2` and `2 3 m` are errors | confirmed | `src/core/expr.ts:429-435` (`unitAtom` holds no number), `src/core/expr.ts:489-492` (`product`); `src/core/expr.test.ts:131-147` | A number in parentheses may follow: `2 (3)` (`src/core/expr.test.ts:586`). |
| `#Expressions > * and /`: one level, left to right; juxtaposition binds tighter | confirmed | `src/core/expr.ts:214-223` (`BINARY`), `src/core/expr.ts:503-506` (`quotient`); `src/core/expr.test.ts:149-163` | None. |
| `#Expressions > + and -`: one level, left to right, loosest; the three examples | confirmed | `src/core/expr.ts:218-219`, `src/core/expr.ts:508` (`sum`); `src/core/expr.test.ts:165-180` | None. |
| `#Expressions > + and -`: the sides must pass the test the have and the want pass; `1 m + 1 s`, `1 rad + 1`, `1 m + 0` are errors | confirmed | `src/core/evaluate.ts:548-572` (`nonconformingOperands`); `src/messages.ts:109-117`; harness: `Cannot add "1 rad" and "1": "1 rad" (radian) and "1" (1) differ in kind: radian.` | The canonical word is "conform" (§8). |
| `#Expressions > - before a product`: tighter than `*` and `/`, looser than juxtaposition and `^`; `-2^2` is `-4` | confirmed | `src/core/expr.ts:192-199` (`LEVELS`), `src/core/expr.ts:494-501` (`signed`); `src/core/expr.test.ts:182-203` | None. |
| `#Expressions > - before a product`: "It does not stack (`--2` is an error; write `-(-2)`)" | confirmed | `src/core/expr.ts:495-501`; `src/core/expr.test.ts:214-222` | A negation may follow `+`, `-`, `*` or `/`: `2 - -3` is `5` (`src/core/expr.test.ts:205-212`). |
| `#Expressions > - before a product`: "there is no `+` in front of anything" | corrected | `src/core/expr.ts:288` (`SIGNED` takes `+`); `src/core/expr.test.ts:218-219`, `src/core/expr.test.ts:265`, `src/core/expr.test.ts:277`, `src/core/expr.test.ts:380` | There is no unary `+`: `+2` is an error. A `+` sign is accepted only in a literal's exponent (`2E+2`) and as the sign of a `^` exponent (`m^+2`, `m^(+3/2)`). |
| `#Expressions > ^`: a signed decimal or a parenthesized fraction, never an expression | confirmed | `src/core/expr.ts:437-470` (`exponent`); `src/core/expr.test.ts:262-284`, `src/core/expr.test.ts:345-350` | The second literal takes no sign (`m^(1/-2)` is an error); one literal may stand alone in parentheses (`m^(2)`); a zero divisor is an error as typed (`src/core/expr.test.ts:352-361`). |
| `#Expressions > ^`: "It binds tightest, so `m^2 - 1` is `(m^2) - 1`" | confirmed | `src/core/expr.ts:472-487` (`raised`); `src/core/expr.test.ts:224-231`, `src/core/expr.test.ts:251-257` | A factor takes one exponent: `m^2^3` is an error (`src/core/expr.test.ts:363-368`); `m^1/2` is `(m^1)/2` (`src/core/expr.test.ts:254`). |
| `#Expressions > Parentheses`: "group" | confirmed | `src/core/expr.ts:382-385` (`parenthesized`); `src/core/expr.test.ts:243-249` | A `;` never stands inside (`src/core/expr.test.ts:706-715`). |
| `#Expressions > A call`: a name directly followed by parentheses, arguments separated by commas | confirmed | `src/core/expr.ts:347-349` (`callName`), `src/core/expr.ts:387-406` (`argumentList`, `call`); `src/core/expr.test.ts:550-570` | None. |
| `#Expressions > A call`: another number of arguments "is an error that says how many" | confirmed | `src/core/evaluate.ts:668-679` (`arityMismatch`, before any argument is evaluated); `src/messages.ts:118-119`; harness: `"tempC" takes 1 argument, but "tempC(1, 2)" gives 2 arguments.` | None. |
| `#Expressions > A call`: "`kg (m/s)` is a product, and `kg(m/s)` is a call of `kg`, which is not a function and says so" | confirmed | `src/core/expr.ts:418-422` (`plainName`); `src/core/table.ts:215-225` (`notAFunction`); `src/messages.ts:83-89`; `src/core/expr.test.ts:581-587` | None. |
| `#Expressions` (last paragraph): `1/12 year` is `1 / (12 year)`, `1 m + 1/2 m` is an error, and the rewrites given | confirmed | `src/core/expr.test.ts:153`, `src/core/expr.test.ts:176`; harness: `Cannot add "1 m" and "1/2 m": "1 m" has dimension m, but "1/2 m" has dimension 1 / m.` | None. |
| `#Expressions` (last paragraph): "The one thing to watch is a fraction before a unit" | corrected | `src/core/expr.test.ts:236`, `src/core/expr.test.ts:254`, `src/core/expr.test.ts:363-368`; harness (Findings, the readings to watch) | A fraction before a unit is one of several readings to watch, with `m^1/2`, `-2^2`, `5 ft 3 in`, `2e -19 C`, `kg(m/s)`, `m²`, and a prefix that makes a familiar symbol another unit (`dB`, `at`). |
| `docs/definitions.md#Names`: "a letter or underscore followed by letters, digits and underscores, in any script"; `°`, `%` and `'` cannot be | corrected | `src/core/expr.ts:290` (`NAME = /[\p{L}_][\p{L}0-9_]*/u`); `src/core/expr.test.ts:437-456`; harness: `m²`, `H₂O`, `x١` and an `Å` typed as `A` and a combining ring are errors | A name is a letter of any script or an underscore, followed by letters, the digits `0` to `9` and underscores; superscripts, subscripts, other digits, combining marks and symbols are not name characters. |
| `#Names`: case-sensitive, and "read as long as they go, so `m2` is the name `m2`" | confirmed | `src/core/names.ts:50-56` (exact `Map` reads); `src/core/expr.ts:418-422`; `src/core/expr.test.ts:443-447`; harness: `1 Mm = 1e+9 mm`, `Unknown unit "m2".` | None. |
| `#Names`: the unit of that name, else one prefix followed by a unit (`km`, `kilometre`) | confirmed | `src/core/names.ts:45-59` (`resolveName`); `src/core/table.ts:184-213` (`unitLookup`); harness: `1 kilometre = 1000 m` | None. |
| `#Names`: "An exact name always wins, so `min` is the minute and not `m` + `in`" | confirmed | `src/core/names.ts:50-51`; `src/units.txt:233` (`min 60 s`) | None. |
| `#Names`: "`ha` is defined as the hectare even though `h` + `a` would give the same" | corrected | `src/units.txt:248-250` (`ha`, `hectare`, `are 100 m^2`); harness: `Unknown unit "a".` | `ha` is the hectare by its own definition; the are is `are` and no unit `a` exists, so `h` + `a` would read as nothing and `ha` does not illustrate the rule. |
| `#Names`: prefixes do not stack (`kkm`); no plural handling (`inches`) | confirmed | `src/core/names.ts:52-57`; harness: `Unknown unit "kkm".`, `Unknown unit "inches".` | None. |
| `#Names`: prefixes and units are separate namespaces (`m-` and `m`) | confirmed | `src/core/names.ts:45-49`; `src/core/table.ts:54-57` (`prefixes`, `units`) | None. |
| `#Names`: a function's name is looked up exactly; `ktempC(1)` is a call of nothing | confirmed | `src/core/table.ts:234-243` (`resolveFunction`); `src/messages.ts:84-86`; harness: `Unknown function "ktempC".` | None. |
| `#Names`: "a function's name may not itself read as a prefix followed by a unit" | confirmed | `src/core/build.ts:309-330` (`prefixedName`) | The build checks the names of unit lists and of built-ins the same way. |
| `#Names`: a name read as two prefix-unit pairs is an error when the file is loaded | confirmed | `src/core/build.ts:305-308` (`ambiguousName`); `src/core/names.ts:61-94` (`findAmbiguity`) | None. |
| `#Names`: `u` and `at` are missing for that reason; `Da`, `amu`, `technicalatmosphere` are there | corrected | `src/units.txt:68-69` (`da-`, `d-`), `src/units.txt:74` (`u-`), `src/units.txt:78` (`a-`), `src/units.txt:136` (`t`), `src/units.txt:257` (`au`), `src/units.txt:267-269` (`Da`, `amu`), `src/units.txt:309` (`technicalatmosphere`); harness: `Unknown unit "u".`, `1 at = 1e-15 kg` | Neither symbol is defined, for that reason; typed anyway, `u` is an unknown unit and `at` reads as `a` + `t`, an attotonne. |
| `devdocs/architecture.md#Expressions`: "One grammar serves both definition bodies and user input" | confirmed | `src/core/expr.ts:1-4`, `src/core/expr.ts:379-380` (`expr`, "for embedding in another grammar"); `src/core/definitions.ts:90-98` | None. |
| `#Expressions`: "The precedence follows GNU units" | not verifiable here | `src/core/expr.test.ts:150` ("As in GNU units: the first `/` starts the denominator of what follows") repeats it; the tree holds no grammar of GNU units | Question 2. |
| `#Expressions`: the levels and their associativity, the negation and "there is no unary `+`" (lines 355-362) | confirmed | `src/core/expr.ts:192-223`, `src/core/expr.ts:494-508`; `src/core/expr.test.ts:149-222` | None. |
| `#Expressions`: a unit list is not an expression; `parseUnitList`; the list grammar over any item parser | confirmed | `src/core/expr.ts:252-264`, `src/core/expr.ts:513-529` (`unitListOf`); `src/core/definitions.ts:306`; `src/core/expr.test.ts:690-741` | None. |
| `#Expressions`: a call is an atom; `2 tempC(100)`, `tempC(100)^2`, `-tempC(100)` | confirmed | `src/core/expr.ts:429-435`; `src/core/expr.test.ts:572-579`; harness: `2 tempC(100) = 746.3 K` | None. |
| `#Expressions`: the comma appears nowhere else; the count of arguments is the evaluator's | confirmed | `src/core/expr.ts:387-392`; `src/core/evaluate.ts:668-679`; `src/core/expr.test.ts:624-628` | None. |
| `#Expressions`: the lexical call rule; the evaluator's message shows the product with the space | confirmed | `src/core/expr.ts:347-349`, `src/core/expr.ts:418-422`; `src/core/table.ts:215-225`; `src/messages.ts:83-89` | The wording "stays the product it always was" is tagged under Stale passages. |
| `#Expressions`: "That is the one whitespace-sensitive rule in the grammar" | confirmed | `src/core/expr.ts:51-56` | Below the grammar a space ends a token, which users meet as `2e -19` and `m^- 1`. |
| `#Expressions`: "The tree holds a call as the name with its own span and its arguments" | confirmed | `src/core/expr.ts:161-167` (`nameSpan`) | None. |
| `#Expressions`: juxtaposition "In the tree it is an ordinary multiplication, indistinguishable from `*`" | corrected | `src/core/expr.ts:130-136`, `src/core/expr.ts:222` (`juxtapose`); `src/core/evaluate.ts:574-583`; `src/core/print.ts:95-103` | In the tree, juxtaposition is its own operator, `juxtapose`, which the evaluator multiplies as it does `*` and the printer writes back with a space. |
| `#Expressions`: where a `-` belongs; "A number is never negative in the tree" | confirmed | `src/core/expr.ts:287-288`, `src/core/expr.ts:494-501`; `src/core/expr.test.ts:224-241`, `src/core/expr.test.ts:384-394` | None. |
| `#Expressions`: the exponent travels as two literals, each formable within the hard bound, a zero divisor rejected, the quotient taken by the evaluator | confirmed | `src/core/expr.ts:138-147` (`Exponent`), `src/core/expr.ts:317-331` (`exponentLiteral`), `src/core/expr.ts:437-470`; `src/core/evaluate.ts:1217-1251` (`reduceExponent`); `src/core/expr.test.ts:286-315`, `src/core/expr.test.ts:352-361`, `src/core/expr.test.ts:402-432` | None. |
| `#Expressions`: a unit name's characters, taken as long as it goes; "Whitespace is spaces and tabs, never a newline" | confirmed | `src/core/expr.ts:274-275` (`ws`), `src/core/expr.ts:290` (`NAME`); `src/core/expr.test.ts:437-469` | Digits are `0` to `9` only, as under `#Names`. |
| `#Expressions`: "The tree has six kinds of node" | confirmed | `src/core/expr.ts:149-167` (`ExprNode`); `src/core/print.test.ts:153-174` | The binary operation includes juxtaposition, a fifth operator. |
| `#Expressions`: every node carries the span of text it came from | confirmed | `src/core/expr.ts:91-94`, `src/core/expr.ts:121` | None. |
| `#Expressions`: `LEVELS` and `BINARY` build the parser's levels and drive the printer, "so the two cannot disagree" | corrected | `src/core/expr.ts:360-370` (`operatorsAt`), `src/core/expr.ts:486-508`; `src/core/print.ts:14-23`, `src/core/print.ts:92-119`; `src/core/print.test.ts:134-151` | The binary operators' levels and symbols are shared data, so the parser and the printer cannot disagree on an operator; the nesting of the levels, the negation, the power and the rule that a number only starts a product are written in each, and the property test keeps the two in step. |
| `#Expressions`: the printer's canonical text, and "The printer never changes a tree" | confirmed | `src/core/print.ts:1-29`, `src/core/print.ts:83-129`, `src/core/print.ts:165-175` (`isFraction`); `src/core/print.test.ts:48-79` | A tight quotient's first literal may be negated (`-1/3`); a right factor that leads with a number is parenthesized (`2 (3 m)`, `src/core/print.test.ts:96-117`). |
| `#Expressions`: the output is pieces, and `text` joins them | confirmed | `src/core/print.ts:42-61` (`Piece`, `text`); `src/core/print.test.ts:119-132` | None. |
| `#Expressions`: "A property test prints random trees (`src/testing/expr.ts`) and parses them back" | confirmed | `src/core/print.test.ts:134-151`; `src/testing/expr.ts:30-75` (`randomExpr`) | It also checks that printing the tree read back gives the same text. |
| `devdocs/architecture.md#Parsing`: the furthest expectation, so that `3 m ^` says "expected a number or `(`" after the `^` | confirmed | `src/core/parser.ts:264-284` (`alt`), `src/core/parser.ts:372-386` (`merged`, `further`); `src/core/expr.test.ts:520-527`; `src/messages.ts:71-76`; harness: `Unexpected end of input: expected a number or "(".` | None. |
| `#Parsing`: "Rejection is final" | confirmed | `src/core/parser.ts:200-215` (`check`), `src/core/parser.ts:279`, `src/core/parser.ts:304`; `src/core/parser.test.ts:223` | None. |
| `#Parsing`: a literal past the hard bound or the exponent bound "becomes a parse error pointing at the literal" | confirmed | `src/core/expr.ts:297-315`; `src/core/expr.test.ts:402-432`; `src/messages.ts:77-78`, `src/messages.ts:316-328` (`describeRejection`) | The bound reads the value's power of ten as scientific notation writes it: `0.001e1000000000000000003` parses and `12e1000000000000000000` does not (harness). |
| `#Parsing`: `check` is the only source of `rejected` errors; the grammar's `Rejection` is worded by `src/messages.ts` | confirmed | `src/core/parser.ts:194-199`; `src/core/expr.ts:169-178` (`Rejection`); `src/messages.ts:316-328` | None. |
| `#Parsing`: a parse error is nothing acceptable at a position, or text recognized and rejected | confirmed | `src/core/parser.ts:55-63` (`ParseError`); `src/messages.ts:71-78` | None. |
| `#Parsing`: "a composite node spans from its first child to its last" | corrected | `src/core/expr.ts:93-94`, `src/core/expr.ts:382-385`, `src/core/expr.ts:395-406`, `src/core/expr.ts:497-499`; `src/core/expr.test.ts:484-515`, `src/core/expr.test.ts:589-610` | A composite node spans from its first part to its last: a negation from its `-`, a call from its name to its `)`, and an expression in parentheses with its parentheses. |
| `devdocs/architecture.md#Evaluation`: `evaluate` takes an `Expr`, a `Lookup`, the `Primitives` and the working `NumberContext` and returns a `Quantity` | confirmed | `src/core/evaluate.ts:400-406` | It also takes an optional collector of the conditions a call assumes. |
| `#Evaluation`: a number is a dimensionless quantity, and the operators are the quantity arithmetic | confirmed | `src/core/evaluate.ts:505-664` (`evaluateNode`) | None. |
| `#Evaluation`: `^`'s exponent made a fraction within the significand limit (`reduceExponent`, also under `dimensionOf`); `2^(1e30/1e30)` is `2`, `2^1e-30000` refused, `pow(2, 1e-30000)` is `≈ 1` | confirmed | `src/core/evaluate.ts:599-624`, `src/core/evaluate.ts:1217-1251`; `src/core/dimension-of.ts:46`, `src/core/dimension-of.ts:140`; harness: `2^(1e30/1e30) = 2`, `pow(2, 1e-30000) ≈ 1` | None. |
| `#Evaluation`: "`^` and `pow` disagree on such an exponent, which `[#88][88]` tracks" | confirmed | `src/core/evaluate.ts:24-26` ("the disagreement is #88"); harness: `"2^1e-30000" would need a significand of about 99,659 bits, past the significand limit, however it is computed.`; issue #88 is open | The link is reference-style, outside the Markdown subset (Proposed edits). |
| `#Evaluation`: the count of arguments checked before any argument; a defined function takes exactly its parameters | confirmed | `src/core/evaluate.ts:665-679`; `src/core/table.ts:260-266` (`arityOf`); harness: `tempC(bogus, 2)` reports the count, not the unknown unit | None. |
| `#Evaluation`: a defined function's arguments checked to conform, then its body evaluated with the parameters bound by position | confirmed | `src/core/evaluate.ts:690-719`, `src/core/evaluate.ts:763-770`, `src/core/evaluate.ts:1095-1125` (`evaluateBound`) | The function's conditions are checked between the two (`src/core/evaluate.ts:720-762`). |
| `#Evaluation`: a built-in's dimension rule (`builtinArgument` at the call), `domainError` at the call, `unresolved` at the argument, any other failure at the call | confirmed | `src/core/evaluate.ts:799-884` (`applyBuiltin`); harness: `"90 deg" cannot be told from a pole of the function at this precision, …`, `Cannot compute "ln(-1)": …` | None. |
| `#Evaluation`: "The context goes to every power and every built-in, … and to every sum …; everything else is exact" | corrected | `src/core/evaluate.ts:520-533`, `src/core/evaluate.ts:551-556`, `src/core/evaluate.ts:574-596`, `src/core/evaluate.ts:628-632`, `src/core/evaluate.ts:658-663` (`stepQuantity` at every node); `src/core/quantity.ts:171-193` (`multiplyQuantities` and `divideQuantities` take the context) | Every node is a step at the context; the arithmetic takes the context at every sum (alignment within the significand limit), every product, quotient and power (exact results held to the significand limit and the exponent bound) and every built-in, and every literal's significand is checked against the limit. |
| `#Evaluation`: the primitives go to every sum; the same check, with the same roles, as conversion | confirmed | `src/core/evaluate.ts:32-35`, `src/core/evaluate.ts:548-572`, `src/core/evaluate.ts:702-717` (`checkConformance`) | None. |
| `#Evaluation`: the primitives come from the table for user input and from the definitions while the table is built | confirmed | `src/core/pipeline.ts:904-917` (`evaluateExpr`); `src/core/build.ts:331-334` (`declaredPrimitives`) | None. |
| `#Evaluation`: names resolved through a lookup; the table's applies the prefix rule, the build's evaluates definitions on demand | confirmed | `src/core/evaluate.ts:194-207` (`Lookup`); `src/core/table.ts:179-227` (`unitLookup`) | The build's lookup was read by its errors only (`src/core/build.ts:909`, `src/core/build.ts:941`). |
| `#Evaluation`: each lookup's own error type, returned unchanged; the spans given to the lookup; how `notAFunction` shows the product | confirmed | `src/core/evaluate.ts:400-406`, `src/core/evaluate.ts:526-527`, `src/core/evaluate.ts:666-667`; `src/core/table.ts:215-225`; `src/messages.ts:83-89` | None. |
| `#Evaluation`: operands left to right, the first failure ends it; `bogus / 0` reports the unknown unit | confirmed | `src/core/evaluate.ts:537-546`; harness: `Unknown unit "bogus".` | None. |
| `#Evaluation`: a division by zero, or by a value that cannot be told from zero, points at the divisor | confirmed | `src/core/evaluate.ts:584-595`; harness: `Division by zero in "0".` | None. |
| `#Evaluation`: a power's base that cannot be told from zero points at the base; any other failing power at the whole power | confirmed | `src/core/evaluate.ts:612-647`; harness: `Division by zero in "0^-1".`, `"(-4)^(1/2)" takes an even root of a negative value.` | None. |
| `#Evaluation`: a sum, product or quotient refused points at the whole operation; a literal past the significand limit at the literal | confirmed | `src/core/evaluate.ts:505-519`, `src/core/evaluate.ts:557-564`, `src/core/evaluate.ts:576-596`; harness: `"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. …` | None. |
| `#Evaluation`: a nonconforming sum points at the whole sum, with each operand's span and dimension as have and want | confirmed | `src/core/evaluate.ts:565-572`; `src/messages.ts:109-117` | None. |
| `#Evaluation`: a nonconforming argument points at the whole call and carries the argument's span | confirmed | `src/core/evaluate.ts:707-716`; `src/messages.ts:120-128`; harness: `Cannot apply "tempC" to "1 m": …` | None. |
| `#Evaluation`: a failing body is one `callFailed` at the call; a lookup failure inside a body comes back as any lookup failure does | confirmed | `src/core/evaluate.ts:771-788`, `src/core/evaluate.ts:1101-1125` | A body that fails under a condition the call assumed is an `undecidedCondition`, and a condition that certainly fails is a `conditionFailed` (`src/core/evaluate.ts:746-760`, `src/core/evaluate.ts:777-787`). |
| `#Evaluation`: "The evaluator never sees the text" | confirmed | `src/core/evaluate.ts:1-5` | None. |

## Stale passages

§1.1.5 and §9.4 have no rows for these sections; §1.2.5 has one.

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/architecture.md#Parsing` (lines 512-519; §1.2.5, confirmed) | "(The call rule broke it once: a call and a name began alike, told apart only by a lookahead for `(`, so a nested call with an error in it cost `2^k` for `k` levels. A cut combinator, … was set aside for the fix: …)" | keep as intent | A call and a plain name begin alike, and a lookahead for `(` alone would let the match back off to a shorter name in front of the `(`: a call whose argument list fails would then be read again as a name before a parenthesized factor, and a nested call with an error in it would cost `2^k` for `k` levels. The plain name's lookahead therefore includes the name's own characters, which keeps each level to a constant. A cut combinator, which commits an `alt` once a prefix has matched and would serve other grammars, is not used for this: a committed failure skips every enclosing `alt`, `optional` and `many`, so a misplaced cut changes the meaning of valid input, where the local lookahead has no such failure mode. |
| `docs/definitions.md#Expressions` (line 169) | "The one thing to watch is a fraction before a unit" | update | The readings to watch, as a list (Proposed edits, `docs/definitions.md#Expressions`, "Readings to watch"). |
| `docs/definitions.md#Names` (line 115) | "and `ha` is defined as the hectare even though `h` + `a` would give the same" | update | delete; the sentence ends "…so `min` is the minute and not `m` + `in`." |
| `devdocs/architecture.md#Expressions` (lines 377-378) | "so `kg (m/s)` stays the product it always was" | update | so `kg (m/s)` is a product |
| `devdocs/architecture.md#Expressions` (lines 387-388) | "In the tree it is an ordinary multiplication, indistinguishable from `*`." | drop | delete; the paragraph that begins "The grammar's levels of binding" states that juxtaposition is its own operator, `juxtapose`. |
| `devdocs/architecture.md#Expressions` (lines 406-408) | "The parser has no context, and a reduction there took seconds on long literals and minutes at the hard bound, on every keystroke." | keep as intent | The parser has no context to bound a reduction by: reducing there would run at the hard bound on every keystroke, far too slowly for long literals. |
| `devdocs/architecture.md#Evaluation` (lines 595-600) | "The context goes to every power and every built-in, the operations that can lose digits, and to every sum, … everything else is exact, and every result is settled" | update | Every node is a step at the context, settled in exact mode and rounded once in decimal mode `([numbers.md](numbers.md), "Settling")`; the arithmetic takes the context too, at every sum, which aligns within its significand limit, at every product, quotient and power, whose exact results are held to that limit and to the exponent bound, and at every built-in, and every literal's significand is checked against the limit. |

## Findings

**The precedence table, verified** against `LEVELS`, `BINARY`, the grammar and the property test:

| Level, loosest first | Construct | Grouping | Evidence |
| --- | --- | --- | --- |
| `;`, in the want only | the items of a unit list | not an expression; never inside parentheses | `src/core/expr.ts:513-529` (`unitListOf`, `unitList`); `src/core/expr.test.ts:706-741` |
| 1, `sum` | `+`, `-` | left to right | `src/core/expr.ts:218-219`, `src/core/expr.ts:508` |
| 2, `quotient` | `*`, `/` | left to right | `src/core/expr.ts:220-221`, `src/core/expr.ts:503-506` |
| 3, `signed` | one `-` before a product | does not stack; may follow `+`, `-`, `*`, `/` | `src/core/expr.ts:494-501`; `src/core/expr.test.ts:205-222` |
| 4, `product` | juxtaposition | left to right; a number only as the first factor | `src/core/expr.ts:222`, `src/core/expr.ts:489-492`; `src/core/expr.test.ts:131-147` |
| 5, `power` | one `^` and a literal exponent | one exponent per factor | `src/core/expr.ts:472-487`; `src/core/expr.test.ts:363-368` |
| 6, `atom` | a number, a name, a call, an expression in parentheses | none | `src/core/expr.ts:429-435` |

The printer places parentheses by the same `LEVELS` (`src/core/print.ts:131-147`, `bindsAtLeast`; `src/core/print.ts:177-183`, `tighter`), with one rule the levels do not express, a number after a factor (`src/core/print.ts:19-23`, `src/core/print.ts:96-103`). The property test (`src/core/print.test.ts:134-151`) prints 400 random trees from `src/testing/expr.ts` (every node kind and operator, literals in eight spellings, exponents with and without a denominator) and parses each back to the same tree and the same text. The expression, printer and parser suites pass at this revision. The hand-written grammar in the header of `src/core/expr.ts:6-19` matches the combinators of `src/core/expr.ts:379-529` production by production.

**The want-field grammar, verified.** The have is one expression (`parseExpr`, `src/core/pipeline.ts:463`), and a blank have computes nothing (`src/outcome.ts:200`). The want is read by its shape:

| The want holds | Read as | Evidence |
| --- | --- | --- |
| nothing, once trimmed | the have alone, in the primitives | `src/outcome.ts:246-273` |
| one bare name of a unit list | that list | `src/core/pipeline.ts:505-517` |
| one bare name of a function | conversion into the function | `src/core/pipeline.ts:518-528` |
| any other single expression, a number or a call in it included | a unit; the answer is the ratio | `src/core/pipeline.ts:529-548`; harness: `300 K` into `tempC(1)` is `300 K ≈ 1.0942914 tempC(1)` |
| two or more expressions separated by `;` | a unit list typed out | `src/core/pipeline.ts:550-583`; `src/core/expr.ts:257-264` |

A failure of the have is reported before one of the want, even before a want that does not parse (`src/core/pipeline.ts:463-474`, `src/core/pipeline.ts:503-504`; harness: `bogus` into `ft;` reports `Unknown unit "bogus".`). A list's or a function's name typed with anything else is an unknown unit or "a function, not a unit" (`src/core/pipeline.ts:15-17`; harness: `2 time`, `time;s`, `2 tempC`). One edge is left out of the proposed text on purpose: a bare name in parentheses still counts as bare, since parentheses make no node (`src/core/expr.ts:382-385`; harness: `(time)` reads as the list).

**The readings to watch, verified** through the harness at the defaults:

| Typed | Read as | Output |
| --- | --- | --- |
| `1/12 year` as the want of `1 m` | `1 / (12 year)`, a frequency | `"1 m" has dimension m, but "1/12 year" has dimension 1 / s.` |
| `m^1/2` | `(m^1) / 2` | the tree `div(pow(m, 1), 2)` |
| `-2^2` | `-(2^2)` | the tree `neg(pow(2, 2))` |
| `2^3^2` | an error | `Unexpected "^": expected a unit name, "(", "*", "/", "+", "-" or end of input.` |
| `5 ft 3 in` | an error | `Unexpected "3": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.` |
| `2e -19 C` | `2 e - 19 C`, with no error | `2 e - 19 C ≈ -19 s A` |
| `kg(m/s)` | a call of `kg` | `"kg" is a unit, not a function. For a product, write "kg (m/s)", with a space.` |
| `pi ()` | an error | `Unexpected ")": expected a number, a unit name, "(" or "-".` |
| `m²`, `30°`, `50%` | errors | `Unexpected "²": …` and the like |
| `1 dB` | `d` + `B` | `1 dB = 0.8 bit` |
| `1 at` | `a` + `t` | `1 at = 1e-15 kg` |
| `1 m in ft` as the have | a volume | `1 m in ft = 0.00774192 m^3` |
| `1 m to ft`, `1 mile per hour` | unknown units | `Unknown unit "to".`, `Unknown unit "per".` |
| `1,000`, `2,54`, `1 000` | errors | `Unexpected ",": …`, `Unexpected "0": …` |
| `2 × 3`, `2 · 3`, `6 ÷ 2`, `2 − 3` | errors | `Unexpected "×": …` and the like |
| `2 m` typed with a non-breaking space | an error | `Unexpected " ": …`, where the quoted character is the non-breaking space |
| `x # comment`, `1 m ≤ 2 m`, `1 m = 2 m` | errors | `Unexpected "#": …`, `Unexpected "≤": …`, `Unexpected "=": …` |

**`×`, `#` and `≤`/`≥` in the fields** (§12, question 11). None is accepted. `×` is read by no rule of `src/core/expr.ts` and is no name character (`src/core/expr.ts:290`); the screen shows it for a product written with `*` (`src/core/print.ts:48-56`; `src/unit-converter.ts:283`) and the copy button writes `*` (`src/outcome.ts:167-169`), so only text selected by hand carries it back, as decided. `#` starts no comment in an expression (`src/core/expr.ts:6-19` has none); comments belong to the definitions file's lines (`src/core/definitions.ts:7`, `src/core/definitions.ts:614`). `≤` and `≥`, with `<`, `<=`, `>`, `>=` and `=`, belong only to the conditions of a function definition, where `≤` and `≥` read as `<=` and `>=` (`src/core/definitions.ts:31-32`, `src/core/definitions.ts:388-389`); an expression has no comparison (N16).

**Gaps of §6.3:**

| Gap | Verdict | Evidence |
| --- | --- | --- |
| A formal grammar and a precedence table | confirmed | neither is in `docs/`; the code holds a grammar in a comment, `src/core/expr.ts:6-19` (below) |
| The want field's own grammar | confirmed | `docs/definitions.md#Unit lists` and `#Functions` state lists and function wants apart; no page of `docs/` states the blank want, a want with a number, or a call as the want |
| Literal limits at parse and at evaluation | confirmed | only `docs/settings.md:152` ("a literal of more digits than the limit"); the limits at parse appear nowhere in `docs/` |
| Name resolution order in full | refuted | `#Names` states the exact name, the prefix and the exact call names, and `docs/definitions.md:293` that a parameter hides a unit; a defined function before a built-in never shows, since the build refuses a definition that takes a built-in's name (`src/core/build.ts:159-164`; `src/core/table.ts:62`) |
| Evaluation order and which operand an error points at | confirmed | nothing in `docs/` |
| Whitespace, and `×`, `≤`, `≥`, `#` in the fields | confirmed | nothing in `docs/`; settled above |
| The printed form | confirmed | `docs/README.md:9-12` says what the copy button writes; the canonical spacing, the parentheses and `×` on the screen appear nowhere in `docs/` |
| Parse errors and how they read | confirmed | nothing in `docs/` |
| New: readings to watch beyond a fraction before a unit | new | the table above |
| New: the have and the want as two grammars, and which error comes first | new | `src/core/pipeline.ts:463-474`, `src/core/pipeline.ts:505-584`; `src/outcome.ts:200`, `src/outcome.ts:246-273` |
| New: the characters of names and of whitespace | new | `src/core/expr.ts:274-275`, `src/core/expr.ts:290` |
| New: the literal forms beyond the four examples (`5.`, `2E+2`, a `+` in an exponent, no space inside a literal) | new | `src/core/expr.ts:287-288`; `src/core/expr.test.ts:373-382`, `src/core/expr.test.ts:396-400` |
| New: the forms and limits of a `^` exponent (one per factor, an unsigned second literal, formed within the significand limit, `^` against `pow`) | new | `src/core/expr.ts:437-470`; `src/core/evaluate.ts:599-624`, `src/core/evaluate.ts:1217-1251` |

**Read-only context contradicted** (reported, not rewritten):

- §2.1.3, "No EBNF for expressions appears anywhere": `src/core/expr.ts:6-19` holds an EBNF-style grammar of twelve productions, accurate against the parser, and `src/core/definitions.ts:20-32` one for the definition lines. Both are hand-maintained beside the code, the second source of truth §2.1.3 advises the docs against (question 1).
- §2.1.3, the printer "driven by the same table so 'the two cannot disagree'": true for the binary operators only (`src/core/expr.ts:360-370`; `src/core/print.ts:92-108`); the nesting, the negation and the power are written in each (`src/core/expr.ts:486-508`; `src/core/print.ts:111-119`). `LEVELS` and `BINARY` seed the DSL of §2.1.3 for the binary operators; the property test covers the rest.
- §2.1.1, "defined function before built-in": true of `resolveFunction` (`src/core/table.ts:234-243`) and never observable, the build keeping the two disjoint (`src/core/build.ts:159-164`).
- Q9, "`u`, `at` are absent for this reason": neither is defined, but `at` reads as `a` + `t`, an attotonne (`src/units.txt:78`, `src/units.txt:136`; harness `1 at = 1e-15 kg`), and `u` is an unknown unit while `u-` is a prefix (`src/units.txt:74`).
- N1, N4, N21–N24 and Q1–Q8 are not contradicted by these sections or modules. A literal's exponent bound reads the value's power of ten in scientific notation (`0.001e1000000000000000003` accepted, `12e1000000000000000000` refused), as N22's "a value's decimal exponent" says, and a literal past the significand limit is refused even inside `approx`, suggesting nothing, as N21 says.

**Code observations** (no change made):

- `src/core/parser.ts:18-20` says the error for `3 m ^` reads "expected a number"; it reads "expected a number or "("" (`src/core/expr.test.ts:524`).
- The rejection of a `^` exponent that divides by zero spans the blanks after the divisor, so the message quotes them: `m^(1/0 )` gives `"1/0 ": the exponent divides by zero.` (`src/core/expr.ts:450-463`; `src/core/expr.test.ts:357-360`).
- Parse messages label every name "a unit name", a function's in a call included, by design (`src/core/expr.ts:342-346`); the docs say "name" (Terminology).

## Proposed edits

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
not `m` + `in`. Prefixes do not stack (`kkm` is nothing), and there is
no plural handling (`inches` is nothing unless it is defined as an
alias). Prefixes and units are separate namespaces, which is how `m-`
(milli) and `m` (the metre), or `h-` (hecto) and `h` (the hour),
coexist. The rule can make a familiar symbol another unit: `dB` is
`d` + `B`, a tenth of a byte, and decibels are the function `decibel`.
Prefixes apply to units alone: the name of a function, defined in the
file or built into the app, is looked up exactly, so `ktempC(1)` is a
call of nothing, and the name of a function or a unit list may not
itself read as a prefix followed by a unit (see Functions below).

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

| Level | Construct | Example, and how it reads |
| --- | --- | --- |
| 1, loosest | sum and difference: `+`, `-` | `5 ft - 2 in + 1 in` is `(5 ft - 2 in) + 1 in` |
| 2 | product and quotient: `*`, `/` | `m/s*s` is `(m/s)*s` |
| 3 | negation: one `-` before a product | `-2 m / s` is `(-(2 m)) / s` |
| 4 | juxtaposition: factors side by side | `kg m / s^2` is `(kg m) / (s^2)` |
| 5 | power: one `^` and a literal exponent | `-2^2` is `-(2^2)` |
| 6, tightest | a number, a name, a call, an expression in parentheses | `2.54`, `ft`, `tempC(100)`, `(1/12)` |

In the want, `;` separates the items of a unit list and binds looser
than all of these (The two fields, below).

- **Numbers** are unsigned decimals, with an optional exponent: `2`,
  `2.54`, `.5`, `5.`, `1e-3`, `2E+2`. They are read exactly, so a unit
  defined by a decimal converts exactly. A sign is part of a number
  only in its exponent: `1e-3` is a thousandth, `1 - 3` is a
  difference, and `-2` is the negation of `2`. The exponent belongs to
  the number only when it is written without a space: `2e-19 C` is a
  number of coulombs, while `2e -19 C` is `2 e - 19 C`, since `e` is
  the elementary charge.
- **Literal limits.** A number with more digits than the significand
  limit holds is refused where it stands, even inside `approx`: its
  message says that it would need a significand past the significand
  limit, however it is computed. A number with more digits than the
  largest significand limit the settings allow, or whose power of ten
  passes 10^18 or falls below -10^18, is an error as it is typed: "this
  number is too large to represent", "this number's exponent passes
  10^18" or "this number's exponent falls below -10^18". The power of
  ten is the value's, as scientific notation writes it, not the exponent
  as typed: `0.001e1000000000000000003` is accepted, and
  `12e1000000000000000000` is not.
- **Names** are read as Names above describes: `m2` is one name, and
  `2m` is `2 m`.
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
  `2 m * 3 + 1 m` is `(2 m * 3) + (1 m)`. The two sides must conform, by
  the same test the have and the want must pass: `1 m + 1 s` is an
  error (length and time), and so are `1 rad + 1` (an angle and a plain
  number) and `1 m + 0`, since `0` is a plain number and not a length.
  A difference may be zero or negative.
- **`-` before a product** negates it: `-2 m` is minus two metres and
  `2 * -3` is minus six. It binds tighter than `*` and `/` and looser
  than juxtaposition and `^`, so `-2 m / s` is `(-(2 m)) / s` and
  `-2^2` is `-4`; write `(-2)^2` for `4`. A negation may follow `+`,
  `-`, `*` or `/` (`2 - -3` is `5`) but does not stack: `--2` is an
  error; write `-(-2)`. There is no unary `+`: `+2` is an error.
- **`^`** raises to a literal exponent, never an expression, so that
  the dimension of a power is known exactly: a signed decimal (`m^2`,
  `s^-1`, `m^+2`, `m^0.5`) or a quotient of two literals in
  parentheses, the second without a sign (`m^(1/2)`, `m^(-3/2)`). It
  binds tightest, so `m^2 - 1` is `(m^2) - 1` and `m^1/2` is
  `(m^1) / 2`. A factor takes one exponent: `2^3^2` is an error; write
  `(2^3)^2`. The sign of an exponent touches its digits: `m^-1` is a
  power, `m^- 1` an error, and `m -1` the difference `m - 1`. The
  exponent's numerator and denominator must fit the significand limit:
  `2^(1e30/1e30)` is `2`, while `2^1e-30000`, whose denominator would
  be `10^30000`, is refused, and `pow(2, 1e-30000)` is `≈ 1`; an
  exponent too large to form at all is an error as it is typed
  (`m^1e999999999`).
- **Parentheses** group any expression: `(1/12) year` is a twelfth of
  a year. A factor in parentheses may follow a number: `2 (3 m)` is
  `6 m`.
- **A call**, a name directly followed by parentheses (`tempC(100)`,
  `pi()`, `atan2(3 m, 4 m)`), applies a function to the expressions
  inside, separated by commas; Functions below describes it. A call
  stands where a name may: `2 tempC(100)`, `tempC(100)^2` and
  `-tempC(100)` mean what they look like. Each function takes its own
  number of arguments, and a call with another number is an error that
  says how many. The space matters: `kg (m/s)` is a product, `kg(m/s)`
  is a call of `kg`, which is not a function and says so, and `pi ()`
  is an error.
- **Whitespace** is spaces and tabs, any amount, between any two
  tokens. Any other space, such as a non-breaking space pasted from
  elsewhere, is an error, and its message shows what looks like a
  space.

### What an expression does not contain

There are no other operators, no comments and no comparisons. `×`,
`·`, `÷`, the typographic minus `−`, superscripts such as `²`, `°`,
`%`, `'`, `"`, `**`, `|`, `#`, `=`, `<`, `<=`, `>`, `>=`, `≤`, `≥`,
and a comma outside a call (`1,000`, `2,54`) are errors where they
stand. Comparisons belong to the conditions of a function definition,
and `#` to the comments of the definitions file.

### The two fields

The have is one expression; while it is blank, nothing is computed.
The want is read by its shape:

| The want holds | It is read as | Example |
| --- | --- | --- |
| nothing | the have alone, in the primitives | `1 in` gives `1 in = 0.0254 m` |
| the name of a unit list, alone | that list (Unit lists, below) | `time` |
| the name of a function, alone | the call that gives the have (Functions, below) | `tempF` |
| any other single expression | a unit, which may carry a number, be a sum or be a call | `in`, `1000 ft`, `tempC(1)` |
| two or more expressions separated by `;` | a unit list typed out | `ft;in`, `hr;min;s`, `ft;in/8` |

A `;` stands only between the items of the want: never in the have,
never inside parentheses, and never with an item missing (`ft;`, `;in`
and `ft;;in` are errors). The name of a unit list or a function means
the list or the function only alone: `2 time`, `time;s` and `2 tempC`
are errors. Words are names, not instructions: `1 m in ft` typed as the
have is a volume, since `in` is the inch, and `to` and `per` are
unknown units; the unit to convert to goes in the want.

### When an expression fails

An error marks its field, the have's before the want's, and quotes the
text at fault. Where the text cannot be read, the message names the
first character the app could not read and what could have come
there: `3 m ^` gives `Unexpected end of input: expected a number or "(".`
and `5 ft 3 in` gives
`Unexpected "3": expected "^", a unit name, "(", "*", "/", "+", "-" or end of input.`
Where the text reads but cannot be computed, its parts are computed
from the left and the first failure is reported, so `bogus / 0`
reports the unknown unit; the message quotes the part at fault, such
as the divisor of a division by zero (`Division by zero in "0"`) or
the whole operation that is refused. A call with the wrong number of
arguments is reported before any argument is computed.

### How the app writes an expression back

The answer writes the have, and the want where a line shows it, in a
canonical form that reads back as the same expression: one space
between factors and around the other operators (`2m` is shown as
`2 m`, and `kg m/s^2` as `kg m / s^2`), `^` and a quotient of two
numbers written tight (`m^2`, `5000/127`), each number as it was typed
(`1e3`, `.5`), and only the parentheses the reading needs
(`((ft + in))` is shown as `ft + in`, and `2 (m / s)` keeps its own).
A product written with `*` is shown with `×`, which the fields do not
accept; the copy button writes `*`, so what it copies reads back,
while text selected on the screen may not.

### Readings to watch

- A fraction before a unit: `1/12 year` is `1 / (12 year)`, a
  frequency, because juxtaposition is read first; write `year / 12` or
  `(1/12) year`. The same rule makes `1 m + 1/2 m` an error, `1 m`
  plus `1 / (2 m)`; write `1 m + m/2`.
- `m^1/2` is half a metre; the square root is `m^(1/2)`.
- `-2^2` is `-4`; the square of minus two is `(-2)^2`.
- `5 ft 3 in` is an error; write `5 ft + 3 in`.
- `2e -19 C` is two elementary charges less 19 coulombs, with no
  error; the number is `2e-19 C`.
- `kg(m/s)` is a call; the product is `kg (m/s)`.
- `m2` is a name and `m²` an error; the square is `m^2`. Names are
  case-sensitive: `Ft` is not `ft`.
- `dB` is a tenth of a byte, and `at` an attotonne (Names, above).
- `1,000` and `1 000` are errors; write `1000`. A decimal comma is an
  error too: write `2.54`, not `2,54`.
```

Links to add once the foundation pages exist (§6.8): "must conform" to `quantities.md`; "read exactly" and the literal limits to `numbers.md`; "so what it copies reads back" to `numbers.md`, which states the principle (§12, question 11).

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
reduction by: reducing there would run at the hard bound on every
keystroke, far too slowly for long literals. A unit name is a letter or
underscore followed by
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

New, if this passage is the one that owns the issue (question 3):

```text
instead and is `≈ 1`: `^` and `pow` disagree on such an exponent, which
[#88](https://github.com/bsidhom/exucal/issues/88) tracks
([numbers.md](numbers.md), "Roots and powers"). A call resolves its
```

and delete the definition `[88]: https://github.com/bsidhom/exucal/issues/88` at the end of the page, which nothing else uses. If another passage owns it, the sentence ends `…disagree on such an exponent ([numbers.md](numbers.md), "Roots and powers").` with no issue link here.

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
limit. The primitives go to every sum,
```

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "hard bound" | `devdocs/architecture.md#Expressions`, `#Parsing`; `src/core/expr.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`) | devdocs keep "hard bound", defined once as the largest significand limit the settings allow; docs say "the largest significand limit the settings allow" |
| "parenthesized fraction" (docs), "parenthesized rational" (devdocs) for `m^(1/2)` | `docs/definitions.md:159`; `devdocs/architecture.md:401` | docs: "a quotient of two literals in parentheses", leaving "fraction" to the value's representation (§12, question 5); devdocs keep "rational" for the `Exponent` |
| "a unit name", the parse messages' label for any name, a function's in a call included | `src/core/expr.ts:335`, `src/core/expr.ts:348`, `src/core/expr.ts:420` | docs: "name"; aligning the label ("a name") is a code change for the owner to weigh |
| "rejection", "rejected" (the parser's `check`) beside "refusal" (§8) | `devdocs/architecture.md#Parsing`; `src/core/parser.ts:194-215` | devdocs keep "rejection" for text the parser recognized and refused; docs call a literal past the limits at parse "an error as it is typed" and keep "refusal" for the three size refusals of evaluation |
| "negation", "unary minus", "`-` before a product" | `docs/definitions.md#Expressions`; `devdocs/architecture.md#Expressions` | "negation", glossed once as "a `-` before a product" |
| "the text typed into the converter" | `docs/definitions.md:133` | "the have" and "the want" (§8), "the converter" only for the component |
| "canonical text", "the printed form" | `devdocs/architecture.md#Expressions`; `src/core/print.ts` | docs: "how the app writes an expression back" (C5's owner); "canonical" devdocs-only |

## Questions for the owner

1. **The grammar in the module header.** §2.1.3 says no EBNF for expressions exists anywhere, but `src/core/expr.ts:6-19` holds one, accurate against the parser (and `src/core/definitions.ts:20-32` one for the definition lines). Should the pages point to it? Proposed answer: `docs/` keeps prose and the precedence table, as §2.1.3 decides; `devdocs/architecture.md#Expressions` names the header grammar as the hand-maintained form until the DSL generates one, quoting none of it, so that the header stays the one copy.
2. **GNU units and the precedence.** `devdocs/architecture.md:355` says the precedence follows GNU units and `src/core/expr.test.ts:150` repeats it; nothing in the tree confirms it. Proposed answer: devdocs keep one clause as the rationale, a familiar convention for `kg m / s^2`; the user reference says nothing of GNU units for the grammar (§12, question 2), since a likeness stated there would owe the differences (`|` and `**` are errors here).
3. **Where issue #88 is linked** (§12, question 26). Proposed answer: `devdocs/architecture.md#Evaluation`, the passage on the `^` side (`reduceExponent`), carries the one inline link; `devdocs/numbers.md#Roots and powers` and the `pow` passages link to it rather than to the issue; the user reference states the current difference without a link.
4. **Typographic characters.** §12, question 11 keeps `×` out of the grammar for now, and §1.3 records accepting it as intent. The proposed text lists `×`, `·`, `÷`, `−`, superscripts and non-breaking spaces among the errors. Should the intent, when `devdocs/future.md` records it, cover those too? Proposed answer: yes, as one intent: accept the characters the screen or pasted text produces where each has one meaning (`×`, `·`, `−`, non-breaking and thin spaces), and keep `÷` and superscripts out unless asked for.
5. (D2's territory.) `docs/definitions.md#Functions` restates the call rule and the arity error of `#Expressions > A call` (§9.1); proposed answer: `#Functions` keeps the function semantics and points to the call bullet.
6. (D3's and A9's territory.) The definitions file has no unit `a` (the are is `are`), and `at` reads as an attotonne; proposed answer: the units guide notes both, and Q9's "`u`, `at` are absent" gains "`at` reads as `a` + `t`".

## Notes on this run

No claim of section 1 is assigned to D1, so the Claims table holds the statements of its five sections, which its output asks to have verified; the context "A1 (literal limits), A5, A7" was read as those units' claims in section 1 (N1, N4, N21 to N24, Q1 to Q8), not as their reports, and what contradicts section 1 or section 2 is reported under Findings. The module list falls short of the output: the want-field grammar needs `src/core/pipeline.ts` (`convertParsed`) and `src/outcome.ts` (the blank want), the claims of `#Names` need `src/core/names.ts`, `src/core/table.ts` and `src/core/build.ts`, and the property test lives in `src/core/print.test.ts`; all are under Also read. User-visible behaviour was checked through the outcome harness the tests use, from a scratch script outside the tree, and the expression, printer and parser suites pass at this revision. The hardest call was where the want-field grammar, the errors and the readings to watch go before `docs/expressions.md` exists: the proposed text extends the current `#Expressions` section with subsections, ready to move, and adds no link to a page that does not exist yet. D2 should know that comparisons and `#` comments live only in `src/core/definitions.ts` and that the call rule is stated twice in `docs/definitions.md`; D3, that there is no unit `a` and that `at` reads as an attotonne; V2, that the stale passages of `devdocs/architecture.md#Expressions`, `#Parsing` and `#Evaluation` are tagged here.
