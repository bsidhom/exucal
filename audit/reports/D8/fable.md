# Unit D8: Existing foundation-level content in docs/ to dissolve (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session's `session_context.model` and its `last_served_model` agree)
- Doc sections read: `docs/functions.md#Very large results and approx` (lines 130-253) and the paragraph of `#(top)` that points forward to it (lines 118-127); `docs/settings.md#How a number is held, and what the settings touch` (lines 207-271) and `#(top)` in full, to locate the two tail paragraphs (lines 192-197 and 199-205) and the one bullet that points into the section (lines 109-110); `docs/definitions.md#Functions` (lines 206-329), for its last paragraph (lines 309-329)
- Modules read: none assigned (the entry says "none new; cross-check against A2/A5 findings")
- Also read: `audit/reports/A2/fable.md` and `audit/reports/A5/fable.md` in full, as the cross-check; `src/core/evaluate.ts:886-922` (`applyFunction`, `bindParameters`) and a search of that module for a memo, for the sentence "A call is not remembered"; for the scratch runs only, the signatures of `evaluateText`, `convertText`, `schedule` and `PassEvent` (`src/core/pipeline.ts:173-262`, `:296-333`, `:420-475`), `buildTable` (`src/core/build.ts:283-300`), `parseDefinitions` (`src/core/definitions.ts:225-240`), `show` and `Shown` (`src/core/display.ts:164-250`), the exports of `src/core/context.ts` with `ceilingContext` (`:230-250`), `describeTextError` and `describeConversionError` (`src/messages.ts:55-75`, `:445-462`), `DEFAULT_SETTINGS` and `contextOf` (`src/settings.ts:160-200`, `:810-835`), `buildSystemTable` (`src/system-build.ts:30-95`), `src/core/builtins/approx.test.ts:1-40` and `:100-155` as the pattern for a table with user definitions, and `src/messages.test.ts:104-107` for the primitives a message needs; a search of `docs/`, `devdocs/` and `README.md` for references to the two headings (none beyond the headings themselves). The examples of the three sections were run through `evaluateText` and `convertText` on the system table (`src/units.txt`) with four user definitions appended, at the defaults (eight digits, half even, 65,536 bits, a precision limit of 1,000) and where a passage says otherwise at 32 or 999 digits or in decimal mode, from three scratch scripts outside the tree, not committed.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 0 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 13 / 1 / 2 |
| Gaps confirmed / refuted / new | 9 / 0 / 2 |
| Proposed edits | 16 |
| Questions for the owner | 9 |

## Claims

None assigned. The passages rest on N1-N3, N5, N8-N12 and N21-N25 of `audit/plan/01-core-abstractions.md`, which A1 to A5 verify; the statement-by-statement cross-check of the passages against A2, A5 and the pipeline is Findings 2.

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/functions.md:249-253` (`#Very large results and approx`; A5's row, `audit/reports/A5/fable.md:71`) | "Keep the arguments exact there: the difference `approx(1e999) - approx(1e999 - 5)` is `5` within about `2e948` at the first pass, and `exp` refuses it for the size that radius allows, although by the sixth pass it would be `5` within `2e-354` (issue #40)." | drop, confirmed | delete. Rerun: `approx(1e999) - approx(1e999 - 5)` is `≈ 5` at the defaults, and `exp` of it is `≈ 148.41316` after seven passes; the issue is closed (A5), and §12, question 26 deletes every reference to a resolved issue. |
| `docs/functions.md:173` (A5's edit, `audit/reports/A5/fable.md:431-449`) | "even where The significand limit refuses it first" | update, confirmed | "even where the significand limit refuses it first"; moot once the section is dissolved, the sentence being rewritten below. |
| `docs/settings.md:194` (`#(top)`, the first tail paragraph; A2's row, `audit/reports/A2/fable.md:54`) | "how many of them are certain ("8 of 12 digits are certain")" | update, confirmed | "how many of them are certified ("8 of 12 digits are certified")", with the code change of §12, question 8; the sentence moves to `docs/numbers.md` (Proposed edits). |
| `docs/functions.md:126-127` (`#(top)`) | "where `exp(1e6)` is `≈ 3.0332154e+434294`; the next section says why `approx` does not change that." | update | "where `exp(1e6)` is `≈ 3.0332154e+434294`; `approx` does not change that, since it says how well a value is known and not how large it is ([Values too big to hold](numbers.md#values-too-big-to-hold))." The forward pointer is the one place in the corpus that depends on the section (A5, `audit/reports/A5/fable.md:368-375`). |
| `docs/functions.md:198`, `:239` | "with a precision limit of 1,000 and a significand limit of 32,768 bits"; "its 1,354-digit midpoint fits a significand limit of 32,768 bits" | update | the default significand limit is 65,536 bits (`src/core/context.ts:170`; A5, `audit/reports/A5/fable.md:57`); the scenario is true of the limit it names but reads as the default. Where the passes land, in `devdocs/numbers.md` (V1), name the default or say the midpoint fits any limit the app allows. |
| `docs/functions.md:228-231` | "At every pass `exp` measures its argument over the whole ball and finds that the result's exponent passes the bound for every value in it, so it refuses, and the refusal is the answer." | update | "At the first pass `exp` finds that the result's exponent passes the bound for every value within the argument's error radius, refuses, and the retry loop ends there." Rerun with a pass observer: `exp(approx(1e999))` at 32 digits runs one pass (the start and end events of pass 1 alone); a refusal at the bound is not retried (A5, `audit/reports/A5/fable.md:57`, "no `tooLarge` retried", and N22, `:58`, where only a straddle is). |
| `docs/functions.md:165`, `:174` | "throughout its value's ball"; "A refusal needs the whole ball past the edge" | update | "for every value within its error radius"; "A refusal needs every value within the error radius to lie past the edge" (§8: ball, midpoint and radius are devdocs-only; docs say error radius). |
| `docs/functions.md:194`, `:214`, `:217-222`, `:232` | "until the digits asked for are certain"; the diagram's legend "digits certain" and "no digit certain"; the table's "no digit certain" and "all 32 digits certain"; "would be certain at the first pass" | update | "certified" in each (§12, question 8); the diagram and the table go to devdocs with the change made. |
| `docs/functions.md:239-244` | "The bound stays, though: parts of the number type are exact only because the exponent is at most `10^18`, and the cost of an exponential grows fast with its argument once the bound is raised. Keeping the bound is a decision, recorded with its reasons and the measurements of a test build that raised it in `devdocs/numbers.md`." | keep as intent | "The bound is not a setting, and a higher one is ruled out: parts of the number type are exact only because the exponent is at most `10^18`, and the cost of an exponential grows fast with its argument once the bound is raised; the reasons and the measurements are in [devdocs/numbers.md](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018)." The ruled-out alternative stays; "a test build that raised it" is how the decision was reached, which git holds. |
| `docs/settings.md:109-110` (`#(top) > Precision limit`, D4's bullet) | "("How a number is held" below says what the grid is)" | update | "(what the grid is, [Numbers](numbers.md#how-a-value-is-held) says)"; the pointer into the dissolved section is the one inbound reference on the page. |
| `docs/settings.md:196-197` | "or that none is certified" | update | no note says that: a value with no digit certified carries the count note with zero ("0 of 8 digits are certified", rerun: `approx(1)` under `floor`), the note "the digits are not certified" is unreachable today, and decimal mode's note is "a step could not be certified at the precision limit" beside the dotted `≈` (A2, `audit/reports/A2/fable.md:27`). The rewrite names the notes that exist (Proposed edits, Digits you can trust). |
| `docs/settings.md:227-228` | "the number of digits of the grid is the working precision of the arithmetic at that moment" | update | "an approximate value is kept to the digits of the current pass, a little beyond the precision the pass works at". §8 reserves "working precision" for a pass's precision; the grid has ten digits more (rerun: `schedule` at eight digits gives passes of 18, 36, 72, ... digits with grids of 28, 46, 82, ...; A5, `audit/reports/A5/fable.md:59`, "18 at a precision of eight, 28 at the schedule's first pass"). |
| `docs/settings.md:229-230`, `:257` | "what digits of an answer are certain; a finer grid is necessary for more certain digits"; "how many digits of the answer must be certain before it is shown" | update | "certified" in each (§12, question 8). |
| `docs/settings.md:243-247` | "What is known of it is its midpoint within its radius, and the app keeps the midpoint on a grid"; "a midpoint rounded to `w` digits" | update | "What is known of it lies within its error radius, and the app keeps it to a fixed number of digits" (§8: midpoint is devdocs-only). The mechanism of the sentence, why the grid is decimal and how the kernel rounds onto it, stays in devdocs (§9.1). |
| `docs/settings.md:258-261` | "until the two ends of the ball round to the same digits. The precision limit is how far it may raise them, four times the limit plus ten, which is also the most digits an answer may be asked for." | update | "until every value within the error radius rounds to the same digits. The display digits may be set up to the precision limit, and the retries run up to a ceiling of four times that limit plus ten digits." The relative clause reads as if the ceiling (4,040 at the default) could be asked for; the precision limit (1,000) is the most, as the page's own panel line says (`docs/settings.md:17-18`). |
| `docs/settings.md:271` | "**Why four times the limit plus ten.** The schedule of passes, and why its factor is four and its guard ten, are explained in `devdocs/numbers.md` ("Working precision and the schedule")." | drop | delete with the section; `docs/numbers.md`, Digits you can trust, links to `devdocs/numbers.md#Working precision and the schedule` at the section level (§7.1), and the Precision limit entry links to `docs/numbers.md` (§12, question 5). |

No row of §1.1.5, §1.2.5 or §9.4 names these passages; the first three rows are A5's and A2's, confirmed.

## Findings

### 1. The destination of each paragraph, and what replaces it where it stands

The unit's output. Destinations are the sections of `docs/numbers.md` as §7 names them, `docs/quantities.md` where a sentence is about units, and the devdocs section that already carries the mechanism (§9.1). The complete texts are under Proposed edits.

| Where | Paragraph | Destination | What replaces it where it stands |
| --- | --- | --- | --- |
| `docs/functions.md:132-141` | `approx` says how well a value is known, not how large; the two refusal messages | `docs/numbers.md#approx` (the first sentence, as the concept's rule, §12 question 14) and `#Values too big to hold` (the two messages, as "which message says which") | nothing; the sentence of `#(top)` (lines 126-127) becomes the link (Stale passages) |
| `docs/functions.md:143-160` | a value as a significand times a power of ten; which settings bound which part; the `exp(1e999)` diagram | `docs/numbers.md#Values too big to hold` (the diagram with it; the representation sentence links to `#How a value is held`) | nothing |
| `docs/functions.md:162-179` | the exponential's exponent, the threshold `2.3026e18`, `exp(-1e999)`, `sinh`, `cosh`, powers, `7^1e19`; the whole-ball rule and the retry | `docs/numbers.md#Values too big to hold` (the exponent bound: the rule and the thresholds, §12 question 10); the straddle and the retry also one sentence in `#Values at an edge` | nothing |
| `docs/functions.md:179-187` | what `approx` relaxes, with the three examples; "It never changes an exponent" | `docs/numbers.md#approx` | nothing |
| `docs/functions.md:189-200` | `exp` of an argument with an error radius; the five passes before `approx(1e999)` has a digit | `docs/numbers.md#approx` keeps the radius rule in two sentences; the passes go to `devdocs/numbers.md#Why the exponent bound stays at 10^18`, which carries them (§9.1; A5, `audit/reports/A5/fable.md:368-375`) | nothing |
| `docs/functions.md:202-223` | the radius diagram and the six-pass table | `devdocs/numbers.md#Why the exponent bound stays at 10^18` (the table is there; the diagram is V1's to add or not, question 4) | nothing |
| `docs/functions.md:225-234` | the relative precision bounds the logarithm; the refusal at the first pass; an exact argument costs no passes | `devdocs/numbers.md#Why the exponent bound stays at 10^18`; the user-level fact, that `approx` cannot help `exp` and an exact argument needs no passes, is one sentence of `docs/numbers.md#approx` | nothing |
| `docs/functions.md:236-244` | the settings are not what stands in the way; the bound stays, for two reasons; the measurements in devdocs | `docs/numbers.md#Values too big to hold`, as the ruled-out alternative (keep as intent), with the link to the devdocs section | nothing |
| `docs/functions.md:246-253` | work in log space: the decimal exponent, the quotient of exponentials; the issue #40 sentence | `docs/numbers.md#Values too big to hold` (the advice with the quotient as the worked example, question 1); the #40 sentence is dropped (A5) | nothing |
| `docs/settings.md:209-219` | a fraction times a power of ten; the error radius; `=`; the two ways a value becomes inexact in exact mode; decimal mode's values | `docs/numbers.md#Exact and approximate values`; the decimal-mode sentence `#The two modes` | the one-sentence paragraph proposed for the section's place |
| `docs/settings.md:221-233` | the fraction as the significand (the float analogy); rounding onto a decimal grid of the pass's digits; a rounding charged to the radius; cancellation on every grid; two limits in two units | `docs/numbers.md#How a value is held` (the digits an approximate value is kept to, each rounding charged to the error radius, two limits in two units); the cancellation example `#Identities and cancellation`; the float analogy and "snapped onto a decimal grid" stay in `devdocs/numbers.md#The types` and `#Settling` (§9.1) | the same sentence |
| `docs/settings.md:235-241` | an exact value is limited by the significand limit; never rounded; written with `≈` when longer than the display digits | `docs/numbers.md#How a value is held` (the bits of an exact value, with A5's sharpening) and `#Digits you can trust` (`1/3 ≈ 0.33333333`) | the same sentence |
| `docs/settings.md:242-254` | an inexact value is limited by the precision limit; kept on a grid, rounded after every step; why the grid is decimal; the kernel's binary work and guard; a grid point is a significand | `docs/numbers.md#How a value is held` (two sentences, at the user's depth, §12 question 5); the mechanism stays in `devdocs/numbers.md#Settling`, `#The kernel's boundary` and `devdocs/settings.md#The model > The two limits meet in the grid` (§9.1) | the same sentence |
| `docs/settings.md:256-269` | display digits as the digits to certify; passes up to the ceiling; decimal mode's rounding and certification; the significand limit bounds the precision limit (2,453) | `docs/numbers.md#Digits you can trust` (the first two sentences), `#The two modes` (the decimal sentence); the chain of limits stays on the settings page, in D4's "How the settings bound each other", with the derivation in `devdocs/numbers.md#The significand limit` (§12 question 5) | the same sentence |
| `docs/settings.md:271` | the pointer to the schedule's derivation | dropped; the section-level link from `#Digits you can trust` replaces it | nothing |
| `docs/settings.md:192-197` | what a note says | `docs/numbers.md#Digits you can trust` | one sentence with a link, for both tail paragraphs |
| `docs/settings.md:199-205` | `=` and `≈`; `2^(1/2) m` in `2^(1/2) m`; a value that cannot be told from zero cannot be divided by | `docs/numbers.md#Digits you can trust` (the relations), `#Identities and cancellation` (the roots that cancel), `#Values at an edge` (the divisor) | the same sentence |
| `docs/definitions.md:309-313` | a call is computed as its body typed out; the cancellation paid by the next pass; `em(x)` | stays in `docs/definitions.md#Functions` as the user rule, with a link to `docs/numbers.md#Digits you can trust` | the reduced paragraph (Proposed edits) |
| `docs/definitions.md:313-317` | a call is not remembered; `2^k`; a small definition can be large | one sentence stays in `docs/definitions.md#Functions` (the cost rule); the mechanism is `devdocs/functions.md#Precision, the radius and cost`'s (§9.1; V4 and V2 dedup it) | the reduced paragraph |
| `docs/definitions.md:318-321` | a parameter used twice is two independent copies | `docs/numbers.md#Identities and cancellation` (the dependency problem, one paragraph, as C27's owner says); a clause and a link stay | the reduced paragraph |
| `docs/definitions.md:321-326` | a hand-written function against a built-in: slower, exact cases lost, a step passes a limit the result does not | `docs/numbers.md#Identities and cancellation` (the rule with its two examples); a clause and a link stay | the reduced paragraph |
| `docs/definitions.md:326-329` | decimal mode rounds each step of a body | `docs/numbers.md#The two modes`; a clause and a link stay | the reduced paragraph |

Nothing of these paragraphs goes to `docs/quantities.md`: the one sentence about units, that angle units are inexact through `pi()`, is a new sentence (Proposed edits, Exact and approximate values) and §7 already gives `quantities.md` "which units are approximate".

### 2. The passages against A2, A5 and the pipeline

Every example and both quoted messages reproduce; the model the passages state holds, with the sharpenings below. "Rerun" is this unit's scratch run at the defaults unless said otherwise.

`docs/functions.md#Very large results and approx`:

- `exp(approx(1e999))` is refused exactly as `exp(1e999)` is, and the two messages are as quoted (lines 132-141): holds. A5 N22 (`audit/reports/A5/fable.md:58`; the classifier `src/core/ball.ts:1692-1705`); rerun, both messages verbatim.
- The exponent bound is `10^18`, fixed, not a setting (lines 147-148): holds. A5 N22 (`src/core/scaled.ts:165`); §1.1.2 lists it among the fixed constants.
- The diagram's digits (lines 152-160): hold. Rerun: `floor(1e999 / ln(10))` at 999 display digits is exact, 999 digits long, and begins `434294481903251827` and ends `4497145`; `pow(10, 1e999 / ln(10) - floor(1e999 / ln(10)))` at 32 digits is `2.0307164965753263882718190599363`.
- The threshold `(10^18 + 1) ln 10`, about `2.3026e18`; `exp(2.3e18)` a value and `exp(2.31e18)` refused; `exp(-1e999)` too small; `sinh`, `cosh` and powers share the bound, negative arguments of `sinh` and `cosh` too large; `7^1e19` reported at the bound (lines 162-174): hold. A5 N22 and N24 (`audit/reports/A5/fable.md:58`, `:60`; `src/core/ball.ts:1620-1626`, `src/core/scaled.ts:927-939`); rerun. The digit count of `7^1e19`, about `8.5 × 10^18`, is `1e19 log10 7`.
- The whole-ball rule, the retry, the message at the ceiling (lines 174-179): hold. A5 N22 (`src/core/ball.ts:711-731`, `src/core/pipeline.ts:376-404`); rerun: `exp(approx(1e999) - approx(1e999 - 5))` is certified `≈ 148.41316` on the seventh pass (precisions 18 to 1152), and `approx(5e1000000000000000000) + 5e1000000000000000000` ends with "cannot be told from the point where the result passes the exponent bound at this precision, and the result depends on which side of it it lies".
- What `approx` relaxes, the three examples, "It never changes an exponent" (lines 179-187): hold. A5 N23 (`audit/reports/A5/fable.md:59`); rerun. Sharpened by A5 for the user page (`:244-260`): `approx` on one operand suffices, and it never relaxes a limit a built-in meets by its argument's own size (rerun: `sin(approx(1e999999999) radian)` is refused "however it is computed", as `sin(1e999999999 radian)` is).
- The radius rule of `exp` and the passes (lines 189-223): hold. The rule is arithmetic; the working digits of the six passes at 32 display digits, 52, 94, 178, 346, 682 and 1,354, are the schedule's (rerun: `schedule` at 32 digits gives passes of 42, 84, 168, 336, 672, 1344 digits with grids ten digits wider), the radii follow from `approx`'s one unit in the last working digit (A5 N23), and the sixth pass lies within the ceiling of 4,040 digits (rerun: `ceilingFor(1000)` is 4,040). The scenario's "significand limit of 32,768 bits" is not the default (Stale passages).
- "the exponent would be known to 51 of its 999 digits" (lines 226-227): holds as arithmetic, an error radius of `1e948` on `1e999`.
- "At every pass `exp` measures its argument" (lines 228-231): sharpened. The first pass refuses and the loop ends (rerun: one pass; Stale passages).
- The bound stays for two reasons, with the measurements in devdocs (lines 236-244): the decision is §12, question 10's; the devdocs page is V1's and its timings A5's question 5. Not re-verified here.
- Log space: `1e999 / ln(10)` is `≈ 4.3429448e+998`; `exp(1e999) / exp(1e999 - 5)` is refused and `exp(1e999 - (1e999 - 5))` is `≈ 148.41316` (lines 246-249): hold. Rerun; the quotient's refusal names `exp(1e999)`.
- The issue #40 sentence (lines 249-253): stale (A5; Stale passages). Rerun: `approx(1e999) - approx(1e999 - 5)` is `≈ 5`.
- The forward pointer with `exp(1e6)` (`#(top)`, lines 126-127): the example holds (rerun `≈ 3.0332154e+434294`); the pointer must move with the section (Stale passages).

`docs/settings.md#How a number is held, and what the settings touch`:

- `2.54` as `127/50`, `1e999999999` as `1` times `10^999999999`, the power of ten costing nothing (lines 209-213): hold. N1 is A1's; A5's N22 note has the bound on the value and not the stored form (`audit/reports/A5/fable.md:58`); rerun: `1e999999999` is `= 1e+999999999` and `2.54` is `= 2.54`.
- The error radius; `=` means radius zero; the two ways a value becomes inexact in exact mode (lines 213-217): hold. A5 N3 (`audit/reports/A5/fable.md:56`; `src/core/builtins/approx.ts:29-34`, `src/core/ball.ts:1158-1163`), A2 N10 for `=` (`audit/reports/A2/fable.md:27`; `src/core/display.ts:249-264`). One fact to add for the user: the angle units are inexact through `pi()` (A5's N3 note, "the angle units built from it"; rerun: `30 deg` into `radian` is `≈ 0.52359878` and `1 turn` into `deg` is `≈ 360`).
- Decimal mode: no value inexact, the radius serving inside a function to certify its rounding (lines 217-219): not verifiable here, A4's (N17, N18). Rerun is consistent: `sqrt(2)` is `= 1.4142136` and `gamma(4.5)` is `= 11.631728` in decimal mode.
- The float analogy; rounding snaps the significand onto a decimal grid whose digit count is "the working precision" (lines 221-228): holds in substance; the grid has the pass's working digits, ten beyond its precision (rerun; Stale passages). The analogy is devdocs' (§9.1).
- "A rounding adds half a grid cell to the radius" (lines 228-229): not verifiable here, A3's (settling). The proposed text says only that each rounding is charged to the error radius.
- Cancellation keeps `(2^(1/2))^2 - 2` at a radius of a grid cell on every grid (lines 230-232): holds. Rerun: zero within `4e-4049` after nine passes to the ceiling of 4,040 digits, the last grid having 4,050.
- An exact value is limited by the significand limit; never rounded; written with `≈` when longer than the display digits (lines 235-241): hold, with A5's sharpening (`audit/reports/A5/fable.md:376-385`): an exact result is never rounded, while an exact operand's digits beyond the working grid are rounded into an inexact result's error radius (`src/core/ball.ts:1009-1012`). A2 N10 for the `≈` (rerun: `1/3` is `≈ 0.33333333`). The example `3^100000` is refused at the default limit (rerun: "about 158,497 bits"), which the proposed text says, so that a reader who types it is not surprised.
- An inexact value is limited by the precision limit; kept on a grid and rounded after every step; the grid decimal because the exponent is; the kernel binary with a guard; a grid point is a significand that must fit (lines 242-254): mechanism, the devdocs' (§9.1); not re-verified here beyond its consequence, 2,453 digits (A5, `audit/reports/A5/fable.md:262-278`; `src/core/context.ts:251-262`).
- Display digits as the digits to certify; the grid raised pass by pass until both ends round alike; the precision limit as how far, four times it plus ten (lines 256-260): hold. A2 N9 (`src/core/ball.ts:2069-2088`); the schedule is A3's (rerun: passes of 18, 36, ..., 2304, 4040 digits at eight). "which is also the most digits an answer may be asked for" misreads: the precision limit, 1,000, is the most (Stale passages).
- Decimal mode: every step rounded, exact values included; a function's value certified on finer grids up to the same ceiling; the precision limit bounds that (lines 261-266): not verifiable here, A4's; rerun is consistent (`1 / 3 * 3` is `= 0.99999999`).
- The significand limit bounds the precision limit, 2,453 digits at 65,536 bits (lines 266-269): holds. A5 (`audit/reports/A5/fable.md:262-278`; `src/core/context.ts:251-262`).

`docs/settings.md#(top)`, the two tail paragraphs:

- The notes (lines 192-197): hold with A2's corrections (`audit/reports/A2/fable.md:27`, `:69`): the wording "certain" becomes "certified" with the code change of §12, question 8; "or that none is certified" names no note that exists (Stale passages). Rerun: `sqrt(2)^2 * 1.000000025` shows seven of eight digits certified; `approx(1)` under `floor` shows none.
- The relations (lines 199-205): hold. A2 (`audit/reports/A2/fable.md:69`); rerun: `1 in` into `cm` is `= 2.54`, `3 ft` into `in` is `= 36`, `1 m` into `in` is `≈ 39.370079` and `≈ 39.3700787402` at twelve digits, `2^(1/2) m` into `2^(1/2) m` is `≈ 1`, and `1 / ((2^(1/2))^2 - 2)` is refused: "cannot be told from zero at this precision, and the result depends on which side of zero it lies".

`docs/definitions.md#Functions`, the last paragraph:

- A call is computed as its body typed out; a cancellation is paid for by the next pass; `em(x) = (exp(x) - 1) / x` is `≈ 1` at `1e-30` (lines 309-313): holds. Rerun with the definition appended to the system file: `≈ 1`, in two passes (18 and 36 digits), where `exp(1e-30)` alone certifies in one.
- A call is not remembered; nested calls cost `2^k`; a small definition can be large (lines 313-317): holds. `applyFunction` evaluates the body afresh with each parameter bound to its argument (`src/core/evaluate.ts:893-909`, `bindParameters` at `:912-922`), and nothing in the evaluator memoizes a call (searched for a memo or cache: the only maps are the bindings); `2^k` is the arithmetic of a body that calls twice at each level.
- A parameter used twice is two independent copies (lines 318-321): holds. Rerun: `selfdiff(x) = x - x` gives `selfdiff(approx(1))` as zero within `3e-4049`, the same bound as `approx(1) - approx(1)` typed inline, and `selfdiff(1)` is `= 0`.
- A hand-written function against a built-in: `log(2, 8)` is `= 3` and `ln(8) / ln(2)` is `≈ 3`; the `tanh` formula is refused at `3e18` where `tanh(3e18)` is `≈ 1` (lines 321-326): holds. Rerun; inline the refusal names `exp(3e18)` as too large to compute, and inside a definition it is worded through the call ("the definition of ... computes a value whose exponent would pass 10^18", A5, `audit/reports/A5/fable.md:206-243`). "Slower" is the qualitative statement §12, question 9 allows.
- Decimal mode rounds each step of a body (lines 326-329): holds. Rerun: `thirdx(x) = x / 3 * 3` gives `thirdx(1)` as `= 0.99999999` in decimal mode and `= 1` in exact mode, and `em(1e-30)` is `= 0` in decimal mode, `exp(1e-30)` having been rounded to `1` before the subtraction, where exact mode gives `≈ 1`.

### 3. The gaps of §6.1

§6.1 names four of this unit's passages among "what exists is scattered and partly at the wrong level"; all four are, and each supplies raw material for the page, which Proposed edits turns into text. Confirmed, with the paragraphs that feed each:

- Exact and inexact values, their sources, what `=` means: `docs/settings.md:209-219` supplies most of it, at the wrong level (a settings page).
- How a value is held, to the depth needed to predict refusals: `docs/settings.md:209-254`, with the dyadic cost in D4's Significand limit entry (`docs/settings.md:127-138`, A5-verified).
- Which operations are exact; exact values never rounded; a sum that cannot align is refused: `docs/settings.md:235-241` and `docs/functions.md:179-187` (`1e999999999 + 1`); partial.
- Digits you can trust: `docs/settings.md:256-260` and `:192-197`; the uncertified mark is in D4's Mode entry.
- Values at an edge: `docs/settings.md:204-205` and `docs/functions.md:174-179`; partial.
- Identities and cancellation, and their cost: `docs/settings.md:230-232`, `:199-203`, `docs/definitions.md:318-326`.
- Decimal mode as rules: `docs/settings.md:217-219`, `:261-266`, `docs/definitions.md:326-329`; the rules themselves are D4's Mode entry and A4's.
- `approx` as a concept: `docs/functions.md:132-136`, `:179-200`; substantial.
- The two size limits from the user's side: `docs/functions.md:132-187`, `:236-253`; substantial.

Refuted: none. The §6.1 items this unit's passages do not touch (comparison and equality, how numbers are written, rounding modes, real values only) are other units' to confirm.

New, two:

- A built-in against the same formula written by hand (`docs/definitions.md:321-326`): exact cases lost, error radii adding up, a step passing a limit the result does not. No §6.1 bullet covers it; the proposed home is `docs/numbers.md#Identities and cancellation`, since it is about what the arithmetic cannot recover once a step has rounded or refused.
- What costs time, qualitatively: §7 gives `docs/numbers.md` the section, §6.1 has no bullet for it, and these passages carry its raw material: an expression that never certifies runs to the ceiling on every keystroke (`docs/settings.md:113-117`, D4's, and `:230-232`), the cost of an exponential grows fast with its argument (`docs/functions.md:240-242`), a definition that reads small can be large (`docs/definitions.md:316-317`), a hand-written function is slower (`:321-322`).

## Proposed edits

Links are inline and repo-relative, with same-page targets as `#anchor`; the anchors are the lower-case hyphenated form of §7's headings and follow whatever those headings finally are. The note wordings assume the code change of §12, question 8 ("certified" for "certain"), which A2 proposes (question 7 below). Pages are in alphabetical order, sections in page order.

### docs/definitions.md#Functions

Old (lines 309-329): the paragraph beginning "A defined function is a shorthand for its body" and ending "rather than the function's value being rounded once."

New:

"A defined function is a shorthand for its body, and a call is computed as the body typed out in its place would be: its digits are certified the same way, and a cancellation inside the body is paid for by the next pass's digits, so `em(x) = (exp(x) - 1) / x` gives `≈ 1` at `1e-30` without its author writing anything about precision ([Numbers](numbers.md#digits-you-can-trust)). It also costs what the body typed out would cost: a call is not remembered, so a body that calls a function twice computes it twice, at every pass, and a definition that reads small can be large. Three more things follow that a built-in does not share. A parameter used twice is two independent copies of its argument's error radius, so `x - x` of an inexact argument is a value within a bound of zero, never exactly `0`, as the same text typed inline would be. A function written by hand in place of a built-in is slower, and can fail where the built-in does not ([Identities and cancellation](numbers.md#identities-and-cancellation)). And in decimal mode each step of a body is rounded to the digits, as a hand calculator rounds each keystroke, where a built-in's value is rounded once ([The two modes](numbers.md#the-two-modes))."

### docs/functions.md#(top)

Old (lines 126-127): "where `exp(1e6)` is `≈ 3.0332154e+434294`; the next section says why `approx` does not change that."

New: "where `exp(1e6)` is `≈ 3.0332154e+434294`; `approx` does not change that, since it says how well a value is known and not how large it is ([Values too big to hold](numbers.md#values-too-big-to-hold))."

### docs/functions.md#Very large results and approx

Delete the heading and its body (lines 130-253). Nothing stands in their place: the sentence above carries the link, and the section's content lands as Findings 1 says, in `docs/numbers.md#Values too big to hold` and `#approx` (below) and in `devdocs/numbers.md#Why the exponent bound stays at 10^18` (the passes, the table and, if V1 takes it, the radius diagram of lines 202-214). The built-in `approx` keeps its entry in this page's generated reference, mechanical, with a brief description that links to `numbers.md#approx` (§12, questions 10 and 14).

### docs/numbers.md#Exact and approximate values

Complete text from `docs/settings.md:209-219`; the sentence on the angle units is new, from A5's N3 note.

"A value is a fraction times a power of ten. `2.54` is `254/100`, kept in lowest terms as `127/50`, and `1e999999999` is `1` times `10^999999999`. The fraction is exact, so `1/3` is one over three and not a string of threes, and the power of ten is kept as an exponent apart from it, so a value's magnitude costs nothing to hold.

Every value also carries an error radius: a bound on how far the number held may lie from the number meant. An exact value has an error radius of zero, and `=` on a result line means that. A value with a nonzero error radius is inexact, approximate in plain words, and in exact mode a value becomes inexact in exactly two ways: through an inexact function (a root, `exp`, `sin`, `pi()`, and any unit defined through one, so that `30 deg` in `radian` is `≈ 0.52359878`), and through `approx`, which makes a value inexact on purpose ([approx](#approx)). Where every operand is exact, `+`, `-`, `*`, `/` and a whole-number power give an exact result, as long as it needs to be and never rounded ([Operations that stay exact](#operations-that-stay-exact-exact-cases-of-functions)). In decimal mode no value is inexact: every step is rounded and the rounded value is the value ([The two modes](#the-two-modes))."

### docs/numbers.md#How a value is held

Complete text from `docs/settings.md:221-254`, at the depth §12, question 5 asks for; the dyadic cost is the text of D4's Significand limit entry (`docs/settings.md:127-138`, A5-verified), which question 5 also sends here.

"What a value costs, and what the two limits bound, follows from how it is held.

- **An exact value costs its fraction's bits.** `1/3` is small and `3^100000` is not: what an exact value costs to hold and to multiply is the bits of its numerator and of its denominator, and the significand limit bounds each of them, so that `3^100000` is refused at the default limit by its 158,497 bits ([Values too big to hold](#values-too-big-to-hold)). Nothing else touches an exact value in exact mode: no digits setting applies to it, and an exact result is never rounded. Only where an exact value meets an inexact one is any of it rounded, into the inexact result's error radius, which is why `approx` on one operand of a sum, a product or a quotient is enough to make the whole step approximate.
- **An approximate value is kept to the digits of the current pass.** What is known of it lies within its error radius, and the app keeps it to a fixed number of significant digits, a little beyond the precision the pass works at ([Digits you can trust](#digits-you-can-trust)), rounding it after every step and charging each rounding to the error radius, so that an approximate value never grows past what its error radius makes meaningful. Those digits are decimal digits times a power of ten, the same kind of thing the display writes, so the digits shown and the digits computed are one thing.
- **The power of ten is free, and a power of two is not.** `10^1000000000` is `= 1e+1000000000`, only its exponent being counted, against the exponent bound. A fraction with a power of two in its denominator is stored with fives instead, so `2^-30000`, a 30,000-bit value, costs 69,658 bits and is refused at the default limit, where `2^-28000` is a value. That is the one case where the cost is more than the value's own bits, by a factor of about 2.3 at most, and it only matters for a value already within that factor of the limit: a number that simple by its factors is still a big number by its digits (`3^-100000` costs its 158,497 bits under any way of storing it as digits), and `approx` is the way to compute with one.

The two kinds of value are limited by two different things, which is why the limits come in two units: the significand limit, in bits, bounds an exact value, and the precision limit, in decimal digits, bounds how far an approximate one is refined. A value at the finest precision is itself a fraction, an integer over one, and must fit inside the significand limit, which is how the significand limit also bounds the precision limit ([Settings](settings.md)); the derivation is in [devdocs/numbers.md](../devdocs/numbers.md#the-significand-limit)."

### docs/numbers.md#Digits you can trust

Complete text from `docs/settings.md:256-260` and the two tail paragraphs (`:192-205`); the schedule's figures are the plan's N8 (A3's).

"In exact mode the display digits are how many digits of the answer must be certified before it is shown, and a digit is certified when every value within the error radius rounds to it. The app computes at a working precision a little above the digits asked and, where they do not certify, computes again at twice the precision, pass by pass, up to a ceiling: the finest grid it rounds onto, four times the precision limit plus ten digits (4,040 digits at the default limit of 1,000). The display digits themselves may be set up to the precision limit. An expression whose digits can never certify, `(2^(1/2))^2 - 2`, runs every pass up to the ceiling on every keystroke, which is what the precision limit limits: effort ([What costs time](#what-costs-time); the schedule of passes is in [devdocs/numbers.md](../devdocs/numbers.md#working-precision-and-the-schedule)).

An answer is written with `=` when it is exact and every digit it has is shown (`1 in = 2.54 cm`, `3 ft = 36 in`), and with `≈` when digits were rounded away or when a step of the computation was inexact: `1 m ≈ 39.370079 in` and `1/3 ≈ 0.33333333`, both exact values with more digits than shown, and `2^(1/2) m` in `2^(1/2) m` is `≈ 1`, since the two roots were each computed to a finite number of digits, however exactly they cancel ([Identities and cancellation](#identities-and-cancellation)).

An answer shows every digit asked for when the computation can vouch for them all. When it cannot, which only the last pass produces, a note in parentheses says what the digits are worth: how many of them are certified ("7 of 8 digits are certified", and "0 of 8" when none is), or that the value is zero within a bound ("within 2e-30 of zero", the value written `0` whatever the sign of the noise it is within). In decimal mode a step whose rounding could not be certified at the precision limit is written with `≈` bearing a dot above it, the uncertified mark, and a note says so ([The two modes](#the-two-modes))."

### docs/numbers.md#Values at an edge

The sentences this unit contributes, from `docs/settings.md:204-205` and `docs/functions.md:174-179`; the section's other edges (a domain's end, a pole, a rounding boundary) are A6's and the built-in units'.

"A result would jump if the value lay a hair to one side of an edge: zero as a divisor, the point where a result passes the exponent bound, the end of a function's domain. An approximate value whose error radius reaches across such an edge is not guessed at: the app computes again at more digits, pass by pass, and when the error radius still straddles the edge at the ceiling it refuses, saying the value cannot be told from the edge at this precision. `(2^(1/2))^2 - 2` is zero within a bound at every precision, so `1 / ((2^(1/2))^2 - 2)` is refused: the value cannot be told from zero. `exp(approx(1e999) - approx(1e999 - 5))` straddles the exponent bound at its first pass, the difference being `5` only within a wide error radius, and is retried until the error radius lies within the bound (`≈ 148.41316`); a value that still straddles the bound at the ceiling cannot be told from the point where the result passes it."

### docs/numbers.md#Identities and cancellation

Complete text from `docs/settings.md:230-232`, `:199-203` and `docs/definitions.md:318-326`.

"An identity through an inexact step never certifies exactly. `2^(1/2) m` in `2^(1/2) m` is `≈ 1`, not `= 1`: the two roots were each computed to a finite number of digits, however exactly they cancel. `(2^(1/2))^2 - 2` is zero within a bound on every pass, since cancellation leaves it an error radius of the pass's last digit however fine the pass, so it runs every pass up to the ceiling and dividing by it is refused ([Values at an edge](#values-at-an-edge)). A finer pass is necessary for more certified digits and never sufficient.

Every occurrence of a value is independent. `approx(1) - approx(1)` is a value within a bound of zero, never exactly `0`, and a parameter of a defined function used twice is two independent copies of its argument's error radius, so `x - x` in a body is the same bound around zero that the text typed inline would be ([definitions.md](definitions.md#functions)).

A function written by hand in place of a built-in is slower, and can fail where the built-in does not: each step rounds and the error radii add up; the built-in's exact cases are lost (`log(2, 8)` is `= 3`, `ln(8) / ln(2)` is `≈ 3`); and a step can pass a limit the result does not (`(exp(x) - exp(-x)) / (exp(x) + exp(-x))` is refused at `x = 3e18`, where `tanh(3e18)` is `≈ 1`, because `exp(3e18)` is too large to compute). Prefer the built-in, and where there is none, work in log space ([Values too big to hold](#values-too-big-to-hold))."

### docs/numbers.md#The two modes

The sentences this unit contributes, from `docs/settings.md:217-219`, `:261-266` and `docs/definitions.md:326-329`; the mode's rules are D4's and A4's.

"In decimal mode no value is inexact: every step is rounded to the display digits, or to the working digits, in the rounding mode, exact values included, and the rounded value is the value, so every answer is written with `=`, the uncertified mark apart. A built-in's value is computed on finer grids, up to the same ceiling as exact mode's, until its rounding onto the step's digits is certified, so the precision limit bounds that certification as it bounds the display digits and the working digits. A function defined in the definitions file is not one step but its body's steps, each rounded as a hand calculator rounds each keystroke, where a built-in's value is rounded once: `em(x) = (exp(x) - 1) / x` gives `≈ 1` at `1e-30` in exact mode and `= 0` in decimal mode at eight digits, `exp(1e-30)` having been rounded to `1` before the subtraction."

### docs/numbers.md#approx

Complete text from `docs/functions.md:132-136`, `:179-200` and `:225-234`, with A5's two facts for the user page (`audit/reports/A5/fable.md:244-260`).

"`approx(x)` is `x` known to the precision of the pass and no better: an exact argument becomes approximate, with an error radius of one unit in the last of the digits the pass keeps, and an approximate one is left as it is, never narrowed. It keeps the dimension (`approx(2 m)` is `≈ 2 m`), passes zero through, and in decimal mode is the identity, since every value there is already rounded. It is the designed escape from the strictness of exact arithmetic: a step the exact arithmetic refuses for its size, a sum that cannot be aligned, a whole-number power, a product or a quotient whose exact result would pass the significand limit, is computed to the digits asked once one operand is approximate, and shown with `≈` instead of `=` ([Values too big to hold](#values-too-big-to-hold)). `1e999999999 + 1` is refused, since its exact value has a billion digits, while `approx(1e999999999) + 1` is `≈ 1e+999999999`, the `1` absorbed into the error radius; `3^1000000000` is refused and `approx(3)^1000000000` is `≈ 5.243997e+477121254`, its digits kept to the pass's precision at every step; and `3^32767 * 7^21845` is refused, each power within the limit and their product past it, while `approx(3^32767) * 7^21845` is `≈ 9.9732685e+34094`.

`approx` says how well a value is known, not how large it is, so it never changes an exponent, and it never relaxes a limit a function meets by its argument's own size: `exp(approx(1e999))` is too large to compute exactly as `exp(1e999)` is, and `sin(approx(1e999999999) radian)` is past the significand limit as `sin(1e999999999 radian)` is. Nor would `approx` help `exp` if the exponent were allowed, because of what the exponential does to an error radius: `exp(x ± r)` is `exp(x)` times a factor between `e^-r` and `e^r`, so the argument's error radius, in absolute terms, becomes the result's relative error, and `exp` of a large argument needs that argument to many more digits than the result shows. An exact argument gives them for free; an approximate one only after passes enough to shrink its error radius below one ([devdocs/numbers.md](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018) works the passes out)."

### docs/numbers.md#Values too big to hold

Complete text from `docs/functions.md:143-179`, `:236-249` and `docs/settings.md:235-241`; the paragraph on the significand limit's remedies is the user-facing third of D4's Significand limit entry (`docs/settings.md:139-157`, A5-verified), which §12, question 5 sends here (question 5 below).

"Two limits bound a value, on two different parts of it, and a refusal names the one it passes.

A value is held as a significand times a power of ten ([How a value is held](#how-a-value-is-held)). The settings bound the significand: the display digits and the precision limit say how many of its digits must be certified, and the significand limit how many bits its numerator and its denominator may have. The exponent has a fixed bound of its own, `10^18` either way, which is not a setting. `1e999` is `1 × 10^999`, well within both. `exp(1e999)` has a significand that 32 digits hold with ease and an exponent that is itself a number of 999 digits:

```
exp(1e999) = 2.0307164965753263882718190599363 × 10^434294481903251827…4497145
             └───────── significand ─────────┘      └─────── exponent ───────┘
             the settings' part: the display        fixed, not a setting:
             digits, the precision limit and        at most 10^18 either
             the significand limit; 32 digits       way; this one has 999
             fit with ease                          digits, 4.3 × 10^998
```

**The significand limit.** The limit is strict: no exact value past it is ever formed, and an operation predicts the size of its result before forming it. When a result would need a significand past the limit, the app refuses that part of the expression, names it and says how many bits it would need, exactly or about, where the operation knows:

```
"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.
```

Where the operation that refused expects the same step to fit when computed inexactly, the message suggests what to try: `approx(…)` around the operand it names, so that the part is computed to the digits asked and shown with `≈` ([approx](#approx)), or decimal mode, which rounds every step and so never holds the exact value. Where the operation expects the value to pass the limit however it is computed (a built-in whose value needs more bits than the limit holds even rounded, `factorial(20000)` or `sin` of an angle whose reduction passes the limit; a literal of more digits than the limit; a power whose exponent cannot be formed within it, `2^1e-30000`), the message says so and suggests nothing; what a higher limit would need is the user's to judge. The suggestion is the operation's expectation, not a promise. The limit is what makes `3^1000000000` a refusal rather than a hang; the setting is in [Settings](settings.md).

**The exponent bound.** A result whose decimal exponent would pass `10^18` is too large to compute, and one whose exponent would fall below `-10^18` is too small, whether the value is exact or approximate:

```
"exp(1e999)" is too large to compute: its exponent would pass 10^18.
```

The exponential of `x` has the decimal exponent `x log10 e`, so `exp(x)` is refused whenever `x` passes `(10^18 + 1) ln 10`, about `2.3026e18`, for every value within its error radius, with or without `approx`: `exp(2.3e18)` is `≈ 3.9591004e+998877308377479203` and `exp(2.31e18)` is too large to compute. `exp(-1e999)` is too small to compute, its exponent as far below the bound as `exp(1e999)`'s is above it. `sinh`, `cosh` and powers (`pow(10, 1e999)`, `10^1e999`) share the bound, `sinh` and `cosh` of a negative argument being too large rather than too small, and a product, quotient or power that no setting could hold is reported at the bound even where the significand limit would refuse it first (`7^1e19`, a whole number of about `8.5 × 10^18` digits). A refusal needs every value within the error radius to lie past the bound; an argument whose value may lie on either side of it is retried at more digits, and at the ceiling cannot be told from the point where the result passes the exponent bound ([Values at an edge](#values-at-an-edge)).

The bound is not a setting, and a higher one is ruled out: parts of the number type are exact only because the exponent is at most `10^18`, and the cost of an exponential grows fast with its argument once the bound is raised; the reasons and the measurements behind the decision are in [devdocs/numbers.md](../devdocs/numbers.md#why-the-exponent-bound-stays-at-1018). Instead, work in log space, as on paper: a quotient of exponentials is the exponential of a difference, so `exp(1e999) / exp(1e999 - 5)`, which is refused, is `exp(1e999 - (1e999 - 5))`, `≈ 148.41316`; and the decimal exponent of `exp(1e999)` itself is `1e999 / ln(10)`, `≈ 4.3429448e+998`."

### docs/settings.md#(top)

Old (lines 192-205): the two tail paragraphs, "An answer shows every digit asked for ..." and "An answer is written with `=` ...".

New, one sentence in their place: "How to read a result, its `=` or `≈` and the note beside it, is in [Numbers](numbers.md#digits-you-can-trust)."

### docs/settings.md#(top) > Precision limit

Old (lines 109-110): "the most digits any grid may be asked for ("How a number is held" below says what the grid is), 1,000 by default"

New: "the most digits any grid may be asked for (what the grid is, [Numbers](numbers.md#how-a-value-is-held) says), 1,000 by default". The rest of the entry is D4's.

### docs/settings.md#How a number is held, and what the settings touch

Delete the heading and its body (lines 207-271). In their place, one sentence at the foot of the page: "How a value is held, what its digits are worth and why the two limits come in two units are the subject of [Numbers](numbers.md#how-a-value-is-held); each limit's entry above says in a sentence what it bounds."

### devdocs/functions.md#Precision, the radius and cost

No text proposed. The mechanism of `docs/definitions.md:313-321` (a call evaluates its body afresh, `applyFunction`, `src/core/evaluate.ts:893-909`; two occurrences of a parameter are two balls) is this section's already (§9.1); V4 keeps it here with one link to `docs/numbers.md#identities-and-cancellation`, and V2 reduces the last paragraph of `devdocs/architecture.md#Functions` to a link (§9.1; §12, question 24).

### devdocs/numbers.md#Why the exponent bound stays at 10^18

No text proposed. The section already carries the six-pass table and the log-space advice (§9.1; A5, `audit/reports/A5/fable.md:368-375`), so nothing of the dissolved section is new to it but two things for V1 to decide: the radius diagram (`docs/functions.md:202-214`), and the scenario's "significand limit of 32,768 bits" (`:198`, `:239`), to be stated as the default of 65,536 or left out. The issue #40 sentence does not travel (A5).

## Terminology

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "working precision" for the digit count of the grid an approximate value is kept to | `docs/settings.md:227-228` | §8's split, applied: **working precision** is a pass's precision; the grid is **the digits an approximate value is kept to**, ten beyond the pass's precision, named once in `numbers.md`; devdocs keep "working digits of the pass" until #172 renames it. |
| "ball" and "midpoint" in docs | `docs/functions.md:165`, `:174`, `:239`; `docs/settings.md:243-247`, `:258` | **error radius** and "every value within the error radius"; **ball** and **midpoint** devdocs-only (§8, confirmed). |
| "certain" for certified, in prose, a diagram's legend and a table | `docs/functions.md:194`, `:214`, `:217-222`, `:232`; `docs/settings.md:194`, `:229-230`, `:257` | **certified** (§8; §12, question 8). |
| "error" for the significand limit's refusal ("an error rather than a hang") | `docs/settings.md:138-139` (D4's entry; the sentence travels to `numbers.md`) | **refusal** (§8: refusal for the three size refusals). |
| "integer" and "integer power" in docs | `docs/functions.md:173`, `:180` | **whole number**, **whole-number power** in docs; integer in devdocs (§8). |
| "decimal exponent" (of `exp(x)`, `x log10 e`) beside "the exponent" (the power of ten's) | `docs/functions.md:162`, `:247` | in docs **the exponent** is the power of ten's; **decimal exponent** only where a binary one could be meant, which is devdocs. |
| "grid", "grid cell", "finest grid" | `docs/settings.md:225-232`, `:244-254`, `:257`, `:112`, `:119` | §8, confirmed: explained once in `numbers.md` as the digits an approximate value is kept to, and **ceiling** glossed once as the finest grid; elsewhere in docs, "digits" and "the pass". |
| "a shorthand for its body", "the body typed out in its place", "the expanded expression" | `docs/definitions.md:309-310`, `:317`; N17 | **as the body typed out in its place** in docs; "expanded" devdocs-only. |
| "absorbed into the radius" | `docs/functions.md:184` | keep, as A5 does, for what a sum does with an operand below the pass's precision; "error radius" where the noun stands alone. |

## Questions for the owner

1. **One example for log space.** §12, question 10 gives `numbers.md` "the log-space advice with one example"; the section has two, the decimal exponent (`1e999 / ln(10)`) and the quotient of exponentials, which teach two different moves. Proposed answer: the quotient is the worked example and the exponent a closing clause, as drafted.
2. **Quoting the two refusal messages.** The drafted section quotes the significand limit's and the exponent bound's messages as "which message says which" (§7), while §12, question 6 generates the catalogue and hand-writes nothing of it. Proposed answer: the two quotes stay as the foundation's examples, the catalogue being the complete list.
3. **The `exp(1e999)` diagram.** Drafted into `numbers.md#Values too big to hold`, where it shows the two parts and the two limits with no mechanism. Proposed answer: it stays there; only the passes' diagram and table go to devdocs.
4. **For V1:** whether `devdocs/numbers.md#Why the exponent bound stays at 10^18` already carries the radius diagram of `docs/functions.md:202-214` and whether it, too, names a significand limit of 32,768 bits; not read here. Proposed answer: V1 keeps the one table, adds the diagram only if the page lacks it, and names the default limit or none.
5. **For D4:** the drafted `numbers.md#Values too big to hold` carries the remedies paragraph of the Significand limit entry (`docs/settings.md:139-157`) and `#How a value is held` the dyadic cost (`:127-138`), as §12, question 5 directs; the entry then keeps its sentence and a link, and the Precision limit entry's parenthetical becomes the link drafted above. Proposed answer: the owner reconciles D4's and D8's drafts when `numbers.md` is assembled, D8's text taking those two paragraphs.
6. **For A3 and V1:** "A rounding adds half a grid cell to the radius" (`docs/settings.md:228`) is not verified here; the drafted text says only that each rounding is charged to the error radius. Proposed answer: A3 settles it and `devdocs/numbers.md#Settling` states the exact charge.
7. **The note wordings.** The drafted texts quote "7 of 8 digits are certified", which is the wording after A2's code change (`src/outcome.ts:507`); until it lands the app says "certain". Proposed answer: land A2's change before `numbers.md` is assembled.
8. **For V2 and V4:** the call-cost paragraph is triplicated (§9.1); the drafted `definitions.md` keeps the user rule, `devdocs/functions.md#Precision, the radius and cost` the mechanism. Proposed answer: V2 reduces `devdocs/architecture.md#Functions` to a link to the former.
9. **For D6:** the `approx` bullet of `docs/functions.md#(top)` (C26) describes the built-in; with the concept in `numbers.md#approx` the bullet is the reference entry, mechanical and brief (§12, question 14). Proposed answer: D6 points it at `numbers.md#approx` and keeps the signature and one sentence.

## Notes on this run

The plan's scope for D8 was right, and "no new modules" held: `applyFunction` was read for one sentence and the harness signatures only to run the examples. What was hard was writing destinations into a page that does not exist, so the proposed edits are complete texts for §7's `numbers.md` headings, with the sentences owned by other units (D4's two settings paragraphs, A3's schedule, A4's decimal rules) marked as theirs; and separating what the user needs (the digits a value is kept to, the error radius, the two limits) from the mechanism the current pages mix in (the float analogy, the decimal grid's reason, the kernel's guard bits), which §9.1 already places in devdocs. The pages were accurate: every example and both messages reproduce, and the findings are terminology (ball, midpoint, certain, working precision), two sharpenings (the first pass refuses; a non-default limit named as if default) and one closed issue. The next units should know: the scratch pattern that appends user definitions to the system file's text and builds with `buildTable` at `ceilingContext` works, and definition names that are units (`hand` among them) fail the build; `em(x)` in decimal mode gives `= 0`, a sharp example for the two modes; the `exp(1e999)` digits in the diagram are exact and were reproduced with `floor` and `pow`; and D4's Significand limit entry and this unit's `#Values too big to hold` overlap by the owner's design, to be reconciled once.
