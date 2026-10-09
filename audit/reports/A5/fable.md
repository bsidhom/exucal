# Unit A5: Size limits, refusals and `approx` (fable)

- Plan revision: b605b2b
- Date: 2026-10-09
- Model: claude-fable-5-1 (the session's `session_context.model` and its
  `last_served_model` agree)
- Doc sections read: `devdocs/numbers.md#The significand limit`,
  `#The exponent bound`, `#Which limit a refusal names`, `#approx`,
  `#Failures`; `docs/functions.md#Very large results and approx`;
  `docs/settings.md#(top) > Significand limit`
- Modules read: `src/core/rational.ts`, `src/core/scaled.ts`,
  `src/core/ball.ts`, `src/core/builtins/approx.ts`, `src/core/evaluate.ts`,
  `src/messages.ts`, each in full
- Also read: `src/core/pipeline.ts` (the header's paragraph on the loop
  and lines 255-442, 627-652, 799-807: `resolve`, `isUnresolved`,
  `retriesConversion`, `refusal`); `src/core/builtin.ts` and
  `src/core/context.ts` in full; `src/core/quantity.ts` (`stepQuantity`);
  `src/core/builtins/pow.ts` (lines 1-200); the `tooLarge` sites of
  `src/core/builtins/integers.ts`, `trig.ts`, `round.ts`, `division.ts`,
  `erf.ts`, `incomplete.ts`, `incbeta.ts`, `beta.ts` and of
  `src/core/dimension-of.ts`, found by search and read with their
  context; `src/core/expr.ts` (`Rejection`, lines 169-178 and 303-331);
  `src/core/fixed.ts` (`FORMABLE_BITS`, lines 136-170);
  `src/core/display.ts` (`show`'s signature); `src/settings.ts` (the
  significand-limit keys, by search). As evidence of the message texts:
  the refusal assertions of `src/messages.test.ts`,
  `src/core/builtins/approx.test.ts` and `src/core/builtins/pow.test.ts`,
  `exact.test.ts`, `trig.test.ts`, `beta.test.ts`, `erf.test.ts`,
  `gamma.test.ts`, `hyperbolic.test.ts`, `incomplete.test.ts`. As context
  only: the rest of `devdocs/numbers.md`, `docs/functions.md` and
  `docs/settings.md`; the state of GitHub issues #40, #98, #100 and
  #171; `audit/README.md`. The worked examples were run through
  `evaluateText` and `convertText` on the system table with the app's
  built-ins, at the defaults (eight digits, half even, the default
  limits), from a scratch script outside the tree.

## Summary

| Measure                                        | Count                              |
| ---------------------------------------------- | ---------------------------------- |
| Claims confirmed                               | 3                                  |
| Claims corrected                               | 2                                  |
| Claims not verifiable here                     | 0                                  |
| Stale passages: update / keep as intent / drop | 3 / 1 / 1                          |
| Gaps confirmed / refuted / new                 | 0 / 0 / 0 (not an A unit's output) |
| Proposed edits                                 | 5                                  |
| Questions for the owner                        | 5                                  |

One row of §1.1.5 is withdrawn rather than tagged (the passages it names
are current); it is counted in none of the three.

## Claims

| Claim                                                                                                                                                      | Verdict   | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Note or corrected statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N3, the `approx` part: in exact mode inexactness enters in exactly two ways, an inexact built-in and `approx` (`audit/plan/01-core-abstractions.md:29-35`) | confirmed | `src/core/builtins/approx.ts:29-34` (`approxBall` is `widened`); `src/core/ball.ts:1158-1163` (`widened`); the only other roundings of an exact value in exact mode are `onGrid` and `gridded`, `src/core/ball.ts:1009-1039`, reached only once a pair of exact operands has been handled: `src/core/ball.ts:508` (`addBallsCore`), `:646-649` (`multiplyBallsCore`), `:829-835` (`divideBallsCore`); `settle` leaves an exact ball as it is, `src/core/ball.ts:1016`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | §1.1.6 item 9 answered: an `onGrid` rounding of an exact operand is charged to the radius of a result that is inexact in any case, the other operand being inexact, so it never makes a value inexact on its own. The exact-mode producers of a nonzero radius are the kernel's exits (a root, a routine, `pi()` and the angle units built from it) and `widened`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| N21, the significand limit (`audit/plan/01-core-abstractions.md:194-210`)                                                                                  | corrected | `src/core/context.ts:170` (`DEFAULT_SIGNIFICAND_LIMIT_BITS = 1 << 16`); `src/core/scaled.ts:496-505` (`significandWithin`, the numerator and the denominator each); the predictions `src/core/rational.ts:201-251` (`addWithin`), `:311-362` (`multiplyWithin`, `divideWithin`, `formedWithin`), `:418-444` (`pow`), `src/core/scaled.ts:377-404` (`combine`), `:430-440` (`scaledWithin`); the assertion `src/core/evaluate.ts:409-422`; `Reach` and `Need`, `src/core/rational.ts:66-88`; the message `src/messages.ts:349-381`; the operand named `src/core/evaluate.ts:434-486`; `exceeds` refusals at an argument's own bits whatever its exactness: `src/core/builtins/trig.ts:119-123` with `isHuge`, `src/core/builtin.ts:417-424`; `src/core/ball.ts:734-740` and `:1815-1826` (`unaffordable`); `src/core/builtins/integers.ts:112-114`; no `tooLarge` retried: `src/core/pipeline.ts:353-356`, `:376-404`, `:438`; `5^30000` has 69,658 bits (computed) and the refusal says "about 69,659 bits" (`src/messages.test.ts:274`)                           | Corrected statement: "Significand limit (bits, default 65,536): the most bits of a significand's numerator and, separately, denominator. It is strict: every exact result's size is predicted before forming and refused, with the bits it would need where the refusing operation can count them (exactly, for a value that exists; as a bound a bit or so over the truth, for a prediction; not at all for a few built-in refusals that count nothing). Where the operation expects the same step to fit computed inexactly (`fits`) the message suggests `approx(…)` around the node's first operand, which the evaluator names, or decimal mode, left out when the user is in it; where it expects the step to pass the limit however it is computed (`exceeds`: a literal of more digits than the limit, `factorial(20000)`, `2^1e-30000`, `sin` of a huge angle, a log-space power whose decision needs more bits than the limit holds) it says so and suggests nothing. A result of the exact operations (`+ - * /`, an integer power) with an inexact operand is never refused for its size: the exact operand is put on the working grid and the result is settled. A built-in that works at an argument's own bits refuses by those bits whatever the argument's exactness. Any result, exact or inexact, is still held to the exponent bound (N22). A dyadic denominator is stored with fives (`2^-30000` is stored in 69,658 bits and refused with 'about 69,659 bits', the prediction's bound). `tooLarge` is one error kind: its reach is `fits` or `exceeds` and its need `exact`, `bound` or `unknown`; the retry loop retries none of them, and one first raised on a later pass ends the loop with the best earlier result (Findings, 2)." |
| N22, the exponent bound (`audit/plan/01-core-abstractions.md:211-219`)                                                                                     | confirmed | `src/core/scaled.ts:165` (`MAX_EXPONENT`), `:173` (`BOUND_BAND`), `:187-202` (`scaled`, `pastBound`); the whole-ball rule `src/core/ball.ts:711-731` (`held`), `:743` (`AT_BOUND`), `:746-751` (`zeroWithin`), `:758-763` (`belowTop`), `:778-795` (`againstPowerOfTen`); the classifier `src/core/ball.ts:1620-1626` (the edges), `:1659-1682` (`classifyLog`), `:1692-1705` (`classifyExp`), `:1714-1725` (`classifyHyperbolic`), `:1765-1835` (`classifyPower`); the messages `src/messages.ts:390-399`, `:414-419`, `:490-491`; the straddle retried `src/core/pipeline.ts:376-404`; verified through the pipeline at the defaults: `exp(2.3e18)` is `≈ 3.9591004e+998877308377479203` and `exp(2.31e18)`, `exp(1e999)` and `exp(approx(1e999))` are too large, `exp(-1e999)` is too small, `exp(1e6)` is `≈ 3.0332154e+434294`, `exp(approx(1e999) - approx(1e999 - 5))` is `≈ 148.41316`, and `approx(5e1000000000000000000) + 5e1000000000000000000` ends with "cannot be told from the point where the result passes the exponent bound at this precision" | Three facts for the user page beside the claim: the bound is on the value and not on the stored form (`1e1000000000000000000 / 3 * 10` is a value, `1e-1000000000000000000 / 7` is too small; `devdocs/numbers.md:484-497`); zero is within the bound at any exponent, so a ball containing zero whose midpoint passes below is zero within a bound, not a refusal (`src/core/ball.ts:719-723`); a literal past the bound is rejected as it is typed, with "this number's exponent passes 10^18" or "falls below -10^18" (`src/core/expr.ts:303-313`, `src/messages.ts:316-328`), while `0.001e1000000000000000003` parses and `0e2000000000000000000` is zero.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| N23, `approx` (`audit/plan/01-core-abstractions.md:220-226`)                                                                                               | confirmed | `src/core/ball.ts:1158-1163` (`widened`: the radius is `maxRadius` of the ball's own and `powerOfTenRadius(decimalExponent(mid) - digits + 1)`, one unit in the last of `workingDigits(context)`; a zero midpoint and an unbounded radius are returned as they are); `src/core/builtins/approx.ts:36-42` (arity one, `sameAsArgument`, `decimal: "identity"`); `src/core/evaluate.ts:838-840` (the identity applied in decimal mode); `src/core/context.ts:144-146` (`workingDigits`); `src/core/builtins/approx.test.ts:72-121`; verified: `approx(1e999999999) + 1` is `≈ 1e+999999999`, `approx(3)^1000000000` is `≈ 5.243997e+477121254`, `approx(3^32767) * 7^21845` is `≈ 9.9732685e+34094`, `approx(approx(2))` is `≈ 2`, `approx(0)` is `= 0`, `approx(2 m)` keeps the metre and `approx(30 deg)` the radian kind, `exp(approx(1e999))` is too large                                                                                                                                                                                                       | The unit is taken at the working digits of the pass (18 at a precision of eight, 28 at the schedule's first pass), and the evaluator then settles the result. `approx` on one operand of a product, quotient or sum suffices, the exact operand being put on the working grid (`onGrid`, `src/core/ball.ts:1009-1012`, `:666-669`, `:840-843`). `widened` also serves decimal mode's power of an exact base that does not fit (`src/core/evaluate.ts:1136-1156`), where the function `approx` itself is the identity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| N24, which limit a refusal names (`audit/plan/01-core-abstractions.md:227-231`)                                                                            | corrected | `src/core/scaled.ts:515-531` (`multiply`), `:542-546` (`pastBoundBetween`), `:554-571` (`divide`), `:597-615` (`pow`), `:891` (`POWER_MARGIN`, a relative `2^-20`), `:927-939` (`powerRefusal`); `src/core/evaluate.ts:606-623` (a `^` exponent that cannot be formed, told by `powerRefusal` too); a sum that cannot align is refused on the alignment alone, `src/core/scaled.ts:387-398`; verified: `7^1e19` and `7^10000000000000000000` are too large, `2.54^1e18` is past the significand limit (`fits`, "about 7,988,684,686,773,075,000 bits"), `1.0000000001^1e30` is too large, `2^1e-30000` is past the limit however it is computed, `5e1000000000000000000 + 5e1000000000000000000` is too large                                                                                                                                                                                                                                                                                                                                                      | Corrected statement: "Which limit a refusal names: a product, quotient or power past both limits is reported at the exponent bound; a hair from the bound, at the significand limit (`7^1e19` is too large to compute; `2.54^1e18` is past the significand limit, with the reach the operation states, N21). A sum never faces the choice: a sum that aligns and passes the bound is too large or too small to compute, and a sum that cannot be aligned has the value of its larger operand, which is within the bound." The devdocs state the rule for products and quotients (`devdocs/numbers.md:632-634`); the word "sum" is the plan's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Stale passages

| Where                                                                                                                                 | Passage                                                                                                                                                                                                                                                           | Tag                                 | Rewrite                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devdocs/numbers.md#The significand limit`, lines 1370-1374 (the row of §1.1.5)                                                       | "Measuring after forming, which the limit did at first, was deliberate while it lasted (a prediction from unreduced sizes refuses `x / x`, and for a quotient is no bound at all), and the strict limit keeps its answers by predicting after the gcds."          | keep as intent, confirmed           | "What is formed is at most the gcds' operands, which is what the probe times when it recommends the limit. The prediction runs after the cross-cancelling gcds and never on the unreduced sizes: a prediction from those would refuse `x / x`, and for a quotient would be no bound at all. Measuring the result after forming it is the ruled-out alternative: it would bound what is kept and not what is formed, and the limit is a bound on what the device forms." |
| `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule` (the row of §1.1.5) | `tooLarge` described as one refusal carrying a `Need` and a `Reach`, which the retry loop never retries                                                                                                                                                           | withdrawn: the passages are current | none. The code has one error kind `tooLarge` (`src/core/rational.ts:96`); its classes are its reach, `fits` or `exceeds`, and its need, `exact`, `bound` or `unknown`, which `devdocs/numbers.md:1376-1398` describes; `resolve` retries no `tooLarge` (`src/core/pipeline.ts:353-356`), and the sentence of `#Working precision and the schedule` that a later pass's `tooLarge` ends the loop with the best result so far matches it (Findings, 2).                   |
| `devdocs/numbers.md#The significand limit`, lines 1364-1365                                                                           | "The exponent bound is checked first, so that a result past both is reported at the bound."                                                                                                                                                                       | update                              | "A result past both limits is reported at the bound: the prediction refuses it before anything is formed, and a `tooLarge` of a product or a quotient is then read against the operands' decimal exponents (`pastBoundBetween`), a power's through `powerRefusal`, and reported at the bound when every exponent the result can have lies past it."                                                                                                                     |
| `devdocs/numbers.md#The significand limit`, lines 1326-1327                                                                           | "So `1 / 2^n` is refused past `n ≈ 28,225` at the default, as `0.5^30000` is, since each is stored with `5^n`."                                                                                                                                                   | update                              | "So `1 / 2^n` is refused from `n = 28,225` at the default (`5^28225` has 65,537 bits, and `1 / 2^28224` is a value), as `0.5^30000` is, since each is stored with `5^n`."                                                                                                                                                                                                                                                                                               |
| `devdocs/numbers.md#Which limit a refusal names`, lines 608-612                                                                       | the `1e999999999 + 1` message quoted without its second sentence                                                                                                                                                                                                  | update                              | quote the message whole: `"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.` (`src/messages.test.ts:157`)                                                                                                                                                                                  |
| `docs/functions.md#Very large results and approx`, lines 249-253                                                                      | "Keep the arguments exact there: the difference `approx(1e999) - approx(1e999 - 5)` is `5` within about `2e948` at the first pass, and `exp` refuses it for the size that radius allows, although by the sixth pass it would be `5` within `2e-354` (issue #40)." | drop                                | delete. Issue #40 is closed, fixed by the merged PR #84; the app retries the difference and answers `≈ 148.41316` at the defaults, which the section's paragraph on the whole-ball rule already states; and §12, question 26 deletes every reference to a resolved issue.                                                                                                                                                                                               |

No row of §9.4 names this unit's sections.

## Findings

### 1. How the model holds up

The size-limit model of section 1 holds against the code: two limits on
two axes, the significand limit strict by prediction and the exponent
bound on the value, decided over the whole ball. Every message the three
doc sections quote and every worked example they give reproduces at the
defaults (the table in 7). The one item the plan left open, the classes
of `tooLarge`, turns out to be settled by the pages as they stand: there
are no classes beyond the reach and the need the pages describe, and the
retry loop retries none.

### 2. The classes of `tooLarge` (§1.1.6 item 14)

`tooLarge` is one error kind (`src/core/rational.ts:96`) with two
required fields:

- the reach (`src/core/rational.ts:66`): `fits`, where only the exact
  result passes the limit and an inexact operand, from `approx` or from
  decimal mode's rounding, is expected to bring the step within it;
  `exceeds`, where the computation needs more bits than the limit holds
  whatever its operands;
- the need (`src/core/rational.ts:80-83`): `exact`, a value that exists
  was measured; `bound`, a prediction a bit or so over the truth;
  `unknown`, a test that yields no count.

The evaluator adds the node's `span` and, on `fits` alone, the
`operand` the remedy goes around (`src/core/evaluate.ts:249-255`,
`:434-486`). Every site, with what it carries:

| Site                                                                                                                                    | Reach     | Need                                                                                                                                         | When                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addWithin`, `subtractWithin` (`src/core/rational.ts:201-251`)                                                                          | `fits`    | `bound`                                                                                                                                      | the unreduced sum's size, Henrici's form with the common factor out                                                                                               |
| `combine` (`src/core/scaled.ts:377-404`)                                                                                                | `fits`    | `bound`                                                                                                                                      | a sum's alignment shift (`1e999999999 + 1`, "about 3,321,928,093 bits")                                                                                           |
| `multiplyWithin`, `divideWithin` (`src/core/rational.ts:311-362`)                                                                       | `fits`    | `bound`                                                                                                                                      | a product or a quotient after its cross-cancelling gcds (`3^32767 * 7^21845`, "about 113,262 bits")                                                               |
| `pow` (`src/core/rational.ts:418-444`)                                                                                                  | `fits`    | `bound`, or `unknown` when the count passes a double (`pow(1 + 1e-19000, 1e19000)`)                                                          | an exact integer power's prediction (`3^1000000000`, `2^65536`)                                                                                                   |
| `scaledWithin` (`src/core/scaled.ts:430-440`)                                                                                           | `fits`    | `bound`                                                                                                                                      | the canonical form of a quotient or power whose fraction fits, a denominator's twos becoming fives (`2^-30000`, "about 69,659 bits")                              |
| the conversion's ratio and a function want's count (`src/core/pipeline.ts:262-271`, `:645-652`, `:799-807`)                             | `fits`    | `bound`                                                                                                                                      | the same arithmetic outside the evaluator; the message names `approx` around the whole `have`                                                                     |
| the evaluator's number node (`src/core/evaluate.ts:505-519`)                                                                            | `exceeds` | `exact`                                                                                                                                      | a literal past the setting and within the parser's hard bound (a literal of 20,001 digits: "of 66,439 bits")                                                      |
| `reduceExponent` and the `^` node (`src/core/evaluate.ts:602-624`, `:1217-1251`); a unit's exponent, `src/core/dimension-of.ts:141-148` | `exceeds` | `exact` for an exponent literal past the limit, else `bound` from `toRational` (`src/core/scaled.ts:218-240`, `:479-487`)                    | a `^` exponent that cannot be formed as a fraction (`2^1e-30000`, "about 99,659 bits"), unless `powerRefusal` places the power past the bound                     |
| `unaffordable` (`src/core/ball.ts:734-740`, `:1815-1826`)                                                                               | `exceeds` | `exact`                                                                                                                                      | a log-space power whose decision needs the logarithm at more bits than the limit holds: the working bits plus the magnitudes of the exponent and of the logarithm |
| `src/core/builtins/trig.ts:119-123`                                                                                                     | `exceeds` | `bound` (`reductionBits`)                                                                                                                    | `sin`, `cos`, `tan` of an argument reaching `2^significandLimitBits` radians, whatever its exactness (`sin(1e999999999 radian)`, "about 3,321,928,184 bits")      |
| `src/core/builtins/integers.ts:112-114`, `:134-136`, `:167-169`; `:128`, `:160`; `:46-51`                                               | `exceeds` | `bound` from Stirling's formula; `unknown` past `FACTORIAL_LIMIT`; the `toRational` need for an argument whose power of ten cannot be formed | `factorial`, `doublefactorial`, `binomial` predicted past the limit (`factorial(20000)`, "about 256,909 bits")                                                    |
| `src/core/builtins/beta.ts:129-131`, `incbeta.ts:209-212`, `incomplete.ts:210-219`                                                      | `exceeds` | `exact`, or `unknown` where a magnitude was capped at the limit                                                                              | the series' working bits at the arguments' magnitudes (`beta(1e20000, 2)`, "of 65,662 bits")                                                                      |
| `src/core/builtins/incomplete.ts:246`, `incbeta.ts:221`                                                                                 | `exceeds` | `unknown`                                                                                                                                    | a large order within a few percent of a large argument, which no route computes                                                                                   |
| `src/core/builtins/erf.ts:193-195`, `incomplete.ts:295-297`, `incbeta.ts:497-499`                                                       | `exceeds` | `unknown`                                                                                                                                    | a wide argument whose two ends cannot be aligned within the limit                                                                                                 |
| `src/core/builtins/round.ts:74-76`, `:80-83`, `:147-150`, `:157-161`, `:255-260`                                                        | `exceeds` | `unknown`, or `bound` at `:149`                                                                                                              | a rounding function whose integer part or stepped value cannot be formed (`floor(10^30000/3)`; `round(10^30000/3, 2)`, "about 99,668 bits")                       |
| `src/core/builtins/division.ts:121-123`, `:136`, `:144-146`                                                                             | `exceeds` | `unknown`                                                                                                                                    | `div` or `mod` whose quotient or remainder cannot be formed (`mod(10^30000, 3)`)                                                                                  |
| `src/core/builtins/pow.ts:169-182`                                                                                                      | `exceeds` | `unknown`                                                                                                                                    | `pow` with an exact exponent that cannot be formed, on a base straddling zero                                                                                     |

Two limits on a literal are not `tooLarge` at the user level: a literal
of more digits than the hard bound, `MAX_SIGNIFICAND_LIMIT_BITS` (`2^20`
bits, about 315,000 digits; `src/core/rational.ts:115`,
`src/core/scaled.ts:737-744`), and a `^` exponent whose power of ten
cannot be formed within it are the parser's rejections
(`src/core/expr.ts:303-331`), worded "this number is too large to
represent" with no count and no remedy (`src/messages.ts:316-328`). A
literal past the setting but within the hard bound is the evaluator's
`exceeds` refusal with an exact count.

Retrying. `resolve` (`src/core/pipeline.ts:334-361`) continues past an
error only when the predicate accepts it, and the two predicates accept
an `unresolved` at any depth of a call or an inverse, an
`undecidedCondition`, `unresolvedWant` and `unresolvedBound`
(`:376-404`; `evaluateText` passes `isUnresolved`, `:438`); `step` in
decimal mode retries `unresolved` alone (`src/core/ball.ts:1112`). Any
`tooLarge` ends the loop: with the best earlier result when a pass
produced one that assumed no condition, and otherwise with the refusal.
The only sites whose count grows with the pass's bits, so that a later
pass can be the first to refuse, are `unaffordable` and the series'
working bits; the plan's "some of which the retry loop retries" is not
in the code.

The message (`src/messages.ts:349-381`), as the tests pin it:

- `fits`: `"<node>" would need a significand of about N bits as an
exact value, past the significand limit. Try "approx(<operand>)" in
place of "<operand>", or decimal mode, to compute it to the digits
asked.` An `exact` need reads "of N bits"; an `unknown` one drops the
  count ("would need a significand as an exact value"); in decimal mode
  the clause ", or decimal mode," is dropped (`src/messages.test.ts:325`);
  for a conversion the node is `"<have>" into "<want>"` and the remedy
  `Try "approx(<have>)", or decimal mode,` (`src/messages.test.ts:330`,
  `:389`). The operand is the node's first operand (`firstOperand`,
  `src/core/evaluate.ts:472-486`): a binary's left (`1e999999999 m - 1 m`
  suggests `approx(1e999999999 m)`), a power's base (`2^-30000` suggests
  `approx(2)`; `1/2^28225` suggests `approx(1)`, the quotient's left), a
  call's first argument. The branch for a node with no first operand
  ("Try approx around a part of it") is reached by no `fits` site found.
  Inside a user-defined function's body the refusal is worded through
  the call with no remedy ("computes a value whose significand would
  pass the significand limit", `src/messages.ts:576-579`).
- `exceeds`: `"<node>" would need a significand of N bits, past the
significand limit, however it is computed.`, "of about N bits" for a
  bound, and with no count at all for an `unknown` need ("would need a
  significand, past the significand limit, however it is computed").
- the exponent bound: `"<node>" is too large to compute: its exponent
would pass 10^18.` and `"<node>" is too small to compute: its exponent
would fall below -10^18.` (`src/messages.ts:390-399`); a conversion
  reads `"<have>" into "<want>" is too large to compute: …`
  (`src/messages.test.ts:367`, `:371`).
- the straddle at the ceiling: `"<node>" cannot be told from the point
where the result passes the exponent bound at this precision, and the
result depends on which side of it it lies.` (`src/messages.ts:92-95`,
  `:414-419`); for a conversion, `"<have>" into "<want>" cannot be told
from the point where the result passes the exponent bound at this
precision.` (`:490-491`).

### 3. Decimal mode as the remedy

Decimal mode computes every `fits` example and refuses every `exceeds`
one, by three mechanisms: a sum that cannot align takes the neighbour
rule (`decimalSumApart`, `src/core/ball.ts:542-588`, through `summed`,
`src/core/evaluate.ts:1166-1188`), so `1e999999999 + 1` is
`= 1e+999999999`; an exact power that does not fit is computed on the
base widened to the working precision and certified (`powered`,
`src/core/evaluate.ts:1136-1156`), so `3^1000000000` is
`= 5.243997e+477121254` and `2^-30000` is `= 1.2593025e-9031`; and a
product or quotient of steps already rounded to the display digits
always fits, so `3^32767 * 7^21845` is `= 9.9732683e+34094`, one unit in
the last digit from the exact-mode `approx(3^32767) * 7^21845`, since
the mode rounds `3^32767` before the product. `2^1e-30000`,
`factorial(20000)`, `sin(1e999999999 radian)` and `exp(1e999)` are
refused in decimal mode with the same messages as in exact mode. So the
two remedies the message offers are both honest for `fits`, and the user
page can state the rule in one sentence: `approx` on an operand, or
decimal mode, computes a step the exact arithmetic refuses for its size;
neither helps a step refused "however it is computed", and neither moves
the exponent bound.

### 4. The exponent bound

- The bound is on the value, and the check runs only when the stored
  exponent lies within `BOUND_BAND` of it (`src/core/scaled.ts:187-197`):
  `1e1000000000000000000 / 3 * 10` is `≈ 3.3333333e+1000000000000000000`,
  exact, and `1e-1000000000000000000 / 7` is too small to compute. The
  parser decides a literal the same way (`src/core/expr.ts:303-313`):
  `0.001e1000000000000000003` is `= 1e+1000000000000000000`,
  `1e1000000000000000001` is rejected ("this number's exponent passes
  10^18") and `0e2000000000000000000` is `= 0`.
- The whole-ball rule (`held`, `src/core/ball.ts:711-731`): a refusal
  needs every value of the ball past the edge; a ball containing zero
  whose midpoint passes below is zero within a bound, zero being within
  the bound at any exponent; anything else at an edge is `unresolved` at
  the edge `bound` and retried. At the ceiling the message is the one in
  2 above: verified for `approx(5e1000000000000000000) +
5e1000000000000000000` and for `approx(1e1000000000000000000) m` into
  `dm`; `exp(approx(1e999) - approx(1e999 - 5))` is retried until the
  argument's ball is within the band and answers `≈ 148.41316`.
- The classifier's edges, `(10^18 + 1) ln 10`, about `2.3026e18`, and
  `-10^18 ln 10` (`src/core/ball.ts:1620-1626`): `exp(2.3e18)` is a
  value and `exp(2.31e18)` is too large; `sinh` and `cosh` are too large
  on either side (`sinh(1e30)`, `cosh(-1e30)`,
  `src/core/builtins/hyperbolic.test.ts:824-835`); `erfc(1.5e9)` is
  `≈ 2.2924176e-977162584282316622` and `erfc(1.6e9)` is too small, as
  `docs/functions.md` says of "about `1.5e9`"; `gamma(1e19)` is too large
  and `lgamma(1e19)` is `≈ 4.2749117e+20`.
- A refusal inside a definition's body is worded through the call:
  `decibel(1e30)` gives `Cannot compute "decibel(1e30)": the definition of
"decibel" computes a value whose exponent would pass 10^18.`
  (`src/messages.ts:576-579`), which is the "refused at the bound by the
  exact power" of `devdocs/numbers.md#The kernel's boundary`.
- The settle and `approx` at the bottom edge: `1e-999999999999999999 /
approx(3)` is `≈ 3.3333333e-1000000000000000000` and
  `approx(1e-999999999999999999)` is `≈ 1e-999999999999999999`, the unit
  radius taken from the exponent without forming it
  (`src/core/ball.ts:1154-1156`).

### 5. `approx`

The claim's rule is the code's (N23). Two facts for the user page
beyond it: the unit is one in the last of the working digits of the
pass, which at the schedule's first pass lies ten digits or so beyond
the display digits plus the guard (28 digits at eight), so
`approx(2.54) cm` into `in` certifies `≈ 1` on the first pass and is `≈`
rather than `=`, which is the point; and `approx` turns a refusal into a
value only where an inexact operand changes the arithmetic, in a sum,
a product, a quotient or an integer power, never a built-in's own reach:
`isHuge` tests the whole ball, so `sin` of a huge angle is refused with
`approx` as without (`src/core/builtins/trig.ts:119-123`,
`src/core/builtin.ts:417-424`), and `exp(approx(1e999))` is refused as
`exp(1e999)` is. The definitions-file use of `approx` that
`devdocs/numbers.md#approx` describes is exercised by
`src/core/builtins/approx.test.ts:123-150` (`G approx(6.674e-11) m^3`, a
function body `approx(x)`).

### 6. Constants verified

| Constant                                            | Value                                                                  | Evidence                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| significand limit, default                          | 65,536 bits (about 19,700 digits)                                      | `src/core/context.ts:170`; `65536 × log10 2 = 19,728`                                         |
| its hard bound                                      | `2^20` bits, about 315,000 digits                                      | `src/core/rational.ts:115`; the parser's `digits × 3.33 > 2^20`, `src/core/scaled.ts:737-744` |
| its floor                                           | 358 bits                                                               | `src/core/context.ts:269`, computed                                                           |
| precision limit under the default significand limit | 2,453 digits; its ceiling 9,852 digits, 32,760 bits, twice that 65,520 | `src/core/context.ts:251-262`, computed; `devdocs/numbers.md:1291-1293`                       |
| exponent bound                                      | `10^18`                                                                | `src/core/scaled.ts:165`                                                                      |
| `BOUND_BAND`                                        | `4 × 10^8`                                                             | `src/core/scaled.ts:173`                                                                      |
| `POWER_MARGIN`                                      | a relative `2^-20`                                                     | `src/core/scaled.ts:891`                                                                      |
| `MARGIN_BITS` of the classifier                     | 40                                                                     | `src/core/ball.ts:1650`                                                                       |
| `5^30000`                                           | 69,658 bits (the refusal's bound: 69,659)                              | computed; `src/messages.test.ts:274`                                                          |
| `3^100000`                                          | 158,497 bits                                                           | computed; the refusal says "about 158,497 bits"                                               |
| working digits                                      | 18 at a precision of eight, 28 at the schedule's first pass of 18      | `workingDigits`, `src/core/context.ts:144-146`, computed                                      |
| the top edge on the logarithm                       | `(10^18 + 1) ln 10 ≈ 2.3026e18`                                        | `src/core/ball.ts:1620-1626`, computed                                                        |

### 7. The worked examples, verified

At the defaults in exact mode unless noted (eight digits, half even,
65,536 bits, a precision limit of 1,000); "refused" is the significand
limit's message, "too large" and "too small" the exponent bound's.

| Expression                                                                                                                   | What the app shows                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `1e999999999 + 1`                                                                                                            | refused, "about 3,321,928,093 bits", suggests `approx(1e999999999)` or decimal mode              |
| `approx(1e999999999) + 1`; `sqrt(2) + 1e999999999`                                                                           | `≈ 1e+999999999`                                                                                 |
| `1e999999999 * 1e999999999`                                                                                                  | `= 1e+1999999998`                                                                                |
| `3^1000000000`                                                                                                               | refused, "about 1,584,962,501 bits", suggests `approx(3)`                                        |
| `approx(3)^1000000000`                                                                                                       | `≈ 5.243997e+477121254`                                                                          |
| `2^65535`; `2^65536`                                                                                                         | `≈ 1.001765e+19728` (exact, with more digits than shown); refused, "about 65,537 bits"           |
| `2^-30000`; `2^-28000`                                                                                                       | refused, "about 69,659 bits"; `≈ 1.4458439e-8429` (exact)                                        |
| `1/2^28224`; `1/2^28225`; `0.5^28225`                                                                                        | `≈ 5.3629331e-8497` (exact); refused, "about 65,538 bits"; refused, "about 65,537 bits"          |
| `3^-100000`                                                                                                                  | refused, "about 158,497 bits"                                                                    |
| `10^1000000000`; `10^1442695`; `2^1442695`                                                                                   | `= 1e+1000000000`; `= 1e+1442695`; refused, "about 1,442,696 bits"                               |
| `3^32767 * 7^21845`; `1/3^32767 + 1/7^21845`                                                                                 | refused, "about 113,262 bits", suggests `approx(3^32767)`; refused, "about 113,263 bits"         |
| `approx(3^32767) * 7^21845`                                                                                                  | `≈ 9.9732685e+34094`                                                                             |
| `7^1e19`; `7^10000000000000000000`; `1.0000000001^1e30`                                                                      | too large                                                                                        |
| `2.54^1e18`                                                                                                                  | refused, "about 7,988,684,686,773,075,000 bits", suggests `approx(2.54)`                         |
| `2^1e-30000`; `pow(2, 1e-30000)`                                                                                             | refused, "about 99,659 bits", no remedy; `≈ 1`                                                   |
| `2^0.1234567`; `pow(2, sqrt(2))`; `7^(100000/3)`; `10^(100000/3)`                                                            | `≈ 1.0893418`; `≈ 2.6651441`; `≈ 8.6033411e+28169`; `≈ 2.1544347e+33333`                         |
| `exp(1e6)`; `exp(2.3e18)`                                                                                                    | `≈ 3.0332154e+434294`; `≈ 3.9591004e+998877308377479203`                                         |
| `exp(2.31e18)`; `exp(1e999)`; `exp(approx(1e999))`; `10^1e999`; `pow(10, 1e999)`; `sinh(1e30)`; `cosh(-1e30)`; `gamma(1e19)` | too large                                                                                        |
| `exp(-1e999)`; `1e-1000000000000000000 / 7`; `erfc(1.6e9)`                                                                   | too small                                                                                        |
| `exp(approx(1e999) - approx(1e999 - 5))`; `1e999 / ln(10)`                                                                   | `≈ 148.41316`; `≈ 4.3429448e+998`                                                                |
| `1e1000000000000000000 / 3 * 10`                                                                                             | `≈ 3.3333333e+1000000000000000000` (exact)                                                       |
| `0.001e1000000000000000003`; `1e1000000000000000001`; `0e2000000000000000000`                                                | `= 1e+1000000000000000000`; rejected as typed, "this number's exponent passes 10^18"; `= 0`      |
| `5e1000000000000000000 + 5e1000000000000000000`                                                                              | too large                                                                                        |
| `approx(5e1000000000000000000) + 5e1000000000000000000`                                                                      | cannot be told from the point where the result passes the exponent bound                         |
| `1e-999999999999999999 / approx(3)`; `approx(1e-999999999999999999)`                                                         | `≈ 3.3333333e-1000000000000000000`; `≈ 1e-999999999999999999`                                    |
| `decibel(1e30)`                                                                                                              | the definition of `decibel` computes a value whose exponent would pass `10^18`                   |
| `factorial(5000)`; `factorial(20000)`; `gamma(20001)`                                                                        | `≈ 4.2285779e+16325` (exact); refused, "about 256,909 bits", no remedy; `≈ 1.8192063e+77337`     |
| `factorial(approx(5))`                                                                                                       | a domain error: not known exactly, with `gamma` pointed at                                       |
| `sin(1e999999999 radian)`; `sin(1e5000 radian)`                                                                              | refused, "about 3,321,928,184 bits", no remedy; `≈ 0.68616011`                                   |
| `lgamma(1e19)`; `erfc(1.5e9)`                                                                                                | `≈ 4.2749117e+20`; `≈ 2.2924176e-977162584282316622`                                             |
| `beta(1e20000, 2)`                                                                                                           | refused, "of 65,662 bits", no remedy                                                             |
| a literal of 20,001 digits; a literal of 320,001 digits                                                                      | refused, "of 66,439 bits", no remedy; rejected as typed, "this number is too large to represent" |
| `floor(10^30000/3)`; `mod(10^30000, 3)`; `round(10^30000/3, 2)`                                                              | refused with no count, no remedy; the same; refused, "about 99,668 bits", no remedy              |
| `pow(1 + 1e-19000, 1e19000)`                                                                                                 | refused with no count, suggests `approx(1 + 1e-19000)`                                           |
| `approx(2.54)`; `approx(sqrt(2))`; `approx(approx(2))`; `approx(0)`                                                          | `≈ 2.54`; `≈ 1.4142136`; `≈ 2`; `= 0`                                                            |
| `approx(2 m)`; `approx(30 deg)`                                                                                              | `≈ 2 m`; `≈ 0.52359878 radian` (the kind kept)                                                   |
| decimal mode: `3^1000000000`; `1e999999999 + 1`; `2^-30000`; `3^32767 * 7^21845`; `approx(2.54)`                             | `= 5.243997e+477121254`; `= 1e+999999999`; `= 1.2593025e-9031`; `= 9.9732683e+34094`; `= 2.54`   |
| decimal mode: `2^1e-30000`; `factorial(20000)`; `sin(1e999999999 radian)`; `exp(1e999)`                                      | refused or too large, as in exact mode, the message without ", or decimal mode,"                 |
| `approx(2.54) cm` into `in`; `2.54 cm` into `in`                                                                             | `≈ 1`; `= 1` (and `= 1` in decimal mode for both)                                                |
| `3^25000/7^14000 m` into `11^15000/13^14000 ft`                                                                              | refused, "about 91,440 bits", suggests `approx(3^25000/7^14000 m)` or decimal mode               |
| `approx(1e1000000000000000000) m` into `dm`                                                                                  | cannot be told from the point where the result passes the exponent bound                         |

### 8. The items of §1.1.6 assigned to this unit

- Item 5 (N21's `fits`/`exceeds` rule and the message texts): the
  Claims table and 2 above.
- Item 8 (N23's radius rule and the zero pass-through): confirmed, the
  Claims table.
- Item 9 (N3's "exactly three sources"): confirmed, the Claims table.
- Item 11 (N24's "a hair from the bound is `tooLarge`"): confirmed.
  `powerRefusal` returns `undefined` within a relative `2^-20` of the
  bound (`src/core/scaled.ts:927-939`) and both callers then say
  `tooLarge` (`src/core/scaled.ts:609-614`, `src/core/evaluate.ts:613-623`);
  for a product or a quotient `pastBoundBetween` leaves a `tooLarge`
  standing unless every exponent the result can have is past the bound
  (`src/core/scaled.ts:542-546`).
- Item 14 (the classes of `tooLarge`): 2 above.

### 9. The sections, passage by passage

- `devdocs/numbers.md#The significand limit`: accurate in every sentence
  checked, apart from the two tagged above; the `precisionLimitFor`
  derivation and its numbers hold (6 above). The sentence "An inexact
  result, and every result in decimal mode, is settled to the working
  digits and never refused for size" (lines 1420-1424) is right as a
  statement about results and should stay; the plan's N21 generalized it
  to the built-ins' reach, which the page treats two paragraphs earlier.
- `#The exponent bound`: accurate; the per-site `L` list matches
  `classifyExp`, `classifyHyperbolic` and `classifyPower`; the `gamma`,
  `erfc` and incomplete-function sites it names are D7's to check.
- `#Which limit a refusal names`: accurate apart from the partial quote;
  "`Refusal` is the three together, and `isRefusal` tells them from the
  other errors" is `src/core/scaled.ts:144-158`.
- `#approx`: accurate. Its links to #98, #100 and #171 are
  reference-style (lines 1510, 1525, 1527 and 1567-1570); the three
  issues are open, so V1 rewrites them inline, each from this one place.
  The claim that the dalton is the system file's one inexact candidate is
  D3's to confirm.
- `#Failures`: accurate; the kernel's door throws `RangeError` past four
  times the hard bound (`FORMABLE_BITS`, `src/core/fixed.ts:144`,
  `:165-170`).
- `docs/functions.md#Very large results and approx`: every example and
  both quoted messages reproduce. The section is to be dissolved into
  `numbers.md` (§12, question 10), its pass table and scratch-build
  figures to `devdocs/numbers.md`, which already carries them; two small
  things ride the dissolution (Proposed edits). The paragraph before the
  section (`#(top)`, lines 126-127) points forward to it ("the next
  section says why `approx` does not change that") and must point at
  `numbers.md` once it is dissolved, which is D8's.
- `docs/settings.md#(top) > Significand limit`: every number and example
  verified (about 19,700 digits; `10^1000000000`; 69,658 bits; the factor
  of about 2.3; `3^-100000` and its 158,497 bits; 2,453 digits), and the
  description of the remedies matches `Reach`. Per §12, question 5 the
  entry keeps a one-sentence explanation and links to `numbers.md`; when
  it moves, one sentence sharpens: "the app never rounds an exact value
  on its own" holds of an exact result, while an exact operand's digits
  beyond the working grid are rounded into an inexact result's radius,
  which is why `approx` on one operand suffices.

## Proposed edits

### devdocs/numbers.md#The significand limit

Old: "`evaluate()` asserts on every node's result, and the pipeline on
the two quotients it forms outside the evaluator, the conversion's ratio
and a function want's count: an exact result past the limit there is a
bug in a prediction, thrown, never a refusal. The exponent bound is
checked first, so that a result past both is reported at the bound."

New: "`evaluate()` asserts on every node's result, and the pipeline on
the two quotients it forms outside the evaluator, the conversion's ratio
and a function want's count: an exact result past the limit there is a
bug in a prediction, thrown, never a refusal. A result past both limits
is reported at the bound: the prediction refuses it before anything is
formed, and a `tooLarge` of a product or a quotient is then read against
the operands' decimal exponents (`pastBoundBetween`), a power's through
`powerRefusal`, and reported at the bound when every exponent the result
can have lies past it ("Which limit a refusal names" below)."

Old: "So `1 / 2^n` is refused past `n ≈ 28,225` at the default, as
`0.5^30000` is, since each is stored with `5^n`."

New: "So `1 / 2^n` is refused from `n = 28,225` at the default
(`5^28225` has 65,537 bits, and `1 / 2^28224` is a value), as
`0.5^30000` is, since each is stored with `5^n`."

### devdocs/numbers.md#Which limit a refusal names

Old: "The messages are `"1e999999999 + 1" would need a significand of
about 3,321,928,093 bits as an exact value, past the significand
limit.`, `"exp(1e999)" is too large to compute: its exponent would pass
10^18.` and `"exp(-1e999)" is too small to compute: its exponent would
fall below -10^18.`"

New: "The messages are `"1e999999999 + 1" would need a significand of
about 3,321,928,093 bits as an exact value, past the significand limit.
Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to
compute it to the digits asked.`, `"exp(1e999)" is too large to compute:
its exponent would pass 10^18.` and `"exp(-1e999)" is too small to
compute: its exponent would fall below -10^18.`; the first's second
sentence is the `fits` remedy of "The significand limit" above, and a
refusal that passes the limit however it is computed says so in its
place."

### docs/functions.md#Very large results and approx

Old: "Keep the arguments exact there: the difference `approx(1e999) -
approx(1e999 - 5)` is `5` within about `2e948` at the first pass, and
`exp` refuses it for the size that radius allows, although by the sixth
pass it would be `5` within `2e-354` (issue
[#40](https://github.com/bsidhom/exucal/issues/40))."

New: delete the sentence; the paragraph ends at "`≈ 148.41316`." The
rule it would qualify is stated two paragraphs earlier, and holds.

Old: "a power that no setting could hold is reported at the bound even
where The significand limit refuses it first"

New: "a power that no setting could hold is reported at the bound even
where the significand limit refuses it first"

Both edits ride the section's dissolution into `numbers.md` (§12,
question 10; unit D8), and apply as written if the section outlives it.

## Terminology

| Found                                                                                                                                                                       | Where                                                                                      | Proposed canonical                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "reach", `fits`, `exceeds` (code) vs "where the operation expects the same step to fit when computed inexactly" / "however it is computed" (docs/settings.md, the messages) | `src/core/rational.ts:66`; `docs/settings.md#(top) > Significand limit`                    | docs keep the plain phrasing: a refusal the message offers a remedy for, and one that passes the limit "however it is computed"; devdocs keep `Reach`, `fits`, `exceeds`.                                                     |
| "need", `Need` (code) vs "the bits it would need, exactly or about" (docs)                                                                                                  | `src/core/rational.ts:80-83`; `docs/settings.md#(top) > Significand limit`                 | docs: "the bits it would need", said exactly, as a bound ("about"), or not at all; devdocs keep `Need`.                                                                                                                       |
| "hard bound" (the most the significand limit can be set to, `2^20`; also the parser's limit on a literal) vs "significand limit" (the setting)                              | `devdocs/numbers.md#The significand limit`; `src/core/rational.ts:101-115`                 | section 8 settles "significand limit"; docs say "the most the significand limit can be set to" and, for a literal, "a number longer than the limit can ever be set to is rejected as it is typed"; devdocs keep "hard bound". |
| "rejected" (the parser's `Rejection` of a literal) vs "refused" (the three refusals, section 8)                                                                             | `src/core/expr.ts:169-178`; `src/messages.ts:316-328`                                      | keep both: "rejected" for text the grammar does not read, "refused" for a value the limits keep from being computed.                                                                                                          |
| "absorbed into the radius" (both corpora)                                                                                                                                   | `docs/functions.md#Very large results and approx`; `devdocs/numbers.md#Sums and alignment` | keep, as plain language for what a sum does with an operand below the working precision.                                                                                                                                      |

## Questions for the owner

1. Code comments carry history that the style guide's rule will forbid
   once installed ("an earlier version …": `src/core/ball.ts:52-53`,
   `:83-86`, `:708-709`, `:988-989`, `:995`; `src/core/scaled.ts:34-36`,
   `:591-593`; `src/core/rational.ts:27-28`;
   `src/core/builtins/pow.ts:17-20`). Strip them in the code phase?
   Proposed answer: yes, as one commit beside V8's edit to
   `devdocs/development.md#Style guide`.
2. A refusal whose need is unknown reads "would need a significand, past
   the significand limit, however it is computed" (`floor(10^30000/3)`),
   and a `fits` one with no count "would need a significand as an exact
   value, past the significand limit" (`pow(1 + 1e-19000, 1e19000)`).
   Reword in the message work of §12, question 6? Proposed answer: yes,
   to "would need a significand past the significand limit" in both.
3. `bitsNeeded` prints a count past a double's integers with its noise
   ("about 7,988,684,686,773,075,000 bits" for `2.54^1e18`,
   `src/messages.ts:372-381`). Round such a count? Proposed answer: yes,
   in the code phase, to two significant digits above `2^53`.
4. The hulls of `erf`, the incomplete Gamma and the incomplete Beta
   functions over a wide argument refuse as `exceeds` with no count when
   the argument's two ends cannot be aligned within the limit (D7's
   territory). Is `exceeds` the right word there, the argument's width
   rather than the step being what passes the limit? Proposed answer:
   leave the code; D7 states that a wide argument is refused as the
   step's reach.
5. `devdocs/numbers.md#Why the exponent bound stays at 10^18` (A5's
   context, V1's page) carries the scratch build's timings per argument
   size. Keep them under §12, question 25 as the measurements the
   decision rests on, or keep the one table and the qualitative "the
   cost grows at least as the square of the argument's length"? Proposed
   answer: keep the table, drop the per-size milliseconds.

## Notes on this run

The unit's module list was right, and `src/core/pipeline.ts`,
`src/core/builtin.ts`, `src/core/context.ts` and the refusal sites under
`src/core/builtins/` were needed beyond it to settle §1.1.6 item 14 and
the suggestion rule; the fastest check of the quoted messages and
constants was to run the three sections' examples through
`evaluateText` and `convertText` from a scratch script, which the next
units (D4, D6, D8, V1) can repeat, and the table in Findings 7 is a
verified corpus they can draw on. The plan overstated two things in N21,
the "classes of `tooLarge`" and "inexact results are never refused", and
added "sum" to N24 where the devdocs rightly say product or quotient;
the pages themselves were more accurate than the plan on this unit's
ground, with one closed-issue leftover in `docs/functions.md` and one
inverted mechanism sentence in `devdocs/numbers.md`. This run began on
`fdb1680`, before the skill landed; the skill's commit was fetched
during the run and the report follows its template, with the branch cut
from `b605b2b`.
