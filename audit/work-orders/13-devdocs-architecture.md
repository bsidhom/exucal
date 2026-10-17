# Work order 13: `devdocs/architecture.md`

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V2 (L150-174)` is `audit/reports/V2/fable.md`, lines 150 to 174 (D1's
report is `merged.md`). `§7.1` is the concept map in
`audit/plan/07-docs-outline.md`, `§1` is `audit/plan/01-core-abstractions.md`
(its quantity claims and §1.2.5 rows, amended), `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/architecture.md`, the overview: the pipeline and
  each of its stages, from the definitions file to the lines on the
  screen, with the mechanism, the decisions and the ruled-out
  alternatives of the parts that have no page of their own (§7.1: it
  owns the developer side of quantities, conversion and the output
  modes, the expression language's parsing and evaluation, the
  definitions' build, the UI and the converter's lines).
- **Order.** Thirteenth: after `devdocs/numbers.md` and
  `devdocs/notation.md`, which it links, and after every user page it
  links (`docs/quantities.md`, `docs/expressions.md`,
  `docs/definitions.md`, `docs/numbers.md`, `docs/app.md`). Later
  developer pages link it (`functions.md`, `builtins.md`, `settings.md`,
  `offline.md`, `layout.md`, `README.md`), so a heading is renamed only
  by updating every link to it.
- **Status.** Ready once the code track's batch 1 has landed (B-068: a
  note this page quotes, if it keeps the quote, says "certified"). V2
  audited the whole page (V2 L108-280); A2, A7, A8, A9, D1, D2 and D9
  drafted pairs for the sections their claims touch (section 7).
- **Output.** The page in one pass, and in the pull request the choices
  made and any question for the owner.

## 2. The reader, and what the user pages taught

The reader is a developer who has read the user pages: `docs/quantities.md`
(dimensions, kinds, conformance, what a conversion, a unit list and a
conversion into a function answer), `docs/expressions.md` (the
grammar, the want field, evaluation order and error locations, the
printed form), `docs/definitions.md` (the file's format, the name rules,
when the file does not load), `docs/numbers.md` (`=`, `≈` and the
notes) and `docs/app.md` (the shell as the user sees it). Each section
opens with one sentence that links the owner (§12 question 24; V2's
verdicts per section, V2 L71-83), then keeps the mechanism, the
decisions with their reasons and the ruled-out alternatives, in the
present tense.

## 3. Rules that bind the page, applied to the drafts

- **The framing (§12 question 2; F-001, Q-039).** The top leads with
  the calculator; GNU units is named at most once, as lineage (V2
  L108-110), and at most once more in `#Expressions`, as the familiar
  convention behind the precedence, or not at all (F-240); "the
  converter" is the two-field component, never the app (F-472), and
  `src/outcome.ts` is "the outcome" (F-255, F-472).
- **Future work is `devdocs/future.md`'s alone (Q-011).** User
  definitions: `buildTable` takes one list, and today the predefined
  definitions file is the whole list; nothing of definitions "when the
  app takes them" and no #132 (F-228, F-475; A9 L215 and V2 L154 both
  carry the clause to drop); D2's closing sentence "No message is
  worded for a build error today, only the system file being loaded"
  (D2 L441-442) is kept as the plain fact with "the predefined
  definitions file" and without the link. #88 is not linked here: a
  pointer to `devdocs/numbers.md#Roots and powers` (Q-102; the
  definition at page L1119 deleted; D1 L644, V2 L204). #92 is linked
  here once, at "The reciprocal", the one owning place (Q-103, F-412;
  B-009's two gaps stated); the retry of a typed list's unit is issue
  #198, linked once at `#Unit lists` beside the gap it states and not
  promised as something to come (Q-045, F-246; the owner's list, item
  14; R-3 of the review, plan §12.3). `#Not in
  this design` keeps the designs ruled out by intent; anything in it
  that might still be done is `future.md`'s, which the session names in
  its pull request if it finds one.
- **Refusal only for a size refusal (F-442).** A typed list's unit
  straddling zero "fails as not positive", not "is refused" (A8 L73;
  F-246); the ratio "refused" at the exponent bound or the significand
  limit keeps the word (A8 L67; F-070); the lookup's "refusal" (A9
  L227-231) is a size refusal and keeps it; "rejection" stays for the
  parser's text rejected for its form and for the definitions-line
  faults (D1 L612, L620; D2 L387-389). A literal past the hard bound or
  the exponent bound is a size refusal, past the exponent bound the
  bound's `overflow`, as a computed value past it is (R-4 of the
  review, plan §12.3): `#Parsing` names the code's `Rejection` as it is
  and says the user meets such a literal as a size refusal, and the
  session reads `src/core/expr.ts` and `src/messages.ts`
  (`describeRejection`) to state how it is reported.
- **The definitions file (F-475).** V2 L154 and L156 and A9 L219 say
  "the system file" and "system units": "the definitions file",
  "the file's units"; "how to add to it" names `development.md#Adding a
  unit` (F-108, Q-105; A9 L219, D1's wording "the have and want fields").
- **Numbers (Q-016, Q-018).** The parser-reduction rationale keeps the
  ruled-out alternative and loses its seconds and minutes (D1 L518-536,
  V2 L186; F-239); the shell's "(a few milliseconds)" goes with the
  reason kept, or stays marked rough and illustrative (V2 L240-242;
  F-250).
- **The words (§8).** "Markers of a kind, with no dimension of their
  own" for the kind primitives (V2 L138-140; F-459; A7 L169's
  "dimensionless markers" not taken); the output modes named by their
  want, never "the second" or "the third output mode" (V2 L216, L226:
  "conversion into a unit list", "conversion into a function"; F-468,
  F-467); "a typed list" and "a defined list" (F-469); "relation" for
  `=`, `≈` and the uncertified sign (F-453); "`show` of `display.ts` and
  `roundTerms` of `convert.ts`" (F-254, F-499); "the settings panel",
  never "sheet" (V2 L246; F-488); "build ID", with the anchor
  `app.md#updates-and-the-build-id` (D9 L273; F-251, Q-022, F-492);
  "canonical", spelled out once, or linked to
  `docs/expressions.md#what-the-app-writes-back`, which may name it too
  (V2 L190; F-439 as the owner amended it on 2026-10-13, plan §12.3);
  "the hard bound",
  glossed once (D1 L523, L532; F-441); "parses back" here (F-457);
  "defined function" (F-478); "node", "step" (F-433); "certified" in any
  quoted note (A2 L108; F-427); "build" for the file's loading, mapped
  once to the docs' "loaded" (F-476); unit names as §8 has them (F-484);
  "literal" (F-473); the header grammar of `src/core/expr.ts` named as
  the hand-maintained form, quoting none of it (Q-038, F-074).
- **Markdown (principles).** Inline links only; the diagram stays a
  fenced block, corrected (F-223).

## 4. The page, section by section

- **(top).** V2 L108-110 (the first paragraph, the calculator first,
  GNU units as lineage) and V2 L112-114 (the list of sister pages
  replaced by a pointer at `README.md`, naming the pages leaned on
  most; F-222, Q-068; the line for `functions.md` reads "Defined
  functions", Q-020). The first paragraph states the three goals in
  priority order, in full, in the page's own prose for its reader,
  with the substance principles.md fixes, copying neither its list nor
  the review's shorthand: exact calculation that is explicit
  about inexactness, in a portable format, the browser; the elementary
  functions and the special functions that matter most in
  combinatorics, probability and physics, under the same guarantee;
  calculation and conversion aware of units and kinds; and that the
  design follows from them in that order, the numeric type and the
  pipeline's passes existing for the first two (plan §12.3,
  2026-10-14); that the app began as a units conversion utility is
  history and stays out (principles), GNU units staying as lineage in
  one clause (Q-039).
- **Pipeline.** V2 L118-134: the diagram ends at `Result<Conversion>`,
  "(or `convertToList`, or `invertFunction`)", and the sentences after
  it say `convertText` returns a `Conversion` that the UI's `outcomeOf`
  composes the lines from (F-223); "each arrow is one pure function of
  the core, the two parsers of the user's texts sharing `expr.ts`"
  only if the session finds `parseUnitList` in `src/core/expr.ts`
  (F-224, low confidence).
- **Numbers.** One paragraph and a link to `docs/numbers.md` and
  `devdocs/numbers.md`, checked against §1's N claims as amended
  (F-225).
- **Quantities, dimensions and kinds.** A7 L164-202 and V2 L136-148:
  the kind-primitives bullet in V2's words; the `NumberContext`
  sentence with V2's working grid (products and quotients take the
  context too, F-190); conformance reduced to one sentence and the
  link to `docs/quantities.md#conformance` (V2 L142-144; F-226).
- **Conversion.** The opener and link to
  `docs/quantities.md#how-a-conversion-is-answered` (F-245), then A8
  L63-67: the ratio refused at the bound or at the significand limit
  when its exact significand would pass it, "today" dropped (F-070).
- **Unit lists.** V2 L212-222 with A8 L69-73 merged (F-247): the
  accepted gap stated as today's behaviour, "fails as not positive"
  (F-246, Q-045), and explained thoroughly, as the owner asked on
  2026-10-16 (plan §12.3): which check fails, why the retry loop ends
  there, and that the same expression as a single want is retried and
  answers, `docs/quantities.md#unit-lists` stating the behaviour in one
  sentence; with its issue, #198, linked once beside it (B-010; Q-012's
  rule for a bug in today's behaviour); the remainder rounded at
  the digits certified, not "the midpoint to the display precision"
  (F-072); the mode named by its want (F-468).
- **Functions.** V2 L224-236: "conversion into a function" (F-468) with
  the link to `docs/quantities.md#conversion-into-a-function` (V2
  L226-228); a built-in's bare name as the want is `functionAsUnit` (V2
  L230-232; F-248); the last paragraph one sentence with links to
  `functions.md` and `docs/definitions.md#functions` (V2 L234-236;
  F-033, Q-107).
- **Expressions.** V2's pared section (V2 L178-190) with D1's
  corrections folded in (F-234): the opener links
  `docs/expressions.md#grammar-and-precedence`; juxtaposition its own
  node, `juxtapose`, the stale sentence dropped or V2's merge taken
  (F-235, F-236); "the binary operators' levels and symbols are shared
  data, so the parser and the printer cannot disagree on an operator;
  the nesting of the levels, the negation, the power and the rule that
  a number only starts a product are written in each, and the property
  test keeps the two in step" (D1 L553-574; F-237; V2 L190's "so the
  two cannot disagree" not taken); "so `kg (m/s)` is a product" (D1
  L489-501; F-238); the parser-reduction rationale as a ruled-out
  alternative without timings (F-239); the header grammar named
  (Q-038); GNU units at most one clause (F-240, Q-039); "canonical"
  spelled out (V2 L190).
- **Parsing.** D1 L578-625 and V2 L194-200: the call-rule history as
  intent, one wording (F-242); a composite node's span from its first
  part to its last (D1 L609-625; F-243); `symbol("^")` (V2 L194-196;
  F-244); the third way an alternative fails, if `src/core/expr.ts:429-433`
  is as D1 reads it (F-241, Q-100; the session checks); the opener
  links `docs/expressions.md#errors`, this section being the source of
  how a parse error reads (F-089).
- **Evaluation.** D1 L627-668, V2 L204-210 and A7 L204-227 merged
  (F-190: every node a step, exact values never rounded, the collector
  of assumptions; the three passages on the context corrected alike
  with `numbers.md#Sums and alignment`): the #88 pointer to
  `devdocs/numbers.md#Roots and powers` without a link (Q-102); the
  opener links `docs/expressions.md#evaluation-order-and-error-locations`
  (F-085) and the call rule links `#calls-and-arity` (F-095).
- **Definitions.** V2 L150-174 merged with A9 L207-245 and D2 L385-443
  (F-227): the opener links `docs/definitions.md` and
  `docs/expressions.md#names` (V2 L156, with "the definitions file");
  `buildTable` and the one list (F-228, section 3); the parser's
  rejections with `inverseAnnotation` (D2 L389; F-229); the lookup's one
  throw, A9's located statement, the session reading
  `src/core/table.ts:204-212` and `src/core/build.ts:917-933` first
  (F-230); a prefix's body evaluates call conditions at build (D2 L393),
  checked against `src/core/build.ts:485-491` (F-231); the
  orphan-inverse check right after indexing (A9 L239, V2 L172 or D2
  L397; F-232); how the checks run, in build order, pointing at the
  docs table `docs/definitions.md#when-the-file-does-not-load` for the
  kinds, with no completed prose catalogue (F-233, Q-031; D2 L403-442
  not used as a catalogue, its closing plain fact kept); the name rule
  as the reference's, applied twice (V2 L162); "the definitions file"
  throughout.
- **UI; The shell and its parts.** V2 L240-246 and D9 L267-275: the
  parse "quick enough that a worker would cost more than it saves", the
  milliseconds gone or rough (F-250); the settings sentence with "the
  panel" and the link to `docs/app.md` (F-488); the failure state with
  the Retry button as mechanism (D9 L269-271; F-169); "checks for a
  new version when its build ID is tapped" (D9's "checks for an
  update" reworded: in prose "update" is a verb, F-494), with
  `offline.md` and
  `docs/app.md#updates-and-the-build-id` (D9 L273-275; F-251); one
  link to `docs/app.md` per §12 question 24, the session choosing its
  place among `#UI`, `#The shell and its parts` and `#Not in this
  design` (F-252); whether this section keeps the design of the unit
  table built at the ceiling or points at `devdocs/numbers.md#Working
  precision and the schedule`, settled here (F-249; the code comments
  of B-056 then follow).
- **The converter and its lines.** A2 L104-109, A8 L75-95, V2 L248-280
  and D9 L277-287, one substance where they overlap: the outcome writes
  each side from the expression the `Conversion` carries, parsing the
  `have` again only for a blank `want`, and the printer decides from
  the tree (F-253; one of the three drafts); "`show` of `display.ts` and
  `roundTerms` of `convert.ts`" (V2 L250-252; F-254); "it stays in the
  outcome (`src/outcome.ts`)" (A8 L89-91; F-255); #92 inline once at
  "The reciprocal", in A2's or V2's form, the definition line deleted
  (F-412, Q-103); the note "8 of 12 digits are certified" if quoted
  (A2 L108), or the quote dropped as V2 does (Q-006); the unit list
  paragraph with the digits-certified rule, A8's and V2's versions
  reconciled (F-072); the openers and links to `docs/numbers.md`
  (the relation and the note), `docs/quantities.md` (the lines) and
  `docs/app.md` (the labels, F-471) (F-256); D9's two pairs where no
  other unit drafts (D9 L277-287).
- **Messages.** Stays as mechanism; the catalogue of errors is
  generated later (§12 question 6) and this section says nothing of
  it.
- **Not in this design.** The designs ruled out by intent with their
  reasons stay (Q-011); the session reports in its pull request any
  bullet that reads as something that might still be done.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-222 | (top) | A pointer at `README.md` (Q-068) |
| F-223, F-224 | Pipeline | The diagram corrected; "one pure function of the core" if `parseUnitList` shares `expr.ts` |
| F-225 | Numbers | Checked against the N claims |
| F-226 | Quantities | Conformance a link to `docs/quantities.md` |
| F-227 | Definitions | V2's section merged with A9's and D2's pairs (Q-031, F-475) |
| F-228 | Definitions | One list; the predefined definitions file the whole list; no #132 (Q-011) |
| F-229 | Definitions | `inverseAnnotation` in the rejection list |
| F-230 | Definitions | A9's located statement; read `table.ts:204-212`, `build.ts:917-933` |
| F-231 | Definitions | D2's sentence if `build.ts:485-491` is as read |
| F-232 | Definitions | The orphan-inverse check after indexing |
| F-233 | Definitions | How the checks run; the kinds are the docs table's (Q-031) |
| F-234 | Expressions | V2's split with D1's corrections (Q-038, Q-039) |
| F-235, F-236 | Expressions | `juxtapose` its own node; the node list |
| F-237 | Expressions | D1's scoped sentence; not V2's |
| F-238 | Expressions | "so `kg (m/s)` is a product" |
| F-239 | Expressions | Keep as intent; the timings go |
| F-240 | Expressions | GNU units at most one clause (Q-039) |
| F-241 | Parsing | The third case if `expr.ts:429-433` is as read (Q-100) |
| F-242 | Parsing | Keep as intent, one wording |
| F-243, F-244 | Parsing | The spans; `symbol("^")` |
| F-245 | Conversion | The opener and link; A8's sentence (F-070) |
| F-246 | Unit lists | The accepted gap as today's behaviour; "fails as not positive" (Q-045) |
| F-247 | Unit lists | V2's replacement with A8's paragraph; the digits certified (F-072) |
| F-248 | Functions | `functionAsUnit` for a built-in's bare name |
| F-249 | The shell and its parts | Settled here; B-056 follows |
| F-250 | The shell and its parts | The figure goes, or rough and illustrative |
| F-251 | The shell and its parts | "build ID" with `app.md`'s anchor (Q-022) |
| F-252 | UI | One link to `docs/app.md`, the place chosen |
| F-253 | The converter and its lines | The outcome does not parse the want again (Q-074) |
| F-254, F-255 | The converter and its lines | `roundTerms` of `convert.ts`; "the outcome" (F-472) |
| F-256 | The converter and its lines | The openers and links (F-471, F-468, Q-007) |

Owned elsewhere and read here: F-001, F-009, F-021, F-033, F-038,
F-070, F-072, F-074, F-085, F-086, F-089, F-095, F-108, F-169, F-170,
F-190, F-328, F-411, F-412, F-426, and the terminology findings of
section 3 (F-427, F-433, F-439, F-441, F-442, F-449, F-453, F-456,
F-457, F-459, F-460, F-467, F-468, F-469, F-471, F-472, F-473, F-475,
F-476, F-478, F-484, F-488, F-492, F-495, F-499, F-501, F-507).

## 6. Decisions followed, and still open

Followed: Q-003 (the printer's parentheses), Q-006, Q-007, Q-008,
Q-011, Q-020, Q-022, Q-031, Q-038, Q-039, Q-045, Q-068, Q-074, Q-100,
Q-102, Q-103, Q-105, Q-107; the rules of section 3.

Still open: nothing that blocks the page. Q-045 is settled (the owner's
list, item 14): no `future.md` entry; the retry is issue #198, which
`#Unit lists` links once beside the gap it states.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V2 L108-110, L112-114 | V2 | "Defined functions" for the `functions.md` line |
| Pipeline | V2 L118-134 | V2 | the `expr.ts` clause checked |
| Quantities | A7 L164-202; V2 L136-148 | V2 (the kind gloss; the grid clause); A7 for the rest | "dimensionless markers" not taken (A7 L169) |
| Conversion | A8 L63-67 | A8, after an opener | — |
| Unit lists | A8 L69-73; V2 L212-222 | V2 with A8's paragraph | "fails as not positive" (A8 L73); the digits certified for L220's rounding; the mode by its want (L216) |
| Functions | V2 L224-236 | V2 | "conversion into a function" for "the third output mode" (L226) |
| Expressions | D1 L487-576; V2 L178-190 | V2's pared text with D1's five pairs | D1's F-237 sentence; GNU units at most one clause; the timings gone; "canonical" spelled out |
| Parsing | D1 L578-625; V2 L194-200 | both (disjoint fixes) | the third case checked |
| Evaluation | D1 L627-668; V2 L204-210; A7 L204-227 | merged | no #88 link; the definition deleted |
| Definitions | A9 L207-245; D2 L385-443; V2 L150-174 | V2's section with A9's and D2's pairs | "the definitions file" (V2 L154, L156; A9 L215, L219); no "user definitions when the app takes them", no #132; no prose catalogue (D2 L403-442); "how to add to it" to `development.md` |
| The shell and its parts | V2 L240-246; D9 L267-275 | both | the milliseconds; "the panel" (V2 L246); "build ID" (D9 L273) |
| The converter and its lines | A2 L104-109; A8 L75-95; V2 L248-280; D9 L277-287 | V2's section, with A8's "the outcome" and A2's "certified" | the re-parse sentences in one of the three forms; the list paragraph reconciled; #92 once |

## 8. Conflicts left to settle

Of the owner's list: item 14 (#198, linked once at `#Unit lists`; kept
by R-3 of the review) and conflict 3 ("the definitions table" in
`#Definitions`, `buildSystemTable` and `src/system-table.ts` quoted as
they are). Of the review's answers (plan §12.3): R-3, R-4 (`#Parsing`,
section 3) and R-8 ("checks for a new version", section 4). The session
records in its pull request: the place of the one link to `docs/app.md`;
whether the shell section keeps the ceiling table's design; the drafts
picked in section 7; the figures kept as rough; any `#Not in this
design` bullet that reads as still possible.

## 9. Code changes it waits on

- **Before the page:** batch 1 (B-068, if a note is quoted).
- **After the page:** B-056 (the comments cite the section this page
  settles under F-249), B-035, B-036, B-037 (comments; the comment
  pass, Q-059), B-067 (the TODO; a later pass).
- **Documented as today's behaviour, no wait:** B-009 (#92), B-010
  (the typed list's unit; #198).

## 10. Done when

- Every section opens with its link to the owning user page and keeps
  mechanism, decisions and ruled-out alternatives only, in the present
  tense; the diagram is corrected.
- No "the system file", no "user definitions" as a present fact, no #88
  or #132 link, #92 once, #198 once; no "sheet", no "build number", no
  ordinal output mode, no "dimensionless marker"; "the outcome" for
  `src/outcome.ts`.
- Every figure left is a count or a rough, illustrative timing marked as
  such.
- The pull request names the choices of section 8 and changes nothing
  outside this file.
