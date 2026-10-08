*Section 11 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 11. User-facing surface files (from the tree; not read)

For later mechanical coverage checks. No grammar file (`.peg`, `.ebnf`,
`.y`, `.pegjs`, `.ohm` or similar) exists anywhere in the tree.

**Expression language parser and grammar**
- `src/core/expr.ts` — `Expr`, `parseExpr`, `parseUnitList`, `Rejection`;
  the grammar's levels and binary operators as data (`LEVELS`, `BINARY`).
- `src/core/parser.ts` — the parser combinators both grammars are built
  from.
- `src/core/print.ts` — the printer (canonical text; the inverse of
  `parseExpr`).
- `src/core/span.ts` — spans.
- Semantics the reference must match: `src/core/evaluate.ts`,
  `src/core/pipeline.ts` (how the `want` is read), `src/core/table.ts`
  (name and function resolution), `src/core/names.ts`.
- Tests that encode the grammar: `src/core/expr.test.ts`,
  `src/core/parser.test.ts`, `src/core/print.test.ts`,
  `src/testing/expr.ts`.

**Definition language parser and grammar**
- `src/core/definitions.ts` — `Definition`, `parseDefinitions`, the head
  grammar, the rejections.
- Semantics: `src/core/build.ts`, `src/core/graph.ts`,
  `src/core/names.ts`, `src/core/name-index.ts`, `src/core/table.ts`,
  `src/core/dimension-of.ts`, `src/core/evaluate.ts` (`applyFunction`,
  `invertFunction`, `checkConditions`).
- Tests: `src/core/definitions.test.ts`, `src/core/build.test.ts`,
  `src/units.test.ts`.

**Built-in function registry**
- `src/core/builtins.ts` — `BUILTINS`, the map by name.
- `src/core/builtin.ts` — the `Builtin` type (name, arity range,
  dimension rule, function), error types, rule helpers.
- `src/core/builtins/abs.ts`, `approx.ts`, `beta.ts`, `division.ts`,
  `erf.ts`, `exp.ts`, `gamma.ts`, `hyperbolic.ts`, `incbeta.ts`,
  `incomplete.ts`, `integers.ts`, `inverse-trig.ts`, `log.ts`, `pi.ts`,
  `pow.ts`, `roots.ts`, `round.ts`, `trig.ts` (18 modules, one function
  or family each; each with a `*.test.ts` beside it).
- `src/core/builtins/exact.test.ts` — the exact functions through the
  pipeline in every mode.
- `src/core/edges.sweep.ts` — enumerates `BUILTINS` by arity (a second
  source for the completeness check).

**Unit definitions**
- `src/units.txt` — the system definitions file (units, prefixes,
  primitives, lists, functions and inverses).
- `src/units.test.ts` — builds the file and checks the list of lists.
- `src/system-table.ts`, `src/system-build.ts` — loading and building.

**Settings**
- `src/settings.ts` — `Settings`, `ModeSetting`, `Notation`, `Working`,
  defaults, ranges (`rangesOf`), clamps, refusals, storage and
  migrations, `contextOf`, `ratioOf`.
- `src/settings-lines.ts` — every line, label, refusal and proposal text
  the sheet shows.
- `src/settings-panel.ts` — the controls.
- `src/limits.ts` — the probe (`recommendLimits`).
- `src/core/context.ts` — `NumberContext`, `ceilingFor`, the defaults.
- `src/core/rounding.ts` — `RoundingMode`, `ROUNDING_MODES`.
- `src/core/rational.ts` (`MAX_SIGNIFICAND_LIMIT_BITS`,
  `MIN_SIGNIFICAND_LIMIT_BITS`), `src/core/scaled.ts` (`MAX_EXPONENT`) —
  the hard bounds the ranges quote.

**Messages and output (for an error and line catalogue)**
- `src/messages.ts` — every error as a sentence.
- `src/core/display.ts` — the kinds and notes.
- `src/outcome.ts` — the lines, the reciprocal, the warnings.
