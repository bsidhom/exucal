*Section 9 of the audit plan. The index, the pointer conventions and the test for history are in [plan.md](../plan.md).*

## 9. Preliminary structural observations (from the docs alone; unverified)

### 9.1 Cross-corpus duplication

- **The exponent bound and `approx`.** `docs/functions.md#Very large results
  and approx` and `devdocs/numbers.md#Why the exponent bound stays at 10^18`
  both carry the six-pass table of `approx(1e999)`, the "what `approx`
  relaxes" examples and the log-space advice; the docs version adds an
  ASCII diagram and the issue (#40). Owner should be `numbers.md`
  (docs) for the rule and `devdocs/numbers.md` for the table and the
  scratch-build measurements.
- **The representation.** `docs/settings.md#How a number is held…`
  restates `devdocs/numbers.md#The types` (fraction, power of ten, radius,
  grid), `devdocs/settings.md#The model › The terms` and `› The two limits
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
  `devdocs/architecture.md#Unit lists`, `#The converter and its lines › A
  unit list`.
- **Conditions' three-valued check and "why conditions differ from the
  built-ins' edges".** `docs/definitions.md#Functions` and
  `devdocs/functions.md#The check at a call`, `#An undecided condition`.
- **The sheet.** `docs/settings.md#(top)` (first paragraph) and
  `devdocs/settings.md#The sheet`, `#The controls` (heights, Done/Escape,
  steppers, the three groups, the "default …" link).
- **The update check.** `docs/settings.md#(top)` ("Tapping the build
  number…") and `devdocs/offline.md#Offline behavior › Update checks`,
  `› The worker's status`.
- **The intro.** Root `README.md#(top)` and `docs/README.md#(top)` are the
  same two paragraphs.
- **Gamma-family cost figures.** `docs/functions.md#(top)` (gamma bullet:
  "about half a second the first time and a tenth of a second a call
  after"), `devdocs/builtins.md#The Gamma and Beta families` ("0.12 s …
  0.45 s and 1.2 s"), `devdocs/cost.md#What the costs come from` ("0.6 to
  2 s a call"): three sets of numbers for one thing.
- **The call rule (`kg (m/s)` vs `kg(m/s)`).** `docs/definitions.md#Expressions`
  and `#Functions` (twice within docs), `devdocs/architecture.md#Expressions`,
  `devdocs/functions.md#Calls`.
- **Angle rules.** `docs/functions.md#(top)` bullets 4–5 and
  `devdocs/builtins.md#Dimension rules › Angles` (the latter adds the
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
  `devdocs/settings.md#(top)` and `#The controls` (the `ABOUT` link),
  `devdocs/layout.md#The files` each point at docs as "the user's side" and
  then re-explain the user semantics. After the foundation pages exist,
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
- The system units catalogue: `docs/definitions.md#What the file contains`
  only, inside a language page.
- Installation, offline, updates: `docs/README.md`, `docs/settings.md`,
  `devdocs/offline.md`.
- Latency expectations for users: `docs/functions.md` (gamma bullet) and
  `docs/settings.md` ("a limit on effort") against `devdocs/cost.md`.
- Name resolution: `docs/definitions.md#Names` (a definitions page) owns
  a rule that governs every expression.

### 9.4 Passages that read as current but are history, plans, interim state or cruft

Each with its classification by the test at the top of this plan.

- `devdocs/README.md#(top)`: "current-state documents, not a history" is
  the principle of `audit/principles.md` in one sentence; keep, and link
  to the principle once it is installed (§12, question 29).
- `docs/definitions.md#(top)`: "This section describes that file" is left
  over from the page's life as a README section. Cruft; fix.
- `docs/functions.md#(top)`: "Beside the functions the file defines" with
  "the file" undefined on the page. Cruft; fix.
- `docs/settings.md#(top) › Probe budget` and the paragraph "The limits are
  set top-down": the probe "times the costliest exact product and the
  costliest built-ins", while `devdocs/settings.md#The probe` says the
  composite is the four elementary routines, deliberately not the
  costlier Gamma family. Correctness; fix the docs.
- `devdocs/cost.md#What the costs come from` ("Typing out the 229 entries …
  16,548 keystrokes") against `#What the search has not reached` ("714
  cases in all") and tables of 344 and 47 rows. Counts that the tool
  regenerates, carried in hand-revised prose; drop the counts from the
  prose or have the tool write them.
- `devdocs/architecture.md#Pipeline`: the diagram ends in `format ──▶
  string` while the text names `show`, `roundTerms` and `outcomeOf`.
  Possibly a stale name; fix.
- `devdocs/numbers.md#The working digits` (last paragraph): the unsettled
  vocabulary around `working`, #172 open. Open decision; trim to one
  sentence plus the issue.
- `devdocs/numbers.md#Decimal mode`: "Two rulings are provisional", #173.
  Open decisions with their reasons; keep.
- `devdocs/numbers.md#Working precision and the schedule`: "they moved
  once, from a fixed ceiling of a thousand digits…". Quirk; drop, keeping
  that four and ten are judgments.
- `devdocs/numbers.md#The types › Scaled` (the division's 0.2 ms against
  0.04 ms "when the base was chosen"), `#Exact operations` (Lehmer against
  Euclid at 65,536 bits), `#Why the exponent bound stays at 10^18` (the
  scratch build's timings), `#Formatting` (what a settle costs),
  `devdocs/builtins.md` (per-routine costs at the ceiling),
  `devdocs/future.md#Ruled out` (`pi` in 0.4 ms). Measurements that justify
  decisions but that no tool regenerates. *Uncertain*; see §12,
  question 25.
- `devdocs/builtins.md#Huge and tiny arguments`: "(`acos(1e-9860)` was
  refused at the default limit)". Quirk inside a current rule; drop the
  parenthetical, keep the rule.
- `devdocs/architecture.md#Parsing`: "(The call rule broke it once: …)".
  The reason the lookahead is used and the cut was set aside is a
  decision-against; keep the reason, drop the narrative.
- `devdocs/testing.md#Type-checking` "(one did, until the projects were
  made to match by pattern)" and `#(top)` "three of them once failed
  unnoticed for a whole stage". Each is the reason a rule exists (the
  coverage test; the benchmarks in `test:all`); keep as one clause each,
  without the narrative.
- `devdocs/functions.md#Annotations`: "No message is worded for a
  definitions rejection today … the wording meant for this one is …".
  Interim state; keep the intended wording in one sentence plus #132
  while that issue is open, drop it when it lands.
- `devdocs/settings.md#The controls`: the `ABOUT` link "until the guide
  lands (#191)". Interim state; one clause plus the issue until the guide
  exists, then nothing.
- `docs/settings.md#(top)`: "There are six settings" against eight
  controls. Wording; fix.
- `docs/functions.md#(top)` (gamma bullet): the memo's growth rule stated
  one way, `devdocs/builtins.md` another (a larger run replaces a smaller
  one). State the current rule once, in devdocs; the docs keep the
  qualitative cost sentence only.
