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
each page, the reference-style issue links first. An inline construct,
a code span, a link or an emphasis, is written within one line and
never broken across a line ending; the line is re-broken around it
instead. CommonMark joins the lines of a code span, but a viewer that
reads line by line does not, and the subset the renderer will carry
need not (the review of 2026-10-16; plan §12.3).

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
lives in the as-is pages: on the user page that owns the concept, where
a user would look for it, with its reason as far as a user needs it
(that a temperature reading is a function, not a unit with an offset,
since every operation would need a rule for an offset), and on the
devdocs page that owns the concept with the mechanism and the
alternatives considered (the rule below on the canonical home of a
shared concept, the owner, 2026-10-16; until then the user page had one
sentence and the devdocs the reason). A user page
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
that own their concepts, all but the radius display's. The answers to
the review of the apply step (plan §12.3) add three: `!=` in
conditions is future work with the equality operators (R-5); "real
values only" is a plain fact about today, complex numbers being future
work (R-7); and that the app never shows the error radius is a plain
fact about today's display, neither ruled out by intent nor future work
(R-7, as the owner clarified it, correcting the example the owner's
Q-011 text gave). Not everything the app lacks is one or the other: a
plain fact about today is described as it is, with no reason given as
for a design decision and no entry in `future.md`. Nothing is
pending.

**The canonical home of a shared concept (the owner, 2026-10-16; plan
§12.3).** Anything a user should reasonably be expected to understand
appears in the user docs, and a concept relevant and essential to both
users and developers has its canonical home there: the user page that
owns the concept states the rules and the design decisions behind them,
with their reasons as far as a user needs them, and the developer page
that owns the concept keeps the mechanism, the alternatives considered
with their reasons, and the reasons that belong to the implementation,
linking the user page rather than restating it. A reason a user needs
is never left to the developer docs alone. §7.1 and the work orders of
the developer pages follow.

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

**The canonical form and the predictable display (F-439, amended by
the owner on 2026-10-13; plan §12.3).** The one form a value is held in
is a user-level concept, core to the number type and to the
predictability a user relies on. `docs/numbers.md` names the canonical
form once, glossed in plain words (in lowest terms, with every power of
ten in the exponent and the denominator coprime to ten, that is, with
no factor of two or five), says why a value has exactly one, and draws
the consequences: equal values are held alike, compared part by part,
and cost the same whatever route produced them; and what is written is
likewise a function of the value, its exactness and the settings, never
of the route. "Canonical" is a word of both corpora, glossed once per
page where used; the devdocs keep the mechanism, the formal argument
and its implementation.

**Narrative pages and typed examples (the owner, 2026-10-14; plan
§12.3).** A user page is written to on-board a technical reader new to
the project, and reads as a narrative, as technical docs do: an
introduction that says what the page's concepts are and why their
semantics matter, a summary of the rules the page explains, each
linking its section, a lead-in at each section that says what question
it answers, sub-headings inside long sections (which no page links, the
outline's headings being the anchors), and examples set apart, in a
table, as a user types them and never as the display writes them,
since the display's text cannot be typed back, with the result the
calculator shows beside. Defined terms are bold once, where defined,
and only the terminology's terms. No filler, and no reserved word used
loosely. Style, from the review of 2026-10-14 and binding every page:
items of a list that themselves contain commas are separated by
semicolons, and an enumeration whose items each carry a qualifier of
their own is set as a list rather than run into a sentence, unless the
flow needs it inline (the review of 2026-10-16); an active construction wherever it simplifies or
clarifies; as concise as stays clear; a word a page leans on, such as
"line", is defined at its first use ("an output line"); a list of
built-ins on any page but the built-ins page is examples, never an
inventory, since each built-in's entry documents its own exactness;
and `approx` is always called out as the one operation whose purpose
is to make a value inexact. A page reads linearly: no term is used before the page defines it,
and no passage asks the reader to jump ahead or read twice. Few clauses set off by commas as asides; no fragment that leaves the
reader to supply its subject and verb ("only its exponent counted"),
a second sentence instead, and no clause of a pair that leaves out its
verb for the reader to carry over ("how many bits its numerator may
have, and how many its denominator"), the verb repeated so that the
two read in parallel ("how many bits its numerator may have and how
many bits its denominator may have"; the review of 2026-10-16); and no cleft sentence ("what the precision
limit limits is effort"), the plain subject and verb instead ("the
precision limit limits effort"). From the review of 2026-10-16: no
sentence opens with a what-clause as its subject ("What is written is
as fixed as what is held", "What costs time is passes and bits"), which
inverts the order and hides the subject, and none takes the form "X is
what lets Y" ("the limit is what makes `3^1000000000` a refusal"): the
thing itself is named first, with the plain verb ("Two things cost
time, passes and bits"; "the limit makes `3^1000000000` a refusal"). `docs/numbers.md` names the numeric types `Rational`,
`Scaled`, `Radius` and `Ball` and says how they compose. From the
review of the quantities page (2026-10-16): a page states its rules as
the subject's ("A quantity follows these rules"), never as what "this
page" does; no page is called earlier or later than another, and
nothing exposes the order in which the pages were written, since each
page stands on its own; a statement that stands on its own gets a
sentence of its own, a hard break rather than a semicolon, since a long
sentence and an implied connective between its parts are hard to hold;
the actor comes first ("a function does not change the underlying
units of its declared parameters", not "the unit a function declares
changes no value"); the simpler phrase wins even when it is passive
("is read the same way a typed number is"), since complex phrasing
costs more than a passive verb; an enumeration implies no
exhaustiveness it does not have (", etc.", or the exhaustive list); a
fact of the current definitions file that may drift (the radian as the
only kind) is presented as an example, never as the state of things;
no quaint voice ("the other way round"); clauses a reader must scan,
as in a summary's bullet, are set as a list; an error a reader might
not expect (a unit list whose units do not decrease) is called out
where its rule is summarized; a concrete type is named where it makes
a representation clearer (a value is a `Ball`); and the value a
quantity pairs with its dimension is its "scalar", never its
"magnitude" (§8). From the page's second review (2026-10-17): a
section starts by describing its subject, and no lead-in restates its
title or announces what "this section says"; self-references ("this
page", "this section", "this list") are minimized, since describing
the thing itself flows better and runs shorter; a sentence that tells
the reader what they need or will meet ("you need the semantics", "you
meet the angle in the built-ins") is filler and is cut; a sentence
runs to about twenty words with one idea, and one that needs both a
colon and a semicolon is split; no idiom stands for a literal relation
("as much as" keeps its literal sense); "dimensionless" is the default
word for a quantity with neither dimension nor kind and "plain number"
its synonym, as Q-019 already prefers, and the words the messages use
are not cited, since the messages may change; and "scalar" is the word
in all documentation, user docs and devdocs alike. From the page's
third review (2026-10-17): the shape of a bulleted list follows its
items, as the owner then put it: where the list is long or an item is
a description with sentence structure of its own, each item is a
sentence with a full stop, since items joined by semicolons are harder
to read than they need to be; items that are single words or simple
objects stand on their own without sentence structure; and a short list
meant to be read inline may run one sentence across its items,
sparingly and tastefully, full stops being the choice in doubt; a
conversion
"answers with" a ratio, a sum or a call, the form of the answer; the
places where conformance is required are listed as pairs of quantities
and never as "one check", since a user meets several checks whatever
the engine does; a borrowed term is introduced as ours with its source
credited, never as a description of the other program; a fact of the
definitions file is never given as a complete list, since the file
drifts; and an example that stands for a pattern carries the pattern's
reason, as the body-mass index carries why a scale fitted to fixed
units gives a dimensionless result. The style
rules of this paragraph are collected, as the house style every run of
the rewrite reads, in `.claude/skills/prose-style/SKILL.md`; this
paragraph records where each came from, and a rule set later is added
in both places.

**The goals, in priority order, and where each is stated (the owner,
2026-10-14; plan §12.3).** Three goals have guided the design. The
pages state them in the wording below, which is the plan's statement
of them, and not in the review's shorthand, which leaned on its
context (plan §12.3 keeps the shorthand as the record).

1. **Exact calculation, explicit about inexactness.** A result that
   can be exact is the exact value, held as a fraction and never
   rounded. Where a value cannot be exact, because an inexact function
   was called or the user asked for an approximation, the calculator
   shows only the digits it has certified, marks the result inexact,
   and says in a note or a message what it could not certify, decide
   or hold, rather than showing a digit it has not checked. The
   calculator runs in a portable format, as JavaScript in the browser,
   installed from a web page and working offline.
2. **The functions a calculator is used for, under the same
   guarantee.** All the elementary functions, and the special functions
   that matter most in combinatorics, probability and physics, each
   exact in its exact cases and certified otherwise. That the set is to
   grow toward a more complete coverage of the special functions is
   future work, `devdocs/future.md`'s alone (Q-011).
3. **Calculation and conversion aware of units and kinds.** A quantity
   carries its dimension, and its kind where it has one, through every
   operation and conversion, so that a result has the unit it should,
   a conversion is exact where the definitions are, and a mismatch of
   dimension or kind is an error and never a number. A kind is a
   marker that keeps apart quantities which would otherwise look
   alike, as the radian keeps a revolution per second from a cycle per
   second; `docs/quantities.md` defines it, and a page that names
   kinds before that page is read glosses the word in a clause or
   says "units" alone.

This list fixes what the goals mean; it is not prose for a page, and
its readers are the sessions that write the pages, never the pages'
readers. A human-facing page states the goals in its own sentences,
written for its reader as the narrative rule requires, matching this
substance and copying nothing from here or from the review's
shorthand. The design is described as guided by them in that order,
never as forced by them: the numeric types and the evaluator's passes
serve the first two, and unit awareness and kind checking stand beside
them. The three are
stated in order where a page says what the app is: in brief in
`docs/README.md`'s two sentences and the root `README.md`'s three, and
in full in `devdocs/architecture.md`'s first paragraph. Every other
opening states, in a sentence, the goal its page serves:
`docs/numbers.md` the first two, as they guided the design, and
nothing of the third, which is orthogonal to the numeric model;
`docs/builtins.md` the second, as the aim of today's set;
`docs/quantities.md` what unit awareness brings, without placing it
among the goals (the review of 2026-10-16); `docs/getting-started.md` the first,
the tour then showing the other two; `docs/app.md` the portable
format. No page calls a goal unique to Exucal: other calculators share
parts of the first (plan §12.3 names three, checked against their
documentation), and they are named only in `docs/numbers.md`'s first
section, "Comparison with other approaches", short, set apart from the
introduction and linking each to its own site, and in
`devdocs/numbers.md`'s opening, which carries the comparison as
rationale. That the app began as a units conversion utility is
history, not intent, and no page says it; the devdocs keep GNU units
as lineage in one clause (Q-039).

Two further answers reach every page and are recorded in plan §8: the
synonyms "dimensionless" and "plain number", with "kind" wherever
semantics attach (Q-019); and "build ID", "the service worker", "a new
version" and "update" as the app's words (Q-022, F-493, F-494), where
"update" is a verb in prose and headings and labels keep the noun
("Updates and the build ID", "Update checks"; plan §12.3, R-8).
