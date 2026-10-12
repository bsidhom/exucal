# Work order 15: `devdocs/builtins.md` (Built-in functions)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V3 (L81-110)` is `audit/reports/V3/fable.md`, lines 81 to 110. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§4` is
`audit/plan/04-built-in-functions.md` (amended), `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/builtins.md`, "Built-in functions": the design of
  the built-ins, which is the mechanism (the routines and kernels, the
  series and their memos, the exact functions' rules on balls, the
  families' algorithms), each decision with its reason, and the
  alternatives ruled out; for every user-facing rule it links
  `docs/builtins.md`, the owner, instead of restating it (§7.1; §4.4;
  F-304).
- **Order.** Fifteenth: after the user pages it links
  (`docs/builtins.md`, `docs/numbers.md`, `docs/quantities.md`,
  `docs/expressions.md`) and after `devdocs/numbers.md`,
  `devdocs/architecture.md` and `devdocs/functions.md`, which it links
  (Q-008). Later pages link it, so these headings stay: `#The Gamma and
  Beta families` (linked by `devdocs/cost.md`, `devdocs/future.md` and
  `devdocs/numbers.md` for the Bernoulli memo's footprint, #103),
  `#Dimension rules`, `#The exact functions`, `#Not in this design`;
  no heading is renamed without updating every link to it. This page
  links `devdocs/cost.md` and `devdocs/future.md`, written later, at
  their current headings (`cost.md#What the costs come from`,
  `cost.md#The hangs`, `future.md#Extensions that fit`); a later page
  that renames one updates the inbound links in its own rewrite.
- **Status.** Ready once the code track's batch 1 (B-068: the notes
  this page quotes say "certified"; B-002) and batch 2 have landed:
  B-001 (`gcd(a, 0)`, Q-050) and B-005 (`mod`'s alignment refusal,
  Q-044) decide which text `#The exact functions` carries (section 4).
  V3 audited the whole page (its edits, V3 L81-740); D5, D6, D7, A6, A7
  and A9 drafted passages that overlap V3's (section 7).
- **Output.** The page in one pass; the text of the families' last
  paragraph on the deferred function classes (page L876-894; V3
  L667-718, D7 L217-218) handed to work order 18 (`devdocs/future.md`,
  "More special functions"); and in the pull request the choices made
  and any question for the owner.
- **Not in scope.** `docs/builtins.md` (work order 07); the structured
  comments and the generated reference (§4; Q-114: the tables stay
  here until it exists); the code (B-001, B-005, B-015, B-020, B-045,
  B-046, B-051, B-057 are the code track's, work order 00).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `docs/builtins.md` (the rules
every built-in follows; each function's domain, exact cases, edges and
cost; what is not provided, as a plain fact with what to write
instead), `docs/numbers.md` (exactness and inexactness, certification,
the two limits, edges, `approx`, what costs time), `docs/quantities.md`
(dimensions, kinds, the radian kind) and `docs/expressions.md` (calls
and arity); and the developer pages `devdocs/numbers.md` (the ball, the
schedule, settling, the exponent bound, the significand limit, the
memoized constants), `devdocs/architecture.md` (evaluation) and
`devdocs/functions.md` (the defined functions, which a built-in's name
may not be taken by). Each section of this page opens with one
sentence linking the `docs/builtins.md` section that owns the rule it
builds on (V3's map, V3 L63-73; F-304), and then keeps the mechanism,
the decisions with their reasons and the alternatives, in the present
tense.

## 3. Rules that bind the page, applied to the drafts

- **Future work is `devdocs/future.md`'s alone (Q-011, Q-010, Q-014,
  Q-104, Q-035).** The families' last paragraph (page L876-894) no
  longer describes what is deferred: one sentence says that the
  hypergeometric functions, Bessel `Y` and `K` and the Bessel functions
  at large argument, polygamma beyond `digamma`, `gamma` of a complex
  argument and the statistical distributions are not built-ins today,
  and links `future.md#Extensions that fit` ("More special functions"),
  where their reasons and the distributions' note now live (F-290,
  F-348); the eight designed functions (`zeta`, `lambertw`, `ellipk`,
  `ellipe`, `legendre`, `chebyshev`, Bessel `J` and `I`) are named in
  the same sentence, with #115's link kept here in a one-line mention
  (the owner's list, item 1, confirmed; F-417); V3 L675-704's
  and D7 L217-218's descriptions of the eight and of the classes are
  the text handed to work order 18. The word "deferred" is not used
  on this page. #98 leaves the `round` bullet (D6 L148 and L152, V3
  L508 and L518: "Rounding to significant digits is #98" goes; F-413,
  Q-014). #100 leaves the rules bullet: "the two-argument `approx`
  (#100)" (D5 L154 = V3 L173) becomes "the two-argument `approx`,
  which `devdocs/numbers.md#approx` names" (one clause, no issue;
  F-414, Q-104). `#Not in this design` states the plain fact on
  complex values and links `future.md` ("Complex numbers"), without
  #98 or #100 (D7 L227-228 dropped; F-302).
- **Bugs and performance problems stay with the passage that owns the
  concept (Q-012, A).** #63 and #65 are linked inline, once, at `#Huge
  and tiny arguments` (D5 L160, V3 L310-312; F-303). #103 keeps its
  one link in the Bernoulli paragraph (F-415). The cost issues leave
  for `devdocs/cost.md`, which keeps their one link each: this page
  names the regime, the shift or the hang in words and links
  `cost.md#What the costs come from` (#107 at V3 L596 and L611, D7
  L205-206; #125 at V3 L560 and L572, D7 L197; #149 at V3 L604 and
  L619, D7 L209; #150 at V3 L648 and L664, D7 L215) or `cost.md#The
  hangs` (#151 and #152 at V3 L672-673 and D7 L218; #152 again at
  `expFixed`'s bullet, V3 L446 and L455, D5 L173), never the number
  (F-416, F-420, F-422 to F-425). #112 stays linked once in the
  families paragraph (the owner's list, item 10, confirmed). #200,
  the exact cases `log` does not look for (B-007), is linked once at
  the logarithm row of `#Domains, exact cases and edges` (item 14;
  Q-012's rule for a bug in today's behaviour).
- **Refusal only for a size refusal (F-442, F-443).** "Refuses" and
  "refusal" stay where the outcome is `tooLarge` (the hull of a wide
  argument, `exceeds`, Q-058: V3 L299, L308, L625, L632; the
  factorial past the significand limit, D7 L194; a count the integer
  functions cannot give, F-288). Everywhere else the word is "error":
  the integer functions "report a `domain` error" on an inexact
  argument (D6 L144's "refuse it as a `domain` error"; F-280); "the
  errors for a non-integer or an inexact argument point at…" (D6
  L184's "The refusals of a value `factorial` does not take"; F-282);
  V3 L101's "what each one computes, accepts and refuses" reads "what
  each one computes, what it accepts, and what is an error or refused
  for size".
- **Which numbers the page keeps (Q-016, Q-018, Q-088; F-510).** A
  measured ratio and a count stay; a rough timing may stay only marked
  as rough and illustrative where it adds weight; a figure the
  catalogue of `cost.md` contradicts never. So: the per-routine
  timings of `#The elementary routines` (page L388-392; V3 L426) stay
  as rough figures or leave for `bench/kernel.bench.ts`, the
  qualitative reason staying either way (F-276); "tens of milliseconds
  a sum" may stay as a rough duration (F-277, Q-018); the Bernoulli
  run's "half a second … about two" (D7 L190, V3 L531) becomes the
  ratio or a rough figure (F-291); the Gamma costs (D7 L196-197, V3
  L558) become D7's ratio wording, "several times one on an exact
  argument", never the ordering V6 questions (F-354 in `cost.md`); the
  incomplete gamma's and the incomplete beta's timings become one
  qualitative sentence each, the convergent counts staying (F-295,
  F-299); the `erf` timing goes (F-296); the memory figures, ratio
  counts, convergent counts and term counts stay as the schedule's
  reasons (F-300); "about 181,727" stands as the code comment states
  it (F-264).
- **"Certified" (Q-006, F-427).** "no digit certain" (page L191; V3
  L252) reads "no digit certified"; every quoted note says
  "certified" (B-068 first).
- **The words (§8).** "Dimensionless" and "plain number" are synonyms,
  each defined once on the page, "plain number" wherever the code's
  rules and messages are quoted, with one gloss sentence in
  `#Dimension rules` (Q-019, F-460; A7's definition, A7 L229-291);
  "dimensionless checks" (F-461, D5's wording); "the working
  precision" of a pass, never for the grid (F-431; D6 L144 is right);
  "decimal exponent" may stay, devdocs-only (F-440; V3 L226, L235);
  "the hard bound", glossed once where it first appears (F-441; V3
  L454, L672); "edge", "boundary", "bound", "touch", "straddle" as §8
  has them (F-447); "rounding boundary", "tie", "grid point",
  "half-way mode" (F-446); door, boundary, whole range, saturates, ulp,
  F-division glossed once each (F-449); "the definitions file", with
  `src/units.txt` as its path, never "the system file" (F-475; V3
  L101); "defined function", never "user-defined" (F-478); the
  radian "kind" (Q-019; B-057 is the code's marker); the links to the
  user reference are `../docs/builtins.md` and its section anchors,
  never `docs/functions.md` (Q-020's note; V3 L91, L102, L360, L383,
  L415, L498).
- **Markdown (principles).** Inline links; the thirteen reference
  definitions (page L905-917) are deleted with their last user
  (F-303); the incomplete beta block broken by a formatter is
  re-flowed once, its content corrections in the same edit (F-289).

## 4. The page, section by section

- **(top).** V3 L81-110: the user-side list becomes a sentence and a
  link to `../docs/builtins.md` (F-257); V3 L101 under F-442 (section
  3); the definitions file named as such.
- **Names.** D5 L147-150, V3 L112-129 or A9 L247-255 for the prefix
  bullet (F-258, Q-086): one text covering both readings, that nothing
  reads a call's name in parts, so one built-in's name may begin
  another's (`log` and `log10`, `atan` and `atan2`), and a name that
  reads as a prefix followed by another's (`asin`) is only itself,
  since no prefix is tried on a call; D5's edit 7 on `W` and
  `lambertw` (D5 L149; F-259, Q-034).
- **Arity.** V3 L131-147: the first sentence links
  `docs/expressions.md#calls-and-arity`; "a wrong count is an error"
  (F-260).
- **The rules every built-in follows.** V3 L149-240 (F-261): the
  exact-case bullet (L149-167) links
  `docs/numbers.md#operations-that-stay-exact-exact-cases-of-functions`;
  the #100 clause (L169-182) as section 3 has it; the wide-argument
  bullet (L184-198): "a radius of one half for `asinh`, `tanh` and
  `exp`" if the test at `src/core/builtins/hyperbolic.ts:218` bounds
  the radius, "a width" if it bounds the width, which the session
  settles (F-263, low confidence; B-051 is the comment); the domain
  bullet (L200-221) with A6's list of the edges a message can name
  (A6 L386-398; F-262); the exponent-bound bullet (L223-240) links
  `docs/numbers.md#values-too-big-to-hold`; "about 181,727" stays
  (F-264).
- **Huge and tiny arguments.** D5 L156-160 and V3 L242-313: the
  `acos(1e-9860)` aside deleted, the sentence ending "long before
  `2^-significandLimitBits`" (F-266); "no digit certified" (V3 L252);
  the second bullet rewritten whole, D5 L159 or V3 L269-293, the same
  facts (F-265, design changed); #63 and #65 inline (F-303);
  `log10(1e999999999)` "exactly `999999999`" stays as a statement
  about the value (F-267, Q-066); the `erf` tiny-argument rule is
  stated once: the session checks D7's threshold (`src/core/builtins/erf.ts:13-20`)
  against the first bullet (page L188-190) and corrects the bullet if
  D7's reading holds, else drops D7's sentence (F-297).
- **Dimension rules.** D5 L162-164, V3 L315-329 and A7 L247-259
  (identical): the `div(a, b)` and `mod(a, b)` rows read "two
  quantities of one dimension, kinds included" (F-268, Q-094); the
  Angles paragraph and "`floor` and its kin" pared to V3's two edits
  (V3 L331-370, L372-385; F-270), carrying A7's correction of the
  `turn` clause (A7 L261-274), with the links to
  `docs/builtins.md#trigonometric` and
  `docs/quantities.md#primitives-dimensions-and-kinds`; the
  alternative's paragraph in A7's reword, "the degree-radian confusion
  first among such mistakes, so the rule is strict" (A7 L276-291;
  F-269, keep as intent); the one gloss sentence for "plain number"
  (Q-019).
- **Domains, exact cases and edges.** D5 L166-169 and V3 L387-417:
  the `ln`, `log10`, `log2` row: "`ln(1)`, `log10(1)`, `log2(1)`; for
  `log10` and `log2`, an integer power of the base either way"
  (F-271), with #200 linked once there (section 3); the `pow(x, y)` row: "`x` a perfect `q`-th power for `y =
  p/q`; `pow(x, 0)` is `1`; the bases `0` and `1` for any `y`, and
  `-1` for an exact `y`, by parity" (F-272, Q-092); `atan2`'s edges
  cell: zero for `y` when `x` is not positive, zero for `x` when `y`
  is zero or `x / y` reaches the significand limit (D5 L169 or V3
  L387-399; F-273); the exponent bound added to the `exp`, `sinh`,
  `cosh` and `pow` cells unless the session finds the column was meant
  for domain edges only, which it then says (F-274); "`pow`, and `^`
  with it" opens with V3's sentence linking
  `docs/builtins.md#roots-and-powers` (F-275), #88 being
  `devdocs/numbers.md#Roots and powers`'s one link (Q-102: this page
  points at that section without the issue); the tables stay (F-304,
  Q-114).
- **The elementary routines.** D5 L171-174 and V3 L419-474: the
  opening's figures under section 3 (F-276); `expFixed`'s bullet
  points at `cost.md#The hangs` without the number (F-425); "the hard
  bound of the precision limit" glossed (V3 L454; F-441); the probe
  paragraph names "the four elementary functions" without ranking
  them (F-278, F-491); the gcd sentence in the present tense: the gcd
  strips the common power of two first because settled midpoints are
  dyadics of the ceiling's size, on which Euclid's gcd would dominate
  a sum, and runs Lehmer's algorithm on the odd parts (D5 L174, V3
  L459-474; F-277, keep as intent).
- **The exact functions.** D6 L134-196 and V3 L476-519: the opening
  paragraph in D6's corrected form (D6 L138-144: thirteen functions
  exact on exact arguments; on an inexact argument `sign`, `floor`,
  `ceil`, `trunc`, `round` and `div` exact where the argument's ball
  decides the answer and `unresolved` where it does not, `abs` and
  `mod` carrying the radius through, the integer functions reporting
  a `domain` error; the four that take quantities) inside V3's
  structure, with the link to `docs/builtins.md#integer-functions`,
  `#magnitude-sign-and-rounding` and `#division` (V3 L498; F-280);
  the `round` bullet: "one of the modes' names, `floor`, is a
  function" (F-281), D6's clause on `places` and the count of units
  held to the limit (D6 L154-160; F-286), no #98; the `gcd` bullet
  states "`gcd(a, 0)` is the magnitude of `a`" as the specification,
  with a `gcd(a, 0)` result shown only after B-001 has landed (F-285,
  Q-050); "On balls": the open-cell reason recorded as intent, a
  touch being a straddle at every edge so that no edge check has to
  know which end of a cell is closed (A6 L431-437, L450-456; F-279,
  Q-036); `div`'s undecided edge named in the dividend's terms (D6
  L162-168; F-287); `mod`'s alignment refusal in D6's first form, "as
  any exact sum's is, and with the same remedy offered" (D6 L170-180;
  F-284, Q-044, after B-005); the errors' pointers at `gamma(x + 1)`
  and the `beta` form, the error for a negative integer pointing
  nowhere, in D6's words (D6 L182-188; F-282, Q-096); the prediction
  paragraph: `div`, `mod` and the rounding functions form their
  results through the exact arithmetic, which holds each to the
  significand limit (D6 L190-196; F-283), and past `FACTORIAL_LIMIT`
  the need is `unknown` and the message names no count (D6's edit (g);
  F-288; the message's wording is B-020's, so the page paraphrases
  it, Q-007).
- **The Gamma and Beta families.** The Bernoulli paragraph (D7
  L187-191, V3 L521-549): the memo reserves its count because a memo
  grown term by term would recompute the run several times in one
  cold pass (F-291, keep as intent); #103's one link (F-415); the
  run's cost under section 3; the memory figures stay (F-300).
  `lgamma` and `gamma` (D7 L193-197, V3 L551-573): the kernel's value
  is the remedy for a factorial past the significand limit, which the
  refusal itself does not name (D7 L194; F-292, Q-096); the costs as
  D7's ratios (D7 L197); the shift named in words with the `cost.md`
  link (F-420). `beta` (D7 L199-200, V3 L575-590): one of the two
  verified examples, `beta(1e15, 1.5)` or `beta(1e15, approx(1))`,
  `beta(1e15, 1)` itself being the exact case (F-293). The incomplete
  gamma functions (D7 L202-209, V3 L592-620): the regularized forms
  carry `ln Γ(s)` in the exponent rather than dividing by `gamma(s)`
  (D7 L203; F-294); the regime named with the `cost.md` link (F-416);
  the timing as one qualitative sentence, the convergent counts
  staying (F-295). `erf` and `erfc` (D7 L211-212, V3 L622-634): the
  timing deleted (F-296), the tiny-argument sentence only where
  F-297's check puts it. The incomplete beta function (D7 L214-215,
  V3 L636-665): the block re-flowed (F-289), "`x = 1` is `1`
  regularized and `B(a, b)` otherwise" (F-298), the timing as the two
  rewrites combined (F-299), #150 as a `cost.md` link. The last
  paragraph (D7 L217-218, V3 L667-718): the costs and the hangs
  pointed at `cost.md` without the numbers (F-424, F-425); the
  deferred classes as section 3 has it (F-290, F-348; #115 and #112
  stay here). The kernel-side statements (page L725-729, L771-798,
  L839-847) stay as they are (F-301).
- **Not in this design.** D7 L222-234 or V3 L720-736: the ruled-out
  designs with their reasons; the complex-values bullet as the plain
  fact, no argument leaving the real line since the language has no
  complex literal, `ln(-1)` a domain error and `sqrt(-1)` an even root
  of a negative value, linking `future.md` ("Complex numbers"); the
  session checks whether `negativeRadicand` counts as a domain error
  before writing "domain error" for `sqrt(-1)` (F-302); nothing of
  #98 or #100.
- **The link definitions** (page L905-917): deleted (F-303).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-257 | (top) | A sentence and the link to `../docs/builtins.md` |
| F-258 | Names | Doc wrong; one restatement covering both readings (Q-086) |
| F-259 | Names | D5's edit 7 (Q-034) |
| F-260 | Arity | The link; "a wrong count is an error" (F-442) |
| F-261 | The rules every built-in follows | V3's three edits |
| F-262 | The rules every built-in follows | A6's list of the edges a message names |
| F-263 | The rules every built-in follows | Radius or width, from `hyperbolic.ts:218` |
| F-264 | The rules every built-in follows | Stands as the comment states it |
| F-265 | Huge and tiny arguments | One of the two rewrites of the second bullet |
| F-266 | Huge and tiny arguments | Drop the aside; "certified" |
| F-267 | Huge and tiny arguments | Keep (Q-066) |
| F-268 | Dimension rules | "kinds included" (Q-094) |
| F-269 | Dimension rules | Keep as intent, A7's reword |
| F-270 | Dimension rules | V3's two edits with A7's `turn` correction; the gloss (Q-019) |
| F-271 | Domains, exact cases and edges | The logarithm row corrected |
| F-272 | Domains, exact cases and edges | The `pow` row corrected (Q-092) |
| F-273 | Domains, exact cases and edges | `atan2`'s edges completed |
| F-274 | Domains, exact cases and edges | The exponent bound added, unless the column is domain edges only |
| F-275 | Domains, exact cases and edges | V3's first sentence; #88 is `devdocs/numbers.md`'s (Q-102) |
| F-276 | The elementary routines | Rough figures or `bench/kernel.bench.ts` (Q-016) |
| F-277 | The elementary routines | Keep as intent; a rough duration may stay (Q-018) |
| F-278 | The elementary routines | "the four elementary functions", unranked (F-491) |
| F-279 | The exact functions | The reason as intent (Q-036) |
| F-280 | The exact functions | D6's opening; "report a `domain` error" (F-442) |
| F-281 | The exact functions | "`floor` is a function" |
| F-282 | The exact functions | D6's pointers; "errors" (Q-096, F-442) |
| F-283 | The exact functions | The exact arithmetic's limit, D6's sentence |
| F-284 | The exact functions | D6's first form, after B-005 (Q-044) |
| F-285 | The exact functions | The intent stated; the result shown after B-001 (Q-050) |
| F-286 | The exact functions | D6's `places` clause |
| F-287 | The exact functions | D6's `div` clause |
| F-288 | The exact functions | D6's sentence, paraphrasing the message (B-020) |
| F-289 | The Gamma and Beta families | Re-flow once |
| F-290 | The Gamma and Beta families | `cost.md` for the costs; the classes to `future.md`; #103 and #115 here |
| F-291 | The Gamma and Beta families | Keep as intent |
| F-292 | The Gamma and Beta families | The refusal names no remedy (Q-096) |
| F-293 | The Gamma and Beta families | One of the two verified examples |
| F-294 | The Gamma and Beta families | `ln Γ(s)` in the exponent |
| F-295 | The Gamma and Beta families | One qualitative sentence; the counts stay (Q-016, Q-088) |
| F-296 | The Gamma and Beta families | Delete |
| F-297 | The Gamma and Beta families; Huge and tiny arguments | One statement, after the check against `erf.ts:13-20` |
| F-298 | The Gamma and Beta families | `B(a, b)` at `x = 1` unregularized |
| F-299 | The Gamma and Beta families | The two rewrites combined (Q-016, Q-088) |
| F-300 | The Gamma and Beta families | The figures stay (Q-016) |
| F-301 | The Gamma and Beta families | Keep; verify with the structured comments |
| F-302 | Not in this design | The plain fact with the `future.md` link; `negativeRadicand` checked |
| F-303 | (the page) | Inline links; the definitions deleted; the places per Q-012, Q-014, Q-104, Q-011 |
| F-304 | (the page) | V3's map; the tables stay (Q-114) |

Owned elsewhere and read here: F-067 (`asin(0.5)` into `turn`), F-154,
F-158, F-159 (the incomplete functions' large-parameter refusal,
`docs/builtins.md`'s wording), F-193 (the memos), F-308, F-348, F-413
to F-417, F-420, F-422 to F-425, F-491, F-510, and the terminology
findings F-427, F-431, F-440, F-441, F-443, F-446, F-447, F-449, F-460,
F-461, F-475, F-478.

## 6. Decisions followed, and still open

Followed: Q-006, Q-007, Q-008, Q-010, Q-011, Q-012, Q-014, Q-016,
Q-018, Q-019, Q-020, Q-034, Q-035, Q-036, Q-044, Q-050, Q-058, Q-066,
Q-086, Q-088, Q-092, Q-094, Q-096, Q-102, Q-104, Q-110 (the memo claim
is `devdocs/settings.md`'s to check), Q-114; the rules of section 3.

Still open: nothing. #115's one place is here, in a one-line mention
(the owner's list, item 1, confirmed), and #112's too (item 10); Q-048
gets no `future.md` entry (item 14): the exact cases for a rational
exponent are issue #200, linked once from the logarithm row (section
3), the page stating today's behaviour.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V3 L81-110 | V3 | `../docs/builtins.md`; L101 under F-442; "the definitions file" |
| Names | D5 L147-150; V3 L112-129; A9 L247-255 | one text covering both readings (Q-086), with D5's edit 7 | — |
| Arity | V3 L131-147 | V3 | the anchor `#calls-and-arity`; "an error" |
| The rules every built-in follows | D5 L152-154; V3 L149-240; A6 L386-398 | V3, with A6's edge list in the domain bullet | the #100 clause (no issue); radius or width (F-263); the `docs/numbers.md` anchors |
| Huge and tiny arguments | D5 L156-160; V3 L242-313 | either rewrite of the second bullet; V3's L252 wording | "certified"; #63, #65 inline; the `erf` check (F-297) |
| Dimension rules | D5 L162-164; V3 L315-385; A7 L229-291 | V3's two edits with A7's `turn` clause and A7's alternative paragraph | `../docs/builtins.md`, `docs/quantities.md` anchors; the gloss (Q-019) |
| Domains, exact cases and edges | D5 L166-169; V3 L387-417 | D5's cells; V3's `pow` sentence | the exponent-bound cells (F-274); `../docs/builtins.md` |
| The elementary routines | D5 L171-174; V3 L419-474 | V3 | the figures (F-276); #152 as a `cost.md` link; "hard bound" glossed; the four functions unranked |
| The exact functions | D6 L134-196; V3 L476-519 | D6's corrections inside V3's structure | "report a `domain` error"; "errors"; no #98; D6's edit (e) first form; the `gcd(a, 0)` result after B-001 |
| The Gamma and Beta families, Bernoulli | D7 L187-191; V3 L521-549 | either | the run's cost (Q-016); #103's one link |
| `lgamma` and `gamma` | D7 L193-197; V3 L551-573 | D7's remedy sentence and ratio wording | #125 as a `cost.md` link |
| `beta` | D7 L199-200; V3 L575-590 | one of the two examples | — |
| incomplete gamma | D7 L202-209; V3 L592-620 | D7's `ln Γ` correction; one timing sentence from both | #107, #149 as `cost.md` links |
| `erf` and `erfc` | D7 L211-212; V3 L622-634 | V3's deletion | D7's sentence only per F-297 |
| incomplete beta | D7 L214-215; V3 L636-665 | D7's `x = 1`; both timing rewrites combined | #150 as a `cost.md` link |
| the last paragraph | D7 L217-218; V3 L667-718 | neither whole: one sentence (section 3), the rest handed to work order 18 | #151, #152 as `cost.md` links; #115, #112 stay |
| Not in this design | D7 L222-234; V3 L720-736 | V3's complex-values bullet; D7's other bullets if they say more | no #98, #100; `negativeRadicand` checked |
| the link definitions | V3 L738-740; D5 L160; D7 L220 | V3 (delete all) | — |

## 8. Conflicts left to settle

From the owner's list, all answered: #115's place (item 1, which is
also conflict 5) and #112's (item 10) are here; conflict 4 (a figure
kept only as rough and illustrative: the session decides passage by
passage, section 3); conflict 3 ("the definitions table", or "the
table built from the definitions file", if the page names it; module
names quoted as they are). The session records in its pull request the drafts picked, the
figures kept and the text handed to work order 18.

## 9. Code changes it waits on

Batch 1 (B-068, B-002) and batch 2's B-001 and B-005 (Q-050, Q-044).
Batch 3 touches this page's subject but not its text: B-015 (#107's
message, which the page does not quote), B-020 (the integer functions'
message, paraphrased), B-045, B-046, B-051 and B-057 (comments, Q-059).

## 10. Done when

- Every section opens with its link to `docs/builtins.md` (or the
  user page that owns the rule) and keeps mechanism, decisions and
  alternatives only, in the present tense.
- No reference-style link, no issue number but #63, #65, #103, #112,
  #115 and #200; the cost issues are links to
  `cost.md`'s sections; "deferred" does not occur; the function
  classes that are not built-ins are named in one sentence linking
  `future.md`.
- "refused" only for a size refusal; "certified", never "certain";
  "plain number" and "dimensionless" glossed once; "the definitions
  file"; the links go to `../docs/builtins.md`.
- The incomplete beta block renders; the tables stay.
- The pull request names the choices made, the figures kept, and the
  text handed to work order 18, and changes nothing outside this file.
