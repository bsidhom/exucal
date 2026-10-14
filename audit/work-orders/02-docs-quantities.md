# Work order 02: `docs/quantities.md` (Quantities)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`A8 (L113-123)` is `audit/reports/A8/fable.md`, lines 113 to 123. `§7`
is `audit/plan/07-docs-outline.md`, `§1` is
`audit/plan/01-core-abstractions.md` (its quantity claims Q1 to Q19,
amended on 2026-10-12, are this page's material), `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/quantities.md`, titled "Quantities": the foundation
  page on units, dimensions, kinds and what a conversion is (§7).
- **Order.** Second, after `numbers.md` (work order 01), which it links
  for exactness, digits, the written form of a ratio and decimal mode.
  Every later page links it, so its headings are the anchors §7 fixes
  (section 4). It links `units.md`, `expressions.md`, `definitions.md`
  and `builtins.md` before they exist, at §7's anchors in lower-case,
  hyphenated form (the rule of `audit/principles.md`, "Topological
  order"; section 8).
- **Status.** Ready; nothing blocks it. No report drafted the page, so
  it is written from §1's quantity claims as amended, A7's and A8's
  verified facts, and A8's replacement of `docs/definitions.md#Unit
  lists` (A8 L113-123), which this page's "Unit lists" absorbs.
- **Output.** The page, and in the pull request the choices made where
  the record leaves one and any question for the owner.
- **Not in scope.** No other page changes: work order 04 rewrites
  `docs/definitions.md`'s section on lists (the defining of a list
  stays there; what a list answers is this page's) and deletes its
  section on the file's contents. No code changes.

## 2. The reader, and what earlier pages taught

The reader has read `numbers.md`: they know what an exact and an
inexact value are, what `=` and `≈` mean, that digits are certified,
that a value can be refused for size or fail at an edge, how a number
and a ratio are written, and what decimal mode does. This page does not
restate any of that; it links the section of `numbers.md` that owns it
(`numbers.md#exact-and-inexact-values`, `#how-numbers-are-written`,
`#the-two-modes`, `#values-too-big-to-hold`, `#comparison-and-equality`).
The reader has not read the expression reference, the definition
language or the units catalogue: a name's reading is `expressions.md`'s,
a definition's form is `definitions.md`'s, and which units exist is
`units.md`'s; this page states the semantics and links each.

## 3. Rules that bind the page, applied

- **Inexact, not approximate (F-451).** The angle units and the others
  defined through `pi()` are "inexact units"; "approximate" only for
  the act.
- **Refusal only for a size refusal (F-442).** A mismatch, a `want` of
  zero, a `want` that cannot be told from zero, a list whose units do
  not decrease, a condition that fails: "an error". The ratio refused
  at the significand limit or past the exponent bound: "refused".
- **Future work is `devdocs/future.md`'s alone (Q-011).** No issue is
  named (not #92 on the reciprocal line, not #130 on the annotated
  unit, none). What is ruled out by intent is a plain fact: a
  temperature reading is a function, not a unit with an offset, and
  the reason is one sentence here, the fuller reason the devdocs'
  (F-110); kind-lenient conversion and complex magnitudes are not
  mentioned, and offsets only in that plain fact.
- **Numbers (Q-016).** None: no timing, no count.
- **The words (§8).** "Have" and "want" for the two fields, used from
  this page's first conversion on (F-471); the output modes named by
  their want, "one unit", "a unit list", "a function", "a blank want",
  never "the third output mode" (F-468); "conform", glossed once, and
  "dimension mismatch" and "kind mismatch" for the two failures
  (F-462); "dimensionless" and "plain number" as synonyms, "kind"
  wherever semantics attach (Q-019); a kind primitive is "a marker of a
  kind, with no dimension of its own", or a "kind marker", never
  "dimensionless marker" (F-459); "the definitions file" (F-475);
  "temperature difference", never "interval" (F-483); "defined" and
  "measured" factors (F-486); "display digits" (F-458); "pastes back"
  (F-457); "an angle", "the radian kind" for the one kind; "base unit"
  as §8 has it (F-465). GNU units is named only where a similarity in
  conversion semantics helps a user onboard (§5 C60).
- **The third goal (plan §12.3, 2026-10-14).** The page's opening
  states the goal it serves, in the page's own prose for its reader,
  with the substance principles.md fixes, copying neither its list nor
  the review's shorthand: calculation and conversion aware of
  units and kinds, a quantity carrying its dimension and its kind
  through every operation and conversion, so that a result has the
  unit it should and a mismatch is an error and never a number; the
  third of Exucal's three, whose order the index states, `numbers.md`
  naming only the first two; stated as Exucal's, never as unique to
  it.

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link: "A
quantity", "Primitives, dimensions and kinds", "Conformance", "No unit
of its own", "Units, prefixes and exactness of factors", "How a
conversion is answered", "Unit lists", "Conversion into a function",
"Temperature and logarithmic levels as functions", "How dimensions are
written in messages".

### A quantity

- Facts: §1 Q1. A value paired with a dimension, an exponent vector
  over the primitives with rational exponents, by design, so that
  dimensions stay exact (`m^(1/2)` is a dimension; `(m^2)^(1/2)` is
  `m`); that is why `^` takes only a literal rational exponent (the
  syntax is `expressions.md#operators`'s); the exponents stay exact in
  both modes. Q6: what the operators do to dimensions; only the
  magnitude can fail (`numbers.md`).

### Primitives, dimensions and kinds

- Facts: §1 Q2, Q4, Q8 as amended. The primitives come from the
  definitions file (`units.md#the-primitives` lists them); kind
  primitives are markers of a kind with no dimension of their own
  (F-459), the radian the only kind today, named by its kind (§12
  question 20); no special case for zero (`1 m + 0` is a mismatch);
  angles as the kind users meet: `sin(1)` is a kind mismatch and says
  to write `sin(1 radian)`; `asin(0.5)` into `deg` is `≈ 30 deg` and
  into `turn` is `≈ 1/12 turn`, an angle still, while
  `asin(0.5) / radian` is the plain number (F-067; the `≈` because the
  angle units are inexact, F-144); `rad/s` does not convert to `Hz`
  while `rpm` converts to `rad/s`.

### Conformance

- Facts: §1 Q3 (F-068). The two-step check, dimension then kind, and
  the two mismatches; every place the check decides at a call: have
  and want, `+` and `-`, a call's argument against its annotation, a
  conversion into a function, a list's units; a condition's terms are
  checked when the file loads (`definitions.md#when-the-file-does-not-load`).

### No unit of its own

- Facts: §1 Q5. `100 lb` and `45.359237 kg` are one value; an
  annotation checks a dimension and changes no value; `floor`, `ceil`,
  `trunc`, `round` and the integer functions take plain numbers
  (`floor(3.7 ft)` is an error; write `floor(3.7 ft / ft) ft`); `abs`,
  `sign` and `approx` take any quantity, and `div`, `mod` and `atan2`
  two of one dimension (D5's six-function list, F-138, Q-095; the
  entries are `builtins.md`'s).

### Units, prefixes and exactness of factors

- Facts: §1 Q9, Q10 and Q11 as amended. How a name is read is
  `expressions.md#names`'s (one sentence and the link). The rule
  (F-069): every factor is read exactly as written, so a conversion is
  exact unless a unit calls `pi()`; most factors are the exact values
  their defining documents state, a few are measured values carried to
  the digits their source gives; the angle units and everything built on
  them, `parsec` and `oersted` are inexact;
  `units.md#which-factors-are-exact` names the measured values and
  `gravity`'s convention (Q-085; this page does not list them). The
  definitions table (the table built from the definitions file; "unit
  table" is devdocs-only, §8) is built once, in exact mode, at the
  ceiling; in decimal mode a unit is rounded once as it is looked up
  (one clause; the rule is `numbers.md#the-two-modes`'s).

### How a conversion is answered

- Facts: §1 Q13, Q14, Q17 and Q18 as amended. The ratio of the two
  magnitudes after conformance; a want with a magnitude (`1 mi` into
  `1000 ft` is `5.28 × 1000 ft`); the blank want answers in the
  primitives; the failures: a mismatch, a want of zero, a want that
  cannot be told from zero, a ratio that cannot be told from the point
  where it passes the exponent bound (errors: conflict 6; the docs'
  phrase, never "straddling", F-447), a ratio past the exponent bound,
  and a ratio whose exact significand would pass the significand limit,
  refused with `approx` named around the have (F-070); the reciprocal
  line, when there is one and when not (a unit list, a blank want, a
  function want, a zero or an unresolvable value), left out without a
  word when it is itself refused (B-009, stated as today's behaviour, no
  issue); in decimal mode it is the reciprocal of the ratio shown
  (Q-046; one clause, the rule being `numbers.md#the-two-modes`'s); how
  the want field is read is `expressions.md#the-want-field`'s, this page
  saying what each reading answers; every line pastes back as a have, a
  want with a magnitude joined with `×`, a want that is a sum,
  difference or negation parenthesized, both forms shown among the
  examples (F-071, F-457).

### Unit lists

- Start from A8's replacement of `docs/definitions.md#Unit lists` (A8
  L113-123), which names have and want and says "display digits"
  (F-073, F-458); the defining of a list and its name as a want belong
  to `definitions.md#unit-lists` and `expressions.md#the-want-field`,
  linked.
- Facts: §1 Q15 as amended (F-072): largest first, an integer count for
  every unit but the last, the last the remainder; a count whose ratio's
  bounds reach or meet an integer takes the integer nearest the ratio
  (the docs' phrase, F-447; "midpoint" is devdocs-only, F-438); the
  remainder rounded at the digits it certifies and a rounding that
  reaches a whole of an earlier unit carries, while under the ratio
  notation an exact remainder that fits its width is written entire and
  nothing carries; zero terms left out, as is a last term that cannot be
  told from zero; `=` only when every term is exact; the units must
  conform to the have, be positive (every value within the error radius;
  "ball" is devdocs-only, F-438) and decrease along the list; a typed
  list's unit that cannot be told from zero at a pass is an error, not
  retried (Q-045, B-010; today's behaviour, no issue); the example
  spacing is the app's, `8 min / mi + 34.285714 s / mi` (F-073). F-072
  is low confidence: the session reads `src/outcome.ts:548-560` before
  stating the remainder's digits.
  `units.md#unit-lists-defined-in-the-file` lists the defined lists;
  `dms` being the one inexact list is that page's (F-111).
- This section is the one user page that says what a comparison that
  cannot be decided does inside a list: the count takes the whole
  number the ratio cannot be told from, leaving a remainder around zero
  rather than a whole of the unit (`countOf` in `src/core/convert.ts`,
  read by the session of work order 01; the Facts above state it as the
  ratio's bounds reaching or meeting a whole number), and a unit that
  cannot be told from zero is an error, as above. It links
  `numbers.md#comparison-and-equality` and `numbers.md#values-at-an-edge`
  for the model, and `numbers.md` no longer mentions lists there (the
  owner, 2026-10-14, plan §12.3: unit lists are conversion and output,
  not the numeric model).

### Conversion into a function

- Facts: §1 Q16 as amended and Q12. The six steps as a user sees them
  (an inverse is needed; the have must conform to the result and meet
  the inverse's conditions; the recovered argument must meet the
  function's conditions; the function is reapplied and a value
  certainly other than the have refutes the inverse), the answer
  written as the call with the argument as a count of the parameter's
  annotation unit (`300 K = tempF(80.33)`; the running example of a
  defined function with an annotated parameter is `definitions.md`'s,
  renamed from `dozen`, Q-015), with no reciprocal line. Writing an
  inverse is `definitions.md#inverses`'s (F-102).

### Temperature and logarithmic levels as functions

- Facts: §1 Q12. `degC`, `degF`, `degR` are temperature differences
  (`1 degC` is `1 K`); a reading is a call of `tempC` or `tempF`, whose
  inverses let the function be the want; there are no units with an
  offset, as a plain fact with its one-sentence reason (a quantity
  carries no offset, so a reading cannot be a unit), the fuller reason
  being `devdocs/functions.md`'s (F-110, Q-011); logarithmic levels
  (`decibel`, `bel`, `neper`) are functions the same way; the entries
  are `units.md#temperature-differences-and-readings` and
  `units.md#logarithmic-levels`.

### How dimensions are written in messages

- Facts: §1 Q7 and Q19. Primitives in declaration order, positive
  exponents first, negative ones after `/`, `1` for an empty numerator,
  a non-integer exponent parenthesized (`m^2 kg / s^3 A`, `m^(1/2)`), so
  that an error's dimension pastes back (F-457); a plain number's
  dimension is written `1`, glossed once here where a message shows it
  (`1 m + 0`: "… but 0 has dimension 1"; F-463); an error points at the
  text at fault and a sum's mismatch is worded as the same mismatch
  between have and want.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-067 | Primitives, dimensions and kinds | `asin(0.5)` into `turn` is an angle still; "plain number" where the rule is quoted (Q-019) |
| F-068 | Conformance | Every place the check decides at a call named; a condition's terms left to the file's checks |
| F-069 | Units, prefixes and exactness | The rule here; the measured values and `gravity`'s convention in `units.md` (Q-033, Q-041, Q-085); "inexact"; "defined" and "measured" factors |
| F-070 | How a conversion is answered | The ratio refused at the significand limit too, by intent; `convert.ts`'s comment is the code track's (B-038) |
| F-071 | How a conversion is answered | Both written forms shown among the examples |
| F-072 | Unit lists | Q15's four refinements; read `src/outcome.ts:548-560` first |
| F-073 | Unit lists | A8's replacement, with have and want and "display digits"; the app's spacing |
| F-463 | How dimensions are written in messages | `1` for a plain number's dimension, glossed once |

Owned elsewhere and read here for what this page must provide: F-084
(the want field's grammar is `expressions.md`'s; this page says what a
list and a conversion into a function answer), F-104 (the shared set
of names is `definitions.md`'s), F-110, F-111 and F-113 (`units.md`
lists the inexact units and the defined lists; this page states the
rules and links), F-458 ("display digits").

## 6. Decisions followed, and still open

Followed: Q-011, Q-015 (the running example is `definitions.md`'s,
renamed there by work order 04, which is written after this page; this
page uses `tempF` for a conversion into a function and does not name
the running example), Q-016, Q-019,
Q-020 (`builtins.md`), Q-033, Q-041 and Q-085 (the measured values are
`units.md`'s), Q-045 (today's behaviour stated), Q-046 (the reciprocal
line as it is), Q-089 (the list rules verified); the rules F-442,
F-451, F-457, F-458, F-459, F-462, F-468, F-471, F-475, F-483, F-486.

Still open: nothing that blocks the page. Q-045 is settled (the owner's
list, item 14): no `future.md` entry; the retry is issue #198, which
`devdocs/architecture.md` links once and this page does not name.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| Unit lists | A8 L113-123 | the semantics (the first paragraphs); the defining of a list and its name as a want go to `definitions.md` and `expressions.md` | "typed back" (L117) reads "pastes back" (F-457); the `ms` remark (L121) is `definitions.md#names`'s |
| Every other section | §1 Q1 to Q19 as amended; A7 L74, L261-274 (angles); A8 L26-32 (Q13, Q14, Q18) | the facts | the rules of section 3 |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
1, forward links between user pages, confirmed as the rule (this page
links `units.md`, `expressions.md`, `definitions.md` and
`builtins.md` at §7's anchors), and conflict 3 ("the definitions
table", section 4). Nothing else touches this page. The session uses
`tempF` for a conversion into a function: the running example is
renamed later, by work order 04 (Q-015), so this page does not name
it.

## 9. Code changes it waits on

None. Stated as today's behaviour without waiting: B-009 (a refused
reciprocal line is left out silently), B-010 (a typed list's unit
straddling zero is not retried), B-008 (the reciprocal line inverts the
ratio shown in decimal mode). B-038 (`convert.ts`'s comment) is the code
track's.

## 10. Done when

- Every section of section 4 exists under its heading, in order,
  stating its rule once and linking `numbers.md` rather than restating
  it.
- No "approximate" for a value, no "refused" for a mismatch, an edge or
  a failed condition, no issue number, no "interval", no "dimensionless
  marker", no ordinal output mode, no "sheet", no `docs/functions.md`.
- Every link is a repo-relative path to `numbers.md` or to a §7 anchor
  of a later page.
- The pull request names the choices made and any question for the
  owner, and changes nothing outside this file.
