# Owner decisions for the docs rewrite

Every choice the audit leaves to the owner, on one sheet, in the order they are best made.
The items come from [open-items.md](open-items.md) (Q-), [findings.md](findings.md) (F-)
and [bugs.md](bugs.md) (B-). Each item gives only what the choice needs, and its ids lead
to the evidence. A recommendation weighs the units' evidence as their reports give it:
nothing was re-run for this sheet.

Sections 1 to 4 hold the 45 choices that take thought. Sections 5 to 7 are single proposals,
mostly to accept, and sections 8 to 10 take one answer each.

Answer here, not in the Decision fields of `open-items.md` or `findings.md`. The apply step
(the last section) copies each answer into
[plan/12-open-questions.md](plan/12-open-questions.md), where [README.md](README.md) keeps
the owner's decisions, and fills those fields from it.

## How to answer

Each item ends with a Decision line. After the colon, write one of:

| Write | Meaning |
| --- | --- |
| `A`, `B`, `C` | the option with that letter |
| `ok` | the recommendation, or the proposal where there is only one |
| `other: …` | your own answer, in your words |
| `defer` | not now: the item stays open, and a page it blocks waits for it |
| `ask: …` | a question for the next session, answered under the item before you decide |

Anything after the answer is a note, kept word for word in the record. A note longer than a
line continues on lines indented by two spaces.

Each numbered section has a line `- Section done:`. Write `yes` there once you have been
through the section. In a section marked done, a blank Decision line means `ok`, so you write
only where you differ. In a section not marked done nothing is applied: its blanks mean "not
read yet", so you can stop and push at any point.

Change only the Decision and Section done lines and the overrides table in section 10. Keep
every item and its options as they are, so that the record shows what you chose between.

An answered item looks like this (the id is a placeholder):

```
### Q-nnn. An example item

- A. Keep the passage as it is.
- B. Rewrite it to the current design.
- Recommended: B, since the code changed on purpose.
- Decision: A, but name the issue in one sentence.
```

The other answers, as written:

```
- Decision: ok
- Decision: other: keep the example, renamed, in devdocs only;
  the user docs show none until the fix lands.
- Decision: ask: does a test pin the parenthesized form?
- Decision: defer
```

To answer in conversation instead, give a session lines such as `Q-001: A` and have it write
them in here; the record is the same.

## 1. Contested decisions that block a page

The units, or the units and the plan, disagree on each of these, and each holds up a page.

- Section done: yes

### Q-001. `tooLarge`: one kind never retried, or classes some of which are retried

The plan records from your review that there are classes of `tooLarge`, "some of which the
retry loop retries" (claim N21, a §1.1.5 row, §1.1.6 item 14). Four units find one kind,
carrying a reach and a need, that the loop never retries: a refusal at a later pass ends the
loop with the best result so far.

- A. One kind, never retried by the loop, as the code and today's devdocs have it. N21, the §1.1.5 row and §1.1.6 item 14 are corrected; the passages stay. The pages may add that a refusal is retried inside a single step (decimal mode's `powered` and `summed`, the settle-first sum, the retried product and quotient), never by the loop (A3), which may be what the review meant.
- B. Classes of `tooLarge`, some retried by the loop. The code does not do this: a code change, with the pages describing the intent until it lands.
- Recommended: A, unless you meant B. The code is consistent, the current pages describe it, and A1, A3, A5 and V1 agree.
- Blocks: `docs/numbers.md#Values too big to hold`; `devdocs/numbers.md#The significand limit`, `#Which limit a refusal names`, `#Working precision and the schedule`.
- Evidence: F-051, F-509.
- Decision: other: the internal retry looks as they exist in the code today
  should be considered correct (unless there is some bug in internal
  consistency, etc). The intent behind classification of failure kinds is to
  signal the failure type to the _user_, who can choose to retry if there's a
  chance that increasing the significand width would resolve the issue. This is
  exactly what the kinds attempt to convey.

### Q-002. A literal whose rounding carries past the exponent bound

`9.5e1000000000000000000` at one digit, or `9.99999999e1000000000000000000` at eight, rounds
to `1e+1000000000000000001`, past the bound. Today the outcome throws while composing the
line, and no answer appears (B-002). Both units call the crash a defect; they differ on what
replaces it.

- A. Write the line, and let the bound refuse it only when it is typed back (A2). This is the decision `devdocs/notation.md#Every literal parses back` records, and its reasons rule out B. One literal, at the bound, does not paste back.
- B. Refuse such a rounding as the bound's `overflow` (A8). Every line pastes back, but a correctly rounded value is refused.
- Recommended: A. It is the recorded decision, the line is correctly rounded, and it touches only values within a rounding of the bound. Either way B-002 is fixed before `docs/numbers.md` is written (section 9).
- Blocks: `devdocs/notation.md#Every literal parses back`; `docs/numbers.md#How numbers are written` (claim N12's edge).
- Evidence: F-060, B-002.
- Decision: B. The goal of being able to paste back literal values is firm. We
  should fail on rounding, but surface an explicit and helpful error message to
  the user, e.g., "rounding EXPRESSION causes an overflow", with the offending
  expression referenced clearly. (Existing error messages, where they do not
  have bugs, are currently quite good at this.)

### Q-003. The ratio before the reciprocal line's `×`: bare or in parentheses

`docs/settings.md` and `devdocs/notation.md#Where a ratio is written` write
`in = (1/36) × 3 ft`, with a reason: the parentheses "cost two characters and save the reader
the rule". The printer writes `in = 1/36 × 3 ft`, and `src/outcome.test.ts:97` asserts it. The
squashed history does not say which came later.

- A. The code stands and the pages follow (A2, D4, V5, A8). The printer has one rule, the fewest parentheses that read the line back, and `*` and `/` share a level.
- B. The pages stand: a ratio before `×` is parenthesized as a special case in the printer or the outcome, and the test changes.
- Recommended: A. One printer rule beats a special case for one position, and three drafts already write the bare form. B is the intent the pages state, if you still hold it.
- Blocks: `devdocs/notation.md#Where a ratio is written`; the Notation entry of `docs/settings.md`; `docs/numbers.md#How numbers are written`.
- Evidence: F-121; the item's `= -1e+8` half is settled (F-120).
- Decision: A, as long as this results in the _correct_ AST parse. That was the
  entire point of parentheses in the first place. If that concern doesn't apply
  here, then ditch it. The original idea was to make fractional expressions
  with bare units such as `(1/2) in` parse correctly. This is _not_ the same (in
  the current grammar) as `1/2 in`, which a user might prefer to see, but which
  is _not_ equal to `0.5 in` due to the fact that juxtaposition binds more
  tightly than division via `/`. The docs need to clearly state this edge case
  if it isn't already documented. Note that this is also a rough edge in the
  expression grammar itself, and users might get tripped up by it at the moment.
  I do want to revisit the grammar later, but that is not up for debate in the
  current docs rewrite, which need to capture the current behavior as intent.

### Q-004. The ceiling's gloss, and "grid" in the user docs

Plan §8 glosses the ceiling as "the finest grid the app rounds onto". A3 finds, reasoning
from the code, that the ceiling is the last pass's precision. Each pass settles onto a grid
about ten digits finer: 28 digits at the first pass of eight, 4,050 at the ceiling pass of
4,040. D8's rerun found the same 4,050. D4's, D8's, V5's and A1's drafts keep §8's gloss.

- A. Re-gloss the ceiling as "the highest precision any pass computes at", and keep "grid" out of the user docs (A3).
- B. Re-gloss the ceiling as in A, but keep "grid" in the user docs, explained once in `numbers.md` as the digits an approximate value is kept to (§8's grid row; D8, A1).
- C. Keep §8's gloss.
- Recommended: B. C is about ten digits off on the units' evidence. The drafts already lean on "grid", so keeping the word, stated once, costs the least rework. The probe's proposal line, "a grid of 4,040 digits" (B-026), is reworded to match.
- Blocks: the Precision limit entry of `docs/settings.md`; `docs/numbers.md#How a value is held` and `#Digits you can trust`; V5's replacement of `devdocs/settings.md#The model`.
- Evidence: F-125, F-429, F-431.
- Decision: B. This is clearly semantically correct and is the intent we want to
  capture in docs. And the "grid" abstraction is useful for understanding
  rounding/snapping/midpoint behavior.

### Q-005. The ceiling's formula in the user docs

"Four times the limit plus ten" reads as `4L + 10`, but the code computes `4 × (L + 10)`:
4,040 at the default, not 4,010. Every unit corrects the wording to "four times the sum of
the limit and ten". The settings panel never writes the formula, and shows the ceiling's
number only in the probe's proposal.

- A. Give the formula once, in the Precision limit entry, in the corrected wording with 4,040 beside it (D4, A1). Elsewhere give the number, or a link.
- B. Give no formula in the user docs: the ceiling grows with the limit, and is 4,040 at the default. Only devdocs give the formula.
- Recommended: A, so that a user who changes the limit can predict the ceiling, which the panel does not show. D4's and D8's drafts take the corrected wording either way.
- Blocks: the Precision limit entry of `docs/settings.md`; `docs/numbers.md#Digits you can trust`.
- Evidence: F-022, F-126; claim N8 is corrected either way (Q-073).
- Decision: A. The current, sloppy wording was an oversight.

### Q-008. When a devdocs edit may link a user page not yet written

Under §12 question 24 a devdocs section opens with a link to the docs section that owns its
concept. But `docs/numbers.md`, `quantities.md`, `expressions.md` and `app.md` do not exist
yet, and their anchors are not fixed. The four units that asked gave four answers.

- A. Wait: rewrite each devdocs page in one pass, once the user pages it links exist (V2). No link dangles, and no page is edited twice.
- B. Split: apply the edits that link nothing new now, and the section openers when their target page lands (V1).
- C. Link ahead: write the links to the §7 outline's names now, and correct the anchors once the pages exist (V5). V4 instead links today's pages meanwhile.
- Recommended: A. It fits the order of work: user pages first, devdocs after.
- Blocks: every devdocs rewrite that pares a section to a sentence and a link (V1, V2, V4, V5).
- Evidence: F-426.
- Decision: A. My intention was always to write the docs in topo order. If
  that's not captured anywhere (and it goes beyond these smaller linking
  problems anyway), please note that where relevant.

### Q-009. `docs/functions.md` before the generated reference: how much to correct

Plan §4.4 corrects this page only where §9.4 tags a passage stale, until the reference
generated from structured comments exists. The units drafted more. D5's six old→new pairs
and D7's bullet edits correct statements the code contradicts. D6's bullets 7 to 10 align
the terms with §8 and add three "(addition)" clauses. D8 reduces the `approx` bullet to a
signature, one sentence and a link to `numbers.md#approx` (§12 question 14).

- A. §4.4 strictly: only the passages §9.4 tags. Everything else waits for the generated reference.
- B. §9.4's passages, plus every contradiction (D5, D7) and the terms (D6). The `approx` bullet becomes its reference entry (D8). The "(addition)" clauses wait.
- C. B, plus D6's three additions now.
- Recommended: B. A page left contradicting the code misleads until the reference lands, and §8 binds every page. New content is better written once, in the generated entries.
- Blocks: the interim edits to `docs/functions.md` (D5, D6, D7, D8).
- Evidence: F-148, F-138, F-154; Q-067 and Q-095 follow the answer.
- Decision: B

### Q-010. Statistical distributions: deferred built-ins, or definitions

`devdocs/future.md#Ruled out, and why` rules them out, as one-line functions over the Gamma
and Beta families. Your clarification makes the ruled-out built-ins "deferred for the
initial calculator", and §1.3 lists "statistical distributions as built-ins" among the
deferred classes.

- A. Deferred built-ins, as §1.3 lists them. D7's and V3's drafts of `builtins.md` say "deferred rather than ruled out".
- B. Not built-ins at all: they belong in definitions, the system file's or a user's (V6). This departs from §1.3 as written.
- C. Deferred, with V6's design note: they may come as definitions over the Gamma and Beta families rather than as built-ins in the kernel.
- Recommended: C if V6's reason matches your intent, A if not. C keeps §1.3's "deferred", and V6's reason, without ruling anything out.
- Blocks: `devdocs/future.md#Ruled out, and why`; the last paragraph of `devdocs/builtins.md#The Gamma and Beta families`; `docs/functions.md#Not provided`.
- Evidence: F-348.
- Decision: other: Just note these as being deferred for now, with a possible
  implementation to follow in the future. Not all functions of interest can be
  efficiently implemented in user definitions anyway, for example,
  inverse/quantile statistical functions.

### Q-015. The `dozen` running example

`dozen(n: in) = 12 n` with `~dozen(len) = len / 12` takes a name the file already defines as
a unit. It could not be added to the file as written, and a reader cannot try it in the app:
`2 ft` into `dozen` is a mismatch.

- A. Keep it, said once to be the page's own definition (A8). No function in the file has an annotated parameter and an inverse that could replace it.
- B. Rename it to a name the file does not define, keeping its shape: `twelve` (V4, D2).
- Recommended: B. The example keeps its shape and stops colliding with the file, and V4's edits already use `twelve`.
- Blocks: the examples of `devdocs/functions.md` (`#Definitions`, `#Annotations`, `#Display`) and of `docs/definitions.md#Functions`.
- Evidence: units A8, D2, V4.
- Decision: B. (I would also accept creating an entirely new example that
  doesn't even run into this `dozen` collision problem in the first place.)

### Q-016. Which numbers leave devdocs under question 25

Question 25 removes concrete timings "wherever reasonable". The pages also carry measured
ratios ("about forty times cheaper"), run counts (the sweep's cases), counts that describe an
algorithm (convergents, 768 and 443,000; terms, 89 against 11,837), memory sizes (the
Bernoulli memo's megabytes), the tools' constants (a floor of a second, the two-minute
deadline, the probe test's five seconds) and model figures (38 per decade for Karatsuba).
Plan §10 says V3's measurements stay, against question 25 (F-510).

- A. Drop timings, run counts and measured ratios; a ratio becomes qualitative ("many times cheaper", as V1 and V7 write it). Keep the code's and the tools' constants, the model figures the thresholds derive from, and the counts that describe an algorithm: terms, bits, convergents, memory (V7, V3, D7).
- B. As A, but keep measured ratios too (A1).
- C. Drop every measured number, counts and memory sizes included. Keep only constants.
- Recommended: A. It keeps every number that is part of the design, and drops every number that moves with the machine. §10's line yields to question 25.
- Blocks: the measurement rewrites of `devdocs/builtins.md`, `testing.md`, `benchmarks.md` and `numbers.md`.
- Evidence: F-188, F-209, F-300, F-371, F-386, F-392, F-510.
- Decision: A, for user docs. Just make sure to keep memory approximations,
  since these will typically hold across machines and have more to do with
  JavaScript engine representations (which change slowly and are constrained by
  the spec anyway.) Ratios and machine-portable heuristics, etc., _are_ useful
  in devdocs, not user docs. I do want to keep rough timings in _developer_ docs
  where this clarifies issues or adds weight to decisions. Those should be
  considered "rough" though, and only illustrative, or else the docs should just
  talk about ratios or how things are physically observable to a user.

### Q-018. Rough durations: "a few seconds", "a fraction of a second"

Is a rough duration a timing under questions 9 and 25? `devdocs/development.md` says
`pnpm test` takes "a few seconds", and the probe's description says it runs "for a fraction
of a second", which depends on its budget. For `docs/`, question 9 already gives "the page
waits while it runs" (F-131).

- A. They are timings and they go: for example "`pnpm test` is the quick run for every edit" (V8, D4).
- B. They are qualitative and they stay (V7, on its own pages).
- Recommended: A. A rough duration drifts like any timing, and "the quick run" says what the reader needs.
- Blocks: `devdocs/development.md#Commands`; `devdocs/settings.md#The probe`; V7's pages, which follow the answer.
- Evidence: F-131, F-393.
- Decision: B, while acknowledging that they may drift. To minimize risk of
  drift, we should be very broad-generous in terms. Knowing "this test will take
  a few seconds" versus "this test will take about half an hour" is crucial
  information for a developer, and makes it clear why some tests are not to be
  run on every commit (or conversely, why they _should_ be run on every commit).

## 2. Terminology

The rows of plan §8 that the units read differently, and the terms §8 lacks on which they
disagree. Each answer becomes a §8 row and binds every page from then on. The other
terminology findings carry one proposal each, or follow an item here, and go with the
findings (section 10). The ceiling's gloss is Q-004.

- Section done: yes

### Q-019. "plain number" or "dimensionless" in devdocs

§8 makes "dimensionless" the term in both corpora, glossed "a plain number" in docs. The
code's rule `plainNumbers` and the messages say "plain number".

- A. Devdocs may write "plain number" where they quote the code's rules and messages, defined once per page as dimensionless: neither dimension nor kind (A7, V3, V4, A9). Prose elsewhere says "dimensionless".
- B. Devdocs say "dimensionless" throughout, with "dimensionless (a plain number)" once per section (D5, V2, V6, V7).
- Recommended: A. `devdocs/builtins.md#Dimension rules` mirrors the rule names and messages a reader meets in the code, and one definition keeps the two words tied.
- Evidence: F-460.
- Decision: A. "Dimensionless" should be preferred where it is not too clunky,
  but "plain number" is sometimes clearer/simpler. The important thing is that
  these should be considered _synonyms_, with the word "kind" used any time we
  are attaching semantics to a particular class of values (as of now, only
  angles are treated specially with kinds).

### Q-022. "build number" or "build ID"

- A. "build ID" in both corpora, with the footer's label "Build" quoted where the footer is described, and `docs/app.md`'s section "Updates and the build ID" (D9, V8). §5 C57 changes with it.
- B. As A, with the section titled "Updates and the build" (V8's links).
- C. "build number" in docs, as §5 C57 and today's pages have it; "build ID" in devdocs and the code.
- Recommended: A: one name in both corpora, the one the code uses.
- Evidence: F-492, F-251.
- Decision: A

### F-431. A pass's grid, its precision, and the working digits

- Proposed: in devdocs, "the working grid" for the grid a pass settles onto, "working precision" for a pass's precision, and "working digits" for the decimal-mode setting alone (A1, A3, V1). In docs, "the digits an approximate value is kept to" (D8). Never "working precision" for the grid; #172 renames the code.
- Against: A4 keeps §8 as written; V3 and V5 write "working precision" for the grid's digits.
- Decision: ok

### F-436. "neighbor" and "the neighbor rule"

- Proposed: the American spelling, "neighbor". "The neighbor rule" is devdocs-only; docs say "the correctly rounded sum" and show the example (A4, V1).
- Against: claim N20, which `docs/numbers.md` is written from, names the rule.
- Decision: ok

### F-437. "absorbed into the radius"

- A. Devdocs only; docs say it plainly, with "error radius" (A1).
- B. Docs keep the idiom, always as "absorbed into the error radius" (A5, D8).
- Recommended: B: plain language, with §8's noun for docs.
- Decision: B

### F-439. "canonical"

- Proposed: devdocs-only, for the held form and the printed text alike. Docs say "the fraction is kept with no factor of ten in its denominator" (A1, V1), or "how the app writes an expression back" (D1).
- Decision: ok. We do need to spell out what "canonical" means explicitly.

### F-440. "decimal exponent"

- A. §8's rule: docs may say "decimal exponent", saying which "decimal" at first use.
- B. Docs say "the exponent", meaning the power of ten's; "decimal exponent" only in devdocs, where a binary one could be meant (D8).
- Recommended: B. The user docs never meet a binary exponent, and D8's draft of `numbers.md` already reads so.
- Decision: B

### F-441. "hard bound"

Devdocs say "the hard bound", glossed once and qualified where §5 C58's other hard bounds are
near; never "hard precision bound". The choice is the docs phrase.

- A. "the largest significand limit the settings allow" (D1).
- B. "the most the significand limit can be set to" (A5, V1).
- Recommended: B, the plainer.
- Decision: B

### F-442. "rejected" in the user docs

- A. Docs say "an error" for text refused as typed, keeping "refusal" for the three size refusals (D1, §8).
- B. Docs also say "rejected", for text the grammar does not read (A5, D2).
- Recommended: A: §8 as written, and one word fewer for the reader. Devdocs keep "rejection" either way.
- Decision: A. Note that devdocs should be unified with this terminology, and
  "rejection"/"rejected" should be kept as a distinct notion. A "refusal" is
  _always_ a size refusal, and most likely involves evaluation (except perhaps
  in the few cases where the grammar bounds things).

### F-447. Edge, boundary, bound; touch, straddle

- Proposed: in devdocs, "touch" for an end exactly on the point and "straddle" for reaching across it; "edge" for the point a result depends on; "boundary" for a rounding cell's end; "bound" for a condition's, and for the exponent bound (A6, V1). In docs, one phrase, "a value whose bounds reach or meet the edge", with §8's "cannot be told from" (A6). D2's draft's "straddle" is reworded.
- Decision: ok

### F-451. "approximate" or "inexact" in the user headings

- A. Headings use the plain gloss "approximate", as §7's do ("Exact and approximate values", "Making a value approximate").
- B. Headings use "inexact" (D3, D6).
- Recommended: A. Headings are what a reader scans, and §8 keeps "approximate" as the plain-language gloss. Body text follows §8 either way.
- Decision: B. Let's switch to "inexact" everywhere that we mean a number (ball)
  with a non-zero radius. "Approximate" and its variants should be reserved for
  the act of _making_ a value inexact (e.g., through `approx` and possibly other
  utilities in the future). This firms up language and semantics.

### F-455. Rule 4's form in the ratio notation

- A. "scaled ratio", glossed once as "a ratio times a power of ten" (V5).
- B. "a ratio times its power of ten" in prose, with the field's name, `scale`, devdocs-only (A2).
- Recommended: A. A name can be referred to, and V5's edit of rule 4 uses it.
- Decision: A. Note that there are still questions about canonicity here, due to
  factors of ten in the significand (numerator _or_ denominator). That is a much
  bigger design question than terminology though.

### F-457. "pastes back", "parses back", "typed back"

- Proposed: docs say "pastes back", as §12 question 11 and §7 do; devdocs say "parses back" (A2). A2's "can be typed back" is the alternative for docs.
- Decision: ok. Note that "pastes back" is technically the only accurate reading
  here, because the rendering _cannot_ be typed back as-is: we use some invalid
  characters to make the results more "display-friendly". (Future grammars may
  except them, but are out of scope right now.)

### F-459. The gloss for a kind primitive

- Proposed: "a marker of a kind, with no dimension of its own" (V2), in both corpora. The alternatives are A7's "marks a kind of quantity that has no physical dimension, so that an angle is told from a plain number" and D2's "a marker that keeps apart quantities which would otherwise look alike".
- Decision: ok. I'm also fine relaxing or tweaking the wording to make it
  shorter, e.g., by referring to such a marker as a "kind marker".

### F-468. Output modes by number

- A. Name each output mode by its want (one unit, a unit list, a function, a blank want), never by an ordinal (A8).
- B. Ordinals may stay as the devdocs' count: "the third output mode" (V2).
- Recommended: A: a name survives a fifth mode. "output mode" joins §8 as a devdocs term either way.
- Decision: A

### F-471. When "have" and "want" reach the user pages

- A. Each page uses them from its rewrite, the whole page at once (A8). Getting started introduces them when it is written, and `docs/app.md` names the field labels.
- B. No page uses them until getting started exists (D2).
- Recommended: A. Getting started is written last, so B would leave every page on the old phrasing until the end; and since each page is rewritten whole, D2's concern, one pass per page, holds anyway.
- Decision: A

### F-475. "system" for the definitions file

- A. "system" may qualify the file against user definitions, as in "the system file" (A9), as §8 and §12 question 12 do.
- B. "system" only for a system of units; the file is always "the definitions file" (D3).
- Recommended: A. The plan already uses it so, and the contrast with user definitions needs a word.
- Decision: other: "system" on its own is ambiguous and overloaded. "System
  definitions file" is acceptable, but I would prefer something like "predefined
  units file" or even "preamble", which is most general and less confusing than
  "system". I'm open to suggestions here, as "preamble" comes with its own
  baggage and might feel like jargon to people not used to programming
  languages.

### F-483. "interval" in the user docs

- A. Never in docs, as §8 has it: "temperature difference" for the units (§12 question 19), and no mathematical interval either.
- B. Docs may use the mathematical sense (D2's draft).
- Recommended: A.
- Decision: A

### F-488. "sheet" and "panel"

- Proposed: "the settings sheet", or "the sheet", in both corpora for what the user opens; "panel" only for the component, as `settings-panel.ts` names it (D9, V7). D4 and V5 agree on "sheet" and differ only on naming the component.
- Decision: "settings panel" is much clearer. "Panel" is generic and will almost
  certainly hold under any UI refactoring. The "sheet" just so happens to be the
  _current_ visual design, but is subject to change and not fundamental to the
  settings flow.

### F-489. Naming the user corpus

- A. "the user docs", the plan's term.
- B. "the user guide" (V5).
- Recommended: A, since §7 already uses "guide" for a page's role (getting started, `app.md`). V5's "line" for a line of the sheet joins §8 either way.
- Decision: A. The "user guide" is a specific getting-started/examples-driven
  doc subset.

### F-491. The probe's functions

- Proposed: "the four elementary functions" (§9.4), not "the costliest", which §12 question 23 calls incorrect for the built-ins, unless the benchmarks bear the ranking out (D4). The sheet's probe line in Q-006 follows this answer.
- Decision: ok. As I've noted elsewhere, I don't necessarily plan to extend the
  probe to arbitrary, expensive special functions, which might be impractical to
  satisfy to a high precision with good UI responsiveness. This is why we have
  follow-up work to make the UI responseive even during long-running
  computations.

### F-493. After "service worker" is named once in `docs/app.md`

- A. Docs say "the service worker" from then on (D9).
- B. Docs say "the app" or "its offline copy" from then on (V8).
- Recommended: B: a user acts on the app, not on its mechanism. Devdocs say "service worker", then "the worker", either way.
- Decision: other: I'm not sure exactly how we are bringing up the term "service
  worker" in user docs. This _feels_ like an implementation detail that many
  users need not understand, but which is necessary to get the app working
  offline robustly. It might be worth a brief mention, but in that case, we
  should call it what it is ("service worker") rather than only informally
  describe what it does. However, we should also clearly call out that it allows
  the doc to be served offline in user docs at the time we introduce this term.
  The devdocs should use "service worker" consistently.

### F-494. "a new version" and "update"

- A. Docs say "a new version", and "update" only as the footer's word (D9).
- B. Docs say "a new version" for what is deployed, and "update" for the footer's link and for switching to it (V8).
- Recommended: B: "update" is the verb a user reaches for anyway. "deploy" stays devdocs-only either way.
- Decision: other: I think I want B, but I want to clarify: "a new version"
  describes a new deployment that could be pulled, and "update" is always a
  verb to describe what a user (or page refresh) does.

## 3. Design calls inside findings.md

Findings whose call turns on what you intended, and which no open item asks.

- Section done: yes

### F-070. A conversion's ratio refused at the significand limit

`3^30000 m` into `5^20000 m` is refused as needing a significand past the limit, and the
message names `approx`. `devdocs/architecture.md#Conversion` says a ratio is refused "as the
quotient it is, today at the exponent bound", and a comment in `src/core/convert.ts` says the
ratio is never `tooLarge`.

- A. Intended: the design moved and the page did not follow. The pages state the refusal, and the comment is corrected (B-038).
- B. Not intended: a conversion's ratio should not be refused at the limit. A code change.
- Recommended: A. The refusal is the quotient's ordinary limit, and its message offers the remedy.
- Blocks: `docs/quantities.md` (claim Q13); `devdocs/architecture.md#Conversion`.
- Decision: A

### F-340. The notation's radios and the Mode control

`devdocs/settings.md#The controls` puts the notation under the Mode control, "which shows
what each belongs to". The panel renders it in the first group, with the display digits; only
the working digits sit under the mode. D4's docs draft follows the page, D9's the panel.

- A. The pages describe the panel as it is (V5, D9).
- B. The panel moves the notation under the mode, as the page intends: a UI change.
- Recommended: A, unless you want the UI change. The page's stated reason is the only evidence for B.
- Blocks: the description of the controls in `docs/settings.md` and `devdocs/settings.md`.
- Decision: A

### F-078. A unit `a` for the are

`docs/definitions.md#Names` says `ha` is the hectare "even though `h` + `a` would give the
same", but the file defines the are only as `are`, so there is no `a` to combine.

- A. There is no unit `a`: the example goes, and `units.md` says so (D1).
- B. The file gains `a`, the SI symbol for the are: a code change.
- Recommended: A.
- Decision: other: A, but drop the example and don't bother to mention the
  absence of `a` in the docs. (Why would we need to?)

### F-374. The reference digits in the tests

`devdocs/testing.md` says the reference values have at least fifty digits, so that an
algorithm wrong in its tail is caught. The tests have forty, with one argument per family
checked to a thousand digits, and take values from mpmath as well.

- A. The page states the tests as they are (V7).
- B. Fifty digits is a requirement, and the tables are extended.
- Recommended: A, unless fifty is a requirement.
- Decision: A. If we want to revisit precision, that is an explicit redesign.

### F-320. The rejections the definitions property test injects

`devdocs/functions.md` says the property test injects each rejected piece. D2 finds two
rejections it does not draw, `annotationNotUnits` and `parameterNamesUnit`, which
hand-written tests cover; V4 confirmed the sentence. The page's session first checks which
unit is right.

- A. If D2 is right, the page names the rejections the test injects.
- B. If D2 is right, the test also draws the two missing ones, and the page stands.
- Recommended: A now, with B as a test improvement if you want it.
- Decision: ok

### F-037. Where the list of decimal mode's steps lives

The Mode entry of `docs/settings.md` lists what counts as a step in decimal mode, and misses
operators: a leading `-`, binary `-`, two factors side by side.

- A. The list moves to `numbers.md#The two modes`, and the entry links to it (D4, by §12 question 5).
- B. The entry keeps the list, corrected in place (A4).
- Recommended: A. Wherever it lands, it carries A4's corrected list.
- Decision: A

### F-113. Naming the inexact units in `numbers.md`

The units defined through `pi()` (the angle units, `parsec`, `oersted`, their other names,
and the list `dms`) are inexact, and no page names them. `units.md` will list them and
`quantities.md` will state the rule (§7).

- A. `numbers.md#Exact and approximate values` adds one clause, linking `units.md`'s list (D8).
- B. `units.md` and `quantities.md` only.
- Recommended: A. That page explains `≈`, and `1 turn` in `deg` showing `≈ 360` surprises otherwise.
- Decision: A. Note that we do not currently have a mechnism to _mark_ a unit
  definition as inexact. That is an interesting follow-up which I've been
  considering, but which is its own large design consideration. `pi()` is the
  only applicable example above with respect to the "inexact" terminology.
  (Recall we have moved away from "approximate" based on terminology decisions
  above.)

## 4. Where each issue is linked

§12 question 26 links an open issue from one place: the passage that owns its concept. These
four have competing owners. #88, #92 and #100 are settled (Q-102 to Q-104, section 8).

- Section done: yes

### Q-011. Issues #130 to #134, the definition language's open work

- A. Each issue at the passage that states its concept (D2): #130 at `devdocs/functions.md#Annotations`, #131 at `#Names and shadowing`, #133 at `#Deferred`, and #132 at `docs/definitions.md#The format`, the user statement, where §7 and §12 question 12 put it; #134 at `#An undecided condition` (V4).
- B. Together (V4): #130 to #133 at `devdocs/functions.md#Deferred`, the page's list of what is open; #134 at `#An undecided condition`.
- Recommended: A. It agrees with §7 on #132. `future.md` and `cost.md` then mention these without links (V6).
- Blocks: the issue-link edits of `devdocs/functions.md` and `docs/definitions.md`.
- Evidence: F-421, F-321.
- Decision: other: Anything _not_ currently implemented should absolutely not be
  mentioned as a first-class concept in user docs. These should be collected
  into `future.md` and linked and described there only. The user docs do not
  refer here at all, and devdocs refer to future work accordingly.

### Q-012. The kernel-cost issues: `builtins.md` or `cost.md`

#103, #107, #125, #149, #150, #151 and #152 are linked from both `devdocs/builtins.md` and
`devdocs/cost.md`, and #103 also from `devdocs/numbers.md#Memoized constants`.

- A. One rule (V6): `cost.md` links every issue about what a computation costs or where it hangs: #107, #125, and #149 to #152. `builtins.md` links #103 (the Bernoulli memo) and #115, and points at `cost.md` for costs.
- B. With the algorithm (V3): `builtins.md`'s Gamma section links #103, #107, #125, #149 and #150, and `expFixed`'s bullet links #152; `cost.md` links #151 only.
- C. Split (D7): `builtins.md` links #107, #112 and #115; `cost.md` links #103, #125, and #149 to #152.
- Recommended: A. A reader can predict it, and it matches C33, which makes `cost.md` the owner of cost. #103 stays with its algorithm, where V1, V3 and A3 also put it. Name as exceptions any issue that asks for a new algorithm rather than recording a cost.
- Blocks: the issue-link edits of `devdocs/builtins.md` and `devdocs/cost.md`.
- Evidence: F-416, F-420, F-422, F-423, F-425, F-193.
- Decision: A. I would lean toward my ruling above about all
  not-currently-implemented work being listed under `future.md`, but I consider
  these issues to be user-relevant in understanding current performance.
  Moreover, this is not "future" or "aspirational" work, but a performance bug
  (where there is an associated issue).

### Q-013. Issue #118, the scheduler

`devdocs/settings.md` links it three times, and `cost.md` and `future.md` name it.

- A. `devdocs/cost.md`, C33's owner page, beside #119 to #121, which are #118's parts (V6, and V5's first choice).
- B. `devdocs/future.md#Extensions that fit`, where C33 lists the link today (D4, and V5's alternative).
- Recommended: A, which goes with A in Q-012. Either way `settings.md` names the concern in words.
- Blocks: the issue-link edits of `devdocs/settings.md`, `cost.md` and `future.md`.
- Evidence: F-418, F-419, F-343.
- Decision: other: I'm not sure what you mean by option B above, but my ruling
  is to put this into the future-work document and leave it at that. This is
  emphatically _not_ a settings concern and arguably does not live under "cost"
  because it's a planned improvement to be implemented in the future (and as
  such should _not_ be captured in the living as-it-is documents).

### Q-014. Issue #98, significant figures

It is linked from `devdocs/numbers.md#approx` and `devdocs/builtins.md#The exact functions`,
and named in `builtins.md#Not in this design`.

- A. `devdocs/builtins.md#The exact functions`, at `round` (D6, V3).
- B. `devdocs/numbers.md#approx` (V1, A5).
- Recommended: whichever matches what #98 asks, which you know better than the reports: A if it asks for rounding to significant digits, B if it asks for carrying them through `approx(x, u)`. The other passages name the concept and link the chosen section.
- Blocks: the issue-link edits of `devdocs/numbers.md#approx` and `devdocs/builtins.md`.
- Evidence: F-413, F-221.
- Decision: Don't mention this in the sections above. This is a _future work_
  item, and lives under `future.md`.

## 5. Other decisions that block a page

One proposal each, or a clear lean; `ok` takes it.

- Section done: yes

### Q-006. The "certified" code change: what rides with it, and when

- Proposed: the change of the notes from "certain" to "certified" (`src/outcome.ts`) also rewords two of the sheet's lines (D4): `MODE_LINES.exact` becomes "Every digit shown is certified, found at rising precision; …", and `PROBE_LINE` is worded as F-491 decides (section 2). It lands before `docs/numbers.md` is written (D8), and the devdocs quotes follow it (A2).
- Blocks: `docs/numbers.md#Digits you can trust`; the devdocs passages that quote the notes.
- Evidence: F-427, F-021, B-068, B-017.
- Decision: ok

### Q-007. Quoting the app's messages and words in hand-written pages

- Proposed: examples, never a catalogue (D8, D9, D4). `numbers.md` quotes the two size refusals; getting started quotes two or three messages as examples of their shapes; `app.md` quotes every footer word verbatim, so that a user can search for the one they see; devdocs name the function and paraphrase, quoting only where the exact text is the point. The generated catalogue (§12 question 6) is the complete list.
- Blocks: `docs/getting-started.md#When something is refused`; `docs/numbers.md#Values too big to hold`; `docs/app.md`; `devdocs/settings.md#The probe`.
- Evidence: F-008.
- Decision: ok

### Q-017. The scratch build's figures in `#Why the exponent bound stays at 10^18`

- Proposed: keep the six-pass table, which is digits, and the qualitative finding: the cost grows at least as the square of the argument's length, past the probe's budget before `exp(1e500)`. Drop the per-size milliseconds (A5 and V1 agree).
- Blocks: V1's rewrite of that section of `devdocs/numbers.md`.
- Evidence: F-202.
- Decision: ok

### Q-020. The title of `devdocs/functions.md`

- Proposed: "Defined functions", keeping the file name; the index lines of `devdocs/README.md` and `devdocs/architecture.md` are reworded to match (V4).
- Blocks: `devdocs/functions.md#(top)`.
- Decision: I would prefer to rename this to `builtins.md`, in both the user
  docs and devdocs. The title should be something like "Built-in functions".

### Q-021. The heading "A function as the want"

- Proposed: keep the heading, which a code comment cites, and use §8's "conversion into a function" in the prose (V4).
- Blocks: the heading of `devdocs/functions.md#A function as the want`.
- Decision: ok

### Q-023. Decimal mode's effect on units and edges, in `numbers.md`

- Proposed: one sentence each in the decimal-mode section, as today's behaviour (A4): `turn` in `deg` is `= 359.99999 deg` at eight digits, each unit being rounded first; `tan(90 deg)` is `= -13660250`, where exact mode refuses at the pole.
- Blocks: `docs/numbers.md#The two modes`.
- Decision: ok, but don't record that specific number in decimal, since it
  changes with the parameterization and does not match the behavior I see in the
  real app with my current settings. Keep the discussion to the fact that this
  does (or even "may") produce an exact value in decimal mode while failing to
  resolve in exact mode due to the pole.

### Q-024. The touch rule in `numbers.md`

- Proposed: one sentence: a bound exactly met decides a non-strict comparison (`>=`) and leaves a strict one undecided (A6). The verdict table stays in devdocs.
- Blocks: `docs/numbers.md#Comparison and equality`.
- Evidence: F-029.
- Decision: ok

### Q-025. Rounding a value that cannot be told from zero

- Proposed: one sentence in "Values at an edge": `trunc`, and `round` in a mode to nearest, decide such a value as `0`, while `floor`, `ceil` and `sign` do not (D6).
- Blocks: `docs/numbers.md#Values at an edge`.
- Evidence: F-031.
- Decision: ok, just make sure the discussion is complete. I think you've
  captured all of the functions here.

### Q-026. The one log-space example

- Proposed: the quotient of exponentials is the worked example, and the decimal exponent (`1e999 / ln(10)`) a closing clause (D8), since §12 question 10 gives one example; V1's two examples yield.
- Blocks: `docs/numbers.md#Values too big to hold`.
- Evidence: F-445.
- Decision: ok

### Q-027. "derived and shown": the ceiling on the panel

- Proposed: the pages stop saying the panel shows the ceiling: "derived, and written as a number only in the probe's proposal" (A3, D4). Whether the panel should show it is a UI question outside the revamp. V5's draft of `devdocs/settings.md#The model` takes the change.
- Blocks: V5's replacement of `devdocs/settings.md#The model`.
- Evidence: F-126.
- Decision: ok

### Q-028. A privacy sentence in `docs/app.md`

- Proposed: one sentence in the offline section: the app calls no service and sends nothing, with a link to `devdocs/security.md#The page` (V8). D9's draft of the page has no such sentence; the two drafts of `app.md` overlap (F-180).
- Blocks: `docs/app.md#Offline use`.
- Evidence: F-171, F-180.
- Decision: ok

### Q-029. A home for the linking and Markdown principles

- Proposed: `devdocs/development.md#Style guide`, beside the documentation principle (§12 question 29), since all three bind every contributor (V8).
- Blocks: `devdocs/development.md#Style guide`.
- Decision: ok

### Q-030. Who deploys

- Proposed: Cloudflare Workers Builds runs the build and the deploy, and `devdocs/security.md`'s sentence about a developer's machine is rewritten (V8). If a developer's own `pnpm exec wrangler deploy` is also supported, `deployment.md` says so in one sentence and `security.md` says the credential is theirs. You know which holds.
- Blocks: `devdocs/security.md#Toolchain and secrets`; `devdocs/deployment.md#(top)`.
- Evidence: F-408.
- Decision: ok. I only use Cloudflare Workers Builds at the moment.

### Q-031. The build-error catalogue in `devdocs/architecture.md#Definitions`

- A. Keep it in prose, completed with the four kinds it omits (V2): the one prose account of what the build checks.
- B. Devdocs keep how the checks run, and point at the build-time checks table that §7 gives `docs/definitions.md` (error, cause, fix), so that the list is kept in one place.
- Recommended: B. The ownership rule (§12 question 24) gives the list to the docs page, and A's list would duplicate that table.
- Blocks: V2's replacement of `devdocs/architecture.md#Definitions`.
- Evidence: F-232, F-233, F-105.
- Decision: ok

### Q-032. Why information (`bit`) is a dimension

- Proposed: say why, in `src/units.txt`'s comment and in `units.md`'s primitives: a count of bits must not collapse into a plain number, so that `bit/s` stays apart from `Hz`, as `rad/s` does (D3). If your reason is another, give it.
- Blocks: `docs/units.md` (the primitives).
- Evidence: B-064.
- Decision: ok

### Q-033. The sources `units.md` names

- Proposed: `units.md` cites what `src/units.txt` cites (D3's skeleton). The file's header gains the three documents the page names today, if you confirm them: the SI brochure (9th edition), NIST Handbook 44, and the Weights and Measures Act 1985. The two years get a source and an epoch in their comments, and `units.md` calls them measured values written exactly. `gravity` is marked "(exact by convention)" (A9, D3). The comments are code changes (B-062, B-063, B-065).
- Blocks: `docs/units.md#Which factors are exact`.
- Evidence: F-116, F-069.
- Decision: ok

### Q-034. "`W` is the watt": the Lambert W connection

- Proposed: yes, the sentence means Lambert's W function, and D5's edit says so: "Lambert's function, when it comes, is `lambertw`: `e` is the elementary charge in `units.txt` and `W` is the watt, so neither name is free for a function or a constant".
- Blocks: `devdocs/builtins.md#Names` (D5's edit 7).
- Evidence: F-259.
- Decision: ok

### Q-035. Where the binary `approx(x, u)`'s tentative design lives

- Proposed: it stays in `devdocs/numbers.md#approx`, beside the concept (C26), and `future.md`'s entry for #100 links to it in one line (V1).
- Blocks: `devdocs/numbers.md#approx`; `devdocs/future.md#Extensions that fit`.
- Decision: this is future work and should not get in the way of the numbers
  description yet.

### Q-036. The rounding functions' open cell

- Proposed: record it as intent in `devdocs/builtins.md#The exact functions`: a touch counts as a straddle at every edge, so that no edge check has to know which end of a cell is closed. No code change (A6).
- Blocks: one sentence of `devdocs/builtins.md#The exact functions`.
- Evidence: F-279.
- Decision: ok

### Q-037. Typographic characters in the fields

- Proposed: one intent in `devdocs/future.md`: accept the characters the screen or pasted text produces where each has one meaning (`×`, `·`, `−`, non-breaking and thin spaces), and keep `÷` and superscripts out unless someone asks for them (D1). Meanwhile `docs/expressions.md` lists them among the errors.
- Blocks: `devdocs/future.md#Extensions that fit`; `docs/expressions.md#What is not accepted`.
- Decision: ok

### Q-038. Pointing at the grammars in the parsers' headers

- Proposed: `docs/` keeps prose and the precedence table (§2.1.3). `devdocs/architecture.md#Expressions` names the grammar in `src/core/expr.ts`'s header as the hand-maintained form, quoting none of it, and `devdocs/functions.md#Definitions` does the same for `src/core/definitions.ts` (D1, V4). §2.1.3's "no EBNF exists" is corrected (F-500).
- Blocks: one sentence of `devdocs/architecture.md#Expressions`.
- Evidence: F-305, F-500.
- Decision: ok

### Q-049. A stored ratio width out of range resets the whole mode

A stored ratio width outside 1 to 1,000 sends the whole mode back to exact mode with digits;
an extended count out of range is clamped instead.

- A. Keep the asymmetry, and state it in `devdocs/settings.md#Storage`.
- B. Clamp the width like the count: a code change (B-012), after which the page states one rule.
- Recommended: B, unless the reset is deliberate. One rule for every stored value is easier to state and to trust.
- Blocks: one sentence of `devdocs/settings.md#Storage`.
- Evidence: F-333.
- Decision: other: We already have clamping behavior, and it flows from "most
  constraining" to "least constraining", starting at the singificand precision
  limit. I don't understand what aspect you're calling out here, but if there's
  a bug here, then please spell it out. As I currently understand it, no
  behavior requires changing and it should just be documented as it currently
  behaves.

### Q-057. The internal kind name in the load-failure message

- A. The app keeps "(fetchFailed)", which a bug report needs, and `app.md` describes the message without quoting the parenthesis (D9).
- B. The kind goes to the console only: a code change (B-023).
- Recommended: A.
- Blocks: how `docs/app.md` describes the failure.
- Decision: ok

### Q-064. "certifies" in the index's opening sentences

- A. Keep "certifies every digit it shows otherwise", which getting started defines (D9).
- B. "and says how many digits it is sure of".
- Recommended: A: the index uses the word every page uses (§12 question 8).
- Blocks: `docs/README.md#(top)`.
- Evidence: F-428.
- Decision: A

## 6. Decisions that block nothing

Each changes a sentence, a message or a later commit; none holds up a page. `ok` takes the
proposal, and `defer` leaves the item for when its page or its code comes up.

- Section done:

### Q-039. GNU units in devdocs

- Proposed: devdocs drop GNU units from the numeric semantics, keeping the `pi()` rationale without the name (A1, V1), and keep at most one clause naming GNU units as the familiar convention behind the precedence (D1).
- Evidence: F-183, F-240.
- Decision:

### Q-040. A literal past the significand limit in decimal mode

- Proposed: intended, as the code's comment says: one clause that the limit refuses such a literal in either mode, before anything is rounded (A4, D1, V1).
- Decision:

### Q-041. The dalton's CODATA edition

- Proposed: `units.md` says what the file says, "CODATA 2018". Whether and when the file moves to the 2022 adjustment is yours, recorded in its comment (D3): name the edition to follow, or `ok` to stay.
- Decision:

### Q-042. Close issue #89

- Proposed: yes, once the tests the issue asks for are confirmed in `src/core/rational.test.ts`; the page's clause goes either way (V1, B-033).
- Decision:

### Q-043. The ratio notation's screen

- Proposed: a code fix (B-004): screen the exponent at `4W` and the numerator's digits at `3W`, which admits every dyadic value that fits. Until it lands, one sentence in `devdocs/notation.md#The rule` names the exception (V5).
- Decision:

### Q-044. `mod`'s alignment refusal

- Proposed: a code change (B-005): the two refusals become `fits`, carrying the need the subtraction or the product reports, so that the message offers `approx` as a sum's does. D6's edit then takes its first form.
- Decision:

### Q-045. A typed list's unit that may be zero

- Proposed: the pages state the gap now; retrying such a unit is a small change that can ride the work on #92 (A8).
- Decision:

### Q-046. The reciprocal line in decimal mode

- Proposed: keep the behaviour and document it, and record the alternative, `want / have` from the working-digit operands, on #92 (A4, V1).
- Decision:

### Q-047. The schedule's cost bound

- Proposed: reword "at most about twice the pass that succeeds" now (V1's edit); a change to `workingContexts`, if wanted, after the revamp (A3).
- Decision:

### Q-048. `log`'s exact cases for a rational exponent

- Proposed: document the uncertified fallback as reachable now (V1). Looking for `x^q = b^p` waits for a review of the logarithm family, and the decision on #173 would make these lines `=` anyway (A4).
- Decision:

### Q-050. Fix `gcd(a, 0)`

- Proposed: a code fix (B-001), with tests for `gcd(5, 0)`, `gcd(0, 5)`, `gcd(0, 0)`, `gcd(-10, 0)` and `lcm(5, 0)`. The page's statement, the magnitude of `a`, stands as the specification (D6, V3).
- Decision:

### Q-051. The size refusal with no count

Both units drop the stray comma in "would need a significand, past the significand limit".

- A. Keep ", however it is computed" after it (D7).
- B. Drop it too: "would need a significand past the significand limit" (A5).
- Recommended: A: the clause tells the user that no remedy exists.
- Decision:

### Q-052. Bit counts past a double's integers

- Proposed: round such a count to two significant digits above `2^53`, in the code phase (A5, B-018).
- Decision:

### Q-053. "which side of it it lies"

- Proposed: name the edge once more, in short: "which side of the pole", "which side of the bound" (A6, B-021).
- Decision:

### Q-054. The errors for `round`'s second argument

- Proposed: word the errors by the argument's place where the first argument need not be an integer, for example "the number of places of `round` must be a whole number" (D6, B-016).
- Decision:

### Q-055. The parse label "a unit name"

- Proposed: "a name", in a code change of its own (D1, B-019).
- Decision:

### Q-056. The empty output area's hint

- Proposed: "Type an expression, such as `sqrt(2)` or `3 ft`, and, to convert it, the unit you want, such as `in` or `ft;in`." (D9, B-022), so that the calculator leads (§12 question 2).
- Decision:

### Q-058. `exceeds` for the hull of a wide argument

- Proposed: leave the code; `devdocs/builtins.md` says that a wide argument is refused as the step's reach (A5).
- Decision:

### Q-059. The code comments: one pass, and when

- Proposed: one commit for all the comments bugs.md lists (B-034 to B-067), made after the pages land, so that a comment citing a page cites its final headings; the history comments go in the same commit, under the style guide's new rule. The units differ only on timing.
- Decision:

### Q-060. The units test's wording and its failure message

- Proposed: "temperature difference" in the test's names and comments, `bit` among the primitives in its header, and a failure that names the line (D2, D3; B-032, B-059, B-060), in the code track. `devdocs/development.md#Adding a unit` describes the test as it behaves when the page is written (F-398).
- Decision:

### Q-061. Counts in `cost.md`'s prose

- Proposed: dropped now; a summary line generated by the stress tool later, if wanted (V6).
- Decision:

### Q-062. The hangs table's Issue column

- Proposed: emit links, a one-line change to `hangsTable` (B-070), once Q-012 has placed the issues (V6).
- Decision:

### Q-063. The note "0 of 1 digits are certified"

- Proposed: leave its wording (A2).
- Decision:

### Q-065. "the conformance tests" in `development.md`

- Proposed: "the edge sweeps", keeping "conformance" for quantities (V8).
- Decision:

### Q-066. `log10(1e999999999)`: the value or the line

- Proposed: keep "exactly `999999999`": the section is about the value, and N10 owns the display (D5).
- Decision:

### Q-067. The incomplete functions' refusals and the precision

- Proposed: say that they move with it, by the words "at a high precision" (D7), within Q-009's interim edits.
- Decision:

### Q-068. `architecture.md`'s list of sister pages

- Proposed: replace it with a pointer at `devdocs/README.md`'s map (V2; §12 question 18).
- Decision:

### Q-069. The console warning for a stored version above the build's

- Proposed: the page stays as it is (V5).
- Decision:

### Q-070. Why the project keeps `experimentalDecorators`

- Proposed: verify against the pinned Vite before the page is next edited. If the reason still holds, drop "yet"; if not, state the real reason, or remove the sentence with the flag (V7).
- Decision:

### Q-071. `audit/` and `.claude/skills/` in `layout.md`

- Proposed: not listed while the revamp runs, since `audit/` leaves when it lands (§12 question 29) (V7).
- Decision:

### Q-072. `exact.test.ts` in the module table

- Proposed: keep it in the table, and name it in the `src/core/` bullet (V7).
- Decision:

## 7. Plan corrections

The plan says something the units found wrong; `ok` lets the apply step amend it as
proposed.

- Section done: yes

### Q-073. Claim N8's formula wording

- Proposed: N8 reads `4 × (L + 10)`, "four times the sum of the precision limit and ten" (A3).
- Evidence: F-508, F-022.
- Decision: ok

### Q-074. The notes' module, and the want parsed again

- Proposed: correct the plan: the notes are worded in `src/outcome.ts`, not `src/messages.ts` (§1.1.6 item 1), and the outcome receives the parsed want rather than parsing it again (§1.2.4, §5 C1 and C4) (A2). V2 would leave the plan and let the pages state the mechanism.
- Evidence: F-506, F-505.
- Decision: ok

### Q-075. Names absent, or meaning something else

- Proposed: §7's `units.md` bullet becomes "names that are absent or mean something else (`u`, `at`, `dB`, `e`, `rad`)" (D3), and claim Q9 adds that `at` reads as `a` + `t`, an attotonne (D1).
- Blocks: `docs/units.md#Names deliberately absent` (its title and its list).
- Evidence: F-502, F-112.
- Decision: ok

### Q-076. The module of `MIN_SIGNIFICAND_LIMIT_BITS`

- Proposed: §11's row names `src/core/context.ts` (V7).
- Evidence: F-503.
- Decision: ok

### Q-077. `layout.md#The files` in §9.2

- Proposed: strike it from §9.2's row of devdocs passages that re-explain user semantics (V7).
- Evidence: F-366.
- Decision: ok

## 8. Settled and coordination items

Another unit's evidence answers each of these, or the consolidation settled it by the page
that owns the finding; nothing needs deciding. `ok` confirms them all. To differ on one,
write `ok except` and that item's answer, for example `ok except Q-105: other: …`.

| Item | What | Settled by, or owner page |
| --- | --- | --- |
| Q-078 | N10's partial kind is reachable today | F-023 |
| Q-079 | "a fourth source of inexactness" becomes a third | F-010 |
| Q-080 | `widened` behaves as plan §1.1.6 item 8 says | A1's and A5's confirmed statements |
| Q-081 | "as GNU units shows" goes | §12 question 2; F-118 |
| Q-082 | `docs/settings.md`'s backticked devdocs names | F-134, F-026 |
| Q-083 | an exact operand rounded into an inexact result | F-019 |
| Q-084 | a rounding adds half a grid cell to the radius | F-017; A3's confirmed statement |
| Q-085 | naming the measured factors | F-069; `docs/units.md` |
| Q-086 | "no built-in is a prefix of another's name" | F-258 |
| Q-087 | name characters: any script's letters, ASCII digits | F-077, F-079 |
| Q-088 | timings replaced by their reasons | F-209, F-384, F-382, F-354, F-154 |
| Q-089 | conversion into a unit list, verified | F-072, F-073 |
| Q-090 | a condition term failing behind an undecided comparison | A6's confirmed statement |
| Q-091 | `2^-30000`: 69,659 bits against 69,658 | F-051, F-012 |
| Q-092 | `pow`'s base `-1` | F-272 |
| Q-093 | the gamma bullet and "kernel" | F-153, F-448 |
| Q-094 | "kinds included" in the `div` and `mod` rows | F-268 |
| Q-095 | "every built-in takes plain numbers" | F-138 |
| Q-096 | `factorial(20000)` and `gamma` | F-151, F-282, F-292 |
| Q-097 | "a dimensionless marker" | F-093, F-459 |
| Q-098 | the root README's tooling sentence | F-004; §12 question 18 |
| Q-099 | `approx` does not relax an exponent literal | F-051, F-046 |
| Q-100 | a third way an alternative fails | F-241 |
| Q-101 | issue #40 is closed | F-054 |
| Q-102 | issue #88 | `devdocs/numbers.md#Roots and powers` |
| Q-103 | issue #92 | `devdocs/architecture.md#The converter and its lines` |
| Q-104 | issue #100 | `devdocs/numbers.md#approx` |
| Q-105 | where adding to the definitions file is documented | `devdocs/development.md#Adding a unit`; F-108 |
| Q-106 | the call rule stated twice | `docs/expressions.md#Calls and arity`; F-095 |
| Q-107 | the call-cost paragraph stated three times | F-033 |
| Q-108 | the Significand limit entry and `numbers.md` | `docs/numbers.md` (§12 question 5); F-018, F-014 |
| Q-109 | the dissolved section's diagrams | F-057, F-050 |
| Q-110 | the probe and the memos | `devdocs/settings.md#The probe`; unverified |
| Q-111 | the favicon and `offline.md#Icons` | F-362 |
| Q-112 | `future.md`'s entry for equality operators | F-345, F-030 |
| Q-113 | defined functions before built-ins | F-308 |
| Q-114 | `builtins.md`'s per-function tables | stay until the generated reference |
| Q-115 | the settings sheet's absolute link | F-177; §12 question 31 |

Four leave work for a page's session rather than a decision. Q-108 blocks the assembly of
`docs/numbers.md` and `docs/settings.md`, whose sessions reconcile D4's and D8's drafts by §12
question 5. Q-110 stays unverified until the `devdocs/settings.md` session checks it. Q-111 is
settled by reading `public/favicon.svg` against `public/icons/`. Q-114's tables stay in
`devdocs/builtins.md` until the generated reference replaces them.

- Section done:
- Decision:

## 9. Code changes: when each lands

The open items above decide what changes; this decides when. The proposal:

1. Before `docs/numbers.md`: the "certified" change and the sheet lines that go with it (B-068, B-017, B-025, B-026, worded by Q-006, F-491, F-435 and Q-004), and the fix for the crash at the exponent bound (B-002, as Q-002 decides).
2. Before the page that would otherwise carry a caveat: `gcd(a, 0)` (B-001), the ratio screen (B-004), `mod`'s refusal (B-005), and the stored width if Q-049 is B (B-012). Each is small, and fixing it first saves writing a caveat now and removing it later.
3. After the pages, each in its own commit: the message wording (B-015 to B-029) with the generated catalogue (§12 question 6), the test gaps (B-030 to B-033), the comments (B-034 to B-067, Q-059), and B-069 and B-070 with the work they belong to. Meanwhile the pages describe today's behaviour and quote no message that is about to change.
4. Not scheduled: the behaviour the open items keep and document (B-007, B-008, B-010, B-011), what an open issue tracks (B-003 with #79, B-006 with #88, B-009 with #92), B-013, which is by design (Q-091), and B-014 (Q-041).

- Section done: yes
- Decision: ok

## 10. Everything else in findings.md

Every proposed call in [findings.md](findings.md) stands, except in these cases:

- The call depends on an answer above: it follows that answer (its Related line names the item).
- The call leaves a choice between drafts or wordings ("pick one text", or OVERLAP in a page's table of proposed text): the session that writes the page picks, and its pull request says which.
- The call is undetermined on a fact, or the finding is flagged low confidence: the page's session reads the cited code and follows it, and anything still open comes back to you as a new question.
- A row in the table below overrides the call.

To override a call, add a row. "Your call" is `doc wrong`, `code wrong`, `design changed`, a
stale tag (`update`, `keep as intent`, `drop`), or your own words. The "Needs spot-check"
index at the end of findings.md lists every conflict and every low-confidence finding, if you
want to look through them.

| Finding | Your call | Note |
| --- | --- | --- |
| | | |

- Section done: yes
- Decision: ok

Here `ok` accepts the rule; anything else amends it.

## What happens next

When the sections you want applied are marked done, push the file. One session then applies
it, in this order:

1. It records each answer in [plan/12-open-questions.md](plan/12-open-questions.md), keyed by its id, and fills the Decision fields of open-items.md and findings.md from it.
2. It amends the plan wherever an answer or an accepted finding corrects it: the §1 claims, the §7 outline, the §8 table (every answer in section 2 becomes a row), and the rows of §10 and §11.
3. It answers each `ask:` under its item and stops there for you. It leaves `defer` items open, and the pages they block wait.
4. It writes one work order per page: the findings it applies, the decisions it follows, the proposed text to start from, the conflicts left to settle, and the code changes it waits on.
5. It changes no page and no code.

Then come the pages. The user pages take one session each, in this order: numbers,
quantities, expressions, definitions, units, settings, functions, app, the index, and getting
started last. The developer pages follow once the user pages they link exist (Q-008), and the
code changes run beside them (section 9).

A prompt for the apply session:

```
Apply audit/decisions.md. Read audit/README.md, audit/principles.md and
the "How to answer" section of audit/decisions.md first, and follow its
rules exactly: apply only the sections marked done, where a blank
Decision means ok. Record every answer in audit/plan/12-open-questions.md
keyed by its id; fill the Decision fields of audit/open-items.md and
audit/findings.md; amend audit/plan/ where an answer or an accepted
finding corrects it (§1, §7, §8, §10, §11); and write one work order per
page under audit/work-orders/. Answer each "ask:" under its item and stop
there for me. Change no page under docs/ or devdocs/ and no code. Commit
and push.
```
