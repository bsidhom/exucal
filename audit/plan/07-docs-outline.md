*Section 7 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 7. Proposed docs/ outline (skeleton)

Pages, each with title, role and a one-line scope, then the
concept-level sections. File names are proposals. The headings below
are the anchors other pages link to: the pages are written in
topological order (Q-008, recorded in §12, section 12.1), and a page
written earlier links a later page at these headings, which the later
page keeps (conflict 1 of the owner's list, §12 section 12.2). Amended
on 2026-10-12 from the owner's answers (§12, sections 12.1 and 12.2)
and on 2026-10-13 from the answers to the review of the apply step
(section 12.3); each change names its answer.

**`docs/README.md` — index (guide).** What the app is in two sentences,
stating the three goals in priority order, in brief, in its own prose
for its reader, with the substance principles.md fixes and "kind"
glossed or left to the quantities page (§12.3, 2026-10-14); the page
list below with one line each; where the developer docs are.

**`docs/getting-started.md` — Getting started (guide).** A task-oriented
tour that links everything and defines one word, "certified", by
example in "Reading `=`, `≈` and a note", the word the index uses
before it (Q-064, A; F-428); it opens with the
calculator and adds conversions after it, since the calculator is the
app's focus (§12, questions 2 and 21), its first sentence stating the
first goal, the tour then showing the other two (§12.3, 2026-10-14). GNU units is named only where a
similarity in conversion semantics or definitions helps.
- Your first calculation (`2 kg * 3 m/s^2`, `exp(1)`, `sqrt(2)`; the
  blank want)
- Reading `=`, `≈` and a note
- Your first conversion (`3 ft` → `in`; the two lines; copy)
- Lists of units (`ft;in`, `time`)
- Functions and readings (`sin(30 deg)`, `tempC(20)`, `300 K` → `tempF`)
- Approximating a value (`approx(2.54)`) (F-451: "approximate" only for the act)
- Changing a setting (display digits, ratio notation, decimal mode)
- When something fails (a mismatch, a size refusal, an edge; only the
  size refusal is a refusal, F-442; two or three messages as examples,
  Q-007)
- Where to go next (the app guide for installing and offline use);
  written last of all the pages (Q-008), introducing have and want
  (F-471)

**`docs/numbers.md` — Numbers (foundation).** The numeric model a user
needs to predict and interpret any result. Its introduction states the
first goal, exact where it can be and explicit where it cannot, and
that the first two goals, exactness and the functions, guided the
design, nothing of the third, which is orthogonal to the numeric
model (§12.3, 2026-10-14).
- Comparison with other approaches (the first section, short and set
  apart from the introduction, as decided in review on 2026-10-14:
  Arb credited as the inspiration for the midpoint and radius and
  contrasted on the midpoint; Frink, Qalculate! and Android's
  ExactCalculator, each linked to its own site and described from its
  own documentation; what differs in Exucal; the only user page that
  names another calculator; no page links it)
- Exact and inexact values (the fraction times a power of ten; the
  error radius; the two sources of inexactness, F-010; one clause that
  the units defined through `pi()` are inexact, linking `units.md`,
  F-113; the app never shows the error radius, a plain fact about
  today's display, neither ruled out nor future work, R-7)
- How a value is held (the fraction and its bit size, in its canonical
  form, named once and glossed, with why a value has exactly one and
  what follows, F-439 as the owner amended it on 2026-10-13; the power
  of ten and its bound; the error radius; the digits an inexact value is
  kept to, the grid explained once, Q-004; the dyadic cost), as foundation
  that the settings reference links to (§12, question 5)
- Operations that stay exact; exact cases of functions
- Digits you can trust (display digits; retries up to a ceiling, the
  highest precision any pass computes at, Q-004; what a note says, in
  the "certified" wording after the code change, Q-006; the uncertified
  mark)
- Comparison and equality (exact vs inexact; undecided at a bound; the
  touch rule in one sentence, Q-024; no equality operator, a plain fact,
  Q-011)
- Values at an edge ("cannot be told from", an error and never a
  refusal, F-442; which rounding functions decide a value that cannot be
  told from zero, Q-025)
- Identities and cancellation (what never certifies; the dependency
  problem; what it costs)
- The two modes (exact; decimal as rules 1–4, with the list of what
  counts as a step, F-037; working digits; decimal mode's consequences
  for units and edges without settings-dependent digits, Q-023; decimal
  mode runs a single pass, F-039)
- `approx` (the concept, with A5's, A2's and D6's facts, F-046; nothing
  of the binary form, which is future work, Q-011: `devdocs/numbers.md`
  names it in one clause, Q-035)
- Rounding modes and where they act (`round(2.5)` under the default,
  F-048)
- Values too big to hold (the significand limit and its remedies; the
  exponent bound, with a display rounding past it refused, Q-002; which
  message says which, the two quoted as examples, Q-007; the one
  log-space example, Q-026; "the exponent", never "decimal exponent",
  F-440)
- How numbers are written (digits, exponents, zero, ratio notation;
  the ratio bare before `×` and parenthesized before a unit, Q-003;
  every result pastes back as input, §12 question 11, F-457; a line a
  function of the value, its exactness and the settings, never of the
  route, the scaled ratio being the canonical parts, F-439 as amended)
- What costs time (qualitative only, Q-016; generic: no built-in named,
  the Gamma family's cold start being the built-ins page's, F-065 as the
  owner amended it on 2026-10-14)
- Real values only (a plain fact; nothing of what symbolic or complex
  values would add, Q-011)

**`docs/quantities.md` — Quantities (foundation).** Units, dimensions,
kinds and what a conversion is. Its opening states the third goal,
calculation and conversion aware of units and kinds, in its own prose
for its reader, with the substance principles.md fixes (§12.3,
2026-10-14).
- A quantity: a value with a dimension; dimensions have rational
  exponents by design, so `^` takes a literal rational exponent
- Primitives, dimensions and kinds (the radian the only kind today,
  named by its kind; a kind primitive "a marker of a kind, with no
  dimension of its own", F-459; §12, question 20 and Q-019)
- Conformance: what can be added, converted, passed
- No unit of its own: consequences (floor, annotations)
- Units, prefixes and exactness of factors (which units are inexact;
  the rule, F-069: every factor is written exactly, so a conversion is
  exact unless a unit calls `pi()`; `units.md` lists the measured values)
- How a conversion is answered (the ratio, refused also at the
  significand limit, F-070; a want with a magnitude; the blank want; the
  reciprocal line; lines that paste back, F-457)
- Unit lists (counts, remainder, rounding carry, validity; what a
  comparison that cannot be decided does in a list, the count's whole
  number and the unit at zero, linking `numbers.md`'s comparison and
  edge sections, which no longer mention lists; the owner, 2026-10-14)
- Conversion into a function (readings)
- Temperature and logarithmic levels as functions (readings are
  functions, not units with an offset: a ruled-out design stated as a
  plain fact, Q-011)
- How dimensions are written in messages

**`docs/expressions.md` — The expression language (reference).** Syntax
and semantics of what is typed into either field.
- Grammar (EBNF) and precedence table
- Numbers (literals, exactness, limits)
- Names and how a name is read (units, prefixes, parameters, functions)
- Operators (juxtaposition, `* /`, `+ -`, unary `-`, `^`, parentheses)
- Calls and arity
- The have field (an expression)
- The want field (a unit, a list, a list's name, a function's name, a
  call)
- Evaluation order and error locations
- What the app writes back (printed form, which may be called canonical,
  glossed once, F-439 as amended; `×` vs `*`)
- Pitfalls (`1/12 year`, `1/2 in` against `(1/2) in` and `0.5 in`,
  Q-003; `kg(m/s)`, `-2^2`, `m2`)
- What is not accepted (display-only characters such as `×`, stated as
  errors with what to type instead and nothing of what may come, Q-011,
  Q-037; "an error as it is typed", never "rejected", F-442)
- Appendix: parse and evaluation errors, generated from `src/messages.ts`
  by the docs tool (§12, question 6); nothing hand-written meanwhile

**`docs/definitions.md` — The definition language (reference).** The
file's format and the semantics of each definition kind.
- The file: lines, comments, order, errors
- Grammar (EBNF) for the six kinds
- Primitives (`!`, `!kind`)
- Prefixes
- Units (exactness; evaluated once at the ceiling)
- Unit lists (validity at load; the name as a want)
- Functions (parameters, annotations, result annotation, conditions,
  body; exactness and cost; decimal mode)
- Inverses (conditions; what a conversion into the function checks)
- Names: namespaces, prefixed-name rule, shadowing
- When the file does not load (table: error, cause, fix; "error",
  never "rejected", F-442; "loaded" in docs, "build" in devdocs, F-476)
- Only the predefined definitions file is loaded today, stated as a
  plain fact (Q-011: that user definitions are to come, and #132, are
  `devdocs/future.md`'s; F-475)

**`docs/units.md` — The units the app knows (reference).** A friendly
guide to the definitions file's contents (F-475); `src/units.txt` is the source of
truth, and the page may defer to it; later possibly generated from
structured comments in the file (§12, question 4).
- The primitives, `bit` included, and why information is a dimension
  (F-094, Q-032)
- The SI (base units, prefixes, derived, accepted non-SI)
- US customary; UK imperial; naming conventions (`imp`, `uk`, `long`)
- Constants and extras (CGS, pressure, calories, time, bits and bytes);
  other metric and scientific units, time beyond the day, information,
  counts and ratios, naming conventions beyond `imp` and `uk`, as D3's
  draft sections them (F-109, F-115)
- Angles and rotation (inexact through `pi()`, F-451, F-113)
- Temperature: differences and readings
- Logarithmic levels
- Unit lists defined in the file (`dms` the one inexact list, F-111)
- Which factors are exact (the sources the file cites, Q-033; the
  measured values, the dalton as CODATA 2018 and the two years; `gravity`
  exact by convention, F-069)
- Names that are absent or mean something else (`u`, `at`, `dB`, `e`,
  `rad`; Q-075; nothing of a unit `a`, F-078)

**`docs/settings.md` — Settings (reference).** Every control, in terms
of the model parameter it sets, grouped and nested by mode and never
counted; foundational detail lives in `numbers.md`, which each entry
links to (§12, questions 5 and 16).
- Where the settings are and how a change applies (short; the panel's
  mechanics are `app.md`'s, F-176, F-488); the entries grouped as D4
  drafts them, how it is shown, how it is computed, how much it may cost
  (F-136)
- Display digits
- Rounding
- Mode
- Notation and ratio width
- Working digits and the extended count
- Precision limit (the formula once, "four times the sum of the limit
  and ten", Q-005)
- Significand limit (one sentence and a link, Q-108)
- Probe budget and "Measure this device" (the four elementary
  functions, F-491; as a procedure, F-129)
- How the settings bound each other (the chain; the edits the panel
  does not accept and the values held to their range, conflict 8)
- Defaults and resets; storage (one sentence)

**`docs/builtins.md` — Built-in functions (reference).** Renamed from
`docs/functions.md` (Q-020's note), every link following. Generated from
structured comments beside each implementation, grouped by family (§4);
until the generator exists, today's prose list, corrected. Its opening
states the second goal, the elementary functions and the special
functions that matter most in combinatorics, probability and physics
under the same guarantee as the arithmetic, in its own prose for its
reader, with the substance principles.md fixes, as the aim of today's
set, nothing of a set to come (Q-011; §12.3, 2026-10-14).
- Rules every built-in follows (plain numbers unless stated; exact
  cases; domains; edges; errors and the size refusals, F-442; decimal
  mode; no prefixes; arity)
- Constants (`pi`)
- Exponential and logarithms
- Roots and powers (`pow` vs `^`)
- Trigonometric; inverse trigonometric
- Hyperbolic
- `approx`
- Magnitude, sign and rounding (`abs`, `sign`, `floor`, `ceil`, `trunc`,
  `round`)
- Division (`div`, `mod`)
- Integer functions
- Gamma family; incomplete gamma; error functions; incomplete beta (the
  one user page naming the calls that pay the family's cold start,
  F-065 as amended 2026-10-14)
- Functions defined in the file (cross-reference to `units.md`)
- Not provided, and what to write instead (a plain fact: what the app
  lacks and what to write, never what may come; the deferred classes
  are described in `devdocs/future.md` only, Q-010, Q-011)

**`docs/app.md` — The app (guide).** What is specific to the web app
(§12, questions 3 and 22), in six sections (D9's scope, F-180), its
opening stating the portable format of the first goal, the browser,
where the app installs and works offline (§12.3, 2026-10-14):
- Installing
- Offline use (the service worker named once as what lets the app be
  served offline, F-493; the loading and failure messages, F-169; the
  privacy sentence, Q-028, linking `devdocs/security.md#The page`, R-1
  and R-2)
- Updates and the build ID (Q-022; every footer word quoted, Q-007;
  "a new version" and "update", F-494, the heading keeping the noun,
  R-8)
- The settings panel (F-488; the mechanics and the reset links, F-176)
- Copying a result (pastes back, F-457; the button's feedback, F-178)
- The two fields (the labels named beside have and want, F-471; the
  hint described, not quoted, Q-056; which field an error marks, F-179)

### 7.1 The developer-side counterparts (unified concept map)

The focus is the conceptual building blocks, unified across the two
sides: each concept area has one user-side owner, which states the
rules, and one developer-side owner, which keeps three things and no
more: the mechanism, the decision with its reason, and the
ruled-out alternatives with theirs. Each side links to the other at the
section level. The developer-side owners below are the existing pages;
the units in §10.c reshape them to this map.

| Concept area | docs/ owner (the rules) | devdocs/ owner (mechanism, decisions, ruled-out alternatives) |
| --- | --- | --- |
| Exactness and the error radius | `numbers.md` > Exact and inexact values | `devdocs/numbers.md#The types`, `#Exact mode` |
| Digits, certification, the retry loop | `numbers.md` > Digits you can trust | `devdocs/numbers.md#Certification and the display rule`, `#Working precision and the schedule`, `#Settling` |
| Comparison and edges | `numbers.md` > Comparison; Values at an edge | `devdocs/numbers.md#Comparison`, `#Exact operations` |
| Decimal mode and working digits | `numbers.md` > The two modes | `devdocs/numbers.md#Decimal mode`, `#The working digits` |
| Size limits and `approx` | `numbers.md` > Values too big to hold; `approx` | `devdocs/numbers.md#The significand limit`, `#The exponent bound`, `#Why the exponent bound stays at 10^18`, `#approx` |
| Writing numbers; ratio notation | `numbers.md` > How numbers are written | `devdocs/numbers.md#Formatting`; `devdocs/notation.md` |
| Quantities, dimensions, kinds, conformance | `quantities.md` | `devdocs/architecture.md#Quantities, dimensions and kinds` |
| Conversion and the output modes | `quantities.md` > How a conversion is answered; Unit lists; Conversion into a function | `devdocs/architecture.md#Conversion`, `#Unit lists`, `#The converter and its lines`; `devdocs/functions.md#A function as the want` |
| The expression language | `expressions.md` | `devdocs/architecture.md#Expressions`, `#Parsing`, `#Evaluation` |
| The definition language and defined functions | `definitions.md` | `devdocs/architecture.md#Definitions`; `devdocs/functions.md` |
| The units the app knows | `units.md` | `devdocs/development.md#Adding a unit` (the contributor's side); the comments in `src/units.txt` |
| Settings | `settings.md` | `devdocs/settings.md` |
| Built-in functions | `builtins.md` | `devdocs/builtins.md` |
| The app's surface | `app.md` (F-513) | `devdocs/architecture.md#UI`; `devdocs/offline.md` |
| What is ruled out by intent | one sentence where a user would look for it (a temperature reading is a function, not a unit with an offset; neither "real values only" nor "the error radius is never shown" is one: each is a plain fact about today, complex numbers being future work and the radius display neither, R-7) | the page that owns the concept, with the reason; each page's "Not in this design" (Q-011) |
| What might still be done | nothing: the user docs never mention future work (Q-011) | `devdocs/future.md`, the one place, with the issue links |
