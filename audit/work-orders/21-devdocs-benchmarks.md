# Work order 21: `devdocs/benchmarks.md` (Benchmarks and the stress tools)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V7 (L275-291)` is `audit/reports/V7/fable.md`, lines 275 to 291. `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/benchmarks.md`, "Benchmarks and the stress
  tools": running the benchmarks, what each asserts and why its
  threshold is where it is, how the benchmarks are built, and the
  stress tools (the harness, the search, the stress suite), where the
  floor and the deadlines are explained once (F-352); mechanism and
  the decisions' reasons (F-369).
- **Order.** Twenty-first: after `devdocs/cost.md` (work order 17),
  which names the deadlines and links here for their explanation, and
  after `devdocs/layout.md` (19) and `devdocs/testing.md` (20). It
  links `devdocs/development.md` (22), written later, at its current
  headings. Headings `cost.md` links stay: `#The search`, `#The stress
  suite`.
- **Status.** Ready. V7 audited the page (its edits, V7 L265-309), the
  one unit on it.
- **Output.** The page in one pass, and in the pull request the
  figures kept and any question for the owner.
- **Not in scope.** The benchmarks' and tools' code (B-066, the
  `names.bench.ts` comment, is the code track's); `devdocs/cost.md`
  (17).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read the design pages,
`devdocs/cost.md` (the catalogue, the causes, the hangs) and
`devdocs/testing.md` (what a test may depend on; why the benchmarks
run in `test:all`). The page says what each benchmark guards, what its
threshold rests on, and how the stress tools work, in the present
tense; the measured ratios a decision rests on stay, and a timing
only as section 3 keeps it.

## 3. Rules that bind the page, applied to the drafts

- **Which numbers the page keeps (Q-016 A, Q-018 B, Q-088; F-392).**
  V7's split stands: the tools' constants, the model figures, the
  counts and the memory sizes stay; a measured ratio a decision rests
  on stays ("about forty times cheaper … and still quadratic",
  F-386); a timing goes, or stays only as a rough, illustrative figure
  where it adds weight. So: the example diagnostic line of `#Running
  the benchmarks` is a real line said to be one run's, or has its
  figures elided (V7 L269 or L273; F-382, the session's choice); the
  `names.bench.ts` bullet says "many times over this range", since the
  page's "fifty times" is unmeasurable today and contradicts the
  comment's thirtyfold, unless the session measures it (V7 L279;
  F-384, B-066); the stress suite's durations stay rough and generous,
  "minutes" for one function's cases and "the better part of an hour"
  for a full run, with the suite's own prediction named (V7 L305 and
  L309 combined; F-391); "a few seconds" for `pnpm bench` stays
  (F-393).
- **The thresholds (F-383).** "The thresholds lie above the expected
  ratios, about twice them in most cases, so that noise never fails a
  benchmark that a regression would not fail by a wide margin"; "well
  above" is not used, the kernel threshold being about 1.3 times its
  expected ratio by V7's figures, and the two exceptions the bullets
  give (the `names` check held to five; `pi`'s fifty against
  Karatsuba's 38 and the quadratic hundred) stay.
- **The deadlines explained here (F-352).** `#The search` explains the
  search's deadline (`DEADLINE_MS` of `bench/stress/catalogue.ts`, which
  the harness enforces) and `#The stress suite` the suite's (four times
  the catalogued time); `cost.md` names them and links here.
- **The words (§8).** The stress vocabulary (case, profile, floor,
  deadline, hang, warm and cold, lane) defined here where each first
  appears, in the words `cost.md` uses (F-497); "the settings panel"
  (F-488); "refused" only for a size refusal (V7 L287, L291: "the
  second is refused at the default", a significand-limit refusal,
  stays); "the table built from the definitions file" (F-475;
  conflict 3, provisional).
- **Markdown (principles).** Inline links.

## 4. The page, section by section

- **Running the benchmarks.** V7 L265-273: the diagnostic line
  (section 3); "a few seconds" stays.
- **What each benchmark asserts.** V7 L275-291: the thresholds
  sentence (F-383); the `names.bench.ts` bullet as intent without the
  figure (F-384); the `kernel.bench.ts` bullet gains its two missing
  tests, `exp` of a large argument at the ceiling against `exp` of
  one, within a small factor since the squaring loop renormalizes,
  with the digits in log space timed beside it, and the decimal grid's
  own costs (the settle, the product of settled balls, the kernel's
  exit) from a quarter of the ceiling to the ceiling under the same
  bound of 64 (V7 L281-283; F-387); the `rational.bench.ts` bullet
  asserts of both gcds that doubling the size costs at most eight
  times, twice what the quadratic gcd gives, and reports the two long
  quotients, at twice the default significand limit since the second
  is refused at the default (V7 L291; F-385), keeping "about forty
  times cheaper … and still quadratic" (F-386).
- **How the benchmarks are built.** No finding; the words of section
  3 only.
- **The stress tools > The harness.** The floor and the deadline named
  as `catalogue.ts`'s constants that the harness enforces (F-361 in
  `cost.md`; F-352).
- **The search.** V7 L293-299: the lock is taken over when the process
  that holds it is gone or has held it past a fixed time (V7 L295;
  F-389); lanes, one per core unless `--jobs` says otherwise, take
  the next case as they come free (V7 L299; F-390); the command reads
  the current commit from git, to record it with each run and hit, and
  changes nothing there, committing being the person's (V7 L297;
  F-388); the search's deadline explained (F-352).
- **The stress suite.** V7 L301-309: the durations as section 3 has
  them (F-391); the suite's deadline explained (F-352).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-382 | Running the benchmarks | A real line said to be one run's, or elided (Q-088, Q-016) |
| F-383 | What each benchmark asserts | The thresholds sentence; no "well above" |
| F-384 | What each benchmark asserts | Keep as intent; "many times" unless measured (Q-088; B-066) |
| F-385 | What each benchmark asserts | The quotients reported, not asserted |
| F-386 | What each benchmark asserts | The ratio stays; keep as intent (Q-016) |
| F-387 | What each benchmark asserts | The two tests appended |
| F-388 | The search | The commit read from git, nothing changed |
| F-389 | The search | The lock's fixed-time takeover |
| F-390 | The search | `--jobs` |
| F-391 | The stress suite | Rough durations, generous, with the prediction (Q-018) |
| F-392 | (the page) | V7's split confirmed (Q-016) |

Owned elsewhere and read here: F-352, F-361, F-368, F-369, F-393, and
the terminology findings F-475, F-488, F-497.

## 6. Decisions followed, and still open

Followed: Q-008, Q-016, Q-018, Q-088; the rules of section 3.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| Running the benchmarks | V7 L265-273 | V7 | the diagnostic line, real and marked, or elided |
| What each benchmark asserts | V7 L275-291 | V7 | "above", not "well above" (L277); "many times" (L279) |
| The search | V7 L293-299 | V7 | the deadline's explanation |
| The stress suite | V7 L301-309 | L309 with L305's rough figures | the figures kept generous |

## 8. Conflicts left to settle

None of the owner's list touches this page's text; conflict 3 ("the
table built from the definitions file") and conflict 4 (a figure kept
only as rough and illustrative) are applied as section 3 says. The
session records in its pull request the figures kept.

## 9. Code changes it waits on

None. B-066 (the `names.bench.ts` comment's figure) is the comment
pass's and does not change the page.

## 10. Done when

- Every benchmark's assertion and reason are stated as the code has
  them; the thresholds sentence names the exceptions; the two missing
  tests are on the page; the search's and the suite's deadlines are
  explained here and nowhere else.
- No timing but the rough, marked ones of section 3; the ratios stay;
  "many times" for the index.
- The pull request names the figures kept and changes nothing outside
  this file.
