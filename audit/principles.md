# Principles for the documentation revamp

Rules that govern the audit and the restructuring of `docs/` and
`devdocs/`. They live here while the revamp runs; each names the
permanent home proposed for it once the revamp lands (`audit/plan.md`,
§12, question 29).

## Documentation principle: intent, not history

Docs describe the current design and the intent behind it. Intent includes
rationale and paths considered and ruled out, wherever knowing them would
stop a future reader from re-proposing or re-litigating them.

Docs do not record how the design evolved: no chronologies, "previously X"
notes, or superseded descriptions kept for posterity. When a passage
describes a design that is no longer current, rewrite it to the current
design and keep only the intent it carries, as rationale or as a ruled-out
alternative.

Git history is the record of change; the docs are the record of intent.

*Where it is applied:* `audit/plan.md` tags each passage that describes
a superseded design "update", "keep as intent" or "drop", and every
audit unit extends the list for its pages.

*Proposed permanent home:* `devdocs/development.md#Style guide`, beside
the existing rule that a code comment names a page and a section and
never a plan, a task or a decision number, "the documentation describes
the current state, and git holds the history", which is this principle
applied to comments. `devdocs/README.md` keeps its one-sentence
statement and links to it. A `CLAUDE.md`, if one is ever added, points
at the style guide rather than restating it, since the rule binds every
contributor and not only Claude.

## Linking principle: repo-relative paths only

A link between pages, in either corpus, is a repo-relative path
(`../devdocs/numbers.md#the-types`), never an absolute URL and never a
path that names the repository, so that the docs read the same in any
clone, fork or rename. The plan's pointer convention (`file#Heading`)
materializes as such links.
