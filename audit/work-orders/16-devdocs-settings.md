# Work order 16: `devdocs/settings.md` (The settings)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V5 (L149-175)` is `audit/reports/V5/fable.md`, lines 149 to 175. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§3` is
`audit/plan/03-settings.md` (amended), `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/settings.md`, "The settings": the model behind the
  settings (the fields, the names, how the two limits meet in the
  grid, the ceiling, the three cost numbers and the shapes ruled out,
  the rounding default), the storage format and its migrations, how a
  change is applied and clamped, the probe, the panel and why it is
  shaped as it is, the controls, and where the code lives; for every
  user-facing rule it links `docs/settings.md` and `docs/app.md`, the
  owners, instead of restating it (§7.1; §3).
- **Order.** Sixteenth: after the user pages it links
  (`docs/settings.md`, `docs/app.md`, `docs/numbers.md`) and after
  `devdocs/numbers.md`, `devdocs/architecture.md` (the shell) and
  `devdocs/builtins.md` (the memos the probe leaves, Q-110), which it
  links (Q-008). Later pages link it (`cost.md`, `future.md`,
  `README.md`), so a heading is renamed only by updating every link
  to it; this page renames one, `#The sheet` to `#The panel` (F-488),
  and the session updates every inbound link to it in the same pull
  request (it searches `devdocs/` and `src/` for the old anchor). This
  page links `devdocs/cost.md` and `devdocs/future.md`, written later,
  at their current headings.
- **Status.** Ready once the code track's batch 1 (B-026: the
  proposal's wording the page paraphrases; B-068) and batch 2's B-012
  have landed: a stored ratio width out of range is then clamped like
  the count, and `#Storage` states one rule (Q-049, B; F-333). V5
  audited the whole page (its edits, V5 L145-219); D4 drafted pairs
  that fall inside V5's (section 7).
- **Output.** The page in one pass, with the heading renamed and its
  inbound links updated, and in the pull request the choices made and
  any question for the owner.
- **Not in scope.** `docs/settings.md` (work order 06) and
  `docs/app.md` (08); the code (B-012, B-026, B-069 are the code
  track's); the probe's memo claim is checked, not changed (Q-110).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `docs/settings.md` (each
setting, its range and default, what it does, how the settings bound
each other, defaults, resets and storage from the user's side, the
probe and "Measure this device"), `docs/app.md` (the settings panel:
how it opens, closes and is used, and that every change applies as it
is made), `docs/numbers.md` (how a value is held, the digits an
inexact value is kept to, the ceiling as the highest precision any
pass computes at, the two limits) and `devdocs/numbers.md` (the
schedule, the grid, the memoized constants). Each section opens with
one sentence linking the owner (V5's map, V5 L98-101; F-344: the
targets are `docs/settings.md`'s headings as work order 06 fixed them,
`#where-the-settings-are-and-how-a-change-applies`, `#precision-limit`,
`#significand-limit`, `#probe-budget-and-measure-this-device`,
`#how-the-settings-bound-each-other`, `#defaults-and-resets`,
and `docs/app.md#the-settings-panel`), and then keeps the mechanism
(`Settings`, `NumberContext`, `bitsFor`, `MIGRATIONS`, `withDefault`,
`clampsOf`, `clampSettings`, `clamps`, `clampLine`, `proposalLine`,
the probe's steps), the decisions with their reasons and the
alternatives, in the present tense.

## 3. Rules that bind the page, applied to the drafts

- **"The settings panel", never "sheet" (F-488).** The heading `#The
  sheet` becomes `#The panel`; V5's text names the sheet throughout
  (V5 L147-219: L159, L207-211, L213-219; D4 L380) and every
  occurrence reads "the panel", including V5's opener for the section,
  "`docs/app.md` tells a user how the panel opens, closes and is used;
  this section is why it is shaped as it is" (V5 L209), and the
  controls' reason, "(a sentence as an option overflows a phone)" (V5
  L38, L215; F-341).
- **"Inexact", never "approximate" (F-451).** V5 L155's "the digits an
  approximate value is kept to" reads "the digits an inexact value is
  kept to".
- **The ceiling and the grid (Q-004, B; F-429; Q-027).** "The finest
  grid the app rounds onto" (V5 L157, L161, L165) becomes the ceiling,
  glossed once as the highest precision any pass computes at; "grid"
  stays as the devdocs' word for the digits a value is kept to, a
  grid point being a significand over a power of ten (V5 L161 keeps
  its mechanism); "derived and shown, never set" (V5 L165) reads
  "derived, and written as a number only in the probe's proposal,
  never set" (F-331, Q-027); "the grid the built-ins ran on" (V5
  L199) reads "the precision the built-ins ran at" (F-339).
- **"Certified" (Q-006, F-427).** D4's three pairs (D4 L361-363) apply
  inside V5's replacement: "the error bound that decides which digits
  are certified", "until that many digits are certified", "necessary
  for certifying more digits and never sufficient" (B-068 first).
- **Future work is `devdocs/future.md`'s alone (Q-011, Q-013 B).** #118
  is named in words, "the scheduler the interface needs to stay
  responsive while a slow pass runs", with a link to
  `future.md#Extensions that fit`, never the number (D4 L375, V5 L201,
  L205, L211; F-343, F-418). #186 (the settings' typing riding that
  scheduler, V5 L211) and #167 (a warning path a user sees, D4 L368,
  V5 L189) are future work (the owner's list, items 8 and 7,
  confirmed): the page states the plain facts, that the debounce is the
  panel's own device today and that a stored value that fails to
  parse falls back silently, and links `future.md` for what may come,
  with neither number. #163 (the probe's freeze) is a bug and stays
  inline at `#The probe`, "(its freeze is open, #163)" (V5 L203; D4
  L374). #191 is resolved by this rewrite (item 9, confirmed: the user's
  guide to the settings lands with this refactor): the controls'
  sentence states where the "About these settings" link lands and
  names no issue (F-342; Q-115: the link stays the absolute URL until
  the pages ship with the app, B-069).
- **Which numbers the page keeps (Q-016, Q-018, Q-088).** A timing in
  `#Applying a change` and `#The probe` is qualitative, or a rough
  figure marked illustrative where it adds weight (F-338): "a few
  milliseconds that the shell memoizes" (page L411-413) becomes "a
  cost the shell memoizes by the ceiling" (V5 L191) or D4's "a build"
  (D4 L367); "for a fraction of a second" (page L478) may stay as a
  rough, generous duration (Q-018, B) or become "the page waits while
  it runs" (D4 L374); "costs seconds" (page L472) becomes "many times
  the budget" (V5 L201) or stays marked rough; "tens of milliseconds"
  for a thousand digits of `gamma(0.3)` (D4 L373) is a rough figure or
  goes. The probe's proposal is paraphrased and `proposalLine` named,
  never the quoted line with its figures (D4 L372, V5 L199; F-339,
  Q-007, B-026). The budget's unit, milliseconds, and the ranges are
  the model's and stay (V5 L147, L157).
- **Refusal only for a size refusal (F-442; conflict 8).** The lines
  with which the panel declines an edit are "the edits the panel does
  not accept", a value being "held to" its range; for those lines
  "refusal" appears only as the code's identifier (`refusalOf`), quoted
  as such (conflict 8 of the owner's list, confirmed). Elsewhere on the
  page "refusal" names a size refusal and nothing else (the
  significand limit's or the exponent bound's, where the limits are
  discussed).
- **The words (§8).** "The working precision of a pass" (V5 L157;
  F-431), never for the grid; "line", `hint`, `notice` as §8 has them,
  and "the user docs", never "the guide" (F-489; D4 L380, V5 L217);
  "the definitions table", or "the table built from the definitions
  file", for what a change to the precision limit rebuilds, never "the
  system table" in prose (F-475; conflict 3, answered); "build ID" if the
  page names it (Q-022); "significand", never "mantissa", with V5's
  reason (V5 L159).
- **Markdown (principles).** Inline links; the definitions block (page
  L719-723) deleted with its last user (F-343).

## 4. The page, section by section

- **(top).** V5 L145-147: the first sentence lists the settings as the
  model has them (the display digits, the rounding mode, the mode with
  its notation or its working digits, the precision limit, the
  significand limit, the probe budget).
- **The model.** V5 L149-175 adopted whole (F-331), with D4's three
  "certified" pairs inside it and section 3's changes to the ceiling,
  "derived", "inexact" and the panel; the Rounding paragraph ends at
  "where ties away from zero drift", the migration history dropped
  (D4 L360, V5 L175; F-332); the opener links
  `docs/numbers.md#how-a-value-is-held` and
  `docs/settings.md#how-the-settings-bound-each-other`. Handed over
  from work order 06 (the review of 2026-10-23, §12.3): the panel's
  memory of the last ratio width and the last extended count, offered
  again when `ratio` or `extended` is chosen again until the page is
  reloaded (F-124), is this page's; the user page says nothing of it.
- **Storage.** V5 L177-181: one paragraph on the shape a migration
  takes and the current version's fields; what each version moved is
  the code's, in the comment beside `MIGRATIONS`; a current-version
  object carrying an old key loads that field's default (F-334); after
  B-012, one rule for a stored value out of range (clamped like the
  count; F-333, Q-049); the console warning for a version above the
  build's is not described (Q-069); the opener links
  `docs/settings.md#defaults-and-resets`. Handed over from work order 06
  (the review of 2026-10-23, §12.3), since the user page names no stored
  key and no storage detail: the stored keys with their units (F-123,
  F-135), the fallback of a stored value the build cannot read or of an
  object from a newer build (F-133), and the clamp of a stored value out
  of its range, two rules today (a stored significand limit or probe
  budget out of its range falls back to its default; every other stored
  number is held to its range, the width since B-012), with #233 linked
  beside the rule until one rule lands (Q-012's rule for a bug).
- **Applying a change.** D4 L365-368 inside V5 L183-193: the clamp
  report is passed to the panel as the property `clamps`, and
  `clampLine` writes each setting's line (F-336); a reset goes through
  `withDefault`, which puts the one setting at its default and clamps
  nothing, the shell then clamping and telling as after any change
  (`clampsOf`, `clampSettings`), so resetting the significand limit
  may lower the precision limit and say so (F-335); the memoized
  rebuild's cost qualitative (F-338); the silent fallback as a plain
  fact with the `future.md` link, no #167 (section 3); the panel's
  declined edits worded under conflict 8; the opener links
  `docs/settings.md#where-the-settings-are-and-how-a-change-applies`.
- **The probe.** D4 L370-375 inside V5 L195-205: the proposal
  paraphrased, naming `proposalLine` and "the precision the built-ins
  ran at" (F-339); the composite as "the four elementary functions"
  (F-491); the timings under section 3 (F-338); #118 in words with the
  `future.md` link; #163 inline; "the probe leaves the memos at the
  largest ceiling it tried" (page L480-481) kept only after the session
  checks it against the memo code (`piMemoBits`, `ln2MemoBits` and the
  Bernoulli memo of `devdocs/builtins.md`), corrected if it does not
  hold (F-337, Q-110); the opener links
  `docs/settings.md#probe-budget-and-measure-this-device`.
- **The panel** (renamed from "The sheet"). V5 L207-211: V5's opener
  with "panel" (section 3), the debounce as the panel's device today,
  the `future.md` link for the scheduler and the typing that would
  ride it, no #118 or #186; the opener's target is
  `docs/app.md#the-settings-panel`.
- **The controls.** D4 L377-380 inside V5 L213-219: the notation's
  radios described where they are, in the first group under the
  display digits, shown in exact mode alone, so that a change of mode
  shows one dependent and hides the other, each in the group of what
  it is for (F-340, A); the overflow reason as intent, "a select is as
  wide as its widest option's text, so the options are bare names, and
  `min-width: 0` on the labels keeps a long one from overflowing a
  phone" (D4 L379, V5 L215; F-341); the "About these settings" link
  described as landing on `docs/settings.md`, no issue (F-342).
- **Where it lives.** As V5 maps it (V5 L98-101; F-344): the links to
  `docs/settings.md`'s headings as they landed.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-331 | The model | V5's structure; Q-004 B; Q-027; "the panel"; "inexact" |
| F-332 | The model | Drop the migration history |
| F-333 | Storage | One rule, after B-012 (Q-049 B) |
| F-334 | Storage | The migration list to the code (§12 q27) |
| F-335 | Applying a change | `withDefault` clamps nothing; the shell clamps and tells |
| F-336 | Applying a change | `clamps`, not `clampLine` |
| F-337 | The probe | Kept only after the memo check (Q-110) |
| F-338 | Applying a change; The probe | Qualitative, or a rough figure marked illustrative (Q-016, Q-088) |
| F-339 | The probe | `proposalLine` named, the line paraphrased (Q-007, Q-004) |
| F-340 | The controls | The panel described as it is (A) |
| F-341 | The controls | Keep as intent; "the panel" |
| F-342 | The controls | Where the link lands; no #191 (Q-115) |
| F-343 | (the page) | Inline links; #118 in words to `future.md` (Q-013 B); #163 stays; #167, #186 future work; #191 resolved (items 7 to 9, confirmed) |
| F-344 | (the page) | V5's map at `docs/settings.md`'s and `docs/app.md`'s headings (Q-008, F-488) |

Owned elsewhere and read here: F-015, F-021, F-117 (no count of the
settings), F-125, F-126, F-131, F-176 (the panel's mechanics are
`docs/app.md`'s), F-418, F-426, F-491, and the terminology findings
F-427, F-429, F-431, F-475, F-488, F-489.

## 6. Decisions followed, and still open

Followed: Q-004, Q-006, Q-007, Q-008, Q-011, Q-013, Q-016, Q-018,
Q-022, Q-027, Q-049, Q-069, Q-088, Q-110, Q-115; the rules of section 3.

Still open: nothing. #167's, #186's and #191's status (the owner's
list, items 7, 8 and 9), conflict 8 (the panel's declined edits) and
conflict 3 ("the definitions table") are answered as section 3 has
them.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V5 L145-147 | V5 | — |
| The model | V5 L149-175; D4 L356-363 | V5, with D4's pairs inside | "the ceiling" for "the finest grid" (L157, L161, L165); "derived, and written as a number only in the probe's proposal" (L165); "inexact" (L155); "the panel" (L159); the migration history dropped (L175) |
| Storage | V5 L177-181 | V5 | one rule after B-012 |
| Applying a change | D4 L365-368; V5 L183-193 | V5, D4's "a build" if preferred | #167 as words and a `future.md` link (L189); the cost qualitative (L191); the declined edits under conflict 8 |
| The probe | D4 L370-375; V5 L195-205 | V5's paraphrase (L199) with D4's wording where it is plainer | "the precision the built-ins ran at"; the timings (L201); #118 as words (L201, L205); #163 inline (L203); the memo sentence checked |
| The panel | V5 L207-211 | V5 | "panel" throughout; #118, #186 as words and a link (L211) |
| The controls | D4 L377-380; V5 L213-219 | V5 (the notation moved as the panel has it) | "the panel"; the link's landing without #191 (L217) |
| Where it lives | V5 L98-101 | V5's map | the anchors as landed |

## 8. Conflicts left to settle

From the owner's list, all answered: items 7, 8 and 9 of the Q-011
list (section 6); conflict 8, the panel's declined edits ("does not
accept", "held to", `refusalOf` as the identifier); conflict 3 ("the
definitions table"); conflict 4 (each figure kept only as rough and
illustrative, the session's choice passage by passage). The session records in its pull request
the drafts picked, the figures kept, and the result of the memo check.

## 9. Code changes it waits on

Batch 1's B-026 (the proposal's wording, paraphrased here) and B-068;
batch 2's B-012 (Q-049). B-069 (the local "About these settings"
link) rides the pages' shipping with the app and changes nothing here
until then (Q-115).

## 10. Done when

- Every section opens with its link to `docs/settings.md` or
  `docs/app.md` and keeps mechanism, decisions and alternatives only,
  in the present tense.
- The heading is `#The panel`, "sheet" occurs nowhere, and every link
  to the old anchor in `devdocs/` and `src/` is updated.
- No reference-style link; #118, #167, #186 and #191 do not occur,
  #163 once; "certified"; "inexact"; "the ceiling" glossed once;
  "refusal" only for a size refusal, and as the code's identifier
  `refusalOf`.
- `#Storage` states one rule for a stored value out of range.
- The pull request names the choices made, the figures kept and the
  memo check's result, and changes nothing outside this file and the
  inbound links.
