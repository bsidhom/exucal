# Open items from the documentation audit

Every question the audit units put to the owner, deduplicated: 115 open items from the
188 questions of the twenty-six reports under [reports/](reports/). The findings they touch
are in [findings.md](findings.md), the code defects in [bugs.md](bugs.md). The owner's
decisions belong in [plan/12-open-questions.md](plan/12-open-questions.md) once made, as
[README.md](README.md) says; the owner answers in [decisions.md](decisions.md), and the
Decision fields here are filled from it (done; see each item's Decision and plan §12.1).

## How to read an open item

- **Kind.** `owner decision`: needs the owner's choice (intent, scope, wording policy, a
  code change to approve). `plan correction`: the plan says something the units found
  wrong. `settled by a finding`: another unit's report already answers it with evidence;
  the Settled by field names the finding, and the owner only confirms. `coordination`: it
  asks only which unit or rewrite does something; the consolidation settles it by the page
  that owns the finding.
- **Units.** The units that asked, with the question's number in its report and the report
  lines (`A1 Q2 (L288-292)`).
- **Proposed answer.** The units' own proposals, merged; where they differ, each with its
  unit.
- **Settled by.** Findings (F-) or bugs (B-) whose evidence answers the question.
- **Blocks.** The page rewrite that waits on the answer.
- **Decision.** The owner's answer as written in [decisions.md](decisions.md), applied on 2026-10-12; the full record, with how each answer is applied and which earlier decisions it amends, is [plan/12-open-questions.md](plan/12-open-questions.md), section 12.1. "Pending" marks what the list at the end of decisions.md ("For the owner") still holds.

| Kind | Items |
| --- | --- |
| owner decision | 72 |
| plan correction | 5 |
| settled by a finding | 24 |
| coordination | 14 |
| **total** | **115** |

## Decisions that block a rewrite

These owner decisions each hold up a page; every other item changes a sentence or nothing,
and can be decided as its page comes up. Listed under the first page each one blocks.

- `docs/numbers.md`: Q-001 (`tooLarge`: one kind never retried, or classes some
  of which are retried; the units contradict the plan's account of the owner's review);
  Q-002 (the literal at the top edge that the outcome cannot write back);
  Q-003 (the ratio before the reciprocal line's `×`); Q-004 and
  Q-005 (the ceiling: its gloss and its formula); Q-006 (when the
  "certified" code change lands); Q-007 (quoting the app's messages in
  hand-written pages); Q-108 (the Significand limit entry against "Values too big
  to hold"); Q-023, Q-024, Q-025, Q-026 (decimal mode's
  consequences, the touch rule, the rounding functions at zero, the one log-space example).
- `docs/settings.md`: Q-018 (rough durations such as "a few seconds"), with the
  ceiling items above.
- `docs/app.md`: Q-022 ("build number" or "build ID"), Q-028 (a privacy
  sentence), Q-057 (the internal kind name in the load-failure message).
- `docs/functions.md`: Q-009 (corrections beyond §9.4's rows in the interim),
  Q-010 (statistical distributions: deferred built-ins, or definitions).
- `docs/definitions.md`: Q-011 (where issues #130 to #134 are linked),
  Q-015 (the `dozen` running example).
- `docs/units.md`: Q-075 (names absent, or meaning something else),
  Q-032 (why information is a dimension), Q-033 (the sources).
- `docs/expressions.md`: Q-037 (the intent for typographic characters).
- `docs/README.md`: Q-064 ("certifies" in the index's opening sentences).
- The developer pages: Q-008 (when to apply devdocs edits that link user pages
  not yet written: it holds up every devdocs rewrite that pares a section to a link);
  Q-012, Q-013, Q-014 (where issues are linked);
  Q-016, Q-017 (which measurements leave); Q-019,
  Q-020, Q-021 (terms and titles); Q-027, Q-029,
  Q-030, Q-031, Q-034, Q-035, Q-036,
  Q-038, Q-049 (one section each).

## Owner decision

### Q-001. `tooLarge`: one kind never retried, or classes some of which are retried

- Kind: owner decision
- Pages: devdocs/numbers.md; docs/numbers.md; plan
- Units: A1 Q3 (L293-298), A3 Q7 (L147), V6 Q7 (L229)
- Question: The plan records from the owner's review that there are classes of `tooLarge`, "some of which the retry loop retries" (N21; the §1.1.5 row on `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule`; §1.1.6 item 14), and tags the pages' one-refusal description stale. A1 finds one kind carrying a reach and a need (`src/core/rational.ts:66-98`) that `resolve` never retries (`src/core/pipeline.ts:87-91`, `338-360`), one raised at a later pass ending the loop with the best result so far. A3 asks whether a classifier verdict can move from `unresolved` at the bound to a refusal at a later pass after an earlier pass produced a result, and what the classes are. V6 asks that the row name which refusals end the loop with a result and which with the error (`src/core/pipeline.ts:325-327`).
- Proposed answer: A1: A5 settles the row against `classifyPower`'s `unaffordable` (`src/core/ball.ts:734-740`) and the pipeline's predicates. A3: A5 traces the classifier; "which the retry loop never retries" holds for `resolve`, so the row's update belongs to A5's sections, not the schedule section. V6: V1 names, among the classes, which end the loop with a result and which with the error. A5 answers (A5 (F-051, F-509); V1 (F-509) follows it): one error kind whose only classes are its reach (`fits`/`exceeds`) and its need (`exact`/`bound`/`unknown`), as `devdocs/numbers.md:1376-1398` already says; `resolve` retries none; any `tooLarge` ends the loop, with the best earlier result when a pass produced one that assumed no condition, otherwise with the refusal; only `unaffordable` and the series' working bits can make a later pass the first to refuse; the row is withdrawn. A3 (F-051) adds that a `tooLarge` is retried inside a node or a step (decimal mode's `powered` and `summed`, the settle-first sum, the retried product and quotient), never by the schedule, which may be what the review meant. The reports contradict the plan's record of the owner's review, so the owner says which holds: if classes some of which are retried are the intent, the code deviates (code wrong); if not, N21 and the §1.1.5 row are corrected and the passages kept.
- Settled by: —
- Blocks: V1's rewrite of `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names` and `#Working precision and the schedule`; `docs/numbers.md#Values too big to hold`.
- Decision: other: the internal retry looks as they exist in the code today should be considered correct (unless there is some bug in internal consistency, etc). The intent behind classification of failure kinds is to signal the failure type to the _user_, who can choose to retry if there's a chance that increasing the significand width would resolve the issue. This is exactly what the kinds attempt to convey. [plan §12.1]

### Q-002. A literal whose rounding carries past the exponent bound

- Kind: owner decision
- Pages: devdocs/notation.md; docs/numbers.md; plan (N12)
- Units: A2 Q2 (L145), A8 Q1 (L146)
- Question: `devdocs/notation.md#Every literal parses back` decides that `9.5e1000000000000000000` at one digit is written `1e+1000000000000000001` and refused only when typed back. Today the outcome throws while composing the line ("The display wrote 1e+1000000000000000001, not a literal", `src/outcome.ts:394-398`), because `numberExpr` rebuilds every literal from the display's text through `parseDecimal`, which refuses it as `overflow`; `9.99999999e1000000000000000000` with a blank want, or into `m`, crashes the same way. Implement the page's decision, or refuse such a rounding?
- Proposed answer: A2: implement the page's decision in `numberExpr`: keep the display's text with a value built from it without the bound check when `parseDecimal` refuses it as past the bound, since the outcome's expression is printed and never evaluated (`src/core/expr.ts:150` requires a `value`), with a test; the alternative, an error line, keeps every line parseable but refuses a correctly rounded value. A8: report a display rounding that carries past the bound as the bound's refusal (`overflow`), since the value as shown would pass it; the page then states the edge as that refusal and N12 follows. The answers differ (A8 takes A2's alternative); either way the crash is a defect.
- Settled by: —
- Blocks: `devdocs/notation.md#Every literal parses back` (A2's edit is written pending this); `docs/numbers.md#How numbers are written` (N12's edge).
- Decision: B. The goal of being able to paste back literal values is firm. We should fail on rounding, but surface an explicit and helpful error message to the user, e.g., "rounding EXPRESSION causes an overflow", with the offending expression referenced clearly. (Existing error messages, where they do not have bugs, are currently quite good at this.) [plan §12.1]

### Q-003. The ratio before the reciprocal line's `×`: bare or parenthesized

- Kind: owner decision
- Pages: devdocs/notation.md; docs/settings.md; docs/numbers.md
- Units: A2 Q1 (L144), V5 Q2 (L237)
- Question: `devdocs/notation.md#Where a ratio is written` and the Notation entry of `docs/settings.md` write the reciprocal line as `in = (1/36) × 3 ft`, with a reason ("the parentheses cost two characters and save the reader the rule"); the printer writes `in = 1/36 × 3 ft` and `src/outcome.test.ts:97` asserts it. The history is squashed, so neither is known to be the later. V5 adds that `docs/settings.md` carries this error and also writes `1 / (1 / 3 * 3 - 1)` as `= -100000000` where the app shows `= -1e+8`.
- Proposed answer: A2: the code stands and the pages follow, since the printer has one rule, the fewest parentheses that read a line back as its tree (`src/core/print.ts:14-23`), `*` and `/` being one level; a rule for this one position would be a special case in the printer or the outcome. D4 (F-121), V5 (F-121) and A8 (A8 report) write the bare form. The page's stated reason is the evidence for the other reading (code wrong). V5: D4 corrects both from the harness; the `= -1e+8` half is settled by D4 (F-120) and A4 (F-120).
- Settled by: — (the `= -1e+8` half: F-120)
- Blocks: `devdocs/notation.md#Where a ratio is written` (A2's and V5's edits); the Notation entry of `docs/settings.md`; `docs/numbers.md#How numbers are written`.
- Decision: A, as long as this results in the _correct_ AST parse. That was the entire point of parentheses in the first place. If that concern doesn't apply here, then ditch it. The original idea was to make fractional expressions with bare units such as `(1/2) in` parse correctly. This is _not_ the same (in the current grammar) as `1/2 in`, which a user might prefer to see, but which is _not_ equal to `0.5 in` due to the fact that juxtaposition binds more tightly than division via `/`. The docs need to clearly state this edge case if it isn't already documented. Note that this is also a rough edge in the expression grammar itself, and users might get tripped up by it at the moment. I do want to revisit the grammar later, but that is not up for debate in the current docs rewrite, which need to capture the current behavior as intent. [plan §12.1]

### Q-004. The ceiling: "the finest grid the app rounds onto", or a pass's precision

- Kind: owner decision
- Pages: terminology (plan §8); docs/settings.md; docs/numbers.md; devdocs/settings.md
- Units: A3 Q2 (L142), A3 Q5 (L145)
- Question: §8 glosses "ceiling" as "the finest grid the app rounds onto". A3 finds that the ceiling is the last pass's precision (`NumberContext.ceiling`), while a pass at `p` digits settles onto `digitsFor(bitsFor(p))` digits, 28 at the first pass of eight and 4,050 at the ceiling pass of 4,040 (A3 (F-125)), so the grid is about ten digits finer than the ceiling. Gloss it instead as "the highest precision any pass computes at" and keep "grid" to devdocs? The same wording sits in `devdocs/settings.md#The model > Precision limit` ("the finest grid the app rounds onto, in either mode"), `> The two limits meet in the grid` ("the finest grid under a precision limit `L` is `4 × (L + 10)` digits") and the probe's proposal line ("the built-ins on a grid of 4,040 digits", `src/settings-lines.ts:243`).
- Proposed answer: A3: yes; the same gloss in `devdocs/settings.md`; the proposal line's wording is a code change for later. Against it: D4's proposed Precision limit entry (D4 (F-429)) and D8's terminology row (D8 (F-429)) keep §8's gloss; V5's full replacement of `#The model` (V5 (F-331)) keeps "the finest grid the app rounds onto in either mode"; A1 keeps "grid" in docs as §8 has it (A1 (F-429)) and drafts "the app may raise the grid to …". The units disagree; the owner decides whether §8 changes.
- Settled by: —
- Blocks: the Precision limit entry of `docs/settings.md`; `docs/numbers.md#How a value is held` and `#Digits you can trust`; V5's replacement of `devdocs/settings.md#The model`.
- Decision: B. This is clearly semantically correct and is the intent we want to capture in docs. And the "grid" abstraction is useful for understanding rounding/snapping/midpoint behavior. [plan §12.1]

### Q-005. The ceiling's formula: its wording, and whether the docs give it

- Kind: owner decision
- Pages: docs/settings.md; docs/numbers.md; devdocs/numbers.md
- Units: A1 Q2 (L288-292), A3 Q4 (L144), D4 Q3 (L405)
- Question: "Four times the limit plus ten" (`docs/settings.md:112`, `:259-261`, `:271`; `devdocs/numbers.md:834-837`; plan N8) reads as `4L + 10` where `ceilingFor` is `4 × (L + 10)` (`src/core/context.ts:188-190`; 4,040 at the default, not 4,010), and `docs/settings.md:259-261` also makes the ceiling "the most digits an answer may be asked for", which is the limit `L`. Separately, the panel deliberately never writes a formula and shows the ceiling's number only in the probe's proposal: should the docs give the formula at all?
- Proposed answer: A1: "four times the sum of the limit and ten" everywhere; A3 and D4 own the places outside A1's sections. A3: D8 dissolves `:259-261` keeping the distinction between the limit and the ceiling. D4: keep the formula once, in the Precision limit entry with the link to `numbers.md`; the panel stays as it is. D4's drafted Precision limit entry (D4 L253-266) and D8's rewrite of `:258-261` (D8 (F-022)) still say "four times this (that) limit plus ten", the wording A1 and A3 correct. From the reports: the formula once (D4), in A1's wording, with 4,040 beside it.
- Settled by: — (the reading: F-022; N8 is a separate plan correction below)
- Blocks: the Precision limit entry of `docs/settings.md`; `docs/numbers.md#Digits you can trust`.
- Decision: A. The current, sloppy wording was an oversight. [plan §12.1]

### Q-006. The "certified" code change: what rides with it, and when it lands

- Kind: owner decision
- Pages: docs/numbers.md; devdocs/numbers.md; devdocs/builtins.md; code (`src/outcome.ts`, `src/settings-lines.ts`)
- Units: D4 Q1 (L403), D8 Q7 (L313), A2 Q4 (L147), A2 Q5 (L148)
- Question: §12 question 8 records the note wording ("8 of 12 digits are certain" → "certified", `src/outcome.ts:507`) as a code change for A2, which proposed it and did not make it. Should the same change carry the panel's lines that the decisions rule out for the docs, `MODE_LINES.exact` "Every digit shown is certain" (`src/settings-lines.ts:261`) and `PROBE_LINE` "Times the costliest operations" (`:188`, §12 question 23)? When does it land, given that D8's drafted `numbers.md` quotes "7 of 8 digits are certified", the wording after the change? The devdocs quotes of the old wording (`devdocs/numbers.md:1069`, in a passage §1.1.5 keeps as intent, and `:1185`; `devdocs/builtins.md:191`, "no digit certain") follow it.
- Proposed answer: D4: yes, the panel to "Every digit shown is certified, found at rising precision; …" and "Times the costliest exact product and the costliest elementary functions at rising sizes and proposes …". D8: land A2's change before `numbers.md` is assembled. A2: the devdocs quotes and the sheet's line follow the change; `devdocs/builtins.md:191`'s directed-mode examples then read `≈ 1 (0 of 8 digits are certified)`.
- Settled by: —
- Blocks: the assembly of `docs/numbers.md` (`#Digits you can trust`); the devdocs passages that quote the notes.
- Decision: ok [plan §12.1]

### Q-007. Quoting the app's messages and UI text in hand-written pages

- Kind: owner decision
- Pages: docs/numbers.md; docs/getting-started.md; docs/app.md; devdocs/settings.md
- Units: D8 Q2 (L308), D9 Q6 (L320), D9 Q7 (L321), D4 Q5 (L407)
- Question: §12 question 6 generates the message catalogue from `src/messages.ts` and hand-writes none of it meanwhile. May hand-written pages still quote messages and UI strings: `numbers.md#Values too big to hold` the significand limit's and the exponent bound's refusals ("which message says which", §7); getting started's "When something is refused" two or three messages; `app.md` every word the footer can show; and devdocs the panel's strings, one of which (the probe's proposal) drifted from `proposalLine` unnoticed?
- Proposed answer: D8: the two quotes stay as the foundation's examples, the catalogue being the complete list. D9: getting started quotes two or three messages as examples of the shapes (a mismatch, a size refusal, an edge), claiming no completeness, and links the generated catalogue once it exists; `app.md` quotes every footer word verbatim, so that a user can search for the one they see, and names the service worker once, the mapping from status to word staying in `devdocs/offline.md`. D4: devdocs name the function and paraphrase, quoting only where the exact text is the point (the refusal lines, which the tests pin). The answers agree: examples, never a catalogue.
- Settled by: —
- Blocks: `docs/getting-started.md#When something is refused`; `docs/numbers.md#Values too big to hold`; `docs/app.md#Updates and the build number`; `devdocs/settings.md#The probe`.
- Decision: ok [plan §12.1]

### Q-008. devdocs edits that link docs pages not yet written: when to apply

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/architecture.md; devdocs/functions.md; devdocs/settings.md; devdocs/notation.md
- Units: V1 Q6 (L365), V2 Q1 (L298), V4 Q7 (L564), V5 Q4 (L239)
- Question: Under §12 question 24 the devdocs rewrites open their sections with a link to the owning docs section, but `docs/numbers.md`, `quantities.md`, `expressions.md` and `app.md` do not exist yet and their anchors are not fixed. Apply the devdocs edits now against interim targets, write the links to the outline's names now, or wait for the pages?
- Proposed answer: V1: the phase that creates `docs/numbers.md` applies V1's section openers from its table, cutting the sentences it names; V1's other edits apply now. V2: apply V2's pared sections after the D units' pages exist, so that no link is ever dangling. V4: apply when the skeleton lands; applied earlier, each such link points at `../docs/definitions.md`, "Functions", which holds the rules today. V5: write the links to the outline's names now and set the anchors when the D units create the pages; until then the sentences read correctly as prose. The four answers differ on whether a link may dangle meanwhile.
- Settled by: —
- Blocks: every devdocs rewrite that pares a section to one sentence and a link (V1, V2, V4, V5); D8's and D9's drafts, which link `docs/numbers.md` and `docs/app.md`, wait on the same pages.
- Decision: A. My intention was always to write the docs in topo order. If that's not captured anywhere (and it goes beyond these smaller linking problems anyway), please note that where relevant. [plan §12.1] Rule: the whole rewrite runs in topological order, and the work orders are numbered so; the forward-link convention for two user pages that link each other (the page written first links the later page at the §7 anchor; the later page keeps the heading) was confirmed by the owner on 2026-10-12 (plan §12.2, conflict 1) and is the rule (principles.md).

### Q-009. `docs/functions.md` in the interim: corrections beyond §9.4's rows

- Kind: owner decision
- Pages: docs/functions.md; docs/numbers.md
- Units: D6 Q5 (L234), D8 Q9 (L315)
- Question: §4.4 corrects `docs/functions.md` "only where §9.4 tags a stale passage" until the generated reference exists. D6's bullets 7 to 10 also align terminology (I7: "units" → "dimension", "known to a precision", "refused", the mode) and add three clauses marked "(addition)"; D8 asks that the `approx` bullet, its concept now in `numbers.md#approx`, become the mechanical reference entry (signature and one sentence, §12 question 14). Apply these now, or wait?
- Proposed answer: D6: apply the terminology changes now, since §8 binds, and the additions too, each stating today's behaviour in one clause; the rest waits for the generated reference. D8: D6 points the `approx` bullet at `numbers.md#approx` and keeps the signature and one sentence; D6's bullet 7 edit instead keeps the description, with an addition, and links `numbers.md` once it exists (D6 (F-148)). D5's six old→new pairs (D5 (F-138)) and D7's bullet edits (D7 L133-153 to D7 L173-181) also correct contradictions §9.4 does not tag; their scope follows this decision.
- Settled by: —
- Blocks: the interim edits to `docs/functions.md#(top)` (D5, D6, D7, D8).
- Decision: B [plan §12.1]

### Q-010. Statistical distributions: deferred built-ins, or definitions

- Kind: owner decision
- Pages: devdocs/future.md; devdocs/builtins.md; docs/functions.md
- Units: V6 Q4 (L226)
- Question: The owner's clarification makes the ruled-out built-ins "deferred for the initial calculator", and §1.3 lists "statistical distributions as built-ins" among the function classes deferred, not ruled out. Does it cover the distributions, which `devdocs/future.md#Ruled out, and why` rules out as one-line functions over the Gamma and Beta families?
- Proposed answer: V6: not deferred but placed, in definitions (the system file's or a user's) rather than in the kernel, as V6's text says (V6 (F-348), V6 L193-209). D7 rewords `devdocs/builtins.md`'s list, distributions included, as "Not in the initial design, deferred rather than ruled out" (D7 (F-348)); V3's rewrite of the same paragraph says the distributions need not be built-ins (V3 L667-718). V6's answer departs from §1.3 as written.
- Settled by: —
- Blocks: `devdocs/future.md#Ruled out, and why`; the last paragraph of `devdocs/builtins.md#The Gamma and Beta families`; `docs/functions.md#Not provided`.
- Decision: other: Just note these as being deferred for now, with a possible implementation to follow in the future. Not all functions of interest can be efficiently implemented in user definitions anyway, for example, inverse/quantile statistical functions. [plan §12.1]

### Q-011. Where issues #130 to #134 are linked

- Kind: owner decision
- Pages: devdocs/functions.md; docs/definitions.md; devdocs/future.md; devdocs/cost.md
- Units: D2 Q2 (L462), V4 Q1 (L558), V6 Q1 (L223)
- Question: #130 to #133 are each linked from two or more places (`devdocs/functions.md:149`, `:175`, `:238`, `:754-763`; `devdocs/future.md:166-175`; `devdocs/cost.md:155`), against §12 question 26. Which passage carries each, and #134?
- Proposed answer: D2: #130 at `devdocs/functions.md#Annotations`, #131 at `#Names and shadowing`, #132 at `docs/definitions.md#The format` (the user statement) with `devdocs/future.md#Extensions that fit` keeping the intent without a second link, #133 at `devdocs/functions.md#Deferred`; the other occurrences become plain mentions. V4: #130 to #133 in `#Deferred`, the page's list of what is open, the other sections naming it; #134 in `#An undecided condition`, where the reason it is open is stated, "Not in this design" referring there; either placement satisfies the rule, and V4's edits follow its own. V6: `functions.md` owns #130 to #134. §7's skeleton and §12 question 12 put #132 beside `docs/definitions.md`'s "User definitions".
- Settled by: —
- Blocks: the issue-link edits of `devdocs/functions.md` (V4) and `docs/definitions.md` (D2).
- Decision: other: Future work lives only in `devdocs/future.md`. Anything not implemented today that we might implement later is described there, with its issue links, and nowhere else: the user docs never mention it, and a devdocs page that needs to say something is planned links `future.md` rather than describing it. So #130 to #134 are linked from `future.md` only. What is ruled out by intent is not future work but a current design decision, so it lives in the as-is pages: one sentence where a user would look for it in `docs/` (for example, that the app never shows the error radius), and the reason in the devdocs page that owns the concept. `future.md`'s "Ruled out, and why" is split accordingly: its decisions move to those pages, and anything in it we might still do (the function classes deferred in §1.3 and Q-010) stays as future work. A user page may state what the app lacks today as a plain fact, with what to write instead, but never as something to come. Bugs and performance problems in today's behaviour are not future work either: their issue links stay with the passage that owns the concept (Q-012). Where it is unclear whether an item is ruled out or might still be done, ask me. [plan §12.1] Rule; applied to every finding, open item, plan passage and draft it touches (plan §12.1, principles.md); the items whose status under it is unclear are on the owner's list. The items whose status under this rule was unclear were answered on 2026-10-12 (plan §12.2): each provisional reading confirmed, except #78, which is future work. The example of a ruled-out design above, that the app never shows the error radius, was corrected by the owner on 2026-10-13 (plan §12.3, R-7): it is a plain fact about today's display, neither ruled out nor future work. Amended on 2026-10-16 (plan §12.3): what is ruled out by intent is stated on the user page with its reason as far as a user needs it, the devdocs keeping the mechanism and the alternatives.

### Q-012. Where the kernel-cost issues are linked: `builtins.md` or `cost.md`

- Kind: owner decision
- Pages: devdocs/builtins.md; devdocs/cost.md; devdocs/numbers.md
- Units: D7 Q2 (L248), V6 Q1 (L223), V6 Q8 (L230), V1 Q3 (L362), V3 Q4 (L757), D5 Q6 (L197)
- Question: #103, #107, #125, #149, #150, #151 and #152 are linked from both `devdocs/builtins.md` and `devdocs/cost.md`; #152 also twice within `builtins.md` (`#The elementary routines`, line 406, and `#The Gamma and Beta families`, line 879), and #103 from `devdocs/numbers.md#Memoized constants`. §12 question 26 wants each in one place. `builtins.md`'s Gamma section also repeats the kernel issues and the ruled-out list (§9.4).
- Proposed answer: D7: `builtins.md` keeps #107, #112 and #115; `cost.md` keeps #103, #125, #149, #150, #151 and #152, and the families section links only `cost.md` for them (D7's own edits nonetheless inline all of them in `builtins.md`, D7 report). V6: `cost.md` owns #107, #125 and #149 to #152 (and #118 to #121); `builtins.md` owns #103 and #115, its Gamma section linking `cost.md` for the costs. V1: #103 leaves `numbers.md#Memoized constants` for `builtins.md#The Gamma and Beta families`, which owns the Bernoulli memo (A3 (F-221) agrees); V3 adds it there if absent and confirms the memo's rule. V3: #152 stays at `expFixed`'s bullet and #151 lives in `cost.md` only; V3's edits keep #103, #107, #125, #149 and #150 inline in the Gamma section. D5: one of the two #152 links goes (a note for V3); V3 verified the elementary routines' algorithm bullets that D5 left (V3 report L70). Positions differ on #103 (D7 against V1, V3 and V6), #107 (D7 and V3 against V6), and #125, #149, #150 and #152 (V3 against D7 and V6).
- Settled by: —
- Blocks: the issue-link edits of `devdocs/builtins.md` (V3, D7) and `devdocs/cost.md` (V6); the hangs-table change below.
- Decision: A. I would lean toward my ruling above about all not-currently-implemented work being listed under `future.md`, but I consider these issues to be user-relevant in understanding current performance. Moreover, this is not "future" or "aspirational" work, but a performance bug (where there is an associated issue). [plan §12.1] Settled on 2026-10-12 (plan §12.2, item 1): #115's one link stays in `devdocs/builtins.md#The Gamma and Beta families`, in a one-line mention; `future.md`'s entry names the eight functions without the number. #78 is future work (item 2), not an open design question kept inline.

### Q-013. Where issue #118 (the scheduler) is linked

- Kind: owner decision
- Pages: devdocs/settings.md; devdocs/cost.md; devdocs/future.md
- Units: D4 Q7 (L409), V5 Q3 (L238), V6 Q1 (L223)
- Question: `devdocs/settings.md` links #118 from three passages (twice in `#The probe`, `:475` and `:512`, and in `#The sheet`), and `devdocs/future.md` and `devdocs/cost.md` name it too; §12 question 26 allows one link, at the passage that owns the concept. Which passage owns it?
- Proposed answer: D4: `devdocs/future.md`, the probe section keeping the words "the interface's responsiveness" without the link. V5: the page that owns the interface's responsiveness and the retry loop's cost, `devdocs/cost.md` or `future.md#Extensions that fit` (where §5 C33 places it), `settings.md` naming the concern in words; V5's edits link `cost.md` (V5 report). V6: `cost.md` owns #118 to #121.
- Settled by: —
- Blocks: the issue-link edits of `devdocs/settings.md` (D4, V5), `devdocs/cost.md` and `devdocs/future.md` (V6).
- Decision: B [plan §12.1] #186 and #167, which build on #118, are future work with it (confirmed on 2026-10-12, plan §12.2, items 7 and 8).

### Q-014. Where issue #98 (significant figures) is linked

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/builtins.md; devdocs/future.md
- Units: D6 Q4 (L233), V1 Q4 (L363)
- Question: #98 is linked from `devdocs/numbers.md#approx` (line 1525) and `devdocs/builtins.md#The exact functions` (lines 519-520), and `builtins.md#Not in this design` names it too. Which place keeps it?
- Proposed answer: D6: `devdocs/builtins.md#The exact functions`, the `round` passage; `numbers.md#approx` mentions the concept without the link (D6 (F-221)). V3: #98 stays at `round`'s bullet. V1: keep it in `numbers.md#approx`, since the sentence that carries it (significant-figure propagation, cheap with the binary form) stays, and V6 mentions the extension in `future.md` without the link; §1.3 records no such intent for `future.md`. D7's replacement of `builtins.md#Not in this design` (D7 L222-234) inlines #98 there as well.
- Settled by: —
- Blocks: the issue-link edits of `devdocs/numbers.md#approx` (V1, D6) and `devdocs/builtins.md` (V3, D6, D7).
- Decision: Don't mention this in the sections above. This is a _future work_ item, and lives under `future.md`. [plan §12.1] future.md only (Q-011).

### Q-015. The `dozen` running example

- Kind: owner decision
- Pages: docs/definitions.md; devdocs/functions.md
- Units: A8 Q3 (L148), D2 Q1 (L461), V4 Q4 (L561)
- Question: The example `dozen(n: in) = 12 n` with `~dozen(len) = len / 12` (`docs/definitions.md:282-284`; `devdocs/functions.md:32-33`, `:190`, `:586`) names a unit the file defines (`src/units.txt:614`), so it cannot be added to the file as written, and a reader cannot type it against the app (`2 ft` into `dozen` is a mismatch).
- Proposed answer: A8: keep it, said once where the page introduces it as its own definition, since the file has no function with an annotated parameter and an inverse that could replace it. D2: rename it to a name the file does not define, keeping its shape. V4: `twelve`, which V4's proposed edits use. A8 differs from D2 and V4.
- Settled by: —
- Blocks: the examples of `devdocs/functions.md` (`#Definitions`, `#Annotations`, `#Display`) and `docs/definitions.md#Functions`.
- Decision: B. (I would also accept creating an entirely new example that doesn't even run into this `dozen` collision problem in the first place.) [plan §12.1]

### Q-016. What leaves devdocs under question 25: ratios, counts, memory, constants

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/builtins.md; devdocs/testing.md; devdocs/benchmarks.md; plan (§10)
- Units: V7 Q5 (L326), V3 Q3 (L756), D7 Q1 (L247), A1 Q5 (L304-308)
- Question: Question 25 removes concrete timings from the pages "wherever reasonable". The pages also carry measured ratios ("about forty times cheaper"), counts (the sweep's case counts; convergent counts 768 and 443,000; 89 terms against 11,837; the Bernoulli ratio counts), memory sizes (the Bernoulli memo's megabytes), the tools' constants (a hit's floor of a second, the two-minute deadline, ten minutes by default, the probe test's budget, a margin of ten percent) and model figures (38 per decade for Karatsuba, a hundred for quadratic). Which leave? The plan's §10 entry for V3 says the measurements stay, against question 25.
- Proposed answer: V7: measurements go (the sweep's counts and times, the stress suite's minutes and hour, the example diagnostic line, the forty-times ratio); the tools' constants stay, being the design and the code's; model figures stay, the thresholds deriving from them. V3: question 25 governs over §10; timings leave `builtins.md` for `cost.md` and the benchmarks; bit, term and convergent counts, limits and memory sizes stay as bounds and characteristics of the algorithms. D7: the memory figures and term counts are measurements but not timings; keep them as the quantitative reason the ratio schedule and the rate constant rest on. A1: drop the timings of `devdocs/numbers.md#Exact operations` and `#The types > Scaled` ("19 ms against 686 ms", "0.2 ms against 0.04 ms", "took a minute") and keep "about forty times cheaper" and "a quadratic loop"; V1 drops the timings (V1 (F-188, F-184)) and the ratio too ("far cheaper … the benchmark holds the figures"), as V7 does in `benchmarks.md` ("many times cheaper", V7 (F-386)). V7's report is inconsistent on the probe test's budget (a constant that stays in its answer; "a small fixed budget" in its stale row, V7 report).
- Settled by: —
- Blocks: the measurement rewrites of `devdocs/builtins.md`, `testing.md`, `benchmarks.md` and `numbers.md`.
- Decision: A, for user docs. Just make sure to keep memory approximations, since these will typically hold across machines and have more to do with JavaScript engine representations (which change slowly and are constrained by the spec anyway.) Ratios and machine-portable heuristics, etc., _are_ useful in devdocs, not user docs. I do want to keep rough timings in _developer_ docs where this clarifies issues or adds weight to decisions. Those should be considered "rough" though, and only illustrative, or else the docs should just talk about ratios or how things are physically observable to a user. [plan §12.1] Rule for both corpora (plan §12.1, principles.md); Q-088 makes the devdocs follow it.

### Q-017. The scratch build's figures in `#Why the exponent bound stays at 10^18`

- Kind: owner decision
- Pages: devdocs/numbers.md
- Units: A5 Q5 (L487-492), V1 Q2 (L361)
- Question: The section carries the timings per argument size of a scratch build that raised the bound to `10^1100`. Question 10 gives devdocs "the table and the measurements"; question 25 says concrete timings leave wherever reasonable, and the benchmarks cannot hold figures of a build that no longer exists. Keep them as the decision's evidence, or keep the six-pass table and the qualitative finding?
- Proposed answer: A5: keep the table, drop the per-size milliseconds. V1: the qualitative finding (the cost growing at least as the square of the argument's length, past the probe's budget before `exp(1e500)`), the six-pass table being digits and staying; the figures are recoverable from git if the question reopens, and the page says what raising the bound would take. The two agree.
- Settled by: —
- Blocks: V1's rewrite of `devdocs/numbers.md#Why the exponent bound stays at 10^18`.
- Decision: ok [plan §12.1]

### Q-018. Rough durations: "a few seconds", "a fraction of a second"

- Kind: owner decision
- Pages: devdocs/development.md; devdocs/testing.md; devdocs/benchmarks.md; docs/settings.md; devdocs/settings.md
- Units: V8 Q6 (L316), D4 Q8 (L410)
- Question: Are rough durations timings under questions 9 and 25? `devdocs/development.md#Commands` says `pnpm test` "is the run for every edit, a few seconds"; `docs/settings.md:182` and `devdocs/settings.md:478` say the probe runs "for a fraction of a second", which depends on the budget (each candidate runs four times, up to the first candidate over the budget).
- Proposed answer: V8: "`pnpm test` is the quick run for every edit". D4: the docs say "the page waits while it runs"; devdocs keep the mechanism and the issue. V7 instead confirms "`pnpm test` takes a few seconds" and "`pnpm bench`, a few seconds" on its own pages as qualitative, with no stale row (V7 (F-393); V7 report). V7 and V8 treat the same phrase in opposite ways.
- Settled by: —
- Blocks: `devdocs/development.md#Commands`; the probe paragraph of `docs/settings.md`; `devdocs/settings.md#The probe`.
- Decision: B, while acknowledging that they may drift. To minimize risk of drift, we should be very broad-generous in terms. Knowing "this test will take a few seconds" versus "this test will take about half an hour" is crucial information for a developer, and makes it clear why some tests are not to be run on every commit (or conversely, why they _should_ be run on every commit). [plan §12.1] Rule (plan §12.1, principles.md).

### Q-019. "plain number" in `devdocs/builtins.md` against §8's "dimensionless"

- Kind: owner decision
- Pages: devdocs/builtins.md; terminology
- Units: A7 Q3 (L339-342), V3 Q7 (L760)
- Question: `devdocs/builtins.md#Dimension rules` writes "plain number" in every row, as do the page's prose, the code's `plainNumbers` rule and the messages (`src/messages.ts:174,185`), where §8 makes "dimensionless" the canonical term for a plain scalar in both corpora, "a plain number" being the docs' gloss.
- Proposed answer: A7: keep "plain number" in the rows as the gloss and define it once (A7's edit), rather than rewrite the table. V3: keep it where the page quotes the rules and the messages, glossed once at its first use: "a plain number, which is dimensionless: neither dimension nor kind". Both ask for an exception to §8 on this page.
- Settled by: —
- Blocks: the terminology pass of `devdocs/builtins.md` (V3).
- Decision: A. "Dimensionless" should be preferred where it is not too clunky, but "plain number" is sometimes clearer/simpler. The important thing is that these should be considered _synonyms_, with the word "kind" used any time we are attaching semantics to a particular class of values (as of now, only angles are treated specially with kinds). [plan §12.1] The note is a rule (plan §12.1, principles.md).

### Q-020. The title of `devdocs/functions.md`

- Kind: owner decision
- Pages: devdocs/functions.md; devdocs/README.md; devdocs/architecture.md; terminology
- Units: V4 Q2 (L559)
- Question: "User-defined functions" names five functions the system file defines and no user wrote; §12 question 12 makes the definition language the language of definitions, system and user alike.
- Proposed answer: V4: the title "Defined functions", the file name `functions.md` unchanged for the links; `devdocs/README.md:23` and `devdocs/architecture.md:42`, which describe the page as "user-defined functions", reworded by V8 and V2.
- Settled by: —
- Blocks: `devdocs/functions.md#(top)`; the index lines of `devdocs/README.md` and `devdocs/architecture.md`.
- Decision: ok. Separately, rename the user page `docs/functions.md` to `docs/builtins.md`, titled "Built-in functions", so that it matches `devdocs/builtins.md`. §7's outline follows, and so does every link to the old name: the root `README.md`, `docs/README.md`, the link in `devdocs/builtins.md`, and two comments in `src/units.txt`. After that, "functions.md" names only `devdocs/functions.md`, "Defined functions". [plan §12.1] The note is a rule: docs/functions.md is renamed docs/builtins.md (plan §12.1, principles.md). The pull request that renames the page (work order 07) repoints every link to the old name, so that none dangles.

### Q-021. The heading "A function as the want"

- Kind: owner decision
- Pages: devdocs/functions.md; terminology; plan
- Units: V4 Q3 (L560)
- Question: §8's canonical term is "conversion into a function"; the heading in `devdocs/functions.md` is "A function as the want".
- Proposed answer: V4: keep the heading, since it names the want's form and `src/core/pipeline.ts:19-20` cites it, and use the canonical term in the prose; renaming it costs that comment and the plan's pointers.
- Settled by: —
- Blocks: `devdocs/functions.md#A function as the want` (its heading only).
- Decision: ok [plan §12.1]

### Q-022. "build number" or "build ID"

- Kind: owner decision
- Pages: docs/app.md; devdocs/offline.md; devdocs/architecture.md; terminology; plan (§5 C57)
- Units: V8 Q3 (L313)
- Question: The docs say "build number" (`docs/settings.md:184`, `:189`); the code and `devdocs/offline.md#Build ID` say build ID (`src/build-id.ts`); §8 has no row and §5 C57 says "build number".
- Proposed answer: V8: "build ID" in both corpora, with the footer's label "Build" quoted where the footer is described; §5 C57's term changes with it. D9's drafts say "build ID" too (D9 (F-492, F-180, F-251)).
- Settled by: —
- Blocks: `docs/app.md#Updates and the build number` (the section's name); `devdocs/offline.md`.
- Decision: A [plan §12.1]

### Q-023. `numbers.md`: decimal mode's consequences for units and edges

- Kind: owner decision
- Pages: docs/numbers.md
- Units: A4 Q6 (L137), A3 Q6 (L146)
- Question: Should the user docs state what decimal mode does to units and edges? `turn` in `deg` is `= 359.99999 deg` at eight digits, each unit rounded once to eight digits before the ratio (`deg = 0.0027777779 turn`), where exact mode has `≈ 360 deg`; `tan(90 deg)` is `= -13660250` where exact mode refuses at the pole (A4 (F-044)).
- Proposed answer: A4: yes, one sentence each in the decimal-mode section of the new `numbers.md`, as today's behaviour. A3 handed the `turn` example to A4, to stand beside `sin(pi() radian)` as the example users will meet. §1.3 has the user docs state the exact-mode `turn` case as today's behaviour, a limitation and not a goal. D8's drafted `#The two modes` leaves the mode rules to A4 and D4 (D8 L218-222).
- Settled by: —
- Blocks: `docs/numbers.md#The two modes`.
- Decision: ok, but don't record that specific number in decimal, since it changes with the parameterization and does not match the behavior I see in the real app with my current settings. Keep the discussion to the fact that this does (or even "may") produce an exact value in decimal mode while failing to resolve in exact mode due to the pole. [plan §12.1] Settled on 2026-10-12 (plan §12.2, conflict 2): both examples are stated without settings-dependent digits; `turn` into `deg` is `=` with a value a little under 360, no figure.

### Q-024. `numbers.md`: the touch rule in comparisons

- Kind: owner decision
- Pages: docs/numbers.md
- Units: A6 Q1 (L411-416)
- Question: Should the user docs' comparison rule state that a bound exactly met decides a non-strict comparison and leaves a strict one undecided, or only that an inexact value at its bound is undecided?
- Proposed answer: A6: one sentence for the non-strict case, since every `>=` condition at absolute zero meets it; the six-row verdict table stays in devdocs. How the devdocs name a touch (a straddle, or an order of its own) is a finding for the pages (A6 (F-029), V4 (F-029), V3's N15 row), not this item.
- Settled by: —
- Blocks: `docs/numbers.md#Comparison and equality`.
- Decision: ok [plan §12.1]

### Q-025. `numbers.md`: which rounding functions decide a value that cannot be told from zero

- Kind: owner decision
- Pages: docs/numbers.md; docs/functions.md
- Units: D6 Q6 (L235)
- Question: Neither corpus says which functions decide a value that cannot be told from zero (D6 (F-031)): it is `= 0` under `trunc`, under `round` in a mode to nearest and under `towardZero`, and undecided under `floor`, `ceil`, `sign` and `round` in `awayFromZero`, `ceiling` and `floor`. Should the user docs state the cell rule?
- Proposed answer: D6: one sentence in `numbers.md`'s "Values at an edge": `trunc`, and `round` in a mode to nearest, decide such a value as `0`, while `floor`, `ceil` and `sign` do not.
- Settled by: —
- Blocks: `docs/numbers.md#Values at an edge`.
- Decision: ok, just make sure the discussion is complete. I think you've captured all of the functions here. [plan §12.1]

### Q-026. `numbers.md`: the one log-space example

- Kind: owner decision
- Pages: docs/numbers.md
- Units: D8 Q1 (L307)
- Question: §12 question 10 gives `numbers.md` "the log-space advice with one example"; the dissolved section has two, the decimal exponent (`1e999 / ln(10)`) and the quotient of exponentials, which teach different moves.
- Proposed answer: D8: the quotient is the worked example and the exponent a closing clause, as drafted.
- Settled by: —
- Blocks: `docs/numbers.md#Values too big to hold`.
- Decision: ok [plan §12.1]

### Q-027. Should the panel show the ceiling ("derived and shown")?

- Kind: owner decision
- Pages: devdocs/settings.md; docs/settings.md
- Units: A3 Q3 (L143)
- Question: `devdocs/settings.md#The model` says the ceiling is "derived and shown", but the panel's precision-limit line gives the range and not the ceiling (`src/settings-lines.ts:147-152`); its number appears only in the probe's proposal (`:243-249`). Should the docs stop saying it is shown, or the panel show it?
- Proposed answer: A3: the docs stop saying so now; V5 rewrites "derived and shown" to "derived, and written as a number only in the probe's proposal"; whether the panel's line should name the ceiling is a UI question outside the revamp. D4 agrees for `docs/settings.md` (D4 (F-126)). V5's full replacement of `#The model` keeps "the ceiling is derived and shown, never set" (V5 (F-331); V5 report L157, L165), and D4 counts the claim as confirmed (D4 L44).
- Settled by: —
- Blocks: V5's replacement of `devdocs/settings.md#The model`.
- Decision: ok [plan §12.1]

### Q-028. A privacy sentence in `docs/app.md`

- Kind: owner decision
- Pages: docs/app.md; devdocs/security.md
- Units: V8 Q4 (L314)
- Question: Should the user page state that the app calls no service and sends nothing, linking to `devdocs/security.md#The page` (V8 (F-171))?
- Proposed answer: V8: yes, one sentence under "Working offline", as V8's draft of `app.md` has it (V8 (F-180)). D9's own draft of `app.md` (D9 (F-180)) has no such sentence; the two drafts of the page overlap.
- Settled by: —
- Blocks: `docs/app.md#Offline use`.
- Decision: ok [plan §12.1] Settled further on 2026-10-13 (plan §12.3, R-1 and R-2): the sentence links `devdocs/security.md#The page`, which may link back, and says, after V8's "Nothing you type leaves the device", that the app calls no third-party service, contacts only the host it was loaded from, and only for its own static files (to load them, and to check for and fetch a new version), and sends that host no local data.

### Q-029. A home for the linking and Markdown principles

- Kind: owner decision
- Pages: devdocs/development.md
- Units: V8 Q5 (L315)
- Question: §12 question 29 names `devdocs/development.md#Style guide` as the home of the documentation principle only; the linking and Markdown principles of `audit/principles.md` have none.
- Proposed answer: V8: they live in the same bullet list, as V8's third bullet proposes, since all three bind every contributor.
- Settled by: —
- Blocks: `devdocs/development.md#Style guide`.
- Decision: ok [plan §12.1]

### Q-030. Who deploys: Workers Builds or a developer's machine

- Kind: owner decision
- Pages: devdocs/deployment.md; devdocs/security.md
- Units: V8 Q1 (L311)
- Question: `devdocs/deployment.md` says Cloudflare Workers Builds runs the build and the deploy; `devdocs/security.md` and `scripts/cloud-env` say a deploy is made from a developer's machine (V8 (F-408)).
- Proposed answer: V8: Workers Builds is the deploy, and the two sentences are rewritten as V8 proposes; if a developer's own `pnpm exec wrangler deploy` with their own login is also supported, `deployment.md` says so in one sentence and `security.md` says the credential is theirs.
- Settled by: —
- Blocks: `devdocs/security.md#Toolchain and secrets`; `devdocs/deployment.md#(top)`.
- Decision: ok. I only use Cloudflare Workers Builds at the moment. [plan §12.1]

### Q-031. The build-error catalogue in `devdocs/architecture.md#Definitions`

- Kind: owner decision
- Pages: devdocs/architecture.md; docs/definitions.md
- Units: V2 Q2 (L299)
- Question: Should the build-error catalogue stay in prose, completed (it omits four kinds: V2 (F-232), A9 (F-233), D2 (F-233)), or shrink to a pointer at `BuildError` in `build.ts`?
- Proposed answer: V2: keep it completed; it is the one prose account of what the build checks, and a reader of the page should not need the source to learn that a condition must mention a parameter. §7 gives `docs/definitions.md` a build-time checks table (error, cause, fix), a confirmed gap (D2 (F-105)), which a completed devdocs catalogue would duplicate.
- Settled by: —
- Blocks: `devdocs/architecture.md#Definitions` (V2's full replacement).
- Decision: ok [plan §12.1]

### Q-032. Why information (`bit`) is a dimension

- Kind: owner decision
- Pages: docs/units.md; code (`src/units.txt`)
- Units: D3 Q4 (L343)
- Question: No page or comment says why `bit` is a dimension primitive rather than a count (`src/units.txt:25` says only "information").
- Proposed answer: D3: the reason in the file's comment and in the primitives section of `units.md`: a count of bits must not collapse into a plain number, so that `bit/s` stays apart from `Hz` as `rad/s` does; if the reason is another, the owner gives it.
- Settled by: —
- Blocks: `docs/units.md`, the primitives.
- Decision: ok [plan §12.1]

### Q-033. The sources: what the file cites, and what `units.md` names

- Kind: owner decision
- Pages: docs/units.md; code (`src/units.txt`)
- Units: D3 Q1 (L340), D3 Q3 (L342), A9 Q8 (L338-340)
- Question: The page names three documents the file never cites (the SI brochure, 9th edition; NIST Handbook 44; the Weights and Measures Act 1985), and the file cites five the page never names (D3 (F-116)). The tropical and sidereal years carry no source comment and are epoch-dependent (`src/units.txt:344-345`). `gravity` is unmarked (`src/units.txt:118`) where the five defining constants say `(exact)`.
- Proposed answer: D3: `units.md` cites what the file cites, as in D3's skeleton, and the file's header gains the three names beside its rule on comments (a code-comment change); the years get a source and an epoch in the comment, and `units.md` names them as measured values written exactly. A9: the comment says "(exact by convention)", a code change for D3's catalogue; D3 agrees that `gravity` is exact by convention (D3 report L91) but does not take up the comment.
- Settled by: —
- Blocks: `docs/units.md#Which factors are exact` (the sources).
- Decision: ok [plan §12.1] The page names the three documents when it is written, and the header gains them in the comment pass after the pages (B-065, Q-059), so that the two agree once it lands.

### Q-034. "`W` is the watt": the Lambert W connection

- Kind: owner decision
- Pages: devdocs/builtins.md
- Units: D5 Q1 (L192)
- Question: Does "`W` is the watt, so neither is free for a constant" (`devdocs/builtins.md#Names`) refer to Lambert's W function, as the removed plan's summary suggests (54aec25, `devdocs/history/calculator-plan.md:2133-2134`, "Lambert's function is `lambertw`")? The design note itself repeats the page's wording, so it does not settle the reason (§12 question 1).
- Proposed answer: D5: yes; D5's edit 7 states it ("Lambert's function, when it comes, is `lambertw`: `e` is the elementary charge in `units.txt` and `W` is the watt, so neither name is free for a function or a constant").
- Settled by: —
- Blocks: `devdocs/builtins.md#Names` (edit 7, pending).
- Decision: ok [plan §12.1]

### Q-035. Where the binary `approx(x, u)`'s tentative design lives

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/future.md
- Units: V1 Q5 (L364)
- Question: `devdocs/numbers.md#approx` carries the binary form's tentative design (the radius rule, the conformance check, the stopping rule for the retry loop, certification at the half-unit), a deferred design with its reasons, which the principle keeps as intent. Does it stay beside the concept, or go to `devdocs/future.md` with the §1.3 intent (#100)?
- Proposed answer: V1: it stays in `#approx`, where C26 places the concept; `future.md`'s entry links to it in one line.
- Settled by: —
- Blocks: `devdocs/numbers.md#approx`; `devdocs/future.md#Extensions that fit`.
- Decision: this is future work and should not get in the way of the numbers description yet. [plan §12.1] Applied as future work: future.md carries #100 and the tentative design (Q-104); numbers.md#approx names the binary form in one clause.

### Q-036. The rounding functions' open cell: record as intent?

- Kind: owner decision
- Pages: devdocs/builtins.md
- Units: A6 Q5 (L431-437)
- Question: `devdocs/builtins.md#The exact functions` says the rounding functions decide a ball "against the open cell", so a ball inside a closed cell that ends exactly on its closed end (`[2, 2.5]` for `floor`) is `unresolved` though every value in it floors to `2` (`src/core/builtins/round.ts:193-194`); the rule is uniform, and the next pass removes the touch.
- Proposed answer: A6: record it as intent in V3's page (a touch is a straddle at every edge, so that no edge check has to know which end of a cell is closed), with no code change. V3's report does not record it.
- Settled by: —
- Blocks: `devdocs/builtins.md#The exact functions` (one sentence).
- Decision: ok [plan §12.1]

### Q-037. The intent for typographic characters in the fields

- Kind: owner decision
- Pages: devdocs/future.md; docs/expressions.md
- Units: D1 Q4 (L691)
- Question: §12 question 11 keeps `×` out of the grammar for now and §1.3 records accepting it as intent. D1's proposed text lists `×`, `·`, `÷`, `−`, superscripts and non-breaking spaces among the errors. Should the intent, when `devdocs/future.md` records it, cover those too?
- Proposed answer: D1: yes, as one intent: accept the characters the screen or pasted text produces where each has one meaning (`×`, `·`, `−`, non-breaking and thin spaces), and keep `÷` and superscripts out unless asked for.
- Settled by: —
- Blocks: `devdocs/future.md#Extensions that fit` (one entry); `docs/expressions.md#What is not accepted`.
- Decision: ok [plan §12.1]

### Q-038. Pointing the pages at the grammar in the parsers' headers

- Kind: owner decision
- Pages: devdocs/architecture.md; devdocs/functions.md; docs/expressions.md; plan (§2.1.3)
- Units: D1 Q1 (L688)
- Question: §2.1.3 says no EBNF for expressions exists anywhere, but `src/core/expr.ts:6-19` holds one, accurate against the parser, and `src/core/definitions.ts:20-32` one for the definition lines (the plan error is D1 (F-500)). Should the pages point to them?
- Proposed answer: D1: `docs/` keeps prose and the precedence table, as §2.1.3 decides; `devdocs/architecture.md#Expressions` names the header grammar as the hand-maintained form until the DSL generates one (§1.3), quoting none of it, so that the header stays the one copy. V4 does the same for the definition lines in `devdocs/functions.md#Definitions` (V4 (F-305)).
- Settled by: —
- Blocks: `devdocs/architecture.md#Expressions` (one sentence).
- Decision: ok [plan §12.1]

### Q-039. GNU units in devdocs and in the grammar reference

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/architecture.md; docs/expressions.md
- Units: A1 Q6 (L309-313), D1 Q2 (L689)
- Question: §12 question 2 bars GNU units from the numeric semantics of docs/ and is silent on devdocs. `devdocs/numbers.md#(top)` names GNU units' decimal `pi` as the contrast to `pi()`; `devdocs/architecture.md:354-355` says the precedence follows GNU units, which `src/core/expr.test.ts:150` repeats and nothing in the tree confirms (D1 (F-240)).
- Proposed answer: A1: keep the rationale without the name ("where a decimal literal for `pi` is exact to its digits and wrong past them"); V1 does so (V1 (F-183)). D1: devdocs keep one clause as the precedence's rationale, a familiar convention for `kg m / s^2`; the user reference says nothing of GNU units for the grammar, since a likeness stated there would owe the differences (`|` and `**` are errors here). V2's replacement of `devdocs/architecture.md#(top)` keeps "in the lineage of GNU units" (V2 (F-001)). The owner says whether question 2's rule reaches devdocs.
- Settled by: —
- Blocks: nothing (one clause each in `devdocs/numbers.md#(top)`, `devdocs/architecture.md#(top)` and `#Expressions`).
- Decision: ok [plan §12.1]

### Q-040. A literal past the significand limit in decimal mode: refused by intent?

- Kind: owner decision
- Pages: docs/numbers.md; docs/expressions.md; devdocs/numbers.md; plan (N17)
- Units: A4 Q3 (L134), D1 Q9 (L696)
- Question: A literal past the significand limit is refused in decimal mode rather than rounded as read (`src/core/evaluate.ts:510-519`, deliberately "in either mode"), so the "rounded as read" of N17 and of `devdocs/numbers.md#Decimal mode > A literal` holds only within the limit. Intended?
- Proposed answer: A4: yes, since the limit refuses before anything is formed; document it in one clause (A4's `#Decimal mode` edit). D1: one clause in the decimal-mode rules, and the literal-limits text says "in both modes". V1 rewrites the page the same way (V1 (F-041)). The code comment marks the behaviour deliberate.
- Settled by: —
- Blocks: nothing (the clause documents today's behaviour either way).
- Decision: ok. This prevents silently losing data or precision, which is exactly the behavior I want. [plan §12.1]

### Q-041. The dalton's CODATA edition

- Kind: owner decision
- Pages: docs/units.md; code (`src/units.txt`)
- Units: D3 Q2 (L341)
- Question: The file's dalton is CODATA 2018 (`src/units.txt:267`); CODATA has since published a 2022 adjustment.
- Proposed answer: D3: `units.md` says what the file says, "CODATA 2018"; whether the file follows an adjustment, and when, is the owner's call, recorded in the file's comment.
- Settled by: —
- Blocks: nothing (the page states the file's edition).
- Decision: ok [plan §12.1]

### Q-042. Close issue #89?

- Kind: owner decision
- Pages: devdocs/numbers.md
- Units: V1 Q1 (L360)
- Question: #89 looks resolved in code: the prediction bounds the bits as the issue's "Done when" asks (`src/core/rational.ts:410-437`), and all five rows the issue lists agree today (V1 (F-199)). Close it, and delete the page's clause?
- Proposed answer: V1: yes, after the tests the issue asks for are checked in `src/core/rational.test.ts` (outside V1's reading); the clause goes either way, the behaviour it describes being gone (§12 question 26).
- Settled by: —
- Blocks: nothing (`devdocs/numbers.md#Roots and powers` drops the clause either way).
- Decision: ok [plan §12.1] The closing of #89 is housekeeping the owner confirmed on 2026-10-12 (plan §12.2, item 15): close it once its tests are confirmed (B-033).

### Q-043. The ratio notation's screen rejects dyadic values that fit

- Kind: owner decision
- Pages: devdocs/notation.md; docs/settings.md; plan (N13)
- Units: V5 Q1 (L236)
- Question: `ratioParts` (`src/core/display.ts:134-136`) rejects, before forming a fraction, any value whose canonical exponent lies beyond `2W` in magnitude or whose canonical numerator has more than `2W` digits, which excludes dyadic values the rule admits (`2^-41` to `2^-63`, `3/2^45`, `1/(7*2^41)` at the default width). A code fix, or a page caveat?
- Proposed answer: V5: a code fix: screening the exponent at `4W` and the numerator's digits at `3W` keeps the fraction from being formed for a value that cannot fit, admits every value that can, and costs nothing at those sizes; until it lands, one sentence in `#The rule` names the exception and links the issue, if one is opened; N13 then stands as the plan writes it.
- Settled by: —
- Blocks: nothing (`devdocs/notation.md#The rule` takes a caveat until the fix).
- Decision: ok [plan §12.1]

### Q-044. `mod`'s alignment refusal: `exceeds` or `fits`

- Kind: owner decision
- Pages: devdocs/builtins.md
- Units: D6 Q2 (L231)
- Question: `mod(-1, 1e20000)` is refused "however it is computed" (reach `exceeds`, no count), yet `approx` around either argument gives `≈ 1e+20000` (D6 (F-284)). Change the code?
- Proposed answer: D6: the two `tooLarge("exceeds", UNKNOWN_NEED)` of `modBall`'s exact path become `fits` with the need `subtract` or `multiply` reports, and D6's edit (e) takes its first form; otherwise its second ("names no count and offers no remedy, though `approx` …").
- Settled by: —
- Blocks: `devdocs/builtins.md#The exact functions` (which of D6's two texts applies).
- Decision: ok [plan §12.1]

### Q-045. A typed list's unit that may be zero is not retried

- Kind: owner decision
- Pages: devdocs/architecture.md; docs/quantities.md
- Units: A8 Q4 (L149)
- Question: A unit of a typed list whose ball contains zero is `nonpositiveUnit` and never retried, where the same expression as a single want is retried (`src/core/pipeline.ts:394-404`). State the accepted gap on the page, or retry `nonpositiveUnit` when the unit's ball contains zero without being certainly nonpositive?
- Proposed answer: A8: state it now; the retry is a small change that could ride the work on #92, which reshapes what the loop retries.
- Settled by: —
- Blocks: nothing (the page states today's behaviour).
- Decision: ok [plan §12.1] Confirmed on 2026-10-12 (plan §12.2, item 14): no `future.md` entry; the retry is issue #198, which `devdocs/architecture.md#Unit lists` links once beside the gap it states (Q-012's rule for a bug, B-010) and the user docs do not name. The link is kept (plan §12.3, R-3).

### Q-046. The reciprocal line in decimal mode with extended working digits

- Kind: owner decision
- Pages: devdocs/numbers.md; docs/numbers.md; docs/quantities.md
- Units: A4 Q1 (L132)
- Question: In decimal mode the reciprocal line is `1 / value` of the shown `p`-digit ratio (`src/outcome.ts:332`), so with extended working digits it is not the correctly rounded reciprocal of the exact ratio (`3 m` in `in`: `0.0084666664` shown, `0.0084666667` exact). Keep and document, or compute it as `want / have` from the working-digit operands?
- Proposed answer: A4: keep and document, as A4's `#The working digits` edit does (V1 the same, V1 (F-043)), and record the alternative on #92, which owns what the reciprocal lacks from the pipeline.
- Settled by: —
- Blocks: nothing (documented as today's behaviour).
- Decision: ok [plan §12.1] The alternative was recorded on #92 in a comment on 2026-10-13.

### Q-047. The schedule's cost bound: reword, or change `workingContexts`

- Kind: owner decision
- Pages: devdocs/numbers.md
- Units: A3 Q1 (L141)
- Question: "The passes together cost at most about twice the pass that succeeds" fails where the ceiling lies just above a doubled precision (passes 11, 22, 44, 45 at one digit under a ceiling of 45; 18 … 2304, 2308 at eight digits under a limit of 567), the passes then costing about three times the last (A3 (F-064)). Reword the sentence, or change `workingContexts` to skip a doubled precision within some fraction of the ceiling, which makes the sentence exactly right and changes the passes some settings run, and the stress catalogue's pass counts with them?
- Proposed answer: A3: the wording now (V1's edit does it, V1 (F-064)); the code change, if wanted, as its own change after the revamp.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1] Confirmed on 2026-10-12 (plan §12.2, item 14): no `future.md` entry; the schedule change is issue #199, which `devdocs/numbers.md#Working precision and the schedule` links once beside the edge it states (Q-012's rule, B-011). The link is kept (plan §12.3, R-3).

### Q-048. `log`'s exact cases for a rational exponent

- Kind: owner decision
- Pages: devdocs/numbers.md; devdocs/builtins.md; docs/functions.md
- Units: A4 Q2 (L133), A4 Q5 (L136)
- Question: `log`'s exact cases cover an integer exponent and its reciprocal only (`src/core/builtins/log.ts:21-24`, "a rational exponent in general is not looked for"), so `log` reaches the uncertified fallback (`log(256, 512)` at three digits) and the partial note in exact mode (`log(4, 8)` at one digit). Look for `x^q = b^p`?
- Proposed answer: A4: document the fallback as reachable now (V1 does, V1 (F-042)) and leave the exact case to D5's review of the logarithm family; the decision on #173 (decide a tie as exact instead of flagging it) would make these lines `=` as well. D5 confirms the exact cases as they are (D5 report) and does not weigh the rational case.
- Settled by: —
- Blocks: nothing (the pages state today's behaviour).
- Decision: ok [plan §12.1] Confirmed on 2026-10-12 (plan §12.2, item 14): no `future.md` entry; the exact cases for a rational exponent are issue #200, linked once from the logarithm row of `devdocs/builtins.md#Domains, exact cases and edges` (Q-012's rule, B-007); the pages state the fallback as reachable. The link is kept (plan §12.3, R-3).

### Q-049. A stored ratio width out of range resets the whole mode

- Kind: owner decision
- Pages: devdocs/settings.md
- Units: D4 Q6 (L408)
- Question: A stored ratio width outside 1 … 1,000 makes the whole mode fall back to exact mode with digits (`src/settings.ts:397-427`), while a stored extended count outside its range is clamped (`:429-443`, `:553-558`). Intended asymmetry?
- Proposed answer: D4: state it in `devdocs/settings.md#Storage` (V5), or clamp the width like the count; the owner's call.
- Settled by: —
- Blocks: `devdocs/settings.md#Storage` (one sentence, if the asymmetry stays).
- Decision: B [plan §12.1]

### Q-050. Fix `gcd(a, 0)`

- Kind: owner decision
- Pages: docs/functions.md; devdocs/builtins.md
- Units: D6 Q1 (L230), V3 Q1 (L754)
- Question: `gcd(a, 0)` is wrong for every `a` above one (`gcd(5, 0)` is `2`; D6 (F-285), V3 (F-285)), where the page states the intent, `gcd(a, 0)` the magnitude of `a` (D6 report), and no test covers a zero argument.
- Proposed answer: D6 and V3: a code fix outside the audit, in `gcdOfIntegers` (`src/core/builtins/integers.ts:55-58`, returning the other argument's magnitude when one is zero) or in `rational.ts`'s `gcd` (made total, its precondition widened), with `gcd(5, 0)`, `gcd(0, 5)`, `gcd(0, 0)`, `gcd(-10, 0)` and `lcm(5, 0)` added to `src/core/builtins/integers.test.ts` and a zero in either position to `exact.test.ts`; the page's statement stands as the specification.
- Settled by: —
- Blocks: nothing (the page's statement stands).
- Decision: ok [plan §12.1]

### Q-051. Wording of the size refusal with no count

- Kind: owner decision
- Pages: docs/numbers.md (quoted messages); code (`src/messages.ts`)
- Units: A5 Q2 (L470-475), D7 Q3 (L249)
- Question: A refusal whose need is unknown reads "would need a significand, past the significand limit, however it is computed" (`floor(10^30000/3)`; `src/messages.ts:357-360`, the comma left behind when `bitsNeeded` is empty), and a `fits` one with no count "would need a significand as an exact value, past the significand limit" (`pow(1 + 1e-19000, 1e19000)`). Reword in the message work of §12 question 6?
- Proposed answer: A5: yes, to "would need a significand past the significand limit" in both. D7: "would need a significand past the significand limit, however it is computed". The two agree on the comma and may differ on keeping "however it is computed".
- Settled by: —
- Blocks: nothing.
- Decision: A [plan §12.1]

### Q-052. Bit counts past a double's integers

- Kind: owner decision
- Pages: none (message text)
- Units: A5 Q3 (L476-479)
- Question: `bitsNeeded` prints a count past a double's integers with its noise ("about 7,988,684,686,773,075,000 bits" for `2.54^1e18`, `src/messages.ts:372-381`). Round such a count?
- Proposed answer: A5: yes, in the code phase, to two significant digits above `2^53`.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-053. The edge message's "which side of it it lies"

- Kind: owner decision
- Pages: none (message text)
- Units: A6 Q3 (L422-426)
- Question: The message for a `pole` or `bound` edge ends "and the result depends on which side of it it lies" (`src/messages.ts:94`; `tan(90 deg)`).
- Proposed answer: A6: a code change outside the audit, naming the edge once more in short ("which side of the pole", "which side of the bound"), recorded as the "certain" wording was (§12 question 8).
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-054. The errors for `round`'s second argument

- Kind: owner decision
- Pages: none (message text; the generated catalogue)
- Units: D6 Q3 (L232)
- Question: `round`'s second-argument errors are worded for a function of integers (`"1.5" is not a whole number, and "round" is defined only for whole …`; `src/messages.ts:241-244`, `src/core/builtins/round.ts:356`; D6 (B-016)).
- Proposed answer: D6: `src/messages.ts` words `notInteger` and `notExact` by the argument's place where the function's first argument need not be an integer, for example "the number of places of `round` must be a whole number".
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-055. The parse label "a unit name"

- Kind: owner decision
- Pages: docs/expressions.md (the generated errors)
- Units: D1 Q5 (L692)
- Question: The parser labels every name, a function's included, "a unit name", by design so that a call and a name are not listed apart (`src/core/expr.ts:342-349`).
- Proposed answer: D1: rename the label to "a name" in a code change of its own; the order of the labels is the order tried and can stay.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-056. The empty output area's hint leads with conversion

- Kind: owner decision
- Pages: docs/app.md; docs/getting-started.md
- Units: D9 Q1 (L315)
- Question: The hint reads "Type a quantity, such as `3 ft`, and the unit to convert it to, such as `in` or `ft;in`" (`src/unit-converter.ts:255-258`), where §12 question 2 has the calculator lead.
- Proposed answer: D9: "Type an expression, such as `sqrt(2)` or `3 ft`, and, to convert it, the unit you want, such as `in` or `ft;in`.", a code change outside the audit.
- Settled by: —
- Blocks: nothing (`docs/app.md#The two fields` describes whichever hint ships).
- Decision: ok [plan §12.1]

### Q-057. An internal kind name in the load-failure message

- Kind: owner decision
- Pages: docs/app.md
- Units: D9 Q3 (L317)
- Question: The failure message shows an internal kind name, "The unit definitions could not be loaded (fetchFailed)." (`src/app-shell.ts:264`), where §12 question 6 keeps internal kind names out of the docs.
- Proposed answer: D9: the app keeps it, since it is what a bug report needs, and `app.md` describes the message without quoting the parenthesis; the alternative, the kind on the console alone, is a code change.
- Settled by: —
- Blocks: `docs/app.md` (how the failure is described).
- Decision: ok [plan §12.1]

### Q-058. `exceeds` for the hull of a wide argument

- Kind: owner decision
- Pages: devdocs/builtins.md
- Units: A5 Q4 (L480-486)
- Question: The hulls of `erf`, the incomplete Gamma and the incomplete Beta functions over a wide argument refuse as `exceeds` with no count when the argument's two ends cannot be aligned within the limit (`src/core/builtins/erf.ts:193-195`, `incomplete.ts:295-297`, `incbeta.ts:497-499`). Is `exceeds` the right word, the argument's width rather than the step being what passes the limit?
- Proposed answer: A5: leave the code; D7 states that a wide argument is refused as the step's reach. D7's report does not take it up.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-059. Code comments that contradict the code or the pages, or carry history: one pass, and when

- Kind: owner decision
- Pages: none (code comments); devdocs/development.md (the style guide's rule on comments)
- Units: A3 Q8 (L148), A5 Q1 (L463-469), A6 Q4 (L427-430), A7 Q1 (L319-331), A8 Q5 (L150), A9 Q7 (L331-337), D2 Q4 (L464), D4 Q4 (L406), D5 Q8 (L199), D6 Q9 (L238), D7 Q4 (L250), D9 Q2 (L316), V1 Q7 (L366), V3 Q6 (L759), V4 Q5 (L562), V7 Q2 (L323), V8 Q2 (L312)
- Question: The units list code comments that no unit may change. Comments that contradict the code or the pages: A3 (`src/core/pipeline.ts:77-79`, `src/core/context.ts:230-234`, `src/core/context.test.ts:140-142`; `src/core/pipeline.ts:85-87`; "four times the precision limit plus the guard" at `src/core/pipeline.ts:296-297`, `src/core/context.ts:51`, `:207`, `src/core/context.test.ts:176`; `src/settings.ts:159-163`); A6 (`src/core/ball.ts:409-416`, `src/core/pipeline.ts:871-875`); A7 (`src/core/quantity.ts:17-20`; `src/core/dimension.ts:191`; "dimensionless markers" at `src/core/dimension.ts:13`, `src/core/definitions.ts:11`, `:123`); A8 (`src/core/convert.ts:132-138`, `src/core/pipeline.ts:16-17`, `:95`); D4 (`src/settings-lines.ts:258`); D6 (the header of `src/core/builtins/approx.ts`); D7 (`src/core/builtins/gamma.ts:46-47`, `beta.ts:26`); V3 (`src/core/builtin.ts:167`, `fixed-gamma.ts:17`, `builtins/gamma.ts:44`, `builtins/hyperbolic.ts:63`, `:219`); V4 (the `1e30000` example at `src/core/dimension-of.ts:26-28`); D9 and V8 ("from the settings" at `src/register-service-worker.ts:26`, `src/service-worker-updates.ts:255`; `scripts/cloud-env:8-9`, `:26-27`); V7 (the figure at `bench/names.bench.ts:24-26`); A9 (`src/system-build.ts:2`, `src/system-table.ts:10` cite `devdocs/architecture.md`, "The shell and its parts", for the table at the ceiling, which `devdocs/numbers.md#Working precision and the schedule` states). Comments that carry history the style guide's rule will forbid: A5 (`src/core/ball.ts:52-53`, `:83-86`, `:708-709`, `:988-989`, `:995`; `src/core/scaled.ts:34-36`, `:591-593`; `src/core/rational.ts:27-28`); V1 (`src/core/fixed.ts:28-33`, `src/core/constants.ts:26-29`, `:65-66`, `src/core/scaled.ts:1058-1062`, `src/core/ball.ts:986-995`, `src/core/bernoulli-ratios.ts:5-9`); A5, V1, V3 and D5 (`src/core/builtins/pow.ts:17-20`); D5 and V3 (`builtins/inverse-trig.ts:72`); D5 (`builtins/exp.ts:19-20`); V3 (`builtins/incomplete.ts:41-43`); A8 (`src/core/convert.ts:45-48`); D2 and V4 (`src/core/build.ts:50-53`, `src/core/dimension-of.ts:3-4`). When, and in which commit, are they fixed?
- Proposed answer: one comment commit after the audit, outside the revamp (A3, V3; A7, in the direction `src/core/evaluate.ts:7-11`'s note sets, module headers restating less of the architecture page); one commit beside V8's edit to `devdocs/development.md#Style guide`, for the history (A5, V1); in the change that applies the page edits (A8, D9, D7; A6, when the page is fixed); a code change outside the audit (D2, D5, V4; V8, recorded for the owner); with A2's code change (D4); when the structured comments are written (D6, §4); V2 confirms that the shell section carries the table's design, or the comments repoint at `numbers.md` (A9). bugs.md lists each comment as a defect.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-060. The units test's wording and its failure message

- Kind: owner decision
- Pages: devdocs/development.md (`#Adding a unit`); code (`src/units.test.ts`)
- Units: D2 Q5 (L465), D3 Q6 (L345)
- Question: `src/units.test.ts`'s header and a test's name say the primitives are the SI base units (`:2-3`, `:186`) while the assertion includes `bit`; a test name and comments call the temperature differences "intervals" (`:289`, `:463-465`), against §12 question 19; and a failing build reports character offsets, not a line (`:72-78`).
- Proposed answer: D2: "temperature difference", a code change recorded with A2's note-wording change. D3: fix the comments with the next change to the test and have the failure name the line, both outside the unit; `devdocs/development.md#Adding a unit` is worded as the test behaves today.
- Settled by: —
- Blocks: nothing (D3's `#Adding a unit` text describes today's test).
- Decision: ok [plan §12.1]

### Q-061. Counts in `cost.md`'s prose: drop, or generate

- Kind: owner decision
- Pages: devdocs/cost.md
- Units: V6 Q2 (L224)
- Question: The prose of `devdocs/cost.md` states counts that change with every run (runs, cases measured, entries typed, keystrokes, slow keystrokes; V6 (F-353)). Should the tool write a summary line between markers so that the prose can state them, or are they dropped for good?
- Proposed answer: V6: dropped now; a generated summary is a small addition to `tooling.ts`'s `update` for later, since the tool already owns both tables.
- Settled by: —
- Blocks: nothing (V6's rewrite drops them).
- Decision: ok [plan §12.1] The generated summary line is issue #201 (opened on 2026-10-12; plan §12.2, item 14): no `future.md` entry, and the page does not link it.

### Q-062. The hangs table's Issue column as links

- Kind: owner decision
- Pages: devdocs/cost.md
- Units: V6 Q3 (L225)
- Question: The generated hangs table's Issue column is emitted as bare numbers (`bench/stress/catalogue.ts:561`). Should it emit inline links once `cost.md` owns those issues?
- Proposed answer: V6: yes, a one-line change to `hangsTable`; it follows the kernel-cost issue item above.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-063. The note when no digit is certified ("0 of 1 digits")

- Kind: owner decision
- Pages: docs/numbers.md; devdocs/numbers.md; code (`src/outcome.ts`)
- Units: A2 Q3 (L146), V3 Q5 (L758)
- Question: The note for one digit asked reads "0 of 1 digits are certified" (live: `sqrt(2)^2 * 0.75` at one digit), and the directed modes show "0 of 8 digits"; V3 asks A2 to check the note's wording for zero certified digits.
- Proposed answer: A2: leave it; the case is a value on a one-digit tie at one display digit.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-064. "certifies" in the index's opening sentences

- Kind: owner decision
- Pages: docs/README.md
- Units: D9 Q5 (L319)
- Question: D9's index says the app "computes exactly wherever it can, certifies every digit it shows otherwise", which puts "certifies" before a reader who has not met it.
- Proposed answer: D9: keep it, since getting started's second section defines it and the word is the one §12 question 8 settles on; the alternative is "and says how many digits it is sure of".
- Settled by: —
- Blocks: `docs/README.md#(top)` (D9's draft).
- Decision: A [plan §12.1]

### Q-065. "the conformance tests" in `development.md`'s command table

- Kind: owner decision
- Pages: devdocs/development.md; terminology
- Units: V8 Q8 (L318)
- Question: The command table's "the edge sweeps, the conformance tests" uses "conformance", which §8 keeps for quantities (V8 (F-462)).
- Proposed answer: V8: "the edge sweeps".
- Settled by: —
- Blocks: nothing.
- Decision: ok. Note that the edge sweeps behave as "conformance tests", but we haven't standardized that terminology yet, and "edge sweeps" is precise and correct. [plan §12.1]

### Q-066. `log10(1e999999999)`: the value or the line

- Kind: owner decision
- Pages: devdocs/builtins.md
- Units: D5 Q9 (L200)
- Question: The page says `log10(1e999999999)` is "exactly `999999999`", which is true of the value and not of the line at eight digits (`≈ 1e+9`; D5 (F-267)).
- Proposed answer: D5: keep the page's statement, since the section is about the value and N10 owns the display policy; the generated entry can show both.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-067. The incomplete functions' refusals move with the precision

- Kind: owner decision
- Pages: docs/functions.md
- Units: D7 Q5 (L251)
- Question: Should the docs say that the incomplete functions' "past some millions" refusals move with the precision?
- Proposed answer: D7: yes, by the words "at a high precision", as D7's bullet edits apply them (D7 L161-165, D7 L173-181).
- Settled by: —
- Blocks: nothing (within the interim `docs/functions.md` item above).
- Decision: ok [plan §12.1]

### Q-068. `architecture.md`'s list of sister pages

- Kind: owner decision
- Pages: devdocs/architecture.md; devdocs/README.md
- Units: V2 Q5 (L302)
- Question: The top of `devdocs/architecture.md` lists eight sister pages and omits five (V2 (F-222)). Replace the list with a pointer at `README.md`'s map, or complete it?
- Proposed answer: V2: the pointer, so that the index is kept in one place (V2 (F-222)); §12 question 18 makes `devdocs/README.md` the developer index.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-069. A stored version above the build's: the console warning

- Kind: owner decision
- Pages: devdocs/settings.md
- Units: V5 Q6 (L241)
- Question: `devdocs/settings.md#Storage` says such an object is "treated like text that failed to parse"; the code also writes a warning to the console naming both versions (`src/settings.ts:328-332`; V5 L241).
- Proposed answer: V5: the page stays as it is; a console diagnostic is not a behaviour a reader of the page needs.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-070. Why the project keeps `experimentalDecorators`

- Kind: owner decision
- Pages: devdocs/layout.md
- Units: V7 Q1 (L322)
- Question: `devdocs/layout.md#The files` keeps `experimentalDecorators` "because Vite does not yet transform standard (TC39) decorators", a statement about a dependency that moves, pinned at `vite` 8.2.2, which V7 could not check from the tree (V7 (F-365)).
- Proposed answer: V7: verify it against the pinned Vite before the page is next edited; if still true, drop "yet" ("because Vite's TypeScript transform does not handle standard decorators"); if not, state the reason the project keeps the legacy flag, or remove the sentence with the flag. Unverified.
- Settled by: —
- Blocks: nothing.
- Decision: other: drop the clause about Vite. `devdocs/layout.md` keeps the flag with its real reason: the components use Lit's decorators in TypeScript's experimental form, which needs `experimentalDecorators` and `useDefineForClassFields: false` in `tsconfig.base.json`, as [Lit's decorators page](https://lit.dev/docs/components/decorators/) describes. Moving to standard decorators, or away from decorators, is a possible code change if the flag becomes a pain point; it is not page content. [plan §12.1]

### Q-071. `audit/` and `.claude/skills/` in `layout.md`

- Kind: owner decision
- Pages: devdocs/layout.md
- Units: V7 Q3 (L324)
- Question: Both are in the tree and not listed in `devdocs/layout.md#The files` (V7 (F-364)).
- Proposed answer: V7: not listed while the revamp runs, since `audit/` leaves when the revamp lands (§12 question 29) and the skill with it; if either is to stay, one bullet each.
- Settled by: —
- Blocks: nothing.
- Decision: ok. As noted above, these will be dropped after the doc refactor finishes and I don't want them mentioned elsewhere. [plan §12.1]

### Q-072. `exact.test.ts` in the module table

- Kind: owner decision
- Pages: devdocs/layout.md
- Units: V7 Q4 (L325)
- Question: `src/core/builtins/exact.test.ts` is the one test beside no module, which the layout rule does not state (V7 (F-363)). Where does the page name it?
- Proposed answer: V7: keep it in the module table, as the sweeps are, and name it in the `src/core/` bullet (V7's edit), rather than move it into prose; the table is where a reader looks for a file.
- Settled by: —
- Blocks: nothing.
- Decision: ok [plan §12.1]

## Plan correction

### Q-073. Plan N8: "four times the precision limit plus ten"

- Kind: plan correction
- Pages: plan; docs/numbers.md
- Units: A3 Q9 (L149)
- Question: N8 carries the wording A3's finding 1 corrects ("four times the precision limit plus ten", read as `4L + 10`); the plan is read-only for a unit.
- Proposed answer: A3: the owner amends N8 to the corrected statement (`4 × (L + 10)`, "four times the sum of the precision limit and ten") when the reports are merged.
- Settled by: F-508, F-022
- Blocks: nothing (N8 reaches `numbers.md` through D8, whose wording follows the ceiling-formula item above).
- Decision: ok [plan §12.1]

### Q-074. Plan §1.1.6 item 1, §1.2.4 and §5 C1, C4: the notes' module; the want is not parsed again

- Kind: plan correction
- Pages: plan
- Units: A2 Q6 (L149), V2 Q6 (L303)
- Question: §1.1.6 item 1 names `src/messages.ts` for the notes, which are worded in `src/outcome.ts:504-517`; §1.2.4 and the §5 entries for C1 and C4 name "`outcome.ts`' parsing of the `want` again" as a devdocs mechanism, while the code hands the parsed `want` back in the `Conversion` (`src/core/pipeline.ts:215-262`, `src/outcome.ts:380-384`).
- Proposed answer: A2: correct the plan (no wording given). V2: no change to the plan; the report records it, and the page's edit states the current mechanism. The two differ on whether the plan is amended.
- Settled by: F-506, F-505
- Blocks: nothing (the page edits, A2 (F-253) and V2 (F-253) to V2 (F-253), state the mechanism).
- Decision: ok [plan §12.1]

### Q-075. Plan §7 and claim Q9: names absent, or meaning something else

- Kind: plan correction
- Pages: plan; docs/units.md; docs/expressions.md
- Units: D1 Q7 (L694), D3 Q5 (L344)
- Question: §7's `units.md` skeleton lists "Names deliberately absent (`u`, `at`, `dB`, `e`)", but `e` is the elementary charge (`src/units.txt:113`), and `at`, absent as the technical atmosphere, reads as `a` + `t`, an attotonne (`1 at = 1e-15 kg`); the file has no unit `a` (the are is `are`). Claim Q9 says "`u`, `at` are absent".
- Proposed answer: D3: the bullet becomes "names that are absent or mean something else (`u`, `at`, `dB`, `e`, `rad`)", which D3's skeleton carries (D3 (F-112)). D1: the units guide notes both, and Q9's "`u`, `at` are absent" gains "`at` reads as `a` + `t`"; D1's proposed `#Names` text says "`at` reads as `a` + `t`, an attotonne, which converts to no pressure".
- Settled by: F-502, F-112
- Blocks: `docs/units.md#Names deliberately absent` (its title and list).
- Decision: ok [plan §12.1]

### Q-076. Plan §11: the module of `MIN_SIGNIFICAND_LIMIT_BITS`

- Kind: plan correction
- Pages: plan
- Units: V7 Q7 (L328)
- Question: §11 lists `MIN_SIGNIFICAND_LIMIT_BITS` under `src/core/rational.ts`; it is defined in `src/core/context.ts:269` (derived from `ceilingFor(1)`), and `rational.ts` holds only `MAX_SIGNIFICAND_LIMIT_BITS`.
- Proposed answer: V7: correct the row in §11.
- Settled by: F-503
- Blocks: nothing.
- Decision: ok [plan §12.1]

### Q-077. Plan §9.2: `layout.md#The files` does not re-explain user semantics

- Kind: plan correction
- Pages: plan; devdocs/layout.md
- Units: V7 Q8 (L329)
- Question: §9.2's row lists `devdocs/layout.md#The files` among the devdocs passages that re-explain user semantics after pointing at docs; the bullet is one sentence and a link.
- Proposed answer: V7: strike `layout.md` from that row.
- Settled by: F-366
- Blocks: nothing.
- Decision: ok [plan §12.1]

## Settled by a finding

### Q-078. N10's partial kind is reachable today

- Kind: settled by a finding
- Pages: devdocs/numbers.md; docs/numbers.md; plan (N10, §1.1.6 item 13)
- Units: A4 Q4 (L135), D5 Q4 (L195), D6 Q8 (L237), V3 Q5 (L758)
- Question: Several units tell A2 that the partial kind is reachable from shipped inputs, not only through the undesigned two-argument `approx`: in exact mode `log(256, 512)` at three digits shows `≈ 1.1 (2 of 3 digits are certain)` and `log(4, 8)` at one `≈ 2 (0 of 1 digits are certain)` (A4); under a directed mode `approx(1)`, `approx(2)`, `cosh(1e-999999999)`, `exp(1e-999999999)` and `cos(1e-999999999 radian)` show `≈ 1` or `≈ 2` with no digit certified (D5, D6, V3).
- Proposed answer: A2 records it, as the one route to the partial note today (D5), for A2's finding (D6), and checks the note's wording for zero certified digits (V3; that part is the "0 of 1 digits" item above).
- Settled by: F-023 (two routes: an identity through an irrational step whose value sits on a rounding boundary, and any ball straddling a grid point under a directed mode), F-023 (V1 (F-023))
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-079. "A fourth source of inexactness" in `#The significand limit`

- Kind: settled by a finding
- Pages: devdocs/numbers.md
- Units: A1 Q1 (L285-287)
- Question: `devdocs/numbers.md#The significand limit` calls the rejected rounding "a fourth source of inexactness"; with N3 corrected it is a third.
- Proposed answer: A1: V1 recounts when it rewrites the page.
- Settled by: F-010 (V1 (F-010): "fourth source" → "third source"). The count rests on N3's correction (A1 (F-010): two sources), which A5's report states both ways (A5 report: "exactly two ways" in its claims table, "exactly three sources" confirmed in its findings).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-080. `widened`'s behaviour (plan §1.1.6 item 8)

- Kind: settled by a finding
- Pages: plan (N23); devdocs/numbers.md
- Units: A1 Q4 (L299-303)
- Question: `widened` takes the larger of the ball's own radius and one unit in the last digit of the working grid, never narrows, is idempotent, and returns a zero midpoint or an unbounded ball as it is (`src/core/ball.ts:1158-1163`).
- Proposed answer: A1: A5 records it as confirmed.
- Settled by: A1 L299-303; A5's confirmed statements A5 report and A5 report (§1.1.6 item 8 confirmed).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-081. "eight by default, as GNU units shows"

- Kind: settled by a finding
- Pages: docs/settings.md
- Units: A2 Q8 (L151)
- Question: `docs/settings.md:36` frames the display digits' default by GNU units.
- Proposed answer: A2: the phrase goes.
- Settled by: §12 question 2, which names this note; F-118, F-118 (A3 (F-118))
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-082. `docs/settings.md`'s backticked devdocs names

- Kind: settled by a finding
- Pages: docs/settings.md; docs/numbers.md
- Units: A1 Q7 (L314-316), A2 Q7 (L150)
- Question: `docs/settings.md` names devdocs pages in backticks, six places by A1's count and seven by D4's, against the ownership direction (§9.2): among them the "Why four times the limit plus ten" line of `#How a number is held…`, and `:91` ("`devdocs/notation.md` is the design"), whose Notation bullet restates `devdocs/notation.md#The rule`.
- Proposed answer: A1: D4 and D8 make them repo-relative links, as A1's last interim edit does for its one (a link down to `../devdocs/numbers.md`). A2: once `numbers.md` owns how an exact value is written (§5 C29), the Notation bullet reduces to the setting and a link.
- Settled by: F-134 (D4's full replacement links each to the owning docs page), F-134, F-134; F-026 drops the "Why four times …" line, `numbers.md#Digits you can trust` linking devdocs at the section level (§7.1). A1's interim edit, a docs → devdocs link, is superseded.
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-083. `numbers.md`: an exact operand rounded into an inexact result

- Kind: settled by a finding
- Pages: docs/numbers.md
- Units: A1 Q8 (L317-321)
- Question: Should `docs/numbers.md` state the rounding of an exact value in a sum, product or quotient with an inexact one (the `onGrid` case), or leave it to devdocs?
- Proposed answer: A1: one sentence in docs, as in A1's third `docs/settings.md` edit, since it says what the error radius of such a result covers; the mechanism stays in devdocs.
- Settled by: F-019 (D8's drafted `#How a value is held` states it, with A5's sharpening), F-019
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-084. "A rounding adds half a grid cell to the radius"

- Kind: settled by a finding
- Pages: docs/numbers.md; devdocs/numbers.md
- Units: D8 Q6 (L312)
- Question: `docs/settings.md:228` says a rounding adds half a grid cell to the radius; D8 did not verify it (D8 (F-017)), and D8's draft says only that each rounding is charged to the error radius.
- Proposed answer: D8: A3 settles it and `devdocs/numbers.md#Settling` states the exact charge.
- Settled by: A3's confirmed statement A3 report: `gridded` rounds an inexact midpoint `halfEven` to the pass's working digits and, when the rounding moved it, adds half a unit in the last working digit (a whole unit, rounding `towardZero`, where the rounding's exponent would pass `MAX_EXPONENT`); A3 report finds `#Settling` correct as it stands. F-017
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-085. Naming the measured factors

- Kind: settled by a finding
- Pages: docs/units.md; docs/definitions.md
- Units: A9 Q1 (L303-307)
- Question: Should `docs/definitions.md#What the file contains` name the measured values (the dalton and the two year lengths) and `gravity`'s conventional exactness, since "every factor is the exact one its defining document states" reads as a promise about the truth of the digits?
- Proposed answer: A9: yes, in one sentence (A9's edit names the measured values but not `gravity`).
- Settled by: F-069, F-069: D3's `units.md` skeleton names them (D3 (F-114)) and moves the section out of `definitions.md` (D3 (F-114)), and D3 calls `gravity` exact by convention. A9's edit to the section D3 deletes overlaps D3's text; the owner page is `docs/units.md#Which factors are exact`.
- Blocks: nothing.
- Decision: ok: `docs/units.md#Which factors are exact` names the measured values and `gravity`'s convention (the owner page); the file's comments are the code track (Q-033). [plan §12.1, section 8 of the sheet]

### Q-086. "no built-in is a prefix of another's name either"

- Kind: settled by a finding
- Pages: devdocs/builtins.md
- Units: A9 Q2 (L308-311), D5 Q2 (L193)
- Question: The clause in `devdocs/builtins.md#Names` is false (`log`/`log10`, `sin`/`sinh`, `atan`/`atan2`): delete it, or restate it?
- Proposed answer: A9: restate, since the guarantee that holds (a call's name is never split) is worth one clause. D5: replace it by D5's edit 8, which says what is true and why it does not matter.
- Settled by: F-258, F-258: all three restate it; three texts are drafted (A9 (F-258), D5 (F-258) edit 8, V3 (F-258)), to reconcile.
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-087. Name characters: letters of any script, ASCII digits

- Kind: settled by a finding
- Pages: docs/expressions.md; docs/definitions.md
- Units: A9 Q3 (L312-316)
- Question: `docs/definitions.md#Names` says "letters, digits and underscores, in any script", but `NAME` (`src/core/expr.ts:290`) takes letters of any script and only the ASCII digits.
- Proposed answer: A9: "a letter or underscore followed by letters in any script, the digits 0 to 9, and underscores".
- Settled by: F-077; D1's replacement of `#Names` (D1 (F-079)) states it ("any script's letters, digits `0`-`9`; `m²` an error").
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-088. Timings the units replace with their reasons

- Kind: settled by a finding
- Pages: devdocs/numbers.md; devdocs/benchmarks.md; devdocs/cost.md; docs/functions.md
- Units: A9 Q5 (L323-325), V7 Q2 (L323), V7 Q6 (L327), D7 Q7 (L253), V6 Q5 (L227)
- Question: Timings stand on pages under §12 questions 9 and 25: "milliseconds per pass" in a ruled-out alternative (`devdocs/numbers.md:916-917`); the index's old cost, "fifty times as much" in `devdocs/benchmarks.md` against "some thirtyfold" in `bench/names.bench.ts:24-26`; the example diagnostic line with one run's timings (`devdocs/benchmarks.md#Running the benchmarks`); the timings of `devdocs/cost.md#What the costs come from`, which D7 read as qualitative notes and left to that page's unit; and `docs/functions.md`'s gamma bullet ("about half a second the first time and a tenth of a second a call", "a few seconds then half a second"), which the catalogue no longer bears out even in order.
- Proposed answer: A9: the qualitative wording of A9's stale row. V7: no figure on the page, and the code comment should lose its figure too (that comment is in the code-comments item); the example line with its figures elided, or one real line said to be one run's. D7: that page's own call. V6: the D unit rewrites the gamma bullet as one qualitative sentence (§12 question 9).
- Settled by: F-209 (A9 (F-207), "a build per pass"); F-384 (V7 L275-291); F-382 (V7 L265-273); F-354 (V6 L146-159: the prose keeps orderings and ratios, the tables the figures); F-154 (D7 L133-153 makes the gamma bullet's cost sentence qualitative)
- Blocks: nothing.
- Decision: devdocs follow Q-016: a measured ratio stays, a rough timing may stay marked illustrative, counts that every run changes go (Q-061); F-209, F-384, F-382, F-354 follow under that rule, F-154's docs bullet stays qualitative. [plan §12.1, section 8 of the sheet]

### Q-089. Conversion into a unit list on `docs/definitions.md`: verified

- Kind: settled by a finding
- Pages: docs/quantities.md; docs/definitions.md
- Units: D2 Q6 (L466)
- Question: `docs/definitions.md#Unit lists`, lines 176-192, describes conversion into a list (counts, the remainder, zero terms, the rounding carry), which rests on `convert.ts`, `pipeline.ts` and the outcome layer, outside D2's modules; D2 verified only the definition side (lines 194-204).
- Proposed answer: D2: the unit that owns Q15 verifies those lines.
- Settled by: F-072 (Q15 corrected with two refinements, read against that page section), F-073; A8's confirmed statement A8 report (the count, straddle, carry and zero-term rules hold and every example reproduces).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-090. A condition term that fails behind an undecided comparison

- Kind: settled by a finding
- Pages: devdocs/functions.md
- Units: D2 Q7 (L467)
- Question: On the harness, a condition term that fails to evaluate after an undecided comparison leaves its condition undecided and assumed rather than failing the call (`src/core/evaluate.ts:1023-1027`; `gd0(x) | x > 0, ln(x) > -1` on a value around zero warns on both conditions). Does `devdocs/functions.md#The check at a call` state it?
- Proposed answer: D2: A6 confirms that the section states it.
- Settled by: D2 L117; A6's confirmed statement A6 report: `checkConditions` matches the section's three bullets, a term failing behind an undecided comparison recording the condition as assumed (A6 report L180-194).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-091. `2^-30000`: "about 69,659 bits" against the pages' 69,658

- Kind: settled by a finding
- Pages: docs/numbers.md; docs/settings.md; devdocs/numbers.md
- Units: D4 Q2 (L404)
- Question: The refusal of `2^-30000` says "about 69,659 bits" while N21, `devdocs/numbers.md` and `docs/settings.md:132` say 69,658, the size of `5^30000`. Which figure do the user docs carry, and should the prediction not overshoot by one?
- Proposed answer: D4: the pages keep the true size and say "about"; the overshoot is A5's to look at in `src/core/rational.ts`.
- Settled by: F-051 (the need `bound` is "a prediction a bit or so over the truth"), F-012; A1's confirmed statement A1 report (`canonicalBits` is an upper bound within a bit, `src/core/scaled.ts:448-459`) and A5 report. The pages give the storage cost, the message the prediction, by design.
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-092. `pow`'s base `-1`: special only for an exact exponent that cannot be formed

- Kind: settled by a finding
- Pages: devdocs/builtins.md
- Units: D5 Q3 (L194)
- Question: Confirm that `-1` is special only for an exact `y` whose fraction cannot be formed, as D5's edit 15 says from `src/core/builtins/pow.ts:147-166`; the prose below the table already agrees.
- Proposed answer: D5: none separate (edit 15 states it).
- Settled by: F-272; V3's confirmed statement V3 report (`pow(-1, 5^-16000)` exact `-1`, `pow(-1, 2 * 5^-16000)` exact `1`).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-093. The gamma bullet's §9.4 row and the "kernel" leak

- Kind: settled by a finding
- Pages: docs/functions.md
- Units: D5 Q5 (L196)
- Question: D5 left the §9.4 row on the gamma bullet of `docs/functions.md#(top)` to D7, and "the kernel" leaks into that bullet (line 70; §8 keeps "kernel" devdocs-only).
- Proposed answer: none given (a note for D7).
- Settled by: F-153 (bullet 12's Bernoulli memo corrected; D7 L133-153 replaces the bullet), F-448 ("kernel" in bullet 12)
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-094. The `div` and `mod` rows: "kinds included"

- Kind: settled by a finding
- Pages: devdocs/builtins.md
- Units: D5 Q7 (L198)
- Question: The `div` and `mod` rows of the dimension-rule table lack "kinds included" where the helper conforms kinds (D5's edit 13); D6 to confirm the behaviour at `mod(-30 deg, 360 deg)`, which the harness gives as `≈ 5.7595865 radian` with a blank want.
- Proposed answer: none given (edit 13).
- Settled by: F-268; V3's edit V3 (F-268) says the same; D6's confirmed statement D6 report (`mod(-30 deg, 360 deg)`).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-095. "Every built-in takes plain numbers, apart from the angles above"

- Kind: settled by a finding
- Pages: docs/functions.md
- Units: D6 Q7 (L236)
- Question: The tail paragraph of `docs/functions.md#(top)` (line 115) is contradicted by `approx`, `abs`, `sign`, `div` and `mod`.
- Proposed answer: D6: "apart from the angles above and the functions of bullets 7 to 9, which take quantities".
- Settled by: F-138: D5's edit 3 names six, `atan2` included ("apart from the angles above and the six that take any quantity (`approx`, `abs` and `sign`, and `div`, `mod` and `atan2`, …)"); D6's wording omits `atan2`. The texts are reconciled under the interim `docs/functions.md` item.
- Blocks: nothing.
- Decision: ok, within Q-009's interim edits (D5's six-function list, `atan2` included). [plan §12.1, section 8 of the sheet]

### Q-096. `factorial(20000)`: nothing should read as if the refusal suggested `gamma`

- Kind: settled by a finding
- Pages: docs/functions.md
- Units: D7 Q6 (L252)
- Question: Bullet 10 says `factorial(20000)` is refused and `gamma(20001)` gives it, which the harness confirms; the refusal itself names no remedy, so nothing there should read as if the message suggested `gamma`.
- Proposed answer: none given (a note for D6).
- Settled by: D6's bullet 10 (D6 (F-151)) says only that `gamma(20001)` gives it; F-282 (the Gamma pointer is on the non-integer and inexact errors, not on every `factorial` error); F-292 (the devdocs' "the remedy the factorial's refusal names" corrected). D7's own replacement of bullet 12 (D7 L133-153) keeps "or one past the significand limit, is pointed", which reads that way; reconcile it.
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-097. "a dimensionless marker" in `docs/definitions.md#The format`

- Kind: settled by a finding
- Pages: docs/definitions.md
- Units: V2 Q7 (L304)
- Question: `docs/definitions.md#The format` calls a kind primitive "a dimensionless marker", against §12 question 20; it is a D unit's page.
- Proposed answer: V2: "a marker of a kind, with no dimension of its own".
- Settled by: F-093, F-459 (D2 rewrites `:66` and `:80-82`); §12 question 20. The same words in `src/core/definitions.ts:11` are in the code-comments item.
- Blocks: nothing.
- Decision: ok, with F-459's wording ("a marker of a kind, with no dimension of its own", or "kind marker"). [plan §12.1, section 8 of the sheet]

### Q-098. The root README's tooling sentence

- Kind: settled by a finding
- Pages: docs/README.md (the root `README.md`); devdocs/development.md
- Units: D9 Q4 (L318)
- Question: The root README's tooling sentence (Lit, Vite, TypeScript, pnpm, the three commands) has no place in three sentences and two links (§12 question 18).
- Proposed answer: D9: it goes, V8 confirming that `devdocs/development.md` carries the commands; if the stack is to be named at the root, a fourth sentence rather than a list.
- Settled by: §12 question 18; F-004 (D9 (F-002), the three-sentence README); V8 keeps `devdocs/development.md` whole, commands included (V8 (F-401)).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-099. `approx` on the base does not relax an exponent literal past the limit

- Kind: settled by a finding
- Pages: docs/numbers.md; devdocs/numbers.md; plan (N23)
- Units: A2 Q9 (L152)
- Question: `(approx(1e20) - approx(1e20))^1e100000` is refused as `tooLarge` "however it is computed", because the exponent literal `1e100000` cannot be formed within the significand limit; `approx` on the base does not relax it. N23's "relaxes integer powers" should not be read to promise it.
- Proposed answer: A2: as stated (for A5).
- Settled by: F-051 (an exponent literal past the limit is `exceeds`, refused whatever the operands), F-046 (`approx` turns a refusal into a value only where an inexact operand changes the arithmetic), F-046 (the sharpened rule in D8's `numbers.md#approx`); the page's example is corrected separately (A2 (F-204), V1 (F-204): `^1e100000` → `^1e10000`).
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-100. "in two ways only": a third way an alternative fails

- Kind: settled by a finding
- Pages: devdocs/architecture.md
- Units: D1 Q8 (L695)
- Question: `devdocs/architecture.md:495-503` says an alternative fails after consuming input "in two ways only", omitting a parenthesized expression that fails inside (`(2 m`), the last alternative of its `alt` (`src/core/expr.ts:429-433`), so the cost argument holds.
- Proposed answer: D1: name it as the third case.
- Settled by: F-241. V2's edits to `#Parsing` (V2 (F-244, F-242)) do not take it up; V2's rewrite should.
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-101. Issue #40, cited by `docs/functions.md`, is closed

- Kind: settled by a finding
- Pages: docs/functions.md; docs/numbers.md
- Units: V6 Q6 (L228)
- Question: `docs/functions.md:253` cites #40, which is closed.
- Proposed answer: V6: delete the reference and state the current design (§12 question 26).
- Settled by: F-054 (the sentence goes as `#Very large results and approx` dissolves), F-054
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

## Coordination

### Q-102. Where issue #88 (`^` against `pow`) is linked

- Kind: coordination
- Pages: devdocs/numbers.md; devdocs/architecture.md; devdocs/builtins.md; docs/functions.md
- Units: A7 Q2 (L332-338), D1 Q3 (L690), V2 Q3 (L300)
- Question: #88 is linked from `devdocs/numbers.md#Roots and powers` (line 480, beside #89) and from `devdocs/architecture.md#Evaluation`, against §12 question 26; V2 asks whether `numbers.md` or `builtins.md`'s entry for `pow` owns it.
- Proposed answer: A7, D1 and V2: `devdocs/numbers.md#Roots and powers`, which owns the disagreement, keeps the one link, inline; `#Evaluation` points at that section without the issue. D1 adds that the user reference states the current difference without a link and that the generated `pow` entry inherits what its structured comment says. Owner page: `devdocs/numbers.md`.
- Settled by: F-221 (V1 (F-199) inlines it there), F-411 (D1 (F-190)), F-411 (V2 (F-411))
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-103. Where issue #92 (the reciprocal line) is linked

- Kind: coordination
- Pages: devdocs/architecture.md; devdocs/numbers.md
- Units: A8 Q2 (L147), V2 Q4 (L301)
- Question: #92 is linked from `devdocs/architecture.md#The converter and its lines > The reciprocal` and, per concept C4, also from `devdocs/numbers.md#Working precision and the schedule`; §12 question 26 wants one place.
- Proposed answer: A8 and V2: the reciprocal paragraph of `devdocs/architecture.md#The converter and its lines`, C4's devdocs owner, keeps it, and V1 removes the pointer from `numbers.md`. The pages link #92 only at `devdocs/architecture.md:1100` today; `numbers.md` has none to remove (V1's issue inventory lists no #92). Owner page: `devdocs/architecture.md`.
- Settled by: F-412 (V2 (F-412) inlines it), F-412
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-104. Where issue #100 (`approx(x, u)`) is linked

- Kind: coordination
- Pages: devdocs/numbers.md; devdocs/builtins.md
- Units: V3 Q4 (L757)
- Question: #100 is linked from `devdocs/builtins.md#The rules every built-in follows` and `#Not in this design`; it belongs to `devdocs/numbers.md#approx` (§1.1.4).
- Proposed answer: V3: `builtins.md` links that section and not the issue. V1 and D6 inline #100 at `numbers.md#approx` (V1 (F-221), D6 (F-221)), and D5 replaces `builtins.md`'s link with a link to `numbers.md` (D5 (F-414)); D7's replacement of `builtins.md#Not in this design` (D7 L222-234) inlines #100 (and #98) again, to reconcile. Owner page: `devdocs/numbers.md#approx`.
- Settled by: F-221, F-303, F-414
- Blocks: nothing.
- Decision: future.md: #100's one link is in `devdocs/future.md` (Q-011, Q-035); `devdocs/numbers.md#approx` and `devdocs/builtins.md` name the binary form without the link. F-414, F-221, F-303 follow. [plan §12.1, section 8 of the sheet]

### Q-105. "how to add to it": where adding to the definitions file is documented

- Kind: coordination
- Pages: docs/definitions.md; devdocs/architecture.md; devdocs/development.md
- Units: A9 Q4 (L317-322), D2 Q3 (L463)
- Question: `docs/definitions.md:5` and `devdocs/architecture.md:174-177` say the docs page tells how to add to the file, which it does not; the plan (§5 C50; D3's entry) places that in `devdocs/development.md#Adding a unit`.
- Proposed answer: A9: the devdocs pointer names `development.md`, and the docs page's top drops "how to add to it", as the stale rows propose. D2: the architecture sentence points at the docs page for the format and the names and at `development.md#Adding a unit` for adding; D3 or the owner of `docs/definitions.md#(top)` settles the top. D1's stale row and edit for the same sentence keep "how to add to it" (D1 report), against A9 and D3. Owner pages: `docs/definitions.md#(top)`; `devdocs/architecture.md#Definitions`.
- Settled by: F-108, F-108 (A9 (F-108)), F-108
- Blocks: nothing.
- Decision: ok: `devdocs/development.md#Adding a unit` documents adding to the file; `docs/definitions.md#(top)` drops "how to add to it" (A9, D3), and the file is "the definitions file" (F-475). [plan §12.1, section 8 of the sheet]

### Q-106. The call rule stated twice in `docs/definitions.md`

- Kind: coordination
- Pages: docs/expressions.md; docs/definitions.md
- Units: D1 Q6 (L693)
- Question: `docs/definitions.md#Functions` restates the call rule and the arity error of `#Expressions > A call` (§2.1.1 lists both).
- Proposed answer: D1: `#Functions` keeps the function semantics and points to the call bullet. D2's report does not take it up; V4 finds the call rule in four places (V4 (F-095)). Owner page: `docs/expressions.md#Calls and arity` (§7), `docs/definitions.md#Functions` linking there.
- Settled by: F-095
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-107. The call-cost paragraph stated three times

- Kind: coordination
- Pages: docs/definitions.md; docs/numbers.md; devdocs/functions.md; devdocs/architecture.md
- Units: D8 Q8 (L314), V4 Q6 (L563)
- Question: The paragraph on what a call costs (computed as its body typed out, not remembered, a parameter used twice two independent copies) stands in `docs/definitions.md#Functions`, `devdocs/functions.md#Precision, the radius and cost` and `devdocs/architecture.md#Functions` (§9.1).
- Proposed answer: D8: the drafted `definitions.md` keeps the user rule and `devdocs/functions.md` the mechanism; V2 reduces `architecture.md#Functions` to a link to the latter. V4: `docs/definitions.md#Functions` keeps the user statement, `numbers.md` the dependency problem (C27), `devdocs/functions.md` the mechanism, and `architecture.md#Functions` a pointer there. Owner pages as both say; V2's edit makes the pointer (V2 (F-033)).
- Settled by: F-033, F-033
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-108. The Significand limit entry and `numbers.md#Values too big to hold`

- Kind: coordination
- Pages: docs/settings.md; docs/numbers.md
- Units: D8 Q5 (L311)
- Question: D8's drafted `numbers.md#Values too big to hold` carries the remedies paragraph of the Significand limit entry (`docs/settings.md:139-157`), and its `#How a value is held` the dyadic cost (`:127-138`), as §12 question 5 directs; the entry then keeps its sentence and a link, and the Precision limit entry's parenthetical becomes D8's link.
- Proposed answer: D8: the owner reconciles D4's and D8's drafts when `numbers.md` is assembled, D8's text taking those two paragraphs. By §12 question 5 `docs/numbers.md` owns both. D4's proposed Significand limit entry already drops them and links `numbers.md` "How a value is held" and "Values too big to hold" (D4 L267-283), though in several sentences where question 5 asks for one; D4's Precision limit entry links "Digits you can trust" where D8 links `#how-a-value-is-held` (D8 (F-127)). Owner page: `docs/numbers.md`.
- Settled by: F-018, F-014
- Blocks: the assembly of `docs/numbers.md` and `docs/settings.md`.
- Decision: ok, with the sessions of `docs/numbers.md` and `docs/settings.md` reconciling D4's and D8's drafts by question 5 (the entry keeps a sentence and a link). [plan §12.1, section 8 of the sheet]

### Q-109. The dissolved section's diagrams and its 32,768-bit scenario

- Kind: coordination
- Pages: docs/numbers.md; devdocs/numbers.md
- Units: D8 Q3 (L309), D8 Q4 (L310)
- Question: D8 drafts the `exp(1e999)` diagram into `numbers.md#Values too big to hold`, where it shows the two parts and the two limits with no mechanism. Does `devdocs/numbers.md#Why the exponent bound stays at 10^18` already carry the radius diagram of `docs/functions.md:202-214`, and does it too name a significand limit of 32,768 bits?
- Proposed answer: D8: the `exp(1e999)` diagram stays in `numbers.md`; only the passes' diagram and table go to devdocs, where V1 keeps the one table, adds the diagram only if the page lacks it, and names the default limit or none. The devdocs section carries the six-pass table and names "a significand limit of 32,768 bits" (`devdocs/numbers.md:691`) but no diagram, and V1's report takes up neither. Owner pages per §12 question 10: `docs/numbers.md` (the rule and one example), `devdocs/numbers.md` (the table and the measurements).
- Settled by: F-057, F-050 (D8 (F-050) leaves both to V1)
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-110. "The probe leaves the memos at the largest ceiling it tried"

- Kind: coordination
- Pages: devdocs/settings.md; devdocs/builtins.md
- Units: V5 Q5 (L240)
- Question: The claim in `devdocs/settings.md` concerns the kernel's memos, outside V5's modules.
- Proposed answer: V5: the unit that owns `devdocs/builtins.md` confirms it; it stays meanwhile. V3's report does not check it, so it remains unverified (V5 (F-337)). Owner page: `devdocs/settings.md#The probe`.
- Settled by: —
- Blocks: nothing.
- Decision: ok, unverified until the `devdocs/settings.md` session checks it against the memo code (F-337). [plan §12.1, section 8 of the sheet]

### Q-111. The favicon and `offline.md#Icons`

- Kind: coordination
- Pages: devdocs/offline.md; devdocs/layout.md
- Units: V7 Q9 (L330)
- Question: V7's favicon edit to `devdocs/layout.md#The files` (`public/favicon.svg` is a separate drawing, so `public/icons/` is not the source of every icon) touches what `devdocs/offline.md#Icons` says about the icons' sources.
- Proposed answer: V7: V8 aligns that section with whichever wording is chosen. V8 does not: it confirms "the SVGs in `public/icons/` are the only sources" (O12) and "the favicon stays" (O14), and keeps `#Icons` whole (V7 (F-362)). The two reports conflict on the fact; reading `public/favicon.svg` against `public/icons/` settles it. Owner pages: `devdocs/offline.md#Icons`, `devdocs/layout.md#The files`.
- Settled by: F-362
- Blocks: nothing.
- Decision: ok, settled by reading `public/favicon.svg` against `public/icons/` in the `devdocs/layout.md` session (F-362). [plan §12.1, section 8 of the sheet]

### Q-112. `future.md` has no entry for equality operators

- Kind: coordination
- Pages: devdocs/future.md; devdocs/functions.md
- Units: A6 Q2 (L417-421)
- Question: The rewrite of `devdocs/functions.md#Conditions`' equality bullet points at `devdocs/future.md` for "Equality operators and conditional expressions" (§1.3), which no page records yet.
- Proposed answer: A6: V6 adds the entry under "Extensions that fit", with the constraint that a design must say what an undecidable comparison of inexact values yields, and V4 links to it. V4's edit links it (V4 (F-030)); V6's rewrite of `#Extensions that fit` (V6 L181-191) records no §1.3 intent, this one included. Owner page: `devdocs/future.md#Extensions that fit`, where §1.3 has the units record its intents.
- Settled by: F-345, F-030
- Blocks: nothing (V4's link points at a missing entry until it exists).
- Decision: ok [plan §12.1, section 8 of the sheet] `!=` in conditions belongs to the same entry (plan §12.3, R-5).

### Q-113. Defined functions before built-ins: a precedence or a prohibition

- Kind: coordination
- Pages: devdocs/functions.md; docs/definitions.md
- Units: A9 Q6 (L326-330)
- Question: The pages state a precedence, defined functions before built-ins, that the build makes unreachable by rejecting a definition named like a built-in (`src/core/build.ts:426-431`).
- Proposed answer: A9: `devdocs/functions.md#Names and shadowing` states the prohibition and leaves the lookup's order to the code comment. Neither D2 nor V4 takes it up; `devdocs/functions.md:99-101` already calls a function and a built-in of one name a duplicate. Owner page: `devdocs/functions.md#Names and shadowing`.
- Settled by: F-308
- Blocks: nothing.
- Decision: ok [plan §12.1, section 8 of the sheet]

### Q-114. `devdocs/builtins.md`'s per-function tables until the generated reference

- Kind: coordination
- Pages: devdocs/builtins.md; docs/functions.md
- Units: V3 Q2 (L755)
- Question: The two per-function tables and the exact functions' definitions are the only per-function statement of the rules today.
- Proposed answer: V3: they stay in `devdocs/builtins.md` until the reference generated from structured comments exists (§12 question 17), seed those comments, and then become one link each to `docs/functions.md`; this follows §4.4 (no per-function entries written meanwhile). Owner page: `devdocs/builtins.md` now, `docs/functions.md` once generated.
- Settled by: —
- Blocks: nothing.
- Decision: ok: the tables stay in `devdocs/builtins.md` until the generated reference replaces them. [plan §12.1, section 8 of the sheet]

### Q-115. The settings sheet's absolute link to `docs/settings.md`

- Kind: coordination
- Pages: devdocs/security.md; devdocs/settings.md; docs/app.md
- Units: V8 Q7 (L317), D9 Q7 (L321)
- Question: The sheet's "About these settings" link is an absolute URL into the repository on GitHub (`src/settings-lines.ts:114-117`), the page's only absolute URL.
- Proposed answer: V8 and D9: it becomes a relative, local link once the documents ship with the app (§12 question 31); `devdocs/security.md#The page` can then drop its sentence about it. Nothing changes before the question 31 work.
- Settled by: F-177
- Blocks: nothing.
- Decision: ok: the "About these settings" link becomes local when the pages ship with the app (question 31); nothing before. [plan §12.1, section 8 of the sheet] #191 closes when `docs/settings.md` lands, with this refactor (the owner on 2026-10-12, plan §12.2, item 9).
