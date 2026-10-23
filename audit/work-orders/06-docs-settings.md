# Work order 06: `docs/settings.md` (Settings)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step, and 2026-10-23 in the review of the page's pull request, #232,
which ordered the page's sections as the settings panel orders its
controls) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D4 (L141-350)` is `audit/reports/D4/fable.md`, lines 141 to 350. `§7`
is `audit/plan/07-docs-outline.md`, `§3` is `audit/plan/03-settings.md`
(every setting with its key, default and range, verified by D4), `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/settings.md`, titled "Settings": every control in
  terms of the model parameter it sets, grouped and nested by mode and
  never counted; foundational detail lives in `numbers.md`, which each
  entry links (§7; §12 questions 5 and 16). The page exists today and
  is rewritten in place: its section `#How a number is held, and what
  the settings touch` and the two tail paragraphs of `#(top)` dissolved
  into `numbers.md` (work order 01), so this session deletes them,
  leaving one sentence at the page's foot that links `numbers.md`
  (F-025); the paragraph on the build ID moves to `app.md` (F-173) and
  is deleted here, and the panel's mechanics are `app.md`'s (F-176),
  one sentence and a link staying.
- **Order.** Sixth, after `numbers.md` (which every entry links),
  `quantities.md`, `expressions.md`, `definitions.md` and `units.md`.
  Later pages link it (`builtins.md` for the rounding mode, `app.md`,
  getting started; the devdocs), so its headings are §7's anchors
  (section 4). It links `builtins.md` and `app.md` before they exist, at
  §7's anchors in lower-case, hyphenated form (section 8).
- **Status.** Ready once the code track's batches 1 and 2 have landed:
  the panel's lines the page may quote (B-068, B-017, B-025, B-026) and
  the stored width clamped like the count (B-012, Q-049), which the
  storage sentence states. D4 drafted the whole page (D4 L141-350); A3,
  A2, A4 and D8 drafted entries or pairs that D4's text absorbs or that
  correct it (section 7).
- **Output.** The page, the deletions, and in the pull request the
  choices made and any question for the owner. This page is the user's
  guide to the settings that #191 asks for, and it lands with this
  refactor (the owner's list, item 9): the pull request says that the
  page closes #191, which the owner closes.
- **Not in scope.** No code; `devdocs/settings.md` is work order 16.

## 2. The reader, and what earlier pages taught

The reader knows the numeric model from `numbers.md`: exactness,
certified digits and the retries up to a ceiling, decimal mode and the
working digits, the two size limits and the dyadic cost, the ratio
notation and the rounding modes' effect. This page says what each
control sets, its default, its range and what bounds it, in each mode,
and links the `numbers.md` section that owns the concept instead of
restating it (`numbers.md#digits-you-can-trust`, `#the-two-modes`,
`#how-numbers-are-written`, `#rounding-modes-and-where-they-act`,
`#values-too-big-to-hold`, `#how-a-value-is-held`, `#what-costs-time`).
The reader has not read `app.md`: where the panel is and how it works
on a phone or a wider screen is that page's; this page says only where
the settings are and that a change applies as it is made.

## 3. Rules that bind the page, applied to D4's draft

- **The settings panel (F-488).** "The settings panel" or "the panel",
  never "sheet": D4 L148, L151, L165, L319 and D9 L157-159, L228-243 say
  "sheet". The page's one sentence on the panel links
  `app.md#the-settings-panel` (F-176).
- **Refusal only for a size refusal (F-442).** What the panel does with
  an edit outside a setting's range is not a refusal in the docs; under
  the owner's answer to conflict 8 of the owner's list (section 8) the
  page says the panel "does not accept" the edit, or that the value is
  "held to" its range, and D4 L305 ("refused") is reworded; the size
  refusals of `numbers.md` keep the word.
- **Inexact, not approximate (F-451).** D4 L281's "inexact values are
  never refused for size" is dropped (F-056, F-049); "inexact"
  wherever a value with a radius is meant.
- **The ceiling (Q-004, Q-005, Q-027).** The Precision limit entry
  alone gives the formula, "four times the sum of the limit and ten
  digits (4,040 by default)" (A3 L86-92), never "four times this limit
  plus ten" (D4 L258) and never "the finest grid the app rounds onto"
  (D4 L258; F-125): the ceiling is "the highest precision any pass
  computes at"; the entry says the ceiling is derived from the limit
  and never set, and written as a number only in the probe's proposal
  (F-126, Q-027). "Grid" is `numbers.md`'s word, explained there once
  (Q-004, B): this page uses it without explaining it again, linking
  `numbers.md` where it first appears (Display digits), and the
  Precision limit entry's link keeps "grid" as its gloss (F-127).
- **The probe (F-491).** "The four elementary functions", `sin`,
  `atan`, `exp` and `ln`, each named once, never "the costliest" (D4
  L322, L328, L333; F-128); the panel's own line is not quoted until
  B-017 has landed (then quoted as the code has it, Q-007).
- **Numbers (Q-016, Q-018).** No timing: "for a fraction of a second"
  reads "the page waits while it runs" (F-131); the stored key's unit
  (milliseconds, D4 L162, L284) and the ranges in the clamp table (D4
  L302) are facts of the setting and stay; "the proposal shows the
  sizes and the timings it found" (D4 L340) describes the panel and
  stays.
- **Future work is `devdocs/future.md`'s alone (Q-011).** The fallback
  of unreadable or newer stored settings is a plain fact (F-133); #167
  and #118 are not named; nothing of the ceiling being shown one day.
- **No devdocs pointers (Q-082).** Every backticked devdocs name goes;
  the owning `numbers.md` section is linked instead (F-134); the
  Notation entry reduces to the setting and a link.
- **The words (§8).** "Certified" in every quoted line, after B-068
  (A4 L111; F-427); "the exponent"; "display digits"; "build ID"
  (F-492); "pastes back", and only of the copy text (F-122: the "reads
  back as itself" clause goes or names the copy); "locked to the display
  digits" and "extended" as §8's row has them (F-490); "the cog" opens
  the panel (F-495); `docs/builtins.md` for `round()` (D4 L246; Q-020).

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link: "Where the
settings are and how a change applies", "Display digits", "Notation and
ratio width", "Mode", "Working digits and the extended count",
"Rounding", "Precision limit", "Significand limit", "Probe budget and
Measure this device", "How the settings bound each other", "Defaults
and resets; storage". The order of the entries is the settings panel's
(decided in the review of the page's pull request, 2026-10-23, §12.3):
the controls grouped by what each is for, as D4 groups them (F-136, §12
question 16), how it is shown (the display digits and, in exact mode,
the notation with its width), how it is computed (the mode, the working
digits under it in decimal mode, and the rounding) and how much it may
cost (the two limits and the probe), nested by mode, never counted
(F-117). The page's summary names the three groups; the sections follow
the panel's sequence, and the panel and the page are to stay aligned,
a later change to the panel's grouping moving both.

- **Where the settings are and how a change applies.** One sentence:
  the settings open from the cog, every change applies as it is made,
  and the panel's mechanics are `app.md#the-settings-panel`'s (D4
  L146-153 reduced; F-176, F-488). The storage sentence (D4 L155-159):
  kept in the browser under a format version of their own; a later
  build migrates what an earlier one stored; a stored value a build
  cannot read, or an object from a newer build, falls back to the
  defaults without notice (F-133), and a stored ratio width out of
  range is clamped like the count (B-012, Q-049).
- **Display digits.** D4 L175-183 and A3 L78-84: "eight by default",
  with nothing of GNU units (F-118, Q-081); the digits that must certify
  in exact mode, the grid of every step in decimal mode; links
  `numbers.md#digits-you-can-trust`.
- **Notation and ratio width.** D4 L184-205 with A2's examples (A2
  L111-114): `in = 1/36 × 3 ft` (F-121, Q-003); the haves as the app
  echoes them, which the session settles by running `m / (3 m)` and
  `(1/3) * 1e30` (F-122); the width as an entry of its own with key,
  default and range (F-123); the panel offers the last width again
  within a session (F-124, F-488); the rule itself is
  `numbers.md#how-numbers-are-written`'s, linked (Q-082).
- **Mode.** D4 L209-222 with A4's corrections (A4 L109-113): exact and
  decimal; the step list is not restated: it moved to
  `numbers.md#the-two-modes`, linked (F-037); `1 / (1 / 3 * 3 - 1)` is
  `= -1e+8` (F-120); the notation is not nested under the mode where D4
  L221-222 puts it (the conflict with F-340 is settled by §3: the
  notation is exact mode's choice, and this page says so without
  nesting the entry).
- **Working digits and the extended count.** D4 L223-237: locked to the
  display digits or extended; the count as an entry of its own, "the
  display digits by default, or the last count chosen in the session"
  (F-123, F-124); links `numbers.md#the-two-modes`.
- **Rounding.** D4 L238-249: the seven modes, the default half even,
  where the mode acts (the display in exact mode, every step in decimal
  mode) and that `round()` rounds in it, with the link to
  `builtins.md#magnitude-sign-and-rounding` (F-119); the directed modes'
  effect at a grid point is `numbers.md`'s.
- **Precision limit.** D4 L253-266 corrected by A3 L86-92 and D8
  L273-277: caps the display and working digits; the formula once, as
  section 3 says; "and, through the ceiling of its passes, the effort an
  expression may cost"; the ceiling derived and never set, written as a
  number only in the probe's proposal (F-125, F-126, F-127); the
  pointer into the dissolved section goes (F-127); links
  `numbers.md#digits-you-can-trust` and `#what-costs-time`.
- **Significand limit.** One sentence and a link to
  `numbers.md#values-too-big-to-hold` (Q-108; §12 question 5): the most
  bits of an exact value's numerator and, separately, denominator;
  65,536 by default, 358 to 1,048,576; "about 69,658 bits" for
  `2^-30000` if the dyadic cost is named at all (Q-091; it is
  `numbers.md`'s); D4's entry (D4 L267-283) otherwise dissolves into
  `numbers.md` (F-049, F-018), and its "never refused for size" is not
  kept.
- **Probe budget and Measure this device.** D4 L284-287 and the
  procedure D4 L316-347 (F-129): what it times, the four elementary
  functions each once (F-128, F-491), what it proposes, and Apply, which
  goes through the same clamp-and-tell as an edit, a proposal that
  lowers a setting the user raised being told before it lands (F-130);
  "the page waits while it runs" (F-131); the panel's line not quoted
  until B-017 has landed.
- **How the settings bound each other.** D4's table (D4 L289-314): the
  chain of clamps, with the panel's lines ("At most 2,453 digits under
  the significand limit"; "lowered from 1,000 to 26 digits …") quoted
  as examples once batch 1 has landed (Q-007), worded under section 3's
  reading of F-442 (F-132).
- **Defaults and resets; storage.** Each setting's default beside its
  entry; that any setting can be reset to its default and all at once
  (one sentence; the links' mechanics are `app.md#the-settings-panel`'s,
  F-176); the storage sentence as above.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-117 | Where the settings are | No count; "the settings panel" |
| F-118 | Display digits | "eight by default"; nothing of GNU units (Q-081) |
| F-119 | Rounding | One clause and a link to `builtins.md` (Q-020) |
| F-120 | Mode | `= -1e+8` |
| F-121 | Notation and ratio width | `in = 1/36 × 3 ft` (Q-003) |
| F-122 | Notation and ratio width | The session runs the two expressions; "pastes back" of the copy text only, or the clause goes |
| F-123 | Notation; Working digits | An entry each with key, default and range |
| F-124 | Notation; Working digits | "the panel offers the last width (count) again" |
| F-125 | Precision limit | The ceiling a pass's precision (Q-004); "grid" only in the link |
| F-126 | Precision limit | "derived, and written as a number only in the probe's proposal" (Q-027); the formula once (Q-005) |
| F-127 | Precision limit | The pointer into the dissolved section goes; the link's gloss is "grid", explained in `numbers.md` |
| F-128 | Probe budget | The four elementary functions, never "costliest" (F-491); the panel's line is B-017's |
| F-129 | Probe budget | D4's procedure |
| F-130 | Probe budget | Step 4: Apply through the clamp-and-tell |
| F-131 | Probe budget | "the page waits while it runs" (Q-016) |
| F-132 | How the settings bound each other | D4's table |
| F-133 | Defaults and resets; storage | The fallback as a plain fact; no issue (Q-011) |
| F-134 | (the page) | Every devdocs pointer goes; `numbers.md` linked (Q-082) |
| F-135 | (the entries) | D4's entries with key, default, range |
| F-136 | (the page) | D4's grouping, headings reconciled with §7's; "the panel"; "inexact" |

Owned elsewhere and read here: F-012 and F-049 and F-053 (the dyadic
cost and the remedies are `numbers.md`'s; the entry keeps a sentence),
F-018, F-019, F-021, F-022, F-024, F-025 (one sentence stays at the
foot), F-027, F-032, F-036, F-037, F-039, F-059, F-061, F-063, F-064
(all `numbers.md`'s, dissolved from this page), F-076, F-172, F-173,
F-175, F-176 and F-180 (`app.md` takes the update paragraph and the
panel's mechanics), F-427, F-429, F-431, F-433, F-436, F-438, F-443,
F-444, F-457, F-488, F-490, F-491, F-492, F-493, F-494, F-495.

## 6. Decisions followed, and still open

Followed: Q-003, Q-004 (B), Q-005 (A), Q-006, Q-007, Q-008, Q-011, Q-016
(A: no timing, run count or measured ratio in the user docs; the stored
unit and the panel's facts stay) and Q-018 (B: a rough duration may stay
where it warns; the probe's "for a fraction of a second" goes all the
same, F-131's docs half following question 9 and Q-016), Q-020, Q-022
(build ID, in `app.md`), Q-027, Q-049 (B: the stored width clamped),
Q-081, Q-082, Q-091, Q-108, Q-115 (the "About these settings" link
changes only when the pages ship with the app; nothing here); the rules
F-442, F-451, F-488, F-490, F-491, F-492, F-493, F-494, F-495.

Still open: nothing. Conflict 8 of the owner's list (how the pages name
the panel's declined edits) is answered: "does not accept" and "held
to" (section 3).

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| Opening; Defaults, resets and storage | D4 L146-171; D9 L155-163 | D4's, reduced to one sentence on the panel plus the storage sentence; D9's draft shows what moves to `app.md` | "sheet" to "panel" (L148, L151, L165); the mechanics and the reset links' mechanics to `app.md`; the clamped width added |
| Display digits | D4 L175-183; A3 L78-84 | D4's entry | "eight by default" only |
| Notation and ratio width | D4 L184-205; A2 L111-114 | D4's entries with A2's examples | the echoed haves settled by running them; "reads back as itself" goes or names the copy text (F-457) |
| Mode | D4 L209-222; A4 L109-113 | D4's entry with A4's "certified" | the step list linked, not restated; the notation not nested under the mode |
| Working digits | D4 L223-237 | D4's entries | "locked" and "extended" per §8 (F-490) |
| Rounding | D4 L238-249 | D4's entry | `builtins.md` for `functions.md` (L246) |
| Precision limit | D4 L253-266; A3 L86-92; D8 L273-277 | A3's formula wording in D4's entry | "the finest grid" never as the ceiling's gloss, no "plus ten" (L258); Q-027's sentence |
| Significand limit | D4 L267-283; D8 L180-190, L232-265 (for what leaves) | one sentence and a link | the dyadic cost and remedies are `numbers.md`'s; "never refused for size" dropped |
| Probe budget and Measure this device | D4 L284-287, L316-347 | D4's entry and procedure | "costliest" gone (L322, L328, L333); "for a fraction of a second" gone; "sheet" (L319) |
| How the settings bound each other | D4 L289-314 | D4's table | "refused" (L305) reworded per section 3 |
| Deleted: `#How a number is held…`, the tail paragraphs, the build-ID paragraph | D8 L66-70, L267-271; D9 L161; D4 L350-354 | the deletions | one sentence stays at the foot linking `numbers.md` (F-025) |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"), both
answered: conflict 1, forward links, confirmed as the rule (this page
links `builtins.md#magnitude-sign-and-rounding` and
`app.md#the-settings-panel`); conflict 8, the panel's declined edits,
"does not accept" and "held to".
The session records in its pull request the echoed forms it ran
(F-122) and the panel lines it quotes.

## 9. Code changes it waits on

- **Before the page:** batch 1 of work order 00 (B-068, B-017, B-025,
  B-026: the panel's lines the page quotes) and B-012 (the stored width
  clamped, Q-049; batch 2).
- **Complicates, no wait:** B-013 ("about 69,658"), B-004 (no dyadic
  example in the Notation entry from `2^-41` to `2^-63` until it lands).

## 10. Done when

- Every section of section 4 exists under its heading, in order, each
  entry with key, default, range and what bounds it, linking `numbers.md`
  rather than restating it; the dissolved sections and the build-ID
  paragraph are gone, one sentence at the foot linking `numbers.md`.
- No "sheet", no count of the settings, "the finest grid" never as the ceiling's gloss, no "four
  times this limit plus ten", no "costliest", no timing, no devdocs
  pointer, no "refused" for a declined edit, no "inexact values are
  never refused for size", no issue number, no `docs/functions.md`.
- Every link is a repo-relative path to an existing page or to a §7
  anchor of `builtins.md` or `app.md`.
- The pull request names the choices made and any question for the
  owner, and changes nothing outside this file.
