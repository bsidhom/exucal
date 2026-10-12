# Work order 01: `docs/numbers.md` (Numbers)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D8 (L172-178)` is `audit/reports/D8/fable.md`, lines 172 to 178 (D1's
report is `merged.md`). `§7` is `audit/plan/07-docs-outline.md`, `§1`
is `audit/plan/01-core-abstractions.md` (its claims N1 to N25 and Q1 to
Q19, amended), `§8` is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/numbers.md`, titled "Numbers": the foundation page
  on the numeric model a user needs to predict and interpret any
  result (§7).
- **Order.** The first page written. It depends on no other page. Every
  later page links it, so its section headings are the anchors §7
  fixes (section 4 below): a heading is renamed only by updating every
  link to it, and the session renames none.
- **Forward links.** This page links pages written after it (`units.md`,
  `expressions.md`, `settings.md`, `builtins.md`, `quantities.md`) at
  the anchors §7 fixes, in their lower-case, hyphenated form (the
  rule of `audit/principles.md`, "Topological order", confirmed by the
  owner; section 8 below). A link to a
  heading §7 does not name is not written.
- **Status.** Ready once the first batch of the code track has landed
  (work order 00: B-068, B-002, B-017, B-025, B-026). Nothing on the
  owner's list blocks the page (section 8).
- **Output.** The page, and in the pull request a note saying which
  draft the session picked wherever the findings leave a choice
  (the sheet's section 10, `audit/decisions.md`), and any question
  that comes back to the owner.
- **Not in scope.** No other page is changed; the passages this page
  absorbs from `docs/settings.md` and `docs/functions.md` are removed
  by those pages' own sessions (work orders 06 and 07), which this
  order tells them to do. No code is changed. Nothing is re-audited:
  where a finding is marked low confidence, the session reads only the
  code the finding names before applying it (section 5).

## 2. The reader, and what earlier pages taught

The reader is a user of the app who has typed an expression and wants
to know what the result means and why it looks as it does. No earlier
page has taught them anything: this page defines its own terms the
first time it uses them (`§8` gives the word for each concept), and it
assumes nothing about units beyond what a worked example shows. The
page is the one the other user pages link for exactness, digits,
limits and the written form of a number, so it states each rule once,
completely, in the section §7 names for it, and never twice.

What the reader will have read before this page in the finished
corpus: `docs/README.md` (the index) and perhaps `getting-started.md`,
both written after it and both defining nothing (§7). So the page may
not rely on either.

## 3. Rules that bind the page, applied to its drafts

Every rule in [`audit/principles.md`](../principles.md) binds this page.
What each changes in the drafts this page is built from:

- **Inexact, not approximate (F-451).** "Inexact" wherever a value with a
  nonzero radius is meant, headings included. D8's drafted heading
  "Exact and approximate values" (D8 L172) becomes "Exact and inexact
  values"; D8 L178, L187, L190, L206, L228, L230 and L257 say
  "approximate" for a value and read "inexact"; A1's carried sentences
  (A1 L240-243) the same. "Approximate" survives only for the act,
  `approx` and "approximating a value".
- **Refusal only for a size refusal (F-442).** A size refusal (the
  significand limit's, the exponent bound's) is "refused". A value that
  cannot be told from an edge at the ceiling, a domain error, a
  mismatch, a failed condition: "an error", never "refused". So D8
  L206 ("Values at an edge") and A4 L137 ("a refusal at the pole") are
  reworded; "cannot be told from zero" is an error. A literal past the
  hard bound or the exponent bound is "an error as it is typed", never
  "rejected" (D8 L232-265 and A5 L126-134 say "rejection").
- **Future work is `devdocs/future.md`'s alone (Q-011).** The page
  mentions nothing that may come: no two-argument `approx` and no #100
  (F-023, F-046), no symbolic layer (F-034), no equality operator to
  come (F-030), no configurable formatting, no issue of any kind. What
  is ruled out by intent is stated as a plain fact where a user would
  look for it: the app never shows the error radius ("Exact and inexact
  values"); there is no equality operator ("Comparison and equality");
  readings are not units with an offset (that one is `quantities.md`'s);
  real values only ("Real values only"); the exponent bound is not a
  setting and a higher one is ruled out, with the two reasons (F-058).
- **Which numbers the page keeps (Q-016, Q-018).** No timing, run count
  or measured ratio: "What costs time" is qualitative, and a rough
  duration appears only where it warns ("a few seconds"). The six-pass
  table of `approx(1e999)` and the scratch build's figures stay in
  `devdocs/numbers.md`, linked at the section level (F-058, Q-017). The
  one count the page keeps is the dyadic cost of `2^-30000`, "about
  69,658 bits" (Q-091, F-012).
- **The ceiling is a pass's precision (Q-004); the formula once, in the
  settings page (Q-005).** The ceiling is "the highest precision any
  pass computes at", never "the finest grid"; the grid is named once,
  in "How a value is held", as what an inexact value is kept to, and
  stays the word for rounding onto it. D8 L196's "four times the
  precision limit plus ten digits (4,040 …)" does not travel here:
  "Digits you can trust" says the retries run up to a ceiling the
  precision limit sets and links the Precision limit entry of
  `settings.md`, which alone gives "four times the sum of the limit
  and ten" with 4,040 beside it (F-022).
- **The words (§8).** "The exponent", never "decimal exponent" (F-440;
  D8 L257, L263, L265); "the fraction is kept with no factor of ten in
  its denominator", never "canonical" (F-439); "the digits an inexact
  value is kept to", never "working precision" for the grid (F-431);
  "absorbed into the error radius" (F-437); "the correctly rounded sum",
  never "the neighbor rule" (F-436); "the most the significand limit
  can be set to", never "the hard bound" (F-441); "step", glossed once
  (F-433); "pastes back" for a result typed back as input (F-457);
  "error radius" named once; "midpoint" is devdocs-only (F-016);
  "certified" in every note the page quotes, once the code change has
  landed (F-021, Q-006); "undecided" named once for a condition's
  outcome, then plain words; "dimensionless" and "plain number" as
  synonyms (Q-019). The built-in functions page is `docs/builtins.md`
  (Q-020): every link D8 or A5 writes to `docs/functions.md` targets it.
- **Messages (Q-007).** The app's messages are quoted as examples only,
  two or three in "Values too big to hold" and one at an edge, in the
  wording the code has once the first batch of the code track has
  landed; the no-count forms of the size refusal are not quoted until
  B-020 lands (Q-051).
- **Markdown (principles).** The subset only: no reference-style links,
  no raw HTML; the `exp(1e999)` diagram stays as a fenced block
  (Q-109); every link is a repo-relative path.

## 4. The outline, section by section

The headings below are §7's for this page, in §7's order; each is an
anchor a later page links, so each is kept as written. Under each: the
text to start from, the findings the section applies and what the
rules change. The plan's claims (§1, amended on 2026-10-12) are page
material: where a claim is cited, its amended statement is the fact to
state.

### Exact and inexact values

- Start from D8 L172-178 (the draft "Exact and approximate values"),
  retitled and reworded under F-451.
- Facts: §1 N1 to N3 as amended. The two sources of a nonzero radius,
  an inexact built-in (the units defined through `pi()` among its
  values) and `approx`; the radius; what `=` means (F-010, F-011). One
  clause says that some units are inexact because they are defined
  through `pi()`, linking `units.md#which-factors-are-exact` (F-113,
  owned by `units.md`). One plain sentence that the app never shows the
  error radius (Q-011).

### How a value is held

- Start from D8 L180-190, reconciled with the Significand limit entry
  D4 drafts (D4 L267-282): under §12 question 5 and Q-108 this section
  takes the dyadic cost and the remedies, and the entry keeps one
  sentence and a link (F-018, F-049; the session of `settings.md`
  reconciles the same two drafts from its side).
- Facts: §1 N1 and N21 as amended. The fraction kept in lowest terms
  with no factor of ten in its denominator, so `2^-30000` is held as
  `5^30000 × 10^-30000` and costs about 69,658 bits (F-013, F-012,
  Q-091); D8 L176's "kept in lowest terms as `127/50`" is settled
  against A1's computed form of `2.54` (A1 L228-234) before it lands.
  The exponent and its bound. The digits an inexact value is kept to,
  "a little beyond the precision the pass works at", the grid named
  here once (F-015, F-016, Q-004). What a rounding adds to the radius
  is D8's plain wording; the exact charge is `devdocs/numbers.md`'s
  (F-017, Q-084), and the session reads `gridded` in `src/core/ball.ts`
  only if it states the charge.
- The dissolved section `docs/settings.md#How a number is held, and
  what the settings touch` maps onto this page by D8's table (D8
  L66-70); A1's interim pairs for it (A1 L223-272) are not applied, the
  section being deleted by work order 06, but their corrections (N1,
  N3, N4, the ceiling's wording) are carried into D8's sections (F-014).

### Operations that stay exact; exact cases of functions

- Facts: §1 N4 as amended (F-019): exact operands give exact results,
  never rounded; a sum that cannot align within the significand limit
  is refused, not rounded; where an exact operand meets an inexact one
  and the exact step would pass the limit, the exact operand is rounded
  onto the grid, the rounding charged to the radius, so the result is a
  value rather than a refusal, with one sentence on what that result's
  error radius covers (Q-083). The exact cases of the built-ins, §1 N6,
  stated once as a rule; the entries are `builtins.md`'s (F-020).

### Digits you can trust

- Start from D8 L192-200, with the ceiling's formula removed as section
  3 says (F-022, Q-004, Q-005).
- Facts: §1 N8 to N10 as amended. Certification as a user rule; the
  retries; the notes as they exist, "7 of 8 digits are certified" and
  "0 of 8" (F-024), in the "certified" wording (F-021, B-068); *partial*
  reachable today, with nothing of the two-argument `approx` (F-023,
  Q-078); the uncertified mark of decimal mode, pointed to "The two
  modes" (F-027). The note "0 of 1 digits" at one display digit stays
  as it is (Q-063). The two tail paragraphs of `docs/settings.md#(top)`
  move here (F-025; one sentence stays there, work order 06), and the
  "Why four times the limit plus ten" pointer is dropped (F-026,
  Q-082). This section links `devdocs/numbers.md#Working precision and
  the schedule` at the section level (F-026) and `settings.md`'s
  Precision limit entry for the number.

### Comparison and equality

- Facts: §1 N14 and N16 as amended (F-028, F-029, F-030). Exact values
  compare exactly; an inexact value at a bound is undecided, with one
  sentence on the touch rule (Q-024: a bound exactly met decides a
  non-strict comparison and leaves a strict one undecided), in A6's
  docs phrasing rather than the devdocs words "touch" and "straddle"
  (F-447; A6 L382-384 has the sentence). Two inexact values compare
  through their difference, which always aligns; a difference that
  cannot be formed as a value counts as across zero (no difference is
  ever "refused as too large"). F-028 and F-029 are low confidence: the
  session reads `addBallsCore` and `orderOf` in `src/core/ball.ts`
  before stating the alignment, and `src/core/convert.ts:394-401` before
  listing a unit list's counts among the places an undecided comparison
  surfaces. No equality operator and no `!=`, as a plain fact, with
  nothing of what may come (F-030, Q-011). Where an undecided comparison
  surfaces (conditions, division, the rounding functions, lists,
  inverses) is pointed to "Values at an edge" (F-031).

### Values at an edge

- Start from D8 L202-206 (D8's sentences only), reworded under F-442.
- Facts: §1 N15 as amended. "Cannot be told from" is an error at the
  ceiling, never a refusal (F-032). One complete sentence names which
  rounding functions decide a value that cannot be told from zero and
  how, D6's rule 3 (F-031, Q-025: D6 L55, L81, L95: `floor` decides a
  ball against the cell from its result to the next integer, `ceil` the
  cell below, `trunc` the cell on the result's side of zero, `round`
  half a unit either way, `sign`, `div` and `mod` as D6 states them; the
  owner asks that the list be complete).

### Identities and cancellation

- Start from D8 L208-216.
- Facts: §1 N5 and N7 as amended (F-034): an identity through an
  inexact step never certifies exactly; such an expression runs every
  pass up to the ceiling, or until a pass ends with a refusal the loop
  does not retry, when the best result so far is shown; dividing by
  such a value is an error. Today's behaviour as a plain fact, nothing
  of a remedy to come (Q-011). The dependency problem (`x - x`,
  `sqrt(2)/sqrt(2)`), one paragraph. A formula written by hand against
  the built-in (F-035): the session settles whether the hand-written
  rule's examples (`log(2, 8)` against `ln(8) / ln(2)`; the `tanh`
  formula refused at `3e18`) live here, as D8 drafts, or stay in
  `devdocs/functions.md`, as V4 keeps them (F-033, Q-107); the user
  statement in `definitions.md#Functions` links this section either
  way (work order 04).

### The two modes

- Start from D8 L218-222 (D8's sentences only); the rules are A4's
  corrected N17 to N19 (§1 as amended; A4 L26-28) and the Mode entry's
  rules (D4 L217-219), and the consequences A4 L137 lists.
- Facts: decimal mode as rules 1 to 4, with the list of what counts as
  a step, moved here from the Mode entry with A4's corrected list, a
  leading `-` included (F-037; the Mode entry of `settings.md` links
  this section, work order 06); a literal past the significand limit
  is refused before anything rounds it, in either mode (F-041, Q-040);
  decimal mode runs a single pass (F-039); the working digits and the
  last steps (F-043), the reciprocal line being the reciprocal of the
  ratio shown (F-038, Q-046); the uncertified mark, reachable from
  `log` (`log(4, 8)` at one display digit), stated as today's behaviour
  (F-042, Q-048) with no issue named (Q-011); the carried sentences on
  the radius inside a step (A1 L240-243, F-040; low confidence: the
  session reads `step` in `src/core/ball.ts` for the unit case);
  decimal mode's consequences for units and edges stated without
  settings-dependent digits (F-044, Q-023): a unit that carries `pi()`
  is rounded as it is looked up, so `turn` into `deg` is `=` with a
  value a little under 360; no argument straddles an edge, so
  `tan(90 deg)` may give an exact value in decimal mode where exact
  mode fails at the pole; `= -1e+8` as the example of the exponent
  form (F-059). F-045 confirms the gap this section fills.

### `approx`

- Start from D8 L224-230, with A2's qualifier (A2 L152: `approx` on a
  base does not relax an exponent literal that cannot be formed, Q-099)
  and D6's two facts (the identity in decimal mode; a zero midpoint of
  any radius passes through) added; A5's facts for the user page are
  A5 L246-257 (F-046).
- Facts: §1 N23 as amended. "At the first pass `exp` finds that the
  result's exponent passes the bound for every value within the
  argument's error radius, refuses, and the retry loop ends there"
  (F-047), not "at every pass". Nothing of the two-argument form
  (Q-011; `devdocs/numbers.md` names it). The reference entry of
  `approx` is `builtins.md`'s and links here (F-148, work order 07).

### Rounding modes and where they act

- Facts: §1 N11. The seven modes are the Rounding entry's
  (`settings.md`); this section says where the mode acts (the display
  in exact mode, every step in decimal mode, `round`) and that
  `round(2.5)` is `2` under the default and `3` under half away from
  zero (F-048).

### Values too big to hold

- Start from D8 L232-265, adding A5's three facts on the exponent bound
  (A5 L58), the literal past the hard bound or the bound, "an error as
  it is typed" (A5 L126-134, under F-442), and D6's family facts (D6
  L84: the integer functions' refusals never offer `approx` or decimal
  mode and apply in both modes; `round(x, places)` and `mod` are
  refused when their results would pass the limit) (F-053).
- Facts: §1 N21, N22 and N24 as amended. One refusal kind at the
  significand limit, with a reach and a need, never retried, so that
  the user can decide whether a wider limit would help (F-051, Q-001);
  a built-in that works at an argument's own bits refuses there, so
  "inexact values are never refused for size" is not said (F-056); a
  sum never faces the choice of limit (F-052); the remedies, `approx`
  around the operand the message names, or decimal mode; the exponent
  bound, not a setting, with a display rounding past it refused as an
  overflow once B-002 has landed (F-060, Q-002); which message says
  which, two quoted as examples (Q-007), never the no-count forms until
  B-020 lands (Q-051); the one log-space example (Q-026); the
  `exp(1e999)` diagram stays here and the passes' diagram and table go
  to `devdocs/numbers.md` (F-050, Q-109); "the bound is not a setting,
  and a higher one is ruled out", with the two reasons and no test
  build (F-058, keep as intent); the closed issue #40 is not mentioned
  (F-054, Q-101). `docs/functions.md#Very large results and approx`
  dissolves into this section, "`approx`" and "Values at an edge" as
  D8 maps it (D8 L168-170; F-057); work order 07 removes it. The
  Significand limit entry of `settings.md` keeps one sentence and links
  here (Q-108).

### How numbers are written

- No unit drafted this section (F-059): write it from D4's rule and
  corrected examples (D4 L101-107, L195-201) and §1 N12 and N13 as
  amended.
- Facts: digits, exponents (the `%g`-like form; `= -1e+8`), zero
  written `0`, the ratio notation's rule with the width independent of
  the display digits, a whole number written entire at `W` significant
  digits (F-062); a ratio bare before `×` and parenthesized before a
  unit, with the juxtaposition edge stated: `1/2 in` is `1/(2 in)`,
  unlike `(1/2) in` and `0.5 in` (Q-003; `expressions.md`'s pitfalls
  state it too); every result pastes back as input, produced from the
  internal representation and not from the display text (§12 question
  11, F-457), the one literal at the exponent bound whose rounding
  carries past it being refused as an overflow (F-060, B-002). The
  code's screen today forms no fraction for some dyadic values the rule
  admits (`2^-41` to `2^-63` at the default width; F-061, B-004): the
  section states the rule and uses no example from that range until
  B-004 lands.

### What costs time

- No draft; qualitative only (F-063, Q-016): an expression that never
  certifies runs to the ceiling on every keystroke; the cost of an
  exponential grows fast with its argument; a definition that reads
  small can be large; a hand-written function is slower than the
  built-in; the first Gamma-family call at a new ceiling computes the
  Bernoulli numbers, naming the functions that pay it (F-065), the
  cost named only as a rough warning (Q-018). The schedule's cost bound
  and its edge (F-064) stay in devdocs. `devdocs/cost.md` links this
  section once it exists (work order 17).

### Real values only

- One plain sentence (Q-011; §5 C59): real values only; nothing of what
  symbolic or complex values would add.

## 5. Findings applied

Every finding this page owns (F-010 to F-066), with the decision in one
line; the full record is at the id in `audit/findings.md`. Where a
decision says "the session reads", the session reads only that code
before applying the finding, and asks the owner, in its pull request,
anything it cannot settle.

| Finding | Section | Decision |
| --- | --- | --- |
| F-010 | Exact and inexact values | Two sources of a nonzero radius in either mode (N3); "inexact" throughout |
| F-011 | Exact and inexact values | D8's draft, retitled |
| F-012 | How a value is held | "about 69,658 bits" |
| F-013 | How a value is held | No factor of ten in the denominator; settle D8 L176 against A1's form of `2.54`; "canonical" not used |
| F-014 | How a value is held | Dissolve the settings section per D8's table; carry A1's corrections, not its pairs |
| F-015 | How a value is held | "the digits an inexact value is kept to" |
| F-016 | How a value is held | D8's wording; the grid named once |
| F-017 | How a value is held | D8's plain wording; read `gridded` only if stating the charge |
| F-018 | How a value is held | D8's draft reconciled with D4's entry (Q-108) |
| F-019 | Operations that stay exact | N4 as amended; one sentence on the radius of a rounded exact operand (Q-083) |
| F-020 | Operations that stay exact | D8's drafts |
| F-021 | Digits you can trust | "certified" in every quoted note, after B-068 |
| F-022 | Digits you can trust | No formula here; the ceiling a pass's precision; link the Precision limit entry |
| F-023 | Digits you can trust | *Partial* reachable by two routes; nothing of #100 |
| F-024 | Digits you can trust | Only the notes that exist |
| F-025 | Digits you can trust | The tail paragraphs move here; one sentence stays in `settings.md` |
| F-026 | Digits you can trust | The pointer dropped; link the devdocs section at the section level |
| F-027 | Digits you can trust | D8's draft |
| F-028 | Comparison and equality | A difference that cannot be formed as a value counts as across zero; read `addBallsCore` first |
| F-029 | Comparison and equality | The touch rule in one sentence (Q-024), A6's docs phrase; read `convert.ts:394-401` before naming lists |
| F-030 | Comparison and equality | No equality operator, a plain fact; nothing of what may come |
| F-031 | Values at an edge | One complete sentence on the rounding functions (Q-025); "undecided", never "refused" |
| F-032 | Values at an edge | D8's sentences; an error, not a refusal |
| F-033 | Identities and cancellation | The dependency problem here; the user statement in `definitions.md`; the session settles where the hand-written rule's examples go |
| F-034 | Identities and cancellation | N7 as amended; today's behaviour as a plain fact |
| F-035 | Identities and cancellation | D8's paragraph; destination per F-033 |
| F-036 | Identities and cancellation | D8's draft |
| F-037 | The two modes | The step list moves here with a leading `-` added |
| F-038 | The two modes | The reciprocal line inverts the ratio shown (Q-046) |
| F-039 | The two modes | One sentence: decimal mode runs a single pass |
| F-040 | The two modes | A1's corrected sentences; read `step` for the unit case |
| F-041 | The two modes | A literal past the limit refused in either mode (Q-040) |
| F-042 | The two modes | `log` reaches the uncertified mark; today's behaviour, no issue |
| F-043 | The two modes | With a `want` the `have` is an operand rounded to `w` |
| F-044 | The two modes | The consequences for units and edges without settings-dependent digits (Q-023); "fails at the pole" |
| F-045 | The two modes | D8's sentences beside the rules |
| F-046 | `approx` | D8's draft with A5's facts, A2's qualifier, D6's facts; "inexact"; nothing of the binary form |
| F-047 | `approx` | "At the first pass … the loop ends there" |
| F-048 | Rounding modes | `round(2.5)` under the default stated here |
| F-049 | Values too big to hold | This page takes the dyadic cost and the remedies; the entry keeps a sentence and a link |
| F-050 | Values too big to hold | The `exp(1e999)` diagram stays; the passes' table goes to devdocs |
| F-051 | Values too big to hold | One refusal kind, never retried (Q-001) |
| F-052 | Values too big to hold | A sum never faces the choice (N24) |
| F-053 | Values too big to hold | D8's draft plus A5's and D6's facts; messages as examples; "an error as it is typed" |
| F-054 | Values too big to hold | The #40 sentence dropped |
| F-055 | Values too big to hold | Moot: the section dissolves |
| F-056 | Values too big to hold | A built-in at an argument's own bits refuses there (N21) |
| F-057 | Values too big to hold | Dissolve `#Very large results and approx` as D8 maps it; links target `docs/builtins.md` |
| F-058 | Values too big to hold | The bound not a setting, a higher one ruled out; the reasons kept, the test build not |
| F-059 | How numbers are written | D4's rule and corrected examples; the juxtaposition edge; "pastes back" |
| F-060 | How numbers are written | The edge literal refused as an overflow (Q-002, B-002) |
| F-061 | How numbers are written | The rule stands; no example from the dyadic range until B-004 |
| F-062 | How numbers are written | `W` significant digits |
| F-063 | What costs time | The section, qualitative only |
| F-064 | What costs time | Devdocs name the edge; the user page stays qualitative |
| F-065 | What costs time | The functions that pay the cold run named; the cost qualitative |
| F-066 | (devdocs) | `devdocs/numbers.md` opens each section with a link here, in its own rewrite (work order 11) |

Findings owned by other pages that touch this one, each applied by its
owner and read here for what this page must provide: F-069 (the
measured factors are `units.md`'s; this page states only the rule),
F-113 (the clause and link on the units defined through `pi()`), F-134
(this page is the target of the links `settings.md` writes in place of
its devdocs names), F-139 and F-148 (`builtins.md` links this page for
the preamble's rules and for `approx`), F-426 (every link lands only
once its target exists: this page links no page written before it,
and later pages link it), F-440 ("the exponent").

## 6. Decisions followed, and still open

Followed, each at its id in `audit/open-items.md`: Q-001 (one refusal
kind, never retried; the kinds tell the user the failure's type),
Q-002 (B: the display rounding past the bound refused as an overflow,
with a message naming the expression; B-002), Q-003 (the ratio bare
before `×`, with the juxtaposition edge stated), Q-004 (B: the ceiling a
pass's precision; "grid" kept and explained once), Q-005 (A: the
formula once, in the Precision limit entry), Q-006 (the "certified"
change lands first), Q-007 (messages quoted as examples), Q-009 (B; the
dissolved section's links target `builtins.md`), Q-011 (future work in
`devdocs/future.md` only), Q-016 and Q-018 (numbers), Q-019 (synonyms),
Q-020 (`docs/builtins.md`), Q-024 (the touch rule in one sentence),
Q-025 (the rounding functions, complete), Q-026 (one log-space
example), Q-040 (a literal past the limit refused in either mode),
Q-046 (the reciprocal line as it is), Q-051 (A: the no-count refusal
wording changes later; not quoted), Q-063 ("0 of 1 digits" stays),
Q-073 (N8 amended), Q-078 (partial reachable), Q-082 (the pointer
dropped), Q-083 (one sentence on the rounded exact operand's radius),
Q-084 (D8's plain wording), Q-091 ("about 69,658"), Q-099 (`approx` and
an exponent literal), Q-101 (#40 dropped), Q-107 (the call-cost
paragraph split), Q-108 (the entry keeps a sentence and a link),
Q-109 (the diagram stays).

Still open: nothing. Q-023 is settled (conflict 2 of the owner's list):
`359.99999` is not written; the `turn` example is stated without
settings-dependent digits.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| Exact and inexact values | D8 L172-178 | the draft | retitle; "inexact" (L172, L178); add the `pi()` clause with its link and the error-radius sentence |
| How a value is held | D8 L180-190; D4 L267-282 (the entry, for reconciliation); A1 L228-234 (the form of `2.54`) | D8's draft, taking the dyadic cost and remedies | "inexact" (L186, L187, L190); the grid named once (Q-004); no "working precision"; settle L176 |
| Digits you can trust | D8 L192-200 | the draft | L196: no formula, no "finest grid", no "working precision"; the ceiling as a pass's precision; "certified" |
| Values at an edge | D8 L202-206; D6 L55, L81, L95 | D8's sentences, D6's rule 3 | L206: "inexact"; an error, not a refusal |
| Identities and cancellation | D8 L208-216 | the draft | L212, L216 hold ("refused" there names size refusals); the examples' destination settled per F-033 |
| The two modes | D8 L218-222; A4 L26-28; A4 L137; D4 L217-219; A1 L240-243 | D8's sentences, A4's rules and consequences | "inexact"; "fails at the pole"; no settings-dependent digits; the step list with a leading `-`; no issue |
| `approx` | D8 L224-230; A2 L152; A5 L246-257 | the draft plus the facts | "inexact" (L228, L230); nothing of the binary form; "at the first pass" (F-047) |
| Values too big to hold | D8 L232-265; A5 L58; A5 L126-134; D6 L84 | the draft plus the facts | "the exponent" (L257, L263, L265); "inexact" (L257); "an error as it is typed" for the parser's rejections; L265: link the devdocs table, no "measurements" |
| How numbers are written | D4 L101-107, L195-201 | D4's rule and examples | the ratio bare before `×`; "pastes back"; the overflow edge |
| Dissolved: `docs/functions.md#Very large results and approx` | D8 L168-170 (the map); A5 L431-449 (not applied) | the map only | links target `docs/builtins.md` |
| Dissolved: `docs/settings.md#How a number is held…` | D8 L66-70 (the map); A1 L223-272 (not applied) | the map only | — |
| Dissolved: the tail paragraphs of `docs/settings.md#(top)` | D8 L267-271; A2 L116-118 | D8's map; A2's "certified" | one sentence stays on the settings page (work order 06) |
| `docs/definitions.md#Functions`, last paragraph | D8 L154-160; V4 L434-441 | the split per Q-107 | the dependency problem here; the user statement there (work order 04) |

## 8. Conflicts left to settle

From the owner's list at the end of `audit/decisions.md` ("For the
owner"), as they touch this page, all answered on 2026-10-12:

1. **Forward links between user pages (conflict 1, confirmed).** This
   page links `units.md`, `expressions.md`, `settings.md`, `builtins.md`
   and `quantities.md` before they exist, at §7's anchors in lower-case,
   hyphenated form; those pages keep the headings.
2. **Q-023's "that specific number" (conflict 2, confirmed).** `turn`
   into `deg` is stated as `=` with a value a little under 360, no
   digits.
3. **F-442 and N15's wording (conflict 6, confirmed).** An edge is an
   error.

Choices the session makes and records in its pull request (the sheet's
section 10): the destination of the hand-written rule's examples
(F-033); any wording where D8's and D4's drafts of the same fact differ
after the Q-108 split; the two or three messages quoted.

## 9. Code changes it waits on

- **Before the page (work order 00, batch 1):** B-068 ("certain" to
  "certified" in the notes and the panel's line; the page quotes the
  notes), B-002 (the overflow refusal at the exponent bound; "How
  numbers are written" states it), B-017, B-025 and B-026 (the panel's
  lines; quoted by `settings.md`, not here, but landed together).
- **Complicates, no wait:** B-004 (no dyadic example from `2^-41` to
  `2^-63` until it lands), B-007 (`log`'s uncertified lines stated as
  today's behaviour), B-020 (the no-count refusal forms not quoted),
  B-013 ("about 69,658"), B-008 and B-011 (kept and documented in the
  devdocs; the user page says what the reciprocal line inverts and
  stays qualitative on cost).

## 10. Done when

- Every §7 section exists under its heading, in §7's order, and states
  its rule once.
- Every finding in section 5 is applied as its decision says, the
  low-confidence ones after reading only the code named.
- No "approximate" for a value, no "refused" for anything but a size
  refusal, no issue number, no timing, no "decimal exponent", no
  "canonical", no "finest grid", no "working precision", no "sheet", no
  `docs/functions.md`.
- Every link is a repo-relative path to an existing page or to a §7
  anchor of a page written later; none to a heading §7 does not name.
- The pull request names the drafts picked (section 8) and any
  question for the owner, and changes nothing outside this file.
