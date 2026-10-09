# Documentation audit and restructuring plan

Written 2026-10-08 from a full read of `docs/` (4 pages) and `devdocs/` (16
pages), `git log` over both, and a listing of the source tree. No source
file was read; no code was run. Nothing in either corpus has been changed.

**Pointer conventions.** `file#Heading` names a Markdown heading.
`file#Heading > Label` names a bullet by its bold label under that
heading (the `>` is a breadcrumb separator, nothing more). `file#(top)`
is the untitled text before the first `##`. `docs/settings.md` has only
two headings and holds its content as labelled bullets under `#(top)`,
so most of its pointers use the bullet form. Under a claim, a line that
begins with `→` lists the passages the claim rests on. Claims are
numbered `N1…` (numeric type) and `Q1…` (quantity) so that later
sections can cite them. When a pointer becomes a link in a page, the
link is a repo-relative path (`../devdocs/numbers.md`), never an
absolute URL and never one that names the repository
(`audit/principles.md`, "Linking principle").

**The principle, and how the plan applies it.** The governing statement
is the principle in `audit/principles.md`, "Documentation principle:
intent, not history": the docs describe the current design and the
intent behind it, including the paths ruled out wherever knowing them
would stop a future reader from re-proposing or re-litigating them;
they do not record how the design evolved. Where this plan and the
principle conflict, the principle wins. `devdocs/` is not a historical
record: it states the current design and its intent, including
ruled-out alternatives, and nothing about how the design evolved. The
plan therefore lists, for each concept, the passages that discuss it,
in no particular order, and tags each passage that describes a
superseded design with one of three words:

- **update:** the passage is stale; rewrite it to the current design.
- **keep as intent:** the passage carries rationale or a ruled-out
  alternative worth keeping; rewrite it as such, in the present tense,
  never as a "previously X" note.
- **drop:** the passage carries no intent the page does not already
  state; delete it.

The tagged passages are in §1.1.5, §1.2.5 and §9.4; every devdocs audit
unit extends the list for its pages and applies the tags.

The repository's own state fits the principle: on 2026-10-08 `devdocs/` was
pared into current-state pages and its design notes and plans were
removed (they remain in git only, as `devdocs/design/*.md` and
`devdocs/history/*.md` at commit 54aec25, removed in 270b471), and
`devdocs/README.md` describes the pages as "current-state documents, not
a history". The removed notes are not to be resurrected. An audit unit
may consult one for a single purpose: to recover the *reason* for a
decision that a current page states without one, and defers to the
owner where the note does not settle it (§12, question 1).
Nothing else in this plan depends on git history.

---

## Sections

The plan is one file per section under `plan/`. Section numbers in
cross-references (§5, "§12, question 25") name these files.

1. [Core abstractions](plan/01-core-abstractions.md): the numeric type and the quantity as numbered claims (N1 to N25, Q1 to Q19) with their devdocs sources, the settings that parameterize them, edge cases, what stays in devdocs, stale passages tagged update, keep as intent or drop, the claims to verify, the modules to check, and the design intents stated in review.
2. [The two languages](plan/02-the-two-languages.md): the expression language and the definition language: constructs by pointer, where syntax meets the core abstractions, whether a formal grammar exists, how the references document the grammar until it is generated from the code, and the modules to check.
3. [Settings](plan/03-settings.md): every setting, the model parameter or behaviour it controls, its default and range, and where it is documented today.
4. [Built-in functions](plan/04-built-in-functions.md): the plan for a function reference generated from structured comments beside each implementation, the functions grouped into families, and what the docs do in the interim.
5. [Concept inventory](plan/05-concept-inventory.md): sixty-three further concepts, each with its class, term mappings, pointers into both corpora, dependencies, modules and proposed owner.
6. [Coverage gaps in docs/, measured against the target](plan/06-coverage-gaps.md): what docs/ lacks against the target, with the devdocs passages the new content would derive from, and which existing pages must link to the foundation pages.
7. [Proposed docs/ outline (skeleton)](plan/07-docs-outline.md): the page skeleton for the restructured docs/ and the unified concept map pairing each concept's user-side and developer-side owners.
8. [Terminology](plan/08-terminology.md): conflicting and synonymous terms found in both corpora, with a proposed canonical term for each.
9. [Preliminary structural observations (from the docs alone; unverified)](plan/09-structural-observations.md): duplication across the corpora, links against the ownership direction, concepts without an owner, and stale passages elsewhere tagged the same way; all unverified.
10. [Audit units](plan/10-audit-units.md): twenty-six audit units in order: the core abstractions, then docs/ by target area, then devdocs/ page by page, each sized for one session.
11. [User-facing surface files (from the tree; not read)](plan/11-surface-files.md): the source files that define the parsers, the built-in registry, the unit definitions and the settings, for later mechanical coverage checks.
12. [Open questions](plan/12-open-questions.md): the owner's decisions on ownership, terminology and placement, recorded question by question; two are decided for now with later work noted.

The principle that governs the revamp, "intent, not history", is in
[principles.md](principles.md).
