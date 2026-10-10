# Incidental bugs found by the documentation audit

The audit units changed no code; these are the defects they met while checking the pages
against it, deduplicated: 70 bugs from the code-issue rows and code findings of the
twenty-six reports under [reports/](reports/). Nothing here was re-run or re-read in the
code by the consolidation; each bug rests on the evidence its units cite. Severity is a
rough guess: `high`, a wrong answer or a crash a user can reach; `medium`, wrong or
misleading user-visible text, a wrong refusal class, an edge that misbehaves; `low`,
comments, naming, test gaps and internals.

Each bug names the finding that describes the same issue from the docs side (Docs side),
and says whether it blocks or complicates a page's rewrite (Rewrite impact). Decided code
changes, such as "certain" becoming "certified" in the notes (plan §12 question 8), are
listed last: they are not defects, but the pages will quote their result.

| Category | High | Medium | Low | Total |
| --- | --- | --- | --- | --- |
| behaviour | 3 | 7 | 4 | 14 |
| message wording | 0 | 5 | 10 | 15 |
| test gap | 0 | 0 | 4 | 4 |
| misleading comment | 0 | 0 | 34 | 34 |
| decided code change | 0 | 1 | 2 | 3 |
| **total** | 3 | 13 | 54 | **70** |

## Bugs that block or complicate the rewrite

- **Blocks.** B-002: the outcome throws on a literal whose display rounding passes
  the exponent bound, so `devdocs/notation.md#Every literal parses back` and claim N12's
  last sentence describe a decision the code does not implement; their text waits on the
  fix chosen (Q-002: the units disagree on it). B-068: the decided
  change of "certain" to "certified" in the notes and the sheet should land before
  `docs/numbers.md` is assembled, since the drafted pages quote the new wording
  (Q-006).
- **Complicates.** The page states the intended rule and avoids the example until the fix
  lands: B-001 (`gcd(a, 0)`), B-004 (the ratio notation's screen),
  B-005 (`mod`'s refusal class), B-007 (`log`'s exact cases),
  B-008 (decimal mode's reciprocal line), B-012 (a stored ratio width out
  of range). The page describes the behaviour without quoting the app's text until the
  wording changes: B-017 (the probe's sheet line), B-022 (the empty-state
  hint), B-023 (the load-failure message), B-029 (no message for a
  definitions rejection), B-032 (a failing build reported by offsets).
  Pointers and generated text: B-056, B-070.
- **High severity, no page change.** B-003: a root of degree three or more of a
  wide ball throws (issue #79); `devdocs/numbers.md#Roots and powers` already states it with
  the issue.

## Behaviour

### B-001. `gcd(a, 0)` is wrong for every `a` above one

- Category: behaviour
- Severity (guess): high — wrong answer on a plain input (`gcd(5, 0)` is `2`)
- Location: `src/core/builtins/integers.ts:55-58` (`gcdOfIntegers`; D6 cites `:56-58`); `src/core/rational.ts:507-521` (`gcd`: contract `:507-514`, body `:515-521`); `trailingZeros` (`src/core/scaled.ts:1085-1088` per V3, `src/core/rational.ts:503-505` per D6); tests `src/core/builtins/integers.test.ts`, `src/core/builtins/exact.test.ts:70`
- Description: `gcdOfIntegers` hands `b = 0` to `rational.ts`'s `gcd`, whose contract is "the non-negative `a` and the positive `b`" and which special-cases only a zero `a`; `trailingZeros(0n)` is `-1`, so the closing shift moves `a`'s odd part down one bit: `gcd(5, 0)` `= 2`, `gcd(7, 0)` `= 3`, `gcd(12, 0)` `1`, `gcd(100, 0)` `= 12`, `gcd(2, 0)` `= 0`, `gcd(-9, 0)` `4`, `gcd(1000000007, 0)` `500000003` (`gcd(0, 5)`, `gcd(1, 0)`, `gcd(0, 0)` right); no test has a zero second argument (`exact.test.ts:70` has `gcd(-6, 4)` only); fix (both units): return the other argument's magnitude when one is zero, or make `gcd` total, and test `gcd(5, 0)`, `gcd(0, 5)`, `gcd(0, 0)`, `gcd(-10, 0)`, `lcm(5, 0)` in `integers.test.ts`, the first also in `exact.test.ts`.
- Units: D6 (L58, L73, L87, L230), V3 (L71, L74, L754, L764)
- Docs side: F-152; `devdocs/builtins.md#The exact functions` states the intent correctly ("`gcd(a, 0)` is the magnitude of `a`", D6 report, context) and keeps it as the specification
- Rewrite impact: complicates — the pages state the rule and show no `gcd(a, 0)` result until the fix lands.

### B-002. The outcome throws on a literal whose display rounding passes the bound

- Category: behaviour
- Severity (guess): high — no line, and the component loses its render, on a typed input
- Location: `src/outcome.ts:394-398` (`numberExpr`; the throw at `:396`); `src/core/scaled.ts:187-197` (`parseDecimal` refuses as `overflow`)
- Description: `9.5e1000000000000000000` at one display digit and `9.99999999e1000000000000000000` at eight (blank want or into `m`) throw "The display wrote 1e+1000000000000000001, not a literal", because `numberExpr` rebuilds every literal from the display's text through `parseDecimal`, which refuses a value past the exponent bound (`1e1000000000000000000 m`, `1e-1000000000000000000 m`, `9.99999999e-1000000000000000000 m` paste back); the units' fixes differ: A2 (Q2) keeps the display's text with a value built without the bound check, plus a test (the page's decision), A8 (Q1) reports it as the bound's refusal (`overflow`).
- Units: A2 (L29, L61, L145, L156), A8 (L32, L55, L146)
- Docs side: F-060, F-060; V5 report (context) says the display writes `1e+1000000000000000001` at one digit, not that the outcome throws
- Rewrite impact: blocks — `devdocs/notation.md#Every literal parses back` and N12's last sentence state a decision the code does not implement; their text depends on the fix chosen.

### B-003. A root of degree three or more of a wide ball throws (#79)

- Category: behaviour
- Severity (guess): high — the one place a user's value reaches a throw
- Location: `src/core/fixed.ts:695-697` (`verifiedRoot`); issue #79
- Description: `cbrt(3e24 + (approx(2e51) - approx(2e51)))` throws "Newton's root is not within half of its argument"; open issue #79, reproduced by V1; the page states it with the issue's link.
- Units: V1 (L58, L100, L141, L171)
- Docs side: F-221
- Rewrite impact: none — `devdocs/numbers.md#Roots and powers` keeps the sentence with #79 inline (both go when the issue closes, §12 q26); `#Failures` states the rule the throw breaks.

### B-004. `ratioParts` rejects dyadic ratios that fit the width

- Category: behaviour
- Severity (guess): medium — exact values shown as rounded `≈` decimals against the notation's rule
- Location: `src/core/display.ts:131-156` (the screen at `:134-136`, and its comment); `src/core/scaled.ts:8-11`
- Description: the fraction is formed only when the canonical exponent lies within `2W` and the canonical numerator has at most `2W` digits, on the comment's reasoning that a denominator keeps at least `5^-k` of the `10^-k`, which assumes a numerator coprime to ten where the canonical form only keeps it not divisible by ten (the bound is `2^-k`); so at the default width `2^-41` to `2^-63`, `3/2^45` and `1/(7*2^41)` are written `≈` decimals though their ratios fit (`1/2199023255552`, 14 digits), while `2^-40` is `= 1/1099511627776`; no test covers the boundary; fix (V5 Q1): screen the exponent at `4W` and the numerator's digits at `3W`.
- Units: V5 (L27, L83, L236)
- Docs side: F-061; A2 confirmed N13 without meeting the screen (A2 L30, A2 report, context)
- Rewrite impact: complicates — rule 3 of `devdocs/notation.md#The rule` and N13 stand as design; until the fix, one sentence in `#The rule` names the exception (with an issue link if one is opened).

### B-005. `mod`'s alignment refusal carries reach `exceeds`, not `fits`

- Category: behaviour
- Severity (guess): medium — wrong refusal class: no count and no remedy where `approx` gives a value
- Location: `src/core/builtins/division.ts:136`, `:146` (`modBall`'s exact path)
- Description: `mod(-1, 1e20000)` reads "would need a significand, past the significand limit, however it is computed", yet `mod(approx(-1), 1e20000)`, `mod(-1, approx(1e20000))` and `mod(approx(-1), approx(1e20000))` are each `≈ 1e+20000`; by the reach rule (`src/core/rational.ts:60-66`) the two `tooLarge("exceeds", UNKNOWN_NEED)` should be `fits` with the need `subtract` or `multiply` reports, so the message offers `approx` and decimal mode as a sum's does (`1e999999999 + 1`); the quotient-overflow case (`division.ts:122-123`) is rightly `exceeds`.
- Units: D6 (L33, L67, L74, L231)
- Docs side: F-284
- Rewrite impact: complicates — `devdocs/builtins.md#The exact functions` has two drafted forms of D6's edit (e), one per answer to D6 Q2.

### B-006. `^` and `pow` disagree on extreme exact exponents (#88)

- Category: behaviour
- Severity (guess): medium — `^` refuses or rejects what `pow` computes
- Location: the `^` node against the `pow` built-in; issue #88
- Description: `2^1e-30000` is refused with about 99,659 bits "however it is computed" where `pow(2, 1e-30000)` is `≈ 1`, and `1^1e999999999` is rejected as typed where `pow(1, 1e999999999)` is `= 1`; open issue #88, reproduced.
- Units: V1 (L59, L99, L142, L167-168), V2 (L204-206, L300)
- Docs side: F-221, F-411
- Rewrite impact: none — #88's one link stays in `devdocs/numbers.md#Roots and powers` (§12 q26); the user pages state the current difference without a link.

### B-007. `log`'s exact cases miss rational exponents other than `n` and `1/n`

- Category: behaviour
- Severity (guess): medium — rational results shown uncertified or partly certified
- Location: `src/core/builtins/log.ts:17-24` (exact cases, `:21-24`)
- Description: the exact cases recognize only an integer exponent or its reciprocal ("a rational exponent in general is not looked for"), so `log(4, 8)` (`3/2`) and `log(256, 512)` (`9/8`) go to the kernel: uncertified in decimal mode at a tie (`log(256, 512)` at three digits), *partial* in exact mode (`log(256, 512)` at three digits `≈ 1.1 (2 of 3 digits are certain)`, `log(4, 8)` at one `≈ 2 (0 of 1 digits are certain)`); A4 documents it now and leaves to D5 whether to look for `x^q = b^p`; #173's decision would make these lines `=`.
- Units: A4 (L27, L84, L133, L135, L136)
- Docs side: F-042
- Rewrite impact: complicates — N18 and the pages say `log` reaches the uncertified fallback and the partial kind from shipped inputs, and no exact-case list may promise rational exponents.

### B-008. Decimal mode's reciprocal line inverts the shown ratio, not the exact one

- Category: behaviour
- Severity (guess): medium — last digits differ from the correctly rounded reciprocal
- Location: `src/outcome.ts:332` (the reciprocal line, `:330-335`)
- Description: with extended working digits the reciprocal is `1 / value` of the ratio already rounded to `p`, so `3 m` in `in` shows `0.0084666664` where the exact reciprocal rounds to `0.0084666667`; A4 (Q1) proposes keep and document, recording the alternative (`want / have` from the working-digit operands) on #92.
- Units: A4 (L28, L85, L132, L141)
- Docs side: F-038, F-043; V5 L28, V5 report and D4 L50 (context) confirm N19 without the exception
- Rewrite impact: complicates — `devdocs/numbers.md#The working digits` and N19 state the exception while the code stays.

### B-009. A refused reciprocal line is dropped silently and never retried (#92)

- Category: behaviour
- Severity (guess): medium — a line disappears with no words
- Location: `src/outcome.ts:323-337` (A8: `:323-336`); issue #92
- Description: the reciprocal is one `step` of `1 / value` at the user's context, pushed only when it succeeds: refused (`5e1000000000000000000 m` into `m`), it is left out with no message, and one a higher pass would certify is not retried; #92 is open (its decimal-mode row now answered by `step`).
- Units: A8 (L27, L52), V2 (L41, L278-280, L301)
- Docs side: F-412
- Rewrite impact: none — the page states both gaps, with #92's one link in `devdocs/architecture.md#The converter and its lines` ("The reciprocal").

### B-010. A typed list's unit straddling zero is refused, not retried

- Category: behaviour
- Severity (guess): medium — refused where the same unit as a single `want` is retried and answers
- Location: `src/core/pipeline.ts:394-404` (the comment at `:93-96`)
- Description: a typed list's unit whose ball straddles zero at a pass is `nonpositiveUnit`, which the retry loop never retries: `1 m` into `ft;(1e-30 + approx(1) - 1) m` is refused as not positive, while `1 m` into `(1e-30 + approx(1) - 1) m` answers; the code calls it an accepted gap; A8 (Q4): state it now, the retry could ride the #92 work.
- Units: A8 (L53, L149)
- Docs side: F-246
- Rewrite impact: none — `devdocs/architecture.md#Unit lists` states the accepted gap (A8's insertion) until a retry removes it.

### B-011. Passes cost about three times the last at the ceiling's edge

- Category: behaviour
- Severity (guess): low — cost, not answers
- Location: `src/core/context.ts:210-225` (`workingContexts`); `src/settings.ts:159-163` (the comment on `DEFAULT_BUDGET_MS`)
- Description: `workingContexts` keeps every doubled precision strictly below the ceiling and then adds the ceiling, so where the ceiling lies just above a doubled precision the last two passes are nearly one size (`11, 22, 44, 45` under a ceiling of 45; `… 2304, 2308` under a precision limit of 567) and the passes cost about three times the last, against the budget comment's "about twice its last pass"; A3 (Q1): reword now, and drop a doubled precision near the ceiling only as its own change after the revamp (it changes the stress catalogue's pass counts).
- Units: A3 (L67, L141, L148)
- Docs side: F-064
- Rewrite impact: none — `devdocs/numbers.md#Working precision and the schedule` names the edge (A3's and V1's edits); a code change would restore the plain "about twice".

### B-012. A stored ratio width out of range resets the mode; the count is clamped

- Category: behaviour
- Severity (guess): low — a settings-load edge; "Intended?"
- Location: `src/settings.ts:397-427` vs `:429-443`, `:553-558`
- Description: a stored ratio width outside 1 … 1,000 is not clamped but makes the whole mode fall back to its default, exact mode with digits, while a stored extended count outside its range is clamped; D4 (Q6): state it in `devdocs/settings.md#Storage` (V5) or clamp the width like the count, the owner's call.
- Units: D4 (L32, L71, L408, L414)
- Docs side: —
- Rewrite impact: complicates — `devdocs/settings.md#Storage` states the asymmetry unless the width is clamped first.

### B-013. `2^-30000`'s refusal says about 69,659 bits; the pages say 69,658

- Category: behaviour
- Severity (guess): low — a one-bit gap, probably by design
- Location: the size prediction in `src/core/rational.ts`
- Description: the refusal reads "would need a significand of about 69,659 bits" where `5^30000` has 69,658 bits (N21, `devdocs/numbers.md`, `docs/settings.md:132`; harness also `3^-100000`, about 158,497 bits); D4 asks, hedged, whether the prediction overshoots by one; A5 (L274) records 69,659 as the refusal's bound (citing `src/messages.test.ts:274`), and V1 (L171) as the prediction `#The significand limit` states.
- Units: D4 (L51, L109, L127, L404, L414)
- Docs side: — (A5 report and A1 report, context, give the bound)
- Rewrite impact: none — the pages keep the true size and say "about".

### B-014. The dalton is the CODATA 2018 value

- Category: behaviour
- Severity (guess): low — a measured constant's edition; the owner's call
- Location: `src/units.txt:267`
- Description: CODATA has since published a 2022 adjustment; D3 (Q2): whether and when the file follows one is the owner's call, recorded in the file's comment.
- Units: D3 (L341)
- Docs side: F-116, F-069
- Rewrite impact: none — `units.md` names the edition the file carries ("CODATA 2018").

## Message wording

### B-015. The incomplete gamma refusal blames the significand limit for a cost limit (#107)

- Category: message wording
- Severity (guess): medium — the message names the wrong limit
- Location: the incomplete gamma functions' refusal (issue #107); the message `src/messages.ts:357-360` (D7 (F-159))
- Description: a large order within a few percent of a large argument, past some millions, is refused "would need a significand, past the significand limit, however it is computed" (`uppergammareg(1e6, 1.5e6)`; `lowergammareg(1e8, 1e8)` with no bit count), though the limit there is one of cost; the page says so itself and keeps the sentence with #107, the expansions that regime wants.
- Units: V3 (L28, L72, L592-620)
- Docs side: F-159
- Rewrite impact: none — `devdocs/builtins.md#The Gamma and Beta families` keeps the sentence with #107 inline.

### B-016. `round`'s second-argument errors are worded for a function of integers

- Category: message wording
- Severity (guess): medium — says `round` is "defined only for whole numbers"
- Location: `src/messages.ts:241-244`; `src/core/builtins/round.ts:356`
- Description: `round(2.5, 1.5)` reads `Cannot compute "round(2.5, 1.5)": "1.5" is not a whole number, and "round" is defined only for whole numbers.` and `round(2.5, approx(2))` `"round" needs a whole number known exactly`, because `round.ts:356` reuses `integerOf` for the places; D6 (Q3): word `notInteger` and `notExact` by the argument's place ("the number of places of `round` must be a whole number"), in the catalogue work of §12 q6.
- Units: D6 (L75, L232)
- Docs side: —
- Rewrite impact: none — the generated catalogue (§12 q6) carries the code's text; no page quotes it.

### B-017. The probe's sheet line says it times "the costliest operations"

- Category: message wording
- Severity (guess): medium — wording §12 q23 rules out for the docs
- Location: `src/settings-lines.ts:188` (`PROBE_LINE`)
- Description: "Times the costliest operations" misstates what the probe times (§12 q23: "the costliest built-ins" is incorrect for the elementary composite); D4 (Q1): "Times the costliest exact product and the costliest elementary functions at rising sizes and proposes …", landed with A2's note-wording change.
- Units: D4 (L135, L398, L403)
- Docs side: F-128, F-491
- Rewrite impact: complicates — the pages describe the probe per §12 q23 and do not quote the sheet's line until it changes.

### B-018. `bitsNeeded` prints a count past `2^53` with floating-point noise

- Category: message wording
- Severity (guess): medium — spurious digits in a refusal
- Location: `src/messages.ts:372-381` (`bitsNeeded`)
- Description: `2.54^1e18` is refused with "about 7,988,684,686,773,075,000 bits"; A5 (Q3): round such a count to two significant digits above `2^53`, in the code phase.
- Units: A5 (L300, L476-479)
- Docs side: —
- Rewrite impact: none.

### B-019. Parse messages call a function's name "a unit name"

- Category: message wording
- Severity (guess): medium — the label misnames a function in a call
- Location: `src/core/expr.ts:342-346` (labels at `:335`, `:348`, `:420`)
- Description: every name is labelled "a unit name", a function's in a call included, by design so that a call and a name are not listed apart (`:342-349`); the docs say "name"; D1 (Q5): rename the label to "a name" in a change of its own, the order of the labels staying.
- Units: D1 (L213, L682, L692)
- Docs side: F-474
- Rewrite impact: none — the pages say "name"; the generated catalogue follows the code.

### B-020. Size refusals without a count carry a stray comma

- Category: message wording
- Severity (guess): low — punctuation; the refusal itself is right
- Location: `src/messages.ts:357-360` (D7), `:349-381` (A5)
- Description: an `unknown` need reads "would need a significand, past the significand limit, however it is computed" (`floor(10^30000/3)`, `uppergammareg(1e6, 1.5e6)`, `lowergammareg(1e8, 1e8)`), the comma left behind when `bitsNeeded` is empty, and a `fits` refusal with no count "would need a significand as an exact value, past the significand limit" (`pow(1 + 1e-19000, 1e19000)`); D7 (Q3): "would need a significand past the significand limit, however it is computed"; A5 (Q2): "would need a significand past the significand limit" in both forms (§12 q6 message work).
- Units: A5 (L154-155, L170-171, L470-475), D7 (L42, L249)
- Docs side: —
- Rewrite impact: none — a page quoting a size refusal avoids the no-count forms until they change.

### B-021. The edge message ends "which side of it it lies"

- Category: message wording
- Severity (guess): low — awkward, not wrong
- Location: `src/messages.ts:94`
- Description: a `pole` or `bound` edge reads "… and the result depends on which side of it it lies" (`tan(90 deg)`); A6 (Q3): name the edge once more ("which side of the pole", "which side of the bound"), recorded as a code change as the "certain" wording was.
- Units: A6 (L253, L422-426)
- Docs side: —
- Rewrite impact: none.

### B-022. The empty-state hint leads with conversion

- Category: message wording
- Severity (guess): low — framing against §12 q2, not an error
- Location: `src/unit-converter.ts:255-258` (also cited as `:254-258`)
- Description: "Type a quantity, such as `3 ft`, and the unit to convert it to, such as `in` or `ft;in`" puts conversion first where §12 q2 has the calculator lead; D9 (Q1): "Type an expression, such as `sqrt(2)` or `3 ft`, and, to convert it, the unit you want, such as `in` or `ft;in`."
- Units: D9 (L68, L315)
- Docs side: F-179
- Rewrite impact: complicates — `docs/app.md#The two fields` quotes the hint only once its wording is settled.

### B-023. The load-failure message shows the kind name "(fetchFailed)"

- Category: message wording
- Severity (guess): low — an internal name in user text, kept on purpose
- Location: `src/app-shell.ts:264`
- Description: "The unit definitions could not be loaded (fetchFailed)." puts an internal kind name in user text; D9 (Q3): keep it, since a bug report needs it; the alternative, the kind on the console alone, is a code change.
- Units: D9 (L69, L317)
- Docs side: F-169
- Rewrite impact: complicates — `docs/app.md` describes the message without quoting the parenthesis (§12 q6).

### B-024. The note for one digit asked reads "0 of 1 digits"

- Category: message wording
- Severity (guess): low — a rare plural slip
- Location: `src/outcome.ts:507` (`noteOf`)
- Description: at one display digit a value with no digit certified shows `≈ 1 (0 of 1 digits are certain)` (`sqrt(2)^2 * 0.75`; also `log(4, 8)` in exact mode, A4 Q4); A2 (Q3): leave it, the case being a one-digit tie at one display digit.
- Units: A2 (L27, L146)
- Docs side: —
- Rewrite impact: none.

### B-025. The decimal-mode sheet line says "exact in that arithmetic"

- Category: message wording
- Severity (guess): low — a term the docs replace
- Location: `src/settings-lines.ts:263` (`MODE_LINES.decimal`)
- Description: A4's canonical term is "exact under the mode's rounding".
- Units: A4 (L127)
- Docs side: F-435
- Rewrite impact: none.

### B-026. The probe's proposal line calls the ceiling "a grid of 4,040 digits"

- Category: message wording
- Severity (guess): low — the ceiling is a pass's precision; its grid is 4,050 digits
- Location: `src/settings-lines.ts:243` (`:243-249`)
- Description: "the built-ins on a grid of 4,040 digits" names the ceiling as a grid, while the ceiling pass settles onto `digitsFor(bitsFor(4040))`, 4,050 digits; A3 (Q5): a wording change for later.
- Units: A3 (L68-69, L145)
- Docs side: F-125
- Rewrite impact: none — the user pages keep "grid" out (A3's fix).

### B-027. The zero-divisor exponent error quotes the trailing blanks

- Category: message wording
- Severity (guess): low — cosmetic
- Location: `src/core/expr.ts:450-463` (`src/core/expr.test.ts:357-360`)
- Description: the rejection's span runs over the blanks after the divisor: `m^(1/0 )` gives `"1/0 ": the exponent divides by zero.`
- Units: D1 (L212)
- Docs side: —
- Rewrite impact: none.

### B-028. A refused literal is quoted in full in its message

- Category: message wording
- Severity (guess): low — only a pathological input gives a huge message
- Location: `src/messages.ts:78`, `:98-105`
- Description: a literal of thousands of digits yields a message about as long; D1: eliding the middle of a long quoted span is a code change for the unit that owns messages (C51).
- Units: D1 (L215)
- Docs side: —
- Rewrite impact: none.

### B-029. No message is worded for a definitions rejection (#132)

- Category: message wording
- Severity (guess): low — unreachable by users while only the system file loads
- Location: `src/messages.ts` (`:64-151`, `:316-328`, `:452-512`); `nonconformingComparison` at `src/core/build.ts:742-749`; `parameterNamesUnit`
- Description: only `TextError` and `ConversionError` are worded; nothing words a `DefinitionRejection`, `BuildError` is consumed only by `src/system-build.ts` and `src/system-table.ts`, and `nonconformingComparison` "carries both terms' spans and the mismatch, and nothing words it"; not called a defect: definitions cannot be typed today and the wording is deferred with #132.
- Units: D2 (L38, L42, L43, L73), V4 (L39, L42, L43, L165-167, L179-194, L506-508)
- Docs side: F-306, F-306, F-098
- Rewrite impact: complicates — the pages name the causes of definitions rejections, not messages, and drop the quoted "wording meant" in `devdocs/functions.md#Annotations`.

## Test gap

### B-030. No test asserts the partial note's text

- Category: test gap
- Severity (guess): low — the note's wording is unpinned
- Location: `src/outcome.test.ts`, `src/core/display.test.ts`
- Description: `display.test.ts` checks the kind and `outcome.test.ts` the zero and uncertified notes; A2 proposes a test in `src/outcome.test.ts`: `sqrt(2)^2 * 1.000000025` with a blank want gives `sqrt(2)^2 × 1.000000025 ≈ 2 (7 of 8 digits are certified)`, `approx(1)` under `floor` gives `approx(1) ≈ 1 (0 of 8 digits are certified)`, under the default mode `approx(1) ≈ 1`.
- Units: A2 (L71, L127)
- Docs side: —
- Rewrite impact: none.

### B-031. `exact.test.ts` covers less than its description suggests

- Category: test gap
- Severity (guess): low — defects the harness found pass the suite
- Location: `src/core/builtins/exact.test.ts` (`:129-139`, `:70`)
- Description: thinner than "a checklist of exact behaviour in every mode" (the plan's description) suggests: two functions in every rounding mode, three in decimal mode; D6's scratch harness found the `gcd(a, 0)` defect, the reach of `mod`'s refusal and the `ceiling` slip, none of which the suite catches; tests proposed only for `gcd` (Q1).
- Units: D6 (L73, L242)
- Docs side: —
- Rewrite impact: none.

### B-032. A failing definitions build is reported by offsets, not by line

- Category: test gap
- Severity (guess): low — developer-facing
- Location: `src/units.test.ts:72-78`
- Description: when `src/units.txt` fails to build, the test reports the build error with character offsets, not the line; D3 (Q6): have the failure name the line, outside the unit.
- Units: D3 (L53, L345)
- Docs side: F-398
- Rewrite impact: complicates — `#Adding a unit` describes the failure as the test reports it today until it names the line.

### B-033. Issue #89 is open though the code does what it asks

- Category: test gap
- Severity (guess): low — issue housekeeping; its tests unchecked
- Location: `src/core/rational.ts:410-437`; `src/core/rational.test.ts`; issue #89
- Description: `pow`'s prediction is `floor(|n| log2 p) + 1`, as the issue's "Done when" asks, and every row it lists agrees today; V1 did not check the tests the issue asks for; V1 (Q1): close #89 once they are checked.
- Units: V1 (L99, L143, L360)
- Docs side: F-199
- Rewrite impact: none — the page's #89 clause and link go either way.

## Misleading comment

### B-034. Code comments carry history the style guide forbids

- Category: misleading comment
- Severity (guess): low — comments only
- Location: `src/core/ball.ts:52-53`, `:83-86`, `:708-709`, `:986-995` (`:988-989`, `:995`); `src/core/scaled.ts:34-36`, `:591-593`, `:1058-1062`; `src/core/rational.ts:27-28`; `src/core/fixed.ts:28-33`; `src/core/constants.ts:26-29`, `:65-66`; `src/core/bernoulli-ratios.ts:5-9`; `src/core/builtins/pow.ts:17-20`; `src/core/builtins/exp.ts:19-20`; `src/core/builtins/inverse-trig.ts:72`; `src/core/builtins/incomplete.ts:41-43`; `src/core/build.ts:50-53`; `src/core/dimension-of.ts:3-4`; `src/core/convert.ts:45-48`
- Description: "an earlier version …" (`ball.ts`, `scaled.ts`, `rational.ts`, `pow.ts`, `exp.ts`, `incomplete.ts`, `convert.ts`), "since 3.7; before it fixed.ts took integer square roots", "a margin of 64 had them recomputed", "`10^300000` took a minute", "The exact numbers once served the series", "`acos(1e-9860)` was refused at the default", "where the first version of the check … refused it"; the units propose one commit, beside V8's edit to `devdocs/development.md#Style guide`, that drops each or rewrites it as the present rule it motivates.
- Units: A5 (L463-469), V1 (L366), D5 (L35, L199), V3 (L759), D2 (L33, L464), V4 (L562), A8 (L150)
- Docs side: F-317, F-317, F-266, F-185, F-197
- Rewrite impact: none.

### B-035. `quantity.ts`'s header puts the significand limit's refusal in the evaluator

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/quantity.ts:17-20`
- Description: it says an exact result past the significand limit is refused by the evaluator at the node, "not here", while `multiplyBalls` and `divideBalls` form the product within the context's limit (`src/core/ball.ts:644-648`, `821-831`), the evaluator only asserts afterwards (`src/core/evaluate.ts:409-421`) and `src/core/pipeline.ts:884-889` states the strict limit's invariant; A7 (Q1): one comment change after the audit, in the direction of `src/core/evaluate.ts:7-11`'s note (module headers restating less of the architecture page).
- Units: A7 (L319-331), V2 (L308)
- Docs side: —
- Rewrite impact: none.

### B-036. `pipeline.ts`'s header says `2 tempC` is an unknown unit

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/pipeline.ts:15-17` (A8: `:16-17`)
- Description: the code answers `functionAsUnit` (`src/core/table.ts:184-192`): `"tempC" is a function, not a unit. To apply it to a value, write "tempC(value)".`
- Units: D1 (L145, L214, L700), A8 (L150)
- Docs side: F-310 (the same rule for a function's name in a unit list)
- Rewrite impact: none.

### B-037. `pipeline.ts:95` says the component computes the reciprocal line

- Category: misleading comment
- Severity (guess): low — names the wrong module
- Location: `src/core/pipeline.ts:95`
- Description: "the reciprocal line the component computes": the reciprocal is computed in `src/outcome.ts` ("the outcome"; "the converter" is the two-field component).
- Units: A8 (L142, L150)
- Docs side: F-255
- Rewrite impact: none.

### B-038. `convert.ts` says the ratio is never `tooLarge`

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/convert.ts:132-138`
- Description: the ratio can be refused at the significand limit (`src/core/convert.ts:190-193`; `src/core/ball.ts:829-835`; `3^30000 m` into `5^20000 m`).
- Units: A8 (L51, L150)
- Docs side: F-070
- Rewrite impact: none.

### B-039. Comments say the unit lookup settles a unit in the user's mode

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/pipeline.ts:77-79`, `src/core/context.ts:230-234`, `src/core/context.test.ts:140-142`
- Description: the lookup hands a unit out as built and the `unit` node steps it (`src/core/table.ts:194-198`, `src/core/evaluate.ts:525-535`); A3 (Q8): one small comment commit after the audit.
- Units: A3 (L148)
- Docs side: —
- Rewrite impact: none.

### B-040. `pipeline.ts:85-87` omits two of the retried errors

- Category: misleading comment
- Severity (guess): low — incomplete list
- Location: `src/core/pipeline.ts:85-87`
- Description: the comment lists the retried errors without `undecidedCondition` and `unresolvedBound`, both of which `resolve` retries (`src/core/pipeline.ts:377-404`).
- Units: A3 (L58, L148)
- Docs side: —
- Rewrite impact: none.

### B-041. Comments say "four times the precision limit plus the guard"

- Category: misleading comment
- Severity (guess): low — reads as the wrong formula
- Location: `src/core/pipeline.ts:296-297`, `src/core/context.ts:51`, `src/core/context.ts:207`, `src/core/context.test.ts:176` (a test name)
- Description: the phrase reads as `4L + 10` where `ceilingFor` is `4 × (L + 10)` (`src/core/context.ts:188-190`), the pages' misreading; A3's wording: "four times the sum of the precision limit and ten".
- Units: A3 (L66, L148)
- Docs side: F-022, F-022
- Rewrite impact: none.

### B-042. `orderOf` and `disjoint` comments describe a refusal that cannot arise

- Category: misleading comment
- Severity (guess): low — repeats a corrected phrase
- Location: `src/core/ball.ts:409-416` (`orderOf`), `src/core/pipeline.ts:871-875` (`disjoint`)
- Description: both repeat "a difference refused as too large to form", the phrase A6 corrects on the page; A6 (Q4): align them when the page is fixed.
- Units: A6 (L133-143, L427-430)
- Docs side: F-028
- Rewrite impact: none.

### B-043. `approx.ts`'s header says only an exact zero passes through

- Category: misleading comment
- Severity (guess): low — understates the code
- Location: `src/core/builtins/approx.ts` (header comment)
- Description: `widened` returns any zero midpoint, exact or not (`src/core/ball.ts:1158-1163`; `approx(sqrt(2) - sqrt(2))` keeps its radius), as `devdocs/numbers.md#approx` says; D6 (Q9): the comment follows the page when the structured comments are written (§4).
- Units: D6 (L35, L238)
- Docs side: F-046
- Rewrite impact: none.

### B-044. `Shown`'s comment gives one cause of no digit certified; there are more

- Category: misleading comment
- Severity (guess): low — contradicts what the display shows
- Location: `src/core/display.ts:190-192`
- Description: it says `certified` is zero only for a value on a rounding tie at the digits asked; zero comes from a value no count down to one digit certifies: a one-digit tie in a nearest mode (`sqrt(2)^2 * 0.75` at one digit), a ball straddling a grid point under a directed mode (`approx(1)` and `cosh(1e-999999999)` under `floor`; D5 adds `exp(1e-999999999)` and `cos(1e-999999999 radian)`, each shown with the partial note at zero), or a ball too wide for one digit; A2 proposes the comment's new text.
- Units: A2 (L60, L126), D5 (L58, L123-124, L195)
- Docs side: F-023, F-023
- Rewrite impact: none.

### B-045. `gamma.ts` says the factorial's refusal names a remedy; it names none

- Category: misleading comment
- Severity (guess): low — contradicts the message
- Location: `src/core/builtins/gamma.ts:46-47`; the refusal on `exceeds` (`src/messages.ts:349-360`)
- Description: "the remedy the factorial's refusal names": `factorial(20000)`'s refusal names no remedy, though `gamma(x + 1)` is the way; D7 (Q4): fix the comment with the page; a refusal that names `gamma` would be the message-side alternative (D6 told, D7 Q6).
- Units: D7 (L55, L250, L252)
- Docs side: F-292
- Rewrite impact: none.

### B-046. `beta.ts` uses an exact case as its logarithm example

- Category: misleading comment
- Severity (guess): low — wrong example
- Location: `src/core/builtins/beta.ts:26`
- Description: `beta(1e15, 1)` takes the exact case, not the logarithms.
- Units: D7 (L59, L250)
- Docs side: F-293, F-293
- Rewrite impact: none.

### B-047. `dimension-of.ts` keeps an example that does not fail

- Category: misleading comment
- Severity (guess): low — wrong example
- Location: `src/core/dimension-of.ts:26-28`
- Description: it carries the page's example of a body of `1e30000` that builds and fails at the call; the call succeeds (`big(1) = 1e+30000`).
- Units: V4 (L47, L562)
- Docs side: F-318
- Rewrite impact: none.

### B-048. `builtin.ts:167` says every built-in of the stage takes a fixed count

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/builtin.ts:167`
- Description: `round` takes one or two arguments.
- Units: V3 (L759)
- Docs side: F-082
- Rewrite impact: none.

### B-049. `fixed-gamma.ts:17` says a series ends below an ulp

- Category: misleading comment
- Severity (guess): low — contradicts the code
- Location: `src/core/fixed-gamma.ts:17`
- Description: it says a series ends when a term "falls below an ulp", against `TERM_FLOOR` of eight at `:88-89`.
- Units: V3 (L759)
- Docs side: —
- Rewrite impact: none.

### B-050. `gamma.ts:44` uses the significand limit's former name

- Category: misleading comment
- Severity (guess): low — stale term
- Location: `src/core/builtins/gamma.ts:44`
- Description: "Most bits", where §8's term is the significand limit.
- Units: V3 (L759)
- Docs side: —
- Rewrite impact: none.

### B-051. `hyperbolic.ts` says "wider than one half" where it tests a radius

- Category: misleading comment
- Severity (guess): low — imprecise
- Location: `src/core/builtins/hyperbolic.ts:63`, `:219`
- Description: the test at `:218` is a radius of one half.
- Units: V3 (L759)
- Docs side: F-263
- Rewrite impact: none.

### B-052. `parser.ts` misquotes the `3 m ^` error

- Category: misleading comment
- Severity (guess): low — stale quote
- Location: `src/core/parser.ts:18-20`
- Description: the error reads "expected a number or "("" (`src/core/expr.test.ts:524`), not "expected a number".
- Units: D1 (L211)
- Docs side: —
- Rewrite impact: none.

### B-053. Service-worker comments put the update check in the settings

- Category: misleading comment
- Severity (guess): low — stale
- Location: `src/register-service-worker.ts:26`, `src/service-worker-updates.ts:255`
- Description: both say the user's check is made "from the settings"; it is the footer's build ID (`src/app-footer.ts:26-27`, `:142-146`); fix: "from the footer".
- Units: D9 (L82, L316, L325), V8 (L116, L312)
- Docs side: —
- Rewrite impact: none.

### B-054. `scripts/cloud-env` points at README sections that no longer exist

- Category: misleading comment
- Severity (guess): low — dead pointers and a stale claim
- Location: `scripts/cloud-env:8-9`, `:26-27`
- Description: the "README.md" sections "Cloud environment" and "Deployment" are gone (`README.md` has only its title heading), where `scripts/cloud-setup.sh:12` and `.claude/hooks/session-start.sh:4` already point at `devdocs/development.md`; `:26-27` also repeats the stale sentence that a deploy is made from a developer's machine (S8); fix: point at `devdocs/development.md` ("Cloud environment") and `devdocs/deployment.md`.
- Units: V8 (L83, L116, L312)
- Docs side: F-408
- Rewrite impact: none.

### B-055. `settings-lines.ts:258` speaks of a Mode select

- Category: misleading comment
- Severity (guess): low — stale
- Location: `src/settings-lines.ts:258`
- Description: "The line each mode has under the Mode select": the mode is two radios (`src/settings-panel.ts:746-768`); D4 (Q4): "under the Mode radios", with the A2 batch.
- Units: D4 (L406)
- Docs side: —
- Rewrite impact: none.

### B-056. `system-build.ts` and `system-table.ts` cite the shell section for the ceiling table

- Category: misleading comment
- Severity (guess): low — points at the wrong section
- Location: `src/system-build.ts:2`; `src/system-table.ts:10`
- Description: they cite `devdocs/architecture.md` "The shell and its parts" as the design of the table at the ceiling, which `devdocs/numbers.md#Working precision and the schedule` states in full; A9 (Q7): V2 confirms the shell section carries it, or the comments point at `numbers.md`.
- Units: A9 (L331-337)
- Docs side: F-249
- Rewrite impact: complicates — the pointer depends on what `devdocs/architecture.md#The shell and its parts` keeps after V2's rewrite.

### B-057. Comments call the kind primitives "dimensionless"

- Category: misleading comment
- Severity (guess): low — against §12 q20
- Location: `src/core/dimension.ts:13`, `:70`; `src/core/definitions.ts:11`, `:123`
- Description: "dimensionless markers" and "kind primitive (dimensionless)" (the `definitions.ts:11` example block is the one in `docs/definitions.md:66`), where §8 and §12 q20 never call a kind dimensionless.
- Units: A7 (L295-301, L327-331), V2 (L286), D2 (L449)
- Docs side: F-459, F-093, F-459
- Rewrite impact: none.

### B-058. `dimension.ts:191` writes the volt in the test table's order

- Category: misleading comment
- Severity (guess): low — differs from the file and the page
- Location: `src/core/dimension.ts:191`; `src/core/dimension.test.ts:345-347`, `:44`
- Description: `kg m^2 / s^3 A` is the order of the test table, which declares `kg` first; `src/units.txt`'s order, which the page follows, gives `m^2 kg / s^3 A` (probe: `V = 1 m^2 kg / s^3 A`).
- Units: A7 (L73, L154-157, L325-326)
- Docs side: —
- Rewrite impact: none.

### B-059. The file and the test call temperature differences "intervals"

- Category: misleading comment
- Severity (guess): low — against §12 q19
- Location: `src/units.txt:185-188` (D3: `:185`); `src/units.test.ts:289`, `:463-465`
- Description: a comment, a test name and test comments say "intervals" where §12 q19 decides "temperature difference"; D2 (Q5) records it with A2's note-wording change.
- Units: A9 (L277-281), D2 (L456, L465), D3 (L92, L329, L345)
- Docs side: F-483, F-483
- Rewrite impact: none.

### B-060. `units.test.ts` calls the primitives the SI base units

- Category: misleading comment
- Severity (guess): low — the assertion includes `bit`
- Location: `src/units.test.ts:2-3`, `:186`
- Description: the header and a test's name say the primitives are the SI base units, though the assertion includes `bit`; D3 (Q6): fix with the next change to the test.
- Units: D3 (L30, L92, L345)
- Docs side: —
- Rewrite impact: none.

### B-061. `src/units.txt:1` says "the system unit definitions"

- Category: misleading comment
- Severity (guess): low — term
- Location: `src/units.txt:1`
- Description: §8's term is "the definitions file".
- Units: D3 (L92, L335)
- Docs side: F-475
- Rewrite impact: none.

### B-062. `gravity` lacks the "(exact)" mark the defining constants carry

- Category: misleading comment
- Severity (guess): low — reads as a measured value
- Location: `src/units.txt:118` (`:112-118`)
- Description: left unmarked where the five SI defining constants say `(exact)`; it is exact by convention; A9 (Q8): "(exact by convention)", a change for D3's catalogue, which D3's report does not take up.
- Units: A9 (L106-110, L338-340)
- Docs side: F-069
- Rewrite impact: none.

### B-063. The tropical and sidereal years have no source comment

- Category: misleading comment
- Severity (guess): low — a missing source
- Location: `src/units.txt:344-345`
- Description: epoch-dependent values with no source; D3 (Q3): a source and an epoch in the comment.
- Units: D3 (L84, L342)
- Docs side: F-069
- Rewrite impact: none.

### B-064. `bit`'s comment does not say why information is a dimension

- Category: misleading comment
- Severity (guess): low — a missing reason
- Location: `src/units.txt:25`
- Description: it says only "information"; D3 (Q4): the reason in the file's comment (a count of bits must not collapse into a plain number, so that `bit/s` stays apart from `Hz` as `rad/s` does).
- Units: D3 (L83, L343)
- Docs side: —
- Rewrite impact: none.

### B-065. The file's header does not name the documents the page cites

- Category: misleading comment
- Severity (guess): low — missing sources
- Location: `src/units.txt` (header)
- Description: the page cites the SI brochure (9th edition), NIST Handbook 44 and the Weights and Measures Act 1985, which the file never cites; D3 (Q1): the header gains the three names beside its rule on comments.
- Units: D3 (L340)
- Docs side: F-116, F-116
- Rewrite impact: none.

### B-066. A benchmark comment keeps an unrepeatable figure

- Category: misleading comment
- Severity (guess): low — a measurement in a comment
- Location: `bench/names.bench.ts:24-26`
- Description: "grew some thirtyfold over this range", against the page's "fifty times"; V7 (Q2): the comment should lose its figure too.
- Units: V7 (L34, L133, L323)
- Docs side: F-384
- Rewrite impact: none.

### B-067. Module headers restate the architecture page (TODO in `evaluate.ts`)

- Category: misleading comment
- Severity (guess): low — duplication that drifts
- Location: `src/core/evaluate.ts` header (the TODO; `:7-11`)
- Description: the TODO notes that the module headers restate `devdocs/architecture.md`; V2: a later comment pass could resolve it as §12 q24 does for the docs; A7 points the `quantity.ts` fix the same way.
- Units: V2 (L308)
- Docs side: V2 L308
- Rewrite impact: none.

## Decided code change

### B-068. "certain" becomes "certified" in the notes, the sheet and comments

- Category: decided code change
- Severity (guess): medium — user-visible wording the pages will quote as "certified"
- Location: `src/outcome.ts:507` (`noteOf`, the notes at `:504-517`); `src/settings-lines.ts:261` (`MODE_LINES.exact`); comments `src/outcome.ts:25`, `126`, `503`, `src/core/display.ts:2`, `17`, `190`, `src/core/display.test.ts:239`, `src/outcome.test.ts:273`, `411`
- Description: §12 q8, recorded for A2: the note "8 of 12 digits are certain" becomes "… are certified", the sheet's "Every digit shown is certain" becomes "… certified" (D4 Q1: "Every digit shown is certified, found at rising precision; …"), and the comments follow; A2 drafted the old→new text and did not apply it; V1 also lists a "no digit certain" note, which A4 (L86) says no code writes (`noteOf` writes "N of M digits are certain", "within B of zero", "the digits are not certified", "a step could not be certified at the precision limit").
- Units: A2 (L71, L120-128, L140, L147), A4 (L123), A8 (L57, L138), D4 (L135, L393, L403), D5 (L58, L183), D8 (L32, L37, L42, L118, L152, L313), V1 (L76, L298, L344), V2 (L260, L288), V5 (L225)
- Docs side: F-427, F-021, F-021, F-214, F-427, F-021, F-427, A2 L128, A2 L148
- Rewrite impact: blocks — the drafted pages quote the notes and the sheet's line as "certified" (D8 Q7: land it before `numbers.md` is assembled); until it lands a quote does not match the app.

### B-069. The sheet's "About these settings" becomes a local link (§12 q31)

- Category: decided code change
- Severity (guess): low — not a defect today
- Location: `src/settings-lines.ts:114-117` (`ABOUT`; the URL at `:116`), used at `src/settings-panel.ts:520-525`
- Description: the only absolute URL in `src/`, a link to the docs on GitHub; it becomes a local link once the pages ship with the app (§12 q31, decided in principle); the §9.4 row on #191 is D4's or V5's.
- Units: D9 (L70, L321), V8 (L88, L317)
- Docs side: F-177, F-342
- Rewrite impact: none — `devdocs/security.md#The page` keeps its sentence on the one absolute URL until the link changes.

### B-070. The stress tool's hangs table emits bare issue numbers (§12 q26)

- Category: decided code change
- Severity (guess): low — generated devdocs text
- Location: `bench/stress/catalogue.ts:561` (`hangsTable`)
- Description: the generated Issue column holds bare numbers where §12 q26 wants inline links at the owning place; V6 (Q3): a one-line change once `devdocs/cost.md` owns those issues.
- Units: V6 (L46, L225)
- Docs side: F-360
- Rewrite impact: complicates — `devdocs/cost.md`'s hangs table keeps bare numbers until the generator emits links.
