# Documentation audit and restructuring plan

Written 2026-10-08 from a full read of `docs/` (4 pages) and `devdocs/` (16
pages), `git log` over both, and a listing of the source tree. No source
file was read; no code was run. Nothing in either corpus has been changed.

**Pointer conventions.** `file#Heading` names a Markdown heading.
`file#Heading › "label"` names a bullet by its bold label inside that
heading. `file#(top)` is the untitled text before the first `##`.
`docs/settings.md` has only two headings and holds its content as labelled
bullets under `#(top)`, so most of its pointers use the bullet form.
Claims are numbered `N1…` (numeric type) and `Q1…` (quantity) so that
later sections can cite them.

**What "history" means in this plan.** The governing statement is the
principle in `audit/principles.md`, "Documentation principle: intent,
not history": the docs describe the current design and the intent
behind it, including the paths ruled out wherever knowing them would
stop a future reader from re-proposing or re-litigating them; they do
not record how the design evolved, and a passage describing a design
that is no longer current is rewritten to the current design, keeping
only the intent it carries, as rationale or as a ruled-out alternative.
Git history is the record of change; the docs are the record of intent.
This plan applies the principle as a three-way test, used in every
audit unit:

- **Keep, rewritten as intent:** a decision together with its reason;
  an alternative ruled out up front, with the reason; a design that was
  redesigned after seeing how it fleshed out, rewritten as a ruled-out
  alternative with its reason, in the present tense, never as a
  "previously X" note; an open decision tracked by an issue, kept as a
  living pointer beside the concept it concerns.
- **Drop:** a mistake from a minor misunderstanding that was quickly
  corrected, which no reader would re-propose; commit order, dates and
  commit hashes; old names and old shapes beyond what a migration must
  still read; interim-state notes ("until X lands") once X has landed,
  or where the issue link alone says it; measurements and counts that
  a tool regenerates.
- **Not history, so neither kept nor dropped on these grounds:** the
  settings migrations (mechanism the code needs to read old storage);
  a rule's current statement, however it was arrived at.

Where this plan says *decision-against*, it means a passage to keep by
that test, rewritten as a ruled-out alternative; where it says *quirk*,
one to drop. Rows marked *uncertain* are ones the test does not settle
from the text alone (§12, question 25).

The repository's own state fits that aim: on 2026-10-08 `devdocs/` was
pared into current-state pages and its design notes and plans were
removed (they remain in git only, as `devdocs/design/*.md` and
`devdocs/history/*.md` at commit 54aec25, removed in 270b471), and
`devdocs/README.md` describes the pages as "current-state documents, not
a history". The removed notes are not to be resurrected. An audit unit
may consult one for a single purpose: to recover the *reason* for a
decision that a current page states without one (§12, question 1).
Nothing else in this plan depends on git history.

---

## Sections

The plan is one file per section under `plan/`. Section numbers in
cross-references (§5, "§12, question 25") name these files.

1. [Core abstractions](plan/01-core-abstractions.md): the numeric type and the quantity as numbered claims (N1 to N25, Q1 to Q19) with their devdocs sources, the settings that parameterize them, edge cases, what stays in devdocs, decisions and decisions-against to carry forward, the claims to verify, and the modules to check.
2. [The two languages](plan/02-the-two-languages.md): the expression language and the definition language: constructs by pointer, where syntax meets the core abstractions, whether a formal grammar exists and what form the references should take, and the modules to check.
3. [Settings](plan/03-settings.md): every setting, the model parameter or behaviour it controls, its default and range, and where it is documented today.
4. [Built-in functions](plan/04-built-in-functions.md): the entry template for the function reference, the functions grouped into families, and whether descriptions live in the source.
5. [Concept inventory](plan/05-concept-inventory.md): sixty-three further concepts, each with its class, term mappings, pointers into both corpora, dependencies, modules and proposed owner.
6. [Coverage gaps in docs/, measured against the target](plan/06-coverage-gaps.md): what docs/ lacks against the target, with the devdocs passages the new content would derive from, and which existing pages must link to the foundation pages.
7. [Proposed docs/ outline (skeleton)](plan/07-docs-outline.md): the page skeleton for the restructured docs/ and the unified concept map pairing each concept's user-side and developer-side owners.
8. [Terminology](plan/08-terminology.md): conflicting and synonymous terms found in both corpora, with a proposed canonical term for each.
9. [Preliminary structural observations (from the docs alone; unverified)](plan/09-structural-observations.md): duplication across the corpora, links against the ownership direction, concepts without an owner, and passages that are history, plans or interim state; all unverified.
10. [Audit units](plan/10-audit-units.md): twenty-six audit units in order: the core abstractions, then docs/ by target area, then devdocs/ page by page, each sized for one session.
11. [User-facing surface files (from the tree; not read)](plan/11-surface-files.md): the source files that define the parsers, the built-in registry, the unit definitions and the settings, for later mechanical coverage checks.
12. [Open questions](plan/12-open-questions.md): twenty-nine open questions on ownership, terminology and placement, each with a proposed answer.

The principle that governs the revamp, "intent, not history", is in
[principles.md](principles.md).
