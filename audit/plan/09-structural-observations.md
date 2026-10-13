*Section 9 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 9. Preliminary structural observations (from the docs alone; unverified)

Amended on 2026-10-12 (§12, section 12.1): the units verified these
observations, and `audit/findings.md` records the outcome of each; the
rows and bullets below carry the owner's answers where they change one.

### 9.1 Cross-corpus duplication

- **The exponent bound and `approx`.** `docs/functions.md#Very large results
  and approx` and `devdocs/numbers.md#Why the exponent bound stays at 10^18`
  both carry the six-pass table of `approx(1e999)`, the "what `approx`
  relaxes" examples and the log-space advice; the docs version adds an
  ASCII diagram and the issue (#40). Owner should be `numbers.md`
  (docs) for the rule and `devdocs/numbers.md` for the six-pass table of
  digits, the scratch build's per-size milliseconds going (Q-017, which
  governs that section over Q-016's rule; F-510).
- **The representation.** `docs/settings.md#How a number is held…`
  restates `devdocs/numbers.md#The types` (fraction, power of ten, radius,
  grid), `devdocs/settings.md#The model > The terms` and `> The two limits
  meet in the grid` (the 2,453 derivation, "a grid point is itself a
  significand"), and `devdocs/numbers.md#The significand limit` (the dyadic
  `2^-30000` cost, `3^-100000`).
- **Calls not memoized / hand-written vs built-in / dependency problem.**
  Triplicated: `docs/definitions.md#Functions` (last paragraph),
  `devdocs/functions.md#Precision, the radius and cost`,
  `devdocs/architecture.md#Functions` (last paragraph).
- **Precedence and the `-` rules.** `docs/definitions.md#Expressions` and
  `devdocs/architecture.md#Expressions` each state the full set, the
  latter saying the former "describes it from the user's side" and then
  restating it.
- **Unit-list rounding and zero terms.** `docs/definitions.md#Unit lists`,
  `devdocs/architecture.md#Unit lists`, `#The converter and its lines > A
  unit list`.
- **Conditions' three-valued check and "why conditions differ from the
  built-ins' edges".** `docs/definitions.md#Functions` and
  `devdocs/functions.md#The check at a call`, `#An undecided condition`.
- **The panel.** `docs/settings.md#(top)` (first paragraph) and
  `devdocs/settings.md#The sheet` (retitled "The panel", F-488), `#The
  controls` (heights, Done/Escape, steppers, the three groups, the
  "default …" link); resolved by moving the mechanics to `docs/app.md`,
  the devdocs section opening with a link to it (F-176).
- **The update check.** `docs/settings.md#(top)` ("Tapping the build
  number…") and `devdocs/offline.md#Offline behavior > Update checks`,
  `> The worker's status`.
- **The intro.** Root `README.md#(top)` and `docs/README.md#(top)` are the
  same two paragraphs.
- **Gamma-family cost figures.** `docs/functions.md#(top)` (gamma bullet:
  "about half a second the first time and a tenth of a second a call
  after"), `devdocs/builtins.md#The Gamma and Beta families` ("0.12 s …
  0.45 s and 1.2 s"), `devdocs/cost.md#What the costs come from` ("0.6 to
  2 s a call"): three sets of numbers for one thing (the user docs keep
  none, Q-016; the devdocs keep rough figures marked as such, Q-018).
- **The call rule (`kg (m/s)` vs `kg(m/s)`).** `docs/definitions.md#Expressions`
  and `#Functions` (twice within docs), `devdocs/architecture.md#Expressions`,
  `devdocs/functions.md#Calls`.
- **Angle rules.** `docs/functions.md#(top)` bullets 4–5 and
  `devdocs/builtins.md#Dimension rules > Angles` (the latter adds the
  rationale, which is right; the rules themselves are stated twice).

### 9.2 Links against the ownership direction

- docs → devdocs (docs must not depend on devdocs): `docs/settings.md`
  seven times (`#(top)`: "`devdocs/settings.md` is the design", "`devdocs/
  numbers.md`, 'Decimal mode'", "`devdocs/notation.md` is the design",
  "`devdocs/numbers.md` ('The working digits')", "see devdocs/offline.md";
  `#How a number is held…`: "Why four times the limit plus ten …
  `devdocs/numbers.md`"); `docs/functions.md#Very large results and approx`
  ("recorded … in `devdocs/numbers.md`"); `docs/README.md#(top)` (the
  index link to `devdocs/README.md`, acceptable as navigation).
- devdocs → docs exist but do not "build on" docs: `devdocs/architecture.md#Definitions`
  and `#Expressions`, `devdocs/builtins.md#(top)`, `devdocs/functions.md#(top)`,
  `devdocs/settings.md#(top)` and `#The controls` (the `ABOUT` link)
  each point at docs as "the user's side" and then re-explain the user
  semantics (`devdocs/layout.md#The files` is struck from the list: its
  bullet is one sentence and a link, F-504, F-366, Q-077). After the foundation pages exist,
  these passages should shrink to a link plus what is mechanism.
- devdocs → docs for the *settings' semantics* is inverted today: the
  user-level rules of the modes, notation and limits are fuller in
  `devdocs/numbers.md` and `devdocs/settings.md#The model` than in
  `docs/settings.md`, which links down to them.

### 9.3 Concepts without a clear owner

- The output lines (relation, notes, warnings, reciprocal, list lines,
  function lines, parenthesization): split across
  `devdocs/architecture.md#The converter and its lines`,
  `devdocs/numbers.md#Certification…`, `devdocs/notation.md#Where a ratio is
  written`, `devdocs/functions.md#Display`, `docs/settings.md#(top)` (tail
  paragraphs), `docs/definitions.md#Unit lists`.
- The `want` field's grammar: `devdocs/architecture.md#Pipeline`, `#Unit
  lists`, `#Functions`; `docs/definitions.md#Unit lists`, `#Functions`.
- The exponent bound: `docs/functions.md`, `docs/settings.md`,
  `devdocs/numbers.md`.
- `approx`: `docs/functions.md` (two places), `devdocs/numbers.md#approx`,
  `devdocs/builtins.md`.
- Error messages: `src/messages.ts` has no page; quoted messages are
  spread over every page.
- The units catalogue (the definitions file's contents, F-475):
  `docs/definitions.md#What the file contains` only, inside a language
  page.
- Installation, offline, updates: `docs/README.md`, `docs/settings.md`,
  `devdocs/offline.md`.
- Latency expectations for users: `docs/functions.md` (gamma bullet) and
  `docs/settings.md` ("a limit on effort") against `devdocs/cost.md`.
- Name resolution: `docs/definitions.md#Names` (a definitions page) owns
  a rule that governs every expression.

### 9.4 Stale passages elsewhere, tagged

Passages outside the core-abstraction pages that describe a superseded
design, an interim state, or a count a tool regenerates, tagged as in
§1.1.5: **update**, **keep as intent** or **drop**.

| Where | Stale passage | Tag | What the rewrite keeps |
| --- | --- | --- | --- |
| `docs/definitions.md#(top)` | "This section describes that file" | update | the page is no longer a README section |
| `docs/functions.md#(top)` | "Beside the functions the file defines", with "the file" undefined on the page | update | name the definitions file |
| `docs/settings.md#(top)`, the "The limits are set top-down" paragraph (not the Probe budget bullet, F-512) | the probe "times the costliest exact product and the costliest built-ins" | update | the composite is the four elementary routines, deliberately not the costlier special functions (`devdocs/settings.md#The probe`); the wording follows F-491 |
| `docs/settings.md#(top)` | "There are six settings", against eight controls | update | no count at all: list the controls grouped and nested by mode (§12, question 16) |
| `docs/functions.md#(top)` (gamma bullet) | "computed once per page load for each precision asked for beyond the last and kept" | update | the current rule stated once, in devdocs (a larger run replaces a smaller one); the docs keep a qualitative cost sentence |
| `devdocs/cost.md#What the costs come from`, `#What the search has not reached` | "Typing out the 229 entries … 16,548 keystrokes"; "what four runs found, 714 cases in all" | update | counts the tool regenerates do not belong in hand-revised prose: drop them, or have the tool write them |
| `devdocs/settings.md#The controls` | "pointing at docs/settings.md until the guide lands (#191)" | update | what the link points at, and nothing about what is pending (Q-011; #191 closes when `docs/settings.md` lands with this refactor) |
| `devdocs/settings.md#The controls` | "(sentences as options once made the panel overflow a phone; `min-width: 0` on the labels is a belt to that)" | keep as intent | a select is as wide as its widest option, so the options are bare names and `min-width: 0` on the labels keeps a long one from overflowing a phone |
| `devdocs/testing.md#(top)` | "three of them once failed unnoticed for a whole stage, two of them before reaching their assertions" | keep as intent | why the benchmarks run in `test:all`: a benchmark left out of it fails unnoticed, often before reaching its assertion |
| `devdocs/testing.md#Type-checking` | "(one did, until the projects were made to match by pattern)" | drop | the reason is already stated in the present tense |
| `devdocs/testing.md#Type-checking` | "the kernel's modules once formed an initialization cycle through `fixed.ts`, `ball.ts` and `context.ts` that only such imports kept alive, so that a module's top level ran before its constants existed…" | keep as intent | why every type-only import is `import type`: an `import { type X }` still loads its module, so an initialization cycle among the kernel's modules would run a module's top level before its constants exist |
| `devdocs/benchmarks.md#What each benchmark asserts` | "(it costs about the same; before the index it cost fifty times as much)" | keep as intent | what the benchmark guards: without the index the check costs fifty times as much |
| `devdocs/development.md#Commands` | "(The one place the flag is still written out is the cloud session hook, so that the hook reads as what it does.)" | update | the hook writes the flag out so that it reads as what it does; no "still" |
| `devdocs/builtins.md#The Gamma and Beta families` (last paragraph); `devdocs/future.md#Ruled out, and why` | "Ruled out as built-ins: the general hypergeometric functions, Bessel `Y` and `K`…, the polygamma functions beyond `digamma`, `gamma` of a complex argument, and the statistical distributions" | update | deferred for now, with a possible implementation to follow (Q-010): described in `devdocs/future.md#Extensions that fit` ("More special functions") with the reasons kept and the note that not every function is efficient as a definition; `builtins.md` names them only as absent and links there, and `docs/builtins.md` states what is not provided as a plain fact (F-348, Q-011) |
