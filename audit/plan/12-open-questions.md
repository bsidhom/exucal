*Section 12 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 12. Open questions

The owner's decisions, recorded question by question from the review of
this plan; the numbering is kept so that references elsewhere still
resolve. Every question is decided; 20 and 31 are decided for now, with
the later work each needs noted. The owner's answers to the questions
the audit units raised, recorded after the units ran, are in 12.1
below; where an answer amends a question here, 12.1 says so, and the
later answer wins.

1. **The removed design notes.** Decided: not resurrected, and no
   history page. An audit unit may read a removed note in git for one
   purpose, to recover the reason for a decision that a current page
   states without one, and writes that reason into the page in one or
   two sentences. Where the note does not settle it, the unit defers to
   the owner.
2. **Which framing leads docs/.** Decided: the calculator, with unit
   awareness and kind checking as a feature. The calculator is the bulk
   of the work and the app's original motivation; a setting or toggle
   that suppresses the conversion target, for first-class calculator
   use, is under consideration (§1.3). The docs are not grounded on GNU
   units: a similarity is called out only where it helps a user onboard,
   in unit-conversion semantics and definitions, and never for numeric
   semantics, so the "as GNU units shows" note on the display digits
   goes. The getting started guide opens with the calculator (question
   21), and there is no "Differences from GNU units" section.
3. **Where the interface facts live.** Decided: how to use the have and
   want fields and how to interpret the results belong to the foundation
   pages; what is specific to the web app, installing, offline use,
   updates, the settings sheet's mechanics and copying, goes in
   `docs/app.md`, an app-specific guide.
4. **The units page.** Decided: kept, as a friendly guide, with
   `src/units.txt` the source of truth the page may defer to. Later it
   may be generated from structured comments in the definitions file,
   by the docs tool (§4.4).
5. **Foundational detail and the settings reference.** Decided against
   the division first proposed: the settings page is not where
   foundational details surface; it references the numerics foundation.
   `numbers.md` owns how a value is held, to the depth a user needs to
   understand the behaviour: the fraction and its bit size, the power
   of ten and its bound, the error radius, the digits an approximate
   value is kept to, and the two limits that bound them; each settings
   entry explains its limit in a sentence and links there. The dyadic
   cost (`2^-30000` refused where `2^-28000` is a value) goes to the
   user docs too, on this reasoning: it decides which inputs are
   refused, and a user of a ball-arithmetic calculator, like a user of
   Arb or FLINT, needs the representation's cost model to predict both
   refusals and cost; the derivation (the factor of `log2 5`) stays in
   devdocs. The owner leaned the same way and may still overrule.
6. **An error-message catalogue.** Decided: generated from
   `src/messages.ts` by the docs tool, as one of its extractors, at
   build time (question 30); nothing is hand-written in the interim;
   internal kind names never appear in docs.
7. **What is authoritative.** Decided: the current pages are
   authoritative; a passage describing a superseded design is rewritten
   to the current design and only its intent kept, whatever its date
   (`audit/principles.md`); git is not cited in the pages.
8. **"certain" vs "certified".** Decided: "certified" and
   "certification" everywhere applicable, in both corpora and in the
   app's notes, since the term has its specific meaning on the ball. The
   note wording in the app ("8 of 12 digits are certain") is a code
   change, recorded for unit A2.
9. **Cost figures in docs/.** Decided: user docs give qualitative
   descriptions and warnings only, never concrete runtime
   characteristics; numbers stay with the benchmarks and the stress
   tools.
10. **The exponent-bound explanation and the pass table.** Decided as
    proposed: `numbers.md` owns the rule, the thresholds and the
    log-space advice with one example; `devdocs/numbers.md` owns the
    table and the measurements; `docs/functions.md#Very large results and
    approx` is dissolved. `approx` still gets an explicit built-in
    entry, through the generated reference (question 14).
11. **Display-only characters and the copy path.** Decided: rendering
    characters such as `×` are not accepted by the grammar today (they
    may be added later). The copy button does not copy the display text;
    it produces its output from the internal representation through a
    copy-output path. The guiding principle of the output format is that
    every result pastes back into the calculator, modulo display
    niceties; `numbers.md` states the principle and `expressions.md` what
    the grammar accepts. Whether `#` is accepted in the fields is read
    from `expr.ts` in unit D1.
12. **User definitions.** Decided: true user-defined functions and units
    are intended; the editing UX, a general text-editing problem, is not
    designed yet (#132). The definition reference documents the language
    as the language of definitions, system and user alike, and says that
    today only the system file is loaded; the intent is recorded (§1.3).
13. **Conversion into a function.** Decided as proposed: `quantities.md`
    owns what the answer is and when it exists; `definitions.md` owns
    writing an inverse and what is checked; `functions.md` says
    built-ins have none.
14. **`approx`: foundation and reference.** Decided as proposed: the
    foundation owns the concept and its semantics; the reference entry
    is mechanical (signature and the like) with a brief description that
    need not be self-contained.
15. **The width's name.** Decided: the panel's "width" with a "digits"
    unit on the input stays; the docs call it the ratio width, in
    digits, naming its unit as every setting's is named.
16. **Counting the settings.** Decided: no count anywhere; the reference
    lists the settings grouped and nested by mode.
17. **Generating the built-in reference.** Decided, and inverted: the
    documentation of each built-in lives beside its implementation as a
    structured comment, and a TypeScript tool generates the reference
    from those comments at build time (question 30); the design and the
    implementation follow the docs refactor as a separate block of work
    (§4). Nothing is hand-documented per function in the meantime.
18. **Root `README.md` vs `docs/README.md`.** Decided as proposed: the
    root README becomes three sentences and two links; `docs/README.md`
    is the user index and `devdocs/README.md` the developer index,
    revised to the map in §7.1.
19. **"Interval" for the temperature units.** Decided: "temperature
    difference".
20. **"dimensionless" and the kinds.** Decided for now: "dimensionless"
    is reserved for a plain scalar number, with neither dimension nor
    kind, and never describes a kind. The radian is believed to be the
    only kind today (unit D3 confirms it in the file), so the docs refer
    to it verbosely, "an angle" or "a quantity of the radian kind", and
    a general term for a quantity with a kind and no dimension is
    settled later, when the kind abstraction itself is shored up.
21. **Getting started's scope.** Decided: both, opening with the basic
    calculator and adding conversions after it (question 2).
22. **Offline and installation content.** Decided: `app.md` (question
    3), with one line in the index.
23. **The probe's description in docs.** Decided as proposed; "the
    costliest built-ins" is incorrect and stays incorrect for the
    elementary composite.
24. **Devdocs re-explaining user semantics.** Decided as proposed: each
    devdocs section opens with one sentence and a link to the owning
    docs section, then mechanism and rationale only; a rule restated for
    the sake of a rationale is quoted in one line, not re-derived.
25. **Measurements in documentation.** Decided: concrete timings leave
    the pages wherever reasonable and live in the benchmarks and the
    stress tools; a decision keeps the qualitative reason it rests on.
26. **Issue pointers.** Decided, with the clarification the owner asked
    for: the docs do not mirror issues. An open issue is linked from at
    most one place, the passage that owns the concept it concerns, and
    the link says only what is open. When the issue is resolved, every
    reference to it is deleted and the page is fixed to state the
    current design.
27. **The settings migrations.** Decided: `devdocs/settings.md` keeps why
    migrations exist, the envelope and the format version, the
    interface and the load-and-migrate flow, and the intent and
    structure of the current version's fields. The per-version list of
    migrated fields is a code concern and goes (§1.1.5).
28. **Unification across the two sides.** Decided as proposed: the map
    in §7.1 is the instrument; a concept that lacks either owner after
    the restructuring is a gap to fill, not a page to pad.
29. **The principle's permanent home.** Decided as proposed:
    `devdocs/development.md#Style guide`, with `devdocs/README.md` linking
    to it; a `CLAUDE.md`, if ever added, points at the style guide; it
    merges into `main` with the revamp.
30. **The generated references: built, not committed; one tool.**
    Decided: only the code and the structured comments are checked in.
    The documentation is generated at build time, with the rest of the
    build artifacts, and distributed with the web app so that it is
    cached for offline use; devdocs need not ship that way, though
    shipping them is not opposed. One docs tool carries the extractors
    (structured comments, the grammar DSL, the messages), wired into the
    standard build and never run out of band against the tracked tree.
31. **Do the hand-written pages ship with the app too?** Decided in
    principle: yes. The intention is to package every document useful
    to a user with the app itself and cache it for offline use. That is
    its own work chunk with its own design questions, not to be solved
    now: the owner leans away from shipping raw Markdown, so it needs a
    homegrown Markdown parser and HTML generator, and it touches the
    pipeline and the packaging. What the refactor does now is keep the
    door open: stable file names and heading anchors, repo-relative
    links, and pages written in a small, stable Markdown subset that
    such a renderer can carry (`audit/principles.md`, "Markdown
    principle", confirmed).

## 12.1 The owner's answers to the audit

The audit's 26 unit reports were consolidated into [findings.md](../findings.md),
[open-items.md](../open-items.md) and [bugs.md](../bugs.md), and the owner answered every
choice they left on [decisions.md](../decisions.md), all ten sections of which were marked
done. This section is the record of those answers, applied on 2026-10-12: each item below
gives the answer as the owner wrote it (the sheet's Decision line, notes included, word for
word), then how it was applied. The entries are keyed by the sheet's ids (`Q-` from
open-items.md, `F-` from findings.md), and the Decision fields of those two files are filled
from this record. An answer here is later than any decision in questions 1 to 31 above and
overrides it; an item's own answer overrides a wider rule set by another item. The proposed
calls of findings.md stand except where an answer touches them (the sheet's section 10).

### Rules that bind every page

Some answers set rules wider than their item. Each is marked **rule** below and restated in
[principles.md](../principles.md), which every page's session reads; the work orders under
[../work-orders/](../work-orders/) apply them page by page. In brief:

- **Future work** (Q-011, with Q-013, Q-014, Q-035 and Q-104): everything not implemented
  today that might be implemented later is described in `devdocs/future.md` only, with its
  issue links; the user docs never mention it; what is ruled out by intent lives in the as-is
  pages; bugs and performance problems stay with the passage that owns the concept (Q-012).
- **Inexact, not approximate** (F-451): "inexact" for any value with a nonzero radius,
  headings included; "approximate" and its variants only for the act of making one inexact.
- **The settings panel** (F-488): never "sheet".
- **The definitions file** (F-475): never "the system file" or "system" alone for it;
  "the predefined definitions file" where a user's definitions could be meant.
- **Which numbers the pages keep** (Q-016, Q-018, Q-088): user docs carry no timing, run
  count or measured ratio; devdocs keep constants, model figures, algorithmic counts, memory
  sizes, ratios and heuristics, and rough timings and durations marked as such.
- **Refusal** (F-442): "refusal" only for a size refusal, in both corpora; "error" for
  everything else in the docs; a literal past the hard bound or the exponent bound is a size
  refusal too (section 12.3, R-4); "rejection" the devdocs' word for text rejected for its
  form and for the definitions-line faults.
- **Topological order** (Q-008): pages are written each after the pages it depends on, the
  user pages first, getting started last, every devdocs page after the user pages it links.
- **`docs/builtins.md`** (Q-020's note): the user page on the built-ins is renamed, with
  every link to the old name; "functions.md" then names only `devdocs/functions.md`.

Items these rules left unsettled were listed at the end of decisions.md ("For the owner"),
marked pending in open-items.md and findings.md, and answered by the owner on 2026-10-12:
section 12.2 below records the answers. A review of the apply step then put eight more calls
to the owner, answered on 2026-10-13: section 12.3 records them, and the entries below that
they change say so. Nothing is pending now.

### The answers, by the sheet's sections

#### Section 1. Contested decisions that block a page

- **Q-001. `tooLarge`: one kind never retried, or classes some of which are retried.** Decision: other: the internal retry looks as they exist in the code today should be considered correct (unless there is some bug in internal consistency, etc). The intent behind classification of failure kinds is to signal the failure type to the _user_, who can choose to retry if there's a chance that increasing the significand width would resolve the issue. This is exactly what the kinds attempt to convey.
  Applied: read as A's facts with the owner's intent recorded: one error kind, `tooLarge`, carrying a reach and a need, which `resolve` never retries; a refusal at a later pass ends the loop with the best result so far; the retries inside a node or a step (decimal mode's `powered` and `summed`, the settle-first sum, the retried product and quotient) are correct as the code has them; the kinds exist to tell the user the type of failure, so that a user who may succeed with a wider significand limit can retry. No code change. Amends plan N21 (its last sentences), the §1.1.5 `tooLarge` row (withdrawn) and §1.1.6 item 14; F-051, F-509, F-034, F-056 and F-208 follow.
- **Q-002. A literal whose rounding carries past the exponent bound.** Decision: B. The goal of being able to paste back literal values is firm. We should fail on rounding, but surface an explicit and helpful error message to the user, e.g., "rounding EXPRESSION causes an overflow", with the offending expression referenced clearly. (Existing error messages, where they do not have bugs, are currently quite good at this.)
  Applied: B: a display rounding that carries past the exponent bound is refused as the bound's `overflow`, with a message that names the offending expression ("rounding EXPRESSION causes an overflow"), so that every line pastes back. B-002 is fixed before `docs/numbers.md` is written (section 9). Amends plan N12's last sentence (no literal fails to paste back; the edge is a refusal) and the row of §1.1.3 on `9.5e1000000000000000000`; `devdocs/notation.md#Every literal parses back` states the refusal, not the written line (F-060; A2's draft of that section is superseded).
- **Q-003. The ratio before the reciprocal line's `×`: bare or in parentheses.** Decision: A, as long as this results in the _correct_ AST parse. That was the entire point of parentheses in the first place. If that concern doesn't apply here, then ditch it. The original idea was to make fractional expressions with bare units such as `(1/2) in` parse correctly. This is _not_ the same (in the current grammar) as `1/2 in`, which a user might prefer to see, but which is _not_ equal to `0.5 in` due to the fact that juxtaposition binds more tightly than division via `/`. The docs need to clearly state this edge case if it isn't already documented. Note that this is also a rough edge in the expression grammar itself, and users might get tripped up by it at the moment. I do want to revisit the grammar later, but that is not up for debate in the current docs rewrite, which need to capture the current behavior as intent.
  Applied: A: the code stands and the pages follow (`in = 1/36 × 3 ft`), since the printer's text parses back to the same tree (`*` and `/` share a level; juxtaposition binds tighter, so `3 ft` is one factor). Condition kept from the note: the pages must state the juxtaposition edge plainly, that `1/2 in` is `1/(2 in)` and differs from `(1/2) in` and from `0.5 in`, where `docs/expressions.md` (Pitfalls) owns the rule and `docs/numbers.md` (How numbers are written) states why the printer parenthesizes a ratio before a unit; the grammar itself is not revisited in this rewrite. Amends plan N13 ("parenthesized before a unit and bare alone": bare before `×` too) and Q18; F-121, F-059 follow.
- **Q-004. The ceiling's gloss, and "grid" in the user docs.** Decision: B. This is clearly semantically correct and is the intent we want to capture in docs. And the "grid" abstraction is useful for understanding rounding/snapping/midpoint behavior.
  Applied: B: the ceiling is glossed "the highest precision any pass computes at"; "grid" stays in the user docs, explained once in `numbers.md` as the digits an inexact value is kept to (about ten beyond the pass's precision). Amends plan §8 (the ceiling row's gloss; the grid row), §5 C10 and C11, question 5 above ("the digits an inexact value is kept to"); F-125, F-126, F-127, F-429, F-431 and B-026 follow.
- **Q-005. The ceiling's formula in the user docs.** Decision: A. The current, sloppy wording was an oversight.
  Applied: A: the formula once, in the Precision limit entry of `docs/settings.md`, as "four times the sum of the limit and ten" with 4,040 beside it; elsewhere the number or a link. Amends plan N8 (with Q-073); F-022, F-126 follow.
- **Q-008. When a devdocs edit may link a user page not yet written.** Decision: A. My intention was always to write the docs in topo order. If that's not captured anywhere (and it goes beyond these smaller linking problems anyway), please note that where relevant.
  Applied: A, a **rule**: every devdocs page is rewritten in one pass once the user pages it links exist; no link dangles and no page is edited twice. The owner's wider intention is recorded as the order of the whole rewrite: the pages are written in topological order, each after the pages it depends on, the user pages first, getting started last, and every devdocs page after the user pages it links. Where two user pages link each other, the page written first links the other at the anchor the §7 outline fixes, and the later page keeps that anchor. Amends question 24 above (the openers are written with the page, not ahead of it), plan §10's order (the preamble, the §10.c preamble) and the sheet's "What happens next"; F-426, F-066 follow. The work orders under `audit/work-orders/` are numbered in that order.
- **Q-009. `docs/functions.md` before the generated reference: how much to correct.** Decision: B
  Applied: B: `docs/functions.md` (renamed `docs/builtins.md`, Q-020) takes §9.4's passages, every contradiction D5 and D7 found, and D6's terminology; the `approx` bullet becomes its mechanical reference entry (signature, one sentence, a link to `numbers.md#approx`); D6's three "(addition)" clauses wait for the generated reference. Amends plan §4.4 ("corrected only where §9.4 tags a stale passage"); Q-067 and Q-095 follow; F-138, F-148, F-151, F-144, F-153, F-155, F-159, F-162, F-164 follow.
- **Q-010. Statistical distributions: deferred built-ins, or definitions.** Decision: other: Just note these as being deferred for now, with a possible implementation to follow in the future. Not all functions of interest can be efficiently implemented in user definitions anyway, for example, inverse/quantile statistical functions.
  Applied: the statistical distributions are deferred for now, a possible implementation to follow; they are future work and so live in `devdocs/future.md` only (Q-011), worded as deferred (not ruled out, not "one-line user functions"), with the note that not every function of interest can be written efficiently as a user definition (the inverse and quantile functions, for example). `devdocs/builtins.md` and `docs/builtins.md` name them only as absent (the user page as a plain fact with what to write instead, never as something to come). Amends plan §1.3, §4.2 and §9.4's last row (the deferred classes are described in `future.md`, not on the as-is pages); F-348, F-290 follow.
- **Q-015. The `dozen` running example.** Decision: B. (I would also accept creating an entirely new example that doesn't even run into this `dozen` collision problem in the first place.)
  Applied: B: the running example is renamed to a name the definitions file does not define (`twelve`, as V4's edits use), keeping its shape; the page's session may instead write a fresh example that collides with nothing. Amends plan Q16's example (`2 ft = dozen(2 in)`); F-099, F-314 follow.
- **Q-016. Which numbers leave devdocs under question 25.** Decision: A, for user docs. Just make sure to keep memory approximations, since these will typically hold across machines and have more to do with JavaScript engine representations (which change slowly and are constrained by the spec anyway.) Ratios and machine-portable heuristics, etc., _are_ useful in devdocs, not user docs. I do want to keep rough timings in _developer_ docs where this clarifies issues or adds weight to decisions. Those should be considered "rough" though, and only illustrative, or else the docs should just talk about ratios or how things are physically observable to a user.
  Applied: A for the user docs, and a **rule** for both corpora: user docs carry no timing, run count or measured ratio (question 9); devdocs keep the code's and the tools' constants, the model figures the thresholds derive from, the counts that describe an algorithm, memory sizes (approximations that hold across machines, since they follow the engine's representation), measured ratios and machine-portable heuristics, and rough timings where they clarify an issue or add weight to a decision, each marked as rough and illustrative; otherwise devdocs speak in ratios or in what a user observes. Amends question 25 above ("concrete timings leave the pages wherever reasonable": in devdocs only the figures that neither clarify nor add weight leave, and what stays is marked rough), question 10 ("the table and the measurements": the six-pass table of digits stays; the scratch build's milliseconds go by Q-017), plan §1.1.4 and §9.1 ("the scratch-build measurements"), and §10's V3 entry ("measurements kept", F-510); Q-088 ("devdocs follow Q-016"), F-154, F-184, F-185, F-188, F-192, F-193, F-196, F-202, F-209, F-220, F-276, F-295, F-296, F-299, F-300, F-319, F-338, F-353, F-354, F-359, F-371, F-376, F-382, F-384, F-386, F-391, F-392 and F-250 follow, each as its page's session decides passage by passage under this rule.
- **Q-018. Rough durations: "a few seconds", "a fraction of a second".** Decision: B, while acknowledging that they may drift. To minimize risk of drift, we should be very broad-generous in terms. Knowing "this test will take a few seconds" versus "this test will take about half an hour" is crucial information for a developer, and makes it clear why some tests are not to be run on every commit (or conversely, why they _should_ be run on every commit).
  Applied: B, a **rule**: a rough duration ("a few seconds", "a fraction of a second", "about half an hour") is qualitative and stays, in devdocs and, where question 9 allows a qualitative warning, in docs; it is worded broad and generous so that it does not drift, and it is kept where it tells a developer which runs are quick and which are not. Amends question 25 above and question 9 (a rough duration is not a concrete timing); F-131 (devdocs half), F-376, F-391, F-393 follow.

#### Section 2. Terminology

- **Q-019. "plain number" or "dimensionless" in devdocs.** Decision: A. "Dimensionless" should be preferred where it is not too clunky, but "plain number" is sometimes clearer/simpler. The important thing is that these should be considered _synonyms_, with the word "kind" used any time we are attaching semantics to a particular class of values (as of now, only angles are treated specially with kinds).
  Applied: A, with the note as a **rule**: "dimensionless" and "plain number" are synonyms, "dimensionless" preferred where it is not clunky and "plain number" where it is clearer (and wherever the code's rules and messages are quoted), defined once per page as neither dimension nor kind; "kind" is used whenever semantics attach to a class of values (today only angles). Amends question 20 above and plan §8 (the "plain number" row); F-460, F-461 follow.
- **Q-022. "build number" or "build ID".** Decision: A
  Applied: A: "build ID" in both corpora, the footer's label "Build" quoted where the footer is described, and `docs/app.md`'s section "Updates and the build ID". Amends plan §5 C57, §7 (the `app.md` scope line) and §3's note on the build number; F-173, F-175, F-251, F-492 follow.
- **F-431. A pass's grid, its precision, and the working digits.** Decision: ok
  Applied: ok: devdocs say "the working grid" for the grid a pass settles onto, "working precision" for a pass's precision and "working digits" for the decimal-mode setting alone; docs say "the digits an inexact value is kept to" (with Q-004's "grid", named once); never "working precision" for the grid; #172 renames the code. A new row of plan §8; F-015 follows.
- **F-436. "neighbor" and "the neighbor rule".** Decision: ok
  Applied: ok: "neighbor", the American spelling; "the neighbor rule" is devdocs-only, the docs saying "the correctly rounded sum" and showing the example. A new row of plan §8; N20's wording follows when it becomes page text.
- **F-437. "absorbed into the radius".** Decision: B
  Applied: B: the docs keep the idiom, always as "absorbed into the error radius". A new row of plan §8.
- **F-439. "canonical".** Decision: ok. We do need to spell out what "canonical" means explicitly.
  Applied: ok: "canonical" is devdocs-only, for the held form and the printed text alike, and the devdocs spell out what it means where they first use it (the fraction kept in lowest terms with no factor of ten in its denominator; the printer's one text for a tree); docs say "the fraction is kept with no factor of ten in its denominator" and "how the app writes an expression back". A new row of plan §8; D1's draft sentence is reworded when applied.
- **F-440. "decimal exponent".** Decision: B
  Applied: B: docs say "the exponent", meaning the power of ten's; "decimal exponent" only in devdocs, where a binary one could be meant. Amends plan §8 (the "decimal" row); D8's draft of `numbers.md#Values too big to hold` is reworded (F-053, Q-026).
- **F-441. "hard bound".** Decision: B
  Applied: B: devdocs keep "the hard bound", glossed once and qualified where §5 C58's other bounds are near, never "hard precision bound"; docs say "the most the significand limit can be set to" and, for a literal, that a number longer than the limit can ever be set to is refused as it is typed, a size refusal (section 12.3, R-4). A new row of plan §8.
- **F-442. "rejected" in the user docs.** Decision: A. Note that devdocs should be unified with this terminology, and "rejection"/"rejected" should be kept as a distinct notion. A "refusal" is _always_ a size refusal, and most likely involves evaluation (except perhaps in the few cases where the grammar bounds things).
  Applied: A, with the note as a **rule**: in the docs "error" names everything but the size refusals ("a size refusal" is the significand limit's or the exponent bound's: a value the limits keep from being computed, or a literal past a size limit, stopped as it is typed), and text the grammar does not read is "an error as it is typed"; the devdocs use the same words, keeping "rejection"/"rejected" as the distinct notion for text rejected for its form and for a definitions-line fault (the code's `Rejection` named as it is), and never "refuse" for a domain error, an edge or a mismatch. A literal past the hard bound or the exponent bound is a size refusal in both corpora, past the exponent bound the bound's `overflow`, as a computed value past it is (the owner's answer to the review, section 12.3, R-4: the apply step had first placed such a literal among the rejections). Amends plan §8 (the refusal row), N15 ("refused with 'cannot be told from'" becomes an error at the ceiling), §5 C22, C23 and C62; F-443, F-098 (D2's "is rejected"), F-282, F-151, F-090 (D1's "rejected as it is typed", said of a literal past a size limit: "refused") and F-441's docs phrase follow.
- **F-447. Edge, boundary, bound; touch, straddle.** Decision: ok
  Applied: ok: devdocs say "touch" and "straddle" (the two answers of `position`), "edge" for the point a result depends on, "boundary" for a rounding cell's end, "bound" for a condition's and for the exponent bound; docs say one phrase, "a value whose bounds reach or meet the edge", with "cannot be told from". New rows of plan §8; D2's draft's "straddle" is reworded.
- **F-451. "approximate" or "inexact" in the user headings.** Decision: B. Let's switch to "inexact" everywhere that we mean a number (ball) with a non-zero radius. "Approximate" and its variants should be reserved for the act of _making_ a value inexact (e.g., through `approx` and possibly other utilities in the future). This firms up language and semantics.
  Applied: B, a **rule**: "inexact" everywhere a value with a nonzero radius is meant, headings included ("Exact and inexact values", "which units are inexact", "the digits an inexact value is kept to"); "approximate" and its variants only for the act of making a value inexact (`approx`, "approximating a value"), never as the adjective of a value. Amends plan §8 (the exact/inexact row: no plain-language gloss "approximate"), §7's headings ("Making a value approximate" becomes "Approximating a value"; "Exact and approximate values"; "Angle units (approximate through `pi()`)"; "which units are approximate"), question 5 above, §5 C6 and C11, §6.1 and every draft that says "approximate value" (D8's `numbers.md` sections, D4's settings entries, D3's `units.md`, A1's interim text); F-113's note, F-016, F-151 follow.
- **F-455. Rule 4's form in the ratio notation.** Decision: A. Note that there are still questions about canonicity here, due to factors of ten in the significand (numerator _or_ denominator). That is a much bigger design question than terminology though.
  Applied: A: "scaled ratio", glossed once as "a ratio times a power of ten"; the owner's note on canonicity (factors of ten in the numerator or the denominator) is a design question outside the rewrite, which the pages do not open. A new row of plan §8.
- **F-457. "pastes back", "parses back", "typed back".** Decision: ok. Note that "pastes back" is technically the only accurate reading here, because the rendering _cannot_ be typed back as-is: we use some invalid characters to make the results more "display-friendly". (Future grammars may except them, but are out of scope right now.)
  Applied: ok: docs say "pastes back", the only accurate reading (the screen's `×` cannot be typed back; the copy text can); devdocs say "parses back". A new row of plan §8; the drafts that say "reads back" or "can be typed back" are aligned (A8, D9, D1, A2's edit of `docs/settings.md:82`).
- **F-459. The gloss for a kind primitive.** Decision: ok. I'm also fine relaxing or tweaking the wording to make it shorter, e.g., by referring to such a marker as a "kind marker".
  Applied: ok: "a marker of a kind, with no dimension of its own" in both corpora, or the shorter "kind marker" once the gloss has been given. Amends plan §8 (the kind row) and §5 C35 ("dimensionless markers"); F-093, F-190's kind-primitives bullet, Q-097 and B-057 follow.
- **F-468. Output modes by number.** Decision: A
  Applied: A: an output mode is named by its want (one unit, a unit list, a function, a blank want), never by an ordinal; "output mode" joins plan §8 as a devdocs term. V2's "the third output mode" is reworded (F-033).
- **F-471. When "have" and "want" reach the user pages.** Decision: A
  Applied: A: each docs page uses "have" and "want" from its own rewrite, the whole page at once; getting started introduces the terms when it is written (last), and `docs/app.md` names the fields' labels ("You have", "You want") beside them. Amends plan §8 (the have/want row: "introduced once in getting started" no longer gates the other pages).
- **F-475. "system" for the definitions file.** Decision: other: "system" on its own is ambiguous and overloaded. I want you to use "definitions file" here. In contexts where it's ambiguous, "predefined definitions file" is acceptable and clear.
  Applied: a **rule**: the file is "the definitions file", or "the predefined definitions file" where a user's definitions could be meant; never "the system file", "system definitions" or "system" alone for it ("system" names only a system of units: the SI, US customary). Code identifiers (`system-table.ts`, `buildSystemTable`) are named as they are. Amends plan §8 (the definitions-file row), question 12 above ("today only the system file is loaded"), §5 C50 ("The system definitions file"), §7 (`units.md`: "the system file's contents"), §10 (A9's and D3's titles), §11 ("the system definitions file"); F-107, F-108, F-114, F-228, F-306 and every draft saying "system file" follow; B-061 is the code side.
- **F-483. "interval" in the user docs.** Decision: A
  Applied: A: "interval" never in the docs: "temperature difference" for the units (question 19), and no mathematical interval either; D2's draft's "an interval" is reworded. Plan §8's row stands.
- **F-488. "sheet" and "panel".** Decision: "settings panel" is much clearer. "Panel" is generic and will almost certainly hold under any UI refactoring. The "sheet" just so happens to be the _current_ visual design, but is subject to change and not fundamental to the settings flow.
  Applied: a **rule**: "the settings panel", or "the panel", in both corpora for what the user opens; never "sheet", which is only today's visual design. Amends plan §8 (a new row), §5 C56 ("The settings sheet"), §3's "The sheet's mechanics" note, §6.5, §7 (`app.md`: "the settings sheet's mechanics"; the section becomes "The settings panel"), question 3 above, §9.1 ("The sheet"), §11 ("the sheet shows"), and `devdocs/settings.md`'s heading "The sheet" (renamed "The panel" by its session, which also repoints what cites it); F-176, F-180, F-117, F-124, F-134, F-331, F-341, F-342, F-344 and the drafts of D4, D9, V5, V7 follow.
- **F-489. Naming the user corpus.** Decision: A. The "user guide" is a specific getting-started/examples-driven doc subset.
  Applied: A: "the user docs" for the corpus; "the user guide" names only the getting-started, examples-driven subset; V5's "line" for a line of the panel joins plan §8 (mapped once to the code's `hint` and `notice`).
- **F-491. The probe's functions.** Decision: ok. As I've noted elsewhere, I don't necessarily plan to extend the probe to arbitrary, expensive special functions, which might be impractical to satisfy to a high precision with good UI responsiveness. This is why we have follow-up work to make the UI responseive even during long-running computations.
  Applied: ok: "the four elementary functions" (never "the costliest"); the sheet's `PROBE_LINE` is worded the same way in the code change of Q-006 (B-017). The owner's note is recorded in the owner's words, not as a decision (section 12.3, R-6): there is no plan to extend the probe to the expensive special functions, which might be impractical to satisfy to a high precision with good responsiveness; keeping the interface responsive during long computations is the scheduler's work (#118, future work). Amends plan §9.4's probe row (D4's "the four costliest elementary functions" is not used); F-128, F-278, Q-006 follow.
- **F-493. After "service worker" is named once in `docs/app.md`.** Decision: other: I'm not sure exactly how we are bringing up the term "service worker" in user docs. This _feels_ like an implementation detail that many users need not understand, but which is necessary to get the app working offline robustly. It might be worth a brief mention, but in that case, we should call it what it is ("service worker") rather than only informally describe what it does. However, we should also clearly call out that it allows the doc to be served offline in user docs at the time we introduce this term. The devdocs should use "service worker" consistently.
  Applied: the docs name the service worker as what it is, "the service worker", once in `docs/app.md` where it is introduced, saying there that it is what lets the app be served offline, and keep the term after that (D9's wording, not V8's "the app"); the devdocs say "service worker" consistently. A new row of plan §8; F-172, F-174, F-180 follow.
- **F-494. "a new version" and "update".** Decision: other: I think I want B, but I want to clarify: "a new version" describes a new deployment that could be pulled, and "update" is always a verb to describe what a user (or page refresh) does.
  Applied: B, with the clarification: "a new version" is a new deployment that could be pulled; "update" is always a verb for what a user, or a page refresh, does; "deploy" stays devdocs-only. Headings and labels keep the noun ("Updates and the build ID", Q-022's section; `devdocs/offline.md`'s "Update checks"), and prose follows the rule (section 12.3, R-8). A new row of plan §8; F-173, F-180 follow.

#### Section 3. Design calls inside findings.md

- **F-070. A conversion's ratio refused at the significand limit.** Decision: A
  Applied: A: intended; the pages state that a conversion's ratio may be refused at the significand limit (with `approx` named around the have) and `src/core/convert.ts:132-138` is corrected (B-038). Amends plan Q13.
- **F-340. The notation's radios and the Mode control.** Decision: A
  Applied: A: the pages describe the panel as it is (the notation in the first group under the display digits; only the working digits under the mode); D4's docs text follows V5's and D9's reading.
- **F-078. A unit `a` for the are.** Decision: other: A, but drop the example and don't bother to mention the absence of `a` in the docs. (Why would we need to?)
  Applied: A, drop the `ha` example, and say nothing anywhere about the absence of a unit `a`. Amends the call of F-112 and Q-075 ("adds that there is no unit `a`": not added) and D1's question 7.
- **F-374. The reference digits in the tests.** Decision: A. If we want to revisit precision, that is an explicit redesign.
  Applied: A: the page states the tests as they are (forty digits at least, one argument per family to a thousand, mpmath beside Python's `decimal`); fifty digits is not a requirement.
- **F-320. The rejections the definitions property test injects.** Decision: ok
  Applied: ok: the page names the rejections the property test injects, if D2 is right; the two missing draws are a test improvement to take up separately if wanted (not scheduled).
- **F-037. Where the list of decimal mode's steps lives.** Decision: A
  Applied: A: the list of what counts as a step in decimal mode lives in `docs/numbers.md#The two modes`, carrying A4's corrected list (a leading `-`, binary `-`, two factors side by side), and the Mode entry of `docs/settings.md` links it. Amends plan N17 (the step list) and §1.1.6 item 2.
- **F-113. Naming the inexact units in `numbers.md`.** Decision: A. Note that we do not currently have a mechnism to _mark_ a unit definition as inexact. That is an interesting follow-up which I've been considering, but which is its own large design consideration. `pi()` is the only applicable example above with respect to the "inexact" terminology. (Recall we have moved away from "approximate" based on terminology decisions above.)
  Applied: A: `numbers.md`'s section on exact and inexact values adds one clause that the units defined through `pi()` are inexact, linking `units.md`'s list; the owner's note is recorded: the file has no mechanism to mark a unit definition as inexact (a possible design of its own, not opened here), and `pi()` is the only source of an inexact unit. Amends plan Q10 (with F-069).

#### Section 4. Where each issue is linked

- **Q-011. Issues #130 to #134, the definition language's open work.** Decision: other: Future work lives only in `devdocs/future.md`. Anything not implemented today that we might implement later is described there, with its issue links, and nowhere else: the user docs never mention it, and a devdocs page that needs to say something is planned links `future.md` rather than describing it. So #130 to #134 are linked from `future.md` only. What is ruled out by intent is not future work but a current design decision, so it lives in the as-is pages: one sentence where a user would look for it in `docs/` (for example, that the app never shows the error radius), and the reason in the devdocs page that owns the concept. `future.md`'s "Ruled out, and why" is split accordingly: its decisions move to those pages, and anything in it we might still do (the function classes deferred in §1.3 and Q-010) stays as future work. A user page may state what the app lacks today as a plain fact, with what to write instead, but never as something to come. Bugs and performance problems in today's behaviour are not future work either: their issue links stay with the passage that owns the concept (Q-012). Where it is unclear whether an item is ruled out or might still be done, ask me.
  Applied: a **rule** (the owner's text is the rule; see `audit/principles.md`): future work lives only in `devdocs/future.md`, with its issue links, and nowhere else; the user docs never mention it, and a devdocs page that needs to say something is planned links `future.md` rather than describing it; so #130 to #134 are linked from `future.md` only. What is ruled out by intent is a current design decision and lives in the as-is pages: one sentence where a user would look for it in `docs/`, the reason in the devdocs page that owns the concept; `future.md`'s "Ruled out, and why" is split accordingly, its decisions moving to those pages and what might still be done (the function classes deferred in §1.3 and Q-010) staying as future work. A user page may state what the app lacks today as a plain fact, with what to write instead, never as something to come. Bugs and performance problems in today's behaviour are not future work: their issue links stay with the passage that owns the concept (Q-012). Where it was unclear whether an item is ruled out or might still be done, the owner was asked: the list at the end of `audit/decisions.md` ("For the owner") was answered on 2026-10-12 (section 12.2 below), and nothing it touched is pending. Amends question 26 above (an open issue is linked from the passage that owns its concept only for a bug or a performance problem; a future extension's one link is in `future.md`), question 12 (the intent that user definitions are to come is recorded in `future.md`, and `docs/definitions.md` states as a plain fact that only the predefined definitions file is loaded), question 11 (the docs do not say that `×` may be accepted later), plan §1.3 (every intent listed there is recorded in `future.md`, none on the as-is pages or in the user docs), N7 and N16 (their intent clauses are `future.md`'s), §1.2.5's `#Conditions` row, §6.1's last bullet ("what symbolic exactness would add": not in docs), §6.4 ("the status of user definitions"), §7 (`definitions.md`'s "User definitions" bullet; `builtins.md`'s "Not provided" bullet; `expressions.md`'s "What is not accepted"; §7.1's last row), §4.2 and §9.4's last row (the deferred classes); Q-013, Q-014, Q-035, Q-104, Q-112, Q-037, F-030, F-107, F-306, F-321, F-345, F-346, F-348, F-350, F-413, F-414, F-417, F-418, F-419, F-421, F-302 and the `#Deferred` section of `devdocs/functions.md` follow. The owner's example of a ruled-out design, that the app never shows the error radius, was corrected by the owner on 2026-10-13 (section 12.3, R-7): it is a plain fact about today's display, neither ruled out by intent nor future work.
- **Q-012. The kernel-cost issues: `builtins.md` or `cost.md`.** Decision: A. I would lean toward my ruling above about all not-currently-implemented work being listed under `future.md`, but I consider these issues to be user-relevant in understanding current performance. Moreover, this is not "future" or "aspirational" work, but a performance bug (where there is an associated issue).
  Applied: A: `cost.md` links every issue about what a computation costs or where it hangs (#107, #125, #149 to #152); `builtins.md` links #103 (the Bernoulli memo) and #115, and points at `cost.md` for costs; the owner's reason: these are performance bugs in today's behaviour, user-relevant and not future work, so Q-011's rule does not move them. Conflict recorded for the owner: #115 (eight special functions designed and deferred) is future work by Q-011's rule, which would place it in `future.md`, while this item's own answer keeps it in `builtins.md`; the item's own answer was applied provisionally and the point put on the list at the end of `decisions.md`; the owner confirmed it on 2026-10-12 (section 12.2, item 1): #115 stays in `builtins.md`. Amends plan §5 C32 ("future.md (#103)") and C33; F-193, F-195, F-290, F-303, F-415, F-416, F-420, F-422, F-423, F-424, F-425, Q-062 and B-070 follow.
- **Q-013. Issue #118, the scheduler.** Decision: B
  Applied: B: #118's one link is in `devdocs/future.md#Extensions that fit`, with #119 to #121 beside it (F-419: the parts follow #118); `settings.md` and `cost.md` name the concern in words and link `future.md`. Amends plan §5 C33 ("future.md (#118)" stands; `cost.md` is not the link's home); F-343, F-418, F-419, F-360 follow; #186, which builds on #118, is future work too (confirmed on 2026-10-12, section 12.2, item 8).
- **Q-014. Issue #98, significant figures.** Decision: Don't mention this in the sections above. This is a _future work_ item, and lives under `future.md`.
  Applied: #98 is not mentioned in `devdocs/numbers.md#approx` or `devdocs/builtins.md`: it is future work and lives in `future.md` only (Q-011); the two pages say nothing of significant-figure rounding or propagation beyond the plain fact that `round` rounds to places. Amends plan §5 C26; F-413, F-221, F-303, D6's `round` text and V1's `#approx` sentence follow.

#### Section 5. Other decisions that block a page

- **Q-006. The "certified" code change: what rides with it, and when.** Decision: ok
  Applied: ok: the "certified" change (`src/outcome.ts`) carries `MODE_LINES.exact` ("Every digit shown is certified, found at rising precision; …") and `PROBE_LINE` worded as F-491 decides ("the four elementary functions"), lands before `docs/numbers.md` is written (section 9), and the devdocs quotes follow it. B-068, B-017, B-025, B-026 are the code side.
- **Q-007. Quoting the app's messages and words in hand-written pages.** Decision: ok
  Applied: ok: examples, never a catalogue: `numbers.md` quotes the two size refusals, getting started two or three messages as examples of their shapes, `app.md` every footer word verbatim, devdocs name the function and paraphrase, quoting only where the exact text is the point; the generated catalogue (question 6) is the complete list.
- **Q-017. The scratch build's figures in `#Why the exponent bound stays at 10^18`.** Decision: ok
  Applied: ok: the six-pass table (digits) and the qualitative finding stay; the scratch build's per-size milliseconds go. This item's own answer governs that section where Q-016's rule would otherwise let a rough timing stay. F-202 follows.
- **Q-020. The title of `devdocs/functions.md`.** Decision: ok. Separately, rename the user page `docs/functions.md` to `docs/builtins.md`, titled "Built-in functions", so that it matches `devdocs/builtins.md`. §7's outline follows, and so does every link to the old name: the root `README.md`, `docs/README.md`, the link in `devdocs/builtins.md`, and two comments in `src/units.txt`. After that, "functions.md" names only `devdocs/functions.md`, "Defined functions".
  Applied: ok, and a **rule** from the note: `devdocs/functions.md` is titled "Defined functions" (file name unchanged; the index lines of `devdocs/README.md` and `devdocs/architecture.md` reworded); the user page `docs/functions.md` is renamed `docs/builtins.md`, titled "Built-in functions", to match `devdocs/builtins.md`, and every link to the old name follows (the root `README.md`, `docs/README.md`, the link in `devdocs/builtins.md`, two comments in `src/units.txt`), all repointed by the pull request that renames the page (work order 07), so that none dangles (Q-008); after that "functions.md" names only `devdocs/functions.md`. Amends plan §7 (the page's name), §7.1 (the built-in functions row), §4 (every `docs/functions.md` pointer), §10 (D5 to D8's titles), §5 (C24, C25, C26, C32, C48, C63 owners); F-181, F-257, F-260, F-270, F-275 and the findings of the `docs/functions.md` group follow (their link target is `docs/builtins.md`).
- **Q-021. The heading "A function as the want".** Decision: ok
  Applied: ok: the heading "A function as the want" stays; the prose says "conversion into a function" (plan §8).
- **Q-023. Decimal mode's effect on units and edges, in `numbers.md`.** Decision: ok, but don't record that specific number in decimal, since it changes with the parameterization and does not match the behavior I see in the real app with my current settings. Keep the discussion to the fact that this does (or even "may") produce an exact value in decimal mode while failing to resolve in exact mode due to the pole.
  Applied: ok, without settings-dependent digits: `docs/numbers.md#The two modes` says that in decimal mode a unit that carries `pi()` is rounded as it is looked up, so `turn` into `deg` is `=` with a value a little under 360, and that an argument never straddles an edge, so `tan(90 deg)` may give an exact value in decimal mode where exact mode fails at the pole; no specific decimal result is recorded, not even at the default settings (the owner confirmed on 2026-10-12, section 12.2, conflict 2). F-044 follows.
- **Q-024. The touch rule in `numbers.md`.** Decision: ok
  Applied: ok: one sentence in `docs/numbers.md#Comparison and equality` (a bound exactly met decides a non-strict comparison and leaves a strict one undecided); the verdict table stays in devdocs. F-029, F-101 follow.
- **Q-025. Rounding a value that cannot be told from zero.** Decision: ok, just make sure the discussion is complete. I think you've captured all of the functions here.
  Applied: ok: one complete sentence in "Values at an edge" naming every rounding function and mode: `trunc`, and `round` in a mode to nearest or toward zero, decide a value that cannot be told from zero as `0`; `floor`, `ceil`, `sign`, and `round` in `awayFromZero`, `ceiling` and `floor` do not (D6's rule 3 in full). F-031 follows.
- **Q-026. The one log-space example.** Decision: ok
  Applied: ok: the quotient of exponentials is the worked example, the exponent (`1e999 / ln(10)`, in docs "the exponent" by F-440) a closing clause. F-445 follows.
- **Q-027. "derived and shown": the ceiling on the panel.** Decision: ok
  Applied: ok: the pages stop saying the panel shows the ceiling ("derived, and written as a number only in the probe's proposal"); whether the panel should show it is outside the revamp. Amends plan §3's note ("derived and shown") and §5 C10; F-126, F-331 follow.
- **Q-028. A privacy sentence in `docs/app.md`.** Decision: ok
  Applied: ok, with the link and the wording settled by the owner's answers to the review (section 12.3, R-1 and R-2): one sentence in `docs/app.md#Offline use`, led by V8's "Nothing you type leaves the device": the app calls no third-party service, contacts only the host it was loaded from, and only for its own static files (to load them, and to check for and fetch a new version), and sends that host no local data; the sentence links `devdocs/security.md#The page`, as V8 proposed, and `security.md` may link back. F-171, F-180 follow.
- **Q-029. A home for the linking and Markdown principles.** Decision: ok
  Applied: ok: the linking and Markdown principles live in `devdocs/development.md#Style guide` beside the documentation principle. Amends question 29 above; F-402 follows.
- **Q-030. Who deploys.** Decision: ok. I only use Cloudflare Workers Builds at the moment.
  Applied: ok: Cloudflare Workers Builds alone deploys; `security.md` and `deployment.md` say so. F-408, B-054 follow.
- **Q-031. The build-error catalogue in `devdocs/architecture.md#Definitions`.** Decision: ok
  Applied: ok (B): `devdocs/architecture.md#Definitions` keeps how the checks run and points at the build-time checks table of `docs/definitions.md`; no completed catalogue in devdocs. F-232, F-233, F-105 follow.
- **Q-032. Why information (`bit`) is a dimension.** Decision: ok
  Applied: ok: `units.md`'s primitives say why information is a dimension (a count of bits must not collapse into a plain number, so that `bit/s` stays apart from `Hz`), and the file's comment says the same (B-064, code track). F-094 follows.
- **Q-033. The sources `units.md` names.** Decision: ok
  Applied: ok: `units.md` cites what the file cites; the file's header gains the three documents, the two years a source and an epoch, `gravity` the mark "(exact by convention)" (B-062, B-063, B-065, code track); `units.md` calls the years measured values written exactly. Since the comments land in one commit after the pages (Q-059), `units.md` names the three documents when it is written, and the file agrees once that commit lands (section 12.3, the review's corrections). F-116, F-069 follow.
- **Q-034. "`W` is the watt": the Lambert W connection.** Decision: ok
  Applied: ok: D5's edit 7 (Lambert's function is `lambertw`; neither `e` nor `W` is free for a function or a constant). F-259 follows.
- **Q-035. Where the binary `approx(x, u)`'s tentative design lives.** Decision: this is future work and should not get in the way of the numbers description yet.
  Applied: the binary `approx(x, u)` is future work: its tentative design and #100 live in `devdocs/future.md` (Q-011, Q-104), and `devdocs/numbers.md#approx` only names the binary form in one clause linking `future.md`. Amends plan §1.1.4 ("approx's alternatives (…the binary form #100): #approx"), §5 C26; F-414, F-221, F-046 (A2's qualifier stays, as today's behaviour) follow.
- **Q-036. The rounding functions' open cell.** Decision: ok
  Applied: ok: one sentence of intent in `devdocs/builtins.md#The exact functions` (a touch is a straddle at every edge, so that no edge check has to know which end of a cell is closed); no code change. F-279 follows.
- **Q-037. Typographic characters in the fields.** Decision: ok
  Applied: ok: one entry in `devdocs/future.md` (accept `×`, `·`, `−`, non-breaking and thin spaces where each has one meaning; keep `÷` and superscripts out unless asked for); `docs/expressions.md` lists them among the errors as a plain fact, with what to type instead, and says nothing of what may come (Q-011). F-088, F-345 follow.
- **Q-038. Pointing at the grammars in the parsers' headers.** Decision: ok
  Applied: ok: `docs/` keeps prose and the precedence table; `devdocs/architecture.md#Expressions` names the header grammar of `src/core/expr.ts` as the hand-maintained form, quoting none of it, and `devdocs/functions.md#Definitions` does the same for `src/core/definitions.ts`. Amends plan §2.1.3 and §2.2.3 (F-500) and §11 ("no grammar file" stands; the header comments are named). F-074, F-092, F-305 follow.
- **Q-049. A stored ratio width out of range resets the whole mode.** Decision: B
  Applied: B: the stored ratio width is clamped like the count (B-012, before `docs/settings.md`, which states the clamp, and `devdocs/settings.md` are written); `#Storage` then states one rule. F-333 follows.
- **Q-057. The internal kind name in the load-failure message.** Decision: ok
  Applied: ok (A): the app keeps "(fetchFailed)"; `docs/app.md` describes the message without quoting the parenthesis. F-170 follows; B-023 is not scheduled.
- **Q-064. "certifies" in the index's opening sentences.** Decision: A
  Applied: A: the index keeps "certifies every digit it shows otherwise"; getting started defines the word. F-428 follows.

#### Section 6. Decisions that block nothing

- **Q-039. GNU units in devdocs.** Decision: ok
  Applied: ok: devdocs drop GNU units from the numeric semantics (the `pi()` rationale without the name) and keep at most one clause naming GNU units as the familiar convention behind the precedence. Amends question 2 above (its rule reaches devdocs for numeric semantics); F-183, F-240 follow.
- **Q-040. A literal past the significand limit in decimal mode.** Decision: ok. This prevents silently losing data or precision, which is exactly the behavior I want.
  Applied: ok: a literal past the significand limit is refused in either mode before anything is rounded, by intent (no silent loss of data or precision); one clause in the pages. F-041 follows; N17 is amended with it.
- **Q-041. The dalton's CODATA edition.** Decision: ok
  Applied: ok: `units.md` says "CODATA 2018"; the file stays (B-014 not scheduled).
- **Q-042. Close issue #89.** Decision: ok
  Applied: ok: #89 is closed once its tests are confirmed in `src/core/rational.test.ts` (B-033, code track); the page's clause goes either way. F-199 follows.
- **Q-043. The ratio notation's screen.** Decision: ok
  Applied: ok: a code fix (B-004, before `devdocs/notation.md` is written); until it lands one sentence in `#The rule` names the exception. F-061 follows.
- **Q-044. `mod`'s alignment refusal.** Decision: ok
  Applied: ok: a code change (B-005): `mod`'s two refusals become `fits` with the need the subtraction or the product reports; D6's edit (e) takes its first form. F-284 follows.
- **Q-045. A typed list's unit that may be zero.** Decision: ok
  Applied: ok: the pages state the accepted gap (a typed list's unit that may be zero is refused, not retried) as today's behaviour; the retry, a small change that could ride the work on #92, is issue #198 (section 12.2, item 14), linked once from `devdocs/architecture.md#Unit lists` beside the gap (section 12.3, R-3); the user docs name no issue. F-246 follows; B-010 not scheduled.
- **Q-046. The reciprocal line in decimal mode.** Decision: ok
  Applied: ok: keep and document the decimal-mode reciprocal line (the reciprocal of the shown ratio); the alternative (`want / have` from the working-digit operands) is recorded on #92 in a comment, the owner's housekeeping beside the closing of #89 (work order 00, section 6), not page content. F-038, F-043 follow; B-008 not scheduled.
- **Q-047. The schedule's cost bound.** Decision: ok
  Applied: ok: reword the cost bound now ("at most about twice the pass that succeeds", with the exception near the ceiling); a change to `workingContexts`, if wanted, is after the revamp: it is issue #199 (section 12.2, item 14), linked once from `devdocs/numbers.md#Working precision and the schedule` beside the exception (section 12.3, R-3). F-064 follows; B-011 not scheduled.
- **Q-048. `log`'s exact cases for a rational exponent.** Decision: ok
  Applied: ok: the pages document the uncertified fallback as reachable now; looking for `x^q = b^p` waits for a review of the logarithm family (not page content; no `future.md` entry, confirmed on 2026-10-12, section 12.2, item 14: it is issue #200, linked once from the logarithm row of `devdocs/builtins.md`). F-042 follows; B-007 not scheduled.
- **Q-050. Fix `gcd(a, 0)`.** Decision: ok
  Applied: ok: a code fix (B-001, before `docs/builtins.md` and `devdocs/builtins.md` are written) with the five tests; the page's statement (`|a|`) is the specification. F-285, F-152 follow.
- **Q-051. The size refusal with no count.** Decision: A
  Applied: A: "would need a significand past the significand limit, however it is computed" (the comma dropped, the clause kept) in the message work after the pages (B-020). Pages quote no no-count refusal meanwhile.
- **Q-052. Bit counts past a double's integers.** Decision: ok
  Applied: ok: counts past `2^53` are rounded to two significant digits, in the code phase (B-018).
- **Q-053. "which side of it it lies".** Decision: ok
  Applied: ok: the edge message names the edge once more ("which side of the pole", "which side of the bound"), in the code phase (B-021).
- **Q-054. The errors for `round`'s second argument.** Decision: ok
  Applied: ok: `round`'s second-argument errors are worded by the argument's place, in the code phase (B-016).
- **Q-055. The parse label "a unit name".** Decision: ok
  Applied: ok: the parse label becomes "a name", a code change of its own (B-019); the pages say "name" and quote no message that carries the label until it changes. F-089, F-474 follow.
- **Q-056. The empty output area's hint.** Decision: ok
  Applied: ok: the empty output area's hint becomes D9's wording (B-022, code phase); `docs/app.md` describes the hint without quoting it until then. F-179 follows.
- **Q-058. `exceeds` for the hull of a wide argument.** Decision: ok
  Applied: ok: the code stays; `devdocs/builtins.md` says a wide argument is refused as the step's reach. F-200 follows.
- **Q-059. The code comments: one pass, and when.** Decision: ok
  Applied: ok: one commit for every comment in bugs.md (B-034 to B-067), after the pages land so that a comment citing a page cites its final headings; the history comments go in the same commit under the style guide's rule. Section 9 item 3.
- **Q-060. The units test's wording and its failure message.** Decision: ok
  Applied: ok: "temperature difference" in the test's names and comments, `bit` among the primitives in its header, and a failure that names the line (B-032, B-059, B-060, code track after the pages); `devdocs/development.md#Adding a unit` describes the test as it behaves when the page is written. F-398, F-399, F-400 follow.
- **Q-061. Counts in `cost.md`'s prose.** Decision: ok
  Applied: ok: the counts are dropped from `cost.md`'s prose now; a generated summary line is a later addition if wanted (not scheduled). F-353, F-359 follow.
- **Q-062. The hangs table's Issue column.** Decision: ok
  Applied: ok: `hangsTable` emits links once Q-012 has placed the issues (B-070, code track after the pages). F-360 follows.
- **Q-063. The note "0 of 1 digits are certified".** Decision: ok
  Applied: ok: the note's wording stays (B-024 not a change).
- **Q-065. "the conformance tests" in `development.md`.** Decision: ok. Note that the edge sweeps behave as "conformance tests", but we haven't standardized that terminology yet, and "edge sweeps" is precise and correct.
  Applied: ok: "the edge sweeps" in `development.md`'s command table, "conformance" kept for quantities; the note is recorded: the sweeps behave as conformance tests, a term not standardized. F-462 follows.
- **Q-066. `log10(1e999999999)`: the value or the line.** Decision: ok
  Applied: ok: `devdocs/builtins.md` keeps "exactly `999999999`" (the value); the generated entry may show both lines. F-267 follows.
- **Q-067. The incomplete functions' refusals and the precision.** Decision: ok
  Applied: ok: the interim bullets say the incomplete functions' refusals move with the precision, by "at a high precision" (within Q-009). F-159 follows.
- **Q-068. `architecture.md`'s list of sister pages.** Decision: ok
  Applied: ok: `devdocs/architecture.md#(top)` points at `devdocs/README.md`'s map instead of listing sister pages. F-222 follows.
- **Q-069. The console warning for a stored version above the build's.** Decision: ok
  Applied: ok: the page stays; the console warning is not page content.
- **Q-070. Why the project keeps `experimentalDecorators`.** Decision: other: drop the clause about Vite. `devdocs/layout.md` keeps the flag with its real reason: the components use Lit's decorators in TypeScript's experimental form, which needs `experimentalDecorators` and `useDefineForClassFields: false` in `tsconfig.base.json`, as [Lit's decorators page](https://lit.dev/docs/components/decorators/) describes. Moving to standard decorators, or away from decorators, is a possible code change if the flag becomes a pain point; it is not page content.
  Applied: drop the clause about Vite; `devdocs/layout.md` keeps the flag with its real reason: the components use Lit's decorators in TypeScript's experimental form, which needs `experimentalDecorators` and `useDefineForClassFields: false` in `tsconfig.base.json`, as Lit's decorators page describes; moving off the flag is a possible code change, not page content. F-365 follows.
- **Q-071. `audit/` and `.claude/skills/` in `layout.md`.** Decision: ok. As noted above, these will be dropped after the doc refactor finishes and I don't want them mentioned elsewhere.
  Applied: ok: `audit/` and `.claude/skills/` are not listed in `layout.md`; both leave when the revamp lands and are mentioned nowhere else. F-364 follows.
- **Q-072. `exact.test.ts` in the module table.** Decision: ok
  Applied: ok: `exact.test.ts` stays in the module table and is named in the `src/core/` bullet. F-363 follows.

#### Section 7. Plan corrections

- **Q-073. Claim N8's formula wording.** Decision: ok
  Applied: ok: N8 reads `4 × (L + 10)`, "four times the sum of the precision limit and ten". Plan §1 amended (F-508).
- **Q-074. The notes' module, and the want parsed again.** Decision: ok
  Applied: ok: §1.1.6 item 1 names `src/outcome.ts` (`noteOf`) for the notes and `src/messages.ts` for the assumption warnings only; §1.2.4 states the current mechanism (the reciprocal line in `src/outcome.ts`; the parsed `have` and `want` handed over in the `Conversion`); §5 C1 and C4 need no change beyond C4's pointer (Q-103, F-507). Plan amended (F-505, F-506).
- **Q-075. Names absent, or meaning something else.** Decision: ok
  Applied: ok: §7's `units.md` bullet becomes "names that are absent or mean something else (`u`, `at`, `dB`, `e`, `rad`)"; claim Q9 adds that `at` reads as `a` + `t`, an attotonne; by F-078 nothing is said of a unit `a`. Plan amended (F-502, F-112).
- **Q-076. The module of `MIN_SIGNIFICAND_LIMIT_BITS`.** Decision: ok
  Applied: ok: §11's row names `src/core/context.ts` for `MIN_SIGNIFICAND_LIMIT_BITS`. Plan amended (F-503).
- **Q-077. `layout.md#The files` in §9.2.** Decision: ok
  Applied: ok: `devdocs/layout.md#The files` is struck from §9.2's row. Plan amended (F-504, F-366).

#### Section 8. Settled and coordination items

Decision: ok except Q-104: future.md; Q-088: devdocs follow Q-016

Every row is confirmed as the table settles it, except the two overrides:

| Item | What | Settled by, or owner page | Applied |
| --- | --- | --- | --- |
| Q-078 | N10's partial kind is reachable today | F-023 | ok |
| Q-079 | "a fourth source of inexactness" becomes a third | F-010 | ok |
| Q-080 | `widened` behaves as plan §1.1.6 item 8 says | A1's and A5's confirmed statements | ok |
| Q-081 | "as GNU units shows" goes | §12 question 2; F-118 | ok |
| Q-082 | `docs/settings.md`'s backticked devdocs names | F-134, F-026 | ok |
| Q-083 | an exact operand rounded into an inexact result | F-019 | ok |
| Q-084 | a rounding adds half a grid cell to the radius | F-017; A3's confirmed statement | ok |
| Q-085 | naming the measured factors | F-069; `docs/units.md` | ok: `docs/units.md#Which factors are exact` names the measured values and `gravity`'s convention (the owner page); the file's comments are the code track (Q-033). |
| Q-086 | "no built-in is a prefix of another's name" | F-258 | ok |
| Q-087 | name characters: any script's letters, ASCII digits | F-077, F-079 | ok |
| Q-088 | timings replaced by their reasons | F-209, F-384, F-382, F-354, F-154 | devdocs follow Q-016: a measured ratio stays, a rough timing may stay marked illustrative, counts that every run changes go (Q-061); F-209, F-384, F-382, F-354 follow under that rule, F-154's docs bullet stays qualitative. |
| Q-089 | conversion into a unit list, verified | F-072, F-073 | ok |
| Q-090 | a condition term failing behind an undecided comparison | A6's confirmed statement | ok |
| Q-091 | `2^-30000`: 69,659 bits against 69,658 | F-051, F-012 | ok |
| Q-092 | `pow`'s base `-1` | F-272 | ok |
| Q-093 | the gamma bullet and "kernel" | F-153, F-448 | ok |
| Q-094 | "kinds included" in the `div` and `mod` rows | F-268 | ok |
| Q-095 | "every built-in takes plain numbers" | F-138 | ok, within Q-009's interim edits (D5's six-function list, `atan2` included). |
| Q-096 | `factorial(20000)` and `gamma` | F-151, F-282, F-292 | ok |
| Q-097 | "a dimensionless marker" | F-093, F-459 | ok, with F-459's wording ("a marker of a kind, with no dimension of its own", or "kind marker"). |
| Q-098 | the root README's tooling sentence | F-004; §12 question 18 | ok |
| Q-099 | `approx` does not relax an exponent literal | F-051, F-046 | ok |
| Q-100 | a third way an alternative fails | F-241 | ok |
| Q-101 | issue #40 is closed | F-054 | ok |
| Q-102 | issue #88 | `devdocs/numbers.md#Roots and powers` | ok |
| Q-103 | issue #92 | `devdocs/architecture.md#The converter and its lines` | ok |
| Q-104 | issue #100 | `devdocs/numbers.md#approx` | future.md: #100's one link is in `devdocs/future.md` (Q-011, Q-035); `devdocs/numbers.md#approx` and `devdocs/builtins.md` name the binary form without the link. F-414, F-221, F-303 follow. |
| Q-105 | where adding to the definitions file is documented | `devdocs/development.md#Adding a unit`; F-108 | ok: `devdocs/development.md#Adding a unit` documents adding to the file; `docs/definitions.md#(top)` drops "how to add to it" (A9, D3), and the file is "the definitions file" (F-475). |
| Q-106 | the call rule stated twice | `docs/expressions.md#Calls and arity`; F-095 | ok |
| Q-107 | the call-cost paragraph stated three times | F-033 | ok |
| Q-108 | the Significand limit entry and `numbers.md` | `docs/numbers.md` (§12 question 5); F-018, F-014 | ok, with the sessions of `docs/numbers.md` and `docs/settings.md` reconciling D4's and D8's drafts by question 5 (the entry keeps a sentence and a link). |
| Q-109 | the dissolved section's diagrams | F-057, F-050 | ok |
| Q-110 | the probe and the memos | `devdocs/settings.md#The probe`; unverified | ok, unverified until the `devdocs/settings.md` session checks it against the memo code (F-337). |
| Q-111 | the favicon and `offline.md#Icons` | F-362 | ok, settled by reading `public/favicon.svg` against `public/icons/` in the `devdocs/layout.md` session (F-362). |
| Q-112 | `future.md`'s entry for equality operators | F-345, F-030 | ok |
| Q-113 | defined functions before built-ins | F-308 | ok |
| Q-114 | `builtins.md`'s per-function tables | stay until the generated reference | ok: the tables stay in `devdocs/builtins.md` until the generated reference replaces them. |
| Q-115 | the settings sheet's absolute link | F-177; §12 question 31 | ok: the "About these settings" link becomes local when the pages ship with the app (question 31); nothing before. |

#### Section 9. Code changes: when each lands

Decision: ok

Applied: the schedule stands as the sheet writes it, with the answers above filling it in:
item 1 (before `docs/numbers.md`) carries the "certified" change and its lines (B-068, B-017
worded by F-491, B-025, B-026 worded by Q-004) and the fix for the crash at the bound in the
form Q-002 chose (B-002, a refusal with an explicit message); item 2 (before the page that
would otherwise carry a caveat) carries `gcd(a, 0)` (B-001, before `docs/builtins.md` and
`devdocs/builtins.md`), the ratio screen (B-004, before `devdocs/notation.md`), `mod`'s refusal
(B-005, before `devdocs/builtins.md`) and the stored width (B-012, before `docs/settings.md`, which
states the clamp, and `devdocs/settings.md`, Q-049 being B); item 3 (after the pages) carries the message wording with the generated
catalogue, the test gaps, the comments (Q-059) and B-069 and B-070; item 4 stays unscheduled.
The rename of `docs/functions.md` to `docs/builtins.md` (Q-020's note) repoints two comments in
`src/units.txt`, which the page's own pull request changes with the other links to the old
name (work order 07), so that none dangles; the code track does not carry them. The work order for the code track
(`audit/work-orders/`) lists each change with the page that waits on it.

#### Section 10. Everything else in findings.md

Decision: ok; the rules set in sections 1–5 override any proposed call they touch, whatever its Related line says

Applied: every proposed call of findings.md stands unless an answer above touches it, and
the rules marked **rule** override a call whatever its Related line says. The Decision field
of each finding says which: "stands", "follows Q-nnn" or "follows F-nnn", "amended by" a
rule, or (until the owner answered the list at the end of decisions.md, section 12.2) "pending"
where that list held it. A call that
leaves a choice between drafts is the page's session's, and its pull request says which; a
call undetermined on a fact, or flagged low confidence, is read against the cited code by the
page's session, and anything still open comes back to the owner as a new question.

### Amendments to questions 1 to 31

The answers above amend the decisions recorded in questions 1 to 31 as follows; the
questions keep their text, since the numbering is cited throughout the plan and the reports.

- **Question 2** (which framing leads docs/): Q-039 extends its rule on numeric semantics to
  the devdocs, which drop GNU units from the `pi()` rationale and keep at most one clause
  naming it as the familiar convention behind the precedence (F-183, F-240).
- **Question 3** (where the interface facts live): "the settings sheet's mechanics" reads
  "the settings panel's mechanics" (F-488); the page's section is "The settings panel".
- **Question 5** (foundational detail): "the digits an approximate value is kept to" reads
  "the digits an inexact value is kept to" (F-451); "grid" is the word, named once there, and
  the ceiling is "the highest precision any pass computes at" (Q-004).
- **Question 8** ("certified"): the code change lands before `docs/numbers.md` and carries the
  panel's lines (Q-006).
- **Question 9** (cost figures in docs/): unchanged for timings; a rough duration is a
  qualitative warning and may stay (Q-018).
- **Question 10** (the exponent-bound explanation): "the table and the measurements" means the
  six-pass table of digits; the scratch build's per-size milliseconds go (Q-017, Q-016,
  F-510).
- **Question 11** (display-only characters): the docs do not say that `×` may be accepted
  later; that intent is `devdocs/future.md`'s (Q-011, Q-037). The docs say "pastes back"
  (F-457).
- **Question 12** (user definitions): the intent that user definitions are to come, and
  #132, are recorded in `devdocs/future.md` only; `docs/definitions.md` states as a plain
  fact that only the predefined definitions file is loaded (Q-011), and the file is never
  "the system file" (F-475).
- **Question 15** (the width's name): unchanged; "the panel's 'width'" already says panel.
- **Question 20** ("dimensionless" and the kinds): "dimensionless" and "plain number" are
  synonyms, the second preferred where it is clearer and where the code's words are quoted;
  "kind" wherever semantics attach (Q-019); a kind primitive is "a marker of a kind, with no
  dimension of its own", or "kind marker" (F-459).
- **Question 22** (offline and installation content): the page's sections are "Offline use",
  "Updates and the build ID" (Q-022) and "The settings panel" (F-488); the docs name the
  service worker as such (F-493) and say "a new version" and "update" as F-494 fixes them.
- **Question 23** (the probe's description): "the four elementary functions", never "the
  costliest" (F-491); the panel's line follows in the code change of Q-006.
- **Question 24** (devdocs re-explaining user semantics): the opener and link of a devdocs
  section are written when the page is rewritten, after the user pages it links exist
  (Q-008); the whole rewrite runs in topological order.
- **Question 25** (measurements in documentation): Q-016 and Q-018 say what leaves and what
  stays, corpus by corpus; Q-088 makes the devdocs follow Q-016.
- **Question 26** (issue pointers): an open issue's one link is with the passage that owns
  its concept when the issue is a bug or a performance problem (Q-012); a future extension's
  one link is in `devdocs/future.md` (Q-011; #118 and its parts by Q-013, #98 by Q-014, #100
  by Q-104 and Q-035, #130 to #134 by Q-011).
- **Question 27** (the settings migrations): a stored ratio width out of range is clamped
  like the count (Q-049, B-012), so `#Storage` states one rule.
- **Question 29** (the principle's permanent home): the linking and Markdown principles go to
  the same place (Q-029).
- **Question 31** (the hand-written pages shipping with the app): the panel's "About these
  settings" link becomes local then (Q-115); nothing changes before.

## 12.2 The owner's list, answered

The list at the end of [decisions.md](../decisions.md) ("For the owner"), written by the
apply session on 2026-10-12, was answered by the owner the same day (commit bedbfe8). Each answer
is recorded here word for word, with what it settles and which earlier decisions it amends;
the Decision lines of open-items.md and findings.md, [principles.md](../principles.md),
plan §8 and the work orders under [../work-orders/](../work-orders/) were updated from it.
"ok" takes the provisional reading the list stated.

### Items whose status under Q-011 was unclear

1. **#115, the eight designed special functions.** `ok`. Settled: the one link stays in
   `devdocs/builtins.md#The Gamma and Beta families`, in a one-line mention; `future.md`'s
   "More special functions" names the eight without the number and links that section.
   Settles the pending part of Q-012, F-290, F-303, F-346, F-348, F-417 and conflict 5.
2. **#78, where a quotient's reduction should run.** "Move this to future work." Settled:
   #78 is future work; its one link moves to `devdocs/future.md#Extensions that fit` (an entry
   beside the exact operations, linking `devdocs/numbers.md#Exact operations` for today's
   behaviour), and `#Exact operations` states where the reduction runs today as a plain fact,
   naming no issue. Amends F-221's decision and Q-012's reading that #78 stays inline as an
   open design question; work orders 11 and 18 follow.
3. **#171, the semantics of `approx`.** `ok`. Settled: future work; the sentence and its link
   leave `devdocs/numbers.md#approx` for `future.md`'s `approx(x, u)` entry (F-221, F-046).
4. **#172, the vocabulary of step, pass, settle and certify.** `ok`. Settled: it stays inline
   at `devdocs/numbers.md#The working digits`, its one link there (F-221, F-431).
5. **#173, rolling back uncertified results in decimal mode.** `ok`. Settled: future work, one
   link in `future.md` beside the display policy; `#Decimal mode` states the behaviour as a
   plain fact (F-221, F-042).
6. **#178, one uniform rule for the exact-mode display.** `ok`. Settled: future work, one
   link in `future.md` beside the display policy; `devdocs/notation.md`'s width paragraph
   states the rule as it is (F-328; work order 12, which had placed it inline, follows).
7. **#167, surfacing warnings and errors to the user.** `ok`. Settled: future work in
   `future.md`; the settings pages state the silent fallback as a plain fact (F-133, F-343).
8. **#186, applying cheap settings changes as typed.** `ok`. Settled: future work, beside #118
   in `future.md` (F-343).
9. **#191, the user's guide to the settings.** "ok. Note that this should land with the
   current docs refactor." Settled: `docs/settings.md` (work order 06) is that guide and lands
   with this refactor; the devdocs clause states where the panel's link lands and names no
   issue; the owner closes #191 when the page lands (F-342, F-343, Q-115).
10. **#110, #112, #114 and #179, developer-tooling issues.** `ok`. Settled: each stays linked
    once from the devdocs passage that owns it (F-290, F-377, F-380).
11. **The postfix `~` spelling.** `ok`. Settled: a ruled-out alternative, kept with its reason,
    the sentence losing "the likely spelling … later" (F-219).
12. **Two bullets of `devdocs/functions.md#Not in this design`.** `ok`. Settled: both ruled
    out, the first with its reason, the second gaining one or going (F-323).
13. **The bullets of `devdocs/future.md#Ruled out, and why`.** `ok`. Settled as classified:
    the number type's alternatives, the radius display, exactness as a flag and the stored
    digits move to `devdocs/numbers.md`; the offset in `Quantity` to `devdocs/functions.md`;
    the hypergeometric and Bessel functions and the statistical distributions stay as future
    work under "More special functions" (F-348, F-349, F-350). Amended on 2026-10-13 (section
    12.3, R-7, as the owner clarified it): the radius display is not a design ruled out but a
    plain fact about today's display, and not future work either; its bullet moves nowhere.
14. **Small follow-ups with no issue of their own.** "ok. Create an issue for each of these
    that doesn't already have one, and be sure to include sufficient context in each issue."
    Settled: none gets a `future.md` entry; none had an issue, so one was opened for each on
    2026-10-12: #198 (Q-045, B-010: retry a typed list's unit whose ball straddles zero), #199
    (Q-047, B-011: skip a doubled precision just under the ceiling), #200 (Q-048, B-007:
    `log`'s exact cases for a rational exponent), #201 (Q-061: a generated summary line in
    `devdocs/cost.md`), #202 (F-320: the two draws the definitions property test lacks). By
    Q-012's rule for bugs in today's behaviour, the three bugs' issues are linked once from
    the devdocs passage that owns the concept (#198 at `devdocs/architecture.md#Unit lists`,
    #199 at `devdocs/numbers.md#Working precision and the schedule`, #200 at the logarithm
    row of `devdocs/builtins.md#Domains, exact cases and edges`); #201 and #202 are tooling
    and test follow-ups that no page links. The user docs name none of them.
15. **#89.** `ok`. Settled: housekeeping; the owner closes it once its tests are confirmed
    (Q-042, B-033).

### Conflicts the rules did not settle

1. **Forward links between user pages (Q-008).** `ok`. The provisional rule is the rule: the
   page written first links the later page at the anchor the §7 outline fixes (the heading's
   lower-case, hyphenated form), the later page keeps that heading, and a page never links a
   heading the outline does not name. Amends Q-008's and F-426's decisions ("to confirm");
   restated in principles.md.
2. **Q-023's "that specific number".** `ok`. Both examples are stated without
   settings-dependent digits: `turn` into `deg` is `=` with a value a little under 360, no
   figure (Q-023, F-044).
3. **"The system table" (F-475).** "ok. If you have to name it, you can use the long form or
   else the "definitions table", since it will eventually apply to _all_ definitions (whether
   predefined or user-defined)." A **rule**, extending F-475: in prose the table built from the
   definitions file is "the definitions table", or "the table built from the definitions
   file"; never "the system table"; module and function names (`src/system-table.ts`,
   `buildSystemTable`) are quoted as they are. Restated in principles.md and §8.
4. **Q-016 against Q-017.** `ok`. As applied: Q-017's section loses its milliseconds; elsewhere
   a figure stays only marked rough and illustrative, the page's session deciding passage by
   passage.
5. **Q-012 against Q-011 on #115.** Item 1 above.
6. **F-442 and N15's wording.** `ok`. As applied: a value that cannot be told from an edge at
   the ceiling is an error, not a refusal.
7. **F-451 and the getting-started heading.** `ok`. "Approximating a value" stands.
8. **F-442 and the settings panel's declined edits.** `ok`. A **rule**, extending F-442: the
   docs say the panel "does not accept" an edit, or that a value is "held to" its range; the
   devdocs keep "refusal" there only as the code's identifier (`refusalOf`). Restated in
   principles.md and §8; plan §3, §5 C53 and §6.5 amended.

## 12.3 The owner's answers to the review of the apply step

A review of the apply step (sections 12.1 and 12.2, the rules, the plan amendments and the
work orders, read against the owner's answers) put eight calls to the owner at the end of
[decisions.md](../decisions.md) ("For the owner: the review of the apply step"), which the
owner answered on 2026-10-13 (commit 30438f8). Each answer is recorded here word for word,
with what it settles; the entries of sections 12.1 and 12.2 it changes, the Decision lines of
open-items.md and findings.md, [principles.md](../principles.md), the plan sections and the
work orders under [../work-orders/](../work-orders/) were corrected from it the same day.
"ok" takes the review's recommendation. The review's other corrections, which needed no
decision, are listed after the answers.

### The answers

1. **R-1. Q-028: does the privacy sentence link down to the devdocs?** `ok`. Settled: as
   the owner accepted V8's proposal, the privacy sentence in `docs/app.md#Offline use` links
   `devdocs/security.md#The page`, which may link back; §9.2 does not forbid every link down
   (work order 01 links `devdocs/numbers.md` at the section level, Q-082). The heading "The
   page" stays, since a page written earlier links it; nothing else on `app.md` links down
   (F-180 (5)). Amends Q-028's entry in section 12.1 and the decisions of F-171 and F-180;
   work orders 08 and 25 follow.
2. **R-2. Q-028: the privacy sentence's wording.** "B, with the clarification that it
   _only_ polls the service for updates to the static assets and does _not_ push any local
   data to the service, etc. As noted, "nothing you type leaves the device"." Settled: the
   sentence opens with V8's "Nothing you type leaves the device" and says that the app calls
   no third-party service, that it contacts only the host it was loaded from, and only for
   its own static files (to load them, and to check for and fetch a new version), and that
   it sends that host no local data. In page prose "update" stays a verb (F-494), so the page says "a new version"
   where the owner's note says "updates", and says how often the app checks as "Updates and
   the build ID" describes it. Work orders 08 and 25 follow.
3. **R-3. Item 14: do the pages link the new issues?** `ok`. Settled: the three links stay,
   each beside the gap its page states as today's behaviour (Q-012's rule for a bug): #198
   at `devdocs/architecture.md#Unit lists`, #199 at `devdocs/numbers.md#Working precision
   and the schedule`, #200 at the logarithm row of `devdocs/builtins.md#Domains, exact cases
   and edges`; #201 and #202 are linked from no page, and the user docs name none of them.
   Corrects the entries of Q-045 and Q-047 in section 12.1, which said "not on a page";
   work orders 11, 13, 15 and 17 follow.
4. **R-4. F-442: is a literal past a size limit a refusal or a rejection?** `B`. Settled: a
   literal past the hard bound or the exponent bound is a size refusal in both corpora,
   stopped as it is typed (the owner's note allowed for the grammar's bounds); past the
   exponent bound it is the same refusal, `overflow`, as a computed value past it.
   "Rejection" covers only text rejected for its form and the definitions-line faults, and
   the code's `Rejection` is named as it is; in the docs, text the grammar does not read
   stays "an error as it is typed". Amends the entries of F-441 and F-442 in section 12.1,
   the refusal rule of principles.md, plan §8's refusal and hard-bound rows, §5 C22 and C62,
   and the decisions of F-053, F-076, F-090, F-441 and F-442; work orders 01, 03, 11, 13
   and 14 follow.
5. **R-5. `!=` in conditions: ruled out, or future work?** `A`. Settled: `!=` goes with
   equality as future work, under `devdocs/future.md`'s entry for the equality operators and
   conditional expressions (Q-112); `devdocs/functions.md#Not in this design` keeps
   disjunctions and the assertion on a result's value; `#Conditions` and `docs/numbers.md`
   state as a plain fact that there is no equality and no `!=`. The decisions of F-030,
   F-323, F-345 and Q-112 note it; work orders 01, 14 and 18 follow.
6. **R-6. F-491: how firm is the owner's note on the probe?** "A. That was always the
   intention, and this is why I hedged with "necessarily"." Settled: the note is recorded in
   the owner's words, not as a decision: there is no plan to extend the probe to the
   expensive special functions; keeping the interface responsive during long computations is
   the scheduler's work (#118, future work). Amends F-491's entry in section 12.1 and its
   decision; work order 00 follows (B-017 changes the line's wording only).
7. **R-7. "Real values only": a plain fact, or a ruled-out design?** "A. Just as with
   complex numbers, this might be changed in the future." Asked the same day whether "this"
   covers the error radius that option A named, the owner answered: "I actually _specifically_ meant that "never shows the radius" might change in the future, and this is not an explicit design choice, just a description of current display behavior. It is not high enough priority to be mentioned as a future design consideration either. It's just out of the picture for now. Complex numbers _are_ a consideration for future work."
   Settled: "real values only" is a plain fact about today, stated so in
   `docs/numbers.md#Real values only`, and complex numbers stay future work
   (`devdocs/future.md#Complex numbers`). That the app never shows the error radius is
   likewise a plain fact about today's display, and not a design ruled out by intent nor
   future work: `docs/numbers.md#Exact and inexact values` states it as a plain fact, with no
   reason and nothing of what may come; `devdocs/numbers.md#Certification and the display
   rule` describes the display as it is, giving no reason as for a design decision; and
   `devdocs/future.md` gets no entry for it. The radius bullet of `future.md#Ruled out, and
   why` therefore moves nowhere and goes with the section. Plan §7.1's row for the designs
   ruled out by intent gives the temperature reading as its example (a function, not a unit
   with an offset; item 13; work orders 02 and 14) and names neither "real values only" nor
   the radius as one. Amends item 13 of section 12.2, Q-011's entry in section 12.1 (the
   owner's example of a ruled-out design) and principles.md's restatement of it, plan §7
   and §7.1, and F-350's decision; work orders 01, 11 and 18 follow.
8. **R-8. "update" as a noun in headings.** `A`. Settled: headings and labels keep the noun
   ("Updates and the build ID", Q-022's section of `docs/app.md`; "Update checks" in
   `devdocs/offline.md`); prose follows F-494 ("a new version" for the deployment, "update" a
   verb). Amends F-494's entry in section 12.1 and its decision, principles.md and plan §8's
   row; work orders 08, 13 and 23 follow.

### The review's other corrections

Applied on 2026-10-13 with the answers above; none needed a decision.

- **Left stale by the second pass (section 12.2).** Q-023's entry no longer asks the owner
  (conflict 2 settled it); Q-045's and Q-047's name their issues (R-3); section 10's Decision
  line had the sheet's own instruction appended to it, now removed; plan §4.2's #115
  sentence states item 1's answer; work orders 11, 14 and 26 no longer wait on item 13; the
  work orders' README lists section 12.2's hand-offs (#78 and #173 from 11, #178 from 12,
  #167 and #186 from 16, all to 18), and every work order cites sections 12.1 to 12.3.
- **Slips against answers already given.** B-020's wording keeps ", however it is computed"
  (Q-051, A); D6's one-clause additions wait for the generated reference (Q-009, B: plan
  §4.4); the scratch build's per-size milliseconds go (Q-017: plan §1.1.4, §5 C21, §9.1,
  work order 01); getting started defines "certified" by example (Q-064, A; F-428: plan §7,
  work order 10); work order 07's pull request repoints every link to `docs/functions.md`,
  the two comments in `src/units.txt` included (Q-020, Q-008: work orders 00 and 07, Q-020's
  entry, section 9's paragraph); `units.md` names the three documents Q-033 adds to the
  file's header (work order 05, Q-033's entry); no page quotes the edge message before B-021
  rewords it, and `numbers.md` quotes the two size refusals (Q-007: work orders 01 and 10);
  the rounding sentence names every function and mode (Q-025: work order 01); the kinds'
  intent reaches `devdocs/numbers.md` (Q-001: work order 11); no page names the code track
  (Q-071: work order 12); D7's Gamma ordering waits on F-154's check (work order 15); the
  distributions carry the owner's Q-010 note alone, and #173 sits beside the display policy
  (work order 18); the comments land in one commit after all the pages (Q-059: work orders
  00 and 22); B-012 lands before `docs/settings.md` too (Q-049's entry, section 9's
  paragraph, work order 00); "neighbor" (F-436: plan §1); the notes quoted as "certified"
  (Q-006: plan §1 N10, N11); no "refusal the loop does not retry" (Q-001: plan §1 N7, work
  orders 01 and 17); "half a cell of the working grid" (F-431, Q-084: work order 11); the docs' edge
  phrase, never "straddle" or "midpoint" (F-447, F-438: work orders 02 and 04); "the
  definitions table" (conflict 3: work order 02); `atan2` among the functions that take
  quantities (Q-095: work order 02); `1` glossed as a plain number's dimension (F-463: work
  order 02); "grid" on the settings page (Q-004: work order 06); the settings outline's
  "refusals; clamps" (conflict 8: plan §7); "refusal" on `devdocs/settings.md` (F-442: work
  order 16); F-362's branches restated and F-375 left to `testing.md` (work order 19).
- **Process.** `docs/definitions.md` is edited once: work order 04 deletes `#What the file
  contains` and links `units.md` forward (conflict 1), and work order 05 carries its
  contents. A developer page renames or deletes a heading only where its work order says
  so, and updates every link to it in the same pull request (the work orders' README; work
  orders 07, 16 and 18). The alternative Q-046 records on #92 is the owner's housekeeping, a
  comment on the issue (Q-046's entry, work order 00).
- **Checked and left as it was.** Work order 13's two GNU units clauses (lineage at the top,
  the precedence in `#Expressions`) match Q-039's accepted proposal, one clause in each
  place, and F-001's decision.
