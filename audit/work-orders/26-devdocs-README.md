# Work order 26: `devdocs/README.md` (Developer documentation)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V8 (L172-203)` is `audit/reports/V8/fable.md`, lines 172 to 203. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§12` is
`audit/plan/12-open-questions.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/README.md`, "Developer documentation": the
  developer index (§12 q18), one line per page under `#The design` and
  `#The code`, each saying what the page holds and where its user side
  is, and a link to the style guide for the three principles every
  contributor follows (Q-029; F-181, F-402). `devdocs/architecture.md`
  points here instead of listing its sister pages (Q-068, work order
  13).
- **Order.** Last of all, twenty-sixth: after every page it lists, so
  that each line and anchor describes a page as rewritten (Q-008;
  F-181, F-426).
- **Status.** Ready once work orders 11 to 25 have landed. V8 drafted
  the page whole (V8 L172-203), the one draft.
- **Output.** The page in one pass, every link checked against the
  rewritten pages, and in the pull request any question for the owner.
- **Not in scope.** The pages listed; `docs/README.md` (work order 09).

## 2. The reader, and what earlier pages taught

The reader is a developer arriving at the developer docs, who has read
`docs/README.md` and may have read the user pages; each line tells
them which page holds what, in the terms the pages use, and names the
user page that owns the rules the developer page builds on. The index
explains nothing itself.

## 3. Rules that bind the page, applied to the drafts

- **The terms (Q-020, F-478; F-488; Q-022).** The `functions.md` line
  says "Defined functions: the functions the definitions file defines,
  their annotations, conditions, calls, a function as the want, the
  build-time checks, what a call costs; the user's side is
  `docs/definitions.md`" (V8 L186's "user-defined functions" is not
  used); the `builtins.md` line names `docs/builtins.md` as the user's
  side (V8 L185; Q-020's note); the `settings.md` line says "the panel
  and its controls" (V8 L188's "sheet"; F-488); the `offline.md` line
  says "build ID" (Q-022).
- **Future work (Q-011; F-350).** The `future.md` line describes the
  page as rewritten: the extensions that fit and the two that would
  reshape the number type, without "and what is ruled out" (V8 L189)
  unless the owner's answer to item 13 of the Q-011 list kept a
  ruled-out section there, which the session checks on the page.
- **The security line (F-182).** "the supply chain, the toolchain,
  secrets, the rules for code that runs commands, and the page" (V8
  L200).
- **The style guide (Q-029; F-402).** The top links
  `development.md#Style guide` as the home of the documentation,
  linking and Markdown principles (V8 L172-203 has the link; §12 q29).
- **Every link resolves.** Written last, the page links headings as
  the rewrites left them (`settings.md#The panel`, not `#The sheet`;
  `functions.md` without `#Deferred`; `future.md` without `#Ruled out,
  and why`); the session checks each anchor it uses.
- **Markdown (principles).** Inline links; one line a page.

## 4. The page, section by section

- **(top).** V8 L172-203's opening: what the developer docs are, the
  user docs as the owner of the rules, the style guide linked.
- **The design.** One line each for `numbers.md`, `notation.md`,
  `architecture.md`, `functions.md` (Defined functions), `builtins.md`,
  `settings.md`, `cost.md`, `future.md`, in V8's words with section 3's
  changes.
- **The code.** One line each for `layout.md`, `testing.md`,
  `benchmarks.md`, `development.md`, `offline.md`, `deployment.md`,
  `security.md` (all four sections), in V8's words with section 3's
  changes.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-181 | (the page) | V8's replacement, "Defined functions", the style guide linked, written last (Q-020, Q-029, Q-008) |
| F-182 | The code | The security line names the page |

Owned elsewhere and read here: F-402, F-426, F-478, F-488.

## 6. Decisions followed, and still open

Followed: Q-008, Q-011, Q-020, Q-022, Q-029, Q-068; the rules of
section 3.

Still open: nothing of its own; the `future.md` line follows that
page as written (item 13 of the Q-011 list).

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| the whole page | V8 L172-203 | V8 | the `functions.md` line (L186); `docs/builtins.md` (L185); "panel" (L188); the `future.md` line (L189); "build ID"; every anchor checked |

## 8. Conflicts left to settle

None of the owner's list touches this page beyond item 13's effect on
one line.

## 9. Code changes it waits on

None.

## 10. Done when

- Every page under `devdocs/` has one line, every link resolves to a
  heading on the rewritten page, and the terms are §8's.
- The pull request changes nothing outside this file.
