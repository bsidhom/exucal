*Section 5 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 5. Concept inventory

Everything other than the two core abstractions themselves (§1), one
entry per concept. Fields: *class* (user, internal, or bridge: a user
concept whose realization devdocs/ explains); *terms* (user term ↔
internal names, where they differ); *docs/*; *devdocs/*, the passages that
discuss the concept, in no particular order (stale passages among them
are tagged in §1.1.5, §1.2.5 and §9.4); *depends on* (claims of §1);
*modules*; *owner*
(proposed owning location in the restructured docs/, naming pages from
the outline in §7).

**C1. have and want.** The quantity to convert and the unit (or list, or
function) to convert it to. *Class:* user. *Terms:* "You have" / "You
want" (the fields' labels) ↔ "the quantity to convert" / "the unit to
convert to" (docs) ↔ `have`, `want`, `haveText`, `wantText`. *docs/:*
`docs/README.md#(top)`; `docs/definitions.md#Unit lists`, `#Functions`.
*devdocs/:* `architecture.md#(top)`, `#Pipeline`, `#The converter and its
lines`. *Depends on:* Q3, Q13, Q17. *Modules:*
`src/core/pipeline.ts`, `src/unit-converter.ts`, `src/outcome.ts`. *Owner:*
`quantities.md` > "How a conversion is answered" (definition); introduced
by example in `getting-started.md`.

**C2. Output modes.** One unit (a ratio, with a reciprocal line), a unit
list (a sum), a function (a call), a blank want (the primitives).
*Class:* user. *Terms:* "second/third output mode" (devdocs) ↔ unnamed in
docs. *docs/:* `docs/definitions.md#Unit lists`, `#Functions`. *devdocs/:*
`architecture.md#Pipeline`, `#Conversion`, `#Unit lists`, `#Functions`,
`#The converter and its lines`. *Depends on:* Q13–Q17.
*Modules:* `pipeline.ts`, `convert.ts`, `outcome.ts`. *Owner:*
`quantities.md` > "How a conversion is answered".

**C3. The result line: relation and notes.** A line is the have, `=` or
`≈` (or `≈` with a dot), the result; notes in parentheses say what the
digits are worth; warnings name assumed conditions. *Class:* user.
*Terms:* "note" (digits) vs "warning" (conditions) ↔ display kinds
`exact`, `certified`, `partial`, `zero`, `unbounded`, `uncertified`.
*docs/:* `docs/settings.md#(top)` (paragraphs "An answer shows every
digit…", "An answer is written with = …"); `docs/functions.md#(top)`
(paragraph "Every built-in takes plain numbers…"). *devdocs/:*
`numbers.md#Certification and the display rule`;
`architecture.md#The converter and its lines > The relation and the note`; `notation.md#(top)`. *Depends on:* N2, N9, N10.
*Modules:* `display.ts`, `outcome.ts`, `unit-converter.ts`. *Owner:*
`numbers.md` > "What a line says".

**C4. The reciprocal line.** The conversion the other way round, on a
second line. *Class:* user. *Terms:* "the other way round" (docs) ↔
"reciprocal" (devdocs, `outcome.ts`). *docs/:* `docs/README.md#(top)`.
*devdocs/:* `architecture.md#The converter and its lines > The reciprocal`; `numbers.md#Working precision and the schedule` ("outside
the loop", #92); `notation.md#Where a ratio is written`. *Depends on:*
Q14, N10. *Modules:* `outcome.ts`. *Owner:* `quantities.md`.

**C5. Typeable-back lines and copy text.** Every line parses back as a
have; the copy button writes `*` where the screen shows `×`. *Class:*
user. *Terms:* "copy", "typed back" ↔ "the printer", "canonical text",
`print`, `text`. *docs/:* `docs/README.md#(top)`. *devdocs/:*
`architecture.md#Expressions` (printer), `#The converter and its lines`; `notation.md#Every literal parses back`. *Depends on:* N12,
Q18. *Modules:* `print.ts`, `copy-button.ts`, `outcome.ts`. *Owner:*
`expressions.md` > "How the app writes expressions" (the printed form);
one line in `getting-started.md`.

**C6. Exact and inexact values.** Radius zero vs nonzero. *Class:*
bridge. *Terms:* "exact" / "inexact", "known to a precision" ↔ `radius`,
`Ball`, the `exact` kind. *docs/:* `docs/settings.md#How a number is held…`;
`docs/functions.md#(top)` (approx bullet). *devdocs/:* `numbers.md#(top)`,
`#The types > Ball`, `#Exact mode`. *Depends on:* N2, N3.
*Modules:* `ball.ts`, `radius.ts`. *Owner:* `numbers.md` > "Exact and
approximate values".

**C7. Ball, midpoint, radius.** The representation of a value with its
error bound. *Class:* internal (docs may say "a value with an error
radius"). *Terms:* "error radius" ↔ `Ball`, `mid`, `rad`, `Radius`,
`unbounded`. *docs/:* `docs/settings.md#How a number is held…` ("carries a
radius"); `docs/functions.md#Very large results and approx` (uses "ball",
a leak). *devdocs/:* `numbers.md#The types`. *Modules:*
`ball.ts`, `radius.ts`. *Owner:* `devdocs/numbers.md#The types`; docs name
"error radius" once in `numbers.md`.

**C8. Certified digits.** The digits both ends of the ball agree on under
the rounding mode. *Class:* bridge. *Terms:* "certain" (notes, docs) ↔
"certified" (devdocs), `certifies`, `certifiedDigits`. *docs/:*
`docs/settings.md#(top) > Mode`, `#How a number is held…`. *devdocs/:*
`architecture.md#Numbers`, `numbers.md#Certification and the display rule`. *Depends on:* N8, N9. *Modules:* `ball.ts`, `display.ts`.
*Owner:* `numbers.md` > "Digits you can trust"; mechanism stays in devdocs.

**C9. Passes and the retry loop.** Recomputation at rising working
precision until the digits certify. *Class:* bridge. *Terms:* "computes
again at more digits", "pass" (docs) ↔ "retry loop", "schedule",
`workingContexts`, `resolve`, `GUARD_DIGITS`, "working contexts".
*docs/:* `docs/settings.md#(top) > Precision limit`, `#How a number is
held…`; `docs/functions.md#Very large results and approx` (the pass table).
*devdocs/:* `architecture.md#Pipeline`, `numbers.md#Working precision and
the schedule`, `cost.md#How a case is measured`. *Depends
on:* N8. *Modules:* `pipeline.ts`, `context.ts`. *Owner:* `numbers.md` >
"Digits you can trust" (as a user rule); the schedule in devdocs.

**C10. The ceiling.** The finest grid, four times the precision limit
plus ten. *Class:* bridge. *Terms:* "finest grid" (docs) ↔ "ceiling",
`ceilingFor`, `DEFAULT_CEILING`, `ceilingContext`. *docs/:*
`docs/settings.md#(top) > Precision limit`, `#How a number is held…`.
*devdocs/:* `numbers.md#Working precision and the schedule`;
`settings.md#The model` ("derived and shown, never set"). *Depends on:*
N8. *Modules:* `context.ts`, `settings.ts`, `system-build.ts`. *Owner:*
`settings.md` > Precision limit entry; defined in `numbers.md`.

**C11. The working grid of a pass.** The decimal grid inexact midpoints
are rounded onto at a given precision. *Class:* internal; collides in
name with C17. *Terms:* "grid" (docs/settings.md), "working digits" (the
schedule's) ↔ `workingDigits`, `digitsFor(bitsFor(precision))`. *docs/:*
`docs/settings.md#How a number is held…`. *devdocs/:* `numbers.md#The
kernel's boundary`, `#Settling`, `#The working digits`
(the collision flagged, #172); `settings.md#The model > The terms`.
*Depends on:* N8. *Modules:* `rounding.ts`, `fixed.ts`, `ball.ts`. *Owner:*
`devdocs/numbers.md`; docs avoid "grid" outside the limits' explanation
(§12, question 5).

**C12. Settling.** Rounding every inexact result to the working grid.
*Class:* internal. *Terms:* none in docs ↔ `settle`, `step`, `onGrid`,
`stepQuantity`. *docs/:* implicit in `docs/settings.md#How a number is
held…` ("rounding it after every step"). *devdocs/:* `numbers.md#Settling`, `#Sums and alignment`, `#The significand limit`. *Modules:*
`ball.ts`, `quantity.ts`, `evaluate.ts`. *Owner:* `devdocs/numbers.md#Settling`.

**C13. Rounding modes.** The seven modes. *Class:* user. *Terms:* panel
labels ("to nearest, ties to even") ↔ `halfEven`, `halfAwayFromZero`,
`halfTowardZero`, `towardZero`, `awayFromZero`, `ceiling`, `floor`;
`RoundingMode`, `ROUNDING_LABELS`. *docs/:* `docs/settings.md#(top) >
Rounding`; `docs/functions.md#(top)` (round). *devdocs/:* `numbers.md#The
types` (rounding.ts), `#Certification and the display rule`;
`settings.md#The model > Rounding` (default migrated); `builtins.md#The
exact functions` (`round`). *Depends on:* N11. *Modules:* `rounding.ts`,
`settings-lines.ts`, `builtins/round.ts`. *Owner:* `settings.md` > Rounding
entry (the modes); `numbers.md` (where the mode acts).

**C14. Exact mode.** *Class:* user. *Terms:* "exact" ↔ `mode: "exact"`,
`Mode`. *docs/:* `docs/settings.md#(top) > Mode`. *devdocs/:*
`numbers.md#Exact mode`; `settings.md#The model > The modes are
exact and decimal`. *Depends on:* N1–N16. *Modules:* `context.ts`,
`settings.ts`. *Owner:* `numbers.md` > "The two modes".

**C15. Decimal mode.** *Class:* user. *Terms:* "decimal" (rejected:
"rounded", "calculator") ↔ `mode: "decimal"`. *docs/:*
`docs/settings.md#(top) > Mode`, `> Working digits`. *devdocs/:*
`numbers.md#Decimal mode`;
`#The working digits`; `settings.md#The model`. *Depends on:* N17–N20.
*Modules:* `context.ts`, `ball.ts`, `evaluate.ts`, `pipeline.ts`. *Owner:*
`numbers.md` > "The two modes".

**C16. Uncertified rounding.** Decimal mode's `≈` with a dot. *Class:*
user (rare). *Terms:* "a step could not be certified at the precision
limit" ↔ `uncertified` flag and kind. *docs/:* `docs/settings.md#(top) >
Mode`. *devdocs/:* `numbers.md#Decimal mode > The ceiling`
(#173 open); `architecture.md#The converter and its lines`. *Depends on:*
N18. *Modules:* `ball.ts`, `display.ts`, `unit-converter.ts`. *Owner:*
`numbers.md` > decimal mode.

**C17. Working digits (the setting).** Extended digits for every step
but the last in decimal mode. *Class:* user. *Terms:* "Working digits",
"extended" ↔ `mode.working`, `NumberContext.working`, `operandContext`,
`extendedWorkingOf`. *docs/:* `docs/settings.md#(top) > Working digits`.
*devdocs/:* `numbers.md#The working digits`; `settings.md#The
model > Working digits`, `#The controls`. *Depends on:* N19. *Modules:*
`context.ts`, `settings.ts`, `evaluate.ts`, `pipeline.ts`. *Owner:*
`settings.md` > entry; rule in `numbers.md`.

**C18. Display digits.** *Class:* user. *Terms:* "display digits",
"digits asked for", "digits shown" ↔ `displayDigits`,
`NumberContext.precision` (user level). *docs/:* `docs/settings.md#(top) >
Display digits`. *devdocs/:* `settings.md#The model > Display digits`; `numbers.md#Working precision and the schedule`. *Depends on:*
N8, N17. *Modules:* `settings.ts`, `context.ts`. *Owner:* `settings.md`.

**C19. Precision limit.** *Class:* user. *Terms:* "precision limit" ↔
`precisionLimitDigits` (`maxDigits` in older stored versions, read by
the migrations); rejected
"digits limit", "grid limit". *docs/:* `docs/settings.md#(top) > Precision
limit`. *devdocs/:* `settings.md#The model > Precision limit`,
`#Storage` (4→5); `numbers.md#Working precision and the schedule`, `#The
significand limit` (`precisionLimitFor`). *Depends on:* N8, N21. *Modules:*
`settings.ts`, `context.ts`. *Owner:* `settings.md`.

**C20. Significand limit and its refusal.** Bits per part of an exact
significand; "would need a significand of about N bits". *Class:*
bridge. *Terms:* "past the significand limit" ↔ `tooLarge`, `Need`,
`Reach` (`fits`/`exceeds`), `significandLimitBits`; `maxBits` (an old
stored key), "size limit", "most bits" (names argued and set aside in
`settings.md#The model`). *docs/:* `docs/settings.md#(top) >
Significand limit`, `#How a number is held…`; `docs/functions.md#Very large
results and approx`. *devdocs/:* `numbers.md#The significand limit`, `#Which limit a refusal names`; `settings.md#The model >
Significand limit`; `builtins.md#The exact functions` (prediction).
*Depends on:* N21, N24. *Modules:* `rational.ts`, `scaled.ts`, `ball.ts`,
`evaluate.ts`, `messages.ts`, `settings.ts`. *Owner:* `numbers.md` >
"Values too big to hold" (rule, remedies); `settings.md` (the number).

**C21. The exponent bound.** ±10^18 on a value's decimal exponent.
*Class:* bridge. *Terms:* "too large / too small to compute: its exponent
would pass 10^18 / fall below -10^18" ↔ `overflow`, `underflow`,
`MAX_EXPONENT`, the classifier (`classifyExp`, …). *docs/:*
`docs/functions.md#Very large results and approx`; `docs/settings.md#(top) >
Significand limit`. *devdocs/:* `numbers.md#The exponent bound`, `#Which limit a refusal names`, `#Why the exponent bound stays
at 10^18`; `builtins.md#The rules every built-in follows`. *Depends on:* N22,
N24. *Modules:* `scaled.ts`, `ball.ts`, `builtins/*.ts`. *Owner:*
`numbers.md` > "Values too big to hold"; the pass table and measurements
stay in `devdocs/numbers.md`.

**C22. Refusal.** The three size refusals as one class. *Class:* bridge.
*Terms:* "refused" ↔ `Refusal`, `isRefusal`. *docs/:* used throughout
`docs/settings.md`, `docs/functions.md`. *devdocs/:* `numbers.md#Which limit a
refusal names`. *Modules:* `scaled.ts`, `rational.ts`,
`messages.ts`. *Owner:* `numbers.md`.

**C23. Unresolved values ("cannot be told from").** A value straddling an
edge where the answer would change. *Class:* bridge. *Terms:* "cannot be
told from zero / a pole / the point where the result passes the exponent
bound, at this precision" ↔ `unresolved`, `Edge`, `unresolvedWant`,
`unresolvedBound`. *docs/:* `docs/functions.md#(top)` (floor, digamma,
tan); `docs/settings.md#(top)` ("cannot be divided by"). *devdocs/:*
`numbers.md#Exact operations`, `#The exponent bound`;
`builtins.md#The rules every built-in follows`; `architecture.md#Conversion`.
*Depends on:* N14, N15. *Modules:* `ball.ts`, `builtin.ts`, `convert.ts`,
`messages.ts`. *Owner:* `numbers.md` > "Values at an edge".

**C24. Domain errors.** *Class:* user. *Terms:* "outside a function's
domain" ↔ `domain` with reasons `notPositive`, `baseOne`,
`outsideClosedUnitInterval`, `belowOne`, `outsideOpenUnitInterval`,
`origin`, `notInteger`, `notExact`, `negative`, `outsideZeroOne`, `pole`.
*docs/:* `docs/functions.md#(top)`. *devdocs/:* `builtins.md#Domains, exact
cases and edges`; `future.md#Complex numbers`. *Depends on:*
N15. *Modules:* `builtin.ts`, `builtins/*.ts`, `messages.ts`. *Owner:*
`functions.md` (per entry, with the family preamble).

**C25. Exact cases.** Inputs a built-in recognizes as giving a rational.
*Class:* user. *Terms:* "recognized as exact" ↔ "exact case",
`exactRoot`. *docs/:* `docs/functions.md#(top)`. *devdocs/:*
`builtins.md#The rules every built-in follows`, `#Domains, exact cases and
edges`; `numbers.md#Roots and powers`; `testing.md#The numeric
test patterns`. *Depends on:* N6. *Modules:* `builtins/*.ts`,
`rational.ts`. *Owner:* `functions.md` (per entry); the rule in `numbers.md`.

**C26. approx.** *Class:* user. *Terms:* "known to the working precision
and no better" ↔ `approx`, `widened`, `decimal: "identity"`. *docs/:*
`docs/functions.md#(top)` bullet 7, `#Very large results and approx`.
*devdocs/:* `numbers.md#approx`, `#The significand limit`;
`builtins.md#The rules every built-in follows`; #100, #171. *Depends on:*
N23. *Modules:* `builtins/approx.ts`, `ball.ts`. *Owner:* `numbers.md`
(the concept) and `functions.md` (the entry).

**C27. The dependency problem.** Two occurrences of one value are
independent. *Class:* bridge. *Terms:* "two independent copies of its
argument's bounds" ↔ "the dependency problem of interval arithmetic".
*docs/:* `docs/definitions.md#Functions` (last paragraph). *devdocs/:*
`architecture.md#Functions`, `functions.md#Precision, the radius and cost`; `numbers.md#Exact mode`. *Depends on:* N5. *Modules:*
`ball.ts`, `evaluate.ts`. *Owner:* `numbers.md` (one paragraph);
`definitions.md` links.

**C28. Whole-expression precision.** The model's name, against
per-operation precision. *Class:* bridge. *docs/:* none. *devdocs/:*
`numbers.md#Exact mode`, `#Settling`; `future.md#Symbolic
values`. *Depends on:* N8. *Owner:* `devdocs/numbers.md`; named once in
`numbers.md`.

**C29. Ratio notation and its width.** *Class:* user. *Terms:* "ratio
notation", "ratio", "width" ↔ `Notation`, `RatioDisplay`, `ratioParts`,
`fraction: true`, `scale` (`fractions` and a string notation in older
stored versions, read by the migrations). *docs/:* `docs/settings.md#(top) >
Notation`. *devdocs/:* `notation.md#The rule`, `#The width`,
`#Where a ratio is written`, `#Not in decimal mode`; `settings.md#The model`
(nested choice), `#Storage`. *Depends on:* N13, N2. *Modules:*
`display.ts`, `outcome.ts`, `settings.ts`. *Owner:* `settings.md` (entry);
`numbers.md` > "How an exact value is written".

**C30. Number formatting.** `%g`-style digits and exponents. *Class:*
user. *Terms:* "written as a decimal", "exponent" ↔ `format`, `roundTo`.
*docs/:* examples only. *devdocs/:* `numbers.md#Formatting`.
*Depends on:* N12. *Modules:* `scaled.ts`, `display.ts`. *Owner:*
`numbers.md` > "How numbers are written".

**C31. Zero and its bound.** "within 2e-30 of zero", written `0`.
*Class:* user. *Terms:* ↔ kind `zero`, `zeroBound`. *docs/:*
`docs/settings.md#(top)`. *devdocs/:* `numbers.md#Certification and the
display rule`. *Depends on:* N10. *Modules:*
`display.ts`. *Owner:* `numbers.md`.

**C32. Memoized constants and the Bernoulli run.** Computed on first use
at the ceiling and kept. *Class:* internal, with a visible first-use
delay. *Terms:* "computed once per page load … and kept" (docs) ↔
`MEMO_MARGIN`, `constants.ts`, `bernoulli-ratios.ts`. *docs/:*
`docs/functions.md#(top)` (gamma bullet). *devdocs/:* `numbers.md#Memoized
constants`; `builtins.md#The Gamma and Beta families`;
`cost.md#What the costs come from`; `future.md` (#103). *Depends on:* N25.
*Modules:* `constants.ts`, `fixed-log.ts`, `fixed-gamma.ts`,
`bernoulli.ts`, `bernoulli-ratios.ts`. *Owner:* devdocs; one qualitative
sentence in `functions.md`'s Gamma preamble.

**C33. Cost and the catalogue.** What an expression that never certifies
costs. *Class:* bridge. *Terms:* "a limit on effort", "freeze", "hang" ↔
cold, warm, passes, typing, `FLOOR_MS`, `DEADLINE_MS`. *docs/:*
`docs/functions.md#(top)` (gamma timings); `docs/settings.md#(top) > Precision
limit`. *devdocs/:* `numbers.md#Working precision and the schedule`,
`cost.md`, `future.md#Extensions that fit`
(#118). *Depends on:* N7, N8, N25. *Modules:* `pipeline.ts`,
`bench/stress/*`. *Owner:* `devdocs/cost.md`; `numbers.md` > "What costs
time" (qualitative).

**C34. Dimension and dimension mismatch.** (Part of the quantity
abstraction; listed for naming.) *Class:* user. *Terms:* "dimension",
"quantities of the same thing" ↔ `Dimension`, `dimensionMismatch`,
`ConformanceError`. *Owner:* `quantities.md`. Pointers in §1.2.

**C35. Kinds.** Dimensionless markers that keep angles from numbers.
*Class:* user. *Terms:* "kind", "kind primitive" (devdocs, `!kind`) ↔
"dimensionless marker" (docs) ↔ `kindMismatch`. *docs/:*
`docs/definitions.md#The format`. *devdocs/:* `architecture.md#Quantities,
dimensions and kinds`; `builtins.md#Dimension rules > Angles`;
`future.md#Extensions that fit` (lenient conversion). *Depends on:* Q2–Q4.
*Modules:* `dimension.ts`, `units.txt`. *Owner:* `quantities.md` > "Kinds".

**C36. Conformance.** The test that two quantities can be added or
converted. *Class:* bridge. *Terms:* "the same test that have and want
must pass" (docs) ↔ "conform", "conformance check". *docs/:*
`docs/definitions.md#Expressions > + and -`. *devdocs/:*
`architecture.md#Quantities…`, `#Evaluation`;
`functions.md#Annotations`. *Depends on:* Q3. *Modules:* `dimension.ts`,
`evaluate.ts`, `convert.ts`. *Owner:* `quantities.md` (defines the word).

**C37. Primitives.** The base units and kind markers everything is
defined down to. *Class:* user. *Terms:* "primitive", "base unit" ↔
`Primitives`, roles. *docs/:* `docs/definitions.md#The format`, `#What the
file contains`. *devdocs/:* `architecture.md#Quantities…`,
`#Definitions`. *Depends on:* Q2. *Modules:* `dimension.ts`, `build.ts`,
`units.txt`. *Owner:* `quantities.md` (concept); `units.md` (which).

**C38. Prefixes, name resolution and ambiguity.** *Class:* user. *Terms:*
"prefix", "an exact name always wins", "ambiguous" ↔ `names.ts`,
`name-index.ts`, `prefixedName`, `ambiguous`. *docs/:*
`docs/definitions.md#Names`. *devdocs/:* `architecture.md#Definitions`; `builtins.md#Names`; `benchmarks.md#What each benchmark
asserts`. *Depends on:* Q9. *Modules:* `names.ts`, `name-index.ts`,
`table.ts`, `build.ts`. *Owner:* `expressions.md` > "How a name is read";
the load-time checks in `definitions.md`.

**C39. Unit lists.** *Class:* user. *Terms:* "unit list", "list", "a
sum" ↔ `convertToList`, `roundTerms`, `parseUnitList`, `nonpositiveUnit`.
*docs/:* `docs/definitions.md#Unit lists`, `#What the file contains`.
*devdocs/:* `architecture.md#Unit lists`, `#The converter and
its lines > A unit list`; `notation.md#Where a ratio is written`. *Depends
on:* Q15, N10. *Modules:* `convert.ts`, `pipeline.ts`, `outcome.ts`,
`display.ts`. *Owner:* `quantities.md` (semantics); `expressions.md` (the
`;` syntax of the want); `units.md` (the defined lists).

**C40. User-defined functions.** *Class:* user. *Terms:* "function", "a
function the file defines" ↔ `UnitFunction`, `Definition.function`,
`applyFunction`, `callFailed`. *docs/:* `docs/definitions.md#Functions`.
*devdocs/:* `architecture.md#Definitions`, `#Functions`, `functions.md#(top)`,
`#Definitions`, `#Calls`, `#Build-time checks`, `#Alternatives considered`. *Depends on:* Q3, Q5, N14.
*Modules:* `definitions.ts`, `build.ts`, `evaluate.ts`, `table.ts`.
*Owner:* `definitions.md` > "Functions".

**C41. Inverses and conversion into a function.** *Class:* user. *Terms:*
"inverse", "the `~` line", "the reading that gives the quantity",
"recovered argument" ↔ `invertFunction`, `noInverse`, `inverseMismatch`,
`inverseFailed`, `inverseArity`, `orphanInverse`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `architecture.md#Functions`,
`functions.md#A function as the want`, `#Display`. *Depends
on:* Q16, N14, N16. *Modules:* `evaluate.ts`, `pipeline.ts`, `outcome.ts`,
`build.ts`. *Owner:* `definitions.md` (writing an inverse);
`quantities.md` (the output mode).

**C42. Annotations.** *Class:* user. *Terms:* "annotation", "the unit it
takes" ↔ `annotation`, `annotationScale`, `annotationNotUnits`,
`zeroDeclaredUnit`, `argumentMismatch`, `functionMismatch`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `functions.md#Annotations`, `#Build-time checks`. *Depends on:* Q3, Q5. *Modules:*
`definitions.ts`, `build.ts`, `dimension-of.ts`, `evaluate.ts`. *Owner:*
`definitions.md`.

**C43. Conditions and undecided conditions.** *Class:* user. *Terms:*
"condition", "such that", "undecided", "the value assumes it does" ↔
`checkConditions`, `decide`, `orderOf`, `conditionFailed`,
`undecidedCondition`, `wantConditionFailed`, `conditionWithoutParameter`,
`nonconformingComparison`, `mixedComparison`, the collector of
assumptions. *docs/:* `docs/definitions.md#Functions`. *devdocs/:*
`architecture.md#Functions`, `functions.md#Conditions`, `#The check at a
call`, `#An undecided condition`. *Depends on:* N14, N15, Q3.
*Modules:* `evaluate.ts`, `ball.ts`, `build.ts`, `definitions.ts`,
`pipeline.ts`, `outcome.ts`. *Owner:* `definitions.md` (syntax and
semantics); the comparison rule in `numbers.md`.

**C44. Parameter names and shadowing.** *Class:* user. *Terms:* ↔
`parameterNamesUnit`, `duplicateParameter`. *docs/:*
`docs/definitions.md#Functions`. *devdocs/:* `functions.md#Names and
shadowing` (#131). *Modules:* `definitions.ts`. *Owner:*
`definitions.md`.

**C45. Calls, arity, "not a function".** *Class:* user. *Terms:* "a
call", "the space matters" ↔ `arityMismatch`, `notAFunction`,
`functionAsUnit`. *docs/:* `docs/definitions.md#Expressions > A call`,
`#Functions`. *devdocs/:* `architecture.md#Expressions`, `functions.md#Calls`; `builtins.md#Arity`. *Depends on:* Q9. *Modules:* `expr.ts`,
`evaluate.ts`, `table.ts`, `messages.ts`. *Owner:* `expressions.md`.

**C46. Temperature readings and differences.** *Class:* user. *Terms:*
"reading" vs "difference" ("interval" in docs) ↔ `tempC`, `tempF`,
`degC`, `degF`, `degR`. *docs/:* `docs/definitions.md#What the file
contains`, `#Functions`. *devdocs/:* `functions.md#(top)`, `#Definitions`; `future.md#Ruled out, and why` (offsets). *Modules:*
`units.txt`. *Owner:* `units.md` (entries); `quantities.md` (why readings
are functions).

**C47. Logarithmic units.** `decibel`, `bel`, `neper` as functions.
*Class:* user. *docs/:* `docs/definitions.md#What the file contains`.
*devdocs/:* `builtins.md#Names`; `functions.md#Definitions`.
*Modules:* `units.txt`. *Owner:* `units.md`.

**C48. Angles and the radian kind.** *Class:* user. *Terms:* "angle",
"the radian kind" ↔ `angleToNumber`, `numberToAngle`,
`conformingToAngle`, `noAngles`. *docs/:* `docs/functions.md#(top)` bullets
4–5. *devdocs/:* `architecture.md#Quantities…`, `builtins.md#Dimension rules > Angles`. *Depends on:* Q8. *Modules:* `builtin.ts`,
`builtins/trig.ts`, `builtins/inverse-trig.ts`, `units.txt`. *Owner:*
`quantities.md` > "Kinds" (angles as the example); `functions.md` entries.

**C49. Plain number.** A quantity with no dimension and no kind.
*Class:* user. *Terms:* "plain number" (docs, builtins.md) ↔
"dimensionless" (architecture.md; which there sometimes includes kinds).
*Owner:* `quantities.md` defines it; see §8.

**C50. The system definitions file.** `src/units.txt` and what it holds.
*Class:* user. *Terms:* "definitions file", "the file", "system
definitions", "the unit table" ↔ `loadSystemDefinitions`,
`buildSystemTable`, `UnitTable`. *docs/:* `docs/definitions.md#(top)`,
`#What the file contains`. *devdocs/:* `architecture.md#Definitions`, `#The shell and its parts`; `development.md#Adding a unit`;
`layout.md#The files`. *Depends on:* Q10, Q11. *Modules:* `units.txt`,
`system-table.ts`, `system-build.ts`, `units.test.ts`. *Owner:* `units.md`
(contents); `definitions.md` (format); "Adding a unit" stays in devdocs.

**C51. Error messages and locations.** *Class:* bridge. *Terms:* "the
message says…", "marks the input at fault" ↔ `messages.ts`, `Span`,
`Rejection`, error kinds. *docs/:* quoted messages throughout.
*devdocs/:* `architecture.md#Parsing`, `#Evaluation`, `#Messages`; `development.md#Style guide`. *Modules:* `messages.ts`,
`span.ts`. *Owner:* undecided (§12, question 6).

**C52. Settings storage and migrations.** *Class:* internal. *Terms:*
"format version" (docs) ↔ `STORAGE_VERSION`, `savedBy`,
`settingsFromStored`; "stored version" (commit subjects). *docs/:*
`docs/settings.md#(top)`. *devdocs/:* `settings.md#Storage`; `benchmarks.md#The search`.
*Modules:* `settings.ts`. *Owner:* `devdocs/settings.md#Storage`; one
sentence in `settings.md`.

**C53. The clamp chain and refused edits.** *Class:* user. *Terms:* "at
most 2,453 digits under the significand limit", "lowered from … to fit"
↔ `rangesOf`, `Bounds`, `clampSettings`, `clampsOf`, `refusalOf`,
`minBy`/`maxBy`. *docs/:* `docs/settings.md#(top)` ("The limits are set
top-down"). *devdocs/:* `settings.md#The model > The chain`,
`#Applying a change`. *Modules:* `settings.ts`,
`settings-lines.ts`, `settings-panel.ts`. *Owner:* `settings.md` > "How
the settings bound each other".

**C54. Defaults and resets.** *Class:* user. *Terms:* "default …",
"Reset all settings" ↔ `withDefault`, `resetSettings`, `isAtDefault`,
`DEFAULT_SETTINGS`, `DEFAULT_MODES`. *docs/:* `docs/settings.md#(top)`.
*devdocs/:* `settings.md#Applying a change > Resets`.
*Modules:* `settings.ts`. *Owner:* `settings.md`.

**C55. The probe.** "Measure this device" and its proposal. *Class:*
user. *Terms:* ↔ `recommendLimits`, `Probe`, `Recommendation`,
`COMPOSITE`, `budgetMs`. *docs/:* `docs/settings.md#(top)`. *devdocs/:*
`settings.md#The probe`; `builtins.md#The elementary routines`
(the composite); `testing.md#What a test may depend on`. *Modules:*
`limits.ts`, `settings-panel.ts`. *Owner:* `settings.md`.

**C56. The settings sheet.** The cog, the sheet, its controls. *Class:*
user (interface). *Terms:* "sheet", "panel", "cog" ↔ `settings-panel.ts`,
`settings-button.ts`, `step-button.ts`. *docs/:* `docs/settings.md#(top)`
(first paragraph). *devdocs/:* `architecture.md#UI`, `settings.md#The
sheet`, `#The controls`. *Modules:* `settings-panel.ts`,
`settings-button.ts`, `step-button.ts`, `app-shell.ts`. *Owner:* §12,
question 3 (`app.md` or the preamble of `settings.md`).

**C57. Installation, offline use, updates, the build number.** *Class:*
user. *Terms:* "build number", "update to …", "up to date", "couldn't
check (offline?)" ↔ `BUILD_ID`, `sw.ts`, precache, `register-service-worker.ts`,
`service-worker-updates.ts`. *docs/:* `docs/README.md#(top)`;
`docs/settings.md#(top)` ("Tapping the build number…"). *devdocs/:*
`offline.md`; `layout.md#The files`; `architecture.md#The shell
and its parts`. *Modules:* `app-footer.ts`, `register-service-worker.ts`,
`service-worker-updates.ts`, `sw.ts`, `build-id.ts`. *Owner:* §12,
question 3 (`app.md`); not `settings.md`.

**C58. Hard bounds and fixed constants.** *Class:* bridge. *Terms:* the
ranges in the panel ↔ `MAX_SIGNIFICAND_LIMIT_BITS` (2^20),
`MIN_SIGNIFICAND_LIMIT_BITS` (358), `MAX_EXPONENT` (10^18), `WIDTH_LIMIT`
(1000), `DEFAULT_WIDTH` (20), `GUARD_DIGITS` (10), `GUARD_BITS` (32),
`ROOT_DEGREE_LIMIT` (2^32), `FORMABLE_RADIUS_BITS` (2^16),
`BUDGET_MS_RANGE`. *docs/:* `docs/settings.md#(top)` (ranges as numbers).
*devdocs/:* `numbers.md` (several sections), `settings.md#The model`,
`notation.md#The width`, `testing.md#What a test may depend on`. *Modules:* `rational.ts`, `scaled.ts`, `context.ts`,
`settings.ts`, `fixed.ts`, `ball.ts`. *Owner:* `settings.md` (ranges);
devdocs (constants).

**C59. Symbolic values and complex numbers (ruled out).** *Class:*
internal (future). *docs/:* none; domain errors reflect it. *devdocs/:*
`future.md#Symbolic values`, `#Complex numbers`;
`builtins.md#Not in this design`. *Owner:* `devdocs/future.md`; `numbers.md`
says "real values only" once.

**C60. GNU units lineage and divergences.** *Class:* framing. *docs/:*
`docs/README.md#(top)`, `docs/definitions.md#(top)`, `docs/settings.md#(top) >
Display digits`. *devdocs/:* `architecture.md#(top)`, `#Expressions`, `#Conversion`, `#The converter and its lines > The reciprocal`; `builtins.md#Names`; `functions.md#Annotations`,
`#Alternatives considered`; `numbers.md#(top)`. *Owner:* §12, question 2.

**C61. Juxtaposition.** *Class:* user. *Terms:* ↔ the `juxtapose` node.
*docs/:* `docs/definitions.md#Expressions`. *devdocs/:*
`architecture.md#Expressions`. *Owner:* `expressions.md`.

**C62. Number literals and the parse-time bound.** *Class:* user.
*Terms:* ↔ `parseDecimal`, `Rejection`, `check`, `rejected`. *docs/:*
`docs/definitions.md#Expressions > Numbers`. *devdocs/:*
`architecture.md#Expressions`, `#Parsing > Rejection is final`; `numbers.md#The exponent bound` (last sentence). *Owner:*
`expressions.md`.

**C63. The `^` exponent and `pow`.** *Class:* user. *docs/:*
`docs/definitions.md#Expressions > ^`; `docs/functions.md#(top)` bullet 3.
*devdocs/:* `architecture.md#Expressions`, `#Evaluation`;
`numbers.md#Roots and powers`; `builtins.md#Domains… > pow, and ^ with it`.
*Owner:* `expressions.md` (syntax); `functions.md` > `pow` (the difference).
