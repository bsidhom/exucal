# Work order 20: `devdocs/testing.md` (Testing)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V7 (L207-215)` is `audit/reports/V7/fable.md`, lines 207 to 215. `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/testing.md`, "Testing": what the test commands
  run and why the benchmarks are among them, what a test may depend
  on, the numeric test patterns, the edge sweeps, the random source,
  type-checking, and the UI checklist; mechanism and the decisions'
  reasons (F-369; §12 q24).
- **Order.** Twentieth: after `devdocs/layout.md` (work order 19),
  which links it, and after the design pages whose modules the tests
  exercise. It links `devdocs/benchmarks.md` (work order 21) and
  `devdocs/development.md` (22), written later, at their current
  headings; a later page that renames one updates the inbound links.
- **Status.** Ready. V7 audited the page (its edits, V7 L207-263), the
  one unit on it.
- **Output.** The page in one pass, and in the pull request the
  choices made and any question for the owner.
- **Not in scope.** The tests themselves; `devdocs/layout.md` (19);
  `devdocs/benchmarks.md` (21).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read the design pages (the ball,
the schedule, the settings and the probe, the built-ins and their
edges, the definitions file's build) and `devdocs/layout.md` (where
each test lives, the test-beside-each-module rule). The page says what
each kind of test guards and why it is shaped as it is, in the present
tense; a figure stays only where section 3 keeps it.

## 3. Rules that bind the page, applied to the drafts

- **Which numbers the page keeps (Q-016 A, Q-018 B; F-392).** The
  tools' constants stay as constants: the probe test's budget is "five
  seconds", the test's own constant, and V7's "a small fixed budget"
  (V7 L221) is not used (F-371). Counts and rough durations stay,
  worded broad and generous, with the reason they are given: the ball
  level of the sweeps runs "tens of thousands of cases in about half a
  minute" and the text level "a few hundred in a few seconds", which
  is why the sweeps run before a commit rather than on every edit, the
  run reporting its own count and time (V7 L247-251 with the rough
  figures kept; F-376); "a few seconds" for `pnpm test` stays (F-393).
  The model figures, the counts and the memory sizes stay (F-392).
- **Issue links (Q-011; the owner's list, item 10, confirmed).** #110
  and #114
  (`#The edge sweeps`) and #179 (`#Type-checking`) are developer-tooling
  issues, not future work: each stays linked inline, once, at the
  passage that owns it, worded "is open (#…)", after the session
  checks the issue's status; a closed one loses its reference and the
  passage states the current design (F-377, F-380; V7 L251, L259).
  The three reference definitions at the foot (page L228-230) are
  deleted (V7 L263).
- **"The edge sweeps" (Q-065; F-462).** The sweeps are named "the edge
  sweeps", never "the conformance tests".
- **The words (§8).** "The settings panel" where the UI checklist
  names it (F-488); "reached only through" for a module only tests
  exercise (F-498); "the definitions file" and "the definitions table"
  (F-475; conflict 3 of the owner's list, answered); "the hard
  bound" glossed once (V7 L221; F-441); "refused" only for a size
  refusal (V7 L215's "when the table it builds or the expression it
  times is refused" is one, and stays).
- **Markdown (principles).** Inline links; the command table stays.

## 4. The page, section by section

- **(top).** V7 L207-215: the benchmarks are in `pnpm test:all`
  because a check that is run only when someone remembers it is not
  run, and a benchmark left out of it fails unnoticed, often before
  reaching its assertion, when the table it builds or the expression
  it times is refused, `bench/synthetic.ts:14-19` being the guard that
  came of it (F-370, keep as intent); the test-beside-each-module rule
  gains the `exact.test.ts` clause `layout.md` states (F-363, Q-072);
  "a few seconds" in the `pnpm test` row stays (F-393).
- **What a test may depend on.** V7 L217-223: no test, sweep or
  benchmark depends on the limits a device has chosen; only the shell
  reads the browser's settings through `contextOf`, and the stress
  tools call `contextOf` too, on a catalogued case's settings, never
  the browser's (F-372); the tests of the table (`units.test.ts`,
  `messages.test.ts`, `system-build.test.ts`) build it at the ceiling
  context, as the app does, while `build.bench.ts` builds synthetic
  tables at the default precision, since it measures the build and not
  the units (F-373); "five seconds" stays (F-371).
- **The numeric test patterns.** V7 L225-233: reference digits from
  Python's `decimal` module and from mpmath, named in the test, to
  forty digits at least, and for the Gamma and the incomplete families
  at one argument each to a thousand (F-374, A: the tests as they
  are); `exactDec` added to the list it is missing from (page L71-76;
  F-375).
- **The edge sweeps.** V7 L235-251: the three-argument functions take
  the second operands' subset as their first two arguments and a
  small third-operand set as their third, since the full set cubed
  would be most of the sweep (F-378); the counts and durations as
  section 3 has them (F-376); #110 and #114 inline (F-377).
- **The random source.** The two draws the lists omit are added (page
  L155-160; F-375), and `src/testing/random.test.ts` is named as what
  checks the source against the published vectors (F-367).
- **Type-checking.** V7 L253-259: "(one did, …)" deleted (F-379); the
  second paragraph in the present tense, "so a cycle among the
  kernel's modules (`fixed.ts`, `ball.ts`, `context.ts`) that only such
  imports kept alive would run a module's top level before its
  constants exist, depending on which module a test imports first",
  with #179 inline (F-380, keep as intent).
- **The UI.** The Playwright checklist stays as stated (F-381); "the
  settings panel" (F-488); the reference definitions after it deleted.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-370 | (top) | Keep as intent |
| F-371 | What a test may depend on | "five seconds", the test's constant (Q-016) |
| F-372 | What a test may depend on | The stress tools call `contextOf` too |
| F-373 | What a test may depend on | `build.bench.ts` at the default precision |
| F-374 | The numeric test patterns | The tests as they are (A) |
| F-375 | The numeric test patterns; The random source | `exactDec` and the two draws |
| F-376 | The edge sweeps | Rough counts and durations, generous (Q-018, Q-016) |
| F-377 | The edge sweeps; Type-checking | Inline, status checked; item 10 confirmed |
| F-378 | The edge sweeps | The three-argument functions corrected |
| F-379 | Type-checking | Drop |
| F-380 | Type-checking | Keep as intent; #179 inline |
| F-381 | The UI | Keep as stated |

Owned elsewhere and read here: F-363, F-367, F-369, F-392, F-393, and
the terminology findings F-441, F-462, F-475, F-488, F-498.

## 6. Decisions followed, and still open

Followed: Q-008, Q-016, Q-018, Q-065, Q-072; the rules of section 3.

Still open: nothing. #110, #114 and #179 stay inline here (the owner's
list, item 10, confirmed; F-377, F-380).

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V7 L207-215 | V7 | the `exact.test.ts` clause added |
| What a test may depend on | V7 L217-223 | V7 | "five seconds" kept, not "a small fixed budget" (L221) |
| The numeric test patterns | V7 L225-233 | V7 | `exactDec` added |
| The edge sweeps | V7 L235-251 | V7's L243 and L251, with the rough figures of L247 kept | #110, #114 inline, status checked |
| The random source | page L153-173 | the page | the two draws and the test's name |
| Type-checking | V7 L253-259 | V7 | #179 inline, status checked |
| The UI | V7 L261-263 | the page; the definitions deleted | "the settings panel" |

## 8. Conflicts left to settle

From the owner's list, both answered: item 10 (section 6); conflict 3
("the definitions table"). The session records in
its pull request the issue statuses it found and the figures it kept.

## 9. Code changes it waits on

None.

## 10. Done when

- Every section states the tests as they are, in the present tense,
  with the reasons kept; "five seconds", the sweep figures and "a few
  seconds" stay as section 3 words them.
- #110, #114 and #179 are inline, once each, status checked; no
  reference-style link; "the edge sweeps"; "the settings panel".
- The pull request names the choices made and changes nothing outside
  this file.
