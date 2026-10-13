# Work orders

The briefs the rewrite runs on: one per page under `docs/` and
`devdocs/`, and one for the code track, written on 2026-10-12 from the
owner's answers in [`../decisions.md`](../decisions.md) (recorded in
[`../plan/12-open-questions.md`](../plan/12-open-questions.md), sections
12.1 to 12.3) and the consolidated audit ([`../findings.md`](../findings.md),
[`../open-items.md`](../open-items.md), [`../bugs.md`](../bugs.md)).
The pages are rewritten into the outline of
[`../plan/07-docs-outline.md`](../plan/07-docs-outline.md) under the
principles of [`../principles.md`](../principles.md).

## How a work order is used

One session per work order, run through the project skill
`work-order` (`.claude/skills/work-order/SKILL.md`) so that every run
follows the same prompt whatever the model: start a Claude Code
session on `docs-revamp` and run `/work-order <NN> [label]`, for
example `/work-order 01 fable`, or `/work-order 00.1 fable` for a
batch of the code track. The session reads its work order,
`audit/principles.md`, and what the work order cites (a finding, an
open item or a bug at its id; a report at the lines a pointer names;
a plan section it names), and nothing else. It writes its page in one
pass, changes no other page and no code, and says in its pull request
the choices it made (which draft it took where two overlap, which
figures it kept as rough and illustrative, what it checked in the
code) and any question for the owner. The code track's session makes
the code changes of work order 00, one batch at a time, and nothing
else.

Every work order stands on its own and all of them use the same
terms and rules, those of `audit/principles.md` and
`audit/plan/08-terminology.md`. Where the record had left an item
unsettled, the owner's list at the end of `audit/decisions.md` ("For
the owner") named it; the owner answered every item on 2026-10-12
(`audit/plan/12-open-questions.md`, section 12.2), and each work order
states the settled reading under "still open" (section 6) and
"Conflicts left to settle" (section 8). A review of the apply step then
put eight more calls to the owner (R-1 to R-8, at the end of
`audit/decisions.md`), answered on 2026-10-13 and recorded in section
12.3; the work orders were corrected with them on that day, together
with the review's other corrections.

## The order

The work orders are numbered in topological order: each page after
the pages it depends on, the user pages first in the sheet's order,
getting started last of the user pages (plan §10), every developer
page after the user pages it links (Q-008) and after the developer
pages it builds on, and the developer index last of all. The code
track runs beside them: its batch 1 lands before work order 01, its
batch 2 before the first page that would otherwise carry a caveat, its
batch 3 after the pages.

| No. | File | Page | Waits on |
| --- | --- | --- | --- |
| 00 | [00-code-track.md](00-code-track.md) | the code changes, in three batches | nothing (batch 1 first) |
| 01 | [01-docs-numbers.md](01-docs-numbers.md) | `docs/numbers.md` | batch 1 |
| 02 | [02-docs-quantities.md](02-docs-quantities.md) | `docs/quantities.md` | 01 |
| 03 | [03-docs-expressions.md](03-docs-expressions.md) | `docs/expressions.md` | 01, 02 |
| 04 | [04-docs-definitions.md](04-docs-definitions.md) | `docs/definitions.md` | 01 to 03 |
| 05 | [05-docs-units.md](05-docs-units.md) | `docs/units.md` | 01 to 04 |
| 06 | [06-docs-settings.md](06-docs-settings.md) | `docs/settings.md` | 01 to 05; batch 1; B-012 (batch 2) |
| 07 | [07-docs-builtins.md](07-docs-builtins.md) | `docs/builtins.md` (renamed from `docs/functions.md`, Q-020) | 01 to 06; B-001, B-005 (batch 2) |
| 08 | [08-docs-app.md](08-docs-app.md) | `docs/app.md` (new) | 01 to 07 |
| 09 | [09-docs-index.md](09-docs-index.md) | `docs/README.md` and the root `README.md` | 01 to 08 |
| 10 | [10-docs-getting-started.md](10-docs-getting-started.md) | `docs/getting-started.md` | every user page; batch 1 |
| 11 | [11-devdocs-numbers.md](11-devdocs-numbers.md) | `devdocs/numbers.md` | the user pages; batch 1 |
| 12 | [12-devdocs-notation.md](12-devdocs-notation.md) | `devdocs/notation.md` | 11; B-002 (batch 1), B-004 (batch 2) |
| 13 | [13-devdocs-architecture.md](13-devdocs-architecture.md) | `devdocs/architecture.md` | 11, 12 |
| 14 | [14-devdocs-functions.md](14-devdocs-functions.md) | `devdocs/functions.md` ("Defined functions") | 11, 13 |
| 15 | [15-devdocs-builtins.md](15-devdocs-builtins.md) | `devdocs/builtins.md` | 11, 13, 14; batch 1; B-001, B-005 (batch 2) |
| 16 | [16-devdocs-settings.md](16-devdocs-settings.md) | `devdocs/settings.md` | 11, 13, 15; batch 1; B-012 (batch 2) |
| 17 | [17-devdocs-cost.md](17-devdocs-cost.md) | `devdocs/cost.md` | 11, 15, 16 |
| 18 | [18-devdocs-future.md](18-devdocs-future.md) | `devdocs/future.md` | 11 to 17 (it receives text and links from 11, 12, 14, 15 and 16) |
| 19 | [19-devdocs-layout.md](19-devdocs-layout.md) | `devdocs/layout.md` | 05; the design pages |
| 20 | [20-devdocs-testing.md](20-devdocs-testing.md) | `devdocs/testing.md` | 19 |
| 21 | [21-devdocs-benchmarks.md](21-devdocs-benchmarks.md) | `devdocs/benchmarks.md` | 17, 19, 20 |
| 22 | [22-devdocs-development.md](22-devdocs-development.md) | `devdocs/development.md` | 04, 05, 20, 21 |
| 23 | [23-devdocs-offline.md](23-devdocs-offline.md) | `devdocs/offline.md` | 08, 13, 19 (the favicon check) |
| 24 | [24-devdocs-deployment.md](24-devdocs-deployment.md) | `devdocs/deployment.md` | 22, 23 |
| 25 | [25-devdocs-security.md](25-devdocs-security.md) | `devdocs/security.md` | 08, 23, 24 |
| 26 | [26-devdocs-README.md](26-devdocs-README.md) | `devdocs/README.md` | 11 to 25 |

Batch 3 of the code track (message wording, test gaps, comments) runs
after the pages; the comment pass follows the style guide work order
22 states.

## What each work order holds

Every page work order has the same ten sections, so that a session
finds each thing in the same place:

1. **The page and its place in the order.** The page, its title and
   role; which pages it comes after and which link it; its status
   (what must have landed first); its output; what is not in scope.
2. **The reader, and what earlier pages taught.** Who reads the page
   and what the pages before it have already explained, so that the
   page explains each concept once, in the page that owns it.
3. **Rules that bind the page, applied to the drafts.** The rules of
   `audit/principles.md` and the owner's answers, each stated with the
   concrete change it makes to the drafted text, at the report lines
   it changes.
4. **The outline, section by section** (user pages: the §7 outline,
   whose headings are fixed anchors) or **the page, section by
   section** (developer pages).
5. **Findings applied.** A table of the findings the page owns, with
   the section each lands in and the decision that settles it; then
   the findings owned by other pages that the session reads.
6. **Decisions followed, and still open.** The open items the page
   follows, and what the owner's list settled for it.
7. **Proposed text to start from, and what the rules change in it.**
   A table of the report lines that hold the drafts, which to take
   where two overlap, and what the rules change.
8. **Conflicts left to settle.** The owner's list items that touch the
   page, and what the pull request must record.
9. **Code changes it waits on.** The bugs of the code track that must
   land first, and those that complicate the page without blocking it.
10. **Done when.** The checks the session makes before its pull request.

The code track's work order (00) has its own sections: scope and
order, the three batches with the wording rules each change follows,
the decisions followed, what is not scheduled, the conflicts, and
"done when".

## Conventions every work order follows

- **Ids.** F-nnn is a finding in `audit/findings.md`, Q-nnn an open
  item in `audit/open-items.md`, B-nnn a bug in `audit/bugs.md`; each
  is read at its id. A report pointer such as `V3 (L81-110)` is
  `audit/reports/V3/fable.md`, lines 81 to 110 (D1's report is
  `merged.md`). `§7.1` is the concept map in
  `audit/plan/07-docs-outline.md`; `§1`, `§4`, `§8`, `§12` are the plan
  sections of the same numbers.
- **Anchors.** A user page's headings are the §7 outline's, and a link
  to one uses the heading's lower-case, hyphenated form
  (`docs/numbers.md#digits-you-can-trust`); the work orders list each
  page's anchors in section 4, and a page never links a heading the
  outline does not name. Where two user pages link each other, the
  page written first links the later page at that anchor and the
  later page keeps the heading (conflict 1 of the owner's list,
  confirmed). A developer page links a developer page written later
  at its current heading, and the later page keeps it: a heading is
  renamed or removed only where a finding or the page's work order
  says so (work order 16, for example, renames `#The sheet` to `#The
  panel`, and work order 18 deletes `#Ruled out, and why`), and that
  page's pull request updates every link to the old heading, in either
  corpus and in `src/`. The same holds for the one renamed file: work
  order 07's pull request repoints every link to `docs/functions.md`.
  Such link updates are the only changes a pull request makes outside
  its page.
- **Hand-offs.** Text that leaves one page for another travels with
  the work orders: `devdocs/numbers.md` (11) hands the binary
  `approx(x, u)` design and #171 to `devdocs/future.md` (18), and #78
  and #173 with their open questions (the owner's list, items 2 and 5);
  `devdocs/notation.md` (12) hands #178 (item 6) to 18;
  `devdocs/functions.md` (14) hands its `#Deferred` text to 18;
  `devdocs/builtins.md` (15) hands the deferred function classes to 18;
  `devdocs/settings.md` (16) hands #167 and #186 (items 7 and 8) to 18;
  `devdocs/future.md`'s ruled-out bullets go to 11 and 14 (and the user
  sentences to 01 and 02) before 18 drops the section;
  `docs/definitions.md` (04) deletes `#What the file contains`, whose
  contents `docs/units.md` (05) carries;
  `devdocs/layout.md` (19) hands the favicon check to `devdocs/offline.md`
  (23); the code track's pull requests give the page sessions the final
  wording of every user-visible line they quote.
- **The owner's list.** `audit/decisions.md`, "For the owner": fifteen
  items whose status under Q-011 was unclear and eight conflicts the
  rules did not settle, all answered by the owner on 2026-10-12 and
  recorded in `audit/plan/12-open-questions.md`, section 12.2. A work
  order names the items that touch its page and the settled reading.
  Five follow-ups the pages do not describe have issues of their own
  (#198 to #202); the three that are bugs in today's behaviour are
  linked once from the devdocs passage that owns the concept (Q-012;
  kept by R-3 of the review).
- **The review's calls.** `audit/decisions.md`, "For the owner: the
  review of the apply step": R-1 to R-8, answered by the owner on
  2026-10-13 and recorded in `audit/plan/12-open-questions.md`, section
  12.3. A work order names the ones that touch its page.
- **The pull request.** Each session's pull request changes its page
  (and, where the work order says so, the links a renamed file or
  heading needs) and nothing else, and records the choices and
  questions the work order asks for.
