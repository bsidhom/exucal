*Section 6 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 6. Coverage gaps in docs/, measured against the target

### 6.1 Foundation: the numeric type — missing as a page

What exists is scattered and partly at the wrong level:
`docs/settings.md#How a number is held, and what the settings touch`
(representation-level: grids, significands, bits),
`docs/settings.md#(top) > Mode` (the two modes, compressed into one
bullet), `docs/settings.md#(top)` (two paragraphs on notes and the
relation), `docs/functions.md#(top)` (the paragraph "Every built-in takes
plain numbers…": exact cases, domains, refusals), `docs/functions.md#Very
large results and approx` (the exponent bound, with the pass table).

Missing or thin, with the devdocs passages to derive from:

- Exact and inexact values, their sources, what `=` means: derive from
  `devdocs/numbers.md#Exact mode`, `#The types > Ball` (the claim only).
- How a value is held, to the depth needed to predict refusals: the
  fraction and its bit size, the power of ten and its bound, the error
  radius, the digits an approximate value is kept to, the dyadic cost:
  `#The types` (the claims only), `#The significand limit`, `#The
  exponent bound` (§12, question 5).
- Which operations are exact and that exact values are never rounded;
  sums that cannot align are refused: `#Exact operations`, `#Sums and
  alignment`, `#Exact mode`.
- Digits you can trust: certification stated as a user rule, the retry
  up to a ceiling, notes and the uncertified mark: `#Certification and the
  display rule`, `#Working precision and the schedule` (first and last
  paragraphs), `#Decimal mode > The ceiling`.
- Comparison and equality: exact compare exactly; inexact at a bound is
  undecided; where that surfaces (conditions, division, rounding
  functions, lists, inverses): `#Comparison`; `devdocs/functions.md#The
  check at a call` (the verdict table); `devdocs/builtins.md#The exact
  functions` (on balls).
- Values at an edge ("cannot be told from"): `#Exact operations`
  (`unresolved`), `#The exponent bound` (the ball straddling the edge);
  `devdocs/builtins.md#The rules every built-in follows`.
- Identities and cancellation (`sqrt(2)^2 - 2`, `turn` into `deg`, the
  dependency problem), and their cost: `#Exact mode`;
  `devdocs/functions.md#Precision, the radius and cost`; `devdocs/cost.md#What
  the costs come from`.
- Decimal mode as a numbered list of rules, with the working digits:
  `#Decimal mode` (rules 1–4 and the per-operation list), `#The working
  digits`.
- `approx` as a concept (not only as a function): `#approx`.
- The two size limits from the user's side (what is refused, what the
  message suggests, what `approx` and decimal mode change), with the
  exponent bound: `#The significand limit` (the user-facing third),
  `#The exponent bound` (first and third paragraphs), `#Which limit a
  refusal names` (the messages).
- How numbers are written (digits, exponents, ratio notation, zero, the
  notation's five rules): `#Formatting`; `devdocs/notation.md#The rule`,
  `#Where a ratio is written`.
- Rounding modes and where the mode acts: `#Certification…` (last
  paragraph); `devdocs/builtins.md#The exact functions` (`round`).
- Real values only; what symbolic exactness would add (one sentence):
  `devdocs/future.md#Symbolic values`, `#Complex numbers`.

### 6.2 Foundation: the quantity — missing as a page

What exists: pieces of `docs/definitions.md#The format` (primitives and
kinds), `#Expressions > + and -` (conformance by example), `#Names`,
`#Unit lists`, `#Functions` (annotations). Nothing states the model.

Missing, with sources:

- Quantity = value + dimension; dimensions as exponents over
  primitives, exact even in decimal mode: `devdocs/architecture.md#Quantities,
  dimensions and kinds`; `devdocs/numbers.md#Decimal mode` (last bullet).
- Dimension vs kind; the two-step conformance test and the two
  mismatches; no special zero: `devdocs/architecture.md#Quantities…`.
- "A quantity carries no unit of its own" and its consequences (floor,
  annotations): `devdocs/functions.md#Annotations`; `devdocs/builtins.md#Dimension
  rules > floor and its kin`.
- Angles as the kind users meet: `devdocs/builtins.md#Dimension rules >
  Angles`.
- How a conversion is answered: the ratio, a want with a magnitude, the
  blank want, the reciprocal line and when there is none, lines that
  type back: `devdocs/architecture.md#Conversion`, `#The converter and its
  lines`.
- Unit lists' semantics (counts, remainder, rounding carry, zero terms,
  validity): `devdocs/architecture.md#Unit lists`.
- Conversion into a function as an output mode: `devdocs/functions.md#A
  function as the want`, `#Display`.
- Exactness of unit factors; which units are inexact (`pi()`): `docs/
  definitions.md#What the file contains` (keep), `devdocs/builtins.md#The
  elementary routines`, `devdocs/numbers.md#approx` (constants).
- Why temperature readings and logarithmic levels are functions, not
  units: `devdocs/functions.md#(top)`; `devdocs/future.md#Ruled out`.
- How a dimension is written in errors: `devdocs/architecture.md#Quantities…`.

### 6.3 Expression language reference — partial, misplaced

`docs/definitions.md#Expressions` and `#Names` are the current reference
but sit under "Unit definitions". Missing:

- A formal grammar and a precedence table (§2.1.3); derive from
  `devdocs/architecture.md#Expressions`.
- The `want` field's own grammar: lists, bare names, a want with a
  magnitude, a call as a want: `devdocs/architecture.md#Pipeline`, `#Unit
  lists`, `#Functions`.
- Literal limits at parse (hard bound, exponent bound) and at evaluation
  (significand limit): `devdocs/architecture.md#Parsing > Rejection is final`;
  `devdocs/numbers.md#The significand limit`.
- Name resolution order in full (exact unit, prefix + unit; parameter
  before unit; function before built-in; no prefixes on functions):
  `devdocs/architecture.md#Definitions`, `#Evaluation`;
  `devdocs/functions.md#Names and shadowing`.
- Evaluation order and which operand an error points at:
  `devdocs/architecture.md#Evaluation`.
- Whitespace and what `×`, `≤`, `≥`, `#` do in the fields (unstated; §12).
- The printed form (what the app writes back, `×` vs `*`, parentheses):
  `devdocs/architecture.md#Expressions` (printer), `#The converter and its
  lines`; `devdocs/notation.md#Where a ratio is written`.
- Parse errors and how they read: `devdocs/architecture.md#Parsing`.

### 6.4 Definition language reference — closest to complete

`docs/definitions.md` covers the format, names, lists and functions.
Missing or thin:

- A line-level grammar for all six kinds (§2.2.3); derive from
  `devdocs/functions.md#Definitions` and `devdocs/architecture.md#Definitions`.
- The build-time checks as a table (error, cause, fix), including
  `inch2.54 cm`, `name[`, `orphanInverse`, `inverseArity`,
  `zeroDeclaredUnit`, `nonconformingComparison`,
  `conditionWithoutParameter`, the build's `undecidedCondition`,
  `annotationScale`/`annotationNotUnits`, `parameterNamesUnit`,
  `duplicateParameter`, `mixedComparison`: `devdocs/architecture.md#Definitions`
  (the catalogue), `devdocs/functions.md#Build-time checks`, `#Names and
  shadowing`, `#Conditions`.
- How definitions interact with exactness: units evaluated once at the
  ceiling in exact mode, functions per pass, `approx` in a body, what the
  build does not check: `devdocs/numbers.md#Working precision and the
  schedule`, `#approx`; `devdocs/functions.md#Definitions`, `#Build-time checks`.
- How definitions interact with dimensions: `dimensionOf` inference,
  conditions' sides conforming, prefix bodies dimensionless:
  `devdocs/functions.md#Annotations`, `#Conditions`; `devdocs/architecture.md#Definitions`.
- Inverse conditions and what a conversion into a function checks:
  `devdocs/functions.md#Conditions` (last paragraph), `#A function as the want`.
- The status of user definitions (system file only today; #132):
  `devdocs/future.md#Extensions that fit`.
- `docs/definitions.md#What the file contains` is a catalogue, not
  language; see §7 (`units.md`) and §12, question 4.

### 6.5 Settings reference — complete in coverage, wrong in shape

Every setting is described, but `docs/settings.md` mixes the sheet's
mechanics, the model, and representation. Missing or to restructure:

- One entry per control with stored key, default, range and what bounds
  it, effect in each mode: `devdocs/settings.md#The model`, `#Applying a
  change` (`rangesOf`).
- The clamp chain and refusals as a short table: `devdocs/settings.md#The
  model > The chain`, `#Applying a change`.
- "Measure this device" as a procedure (what it times, what it proposes,
  Apply): `devdocs/settings.md#The probe`.
- The ratio width and the extended working digits as entries of their
  own: `devdocs/notation.md#The width`; `devdocs/numbers.md#The working digits`.
- Remove from here: the update-check paragraph (to `app.md`, C57); the
  representation section (to `numbers.md`, which each settings entry
  links to rather than restating, §12 question 5); the sheet's layout
  detail beyond what a user needs to find a control (to `app.md`).

### 6.6 Built-in function reference — a prose list, not a reference

`docs/functions.md#(top)` covers every family in bullets. Missing per
entry (the fields of §4.1, to be supplied by the generated reference, not by hand): signature and argument order; dimension
requirements and result; exact cases; domain wording; edges; decimal
mode; related settings. Specific gaps, with sources in
`devdocs/builtins.md`:

- `pow`: `pow(1, y)`, `pow(0, y)`, `pow(-1, y)` parity, `pow(0, 0)`, the
  log-space route: `#Domains… > pow, and ^ with it`.
- `log`: the exact cases both ways, `b` checked first: `#Domains… > log's
  exact cases`.
- `atan2`: quadrant rules, `y` exactly zero, the origin: `#Domains…`,
  `#Huge and tiny arguments`.
- `tan` at a pole; `asin`/`acos`/`acosh`/`atanh` at their ends;
  `asin(0.1 + 1e-15000)` refused (#63): `#Domains…`, `#Huge and tiny
  arguments`.
- Tiny and huge arguments where visible (`sin(1e-999999999 radian)`,
  `atan` beyond `2^bits`, `tanh` saturation, `ln(1e999999999)`,
  `log10(1e999999999)` exact): `#Huge and tiny arguments`.
- `round(x, places)`: `places` an exact integer, held to the limit:
  `#The exact functions`.
- `div`/`mod`: the sign convention and the `overflow`/`tooLarge` edges:
  `#The exact functions`.
- `gcd(0, 0)`, `lcm(a, 0)`, `binomial` outside `0..n`,
  `doublefactorial(-1)`: `#The exact functions`.
- `digamma` reflection and poles, `lgamma` as `ln |Γ|`, `gamma`'s sign,
  `beta` at a pole of the sum, the incomplete functions' exact cases and
  the `tooLarge` regime, `erfc` thresholds, `incbetareg`'s polynomial
  case: `#The Gamma and Beta families`.
- Decimal-mode behaviour of each family (one step, exact cases rounded):
  `devdocs/numbers.md#Decimal mode > A built-in's call`.
- `docs/functions.md#Very large results and approx` belongs to the numeric
  foundation (C21) and duplicates `devdocs/numbers.md#Why the exponent bound
  stays at 10^18`.

### 6.7 Getting started — missing entirely

The seed is `docs/README.md#(top)` (the intro paragraph) and
`devdocs/architecture.md#(top)`. It should teach by example: a
conversion, the reciprocal line, a unit list, a calculation with a
blank want, `approx`, a function call, a conversion into `tempC`, a
settings change (display digits, ratio notation, decimal mode), and
what `=`/`≈` and a note mean, each linking to the owning page.

### 6.8 Existing pages that must link to the foundation pages

- `docs/definitions.md`: `#Expressions > + and -` (conformance →
  `quantities.md`); `> Numbers` (exactness → `numbers.md`); `#Unit lists`
  (rounding of the remainder, `=` on a list → `numbers.md`,
  `quantities.md`); `#Functions` (conditions on inexact values, calls not
  memoized, the dependency problem, decimal mode → `numbers.md`;
  annotations and conformance → `quantities.md`).
- `docs/functions.md`: the preamble (exact cases, `=`/`≈`, domains,
  "cannot be told", refusals → `numbers.md`; angle and plain-number
  rules → `quantities.md`); `#Very large results and approx` (dissolved
  into `numbers.md`).
- `docs/settings.md`: Display digits, Mode, Notation, Working digits,
  Precision limit, Significand limit (each → the owning `numbers.md`
  subsection); `#How a number is held…` (dissolved into `numbers.md` and
  the limits' entries).
- `docs/README.md`: the index itself; the intro's `≈` lines → `numbers.md`.
