# Work order 03: `docs/expressions.md` (The expression language)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D1 (L287-485)` is `audit/reports/D1/merged.md`, lines 287 to 485 (D1's
report is `merged.md`; every other unit's is `fable.md`). `§7` is
`audit/plan/07-docs-outline.md`, `§2` is
`audit/plan/02-the-two-languages.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/expressions.md`, titled "The expression language": the
  reference for the syntax and semantics of what is typed into either
  field (§7).
- **Order.** Third, after `numbers.md` and `quantities.md`, which it
  links for exactness and the literal limits, for conformance and for
  what a conversion answers. Later pages link it (`definitions.md` for
  the name rules and the call rule, `units.md`, `builtins.md`,
  `app.md`, getting started), so its headings are the anchors §7 fixes
  (section 4). It links `definitions.md`, `units.md`, `builtins.md` and
  `app.md` before they exist, at §7's anchors in lower-case, hyphenated
  form (the rule of `audit/principles.md`, confirmed; section 8).
- **Status.** Ready. D1 drafted the whole page as replacement text for
  `docs/definitions.md#Expressions` and `#Names`, "written to move into
  `docs/expressions.md`" (D1 L239-285, L287-485); the page is assembled
  from it under §7's sections.
- **Output.** The page, and in the pull request the choices made and any
  question for the owner.
- **Not in scope.** `docs/definitions.md#Expressions` and `#Names` are
  removed by work order 04 once this page exists; this session does not
  touch them. No code changes; the parse labels (B-019) change later.

## 2. The reader, and what earlier pages taught

The reader has read `numbers.md` and `quantities.md`: they know what
exactness, digits, the size limits and the written form of a number
are, and what a quantity, a dimension, a kind, conformance and a
conversion are. This page teaches none of that; it links
`numbers.md#values-too-big-to-hold` (the literal limits),
`numbers.md#exact-and-inexact-values` ("read exactly"),
`numbers.md#how-numbers-are-written` (the printed form of a number and a
ratio), `quantities.md#conformance` ("must conform"),
`quantities.md#how-a-conversion-is-answered`, `#unit-lists` and
`#conversion-into-a-function` (what each reading of the want answers).
The reader has not read the definition language or the units
catalogue: the file's own rules (a name defined twice, a list's or a
function's name that would read as a prefixed unit) are
`definitions.md#names`'s, and which names exist is `units.md`'s.

## 3. Rules that bind the page, applied to D1's draft

- **Refusal only for a size refusal (F-442).** Text the grammar does
  not read, an unmatched character: "an error as it is typed", never
  "rejected" (D1's text says "rejected as it is typed"; F-089, F-090).
  A literal past the hard bound or the exponent bound is a size
  refusal, "refused as it is typed", never "a rejected literal" (R-4 of
  the review, plan §12.3: past the exponent bound it is the bound's own
  refusal, as a computed value past it is). A literal past the
  significand limit at evaluation, a sum, product or quotient past a
  limit: "refused" (D1 L321, L371, L442 hold).
- **Inexact, not approximate (F-451).** Nothing in D1's draft needs it;
  hold any addition to it.
- **Future work is `devdocs/future.md`'s alone (Q-011).** "What is not
  accepted" lists `×`, `÷`, `·`, `²`, `≤`, `≥`, `=`, `<`, `>`, `#`, `[`,
  `|`, `~`, `:` and a typographic minus as errors with what to type
  instead, and says nothing of what may come (D1's question 4 is
  `future.md`'s, Q-037); the `^` against `pow` difference is stated
  without #88 (F-081, Q-102); no issue is named; nothing of a grammar
  to be generated.
- **The words (§8).** "Pastes back", never "reads back" (D1 L449, L458,
  L485; F-457); "how the app writes an expression back", never
  "canonical form" (D1 L449; F-439); "the definitions file" (F-475);
  "number" for what the user types, "literal" devdocs-only (F-473);
  "juxtaposition" and "negation" as §8 has them (F-473); "conform",
  glossed once, with a link (F-462); "a name" for what the parser
  labels "a unit name" today (Q-055; the page quotes no message that
  carries the old label); "the most the significand limit can be set
  to", never "the hard bound" (F-441); "have" and "want" (F-471);
  `docs/builtins.md` for the built-in functions page (Q-020). GNU units
  is not named unless Q-039's answer, read at its id, asks for a
  clause here (§5 C60 names it only where a similarity helps).
- **Messages (Q-007; §12 question 6).** The page says how an error reads
  in general and quotes two or three as examples; the catalogue of
  parse and evaluation errors is generated from `src/messages.ts` by
  the docs tool later, so the appendix §7 names is not written by hand
  (F-089): nothing hand-written meanwhile.
- **Markdown (principles).** The precedence table is a table; no
  reference-style links; every link repo-relative.

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link: "Grammar and
precedence", "Numbers", "Names", "Operators", "Calls and arity", "The
have field", "The want field", "Evaluation order and error locations",
"What the app writes back", "Pitfalls", "What is not accepted",
"Errors". D1's draft maps onto them as noted; its own subsection names
give way to these.

### Grammar and precedence

- Start from D1's precedence table and prose (D1 L300-310), six levels
  loosest first (`;` in the want only; `+ -`; `* /`; one `-` before a
  product; juxtaposition, a number only first; one `^` with a literal
  exponent; atoms), with worked examples; no hand-written EBNF (F-074,
  Q-038; the hand-maintained grammar is the header comment of
  `src/core/expr.ts`, which the devdocs name and the user page does
  not).

### Numbers

- Start from D1 L312-319 (the literal forms: `5.`, `1E3`, `2E+2`; no
  space inside a literal; the exponent belongs to the literal only
  without a space and with digits, so `2e -19 C` is `2 e - 19 C`;
  F-075) and D1 L320-331 (the literal limits, F-076): a literal past
  the most the significand limit can be set to, or past the exponent
  bound, is refused as it is typed, a size refusal (R-4); a literal
  past the significand limit as set is refused when the expression is
  evaluated, in either mode (Q-040); "read exactly" and the size
  refusals link `numbers.md`.

### Names

- Start from D1 L239-285 (the complete `#Names` text): a letter of any
  script or an underscore, then letters of any script, the digits `0`
  to `9` and underscores (F-077, Q-087); longest match, case-sensitive;
  exact unit, else one prefix followed by a unit, an exact name always
  winning (`min`); prefixes do not stack; prefixes and units are
  separate namespaces (`m-` and `m`); a parameter's name before any
  unit of that name inside a body; call names exact, no prefix on a
  function (`ktempC(1)`); a function's or a list's name is not a unit
  (`tempC` in the have shows the call form; `time` there is an unknown
  unit); a name has one meaning (F-079). The `ha` example goes, and
  nothing is said of a unit `a` (F-078). A defined function may not
  take a built-in's name: that is a prohibition when the file loads,
  not a precedence at the call (Q-113, F-079). The load-time checks
  (one set of names for units, lists, functions and built-ins, no list
  or function name readable as a prefixed unit, the ambiguity error)
  are `definitions.md#names`'s, linked, stated once there and not here
  (F-079, F-104; D1 L260-262 and L271-272 are left to that page). The
  names that are absent or mean something else (`u`, `at`, `dB`, `e`,
  `rad`) are `units.md#names-that-are-absent-or-mean-something-else`'s,
  linked (Q-075).

### Operators

- Start from D1's operator bullets (D1 L332-371): juxtaposition, `* /`,
  `+ -`, unary `-` with its exceptions ("there is no unary `+`: `+2` is
  an error; a `+` sign is accepted only in a literal's exponent and as
  the sign of a `^` exponent", F-080), `^` with a literal exponent and
  the forms and limits of that exponent (one exponent per factor, a
  signed literal or a parenthesized rational, `m^(2)` allowed,
  `m^(1/-2)` an error, a zero divisor an error as typed, the fraction
  formed within the significand limit at evaluation, so `2^1e-30000` is
  refused where `pow(2, 1e-30000)` is `≈ 1`, with no issue; F-081),
  parentheses.

### Calls and arity

- Start from D1 L375-385 and L443-444: a name immediately followed by
  `(`; the space matters (`kg(m/s)` is a call, `kg (m/s)` a product);
  each function takes a fixed count of arguments or, for some
  built-ins, a range (`round(x)` and `round(x, places)`; `pi()` takes
  none), a call with another count being an error that says how many,
  reported before any argument is computed (F-082). This is the one
  place the call rule lives (F-095, Q-106): `definitions.md#functions`
  links it.

### The have field

- Start from D1 L404-428 ("The two fields"): the have is one
  expression; a failure of the have is reported before one of the want,
  even before a want that does not parse (F-083). Which field an error
  marks on the screen is `app.md#the-two-fields`'s (F-179), linked.

### The want field

- Start from D1 L404-424: blank; a bare name that is a list; a bare
  name that is a function; any other single expression, a unit
  expression that may carry a magnitude; two or more `;`-separated
  items, a typed list; a call is an ordinary expression; the empty item
  (`ft;`, `;in`, `ft;;in`) is an error; `;` never stands in parentheses
  (F-084). What each reading answers is `quantities.md`'s
  (`#how-a-conversion-is-answered`, `#unit-lists`,
  `#conversion-into-a-function`), linked.

### Evaluation order and error locations

- Start from D1 L426-444 ("When an expression fails"): operands left to
  right, the first failure ends it; where an error points (the
  divisor; the base or the whole power; the whole sum, product or
  quotient refused for size; the literal; the argument); the have's
  error before the want's (F-085, F-083). `devdocs/architecture.md`
  links this section in its own rewrite (work order 13).

### What the app writes back

- Start from D1 L446-458: one space between juxtaposed factors and
  around the other operators, `^` and a quotient of two literals tight,
  arguments joined by `, `, literals and exponents as typed, the fewest
  parentheses that read the tree back, `×` on screen for a product
  written with `*` while the copy text has `*`; what the copy button
  copies pastes back, while text selected on the screen may not
  (F-086); the principle that every result pastes back is
  `numbers.md#how-numbers-are-written`'s, linked (§12 question 11).

### Pitfalls

- Start from D1 L460-482 ("Readings to watch"): `1/12 year` (a
  frequency); `1/2 in` is `1/(2 in)`, unlike `(1/2) in` and `0.5 in`,
  the edge Q-003 asks the docs to state plainly (`numbers.md` states it
  for the written ratio; this page for what is typed); `m^1/2` is
  `(m^1) / 2`; `-2^2` is `-4`; `2^3^2` and `5 ft 3 in` are errors;
  `2e -19 C` reads as `2 e - 19 C`; `kg(m/s)` is a call and `tempC (1)`
  a product; `pi ()` is an error; `m2` is a name; `1 dB` is `d` + `B`
  and `1 at` is `a` + `t` (F-087, Q-075); `1 m in ft` typed as the have
  is a volume.

### What is not accepted

- Start from D1 L386-402: whitespace is spaces and tabs, allowed before
  and after the expression, no newline; none of the typographic
  characters is accepted, each an error as it is typed where it
  stands, with what to type instead (`*` for `×`, `/` for `÷`, `^2` for
  `²`, `-` for a typographic minus); `#` starts no comment in an
  expression; comparisons, `=`, `|`, `~`, `:` and `[` belong to the
  definitions file's lines or to nothing (F-088); nothing of what may
  come (Q-037, Q-011).

### Errors

- One paragraph from D1 L426-444: how an error reads in general
  (`Unexpected end of input: expected …`, `Unexpected "c": expected …`,
  the labels of what was tried furthest; a literal that is an error as
  typed quoted with its reason; `3 m ^` as the one example), with no
  catalogue, which the docs tool generates later (F-089); no message
  quoted that carries the label "a unit name" (B-019, Q-055).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-074 | Grammar and precedence | Prose, D1's table and examples; no hand-written EBNF (Q-038, F-500) |
| F-075 | Numbers | D1's literal forms |
| F-076 | Numbers | D1's literal limits, each a size refusal, the hard bound's and the exponent bound's as the literal is typed (F-442, R-4); "the most the limit can be set to" (F-441) |
| F-077 | Names | Letters of any script, the digits `0` to `9` (Q-087) |
| F-078 | Names | The `ha` example goes; nothing of a unit `a` |
| F-079 | Names | D1's reading rules here; the load-time checks in `definitions.md`; one shared-names sentence, there (Q-113) |
| F-080 | Operators | No unary `+`, with the two exceptions |
| F-081 | Operators | The `^` exponent's forms and limits; `^` against `pow` without the issue (Q-102) |
| F-082 | Calls and arity | A count or a range; the arity error first |
| F-083 | The have field | Two grammars; the have's error first |
| F-084 | The want field | The readings; what each answers is `quantities.md`'s, linked |
| F-085 | Evaluation order and error locations | D1's text; the devdocs link it later (Q-008) |
| F-086 | What the app writes back | D1's text; "pastes back" (F-457); no "canonical" (F-439) |
| F-087 | Pitfalls | D1's readings to watch, with the `1/2 in` edge (Q-003) |
| F-088 | What is not accepted | D1's list as errors with what to type instead; nothing of what may come (Q-037, Q-011) |
| F-089 | Errors | How an error reads, in general; no catalogue; no message with the old label (Q-055) |
| F-090 | (the page) | Assembled from D1's texts under §7's sections; F-442, F-439, F-457, F-475 applied |

Owned elsewhere and read here: F-095 and Q-106 (the call rule lives
here only), F-103 and F-104 (the list and shared-name checks are
`definitions.md`'s), F-112 (the absent names are `units.md`'s), F-114
(the catalogue is `units.md`'s), F-234 (`devdocs/architecture.md` pares
its expression sections to links to this page, in work order 13),
F-442, F-462, F-473.

## 6. Decisions followed, and still open

Followed: Q-003 (the juxtaposition edge stated), Q-011, Q-020, Q-037
(the typographic characters' intent is `future.md`'s), Q-038 (no EBNF
in the docs), Q-039 (read at its id for GNU units), Q-040 (a literal
past the limit refused in either mode), Q-055 (the label "a name", a
code change; no old-label message quoted), Q-075 (`at` reads as `a` +
`t`), Q-087, Q-102 (#88 not here), Q-106, Q-113; the rules F-439,
F-441, F-442, F-457, F-462, F-471, F-473, F-475.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| The whole page | D1 L287-485 (`#Expressions` with five new subsections) | the text, mapped onto §7's headings | "rejected" to "an error as it is typed" for text the grammar does not read, and to "refused as it is typed" for a literal past a size limit (R-4); "reads back" to "pastes back" (L449, L458, L485); "canonical form" to "how the app writes an expression back" (L449); L485's link list applied: "must conform" to `quantities.md#conformance`, "read exactly" and the literal limits to `numbers.md`, "pastes back" to `numbers.md#how-numbers-are-written` |
| Names | D1 L239-285 | the text | the `ha` sentence goes; the load-time checks and the shared-names sentence (L260-262, L271-272) go to `definitions.md`; link `units.md` for the absent names |
| Names (load-time check) | A9 L197-205; D2 L212-216 | not here: `definitions.md`'s (work order 04) | — |
| The have field (which field an error marks) | D9 L256-264 | not here: `app.md`'s (work order 08), linked | — |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
1, forward links, confirmed as the rule (this page links
`definitions.md`, `units.md`, `builtins.md` and `app.md` at §7's
anchors); conflict 7 does not touch this page. Of the review's answers
(plan §12.3), R-4: a literal past a size limit is a size refusal as it
is typed (section 3). The session records in its pull request the two or
three error messages it quotes.

## 9. Code changes it waits on

None. Later, in the code track's batch 3: B-019 (the parse label "a
unit name" becomes "a name"; the page already says "name" and quotes
no message with the old label), B-027 (the trailing blanks in the
zero-divisor exponent error), B-028. B-006 (#88) is not named.

## 10. Done when

- Every section of section 4 exists under its heading, in order, with
  D1's facts and no catalogue of messages.
- No "rejected", no "reads back", no "canonical", no "hard bound", no
  issue number, no mention of what may come, no `docs/functions.md`.
- Every link is a repo-relative path to `numbers.md` or `quantities.md`,
  or to a §7 anchor of a later page.
- The pull request names the messages quoted and any question for the
  owner, and changes nothing outside this file.
