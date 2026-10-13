# Work order 11: `devdocs/numbers.md`

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V1 (L186)` is `audit/reports/V1/fable.md`, line 186. `§7.1` is the
concept map in `audit/plan/07-docs-outline.md`, `§1` is
`audit/plan/01-core-abstractions.md` (its claims and stale rows,
amended), `§8` is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/numbers.md`, the design of the numeric type: it
  keeps the mechanism, each decision with its reason, and the ruled-out
  alternatives with theirs, and for every user-facing rule it links
  `docs/numbers.md`, the owner, instead of restating it (§7.1).
- **Order.** The first developer page, eleventh overall: after every
  user page, so that `docs/numbers.md` exists for its links (Q-008).
  Later developer pages link it (`notation.md`, `architecture.md`,
  `builtins.md`, `functions.md`, `settings.md`, `cost.md`, `future.md`),
  so a heading of this page is renamed only by updating every link to
  it. This page links later developer pages at their current headings;
  a later page that renames one updates the inbound links in its own
  rewrite.
- **Status.** Ready once the code track's batch 1 has landed (B-068:
  the notes this page quotes say "certified"; B-002: the refusal at the
  bound). V1 audited the whole page (its Proposed edits, V1 L186-336)
  and A1 to A6 and A9 drafted the passages their claims rest on;
  section 7 says which text to take where two drafts overlap.
- **Output.** The page in one pass, and in the pull request the choices
  made and any question for the owner.

## 2. The reader, and what the user pages taught

The reader is a developer who has read `docs/numbers.md` (and can read
`docs/settings.md` and `docs/quantities.md`): the rules of exactness,
certification, the modes, the limits, `approx` and the written form are
known. Each section of this page opens with one sentence that links the
`docs/numbers.md` section owning the rule it builds on, V1's table of
openers and cuts being the list (V1 L106-130, L336; F-066): the opener
for the page's top (V1 L186) says what a user needs is in
`docs/numbers.md` and reads "inexact", not "approximate". The page then
keeps three things: the mechanism (types, algorithms, the schedule,
settling, the classifiers), the decisions with their reasons, and the
ruled-out alternatives with theirs, in the present tense.

## 3. Rules that bind the page, applied to the drafts

- **Intent, not history (principles; §1.1.5).** Every stale passage
  carries its tag: keep as intent (F-184, F-191, F-196, F-198, F-205,
  F-209, F-210, F-211, F-212, F-217), drop (F-197, F-203, F-207), update
  (F-185, F-192 and the contradictions). A ruled-out alternative is
  stated in the present tense, never as "a first design".
- **The ruled-out alternatives of `devdocs/future.md` move here
  (Q-011; F-350, F-349).** `future.md#Ruled out, and why` dissolves,
  and this page, written before it, receives the bullets that belong
  to the number type, each stated as a ruled-out alternative in the
  present tense with its reason: a float with a rational significand
  as a third number type (`future.md` page L187-195, into `#Decimal
  mode`, which the bullet already cites); binary floats or a
  configurable radix (page L196-199) and exactness as a flag on values
  (page L204-206), into `#The types`; a radius shown to the user (page
  L200-203), into `#Certification and the display rule`, the user's
  sentence being `docs/numbers.md`'s (work order 01); stored digits of
  `pi` or `e` (page L207-218), into `#Memoized constants`, corrected:
  `e` is computed by `eSeries` of `constants.ts`, a binary-splitting
  sum of its own, not "as the `exp` routine's series", the ratios
  staying (a Machin formula slower by a small factor, spigot
  algorithms quadratic, stored digits about 0.42 bytes a digit) and
  the millisecond figures rough and illustrative or gone (F-349). The
  unbounded exponent is already at `#Why the exponent bound stays at
  10^18`. Item 13 of the owner's list confirmed the classification on
  2026-10-12: the bullets are written as ruled out by intent.
- **Which numbers the page keeps (Q-016, Q-018, Q-088).** A measured
  ratio stays ("about forty times cheaper than Euclid's", F-188; "about
  ten times `pi`'s whole series", F-196); a rough timing may stay only
  marked rough and illustrative where it adds weight to a decision (the
  25 ms of F-193, the settle costs of F-220, the division of F-184: the
  session's choice, else the benchmarks hold them); counts, bits and
  memory sizes stay; the scratch build's per-size milliseconds go
  (F-202, Q-017: this item's own answer); "milliseconds per pass" in
  the rebuild alternative is a qualitative claim and stays (F-209); the
  47 ms of a changed design goes with it (F-192); `10^300000` "take a
  minute" becomes V1's qualitative reason (F-185).
- **Issue links (Q-011, Q-012; §12 question 26).** Inline, once, where
  the passage that owns the concept stands; the foot's definitions go
  (F-221). Bugs stay here: #79 (B-003), #88 (`#Roots and powers`, the
  one link, Q-102), and #199, the schedule's edge (B-011), linked once
  at `#Working precision and the schedule` (the owner's list, item 14).
  Future work leaves for `devdocs/future.md`: #78 (the owner's list,
  item 2: `#Exact operations` states where a quotient's reduction runs
  today as a plain fact, naming no issue), #98 (the sentence goes,
  Q-014), #100 with the binary form's tentative design (Q-035, Q-104:
  `#approx` names the form in one clause linking `future.md`), #171
  (its sentence goes with it, item 3), #173 (item 5: `#Decimal mode`
  states the behaviour as a plain fact), #89 (the clause goes, Q-042),
  #103 (to `builtins.md`, Q-012, F-195). #172 stays inline at `#The
  working digits` (item 4). All of these the owner confirmed on
  2026-10-12 (section 8).
- **Refusal only for a size refusal (F-442).** "Refused" for the
  significand limit's and the bound's refusals (they are: F-213, F-216,
  F-215), a literal past the hard bound or the exponent bound included
  (R-4 of the review, plan §12.3: a size refusal as it is typed, past
  the exponent bound the bound's `overflow`, as a computed value past
  it is); "rejection" for text the parser rejects for its form, the
  code's `Rejection` named as it is; never "refused" for an edge, a
  domain error or a mismatch, so "a difference refused as too large"
  goes (F-028: a difference that cannot be formed as a value), and
  `#approx`'s "never the reverse" sentence is read with "refusal" in
  its size sense before D6's rewrite is taken (F-218).
- **Inexact, not approximate (F-451).** Everywhere, the opener
  included (V1 L186).
- **The words (§8).** "The working grid", "working precision" for a
  pass's, "working digits" for the setting (F-431); "the hard bound",
  glossed once (F-441, F-191); "the guard" told apart from the kernel's
  guard bits (F-432); "node" (F-433); "uncertified", never "the
  fallback" (F-434); "neighbor", "the neighbor rule" (F-436); "absorbed
  into the radius" (F-437); "canonical", spelled out once (F-439);
  "decimal exponent" allowed here (F-440); the refusal's words, reach,
  fits, exceeds, need (F-444); "rounding boundary", "tie", "grid point"
  (F-446); "touch" and "straddle" (F-447); "the ceiling rounding" as
  A2 words it (F-430); "certified" in every quoted note (F-427, F-021,
  F-214); the ceiling "four times the sum of the precision limit and
  ten", `4 × (L + 10)` (F-022; Q-005 lets the devdocs keep the formula
  and its derivation); "a third source of inexactness" (Q-079).
- **Markdown (principles).** Inline links only; the broken source in
  `#Decimal mode` (a blank line and a list item inside a code span,
  F-212) mended; the diagrams stay as fenced blocks.

## 4. The page, section by section

The current headings stay unless a finding renames one; each opens
with its link to `docs/numbers.md` (V1 L336). Per section, the text to
take and what the rules change:

- **(top).** V1 L186 (the opener, "inexact") and V1 L188 or A1 L309-313
  for the `pi()` rationale without GNU units' name (F-183, Q-039).
- **The types.** V1 L192 (the fives division's reason, no minute) and
  V1 L194, the same as A1 L61 (two exponents and a single binary
  exponent ruled out, in the present tense; the one base's cost a
  division per settle, its figure rough or the ratio) (F-184, F-185).
- **Exact operations.** A1 L166-196 and V1 L198-204: an integer power of
  an inexact base takes the product rule by squaring (F-186); when a
  divisor counts as containing zero, A6's text with the reason (A6
  L300-306, adopted at V1 L200; F-187); the gcd ratio with its
  milliseconds rough or left to the benchmark (F-188); the sentence on
  where a quotient's reduction runs (A1 L193, V1 L204) states today's
  behaviour as a plain fact, the open question and #78 being
  `future.md`'s (section 8); the rest of the section read against `src/core/ball.ts` as the
  session rewrites it (F-189).
- **Sums and alignment.** A1 L204-209 and V1 L208: each operation on
  `Scaled` takes the significand limit and returns a `Result` for it and
  the bound; on balls each takes the context, a product and a quotient
  for the limit their prediction needs and the grid an operand is put
  on, the grid clause settled from `src/core/ball.ts:666-668` (F-190;
  the sister passages are `architecture.md`'s, work order 13).
- **Comparison.** A6 L309-341 and V1 L212-214: a touch is an order of
  its own, told from a straddle; the built-ins' edge checks treat a
  touch as a straddle and the conditions do not; two inexact values
  compare through their difference against zero, which always aligns,
  a difference that cannot be formed as a value counting as across
  zero (F-028, F-029). The clause "a unit list's counts treat a touch
  as a straddle" is checked against `src/core/convert.ts:394-401`
  before it lands (it contradicts A8's Q15 reading, F-072). The user
  rule and the touch sentence are `docs/numbers.md`'s, linked.
- **The kernel's boundary.** V1 L218 (why the door allows four times
  the hard bound, present tense, "the hard bound" glossed; F-191) and
  V1 L220 (the exit's memos served, the margin's reason, no 47 ms;
  F-192).
- **Memoized constants.** V1 L224-226 over A3 L94-98: two requests pass
  the memo, the larger argument's reduction and `beta`'s logarithm at a
  larger one, the `beta` request confirmed in `src/core/builtins/beta.ts`
  by the session before it lands (F-193); the table's build is `pi`'s
  first use (F-194); the Bernoulli ratios hold the same margin for the
  same reason, memoized by the count the series reserve, with the
  pointer to `builtins.md` and no #103 (F-195, Q-012).
- **Roots and powers.** V1 L230-238: "multiplications only" with the
  ratio and no 869 ms (F-196); the integer-roots sentence dropped
  (F-197); why the third case goes to log space, present tense (F-198);
  #79 inline (B-003); the `pow` prediction clause goes and #88 stays
  inline as the one link (F-199, Q-042, Q-102).
- **The exponent bound.** The three sites (`gamma`, `erfc`, the
  incomplete functions) verified against their classifiers as the
  session rewrites the section (F-200, Q-058); "the ceiling rounding"
  per F-430.
- **Which limit a refusal names.** A5 L413-429 and V1 L240-242: the
  message quoted with its remedy sentence, or left to `docs/numbers.md`
  and the generated catalogue (F-201, Q-007); the sum never faces the
  choice (F-052, §1 N24 as amended); the mechanism sentence with the
  pointer "above" (F-215). The intent of the classes, in the owner's
  words (Q-001): they tell the user the type of failure, so that a
  user who may succeed with a wider significand limit can choose to
  retry with one; the retries inside a node or a step are correct as
  the code has them, and `resolve` retries no refusal.
- **Why the exponent bound stays at 10^18.** V1 L244-248: the six-pass
  table and the qualitative finding stay, the per-size milliseconds go
  (F-202, Q-017); the passes' diagram and table live here, the
  `exp(1e999)` diagram in `docs/numbers.md` (F-050, Q-109); the
  32,768-bit scenario named as not the default, the session reading
  `src/core/context.ts:170` and naming the default of 65,536 bits or no
  limit at the table (F-050).
- **Certification and the display rule.** A2 L75-81 and V1 L250-258:
  the first-version parenthesis dropped (F-203); "certified" (F-021);
  the `^1e10000` example (F-204, Q-099); the partial kind reachable
  today by two routes, L768-770 rewritten as A2 L79 and V1 L254 have it
  but without naming the two-argument `approx` as a route (F-023,
  Q-078, Q-011); the ball straddling a grid point under a directed mode
  (Q-078).
- **Working precision and the schedule.** A3 L100-120, A9 L257-273 and
  V1 L262-270: a context silent on the mode is exact, present tense
  (F-205); `checkContext`'s bounds in either mode (F-206); "they moved
  once" dropped (F-207); A3's grid sentence (A3 L112, V1 L266: the
  ceiling pass's grid is `digitsFor(bitsFor(ceiling))`, about ten digits
  above the ceiling; F-022, F-125); the cost bound's edge, "about three
  times the last" where the ceiling lies just above a doubled precision
  (F-064, Q-047), with #199 linked once there (B-011; Q-012's rule for a
  bug in today's behaviour); the unaffordable-pass parenthesis read
  against A5
  L144-147 and kept only if it holds under Q-001 (F-208, F-051: one
  `tooLarge` kind, never retried; a refusal first raised at a later
  pass ends the loop with the best earlier result); the rebuild
  alternative kept as intent with "milliseconds per pass" (F-209); the
  table built once at the ceiling stated here in full (F-249: this is
  the section the code comments of B-056 may cite).
- **Settling.** A3 L122-130 and V1 L274-276, or A1 L62-63: why every
  inexact result is settled, one text picked with the example's size
  checked against `src/core/ball.ts:16-23` (F-210); why `settle` is not
  exported, one wording (F-211); the exact charge of a rounding (half a
  cell of the working grid; a whole cell where the rounding's exponent
  would pass the bound), stated here (Q-084), in F-431's words: "the
  working grid", never "working digits", which name the decimal-mode
  setting alone.
- **Exact mode.** A1 L211-221 and V1 L280-282: "exactly two things ever
  produce a nonzero radius" (F-010); "certified" (V1 L282).
- **Decimal mode.** A4 L93-102 and V1 L284-300 (the eight pairs, V1's
  "certified" for pair 7, "behavior" as the page spells it): the
  withdrawn-radius paragraph kept as intent and its source mended
  (F-212); what the significand limit binds (F-213); the steps before
  the last and the notes' wording (F-214); the step list with a leading
  `-` (F-037); a literal past the limit refused in either mode (F-041,
  Q-040); `log` reaches the uncertified fallback (F-042, Q-048: the
  exact case waits for a review), the second half of "The ceiling"
  rewritten as A4 L100 and V1 L296 have it, with #173's link gone to
  `future.md` and the behaviour stated as a plain fact (section 8); the user's consequences (A4 L137) are
  `docs/numbers.md`'s.
- **The working digits.** A4 L104-107, V1 L302-306 and D4 L387-389: the
  second bullet (with a want the have is an operand rounded to `w`; the
  reciprocal line inverts the ratio shown; F-038, F-043, Q-046); #172
  inline, confirmed (section 8).
- **The significand limit.** A5 L388-411 and V1 L308-316: `1 / 2^n`
  refused from `n = 28,225` (F-216); the mechanism sentence, not
  "checked first" (F-215); measuring after forming kept as intent
  (F-217); a built-in that works at an argument's own bits refuses
  there (F-056); "a third source" (Q-079); "about 69,658 bits" (F-012).
- **approx.** D6 L200-212 and V1 L318-324: the "never the reverse"
  sentence settled as section 3 says (F-218); the ruled-out spellings
  kept as intent, the postfix `~` among them, its sentence losing "the
  likely spelling … later" (F-219, confirmed); the binary form named
  in one clause that links `devdocs/future.md`, its tentative design
  and #100 moved there (Q-035, Q-104; the session hands that text to
  work order 18); the #98 sentence dropped (Q-014); #171's sentence
  gone to `future.md` with its link (item 3, confirmed);
  `approx` on a base does not relax an exponent literal (Q-099);
  `widened`'s behaviour as confirmed (Q-080).
- **Failures.** The rule the throw of B-003 breaks, stated; unchanged
  otherwise.
- **Formatting.** A2 L82-85 and V1 L326-328: the three costs as small
  fixed costs, their figures rough or left to the benchmarks (F-220); the
  cross-reference to `#The types` goes with that section's rewrite.
- **The foot.** The reference definitions deleted (V1 L332; F-221).
- **Received from `devdocs/future.md`.** The five bullets of section
  3's second rule, each at the section named there, in the present
  tense, linking nothing of `future.md` (which, written later, will
  have dropped them).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-183 | (top) | The rationale without the name (Q-039) |
| F-184 | The types | Keep as intent; the figure rough or the ratio |
| F-185 | The types | V1's qualitative reason |
| F-186, F-187 | Exact operations | Doc wrong; A6's text with the reason |
| F-188 | Exact operations | The ratio stays; the milliseconds rough or the benchmark's |
| F-189 | Exact operations | Read against `ball.ts` when rewriting |
| F-190 | Sums and alignment | Corrected; the grid clause from `ball.ts:666-668` |
| F-191, F-192 | The kernel's boundary | Keep as intent, glossed; update, no 47 ms |
| F-193, F-194, F-195 | Memoized constants | Two requests, `beta` confirmed; the build fills `pi`'s memo; the ratios' margin, no #103 |
| F-196, F-197, F-198, F-199 | Roots and powers | Keep as intent with the ratio; drop; keep as intent; the #89 clause goes, #88 stays |
| F-200 | The exponent bound | The three sites verified (Q-058) |
| F-201 | Which limit a refusal names | The message with its remedy, or left to the docs (Q-007) |
| F-202 | Why the exponent bound stays | The table stays, the milliseconds go (Q-017) |
| F-203, F-204 | Certification | Drop; the `^1e10000` example |
| F-205, F-206, F-207, F-208, F-209 | Working precision | Keep as intent; doc wrong; drop; read A5 L144-147 (Q-001); keep as intent |
| F-210, F-211 | Settling | One text each |
| F-212, F-213, F-214 | Decimal mode | Keep as intent, the source mended; doc wrong; "certified" |
| F-215, F-216, F-217 | The significand limit | Doc wrong; doc wrong; keep as intent |
| F-218, F-219 | approx | "refusal" read in its size sense first; the `~` spelling ruled out, kept as intent |
| F-220 | Formatting | Small fixed costs; figures rough or the benchmarks' |
| F-221 | (the page) | Links inline; #78, #98, #100, #171, #173 leave for `future.md`; #89 goes; #103 to `builtins.md`; #172 stays; #199 added |
| F-349, F-350 (received) | The types; Decimal mode; Certification and the display rule; Memoized constants | The ruled-out bullets of `future.md`, stated here as intent (Q-011); `e` by `eSeries`; item 13 confirmed |

Owned elsewhere and read here, each applied by its owner and giving
this page a sentence or a link: F-010, F-012, F-021, F-022, F-023,
F-028, F-029, F-037, F-038, F-041, F-042, F-043, F-044, F-046, F-050,
F-051, F-052, F-053, F-056, F-057, F-064, F-066 (`docs/numbers.md`'s
findings), F-069 (the `#approx` sentence on the dalton checked: the
measured values are `docs/units.md`'s), F-120, F-125, F-134, F-246,
F-249, F-345, F-411 to F-415, F-426, and the terminology findings of
section 3.

## 6. Decisions followed, and still open

Followed: Q-001, Q-005, Q-006, Q-007, Q-008, Q-011, Q-012, Q-014,
Q-016, Q-017, Q-018, Q-035, Q-039, Q-040, Q-042, Q-046, Q-048, Q-058,
Q-063, Q-078, Q-079, Q-080, Q-084, Q-088, Q-091, Q-099, Q-102, Q-103,
Q-104, Q-109; the rules F-427, F-430 to F-434, F-436, F-437, F-439 to
F-442, F-444, F-446, F-447, F-449, F-451.

Still open: nothing. Q-047 and Q-048 get no `future.md` entry (the
owner's list, item 14): their issues are #199, linked once here, and
#200, linked once in `devdocs/builtins.md`; the owner's list is answered
(section 8), item 13 confirming that the bullets this page receives
from `devdocs/future.md` (section 3) are ruled out by intent. R-3 of
the review (plan §12.3) keeps #199's link.

## 7. Proposed text to start from, and what the rules change in it

Where V1 restates an A unit's text, the two are the same and either is
the source; where they differ, the row says which.

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V1 L186, L188; A1 L309-313 | V1 | "inexact" (L186) |
| The types | V1 L192, L194; A1 L61 | V1 | the timing rough or the ratio |
| Exact operations | A1 L166-196; A6 L292-307; V1 L198-204 | V1, with A6's zero-containment text | the ms rough or benchmark's; the reduction sentence a plain fact, #78 in `future.md` |
| Sums and alignment | A1 L198-209; V1 L208 | same | the grid clause settled |
| Comparison | A6 L309-341; V1 L212-214 | same | the unit-list clause checked |
| The kernel's boundary | V1 L218, L220 | V1 | — |
| Memoized constants | A3 L94-98; V1 L224-226 | V1 | `beta` confirmed; the 25 ms rough or gone; no #103 |
| Roots and powers | V1 L230-238 | V1 | #88 only; the #89 clause gone |
| Which limit a refusal names | A5 L413-429; V1 L240-242 | same | the quote may leave (Q-007) |
| Why the exponent bound stays | V1 L62, L244-248; D8 L287-289 | V1 | the default limit named or none |
| Certification | A2 L37-41, L75-81; V1 L250-258 | same | no route through the two-argument `approx` named |
| Working precision | A3 L100-120; A9 L257-273; V1 L262-270 | V1, with A3's grid sentence and A9's rebuild alternative | the unaffordable parenthesis checked |
| Settling | A1 L62-63; A3 L122-130; V1 L274-276 | V1 (A3's), or A1's | the example's size checked |
| Exact mode | A1 L211-221; V1 L280-282 | same | — |
| Decimal mode | A4 L93-102; V1 L284-300 | V1 ("certified"; "behavior") | #173's link to `future.md`; the behaviour a plain fact |
| The working digits | A4 L104-107; V1 L302-306; D4 L387-389 | same | #172 inline |
| The significand limit | A5 L388-411; V1 L308-316; A5 L66 | V1 ("above") | — |
| approx | D6 L200-212; V1 L318-324 | D6's rewrite after the check; V1's links | #98 gone; #100 and the tentative design to `future.md`; #171's sentence with them |
| Formatting | A2 L42, L82-85; V1 L326-328 | same | the figures rough or gone |
| The foot | V1 L332 | V1 | — |
| Openers | V1 L106-130, L336 | V1 | "inexact"; `docs/numbers.md`'s anchors as written |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"), all
answered on 2026-10-12: conflict 4, Q-016 against Q-017 (confirmed:
Q-017's section loses its milliseconds; elsewhere a figure stays only
marked rough and illustrative); items 2, 3, 4 and 5 of the Q-011 list
(#78, #171, #172, #173, each on this page). #78 is future work: `#Exact
operations` states where a quotient's reduction runs today as a plain
fact, and `future.md` carries the open question and its one link.
#171's sentence ("the semantics of `approx` as a whole are under
study") and its link go to `future.md`'s `approx(x, u)` entry. #172
stays inline in `#The working digits` as the vocabulary note it is.
#173 is future work: `#Decimal mode` states the behaviour as a plain
fact, and `future.md` carries the link. The postfix `~` spelling
(F-219, item 11) is a ruled-out alternative, kept with its reason, the
sentence losing "the likely spelling … later". Item 13 confirms that
the bullets this page receives from `devdocs/future.md` (section 3)
are ruled out by intent; item 14 gives #199 (kept by R-3 of the
review). Of the review's answers (plan §12.3, 2026-10-13): R-3, #199
stays linked once at `#Working precision and the schedule`; R-4, a
literal past the hard bound or the exponent bound is a size refusal
(section 3); R-7, "real values only" is a plain fact and complex
numbers are future work, so nothing on complex values is received
here. The session records in its pull request each choice between
drafts (sections 4 and 7), the figures it kept as rough, and the
received bullets' places, which work order 18 checks.

## 9. Code changes it waits on

- **Before the page:** batch 1 (B-068, B-002). B-056 (the comments in
  `src/system-build.ts` and `src/system-table.ts`) cites this page's
  `#Working precision and the schedule` once work order 13 confirms the
  shell section does not keep the table's design.
- **Documented as today's behaviour, no wait:** B-003 (#79), B-006
  (#88), B-007 (`log`'s exact cases), B-008 (the reciprocal line),
  B-011 (the schedule's edge), B-013 (69,658).

## 10. Done when

- Every section opens with its link to `docs/numbers.md` and keeps
  mechanism, decisions and ruled-out alternatives only, in the present
  tense; no "a first design", no "once", no "moved".
- Every stale row of §1.1.5 for this page is applied with its tag;
  every figure left is a ratio, a count, a memory size or a rough,
  illustrative timing marked as such.
- Every issue link is inline, once, and only for a bug or an open
  design question; nothing of #98, #100, #89 or #103; the foot's
  definitions are gone.
- No "approximate" for a value, no "refused" for an edge, "certified"
  in every quoted note.
- #78, #171 and #173 do not occur; #172, #79, #88 and #199 occur once
  each; the `~` spelling is a ruled-out alternative without "likely …
  later".
- The pull request names the drafts picked, the figures kept, and any
  question for the owner, and changes nothing outside this file.
