*Section 2 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 2. The two languages

Amended on 2026-10-12 (§12, section 12.1): the two hand-maintained
grammars in the parsers' header comments are named (F-500, Q-038), the
"cannot disagree" claim is scoped (F-501), and the rules that bind
every page (`audit/principles.md`) hold in the wording below.

### 2.1 The expression language

#### 2.1.1 Constructs and semantics documented anywhere, by pointer

| Construct | docs/ | devdocs/ |
| --- | --- | --- |
| Numbers: unsigned decimals with optional exponent, read exactly; sign only in the exponent | `docs/definitions.md#Expressions > Numbers` | `devdocs/architecture.md#Expressions` (literal read "as far as it goes"); `devdocs/numbers.md#(top)` |
| Literal limits: significand past the hard bound (2^20 bits) or exponent past ±10^18 rejected at parse; past the significand limit refused at evaluation | — (only `docs/settings.md#(top) > Significand limit`: "a literal of more digits than the limit") | `devdocs/architecture.md#Parsing > Rejection is final`; `devdocs/numbers.md#The significand limit` |
| Names: letter/underscore then letters, digits, underscores, any script; longest match; case-sensitive | `docs/definitions.md#Names` | `devdocs/architecture.md#Expressions` |
| Name resolution: exact unit, else prefix + unit; parameter before unit in a body; call names exact; defined function before built-in | `docs/definitions.md#Names` | `devdocs/architecture.md#Definitions`, `#Evaluation`; `devdocs/functions.md#Names and shadowing`; `devdocs/builtins.md#(top)` |
| Juxtaposition multiplies; a number only as the first factor | `docs/definitions.md#Expressions > Juxtaposition` | `devdocs/architecture.md#Expressions` |
| `*` and `/`: one left-associative level below juxtaposition | `docs/definitions.md#Expressions > * and /` | `devdocs/architecture.md#Expressions` |
| `+` and `-`: one left-associative level, loosest; operands must conform | `docs/definitions.md#Expressions > + and -` | `devdocs/architecture.md#Expressions`, `#Evaluation` |
| Unary `-`: tighter than `*`/`/`, looser than juxtaposition and `^`; no stacking; no unary `+`; where a `-` belongs (`2e-3`, `m^-1`, `2 -3`, `2 * -3`) | `docs/definitions.md#Expressions > - before a product` | `devdocs/architecture.md#Expressions` |
| `^` with a literal exponent (signed decimal or parenthesized rational), tightest; the exponent is reduced within the significand limit at evaluation | `docs/definitions.md#Expressions > ^` | `devdocs/architecture.md#Expressions`, `#Evaluation` (`reduceExponent`); `devdocs/numbers.md#Roots and powers` |
| Parentheses | `docs/definitions.md#Expressions > Parentheses` | `devdocs/architecture.md#Expressions` |
| Calls: name immediately followed by `(`, comma-separated arguments; lexical rule (space → product); arity checked before arguments; an atom | `docs/definitions.md#Expressions > A call`, `#Functions` | `devdocs/architecture.md#Expressions`; `devdocs/functions.md#Calls`; `devdocs/builtins.md#Arity` |
| Unit lists `a;b;c` in the `want` only; `;` not an expression, never inside parentheses | `docs/definitions.md#Unit lists` | `devdocs/architecture.md#Expressions`, `#Unit lists` |
| Whitespace: spaces and tabs, no newline | — | `devdocs/architecture.md#Expressions` |
| Evaluation order: left to right, first failure ends; error located at the operand or the whole operation | — | `devdocs/architecture.md#Evaluation` |
| The tree's six node kinds; printer's canonical text (`×` on screen, `*` in copy text; fewest parentheses) | — (copy behaviour in `docs/README.md#(top)`) | `devdocs/architecture.md#Expressions`, `#The converter and its lines` |
| Parse errors: "expected a number or `(`", furthest expectation | — | `devdocs/architecture.md#Parsing` |
| The `want` field's readings (bare list name, bare function name, unit expression, typed list; a call is an expression) | `docs/definitions.md#Unit lists`, `#Functions` | `devdocs/architecture.md#Pipeline`, `#Unit lists`, `#Functions`; `devdocs/functions.md#A function as the want` |
| The `have` alone as a calculator (blank `want`) | `docs/README.md#(top)` (implicit) | `devdocs/architecture.md#(top)`, `#The converter and its lines` |
| Reserved: `name[` (dimension variables); `=`, `:`, `~`, `\|`, comparisons appear in no expression | — | `devdocs/functions.md#Definitions`, `#Conditions` |

#### 2.1.2 Where syntax meets the core abstractions

- **Exactness of literals.** Read exactly (N1); in decimal mode rounded
  to `p` as read (N17); the hard bound and the exponent bound at parse,
  the significand limit at evaluation (N21, N22).
- **Exponents of `^`.** Known at parse time so that the dimension stays
  exact (Q1); the fraction formed within the significand limit at
  evaluation; `^` and `pow` disagree on an unformable exponent (#88, a
  bug whose link stays with the owning passage, Q-012; #89 closes as
  housekeeping, Q-042) → `devdocs/architecture.md#Evaluation`.
- **Dimensions.** A number is a plain number; juxtaposition and `*`/`/`
  combine dimensions; `+`/`-` check conformance (Q3, Q6); the
  "fraction before a unit" pitfall → `docs/definitions.md#Expressions`
  (last paragraph).
- **Name resolution.** Q9; inside a body, a parameter shadows a unit,
  and a prefixed name is always a unit (`km` beside a parameter `m`) →
  `devdocs/functions.md#Names and shadowing`.
- **Calls.** Arity before arguments; dimension rule or annotation check
  at the call; conditions three-valued (N14); a call's failure wraps the
  body's → `devdocs/functions.md#Calls`; `devdocs/architecture.md#Evaluation`.
- **Settling and steps.** Every node is a step (N17 in decimal mode;
  settled in exact mode) → `devdocs/numbers.md#Settling`.
- **Error location.** Spans on every node; the input at fault marked →
  `devdocs/architecture.md#Expressions`, `#Evaluation`, `#Messages`.

#### 2.1.3 Formal grammar: does one exist, and how the reference documents it

- No grammar file exists in the tree (no `.peg`, `.ebnf`, `.y` or
  similar; see §11). The grammar lives as code: the levels and binary
  operators are data in `src/core/expr.ts` (`LEVELS`, `BINARY`), built
  into parser combinators from `src/core/parser.ts`, with the printer in
  `src/core/print.ts` driven by the same table for the binary operators,
  so that the two cannot disagree there; the property test
  (`src/core/print.test.ts`) covers the rest (F-501). An EBNF-style
  grammar of twelve productions is hand-maintained in the header
  comment of `src/core/expr.ts` (lines 6-19) and matches the
  combinators production by production (F-500, Q-038) →
  `devdocs/architecture.md#Expressions`, `#Parsing`.
- In prose: `devdocs/architecture.md#Expressions` (precedence, the `-`
  rules, the call rule, the six node kinds) and
  `docs/definitions.md#Expressions` (the same rules by example). No
  EBNF for expressions appears in either corpus: the one that exists is
  the header comment of `src/core/expr.ts`, and
  `devdocs/functions.md#Definitions` has an EBNF-style block for function
  and inverse lines only, the function part of the line grammar in the
  header of `src/core/definitions.ts` (lines 20-32; F-500).
- **The intended end state** (owner's decision in review): the grammar
  is written once, as a TypeScript DSL with paired data structures that
  the parser and the printer are built from, and a tool generates a
  readable EBNF-style grammar from it for the references, at build time
  and shipped with the app rather than checked in (§12, question 30). `LEVELS` and
  `BINARY` are the seed of that DSL. It is a large work item of its own,
  with no new dependency, and follows the docs audit and refactor (§4.4
  lists the generated-docs work items together).
- **In the interim**, the recommendation is to document the grammar in
  prose with a precedence table and worked examples, and to write no
  hand-maintained EBNF for the expression language in the pages (the
  header grammars stay beside the code as the hand-maintained forms
  until the DSL generates one, and `devdocs/architecture.md#Expressions`
  names them, Q-038): the prose and the
  table are needed whatever the generator produces, so nothing is
  thrown away, while a hand-written EBNF would be replaced wholesale and
  would be a second source of truth to keep in step until then. Audit
  unit D1 still reads `expr.ts` to verify the prose and the table
  against the code and the property test. The alternatives: a
  hand-written EBNF now (about fifteen productions, an hour's work, and
  that second source of truth), or nothing beyond today's prose, with
  no precedence table.

#### 2.1.4 Source modules to check against

`src/core/expr.ts`, `parser.ts`, `print.ts`, `span.ts`, `evaluate.ts`,
`table.ts` (lookup and `resolveFunction`), `names.ts`, `pipeline.ts`
(`parseUnitList`, reading the `want`), `src/testing/expr.ts`,
`src/messages.ts` (parse and rejection wording), `src/outcome.ts`.

### 2.2 The definition language

#### 2.2.1 Constructs and semantics documented anywhere, by pointer

| Construct | docs/ | devdocs/ |
| --- | --- | --- |
| One definition per line; name, whitespace, body; `#` comments; blank lines; required whitespace after a unit's or prefix's name (`inch2.54 cm`) | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` |
| Primitive `!` and kind primitive `!kind` | `docs/definitions.md#The format` | `devdocs/architecture.md#Quantities…`, `#Definitions` |
| Prefix `name-` with a plain-number body | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` ("Prefix bodies must be plain numbers") |
| Unit `name body` | `docs/definitions.md#The format` | `devdocs/architecture.md#Definitions` |
| Unit list `name a;b;c`, two or more items, checked at load | `docs/definitions.md#The format`, `#Unit lists` | `devdocs/architecture.md#Definitions` (lists share the namespace, stay out of the walk, the `ms` rule) |
| Function `name(params)(: ann)?(\| conds)? = body`; zero or more parameters; no duplicate parameter | `docs/definitions.md#The format`, `#Functions` | `devdocs/functions.md#Definitions` (grammar block), `#Calls` |
| Inverse `~name(p)(\| conds)? = body`; one-parameter functions only; optional; may precede its function | `docs/definitions.md#The format`, `#Functions` | `devdocs/functions.md#Definitions`, `#Build-time checks` |
| Parameter and result annotations: unit expressions only, `1` for plain; `: 2` and `: 1000 m` rejected; checks dimension, changes no value; the result annotation checks the inferred dimension | `docs/definitions.md#Functions` | `devdocs/functions.md#Annotations` |
| Conditions after `\|`: chains of `<`, `<=`, `>`, `>=`, `≤`, `≥` one way; comma-separated conjunction; must mention a parameter; sides must conform; no `=`/`!=`/disjunction; calls allowed and followed by the walk | `docs/definitions.md#Functions` | `devdocs/functions.md#Conditions`, `#The check at a call`, `#An undecided condition` |
| Shadowing: a parameter may be named like a unit (hides it in the body); not like a unit its own head's annotations name; duplicate parameters | `docs/definitions.md#Functions` | `devdocs/functions.md#Names and shadowing` |
| Any order; cycles, duplicates, ambiguous names, prefixed-unit names for lists/functions/built-ins, dimensioned prefixes, bad lists, mismatched annotations, orphan inverses, inverse arity, zero annotations, conditions without a parameter, undecided conditions at build: errors | `docs/definitions.md#The format` (summary sentence), `#Names`, `#Unit lists`, `#Functions` | `devdocs/architecture.md#Definitions` (the build-error catalogue); `devdocs/functions.md#Build-time checks` |
| Reserved `name[` (dimension variables) | — | `devdocs/functions.md#Definitions`, `#Deferred` |
| The definitions file's sections and conventions (F-475) (`imp`/`uk` prefixes for imperial, `longton`, the three micros, binary prefixes, lists, temperature and logarithmic functions) | `docs/definitions.md#What the file contains` | `devdocs/development.md#Adding a unit`; `devdocs/functions.md#Definitions` (the five functions) |
| User definitions: supported by `buildTable`, no storage or editor today (#132, `devdocs/future.md`'s alone, Q-011); no message worded for a definitions rejection today | — (the user docs state the plain fact that only the predefined definitions file is loaded) | `devdocs/future.md#Extensions that fit`; `devdocs/functions.md#Annotations`, `#Deferred` |

#### 2.2.2 Where syntax meets the core abstractions

- **Exactness.** A unit defined by a decimal converts exactly (Q10);
  bodies are evaluated once, at the ceiling, in exact mode (Q11); a
  function's body is evaluated afresh at every pass, so a function of no
  parameters names a computed constant without fixing it in the table →
  `devdocs/functions.md#Definitions > A function has any number of
  parameters`; `approx` in a body defines a measured constant →
  `devdocs/numbers.md#approx`.
- **Dimensions.** Primitives and kinds come from the file (Q2); a prefix
  body must be dimensionless and kindless; an annotation is a dimension
  check (Q5); the result's dimension is inferred by `dimensionOf`
  without evaluating; conditions' sides must conform; a parameter
  without an annotation is a plain number → `devdocs/functions.md#Annotations`,
  `#Build-time checks`; `devdocs/architecture.md#Definitions`.
- **Name resolution.** Q9; a list's or a function's name may not read
  as a prefixed unit because the `want` and the `have` would read one
  text two ways → `devdocs/architecture.md#Definitions`.
- **Exactness of conditions.** Three-valued on balls at a call (N14);
  always decided in decimal mode; a unit defined by a call checks the
  call's conditions at build and an undecided one fails the build →
  `devdocs/functions.md#The check at a call`, `#An undecided condition`.
- **What the build does not check.** Bodies are not evaluated (a body
  that fails at some value builds); a literal in a body is not held to
  the significand limit at build, a `^` exponent is → `devdocs/functions.md#Build-time
  checks`.
- **Cost.** Calls are not memoized; a hand-written equivalent of a
  built-in is slower and loses exact cases; decimal mode rounds each
  step of a body → `devdocs/functions.md#Precision, the radius and cost`
  (triplicated; see §9).

#### 2.2.3 Formal grammar: does one exist, and how the reference documents it

- A grammar block exists in the pages for the function and inverse
  heads only (`devdocs/functions.md#Definitions`). The whole line grammar
  (primitive, prefix, unit, list, function, inverse; comments) is
  hand-maintained in the header comment of `src/core/definitions.ts`
  (lines 20-32), of which the page's block is the function and inverse
  part (F-500, Q-038), and is prose in `docs/definitions.md#The format`
  and `devdocs/architecture.md#Definitions`. The parser is
  `src/core/definitions.ts` (combinators over the same toolkit); no
  grammar file.
- **End state:** the same generated grammar as §2.1.3, with the
  definition language's productions in the same DSL, so that one tool
  emits both references' grammars.
- **In the interim:** the definition language reference documents each
  definition kind in prose by example, as `docs/definitions.md#The
  format` does, with the name rules shared with the expression reference
  by link, the build-time checks as a table of error, cause and fix, and
  the function and inverse semantics. The existing hand-written block
  for function heads stays where it is, in `devdocs/functions.md`,
  marked as hand-maintained until generated; it is not extended to the
  other kinds. Audit unit D2 reads `definitions.ts` to verify the prose
  and that block against the seeded property test described in
  `devdocs/testing.md#The random source`.

#### 2.2.4 Source modules to check against

`src/core/definitions.ts`, `build.ts`, `graph.ts`, `names.ts`,
`name-index.ts`, `table.ts`, `dimension-of.ts`, `evaluate.ts`
(`applyFunction`, `invertFunction`, `checkConditions`, `decide`),
`src/units.txt`, `src/units.test.ts`, `src/system-table.ts`,
`src/system-build.ts`, `src/messages.ts` (function and want messages).
