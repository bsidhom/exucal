# Work order 07: `docs/builtins.md` (Built-in functions)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D7 (L133-153)` is `audit/reports/D7/fable.md`, lines 133 to 153. `§7`
is `audit/plan/07-docs-outline.md`, `§4` is
`audit/plan/04-built-in-functions.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/builtins.md`, titled "Built-in functions", renamed
  from `docs/functions.md` (Q-020's note, a rule): the session moves the
  file (`git mv`). Every link to the old name in the pages written
  before this one already targets the new name, and this pull request
  repoints every other link to the old name, so that none dangles
  (Q-008): the root `README.md` and `docs/README.md` (rewritten later
  by work order 09), the link in `devdocs/builtins.md` (rewritten later
  by work order 15), the two comments in `src/units.txt` that link the
  page, and any other link a search of the tree for `functions.md`
  finds outside `devdocs/functions.md`'s own name; each change is the
  link's target alone, and a link to the deleted `#Very large results
  and approx` goes to the `numbers.md` section that took it. The page
  keeps today's prose list of
  the built-ins, corrected and restructured under §7's sections; the
  per-function reference generated from structured comments beside
  each implementation is later work (§4) and no per-function entry is
  written by hand (§4.4).
- **Order.** Seventh, after `numbers.md`, `quantities.md`,
  `expressions.md`, `definitions.md`, `units.md` and `settings.md`,
  every one of which it links; it links no page written after it.
  Later pages link it (`app.md`? no; getting started, `settings.md`'s
  Rounding entry, `units.md`, the devdocs), so its headings are §7's
  anchors (section 4).
- **Status.** Ready once the code track's batch 2 has landed B-001
  (`gcd(a, 0)`) and B-005 (`mod`'s refusal class), so that no example
  shows the defect (Q-050). What this session does with the old page:
  the `#Very large results and approx` section is deleted (dissolved
  into `numbers.md` by work order 01, as D8 maps it, D8 L168-170;
  F-057), and the preamble's pointer to it is retargeted (F-139).
- **Output.** The page under its new name, and in the pull request the
  choices made and any question for the owner.
- **Not in scope.** `devdocs/builtins.md` is work order 15; the
  structured comments and the generator are not this session's.

## 2. The reader, and what earlier pages taught

The reader knows the numeric model (`numbers.md`: exact cases, `=` and
`≈`, the edges, the size refusals, `approx` as a concept, the rounding
modes), quantities and kinds (`quantities.md`: plain numbers, the
radian kind, what an angle is), the expression language
(`expressions.md`: calls and arity, `^`), the definitions file
(`definitions.md`) and its contents (`units.md`: `pi()` named there,
the functions the file defines), and the settings (`settings.md`: the
rounding mode, the precision limit's cost). This page states the rules
every built-in follows once and links the owners, then lists the
functions by family with their examples.

## 3. Rules that bind the page, applied to the drafts

- **How much to correct (Q-009, B).** §9.4's passages, every
  contradiction the units found (D5's six pairs, D7's bullet edits),
  the terms (D6's bullets 7 to 10), and the `approx` bullet reduced to
  its reference entry (D8): the signature, one sentence and the link
  to `numbers.md#approx`. D6's "(addition)" clauses wait for the
  generated reference, and so does every gap marked "generated
  reference" in section 5: nothing new is written by hand.
- **Refusal only for a size refusal (F-442, F-443).** `factorial(approx(5))`
  "is an error in exact mode" (D6 L132, not L128's "is refused"); an
  edge "cannot be told from"; a refusal "past the significand limit"
  or "too large to compute" keeps the word (D7 L145, L159, L165, L181
  hold).
- **Inexact, not approximate (F-451).** "An inexact value is not known
  to be `5`" (D6 L132), never "known to a precision" (D6 L128); no
  "approximate" for a value.
- **Future work is `devdocs/future.md`'s alone (Q-011).** No issue is
  named (#63's refusal named without a link, F-146; #88 not at all,
  Q-102; #40 gone, Q-101); nothing of the generated reference to come
  (F-168: the sentence D5 proposed is not added); "Not provided, and
  what to write instead" states what the app lacks as a plain fact
  with what to write, never that it may come (Q-010: the deferred
  classes are described in `devdocs/future.md` only).
- **Numbers (Q-016).** The Gamma-family cost is one qualitative
  sentence (F-153, F-154); no timing, no count. This page is the one
  user page that names which calls pay the family's cold start:
  `numbers.md#what-costs-time` says only that some built-ins pay a cost
  once, at a new precision, and some are expensive at any precision,
  and points here (F-065 as the owner amended it on 2026-10-14, plan
  §12.3).
- **The words (§8).** "The definitions file" in the page lead, with a
  link to `definitions.md` (F-167, F-475); "plain number" where the
  code's rules are quoted, "dimensionless" its synonym, each defined
  once (Q-019, F-460); "exact case", glossed once, for "a value the
  function recognizes as exact" (D5 L143; F-450); "dimension", never
  "units", for what a value carries (D6 L116, not L112; F-464); "whole
  number" and "integer" as §8 has them (F-452); no "kernel", "series",
  "continued fraction" or "truncation bound" in the user page (F-448,
  Q-093); "certified" in any note quoted (F-427); "the exponent"
  (F-440); "absorbed into the error radius" (F-437); no "ball" or
  "midpoint" (F-438); "log space" with the one example `numbers.md`
  keeps (F-445); "an angle", "the radian kind" (F-067).
- **Markdown (principles).** No reference-style links; every link
  repo-relative.
- **The second goal (plan §12.3, 2026-10-14).** The page's opening
  states the goal it serves, in the page's own prose for its reader,
  with the substance principles.md fixes, copying neither its list nor
  the review's shorthand: the elementary functions and the
  special functions that matter most in combinatorics, probability and
  physics, under the same guarantee as the arithmetic, exact in their
  exact cases and certified otherwise, as the aim of today's set,
  stated as Exucal's and never as unique to it; nothing of a more
  complete set to come, which is `devdocs/future.md`'s alone (Q-011;
  work order 18).
- **Each entry documents its own exactness (review, 2026-10-14; plan
  §12.3).** An entry says when its function is exact and that its
  value is otherwise inexact; `docs/numbers.md`'s lists of inexact
  built-ins and of exact cases are examples that link here, never
  inventories, so this page is the one place the set is complete.

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link: "Rules every
built-in follows", "Constants", "Exponential and logarithms", "Roots
and powers", "Trigonometric", "Inverse trigonometric", "Hyperbolic",
"approx", "Magnitude, sign and rounding", "Division", "Integer
functions", "Gamma family", "Incomplete gamma", "Error functions",
"Incomplete beta", "Functions defined in the file", "Not provided, and
what to write instead". Today's bullets 1 to 16 map onto the family
sections in order; the preamble maps onto the first section.

- **Rules every built-in follows.** The page lead and the preamble
  with D5's edits (D5 L138-145): "the definitions file" (edit 1);
  "Every built-in takes plain numbers, apart from the angles above and
  the six that take any quantity: `approx`, `abs` and `sign`, `div` and
  `mod` (two of one dimension), and `atan2` (two of one dimension)"
  (edit 3, F-138, Q-095); the exact-case gloss (edit 4); the pointer to
  `numbers.md#values-too-big-to-hold` with D8's reason, "since `approx`
  says how well a value is known and not how large it is" (D8 L162-166,
  F-139); one rule on decimal mode, a call is one step, certified then
  rounded once, exact cases rounded, linking `numbers.md#the-two-modes`
  (F-137); the errors and the size refusals as `numbers.md` names them;
  no prefix on a function; arity as `expressions.md#calls-and-arity`
  has it. Not D5's edit 6 (F-168).
- **Constants.** `pi()` (bullet 1).
- **Exponential and logarithms.** Bullet 2 as it stands; the exact
  cases of `log` both ways and `b` checked first, and those of `log10`,
  `log2`, `sqrt` and `cbrt`, are the generated reference's (F-140,
  F-141); `log`'s rational exponents stated as today's behaviour if at
  all (Q-048).
- **Roots and powers.** Bullet 3; `pow` against `^` in one sentence
  (`2^1e-30000` is refused where `pow(2, 1e-30000)` is `≈ 1`) without
  the issue (Q-102); the special bases and the quantity-base message
  are the generated reference's (F-142, F-143).
- **Trigonometric.** Bullet 4.
- **Inverse trigonometric.** Bullet 5 with D5's edit 2 corrected by
  F-067: `asin(0.5)` into `deg` is `≈ 30 deg`, `atan2(3 m, 4 m)` into
  `deg` is `≈ 36.869898 deg`, `≈` because the angle units are inexact
  through `pi()`; `asin(0.5)` into `turn` is `≈ 1/12 turn`, an angle
  still, and `asin(0.5) / radian` is the plain number (F-144); the
  quadrant rules, the ends of the inverses and the refusal of
  `asin(0.1 + 1e-15000)` (named, no issue) are the generated
  reference's (F-145, F-146).
- **Hyperbolic.** Bullet 6; F-147 is the generated reference's.
- **approx.** Bullet 7 reduced: the signature, one sentence, the link
  to `numbers.md#approx` (F-148, Q-009; D6 L116's wording for the
  sentence, "dimension" not "units"); nothing of the binary form.
- **Magnitude, sign and rounding.** Bullet 8 with D6's terms (D6
  L118-124); `round(2.5)` under the default is `numbers.md`'s
  (`#rounding-modes-and-where-they-act`), linked; `round(x, places)`'s
  details are the generated reference's (F-149); which rounding
  functions decide a value that cannot be told from zero is
  `numbers.md#values-at-an-edge`'s (Q-025), linked.
- **Division.** Bullet 9; the sign convention and the edges are the
  generated reference's (F-150); `mod`'s refusal carries `fits` and a
  count once B-005 has landed, and the page shows no `mod` refusal
  before.
- **Integer functions.** Bullet 10 with D6 L126-132 under F-442 and
  F-451 (F-151): `factorial(approx(5))` is an error in exact mode, since
  an inexact value is not known to be `5`; the last three are refused
  past the significand limit before anything is computed;
  `factorial(20000)` is refused with no remedy named, and `gamma(20001)`
  is the way, nothing reading as if the message suggested it (Q-096);
  `gcd(a, 0)` shown only once B-001 has landed (F-152, Q-050).
- **Gamma family.** Bullet 11 and bullet 12 with D7's rewrite (D7
  L133-153; F-153, design changed): the ratios are held in one memo,
  built on first use for the precision in force and kept until a call
  needs more, with one qualitative cost sentence (F-154, Q-016; the
  session checks which calls pay the run before naming them, F-356 in
  `devdocs/builtins.md`'s record); the example D7 swaps in
  (`beta(0.5, 0.5) - pi()`) is used only if the session runs it; no
  "kernel" (Q-093). Bullet 13 with D7 L155-159: large arguments go
  through `lgamma`, so `beta(1e17, 1.5)` is `≈ 2.8024956e-26` where
  `gamma(1e17)` is refused as too large to compute (F-155). `gamma`'s
  sign and the other size refusals are the generated reference's
  (F-156, F-157); the items F-158 refutes are already on the page.
- **Incomplete gamma.** Bullet 14 with D7 L161-165: "a large order
  within a few percent of a large argument, past some millions at a
  high precision, is refused as past the significand limit, the limit
  there being one of cost rather than of size" (F-159, Q-067; the
  session checks "at a high precision" against the default-settings
  refusals before it lands; B-015 and B-020 are the message's); the
  truncation bounds stay unverified (F-160); the edges are the
  generated reference's (F-161).
- **Error functions.** Bullet 15 with D7 L167-171: `erfc(10)` is
  `≈ 2.0884876e-45` at the first pass, where `1 - erf(10)` reaches the
  same digits only after the retry loop has raised the precision
  (F-162); no domain error (F-163, generated reference).
- **Incomplete beta.** Bullet 16 with D7 L173-181: the same
  large-parameter sentence (F-159); the ten-thousand cap worded as
  `incbeta.ts:447-452` bounds it, which the session settles (F-164);
  the end points are the generated reference's (F-165).
- **Functions defined in the file.** `tempC`, `tempF`, `neper`, `bel`,
  `decibel`: a cross-reference to
  `units.md#temperature-differences-and-readings` and
  `#logarithmic-levels`, and to `definitions.md#functions`.
- **Not provided, and what to write instead.** A plain fact: the
  functions the app lacks (`zeta`, `lambertw`, `ellipk`, `ellipe`,
  `legendre`, `chebyshev`, the Bessel functions, polygamma beyond
  `digamma`, complex `gamma`, the statistical distributions) and what
  to write instead with the functions provided, where an expression can
  stand in (a user cannot add a definition today: only the predefined
  definitions file loads, Q-011); nothing of what may come (Q-010,
  Q-011, F-348's docs clause).

Tiny and huge arguments where visible (F-166) are the generated
reference's; today's bullets keep what they say.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-137 | Rules every built-in follows | One rule on decimal mode; the cases are the generated reference's |
| F-138 | Rules every built-in follows | D5's six-function list, `atan2` included (Q-095, Q-009) |
| F-139 | Rules every built-in follows | The pointer targets `numbers.md#values-too-big-to-hold`, with D8's reason |
| F-140 to F-143 | Exponential; Roots and powers | Generated reference; `^` against `pow` without the issue |
| F-144 | Inverse trigonometric | `≈` restored; `turn` gives an angle still (F-067) |
| F-145, F-146, F-147 | Inverse trigonometric; Hyperbolic | Generated reference; #63's refusal named without a link |
| F-148 | approx | The reference entry: signature, one sentence, the link (Q-009 B); the additions wait |
| F-149, F-150 | Rounding; Division | Generated reference |
| F-151 | Integer functions | D6's bullet under F-442 and F-451 (Q-096) |
| F-152 | Integer functions | Generated reference, after B-001 (Q-050) |
| F-153 | Gamma family | D7's rewrite; the cost qualitative; which calls pay the run checked |
| F-154 | Gamma family | One qualitative sentence (Q-016) |
| F-155 | Gamma family | D7's corrected `beta` sentence |
| F-156, F-157 | Gamma family | Generated reference |
| F-158 | Gamma family | Nothing: the items are on the page |
| F-159 | Incomplete gamma; Incomplete beta | D7's sentence with "at a high precision" (Q-067); "refused as past the significand limit" stands |
| F-160 | Incomplete gamma | The sentences kept; verified with the structured comments |
| F-161, F-163, F-165, F-166 | (several) | Generated reference |
| F-162 | Error functions | D7's corrected `erfc` sentence |
| F-164 | Incomplete beta | D7's wording; the cap settled from `incbeta.ts:447-452` |
| F-167 | (top) | "the definitions file", with a link |
| F-168 | (top) | No sentence on the generated reference (Q-011) |

Owned elsewhere and read here: F-020 and F-032 (the exact-case rule
and the edges are `numbers.md`'s), F-046 (`approx`'s concept is
`numbers.md`'s), F-048, F-067, F-427, F-437, F-438, F-440, F-443,
F-444, F-445, F-448, F-450, F-451, F-452, F-460, F-464, F-465, F-476,
F-478 ("defined function" for the file's functions).

## 6. Decisions followed, and still open

Followed: Q-009 (B), Q-010, Q-011, Q-016, Q-019, Q-020 (the rename),
Q-025, Q-048, Q-050, Q-067, Q-088 (the docs bullet qualitative),
Q-093, Q-095, Q-096, Q-101, Q-102, Q-114 (the per-function tables stay
in the devdocs); the rules F-442, F-443, F-451, F-475.

Still open: nothing that blocks the page. #115 stays in
`devdocs/builtins.md` (the owner's list, item 1, confirmed); it does not
touch this page, which names the designed functions as absent, nothing
more.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| Lead, Inverse trigonometric, Rules | D5 L138-145; D8 L162-166 | edits 1 to 5; D8's pointer wording | edit 2's `turn` clause per F-067; edit 5 and D8 agree on the target once the reason is added; edit 6 not applied (F-168) |
| approx, Rounding, Integer functions | D6 L104-132 | the terms and D8's reduction of bullet 7 | L128 to L132's wording ("is an error in exact mode", "an inexact value"); L112's "units" to L116's "dimension"; the "(addition)" clauses wait |
| Gamma family (bullet 12) | D7 L133-153 | the rewrite | the cost sentence qualitative; the example swap only if run; no "kernel" |
| Gamma family (bullet 13) | D7 L155-159 | the correction | — |
| Incomplete gamma, Error functions, Incomplete beta | D7 L161-181 | the corrections | "at a high precision" checked for bullet 14; the cap's quantity settled |
| Deleted: `#Very large results and approx` | D8 L168-170 (the map); A5 L431-449 (not applied) | the deletion | — |

## 8. Conflicts left to settle

Of the owner's list, conflict 1 touches this page as the later page: the
pages written before it link its §7 headings, which it keeps (section
4); it links no later page. The session records in its pull request
which calls pay the Bernoulli run as it found them, whether it kept D7's
example swap, and the cap's quantity.

## 9. Code changes it waits on

- **Before the page (batch 2):** B-001 (`gcd(a, 0)`), B-005 (`mod`'s
  refusal class).
- **Complicates, no wait:** B-015 and B-020 (the incomplete functions'
  refusal is described, not quoted), B-007 (`log`'s exact cases as
  today's behaviour), B-068 (any note quoted says "certified"; batch 1
  has landed).
- **With the page:** the two comments in `src/units.txt` that link
  `docs/functions.md` are repointed by this pull request (section 1),
  not by the code track.

## 10. Done when

- The file is `docs/builtins.md`, titled "Built-in functions", with
  every section of section 4 under its heading, in order; the old
  `#Very large results and approx` is gone.
- No per-function entry written by hand; no "(addition)" clause.
- No "refused" for a domain error, no "known to a precision", no
  "kernel", no issue number, no timing, nothing of the generated
  reference or of functions to come, no "units" for a dimension.
- Every link is a repo-relative path to an existing page, and no link
  anywhere in the tree targets `docs/functions.md`.
- The pull request names the choices made and any question for the
  owner, and changes nothing outside this file but the links to the
  old name (section 1).
