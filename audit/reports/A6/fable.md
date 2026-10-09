# Unit A6: Comparison, edges and undecided conditions (fable)

- Plan revision: b605b2b
- Date: 2026-10-09
- Model: claude-fable-5-1
- Doc sections read: `devdocs/numbers.md#Exact operations`, `#Sums and
  alignment` (it lies between the two named sections and was read with
  them), `#Comparison`; `devdocs/functions.md#(top)`, `#Conditions`,
  `#The check at a call`, `#An undecided condition`, `#A function as the
  want`, `#Display`; `devdocs/builtins.md#The rules every built-in
  follows`, `#The exact functions`
- Modules read: `src/core/builtins/round.ts`, `src/core/builtins/division.ts`,
  `src/core/builtins/abs.ts`, `src/core/builtin.ts`, in full;
  `src/core/ball.ts:1-150`, `264-470`, `481-545`, `800-900`,
  `1084-1165`, `1990-2070` (the header, the type and its errors, `containsZero`,
  `position`, `orderOf`, `compareWithRadius`, `radiusScaled`,
  `addBalls`, `divideBalls`, `inexactQuotient`, `step`, `widened`,
  `sideOfZeroOf`, `sideOfOne`, `sideOfZero`, `coarseVerdict`);
  `src/core/evaluate.ts:200-400`, `495-1135`, `1250-1288` (the error
  types and `Assumption`, `evaluateNode` through the call case,
  `applyBuiltin`, `applyFunction`, `bindParameters`, `invertFunction`,
  `checkConditions`, `decide`, `VERDICTS`, `evaluateBound`,
  `atTheBound`, `locate`); `src/core/convert.ts:1-268`, `322-425` (the
  header, the error types, `convert`, `convertToList`, `decompose`,
  `passOn`, `countOf`, `nearestInteger`); `src/core/pipeline.ts:1-500`,
  `699-904` (the header, the types, `schedule`, `resolve`, `settled`,
  `isUnresolved`, `retriesConversion`, `conversionDone`,
  `evaluateText`, `convertText`, `convertToFunction`,
  `wantConditionFailure`, `underAssumption`, `disjoint`, `assertWithin`)
- Also read: `src/messages.ts` (the wordings of `unresolved`,
  `conditionFailed`, `undecidedCondition`, `unresolvedWant`,
  `unresolvedBound` and `nonpositiveUnit`, `describeEdge`,
  `describeBody`, `describeAssumption`, `describeAssumed`);
  `src/outcome.ts` (`Outcome`, `outcomeOf`, `warned`);
  `src/unit-converter.ts` (the warning's rendering); `src/core/build.ts`
  (the header, `mentions`, `evaluateDecided`); `src/core/definitions.ts`
  (`Comparator`, the comparator parser, `mixedComparison`);
  `src/core/table.ts` (`FunctionCondition`); the edge checks of
  `src/core/builtins/log.ts`, `hyperbolic.ts`, `inverse-trig.ts`,
  `trig.ts`, `gamma.ts` and `pow.ts`; `devdocs/numbers.md#The exponent
  bound` and `#Working precision and the schedule` (the retry
  predicate's statement); `devdocs/architecture.md#Evaluation`,
  `#Conversion` and `#The converter and its lines` (the `unresolved`
  and warning passages); `docs/definitions.md#Functions` and
  `docs/functions.md#(top)` (the user-side statements the claims'
  sections restate); the tests `src/core/ball.test.ts` (`position`),
  `src/core/evaluate.test.ts` (the verdict table, the never-refused
  comparison), `src/core/pipeline.test.ts` (the condition tests, by
  name), `src/core/builtins/exact.test.ts` (the edge messages);
  `audit/plan/05-concept-inventory.md` C3, C23 and C43,
  `audit/plan/08-terminology.md`, `audit/plan/09-structural-observations.md`,
  `audit/plan/12-open-questions.md`, `audit/plan/02-the-two-languages.md`
  (the condition rows) and `audit/plan/06-coverage-gaps.md` (the
  comparison and edge rows). The examples quoted below were evaluated
  through `outcomeOf` against the system table built from
  `src/units.txt` with four test functions appended (`nonneg(x) | x >= 0
  = x`, `logit(p) | 0 < p < 1 = ln(p / (1 - p))`, `guarded(x) | x > 0,
  ln(x) > 1 = x`, `box(x, a, b) | a < b, a <= x <= b = x`), from a
  scratch script outside the tree, at the default context (eight display
  digits, half even, a significand limit of 65,536 bits, a ceiling of
  4,040 digits), in both modes; the test suites of the modules read
  (`node --test` over eleven files, 256 tests) all pass.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 2 |
| Claims corrected | 1 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 2 / 0 / 0 |
| Gaps confirmed / refuted / new | 0 / 0 / 0 |
| Proposed edits | 5 sections (7 old → new pairs) |
| Questions for the owner | 5 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N14 | corrected | `src/core/ball.ts:362-402` (`position`: an exact ball by `compare`, 366-369; a touch its own answer, `touchingAbove` or `touchingBelow`, 377; `straddles` for an unbounded ball, a midpoint on the point, a magnitude the bounds cannot tell from the radius and a difference past the exponent bound whose bounds cannot tell a touch from a straddle, 365, 373, 378, 391, 398), `417-422` (`orderOf`: exact against exact and inexact against exact through `position`, two inexact through `subtractBalls`, any failure of the difference `straddles`, 421), `446-467` (`compareWithRadius`, `radiusScaled`; `FORMABLE_RADIUS_BITS` at 296), `489-527` (`addBallsCore`: two exact operands keep the alignment refusal, 508; two inexact operands are settled, added or absorbed and never `tooLarge`, 509-526, their sum held to the exponent bound by `heldSum` and `held`); `src/core/evaluate.ts:1050-1099` (`decide`, `VERDICTS`: the six rows of the page's table, cell for cell); `src/core/evaluate.test.ts:1941-1995` (every cell, both orientations, two inexact sides), `1998-2014` (`1e999999999` against `-1e-999999999`, two exact values whose difference cannot be formed, decided); `src/core/ball.test.ts:231-234` (`touchingAbove`, `touchingBelow`, `straddles`) | Two corrections, the rest confirmed: "a ball touching a point counts as straddling it" is not how `position` answers nor how the conditions read its answer (a touch decides a non-strict comparison; the built-ins' edge checks are what fold a touch into a straddle, N15), and the difference of two inexact values is never refused for size, only at the exponent bound. Run: `tempC(-273.15) = 0 K`; `box(1, 1, 3) = 1` (`a <= x <= b` on exact values, the boundary included); `box(approx(1), 1, 3) ≈ 1` with the warning; `tempC(approx(-273.15))` undecided to the ceiling. Corrected statement: Two exact values compare exactly, as the numbers they are, without forming their difference, so a comparison of exact values is never refused for size and always decides, the boundary included. An inexact value is placed against an exact one directly; two inexact values compare through their difference against zero, which always aligns (the smaller absorbed into the radius) and counts as across zero when it cannot be formed as a value, past the exponent bound or straddling it. A ball is closed, so an end exactly on the bound leaves equality possible, and the comparison tells such a touch from a straddle: a strict comparison is undecided when the ball ends on the bound from the side where it would hold and fails when it ends there from the other side; a non-strict one holds when the ball ends on the bound from its side and is undecided when it ends there from the other side; every comparison is undecided when the ball reaches across. The built-ins' edge checks treat a touch as a straddle (N15); the conditions do not. |
| N15 | confirmed | `src/core/ball.ts:278-288` (`Edge`, `unresolved`), `822`, `828`, `864` (a divisor exactly zero `divisionByZero`, one containing zero, or one whose distance from zero the bounds cannot place, `unresolved` at zero), `743` (`AT_BOUND`); `src/core/builtin.ts:341-356` (`checkPositive`: `[-2, 0]` `domain`, `[0, 2]` `unresolved`), `363-378` (`sideOfZero`: a touch `straddles`), `470-475` (`unresolvedAt`), `506-523` (`fromBallError`); `src/core/builtins/round.ts:181-197` (`roundBall`: an exact argument decided before any cell is formed, 189; an inexact one against the open cell, a touch `unresolved`, 193-194; a cell that cannot be formed `unresolved` at the result itself, 191), `src/core/builtins/division.ts:64-92` (`quotientFloor`: the edge the floor's boundary times the divisor's midpoint, 87-91), `src/core/builtins/abs.ts:30-44` (`signBall`); the other edges, `src/core/builtins/inverse-trig.ts:355-371`, `hyperbolic.ts:249-256`, `288-309`, `log.ts:114-122`, `trig.ts:100-103`, `gamma.ts:390-402`, `pow.ts:101-110`; the retry, `src/core/pipeline.ts:334-366` (`resolve`), `377-392` (`isUnresolved`: an `unresolved` or an `undecidedCondition` at any depth), `394-405` (`retriesConversion`: those, `unresolvedWant`, `unresolvedBound`), `src/core/ball.ts:1109-1134` (`step`: in decimal mode an `unresolved` is retried inside the step, through the step's own schedule, 1112); the location, `src/core/evaluate.ts:588-596` (at the divisor), `636-647` (at the base), `860-867` (at the built-in's argument); the message, `src/messages.ts:92-95`, `413-419` (`describeEdge`), `488-491` (`unresolvedWant`, `unresolvedBound`), `572-573` | Confirmed, with three refinements. Every edge check of the built-ins treats a touch as a straddle (a ball ending exactly on the edge is `unresolved`), so the claim's "straddles" means reaches or touches, where the conditions (N14) let a touch decide. In decimal mode the retry runs inside the step and the pipeline's one pass reports what the step's ceiling leaves `unresolved` as final. The edges a message names are zero, a point written to twelve digits (`1`, `-1`, a rounding boundary, a multiple of a divisor for `div` and `mod`, the result itself for a cell that cannot be formed), `a pole of the function`, and `the point where the result passes the exponent bound`; a `want` straddling zero and a ratio straddling the bound have wordings of their own. Run: `1 / (sqrt(2)^2 - 2)` and `sign(sqrt(2)^2 - 2)` ("cannot be told from zero"), `floor(sqrt(2)^2)` and `div(sqrt(2)^2, 1)` ("from 2"), `round(2.5 + sqrt(2) - sqrt(2))` ("from 2.5"), `asin(approx(1))`, `acosh(approx(1))`, `atanh(approx(1))` and `log(approx(1), 8)` ("from 1"), `tan(90 deg)` and `gamma(approx(-2))` ("from a pole of the function"), `exp(approx(1e999) - approx(1e999 - 5)) ≈ 148.41316` (retried past the straddle); exact values on an edge decide: `floor(2) = 2`, `round(2.5) = 2`, `tempC(-273.15) = 0 K`, `pow(0, 0) = 1`, `sign(0) = 0`, `asin(1) ≈ 1.5707963 radian`. |
| N16 | confirmed | `src/core/definitions.ts:32`, `179` (`Comparator`: `<`, `<=`, `>`, `>=`), `386-392` (`≤` and `≥` read as `<=` and `>=`), `403-405` (`mixedComparison`); `src/core/evaluate.ts:1059-1099` (the `at` row: `<=` and `>=` hold, `<` and `>` fail); `src/core/pipeline.ts:793-795`, `876-889` (`disjoint`: two exact values by `equals`, otherwise a difference wholly on one side of zero; a difference that cannot be formed or placed refutes nothing); `src/outcome.ts:109-120` (`=` the relation of an exact value); exact cases, `src/core/builtins/log.ts:116-117`, `hyperbolic.ts:245` | Confirmed as a statement of the code; that the absence is incidental and that equality operators may come is the owner's intent (§1.3), which no code can confirm. Run: `box(1, 1, 3) = 1` and `box(5, 1, 3)` refused (`<=` deciding equality on exact values); `300 K = tempF(80.33)` and `tempC(approx(-273.15))` into `tempC` pass the inverse check. The §1.2.5 row for `devdocs/functions.md#Conditions` is confirmed below. |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/functions.md#Conditions` (§1.2.5) | "**There is no equality and no `!=`.** `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument. A body that cannot be computed at a point already fails there." | update (confirmed: the four comparators are the whole set, `src/core/definitions.ts:179`; the rationale reads as ruling equality out, which the owner does not, §1.3) | **There is no equality and no `!=` today.** `=` ends the head, and the comparators are the four orderings. Equality operators and conditional expressions are an extension that fits ([future.md](future.md)); a design for them has to say what an equality of inexact values yields, since two balls can be told apart or found to overlap but never found equal, so an equality condition on an inexact argument could only ever be undecided. A body that cannot be computed at a point already fails there. |
| `devdocs/numbers.md#Exact operations` (found) | "A ball within an ulp of zero at the kernel's bits is treated as containing zero, since the kernel cannot tell it apart;" | update (the division reads no kernel bits: `containsZero` and `magnitudeBelow` compare the midpoint with the radius exactly where the radius can be formed and by the coarse bounds otherwise, `src/core/ball.ts:334-339`, `351-353`, `446-467`, `828`, `864`; the header states the current rule, `100-105`) | Whether a divisor contains zero is decided as every comparison of a midpoint with a radius is ("Comparison" below): exactly where the radius can be formed, and by the coarse bounds otherwise, a midpoint the bounds cannot tell from the radius counting as within it, so that the answer is `unresolved` rather than a quotient of the wrong sign; |

The other rows of §1.1.5 and §1.2.5 for these three pages lie in sections
outside this unit (`devdocs/numbers.md#The types`, `#Roots and powers`,
`#The kernel's boundary`, `#Certification and the display rule`,
`#Working precision and the schedule`, `#Settling`, `#Decimal mode`,
`#The significand limit`; `devdocs/functions.md#Annotations`, `#Build-time
checks`, `#Alternatives considered`; `devdocs/builtins.md#The elementary
routines`, `#Huge and tiny arguments`, `#The Gamma and Beta families`)
and are left to A1–A5, V1, V3 and V4.

## Findings

The model of N14–N16 holds against the code in every example run and in
every bullet of the three sections; the two corrections are to one
sentence of `devdocs/numbers.md#Comparison` and one phrase repeated in
two pages, not to what the app does.

- **`position` is six-valued, and "touching counts as straddling" is
  its callers' rule, not its own.** `position` answers `below`, `above`,
  `touchingBelow`, `touchingAbove`, `at` or `straddles`: an exact ball by
  `compare`; an inexact one by the difference of its midpoint and the
  point, compared with the radius exactly where the radius's power of
  two can be formed (`FORMABLE_RADIUS_BITS`, `2^16`) and by the coarse
  bounds otherwise, `straddles` where they cannot tell, for an unbounded
  ball, for a midpoint on the point, and for a difference past the
  exponent bound whose bounds cannot tell a touch from a straddle; two
  values that cannot be aligned are placed by half the larger
  (`src/core/ball.ts:362-402`). Its callers decide what a touch means:
  `checkPositive` (a touch from above `unresolved`, from below `domain`,
  `src/core/builtin.ts:345-355`), `sideOfZero` (`straddles` for either
  touch, `363-378`), `roundBall` (`!== "above"`, `!== "below"`,
  `src/core/builtins/round.ts:193-194`), `countOf` (a ratio touching the
  nearest integer counts as that integer, `src/core/convert.ts:395-402`),
  the ends of `asin`, `acosh` and `atanh`
  (`src/core/builtins/inverse-trig.ts:368`, `hyperbolic.ts:249-256`,
  `288-309`) and the logarithm's base against one (`log.ts:121`) all
  treat a touch as a straddle; `decide` alone reads a touch as its own
  answer (`src/core/evaluate.ts:1059-1099`).
- **The verdict table matches `VERDICTS` cell for cell**, and `at`
  arises only between two exact values: an inexact ball on its point is
  `straddles` (`src/core/ball.ts:373`), as the table's parenthesis says.
  `src/core/evaluate.test.ts:1941-1995` covers every row in both
  orientations and two inexact sides.
- **The difference of two inexact values never fails for size.**
  `addBallsCore` keeps the alignment refusal for two exact operands,
  settles two inexact ones onto the grid, adds them if they then align
  and otherwise absorbs the smaller into the larger's radius
  (`src/core/ball.ts:508-526`); what remains are the exponent bound's
  failures (`overflow`, `underflow`, `unresolved` at the bound, through
  `held` and `heldSum`), every one `straddles` in `orderOf` (421). "A
  difference refused as too large", in N14, `devdocs/numbers.md#Comparison`
  and `devdocs/functions.md#The check at a call`, names a case that
  cannot arise; the phrase that is true is a difference that cannot be
  formed as a value.
- **Exact values are never refused in a comparison:** `position`
  compares them by `compare` without a difference, and `decide` on
  `1e999999999` against `-1e-999999999`, whose difference can neither be
  formed nor aligned, holds (`src/core/evaluate.test.ts:1998-2014`).
- **Every built-in edge is `unresolved` at the edge it names, located at
  the argument, and an exact argument on an edge is decided.** The
  rounding functions decide an exact argument before any cell is formed
  (`src/core/builtins/round.ts:189`), so `floor(2)`, `floor(2.5)` and
  `round(2.5)` are exact, and place an inexact ball against the open
  cell of its midpoint's result, a touch included; `div`'s edge is the
  floor's boundary times the divisor's midpoint, a value of `a`
  (`src/core/builtins/division.ts:87-91`); `sign` is `unresolved` at
  zero for a touch or a straddle (`src/core/builtins/abs.ts:34-43`);
  `pow` of an exact zero base reads the exponent's `sideOfZero`, after an
  exact exponent of zero has given one (`src/core/builtins/pow.ts:9`,
  `101-110`), so `pow(0, 0) = 1` and `pow(0, sqrt(2) - sqrt(2))` is
  `unresolved` at zero. The one asymmetry at zero is as the page says:
  `[-2, 0]` is `domain` for a logarithm or a base and `[0, 2]`
  `unresolved`. `applyBuiltin` locates an `unresolved` at the argument's
  span and a `domain` error at the call (`src/core/evaluate.ts:860-867`,
  `852-859`); the evaluator's own `unresolved` points at a divisor or a
  base, and at the whole quotient or power when the edge is the bound
  (`588-596`, `636-647`).
- **The retry predicate is three functions, and they say what the pages
  say.** `isUnresolved` retries an `unresolved` or an `undecidedCondition`
  at any depth of `callFailed`, `inverseFailed` or `inverseMismatch`
  (`src/core/pipeline.ts:377-392`); `retriesConversion` adds
  `unresolvedWant` and `unresolvedBound` (`394-405`); in decimal mode
  `step` retries an `unresolved` inside the step through the step's own
  schedule and leaves the pipeline's one pass to report it
  (`src/core/ball.ts:1109-1134`). `divisionByZero`, `nonpositiveUnit`
  and the size refusals are never retried, as `#Working precision and
  the schedule` says ("Two gaps are accepted"). An `undecidedCondition`
  wraps whatever error the body raised and is retried to the ceiling
  whether or not more digits could change that error, since they may
  decide the condition against the argument (`logit(approx(1))` below).
- **`checkConditions` matches the three bullets of `#The check at a
  call`.** The terms are evaluated at the operand context
  (`src/core/evaluate.ts:982`); the first certain failure ends the check,
  after an undecided comparison too (1016); a term that cannot be
  computed ends it as the body's error only when no comparison before
  it, in this condition or an earlier one, was undecided (986, 1025);
  an undecided comparison, or a term failing behind one, records the
  condition as assumed once the whole check has passed, after the
  assumptions of calls in the terms (1017-1037). `conditionFailed`
  names the parameters the condition mentions in the parameters' order
  (`src/core/build.ts:756`): `box(5, 1, 3)` says `x is "5", a is "1" and
  b is "3"`. Run: `guarded(sqrt(2)^2 - 2)` is `≈ 0` with two warnings,
  `x > 0` and `ln(x) > 1`, the second a term that could not be computed
  behind an undecided guard; `guarded(-1)` fails the first condition
  without reaching `ln`; `guarded(2)` fails the second.
- **The collector, the loop and the outcome are as `#An undecided
  condition` says.** A call gathers its own and its body's assumptions
  in a local array and adds them to the caller's only when the body
  computes (`src/core/evaluate.ts:722-772`); a body failing under one is
  `undecidedCondition` carrying the body's error (782); `resolve` keeps
  an assumed result as the best so far, returns a later outright failure
  over it, and adds the returned pass's assumptions
  (`src/core/pipeline.ts:351-357`, `365`); the outcome makes every line
  `≈` and writes one warning per distinct wording (`src/outcome.ts:231-232`),
  styled apart from the notes (`src/unit-converter.ts:128-135`, `263`);
  the build fails a unit whose call leaves a condition undecided
  (`src/core/build.ts:800-816`). Run: `nonneg(1 + 1e-40 - exp(1e-40))`
  is refused by `x >= 0`, undecided at the first pass and certain later;
  `logit(approx(1))` is `undecidedCondition` carrying the body's
  `unresolved`; `ident(sqrt(2)) ≈ 1.4142136` with its warning after
  every pass; `tempC(approx(-273.15))` into `tempC` carries one warning
  for two identical assumptions; the builds of `warm  tempC(-273.15 -
  sqrt(2) + sqrt(2))` and `cold  tempC(-300)` fail with
  `undecidedCondition` and `conditionFailed`.
- **A conversion into a function checks what `#A function as the want`
  lists, in that order** (`src/core/pipeline.ts:725-795`): the inverse's
  conditions on the `have`, the inverse's body, the function's
  conditions on the recovered argument, the function applied back, and
  `disjoint`, which refutes with two exact values by `equals` and
  otherwise with a difference wholly on one side of zero (`876-889`).
  `-5 K` into `tempC` is refused by the function's condition;
  `300 K = tempF(80.33)`.
- **Decimal mode decides every comparison and every edge**, since every
  value there is exact: `tempC(approx(-273.15)) = 0 K`,
  `nonneg(sqrt(2) - sqrt(2)) = 0` and `ident(sqrt(2)) = 1.4142136` with
  no warning; `floor(sqrt(2)^2) = 2`, `1 / (sqrt(2)^2 - 2) = 10000000`,
  `tan(90 deg) = -13660250`; `gamma(approx(-2))` is the pole's `domain`
  error, `approx` being the identity there.
- **Equality** surfaces exactly where N16 says: the `at` row of the four
  comparators, the exact cases, `=` on a line, and `disjoint`'s
  refutation; `Comparator` has no `=` and no `!=`.
- One reference-style issue link (`[#134][134]`) stands in `#An undecided
  condition`, outside the Markdown subset; V4's to inline (§12,
  question 26).

The examples run, as the app shows them, at eight digits (exact mode
unless marked); the four test functions are the ones named at the top:

| Expression | Line |
| --- | --- |
| `1 / (sqrt(2)^2 - 2)` | refused: `"(sqrt(2)^2 - 2)" cannot be told from zero at this precision, and the result depends on which side of zero it lies.` |
| `floor(sqrt(2)^2)` | refused: `"sqrt(2)^2" cannot be told from 2 at this precision, and the result depends on which side of 2 it lies.` |
| `round(2.5 + sqrt(2) - sqrt(2))` | refused, "cannot be told from 2.5" |
| `sign(sqrt(2)^2 - 2)`, `ln(sqrt(2)^2 - 2)`, `pow(0, sqrt(2)^2 - 2)`, `atan2(sqrt(2)^2 - 2, 0)` | refused, the argument "cannot be told from zero" |
| `trunc(approx(2))`, `ceil(approx(2))`, `floor(approx(-2))` | refused, "cannot be told from 2", "from 2", "from -2" |
| `div(sqrt(2)^2, 1)`, `mod(sqrt(2)^2, 1)` | refused, "cannot be told from 2" |
| `div(7, sqrt(2)^2 - 2)` | refused, the divisor "cannot be told from zero" |
| `floor(2)`, `floor(2.5)`, `round(2.5)`, `floor(sqrt(2))` | `= 2`, `= 2`, `= 2`, `= 1` |
| `abs(sqrt(2)^2 - 2)` | `abs(sqrt(2)^2 - 2) ≈ 0 (within 4e-4049 of zero)` |
| `pow(0, 0)`, `0^0`, `pow(0, approx(0))`, `sign(0)`, `sign(approx(0))` | `= 1`, `= 1`, `= 1`, `= 0`, `= 0` |
| `pow(0, -1)` | refused: `Division by zero in "pow(0, -1)".` |
| `asin(approx(1))`, `acosh(approx(1))`, `atanh(approx(1))`, `log(approx(1), 8)` | refused, "cannot be told from 1" |
| `asin(1)` | `asin(1) ≈ 1.5707963 radian` |
| `tan(90 deg)`, `gamma(approx(-2))`, `digamma(approx(-2))` | refused, "cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies" |
| `ln(-2 + sqrt(2) - sqrt(2))` | refused: `"-2 + sqrt(2) - sqrt(2)" is not positive, and a logarithm is defined only for positive values.` |
| `exp(approx(1e999) - approx(1e999 - 5))` | `≈ 148.41316` |
| `tempC(-273.15)` | `tempC(-273.15) = 0 K` |
| `tempC(approx(-273.15))` | `≈ 0 K (within 2e-4047 of zero)`, warning `Could not tell whether the argument of "tempC" meets "x >= -273.15"; the value assumes it does.` |
| `tempC(-300)` | refused: `Cannot compute "tempC(-300)": "tempC" requires "x >= -273.15", and x is "-300".` |
| `box(2, 1, 3)`, `box(1, 1, 3)` | `= 2`, `= 1` |
| `box(approx(1), 1, 3)` | `≈ 1`, warning `Could not tell whether the arguments of "box" meet "a <= x <= b"; the value assumes they do.` |
| `box(5, 1, 3)` | refused: `Cannot compute "box(5, 1, 3)": "box" requires "a <= x <= b", and x is "5", a is "1" and b is "3".` |
| `box(2, 3, 1)` | refused: `… "box" requires "a < b", and a is "3" and b is "1".` |
| `nonneg(1 + 1e-40 - exp(1e-40))` | refused: `Cannot compute "nonneg(1 + 1e-40 - exp(1e-40))": "nonneg" requires "x >= 0", and x is "1 + 1e-40 - exp(1e-40)".` |
| `nonneg(sqrt(2) - sqrt(2))` | `≈ 0 (within 2e-4049 of zero)`, warning |
| `nonneg(approx(0))`, `nonneg(0)` | `= 0`, `= 0` |
| `logit(1.5)` | refused: `Cannot compute "logit(1.5)": "logit" requires "0 < p < 1", and p is "1.5".` |
| `logit(approx(1))` | refused: `Cannot compute "logit(approx(1))" at this precision: could not tell whether the argument of "logit" meets "0 < p < 1", and assuming so, the definition of "logit" depends on a value that cannot be told from zero at this precision.` |
| `ident(sqrt(2))`, `ident(2)` | `≈ 1.4142136` with the warning for `x - x >= 0`; `= 2` |
| `guarded(-1)`, `guarded(0)` | refused: `"guarded" requires "x > 0"` |
| `guarded(2)` | refused: `"guarded" requires "ln(x) > 1", and x is "2"` |
| `guarded(sqrt(2)^2 - 2)` | `≈ 0 (within 4e-4049 of zero)`, two warnings, for `x > 0` and for `ln(x) > 1` |
| `guarded(4)` | `guarded(4) = 4` |
| `-5 K` into `tempC` | refused: `Cannot convert "-5 K" into "tempC": the argument it would take does not meet "x >= -273.15", which "tempC" requires.` |
| `300 K` into `tempF` | `300 K = tempF(80.33)` |
| `0 K` into `tempC` | `0 K = tempC(-273.15)` |
| `tempC(approx(-273.15))` into `tempC` | `≈ tempC(-273.15)`, one warning |
| `1 m` into `(sqrt(2)^2 - 2) m` | refused: `"(sqrt(2)^2 - 2) m" cannot be told from zero at this precision, so nothing can be converted into it.` |
| `1 m` into `(sqrt(2)^2 - 2) m;cm` | refused: `"(sqrt(2)^2 - 2) m" is not positive (or cannot be told from zero), and every unit in a list must be.` |
| `turn` into `deg` | `turn ≈ 360 deg`, `deg ≈ 0.0027777778 turn` |
| `tempC(approx(-273.15))` (decimal mode) | `tempC(approx(-273.15)) = 0 K` |
| `nonneg(sqrt(2) - sqrt(2))`, `ident(sqrt(2))` (decimal mode) | `= 0`, `= 1.4142136`, no warning |
| `floor(sqrt(2)^2)`, `1 / (sqrt(2)^2 - 2)`, `sign(sqrt(2)^2 - 2)`, `round(2.5 + sqrt(2) - sqrt(2))` (decimal mode) | `= 2`, `= 10000000`, `= 1`, `= 2` |
| `asin(approx(1))`, `tan(90 deg)` (decimal mode) | `= 1.5707963 radian`, `= -13660250` |
| `gamma(approx(-2))` (decimal mode) | refused: `Cannot compute "gamma(approx(-2))": "approx(-2)" is a pole of "gamma", which has one at zero and at every negative whole number.` |
| `guarded(sqrt(2)^2 - 2)` (decimal mode) | refused by `ln(x) > 1`, `x` being exactly `1e-7` |
| `1 m` into `(sqrt(2)^2 - 2) m` (decimal mode) | `1 m = 10000000 (sqrt(2)^2 - 2) m`, with the reciprocal |
| the build with `warm  tempC(-273.15 - sqrt(2) + sqrt(2))` | fails: `undecidedCondition` naming `tempC` and `x >= -273.15`, with no error |
| the build with `cold  tempC(-300)` | fails: `conditionFailed` with the condition and `x` |

## Proposed edits

### `devdocs/numbers.md#Exact operations`

One old → new pair, the stale sentence tagged above.

Old: "A ball within an ulp of zero at the kernel's bits is treated as
containing zero, since the kernel cannot tell it apart; a ball of
unbounded radius divides when its midpoint is nonzero, giving an
unbounded quotient, and is `unresolved` when its midpoint is zero."

New: "Whether a divisor contains zero is decided as every comparison of
a midpoint with a radius is ("Comparison" below): exactly where the
radius can be formed, and by the coarse bounds otherwise, a midpoint the
bounds cannot tell from the radius counting as within it, so that the
answer is `unresolved` rather than a quotient of the wrong sign; a ball
of unbounded radius divides when its midpoint is nonzero, giving an
unbounded quotient, and is `unresolved` when its midpoint is zero."

### `devdocs/numbers.md#Comparison`

Two old → new pairs, in the section's order.

Old: "It is exact where the radius's power of two can be formed
(`FORMABLE_RADIUS_BITS`, `2^16`: every radius of the working sizes, at a
few tens of thousands of bits of canonical form per comparison), and by
the coarse bounds otherwise, with the conservative answer, "across",
where they cannot tell, which can only turn a verdict into undecided and
never into a wrong one. A ball touching a point counts as straddling
it."

New: "It is exact where the radius's power of two can be formed
(`FORMABLE_RADIUS_BITS`, `2^16`: every radius of the working sizes, at a
few tens of thousands of bits of canonical form per comparison), and by
the coarse bounds otherwise, with the conservative answer, "across",
where they cannot tell, which can only turn a verdict into undecided and
never into a wrong one. It tells a ball whose end lies exactly on the
point (`touchingAbove`, `touchingBelow`) from one reaching across it
(`straddles`), and its callers decide what a touch means: every edge
check of the built-ins, the rounding functions' cells and a unit list's
counts treat a touch as a straddle, since the value may lie on the edge,
where the answer jumps, while a condition of a user-defined function
lets a touch decide a non-strict comparison and leaves a strict one
undecided ([functions.md](functions.md), "The check at a call")."

Old: "and two inexact values through their difference, a difference
refused as too large counting as across zero."

New: "and two inexact values through their difference against zero,
which always aligns (the smaller operand absorbed into the radius, "Sums
and alignment" above) and counts as across zero when it cannot be formed
as a value, past the exponent bound or straddling it."

### `devdocs/functions.md#Conditions`

One old → new pair, the §1.2.5 row.

Old: "**There is no equality and no `!=`.** `=` always ends the head,
and equality of an inexact argument can never be decided on a ball, so
an equality condition would be undecided for every inexact argument. A
body that cannot be computed at a point already fails there."

New: "**There is no equality and no `!=` today.** `=` ends the head, and
the comparators are the four orderings. Equality operators and
conditional expressions are an extension that fits
([future.md](future.md)); a design for them has to say what an equality
of inexact values yields, since two balls can be told apart or found to
overlap but never found equal, so an equality condition on an inexact
argument could only ever be undecided. A body that cannot be computed at
a point already fails there."

### `devdocs/functions.md#The check at a call`

Two old → new pairs, in the section's order.

Old: "otherwise the right side is subtracted from the left as balls, and
the difference's position against zero decides, a difference refused as
too large to form counting as across zero (`orderOf` in `ball.ts`)."

New: "otherwise the right side is subtracted from the left as balls, and
the difference's position against zero decides, a difference that cannot
be formed as a value, past the exponent bound or straddling it, counting
as across zero (`orderOf` in `ball.ts`; two inexact values always align,
the smaller absorbed into the radius)."

Old: "So an inexact value equal to its bound never decides a strict
comparison, and decides a non-strict one only if its ball happens to end
exactly on the bound: `tempC(approx(-273.15))` stays undecided to the
ceiling."

New: "So an inexact value equal to its bound never decides a strict
comparison in its favour, and decides a non-strict one only if its ball
happens to end exactly on the bound, from the side the comparison
admits: `tempC(approx(-273.15))`, whose ball reaches across `-273.15`,
stays undecided to the ceiling."

### `devdocs/builtins.md#The rules every built-in follows`

One old → new pair.

Old: "The edges a message can name are `zero`, `1`, `-1`, a rounding
boundary written to twelve digits, `a pole of the function`, and the
point where the result passes the exponent bound."

New: "The edges a message can name are `zero`, a point written to twelve
digits (`1`, `-1`, a rounding boundary, a multiple of the divisor for
`div` and `mod`, or the result itself where a rounding function's cell
cannot be formed), `a pole of the function`, and the point where the
result passes the exponent bound."

## Terminology

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "touching" / "a touch" (the code's `touchingAbove`, `touchingBelow`; the pages' "touching a point", "an end exactly on it", "at its bound") vs "straddles" / "across" / "reaching across" | `devdocs/numbers.md#Comparison`, `devdocs/functions.md#The check at a call`, `devdocs/builtins.md#The rules every built-in follows` | devdocs: **touch** (an end exactly on the point) and **straddle** (reaching across), the two answers of `position`; docs: one phrase, a value whose bounds reach or meet the edge, since the built-ins treat the two alike and the conditions' distinction is a devdocs matter (question 1 below). |
| "edge" (a domain end, a pole, the bound; `Edge`) vs "boundary" (a rounding cell's end, `round.ts`) vs "bound" (a condition's) | the three pages | **edge** for the point a built-in's result depends on (what `Edge` carries), **boundary** for a rounding cell's end, **bound** for a condition's; docs: "edge" alone, with section 8's "cannot be told from". |
| "assumption" / "assumed" (devdocs, the code) vs "the condition it assumed", "the value assumes it does" (docs, the warning) | `devdocs/functions.md#An undecided condition`, `docs/definitions.md#Functions` | **undecided condition** for the state and **assumed** for what the value then does, as section 8 and C43 have it; "assumption" devdocs-only. |
| "verdict" (`decide`, `Verdict`, the pages' table) | `devdocs/functions.md#The check at a call` | devdocs-only; docs say the condition holds, fails or cannot be decided. |

## Questions for the owner

1. The user docs' comparison rule (§7, `numbers.md`, "Comparison and
   equality"): should it state the touch rule, that a bound exactly met
   decides a non-strict comparison and leaves a strict one undecided, or
   only that an inexact value at its bound is undecided? Proposed: one
   sentence for the non-strict case, since every `>=` condition at
   absolute zero meets it, and the six-row table stays in devdocs.
2. The rewrite of the equality bullet points at `devdocs/future.md` for
   "Equality operators and conditional expressions" (§1.3), which no
   page records yet. Proposed: V6 adds the entry under "Extensions that
   fit", with the constraint that a design must answer what an
   undecidable comparison of inexact values yields, and V4 links to it.
3. The message for a `pole` or `bound` edge ends "and the result depends
   on which side of it it lies" (`src/messages.ts:94`; `tan(90 deg)`
   above). Proposed: a code change outside the audit, naming the edge
   once more in short ("which side of the pole", "which side of the
   bound"), recorded as the "certain" wording was (§12, question 8).
4. The comments of `orderOf` and `disjoint` (`src/core/ball.ts:409-416`,
   `src/core/pipeline.ts:871-875`) repeat "a difference refused as too
   large to form", the phrase corrected above. Proposed: aligned with the
   page when the page is fixed; a code change outside the audit.
5. For V3: `#The exact functions` says the rounding functions decide a
   ball "against the open cell", so a ball inside a closed cell that ends
   exactly on its closed end (`[2, 2.5]` for `floor`) is `unresolved`
   though every value in it floors to `2`; the rule is uniform, and the
   next pass removes the touch. Proposed: record it as intent in V3 (a
   touch is a straddle at every edge, so that no edge check has to know
   which end of a cell is closed), with no code change.

## Notes on this run

The plan's scope for A6 was right in its modules, and the parenthesized
functions of `ball.ts` were enough with the module's header. The one
substantive finding turns on `position` being six-valued where the plan
and one sentence of `#Comparison` make it three-valued: "touching counts
as straddling" is true of every caller but `decide`, and the way to
verify N14 is to read the callers, not `position`. Verifying N15's
wording needed `src/messages.ts` and the edge checks of six built-in
modules the entry does not list (D5–D7's modules), and the decimal-mode
retry needed `step`; a later revision of the entry could name
`messages.ts` and `step`. The next units should know: D2 can take the
corrected N14 and the `guarded` example, in which a term that cannot be
computed behind an undecided guard is assumed and warned of; V4 should
read `#The check at a call` and `#An undecided condition` against
`checkConditions` and `resolve` bullet by bullet, since every bullet
holds and only the one phrase on the difference is wrong; V1 carries
the two `#Comparison` edits and the `#Exact operations` sentence; A8 and
D2 should note that `countOf` is the one place a touch decides a value
without `decide`, a ratio touching an integer being counted as that
integer. This run began on a checkout of `docs-revamp` one commit behind
the skill; once `origin/docs-revamp` was fetched the branch was created
from it at the skill's revision, no page or code was changed, and this
report is the unit's whole product.
