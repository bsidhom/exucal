# Work order 10: `docs/getting-started.md` (Getting started)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D9 (L84-95)` is `audit/reports/D9/fable.md`, lines 84 to 95. `§7` is
`audit/plan/07-docs-outline.md`, `§8` is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/getting-started.md`, titled "Getting started": a
  task-oriented tour that links everything and defines one word,
  "certified", by example, since the index uses it first (§7; Q-064,
  A; F-428).
- **Order.** Last of the user pages (Q-008; plan §10): every page it
  links exists, and the index already lists it by name. It links no
  page written after it; the devdocs do not link it.
- **Status.** Ready once the code track's batch 1 has landed (the notes
  it shows say "certified", B-068). No report drafted the page; D9
  verified its facts (D9 L84-95), each reproduced at the defaults
  (eight digits, half even, exact mode), and the owner fixed its
  sections (§7, amended).
- **Output.** The page, and in the pull request the choices made and any
  question for the owner.

## 2. The reader, and what earlier pages taught

The reader has read nothing but the index. The page teaches by doing:
each section is a thing to type, what the app answers, and one or two
sentences on what the answer means, with a link to the page that owns
the concept. It introduces have and want, the names of the two fields,
and uses them from then on (F-471). It defines one term, "certified",
by example in "Reading `=`, `≈` and a note" (the index says the app
"certifies every digit it shows otherwise", Q-064, A; F-428), with a
link to `numbers.md#digits-you-can-trust` for the rule; "inexact",
"kind", "conform" each get a link, not a definition. It
opens with the calculator and adds conversions after it, since the
calculator is the app's focus (§12 questions 2 and 21); GNU units is
named only where a similarity in conversion semantics or definitions
helps (§7).

## 3. Rules that bind the page, applied

- **Inexact, not approximate (F-451).** The section is "Approximating a
  value", the verb naming the act (`approx(2.54)`); the value it gives
  is "inexact" (conflict 7 of the owner's list, confirmed).
- **Refusal only for a size refusal (F-442).** The section is "When
  something fails": a mismatch and an edge are errors, the size
  refusal alone is a refusal (F-008).
- **Messages (Q-007).** Two or three messages quoted as examples of
  their shapes (a mismatch, a size refusal, an edge), claiming no
  completeness; a note quoted as "certified"; the hint in the empty
  output area is not quoted (Q-056).
- **The settings panel (F-488).** "The settings panel" in "Changing a
  setting".
- **Future work is `devdocs/future.md`'s alone (Q-011).** Nothing of
  what may come; no issue.
- **Numbers (Q-016).** No timing; a rough warning at most.
- **The words (§8).** "The reciprocal line, the conversion the other way
  round" once (F-470); "pastes back" (F-457); "a plain number"; "the
  cog" (F-495); `docs/builtins.md` (Q-020).
- **The goals (plan §12.3, 2026-10-14).** The page's first sentence
  says what Exucal is for, exact where it can be and explicit where it
  cannot, the first of its three goals, and the first calculation shows
  it; the tour then shows the other two, the functions and the
  conversions, in that order; stated as Exucal's, never as unique to
  it, and no other calculator is named.

## 4. The outline, section by section

Headings, in §7's order: "Your first calculation", "Reading `=`, `≈`
and a note", "Your first conversion", "Lists of units", "Functions and
readings", "Approximating a value", "Changing a setting", "When
something fails", "Where to go next". D9's facts for each (D9 L84-95),
re-run by the session at the defaults before they are written.

- **Your first calculation.** `2 kg * 3 m/s^2` (`2 kg × 3 m / s^2 =
  6 m kg / s^2`), `exp(1)`, `sqrt(2)`, with the want blank; the have
  and want fields named here (F-471; `app.md#the-two-fields` for the
  labels).
- **Reading `=`, `≈` and a note.** `1/3 ≈ 0.33333333` (exact, shown with
  fewer digits than it has), `sqrt(2)^2 - 2 ≈ 0 (within … of zero)`, a
  partial note in the "certified" wording, which defines the word by
  example, in agreement with `numbers.md#digits-you-can-trust`, which
  states the rule (F-428); links
  `numbers.md#exact-and-inexact-values` and `#digits-you-can-trust`.
- **Your first conversion.** `3 ft` into `in`: `3 ft = 36 in` and the
  reciprocal line; the copy button (one line: what it copies pastes
  back; `app.md#copying-a-result`); links
  `quantities.md#how-a-conversion-is-answered`.
- **Lists of units.** `1 m` into `ft;in`, `time`; links
  `quantities.md#unit-lists` and `units.md#unit-lists-defined-in-the-file`.
- **Functions and readings.** `sin(30 deg)`, `tempC(20)`, `300 K` into
  `tempF`; links `builtins.md`, `quantities.md#conversion-into-a-function`,
  `units.md#temperature-differences-and-readings`.
- **Approximating a value.** `approx(2.54) cm` into `in` (`≈ 1`); links
  `numbers.md#approx`.
- **Changing a setting.** Display digits, ratio notation, decimal mode,
  each with what the same expression then shows; the cog opens the
  settings panel (`app.md#the-settings-panel`); links `settings.md`.
- **When something fails.** A mismatch (`1 m + 1 s`), a size refusal
  (`1e999999999 + 1`, refused with the bits needed), an edge
  (`1 / (sqrt(2)^2 - 2)`, which cannot be told from zero), two or three
  messages quoted as examples (F-008, Q-007), the edge's described
  rather than quoted, since B-021 rewords it after the pages (or quoted
  only up to "cannot be told from zero", the part that does not
  change); links
  `quantities.md#conformance`, `numbers.md#values-too-big-to-hold`,
  `#values-at-an-edge`.
- **Where to go next.** The app guide for installing and offline use
  (`app.md`), the reference pages by what they answer.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-008 | When something fails | Two or three messages as examples; "refused" only for the size refusal (Q-007, F-442) |
| F-009 | (the page) | Written last from §7's skeleton with D9's facts; the headings per F-451, F-488; it introduces have and want; it ends with `app.md` |

Owned elsewhere and read here: F-002 and F-005 (the index's examples
and the reciprocal line come here), F-179 and Q-056 (the hint is not
quoted), F-180 (the page ends with a link to `app.md`), F-428 (getting
started defines "certified" by example), F-457, F-470, F-471.

## 6. Decisions followed, and still open

Followed: Q-007, Q-008, Q-011, Q-016, Q-020, Q-056; §12 questions 2
and 21; the rules F-442, F-451, F-457, F-470, F-471, F-488, F-495.

Still open: nothing. Conflict 7 of the owner's list (the heading
"Approximating a value") is confirmed.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| The whole page | D9 L84-95 (the verified facts); §7's skeleton | the facts, re-run | the notes say "certified"; the section names per section 3 |
| The old intro's examples | A8 L125-129; `docs/README.md` as it stands before work order 09 | the examples, here | "the reciprocal line, the conversion the other way round" once |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
7, the heading, confirmed. Nothing else. The session records in its pull request the
messages it quotes.

## 9. Code changes it waits on

- **Before the page:** batch 1 (B-068: the notes quoted say "certified").
- **Complicates, no wait:** B-022 (the hint not quoted), B-020 (the
  size refusal quoted is one with a count), B-021 (the edge message
  reworded after the pages: not quoted past "cannot be told from
  zero").

## 10. Done when

- The nine sections exist under their headings, each a worked example
  with its output re-run at the defaults and a link to the owning page.
- No definition but "certified", given by example; no "approximate"
  for a value, no "refused" for a mismatch or an edge, no issue number,
  no timing, no "sheet".
- Every link resolves; the page ends with `app.md`.
- The pull request names the messages quoted and any question for the
  owner, and changes nothing outside this file.
