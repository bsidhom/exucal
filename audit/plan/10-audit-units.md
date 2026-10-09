*Section 10 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 10. Audit units

Each unit fits one focused session. Each lists its doc sections, the
source modules to read, and the read-only context. The getting started
guide has no unit; it is written last.

### 10.a Core-abstraction units (verify §1 claims against the code)

**A1. Values, exactness and exact arithmetic.** Claims N1–N5, N21's
sum/alignment part. *Sections:* `devdocs/numbers.md#(top)`, `#The types`
(only what the claims rest on), `#Exact operations`, `#Sums and
alignment`, `#Exact mode`; `docs/settings.md#How a number is held…`.
*Modules:* `src/core/rational.ts`, `scaled.ts`, `radius.ts`, `ball.ts`
(exact operations, `addBalls`, `onGrid`), `context.ts`. *Context:* §1.1.1,
§1.1.5 rows on settling and the binary exponent.

**A2. Certification, the display rule and the ratio notation.** Claims
N9–N13, N24's display part. *Sections:* `devdocs/numbers.md#Certification
and the display rule`, `#Formatting`; `devdocs/notation.md#The rule`, `#Where
a ratio is written`, `#Every literal parses back`, `#Not in decimal mode`;
`devdocs/architecture.md#The converter and its lines > The relation and the
note`, `> A unit list`; `docs/settings.md#(top)` (the two tail paragraphs),
`#(top) > Notation`, `> Rounding`. *Modules:* `src/core/display.ts`,
`ball.ts` (`certifies`, `certifiedDigits`), `scaled.ts` (`format`,
`roundTo`), `rounding.ts`, `src/outcome.ts`, `src/unit-converter.ts` (the
`≈̇` glyph). *Context:* §1.1.1, §1.1.6 items 1, 7, 12.

**A3. The retry schedule, settling and the ceiling.** Claims N7, N8,
N25's schedule part, Q11. *Sections:* `devdocs/numbers.md#Working precision
and the schedule`, `#Settling`, `#Memoized constants` (cost claims only);
`docs/settings.md#(top) > Precision limit`, `> Display digits`. *Modules:*
`src/core/pipeline.ts`, `context.ts`, `ball.ts` (`step`, `settle`),
`quantity.ts` (`stepQuantity`), `src/system-build.ts`, `src/core/constants.ts`
(memo sizing only). *Context:* §1.1.1, §1.1.6 item 4.

**A4. Decimal mode and the working digits.** Claims N17–N20. *Sections:*
`devdocs/numbers.md#Decimal mode`, `#The working digits`; `docs/settings.md#(top) > Mode`, `> Working digits`. *Modules:* `src/core/context.ts`
(`operandContext`, `checkContext`), `ball.ts` (`decimalSumApart`,
`uncertified`, `carrying`), `evaluate.ts` (literal, unit, call nodes),
`builtin.ts` (`decimal: "identity"`), `pipeline.ts` (schedule in decimal
mode), `display.ts` (uncertified), `src/outcome.ts` (last steps).
*Context:* §1.1.1, §1.1.6 items 2, 3.

**A5. Size limits, refusals and `approx`.** Claims N21–N24, N3's `approx`
part. *Sections:* `devdocs/numbers.md#The significand limit`, `#The exponent
bound`, `#Which limit a refusal names`, `#approx`, `#Failures`;
`docs/functions.md#Very large results and approx`; `docs/settings.md#(top) >
Significand limit`. *Modules:* `src/core/rational.ts` (`tooLarge`,
`Need`, `Reach`, `*Within`), `scaled.ts` (`overflow`, `underflow`,
`BOUND_BAND`, `powerRefusal`), `ball.ts` (the classifier, `powBall`,
`powRationalBall`, `widened`), `builtins/approx.ts`, `evaluate.ts`
(suggestions, the assertion), `src/messages.ts` (the three messages).
*Context:* §1.1.1, §1.1.6 items 5, 8, 9, 11.

**A6. Comparison, edges and undecided conditions.** Claims N14–N16.
*Sections:* `devdocs/numbers.md#Comparison`, `#Exact operations`
(`unresolved`); `devdocs/functions.md#The check at a call`, `#An undecided
condition`; `devdocs/builtins.md#The rules every built-in follows` (domain
vs unresolved), `#The exact functions` (on balls). *Modules:*
`src/core/ball.ts` (`position`, `orderOf`, `sideOfZero`), `evaluate.ts`
(`checkConditions`, `decide`, the collector), `builtin.ts`,
`builtins/round.ts`, `builtins/division.ts`, `builtins/abs.ts`,
`convert.ts` (`unresolvedWant`), `pipeline.ts` (retry predicate).
*Context:* §1.1.1, §1.1.6 item 6.

**A7. Dimensions, kinds, conformance and quantity arithmetic.** Claims
Q1–Q8, Q16's conformance step. *Sections:* `devdocs/architecture.md#Quantities,
dimensions and kinds`, `#Evaluation` (conformance and error location);
`devdocs/builtins.md#Dimension rules`; `devdocs/numbers.md#Decimal mode`
(dimensions bullet). *Modules:* `src/core/dimension.ts`, `quantity.ts`,
`evaluate.ts` (sums, calls), `dimension-of.ts`, `builtin.ts` (rule
helpers), `src/units.txt` (the primitive and kind declarations only).
*Context:* §1.2.1, §1.2.6 items 1, 5, 6.

**A8. Conversion and the output modes.** Claims Q13–Q18, N12's
typeable-back part. *Sections:* `devdocs/architecture.md#Conversion`, `#Unit
lists`, `#Functions` (the want), `#The converter and its lines`;
`devdocs/functions.md#A function as the want`, `#Display`;
`docs/definitions.md#Unit lists`; `docs/README.md#(top)`. *Modules:*
`src/core/convert.ts`, `pipeline.ts`, `src/outcome.ts`, `src/core/print.ts`,
`evaluate.ts` (`invertFunction`), `src/copy-button.ts` (what it copies).
*Context:* §1.2.1, §1.2.6 items 2, 3, 8, 9.

**A9. Names, the table and the system definitions' exactness.** Claims
Q9–Q12. *Sections:* `devdocs/architecture.md#Definitions`;
`docs/definitions.md#Names`, `#What the file contains` (the exactness and
`pi()` claims); `devdocs/numbers.md#Working precision and the schedule` (the
table at the ceiling); `devdocs/builtins.md#Names`. *Modules:*
`src/core/names.ts`, `name-index.ts`, `table.ts`, `build.ts`, `graph.ts`,
`src/system-build.ts`, `src/system-table.ts`, `src/units.txt`
(structure: sections, primitives, functions, which units call `pi()`,
`approx`), `src/units.test.ts`. *Context:* §1.2.1, §1.2.6 items 4, 7, 10.

### 10.b docs/ units (audit existing content and confirm gaps; §1 as read-only context)

**D1. Expression language.** *Sections:* `docs/definitions.md#Expressions`,
`#Names`; `devdocs/architecture.md#Expressions`, `#Parsing` (user-observable
parts: rejections, error positions), `#Evaluation`. *Modules:*
`src/core/expr.ts` (`LEVELS`, `BINARY`, the grammar), `parser.ts`,
`print.ts`, `evaluate.ts`, `src/messages.ts` (parse wording),
`src/testing/expr.ts`. *Output:* the precedence table and the prose verified against
`expr.ts` and the property test (no hand-written EBNF: the grammar is
generated later, §2.1.3), the want-field grammar, the pitfalls list, the open questions on `×`, `#`,
`≤`/`≥` in the fields. *Context:* A1 (literal limits), A5, A7, §2.1.

**D2. Definition language.** *Sections:* `docs/definitions.md#The format`,
`#Names`, `#Unit lists`, `#Functions`; `devdocs/functions.md#Definitions`,
`#Annotations`, `#Names and shadowing`, `#Conditions`, `#Calls`, `#Build-time
checks`; `devdocs/architecture.md#Definitions`. *Modules:*
`src/core/definitions.ts`, `build.ts`, `dimension-of.ts`, `table.ts`
(`UnitFunction`, `arityOf`), `src/units.test.ts`, `src/messages.ts`
(function and want messages), `src/core/definitions.test.ts` (the
property test's rejected pieces, as a checklist). *Output:* the line grammar's facts verified against
`definitions.ts` (the head-grammar block in `devdocs/functions.md#Definitions`
stays hand-maintained until generated, §2.2.3), the build-error table, the exactness/dimension interaction
list. *Context:* A6, A7, A9, §2.2.

**D3. The system units catalogue.** *Sections:* `docs/definitions.md#What
the file contains`; `devdocs/development.md#Adding a unit`;
`devdocs/functions.md#Definitions` (the five functions). *Modules:*
`src/units.txt` (read in full here), `src/units.test.ts`. *Output:*
verification of every claim in "What the file contains" (sections,
spellings of micro, binary prefixes, `imp`/`uk`, the lists, the absent
`u`/`at`, exact factors and their sources) and the skeleton of
`units.md`. *Context:* A9, §7 (`units.md`), §12 question 4.

**D4. Settings.** *Sections:* `docs/settings.md` (all); `devdocs/settings.md#The
model`, `#Applying a change`, `#The probe`, `#The controls` (labels and
lines); `devdocs/notation.md#The width`; `devdocs/numbers.md#The working
digits`. *Modules:* `src/settings.ts` (defaults, `rangesOf`,
`clampSettings`, `refusalOf`, `contextOf`, `ratioOf`, `STORAGE_VERSION`),
`src/settings-lines.ts` (every line's text), `src/limits.ts`,
`src/core/context.ts` (`ceilingFor`, defaults), `src/core/rounding.ts`.
*Output:* the per-setting table of §3 verified, the clamp table, the
probe procedure. *Context:* A3, A4, A5, §3.

**D5. Built-ins: the elementary families.** `pi`, `exp`, `ln`, `log10`,
`log2`, `log`, `sqrt`, `cbrt`, `pow`, `sin`, `cos`, `tan`, `asin`,
`acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `asinh`, `acosh`,
`atanh`. *Sections:* `docs/functions.md#(top)` bullets 1–6 and the
preamble paragraph; `devdocs/builtins.md#Names`, `#Arity`, `#The rules every
built-in follows`, `#Huge and tiny arguments`, `#Dimension rules`,
`#Domains, exact cases and edges`, `#The elementary routines` (edges and
exact cases only, not the algorithms). *Modules:* `src/core/builtins.ts`,
`builtin.ts`, `builtins/{pi,exp,log,roots,pow,trig,inverse-trig,hyperbolic}.ts`
(signatures, dimension rules, exact cases, domain reasons; not the
kernels). *Output:* the family-level rules and the dimension-rule table verified, stale passages tagged; no per-function entries (§4.4). *Context:* A2, A5, A6,
A7 (angles), §4.

**D6. Built-ins: `approx`, magnitude, rounding, division and integers.**
`approx`, `abs`, `sign`, `floor`, `ceil`, `trunc`, `round`, `div`, `mod`,
`gcd`, `lcm`, `factorial`, `binomial`, `doublefactorial`. *Sections:*
`docs/functions.md#(top)` bullets 7–10; `devdocs/builtins.md#The exact
functions`; `devdocs/numbers.md#approx`. *Modules:*
`builtins/{approx,abs,round,division,integers}.ts`,
`builtins/exact.test.ts` (as a checklist of exact behaviour in every
mode). *Output:* the family-level rules verified, stale passages tagged; no per-function entries (§4.4). *Context:* A4 (decimal mode), A5, A6, §4.

**D7. Built-ins: Gamma, Beta, incomplete and error functions.**
`digamma`, `gamma`, `lgamma`, `beta`, `lowergamma`, `uppergamma`,
`lowergammareg`, `uppergammareg`, `erf`, `erfc`, `incbeta`, `incbetareg`.
*Sections:* `docs/functions.md#(top)` bullets 11–16; `devdocs/builtins.md#The
Gamma and Beta families`, `#Not in this design`; `devdocs/cost.md#What the
costs come from` (for the qualitative cost notes only). *Modules:*
`builtins/{gamma,beta,incomplete,erf,incbeta}.ts` (signatures, exact
cases, domains, refusals; not `fixed-*.ts`). *Output:* the family-level rules verified, stale passages tagged, no
per-function entries (§4.4); the decision on cost sentences (§12,
question 9). *Context:* A5, §4.

**D8. Existing foundation-level content in docs/ to dissolve.**
*Sections:* `docs/functions.md#Very large results and approx`;
`docs/settings.md#How a number is held…` and the two tail paragraphs of
`#(top)` (notes and relations); `docs/definitions.md#Functions` (last
paragraph: cost and precision of calls). *Modules:* none new; cross-check
against A2/A5 findings. *Output:* for each paragraph, its destination in
`numbers.md` or `quantities.md` (§7) or devdocs, and the sentence that
replaces it where it stands. *Context:* A2, A5, §6.1, §9.1.

**D9. The index, the intro and the app's surface.** *Sections:*
`docs/README.md`; root `README.md#(top)`; `docs/settings.md#(top)` (first
paragraph and "Tapping the build number…"); `devdocs/architecture.md#UI`,
`#The shell and its parts`, `#The converter and its lines` (what the user
sees); `devdocs/offline.md#Offline behavior` (user-facing statuses).
*Modules (list only, to name the surface):* `src/unit-converter.ts`,
`copy-button.ts`, `app-footer.ts`, `register-service-worker.ts`,
`service-worker-updates.ts`, `settings-button.ts`. *Output:* the
getting-started skeleton's facts and the decision on `app.md` (§12,
question 3). *Context:* A8, §7.

### 10.c devdocs/ units (each with the docs sections and claims it touches as read-only context)

Every devdocs unit applies the principle in `audit/principles.md` to its
pages: a passage that describes a superseded design is rewritten to the
current design, keeping only the intent it carries, as rationale or as
a ruled-out alternative. The unit's output tags each such passage
"update", "keep as intent" or "drop", starting from the rows of §1.1.5,
§1.2.5 and §9.4 for its pages and adding any it finds. Where a current
page states a decision without its reason, the unit may read the
removed design note in git for that reason alone (§12, question 1).

**V1. `devdocs/numbers.md`.** All sections. *Modules:* those of A1–A6 (the
unit re-reads only where the page's statements were not covered by an A
unit: `#The kernel's boundary`, `#Memoized constants`, `#Roots and
powers`, `#Failures`). *Context:* claims N1–N25 with A1–A6 findings;
`docs/settings.md#How a number is held…`, `docs/functions.md#Very large
results and approx` (to be replaced by links to `numbers.md`); §9.1 and §1.1.5 rows for this page. *Output:* which passages become links to docs, which
stay as mechanism, which stale passages are updated, kept as intent or dropped.

**V2. `devdocs/architecture.md`.** All sections. *Modules:* those of A7–A9
and D1 (`pipeline.ts`, `evaluate.ts`, `convert.ts`, `table.ts`,
`build.ts`, `expr.ts`, `parser.ts`, `print.ts`; the UI modules by header
only). *Context:* claims Q1–Q19; `docs/definitions.md#Expressions`,
`#Names`, `#Unit lists`; §9.1 (precedence, lists, calls duplication), §1.2.5 (the pipeline diagram). *Output:* the pared "Expressions", "Definitions",
"Unit lists" sections that link to the references; the UI sections
checked against `app.md`'s decision.

**V3. `devdocs/builtins.md`.** All sections. *Modules:* `builtin.ts`,
`builtins.ts`, `builtins/*.ts` (as in D5–D7), `fixed-*.ts` by header only.
*Context:* D5–D7 entries; claims N6, N15, N21, N22, Q5, Q8; §9.1 (angle rules, cost figures), §1.1.5 rows for this page. *Output:* the user-rule passages replaced by links
to `functions.md` entries; the algorithms, bounds and measurements kept.

**V4. `devdocs/functions.md`.** All sections. *Modules:* `definitions.ts`,
`build.ts`, `dimension-of.ts`, `evaluate.ts`, `pipeline.ts`, `outcome.ts`
(as in D2 and A6/A8). *Context:* D2 output; claims N14–N16, Q3, Q5, Q16;
`docs/definitions.md#Functions`; §9.1 (triplicated cost paragraph), §1.2.5 (the unworded rejection). *Output:* `#Calls`, `#Display`, `#Conditions`
reduced to links plus mechanism; "Deferred" and "Alternatives
considered" kept as intent, the ruled-out alternatives and deferred designs with their reasons.

**V5. `devdocs/notation.md` and `devdocs/settings.md`.** All sections.
*Modules:* `display.ts`, `outcome.ts`, `settings.ts`, `settings-lines.ts`,
`settings-panel.ts`, `limits.ts`, `app-shell.ts` (headers). *Context:* D4
output; claims N11, N13, N19; `docs/settings.md`; §9.1 (representation,
the sheet), §9.4 (`ABOUT`, "six settings"). *Output:* `#The model`
rewritten to build on `numbers.md` and `settings.md`; the storage,
probe, sheet and controls kept as design.

**V6. `devdocs/future.md` and `devdocs/cost.md`.** All sections. *Modules:*
`bench/stress/*` by header; `pipeline.ts` (`PassObserver`). *Context:*
claims N7, N25; `docs/functions.md` cost sentences; §9.4 (stale counts in
cost.md's prose). *Output:* the prose of cost.md reconciled with its
tables or dated; future.md's "Extensions that fit" checked against the
issue list in both corpora.

**V7. `devdocs/layout.md`, `devdocs/testing.md`, `devdocs/benchmarks.md`.** All
sections. *Modules:* the tree (§11) against `layout.md#The modules`; test
and bench files by name. *Context:* §11; §9.4 rows for these pages; no docs dependency. *Output:*
the module table reconciled with the tree (e.g. `exact.test.ts` listed
among modules; `fixed-incbeta.ts` without a test), and the
"what a test may depend on" claims checked against the settings' hard
bounds (A5).

**V8. `devdocs/README.md`, `devdocs/development.md`, `devdocs/offline.md`,
`devdocs/deployment.md`, `devdocs/security.md`.** All sections. *Modules:*
`scripts/*`, `.claude/*`, `vite-plugin-*.ts`, `src/sw.ts`,
`src/register-service-worker.ts`, `src/service-worker-updates.ts`,
`wrangler.jsonc`, `package.json`, `pnpm-workspace.yaml` (headers and
settings only). *Context:* D9 output; `docs/README.md`;
`docs/settings.md#(top)` update paragraph; §9.4 (the development page's row); §12 question 1 (the removed notes). *Output:* `devdocs/README.md`'s page list and framing
revised to the new docs/ outline; the user-facing update/offline facts
moved to `app.md` or getting started with links back; the principle of
`audit/principles.md` installed in `devdocs/development.md#Style guide`
beside the existing rule on code comments, and linked from
`devdocs/README.md` (pending §12, question 29).
