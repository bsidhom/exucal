# Audit findings, consolidated

The twenty-six audit units of [plan/10-audit-units.md](plan/10-audit-units.md) each wrote a
report under [reports/](reports/). This file merges their findings into one list for
triage, grouped by the page that owns each finding in the target outline of
[plan/07-docs-outline.md](plan/07-docs-outline.md), so that each page's rewrite can start
from its own group. Two companion files hold the rest of the units' output:
[open-items.md](open-items.md), every question the units put to the owner, deduplicated;
and [bugs.md](bugs.md), the code defects the units met along the way.

Nothing here re-verifies a finding against the code. A finding rests on the evidence its
units cite, at the report lines given; the consolidation merged, classified and proposed a
call, and changed no page and no code. The units' proposed text is not copied: each page
group points to it.

## Sources

- The reports are `reports/<UNIT>/fable.md` for every unit but D1, whose report,
  `reports/D1/merged.md`, merges two runs.
- Every unit audited the same tree. The units ran in waves at different heads of
  `docs-revamp`, which is why their "Plan revision" lines differ: A1 to A6 side by side at
  `b605b2b`; A7, A8 and A9, D2 and D3 one after another; D4 to D9 and V1 to V8 side by side
  at `70eb951`; D1's merge of its two runs last, at `f9f31d3`. Between those heads only
  `audit/reports/` and three lines of the `audit-unit` skill changed, never the plan, the
  principles, a page or the code. Each unit could read only the reports merged before it,
  which is why some hand-offs between units of one wave were never taken up.
- 515 findings, of which 138 record a conflict (between units, or between
  the units and the plan) and 54 carry low confidence; 115 open items from the
  units' 188 questions; 70 bugs.

## How to read a finding

- **F-nnn.** Ids run in page order: the user pages of the target outline first, then the
  developer pages, then the findings that span pages (issue links, links to pages not yet
  written), the terminology findings and the findings about the plan itself.
- **Type.** `contradicts implementation`: a page, or a plan §1 claim that will become page
  text, states something the code contradicts. `stale (update)`, `stale (keep as intent)`,
  `stale (drop)`: a passage describing a superseded design, tagged as
  [principles.md](principles.md) and [plan.md](plan.md) define the tags. `gap (confirmed)`,
  `gap (new)`, `gap (refuted)`: coverage measured against plan §6. `structure`: duplication,
  content in the wrong place, links against the ownership direction, what becomes a link to
  `docs/`. `markdown and links`: the Markdown subset and the issue links of §12 question 26.
  `measurement`: timings or counts in prose (§12 questions 9 and 25). `not verified`: a
  statement no unit could check. `terminology`, `plan`, `other`.
- **Flags.** `conflict`: units disagree, or a unit's evidence contradicts what the plan
  records of the owner's review, and the finding records each side without picking one. `low confidence`: the units hedged, could not verify, reasoned without running a
  behavioural claim, or their numbers or citations disagree.
- **Target section.** Where the finding lands in its owner page: a section of the plan §7
  outline for a user page, a current heading for a developer page.
- **Units.** The units that reported it, with report lines: `A1 (L52)` is line 52 of
  `reports/A1/fable.md`.
- **Where.** Every passage involved: a current page as `file#Heading`, with the page's line
  numbers where a unit gave them; `plan N3` is a claim of plan §1, the material the new user
  pages are written from; `plan §6.3` is a coverage gap.
- **The unit's own fields,** by type: Claim or passage, Finding, Evidence, Corrected
  statement (contradictions); Passage, Tag, Rewrite (stale passages); Gap, Sources (gaps);
  Finding (the rest); Conflict, where units disagree.
- **Proposed call.** The consolidation's proposal: for a contradiction, **doc wrong**,
  **code wrong**, or **design changed without the docs following**, with the evidence each
  way (the docs are the record of intent, so "code wrong" is a real possibility); for a
  stale passage, the tag confirmed or questioned; otherwise one line.
- **Related.** Open items (Q-), bugs (B-) and findings on other pages about the same issue.
- **Decision.** Filled on 2026-10-12 from the owner's answers in [decisions.md](decisions.md),
  recorded in [plan/12-open-questions.md](plan/12-open-questions.md), section 12.1: "stands"
  means the proposed call stands (the sheet's section 10); "follows Q-nnn" or "follows F-nnn"
  names the answer that settles it; "amended by" names a rule that changes part of it (the
  rules are restated in [principles.md](principles.md)); "pending" marked what the list at
  the end of decisions.md ("For the owner") held until the owner answered it on 2026-10-12
  (plan §12.2), after which no mark remains. Where a call leaves a choice between
  drafts, the page's session picks and its pull request says which; where a call is
  undetermined on a fact or flagged low confidence, the session reads the cited code and
  follows it, and anything still open comes back to the owner as a new question.

**Placement.** A finding goes under its user-side owner page when any of its passages is on
the user side (a current `docs/` page, a plan §1 claim, a plan §6 gap); otherwise under the
developer page that carries it. Current `docs/` passages map to the target outline:
`docs/settings.md#How a number is held…` and `docs/functions.md#Very large results and
approx` dissolve into `docs/numbers.md`; `docs/definitions.md#Expressions` and `#Names` move
to `docs/expressions.md`; `#What the file contains` to `docs/units.md`; the settings sheet's
first paragraph and "Tapping the build number…" to `docs/app.md`. Each page group opens with
a table pointing to the proposed text the reports hold for it, marking OVERLAP where two
units drafted the same section, and closes with the findings owned elsewhere that touch it.

## Summary

### By type

| Type | Findings |
| --- | --- |
| contradicts implementation | 144 |
| not verified | 16 |
| stale (update) | 26 |
| stale (keep as intent) | 23 |
| stale (drop) | 9 |
| gap (new) | 44 |
| gap (confirmed) | 42 |
| gap (refuted) | 4 |
| structure | 44 |
| markdown and links | 25 |
| measurement | 24 |
| terminology | 73 |
| plan | 16 |
| other | 25 |
| **total** | **515** |

### By page

| Page | Findings | Contradicts implementation | Stale | Gaps | Other | Conflicts | Low confidence | Pointers from other pages |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/README.md` | 7 | 0 | 4 | 1 | 2 | 1 | 0 | 11 |
| `docs/getting-started.md` | 2 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| `docs/numbers.md` | 57 | 24 | 7 | 15 | 11 | 18 | 10 | 7 |
| `docs/quantities.md` | 7 | 5 | 0 | 0 | 2 | 4 | 2 | 6 |
| `docs/expressions.md` | 17 | 4 | 0 | 12 | 1 | 1 | 0 | 9 |
| `docs/definitions.md` | 18 | 2 | 2 | 10 | 4 | 6 | 0 | 24 |
| `docs/units.md` | 8 | 0 | 0 | 6 | 2 | 2 | 1 | 5 |
| `docs/settings.md` | 20 | 6 | 3 | 8 | 3 | 7 | 1 | 41 |
| `docs/functions.md` | 32 | 8 | 2 | 18 | 4 | 6 | 6 | 19 |
| `docs/app.md` | 12 | 1 | 0 | 7 | 4 | 2 | 3 | 2 |
| `devdocs/README.md` | 2 | 1 | 0 | 0 | 1 | 1 | 0 | 3 |
| `devdocs/numbers.md` | 39 | 16 | 14 | 0 | 9 | 7 | 2 | 51 |
| `devdocs/architecture.md` | 35 | 18 | 4 | 1 | 12 | 10 | 6 | 45 |
| `devdocs/builtins.md` | 48 | 20 | 4 | 4 | 20 | 16 | 9 | 27 |
| `devdocs/functions.md` | 19 | 10 | 4 | 0 | 5 | 6 | 2 | 26 |
| `devdocs/notation.md` | 7 | 3 | 1 | 0 | 3 | 1 | 0 | 9 |
| `devdocs/settings.md` | 14 | 4 | 4 | 0 | 6 | 5 | 2 | 14 |
| `devdocs/future.md` | 6 | 1 | 2 | 0 | 3 | 1 | 0 | 15 |
| `devdocs/cost.md` | 11 | 5 | 0 | 0 | 6 | 0 | 0 | 16 |
| `devdocs/layout.md` | 8 | 1 | 0 | 4 | 3 | 1 | 1 | 3 |
| `devdocs/testing.md` | 12 | 4 | 3 | 0 | 5 | 1 | 2 | 7 |
| `devdocs/benchmarks.md` | 11 | 3 | 1 | 3 | 4 | 1 | 1 | 6 |
| `devdocs/development.md` | 10 | 5 | 1 | 0 | 4 | 3 | 1 | 5 |
| `devdocs/offline.md` | 3 | 1 | 1 | 0 | 1 | 1 | 2 | 13 |
| `devdocs/deployment.md` | 2 | 0 | 1 | 0 | 1 | 0 | 1 | 2 |
| `devdocs/security.md` | 3 | 2 | 0 | 0 | 1 | 0 | 0 | 4 |
| Across pages: issue links and links to pages not yet written | 16 | 0 | 0 | 0 | 16 | 13 | 1 | 0 |
| Terminology (plan §8) | 73 | 0 | 0 | 0 | 73 | 22 | 1 | 0 |
| The audit plan itself | 16 | 0 | 0 | 0 | 16 | 2 | 0 | 0 |

### The most consequential findings

The numeric model that `docs/numbers.md` will state, as plan §1 words it, needs these
corrections first; each changes what a user is told about every result.

- `tooLarge` (F-051): every unit that traced it finds one refusal kind, which the
  retry loop never retries, against the plan's record of the owner's review (claim N21 and
  a §1.1.5 row: "classes of `tooLarge`, some of which the retry loop retries"). The owner
  says which holds (Q-001); `docs/numbers.md#Values too big to hold` and three
  sections of `devdocs/numbers.md` wait on it.
- Claim N3 (F-010): a nonzero radius has two sources in either mode, not three.
  Decimal mode's rounding yields exact values; the "third source" is an earlier design that
  `devdocs/numbers.md#Exact mode` still describes.
- The ceiling (F-022, F-125): it is `4 × (L + 10)` digits (4,040 at the
  default), which "four times the limit plus ten" misreads as 4,010 on every page that
  writes it; and it is a pass's precision, not "the finest grid" as §8 glosses it
  (Q-004, Q-005).
- Claim N12 (F-060): the principle that every result pastes back as input breaks at
  the exponent bound, where the outcome throws instead of writing the line
  (B-002); the units disagree on the fix (Q-002).
- Claim N14 (F-029): a ball touching a point is an order of its own; treating a
  touch as a straddle is the built-ins' rule, not the conditions'. Four units word it
  differently.
- Claims N7 and N10 (F-034, F-023): a refusal the retry loop does not retry
  ends it early, with the best result so far; and the partial display kind is reachable
  today by two routes, which settles the plan's open question.
- Claims N19 and N13 (F-038, F-061): decimal mode's reciprocal line inverts
  the ratio as shown, not the exact one (B-008); and the ratio rule stands while
  the code's screen writes some dyadic values that fit as decimals (code wrong,
  B-004).
- Claim Q10 (F-069, F-113): not every unit factor is the exact one its
  document states. `gravity` is misfiled, the dalton and the two years are measured values,
  and the units defined through `pi()` are inexact with no page naming them.
- Claim Q8 (F-067): `asin(0.5)` into `turn` is an angle, not the plain number.

Beyond the numeric model:

- "certain" becomes "certified" in every page that quotes the notes (F-021), and
  the decided code change (B-068) should land before `docs/numbers.md` is
  assembled.
- `gcd(a, 0)` (F-285, B-001): `devdocs/builtins.md` states the intended
  rule, `|a|`, and the code returns wrong values (`gcd(5, 0)` is `2`).
- Two pages drafted twice (F-114, F-108, F-180): units A9 and D3
  propose incompatible fates for `docs/definitions.md#What the file contains` and the
  page's first sentence, and units D9 and V8 each wrote `docs/app.md`, with factual
  differences.
- The function classes "ruled out" (F-348) are to be worded as deferred on both
  `devdocs/builtins.md` and `devdocs/future.md`; whether the statistical distributions are
  deferred built-ins or definitions is disputed (Q-010).
- The plan itself (F-500, F-502): it says no grammar exists and lists `e`
  and `at` as absent names, but both grammars sit in the parsers' module headers, `e` is
  the elementary charge, and `at` reads as an attotonne.
- The issue links: fifteen findings cover the issues linked from several passages or whose
  one owning place is in question, and twelve of them record a dispute between units (the
  group "Across pages"; Q-012, Q-013, Q-014, Q-011).

## Blocking or complicating the rewrite

What to settle before rewriting a page, in the order it bites.

1. **Owner decisions.** [open-items.md](open-items.md) opens with the owner decisions that
   each hold up a page, listed by page. The heaviest: `tooLarge` (Q-001); the
   literal at the top edge (Q-002); the ceiling's gloss and formula
   (Q-004, Q-005); when the "certified" code change lands
   (Q-006); quoting the app's messages in hand-written pages (Q-007); and
   when a developer page may link a user page not yet written (Q-008).
2. **Bugs.** Two block page text: the outcome's crash at the exponent bound
   (B-002), and the decided "certified" change (B-068). Thirteen more complicate a
   page, which states the rule but avoids an example, a quotation or a pointer until the fix
   lands; [bugs.md](bugs.md) lists them.
3. **Conflicts between units.** Every finding flagged `conflict` is listed under
   "Needs spot-check" at the end. The ones that change what a page says, beyond those
   above: the touch rule (F-029); the grid and the ceiling (F-125); the
   measured unit factors (F-069); `asin(0.5)` into `turn` (F-067); the ratio
   rule's verdict (F-061); the reciprocal in decimal mode (F-038); the icon
   sources (F-362); the update check's online clause (F-403).
4. **Overlapping drafts.** Two units drafted the same text independently in several places;
   pick one before applying either. `docs/app.md` (D9, V8: F-180);
   `docs/definitions.md#(top)` and `#What the file contains` (D1, A9, D3: F-108,
   F-114); the Significand limit entry against "Values too big to hold" (D4, D8:
   F-049); `devdocs/offline.md#Offline behavior` (D9, V8); the shared-names rule
   in `docs/definitions.md` (D1, D2). Each page group's "Proposed text in the reports" table
   marks every OVERLAP.
5. **Order of work.** The new user pages do not exist yet, so many proposed devdocs edits
   link targets that are not there (F-426): write `docs/numbers.md`,
   `docs/quantities.md`, `docs/expressions.md` and `docs/app.md` before paring the developer
   sections that will point to them, and the getting started guide last (plan §10).
6. **Loose ends.** The last wave of units (D4 to D9, V1 to V8) ran side by side and could
   not read each other's reports, so some hand-offs were never taken up; each is a finding
   of type `other` on the page concerned, saying what was left undone (for example
   F-059, F-345, F-095).

## `docs/README.md`

7 findings (F-001 to F-007).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/README.md#(top)` (complete page) | A8 (L125-129), D9 (L101-139), V8 (L120-128) | OVERLAP: three drafts: D9 replaces the whole page; V8 adds a link and a list entry to the current intro; A8 (F-001) drafts the opening paragraph only, reframing it and keeping the worked examples that D9 moves to getting started; reconcile. List entries differ: D9 "installing, offline use, updates and the build ID, the settings sheet and copying a result", V8 "installing it, working offline, updates and the build shown in the footer". D9 (Q-064) questions D9's "certifies" in the intro |
| `README.md#(top)` (complete file) | D9 (L141-153) | — |

### Findings

#### F-001. The app is framed as a unit converter after GNU units

- Type: stale (update)
- Target section: (top)
- Units: A8 (L59, L125-129), V2 (L54, L71, L108-110), D9 (L36, L74, L303)
- Where: `docs/README.md#(top)` (page L3-4); `README.md#(top)` (the same text); `devdocs/architecture.md#(top)` (page L3-9, "a unit converter")
- Passage: docs: "An offline-first progressive web app (PWA) that converts units, in the spirit of GNU units"; "As GNU units does, it also answers the other way round"; devdocs: "A unit converter inspired by GNU units, grown into an arbitrary-precision calculator."
- Tag: update: V2 for the devdocs half (new, not a plan row: "grown into" is history and §8 keeps "the converter" for the two-field component) and D9 for the docs half (new, applying §12 q2 and §8: Exucal, the calculator, "the converter" only for the two-field component); A8 files the docs half as other, against §12 q2, and finds the index right fact by fact (A8 report).
- Rewrite: lead with the calculator, unit awareness and kind checking as features (§12 q2), as the app's own descriptions already do (`public/manifest.webmanifest:4` "An exact unit calculator that works offline", `package.json:5`): V2's first sentence keeps GNU units as lineage (V2 L108-110); A8's opening paragraph names the reciprocal line and keeps one line on installing and offline use (A8 L125-129); D9's two proposed intros name no GNU units in the index (D9 L101-153).
- Proposed call: Confirm `update` (§12 q2 is binding): both openings lead with the calculator; GNU units stays as lineage in devdocs only (V2), the docs index naming it nowhere (A8's draft, D9); the index's page list is the §7.1 rewrite's (§12 q18).
- Related: F-002, F-472
- Decision: Stands: both openings lead with the calculator; GNU units stays as lineage in devdocs only (Q-039 lets devdocs keep that one clause); the index's page list is §7.1's, with `docs/builtins.md` for the built-ins (Q-020's note). Amended on 2026-10-14 (plan §12.3): both openings state the three goals in priority order, in brief, in their own prose for their readers, with the substance principles.md fixes, as Exucal's and never as unique to it; "grown into" and what the app began as stay out (intent, not history).

#### F-002. Index and root README share one intro; reshape them per §12 q18

- Type: structure · Flags: **conflict**
- Target section: (top)
- Units: D9 (L33, L57, L101-153), V8 (L120-128)
- Where: `README.md#(top)` (lines 3-14); `docs/README.md#(top)` (lines 3-14); plan §9.1 "The intro"
- Finding: The intro paragraph is identical in both files (`diff` reports no difference); D9 confirms the §9.1 row and tags the paragraph stale (update). §12 q18 settles the shape: the root README becomes three sentences and two links, `docs/README.md` the user index (what the app is in two sentences, the page list, the devdocs link; §7). D9 drafts both files in full; V8, with no D9 report to hand, offers a link to `app.md` after the offline sentence and a list entry for it (one line in the index, §12 q22).
- Conflict: A8 (F-001, A8 L125-129) rewrites the index's opening paragraph and keeps the worked examples (`3 ft` into `in`, `ft;in`, the reciprocal line, the two copy texts) in the index; D9 (L37, L56, L101-139) moves them to getting started, where the reciprocal line is introduced, and leaves two sentences and the page list.
- Proposed call: Apply §12 q18 with D9's two files; settle the examples' place against §7's index ("what the app is in two sentences; the page list"), which A8's paragraph exceeds; fold V8's list entry into D9's.
- Related: F-001
- Decision: Stands: §12 q18 with D9's two files, the examples moving to getting started (written last, Q-008); the index is written after the pages it lists (Q-008) and follows Q-064 ("certifies" stays) and F-488 ("the settings panel" in its line for `app.md`).

#### F-003. Root README's devdocs bullet promises design notes that are gone

- Type: stale (update)
- Target section: (top)
- Units: D9 (L34, L75)
- Where: `README.md#(top)` (the `devdocs/` bullet, lines 20-25)
- Passage: "`` [`devdocs/`](devdocs/README.md) `` is the developer's documentation: the architecture, the layout, … deployment and security, with the design notes and the plans behind them."
- Tag: update (D9; new)
- Rewrite: "The developer's documentation, including how to build, run and test the app, is in `` [`devdocs/`](devdocs/README.md) ``." The notes and plans are gone from the tree (`ls devdocs`: sixteen current-state pages, no `design/` or `history/`; `audit/plan.md`), and the list names seven pages of sixteen (D9 L34, L148-152).
- Proposed call: Confirm `update`; the sentence becomes one of the root README's three (§12 q18).
- Decision: Stands (update).

#### F-004. Root README's tooling sentence goes; development.md owns the commands

- Type: structure
- Target section: (top)
- Units: D9 (L35, L75, L318)
- Where: `README.md#(top)` (last paragraph, lines 27-30); `devdocs/development.md#(top)`, `#Commands`
- Finding: "The app is built with Lit and Vite, written in TypeScript, and uses pnpm for package management; `pnpm install`, `pnpm dev` and `pnpm test` are the commands to start with, and development.md has the rest." agrees with `package.json:8-12` but has no place in three sentences and two links (§12 q18); `devdocs/development.md` names the stack and every command (V8 confirmed the fourteen, V8 L34). D9 tags it stale (update, "delete here"), though the sentence is current: the fault is placement.
- Proposed call: Delete it from the root README; whether the stack earns a fourth sentence is D9 (Q-098).
- Related: Q-098
- Decision: Stands; follows Q-098 (the sentence goes; `devdocs/development.md` keeps the commands).

#### F-005. Index says "the other way round" for the reciprocal line

- Type: stale (update)
- Target section: (top)
- Units: D9 (L37)
- Where: `docs/README.md#(top)`; `README.md#(top)`
- Passage: "it also answers the other way round"; "a sum over a list has no other way round"; "for the other way round"
- Tag: update (D9; new, applies §8)
- Rewrite: "the reciprocal line, the conversion the other way round" once (§8); the examples move to getting started, where the reciprocal line is introduced (D9 L37).
- Proposed call: Confirm `update`; it falls with the index rewrite, and the term itself is the terminology draft's.
- Related: F-470
- Decision: Stands (update); follows F-470 ("the reciprocal line").

#### F-006. Index page list describes the pages before the §7 outline

- Type: stale (update)
- Target section: (top)
- Units: D9 (L38, L308)
- Where: `docs/README.md#(top)` (the page list, lines 16-25)
- Passage: "[Settings]: … the two limits and the probe, and how a number is held"; "[Unit definitions]: … the expression language, unit lists and user-defined functions"; "[Functions in expressions]: … and what happens with very large results"
- Tag: update (D9; new, applies §7 and §12 q12)
- Rewrite: the list of §7's pages, one line each (D9 L117-136): how a number is held and very large results belong to `numbers.md`, the expression language to `expressions.md`; the functions the definitions file defines are not "user-defined" while only the system file is loaded, **user definitions** being reserved for the intended user-written ones.
- Proposed call: Confirm `update`; the list is replaced as the §7 pages land (their links resolve only then).
- Related: F-478
- Decision: Stands (update): the list is §7's pages, the built-ins' line naming `docs/builtins.md` (Q-020's note), the functions the file defines named by F-478's "defined function" (never "user-defined" while only the predefined definitions file is loaded, F-475).

#### F-007. §6.8: the index must link to the foundation pages

- Type: gap (confirmed)
- Target section: (top)
- Units: D9 (L56)
- Where: `docs/README.md:6-8`; plan §6.8
- Gap: The intro's `≈` lines link nowhere.
- Sources: D9's proposed index (L101-139): the examples leave for getting started, whose "Reading `=`, `≈` and a note" links to `numbers.md`, and the index becomes the page list.
- Proposed call: Resolved by the §7 form of the index; no separate link needed.
- Decision: Stands: resolved by the §7 index; getting started's link to `numbers.md` is written last (Q-008).

### Findings owned by other pages that touch this one

- F-009 (docs/getting-started.md): Getting started is missing entirely (§6.7); D9 verified its facts
- F-086 (docs/expressions.md): The printed form missing from docs/
- F-178 (docs/app.md): The copy button's feedback is undocumented
- F-180 (docs/app.md): docs/app.md does not exist (§9.3); D9 and V8 drafted it independently
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-428 (terminology): "certifies" in the index before the reader has met it
- F-457 (terminology): "parses back", "typed back", "reads back", "pastes back"
- F-470 (terminology): "the other way round" for the reciprocal line
- F-472 (terminology): "the converter" for the app, the fields and the outcome module
- F-478 (terminology): "user-defined functions" for the functions the file defines
- F-495 (terminology): App-surface words: the cog, the checks the app makes on its own, install

## `docs/getting-started.md`

2 findings (F-008 to F-009).

### Findings

#### F-008. Getting started's refusals would quote messages that §12 q6 generates

- Type: other
- Target section: When something is refused
- Units: D9 (L93, L320)
- Where: plan §7 skeleton, "When something is refused"; plan §12 q6
- Finding: §12 q6 generates the message catalogue from `src/messages.ts` and hand-writes none in the interim, while the skeleton's section shows what a refusal looks like; D9's facts (L93) quote five messages verbatim (mismatch, kind mismatch, size refusal, edge, unknown name).
- Proposed call: Quote two or three messages as examples of the shapes (a mismatch, a size refusal, an edge), claiming no completeness, and link the generated catalogue once it exists, as D9 (Q-007) proposes (owner decision pending).
- Related: Q-007
- Decision: Follows Q-007 (ok): two or three messages as examples of their shapes, claiming no completeness; "refused" only for a size refusal (F-442: the section is "When something fails", or keeps its title with a mismatch and an edge named as errors).

#### F-009. Getting started is missing entirely (§6.7); D9 verified its facts

- Type: gap (confirmed)
- Units: D9 (L54, L74, L84-95)
- Where: plan §6.7; plan §7 (getting-started skeleton); `docs/README.md#(top)` (page L3-14); `devdocs/architecture.md#(top)` (page L3-9, the seed text)
- Gap: `docs/` has four pages and no guide; the index's intro is the only tour by example, and `devdocs/architecture.md#(top)` is the one place the fields' names, have and want, are introduced.
- Sources: `docs/README.md#(top)`; `devdocs/architecture.md#(top)`; D9's skeleton facts, each reproduced through `outcomeOf` at the defaults (eight digits, half even, exact mode), D9 L84-95: `2 kg * 3 m/s^2` gives `2 kg × 3 m / s^2 = 6 m kg / s^2`; `1/3 ≈ 0.33333333` (exact, but shown with fewer digits than it has: N10); `sqrt(2)^2 - 2 ≈ 0 (within … of zero)`; `3 ft` into `in` gives `3 ft = 36 in` and `in ≈ 0.027777778 × 3 ft` (copy texts `36 in`, `0.027777778 * 3 ft`); `3661 s` into `time` is `= 1 hr + 1 min + 1 s`, no second line for a list; `300 K` into `tempF` is `300 K = tempF(80.33)`; `approx(2.54) cm` into `in` is `≈ 1 in`; in decimal mode `1/3 × 3 = 0.99999999`; a mismatch (`1 m` into `s`) marks neither field; `1 mi` into `1000 ft` is `1 mi = 5.28 × 1000 ft`; where to go next is `docs/app.md`
- Proposed call: write the page from §7's skeleton with these facts, ending with a link to `docs/app.md` (D9 (F-180)); it takes over the introduction of have and want (§8); how its refusal section quotes messages is a finding of its own (D9 (F-008)).
- Decision: Stands: the page is written last, from §7's skeleton with D9's facts (Q-008); its headings follow F-451 ("Approximating a value"), F-488 ("the settings panel") and F-471 (it introduces have and want); it ends with a link to `docs/app.md`.

## `docs/numbers.md`

57 findings (F-010 to F-066).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| plan N1, N3, N4, N7, N8, N14, N24 (corrected statements, material of the new page) | A1 (L50, L52, L53), V6 (L26), A3 (L27), A6 (L80), A5 (L60) | OVERLAP: D8 drafts `docs/numbers.md` sections from the same material (D8 L172-178, D8 L180-190); D8 L176 keeps "kept in lowest terms as `127/50`" against A1's N1 |
| `docs/settings.md#How a number is held, and what the settings touch` (interim, five old→new pairs) | A1 (L223-272) | OVERLAP: D8 (L279-281) and D4 (L352-354) delete the section; D8 (L44-45) rewrites L258-261 keeping "four times that limit plus ten" and drops L271, both of which A1 rewrites (L258-272); A1's "raise the grid" (L262-264) against A3 (L68, L134) |
| `docs/numbers.md#Exact and approximate values` (new) | D8 (L172-178) | OVERLAP: A1 drafts an interim fix of the source, `docs/settings.md#How a number is held…` (A1 L223-272); D8 agrees with A1 on two sources of inexactness |
| `docs/numbers.md#How a value is held` (new) | D8 (L180-190) | OVERLAP: takes the dyadic-cost paragraph of D4's Significand limit entry (`docs/settings.md:127-138`) by §12 q5 (D8 Q5); A1's interim fix of the source (A1 L223-272) |
| `docs/numbers.md#Digits you can trust` (new) | D8 (L192-200) | CONTRADICTS A1 (F-022) and A3 (F-022): writes "four times the precision limit plus ten digits (4,040 …)", which they correct to four times the sum of the limit and ten, `4 × (L + 10)`; schedule figures are N8's (A3's); the notes' "certified" waits for A2's code change (D8 Q7) |
| `docs/numbers.md#Values at an edge` (new; D8's sentences only) | D8 (L202-206) | the other edges are A6's and the built-ins'; D6 (Q6, D6 (F-031)) proposes a sentence on the rounding functions' cells |
| `docs/numbers.md#Identities and cancellation` (new) | D8 (L208-216) | none here; its `docs/definitions.md#Functions` counterpart is D8's (D8 (F-033)) |
| `docs/numbers.md#The two modes` (new; D8's sentences only) | D8 (L218-222) | the rules are D4's and A4's (corrected N17 to N19, A4 L26-28; the consequences of Q6, A4 L137) |
| `docs/numbers.md#approx` (new) | D8 (L224-230) | carries A5's two facts (A5 L246-257); lacks A2's qualifier on a power whose exponent cannot be formed (A2 L152) |
| `docs/numbers.md#Values too big to hold` (new) | D8 (L232-265) | OVERLAP: D4's Significand limit entry (D4 L267-282) by design, D8 Q5 asks the owner to reconcile; D4's draft keeps "Inexact values are never refused for size", the N21 wording A5 corrects (A5 L57). D8's text uses "decimal exponent" (L257, L263, L265) though its own terminology row keeps the term devdocs-only (L300); it lacks A5's three N22 facts (A5 L58) and the parser's rejection (A5 L126-134); its "the measurements" in devdocs (L265) depends on V1 Q2 and A5 Q5 |
| `docs/functions.md#Very large results and approx` (deleted) | D8 (L168-170), A5 (L431-449) | OVERLAP: A5's two pairs apply only if the section outlives D8's deletion (A5 L448-449) |
| `docs/definitions.md#Functions` (page L309-329, last paragraph) | D8 (L154-160) | OVERLAP: V4 (L434-441) links the same user consequences to definitions.md "Functions" but leaves the hand-written rule and decimal mode there, where D8 moves them to `numbers.md` |
| `docs/settings.md#(top)` tail paragraphs (page L192-205) | D8 (L267-271), A2 (L116-118), D4 (L350) | OVERLAP: A2 edits page L194 in place; D8 replaces both paragraphs with one sentence linking `numbers.md` |

### Findings

#### F-010. N3 and devdocs: two sources of a nonzero radius, not three

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Exact and approximate values
- Units: A1 (L52, L64, L91-98, L211-221, L285-287), A5 (L56, L335), V1 (L70, L82, L280, L316)
- Where: plan N3; plan §1.1.6 item 9; `devdocs/numbers.md#Exact mode` (page L986-988); `devdocs/numbers.md#The significand limit` (page L1403-1404, "a fourth source")
- Claim or passage: N3: "Decimal mode's rounding is the third source, inside a step only"; `#Exact mode`: "Exactly three things ever produce a nonzero radius: an inexact function (…), the built-in `approx`, … and decimal mode's rounding."; `#The significand limit`: "it would be a fourth source of inexactness and the only one the user cannot see in the expression".
- Finding: `settleDecimal` returns an exact value, so no radius leaves a decimal-mode step; the "third source" is the earlier decimal mode (§1.1.5's `#Decimal mode` row). Exact mode's two roundings once a value is inexact, settling and `onGrid`, are charged to a result that is inexact already. With N3 corrected, a nonzero radius has two sources, an inexact function and `approx`, so the rounding the significand limit rejects would be the third, not a fourth.
- Evidence: `src/core/ball.ts:1052-1081`, `1109-1133`, `1021-1039`, `1009-1012`; run, decimal mode: `approx(2) - approx(2) = 0`, `sqrt(2) / sqrt(2) = 1`, `1/3 × 3 = 0.99999999`, `sin(pi() radian) = -4.6410207e-8`; the "fourth source" sentence itself reasoned from code, not run (A1 L285-287).
- Corrected statement: "In either mode, a nonzero radius comes from exactly two things: an inexact built-in (a root, `exp`, `ln`, the trigonometric, hyperbolic, Gamma and Beta families, `pi()`, and the units defined through `pi()`) and `approx`, which makes a value inexact on purpose and is the identity in decimal mode. Decimal mode's rounding of a step produces an exact value and never a radius: inside a step the radii are those of the built-ins computed at the working contexts, and the step's one rounding removes them (N17, N18). Once a value is inexact, exact mode rounds its midpoint onto the working grid after every operation (settling) and, in a sum, product or quotient with it whose exact step the significand limit refuses, puts an exact operand onto the same grid, every rounding charged to the radius; neither makes a new value inexact (N4)." (A1 L52; page text "Exactly two things…": A1 L218-221, V1 L280); `#The significand limit`: "it would be a third source of inexactness and the only one the user cannot see in the expression" (V1 L316; A1 Q1).
- Conflict: A5 confirms N3 ("Claim confirmed", A5 L56; its Findings record §1.1.6 item 9 as "N3's "exactly three sources": confirmed", A5 L335) while its Claims row confirms only the exact-mode part, "exactly two ways" (A5 L56): an internal inconsistency (A5 report). Read at face value, L335 keeps three sources and the page's "fourth", against A1's correction (A1 L52, L91-98) and V1, which follows A1 (L70, L316).
- Proposed call: **doc wrong**: the code is coherent (a step's one rounding is exact; A1's decimal-mode runs show no radius) and `devdocs/numbers.md#Decimal mode` already keeps the radius carried through steps as a ruled-out alternative; N3's correction settles the "fourth source" sentence ("a third"). To settle the conflict, read A5 L56 against L335: L335 may mean the exact-mode half only, and A5's L56 evidence answers only item 9's `onGrid` question (a rounding charged to an already inexact result), not whether decimal mode's rounding is a source.
- Related: Q-079, F-113
- Decision: Stands (doc wrong; two sources); follows Q-079 (ok: "a third source"); amended by F-451 ("inexact" in the corrected statement wherever it says "approximate"; the section is "Exact and inexact values").

#### F-011. Gap §6.1: exact and approximate values, their sources, what `=` means

- Type: gap (confirmed)
- Target section: Exact and approximate values
- Units: D8 (L131, L133)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L209-219)
- Gap: The content exists at the wrong level, on the settings page.
- Sources: `docs/settings.md` page L209-219
- Proposed call: D8's drafted `numbers.md#Exact and approximate values`.
- Decision: Stands; the section is "Exact and inexact values" (F-451).

#### F-012. Dyadic cost: 69,658 bits in the pages, "about 69,659" in the refusal

- Type: other
- Target section: How a value is held
- Units: D4 (L51, L109, L127, L404, L414)
- Where: plan N21 ("`2^-30000` costs 69,658 bits"); `docs/settings.md#(top) > Significand limit` (page L131-132); `devdocs/numbers.md#The significand limit` (the same figure)
- Finding: "`2^-30000` … costs 69,658 bits" is the true size of `5^30000`; the refusal of `2^-30000` says "would need a significand of about 69,659 bits", a one-bit gap that a reader who tries the example will see (also `3^-100000` refused with "about 158,497 bits"). A1 and A5 read the prediction (`canonicalBits`) as an upper bound within a bit (A1 report, A5 report). The sentence moves to `numbers.md#How a value is held` (§12 q5), where D8's draft carries 69,658 (D8 L180-190).
- Proposed call: the pages keep the true size and say "about" (D4 Q2); whether the prediction should overshoot by one is a code question (D4 (B-013)).
- Related: Q-091, B-013
- Decision: Stands; follows Q-091 (ok: the pages keep the true size and say "about").

#### F-013. N1: the fraction keeps no factor of ten; the bound is on the value

- Type: contradicts implementation · Flags: **conflict**
- Target section: How a value is held
- Units: A1 (L50, L86-90, L228-234)
- Where: plan N1; `docs/settings.md#How a number is held, and what the settings touch` (page L209-210)
- Claim or passage: N1: "an exact fraction (in lowest terms) times a power of ten", the power of ten's exponent bounded by ±10^18; the page: "`2.54` is `254/100`, kept as `127/50`".
- Finding: the fraction is kept in lowest terms with no factor of ten in its denominator (a power of two in a denominator is held as a power of five in the numerator), and that form is what the significand limit measures; the ±10^18 bound is on the value's decimal exponent, the stored exponent may lie past it by the significand's digits (N22 has this right).
- Evidence: `src/core/scaled.ts:1015-1044` (`normalize`), `496-505`, `25-39`, `187-197`; computed: `2.54` is `254 × 10^-2`, `1/6` is `5/3 × 10^-1`, `2^-30000` is `5^30000 × 10^-30000`, `1.5e-3` is `15 × 10^-4`.
- Corrected statement: "A value is an exact fraction times a power of ten. The fraction is kept in lowest terms with no factor of ten in its denominator, so a power of two in a denominator is held as a power of five in the numerator (`1/6` is `5/3 × 10^-1`; `2^-30000` is `5^30000 × 10^-30000`), and that form is what the significand limit, a setting, measures (N21); the value's decimal exponent, the one the display writes, must lie within a fixed bound of ±10^18 (N22), so a value's magnitude is cheap to hold but not unbounded. Decimal literals are read exactly (`1.5e-3` is `15 × 10^-4`; `0.1 + 0.2` is exactly `0.3`). That the fraction and the power of ten are two types, one composed of the other, is representation and stays in devdocs." (A1 L50; interim page text A1 L228-234)
- Conflict: D8 confirms the page's "`2.54` … `127/50`" (D8 report, D8 L104; its rerun shows `2.54` is `= 2.54`, the display, not the held form) and its drafted `docs/numbers.md#Exact and approximate values` keeps "kept in lowest terms as `127/50`" (D8 L172-178, D8 L176), against A1's computed form (A1 L50, L228-234).
- Proposed call: doc wrong: `normalize` is deliberate and `devdocs/numbers.md#The types` states the canonical form (A1 report, A1 report); settle D8's draft against A1's computed form of `2.54` before it lands.
- Related: F-053
- Decision: Stands (doc wrong); the session settles D8's draft against A1's computed form of `2.54`; follows F-439 (the docs say "the fraction is kept with no factor of ten in its denominator"; "canonical" is devdocs-only, spelled out once). Amended on 2026-10-13 (plan §12.3): the docs state the rule as the denominator coprime to ten, with no factor of two or five, name the canonical form once, glossed, and say why a value has exactly one.

#### F-014. `docs/settings.md`'s number section dissolves into `docs/numbers.md`

- Type: structure
- Target section: How a value is held
- Units: A1 (L223-272, L317-321), D8 (L66-70, L107, L279-281), D4 (L352-354)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L207-271); targets `docs/numbers.md#Exact and approximate values`, `#How a value is held`, `#Digits you can trust`, `#Identities and cancellation`, `#The two modes`
- Finding: the section is foundation that §12 q5 gives to `docs/numbers.md`. D8's table places it: L209-219 to `#Exact and approximate values` (the decimal sentence to `#The two modes`); L221-233 to `#How a value is held` (the cancellation example to `#Identities and cancellation`; the float analogy and "snapped onto a decimal grid" stay in `devdocs/numbers.md#The types` and `#Settling`); L235-241 to `#How a value is held` and `#Digits you can trust`; L242-254 to `#How a value is held` in two sentences, the mechanism staying in devdocs; L256-269 to `#Digits you can trust` and `#The two modes`, the chain of limits staying in D4's "How the settings bound each other". D8 deletes the section with one linking sentence at the page's foot (L279-281); D4 deletes it and keeps two facts as one sentence each in the settings entries (a grid point at the ceiling fits the significand limit with room for a product of two; in exact mode no digits setting touches an exact value). A1 drafted five interim old→new pairs to keep the section true until then; whether `docs/numbers.md` states the `onGrid` rounding is A1 Q8.
- Proposed call: dissolve per D8's table (D8 L66-70); apply A1's interim pairs only if the section outlives the creation of `docs/numbers.md`, and carry their corrections (N1, N3, N4, the ceiling's wording) into D8's drafted sections.
- Related: Q-083, Q-108, F-011, F-015, F-016, F-018, F-020, F-021, F-022, F-026, F-027, F-032, F-036, F-045, F-127
- Decision: Stands: dissolve per D8's table; follows Q-108 (the sessions of `docs/numbers.md` and `docs/settings.md` reconcile D4's and D8's drafts, the entry keeping a sentence and a link); amended by F-451 and Q-004 in the carried text ("inexact"; the ceiling's gloss; "grid" named once).

#### F-015. "working precision" for the digits of the grid

- Type: stale (update) · Flags: **conflict**
- Target section: How a value is held
- Units: D8 (L41)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L227-228); the same sentence in `devdocs/settings.md#The model > The terms` (page L36-39)
- Passage: "the number of digits of the grid is the working precision of the arithmetic at that moment"
- Tag: update, new
- Rewrite: "an approximate value is kept to the digits of the current pass, a little beyond the precision the pass works at"; §8 reserves "working precision" for a pass's precision, and the grid has ten digits more (rerun of `schedule`; A5's report L59) (D8 L41).
- Conflict: V5 reads the identical devdocs sentence as keeping the two terms apart (V5 (F-431), V5 L232), though V5's rewrite of `#The model` drops it (V5 L155-161).
- Proposed call: Confirm `update`; the term decision is the terminology group's.
- Related: F-431
- Decision: Stands (update); follows F-431 (ok: "the working grid" in devdocs; in docs "the digits an inexact value is kept to") and F-451.

#### F-016. "midpoint" and "grid" in the user page

- Type: stale (update)
- Target section: How a value is held
- Units: D8 (L43)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L243-247)
- Passage: "What is known of it is its midpoint within its radius, and the app keeps the midpoint on a grid"; "a midpoint rounded to `w` digits"
- Tag: update, new
- Rewrite: "What is known of it lies within its error radius, and the app keeps it to a fixed number of digits" (§8: midpoint devdocs-only); why the grid is decimal and how the kernel rounds onto it stay in devdocs (§9.1) (D8 L43).
- Proposed call: Confirm `update`.
- Related: F-429, F-438
- Decision: Stands (update); follows F-438 and Q-004 (B: "grid" stays in the docs, explained once; the rewrite keeps "a fixed number of digits" or names the grid there).

#### F-017. "A rounding adds half a grid cell" not verified by D8

- Type: not verified · Flags: **low confidence**
- Target section: How a value is held
- Units: D8 (L108, L312)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L228-229)
- Finding: D8 could not verify the charge; its drafted text says only that each rounding is charged to the error radius.
- Why unverified: settling is A3's.
- Proposed call: A3 settles it (context A3 report): `gridded` adds half a unit in the last working digit, and a whole unit where the rounding's exponent would pass the bound; `devdocs/numbers.md#Settling` states the exact charge (D8 (Q-084)) and the user page keeps D8's plain wording.
- Related: Q-084
- Decision: Stands; follows Q-084 (ok: A3's exact charge in `devdocs/numbers.md#Settling`, D8's plain wording in the docs); low confidence: the page's session reads `gridded` if it states the charge.

#### F-018. Gap §6.1: how a value is held, to the depth that predicts refusals

- Type: gap (confirmed)
- Target section: How a value is held
- Units: D8 (L134)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L209-254); `docs/settings.md#(top) > Significand limit` (page L127-138, the dyadic cost)
- Gap: The representation and the dyadic cost are on the settings page.
- Sources: `docs/settings.md` page L209-254 and the Significand limit entry (A5-verified)
- Proposed call: D8's drafted `numbers.md#How a value is held`, reconciled with D4's Significand limit entry (the finding that carries A5 (F-019)).
- Related: Q-108
- Decision: Stands; follows Q-108 (ok).

#### F-019. N4: an exact operand meeting an inexact one is rounded

- Type: contradicts implementation · Flags: **conflict**
- Target section: Operations that stay exact
- Units: A1 (L53, L99-106, L245-256, L317-321), A5 (L376-384), D8 (L110, L186)
- Where: plan N4; `docs/settings.md#How a number is held, and what the settings touch` (page L235-241); `docs/settings.md#(top) > Significand limit` (page L156-157)
- Claim or passage: N4: "exact values are never rounded in exact mode"; `docs/settings.md` L237-239: "nothing else touches an exact value in exact mode: it is never rounded, and no digits setting applies to it."; the Significand limit entry (L156-157): "In exact mode the app never rounds an exact value on its own".
- Finding: true of an exact result of exact operands and of every value shown as exact; `onGrid` rounds an exact operand of a sum, product or quotient with an inexact operand onto the working grid when the exact step would pass the significand limit, the rounding charged to the radius of a result that is inexact anyway; an operand already on the grid stays exact. A5 and D8 put it as an exact operand's digits beyond the working grid being rounded into an inexact result's error radius, which is why `approx` on one operand suffices. The page's example `3^100000` is refused at the default limit ("about 158,497 bits"), which D8's draft says.
- Evidence: `src/core/ball.ts:509-512`, `666-669`, `840-843` (`onGrid` on an exact operand), `997-1008`, `1009-1012`, `1025` (`gridded` returns an on-grid operand unchanged); run: `1 + 1 / 3^41300 + sqrt(2) ≈ 2.4142136` (A1 L55).
- Corrected statement: "`+ - * /`, integer powers and comparisons on exact operands are exact and as long as they need to be: an exact result of exact operands is never rounded in exact mode, and an exact value is never replaced by a different exact value. A sum that cannot be aligned within the significand limit is refused, not rounded (in decimal mode it takes the neighbor rule, N20). Where an exact operand meets an inexact one and the exact step would pass the limit, the exact operand is rounded onto the working grid with the rounding charged to the radius, as `approx` would do, so that the result, inexact in any case, is a value rather than a refusal. `approx` is the designed escape hatch from the strictness: it makes a value inexact on purpose, so that the arithmetic may round it (N23)." (A1 L53; interim page text A1 L249-256)
- Conflict: D8 confirms the page passage "with A5's sharpening" (D8 report, D8 L110), and A5 files it as a sharpening of the verified Significand limit entry (A5 L376-384), where A1 corrects it (L53, L99-106); the facts agree, only the verdicts differ.
- Proposed call: **doc wrong** (scope the sentences): `onGrid` is deliberate and `devdocs/numbers.md#Sums and alignment` states it; `numbers.md#How a value is held` states both halves, as D8 drafts it, with one sentence on what such a result's error radius covers (A1 Q8, proposed yes); A5's sharpening applies when the Significand limit sentence moves.
- Related: Q-083, F-046
- Decision: Stands (doc wrong, scoped); follows Q-083 (ok: one sentence in the docs on what such a result's error radius covers); amended by F-442 ("refused, not rounded" is right: a size refusal) and F-451.

#### F-020. Gap §6.1 (partial): which operations stay exact

- Type: gap (confirmed)
- Target section: Operations that stay exact
- Units: D8 (L135)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L235-241); `docs/functions.md` (page L179-187, `1e999999999 + 1`)
- Gap: Which operations are exact, that exact values are never rounded, and that a sum that cannot align is refused: partial raw material only.
- Sources: those passages
- Proposed call: D8's drafted How a value is held and `approx` sections.
- Related: F-046
- Decision: Stands.

#### F-021. "Certain" becomes "certified" in every page quoting the notes

- Type: stale (update)
- Target section: Digits you can trust
- Units: A2 (L39, L50, L54, L78, L108, L116-118, L120-128, L147), V1 (L63, L71, L256, L282), A8 (L57, L138), V2 (L260, L288), D8 (L32, L42), V5 (L52)
- Where: `devdocs/numbers.md#Certification and the display rule` (page L765); `devdocs/numbers.md#Exact mode` (page L997); `devdocs/numbers.md#Decimal mode` (page L1069, L1185); `devdocs/architecture.md#The converter and its lines > The relation and the note` (page L1018); `docs/settings.md#(top)` tail paragraph (page L194; also page L50, Mode, and L115, Precision limit, listed by D4 (F-427)); `docs/settings.md#How a number is held, and what the settings touch` (page L229-230, L257); `devdocs/settings.md#The model > The terms` (page L41-44) and `> Display digits` (page L49)
- Passage: "`certified`: every digit asked for is certain" (L765); "The display digits are how many digits of the answer must be certain before it is shown" (L997); the note quoted as "8 of 12 digits are certain" (`docs/settings.md:194`, "how many of them are certain"; `devdocs/architecture.md:1018`, a note in parentheses after the line, with the certified digits shown) and "n of m digits are certain" (`devdocs/numbers.md:1069`, `:1185`); "what digits of an answer are certain; a finer grid is necessary for more certain digits" (`docs/settings.md`); "the error bound that decides which digits are certain" (`devdocs/settings.md`).
- Tag: update (§12 q8; plan row new): A2, V1 and V5 tag it; D8 confirms A2's row and adds page L229-230, L257; A8 and V2 file L1018 as the page following A2's code change.
- Rewrite: "certified" in each place, with the code change of `src/outcome.ts:507` (`noteOf`) that §12 q8 records for A2, proposed there and not applied (A2 L120-128): L765 and L997 (A2 L39; V1 L256, L282); L1069 goes with its paragraph's keep-as-intent rewrite, L1185 with the decimal-mode paragraph's (V1 L256); L1018 "8 of 12 digits are certified" (A2 L50, L104-109), or V2's rewrite of the paragraph (V2 L258-260), which drops the quotation for "the certified digits of those asked for"; the L194 sentence moves to `numbers.md` (D8 L32); in devdocs, V5's rewrite of `#The model` carries it (V5 L52), as do D4's pairs (D4 L361-363).
- Proposed call: Confirm `update` (q8 is binding), applied with the code change: not a superseded design but a decided code change; the pages quote `src/outcome.ts:507` correctly today, so the quoted note changes only with that change, which is bugs.md's (A2 (B-068), D8 (B-068)) and which D8 (Q7) asks to land before `docs/numbers.md` quotes the notes; at L1018 the quote changes with it or is dropped as V2 drafts.
- Related: Q-006, B-068, F-427
- Decision: Stands (update, with the code change); follows Q-006 (ok: the change lands before `docs/numbers.md`, carrying the panel's lines).

#### F-022. "Four times the limit plus ten" reads as 4L + 10; limit and ceiling run together

- Type: contradicts implementation · Flags: **conflict**
- Target section: Digits you can trust
- Units: A3 (L27, L44, L47, L66-67, L86-92, L110-112, L144, L148-149, L153), A1 (L258-272, L288-292), V1 (L68, L266), D8 (L44, L94, L112)
- Where: plan N8; `devdocs/numbers.md#Working precision and the schedule` (page L834-837); `docs/settings.md#How a number is held, and what the settings touch` (page L258-261, L271); `docs/settings.md#(top) > Precision limit` (page L112)
- Claim or passage: N8: "up to a ceiling of four times the precision limit plus ten"; devdocs: "four times the precision limit plus the guard, 4,040 digits"; the Precision limit entry: "four times this plus ten digits (4,040 by default)" (A3 also tags page L112 stale, update); `docs/settings.md` L258-261: "until the two ends of the ball round to the same digits. The precision limit is how far it may raise them, four times the limit plus ten, which is also the most digits an answer may be asked for." (D8 also tags it stale, update), and the bold "**Why four times the limit plus ten.**" (L271).
- Finding: `ceilingFor` is `4 × (L + 10)`, 4,040 at `L = 1,000`; the phrase parses as `4L + 10`, 4,010. `devdocs/settings.md#The model > Precision limit` writes the formula and is clear. The L258-261 sentence also runs the precision limit together with the ceiling: its relative clause reads as if the ceiling (4,040 at the default) could be asked for, while the precision limit (1,000) is the most digits an answer may be asked for, as the page's own panel line says (page L17-18); the rest holds (A2's N9).
- Evidence: `src/core/context.ts:180`, `188-190`; `src/core/pipeline.test.ts:222-245` (`[18, 36, 72, 144, 288, 576, 1152, 2304, 4040]`, `[1010, 2020, 4040]`); `devdocs/settings.md#The model > Precision limit` (A3 report); D4 ran the passes 18 … 2304, 4040 (context D4 L47); A2's N9 (`src/core/ball.ts:2069-2088`); D8's rerun: passes of 18, 36, …, 2304, 4040 digits at eight, `ceilingFor(1000)` is 4,040.
- Corrected statement: N8: "The display digits are how many digits of the answer must be certified. The app evaluates at a working precision a little above that (the digits asked for plus ten); if the digits cannot be certified at that precision, it evaluates again at double the precision, and so on, up to a ceiling of four times the sum of the precision limit and ten (`4 × (L + 10)`: 4,040 digits at the default limit of 1,000). The passes together cost at most about twice the pass that succeeds, except where the ceiling lies just above a doubled precision, where the last two passes are nearly one size and the passes together cost about three times the last." (A3 L27); the Precision limit entry: "four times the sum of the limit and ten digits (4,040 by default)" (A3 L47; the whole bullet A3 L86-92); the wording everywhere: "four times the sum of the limit and ten" (A1 Q2, L288-292); L258-261: D8's "until every value within the error radius rounds to the same digits. The display digits may be set up to the precision limit, and the retries run up to a ceiling of four times that limit plus ten digits." (D8 L44), or A1's interim "the app may raise the grid to four times the sum of the limit and ten" (A1 L262-264); A3 leaves the paragraph to D8's dissolution, keeping the distinction (A3 Q4).
- Conflict: (1) Wording: D8's rewrite of L258-261 keeps "four times that limit plus ten digits" (D8 L44), and D4's drafted Precision limit entry keeps "the finest grid the app rounds onto, which is four times this limit plus ten digits" (D4 L257-259; D4 (F-126, F-136)), though both units confirm `4 × (L + 10)` (context D4 L35, D4 L47; D8 L112). (2) A1's interim text calls the ceiling a grid ("the app may raise the grid to four times the sum of the limit and ten", A1 L262-264, A1 L223-272 pair 4), while A3 holds that the ceiling is a pass's precision, keeps "grid" out of the user docs and changes §8's gloss (A3 L68, L134, L142); A1's and D8's rewrites of L258-261 differ. (3) D8 drops the "Why four times…" paragraph (L271; D8 (F-026), D8 L45) that A1 rewrites with a repo-relative link (A1 L266-272).
- Proposed call: **doc wrong**: the code and its test are unambiguous, and the plan's own §1.1.2 table and `devdocs/settings.md#The model` write `4 × (L + 10)`; nothing points to code wrong. Every rewrite writes the formula or "four times the sum of the limit and ten", and the L258-261 sentence keeps the precision limit (the most digits an answer may be asked for) apart from the ceiling. Settle the wording ("the sum of"), the "grid" gloss (A3 Q2, §8) and D8's drop of L271 before the dissolved section's text lands; keeping the formula once in the settings entry (D4 (Q-005)) and amending N8 (A3 (Q-073)) are the owner's.
- Related: Q-005, Q-073, B-041, F-026, F-125, F-126, F-136, F-429, F-508
- Decision: Stands (doc wrong); follows Q-005 (A: the formula once, in the Precision limit entry, "four times the sum of the limit and ten" with 4,040 beside it), Q-073 (N8 amended) and Q-004 (B: the ceiling is a pass's precision; "grid" stays in the docs, explained once, so A1's "raise the grid" is reworded and D8's drop of L271 stands).

#### F-023. N10: the partial kind is reachable today, by more than one route

- Type: contradicts implementation · Flags: **conflict**
- Target section: Digits you can trust
- Units: A2 (L27, L40, L60, L63, L75-80, L126), A4 (L135), D5 (L58, L123-124, L183, L195), D6 (L29, L237), V1 (L64, L254)
- Where: plan N10; plan §1.1.6 item 13; `devdocs/numbers.md#Certification and the display rule` (page L768-770; stale `update`, A2 L40, V1 L254)
- Claim or passage: N10: *partial* ("8 of 12 digits are certain"); "Whether *partial* surfaces today, and for which inputs, is to be verified … the intended route … is the two-argument `approx`". The page: "with none certified, which only a value on a rounding tie at the digits asked produces at the ceiling, the text is the midpoint at the digits asked".
- Finding: *partial* surfaces today, from the ceiling pass only (the retry loop keeps it from the display otherwise), by two routes: a value on a rounding boundary computed inexactly (`sqrt(2)^2 * 1.000000025` is `≈ 2 (7 of 8 digits are certain)`; in exact mode `log(256, 512)` at three digits is `≈ 1.1 (2 of 3 digits are certain)` and `log(4, 8)` at one `≈ 2 (0 of 1 digits are certain)`, A4), and a ball straddling a grid point under a directed mode, none of eight certified (`approx(1)`, `cosh(1e-999999999)` under `floor`; `approx(2)` under `ceiling` or `floor`, D6; `exp(1e-999999999)`, `cos(1e-999999999 radian)` under `ceiling`, D5). "None certified" is a value that no count from the digits asked down to one certifies (a one-digit tie in a nearest mode, `sqrt(2)^2 * 0.75` at one digit is `≈ 1 (0 of 1 digits are certain)`; a grid point in a directed mode; a ball too wide for one digit); the text is then the midpoint at the digits asked. The *unbounded* kind and its note "the digits are not certified" cannot appear today, nothing originating `UNBOUNDED` (A2 L27, reasoned from code, not run). Every unit that looked agrees *partial* is reachable (A2, A4, D5, D6, V1; V3).
- Evidence: `src/core/display.ts:243-283` (the kind order); `src/core/pipeline.ts:334-374`; `src/outcome.ts:504-517` (`noteOf`); `src/core/ball.ts:652,826,833,1261,1456` and `src/core/builtin.ts:494-498` (`UNBOUNDED` only propagated); live runs as quoted.
- Corrected statement: A2's N10: the six kinds in order with their notes; *partial* reachable today by the two routes above; none certified as above; the two-argument `approx` (#100) one route to partially certified results, not the only one (full text: A2 L27). Page L768-770 rewrite: A2 L79, V1 L254 (the same text).
- Conflict: D5 (L58, L123-124, L183, L195) proposes that A2 record the directed-mode route as "the one route to the partial note today"; A2 (L27, L60) shows a second route under the default half-even mode, and A4 (L135) more inputs of it (`log` of a rational on a tie).
- Proposed call: **doc wrong** (plan N10 and page L768-770; the `Shown` comment `src/core/display.ts:190-192` is bugs.md's): the display's kind order is coherent and deliberate, and N10's open question is settled, reachable today; the two-argument `approx` stays the designed route for a value given with an uncertainty. D5's "one route" is checked against A2's half-even run (`sqrt(2)^2 * 1.000000025`, seven of eight).
- Related: Q-063, Q-078, B-044, F-024
- Decision: Stands (doc wrong); follows Q-078 (ok: reachable by two routes); amended by Q-011: the two-argument `approx` is named as future work only in `devdocs/future.md`, so N10's "(#100)" and "the intended route" do not travel into the pages.

#### F-024. "or that none is certified" names a note that does not exist

- Type: contradicts implementation
- Target section: Digits you can trust
- Units: D8 (L40, L118, L200)
- Where: `docs/settings.md#(top)` first tail paragraph (page L196-197)
- Claim or passage: a note says "how many of them are certain …, that the value is zero within a bound …, or that none is certified" (D8 also tags it stale, update)
- Finding: No note says that: a value with no digit certified carries the count note with zero ("0 of 8 digits are certified"); the note "the digits are not certified" is unreachable today; decimal mode's note is "a step could not be certified at the precision limit", beside the dotted `≈`.
- Evidence: rerun of `approx(1)` under `floor`; A2's report (`audit/reports/A2/fable.md:27`)
- Corrected statement: "how many of them are certified ("7 of 8 digits are certified", and "0 of 8" when none is), or that the value is zero within a bound ("within 2e-30 of zero" …)" (D8 L200)
- Proposed call: **doc wrong** (the page names the notes that exist); the unreachable note is code (D8 L11).
- Related: Q-006, B-024
- Decision: Stands (doc wrong); follows Q-006.

#### F-025. The two tail paragraphs move to numbers.md, one sentence in place

- Type: structure
- Target section: Digits you can trust
- Units: D8 (L72, L73, L267-271), D4 (L117, L350), A2 (L116-118)
- Where: `docs/settings.md#(top)` tail paragraphs (page L192-197, L199-205)
- Finding: Page L192-197 (what a note says) goes to `numbers.md#Digits you can trust`; L199-205 splits: the relations to Digits you can trust, the cancelling roots to Identities and cancellation, the divisor to Values at an edge. In place, one sentence: "How to read a result, its `=` or `≈` and the note beside it, is in `[Numbers](numbers.md#digits-you-can-trust)`." (D8 L267-271). The paragraphs state the model correctly (context A2 report, D8 report, D8 report). A2's in-place edit of L194 ("certified", A2 L116-118) is superseded by the move.
- Proposed call: Move as D8 maps it and keep the one sentence at the settings page's foot.
- Decision: Stands.

#### F-026. "Why four times the limit plus ten" pointer dropped

- Type: stale (drop)
- Target section: Digits you can trust
- Units: D8 (L45, L71)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L271)
- Passage: "**Why four times the limit plus ten.** The schedule of passes, and why its factor is four and its guard ten, are explained in `devdocs/numbers.md` ("Working precision and the schedule")."
- Tag: drop, new
- Rewrite: delete with the section; `numbers.md#Digits you can trust` links `devdocs/numbers.md#Working precision and the schedule` at the section level (§7.1), and the Precision limit entry links `numbers.md` (§12 q5) (D8 L45).
- Proposed call: Confirm `drop`. A1's interim edit keeps the heading as a repo-relative link until the section dissolves (A1 (F-013) pair 5): an overlap only while the section stands.
- Related: Q-082, F-013, F-014, F-134
- Decision: Stands (drop); follows Q-082 (ok).

#### F-027. Gap §6.1: digits you can trust

- Type: gap (confirmed)
- Target section: Digits you can trust
- Units: D8 (L136)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L256-260); `docs/settings.md#(top)` (page L192-197; the uncertified mark in the Mode entry)
- Gap: Certification, the retries and the notes are scattered on the settings page.
- Sources: those passages
- Proposed call: D8's drafted `numbers.md#Digits you can trust`.
- Decision: Stands.

#### F-028. N14 and devdocs: a difference "refused as too large" cannot arise

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Comparison and equality
- Units: A6 (L80, L133-143, L335-341, L365-373), V1 (L51, L214)
- Where: plan N14 ("A difference refused as too large counts as across zero"); `devdocs/numbers.md#Comparison` (page L283-284); `devdocs/functions.md#The check at a call` (page L348-350)
- Claim or passage: N14 and `#Comparison`: "and two inexact values through their difference, a difference refused as too large counting as across zero."; `#The check at a call`: "a difference refused as too large to form counting as across zero (`orderOf` in `ball.ts`)".
- Finding: the difference of two inexact values never fails for size: `addBallsCore` settles both, adds them if they then align and otherwise absorbs the smaller into the larger's radius; what remains are the exponent bound's failures (`overflow`, `underflow`, `unresolved` at the bound), each `straddles` in `orderOf`. The true phrase is "a difference that cannot be formed as a value".
- Evidence: `src/core/ball.ts:489-527` (508-526), `417-422` (421); reasoned from code (A6 L80); A1 reads the same settle-first path (A1 report).
- Corrected statement: the difference against zero always aligns (the smaller operand absorbed into the radius) and counts as across zero when it cannot be formed as a value, past the exponent bound or straddling it (A6 L335-341, V1 L214); `#The check at a call`: "a difference that cannot be formed as a value, past the exponent bound or straddling it, counting as across zero (`orderOf` in `ball.ts`; two inexact values always align, the smaller absorbed into the radius)" (A6 L371-373).
- Conflict: A6 handed V4 this phrase as the one thing wrong on `devdocs/functions.md#The check at a call` (A6 L443-457); V4 proposes no edit to the section (V4 L68).
- Proposed call: **doc wrong** (A6, reasoned from code): the alignment path is deliberate and `#Sums and alignment` describes it; the phrase names a refusal two inexact operands never reach. One fix covers the plan claim and both pages; the same phrase in code comments is bugs.md's.
- Related: Q-059, B-042
- Decision: Stands (doc wrong); low confidence: the page's session reads `addBallsCore` before applying; amended by F-442 ("refused as too large" is a size refusal, the only sense "refused" keeps).

#### F-029. N14: a touch is not a straddle; the callers decide

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Comparison and equality
- Units: A6 (L80, L107-127, L257, L313-333, L375-384, L443-446, L457-459), V1 (L50, L212), V4 (L26, L106)
- Where: plan N14; plan §1.1.6 item 6; `devdocs/numbers.md#Comparison` (page L277-279); `devdocs/functions.md#The check at a call` (page L362-366; the verdict table, which A6 and V4 find right)
- Claim or passage: `#Comparison` and N14: "A ball touching a point counts as straddling it." (N14 adds: "so a strict comparison of an inexact value at its bound is undecided and a non-strict one decides only when the ball ends exactly on the bound"); `#The check at a call`: "So an inexact value equal to its bound never decides a strict comparison, and decides a non-strict one only if its ball happens to end exactly on the bound: `tempC(approx(-273.15))` stays undecided to the ceiling."
- Finding: `position` is six-valued (`below`, `above`, `touchingBelow`, `touchingAbove`, `at`, `straddles`) and `orderOf` answers a touch as an order of its own; "touching counts as straddling" is its callers' rule, true of the built-ins' edge checks and the rounding cells, while `decide` (the conditions of user-defined functions; `VERDICTS`) lets a touch decide a non-strict comparison on its side and leaves a strict one undecided, so the claim's consequences hold (V4). Per the corrected N14 a strict comparison fails when the ball ends on the bound from the other side, and a non-strict one holds only when it ends there from its own side: the page's own verdict table shows `>` failing at a touch from below (page L356), and the ball of `tempC(approx(-273.15))` reaches across `-273.15`.
- Evidence: `src/core/ball.ts:362-402` (`:366-370`, `:376-378`, `:391`, `:398`), `:417-422`; `src/core/evaluate.ts:1050-1099` (`VERDICTS`; `:1059-1093`); `src/core/ball.test.ts:231-234`; `src/core/evaluate.test.ts:1941-1995` (per A6); runs: `tempC(-273.15) = 0 K` (it meets `x >= -273.15`), `box(1, 1, 3) = 1`, `box(approx(1), 1, 3) ≈ 1` with the warning, `kcond(0.1 + 0.2)` meets `x <= 0.3`, `tempC(approx(-273.15))` undecided to the ceiling (`≈ 0 K (within 2e-4047 of zero)` with the warning).
- Corrected statement: A6: two exact values compare exactly, never refused and always decided; an inexact value is placed against an exact one directly, two inexact values through their difference against zero, which always aligns; a ball is closed, so the comparison tells a touch from a straddle, strict and non-strict comparisons each holding, failing or staying undecided at a touch by its side, every comparison undecided across; the built-ins' edge checks treat a touch as a straddle, the conditions do not (full text: A6 L80; devdocs text A6 L313-333, V1 L212). V4: "A touching ball is an order of its own in the code (`touchingBelow`, `touchingAbove`), not a straddle; the claim's consequences hold as stated, since the verdict table treats a touch as undecided for a strict comparison and as decided for the non-strict one on that side." (V4 L26). `#The check at a call`: "So an inexact value equal to its bound never decides a strict comparison in its favour, and decides a non-strict one only if its ball happens to end exactly on the bound, from the side the comparison admits: `tempC(approx(-273.15))`, whose ball reaches across `-273.15`, stays undecided to the ceiling." (A6 L382-384)
- Conflict: (1) Verdicts on N14: V4 marks it confirmed with the gloss corrected (V4 L26); A6, which owns N14, marks it corrected (A6 L80), with two corrections (the touch, as V4 does, and "a difference refused as too large", which V4 does not flag) and a refinement of the strict case. (2) A6 contradicts itself on `countOf`: listed among the callers that "all treat a touch as a straddle" (A6 L121-126) and written into the rewrite as "a unit list's counts treat a touch as a straddle, since the value may lie on the edge, where the answer jumps" (A6 L329-330, adopted by V1 L212), but called "the one place a touch decides a value without `decide`" (A6 L457-459); A8 reads `countOf` as taking the nearest integer for a ball that straddles or touches it (A8 (F-072)). (3) V3 cites `position` (`src/core/ball.ts:355-361`) as "touching counts as straddling" (V3 L27), and D5 and D6 confirm N14's "touching counts as straddling" as the built-ins apply it (D5 L125, D6 L30), while A6 and V4 make a touch an order of its own (V4 L26, `ball.ts:376-398`); the contexts differ (built-in edges against condition verdicts: A6, and V3 per V4 report, say the built-ins' edge checks fold a touch into a straddle while the conditions do not). (4) On `#The check at a call`, V4 keeps the section whole with no edit (V4 L68) and confirms the verdict table (V4 L86); A6, who had handed V4 the section (A6 L443-457), corrects the sentence.
- Proposed call: **doc wrong**: the sentences state the callers' rule as `position`'s own, the code tells a touch from a straddle deliberately (`VERDICTS`; the six answers are tested), and the `#The check at a call` sentence contradicts the page's own table, which both units find correct. To settle the verdict label, compare A6's corrected statement (A6 L80), which also covers V4's point, with V4's note (V4 L26); before V1 L212 is applied, read `src/core/convert.ts:394-401` to settle whether a unit list's counts belong among the touch-as-straddle callers. Whether the user docs state the touch rule is A6 Q1.
- Related: Q-024, F-072, F-447, F-514
- Decision: Stands (doc wrong); follows Q-024 (ok: one sentence on the touch rule in the docs) and F-447 (ok: touch and straddle in devdocs); the page's session reads `src/core/convert.ts:394-401` for the unit-list counts before applying V1 L212; low confidence noted. Amended on 2026-10-14 (plan §12.3): the unit-list counts are `docs/quantities.md`'s (work order 02); `docs/numbers.md` does not list them.

#### F-030. N16 and `#Conditions`: equality absent today, not ruled out

- Type: stale (update) · Flags: **low confidence**
- Target section: Comparison and equality
- Units: A6 (L82, L88, L228-230, L343-359), D2 (L35, L159, L316-318), V4 (L28, L40, L196-259)
- Where: plan N16; plan §1.3; plan §1.2.5 row; `devdocs/functions.md#Conditions` (page L273-276)
- Passage: "**There is no equality and no `!=`.** `=` always ends the head, and equality of an inexact argument can never be decided on a ball, so an equality condition would be undecided for every inexact argument." (`#Conditions`); N16's "incidental limit", the owner's intent that equality operators may come (§1.3).
- Tag: update (the plan row, confirmed by A6, D2 and V4); N16 is confirmed as a statement of the code, the four orderings being the whole set (`src/core/definitions.ts:179`, `:385-393`); its intent half is not verified ("which no code can confirm", A6).
- Rewrite: not provided today and not ruled out. The comparators are the four orderings, and a design that adds equality operators or conditional expressions must say what an undecidable comparison of inexact values yields. Link `future.md` "Extensions that fit" (A6 L349-359; D2 L318; V4 L220-227).
- Finding: N16 holds as a statement of the code (four comparators; equality only in the `at` row, the exact cases, `=` on a line and `disjoint`'s refutation); that the absence is incidental and equality operators may come is the owner's intent (§1.3), which no code can confirm (A6 L228-230).
- Proposed call: Confirm `update`, and keep N16's intent sentence as the owner's statement, from §1.3 (nothing to check in code). The three drafts agree in substance: A6 says "today" and "an extension that fits"; D2 and V4 put it as a constraint on any design. The `future.md` entry the link needs does not exist yet (A6 (F-345); V6 is to add it).
- Related: Q-112, F-345
- Decision: Stands (update) as amended by Q-011: the pages state the plain fact (the comparators are the four orderings; there is no equality and no `!=`), `devdocs/functions.md#Conditions` keeps the constraint that equality of inexact values is undecidable on balls and links `devdocs/future.md`, which carries the intent and A6's constraint (Q-112); the user docs say nothing of what may come. N16's intent sentence is `future.md`'s. `!=` goes with equality as future work (plan §12.3, R-5): `devdocs/functions.md#Not in this design` does not list it.

#### F-031. Undecided comparisons in the exact functions: D6's rule 3 at an edge

- Type: gap (confirmed)
- Target section: Values at an edge
- Units: D6 (L55, L81, L95, L235)
- Where: plan §6.1 (comparison and equality: the rounding functions, `sign`, `div`, `mod`); neither corpus states rule 3
- Gap: where an undecided comparison surfaces in the rounding functions, `sign`, `div` and `mod` (§6.1, confirmed); its user-facing statement is D6's rule 3, which neither corpus states (new): `floor` decides a ball against the cell from its result to the next integer, `ceil` the cell below, `trunc` the cell on the result's side of zero (the open cell between minus one and one at zero); `round` half a unit either side for the modes to nearest, one unit on the side the mode rounds from for `ceiling` and `floor`, both sides at zero for `towardZero`, the point itself at zero for `awayFromZero`. So a value that cannot be told from zero is `= 0` under `trunc`, under `round` to nearest and under `towardZero`, and undecided under `floor`, `ceil`, `sign`, and `round` in `awayFromZero`, `ceiling` and `floor` (harness).
- Sources: `devdocs/builtins.md#The exact functions` ("On balls"), which holds the cell mechanism (`round.ts:211-301` per D6)
- Proposed call: one sentence in "Values at an edge" (D6 Q6), pointed to from "Comparison and equality".
- Related: Q-025
- Decision: Stands; follows Q-025 (ok: one complete sentence naming every rounding function and mode); amended by F-442: "undecided", "cannot be told from", never "refused", for these.

#### F-032. Gap §6.1 (partial): values at an edge

- Type: gap (confirmed)
- Target section: Values at an edge
- Units: D8 (L137, L204)
- Where: plan §6.1; `docs/settings.md#(top)` (page L204-205); `docs/functions.md` (page L174-179)
- Gap: Partial raw material only.
- Sources: those passages
- Proposed call: D8's drafted sentences for `numbers.md#Values at an edge`; the other edges are A6's and the built-in units'.
- Related: F-031
- Decision: Stands; amended by F-442 ("cannot be told from" is an error at the ceiling, not a refusal).

#### F-033. The call-cost paragraph triplicated; where its parts go

- Type: structure · Flags: **conflict**
- Target section: Identities and cancellation
- Units: D8 (L74-78, L154-160, L283-285, L314), V4 (L74, L98, L427-484, L563), V2 (L81, L226-228, L234-236)
- Where: `docs/definitions.md#Functions` (page L309-329, the last paragraph); `devdocs/functions.md#Precision, the radius and cost`; `devdocs/architecture.md#Functions` (the last paragraph, page L846-866; the want paragraph, page L776); plan §9.1
- Finding: §9.1 finds the paragraph three times: calls not memoized, the dependency problem, and hand-written functions against built-ins. D8 sends the parts of `docs/definitions.md` L309-329 as follows: L309-313 (a call computed as its body typed out; `em(x)`) stays in `definitions.md`, linking `numbers.md` "Digits you can trust"; L313-317 (a call not remembered; `2^k`) keeps one sentence there, the mechanism being `devdocs/functions.md`'s; L318-321 (a parameter used twice) goes to `numbers.md` "Identities and cancellation", leaving a clause and a link; L321-326 (a hand-written function against a built-in) goes to the same section with its examples, leaving a clause and a link; L326-329 (decimal mode rounds each step) goes to `numbers.md` "The two modes", leaving a clause and a link. V4: `definitions.md#Functions` keeps the user statement, `numbers.md` the dependency problem (C27), `devdocs/functions.md` the mechanism, and `devdocs/architecture.md#Functions` a pointer (V2's). V2: the architecture copy (its last paragraph) restates the other two, the rest of the section staying as mechanism and intent; V2's pair 1 also opens the want paragraph with "Conversion into a function is the third output mode" and a link to `docs/quantities.md` for what it answers, and says "the bare name of a defined function".
- Conflict: D8 moves the hand-written rule, with its examples, and the decimal-mode rule to `numbers.md` (D8 L77-78). V4 keeps both in `definitions.md#Functions` and gives `numbers.md` only the dependency problem (V4 L563). V4's draft links "a hand-written equivalent … decimal mode … is in definitions.md, 'Functions'" (V4 L434-441). The two fit together if `definitions.md` keeps D8's clauses.
- Proposed call: one user statement with links in `definitions.md#Functions`; the dependency problem in `numbers.md`; the mechanism in `devdocs/functions.md`; in `devdocs/architecture.md#Functions` the last paragraph becomes one sentence with links to `functions.md` and `docs/definitions.md` (V2 L234-236; V2 L81, taken up) and the want paragraph gains the link (V2 L226-228). Still to settle: whether the hand-written rule's examples (`log(2, 8)`, the `tanh` formula) move to `numbers.md` (D8) or stay (V4).
- Related: Q-107, F-036
- Decision: Stands; follows Q-107 (ok: the user statement in `definitions.md#Functions`, the dependency problem in `numbers.md`, the mechanism in `devdocs/functions.md`, a pointer in `architecture.md`) and F-468 (A: V2's "the third output mode" becomes "conversion into a function, the output mode a function want gives"); the session of `docs/numbers.md` settles whether the hand-written rule's examples move (D8) or stay (V4); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-034. N7: a refusal the loop does not retry ends it early

- Type: contradicts implementation · Flags: **conflict**
- Target section: Identities and cancellation
- Units: V6 (L26, L108)
- Where: plan N7
- Claim or passage: "such expressions run every pass up to the ceiling (cost)".
- Finding: a pass can end the retry loop before the ceiling with a refusal the loop does not retry, and the best result so far is then shown.
- Evidence: `src/core/pipeline.ts:325-327` ("any other error ends the loop with the best result so far"), `425-441`; `bench/stress/catalogue.json`: all 225 `default` entries ran nine passes to 4,040 digits; the `extreme` entry `incbeta(0.3, 0.001, approx(0.5)) - incbeta(0.3, 0.001, approx(0.5))` ran eleven of fifteen passes, the eleventh (18,432 digits) ending the loop, and shows the tenth pass's "≈ 0 (within 2e-9225 of zero)".
- Corrected statement: "As the numeric model stands, an identity through an irrational step never certifies zero or a rational: `sqrt(2)^2 - 2` is `≈ 0` within a bound, `turn` into `deg` is `≈ 360`, `sin(pi() radian)` is `≈ 0`; such expressions run every pass up to the ceiling, or until a pass ends the loop with a refusal the loop does not retry, when the best result so far is shown (cost), and dividing by such a value is refused ("cannot be told from zero"). This is a consequence of the current representation and computation paths, not a design goal: the user docs state it as today's behaviour, and the intended remedy, if one comes, is a symbolic layer for a subset of identities (§1.3; `devdocs/future.md#Symbolic values`)." (V6 L26)
- Conflict: A3 confirms N7 as written (A3 L26; its runs all reach the ceiling), though its own trace of `resolve` ends the loop on any unretried error with the best result (A3 L58), as A1 (L55) and A5 (A5 report) say of a later pass's `tooLarge`: the verdicts differ, not the facts.
- Proposed call: doc wrong: the claim omits an end that `resolve`'s comment and `devdocs/numbers.md#Working precision and the schedule` both state; take V6's statement into the page.
- Related: Q-001, F-351, F-509
- Decision: Stands (doc wrong); follows Q-001 (a refusal at a later pass ends the loop with the best result so far; no code change); amended by Q-011: the clause "not a design goal … the intended remedy is a symbolic layer" is `devdocs/future.md`'s (its "Symbolic values"); the user page states today's behaviour as a plain fact, and `devdocs/numbers.md` links `future.md`.

#### F-035. A built-in against the same formula written by hand

- Type: gap (new)
- Target section: Identities and cancellation
- Units: D8 (L126, L147, L216)
- Where: `docs/definitions.md#Functions` (page L321-326); target `docs/numbers.md#Identities and cancellation`
- Gap: a formula written by hand loses the built-in's exact cases, adds up error radii, and can pass a limit the result does not. Rerun: `log(2, 8)` is `= 3` while `ln(8) / ln(2)` is `≈ 3`; the `tanh` formula is refused at `3e18`, where `tanh(3e18)` is `≈ 1`. No §6.1 bullet covers it.
- Sources: `devdocs/functions.md#Precision, the radius and cost` (the hand-written-equivalent bullet); `docs/definitions.md:321-326`.
- Proposed call: D8's drafted paragraph in `numbers.md` "Identities and cancellation" (D8 L208-216). See the triplication finding for the destination conflict with V4.
- Related: F-036
- Decision: Stands; the destination follows F-033 (the session settles).

#### F-036. Gap §6.1: identities and cancellation, and their cost

- Type: gap (confirmed)
- Target section: Identities and cancellation
- Units: D8 (L138)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L230-232); `docs/settings.md#(top)` (page L199-203); `docs/definitions.md` (page L318-326)
- Gap: The material is spread over the settings and definitions pages.
- Sources: those passages
- Proposed call: D8's drafted `numbers.md#Identities and cancellation`.
- Decision: Stands.

#### F-037. N17 and the Mode entry: step lists that miss operators

- Type: contradicts implementation · Flags: **conflict**
- Target section: The two modes
- Units: A4 (L26, L44, L83, L89, L93-102, L109-113), V1 (L72, L286), D4 (L134, L217-219, L350)
- Where: plan N17; plan §1.1.6 item 2; `devdocs/numbers.md#Decimal mode` (item 2); `docs/settings.md#(top) > Mode` (page L57-60)
- Claim or passage: N17 and devdocs item 2: "each `+`, `-`, `*`, `/`, juxtaposition, `^`, each literal, each unit looked up, and each function call as a whole"; the Mode entry: "A step is an operation you can see: each `+`, `*`, `/` or `^`, each number typed (…), each unit, and each function call as a whole" (A4 also tags it stale, update).
- Finding: a leading `-` is a node and a step (`src/core/evaluate.ts:649-663`): harmless without working digits, rounded to `p` with them (`-(1/3*3)` over twelve working digits is `= -1`); N17's list misses it. The Mode entry's list also leaves out binary `-` and two factors written side by side, both steps under N17. N17's other parts hold: a prefixed unit is one product, a defined function its body's steps, `approx` the identity, conditions always decide (A4 report).
- Evidence: `src/core/evaluate.ts:495-664` (every node kind through `stepQuantity`); run as quoted (A4); for the Mode entry both units reasoned from N17's evidence, neither ran it.
- Corrected statement: A4's N17 adds "a leading `-`" to the steps and the literal's refusal to the rules (full text: A4 L26); item 2: "… juxtaposition, `^`, a leading `-`, each literal, …" (A4 L95; V1 L286); the Mode entry: "each `+`, `-`, `*`, `/` or `^`, two factors written side by side, each number typed …" (A4 L113).
- Conflict: A4 corrects the Mode entry's list in place (A4 L109-113, L113); D4 drops it from the page and links `numbers.md`, "The two modes", for what counts as a step (D4 L217-219).
- Proposed call: **doc wrong**: every node goes through `stepQuantity`, the `neg` case included; the lists missed operators. Whether the Mode entry keeps the list or moves it to `numbers.md#The two modes` (§7) is the owner's call; wherever it lands it carries A4's corrected list.
- Related: F-433
- Decision: Follows its own answer (A): the list moves to `docs/numbers.md#The two modes` with A4's corrected list; the Mode entry links it. [decisions.md section 3; plan §12.1]

#### F-038. N19: the reciprocal line is the reciprocal of the shown ratio

- Type: contradicts implementation · Flags: **conflict**
- Target section: The two modes
- Units: A4 (L28, L43, L75, L85, L106, L132-136, L141), V5 (L28)
- Where: plan N19; `devdocs/numbers.md#The working digits` (second bullet); `devdocs/architecture.md#The converter and its lines > The reciprocal` (page L1051-1100)
- Claim or passage: the reciprocal listed among the last steps, "so the answer is the correctly rounded value of the last operation on `w`-digit operands".
- Finding: the reciprocal line is `step` of `1 / value`, `value` being the ratio already rounded to `p` (`src/outcome.ts:330-335`): `3 m` in `in` shows `in = 0.0084666664 × 3 m` with and without twelve working digits, where exact mode certifies `in ≈ 0.0084666667 × 3 m`. It is correctly rounded from the shown ratio, not from the exact `want / have`. A4 handed this to A8 and #92 (A4 L132-136); A8's report does not take it up: it checks the decimal-mode reciprocal only on `3 m` into `m`, whose ratio is exact. A4 L132-136's other hand-offs (`-1e+8`, `log`) concern other pages (A4 report).
- Evidence: `src/outcome.ts:332`; runs as quoted (A4 L28, ran).
- Corrected statement: "The reciprocal line is the exception: it is the correctly rounded reciprocal of the `p`-digit ratio shown, so `3 m` in `in` at eight digits gives `0.0084666664` whatever the working digits, where the reciprocal of the exact ratio rounds to `0.0084666667`." (A4 L106; V1 L304); N19 as in the finding on the `have` as an operand.
- Conflict: (1) V5 (L28) counts the reciprocal confirmed on `3 m` in `m`, where the two readings agree; A4 (L75, L85) separates them on `3 m` in `in`. (2) A8 reports #92's decimal-mode row answered by `step` (A8 (F-412), A8 L27, L52); A4 (L28, L85) shows a decimal-mode reciprocal that is not the correctly rounded one.
- Proposed call: **undetermined**. Doc wrong if the code's choice stands: A4 (Q1) proposes to keep and document it, recording the alternative (`want / have` from the working-digit operands) on #92. Code wrong if the page's "correctly rounded value of the last operation on `w`-digit operands" is the intent for the reciprocal too. Settled by A4 (Q-046), which comes before `devdocs/architecture.md` "The reciprocal" and the #92 link are rewritten; the paragraph then says which ratio it inverts in decimal mode.
- Related: Q-046, B-008, B-009, F-043, F-412
- Decision: Stands (undetermined), settled by Q-046 (ok: keep and document; the alternative recorded on #92): doc wrong, the pages saying which ratio the line inverts in decimal mode.

#### F-039. Gap (hedged): docs/ never says decimal mode runs a single pass

- Type: gap (new) · Flags: **low confidence**
- Target section: The two modes
- Units: V6 (L116, L234)
- Where: `docs/` (to be confirmed against `docs/settings.md`); `docs/settings.md#(top) > Mode`; target `docs/numbers.md` "The two modes" (or "What costs time")
- Gap: decimal mode runs a single pass and so never pays the schedule, and no page in `docs/` is known to say so: V6 did not read `docs/settings.md` and asked its unit to confirm the hedged gap; D4's report does not take it up or mention it.
- Sources: `src/core/pipeline.ts:286-303`; A3's account of the schedule (decimal mode's schedule is the user's context alone, A3 L56)
- Proposed call: once the owner confirms the gap against the drafted pages, one sentence in the decimal-mode text of `numbers.md` "The two modes" (or in "What costs time").
- Related: F-063
- Decision: Stands: one sentence in `numbers.md#The two modes` that decimal mode runs a single pass (confirmed by F-358's reading of `schedule`); low confidence noted.

#### F-040. Decimal-mode sentences of the dissolving section: the radius serves inside a step

- Type: contradicts implementation · Flags: **low confidence**
- Target section: The two modes
- Units: A1 (L236-243), D8 (L106, L113)
- Where: `docs/settings.md#How a number is held, and what the settings touch` (page L217-219, L261-266)
- Claim or passage: L217-219: "In decimal mode no value is inexact: … and the radius serves only inside a function, to certify its rounding."; L261-266: every step rounded, exact values included; a function's value certified on finer grids up to the same ceiling; the precision limit bounds that.
- Finding: a unit defined through `pi()` is certified inside a step as a function's value is, so the radius serves inside a step, for either (A1). D8 could verify neither sentence (decimal mode's mechanism is A4's; D8 reran examples only); its reruns are consistent: `sqrt(2)` is `= 1.4142136`, `gamma(4.5)` is `= 11.631728`, `1 / 3 * 3` is `= 0.99999999` in decimal mode. No unit here verifies L261-266.
- Evidence: `src/core/ball.ts:1109-1133`; N3's corrected statement (units through `pi()`); A3 reads the same path (A3 report: a built-in's call, a unit and a refused power certified inside `step`; A3 L29: the angle units certified at `p`) and ran `turn` into `deg` in decimal mode as `= 359.99999`, each unit rounded once (A3 L146).
- Corrected statement: the radius serves only inside a step, to certify the rounding of a function's value or of a unit defined through `pi()` (interim page text A1 L240-243).
- Proposed call: **doc wrong** (L218-219): units go through the same `step` as calls. The sentences move to `docs/numbers.md#The two modes` (D8 (F-014)) with A1's correction of L217-219, and L261-266 in the light of A3's account of decimal mode's single pass and its `step` up to the ceiling (A3 L56).
- Related: F-044, F-113
- Decision: Stands (doc wrong); low confidence: the session reads `step` for the unit case; amended by F-451 in the carried sentences.

#### F-041. N17: a literal past the significand limit is refused in either mode

- Type: contradicts implementation
- Target section: The two modes
- Units: A4 (L26, L41, L79, L83, L98, L134), V1 (L74, L292), D1 (L129, L696)
- Where: plan N17; `devdocs/numbers.md#Decimal mode > A literal`
- Claim or passage: "A literal with more than `p` significant digits is rounded to `p` in `R` as it is read, and is exact after that".
- Finding: the significand limit refuses a literal that passes it before anything rounds it, on purpose "in either mode" (`src/core/evaluate.ts:510-518`): a literal of 20,000 threes at eight digits in decimal mode is refused at the limit. Within the limit, "rounded as read" holds (D1 L129).
- Evidence: `src/core/evaluate.ts:505-523`; run as quoted.
- Corrected statement: "…and is exact after that, unless its significand passes the significand limit, which refuses the literal before anything rounds it, in either mode ("The significand limit" below)" (A4 L98; V1 L292).
- Proposed call: **doc wrong**: the code says "in either mode" on purpose; A4 (Q3) and D1 (Q9) ask the owner to confirm the intent, both proposing yes.
- Related: Q-040
- Decision: Stands (doc wrong); follows Q-040 (ok: by intent; one clause in either mode).

#### F-042. N18: `log` reaches the uncertified fallback

- Type: contradicts implementation
- Target section: The two modes
- Units: A4 (L27, L38, L77-78, L84, L99-100, L133, L136), V1 (L75, L294, L296)
- Where: plan N18; `devdocs/numbers.md#Decimal mode > The ceiling` (both halves)
- Claim or passage: "A transcendental value is never a finite decimal, so … the case cannot arise; the only values that can sit on a boundary are the algebraic ones, roots and powers with rational exponents …"; "No built-in of the app is known to reach the fallback".
- Finding: a value sits on a boundary when it is rational and the built-in computes it on the kernel without recognizing it. `log(b, x)`'s exact cases look for an integer exponent or its reciprocal alone ("a rational exponent in general is not looked for"), so `log(256, 512)` (`9/8`) at three digits, half even, decimal mode, shows `≈̇ 1.12 (a step could not be certified at the precision limit)` (`≈̇ 1.13` half away from zero), and `log(4, 8)`, `log(100, 1000)` at one digit likewise. A directed mode certifies the same value (`= 1.12` toward zero) and one more digit makes it exact (`= 1.125`); the flag then behaves as the page says (A4 report). A4 handed the exact-case question to D5 (A4 L133); D5 confirms `log(4, 8) ≈ 1.5` (D5 L51) but does not weigh it.
- Evidence: `src/core/builtins/log.ts:17-24`; runs as quoted.
- Corrected statement: "**N18.** A built-in call in decimal mode is certified: computed in exact mode at the working contexts from the step's digits plus the guard up to the ceiling, until its rounding to the step's digits is certified; if never (a value exactly on a rounding boundary of those digits), the midpoint's rounding is shown flagged *uncertified* (`≈` with a dot, "a step could not be certified at the precision limit"), sticky through every later step, the pipeline's quotients and the reciprocal line included. Shipped built-ins reach it: `log(b, x)` whose value is rational but not an integer or the reciprocal of one, since its exact cases look for those alone, so `log(4, 8)` (`3/2`) at one display digit and `log(256, 512)` (`9/8`) at three are uncertified under a nearest mode; the tests reach it with an injected built-in." (A4 L27); page rewrite A4 L99-100, V1 L294-296.
- Proposed call: **doc wrong**: the page's reasoning assumed every rational value of a built-in is an exact case, and `log`'s comment says otherwise on purpose; document it as reachable now (A4 Q2). The open alternatives, `log` looking for `x^q = b^p` (A4 (B-007), A4 Q5, handed to D5 and not taken up) and #173 (decide a tie as exact), would each make these lines `=`.
- Related: Q-048, B-007
- Decision: Stands (doc wrong); follows Q-048 (ok: documented as reachable; the exact case waits for a review); #173 is future work (confirmed on 2026-10-12, plan §12.2, item 5): `devdocs/future.md` carries its one link beside the display policy, and `#Decimal mode` states the behaviour as a plain fact naming no issue; the exact cases for a rational exponent are issue #200, linked once from the logarithm row of `devdocs/builtins.md` (Q-012's rule, B-007).

#### F-043. N19: with a `want`, the `have` is an operand rounded to `w`

- Type: contradicts implementation · Flags: **conflict**
- Target section: The two modes
- Units: A4 (L28, L43, L74, L85, L104-107), V1 (L78, L304), V5 (L28), D4 (L50)
- Where: plan N19; plan §1.1.6 item 3; `devdocs/numbers.md#The working digits` (second bullet)
- Claim or passage: "the root of the `have` expression, the conversion's ratio, a list's counts and remainder, a function want's recovered count and the reciprocal are each the last step of what they show".
- Finding: the `have` root is a last step only when the `want` is blank; with a `want`, the `have` and `want` texts are operands evaluated at the working digits (`src/core/pipeline.ts:502-503`, `529-539`), their roots rounded to `w` and only the ratio to `p`: `1 / 3 * 3 m` in `in` is `= 39.370078 in` at eight digits and `= 39.370079 in` over twelve working digits. A function's conditions, an inverse's body and the function applied back are at `w`; the directed-mode neighbour holds (`0.099999999` toward zero, `0.10000001` away from zero).
- Evidence: `src/core/context.ts:119-129` (`operandContext`); `src/core/pipeline.ts:434-441`, `502-503`, `529-539`, `724-745`, `796-807`; runs as quoted.
- Corrected statement: "**N19.** Working digits (decimal mode): with `w ≥ p`, every step but the last is rounded to `w`; the last step of each displayed value is rounded to `p` directly from the exact result of its operation. The last steps are: the root of the `have` expression when the `want` is blank (with a `want`, both texts are operands and their roots are rounded to `w`), the conversion ratio, a list's counts and remainder, a function want's count, and the reciprocal line, whose one operand is the `p`-digit ratio shown rather than the `w`-digit `have` and `want`. A function's conditions, an inverse's body and the function applied back are evaluated at `w`. Under a directed mode the answer is the neighbour of a value on the grid, as that mode asks." (A4 L28); page rewrite A4 L106, V1 L304.
- Conflict: V5 (L28) marks N19 confirmed "behaviourally for the have's root and the reciprocal", on examples that cannot tell the readings apart (`1/3*3` with a blank `want`; `3 m` in `m` gives `m = 0.33333333 × 3 m`); A4 corrects it on discriminating runs (L74-75, L85). D4 (L50) and V5 (L28) did not read the list of last steps.
- Proposed call: **doc wrong**: the pipeline evaluates both texts at the operand context on purpose; V5's verdict is settled by A4's discriminating run (`39.370078` against `39.370079`).
- Related: B-008
- Decision: Stands (doc wrong); follows Q-046.

#### F-044. Decimal mode's unstated consequences for units, edges and directed modes

- Type: gap (new)
- Target section: The two modes
- Units: A4 (L87, L137)
- Where: `docs/numbers.md#The two modes` (new); `devdocs/numbers.md#Decimal mode`
- Gap: no page states three calculator-like consequences of decimal mode: a unit that carries `pi()` is rounded as it is looked up (`turn` in `deg` is `= 359.99999 deg` with `deg = 0.0027777779 turn`, where exact mode has `≈ 360 deg`); no argument straddles an edge (`tan(90 deg)` is `= -13660250`, the degree rounded first, where exact mode refuses it at the pole; `asin(1)` is `= 1.5707963 radian`); every step takes the directed mode (`1/7` under ceiling is `= 0.14285715`).
- Sources: A4's runs (A4 L87); `devdocs/numbers.md#Decimal mode` (the per-operation bullets).
- Proposed call: one sentence each in `docs/numbers.md#The two modes`, as today's behaviour (A4 Q6).
- Related: Q-023
- Decision: Stands; follows Q-023 (ok, without settings-dependent digits: the behaviour stated; `tan(90 deg)` "may give an exact value in decimal mode where exact mode fails at the pole"); settled on 2026-10-12 (plan §12.2, conflict 2): the `turn` example is written without settings-dependent digits, a value a little under 360; amended by F-442 ("fails at the pole", not "refuses").

#### F-045. Gap §6.1: decimal mode as rules

- Type: gap (confirmed)
- Target section: The two modes
- Units: D8 (L139)
- Where: plan §6.1; `docs/settings.md#How a number is held, and what the settings touch` (page L217-219, L261-266); `docs/definitions.md` (page L326-329)
- Gap: Decimal mode is not stated as rules; the rules themselves are the Mode entry's and A4's.
- Sources: those passages; `docs/settings.md#(top) > Mode`
- Proposed call: D8's sentences for `numbers.md#The two modes` beside the Mode entry's rules.
- Related: F-044
- Decision: Stands.

#### F-046. `approx` as a concept (§6.1), with A5's, A2's and D6's facts

- Type: gap (confirmed)
- Target section: approx
- Units: A5 (L59, L244-257), A2 (L31, L152), D8 (L93, L140, L186, L224-230), D6 (L35, L82, L96, L116)
- Where: plan §6.1; plan N23; `devdocs/numbers.md#approx`; `docs/functions.md#Very large results and approx` (page L132-136, L179-200, L225-234); `docs/functions.md#(top)`, bullet 7 (page L23-27)
- Gap: `approx` as a concept, not only as a function (§6.1): today it is explained as a function and inside a section that dissolves. The decimal-mode identity and the zero pass-through belong to the concept (D6). One fact no user page states (D6, new): "zero passes through" holds for a zero midpoint of any radius (`isZero(b.mid)`, `ball.ts:1158-1163`): `approx(sqrt(2) - sqrt(2))` keeps the argument's radius about a zero midpoint; `devdocs/numbers.md#approx` says so, the docs do not, and the header of `approx.ts` understates it (code side).
- Sources: `devdocs/numbers.md#approx` (accurate apart from D6's I6); `docs/functions.md:132-136`, `:179-200`, `:225-234` (substantial raw material, D8; L179-187 holds, A5 N23); A5's facts for the user page (A5 L246-257): the unit is one in the last of the pass's working digits (28 at the first pass at eight), so `approx(2.54) cm` into `in` is `≈ 1`; `approx` on one operand of a sum, a product or a quotient is enough; and `approx` turns a refusal into a value only where an inexact operand changes the arithmetic (a sum, product, quotient or integer power), never a built-in's own reach (`sin` of a huge angle; `exp(approx(1e999))` refused as `exp(1e999)` is; D8's rerun: `sin(approx(1e999999999) radian)` is refused "however it is computed", as `sin(1e999999999 radian)` is); A2's qualifier (A2 L152): `(approx(1e20) - approx(1e20))^1e100000` is refused "however it is computed", its exponent literal alone past the limit, so N23's "relaxes integer powers" must not read as a promise.
- Proposed call: write `numbers.md#approx` from D8's draft (D8 L224-230), which carries A5's facts; add A2's qualifier and D6's two facts (the decimal-mode identity; a zero midpoint of any radius left as it is); the one-operand fact also goes into "How a value is held" (D8's drafts); D6's bullet 7 edit ("leaves a zero as it is") belongs to the finding on the bullets.
- Related: Q-009, Q-059, Q-099, B-043, F-148, F-218
- Decision: Stands: `numbers.md#approx` from D8's draft with A5's facts, A2's qualifier (Q-099) and D6's two facts; amended by Q-011, Q-035 and Q-104: the binary form `approx(x, u)` and #100 are future work, of which the user page says nothing, `devdocs/numbers.md#approx` naming the form in one clause that links `devdocs/future.md`; amended by F-451 ("inexact" wherever the draft says "approximate").

#### F-047. "At every pass" `exp` refuses: the first pass refuses and the loop ends

- Type: contradicts implementation
- Target section: approx
- Units: D8 (L35, L96)
- Where: `docs/functions.md#Very large results and approx` (page L228-231)
- Claim or passage: "At every pass `exp` measures its argument over the whole ball and finds that the result's exponent passes the bound for every value in it, so it refuses, and the refusal is the answer."
- Finding: the first pass refuses and the retry loop ends; a refusal at the bound is not retried, only a straddle is.
- Evidence: D8 rerun with a pass observer (`exp(approx(1e999))` at 32 digits runs one pass); A5 L57 ("no `tooLarge` retried"), L58 (N22).
- Corrected statement: "At the first pass `exp` finds that the result's exponent passes the bound for every value within the argument's error radius, refuses, and the retry loop ends there." (D8 L35); the passage itself goes to `devdocs/numbers.md`, with one user-level sentence in `numbers.md#approx` (D8 Findings 1).
- Proposed call: **doc wrong**: retrying a straddle and ending at a refusal is the loop's deliberate rule (A5 N22); the page overstates it.
- Related: F-034, F-057
- Decision: Stands (doc wrong).

#### F-048. Gap confirmed (§6.1): rounding modes, and `round(2.5)` under the default

- Type: gap (confirmed)
- Target section: Rounding modes
- Units: D6 (L83, L118-124)
- Where: plan §6.1; `docs/functions.md#(top)`, bullet 8 (page L28-37)
- Gap: the docs never say which way `round(2.5)` goes under the default: `2`, half even, and `3` under half away from zero (§1.1.3 lists it as an edge case users hit).
- Sources: `devdocs/numbers.md#Certification and the display rule` (last paragraph); `devdocs/builtins.md#The exact functions` (`round`).
- Proposed call: state it in "Rounding modes"; D6's bullet 8 addition (L118-124) carries the same sentence for the entry.
- Related: F-119
- Decision: Stands: `round(2.5)` under the default stated in "Rounding modes" of `numbers.md`; the bullet's addition on the user page waits for the generated reference (Q-009).

#### F-049. D4's Significand limit entry and D8's drafts split its content differently

- Type: structure · Flags: **conflict**
- Target section: Values too big to hold
- Units: D8 (L134, L182, L194, L204, L220, L234, L311, L319), A5 (L376-384), D4 (L267-283)
- Where: `docs/numbers.md#How a value is held`, `#Values too big to hold`, `#Digits you can trust`, `#Values at an edge`, `#The two modes` (D8's drafts); `docs/settings.md#(top) > Significand limit` (page L122-159)
- Finding: §12 q5 has each settings entry explain its limit in a sentence and link `numbers.md`. D8's drafted sections mark sentences owned by others: `#How a value is held` takes the dyadic-cost paragraph of D4's Significand limit entry (`docs/settings.md:127-138`) and `#Values too big to hold` its remedies paragraph (`:139-157`), both A5-verified, as §12 q5 directs, leaving the entry a sentence and a link (D8 L182, L234, L311); `#Digits you can trust`'s schedule figures are N8's (A3's); `#Values at an edge`'s other edges are A6's and the built-ins'; `#The two modes`' rules are D4's and A4's. D4's replacement entry (D4 L267-283) keeps one paragraph with two links and several sentences: the representation, about 19,700 digits, the hard limit on cost, the refusal and its suggestions with a link to "Values too big to hold", and how the limit bounds the precision limit; its sentence "Inexact values are never refused for size, being kept to a grid" restates the N21 wording A5 corrects (A5 L57). A5 verified every number and example of the current entry (A5 L376-384).
- Conflict: D4 keeps a condensed remedies paragraph in the entry (D4 L276-280); D8 moves it to `numbers.md` (D8 L234).
- Proposed call: §12 q5 (binding) gives the entry one sentence and a link, with D8's sections taking the dyadic cost and the remedies; the owner reconciles the two drafts once, when `docs/numbers.md` is assembled (D8 Q5); D4's entry qualifies or drops "never refused for size" (the N21 finding).
- Related: Q-108, F-019, F-050, F-053, F-136
- Decision: Stands; follows Q-108 (ok: §12 q5, the entry keeps one sentence and a link; D8's sections take the dyadic cost and the remedies; the two sessions reconcile the drafts); D4's "Inexact values are never refused for size" is dropped (F-056); amended by F-451.

#### F-050. The 32,768-bit scenario reads as the default; where the diagram goes

- Type: contradicts implementation · Flags: **low confidence**
- Target section: Values too big to hold
- Units: D8 (L34, L62, L94, L287-289, L310)
- Where: `docs/functions.md#Very large results and approx` (page L194-214: the scenario at L198, the radius diagram at L202-214; L239); `devdocs/numbers.md#Why the exponent bound stays at 10^18` (page L686-704; the scenario at L690-691, above the six-pass table)
- Claim or passage: `docs/functions.md`: "with a precision limit of 1,000 and a significand limit of 32,768 bits" (L198) and "its 1,354-digit midpoint fits a significand limit of 32,768 bits" (L239); `devdocs/numbers.md` introduces the six-pass table "with a precision limit of 1,000 and a significand limit of 32,768 bits" (page L690-691).
- Finding: the default significand limit is 65,536 bits; the scenario is true of the limit it names but reads as the default. D8 asked V1 (D8 question 4) whether the devdocs section, too, names 32,768 bits and whether it carries the radius diagram of `docs/functions.md:202-214`; V1's report does not take it up (V1 read A1 to A6, not D8). Read at consolidation: the devdocs section has the six-pass table and the same scenario, and no radius diagram.
- Evidence: `src/core/context.ts:170`; A5 L57; reasoned from code, not run; the devdocs section read at triage.
- Corrected statement: where the passes land, in `devdocs/numbers.md` (V1), name the default or say the midpoint fits any limit the app allows; V1 decides whether it is "stated as the default of 65,536 or left out" (D8 L34, L310).
- Proposed call: **doc wrong** or **design changed without the docs following**, undetermined: nothing in the entries says whether 32,768 was once the default, and the fix is the same: the devdocs rewrite names the default 65,536 bits, or no limit, at the table, and the scenario's limit is named as not the default in both corpora (D8 L34); the docs-side wording (`docs/functions.md:198`, `:239`) leaves with the dissolution; the diagram goes to the devdocs section only if the owner wants it there (D8 Q4; D8's proposal under §12 question 10).
- Related: Q-109, F-057
- Decision: Stands (undetermined between doc wrong and design changed; the fix is the same); follows Q-109 (ok: the `exp(1e999)` diagram stays in `numbers.md`; the passes' diagram and table in devdocs, V1 naming the default limit or none); the devdocs session reads `src/core/context.ts:170`.

#### F-051. `tooLarge`: one kind, never retried, against the plan's owner review

- Type: contradicts implementation · Flags: **conflict**
- Target section: Values too big to hold
- Units: A1 (L55, L129-131, L293-298), A3 (L58, L147, L153), A9 (L36), A5 (L49-50, L57, L67, L82-86, L88-124, L136-147, L343), V1 (L22, L43), V3 (L28)
- Where: plan N21 (its last sentences); plan §1.1.5 row (`devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule`); plan §1.1.6 item 14; `devdocs/numbers.md#Working precision and the schedule` (page L879-880); `devdocs/numbers.md#The significand limit` (page L1376-1398)
- Claim or passage: N21: "The pages describe one refusal, `tooLarge`, carrying a `Need` and a `Reach`; per the owner's review there are now classes of `tooLarge`, some of which the retry loop retries, so the pages are stale here"; the §1.1.5 row tags those passages update.
- Finding: `tooLarge` is one error kind (`src/core/rational.ts:96`) with two required fields, a reach (`fits`, `exceeds`) and a need (`exact`, `bound`, `unknown`), and no other classes. `resolve` retries no `tooLarge` of either reach, its predicates never reading the error's fields: they accept an `unresolved` at any depth, `undecidedCondition`, `unresolvedWant` and `unresolvedBound`. Any `tooLarge` ends the loop, with the best earlier result when a pass produced one that assumed no condition, else with the refusal; only `unaffordable` and the series' working bits can refuse first on a later pass. Where a `tooLarge` is retried, it is inside a node or a step (decimal mode's `powered` and `summed`; the settle-first sum and the retried product and quotient), never by the schedule (A3). The pages already say this (`devdocs/numbers.md:1376-1398`), so A5 and V1 withdraw the row; V3 sees the same three need shapes from the built-ins.
- Evidence: `src/core/rational.ts:66-98` (`Reach`, `Need`), `:66`, `:80-83`, `:96`, `249-251`; `src/core/pipeline.ts:334-361`, `338-360`, `:353-356`, `365-404`, `:376-404`; `src/core/evaluate.ts:1125-1185`; `src/core/ball.ts:509-512`, `666-669`, `840-843`, `:1112`; A5's site table (A5 L106-124).
- Corrected statement: "The refusal is one kind, `tooLarge`, always carrying a reach (fits or exceeds) and a need (exact, bound or unknown); `resolve` never retries it, and one raised at a later pass ends the loop with the best result so far." (A1 L55); "`tooLarge` is one error kind: its reach is `fits` or `exceeds` and its need `exact`, `bound` or `unknown`; the retry loop retries none of them, and one first raised on a later pass ends the loop with the best earlier result" (A5 L57); A5 lists the sites and withdraws the row.
- Conflict: (1) The plan (N21 and the §1.1.5 row), stated as the owner's review, against A1 (L55), A3 (L58), A5 (L57, L67, L136-147) and V1 (L22, L43), which find one kind that the loop never retries. (2) Among units, A9 tags the page's sentence at L879-880 `update` with the plan row confirmed (A9 L36), while A5 and V1 withdraw the row as describing current passages (A5 L67, V1 L22). (3) A1 cites `src/core/pipeline.ts:87-91` for "`resolve` retries the `unresolved` family only" (A1 L55, L295), a header comment that A3 says omits `undecidedCondition` and `unresolvedBound` (A3 L148, `pipeline.ts:85-87`); A3's trace of the predicates is `pipeline.ts:377-404`.
- Proposed call: **undetermined; the owner must confirm**. Doc (plan) wrong: the code is coherent, the pages describe it, and four units agree; if the review meant the in-node and in-step retries A3 names, the pages could name them. Code wrong: if the owner intended classes of refusal that the retry loop retries, the code does not do it. The conflict is chiefly with the plan, not between units. Settle by the owner saying what "classes, some retried" meant, then withdraw the row (A5, V1) or record a code change; V6 (F-509) also asks the row to name which refusals end the loop with a result.
- Related: Q-001, Q-091, Q-099, F-509
- Decision: Follows Q-001: doc (plan) wrong; one error kind, `tooLarge`, carrying a reach and a need, never retried by the loop; the in-node and in-step retries are correct as the code has them; the kinds tell the user the failure's type; the §1.1.5 row is withdrawn and N21 and §1.1.6 item 14 are amended (F-509). No code change.

#### F-052. N24: "sum" is the plan's; a sum never faces the choice of limit

- Type: contradicts implementation
- Target section: Values too big to hold
- Units: A5 (L60, L336-342, L503-506)
- Where: plan N24; `devdocs/numbers.md#Which limit a refusal names` (page L632-634)
- Claim or passage: N24: "a sum, product, quotient or power past both limits is reported at the exponent bound; a hair from the bound, at the significand limit".
- Finding: the rule holds for products, quotients and powers (`pastBoundBetween`; `powerRefusal` within a relative `2^-20`); a sum never faces the choice. The devdocs state the rule for products and quotients only, rightly (`devdocs/numbers.md:632-634`); "sum" is the plan's. §1.1.6 item 11 ("a hair from the bound is `tooLarge`") confirmed.
- Evidence: `src/core/scaled.ts:387-398`, `:515-571`, `:542-546`, `:597-615`, `:609-614`, `:891`, `:927-939`; `src/core/evaluate.ts:606-623` (`613-623`); runs: `7^1e19` too large, `2.54^1e18` past the significand limit (`fits`, "about 7,988,684,686,773,075,000 bits"), `5e1000000000000000000 + 5e1000000000000000000` too large.
- Corrected statement: "Which limit a refusal names: a product, quotient or power past both limits is reported at the exponent bound; a hair from the bound, at the significand limit (`7^1e19` is too large to compute; `2.54^1e18` is past the significand limit, with the reach the operation states, N21). A sum never faces the choice: a sum that aligns and passes the bound is too large or too small to compute, and a sum that cannot be aligned has the value of its larger operand, which is within the bound." (A5 L60)
- Proposed call: **doc wrong** (the plan's claim; the devdocs page is right).
- Related: F-509
- Decision: Stands (doc wrong: the plan's claim); N24 amended.

#### F-053. The two size limits from the user's side (§6.1), with A5's and D6's facts

- Type: gap (confirmed)
- Target section: Values too big to hold
- Units: A5 (L58, L126-134, L149-182, L184-204, L208-219, L318), D8 (L141, L232-265), D6 (L84)
- Where: plan §6.1; plan N22; `docs/functions.md#Very large results and approx` (page L132-187, L236-253); `docs/settings.md#(top) > Significand limit` (page L127-157); `devdocs/numbers.md#The significand limit`, `#The exponent bound`, `#Which limit a refusal names`
- Gap: what is refused, what the message suggests, what `approx` and decimal mode change, with the exponent bound (§6.1); the dissolving section is substantial raw material (D8). For the exact functions (D6): the integer functions' refusals never offer `approx` or decimal mode and apply in both modes, and `round(x, places)` and `mod` are refused when their results would pass the limit.
- Sources: the passages above, and A5's facts the page must carry: the bound is on the value, not the stored form (`1e1000000000000000000 / 3 * 10` is a value, `1e-1000000000000000000 / 7` too small); zero is within the bound at any exponent, so a ball around zero whose midpoint passes below it is zero within a bound, not a refusal; a literal past the bound is rejected as typed ("this number's exponent passes 10^18" or "falls below -10^18") while `0.001e1000000000000000003` parses (A5 L58, L208-219); a literal past the hard bound (about 315,000 digits), or a `^` exponent whose power of ten cannot be formed, is the parser's rejection, "this number is too large to represent", with no count and no remedy (A5 L126-134); the message texts as the tests pin them (A5 L149-182); decimal mode computes every `fits` example and refuses every `exceeds` one, so one sentence states both remedies (A5 L184-204).
- Proposed call: write the section from D8's draft (D8 L232-265), adding the three N22 facts and the parser's rejection, which the draft lacks, and D6's family facts; messages are quoted as examples only, the catalogue being generated (§12 q6; D8 Q2).
- Related: Q-007, Q-108, F-018, F-442
- Decision: Stands: the section from D8's draft with A5's N22 facts, the parser's rejection and D6's family facts; follows Q-007 (messages as examples); amended by F-442 as the review settled it (plan §12.3, R-4): in the docs a literal past the hard bound or the exponent bound is a size refusal, "refused as it is typed", never "rejected"; amended by F-440 ("the exponent") and F-451 in the draft; follows Q-108.

#### F-054. Drop the closed issue #40 sentence

- Type: stale (drop)
- Target section: Values too big to hold
- Units: A5 (L71, L431-440, L448-449, L506-507), V1 (L151), D8 (L30, L65, L99, L289), V6 (L93, L228)
- Where: `docs/functions.md#Very large results and approx` (page L249-253)
- Passage: "Keep the arguments exact there: the difference `approx(1e999) - approx(1e999 - 5)` is `5` within about `2e948` at the first pass, and `exp` refuses it … (issue #40)."
- Tag: drop (A5's row, A5 L71; new to the plan); D8 confirms (D8 L30); V6 checked that #40 is closed.
- Rewrite: delete the sentence; the paragraph ends at "`≈ 148.41316`." (A5 L433-440; D8 L30).
- Proposed call: Confirm `drop`: #40 is closed (fixed by the merged PR #84; V6 checked); rerun (A5; D8), the difference is `≈ 5` and `exp` of it `≈ 148.41316` after seven passes, which the whole-ball paragraph already says; §12 q26 deletes every reference to a resolved issue. `devdocs/numbers.md` never cites #40 (V1), and the sentence does not travel to devdocs (A5; D8 L65, L289).
- Related: Q-101
- Decision: Stands (drop); follows Q-101 (ok).

#### F-055. Capital "The significand limit" mid-sentence

- Type: other
- Target section: Values too big to hold
- Units: A5 (L442-449), D8 (L31)
- Where: `docs/functions.md#Very large results and approx` (page L173)
- Finding: "a power that no setting could hold is reported at the bound even where The significand limit refuses it first" should read "… even where the significand limit refuses it first" (A5's edit, A5 L431-449, confirmed by D8).
- Proposed call: moot once the section is dissolved, D8's rewritten sentence reading "the significand limit" (D8 L263); fix in passing only if the section outlives the dissolution.
- Related: F-054
- Decision: Stands (moot once dissolved).

#### F-056. N21 overstates "inexact results are never refused for size"

- Type: contradicts implementation
- Target section: Values too big to hold
- Units: A5 (L57, L331-332, L347-353, L503-505)
- Where: plan N21; plan §1.1.6 item 5; `devdocs/numbers.md#The significand limit` (page L1420-1424)
- Claim or passage: N21: "Inexact results are never refused for significand size, being settled to the working precision"; "(`2^-30000` costs 69,658 bits)".
- Finding: a result of the exact operations with an inexact operand is never refused for size (the exact operand is put on the working grid and the result settled), but a built-in that works at an argument's own bits refuses by those bits whatever the argument's exactness (`sin` of a huge angle, `isHuge` testing the whole ball; `unaffordable`; `factorial`): `sin(approx(1e999999999) radian)` is refused as `sin(1e999999999 radian)` is (D8 L93). The count is exact, a bound a bit over, or absent; a `fits` refusal suggests `approx` around the node's first operand, or decimal mode (left out in decimal mode). `2^-30000` is stored in 69,658 bits and refused with "about 69,659 bits", the prediction's bound. The page sentence at L1420-1424 ("An inexact result … never refused for size") is right about results and stays; N21 generalized it to the built-ins' reach.
- Evidence: `src/core/builtins/trig.ts:119-123` with `src/core/builtin.ts:417-424`; `src/core/ball.ts:734-740`, `:1815-1826`; `src/core/rational.ts:66-88`; `src/core/evaluate.ts:434-486`; `src/messages.test.ts:274`.
- Corrected statement: A5's N21: every exact result's size predicted before forming; the count's three forms; the `fits` and `exceeds` suggestion rule; never refused for an inexact operand of the exact operations, but refused at an argument's own bits; held to the exponent bound; a dyadic denominator stored with fives; `tooLarge` one kind, none retried (full text: A5 L57).
- Proposed call: **doc wrong** (the plan): the code is deliberate, site by site, and the page states it; the user page takes A5's rule. This also answers D4's 69,658 against 69,659 (D4 (Q-091)): the stored size against the prediction's bound.
- Related: Q-091, F-012, F-019, F-509
- Decision: Stands (doc wrong: the plan); follows Q-001 and Q-091; N21 amended.

#### F-057. Dissolve docs/functions.md#Very large results and approx (§12 q10)

- Type: structure
- Target section: Values too big to hold
- Units: A5 (L368-372), D8 (L57-65, L168-170, L307, L309)
- Where: `docs/functions.md#Very large results and approx` (page L130-253); `docs/numbers.md#Values too big to hold`, `#approx`, `#Values at an edge` (targets); `devdocs/numbers.md#Why the exponent bound stays at 10^18`
- Finding: §12 q10 dissolves the section; every example and both quoted messages reproduce (A5 report; D8 report-K9). D8's destinations: L132-141 to `#approx` (the rule) and `#Values too big to hold` (the two messages); L143-160 (significand times a power of ten, the `exp(1e999)` diagram) and L162-179 (the exponent bound and its thresholds, the whole-ball rule and the retry, the straddle also one sentence in `#Values at an edge`) to `#Values too big to hold`; L179-187 (what `approx` relaxes) to `#approx`; L189-200 to `#approx` in two sentences, the passes to devdocs; L202-223 (the radius diagram, the six-pass table) to devdocs, which has the table; L225-234 to devdocs, with one sentence in `#approx`; L236-244 to `#Values too big to hold` as the ruled-out alternative, with the link; L246-253 (log space) to `#Values too big to hold`, the #40 sentence dropped. Nothing stands in place: the `#(top)` forward pointer (L126-127), the one place depending on the section, becomes the link, and `approx` keeps a generated reference entry linking `numbers.md#approx` (§12 q14).
- Proposed call: dissolve as D8 maps it (D8 L168-170), with D8's drafts of `#approx` and `#Values too big to hold`; A5's two small edits apply only if the section outlives it (A5 L448-449).
- Related: Q-009, Q-026, Q-109, F-046, F-047, F-050, F-053, F-058, F-139, F-148
- Decision: Stands: dissolve as D8 maps it; follows Q-009 (B), Q-026 (ok), Q-109 (ok); the user page is `docs/builtins.md` (Q-020's note), so every link this finding writes to `docs/functions.md` targets `docs/builtins.md`.

#### F-058. "The bound stays": keep the ruled-out higher bound, drop the test build

- Type: stale (keep as intent) · Flags: **low confidence**
- Target section: Values too big to hold
- Units: D8 (L38, L64, L97)
- Where: `docs/functions.md#Very large results and approx` (page L236-244)
- Passage: "The bound stays, though: … Keeping the bound is a decision, recorded with its reasons and the measurements of a test build that raised it in `devdocs/numbers.md`."
- Tag: keep as intent (D8, new); the reasons were not re-verified (the decision is §12 q10's; the devdocs page is V1's, its timings A5's question 5).
- Rewrite: "The bound is not a setting, and a higher one is ruled out", the two reasons kept, the measurements linked at `devdocs/numbers.md#why-the-exponent-bound-stays-at-1018`; "a test build that raised it" is history, which git holds (D8 L38).
- Proposed call: Confirm `keep as intent`: the paragraph carries a ruled-out alternative; only the history clause goes.
- Related: Q-017, F-057
- Decision: Stands (keep as intent); follows Q-017 (ok: the measurements linked are the six-pass table; the milliseconds are gone from devdocs); the sentence states the bound as not a setting and a higher one as ruled out, which Q-011 keeps on the as-is pages.

#### F-059. D4's example corrections never reached numbers.md (hand-off not taken up)

- Type: other
- Target section: How numbers are written
- Units: D4 (L101-107, L117, L139, L195-201, L350, L354, L414), D8 (L172-266)
- Where: `docs/numbers.md#How numbers are written` (§7; no draft exists) and "The two modes"; `docs/settings.md#(top) > Mode` (page L55), `> Notation` (page L77, L82; the corrected examples)
- Finding: D4 asked D8 (D4 L414) to carry its three example corrections (`= -1e+8` for `-100000000`; the ratio bare before `×` on the reciprocal line, `in = 1/36 × 3 ft`; `1/3 × 1e+30` does not read back) and the "bare before `×`" rule into `numbers.md`. D8's report drafts no "How numbers are written" section and carries none of them, and its "The two modes" text leaves the mode's rules to D4 and A4; so far the corrections live only in D4's settings-page draft (D4 (F-136)). The rest of the hand-off, the sentences replacing page L192-205 and L207-271, was taken up (D8 (F-025, F-014)).
- Proposed call: when `docs/numbers.md` is written, "How numbers are written" takes D4's rule and corrected examples, stating the ratio's parenthesization (bare before `×`), the decimal display's exponent form (N12), and that a result pastes back through the copy text, not the display text (§12 q11); "The two modes" takes `= -1e+8`. No unit has drafted that section.
- Related: F-120, F-121, F-122
- Decision: Stands: "How numbers are written" takes D4's rule and corrected examples; follows Q-003 (A, with the juxtaposition edge stated: `1/2 in` is `1/(2 in)`, unlike `(1/2) in` and `0.5 in`) and F-457 ("pastes back" through the copy text).

#### F-060. N12: the top-edge literal is not written; the outcome throws

- Type: contradicts implementation · Flags: **conflict**
- Target section: How numbers are written
- Units: A2 (L29, L45, L61, L96-98, L145, L156), A8 (L32, L55, L146, L154), V5 (L66, L92)
- Where: plan N12 (last sentence); plan Q18; `devdocs/notation.md#Every literal parses back` (page L180-188)
- Claim or passage: N12: "one edge literal at the exponent bound does not paste back"; the notation page: `9.5e1000000000000000000` at one digit "is written `1e+1000000000000000001`, which names a value past the bound and is refused when typed back, as `overflow`" … "The display writes it anyway" (A2 tags it stale, update, pending its Q2).
- Finding: no line is written: a value within the bound whose rounding at the display digits carries past it makes the outcome throw while composing the line ("The display wrote 1e+1000000000000000001, not a literal", `src/outcome.ts:396`), since `numberExpr` rebuilds every literal from the display's text through `parseDecimal`, which refuses a value past the bound; the component loses its render. It is reached at one digit (`9.5e1000000000000000000`) and at the default eight (`9.99999999e1000000000000000000`, alone or into `m`), though A2's notes (L156) say it needs one display digit (A2 report); `1e1000000000000000000 m`, `1e-1000000000000000000 m` and `9.99999999e-1000000000000000000 m` paste back. A zero kind's bound carried past the edge goes into the note as text and is fine. N12's sentence understates it (A8); the rest of N12 holds: the `%g`-like format, and the copy path from the expression tree with `*` (A2 report, A2 report; A8). This is the page side of a code defect; the bugs draft has the code.
- Evidence: `src/outcome.ts:157-169`, `:394-398` (`:396`); `src/core/scaled.ts:187-197`; live runs and harness as quoted (A2; A8 L32, L55).
- Corrected statement: A2: "As N12, with its last sentence replaced: the one literal at the exponent bound whose rounding carries past it (`9.5e1000000000000000000` at one digit) is not written at all today. The outcome throws while composing the line, because it rebuilds every literal from the display's text and the parser refuses a value past the bound; the pages' decision, to write `1e+1000000000000000001` and let the arithmetic refuse it when typed back, is not implemented (question 2)." (A2 L29); A8 (N12, typeable-back part): "Every result pastes back into the calculator as a `have`: the copy button writes the printer's text of the same expression tree the screen renders, with `*` where the screen shows `×`, never the display text. One edge is worse than a literal that does not paste back: a value within the exponent bound whose rounding to the display digits carries into the next power of ten past the bound is written `1e+1000000000000000001`, which `parseDecimal` refuses, and the outcome throws on it before any line exists." (A8 L32)
- Conflict: (1) The fix, and so the page text, differ. A2 (L29; A2 L145, L156; A2 (Q-002)) proposes implementing the page's decision: keep the display's text with a value built without the bound check, so the line is written and refused only when typed back (A2's rewrite of the section, A2 L96-98, assumes it); it names an error line as the alternative that refuses a correctly rounded value. A8 (L32, L146; A8 (Q-002)) proposes reporting the carry past the bound as the bound's refusal (`overflow`) and having N12 state the edge as that refusal, the route the rationale of `devdocs/notation.md` rules out. (2) V5 lists the edge literal as verified by its harness ("shows `1e+1000000000000000001`, and `parseDecimal` of that text fails with `overflow`", V5 report, V5 L66) and keeps the section as mechanism (V5 L66), against A2 and A8, whose runs through the outcome throw before any line exists; which layer V5 ran is not stated (its harness used both `show` and `outcomeOf`).
- Proposed call: **code wrong** for the throw: no page intends a crash, both units call it a defect (bugs.md's), and `devdocs/notation.md#Every literal parses back` records a decision the code does not carry out (A2 L29). What `docs/numbers.md` says at the edge then waits on the owner's choice between A2's fix (one literal does not paste back, as N12 says; A2 (Q-002)) and A8's (every line pastes back; the value is refused as past the bound; A8 (Q-002)); **doc wrong** only if the owner takes A2's alternative, an error line for a rounding that carries past the bound. Settle V5's reading by running the literal through `outcomeOf`.
- Related: Q-002, B-002
- Decision: Follows Q-002 (B): code wrong for the throw; the fix refuses such a rounding as the bound's `overflow` with a message naming the expression, so every line pastes back; N12's last sentence and `devdocs/notation.md#Every literal parses back` state the refusal (A2's draft of that section, which assumed A, is superseded); B-002 lands before `docs/numbers.md`.

#### F-061. Ratio rule: the code forms no fraction for dyadic values that fit

- Type: contradicts implementation · Flags: **conflict**
- Target section: How numbers are written
- Units: V5 (L27, L83, L236)
- Where: plan N13; `devdocs/notation.md#The rule` (rule 3, page L44-59; the summary paragraph, page L87-93); `docs/settings.md#(top) > Notation` (page L72-75, the same rule in user terms; not cited by V5)
- Claim or passage: rule 3: "written as its fraction in lowest terms when the numerator and the denominator have at most `W` digits between them"; the page's constraint: "the output must be predictable from the value and the settings, never from anything internal to the calculation"
- Finding: `ratioParts` forms the fraction only when the canonical exponent `k` lies within `2W` and the canonical numerator has at most `2W` digits. Its comment reasons that a denominator keeps at least `5^-k` of the `10^-k`, which assumes the numerator coprime to ten, but the canonical form only keeps it not divisible by ten. So at the default width `2^-41` through `2^-63`, `3/2^45` and `1/(7*2^41)` are written as rounded decimals with `≈` though their ratios fit, while `2^-40` is `= 1/1099511627776`. No test covers the boundary.
- Evidence: `src/core/display.ts:131-156` (screen at `:134-136`); `src/core/scaled.ts:8-11`; harness: `2^-41 ≈ 4.5474735e-13`, `2^-60 ≈ 8.6736174e-19`, `1/(7*2^41) ≈ 6.4963907e-14`, against `1/2199023255552` (14 digits), `1/1152921504606846976` (20), `1/15393162788864` (15)
- Corrected statement: V5's N13 adds today's exception, "no fraction is formed for a value whose canonical exponent lies beyond `2W` in magnitude or whose canonical numerator has more than `2W` digits, which excludes dyadic values such as `2^-41` to `2^-63` at the default width that the rule admits (a defect in the code's screen, not a design…)" (full text: V5 L27); after the fix "N13 then stands as the plan writes it" (V5 L236).
- Conflict: A2 confirms N13 and rule 3 (context A2 L30, A2 report) and D4 confirms N13 as far as its modules reach (D4 L49, L127; context D4 L49, D4 report), neither testing a dyadic value past `2^-40`; V5 tabulates N13 "corrected" while calling the design right (V5 report).
- Proposed call: **code wrong**: the pages state the rule and its predictability constraint, and the code's screen deviates on a flawed comment with no boundary test (V5 (Q-043): screen the exponent at `4W` and the numerator at `3W`). On the docs side N13 and rule 3 stand; until the fix lands, one sentence in `devdocs/notation.md#The rule` names the exception and links the issue if one is opened (V5 (Q-043)). The code side is in bugs.md.
- Related: Q-043, B-004
- Decision: Stands (code wrong); follows Q-043 (ok: B-004 before `devdocs/notation.md`; a caveat sentence until then).

#### F-062. N13: a whole number's width counts significant digits

- Type: contradicts implementation
- Target section: How numbers are written
- Units: A2 (L30), V5 (L27)
- Where: plan N13
- Claim or passage: N13's rule for a whole number written entire at the width (no mention of significant digits)
- Finding: Rule 2 counts significant digits, as `devdocs/notation.md` rule 2 says and the claim should: `5e11` has one.
- Evidence: live `5e11` is `= 500000000000` at width 20 and `= 5e+11` at width 8 (A2); rule 2 confirmed by V5 (context V5 report)
- Corrected statement: "an exact integer is written entire when it has at most `W` significant digits" (V5 L27)
- Proposed call: **doc wrong** (the claim's wording); the devdocs page already says it.
- Decision: Stands (doc wrong: the claim's wording).

#### F-063. What costs time, qualitatively: a §7 section with no §6.1 bullet

- Type: gap (new)
- Target section: What costs time
- Units: D8 (L148, L196), V6 (L116)
- Where: `docs/numbers.md#What costs time` (§7; §5 C33); `docs/settings.md#(top) > Precision limit` (page L113-117); `docs/settings.md#How a number is held, and what the settings touch` (page L230-232); `docs/functions.md#Very large results and approx` (page L240-242); `docs/definitions.md#Functions` (page L316-317, L321-322)
- Gap: §7 gives `docs/numbers.md` the section and §6.1 has no bullet for it; `docs/` says nothing qualitative about what a value that never certifies costs, beyond the timings in `docs/functions.md`'s gamma bullet. V6 hedges ("Gaps for §6, which this unit did not read, so they may already be listed"); D8 finds the same gap independently.
- Sources: the passages above (an expression that never certifies runs to the ceiling on every keystroke; the cost of an exponential grows fast with its argument; a definition that reads small can be large; a hand-written function is slower than the built-in); `devdocs/cost.md#What the costs come from` (opening sentences)
- Proposed call: add the section, qualitative only (§12 q9); D8's drafted `#Digits you can trust` already links to it, and `devdocs/cost.md` links to it.
- Decision: Stands: the section is added, qualitative only (Q-016 A for user docs; Q-018 allows a rough warning); `devdocs/cost.md` links it once it exists (sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist).

#### F-064. The "at most about twice" cost bound fails near the ceiling

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: What costs time
- Units: A3 (L27, L43, L67, L114-116, L141), V1 (L69, L268), D4 (L47, L336-339)
- Where: plan N8 ("The passes together cost at most about twice the last"); `devdocs/numbers.md#Working precision and the schedule` (page L839-841); `docs/settings.md#(top) > Probe budget` (D4's drafted text, D4 L336-339)
- Claim or passage: "The schedule is geometric, so the passes together cost at most about twice the pass that succeeds, whatever it is."
- Finding: true while the passes double and at the defaults (4,040 follows 2,304); `workingContexts` keeps every doubled precision strictly below the ceiling and then adds the ceiling, so where the ceiling lies just above a doubled precision the last two passes are nearly one size and the passes cost about three times the last (`11, 22, 44, 45` at one digit under a ceiling of 45; 18 … 2304, 2308 at eight digits under a precision limit of 567).
- Evidence: `src/core/context.ts:210-225`; `src/core/pipeline.test.ts:230`; the same claim in the comment on `DEFAULT_BUDGET_MS` (`src/settings.ts:159-163`) and in `src/limits.ts:54-55`.
- Corrected statement: the bound holds with one exception: where the ceiling lies just above a doubled precision (a ceiling of 45 after a pass at 44) the last two passes are nearly one size and the passes together cost about three times the last (A3 L116, V1 L268; N8 as corrected: A3 L27).
- Conflict: D4 calls "about twice the last" reasoning, not a code fact (`src/limits.ts:54-55`, D4 L47), yet its drafted probe text keeps "an expression that runs to the ceiling costs about twice its last pass" (D4 L336-339), against A3's exception.
- Proposed call: undetermined between doc wrong (the test pins `[11, 22, 44, 45]`, so the schedule is deliberate) and code wrong (the page gives the bound as the schedule's design reason; dropping a doubled precision within some fraction of the ceiling would make it exact); A3 Q1 proposes the wording now and any code change after the revamp. Low confidence: "three times" holds "under a cost linear in the digits".
- Related: Q-047, B-011
- Decision: Stands; follows Q-047 (ok: reword now; a schedule change, if any, after the revamp); low confidence noted. The schedule change is issue #199, linked once from `devdocs/numbers.md#Working precision and the schedule` beside the edge (plan §12.2, item 14; kept by R-3, plan §12.3).

#### F-065. N25: every Gamma-value call pays the Bernoulli run

- Type: other
- Target section: What costs time
- Units: V6 (L27)
- Where: plan N25
- Finding: N25 holds, with two notes for its page text: the Bernoulli run that N25 gives to "the first Gamma-family call at a new ceiling" is paid by any call that takes a Gamma value, the regularized incomplete gamma and incomplete beta functions included (`lowergammareg` at the highest precision limit pays as much cold as the Gamma family, `bench/stress/catalogue.json`); "milliseconds" is one machine's figure, stated qualitatively in the user docs (§12 q9).
- Proposed call: when N25 becomes page text, name the functions that pay the cold run and keep its cost qualitative.
- Related: F-356
- Decision: Stands: the functions that pay the cold run named, the cost qualitative in the user docs (Q-016). Amended by the owner on 2026-10-14 (plan §12.3): named on `docs/builtins.md` (work order 07), not on `docs/numbers.md`, whose "What costs time" keeps one generic sentence naming no function and no duration. Settled by the owner on 2026-10-24 (plan §12.3, the review of the built-ins page), as the session of work order 07 found the calls by running each in a fresh process: `gamma`, `lgamma` and `digamma` pay outside their exact cases, and every other call pays only through a dependency, direct or transitive, on a value of the Gamma function, which the page names beside each: `beta` through `lgamma`; `lowergammareg` and `uppergammareg` through `lgamma`, apart from an order of `1`, and `erf` and `erfc` through them; `incbetareg` through `lgamma` of its parameters outside its exact cases, and `incbeta` through `beta` where it takes `beta(a, b)` (at `x = 1`, and where it computes the part above `x` and subtracts it); `lowergamma` and `uppergamma` through `gamma(s)` only where they take it (`uppergamma` at `x = 0`, and either where it computes the other part and subtracts it from `gamma(s)`), so that `lowergamma(2.5, 1)` pays nothing and `uppergamma(2.5, 1)` pays. Work orders 15 and 17 carry the same list, with its dependencies, to the developer pages.

#### F-066. devdocs/numbers.md links nowhere in docs/: each section opens with a link

- Type: structure
- Units: V1 (L104-130, L182, L186, L336, L365, L370)
- Where: `devdocs/numbers.md` (every section, the first sentence of `#(top)` included; among them `#The exponent bound`, `#Which limit a refusal names`, `#Why the exponent bound stays at 10^18`, `#Certification and the display rule`, `#Decimal mode`, `#The working digits`, `#The significand limit`, `#approx`, `#Failures`, `#Formatting`); `docs/numbers.md` (new, not yet written: the owning sections)
- Finding: "Nothing in the page links to docs today; its fifteen links all point within devdocs." Per §12 q24 each section opens with one sentence and a link to its `docs/numbers.md` owner, then keeps mechanism and rationale; V1's table (L108-130) names per section the owner, the user-rule sentences that "become the link" and are cut, and what stays (mechanism, decisions, ruled-out alternatives, open issues). Owners: `#(top)` "Exact and approximate values"; `#The types` "How a value is held"; `#Exact operations` "Operations that stay exact" and "Values at an edge"; `#Sums and alignment` "Values too big to hold" and "The two modes"; `#Comparison` "Comparison and equality"; `#The kernel's boundary` and `#Settling` none, all of it staying; `#Memoized constants` "What costs time"; `#Roots and powers` "Operations that stay exact; exact cases of functions" and `docs/functions.md`; `#Working precision and the schedule` "Digits you can trust" and the settings page's precision-limit entry; `#Exact mode` "The two modes" and "Identities and cancellation"; `#The exponent bound`, `#Which limit a refusal names` (with the generated catalogue) and `#Why the exponent bound stays at 10^18` "Values too big to hold"; `#Certification and the display rule` "Digits you can trust" (and "How numbers are written" for the zero kind); `#Decimal mode` and `#The working digits` "The two modes"; `#The significand limit` "Values too big to hold" and "How a value is held"; `#approx` "approx"; `#Failures` "Values too big to hold" and "Values at an edge"; `#Formatting` "How numbers are written". V1 drafts the `#(top)` sentence now (L186); the openers wait for the page's anchors (L336, V1 Q6).
- Proposed call: the phase that creates `docs/numbers.md` applies V1's table (V1 L106-130) as the list of openers and cuts (V1 Q6), with the openers of V1 L336; the `#(top)` sentence links a page not yet written, so it lands with that page or with an interim target.
- Related: Q-008
- Decision: Follows Q-008 (A): V1's table is the list of openers and cuts, applied in the one-pass rewrite of `devdocs/numbers.md` after `docs/numbers.md` exists; nothing links a page that does not exist.

### Findings owned by other pages that touch this one

- F-069 (docs/quantities.md): Q10 misfiles `gravity`; the pages miss the measured factors
- F-113 (docs/units.md): Units defined through `pi()` are inexact, and no page names them
- F-134 (docs/settings.md): docs/settings.md names devdocs pages in inline code, against ownership
- F-139 (docs/functions.md): Preamble's forward pointer to a section that dissolves
- F-148 (docs/functions.md): Bullets 7, 8, 10 and the `approx` entry: what they keep and link
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-440 (terminology): "decimal exponent" beside "the exponent"

## `docs/quantities.md`

7 findings (F-067 to F-073).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/definitions.md#Unit lists` (interim full replacement; also covers defining a list and the `;` syntax) | A8 (L113-123) | — |

### Findings

#### F-067. `asin(0.5)` into `turn` is an angle, not the plain number (Q8)

- Type: contradicts implementation · Flags: **conflict**
- Target section: Primitives, dimensions and kinds
- Units: A7 (L74, L146-149, L261-274), V2 (L35), D5 (L64, L102, L141), V3 (L31, L68, L331-370)
- Where: plan Q8; `devdocs/builtins.md#Dimension rules` (Angles paragraph, page L273-274); `docs/functions.md#(top)`, bullet 5 (page L20-21)
- Claim or passage: Q8 "`asin(0.5)` into `turn` or `/ radian` is the number"; devdocs "the number is one token away: `asin(0.5)` into `turn`, or `/ radian`"; docs "`asin(0.5)` into `turn`, or `asin(0.5) / radian`, is the number".
- Finding: into `turn` the answer is the same angle counted in turns, `1/12 turn` (`≈ 0.083333333 turn`), of the `radian` kind still; only `asin(0.5) / radian` (`≈ 0.52359878`) is the plain number; into `deg` it is `30 deg` (`≈` in exact mode, `=` in decimal mode).
- Evidence: `src/units.txt:241`, `:357` (`deg pi() radian / 180`, `turn 2 pi() radian`); `src/core/builtins/inverse-trig.ts:498`, `:505`, `:512`, `:519`; A7's probe (A7 L74)
- Corrected statement: Q8, A7 (L74): "Angles: `sin`, `cos`, `tan` require the `radian` kind (`sin(30 deg)` works, `sin(1)` says to write `sin(1 radian)`); `asin`, `acos`, `atan`, `atan2` return the `radian` kind, so `asin(0.5)` into `deg` is `30 deg` and into `turn` is `1/12 turn`, an angle still, while `asin(0.5) / radian` is the plain number; the hyperbolic functions take plain numbers; `atan2` takes two quantities of one dimension, kinds included. (The conversions into `deg` and `turn` are `≈`, the angle units carrying `pi()`; A2's rule.)" Angles paragraph, A7 (L261-274): "`2 asin(0.5) + 1` is the kind mismatch it is, and the plain number is one token away, `asin(0.5) / radian`; `asin(0.5)` into `turn` is the same angle counted in turns, an angle still."
- Conflict: D5 confirms bullet 5's clause "as the bullet says" (L102, from the same harness line `≈ 0.083333333 turn`) and the Angles paragraph "in every example" (L64), and its edit 2 keeps the clause (L141); V3 confirms Q8 (L31) and its Angles rewrite drops the clause altogether (L331-370); V2 could not verify Q8 from its modules (L35); A7 corrects Q8 and the Angles paragraph (L74, L146-149, L261-274).
- Proposed call: **doc wrong**, if "the number" means a plain number as §8 uses it (neither dimension nor kind): the radian kind on an inverse's result is deliberate (`devdocs/builtins.md` states the ruled-out alternative), and Q8 and both pages misread what a conversion into `turn` returns; D5's own harness line carries the unit `turn`, as A7's probe does, and D5 and V3 confirmed without separating the two conversions. Settle on that reading of the clause, then correct Q8, the Angles paragraph and bullet 5 together.
- Decision: Stands (doc wrong): Q8, the Angles paragraph and bullet 5 corrected together (`asin(0.5)` into `turn` is an angle still); follows Q-019 ("plain number" where the code's rule is quoted).

#### F-068. One conformance check decides more than Q3 lists

- Type: other
- Target section: Conformance
- Units: A7 (L69, L103-119)
- Where: plan Q3; plan §1.2.6 item 1
- Finding: Q3 holds, but the one check (`checkConformance`, every caller passing the table's primitives with their roles) also decides, in a conversion into a function, the have against the function's result (`src/core/pipeline.ts:713-718`) and each unit of a unit list against have (`src/core/convert.ts:223-227`), and, at build time only, a function's body against its result annotation, an inverse's body against its parameter's unit and each term of a condition against the next (`src/core/build.ts:586-597`, `670-681`, `739-750`); "adjacent terms of a condition" is never checked at the call, where `checkConditions` compares magnitudes alone (`src/core/evaluate.ts:1010-1015`). V2 (L30) lists the same callers.
- Proposed call: `quantities.md#Conformance` names every place the check decides at the call (have and want, `+` and `-`, a call's argument, a conversion into a function, a list's units) and leaves a condition's terms to the definition reference's build-time checks.
- Decision: Stands.

#### F-069. Q10 misfiles `gravity`; the pages miss the measured factors

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Units, prefixes and exactness of factors
- Units: A9 (L27, L106-118, L171-175, L179-195, L303-307, L338-340, L350-354), D3 (L24, L28, L47, L76, L82, L91-92, L148, L296-307), V2 (L37), D2 (L119), D8 (L80), A5 (L360, L363-364), V1 (L128, L370)
- Where: plan Q10; `docs/definitions.md#What the file contains` (lines 44-46); `devdocs/numbers.md#approx` (the dalton as "the one candidate", page L1485-1490); `docs/numbers.md#Exact and approximate values` (D8's new sentence); `src/units.txt:118` (the unmarked `gravity` line)
- Claim or passage: Q10 "the constants are exact by the 2019 SI except the dalton, a CODATA decimal written exact"; page "Every factor is the exact one its defining document states, so `1 in` is exactly `2.54 cm` and `1 lb` exactly `0.45359237 kg`, and conversions between them are exact."; `#approx`: the file's constants are "exact by definition" apart from the dalton, a CODATA value written as an exact decimal, "the one candidate".
- Finding: the file marks the five SI defining constants `(exact)` and leaves `gravity` unmarked: `9.80665 m/s^2` is exact by convention, not by the 2019 SI, so Q10 misfiles it. Every factor is written exactly, so a conversion is exact unless a unit calls `pi()`, and the page's examples hold; but besides the dalton (CODATA 2018), the tropical and sidereal years (no source, per D3) are measured values written as decimals, not a document's definition, while every other factor is its defining document's or convention's exact value; the page names no inexact unit. The `pi()` units are `deg`, `grad`, `turn`, `oersted`, `parsec` and everything built on them, while `sr` (`radian^2`) is exact. `#approx`: A5 (L360) left "the one candidate" to D3 and V1 keeps it on "D3 confirms" (L128), but D3's report does not address that page; with the two years measured (D3 L82; A9 report) and `gravity` exact by convention (A9 L106-118), its "one candidate" and "exact by definition" are unconfirmed. A9 asked D3 to mark `gravity` "(exact by convention)" at `src/units.txt:118` (A9 question 8) and to carry the measured-versus-defined distinction into the catalogue entry by entry; D3 takes up the distinction (L82, L336) and states `gravity`'s convention on the page side (L91, L148), but its list of code comments to change (L92) omits the `gravity` line. V2 (L37) and D2 (L119) left Q10 to A9 and D3.
- Evidence: `src/units.txt:112-118`, `:267`, `:344-345`, `:241`, `:292`, `:354`, `:357`, `:414`, `:368`, `:490`; `src/units.test.ts:558-567`, `:484-492`, `:747-749`, `:574`, `:667` (tests pass); D3's scratch run: both page examples exact
- Corrected statement: Q10, A9 (L27): "Every factor is read exactly as written, so a conversion between units defined by such factors is exact (`1 in` is `2.54 cm`; `1 ft` in `in` is `= 12 in`). Most factors are the exact values their defining documents state; a few are measured values carried to the digits their source gives (the dalton, CODATA 2018; the tropical and sidereal years). The angle units `deg`, `grad` and `turn`, everything built on them (`arcmin`, `arcsec`, `gon`, `rev`, `rpm`, the `dms` list), `parsec` and `oersted` call `pi()` and carry its radius; `sr`, as `radian^2`, is exact. The five SI defining constants (`c`, `e`, `planck`, `boltzmann`, `avogadro`) are exact by the 2019 SI; `gravity` is exact by convention, not by the SI." D3 states the same more briefly (full text: D3 L28). Page, D3 (L47): "The examples hold. The rule is: every factor is written exactly, so a conversion is exact unless a unit calls `pi()`; a few factors are measured values written exactly (the dalton, the tropical and sidereal years), not a document's definition."; A9's in-place edit (L181-187) carries A9's first two sentences, the measured values "such as the dalton (CODATA 2018) and the tropical and sidereal years". `#approx`: no unit drafted one.
- Conflict: (1) the two Q10 corrections differ on one fact: A9 (L27) has the measured values "carried to the digits their source gives"; D3 (L28) has the years "written exactly to the digits the file gives" and cites `src/units.txt:344-345` as naming no source; check those lines for a source. (2) Placement: A9 rewrites `docs/definitions.md` lines 41-46 in place (L179-195), D3 moves the paragraph to `units.md` "Which factors are exact" (L296-307). (3) `gravity`: A9 Q1 asks for its conventional exactness to be named and A9's own edit omits it; D3's draft names it under "Constants" (L146-149). (4) `#approx`: V1 keeps the sentence on "D3 confirms" (V1 L128, L370) and A5 leaves it to D3 unchecked (L360, L363-364), while D3's report does not address it and D3 (L82) and A9 (L106-118) find the years measured and `gravity` exact by convention.
- Proposed call: **doc wrong**: the file is coherent (the five constants marked `(exact)` and pinned by tests; its comments mark the measured values, `src/units.txt:267`, and leave `gravity` unmarked, A9 L352), and Q10, the page's rule and `#approx` misfile `gravity` or omit the measured values. Placement per D3 (L76) and D8 (L80): `quantities.md` states the rule; `units.md` "Which factors are exact" carries the page's corrected paragraph (D3 L296-307), naming the dalton, the two years and `gravity`, exact by convention, as D3's skeleton does; `numbers.md` keeps D8's one sentence that the angle units are inexact through `pi()`. `devdocs/numbers.md#approx`: check whether its "constants" covers the year lengths; if so, name them beside the dalton, with `gravity`'s convention, as D3 and A9 state them, or narrow the sentence explicitly to the physical constants of the constants section, in line with `units.md` "Which factors are exact". `gravity`'s missing mark is a comment change recorded with A9's code issue, not taken up in D3's report. Low confidence for `#approx` alone: no unit checked that sentence.
- Related: Q-033, Q-041, Q-085, B-014, B-062, B-063, F-113, F-114, F-116
- Decision: Stands (doc wrong); follows Q-033 (ok), Q-041 (ok: CODATA 2018), Q-085 (ok: `units.md#Which factors are exact` names the measured values and `gravity`'s convention); the `devdocs/numbers.md#approx` sentence is checked by that page's session; amended by F-451 ("inexact" for the `pi()` units) and F-486 ("defined" and "measured" factors).

#### F-070. A conversion's ratio is also refused at the significand limit (Q13)

- Type: contradicts implementation · Flags: **conflict**
- Target section: How a conversion is answered
- Units: A8 (L26, L40, L51, L63-67, L150)
- Where: plan Q13; `devdocs/architecture.md#Conversion` (page L673-677)
- Claim or passage: Q13 "failures are the mismatch, a `want` of zero, a `want` that cannot be told from zero, a ratio at the exponent bound"; page "or a ratio refused as the quotient it is, today at the exponent bound (`1e999999999999999999 m` into `1e-999999999999999999 m` is an `overflow`)".
- Finding: `divideBalls` forms an exact quotient only within the significand limit and `convert` passes the `tooLarge` on, so `3^30000 m` into `5^20000 m` is refused as needing a significand past the limit, its message naming `approx(3^30000 m)`; A8 reports it as a new gap. The comment at `src/core/convert.ts:132-138` says the ratio is never `tooLarge` there (code side in bugs.md).
- Evidence: `src/core/ball.ts:829-835`; `src/core/convert.ts:174-193` (`190-193`); harness (A8 L26)
- Corrected statement: A8: "With a single `want`, the answer is the ratio of the two magnitudes after conformance; the `want` may carry a magnitude (`1 mi` into `1000 ft` is `5.28 × 1000 ft`); failures are the mismatch, a `want` of zero, a `want` that cannot be told from zero, a ratio past the exponent bound or straddling it, and a ratio whose exact significand would pass the significand limit (`3^30000 m` into `5^20000 m`, refused with `approx` named around the `have`). A blank `want` answers in the primitives (`1 in = 0.0254 m`)." The page drops "today" and adds the same refusal (A8 L63-67; stale row tagged update, new).
- Conflict: V2 confirms Q13 with no note (V2 L40) and finds `#Conversion` holds (V2 report, V2 (F-245), V2 L79), its run covering the `overflow` example and the `0 s` mismatch only; A8 corrects both (A8 L26 L26, A8 L40 L40).
- Proposed call: **design changed without the docs following**: the page's "today" marks the bound as the refusal of its time, and the refusal is the ball quotient's ordinary limit with a message that names `approx`; the one sign of a contrary intent is the comment at `convert.ts:132-138`, so the owner confirms that a conversion's ratio may be refused at the significand limit.
- Related: B-038
- Decision: Follows its own answer (A): intended; the pages state the refusal and `convert.ts`'s comment is corrected (B-038). Q13 amended. [decisions.md section 3; plan §12.1]

#### F-071. Two written forms of a line that no page shows (Q18)

- Type: other
- Target section: How a conversion is answered
- Units: A8 (L31)
- Where: plan Q18
- Finding: a negative value with a `want` that carries a magnitude is written as a negated, parenthesized product (`1 m` into `-ft` has the reciprocal line `-ft = -(0.3048 × 1 m)`), and a `want` that is a call is juxtaposed (`373.15 K = 1 tempC(100)`); A8 does not count them among its new gaps.
- Proposed call: the section on lines that type back (or `expressions.md`'s "What the app writes back") shows both forms among its examples.
- Decision: Stands.

#### F-072. A list's remainder is rounded at the digits it certifies (Q15)

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Unit lists
- Units: A8 (L28, L31, L53, L85-87), V2 (L262-264)
- Where: plan Q15; `devdocs/architecture.md#The converter and its lines` ("A unit list", page L1028-1041)
- Claim or passage: Q15 "the remainder is rounded at the display digits and a rounding that reaches a whole of an earlier unit carries"; page "with `roundTerms` applied at the display precision in the display's mode".
- Finding: the remainder is rounded at the digits it certifies, the display digits only when it certifies them all (the page says so one sentence later); with the ratio notation an exact remainder that fits its width is written entire, so nothing is rounded and nothing carries (`1 m = 3 ft + (428/127) in`), which no page states.
- Evidence: `src/outcome.ts:548-560` (`552-553`); `src/core/convert.ts:381-402`; harness rows (A8 L28, L31)
- Corrected statement: A8's Q15 keeps the claim and changes four clauses: a count takes the integer nearest its midpoint when its ball straddles or touches it; the remainder is rounded at the digits certified (the display digits when all are); with the ratio notation an exact remainder that fits its width is written entire and nothing carries; a last term that cannot be told from zero is left out like a zero term (full text: A8 L28). Page: A8's old→new pair (A8 L85-87).
- Conflict: V2 confirms Q15 with no note (V2 L42) and finds the converter section holds in every statement about what is shown apart from the re-parse (V2 report, V2 L83); A8 corrects both (A8 L28 L28, A8 L28 L85-87). V2's own pair 4 (V2 L262-264) rounds "at the digits certified" and drops "at the display precision", agreeing in substance.
- Proposed call: **doc wrong**: the page contradicts itself and the code's rule is its next sentence; low confidence because A8 reasoned the rounding digits from code without a run (A8 L28), the ratio-notation case having run.
- Related: Q-089
- Decision: Stands (doc wrong); follows Q-089 (ok); low confidence: the session reads `src/outcome.ts:548-560`.

#### F-073. Unit-list example spacing differs from the app's

- Type: contradicts implementation
- Target section: Unit lists
- Units: A8 (L58, L113-123), D2 (L163, L466)
- Where: `docs/definitions.md#Unit lists` (page L176-192)
- Claim or passage: "`1 hr / 7 mi` in `min/mi;s/mi` is `8 min/mi + 34.285714 s/mi`".
- Finding: the app writes `8 min / mi + 34.285714 s / mi`, the printer's canonical spacing; every other example of the section reproduces (A8 report). D2 could not verify the section's conversion examples from its modules (D2 L163, "the pipeline's raw terms agree with the first two"); A8 did.
- Evidence: `src/core/print.ts:106`; harness (A8 L58)
- Corrected statement: "`1 hr / 7 mi` in `min/mi;s/mi` is `8 min / mi + 34.285714 s / mi`", inside A8's full replacement of the section (A8 L113-123, which also names the fields have and want and says display digits). The list-name and load-time rules that replacement keeps, which A8 left to A9 or D3 (A8 L121-123), are verified by A9 (L26, A9 report: `src/core/build.ts:309-330`) and D2 (D2 report: `src/core/build.ts:853-885`).
- Proposed call: **doc wrong**: the printer's text is canonical by design (one space around `/`); fix the example wherever the section's content lands (`quantities.md` for what a list answers).
- Related: Q-089
- Decision: Stands (doc wrong); follows Q-089; A8's replacement uses have and want (F-471 A) and "display digits" (F-458).

### Findings owned by other pages that touch this one

- F-084 (docs/expressions.md): The want field's own grammar is stated nowhere (§6.3)
- F-104 (docs/definitions.md): Units, lists, functions and built-ins share one set of names
- F-110 (docs/units.md): Why readings and levels are functions: already stated
- F-111 (docs/units.md): Unit lists: `dms` is the one inexact list; the rules live elsewhere
- F-113 (docs/units.md): Units defined through `pi()` are inexact, and no page names them
- F-458 (terminology): "the digits of the Settings" for display digits

## `docs/expressions.md`

17 findings (F-074 to F-090).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/definitions.md#Expressions` (complete text with five new subsections, written to move into `docs/expressions.md`) | D1 (L287-485) | No second draft. The text also carries the want's grammar ("The two fields"; D1 (F-084)) and the literal limits (D1 (F-076)); D9 (L256-264) drafts `docs/app.md` "The two fields", which also says how an error marks its field |
| `docs/definitions.md#Names` (complete text) | D1 (L239-285); A9 (L197-205, one old→new pair on lines 119-122) | OVERLAP: both rewrite lines 119-122 (unit lists' names checked too; same substance; A9's sentence is a load-time check, for `docs/definitions.md`); D2 (L212-216) drafts the shared-names rule (one set for units, lists, functions and built-ins; prefixes apart; `m-` and `m`) in `#The format`, which D1's text also states (L260-262, L271-272): keep one |

### Findings

#### F-074. No grammar or precedence table in docs/; a header grammar exists in code

- Type: gap (confirmed)
- Target section: Grammar and precedence
- Units: D1 (L40-52, L186, L688)
- Where: `docs/definitions.md#Expressions`; `devdocs/architecture.md#Expressions`; plan §6.3, §2.1.3
- Gap: Neither a formal grammar nor a precedence table is in `docs/`. D1 derived a six-level table from the parser, loosest first (`;` in the want only; `+ -`; `* /`; one `-` before a product; juxtaposition, a number only first; one `^` with a literal exponent; atoms), and checked it against `LEVELS`, `BINARY` and the property test (`src/core/print.test.ts:134-151`); the code also holds an EBNF-style grammar in a comment, `src/core/expr.ts:6-19`, matching the combinators production by production, so §2.1.3's "no EBNF for expressions appears anywhere" is wrong (plan side).
- Sources: `devdocs/architecture.md#Expressions`; D1 Finding 1 (L40-52); the header grammar `src/core/expr.ts:6-19`
- Proposed call: `docs/expressions.md` carries prose, D1's precedence table (L300-310) and worked examples, and no hand-written EBNF until the generated grammar (§2.1.3 interim, §12 q30); `devdocs/architecture.md#Expressions` names the header grammar as the hand-maintained form until the DSL generates one, quoting none of it (D1 Q1), which V2's pared section (L178-190) does not do.
- Related: F-500
- Decision: Stands; follows Q-038 (ok) and F-500 (§2.1.3 corrected); D1's draft's "canonical" sentence follows F-439, which the owner amended on 2026-10-13 (plan §12.3): "canonical" may stand in the docs, glossed once.

#### F-075. Literal forms beyond the four examples unstated

- Type: gap (new)
- Target section: Numbers
- Units: D1 (L59-60, L197, L312-319)
- Where: `docs/definitions.md#Expressions > Numbers`
- Gap: `5.`, `1E3` and `2E+2` are literals; no space stands inside a literal; the exponent belongs to the literal only without a space and only with digits, so `2e -19 C` is `2 e - 19 C` and `2e` is `2 e` (`e` being the elementary charge).
- Sources: `devdocs/architecture.md#Expressions` (a literal read as far as it goes); `src/core/expr.ts:287-288`; `src/core/expr.test.ts:373-382`, `:396-400`
- Proposed call: "Numbers" as D1 drafts it (L312-319); the literal limits beside it are D1 (F-076)'s.
- Decision: Stands.

#### F-076. Gap: literal limits at parse and at evaluation

- Type: gap (confirmed)
- Target section: Numbers
- Units: D1 (L176, L188; `merged.md`)
- Where: `docs/settings.md#(top) > Significand limit` ("a literal of more digits than the limit", page L152); plan §6.3
- Gap: The limits at parse (`numberTooLarge`, `numberOverflow`, `numberUnderflow`, `exponentTooLarge`, `exponentDividesByZero`, each final and pointing at the literal) and the literal's hold to the limit at evaluation appear nowhere in docs/ beyond that clause.
- Sources: `src/core/expr.ts:297-331`, `:450-463`; `src/messages.ts:316-328`, `:349-369`, `:390-399`; `src/core/evaluate.ts:505-519`, `:606-623` (D1 L176)
- Proposed call: The "Literal limits" bullet of D1's proposed `docs/expressions.md` text (D1 L320-331), linked from `numbers.md` once it exists.
- Related: F-053, F-090
- Decision: Stands; amended by F-442 and F-441 as the review settled them (plan §12.3, R-4): the docs say a literal past the hard bound ("longer than the limit can ever be set to") or the exponent bound is refused as it is typed, a size refusal, never "rejected"; the link from `numbers.md` is written when the later page lands (Q-008).

#### F-077. Name characters: letters of any script, but digits 0 to 9 only

- Type: contradicts implementation
- Target section: Names
- Units: D1 (L76, L243-252), A9 (L164-170, L312-316)
- Where: `docs/definitions.md#Names` (lines 106-108)
- Claim or passage: "A name is a letter or underscore followed by letters, digits and underscores, in any script, so `µm`, `Ω`, `Å`, `degF` and `N_A` are names while `°`, `%` and `'` cannot be."
- Finding: `NAME` is `/[\p{L}_][\p{L}0-9_]*/u`: letters of any script, but only the digits `0`-`9`; superscripts, subscripts, other scripts' digits, combining marks and symbols are not name characters.
- Evidence: `src/core/expr.ts:290`; `src/core/expr.test.ts:437-456`
- Corrected statement: (D1) "A name is a letter of any script or an underscore, followed by letters of any script, the digits `0` to `9` and underscores; superscripts and subscripts, other scripts' digits, combining marks and symbols are not name characters, so `m²`, `H₂O` and an `Å` typed as `A` with a combining ring are errors." A9 (Q3, for D1): "a letter or underscore followed by letters in any script, the digits 0 to 9, and underscores".
- Proposed call: doc wrong: the regex and its tests are deliberate and nothing on the pages states an intent for other digits, while "in any script" reads as covering the digits; adopt D1's wording (its `#Names` text, L246-252).
- Related: Q-087
- Decision: Stands (doc wrong); follows Q-087 (ok).

#### F-078. The `ha` example fails: there is no unit `a`

- Type: contradicts implementation · Flags: **conflict**
- Target section: Names
- Units: D1 (L80, L694, L700)
- Where: `docs/definitions.md#Names` (lines 114-115); `docs/units.md` (no unit `a`)
- Claim or passage: "An exact name always wins, so `min` is the minute and not `m` + `in`, and `ha` is defined as the hectare even though `h` + `a` would give the same."
- Finding: No unit `a` exists (the are is `are`), so `h` + `a` reads as nothing and `ha` does not illustrate the exact-name rule; the `min` half holds.
- Evidence: `src/units.txt:248-250` (`ha`, `hectare`, `are 100 m^2`; no unit `a`); harness `Unknown unit "a".`
- Corrected statement: (D1) "`ha` is the hectare by its own definition; the are is `are` and no unit `a` exists, so `h` + `a` would read as nothing, and `ha` does not illustrate the rule."
- Conflict: A9 (L164-170) finds `#Names` "holds throughout", the resolution included, without naming the `ha` sentence; D1 (L80) corrects it, with a harness run.
- Proposed call: doc wrong: the file defines the are only as `are` and no unit proposes a unit `a` (code wrong only if the owner wants the SI symbol for the are); drop the example, as D1's `#Names` text does, and say in `units.md` that there is no unit `a` (D1 Q7). `src/units.txt:248-250` settles the conflict.
- Related: F-112
- Decision: Follows its own answer (A, drop the example): the `ha` sentence goes; nothing is said anywhere of the absence of a unit `a` (amends F-112's and Q-075's calls on that point). [decisions.md section 3; plan §12.1]

#### F-079. Name resolution is stated only in part

- Type: gap (confirmed)
- Target section: Names
- Units: D1 (L78, L84, L119, L189, L205, L239-285)
- Where: `docs/definitions.md#Names`; `docs/definitions.md#Functions` (lines 293-294, the parameter rule); `docs/definitions.md#The format` (D2's shared-names text); plan §6.3
- Gap: Confirmed in part: `#Names` states the exact name, the one prefix, the separate namespaces and the exact call names; the parameter rule (a parameter's name before any unit of that name, in a body) sits under `#Functions`; stated nowhere: that a function's or a list's name is not a unit (`tempC` in the have says so and shows the call form, `time` there is an unknown unit), that a name has only one split (the shortest prefix that fits, in a table that passed `findAmbiguity`), and that the file's and the built-in functions share one set of names. "Defined function before built-in" is never observable, since the build refuses a definition that takes a built-in's name (`src/core/build.ts:158-164`), so the reference need not state it.
- Sources: `devdocs/architecture.md#Definitions`, `#Evaluation`; `devdocs/functions.md#Names and shadowing`; D1 rows L78, L84, L119
- Proposed call: `docs/expressions.md` "Names" states the reading rules from D1's `#Names` text (L239-285); the load-time checks (one set of names, no list or function name readable as a prefixed unit, the ambiguity error) go to `docs/definitions.md` "Names"; the shared-names sentence is drafted twice (D1 L260-262, L271-272; D2 L212-216 in `#The format`): keep one. (`docs/definitions.md:198-199` already says a list's name means something only as the want.)
- Related: F-104, F-308
- Decision: Stands; follows Q-113 (the prohibition, not a precedence) and F-475 ("the definitions file").

#### F-080. "No `+` in front of anything" is too broad

- Type: contradicts implementation
- Target section: Operators
- Units: D1 (L67, L355-356, L700)
- Where: `docs/definitions.md#Expressions > - before a product` (lines 156-157)
- Claim or passage: "It does not stack (`--2` is an error; write `-(-2)`), and there is no `+` in front of anything."
- Finding: There is no unary `+`, but a `+` sign is accepted in a literal's exponent and as the sign of a `^` exponent.
- Evidence: `src/core/expr.ts:287-288` (`UNSIGNED` takes a signed exponent, `SIGNED` a leading sign); `src/core/expr.test.ts:218-219`, `:265`, `:277`, `:380`
- Corrected statement: (D1) "There is no unary `+`: `+2` and `2 * +3` are errors. A `+` sign is accepted only in a literal's exponent (`2E+2`) and as the sign of a `^` exponent (`m^+2`, `m^(+3/2)`)."
- Proposed call: doc wrong: the `+` exponents are tested forms; state the exceptions as D1's negation bullet does (L355-356).
- Decision: Stands (doc wrong).

#### F-081. Forms and limits of a `^` exponent unstated

- Type: gap (new)
- Target section: Operators
- Units: D1 (L68-69, L98, L116, L198, L357-371)
- Where: `docs/definitions.md#Expressions > ^`
- Gap: One exponent per factor (`m^2^3` is an error); a `+` sign allowed (`m^+2`); an unsigned second literal (`m^(1/-2)` is an error); `m^(2)` allowed; `m^x` and `m^(1/2 + 1)` errors; a zero divisor an error as typed; the fraction formed within the significand limit when evaluated, so `^` and `pow` differ (`2^(1e30/1e30)` is `2`, `2^1e-30000` is refused, `pow(2, 1e-30000)` is `≈ 1`); the two literals written back as typed (`m^(2/4)` stays unreduced).
- Sources: `devdocs/architecture.md#Expressions`, `#Evaluation` (`reduceExponent`); `devdocs/numbers.md#Roots and powers`; D1 rows L68-69, L98, L116
- Proposed call: The `^` entry of "Operators" as D1 drafts it (L357-371), stating the `^`/`pow` difference without the issue link (D1 Q3: the link stays in devdocs).
- Decision: Stands; the `^`/`pow` difference stated without the issue link (#88's one link is `devdocs/numbers.md#Roots and powers`, Q-102).

#### F-082. Arity is a count or a range, and a call may take none

- Type: contradicts implementation
- Target section: Calls and arity
- Units: D1 (L71-72, L199, L375-385, L443-444)
- Where: `docs/definitions.md#Expressions > A call` (lines 164-166)
- Claim or passage: "Each function takes its own number of arguments, and a call with another number is an error that says how many."
- Finding: `Arity` is a range: some built-ins take a range (`round`, 1 to 2); the count is checked before any argument is computed; a call may take no arguments (`pi()`), which no example on the page shows.
- Evidence: `src/core/evaluate.ts:210`, `:668-679`; `src/core/builtins/round.ts:346-347`; `src/core/builtins/pi.ts:21-22`; `src/messages.ts:118-119`, `:651-654`; harness `"round" takes 1 to 2 arguments, but "round(1, 2, 3)" gives 3 arguments.`
- Corrected statement: (D1) "Each function takes a fixed count of arguments or, for some built-ins, a range (`round(x)` and `round(x, places)`); a call with another count is an error that says how many, reported before any argument is computed."
- Proposed call: doc wrong: the range is deliberate and the message words it; D1's call bullet (L375-385) adds `pi()`, and its "When an expression fails" the order (L443-444).
- Related: B-048
- Decision: Stands (doc wrong).

#### F-083. Have and want as two grammars, and which error comes first

- Type: gap (new)
- Target section: The have field
- Units: D1 (L145, L195, L404-428)
- Where: nothing in `docs/`
- Gap: The have is one expression and the want adds `;`; a failure of the have is reported before one of the want, even before a want that does not parse (`bogus` into `ft;` reports `Unknown unit "bogus".`).
- Sources: `src/core/pipeline.ts:463-474`, `:503-504`, `:505-584`; `src/outcome.ts:200`, `:246-273`; D1 L145
- Proposed call: "The have field" and "Evaluation order and error locations" state it, from D1's "The two fields" and "When an expression fails" ("An error marks its field, the have's before the want's").
- Related: F-084
- Decision: Stands.

#### F-084. The want field's own grammar is stated nowhere (§6.3)

- Type: gap (confirmed)
- Target section: The want field
- Units: D1 (L135-145, L187)
- Where: plan §6.3; `docs/definitions.md#Unit lists`, `#Functions`
- Gap: no page of `docs/` states the blank want, a want with a number, a call as the want, the empty item (`ft;`, `;in`, `ft;;in` are errors), or that `;` never stands in parentheses; unit lists and conversion into a function are stated apart only. D1 verified the readings by shape (blank, a list's bare name, a function's bare name, any other expression, two or more items) and that a list's or a function's name is a unit nowhere else.
- Sources: `devdocs/architecture.md#Pipeline`, `#Unit lists`, `#Functions`; D1's Finding 3 (D1 L135-145)
- Proposed call: `expressions.md` "The want field" states the readings, linking `quantities.md` for what a list and a conversion into a function answer; D1's draft (D1 L404-424, D1 (F-090)) is the source, and leaves out on purpose that a bare name in parentheses still counts as bare.
- Related: F-090
- Decision: Stands; the links to `quantities.md` are written when that page exists (Q-008; `quantities.md` comes before `expressions.md` in the order).

#### F-085. Evaluation order and error locations missing from docs/

- Type: gap (confirmed)
- Target section: Evaluation order and error locations
- Units: D1 (L126-131, L190, L426-444)
- Where: nothing in `docs/`; `devdocs/architecture.md#Evaluation` (the source)
- Gap: Operands are computed left to right and the first failure ends it (`bogus / 0` reports the unknown unit); a division by zero, or by a value that cannot be told from zero, points at the divisor (`1 / (2 - 2)` quotes `(2 - 2)`); a power's base that cannot be told from zero at the base, any other failing power at the whole power; a sum, product or quotient refused at the whole operation; a literal past the significand limit at the literal; a nonconforming sum at the whole sum; a nonconforming argument at the whole call.
- Sources: `devdocs/architecture.md#Evaluation`, confirmed by D1 (L126-131) and A7 (L120-128)
- Proposed call: "Evaluation order and error locations" from D1's "When an expression fails" (L426-444); `devdocs/architecture.md#Evaluation` then opens with a link to it (§12 q24).
- Decision: Stands; `devdocs/architecture.md#Evaluation` opens with the link in its own one-pass rewrite (Q-008).

#### F-086. The printed form missing from docs/

- Type: gap (confirmed)
- Target section: What the app writes back
- Units: D1 (L180, L192, L446-458)
- Where: `docs/README.md#(top)` (the copy sentence only); `devdocs/architecture.md#Expressions` (the printer); `devdocs/architecture.md#The converter and its lines`
- Gap: None of the canonical text is in `docs/`: one space between juxtaposed factors and around the other operators, `^` and a quotient of two literals tight, arguments joined by `, `, literals and exponents as typed (`1e3` stays `1e3`, `m^(2/4)` stays), the fewest parentheses that read the tree back, and `×` on screen for a product written with `*` while the copy text has `*`.
- Sources: `devdocs/architecture.md#Expressions` (printer), `#The converter and its lines`; `devdocs/notation.md#Where a ratio is written` (plan §6.3); `src/core/print.ts:1-29`, `:165-175`; `src/core/print.test.ts:48-117`
- Proposed call: "What the app writes back" from D1's "How the app writes an expression back" (L446-458), linking `numbers.md` for the principle that every result pastes back (§12 q11) once that page exists.
- Decision: Stands; follows F-457 ("pastes back") and F-439 (no "canonical" in docs: "how the app writes an expression back"). Amended on 2026-10-13 (plan §12.3): the printer's text may be called canonical, glossed once.

#### F-087. Readings to watch beyond a fraction before a unit

- Type: gap (new)
- Target section: Pitfalls
- Units: D1 (L75, L82, L147-172, L194, L460-482)
- Where: `docs/definitions.md#Expressions` (last paragraph, "The one thing to watch is a fraction before a unit", confirmed as far as it goes)
- Gap: Verified on the harness at the defaults: `m^1/2` is `(m^1) / 2`; `-2^2` is `-4`; `2^3^2` and `5 ft 3 in` are errors; `2e -19 C` is `2 e - 19 C` with no error and `2e` is `2 e`; `kg(m/s)` is a call and `tempC (1)` a product; `pi ()` is an error; `m²`, `30°` and `50%` are errors; `1 dB` is `d` + `B` (`= 0.8 bit`) and `1 at` is `a` + `t` (`= 1e-15 kg`); `1 m in ft` typed as the have is a volume, and `to` and `per` are unknown units; `1 m + 0` is an error; `1,000`, `2,54`, `1 000`, `2 × 3`, `2 − 3` and a non-breaking space are errors.
- Sources: D1 Finding 4 (L147-172); `src/core/expr.ts:21-29`
- Proposed call: "Pitfalls" from D1's "Readings to watch" (L460-482), which also covers §7's four examples (`1/12 year`, `kg(m/s)`, `-2^2`, `m2`).
- Decision: Stands; the juxtaposition edge Q-003 requires (`1/2 in` against `(1/2) in` and `0.5 in`) is stated here.

#### F-088. Whitespace, and the characters the fields do not accept

- Type: gap (confirmed)
- Target section: What is not accepted
- Units: D1 (L94, L99, L174, L191, L196, L386-402)
- Where: nothing in `docs/`; `docs/definitions.md#Names`; `docs/definitions.md#Expressions`; plan §12 q11
- Gap: None of `×`, `÷`, `·`, `²`, `≤`, `≥`, `=`, `<`, `>`, `#`, `[`, `|`, `~`, `:` or a typographic minus is accepted (each is `Unexpected "…": expected …` where it stands), and nothing rewrites them; `#` starts no comment in an expression, which settles §12 q11's open point, and comments and comparisons belong to the definitions file's lines; whitespace is spaces and tabs, allowed before and after the text and between any two tokens, never inside a number or a name, never between a call's name and its `(`, never a newline; any other space, a non-breaking space included, is an error; below the grammar a space ends a token (`2e -19`, `m^- 1`).
- Sources: `devdocs/architecture.md#Expressions` (whitespace); D1 Finding 5 (L174); `src/core/expr.ts:244-264`, `:274-290`; `src/core/definitions.ts:31-32`, `:388-389`; `src/messages.ts:75`, `:670-673`
- Proposed call: "What is not accepted" and the whitespace rule as D1 drafts them (L386-402); the intent to accept `×` and its kin later is `devdocs/future.md`'s (D1 Q4).
- Decision: Stands; follows Q-037 (ok: the intent is `devdocs/future.md`'s); amended by Q-011: the docs list the characters as errors with what to type instead and say nothing of what may come; F-442: "an error", never "rejected".

#### F-089. How parse errors read is missing from docs/

- Type: gap (confirmed)
- Target section: Errors
- Units: D1 (L178, L193, L213, L426-444, L682, L692)
- Where: nothing in `docs/`; `devdocs/architecture.md#Parsing` (the source)
- Gap: An unmatched text is `Unexpected end of input: expected …` or `Unexpected "c": expected …`, listing the labels of what was tried furthest, in the order tried; a rejected literal is quoted with its reason; `3 m ^` gives exactly `Unexpected end of input: expected a number or "(".`; the label "a unit name" also stands for a function's name, by design so that a call and a name are not listed apart, where the docs say "name".
- Sources: `devdocs/architecture.md#Parsing`; D1 Finding 7 (L178); `src/core/parser.ts:379-386`; `src/messages.ts:71-78`; `src/core/expr.ts:342-349`
- Proposed call: The page says how an error reads in general, from D1's "When an expression fails", and the catalogue is left to the generator (§12 q6); renaming the label "a unit name" to "a name" is a code change of its own (D1 Q5; bug side in bugs.md) and would change any message the page quotes.
- Related: B-019
- Decision: Stands; follows Q-055 (ok: the label becomes "a name" in a code change of its own; the page quotes no message carrying the old label); amended by F-442 ("a refused literal" reads "a literal that is an error as typed" in the docs).

#### F-090. Expression reference sits in definitions.md; D1's text is ready to move

- Type: structure
- Units: D1 (L180, L287-485, L289, L700)
- Where: `docs/definitions.md#Expressions`; `docs/definitions.md#Names`; `docs/definitions.md` (keeps the load-time name checks); plan §6.3, §9.3
- Finding: The reference for the language of the have, the want and a definition's body sits under "Unit definitions" (§6.3 "partial, misplaced"; §9.3: a definitions page owns name resolution). D1 calls where the want's grammar, the errors and the readings to watch go before `docs/expressions.md` exists its hardest call: its complete `#Expressions` text extends the section with five subsections ("What an expression does not contain", "The two fields", "When an expression fails", "How the app writes an expression back", "Readings to watch"), written to move, with no link to a page not yet written; the printed-form subsection is for the section C5 names "How the app writes expressions".
- Proposed call: Write `docs/expressions.md` from D1's `#Expressions` and `#Names` texts (L239-485), mapped onto §7's sections; until then they replace the two sections in place, ready to move, and `docs/definitions.md` keeps the load-time name checks with a link to the reference.
- Decision: Stands: `docs/expressions.md` from D1's texts; amended by F-442 as the review settled it (plan §12.3, R-4): D1's "rejected as it is typed", said of a literal past a size limit, becomes "refused as it is typed" (a size refusal), and text the grammar does not read is "an error as it is typed"; amended by F-439 (its "canonical form" sentence reworded), F-457 and F-475 ("the definitions file"); the page is written after `numbers.md` and `quantities.md` (Q-008).

### Findings owned by other pages that touch this one

- F-095 (docs/definitions.md): The call rule stated in four places
- F-103 (docs/definitions.md): `#Names` omits that a list's name is checked like a function's
- F-112 (docs/units.md): Names absent or meaning something else: `e`, `at`, no unit `a`
- F-114 (docs/units.md): The catalogue moves from the language page to docs/units.md
- F-234 (devdocs/architecture.md): Expression devdocs sections: what becomes a link, what stays
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-442 (terminology): "rejected" / "rejection" beside "refusal" and "error"
- F-462 (terminology): "conform", "dimension mismatch", "kind mismatch"; "conformance tests"
- F-473 (terminology): Expression words: juxtaposition, negation, literal

## `docs/definitions.md`

18 findings (F-091 to F-108).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/definitions.md#(top)` (lines 5-6) | A9 (L37), D1 (L219-237), D3 (L313-319) | OVERLAP: three rewrites of one sentence: D3 (L313-319) points to `units.md`, sending the contents there, and drops "how to add to it"; D1 (L219-237) keeps "how to add to it"; A9 (L37, stale row) "what it contains and how to read it", dropping it; D2 Q3 (L463) leaves it to D3; the stale rows are fused with D2 (F-108) in the "How to add to it" finding |
| `docs/definitions.md#The format` (body, page L60-102) | D2 (L167-256) | OVERLAP: D1's `#Names` text (D1 L239-285) also states the shared set of names and the separate prefix namespace. D2's primitive bullet omits `bit` (D3 (F-094)). "The file is rejected when" and "rejects it" go against D1 (F-442) ("rejection" devdocs-only). #132 inline here conflicts with V4's placement |
| `docs/definitions.md#Functions` (page L265-267, L291-293) | D2 (L258-268) | OVERLAP: "is rejected" against D1 (F-442); the first pair is terminology (D2 (F-480)). No unit drafted the call-rule pointer (D1's question 6) or the `dozen` rename (V4's question 4) |

### Findings

#### F-091. Line-level facts absent from the docs prose

- Type: gap (new)
- Target section: The file
- Units: D2 (L58-61, L148)
- Where: `docs/definitions.md#The format`
- Gap: the page does not state that indentation is allowed, that a comment may follow a body directly, that `\r\n` line endings are accepted, that there are no continuation lines, that a one-item list is a unit, or that a prefix's body is an expression and never `!` or a list. The tests confirm each (`src/core/definitions.ts:298-313`, `:574`, `:614-628`; tests `:197-202`, `:241-284`, `:396-401`).
- Sources: D2's verified line-grammar facts (D2 L58-66). `devdocs/architecture.md#Definitions` states only the whitespace rule.
- Proposed call: state them under "The file", as D2's `#The format` text does (D2 L172-177, L198-204).
- Decision: Stands.

#### F-092. A line-level grammar for the six kinds (§6.4)

- Type: gap (confirmed)
- Target section: Grammar
- Units: D2 (L39, L56, L134)
- Where: `docs/definitions.md#The format`; plan §6.4, §2.2.3
- Gap: confirmed. The docs give prose by example. The only complete line grammar is the parser's comment (`src/core/definitions.ts:19-32`).
- Sources: `devdocs/functions.md#Definitions` (its head-grammar block matches the function and inverse part of that comment in every detail, D2 report); `devdocs/architecture.md#Definitions`.
- Proposed call: interim prose (D2's `#The format` text). The EBNF waits for the generated grammar (§2.2.3, §12 q30).
- Related: Q-038
- Decision: Stands; follows Q-038.

#### F-093. A kind primitive called "dimensionless"

- Type: stale (update) · Flags: **conflict**
- Target section: Primitives
- Units: D2 (L36, L193-194, L449), V2 (L304)
- Where: `docs/definitions.md#The format` (page L66, L80-82)
- Passage: "# kind primitive (dimensionless)" and "a dimensionless marker that keeps quantities apart which would otherwise look alike"
- Tag: update (new; §12 q20: a kind is never called dimensionless)
- Rewrite: D2: "# kind primitive" and "a marker that keeps apart quantities which would otherwise look alike" (D2 L36). V2: "a marker of a kind, with no dimension of its own" (V2 L304).
- Conflict: the two glosses differ. A7 rewrites the same phrase on `devdocs/architecture.md:104` as "mark a kind of quantity that has no physical dimension" (A7 (F-190)).
- Proposed call: Confirm `update` (§12 q20 is binding). Choose one gloss for both corpora. The same phrase in the code comment `src/core/definitions.ts:11` is bugs.md's.
- Related: Q-097, B-057, F-190, F-459
- Decision: Stands (update); follows Q-097 and F-459 (ok: "a marker of a kind, with no dimension of its own", or "kind marker").

#### F-094. The file's primitives: nine, with `bit`

- Type: gap (new)
- Target section: Primitives
- Units: D3 (L30, L83, L343)
- Where: `docs/definitions.md#The format` (page L78-84); no page states the nine
- Gap: the file declares nine primitives: the seven SI base units, `bit`, and the kind `radian` (`src/units.txt:17-25`). `#The format` names only the SI base units and the radian, and no page or comment says why information is a dimension rather than a count. A second `!kind` line builds, so the count of kinds is the file's choice, not the core's (scratch).
- Sources: `src/units.txt:17-25`, the source of truth (§12 q4); `src/units.test.ts:186-200`. No devdocs passage states the nine.
- Proposed call: state the file's primitives, `bit` included, and say why information is a dimension (D3's question 4). D3 puts this in a primitives section of `units.md`. D2's draft of `#The format` (D2 L191-197) still names only the SI base units and the radian.
- Related: Q-032, B-060, B-064
- Decision: Stands; follows Q-032 (ok).

#### F-095. The call rule stated in four places

- Type: structure
- Target section: Functions
- Units: D1 (L693, L700), V4 (L70, L100, L288-343), D2 (L258-268, L471)
- Where: `docs/definitions.md#Functions` (page L215-219); `docs/definitions.md#Expressions > A call`; `devdocs/architecture.md#Expressions`; `devdocs/functions.md#Calls`; plan §9.1
- Finding: §9.1 lists the call rule (`kg (m/s)` against `kg(m/s)`) in four places, and `#Functions` restates both the call rule and the arity error of `#Expressions > A call`. D1 asked D2 to have `#Functions` keep the function semantics and point to the call bullet (D1's question 6 and notes); D2's report does not take it up: its two `#Functions` edits (D2 (F-098), D2 L258-268) touch only the "cannot be decided" wording and the annotation-scale error, D2's report predating D1's and D2 reading no other unit's report, so the docs side is a loose end. V4 cuts `devdocs/functions.md#Calls` to what the rule buys the parser and the error, with a link to `expressions.md` "Calls" (V4 L288-343).
- Proposed call: the rule and the arity error live in `docs/expressions.md` "Calls and arity", and `docs/definitions.md#Functions` keeps the function semantics and links there (D1's question 6). The devdocs keep the parser's reason (V4). `devdocs/architecture.md#Expressions` is handled with D1 (F-238).
- Related: Q-106, F-234, F-238
- Decision: Stands; follows Q-106 (ok).

#### F-096. How definitions interact with exactness (§6.4)

- Type: gap (confirmed)
- Target section: Functions
- Units: D2 (L108-119, L136)
- Where: plan §6.4; `docs/definitions.md`; `devdocs/functions.md`
- Gap: confirmed. D2 verified each of these: the table is built once, at the ceiling, in exact mode; a function's body is evaluated afresh at each call, at the pass's working precision; a condition of a call inside an evaluated body is decided at the ceiling, and one left undecided fails the build; an annotation must be certainly nonzero; a list's units must be certainly positive and decreasing at the ceiling; a `^` exponent is reduced within the significand limit at build, while a literal is not held to it; conditions are three-valued, decided at the operand context; decimal mode rounds each step of a body.
- Sources: `devdocs/numbers.md#Working precision and the schedule`, `#approx`; `devdocs/functions.md#Definitions`, `#Build-time checks`, `#The check at a call`, `#Precision, the radius and cost`.
- Proposed call: write the list into §7's "Units" (evaluated once at the ceiling) and "Functions" (exactness and cost; decimal mode). Cost and decimal mode follow the triplication finding's split.
- Decision: Stands; amended by F-475 (the table built once from the definitions file); the cost and decimal-mode parts follow F-033.

#### F-097. How definitions interact with dimensions (§6.4)

- Type: gap (confirmed)
- Target section: Functions
- Units: D2 (L121-130, L137)
- Where: plan §6.4
- Gap: confirmed. D2's list: the result's dimension is inferred from the body, with each parameter bound to its annotation's dimension (a plain number without one), and checked against the result's annotation; adjacent terms of a condition must conform, and each condition must mention a parameter; an inverse's parameter takes the function's result dimension; a prefix's body has neither a dimension nor a kind; an annotation checks a dimension and changes no value, so `: percent` is accepted; a built-in's dimension rule applies at build (finding above); a call's count and argument dimensions are checked at build; a parameter shadows a unit by its exact name, and a prefixed name is always a unit; parameter annotations are evaluated among the units alone.
- Sources: `devdocs/functions.md#Annotations`, `#Names and shadowing`, `#Conditions`, `#Build-time checks`; `devdocs/architecture.md#Definitions`.
- Proposed call: write these into "Functions" and "Prefixes" (§7).
- Decision: Stands.

#### F-098. Pages describe messages for definitions errors; none is worded

- Type: contradicts implementation · Flags: **conflict**
- Target section: Functions
- Units: D2 (L38, L42-43, L73, L266-268, L294-322, L441-442), V4 (L42-43, L179-194, L232-236)
- Where: `docs/definitions.md#Functions` (page L291-293); `devdocs/functions.md#Names and shadowing` (page L234-239); `devdocs/functions.md#Conditions` (page L284-285)
- Claim or passage: docs: an annotation scale "is an error that says to write the scale in the body"; devdocs: for `parameterNamesUnit`, "the message meant for it names the parameter and the annotation and suggests renaming the parameter"; for `nonconformingComparison`, "with `x: K`, `| x > 0` is an error, whose message suggests `0 K`."
- Finding: no message is worded for any definitions rejection or build error. `src/messages.ts` handles only `TextError` and `ConversionError`, and nothing of `DefinitionRejection`; `BuildError` is consumed only by `src/system-build.ts` and `src/system-table.ts`; `nonconformingComparison` carries the definition, the condition, both terms' spans and the mismatch; `parameterNamesUnit` points at the annotation's use of the name.
- Evidence: `src/messages.ts:64-151`, `:316-328`, `:452-512`; `src/core/build.ts:739-750`; `src/core/definitions.ts:502-517`
- Corrected statement: docs: "An annotation names units only: `: 2` or `: 1000 m` would read as a scale that it does not apply, and is rejected; write the scale in the body." (D2 L268). `#Names and shadowing`: the rejection carries the parameter and points at the annotation, and no message is worded for it; it is an error rather than a warning because the build cannot report a warning and nothing edits a definition yet (D2 L300-311 and V4 L183-194 agree except for where #131 is linked). `#Conditions`: "…is an error carrying both terms' spans and the mismatch; the fix is `0 K`." (D2 L322; V4 L43 says "both terms").
- Conflict: D2's docs wording "is rejected" goes against D1's terminology row (D1 (F-442)): "rejection" stays devdocs-only, and docs say "an error as it is typed" (§8: error for everything but the three size refusals).
- Proposed call: **doc wrong**. The messages described do not exist, and the page's own `#Annotations` says so. **Code wrong** was considered and set aside: the devdocs describe "the message meant", but the intended wordings belong with #132 (definitions typed into the app), and bugs.md records the absence of messages (D2 (B-029), V4 (B-029)).
- Related: B-029, F-442
- Decision: Stands (doc wrong); amended by F-442: D2's "is rejected" becomes "is an error" in the docs (devdocs keep "rejection" for the parser's); amended by Q-011: the wording "belongs with #132" and #132 itself are `devdocs/future.md`'s only (F-306).

#### F-099. The `dozen` example names a unit of the file

- Type: contradicts implementation · Flags: **conflict**
- Target section: Functions
- Units: D2 (L149, L461, L471), V4 (L111, L123-125, L169-171, L561, L568), A8 (L58, L148)
- Where: `docs/definitions.md#Functions` (page L282-286); `devdocs/functions.md#Definitions` (page L32-33), `#Annotations` (page L190), `#Display` (page L586)
- Claim or passage: `dozen(n: in) = 12 n` with `~dozen(len) = len / 12`: "`2 ft` converted to `dozen` is `dozen(2 in)`"
- Finding: `dozen` is a unit of the file (`1 dozen` is `12`). Appended to the file, the example is a `duplicate`, and `2 ft` into `dozen` in the app is a mismatch, not `dozen(2 in)` (A8). The scratch runs had to use `dozn` and `bakers`.
- Evidence: `src/units.txt:614`; `src/units.test.ts:745`; harness (D2, A8)
- Corrected statement: D2: rename to a name the file does not define, keeping the example's shape (L461). V4: `twelve`, at `devdocs/functions.md:32-33`, `:190`, `:586` and `docs/definitions.md:282-284` (L561). A8: keep `dozen` and say once, where the page introduces it, that it is the page's own definition (L148).
- Conflict: on the remedy, D2 and V4 rename where A8 keeps `dozen` with a note; on the type, V4 tags a contradiction, D2 a new gap and A8 "other"; in the drafts, A8's `#Display` pairs write `dozen((1250/381) in)` (A8 L107-111) where V4's writes `twelve(2 in)`.
- Proposed call: **doc wrong**; the file's unit `dozen` is deliberate. Nobody drafted the docs side: V4 hands the rename to D2 (V4 report), D2's report predates V4's, and D2's `#Functions` edits do not touch these lines. The page also writes `dozen(1 ft)` at :286. `devdocs/functions.md:182` correctly uses `dozen` as a unit.
- Related: Q-015
- Decision: Stands (doc wrong); follows Q-015 (B: `twelve`, or a fresh example that collides with nothing); both pages use the one name.

#### F-100. The three-valued check and "why conditions differ" duplicated

- Type: structure
- Target section: Functions
- Units: V4 (L69, L99, L261-278)
- Where: `docs/definitions.md#Functions` (page L263-279); `devdocs/functions.md#The check at a call`, `#An undecided condition`; plan §9.1
- Finding: the user statement is in `docs/definitions.md#Functions`: a condition is decided on the value's bounds with no tolerance, an undecided one is assumed and warned of, and a condition differs from a built-in's edge. The devdocs repeat the rationale.
- Proposed call: as V4 proposes: the verdict table and the retry mechanics stay in devdocs, and the rationale is quoted in one line with a link (§12 q24; V4 L263-278).
- Decision: Stands.

#### F-101. An undecided guard and a later term that cannot be computed

- Type: other
- Target section: Functions
- Units: A6 (L180-194, L450-453), D2 (L117, L467)
- Where: `docs/definitions.md#Functions` (page L255-257: in `| x > 0, ln(x) > 1` "a negative argument fails the first and never reaches `ln`")
- Finding: the docs say a certainly failing guard keeps a later term from being evaluated (D2 report), but not what happens behind an undecided guard: a term that cannot be computed there is assumed and warned of, not the call's error (`src/core/evaluate.ts:1023-1027`; A6: `guarded(sqrt(2)^2 - 2)` is `≈ 0` with two warnings; D2: `gd0(x) | x > 0, ln(x) > -1` warns on both conditions). The devdocs state the rule (A6 L180-194, V4 report). A6 handed D2 the `guarded` example; D2 had found the fact itself but sent it only to A6, for devdocs, so nobody drafted it for the docs.
- Proposed call: add one sentence and A6's `guarded` example to "Functions" (conditions). Whether the docs state the touch rule is A6's question 1.
- Related: Q-024, Q-090, F-279
- Decision: Stands; follows Q-090 (ok) and Q-024 (ok).

#### F-102. Inverse conditions and what a conversion checks (§6.4, refuted in part)

- Type: gap (refuted)
- Target section: Inverses
- Units: D2 (L138)
- Where: `docs/definitions.md#Functions` (page L259-261, L300-303); plan §6.4
- Gap: refuted in part. The page already says that an inverse's conditions restrict what converts into its function, and that the function is reapplied and a mismatch refused (`src/messages.ts:466-472`, `:551-561`). The full sequence of checks is Q16's.
- Sources: `devdocs/functions.md#Conditions` (last paragraph), `#A function as the want`.
- Proposed call: keep the two sentences under "Inverses". The full sequence goes to `quantities.md` "Conversion into a function" (§12 q13).
- Decision: Stands.

#### F-103. `#Names` omits that a list's name is checked like a function's

- Type: other
- Target section: Names
- Units: A9 (L26, L197-205)
- Where: `docs/definitions.md#Names` (lines 119-122)
- Finding: `#Names` says only that "a function's name may not itself read as a prefix followed by a unit"; the build applies the same `prefixedName` check to a unit list's and a built-in's name (`src/core/build.ts:309-330`). The page states the list rule under `#Unit lists` (`docs/definitions.md:196-198`) but not where names are explained. D1 (L84) confirms the sentence as far as it goes and notes that lists and built-ins are checked the same way; its `#Names` text (L267-271) names lists too. A9 drafts: "neither a function's name nor a unit list's may itself read as a prefix followed by a unit (see Unit lists and Functions below)".
- Proposed call: `docs/definitions.md` "Names" names unit lists beside functions, with the pointer, as A9 (L197-205) and D1 (L267-271) both draft.
- Decision: Stands.

#### F-104. Units, lists, functions and built-ins share one set of names

- Type: gap (new)
- Target section: Names
- Units: D2 (L86, L104, L147, L212-216)
- Where: `docs/definitions.md#Unit lists` (page L196, "cannot also be a unit"); `devdocs/functions.md#Definitions` (page L99-101) states the rule
- Gap: the page says only that a list's name cannot also be a unit. It does not say that functions and lists share one set of names with the units and the built-ins, so `sqrt(x) = x` is a `duplicate` (harness: reported with the built-in first). Prefixes have a set of their own.
- Sources: `devdocs/functions.md#Definitions` (page L99-101); `devdocs/architecture.md#Definitions` (lists and functions "share the unit namespace").
- Proposed call: state it once on the page. D2 drafts it in `#The format` (D2 L212-216); D1 drafts it in `#Names` ("The file's functions and the built-in functions share one set of names", D1 L271-273). §7 places namespaces under definitions.md "Names".
- Related: F-079
- Decision: Stands.

#### F-105. The build-time checks as a table (§6.4)

- Type: gap (confirmed)
- Target section: Build-time checks
- Units: D2 (L37, L71-104, L135, L169, L219-248)
- Where: `docs/definitions.md#The format` (page L98-102); plan §6.4
- Gap: confirmed. The summary sentence ("A name defined twice, a circular definition, a prefix whose body has a dimension, a unit list that breaks the rules below, a function whose body does not fit its annotations, or an inverse of no function is an error.") names six of some twenty checks; D2's stale row 5 tags it update. Every kind §6.4 names exists, and `inverseAnnotation` is to be added. Build order: the whole file is parsed, then indexed; then come the inverses, the ambiguity check and the prefixed names; then the primitives are collected and the definitions walked; the first failure ends the build. No message is worded for any of these checks, so the user table names causes and fixes, not messages or kinds (§12 q6).
- Sources: `devdocs/architecture.md#Definitions` (the catalogue); `devdocs/functions.md#Build-time checks`, `#Names and shadowing`, `#Conditions`; D2's 26-row developer table (L75-102).
- Proposed call: use D2's 28-row user table ("The file is rejected when / Example / What to write instead", L219-248). Its heading follows §7 ("Build-time checks").
- Decision: Stands; follows Q-031 (ok: the docs table is the one list; devdocs point at it); amended by F-442 and F-476: the table is headed by what fails when the file loads ("error" in the docs, never "rejected"), and §7's section is retitled to match; amended by Q-011: the table names causes and fixes, and nothing about messages to come.

#### F-106. A built-in's dimension rule applies at build

- Type: gap (new) · Flags: **conflict**
- Target section: Build-time checks
- Units: D2 (L104, L128, L146, L245, L363, L471), V4 (L91, L405)
- Where: neither page states it explicitly (D2); `devdocs/functions.md#Build-time checks` step 2 says only "a call applies the callee's rule" (page L609-610)
- Gap: a function body is checked against a built-in's dimension rule at build time. `f(x) = sin(x)` fails to build (`builtinArgument`, a kind mismatch against the radian), while `f(x: radian) = sin(x)` builds (`src/core/dimension-of.ts:185-195`; harness).
- Sources: `devdocs/functions.md#Build-time checks` (step 2).
- Conflict: D2 says neither corpus states it (L128, L146). V4 lists it among the statements the page makes correctly (L91; V4 report: `r3(x) = sin(x)` fails the build). Both drafts make step 2 say "a built-in's dimension rule included" (D2 L363, V4 L405).
- Proposed call: add D2's table row (L245) to the docs, and make devdocs step 2 explicit as both drafts do. Whether the current wording already says it does not change the rewrite.
- Decision: Stands.

#### F-107. The status of user definitions (§6.4)

- Type: gap (confirmed) · Flags: **conflict**
- Target section: User definitions
- Units: D2 (L139, L253-255, L462)
- Where: `docs/definitions.md` (no line mentions user definitions or #132); plan §6.4; §12 q12
- Gap: confirmed. The page nowhere says that only the system file is loaded today, which §12 q12 requires.
- Sources: `devdocs/future.md#Extensions that fit`; `devdocs/functions.md#Deferred` ("Definitions typed into the converter").
- Conflict: where the #132 link lives. D2 links it here (L253-255, L462); V4 links it in `devdocs/functions.md#Deferred` (L558); V6 (F-415) gives #130 to #134 to `functions.md`. Plan §7's outline names #132 under this page's "User definitions". See the issue-link finding.
- Proposed call: one sentence that only the system file is loaded and that user definitions are intended (D2 L253-255). The link follows the owner's choice in the issue-link finding.
- Related: Q-011, F-415
- Decision: Stands as amended by Q-011 and F-475: one sentence that only the predefined definitions file is loaded, as a plain fact, with no "intended" clause and no link; #132 and the intent are `devdocs/future.md`'s only (F-421).

#### F-108. "How to add to it": the page has no such section

- Type: stale (update) · Flags: **conflict**
- Units: A9 (L37, L39, L217-223, L317-322), D1 (L32, L219-237), D3 (L65, L315-319), D2 (L463)
- Where: `docs/definitions.md#(top)` (page L5-6); `devdocs/architecture.md#Definitions` (page L174-177); plan §9.4 row; plan §5 C50
- Passage: "This section describes that file: what it contains, how to read it, and how to add to it." (docs); "docs/definitions.md describes them, along with what the system file contains and how to add to it" (devdocs). The docs page has no section on adding to the file, and plan §5 C50 places adding a unit in `devdocs/development.md#Adding a unit` (D2 L463).
- Tag: update (plan §9.4 row confirmed by A9, D1 and D3; the devdocs row is new, A9)
- Rewrite: A9: "This page describes that file: what it contains and how to read it.", and the devdocs sentence names `development.md`, "Adding a unit" (A9 L37, L217-223). D3: "This page describes the file's format and how to read it; the units it defines are described in `[units.md](units.md)`." (D3 L65). D1 keeps all three clauses and changes "the converter" to "the have and want fields" (D1 L219-237). D2 (question 3): the architecture sentence points at `docs/definitions.md` for the format and the names and at `development.md#Adding a unit` for adding; the top is left to D3 or the page's owner (D2 L463).
- Conflict: D1 applies only the plan row ("This section" → "This page") and keeps "how to add to it" (D1 L32, L233-236; D1 report); A9 drops it (L37); D3 drops it and moves "what it contains" to `units.md` (L65). For the devdocs sentence, A9 points at `development.md#Adding a unit` (L217-223), D2's question 3 asks the same (L463), and V2's pared `#Definitions` (V2 (F-227)) drops the clause without that pointer and still names `docs/definitions.md` for the file's contents (V2 L156).
- Proposed call: Confirm `update`; the open point is how far the rewrite goes. A9's question 4 drops the clause from the docs top and points the architecture sentence at `development.md#Adding a unit`, as D2's question 3 does for that sentence (the format and the names at `docs/definitions.md`); D1 keeps the clause. To settle it, check two facts: neither page has a section on adding to the file (C50 puts it in `devdocs/development.md#Adding a unit`), and §7 moves the file's contents to `units.md` (decided with the catalogue's move, D3 (F-114)). D1's change to "have and want fields" applies whichever rewrite is chosen.
- Related: Q-105, F-227
- Decision: Stands (update); follows Q-105 (ok: the top drops "how to add to it"; `devdocs/architecture.md` names `development.md#Adding a unit`; D1's "the have and want fields" applies) and F-475 ("the definitions file" in both sentences).

### Findings owned by other pages that touch this one

- F-033 (docs/numbers.md): The call-cost paragraph triplicated; where its parts go
- F-035 (docs/numbers.md): A built-in against the same formula written by hand
- F-036 (docs/numbers.md): Gap §6.1: identities and cancellation, and their cost
- F-045 (docs/numbers.md): Gap §6.1: decimal mode as rules
- F-063 (docs/numbers.md): What costs time, qualitatively: a §7 section with no §6.1 bullet
- F-079 (docs/expressions.md): Name resolution is stated only in part
- F-090 (docs/expressions.md): Expression reference sits in definitions.md; D1's text is ready to move
- F-114 (docs/units.md): The catalogue moves from the language page to docs/units.md
- F-323 (devdocs/functions.md): devdocs/functions.md re-explains user rules: per-section link and stay
- F-421 (cross-cutting): Issues #130 to #134: one owner page, two placements proposed
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-442 (terminology): "rejected" / "rejection" beside "refusal" and "error"
- F-456 (terminology): "fraction" reserved for the held value
- F-459 (terminology): "dimensionless markers" for the kind primitives
- F-465 (terminology): "base unit"
- F-471 (terminology): Have and want: "the quantity to convert", "the unit to convert to"; the labels
- F-472 (terminology): "the converter" for the app, the fields and the outcome module
- F-476 (terminology): "loaded" (docs) and "build" (devdocs)
- F-479 (terminology): "the unit it takes" as the gloss of "annotation"
- F-480 (terminology): A condition's outcome: undecided, holds, fails, verdict, assumed, "certainly"
- F-482 (terminology): A call as "the body typed out in its place"
- F-483 (terminology): "intervals" for the temperature units; "interval" elsewhere
- F-484 (terminology): Names of units: alias, spelling, symbol, name; pair and split
- F-485 (terminology): "logarithmic units"

## `docs/units.md`

8 findings (F-109 to F-116).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/units.md` (new page) | D3 (L97-311) | OVERLAP: A9 (L179-195) drafts part of the same content as edits in place (next row); D3's sections depart from §7's skeleton |
| `docs/definitions.md#What the file contains` | D3 (L313-319, delete and carry into `units.md`); A9 (L179-195, two old→new pairs, lines 41-46 and 48-56) | OVERLAP, CONFLICT: D3 deletes the section, A9 edits it in place; the facts agree |

### Findings

#### F-109. Naming conventions beyond `imp` and `uk`

- Type: gap (new)
- Target section: US customary and UK imperial
- Units: D3 (L34, L37, L41, L44, L80, L213-228)
- Where: `docs/definitions.md#What the file contains` (the `imp` and `uk` paragraph, lines 41-44)
- Gap: Nothing in `docs/` names the other conventions: `long` and `short` for the ton and the hundredweight (`stone`, `quarter`, `rood`, `cental` carry no marker); symbol-and-name pairs; `metre`/`meter`, `litre`/`liter`, `deca-`/`deka-`; Unicode names with ASCII stand-ins (`Ω`/`ohm`, `Å`/`angstrom`, `µ`, `μ`, `u`); case-sensitive near-collisions (`Gal`/`gal`, `St`/`st`, `T`/`t`, `S`/`s`); `mho` as an alias of the siemens; `imppeck` and `impbushel` beside the imperial gallon.
- Sources: `src/units.txt:504-505`, `:512-513`, `:124-125`, `:254-255`, `:43-44`, `:161-162`, `:275-276`, `:72-74`, `:285`, `:428`, `:287`, `:501`, `:168`, `:136`, `:163`, `:19`, `:165`, `:481-484`
- Proposed call: `units.md` "Naming conventions" as D3 drafts it (L213-228), under §7's "US customary and UK imperial" (whose naming conventions name `imp`, `uk`, `long`).
- Decision: Stands.

#### F-110. Why readings and levels are functions: already stated

- Type: gap (refuted)
- Target section: Temperature
- Units: D3 (L77, L230-246)
- Where: `docs/definitions.md#What the file contains` (lines 48-56); `docs/quantities.md#Temperature and logarithmic levels`; plan §6.2
- Gap: Refuted as a content gap: the page gives both reasons (a reading adds an offset; a level is the logarithm of a ratio), as the file's comments do; the fuller reason, that a quantity carries no offset, is at `devdocs/functions.md:10-16`.
- Sources: `src/units.txt:185-188`, `:197-205`, `:212-221`; `devdocs/functions.md:10-16`
- Proposed call: Placement only: the reason goes to `quantities.md` "Temperature and logarithmic levels" (§7, §12 q13); `units.md` "Temperature" and "Logarithmic levels" keep the entries and link there (D3 L230-246).
- Decision: Stands; amended by Q-011: the reason why readings are functions is a ruled-out alternative (an offset in `Quantity`), stated as a plain fact in `quantities.md` and with its reason in `devdocs/functions.md`; `devdocs/future.md`'s bullet on it moves there. Amended on 2026-10-16 (plan §12.3): the reason is `docs/quantities.md`'s in full; `devdocs/functions.md` keeps the alternative and the mechanism and links the user page.

#### F-111. Unit lists: `dms` is the one inexact list; the rules live elsewhere

- Type: gap (new)
- Target section: Unit lists
- Units: D3 (L85, L259-281)
- Where: `docs/definitions.md#What the file contains` (the lists bullet); `docs/quantities.md#Unit lists`
- Gap: The page lists the fifteen lists but says neither that `dms` alone is inexact (through the angle units) nor where a list's counting rule lives (`quantities.md`, §7).
- Sources: `src/units.txt:591-605`; `src/units.test.ts:777-801`, `:803-828` (the straddled count that follows)
- Proposed call: `units.md` "Unit lists" with D3's table and its `dms` sentence (L259-281), linking `quantities.md` "Unit lists" for the rules.
- Decision: Stands; amended by F-451 ("the one inexact list").

#### F-112. Names absent or meaning something else: `e`, `at`, no unit `a`

- Type: gap (new)
- Target section: Names deliberately absent
- Units: D3 (L46, L81, L89, L283-295, L349), D1 (L86, L206, L694, L700)
- Where: `docs/definitions.md#Names` (lines 124-129); `docs/units.md#Names deliberately absent` (proposed page); plan Q9; plan §7 (the `units.md` skeleton)
- Gap: nothing in `docs/` says which familiar symbols mean something else: `e` is the elementary charge (Euler's number is `exp(1)`), `rad` the radian (the absorbed-dose rad is not defined), `h` the hour (`planck` is the constant), and `c`, `d`, `t`, `g` the speed of light, the day, the tonne and the gram. Q9 holds (D1): `u` and `at`, the symbols of the dalton and the technical atmosphere, are not defined, for the reason it gives; typed anyway, `1 u` is an unknown unit and `1 at` reads as `a` + `t`, an attotonne (`1 at = 1e-15 kg`), which converts to no pressure; the file has no unit `a` (the are is `are`). §7's "Names deliberately absent (`u`, `at`, `dB`, `e`)" lists `e`, which is defined. Left undone: D1 asked the units guide to say there is no unit `a` and that both micro signs are prefixes, so not a pitfall; D3's draft covers `at` (L285-289) and the micro spellings (L128-129) but not the missing unit `a` (D3's report, 2026-10-09, predates D1's merged report).
- Sources: `src/units.txt:113`, `:142`, `:328`, `:235`, `:114`, `:52`, `:74`, `:78`, `:79`, `:136`, `:248-250`, `:264-266`, `:309`; `src/units.test.ts:368`, `:398-399`; D1's harness
- Proposed call: `units.md`'s section, retitled as D3 drafts it ("Names that are absent, or mean something else", L283-295; D3's question 5), lists `u`, `at` (an attotonne when typed), `dB`, `e`, `rad` and the one-letter names, and adds that there is no unit `a` (D1's question 7); Q9's sentence gains "`at` reads as `a` + `t`"; the §7 bullet is corrected on the plan side.
- Related: Q-075, F-502
- Decision: Stands; follows Q-075 (ok: the retitled section and its list, with `rad`; Q9 adds that `at` reads as `a` + `t`) as amended by F-078 (nothing about a unit `a`).

#### F-113. Units defined through `pi()` are inexact, and no page names them

- Type: gap (confirmed) · Flags: **conflict**
- Target section: Which factors are exact
- Units: D3 (L76, L171-178), A9 (L119-129, L171-175, L187), D8 (L105, L174, L178)
- Where: `docs/definitions.md#What the file contains`; `docs/quantities.md#Units, prefixes and exactness of factors`; `docs/numbers.md#Exact and approximate values`; `docs/settings.md#How a number is held, and what the settings touch` (page L213-217, the two ways a value becomes inexact in exact mode); plan §6.2
- Gap: the definitions page states the exactness rule but names no inexact unit and never says a conversion among the angle units shows `≈`, and the passage on the two ways a value becomes inexact in exact mode (`docs/settings.md`, page L213-217) does not name them either. Five definitions call `pi()` (`deg`, `grad`, `turn`, `oersted`, `parsec`), so `deg`, `degree`, `arcmin`, `arcminute`, `arcsec`, `arcsecond`, `grad`, `gon`, `gradian`, `turn`, `rev`, `revolution`, `circle`, `rpm`, `rps`, `parsec`, `pc`, `oersted`, `Oe` and the list `dms` are inexact (`turn` into `deg` is `≈ 360`; D8's rerun: `30 deg` in `radian` is `≈ 0.52359878` and `1 turn` in `deg` is `≈ 360`); `sr`, as `radian^2`, is exact; every other unit is exact.
- Sources: plan §6.2 (`devdocs/builtins.md#The elementary routines`, `devdocs/numbers.md#approx`); A5's N3 note ("the angle units built from it"); `src/units.txt:241`, `:292`, `:354`, `:357`, `:414`, `:143`; `src/units.test.ts:484-492`, `:747-749`
- Conflict: destinations: D3 (L76) puts the rule in `quantities.md` and the list in `units.md`; A9 (L187) adds a sentence to `docs/definitions.md#What the file contains`; D8 (L174-178) adds a clause to `numbers.md` "Exact and approximate values". A9 files it as a new gap (it had no §6 in context) and D8 as a new fact to add, D3 as a confirmed §6.2 gap.
- Proposed call: `units.md` lists the inexact units ("Angles and rotation", "Which factors are exact"; D3 L171-178, L296-308) and `quantities.md` states the rule (§7); D8 adds one clause to `numbers.md#Exact and approximate values` (D8 L174-178): decide whether `numbers.md` carries it as well.
- Related: F-040
- Decision: Follows its own answer (A): one clause in `numbers.md`'s section on exact and inexact values, linking `units.md`'s list; the owner's note recorded (no mechanism marks a unit definition inexact; `pi()` is the only source). Amended by F-451 ("inexact" throughout). [decisions.md section 3; plan §12.1]

#### F-114. The catalogue moves from the language page to docs/units.md

- Type: structure · Flags: **conflict**
- Units: D3 (L78, L97-311, L244-246, L313-319)
- Where: `docs/definitions.md#What the file contains` (lines 10-56); `docs/definitions.md#(top)`; `docs/definitions.md#Names`; `docs/definitions.md#Functions`; `devdocs/development.md#Adding a unit`; plan §6.4, §9.3, §12 q4
- Finding: Confirmed (§6.4 last bullet, §9.3): the section's six bullets and three paragraphs describe the file's contents and naming conventions, not the language. D3 drafts `docs/units.md` (L97-311, every fact verified, `src/units.txt` the source of truth) and deletes the section, carrying it bullet by bullet ("intervals" become "temperature differences"). D3's sections depart from §7's skeleton: it adds the primitives, other metric and scientific units, time beyond the day, naming conventions, information, and counts and ratios, and writes "Angles and rotation" and "Names that are absent, or mean something else" for "Angle units" and "Names deliberately absent". D3 keeps the `dB` rule in `#Names` and `#Functions` as a rule of the language; on the page as it stands those sections state only the general rule (`docs/definitions.md:119-122`, `:303-304`), the `dB` example appearing only at `docs/definitions.md:55`, inside the section D3 deletes, while D1's `#Names` text adds it (D1 L262-264). D3's draft links `quantities.md` and `numbers.md`, which do not exist yet.
- Conflict: A9 (L179-195) edits the section in place (two old→new pairs) where D3 deletes it; the page's top sentence has three rewrites: D3 (L313-319) "This page describes the file's format and how to read it; the units it defines are described in `[units.md](units.md)`.", D1 (L219-237) keeping "how to add to it", A9 (L37) "what it contains and how to read it"; D2 Q3 (L463) leaves the top to D3.
- Proposed call: Create `docs/units.md` from D3's draft and delete the section (§6.4, §9.3, §12 q4); carry A9's content into `units.md` instead of editing a section that goes; reconcile D3's section list with §7's; keep the `dB` example in `#Names` (D1's text); decide the top sentence with the `#(top)` finding.
- Related: F-108
- Decision: Stands: `docs/units.md` from D3's draft; follows Q-105 and F-475 ("the definitions file"); amended by F-451 ("Angles and rotation" says "inexact"), F-483 ("temperature differences") and F-078; the page is written after `numbers.md` and `quantities.md` (Q-008).

#### F-115. Five sections of the file are described nowhere

- Type: gap (new)
- Units: D3 (L31, L79)
- Where: `docs/definitions.md#What the file contains` (the six bullets)
- Gap: The page's six bullets and the file's twenty-one sections do not correspond (D3's "Sections" claim, corrected): angles and rotation (`src/units.txt:352-362`), astronomical (`:410-415`), light (`:570-574`), counts and ratios (`:608-615`), and most of "other common metric and scientific units" (`:273-333`: `Å`, `micron`, `fermi`, `cc`, the radiation units, `carat`, `barn`) are named by no bullet.
- Sources: The section heads of `src/units.txt` (`:15`, `:28`, `:84`, `:105`, `:122`, `:140`, `:231`, `:273`, `:336`, `:352`, `:365`, `:418`, `:425`, `:466`, `:487`, `:536`, `:562`, `:570`, `:577`, `:585`, `:608`)
- Proposed call: `units.md` gives each section a home, as D3's draft does; §7's skeleton gains them (plan side).
- Related: F-515
- Decision: Stands: §7's skeleton gains the sections (plan amended).

#### F-116. Sources: three attributions unverified, five cited sources unnamed

- Type: not verified · Flags: **low confidence**
- Units: D3 (L32, L40, L42, L84, L340-342)
- Where: `docs/definitions.md#What the file contains` (the SI, US customary and UK imperial bullets, lines 12-26)
- Finding: The page attributes the file's units to "the 9th edition of the SI brochure with the 2022 prefixes", "NIST Handbook 44" and "the Weights and Measures Act 1985"; the 2022 prefixes are there, but neither the file nor its test names any of the three documents. The file cites five the page never names (the 1959 agreement, the Mendenhall Order, IAU 2012, CODATA 2018, IEC 80000-13), the International Table for `Btu` and `cal_IT`, and the conventional `mmHg` and `mmH2O`. The dalton's value is CODATA 2018, and CODATA has since published a 2022 adjustment; the tropical and sidereal years carry no source and are epoch-dependent.
- Why unverified: The attributions appear nowhere in `src/units.txt` or `src/units.test.ts` (`:32-33`, `:55-58`, `:81-82` hold the 2022 prefixes; `:365-366` and `:394-396` cite the 1959 agreement and the Mendenhall Order; `:466` and `:468` cite nothing).
- Proposed call: `units.md` cites what the file cites, as D3's draft does; the three attributions stay only if the owner confirms them and the file's header names them (D3 Q1); "CODATA 2018" for the dalton until the file changes (D3 Q2); the years named as measured values (D3 Q3); the comment changes are bugs.md's.
- Related: B-014, B-063, B-065
- Decision: Stands; follows Q-033 (ok), Q-041 (ok); low confidence noted.

### Findings owned by other pages that touch this one

- F-069 (docs/quantities.md): Q10 misfiles `gravity`; the pages miss the measured factors
- F-078 (docs/expressions.md): The `ha` example fails: there is no unit `a`
- F-451 (terminology): "approximate", "known to a precision" for inexact
- F-486 (terminology): "defined" and "measured" factors
- F-502 (plan): §7 units.md skeleton lists `e` and `at` as absent names

## `docs/settings.md`

20 findings (F-117 to F-136).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/settings.md#(top)` opening paragraphs (Where the settings are; Defaults, resets and storage) | D4 (L146-171), D9 (L155-163) | OVERLAP: two drafts of the opening; D4's keeps the reset links and adds the storage-fallback sentence (D4 (F-133)); D9's sends the resets to `docs/app.md#The settings sheet` (D9 L228-243) |
| Display digits | A3 (L78-84), D4 (L175-183) | OVERLAP: both drop "as GNU units shows"; D4 rewrites the rest of the entry |
| Notation and ratio width | A2 (L111-114), D4 (L184-205) | OVERLAP, conflict: A2 writes the haves as echoed (`m / 3 m`, `1/3 × 1e30`) and keeps "which reads back as itself"; D4 keeps the typed haves and drops the clause (D4 (F-122)) |
| Mode | A4 (L109-113), D4 (L209-222) | OVERLAP: A4 corrects the step list in place, D4 drops it for a link to `numbers.md`; conflict: D4 L221-222 puts the notation under the mode, against V5 (F-340) |
| Working digits | D4 (L223-237) | none (A4 L115-117 proposes no change) |
| Rounding | D4 (L238-249) | none |
| Precision limit | A3 (L86-92), D4 (L253-266), D8 (L273-277) | OVERLAP, conflict: A3 writes "four times the sum of the limit and ten digits" with no "grid"; D4 keeps "four times this limit plus ten digits" and "the finest grid the app rounds onto"; D8 replaces only the parenthetical |
| Significand limit | D4 (L267-283) | OVERLAP: D8 (L180-190, L232-265) moves this entry's dyadic cost and remedies into `numbers.md`; reconcile (D8 (Q-108)) |
| Probe budget and Measure this device | D4 (L284-287, L316-347) | conflict: "the four costliest elementary functions" (D4 L327-328) is a ranking D5 could not verify (D5 (F-278)) |
| How the settings bound each other | D4 (L289-314) | none |

### Findings

#### F-117. "There are six settings": a count, against §12 q16

- Type: stale (update)
- Target section: Where the settings are
- Units: D4 (L58), D9 (L32, L76, L159), V5 (L39, L95, L145-147)
- Where: `docs/settings.md#(top)` (first paragraph, page L23-24); `devdocs/settings.md#(top)` (page L3)
- Passage: "There are six settings, kept in the browser so that they survive a reload (under a format version of their own…)"; devdocs: "Six settings, kept in the browser: …"
- Tag: update; plan row confirmed (§9.4) for the docs page (D4, D9); new for the devdocs page (V5)
- Rewrite: no count; "The settings are kept in the browser, under a format version, so that they survive a reload and a later build reads what an earlier one stored", the controls listed grouped and nested by mode (D9 L32); devdocs: "The settings, kept in the browser: …" with the list (V5 L147). The sheet has eight controls (`src/settings-panel.ts:73-80`); the stored object's six fields are a storage fact for devdocs (D4 L58).
- Proposed call: Confirm `update` on both pages (§12 q16); the rest of `devdocs/settings.md#(top)` stays (V5).
- Decision: Stands (update, both pages); amended by F-488: "the settings panel" ("the panel has eight controls" is a devdocs fact, never a count in the docs).

#### F-118. "eight by default, as GNU units shows" goes (§12 q2)

- Type: stale (update) · Flags: **conflict**
- Target section: Display digits
- Units: A3 (L50, L78-84), D4 (L63, L350), A2 (L151)
- Where: `docs/settings.md#(top) > Display digits` (page L36)
- Passage: "eight by default, as GNU units shows"
- Tag: A3: update (§12 q2), new; D4: drop, new
- Rewrite: "eight by default" (A3 L78-84; D4 L63); the rest of the entry stands as verified (A3).
- Conflict: A3 tags it update (A3 L50); D4 tags it drop, noting it is not a superseded design but §12 q2's framing decision (D4 L63).
- Proposed call: Question: the tag. The clause applies an owner decision rather than recording history (D4); both tags give the same rewrite, so it goes either way.
- Related: Q-081
- Decision: Stands (either tag; the rewrite is the same); follows Q-081 (ok).

#### F-119. Rounding entry omits that the mode governs round()

- Type: gap (new)
- Target section: Rounding
- Units: D4 (L121, L245-246)
- Where: `docs/settings.md#(top) > Rounding` (page L41-48)
- Gap: The entry does not say the rounding mode is also the mode `round()` rounds in (plan §3 row S2, N11).
- Sources: plan §3 (S2), N11; D4 could not verify `round()`, which A2 report and D6 report confirm (the one exact-function call that reads the mode).
- Proposed call: One clause with a link to the function reference, as D4's replacement entry has (D4 L245-246).
- Related: F-048
- Decision: Stands; the link targets `docs/builtins.md` (Q-020's note).

#### F-120. `= -100000000` is displayed as `= -1e+8`

- Type: contradicts implementation
- Target section: Mode
- Units: A4 (L36, L37, L56, L86, L96, L112, L141), V1 (L73, L288), D4 (L101-105, L215, L414), V5 (L84, L237, L245)
- Where: `docs/settings.md#(top) > Mode` (page L55); `devdocs/numbers.md#Decimal mode` (item 4, page L1063)
- Claim or passage: "and `1 / (1 / 3 * 3 - 1)` is `= -100000000`", on both pages (A4 and V1 also list it as stale rows, update)
- Finding: the value is exactly minus one hundred million, and the app shows `= -1e+8`: a nine-digit integer at eight display digits goes to exponent notation (N12); the value is right, its written form is not. It surfaced through `displayText`, where tests asserting on values could not see it.
- Evidence: run (A4 L56); D4's harness (`outcomeOf` against the system table); V5 reports the same display; the `%g` rule of N12, confirmed (A2 report)
- Corrected statement: "`1 / (1 / 3 * 3 - 1)` is `= -1e+8`" (A4 L96, L112; D4 L215; V1 L288)
- Proposed call: **doc wrong**: the exponent form past the display digits is the display's deliberate rule (N12), and nothing points to the code; the example is fixed on both pages and wherever the mode's rules land (`docs/numbers.md#The two modes`).
- Related: Q-003, F-037
- Decision: Stands (doc wrong).

#### F-121. The ratio is bare before the reciprocal's `×`: `in = 1/36 × 3 ft`

- Type: contradicts implementation
- Target section: Notation and ratio width
- Units: A2 (L30, L43, L52, L65, L91-94, L113, L144), D4 (L49, L106, L127, L198-201, L414), V5 (L27, L42, L84, L135-139, L237, L245)
- Where: `docs/settings.md#(top) > Notation` (page L77); `devdocs/notation.md#Where a ratio is written` (second bullet, page L147-150); plan N13
- Claim or passage: docs: "`in = (1/36) × 3 ft` on the second line of `3 ft = 36 in`"; devdocs: "**Before the reciprocal's `× 3 ft`, the same:** `in = (1/36) × 3 ft`. … the parentheses cost two characters and save the reader the rule."; N13: "parenthesized before a unit and bare alone", silent on `×` (A2 and V5 tag the two passages stale, update)
- Finding: The printer writes the fewest parentheses that read the tree back: `in = 1/36 × 3 ft` and `in = 127/5000 × 1 m`; a ratio before a factor joined by juxtaposition is parenthesized (`in = (-127/5000) (-1 m)`).
- Evidence: `src/outcome.test.ts:97` (also `:87-98`, `:111-113`); `src/core/print.ts:5-6`, `:14-23`, `:136-147`; D4's and V5's harness; D4's note on N13 (context D4 L49)
- Corrected statement: "A ratio is parenthesized where a factor follows it by juxtaposition (before a unit, `(5000/127) in`; before a parenthesized have) and is bare where `×` follows it (`in = 1/36 × 3 ft`) or nothing does." (V5 L27)
- Proposed call: **doc wrong** (all three units): one printer rule by the grammar's levels, pinned by `src/outcome.test.ts:97`. Against it, `devdocs/notation.md` gives a reader-facing reason for the parentheses, an intent the code does not carry, so **code wrong** stays possible; A2 (Q-003) asks the owner (the squashed history does not say which came first).
- Related: Q-003
- Decision: Follows Q-003 (A): doc wrong; the pages write `in = 1/36 × 3 ft` and state the juxtaposition edge; N13 amended.

#### F-122. Notation examples: the have as echoed, and "reads back as itself"

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Notation and ratio width
- Units: A2 (L52, L53, L111-114), D4 (L107, L109, L192-196, L414)
- Where: `docs/settings.md#(top) > Notation` (page L76, L82)
- Claim or passage: "`m / (3 m) = 1/3`"; "(`(1/3) * 1e30 = 1/3 × 1e+30`, which reads back as itself)" (A2 tags both stale, update)
- Finding: A2: the app writes the have back canonically, `m / 3 m = 1/3` and `1/3 × 1e30 = 1/3 × 1e+30` (reasoned, not run). D4: typed back, `1/3 × 1e+30` is a parse error ("Unexpected ×") while `1/3 * 1e+30` reads back; `×` is not in the grammar and the copy button writes `*` (§12 q11).
- Evidence: V5's harness writes `m / 3 m = 1/3` (V5 L64, context V5 report); D4's harness for the parse error (D4 L107)
- Corrected statement: A2: "`m / 3 m = 1/3`" and "(`1/3 × 1e30 = 1/3 × 1e+30`, which reads back as itself)" (A2 L111-114); D4 keeps "`(1/3) * 1e30 = 1/3 × 1e+30`, a ratio that fits only with its power of ten factored out" and drops the read-back clause (D4 L195-196)
- Conflict: (1) D4 lists `m / (3 m) = 1/3` as confirmed as written (D4 L109, context D4 report) and its replacement keeps both haves as typed (D4 L192, L195), against A2's canonical echo, which V5's run supports. (2) A2's rewrite keeps "which reads back as itself" (A2 L114), which D4's run refutes for the text on screen (D4 L107).
- Proposed call: **doc wrong** on both counts if the runs stand. Settle (1) by running `m / (3 m)` and `(1/3) * 1e30` and reading the echoed have; on (2), §12 q11 has only the copy text read back, so the clause goes or names the copy.
- Related: F-457
- Decision: Stands (doc wrong on both counts if the runs stand): the session of `docs/settings.md` runs `m / (3 m)` and `(1/3) * 1e30`; follows F-457 ("pastes back", of the copy text only).

#### F-123. Gap: ratio width and extended count as entries of their own

- Type: gap (confirmed)
- Target section: Notation and ratio width
- Units: D4 (L116)
- Where: `docs/settings.md#(top) > Notation`, `> Working digits`; plan §6.5
- Gap: Each is a clause inside its parent's bullet; the width's range is not given.
- Sources: `devdocs/notation.md#The rule` ("The width"); `devdocs/numbers.md#The working digits`
- Proposed call: An entry each with key, unit, default and range, the width nested under Notation and the count under Working digits, as D4's replacement text has (D4 L184-191, L223-227).
- Decision: Stands.

#### F-124. Gap: last ratio width and extended count offered again in a session

- Type: gap (new)
- Target section: Working digits
- Units: D4 (L34, L71, L123, L225-227)
- Where: `docs/settings.md#(top) > Notation`, `> Working digits`; plan §3 rows S5, S7
- Gap: Within a session the sheet offers the last width again when `ratio` is chosen and the last extended count when `extended` is checked (`src/settings-panel.ts:446-453`), so the count's default is the display digits only until a count has been seen; the page says only that coming back from decimal mode "finds digits again".
- Sources: `devdocs/settings.md#The model > The mode is a nested choice` (page L186-188; confirmed by V5, context V5 report)
- Proposed call: A clause in each entry ("the display digits by default, or the last count chosen in the session", D4 L226-227; the width, D4 L204-205), or in `docs/app.md`'s account of the sheet.
- Decision: Stands; amended by F-488 ("the panel offers the last width again").

#### F-125. The ceiling is a pass's precision, not "the finest grid"

- Type: contradicts implementation · Flags: **conflict**
- Target section: Precision limit
- Units: A3 (L48, L57, L68, L110-112, L134, L142, L145), V1 (L68, L266)
- Where: `docs/settings.md#(top) > Precision limit` (page L111-112) and `> Significand limit` (page L158, "The finest grid must fit inside it"); `devdocs/settings.md#The model > Precision limit` (page L69-70) and `> The two limits meet in the grid` (page L106); `devdocs/numbers.md#Working precision and the schedule` (page L834-837, the sentences added after `ceilingFor`); `devdocs/numbers.md#Settling` (the working digits, `digitsFor(bitsFor(precision))`); plan §8 (the gloss of "ceiling")
- Claim or passage: docs: "through the finest grid the app rounds onto, four times this plus ten digits (4,040 by default)"; devdocs: "the finest grid the app rounds onto, in either mode", "the finest grid under a precision limit `L` is `4 × (L + 10)` digits"; and the pages use "working digits" for a pass's settle grid, for a pass's precision and for the decimal-mode setting (A3 also tags page L111-113 stale, update)
- Finding: A pass at `p` digits runs the kernel at `bitsFor(p) = ceil(p × log2 10) + 32` bits and settles onto `digitsFor(bitsFor(p))` digits, about ten more than `p`: 28 at the first pass of eight (92 bits), 4,050 at the ceiling pass of 4,040 (13,453 bits); the zero bound `4e-4049` of `(2^(1/2))^2 - 2` is that grid's half unit. The ceiling is a pass's precision, not a grid. The derivation under "The two limits meet in the grid" stays right, since it goes through `bitsFor(4 × (L + 10))`.
- Evidence: `src/core/fixed.ts:104`, `:113-118`; `src/core/context.ts:144-146`; `src/core/rounding.ts:60-65`; `src/core/pipeline.test.ts:310-336` (reasoned from code; the `4e-4049` bound ran)
- Corrected statement: the user docs gloss the ceiling as "the highest precision any pass computes at" and keep "grid" out; the entry reads "and, through the ceiling of its passes, the effort an expression may cost"; devdocs say the ceiling pass's grid is `digitsFor(bitsFor(ceiling))`, about ten digits above the ceiling (A3 L48, L57), and `#Working precision and the schedule` gains A3's sentences on a pass's precision and its grid (A3 L110-112; V1 L266)
- Conflict: (1) "grid" for the ceiling: D4's replacement entry keeps "a ceiling, the finest grid the app rounds onto" (D4 L257-258), following §8's gloss (D4 L394); V5's `#The model` text keeps "the finest grid the app rounds onto in either mode" and "the finest grid under a precision limit `L`" (V5 L157, L161); A1's interim settings text calls the ceiling "the grid" (A1 (F-013), A1 L262-264). (2) The grid's size at eight digits: A1 gives the working grid of a pass as `digitsFor(bitsFor(precision))` digits, "eighteen at eight display digits" (A1 L82-85, A1 report); A3 gives 28 digits at the first pass of eight and 4,050 at the ceiling pass, and keeps "grid" out of the user docs (A3 L57, L68, L134; V1 L266 takes A3's figures); A5 states both figures as different things, 18 "at a precision of eight" and 28 "at the schedule's first pass" (A5 L59).
- Proposed call: **doc wrong** if A3's distinction holds (the code keeps a pass's precision and its settle grid apart on purpose); it turns on plan §8's gloss, which A3 (Q-004) asks the owner to change. Add A3's devdocs sentences once the owner settles what "the grid of a pass at eight display digits" means: A1's 18 is the grid at a precision of eight, A3's 28 the grid of the first pass, which runs at the display digits plus ten (A3 report). The probe's proposal line ("a grid of 4,040 digits") is code (A3 (B-026)).
- Related: Q-004, B-026, F-429, F-431
- Decision: Follows Q-004 (B): doc wrong; the ceiling is "the highest precision any pass computes at", "grid" stays in the docs explained once in `numbers.md` (D4's and D8's drafts keep the word, A3's devdocs sentences on a pass's grid are added); B-026 is the code side (section 9 item 1). Amended on 2026-10-14 (plan §12.3): "finest grid" is allowed in the docs in its precise sense, the grid of the ceiling's pass, the coarseness of the discrete space, and never as a gloss of the ceiling, which is a precision; `docs/numbers.md` uses both, each in its sense.

#### F-126. Precision limit entry misdescribes the panel's line; "derived and shown"

- Type: contradicts implementation · Flags: **conflict**
- Target section: Precision limit
- Units: A3 (L49, L69, L143), D4 (L44, L64, L119, L257-259, L263-264, L405)
- Where: `docs/settings.md#(top) > Precision limit` (page L117-119); `devdocs/settings.md#The model` (page L131-132)
- Claim or passage: "The panel's line says the limit's own top under the significand limit and the finest grid as numbers, never as a formula."; devdocs: "the ceiling is derived and shown, never set and never written as a formula" (A3 and D4 also tag the docs sentence stale, update)
- Finding: `precisionLimitLine` gives the range and what the limit bounds ("From 1 to 2,453 digits, up to the significand limit. The most digits an answer may be asked for; it bounds the effort an expression may cost."), and the module comment leaves "the grid and the ceiling" to the guide; no control's line shows the ceiling, and the one line that writes it is the probe's proposal ("the built-ins on a grid of 4,040 digits").
- Evidence: `src/settings-lines.ts:143-152`, `:243-249`; `src/settings-panel.ts` never names the ceiling
- Corrected statement: A3: delete the sentence (A3 L49); D4: "The ceiling is derived from the limit and never set; the one place it is shown is the probe's proposal, below." (D4 L263-264; new gap D4 L119)
- Conflict: A3 deletes the sentence, D4 says where the ceiling shows. A3 (Q-027) asks V5 to rewrite "derived and shown" as "derived, and written as a number only in the probe's proposal"; V5's `#The model` text keeps "derived and shown" (V5 L157, L165). D4 confirms S17 "derived and shown" with the note that only the proposal shows it (D4 L44, context D4 L44).
- Proposed call: **doc wrong**: the panel leaves the ceiling to the guide on purpose (the module comment). Keeping the formula once in the docs (D4 (Q-005)) and whether the panel should name the ceiling (A3 (Q-027)) are the owner's.
- Related: Q-005, Q-027
- Decision: Stands (doc wrong); follows Q-027 (ok: "derived, and written as a number only in the probe's proposal") and Q-005 (A).

#### F-127. Precision limit's pointer into the dissolved section

- Type: stale (update)
- Target section: Precision limit
- Units: D8 (L39, L273-277)
- Where: `docs/settings.md#(top) > Precision limit` (page L109-110)
- Passage: "the most digits any grid may be asked for ("How a number is held" below says what the grid is), 1,000 by default"
- Tag: update, new
- Rewrite: "(what the grid is, `[Numbers](numbers.md#how-a-value-is-held)` says)"; it is the page's one inbound pointer to the dissolved section (D8 L39, L277).
- Proposed call: Confirm `update`; D4's and A3's full replacements of the entry drop the parenthetical, and A3 keeps "grid" out of the user docs (the finding that carries A3 (F-125)), so the link may have nothing left to gloss.
- Related: F-014
- Decision: Stands (update); follows Q-004 (the link's gloss is "grid", kept in the docs).

#### F-128. The probe does not time "the costliest built-ins"

- Type: contradicts implementation · Flags: **conflict**
- Target section: Probe budget and Measure this device
- Units: D4 (L57, L93, L115, L322-335, L398)
- Where: `docs/settings.md#(top)`, paragraph "The limits are set top-down" (page L175-177); plan §9.4 (which also places the phrase in `> Probe budget`, where it does not occur: D4 (F-512))
- Claim or passage: "times the costliest exact product and the costliest built-ins at rising sizes" (D4 also tags it stale, update, plan row confirmed)
- Finding: For the precision limit the probe times one expression of four elementary functions, the composite `sin(atan(exp(1)) + ln(3) radian)` (`COMPOSITE`); the Gamma and Beta families are deliberately not timed. §12 q23 calls "the costliest built-ins" incorrect.
- Evidence: `src/limits.ts:45-50`, `:94`, `:162-172`; `devdocs/settings.md:468-476` (reasoned from code, not run)
- Corrected statement: "times the costliest exact product and one expression of the four costliest elementary functions, at rising sizes" (D4 L57); step 2 of D4's procedure names `sin`, `atan`, `exp` and `ln`, each once (D4 L327-335)
- Conflict: "the four costliest" is a ranking D5 could not verify, a claim of the kernel benchmark's report (D5 (F-278)); `devdocs/settings.md#The probe` states it ("the four costliest routines of the kernel benchmark's report", page L442-444).
- Proposed call: **doc wrong** (§12 q23; plan §9.4: the composite is the four elementary routines, not the costlier special functions). Settle the ranking against the kernel benchmark's report before the docs repeat it, or name the four functions without ranking them; the panel's "Times the costliest operations" is code (D4 (B-017)).
- Related: Q-006, B-017, F-278, F-491, F-512
- Decision: Stands (doc wrong); follows F-491 (ok: "the four elementary functions", never "costliest"; D4's "the four costliest elementary functions" is not used) and Q-006 (B-017 with the code change).

#### F-129. Gap: "Measure this device" as a procedure

- Type: gap (confirmed)
- Target section: Probe budget and Measure this device
- Units: D4 (L88-97, L115, L316-347)
- Where: `docs/settings.md#(top)` (page L173-182); plan §6.5
- Gap: "Measure this device" is one paragraph; §6.5 asks for a procedure (what it times, what it proposes, Apply) with §9.4's correction.
- Sources: `devdocs/settings.md#The probe`; D4's procedure read from `src/limits.ts:205-281` (confirmed by V5, context V5 report)
- Proposed call: D4's `## Measure this device` (D4 L316-347), once the ranking is settled (the finding that carries D4 (F-128)).
- Decision: Stands; follows F-491.

#### F-130. Gap: "Apply" goes through the same clamp-and-tell as an edit

- Type: gap (new)
- Target section: Probe budget and Measure this device
- Units: D4 (L120, L340-344)
- Where: `docs/settings.md#(top)` (the probe's sentences, page L180-181)
- Gap: A proposal that lowers a setting the user raised is told before it lands; the page says only that nothing changes until "Apply" is pressed.
- Sources: `devdocs/settings.md#The probe` (page L462-466); `src/settings-panel.ts:998-1003`
- Proposed call: Step 4 of D4's procedure (D4 L340-344).
- Decision: Stands.

#### F-131. "For a fraction of a second": a timing in the probe's description

- Type: measurement · Flags: **conflict**
- Target section: Probe budget and Measure this device
- Units: D4 (L131, L374, L410)
- Where: `docs/settings.md#(top)` (page L181-182); `devdocs/settings.md#The probe` (page L478-479)
- Finding: "The probe runs only when pressed, on the main thread, for a fraction of a second": the duration depends on the budget, since each candidate runs four times up to the first candidate over the budget (§12 q9, q25).
- Conflict: D4 rewrites both to "and the page waits while it runs" (D4 L374; D4 (Q-018)); V5's `#The probe` edit keeps "for a fraction of a second" and changes only the #163 link (V5 L203).
- Proposed call: docs/: "the page waits while it runs" (§12 q9, binding); devdocs/: §12 q25 favours D4's rewrite, for the owner to confirm (D4 (Q-018)).
- Related: Q-018
- Decision: Docs: "the page waits while it runs" (§12 q9; Q-016 A). Devdocs: follows Q-018 (B): "for a fraction of a second" stays as a rough duration, worded generously ("well under a second at the default budget").

#### F-132. Gap: the clamp chain and refusals as a short table

- Type: gap (confirmed)
- Target section: How the settings bound each other
- Units: D4 (L73-86, L114, L289-314)
- Where: `docs/settings.md#(top)` (page L164-173); plan §6.5
- Gap: The chain and the refusals are one paragraph.
- Sources: `devdocs/settings.md#The model > The chain`, `#Applying a change`; D4's clamp table, produced by running `rangesOf`, `CLAMP_ORDER` and the lines (D4 L73-86)
- Proposed call: D4's `## How the settings bound each other` (D4 L289-314).
- Decision: Stands.

#### F-133. Gap: unreadable or newer stored settings fall back without notice

- Type: gap (new)
- Target section: Defaults, resets and storage
- Units: D4 (L122, L155-159)
- Where: `docs/settings.md#(top)` (the storage sentence, page L23-27)
- Gap: A stored value a build cannot read falls back to its default without a word, and a stored object from a newer build gives the defaults (`src/settings.ts:322-334`, `:359-387`), so a user who rolls back or edits storage sees the defaults with no notice.
- Sources: `devdocs/settings.md#Storage` (page L301-334); `#Applying a change` (page L401-404: no path yet for a warning a user sees, #167)
- Proposed call: One sentence in the storage paragraph (D4 L155-159); D9's draft of the same paragraph has none (D9 L155-163).
- Related: Q-069
- Decision: Stands; amended by Q-011: the sentence states the fallback as a plain fact; #167 (a place for warnings a user sees) is future work, linked from `devdocs/future.md` only (confirmed on 2026-10-12, plan §12.2, item 7).

#### F-134. docs/settings.md names devdocs pages in inline code, against ownership

- Type: structure · Flags: **conflict**
- Units: D4 (L132), D9 (L40, L60), A2 (L150), A4 (L113, L117), A1 (L266-272, L314-316)
- Where: `docs/settings.md#(top)` page L27 and L32 (first paragraph), L62 (Mode), L91 (Notation), L107 (Working digits), L186 (build number); `docs/settings.md#How a number is held, and what the settings touch` page L271 ("explained in `devdocs/numbers.md` ("Working precision and the schedule")")
- Finding: Seven references run from docs down to devdocs (§9.2), written as inline code rather than links; A1, filing them as markdown and links, counts six backticked page names where the linking principle asks for repo-relative links. D9: the two in the first paragraph and L186 carry nothing a user needs (its stale row tags them drop). A2: the Notation bullet also restates `devdocs/notation.md#The rule`. A4: the Mode and Working digits pointers. D4's replacement text links `numbers.md` in their place; L271 goes with its section (D8 (F-026)).
- Conflict: A1 (L266-272, L314-316) keeps the pointers as links: its interim text makes L271 `[Working precision and the schedule](../devdocs/numbers.md#working-precision-and-the-schedule)`, and it asks D4 and D8 to make the others repo-relative links (A1 Q7); D4 (L132) replaces each with a link to the owning docs page, D9 (L40, L60) drops them, none surviving its text, and D8 drops L271 with the dissolved section (D8 (F-026)).
- Proposed call: two calls for the owner (A1 (Q-082), A2 (Q-082)): drop every docs-to-devdocs pointer and link the owning docs section (`numbers.md`) where a user needs the concept (D4, D9: §9.2 has docs not depend on devdocs, and the pointers carry nothing a user needs), or keep them as repo-relative links (A1: the linking principle; its L271 link targets devdocs). Either way the L271 one goes with the dissolved section, and the Notation entry reduces to the setting and a link once `numbers.md` owns how an exact value is written (A2 (Q-082)), which D4's replacement entry, still restating the rule and its examples, does not yet do.
- Related: Q-082, F-026
- Decision: Stands; follows Q-082 (ok: every docs-to-devdocs pointer goes; the owning docs section is linked instead; the Notation entry reduces to the setting and a link once `numbers.md` owns how an exact value is written).

#### F-135. Gap: one entry per control with key, unit, default and range

- Type: gap (confirmed)
- Units: D4 (L113)
- Where: `docs/settings.md#(top)` (the bullets, page L34-162); plan §6.5
- Gap: Each control's key, default, range, bound and effect in each mode; today the Notation bullet gives the width's default but not its range, the Precision limit bullet no range (its top under the significand limit only in the "top-down" paragraph), the Significand limit bullet no range.
- Sources: `devdocs/settings.md#The model`, `#Applying a change` (`rangesOf`); plan §3, every row confirmed by D4 (context D4 report)
- Proposed call: D4's replacement entries (D4 L173-287).
- Decision: Stands.

#### F-136. Restructure docs/settings.md by the sheet's groups, nested by mode

- Type: structure
- Units: D4 (L58, L139, L141-350)
- Where: `docs/settings.md#(top)` (the page above the dissolved sections)
- Finding: D4 rewrites the page as `## How it is shown` (Display digits; Notation with the ratio width), `## How it is computed` (Mode; Working digits; Rounding), `## How much it may cost` (Precision limit; Significand limit; Probe budget), `## How the settings bound each other` and `## Measure this device`, with no count and `numbers.md` linked rather than restated (§12 q5, q16). Plan §7 lists per-setting sections without the three groups, and D4's links cite §5's proposed `numbers.md` headings ("How an exact value is written" among them), not §7's ("How numbers are written").
- Proposed call: Adopt the grouping (§12 q16: grouped and nested by mode), reconcile the headings with §7's section list, and fix the `numbers.md` anchors when that page lands.
- Decision: Stands: the grouping adopted, the headings reconciled with §7's; amended by F-488 ("How it is shown" and the rest name the panel) and F-451; the anchors into `numbers.md` are those of the page written first (Q-008).

### Findings owned by other pages that touch this one

- F-012 (docs/numbers.md): Dyadic cost: 69,658 bits in the pages, "about 69,659" in the refusal
- F-018 (docs/numbers.md): Gap §6.1: how a value is held, to the depth that predicts refusals
- F-019 (docs/numbers.md): N4: an exact operand meeting an inexact one is rounded
- F-021 (docs/numbers.md): "Certain" becomes "certified" in every page quoting the notes
- F-022 (docs/numbers.md): "Four times the limit plus ten" reads as 4L + 10; limit and ceiling run together
- F-024 (docs/numbers.md): "or that none is certified" names a note that does not exist
- F-025 (docs/numbers.md): The two tail paragraphs move to numbers.md, one sentence in place
- F-027 (docs/numbers.md): Gap §6.1: digits you can trust
- F-032 (docs/numbers.md): Gap §6.1 (partial): values at an edge
- F-036 (docs/numbers.md): Gap §6.1: identities and cancellation, and their cost
- F-037 (docs/numbers.md): N17 and the Mode entry: step lists that miss operators
- F-039 (docs/numbers.md): Gap (hedged): docs/ never says decimal mode runs a single pass
- F-049 (docs/numbers.md): D4's Significand limit entry and D8's drafts split its content differently
- F-053 (docs/numbers.md): The two size limits from the user's side (§6.1), with A5's and D6's facts
- F-059 (docs/numbers.md): D4's example corrections never reached numbers.md (hand-off not taken up)
- F-061 (docs/numbers.md): Ratio rule: the code forms no fraction for dyadic values that fit
- F-063 (docs/numbers.md): What costs time, qualitatively: a §7 section with no §6.1 bullet
- F-064 (docs/numbers.md): The "at most about twice" cost bound fails near the ceiling
- F-076 (docs/expressions.md): Gap: literal limits at parse and at evaluation
- F-172 (docs/app.md): offline.md#Offline behavior splits: the user's side moves to app.md
- F-173 (docs/app.md): "Tapping the build number…" moves to docs/app.md, with two omissions
- F-175 (docs/app.md): What the build ID is has no user-side statement
- F-176 (docs/app.md): The sheet's mechanics leave docs/settings.md for docs/app.md
- F-180 (docs/app.md): docs/app.md does not exist (§9.3); D9 and V8 drafted it independently
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-427 (terminology): "certain" for certified digits
- F-429 (terminology): "ceiling", its gloss "the finest grid", and "grid" in the user docs
- F-431 (terminology): "working digits" in three senses; "the working grid"; "working precision" for the grid
- F-433 (terminology): "step", "operation", "node"; "pass", "settle", "certify", "schedule"
- F-436 (terminology): "neighbor rule" / "neighbour"
- F-438 (terminology): "ball" and "midpoint" in the user docs
- F-443 (terminology): "refused" for a domain error; "error" for a size refusal
- F-444 (terminology): Wording of the significand limit's refusal: reach, fits, exceeds, need, unaffordable
- F-457 (terminology): "parses back", "typed back", "reads back", "pastes back"
- F-488 (terminology): "sheet" and "panel"
- F-490 (terminology): "locked to the display digits" and "not extended"
- F-491 (terminology): "the costliest built-ins" for the probe's composite
- F-492 (terminology): "build number" and "build ID"
- F-493 (terminology): "service worker" and "the worker"
- F-494 (terminology): "a new version", "an update", "a deploy"
- F-495 (terminology): App-surface words: the cog, the checks the app makes on its own, install

## `docs/functions.md`

32 findings (F-137 to F-168). The page is renamed `docs/builtins.md`, titled "Built-in
functions" (Q-020's note, plan §12.1); the findings keep the name the units audited, and every
link they write to the old name targets the new one.

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/functions.md#(top)`: page lead, bullet 5, preamble (page L3, L18-21, L115-128) | D5 (L138-145); D8 (L162-166) | OVERLAP: D5 edit 5 (L144) and D8 (L162-166) rewrite the same pointer (page L126-127) to different targets; D5 edit 2 (L141) keeps the `turn` clause A7 corrects (A7 L74); D5 edit 4 is terminology |
| `docs/functions.md#(top)`: bullets 7, 8, 10 (page L23-37, L43-49) | D6 (L104-132) | OVERLAP: D8 (L315) wants bullet 7 brief and linking `numbers.md#approx`; D6 lengthens it and itself places two of its additions in the concept (L82) |
| `docs/functions.md#(top)` bullet 12 (`gamma`, `lgamma`), the whole bullet | D7 (L133-153) | Contradicts V6 (F-154): the cost sentence keeps an exact/inexact ordering the catalogue does not bear out; it also swaps the page's example `tan(90 deg)` for `beta(0.5, 0.5) - pi()`, which no D7 row records |
| `docs/functions.md#(top)` bullet 13 (`beta`) | D7 (L155-159) | none |
| `docs/functions.md#(top)` bullet 14 (incomplete gamma) | D7 (L161-165) | none |
| `docs/functions.md#(top)` bullet 15 (`erf`, `erfc`) | D7 (L167-171) | none |
| `docs/functions.md#(top)` bullet 16 (incomplete beta) | D7 (L173-181) | CONFLICT inside D7: "whose sum is at most ten thousand" against its own `a + b - 1` (L65, L215) |

### Findings

#### F-137. Gap confirmed: decimal-mode behaviour of each family

- Type: gap (confirmed)
- Target section: Rules every built-in follows
- Units: D5 (L114), D6 (L88), D7 (L119)
- Where: `docs/functions.md#(top)` (bullets 11-16 among them); plan §6.6
- Gap: nothing in docs says what decimal mode does with a call (one step, certified then rounded once; exact cases rounded), bullets 11 to 16 included (D7). Elementary families (D5 harness): `sin(pi() radian) = -4.6410207e-8`, `exp(1) = 2.7182818`, `ln(8)/ln(2) = 2.9999999`, `approx(2.54) = 2.54`, `tan(90 deg) = -13660250`. Exact functions (D6): every argument is exact, so no edge is ever undecided (`floor(sqrt(2)^2)` is `= 2`, `sign(sqrt(2) - sqrt(2))` is `= 0`, `div(1, sqrt(2) - sqrt(2))` a division by zero), the result is rounded once (`factorial(20)`), `approx` is the identity, the size refusals are unchanged (`factorial(20000)`).
- Sources: `devdocs/numbers.md#Decimal mode > A built-in's call`
- Proposed call: one rule in "Rules every built-in follows" and the family preamble, the cases in the generated reference's decimal-mode field (§4.1); D7 proposes no text, the source being outside its unit.
- Related: F-044
- Decision: Stands; the user page is `docs/builtins.md` (Q-020's note), so every link this finding writes to `docs/functions.md` targets `docs/builtins.md`.

#### F-138. Preamble: "every built-in takes plain numbers" omits six built-ins

- Type: contradicts implementation · Flags: **conflict**
- Target section: Rules every built-in follows
- Units: D5 (L39, L104, L115, L142), D6 (L236, L242)
- Where: `docs/functions.md#(top)`, the preamble (page L115)
- Claim or passage: "Every built-in takes plain numbers, apart from the angles above, and `exp(1 m)` is an error that names the dimension." (D5 tagged it stale, update; the rewrite is a factual correction.)
- Finding: `approx`, `abs` and `sign` take any quantity, `div` and `mod` two quantities of one dimension, and `atan2` two of one dimension; the page's own bullets 5, 7, 8 and 9 say so.
- Evidence: `src/core/builtins/abs.ts:49,56`, `approx.ts:39`, `division.ts:157,164`, `inverse-trig.ts:519`; Q5 confirmed by registry and harness (D5 L132, D6 L36, V3 L30).
- Corrected statement: D5 (L39): "Every built-in takes plain numbers, apart from the angles above and the six that take any quantity: `approx`, `abs` and `sign`, `div` and `mod` (two of one dimension), and `atan2` (two of one dimension)." (edit 3, L142, words the same list differently). D6 (L236): "apart from the angles above and the functions of bullets 7 to 9, which take quantities".
- Conflict: the corrections differ. D5 names six, `atan2` included (L39, L142); D6 names five, `approx`, `abs`, `sign`, `div`, `mod` (L236), and its "functions of bullets 7 to 9" also covers `floor`, `ceil`, `trunc` and `round`, which bullet 8 says take plain numbers. Settle the list against `devdocs/builtins.md#Dimension rules`, whose every row D5 (L62) and V3 (L68) confirm.
- Proposed call: **doc wrong**: the dimension rules are deliberate (the table and its "`floor` and its kin" rationale) and the sentence contradicts the page's own bullets; nothing points at the code.
- Related: Q-095, F-515
- Decision: Stands (doc wrong); follows Q-095 and Q-009 (B: D5's six-function list, `atan2` included, now); Q-019 ("plain number" kept as the gloss).

#### F-139. Preamble's forward pointer to a section that dissolves

- Type: stale (update) · Flags: **conflict**
- Target section: Rules every built-in follows
- Units: D5 (L38, L116, L144), D8 (L8, L33, L100, L162-166), A5 (L372-375)
- Where: `docs/functions.md#(top)`, the preamble (page L126-127); `docs/functions.md#Very large results and approx` (page L130-253)
- Passage: "where `exp(1e6)` is `≈ 3.0332154e+434294`; the next section says why `approx` does not change that."
- Tag: update (D5 and D8, both new to the plan); the example holds (D8 rerun); the pointer is the one place in the corpus that depends on the section (A5, D8).
- Rewrite: point into `numbers.md` once the section dissolves (§12 q10): D5 links the page (L38, L144); D8 adds the reason, "since it says how well a value is known and not how large it is", and links `numbers.md#values-too-big-to-hold` (L33, L166).
- Conflict: different destinations: D5 the page `numbers.md`, D8 its section "Values too big to hold".
- Proposed call: Confirm `update`, applied with the dissolution; the link targets the `numbers.md` section that ends up saying `approx` does not relax the exponent bound (D8's draft puts it under "Values too big to hold").
- Related: F-057
- Decision: Stands (update); the link targets `docs/numbers.md#Values too big to hold`; the user page is `docs/builtins.md` (Q-020's note), so every link this finding writes to `docs/functions.md` targets `docs/builtins.md`.

#### F-140. Gap confirmed: `log`'s exact cases and `b` checked first

- Type: gap (confirmed)
- Target section: Exponential and logarithms
- Units: D5 (L71, L110)
- Where: `docs/functions.md#(top)`, bullet 2; plan §6.6
- Gap: the exact cases both ways and `b` checked before `x` (`log(approx(1), 1)` "cannot be told from 1"); bullet 2 has neither.
- Sources: `devdocs/builtins.md#Domains, exact cases and edges` > "`log`'s exact cases" (accurate).
- Proposed call: the generated `log` entry (§4.1).
- Decision: Stands (generated reference).

#### F-141. Gap new: exact cases of `log10`, `log2`, `sqrt` and `cbrt`

- Type: gap (new)
- Target section: Exponential and logarithms
- Units: D5 (L72, L115)
- Where: generated reference (plan §4.1)
- Gap: `log10` and `log2` are exact for an integer power of the base either way (`log10(1000) = 3`, `log2(1/8) = -3`); `sqrt` and `cbrt` share `^`'s exact cases, and `sqrt` of a value straddling zero "cannot be told from zero" while `cbrt` gives a value within an error radius of zero ("Roots and powers").
- Sources: `devdocs/builtins.md#Domains, exact cases and edges` (the `ln` row once corrected), `#The elementary routines` (`sqrt` and `cbrt`).
- Proposed call: per-entry facts for the generated reference, not hand-written text.
- Decision: Stands (generated reference).

#### F-142. Gap confirmed: `pow`'s special bases and log-space route

- Type: gap (confirmed)
- Target section: Roots and powers
- Units: D5 (L109)
- Where: `docs/functions.md#(top)`, bullet 3; plan §6.6
- Gap: `pow(1, y)`, `pow(0, y)`, `pow(-1, y)` by parity, `pow(0, 0)`, the log-space route; bullet 3 has none of it.
- Sources: `devdocs/builtins.md#Domains, exact cases and edges` > "`pow`, and `^` with it", accurate once the `-1` cell is corrected (finding on the `pow` row).
- Proposed call: the generated `pow` entry (§4.1).
- Decision: Stands (generated reference).

#### F-143. Gap new: `pow` of a quantity base points at `^`

- Type: gap (new)
- Target section: Roots and powers
- Units: D5 (L62, L100, L115)
- Where: generated reference (plan §4.1)
- Gap: `pow(2 m, 2)` is refused with `Cannot apply "pow" to "2 m": the base must be a plain number; for a power of a quantity, write "(2 m)^2".`
- Sources: `devdocs/builtins.md#Dimension rules` (introduction), `#Domains, exact cases and edges` > "`pow`, and `^` with it".
- Proposed call: per-entry fact for the generated `pow` entry.
- Decision: Stands (generated reference).

#### F-144. Bullet 5 writes inverse results with "is" where the app shows ≈

- Type: contradicts implementation
- Target section: Inverse trigonometric
- Units: D5 (L102, L141)
- Where: `docs/functions.md#(top)`, bullet 5 (page L18-21)
- Claim or passage: "`asin(0.5)` into `deg` is `30` and `atan2(3 m, 4 m)` into `deg` is `36.869898`"
- Finding: both lines are `≈` (`asin(0.5) ≈ 30 deg`, `atan2(3 m, 4 m) ≈ 36.869898 deg`): `pi()` is inexact on both sides of the conversion and no identity certifies through it (N7); the preamble itself keeps `=` for exact cases.
- Evidence: D5 harness (L102); `pi.ts:10-13`; N7 confirmed (D5 L122, `turn ≈ 360 deg`); A7's probe agrees (`asin(0.5) ≈ 30 deg` in exact mode, `= 30 deg` in decimal mode, A7 L74).
- Corrected statement: D5 edit 2 (L141): "which return an angle, so `asin(0.5)` into `deg` is `≈ 30` and `atan2(3 m, 4 m)` into `deg` is `≈ 36.869898`, `≈` because the angle units are defined through `pi()`; `asin(0.5)` into `turn`, or `asin(0.5) / radian`, is the number." Its last clause is what A7 corrects (finding on `asin(0.5)` into `turn`).
- Proposed call: **doc wrong**: the angle units are inexact through `pi()` by design (N7; `deg` is `pi() radian / 180` in the file), and the bullet drops the `≈` its own page requires.
- Related: F-067
- Decision: Stands (doc wrong); follows Q-009 (B: the `≈` corrected now) and F-067 (the `turn` clause corrected: an angle still).

#### F-145. Gap confirmed: `atan2`'s quadrants, a zero `y`, the origin

- Type: gap (confirmed)
- Target section: Inverse trigonometric
- Units: D5 (L111)
- Where: `docs/functions.md#(top)`, bullet 5; plan §6.6
- Gap: the quadrant rules, `y` exactly zero and the origin; bullet 5 has only its two examples.
- Sources: `devdocs/builtins.md#Domains, exact cases and edges`, `#Huge and tiny arguments`, accurate once the `atan2` edges cell is completed (finding on that cell).
- Proposed call: the generated `atan2` entry (§4.1).
- Decision: Stands (generated reference).

#### F-146. Gap confirmed in part: the inverses at their ends; the long-significand refusal

- Type: gap (confirmed)
- Target section: Inverse trigonometric
- Units: D5 (L112)
- Where: `docs/functions.md#(top)`, the preamble and bullets 5-6; plan §6.6
- Gap: the preamble does have `tan(90 deg)` at a pole; the ends of `asin`, `acos`, `acosh`, `atanh` and the refusal of `asin(0.1 + 1e-15000)` (#63) are absent.
- Sources: `devdocs/builtins.md#Domains, exact cases and edges`, `#Huge and tiny arguments`.
- Proposed call: the generated entries (§4.1).
- Decision: Stands (generated reference); #63 stays a bug linked from `devdocs/builtins.md#Huge and tiny arguments` (Q-011, Q-012); the docs name the refusal without a link.

#### F-147. Gap new: `sinh` and `cosh` of a large negative argument; `tanh` never refused

- Type: gap (new)
- Target section: Hyperbolic
- Units: D5 (L57, L115)
- Where: generated reference (plan §4.1)
- Gap: `sinh(-1e30)` and `cosh(-1e30)` are too large, not too small (`classifyHyperbolic` checks the top edge alone, `ball.ts:1714-1725`); `tanh` is never refused (`tanh(1e999999999) ≈ 1`).
- Sources: `devdocs/builtins.md#The rules every built-in follows` (the exponent-bound bullet).
- Proposed call: per-entry facts for the generated reference.
- Decision: Stands (generated reference).

#### F-148. Bullets 7, 8, 10 and the `approx` entry: what they keep and link

- Type: structure · Flags: **conflict**
- Target section: approx
- Units: D8 (L170, L224-231, L315), D6 (L82, L102, L110-124)
- Where: `docs/functions.md#(top)`, bullets 7, 8 and 10 (page L23-37, L43-49); `docs/numbers.md` "approx" (the concept's target); plan §4.1, §4.4, §6.8
- Finding: with `approx` as a concept owned by `numbers.md#approx` (§12 q10, q14), where D8 drafts it, bullet 7 is the built-in's reference entry, mechanical and brief, linking there: D8 asked D6 to reduce it to the signature and one sentence (D8 Q9). D6 finds every new fact of its family entry-level, for the generated reference (§4.1) rather than hand-written entries (§4.4), and asks bullets 7, 8 and 10 to link the foundation pages once they exist (§6.8): bullet 7 to `numbers.md`'s `approx` section, bullet 8's plain-number rule to `quantities.md`, bullet 10's "known exactly" to `numbers.md`'s exact and inexact values. Yet D6, running alongside, extends bullet 7 ("dimension" for "units", "angles included", "in exact mode", "leaves a zero as it is", and the decimal-mode identity, `approx(x)` is `x`, as an addition), and its bullet 8 gains two additions (`round(2.5)` under the default; `sign` of a value that cannot be told from zero).
- Conflict: D8 (L224-231, L315) keeps bullet 7 brief and mechanical, the concept in `numbers.md` "approx"; D6 (L110-116) lengthens it, and itself says the zero pass-through and the decimal-mode identity "belong to the concept, not to the entry" (L82) while adding both to the entry.
- Proposed call: §12 q14 (binding) keeps the entry mechanical: bullet 7 keeps the signature, one sentence and the link; D6's `approx` corrections and additions go to `numbers.md#approx`, reconciled with D8's draft; the owner rules on D6's other "(addition)" clauses (D6 Q5).
- Related: Q-009, F-046
- Decision: Stands; follows Q-009 (B: bullet 7 keeps the signature, one sentence and the link to `numbers.md#approx`; D6's corrections go to `numbers.md#approx`; the "(addition)" clauses wait) and Q-035/Q-104 (nothing of the binary form on the user page); the user page is `docs/builtins.md` (Q-020's note), so every link this finding writes to `docs/functions.md` targets `docs/builtins.md`.

#### F-149. Gap confirmed: `round(x, places)`

- Type: gap (confirmed)
- Target section: Magnitude, sign and rounding
- Units: D6 (L85)
- Where: `docs/functions.md#(top)`, bullet 8; plan §6.6
- Gap: `places` an exact integer held to the limit, with the count limit D6 adds (gap on the count limit).
- Sources: `devdocs/builtins.md#The exact functions` (`round`).
- Proposed call: the generated `round` entry (§4.1).
- Decision: Stands (generated reference).

#### F-150. Gap confirmed: `div` and `mod`'s sign convention and edges

- Type: gap (confirmed)
- Target section: Division
- Units: D6 (L86)
- Where: `docs/functions.md#(top)`, bullet 9; plan §6.6
- Gap: the sign convention and the `overflow`/`tooLarge` edges (D6's rule 4, its N22 row and C2).
- Sources: `devdocs/builtins.md#The exact functions` (`div` and `mod`, "On balls").
- Proposed call: the generated `div` and `mod` entries (§4.1).
- Decision: Stands (generated reference).

#### F-151. Bullet 10: `factorial(approx(5))` is an error in exact mode only

- Type: contradicts implementation
- Target section: Integer functions
- Units: D6 (L32, L69, L88, L97, L106-132)
- Where: `docs/functions.md#(top)`, bullet 10 (page L43-49)
- Claim or passage: "`factorial(approx(5))` is refused, since a value known to a precision is not known to be `5`"
- Finding: in decimal mode `approx` is the identity and `factorial(approx(5))` is `= 120`; in exact mode it is a `domain` error (`notExact`), not a size refusal. (D6's I7 also flags "units" for a quantity's dimension in bullets 7 and 8: terminology, D6 (F-464).)
- Evidence: `src/core/builtins/approx.ts:41` (`decimal: "identity"`); `src/core/evaluate.ts:838-850`; harness; N17 confirmed (D6 L32).
- Corrected statement: D6 (L126-132): "`gcd(a, b)` and `lcm(a, b)`, never negative, and `factorial(n)`, `binomial(n, k)` and `doublefactorial(n)`, all of whole numbers known exactly: `factorial(approx(5))` is an error in exact mode, since an inexact value is not known to be `5` (in decimal mode `approx` is the identity and it is `120`) (addition). The last three are refused past the significand limit before anything is computed: …" (full text: D6 L126-132).
- Proposed call: **doc wrong**: the module declares the decimal-mode identity and N17 states it; the bullet's wording ("refused" for a `domain` error, "known to a precision" for inexact) is §8's to fix.
- Related: Q-009, F-443, F-451
- Decision: Stands (doc wrong); follows Q-009 (B: corrected now) and Q-096; amended by F-442 ("is an error in exact mode", never "refused") and F-451 ("an inexact value is not known to be `5`").

#### F-152. Gap confirmed: `gcd(0, 0)`, `lcm(a, 0)`, `binomial` outside `0..n`, `doublefactorial(-1)`

- Type: gap (confirmed)
- Target section: Integer functions
- Units: D6 (L87)
- Where: `docs/functions.md#(top)`, bullet 10; plan §6.6
- Gap: absent from the docs; `gcd(a, 0)` is wrong in the code (finding on `gcd(a, 0)`), so the generated entry must state the intent, not today's output.
- Sources: `devdocs/builtins.md#The exact functions` (`gcd` and `lcm`, the factorials).
- Proposed call: the generated entries (§4.1), after the code fix.
- Related: B-001
- Decision: Stands; follows Q-050 (ok: B-001 before the built-ins pages); the generated entry states the intent.

#### F-153. Bullet 12 misstates when the Bernoulli ratios are computed (§9.4 row)

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Gamma family
- Units: D7 (L33, L83, L146-153), D5 (L19, L33)
- Where: `docs/functions.md#(top)` bullet 12, the gamma bullet (page L64-66); plan §9.4 row
- Claim or passage: the ratios of consecutive Bernoulli numbers are "computed once per page load for each precision asked for beyond the last and kept" (stale rows tagged update: D7 confirms the plan §9.4 row; D5 keeps the plan's tag without re-verifying the bullet, which it leaves to D7)
- Finding: one memo holds one run, built on first use and rebuilt, replacing what it held, when a call needs more ratios or more bits than it holds (at the larger count and the bits asked plus the margin; a request beyond the run grows it by a quarter); a page that never evaluates the family computes none. Read from the code, not run.
- Evidence: `src/core/bernoulli-ratios.ts:143-147` (one run held), `:162-173`, `:174-181`; the devdocs' Bernoulli paragraph states the same one-run rule (page L646-650; D7 C24 confirmed)
- Corrected statement: "the ratios are held in one memo, built on first use and rebuilt, replacing what it held, when a call needs more of them or more bits than it holds; a page that never evaluates the family never computes one" (D7 L33); in the bullet, "computed on first use for the precision in force and kept until a call needs more", the one-run rule staying in devdocs and the docs keeping a qualitative cost sentence (D7 L83)
- Conflict: (1) who pays the run: D7 words the correction for "the family" and confirms cost.md's "a warm run costs about a cold one except in the Gamma family" (C47, L74); V6 (F-356) (V6 L27, L41, L63-64) finds in the stress catalogue the same cold surcharge on the regularized incomplete gamma and the incomplete beta calls. (2) D5's report counts 8 "update" rows in its Summary (L19) and lists 9 in its table (L32-42); the extra is this row.
- Proposed call: design changed without the docs following: plan §9.4 tags the sentence stale (update, confirmed), and the devdocs, the record of intent, state the one-run rule the code implements; nothing points to code wrong. D7's rewrite governs. Before rewording, settle which calls pay the run (V6's catalogue; D7's own C34 has the regularized forms take `ln Γ` through `logGamma`).
- Related: Q-093
- Decision: Stands (design changed); follows Q-093 (ok) and Q-009 (B: D7's rewrite now, the cost sentence qualitative: Q-016 A); the session checks which calls pay the run (F-356).

#### F-154. Gamma-family cost figures given three times (plan §9.1)

- Type: measurement · Flags: **conflict**
- Target section: Gamma family
- Units: D7 (L34, L52, L57, L87, L93, L95, L151-153, L190-191, L196-197), V3 (L49-50, L523-573), V6 (L116, L227)
- Where: `docs/functions.md#(top)` bullet 12, the gamma bullet (page L64-71); `devdocs/builtins.md#The Gamma and Beta families` (Bernoulli paragraph, page L651-653; `lgamma` and `gamma`, page L730-734); `devdocs/cost.md#What the costs come from`
- Finding: one cost carries three sets of numbers (plan §9.1): the bullet's "about half a second the first time and a tenth of a second a call after that … and a few seconds then half a second" (`gamma(pi())`); the devdocs' Bernoulli run, "half a second once for an exact shift and about two for an inexact argument's", and "`gamma` or `lgamma` about 0.12 s and `digamma` 0.14 s … and 0.45 s and 1.2 s …; at a thousand digits a call is tens of milliseconds and at forty the series is microseconds"; cost.md's "0.6 to 2 s a call". None was re-measured (D7 C7, C25, C30), and the stress catalogue no longer bears the bullet's timings out even in order: exact and inexact Gamma cancellations overlap, from a fifth of a second to two seconds a call (V6). All leave under §12 q9 (docs: qualitative statements only) and q25 (devdocs): D7 and V3 rewrite the devdocs sentences qualitatively, V3 sending the reader to cost.md and the stress tools; D7 rewrites the bullet's cost sentence and drops its "kernel" (§8).
- Conflict: (1) the ordering that replaces the figures: D7 (L87, L95) and V3 (L50) have an inexact argument cost more than an exact one of short denominator ("several times", "a fraction of that"), while V6 L116 and V6 (F-354) (V6 L62, L116, L154, L227) find the catalogue's exact and inexact Gamma cases overlapping (inexact 0.21 to 2.05 s, exact 0.32 to 1.71 s; "about half" in the median only). (2) why an inexact argument's run is longer: D7 (L93) because its shift "stops at a smaller argument" and its series is longer; V3 (L49, L546-548) because of "an inexact argument's longer shift", against the page's exact shift "four times as far" (page L668, L698), which V3 itself confirms (L72, `fixed-gamma.ts:6-8,34-47`).
- Proposed call: Confirm: the timings leave all three places (q9, q25) and live in cost.md's tables and the stress tools; the bullet keeps one qualitative sentence (V6 Q5), as D7's rewrite does; before the qualitative sentences land, check the exact/inexact ordering against the catalogue or a per-call benchmark, and the shift's direction against `fixed-gamma.ts:6-8,34-47`.
- Related: Q-088, F-354, F-510
- Decision: Stands for the user bullet (qualitative only, Q-016 A); for the devdocs halves follows Q-088 (devdocs follow Q-016: the ordering and ratios the catalogue bears out stay, a rough timing may stay marked illustrative, never a figure the catalogue contradicts); the exact/inexact ordering is checked before it lands.

#### F-155. Beta bullet: `gamma(1e6)` does fit

- Type: contradicts implementation
- Target section: Gamma family
- Units: D7 (L37, L88, L129, L155-159)
- Where: `docs/functions.md#(top)` bullet 13 (page L77-79)
- Claim or passage: "Large arguments go through `lgamma`, so `beta(1e6, 1e6)` is `≈ 3.6164047e-602063` where no `gamma` of them would fit".
- Finding: the `beta` value is right, but `gamma(1e6)` is a value, `≈ 8.2639317e+5565702` (the kernel's value within the bound); `gamma(1e17)` is the one refused. Stale row tagged update (new).
- Evidence: `src/core/builtins/beta.ts:19-25`, `:133-162`; `src/core/builtins/gamma.ts:326-333`, `:344-359`; harness
- Corrected statement: "large arguments go through `lgamma`, so `beta(1e17, 1.5)` is `≈ 2.8024956e-26` where `gamma(1e17)` is refused as too large to compute, and `beta(1e6, 1e6)` is `≈ 3.6164047e-602063`" (both by the harness; D7 L37).
- Proposed call: doc wrong: the log-space route and the exponent bound are deliberate (`gamma.ts:344-359`) and the clause overstates what `lgamma` buys; nothing points to code wrong.
- Decision: Stands (doc wrong); follows Q-009 (B: corrected now).

#### F-156. Gap confirmed: `gamma`'s sign on the negative side

- Type: gap (confirmed)
- Target section: Gamma family
- Units: D7 (L113)
- Where: `docs/functions.md#(top)` bullet 12; plan §6.6
- Gap: the bullet gives only a positive example (`gamma(-1.5)`); nothing says `gamma(-2.5)` is `≈ -0.94530872` and `gamma(-3.5)` `≈ 0.27008821`, the sign being the parity of the floor (`gamma.ts:40-41`, `:434`; harness).
- Sources: `devdocs/builtins.md#The Gamma and Beta families` (`lgamma` and `gamma`: the sign from the reflection, the parity of the floor)
- Proposed call: the generated reference's result field (§4.1); no interim edit (§4.4).
- Decision: Stands (generated reference).

#### F-157. Gap new: the size refusals beyond `erfc`'s

- Type: gap (new)
- Target section: Gamma family
- Units: D7 (L125)
- Where: `docs/functions.md#(top)` bullets 12-14
- Gap: `gamma` too large near `6 × 10^16` (the bullet gives only `1e19`), `gamma` of a large negative non-integer too small, `beta(1e20000, 2)` past the significand limit, `beta(1e19, 1e19)` too small, `lowergamma(1e400, 2)` too large and `uppergamma(2, 1e400)` too small (harness; C27, C31, C33).
- Sources: `devdocs/builtins.md#The Gamma and Beta families` (`lgamma` and `gamma`; `beta`; the incomplete gamma functions)
- Proposed call: the generated reference's refusals field (§4.1); no hand-written edit (§4.4).
- Decision: Stands (generated reference).

#### F-158. Gaps refuted: §6.6 family items the page already carries

- Type: gap (refuted)
- Target section: Gamma family
- Units: D7 (L110-112, L114-115, L117)
- Where: `docs/functions.md#(top)` bullets 11-15 (page L52-56, L75-77, L89-91, L100-102); `devdocs/builtins.md#The Gamma and Beta families` (page L674-678); plan §6.6
- Gap: §6.6 lists as missing the `digamma` reflection and poles, `lgamma` as `ln |Γ|`, `beta` at a pole of the sum, the incomplete functions' exact cases and the `erfc` thresholds; all but the reflection are on the page (page L52-54, L55-56, L75-77, L89-91, L100-102; the thresholds confirmed, C18), and the reflection is mechanism, owned by `devdocs/builtins.md:674-678`, which no §4.1 field asks for.
- Sources: —
- Proposed call: strike these items from the §6.6 list; nothing to write.
- Decision: Stands: the items struck from §6.6 (plan amended).

#### F-159. Incomplete functions' large-parameter refusal: wording and precision

- Type: contradicts implementation · Flags: **low confidence**
- Target section: Incomplete gamma
- Units: D7 (L42, L49, L89, L92, L116, L161-165, L179-181, L251), V3 (L28, L72, L592-620)
- Where: `docs/functions.md#(top)` bullet 14 (page L93-94), bullet 16 (page L112-113); `devdocs/builtins.md#The Gamma and Beta families` (incomplete gamma, page L806-811); plan §6.6 (the `tooLarge` regime)
- Claim or passage: "A large order within a few percent of a large argument, past some millions, is not computed and says so" (bullet 14); "Large parameters within a few percent of the median, past some millions, are not computed and say so" (bullet 16).
- Finding: the call is refused as `tooLarge("exceeds", UNKNOWN_NEED)`, worded as past the significand limit where the limit is one of cost, and the term and convergent counts grow with the working bits, so the threshold moves with the precision: `incbetareg(1e6, 1e6, 0.5)` is `≈ 0.5` at eight digits, where the devdocs place its refusal at a thousand digits. For bullet 14 that dependence is read from `incomplete.ts:334-372`, the harness having refused `uppergammareg(1e6, 1.5e6)` and `lowergammareg(1e8, 1e8)` at the default settings. D7 also counts this as §6.6's `tooLarge` gap, confirmed in part (L116). The devdocs already say "the refusal's message speaks of the significand limit where the limit is one of cost", which V3 keeps.
- Evidence: `src/core/builtins/incomplete.ts:114-121`, `:243-246`, `:334-372`; `src/core/builtins/incbeta.ts:107-108`, `:220-221`, `:297-323`; `src/messages.ts:357-360`; harness
- Corrected statement: bullet 14: "A large order within a few percent of a large argument, past some millions at a high precision, is refused as past the significand limit, the limit there being one of cost rather than of size." Bullet 16: "Large parameters within a few percent of the median, past some millions at a high precision, are refused as past the significand limit, the limit there being one of cost rather than of size." (D7 L165, L181)
- Proposed call: doc wrong: the refusal is deliberate ("a refusal that is never wrong about the value", page L808) and the bullets omit its wording and its dependence on the precision; check "at a high precision" for bullet 14 against the default-settings refusals before it lands (whether the docs name the precision at all is D7 (Q-067)). The message's own wording (cost against size; the stray comma in "would need a significand, past the significand limit") is bugs.md's.
- Related: Q-067, B-015, B-020, F-444
- Decision: Stands (doc wrong); follows Q-067 (ok: "at a high precision") and Q-009; amended by F-442 and F-444 ("refused as past the significand limit" is a size refusal: the right word); the session checks "at a high precision" for bullet 14; B-015 and B-020 are the code side. Amended by the owner on 2026-10-24 (plan §12.3, the review of the built-ins page): the corrected statements' quantities ("within a few percent", "past some millions", "at a high precision" as a threshold) do not land, since each holds in one regime and fails in another: `uppergammareg(1e5, 1.5e5)` is refused at the default digits and at one digit alike, `lowergammareg(1e6, 1e6)` is a value at eight digits and at three hundred, and `incbetareg(1e6, 1e6, 0.5)` is a value at eight digits and at two hundred and refused at five hundred. The page states the dependence on the order, the argument and the precision loosely, in words, with verified examples on either side, and the devdocs keep the counts (Q-067 as amended). Amended again by the owner on 2026-10-25 (plan §12.3): the refusal is a significand-limit refusal, the message correct as it stands, since the limit caps the working precision at any point of a computation; the docs drop "the limit there being one of cost rather than of size" and say at most that the limit covers the working precision.

#### F-160. Not verified: the incomplete functions' truncation bounds (bullets 14, 16)

- Type: not verified · Flags: **low confidence**
- Target section: Incomplete gamma
- Units: D7 (L41, L48), V3 (L72, L764)
- Where: `docs/functions.md#(top)` bullet 14 (page L91-92), bullet 16 (page L110-112)
- Finding: "Every result is certified: the series and the continued fraction both carry their truncation bounds" (bullet 14) and "the series carries its truncation bound" (bullet 16): D7 confirms only that the fraction's bound is written and the call refused rather than given an unbounded radius (`incomplete.ts:38-43`), and the orientation (C21); V3 confirms the bracket check every eighth convergent (`fixed-incomplete.ts:64-66,243`, by header) and leaves the series' tail and the convergent counts unverified; neither read the incomplete beta's tail bound.
- Why unverified: the bounds live in `src/core/fixed-incomplete.ts` and `src/core/fixed-incbeta.ts`, outside D7's modules and read by V3 by header only.
- Proposed call: keep both sentences (§4.4 corrects only what is wrong); verify the bounds when the structured comments are written (§4.1).
- Decision: Stands (keep; verify with the structured comments).

#### F-161. Gap new: the incomplete functions' "cannot be told from" edges

- Type: gap (new) · Flags: **low confidence**
- Target section: Incomplete gamma
- Units: D7 (L127)
- Where: `docs/functions.md#(top)` bullets 14 and 16
- Gap: an order or argument straddling zero, a parameter straddling zero, an argument straddling an end of `[0, 1]` (`incomplete.ts:183-184`, `:194-195`; `incbeta.ts:182-183`, `:200-202`; read, not run); the bullets name such edges only for `digamma`.
- Sources: `devdocs/builtins.md#The Gamma and Beta families` (the incomplete gamma functions; the incomplete beta function)
- Proposed call: the generated reference's edges field (§4.1); no hand-written edit (§4.4).
- Decision: Stands (generated reference).

#### F-162. Erf bullet: `1 - erf(10)` does reach the digits

- Type: contradicts implementation
- Target section: Error functions
- Units: D7 (L44, L90, L129, L167-171)
- Where: `docs/functions.md#(top)` bullet 15 (page L98-99)
- Claim or passage: "`erfc(10)` is `≈ 2.0884876e-45`, its digits kept where `1 - erf(10)` would be `0`".
- Finding: the retry loop raises the precision until `1 - erf(10)` settles; the harness gives it as `≈ 2.0884876e-45` too, after more passes. Stale row tagged update (new).
- Evidence: `src/core/pipeline.ts:425-440` (`resolve` retries until settled); `src/core/context.ts:210-225` (the schedule); harness
- Corrected statement: "`erfc(10)` is `≈ 2.0884876e-45` at the first pass, where `1 - erf(10)` reaches the same digits only after the retry loop has raised the precision enough to certify them." (D7 L44)
- Proposed call: doc wrong: the retry loop that raises the precision until a result certifies is the design, so the clause is false; its point, `erfc` keeping the digits at once, stands.
- Decision: Stands (doc wrong); follows Q-009 (B).

#### F-163. Gap new: `erf` and `erfc` have no domain error

- Type: gap (new) · Flags: **low confidence**
- Target section: Error functions
- Units: D7 (L121, L123)
- Where: `docs/functions.md#(top)` bullet 15
- Gap: both are defined on every real, `erfc` of a negative argument through `2 - erfc(-x)` (`erf.ts:26-27`, `:128-138`; read, not run); the bullet states no domain.
- Sources: `devdocs/builtins.md#The Gamma and Beta families` (`erf` and `erfc`: `erf` odd)
- Proposed call: the generated reference's domain field (§4.1); no hand-written edit (§4.4).
- Decision: Stands (generated reference).

#### F-164. `incbetareg`'s exact case: the ten-thousand cap, worded off by one

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Incomplete beta
- Units: D7 (L47, L65, L91, L118, L175-177, L215)
- Where: `docs/functions.md#(top)` bullet 16 (page L106-108); plan §6.6 (`incbetareg`'s polynomial case)
- Claim or passage: "`incbetareg(2, 3, 0.5)` is the exact `0.6875`, as it is for any whole numbers at a fraction whose powers fit the significand limit".
- Finding: the polynomial is also capped (`POLYNOMIAL_LIMIT = 10_000`): `incbetareg(6000, 6000, 1/2)` is inexact although `2^11999` fits the limit, and `incbetareg(5001, 5000, 1/2)` is exact. D7 refutes the §6.6 gap as absent but finds the bullet incomplete (L118); the devdocs state the cap as "`a + b - 1` is at most ten thousand" (page L870). Stale row tagged update (new).
- Evidence: `src/core/builtins/incbeta.ts:110-111`, `:447-452`; harness
- Corrected statement: "as it is for any whole numbers whose sum is at most ten thousand, at a fraction whose powers fit the significand limit" (D7 L47, L91, L177).
- Conflict: inside D7: its corrected wording caps the sum (L47, L91, L177), while its C38 (L65), its gap row (L118, "the ten-thousand cap on `a + b - 1`") and its devdocs edit 10 (L215) cap `a + b - 1`, and its harness's exact `incbetareg(5001, 5000, 1/2)` (a sum of 10,001) fits only the latter (D7 report).
- Proposed call: doc wrong: the cap is deliberate and the devdocs state it; settle from `incbeta.ts:447-452` which quantity it bounds before the bullet is corrected.
- Decision: Stands (doc wrong); follows Q-009 (B); the session settles the cap from `incbeta.ts:447-452`. Settled on 2026-10-24: the cap bounds `a + b - 1`, at most ten thousand (`POLYNOMIAL_LIMIT` in `incbeta.ts`; `incbetareg(5001, 5000, 1/2)` is exact and `incbetareg(5002, 5000, 1/2)` inexact), and the page states it as it is, as the degree of the polynomial. Whether to refine the cap, or make it a setting, is issue #236 (filed 2026-10-24), future work for `devdocs/future.md` (work order 18), the owner wanting the implications understood before any code change (plan §12.3).

#### F-165. Gap new: the incomplete beta function's end points

- Type: gap (new)
- Target section: Incomplete beta
- Units: D7 (L126)
- Where: `docs/functions.md#(top)` bullet 16
- Gap: `x = 0` is `0`, and `x = 1` is `1` regularized and `beta(a, b)` otherwise (`incbeta.ts:186-193`; harness); bullet 16 states neither. The devdocs' statement of them is wrong at `x = 1` (separate finding).
- Sources: `devdocs/builtins.md#The Gamma and Beta families` (the incomplete beta function, once corrected)
- Proposed call: the generated reference's exact-cases field (§4.1); no hand-written edit (§4.4).
- Decision: Stands (generated reference).

#### F-166. Gap confirmed: tiny and huge arguments where visible, every family

- Type: gap (confirmed)
- Units: D5 (L113), D7 (L124)
- Where: `docs/functions.md#(top)` (D7's cases fall in bullets 11 and 15); plan §6.6
- Gap: nothing in docs. Elementary families (D5, confirmed): `sin(1e-999999999 radian)`, `atan` beyond `2^bits`, `tanh`'s saturation, `ln(1e999999999)`, `log10(1e999999999)`; every example of the source holds, with the display note on `log10(1e999999999)` (finding on that example). `digamma`, `erf` and `erfc` (D7, filed as new): `digamma(1e-999999999)` is `≈ -1e+999999999`, `digamma(1e30)` `≈ 69.077553`, `erf(1e-999999999)` `≈ 1.1283792e-999999999`, `erf(1e400)` `≈ 1`, `erfc(-1e400)` `≈ 2`, `erfc(1e400)` too small to compute (harness; `gamma.ts:17-27`, `erf.ts:13-20`).
- Sources: `devdocs/builtins.md#Huge and tiny arguments`; `devdocs/builtins.md#The Gamma and Beta families` (`digamma`; `erf` and `erfc`)
- Proposed call: the generated reference's huge-and-tiny field of each entry (§4.1); no hand-written edit (§4.4).
- Decision: Stands (generated reference).

#### F-167. Page lead says "the file" without naming it

- Type: stale (update)
- Units: D5 (L32, L138)
- Where: `docs/functions.md#(top)` (page L3); plan §9.4 row
- Passage: "Beside the functions the file defines, the app has built-in functions"
- Tag: update; plan row confirmed (§9.4; nothing on the page names the file).
- Rewrite: "the definitions file", with a link to `definitions.md` (D5 L32; edit 1, L138).
- Proposed call: Confirm `update`.
- Related: F-478
- Decision: Stands (update); follows F-475 ("the definitions file") and F-478.

#### F-168. Preamble lacks §4.4's sentence on the generated reference

- Type: other
- Units: D5 (L105, L145)
- Where: `docs/functions.md#(top)`, after the preamble (page L128); plan §4.4
- Finding: §4.4 asks the interim page to say, in one sentence, that each function's entry (signature, domain, exact cases, edges) will be generated from the structured comment beside its implementation, so the page lists the functions and their shared rules only; the page has no such sentence.
- Proposed call: add the sentence after "No prefix applies to a function" (D5 edit 6, L145).
- Decision: Follows Q-011: the sentence is not added, since the generated reference is work that may come and `devdocs/future.md` alone records it (F-345); the page's prose list stands as the reference until the generator exists, and says nothing of it.

### Findings owned by other pages that touch this one

- F-020 (docs/numbers.md): Gap §6.1 (partial): which operations stay exact
- F-032 (docs/numbers.md): Gap §6.1 (partial): values at an edge
- F-046 (docs/numbers.md): `approx` as a concept (§6.1), with A5's, A2's and D6's facts
- F-048 (docs/numbers.md): Gap confirmed (§6.1): rounding modes, and `round(2.5)` under the default
- F-067 (docs/quantities.md): `asin(0.5)` into `turn` is an angle, not the plain number (Q8)
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-427 (terminology): "certain" for certified digits
- F-437 (terminology): "absorbed into the radius"
- F-438 (terminology): "ball" and "midpoint" in the user docs
- F-440 (terminology): "decimal exponent" beside "the exponent"
- F-443 (terminology): "refused" for a domain error; "error" for a size refusal
- F-444 (terminology): Wording of the significand limit's refusal: reach, fits, exceeds, need, unaffordable
- F-445 (terminology): "log space" and its examples
- F-448 (terminology): "kernel", "series", "continued fraction", "truncation bound" in docs/functions.md
- F-450 (terminology): "recognizes as exact" for an exact case
- F-451 (terminology): "approximate", "known to a precision" for inexact
- F-452 (terminology): "whole number" and "integer"
- F-464 (terminology): "units" for a quantity's dimension
- F-465 (terminology): "base unit"

## `docs/app.md`

12 findings (F-169 to F-180).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `docs/settings.md#(top)` "Tapping the build number…" (deleted; to Updates and the build number) | D4 (L350), D9 (L155-163), V8 (L168-170) | OVERLAP: three units propose the same deletion; D9 and V8 each draft the receiving `docs/app.md` section |
| `docs/app.md` (new page) | D9 (L165-265), V8 (L130-166) | OVERLAP: two independent drafts; section names differ (Offline use / Working offline; Updates and the build ID / Updates and the build); V8 covers three sections and sends the fields to other pages; "while it stays in view" (D9) vs "while it stays open" (V8); D9 omits the bare "update"; "bypassed" / "worker …" quoted differently; V8 links down to devdocs against §9.2 (D9 (F-134)) |

### Findings

#### F-169. The loading and failure messages are stated nowhere

- Type: gap (new) · Flags: **low confidence**
- Target section: Offline use
- Units: D9 (L69, L269-271)
- Where: `devdocs/architecture.md#The shell and its parts` (page L909-913); `docs/app.md` (proposed page)
- Gap: no page says what the app shows while the definitions load ("Loading units…") or when they fail ("The unit definitions could not be loaded (…). Check your connection and try again." or "… This is a bug in the app, not in what you typed.", with a Retry button), nor that the retry is the user's and never automatic; the shell section says only that the shell "says so".
- Sources: `src/app-shell.ts:168-185`, `255-272` (D9's reading); `devdocs/architecture.md#The shell and its parts`
- Proposed call: `app.md` "Offline use" states them (D9's new page, D9 L165-265), and the shell sentence gains the Retry button, why the user decides when, and a link there (D9 L267-275); low confidence: reasoned from code, not run.
- Related: B-023, F-170, F-180, F-251
- Decision: Stands; low confidence: the session reads `src/app-shell.ts`; follows Q-057 and Q-007; amended by F-493 (the service worker named as such where offline use is explained).

#### F-170. The load-failure message shows the internal kind "(fetchFailed)"

- Type: other · Flags: **low confidence**
- Target section: Offline use
- Units: D9 (L69, L317)
- Where: `docs/app.md` (new); `devdocs/architecture.md#The shell and its parts` (page L909-911, "the shell says so"); `src/app-shell.ts:264`
- Finding: "The unit definitions could not be loaded (fetchFailed)." shows an internal kind name, where §12 q6 keeps internal kind names out of the docs (reasoned from code, not run). No page states the loading and failure messages ("Loading units…"; "… Check your connection and try again." or "… This is a bug in the app, not in what you typed.", with a Retry button; the app never retries on its own, `src/app-shell.ts:168-185, 255-272`: D9 (F-169)).
- Proposed call: app.md describes the failure and the Retry button without quoting the parenthesis (D9 L196-197); whether the app keeps the kind in its text for bug reports or moves it to the console is a code decision (D9 (Q-057); the code side is D9 (B-023)).
- Related: Q-057, B-023, F-169
- Decision: Stands; follows Q-057 (ok: the app keeps it; the page does not quote the parenthesis).

#### F-171. The privacy fact has no user-side statement

- Type: gap (new)
- Target section: Offline use
- Units: V8 (L113, L115, L145, L291-295, L314)
- Where: `devdocs/security.md#The page` (page L98-102); `docs/app.md` (new)
- Gap: The page "calls no third-party service and sends nothing anywhere" (V8 confirmed S13: `src/system-table.ts:27,55`, `src/sw.ts:85-89,128`, greps of `src/` for network calls), a fact a user cares about that no docs/ page states; `security.md` otherwise stays whole, each rule naming where it is enforced.
- Sources: `devdocs/security.md#The page`; V8's sentence for app.md (L145) and the link from `security.md#The page` to it (L295).
- Proposed call: One sentence in app.md "Offline use" if the owner agrees (V8 (Q-028); D9's draft lacks it), linked from `security.md#The page` (devdocs to docs); V8's draft also links app.md down to `security.md`, against §9.2 (docs must not depend on devdocs).
- Related: Q-028
- Decision: Stands; follows Q-028 (ok) as the review settled it (plan §12.3, R-1 and R-2): the sentence in `app.md#Offline use`, led by "Nothing you type leaves the device" (the app calls no third-party service, contacts only the host it was loaded from, and only for its own static files, to load them and to check for and fetch a new version, and sends that host no local data), links `devdocs/security.md#The page`, which may link back.

#### F-172. offline.md#Offline behavior splits: the user's side moves to app.md

- Type: structure
- Target section: Offline use
- Units: V8 (L109, L249-261), D9 (L58, L97, L289-295)
- Where: `devdocs/offline.md#Offline behavior` (page L5-75); `docs/app.md` (new); `docs/settings.md#(top)` (lines 184-190, the §9.1 duplicate)
- Finding: The section mixes what a user sees (the app works offline once loaded; a new version downloads in the background and is offered; the running version stays until the user switches; the footer's words; the tap on the build) with mechanism (precaching, the manifest and its checks, the browser's update lifecycle, the check schedule and its reasons, the status as the registration reports it, the install manifest). Both units move the user's side to `docs/app.md` and keep the mechanism (§12 q24): V8 opens the section with a sentence and a link (L253), D9 puts the link inside the two bullets it rewrites (L293, L295).
- Proposed call: Split as both propose, one link at the section's opening per §12 q24; reconcile the two drafts of the bullets (Proposed text).
- Related: F-173
- Decision: Stands; amended by F-493 ("service worker" named in `app.md`), F-494 ("a new version", "update"), Q-022 ("build ID"); the devdocs split lands in `offline.md`'s one-pass rewrite after `app.md` (Q-008).

#### F-173. "Tapping the build number…" moves to docs/app.md, with two omissions

- Type: structure
- Target section: Updates and the build number
- Units: D9 (L41, L55, L58, L77, L161-163), V8 (L115, L151, L168-170), D4 (L43, L117, L350)
- Where: `docs/settings.md#(top)` (page L184-190); `devdocs/offline.md#Offline behavior` (page L40-70)
- Finding: The update check is the footer's, not a setting (`src/app-footer.ts:142-146`), and `docs/app.md` owns it (§6.5, C57; §12 q22); D9 tags the paragraph stale, update. It holds as far as it goes (context D9 report) but omits that the build is plain text also when the service worker failed to register (`src/app-footer.ts:159-166`) and that following the "update to …" link reloads every open page of the app (`src/service-worker-updates.ts:5-16`, `:187-195`); the build is a build ID, a commit hash, not a number (`src/build-id.ts:1-14`). It duplicates `devdocs/offline.md:40-70` (§9.1), which keeps the mechanism (§12 q24).
- Proposed call: Delete from `docs/settings.md`; `docs/app.md` restates it with both corrections (D9's and V8's drafts).
- Related: Q-022, B-053, F-174, F-175, F-180, F-492
- Decision: Stands; follows Q-022 (A: "build ID"; the section "Updates and the build ID") and F-494.

#### F-174. The footer's rarer words are documented nowhere; offline.md lists a subset

- Type: contradicts implementation · Flags: **conflict**
- Target section: Updates and the build number
- Units: D9 (L44, L65, L81, L295, L321), V8 (L55, L109, L115, L151-163, L259-261)
- Where: `devdocs/offline.md#Offline behavior > The worker's status` (page L52-70); `docs/app.md` (new)
- Claim or passage: the footer shows the worker's status "in a word or two": "caching…" on the first visit, "downloading…" while an update downloads, "bypassed" with a reload link, nothing while ready; "update to …" while a worker waits; "worker …" with a reload link (D9 tags the passage stale, update).
- Finding: The footer also says "no offline" (`unsupported`: no service workers), "worker failed" (`failed`: the registration failed), "updating…" (`applying`: while the update is applied) and a bare "update" until the waiting worker has named its build; the build ID is a button only when there is a worker to check, and is disabled while a check, the registration or the switch is under way.
- Evidence: `src/app-footer.ts:183-222`, `:191-194, 214-216, 219-220` (both units); `src/app-footer.ts:123-140, 163-166` (D9)
- Corrected statement: V8: "the words are listed once, in `docs/app.md`, and the page says they are `src/app-footer.ts`'s" (V8 L55; the bullet names the `WorkerStatus` values, L261); D9: the bullet maps each `WorkerStatus` (`development`, `unsupported`, `registering`, `failed`, `installing`, `bypassed`, `ready`, `downloading`, `waiting`, `applying`) to its word or link (full text: D9 L295), and `app.md` quotes every word (D9 L199-226).
- Conflict: where the words live: D9 (Q7, L321) has `app.md` quote every word verbatim and the devdocs bullet keep the mapping from status to word, words included; V8 (L55, L109, L261) lists the words once, in `docs/app.md`, and has `offline.md` name the statuses and defer the words to `src/app-footer.ts`.
- Proposed call: **doc wrong** (the page lists a subset of deliberate states that both units read from `src/app-footer.ts`); settle the destination by §12 q24 (a devdocs section keeps the mechanism and links the docs owner), which decides whether the mapping repeats the words.
- Related: F-173
- Decision: Stands (doc wrong); follows Q-007 (ok: `app.md` quotes every footer word verbatim) and §12 q24 (the devdocs bullet keeps the mapping from status to word); F-494 for "update".

#### F-175. What the build ID is has no user-side statement

- Type: gap (new)
- Target section: Updates and the build number
- Units: D9 (L66), V8 (L110, L263-271)
- Where: `devdocs/offline.md#Build ID` (page L79-84); `docs/settings.md#(top)` ("build number", L184, L189); `docs/app.md` (new)
- Gap: The footer shows "Build" and the first twelve characters of the commit the copy was built from, the full hash as the hover title, "-dirty" kept for a build from uncommitted changes (`src/build-id.ts:1-17`, `src/app-footer.ts:124`); the docs call it a "build number" and never say what it is.
- Sources: the user-facing part of `devdocs/offline.md#Build ID` (the footer names the build; twelve digits; the tooltip; `-dirty`), which then opens with a link to `docs/app.md` and keeps the derivation (`vite-plugin-build-id.ts`, git alone, `unknown`, why every commit is a new build) as mechanism and intent (V8 L263-271).
- Proposed call: State it in app.md (D9 L201-205; V8 L155); the term, build ID or the build, is the terminology draft's (V8 (Q-022)).
- Related: Q-022, F-173, F-492
- Decision: Stands; follows Q-022 (A).

#### F-176. The sheet's mechanics leave docs/settings.md for docs/app.md

- Type: structure
- Target section: The settings sheet
- Units: D9 (L39, L55, L59, L76, L155-163), D4 (L117, L350), V5 (L37-38, L100, L207-219)
- Where: `docs/settings.md#(top)` (first paragraph, page L3-23); `devdocs/settings.md#The sheet`, `#The controls`
- Finding: The first paragraph restates the sheet down to the handle, the keyboard's Done key and the steppers (`src/settings-panel.ts:56-101`; the mechanics hold, context D9 report); §7's settings page keeps only where the settings are and how a change applies (§6.5, §12 q3). §9.1's duplication with `devdocs/settings.md#The sheet` resolves the same way: those sections stay as design and open with a link to `docs/app.md` (V5). D9 did not read `devdocs/settings.md#The sheet` (D9 L59, hedged); V5 did. D4's opening still keeps the reset links on the settings page (D4 L162-167), which D9's `docs/app.md` draft also carries (D9 L228-243).
- Proposed call: One sentence in `docs/settings.md` (where the settings are; a change applies as it is made) with a link to `docs/app.md#The settings sheet`, which takes the mechanics (D9's draft); `devdocs/settings.md#The sheet` opens with that link (V5 L209); the owner picks one page for the reset links.
- Related: F-180, F-488
- Decision: Stands: one sentence in `docs/settings.md` with a link to `docs/app.md#The settings panel` (F-488), which takes the mechanics; the session of `app.md` keeps the reset links in one place; `devdocs/settings.md#The panel` opens with the link in its own rewrite (Q-008).

#### F-177. The sheet's "About these settings" link: undocumented, and an absolute URL

- Type: gap (new)
- Target section: The settings sheet
- Units: D9 (L70, L321), V8 (L88, L295, L317)
- Where: `docs/app.md` (new); `devdocs/security.md#The page` (page L98-102); `src/settings-panel.ts:520-525`; `src/settings-lines.ts:114-117` (`ABOUT`)
- Gap: At the sheet's foot, beside "Reset all settings", "About these settings" opens the settings reference; no page states it. Its target is an absolute URL into the repository, the one absolute URL in `src/` (`src/settings-lines.ts:116`): a link a user may follow, not a call, so `security.md#The page`'s "calls no third-party service" holds but leaves it unsaid.
- Sources: D9's draft "The settings sheet" (L239-243); V8's added sentence for `security.md#The page` on the one absolute URL, a link with nothing fetched from it (L295).
- Proposed call: State the link in app.md and add V8's sentence to `security.md#The page`; once the pages ship with the app (§12 q31) the link becomes local and the sentence goes (D9 (Q-007), V8 (Q-115)).
- Related: Q-007, Q-115, B-069, F-342
- Decision: Stands; follows Q-115 (ok) and Q-007; amended by F-488 ("the panel's foot").

#### F-178. The copy button's feedback is undocumented

- Type: gap (new) · Flags: **low confidence**
- Target section: Copying a result
- Units: D9 (L67)
- Where: `docs/app.md` (new); `docs/README.md#(top)` (the copy sentence)
- Gap: The two-sheets icon becomes a check mark for a moment once the text is on the clipboard, or a cross in the error colour when the clipboard refused it, and a live region says "Copied" or "Couldn't copy" for a screen reader (`src/copy-button.ts:5-15, 105-118, 142-145`; reasoned from code, not run).
- Sources: D9's draft section (L245-254), which names the check mark and the cross but not the screen reader's words; the copy path in `devdocs/architecture.md#The converter and its lines`.
- Proposed call: State it in app.md "Copying a result", with the paste-back principle linked to `numbers.md` (§12 q11); V8 left this section to others (V8 L132).
- Decision: Stands; follows F-457 ("pastes back"); low confidence: the session reads `src/copy-button.ts`.

#### F-179. The empty state and the fields' app-specific behaviour are undocumented

- Type: gap (new)
- Target section: The two fields
- Units: D9 (L68, L315)
- Where: `docs/app.md` (new); `src/unit-converter.ts:254-258` (the hint), `:207-249`
- Gap: With the have field blank the output area shows a hint, "Type a quantity, such as `3 ft`, and the unit to convert it to, such as `in` or `ft;in`" (a blank have gives the `empty` outcome whatever the want); the fields switch off autocomplete, autocorrect, autocapitalization and spell-checking and stay out of the form history; an error marks the field at fault (`aria-invalid` and the error border), except a mismatch between have and want, which marks neither (harness: `1 m` into `s`).
- Sources: D9's draft section (L256-264); `devdocs/architecture.md#The converter and its lines`.
- Proposed call: State it in app.md without quoting the hint, whose wording frames conversion first against §12 q2: D9 (Q-056) proposes "Type an expression, such as `sqrt(2)` or `3 ft`, and, to convert it, the unit you want, such as `in` or `ft;in`." (a code change, D9 (B-022)).
- Related: Q-056, B-022
- Decision: Stands; follows Q-056 (ok: B-022 in the code phase; the page describes the hint without quoting it).

#### F-180. docs/app.md does not exist (§9.3); D9 and V8 drafted it independently

- Type: gap (confirmed) · Flags: **conflict**
- Units: D9 (L61, L97, L165-265), V8 (L6, L115, L120-170, L322)
- Where: `docs/app.md` (new); plan §7, §7.1 ("The app's surface"), §9.3 (installation, offline, updates without an owner), §12 q3 and q22; `docs/README.md#(top)` (page L12-14); `docs/settings.md#(top)` (page L184-190); `devdocs/offline.md` (page L5-75)
- Gap: Installing, offline use, updates and the build have no docs/ owner; the facts are spread over the index, the settings page and `devdocs/offline.md`. D9 decides the scope (§12 q3): installing, offline use, updates and the build ID, the sheet's mechanics, copying a result, and the fields' app-specific behaviour (the switched-off assistants, the marking of the field at fault), what to type staying with the foundation pages; the index carries one line (§12 q22), `docs/settings.md#(top)` and getting started link to it, and the §7.1 row "`app.md` or `getting-started.md`" resolves to `app.md`.
- Sources: `devdocs/offline.md` (`#Offline behavior`, `#Build ID`); `docs/settings.md#(top)` (first paragraph; "Tapping the build number…"); `docs/README.md#(top)`; `devdocs/security.md#The page`; §12 q3, q22
- Conflict: D9 drafts the whole page (Installing; Offline use; Updates and the build ID; The settings sheet; Copying a result; The two fields); V8, with no D9 report (V8 L6, L322), drafts three sections (Installing; Working offline; Updates and the build) and leaves the sheet and copying to others. They differ on: (1) the section names both units' devdocs edits link to ("Offline use", "Updates and the build ID" in D9 (F-251, F-403); "Working offline", "Updates and the build" in V8 (F-172, F-175, F-171); §7 says "updates and the build number"); (2) scope: D9 L97 gives the page the fields' app-specific behaviour, V8's opening (L137) sends "what the two fields do" to the other pages; (3) the periodic check runs "while it stays in view" (D9 L208; V8's own O4, L54) vs "while it stays open" (V8 L149); (4) the footer's words: D9's draft omits the bare "update" that D9 (F-174) and V8 (L158) list, and writes "bypassed" and "worker …" with a "reload" link where V8 quotes "bypassed · reload" and "worker … · reload"; (5) V8's page links down to `devdocs/offline.md` and `devdocs/security.md` (L145, L165), which D9 drops from docs/ under §9.2 (D9 (F-134)). V8 alone adds the privacy sentence (V8 (Q-028)) and that the app "still works online" after "worker failed".
- Proposed call: `docs/app.md` owns these facts, with one line in the index, getting started ending with a link to it. Write the page to §7's six sections from D9's draft (the decision on `app.md` is D9's output, §10; V8 offered its sections to D9, V8 L132), folding in V8's word-by-word list and, if V8 (Q-028) is accepted, the privacy sentence; settle (1) with the build-ID term (V8 (Q-022)), (3) against `src/register-service-worker.ts`, (4) against `src/app-footer.ts:183-222` (D9 (Q-007) wants every word verbatim), (5) against §9.2.
- Related: F-173
- Decision: Stands: `docs/app.md` from D9's draft with V8's word list and the privacy sentence (Q-028); follows Q-022 ("Updates and the build ID"), F-488 ("The settings panel"), F-493, F-494, Q-057, Q-007; (3) settled against `src/register-service-worker.ts` (F-403); (5) the privacy sentence links `devdocs/security.md#The page`, as V8 has it (plan §12.3, R-1), and nothing else on the page links down: V8's link to `devdocs/offline.md` is not taken; the page is written after `settings.md` (Q-008).

### Findings owned by other pages that touch this one

- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-492 (terminology): "build number" and "build ID"

## `devdocs/README.md`

2 findings (F-181 to F-182).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/README.md` (complete page) | V8 (L172-203) | Draft contradicts V4 (F-478) / V4 (Q-020): keeps "user-defined functions" for `functions.md` (L186) |

### Findings

#### F-181. Developer index becomes the §7.1 map and links the style guide

- Type: structure · Flags: **conflict**
- Target section: (top)
- Units: V8 (L107, L172-203)
- Where: `devdocs/README.md#(top)`, `#The design`, `#The code`; `devdocs/README.md:23` (the `functions.md` line)
- Finding: The framing states the ownership split (docs/ states the rules; devdocs/ keeps the mechanism, the decision with its reason, the ruled-out alternatives) and links `docs/README.md` and the style guide, which states the principle (§12 q29: drafted, V8 L179, L197); the list keeps its two groups and gains the docs/ counterpart where one exists today (`docs/settings.md`, `docs/definitions.md`, `docs/functions.md`), the rest added as their pages land; the security line gains "and the page".
- Conflict: V4 (V4 (F-478, Q-020): V4 L547, L559) asks V8 to reword `devdocs/README.md:23`, "user-defined functions in the definitions file", since the five functions are the system file's (§12 q12); V8's replacement keeps the wording (V8 L186).
- Proposed call: Replace the page as drafted, with the `functions.md` line in whatever term the terminology draft settles for defined functions.
- Related: Q-020, F-478
- Decision: Stands; follows Q-020 (ok: the `functions.md` line says "Defined functions"; the built-ins' counterpart is `docs/builtins.md`), Q-029 (the style guide holds the three principles) and F-488; the page is written last among the devdocs (Q-008).

#### F-182. Developer index's security line omits "The page"

- Type: contradicts implementation
- Target section: The code
- Units: V8 (L29, L107, L200)
- Where: `devdocs/README.md#The code` (page L48-49)
- Claim or passage: `security.md` covers "the supply chain, the toolchain, secrets, and the rules for code that runs commands"
- Finding: The page has a fourth section, "The page".
- Evidence: `devdocs/security.md:96`
- Corrected statement: "the supply chain, the toolchain, secrets, the rules for code that runs commands, and the page"
- Proposed call: **doc wrong**: the index under-lists the page's sections; applied in V8's replacement (L200).
- Decision: Stands (doc wrong).

### Findings owned by other pages that touch this one

- F-402 (devdocs/development.md): Style guide gains the documentation principle (§12 q29)
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-478 (terminology): "user-defined functions" for the functions the file defines

## `devdocs/numbers.md`

39 findings (F-183 to F-221).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/numbers.md#(top)` | V1 (L186, L188), A1 (L309-313, text inside Q6) | OVERLAP: A1 and V1 word the GNU-free `pi` rationale slightly differently; V1's first sentence links a page not yet written |
| `devdocs/numbers.md#The types` | A1 (L61), V1 (L192, L194) | OVERLAP: same text for the two-exponent paragraph |
| `devdocs/numbers.md#Exact operations` | A1 (L166-196), A6 (L292-307), V1 (L198-204) | OVERLAP: A1 (L183-187) and A6 (L300-306) drafted different texts for the zero-containment sentence, V1 adopts A6's; A1's other two pairs match V1's |
| `devdocs/numbers.md#Sums and alignment` | A1 (L198-209), V1 (L208) | OVERLAP: same text |
| `devdocs/numbers.md#Comparison` | A6 (L309-341), V1 (L212-214) | OVERLAP: same text; its "a unit list's counts treat a touch as a straddle" contradicts A6 L457-459 and A8 (F-072) |
| `devdocs/numbers.md#The kernel's boundary` | V1 (L218, L220) | — |
| `devdocs/numbers.md#Memoized constants` | A3 (L94-98), V1 (L224-226) | OVERLAP: V1 extends A3's text with the unconfirmed `beta` request and rewrites the Bernoulli sentence |
| `devdocs/numbers.md#Roots and powers` | V1 (L230-238) | — |
| `devdocs/numbers.md#Which limit a refusal names` | A5 (L413-429), V1 (L240-242) | OVERLAP: the same text (V1 restates A5) |
| `devdocs/numbers.md#Why the exponent bound stays at 10^18` | V1 (L62, L244-248), D8 (L287-289, no text) | D8 asks V1 to settle the 32,768-bit scenario (page L690-691) and the radius diagram; V1's text leaves both |
| `devdocs/numbers.md#Certification and the display rule` | A2 (L37, L39-41, L75-81), V1 (L250-258) | OVERLAP: A2 and V1 give the same texts, the same four pairs (V1 restates A2) |
| `devdocs/numbers.md#Working precision and the schedule` | A3 (L100-120), A9 (L257-273), V1 (L262-270) | OVERLAP: A3, A9 and V1 drop the same clause (same text); A9's "a build per pass" (L267-273) against A3 L74, not taken by V1; A3's added grid sentence (L112, V1 L266) against A1 L82-85 |
| `devdocs/numbers.md#Settling` | A1 (L62-63, stale-table rewrites), A3 (L122-130), V1 (L274-276) | OVERLAP: A1 and A3 wrote different rewrites of both passages; V1 adopts A3's |
| `devdocs/numbers.md#Exact mode` | A1 (L211-221), V1 (L280-282) | OVERLAP: same text for the sources pair |
| `devdocs/numbers.md#Decimal mode` | A4 (L93-102), V1 (L284-300) | OVERLAP: V1 restates A4's eight pairs; pair 7 differs (A4 keeps "n of m digits are certain" until the code change, V1 writes "certified"); pair 3 spells "behaviour" (A4) and "behavior" (V1) |
| `devdocs/numbers.md#The working digits` | A4 (L104-107), V1 (L302-306), D4 (L387-389) | OVERLAP: A4 and V1 give the same second-bullet rewrite; all three the same #172 link |
| `devdocs/numbers.md#The significand limit` | A5 (L388-411), V1 (L308-316) | OVERLAP: V1 restates A5's two pairs and adds A5's keep-as-intent text (A5 L66) and A1's recount, fourth to third (disputed, A5 L335); A5's pointer reads "Which limit a refusal names" below, V1's above (the section is above) |
| `devdocs/numbers.md#approx` | D6 (L200-212), V1 (L318-324) | CONFLICT: #98, V1 keeps it inline (L322), D6 drops it for a pointer to the exact functions (L210); both inline #100 and #171; D6's rewrite of "never the reverse" (L200-206) meets A5's "accurate" (L360) |
| `devdocs/numbers.md#Formatting` | A2 (L42, L82-85), V1 (L326-328) | OVERLAP: the same text |
| `devdocs/numbers.md` (the foot) | V1 (L332) | — |
| every section but `#(top)` (openers, not written out) | V1 (L336) | — |

### Findings

#### F-183. `#(top)`: GNU units named in the `pi()` rationale

- Type: other · Flags: **conflict**
- Target section: (top)
- Units: A1 (L309-313), V1 (L110, L188)
- Where: `devdocs/numbers.md#(top)`
- Finding: "where GNU units defines `pi` as a decimal literal, exact to its digits and wrong past them" names GNU units in a numeric rationale; both units keep the rationale and drop the name (A1 L312-313; V1 L188).
- Conflict: the ground differs: A1 says §12 q2 bars GNU units from the numeric semantics of docs/ and does not cover devdocs (L309-313); V1 cites "§12, question 2; C60" in its edit (L188) and "question 7" in its table (L110).
- Proposed call: drop the name and keep the rationale; the owner says whether q2's rule extends to devdocs.
- Decision: Stands; follows Q-039 (ok: the rationale without the name).

#### F-184. `#The types > Scaled`: the two-exponent history becomes ruled-out alternatives

- Type: stale (keep as intent)
- Target section: The types
- Units: A1 (L61, L304-308), V1 (L34, L194)
- Where: `devdocs/numbers.md#The types > Scaled` (page L73-87)
- Passage: "A first design carried a binary exponent beside the decimal one, … the division alone measured, when the base was chosen, at 0.2 ms against 0.04 ms at the default ceiling …"
- Tag: keep as intent (plan row confirmed by A1 and V1; one decimal exponent, `src/core/scaled.ts:126`, `25-58`; the settle is a division, `638-656`)
- Rewrite: two exponents ruled out (the mixed base leaks into every operation: a log-space rebase, an undecidable comparison, the `log2 10` constant, display folding), a single binary exponent too; the one base costs a division per settle, small against a whole settle; timings dropped (A1 L61, V1 L194, same text).
- Proposed call: Confirm `keep as intent`; the timing leaves (q25).
- Related: F-220
- Decision: Stands (keep as intent); follows Q-016 (devdocs: the division's cost may stay as a rough, illustrative figure or as the ratio, the session's choice).

#### F-185. `#The types > Scaled`: "`10^300000` take a minute"

- Type: measurement
- Target section: The types
- Units: V1 (L44, L192), A1 (L304-308)
- Where: `devdocs/numbers.md#The types > Scaled` (page L45-46)
- Finding: "since one division per factor made normalizing `10^300000` take a minute" is a timing (§12 q25); the mechanism is `fivesIn` (`src/core/scaled.ts:1058-1083`). V1: "since one division per factor is a quadratic loop on a significand full of tens" (L192), the qualitative reason A1 also proposes (L304-308).
- Proposed call: apply V1's text (tag `update`).
- Related: B-034
- Decision: Stands (update to V1's qualitative reason); follows Q-016 (a rough timing may stay marked illustrative if it adds weight; the mechanism is the point).

#### F-186. `#Exact operations`: an inexact base's integer power takes the product rule

- Type: contradicts implementation
- Target section: Exact operations
- Units: A1 (L54, L65, L170-176), V1 (L45, L198)
- Where: `devdocs/numbers.md#Exact operations` (page L176-177)
- Claim or passage: "a power's the derivative bound"
- Finding: `powBallCore` raises an inexact base to an integer power by squaring with the product rule, settled after each product; the derivative bound is the kernel's, for the roots and the log-space powers. Found beyond the plan's rows.
- Evidence: `src/core/ball.ts:947-965`
- Corrected statement: "…, and an integer power of an inexact base takes the product rule by squaring, settled after each product ("Settling" below)." (A1 L65, L173-176; V1 L198)
- Proposed call: doc wrong: the squaring path is deliberate, and `#Settling` already says "`powBall` on an inexact base squares with settling" (tag `update`).
- Decision: Stands (doc wrong).

#### F-187. `#Exact operations`: when a divisor counts as containing zero

- Type: contradicts implementation
- Target section: Exact operations
- Units: A1 (L66, L178-187), A6 (L89, L292-307, L456-457), V1 (L46, L200)
- Where: `devdocs/numbers.md#Exact operations` (page L203-206)
- Claim or passage: "A ball within an ulp of zero at the kernel's bits is treated as containing zero, since the kernel cannot tell it apart;"
- Finding: the division reads no kernel bits: `containsZero` and `magnitudeBelow` compare the midpoint with the radius exactly where the radius can be formed (`FORMABLE_RADIUS_BITS`) and by the coarse bounds otherwise, a midpoint the bounds cannot tell from the radius counting as within it, so the answer is `unresolved` rather than a quotient of the wrong sign. Found beyond the plan's rows by A1 and A6.
- Evidence: `src/core/ball.ts:296`, `334-339`, `351-353`, `446-467`, `828`, `864`; the module header, `100-105`.
- Corrected statement: decided as every comparison of a midpoint with a radius is ("Comparison"), with the reason, `unresolved` rather than a wrong-sign quotient; the unbounded-radius clause kept (A6 L300-306, adopted by V1 L200; A1's text, L183-187, omits the reason).
- Proposed call: doc wrong: the header states the current rule and `#Comparison` describes it (tag `update`).
- Decision: Stands (doc wrong; A6's text with the reason).

#### F-188. `#Exact operations`: the gcd timing

- Type: measurement · Flags: **conflict**
- Target section: Exact operations
- Units: V1 (L47, L202), A1 (L61, L304-308)
- Where: `devdocs/numbers.md#Exact operations` (page L220-221)
- Finding: "about forty times cheaper than Euclid's at 65,536 bits (19 ms against 686 ms)" is a timing (§12 q25); the gcd is exported for its benchmark (`src/core/rational.ts:507-523`).
- Conflict: A1 keeps the ratio as the qualitative reason, "about forty times cheaper" (L304-308); V1 drops it: "far cheaper than Euclid's at the default limit; the benchmark holds the figures" (L202).
- Proposed call: drop the milliseconds (tag `update`); the owner says whether a measured ratio counts as a timing under q25.
- Decision: Follows Q-016 and Q-088: the measured ratio stays ("about forty times cheaper", A1's reading); the milliseconds may stay only as a rough, illustrative figure, else the benchmark holds them.

#### F-189. `#Exact operations` was not re-read line by line

- Type: other
- Target section: Exact operations
- Units: A1 (L334-337)
- Where: `devdocs/numbers.md#Exact operations`
- Finding: A1 found two sentences the code has outgrown beyond the plan's rows (the power's radius, the zero containment) and asked V1 to read the section against `ball.ts` line by line; V1 did not re-read sections an A unit covered (V1 L7, L93), so the section's other sentences are checked only as far as A1 and A6 read it.
- Proposed call: read the remaining sentences against `ball.ts` when the section is rewritten.
- Decision: Stands: read when the section is rewritten.

#### F-190. Products and quotients take the context too, in three passages

- Type: contradicts implementation · Flags: **conflict**
- Target section: Sums and alignment
- Units: A1 (L67, L198-209), V1 (L49, L208), A7 (L92, L140-145, L164-202, L319-331), V2 (L55, L58, L74, L78, L89, L93, L146-148, L208-210, L308), D1 (L121, L646-668)
- Where: `devdocs/numbers.md#Sums and alignment` (page L261-263); `devdocs/architecture.md#Quantities, dimensions and kinds` (the `src/core/quantity.ts` paragraph, page L146-149); `devdocs/architecture.md#Evaluation` (page L595-600)
- Claim or passage: `numbers.md`: "Products and quotients add and subtract exponents and return a `Result` for the exponent bound; sums take the context, for its precision, its mode and its significand limit." `architecture.md#Quantities, dimensions and kinds`: "and the power is the one of the three that takes a `NumberContext`: for the significand limit of an exact power, the settling of an inexact base, and the root, or the log-space route, of a non-integer exponent". `architecture.md#Evaluation`: "The context goes to every power and every built-in, the operations that can lose digits, and to every sum, which aligns within its significand limit, and every literal's significand is checked against that limit; everything else is exact, and every result is settled".
- Finding: products and quotients take the context too. On balls, `multiplyBalls` and `divideBalls` take it, for the limit their prediction needs and for `onGrid`; on `Scaled` the sum, the product and the quotient all take the significand limit (A1, V1; found beyond the plan's rows). `multiplyQuantities` and `divideQuantities` pass it to the ball operations, which form an exact product or quotient within the context's significand limit, their exact midpoints held to it, and settle an inexact operand; the evaluator only asserts afterwards (A7, V2). Every node is a step at the context, and `evaluate` also takes a collector of the conditions the calls assume (D1, V2). The `src/core/quantity.ts:17-20` header says the evaluator refuses an exact result past the limit, "not here", the older placement (code side in bugs.md).
- Evidence: `src/core/ball.ts:631-680`, `644-648`, `666-668`, `808-849`, `821-831`; `src/core/scaled.ts:351-571`; `src/core/quantity.ts:171-200`, `214-218`; `src/core/evaluate.ts:400-406`, `409-421`, `520-533`, `574-596`, `658-663` (`stepQuantity` at every node), `720-788`
- Corrected statement: `numbers.md#Sums and alignment` (A1 L67, L204-209; V1 L208): on `Scaled` each operation takes the significand limit and returns a `Result` for it and the exponent bound; on balls each takes the context, a sum for its precision, mode and limit, a product and a quotient for the limit their prediction needs and the grid an operand is put on. `architecture.md#Quantities, dimensions and kinds`: A7 "and each of the three takes a `NumberContext`: the product and the quotient for the significand limit within which an exact result is formed, as `ball.ts` rules, and the power for that limit, for the settling of an inexact base, and for the root, or the log-space route, of a non-integer exponent."; V2 "and each of the three takes a `NumberContext`: the product and the quotient for the significand limit their exact midpoints are held to and the working grid an inexact operand is settled onto, and the power for those and for the root, or the log-space route, of a non-integer exponent." `architecture.md#Evaluation`: D1 "Every node is a step at the context; the arithmetic takes the context at every sum, which aligns within its significand limit, at every product, quotient and power, whose exact results are held to that limit and to the exponent bound, and at every built-in; every literal's significand is checked against the limit. Exact values are never rounded."; V2 (L208-210, summarized): the context goes to every operation, products and quotients included, their exact midpoints held to the limit; every result is settled; a collector, when the caller gives one, gathers the conditions the calls assume.
- Conflict: (1) the grid: V2 (L55, L146-148) adds the working grid an inexact operand is settled onto (`src/core/ball.ts:666-668`), as A1 and V1 do for `numbers.md` (A1 L67, V1 L208); A7 (L92, L183-202) names only the significand limit for the product and the quotient. (2) `#Evaluation`: D1 (L646-668) and V2 (L208-210) correct the sentence in complementary ways, D1 adding that every node is a step and that exact values are never rounded, V2 adding the collector. (3) the tag: A1, V1, A7 and V2 tag their passages stale (update) (V2 L58 for `#Evaluation`); D1 treats the `#Evaluation` sentence as a misstatement; the drafters' calls differ accordingly (doc wrong for `numbers.md`; design changed for `#Quantities, dimensions and kinds`; either for `#Evaluation`).
- Proposed call: **design changed without the docs following** or **doc wrong**, the code deliberate either way. Design changed: the units tag the passages stale (update), the code holds exact products and quotients to the limit deliberately, the `quantity.ts` header still describes the older placement, and `#Quantities, dimensions and kinds` carrying the same omission suggests only the power once took a context. Doc wrong: the signatures are as the code has them, `#The significand limit` already describes the prediction products and quotients need, and D1 reads `#Evaluation` as a misstatement. Correct the three passages alike, merging D1's and V2's corrections for `#Evaluation`; settle the grid clause from `ball.ts:666-668`.
- Related: Q-059, B-035
- Decision: Stands (deliberate code either way): the three passages corrected alike, D1's and V2's corrections merged for `#Evaluation`, the grid clause settled from `ball.ts:666-668`; follows F-459 for the kind-primitives bullet; B-035 is the code side.

#### F-191. `#The kernel's boundary`: why the door allows four times the hard bound

- Type: stale (keep as intent)
- Target section: The kernel's boundary
- Units: V1 (L36, L218)
- Where: `devdocs/numbers.md#The kernel's boundary` (page L302-303)
- Passage: "(the hard bound alone was too small from a limit of about 350,000 bits up)"
- Tag: keep as intent (plan row confirmed; `FORMABLE_BITS` is four times the hard bound and the comment sizes such a value at about three times it, `src/core/fixed.ts:136-144`; a third of `2^20` is about 349,500)
- Rewrite: a significand of the limit's bits at a magnitude of `2^±significandLimitBits` has a power of ten of about three times the limit's bits, so the hard bound alone would not hold it once the limit passes about a third of the hard bound (V1 L218).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent); follows F-441 ("the hard bound", glossed once).

#### F-192. `#The kernel's boundary`: the log-space exit's memos are served, not recomputed

- Type: contradicts implementation
- Target section: The kernel's boundary
- Units: V1 (L52, L95, L178, L220)
- Where: `devdocs/numbers.md#The kernel's boundary` (page L329-331)
- Claim or passage: "The conversion costs about 47 ms at the default ceiling, the logarithm and the two memos computed for the call at the ceiling's bits plus the exponent's."
- Finding: `floatingToBall` asks for `ln 2` and `ln 10` at the working bits plus the exponent's bit length plus 24, `lnFixed` 33 bits above that; the memo holds the ceiling's bits plus 256, and an exponent within the bound has at most 62 bits, so every request is served from the memo. The sentence predates the margin (raised from 64, the constants' header says), and its timing goes (§12 q25).
- Evidence: `src/core/digits.ts:94-104`; `src/core/fixed-log.ts:85-86`; `src/core/constants.ts:180`, `196-207`; run: after `exp(1e6) - exp(1e6)` ran all nine passes, the `ln 2` and `ln 10` memos hold 13,709 bits, the ceiling's 13,453 plus the margin.
- Corrected statement: the conversion costs a logarithm and an exponential at the working bits plus the exponent's bit length, `ln 2` and `ln 10` coming from their memos, whose margin covers the exponent's bits at every pass (V1 L220).
- Proposed call: design changed without the docs following: the header records the margin raised so that these requests are served (tag `update`).
- Related: B-034
- Decision: Stands (update; the margin's reason); the stale timing goes with the mechanism it belonged to (Q-016 does not keep a figure of a design that changed).

#### F-193. `#Memoized constants`: two requests pass the memo, `beta`'s unconfirmed; the 25 ms

- Type: contradicts implementation · Flags: **low confidence**
- Target section: Memoized constants
- Units: V1 (L53, L97, L146, L176, L224, L362, L370), A3 (L46, L74, L96-98), V3 (L72, L764), D7 (L51)
- Where: `devdocs/numbers.md#Memoized constants` (page L375-380; L375-384 with the Bernoulli sentence); `devdocs/builtins.md#The Gamma and Beta families` (`beta`)
- Claim or passage: "The one request above the memo is the reduction of a larger argument (…): it computes `pi` for the call and keeps nothing, so `sin(1e5000 radian)` costs its milliseconds each time it is typed, at most `pi` to the significand limit plus the ceiling, about 25 ms at the defaults."
- Finding: the constants' header names two requests computed for the call and not kept, a trigonometric reduction at a larger argument and a logarithm of `beta` at a larger one (V1); "about 25 ms at the defaults" is the sections' one timing and leaves, the qualitative cost claims staying (A3). V1 left the `beta` case for V3 to confirm in `src/core/builtins/beta.ts` (hand-off V1 L97, V1 report); neither V3 nor D7 mentions it and no report confirms it, so V1's rewrite naming both (V1 L224) rests on the header alone. The rest of the hand-off was taken up: #103's link stays in the families section, inlined there by V3 (L521-549, V3 L542) and D7 (L183-220, D7 L188), and the Bernoulli memo's rule, left unverified by V3 (F-160), was checked against `bernoulli-ratios.ts` and confirmed by D7 (L51, D7 report).
- Evidence: `src/core/constants.ts:63-65`; run: `sin(1e5000 radian)` is `≈ 0.68616011`.
- Corrected statement: a request above the memo, a larger argument's reduction or a logarithm of `beta` at a larger one, computes the constant for the call and keeps nothing; `sin(1e5000 radian)` "pays for `pi` at its argument's bits each time it is typed …; the benchmarks measure it" (V1 L224; A3 L98 has the timing change without `beta`).
- Proposed call: **doc wrong** (the header names both requests; the 25 ms leaves, A3 and V1): keep V1's two-request sentence, confirming the `beta` request in `beta.ts` before V1's `#Memoized constants` edit 1 lands, or accept the header's word, or word the sentence so it does not depend on it; low confidence until the `beta` case is confirmed.
- Related: Q-012, F-160
- Decision: Stands (doc wrong); follows Q-012 (A: #103 is `builtins.md`'s); the `beta` request is confirmed in `beta.ts` by the session; the 25 ms may stay as a rough, illustrative figure (Q-016) or go for the benchmarks.

#### F-194. `#Memoized constants`: the table's build fills `pi`'s memo

- Type: contradicts implementation
- Target section: Memoized constants
- Units: A3 (L45, L60, L71, L96-98), V1 (L54, L178, L224)
- Where: `devdocs/numbers.md#Memoized constants` (page L380-381)
- Claim or passage: "Every memo of the core is filled on first use, none at module load or at the table's build."
- Finding: the build is `pi`'s first use, through `deg`, `grad`, `turn`, `oersted` and `parsec` (`src/units.txt:241`, `292`, `354`, `357`, `414`), so the first build fills `pi`'s memo; `e`, `ln 2`, `ln 10` and `ln π` wait for the first expression that needs them.
- Evidence: run: `piMemoBits()` is `undefined` before the first build and 13,709 after it; `ln2MemoBits()` and `ln10MemoBits()` unfilled until needed (A3, V1).
- Corrected statement: "Every memo of the core is filled on first use and none at module load; the build of the table is `pi`'s first use, through the angle units, so the memo of `pi` is filled by the first build, and `e`, `ln 2`, `ln 10` and `ln π` wait for the first expression that needs them." (A3 L45, L98; V1 L224)
- Proposed call: doc wrong: "filled on first use" holds, the build being that use (tag `update`).
- Decision: Stands (doc wrong).

#### F-195. `#Memoized constants`: the Bernoulli ratios are not memoized "the same way"

- Type: contradicts implementation
- Target section: Memoized constants
- Units: V1 (L55, L98, L146, L226)
- Where: `devdocs/numbers.md#Memoized constants` (page L382-384)
- Claim or passage: "The Bernoulli ratios the Gamma family's series take are memoized the same way (…; the memo's footprint is [#103][103])."
- Finding: the constants hold one value at the ceiling plus the margin, replaced for a higher ceiling; the ratios' memo holds one run keyed by the count the series reserve and the bits they ask for, grows on either and serves the bits asked plus the same margin: what they share is the margin and its reason.
- Evidence: `src/core/bernoulli-ratios.ts:17-27`
- Corrected statement: the ratios "hold the same margin for the same reason, memoized by the count the series reserve and the bits they ask for", with the pointer to `builtins.md` and without the #103 link (V1 L226; the link: see the issue-links finding).
- Proposed call: doc wrong: the module's header states the keys; V3 left this detail unverified (V3 L764), which `bernoulli-ratios.ts:17-27` settles (tag `update`).
- Related: Q-012, F-193
- Decision: Stands (doc wrong); follows Q-012 (the #103 link leaves this page for `builtins.md`).

#### F-196. `#Roots and powers`: the integer-square-root timing

- Type: stale (keep as intent)
- Target section: Roots and powers
- Units: V1 (L56, L230)
- Where: `devdocs/numbers.md#Roots and powers` (page L411-414)
- Passage: "(V8 divides big integers quadratically, and an integer square root by division cost more than `pi`'s whole series at a hundred thousand digits, 869 ms against 80)"
- Tag: keep as intent (new; §12 q25; the reason is in `src/core/fixed.ts:28-33` and `src/core/constants.ts:26-29`)
- Rewrite: "multiplications only", since V8 divides big integers quadratically and a square root by division "would cost more than `pi`'s whole series at a hundred thousand digits"; the timing goes (V1 L230).
- Proposed call: Confirm `keep as intent`.
- Related: B-034
- Decision: Stands (keep as intent); follows Q-016 (the measured ratio stays: "about ten times `pi`'s whole series"; the milliseconds may stay marked illustrative).

#### F-197. `#Roots and powers`: the integer-roots sentence is the replaced design

- Type: stale (drop)
- Target section: Roots and powers
- Units: V1 (L57, L96, L232)
- Where: `devdocs/numbers.md#Roots and powers` (page L423-425)
- Passage: "The square root's interval is exact, its ends the integer roots of the argument's ends."
- Tag: drop (new; `sqrtFixed` is Newton on the reciprocal square root, multiplications only, its error `D s / (2 s^2 - D)` verified by squaring, `src/core/fixed.ts:486-549`; the header names the integer roots of the ends as the earlier version, `:28-33`)
- Rewrite: delete; the sentence before states the verified bound (V1 L232).
- Proposed call: Confirm `drop`: it states a replaced design as current and carries no intent the section lacks.
- Related: B-034
- Decision: Stands (drop).

#### F-198. `#Roots and powers`: why the third case goes to log space

- Type: stale (keep as intent)
- Target section: Roots and powers
- Units: V1 (L35, L234)
- Where: `devdocs/numbers.md#Roots and powers` (page L433-434)
- Passage: "which converted to zero and reported a false `unresolved`"
- Tag: keep as intent (plan row confirmed; the comment states the reason in the present tense, `src/core/ball.ts:1297-1301`; the case goes to log space at `:1338`)
- Rewrite: "which the conversion would turn to zero within an ulp and report as a false `unresolved`" (V1 L234).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent).

#### F-199. `#Roots and powers`: the `pow` prediction clause (#89) is stale

- Type: contradicts implementation
- Target section: Roots and powers
- Units: V1 (L59, L99, L143, L169-170, L238, L360)
- Where: `devdocs/numbers.md#Roots and powers` (page L478-480)
- Claim or passage: "and `pow`'s size prediction refuses powers the node check would admit ([#88][88], [#89][89])"
- Finding: `rational.ts`'s `pow` predicts `floor(|n| log2 p) + 1` with `log2 p` from the part's top bits, which is what #89's "Done when" asks, and every row #89 lists agrees today; the "node check" is the measuring check that `#The significand limit` says the evaluator now asserts. #89 is open.
- Evidence: `src/core/rational.ts:410-437`; run: `2^40000` is `≈ 1.5842604e+12041` as `2^20000 * 2^20000` is; `3^41000` is `≈ 9.3636141e+19561` as `3^20500 * 3^20500` is; `2^65000` is a value; `3^1000000000` is refused by prediction; `3^41350` is refused with about 65,539 bits.
- Corrected statement: the sentence keeps its first half, "`^` and `pow` still disagree on a dimensionless base with an exact exponent", with #88 inline (V1 L238).
- Proposed call: design changed without the docs following: the prediction #89 asks for is in the code; delete the clause either way and close #89 once its tests are checked (V1 Q1).
- Related: Q-042, B-033
- Decision: Stands (design changed); follows Q-042 (ok: #89 closed once its tests are confirmed; the clause goes) and Q-102 (#88 stays inline here).

#### F-200. The exponent bound's `gamma`, `erfc` and incomplete-function sites unverified

- Type: other
- Target section: The exponent bound
- Units: A5 (L354-356, L478-486), D7 (L119), V1 (L7, L93)
- Where: `devdocs/numbers.md#The exponent bound`
- Finding: A5 found the section accurate against `classifyExp`, `classifyHyperbolic` and `classifyPower` but left "the `gamma`, `erfc` and incomplete-function sites it names" to D7, with its question 4 on wide-argument hulls refused as `exceeds`. D7's report reads neither: `devdocs/numbers.md` is outside its sections (L119), and V1 did not re-read the sections an A unit covered (L7, L93). The three sites stay unverified and question 4 unanswered.
- Proposed call: Verify the three sites against their classifiers when `devdocs/numbers.md` is rewritten; A5's question 4 stays an open item.
- Related: Q-058
- Decision: Stands; follows Q-058 (ok).

#### F-201. Which limit a refusal names: message quoted without its remedy

- Type: contradicts implementation
- Target section: Which limit a refusal names
- Units: A5 (L70, L357, L413-429), V1 (L60, L119, L240-242)
- Where: `devdocs/numbers.md#Which limit a refusal names` (page L608-612)
- Claim or passage: the `1e999999999 + 1` message quoted as `"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit.`
- Finding: the message has a second sentence, the `fits` remedy; the other two quoted messages are exact, and the section is otherwise accurate (A5 report).
- Evidence: `src/messages.test.ts:157`; run (A5 L287).
- Corrected statement: `"1e999999999 + 1" would need a significand of about 3,321,928,093 bits as an exact value, past the significand limit. Try "approx(1e999999999)" in place of "1e999999999", or decimal mode, to compute it to the digits asked.`, followed by "the first's second sentence is the `fits` remedy of "The significand limit" …, and a refusal that passes the limit however it is computed says so in its place" (A5 L421-429; V1 L242).
- Proposed call: **doc wrong** (the tests pin the text). V1 (L119) moves the three messages to `docs/numbers.md#Values too big to hold` and the generated catalogue (§12 q6), so the quote may leave this section.
- Decision: Stands (doc wrong); follows Q-007 (the messages are the docs' examples and the catalogue's; the quote may leave this section).

#### F-202. `#Why the exponent bound stays at 10^18`: the scratch build's timings

- Type: measurement
- Target section: Why the exponent bound stays at 10^18
- Units: V1 (L61, L62, L246, L248, L361), A5 (L487-492)
- Where: `devdocs/numbers.md#Why the exponent bound stays at 10^18` (page L649-656, the **Cost** bullet; L703-709, the closing paragraph)
- Finding: the **Cost** bullet gives a scratch build's per-size timings ("20 ms for `exp(1e100)`, 127 ms for `exp(1e999)`, 1.0 s for `exp(1e3000)` and 13.3 s for `exp(1e9000)` … the probe's default budget of 50 ms a pass") and the closing paragraph more ("(70 ms in the scratch build, agreeing with Python's `decimal` at 1,200 digits) … 391 ms in all; without the rule on the radius, the first pass spent 30 s in the kernel's squarings"). §12 q25 sends timings out of the pages, and the per-size milliseconds of a build that no longer exists cannot live in the benchmarks (V1). The rule on the radius the last sentence describes is current (`src/core/fixed-exp.ts:30-39`, `:119-135`); V1 keeps "several times the cost" and describes the rule (L248).
- Proposed call: apply V1's qualitative text (L246, L248; tag `update`): V1 and A5 agree that the six-pass table (digits) stays and the per-size milliseconds go; the owner weighs §12 q10 ("devdocs owns the table and the measurements") against q25 (V1 (Q-017), A5 (Q-017)). D8's docs draft points at "the measurements" here (D8 L265) and follows the decision.
- Related: Q-017
- Decision: Follows Q-017 (ok): the six-pass table and the qualitative finding stay; the per-size milliseconds go (this item's own answer, not Q-016's allowance).

#### F-203. `#Certification and the display rule`: drop the first-version parenthesis

- Type: stale (drop)
- Target section: Certification and the display rule
- Units: A2 (L37, L77), V1 (L37, L252)
- Where: `devdocs/numbers.md#Certification and the display rule` (page L754-758)
- Passage: "(A first version widened the midpoint taken to two digits beyond those asked by a unit or two, which refused a count whenever the two digits beyond lay within two of a boundary, …)"
- Tag: drop (A2, V1; plan row confirmed)
- Rewrite: delete; the distance rule stands on its own (A2 L37, L77, within its edits L75-81; V1 L252).
- Proposed call: Confirm `drop`.
- Decision: Stands (drop).

#### F-204. `#Certification and the display rule`: the `^1e100000` example is refused today

- Type: contradicts implementation
- Target section: Certification and the display rule
- Units: A2 (L31, L41, L80, L156), V1 (L65, L258)
- Where: `devdocs/numbers.md#Certification and the display rule` (page L777-779)
- Claim or passage: "(`(approx(1e20) - approx(1e20))^1e100000` carries a bound whose exponent has 100,004 digits)"
- Finding: the expression is refused as `tooLarge` "however it is computed": the exponent literal `1e100000` alone needs a significand past the limit. `^1e10000` gives `≈ 0 (within 1e-1000000000000000000 of zero)`, the bound clamped at the bottom edge as the page says.
- Evidence: live runs (A2 L31); `src/core/display.ts:78-108`.
- Corrected statement: "(`(approx(1e20) - approx(1e20))^1e10000` carries a bound whose exponent runs to ten thousand digits)" (A2 L41, L80; V1 L258)
- Proposed call: **doc wrong** (tag `update`): the example cannot run; the rule it illustrates holds.
- Related: Q-099, F-046
- Decision: Stands (doc wrong); follows Q-099.

#### F-205. `#Working precision`: a context silent on the mode is exact

- Type: stale (keep as intent)
- Target section: Working precision and the schedule
- Units: A3 (L41, L102-104), V1 (L66, L262)
- Where: `devdocs/numbers.md#Working precision and the schedule` (page L810-815)
- Passage: "(`mode`, optional and absent meaning exact, so that every context written before the mode existed is an exact one; `modeOf` reads it)"
- Tag: keep as intent (new)
- Rewrite: "… so that a context that says nothing of the mode is an exact one …" (A3 L41, V1 L262, same text).
- Proposed call: Confirm `keep as intent`: the reason stays, the history goes.
- Decision: Stands (keep as intent).

#### F-206. `#Working precision`: `checkContext` bounds the working digits in either mode

- Type: contradicts implementation
- Target section: Working precision and the schedule
- Units: A3 (L42, L70, L106-108), V1 (L67, L264)
- Where: `devdocs/numbers.md#Working precision and the schedule` (page L829-831)
- Claim or passage: "`checkContext` holds `precision <= ceiling`, and in decimal mode `working >= precision` and `4 (working + GUARD_DIGITS) <= ceiling`."
- Finding: the check runs whenever the field is present, in either mode; exact mode carries the field and ignores it.
- Evidence: `src/core/context.ts:298-309`; `src/core/context.test.ts:237-242` ("The same bounds in exact mode, where the field is carried and ignored").
- Corrected statement: "`checkContext` holds `precision <= ceiling` and, when working digits are given, `working >= precision` and `4 (working + GUARD_DIGITS) <= ceiling`, in either mode; exact mode carries the field and ignores it." (A3 L42; V1 L264)
- Proposed call: doc wrong: a test names the exact-mode case (tag `update`).
- Decision: Stands (doc wrong).

#### F-207. `#Working precision`: "they moved once" is history

- Type: stale (drop)
- Target section: Working precision and the schedule
- Units: A3 (L38, L118-120), A9 (L35, L259-265), V1 (L38, L270)
- Where: `devdocs/numbers.md#Working precision and the schedule` (page L857-860)
- Passage: "they moved once, from a fixed ceiling of a thousand digits with the digits limited to two hundred, when the precision limit became a setting"
- Tag: drop (plan row confirmed by A3, A9 and V1)
- Rewrite: delete; the sentence ends at "judgments, not measurements." (A3 L120, A9 L265, V1 L270, same text)
- Proposed call: Confirm `drop`.
- Decision: Stands (drop).

#### F-208. `#Working precision`: the unaffordable-pass parenthesis is untraced

- Type: not verified · Flags: **low confidence**
- Target section: Working precision and the schedule
- Units: A3 (L58, L147, L153)
- Where: `devdocs/numbers.md#Working precision and the schedule` (page L879-880)
- Finding: "the only such error a later pass can newly raise is a `tooLarge` marking the pass unaffordable" fits the built-ins that refuse on their own counts at the working bits and is modelled by `src/core/pipeline.test.ts:529-560`; A3 did not trace "a classifier verdict that moves from `unresolved` at the bound to a refusal after an earlier pass produced a result".
- Why unverified: "the code's shape and one test support but no single path proves" it; A3 Q7 hands the trace to A5. A5 names the only sites whose count grows with the pass, so that a later pass can be the first to refuse: `unaffordable` and the series' working bits (A5 L144-147, A5 (F-051)).
- Proposed call: read A5 L144-147 against the sentence (it holds if "a `tooLarge` marking the pass unaffordable" covers the series' working bits too) and trace `classifyPower` (`src/core/ball.ts:734-740`) for A3's path; A9 tags the same sentence under the `tooLarge` row (the `tooLarge` finding).
- Related: Q-001, F-051
- Decision: Stands; follows Q-001 (one kind, never retried by the loop; a later pass's refusal ends it): the session reads A5 L144-147 against the sentence.

#### F-209. `#Working precision`: "milliseconds per pass" in the rebuild alternative

- Type: stale (keep as intent) · Flags: **conflict**
- Target section: Working precision and the schedule
- Units: A9 (L40, L267-273, L323-325)
- Where: `devdocs/numbers.md#Working precision and the schedule` (page L916-918)
- Passage: "Rebuilding at each pass's precision would cost milliseconds per pass and a table per pass for no gain, and a table per setting would hold one per setting the session had seen."
- Tag: keep as intent (new; a ruled-out alternative with a timing to remove, §12 q25)
- Rewrite: it "would cost a build per pass for no gain, and a table per setting would hold one for every setting the session had seen; one table, replaced when the ceiling moves, is the whole footprint" (A9 L273).
- Conflict: A3 lists "rebuilding at each pass's precision would cost milliseconds per pass" among the qualitative cost claims that hold and stay (A3 L74); A9 treats it as a timing to remove (L40, L323-325); V1, to whom A9 handed it (A9 Q5), proposes no change.
- Proposed call: Confirm `keep as intent`; the owner decides whether "milliseconds per pass" is a timing under q25 (A9) or qualitative (A3).
- Related: Q-088
- Decision: Stands (keep as intent); follows Q-088 and Q-018 ("milliseconds per pass" is a qualitative cost claim and may stay).

#### F-210. `#Settling`: why every inexact result is settled

- Type: stale (keep as intent) · Flags: **conflict**
- Target section: Settling
- Units: A1 (L62), A3 (L39, L124-126), V1 (L39, L274)
- Where: `devdocs/numbers.md#Settling` (page L936-939)
- Passage: "(The first design let inexact midpoints grow as exact rationals, and a thirteen-thousand-bit dyadic to the fifth power was then a size the significand limit refused.)"
- Tag: keep as intent (plan row confirmed by A1, A3 and V1; the reason is in the `src/core/ball.ts:16-23` header)
- Rewrite: a present-tense reason for settling, in two texts: A1, an inexact midpoint left to grow as an exact rational reaches the limit within a few operations, "a dyadic of some thirteen thousand bits raised to the fifth power" (L62); A3, "a kernel result of some thousands of bits raised to the fifth power is already past it", refused for digits that carry no information (L126), adopted by V1 (L274).
- Conflict: the two rewrites differ in the example's size ("some thirteen thousand bits" against "some thousands of bits") and in A3's added reason.
- Proposed call: Confirm `keep as intent`; pick one text (V1 picked A3's), checking the example's size against the `ball.ts:16-23` header.
- Decision: Stands (keep as intent); the session picks one text, checking the example's size against `ball.ts:16-23`.

#### F-211. `#Settling`: why `settle` is not exported

- Type: stale (keep as intent)
- Target section: Settling
- Units: A1 (L63), A3 (L40, L128-130), V1 (L40, L276)
- Where: `devdocs/numbers.md#Settling` (page L974-976)
- Passage: "Its primitive, `settle`, is not exported: an earlier shape, a settle any inexact ball could reach beside a retry only two call sites used, was a contract that lived in documentation."
- Tag: keep as intent (plan row confirmed by A1, A3 and V1; `settle` is module-private, `src/core/ball.ts:1014`)
- Rewrite: one reason in two wordings: a settle any inexact ball could reach from outside would be a contract that lives in documentation, "where `step` makes it one that lives in the code" (A1 L63); or "rather than in the one entrance" (A3 L130), adopted by V1 (L276).
- Proposed call: Confirm `keep as intent`; pick one wording (same content).
- Decision: Stands (keep as intent); one wording.

#### F-212. Decimal mode: the withdrawn-radius paragraph, kept as intent

- Type: stale (keep as intent)
- Target section: Decimal mode
- Units: A4 (L35, L97), V1 (L41, L134, L290), A7 (L91)
- Where: `devdocs/numbers.md#Decimal mode` (page L1066-1075)
- Passage: "An earlier version of the mode rounded every step and also tracked, in the radius, how far the roundings had carried the value … That was withdrawn: …"
- Tag: keep as intent (A4, V1, A7; plan row confirmed)
- Rewrite: in the present tense, a radius carried through the mode's steps is ruled out (it answers a question the mode does not ask, a directed rounding could never certify its last digit, it adds nothing exact mode lacks); the ball model stays inside a built-in (A4 L97; V1 L290).
- Proposed call: Confirm `keep as intent`; the rewrite also mends the broken source, a blank line and a `- 3` list item inside the code span that render as a bullet (A4 L35, V1 L41), and drops the old note quote at L1069.
- Decision: Stands (keep as intent); the quoted note follows Q-006 ("certified").

#### F-213. Decimal mode: what the significand limit binds

- Type: contradicts implementation
- Target section: Decimal mode
- Units: A4 (L42, L62, L102), V1 (L77, L300)
- Where: `devdocs/numbers.md#Decimal mode` (last paragraph)
- Claim or passage: "The significand limit is nearly idle in decimal mode: with the denominator fixed it binds only the exact intermediate before a rounding and the alignment of a sum."
- Finding: it also binds a literal's significand as typed (refused in either mode, not rounded) and an exact power's prediction, which sends a power past the limit to the widened base (`powered`): at eight digits `2^-30000` is `= 1.2593025e-9031` and `3^1000000000` is `= 5.243997e+477121254`.
- Evidence: `src/core/evaluate.ts:510-518`, `1136-1156`; runs as quoted.
- Corrected statement: "…with the denominator fixed it binds the exact intermediate before a rounding, the alignment of a sum, the significand of a literal as typed, which is refused past the limit in either mode rather than rounded, and the prediction of an exact power, which sends a power past the limit to the widened base." (A4 L102; V1 L300)
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong); amended by F-442 ("refused past the limit" is a size refusal: the right word).

#### F-214. Decimal mode: steps before the last, and the notes' wording

- Type: contradicts implementation
- Target section: Decimal mode
- Units: A4 (L39, L40, L86, L101), V1 (L76, L298)
- Where: `devdocs/numbers.md#Decimal mode` (page L1183-1186)
- Claim or passage: "In decimal mode every value is exact and has at most `p` digits, so … `≈`, "n of m digits are certain", "within … of zero" and "no digit certain" never appear for a rounding the mode certified."
- Finding: a displayed value has at most `p` digits and a step before the last at most the working digits; no note says "no digit certain": the notes are "n of m digits are certain", "within … of zero" and "the digits are not certified" (`src/outcome.ts:504-517`), "certain" becoming "certified" with the decided code change.
- Evidence: `src/outcome.ts:504-517`; the N19 runs (A4 L72-75).
- Corrected statement: "In decimal mode every value is exact, a displayed value having at most `p` digits and a step before the last at most the working digits (below), so the display's `exact` kind applies to every line: `=`, every digit, no note; `≈`, "n of m digits are certified", "within … of zero" and "the digits are not certified" never appear for a rounding the mode certified." (V1 L298; A4 L101 keeps "certain" until the code change)
- Proposed call: **doc wrong**.
- Related: B-068
- Decision: Stands (doc wrong); follows Q-006 (V1's "certified" wording, after the code change).

#### F-215. The significand limit: "checked first" inverts the mechanism

- Type: contradicts implementation
- Target section: The significand limit
- Units: A5 (L68, L388-404, L507-508), V1 (L81, L312)
- Where: `devdocs/numbers.md#The significand limit` (page L1364-1365)
- Claim or passage: "The exponent bound is checked first, so that a result past both is reported at the bound."
- Finding: the prediction refuses before anything is formed; a product's or quotient's `tooLarge` is then read against the operands' decimal exponents (`pastBoundBetween`), a power's through `powerRefusal`, and reported at the bound when every exponent the result can have lies past it. The outcome the sentence promises holds (`7^1e19` is too large to compute; A5 report).
- Evidence: `src/core/scaled.ts:542-546`, `:609-614`, `:927-939`; `src/core/evaluate.ts:613-623`.
- Corrected statement: "A result past both limits is reported at the bound: the prediction refuses it before anything is formed, and a `tooLarge` of a product or a quotient is then read against the operands' decimal exponents (`pastBoundBetween`), a power's through `powerRefusal`, and reported at the bound when every exponent the result can have lies past it ("Which limit a refusal names" above)." (V1 L312; A5 L399-404 writes "below")
- Proposed call: **doc wrong**: one inverted mechanism sentence.
- Decision: Stands (doc wrong).

#### F-216. The significand limit: `1 / 2^n` is refused from n = 28,225

- Type: contradicts implementation
- Target section: The significand limit
- Units: A5 (L69, L294, L406-411), V1 (L80, L310)
- Where: `devdocs/numbers.md#The significand limit` (page L1326-1327)
- Claim or passage: "So `1 / 2^n` is refused past `n ≈ 28,225` at the default, as `0.5^30000` is, since each is stored with `5^n`."
- Finding: refused from `n = 28,225`: `1/2^28224` is `≈ 5.3629331e-8497` (exact), `1/2^28225` is refused ("about 65,538 bits"), `0.5^28225` too ("about 65,537 bits"); `5^28225` has 65,537 bits.
- Evidence: runs (A5 L294).
- Corrected statement: "So `1 / 2^n` is refused from `n = 28,225` at the default (`5^28225` has 65,537 bits, and `1 / 2^28224` is a value), as `0.5^30000` is, since each is stored with `5^n`." (A5 L409-411; V1 L310)
- Proposed call: **doc wrong**. The dyadic example's user side moves to `docs/numbers.md#How a value is held` (V1 L127).
- Decision: Stands (doc wrong).

#### F-217. The significand limit: measuring after forming, kept as intent

- Type: stale (keep as intent)
- Target section: The significand limit
- Units: A5 (L66), V1 (L42, L314)
- Where: `devdocs/numbers.md#The significand limit` (page L1370-1374)
- Passage: "Measuring after forming, which the limit did at first, was deliberate while it lasted (…), and the strict limit keeps its answers by predicting after the gcds."
- Tag: keep as intent (A5, V1; plan row confirmed)
- Rewrite: the prediction runs after the cross-cancelling gcds, never on unreduced sizes (that would refuse `x / x` and bound no quotient); measuring after forming is the ruled-out alternative, bounding what is kept and not what is formed (A5 L66; V1 L314).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent).

#### F-218. approx: "never the reverse" contradicts the function's purpose

- Type: contradicts implementation · Flags: **conflict**
- Target section: approx
- Units: D6 (L24, L35, L68, L82, L200-206, L242), A5 (L360)
- Where: `devdocs/numbers.md#approx` (page L1473-1474)
- Claim or passage: "`approx` can turn a value into a refusal and never the reverse."
- Finding: `approx` turns `1e999999999 + 1`, a refusal, into `≈ 1e+999999999`, which `#The significand limit` and N4 call its purpose; the paragraph means that it never casts a value to exact or raises its precision.
- Evidence: D6's harness (its N23 row: `approx(1e999999999) + 1` is `≈ 1e+999999999` where `1e999999999 + 1` is refused); A5's runs show the same (A5 L287-288).
- Corrected statement: "`approx` never turns an inexact value exact and never decides an edge: `factorial(approx(5))` is an error where `factorial(5)` is a value, and `1 / approx(sqrt(2) - sqrt(2))` is as undecided as `1 / (sqrt(2) - sqrt(2))`. What it does relax is the significand limit …" (full text: D6 L200-206).
- Conflict: A5 (L360, A5 report) finds `#approx` accurate; D6 (L68) flags this sentence. D6 did not consult A5's report (D6 L24, L242).
- Proposed call: **doc wrong** as worded, if D6's reading holds: A5's own runs show `approx` turning a refusal into a value; check whether "refusal" was meant narrowly (an edge, or an inexact argument a built-in rejects) before taking D6's rewrite.
- Related: F-046
- Decision: Stands (doc wrong as worded): the session checks whether "refusal" was meant narrowly before taking D6's rewrite; amended by F-442 (the sentence's "refusal" means a size refusal, the only sense kept).

#### F-219. approx: the postfix `~` spelling, kept as intent

- Type: stale (keep as intent)
- Target section: approx
- Units: D6 (L47, L212)
- Where: `devdocs/numbers.md#approx` (page L1499-1501)
- Passage: "a postfix `~` on a literal (`2.54~`), terse and the likely spelling of `approx(x)` later, but it needs grammar, applies to literals alone, and has no binary form"
- Tag: keep as intent (D6; plan row new)
- Rewrite: "…terse, and the natural short spelling of `approx(x)` if one is ever wanted, but it needs grammar, applies to literals alone, and has no binary form" (D6 L47, L212).
- Proposed call: Confirm `keep as intent`: a spelling weighed and left open, without the forecast; V1 (L128) keeps "the spellings left open" in the section.
- Decision: Stands (keep as intent) in part: the ruled-out spellings stay; the postfix `~` is a ruled-out alternative too (confirmed on 2026-10-12, plan §12.2, item 11): it stays with its reason, the sentence losing "the likely spelling … later".

#### F-220. `#Formatting`: settle, product and exit timings

- Type: measurement
- Target section: Formatting
- Units: A2 (L42, L82-84), V1 (L84, L328)
- Where: `devdocs/numbers.md#Formatting` (page L1558-1561)
- Finding: "so that a settle at the default ceiling costs about 0.4 ms (the 0.2 ms under "The types" is the division alone, measured when the base was chosen), a product of two settled balls 0.1 ms and the kernel's exit 0.2 ms" are timings (§12 q25).
- Proposed call: apply A2's text, which V1 gives too (A2 L42, L84; V1 L328; tag `update`): the three "each stay a small fixed cost; the benchmarks hold the figures"; it also removes the cross-reference to the 0.2 ms, which `#The types` drops with V1's rewrite there.
- Related: F-184
- Decision: Follows Q-016 and Q-088: the three costs stay as small fixed costs, with their rough figures marked illustrative or left to the benchmarks (the session's choice); the cross-reference to `#The types` goes with V1's rewrite there.

#### F-221. `devdocs/numbers.md`: ten reference-style issue links go inline; #98's place disputed

- Type: markdown and links · Flags: **conflict**
- Units: V1 (L48, L55, L58-59, L75, L79, L83, L85, L98-100, L134, L140-149, L204, L226, L236, L238, L296, L306, L320-324, L332, L345, L352, L363, L364), A1 (L189-196), A3 (L72), A4 (L100, L107), A5 (L360-362), D4 (L387-389), D6 (L45, L46, L208, L210, L233)
- Where: `devdocs/numbers.md#Exact operations` (page L223, #78); `devdocs/numbers.md#Memoized constants` (page L382-384, #103); `devdocs/numbers.md#Roots and powers` (page L446-447, #79; L478-480, #88 and #89); `devdocs/numbers.md#Decimal mode > The ceiling` (page L1146, #173); `devdocs/numbers.md#The working digits` (page L1259, #172); `devdocs/numbers.md#approx` (page L1510, L1525, L1527: #100, #98, #171); the foot (page L1563-1572; the `#approx` definitions L1567-1570)
- Finding: the page writes within the Markdown subset (no raw HTML, footnote or blockquote; the six-pass table stays) apart from ten reference-style issue links and their definitions at the foot, each to become an inline link at the passage that owns its concept (§12 q26). #78 stays inline in `#Exact operations` (open, the page's one mention; A1, V1); #79 stays inline (open, reproduces: `cbrt(3e24 + (approx(2e51) - approx(2e51)))` throws "Newton's root is not within half of its argument"); #88 stays inline (open, reproduces: `2^1e-30000` refused where `pow(2, 1e-30000)` is `≈ 1`); #89 goes with its clause; #103 leaves for `devdocs/builtins.md#The Gamma and Beta families`, which owns the Bernoulli memo (A3, V1). "is [#173][173]" (`#Decimal mode > The ceiling`) and "settling that vocabulary is [#172][172]" (`#The working digits`) are open issues whose passages own their concepts, so both go inline where they stand; #172 also owns the code's names for step, pass, settle and certify (V1 L345, L352). In `#approx`, #100 (`approx(x, u)`) and #171 (the semantics of `approx`) are open, belong there and go inline (A5, D6, V1 agree); #98 (significant figures, open) is also linked from `devdocs/builtins.md#The exact functions` (the `round` passage), so one of the two goes (§12 q26). The ten definitions go once the inline links are in.
- Conflict: #98's one place: V1 (L144, L322, L363) keeps #98 inline in `#approx`, the page's one mention of significant-figure propagation, with V6 naming the extension without the link; D6 (L46, L210, L233) makes the `round` passage the one place and has this sentence point at the exact functions without the link. In K6, V3 also keeps #98 in the `round` bullet and D7 inlines it in `#Not in this design`.
- Proposed call: inline each link where it stands as drafted (V1 L204, L236, L238, L296, L306; A4 L100, L107 and D4 L387-389, the same text for #172 and #173), #100 and #171 included (agreed); drop the #89 and #103 links and the foot definitions (V1 L332); for #98 the owner picks the one place by what the issue asks, rounding to significant digits in `round` or propagation through `approx(x, u)` (D6 Q4, V1 Q4); `devdocs/architecture.md#Evaluation` drops its own #88 link for a pointer here.
- Related: Q-012, Q-014, Q-102, Q-104, B-003, B-006, F-042, F-190, F-281, F-303, F-411, F-413
- Decision: Stands for #79 and #88 (bugs, inline where they stand, Q-012's rule), and #199 joins them at `#Working precision and the schedule` (B-011; plan §12.2, item 14); #78 is future work (the owner on 2026-10-12, plan §12.2, item 2): its one link moves to `devdocs/future.md`, and `#Exact operations` states where a quotient's reduction runs today as a plain fact, #89 (goes, Q-042) and #103 (leaves for `builtins.md`, Q-012); amended by Q-011: #98 (Q-014), #100 (Q-104, Q-035) and #171's future-work status leave this page for `devdocs/future.md`, the section naming the binary form in one clause; #172 (vocabulary) stays inline at `#The working digits`, and #173 (rolling back uncertified results) is future work whose one link is `future.md`'s, `#Decimal mode` stating the behaviour as a plain fact (confirmed on 2026-10-12, plan §12.2, items 4 and 5); the foot's definitions go.

### Findings owned by other pages that touch this one

- F-010 (docs/numbers.md): N3 and devdocs: two sources of a nonzero radius, not three
- F-012 (docs/numbers.md): Dyadic cost: 69,658 bits in the pages, "about 69,659" in the refusal
- F-021 (docs/numbers.md): "Certain" becomes "certified" in every page quoting the notes
- F-022 (docs/numbers.md): "Four times the limit plus ten" reads as 4L + 10; limit and ceiling run together
- F-023 (docs/numbers.md): N10: the partial kind is reachable today, by more than one route
- F-028 (docs/numbers.md): N14 and devdocs: a difference "refused as too large" cannot arise
- F-029 (docs/numbers.md): N14: a touch is not a straddle; the callers decide
- F-037 (docs/numbers.md): N17 and the Mode entry: step lists that miss operators
- F-038 (docs/numbers.md): N19: the reciprocal line is the reciprocal of the shown ratio
- F-041 (docs/numbers.md): N17: a literal past the significand limit is refused in either mode
- F-042 (docs/numbers.md): N18: `log` reaches the uncertified fallback
- F-043 (docs/numbers.md): N19: with a `want`, the `have` is an operand rounded to `w`
- F-044 (docs/numbers.md): Decimal mode's unstated consequences for units, edges and directed modes
- F-046 (docs/numbers.md): `approx` as a concept (§6.1), with A5's, A2's and D6's facts
- F-050 (docs/numbers.md): The 32,768-bit scenario reads as the default; where the diagram goes
- F-051 (docs/numbers.md): `tooLarge`: one kind, never retried, against the plan's owner review
- F-052 (docs/numbers.md): N24: "sum" is the plan's; a sum never faces the choice of limit
- F-053 (docs/numbers.md): The two size limits from the user's side (§6.1), with A5's and D6's facts
- F-056 (docs/numbers.md): N21 overstates "inexact results are never refused for size"
- F-057 (docs/numbers.md): Dissolve docs/functions.md#Very large results and approx (§12 q10)
- F-064 (docs/numbers.md): The "at most about twice" cost bound fails near the ceiling
- F-066 (docs/numbers.md): devdocs/numbers.md links nowhere in docs/: each section opens with a link
- F-069 (docs/quantities.md): Q10 misfiles `gravity`; the pages miss the measured factors
- F-120 (docs/settings.md): `= -100000000` is displayed as `= -1e+8`
- F-125 (docs/settings.md): The ceiling is a pass's precision, not "the finest grid"
- F-134 (docs/settings.md): docs/settings.md names devdocs pages in inline code, against ownership
- F-246 (devdocs/architecture.md): A typed list's unit straddling zero at a pass is never retried
- F-249 (devdocs/architecture.md): Which page carries the design of the table at the ceiling
- F-345 (devdocs/future.md): Extensions that fit omits the §1.3 intents other pages link to
- F-411 (cross-cutting): Issue #88: linked from two pages; `numbers.md` agreed as its place
- F-412 (cross-cutting): Issue #92: one link today, at "The reciprocal"; no second to remove
- F-413 (cross-cutting): Issue #98: three links on two pages; its one place disputed
- F-414 (cross-cutting): Issue #100: three links; `numbers.md#approx` its agreed place
- F-415 (cross-cutting): Issue #103: named on four pages; `builtins.md` or `cost.md`
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-427 (terminology): "certain" for certified digits
- F-430 (terminology): "the ceiling rounding" for the bound's rounding up
- F-431 (terminology): "working digits" in three senses; "the working grid"; "working precision" for the grid
- F-432 (terminology): "the guard" for two guards
- F-433 (terminology): "step", "operation", "node"; "pass", "settle", "certify", "schedule"
- F-434 (terminology): "the fallback" of decimal mode's ceiling
- F-436 (terminology): "neighbor rule" / "neighbour"
- F-437 (terminology): "absorbed into the radius"
- F-439 (terminology): "canonical" (form, significand, text) and "the printed form"
- F-440 (terminology): "decimal exponent" beside "the exponent"
- F-441 (terminology): "hard bound" (and "formable")
- F-444 (terminology): Wording of the significand limit's refusal: reach, fits, exceeds, need, unaffordable
- F-445 (terminology): "log space" and its examples
- F-446 (terminology): "rounding boundary", "tie", "grid point", "half-way mode"
- F-447 (terminology): "edge", "boundary", "bound"; "touch", "straddle"
- F-449 (terminology): Devdocs-only built-in vocabulary: door, boundary, whole range, saturates, ulp, F-division

## `devdocs/architecture.md`

35 findings (F-222 to F-256).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/architecture.md#(top)` (first paragraph; the list of sister pages) | V2 (L108-110, L112-114) | — |
| `devdocs/architecture.md#Pipeline` (the diagram's last lines; the first sentences after it) | V2 (L118-134) | — |
| `devdocs/architecture.md#Quantities, dimensions and kinds` | A7 (L164-202), V2 (L136-148) | OVERLAP: both rewrite the kind-primitives bullet (A7 L166-181 "mark a kind of quantity that has no physical dimension"; V2 L138-140 "markers of a kind, with no dimension of their own"; the term is the terminology group's) and the `NumberContext` sentence (A7 L183-202; V2 L146-148, which adds the working grid); V2 alone adds the conformance link (L142-144) |
| `devdocs/architecture.md#Conversion` | A8 (L63-67) | — (V2's verdict, L79, also wants an opener and a link to docs/quantities.md, undrafted) |
| `devdocs/architecture.md#Unit lists` | A8 (L69-73), V2 (L212-222) | OVERLAP: V2 replaces the whole section without A8's inserted paragraph, and keeps "rounds the remainder's midpoint to the display precision", which A8's finding on the converter section corrects to the digits certified |
| `devdocs/architecture.md#Functions` | V2 (L224-236) | — |
| `devdocs/architecture.md#The converter and its lines` | A2 (L104-109), A8 (L75-95), V2 (L248-280), D9 (L277-287) | OVERLAP: A2, A8 and V2 each rewrite both re-parse sentences (V2 replaces the second with a new sentence); A2 and A8 keep "the display's `show` and `roundTerms`", which V2 corrects; the reciprocal "stays in the outcome" (A8) against "the component's view" (V2); #92 as "`[#92](…)`" (A2, A8) against "both are open in `[issue 92](…)`" (V2); the note quoted as "certified" with the code change (A2) against the quote dropped (V2 pair 3); A8's and V2's (pair 4) list paragraphs differ beyond the shared digits-certified rule; D9's two pairs touch sentences no other unit drafts |
| `devdocs/architecture.md#Expressions` | D1 (L487-576, five old→new pairs and a note on the opening sentence); V2 (L178-190, complete pared section) | OVERLAP: V2's text keeps "so the two cannot disagree" (D1 corrects it) and "The precedence follows GNU units" (D1: not verifiable); for the juxtaposition sentence D1 deletes and V2 merges; the timing rewrites differ in wording only |
| `devdocs/architecture.md#Parsing` | D1 (L578-625, two pairs); V2 (L194-200, two pairs) | OVERLAP: both rewrite the call-rule parenthetical (same substance); D1 alone fixes the composite-node span, V2 alone `string` to `symbol` |
| `devdocs/architecture.md#Evaluation` | D1 (L627-668, two pairs); V2 (L204-210, two pairs); A7 (L204-227, one pair and a deleted line) | OVERLAP: three drafts of the #88 pair (A7 "which links the open issue", D1 "which carries the open issue", V2 no note; all delete line 1119; D1 offers the inline alternative); D1 and V2 rewrite the context sentence differently (D1: every node a step, exact values never rounded; V2: the collector of assumptions) |
| `devdocs/architecture.md#Definitions` | A9 (L207-245), D2 (L385-443), V2 (L150-174) | OVERLAP: three drafts. V2 replaces the section whole, while A9 and D2 edit pairs of the current text. V2's and A9's drafts omit the prefix (D2 (F-231)). V2 keeps the lookup-throw sentence that A9 corrects. The catalogue order differs (D2 uses build order) |
| `devdocs/architecture.md#The shell and its parts` | V2 (L240-246), D9 (L267-275) | OVERLAP: V2's timing pair and its link on the settings sentence; D9's failure-state pair (Retry, link to "Offline use") and build-ID pair (link to "Updates and the build ID"); V2 wants one link only (V2 (F-252)) |

### Findings

#### F-222. The page's list of sister pages is incomplete

- Type: structure
- Target section: (top)
- Units: V2 (L71, L98, L112-114, L302)
- Where: `devdocs/architecture.md#(top)` ("This page is the overview…" and its eight bullets, page L35-49)
- Finding: the list of pages with a design of their own names eight and omits `cost.md`, `offline.md`, `future.md`, `deployment.md` and `development.md`; `README.md` is the map (§12 q18). Its `functions.md` bullet carries the "user-defined functions" wording (V2 (F-478)).
- Proposed call: replace the list with a pointer to `README.md` naming the pages leaned on most (`numbers.md`, `builtins.md`, `functions.md`, `notation.md`, `settings.md`), so the index lives in one place (V2's question 5).
- Related: Q-068, F-478
- Decision: Stands; follows Q-068 (ok).

#### F-223. The pipeline diagram ends in a `format` step that does not exist

- Type: contradicts implementation
- Target section: Pipeline
- Units: V2 (L53, L72, L88, L118-134)
- Where: `devdocs/architecture.md#Pipeline` (diagram, page L52-59)
- Claim or passage: the diagram's last line, `└──▶ format ──▶ string`.
- Finding: no `format` step exists: the pipeline ends in `convertText`, which returns a `Conversion` (the values and both texts as read), and the lines are the UI's `outcomeOf`, composed with `show` and `roundTerms`; the diagram also omits conversion into a function through `invertFunction`, which the text below it names.
- Evidence: `src/core/pipeline.ts:215-250`, `455-484`, `518-528`, `738-745`; `src/outcome.ts:194-217`
- Corrected statement: the diagram ends at `Result<Conversion>` with "(or convertToList, or invertFunction)" (V2 L118-130), and "`convertText` returns a `Conversion`, the values and the texts as read, and the UI's `outcomeOf` (`src/outcome.ts`) composes the lines from it with `show` and `roundTerms` ("The converter and its lines" below)." (V2 L132-134)
- Proposed call: **design changed without the docs following**: the plan's §1.2.5 row already tags the diagram update and V2 confirms it; the section stays as mechanism with the diagram fixed (V2 L72).
- Decision: Stands (design changed).

#### F-224. "Each arrow is one pure function in its own module"

- Type: contradicts implementation · Flags: **low confidence**
- Target section: Pipeline
- Units: V2 (L132-134)
- Where: `devdocs/architecture.md#Pipeline` (page L61-62)
- Claim or passage: "Each arrow is one pure function in its own module."
- Finding: V2's proposed text corrects it to "one pure function of the core, the two parsers of the user's texts sharing `expr.ts`", stating the correction only there.
- Evidence: none given at the edit (V2 L132-134); A8 places `parseUnitList` in `src/core/expr.ts:252-262` (A8 L30)
- Corrected statement: "Each arrow is one pure function of the core, the two parsers of the user's texts sharing `expr.ts`." (V2 L132-134)
- Proposed call: **doc wrong** if `parseExpr` and `parseUnitList` share `expr.ts` as V2's draft says; low confidence: V2 gives no evidence.
- Decision: Stands (doc wrong if `parseUnitList` shares `expr.ts`): low confidence, the session checks.

#### F-225. The `#Numbers` summary is unverified

- Type: not verified · Flags: **low confidence**
- Target section: Numbers
- Units: V2 (L73)
- Where: `devdocs/architecture.md#Numbers` (page L74-90)
- Finding: the section summarizes `numbers.md` in one paragraph and a link; V2 verified none of it, and no unit reports checking it.
- Why unverified: its statements are V1's N claims, outside V2's modules; V1 audited `devdocs/numbers.md`, not this summary.
- Proposed call: check the paragraph against the corrected N claims when `devdocs/numbers.md` is rewritten; otherwise it stays as it is, one paragraph and a link (V2 L73).
- Decision: Stands: checked against the corrected N claims when the page is rewritten (after `devdocs/numbers.md`, Q-008).

#### F-226. Conformance rules become a link to `docs/quantities.md`

- Type: structure
- Target section: Quantities, dimensions and kinds
- Units: V2 (L74, L142-144)
- Where: `devdocs/architecture.md#Quantities, dimensions and kinds` ("Conformance between `have` and `want`…" through the `rad/s` and `Hz` example, page L108-117)
- Finding: the section holds against `dimension.ts` and `quantity.ts`; what conforms to what and the arithmetic are the user's rules (`docs/quantities.md`), and the section keeps the mechanism: the roles plumbing, declaration order, the undeclared-name default (`src/core/dimension.ts:29-31`, `175`), `quantity.ts` as the pairing layer and what each operation takes, the dimension formatter's rule. V2's pair 2 gives the link and the two-step check with its reason (the physical error first, so a kind mismatch always means the same physical dimension).
- Proposed call: apply V2's pair 2 (V2 L142-144) once `docs/quantities.md#Conformance` exists, the section opening with one sentence and the link (§12 q24).
- Decision: Stands; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-227. architecture.md#Definitions: format, kinds and name rules become a link

- Type: structure
- Target section: Definitions
- Units: V2 (L75, L150-174)
- Where: `devdocs/architecture.md#Definitions`
- Finding: the section holds against `build.ts` and `table.ts` in every statement V2 checked, except the catalogue and the order sentence. The format, the six kinds and the name rules become a link to `docs/definitions.md` (and to `docs/expressions.md` for how a name is read). What stays as mechanism: what the parser keeps and rejects, the walk, the primitives collected first, the namespaces as the build applies them, the lookup's one throw, lists and inverses outside the walk and functions in it, the ceiling and undecided conditions, the ambiguity check, the five modules and their order, and the catalogue.
- Proposed call: apply V2's pared section (§12 q24), merged with A9's and D2's pairs (see Proposed text).
- Decision: Stands; follows Q-031 (ok) and F-475; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-228. User definitions described as if the app took them

- Type: contradicts implementation
- Target section: Definitions
- Units: A9 (L38, L209-215), V2 (L59, L154)
- Where: `devdocs/architecture.md#Definitions` (page L170-172)
- Claim or passage: "`buildTable` takes one list of definitions, so user definitions are simply appended to the system ones."
- Finding: this is true of the function but of no UI: only the system file is loaded today (§12 q12).
- Evidence: `src/core/build.ts:291-295`; §12 q12
- Corrected statement: A9: "`buildTable` takes one list of definitions and knows nothing of where they came from; today the system file is the whole list, and user definitions, when the app takes them, append to it and pass the same checks." V2: "`buildTable` takes one list of definitions, so that user definitions, once the app has a way to enter them, are appended to the system ones; today only the system file is loaded."
- Proposed call: **doc wrong**. The page describes a deferred design (#132) as current; both units' stale rows are tagged update.
- Decision: Stands (doc wrong); amended by Q-011 and F-475: the sentence says that `buildTable` takes one list, and that today the predefined definitions file is the whole list; that user definitions are to come, and #132, are `devdocs/future.md`'s.

#### F-229. The parser's rejection lists omit `inverseAnnotation`

- Type: contradicts implementation · Flags: **conflict**
- Target section: Definitions
- Units: D2 (L47, L135, L144, L276-278, L387-389, L471), V2 (L75, L95, L158), V4 (L147-149)
- Where: `devdocs/architecture.md#Definitions` (page L199-206); `devdocs/functions.md#Definitions` (page L87-90); `devdocs/functions.md#Annotations`. Only `devdocs/functions.md#Where it lives` (page L710) names it.
- Claim or passage: "The parser rejects an annotation with a number other than `1`, a sum, a negation or a call, and a parameter named like a unit its own head's annotations use, each where it is written; it reserves a `[` …"; and an inverse's parameter "takes no annotation, since that dimension is known"
- Finding: the definitions parser also rejects an annotation on an inverse's parameter, at the annotation (`inverseAnnotation`).
- Evidence: `src/core/definitions.ts:530-552` (`:541-545`), `:216`; the kinds at `:205-226`; tests `src/core/definitions.test.ts:426-438`, `:490-496`, `:679-688`
- Corrected statement: D2 (L389) rewrites the list: "The parser rejects, each where it is written: a chain that turns, `0 < x > 1`; an annotation with a number other than `1`, a sum or difference, a negation or a call; an annotation on an inverse's parameter; a parameter named twice, at its second occurrence; and a parameter named like a unit its own head's annotations use, at the annotation's use of the name. …" `functions.md#Definitions` adds "(one written there is rejected where it stands, `inverseAnnotation`)" (D2 L278 = V4 L149). V2's pared section names all seven kinds (V2 L158).
- Conflict: D2 says the sentence also omits a duplicate parameter and a turning chain (L47); V2 says only `inverseAnnotation` is missing (L75). The page does name both outside that sentence: "none named twice" (page L194) and a turning chain "is rejected" (page L201-202). Every draft lists all seven, so the rewrite is unaffected.
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong).

#### F-230. The lookup's one throw: right about the cause, loose about the place

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Definitions
- Units: A9 (L98-105, L225-231)
- Where: `devdocs/architecture.md#Definitions` (page L241-246)
- Claim or passage: "A lookup has no error to return for a refusal, so the one case that could reach it, a definition that puts a unit within a prefix's factor of the bound, throws (`table.ts`)."
- Finding: the build's own lookup returns the refused prefix-times-unit product as a located error, so a definition that writes such a form fails the build. Only a user's input naming a prefixed form that no definition uses reaches the throw.
- Evidence: `src/core/table.ts:204-212`; `src/core/build.ts:917-933`; D2's build table has `tooLarge`, `overflow` and `underflow` at a name's span (D2 report)
- Corrected statement: "…the one case that could reach it, a user's input naming a prefixed form of a unit that a definition put within a prefix's factor of the bound, throws (`table.ts`); the build's own lookup reports the same product refused at the reference that forms it, so a definition that writes such a form fails the build instead." (A9 L229-231)
- Conflict: V2 keeps the sentence verbatim in its pared section (V2 L164) and records the throw as known and documented (V2 L71, L75; V2 L71).
- Proposed call: **doc wrong** (A9 reasoned from code, and D2's table supports the located error). V2's check established that the throw exists, not which input reaches it.
- Decision: Stands (doc wrong); low confidence: the session reads `table.ts:204-212` and `build.ts:917-933`.

#### F-231. A prefix's body evaluates call conditions at build too

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Definitions
- Units: D2 (L48, L391-393)
- Where: `devdocs/architecture.md#Definitions` (page L288-291)
- Claim or passage: "A unit, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built, at the ceiling, and one left undecided fails the build, since a unit has nowhere to carry the warning."
- Finding: a prefix's body is evaluated the same way.
- Evidence: `src/core/build.ts:485-491`
- Corrected statement: "A unit, a prefix, a list's unit or an annotation that calls a function evaluates the call's conditions when the table is built, at the ceiling, and one left undecided fails the build, since a definition has nowhere to carry the warning." (D2 L393)
- Conflict: V2 finds `#Definitions` holds except the catalogue and the order sentence (V2 L75). V2's pared text keeps "a unit, a list's unit or an annotation" (L168), and its catalogue says "a unit's, a list's or an annotation's body" (L174). A9's statement and catalogue draft list the same three (A9 L87-97, L241-245).
- Proposed call: **doc wrong** if `src/core/build.ts:485-491` runs a prefix's body through the same check (D2 reasoned from code only). D2's own catalogue already includes the prefix.
- Decision: Stands (doc wrong if `build.ts:485-491` is as D2 reads it); low confidence: the session checks.

#### F-232. The orphan-inverse check runs right after indexing

- Type: contradicts implementation
- Target section: Definitions
- Units: A9 (L81-86, L233-239), D2 (L46, L49, L87, L99, L145, L377-379, L395-397), V2 (L60, L172), V4 (L46, L419-421)
- Where: `devdocs/architecture.md#Definitions` (page L316-323); `devdocs/functions.md#Build-time checks` (page L625-626)
- Claim or passage: architecture: "index the definitions by name, rejecting a duplicate; check the index for an ambiguous name, …"; functions.md: "Checking it means finding its function (a build error when there is none, or when the function has several parameters)"
- Finding: the build rejects an inverse of no defined function right after indexing, before the ambiguity check and before any body is looked at (`orphanInverse`). An inverse of a function of no parameters fails too, like one of several (`inverseArity`). No page states the order of the build's checks in full (D2 L145).
- Evidence: `src/core/build.ts:296-390` (`:300-304`), `:643-650`
- Corrected statement: in architecture, after indexing, insert "reject an inverse of no defined function;" (A9 L239, V2 L172) or "check that every inverse names a defined function;" (D2 L397). In functions.md: "An inverse of no defined function is found as soon as the definitions are indexed, before any body is looked at (`orphanInverse`). Checking an inverse in its place means requesting its function, which must have exactly one parameter (`inverseArity` otherwise, for none as for several), …" (D2 L379 = V4 L421)
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong); follows Q-031 (the order stated in devdocs; the kinds in the docs table).

#### F-233. The build-error catalogue omits four kinds

- Type: contradicts implementation
- Target section: Definitions
- Units: A9 (L87-97, L241-245, L355-358), D2 (L50, L399-443), V2 (L60, L75, L174, L299)
- Where: `devdocs/architecture.md#Definitions` (page L325-345)
- Claim or passage: "A build error is one of: … or an arithmetic failure from the evaluator, located as the evaluator locates it." The catalogue reads as complete.
- Finding: `BuildError` also has `inverseArity`, `nonconformingComparison` and `conditionWithoutParameter`. The build also fails with its own `undecidedCondition` when a call inside an evaluated body leaves a condition undecided.
- Evidence: `src/core/build.ts:158-262` (`:218-222`, `:244-251`, `:257-261`), `:800-816`; `src/core/evaluate.ts:335-341`
- Corrected statement: a completed catalogue (A9 L241-245; V2 L174; D2 L403-442, which puts it in build order and ends "No message is worded for a build error today, only the system file being loaded"). V2's question 2: keep it in prose.
- Proposed call: **doc wrong**. Three drafts need reconciling: their order, whether they include the prefix (see the finding on a prefix's body, D2 (F-231)), and D2's closing sentence.
- Related: Q-031
- Decision: Stands (doc wrong); follows Q-031 (ok: devdocs keep how the checks run and point at the docs table; no completed prose catalogue).

#### F-234. Expression devdocs sections: what becomes a link, what stays

- Type: structure
- Target section: Expressions
- Units: V2 (L76-78, L176-190), D1 (L487-576, L700)
- Where: `devdocs/architecture.md#Expressions` (page lines 347-442); `devdocs/architecture.md#Parsing`; `devdocs/architecture.md#Evaluation`; `docs/expressions.md` (to be written); plan §9.1, §12 q24
- Finding: `#Expressions` restates the precedence and the `-` rules that `docs/definitions.md#Expressions` states (§9.1), after an opening that names `docs/definitions.md` in plain text, not as a link. V2's verdicts: in `#Expressions` the precedence, the `-` rules and the user's side of the call rule become a link to `docs/expressions.md`, while the data-driven levels, the tree's six nodes, spans, the three parser decisions (the lexical call rule, the undivided exponent, maximal names), the list grammar, the printer and its pieces stay as mechanism (complete pared text, L178-190); `#Parsing` stays whole (the combinators and the Pratt alternative, the three properties, the discipline new grammars follow, the call-rule reason as intent); `#Evaluation` stays as mechanism, its issue pointer moving to the one owner. D1 asks that the opening sentence become a link once the reference exists (§12 q24). V2 finds `#Expressions` and `#Parsing` holding where D1 corrects them: F-237, F-240, F-243, and D1 (F-241).
- Proposed call: Pare `#Expressions` to V2's split once `docs/expressions.md` exists (V2 Q1), folding in D1's corrections rather than taking V2's text as it stands; keep `#Parsing` and `#Evaluation`; when `docs/expressions.md` states evaluation order and error locations, `#Evaluation` opens with a sentence and a link to it (§12 q24).
- Decision: Stands; follows Q-038 (the header grammar named) and Q-039 (one clause for GNU units at most); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-235. Juxtaposition is its own operator in the tree, not plain `*`

- Type: contradicts implementation · Flags: **conflict**
- Target section: Expressions
- Units: D1 (L35, L96, L503-516), V2 (L56, L76, L90, L182)
- Where: `devdocs/architecture.md#Expressions` (page lines 387-388)
- Claim or passage: "In the tree it is an ordinary multiplication, indistinguishable from `*`."
- Finding: The tree keeps juxtaposition apart as its own operator, `juxtapose`; only the evaluator treats it as `*`, and the printer writes it back with a space. The section says so itself four paragraphs later, so it contradicts itself.
- Evidence: `src/core/expr.ts:130-136`, `:222`; `src/core/evaluate.ts:574-583`; `src/core/print.ts:95-103`
- Corrected statement: (D1) "In the tree, juxtaposition is its own operator, `juxtapose`, which the evaluator multiplies as it does `*` and the printer writes back with a space; the section's last paragraph says so, and the sentence is tagged drop under Stale passages." V2's rewrite: "The evaluator treats it as `*`; the tree keeps it apart, as `juxtapose`, so that the printer can write `2 m` back as it was read."
- Conflict: Tags differ: D1 tags the sentence drop (L35: delete it, the later paragraph stating the operator and why), V2 tags it update (L56: rewrite in place; its pared text, L182, merges the two statements).
- Proposed call: design changed without the docs following: `juxtapose` is deliberate (the printer writes `2 m` back as read) and the sentence describes an earlier tree; drop it if the later paragraph keeps the reason (D1), or take V2's merged paragraph; either removes the contradiction.
- Decision: Stands (design changed; drop or merge).

#### F-236. The binary-operation node list omits juxtaposition

- Type: contradicts implementation
- Target section: Expressions
- Units: D1 (L100, L538-551)
- Where: `devdocs/architecture.md#Expressions` (page lines 415-416)
- Claim or passage: "The tree has six kinds of node: a number, a unit name, a binary operation (a sum, difference, product or quotient) of two subtrees, …"
- Finding: The six kinds hold, but the binary operation has a fifth operator, juxtaposition. D1's row verdict is "confirmed", with the correction as a note.
- Evidence: `src/core/expr.ts:149-167` (`ExprNode`); `src/core/print.test.ts:153-174`
- Corrected statement: (D1) "a binary operation (a sum, difference, product, quotient or juxtaposition) of two subtrees"
- Proposed call: doc wrong: it follows from the tree's `juxtapose` (F-235); D1's pair and V2's pared text (L178-190) make the same fix.
- Decision: Stands (doc wrong).

#### F-237. `LEVELS` and `BINARY` keep parser and printer in step only for operators

- Type: contradicts implementation · Flags: **conflict**
- Target section: Expressions
- Units: D1 (L52, L102, L204, L553-574)
- Where: `devdocs/architecture.md#Expressions` (page lines 426-430); plan §2.1.3
- Claim or passage: `LEVELS` and `BINARY` build the parser's two left-associative levels, and the printer "writes a tree back by it, so the two cannot disagree".
- Finding: Only the binary operators' levels and symbols are shared data; the printer adds three positional rules the levels do not express (a negation's operand written at the product, a power's base at the atom, a right operand of a juxtaposition that leads with a number parenthesized), the nesting of the levels, the negation, the power and the number-first rule are written in each, and the property test is what keeps the two in step.
- Evidence: `src/core/expr.ts:360-370` (`operatorsAt`), `:486-508`; `src/core/print.ts:14-23`, `:92-119`; `src/core/print.test.ts:134-151`
- Corrected statement: (D1) "The binary operators' levels and symbols are shared data, so the parser and the printer cannot disagree on an operator; the nesting of the levels, the negation, the power and the rule that a number only starts a product are written in each, and the property test keeps the two in step."
- Conflict: V2 (L76) finds `#Expressions` holding apart from the juxtaposition sentence and the timing, and its pared text (L178-190) keeps "so the two cannot disagree".
- Proposed call: doc wrong: the printer's positional rules (`src/core/print.ts:14-23`) are deliberate and the property test carries the rest; settle V2's verdict against those lines and do not take V2's sentence as it stands. The plan's §2.1.3 repeats the claim (plan side).
- Related: F-501
- Decision: Stands (doc wrong); F-501 amends §2.1.3.

#### F-238. "Stays the product it always was"

- Type: stale (update)
- Target section: Expressions
- Units: D1 (L34, L489-501)
- Where: `devdocs/architecture.md#Expressions` (page lines 377-378)
- Passage: "so `kg (m/s)` stays the product it always was and `kg(m/s)` is a call of `kg`"
- Tag: update (D1; plan row new)
- Rewrite: "so `kg (m/s)` is a product" (D1 L34, pair L489-501); V2's pared text (L178-190) drops the phrase too.
- Proposed call: Confirm `update`: "stays … it always was" points at an earlier grammar, and the present-tense fact is all the passage needs.
- Decision: Stands (update).

#### F-239. Parser-reduction rationale carries timings and a past design

- Type: stale (keep as intent)
- Target section: Expressions
- Units: D1 (L36, L518-536), V2 (L57, L76, L186)
- Where: `devdocs/architecture.md#Expressions` (page lines 406-408)
- Passage: "The parser has no context, and a reduction there took seconds on long literals and minutes at the hard bound, on every keystroke."
- Tag: keep as intent (D1 and V2; plan row new); also a timing (§12 q25), which both units flag as a measurement
- Rewrite: The ruled-out alternative without the timings: the parser has no context to bound a reduction by, and Euclid's gcd at the hard bound is far too slow to run on every keystroke, so the evaluator reduces the exponent within the significand limit in force (D1 L36, L518-536; V2 L57, L186, whose pared section ends at "every keystroke").
- Proposed call: Confirm `keep as intent`: reducing in the parser is a ruled-out alternative worth keeping; the timings go (§12 q25); the two rewrites agree.
- Decision: Stands (keep as intent; the timings go with the ruled-out alternative's rewrite).

#### F-240. "The precedence follows GNU units" is unverified

- Type: not verified · Flags: **conflict**, **low confidence**
- Target section: Expressions
- Units: D1 (L88, L689)
- Where: `devdocs/architecture.md#Expressions` (page lines 354-355)
- Finding: The page says the precedence follows GNU units; `src/core/expr.test.ts:150` repeats it ("As in GNU units: the first `/` starts the denominator of what follows").
- Why unverified: The tree holds no grammar of GNU units, so nothing in it confirms the likeness.
- Conflict: V2 (L76) finds the section holding apart from two other sentences, and its pared text (L178-190) keeps "The precedence follows GNU units." verbatim; V2 cites no check of the claim.
- Proposed call: Owner decides (D1 Q2): devdocs keep one clause as the rationale (a familiar convention for `kg m / s^2`) or drop it; the user reference says nothing of GNU units for the grammar (§12 q2), since a likeness stated there would owe the differences (`|` and `**` are errors here).
- Decision: Stands; follows Q-039 (ok: at most one clause naming GNU units as the familiar convention behind the precedence; nothing in the user reference).

#### F-241. `#Parsing`'s "in two ways only" omits a third case

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Parsing
- Units: D1 (L695, L700), V2 (L77)
- Where: `devdocs/architecture.md#Parsing` (page L495-503)
- Claim or passage: an alternative "fails after consuming input in two ways only".
- Finding: a parenthesized expression that fails inside (`(2 m`), the last alternative of its `alt`, is a third case; the cost argument the passage makes still holds. D1 handed it to V2 (D1's question 8, L695; hand-off, L700); V2's report says `#Parsing` "holds in every statement", with one nit (`symbol("^")`), and does not touch the sentence.
- Evidence: `src/core/expr.ts:429-433`
- Corrected statement: name the parenthesized expression that fails inside as the third case (D1 L695).
- Conflict: D1 (L695) finds the sentence incomplete; V2 finds `#Parsing` holds in every statement (V2 report, V2 L77).
- Proposed call: **doc wrong** if `src/core/expr.ts:429-433` is as D1 reads it; low confidence (reasoned from code, not run): check those lines against the page's two cases and, if D1 is right, add the third case to V2's `#Parsing` edits.
- Related: Q-100
- Decision: Stands (doc wrong if `expr.ts:429-433` is as D1 reads it); follows Q-100 (ok); low confidence: the session checks.

#### F-242. Call-rule history in `#Parsing`, kept as intent

- Type: stale (keep as intent)
- Target section: Parsing
- Units: D1 (L33, L578-607), V2 (L52, L77, L198-200)
- Where: `devdocs/architecture.md#Parsing` (page lines 512-519); plan §1.2.5
- Passage: "(The call rule broke it once: a call and a name began alike, told apart only by a lookahead for `(`, so a nested call with an error in it cost `2^k` … A cut combinator … was set aside for the fix …)"
- Tag: keep as intent; plan row confirmed (§1.2.5) by D1 and V2 (`src/core/expr.ts:408-422`: the lookahead includes the name's own characters)
- Rewrite: Present tense: a plain name's lookahead includes its own characters, so a match cannot back off to a shorter name before a `(`; without it a nested failing call is read again at every level (`2^k`); a cut combinator is ruled out, since a misplaced cut changes the meaning of valid input (D1 L33, L593-607; V2 L52, L198-200).
- Proposed call: Confirm `keep as intent`; the two rewrites agree in substance: take one wording.
- Decision: Stands (keep as intent; one wording).

#### F-243. A composite node's span includes its `-`, its `)` and its parentheses

- Type: contradicts implementation · Flags: **conflict**
- Target section: Parsing
- Units: D1 (L112, L609-625)
- Where: `devdocs/architecture.md#Parsing` (page lines 551-553)
- Claim or passage: "Spans are attached with `spanned` on the leaves, and a composite node spans from its first child to its last."
- Finding: A negation spans from its `-`, a call from its name to its `)`, and an expression in parentheses with its parentheses, which is what a message quotes.
- Evidence: `src/core/expr.ts:93-94`, `:382-385`, `:395-406`, `:497-499`; `src/core/expr.test.ts:484-515`, `:589-610`
- Corrected statement: (D1) "A composite node spans from its first part to its last: a negation from its `-`, a call from its name to its `)`, and an expression in parentheses with its parentheses, which is what a message quotes (`1 / (2 - 2)` quotes `(2 - 2)`)."
- Conflict: V2 (L77) finds `#Parsing` holding "in every statement", with one nit (the `string`/`symbol` example).
- Proposed call: doc wrong: the spans are tested and are what the messages quote; V2's section-level verdict does not cite these lines.
- Decision: Stands (doc wrong).

#### F-244. `string("^")` is `symbol("^")` in the grammar

- Type: contradicts implementation
- Target section: Parsing
- Units: V2 (L77, L94, L194-196)
- Where: `devdocs/architecture.md#Parsing` (page line 481)
- Claim or passage: "an optional exponent, written `optional(seq(string("^"), exponent))`, may consume the `^` before finding no exponent"
- Finding: The grammar writes `symbol("^")`, a token that includes the whitespace after it.
- Evidence: `src/core/expr.ts:475`
- Corrected statement: (V2) `optional(seq(symbol("^"), exponent))`
- Proposed call: doc wrong (a nit); D1 confirmed that the combinators the section names exist (L113) without checking this example.
- Decision: Stands (doc wrong).

#### F-245. V2's `#Conversion` verdict has no drafted text

- Type: structure
- Target section: Conversion
- Units: V2 (L79)
- Where: `devdocs/architecture.md#Conversion` (page L653-679)
- Finding: V2's verdict makes what a conversion answers a link to `docs/quantities.md` and keeps as mechanism the error kinds, which of them are retried, and the context for the size prediction; V2's proposed edits (L102-280) touch eleven sections and not this one, so the opener and the link are undrafted. The section's only drafted text is A8's significand-limit sentence (A8 L63-67).
- Proposed call: when the section is pared, write the one-sentence opener and link that V2's verdict calls for (§12 q24) and apply A8's sentence.
- Decision: Stands: the opener and link written in the section's one-pass rewrite (Q-008); A8's sentence applied (F-070).

#### F-246. A typed list's unit straddling zero at a pass is never retried

- Type: gap (new)
- Target section: Unit lists
- Units: A8 (L53, L69-73, L149)
- Where: `devdocs/architecture.md#Unit lists`; `devdocs/numbers.md#Working precision and the schedule` (page L891-896)
- Gap: a unit of a typed list whose ball straddles zero at a pass is `nonpositiveUnit`, which the retry loop never retries, where the same expression as a single want is retried as a want that cannot be told from zero (`1 m` into `(1e-30 + approx(1) - 1) m` gives `1 m ≈ 1e+30 × (1e-30 + approx(1) - 1) m`; into `ft;(1e-30 + approx(1) - 1) m` it is refused as not positive); the code calls it an accepted gap (`src/core/pipeline.ts:93-96`, `394-404`). A8 reports that no page states it, but `devdocs/numbers.md#Working precision and the schedule` does ("Two gaps are accepted. A list unit whose ball straddles zero is the list's `nonpositiveUnit`, and the loop ends on it rather than retrying…", page L891-896, read for this triage; A8 did not read that page), so the gap is `#Unit lists`' and the user docs'.
- Sources: `devdocs/numbers.md#Working precision and the schedule` (page L891-896); `src/core/pipeline.ts:93-96`, `394-404`
- Proposed call: `#Unit lists` states the accepted gap, by A8's paragraph (A8 L69-73) or a sentence pointing at `numbers.md`'s statement; the owner decides between stating it and retrying `nonpositiveUnit` (A8's question 4).
- Related: Q-045, B-010
- Decision: Stands; follows Q-045 (ok: the accepted gap stated as today's behaviour; the retry is issue #198, linked once from `#Unit lists` beside the gap: plan §12.2, item 14, kept by R-3, plan §12.3); amended by F-442 ("refused as not positive" is an error, not a size refusal: "fails as not positive").

#### F-247. `#Unit lists` pared to its mechanism

- Type: structure
- Target section: Unit lists
- Units: V2 (L80, L212-222)
- Where: `devdocs/architecture.md#Unit lists` (page L681-750)
- Finding: the section holds against the code, every example reproducing (V2 report); the rules and the answer become a link to `docs/quantities.md` (§9.1), and the section keeps the count rule's mechanics, `roundTerms` and its rebuild fallback, and how the pipeline reads the want. V2's full replacement also adds a defined function's bare name to the pipeline paragraph's readings (Q17), which the page's "any other one item is a unit" leaves out.
- Proposed call: apply V2's replacement once `docs/quantities.md#Unit lists` exists, merging A8's accepted-gap paragraph and reconciling its "rounds the remainder's midpoint to the display precision" (page L720-722, kept by V2) with the rounding at the digits certified that A8 establishes for the converter section.
- Decision: Stands; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist; the remainder's rounding follows F-072.

#### F-248. A built-in's bare name as the want is `functionAsUnit`

- Type: contradicts implementation
- Target section: Functions
- Units: V2 (L81, L226-232, L308)
- Where: `devdocs/architecture.md#Functions` (built-ins paragraph, page L815-816)
- Claim or passage: "A built-in has no inverse, so its name is not a `want`."
- Finding: the reason is not the missing inverse: the pipeline looks a want up among the defined functions only, so a built-in's bare name falls to the unit lookup, which refuses it as `functionAsUnit`, not `noInverse`. A8 ran it (`1` into `sin` is refused as a function, not a unit; A8 L30, A8 report) and reads it as how the page's sentence is realized.
- Evidence: `src/core/pipeline.ts:518`; `src/core/table.ts:184-192`; harness (A8 L30)
- Corrected statement: "A built-in has no inverse and is not looked up as a `want`: its bare name there is a `functionAsUnit` error, as a defined function's name is anywhere but in a call or as the `want`." (V2 L230-232)
- Proposed call: **doc wrong**: the causality misleads while the effect is right; a precision, applied with V2's pair.
- Related: F-308
- Decision: Stands (doc wrong).

#### F-249. Which page carries the design of the table at the ceiling

- Type: other
- Target section: The shell and its parts
- Units: A9 (L331-337)
- Where: `devdocs/architecture.md#The shell and its parts` (page L895-913); `devdocs/numbers.md#Working precision and the schedule`
- Finding: `src/system-build.ts:2` and `src/system-table.ts:10` cite "The shell and its parts" as the design of the table at the ceiling, which `devdocs/numbers.md#Working precision and the schedule` states in full; A9 asked V2 and D9 to confirm that the shell section carries the design or to have the comments point at `numbers.md` (A9's question 7). Neither report answers: V2 checks the section against those modules' headers and finds it holds (V2 report), and D9's edits to the section (D9 L267-275) leave it.
- Proposed call: settle A9's question 7: either the shell section is the design and links `numbers.md` "Working precision and the schedule" for the reason, or the comments point at `numbers.md` (code side in bugs.md).
- Related: Q-059, B-056
- Decision: Stands: the session of `devdocs/architecture.md` settles A9's question 7 with V2's rewrite of the shell section; B-056 follows in the comment pass (Q-059).

#### F-250. The shell's parse carries a timing, "(a few milliseconds)"

- Type: measurement
- Target section: The shell and its parts
- Units: V2 (L61, L82, L99, L240-242)
- Where: `devdocs/architecture.md#The shell and its parts` (page L895-896)
- Finding: "parses it on the main thread (a few milliseconds), once" is a timing (§12 q25); the reason is in `src/system-table.ts:6-8`. V2 tags it stale (update).
- Proposed call: Drop the figure and keep the reason: "parses it on the main thread, once, the parse being quick enough that a worker would cost more than it saves" (V2 L240-242).
- Related: F-338
- Decision: Stands (drop the figure, keep the reason); Q-016 would let "(a few milliseconds)" stay as a rough, illustrative figure: the session's choice.

#### F-251. The shell section says "build number" for the build ID

- Type: stale (update)
- Target section: The shell and its parts
- Units: D9 (L42, L79, L273-275, L325)
- Where: `devdocs/architecture.md#The shell and its parts` (page L935-936)
- Passage: "and checks for an update when its build number is tapped (`[offline.md](offline.md)`)"
- Tag: update (D9; new)
- Rewrite: "and checks for an update when its build ID is tapped (`[offline.md](offline.md)`; what the user sees of it is in `[docs/app.md](../docs/app.md)`, "Updates and the build ID")" (D9 L273-275); D9 calls it the section's only correction (L325), and its second pair adds the Retry button to the failure state (L269-271).
- Proposed call: Confirm `update` (a commit hash, not a number: `src/build-id.ts:1-14`); the term is the terminology draft's (V8's own drafts write "the build"), and the anchor follows app.md's section name.
- Related: Q-022, F-492
- Decision: Stands (update); follows Q-022 (A: "build ID"; the anchor is `app.md`'s "Updates and the build ID").

#### F-252. UI sections stay as mechanism; how many links to docs/app.md

- Type: structure · Flags: **conflict**
- Target section: The shell and its parts
- Units: V2 (L82, L244-246), D9 (L97, L267-275)
- Where: `devdocs/architecture.md#UI`, `#The shell and its parts`, `#Not in this design`
- Finding: The sections are mechanism (how the shell, the sheet and the footer are built) and ruled-out alternatives, and they stay, with the timing removed; what a user does with the sheet, installing, offline use and updates belong to `docs/app.md` (§12 q3).
- Conflict: V2 gives the sections "one link there and … nothing else" (on the settings sentence, V2 L244-246); D9 adds two links in the same section (the failure state, to "Offline use"; the build ID, to "Updates and the build ID") and a sentence on the Retry button and that the app never retries on its own (D9 L267-275).
- Proposed call: Settle by §12 q24 (a section opens with one sentence and a link to its docs owner): choose one place among the three; the Retry fact may stay as mechanism.
- Related: F-169, F-249
- Decision: Stands: one link per §12 q24, the session choosing the place; the Retry fact may stay as mechanism.

#### F-253. The outcome does not parse the want again

- Type: contradicts implementation · Flags: **conflict**
- Target section: The converter and its lines
- Units: A2 (L48-49, L67, L104-109, L156), A8 (L41-42, L56, L75-95), V2 (L62-63, L83, L91, L250-256, L308), D9 (L46, L80, L287, L325)
- Where: `devdocs/architecture.md#The converter and its lines` (page L982-985 and L1006-1008)
- Claim or passage: `src/outcome.ts` "calls the display's `show` and `roundTerms`, and parses the `want` again to write it"; "The component parses the `want` once more to tell, which is the same parse the pipeline did a moment earlier."
- Finding: nothing parses the want again: the pipeline's `Conversion` carries both texts as read (`haveExpr`, `wantExpr`, a listed unit's `expr`, the parameter's `unit.expr`), the outcome writes each side from them, `leadsWithNumber` reads the `×` form off the tree and the printer sets the parentheses by the grammar's levels; only a blank want, a quantity alone, has the have parsed again. D9 confirms from the component's side: it imports no parser.
- Evidence: `src/core/pipeline.ts:215-262` (`221-223`); `src/outcome.ts:328-334`, `379-384`, `470-482`; `src/core/print.ts:136-147`; `src/unit-converter.ts:194-204` (D9)
- Corrected statement: three drafts, one substance: A2 "writes the `want` from the expression the pipeline read (`Conversion.wantExpr`), re-parsing only the `have` of a definition line" and "The outcome tells from the `want`'s expression as the pipeline read it; nothing is parsed twice." (A2 L104-109); A8 "writes each side from the expression the conversion carries as it was read, parsing the `have` again only for a blank `want`" and "The printer tells from the tree the conversion carries, by the grammar's levels; nothing is parsed a second time." (A8 L77-83); V2's pairs 1-2 (V2 L250-256).
- Conflict: tags for the second passage differ: update (A2 L49; A8 L42) against drop (V2 L63), though V2's own pair 2 substitutes a sentence (V2 L254-256), an update in effect; all three tag the first passage update.
- Proposed call: **design changed without the docs following**: the `Conversion` deliberately hands the parsed expressions back, three units and D9 agree, and the plan's §1.2.4 and §5 C1, C4 repeat the older mechanism (plan errors); confirm `update` for both passages.
- Related: Q-074, F-505
- Decision: Stands (design changed; update both); follows Q-074 (ok: the plan corrected).

#### F-254. `roundTerms` is `convert.ts`'s, not the display's

- Type: contradicts implementation
- Target section: The converter and its lines
- Units: V2 (L62, L97, L252, L292)
- Where: `devdocs/architecture.md#The converter and its lines` (page L982-983)
- Claim or passage: "it calls the display's `show` and `roundTerms`".
- Finding: `show` is `display.ts`'s; `roundTerms` is `convert.ts`'s.
- Evidence: `src/core/display.ts:238`; `src/core/convert.ts:269`
- Corrected statement: "`show` of `display.ts` and `roundTerms` of `convert.ts`" (V2 L250-252).
- Proposed call: **doc wrong**: an attribution slip in the sentence the re-parse finding rewrites; A2's and A8's rewrites of that sentence (A2 L104-109, A8 L77-79) keep "the display's `show` and `roundTerms`".
- Related: F-499
- Decision: Stands (doc wrong); follows F-499.

#### F-255. The reciprocal is computed in `src/outcome.ts`, not "the component"

- Type: contradicts implementation
- Target section: The converter and its lines
- Units: A8 (L27, L43, L52, L89-91, L142, L150), V2 (L41, L274-276), D9 (L46, L80)
- Where: `devdocs/architecture.md#The converter and its lines > The reciprocal` (page L1074)
- Claim or passage: "and it stays in the component: it is a second view of the same value, like the rounding, not a step of the conversion".
- Finding: the component, `src/unit-converter.ts`, computes no reciprocal (its one computation is `outcomeOf`, D9); the outcome module computes it, as one `step` of `1 / value` at the user's context, settled in exact mode and rounded once in decimal mode, the line pushed only when it succeeds; every exclusion of Q14 holds. The comment at `src/core/pipeline.ts:95` says the same as the page ("the reciprocal line the component computes"; code side in bugs.md); A8 L142's other two comments (`src/core/convert.ts:45-48`, `src/core/pipeline.ts:16-17`) are code only.
- Evidence: `src/outcome.ts:323-337`; `src/unit-converter.ts:194-204` (D9); harness, Q14 rows (A8 L27)
- Corrected statement: A8: "and it stays in the outcome (`src/outcome.ts`), outside the pipeline: a second view of the same value, like the rounding, not a step of the conversion" (A8 L89-91); V2: "and it stays in the component's view (`src/outcome.ts`): …" (V2 L274-276). The naming differs ("the outcome", A8's terminology row A8 (F-472), against "the component's view").
- Proposed call: **design changed without the docs following**: A8 tags the passage update, and the page and the comment at `pipeline.ts:95` both name a component that computes only `outcomeOf`; the intent, a second view and not a step of the conversion, holds; the wording waits on the terminology finding.
- Related: B-034, B-037, F-472
- Decision: Stands (design changed); follows F-472 ("the outcome" for `src/outcome.ts`); B-037 is the code side.

#### F-256. Converter section: what becomes links to `docs/`

- Type: structure
- Target section: The converter and its lines
- Units: V2 (L83, L248-280), D9 (L277-287)
- Where: `devdocs/architecture.md#The converter and its lines` (page L966-1100)
- Finding: the section holds against `src/outcome.ts` in every statement about what is shown, apart from the findings above; the relation and the notes become a link to `docs/numbers.md`, and the list's line, the function's line and when a reciprocal exists become links to `docs/quantities.md` (§9.3's split owner); it keeps the component's properties and state, `outcomeOf` as a pure view, how a line is composed from the pipeline's expressions, the printer's two glyphs and the copy path, why the reciprocal line is written swapped (GNU units' verbose form ruled out), why a list has none (three readings ruled out), and the reciprocal as one step outside the retry loop with the issue inline. V2's pairs 3-6 draft the links; pair 3 also lists a fourth note, "a step could not be certified at the precision limit", which the page's list of three omits (A2 L63 lists the four `noteOf` wordings). D9 quotes the labels as written ("You have", "You want"), mentions the hint while the have is blank and links `docs/app.md` ("The two fields", "Copying a result").
- Proposed call: apply V2's and D9's links with §12 q24's one-sentence openers once `docs/numbers.md`, `docs/quantities.md` and `docs/app.md` exist (V2's question 1: after the D units' pages).
- Related: F-471
- Decision: Stands; follows F-471 (A: the labels named in `app.md`), F-468 (modes by their want), Q-007; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

### Findings owned by other pages that touch this one

- F-001 (docs/README.md): The app is framed as a unit converter after GNU units
- F-009 (docs/getting-started.md): Getting started is missing entirely (§6.7); D9 verified its facts
- F-021 (docs/numbers.md): "Certain" becomes "certified" in every page quoting the notes
- F-033 (docs/numbers.md): The call-cost paragraph triplicated; where its parts go
- F-038 (docs/numbers.md): N19: the reciprocal line is the reciprocal of the shown ratio
- F-070 (docs/quantities.md): A conversion's ratio is also refused at the significand limit (Q13)
- F-072 (docs/quantities.md): A list's remainder is rounded at the digits it certifies (Q15)
- F-074 (docs/expressions.md): No grammar or precedence table in docs/; a header grammar exists in code
- F-085 (docs/expressions.md): Evaluation order and error locations missing from docs/
- F-086 (docs/expressions.md): The printed form missing from docs/
- F-089 (docs/expressions.md): How parse errors read is missing from docs/
- F-095 (docs/definitions.md): The call rule stated in four places
- F-108 (docs/definitions.md): "How to add to it": the page has no such section
- F-169 (docs/app.md): The loading and failure messages are stated nowhere
- F-170 (docs/app.md): The load-failure message shows the internal kind "(fetchFailed)"
- F-190 (devdocs/numbers.md): Products and quotients take the context too, in three passages
- F-328 (devdocs/notation.md): Reference-style issue links: #178 here, #92 on architecture.md
- F-411 (cross-cutting): Issue #88: linked from two pages; `numbers.md` agreed as its place
- F-412 (cross-cutting): Issue #92: one link today, at "The reciprocal"; no second to remove
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-427 (terminology): "certain" for certified digits
- F-433 (terminology): "step", "operation", "node"; "pass", "settle", "certify", "schedule"
- F-439 (terminology): "canonical" (form, significand, text) and "the printed form"
- F-441 (terminology): "hard bound" (and "formable")
- F-442 (terminology): "rejected" / "rejection" beside "refusal" and "error"
- F-449 (terminology): Devdocs-only built-in vocabulary: door, boundary, whole range, saturates, ulp, F-division
- F-453 (terminology): "relation" for `=`, `≈` and the uncertified sign
- F-456 (terminology): "fraction" reserved for the held value
- F-457 (terminology): "parses back", "typed back", "reads back", "pastes back"
- F-459 (terminology): "dimensionless markers" for the kind primitives
- F-460 (terminology): "plain number" against "dimensionless"
- F-467 (terminology): Conversion into a function: "function conversion", "function want", "a function as the want"
- F-468 (terminology): Output modes by ordinal ("the third output mode")
- F-469 (terminology): "a typed list" and "a defined list"
- F-471 (terminology): Have and want: "the quantity to convert", "the unit to convert to"; the labels
- F-472 (terminology): "the converter" for the app, the fields and the outcome module
- F-473 (terminology): Expression words: juxtaposition, negation, literal
- F-475 (terminology): "the definitions file" and "system"
- F-476 (terminology): "loaded" (docs) and "build" (devdocs)
- F-478 (terminology): "user-defined functions" for the functions the file defines
- F-484 (terminology): Names of units: alias, spelling, symbol, name; pair and split
- F-488 (terminology): "sheet" and "panel"
- F-492 (terminology): "build number" and "build ID"
- F-495 (terminology): App-surface words: the cog, the checks the app makes on its own, install
- F-499 (terminology): "the display's `show` and `roundTerms`"

## `devdocs/builtins.md`

48 findings (F-257 to F-304).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/builtins.md#(top)` | V3 (L81-110) | — |
| `devdocs/builtins.md#Names` | D5 (L147-150); V3 (L112-129); A9 (L247-255) | OVERLAP: three texts for the prefix clause; D5 edit 7 (`W`) waits on the owner (D5 Q1) |
| `devdocs/builtins.md#Arity` | V3 (L131-147) | — |
| `devdocs/builtins.md#The rules every built-in follows` | D5 (L152-154); V3 (L149-240); A6 (L386-398) | OVERLAP: D5 edit 9 and V3 (L169-182) make the same #100 change; V3 (L200-221) and A6 edit the same domain bullet; V3 (L184-198) rewords bounds D5 confirms (L55) |
| `devdocs/builtins.md#Huge and tiny arguments` | D5 (L156-160); V3 (L242-313) | OVERLAP: both drop the `acos(1e-9860)` aside, rewrite the second bullet in different words and inline #63 and #65; V3 also rewords #65's sentence and writes "certified" |
| `devdocs/builtins.md#Dimension rules` | D5 (L162-164); V3 (L315-385); A7 (L229-291) | OVERLAP: all three change the `div`/`mod` rows (same text); V3 rewrites Angles whole and drops the `turn` clause A7 corrects in place (L261-274); A7 rewords the alternative's paragraph V3 keeps; A7's "plain number" definition is terminology |
| `devdocs/builtins.md#Domains, exact cases and edges` | D5 (L166-169); V3 (L387-417) | OVERLAP: both rewrite the `atan2` edges cell, in different words |
| `devdocs/builtins.md#The elementary routines` | D5 (L171-174); V3 (L419-474) | OVERLAP: both rewrite the timing and gcd sentences; #152 kept at `expFixed` (V3) or wherever V3 keeps it (D5), while D7 and V6 give it to `cost.md` |
| `devdocs/builtins.md#The exact functions` | D6 (L134-196); V3 (L476-519) | OVERLAP: the opening paragraph (V3 keeps the first sentence D6 corrects); the `round` bullet (both; V3 adds a description of #98) |
| `devdocs/builtins.md#The Gamma and Beta families`, end of the Bernoulli paragraph (memo history, #103, the run's timing) | D7 (L187-191); V3 (L521-549) | OVERLAP: both rewrite it and explain the inexact argument's longer run differently; V3 adds a cost.md pointer |
| `devdocs/builtins.md#The Gamma and Beta families`, `lgamma` and `gamma` (the remedy; the costs, #125) | D7 (L193-197); V3 (L551-573) | OVERLAP on the costs sentence, both asserting the ordering V6 (F-354) questions; the remedy correction is D7's alone |
| `devdocs/builtins.md#The Gamma and Beta families`, `beta` (the `2^55` example) | D7 (L199-200); V3 (L575-590) | OVERLAP: different replacement examples |
| `devdocs/builtins.md#The Gamma and Beta families`, incomplete gamma (regularized forms; #107; the timing, #149) | D7 (L202-209); V3 (L592-620) | OVERLAP on the paragraph's end (timing rewrite, #107, #149); the `ln Γ` correction is D7's alone |
| `devdocs/builtins.md#The Gamma and Beta families`, end of `erf` and `erfc` | D7 (L211-212); V3 (L622-634) | OVERLAP: both delete the timing; D7 adds a tiny-argument sentence that `#Huge and tiny arguments` already carries |
| `devdocs/builtins.md#The Gamma and Beta families`, incomplete beta exact cases (page L864-874) | D7 (L214-215); V3 (L636-665) | OVERLAP: both re-flow the broken block (D7's edit 10, among its section edits at L183-220); V3's text keeps "`x = 1` is `1`", which D7 corrects; different timing rewrites |
| `devdocs/builtins.md#The Gamma and Beta families`, last paragraph | D7 (L217-218); V3 (L667-718) | OVERLAP and CONFLICT: the statistical distributions deferred (D7) or not built-ins (V3, siding with V6's future.md text, V6 L207); #151 and #152 kept (D7) or sent to cost.md (V3) |
| `devdocs/builtins.md#Not in this design`, the whole section | D7 (L222-234); V3 (L720-736) | OVERLAP and CONFLICT: `sqrt(-1)` a domain error (D7) or `negativeRadicand` (V3); #98 and #100 inline (D7) or section links (V3); complex `gamma` here (D7) or in the families' last paragraph (V3) |
| `devdocs/builtins.md`, the link definitions (page L905-917) | V3 (L738-740); D5 (L160); D7 (L220) | OVERLAP: D5 deletes `[63]` and `[65]`; V3 deletes all thirteen; D7 (edit 12) deletes `[98]` to `[152]` and leaves `[63]`, `[65]` to their sections |

### Findings

#### F-257. `#(top)`: the user-side list becomes a sentence and a link

- Type: structure
- Target section: (top)
- Units: V3 (L61, L63, L81-110)
- Where: `devdocs/builtins.md#(top)`, first paragraph (page L3-11)
- Finding: the first paragraph lists the built-ins from the user's side; it shrinks to one sentence and a link to `../docs/functions.md` (§12 q24), saying what this page keeps: how the built-ins are built, the rules their implementations share and the bounds they rest on, family by family. The second paragraph is mechanism, and every statement in it holds (V3 L63).
- Proposed call: V3's replacement (L81-110) once `docs/functions.md` is reorganized; anchors settled when the docs pages exist.
- Decision: Stands; the link is `../docs/builtins.md` (Q-020's note); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-258. `#Names`: "no built-in is a prefix of another's name" is false

- Type: contradicts implementation · Flags: **conflict**
- Target section: Names
- Units: D5 (L93, L150, L193), V3 (L43, L64, L112-129), A9 (L154-163, L247-255, L308-311)
- Where: `devdocs/builtins.md#Names`, last bullet (page L57-61)
- Claim or passage: "Prefixes apply to units alone: a call's name is looked up exactly, so `kpi()` and `mexp(1)` are calls of nothing, and no built-in is a prefix of another's name either."
- Finding: false as strings (`log` begins `log10` and `log2`, `sin` `sinh`, `atan` `atan2`, `erf` `erfc`, `incbeta` `incbetareg`, `lowergamma` `lowergammareg`); A9 adds the unit-prefix reading (`asin`, `acos`, `atan`, `asinh`, `acosh`, `atanh` read as the atto prefix `a` followed by a built-in). Nothing checks or needs it: the build tries only prefix-and-unit splits, and a call's name is looked up exactly.
- Evidence: `src/core/builtins.ts:56-107`; `src/core/build.ts:309-327`; `src/core/table.ts:234-243`; `src/units.txt:78`; D5 harness: `kpi()` and `mexp(1)` are "Unknown function" (A9 and V3 reasoned from code).
- Corrected statement: D5 (L150): "…and it does not matter that one built-in's name begins another's (`log` and `log10`, `sin` and `sinh`, `atan` and `atan2`)." V3 (L43): "…and that `log` begins `log10` or `atan` begins `atan2` is no ambiguity, since nothing reads a call's name in parts." A9 (L247-255): "…and a built-in whose name happens to read as a prefix followed by another built-in's (`asin` as `a` + `sin`) is only itself, since no prefix is ever tried on a call."
- Conflict: three corrections: D5 and V3 read the clause as string prefixes, A9 as both readings, restating only the prefix one. D5 (Q2) and A9 (Q2) both prefer restating to deleting.
- Proposed call: **doc wrong**: the build's checks are deliberate and named in the bullet's own first sentence; pick one restatement, possibly covering both readings.
- Related: Q-086
- Decision: Stands (doc wrong); follows Q-086 (ok: restate; the session picks one text covering both readings).

#### F-259. `#Names`: "`W` is the watt" does not say why it matters

- Type: not verified · Flags: **low confidence**
- Target section: Names
- Units: D5 (L89, L149, L192, L204)
- Where: `devdocs/builtins.md#Names`, first bullet (page L37-40)
- Finding: "and `W` is the watt, so neither is free for a constant" states a fact (`units.txt:153`) without saying what `W` has to do with Euler's number. The removed plan's summary of the design note says "Lambert's function is `lambertw`" (54aec25, `devdocs/history/calculator-plan.md:2133-2134`): `W` would be Lambert's W, which the deferred list under `#The Gamma and Beta families` names `lambertw`.
- Why unverified: the design note itself repeats the page's wording, so the connection rests on the plan's summary only; D5 puts it to the owner.
- Proposed call: the owner confirms the reading (D5 Q1); then D5's edit 7 (L149) names `lambertw` and says neither `e` nor `W` is free "for a function or a constant". V3 keeps the bullet as intent, its facts holding (L64).
- Related: Q-034
- Decision: Stands; follows Q-034 (ok: D5's edit 7).

#### F-260. `#Arity`: the user's rule links to `docs/expressions.md`

- Type: structure
- Target section: Arity
- Units: V3 (L65, L131-147)
- Where: `devdocs/builtins.md#Arity`, first sentence (page L65-66)
- Finding: the mechanism stays (the range, the check once the name resolves and before any argument is evaluated, no variadic function by design); the user's rule, a wrong count is an error, gets a link to `../docs/expressions.md`, the owner of calls (C45).
- Proposed call: V3's first-sentence edit (L131-147).
- Decision: Stands; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist; amended by F-442 ("a wrong count is an error").

#### F-261. `#The rules every built-in follows`: three bullets restate user rules

- Type: structure
- Target section: The rules every built-in follows
- Units: V3 (L66, L149-240)
- Where: `devdocs/builtins.md#The rules every built-in follows`: the exact-case bullet (page L89-91), the domain bullet (L139-153), the exponent-bound bullet (L154-170)
- Finding: the section is mechanism and stays; the exact-case rule (N6), the edge rule (N15) and the exponent bound (N22) each get a sentence with a link to `../docs/numbers.md` (§12 q24). V3's exact-case edit also drops the example "(`ln(8) / ln(2)` is `≈ 3`)" and points at the table and each module's header.
- Proposed call: V3's three edits (L149-167, L200-221, L223-240) once `numbers.md` exists; the domain-bullet edit shares its bullet with A6's correction of the edge list.
- Decision: Stands; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-262. `#The rules every built-in follows`: the edges a message names are more than listed

- Type: contradicts implementation · Flags: **conflict**
- Target section: The rules every built-in follows
- Units: A6 (L81, L245, L386-398), D5 (L56)
- Where: `devdocs/builtins.md#The rules every built-in follows`, the domain bullet's last sentence (page L150-153)
- Claim or passage: "The edges a message can name are `zero`, `1`, `-1`, a rounding boundary written to twelve digits, `a pole of the function`, and the point where the result passes the exponent bound."
- Finding: the point written to twelve digits also names a multiple of the divisor for `div` and `mod`, and the result itself where a rounding function's cell cannot be formed; a `want` straddling zero and a ratio straddling the bound have wordings of their own.
- Evidence: `src/messages.ts:92-95`, `:413-419` (`describeEdge`), `:488-491`, `:572-573`; `src/core/builtins/division.ts:87-91`; `src/core/builtins/round.ts:191`; runs: `div(sqrt(2)^2, 1)` and `mod(sqrt(2)^2, 1)` "cannot be told from 2" (A6), `div(8 + sqrt(2) - sqrt(2), 2)` "cannot be told from 8" (D6 L56); the cell case from code only.
- Corrected statement: A6 (L386-398): "The edges a message can name are `zero`, a point written to twelve digits (`1`, `-1`, a rounding boundary, a multiple of the divisor for `div` and `mod`, or the result itself where a rounding function's cell cannot be formed), `a pole of the function`, and the point where the result passes the exponent bound."
- Conflict: D5 confirms "the edges a message names are exactly the five listed" (L56, from `messages.ts:413-419`); A6 finds the list incomplete. The `div` and `mod` runs (A6, D6) show which points reach the point form.
- Proposed call: **doc wrong** (incomplete): the code names any point, the page lists some; nothing suggests the `div` and `mod` wording is unintended.
- Decision: Stands (doc wrong, incomplete).

#### F-263. `#The rules every built-in follows`: "one half for `asinh`" is a radius

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: The rules every built-in follows
- Units: V3 (L66, L184-198), D5 (L55)
- Where: `devdocs/builtins.md#The rules every built-in follows`, the wide-argument bullet (page L115-118)
- Claim or passage: "(about a fifth of a radian for `sin` and `cos`, one radian for `atan`, one half for `asinh`, an error of one half for `tanh` and for `exp`)"
- Finding: the `asinh` threshold is a radius of one half (an interval of width one), as for `tanh` and `exp`; the code comments at `hyperbolic.ts:63,219` share the imprecision (code side).
- Evidence: `src/core/builtins/hyperbolic.ts:218` (V3, reasoned from code, not run).
- Corrected statement: "(about a fifth of a radian for `sin` and `cos`, one radian for `atan`, and a radius of one half for `asinh`, `tanh` and `exp`)" (V3 L184-198).
- Conflict: D5 confirms the bullet's bounds as written, "one half for `asinh` with the radius added at the midpoint" (L55).
- Proposed call: **doc wrong** (imprecise wording); settle by whether the test at `hyperbolic.ts:218` bounds the radius or the width.
- Related: B-051
- Decision: Stands (doc wrong); low confidence: the session settles from `hyperbolic.ts:218`; B-051 is the code side.

#### F-264. `#The rules every built-in follows`: "about 181,727" not recomputed

- Type: not verified · Flags: **low confidence**
- Target section: The rules every built-in follows
- Units: D5 (L57)
- Where: `devdocs/builtins.md#The rules every built-in follows`, the exponent-bound bullet (page L166-170)
- Finding: "the argument the kernel is handed stays below about 181,727 at the largest ceiling the settings allow" (`tanh`) is a derived constant, stated identically in `hyperbolic.ts:36-39`.
- Why unverified: D5 did not recompute it, and no other unit did.
- Proposed call: recompute it when `tanh`'s structured comment is written; until then it stands as the code comment states it.
- Decision: Stands (stands as the comment states it).

#### F-265. `#Huge and tiny arguments`: the tiny-ratio bullet contradicts the module

- Type: contradicts implementation
- Target section: Huge and tiny arguments
- Units: D5 (L36, L159, L204), V3 (L44, L67, L269-293)
- Where: `devdocs/builtins.md#Huge and tiny arguments`, second bullet (page L194-200)
- Claim or passage: "a tiny ratio formed inside `asin`, `acos` or `atan2` converts to zero within an ulp and gives a ball around zero that certifies nothing, the one case the expansion does not reach, since those combine the kernel's arctangent with `pi` before the ball is formed" (both units tagged it stale, update; the rewrite is a correction).
- Finding: `atan2` takes the expansion for a tiny ratio over a positive `x` and never forms a ratio below `2^-bits` on its other routes; `asin` and `acos` take their expansion on the square first; `atanKernel` converts with `extraBits`. What does go in at the working bits alone, as zero within an ulp, is `exp`'s argument and the log-space power's tiny exponent, giving `≈ 1`.
- Evidence: `src/core/builtins/inverse-trig.ts:294-299`, `:267-290`, `:178,201-211`, `atanKernel` at `:438-445`; V3 scratch: `atan2(1e-999999999999999999, 1)` is its argument on the first pass; the section's fourth bullet already says so for `atan2` (D5 L36).
- Corrected statement: both rewrite the bullet whole, the same facts in different words (full texts: D5 L159, edit 11; V3 L269-293).
- Proposed call: **design changed without the docs following**: the module's branches are deliberate and the neighbouring bullet states them; D5 calls this "the one real staleness" of the devdocs (L204).
- Decision: Stands (design changed); the session picks one of the two rewrites.

#### F-266. `#Huge and tiny arguments`: the `acos(1e-9860)` aside

- Type: stale (drop)
- Target section: Huge and tiny arguments
- Units: D5 (L35, L156), V3 (L41, L67, L244-266, L764)
- Where: `devdocs/builtins.md#Huge and tiny arguments`, first bullet (page L188); plan §1.1.5 row
- Passage: "(`acos(1e-9860)` was refused at the default limit)"
- Tag: drop; plan row confirmed by both (`acos(1e-9860) ≈ 1.5707963 radian`, certified on the first pass; the earlier threshold's reason is in the same sentence).
- Rewrite: delete; the sentence ends "long before `2^-significandLimitBits`." (D5 L156; V3 L242-266, which also writes "no digit certified" for "no digit certain" at page L191).
- Proposed call: Confirm `drop`.
- Related: B-034
- Decision: Stands (drop); the quoted note follows Q-006 ("certified").

#### F-267. `#Huge and tiny arguments`: `log10(1e999999999)` "exactly" is the value, not the line

- Type: other
- Target section: Huge and tiny arguments
- Units: D5 (L58, L123, L200)
- Where: `devdocs/builtins.md#Huge and tiny arguments`, fourth bullet (page L210-213)
- Finding: "`log10(1e999999999)` exactly `999999999`" is true of the value, but the line reads `≈ 1e+9` at eight digits under N10 (an exact value with more digits than shown); at nine digits or under ratio notation it reads `= 999999999` (`log.ts:161-166`, `:221-233`; harness).
- Proposed call: keep the page's statement (the section is about the value; N10 owns the display); the generated `log10` entry can show both lines (D5 Q9).
- Related: Q-066
- Decision: Stands; follows Q-066 (ok).

#### F-268. `#Dimension rules`: the `div` and `mod` rows omit "kinds included"

- Type: contradicts implementation
- Target section: Dimension rules
- Units: D5 (L62, L164, L198), V3 (L68, L315-329), A7 (L132-139, L247-259), D6 (L36)
- Where: `devdocs/builtins.md#Dimension rules`, the `div(a, b)` and `mod(a, b)` rows (page L259-260)
- Claim or passage: "two quantities of one dimension"
- Finding: both conform their arguments kinds included, as the `atan2` row says; the rest of the table matches the code row for row (D5 L62, V3 L68, A7).
- Evidence: `src/core/builtins/division.ts:157,164` (`conformingArguments("number")`, `("first")`); `src/core/builtin.ts:299-321`; A7 probe: `mod(1 rad/s, 1 Hz)` a kind mismatch; D6 harness: `mod(30 deg, 1)` a kind mismatch, `mod(-30 deg, 360 deg)` of the radian kind.
- Corrected statement: "two quantities of one dimension, kinds included" (D5 L164, V3 L315-329, A7 L247-259, identical).
- Proposed call: **doc wrong**: one helper conforms kinds for all three two-argument rules.
- Related: Q-094
- Decision: Stands (doc wrong); follows Q-094 (ok).

#### F-269. `#Dimension rules`: "the mistake they were introduced against"

- Type: stale (keep as intent) · Flags: **conflict**
- Target section: Dimension rules
- Units: A7 (L93, L276-291), V3 (L68)
- Where: `devdocs/builtins.md#Dimension rules`, the alternative's paragraph (page L285-288)
- Passage: "Kinds exist to keep an angle from being mistaken for a number, and the degree-radian confusion is the mistake they were introduced against, so the rule is strict"
- Tag: keep as intent (A7, new; no plan row)
- Rewrite: "…an angle from being mistaken for a number, the degree-radian confusion first among such mistakes, so the rule is strict;" (A7 L276-291)
- Conflict: V3 keeps the paragraph unchanged as intent, "already in the present tense" (L68).
- Proposed call: Confirm `keep as intent`: the rationale stays; "were introduced against" narrates origin, and A7's reword drops it at no cost to the reason.
- Decision: Stands (keep as intent, A7's reword).

#### F-270. `#Dimension rules`: the Angles and `floor` paragraphs restate the user's rule

- Type: structure
- Target section: Dimension rules
- Units: V3 (L68, L331-385)
- Where: `devdocs/builtins.md#Dimension rules`, the Angles paragraph (page L264-280) and "`floor` and its kin" (page L299-308)
- Finding: "Angles" states Q8 twice over (§9.1): the rule shrinks to one sentence linking `../docs/functions.md` and `../docs/quantities.md` ("Kinds"); the mechanism stays (the kernel sees radians because `radian` is the primitive; `RADIAN` by convention; `noAngles`); the rationale paragraph after it stays as intent. "`floor` and its kin" is Q5's rationale and stays, with a link for the rule to `../docs/functions.md`.
- Proposed call: V3's two edits (L331-370, L372-385), carrying A7's correction of the `turn` clause (V3's rewrite drops the clause) and reconciled with A7's reword of the alternative's paragraph.
- Decision: Stands; the links target `docs/builtins.md` and `docs/quantities.md` (Q-020's note); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist; follows Q-019 ("plain number" as the gloss, defined once).

#### F-271. `#Domains…`: the `ln`, `log10`, `log2` row's exact cases

- Type: contradicts implementation · Flags: **conflict**
- Target section: Domains, exact cases and edges
- Units: D5 (L70, L168), V3 (L69)
- Where: `devdocs/builtins.md#Domains, exact cases and edges`, the `ln`, `log10`, `log2` row (page L316)
- Claim or passage: exact cases "`ln(1)`; an integer power of the base"
- Finding: the integer-power case applies to `log10` and `log2` only; `ln`'s one exact case is `ln(1)`, `ln(2)` and `ln(10)` being memos.
- Evidence: `log.ts:161-166`, `:78`, `:199-202`; harness: `log10(1000) = 3`, `log2(1/8) = -3`, `log10(1) = 0`, `log2(2^100) = 100`, `log10(10^-5) = -5`, `ln(2) ≈ 0.69314718`.
- Corrected statement: "`ln(1)`, `log10(1)`, `log2(1)`; for `log10` and `log2`, an integer power of the base either way (`log10(1000)`, `log2(1/8)`)" (D5 L168).
- Conflict: V3 confirms the table row by row apart from the `atan2` cell (L69).
- Proposed call: **doc wrong** (imprecise): the cell reads as giving `ln` integer-power cases; settle against V3's confirmation by whether "the base" was meant to cover `ln`.
- Decision: Stands (doc wrong, imprecise).

#### F-272. `#Domains…`: `pow(-1, y)` is not exact "for any `y`"

- Type: contradicts implementation · Flags: **conflict**
- Target section: Domains, exact cases and edges
- Units: D5 (L73, L169, L194), V3 (L69)
- Where: `devdocs/builtins.md#Domains, exact cases and edges`, the `pow(x, y)` row (page L320)
- Claim or passage: "the bases `0`, `1` and `-1` for any `y` (below)"
- Finding: `pow(1, y)` is one and `pow(0, y)` decided for any `y`, but `-1` is special only for an exact `y` whose fraction cannot be formed, by parity; a formable exponent keeps the rational route (an even root of `-1` is the `negativeRadicand`), and an inexact exponent over a negative base is the `domain` error, as the prose below the table says.
- Evidence: `pow.ts:91`, `:101-111`, `:147-166`, `:214-220`; harness: `pow(-1, 1/3) = -1`, `pow(-1, 2/3) = 1`, `pow(-1, 1/2)` an even root of a negative value, `pow(-2, approx(1))` the domain error, `pow(-1, 1e999999999) = 1`, `pow(-1, 5^-16000) = -1`.
- Corrected statement: "`x` a perfect `q`-th power for `y = p/q`; `pow(x, 0)` is `1`; the bases `0` and `1` for any `y`, and `-1` for an exact `y`, by parity (below)" (D5 L169).
- Conflict: V3 confirms the row and the `pow` prose, with the same `-1` cases (L69).
- Proposed call: **doc wrong**: the cell contradicts the prose under it, which both units confirm; D5 asks the owner to confirm (Q3).
- Related: Q-092
- Decision: Stands (doc wrong); follows Q-092 (ok).

#### F-273. `#Domains…`: `atan2`'s edges cell omits the edges at `x`

- Type: contradicts implementation
- Target section: Domains, exact cases and edges
- Units: D5 (L74, L169), V3 (L69, L387-399)
- Where: `devdocs/builtins.md#Domains, exact cases and edges`, the `atan2(y, x)` row (page L324)
- Claim or passage: edges "zero for `y`, when `x` is not positive"
- Finding: `atan2` is also `unresolved` at zero for `x` when `y` is exactly zero and `x` straddles it, and when `x` reaches zero under a `y` of definite sign with a ratio `x / y` at the significand limit; the prose below the table and `#Huge and tiny arguments` say so.
- Evidence: `inverse-trig.ts:263-264`, `:332-336`; harness: `atan2(0, sqrt(2)^2 - 2)` and `atan2(1e-30000, 1 - approx(1))` blame `x`.
- Corrected statement: D5 (L169): "zero for `y` when `x` is not positive; zero for `x` when `y` is zero, or when `x / y` reaches the significand limit"; V3 (L387-399): "zero for `y`, when `x` is not positive; zero for `x`, when `y` is zero or far wider than `x`" (the same two cases, worded differently).
- Proposed call: **doc wrong** (incomplete cell).
- Decision: Stands (doc wrong).

#### F-274. `#Domains…`: the edges column omits the exponent bound

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Domains, exact cases and edges
- Units: D5 (L75, L169), V3 (L69)
- Where: `devdocs/builtins.md#Domains, exact cases and edges`, the `exp`, `pow` and `sinh`/`cosh`/`tanh` rows (page L315, L320, L325)
- Claim or passage: no edge for the exponent bound in those cells
- Finding: `exp`, `sinh`, `cosh` and `pow` are `unresolved` at the edge `bound` when the argument reaches across it, and the message names "the point where the result passes the exponent bound"; the rules section says so; `tanh` has no such edge.
- Evidence: `exp.ts:81-82`; `hyperbolic.ts:355-356`; `pow.ts:176-177`; `ball.ts:1480-1482`; `messages.ts:416-417` (reasoned from code, not run).
- Corrected statement: add "the exponent bound" to the `exp`, `sinh`, `cosh` and `pow` cells; the `tanh` cell stays blank (D5 L169).
- Conflict: V3 confirms the table row by row apart from the `atan2` cell (L69).
- Proposed call: **doc wrong** (incomplete): the column omits an edge the section's own rules bullet names; check whether it was meant to list domain edges only.
- Decision: Stands (doc wrong, incomplete); the session checks whether the column was meant for domain edges only.

#### F-275. `#Domains…`: `pow`'s difference from `^` links the user's side

- Type: structure
- Target section: Domains, exact cases and edges
- Units: V3 (L69, L401-417)
- Where: `devdocs/builtins.md#Domains, exact cases and edges` > "`pow`, and `^` with it", first sentence (page L352-354)
- Finding: the first sentence restates the user's rule (C63) and gets a link to `../docs/functions.md` (`pow`); `log`'s and `pow`'s paragraphs are mechanism and stay.
- Proposed call: V3's first-sentence edit (L401-417).
- Decision: Stands; the link targets `docs/builtins.md` (Q-020's note); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-276. `#The elementary routines`: per-routine timings

- Type: measurement
- Target section: The elementary routines
- Units: D5 (L34, L37, L173-174), V3 (L48, L70, L419-440)
- Where: `devdocs/builtins.md#The elementary routines`, opening paragraph (page L388-392); probe paragraph's last sentence (page L492-494, "tens of milliseconds a sum")
- Finding: "Every routine costs 9 to 13 ms at the default ceiling of 4,040 digits (`bench/kernel.bench.ts` reports each), V8 multiplying integers of that size by the schoolbook rule, about sixty microseconds a product." Both units tag it update under §12 q25 and keep the qualitative reason: the routines cost about the same, the cost being big-integer products by the schoolbook rule; V3 adds that a routine's cost is counted in full multiplications and the series are arranged to need few (D5 L37, edit 16 at L173; V3 L48, L419-440). V3 notes that the plan's §10 entry for its unit says "measurements kept", against q25, and follows q25.
- Proposed call: drop the figures under §12 q25 (binding) and keep the qualitative sentence; `bench/kernel.bench.ts` holds the numbers.
- Related: Q-016, F-510
- Decision: Follows Q-016 and Q-088: the qualitative reason stays; the per-routine figures may stay as rough, illustrative figures or leave for `bench/kernel.bench.ts` (the session's choice).

#### F-277. `#The elementary routines`: the gcd sentence, kept as intent

- Type: stale (keep as intent)
- Target section: The elementary routines
- Units: D5 (L34, L174), V3 (L39, L70, L459-474)
- Where: `devdocs/builtins.md#The elementary routines`, probe paragraph, last sentence (page L492-494); plan §1.1.5 row
- Passage: "Timing it once found that the exact arithmetic on settled midpoints ran Euclid's gcd on dyadics of the ceiling's size, tens of milliseconds a sum, which is why …"
- Tag: keep as intent; plan row confirmed by both (`src/core/rational.ts:507-521` strips the common power of two and runs Lehmer's algorithm on the odd parts).
- Rewrite: present tense, no timing: the gcd strips the common power of two first because settled midpoints are dyadics of the ceiling's size, on which Euclid's gcd would dominate a sum (D5 L34); V3 adds "and runs Lehmer's algorithm on the odd parts" (L39).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent); Q-018 lets "tens of milliseconds a sum" stay as a rough duration if the session keeps it.

#### F-278. `#The elementary routines`: "the four costliest routines" rests on a benchmark

- Type: not verified · Flags: **conflict**, **low confidence**
- Target section: The elementary routines
- Units: D5 (L85), V3 (L70)
- Where: `devdocs/builtins.md#The elementary routines`, probe paragraph (page L486-491)
- Finding: the probe's composite is `sin(atan(exp(1)) + ln(3) radian)` (`src/limits.ts:94`); that `exp`, `atan`, `sin` and `ln` are the four costliest routines of the kernel benchmark, the roots an order cheaper and the rest compositions, are benchmark claims.
- Why unverified: D5 could not settle a benchmark ranking from the code; V3 confirms the probe paragraph from `src/limits.ts:90-97` (the composite and its table), not the ranking.
- Conflict: D4 builds the user wording on the ranking, "one expression of the four costliest elementary functions" (D4 (F-128, F-491)).
- Proposed call: check the ranking against `bench/kernel.bench.ts`'s report before `docs/settings.md` states it; failing that, both pages name the four functions without ranking them.
- Related: F-128, F-491
- Decision: Stands; follows F-491 (ok: "the four elementary functions", no ranking).

#### F-279. `#The exact functions`: the open-cell rule's reason is not recorded

- Type: other · Flags: **low confidence**
- Target section: The exact functions
- Units: A6 (L431-437, L450-456)
- Where: `devdocs/builtins.md#The exact functions`, "On balls" paragraph (page L566-573)
- Finding: the rounding functions decide a ball "against the open cell", so a ball inside a closed cell that ends exactly on its closed end (`[2, 2.5]` for `floor`) is `unresolved` though every value in it floors to `2`; the rule is uniform and the next pass removes the touch (reasoned from code, not run). A6 asked V3 to record the intent in `#The exact functions`, "a touch is a straddle at every edge, so that no edge check has to know which end of a cell is closed", with no code change (A6 question 5); V3's report neither takes it up nor mentions it.
- Proposed call: add the one-sentence reason to "On balls" with V3's edits to the section, once the owner answers A6 Q5 (A6 proposes recording it as intent, with no code change).
- Related: Q-036
- Decision: Stands; follows Q-036 (ok: the sentence of intent; no code change).

#### F-280. `#The exact functions`: the opening misstates inexact arguments and quantities

- Type: contradicts implementation · Flags: **conflict**
- Target section: The exact functions
- Units: D6 (L63, L138-144), V3 (L45, L476-500)
- Where: `devdocs/builtins.md#The exact functions`, opening paragraph (page L498-502)
- Claim or passage: "each is exact on exact arguments, and on an inexact argument is either exact where the argument's interval decides the answer or `unresolved` where it does not. They are the functions whose result keeps its argument's dimension (`abs`, `mod`), or takes any quantity (`sign`, `div`)."
- Finding: `abs` and `mod` return inexact results on an inexact argument; the five integer functions refuse it as a `domain` error (`notExact`); and nine of the thirteen take plain numbers, while the second sentence reads as if all thirteen took quantities.
- Evidence: `src/core/builtins/abs.ts:25-27`; `division.ts:148-151`; `integers.ts:40-42`; D6 harness: `abs(-sqrt(2))` is `≈ 1.4142136`, `mod(7 + sqrt(2) - sqrt(2), 2)` is `≈ 1` with a radius.
- Corrected statement: D6 (L138-144): "Thirteen functions that are exact on exact arguments whatever the working precision. On an inexact argument, `sign`, `floor`, `ceil`, `trunc`, `round` and `div` are exact where the argument's interval decides the answer and `unresolved` where it does not; `abs` and `mod` carry the radius through, as the arithmetic does; and `gcd`, `lcm`, `factorial`, `binomial` and `doublefactorial`, which take integers known exactly, refuse it as a `domain` error. Four of them take quantities: `abs` and `mod` return their argument's dimension, `sign` and `div` a plain number; the other nine take plain numbers (`#Dimension rules`)." V3 (L45) rewrites the second sentence only, to the same four and nine.
- Conflict: V3's new paragraph (L476-500) keeps the first sentence D6 shows false.
- Proposed call: **doc wrong**: the behaviours D6 ran are the modules' deliberate rules (the integer functions' `notExact`; `abs` and `mod` carrying the radius as the arithmetic does); D6's correction of the first sentence belongs in whichever text is kept.
- Decision: Stands (doc wrong); amended by F-442 (the integer functions "report a `domain` error", never "refuse").

#### F-281. `#The exact functions`: no built-in is named `ceiling`

- Type: contradicts implementation
- Target section: The exact functions
- Units: D6 (L64, L146-152), V3 (L46, L71, L502-519)
- Where: `devdocs/builtins.md#The exact functions`, the `round` bullet (page L517-519)
- Claim or passage: "two of the modes' names, `floor` and `ceiling`, are functions"
- Finding: only `floor` is; the function is `ceil`.
- Evidence: `ceiling(2.5)` reads `Unknown function "ceiling"` (D6 harness); `src/core/rounding.ts:80`; `src/core/builtins.ts:83-86`.
- Corrected statement: D6: "one of the modes' names, `floor`, is a function (`ceiling` is a letter from `ceil`)"; V3: "one of the modes' names, `floor`, is already a function". "There is no mode argument" is a ruled-out alternative and stays (V3).
- Proposed call: **doc wrong** (a slip).
- Decision: Stands (doc wrong).

#### F-282. `#The exact functions`: the Gamma pointer is on two of the three errors

- Type: contradicts implementation · Flags: **conflict**
- Target section: The exact functions
- Units: D6 (L65, L98, L182-188), V3 (L71)
- Where: `devdocs/builtins.md#The exact functions`, "On balls" paragraph, last sentence (page L594-596)
- Claim or passage: "The refusals of a value `factorial` does not take point at `gamma(x + 1)`, and `binomial`'s at `1 / ((n + 1) beta(n - k + 1, k + 1))`."
- Finding: only the `notInteger` and `notExact` errors carry the pointer; the `negative` error does not, rightly, `gamma(x + 1)` having a pole at a negative integer and `n + 1` being zero at `n = -1`; and these are `domain` errors, not refusals (§8).
- Evidence: `src/messages.ts:241-244`, `:267-277`, `:245-248`; harness: `factorial(-1)`, `binomial(-1, 0)`.
- Corrected statement: D6 (L182-188): "The errors for a non-integer or an inexact argument point at `gamma(x + 1)` for `factorial` and at `1 / ((n + 1) beta(n - k + 1, k + 1))` for `binomial`; the error for a negative integer does not, `gamma` having a pole there and `n + 1` being zero at `n = -1`."
- Conflict: V3 confirms the "On balls" paragraph as mechanism that holds (L71).
- Proposed call: **doc wrong**: the missing pointer on `negative` is deliberate and right (D6); "refusals" is §8 terminology (D6 (F-443)).
- Related: Q-096, F-443
- Decision: Stands (doc wrong); follows Q-096 and F-442 ("errors", not "refusals").

#### F-283. `#The exact functions`: `div`, `mod` and the rounding functions can form large results

- Type: contradicts implementation · Flags: **conflict**
- Target section: The exact functions
- Units: D6 (L66, L190-196), V3 (L71)
- Where: `devdocs/builtins.md#The exact functions`, prediction paragraph, last sentence (page L613-615)
- Claim or passage: "`gcd` and `lcm` form nothing larger than their arguments' product, and `div`, `mod` and the rounding functions nothing larger than their arguments."
- Finding: `round(1/3, 19000)` is a value of nineteen thousand digits and so is `mod(-1, 1e19000)`; both are held to the significand limit by their arithmetic, not by their arguments' size (`round(1/3, 20000)` and `mod(-1, 1e20000)` are `tooLarge`).
- Evidence: `src/core/builtins/round.ts:146-150`; `division.ts:130-146`; harness.
- Corrected statement: D6 (L190-196): "`gcd` and `lcm` form nothing larger than their arguments' product; `div`, `mod` and the rounding functions form their results through the exact arithmetic, which holds each to the significand limit as it holds any sum or product, so `round(1/3, 20000)` and `mod(-1, 1e20000)`, whose results would have twenty thousand digits, are `tooLarge`."
- Conflict: V3 confirms the prediction paragraph (L71; its scratch refuses `mod(-1, 1e20000)`).
- Proposed call: **doc wrong**: the exact arithmetic's limit is the deliberate guard; the sentence states a bound that does not exist.
- Decision: Stands (doc wrong).

#### F-284. `#The exact functions`: `mod`'s alignment refusal is not worded as a sum's

- Type: contradicts implementation · Flags: **conflict**
- Target section: The exact functions
- Units: D6 (L33, L67, L74, L170-180, L231), V3 (L71)
- Where: `devdocs/builtins.md#The exact functions`, "On balls" paragraph (page L585-587)
- Claim or passage: "a remainder whose alignment passes the significand limit (`mod(-1, 1e20000)`) is `tooLarge`, as any exact sum's is."
- Finding: the kind is the same, the message is not: a sum's refusal carries reach `fits`, a count and a remedy; `mod`'s carries `exceeds` and no count ("would need a significand, past the significand limit, however it is computed"), although `mod(approx(-1), 1e20000)`, `mod(-1, approx(1e20000))` and both inexact are each `≈ 1e+20000`. No refusal in the five exact-function modules carries `fits` (D6's N21 row).
- Evidence: `src/core/builtins/division.ts:136`, `:146` (`modBall`'s exact path); `src/core/rational.ts:60-66` (the reach rule); `1e999999999 + 1` shows a sum's wording; the quotient's overflow (`division.ts:122-123`) is rightly `exceeds`.
- Corrected statement: D6 (L170-180), two texts. If the code changes: "…is `tooLarge`, as any exact sum's is, and with the same remedy offered, since an inexact operand settles it (`mod(approx(-1), 1e20000)` is a value)." If it stays: "…is `tooLarge`; unlike a sum's refusal it names no count and offers no remedy, though `approx` around either argument gives a value."
- Conflict: V3 confirms the paragraph as mechanism that holds (L71), its scratch refusing `mod(-1, 1e20000)`.
- Proposed call: **code wrong**: by the reach rule an alignment an inexact operand would settle is `fits`, which is what "as any exact sum's is" states (D6 C2); **doc wrong** only if the owner keeps `exceeds` (D6 Q2), and then edit (e)'s second text applies.
- Related: Q-044, B-005
- Decision: Stands (code wrong); follows Q-044 (ok: B-005; D6's edit takes its first form).

#### F-285. `#The exact functions`: `gcd(a, 0)` is `|a|` on the page, not in the code

- Type: contradicts implementation
- Target section: The exact functions
- Units: D6 (L58, L73, L87, L230), V3 (L71, L74, L754, L764)
- Where: `devdocs/builtins.md#The exact functions`, the `gcd` bullet (page L549-551)
- Claim or passage: "`gcd(a, 0)` is `|a|`"
- Finding: through the pipeline `gcd(5, 0)` is `2`, `gcd(7, 0)` `3`, `gcd(100, 0)` `12`, `gcd(12, 0)` `1`, `gcd(2, 0)` `0`, `gcd(-9, 0)` `4`, while `gcd(0, 5)` is `5`, `gcd(0, 0)` `0` and `gcd(1, 0)` `1`; no test covers a zero second argument.
- Evidence: `gcdOfIntegers` (`src/core/builtins/integers.ts:55-58`) hands `b = 0` to `rational.ts`'s `gcd` (`:507-521`), whose precondition is a positive `b`; `trailingZeros(0n)` is `-1`, so the closing shift moves `a`'s odd part down a bit (D6 places `trailingZeros` at `src/core/rational.ts:503-505`, V3 at `src/core/scaled.ts:1085-1088`); `exact.test.ts:70` has `gcd(-6, 4)` only.
- Corrected statement: none; both units keep the page's statement as the specification ("the page stands").
- Proposed call: **code wrong**: the page states the intent, both units ran the defect, and the called function's precondition explains it; the fix and its tests are the bugs list's (D6 Q1, V3 Q1); the generated `gcd` entry (§6.6 gap) states the intent.
- Related: Q-050, B-001
- Decision: Stands (code wrong); follows Q-050 (ok: B-001 before the pages).

#### F-286. Gap new: `round(x, places)`'s count of units is held to the limit

- Type: gap (new)
- Target section: The exact functions
- Units: D6 (L57, L85, L94, L154-160)
- Where: `devdocs/builtins.md#The exact functions`, the `round` bullet (page L510-512)
- Gap: `places` is an exact integer formed within the significand limit (`round(2.5, 1e20000)` is `tooLarge`, as the page says), and the count of units is held to the limit too: `round(1/3, 20000)` is `tooLarge` and `round(1/3, 19000)` a value; a value below a tenth of the unit forms no power of ten (`round(1e-999999999, 2)` is `0`, or `0.01` under `awayFromZero` and `ceiling`).
- Sources: D6's rule 5 (`round.ts:146-150`, `:112-123`; `integers.ts:35-53`); edit (c) (L154-160).
- Proposed call: add D6's clause to the `round` bullet (edit (c)).
- Decision: Stands.

#### F-287. Gap new: `div`'s undecided edge is named in the dividend's terms

- Type: gap (new)
- Target section: The exact functions
- Units: D6 (L31, L56, L99, L162-168)
- Where: `devdocs/builtins.md#The exact functions`, "On balls" paragraph (page L577-579)
- Gap: `div` decides against the floor's cell with the boundary named in `a`'s terms, the quotient's boundary times the divisor: `div(8 + sqrt(2) - sqrt(2), 2)` "cannot be told from 8".
- Sources: D6's rule 4 (`division.ts:88-91`); edit (d) (L162-168); the edge list (finding on the edges a message names).
- Proposed call: add D6's clause (edit (d)).
- Decision: Stands.

#### F-288. Gap new: past a million the integer functions name no count

- Type: gap (new)
- Target section: The exact functions
- Units: D6 (L58, L100, L196)
- Where: `devdocs/builtins.md#The exact functions`, prediction paragraph (page L598-615)
- Gap: past `FACTORIAL_LIMIT` (one million), and for `binomial`'s smaller index past it, the need is `unknown` and the message names no count (`doublefactorial(2000001)`, `factorial(1e400)` read "would need a significand, past the significand limit, however it is computed"); `STIRLING_LIMIT` (2^52) is where the prediction changes form.
- Sources: D6's rule 6 (`integers.ts:92`, `:141`); edit (g) (L190-196).
- Proposed call: add D6's sentence (edit (g)).
- Related: B-020
- Decision: Stands.

#### F-289. Incomplete beta passage broken by a formatter: `- 1)` renders as a bullet

- Type: markdown and links
- Target section: The Gamma and Beta families
- Units: V3 (L54, L72, L636-665), D7 (L102, L129, L214-215, L257)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (incomplete beta, exact cases, page L864-874)
- Finding: a formatter broke the passage from "one integer over q^(a + b" to "coming from beta": a blank line (page L868), then a line beginning `- 1)` that Markdown reads as a list item, code spans run into the words around them ("`a + b - 1`is", "whole numbers'`B(a, b)`coming from`beta`", "ball of `x`is", "with`x`"), and an indented last line; a formatting break, not a design change. Both units repair it in their edits, D7 keeping `q^(a + b - 1)` on one line so that no wrap can recreate the bullet, V3 also making the timing qualitative and inlining #150. D7 cites page L867-872 and V3 L866-872 in their rows, both edits L864-874: the same passage.
- Proposed call: re-flow the passage once (D7's edit 10, L214-215, or V3's full text, L636-665), applying in the same edit its content corrections (`x = 1`, the timing).
- Decision: Stands.

#### F-290. `#The Gamma and Beta families` repeats the cost issues and the ruled-out list

- Type: structure
- Target section: The Gamma and Beta families
- Units: V6 (L230)
- Where: `devdocs/builtins.md#The Gamma and Beta families`, last paragraph (page L876-894); `devdocs/cost.md`; `devdocs/future.md`
- Finding: the section repeats the kernel's cost issues and the ruled-out list that `cost.md` and `future.md` also carry (§9.4).
- Proposed call: link `cost.md` for the costs and hangs, keep #103 and the deferred list here (V6 Q8, under its Q1 mapping); V3's and D7's rewrites of the paragraph are covered by the findings on `#The Gamma and Beta families`.
- Related: Q-012, F-348, F-415
- Decision: Stands; follows Q-012 (A: `cost.md` for the costs; #103 kept here); amended by Q-010 and Q-011: the deferred list leaves this paragraph for `devdocs/future.md`, this page naming the classes only as absent and linking `future.md`; #115's one link stays here, in a one-line mention (confirmed on 2026-10-12, plan §12.2, item 1).

#### F-291. The memo's "five times over" kept as intent

- Type: stale (keep as intent)
- Target section: The Gamma and Beta families
- Units: D7 (L84, L187-188), V3 (L40, L72, L523-549)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (Bernoulli paragraph, page L646-647)
- Passage: "(growing the memo term by term had a cold ceiling pass recompute the run five times over)"
- Tag: keep as intent (D7, V3; plan §1.1.5 row confirmed; V3 cites `fixed-gamma.ts:21-24`)
- Rewrite: "a memo grown term by term would recompute the run several times in one cold pass", the reason a series reserves its count before it sums (D7 L84; V3 L40, L539-540).
- Proposed call: Confirm keep as intent; the two rewrites agree.
- Decision: Stands (keep as intent).

#### F-292. `gamma` paragraph: the factorial's refusal names no remedy

- Type: contradicts implementation
- Target section: The Gamma and Beta families
- Units: D7 (L55, L94, L193-194, L250, L252)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (`lgamma` and `gamma`, page L716-718)
- Claim or passage: "an exact integer whose factorial does not fit is the kernel's value, the remedy the factorial's refusal names (`gamma(20001)` is `≈ 1.8192063e+77337`)".
- Finding: the factorial's size refusal names no remedy, offering nothing on `exceeds`: `factorial(20000)` reads "would need a significand of about 256,909 bits, past the significand limit, however it is computed". The comment at `src/core/builtins/gamma.ts:46-47` says what the page says. Stale row tagged update (new).
- Evidence: `src/messages.ts:349-360`, `:371-383`; harness; plan N21 says such a refusal suggests nothing, which D6 and V3 confirm for `factorial`
- Corrected statement: "the kernel's value is the remedy for a factorial past the significand limit; the refusal itself names none, offering nothing on `exceeds` (the docs point there)" (D7 L55).
- Proposed call: doc wrong: N21 and the code agree that the refusal suggests nothing; only this sentence and its code comment say otherwise.
- Related: Q-059, Q-096, B-045
- Decision: Stands (doc wrong); follows Q-096.

#### F-293. `beta(1e15, 1)` is the exact case, not a logarithm example

- Type: contradicts implementation · Flags: **conflict**
- Target section: The Gamma and Beta families
- Units: D7 (L59, L96, L129, L199-200, L250), V3 (L26, L47, L72, L575-590, L764)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (`beta`, page L750-752)
- Claim or passage: "(`beta(1e15, 1)` is `1e-15` from logarithms near `2^55`)"
- Finding: two exact positive integers take the exact case first (`binomial(a + b - 2, a - 1)` is `1`), so no logarithm is formed: `beta(1e15, 1)` is the exact `1e-15`. The comment at `src/core/builtins/beta.ts:26` uses the same example. Both units tag the stale row update (new).
- Evidence: `src/core/builtins/beta.ts:96-97`, `:170-187`; D7 harness; V3 scratch (an exact ball)
- Corrected statement: D7: "(`beta(1e15, 1.5)` is `≈ 2.8024956e-23` from logarithms near `2^55`; `beta(1e15, 1)` itself takes the exact case)" (L96). V3: "(`beta(1e15, approx(1))` is `≈ 1e-15` from logarithms near `2^55`; `beta(1e15, 1)` itself is the exact case)" (L47).
- Conflict: the units replace the example differently, D7 with `beta(1e15, 1.5)` (harness, L59), V3 with `beta(1e15, approx(1))`, an inexact ball shown `1e-15` (scratch, L47); each ran its own.
- Proposed call: doc wrong: the integer exact case is deliberate (`beta` and `binomial` agree on what fits, page L740-742); pick one of the two verified examples.
- Related: Q-059, B-045, B-046
- Decision: Stands (doc wrong); the session picks one of the two verified examples.

#### F-294. Incomplete gamma: the regularized forms do not divide by `gamma(s)`

- Type: contradicts implementation
- Target section: The Gamma and Beta families
- Units: D7 (L61, L97, L202-203)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (incomplete gamma, page L801)
- Claim or passage: "The regularized forms divide by `gamma(s)`"
- Finding: `lowerOf` subtracts `ln Γ(s + 1)` and `upperOf` `ln Γ(s)`, both through `logGamma` in the exponent; `gammaBall` is called only for the `x = 0` case and the unregularized complement. Read, not run. Stale row tagged update (new).
- Evidence: `src/core/builtins/incomplete.ts:410-451`, `:192`, `:498`
- Corrected statement: "The regularized forms carry `ln Γ(s)` (for the lower form, `ln Γ(s + 1)`) in the exponent through `logGamma` rather than dividing by `gamma(s)`" (D7 L97).
- Proposed call: doc wrong: the same paragraph forms the exponent with `ln Γ(s + 1)` (page L787-791), so the code is the design the page describes; nothing suggests an intended division.
- Decision: Stands (doc wrong).

#### F-295. Incomplete gamma timings in the families section

- Type: measurement
- Target section: The Gamma and Beta families
- Units: D7 (L62, L98, L208-209), V3 (L51, L592-620)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (incomplete gamma, page L814-818)
- Finding: "Measured for the regularized upper form: one to two milliseconds a call at forty digits, forty to eighty at a thousand, and about a second at the default ceiling, two for `x = 1000`" are timings, not re-measured (C35). Both units tag the passage update under §12 q25, with different qualitative rewrites: D7 "The fraction's convergents grow with the square of the working bits and the series' terms with the bits, so a call far below the ceiling is cheap and the cost lies at the ceiling" (L98); V3 "The cost grows with the convergents or terms the route takes, so a large `x` under the fraction is the costly case at the ceiling (`[cost.md](cost.md)`)" (L51).
- Proposed call: Confirm update (q25); one sentence combining the two, which do not contradict each other; the convergent counts stay (the kept-measurements finding).
- Decision: Follows Q-016 and Q-088: one qualitative sentence from the two rewrites; the convergent counts stay; a rough timing may stay marked illustrative.

#### F-296. `erf` timing sentence goes

- Type: measurement · Flags: **conflict**
- Target section: The Gamma and Beta families
- Units: D7 (L64, L99, L211-212), V3 (L52, L622-634)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (`erf` and `erfc`, page L833)
- Finding: "A call is one to three milliseconds at forty digits." is a timing, not re-measured (C37); the cost is the incomplete gamma's. Both units delete it.
- Conflict: D7 tags it drop (L99), V3 update with the rewrite "delete" (L52); the outcome is the same.
- Proposed call: Confirm deletion (q25); what takes its place, if anything, is the `erf` tiny-argument finding.
- Decision: Stands (deletion); Q-016 would let a rough figure stay, but the cost is the incomplete gamma's and the sentence adds nothing.

#### F-297. `erf`'s tiny-argument rule: proposed for the families section, already stated

- Type: gap (new) · Flags: **conflict**
- Target section: The Gamma and Beta families
- Units: D7 (L99, L124, L211-212)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (`erf` and `erfc`, page L833); `devdocs/builtins.md#Huge and tiny arguments` (page L188-190)
- Gap: D7 puts in the dropped timing's place: "A tiny argument, whose square would pass below the bound or below `2^-significandLimitBits`, is `2x / √π` within the cube of its magnitude, the next term of the series, and `erfc` one less that (`erf(1e-999999999)` is `≈ 1.1283792e-999999999`)" (`erf.ts:13-20`; harness).
- Sources: `devdocs/builtins.md#Huge and tiny arguments` (page L188-190)
- Conflict: the page already states the rule there, "`erf` of a tiny argument is `2x / √π` within `|x|^3`", for an argument throughout below `2^-significandLimitBits` (`isTiny`), which V3 confirms (V3 L67, `erf.ts:154-170`; V3 report); D7, which read only the families section, puts the threshold on the square.
- Proposed call: one statement only: check D7's threshold (`erf.ts:13-20`) against `#Huge and tiny arguments`; correct that bullet if D7's reading holds, otherwise drop D7's sentence.
- Decision: Stands: one statement only; the session checks D7's threshold against `#Huge and tiny arguments`.

#### F-298. Incomplete beta: at `x = 1` the unregularized value is `B(a, b)`

- Type: contradicts implementation
- Target section: The Gamma and Beta families
- Units: D7 (L66, L101, L214-215)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (incomplete beta, page L864-865)
- Claim or passage: "Exact cases: `x = 0` is `0`, `x = 1` is `1`"
- Finding: `x = 1` is `1` for `incbetareg` and `B(a, b)` for `incbeta`: `incbeta(2, 3, 1)` is the exact `1/12`. Stale row tagged update (new). V3's re-flowed text of this passage keeps "`x = 1` is `1`" (V3 L654).
- Evidence: `src/core/builtins/incbeta.ts:190-193`; harness
- Corrected statement: "`x = 0` is `0`, and `x = 1` is `1` regularized and `B(a, b)` otherwise" (D7 L66).
- Proposed call: doc wrong: the page's `1` holds for the regularized function only, and the code gives the unregularized end point the definition requires.
- Decision: Stands (doc wrong).

#### F-299. Incomplete beta timings in the families section

- Type: measurement
- Target section: The Gamma and Beta families
- Units: D7 (L67, L100, L214-215), V3 (L53, L636-665)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (incomplete beta, page L872-874)
- Finding: "Measured at forty digits: a few milliseconds a call for moderate parameters, fifty for `(1e4, 1e4, 0.5)`" are timings, not re-measured (C40). Both units tag the passage update under §12 q25, with different rewrites: D7 "The series' cost grows with the parameters' size and with the bits" (L100); V3 "Large parameters near the median are the costly case, since both orientations then take many terms" (L53). Both keep #150 on this sentence.
- Proposed call: Confirm update (q25); combine the two rewrites in the repaired passage.
- Decision: Follows Q-016 and Q-088: the two rewrites combined; a rough timing may stay marked illustrative.

#### F-300. Memory figures and term counts kept as the schedule's reasons

- Type: measurement · Flags: **low confidence**
- Target section: The Gamma and Beta families
- Units: D7 (L52, L62, L65, L247)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (Bernoulli paragraph, page L638-643; incomplete gamma, page L793-794; incomplete beta, page L850-851)
- Finding: the ratio counts and sizes (730 to 1,430 ratios, about 0.8 to 1 MB, the run up to about 1.8 MB, the tangent numbers up to about 2.2 MB, about 80 KB at a thousand digits, under a kilobyte at forty), the convergent counts 768 and 443,000, and 89 terms against 11,837 are measurements but not timings; none was re-measured (C25, C35, C38).
- Proposed call: keep them as the quantitative reason the ratio schedule and the rate constant rest on, §12 q25 naming timings (D7's Q1; V3's Q3 proposes the same for bit, term and convergent counts and memory sizes); the owner settles it with the plan's "measurements kept" (V3 (F-510)).
- Related: Q-016, F-510
- Decision: Follows Q-016 (A, with the note): the memory figures, ratio counts, convergent counts and term counts stay as the quantitative reason the schedule rests on.

#### F-301. Not verified: kernel-side statements of the families section

- Type: not verified · Flags: **low confidence**
- Target section: The Gamma and Beta families
- Units: D7 (L53, L56, L60, L71, L73), V3 (L72, L764)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (`lgamma` and `gamma`, page L725-729; incomplete gamma, page L771-798; incomplete beta, page L839-847)
- Finding: still unverified after both reports: a wide ball's `gamma` "about six times the true width at `-2.5 ± 0.1`" (C29); the series' tail taken from `|x|` and the fraction's convergent counts (`fixed-incomplete.ts` bodies); the incomplete beta's tail bound and its full-precision division per term (`fixed-incbeta.ts`). Settled between the units: the Bernoulli memo by count and by bits, which V3 left unverified, D7 confirms from `bernoulli-ratios.ts` (C24); the shift to a third of the working bits and the series' end, which D7 did not read, V3 confirms (`fixed-gamma.ts:6-8,34-47`, `:88-89`).
- Why unverified: the kernels (`fixed-*.ts`) are outside D7's modules and were read by V3 by header only; no ball of that radius was typed.
- Proposed call: keep the statements; verify them when the kernels' comments or the structured comments are next written.
- Decision: Stands (keep; verify with the structured comments).

#### F-302. `#Not in this design`: no argument is complex; `sqrt(-1)`'s error

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Not in this design
- Units: D7 (L70, L104, L222-234), V3 (L55, L73, L720-736)
- Where: `devdocs/builtins.md#Not in this design` (page L902-903)
- Claim or passage: "Complex values and arguments: `ln(-1)`, `sqrt(-1)` and `gamma` off the real line are domain errors (`[future.md](future.md)`)."
- Finding: no argument can be complex: every argument is a real ball and `gamma`'s only `domain` error is a pole (D7); `sqrt(-1)` is the `negativeRadicand` error, worded "takes an even root of a negative value" (V3). Both read the code without running it; both tag the stale row update (new).
- Evidence: `src/core/builtins/gamma.ts:154-158`, `:325` (D7); `src/core/builtins/roots.ts:6-8` (V3)
- Corrected statement: D7: "no built-in takes or gives a value off the real line; `gamma` of a complex argument is deferred with the other special functions, and `gamma`'s domain errors are its poles" (L70), its rewrite keeping "`ln(-1)` and `sqrt(-1)` are domain errors" (L104). V3: "Complex values: `ln(-1)` is a domain error and `sqrt(-1)` an even root of a negative value, and no argument leaves the real line, since the language has no complex literal (`[future.md](future.md)`, "Complex numbers")." (L55)
- Conflict: D7 keeps `sqrt(-1)` among the domain errors (L104; `roots.ts` is outside its modules), V3 corrects it to `negativeRadicand` (L55), whose wording D5 also confirms (D5 report). They also place complex `gamma` differently: D7 in this bullet as deferred, V3 in the families' last paragraph (L710-711).
- Proposed call: doc wrong on `gamma` (both units); for `sqrt(-1)`, check whether `negativeRadicand` counts as a domain error: the page's domain-reason list omits it (page L330-334), and its `pow` and `sqrt` paragraphs name it apart from `domain` (page L367-368, L476).
- Decision: Stands (doc wrong on `gamma`); amended by Q-011: complex values are future work, so the bullet states the plain fact (no argument leaves the real line; `ln(-1)` is a domain error, `sqrt(-1)` an even root of a negative value) and links `devdocs/future.md`; the session checks whether `negativeRadicand` counts as a domain error; F-442 ("error", never "refused").

#### F-303. Reference-style issue links and their thirteen definitions

- Type: markdown and links
- Units: V3 (L8, L56, L67, L295-313, L738-740, L764), D5 (L40-42, L154, L160, L173), D6 (L44-45, L146-152, L208), D7 (L103, L187-220, L226-228)
- Where: `devdocs/builtins.md`, page L133, L235-236, L406, L519-520; `devdocs/builtins.md#The Gamma and Beta families` (page L649, L736, L810, L818, L874, L878-879, L881, L894); `devdocs/builtins.md#Not in this design` (page L899); the thirteen definitions at page L905-917
- Finding: every issue pointer on the page is a reference-style link (`[#63][63]` to `[#152][152]`), outside the Markdown subset; in the Gamma section and `#Not in this design` they are `[#103][103]`, `[#107][107]`, `[#112][112]`, `[#115][115]`, `[#125][125]`, `[#149][149]`, `[#150][150]`, `[#151][151]`, `[#152][152]`, `[#98][98]` and `[#100][100]`. All thirteen issues (#63, #65, #98, #100, #103, #107, #112, #115, #125, #149, #150, #151, #152) are open (V3 checked, L8), so the rewrite moves pointers rather than deleting them. #63 and #65 stay inline in `#Huge and tiny arguments`' closing paragraph, which owns both concepts; `tanh(75)` at 32 digits still takes two passes, so #65's sentence is current (V3 L67). V3's new text rewords that sentence, a statement made only in its edit: "`tanh` loses half its working bits between the exponential's fold and its saturation, which costs a pass" (L295-313). The definitions: D5 deletes `[63]` and `[65]` (L160); D7 inlines its sections' links and deletes `[98]` to `[152]` (page L907-917) once no passage uses them, leaving `[63]` and `[65]` (page L905-906) to the sections they serve; V3 deletes all thirteen.
- Proposed call: inline each issue at the one passage that owns it (§12 q26; which passage that is, for #98, #100, #152 and the issues shared with cost.md, is the cross-page issue-links finding's) and delete the definitions block with its last user.
- Related: Q-104
- Decision: Stands for the Markdown subset (inline links, the definitions block deleted); the places follow Q-012 (A: #103 and #115 here, the cost issues in `cost.md`), Q-014 and Q-104 (#98 and #100 are `future.md`'s), Q-011 (#63 and #65 are bugs and stay here); #115 and #112 stay here (confirmed on 2026-10-12, plan §12.2, items 1 and 10); #200 is linked once from the logarithm row (item 14, B-007).

#### F-304. What `devdocs/builtins.md` keeps, and the tables until the reference is generated

- Type: structure
- Units: V3 (L63-73, L755)
- Where: `devdocs/builtins.md`, every section; `#Dimension rules` (the table), `#Domains, exact cases and edges` (the table), `#The exact functions` (definitions and examples)
- Finding: stays as mechanism: `#(top)`'s second paragraph, `#Arity`, `#The rules every built-in follows`, `#Huge and tiny arguments`, `#Dimension rules`' introduction and the Angles mechanism, `log`'s and `pow`'s paragraphs, the algorithms of `#The elementary routines` and `#The Gamma and Beta families`, the "On balls" and prediction paragraphs. Stays as intent: `#Names`' rationale and ruled-out names, the Angles rationale, Boute's case and the ruled-out pairs, "There is no mode argument" (corrected), `#Not in this design`. The two per-function tables and the exact functions' definitions are the only per-function statement today and the seed of the structured comments (§12 q17).
- Proposed call: adopt V3's map; the tables and definitions stay until the generated reference exists, then become one link each (V3 Q2).
- Related: Q-114
- Decision: Stands; follows Q-114 (ok).

### Findings owned by other pages that touch this one

- F-067 (docs/quantities.md): `asin(0.5)` into `turn` is an angle, not the plain number (Q8)
- F-154 (docs/functions.md): Gamma-family cost figures given three times (plan §9.1)
- F-158 (docs/functions.md): Gaps refuted: §6.6 family items the page already carries
- F-159 (docs/functions.md): Incomplete functions' large-parameter refusal: wording and precision
- F-193 (devdocs/numbers.md): `#Memoized constants`: two requests pass the memo, `beta`'s unconfirmed; the 25 ms
- F-308 (devdocs/functions.md): Defined-before-built-in precedence: state the prohibition instead
- F-348 (devdocs/future.md): Ruled-out function classes reworded as deferred, on both pages (§9.4)
- F-413 (cross-cutting): Issue #98: three links on two pages; its one place disputed
- F-414 (cross-cutting): Issue #100: three links; `numbers.md#approx` its agreed place
- F-415 (cross-cutting): Issue #103: named on four pages; `builtins.md` or `cost.md`
- F-416 (cross-cutting): Issue #107: on three pages; `builtins.md` or `cost.md`
- F-417 (cross-cutting): Issue #115: `builtins.md` agreed; `future.md` points at the wrong section
- F-420 (cross-cutting): Issue #125: on three pages; `builtins.md` or `cost.md`
- F-422 (cross-cutting): Issue #149: on three pages; `builtins.md` or `cost.md`
- F-423 (cross-cutting): Issue #150: on three pages; `builtins.md` or `cost.md`
- F-424 (cross-cutting): Issue #151: `cost.md` agreed, but one edit keeps it in `builtins.md`
- F-425 (cross-cutting): Issue #152: `expFixed`'s bullet or `cost.md`'s hangs
- F-427 (terminology): "certain" for certified digits
- F-431 (terminology): "working digits" in three senses; "the working grid"; "working precision" for the grid
- F-440 (terminology): "decimal exponent" beside "the exponent"
- F-441 (terminology): "hard bound" (and "formable")
- F-443 (terminology): "refused" for a domain error; "error" for a size refusal
- F-446 (terminology): "rounding boundary", "tie", "grid point", "half-way mode"
- F-447 (terminology): "edge", "boundary", "bound"; "touch", "straddle"
- F-449 (terminology): Devdocs-only built-in vocabulary: door, boundary, whole range, saturates, ulp, F-division
- F-460 (terminology): "plain number" against "dimensionless"
- F-461 (terminology): "dimensionless checks" for the checks on the ball

## `devdocs/functions.md`

19 findings (F-305 to F-323).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/functions.md#(top)` | V4 (L113-119) | none |
| `devdocs/functions.md#Definitions` | D2 (L270-278), V4 (L121-153) | OVERLAP: page L36 and L87-90 drafted identically by both |
| `devdocs/functions.md#Annotations` | D2 (L280-292), V4 (L155-171) | OVERLAP: page L146-149 and L173-177 differ on the issue links (#130 and #132 inline, against "Deferred" below); page L190-192 make the same correction |
| `devdocs/functions.md#Names and shadowing` | D2 (L294-312), V4 (L173-194) | OVERLAP: the same bullet; #131 inline (D2) against "Deferred" below (V4) |
| `devdocs/functions.md#Conditions` | A6 (L343-359), D2 (L314-322), V4 (L196-259) | OVERLAP: three texts for the equality bullet, the same in substance; V4 also replaces the section body whole |
| `devdocs/functions.md#The check at a call` | A6 (L361-384) | OVERLAP: V4 proposes no edit (V4 L68); A6's first pair belongs with A6 (F-028) |
| `devdocs/functions.md#An undecided condition` | V4 (L261-286) | none |
| `devdocs/functions.md#Calls` | D2 (L324-347), V4 (L288-343) | OVERLAP: step 3 is identical. V4's step 1 adds "the defined functions first", against A9 (F-308) |
| `devdocs/functions.md#A function as the want` | A8 (L97-101), V4 (L345-357) | OVERLAP: both draft the same unit-list correction. V4 keeps "(a quotient past the exponent bound)"; compare A8 (F-313) |
| `devdocs/functions.md#Display` | A8 (L103-111), V4 (L359-389) | OVERLAP: A8's pairs against V4's full replacement. The ratio-in-a-call wording differs (A8 (F-314) against V4 report), and so does the example name (`dozen` against `twelve`) |
| `devdocs/functions.md#Build-time checks` | D2 (L349-383), V4 (L391-425) | OVERLAP: the step list and the inverse paragraph are near-identical ("nonzero, and certainly so" against "certainly nonzero"); only V4 corrects the `1e30000` sentence |
| `devdocs/functions.md#Precision, the radius and cost` | V4 (L427-484); D8 (L283-285, no text) | OVERLAP: V4 keeps "injects each rejected piece" (D2 (F-320)); its destinations differ from D8's (triplication finding) |
| `devdocs/functions.md#Not in this design` | V4 (L486-490) | none |
| `devdocs/functions.md#Deferred` | V4 (L492-514) | OVERLAP: conflicts with D2's issue-link placement (D2's question 2) |
| `devdocs/functions.md#Alternatives considered` | V4 (L516-541) | none |

### Findings

#### F-305. The grammar block is not marked hand-maintained

- Type: stale (update)
- Target section: Definitions
- Units: D2 (L39, L56, L272-274), V4 (L64, L127-129)
- Where: `devdocs/functions.md#Definitions` (page L36-48)
- Passage: "The grammar of a function line:" (the block, unmarked)
- Tag: update (new; the interim state of §2.2.3)
- Rewrite: "…, hand-maintained until the references' grammars are generated from the parser's own data; the whole line grammar, every kind of definition included, is the comment at the top of `src/core/definitions.ts`:" (identical in D2 L274 and V4 L129)
- Proposed call: Confirm `update`; both units drafted the same sentence.
- Related: Q-038
- Decision: Stands (update); follows Q-038.

#### F-306. Annotations: "since definitions cannot be typed" and the intended wording

- Type: stale (update) · Flags: **conflict**
- Target section: Annotations
- Units: D2 (L34, L286-288, L462), V4 (L39, L165-167)
- Where: `devdocs/functions.md#Annotations` (page L173-177)
- Passage: "No message is worded for a definitions rejection today, since definitions cannot be typed ([#132][132]); the wording meant for this one is "An annotation names units and cannot scale. …""
- Tag: update (plan §1.2.5 row, confirmed by both)
- Rewrite: "No message is worded for a definitions rejection today: only the system file is loaded, and definitions typed into the app are open (`[#132](…)`)" (D2 L288); V4 ends instead "…are deferred ("Deferred" below)" (L167). Both drop the intended wording, as the plan row says (it belongs to the issue).
- Conflict: #132 is linked here (D2) or in "Deferred" (V4), and the wording is "open" (D2) or "deferred" (V4). See the issue-link finding.
- Proposed call: Confirm `update`. The link is settled with the issue-link finding.
- Related: Q-011, B-029
- Decision: Stands (update) as amended by Q-011 and F-475: "No message is worded for a definitions rejection today: only the predefined definitions file is loaded", with no issue link and no "open"/"deferred"; #132 is `devdocs/future.md`'s only.

#### F-307. `zeroDeclaredUnit`: an annotation must be certainly nonzero

- Type: contradicts implementation
- Target section: Annotations
- Units: D2 (L41, L95, L115, L290-292), V4 (L41, L169-171)
- Where: `devdocs/functions.md#Annotations` (page L190-192)
- Claim or passage: "An annotation must be nonzero (`zeroDeclaredUnit`), since a count of zero means nothing; with the restriction above, that can fail only for a unit defined as zero."
- Finding: the build rejects a ball that contains zero, so an annotation that cannot be told from zero is also rejected.
- Evidence: `src/core/build.ts:833-838`; `src/core/ball.ts:334-339`; harness: the annotation `approx(1e-50 m) - approx(1e-50 m)` gives `zeroDeclaredUnit` (D2)
- Corrected statement: "An annotation must be certainly nonzero: a value that is zero, or that cannot be told from zero, is rejected (`zeroDeclaredUnit`), since a count of either means nothing; with the restriction above, that can fail only for a unit defined as zero or as an inexact value around it." (V4 L41; D2 L292 is the same with "nonzero, and certainly so")
- Proposed call: **doc wrong**. The check is made on the ball, and `devdocs/architecture.md`'s catalogue already says "zero, or cannot be told from zero"; both stale rows are tagged update.
- Decision: Stands (doc wrong).

#### F-308. Defined-before-built-in precedence: state the prohibition instead

- Type: other · Flags: **conflict**
- Target section: Names and shadowing
- Units: A9 (L26, L62-72, L326-330), D1 (L205), V2 (L308), V4 (L310-311)
- Where: `devdocs/functions.md#Names and shadowing` (A9's proposed home); `devdocs/builtins.md#(top)` (page L16-20, "a call's name resolves to a defined function first and a built-in second"); plan §2.1.1; `devdocs/functions.md#Calls` (page L489-490; V4's proposed step 1)
- Finding: a call's name does resolve among the defined functions before the built-ins (`resolveFunction`, `src/core/table.ts:234-243`; the build's lookup, `src/core/build.ts:935-952`), but a definition named like a built-in is a `duplicate` at indexing (`src/core/build.ts:426-431`), so a table that builds never has both and the order decides nothing; D1 confirms the order is never observable (D1 report). A9 asked D2 and V4 (A9's question 6) to state the prohibition rather than a precedence and to leave the order to the code comment. Neither D2's nor V4's report takes it up: V4's `#Calls` draft adds "the defined functions first" to a step that states no order today (page L489-490), and V2 restates the order as fact for V3 (V2 notes). `devdocs/builtins.md#(top)` (page L16-20, read at consolidation) states both the duplicate rule and the order.
- Conflict: V4's draft states the precedence (V4 L310-311), where A9 says to drop it (A9 L326-330). V3 confirms the `builtins.md` sentence as true of the code (V3 report), and V2 hands V3 the order as a fact (V2 L308). D1 finds the order unobservable, so "the reference need not state it" (D1 (F-079), D1 report; D1 L205).
- Proposed call: `devdocs/functions.md#Names and shadowing` states the prohibition (a definition may not take a built-in's name) and leaves the lookup's order to the code comment (A9's proposal); drop "the defined functions first" from V4's step 1; `devdocs/builtins.md#(top)`, V3's page, keeps the duplicate rule and drops or qualifies the order.
- Related: Q-113, F-079
- Decision: Stands; follows Q-113 (ok: the prohibition stated, the order left to the code comment; V4's "the defined functions first" dropped).

#### F-309. Calls: each argument is checked as soon as it is evaluated

- Type: contradicts implementation
- Target section: Calls
- Units: D2 (L44, L324-347), V4 (L44, L70, L288-343)
- Where: `devdocs/functions.md#Calls` (page L494-499), steps 3 and 4
- Claim or passage: "3. The arguments are evaluated, left to right, each once: a call is by value. 4. Each argument must conform to its parameter's annotation, …"
- Finding: each argument is checked as soon as it is evaluated, so a failure is reported before any later argument is evaluated.
- Evidence: `src/core/evaluate.ts:692-719`
- Corrected statement: merge steps 3 and 4: "3. The arguments are evaluated left to right, each once (a call is by value), and each is checked as soon as it is evaluated: … a failure is `argumentMismatch`, …, and it is reported before any later argument is evaluated." Steps 5 and 6 become 4 and 5. The text is identical in D2 L340-346 and V4 L315-321.
- Proposed call: **doc wrong**. Both units reasoned from code, and V4 re-verified D2's row.
- Decision: Stands (doc wrong).

#### F-310. A function's name in a unit list is `functionAsUnit`

- Type: contradicts implementation
- Target section: A function as the want
- Units: A8 (L30, L45, L97-101), V4 (L48, L105, L355-357)
- Where: `devdocs/functions.md#A function as the want` (page L570-572)
- Claim or passage: "A function's name is not a unit anywhere else: in a unit list (`tempC;degC`) it is an unknown unit, as a list's name is."
- Finding: the lookup refuses a function's name typed as a unit with `functionAsUnit`, whose message shows the call form. A list's name in the same place is `unknownUnit`. `docs/definitions.md:228-229` already says this correctly.
- Evidence: `src/core/table.ts:184-192`; scratch (V4): `1 K` into `tempC;degC` says "tempC" is a function, not a unit, while `1 s` into `time;s` says Unknown unit "time"
- Corrected statement: "…in a unit list (`tempC;degC`) it is `functionAsUnit`, as it is in an expression ("Calls"), where a list's name is an unknown unit." (V4 L48). A8 (L45) says the same in other words.
- Proposed call: **doc wrong**.
- Related: B-036
- Decision: Stands (doc wrong); B-036 is the code side.

#### F-311. The `noInverse` message is misquoted

- Type: contradicts implementation · Flags: **conflict**
- Target section: A function as the want
- Units: V4 (L49, L351-353)
- Where: `devdocs/functions.md#A function as the want` (page L528-531), step 1
- Claim or passage: `"normcdf" has no inverse, so it cannot be the unit to convert to. Define ~normcdf(y) = … to give it one.`
- Finding: the message puts the define form in quotes.
- Evidence: `src/messages.ts:464-465`; scratch run
- Corrected statement: `"normcdf" has no inverse, so it cannot be the unit to convert to. Define "~normcdf(y) = …" to give it one.`
- Conflict: A8 finds that the wording the page quotes is the one `src/messages.ts:465` writes (A8 report, A8 L54).
- Proposed call: **doc wrong** if the inner quotes are in the message, as V4's run shows. A8's check may not have compared the quote marks; compare `src/messages.ts:464-465` with step 1 to settle it.
- Decision: Stands (doc wrong if the inner quotes are in the message): the session compares `src/messages.ts:464-465`.

#### F-312. The fields of `Conversion`'s `function` kind

- Type: contradicts implementation
- Target section: A function as the want
- Units: V4 (L50, L355-357)
- Where: `devdocs/functions.md#A function as the want` (page L566-570)
- Claim or passage: the conversion "carries the `have`, the want's text, the recovered argument, the parameter's annotation with its text, and the argument as a count of that unit"
- Finding: it carries the `have` as read and as evaluated, the function's name, the recovered argument, the parameter's unit with its text and expression, and the count.
- Evidence: `src/core/pipeline.ts:237-250`
- Corrected statement: "The conversion (`Conversion`'s `function` kind) carries the `have`, as read and as evaluated, the function's name, the recovered argument, the parameter's annotation with its text, and the argument as a count of that unit" (V4 L50)
- Proposed call: **doc wrong** (V4, reasoned from code).
- Decision: Stands (doc wrong).

#### F-313. The contexts of a conversion into a function are left implicit

- Type: other · Flags: **low confidence**
- Target section: A function as the want
- Units: A8 (L29, L54)
- Where: `devdocs/functions.md#A function as the want` (step 6, "at the same working context", page L542-543)
- Finding: the page does not say at which context each step runs. The inverse, the function applied back and both condition checks run at the operand context of the pass (`src/core/pipeline.ts:724`); the count is stepped at the pass's context (`:796-800`); a count refused as any quotient may be is the conversion's refusal (`:801-805`). V4's draft of the section's last paragraph keeps "(a quotient past the exponent bound)", where A8 words it as any quotient's refusal and A8 (F-070) adds the significand limit to a ratio's refusals. A8 reasoned from code.
- Proposed call: name the two contexts in step 6 in one clause. Before keeping "(a quotient past the exponent bound)", check whether the count can also be refused at the significand limit.
- Related: F-070
- Decision: Stands; the session names the two contexts and checks whether the count can be refused at the significand limit (F-070).

#### F-314. Display: a ratio inside a call is bare only for a plain number

- Type: contradicts implementation · Flags: **conflict**
- Target section: Display
- Units: A8 (L54, L103-111)
- Where: `devdocs/functions.md#Display` (page L589-591)
- Claim or passage: "a ratio is written bare inside the call (`[notation.md](notation.md)`)"
- Finding: this holds for a plain-number argument: `1 K` into `tempC` under the ratio notation is `tempC(-5443/20)`. With a unit, the ratio is parenthesized before it as anywhere else: `1 m` into the scratch function `bakers` is `bakers((1250/381) in)`. A negative argument is written inside the call (`bakers(-2 in)`).
- Evidence: harness (A8)
- Corrected statement: "A ratio is written bare inside the call when the argument is a plain number, `tempC(-5443/20)`, and parenthesized before its unit as it is anywhere else, `dozen((1250/381) in)` (`[notation.md](notation.md)`); a negative argument is written inside the call, `dozen(-2 in)`." (A8 L107-111)
- Conflict: V4 lists "a ratio bare inside the call and parenthesized before a unit" among the statements it verified (V4 L90; V4 report: `tempC(-475/27)` against `(1/10) kg`). V4's replacement keeps "written bare inside the call (`tempC(-475/27)`), where before a unit it would be parenthesized" (V4 L379-382) and does not name a ratio before the parameter's unit inside a call.
- Proposed call: **doc wrong**, per A8's run. Check whether V4's wording covers `twelve((1250/381) in)`. A8's example name follows the `dozen` finding.
- Decision: Stands (doc wrong); follows Q-015 (B: the example is `twelve`).

#### F-315. Display: the annotation is written back by the printer

- Type: contradicts implementation
- Target section: Display
- Units: V4 (L51, L107, L359-389)
- Where: `devdocs/functions.md#Display` (page L578-581)
- Claim or passage: "followed by the annotation's text by the rule a `want`'s text follows, and by nothing when the annotation is `1` or absent"
- Finding: the argument's unit is the annotation as read, written back by the printer as a `want` is; its text serves only to tell `1`. An explicit `: 1` writes no unit, just as an absent annotation does (new to both corpora).
- Evidence: `src/outcome.ts:634-647`; scratch: an annotation written `(in)` shows as `paren(2 in)`, one written `1` as `one(3)`
- Corrected statement: "followed by the annotation, written back by the printer as a `want` is, and by nothing when the annotation is `1`, written or absent" (V4 L51)
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong).

#### F-316. Build-time checks: the order of a function's checks

- Type: contradicts implementation
- Target section: Build-time checks
- Units: D2 (L45, L123, L130, L349-375), V4 (L45, L73, L391-417)
- Where: `devdocs/functions.md#Build-time checks` (page L604-618)
- Claim or passage: "1. Evaluating its annotations … 2. Taking the body's dimension … Each condition's terms are taken the same way. 3. Checking the result against its annotation"
- Finding: the parameters' annotations come first, evaluated among the units alone, then the body, then the conditions. The result's annotation is evaluated and checked last.
- Evidence: `src/core/build.ts:539-553`, `:555-567`, `:568-575`, `:576-598` (`:542-549` among the units; `:609-617` `PLAIN`)
- Corrected statement: four steps (full text: D2 L356-374, V4 L398-416): (1) each parameter's annotation is evaluated among the units and must be certainly nonzero; (2) the body's dimension is taken by `dimensionOf`, a built-in's dimension rule included; (3) each condition's terms are taken the same way; (4) the result's annotation is evaluated and checked (`functionMismatch`, naming the result).
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong).

#### F-317. Build-time checks: the "first version" history sentence

- Type: stale (drop)
- Target section: Build-time checks
- Units: D2 (L33, L381-383), V4 (L37, L423-425)
- Where: `devdocs/functions.md#Build-time checks` (page L636-638)
- Passage: "(The first version of the check evaluated each body at one of the declared unit, which the elementary functions made untenable.)"
- Tag: drop (plan row, confirmed by both)
- Rewrite: delete it; the sentence before it gives the reason in the present tense.
- Proposed call: Confirm `drop`. The same history in the code comments (`src/core/build.ts:50-53`, `src/core/dimension-of.ts:3-4`) is bugs.md's.
- Related: Q-059, B-034
- Decision: Stands (drop); the comments follow in the comment pass (Q-059).

#### F-318. A body of `1e30000` builds, and its call succeeds

- Type: contradicts implementation
- Target section: Build-time checks
- Units: V4 (L47, L88, L104, L423-425, L562, L568)
- Where: `devdocs/functions.md#Build-time checks` (page L638-639)
- Claim or passage: "A literal in a body is not checked against the significand limit either, so a body of `1e30000` builds and fails at the call"
- Finding: `1e30000` has the significand `1` and an exponent well within the bound, so the call succeeds (`big(1) = 1e+30000`). What builds and then fails at the call is a literal with more digits than the significand limit holds, within the parser's hard bound (a 20,000-digit literal on the scratch run).
- Evidence: `src/core/evaluate.ts:505-523`; `src/core/rational.ts:115`; scratch
- Corrected statement: "…so a body whose literal has more digits than the limit holds, within the parser's hard bound, builds and fails at the call" (V4 L47)
- Proposed call: **doc wrong** (the example). D2's harness agrees that the body builds (`big(x) = 1e30000 x`, D2 L104). The same example in `src/core/dimension-of.ts:26-28` is bugs.md's.
- Related: Q-059, B-047
- Decision: Stands (doc wrong).

#### F-319. Benchmark numbers in prose

- Type: measurement
- Target section: Precision, the radius and cost
- Units: V4 (L53, L92, L477-483)
- Where: `devdocs/functions.md#Precision, the radius and cost` (page L699-704)
- Finding: "the benchmark builds 500 and 2,000 functions, …, and the cost grows about fourfold" is a measurement in prose (§12 q25). The benchmark asserts a bound instead: four times the functions, at most eight times the cost (`bench/build.bench.ts:69-110`, over the file `bench/synthetic.ts:114-123` writes).
- Proposed call: as V4: "the benchmark builds a file of functions, …, then one four times as long, and asserts that the cost grows in proportion, within a margin" (V4 L477-483).
- Decision: Follows Q-016: V4's wording, or the benchmark's constants with the asserted bound as a ratio (the session's choice).

#### F-320. "Injects each rejected piece": two rejections are not drawn

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Precision, the radius and cost
- Units: D2 (L67), V4 (L92, L481-483)
- Where: `devdocs/functions.md#Precision, the radius and cost` (page L701-704: "a seeded property test draws hundreds of function and inverse lines, … and injects each rejected piece where it should be rejected")
- Claim or passage: the property test "injects each rejected piece where it should be rejected"
- Finding: the property test injects five rejected pieces: a mixed chain, a scale in an annotation, a repeated parameter, an annotation on an inverse's parameter, and `[D]` after the name. It does not draw `annotationNotUnits` or `parameterNamesUnit`, which hand-written tests cover.
- Evidence: `src/core/definitions.test.ts:455-488`, `:918-986`
- Corrected statement: none given. D2 records this as test coverage and proposes no page edit.
- Conflict: V4 confirms the page's sentence (V4 report, V4 L92) and keeps it in its draft (V4 L481-483).
- Proposed call: **undetermined**. Either the page names which rejections the test injects (doc), or the test also draws the two missing ones (code; D2 L67).
- Decision: Follows its own answer (ok): if D2 is right the page names the rejections the test injects; the two missing draws are a test improvement to take up separately if wanted. [decisions.md section 3; plan §12.1] Issue #202 tracks the two draws (opened on 2026-10-12; plan §12.2, item 14); the pages do not link it.

#### F-321. Issue links #130 to #134: reference-style and linked more than once

- Type: markdown and links · Flags: **conflict**
- Target section: Deferred
- Units: D2 (L34, L40, L42, L282-288, L311, L462), V4 (L52, L161-167, L280-282, L486-514, L539-541, L558), A6 (L231-233)
- Where: `devdocs/functions.md#Annotations` (page L149, L175), `#Names and shadowing` (page L238), `#An undecided condition` (page L457), `#Not in this design` (page L739), `#Deferred` (page L751-763), link definitions (page L826-830); `devdocs/future.md:166-175`; `devdocs/cost.md:155`
- Finding: five reference-style links lie outside the Markdown subset. #130 to #133 are each linked from two or more places, counting `future.md` and `cost.md`, against §12 q26. All five issues are open (V6 (F-415), read 2026-10-10); D2, V4 and A6 do not state their status.
- Conflict: on placement, D2 (question 2, L462) puts #130 under "Annotations", #131 under "Names and shadowing", #132 in `docs/definitions.md#The format` (`future.md` keeping the intent without a link) and #133 under "Deferred", the rest becoming plain mentions; V4 (question 1, L558) puts #130 to #133 inline in "Deferred" and #134 in "An undecided condition", every other place referring to those sections, and says either placement satisfies q26; V6 (F-415) has `functions.md` own #130 to #134, with `future.md` pointing at the owning section; and plan §7 names #132 under `docs/definitions.md` "User definitions". On wording, D2 writes "is open" and V4 "is deferred".
- Proposed call: link each issue once, inline, at its owning passage; delete the five definitions; make every other mention a plain reference. The owner chooses D2's or V4's placement (both meet q26). `future.md` and `cost.md` follow (V6's pages).
- Related: Q-011, F-347, F-360, F-415
- Decision: Follows Q-011: #130 to #134 are linked from `devdocs/future.md` only; every mention on this page becomes a plain reference to `future.md` ("is future work", never "deferred" or "open" with a number), the `#Deferred` section leaves for `future.md` with its design text, and the five definitions go.

#### F-322. Alternatives considered: the first form as one alternative

- Type: stale (keep as intent)
- Target section: Alternatives considered
- Units: V4 (L38, L78, L516-537)
- Where: `devdocs/functions.md#Alternatives considered > The syntax` (page L802-814)
- Passage: "The first form, `tempC(x) [1;K] x K + 273.15 K ; tempC / K - 273.15`, declared the units of the argument and the result in brackets, both required, … keep the first form's use of the function's own name …"
- Tag: keep as intent (plan row confirmed)
- Rewrite: list the forms set aside, each with what it loses: a bracketed head, annotated signatures with the inverse after `;`, GNU units' keyword clauses, and a multi-line block. Putting the inverse on its own line makes "optional" literal. (V4 L522-537)
- Proposed call: Confirm `keep as intent`. The ruled-out forms stay with their reasons, without a "first form" chronology.
- Decision: Stands (keep as intent).

#### F-323. devdocs/functions.md re-explains user rules: per-section link and stay

- Type: structure
- Units: V4 (L57-78, L113-194, L196-259, L261-286, L288-389, L427-484)
- Where: `devdocs/functions.md` (every section), against `docs/definitions.md#Functions`; plan §9.1; §12 q24
- Finding: V4's table (L61-78), section by section, giving what becomes a link and what stays. (top): links to `definitions.md` "Functions" and `quantities.md` "Conversion into a function"; why functions exist stays. `#Definitions`: the user rules become links and the `units.txt` block one sentence (§12 q4); the grammar block (marked), the head's rules, the build errors and `Definition`'s shape stay, and the function-of-none bullet is rewritten. `#Annotations`: the opening rule is linked; the rationale stays. `#Names and shadowing`: the user rule is linked; why shadowing is allowed, the sigil alternative and the two parse errors stay. `#Conditions`: syntax and meaning are linked and the examples block goes. `#An undecided condition`: the rationale is quoted in one line; the retry treatment, the warning, the collector and the build's refusal stay. `#Calls`: the call rule is linked; the steps stay. `#A function as the want`: the opening sentence is linked; the six steps, the refutation and the alternatives stay. `#Display`: the line's meaning is linked; how the outcome writes it stays. `#Precision, the radius and cost`: the user consequences are linked; the mechanism stays. `#The check at a call`, `#Build-time checks`, `#Where it lives`, `#Not in this design`, `#Deferred` and `#Alternatives considered` stay as they are.
- Proposed call: apply V4's table (§12 q24): one sentence and a link, then mechanism and rationale. For interim link targets, see the finding on links to docs pages that do not exist yet (V4 (F-426)).
- Related: Q-020, Q-021
- Decision: Stands: V4's table applied in the one-pass rewrite after `docs/definitions.md`, `quantities.md` and `expressions.md` exist (Q-008); amended by Q-011: `#Deferred` moves to `devdocs/future.md` (F-321), `#Not in this design` stays as ruled-out alternatives; both "inverse calls in expressions" and "optional parameters" are ruled out (confirmed on 2026-10-12, plan §12.2, item 12): the first keeps its reason, the second gains one or goes; `!=` in conditions is not among the ruled-out designs but future work with equality (plan §12.3, R-5).

### Findings owned by other pages that touch this one

- F-028 (docs/numbers.md): N14 and devdocs: a difference "refused as too large" cannot arise
- F-029 (docs/numbers.md): N14: a touch is not a straddle; the callers decide
- F-030 (docs/numbers.md): N16 and `#Conditions`: equality absent today, not ruled out
- F-033 (docs/numbers.md): The call-cost paragraph triplicated; where its parts go
- F-095 (docs/definitions.md): The call rule stated in four places
- F-096 (docs/definitions.md): How definitions interact with exactness (§6.4)
- F-098 (docs/definitions.md): Pages describe messages for definitions errors; none is worded
- F-099 (docs/definitions.md): The `dozen` example names a unit of the file
- F-100 (docs/definitions.md): The three-valued check and "why conditions differ" duplicated
- F-104 (docs/definitions.md): Units, lists, functions and built-ins share one set of names
- F-106 (docs/definitions.md): A built-in's dimension rule applies at build
- F-229 (devdocs/architecture.md): The parser's rejection lists omit `inverseAnnotation`
- F-232 (devdocs/architecture.md): The orphan-inverse check runs right after indexing
- F-345 (devdocs/future.md): Extensions that fit omits the §1.3 intents other pages link to
- F-421 (cross-cutting): Issues #130 to #134: one owner page, two placements proposed
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-447 (terminology): "edge", "boundary", "bound"; "touch", "straddle"
- F-460 (terminology): "plain number" against "dimensionless"
- F-467 (terminology): Conversion into a function: "function conversion", "function want", "a function as the want"
- F-476 (terminology): "loaded" (docs) and "build" (devdocs)
- F-477 (terminology): "head" of a function or inverse line
- F-478 (terminology): "user-defined functions" for the functions the file defines
- F-479 (terminology): "the unit it takes" as the gloss of "annotation"
- F-480 (terminology): A condition's outcome: undecided, holds, fails, verdict, assumed, "certainly"
- F-481 (terminology): "its own domain", "a restriction" for conditions
- F-483 (terminology): "intervals" for the temperature units; "interval" elsewhere

## `devdocs/notation.md`

7 findings (F-324 to F-330).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| (top) | V5 (L107-113) | conflict within V5: its Findings (L88) and its text (L113) differ on the second paragraph (V5 report) |
| The rule (rules 1 to 4, summary) | V5 (L115-125) | none |
| The rule ("The width") | A2 (L86-89), D4 (L382-385), V5 (L127-133) | OVERLAP: three present-tense rewrites; V5's covers the paragraph from "Eight, the display digits' default" |
| Where a ratio is written | A2 (L91-94), V5 (L135-139) | OVERLAP: same substance, two wordings |
| Every literal parses back | A2 (L96-98) | conflict: assumes A2 (Q-002)'s code fix; under A8 (Q-002)'s fix the page states a refusal |
| Where it lives | A2 (L100-102), V5 (L141-143) | OVERLAP: a new `print.ts` bullet (A2) against the printer named in the `outcome.ts` bullet (V5) |

### Findings

#### F-324. notation.md#(top): V5's two versions of its second paragraph

- Type: structure · Flags: **conflict**
- Target section: (top)
- Units: V5 (L88, L107-113)
- Where: `devdocs/notation.md#(top)` (page L1-22)
- Finding: The section opens with a link to the docs' owner of the notation (the Notation entry of `docs/settings.md`, later `numbers.md`'s section on how numbers are written). The second paragraph restates the user rule for the decimal display's `=`.
- Conflict: V5's Findings (L88) make it one line with a link to the docs' "What a line says" (no such section in §7's outline; the nearest is `numbers.md#Digits you can trust`), while V5's proposed text (L113) keeps the paragraph and links devdocs `numbers.md`, "Certification and the display rule" (V5 report).
- Proposed call: Open with the link (§12 q24); the owner picks between V5's two versions of the second paragraph.
- Decision: Stands: the opener with the link to `docs/numbers.md#How numbers are written` (its owner once that page exists, Q-008); the session picks between V5's two versions of the second paragraph.

#### F-325. Rule 1's `sqrt(2)` midpoint figure is not what is held

- Type: contradicts implementation
- Target section: The rule
- Units: V5 (L40, L115-125)
- Where: `devdocs/notation.md#The rule` (rule 1, page L29-33)
- Claim or passage: "After `sqrt(2)` at eight digits the midpoint held is `141421356237309504880 / 10^20`" (V5 also tags it stale, update)
- Finding: The harness gives `1414213562373095048801688724 / 10^27`: the figure depends on the schedule's first grid.
- Evidence: V5's harness
- Corrected statement: "the midpoint held is the root's digits on the first pass's grid, a few dozen of them over the matching power of ten, a true fraction of what is held and no truth about `sqrt(2)`" (V5 L40)
- Proposed call: **doc wrong**: the example pins a value of the schedule's internals that the rule does not need.
- Related: F-452, F-455, F-456
- Decision: Stands (doc wrong); follows F-456 and F-455.

#### F-326. Rule 3 names `toRational`; `ratioParts` forms the fraction itself

- Type: contradicts implementation
- Target section: The rule
- Units: V5 (L41, L121)
- Where: `devdocs/notation.md#The rule` (rule 3, page L49)
- Claim or passage: "(`toRational` on the `Scaled` form)" (V5 also tags it stale, update)
- Finding: `toRational` lives in `src/core/scaled.ts:218` and `display.ts` does not call it; `ratioParts` multiplies the power of ten back in and reduces.
- Evidence: `src/core/scaled.ts:218`; `src/core/display.ts:140-141`
- Corrected statement: "(`ratioParts` multiplies the power of ten back in and reduces)" (V5 L41)
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong).

#### F-327. "The first rule tied the fit to the display digits" (keep as intent)

- Type: stale (keep as intent)
- Target section: The rule
- Units: A2 (L38, L86-89), D4 (L62, L382-385), V5 (L34, L90, L127-133)
- Where: `devdocs/notation.md#The rule` ("The width", a bold label, page L127-133)
- Passage: "The first rule tied the fit to the display digits, each part fitting within them; that coupled a length to a precision…, hid exact values…, and could not be read off the settings."
- Tag: keep as intent; plan row confirmed by all three (D4 revises the pointer to `#The rule > The width`, a bold label, not a heading)
- Rewrite: the ruled-out alternative in the present tense ("A fit tied to the display digits … is ruled out: it couples a length to a precision…"); V5 also puts "Eight, the display digits' default, was set aside" and "no bound was set aside" in the present tense (A2 L86-89; D4 L382-385; V5 L127-133).
- Proposed call: Confirm `keep as intent`; three drafts of the same sentence (OVERLAP), V5's covering the whole paragraph.
- Related: F-511
- Decision: Stands (keep as intent); the pointer form follows F-511 (plan corrected).

#### F-328. Reference-style issue links: #178 here, #92 on architecture.md

- Type: markdown and links
- Target section: The rule
- Units: A2 (L47, L51, L89, L109), V5 (L45, L103, L131-133), D4 (L60, L133, L385)
- Where: `devdocs/notation.md#The rule` ("The width", `[#178][178]`, page L135) and the page foot (page L247); `devdocs/architecture.md` (`[#92][92]`, page L1100, L1120)
- Finding: Reference-style issue links with definitions at the page foot, outside the Markdown subset; A2 and V5 tag them stale, update. No unit states the issues' open or closed status.
- Proposed call: An inline link at the one owning passage, saying only what is open (§12 q26: "is open (`[#178](…)`)", V5 L131), the definitions deleted; check each issue's status first, since a closed issue's references go.
- Related: F-221, F-411, F-412
- Decision: Stands for #92 (its one home is `devdocs/architecture.md#The converter and its lines`, Q-103) and for the inline form; #178 (a study of the exact-mode display) is future work (confirmed on 2026-10-12, plan §12.2, item 6): its one link is `devdocs/future.md`'s, beside the display policy, and the width paragraph states the rule as it is, naming no issue.

#### F-329. The parentheses are the printer's, not the outcome's

- Type: contradicts implementation
- Target section: Where a ratio is written
- Units: A2 (L44, L46, L65, L94, L100-102), V5 (L43-44, L84, L139-143, L245)
- Where: `devdocs/notation.md#Where a ratio is written` (last paragraph, page L166-167); `devdocs/notation.md#Where it lives` (`outcome.ts` bullet, page L239-241)
- Claim or passage: "the outcome parenthesizes, since only it knows what follows the value on the line"; for `outcome.ts`, "the parentheses before a unit and the reciprocal's `×`" (both units tag both passages stale, update)
- Finding: The outcome composes the line as an expression, the ratio a quotient of two literals, negated on the numerator, times its power of ten, as the first factor of its unit (`quantityExpr`, `timesFirst`); the printer (`print.ts`) decides the parentheses by the grammar's levels and writes `×` for the screen where the clipboard gets `*`. `#Where it lives` has no `print.ts` entry.
- Evidence: `src/core/print.ts:5-6`, `:14-23`, `:136-147`, `:165-175`; `src/outcome.ts:411-443`, `:157-169`
- Corrected statement: "The outcome composes the line as an expression … and the printer (`print.ts`) decides the parentheses from the grammar's levels: a ratio is parenthesized before a factor joined by juxtaposition and bare before `×`." (V5 L139; A2 L94)
- Proposed call: **design changed without the docs following**: `print.ts`'s header owns parenthesization (V5 L245) and the line is a tree, so "only it knows what follows" no longer holds. OVERLAP on `#Where it lives`: A2 adds a `print.ts` bullet (A2 L100-102), V5 names the printer inside the `outcome.ts` bullet (V5 L141-143).
- Decision: Stands (design changed): the printer decides the parentheses; follows Q-003 (A).

#### F-330. notation.md: which sections stay as mechanism, which open with a link

- Type: structure
- Units: V5 (L66, L89, L91-94, L115-125, L135-143)
- Where: `devdocs/notation.md#The rule`, `#Where a ratio is written`, `#Every literal parses back`, `#Not in decimal mode`, `#Not in this design`, `#Where it lives`
- Finding: `#The rule` stays as mechanism (the five rules with their reasons and the predictability constraint); `#Where a ratio is written` stays, corrected to the printer's rule; `#Every literal parses back` stays, the paste-back principle linked to `numbers.md` rather than restated (§12 q11); `#Not in decimal mode` opens with a link to the docs' Notation entry and keeps the enforcement at `outcomeOf` and the pipeline's settling; `#Not in this design` and `#Where it lives` stay, the latter corrected.
- Proposed call: As V5 maps it (§12 q24); V5 drafts no text for the two opening links (`#Every literal parses back`, `#Not in decimal mode`).
- Decision: Stands; amended by Q-002 (B): `#Every literal parses back` states the refusal at the bound (A2's draft is superseded); the two opening links written in the one-pass rewrite (Q-008); F-457 ("parses back" in devdocs, "pastes back" in the linked docs).

### Findings owned by other pages that touch this one

- F-060 (docs/numbers.md): N12: the top-edge literal is not written; the outcome throws
- F-061 (docs/numbers.md): Ratio rule: the code forms no fraction for dyadic values that fit
- F-121 (docs/settings.md): The ratio is bare before the reciprocal's `×`: `in = 1/36 × 3 ft`
- F-440 (terminology): "decimal exponent" beside "the exponent"
- F-452 (terminology): "whole number" and "integer"
- F-454 (terminology): "the decimal display", "the fallback", "the digits notation"
- F-455 (terminology): Rule 4's form: "scaled ratio" or "a ratio times its power of ten"
- F-456 (terminology): "fraction" reserved for the held value
- F-457 (terminology): "parses back", "typed back", "reads back", "pastes back"

## `devdocs/settings.md`

14 findings (F-331 to F-344).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| (top) | V5 (L145-147) | none |
| The model | V5 (L149-175), D4 (L356-363) | OVERLAP: D4's four pairs fall inside V5's replacement; conflict: V5 keeps "the finest grid the app rounds onto" and "derived and shown" (A3 findings 3 and 4) |
| Storage | V5 (L177-181) | none |
| Applying a change | D4 (L365-368), V5 (L183-193) | OVERLAP: "a build" against "a cost" for the memoized table; both inline #167 |
| The probe | D4 (L370-375), V5 (L195-205) | OVERLAP, conflict: the floor's quote kept elided (V5) or dropped (D4); #118 one inline link (D4) or none (V5); "for a fraction of a second" rewritten (D4) or kept (V5); "costs seconds" made "many times the budget" (V5) or kept (D4) |
| The sheet | V5 (L207-211) | none |
| The controls | D4 (L377-380), V5 (L213-219) | OVERLAP: both rewrite the overflow history and the #191 sentence; V5 also moves the notation |

### Findings

#### F-331. settings.md#The model rewritten on top of numbers.md and settings.md

- Type: structure · Flags: **conflict**
- Target section: The model
- Units: V5 (L96, L149-175, L245)
- Where: `devdocs/settings.md#The model` (page L28-213)
- Finding: V5 replaces the section through "…what the setting means now." (the `ts` block and the two paragraphs after it unchanged): it opens on `docs/numbers.md` and `docs/settings.md`, keeps the fields' mapping to the core, the names and their reasons, the two limits' inequality, the chain, the ruled-out shapes of the limits and of the mode, the mode names and the rounding default's reason, and resolves §9.1's duplication of the representation by sending "The terms" to `numbers.md` (docs and devdocs).
- Conflict: V5's text keeps "the finest grid the app rounds onto" and "derived and shown" (V5 L157, L161, L165), which A3 disputes (the findings that carry A3 (F-125) and A3 (F-126)).
- Proposed call: Adopt V5's structure (§12 q5, q24); settle the two phrasings with A3 (Q-004) and A3 (Q-027) before it lands.
- Related: Q-004, Q-027
- Decision: Stands (adopt V5's structure); follows Q-004 (B: the ceiling's gloss; "grid" kept, named once in the docs) and Q-027 (ok: "derived, and written as a number only in the probe's proposal"); amended by F-488 ("The panel"; V5's text names the sheet throughout) and F-451.

#### F-332. Rounding default's migration history

- Type: stale (drop)
- Target section: The model
- Units: D4 (L59, L356-363), V5 (L35, L175)
- Where: `devdocs/settings.md#The model > Rounding` (page L207-210)
- Passage: "the stored value of the earlier default, `halfAwayFromZero`, echoed by every save of some other setting far more often than chosen, was migrated to `halfEven` once, with the control one tap away"
- Tag: drop; plan row confirmed (both)
- Rewrite: delete; the sentence ends at "where ties away from zero drift", keeping the default's reason (D4 L360; V5 L175).
- Proposed call: Confirm `drop`.
- Decision: Stands (drop).

#### F-333. Load-time asymmetry: an out-of-range width resets the whole mode

- Type: other · Flags: **low confidence**
- Target section: Storage
- Units: D4 (L32, L41-42, L71, L408, L414)
- Where: `devdocs/settings.md#Storage` (page L306-312)
- Finding: A stored ratio width outside 1 … 1,000 is not clamped but makes the whole mode fall back to its default, exact mode with digits (`src/settings.ts:397-427`), while a stored extended count outside its range is clamped (`:429-443`, `:553-558`); D4 asks whether that is intended (D4 question 6). The page says it only implicitly ("a `ratio` needs a width in its range, an `extended` a count the clamp then brings between the display digits and the precision limit"). D4 asked V5 to state it in `#Storage`, or else to have the code clamp both (D4 L414); V5's `#Storage` rewrite (V5 (F-334)) does not mention it.
- Proposed call: The owner decides (D4 (Q-049)): if intended, `#Storage` says so in one clause with its reason, beside V5's edit; if not, the width is clamped like the count (code, D4 (B-012)).
- Related: Q-049, B-012
- Decision: Follows Q-049 (B): the width is clamped like the count (B-012, before this page is written); `#Storage` then states one rule.

#### F-334. Storage's per-version migration list moves to the code

- Type: stale (update)
- Target section: Storage
- Units: V5 (L36, L97, L177-181)
- Where: `devdocs/settings.md#Storage` (page L273-299)
- Passage: the per-version list (1 → 2 to 4 → 5) with the fields each reads and writes, and "so that the mechanism was exercised end to end before a migration with a semantic change existed"
- Tag: update; plan row confirmed
- Rewrite: one paragraph on the shape a migration takes and the current version's fields; what each version moved is the code's, in the comment beside the function that moves it (`MIGRATIONS`); a current-version object carrying an old key loads that field's default (V5 L181).
- Proposed call: Confirm `update` (§12 q27).
- Decision: Stands (update; §12 q27).

#### F-335. Resets: `withDefault` clamps nothing; the shell clamps and tells

- Type: contradicts implementation · Flags: **conflict**
- Target section: Applying a change
- Units: V5 (L48, L98, L193)
- Where: `devdocs/settings.md#Applying a change > Resets` (page L418-420)
- Claim or passage: "through `withDefault`, which clamps the dependents as any change does" (V5 also tags it stale, update)
- Finding: `withDefault` puts the one setting at its default and clamps nothing; the shell's `apply` then clamps and tells, as after any change.
- Evidence: `src/settings.ts:710-730`; `src/app-shell.ts:234-247`
- Corrected statement: "through `withDefault`, which puts the one setting at its default and clamps nothing; the shell then clamps and tells as after any change (`clampsOf`, `clampSettings`), so resetting the significand limit may lower the precision limit and say so with the clamp's line." (V5 L193)
- Conflict: D4 states that `#Applying a change` matches the code line for line apart from its own rows (D4 L414, context D4 report).
- Proposed call: **doc wrong**: V5 cites the two functions; what a user sees, a reset that clamps and tells, holds either way.
- Decision: Stands (doc wrong).

#### F-336. The clamp report's property is `clamps`, not `clampLine`

- Type: contradicts implementation · Flags: **conflict**
- Target section: Applying a change
- Units: V5 (L49, L98, L187)
- Where: `devdocs/settings.md#Applying a change` (page L379-380)
- Claim or passage: "the shell computes the report beside the clamp and passes it to the panel as a property with the settings (`clampLine`)" (V5 also tags it stale, update)
- Finding: The property is `clamps`; `clampLine` writes each setting's line.
- Evidence: `src/settings-panel.ts:420-421`; `src/settings-lines.ts:222-229`
- Corrected statement: "…passes it to the panel as a property beside the settings (`clamps`), and `clampLine` writes each setting's line" (V5 L187)
- Conflict: D4 states that `#Applying a change` matches the code line for line apart from its own rows (D4 L414, context D4 report).
- Proposed call: **doc wrong**.
- Decision: Stands (doc wrong).

#### F-337. The probe "leaves the memos at the largest ceiling it tried": not checked

- Type: not verified · Flags: **low confidence**
- Target section: The probe
- Units: V5 (L240)
- Where: `devdocs/settings.md#The probe` (page L480-481)
- Finding: the claim that the probe "leaves the memos at the largest ceiling it tried" concerns the kernel's memos. V5 left it to the unit that owns `devdocs/builtins.md` (V5 question 5); V3's report does not address it, so no unit verified it.
- Why unverified: the memos lie outside V5's modules, and the hand-off was not taken up.
- Proposed call: keep the sentence meanwhile (V5 (Q-110)); verify it against the memo code, by the owner of `devdocs/builtins.md` as V5 asks or when `#The probe` is rewritten (V1's memo probes, `piMemoBits` and `ln2MemoBits`, are the cheap check).
- Related: Q-110
- Decision: Stands; follows Q-110 (ok: unverified until this page's session checks the memos).

#### F-338. Timings in #Applying a change and #The probe

- Type: measurement
- Target section: The probe
- Units: V5 (L50, L99, L183-193, L201), D4 (L131, L365-368, L373)
- Where: `devdocs/settings.md#Applying a change` (page L411-413); `devdocs/settings.md#The probe` (page L469, L472-473)
- Finding: "a few milliseconds that the shell memoizes by the ceiling"; "a thousand digits of `gamma(0.3)` take tens of milliseconds"; "though a ceiling pass of those costs seconds": concrete timings (§12 q25); V5 tags them stale, update. D4 rewrites the first as "a build the shell memoizes by the ceiling" and drops the `gamma(0.3)` clause (D4 L367, L373); V5 writes "a cost the shell memoizes by the ceiling…", drops the clause and makes the third "costs many times the budget" (V5 L50, L191, L201), which D4 leaves.
- Proposed call: Make each qualitative (§12 q25); the two drafts differ in wording only (OVERLAP), V5's also covering "costs seconds".
- Decision: Follows Q-016 and Q-088: qualitative, or a rough figure marked illustrative where it adds weight (the session's choice, D4's and V5's drafts differing in wording only).

#### F-339. The quoted probe proposal drifted from `proposalLine`

- Type: contradicts implementation
- Target section: The probe
- Units: D4 (L65, L370-375, L407, L414), V5 (L46, L195-205)
- Where: `devdocs/settings.md#The probe` (page L458-462)
- Claim or passage: "exact products up to 65,536 bits and the built-ins at 4,040 digits within 50 ms: significand limit 65,536 bits, precision limit 1,000 digits" (both units also tag it stale, update)
- Finding: The line reads "Exact products at 65,536 bits took 2.3 ms and the built-ins on a grid of 4,040 digits took 45 ms, within the 50 ms budget: significand limit 65,536 bits, precision limit 1,000 digits"; the quote drifted unnoticed.
- Evidence: `src/settings-lines.ts:237-250`
- Corrected statement: paraphrase and name `proposalLine`: "each size with the time it took, against the budget, then the two limits" (D4 L372); "the line names the significand limit timed and what the exact product took, the grid the built-ins ran on and what they took, whether both are within the budget, and the two limits proposed" (V5 L199)
- Proposed call: **doc wrong**; D4 (Q-007) proposes naming functions and paraphrasing panel text, quoting only where the exact text is the point. OVERLAP: V5 keeps the floor's quote with its figure elided ("over the … budget"), D4 drops it; V5's "the grid the built-ins ran on" echoes the code's "grid" for the ceiling (the finding that carries A3 (F-125)).
- Related: Q-007, B-026
- Decision: Stands (doc wrong); follows Q-007 (ok: name `proposalLine` and paraphrase) and Q-004 ("the grid the built-ins ran on" is the code's word for the ceiling: paraphrase as the precision the built-ins ran at); B-026 is the code side.

#### F-340. The notation's radios are not under the Mode control

- Type: contradicts implementation · Flags: **conflict**
- Target section: The controls
- Units: V5 (L47, L100, L213-219)
- Where: `devdocs/settings.md#The controls` ("How it is computed", page L625-630)
- Claim or passage: "Under it, what the mode carries: the notation's radios in exact mode, and in decimal mode the working digits, …, the two dependents swapping places under the Mode control as the mode changes, which shows what each belongs to." (V5 also tags it stale, update)
- Finding: The notation is rendered in the first group under the display digits; only the working digits sit under the mode.
- Evidence: `src/settings-panel.ts:497-501`, `:502-505`
- Corrected statement: "Under it, in decimal mode, the working digits … The notation, exact mode's dependent, sits in the first group under the display digits, since it is a way of showing a result, and is shown in exact mode alone; so a change of mode shows one dependent and hides the other, each in the group of what it is for." (V5 L47, L215)
- Conflict: D4 states that `#The controls` matches the code line for line apart from its own rows (D4 L414, context D4 report), and D4's replacement docs text says "Under the mode sits the control that belongs to it: the notation in exact mode, the working digits in decimal mode" (D4 L221-222; also L170-171), while D9's draft groups the notation with how a result is shown (D9 L159), as V5 finds.
- Proposed call: **doc wrong** on V5's citation of the render order; the page's stated reason ("which shows what each belongs to") is an intent, so **code wrong** is possible if the owner wants the notation under the mode. Either way, D4's docs text follows the decision.
- Decision: Follows its own answer (A): the pages describe the panel as it is; D4's docs text follows. [decisions.md section 3; plan §12.1]

#### F-341. "sentences as options once made the panel overflow a phone"

- Type: stale (keep as intent)
- Target section: The controls
- Units: D4 (L61, L377-380), V5 (L38)
- Where: `devdocs/settings.md#The controls` (page L623-625)
- Passage: "(sentences as options once made the panel overflow a phone; `min-width: 0` on the labels is a belt to that)"
- Tag: keep as intent; plan row confirmed (both)
- Rewrite: "and a select is as wide as its widest option's text, so the options are bare names, and `min-width: 0` on the labels keeps a long one from overflowing a phone" (D4 L379); V5's adds "(a sentence as an option overflows a phone)" (V5 L38, L215).
- Proposed call: Confirm `keep as intent`; two near-identical drafts (OVERLAP).
- Decision: Stands (keep as intent); amended by F-488 ("the panel").

#### F-342. "pointing at docs/settings.md until the guide lands (#191)"

- Type: stale (update)
- Target section: The controls
- Units: D4 (L60, L380), V5 (L37, L217)
- Where: `devdocs/settings.md#The controls` (page L672-674)
- Passage: "pointing at docs/settings.md until the guide lands ([#191][191])"
- Tag: update; plan row confirmed (both)
- Rewrite: name the page the link points at and let the issue say what is pending, inline: "what is open about where the link should land is `[#191](…)`" (D4 L60) or "where the link lands once the user guide is restructured is open (`[#191](…)`)" (V5 L217).
- Proposed call: Confirm `update`; two near-identical drafts (OVERLAP).
- Related: Q-007, Q-115, B-069
- Decision: Stands (update); follows Q-115 (ok); #191 is resolved by this rewrite (confirmed on 2026-10-12, plan §12.2, item 9: the user's guide to the settings lands with this refactor): the clause states where the link lands and names no issue, and the owner closes #191 when `docs/settings.md` lands.

#### F-343. Reference-style issue links; #118 linked from three passages

- Type: markdown and links · Flags: **conflict**
- Units: V5 (L37, L51, L201-205, L211, L217-219, L238), D4 (L60, L133, L368, L374-375, L409)
- Where: `devdocs/settings.md` (#167 page L404; #118 page L475, L512, L595; #163 page L479; #186 page L597; #191 page L674; definitions page L719-723)
- Finding: Reference-style links with definitions at the foot, outside the Markdown subset (V5 tags them stale, update). Each becomes an inline link at its one owning passage (§12 q26): #163 in The probe, #167 in Applying a change, #186 in The sheet, #191 in The controls, the definitions deleted. #118 is linked twice in `#The probe` and once in `#The sheet`. No unit checked the issues' status (V5).
- Conflict: #118's owner: D4 says `devdocs/future.md` and keeps one inline link at the first passage of `#The probe` (D4 (Q-013), D4 L375); V5 says the page that owns the scheduler (`devdocs/cost.md`, or `future.md#Extensions that fit`) and leaves `settings.md` unlinked, naming "the scheduler's concern" (V5 (Q-013); V5 report: its edit assumes that answer); V6 assigns #118 to `cost.md` (V6 (F-415)).
- Proposed call: Inline each link at its owning passage once its status is checked; #118's one home is the owner's call (D4 (Q-013), V5 (Q-013), V6 (Q-011)), and `settings.md` then names the concern in words.
- Related: Q-011, Q-013, F-347, F-360, F-415
- Decision: Stands for the Markdown subset; follows Q-013 (B: #118's one link is `devdocs/future.md`'s; this page names the concern in words); #163 is a bug and stays at `#The probe`; #167 and #186 are future work for `future.md` and #191 is resolved by the rewrite (confirmed on 2026-10-12, plan §12.2, items 7 to 9).

#### F-344. settings.md: which sections open with a link to docs

- Type: structure
- Units: V5 (L98-101, L183-205)
- Where: `devdocs/settings.md#Applying a change`, `#The probe`, `#Where it lives`
- Finding: `#Applying a change` opens with one sentence and a link to the docs paragraph that owns the user rule ("The limits are set top-down"), then mechanism and the three ruled-out alternatives; `#The probe` opens with a link to the docs' probe entry ("Measure this device"); `#Where it lives` stays. D4's restructure renames the first target `## How the settings bound each other` (D4 L289).
- Proposed call: As V5 maps it (§12 q24), the links pointed at the headings `docs/settings.md` lands with.
- Decision: Stands; sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist; amended by F-488 (the targets are `docs/settings.md`'s headings as that page lands, and `docs/app.md#The settings panel`).

### Findings owned by other pages that touch this one

- F-015 (docs/numbers.md): "working precision" for the digits of the grid
- F-021 (docs/numbers.md): "Certain" becomes "certified" in every page quoting the notes
- F-117 (docs/settings.md): "There are six settings": a count, against §12 q16
- F-125 (docs/settings.md): The ceiling is a pass's precision, not "the finest grid"
- F-126 (docs/settings.md): Precision limit entry misdescribes the panel's line; "derived and shown"
- F-131 (docs/settings.md): "For a fraction of a second": a timing in the probe's description
- F-176 (docs/app.md): The sheet's mechanics leave docs/settings.md for docs/app.md
- F-418 (cross-cutting): Issue #118: linked from three pages; `cost.md` or `future.md`
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-427 (terminology): "certain" for certified digits
- F-429 (terminology): "ceiling", its gloss "the finest grid", and "grid" in the user docs
- F-431 (terminology): "working digits" in three senses; "the working grid"; "working precision" for the grid
- F-488 (terminology): "sheet" and "panel"
- F-489 (terminology): "line", `hint`, `notice`; "the guide"

## `devdocs/future.md`

6 findings (F-345 to F-350).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/future.md#Extensions that fit` | V6 (L181-191) | OVERLAP: D2 (L314-322) and V4 (L196-259) link `devdocs/functions.md#Conditions` to an equality entry this text lacks; the §1.3 intents A6, V1 and D1 asked for are absent; drops #118, which D4 (L409) would own here |
| `devdocs/future.md#Ruled out, and why` | V6 (L193-209) | CONFLICT: keeps the distributions as ruled out (placed in definitions) while D7's builtins.md text lists them as deferred (D7 L218); V3 (L696-718) sides with V6 |

### Findings

#### F-345. Extensions that fit omits the §1.3 intents other pages link to

- Type: other
- Target section: Extensions that fit
- Units: A6 (L417-421), V1 (L363-364, L370), D1 (L691), V6 (L26, L181-191), V4 (L196-259), D2 (L314-322)
- Where: `devdocs/future.md#Extensions that fit` (page L136-183); `devdocs/functions.md#Conditions`; `devdocs/numbers.md#approx`
- Finding: three units asked V6 to record plan §1.3 intents here: "Equality operators and conditional expressions", with the constraint that a design must say what an undecidable comparison of inexact values yields (A6 question 2; V1); the two-argument `approx`, linking in one line to the binary form's tentative design in `devdocs/numbers.md#approx`, and significant-figure propagation (#98's extension) named without the #98 link (V1 questions 4 and 5); typographic characters such as `×` accepted by the grammar, D1 proposing `×`, `·`, `−`, non-breaking and thin spaces, not `÷` or superscripts (D1 question 4). V6's replacement text for the section (L181-191) has none of them, while D2's and V4's proposed `#Conditions` texts (D2 L314-322, V4 L196-259) already link `devdocs/functions.md#Conditions` to an equality entry here. Of §1.3's other intents it carries only the deferred function classes and user definitions (the symbolic layer keeps its own section): configurable number formatting, a display policy separable from the model, the grammar generated from a TypeScript DSL, the generated built-in reference, a toggle that suppresses the conversion target and the units page generated from the file are on neither the page nor V6's text. V6's report cites §1.3 only inside its corrected N7 statement (L26), for the symbolic layer, never as the list the plan asks the units to record here.
- Proposed call: add one-sentence entries beside the concept each touches, each linking to the section that holds its design rather than restating it: the equality operators and conditional expressions (with A6's constraint) and the two-argument `approx`, before V4's and D2's links into this section are applied; the typographic characters once D1 Q4 is answered; and the rest of §1.3's intents as the owner confirms which belong there (the plan asks for one entry per intent).
- Related: Q-014, Q-035, Q-037, Q-112, F-030
- Decision: Follows Q-011: every §1.3 intent is recorded here, one entry each beside the concept it touches (the equality operators and conditional expressions with A6's constraint, `!=` in conditions among them, Q-112 and R-5 of the review, plan §12.3; the two-argument `approx` with its tentative design, Q-035; significant-figure propagation, Q-014; the typographic characters, Q-037; configurable number formatting; a display policy separable from the model; the grammar generated from a DSL; the generated built-in reference; a toggle that suppresses the conversion target; user definitions, #130 to #134; the units page generated from the file; the hand-written pages shipped with the app, §12 q31; the deferred function classes, Q-010); the owner confirmed the unclear items on 2026-10-12 (plan §12.2): #78 joins the entries, beside the exact operations, with #171, #173, #178, #167 and #186 as the list placed them.

#### F-346. "More special functions" carries a chronology

- Type: stale (update)
- Target section: Extensions that fit
- Units: V6 (L37, L187)
- Where: `devdocs/future.md#Extensions that fit` > "More special functions" (page L160-163)
- Passage: "The eight special functions deferred when the Gamma and Beta families landed are [#115][115]"
- Tag: update (V6: a chronology); new
- Rewrite: "Eight special functions are deferred, not ruled out (`[builtins.md](builtins.md)`, "Not in this design", which says which are which and carries the issue)"; builtins.md owns #115 (V6 L37, L187).
- Proposed call: Confirm `update`. Point the link at builtins.md "The Gamma and Beta families", which carries #115 and the deferred list (builtins.md page L876-894) and where V3 and D7 keep them; neither V6's text nor the current page's pointer ("Not in this design") names that section.
- Decision: Stands (update); follows Q-012 (A: #115 in `builtins.md`, confirmed on 2026-10-12, plan §12.2, item 1) as amended by Q-011 (the deferred functions are described here, `builtins.md` naming them only as absent); the pointer is the families' section, which carries #115.

#### F-347. future.md's reference-style issue links

- Type: markdown and links
- Target section: Extensions that fit
- Units: V6 (L38, L79, L209)
- Where: `devdocs/future.md#Extensions that fit` (page L141-177); the link definitions after `#Ruled out, and why` (page L231-247)
- Finding: the `[#118][118]` references and the block of definitions from `[103]: https://github.com/bsidhom/exucal/issues/103` to `[152]: https://github.com/bsidhom/exucal/issues/152` are outside the Markdown subset; #120 is implied by "[#119][119] to [#121][121]" and has no definition. Every issue the page names is open (V6 (F-415)).
- Proposed call: delete the definitions block; inline each issue at the one passage that owns it (§12 q26), which on this page is #126 alone under V6's mapping, the rest becoming links to the owning page's section.
- Related: F-321, F-415
- Decision: Stands (the definitions block deleted; inline links); follows Q-011 and Q-013: this page carries the one link of every future-work issue (#118 to #121, #130 to #134, #98, #100, #126, #186, #167 if confirmed), and links the owning page's section for the bug and cost issues (Q-012).

#### F-348. Ruled-out function classes reworded as deferred, on both pages (§9.4)

- Type: stale (update) · Flags: **conflict**
- Target section: Ruled out, and why
- Units: V6 (L34, L35, L101, L187, L195-207, L226), D7 (L68, L85, L217-218), V3 (L42, L72, L667-718)
- Where: `devdocs/future.md#Ruled out, and why` > "General hypergeometric functions, Bessel `Y` and `K`, Bessel functions at large argument" (page L219-221) and > "Statistical distributions as built-ins" (page L222-223); `devdocs/future.md#Extensions that fit` > "More special functions" (page L160-163); `devdocs/builtins.md#The Gamma and Beta families` (last paragraph, page L879-893)
- Passage: future.md: "General hypergeometric functions, Bessel `Y` and `K`, Bessel functions at large argument. Library-sized casework for little use here." and "**Statistical distributions as built-ins.** They are one-line user functions over the Gamma and Beta families."; builtins.md: "Ruled out as built-ins: the general hypergeometric functions (…), Bessel `Y` and `K` and any Bessel function at large argument (…), the polygamma functions beyond `digamma`, `gamma` of a complex argument, and the statistical distributions"
- Tag: update (V6, D7, V3); plan §9.4 row confirmed, one row for both pages: ruled out for the initial calculator only (the owner's clarification), so worded as not in the initial design, deferred, with the reasons kept; for the distributions V6 reads the row as a deferral only if they are meant to come as built-ins (V6 Q4). Nothing of them is implemented (D7 L68, not verifiable in the modules).
- Rewrite: future.md (V6): the hypergeometric and Bessel bullet moves under "More special functions" as deferred, the reason kept as why they wait: "Behind them wait the general hypergeometric functions, Bessel `Y` and `K`, and the Bessel functions at large argument: library-sized casework, for little use yet." (V6 L187, L203); the distributions bullet stays under "Ruled out", reworded as a placement: "Each is a one-line function over the Gamma and Beta families, so they belong in definitions, the system file's or a user's, not in the kernel." (V6 L207). builtins.md (D7 L218; V3 L694-717): "Not in the initial design, deferred rather than ruled out: …", every reason kept, and #115's eight "are designed and deferred" (was "were"); V3 adds "each for the work it would take" and that complex `gamma` "needs complex values first".
- Conflict: (1) The statistical distributions. Deferred as built-ins: D7's builtins.md rewrite keeps them in its "deferred rather than ruled out" list (D7 L85, L218), as plan §1.3, §4.2 and §9.4 do (§1.3 and §4.2 list "statistical distributions as built-ins" among the classes "deferred, not ruled out indefinitely"). Placed, not deferred: V6 keeps future.md's bullet under "Ruled out" (V6 L35, L207, L226; V6 Q4), and V3's builtins.md rewrite sides with V6, "not built-ins because they need not be" (V3 L696-718, the sentence at L711-715). (2) V6 against itself: L101 says "the two bullets the owner called deferred move to `#Extensions that fit`", while its edit (L195-207) moves only the hypergeometric and Bessel bullet. (3) The hangs' links in builtins.md's paragraph: D7 keeps #151 and #152 there, V3 sends them to cost.md (the issue-links finding).
- Proposed call: Confirm `update` for the hypergeometric and Bessel items on both pages and for the polygamma and complex `gamma` items on builtins.md: it matches plan §1.3 and §4.2 ("deferred, not ruled out indefinitely") and §9.4, and D7's and V3's builtins.md rewrites agree with V6's move. The distributions' status is the owner's (V6 Q4): deferred as built-ins (plan §1.3, §4.2, §9.4; D7) or placed in definitions (V6, V3); then word future.md and builtins.md alike.
- Related: Q-010, F-290
- Decision: Follows Q-010 and Q-011: every class (hypergeometric, Bessel `Y` and `K`, Bessel at large argument, polygamma beyond `digamma`, complex `gamma`, the statistical distributions) is deferred, described here under "More special functions" with its reason kept and the distributions' note (not every function is efficient as a definition); `devdocs/builtins.md` names them only as absent and links here; `docs/builtins.md` states what is not provided as a plain fact with what to write instead; #115 stays in `devdocs/builtins.md` (confirmed on 2026-10-12, plan §12.2, item 1).

#### F-349. Stored digits of pi or e: `e` is not the exp routine's series

- Type: contradicts implementation
- Target section: Ruled out, and why
- Units: V6 (L36, L95, L101, L197, L205)
- Where: `devdocs/future.md#Ruled out, and why` > "Stored digits of `pi` or `e`" (page L207-218)
- Claim or passage: "`e` the same way, as the `exp` routine's series"; the bullet also carries timings ("about 0.4 ms for a thousand digits, 8 ms for ten thousand and 260 ms for a hundred thousand", "a phone perhaps three to five times slower", "still under 2 ms at a thousand digits", "4.4 KB … for a range that costs 8 ms to compute").
- Finding: `e` is a binary-splitting sum of its own, `eSeries`, not the `exp` routine's series; `pi` by Chudnovsky's series with binary splitting holds.
- Evidence: `src/core/constants.ts:32-37` (`eSeries`); `src/core/constants.ts:8-16` (Chudnovsky); reasoned from code, not run.
- Corrected statement: kept as intent, without timings: Chudnovsky computes `pi` to any precision the settings allow in a time nobody notices; a Machin formula is slower by a small factor; spigot algorithms are quadratic; stored digits cost about 0.42 bytes a digit, so a table would add more to the payload than it saves; the constants are computed on demand and memoized, `e` by "a binary-splitting sum of its own beside it (`eSeries` of constants.ts)" (full text: V6 L205). The stale row tags the passage keep as intent (new): a ruled-out alternative whose timings go under §12 q25.
- Proposed call: **doc wrong**: `eSeries` is deliberate and `devdocs/layout.md#The modules` already says "pi by Chudnovsky's series and e by its series, both with binary splitting"; nothing points to the code. Keep the bullet as intent without timings.
- Decision: Stands (doc wrong; keep as intent) as amended by Q-011: the ruled-out alternative moves to `devdocs/numbers.md#Memoized constants`, the page that owns the constants; by Q-016 its ratios stay and its timings may stay as rough, illustrative figures (the session's choice).

#### F-350. future.md: every section stays, as intent, map or ruled-out list

- Type: structure
- Units: V6 (L99, L100, L101, L181-191)
- Where: `devdocs/future.md#(top)`, `#Symbolic values`, `#Complex numbers`, `#Extensions that fit`, `#Ruled out, and why`
- Finding: no section becomes a link to docs/: #(top), #Symbolic values and #Complex numbers stay as intent (what the extension is, why not now, what it would take, what keeps it possible), since the user docs state today's behaviour (N7) and never mirror future work; once `docs/numbers.md` exists, "Why not now" in #Symbolic values can cite it in one sentence for the `≈` the user sees. #Extensions that fit stays as the map of extensions, its issue links moving to the owning pages; #Ruled out, and why stays as ruled-out alternatives.
- Proposed call: keep the five sections (§12 q24; §7.1's "What is ruled out or deferred" row); move the links per the issue-ownership finding (V6 (F-415)).
- Decision: Stands for `#(top)`, `#Symbolic values`, `#Complex numbers` and `#Extensions that fit`; amended by Q-011: `#Ruled out, and why` dissolves, each decision moving to the page that owns its concept (the number type's alternatives and the radius display to `devdocs/numbers.md`, the stored digits to `#Memoized constants`, the unbounded exponent already there, the temperature offset to `devdocs/functions.md`) with one sentence in the docs where a user would look (the error radius is never shown), and the deferred function classes staying here as future work; the page's top paragraph is reworded; the classification of each bullet was confirmed by the owner on 2026-10-12 (plan §12.2, item 13). Amended on 2026-10-13 (plan §12.3, R-7, as the owner clarified it): the radius display is not a ruled-out decision but a plain fact about today's display, and not future work: its bullet moves nowhere, `devdocs/numbers.md` describes the display as it is with no reason, and `docs/numbers.md` states the plain fact.

### Findings owned by other pages that touch this one

- F-290 (devdocs/builtins.md): `#The Gamma and Beta families` repeats the cost issues and the ruled-out list
- F-321 (devdocs/functions.md): Issue links #130 to #134: reference-style and linked more than once
- F-415 (cross-cutting): Issue #103: named on four pages; `builtins.md` or `cost.md`
- F-416 (cross-cutting): Issue #107: on three pages; `builtins.md` or `cost.md`
- F-417 (cross-cutting): Issue #115: `builtins.md` agreed; `future.md` points at the wrong section
- F-418 (cross-cutting): Issue #118: linked from three pages; `cost.md` or `future.md`
- F-419 (cross-cutting): Issues #119 to #121: #118's parts, on `cost.md` and `future.md`
- F-420 (cross-cutting): Issue #125: on three pages; `builtins.md` or `cost.md`
- F-421 (cross-cutting): Issues #130 to #134: one owner page, two placements proposed
- F-422 (cross-cutting): Issue #149: on three pages; `builtins.md` or `cost.md`
- F-423 (cross-cutting): Issue #150: on three pages; `builtins.md` or `cost.md`
- F-424 (cross-cutting): Issue #151: `cost.md` agreed, but one edit keeps it in `builtins.md`
- F-425 (cross-cutting): Issue #152: `expFixed`'s bullet or `cost.md`'s hangs
- F-460 (terminology): "plain number" against "dimensionless"
- F-497 (terminology): The stress catalogue's vocabulary and "hang"

## `devdocs/cost.md`

11 findings (F-351 to F-361).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/cost.md#(top)` | V6 (L122-126) | CONFLICT: links #118 to #121 here, where D4 (L409) makes future.md #118's owner; #118 and #121 are linked again in V6's own `#What the costs come from` (L154, L159) |
| `devdocs/cost.md#How a case is measured` | V6 (L128-144) | — |
| `devdocs/cost.md#What the costs come from` | V6 (L146-159) | OVERLAP: #107, #125, #149, #150, #152 are also inlined in builtins.md by V3 (E18, E23, E25, E27) and D7 (D7 report); D7 Q2 (L248) gives #107 to builtins.md and #103 to cost.md; settle with the issue-ownership finding (V6 (F-415)) |
| `devdocs/cost.md#What the search has not reached` | V6 (L161-170) | — |
| `devdocs/cost.md#The hangs` | V6 (L172-179) | CONFLICT: #151 and #152 inline here and kept inline in builtins.md by D7's edit 11 (D7 L218), #152 also by V3 Q4 and D5; #152 linked twice in V6's text (L155, L177); a bare "(#118, with #120's workers, linked above)" (L179) |

### Findings

#### F-351. Passes: eight at thirty-two digits, and a refusal can end the loop early

- Type: contradicts implementation
- Target section: How a case is measured
- Units: V6 (L43, L58, L108, L110, L132-136)
- Where: `devdocs/cost.md#How a case is measured` > Passes (page L30-33)
- Claim or passage: "Every case here runs the whole schedule to the ceiling, since its value never certifies: nine passes at the default settings, eleven at the highest precision limit the default significand limit allows."
- Finding: right as far as it goes, but incomplete: `default` and `fractions` run 9 passes, `digits32` 8 (its schedule starts at 42 digits: 42, 84, …, 2,688, 4,040), `maxcap` 11, `extreme` 15; one `extreme` entry stops at 11, a pass having ended the loop with a refusal the loop does not retry, after which the best result so far is shown.
- Evidence: a scratch run of `schedule` on `{ ...DEFAULT_SETTINGS, displayDigits: 32 }`; `catalogue.json`; `src/core/pipeline.ts:325-327`
- Corrected statement: the count is the schedule's length for its settings (`[numbers.md](numbers.md)`, "Working precision and the schedule"): nine at the default settings, eight at thirty-two display digits, eleven at the highest precision limit the default significand limit allows, fifteen at the hard bound; "A count short of the schedule marks a pass that ended the loop with a refusal the loop does not retry, after which the best result so far is shown." (full text: V6 L132-136)
- Proposed call: **doc wrong**: `resolve` ends the loop with the best result so far on any error it does not retry (`pipeline.ts:325-327`), a deliberate rule A5 confirms for `tooLarge` (A5 report); the page gives the defaults' count as if it were every case's.
- Related: Q-001, F-034, F-509
- Decision: Stands (doc wrong); follows Q-001.

#### F-352. cost.md and benchmarks.md both explain the deadline

- Type: structure
- Target section: How a case is measured
- Units: V6 (L234)
- Where: `devdocs/cost.md#How a case is measured`, `#The hangs`; `devdocs/benchmarks.md#The harness`, `#The search`, `#The stress suite`
- Finding: benchmarks.md owns the harness, the search and the stress suite as tools, which cost.md only names; the two pages should not both explain cold, warm and the deadline, and benchmarks.md already defers to cost.md for cold and warm (#The harness ends on a link to cost.md, "How a case is measured"). V6 handed this to V7, whose report does not take it up (its only note on cost.md is the vocabulary hand-off, V7 L317, L334); V6's own text reduces cost.md's side to naming `DEADLINE_MS`.
- Proposed call: benchmarks.md explains the deadlines once (the search's constant; the suite's four times the catalogued time); cost.md names them and links there.
- Decision: Stands.

#### F-353. Counts that every run changes, in cost.md's prose

- Type: measurement
- Target section: What the costs come from
- Units: V6 (L33, L56, L57, L75, L224); D7 (L86, L253)
- Where: `devdocs/cost.md#What the costs come from` (typing paragraph, page L120-123); `devdocs/cost.md#What the search has not reached` (opening, page L135)
- Finding: "Typing out the 229 entries at the default precision limit (the default, `digits32` and fractions profiles) … took 16,548 keystrokes. Exactly 229 of them took 100 ms or more: the last keystroke of each case" is stale: those profiles hold 272 entries (225, 32 and 15), 252 typed out over 18,524 keystrokes, 253 at or above 100 ms (251 cases with one, one `digits32` case with two, the extra on the keystroke completing its inner composed call; in all 252 the slow keystroke is the last). "What four runs found, 714 cases in all" is current (257 + 274 + 144 + 39) but changes with every run. Plan §9.4 row (update) confirmed by V6 (figures revised) and by D7, which left the rewrite to cost.md's unit.
- Proposed call: Confirm `update`: drop the counts now, as V6's text does (L146-170); a summary the tool writes between markers is V6 Q2 (later, proposed).
- Related: Q-061
- Decision: Stands (update); follows Q-061 (ok: dropped now).

#### F-354. Hand-copied timings in "What the costs come from"

- Type: measurement
- Target section: What the costs come from
- Units: V6 (L39, L42, L52, L60-69, L75, L152-159); D7 (L86, L253)
- Where: `devdocs/cost.md#What the costs come from` (page L86-131)
- Finding: the bullets copy timings the generated tables carry, and several no longer match the catalogue (342 entries, 45 hangs, 4 runs, all from one four-core container): incomplete beta "0.7 to 7 s a call" (0.59 to 6.85 s: roughly current); `erf`, `erfc` and incomplete gamma "0.3 to 1.5 s … 3 to 5 s at a large one" (0.26 to 1.45 s; 0.53 to 5.15 s with a large argument, so the large range starts lower); Gamma family "0.6 to 2 s", exact "0.3 to 0.8 s" (0.21 to 2.05 s and 0.32 to 1.71 s: stale at both ends, "about half" holds in the median only, and `beta(0.3, 7)` is not an entry); the Bernoulli run "several seconds … about a minute"; the reference case "tens of milliseconds" (17 ms: current); `exp(355/113) - exp(355/113)` "0.8 s a call" (0.62 s; the costliest elementary `maxcap` entry is a `pow` cancellation at 1.21 s); `cos` "20 s" at the hard bound (21.5 s); the first keystroke completing a call "150 to 200 ms, against about 50 ms at the defaults" (`maxcap` 11 to 200 ms, median 115 ms; `default` 10 to 88 ms, median 47 ms). V6's stale rows tag them update; D7 read them as qualitative notes and left the call to this page's unit (D7 L253). One of plan §9.1's three sets of Gamma-family cost figures.
- Proposed call: Confirm `update` under §12 q25: state the orderings and ratios the tables bear out, never a timing, as V6 drafts (L146-159); the figures stay in the generated tables.
- Related: Q-088, F-154
- Decision: Stands (update) as Q-088 and Q-016 word it: the prose states the orderings and ratios the tables bear out; a rough timing may stay marked illustrative where it adds weight, never a figure the catalogue contradicts; the tables hold the figures.

#### F-355. The cost formula's two halves contradict each other

- Type: contradicts implementation
- Target section: What the costs come from
- Units: V6 (L40, L59, L148)
- Where: `devdocs/cost.md#What the costs come from` (page L77-80)
- Claim or passage: "Its cost is the passes times the cost of its costliest call at the last pass, and the last pass, at the ceiling, outweighs all the earlier ones together."
- Finding: the two halves contradict each other; in the catalogue the last pass's share of the warm time has median 0.66 and is above one half in 271 entries of 342, so the second half holds as "usually".
- Evidence: `bench/stress/catalogue.json` (V6's scratch analysis); stale row tagged update (new).
- Corrected statement: "Its cost is the sum of its passes, and the last, at the ceiling, usually outweighs all the earlier ones together"
- Proposed call: **doc wrong**: the sentence is inconsistent with itself and the measurements bear out the sum; nothing points to the code.
- Decision: Stands (doc wrong).

#### F-356. The Bernoulli run's cold cost reaches past the Gamma family

- Type: contradicts implementation
- Target section: What the costs come from
- Units: V6 (L27, L41, L63, L64, L111, L154, L157)
- Where: `devdocs/cost.md#What the costs come from` (memos paragraph, page L115-118; Gamma bullet, page L99-106)
- Claim or passage: "So a warm run costs about what a cold one does, except in the Gamma family, whose cold run also builds the Bernoulli numbers."
- Finding: every call that takes a Gamma value pays the Bernoulli run cold: the `lowergammareg` and `uppergammareg` entries carry the same surcharge (up to 68 s at `maxcap`) and the `incbeta` entries too (up to 5 s at the defaults); cold over warm, median: elementary 1.02, incomplete beta 1.19, incomplete gamma and `erf` 1.43, Gamma family 1.77, so "warm about cold" holds with the wider scope.
- Evidence: `catalogue.json`; `src/core/bernoulli-ratios.ts:17-21`, `:40-42`
- Corrected statement: "except for the calls that take a Gamma value, the Gamma family itself, the regularized incomplete gamma functions and the incomplete beta functions, whose cold run also builds the Bernoulli numbers"; in the Gamma bullet, "a surcharge of about half the warm cost at the defaults that grows faster than the ceiling, to about twice the warm cost at the highest precision limit" (V6 L154, L157).
- Proposed call: **doc wrong**: the page scopes the run more narrowly than the code; V6's note on plan N25 (V6 (F-065)) says the same.
- Related: F-065
- Decision: Stands (doc wrong); the scope settled on 2026-10-24 by the session of work order 07 and confirmed by the owner (plan §12.3): the corrected statement's list widens to every call that takes a value of the Gamma function, directly or through another function, each named with the dependency it pays through, as F-065's decision lists them: the Gamma family outside its exact cases; `beta` through `lgamma`; the regularized incomplete gamma functions through `lgamma`, apart from an order of `1`, and `erf` and `erfc` through them; the incomplete beta functions through `lgamma` of the parameters (`incbetareg`) or through `beta` (`incbeta`, where it takes `beta(a, b)`); and the unregularized incomplete gamma functions only where they take `gamma(s)`. Work order 17 applies it.

#### F-357. cost.md: the mechanism stays; one sentence and a link open the causes

- Type: structure
- Target section: What the costs come from
- Units: V6 (L102, L103, L104, L148, L161-170)
- Where: `devdocs/cost.md#(top)`, `#How a case is measured`, `#Reproducing a case`, `#What the costs come from`, `#What the search has not reached`, `#The hangs`, `#The catalogue`
- Finding: #(top), #How a case is measured, #Reproducing a case, #The hangs and #The catalogue stay as mechanism (the tool's measures, the catalogue's rules, the generated tables); #What the search has not reached stays as the tool's coverage. The opening of #What the costs come from restates user semantics (a value that never certifies runs every pass to the ceiling and costs seconds; one that certifies costs little): under §12 q24 it becomes one sentence and a link to `docs/numbers.md`'s "What costs time" once that page exists (§5 C33), meanwhile to `devdocs/numbers.md`, "Working precision and the schedule"; the rest stays as mechanism.
- Proposed call: as V6 proposes (L146-159); the final link waits on the docs gap (V6 (F-063)).
- Decision: Stands; the opener links `docs/numbers.md#What costs time` (written before this page, Q-008); amended by Q-013 (the scheduler is named in words, the link to `future.md`).

#### F-358. The decimal profile's empty slot is structural, not empirical

- Type: contradicts implementation
- Target section: What the search has not reached
- Units: V6 (L44, L71, L109, L167)
- Where: `devdocs/cost.md#What the search has not reached` (page L146-147)
- Claim or passage: "The decimal profile has no entries: its cases have settled in one pass in every sample so far."
- Finding: there are none, but not by sampling: `schedule` returns the context alone in decimal mode, so a decimal case runs no schedule; two cancellations measured under the decimal profile settled in one pass, `= 0`.
- Evidence: `src/core/pipeline.ts:286-303` (`:299-303`); harness run
- Corrected statement: "**The decimal profile has no entries,** and can hardly have any: decimal mode has no schedule, its one pass being the context itself (`[numbers.md](numbers.md)`, "Decimal mode"), so a case there costs a single pass at the working digits, and none has reached the floor."
- Proposed call: **doc wrong**: the single pass is the design (A4 confirms the schedule is the user's context alone in decimal mode, A4 report); the page presents a structural fact as an observation.
- Related: F-039
- Decision: Stands (doc wrong).

#### F-359. "Four functions … have no entry yet": a count runs change

- Type: measurement
- Target section: What the search has not reached
- Units: V6 (L45, L70, L166)
- Where: `devdocs/cost.md#What the search has not reached` (page L143-145)
- Finding: "Four functions it draws have no entry yet: `log10`, `acos`, `asinh` and `acosh`" holds only counting hangs: `sqrt` has no entry either, only a hang; the count is one the tool could write and runs change. Stale row tagged update (new).
- Proposed call: Confirm `update`: retitle the bullet "Elementary functions without an entry", drop the count, keep the four names and why none is caught (V6 L166).
- Decision: Stands (update); follows Q-061.

#### F-360. cost.md's bare issue numbers and the hangs table's Issue column

- Type: markdown and links
- Target section: The hangs
- Units: V6 (L46, L73, L126, L179, L225)
- Where: `devdocs/cost.md#(top)` (page L13-14), `#What the costs come from` (page L88-129), `#What the search has not reached` (page L151-158), `#The hangs` (page L160-185 and its generated table)
- Finding: bare issue numbers (`#118`, `#119 to #121`, `#149`, `#150`, `#107`, `#125`, `#103`, `#121`, `#132`, `#151`, `#152`, `#120`) where §12 q26 asks for an inline link at the one owning place; the generated hangs table's Issue column is emitted as bare numbers (`bench/stress/catalogue.ts:561`, `hangsTable`). V6's proposed text inlines absolute issue URLs (allowed for an external reference), but itself links #118 twice (L126, L159) with a third, bare mention, "(#118, with #120's workers, linked above)" (L179), #121 twice (L126, L154) and #152 twice (L155, L177).
- Proposed call: inline links where cost.md owns the issue and links to the owning page's section elsewhere (issue-ownership finding, V6 (F-415)), one link per issue; before making the Issue column emit links (V6 Q3: a one-line change to `hangsTable`), square it with q26, since #151 tags 21 hangs and #152 19 (V6 L73).
- Related: Q-011, Q-062, B-070
- Decision: Stands for the Markdown subset; follows Q-012 (A: this page links #107, #125, #149 to #152 once each, and the owning page's section for #103), Q-013 (#118 to #121 named in words, linked to `future.md`), Q-011 (#132 named in words) and Q-062 (ok: `hangsTable` emits links, B-070).

#### F-361. The deadline is the search's constant, not the harness's

- Type: contradicts implementation
- Target section: The hangs
- Units: V6 (L112, L138-144, L174)
- Where: `devdocs/cost.md#The hangs` (page L162); `devdocs/cost.md#How a case is measured` (page L50)
- Claim or passage: "Some cases run past the harness's two-minute deadline"; "A case that passes the deadline is a hang."
- Finding: `DEADLINE_MS` lives in `bench/stress/catalogue.ts:222-227` and the harness enforces whatever it is given (`bench/stress/harness.ts:301-304`); `pnpm stress` gives an entry four times its catalogued time and two minutes at least (`bench/stress/verify.ts:117-125`).
- Evidence: as cited; reasoned from code, not run.
- Corrected statement: "A case that passes the search's deadline (`DEADLINE_MS` of catalogue.ts, which the harness enforces) is a hang."; in `#The hangs`, "Some cases run past the search's deadline (`DEADLINE_MS` of catalogue.ts)".
- Proposed call: **doc wrong**: V7 confirms `FLOOR_MS` and `DEADLINE_MS` as constants of `catalogue.ts` (V7 report); the page names the wrong owner.
- Decision: Stands (doc wrong).

### Findings owned by other pages that touch this one

- F-154 (docs/functions.md): Gamma-family cost figures given three times (plan §9.1)
- F-290 (devdocs/builtins.md): `#The Gamma and Beta families` repeats the cost issues and the ruled-out list
- F-321 (devdocs/functions.md): Issue links #130 to #134: reference-style and linked more than once
- F-415 (cross-cutting): Issue #103: named on four pages; `builtins.md` or `cost.md`
- F-416 (cross-cutting): Issue #107: on three pages; `builtins.md` or `cost.md`
- F-418 (cross-cutting): Issue #118: linked from three pages; `cost.md` or `future.md`
- F-419 (cross-cutting): Issues #119 to #121: #118's parts, on `cost.md` and `future.md`
- F-420 (cross-cutting): Issue #125: on three pages; `builtins.md` or `cost.md`
- F-421 (cross-cutting): Issues #130 to #134: one owner page, two placements proposed
- F-422 (cross-cutting): Issue #149: on three pages; `builtins.md` or `cost.md`
- F-423 (cross-cutting): Issue #150: on three pages; `builtins.md` or `cost.md`
- F-424 (cross-cutting): Issue #151: `cost.md` agreed, but one edit keeps it in `builtins.md`
- F-425 (cross-cutting): Issue #152: `expFixed`'s bullet or `cost.md`'s hangs
- F-441 (terminology): "hard bound" (and "formable")
- F-472 (terminology): "the converter" for the app, the fields and the outcome module
- F-497 (terminology): The stress catalogue's vocabulary and "hang"

## `devdocs/layout.md`

8 findings (F-362 to F-369).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/layout.md#The files` | V7 (L180-196) | CONFLICT: the favicon wording; V8 confirms offline.md#Icons as written and drafts no edit (V8 L62, L111) |
| `devdocs/layout.md#The modules` | V7 (L198-205) | — |

### Findings

#### F-362. Is `public/icons/` the source of every icon? The favicon, on two pages

- Type: contradicts implementation · Flags: **conflict**
- Target section: The files
- Units: V7 (L53, L71, L173, L190-196, L330, L334), V8 (L62, L64, L111)
- Where: `devdocs/layout.md#The files` (manifest bullet, page L48-51); `devdocs/offline.md#Icons` (page L107-109, L136-137)
- Claim or passage: `layout.md`: "`public/icons/` holds the icons it points to. They are the source of every icon the app has" (V7's statement L11); `offline.md`: "The SVG files in `public/icons/` are the only icon sources; every other form of the icon is rendered from them".
- Finding: V7: `public/favicon.svg` is a third SVG icon, its own drawing at 32 units, linked from `index.html:12` and not rendered from `public/icons/`, while `vite.config.ts:15-20` renders the PNG from `icons/icon-maskable.svg`; the favicon is also absent from `#The files` (V7's new gap 5).
- Evidence: V7: `public/favicon.svg`; `index.html:12`; `vite.config.ts:15-20`. V8: the listing of `public/icons/`; `public/manifest.webmanifest:11-24`; `index.html:13`; `vite.config.ts:9-20`, `:21-31`; `.gitignore:4-5`.
- Corrected statement: V7, for `layout.md` (L190-196): "`public/icons/` holds the icons the manifest points to and the PNG some platforms need is rendered from; `public/favicon.svg`, which `index.html` links, is the browser tab's icon."; V7 Q9 asks V8 to align `offline.md#Icons` with whichever wording is chosen.
- Conflict: V7 (L53, L71, L190-196) corrects `layout.md` and hands `offline.md#Icons` to V8 to align (Q9, V7 L330; L330, L334); V8 confirms O12, "the SVGs in `public/icons/` are the only sources" (L62), notes that `favicon.svg` sits at the root of `public/` and stays precached (O14, L64), and keeps `#Icons` whole with no edit (V8 L111), so the favicon hand-off was not taken up, while V7 L330's other hand-offs, the command table and the two tests, were (V8 D5, D16, S11).
- Proposed call: **undetermined** between V7 and V8: check whether `public/favicon.svg` is its own drawing or rendered from an `icons/` SVG, and decide what "icon" covers (V8's confirmation holds only if it excludes the tab's icon). If the favicon is its own drawing and counts, **doc wrong** on both pages: `layout.md#The files` takes V7's wording and `offline.md#Icons` (L107) names the favicon as the tab icon's separate source in the same wording; if the sentences mean the app icon's forms, both pages say so.
- Related: Q-111
- Decision: Stands (undetermined); follows Q-111 (ok: the session reads `public/favicon.svg` against `public/icons/` and aligns both pages).

#### F-363. builtins/exact.test.ts, the one test beside no module, is unstated

- Type: gap (new)
- Target section: The files
- Units: V7 (L49, L175, L184-188, L325)
- Where: `devdocs/layout.md#The files` (`src/core/` bullet, page L14-19); `devdocs/layout.md#The modules` (page L149); `devdocs/testing.md#(top)` (page L20-22)
- Gap: the `src/core/` bullet states the "a test beside each module" rule and its three exceptions but not `src/core/builtins/exact.test.ts`, which is beside no one module; the module table lists it as it lists the two sweeps, so it is the third such entry point, not an anomaly (V7's new gap 7). testing.md#(top) states the same rule and gets no edit in V7's text.
- Sources: V7's edit of the `src/core/` bullet: "`builtins/exact.test.ts`, which is beside no one module, runs the exact functions through the pipeline (`[testing.md](testing.md)`)" (L184-188); V7 Q4: keep it in the table, name it in the bullet.
- Proposed call: add the clause to layout.md's bullet as V7 drafts, and the same to testing.md#(top)'s rule.
- Related: Q-072
- Decision: Stands; follows Q-072 (ok).

#### F-364. audit/ and the audit-unit skill are not in "The files"

- Type: gap (new)
- Target section: The files
- Units: V7 (L55, L79, L174, L324)
- Where: `devdocs/layout.md#The files`
- Gap: `audit/` and `.claude/skills/audit-unit/SKILL.md` are in the tree and unlisted (V7's new gap 6); `.prettierrc.json`, `.prettierignore`, `LICENSE` and the root `README.md` are unlisted too, "which is fine".
- Sources: the tree; `.claude/settings.json:1-14`
- Proposed call: list neither while the revamp runs, since `audit/` leaves when it lands (§12 q29) and the skill with it; one bullet each if either stays (V7 Q3).
- Related: Q-071
- Decision: Stands; follows Q-071 (ok: neither listed).

#### F-365. Why experimentalDecorators: a claim about Vite that moves

- Type: not verified · Flags: **low confidence**
- Target section: The files
- Units: V7 (L75, L322)
- Where: `devdocs/layout.md#The files` (page L75-77)
- Finding: "Components use TypeScript's `experimentalDecorators`, as Vite's own Lit template does, because Vite does not yet transform standard (TC39) decorators": `tsconfig.base.json:5-6` sets the flag (with `useDefineForClassFields: false`); the reason is a statement about Vite at its pinned version (`package.json:35`, `vite` 8.2.2) and its template.
- Why unverified: the reason concerns a dependency's behaviour, which the tree cannot show.
- Proposed call: verify against the pinned Vite before the page is next edited; if true, drop "yet" ("because Vite's TypeScript transform does not handle standard decorators"); if not, state why the project keeps the legacy flag, or remove the sentence with the flag (V7 Q1).
- Related: Q-070
- Decision: Follows Q-070: the Vite clause goes; the flag's real reason (Lit's decorators in TypeScript's experimental form, with `useDefineForClassFields: false`) is stated.

#### F-366. §9.2's row on layout.md's units.txt pointer is refuted

- Type: gap (refuted)
- Target section: The files
- Units: V7 (L159, L167, L329)
- Where: `devdocs/layout.md#The files` (`src/units.txt` bullet, page L20-24); plan §9.2
- Gap: plan §9.2 lists `devdocs/layout.md#The files` among the devdocs passages that point at docs "and then re-explain the user semantics"; the bullet is one sentence and a link and explains nothing beyond naming the file (V7's one refuted gap; §6 lists nothing for V7's pages).
- Sources: the page.
- Proposed call: no change to the page; the bullet stays, its pointer for the file's contents moving to `docs/units.md` once that page exists (V7 (F-369)); striking the row is the plan's correction (V7 Q8).
- Related: Q-077, F-504
- Decision: Stands; follows Q-077 (ok: §9.2 corrected).

#### F-367. src/testing/random.test.ts is mentioned nowhere

- Type: gap (new)
- Target section: The modules
- Units: V7 (L51, L170, L202)
- Where: `devdocs/layout.md#The modules` (`src/testing/random.ts` line, page L158); `devdocs/testing.md#The random source` (page L155-162)
- Gap: `src/testing/random.test.ts` checks the random source against the published vectors (`src/testing/random.test.ts:21-22`) and no page names it; testing.md says the vectors are checked without naming the test; the table's convention for a module outside `src/core/` is to name its test on the line (V7's new gap 2).
- Sources: V7's table line: `src/testing/random.ts` names `src/testing/random.test.ts`, which "checks it against the published vectors" (L202).
- Proposed call: name the test on the table's line, as V7 drafts.
- Decision: Stands.

#### F-368. Module table lines omit the stress tests and two exports

- Type: other
- Target section: The modules
- Units: V7 (L52, L54, L80, L203-205)
- Where: `devdocs/layout.md#The modules` (page L160, L183, L186-189); `devdocs/benchmarks.md#The stress tools` (page L118-122)
- Finding: `bench/stress/cases.test.ts`, `catalogue.test.ts`, `harness.test.ts` and `pool.test.ts` are named only in benchmarks.md#The stress tools, not on their modules' table lines, as the lines of the modules under `src/` name theirs; `bench/harness.ts` also exports `millis`, the report's format every benchmark uses, and `src/testing/fraction.ts` exports `inLowestTerms`, neither on its line.
- Proposed call: name the four tests on the lines of `harness.ts`, `cases.ts`, `pool.ts` and `catalogue.ts`, and `millis` on `bench/harness.ts`'s ("bestOf, word and millis: the timing, the names and the report's format only the benchmarks need"), as V7 drafts (L198-205); V7 drafts nothing for `inLowestTerms`.
- Decision: Stands.

#### F-369. layout.md, testing.md and benchmarks.md stay as mechanism

- Type: structure
- Units: V7 (L159, L161, L162, L163)
- Where: `devdocs/layout.md`; `devdocs/testing.md`; `devdocs/benchmarks.md`
- Finding: none of the three pages carries user semantics, so no section becomes a link to docs/; all stay as mechanism, with their intent and ruled-out alternatives kept as written (present tense apart from the stale rows). layout.md keeps why three type-checking programs, the node project matching by pattern, `.env` committed and what may not go in it, icons rendered without a dependency; testing.md keeps why the benchmarks are in `pnpm test:all`, contexts built from the constants, cases in a `Worker`, time reported not asserted, known violations failing both ways, `import type`, the probe's own generator, and rules out a second runner, Node's `todo`, `node:test`'s `timeout`, a per-case budget, `import { type X }`; benchmarks.md keeps why a ratio is asserted and a timing reported, loose thresholds, floor and deadline as constants, a hit written at once under a lock and a rename, settings in the app's envelope, cheap entries kept, the line's text never compared, and rules out a benchmark library, a timing threshold, options for the floor and the deadline, Prettier's `--write`, comparing an outcome's digits. The one link into docs/, layout.md's pointer for `src/units.txt` to `docs/definitions.md`, stays for the format; for the contents it points to `docs/units.md` once that page exists (unit D3).
- Proposed call: keep the three pages as mechanism (§12 q24); retarget the contents pointer when `docs/units.md` lands.
- Decision: Stands; the contents pointer retargets `docs/units.md` in the page's one-pass rewrite after that page lands (Q-008); amended by F-475 ("the definitions file").

### Findings owned by other pages that touch this one

- F-375 (devdocs/testing.md): Lists on testing.md omit exactDec and two draws
- F-460 (terminology): "plain number" against "dimensionless"
- F-498 (terminology): "reached only through" for a module only tests exercise

## `devdocs/testing.md`

12 findings (F-370 to F-381).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/testing.md#(top)` | V7 (L207-215) | — (the same test-beside-each-module rule here gets no `exact.test.ts` clause) |
| `devdocs/testing.md#What a test may depend on` | V7 (L217-223) | CONFLICT (within V7): "a small fixed budget" against Q5's keeping the probe test's budget (L326) |
| `devdocs/testing.md#The numeric test patterns` | V7 (L225-233) | — |
| `devdocs/testing.md#The edge sweeps` | V7 (L235-251) | — (#114 and #110 worded "is open", status unchecked) |
| `devdocs/testing.md#Type-checking` | V7 (L253-259) | — (#179 worded "is open", status unchecked) |
| `devdocs/testing.md#The UI` (link definitions at the page foot) | V7 (L261-263) | — |

### Findings

#### F-370. Why the benchmarks run in test:all: the history of three failing goes

- Type: stale (keep as intent)
- Target section: (top)
- Units: V7 (L31, L207-215)
- Where: `devdocs/testing.md#(top)` (page L16-18)
- Passage: "three of them once failed unnoticed for a whole stage, two of them before reaching their assertions"
- Tag: keep as intent; plan row confirmed (§9.4)
- Rewrite: "a benchmark left out of it fails unnoticed, often before reaching its assertion, when the table it builds or the expression it times is refused"; `bench/synthetic.ts:14-19` is the guard that came of it (V7 L207-215).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent).

#### F-371. "Within five seconds": a timing, or a constant that stays?

- Type: measurement · Flags: **conflict**
- Target section: What a test may depend on
- Units: V7 (L38, L93, L221, L326)
- Where: `devdocs/testing.md#What a test may depend on` (page L41-42)
- Finding: "one test of `limits.ts` asserts that a real probe answers within five seconds" is confirmed (`src/limits.test.ts:140`) and is a timing on the page; stale row tagged update (new).
- Conflict: V7 with itself: stale row 8, T12 and the section's rewrite replace it with "within a small fixed budget" (L38, L93, L221), while Q5 counts "the probe test's budget" among the tools' constants that stay, "since they are the design and the code's" (L326).
- Proposed call: owner decision under §12 q25 (V7 Q5): a constant of the test keeps "five seconds"; a timing becomes "a small fixed budget", as V7's text has it (L217-223).
- Related: Q-016
- Decision: Follows Q-016 (A): the probe test's budget is the test's constant and stays as "five seconds" (V7's "a small fixed budget" is not used).

#### F-372. Not only the shell calls contextOf: the stress tools do too

- Type: contradicts implementation
- Target section: What a test may depend on
- Units: V7 (L87, L155, L221)
- Where: `devdocs/testing.md#What a test may depend on` (page L26-29)
- Claim or passage: the limits are settings, "kept in the browser and proposed per device by the probe, and only the shell reads them, through `contextOf`".
- Finding: `src/app-shell.ts:256` reads the browser's settings, but `bench/stress/harness.ts:448` and `bench/stress/harness.test.ts:25,43,64` call `contextOf` too, on a case's settings from the catalogue or a literal.
- Evidence: `src/app-shell.ts:256`; `bench/stress/harness.ts:448`; `bench/stress/harness.test.ts:25,43,64`
- Corrected statement: "only the shell reads the browser's settings, through `contextOf`; the stress tools call `contextOf` too, on a catalogued case's settings, which the catalogue stores, never on the browser's"
- Proposed call: **doc wrong**: the stress tools still depend on no device's limits, so the paragraph's intent holds and only its wording is too narrow.
- Decision: Stands (doc wrong).

#### F-373. build.bench.ts does not build the system table at the ceiling

- Type: contradicts implementation
- Target section: What a test may depend on
- Units: V7 (L95, L223)
- Where: `devdocs/testing.md#What a test may depend on` (page L46-48)
- Claim or passage: "The tests of the system table (`units.test.ts`, `messages.test.ts`, `build.bench.ts`) build it at the ceiling context, as the app does"
- Finding: `units.test.ts` and `messages.test.ts` build at `ceilingContext` and `src/system-build.test.ts` through `buildSystemTable` at `ceilingFor`; `bench/build.bench.ts` builds synthetic tables, not the system one, at `DEFAULT_PRECISION`; `bench/rational.bench.ts` builds a one-unit table at the ceiling.
- Evidence: `src/units.test.ts:75`; `src/messages.test.ts:60,84,95,686`; `src/system-build.test.ts:30`; `bench/build.bench.ts:32-37`; `src/core/rounding.ts:45`; `bench/rational.bench.ts:86-89`
- Corrected statement: "The tests of the system table (`units.test.ts`, `messages.test.ts`, `system-build.test.ts`) build it at the ceiling context, as the app does, so that no unit holds a pass back; `build.bench.ts` builds synthetic tables at the default precision, since it measures the build and not the units."
- Proposed call: **doc wrong**: `build.bench.ts` measures how the build scales on synthetic files (benchmarks.md#What each benchmark asserts), so its precision is deliberate.
- Decision: Stands (doc wrong).

#### F-374. Reference digits: from mpmath too, and to forty digits

- Type: contradicts implementation
- Target section: The numeric test patterns
- Units: V7 (L98, L176, L229-233)
- Where: `devdocs/testing.md#The numeric test patterns` > Reference digits (page L55-59)
- Claim or passage: "values from Python's `decimal` module, named in the test, to at least fifty digits, so that an algorithm that is wrong in its tail is caught"
- Finding: mpmath is a second source (V7's new gap 8), and the Gamma family's tables are forty digits, with one argument to a thousand.
- Evidence: `src/core/fixed-gamma.test.ts:38,189`; `src/core/fixed-incomplete.test.ts:53`; `src/core/fixed-gamma.test.ts:103,212` (forty digits); `:56,208` (a thousand)
- Corrected statement: "values from Python's `decimal` module and from mpmath, named in the test, to forty digits at least, and for the Gamma and the incomplete families at one argument each to a thousand"
- Proposed call: **undetermined**: doc wrong per V7 (the forty-digit tables, with a thousand-digit check per family, are the tests as written); code wrong is possible because the page gives fifty digits a reason (catching a wrong tail). Settle by asking whether fifty is a requirement on the tests.
- Decision: Follows its own answer (A): the page states the tests as they are. [decisions.md section 3; plan §12.1]

#### F-375. Lists on testing.md omit exactDec and two draws

- Type: other
- Target section: The numeric test patterns
- Units: V7 (L47, L62, L101, L115, L119)
- Where: `devdocs/testing.md#The numeric test patterns` (page L71-76); `devdocs/testing.md#The random source` (page L155-160); `devdocs/layout.md#The files` (`src/main.ts` bullet, page L12-13)
- Finding: the helpers listed for `src/testing/scaled.ts` (`dec`, `fr`, `fraction`, `ball`, `digitsOf`) omit `exactDec`, a sixth; the draws listed omit `key` and `words`; "hundreds" of drawn definition lines holds (400); `src/main.ts` registers the components by importing the shell and the registration module. V7 confirms the statements and drafts no edit.
- Proposed call: add `exactDec` and the two draws when those sections are next edited; nothing else.
- Decision: Stands.

#### F-376. The sweeps' case counts and timings

- Type: measurement
- Target section: The edge sweeps
- Units: V7 (L35, L113, L247-251)
- Where: `devdocs/testing.md#The edge sweeps` (page L147-148)
- Finding: "The ball level runs about 36,000 cases in half a minute and the text level a few hundred in a few seconds": the counts' order holds (the `pnpm test:sweep` run reported 36,353 ball-level and 274 text-level cases), but the count is one the tool regenerates and the durations are timings (§12 q25). Stale row tagged update (new).
- Proposed call: Confirm `update`: "The ball level runs tens of thousands of cases and the text level a few hundred, which is why the sweeps run before a commit rather than on every edit; the run reports how many cases it ran and how long they took." (V7 L247-251)
- Decision: Follows Q-018 (B) and Q-016: the rough counts and durations stay, worded broad and generous ("tens of thousands of cases in about half a minute"; "a few hundred in a few seconds"), with why the sweeps run before a commit.

#### F-377. testing.md's reference-style issue links, their status unchecked

- Type: markdown and links · Flags: **low confidence**
- Target section: The edge sweeps
- Units: V7 (L36-37, L114, L124, L251, L259, L263)
- Where: `devdocs/testing.md#The edge sweeps` (page L150-151); `devdocs/testing.md#Type-checking` (page L201-202); the definitions at the foot, after `#The UI` (page L228-230)
- Finding: `[#114][114]`, `[#110][110]` and `[#179][179]` are reference-style links, outside the Markdown subset; V7 did not read the tracker, yet its rewrites word each one "is open".
- Proposed call: inline links at the owning passage ("is open ([#114](https://github.com/bsidhom/exucal/issues/114))", likewise #110 and #179) and delete the three definitions (V7 L251, L259, L263); check each issue's status first, and if one is closed, delete its reference and state the current design (§12 q26).
- Decision: Stands for the inline form and the status check; #110, #114 and #179 are developer-tooling issues that stay linked once from the passages that own them (confirmed on 2026-10-12, plan §12.2, item 10).

#### F-378. The three-argument functions do not take the cube of the second operands

- Type: contradicts implementation
- Target section: The edge sweeps
- Units: V7 (L104, L239-243)
- Where: `devdocs/testing.md#The edge sweeps` (second paragraph, page L93-94)
- Claim or passage: "a third-operand set and the cube of the second operands serve the three-argument functions"
- Finding: the first two arguments are the second operands and the third comes from the third-operand set; the full set cubed would be most of the sweep.
- Evidence: `src/core/edges.sweep.ts:301-307,1594-1597`
- Corrected statement: "the three-argument functions take the second operands as their first two arguments and a small third-operand set as their third, since the full set cubed would be most of the sweep" (V7's proposed text: "take that subset as their first two arguments", L239-243)
- Proposed call: **doc wrong**: the sweep's shape is deliberate (its size).
- Decision: Stands (doc wrong).

#### F-379. Type-checking: "(one did, …)" goes

- Type: stale (drop)
- Target section: Type-checking
- Units: V7 (L32, L255)
- Where: `devdocs/testing.md#Type-checking` (page L183-184)
- Passage: "(one did, until the projects were made to match by pattern)"
- Tag: drop; plan row confirmed (§9.4: the reason is already stated in the present tense)
- Rewrite: delete (V7 L255).
- Proposed call: Confirm `drop`.
- Decision: Stands (drop).

#### F-380. Type-checking: the past initialization cycle as a present reason

- Type: stale (keep as intent)
- Target section: Type-checking
- Units: V7 (L33, L259)
- Where: `devdocs/testing.md#Type-checking` (second paragraph, page L195-202)
- Passage: "the kernel's modules once formed an initialization cycle through `fixed.ts`, `ball.ts` and `context.ts` that only such imports kept alive, so that a module's top level ran before its constants existed…"
- Tag: keep as intent; plan row confirmed (§9.4)
- Rewrite: "so a cycle among the kernel's modules (`fixed.ts`, `ball.ts`, `context.ts`) that only such imports kept alive would run a module's top level before its constants exist, depending on which module a test imports first"; #179 inline (V7 L259).
- Proposed call: Confirm `keep as intent`.
- Decision: Stands (keep as intent); #179 stays inline here (confirmed on 2026-10-12, plan §12.2, item 10).

#### F-381. The Playwright checklist cannot be checked from the tree

- Type: not verified · Flags: **low confidence**
- Target section: The UI
- Units: V7 (L126)
- Where: `devdocs/testing.md#The UI` (page L210-226)
- Finding: no Playwright configuration or script is in the tree; the page says the run is recorded in each change's description.
- Why unverified: a procedure carried out per change, not a claim about code.
- Proposed call: keep as stated (V7).
- Decision: Stands.

### Findings owned by other pages that touch this one

- F-363 (devdocs/layout.md): builtins/exact.test.ts, the one test beside no module, is unstated
- F-367 (devdocs/layout.md): src/testing/random.test.ts is mentioned nowhere
- F-369 (devdocs/layout.md): layout.md, testing.md and benchmarks.md stay as mechanism
- F-392 (devdocs/benchmarks.md): Which numbers leave testing.md and benchmarks.md under §12 q25
- F-393 (devdocs/development.md): "A few seconds" for `pnpm test` and `pnpm bench`: qualitative or a timing?
- F-488 (terminology): "sheet" and "panel"
- F-498 (terminology): "reached only through" for a module only tests exercise

## `devdocs/benchmarks.md`

11 findings (F-382 to F-392).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/benchmarks.md#Running the benchmarks` | V7 (L265-273) | — ("a few seconds" kept, which V8 drops from development.md) |
| `devdocs/benchmarks.md#What each benchmark asserts` | V7 (L275-291) | — |
| `devdocs/benchmarks.md#The search` | V7 (L293-299) | — |
| `devdocs/benchmarks.md#The stress suite` | V7 (L301-309) | — |

### Findings

#### F-382. The example diagnostic line carries one run's timings

- Type: measurement
- Target section: Running the benchmarks
- Units: V7 (L39, L129, L265-273, L327)
- Where: `devdocs/benchmarks.md#Running the benchmarks` (page L19-21)
- Finding: the format of "ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)" is confirmed (`bench/build.bench.ts:41-43`); the figures are one run's. Stale row tagged update (new).
- Proposed call: elide the figures ("parse … ms (… µs per definition), build … ms (… µs per definition)"), or keep a real line and say it is one run's (V7 Q6).
- Related: Q-088
- Decision: Follows Q-088 and Q-016: keep a real line and say it is one run's (a rough, illustrative figure), or elide the figures; the session's choice.

#### F-383. The thresholds are not uniformly twice the expected ratios

- Type: contradicts implementation
- Target section: What each benchmark asserts
- Units: V7 (L131, L277)
- Where: `devdocs/benchmarks.md#What each benchmark asserts` (page L39-41)
- Claim or passage: "The thresholds are twice the expected ratios, so that noise never fails a benchmark that a regression would not fail by a wide margin."
- Finding: `bench/names.bench.ts:29-30` asserts five where about one is expected; `bench/kernel.bench.ts:51-53` asserts fifty where about 38 is; the others are twice (`bench/build.bench.ts:53-59`, `bench/rational.bench.ts:44-46`, `bench/kernel.bench.ts:149-155`).
- Evidence: as cited.
- Corrected statement: "The thresholds lie well above the expected ratios, about twice them in most cases, so that noise never fails a benchmark that a regression would not fail by a wide margin."
- Proposed call: **doc wrong**: the page's own bullets give both exceptions (the `names` check "costs about the same" yet is held to five; `pi`'s fifty against Karatsuba's 38 and the quadratic hundred), so the general sentence misstates them. By V7's own figures the kernel threshold is about 1.3 times its expected ratio, which "well above" overstates.
- Decision: Stands (doc wrong); "well above" is not used for the kernel threshold.

#### F-384. names.bench.ts: "fifty times as much" before the index

- Type: stale (keep as intent)
- Target section: What each benchmark asserts
- Units: V7 (L34, L133, L279, L323)
- Where: `devdocs/benchmarks.md#What each benchmark asserts` (`names.bench.ts` bullet, page L43-47)
- Passage: "(it costs about the same; before the index it cost fifty times as much)"
- Tag: keep as intent; plan row revised (§9.4 kept the figure; V7: the figure goes): the benchmark's comment says "grew some thirtyfold over this range" (`bench/names.bench.ts:24-26`), and neither figure is measurable today.
- Rewrite: "(it costs about the same; without the index the check grows with the number of prefixes, many times over this range, which is what the benchmark guards)" (V7 L279)
- Proposed call: Confirm `keep as intent` without the figure; the code comment's figure is a code change (V7 Q2).
- Related: Q-059, Q-088, B-066
- Decision: Stands (keep as intent); follows Q-088: a ratio may stay, but this one is unmeasurable today and contradicts the comment's thirtyfold, so "many times" (V7) unless the session measures it; B-066 is the code side.

#### F-385. rational.bench.ts reports its quotients and does not assert them

- Type: contradicts implementation
- Target section: What each benchmark asserts
- Units: V7 (L136, L285-291)
- Where: `devdocs/benchmarks.md#What each benchmark asserts` (`rational.bench.ts` bullet, page L71-80)
- Claim or passage: the bullet times the range operation, one gcd and two long quotients "and asserts that doubling the size costs at most eight times"
- Finding: the range operation (8,192 to 65,536 bits) and the gcd (16,384 to 65,536) are asserted; the two quotients at twice the default limit are reported, not asserted.
- Evidence: `bench/rational.bench.ts:37-47,52-66,69-98`
- Corrected statement: "…asserts of both that doubling the size costs at most eight times, twice what the quadratic gcd gives; it also reports two long quotients, at twice the default significand limit since the second is refused at the default."
- Proposed call: **doc wrong** per V7: the code reports the quotients beside two assertions; code wrong only if the quotients were meant to be guarded, which the page does not say.
- Decision: Stands (doc wrong).

#### F-386. "About forty times cheaper": a measured ratio in a rationale

- Type: measurement
- Target section: What each benchmark asserts
- Units: V7 (L40, L137, L291)
- Where: `devdocs/benchmarks.md#What each benchmark asserts` (`rational.bench.ts` bullet, page L76-78)
- Finding: "Lehmer's gcd is about forty times cheaper than Euclid's at the default significand limit" is the code's own figure (`bench/rational.bench.ts:18-25`) but a measured ratio; stale row tagged keep as intent (new). The code comment keeps the figure, while V7 asks only `names.bench.ts`'s comment to lose its own (V7 report). V1 tags the same figure on `devdocs/numbers.md#Exact operations` update ("far cheaper than Euclid's at the default limit; the benchmark holds the figures"); both drop the number.
- Proposed call: Confirm `keep as intent`: "many times cheaper … and still quadratic" (V7 L291).
- Related: F-188
- Decision: Follows Q-016 (the measured ratio stays: "about forty times cheaper … and still quadratic"); keep as intent.

#### F-387. kernel.bench.ts: two of its four tests are not on the page

- Type: gap (new)
- Target section: What each benchmark asserts
- Units: V7 (L135, L169, L281-283)
- Where: `devdocs/benchmarks.md#What each benchmark asserts` (`kernel.bench.ts` bullet, page L55-70)
- Gap: the bullet omits `exp` of a large argument at the ceiling against `exp` of one, with the digits in log space timed beside it (`bench/kernel.bench.ts:124-147`), and the decimal grid's own costs, the settle, the product of settled balls and the kernel's exit, at the ceiling against a quarter (`:207-257`) (V7's new gap 1).
- Sources: V7's appended text (L281-283): `exp` of a large argument costs within a small factor of `exp` of one "since the squaring loop renormalizes"; the grid's costs "scale from a quarter of the ceiling to the ceiling under the same bound of 64, being far below any routine".
- Proposed call: append the two tests to the bullet, as V7 drafts.
- Decision: Stands.

#### F-388. The stress search reads git

- Type: contradicts implementation
- Target section: The search
- Units: V7 (L146, L297)
- Where: `devdocs/benchmarks.md#The search` (page L185)
- Claim or passage: "The command never touches git."
- Finding: `bench/stress/search.ts:199` calls `currentCommit`, which runs `git rev-parse` and `git status`.
- Evidence: `bench/stress/search.ts:199`; `bench/stress/tooling.ts:51-63`
- Corrected statement: "The command reads the current commit from git, to record it with each run and hit, and changes nothing there: committing is the person's."
- Proposed call: **doc wrong**: reading the commit is deliberate (it is recorded with each run); the intent, that committing stays the person's, holds.
- Decision: Stands (doc wrong).

#### F-389. The catalogue's lock is also taken over after a fixed time

- Type: gap (new)
- Target section: The search
- Units: V7 (L145, L171, L295)
- Where: `devdocs/benchmarks.md#The search` (page L172-174)
- Gap: the lock is also taken over when held past a fixed time, not only from a process that is gone (`bench/stress/tooling.ts:137,169-173`) (V7's new gap 3).
- Sources: V7's edit: "(`bench/stress/catalogue.lock`, ignored by git, taken over when the process that holds it is gone or has held it past a fixed time)" (L295).
- Proposed call: as V7 drafts.
- Decision: Stands.

#### F-390. --jobs, which sets the stress commands' lanes, is not on the page

- Type: gap (new)
- Target section: The search
- Units: V7 (L144, L172, L299)
- Where: `devdocs/benchmarks.md#The search` (page L157-160)
- Gap: `--jobs` sets the lanes of both stress commands (`bench/stress/search.ts:4-5,195-197`; `bench/stress/verify.ts:3-4,322-323`); "one per core" is its default (V7's new gap 4).
- Sources: V7's edit: "lanes, one per core unless `--jobs` says otherwise, take the next case as they come free (`pool.ts`)" (L299).
- Proposed call: as V7 drafts.
- Decision: Stands.

#### F-391. The stress suite's minutes and hour

- Type: measurement · Flags: **low confidence**
- Target section: The stress suite
- Units: V7 (L41, L149, L303-309)
- Where: `devdocs/benchmarks.md#The stress suite` (page L210-212)
- Finding: "One function's cases take one to four minutes on four cores; a full run, every case and every hang, takes the better part of an hour" are timings; no stress run was made, so whether they are current is unchecked; the suite prints at the start what the catalogue's timings predict for the run (`bench/stress/verify.ts:352-364`). Stale row tagged update (new).
- Proposed call: Confirm `update` under §12 q25, which needs no run: "One function's cases take minutes; a full run, every case and every hang, takes far longer, since the catalogue is the costliest inputs known, and the suite says at the start how long the catalogue's own timings predict for the run." (V7 L303-309)
- Decision: Follows Q-018 (B): the rough durations stay, worded generously ("minutes"; "the better part of an hour"), with the suite's own prediction named.

#### F-392. Which numbers leave testing.md and benchmarks.md under §12 q25

- Type: measurement · Flags: **conflict**
- Units: V7 (L326, L334)
- Where: `devdocs/testing.md`; `devdocs/benchmarks.md`
- Finding: the pages carry measurements (the sweep's case count and times, the stress suite's minutes and hour, the example diagnostic line, the forty-times ratio), the tools' own constants (a hit's floor of a second, the two-minute deadline, ten minutes by default, the probe test's budget, the margin of ten percent) and model figures (38 per decade for Karatsuba, a hundred for quadratic); V7 proposes that the measurements go and the constants and model figures stay, a decision that "shapes most of the proposed text".
- Conflict: V7 lists the probe test's budget among the constants that stay (L326), yet its stale row 8 and rewrite drop "five seconds" (L38, L221); recorded also on the five-seconds finding (V7 (F-371)).
- Proposed call: owner decision (V7 Q5); V7's split fits §12 q25 ("a decision keeps the qualitative reason it rests on"); settle the probe budget and "a few seconds" with it.
- Related: Q-016, F-510
- Decision: Follows Q-016 (A, with the note): V7's split confirmed, with the tools' constants (the probe test's five seconds included), the model figures, the counts and the memory sizes staying; the measurements that leave may stay as rough, illustrative figures where they add weight.

### Findings owned by other pages that touch this one

- F-352 (devdocs/cost.md): cost.md and benchmarks.md both explain the deadline
- F-368 (devdocs/layout.md): Module table lines omit the stress tests and two exports
- F-369 (devdocs/layout.md): layout.md, testing.md and benchmarks.md stay as mechanism
- F-393 (devdocs/development.md): "A few seconds" for `pnpm test` and `pnpm bench`: qualitative or a timing?
- F-488 (terminology): "sheet" and "panel"
- F-497 (terminology): The stress catalogue's vocabulary and "hang"

## `devdocs/development.md`

10 findings (F-393 to F-402).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/development.md#Commands` | V8 (L205-209) | — (D3's stale row, L66, gives the same sentence) |
| `devdocs/development.md#Cloud environment` | V8 (L211-225) | — |
| `devdocs/development.md#Adding a unit` | D3 (L321-325, complete text); V8 (L227-231, opening sentence) | OVERLAP: V8 opens with a link to `docs/definitions.md`, D3 ends with one to `docs/units.md`; D3 corrects two statements V8 confirmed (V8 L48) |
| `devdocs/development.md#Style guide` | V8 (L233-247) | — (the third bullet waits for V8 (Q-029)) |

### Findings

#### F-393. "A few seconds" for `pnpm test` and `pnpm bench`: qualitative or a timing?

- Type: measurement · Flags: **conflict**
- Target section: Commands
- Units: V7 (L35, L84, L128), V8 (L316)
- Where: `devdocs/development.md#Commands` (page L72); `devdocs/testing.md#(top)` (the `pnpm test` row, page L7); `devdocs/benchmarks.md#Running the benchmarks` (page L14-15)
- Finding: three pages say the quick runs take "a few seconds": `development.md#Commands` ("`pnpm test` is the run for every edit, a few seconds"), the `pnpm test` row of `testing.md` and `pnpm bench` in `benchmarks.md`. V8 calls the development.md words a timing under §12 q25 (Q6) and proposes "`pnpm test` is the quick run for every edit", but leaves it out of its proposed edits (V8 report).
- Conflict: V7 confirms "`pnpm test` takes a few seconds" (`testing.md`, T3, V7 L84) and "`pnpm bench`, a few seconds" (`benchmarks.md`, B2, V7 L128) as qualitative and proposes no change, yet drops "in a few seconds" from `testing.md#The edge sweeps` as a timing, with that sentence's other figures (V7 (F-376), V7 L35); V8 drops the same words from `development.md` as a timing under §12 q25 (Q6, V8 L316).
- Proposed call: owner decision on §12 q25's reach (V8 (Q-018)): decide once whether "a few seconds" is a qualitative description that may stay or a timing that goes, and apply it to the three pages alike.
- Related: Q-018, F-376
- Decision: Follows Q-018 (B): "a few seconds" stays on all three pages as a rough, generous duration (V8's rewrite is not used).

#### F-394. Commands: "still written out" (§9.4 row)

- Type: stale (update)
- Target section: Commands
- Units: V8 (L36, L96, L108, L205-209), D3 (L66)
- Where: `devdocs/development.md#Commands` (page L65-67); plan §9.4
- Passage: "(The one place the flag is still written out is the cloud session hook, so that the hook reads as what it does.)"
- Tag: update (plan row confirmed by V8 and D3)
- Rewrite: "The cloud session hook writes the flag out so that it reads as what it does." (V8 L205-209; D3 L66 words it "…so that the hook reads as what it does."). The fact holds: the hook is the one place outside `node_modules` (`.claude/hooks/session-start.sh:18-21,57`).
- Proposed call: Confirm `update`.
- Decision: Stands (update).

#### F-395. Cloud environment: the setup script also writes a profile.d entry

- Type: contradicts implementation
- Target section: Cloud environment
- Units: V8 (L41, L98, L211-217)
- Where: `devdocs/development.md#Cloud environment` (page L97-100; the hook bullet, L108-110, already names the setup script's `profile.d` entry)
- Claim or passage: the setup script installs Node.js 24 and pnpm 12 under `/opt/node24`, "and nothing else, since a snapshot cannot hold per-session state"
- Finding: It also writes `/etc/profile.d/zz-exucal-node.sh`, a `PATH` entry for login shells (V8 tags the passage stale, update).
- Evidence: `scripts/cloud-setup.sh:45,50,55-56,61,64,122-155,225-235`
- Corrected statement: "…under `/opt/node24`, and a `profile.d` entry that puts it first on `PATH` for login shells; nothing per-session, since a snapshot cannot hold per-session state."
- Proposed call: **doc wrong**: the script and the page's own hook bullet agree on the entry. V8's third pair for the section ("A cloud session (a session of Claude Code on the web, claude.ai/code) runs…", L223-225) is terminology (V8 (F-496)).
- Decision: Stands (doc wrong).

#### F-396. Cloud environment: the wrong-toolchain sentence over-states two things

- Type: contradicts implementation
- Target section: Cloud environment
- Units: V8 (L46, L47, L99, L219-221)
- Where: `devdocs/development.md#Cloud environment` (page L129-132)
- Claim or passage: "A session that starts with the wrong toolchain, or with `npx` or `npm` on its path, is what this arrangement exists to prevent; if one does, the hook's output at session start says which part is out of date."
- Finding: The Node.js tarball ships `npm`, `npx` and `corepack`, and the script installs it whole and logs npm's version, so both are on every session's path (the rule not to run them is the page's own); the hook names the setup script when `node` or `pnpm` is missing and prints the versions it found, comparing nothing with `package.json` (the test does). V8 tags the passage stale (update).
- Evidence: `scripts/cloud-setup.sh:118-120,185,242`; the listing of `/opt/node24/bin` in V8's session; `.claude/hooks/session-start.sh:44-47,53`
- Corrected statement: "A session that starts without the project's toolchain, and so would run the base image's Node.js or reach for `npm`, is what this arrangement exists to prevent; if one does, the hook's output at session start names the setup script, and prints the versions it found." (V8 L99, L221)
- Proposed call: **doc wrong**: the script and the hook behave deliberately; the page over-states what is prevented and what the hook reports.
- Decision: Stands (doc wrong).

#### F-397. development.md: tool and platform behaviour nothing in the tree confirms

- Type: not verified · Flags: **low confidence**
- Target section: Cloud environment
- Units: V8 (L31, L33, L40, L44)
- Where: `devdocs/development.md#(top)` (page L12-14, D2); `#Prerequisites` (L32-33, D4); `#Cloud environment` (L90-92, D11; L115-120, D15)
- Finding: `npx` stops with `EBADDEVENGINES` under the pnpm declaration (D2); "pnpm 10 or newer switches to it automatically" (D4's hedged part); the base image has Node.js 22 on its `PATH` and the cloud runs the setup script once, as root, without a checkout, then snapshots the filesystem (D11); the claude.ai settings and the menu path the page gives (D15's hedged part).
- Why unverified: npm's, pnpm's and the platform's behaviour, outside the tree; running `npx` is what the page forbids; the script's header states D11 (`scripts/cloud-setup.sh:14-24`) and V8's session's `/opt` matches the layout it describes.
- Proposed call: Keep as stated; change only if the owner knows otherwise.
- Decision: Stands (keep as stated).

#### F-398. Test failure shows the build error, not "the offending definition"

- Type: contradicts implementation · Flags: **conflict**
- Target section: Adding a unit
- Units: D3 (L53, L321-325, L345)
- Where: `devdocs/development.md#Adding a unit` (page lines 136-138)
- Claim or passage: "`src/units.test.ts` loads the file and fails with the offending definition if it does not build."
- Finding: The test fails with the build error (`inspect(parsed)`, `inspect(built)`), which names the text at fault and its position as character offsets, or both definitions of a duplicate; it does not quote the line.
- Evidence: `src/units.test.ts:72-78`; D3's scratch run: an unknown unit in a body fails with the unit's name and its character span, a duplicate with both definitions
- Corrected statement: (D3) "The test fails with the build error, which names the text at fault and its position as character offsets, or both definitions of a duplicate; it does not quote the line."
- Conflict: V8 (L48) confirms the sentence ("The failing assertion prints the build's error"), citing `src/units.test.ts:169-183`, `:753-803`.
- Proposed call: undetermined: doc wrong if the build error is what a contributor needs (D3's text: "fails with the build error, which names the text at fault and where it is"), code wrong if the failure should name the line, as D3 Q6 proposes; the owner's answer to D3 Q6 settles it, and with it V8's reading.
- Related: B-032
- Decision: Stands (undetermined), settled by Q-060 (ok): the page describes the failure as the test reports it when the page is written (D3's text), the line-naming failure being the code track's (B-032).

#### F-399. The unit lists' section is not at the end of the file

- Type: contradicts implementation · Flags: **conflict**
- Target section: Adding a unit
- Units: D3 (L55, L67)
- Where: `devdocs/development.md#Adding a unit` (page lines 141-142)
- Claim or passage: "Unit lists have a section of their own at the end of the file"
- Finding: "Counts and ratios" (`src/units.txt:608-615`) follows the lists' section (`:585`) and ends the file. D3 also tags the passage stale (update, found).
- Evidence: `src/units.txt:585`, `:608-615`
- Corrected statement: (D3) "Unit lists have a section of their own, after the units and before the counts and ratios that end the file."
- Conflict: V8 (L48) confirms "a section at the end of the file", citing `src/units.txt:585` (of 615 lines).
- Proposed call: doc wrong, or design changed without the docs following (D3's stale tag); V8's own citation leaves thirty lines after the lists' heading; adopt D3's sentence.
- Decision: Stands (doc wrong; D3's sentence).

#### F-400. A function or a primitive also needs a test change

- Type: contradicts implementation
- Target section: Adding a unit
- Units: D3 (L57, L68, L325, L349)
- Where: `devdocs/development.md#Adding a unit` (page lines 143-144)
- Claim or passage: "A function goes in the file the same way (`[functions.md](functions.md)`)"
- Finding: The test pins three lists exactly (the primitives, the five functions, the unit lists) and checks each prefix only for presence, so a function or a primitive also goes into the test's list, and a prefix needs no test change. D3 also tags the passage stale (update, found).
- Evidence: `src/units.test.ts:186-200`, `:275-278`, `:777-801`, `:203-240`
- Corrected statement: (D3) "A function or a primitive goes in the file the same way and into the test's list of them, which pins both; a prefix needs no test change."
- Proposed call: doc wrong: the pinned lists are deliberate and the passage already says so for unit lists; adopt D3's text (L325), which also names the test row a unit earns and the `units.md` link.
- Decision: Stands (doc wrong; D3's text with the `units.md` link, which exists by then: Q-008).

#### F-401. development.md stays whole; Adding a unit opens with a link to docs

- Type: structure
- Target section: Adding a unit
- Units: V8 (L108, L205-247)
- Where: `devdocs/development.md` (all sections); `#Adding a unit`
- Finding: The page stays whole as the contributor's side (the pnpm rule and its table, Prerequisites, Commands, Cloud environment, Adding a unit and Style guide are mechanism, decisions and their reasons); `#Adding a unit` opens with a link to `docs/definitions.md`, and to `docs/units.md` once it exists (§7.1); V8's corrections D12, D17 and D18 and the §9.4 row apply.
- Proposed call: Keep the page; add the link (V8 L227-231, routed elsewhere) together with D3's full replacement of `#Adding a unit` (D3 (F-398)).
- Related: F-398
- Decision: Stands; follows F-475 ("the definitions file"); sequenced by Q-008: the devdocs edit lands with its page's one-pass rewrite, after the user pages it links exist.

#### F-402. Style guide gains the documentation principle (§12 q29)

- Type: other
- Target section: Style guide
- Units: V8 (L108, L172-203, L233-247, L315)
- Where: `devdocs/development.md#Style guide`; `devdocs/README.md#(top)`; `audit/principles.md`; plan §12 q29
- Finding: §12 q29 makes `#Style guide` the principle's permanent home, beside the rule on code comments, with `devdocs/README.md` keeping a one-sentence statement and a link. V8 drafts both, so the install is covered: the section's first bullet states the documentation principle (and that a `CLAUDE.md`, if ever added, points there), and the README's framing and development line link it (V8 L179, L197). V8's third bullet also installs the linking and Markdown principles of `audit/principles.md`, for which q29 names no home.
- Proposed call: Install the documentation principle and the README link as drafted (q29 is decided); the third bullet waits for the owner (V8 (Q-029)).
- Related: Q-029
- Decision: Stands; follows Q-029 (ok: all three principles in the style guide, the README linking it).

### Findings owned by other pages that touch this one

- F-004 (docs/README.md): Root README's tooling sentence goes; development.md owns the commands
- F-114 (docs/units.md): The catalogue moves from the language page to docs/units.md
- F-462 (terminology): "conform", "dimension mismatch", "kind mismatch"; "conformance tests"
- F-466 (terminology): "kind" in "the section its kind belongs to"
- F-496 (terminology): Deployment words in devdocs: precache, Preview, cloud session

## `devdocs/offline.md`

3 findings (F-403 to F-405).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/offline.md#Offline behavior` | D9 (L289-295), V8 (L249-261) | OVERLAP: D9 replaces "Update checks" and "The worker's status" whole; V8 rewrites the opening and edits the two bullets. D9 corrects the online clause and names the constants, V8 keeps the passage it confirmed (O4); D9's mapping repeats the words, V8's defers them to `docs/app.md` and `src/app-footer.ts`; "Tapping the build ID" vs "Tapping the build"; the app.md anchors differ |
| `devdocs/offline.md#Build ID` | V8 (L263-271) | Links app.md "Updates and the build", which D9's draft names "Updates and the build ID" |

### Findings

#### F-403. Update checks: the online check runs only while the page is in view

- Type: contradicts implementation · Flags: **conflict**, **low confidence**
- Target section: Offline behavior
- Units: D9 (L43, L81, L293, L325), V8 (L54, L255-257)
- Where: `devdocs/offline.md#Offline behavior > Update checks` (page L40-51)
- Claim or passage: "The page asks for one whenever it comes back into view or back online, and every hour while it stays in view, but never within five minutes of the last … Tapping the build number in the footer checks at once" (D9 tags it stale, update)
- Finding: The online handler checks only when the page is visible (D9, reasoned from code, not run); "build number" is a build ID.
- Evidence: `src/register-service-worker.ts:76-83` (D9)
- Corrected statement: "whenever it comes back into view or, while in view, back online", "the build ID", and the intervals named by their constants (`PERIODIC_CHECK` and `CHECK_INTERVAL` in `src/register-service-worker.ts`) rather than as figures (full bullet: D9 L293).
- Conflict: V8 confirms the passage as written (O4, V8 L54: `src/register-service-worker.ts:29-33,70-83,146-148`) and edits only "Tapping the build number" to "Tapping the build" (L255-257), keeping "every hour" and "five minutes"; D9 corrects the online clause and replaces the figures by the constants' names. D9 handed these bullets to V8 (D9 L325), but V8 had no D9 report (V8 L6, L322).
- Proposed call: **undetermined**: read the `online` handler at `src/register-service-worker.ts:76-83`; if it tests visibility, **doc wrong** (the page over-states when a check runs). Figures or constant names is a wording choice for the owner: they are parameters, not measurements.
- Decision: Stands (undetermined): the session reads `src/register-service-worker.ts:76-83`; the intervals are named by their constants (parameters, not measurements); follows Q-022.

#### F-404. offline.md: platform behaviour nothing in the tree confirms

- Type: not verified · Flags: **low confidence**
- Target section: Offline behavior
- Units: V8 (L53, L58, L65, L67)
- Where: `devdocs/offline.md#Offline behavior > Updates` (page L31-39, O3), `> Installation` (L71-75, O8); `#Icons` (L139-153, O15; L155-158, O17)
- Finding: Browsers check for a changed worker on every navigation, bypassing the HTTP cache, and a new worker waits until every page of the old version has closed (O3); Chromium-based browsers accept SVG install icons and Safari ignores manifest icons and needs a PNG `apple-touch-icon` (O8); iOS copies the home-screen icon once and never fetches it again, Chromium re-reads the manifest on launch at most once a day (O15); Cloudflare Workers Builds has no browser to lean on (O17).
- Why unverified: browser, OS and Cloudflare behaviour outside the tree; in-tree comments state O3 (`src/sw.ts:14-21`, with the default `updateViaCache` at `src/register-service-worker.ts:61`), O8 (`vite.config.ts:10-14`) and O17 (`rasterize-svg.ts:7-9`); nothing bears on O15.
- Proposed call: Keep as stated: they carry the reasons for the design; the owner confirms O15 and O17 if wanted.
- Decision: Stands (keep as stated).

#### F-405. Build ID: "There is no other versioning yet."

- Type: stale (update)
- Target section: Build ID
- Units: V8 (L100, L269-271)
- Where: `devdocs/offline.md#Build ID` (page L103)
- Passage: "There is no other versioning yet."
- Tag: update (V8; new)
- Rewrite: "The build ID is the app's only version." (V8 L269-271)
- Proposed call: Confirm `update`: "yet" frames the build ID historically, and the rewrite keeps the fact.
- Decision: Stands (update).

### Findings owned by other pages that touch this one

- F-172 (docs/app.md): offline.md#Offline behavior splits: the user's side moves to app.md
- F-173 (docs/app.md): "Tapping the build number…" moves to docs/app.md, with two omissions
- F-174 (docs/app.md): The footer's rarer words are documented nowhere; offline.md lists a subset
- F-175 (docs/app.md): What the build ID is has no user-side statement
- F-180 (docs/app.md): docs/app.md does not exist (§9.3); D9 and V8 drafted it independently
- F-362 (devdocs/layout.md): Is `public/icons/` the source of every icon? The favicon, on two pages
- F-408 (devdocs/security.md): Security: "a deploy being made from a developer's machine"
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-492 (terminology): "build number" and "build ID"
- F-493 (terminology): "service worker" and "the worker"
- F-494 (terminology): "a new version", "an update", "a deploy"
- F-495 (terminology): App-surface words: the cog, the checks the app makes on its own, install
- F-496 (terminology): Deployment words in devdocs: precache, Preview, cloud session

## `devdocs/deployment.md`

2 findings (F-406 to F-407).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/deployment.md#(top)` | V8 (L273-277) | — |

### Findings

#### F-406. Deployment: the version stamp "(as of 4.130.0)"

- Type: stale (update)
- Target section: (top)
- Units: V8 (L73, L101, L112, L273-277)
- Where: `devdocs/deployment.md#(top)` (page L44-47)
- Passage: "Wrangler (as of 4.130.0) sends its "autoconfig" events without reading the project config, so `send_metrics` alone does not silence them…"
- Tag: update (V8; new)
- Rewrite: drop the stamp, which mirrors the pin in `package.json` and reads as history after the next bump, and add "Both are worth rechecking when wrangler is updated." (V8 L275-277). The page otherwise stays whole: mechanism, decisions with their reasons, one ruled-out alternative (`pnpm dlx wrangler`).
- Proposed call: Confirm `update`.
- Decision: Stands (update).

#### F-407. Deployment: wrangler and Workers Builds behaviour not verifiable

- Type: not verified · Flags: **low confidence**
- Target section: (top)
- Units: V8 (L68, L71, L73, L75)
- Where: `devdocs/deployment.md#(top)` (page L3-9, P1; L16-21 and L32-34, P4; L44-50, P6; L55-61, P8)
- Finding: Workers Builds runs `pnpm run build` and `pnpm exec wrangler deploy` (P1); wrangler never removes a domain added in the dashboard, applies both switches on every deploy, and building a Preview does not change them (P4); wrangler sends its "autoconfig" events without reading the project config and loads `.env` first, and `DO_NOT_TRACK=1` overrides either setting (P6); `pnpm dlx wrangler` fails under `strictDepBuilds` because `esbuild` and `workerd` ship install scripts (P8).
- Why unverified: dashboard configuration and wrangler's internals; both commands resolve in the tree (`package.json:9,30`), the configuration's comments state P4 (`wrangler.jsonc:21-33`) and `.env`'s comment P6 (`.env:6-9`); for P8 the denial entries are in the tree (`pnpm-workspace.yaml:39-50`), but the lockfile records `hasBin` for both and no `requiresBuild` (`pnpm-lock.yaml:833-836,1057-1060`), and running `dlx` is what the page forbids.
- Proposed call: Keep as stated (P8 is a ruled-out alternative with its reason); the owner confirms P8's mechanism if it matters.
- Decision: Stands (keep as stated).

### Findings owned by other pages that touch this one

- F-408 (devdocs/security.md): Security: "a deploy being made from a developer's machine"
- F-496 (terminology): Deployment words in devdocs: precache, Preview, cloud session

## `devdocs/security.md`

3 findings (F-408 to F-410).

### Proposed text in the reports

| Target section | Units (report lines) | Overlap |
| --- | --- | --- |
| `devdocs/security.md#Toolchain and secrets` | V8 (L279-283) | — |
| `devdocs/security.md#Code that runs commands` | V8 (L285-289) | — |
| `devdocs/security.md#The page` | V8 (L291-295) | Links app.md "Working offline", which D9's draft names "Offline use" |

### Findings

#### F-408. Security: "a deploy being made from a developer's machine"

- Type: contradicts implementation
- Target section: Toolchain and secrets
- Units: V8 (L83, L97, L113, L281-283, L311, L322)
- Where: `devdocs/security.md#Toolchain and secrets` (page L65-69); against `devdocs/deployment.md#(top)` (page L3-9) and `devdocs/offline.md#Build ID`, `#Icons` (page L94-96, L156-157); `scripts/cloud-env:26-27` (comment)
- Claim or passage: nothing the project builds, tests or runs needs a secret, "a deploy being made from a developer's machine" (V8 tags it stale, update)
- Finding: The deployment page, the offline page and the rasterizer's header say Cloudflare Workers Builds runs the build and the deploy from the repository; `scripts/cloud-env:26-27` repeats the stale sentence and points at a "README.md (Deployment)" section that `README.md` does not have. V8 calls it "the one substantive finding".
- Evidence: `devdocs/deployment.md:3-9`; `devdocs/offline.md:94-96,156-157`; `rasterize-svg.ts:7-9`; `scripts/cloud-env:25-27`
- Corrected statement: "nothing the project builds, tests or runs needs one: the deploy is made by Cloudflare Workers Builds, with credentials Cloudflare holds, never from a cloud session (`[deployment.md](deployment.md)`)."
- Proposed call: **doc wrong** on the evidence of two pages and the rasterizer's header; unless the owner answers V8 (Q-030) that a developer's own `pnpm exec wrangler deploy` is also supported, in which case `deployment.md` says so in one sentence and `security.md` says the credential is theirs.
- Related: Q-030, B-054
- Decision: Stands (doc wrong); follows Q-030 (ok: Workers Builds alone); B-054 is the code side.

#### F-409. Security: DO_NOT_TRACK is set only in the cloud environment

- Type: other
- Target section: Toolchain and secrets
- Units: V8 (L84, L283)
- Where: `devdocs/security.md#Toolchain and secrets` (page L69-70)
- Finding: "Telemetry is off where a tool offers it (`DO_NOT_TRACK`, and `WRANGLER_SEND_METRICS=false` in `.env`)" holds, but `DO_NOT_TRACK` is set only in the cloud environment's variables (`scripts/cloud-env:29-34`); a developer's machine relies on `.env` (`.env:10`) and `send_metrics` in `wrangler.jsonc` (`wrangler.jsonc:16`), which the sentence does not name.
- Proposed call: Name where each opt-out lives: "(`DO_NOT_TRACK` in the cloud environment's variables, `send_metrics` in `wrangler.jsonc`, and `WRANGLER_SEND_METRICS=false` in `.env`)" (V8 L283).
- Decision: Stands.

#### F-410. Security: the command rule omits spawn, Prettier and the stress tools

- Type: contradicts implementation
- Target section: Code that runs commands
- Units: V8 (L85, L113, L285-289)
- Where: `devdocs/security.md#Code that runs commands` (page L74-81)
- Claim or passage: a command runs "through `execFileSync` or `execFile` with its arguments as an array, never a command string"; the rules bind "the tests and plugins that call git or tsc"
- Finding: Every call in the tree passes an array and none sets `shell`, but the stress tooling runs Prettier through `spawn` and calls git too.
- Evidence: `vite-plugin-build-id.ts:73-78`; `tsconfig-coverage.test.ts:55-57,76-78`; `bench/stress/tooling.ts:7,53-62,108-116`; greps for `exec`, `spawn`, `shell:`
- Corrected statement: "A command runs with its arguments as an array (`execFileSync`, `execFile` or `spawn`), never as a command string"; "the tests, plugins and stress tools that call git, tsc or Prettier" (the proposed text adds "and never with `shell` set", V8 L289).
- Proposed call: **doc wrong**: the rule's intent holds in every call; the page under-lists the APIs and the callers.
- Decision: Stands (doc wrong).

### Findings owned by other pages that touch this one

- F-171 (docs/app.md): The privacy fact has no user-side statement
- F-177 (docs/app.md): The sheet's "About these settings" link: undocumented, and an absolute URL
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-496 (terminology): Deployment words in devdocs: precache, Preview, cloud session

## Across pages: issue links and links to pages not yet written

16 findings (F-411 to F-426).

### Findings

#### F-411. Issue #88: linked from two pages; `numbers.md` agreed as its place

- Type: markdown and links
- Units: A7 (L204-227, L332-338), D1 (L117, L627-644, L690, L700), V1 (L59, L99, L142, L167-168, L238), V2 (L78, L96, L204-206, L300)
- Where: `devdocs/architecture.md#Evaluation` (page L580-581, `[#88][88]`; definition L1119); `devdocs/numbers.md#Roots and powers` (page L478-480, `[#88][88]` beside `[#89][89]`; definition L1565)
- Finding: #88 (`^` and `pow` disagree on such an exponent) is open and reproduces (V1: `2^1e-30000` refused, about 99,659 bits "however it is computed", where `pow(2, 1e-30000)` is `≈ 1`; `1^1e999999999` rejected as typed where `pow(1, 1e999999999)` is `= 1`); `#Evaluation`'s "`^` and `pow` disagree on such an exponent, which [#88][88] tracks" holds (`src/core/evaluate.ts:24-26`, D1). Both links are reference-style, outside the Markdown subset, and two places break §12 q26. A7 (L204-227, L332-338), D1 (L627-644, L690) and V2 (L204-206, L300) drop the link from `#Evaluation`, keep its pointer to `numbers.md` "Roots and powers" ("which carries/links the open issue") and delete the definition at page L1119, which nothing else on that page uses (`[92]` stays, for its own section); V1 (L238) keeps #88 inline at `#Roots and powers`, dropping the #89 clause and link beside it. D1 offers the inverse as an alternative (the link inline at `#Evaluation`, `numbers.md` dropping its own) and adds that the user reference states the current difference without a link and the generated `pow` entry inherits what its structured comment says; V2's Q3 names `builtins.md`'s entry for `pow` as the other candidate, answering `numbers.md` itself.
- Proposed call: `devdocs/numbers.md#Roots and powers`, which owns the disagreement, keeps the one link, inline (V1's text); `#Evaluation` points at that section without the issue and its definition line goes; D1's inverse and V2's `builtins.md` candidate are the owner's only alternatives.
- Related: Q-102, B-006, F-199, F-221
- Decision: Stands; follows Q-102 (ok: `devdocs/numbers.md#Roots and powers` keeps the one link); #88 is a bug and stays there under Q-011.

#### F-412. Issue #92: one link today, at "The reciprocal"; no second to remove

- Type: markdown and links
- Units: A2 (L51, L109), A4 (L132), A8 (L27, L44, L52, L93-95, L147, L149), V1 (L134, L138-149), V2 (L83, L96, L278-280, L301)
- Where: `devdocs/architecture.md#The converter and its lines > The reciprocal` (page L1100, "Both are [#92][92]."; definition L1120); `devdocs/numbers.md#Working precision and the schedule` (page L896-898, no #92 link); plan §1 Q14 ("(#92)"); plan §5 C4 ("outside the loop", #92)
- Finding: the one link is reference-style, outside the Markdown subset; #92 is open (A8 read its state and body). Of its three rows, the decimal-mode one is answered by `step` (`3 m` into `m` gives `m = 0.33333333 × 3 m`, exact), while no retry and no words for a refusal stand, the two that "Both are" names; a reciprocal refused at the exponent bound is also left out silently (`5e1000000000000000000 m` into `m` gives one line, the issue's first row) (A8 L27, L52). A2 (L51, L109), A8 (L44, L93-95, L147) and V2 (L96, L278-280, L301) agree on one inline link here, the passage that owns the reciprocal (C4's devdocs owner), the definition deleted. A8 (Q2, L147) and V2 (Q4, L301) also expected a second link in `numbers.md#Working precision and the schedule`, from plan §5 C4, for V1 to remove; V1's inventory of that page's ten issue definitions has no #92 (V1 L134, L138-149), and the section names the reciprocal with a page link to "The converter and its lines" only (page L896-898), so there is nothing to remove. A4 (Q1, L132) would record on #92 that the decimal-mode reciprocal is `1 / value` of the shown ratio (`3 m` in `in`: `0.0084666664` shown, `0.0084666667` exact), and A8 (Q4, L149) that a retry of a list's unit could ride the work on #92. Wording differs: A2 and A8 "Both are `[#92](…)`.", V2 "…; both are open in `[issue 92](…)`."
- Proposed call: `devdocs/architecture.md#The converter and its lines > The reciprocal` keeps the one link, inline, saying what is open; the `[92]:` line goes; nothing to remove in `devdocs/numbers.md`; Q14's "(#92)" does not travel into `docs/quantities.md`; whether the decimal-mode row is answered depends on A4's case.
- Related: Q-046, Q-103, B-009, F-038, F-328, F-507
- Decision: Stands; follows Q-103 (ok) and Q-046; #92 is a bug and stays there under Q-011.

#### F-413. Issue #98: three links on two pages; its one place disputed

- Type: markdown and links · Flags: **conflict**
- Units: A5 (L360-362), D6 (L44, L46, L146-152, L210, L233), D7 (L226-228), V1 (L83, L144, L322, L363-364, L370), V3 (L57, L73, L502-519, L727-729, L757)
- Where: `devdocs/builtins.md#The exact functions`, the `round` bullet (page L519-520); `devdocs/builtins.md#Not in this design`, first bullet (page L898-899); `devdocs/numbers.md#approx` (page L1525); definitions `devdocs/builtins.md` L907, `devdocs/numbers.md` L1567
- Finding: #98 (rounding to significant digits; open, V1 and V3 read its state) is linked reference-style from `round`'s bullet ("Rounding to significant digits is [#98][98]."), from `#Not in this design` ("A mode argument to `round`, and rounding to significant digits ([#98][98])") and from `numbers.md#approx` ("Significant-figure propagation then needs no new machinery ([#98][98])", the page's one mention of significant-figure propagation). D6 (Q4, L233; L46, L210) makes the `round` passage the one place, inlines it there (L146-152) and rewrites the `numbers.md` sentence to name the rounding `round` lacks with a link to the exact functions; V3 (L57, L757) keeps it at `round`'s bullet, its new text describing #98, only there, as rounding to significant digits "propagated from how the inputs were written" (L502-519), and points `#Not in this design` "above" (L727-729). V1 (Q4, L363; L144, L322) keeps it inline at `numbers.md#approx`, since the sentence that carries it stays, and asks V6 to name the extension in `future.md` without the link (§1.3 records no such intent there; L364, L370); A5 (L360-362) has V1 inline the section's three issues "each from this one place". D7's replacement of `#Not in this design` (L226-228) inlines #98 there again.
- Conflict: `round`'s bullet (D6 L46, L210, L233; V3 L57, L757) against `numbers.md#approx` (V1 L144, L322, L363; A5 L360-362); D7 (L226-228) keeps a third link at `#Not in this design`.
- Proposed call: owner decides between `devdocs/builtins.md#The exact functions` (`round`; D6, V3) and `devdocs/numbers.md#approx` (V1, A5) by what #98 asks, rounding to significant digits or their propagation through `approx(x, u)`; the other passages name the concept and link the chosen section, D7's `#Not in this design` text included.
- Related: Q-012, Q-014, F-221, F-303, F-345
- Decision: Follows Q-014: neither page links or describes #98; it is future work in `devdocs/future.md` only (Q-011); D6's `round` text, V1's `#approx` sentence and D7's `#Not in this design` text drop it.

#### F-414. Issue #100: three links; `numbers.md#approx` its agreed place

- Type: markdown and links · Flags: **conflict**
- Units: A2 (L27), A5 (L360-362), D5 (L40, L152-154), D6 (L45, L208), D7 (L226-228), V1 (L83, L145, L320, L364), V3 (L57, L73, L169-182, L727-729, L757, L764)
- Where: `devdocs/builtins.md#The rules every built-in follows`, the wide-argument bullet (page L133); `devdocs/builtins.md#Not in this design` (page L899); `devdocs/numbers.md#approx` (page L1510); definitions `devdocs/builtins.md` L908, `devdocs/numbers.md` L1568; plan N10 (A2's corrected statement)
- Finding: #100 (the two-argument `approx(x, u)`, a value entered with its uncertainty; open, A5, V1 and V3 read its state) is linked reference-style from the wide-argument bullet ("the two-argument `approx` ([#100][100])"), from `#Not in this design` ("a value entered with its uncertainty ([#100][100])") and from `numbers.md#approx` ("The binary form, `approx(x, u)`, … is [#100][100]", with its tentative design). The concept is `numbers.md#approx`'s (§1.1.4): A5 (L360-362), D6 (L45, L208) and V1 (L145, L320, L364) inline it there; D5 (L40, L152-154) and V3 (L169-182) replace the wide-argument pointer by "`[numbers.md](numbers.md)`, "`approx`"" without the issue, V3 does the same at `#Not in this design` (L727-729) and tells V1 to expect no pointer to #100 from `builtins.md` (L757, L764). D7's replacement of `#Not in this design` (L226-228) inlines #100 there again. A2's corrected N10 (L27), material for `docs/numbers.md`, names "(#100)" as one route to partially certified results; no unit links it from `docs/`.
- Conflict: D7 (L226-228) keeps an inline #100 at `builtins.md#Not in this design`, a second place, against the single link at `numbers.md#approx` that A5, D5, D6, V1 and V3 propose.
- Proposed call: `devdocs/numbers.md#approx` keeps the one link, inline; both `builtins.md` passages link that section without the issue (D5, V3), D7's `#Not in this design` text with them; N10's "(#100)" does not travel into `docs/numbers.md`.
- Related: Q-012, Q-104, F-221, F-303
- Decision: Follows Q-104 (future.md) and Q-035: #100's one link, with the binary form's tentative design, is in `devdocs/future.md`; `numbers.md#approx` names the binary form in one clause linking there; both `builtins.md` passages link that clause or `future.md` without the issue; N10's "(#100)" does not travel into the docs.

#### F-415. Issue #103: named on four pages; `builtins.md` or `cost.md`

- Type: markdown and links · Flags: **conflict**
- Units: A3 (L72), D7 (L103, L187-188, L248, L257), V1 (L55, L97, L146, L226, L362, L370), V3 (L8, L521-549), V6 (L79-93, L154, L186, L223, L230)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (page L649, "its footprint is [#103][103]"; definition L909); `devdocs/numbers.md#Memoized constants` (page L382-384; definition L1569); `devdocs/cost.md#What the costs come from` (page L104, bare "(#103, #121)"); `devdocs/future.md#Extensions that fit` (page L154; definition L231)
- Finding: #103 (the Bernoulli memo's footprint; open, V3 and V6 read it) is named on four pages. A3 (L72) and V1 (L55, L226, L362) take it out of `numbers.md#Memoized constants` for `builtins.md#The Gamma and Beta families`, which owns the memo; V1 asks V3 to add it there if absent (it is there) and its own rewrite does not depend on the answer (L97, L146, L370). V3 keeps it inline there (L542, in its edit L521-549). V6 (L93, L223, L230) gives `builtins.md` #103, its `cost.md` text pointing at that section, "which carries the memo's issue" (L154), and its `future.md` text likewise (L186). D7's question 2 (L248) gives #103 to `cost.md`, the families' last paragraph linking only `cost.md`, while D7's edit 1 inlines it in `builtins.md` (L187-188), the report leaving "which page keeps each link" to that question (L103, L257).
- Conflict: `builtins.md#The Gamma and Beta families` (A3 L72; V1 L226, L362; V3 L542; V6 L93, L154, L223) against `cost.md` (D7 L248), D7's own edit (L187-188) siding with the former.
- Proposed call: `devdocs/builtins.md#The Gamma and Beta families`, the passage that owns the Bernoulli memo, keeps the one link (§12 q26); `numbers.md`, `cost.md` and `future.md` name the footprint and link that section (V1, V6).
- Related: Q-011, Q-012, F-193, F-195, F-221, F-290, F-303, F-347, F-360
- Decision: Stands; follows Q-012 (A: `builtins.md#The Gamma and Beta families` keeps the one link); `numbers.md`, `cost.md` and `future.md` name the footprint and link that section.

#### F-416. Issue #107: on three pages; `builtins.md` or `cost.md`

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L205-206, L248), V3 (L8, L592-620), V6 (L79-93, L153, L223)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (page L810, "the uniform asymptotic expansions that regime wants are [#107][107]"; definition L910); `devdocs/cost.md#What the costs come from` (page L98, bare: "The large arguments are the regime of #107."); `devdocs/future.md#Extensions that fit` (page L152; definition L232)
- Finding: #107 (the expansions the incomplete gamma functions want at a large order past the argument; open, V3 and V6) is named on three pages. V6 (L93, L223) gives it to `cost.md`, its text inlining it in the cause of `erf`, `erfc` and the incomplete gamma functions (L153); D7's question 2 (L248) keeps it in `builtins.md` ("the regime's expansions"), and D7's edit 7 (L205-206) and V3's edit (L611, in L592-620) inline it there.
- Conflict: `cost.md#What the costs come from` (V6 L93, L153, L223) against `builtins.md#The Gamma and Beta families` (D7 L205-206, L248; V3 L611).
- Proposed call: owner decides between `devdocs/builtins.md#The Gamma and Beta families` (the expansions are the incomplete gamma's algorithm; D7, V3) and `devdocs/cost.md#What the costs come from` (the regime is a catalogued cost; V6), in one decision with #125, #149 and #150; the other passage names the regime and links that section.
- Related: Q-011, Q-012, F-303, F-347, F-360
- Decision: Follows Q-012 (A): `devdocs/cost.md#What the costs come from` keeps the one link; `builtins.md` names the regime and links `cost.md`.

#### F-417. Issue #115: `builtins.md` agreed; `future.md` points at the wrong section

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L217-218, L222-234, L248), V3 (L8, L694-717, L720-736), V6 (L37, L79-93, L187, L223)
- Where: `devdocs/builtins.md#The Gamma and Beta families`, last paragraph (page L879-885, "[#115][115] holds the context"; definition L912); `devdocs/future.md#Extensions that fit`, "More special functions" (page L160-163; definition L233), which points at `builtins.md` "Not in this design"; `devdocs/builtins.md#Not in this design` (page L896-904, named by that pointer)
- Finding: #115 (the eight special functions designed and deferred; open, its title naming them, V6 L79) is linked from two pages. Every unit keeps it in `builtins.md`: V6 (L93, L223), D7's question 2 (L248) and both rewrites of the families' last paragraph (D7 edit 11, L217-218; V3 L694-717, "are designed and deferred"). V6's new `future.md` text (L37, L187) points at `builtins.md` "Not in this design" as the section that "says which are which and carries the issue", as today's text points there for what was ruled out; but the eight functions, #115 and the "Ruled out as built-ins" list sit in the families' last paragraph (page L879-894), and `#Not in this design` carries neither the eight functions nor #115, today or in V3's and D7's rewrites (V3 L720-736; D7 L222-234).
- Conflict: the passage within `builtins.md`: the families' last paragraph (D7 L217-218; V3 L694-717) against `#Not in this design` (V6 L37, L187).
- Proposed call: `devdocs/builtins.md#The Gamma and Beta families`, last paragraph, keeps the one link; `future.md`'s "More special functions" points at that section, not at "Not in this design" (today's pointer and V6's text both name the wrong section).
- Related: Q-011, Q-012, F-303, F-346, F-347
- Decision: Stands for the pointer (the families' last paragraph, not `#Not in this design`); the one link follows Q-012 (A: `builtins.md`), confirmed by the owner on 2026-10-12 (plan §12.2, item 1).

#### F-418. Issue #118: linked from three pages; `cost.md` or `future.md`

- Type: markdown and links · Flags: **conflict**
- Units: D4 (L133, L375, L409), V5 (L51, L201-205, L211, L238), V6 (L79-93, L120, L126, L159, L179, L185, L223)
- Where: `devdocs/settings.md#The probe` (page L475, L512) and `#The sheet` (page L595), definition L719; `devdocs/cost.md#(top)` (page L13), `#What the costs come from` (page L128), `#What the search has not reached` (page L158), `#The hangs` (page L184), all bare; `devdocs/future.md#Extensions that fit` (page L145; definition L234); plan §5 C33
- Finding: #118 (keeping the interface responsive whatever an evaluation costs, the scheduler; open, V6 read it) is linked three times on `settings.md` (V5 L238; D4 L133, L409 counts the two in `#The probe` and hedges that `future.md` and `cost.md` "likely" link it too), named bare four times on `cost.md` and linked from `future.md`. D4 (Q7, L409) gives it to `future.md`, `#The probe` keeping "the interface's responsiveness" in words, yet D4's edit keeps one inline link at the first `#The probe` passage and leaves the second unlinked, "unless the owner places the issue's one link elsewhere" (L375). V5 (Q3, L238; L51) gives it to the page that owns the interface's responsiveness and the retry loop's cost, "`devdocs/cost.md`, or `future.md#Extensions that fit`, where §5 C33 places it", `settings.md` naming the concern in words; its edits read "the scheduler's concern (`[cost.md](cost.md)`)" and "the scheduler's concern" in `#The probe` (L201, L205) and "its scheduler" in `#The sheet` (L211), assuming that answer (V5's note). V6 (L93, L223) gives `cost.md` #118 to #121; its cost.md text links #118 twice (L126, L159) and names it bare a third time, "(#118, with #120's workers, linked above)" (L179), and its `future.md` entry points at cost.md's top without the number (L185); if the owner keeps the issue links on `future.md` instead, V6's fallback inlines them there in place and turns cost.md's bare numbers into links to `future.md` (L120).
- Conflict: `future.md` (D4 L409), with D4's interim link kept in `settings.md#The probe` (L375), against `cost.md` (V6 L93, L223; V5's first choice, L238, which leaves `future.md#Extensions that fit` open as the alternative).
- Proposed call: owner decides between `devdocs/cost.md` (V6; V5's first choice; plan §5 C33 names cost.md the owner of cost and the catalogue) and `devdocs/future.md#Extensions that fit` (D4; V5's alternative); `settings.md` names the concern in words in all three passages (D4 and V5 agree on that, D4's interim link going too), and the chosen page links #118 once (V6's cost.md text links it twice).
- Related: Q-011, Q-013, F-343, F-347, F-360
- Decision: Follows Q-013 (B): `devdocs/future.md#Extensions that fit` keeps the one link; `settings.md` and `cost.md` name the concern in words and link `future.md` (V6's cost.md text links it nowhere).

#### F-419. Issues #119 to #121: #118's parts, on `cost.md` and `future.md`

- Type: markdown and links
- Units: V6 (L46, L79-93, L120, L126, L154, L179, L185, L223)
- Where: `devdocs/cost.md#(top)` (page L13-14, bare "#118, with #119 to #121"); `devdocs/cost.md#What the costs come from` (page L104, bare "(#103, #121)"); `devdocs/cost.md#The hangs` (page L184, bare "#120's workers"); `devdocs/future.md#Extensions that fit` (page L146, "[#119][119] to [#121][121] for its parts"; definitions L235-236, none for #120)
- Finding: the three are open and are the three parts `future.md` lists for #118 (V6 L79): interactive results at a reduced precision, finalized after a debounce; the finalization in a web worker above a threshold; the slow, separable computations such as the Bernoulli run in a worker (page L146-149). #119 and #121 are named on both pages, #121 twice on `cost.md`; #120 is named bare on `cost.md` and implied on `future.md` by "#119 to #121", with no link definition. V6 alone places them (L93, L223): `cost.md` owns #118 to #121, `future.md`'s entry pointing at cost.md's top (L185); its fallback, if the owner keeps the links on `future.md`, inlines them there and links cost.md's numbers to `future.md` (L120). V6's own cost.md text links all three at the top (L126), links #121 again in the Gamma family's cause, "would move the run to a worker" (L154), and names #120 bare in `#The hangs`, "#120's workers, linked above" (L179).
- Proposed call: the parts follow #118: one inline link each beside #118's one link (under V6's mapping `cost.md#(top)`), every other mention in words or a section link, V6's L154 and L179 mentions included; the owner's #118 decision carries them.
- Related: Q-011, F-347, F-360
- Decision: Follows Q-013 (B) with the parts: #119 to #121 are linked once each beside #118 in `future.md`; every other mention is in words or a link to `future.md`.

#### F-420. Issue #125: on three pages; `builtins.md` or `cost.md`

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L196-197, L248), V3 (L8, L551-573), V6 (L79-93, L154, L223)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (page L736, "Shifting a wide argument by rectangular splitting of the rising factorial is [#125][125]."; definition L913); `devdocs/cost.md#What the costs come from` (page L102, bare); `devdocs/future.md#Extensions that fit` (page L153; definition L237)
- Finding: #125 (a cheap shift of the Gamma family's wide argument; open, V3 and V6) is named on three pages. V6 (L93, L223) gives it to `cost.md`, its text inlining it in the Gamma family's cause (L154); D7's question 2 (L248) gives it to `cost.md` too, the families section linking only `cost.md`, while D7's edit 4 inlines it in `builtins.md` (L196-197); V3's edit keeps it inline there (L572, in L551-573).
- Conflict: `cost.md#What the costs come from` (V6 L93, L154, L223; D7 L248) against `builtins.md#The Gamma and Beta families` (V3 L572; D7's own edit, L196-197).
- Proposed call: owner decides between `devdocs/builtins.md#The Gamma and Beta families` (the section that describes the shift; V3's and D7's edits) and `devdocs/cost.md#What the costs come from` (V6, D7's question 2), in one decision with #107, #149 and #150; the other passage names the shift and links that section.
- Related: Q-011, Q-012, F-303, F-347, F-360
- Decision: Follows Q-012 (A): `cost.md` keeps the one link; `builtins.md` names the shift and links `cost.md`.

#### F-421. Issues #130 to #134: one owner page, two placements proposed

- Type: markdown and links · Flags: **conflict**
- Units: A6 (L231-233), D2 (L34, L40, L42, L255, L282-288, L311, L462), V4 (L52, L161-167, L280-282, L486-514, L539-541, L558), V6 (L79-93, L169, L188-189, L223)
- Where: `devdocs/functions.md#Annotations` (#130 page L149, #132 L175), `#Names and shadowing` (#131 L238), `#An undecided condition` (#134 L457), `#Not in this design` (#134 L739), `#Deferred` (#130 to #133, L754-763), definitions L826-830; `devdocs/future.md#Extensions that fit` (all five, page L166-172, #132 again L175; definitions L239-243); `devdocs/cost.md#What the search has not reached` (#132 bare, page L155); proposed `docs/definitions.md#The format` (D2's #132); plan §7 (`docs/definitions.md` "User definitions", #132)
- Finding: all five are open (V6 L79, read 2026-10-10; D2, V4 and A6 do not state their status); each of #130 to #133 is linked from two or more places counting `future.md` and `cost.md`, and #134 from two on `functions.md` and from `future.md`. D2 (Q2, L462) links #130 at `#Annotations`, #131 at `#Names and shadowing`, #132 at `docs/definitions.md#The format` (the user statement), `future.md#Extensions that fit` keeping the intent without a second link, and #133 at `#Deferred`, every other occurrence a plain mention; yet D2's edits link #132 both in `docs/definitions.md#The format` (L255) and in `devdocs/functions.md#Annotations` (L288). V4 (Q1, L558) links #130 to #133 in `#Deferred`, the page's list of what is open, the other sections naming it ("is deferred ("Deferred" below)", L161-167), and #134 in `#An undecided condition` ("is open", L280-282), `#Not in this design` referring there (L486-490); either placement, V4 says, satisfies q26. A6 (L231-233) leaves #134's link to V4. V6 (L93, L223) gives `functions.md` all five and points `future.md` at `functions.md` "Deferred", "which carries the issues" (L188-189), V4's placement, its `cost.md` text replacing "#132" by the same section link (L169). Plan §7 and §12 q12 put #132 beside `docs/definitions.md`'s "User definitions". Wording differs: D2 "is open (`[#130](…)`)", V4 "is deferred" with a section reference.
- Conflict: D2 (L462: each issue at the section that discusses it, #132 at the user page) against V4 (L558) and V6 (L188-189, following V4's `#Deferred`); D2's own edits link #132 twice (L255, L288).
- Proposed call: owner decides between D2's placement and V4's (both meet q26 once D2's second #132 link goes); `future.md` and `cost.md` then link the chosen section without the numbers (V6).
- Related: Q-011, F-306, F-321, F-347, F-360
- Decision: Follows Q-011: `devdocs/future.md` keeps the one link of each of #130 to #134 (the user-functions entry, and the user-definitions entry for #132); `devdocs/functions.md`, `docs/definitions.md` and `cost.md` name none of them, the docs stating only the plain fact that the predefined definitions file alone is loaded (F-475).

#### F-422. Issue #149: on three pages; `builtins.md` or `cost.md`

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L208-209, L248), V3 (L8, L592-620), V6 (L79-93, L153, L223)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (page L818, "the series' full-precision division on every term is [#149][149]"; definition L914); `devdocs/cost.md#What the costs come from` (page L94, bare); `devdocs/future.md#Extensions that fit` (page L151; definition L244)
- Finding: #149 (the incomplete gamma and error functions' series dividing at full precision on every term; open, V3 and V6) is named on three pages. V6 (L93, L223) gives it to `cost.md`, its text inlining it in the cause of `erf`, `erfc` and the incomplete gamma functions (L153); D7's question 2 (L248) gives it to `cost.md` while D7's edit 8 inlines it in `builtins.md` (L208-209); V3's edit keeps it inline there (L619, in L592-620).
- Conflict: `cost.md#What the costs come from` (V6 L93, L153, L223; D7 L248) against `builtins.md#The Gamma and Beta families` (V3 L619; D7's own edit, L208-209).
- Proposed call: owner decides between `devdocs/builtins.md#The Gamma and Beta families` (the series' algorithm; V3's and D7's edits) and `devdocs/cost.md#What the costs come from` (V6, D7's question 2), in one decision with #107, #125 and #150.
- Related: Q-011, Q-012, F-303, F-347, F-360
- Decision: Follows Q-012 (A): `cost.md` keeps the one link.

#### F-423. Issue #150: on three pages; `builtins.md` or `cost.md`

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L214-215, L248), V3 (L8, L636-665), V6 (L79-93, L152, L223)
- Where: `devdocs/builtins.md#The Gamma and Beta families` (page L874, at the end of the formatter-broken passage, "the series' cost at the ceiling is [#150][150]"; definition L915); `devdocs/cost.md#What the costs come from` (page L88, bare); `devdocs/future.md#Extensions that fit` (page L150; definition L245)
- Finding: #150 (the incomplete beta function's series cost at the ceiling; open, V3 and V6) is named on three pages. V6 (L93, L223) gives it to `cost.md`, its text inlining it in the incomplete beta's cause (L152); D7's question 2 (L248) gives it to `cost.md` while D7's edit 10 inlines it in `builtins.md` (L214-215); V3's edit keeps it inline there (L664, in L636-665).
- Conflict: `cost.md#What the costs come from` (V6 L93, L152, L223; D7 L248) against `builtins.md#The Gamma and Beta families` (V3 L664; D7's own edit, L214-215).
- Proposed call: owner decides between `devdocs/builtins.md#The Gamma and Beta families` (V3's and D7's edits) and `devdocs/cost.md#What the costs come from` (V6, D7's question 2), in one decision with #107, #125 and #149.
- Related: Q-011, Q-012, F-303, F-347, F-360
- Decision: Follows Q-012 (A): `cost.md` keeps the one link.

#### F-424. Issue #151: `cost.md` agreed, but one edit keeps it in `builtins.md`

- Type: markdown and links · Flags: **conflict**
- Units: D7 (L217-218, L248), V3 (L8, L667-718, L757, L764), V6 (L73, L79-93, L176, L223, L225)
- Where: `devdocs/builtins.md#The Gamma and Beta families`, last paragraph (page L878, "the hangs at the highest precision limit the default significand limit allows are [#151][151]"; definition L916); `devdocs/cost.md#The hangs` (page L173, bare, and the generated hangs table's Issue column, 21 rows, page L189-235); `devdocs/future.md#Extensions that fit` (page L155; definition L246)
- Finding: #151 (the hangs at the highest precision limit under the default significand limit; open, V3 and V6) is named on three pages. V6 (L93, L223), V3 (Q4, L757: "#151 lives in `cost.md` only"; its families paragraph points at `cost.md` without #151 or #152, L667-718; L764) and D7's question 2 (L248) give it to `cost.md`; V6's text inlines it in `#The hangs` (L176). D7's edit 11 (L217-218) keeps it inline in the families paragraph. The generated table emits bare numbers (`bench/stress/catalogue.ts:561`, `hangsTable`) and tags 21 hangs with #151 (V6 L73); V6 (Q3, L225) would make the column emit links, a one-line change.
- Conflict: D7's edit (L217-218) keeps a `builtins.md` link against its own question 2 (L248), V3 (L757) and V6 (L93, L223).
- Proposed call: `devdocs/cost.md#The hangs`, which catalogues the hangs, keeps the one link (V3, V6, D7's question 2); the families paragraph points at `cost.md` without the number (V3's text); before the Issue column emits links, square 21 rows with q26 (V6 Q3).
- Related: Q-011, Q-012, Q-062, B-070, F-303, F-360
- Decision: Follows Q-012 (A): `cost.md#The hangs` keeps the one link; the families paragraph points at `cost.md` without the number; Q-062 for the table.

#### F-425. Issue #152: `expFixed`'s bullet or `cost.md`'s hangs

- Type: markdown and links · Flags: **conflict**, **low confidence**
- Units: D5 (L42, L171-174, L197), D7 (L217-218, L248), V3 (L8, L57, L73, L442-457, L667-718, L757, L764), V6 (L73, L79-93, L155, L177, L223, L225)
- Where: `devdocs/builtins.md#The elementary routines`, the `expFixed` bullet (page L406); `devdocs/builtins.md#The Gamma and Beta families`, last paragraph (page L879); definition L917; `devdocs/cost.md#What the costs come from` (page L113, bare); `devdocs/cost.md#The hangs` (page L179, bare, and the hangs table's Issue column, 19 rows); `devdocs/future.md#Extensions that fit` (page L155; definition L247)
- Finding: #152 (the hangs at the hard bound; open, V3 and V6) is linked reference-style twice on `builtins.md`, against the Markdown subset and §12 q26, and named on `cost.md` and `future.md`. V3 (Q4, L757; L57, L442-457) keeps it at `expFixed`'s bullet, "which owns the cause", and points the families paragraph at `cost.md` without #151 or #152 (L667-718); its new text describes #152, only there, as "what runs the elementary functions past a keystroke's budget at the hard bound of the precision limit", a statement no other source supports. D5 (L42, L173, L197) inlines it "in whichever passage V3 keeps" (its edit 16 offers no link at `expFixed` otherwise). V6 (L93, L223) gives the kernel hangs #149 to #152 to `cost.md`, `builtins.md`'s mentions becoming links to `cost.md`; its cost.md text links #152 twice, in the elementary functions' cause (L155) and in `#The hangs` (L177), where #152 covers "the special functions by the pass at 18,432 or 36,864 digits, and the elementary functions too", each step of `expFixed`'s series gaining a fixed eight bits. D7's question 2 (L248) gives #152 to `cost.md`, while its edit 11 inlines it in the families paragraph (L217-218). V3 expected V6 to confirm its placement (L757, L764); V6 proposes the opposite. The hangs table tags 19 hangs with #152 (V6 L73).
- Conflict: `expFixed`'s bullet (V3 L57, L757; D5 L42, L197, deferring to V3) against `cost.md` (V6 L93, L223; D7 L248); D7's edit (L217-218) keeps the families paragraph's link as well.
- Proposed call: owner decides between `devdocs/cost.md#The hangs` (the hangs at the hard bound, special functions among them; V6, D7's question 2) and `devdocs/builtins.md#The elementary routines` (`expFixed`, the cause; V3, D5); V6's text and the table's 19 rows lean to `cost.md` unless #152 is only `expFixed`'s series; the other passages point at the chosen section and V6's second cost.md link goes.
- Related: Q-011, Q-012, Q-062, B-070, F-303, F-360
- Decision: Follows Q-012 (A): `cost.md` keeps the one link (`#The hangs`); `expFixed`'s bullet and the families paragraph point at `cost.md` without the number; V6's second link goes.

#### F-426. Proposed text links docs pages and anchors not yet written

- Type: markdown and links · Flags: **conflict**
- Units: D1 (L485, L700), D8 (L152, L319), D9 (L103, L138), V1 (L336, L365), V2 (L104, L298), V4 (L111, L564), V5 (L155, L209, L239), V8 (L114)
- Where: proposed `docs/README.md` (D9's index) and `docs/app.md`; proposed edits linking `../docs/app.md` in `devdocs/architecture.md#The shell and its parts` (D9, V2), `devdocs/offline.md` (D9, V8), `devdocs/security.md#The page` and `devdocs/README.md` (V8); `devdocs/settings.md#The model` and `#The sheet` (V5); `devdocs/architecture.md#Expressions` and the other sections V2 pares; V4's `devdocs/functions.md` texts; V1's section openers for `devdocs/numbers.md`; D1's proposed `docs/definitions.md#Expressions` text; D8's drafts for `docs/numbers.md` (every section), `docs/settings.md#(top)`, `docs/functions.md#(top)`, `docs/definitions.md#Functions`; plan §6.8
- Finding: §7's pages (`getting-started.md`, `numbers.md`, `quantities.md`, `expressions.md`, `units.md`, `app.md`) and their anchors do not exist yet (§12 q3, q5), and the drafts link them. D9's index links all six, "the links resolve once the pages of §7 exist" (L103, L138), and the devdocs proposals of D9, V2 and V8 link `../docs/app.md` (V8 L114); V5's proposals link `../docs/numbers.md` and `../docs/app.md` (L155, L209); V2's pared sections link `docs/expressions.md`, `quantities.md`, `numbers.md` and `app.md` (L104); V4's texts link `../docs/quantities.md`, `expressions.md` and `numbers.md` (L111). D8's drafts link inline and repo-relative, same-page targets as `#anchor`, the anchors taken as the lower-case hyphenated form of §7's headings (`numbers.md#values-too-big-to-hold`, `#operations-that-stay-exact-exact-cases-of-functions`), into a page not yet written (L152, L319); V1's openers name `../docs/numbers.md#<anchor>` (L336). D1's text links no page that does not exist (one merged run had; removed, L700) and lists under §6.8 the links to add once the foundation pages exist (L485): "must conform" to `quantities.md`; "read exactly" and the literal limits to `numbers.md`; "so what it copies reads back" to `numbers.md`, which states the principle (§12 q11); the conversion into a function and the unit-list rules of "The two fields" to `quantities.md`. Two alternatives are proposed: apply an edit only once its target exists (V2 Q1, L298, "so that no link is ever dangling"; V4 Q7, L564, "when the skeleton lands"; V1 Q6, L365, the phase that creates `docs/numbers.md` applies the openers, V1's other edits now; D1, its links added then), or write the link now and set the anchor when the page lands (V5 Q4, L239, the sentences reading correctly as prose meanwhile; D8's and D9's drafts are written this way). For edits applied early, V2 (L104) names interim targets, `docs/definitions.md#Expressions` and `#Names` for `docs/expressions.md`, `docs/definitions.md#Unit lists` and `#Functions` for `docs/quantities.md`, `docs/settings.md` for `docs/numbers.md`, where V4 (L111, L564) points every such link at `../docs/definitions.md`, "Functions", which holds the rules today. Otherwise V8 finds its five pages within the Markdown subset (no reference-style definitions, no raw HTML; external links absolute, as the subset allows), and the index's link to `../devdocs/README.md` is navigation and stays (§9.2; D9).
- Conflict: whether a link may dangle meanwhile: apply once the target exists (V1 L365; V2 L298; V4 L564; D1 L485, L700) against write now and set anchors later (V5 L239; D8 L152, L319; D9 L103, L138); and the interim targets (V2 L104 against V4 L111, L564).
- Proposed call: one sequencing rule for every draft that links a §7 page, the owner's answer to the open question (V1 Q6, V2 Q1, V4 Q7, V5 Q4): apply such edits as each target page lands, or write the links to the outline's names now and check every anchor once the headings are final; if any edit goes in before its target, one interim map, not V2's and V4's two.
- Related: Q-008, F-066
- Decision: Follows Q-008 (A): an edit that links a page lands only once the page exists, in the linking page's one-pass rewrite; the whole rewrite runs in topological order (user pages first, in the sheet's order; getting started last; every devdocs page after the user pages it links), so no interim map is needed; where two user pages link each other, the page written first links at the anchor §7 fixes and the later page keeps that anchor (confirmed on 2026-10-12, plan §12.2, conflict 1; the rule is in principles.md).

## Terminology (plan §8)

73 findings (F-427 to F-499).

### Findings

#### F-427. "certain" for certified digits

- Type: terminology
- Units: A2 (L120-128, L140), A4 (L111, L123), A8 (L138), D4 (L361-363, L393), D5 (L183), D8 (L32, L37, L42, L118, L152, L297, L313), V1 (L63, L71, L76, L256, L282, L298, L344), V2 (L288), V3 (L257-266, L746), V5 (L52, L225)
- Where: `docs/settings.md:50` (`> Mode`), `:115`, `:194`, `:229-230`, `:257`; `docs/functions.md:194`, `:214`, `:217-222` (a diagram legend), `:232` (a table); `devdocs/numbers.md:765`, `:997`, `:1069`, `:1183-1186`; `devdocs/architecture.md:1018`; `devdocs/settings.md:42`, `:43`, `:49` (`#The model > The terms`); `devdocs/builtins.md:191` (`#Huge and tiny arguments`); code: the note `src/outcome.ts:507`, the sheet's line `MODE_LINES.exact` (`src/settings-lines.ts:261`)
- Term found: "certain" for a certified digit: the note "N of M digits are certain", "no digit certain", "every digit shown is certain", "until the digits asked for are certain", "all 32 digits certain", "which digits are certain", "more certain digits".
- Proposed canonical: every unit: **certified**. A2: the note becomes `` `${shown.certified} of ${digits} digits are certified` ``, pages quoting it change with it; A4, D4 (Q1), V5: the sheet's line is a code change on A2's list; V1: quoted notes "n of m digits are certified" and "the digits are not certified"; A8, V2: the devdocs quote the code's wording until the code changes; D8, V1: their drafts already quote "7 of 8 digits are certified", and D8 asks that A2's change land before `numbers.md` is assembled (D8 Q7).
- Against §8/§12: consistent (§8 "certified" row; §12 q8, which records the note's code change for A2).
- Proposed call: follow §12 q8 in every passage listed; land A2's code change (note and sheet line) first, so that the pages quoting the note (A8, V2, D8, V1) all read "certified" when published.
- Related: Q-006, B-068, F-021, F-023, F-037, F-214, F-266, F-332
- Decision: Stands; follows Q-006 (ok: the code change first, the pages quoting "certified").

#### F-428. "certifies" in the index before the reader has met it

- Type: terminology
- Units: D9 (L108-113, L319)
- Where: D9's proposed `docs/README.md#(top)` ("computes exactly wherever it can, certifies every digit it shows otherwise")
- Term found: "certifies" in the index's two-sentence intro, before getting started defines it.
- Proposed canonical: D9: keep "certifies" (getting started's second section defines it; §12 q8's word); alternative "and says how many digits it is sure of".
- Against §8/§12: consistent (the canonical word, §12 q8); only the order of first use is in question.
- Proposed call: keep "certifies" in the index, with getting started's "Reading =, ≈ and a note" defining it (D9's proposal), unless the owner prefers D9's plain alternative.
- Related: Q-064
- Decision: Stands; follows Q-064 (A).

#### F-429. "ceiling", its gloss "the finest grid", and "grid" in the user docs

- Type: terminology · Flags: **conflict**
- Units: A3 (L68, L134, L142), A1 (L280; draft L262-264), D4 (L394; draft L257-262, L281), D8 (L301; draft L196; rerun L109)
- Where: plan §8 (the "ceiling" row and the "grid" row); `docs/settings.md:111-112`, `:119`, `:158`, `:179`, `:225-232`, `:244-254`, `:257`; `devdocs/settings.md#The model > Precision limit`, `> The two limits meet in the grid`; code: `NumberContext.ceiling`, the probe's proposal line `src/settings-lines.ts:243` ("the built-ins on a grid of 4,040 digits")
- Term found: "finest grid" / "the finest grid the app rounds onto" for the ceiling; "grid", "grid cell", "grid point" in the user docs.
- Proposed canonical: §8 as written: **ceiling**, glossed once "the finest grid the app rounds onto"; "grid" explained once in `numbers.md` as the digits an approximate value is kept to. D4: §8's gloss (its Precision limit draft: "finer and finer grids up to a ceiling, the finest grid the app rounds onto", and "kept to a grid; a grid point"). D8: §8 confirmed, "grid" named once in `numbers.md`, "digits" and "the pass" elsewhere in docs (its `numbers.md` draft: "up to a ceiling: the finest grid it rounds onto, … 4,040 digits"). A1: "grid" in docs as §8 has it (its `docs/settings.md` draft: "the app may raise the grid to four times the sum of the limit and ten"). A3: gloss the ceiling "the highest precision any pass computes at"; "grid" stays a devdocs word (A3 Q2).
- Against §8/§12: conflicts: A3 asks to change §8's gloss and to keep §8's "grid" out of docs; §12 q5 gives `numbers.md` "the digits an approximate value is kept to" and does not name the grid.
- Conflict: A3 (L68, L134, L142) against D4 (L394), D8 (L301) and A1 (L280) on the gloss and on "grid" in docs. A3 (reasoned from code) says the ceiling is the last pass's precision and that pass's grid is `digitsFor(bitsFor(ceiling))`, 4,050 digits at the default ceiling of 4,040; D8's own rerun reports "the last grid having 4,050" at that ceiling (D8 L109) and grids ten digits beyond each pass (D8 (F-431)), against the gloss D8 keeps; A1's draft calls the ceiling's digit count "the grid". D4's draft also uses "grid" freely in the settings entries, against D8's "elsewhere in docs, 'digits' and 'the pass'".
- Proposed call: settle the gloss on the facts first (if the ceiling pass's grid is ten digits finer than the ceiling, as A3 and D8's rerun say, §8's gloss needs rewording); then decide whether "grid" appears in docs once (§8, A1, D8) or never (A3), and hold D4's, D8's and A1's drafts to it.
- Related: Q-004, B-026, F-022, F-125, F-126, F-127
- Decision: Follows Q-004 (B): the ceiling glossed "the highest precision any pass computes at" (§8 reworded); "grid" stays in the docs, explained once in `numbers.md` as the digits an inexact value is kept to (F-451), and D4's, D8's and A1's drafts are held to one gloss. Amended on 2026-10-14 (plan §12.3): the fix was the settings page's gloss, never a ban on "grid"; "finest grid" is allowed in its precise sense, the grid of the ceiling's pass, and never as the ceiling's name.

#### F-430. "the ceiling rounding" for the bound's rounding up

- Type: terminology
- Units: A2 (L139)
- Where: `devdocs/numbers.md:784-785` ("a bound the ceiling rounding carries past the edge")
- Term found: "ceiling" for a rounding direction applied to a bound, beside §8's one meaning (the last pass's limit).
- Proposed canonical: A2: **the bound's rounding up**, so that "ceiling" keeps its one meaning.
- Against §8/§12: consistent (§8 gives "ceiling" one meaning); new wording. Plan N20 (material of `docs/numbers.md`) also writes "under ceiling" for a rounding mode, a third use of the word, where the docs name the directed modes "toward zero, away from zero, up, down" (`docs/settings.md:46`).
- Proposed call: adopt A2's wording; where N20's "under ceiling" becomes page text, name the mode as the docs name the directed modes.
- Decision: Stands (A2's wording; N20's mode named as the docs name it); a new §8 row.

#### F-431. "working digits" in three senses; "the working grid"; "working precision" for the grid

- Type: terminology · Flags: **conflict**
- Units: A1 (L280), A3 (L135, L153), A4 (L128), D8 (L41, L107, L295), V1 (L345), V3 (L748), V5 (L232)
- Where: `devdocs/numbers.md#Sums and alignment`, `#Settling`, `#The kernel's boundary`, `#The working digits` (the `operandContext` paragraph), `#approx`; `devdocs/builtins.md#The rules every built-in follows`, `#The Gamma and Beta families` ("rounded onto the working digits", "at the working digits rather than the context's"); `devdocs/settings.md#The model`; `docs/settings.md:227-228`; code: `workingDigits`, `digitsFor(bitsFor(p))`, `onGrid`, `gridded`, `step`'s callback parameter `working` (#172)
- Term found: "working digits" for the decimal-mode setting, for a pass's precision, and for `digitsFor(bitsFor(p))`, the grid a pass settles onto; "working precision" for the grid's digit count.
- Proposed canonical: A1, A3, V1: **the working grid** for `digitsFor(bitsFor(p))` in devdocs (A3: never in docs), **working precision** a pass's precision, **working digits** the setting alone. A4: §8 as written; #172 owns the code vocabulary. V3: "the pass's working precision" or "the working precision's digits". D8: in docs the grid is "the digits an approximate value is kept to", ten beyond the pass's precision, named once in `numbers.md`; devdocs keep "working digits of the pass" until #172 renames it. V5: "working precision" for the grid's digit count is as §8 has it.
- Against §8/§12: consistent with §8's split (setting against pass); new: a name for a pass's grid, which §8 asks devdocs to rename without naming.
- Conflict: the devdocs name for a pass's grid now ("the working grid", A1 L280, A3 L135, V1 L345; "working digits of the pass" until #172, D8 L295; "the pass's working precision", V3 L748); and "working precision" for the grid's digit count, accepted by V5 (L232) and refuted by D8's run (L41, L107: passes of 18, 36, 72 digits have grids of 28, 46, 82), which also bears on V3's replacement.
- Proposed call: add to §8 a name for the grid a pass settles onto (devdocs "the working grid", docs "the digits an approximate value is kept to", or D8's interim), never "working precision" for it; check V5's and V3's passages against D8's run; #172 renames the code.
- Related: F-015, F-022
- Decision: Follows its own answer (ok): "the working grid" (devdocs), "working precision" (a pass's), "working digits" (the setting); in the docs "the digits an inexact value is kept to"; never "working precision" for the grid; #172 renames the code. [decisions.md section 2; plan §12.1]

#### F-432. "the guard" for two guards

- Type: terminology
- Units: A3 (L136), V1 (L346)
- Where: `devdocs/numbers.md#The types`, `#Working precision and the schedule`, `#Roots and powers`; code `GUARD_DIGITS` (ten digits), `GUARD_BITS` (32 bits)
- Term found: "the guard" for both the schedule's ten digits and the kernel's 32 bits.
- Proposed canonical: A3, V1: **the schedule's guard** and **the kernel's guard bits** wherever both are within reach of a sentence.
- Against §8/§12: new; devdocs-only.
- Proposed call: add to §8 (devdocs-only) as A3 and V1 propose.
- Decision: Stands; a new §8 row (devdocs-only).

#### F-433. "step", "operation", "node"; "pass", "settle", "certify", "schedule"

- Type: terminology
- Units: A4 (L124), V1 (L352), V2 (L293)
- Where: `devdocs/numbers.md#Decimal mode` items 2 and 3 ("An operation is a node of the expression tree"), throughout `devdocs/numbers.md`; `docs/settings.md#(top) > Mode` ("a step is an operation you can see"); `devdocs/architecture.md` ("retry schedule", "working context", "the schedule"); issue #172
- Term found: three words for one thing (operation, step, node); the #172 vocabulary (step, pass, settle, certify); "retry schedule", "working context".
- Proposed canonical: A4: **step** the user's word, glossed once "an operation you can see"; "node" devdocs-only; "operation" for the arithmetic itself. V1: until #172, **step** a node's one entrance, **pass** a round of the schedule, **settle** the size bound, **certify** the two ends rounding alike. V2: "retry schedule", "working context", "the schedule" devdocs-only, no change.
- Against §8/§12: consistent with §8's rows for "pass", "retry loop", "schedule" and "settle" (devdocs-only); "step" and "node" are new.
- Proposed call: add to §8: "step" (docs, glossed once as A4 has it), "node" devdocs-only; the code names stay #172's.
- Related: F-221
- Decision: Stands; new §8 rows ("step" in docs, glossed once; "node" devdocs-only).

#### F-434. "the fallback" of decimal mode's ceiling

- Type: terminology
- Units: A4 (L126), V1 (L350)
- Where: `devdocs/numbers.md#Decimal mode > The ceiling`, `> A result that is zero`
- Term found: "the fallback", "the ceiling's fallback" for the value and line §8 calls uncertified.
- Proposed canonical: A4, V1: **uncertified** (§8) for the value and the line; "the fallback" devdocs-only for the mechanism.
- Against §8/§12: consistent (§8 "uncertified" row). "Fallback" also names the decimal display in `devdocs/notation.md` (A2 (F-454)), a second sense.
- Proposed call: follow §8; keep "the fallback" for this mechanism only, devdocs-only.
- Related: F-042
- Decision: Stands (§8's "uncertified").

#### F-435. "exact in that arithmetic" in the sheet's decimal-mode line

- Type: terminology
- Units: A4 (L127)
- Where: `MODE_LINES.decimal` (`src/settings-lines.ts:263`)
- Term found: "exact in that arithmetic", where both pages say "exact under the mode's rounding".
- Proposed canonical: A4: **exact under the mode's rounding**, as both pages have it.
- Against §8/§12: new; consistent with the pages.
- Proposed call: align the sheet's line to the pages (a code change, beside A2's note wording); nothing for §8.
- Related: B-025
- Decision: Stands: the panel's line is aligned in the code change of Q-006 (B-025).

#### F-436. "neighbor rule" / "neighbour"

- Type: terminology · Flags: **conflict**
- Units: A1 (L278), A4 (L125; its claim rows L28-29 spell "neighbour"), D4 (L397), V1 (L351)
- Where: `devdocs/numbers.md#Sums and alignment`, `#Decimal mode > Arithmetic` (`decimalSumApart`); "the neighbor of a value that sits on the grid" (a directed mode) at `docs/settings.md:104`, `devdocs/numbers.md:1234`; plan N20 ("the neighbour rule"); code `src/core/rounding.ts:16`, `:69`, `:109`, `:128` ("neighbour", per D4)
- Term found: "neighbor" (the pages) against "neighbour" (plan N20; the code per D4).
- Proposed canonical: A1: **neighbor rule**, the pages' American spelling. D4: **neighbor** in the pages; the code's spelling is the code's. A4: "the neighbor rule" devdocs-only; the user docs say "the correctly rounded sum" and show the example. V1: devdocs-only, American spelling (A1, A4).
- Against §8/§12: new. Plan N20, the material of `docs/numbers.md`, names the rule that A4 and V1 keep out of docs.
- Conflict: A1 says the page and the code write "neighbor" (no code location); D4 says the code writes "neighbour" (`rounding.ts`); A4's own report spells "neighbour" in its claim rows (A4 L28-29) and "neighbor" in its term row (A4 L125). The code's spelling does not change the pages.
- Proposed call: add to §8: "neighbor" in the pages; "the neighbor rule" devdocs-only, the docs saying "the correctly rounded sum" (A4); N20's wording follows when it becomes page text; the code's spelling is D4 L397's.
- Decision: Follows its own answer (ok): "neighbor"; "the neighbor rule" devdocs-only, the docs saying "the correctly rounded sum". A new §8 row. [decisions.md section 2; plan §12.1]

#### F-437. "absorbed into the radius"

- Type: terminology · Flags: **conflict**
- Units: A1 (L281), A5 (L459), D8 (L303)
- Where: `devdocs/numbers.md#Sums and alignment`; `src/core/ball.ts`; `docs/functions.md:184` (`#Very large results and approx`, dissolved into `numbers.md` by §12 q10)
- Term found: "absorbed into the radius" for what a sum does with an operand below the working precision.
- Proposed canonical: A1: devdocs-only, as "settle" is. A5: keep in both corpora, as plain language. D8: keep in docs, as A5 does, with "error radius" where the noun stands alone.
- Against §8/§12: A5's and D8's docs use conflicts with §8's ball/midpoint/radius row (docs say "error radius"; the bare "radius" is a devdocs word leaking into docs); A1 is consistent.
- Conflict: A1 (L281) against A5 (L459) and D8 (L303).
- Proposed call: decide whether docs keep the idiom (A5, D8) or say it with "error radius" or plainly (A1, §8).
- Decision: Follows its own answer (B): the docs keep the idiom, always as "absorbed into the error radius". A new §8 row. [decisions.md section 2; plan §12.1]

#### F-438. "ball" and "midpoint" in the user docs

- Type: terminology
- Units: D8 (L36, L43, L44, L296)
- Where: `docs/functions.md:165`, `:174`, `:239`; `docs/settings.md:243-247`, `:258`
- Term found: "throughout its value's ball", "the whole ball past the edge", "its midpoint within its radius … the midpoint on a grid", "a midpoint rounded to `w` digits", "the two ends of the ball".
- Proposed canonical: D8: **error radius** and "every value within the error radius" ("What is known of it lies within its error radius, and the app keeps it to a fixed number of digits"); ball and midpoint devdocs-only.
- Against §8/§12: consistent (§8 ball row).
- Proposed call: follow §8 as D8 drafts.
- Related: F-016, F-050
- Decision: Stands (§8: "error radius"; ball and midpoint devdocs-only); amended by Q-004 ("grid" may stay in the docs, named once).

#### F-439. "canonical" (form, significand, text) and "the printed form"

- Type: terminology · Flags: **conflict**
- Units: A1 (L279), V1 (L355), D1 (L683; draft L448-449)
- Where: `devdocs/numbers.md#The types > Scaled`, `#The significand limit` (`scaled.ts`); `devdocs/architecture.md#Expressions`; `src/core/print.ts`; plan §5 C5 ("canonical text")
- Term found: "canonical form", "canonical significand" (the held value); "canonical text", "the printed form" (the printer's output).
- Proposed canonical: A1, V1: devdocs-only; docs say "the fraction is kept with no factor of ten in its denominator". D1: docs "how the app writes an expression back" (C5's owner); "canonical" devdocs-only.
- Against §8/§12: new.
- Conflict: D1's own `docs/expressions.md` draft ("How the app writes an expression back") says "in a canonical form that reads back as the same expression" (D1 L448-449), against its row (L683).
- Proposed call: add to §8: "canonical" devdocs-only in both senses; reword D1's draft sentence when it is applied.
- Related: F-013, F-090
- Decision: Follows its own answer (ok): "canonical" devdocs-only, spelled out where first used; D1's draft sentence reworded. A new §8 row. [decisions.md section 2; plan §12.1] Amended by the owner on 2026-10-13 (plan §12.3, "The canonical form, a user-docs concept"): "canonical" is a word of both corpora, glossed once per page; `docs/numbers.md` names the canonical form (in lowest terms, every power of ten in the exponent, the denominator coprime to ten, with no factor of two or five), says why a value has exactly one, and states a line as a function of the value, its exactness and the settings; D1's draft sentence may keep "canonical", glossed; §8's row amended.

#### F-440. "decimal exponent" beside "the exponent"

- Type: terminology · Flags: **conflict**
- Units: D8 (L300; draft L257, L263, L265)
- Where: `docs/functions.md:160-162`, `:246-247` (bound for `docs/numbers.md#Values too big to hold`); devdocs use it widely (`devdocs/numbers.md`, `devdocs/notation.md:177-180`, `devdocs/builtins.md:154`)
- Term found: "decimal exponent" (of `exp(x)`, `x log10 e`) beside "the exponent" (the power of ten's).
- Proposed canonical: D8: in docs **the exponent** is the power of ten's; **decimal exponent** only where a binary one could be meant, which is devdocs.
- Against §8/§12: conflicts with §8's "decimal" row, which keeps "decimal exponent" and asks each page to say which "decimal" on first use; D8 narrows it to devdocs.
- Conflict: D8's own draft of `docs/numbers.md#Values too big to hold` ("The exponent bound") writes "decimal exponent" three times (D8 L257, L263, L265), against its row (L300).
- Proposed call: either keep §8's rule (the term stays in docs, said which on first use) or adopt D8's narrowing and reword D8's draft; owner's call.
- Related: Q-026, F-053, F-057
- Decision: Follows its own answer (B): the docs say "the exponent"; "decimal exponent" devdocs-only; D8's draft reworded; §8's "decimal" row amended. [decisions.md section 2; plan §12.1]

#### F-441. "hard bound" (and "formable")

- Type: terminology · Flags: **conflict**
- Units: D1 (L680), A5 (L457), V1 (L349), V3 (L749), V6 (L214)
- Where: `devdocs/architecture.md#Expressions`, `#Parsing`; `devdocs/numbers.md#The kernel's boundary`, `#The significand limit`, `#Roots and powers`; `devdocs/builtins.md#The Gamma and Beta families`; `devdocs/cost.md`; code `MAX_SIGNIFICAND_LIMIT_BITS` (`2^20`, `src/core/rational.ts:101-115`), `src/settings.ts:471-474`; issue titles ("hard precision bound")
- Term found: "hard bound" for the most the significand limit can be set to (also the parser's limit on a literal); "formable".
- Proposed canonical: D1: devdocs keep **hard bound**, defined once as the largest significand limit the settings allow; docs say "the largest significand limit the settings allow", "which the numbers page can name once". A5: devdocs keep it; docs say "the most the significand limit can be set to" and, for a literal, "a number longer than the limit can ever be set to is rejected as it is typed". V1: devdocs-only, with "formable"; docs as A5. V3: **the significand limit's hard bound** (§5 C58), where kept at all. V6: **the hard bound**, glossed once as the significand limit's maximum; never "hard precision bound".
- Against §8/§12: new; §5 C58 names a class of "hard bounds" (`MAX_EXPONENT`, `WIDTH_LIMIT` and others), V3's reason to qualify it.
- Conflict: the docs phrase (D1 against A5, V1); whether docs name the term once (D1) or never (A5, V1); the devdocs name (qualified, V3, against bare, D1, A5, V6).
- Proposed call: add to §8: devdocs "the hard bound", glossed once and qualified where C58's other bounds are near; one plain docs phrase (D1's or A5's); never "hard precision bound".
- Related: F-239
- Decision: Follows its own answer (B): devdocs "the hard bound", glossed once, qualified near C58's other bounds, never "hard precision bound"; docs "the most the significand limit can be set to". A new §8 row. [decisions.md section 2; plan §12.1] Amended on 2026-10-13 (plan §12.3, R-4): a literal longer than that is refused as it is typed, a size refusal.

#### F-442. "rejected" / "rejection" beside "refusal" and "error"

- Type: terminology · Flags: **conflict**
- Units: D1 (L681; draft L320-331), A5 (L457-458)
- Where: `devdocs/architecture.md#Parsing`; code `src/core/parser.ts:194-215` (`check`), `src/core/expr.ts:169-178` (`Rejection`), `src/messages.ts:316-328` (`describeRejection`); drafts for `docs/expressions.md` (literal limits) and `docs/definitions.md#The format`, `#Functions`
- Term found: "rejection", "rejected" for text the parser recognized and refused (a literal past the hard bound or the exponent bound; a definitions-line fault).
- Proposed canonical: D1: devdocs keep "rejection"; docs call such a literal "an error as it is typed", keeping **refusal** for the three size refusals (its draft does). A5: keep both, "rejected" for text the grammar does not read, "refused" for a value the limits keep from being computed; docs "rejected as it is typed".
- Against §8/§12: §8's refusal row gives docs **error** for everything but the three size refusals, which D1 follows; A5's "rejected" (and D2's drafts) add a third word to docs, new to §8.
- Conflict: D1 (L681) against A5 (L457-458); D2's drafts for `docs/definitions.md` also say "rejected" ("The file is rejected when", "and is rejected; write the scale in the body", D2 L38, L217-219, L268).
- Proposed call: decide whether docs say "rejected" (A5, D2) or only "an error" (D1, §8) for text refused as typed; devdocs keep "rejection" either way.
- Related: F-090, F-098
- Decision: Follows its own answer (A, with the note as a rule): docs say "an error" for everything but a size refusal, text the grammar does not read being "an error as it is typed"; devdocs keep "rejection" as the distinct notion for what the parser recognized and refused, and never "refuse" for a domain error, an edge or a mismatch; §8's refusal row amended. [decisions.md section 2; plan §12.1] Extended on 2026-10-12 (plan §12.2, conflict 8): the settings panel's lines that decline an edit are not refusals in the docs, which say the panel "does not accept" an edit or that a value is "held to" its range; the devdocs keep "refusal" there only as the code's identifier (`refusalOf`). Amended on 2026-10-13 (plan §12.3, R-4: B): a literal past the hard bound or the exponent bound is a size refusal in both corpora (past the exponent bound the same `overflow` as a computed value past it); "rejection" covers only text rejected for its form and the definitions-line faults, and the code's `Rejection` is named as it is.

#### F-443. "refused" for a domain error; "error" for a size refusal

- Type: terminology
- Units: D5 (L188), D6 (L220), D8 (L255, L298), V3 (L750)
- Where: `docs/functions.md#(top)` bullet 10 ("`factorial(approx(5))` is refused", "The refusals of a value `factorial` does not take"); `devdocs/builtins.md#The exact functions`; `docs/settings.md:138-139` ("an error rather than a hang", bound for `numbers.md`)
- Term found: "refused"/"refusal" for a domain error; "error" for the significand limit's refusal.
- Proposed canonical: D6: **error** for a domain error, refusal only for the three size refusals. D8: **refusal** ("a refusal rather than a hang"). D5, V3: "refused" for the size refusals and "error"/"domain error" as used, canonical.
- Against §8/§12: consistent (§8 refusal row).
- Proposed call: follow §8 as D6 and D8 draft.
- Related: F-151
- Decision: Stands (D6's and D8's wording) as F-442's rule: "error" for a domain error, "refusal" for the size refusals only, in both corpora.

#### F-444. Wording of the significand limit's refusal: reach, fits, exceeds, need, unaffordable

- Type: terminology
- Units: A3 (L137), A5 (L455-456), D7 (L241)
- Where: `docs/settings.md#(top) > Significand limit`; `docs/functions.md` bullets 14 and 16 ("is not computed and says so"); `devdocs/numbers.md` (a pass a `tooLarge` marks unaffordable); code `src/core/rational.ts:66` (`Reach`, `fits`, `exceeds`), `:80-83` (`Need`), `src/messages.ts:357-360`
- Term found: the code's `Reach`, `fits`, `exceeds`, `Need`; "is not computed and says so"; "unaffordable".
- Proposed canonical: A5: docs keep the plain phrasing (a refusal the message offers a remedy for; one past the limit "however it is computed"; "the bits it would need", exactly, as "about", or not at all); devdocs keep `Reach`, `fits`, `exceeds`, `Need`. D7: **past the significand limit**, "the limit there being one of cost". A3: "unaffordable" kept, devdocs-only.
- Against §8/§12: consistent with §8's `tooLarge` row (docs: past the significand limit).
- Proposed call: follow §8; add the code's words (`Reach`, `fits`, `exceeds`, `Need`, "unaffordable") as devdocs-only.
- Related: F-051, F-208
- Decision: Stands (§8; the code's words devdocs-only).

#### F-445. "log space" and its examples

- Type: terminology · Flags: **conflict**
- Units: V1 (L356)
- Where: `devdocs/numbers.md#The kernel's boundary`, `#Roots and powers`, `#Why the exponent bound stays at 10^18`; `docs/functions.md:246-253` (bound for `numbers.md`)
- Term found: "log space" for the route (`exp(ln x / n)`) and for the user's advice.
- Proposed canonical: V1: devdocs for the route; docs keep the advice "work in log space" "with its two examples, as §12, question 10 has it".
- Against §8/§12: conflicts with §12 q10, which gives `numbers.md` "the log-space advice with one example"; D8's draft keeps one worked example (the quotient) and the exponent as a closing clause (D8 Q1).
- Conflict: V1 (L356) against §12 q10 and D8's draft.
- Proposed call: follow §12 q10 (one example, as D8 drafts); keep "log space" as the docs' phrase and the route devdocs-only.
- Related: Q-026, F-057
- Decision: Stands; follows Q-026 (ok: one example); amended by F-440 ("the exponent" in the docs).

#### F-446. "rounding boundary", "tie", "grid point", "half-way mode"

- Type: terminology
- Units: A2 (L134), D6 (L222)
- Where: `devdocs/numbers.md#Certification and the display rule`; `devdocs/builtins.md#The exact functions` ("a ball of a tie under a half-way mode"); `src/core/display.ts`, `src/core/ball.ts`, `rounding.ts`
- Term found: "rounding tie", "rounding boundary", "grid point", "a cell's edge", "a rounding cell" for the value where a rounding changes; "half-way mode".
- Proposed canonical: A2: **rounding boundary** (devdocs, general), **tie** for a nearest mode's, **grid point** for a directed mode's; docs "exactly halfway between two roundings". D6: **a mode to nearest** (the term of `rounding.ts` and the sheet's labels); "tie" stays.
- Against §8/§12: new; agrees with A6 and V1's "boundary" for a rounding cell's end (next finding); "grid point" uses the devdocs "grid" (see the ceiling finding).
- Proposed call: add to §8 (devdocs): rounding boundary, tie, grid point, a mode to nearest; docs "exactly halfway between two roundings".
- Related: B-044, F-023
- Decision: Stands; new §8 rows (devdocs).

#### F-447. "edge", "boundary", "bound"; "touch", "straddle"

- Type: terminology · Flags: **conflict**
- Units: A6 (L404-405), V1 (L353-354)
- Where: `devdocs/numbers.md#Comparison`, `#Exact operations`, `#The exponent bound`, `#Certification and the display rule`, `#Roots and powers`; `devdocs/functions.md#The check at a call`; `devdocs/builtins.md#The rules every built-in follows`; code `touchingAbove`, `touchingBelow`, `position`, `Edge`, `round.ts`
- Term found: "touching", "a touch", "an end exactly on it" against "straddles", "across", "reaching across"; "edge" (a domain end, a pole, the bound) against "boundary" (a rounding cell's end) against "bound" (a condition's).
- Proposed canonical: A6, V1: devdocs **touch** (an end exactly on the point) and **straddle** (reaching across), the two answers of `position`; **edge** the point a result depends on (`Edge`), **boundary** a rounding cell's end, **bound** a condition's (V1: and the exponent bound). A6, docs: one phrase, a value whose bounds reach or meet the edge; "edge" alone, with §8's "cannot be told from".
- Against §8/§12: consistent with §8's "unresolved / cannot be told from / straddles / undecided" row (devdocs refine "straddle").
- Conflict: D2's draft for `docs/definitions.md#Functions` keeps "An inexact value can straddle the bound" (D2 L264-265) in docs, against A6's docs phrase and §8.
- Proposed call: add to §8 the devdocs pairs as A6 and V1 propose and A6's one docs phrase; reword "straddle" in D2's draft.
- Related: F-028, F-029, F-098
- Decision: Follows its own answer (ok): the devdocs pairs and A6's one docs phrase; D2's "straddle" reworded. New §8 rows. [decisions.md section 2; plan §12.1]

#### F-448. "kernel", "series", "continued fraction", "truncation bound" in docs/functions.md

- Type: terminology
- Units: D7 (L87, L239-240)
- Where: `docs/functions.md#(top)` bullet 12 ("which the kernel shifts exactly"), bullets 14 and 16
- Term found: mechanism words in the user reference.
- Proposed canonical: D7: the proposed bullet 12 drops "kernel"; docs say "every result is certified" and leave the series and the continued fraction to devdocs; the generated reference (§4.1) carries no mechanism; bullets 14 and 16 not edited (§4.4).
- Against §8/§12: consistent (§8 "kernel" devdocs-only); "series", "continued fraction", "truncation bound" new, devdocs-only.
- Proposed call: follow §8; mechanism words stay in devdocs when bullets 14 and 16 are next touched.
- Related: Q-093, F-160
- Decision: Stands; follows Q-093 (ok).

#### F-449. Devdocs-only built-in vocabulary: door, boundary, whole range, saturates, ulp, F-division

- Type: terminology
- Units: D5 (L184-186), D6 (L223), V1 (L347-348), V2 (L294)
- Where: `devdocs/builtins.md#The rules every built-in follows`, `#Huge and tiny arguments`, `#The exact functions`; `devdocs/numbers.md#The kernel's boundary`, `#Memoized constants`, `#Roots and powers`; `devdocs/architecture.md#Numbers`, `#Functions`; code `exp.ts` ("the kernel's door"), `inverse-trig.ts`
- Term found: "trivial bound" / "the function's whole range"; "the kernel's door", "exit", "the kernel's boundary"; "saturates"; "ulp"; "F-division", "concordant".
- Proposed canonical: D5: **whole range** ("trivial bound" the kernel's own word, named once); **the kernel's boundary**, "door" only inside that section of `numbers.md`; "saturates" kept, glossed once "answered by its limit far out". V1: door, exit and boundary devdocs-only; "ulp" glossed once "a unit in the last place of a kernel value". V2: "the kernel", "the kernel's boundary" devdocs-only, no change. D6: "F-division", "concordant" (Boute's) devdocs-only, defined where used.
- Against §8/§12: consistent (§8 "kernel" devdocs-only); the rest new, devdocs-only.
- Proposed call: add to §8 as devdocs-only terms, each glossed once where first used.
- Related: F-265
- Decision: Stands; new §8 rows (devdocs-only, glossed once).

#### F-450. "recognizes as exact" for an exact case

- Type: terminology
- Units: D5 (L143, L182)
- Where: `docs/functions.md:116`
- Term found: "recognizes as exact".
- Proposed canonical: D5: **exact case**, glossed once (its edit 4: "An exact case, a value the function recognizes as exact, is shown with `=`").
- Against §8/§12: consistent (§8 "exact case").
- Proposed call: follow §8 as D5's edit 4.
- Decision: Stands (§8: "exact case").

#### F-451. "approximate", "known to a precision" for inexact

- Type: terminology
- Units: D3 (L332), D6 (L219)
- Where: plan §7, `docs/units.md` skeleton ("Angle units (approximate through `pi()`)"); `docs/functions.md#(top)` bullet 10 ("known to a precision")
- Term found: "approximate" and "known to a precision" for an inexact value.
- Proposed canonical: D3: **inexact** in the skeleton; D6: **inexact**.
- Against §8/§12: consistent with §8's model words; §8 keeps "approximate" as the plain-language gloss, and §7 uses it in other headings ("Exact and approximate values", "Making a value approximate", "which units are approximate").
- Proposed call: follow §8 in body text; decide once whether §7's headings use the gloss "approximate" or "inexact", for all of them.
- Decision: Follows its own answer (B, a rule): "inexact" everywhere a value with a nonzero radius is meant, headings included; "approximate" and its variants only for the act of making a value inexact; §8's row and §7's headings amended, every draft held to it. [decisions.md section 2; plan §12.1]

#### F-452. "whole number" and "integer"

- Type: terminology
- Units: D6 (L225), D7 (L243), D8 (L299), V5 (L226)
- Where: `docs/functions.md:173`, `:180` ("integer", "integer power"); `devdocs/notation.md` (the rule, the width, the design notes: "whole number"); the messages ("whole number"); the sheet's lines ("A whole number.", `NOTATION_LINE`)
- Term found: "integer" in docs; "whole number" in a devdocs page.
- Proposed canonical: D8: **whole number**, **whole-number power** in docs. V5: **integer** in devdocs, mapped once; the sheet's lines are user text and keep "whole number". D6, D7: both as §8 maps them ("regularized", "complement", "the median" uncontested).
- Against §8/§12: consistent (§8 "whole number" row).
- Proposed call: follow §8 as D8 and V5 propose.
- Decision: Stands (§8).

#### F-453. "relation" for `=`, `≈` and the uncertified sign

- Type: terminology
- Units: A2 (L138)
- Where: `src/outcome.ts` (`Relation`); `devdocs/architecture.md#The converter and its lines > The relation and the note`
- Term found: "relation", absent from §8.
- Proposed canonical: A2: **relation**, in both corpora.
- Against §8/§12: new.
- Proposed call: add to §8: "relation" for `=`, `≈` and the uncertified sign, in both corpora.
- Decision: Stands; a new §8 row ("relation").

#### F-454. "the decimal display", "the fallback", "the digits notation"

- Type: terminology
- Units: A2 (L137)
- Where: `devdocs/notation.md#The rule`; `src/core/display.ts`
- Term found: three names for the decimal display.
- Proposed canonical: A2: **the decimal display** (§8); never "fallback" in docs.
- Against §8/§12: consistent (§8: "digits" the notation's value, "the decimal display" the mechanism). "The fallback" also names decimal mode's ceiling mechanism (A4 (F-434), V1 (F-434)).
- Proposed call: follow §8; drop "fallback" for the decimal display so that the word keeps one sense in devdocs.
- Decision: Stands (§8: "the decimal display"; "fallback" dropped for it).

#### F-455. Rule 4's form: "scaled ratio" or "a ratio times its power of ten"

- Type: terminology · Flags: **conflict**
- Units: A2 (L136), V5 (L123, L228)
- Where: `devdocs/notation.md#The rule` (rule 4), `#Where a ratio is written`, `#Where it lives`; `src/core/display.ts` (`Shown.scale`)
- Term found: "scale", "a ratio times a power of ten", "the factored form", "the scaled form".
- Proposed canonical: A2: **a ratio times its power of ten** in prose; `scale` the field, devdocs-only. V5: **scaled ratio**, glossed once "a ratio times a power of ten" (its rule 4 edit uses it).
- Against §8/§12: new (§8 settles "ratio notation", "ratio", "width").
- Conflict: A2 (L136) against V5 (L228) for the same passage.
- Proposed call: pick one name for rule 4's form (V5's term or A2's phrase) and add it to §8.
- Related: F-325, F-329
- Decision: Follows its own answer (A): "scaled ratio", glossed once; the canonicity question is outside the rewrite. A new §8 row. [decisions.md section 2; plan §12.1]

#### F-456. "fraction" reserved for the held value

- Type: terminology
- Units: D1 (L679), V5 (L227)
- Where: `docs/definitions.md:159` ("parenthesized fraction" for `m^(1/2)`); `devdocs/architecture.md:401` ("parenthesized rational"); `devdocs/notation.md#The rule`, `#Not in this design` ("written as its fraction in lowest terms", "When that fraction does not fit", "an approximating fraction"); the `fraction` flag of the `exact` kind
- Term found: "fraction" for a written ratio and for a parenthesized exponent.
- Proposed canonical: D1: docs "a decimal over an unsigned one, in parentheses", leaving "fraction" to the value's representation; devdocs keep "rational" for the `Exponent`. V5: **ratio** for the written form, **fraction** for the significand; the flag's name is code.
- Against §8/§12: consistent (§8's ratio-notation row; §12 q5's "the fraction and its bit size").
- Proposed call: follow §8 as D1 and V5 propose.
- Related: F-325
- Decision: Stands (§8).

#### F-457. "parses back", "typed back", "reads back", "pastes back"

- Type: terminology · Flags: **conflict**
- Units: A2 (L135; own edit L114)
- Where: `devdocs/notation.md#Where a ratio is written`, `#Every literal parses back`; `devdocs/architecture.md#The converter and its lines`; `docs/README.md#(top)`; `docs/settings.md:82`; plan §5 C5 ("typed back"), §7 and §12 q11 ("every result pastes back")
- Term found: five phrasings of the property that every result can be entered again.
- Proposed canonical: A2: **parses back** in devdocs, **can be typed back** in docs.
- Against §8/§12: new to §8 (§5 C5 lists "typed back" without settling it); §12 q11 and §7 say "pastes back".
- Conflict: A2's docs choice against the units' docs drafts: "reads back" in A8 (`docs/README.md`), D9 (`docs/app.md`, L247-248), D1 (`docs/expressions.md`, L449, L458) and A2's own edit of `docs/settings.md:82` (L114); "can be typed back as a have" in A8's `#Unit lists` draft; V5 (L92) writes §12 q11's "pastes back".
- Proposed call: add to §8 one docs phrase (§12 q11's "pastes back", or A2's "can be typed back") and "parses back" for devdocs; align the drafts to it.
- Related: F-060, F-122
- Decision: Follows its own answer (ok): docs "pastes back", devdocs "parses back"; the drafts aligned. A new §8 row. [decisions.md section 2; plan §12.1]

#### F-458. "the digits of the Settings" for display digits

- Type: terminology
- Units: A8 (L137)
- Where: `docs/definitions.md#Unit lists`
- Term found: "the digits of the Settings".
- Proposed canonical: A8: **display digits** (§8), applied in its edit.
- Against §8/§12: consistent.
- Proposed call: follow §8 as A8's edit.
- Decision: Stands (§8).

#### F-459. "dimensionless markers" for the kind primitives

- Type: terminology · Flags: **conflict**
- Units: A7 (L158-160, L166-181, L295-301), D2 (L36, L449), V2 (L74, L138-140, L286, L304)
- Where: `devdocs/architecture.md:104-106` (`#Quantities, dimensions and kinds`); `docs/definitions.md:66`, `:80-82` (`#The format`: "# kind primitive (dimensionless)", "a dimensionless marker that keeps quantities apart"); code comments `src/core/dimension.ts:13`, `:70`, `src/core/definitions.ts:11`, `:123`
- Term found: "dimensionless markers", "kind primitive (dimensionless)".
- Proposed canonical: A7: **kind primitive**, which marks "a kind of quantity that has no physical dimension, so that an angle is told from a plain number". V2: "markers of a kind, with no dimension of their own"; for `docs/definitions.md`, "a marker of a kind, with no dimension of its own" (V2 Q7). D2: "# kind primitive" and the gloss "a marker that keeps apart quantities which would otherwise look alike".
- Against §8/§12: all three apply §12 q20 and §8 (a kind is never called dimensionless; no general term yet); they differ only in wording.
- Conflict: two replacement texts for `devdocs/architecture.md:104` (A7 L166-181, V2 L138-140) and two for `docs/definitions.md#The format` (D2's draft, V2 Q7).
- Proposed call: follow §12 q20; pick one wording per passage; the code comments are a code change (A7 Q1).
- Related: Q-059, Q-097, B-057, F-093, F-190
- Decision: Follows its own answer (ok): "a marker of a kind, with no dimension of its own", or "kind marker", in both corpora; §8's kind row and §5 C35 amended; the code comments are the code track (B-057). [decisions.md section 2; plan §12.1]

#### F-460. "plain number" against "dimensionless"

- Type: terminology · Flags: **conflict**
- Units: A7 (L231-245, L302-306, L339-342), A9 (L290-294), D1 (L684), D5 (L180), D6 (L226), V2 (L287), V3 (L747, L760), V4 (L553), V6 (L190, L217), V7 (L315)
- Where: `devdocs/builtins.md` (`#Dimension rules` every row, `#Domains, exact cases and edges`, `#The exact functions`, `#The Gamma and Beta families`, the Angles and `floor` paragraphs); `devdocs/functions.md` (throughout; `DIMENSIONLESS` in the build-time checks); `devdocs/future.md` ("adding an angle to a plain number"); `devdocs/layout.md#The modules` (the `round.ts` line); `devdocs/architecture.md#Definitions` (`:211`, `:217`, a prefix's body), `#Evaluation`; the messages (`src/messages.ts:174`, `:185`: "1 is a plain number, but sin takes an angle"); the code's rule `plainNumbers`
- Term found: "plain number" in devdocs, where §8 reserves "dimensionless" for a plain scalar.
- Proposed canonical: keep "plain number" in devdocs, defined once: A7 (`#Dimension rules`: "A plain number, in the table, is a dimensionless quantity: one with neither dimension nor kind."), V3 (the same section: "a plain number, which is dimensionless: neither dimension nor kind"), V4 (prose; "dimensionless" where `DIMENSIONLESS` is meant), A9 (`architecture.md:211`, `:217`, no change). Write "dimensionless" in devdocs: D5 ("dimensionless (a plain number)" once per section, then "dimensionless"; docs and messages keep "plain number"; owner decides, since the messages are code), V2 (`#Definitions`), V6 ("a dimensionless number"), V7 (the `round.ts` line). D1, D6: devdocs "dimensionless", docs "plain number", as used.
- Against §8/§12: §8 reserves "dimensionless" for a plain scalar "in both corpora, glossed 'a plain number' in docs"; the units read differently whether devdocs may use the gloss too.
- Conflict: A7, V3, V4, A9 against D5, V2, V6, V7: on one page (`devdocs/builtins.md`, A7 and V3 against D5, with A7 and V3 drafting different gloss sentences for `#Dimension rules`) and one passage (`devdocs/architecture.md#Definitions`, A9 no change against V2's change).
- Proposed call: owner settles §8's reading for devdocs ("dimensionless" only, or "plain number" as a gloss defined once), then one gloss sentence for `#Dimension rules`; the messages' wording is code (D5 L180).
- Related: Q-019, F-067
- Decision: Follows Q-019 (A, with the note): "dimensionless" and "plain number" are synonyms, each defined once per page, "plain number" wherever the code's rules and messages are quoted; one gloss sentence for `#Dimension rules`; the messages' wording is code.

#### F-461. "dimensionless checks" for the checks on the ball

- Type: terminology
- Units: D5 (L181)
- Where: `devdocs/builtins.md#The rules every built-in follows`, the "two parts" bullet (line 96)
- Term found: "dimensionless checks", a use of "dimensionless" §8 does not cover.
- Proposed canonical: D5: "the checks on the ball (the domain, the edges and the exact cases)".
- Against §8/§12: consistent (§8 and §12 q20 keep "dimensionless" for a plain scalar).
- Proposed call: follow §8 as D5 proposes.
- Decision: Stands (D5's wording).

#### F-462. "conform", "dimension mismatch", "kind mismatch"; "conformance tests"

- Type: terminology
- Units: A7 (L307-311), D1 (L64, L675), D5 (L187), V8 (L305, L318)
- Where: `docs/definitions.md#Expressions > + and -` ("quantities of the same thing", "the same test"); both quantity pages; code `dimensionMismatch`, `kindMismatch`; the messages ("differ in kind"); `devdocs/development.md#Commands` ("the edge sweeps, the conformance tests" for `pnpm test:sweep`)
- Term found: no canonical word in the docs section; the two failures unnamed in §8; "conformance" for a test suite.
- Proposed canonical: D1: **conform**, glossed once "quantities of the same thing", linked to `quantities.md`. A7: **dimension mismatch** and **kind mismatch** for the two failures, **conform** for the relation. D5: "kind mismatch", "the radian kind", "an angle", "a quantity of the radian kind" canonical as used (§12 q20). V8: "the edge sweeps" alone; the sweeps' name is V7's.
- Against §8/§12: consistent (§8 conform row; §12 q20); "dimension mismatch" and "kind mismatch" new; V8 removes a clash with §8's sense.
- Proposed call: follow §8; add "dimension mismatch" and "kind mismatch"; drop "conformance tests" for the sweeps.
- Related: Q-065
- Decision: Stands; follows Q-065 (ok: "the edge sweeps"); new §8 rows ("dimension mismatch", "kind mismatch").

#### F-463. A plain number's dimension written `1` in messages

- Type: terminology
- Units: A7 (L312-315)
- Where: the messages (`1 m + 0`: "1 m has dimension m, but 0 has dimension 1"); the dimension formatter
- Term found: `1` for the empty dimension.
- Proposed canonical: A7: consistent with the pages; the user docs gloss it once where such a message is quoted.
- Against §8/§12: new; fits §7's `quantities.md` "How dimensions are written in messages" and §12 q6 (messages catalogued by the tool, none hand-written).
- Proposed call: gloss `1` once in `quantities.md`'s section on how dimensions are written; nothing else.
- Decision: Stands.

#### F-464. "units" for a quantity's dimension

- Type: terminology
- Units: D6 (L218)
- Where: `docs/functions.md#(top)` bullets 7 and 8 ("its result has the argument's units", "`abs` keeps its argument's units")
- Term found: "units" for what a value carries.
- Proposed canonical: D6: **dimension**; a quantity carries no unit of its own (plan claim Q5).
- Against §8/§12: new to §8; consistent with Q5 and §7's "No unit of its own".
- Proposed call: add to §8: "dimension", never "units", for what a value carries.
- Decision: Stands; a new §8 row ("dimension", never "units", for what a value carries).

#### F-465. "base unit"

- Type: terminology
- Units: D2 (L455), D6 (L221)
- Where: `docs/definitions.md:78` (quotes the SI base units); `docs/functions.md#(top)` bullet 8 ("a quantity is stored in the base units")
- Term found: "base unit" for the primitives.
- Proposed canonical: D2: keep at `:78`, a quote of the SI. D6: **primitives** at bullet 8.
- Against §8/§12: consistent (§8 primitive row: "base unit" only when quoting the SI).
- Proposed call: follow §8 as D2 and D6 propose.
- Related: Q-060, B-060
- Decision: Stands (§8).

#### F-466. "kind" in "the section its kind belongs to"

- Type: terminology
- Units: D3 (L54, L330)
- Where: `devdocs/development.md:138-139` (`#Adding a unit`)
- Term found: "kind" in its ordinary sense.
- Proposed canonical: D3: "the section it belongs to"; "kind" is the quantity model's word.
- Against §8/§12: consistent (§8 kind row).
- Proposed call: follow D3.
- Decision: Stands (D3's wording).

#### F-467. Conversion into a function: "function conversion", "function want", "a function as the want"

- Type: terminology
- Units: A8 (L140), V2 (L289), V4 (L548, L560)
- Where: `devdocs/functions.md#Display`, `#A function as the want` (heading at `:522`; `:395`, `:578`, `:591-592`); `devdocs/architecture.md#Functions`, `#The converter and its lines`; `src/core/pipeline.ts:19-20` (cites the heading), `:264`
- Term found: "function conversion", "function want", "a function want's line", "a function as the want".
- Proposed canonical: A8: **conversion into a function** in both corpora; "want" stays the field and "the want side" the error's side. V2: the same (§8). V4: the term in prose; keep the heading "A function as the want", which names the want's form and which `src/core/pipeline.ts:19-20` cites, renaming it costing that comment and the plan's pointers (V4 Q3).
- Against §8/§12: consistent (§8 row; §12 q13).
- Proposed call: follow §8 in prose; the heading is V4 (Q-021)'s decision.
- Related: Q-021, F-033, F-314
- Decision: Stands; follows Q-021 (ok: the heading stays).

#### F-468. Output modes by ordinal ("the third output mode")

- Type: terminology · Flags: **conflict**
- Units: A8 (L139), V2 (L289)
- Where: `devdocs/architecture.md#Unit lists`, `#Functions` ("second output mode", "third output mode")
- Term found: output modes named by ordinal.
- Proposed canonical: A8: "output mode" stays the devdocs term for the four shapes of the answer, each named by its want (one unit, a unit list, a function, a blank want), never by an ordinal. V2: "the third output mode" may stay as the devdocs' count (its edit: "Conversion into a function is the third output mode").
- Against §8/§12: new.
- Conflict: A8 (L139) against V2 (L289) on the same page.
- Proposed call: add "output mode" to §8 (devdocs) and decide whether ordinals stay (V2) or go (A8).
- Related: F-033
- Decision: Follows its own answer (A): modes named by their want, never by an ordinal; "output mode" a devdocs term in §8. [decisions.md section 2; plan §12.1]

#### F-469. "a typed list" and "a defined list"

- Type: terminology
- Units: A8 (L141)
- Where: `devdocs/architecture.md#Unit lists`, `#The converter and its lines`; `src/core/pipeline.ts`
- Term found: "a list typed out", "typed list" against "a list from the table", "named list", "defined list".
- Proposed canonical: A8: **a typed list** (`ft;in`) and **a defined list** (`time`), the latter matching `docs/definitions.md`'s "A list can be defined under a name".
- Against §8/§12: new (§8 has "unit list" only).
- Proposed call: add to §8 as A8 proposes.
- Related: F-246
- Decision: Stands; new §8 rows.

#### F-470. "the other way round" for the reciprocal line

- Type: terminology
- Units: A8 (L135), D9 (L37, L302)
- Where: `docs/README.md#(top)` (twice, and "for the other way round"); `README.md#(top)`
- Term found: "the other way round".
- Proposed canonical: A8, D9: **the reciprocal line**, glossed "the conversion the other way round", applied in their drafts; D9 moves the examples to getting started.
- Against §8/§12: consistent (§8 reciprocal row).
- Proposed call: follow §8 (A8 and D9 both drafted `docs/README.md#(top)`; one draft is kept).
- Related: F-001, F-005
- Decision: Stands (§8).

#### F-471. Have and want: "the quantity to convert", "the unit to convert to"; the labels

- Type: terminology · Flags: **conflict**
- Units: A8 (L136; draft L113-121), D2 (L450), D9 (L80, L279-285, L309; draft L256-264)
- Where: `docs/definitions.md#The format`, `#Unit lists`, `#Functions`; the fields' labels "You have", "You want" (`src/unit-converter.ts:181-182`); `devdocs/architecture.md#The converter and its lines` (labels quoted in lower case)
- Term found: "the quantity to convert", "the unit to convert to"; "you have", "you want" in lower case.
- Proposed canonical: A8: **have** and **want**, applied now in its `#Unit lists` draft. D2: adopt once getting started introduces them; its `#The format` and `#Functions` drafts keep the current phrasing, so the change is made in one pass. D9: as §8; `docs/app.md`'s "The two fields" names the labels and the terms once ("these pages call them the have and the want"); devdocs quote the labels as written.
- Against §8/§12: consistent with the terms; §8 introduces them once in getting started, while D9's `app.md` draft introduces them too.
- Conflict: timing on one page (A8 now in `#Unit lists`; D2 later in the other two sections); where the terms are first introduced (§8: getting started; D9: `app.md`).
- Proposed call: change all of `docs/definitions.md` in one pass (D2) or section by section (A8), owner's call; getting started introduces the terms (§8), `app.md` names the labels.
- Related: F-180, F-256
- Decision: Follows its own answer (A): each page uses have and want from its own rewrite; getting started introduces them; `app.md` names the labels. [decisions.md section 2; plan §12.1]

#### F-472. "the converter" for the app, the fields and the outcome module

- Type: terminology
- Units: A8 (L142), D1 (L58, L219-237, L674), D9 (L303), V2 (L54, L71, L108-110, L290-291), V6 (L219)
- Where: `docs/definitions.md#(top)`, `#Expressions` (first sentence); `docs/README.md#(top)`, `README.md#(top)`; `devdocs/architecture.md#(top)` ("A unit converter inspired by GNU units, grown into an arbitrary-precision calculator"), `#The converter and its lines`; `devdocs/cost.md`; `src/core/pipeline.ts:95` ("the component" for `src/outcome.ts`)
- Term found: "the converter" or "a unit converter" for the app and for the fields; "the component" for the outcome module.
- Proposed canonical: D1: "the have and want fields", "the have", "the want"; "the converter" only for the two-field component. D9: Exucal; the calculator; the converter only for the component; the intros lead with the calculator. V2: "Exucal is an arbitrary-precision calculator with unit awareness and kind checking, in the lineage of GNU units"; "the converter" stays for the component. V6: no change (`cost.md`'s use is the component). A8: **the outcome** for `src/outcome.ts`, "the converter" for `<unit-converter>`.
- Against §8/§12: consistent (§8 product row; §12 q2, whose "not grounded on GNU units" governs `docs/`; V2's lineage clause is devdocs).
- Proposed call: follow §8 and §12 q2; add "the outcome" for `src/outcome.ts` (A8).
- Related: B-022, B-037, F-001
- Decision: Stands (§8, §12 q2); "the outcome" added for `src/outcome.ts`.

#### F-473. Expression words: juxtaposition, negation, literal

- Type: terminology
- Units: D1 (L676-678)
- Where: `docs/definitions.md#Expressions`; `devdocs/architecture.md#Expressions`
- Term found: "juxtaposition" unglossed; "negation", "unary minus", "`-` before a product"; "literal" (devdocs, code) against "number" (docs).
- Proposed canonical: D1: keep **juxtaposition**, glossed once "writing two factors side by side"; **negation**, glossed once "a `-` before a product"; **number** in docs, **literal** in devdocs, mapped once in the expression reference.
- Against §8/§12: juxtaposition consistent (§8); negation and number/literal new.
- Proposed call: follow §8 for juxtaposition; add negation and number/literal as D1 proposes.
- Related: F-090
- Decision: Stands; new §8 rows ("negation"; "number" in docs, "literal" in devdocs).

#### F-474. "a unit name", the parse messages' label for any name

- Type: terminology
- Units: D1 (L682)
- Where: `src/core/expr.ts:335`, `:348`, `:420`
- Term found: "a unit name" for every name, a function's in a call included.
- Proposed canonical: D1: docs say "name"; aligning the label to "a name" is a code change for the owner (D1 Q5).
- Against §8/§12: new.
- Proposed call: docs say "name" and quote messages as written; the label is D1 (Q-055)'s code question.
- Related: Q-055, B-019, F-089
- Decision: Stands; follows Q-055 (ok).

#### F-475. "the definitions file" and "system"

- Type: terminology · Flags: **conflict**
- Units: A9 (L282-285), D3 (L335)
- Where: `devdocs/architecture.md:166`, `:176` ("the system file", "system units", "a static definitions file"); `src/units.txt:1` ("the system unit definitions"); "system" for the SI, US customary and imperial
- Term found: "system" for the file and for systems of units.
- Proposed canonical: A9: **the definitions file** (§8), "system" kept only where the page contrasts it with user definitions. D3: **the definitions file** for the file, **system** only for a system of units.
- Against §8/§12: consistent on "the definitions file"; §8 itself writes "(the system one, `src/units.txt`) vs user definitions" and §12 q12 "today only the system file is loaded", the use D3 would rule out.
- Conflict: A9 (L282-285) against D3 (L335).
- Proposed call: decide whether "system" may qualify the file against user definitions (A9; §8 and §12 q12 do so) or only name systems of units (D3).
- Related: B-061
- Decision: Follows its own answer (a rule): "the definitions file", or "the predefined definitions file" where a user's definitions could be meant; never "the system file" or "system" alone; §8's row, §12 q12, §5 C50, §7, §10 and §11 amended; B-061 is the code side. [decisions.md section 2; plan §12.1] Extended on 2026-10-12 (plan §12.2, conflict 3): the table built from the file is "the definitions table", or "the table built from the definitions file", never "the system table" in prose; module and function names (`src/system-table.ts`, `buildSystemTable`) are quoted as they are.

#### F-476. "loaded" (docs) and "build" (devdocs)

- Type: terminology
- Units: D2 (L452)
- Where: `docs/definitions.md:125`, `:203`, `:278`, `:296` ("when the file is loaded", "fails to load"); `devdocs/architecture.md#Definitions`, `devdocs/functions.md#Build-time checks` ("build", "build error", "fails the build", `buildTable`)
- Term found: two words for when the file is checked.
- Proposed canonical: D2: **loaded** in docs (the file is read when the app starts), **build** in devdocs, mapped once in `devdocs/architecture.md#Definitions`.
- Against §8/§12: new. §7 names a `docs/definitions.md` section "Build-time checks", which D2's term would retitle (D2's draft heads its table "The file is rejected when" and leaves the heading to §7).
- Proposed call: add to §8 as D2 proposes, and retitle §7's "Build-time checks" for docs to match.
- Decision: Stands; a new §8 row ("loaded" in docs, "build" in devdocs, mapped once); §7's "Build-time checks" retitled for the docs page.

#### F-477. "head" of a function or inverse line

- Type: terminology
- Units: D2 (L453), V4 (L551)
- Where: `devdocs/functions.md#Definitions`, `#Names and shadowing`, `#Conditions`; `src/core/definitions.ts`
- Term found: "head", the part of the line before `=`.
- Proposed canonical: D2, V4: devdocs-only, glossed once at its first use.
- Against §8/§12: new.
- Proposed call: add to §8 (devdocs-only).
- Decision: Stands; a new §8 row (devdocs-only).

#### F-478. "user-defined functions" for the functions the file defines

- Type: terminology
- Units: D2 (L454), D9 (L308), V2 (L290), V4 (L547, L559)
- Where: `devdocs/functions.md:1` (title "User-defined functions"), `:650`, `:690`; `devdocs/README.md:23`; `devdocs/architecture.md:42`, `#(top)`, `#Definitions` ("user-supplied definitions"); `docs/README.md#(top)`; code `ResolvedFunction`'s `defined` (`src/core/table.ts:139-141`), `evaluate.ts`; plan §5 C40, §7.1 ("user functions")
- Term found: "user-defined function", "a user function", "user-supplied definitions" for the five functions the system file defines.
- Proposed canonical: D2: **defined function** (one the definitions file defines, system or user) against **built-in**; "user-defined" only for definitions a user types, which do not exist yet. V4: title "Defined functions", "a defined function" in prose, file name unchanged (V4 Q2). V2: "the functions the definitions file defines" or "defined functions"; "user definitions" only for ones a user enters. D9: "the functions the definitions file defines"; **user definitions** reserved (§12 q12).
- Against §8/§12: new; consistent with §12 q12; §5 C40 ("User-defined functions") and §7.1 ("user functions") use the wording the units retire.
- Proposed call: add to §8: "defined function" against "built-in"; "user definitions" only for the intended user-typed ones (§12 q12); the title is V4 (Q-020)'s.
- Related: Q-020, F-006, F-348
- Decision: Stands; follows Q-020 (ok: "Defined functions"); a new §8 row ("defined function" against "built-in"; "user definitions" only for the intended user-typed ones, which are `devdocs/future.md`'s by Q-011); §5 C40 and §7.1 amended.

#### F-479. "the unit it takes" as the gloss of "annotation"

- Type: terminology
- Units: D2 (L457)
- Where: `docs/definitions.md:282`; `devdocs/functions.md:643`
- Term found: "the unit it takes".
- Proposed canonical: D2: **annotation**, with "the unit it takes" as its gloss.
- Against §8/§12: consistent (§8 annotation row), keeping the synonym as the gloss.
- Proposed call: follow §8, with D2's gloss.
- Decision: Stands (§8, with D2's gloss).

#### F-480. A condition's outcome: undecided, holds, fails, verdict, assumed, "certainly"

- Type: terminology
- Units: A6 (L406-407), D2 (L262-264, L451), V4 (L549)
- Where: `devdocs/functions.md#The check at a call`, `#An undecided condition`, `#A function as the want`; `docs/definitions.md#Functions` (`:266`, `:275`, `:278`: "cannot be decided"); code `decide`, `Verdict` (`evaluate.ts`)
- Term found: "assumption"/"assumed"; "verdict"; "cannot be decided"; "certainly holds", "certainly fails", "certain failure", "a value certainly other than the `have`".
- Proposed canonical: A6: **undecided condition** for the state, **assumed** for what the value then does; "assumption" and "verdict" devdocs-only; docs say the condition holds, fails or cannot be decided. D2: name "undecided" once ("then the condition is undecided"), plain phrasing after. V4: the verdict words **holds**, **fails**, **undecided**, with "certainly" as their gloss, never "certain" of digits.
- Against §8/§12: consistent (§8: docs "undecided" for conditions; §12 q8 keeps "certified" for digits on the ball, not verdicts).
- Proposed call: follow §8: docs name "undecided" once (D2), then plain words; "verdict" and "assumption" devdocs-only.
- Related: Q-090, F-098
- Decision: Stands (§8).

#### F-481. "its own domain", "a restriction" for conditions

- Type: terminology
- Units: V4 (L284-286, L550, L552)
- Where: `devdocs/functions.md:460` ("its own domain", of an inverse's conditions), `:407` ("a restriction")
- Term found: "domain" and "restriction" for conditions.
- Proposed canonical: V4: "its own conditions"; "restricts" as the verb only ("a condition restricts a body").
- Against §8/§12: consistent (§8: condition; "domain" reserved for built-ins).
- Proposed call: follow §8 as V4 proposes.
- Decision: Stands (§8).

#### F-482. A call as "the body typed out in its place"

- Type: terminology
- Units: D8 (L302)
- Where: `docs/definitions.md:309-310`, `:317`; plan N17
- Term found: "a shorthand for its body", "the body typed out in its place", "the expanded expression".
- Proposed canonical: D8: **as the body typed out in its place** in docs; "expanded" devdocs-only.
- Against §8/§12: new.
- Proposed call: add to §8 as D8 proposes.
- Related: F-033
- Decision: Stands; a new §8 row.

#### F-483. "intervals" for the temperature units; "interval" elsewhere

- Type: terminology · Flags: **conflict**
- Units: A9 (L189-195, L277-281), D2 (L456), D3 (L329), V4 (L554)
- Where: `docs/definitions.md:48`; `src/units.txt:185-188` (comment); `src/units.test.ts:289`, `:463-465` (test names and comments); `devdocs/functions.md:265`, `:818` ("interval" bounded by a chain)
- Term found: "intervals" for `degC`, `degF`, `degR`; "interval" in the mathematical sense.
- Proposed canonical: A9, D3: **temperature difference** (§12 q19), the page fixed in their edits, the comment and test names a code change; D3: "interval" stays devdocs-only, for a ball. D2: the tests are a code change. V4: the mathematical "interval" of a chain kept in devdocs.
- Against §8/§12: consistent with §12 q19 and §8 ("interval" devdocs-only).
- Conflict: D2's `docs/definitions.md#The format` draft writes "a chain that bounds an interval, `0 < x < 1`" (D2 L230) in docs, against §8's devdocs-only "interval".
- Proposed call: follow §12 q19; decide whether the mathematical "interval" may appear in docs (D2's draft) or not (§8).
- Related: Q-060, B-059, F-069, F-114
- Decision: Follows its own answer (A): "interval" never in the docs; D2's draft reworded. [decisions.md section 2; plan §12.1]

#### F-484. Names of units: alias, spelling, symbol, name; pair and split

- Type: terminology
- Units: A9 (L286-289), D3 (L333-334)
- Where: `docs/definitions.md:117` ("alias"), `:124` ("two different prefix-unit pairs"); `devdocs/architecture.md:295` ("splits"); `Split` (`src/core/names.ts:33`); `src/units.txt:28`, `:122` ("symbol", "name")
- Term found: words for the names a unit or prefix has and how a name divides.
- Proposed canonical: D3: **alias** for a unit defined as another's bare name (`metre  m`); **spelling** for one name in another script or convention (`µ`, `μ`, `u`; `deca-`, `deka-`); **symbol** and **name** kept, as the SI uses them. A9: **pair** in docs, **split** in devdocs (the code's word).
- Against §8/§12: new.
- Proposed call: add to §8 as D3 and A9 propose.
- Decision: Stands; new §8 rows.

#### F-485. "logarithmic units"

- Type: terminology
- Units: D3 (L331)
- Where: `docs/definitions.md:51`; `src/units.txt:212`; §7's "Logarithmic levels"
- Term found: "logarithmic units" for `neper`, `bel`, `decibel`.
- Proposed canonical: D3: **the logarithmic functions** for the names, **level** for what a call denotes; "logarithmic units" only when quoting the SI brochure.
- Against §8/§12: new; consistent with §7 ("Logarithmic levels").
- Proposed call: add to §8 as D3 proposes.
- Decision: Stands; a new §8 row.

#### F-486. "defined" and "measured" factors

- Type: terminology
- Units: D3 (L336)
- Where: none cited (the factors of `src/units.txt`; `docs/units.md` "Which factors are exact")
- Term found: "defined" and "measured" for a factor.
- Proposed canonical: D3: **defined** when a document fixes it, **measured** when it is a CODATA or astronomical value, both written exactly.
- Against §8/§12: new.
- Proposed call: add to §8 as D3 proposes.
- Decision: Stands; a new §8 row.

#### F-487. Built-in reference words: pole; order, argument, parameters

- Type: terminology
- Units: D7 (L238, L242)
- Where: both corpora and the messages (`src/messages.ts:250`, `:415`); the incomplete functions' pages and modules
- Term found: "pole" ("is a pole of `beta`", "a pole of the function"); "order" (`s`), "argument" (`x`), "parameters" (`a`, `b`).
- Proposed canonical: D7: **pole** in both corpora, "a pole of the function" as the edge's wording; **order**, **argument**, **parameters** as the names in the generated reference's signature field.
- Against §8/§12: new; consistent with §12 q17 (generated reference).
- Proposed call: add to §8 as D7 proposes.
- Decision: Stands; new §8 rows.

#### F-488. "sheet" and "panel"

- Type: terminology · Flags: **conflict**
- Units: D4 (L395), D9 (L305), V5 (L229), V7 (L316)
- Where: `docs/settings.md:3-7`, `:67`, `:92`, `:117`, `:175`; `devdocs/settings.md` (throughout); `devdocs/architecture.md#The shell and its parts`; `devdocs/testing.md#The UI` ("The shell and the panel"); `devdocs/benchmarks.md#The harness` ("the panel's settings"); `src/settings-panel.ts`
- Term found: "sheet" and "panel" for one surface.
- Proposed canonical: D4: **the settings sheet** (or "the sheet") in docs; **the panel** in devdocs for the component, mapped once. V5: **sheet** for what the user opens; **panel** only for the component that renders it, said once. D9: **the settings sheet** in both corpora; "panel" only as `<settings-panel>`. V7: **the sheet**; "panel" only in the file name `settings-panel.ts`.
- Against §8/§12: new to §8; §5 C56 and §12 q3 say "sheet", while §12 q15 writes "the panel's 'width'".
- Conflict: whether devdocs prose may call the component "the panel" (D4, V5) or name it only by its code identifier (D9, V7).
- Proposed call: add to §8: "the settings sheet" in both corpora for what the user sees; "panel" for the component only, in the form the owner picks.
- Decision: Follows its own answer (a rule): "the settings panel", or "the panel", in both corpora; never "sheet"; §8, §5 C56, §3, §6.5, §7, §9.1, §11 and §12 q3 amended; `devdocs/settings.md`'s heading "The sheet" is renamed by its session. [decisions.md section 2; plan §12.1]

#### F-489. "line", `hint`, `notice`; "the guide"

- Type: terminology
- Units: V5 (L230-231)
- Where: `devdocs/settings.md#The controls`, `#Applying a change`; `src/settings-panel.ts:685-699`, `:716`
- Term found: "line" against the code's `hint` and `notice` classes; "the guide", "the user's guide", "docs/settings.md".
- Proposed canonical: V5: **line** in the pages, mapped once to the two classes; name the page, `docs/settings.md`, and "the user guide" for the corpus.
- Against §8/§12: new; §7 uses "guide" as a page role (getting started, `app.md`) and the plan says "user docs" for the corpus.
- Proposed call: add "line" as V5 proposes; for the corpus, choose between the plan's "user docs" and V5's "the user guide".
- Decision: Follows its own answer (A): "the user docs"; "line" joins §8. [decisions.md section 2; plan §12.1]

#### F-490. "locked to the display digits" and "not extended"

- Type: terminology
- Units: D4 (L396)
- Where: `docs/settings.md` (`> Working digits`); `src/settings-lines.ts:104` (the sheet's reset); the stored `digits` kind
- Term found: three names for the working digits' default.
- Proposed canonical: D4: **locked to the display digits** in docs, with "(the `extended` box unchecked)" once; the stored names stay in devdocs.
- Against §8/§12: new.
- Proposed call: add to §8 as D4 proposes.
- Decision: Stands; a new §8 row.

#### F-491. "the costliest built-ins" for the probe's composite

- Type: terminology · Flags: **low confidence**
- Units: D4 (L398)
- Where: `docs/settings.md:176-177`; `PROBE_LINE` (`src/settings-lines.ts:188`, "the costliest operations")
- Term found: "the costliest built-ins", "the costliest operations".
- Proposed canonical: D4: **the four costliest elementary functions** in docs; the sheet's line is D4 Q1.
- Against §8/§12: consistent with §12 q23, which calls "the costliest built-ins" incorrect; §9.4 describes the composite as "the four elementary routines, deliberately not the costlier special functions". D4's wording still ranks them "costliest", which D5 could not verify ("The four costliest routines" is a benchmark claim, D5 (F-278)).
- Proposed call: follow §12 q23; confirm the ranking against the benchmarks before keeping "costliest", or say "the four elementary functions" (§9.4).
- Related: B-017, F-128, F-278, F-512
- Decision: Follows its own answer (ok): "the four elementary functions", never "the costliest"; `PROBE_LINE` worded so with Q-006's code change; the owner's note is recorded in the owner's words, not as a decision (plan §12.3, R-6): no plan to extend the probe to the expensive special functions; keeping the interface responsive during long computations is the scheduler's work (#118). [decisions.md section 2; plan §12.1]

#### F-492. "build number" and "build ID"

- Type: terminology · Flags: **conflict**
- Units: D9 (L42, L79, L273-275, L301, L325), V8 (L253-258, L301, L313)
- Where: `docs/settings.md:184`, `:189` ("Tapping the build number"); `devdocs/architecture.md#The shell and its parts` (`:936`); `devdocs/offline.md#Offline behavior` (`:44`), `#Build ID`; `src/build-id.ts` (`BUILD_ID`, `shortBuildId`); the footer's label "Build"; plan §5 C57; §7's `docs/app.md` section "Updates and the build number"
- Term found: "build number" for a commit hash shown shortened after "Build" in the footer.
- Proposed canonical: D9: **build ID** everywhere, never a number; its `docs/app.md` draft heads a section "Updates and the build ID". V8: **build ID** in both corpora; **the build** where the footer is quoted; its `offline.md` edit says "Tapping the build in the footer" and links `app.md`'s "Working offline" and "Updates and the build" (V8 Q3).
- Against §8/§12: new; changes §5 C57's docs term and §7's `app.md` heading.
- Conflict: what the tapped footer item is called ("its build ID is tapped", D9 L273-275, against "Tapping the build", V8 L257), and the `app.md` section names the drafts use (D9's page: "Offline use", "Updates and the build ID"; V8's links: "Working offline", "Updates and the build").
- Proposed call: add "build ID" to §8; settle the footer item's name and the `app.md` headings once, then align D9's page and V8's links.
- Related: Q-022, F-173, F-174, F-175, F-180, F-251
- Decision: Follows Q-022 (A): "build ID" in both corpora; the footer item is "the build ID" and the `app.md` section "Updates and the build ID"; D9's page and V8's links aligned; a new §8 row.

#### F-493. "service worker" and "the worker"

- Type: terminology · Flags: **conflict**
- Units: D9 (L306), V8 (L302)
- Where: `devdocs/offline.md`; `docs/settings.md:190` ("service workers"); `src/app-footer.ts` ("worker failed", "worker …")
- Term found: "service worker", "the worker".
- Proposed canonical: D9: docs **service worker**, named once in `app.md` as the browser's mechanism for the offline copy, then "the service worker"; footer words quoted as written; devdocs keep "the worker". V8: devdocs **service worker**, then **the worker**; docs name it once in `app.md` ("through a service worker"), otherwise **the app** or **its copy**.
- Against §8/§12: new.
- Conflict: the docs' wording after the first mention ("the service worker", D9, against "the app" or "its copy", V8).
- Proposed call: add to §8: named once in `app.md`; owner picks the follow-on wording.
- Decision: Follows its own answer: the docs name the service worker as such, once in `app.md` where it is introduced as what lets the app be served offline, and keep the term; devdocs "service worker" consistently. A new §8 row. [decisions.md section 2; plan §12.1]

#### F-494. "a new version", "an update", "a deploy"

- Type: terminology · Flags: **conflict**
- Units: D9 (L307), V8 (L303)
- Where: `docs/settings.md:184-188`; `devdocs/offline.md#Offline behavior`; `src/app-footer.ts` ("update to …")
- Term found: three words for what is deployed and the switch to it.
- Proposed canonical: D9: docs **a new version**; "update" only as the footer's word; "deploy" devdocs-only. V8: docs **a new version** for what is deployed and **update** for the footer's link and the act of switching; devdocs keep both as the code does.
- Against §8/§12: new.
- Conflict: whether docs use "update" for the act of switching (V8) or only quote the footer (D9).
- Proposed call: add "a new version" (docs) to §8 and settle "update" between D9 and V8.
- Decision: Follows its own answer (B, clarified): "a new version" is a new deployment that could be pulled; "update" always a verb for what a user or a page refresh does; "deploy" devdocs-only. A new §8 row. [decisions.md section 2; plan §12.1] Confirmed on 2026-10-13 (plan §12.3, R-8): headings and labels keep the noun ("Updates and the build ID", "Update checks"); prose follows the rule.

#### F-495. App-surface words: the cog, the checks the app makes on its own, install

- Type: terminology
- Units: D9 (L304, L310, L311)
- Where: `docs/settings.md#(top)`; `devdocs/architecture.md#The shell and its parts`; `src/settings-button.ts`; `docs/README.md#(top)`; `devdocs/offline.md`
- Term found: "cog" against "settings button"; "the app's own checks"; "installed to the home screen", "installation".
- Proposed canonical: D9: **the cog** in docs, `<settings-button>` devdocs-only; "the checks the app makes on its own" (on view, on line, periodic), in `app.md`; **install**, **installed to the home screen**, "progressive web app (PWA)" expanded once per page.
- Against §8/§12: new; consistent with §5 C56 ("cog").
- Proposed call: add to §8 as D9 proposes.
- Decision: Stands; new §8 rows; "the cog" opens the settings panel (F-488).

#### F-496. Deployment words in devdocs: precache, Preview, cloud session

- Type: terminology
- Units: V8 (L304, L306-307)
- Where: `devdocs/offline.md`, `devdocs/security.md` (precache); `devdocs/deployment.md`, `wrangler.jsonc` (Preview); `devdocs/development.md#Prerequisites`, `#Cloud environment`, `scripts/cloud-setup.sh:3`, `.claude/hooks/session-start.sh:3` (cloud session)
- Term found: "precache" as noun, verb, plugin and cache; "Preview(s)"; "Sessions of Claude Code on the web", "a Claude Code cloud session", "the cloud".
- Proposed canonical: V8: "precache" kept, devdocs-only, docs saying **the copy** the browser keeps; "Preview" kept, capitalized, Cloudflare's term; **cloud session**, named in full once per page.
- Against §8/§12: new.
- Proposed call: add to §8 as V8 proposes.
- Decision: Stands; new §8 rows.

#### F-497. The stress catalogue's vocabulary and "hang"

- Type: terminology
- Units: V6 (L213, L215-216, L218), V7 (L317)
- Where: `devdocs/cost.md`; `devdocs/future.md` ("freeze it for seconds or hang it"); `devdocs/benchmarks.md`; `bench/stress/catalogue.ts`, `cases.ts`
- Term found: "hang" in two senses; "profile", "fractions profile"; "case", "family", "entry", "hit", "lane", "floor", "deadline", "cold", "warm", "typing", defined only in passing.
- Proposed canonical: V6: **hang** for the catalogue's case only, the interface **freezes**; **settings profile** on first use, then "profile"; `fractions` in code font, glossed the ratio-notation profile; the five catalogue terms defined in one sentence at the top of `#How a case is measured`; never "row" for an entry. V7: the stress words kept, devdocs-only, as the code names them.
- Against §8/§12: new; devdocs-only; V6's gloss follows §8's "ratio notation".
- Proposed call: add to §8 as devdocs-only, as V6 and V7 propose.
- Decision: Stands; new §8 rows (devdocs-only).

#### F-498. "reached only through" for a module only tests exercise

- Type: terminology
- Units: V7 (L50, L64, L188, L318)
- Where: `devdocs/layout.md#The files`; `devdocs/testing.md#(top)`; `src/core/fixed-incbeta.ts` (imported only by `src/core/builtins/incbeta.ts:71`)
- Term found: "reached only through", which reads as an import path.
- Proposed canonical: V7: **exercised only through**.
- Against §8/§12: new (wording).
- Proposed call: apply V7's wording.
- Decision: Stands (V7's wording).

#### F-499. "the display's `show` and `roundTerms`"

- Type: terminology
- Units: V2 (L292)
- Where: `devdocs/architecture.md#The converter and its lines`
- Term found: `roundTerms` attributed to the display.
- Proposed canonical: V2: "`show` of `display.ts` and `roundTerms` of `convert.ts`".
- Against §8/§12: not a §8 matter; a misattribution, corrected in V2's contradiction finding.
- Proposed call: apply with V2's correction of the passage.
- Related: F-253, F-254
- Decision: Stands (with F-254).

## The audit plan itself

16 findings (F-500 to F-515).

### Findings

#### F-500. §2.1.3 and §2.2.3 miss the two grammars in module headers

- Type: plan
- Units: D1 (L203, L688, L700), D2 (L39, L134, L272-274, L471)
- Where: plan §2.1.3; plan §2.2.3
- Plan location: `audit/plan/02-the-two-languages.md:57-67` (§2.1.3: "No grammar file exists … The grammar lives as code …"; "No EBNF for expressions appears anywhere"); `:149-154` (§2.2.3: "A grammar block exists for the function and inverse heads only … The line-level grammar … is prose")
- Finding: `src/core/expr.ts:6-19` holds an EBNF-style grammar of twelve productions that matches the combinators of `:379-529` production by production (D1 report), and `src/core/definitions.ts:20-32` (D1; D2 cites `:19-32`) holds the whole line grammar, every kind of definition included, of which the block in `devdocs/functions.md#Definitions` is the function and inverse part (D2). Both are hand-maintained beside the code, "the second source of truth §2.1.3 advises the docs against" (D1). §11's "no grammar file" stays true: these are header comments.
- Proposed call: Correct both sections to name the two header grammars as the hand-maintained forms until the DSL generates one; the interim decision (no hand-written EBNF in `docs/`) stands. Whether pages point at them is D1's question 1; D2's and V4's edits already name the `definitions.ts` comment.
- Related: Q-038, F-074, F-092, F-229, F-305
- Decision: Stands; follows Q-038 (ok): §2.1.3 and §2.2.3 corrected to name the two header grammars as the hand-maintained forms.

#### F-501. §2.1.3: "the two cannot disagree" holds for binary operators only

- Type: plan
- Units: D1 (L204)
- Where: plan §2.1.3
- Plan location: `audit/plan/02-the-two-languages.md:58-62` ("with the printer in `src/core/print.ts` driven by the same table so 'the two cannot disagree'")
- Finding: The same overstatement as `devdocs/architecture.md#Expressions` (D1 (F-237)): `LEVELS` and `BINARY` drive the parser and the printer for the binary operators only; the property test (`src/core/print.test.ts:134-151`) covers the rest.
- Proposed call: Amend the bullet: shared data for the binary operators, the property test for the rest; the §1.3 DSL intent is unchanged.
- Related: F-237
- Decision: Stands: §2.1.3 amended (shared data for the binary operators; the property test for the rest).

#### F-502. §7 units.md skeleton lists `e` and `at` as absent names

- Type: plan
- Units: D3 (L89, L344, L349), D1 (L694, L700)
- Where: plan §7 (`docs/units.md` skeleton)
- Plan location: `audit/plan/07-docs-outline.md:113` ("Names deliberately absent (`u`, `at`, `dB`, `e`)")
- Finding: `e` is defined and tested as the elementary charge (`src/units.txt:113`; `src/units.test.ts:398-399`); what is absent is a name for Euler's number, which is `exp(1)`. `at` is absent as the technical atmosphere but reads today as `a` + `t`, an attotonne (D3's scratch run; D1). D1 adds that the file has no unit `a` (the are is `are`).
- Proposed call: The skeleton bullet becomes "Names that are absent or mean something else (`u`, `at`, `dB`, `e`, `rad`)" (D3 question 5); the units guide notes `a` and `at` as D1 proposes (question 7).
- Related: Q-075, F-112
- Decision: Stands; follows Q-075 (ok) as amended by F-078 (nothing about a unit `a`): §7's bullet corrected.

#### F-503. §11 places `MIN_SIGNIFICAND_LIMIT_BITS` in `rational.ts`

- Type: plan
- Units: V7 (L155, L328)
- Where: plan §11
- Plan location: `audit/plan/11-surface-files.md:63-65` ("`src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`, `MIN_SIGNIFICAND_LIMIT_BITS`)")
- Finding: `MIN_SIGNIFICAND_LIMIT_BITS` is defined in `src/core/context.ts:269`, derived from `ceilingFor(1)`; `rational.ts` holds only `MAX_SIGNIFICAND_LIMIT_BITS`. V5 read it in `context.ts` as well. "A note for the plan, not the pages."
- Proposed call: Correct the row: `rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`), `context.ts` (`MIN_SIGNIFICAND_LIMIT_BITS`), `scaled.ts` (`MAX_EXPONENT`).
- Related: Q-076
- Decision: Stands; follows Q-076 (ok): §11 corrected.

#### F-504. §9.2 wrongly lists `layout.md#The files` as re-explaining docs

- Type: plan
- Units: V7 (L159, L167, L329)
- Where: plan §9.2
- Plan location: `audit/plan/09-structural-observations.md:64-69` (the bullet "devdocs → docs exist but do not 'build on' docs")
- Finding: `layout.md`'s bullet for `src/units.txt` is one sentence and a link and explains nothing beyond naming the file; it is V7's one refuted gap. V7's notes also list the §11 and module-list errors drafted in their own findings.
- Proposed call: Strike `devdocs/layout.md#The files` from the bullet (V7 question 8).
- Related: Q-077, F-366
- Decision: Stands; follows Q-077 (ok): §9.2 corrected.

#### F-505. §1.2.4: `outcome.ts` does not parse the `want` again

- Type: plan · Flags: **conflict**
- Units: A2 (L67, L149), V2 (L91, L303)
- Where: plan §1.2.4; plan §5 (C1, C4)
- Plan location: `audit/plan/01-core-abstractions.md:628-629` ("The reciprocal as a view in the component, `outcome.ts`' parsing of the `want` again: `devdocs/architecture.md#The converter and its lines`"); `audit/plan/05-concept-inventory.md:19-21` (C1), `:50-51` (C4)
- Finding: The `Conversion` carries the parsed `have` and `want` (`haveExpr`, `wantExpr`, `src/core/pipeline.ts:221-223`), the outcome writes them (`src/outcome.ts:328-334`) and decides the `×` form from the tree (`:470-482`); only a blank `want` re-parses the `have` (`:272`, `:379-384`) (V2; A2 cites `src/core/pipeline.ts:215-262`, `src/outcome.ts:380-384`). Read at consolidation, §5's C1 and C4 only point at the converter section, which states the re-parse; they do not name it, so V2's "the §5 entries … name" it overstates. The same §1.2.4 bullet's "reciprocal as a view in the component" repeats the page sentence A8 corrects (the reciprocal lives in `src/outcome.ts`, A8 (F-255)).
- Conflict: A2 refers the correction to the plan (question 6, L149); V2 proposes no change to the plan, the report recording it (question 6, L303).
- Proposed call: Correct §1.2.4's bullet to the current mechanism (the reciprocal line in `outcome.ts`; the parsed `have` and `want` handed over in the `Conversion`); C1 and C4 need no change once the page is fixed.
- Related: Q-074, F-253, F-255
- Decision: Stands; follows Q-074 (ok): §1.2.4 corrected.

#### F-506. §1.1.6 item 1 points at `messages.ts` for the notes

- Type: plan
- Units: A2 (L63, L149, L156)
- Where: plan §1.1.6 (item 1)
- Plan location: `audit/plan/01-core-abstractions.md:373-374` ("the exact wording of the three notes and the uncertified note (`display.ts`, `outcome.ts`, `messages.ts`)")
- Finding: The notes are worded in `noteOf` (`src/outcome.ts:504-517`): "N of M digits are certain", "within B of zero", "the digits are not certified", "a step could not be certified at the precision limit". `src/messages.ts` words none of them, only the warnings of an assumed condition (`describeAssumption`, called at `src/outcome.ts:232`). The item lists `messages.ts` beside `outcome.ts`; A2 reads it as naming `messages.ts` for the notes. A2's notes also record its other slips, drafted in the module-list and scope findings.
- Proposed call: Name `outcome.ts` (`noteOf`) for the notes and `messages.ts` for the assumption warnings only; low stakes, the unit has run.
- Related: Q-074
- Decision: Stands; follows Q-074 (ok): §1.1.6 item 1 corrected.

#### F-507. §5 C4 cites a `#92` link that `numbers.md` does not have

- Type: plan
- Units: A8 (L147), V2 (L301), V1 (L134-149)
- Where: plan §5 (C4)
- Plan location: `audit/plan/05-concept-inventory.md:51-52` ("`numbers.md#Working precision and the schedule` ("outside the loop", #92)")
- Finding: The passage (`devdocs/numbers.md:896-898`, read at consolidation) says the reciprocal line is one step outside the loop and points at `architecture.md` "The converter and its lines", with no issue link; #92 is linked only from `devdocs/architecture.md#The converter and its lines > The reciprocal` (`:1100`). A8 (question 2) and V2 (question 4) took C4's parenthetical for a second #92 link and asked the `numbers.md` unit to remove it; V1's inventory of the page's links has no #92, so V2's hand-off to V1 is moot.
- Proposed call: Drop "#92" from C4's `numbers.md` pointer; #92's one home is `architecture.md` "The reciprocal", as A8 and V2 both propose.
- Related: Q-103, F-412
- Decision: Stands; follows Q-103 (ok): C4's pointer corrected.

#### F-508. Claim N8: "four times the precision limit plus ten" is ambiguous

- Type: plan
- Units: A3 (L149, L153)
- Where: plan §1.1.1 (N8)
- Plan location: `audit/plan/01-core-abstractions.md:72-78` (N8: "up to a ceiling of four times the precision limit plus ten")
- Finding: The phrase reads as `4L + 10`; the ceiling is `4 × (L + 10)` (`ceilingFor`; the schedule test's expected lists, `src/core/pipeline.test.ts:222-245`), as §1.1.2 (`:253`) and §1.1.6 item 4 (`:380`) write it. N8 carries the pages' wording, so a unit that checked the pages against the claim alone would miss the fault.
- Proposed call: Amend N8 to "a ceiling of four times the sum of the precision limit and ten, `4 × (L + 10)`" when the claims are updated (A3 question 9); the pages' fix is drafted with the pages.
- Related: Q-005, Q-073, B-041, F-022, F-026, F-125
- Decision: Stands; follows Q-073 (ok): N8 amended.

#### F-509. §1.1.5 `tooLarge` row withdrawn, against the owner's review statement

- Type: plan · Flags: **conflict**
- Units: A5 (L49-50, L67, L73), V1 (L22, L43), V6 (L26, L108, L229, L234)
- Where: plan §1.1.5 (`tooLarge` row)
- Plan location: `audit/plan/01-core-abstractions.md:366` (row on `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule`: "update … per the owner's review there are classes of `tooLarge`, some of which are retried")
- Finding: A5 finds `tooLarge` one error kind (`src/core/rational.ts:96`), its classes being its reach (`fits`/`exceeds`) and its need (`exact`/`bound`/`unknown`), as `devdocs/numbers.md:1376-1398` describes; `resolve` retries no `tooLarge` (`src/core/pipeline.ts:353-356`), and any `tooLarge` ends the loop, with the best earlier result when a pass produced one: "the plan's 'some of which the retry loop retries' is not in the code" (A5 (F-051)). A5 and V1 withdraw the row rather than tag it (counted in none of the three tags). V6 finds that any refusal the loop does not retry ends it with the best result so far (`src/core/pipeline.ts:325-327`; the catalogue's `extreme` entry stops at the eleventh of fifteen passes) and asks V1 to name, in this row, which refusals end the loop with a result and which with the error; V1, running alongside V6, does not take it up.
- Conflict: A5 (L49-50) and V1 (L22, L43) withdraw the row; V6 (L229) keeps it, revised to name the refusals that end the loop with a result. Both readings contradict the row's report of the owner's review ("some of which are retried"), so the withdrawal needs the owner's confirmation.
- Proposed call: Owner to confirm A5's reading against the review statement; if confirmed, mark the row withdrawn, amend N21 and §1.1.6 item 14 (A5 (F-056, F-051)), and carry V6's point in the N7 correction (V6 (F-034)) rather than in this row.
- Related: Q-001, F-034, F-051, F-056
- Decision: Follows Q-001: the row is withdrawn, N21 and §1.1.6 item 14 amended, and V6's point (which refusals end the loop with a result) carried in N7's correction (F-034).

#### F-510. "Measurements kept" (§10 V3, q10) against §12 question 25

- Type: plan
- Units: V3 (L756, L764), V1 (L361, L370), V7 (L326), A5 (L487-492)
- Where: plan §10 (V3 entry); plan §12 (questions 10 and 25); plan §1.1.4; plan §9.1
- Plan location: `audit/plan/10-audit-units.md:235-236` (V3: "the algorithms, bounds and measurements kept"); `audit/plan/12-open-questions.md:66-71` (question 10: "`devdocs/numbers.md` owns the table and the measurements") against `:129-131` (question 25: "concrete timings leave the pages wherever reasonable"); `audit/plan/01-core-abstractions.md:320-322` and `audit/plan/09-structural-observations.md:11-13` ("the scratch-build measurements")
- Finding: V3 calls its entry's "measurements kept" "the one conflict inside the plan" and follows question 25: timings leave for `cost.md` and the benchmarks, while bit counts, term and convergent counts, limits and memory sizes stay as bounds and characteristics (its question 3). V1 notes the same tension between questions 10 and 25 for `devdocs/numbers.md#Why the exponent bound stays at 10^18`, keeping the six-pass table (digits) and dropping the timings (its question 2); A5 proposes the same (its question 5). V7 says how far question 25 reaches on pages about measuring shapes most of its proposed text (its question 5).
- Proposed call: Owner to confirm that question 25 governs "measurements" in question 10, §1.1.4, §9.1 and §10's V3 entry (timings go; tables of digits and counts stay, as V1, V3 and A5 read it), then reword those four places.
- Related: Q-016, Q-017
- Decision: Follows Q-016 (A, with the note) and Q-017: question 25 governs "measurements" in question 10, §1.1.4, §9.1 and §10's V3 entry, which are reworded: the six-pass table (digits) stays; timings go unless kept as rough, illustrative figures that add weight.

#### F-511. Pointer `devdocs/notation.md#The width` names a label, not a heading

- Type: plan
- Units: D4 (L6, L414)
- Where: plan §1.1.4; plan §1.1.5; plan §3; plan §5; plan §6.5; plan §10 (D4 entry)
- Plan location: `audit/plan/01-core-abstractions.md:337`, `:363`; `audit/plan/03-settings.md:15`; `audit/plan/05-concept-inventory.md:497`; `audit/plan/06-coverage-gaps.md:161`; `audit/plan/10-audit-units.md:137`
- Finding: "The width" is a bold paragraph label under `## The rule` (`devdocs/notation.md:113`), not a heading, so the pointer should read `devdocs/notation.md#The rule > The width`. D4 found it in its own entry; the other five occurrences come from the consolidation's search of the plan. D4's notes also list the §9.4, module-list and context corrections drafted separately.
- Proposed call: Correct the six pointers; D4's stale row already uses the corrected form (D4 (F-327)).
- Related: F-327
- Decision: Stands: the six pointers corrected to `devdocs/notation.md#The rule > The width`.

#### F-512. §9.4 places "the costliest built-ins" in the Probe budget bullet

- Type: plan
- Units: D4 (L57, L414)
- Where: plan §9.4
- Plan location: `audit/plan/09-structural-observations.md:110` (row "`docs/settings.md#(top) > Probe budget` and 'The limits are set top-down'")
- Finding: The phrase occurs only in the "top-down" paragraph (`docs/settings.md:175-177`); the Probe budget bullet (`:160`) does not carry it.
- Proposed call: Correct the row's location to the "top-down" paragraph alone; D4's stale row is placed there.
- Related: F-128
- Decision: Stands: §9.4's row relocated to the "top-down" paragraph; its wording follows F-491.

#### F-513. §7.1 still offers `getting-started.md` for the app's surface

- Type: plan
- Units: D9 (L32, L61, L97, L325)
- Where: plan §7.1
- Plan location: `audit/plan/07-docs-outline.md:180` (row "The app's surface | `app.md` or `getting-started.md`")
- Finding: §12 questions 3 and 22 decide `docs/app.md`, and §7's own page list has it; D9 confirms that the row resolves to `app.md`, getting started linking to it ("Where to go next"). D9's notes also confirm §9.4's "six settings" row and record its module-list gap (next finding).
- Proposed call: The row reads `app.md`.
- Related: F-180
- Decision: Stands: §7.1's row reads `app.md`.

#### F-514. §10 module lists fall short of what the claims needed

- Type: plan
- Units: A1 (L325-331), A2 (L156), A3 (L153), A4 (L141), A5 (L496-499), A6 (L441-450), A7 (L346-354), A8 (L154), A9 (L344-349), D1 (L105, L700), D2 (L471), D4 (L8, L414), D5 (L204), D6 (L242), D7 (L257), D9 (L325), V1 (L370), V2 (L8, L308), V3 (L72, L764), V4 (L568), V5 (L7-8, L245), V6 (L234), V7 (L334), V8 (L322)
- Where: plan §10
- Plan location: `audit/plan/10-audit-units.md:11-279` (each entry's *Modules*)
- Finding: Units read beyond their entry's modules, each under "Also read": A1 `display.ts`, `outcome.ts` (what `=` means, N2, N3), `evaluate.ts`, `quantity.ts` (how a node reaches `step`), `pipeline.ts` (end-to-end runs); A2 `src/core/print.ts` (the parentheses the pages give the outcome are the printer's); A3 `evaluate.ts` (the `unit` node) and `table.ts` (`unitLookup`) for Q11, `settings.ts` and `settings-lines.ts` (the precision-limit panel claim); A4 `table.ts` (N17), `convert.ts` (N19), `quantity.ts` (the flag from a call's arguments); A5 `pipeline.ts`, `builtin.ts`, `context.ts` and the refusal sites under `builtins/` (§1.1.6 item 14, the suggestion rule); A6 `messages.ts` (N15's wording), the edge checks of six built-in modules (D5–D7's) and `step` (the decimal-mode retry); A7 a dozen lines of `units.txt` beyond the declarations (the Q4, Q5, Q8 examples), `build.ts` (Q3's condition terms), `pipeline.ts` (Q16's conformance step), the `dimensions` line of every built-in module; D1 `pipeline.ts` and `outcome.ts` (the want grammar), `names.ts`, `table.ts`, `build.ts` (`#Names`), two built-ins (arity), and the property test lives in `src/core/print.test.ts`, `src/testing/expr.ts` being only the tree generator; D2 `evaluate.ts` (the call case, `checkConditions`, `evaluateBound`; §2.2.4 lists it, the entry does not) and `names.ts`; D4 `settings-panel.ts` (V5's) and the harness for the page's worked examples; D5 `messages.ts`, `evaluate.ts`, `ball.ts`'s edge and classifier functions, the other families' registry lines (the whole dimension-rule table), `units.txt`; D6 `builtin.ts`, `ball.ts` (`widened`, `position`), `messages.ts`, `evaluate.ts`'s call node, and `builtins/exact.test.ts` is thinner than the entry's "checklist of exact behaviour in every mode"; D7 `bernoulli-ratios.ts` (§9.4's gamma-bullet row), `messages.ts`; D9 `app-shell.ts`, `sw.ts`, `build-id.ts`, `subscription.ts`, `settings-panel.ts`'s header (the six "list only" modules hold neither the shell, the worker nor the sheet); V2 `quantity.ts` and `dimension.ts`, and `outcome.ts` in full (listed header-only, though only its body settles the re-parse); V3 its "`fixed-*.ts` by header only" left the Bernoulli memo by count and bits and `fixed-incomplete.ts`'s bodies unverified (V3 (F-160); D7 verified the memo rule, D7 report); V4 `table.ts`, `messages.ts`, `ball.ts`; V5 `app-shell.ts` beyond its header (the cog, `render`, the settings handlers) and `print.ts`'s header; V6 "`bench/stress/*` by header" undersells the work: `cases.ts` and `catalogue.ts` in full and a scratch analysis of `catalogue.json`; V7 "test and bench files by name" understates it: the bench and stress modules in full, the sweeps by section; V8 `app-footer.ts`, `build-id.ts`, `vite.config.ts`, the manifest, `index.html`, `.env`, `.gitignore`, the Prettier configuration, the rasterizer's header, `tsconfig-coverage.test.ts`, `bench/stress/tooling.ts`. A8, A9 and V1 call their scope right, with single-clause extras (A8 `evaluate.ts` for `evaluateBound` and `checkConditions`; A9 `context.ts`, `evaluate.ts`, `quantity.ts`, `ball.ts`, `builtins.ts`, `expr.ts`; V1 `bernoulli-ratios.ts`, `hyperbolic.ts`, `radius.ts`); D3 and D8 needed nothing more. Recurring: `messages.ts` (A6, D5, D6, D7, V4), `evaluate.ts` (A1, A3, A8, A9, D2, D5, D6), `table.ts` (A3, A4, D1, V4), `pipeline.ts` (A1, A5, A7, D1), `print.ts` (A2, V5).
- Proposed call: No correction needed for this audit (historical scope notes; every unit read what it needed). If an entry is re-run, add the modules named here and name the harness (`outcomeOf`, `evaluateText` or `convertText` from a scratch script, the table built as `src/outcome.test.ts` builds it) as the instrument for examples; V2's advice holds: a unit whose page describes a module should expect to read that module whole.
- Decision: Stands (no correction for this audit; recorded for a re-run).

#### F-515. §10 entries: section, claim and context scopes that did not fit

- Type: plan
- Units: A2 (L31, L156), D2 (L471), D3 (L31, L349), D4 (L8, L414), D5 (L204), D6 (L242)
- Where: plan §10 (A2, D2, D3, D4, D5, D6 entries)
- Plan location: `audit/plan/10-audit-units.md:19-20` (A2: "N24's display part"), `:113-123` (D2), `:125-133` (D3), `:135-144` (D4's context), `:146-157` (D5: "the preamble paragraph"; the dimension-rule table), `:159-166` (D6)
- Finding: A2: "N24's display part" is not defined (N24 is about which limit a refusal names); A2 read it as the display's handling of the exponent bound. D2: its section pointers overlap neighbours: `#Conditions`' subsections are A6's, `#Names` rests on `names.ts` and the `NAME` regex (A9's and D1's), `#Calls` describes `evaluate.ts` step by step, and most of `#Unit lists` is conversion semantics (Q15's owner). D3: the entry's "sections" cannot be checked bullet by bullet (the page's six bullets against the file's twenty-one sections; D3 maps them and names the five the page omits), and it assigns the absent `u` and `at` of `docs/definitions.md#Names`, a section D1 and D2 own. D4: §6.5, on which its findings rest, is not in its context (read anyway). D5 and D6: what the D5 entry calls "the preamble paragraph" follows the bullets (`docs/functions.md:115`), and its "every built-in takes plain numbers" is contradicted by D6's bullets 7 to 9; both units found it (D5 (F-138), D6 (Q-095)). D5 is also asked to verify the whole dimension-rule table, though four rows are D6's and D7's.
- Proposed call: No correction needed: historical scope notes, every case was covered. For a re-run, define N24's display part, list `evaluate.ts` and `names.ts` for D2, add §6.5 and §6.8 to D4's context, and give the paragraph after the bullets to D5 and D6 jointly.
- Related: Q-095, F-138
- Decision: Stands (no correction for this audit; recorded for a re-run).

## Needs spot-check

### Conflicts

- F-002 (docs/README.md): Index and root README share one intro; reshape them per §12 q18
- F-010 (docs/numbers.md): N3 and devdocs: two sources of a nonzero radius, not three
- F-013 (docs/numbers.md): N1: the fraction keeps no factor of ten; the bound is on the value
- F-015 (docs/numbers.md): "working precision" for the digits of the grid
- F-019 (docs/numbers.md): N4: an exact operand meeting an inexact one is rounded
- F-022 (docs/numbers.md): "Four times the limit plus ten" reads as 4L + 10; limit and ceiling run together
- F-023 (docs/numbers.md): N10: the partial kind is reachable today, by more than one route
- F-028 (docs/numbers.md): N14 and devdocs: a difference "refused as too large" cannot arise
- F-029 (docs/numbers.md): N14: a touch is not a straddle; the callers decide
- F-033 (docs/numbers.md): The call-cost paragraph triplicated; where its parts go
- F-034 (docs/numbers.md): N7: a refusal the loop does not retry ends it early
- F-037 (docs/numbers.md): N17 and the Mode entry: step lists that miss operators
- F-038 (docs/numbers.md): N19: the reciprocal line is the reciprocal of the shown ratio
- F-043 (docs/numbers.md): N19: with a `want`, the `have` is an operand rounded to `w`
- F-049 (docs/numbers.md): D4's Significand limit entry and D8's drafts split its content differently
- F-051 (docs/numbers.md): `tooLarge`: one kind, never retried, against the plan's owner review
- F-060 (docs/numbers.md): N12: the top-edge literal is not written; the outcome throws
- F-061 (docs/numbers.md): Ratio rule: the code forms no fraction for dyadic values that fit
- F-064 (docs/numbers.md): The "at most about twice" cost bound fails near the ceiling
- F-067 (docs/quantities.md): `asin(0.5)` into `turn` is an angle, not the plain number (Q8)
- F-069 (docs/quantities.md): Q10 misfiles `gravity`; the pages miss the measured factors
- F-070 (docs/quantities.md): A conversion's ratio is also refused at the significand limit (Q13)
- F-072 (docs/quantities.md): A list's remainder is rounded at the digits it certifies (Q15)
- F-078 (docs/expressions.md): The `ha` example fails: there is no unit `a`
- F-093 (docs/definitions.md): A kind primitive called "dimensionless"
- F-098 (docs/definitions.md): Pages describe messages for definitions errors; none is worded
- F-099 (docs/definitions.md): The `dozen` example names a unit of the file
- F-106 (docs/definitions.md): A built-in's dimension rule applies at build
- F-107 (docs/definitions.md): The status of user definitions (§6.4)
- F-108 (docs/definitions.md): "How to add to it": the page has no such section
- F-113 (docs/units.md): Units defined through `pi()` are inexact, and no page names them
- F-114 (docs/units.md): The catalogue moves from the language page to docs/units.md
- F-118 (docs/settings.md): "eight by default, as GNU units shows" goes (§12 q2)
- F-122 (docs/settings.md): Notation examples: the have as echoed, and "reads back as itself"
- F-125 (docs/settings.md): The ceiling is a pass's precision, not "the finest grid"
- F-126 (docs/settings.md): Precision limit entry misdescribes the panel's line; "derived and shown"
- F-128 (docs/settings.md): The probe does not time "the costliest built-ins"
- F-131 (docs/settings.md): "For a fraction of a second": a timing in the probe's description
- F-134 (docs/settings.md): docs/settings.md names devdocs pages in inline code, against ownership
- F-138 (docs/functions.md): Preamble: "every built-in takes plain numbers" omits six built-ins
- F-139 (docs/functions.md): Preamble's forward pointer to a section that dissolves
- F-148 (docs/functions.md): Bullets 7, 8, 10 and the `approx` entry: what they keep and link
- F-153 (docs/functions.md): Bullet 12 misstates when the Bernoulli ratios are computed (§9.4 row)
- F-154 (docs/functions.md): Gamma-family cost figures given three times (plan §9.1)
- F-164 (docs/functions.md): `incbetareg`'s exact case: the ten-thousand cap, worded off by one
- F-174 (docs/app.md): The footer's rarer words are documented nowhere; offline.md lists a subset
- F-180 (docs/app.md): docs/app.md does not exist (§9.3); D9 and V8 drafted it independently
- F-181 (devdocs/README.md): Developer index becomes the §7.1 map and links the style guide
- F-183 (devdocs/numbers.md): `#(top)`: GNU units named in the `pi()` rationale
- F-188 (devdocs/numbers.md): `#Exact operations`: the gcd timing
- F-190 (devdocs/numbers.md): Products and quotients take the context too, in three passages
- F-209 (devdocs/numbers.md): `#Working precision`: "milliseconds per pass" in the rebuild alternative
- F-210 (devdocs/numbers.md): `#Settling`: why every inexact result is settled
- F-218 (devdocs/numbers.md): approx: "never the reverse" contradicts the function's purpose
- F-221 (devdocs/numbers.md): `devdocs/numbers.md`: ten reference-style issue links go inline; #98's place disputed
- F-229 (devdocs/architecture.md): The parser's rejection lists omit `inverseAnnotation`
- F-230 (devdocs/architecture.md): The lookup's one throw: right about the cause, loose about the place
- F-231 (devdocs/architecture.md): A prefix's body evaluates call conditions at build too
- F-235 (devdocs/architecture.md): Juxtaposition is its own operator in the tree, not plain `*`
- F-237 (devdocs/architecture.md): `LEVELS` and `BINARY` keep parser and printer in step only for operators
- F-240 (devdocs/architecture.md): "The precedence follows GNU units" is unverified
- F-241 (devdocs/architecture.md): `#Parsing`'s "in two ways only" omits a third case
- F-243 (devdocs/architecture.md): A composite node's span includes its `-`, its `)` and its parentheses
- F-252 (devdocs/architecture.md): UI sections stay as mechanism; how many links to docs/app.md
- F-253 (devdocs/architecture.md): The outcome does not parse the want again
- F-258 (devdocs/builtins.md): `#Names`: "no built-in is a prefix of another's name" is false
- F-262 (devdocs/builtins.md): `#The rules every built-in follows`: the edges a message names are more than listed
- F-263 (devdocs/builtins.md): `#The rules every built-in follows`: "one half for `asinh`" is a radius
- F-269 (devdocs/builtins.md): `#Dimension rules`: "the mistake they were introduced against"
- F-271 (devdocs/builtins.md): `#Domains…`: the `ln`, `log10`, `log2` row's exact cases
- F-272 (devdocs/builtins.md): `#Domains…`: `pow(-1, y)` is not exact "for any `y`"
- F-274 (devdocs/builtins.md): `#Domains…`: the edges column omits the exponent bound
- F-278 (devdocs/builtins.md): `#The elementary routines`: "the four costliest routines" rests on a benchmark
- F-280 (devdocs/builtins.md): `#The exact functions`: the opening misstates inexact arguments and quantities
- F-282 (devdocs/builtins.md): `#The exact functions`: the Gamma pointer is on two of the three errors
- F-283 (devdocs/builtins.md): `#The exact functions`: `div`, `mod` and the rounding functions can form large results
- F-284 (devdocs/builtins.md): `#The exact functions`: `mod`'s alignment refusal is not worded as a sum's
- F-293 (devdocs/builtins.md): `beta(1e15, 1)` is the exact case, not a logarithm example
- F-296 (devdocs/builtins.md): `erf` timing sentence goes
- F-297 (devdocs/builtins.md): `erf`'s tiny-argument rule: proposed for the families section, already stated
- F-302 (devdocs/builtins.md): `#Not in this design`: no argument is complex; `sqrt(-1)`'s error
- F-306 (devdocs/functions.md): Annotations: "since definitions cannot be typed" and the intended wording
- F-308 (devdocs/functions.md): Defined-before-built-in precedence: state the prohibition instead
- F-311 (devdocs/functions.md): The `noInverse` message is misquoted
- F-314 (devdocs/functions.md): Display: a ratio inside a call is bare only for a plain number
- F-320 (devdocs/functions.md): "Injects each rejected piece": two rejections are not drawn
- F-321 (devdocs/functions.md): Issue links #130 to #134: reference-style and linked more than once
- F-324 (devdocs/notation.md): notation.md#(top): V5's two versions of its second paragraph
- F-331 (devdocs/settings.md): settings.md#The model rewritten on top of numbers.md and settings.md
- F-335 (devdocs/settings.md): Resets: `withDefault` clamps nothing; the shell clamps and tells
- F-336 (devdocs/settings.md): The clamp report's property is `clamps`, not `clampLine`
- F-340 (devdocs/settings.md): The notation's radios are not under the Mode control
- F-343 (devdocs/settings.md): Reference-style issue links; #118 linked from three passages
- F-348 (devdocs/future.md): Ruled-out function classes reworded as deferred, on both pages (§9.4)
- F-362 (devdocs/layout.md): Is `public/icons/` the source of every icon? The favicon, on two pages
- F-371 (devdocs/testing.md): "Within five seconds": a timing, or a constant that stays?
- F-392 (devdocs/benchmarks.md): Which numbers leave testing.md and benchmarks.md under §12 q25
- F-393 (devdocs/development.md): "A few seconds" for `pnpm test` and `pnpm bench`: qualitative or a timing?
- F-398 (devdocs/development.md): Test failure shows the build error, not "the offending definition"
- F-399 (devdocs/development.md): The unit lists' section is not at the end of the file
- F-403 (devdocs/offline.md): Update checks: the online check runs only while the page is in view
- F-413 (cross-cutting): Issue #98: three links on two pages; its one place disputed
- F-414 (cross-cutting): Issue #100: three links; `numbers.md#approx` its agreed place
- F-415 (cross-cutting): Issue #103: named on four pages; `builtins.md` or `cost.md`
- F-416 (cross-cutting): Issue #107: on three pages; `builtins.md` or `cost.md`
- F-417 (cross-cutting): Issue #115: `builtins.md` agreed; `future.md` points at the wrong section
- F-418 (cross-cutting): Issue #118: linked from three pages; `cost.md` or `future.md`
- F-420 (cross-cutting): Issue #125: on three pages; `builtins.md` or `cost.md`
- F-421 (cross-cutting): Issues #130 to #134: one owner page, two placements proposed
- F-422 (cross-cutting): Issue #149: on three pages; `builtins.md` or `cost.md`
- F-423 (cross-cutting): Issue #150: on three pages; `builtins.md` or `cost.md`
- F-424 (cross-cutting): Issue #151: `cost.md` agreed, but one edit keeps it in `builtins.md`
- F-425 (cross-cutting): Issue #152: `expFixed`'s bullet or `cost.md`'s hangs
- F-426 (cross-cutting): Proposed text links docs pages and anchors not yet written
- F-429 (terminology): "ceiling", its gloss "the finest grid", and "grid" in the user docs
- F-431 (terminology): "working digits" in three senses; "the working grid"; "working precision" for the grid
- F-436 (terminology): "neighbor rule" / "neighbour"
- F-437 (terminology): "absorbed into the radius"
- F-439 (terminology): "canonical" (form, significand, text) and "the printed form"
- F-440 (terminology): "decimal exponent" beside "the exponent"
- F-441 (terminology): "hard bound" (and "formable")
- F-442 (terminology): "rejected" / "rejection" beside "refusal" and "error"
- F-445 (terminology): "log space" and its examples
- F-447 (terminology): "edge", "boundary", "bound"; "touch", "straddle"
- F-455 (terminology): Rule 4's form: "scaled ratio" or "a ratio times its power of ten"
- F-457 (terminology): "parses back", "typed back", "reads back", "pastes back"
- F-459 (terminology): "dimensionless markers" for the kind primitives
- F-460 (terminology): "plain number" against "dimensionless"
- F-468 (terminology): Output modes by ordinal ("the third output mode")
- F-471 (terminology): Have and want: "the quantity to convert", "the unit to convert to"; the labels
- F-475 (terminology): "the definitions file" and "system"
- F-483 (terminology): "intervals" for the temperature units; "interval" elsewhere
- F-488 (terminology): "sheet" and "panel"
- F-492 (terminology): "build number" and "build ID"
- F-493 (terminology): "service worker" and "the worker"
- F-494 (terminology): "a new version", "an update", "a deploy"
- F-505 (plan): §1.2.4: `outcome.ts` does not parse the `want` again
- F-509 (plan): §1.1.5 `tooLarge` row withdrawn, against the owner's review statement

### Low confidence

- F-017 (docs/numbers.md): "A rounding adds half a grid cell" not verified by D8
- F-030 (docs/numbers.md): N16 and `#Conditions`: equality absent today, not ruled out
- F-039 (docs/numbers.md): Gap (hedged): docs/ never says decimal mode runs a single pass
- F-040 (docs/numbers.md): Decimal-mode sentences of the dissolving section: the radius serves inside a step
- F-050 (docs/numbers.md): The 32,768-bit scenario reads as the default; where the diagram goes
- F-058 (docs/numbers.md): "The bound stays": keep the ruled-out higher bound, drop the test build
- F-116 (docs/units.md): Sources: three attributions unverified, five cited sources unnamed
- F-159 (docs/functions.md): Incomplete functions' large-parameter refusal: wording and precision
- F-160 (docs/functions.md): Not verified: the incomplete functions' truncation bounds (bullets 14, 16)
- F-161 (docs/functions.md): Gap new: the incomplete functions' "cannot be told from" edges
- F-163 (docs/functions.md): Gap new: `erf` and `erfc` have no domain error
- F-169 (docs/app.md): The loading and failure messages are stated nowhere
- F-170 (docs/app.md): The load-failure message shows the internal kind "(fetchFailed)"
- F-178 (docs/app.md): The copy button's feedback is undocumented
- F-193 (devdocs/numbers.md): `#Memoized constants`: two requests pass the memo, `beta`'s unconfirmed; the 25 ms
- F-208 (devdocs/numbers.md): `#Working precision`: the unaffordable-pass parenthesis is untraced
- F-224 (devdocs/architecture.md): "Each arrow is one pure function in its own module"
- F-225 (devdocs/architecture.md): The `#Numbers` summary is unverified
- F-259 (devdocs/builtins.md): `#Names`: "`W` is the watt" does not say why it matters
- F-264 (devdocs/builtins.md): `#The rules every built-in follows`: "about 181,727" not recomputed
- F-279 (devdocs/builtins.md): `#The exact functions`: the open-cell rule's reason is not recorded
- F-300 (devdocs/builtins.md): Memory figures and term counts kept as the schedule's reasons
- F-301 (devdocs/builtins.md): Not verified: kernel-side statements of the families section
- F-313 (devdocs/functions.md): The contexts of a conversion into a function are left implicit
- F-333 (devdocs/settings.md): Load-time asymmetry: an out-of-range width resets the whole mode
- F-337 (devdocs/settings.md): The probe "leaves the memos at the largest ceiling it tried": not checked
- F-365 (devdocs/layout.md): Why experimentalDecorators: a claim about Vite that moves
- F-377 (devdocs/testing.md): testing.md's reference-style issue links, their status unchecked
- F-381 (devdocs/testing.md): The Playwright checklist cannot be checked from the tree
- F-391 (devdocs/benchmarks.md): The stress suite's minutes and hour
- F-397 (devdocs/development.md): development.md: tool and platform behaviour nothing in the tree confirms
- F-404 (devdocs/offline.md): offline.md: platform behaviour nothing in the tree confirms
- F-407 (devdocs/deployment.md): Deployment: wrangler and Workers Builds behaviour not verifiable
- F-491 (terminology): "the costliest built-ins" for the probe's composite

(Findings flagged both conflict and low confidence are listed under Conflicts only.)
