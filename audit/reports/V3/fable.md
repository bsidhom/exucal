# Unit V3: `devdocs/builtins.md` (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session's configured model; the serving model may differ)
- Doc sections read: `devdocs/builtins.md` in full: `#(top)`, `#Names`, `#Arity`, `#The rules every built-in follows`, `#Huge and tiny arguments`, `#Dimension rules`, `#Domains, exact cases and edges`, `#The elementary routines`, `#The exact functions`, `#The Gamma and Beta families`, `#Not in this design`
- Modules read: `src/core/builtin.ts`, `src/core/builtins.ts`; `src/core/builtins/pi.ts`, `exp.ts`, `log.ts`, `roots.ts`, `pow.ts`, `trig.ts`, `inverse-trig.ts`, `hyperbolic.ts`, `approx.ts`, `abs.ts`, `round.ts`, `division.ts`, `integers.ts`, `gamma.ts`, `beta.ts`, `incomplete.ts`, `erf.ts`, `incbeta.ts`, `exact.test.ts`; `src/core/fixed-exp.ts`, `fixed-log.ts`, `fixed-trig.ts`, `fixed-gamma.ts`, `fixed-incomplete.ts`, `fixed-incbeta.ts` by header only
- Also read: targeted parts of `src/core/table.ts` (`resolveFunction`, `UnitTable.builtins`), `src/core/build.ts` (the header, `buildTable`'s signature, the named-definition check), `src/messages.ts` (`functionAsUnit`, `describeBuiltinArgument`, the domain reasons, `describeEdge`, `callForm`, the Gamma-family remedies), `src/core/evaluate.ts` (`Arity`, the call node, `applyBuiltin`), `src/core/ball.ts` (the doc comments of `Edge`, `position`, `lnScaled`), `src/core/rational.ts` (`gcd`, `lehmer`), `src/core/scaled.ts` (`trailingZeros`), `src/core/constants.ts` (`eSeries`, `MEMO_MARGIN`), `src/limits.ts` (`COMPOSITE`), `src/core/pipeline.ts` (the signatures of `schedule`, `resolve`, `evaluateText`), `src/core/fixed-gamma.ts` (`TERM_FLOOR`), `src/core/fixed-incomplete.ts` (`CHECK_EVERY`), `bench/kernel.bench.ts` (imports only), `package.json` (scripts), `src/units.txt` (the lines for `e`, `W`, `radian`, `deg`, `grad`, `turn`, `oersted`, `parsec`, `tempC`, `tempF`, `neper`, `bel`, `decibel`). The state of the thirteen issues the page links (#63, #65, #98, #100, #103, #107, #112, #115, #125, #149, #150, #151, #152): all open. Run: the built-in modules' own tests (`node --test "src/core/builtins/*.test.ts"`, 126 passing) and a scratch script outside the tree that put about 170 of the page's examples through `evaluateText` and `show` at eight digits, counting passes.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 6 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 16 / 2 / 1 |
| Gaps confirmed / refuted / new | 0 / 0 / 0 |
| Proposed edits | 12 |
| Questions for the owner | 7 |

## Claims

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| N6 | confirmed | `src/core/builtins/log.ts:116-135` (`integerPower` read either way, `log(b, 1)` zero), `src/core/builtins/roots.ts:1-7` (`rootBall`'s exact cases, `sqrt(9/4)`), `src/core/builtins/exp.ts:66-68` (`exp(0)`), `src/core/builtins/trig.ts:68,82,96` (zero and one), `src/core/builtins/gamma.ts:305-307,326-333` (`lgamma(1)`, `lgamma(2)`, `factorialOf` for `gamma(5)`), `src/core/builtins/erf.ts:91,123`, `src/core/builtins/beta.ts:170-187` (`exactIntegers`), `src/core/builtins/incbeta.ts:434-485` (`exactPolynomial`); scratch: `beta(2, 3)` an exact ball shown `0.083333333`, `incbetareg(2, 3, 0.5)` exact `0.6875`, `gamma(5)` exact `24`, `ln(8)/ln(2)` certified `3` and not exact | The exact cases are decided before any kernel call in every module. `beta`'s integer case also catches `beta(1e15, 1)`, which the page cites as a logarithm example (stale passages, row 9). |
| N15 | confirmed | `src/core/builtin.ts:138-150` (`unresolved` names the argument and the edge), `src/core/ball.ts:355-361` (`position`: touching counts as straddling), `src/core/builtins/trig.ts:101-103` (the edge `pole`), `src/core/builtins/gamma.ts:148-152,390-403` (a pole decided by `floorBall`), `src/core/builtins/round.ts:181-196` (the open cell; an exact argument is decided), `src/core/builtins/inverse-trig.ts:354-370` (`1` and `-1`), `src/core/builtins/exp.ts:81-82` (the bound), `src/messages.ts:92-95,413-419` (the wording), `src/core/pipeline.ts:434-447` (`isUnresolved` is the retry predicate); scratch: `tan(90 deg)` and `asin(approx(1))` refused after nine passes with the quoted wording, `floor(3.7)` and `round(2.5 + 1e-30)` decided on the first pass | The full message is "cannot be told from <edge> at this precision, and the result depends on which side of <edge> it lies"; a rounding boundary is written to twelve digits (`src/messages.ts:418`). |
| N21 | confirmed | `src/core/builtins/integers.ts:69-116,118-138,151-175` (Stirling's prediction within a bit, refused as `tooLarge("exceeds", boundOf(…))` before computing), `src/core/builtins/trig.ts:118-123` (`sin` of a huge angle, reach `exceeds`), `src/core/builtin.ts:477-491` (`tooLarge(inexact, need)`, `UNKNOWN_NEED`), `src/core/builtins/exact.test.ts:97-100`; scratch: `factorial(20000)` "would need a significand of about 256,909 bits, past the significand limit, however it is computed", `uppergammareg(1e6, 1.5e6)` "would need a significand, past the significand limit, however it is computed", `beta(1e20000, 2)` "would need a significand of 65,662 bits" | Confirmed for the part the unit holds, the factorial prediction and the refusals that suggest nothing. From the built-ins alone three shapes of `Need` are visible, a bound ("about N bits"), an exact count ("N bits") and unknown (no count), each worded differently; which classes of `tooLarge` the retry loop retries is A5's. |
| N22 | confirmed | `src/core/builtins/exp.ts:76-85` (`classifyExp` on the whole ball: `overflow`, `underflow`, `unresolved` at `bound`), `src/core/builtins/hyperbolic.ts:346-364` (`classifyHyperbolic`, the top edge only), `src/core/builtins/gamma.ts:344-353`, `src/core/builtins/beta.ts:147-156`, `src/core/builtins/pow.ts:142-185` (`powerRefusal`, `classifyPower`), `src/core/builtins/incomplete.ts:459-485` and `src/core/builtins/incbeta.ts:391-394` (through `expBall`); scratch: `exp(1e30)` "is too large to compute: its exponent would pass 10^18", `exp(-1e30)` "is too small to compute: its exponent would fall below -10^18", `exp(1e6)` `≈ 3.0332154e+434294`, `exp(1e18)` a value, `erfc(1.6e9)` refused and `erfc(1.5e9)` a value, `gamma(5e16)` a value and `gamma(7e16)` refused | Confirmed for the built-ins. The threshold pair `exp(2.3e18)` and `exp(2.31e18)` was not run (A5's). |
| Q5 | confirmed | `src/core/builtins/round.ts:320-353` (`plainNumbers`; both of `round`'s arguments dimensionless), `src/core/builtins/integers.ts:177-201` (`plainNumbers`), `src/core/builtins/abs.ts:46-58` (`sameAsArgument`, `anyToNumber`), `src/core/builtins/division.ts:154-166` (`conformingArguments`: `div` a number, `mod` the arguments' dimension), `src/core/builtins/approx.ts:36-42` (`sameAsArgument`); the rationale `devdocs/builtins.md:299-308`; scratch: `floor(3.7 ft)` "has dimension m, but the argument of "floor" must be a plain number", `div(7 ft, 2 ft)` exact `3`, `mod(-30 deg, 360 deg) / deg` `330` | None. |
| Q8 | confirmed | `src/core/builtins/trig.ts:138-157` (`angleToNumber`), `src/core/builtins/inverse-trig.ts:495-521` (`numberToAngle`, `conformingToAngle`), `src/core/builtin.ts:211-259` (the rules, `checkConformance` on the full vectors, so kinds are included), `src/core/builtins/hyperbolic.ts:431-471` (`plainNumbers`), `src/messages.ts:176-181` (the wording); scratch: `sin(1)` "is a plain number, but "sin" takes an angle; write "sin(1 radian)"", `sin(0)` the same, `sin(pi())` the same with `sin(pi() radian)`, `sin(30 deg)` `≈ 0.5`, `asin(0.5) / radian` a number, `asin(sin(0.5 radian))` `≈ 0.5` with the radian kind, `2 asin(0.5) + 1` "differ in kind: radian", `atan2(3 m, 4 m)` a value and `atan2(3 m, 4 s)` a dimension mismatch | `asin(0.5)` into `deg` was not run (conversion is A8's); the result's kind is the radian's, which is what the conversion needs. |

## Stale passages

The plan's rows for this page first (§1.1.5 three rows, §9.4 one row), then the passages found. A rewrite longer than a sentence is given in full under Proposed edits and summarized here.

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/builtins.md#The elementary routines` | "Timing it once found that the exact arithmetic on settled midpoints ran Euclid's gcd on dyadics of the ceiling's size, tens of milliseconds a sum, which is why the gcd strips the common power of two first." | keep as intent (confirmed; `src/core/rational.ts:507-521` strips the common power of two and runs Lehmer's algorithm on the odd parts) | "The exact arithmetic on settled midpoints runs its gcd on dyadics of the ceiling's size, which is why the gcd strips the common power of two first and runs Lehmer's algorithm on the odd parts: Euclid's steps on such operands would dominate every sum." |
| `devdocs/builtins.md#The Gamma and Beta families` | "(growing the memo term by term had a cold ceiling pass recompute the run five times over)" | keep as intent (confirmed; `src/core/fixed-gamma.ts:21-24`) | "A series predicts its count of terms from its first term and a bound on the ratio of consecutive terms before it sums, and reserves that many, so that a pass needing more than the last computes one run for what it will take; a memo grown term by term would recompute the run several times within one cold pass." |
| `devdocs/builtins.md#Huge and tiny arguments` | "(`acos(1e-9860)` was refused at the default limit)" | drop (confirmed: scratch, `acos(1e-9860)` certifies on the first pass) | delete |
| `devdocs/builtins.md#The Gamma and Beta families` (last paragraph) | "Ruled out as built-ins: the general hypergeometric functions (…), the polygamma functions beyond `digamma`, `gamma` of a complex argument, and the statistical distributions" | update (§9.4, the owner's clarification) | "Not in the initial design, deferred rather than ruled out: …", the reasons kept; full text under Proposed edits. |
| `devdocs/builtins.md#Names` | "and no built-in is a prefix of another's name either" | update (false as written: `log` begins `log10` and `log2`, `atan` begins `atan2`, `sin` begins `sinh`, `erf` begins `erfc`, `incbeta` begins `incbetareg`; `src/core/builtins.ts:58-105`. The build checks a built-in's name against a prefix followed by a unit, `src/core/build.ts:309-327`, and nothing else.) | "Prefixes apply to units alone: a call's name is looked up exactly, so `kpi()` and `mexp(1)` are calls of nothing, and that `log` begins `log10` or `atan` begins `atan2` is no ambiguity, since nothing reads a call's name in parts." |
| `devdocs/builtins.md#Huge and tiny arguments` (second bullet) | "a tiny ratio formed inside `asin`, `acos` or `atan2` converts to zero within an ulp and gives a ball around zero that certifies nothing, the one case the expansion does not reach, since those combine the kernel's arctangent with `pi` before the ball is formed" | update (`atan2` answers a tiny ratio over a positive `x` by the expansion, `src/core/builtins/inverse-trig.ts:294-297`, and its other branches never form a ratio below `2^-bits`, `:267-290`; `asin` and `acos` take theirs on the square first, `:178,201-211`; scratch: `atan2(1e-999999999999999999, 1)` is its argument on the first pass) | "the inverses do not reach it: `atan2` answers a tiny ratio over a positive `x` by the expansion as `atan` does, and never forms a ratio below `2^-bits` on its other routes, while `asin` and `acos` take their expansion on the argument's square before any ratio is formed." |
| `devdocs/builtins.md#The exact functions` (opening) | "They are the functions whose result keeps its argument's dimension (`abs`, `mod`), or takes any quantity (`sign`, `div`)." | update (nine of the thirteen take plain numbers; the sentence reads as if all thirteen take quantities) | "Four of them take quantities: `abs` and `mod`, whose result keeps the argument's dimension, and `sign` and `div`, whose result is a plain number; the other nine take plain numbers, as the dimension rules say." |
| `devdocs/builtins.md#The exact functions` (`round`) | "two of the modes' names, `floor` and `ceiling`, are functions" | update (`ceil` is the function; no built-in is named `ceiling`, `src/core/builtins.ts:83-86`) | "one of the modes' names, `floor`, is already a function" |
| `devdocs/builtins.md#The Gamma and Beta families` (`beta`) | "(`beta(1e15, 1)` is `1e-15` from logarithms near `2^55`)" | update (`beta(1e15, 1)` is the integer exact case, `src/core/builtins/beta.ts:96-97,170-187`; scratch: an exact ball; `beta(1e15, approx(1))` is the logarithm route, an inexact ball shown `1e-15`) | "(`beta(1e15, approx(1))` is `≈ 1e-15` from logarithms near `2^55`; `beta(1e15, 1)` itself is the exact case)" |
| `devdocs/builtins.md#The elementary routines` (opening) | "Every routine costs 9 to 13 ms at the default ceiling of 4,040 digits (`bench/kernel.bench.ts` reports each), V8 multiplying integers of that size by the schoolbook rule, about sixty microseconds a product." | update (§12, question 25: timings leave the pages) | "The routines cost about the same as one another at the default ceiling, where V8 multiplies integers of that size by the schoolbook rule, so a routine's cost is counted in full multiplications and the series below are arranged to need few of them; `bench/kernel.bench.ts` measures each." |
| `devdocs/builtins.md#The Gamma and Beta families` (Bernoulli numbers) | "the run at the ceiling, half a second once for an exact shift and about two for an inexact argument's, is paid by the first evaluation whose retry loop reaches the ceiling" | update (question 25) | "the run at the ceiling, the one noticeable pause the family has, is paid once, by the first evaluation whose retry loop reaches the ceiling, and an inexact argument's longer shift asks for a longer run than an exact one's ([cost.md](cost.md) has the measurements)" |
| `devdocs/builtins.md#The Gamma and Beta families` (`lgamma` and `gamma`) | "Costs at the default ceiling: `gamma` or `lgamma` about 0.12 s and `digamma` 0.14 s a call for an exact argument of short denominator, and 0.45 s and 1.2 s for an inexact one, the loop's shift being most of those; at a thousand digits a call is tens of milliseconds and at forty the series is microseconds." | update (question 25; §9.1 counts three sets of these numbers across the corpora) | "At the ceiling the loop's shift is most of a call's cost for an inexact argument, and an exact argument of short denominator, shifted by binary splitting, costs a fraction of that; well below the ceiling the series dominates and a call is cheap. The measurements are in [cost.md](cost.md) and the stress tools." |
| `devdocs/builtins.md#The Gamma and Beta families` (the incomplete gamma functions) | "Measured for the regularized upper form: one to two milliseconds a call at forty digits, forty to eighty at a thousand, and about a second at the default ceiling, two for `x = 1000`;" | update (question 25) | "The cost grows with the convergents or terms the route takes, so a large `x` under the fraction is the costly case at the ceiling ([cost.md](cost.md));" |
| `devdocs/builtins.md#The Gamma and Beta families` (`erf` and `erfc`) | "A call is one to three milliseconds at forty digits." | update (question 25) | delete |
| `devdocs/builtins.md#The Gamma and Beta families` (the incomplete beta function) | "Measured at forty digits: a few milliseconds a call for moderate parameters, fifty for `(1e4, 1e4, 0.5)`; the series' cost at the ceiling is [#150][150]." | update (question 25) | "Large parameters near the median are the costly case, since both orientations then take many terms; the series' cost at the ceiling is [#150](https://github.com/bsidhom/exucal/issues/150)." |
| `devdocs/builtins.md#The Gamma and Beta families` (the incomplete beta function, exact cases) | the paragraph from "one integer over `q^(a + b" to "coming from`beta`" (`devdocs/builtins.md:866-872`), where a line break before "- 1)" makes Markdown read a list item and several code spans lack the space around them | update (a formatting break, not a design change) | the paragraph re-flowed; full text under Proposed edits. |
| `devdocs/builtins.md#Not in this design` | "Complex values and arguments: `ln(-1)`, `sqrt(-1)` and `gamma` off the real line are domain errors ([future.md](future.md))." | update (`sqrt(-1)` is the `negativeRadicand` error, `src/core/builtins/roots.ts:6-8`, worded "takes an even root of a negative value"; no argument can be complex) | "Complex values: `ln(-1)` is a domain error and `sqrt(-1)` an even root of a negative value, and no argument leaves the real line, since the language has no complex literal ([future.md](future.md), "Complex numbers")." |
| `devdocs/builtins.md` (the end of the page) | the thirteen reference-style link definitions, `[63]: https://…` to `[152]: https://…` (`devdocs/builtins.md:905-917`) | update (the Markdown principle) | delete; each issue becomes an inline link at the one passage that owns it (Proposed edits). |
| `devdocs/builtins.md#The exact functions` and `#Not in this design` (#98 twice); `#The rules every built-in follows` and `#Not in this design` (#100 twice); `#The elementary routines` and `#The Gamma and Beta families` (#152 twice) | the second pointer to each issue | update (§12, question 26: one place per issue) | #98 stays at `round`'s bullet; #100 is owned by `devdocs/numbers.md#approx`, so both pointers here become a link to that section; #152 stays at `expFixed`'s bullet. |

## Findings

Which sections become links to docs/ and which stay as mechanism, intent or ruled-out alternatives. The links name the pages of the §7 outline (`docs/functions.md`, `docs/numbers.md`, `docs/quantities.md`, `docs/expressions.md`), relative to `devdocs/`; their anchors are settled when those pages exist.

- **`#(top)`.** The first paragraph lists the built-ins from the user's side and shrinks to one sentence and a link to `../docs/functions.md`. The second paragraph is mechanism and stays; every statement in it holds: the `Builtin` type (`src/core/builtin.ts:165-186`), the shared namespace and the resolution order (`src/core/table.ts:31,234-243`), the duplicate and prefix checks (`src/core/build.ts:11-17,309-327,418-427`), the set as a parameter with `BUILTINS` the default (`src/core/build.ts:291-295`, `src/core/table.ts:63`), one module per family with its test beside it (the listing of `src/core/builtins/`), no module importing the map (`src/core/builtins.ts:17-53` is the only importer), and the `functionAsUnit` wording (`src/messages.ts:81-82,421-432`; scratch: `3 pi`, `2 exp`, `2 log` give "pi()", "exp(value)", "log(value, value)").
- **`#Names`.** Rationale and ruled-out alternatives (`e` and `W` taken, `log(x)` ambiguous, `dB` a prefix and a unit, one-letter names) stay as intent; the facts hold (`src/units.txt:113,153,207-210,223-228`; `src/core/build.ts:309-327`). One sentence is false as written (stale passages, row 5).
- **`#Arity`.** Mechanism stays: the range (`src/core/evaluate.ts:209-210`; `round` alone `{ min: 1, max: 2 }`, `src/core/builtins/round.ts:347`), the check once the name has resolved and before any argument is evaluated (`src/core/evaluate.ts:665-679`; scratch: `tempC(bogus, 1)` is the arity error), no variadic function by design. The user's rule (a wrong count is an error) gets a link to `../docs/expressions.md`, the owner of calls (C45).
- **`#The rules every built-in follows`.** Mechanism, stays. Three bullets restate user rules, the exact-case rule (N6), the edge rule (N15) and the exponent bound (N22), and each gets a sentence with a link to `../docs/numbers.md`. Confirmed: the kernel's ball returned as it is and the mode never seen (`src/core/builtin.ts:14-20`; `src/core/evaluate.ts:834-850` makes the call one step and `approx` the identity; that the passes a built-in sees are exact-mode contexts rests on `stepQuantity` in `quantity.ts`, A4's, not re-read here); `unboundedOf` (`src/core/builtin.ts:493-498`); the two-part structure and `keepSignificant` (every kernel header); the tiny-argument scaling (`src/core/builtin.ts:378-394`, `src/core/builtins/trig.ts:124-131`); the wide-argument bounds (`src/core/fixed-trig.ts:44-48,60-62`, `src/core/fixed-exp.ts:31-43,59-64`, `src/core/builtins/hyperbolic.ts:187-192,218-224`); `hullOfEnds` and `moveBetween` (`src/core/builtin.ts:524-589`); the domain and edge rule with the touching cases (`src/core/builtins/inverse-trig.ts:354-370`, `hyperbolic.ts:249-256,290-309`, `builtin.ts:341-355`, `pow.ts:101-110`); the exponent-bound guards (claim N22); `tanh` without a guard (`src/core/builtins/hyperbolic.ts:184-198,371-387`). The `sin(1 ± 1e-20)` radius was checked by calling `sinBall` on that ball at 30 and 60 digits: a radius bound of 6.02e-21 against cos(1) times 1e-20, as the page says. One imprecision: "one half for `asinh`" is a radius of one half (an interval of width one, `src/core/builtins/hyperbolic.ts:218`), as the bullet says for `tanh` and `exp`, and should say so.
- **`#Huge and tiny arguments`.** Mechanism, stays, with one bullet rewritten (row 6), one parenthesis dropped (row 3) and one word of terminology. Confirmed: `isTiny`, `isHuge`, `isBeyond`, `tinyOdd`, `tinyEven`, `reductionBits` (`src/core/builtin.ts:396-463`); `exp`'s one within twice the magnitude (`src/core/builtins/exp.ts:70-75`); `asin` and `acos` on the square (`inverse-trig.ts:178,201-211,419-429`); `erf`'s expansion (`erf.ts:154-170`); the huge trigonometric argument (`trig.ts:118-123`); `atan`'s saturation (`inverse-trig.ts:151-159`); `farLogarithm` (`hyperbolic.ts:389-412`); `tanh`'s saturation (`hyperbolic.ts:366-387`); `erf` beyond the working bits within the bound's edge (`erf.ts:80-81,101`); the logarithms through `lnScaled` (`log.ts:184-206`, `src/core/ball.ts:1531-1541`); `atan2`'s comparisons as radii, its tiny ratio, its whole range and the one `unresolved` ratio (`inverse-trig.ts:267-341,448-467`). The closing paragraph's two issues are open and stay, inline; `tanh(75)` at 32 digits still takes two passes (scratch), so #65's sentence is current.
- **`#Dimension rules`.** The introduction is mechanism (`src/core/evaluate.ts:819-832` carries every argument's span; `src/messages.ts:159-195` writes `sin(1 radian)` and `(2 m)^2` from them) and stays. The table matches the code row for row (`src/core/builtin.ts:197-321`; each module's `dimensions`) and is the only per-function statement of the rules today; it is the seed of the structured comments the generated reference will be built from (§12, question 17), so it stays until that reference exists and then becomes a link (Questions, 2). Two rows understate the rule: `div` and `mod` check conformance kinds included, as `atan2` does (`src/core/builtin.ts:299-321`). "Angles" states Q8 twice over (§9.1): the rule shrinks to one sentence with links, the mechanism (the kernel sees radians because `radian` is the primitive, the convention `RADIAN`, `noAngles`) stays, and the rationale paragraph stays as intent, already in the present tense. "`floor` and its kin take a plain number" is the rationale of Q5 and stays, with a link for the rule.
- **`#Domains, exact cases and edges`.** The table, like the dimension table, stays until the generated reference exists; confirmed row by row (`log.ts:99-144,161-166`, `pow.ts:84-122`, `trig.ts`, `inverse-trig.ts`, `hyperbolic.ts`; scratch ran about forty of its cases, including `pow(0, sqrt(2) - sqrt(2))` as `unresolved` at zero on the exponent, `log(1, 5)` as `baseOne`, `atan2(0, 0)` as `origin`). One cell is incomplete: `atan2`'s edges also include zero for `x`, when `y` is exactly zero and `x` straddles it or when `x` reaches zero under a `y` of definite sign with a huge ratio (`src/core/builtins/inverse-trig.ts:263-264,332-336`; scratch: `atan2(1e-30000, 1 - approx(1))` blames `1 - approx(1)`). The domain-reason list matches `src/core/builtin.ts:114-133` and the wordings `src/messages.ts:223-253`; the quoted `ln(-1)` message is exact (scratch). `log`'s and `pow`'s paragraphs are mechanism and stay, confirmed (`log.ts:114-143,208-276`; `pow.ts:1-44,84-220`; scratch: `pow(-1, 5^-16000)` exact `-1`, `pow(-1, 2 * 5^-16000)` exact `1`, `pow(-1, 1e999999999/3)` exact `1`, `pow(-1, 1e-30000)` and `pow(-2, 1e-30000)` an even root of a negative value, `pow(2, 1e-30000)` and `pow(2, 1e-999999999)` `≈ 1`, `pow(2, 1e999999999)` overflow, `pow(1, approx(1e400))` exact `1`, `pow(8, 1/3)` exact `2`, `pow(1/4, 3/2)` exact `0.125`). `pow`'s first sentence, the difference from `^`, gets a link to `../docs/functions.md` (C63).
- **`#The elementary routines`.** The algorithms stay; every statement checked against the headers holds (`src/core/fixed-exp.ts:1-74`, `fixed-log.ts:1-39`, `fixed-trig.ts:1-62`; `src/core/builtins/inverse-trig.ts:15-33,354-399`; `hyperbolic.ts:41-66,201-333`; `log.ts:146-182`; `src/core/constants.ts:32-34,144-150,180,223-231`). The timings leave (row 10). The probe paragraph holds (`src/limits.ts:90-97`, the composite against a table of the one primitive `radian`), and its gcd sentence is kept as intent (row 1). `pi()`'s callers in the file hold (`src/units.txt:241,292,354,357,414`).
- **`#The exact functions`.** The definitions and examples are user rules and the page's only per-function statement of them; they stay until the generated reference exists, then shrink to a link (Questions, 2). Boute's case and the ruled-out pairs stay as intent; "There is no mode argument" is a ruled-out alternative and stays, corrected (row 8). The "On balls" and prediction paragraphs are mechanism and hold (`src/core/builtins/round.ts:167-315`, `division.ts:48-152`, `integers.ts:28-175`, `abs.ts:24-44`; `exact.test.ts` passes; scratch: `round(1234, -2)`, `mod(-1, 1e20000)` and `round(1.5, 1e20000)` refused, `round(1e-999999999, 2)` exact `0`, `binomial(1e400, 2)` an exact ball, `doublefactorial(0)` and `(-1)` one, `binomial(5, -1)` zero, `gcd(0, 0)` zero, `lcm(-6, 4)` twelve). One statement is right about the design and wrong about the code, below.
- **`#The Gamma and Beta families`.** The algorithms stay; the statements checked hold against the modules and the headers: the Bernoulli series' reservation (`src/core/fixed-gamma.ts:21-24`), the shift to a third of the bits and the exact shift four times as far (`:6-8,34-47`), the series ending within eight ulps (`:88-89`, `TERM_FLOOR`), the reflection and the pole by `floorBall` (`src/core/builtins/gamma.ts:29-41,192-218,384-403`), the tiny and far routes (`:220-266,448-499`), `gamma` through `lgamma` with the cap of 64 bits and `factorialOf` (`:317-363`), `beta`'s exact case, sum, poles and uncapped bits (`beta.ts:79-232`), the incomplete functions' routes, limits, complement at the working digits and hull of a wide argument (`incomplete.ts:114-128,162-301,334-372`; `src/core/fixed-incomplete.ts:64-66,243` checks the bracket every eighth convergent), `erf` and `erfc` on the order one half (`erf.ts:83-152`), the incomplete beta's series, orientation, polynomial case and limits (`incbeta.ts:107-111,157-235,297-323,434-485`). Not verified here: the Bernoulli memo's holding of ratios by count and by bits (`bernoulli-ratios.ts`, outside the list), the series' tail taken from the magnitude of `x` and the convergent counts of the fraction (the bodies of `fixed-incomplete.ts`). The timings leave (rows 11 to 15), one example is corrected (row 9), one paragraph's Markdown is broken (row 16), the deferred functions are reworded (row 4). Scratch confirmed `gamma(20001)` `≈ 1.8192063e+77337`, `beta(1e6, 1e6)` `≈ 3.6164047e-602063`, `beta(5000, 5000)` an exact ball and `beta(40000, 40000)` an inexact one, `beta(2.5, 1e-20000)` a value, `beta(1e19, 1e19)` underflow, `beta(1, approx(-2))` and `gamma(approx(-2))` `unresolved` at a pole after nine passes, `uppergammareg(1e6, 1.01e6)` `≈ 1.0606997e-23`, `erfc(10)` `≈ 2.0884876e-45`, `erfc(1.5e9)` with exponent -977162584282316622, `incbetareg(2, 3, 1e-20)` `≈ 6e-40`, `digamma(1e-999999999)` and `digamma(-1e-999999999)` values, `lowergammareg(1e8, 1e8)` refused with no bit count.
- **`#Not in this design`.** Ruled-out alternatives, kept as intent; two pointers are duplicates (row 19) and one sentence is corrected (row 17).
- **The code is wrong where the page is right: `gcd(a, 0)`.** The page says `gcd(a, 0)` is the magnitude of `a`. Scratch: `gcd(5, 0)` is `2`, `gcd(7, 0)` is `3`, `gcd(12, 0)` is `1`, `gcd(2, 0)` is `0`, `gcd(-9, 0)` is `4`, while `gcd(0, 7)` is `7`, `gcd(1, 0)` is `1` and `gcd(0, 0)` is `0`. Cause: `gcdOfIntegers` (`src/core/builtins/integers.ts:55-58`) hands `b = 0` to `gcd` in `src/core/rational.ts:515-521`, whose precondition is a positive `b` (`:507-514`); `trailingZeros(0n)` (`src/core/scaled.ts:1085-1088`) is `-1`, so the closing shift moves the odd part of `a` down one bit instead of restoring the common power of two. No test covers a zero second argument (`src/core/builtins/integers.test.ts` has none; `exact.test.ts:70` has `gcd(-6, 4)` only). The page keeps its statement; the fix is a code change outside this unit (Questions, 1).
- **A display kind observed in passing.** Under a directed rounding mode `cosh(1e-999999999)` and `approx(1)` come out of `show` as kind `partial` with zero digits certified (scratch), which confirms the page's sentence and bears on N10 and §1.1.6 item 13 (A2's territory; Questions, 5).

## Proposed edits

Each edit is an old to new pair, or the complete text where a passage is rewritten whole. Links in the new text are written as the page writes them, relative to `devdocs/`; the docs pages named are those of the §7 outline.

### `devdocs/builtins.md#(top)`

Old, the first paragraph:

```
A built-in is a function the core implements in code rather than a
definition in `units.txt`: `pi()`, `exp`, the logarithms, the roots,
`pow`, the trigonometric and hyperbolic functions and their inverses,
`approx`, the exact functions (`abs`, `floor`, `gcd`, `factorial` and
their kin), and the Gamma and Beta families with the incomplete
functions, `erf` and `erfc`. [docs/functions.md](../docs/functions.md)
lists them from the user's side; this page says how they are built and
the rules each one follows. [numbers.md](numbers.md) is the arithmetic
they run on.
```

New:

```
A built-in is a function the core implements in code rather than a
definition in `units.txt`. What each one computes, accepts and refuses
is the user's reference, [docs/functions.md](../docs/functions.md); this
page says how the built-ins are built, the rules their implementations
share, and the bounds they rest on, family by family: the elementary
functions (`pi()`, `exp`, the logarithms, the roots, `pow`, the
trigonometric and hyperbolic functions and their inverses), `approx`,
the exact functions (`abs`, `floor`, `gcd`, `factorial` and their kin),
and the Gamma and Beta families with the incomplete functions, `erf`
and `erfc`. [numbers.md](numbers.md) is the arithmetic they run on.
```

### `devdocs/builtins.md#Names`

Old, the last bullet's last sentence:

```
Prefixes apply to units alone: a call's name is looked up exactly, so
`kpi()` and `mexp(1)` are calls of nothing, and no built-in is a prefix
of another's name either.
```

New:

```
Prefixes apply to units alone: a call's name is looked up exactly, so
`kpi()` and `mexp(1)` are calls of nothing, and that `log` begins
`log10` or `atan` begins `atan2` is no ambiguity, since nothing reads a
call's name in parts.
```

### `devdocs/builtins.md#Arity`

Old, the first sentence:

```
The grammar accepts a call with any number of arguments, `f()`, `f(x)`,
`f(x, y)`, and what a function accepts is its own:
```

New:

```
The grammar accepts a call with any number of arguments, `f()`, `f(x)`,
`f(x, y)` ([docs/expressions.md](../docs/expressions.md) has the user's
rule: a call with the wrong count is an error), and what a function
accepts is its own:
```

### `devdocs/builtins.md#The rules every built-in follows`

Old, the second bullet:

```
- **An exact case returns an exact ball**, radius zero, wherever the
  value is rational and cheaply recognized; the rest of the time the
  result is a ball however round it looks (`ln(8) / ln(2)` is `≈ 3`).
```

New:

```
- **An exact case returns an exact ball**, radius zero, wherever the
  value is rational and cheaply recognized; the rest of the time the
  result is a ball however round it looks. The rule as the user meets it
  is [docs/numbers.md](../docs/numbers.md); the cases themselves are in
  the table below and in each module's header.
```

Old, in the wide-argument bullet:

```
  can carry a radius of its own that no pass narrows, the two-argument
  `approx` ([#100][100]). A function monotone in its argument (`erf`, `erfc`, the incomplete
```

New:

```
  can carry a radius of its own that no pass narrows, the two-argument
  `approx` ([numbers.md](numbers.md), "`approx`"). A function monotone
  in its argument (`erf`, `erfc`, the incomplete
```

Old, in the same bullet:

```
  too wide for a routine's series (about a fifth of a radian for `sin`
  and `cos`, one radian for `atan`, one half for `asinh`, an error of one
  half for `tanh` and for `exp`) is answered without the kernel:
```

New:

```
  too wide for a routine's series (about a fifth of a radian for `sin`
  and `cos`, one radian for `atan`, and a radius of one half for
  `asinh`, `tanh` and `exp`) is answered without the kernel:
```

Old, the domain bullet's first sentence:

```
- **An argument outside the domain throughout its ball is a `domain`
  error**, located at the call and naming the argument; one that
  straddles an edge of the domain, or another point where the result
  depends on which side the true value lies, is `unresolved` at that
  edge: the retry loop raises the precision, and at the ceiling the
  message says the value cannot be told from the edge.
```

New:

```
- **An argument outside the domain throughout its ball is a `domain`
  error**, located at the call and naming the argument; one that
  straddles an edge of the domain, or another point where the result
  depends on which side the true value lies, is `unresolved` at that
  edge, the rule [docs/numbers.md](../docs/numbers.md) states for every
  edge: the retry loop raises the precision, and at the ceiling the
  message says the value cannot be told from the edge.
```

Old, the exponent-bound bullet's first clause:

```
- **A result whose decimal exponent would pass the exponent bound is
  refused before anything is computed** when every value of the
  argument's ball puts it past the bound, through the classifier of
  `ball.ts` ([numbers.md](numbers.md), "The exponent bound"):
```

New:

```
- **A result whose decimal exponent would pass the exponent bound is
  refused before anything is computed** when every value of the
  argument's ball puts it past the bound (the bound and its refusals are
  [docs/numbers.md](../docs/numbers.md); the classifier is `ball.ts`,
  [numbers.md](numbers.md), "The exponent bound"):
```

### `devdocs/builtins.md#Huge and tiny arguments`

Old, in the first bullet:

```
  precision, `acos` as `pi/2` less the argument, since `1 - x^2` stops
  aligning within the significand limit long before
  `2^-significandLimitBits` (`acos(1e-9860)` was refused at the default
  limit). `erf` of a tiny argument is `2x / √π` within `|x|^3`, the next
  term of its series being `-2x^3 / (3 √π)`, and `erfc` one less that.
  Under a directed rounding mode these show `≈ 1` with no digit certain,
  since the ball straddles one, as `cosh(1e-999999999)` and `approx(1)`
  do.
```

New:

```
  precision, `acos` as `pi/2` less the argument, since `1 - x^2` stops
  aligning within the significand limit long before
  `2^-significandLimitBits`. `erf` of a tiny argument is `2x / √π`
  within `|x|^3`, the next term of its series being `-2x^3 / (3 √π)`,
  and `erfc` one less that. Under a directed rounding mode these show
  `≈ 1` with no digit certified, since the ball straddles one, as
  `cosh(1e-999999999)` and `approx(1)` do.
```

Old, the second bullet:

```
- Between that and half an ulp of the working bits, the kernel's door
  converts the argument to zero within an ulp, which is what the
  log-space power of a tiny exponent goes in as; a tiny ratio formed
  inside `asin`, `acos` or `atan2` converts to zero within an ulp and
  gives a ball around zero that certifies nothing, the one case the
  expansion does not reach, since those combine the kernel's arctangent
  with `pi` before the ball is formed.
```

New:

```
- Between that and half an ulp of the working bits, the kernel's door
  converts an argument handed over at the working bits alone to zero
  within an ulp, which is what `exp` of such an argument and the
  log-space power of a tiny exponent go in as, and the exponential of
  it is `≈ 1`; the inverses do not reach it: `atan2` answers a tiny
  ratio over a positive `x` by the expansion as `atan` does, and never
  forms a ratio below `2^-bits` on its other routes, while `asin` and
  `acos` take their expansion on the argument's square before any ratio
  is formed.
```

Old, the closing paragraph:

```
`asin`, `acos` and `acosh` of an exact argument with a long significand
(`asin(0.1 + 1e-15000)`) are refused, since their exact `1 - x^2` does
not align within the significand limit ([#63][63]); `tanh`'s fold band
costs an extra pass ([#65][65]).
```

New:

```
`asin`, `acos` and `acosh` of an exact argument with a long significand
(`asin(0.1 + 1e-15000)`) are refused, since their exact `1 - x^2` does
not align within the significand limit
([#63](https://github.com/bsidhom/exucal/issues/63)); `tanh` loses half
its working bits between the exponential's fold and its saturation,
which costs a pass ([#65](https://github.com/bsidhom/exucal/issues/65)).
```

### `devdocs/builtins.md#Dimension rules`

Old, two rows of the table:

```
| `div(a, b)`                                                                                  | two quantities of one dimension                 | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension                 | the arguments' |
```

New:

```
| `div(a, b)`                                                                                  | two quantities of one dimension, kinds included | plain number   |
| `mod(a, b)`                                                                                  | two quantities of one dimension, kinds included | the arguments' |
```

Old, the "Angles" paragraph (the rationale paragraph after it, "The alternative, …", stays as it is):

```
**Angles.** `sin`, `cos` and `tan` require the `radian` kind, the kind
primitive `units.txt` declares and every angle unit carries (`deg` is
`pi() radian / 180`, so `sin(30 deg)` is `sin(pi() / 6)` inside the
kernel, which sees the magnitude in radians because `radian` is the
primitive). A plain number is a kind mismatch, worded to say that an
angle is wanted and how to write one: `sin(1 radian)`, `sin(pi() radian /
4)`. `sin(0)` is that mismatch too, as `1 m + 0` is; `sin(0 radian)` is
the exact zero. The inverses return the `radian` kind, so `asin(0.5)`
converts into `deg`, `sin(asin(0.5))` evaluates and `asin(sin(x))` has
the kind `x` has; `2 asin(0.5) + 1` is the kind mismatch it is, and the
number is one token away: `asin(0.5)` into `turn`, or `/ radian`.
`atan2(y, x)` takes two quantities of one dimension, so `atan2(3 m, 4 m)`
works and `atan2(3 m, 4 s)` is a dimension mismatch. The hyperbolic
functions take and return plain numbers, since their arguments are not
angles. The rule names the primitive `radian` by convention; a table that
declares no such primitive has no angles, and the trigonometric functions
say so.
```

New:

```
**Angles.** The rule is the user's: `sin`, `cos` and `tan` take an
angle, the `radian` kind, and their inverses return one; `atan2` takes
two quantities of one dimension, kinds included; the hyperbolic
functions take and return plain numbers, since their arguments are not
angles ([docs/functions.md](../docs/functions.md); the kind itself and
why a plain number is a mismatch are
[docs/quantities.md](../docs/quantities.md), "Kinds"). The mechanism:
`radian` is the kind primitive `units.txt` declares and every angle
unit carries, so the kernel sees the magnitude in radians (`deg` is
`pi() radian / 180`, and `sin(30 deg)` reaches the kernel as `pi / 6`);
the message for a plain number says how to write an angle,
`sin(1 radian)`; the rule names the primitive by convention (`RADIAN` in
`builtin.ts`), and a table that declares no such primitive has no
angles (`noAngles`), which the trigonometric functions say.
```

Old, the first sentence of "`floor` and its kin":

```
**`floor` and its kin take a plain number.** A quantity's magnitude is
stored in the primitives, so `floor(3.7 ft)` would floor `1.12776 m` and
```

New:

```
**`floor` and its kin take a plain number**
([docs/functions.md](../docs/functions.md)). A quantity's magnitude is
stored in the primitives, so `floor(3.7 ft)` would floor `1.12776 m` and
```

### `devdocs/builtins.md#Domains, exact cases and edges`

Old, one row of the table:

```
| `atan2(y, x)`          | not both zero                                          | `atan2(0, x)` for `x > 0`                                                                                     | zero for `y`, when `x` is not positive      |
```

New:

```
| `atan2(y, x)`          | not both zero                                          | `atan2(0, x)` for `x > 0`                                                                                     | zero for `y`, when `x` is not positive; zero for `x`, when `y` is zero or far wider than `x` |
```

Old, the first sentence of "`pow`, and `^` with it":

```
**`pow`, and `^` with it.** `pow(x, y)` is for a plain base and a plain
exponent; a power of a quantity is written with `^`, whose exponent is a
literal so that the dimension stays exact. The two share
```

New:

```
**`pow`, and `^` with it.** `pow(x, y)` is for a plain base and a plain
exponent; a power of a quantity is written with `^`, whose exponent is a
literal so that the dimension stays exact (the user's side of the
difference is [docs/functions.md](../docs/functions.md), `pow`). The two
share
```

### `devdocs/builtins.md#The elementary routines`

Old, the opening paragraph:

```
One module per family beside `fixed.ts`, below the ball so that
`powRationalBall` can reach `exp` and `ln`. Every routine costs 9 to 13
ms at the default ceiling of 4,040 digits (`bench/kernel.bench.ts`
reports each), V8 multiplying integers of that size by the schoolbook
rule, about sixty microseconds a product.
```

New:

```
One module per family beside `fixed.ts`, below the ball so that
`powRationalBall` can reach `exp` and `ln`. The routines cost about the
same as one another at the default ceiling, where V8 multiplies integers
of that size by the schoolbook rule, so a routine's cost is counted in
full multiplications and the series below are arranged to need few of
them; `bench/kernel.bench.ts` measures each.
```

Old, in the `expFixed` bullet:

```
  candidate for the rectangular splitting the other routines use
  ([#152][152]). `e` is `eSeries` in `constants.ts`, `Σ 1/n!` by binary
```

New:

```
  candidate for the rectangular splitting the other routines use, and
  what runs the elementary functions past a keystroke's budget at the
  hard bound of the precision limit
  ([#152](https://github.com/bsidhom/exucal/issues/152)). `e` is
  `eSeries` in `constants.ts`, `Σ 1/n!` by binary
```

Old, the probe paragraph's last sentence:

```
Timing it once found that the exact arithmetic on settled midpoints ran
Euclid's gcd on dyadics of the ceiling's size, tens of milliseconds a
sum, which is why the gcd strips the common power of two first.
```

New:

```
The exact arithmetic on settled midpoints runs its gcd on dyadics of
the ceiling's size, which is why the gcd strips the common power of two
first and runs Lehmer's algorithm on the odd parts: Euclid's steps on
such operands would dominate every sum.
```

### `devdocs/builtins.md#The exact functions`

Old, the opening paragraph:

```
Thirteen functions that need no precision: each is exact on exact
arguments, and on an inexact argument is either exact where the
argument's interval decides the answer or `unresolved` where it does
not. They are the functions whose result keeps its argument's dimension
(`abs`, `mod`), or takes any quantity (`sign`, `div`).
```

New:

```
Thirteen functions that need no precision: each is exact on exact
arguments, and on an inexact argument is either exact where the
argument's interval decides the answer or `unresolved` where it does
not. Four of them take quantities: `abs` and `mod`, whose result keeps
the argument's dimension, and `sign` and `div`, whose result is a plain
number; the other nine take plain numbers, as the dimension rules say.
What each computes is the user's reference,
[docs/functions.md](../docs/functions.md); the definitions below stand
until that reference is generated from the modules.
```

Old, in the `round` bullet:

```
  `round` is the user asking for it there. There is no mode argument: the
  grammar has no strings, a bare name is a unit, and two of the modes'
  names, `floor` and `ceiling`, are functions. Rounding to significant
  digits is [#98][98].
```

New:

```
  `round` is the user asking for it there. There is no mode argument: the
  grammar has no strings, a bare name is a unit, and one of the modes'
  names, `floor`, is already a function. Rounding to significant digits,
  propagated from how the inputs were written, is
  [#98](https://github.com/bsidhom/exucal/issues/98).
```

### `devdocs/builtins.md#The Gamma and Beta families`

Old, the end of the Bernoulli paragraph:

```
the last computes one run for what it will take (growing the memo term
by term had a cold ceiling pass recompute the run five times over). A
larger run replaces a smaller one, so the memo never holds more than
one; its footprint is [#103][103]. The memo is filled on first use: a
page that never evaluates the Gamma family never computes a Bernoulli
number, and the run at the ceiling, half a second once for an exact
shift and about two for an inexact argument's, is paid by the first
evaluation whose retry loop reaches the ceiling.
```

New:

```
the last computes one run for what it will take; a memo grown term by
term would recompute the run several times within one cold pass. A
larger run replaces a smaller one, so the memo never holds more than
one; its footprint is [#103](https://github.com/bsidhom/exucal/issues/103).
The memo is filled on first use: a page that never evaluates the Gamma
family never computes a Bernoulli number, and the run at the ceiling,
the one noticeable pause the family has, is paid once, by the first
evaluation whose retry loop reaches the ceiling, an inexact argument's
longer shift asking for a longer run than an exact one's
([cost.md](cost.md) has the measurements).
```

Old, the end of the `lgamma` and `gamma` paragraph:

```
narrows an `approx` one. Costs at the default ceiling: `gamma` or
`lgamma` about 0.12 s and `digamma` 0.14 s a call for an exact argument
of short denominator, and 0.45 s and 1.2 s for an inexact one, the
loop's shift being most of those; at a thousand digits a call is tens of
milliseconds and at forty the series is microseconds. Shifting a wide
argument by rectangular splitting of the rising factorial is
[#125][125].
```

New:

```
narrows an `approx` one. At the ceiling the loop's shift is most of a
call's cost for an inexact argument, and an exact argument of short
denominator, shifted by binary splitting, costs a fraction of that; well
below the ceiling the series dominates and a call is cheap
([cost.md](cost.md) and the stress tools have the measurements).
Shifting a wide argument by rectangular splitting of the rising
factorial is [#125](https://github.com/bsidhom/exucal/issues/125).
```

Old, in the `beta` paragraph:

```
largest argument's magnitude, uncapped, since the logarithms cancel when
an argument is large (`beta(1e15, 1)` is `1e-15` from logarithms near
`2^55`), and an argument whose magnitude would need more bits than the
```

New:

```
largest argument's magnitude, uncapped, since the logarithms cancel when
an argument is large (`beta(1e15, approx(1))` is `≈ 1e-15` from
logarithms near `2^55`; `beta(1e15, 1)` itself is the exact case), and
an argument whose magnitude would need more bits than the
```

Old, the end of the incomplete gamma paragraph:

```
than digits nothing certifies; the uniform asymptotic expansions that
regime wants are [#107][107], and the refusal's message speaks of the
significand limit where the limit is one of cost. An argument whose
radius is above `2^-16` of its magnitude is taken at its two ends and
the results hulled, each form being monotone in `x`, since the
fraction's denominators reach zero over such a width. Measured for the
regularized upper form: one to two milliseconds a call at forty digits,
forty to eighty at a thousand, and about a second at the default
ceiling, two for `x = 1000`; the series' full-precision division on
every term is [#149][149].
```

New:

```
than digits nothing certifies; the uniform asymptotic expansions that
regime wants are [#107](https://github.com/bsidhom/exucal/issues/107),
and the refusal's message speaks of the significand limit where the
limit is one of cost. An argument whose radius is above `2^-16` of its
magnitude is taken at its two ends and the results hulled, each form
being monotone in `x`, since the fraction's denominators reach zero
over such a width. The cost grows with the convergents or terms the
route takes, so a large `x` under the fraction is the costly case at
the ceiling ([cost.md](cost.md)); the series' full-precision division
on every term is [#149](https://github.com/bsidhom/exucal/issues/149).
```

Old, the end of the `erf` paragraph:

```
routine refuses, is taken at its ends and hulled, both functions being
monotone. A call is one to three milliseconds at forty digits.
```

New:

```
routine refuses, is taken at its ends and hulled, both functions being
monotone.
```

Old, the exact-case tail of the incomplete beta paragraph (the broken block, `devdocs/builtins.md:864-874`):

```
cases: `x = 0` is `0`, `x = 1` is `1`, and positive integers `a` and `b`
make it a polynomial in `x`, `Σ binomial(a + b - 1, j) x^j (1 - x)^(a +
b - 1 - j)` over `j` from `a` to `a + b - 1`, one integer over `q^(a + b

- 1)`for a rational`x = p / q`, the binomial stepped exactly, formed
where that power fits the significand limit and `a + b - 1`is at most
ten thousand, the whole numbers'`B(a, b)`coming from`beta`. A wide or
edge-touching ball of `x`is taken at its ends, the function rising with`x`. Measured at forty digits: a few milliseconds a call for moderate
parameters, fifty for `(1e4, 1e4, 0.5)`; the series' cost at the
  ceiling is [#150][150].
```

New:

```
cases: `x = 0` is `0`, `x = 1` is `1`, and positive integers `a` and `b`
make it a polynomial in `x`, `Σ binomial(a + b - 1, j) x^j (1 - x)^(a +
b - 1 - j)` over `j` from `a` to `a + b - 1`, one integer over
`q^(a + b - 1)` for a rational `x = p / q`, the binomial stepped
exactly, formed where that power fits the significand limit and
`a + b - 1` is at most ten thousand, the whole numbers' `B(a, b)`
coming from `beta`. A wide or edge-touching ball of `x` is taken at its
ends, the function rising with `x`. Large parameters near the median are
the costly case, since both orientations then take many terms; the
series' cost at the ceiling is
[#150](https://github.com/bsidhom/exucal/issues/150).
```

Old, the last paragraph of the section:

```
The costs of these families at raised ceilings are catalogued in
[cost.md](cost.md); the hangs at the highest precision limit the default
significand limit allows are [#151][151], and at the hard bound
[#152][152]. Eight more special functions (`zeta`, `lambertw`, `ellipk`,
`ellipe`, `legendre`, `chebyshev`, Bessel `J` and `I`) were designed and
deferred ([#115][115] holds the context: `zeta` by the Borwein algorithm,
`lambertw` by Halley's iteration with a containment check, the elliptic
integrals by the arithmetic-geometric mean, the orthogonal polynomials
by their recurrences, exact for a rational argument, and Bessel `J` and
`I` by their series for small arguments). Ruled out as built-ins: the
general hypergeometric functions (every region of the argument plane
needs its own transformation), Bessel `Y` and `K` and any Bessel function
at large argument (the asymptotic expansions and logarithmic limits are
library-sized casework), the polygamma functions beyond `digamma`,
`gamma` of a complex argument, and the statistical distributions, which
are one-line user functions over the incomplete functions (the normal,
chi-squared, Student's t and F cumulative distributions are `erfc`, `P`
and `I_x` at the right arguments). An audit of every numeric routine and
rigorous bound, with citations, is [#112][112].
```

New:

```
The costs of these families at raised ceilings, and the cases that run
past a usable time at the highest precision limit the settings allow,
are catalogued in [cost.md](cost.md). Eight more special functions
(`zeta`, `lambertw`, `ellipk`, `ellipe`, `legendre`, `chebyshev`,
Bessel `J` and `I`) are designed and deferred
([#115](https://github.com/bsidhom/exucal/issues/115) holds the
context: `zeta` by the Borwein algorithm, `lambertw` by Halley's
iteration with a containment check, the elliptic integrals by the
arithmetic-geometric mean, the orthogonal polynomials by their
recurrences, exact for a rational argument, and Bessel `J` and `I` by
their series for small arguments). Not in the initial design, deferred
rather than ruled out, each for the work it would take: the general
hypergeometric functions (every region of the argument plane needs its
own transformation), Bessel `Y` and `K` and any Bessel function at a
large argument (the asymptotic expansions and logarithmic limits are
library-sized casework), the polygamma functions beyond `digamma`, and
`gamma` of a complex argument, which needs complex values first
([future.md](future.md), "Complex numbers"). The statistical
distributions are not built-ins because they need not be: each is a
one-line function over the incomplete functions (the normal,
chi-squared, Student's t and F cumulative distributions are `erfc`, `P`
and `I_x` at the right arguments). An audit of every numeric routine
and rigorous bound, with citations, is
[#112](https://github.com/bsidhom/exucal/issues/112).
```

### `devdocs/builtins.md#Not in this design`

The complete section:

```
## Not in this design

- A mode argument to `round` (above, "The exact functions"); a value
  entered with its uncertainty, the two-argument `approx`
  ([numbers.md](numbers.md), "`approx`").
- Truncated or Euclidean `div` and `mod`; both are one call away.
- A non-integer `factorial` or `binomial`, which `gamma` and `beta` give.
- Complex values: `ln(-1)` is a domain error and `sqrt(-1)` an even root
  of a negative value, and no argument leaves the real line, since the
  language has no complex literal ([future.md](future.md), "Complex
  numbers").
```

### `devdocs/builtins.md` (the link definitions)

Delete the thirteen lines from `[63]: https://github.com/bsidhom/exucal/issues/63` to `[152]: https://github.com/bsidhom/exucal/issues/152` at the end of the page; every pointer above is inline.

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "certain" ("with no digit certain") | `#Huge and tiny arguments` | **certified** (§8; §12, question 8). |
| "plain number", throughout the tables and the prose, and the code's rule `plainNumbers` and the messages' wording | `#Dimension rules`, `#Domains, exact cases and edges`, `#The exact functions`, `#The Gamma and Beta families` | §8 reserves **dimensionless** for a plain scalar and glosses it "a plain number" in docs. The page quotes the rule's and the messages' word; keep "plain number" here and gloss it once at its first use in `#Dimension rules`: "a plain number, which is dimensionless: neither dimension nor kind" (Questions, 7). |
| "working digits" for a pass's digits ("rounded onto the working digits", "at the working digits rather than the context's") | `#The rules every built-in follows`, `#The Gamma and Beta families` (the incomplete gamma and beta paragraphs) | §8: **working digits** is the setting and **working precision** a pass's; write "the pass's working precision" or "the working precision's digits"; the code's `workingDigits` is #172's. |
| "the hard bound" | `#The Gamma and Beta families` (last paragraph, the hangs) | **the significand limit's hard bound** (C58), where it is kept at all; the proposed text above points at `cost.md` instead. |
| "domain error", "exact case", "unresolved", "refused", "whole number" in quoted messages against "integer" in the prose | throughout | all as §8 has them; no change. |

## Questions for the owner

1. **`gcd(a, 0)` is wrong in the code** (Findings): `gcd(5, 0)` is `2`. Proposed: a code fix outside the audit, in `gcdOfIntegers` (`src/core/builtins/integers.ts:55-58`, return the other argument's magnitude when one is zero) or in `rational.ts`'s `gcd` (accept `b = 0` and widen its precondition), with a zero in either position tested in `integers.test.ts` and `exact.test.ts`; the page's statement stands as the specification. (A task suggestion for it was attempted from this session and declined by the permission classifier.)
2. **The two per-function tables and the exact functions' definitions** are the only per-function statement of the rules today. Proposed: they stay in this page until the reference generated from structured comments exists (§12, question 17), seed those comments, and then become one link each to `docs/functions.md`.
3. **Timings against the plan's "measurements kept".** The unit's entry in §10 says the measurements stay; §12, question 25 says concrete timings leave. Proposed: question 25 governs; timings leave this page for `cost.md` and the benchmarks, while bit counts, term and convergent counts, limits and memory sizes stay as bounds and characteristics of the algorithms.
4. **Issue pointers across pages.** #100 belongs to `devdocs/numbers.md#approx` (§1.1.4), so this page should link that section and not the issue; #151 and #152 name the cost catalogue's hangs, which `cost.md` (V6) presumably also links. Proposed: #152 stays here at `expFixed`'s bullet, which owns the cause; #151 lives in `cost.md` only; V6 confirms both.
5. **The `partial` display kind is reachable today**: under a directed rounding mode `cosh(1e-999999999)` and `approx(1)` show kind `partial` with zero digits certified (scratch through `show`). This answers §1.1.6 item 13 for A2 and V1 (N10); proposed: A2 records it and checks the note's wording for zero certified digits.
6. **Code comments found inconsistent with the code**, outside the audit's scope and left as they are: `src/core/builtin.ts:167` ("every one of this stage takes a fixed count", but `round` takes one or two); `src/core/fixed-gamma.ts:17` (a series ends when a term "falls below an ulp", against `TERM_FLOOR` of eight at `:88-89`); `src/core/builtins/gamma.ts:44` ("Most bits", the significand limit's former name); `src/core/builtins/hyperbolic.ts:63,219` ("wider than one half", where the test at `:218` is a radius of one half); and "earlier version" notes at `src/core/builtins/pow.ts:17-20`, `inverse-trig.ts:72` and `incomplete.ts:41-43` that the documentation principle, which the style guide applies to comments, would rewrite. Proposed: one code-comment pass after the audit, not part of any unit.
7. **"plain number" against "dimensionless"** (Terminology). Proposed: this page keeps "plain number" where it quotes the rules and the messages, glossed once as dimensionless.

## Notes on this run

The plan's entry scoped this unit well: the modules named covered every statement except the Bernoulli memo's by-count-and-bits detail (`bernoulli-ratios.ts`) and the bodies of `fixed-incomplete.ts`, which the headers do not settle and which are left unverified rather than read. The one conflict inside the plan is the entry's "measurements kept" against §12, question 25; this report follows question 25 and asks (question 3). Most of the page is current and precise, and the most useful check was running its examples through `evaluateText` from a scratch script with a pass counter, which took a few minutes to set up and settled every "first pass", "refused" and exact-case claim at once, found the one wrong example (`beta(1e15, 1)` is the exact case) and the one code bug (`gcd(a, 0)`), and showed that `acos(1e-9860)` is now a value, which is what made the drop in §1.1.5 safe. The next unit should know that the thirteen issues this page links are all open, so the inline rewrite moves pointers rather than deleting them, and that §12, question 26 reaches across pages: #100 is `numbers.md`'s and #151 is `cost.md`'s, so V1 and V6 should expect no pointer to them from here.
