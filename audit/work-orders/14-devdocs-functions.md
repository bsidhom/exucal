# Work order 14: `devdocs/functions.md` (Defined functions)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V4 (L113-119)` is `audit/reports/V4/fable.md`, lines 113 to 119. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§1` is
`audit/plan/01-core-abstractions.md` (its §1.2.5 rows, amended), `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/functions.md`, retitled "Defined functions"
  (Q-020, F-478): the design of the functions the definitions file
  defines, their inverses, annotations and conditions, calls,
  conversion into a function, the build-time checks, precision and
  cost, and the alternatives considered (§7.1: the developer side of
  `docs/definitions.md`'s functions and inverses).
- **Order.** Fourteenth: after `devdocs/numbers.md` and
  `devdocs/architecture.md`, which it links, and after the user pages
  it links (`docs/definitions.md`, `docs/quantities.md`,
  `docs/expressions.md`, `docs/numbers.md`). Later pages link it
  (`builtins.md`, `future.md`, `README.md`): the heading "A function as
  the want" stays (Q-021, F-467), and no heading is renamed without
  updating every link to it.
- **Status.** Ready. V4 audited the whole page (V4 L113-541); D2, A6
  and A8 drafted pairs that overlap V4's (section 7). The running
  example takes the name work order 04 gave it in `docs/definitions.md`
  (`twelve`, or the fresh example; Q-015).
- **Output.** The page in one pass, the text of `#Deferred` handed to
  work order 18 (`devdocs/future.md`), and in the pull request the
  choices made and any question for the owner.

## 2. The reader, and what the user pages taught

The reader has read `docs/definitions.md` (the six kinds of definition,
functions with their parameters, annotations, conditions and bodies,
inverses, the name rules, when the file does not load, what the app
loads), `docs/quantities.md` (conformance; conversion into a function
as an output mode), `docs/expressions.md` (calls and arity) and
`docs/numbers.md` (comparison and the touch rule; identities and cost;
decimal mode). Each section opens with one sentence linking the owner
(V4's table, V4 L57-78; F-323) and keeps the mechanism (the grammar's
hand-maintained block, the checks and their order, `applyFunction` and
`invertFunction`, the verdict table and the collector of assumptions),
the decisions with their reasons, and the alternatives considered.

## 3. Rules that bind the page, applied to the drafts

- **Future work is `devdocs/future.md`'s alone (Q-011; F-321, F-421).**
  `#Deferred` leaves this page for `devdocs/future.md` with its design
  text (V4 L492-514: the result annotation as the default want of a
  bare call, the shadowing error as a warning, definitions typed into
  the app, dimension-generic functions), and #130 to #134 are linked
  from `future.md` only: every mention here becomes a plain reference
  ("is future work", linking `future.md`), never "deferred" or "open"
  with an issue number: D2 L284 and V4 L161-163 (#130), D2 L311 and V4
  L193 (#131), D2 L288 and V4 L167, L508 (#132), V4 L512 (#133), V4
  L280-282 and L488 (#134), V4 L257 ("the deferred dimension
  variables"); the five reference definitions go. "No message is
  worded for a definitions rejection today: only the predefined
  definitions file is loaded", with nothing of what may come (F-306,
  F-098; "the system file" in D2 L288 and V4 L167 reads "the
  predefined definitions file", F-475). `#Not in this design` keeps the
  designs ruled out by intent (disjunctions and `!=` in conditions; an
  assertion on a result's value), their reasons with them, and the
  equality bullet of `#Conditions` keeps the constraint and links
  `future.md` for the operators that may come (F-030, Q-112; A6 L343-359,
  D2 L314-322, V4 L196-259 agree); two of its bullets are confirmed
  ruled out (section 8).
- **Received from `devdocs/future.md` (Q-011; F-350).** The ruled-out
  alternative "an offset in `Quantity`" for temperatures (`future.md`
  page L227-229: every operation would need a rule for it, where a
  function with an inverse needs nothing new) moves to `#Alternatives
  considered`, stated as intent in the present tense, the user's
  sentence being `docs/quantities.md`'s (work order 02); it links
  nothing of `future.md`, which, written later, drops the bullet.
  Item 13 of the owner's Q-011 list confirms the classification; the
  bullet is written as ruled out until it is answered.
- **Refusal only for a size refusal (F-442).** "A difference that
  cannot be formed as a value, past the exponent bound or straddling
  it, counting as across zero", never "refused as too large" (A6
  L366; F-028); `floor(sqrt(2)^2)` "is an error", not "refused" (V4
  L271); a function's name in a unit list "is `functionAsUnit`", the
  lookup reporting the error, not "refuses it" (A8 L101; F-310);
  "rejected" stays for the parser's (D2 L278, V4 L149, L171).
- **The words (§8).** "Defined function", "the functions the file
  defines", never "user-defined" while only the predefined file is
  loaded (F-478); "head" (F-477); "annotation", glossed "the unit it
  takes" once (F-479); "undecided", "holds", "fails", "verdict",
  "assumed", "certainly" as §8 has them (F-480: V4 L322's "a certain
  failure" reads "a failure that is certain"); "its own domain", "a
  restriction" (F-481); "touch" and "straddle" (F-447); "plain number"
  and "dimensionless" as synonyms, each defined once (F-460); "build"
  for the file's loading, mapped once to the docs' "loaded" (F-476);
  "interval" never for a temperature difference (F-483; V4 L214's
  "interval" for a range of numbers stays if §8's row allows it);
  "conversion into a function" in prose, the heading kept (F-467,
  Q-021); "the working precision of every pass" (V4 L142; F-431); the
  hand-maintained grammar block named as such, the whole line grammar
  being the comment at the top of `src/core/definitions.ts` (D2 L274 =
  V4 L129; F-305, Q-038); the running example's name (Q-015).
- **Numbers (Q-016).** The benchmark's figures in prose become V4's
  wording or the ratio the benchmark asserts (V4 L477-483; F-319).
- **Markdown (principles).** Inline links only; the grammar block stays
  a fenced block.

## 4. The page, section by section

- **(top).** V4 L113-119: the title "Defined functions", the opener
  linking `docs/definitions.md#functions`; the second paragraph stays.
- **Definitions.** D2 L270-278 and V4 L121-153 (identical where they
  overlap): the grammar block marked hand-maintained (F-305);
  `inverseAnnotation` rejected where it stands (F-229); the running
  example renamed (page L32-33; F-099, Q-015).
- **Annotations.** D2 L280-292 and V4 L155-171: the #130 sentence as
  future work linking `future.md` (section 3); the plain fact on the
  unworded rejection, "the predefined definitions file" (F-306); an
  annotation must be certainly nonzero, V4 L171's text (F-307); the
  example renamed (page L190).
- **Names and shadowing.** D2 L294-312 and V4 L173-194: the bullet, the
  #131 clause as future work (section 3); the prohibition stated: a
  definition may not take a built-in's name, and the lookup's order is
  left to the code comment (F-308, Q-113).
- **Conditions.** V4 L196-259 (the section body), with the equality
  bullet from A6 L343-359, D2 L314-322 or V4 L220-227: the comparators
  are the four orderings; equality of an inexact argument can never be
  decided on a ball, so an equality condition would be undecided for
  every inexact argument, the constraint any design must answer;
  `future.md` linked for the operators (F-030, Q-112); "dimension
  variables" as future work (V4 L257); the opener links
  `docs/definitions.md#functions` and `docs/numbers.md#comparison-and-equality`.
- **The check at a call.** A6 L361-384: the alignment sentence (F-028,
  low confidence: read `addBallsCore` in `src/core/ball.ts` first); the
  verdict table stays, right as it is; the touch sentence (A6 L382-384;
  F-029); the undecided-guard case the section already states (Q-090);
  the rationale in one line with the link to `docs/definitions.md`
  (F-100).
- **An undecided condition.** V4 L261-286: #134 as future work (section
  3); "is an error" at L271; what a conversion into a function checks
  (V4 L286).
- **Calls.** D2 L324-347 and V4 L288-343: steps 3 and 4 merged, each
  argument checked as soon as it is evaluated (F-309); V4's "the
  defined functions first" dropped from step 1 (F-308); "a failure that
  is certain" (V4 L322); the opener links
  `docs/expressions.md#calls-and-arity` (F-095) and
  `docs/definitions.md#functions`; the mechanism of a call's cost stays
  in `#Precision, the radius and cost`.
- **A function as the want.** A8 L97-101 and V4 L345-357: a function's
  name in a unit list is `functionAsUnit` (F-310); the `noInverse`
  message quoted with its inner quotes if `src/messages.ts:464-465`
  has them (F-311; the session compares); the fields of `Conversion`'s
  `function` kind (V4 L357; F-312); the two contexts named in step 6 in
  one clause, and "(a quotient past the exponent bound)" kept only if
  the count cannot also be refused at the significand limit, which
  the session checks (F-313, F-070); the opener links
  `docs/quantities.md#conversion-into-a-function`; the heading stays
  (Q-021).
- **Display.** A8 L103-111 and V4 L359-389: a ratio bare inside the
  call for a plain number, `tempC(-5443/20)`, and parenthesized before
  its unit, `twelve((1250/381) in)`; a negative argument inside the
  call (F-314, Q-003); the annotation written back by the printer, and
  nothing when it is `1` (F-315); the example renamed (page L586).
- **Build-time checks.** D2 L349-383 and V4 L391-425: the four steps
  (F-316); the "first version" sentence dropped (F-317); the `1e30000`
  example corrected, "within the parser's hard bound", glossed (V4
  L425; F-318); the orphan-inverse check found as soon as the
  definitions are indexed (D2 L379 = V4 L421; F-232); a body checked
  against a built-in's dimension rule (F-106); the order of the checks
  stated here, the kinds in the docs table, linked (Q-031).
- **Precision, the radius and cost.** V4 L427-484: the mechanism (a
  body evaluated afresh at every pass, settled at every node; calls
  not memoized) with the user consequences linked at
  `docs/definitions.md#functions` and `docs/numbers.md#identities-and-cancellation`
  (F-033, Q-107); the hand-written rule's examples stay here only if
  work order 01's session left them here (its pull request says);
  the benchmark in V4's wording or as a ratio (F-319); "injects each
  rejected piece": the page names which rejections the test injects if
  D2's reading holds, the session checking
  `src/core/definitions.test.ts` (F-320).
- **Not in this design.** V4 L486-490 without the #134 link: the
  ruled-out designs with their reasons, "inverse calls in expressions"
  with its reason and "optional parameters and defaults" gaining one or
  going (the owner's list, item 12, confirmed; section 8).
- **Deferred.** Removed: one sentence linking `devdocs/future.md`, its
  text (V4 L492-514) handed to work order 18.
- **Alternatives considered.** V4 L516-541: the forms set aside, each
  with what it loses, without a "first form" chronology (F-322); the
  offset in `Quantity` joins them (section 3).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-305 | Definitions | The block marked hand-maintained (Q-038) |
| F-306 | Annotations | The plain fact; no #132, no "deferred" (Q-011, F-475) |
| F-307 | Annotations | Certainly nonzero (V4 L171) |
| F-308 | Names and shadowing; Calls | The prohibition stated; the order left to the code (Q-113) |
| F-309 | Calls | Steps 3 and 4 merged |
| F-310 | A function as the want | `functionAsUnit` in a unit list |
| F-311 | A function as the want | The message compared with `messages.ts:464-465` |
| F-312 | A function as the want | The `Conversion` fields (V4 L357) |
| F-313 | A function as the want | The two contexts named; the significand-limit case checked |
| F-314 | Display | Bare for a plain number, parenthesized before its unit (Q-003, Q-015) |
| F-315 | Display | The printer writes the annotation back |
| F-316 | Build-time checks | The four steps |
| F-317 | Build-time checks | Drop |
| F-318 | Build-time checks | The example corrected |
| F-319 | Precision, the radius and cost | V4's wording or the ratio (Q-016) |
| F-320 | Precision, the radius and cost | The rejections the test injects named, if D2 is right |
| F-321 | Deferred; Annotations; Names and shadowing; An undecided condition; Not in this design | #130 to #134 are `future.md`'s; `#Deferred` leaves; plain references here |
| F-322 | Alternatives considered | Keep as intent |
| F-323 | (the page) | V4's table of links and mechanism; `#Deferred` to `future.md`; two bullets confirmed ruled out |
| F-350 (received) | Alternatives considered | The offset in `Quantity`, from `future.md` (Q-011); item 13 confirmed |

Owned elsewhere and read here: F-028, F-029, F-030, F-033, F-095,
F-096, F-098, F-099, F-100, F-104, F-106, F-229, F-232, F-345, F-421,
F-426, and the terminology findings F-447, F-460, F-467, F-476 to
F-481, F-483.

## 6. Decisions followed, and still open

Followed: Q-003, Q-008, Q-011, Q-015, Q-016, Q-020, Q-021, Q-031,
Q-038, Q-090, Q-107, Q-112, Q-113; the rules of section 3.

Still open: nothing. "Inverse calls in expressions" and "optional
parameters" (two bullets of `#Not in this design`) are ruled out (the
owner's list, item 12, confirmed): the first stays with its reason,
the second gains one or goes (F-323); and the offset bullet this page
receives from `future.md` (section 3) is ruled out by intent (item 13,
confirmed).

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V4 L113-119 | V4 | — |
| Definitions | D2 L270-278; V4 L121-153 | either (identical) | the example's name |
| Annotations | D2 L280-292; V4 L155-171 | V4's L171 for the nonzero rule; D2's or V4's for the rest | #130 and #132 as plain references to `future.md`; "the predefined definitions file" (D2 L288, V4 L167) |
| Names and shadowing | D2 L294-312; V4 L173-194 | either | #131 as a plain reference (D2 L311, V4 L193); the prohibition sentence added (F-308) |
| Conditions | A6 L343-359; D2 L314-322; V4 L196-259 | V4's body with one of the three equality bullets | "future work" for "deferred" (L257) |
| The check at a call | A6 L361-384 | A6 | "cannot be formed as a value" (L366) |
| An undecided condition | V4 L261-286 | V4 | #134 as a plain reference (L280-282); "is an error" (L271) |
| Calls | D2 L324-347; V4 L288-343 | either (step 3 identical) | "the defined functions first" dropped (V4 step 1); "a failure that is certain" (L322) |
| A function as the want | A8 L97-101; V4 L345-357 | V4, with A8's unit-list sentence worded under F-442 | the inner quotes checked; the contexts named |
| Display | A8 L103-111; V4 L359-389 | V4's replacement with A8's ratio wording | `twelve` |
| Build-time checks | D2 L349-383; V4 L391-425 | either; V4 for the `1e30000` sentence | — |
| Precision, the radius and cost | V4 L427-484; D8 L283-285 | V4 | the benchmark figures (L477-483); the injected pieces (L483) |
| Not in this design | V4 L486-490 | V4 | no #134 link |
| Deferred | V4 L492-514 | handed to work order 18 | one sentence stays |
| Alternatives considered | V4 L516-541; `future.md` page L227-229 | V4, with the offset bullet | the offset bullet as intent |

## 8. Conflicts left to settle

From the owner's list: the two `#Not in this design` bullets and the
offset bullet received from `future.md`, both answered (section 6).
Nothing else touches this page. The session records in its pull
request the drafts picked and the `#Deferred` text it handed on.

## 9. Code changes it waits on

None. B-029 (no message for a definitions rejection) is stated as a
plain fact; B-034, B-036 and B-047 are comments, the comment pass's.

## 10. Done when

- Every section opens with its link to the owning user page and keeps
  mechanism, decisions and alternatives only, in the present tense;
  `#Deferred` is gone and its text is with work order 18.
- No issue number among #130 to #134, no "deferred", no "open" with a
  number, no "user-defined", no "the system file", no "refused" for an
  error, no "first version".
- The running example has one name on this page and
  `docs/definitions.md`.
- The pull request names the choices made and changes nothing outside
  this file.
