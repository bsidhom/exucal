# Unit A1: Values, exactness and exact arithmetic (fable)

- Plan revision: b605b2b
- Date: 2026-10-09
- Model: claude-fable-5-1
- Doc sections read: `devdocs/numbers.md#(top)`, `#The types`,
  `#Exact operations`, `#Sums and alignment`, `#Exact mode`;
  `docs/settings.md#How a number is held, and what the settings touch`
- Modules read: `src/core/rational.ts`, `src/core/scaled.ts`,
  `src/core/radius.ts`, `src/core/context.ts`, in full;
  `src/core/ball.ts:1-1240` (the header, the type, `position` and
  `orderOf`, the exact operations, `onGrid`, `settle`, `gridded`,
  `settleDecimal`, `step`, `widened` and the alignment helpers)
- Also read: the claims' other cited sections, `devdocs/numbers.md#Comparison`,
  `#Settling`, `#Certification and the display rule`, `#Decimal mode`,
  `#The significand limit`, `#approx`, and `devdocs/functions.md#Precision,
  the radius and cost`; `src/core/evaluate.ts` (`evaluate`, `withOperand`,
  the number, unit and binary nodes, `summed`), `src/core/quantity.ts`
  (`stepQuantity`), `src/core/pipeline.ts` (the header, `resolve`, the
  retry predicates), `src/core/display.ts` (`show`), `src/outcome.ts`
  (`relationOf`), `src/core/builtins/approx.ts`, `src/core/fixed.ts`
  (`bitsFor`, `GUARD_BITS`), `src/core/rounding.ts` (`digitsFor`,
  `ROUNDING_MODES`); the tests of the sum path, `src/core/ball.test.ts`,
  `src/core/evaluate.test.ts`, `src/core/builtins/approx.test.ts`,
  `src/messages.test.ts`; `audit/plan/05-concept-inventory.md` C6, C7
  and C20, `audit/plan/08-terminology.md`, `audit/plan/09-structural-observations.md`
  §9.1 and §9.4, `audit/plan/12-open-questions.md`. The constants were
  computed by importing the modules under node, and the examples quoted
  below were evaluated through `outcomeOf` against the system table built
  from `src/units.txt`, from a scratch script outside the tree, at the
  default context (eight display digits, half even, a significand limit
  of 65,536 bits, a ceiling of 4,040 digits), in both modes.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 3 |
| Claims corrected | 3 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 4 / 3 / 0 |
| Gaps confirmed / refuted / new | 0 / 0 / 0 |
| Proposed edits | 4 sections (10 old → new pairs) |
| Questions for the owner | 8 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N1 | corrected | `src/core/scaled.ts:126` (`Scaled`, a `Rational` significand and a `bigint` exponent); `src/core/rational.ts:48-49`, `128-138` (lowest terms, `rational` the one reducing constructor); `src/core/scaled.ts:1015-1044` (`normalize`: the denominator's tens, twos and fives moved out), `496-505` (`significandWithin` measures that form), `730-753` (`parseDecimal`), `165` (`MAX_EXPONENT`), `187-197` (`scaled` checks the value's decimal exponent), `25-39` (the stored `exp` may pass the bound by the significand's digits) | Two refinements, the rest confirmed. Computed: `1.5e-3` is `15 × 10^-4`; `0.1 + 0.2` is `3 × 10^-1`, structurally equal to `0.3`, and the line reads `0.1 + 0.2 = 0.3`; `1/6` is `5/3 × 10^-1`; `2.54` is `254 × 10^-2`; `2^-30000` is `5^30000 × 10^-30000`. Corrected statement: A value is an exact fraction times a power of ten. The fraction is kept in lowest terms with no factor of ten in its denominator, so a power of two in a denominator is held as a power of five in the numerator (`1/6` is `5/3 × 10^-1`; `2^-30000` is `5^30000 × 10^-30000`), and that form is what the significand limit, a setting, measures (N21); the value's decimal exponent, the one the display writes, must lie within a fixed bound of ±10^18 (N22), so a value's magnitude is cheap to hold but not unbounded. Decimal literals are read exactly (`1.5e-3` is `15 × 10^-4`; `0.1 + 0.2` is exactly `0.3`). That the fraction and the power of ten are two types, one composed of the other, is representation and stays in devdocs. |
| N2 | confirmed | `src/core/ball.ts:264-268` (`Ball`: `mid`, `rad`, optional `uncertified`), `299-306` (`exact`, `isExact`: radius zero); `src/core/radius.ts:76-82` (`Radius`, bounded or unbounded), `23-29` (every operation rounds up), `300-319` (`addRadius`, `multiplyRadius`); `src/core/display.ts:243-265` (`show`: the `exact` kind needs radius zero and the midpoint itself at the digits, or the ratio notation writing it entire), `246-248` (unbounded is a kind of its own); `src/outcome.ts:372-376` (`relationOf`: `=` only when every shown value is `exact`) | Run: `1/3 ≈ 0.33333333`, `m ≈ 3.2808399 ft`, `2^-28224 ≈ 5.3629331e-8497` (exact values with more digits than shown are `≈`, as N10 says). Two notes, no change: an unbounded radius is inexact (N10); decimal mode's `uncertified` flag rides on an exact ball and is a flag, not a radius (N10, N18). |
| N3 | corrected | Exact operations on exact operands return exact balls or refusals: `src/core/ball.ts:489-508` (`addBallsCore`), `646-649` (`multiplyBallsCore`), `829-834` (`divideBallsCore`), `914-917` (`powBallCore`), `471-473` (`negateBall`), `1014-1018` (`settle` leaves an exact ball). The root is the module's one inexact operation, `1239` (`rootBall`), `108-136`; `approx` is `1158-1163` (`widened`), `src/core/builtins/approx.ts:29-42`. Decimal mode: `src/core/ball.ts:1109-1133` (`step` runs the working contexts in exact mode), `1052-1063` (`settleDecimal`), `1066-1081` (`roundedDecimal` returns `exact(rounded)`), `1009-1012` (`onGrid` is `settleDecimal` there), `1060-1062` (the `uncertified` flag); `src/core/builtins/approx.ts:41` (`decimal: "identity"`). The two radius-charged roundings of exact mode: `src/core/ball.ts:1021-1039` (`gridded`), `509-512`, `666-669`, `840-843` (`onGrid` on an exact operand), `997-1008` (its rule) | The claim's third source does not exist: decimal mode's rounding of a step yields an exact value and no radius leaves a step. Run, decimal mode: `approx(2) - approx(2) = 0`, `sqrt(2) / sqrt(2) = 1`, `1/3 × 3 = 0.99999999`, `sin(pi() radian) = -4.6410207e-8`. Corrected statement: In either mode, a nonzero radius comes from exactly two things: an inexact built-in (a root, `exp`, `ln`, the trigonometric, hyperbolic, Gamma and Beta families, `pi()`, and the units defined through `pi()`) and `approx`, which makes a value inexact on purpose and is the identity in decimal mode. Decimal mode's rounding of a step produces an exact value and never a radius: inside a step the radii are those of the built-ins computed at the working contexts, and the step's one rounding removes them (N17, N18). Once a value is inexact, exact mode rounds its midpoint onto the working grid after every operation (settling) and, in a sum, product or quotient with it whose exact step the significand limit refuses, puts an exact operand onto the same grid, every rounding charged to the radius; neither makes a new value inexact (N4). |
| N4 | corrected | `src/core/rational.ts:180-362` (Henrici's rule, cross-cancellation, `addWithin`, `multiplyWithin`, `divideWithin`), `418-444` (`pow` by prediction); `src/core/scaled.ts:351-404` (`add`, `subtract`, `combine`), `515-531` (`multiply`), `554-571` (`divide`), `597-615` (`pow`), `314-329` (`compare`, total); `src/core/ball.ts:367-370`, `417-419` (`position`, `orderOf` compare two exact balls exactly, forming no difference), `508` (two exact operands keep the sum's refusal), `1016` (`settle` leaves an exact ball); `src/core/evaluate.ts:410-421` (`evaluate` throws if an exact result is ever formed past the limit), `1166-1186` (`summed`, the decimal-mode neighbor rule); `src/core/ball.ts:542-588` (`decimalSumApart`), `1158-1163` (`widened`) | Run: `1e999999999 × 1e999999999 = 1e+1999999998`, `1e999999999 + 3e999999998 = 1.3e+999999999`, `1/3 × 3 = 1`, `1 ft = 12 in`, `2.54 cm = 1 in`; `1e999999999 + 1` refused ("would need a significand of about 3,321,928,093 bits … Try "approx(1e999999999)" … or decimal mode"); in decimal mode `1e999999999 + 1 = 1e+999999999`, and `1.0000001e+999999999` under `ceiling`; `approx(1e999999999) + 1 ≈ 1e+999999999`; `approx(2.54) cm ≈ 1 in`. One refinement: "exact values are never rounded in exact mode" holds for an exact result of exact operands and for every value the user sees as exact, not for an exact operand in a sum, product or quotient with an inexact operand that the limit refuses, which `onGrid` rounds onto the working grid with the rounding charged to the radius. Corrected statement: `+ - * /`, integer powers and comparisons on exact operands are exact and as long as they need to be: an exact result of exact operands is never rounded in exact mode, and an exact value is never replaced by a different exact value. A sum that cannot be aligned within the significand limit is refused, not rounded (in decimal mode it takes the neighbor rule, N20). Where an exact operand meets an inexact one and the exact step would pass the limit, the exact operand is rounded onto the working grid with the rounding charged to the radius, as `approx` would do, so that the result, inexact in any case, is a value rather than a refusal. `approx` is the designed escape hatch from the strictness: it makes a value inexact on purpose, so that the arithmetic may round it (N23). |
| N5 | confirmed | `src/core/ball.ts:494` (a sum's radii add), `683-691` (`productRadius`), `852-875` (`inexactQuotient`, the divisor's distance from zero a lower bound; `magnitudeBelow`, `351-353`), `947-965` (`powBallCore`: an inexact base's integer power by squaring, settled after each product), `614-620` (`subtractBalls` is `addBalls(a, negateBall(b))`), `645` (an exact zero times anything is exact zero), `650-653`, `823-827` (unbounded absorbs); `src/core/radius.ts:161-164` (`radiusAboveScaled`), `src/core/scaled.ts:834-847` (`log2Bounds`); `src/core/evaluate.ts:500-597` (each node evaluated on its own, no identity detection); `devdocs/functions.md#Precision, the radius and cost` (a parameter used twice is two occurrences) | Run: `sqrt(2) / sqrt(2) ≈ 1`; `approx(2) - approx(2) ≈ 0 (within 3e-4049 of zero)`; `approx(0.1) + approx(0.2) - approx(0.3) ≈ 0 (within 4e-4050 of zero)`; `sqrt(2)^2 - 2 ≈ 0 (within 4e-4049 of zero)` (N7); each zero runs to the ceiling. A quotient of a ball by itself has the midpoint exactly one, the significands cancelling in `divideWithin`, and the rule's radius. One discrepancy in the page, tagged below: `#Exact operations` gives "the derivative bound" as a power's radius, where an integer power of an inexact base takes the product rule by squaring. |
| N21, the sum-and-alignment part | confirmed | `src/core/context.ts:170` (65,536), `269` (358), `251-262` (`precisionLimitFor`, 2,453 at the default), `180-195` (`GUARD_DIGITS`, `ceilingFor` is four times the sum of the limit and ten, 4,040 at the default); `src/core/rational.ts:115` (`2^20`); `src/core/scaled.ts:173` (`BOUND_BAND`, `4 × 10^8`), `496-505` (`significandWithin`: the numerator and the denominator separately), `394-398` (`combine` bounds the shifted numerator before forming), `src/core/rational.ts:218-246` (`henriciWithin` bounds the unreduced sum), `66-98` (`Reach`, `Need`, the one `tooLarge` kind), `249-251` (`refusedSum`, reach `fits`); `src/core/evaluate.ts:426-446` (`withOperand` names the first operand); `src/core/ball.ts:509-527` (the settle-first sum absorbs the smaller operand), `666-679`, `840-848` (a product or a quotient retries on the grid); `src/core/pipeline.ts:87-91`, `338-360`, `365-404` (`resolve` retries the `unresolved` family only); `src/core/scaled.ts:448-459` (`canonicalBits`, an upper bound within a bit); `src/core/ball.test.ts:164-169`, `src/core/evaluate.test.ts:720-729`, `src/messages.test.ts:156-157` (the need of `1e999999999 + 1`) | Confirmed for sums and their alignment; the rest of N21 is A5's. `1e999999999 + 1` needs `1 + bitsOfTens(999,999,999)` = 3,321,928,093 bits, which the message quotes. Run: `sqrt(2) + 1e999999999 ≈ 1e+999999999`; `1 + 1 / 3^41300 + sqrt(2) ≈ 2.4142136`, and at forty digits `≈ 2.414213562373095048801688724209698078570`. The dyadic cost: `5^30000` has 69,658 bits (computed), the storage cost the page quotes; the refusal predicts "about 69,659 bits", within a bit; `2^-28224` is a value and `2^-28225` is refused with about 65,538 bits; `3^-100000` with 158,497. The refusal is one kind, `tooLarge`, always carrying a reach (fits or exceeds) and a need (exact, bound or unknown); `resolve` never retries it, and one raised at a later pass ends the loop with the best result so far. |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/numbers.md#The types > Scaled` (§1.1.5) | "A first design carried a binary exponent beside the decimal one, so that a kernel result and a literal both entered exactly and settling stayed a shift; the mixed base leaked into every operation … The price of the one base is a division per settle in place of a shift: the division alone measured, when the base was chosen, at 0.2 ms against 0.04 ms at the default ceiling and nothing below it ("Formatting" below gives what a whole settle costs)." | keep as intent (confirmed; the code has one decimal exponent, `src/core/scaled.ts:126`, `25-58`, and the settle is a division, `638-656`) | Two exponents, a binary one beside the decimal one so that a kernel result and a literal both enter exactly and settling stays a shift, are ruled out: the mixed base leaks into every operation that brings the two together (a sum of two large exponents of different bases needs a rebase in log space, a comparison has an undecidable case, certification and the radius need the `log2 10` constant, and the display has to fold the binary power into the significand before it can write a digit), which is why no arithmetic library keeps two exponents on a value. A single binary exponent is ruled out too: a literal's power of ten could not enter it exactly, and decimal mode could not hold its own values at large exponents. The price of the one base is a division per settle in place of a shift, small against what a whole settle costs ("Formatting" below). |
| `devdocs/numbers.md#Settling` (§1.1.5) | "(The first design let inexact midpoints grow as exact rationals, and a thirteen-thousand-bit dyadic to the fifth power was then a size the significand limit refused.)" | keep as intent (confirmed; the reason is in the `src/core/ball.ts:16-23` header) | An inexact midpoint left to grow as an exact rational reaches the significand limit within a few operations: a dyadic of some thirteen thousand bits raised to the fifth power is already a size the limit refuses. |
| `devdocs/numbers.md#Settling` (§1.1.5) | "Its primitive, `settle`, is not exported: an earlier shape, a settle any inexact ball could reach beside a retry only two call sites used, was a contract that lived in documentation." | keep as intent (confirmed; `settle` is module-private, `src/core/ball.ts:1014`) | Its primitive, `settle`, is not exported: a settle that any inexact ball could reach from outside would be a contract that lives in documentation, where `step` makes it one that lives in the code. |
| `devdocs/numbers.md#Exact mode` (found) | "Exactly three things ever produce a nonzero radius: an inexact function (a root, a kernel routine, `pi()`), the built-in `approx`, which makes a value inexact at the user's request, and decimal mode's rounding." | update (the third describes the earlier decimal mode that tracked its roundings in the radius, the `#Decimal mode` row of §1.1.5; `settleDecimal` returns an exact value, `src/core/ball.ts:1052-1081`) | Exactly two things ever produce a nonzero radius: an inexact function (a root, a kernel routine, `pi()`) and the built-in `approx`, which makes a value inexact at the user's request; decimal mode's rounding of a step produces an exact value ("Decimal mode" below). |
| `devdocs/numbers.md#Exact operations` (found) | "a power's the derivative bound" | update (`powBallCore` raises an inexact base by squaring with the product rule, settled after each product, `src/core/ball.ts:947-965`; the derivative bound is the kernel's, for the roots and the log-space powers) | and an integer power of an inexact base takes the product rule by squaring, settled after each product ("Settling" below) |
| `devdocs/numbers.md#Exact operations` (found) | "A ball within an ulp of zero at the kernel's bits is treated as containing zero, since the kernel cannot tell it apart;" | update (`containsZero` compares exactly where the radius can be formed, `FORMABLE_RADIUS_BITS`, and by the coarse bounds otherwise, `src/core/ball.ts:296`, `334-339`, `446-456`; `#Comparison` states the current rule) | Whether a ball contains zero is decided exactly where the radius can be formed and by the coarse bounds otherwise, a midpoint the bounds cannot tell from the radius counting as within it ("Comparison" below); |
| `devdocs/numbers.md#Sums and alignment` (found) | "Products and quotients add and subtract exponents and return a `Result` for the exponent bound; sums take the context, for its precision, its mode and its significand limit." | update (`multiplyBalls` and `divideBalls` take the context, for the limit their prediction needs and for `onGrid`, `src/core/ball.ts:631-680`, `808-849`; on `Scaled` all four take the limit, `src/core/scaled.ts:351-571`) | On `Scaled`, a sum, a product and a quotient each take the significand limit and return a `Result` for it and for the exponent bound; on balls each takes the context, a sum for its precision, its mode and its limit, a product and a quotient for the limit their prediction needs and for the grid an operand is put on ("The significand limit" below). |

## Findings

The model of N1–N5 holds against the code in every example and in all
but one general statement; the corrections are to how the claims are
worded, not to what the app does.

- **The type tower is as `#The types` says.** `Rational` is lowest terms
  over `bigint` with one reducing constructor; `Scaled` is a `Rational`
  times `10^exp` in a canonical form whose denominator holds no factor
  of ten (`normalize`), so `equals` is structural and the significand
  limit measures what is stored; `Radius` is a 30-bit binary magnitude
  or unbounded, every operation rounding up; `Ball` is a midpoint, a
  radius and decimal mode's flag. The seven rounding modes are the seven
  of `ROUNDING_MODES`, and the working grid of a pass has
  `digitsFor(bitsFor(precision))` digits (`src/core/context.ts:144-146`,
  `src/core/fixed.ts:113-118`, `src/core/rounding.ts:60-65`), eighteen
  at eight display digits.
- **The exponent bound is on the value, not on the stored exponent.**
  `scaled` refuses a value whose decimal exponent passes `±10^18`, and
  the canonical `exp` may lie past the bound by the significand's digits
  (`src/core/scaled.ts:25-39`, `187-197`). N22 has this right; N1 did
  not, and is corrected.
- **Two sources of inexactness, in either mode.** Every exact operation
  on exact operands returns an exact ball or a refusal; the root, the
  kernel routines and `widened` are the only producers of a nonzero
  radius. Decimal mode's `settleDecimal` returns `exact(rounded)`, so
  the "third source" of N3 and of `#Exact mode` is the earlier design.
  The two roundings exact mode applies once a value is inexact, settling
  and `onGrid`, are charged to the radius of a result that is inexact
  already (`src/core/ball.ts:1021-1039`, `1009-1012`).
- **`onGrid` is the one place an exact value is rounded in exact mode,**
  and only as an operand of a sum, product or quotient with an inexact
  operand whose exact step the significand limit refuses
  (`src/core/ball.ts:509-512`, `666-669`, `840-843`); an operand already
  on the grid stays exact (`gridded` returns it unchanged, `1025`). The
  result is inexact in any case. N4 is scoped accordingly, and
  `docs/settings.md#How a number is held…` ("nothing else touches an
  exact value … it is never rounded") needs the same scoping.
- **Sums and alignment are as `#Sums and alignment` says,** bullet by
  bullet: `combine` bounds the shifted numerator before forming anything
  and `henriciWithin` the unreduced sum; two exact operands keep the
  refusal; the settle-first path puts both operands on the grid, adds
  them exactly if they then align, and otherwise absorbs the smaller into
  the larger's radius (`src/core/ball.ts:489-527`); the neighbor rule is
  decimal mode's (`decimalSumApart`, applied by the evaluator's
  `summed`); a sum that aligns and passes the exponent bound is held to
  it by the whole ball (`held`, `heldSum`). The need quoted for
  `1e999999999 + 1` is exact to the bit.
- **Independence holds because nothing detects an identity.** The
  evaluator evaluates each node on its own and the radius rules add; a
  ball minus itself is a ball of twice its radius around zero, and a
  ball over itself is one with the quotient rule's radius.
- **The constants of §1.1.6, item 4 that fall in these modules are
  right:** 65,536; `2^20`; 358; 2,453; `10^18`; `BOUND_BAND` = `4 ×
  10^8`; the guard ten and the factor four of `ceilingFor`. The schedule
  itself is A3's.
- **The dyadic cost is as stated,** with the page's two figures naming
  two things: `5^30000` has 69,658 bits, and the prediction that refuses
  `2^-30000` says about 69,659, `canonicalBits` being an upper bound
  within a bit.
- **`tooLarge` is one kind in these modules,** always with a reach and a
  need; the evaluator adds a span and, on `fits`, the first operand's
  span; the retry loop never retries it. Handed to A5 (item 14).

The examples run, as the app shows them, at eight digits (exact mode
unless marked):

| Expression | Line |
| --- | --- |
| `1.5e-3` | `1.5e-3 = 0.0015` |
| `0.1 + 0.2` | `0.1 + 0.2 = 0.3` |
| `1/3` | `1/3 ≈ 0.33333333` |
| `1/3*3` | `1/3 × 3 = 1` |
| `sqrt(2)/sqrt(2)` | `sqrt(2) / sqrt(2) ≈ 1` |
| `approx(2) - approx(2)` | `approx(2) - approx(2) ≈ 0 (within 3e-4049 of zero)` |
| `sqrt(2)^2 - 2` | `sqrt(2)^2 - 2 ≈ 0 (within 4e-4049 of zero)` |
| `1e999999999 * 1e999999999` | `1e999999999 × 1e999999999 = 1e+1999999998` |
| `1e999999999 + 1` | refused: "would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked." |
| `approx(1e999999999) + 1` | `approx(1e999999999) + 1 ≈ 1e+999999999` |
| `sqrt(2) + 1e999999999` | `sqrt(2) + 1e999999999 ≈ 1e+999999999` |
| `(1 + 1/3^41300) + sqrt(2)` | `1 + 1 / 3^41300 + sqrt(2) ≈ 2.4142136` |
| `2^-28224` | `2^-28224 ≈ 5.3629331e-8497` |
| `2^-28225` | refused, "about 65,538 bits" |
| `2^-30000` | refused, "about 69,659 bits" |
| `3^-100000` | refused, "about 158,497 bits" |
| `1 ft` into `in` | `1 ft = 12 in` |
| `m` into `ft` | `m ≈ 3.2808399 ft` |
| `approx(2.54) cm` into `in` | `approx(2.54) cm ≈ 1 in` |
| `2.54 cm` into `in` | `2.54 cm = 1 in` |
| `1/3*3` (decimal mode) | `1/3 × 3 = 0.99999999` |
| `approx(2) - approx(2)` (decimal mode) | `approx(2) - approx(2) = 0` |
| `sqrt(2)/sqrt(2)` (decimal mode) | `sqrt(2) / sqrt(2) = 1` |
| `1e999999999 + 1` (decimal mode) | `1e999999999 + 1 = 1e+999999999`; under `ceiling`, `= 1.0000001e+999999999` |
| `sin(pi() radian)` (decimal mode) | `sin(pi() radian) = -4.6410207e-8` |

## Proposed edits

### `devdocs/numbers.md#Exact operations`

Three old → new pairs, in the section's order.

Old: "a product's radius is `|a| rb + |b| ra + ra rb`, a quotient's
`(|a| rb + |b| ra) / (|b| (|b| - rb))`, a power's the derivative bound."

New: "a product's radius is `|a| rb + |b| ra + ra rb`, a quotient's
`(|a| rb + |b| ra) / (|b| (|b| - rb))`, and an integer power of an
inexact base takes the product rule by squaring, settled after each
product ("Settling" below)."

Old: "A ball within an ulp of zero at the kernel's bits is treated as
containing zero, since the kernel cannot tell it apart; a ball of
unbounded radius divides when its midpoint is nonzero, giving an
unbounded quotient, and is `unresolved` when its midpoint is zero."

New: "Whether a ball contains zero is decided exactly where the radius
can be formed and by the coarse bounds otherwise, a midpoint the bounds
cannot tell from the radius counting as within it ("Comparison" below);
a ball of unbounded radius divides when its midpoint is nonzero, giving
an unbounded quotient, and is `unresolved` when its midpoint is zero."

Old: "Where a quotient's reduction should run is [#78][78]." (with the
definition `[78]: …` at the page's foot)

New: "Where a quotient's reduction should run is open
([#78](https://github.com/bsidhom/exucal/issues/78))." The definition
at the foot goes once no passage uses it. Per §12, question 26, the link
stays only if this passage is the one place that owns the concept; V1
checks the page's other mentions of the quotient's reduction.

### `devdocs/numbers.md#Sums and alignment`

Old: "Products and quotients add and subtract exponents and return a
`Result` for the exponent bound; sums take the context, for its
precision, its mode and its significand limit."

New: "On `Scaled`, a sum, a product and a quotient each take the
significand limit and return a `Result` for it and for the exponent
bound; on balls each takes the context, a sum for its precision, its
mode and its limit, a product and a quotient for the limit their
prediction needs and for the grid an operand is put on ("The
significand limit" below)."

### `devdocs/numbers.md#Exact mode`

Old: "Exactly three things ever produce a nonzero radius: an inexact
function (a root, a kernel routine, `pi()`), the built-in `approx`,
which makes a value inexact at the user's request, and decimal mode's
rounding."

New: "Exactly two things ever produce a nonzero radius: an inexact
function (a root, a kernel routine, `pi()`) and the built-in `approx`,
which makes a value inexact at the user's request; decimal mode's
rounding of a step produces an exact value ("Decimal mode" below)."

### `docs/settings.md#How a number is held, and what the settings touch`

The section is to be dissolved into `docs/numbers.md` (D8; §6.1, §9.1).
Until then, five old → new pairs keep it true.

Old: "A value is a fraction times a power of ten: `2.54` is `254/100`,
kept as `127/50`, and `1e999999999` is `1` times `10^999999999`."

New: "A value is a fraction times a power of ten: `2.54` is `254` times
`10^-2`, `1/6` is `5/3` times `10^-1`, since the fraction is kept with
no factor of ten in its denominator, and `1e999999999` is `1` times
`10^999999999`."

Old: "In decimal mode no value is inexact: every step is rounded and the
rounded value is the value, and the radius serves only inside a
function, to certify its rounding."

New: "In decimal mode no value is inexact: every step is rounded and the
rounded value is the value, and the radius serves only inside a step,
to certify the rounding of a function's value or of a unit defined
through `pi()`."

Old: "The significand limit bounds each of them, and nothing else
touches an exact value in exact mode: it is never rounded, and no digits
setting applies to it."

New: "The significand limit bounds each of them, and nothing else
touches an exact result of exact values in exact mode: it is never
rounded, and no digits setting applies to it. Where an exact value meets
an inexact one in a sum, a product or a quotient whose exact result
would pass the limit, the exact value is rounded onto the grid of the
inexact one with the rounding counted in the error radius, as `approx`
would round it: the result is inexact in any case, and the rounding
makes it a value rather than a refusal."

Old: "The precision limit is how far it may raise them, four times the
limit plus ten, which is also the most digits an answer may be asked
for."

New: "The precision limit is the most digits an answer may be asked for,
and the app may raise the grid to four times the sum of the limit and
ten."

Old: "**Why four times the limit plus ten.** The schedule of passes, and
why its factor is four and its guard ten, are explained in
`devdocs/numbers.md` ("Working precision and the schedule")."

New: "**Why four times the sum of the limit and ten.** The schedule of
passes, and why its factor is four and its guard ten, are explained in
[Working precision and the schedule](../devdocs/numbers.md#working-precision-and-the-schedule)."

## Terminology

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "neighbor rule" (the page, the code) vs "neighbour rule" (the plan, N20) | `devdocs/numbers.md#Sums and alignment`; `audit/plan/01-core-abstractions.md` | **neighbor rule**, the pages' American spelling |
| "canonical form" / "canonical significand" (devdocs, `scaled.ts`) with no docs term | `devdocs/numbers.md#The types > Scaled`, `#The significand limit` | devdocs-only; docs say "the fraction is kept with no factor of ten in its denominator" |
| "put on the grid" / "the working grid" (the code's `onGrid`, `gridded`) vs "rounded to the working digits" (devdocs, for the grid of a pass) | `devdocs/numbers.md#Sums and alignment`, `#Settling` | **the working grid** for the grid of a pass's working precision, since section 8 reserves "working digits" for the decimal-mode setting; "grid" in docs as section 8 has it |
| "absorbed into the radius" | `devdocs/numbers.md#Sums and alignment`; `src/core/ball.ts` | devdocs-only, as "settle" is |

## Questions for the owner

1. `devdocs/numbers.md#The significand limit` calls the rejected rounding
   "a fourth source of inexactness"; with N3 corrected it is a third.
   Proposed: V1 recounts when it rewrites the page.
2. "Four times the limit plus ten" (N8; `docs/settings.md#(top) >
   Precision limit`; `#How a number is held…`) reads as `4L + 10` where
   `ceilingFor` is `4 × (L + 10)` (`src/core/context.ts:188-190`).
   Proposed: "four times the sum of the limit and ten" everywhere; A3
   and D4 own the two places outside this unit.
3. For A5 (§1.1.6, item 14): in these modules `tooLarge` is one kind
   carrying a reach and a need (`src/core/rational.ts:66-98`), and
   `resolve` never retries it (`src/core/pipeline.ts:87-91`, `338-360`);
   one raised at a later pass ends the loop with the best result so far.
   Proposed: A5 settles the row against `classifyPower`'s `unaffordable`
   (`src/core/ball.ts:734-740`) and the pipeline's predicates.
4. For A5 (§1.1.6, item 8): `widened` takes the larger of the ball's own
   radius and one unit in the last digit of the working grid, never
   narrows, is idempotent, and returns a zero midpoint or an unbounded
   ball as it is (`src/core/ball.ts:1158-1163`). Proposed: A5 records
   it as confirmed.
5. Timings in this unit's sections ("19 ms against 686 ms" in `#Exact
   operations`; "0.2 ms against 0.04 ms" and "took a minute" in `#The
   types > Scaled`), under §12, question 25. Proposed: V1 drops them and
   keeps the qualitative reasons, "about forty times cheaper" and "a
   quadratic loop"; the Scaled rewrite above already does.
6. `devdocs/numbers.md#(top)` names GNU units' decimal `pi` as the
   contrast to `pi()`; question 2 bars GNU units from the numeric
   semantics of docs/, and devdocs are not covered. Proposed: V1 keeps
   the rationale without the name ("where a decimal literal for `pi` is
   exact to its digits and wrong past them").
7. `docs/settings.md` names devdocs pages in backticks in six places, one
   in this unit's section. Proposed: D4 and D8 make them repo-relative
   links, as the last proposed edit above does for the one here.
8. Should `docs/numbers.md` state the rounding of an exact value in a
   sum, product or quotient with an inexact one (the `onGrid` case), or
   leave it to devdocs? Proposed: one sentence in docs, as in the third
   `docs/settings.md` edit above, since it says what the error radius of
   such a result covers; the mechanism stays in devdocs.

## Notes on this run

The plan's scope for A1 was right: the five sections and the five
modules carry the claims, and `ball.ts` through the alignment helpers
was enough of it. Verifying N2 and N3 needed four modules the entry does
not list, `display.ts` and `outcome.ts` for what `=` means and
`evaluate.ts` and `quantity.ts` for how a node reaches `step`, and the
end-to-end runs needed `pipeline.ts`; a later revision of the entry
could name them. The one substantive correction, N3, turns on
`settleDecimal` returning an exact value, which also decides how A4
should read `#Decimal mode`; A4 should start from `step` and
`settleDecimal` (`src/core/ball.ts:1052-1133`). The `#Exact operations`
section carries two sentences the code has outgrown beyond the plan's
rows, so V1 should read that section against `ball.ts` line by line
rather than trusting the plan's tags alone. This run began before the
`audit-unit` skill was on the branch; a first draft that edited the plan
in place was discarded unpushed, and this report is the unit's whole
product.
