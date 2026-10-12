# Work order 17: `devdocs/cost.md` (The costliest expressions)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V6 (L146-159)` is `audit/reports/V6/fable.md`, lines 146 to 159. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/cost.md`, "The costliest expressions": the
  catalogue the stress search maintains, how a case is measured and
  reproduced, where the costs come from, what the search has not
  reached, the hangs, and the generated tables. It is the one page
  that links the kernel-cost issues (Q-012, A), and it keeps the
  mechanism and the orderings the tables bear out, never a count or a
  timing the next run changes.
- **Order.** Seventeenth: after `docs/numbers.md` (its opener links
  `#what-costs-time`, F-357) and `docs/builtins.md`, and after
  `devdocs/numbers.md` (the schedule and decimal mode),
  `devdocs/builtins.md` (the families' section, #103's one link) and
  `devdocs/settings.md`, which it links (Q-008). Later pages link it
  (`future.md`, `benchmarks.md`, `README.md`), so these headings stay:
  `#What the costs come from` (linked by `devdocs/builtins.md` for
  #107, #125, #149, #150), `#The hangs` (#151, #152), `#How a case is
  measured`, `#The catalogue`. This page links `devdocs/benchmarks.md`
  and `devdocs/future.md`, written later, at their current headings
  (`benchmarks.md#The search`, `#The stress suite`;
  `future.md#Extensions that fit`); a later page that renames one
  updates the inbound links in its own rewrite.
- **Status.** Ready. V6 audited the whole page (its text, V6
  L122-179), the one unit on it; the generated tables (`#The
  catalogue`, the hangs table) are the tool's and are not edited by
  hand: the hangs table keeps bare issue numbers until B-070 lands
  (Q-062), which the page need not wait for.
- **Output.** The page in one pass, the generated tables untouched,
  and in the pull request the choices made and any question for the
  owner.
- **Not in scope.** `bench/stress/` (B-070 is the code track's, with
  its work); `devdocs/benchmarks.md` (work order 21), which explains
  the deadlines once (F-352).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `docs/numbers.md` (what costs
time: a value that never certifies runs the whole schedule to the
ceiling; the rough-duration warning), `docs/builtins.md` (which
functions are costly), `devdocs/numbers.md` (the schedule's length for
each setting, "Working precision and the schedule"; decimal mode's one
pass; the memoized constants), `devdocs/builtins.md` (the families'
algorithms, the Bernoulli memo and its footprint) and
`devdocs/settings.md` (the probe and the limits). The page opens with
one sentence linking `docs/numbers.md#what-costs-time` (F-357) and
then keeps the mechanism (the harness, the warm and cold runs, the
floor and the deadline, the profiles, the lanes), the causes in the
order the tables bear out, and the issues, one link each.

## 3. Rules that bind the page, applied to the drafts

- **The issue links (Q-012 A, Q-013 B, Q-011).** This page keeps the
  one link of #107, #125, #149, #150, #151 and #152, each once: #150
  and #149 in their bullets of `#What the costs come from` (V6 L152,
  L153), #107 beside #149 (V6 L153), #125 in the Gamma bullet (V6
  L154), #151 and #152 in `#The hangs` (V6 L176-177); the second
  #152 at the elementary functions' bullet (V6 L155) becomes words
  ("the hard bound's hangs, below"); #103 is `devdocs/builtins.md#The
  Gamma and Beta families`' and is linked as that section, the
  footprint named in words (F-415). The scheduler and its parts are
  `devdocs/future.md`'s: #118 to #121 are named in words wherever V6
  links them (V6 L126, L154, L159, L179's "(#118, with #120's workers,
  linked above)") with one link to `future.md#Extensions that fit`
  (F-418, F-419; Q-013 B); the user-definitions clause of `#What the
  search has not reached` (V6 L169) names no issue and says "future
  work" with the `future.md` link, never "deferred" (#132; F-421,
  Q-011). The generated hangs table's bare numbers stay until B-070
  (F-360, Q-062).
- **Which numbers the page keeps (Q-016, Q-088, Q-061).** The counts
  that every run changes (runs, cases measured, entries, keystrokes,
  slow keystrokes; page L120-123, L135) go now, as V6's text has it
  (F-353); "Four functions … have no entry yet" becomes "Elementary
  functions without an entry", the count dropped, the four names and
  why none is caught kept (F-359); the prose of `#What the costs come
  from` states the orderings and ratios the tables bear out, never a
  timing the catalogue could contradict, a rough figure staying only
  marked illustrative where it adds weight (F-354; V6 L146-159 is the
  draft); the schedule's lengths (nine, eight, eleven, fifteen passes)
  are the model's and stay (F-351); the term-count formulas and the
  surcharge ratios stay (F-356).
- **Refusal only for a size refusal (F-442).** V6's uses are size
  refusals and stay: "a refusal the loop does not retry" (V6 L136),
  "the significand limit's refusals" (V6 L165).
- **The words (§8).** "The hard bound", glossed once at its first use
  (V6 L136, L155, L168, L177; F-441); the stress vocabulary (case,
  profile, floor, deadline, hang, warm and cold, lane) glossed once
  each (F-497); "the app", "the fields" or "the outcome" for what V6
  calls "the converter" (F-472); "the definitions file", never "the
  system file" (V6 L169; F-475); "a value that never certifies"
  (F-427); "the working precision" of a pass (V6 L136, L148; F-431).
- **Markdown (principles).** Inline links; the markers of the
  generated tables untouched.

## 4. The page, section by section

- **(top).** V6 L122-126: the opener linking
  `docs/numbers.md#what-costs-time` (F-357); what the catalogue is and
  what it is the target for, the two kinds of work: cheaper kernels,
  and an interface that stays responsive whatever an evaluation
  costs, the latter named in words with the `future.md` link (section
  3; no #118 to #121).
- **How a case is measured.** V6 L128-144: Passes is the schedule's
  length for the case's settings, linking
  `devdocs/numbers.md#Working precision and the schedule` (nine at the
  defaults, eight at thirty-two display digits, eleven at the highest
  precision limit under the default significand limit, fifteen at the
  hard bound), and a count short of the schedule marks a pass that
  ended the loop with a refusal the loop does not retry, after which
  the best result so far is shown (F-351, Q-001); the deadline is the
  search's constant, `DEADLINE_MS` of `bench/stress/catalogue.ts`,
  which the harness enforces (F-361); the floor and the deadline are
  named here and explained once in `benchmarks.md` (F-352; the link
  at its current heading).
- **Reproducing a case.** No finding; V6 confirms it. Only the words
  of section 3.
- **What the costs come from.** V6 L146-159: the cost of a case is
  the sum of its passes, and the last, at the ceiling, usually
  outweighs all the earlier ones together (F-355); the causes,
  costliest first, with the one link each (section 3); the Gamma
  bullet's surcharge, "about half the warm cost at the defaults …
  about twice the warm cost at the highest precision limit", and the
  memos paragraph scoped to every call that takes a Gamma value, the
  Gamma family itself, the regularized incomplete gamma functions and
  the incomplete beta functions, whose cold run also builds the
  Bernoulli numbers (F-356); the typing paragraph without its counts
  (F-353); the elementary functions' bullet pointing at `#The hangs`
  in words.
- **What the search has not reached.** V6 L161-170: the decimal
  profile's empty slot as structural, decimal mode having no schedule,
  its one pass being the context itself, linking
  `devdocs/numbers.md#Decimal mode` (F-358); the elementary functions'
  bullet retitled (F-359); the exact functions' bullet (V6 L165); the
  settings outside the six profiles, "the hard bound" glossed if it
  is first here (V6 L168); the expressions of other shapes, with "the
  definitions file" and the future-work clause worded under section 3
  (V6 L169); other machines (V6 L170: "every timing so far is from one
  machine" is a fact about the tables and stays).
- **The hangs.** V6 L172-179: some cases run past the search's
  deadline (`DEADLINE_MS` of `catalogue.ts`; F-361); #151 and #152
  linked once each (F-360); the last paragraph's "(#118, with #120's
  workers, linked above)" as words with the `future.md` link; the
  generated hangs table untouched (B-070).
- **The catalogue.** Generated; untouched.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-351 | How a case is measured | The schedule's length; a short count marks a refusal (Q-001) |
| F-352 | How a case is measured; The hangs | Named here, explained in `benchmarks.md` |
| F-353 | What the costs come from; What the search has not reached | The counts dropped (Q-061) |
| F-354 | What the costs come from | Orderings and ratios; a rough figure only marked illustrative (Q-088, Q-016) |
| F-355 | What the costs come from | The sum of the passes, the last outweighing the rest |
| F-356 | What the costs come from | The Bernoulli run's scope; the surcharge ratios |
| F-357 | (top) | The opener links `docs/numbers.md#what-costs-time`; the scheduler in words to `future.md` (Q-013) |
| F-358 | What the search has not reached | Structural, linking `devdocs/numbers.md#Decimal mode` |
| F-359 | What the search has not reached | Retitled, the count dropped (Q-061) |
| F-360 | The hangs; (the page) | One link each for #107, #125, #149 to #152; #103 via `builtins.md`; #118 to #121 and #132 in words (Q-012, Q-013, Q-011, Q-062) |
| F-361 | The hangs; How a case is measured | `DEADLINE_MS` of `catalogue.ts` |

Owned elsewhere and read here: F-034, F-039, F-063, F-065, F-154,
F-290, F-321, F-415, F-416, F-418 to F-425, F-509, and the terminology
findings F-427, F-431, F-441, F-472, F-475, F-497.

## 6. Decisions followed, and still open

Followed: Q-001, Q-008, Q-011, Q-012, Q-013, Q-016, Q-061, Q-062,
Q-088; the rules of section 3.

Still open: nothing that blocks the page. A generated summary line
for the counts (Q-061's "later") is on the owner's list only to
confirm that it gets no `future.md` entry (item 14); the page states
no count meanwhile.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V6 L122-126 | V6 | #118 to #121 as words and one `future.md` link (L126); the `docs/numbers.md` opener |
| How a case is measured | V6 L128-144 | V6 | the `benchmarks.md` link for the deadline's explanation |
| What the costs come from | V6 L146-159 | V6 | #121 and #118 as words (L154, L159); the second #152 as words (L155); #103 as the `builtins.md` section (L154, if named); "the hard bound" glossed |
| What the search has not reached | V6 L161-170 | V6 | "the definitions file", "future work" with the `future.md` link, no "deferred" (L169) |
| The hangs | V6 L172-179 | V6 | the last paragraph's bare numbers as words (L179) |

## 8. Conflicts left to settle

None of the owner's list touches this page's text; conflict 4 (a
figure kept only as rough and illustrative) is the session's choice
passage by passage under section 3. The session records in its pull
request the figures kept and the links placed.

## 9. Code changes it waits on

None. B-070 (the hangs table's links) lands with its own work and
regenerates the table; the page's prose does not depend on it.

## 10. Done when

- The page opens with its link to `docs/numbers.md#what-costs-time`
  and keeps mechanism and orderings only; no count that a run changes
  remains in the prose.
- #107, #125, #149, #150, #151 and #152 are linked once each and
  nowhere else on the page; #103, #118 to #121 and #132 are words and
  links to the owning section or `future.md`; the generated tables are
  untouched.
- "the hard bound" and the stress vocabulary are glossed once; "the
  definitions file"; no "deferred".
- The pull request names the figures kept and changes nothing outside
  this file.
