# Work order 00: the code track

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that makes the code changes reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, section 9 "Code changes: when each lands", marked
done and accepted, with the items it names; recorded in
`audit/plan/12-open-questions.md`, section 12.1). Ids: B-nnn is a bug in
`audit/bugs.md` (its Location, Description and Units fields give the
files, lines and evidence), F-nnn a finding in `audit/findings.md`, Q-nnn
an open item in `audit/open-items.md`; each is read at its id. A report
pointer such as `A2 (L120-128)` is `audit/reports/A2/fable.md`, lines
120 to 128.*

## 1. Scope and order

- **What this track is.** Every code change the audit decided, in the
  three batches section 9 of the sheet fixes. Nothing else in `src/`,
  `bench/` or `scripts/` changes: the behaviour the owner kept is kept
  (section 6), and no page under `docs/` or `devdocs/` is touched, those
  being the page sessions' (work orders 01 to 26).
- **Why it is numbered first.** Batch 1 lands before `docs/numbers.md`
  (work order 01), the first page, because the pages quote the wording
  it changes; batch 2 lands before the first page that would otherwise
  carry a caveat; batch 3 lands after the pages. So the track runs
  beside the pages, one batch at a time, and each batch is pushed
  before the work order that waits on it starts.
- **How a change is made.** From the evidence the bug cites, read in the
  code; nothing is re-audited beyond the lines a bug names. Each bug
  is its own commit, or a batch of closely related ones (the three
  panel lines of batch 1) is one commit; the repository's own checks
  run before each push (`devdocs/development.md#Commands` lists them;
  a wording change updates the test that pins the old text). A code
  comment names a page and a section when it points at the docs, never
  a plan, a work order or a decision number (`audit/principles.md`,
  the style guide's rule).
- **What the pages need from it.** The page sessions quote the app's
  text as the code has it when they run, so the pull request of each
  batch lists the final wording of every user-visible line it changed
  (the notes, the panel's lines, the new refusal message), and the
  owner's answers decide that wording where they speak (section 4).

## 2. Batch 1: before `docs/numbers.md` (work order 01)

1. **B-068, "certain" becomes "certified"** (Q-006, ok; F-021, F-427,
   F-214). The notes of `noteOf` (`src/outcome.ts:507`; the notes at
   `:504-517`), the panel's exact-mode line `MODE_LINES.exact`
   (`src/settings-lines.ts:261`), worded as D4 proposes, "Every digit
   shown is certified, found at rising precision; …" (D4 L135, L393,
   L403), and the comments and tests that carry the word
   (`src/outcome.ts:25`, `:126`, `:503`; `src/core/display.ts:2`, `:17`,
   `:190`; `src/core/display.test.ts:239`; `src/outcome.test.ts:273`,
   `:411`). A2 drafted the old-to-new text and did not apply it (A2
   L120-128).
2. **B-017, the probe's line** (F-491, a rule). `PROBE_LINE`
   (`src/settings-lines.ts:188`) no longer says "the costliest
   operations": it names what the probe times, an exact product and
   the four elementary functions at rising sizes, and never says
   "costliest" (F-491 overrides D4's proposed "the costliest exact
   product and the costliest elementary functions", D4 L398). The probe
   itself is not extended (F-491's note).
3. **B-025, the decimal-mode line** (F-435). `MODE_LINES.decimal`
   (`src/settings-lines.ts:263`): "exact in that arithmetic" becomes
   "exact under the mode's rounding".
4. **B-026, the proposal line** (Q-004, B). `src/settings-lines.ts:243`
   (`:243-249`): the ceiling is a pass's precision, not "a grid of 4,040
   digits"; A3's wording (A3 L68-69, L145), for example "the built-ins
   at a precision of 4,040 digits". The grid the ceiling pass settles
   onto has about ten digits more, which the line does not say.
5. **B-002, the throw at the exponent bound** (Q-002, B; F-060). In
   `numberExpr` (`src/outcome.ts:394-398`; `parseDecimal` at
   `src/core/scaled.ts:187-197`) a value within the bound whose rounding
   to the display digits carries past it (`9.5e1000000000000000000` at
   one display digit; `9.99999999e1000000000000000000` at eight, with a
   blank want or into `m`) no longer throws: the rounding is refused as
   the bound's overflow, with an explicit message that names the
   offending expression, in the owner's words "rounding EXPRESSION
   causes an overflow", worded in the style of the existing messages
   in `src/messages.ts` (which name what they quote and say what the
   limit is). So every line the app writes pastes back; the alternative
   A2 drafted (writing the literal and refusing it when typed back) is
   superseded. Tests cover the two inputs above in both forms. The
   pages that state this are `docs/numbers.md` ("How numbers are
   written", work order 01) and `devdocs/notation.md#Every literal
   parses back` (work order 12).

## 3. Batch 2: before the page that would otherwise carry a caveat

Each is small, and fixing it first saves writing a caveat and removing
it later (the sheet's section 9, item 2).

1. **B-001, `gcd(a, 0)`** (F-152). `gcdOfIntegers`
   (`src/core/builtins/integers.ts:55-58`) hands `b = 0` to
   `rational.ts`'s `gcd`, whose contract excludes it, so `gcd(5, 0)` is
   `2`; the rule the pages state is that `gcd(a, 0)` is the magnitude
   of `a`. Tests in `src/core/builtins/integers.test.ts` and
   `exact.test.ts`. Before work orders 07 (`docs/builtins.md`) and 15
   (`devdocs/builtins.md`).
2. **B-004, the ratio notation's screen** (Q-043, ok; F-061). `ratioParts`
   (`src/core/display.ts:131-156`, the screen at `:134-136`) forms no
   fraction for dyadic values the rule admits (`2^-41` to `2^-63` at the
   default width). V5's fix (V5 L83, L236): screen the canonical
   exponent at `4W` and the numerator's digits at `3W`, which keeps the
   fraction from being formed for a value that cannot fit and admits
   every value that can, with a boundary test. Before work order 12
   (`devdocs/notation.md`); work order 01 avoids the range meanwhile.
3. **B-005, `mod`'s refusal class** (F-284). `modBall`'s exact path
   (`src/core/builtins/division.ts:136`, `:146`) raises
   `tooLarge("exceeds", …)` where the reach rule
   (`src/core/rational.ts:60-66`) gives `fits`, since `mod(approx(-1),
   1e20000)` is a value: the refusal carries `fits` and a count, so its
   message offers `approx` and decimal mode. Before work orders 07 and
   15.
4. **B-012, a stored ratio width out of range** (Q-049, B). `src/settings.ts:397-427`
   makes the whole mode fall back to its default where a stored width
   lies outside 1 to 1,000; it is clamped like the stored extended
   count (`:429-443`, `:553-558`), with a test. Before work order 16
   (`devdocs/settings.md#Storage`); `docs/settings.md` (work order 06)
   then states the clamp.

## 4. Batch 3: after the pages, each in its own commit

The pages describe today's behaviour and quote no message that is
about to change; these land once the pages are written.

**Message wording (B-015 to B-029), with the generated catalogue (§12
question 6) when that tool exists.**

- B-015: the incomplete gamma refusal (`src/messages.ts:357-360`)
  blames the significand limit for a cost limit (#107); the message
  says which limit it is.
- B-016 (Q-054, ok): `round`'s second-argument errors
  (`src/messages.ts:241-244`; `src/core/builtins/round.ts:356`) are
  worded by the argument's place, for example "the number of places of
  `round` must be a whole number".
- B-018 (Q-052, ok): `bitsNeeded` (`src/messages.ts:372-381`) rounds a
  count above `2^53` to two significant digits.
- B-019 (Q-055, ok; F-474, F-089): the parse label "a unit name"
  (`src/core/expr.ts:342-346`; `:335`, `:348`, `:420`) becomes "a name",
  the order of the labels unchanged, in a change of its own.
- B-020 (Q-051, A): a size refusal without a count reads "would need a
  significand past the significand limit" (A5's wording, A5 L470-475;
  `src/messages.ts:349-381`), the stray comma gone, in both forms.
- B-021 (Q-053, ok): the edge message (`src/messages.ts:94`) names the
  edge once more, "which side of the pole", "which side of the bound".
- B-022 (Q-056, ok; F-179): the empty-state hint
  (`src/unit-converter.ts:255-258`) leads with the calculator, as D9
  words it: "Type an expression, such as `sqrt(2)` or `3 ft`, and, to
  convert it, the unit you want, such as `in` or `ft;in`." (D9 L315).
- B-023 (Q-057, ok): the load-failure message keeps its kind name
  "(fetchFailed)", since a bug report needs it; no change.
- B-024 (Q-063, ok): "0 of 1 digits" stays; no change.
- B-027: the zero-divisor exponent error (`src/core/expr.ts:450-463`)
  stops quoting the trailing blanks.
- B-028: a refused literal of thousands of digits is quoted in full;
  eliding the middle of a long quoted span is the change, if made.
- B-029: no message is worded for a definitions rejection; nothing
  changes while only the predefined definitions file loads (user
  definitions are future work, Q-011).

**Test gaps (B-030 to B-033).** B-030: a test in `src/outcome.test.ts`
pins the partial note's text (A2's cases, A2 L127). B-031:
`src/core/builtins/exact.test.ts` gains the cases its description
promises, `gcd(a, 0)`, `mod`'s reach and the `ceiling` slip among
them. B-032 (Q-060, ok): a failing build of `src/units.txt`
(`src/units.test.ts:72-78`) reports the line, not the offsets. B-033:
the tests #89 asks for are checked; closing the issue is the owner's
(housekeeping the owner confirmed: item 15 of the owner's list at the
end of `audit/decisions.md`).

**Comments (B-034 to B-067), one pass after the audit (Q-059, ok).**
Each as its bug describes; those the owner's answers word:

- B-034: the history in comments goes, under the style guide's rule
  (`devdocs/development.md#Style guide`, after work order 22).
- B-038 (F-070): `src/core/convert.ts:132-138` stops saying the ratio is
  never `tooLarge`.
- B-041 (F-022): "four times the precision limit plus the guard"
  (`src/core/pipeline.ts:296-297`; `src/core/context.ts:51`, `:207`;
  `src/core/context.test.ts:176`) reads "four times the sum of the
  precision limit and ten".
- B-042 (F-028): `orderOf` and `disjoint` comments drop "a difference
  refused as too large to form".
- B-045 (F-292), B-046, B-047, B-048, B-049, B-050 ("Most bits" becomes
  the significand limit), B-051, B-052, B-055 ("under the Mode radios"),
  B-058: as described.
- B-053: the service-worker comments say the update check is made
  "from the footer".
- B-054 (F-408): `scripts/cloud-env` points at `devdocs/development.md`,
  as the other scripts do, and drops the stale deploy sentence.
- B-056 (F-249): `src/system-build.ts:2` and `src/system-table.ts:10`
  cite the section that holds the ceiling table's design after work
  order 13 settles what `devdocs/architecture.md#The shell and its parts`
  keeps (`devdocs/numbers.md#Working precision and the schedule`
  otherwise).
- B-057 (F-459): `src/core/dimension.ts:13`, `:70` and
  `src/core/definitions.ts:11`, `:123` say "a marker of a kind, with no
  dimension of its own", or "kind marker", never "dimensionless".
- B-059 (F-483, Q-060): `src/units.txt:185-188` and `src/units.test.ts:289`,
  `:463-465` say "temperature difference", not "interval".
- B-060: `src/units.test.ts:2-3`, `:186` stop calling the primitives the
  SI base units.
- B-061 (F-475): `src/units.txt:1` says "the definitions file".
- B-062 (Q-033; F-069): `gravity` (`src/units.txt:118`) is marked
  "(exact by convention)".
- B-063 (Q-033): the tropical and sidereal years (`src/units.txt:344-345`)
  get a source and an epoch in their comment.
- B-064 (Q-032): `bit`'s comment (`src/units.txt:25`) gives the reason
  information is a dimension: a count of bits must not collapse into a
  plain number, so that `bit/s` stays apart from `Hz` as `rad/s` does.
- B-065 (Q-033; F-116): the file's header names the documents the units
  page cites, the SI brochure (9th edition), NIST Handbook 44 and the
  Weights and Measures Act 1985, beside its rule on comments.
- B-066 (F-384): `bench/names.bench.ts:24-26` loses its figure.
- B-067: the TODO in `src/core/evaluate.ts:7-11` is resolved by a later
  comment pass that makes module headers restate less of
  `devdocs/architecture.md`; not scheduled here.
- The two comments in `src/units.txt` that link `docs/functions.md` link
  `docs/builtins.md` (Q-020's note), landed with or right after work
  order 07, so that no link dangles. B-014 (the dalton as CODATA 2018)
  stays as it is (Q-041, ok); the comment records the edition.

**With the work they belong to.** B-069: the panel's "About these
settings" link (`src/settings-lines.ts:114-117`) becomes a local link
once the pages ship with the app (§12 question 31), not before. B-070
(F-360): the stress tool's hangs table (`bench/stress/catalogue.ts:561`)
emits inline issue links once `devdocs/cost.md` owns those issues (work
order 17).

## 5. Decisions followed

Each at its id: Q-002 (B), Q-004 (B), Q-006 (ok), Q-032, Q-033 and
Q-041 (ok: the file's comments), Q-043 (ok), Q-049 (B), Q-051 (A),
Q-052 (ok), Q-053 (ok), Q-054 (ok), Q-055 (ok), Q-056 (ok), Q-057 (ok),
Q-059 (ok), Q-060 (ok), Q-063 (ok), Q-020 (the note: the rename's
links), Q-011 (user definitions are future work, so B-029 changes
nothing); the rules F-491, F-435, F-459, F-475, F-483; the findings
F-021, F-022, F-028, F-060, F-061, F-070, F-152, F-284, F-292, F-249,
F-384, F-408, F-474.

## 6. Not scheduled, by the owner's decision

- Behaviour the open items keep and the pages document: B-007 (`log`'s
  exact cases miss rational exponents; Q-048, under review), B-008 (the
  reciprocal line inverts the ratio shown; Q-046), B-010 (a typed list's
  unit straddling zero is not retried; Q-045), B-011 (the schedule's
  cost at the ceiling's edge; Q-047).
- What an open issue tracks: B-003 with #79, B-006 with #88, B-009 with
  #92.
- B-013 (69,659 against 69,658), by design (Q-091); B-014 (Q-041).
- Renames the owner has not scheduled: the code's "working digits"
  (#172, F-431), which stays with the code; no code identifier changes
  for a page's term (F-475: identifiers are quoted as they are).
- The follow-ups the owner's list gave issues of their own (item 14,
  answered): #198 (B-010), #199 (B-011), #200 (B-007), #201 (Q-061) and
  #202 (F-320); each lives on its issue, outside this track.

## 7. Conflicts left to settle

None settled by this track; one touches it: conflict 8 of the owner's
list (`audit/decisions.md`, "For the owner"), how the pages name the
panel's declined edits, which the code calls refusals (`refusalOf`);
answered: the pages say "does not accept" and "held to", and the
identifiers stay.

## 8. Done when

- Batch 1 is pushed before work order 01 starts, batch 2 before work
  orders 07, 12, 15 and 16, batch 3 after the pages, each bug its own
  commit or part of a named group.
- The repository's checks pass on every push, and each pull request
  lists the final wording of every user-visible line it changed.
- Nothing in section 6 changed; no page changed.
