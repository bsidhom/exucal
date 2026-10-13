# Principles for the documentation revamp

Rules that govern the audit and the restructuring of `docs/` and
`devdocs/`. They live here while the revamp runs; each names the
permanent home once the revamp lands, decided in `audit/plan.md`, §12,
question 29.

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

*Permanent home:* `devdocs/development.md#Style guide`, beside
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

## Markdown principle: a small, stable subset

The documents useful to a user are to ship with the app, rendered from
Markdown to HTML by a homegrown parser and generator rather than by a
dependency (`audit/plan/12-open-questions.md`, question 31). So the
pages are written in a small subset of Markdown that such a renderer
can carry: headings, paragraphs, bulleted and numbered lists, emphasis,
inline code, fenced code blocks (the diagrams drawn in them included),
tables, and inline links written `[text](target)`, whose target is a
repo-relative path between pages and an absolute URL only for an
external reference such as an issue. Not in the subset: raw HTML,
reference-style link definitions (`[110]: https://…`) and the footnote
syntax, and nested constructs a renderer would have to special-case. A
page that needs more is a design question for the renderer, not a
reason to write past the subset. The subset is fixed when the renderer
is designed; until then, writing within it costs nothing and keeps the
door open. The audit units rewrite what lies outside it as they reach
each page, the reference-style issue links first.

## Rules from the owner's decisions that bind every page

Set by the owner's answers to the audit (`audit/decisions.md`, recorded
in `audit/plan/12-open-questions.md`, sections 12.1 to 12.3), on
2026-10-12 and 2026-10-13.
Each binds every page of both corpora from now on, whatever an earlier
plan passage, finding or draft says; each page's work order applies
them to its drafts. The owner's own words are in the record under the
item named.

**Future work (Q-011, with Q-013, Q-014, Q-035 and Q-104).** Anything
not implemented today that might be implemented later is described in
`devdocs/future.md`, with its issue links, and nowhere else: the user
docs never mention it, and a devdocs page that needs to say something
is planned links `future.md` rather than describing it. What is ruled
out by intent is not future work but a current design decision, so it
lives in the as-is pages: one sentence where a user would look for it
in `docs/` (for example, that the app never shows the error radius),
and the reason in the devdocs page that owns the concept. A user page
may state what the app lacks today as a plain fact, with what to write
instead, but never as something to come. Bugs and performance problems
in today's behaviour are not future work: their issue links stay with
the passage that owns the concept (Q-012: the cost and hang issues in
`devdocs/cost.md`, the Bernoulli memo's in `devdocs/builtins.md`; #198,
#199 and #200, opened for three gaps the devdocs state as today's
behaviour, each beside its gap, plan §12.3, R-3). So
#130 to #134, #118 with #119 to #121, #98 and #100 are linked from
`future.md` only. Where it was unclear whether an item is ruled out or
might still be done, the owner was asked (the list at the end of
`audit/decisions.md`) and answered on 2026-10-12 (plan §12.2): #78, #171,
#173, #178, #167 and #186 are future work, linked from `future.md`
only; #115, #172, #110, #112, #114 and #179 stay with the passages
that own them; the ruled-out bullets of `future.md` move to the pages
that own their concepts. The answers to the review of the apply step
(plan §12.3) add two: `!=` in conditions is future work with the
equality operators (R-5), and "real values only" is a plain fact about
today, complex numbers being future work (R-7). One question is open
(plan §12.3, R-7): whether the error radius's display, too, might
change; until the owner answers, it stays ruled out by intent, as item
13 classified it.

**Inexact, not approximate (F-451).** "Inexact" names a value with a
nonzero radius, everywhere, headings included ("Exact and inexact
values", "which units are inexact", "the digits an inexact value is
kept to"). "Approximate" and its variants are reserved for the act of
making a value inexact (`approx`; "approximating a value") and are
never the adjective of a value.

**The settings panel (F-488).** What the user opens is "the settings
panel", or "the panel", in both corpora; never "sheet", which is only
today's visual design.

**The definitions file (F-475).** `src/units.txt` is "the definitions
file", or "the predefined definitions file" where a user's definitions
could be meant; never "the system file", "system definitions" or
"system" alone, which names only a system of units. The table built
from the file is "the definitions table", or "the table built from the
definitions file", never "the system table" in prose (conflict 3 of the
owner's list, answered). Code identifiers (`src/system-table.ts`,
`buildSystemTable`) are quoted as they are.

**Which numbers the pages keep (Q-016, Q-018, Q-088).** The user docs
carry no timing, run count or measured ratio: qualitative descriptions
and warnings only (question 9), a rough duration among them where it
warns. The devdocs keep the code's and the tools' constants, the model
figures the thresholds derive from, the counts that describe an
algorithm (terms, bits, convergents), memory sizes, measured ratios and
machine-portable heuristics, and rough timings and durations where they
clarify an issue or add weight to a decision, each marked as rough and
illustrative and worded broad and generous so that it does not drift;
a figure that does none of that leaves for the benchmarks and the
stress tools. An item's own answer (Q-017) wins over this rule for its
passage.

**Refusal (F-442).** In both corpora "refusal" and "refuse" name only a
size refusal: the significand limit's or the exponent bound's, a value
the limits keep from being computed or a literal past a size limit. A
literal past the hard bound or the exponent bound is a size refusal as
it is typed, in both corpora; past the exponent bound it is the same
refusal, `overflow`, as a computed value past it (plan §12.3, R-4). In
the docs everything else is "an error", and text the grammar does not
read is "an error as it is typed". The devdocs keep "rejection" and
"rejected" as the distinct notion for text rejected for its form and
for the definitions-line faults, name the code's `Rejection` as it is,
and never say "refuse" for a domain error, an edge or a mismatch. The settings
panel's lines that decline an edit are not refusals either: the docs
say the panel "does not accept" an edit, or that a value is "held to"
its range, and the devdocs keep "refusal" there only as the code's
identifier, `refusalOf` (conflict 8 of the owner's list, answered).

**Topological order (Q-008).** The pages are written in topological
order, each after the pages it depends on: the user pages first
(numbers, quantities, expressions, definitions, units, settings, the
built-ins, the app, the index), getting started last, and every
devdocs page in one pass after the user pages it links exist, so that
no link dangles and no page is edited twice. Where two user pages link
each other, the page written first links the later one at the anchor
the §7 outline fixes, and the later page keeps that heading (confirmed
by the owner on 2026-10-12). The work orders under `audit/work-orders/`
are numbered in that order.

**`docs/builtins.md` (Q-020's note).** The user page on the built-in
functions is `docs/builtins.md`, titled "Built-in functions", matching
`devdocs/builtins.md`; every link to the old name `docs/functions.md`
follows, and "functions.md" then names only `devdocs/functions.md`,
"Defined functions".

Two further answers reach every page and are recorded in plan §8: the
synonyms "dimensionless" and "plain number", with "kind" wherever
semantics attach (Q-019); and "build ID", "the service worker", "a new
version" and "update" as the app's words (Q-022, F-493, F-494), where
"update" is a verb in prose and headings and labels keep the noun
("Updates and the build ID", "Update checks"; plan §12.3, R-8).
