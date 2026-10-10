# Unit D4: Settings (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (Claude Fable 5.1), as the session reports it
- Doc sections read: `docs/settings.md` (all); `devdocs/settings.md#The model`, `#Applying a change`, `#The probe`, `#The controls`; `devdocs/notation.md#The rule > The width` (a bold-labelled paragraph under `#The rule`, not a heading); `devdocs/numbers.md#The working digits`
- Modules read: `src/settings.ts`, `src/settings-lines.ts`, `src/limits.ts`, `src/core/context.ts`, `src/core/rounding.ts`
- Also read: `src/core/rational.ts:103-115` (`MAX_SIGNIFICAND_LIMIT_BITS`); `src/core/fixed.ts:103-118` (`bitsFor`, `GUARD_BITS`); `src/settings-panel.ts` (the control kinds, labels, steppers, the extended count's initial value and the Apply path: lines 31-125, 446-453, 475-493, 572-574, 630-662, 725-800, 813-880, 953-1003, 1034-1055); `src/system-build.ts:37-90` (the table memoized by the ceiling); for the harness only: `src/outcome.ts:117-215`, `src/outcome.test.ts:45-80`, `src/system-table.ts:25-67`, `package.json` (scripts). `audit/plan/06-coverage-gaps.md` §6.5 and §6.8 were read for the Findings, which the report format asks for although the unit's entry does not name section 6.

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 22 |
| Claims corrected | 0 |
| Claims not verifiable here | 2 |
| Stale passages: update / keep as intent / drop | 5 / 2 / 2 |
| Gaps confirmed / refuted / new | 5 / 0 / 5 |
| Proposed edits | 8 |
| Questions for the owner | 8 |

## Claims

The unit assigns no `N`/`Q` claim by number. Its claims are the rows of §3 (the per-setting table, S1 to S10, and the "not settings" bullets, S11 to S17), the fixed constants of §1.1.2 (S18), and the §1 claims that A3, A4 and A5 hand it as context where this unit's modules settle them (N8, N11, N13, N19, N21). The constants quoted as computed were read from the modules and confirmed by running the existing tests (52 pass for the five modules) and a scratch script outside the tree.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| S1. Display digits: key `displayDigits`; `NumberContext.precision`; default 8; range 1 … precision limit | confirmed | `src/settings.ts:142`, `:668`, `:817` (`precision: settings.displayDigits`), `:504-508` (`max: settings.precisionLimitDigits`); `src/core/context.ts:149` (`DEFAULT_DISPLAY_DIGITS = 8`) | The decimal-mode effect (the grid of every step and of literals) is stated by the panel's line, `src/settings-lines.ts:131`; the mechanism is A4's (`evaluate.ts`). |
| S2. Rounding: key `rounding`; the context's rounding mode; half even by default; the seven modes; the display's last digit in exact mode, every step in decimal mode, `round()` | confirmed | `src/settings.ts:143`, `:818`; `src/core/context.ts:156` (`DEFAULT_ROUNDING = "halfEven"`); `src/core/rounding.ts:68-93` (seven modes, their order); `src/core/rounding.ts:7-11` and `src/settings-lines.ts:267-270` (where the mode acts) | The `round()` part rests on N11; `builtins/round.ts` is outside this unit. |
| S3. Mode: key `mode.kind`; `NumberContext.mode`, exact or decimal; default exact | confirmed | `src/settings.ts:131-133`, `:155`, `:170`, `:821` (`mode: mode.kind`); `src/core/context.ts:82-84` | |
| S4. Notation (exact mode): key `mode.notation.kind`, `digits` or `ratio`; default digits; display only | confirmed | `src/settings.ts:95-100`, `:155`; `:798-803` (`ratioOf`); `:814-826` (`contextOf` never carries it) | |
| S5. Ratio width: key `mode.notation.width`; `RatioDisplay.width`; default 20; range 1 … 1000; nothing clamps it | confirmed | `src/settings.ts:83`, `:96` (`& RatioDisplay`), `:103` (`DEFAULT_WIDTH = 20`), `:106` (`WIDTH_LIMIT = 1000`), `:477`, `:515` (no setter), `:524-528` (`CLAMP_ORDER` leaves it out) | A stored width outside the range is not clamped but makes the whole mode fall back to its default, exact mode with digits: `src/settings.ts:397-427`. |
| S6. Working digits (decimal mode): key `mode.working.kind`, locked to the display digits or extended; default locked | confirmed | `src/settings.ts:121-123`, `:133`, `:156`; `src/settings-lines.ts:103-104` ("default not extended") | |
| S7. Extended count: key `mode.working.digits`; `NumberContext.working`; default the display digits; range display digits … precision limit | confirmed | `src/settings.ts:123`, `:823-825`; `src/core/context.ts:96-102`; `src/settings.ts:509-514`; `src/settings-panel.ts:965` (`this.lastExtended ?? this.settings.displayDigits`) | The count offered when `extended` is checked is the display digits only until an extended count has been seen in the session; then it is that count (`src/settings-panel.ts:446-453`). |
| S8. Precision limit: key `precisionLimitDigits`; caps the display and working digits; ceiling 4 × (L + 10); rebuilds the unit table; default 1,000; range 1 … `precisionLimitFor(S)`, 2,453 at the default | confirmed | `src/settings.ts:146`, `:499-503`, `:820`; `src/core/context.ts:177`, `:188-190` (`4 * (precisionLimitDigits + GUARD_DIGITS)`), `:251-262` (`precisionLimitFor(65536)` is 2,453 when run); `src/system-build.ts:75-90` (the table memoized by the ceiling) | |
| S9. Significand limit: key `significandLimitBits`; `NumberContext.significandLimitBits`; default 65,536; range 358 … 1,048,576 | confirmed | `src/settings.ts:148`, `:471-474`, `:819`; `src/core/context.ts:170` (`1 << 16`), `:269` (`MIN_SIGNIFICAND_LIMIT_BITS = 2 * bitsFor(ceilingFor(1))`, 358 when run); `src/core/rational.ts:115` (`1 << 20`) | The strict refusals are A5's; `src/core/context.ts:42-48` states them. |
| S10. Probe budget: key `budgetMs`; the per-pass time of the probe; no model parameter; default 50; range 10 … 10,000 | confirmed | `src/settings.ts:150`, `:165`, `:483` (`BUDGET_MS_RANGE`), `:814-826` (`contextOf` omits it); `src/limits.ts:54-57`, `:205-222` | |
| S11. "Measure this device" and Apply as the probe's proposal | confirmed | `src/settings-panel.ts:863`, `:874`, `:998-1003` (Apply emits the two limits as one change); `src/limits.ts:205-222` | |
| S12. The chain of clamps and refusals, with "at most 2,453 digits under the significand limit" and "lowered from 1,000 to 26 digits to fit the significand limit" | confirmed | `src/settings.ts:496-518` (`rangesOf`), `:553-592` (`clampSettings`, `clampsOf`), `:640-654` (`refusalOf`); `src/settings-lines.ts:196-229` | The panel writes both lines capitalized and with a full stop; 26 digits is the top under a significand limit of 1,024 bits, where the docs example lands when run. |
| S13. Per-setting "default …" links and "Reset all settings" | confirmed | `src/settings-lines.ts:95-111`; `src/settings.ts:717-762` (`withDefault`, `isAtDefault`, `resetSetting`) | |
| S14. The sheet's mechanics: cog, bottom or side sheet, Done and Escape, steppers, the on-screen keyboard's Done | confirmed | `src/settings-panel.ts:484` (the handle), `:493` (Done), `:572-574` (Escape), `:640-662` (steppers disabled at the bound, `enterkeyhint="done"`) | The bottom and side layouts are CSS, V5's; `devdocs/settings.md:689-691` states them. |
| S15. Storage: one JSON envelope under `settings`, format version 5, `savedBy`, migrations 1 to 5, a newer version gives the defaults | confirmed | `src/settings.ts:183`, `:190`, `:208-293`, `:322-340`, `:663-676` | In scope only as the docs page's "under a format version of their own"; the mechanism is V5's. |
| S16. The build number tap is described on the settings page though not a setting | not verifiable here | `docs/settings.md:184-190` | D9's surface; §6.5 moves the paragraph to `app.md`. |
| S17. Constants deliberately not settings: the ceiling "derived and shown, never set"; the guard and the factor | confirmed | `src/core/context.ts:180` (`GUARD_DIGITS = 10`), `:188-190`; `src/settings.ts:820`; `src/settings-lines.ts:243-244` | The ceiling is shown in one place only, the probe's proposal ("the built-ins on a grid of 4,040 digits"); no control's line shows it (`src/settings-panel.ts` never names it). |
| S18a. §1.1.2's fixed constants: the guard of ten, the factor four, `MIN/MAX_SIGNIFICAND_LIMIT_BITS` 358 and 2^20, the width's range [1, 1000] | confirmed | `src/core/context.ts:180`, `:189`, `:269`; `src/core/rational.ts:115`; `src/settings.ts:106`, `:477` | |
| S18b. §1.1.2's fixed constants: the exponent bound 10^18 and `ROOT_DEGREE_LIMIT` 2^32 | not verifiable here | `src/core/scaled.ts` and `src/core/ball.ts` are A5's | |
| N8 (context): the first pass at the digits asked for plus ten, doubling to a ceiling of 4 × (L + 10); nine passes at eight digits | confirmed | `src/core/context.ts:180`, `:188-190`, `:210-225` (`workingContexts`); run at the defaults the passes are 18, 36, 72, 144, 288, 576, 1152, 2304, 4040 | "The passes together cost at most about twice the last" is `src/limits.ts:54-55`'s reasoning, not a code fact. |
| N11 (context): seven modes, half even by default, applied once at the display in exact mode and at every step in decimal mode | confirmed | `src/core/rounding.ts:7-11`, `:68-93`; `src/core/context.ts:8-12`, `:156` | `round()` not verifiable here. |
| N13 (context): the width is independent of the display digits; the ratio is parenthesized before a unit and bare alone | confirmed | `src/settings.ts:477`; through the harness `1 m` in `in` is `1 m = (5000/127) in` and `m / (3 m)` is `= 1/3` | The ratio is also bare before `×`: the reciprocal line of `3 ft` in `in` is `in = 1/36 × 3 ft`, and of `1 m` in `in` is `in = 127/5000 × 1 m`. N13 does not say so and `docs/settings.md:77` has the parentheses; see Findings. |
| N19 (context): with `w ≥ p` every step but the last is rounded to `w`, the last to `p` from the exact result | confirmed | `src/core/context.ts:119-129` (`operandContext`), `:298-309` (`checkContext`: `w ≥ p`, `4 (w + 10) ≤ ceiling`); through the harness `ln(exp(1/10))` is `= 0.099999984` at eight digits and `= 0.1` over twelve | The list of last steps is `pipeline.ts`'s, not read here. |
| N21 (context): 65,536 bits by default; the precision limit's top 2,453; the floor 358; the hard bound 2^20; `2^-30000` costs 69,658 bits | confirmed | as S8, S9; through the harness `2^-30000` is refused and `2^-28000` is a value | The refusal says "would need a significand of about 69,659 bits"; 69,658 is the size of `5^30000`. The two figures differ by one, which a reader who tries the example will notice. |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/settings.md#(top)`, the paragraph "The limits are set top-down" (lines 175-177; the `> Probe budget` bullet carries no such phrase) | "times the costliest exact product and the costliest built-ins at rising sizes" | update (plan row confirmed) | "times the costliest exact product and one expression of the four costliest elementary functions, at rising sizes" (the Gamma and Beta families are deliberately not timed: `src/limits.ts:45-50`, `devdocs/settings.md:468-476`); see the probe procedure under Proposed edits |
| `docs/settings.md#(top)` (lines 23-24) | "There are six settings, kept in the browser…" | update (plan row confirmed) | no count: "The settings are kept in the browser…", with the controls listed grouped and nested by mode (§12, question 16); the stored object does have six fields (`src/settings.ts:663-676`), which is a storage fact for devdocs |
| `devdocs/settings.md#The model > Rounding` (lines 207-210) | "the stored value of the earlier default, `halfAwayFromZero`, echoed by every save of some other setting far more often than chosen, was migrated to `halfEven` once, with the control one tap away" | drop (plan row confirmed) | delete; the sentence ends at "where ties away from zero drift" |
| `devdocs/settings.md#The controls` (lines 672-674) | "pointing at docs/settings.md until the guide lands ([#191][191])" | update (plan row confirmed) | "the user guide's settings page, [docs/settings.md](../docs/settings.md); what is open about where the link should land is [#191](https://github.com/bsidhom/exucal/issues/191)" |
| `devdocs/settings.md#The controls` (lines 623-625) | "(sentences as options once made the panel overflow a phone; `min-width: 0` on the labels is a belt to that)" | keep as intent (plan row confirmed) | "and a select is as wide as its widest option's text, so the options are bare names, and `min-width: 0` on the labels keeps a long one from overflowing a phone" |
| `devdocs/notation.md#The rule > The width` (lines 127-133) | "The first rule tied the fit to the display digits, each part fitting within them; that coupled a length to a precision…, hid exact values…, and could not be read off the settings." | keep as intent (plan row confirmed) | the ruled-out alternative in the present tense; the text is under Proposed edits |
| `docs/settings.md#(top) > Display digits` (line 36) | "eight by default, as GNU units shows" | drop (found; not a superseded design but the framing decision of §12, question 2, listed here so that it is applied with the rest) | "eight by default" |
| `docs/settings.md#(top) > Precision limit` (lines 117-119) | "The panel's line says the limit's own top under the significand limit and the finest grid as numbers, never as a formula." | update (found) | the line says the top ("From 1 to 2,453 digits, up to the significand limit."); the ceiling appears as a number only in the probe's proposal; the panel never writes it as a formula (`src/settings-lines.ts:143-152`, `:243-244`; `src/settings-panel.ts` has no ceiling) |
| `devdocs/settings.md#The probe` (lines 458-460) | the quoted proposal "exact products up to 65,536 bits and the built-ins at 4,040 digits within 50 ms: significand limit 65,536 bits, precision limit 1,000 digits" | update (found) | the line now reads "Exact products at 65,536 bits took 2.3 ms and the built-ins on a grid of 4,040 digits took 45 ms, within the 50 ms budget: significand limit 65,536 bits, precision limit 1,000 digits" (`src/settings-lines.ts:237-250`); paraphrase it and name `proposalLine` rather than quote it, so the page cannot drift again |

## Findings

### The per-setting table of §3

Every row of §3 is confirmed: the stored keys, the model parameters, the defaults and the ranges all match `src/settings.ts`, `src/core/context.ts` and `src/core/rounding.ts`, and the derived numbers (2,453 and 358) come out of `precisionLimitFor` and `MIN_SIGNIFICAND_LIMIT_BITS` when run. Two notes for the table: the extended count's "default" is the display digits only until an extended count has been seen in the session, after which the panel offers that count again (S7); and the ratio width is unclamped but a stored width outside 1 … 1,000 makes the whole mode fall back to exact mode with digits, where a stored extended count outside its range is clamped (S5; the asymmetry is a question below).

### The clamp table

Read from `rangesOf` (`src/settings.ts:496-518`), `CLAMP_ORDER` (`:524-528`) and the lines of `src/settings-lines.ts:196-229`; the lines were produced by running the functions.

| Setting | Lowest | Highest | Moved by a change above it | The panel's line |
| --- | --- | --- | --- | --- |
| Significand limit | 358 bits (the app's) | 1,048,576 bits (the app's) | never; an edit past a bound is refused | "At least 358 bits.", "At most 1,048,576 bits." |
| Precision limit | 1 digit | `precisionLimitFor` of the significand limit (2,453 digits at 65,536 bits; 26 at 1,024; 1 at 358) | lowered when the significand limit is lowered below what holds it | "Lowered from 1,000 to 26 digits to fit the significand limit."; refused edit: "At most 2,453 digits under the significand limit." |
| Display digits | 1 digit | the precision limit | lowered when the precision limit falls below them | "Lowered from 8 to 5 digits to fit the precision limit."; refused edit: "At most 1,000 digits under the precision limit." |
| Working digits, the extended count | the display digits | the precision limit | raised when the display digits rise above the count (the one upward move); lowered when the precision limit falls below it; clamped last, after the two above | "Raised from 16 to 20 digits to the display digits."; refused edit: "At least 8 digits, the display digits." |
| Ratio width | 1 digit | 1,000 digits | never | "At least 1 digit.", "At most 1,000 digits." |
| Probe budget | 10 ms | 10,000 ms | never | "At least 10 ms.", "At most 10,000 ms." |

A value that is not a whole number is refused with "A whole number." in every ranged setting. The order of the clamps is the precision limit, then the display digits, then the working digits, each under the values the earlier clamps left (`clampsOf` at 358 bits with an extended count of 16 reports three moves in that order: 1,000 to 1, 8 to 1, 16 to 1). A clamp writes the value, so restoring the significand limit afterwards moves nothing back (run: `withDefault` after the clamp to 26 reports no clamp and leaves 26). The load path applies the same clamps and reports nothing (`src/settings.ts:359-387`).

### The probe procedure

From `src/limits.ts:205-281` and `realProbe` (`:127-155`):

1. Candidates for the significand limit: the setting's floor (358 bits), then the powers of two from 512 up to the hard bound (`bitCandidates`, `:252-258`). Each is timed as the shortest of three runs after one untimed run (`timed`, `:272-281`); the operation is `multiplyWithin` on two fractions of the candidate's bits in each part, built outside the timed call and memoized by size (`:131-144`). The largest candidate within the budget is kept, or the floor with its time when none fits (`largestWithin`, `:234-249`, which stops at the first candidate over the budget).
2. Candidates for the precision limit: 1, 2 and 5 times a power of ten up to `precisionLimitFor` of the significand limit just chosen (`roundNumbers`, `:261-269`); the operation is the composite `sin(atan(exp(1)) + ln(3) radian)` (`COMPOSITE`, `:94`), evaluated through the evaluator at the ceiling the candidate would give, against a table of the one primitive `radian !kind` built at that context (`evaluateComposite`, `:162-172`). The same selection rule applies.
3. The proposal carries both limits and the time of each operation at the chosen size (`Recommendation`, `:105-112`); `proposalLine` writes them against the budget and says when the floor itself cost more than the budget (`src/settings-lines.ts:237-250`).
4. "Apply" emits the two limits as one change, which the shell clamps and tells as it does any edit (`src/settings-panel.ts:998-1003`); nothing changes before that.

The probe runs on the main thread only when pressed; the button shows "Measuring…" meanwhile (`src/settings-panel.ts:863`). It measures time alone (`src/limits.ts:57-61`).

### The page's examples through the harness

Every worked example on `docs/settings.md` was evaluated through `outcomeOf` against the system table at the settings the page names. All hold except three:

| Where | The page says | The app shows | Note |
| --- | --- | --- | --- |
| `docs/settings.md:55` | `1 / (1 / 3 * 3 - 1)` is `= -100000000` | `= -1e+8` | nine digits at eight display digits go to exponent notation (N12); the value is right, its written form is not |
| `docs/settings.md:77` | `in = (1/36) × 3 ft` on the second line of `3 ft = 36 in` | `in = 1/36 × 3 ft` | the ratio is parenthesized before a unit and bare otherwise, before `×` included; `1 m` in `in` gives `in = 127/5000 × 1 m` the same way |
| `docs/settings.md:82` | `(1/3) * 1e30 = 1/3 × 1e+30`, "which reads back as itself" | typed back as `1/3 × 1e+30` it is a parse error ("Unexpected ×"); `1/3 * 1e+30` reads back | §12, question 11: `×` is not accepted by the grammar; the copy button writes `*` |

Confirmed as written: `1 m` in `in` at eight and twelve digits (`≈ 39.370079 in`, `≈ 39.3700787402 in`), `39.3700787401` rounded down; `0.125` at two digits `0.12` and `0.135` `0.14`; `1 / 3 * 3` as `= 1` in exact mode and `= 0.99999999` in decimal mode; `1 ft` in `in` `= 12 in` in both modes; `1 m = (5000/127) in`, `1 in = (127/50) cm`, `m / (3 m) = 1/3`, `1 m = 3 ft + (428/127) in`, `3^20 = 3486784401` against `≈ 3.4867844e+9`, `sqrt(2) m ≈ 1.4142136 m`; `ln(exp(1/10))` as `= 0.099999984`, `= 0.1` over twelve working digits, `= 0.099999999` toward zero; `(2^(1/2))^2 - 2` as `≈ 0` with a zero note after nine passes, and `1 / ((2^(1/2))^2 - 2)` refused as "cannot be told from zero at this precision"; `10^1000000000 = 1e+1000000000`; `2^-30000` and `3^-100000` refused with the suggestion of `approx` or decimal mode (the first "about 69,659 bits", the second "about 158,497 bits"), `2^-28000` a value; `1e999999999 + 1` refused and `approx(1e999999999) + 1 ≈ 1e+999999999`; `factorial(20000)` and `2^1e-30000` refused "however it is computed", suggesting nothing; `3^1000000000` refused at once. The uncertified line and the partial note ("8 of 12 digits are certain") were not reproduced; N18 says no shipped built-in reaches the first and §1.1.6 item 13 leaves the second to A2.

### Gaps of §6.5, confirmed, refuted or added

- Confirmed: one entry per control with stored key, default, range and what bounds it, and the effect in each mode. Today the Notation bullet gives the width's default but not its range, the Precision limit bullet gives no range (its top under the significand limit appears only in the "top-down" paragraph), and the Significand limit bullet gives no range at all; the proposed text below supplies them.
- Confirmed: the clamp chain and the refusals as a short table; today they are one paragraph (`docs/settings.md:164-173`).
- Confirmed: "Measure this device" as a procedure, with the correction of §9.4 (the elementary composite, not "the costliest built-ins"); today one paragraph (`docs/settings.md:173-182`).
- Confirmed: the ratio width and the extended working digits as entries of their own; today each is a clause inside its parent's bullet.
- Confirmed: the removals. The update-check paragraph (`docs/settings.md:184-190`) is D9's and goes to `app.md`; the two tail paragraphs (`:192-205`) and `#How a number is held…` (`:207-271`) are D8's, which supplies the sentence that replaces each; the sheet's layout (`:3-9`) goes to `app.md` beyond what a user needs to find a control.
- Refuted: none.
- New: the Precision limit entry's statement about the panel's line is wrong (see Stale passages); the entry should say where the ceiling can be seen, which is the probe's proposal only.
- New: that "Apply" goes through the same clamp-and-tell as an edit, so a proposal that lowers a setting the user raised is told before it lands (`devdocs/settings.md:462-466`, `src/settings-panel.ts:998-1003`); the page says only that nothing changes until Apply is pressed.
- New: the Rounding entry does not say that the mode also governs `round()` (§3's row and N11); one clause with a link to the function reference.
- New: a stored value a build cannot read falls back to its default without a word, and a stored object from a newer build gives the defaults (`src/settings.ts:322-334`, `:359-387`); a user who rolls back or edits storage sees the defaults with no notice. One sentence in the storage paragraph.
- New: the sheet offers the last ratio width and the last extended count again in a session when `ratio` or `extended` is chosen again (`src/settings-panel.ts:446-453`, `:449`); the page says only that coming back from decimal mode "finds digits again". A clause in the Notation and Working digits entries, or `app.md`'s.

### Context claims of §1 touched

N8, N11, N19 and N21 hold as far as this unit's modules reach (see the Claims table). N13 is silent on the ratio before `×`, where the app writes it bare, and the docs page contradicts the app there; the claim is not rewritten here. N21's "`2^-30000` costs 69,658 bits" is the true size of `5^30000`, while the app's refusal estimates "about 69,659 bits": a one-bit gap between the message and the pages, for A5 and the owner (question 2).

### Measurements, timings and links outside the principles

- Timings in the pages (§12, questions 9 and 25): `devdocs/settings.md:411-413` "a few milliseconds that the shell memoizes by the ceiling"; `:472-473` "a thousand digits of `gamma(0.3)` take tens of milliseconds"; `:478-479` and `docs/settings.md:181-182` "for a fraction of a second", which depends on the budget (the probe runs each candidate four times, up to the first candidate over the budget). The proposed edits make each qualitative.
- Links against the ownership direction (§9.2) in `docs/settings.md`, written as inline code and not as links: `:27`, `:32`, `:62`, `:91`, `:107`, `:186`, `:271`. The proposed text replaces each with a link to the owning docs page.
- Reference-style issue links in the unit's devdocs sections, to become inline links at the one owning passage (§12, question 26): `[#167][167]` (`devdocs/settings.md:404`), `[#118][118]` (`:475` and `:512`, twice in one section), `[#163][163]` (`:479`), `[#191][191]` (`:674`), `[#178][178]` (`devdocs/notation.md:135`), `[#172][172]` (`devdocs/numbers.md:1259`). The definitions at each page's foot go with the page-wide sweep of V1 and V5.
- The decimal-mode step list on `docs/settings.md:57-60` ("each `+`, `*`, `/` or `^`, each number typed, each unit, and each function call") omits `-` and juxtaposition against N17; the proposed entry links to `numbers.md` for the list rather than restating it.
- The panel's own lines carry two of the wordings the owner has ruled on for the docs: `MODE_LINES.exact` says "Every digit shown is certain" (`src/settings-lines.ts:261`; §12, question 8) and `PROBE_LINE` says "the costliest operations" (`:188`; §12, question 23). Both are code text (question 1).

## Proposed edits

Headings named after `numbers.md` are §5's proposed owners ("Digits you can trust", "The two modes", "How a value is held", "Values too big to hold", "How an exact value is written") and are to be fixed to the headings `numbers.md` lands with. Links are written as the pages write them today, the page linked and the heading quoted.

### docs/settings.md#(top)

The complete proposed text of the page above the sections D8 and D9 dissolve. It lists the controls grouped as the sheet groups them and nested by mode (§12, question 16), gives every entry its key, unit, default and range with what bounds it, links to `numbers.md` for the foundation instead of restating it (§12, question 5), and corrects the three examples.

```markdown
# Settings

The settings open from the cog in the top right corner, as a sheet over
the page that leaves the result in view, and every change applies as it
is made, so the result shows what a setting does while it is changed.
How the sheet itself works, on a phone and on a wider screen, is in
[app.md](app.md). Under each control a line opens with the number's
range and names the setting that bounds it ("From 1 to 1,000 digits, up
to the precision limit."), then says in a sentence what the setting
does; this page says the rest. The settings are kept in the browser, so
that they survive a reload, under a format version of their own, so that
a later build migrates what an earlier one stored; a stored value that a
build cannot read, or one written by a newer build, falls back to its
default without a notice.

Every number carries its unit, after the input on screen and in its
stored key: digits, bits or milliseconds. Beside the name of any setting
that is not at its default, a "default …" link names the default and
restores it when pressed, with what depends on it clamped and told as
after any change, and "Reset all settings" at the foot of the sheet
restores every default; a setting at its default has no such link, so a
glance shows what has been changed.

The controls sit in three groups, by what each is for: how a result is
shown, how it is computed, and how much it may cost. The mode carries
one more control under it, which one depending on the mode.

## How it is shown

- **Display digits** (`displayDigits`, in digits; 8 by default; from 1
  up to the precision limit): how many significant digits an answer is
  shown with. In exact mode they are the digits that must be certified
  before the answer is shown ([numbers.md](numbers.md), "Digits you can
  trust"): `1 m` in `in` is `≈ 39.370079 in` at eight digits and
  `≈ 39.3700787402 in` at twelve. In decimal mode they are also the
  digits of every value: a number typed with more is rounded to them as
  it is read, and every step is rounded to them unless the working
  digits are extended ([numbers.md](numbers.md), "The two modes").
- **Notation** (exact mode; `mode.notation`, `digits` or `ratio`;
  digits by default): how an exact value is written, as its digits or
  as a ratio of two whole numbers in lowest terms. With `ratio` chosen,
  the **ratio width** appears beside it (`mode.notation.width`, in
  digits; 20 by default; from 1 to 1,000, bounded by nothing): the most
  digits of an exact value written entire, a whole number or a ratio's
  two parts together, and the one thing that decides whether a line is
  a ratio ([numbers.md](numbers.md), "How an exact value is written").
  `1 m = (5000/127) in`, `1 in = (127/50) cm`, `m / (3 m) = 1/3`, a unit
  list as `1 m = 3 ft + (428/127) in`, `3^20 = 3486784401` where the
  digits notation writes `≈ 3.4867844e+9` at eight digits, and
  `(1/3) * 1e30 = 1/3 × 1e+30`, a ratio that fits only with its power
  of ten factored out; anything longer is a decimal at the display
  digits, and an inexact value is always a decimal
  (`sqrt(2) m ≈ 1.4142136 m`). The ratio is in parentheses before a
  unit, since `5000/127 in` would read as `5000 / (127 in)`, and bare
  otherwise, as on the reciprocal line `in = 1/36 × 3 ft` of
  `3 ft = 36 in`. The notation changes how an exact value is written,
  never what is exact. It is a setting of exact mode alone, since in
  decimal mode every value is a decimal of the display digits; choosing
  decimal mode and coming back finds `digits` again, and choosing
  `ratio` again in the same session offers the last width.

## How it is computed

- **Mode** (`mode.kind`, `exact` or `decimal`; exact by default). Exact
  mode certifies every digit shown, computing at rising precision until
  the display digits are certified, and never rounds an exact value:
  `1 / 3 * 3` is `= 1`. Decimal mode rounds every step to the display
  digits in the rounding mode, as a hand calculator does, and the
  rounded value is the value: `1 / 3 * 3` at eight digits is
  `= 0.99999999`, and `1 / (1 / 3 * 3 - 1)` is `= -1e+8`; every answer
  is written with `=`, since every value is exact under the mode's
  rounding. What counts as a step, how a function's call is certified
  and rounded once, and the rare line marked `≈` with a dot above it
  are in [numbers.md](numbers.md), "The two modes". A value with the
  display digits or fewer is exact in either mode (`1 ft` in `in` is
  `= 12 in`). Under the mode sits the control that belongs to it: the
  notation in exact mode, the working digits in decimal mode.
- **Working digits** (decimal mode; `mode.working`, locked to the
  display digits or `extended` with a count; locked by default): with
  `extended` checked, a count appears (`mode.working.digits`, in
  digits; the display digits by default, or the last count chosen in
  the session; from the display digits up to the precision limit), and
  every step but the last is rounded to that many digits, while the
  answer is rounded to the display digits directly from the exact result
  of its last step, as a calculator keeps hidden digits behind its
  display ([numbers.md](numbers.md), "The two modes"): `ln(exp(1/10))`
  at eight digits is `= 0.099999984`, the first rounding's error having
  been amplified, and over twelve working digits it is `= 0.1`;
  `1 / 3 * 3` is `= 0.99999999` and `= 1`. Under a directed rounding
  mode the answer is the neighbor of a value that sits on the grid, as
  that mode asks (`0.099999999` toward zero), since the working digits
  change what is rounded, never how.
- **Rounding** (`rounding`; to nearest, ties to even, by default): one
  of the seven standard modes, to nearest with ties to even, away from
  zero or toward zero, and the four directed modes, toward zero, away
  from zero, up and down. Ties to even is IEEE 754's default and
  unbiased over many roundings where ties away from zero drift:
  `0.125` at two digits is `0.12` and `0.135` is `0.14`. In exact mode
  the rounding mode rounds the last digit shown; in decimal mode it
  rounds every step, the last digit shown with it; and it is the mode
  `round()` rounds in ([functions.md](functions.md)). The directed modes
  show the value on the side they name, so at twelve digits `1 m` in
  `in` is `39.3700787401` rounded down and `39.3700787402` to nearest
  ([numbers.md](numbers.md), "Digits you can trust").

## How much it may cost

- **Precision limit** (`precisionLimitDigits`, in digits; 1,000 by
  default; from 1 up to what the significand limit holds, 2,453 digits
  at its default): the most digits an answer, or the working digits,
  may be asked for, and a limit on effort. Exact mode certifies an
  answer by computing on finer and finer grids up to a ceiling, the
  finest grid the app rounds onto, which is four times this limit plus
  ten digits, and an expression whose digits can never be certified
  (`(2^(1/2))^2 - 2`, which is zero within a bound) runs all the way up
  on every keystroke; in decimal mode a step's rounding is certified on
  grids up to the same ceiling ([numbers.md](numbers.md), "Digits you
  can trust"). The ceiling is derived from the limit and never set; the
  one place it is shown is the probe's proposal, below. Changing the
  limit rebuilds the unit table, since the angle units carry `pi()` to
  the ceiling; changing the display digits never does.
- **Significand limit** (`significandLimitBits`, in bits; 65,536 by
  default; from 358 to 1,048,576, bounds of the app's): a value is held
  as a fraction in lowest terms times a power of ten, and this is the
  most bits the fraction's numerator and, separately, its denominator
  may have ([numbers.md](numbers.md), "How a value is held"); 65,536
  bits is a numerator or a denominator of about 19,700 digits, and the
  control's line says the digits for the limit in force. It is a hard
  limit on cost, in time and in memory, not on how large a value may
  be, since the power of ten is free. No exact value past it is ever
  formed: an exact result that would pass it is refused, and the
  message names the part of the expression at fault, says how many bits
  it would need and, where the same step would fit computed inexactly,
  suggests `approx(…)` around the operand it names or decimal mode
  ([numbers.md](numbers.md), "Values too big to hold"). Inexact values
  are never refused for size, being kept to a grid; a grid point at the
  ceiling must fit within the limit with room for a product of two,
  which is how this limit bounds the precision limit.
- **Probe budget** (`budgetMs`, in milliseconds; 50 by default; from 10
  to 10,000, bounds of the app's): the time "Measure this device",
  below, allows one pass. A setting of the probe alone; it never touches
  the arithmetic.

## How the settings bound each other

The limits are set top-down, and the bounding setting always wins: a
limit is a cost bound the user set, and an edit to a setting under it
must not raise it unasked.

| Setting | Lowest | Highest | Moved by a change above it |
| --- | --- | --- | --- |
| Significand limit | 358 bits | 1,048,576 bits | never |
| Precision limit | 1 digit | what the significand limit holds (2,453 digits at the default) | lowered when the significand limit no longer holds it |
| Display digits | 1 digit | the precision limit | lowered when the precision limit falls below them |
| Working digits, the extended count | the display digits | the precision limit | raised when the display digits rise above it; lowered when the precision limit falls below it |
| Ratio width | 1 digit | 1,000 digits | never |
| Probe budget | 10 ms | 10,000 ms | never |

An edit within a setting's range is accepted. One past a bound is
refused, the input shows the setting in force again, and a line under
it names the bound and the setting that sets it ("At most 2,453 digits
under the significand limit.", "At least 8 digits, the display
digits.", "A whole number."). An accepted edit that lowers a limit
lowers what depends on it, and a line under each setting moved says so
until the next change ("Lowered from 1,000 to 26 digits to fit the
significand limit.", "Raised from 16 to 20 digits to the display
digits."). A clamp writes the value, so raising the limit back
afterwards does not restore what it lowered. A "default …" link and
"Reset all settings" clamp and tell the same way.

## Measure this device

The defaults are the app's and depend on no device. Both limits are
cost limits whose right values do depend on the device, so the sheet's
"Measure this device" button (the probe) proposes them:

1. For the significand limit, it times the costliest exact operation, a
   product of two fractions of the candidate's bits in each part, at
   the limit's lowest value and then at sizes doubling up to its
   highest, and keeps the largest size whose product stays within the
   budget.
2. For the precision limit, it times one expression of the four
   costliest elementary functions (`sin`, `atan`, `exp` and `ln`, each
   once), evaluated once at the ceiling each candidate would give, for
   candidates of 1, 2 and 5 times a power of ten up to what the
   proposed significand limit holds, and keeps the largest within the
   budget. The Gamma and Beta families are deliberately not timed: a
   limit low enough for their costliest pass would put values that are
   within reach out of reach, and a value that certifies is cheap at any
   limit.
3. Each size is timed as the shortest of three runs after one that is
   not timed. The budget is per pass, since an expression that runs to
   the ceiling costs about twice its last pass, so that such an
   expression answers within a keystroke at the limits proposed.
4. The proposal shows the sizes and the timings it found against the
   budget, and says so when even the lowest value of a limit cost more
   than the budget. Nothing changes until "Apply" is pressed, and
   applying goes through the same clamp-and-tell as any edit, so a
   proposal that lowers a setting is told before it lands.

The probe runs only when pressed, on the main thread, and the page
waits while it runs. It measures time alone, not memory.
```

What follows on the current page is not kept here: the paragraph on the build number (`docs/settings.md:184-190`) goes to `app.md` (D9); the two paragraphs on notes and relations (`:192-205`) and the section `#How a number is held, and what the settings touch` (`:207-271`) dissolve into `numbers.md` (D8, which writes the sentence that replaces each). The decimal-mode step list and the GNU note go.

### docs/settings.md#How a number is held, and what the settings touch

Dissolved into `numbers.md` by D8 (§6.1, §6.5); this unit proposes no text for it. Two facts it states that the settings entries above keep in a sentence each, with a link: a grid point at the ceiling must fit inside the significand limit with room for a product of two (the two limits meet; `src/core/context.ts:243-262`), and in exact mode no digits setting touches an exact value.

### devdocs/settings.md#The model

Old → new pairs; the section's rewrite to build on `numbers.md` and `settings.md` is V5's.

- Lines 207-210, old: "drift; the stored value of the earlier default, `halfAwayFromZero`, echoed by every save of some other setting far more often than chosen, was migrated to `halfEven` once, with the control one tap away. The rounding mode rounds…" → new: "drift. The rounding mode rounds…"
- Lines 41-42, old: "the error bound that decides which digits are certain" → new: "the error bound that decides which digits are certified"
- Line 49, old: "the schedule raises the grid until that many digits are certain" → new: "the schedule raises the grid until that many digits are certified"
- Lines 43-44, old: "a finer grid is necessary for more certain digits and never sufficient" → new: "a finer grid is necessary for certifying more digits and never sufficient"

### devdocs/settings.md#Applying a change

- Lines 411-413, old: "A change to the precision limit rebuilds the unit table, a few milliseconds that the shell memoizes by the ceiling and that no other setting incurs." → new: "A change to the precision limit rebuilds the unit table, a build the shell memoizes by the ceiling and that no other setting incurs."
- Line 404, old: "([#167][167])" → new: "([#167](https://github.com/bsidhom/exucal/issues/167))", and the definition line `[167]: …` at the page's foot goes with V5's sweep.

### devdocs/settings.md#The probe

- Lines 457-460, old: "and its `Recommendation` carries the time of each operation at the recommended size, so that the proposal can say them ("exact products up to 65,536 bits and the built-ins at 4,040 digits within 50 ms: significand limit 65,536 bits, precision limit 1,000 digits"); a floor that cost more than the budget is said to have ("over the 50 ms budget at the least this device may be set to") rather than claimed to fit." → new: "and its `Recommendation` carries the time of each operation at the recommended size, so that the proposal can say them (`proposalLine`: each size with the time it took, against the budget, then the two limits); a floor that cost more than the budget is said to have rather than claimed to fit."
- Lines 472-473, old: "since a value that certifies is cheap at any digits a user asks for (a thousand digits of `gamma(0.3)` take tens of milliseconds) and only an expression that never certifies pays for the ceiling pass." → new: "since a value that certifies is cheap at any digits a user asks for and only an expression that never certifies pays for the ceiling pass."
- Lines 478-479, old: "The probe runs only when pressed, on the main thread, for a fraction of a second (its freeze is [#163][163]);" → new: "The probe runs only when pressed, on the main thread, and the page waits while it runs (its freeze is [#163](https://github.com/bsidhom/exucal/issues/163));"
- Lines 475-476 and 512-513, the two `[#118][118]`: one inline link at the first, "which is [#118](https://github.com/bsidhom/exucal/issues/118)'s and not a limit's", and the second reads "which is the interface's responsiveness and not a setting's" without a link, unless the owner places the issue's one link elsewhere (question 7).

### devdocs/settings.md#The controls

- Lines 623-625, old: "and a select is as wide as its widest option's text (sentences as options once made the panel overflow a phone; `min-width: 0` on the labels is a belt to that)." → new: "and a select is as wide as its widest option's text, so the options are bare names, and `min-width: 0` on the labels keeps a long one from overflowing a phone."
- Lines 672-674, old: "which the sheet ends with a link to ("About these settings", `ABOUT`), pointing at [docs/settings.md](../docs/settings.md) until the guide lands ([#191][191])." → new: "which the sheet ends with a link to ("About these settings", `ABOUT`), the user guide's settings page, [docs/settings.md](../docs/settings.md); what is open about where the link should land is [#191](https://github.com/bsidhom/exucal/issues/191)."

### devdocs/notation.md#The rule > The width

- Lines 127-133, old: "The first rule tied the fit to the display digits, each part fitting within them; that coupled a length to a precision (a user who raised the display digits to see `1/123456789` written as itself lengthened every decimal line too), hid exact values (`3^20` at eight digits was `≈ 3.4867844e+9`, and `(1/3) * 1e30` was `≈ 3.3333333e+29` where `1/3 × 1e+30` is exact and shorter), and could not be read off the settings." → new: "Tying the fit to the display digits instead, each part fitting within them, is set aside: it couples a length to a precision (a user who raises the display digits to see `1/123456789` written as itself lengthens every decimal line too), it hides exact values (`3^20` at eight digits is then `≈ 3.4867844e+9`, and `(1/3) * 1e30` is `≈ 3.3333333e+29` where `1/3 × 1e+30` is exact and shorter), and it cannot be read off the settings."
- Lines 133-135, old: "is [#178][178]." → new: "is [#178](https://github.com/bsidhom/exucal/issues/178)."

### devdocs/numbers.md#The working digits

- Line 1259, old: "settling that vocabulary is [#172][172]." → new: "settling that vocabulary is [#172](https://github.com/bsidhom/exucal/issues/172)." The section's statements all hold against `src/core/context.ts` and the harness; nothing else to change here.

## Terminology

- "certain" for "certified": `docs/settings.md:50`, `:115`, `:194`, `:229-230`; `devdocs/settings.md:42`, `:43`, `:49`; and the panel's own line `MODE_LINES.exact` (`src/settings-lines.ts:261`). Canonical per §8 and §12, question 8: **certified**; the panel's line is a code change (question 1).
- "finest grid" (`docs/settings.md:111-112`, `:119`, `:179`): canonical **ceiling**, glossed once as "the finest grid the app rounds onto", as the proposed Precision limit entry does.
- "sheet" and "panel" for the same surface, both in `docs/settings.md:3-7`, `:67`, `:92`, `:117`, `:175` and in `devdocs/settings.md`; §8 has no row. Proposed: **the settings sheet** (or "the sheet") in docs for what the user sees; **the panel** in devdocs for the component `settings-panel.ts`, mapped once.
- "locked to the display digits" (docs) against "not extended" (the panel's reset, `src/settings-lines.ts:104`) and the `digits` kind (storage) for the working digits' default. Proposed: **locked to the display digits** in docs, with "(the `extended` box unchecked)" once; the stored names stay in devdocs.
- "neighbor" (`docs/settings.md:104`, `devdocs/numbers.md:1234`) against "neighbour" (`src/core/rounding.ts:16`, `:69`, `:109`, `:128`): the pages spell the American way throughout ("behavior", "parenthesized"); proposed: **neighbor** in the pages, and the code's spelling is the code's.
- "the costliest built-ins" (`docs/settings.md:176-177`) and "the costliest operations" (`PROBE_LINE`, `src/settings-lines.ts:188`) for the probe's composite: §12, question 23 calls the first incorrect; proposed wording **the four costliest elementary functions** in docs, and the panel's line is question 1.
- Settled terms met and used as §8 asks: "Measure this device" with "(the probe)" once; "format version"; "whole number"; "ratio width" in digits (§12, question 15); "exact mode" and "decimal mode"; "the reciprocal line".

## Questions for the owner

1. The panel's lines carry two wordings the decisions rule out for the docs: `MODE_LINES.exact` "Every digit shown is certain" (`src/settings-lines.ts:261`) and `PROBE_LINE` "Times the costliest operations" (`:188`). Change the panel's text with the note wording of A2's code change? Proposed answer: yes, to "Every digit shown is certified, found at rising precision; …" and "Times the costliest exact product and the costliest elementary functions at rising sizes and proposes …".
2. The refusal for `2^-30000` says "about 69,659 bits" while N21, `devdocs/numbers.md` and `docs/settings.md:132` say 69,658, the size of `5^30000`. Which figure do the user docs carry? Proposed answer: the pages keep the true size and say "about"; whether the prediction should not overshoot by one is A5's to look at in `src/core/rational.ts`.
3. The docs give the ceiling as "four times this plus ten" while the panel deliberately never writes a formula and shows the number only in the probe's proposal. Keep the formula in the docs entry? Proposed answer: yes, once, in the Precision limit entry with the link to `numbers.md`; the panel stays as it is.
4. `src/settings-lines.ts:258` says "The line each mode has under the Mode select" where the mode is two radios (`src/settings-panel.ts:746-768`): a stale code comment, for a code change. Proposed answer: "under the Mode radios", with the A2 batch.
5. Should devdocs quote the panel's strings at all? The quoted proposal drifted from `proposalLine` without anyone noticing. Proposed answer: name the function and paraphrase, and quote only where the exact text is the point (the refusal lines, which the tests pin).
6. A stored ratio width outside 1 … 1,000 makes the whole mode fall back to exact mode with digits (`src/settings.ts:397-427`), while a stored extended count outside its range is clamped (`:429-443`, `:553-558`). Intended asymmetry? Proposed answer: state it in `devdocs/settings.md#Storage` (V5), or clamp the width like the count; the owner's call.
7. #118 is linked twice in `devdocs/settings.md#The probe` (`:475`, `:512`) and is likely linked from `devdocs/future.md` and `devdocs/cost.md` too; §12, question 26 wants one place. Which passage owns it? Proposed answer: `devdocs/future.md`, the probe section keeping the words "the interface's responsiveness" without the link.
8. "For a fraction of a second" (`docs/settings.md:182`, `devdocs/settings.md:478`) depends on the budget: the probe runs each candidate four times up to the first candidate over the budget. Keep a qualitative phrase or drop the clause? Proposed answer: the docs say "the page waits while it runs"; devdocs keep the mechanism and the issue.

## Notes on this run

The plan's scope held, with four corrections: `devdocs/notation.md#The width` is a bold paragraph label under `#The rule`, not a heading, so the pointer should read `#The rule > The width`; §9.4 locates "the costliest built-ins" partly in the `> Probe budget` bullet, where it does not occur (only the "top-down" paragraph has it); the unit's modules settle every settings mechanism but not the sheet's claims on `docs/settings.md`, which needed `settings-panel.ts` (V5's module), nor the page's many worked examples, which needed the harness (`outcomeOf` against the system table built from `units.txt`, as `outcome.test.ts` does); and the Findings the report format asks for rest on §6.5, which the unit's entry does not list as context. What was hard: telling the three wrong examples from right ones took running them, since each reads plausibly (`-100000000` against `-1e+8`, the parentheses before `×`, "reads back as itself" against the grammar's rejection of `×`). For the next units: D8 should take the three examples' corrections and the "bare before `×`" rule into `numbers.md`; V5 should know that the probe's proposal text in `#The probe` is stale, that `#The controls` and `#Applying a change` otherwise match the code line for line, and that the asymmetry of question 6 belongs to `#Storage`; A5 should look at the one-bit gap of question 2.
