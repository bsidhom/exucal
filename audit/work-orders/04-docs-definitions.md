# Work order 04: `docs/definitions.md` (The definition language)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D2 (L167-256)` is `audit/reports/D2/fable.md`, lines 167 to 256 (D1's
report is `merged.md`). `§7` is `audit/plan/07-docs-outline.md`, `§2`
is `audit/plan/02-the-two-languages.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/definitions.md`, titled "The definition language": the
  reference for the file's format and the semantics of each definition
  kind (§7). The page exists today and is rewritten in place: its
  sections `#Expressions` and `#Names` move to `expressions.md` (work
  order 03, done before this one) and `#What the file contains` moves
  to `units.md` (work order 05, after this one), so this session
  removes the first two and leaves the third in place with one
  sentence pointing at `units.md`'s anchor until that page lands; work
  order 05 then deletes it.
- **Order.** Fourth, after `numbers.md`, `quantities.md` and
  `expressions.md`, which it links for exactness and cost, for
  conformance and conversion into a function, and for the name rules
  and the call rule. Later pages link it (`units.md`, `builtins.md`,
  getting started; the devdocs), so its headings are the anchors §7
  fixes (section 4). It links `units.md` and `builtins.md` before they
  exist, at §7's anchors in lower-case, hyphenated form (section 8).
- **Status.** Ready. D2 drafted `#The format` (D2 L167-256) and two
  pairs for `#Functions` (D2 L258-268); the rest is the page's own text,
  corrected.
- **Output.** The page, and in the pull request the choices made and any
  question for the owner.
- **Not in scope.** No code changes; the file's comments (B-057,
  B-059, B-061 to B-065) are the code track's. No message is worded for
  a definitions error today (B-029): the page names causes and fixes,
  never messages.

## 2. The reader, and what earlier pages taught

The reader has read `numbers.md` (exactness, the ceiling, the limits,
decimal mode, the dependency problem), `quantities.md` (dimensions,
kinds, conformance, how a conversion and a conversion into a function
are answered, unit lists' semantics) and `expressions.md` (how a name
is read, the operators, calls and arity, the want field). This page
teaches the file: its lines, the six kinds of definition, what the app
checks when it loads the file, and the name rules that are the file's
own. It links rather than restates: `expressions.md#names` and
`#calls-and-arity`, `quantities.md#conformance`,
`#conversion-into-a-function` and `#unit-lists`, `numbers.md#the-two-modes`,
`#identities-and-cancellation` and `#what-costs-time`.

## 3. Rules that bind the page, applied to the drafts

- **Refusal only for a size refusal (F-442); "loaded" in the docs
  (F-476).** D2's table is headed "The file is rejected when" (D2 L219)
  and its `#Functions` pair says "is rejected" (D2 L268): the docs say
  "an error", and the section is "When the file does not load" (§7,
  retitled from "Build-time checks"); "the file does not load when …";
  never "rejected", never "build" (devdocs-only, mapped once).
- **Future work is `devdocs/future.md`'s alone (Q-011).** D2's
  sentence on user definitions (D2 L253-255, with #132) becomes one
  plain sentence that only the predefined definitions file is loaded
  today, with no "intended" clause and no link (F-107, F-421); #131,
  #132 and the "wording meant" for a definitions error are not
  mentioned (F-098); the reserved `name[` form is "reserved; no form of
  it is accepted today" with nothing of what it is for (D2 L231 holds
  as "reserved for later" only if "later" says nothing of a plan: write
  "reserved").
- **The definitions file (F-475).** "The definitions file", or "the
  predefined definitions file" where a user's could be meant; never
  "the system file" or "system definitions"; the page's top (page L5-6)
  drops "how to add to it" (F-108, Q-105): "This page describes the
  file's format and how to read it; the units it defines are in
  `units.md`" (D3 L65's sentence), and `devdocs/development.md` owns
  adding a unit.
- **Inexact, not approximate (F-451).** `approx` in a body "defines a
  measured constant", a value that is inexact; no "approximate" for a
  value.
- **The words (§8).** A kind primitive is "a marker of a kind, with no
  dimension of its own", or a "kind marker" (F-093, Q-097, F-459);
  "temperature difference", never "interval" (F-483; D2 L230's "bounds
  an interval" is a range of numbers and may stay as "a range");
  "annotation", glossed "the unit it takes" (F-479); a condition's
  outcome "undecided" named once, then "holds", "fails", "cannot be
  decided"; "certainly" glosses a verdict (F-480); a call as "the body
  typed out in its place" (F-482); "fraction" reserved for the held
  value (F-456); "base unit" as §8 has it (F-465); "logarithmic levels"
  (F-485); unit names as "name", "symbol", "spelling", "alias" (F-484);
  "have" and "want" (F-471); "the converter" is not the app (F-472);
  "dimensionless" and "plain number" as synonyms (Q-019);
  `docs/builtins.md` (Q-020). `bit` is among the primitives (F-094).

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link: "The file",
"Grammar", "Primitives", "Prefixes", "Units", "Unit lists",
"Functions", "Inverses", "Names", "When the file does not load", "What
the app loads".

### The file

- Start from D2 L172-177 and L198-204: one definition per line; name,
  whitespace, body; `#` comments, which may follow a body directly;
  blank lines; indentation allowed; `\r\n` accepted; no continuation
  lines; required whitespace after a unit's or prefix's name
  (`inch2.54 cm`); any order, a unit used before it is defined, an
  inverse before its function (F-091).

### Grammar

- Prose by example for the six kinds, as D2's `#The format` text does
  (D2 L178-204); no EBNF until the generated grammar (F-092, Q-038); the
  hand-maintained line grammar is the header comment of
  `src/core/definitions.ts`, named by the devdocs, not here.

### Primitives

- `!` and `!kind`; the file declares nine primitives, the seven SI base
  units, `bit` and the kind `radian` (F-094), and why information is a
  dimension (Q-032: a count of bits must not collapse into a plain
  number, so that `bit/s` stays apart from `Hz` as `rad/s` does); a kind
  primitive is a marker of a kind with no dimension of its own (F-093);
  that the radian is the only kind is the file's choice, not the
  core's. `units.md#the-primitives` lists them with their meaning.

### Prefixes

- `name-` with a plain-number body, never `!` or a list; a prefix's
  body has neither a dimension nor a kind (F-097); prefixes are a
  namespace of their own (`m-` and `m`).

### Units

- `name body`; a one-item list is a unit; every unit is evaluated once,
  at the ceiling, in exact mode, when the file loads, and a conversion
  between units defined by exact factors is exact (F-096; the rule is
  `quantities.md#units-prefixes-and-exactness-of-factors`'s, linked);
  `approx` in a body defines a measured constant.

### Unit lists

- `name a;b;c`, two or more items; checked when the file loads: the
  units must conform, be certainly positive and decrease along the list
  at the ceiling; the name means the list only as the want (what a
  list answers is `quantities.md#unit-lists`'s; the `;` syntax of the
  want is `expressions.md#the-want-field`'s); the defined lists are
  `units.md#unit-lists-defined-in-the-file`'s.

### Functions

- The page's `#Functions`, corrected: parameters, annotations (unit
  expressions only, `1` for a plain number; `: 2` or `: 1000 m` "would
  read as a scale that it does not apply, and is an error; write the
  scale in the body", D2 L268 under F-442; F-098), the result
  annotation and the inferred dimension (F-097), conditions (chains one
  way, comma-separated, mentioning a parameter, sides conforming; an
  undecided guard and a later term that cannot be computed, with A6's
  `guarded` example, F-101, Q-090; the three-valued check stated in one
  line with its rationale and a link to `numbers.md#comparison-and-equality`,
  the verdict table and the retry mechanics being the devdocs', F-100),
  the body; exactness and cost: a body is evaluated afresh at every
  call, at the pass's precision; calls are not memoized; the dependency
  problem and a hand-written formula against a built-in are stated as
  one user sentence with links to `numbers.md#identities-and-cancellation`
  (F-033, Q-107; the examples live where work order 01's session put
  them); decimal mode rounds each step of a body (link
  `numbers.md#the-two-modes`); the running example is renamed from
  `dozen`, a unit of the file, to `twelve` or to a fresh example that
  collides with nothing (F-099, Q-015), and `devdocs/functions.md` uses
  the same name (work order 14); a body is checked against a built-in's
  dimension rule when the file loads (`f(x) = sin(x)` does not load;
  `f(x: radian) = sin(x)` does; F-106). The call rule and the arity
  error are `expressions.md#calls-and-arity`'s, linked (F-095, Q-106).

### Inverses

- `~name(p) = body`, one-parameter functions only, optional, may
  precede its function; its parameter takes the function's result
  dimension; an inverse's conditions restrict what converts into its
  function, and the function is reapplied and a value certainly other
  than the have is an error (the two sentences stay, F-102); the full
  sequence is `quantities.md#conversion-into-a-function`'s, linked.

### Names

- The file's own rules, once (F-079, F-103, F-104): one set of names
  for units, lists, functions and built-ins, so a name is defined once
  in its set and `sqrt(x) = x` is a duplicate (the prohibition, not a
  precedence: Q-113); prefixes have a set of their own; a list's or a
  function's name may not read as a prefix followed by a unit (`ms
  hr;min;s`), because the have and the want would read one text two
  ways (A9 L197-205 and D1 L267-271 both draft the list clause; D2
  L212-216 and D1 L260-262 both draft the shared-set sentence: keep one
  of each); an ambiguous name is an error when the file loads, not a
  resolved ambiguity; shadowing: a parameter may be named like a unit
  and hides it in the body, not like a unit its own head's annotations
  name; duplicate parameters. How a name is read in an expression is
  `expressions.md#names`'s, linked.

### When the file does not load

- D2's 28-row user table (D2 L219-248), headed "The file does not load
  when / Example / What to write instead" (F-105, F-442, F-476), with
  the built-in dimension rule row (D2 L245; F-106); this table is the
  one list, which the devdocs point at (Q-031). Causes and fixes only;
  no message is worded for these errors today, and the page says
  nothing of messages (B-029).

### What the app loads

- One plain sentence: the app loads the predefined definitions file,
  `src/units.txt`, and nothing else (F-107, Q-011, F-475); nothing of
  user definitions to come.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-091 | The file | D2's line-level facts |
| F-092 | Grammar | Prose by example; no EBNF (Q-038) |
| F-093 | Primitives | "a marker of a kind, with no dimension of its own" (Q-097, F-459) |
| F-094 | Primitives | Nine primitives, `bit` included, with the reason (Q-032) |
| F-095 | Functions | The call rule lives in `expressions.md`; link (Q-106) |
| F-096 | Units, Functions | D2's exactness list; "the definitions file"; cost and decimal mode per F-033 |
| F-097 | Functions, Prefixes | D2's dimension list |
| F-098 | Functions | "is an error" (F-442); nothing of #132 or a wording to come (Q-011) |
| F-099 | Functions | The example renamed (Q-015); one name on both pages |
| F-100 | Functions | One line and a link; the verdict table stays in devdocs |
| F-101 | Functions | One sentence and A6's `guarded` example (Q-090, Q-024) |
| F-102 | Inverses | The two sentences stay; the sequence is `quantities.md`'s |
| F-103 | Names | Lists named beside functions |
| F-104 | Names | The shared set stated once, here |
| F-105 | When the file does not load | D2's table, retitled (Q-031, F-442, F-476); no messages (Q-011) |
| F-106 | When the file does not load | D2's row; the rule stated |
| F-107 | What the app loads | One plain sentence; no link, no "intended" (Q-011, F-475, F-421) |
| F-108 | (top) | "How to add to it" dropped; `units.md` named (Q-105, F-475) |

Owned elsewhere and read here: F-033, F-035, F-036, F-045, F-063 (the
cost and decimal-mode facts are `numbers.md`'s; this page links them),
F-079 and F-090 (the name rules split with `expressions.md`), F-114
(the catalogue leaves for `units.md`), F-323 (`devdocs/functions.md`
links this page's sections in work order 14), F-421, F-442, F-456,
F-459, F-465, F-471, F-472, F-476, F-479, F-480, F-482, F-483, F-484,
F-485.

## 6. Decisions followed, and still open

Followed: Q-011, Q-015 (B: `twelve`, or a fresh example), Q-019, Q-020,
Q-024 and Q-090 (the undecided guard), Q-031 (the docs table is the one
list), Q-032, Q-038, Q-085 (the measured factors are `units.md`'s),
Q-087, Q-089, Q-097, Q-105, Q-106, Q-107, Q-113; the rules F-442,
F-451, F-456, F-459, F-465, F-471, F-472, F-475, F-476, F-479, F-480,
F-482, F-483, F-484, F-485.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| (top) | D3 L313-319; A9 L37; D1 L219-237 | D3's sentence (the contents are `units.md`'s); "how to add to it" dropped | "the definitions file" |
| The file, Grammar, Primitives, Prefixes, Units, Unit lists, Names | D2 L167-256 | the text, mapped onto §7's headings | `bit` added to the primitives; the kind gloss (F-459); "the file does not load when" for "rejected" (L219); "reserved" without "for later" (L231); L253-255 reduced to the plain sentence, #132 gone; the shared-names sentence kept once (against D1 L260-262); "a range" for "an interval" (L230) |
| Functions | D2 L258-268 | the two pairs | "is an error" for "is rejected" (L268); the renamed example; the call-rule pointer added (D1's question 6) |
| Names (the list clause) | A9 L197-205; D1 L267-271 | one of the two | — |
| Functions (the cost paragraph) | D8 L154-160; V4 L434-441 | the split Q-107 fixes: one user statement with links here | — |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
1, forward links, confirmed as the rule (this page links `units.md` and `builtins.md` at §7's
anchors). Nothing else touches this page. The session records in its
pull request the running example's new name (which `devdocs/functions.md`
then uses, work order 14) and which of the two drafts of the shared-names
sentence it kept.

## 9. Code changes it waits on

None. The file's comments (B-057, B-059, B-061 to B-065) and the test's
failure message (B-032) are the code track's batch 3 and do not change
the page. No message is worded for a definitions error (B-029); the
page quotes none.

## 10. Done when

- Every section of section 4 exists under its heading, in order; the
  sections `#Expressions` and `#Names` are gone (their content is
  `expressions.md`'s) and `#What the file contains` carries one sentence
  pointing at `units.md#the-primitives` until work order 05 deletes it.
- No "rejected", no "build" for loading, no "interval" for a
  temperature unit, no "dimensionless marker", no "system file", no
  issue number, nothing of user definitions to come, no `docs/functions.md`.
- Every link is a repo-relative path to an existing page or to a §7
  anchor of `units.md` or `builtins.md`.
- The pull request names the choices made and any question for the
  owner, and changes nothing outside this file.
