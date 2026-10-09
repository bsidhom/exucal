*Section 7 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 7. Proposed docs/ outline (skeleton)

Pages, each with title, role and a one-line scope, then the
concept-level sections. File names are proposals.

**`docs/README.md` — index (guide).** What the app is in two sentences;
the page list below with one line each; where the developer docs are.

**`docs/getting-started.md` — Getting started (guide).** A task-oriented
tour that defines nothing and links everything.
- Your first conversion (`3 ft` → `in`; the two lines; copy)
- Lists of units (`ft;in`, `time`)
- Calculating with a blank want (`2 kg * 3 m/s^2`, `exp(1)`)
- Reading `=`, `≈` and a note
- Functions and readings (`sin(30 deg)`, `tempC(20)`, `300 K` → `tempF`)
- Making a value approximate (`approx(2.54)`)
- Changing a setting (display digits, ratio notation, decimal mode)
- When something is refused (a mismatch, a size refusal, an edge)
- Installing and working offline
- Differences from GNU units (pending §12, question 2; the owner leans
  against grounding the docs on GNU units)

**`docs/numbers.md` — Numbers (foundation).** The numeric model a user
needs to predict and interpret any result.
- Exact and approximate values (the fraction times a power of ten; the
  error radius; the sources of approximation)
- Operations that stay exact; exact cases of functions
- Digits you can trust (display digits; retries up to a ceiling; what a
  note says; the uncertified mark)
- Comparison and equality (exact vs approximate; undecided at a bound)
- Values at an edge ("cannot be told from")
- Identities and cancellation (what never certifies; the dependency
  problem; what it costs)
- The two modes (exact; decimal as rules 1–4; working digits)
- `approx`
- Rounding modes and where they act
- Values too big to hold (the significand limit and its remedies; the
  exponent bound; which message says which)
- How numbers are written (digits, exponents, zero, ratio notation)
- What costs time (qualitative)
- Real values only

**`docs/quantities.md` — Quantities (foundation).** Units, dimensions,
kinds and what a conversion is.
- A quantity: a value with a dimension; dimensions have rational
  exponents by design, so `^` takes a literal rational exponent
- Primitives, dimensions and kinds (angles as the example)
- Conformance: what can be added, converted, passed
- No unit of its own: consequences (floor, annotations)
- Units, prefixes and exactness of factors (which units are approximate)
- How a conversion is answered (the ratio; a want with a magnitude; the
  blank want; the reciprocal line; lines that type back)
- Unit lists (counts, remainder, rounding carry, validity)
- Conversion into a function (readings)
- Temperature and logarithmic levels as functions
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
- What the app writes back (printed form, `×` vs `*`)
- Pitfalls (`1/12 year`, `kg(m/s)`, `-2^2`, `m2`)
- Appendix: parse and evaluation errors (pending §12, question 6)

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
- Build-time checks (table: error, cause, fix)
- User definitions today (system file only; #132)

**`docs/units.md` — The units the app knows (reference).** A friendly
guide to the system file's contents; `src/units.txt` is the source of
truth, and the page may defer to it (§12, question 4, settled).
- The SI (base units, prefixes, derived, accepted non-SI)
- US customary; UK imperial; naming conventions (`imp`, `uk`, `long`)
- Constants and extras (CGS, pressure, calories, time, bits and bytes)
- Angle units (approximate through `pi()`)
- Temperature: differences and readings
- Logarithmic levels
- Unit lists defined in the file
- Names deliberately absent (`u`, `at`, `dB`, `e`)

**`docs/settings.md` — Settings (reference).** Every control, in terms
of the model parameter it sets.
- Where the settings are and how a change applies (short)
- Display digits
- Rounding
- Mode
- Notation and ratio width
- Working digits and the extended count
- Precision limit
- Significand limit
- Probe budget and "Measure this device"
- How the settings bound each other (the chain; refusals; clamps)
- Defaults and resets; storage (one sentence)

**`docs/functions.md` — Built-in functions (reference).** Generated from
structured comments beside each implementation, grouped by family (§4);
until the generator exists, today's prose list, corrected.
- Rules every built-in follows (plain numbers unless stated; exact
  cases; domains; edges; refusals; decimal mode; no prefixes; arity)
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
- Gamma family; incomplete gamma; error functions; incomplete beta
- Functions defined in the file (cross-reference to `units.md`)
- Not provided, and what to write instead (distributions, deferred
  specials)

**`docs/app.md` — The app (guide; pending §12, question 3).** Installing,
offline use, updates and the build number, the settings sheet's
mechanics, copying results.

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
| Exactness and the error radius | `numbers.md` > Exact and approximate values | `devdocs/numbers.md#The types`, `#Exact mode` |
| Digits, certification, the retry loop | `numbers.md` > Digits you can trust | `devdocs/numbers.md#Certification and the display rule`, `#Working precision and the schedule`, `#Settling` |
| Comparison and edges | `numbers.md` > Comparison; Values at an edge | `devdocs/numbers.md#Comparison`, `#Exact operations` |
| Decimal mode and working digits | `numbers.md` > The two modes | `devdocs/numbers.md#Decimal mode`, `#The working digits` |
| Size limits and `approx` | `numbers.md` > Values too big to hold; `approx` | `devdocs/numbers.md#The significand limit`, `#The exponent bound`, `#Why the exponent bound stays at 10^18`, `#approx` |
| Writing numbers; ratio notation | `numbers.md` > How numbers are written | `devdocs/numbers.md#Formatting`; `devdocs/notation.md` |
| Quantities, dimensions, kinds, conformance | `quantities.md` | `devdocs/architecture.md#Quantities, dimensions and kinds` |
| Conversion and the output modes | `quantities.md` > How a conversion is answered; Unit lists; Conversion into a function | `devdocs/architecture.md#Conversion`, `#Unit lists`, `#The converter and its lines`; `devdocs/functions.md#A function as the want` |
| The expression language | `expressions.md` | `devdocs/architecture.md#Expressions`, `#Parsing`, `#Evaluation` |
| The definition language and user functions | `definitions.md` | `devdocs/architecture.md#Definitions`; `devdocs/functions.md` |
| The units the app knows | `units.md` | `devdocs/development.md#Adding a unit` (the contributor's side); the comments in `src/units.txt` |
| Settings | `settings.md` | `devdocs/settings.md` |
| Built-in functions | `functions.md` | `devdocs/builtins.md` |
| The app's surface | `app.md` or `getting-started.md` | `devdocs/architecture.md#UI`; `devdocs/offline.md` |
| What is ruled out or deferred | one sentence where a user would look for it ("real values only") | `devdocs/future.md`; each page's "Not in this design" |
