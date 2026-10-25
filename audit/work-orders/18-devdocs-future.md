# Work order 18: `devdocs/future.md` (Future extensions)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V6 (L181-191)` is `audit/reports/V6/fable.md`, lines 181 to 191. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§1.3` is the
list of design intents in `audit/plan/01-core-abstractions.md`
(amended), `§12` is `audit/plan/12-open-questions.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/future.md`: the one place where future work is
  described, with its issue links (Q-011; §7.1's last row). It keeps
  the two extensions that would reshape the number type as intent
  (`#Symbolic values`, `#Complex numbers`) and the map of the
  extensions that fit, one entry per intent, each beside the concept
  it touches and linking the section that holds its design rather
  than restating it (F-345, F-350). What is ruled out by intent is not
  this page's: `#Ruled out, and why` dissolves, each decision having
  moved to the page that owns its concept (section 3), and the title
  drops "and what is ruled out" (the owner's list, item 13, confirmed).
- **Order.** Eighteenth: after every page whose design it links
  (`devdocs/numbers.md`, `notation.md`, `architecture.md`,
  `functions.md`, `builtins.md`, `settings.md`, `cost.md`) and after
  the user pages, which never mention it (Q-008, Q-011). Earlier pages
  link it at `#Extensions that fit` (`numbers.md#approx`,
  `functions.md#Conditions` and `#Names and shadowing`,
  `builtins.md#The Gamma and Beta families` and `#Not in this
  design`, `settings.md#The panel` and `#Applying a change`,
  `cost.md#(top)`) and at `#Complex numbers`, so both headings stay;
  `devdocs/README.md` (work order 26) links the page last. This page
  links no page written after it.
- **Status.** Ready once work orders 11, 14 and 15 have landed, which
  hand it text (section 3) and carry the ruled-out bullets it sheds.
  V6 audited the page (its texts, V6 L181-209); the other units'
  requests for entries are F-345's.
- **Output.** The page in one pass, the definitions block gone, and
  in the pull request the entries added, the bullets confirmed as
  moved, and any question for the owner.
- **Not in scope.** The pages the ruled-out bullets moved to (11, 14,
  01, 02); the code; the user docs, which say nothing of this page.

## 2. The reader, and what earlier pages taught

The reader is a developer who has read the design pages: what the
number type is and why (`devdocs/numbers.md`: the types, certification
and the display rule, decimal mode, the memoized constants, the
exponent bound, `approx` with the binary form named in one clause),
the display's width rule (`notation.md`), the pipeline and the
messages (`architecture.md`), the defined functions and their
conditions (`functions.md`), the built-ins and the families
(`builtins.md`), the settings and the panel (`settings.md`) and the
catalogue of costs (`cost.md`). An entry here therefore says what the
extension is, what it would take and what keeps it possible, in a
sentence or a few, and links the section that already states the
current design and its constraint; it never restates that design,
and never describes a bug or a performance problem, which the owning
page links (Q-012).

## 3. Rules that bind the page, applied to the drafts

- **Future work lives here, with its issue links, and nowhere else
  (Q-011).** This page carries the one link of every future-work
  issue: #118, with #119 to #121 beside it (Q-013 B; F-418, F-419);
  #130, #131, #133, #134 in the defined-functions entry and #132 in
  the user-definitions entry (F-421); #100 in the `approx(x, u)` entry
  (Q-104, Q-035; F-414); #98 in the significant-figures entry (Q-014;
  F-413); #126 in the cheaper-kernels entry (F-347); and, by the owner's
  answers to the owner's list, #167 and #186 beside #118 (items 7 and
  8), #171 in the `approx(x, u)` entry (item 3), #173 and #178 beside
  the display policy (items 5 and 6), and #78 in an
  entry of its own beside the exact operations (item 2: where a
  quotient's reduction should run, the open question that
  `devdocs/numbers.md#Exact operations` no longer carries; the entry
  links that section for today's behaviour). Not here: the cost
  issues #103, #107, #125, #149 to #152, whose one link is
  `devdocs/cost.md`'s or `devdocs/builtins.md`'s (Q-012 A; F-415,
  F-416, F-420, F-422 to F-425): the cheaper-kernels entry names the
  causes in words and links `cost.md#What the costs come from` and
  `builtins.md#The Gamma and Beta families`; #115, `builtins.md`'s
  (item 1, confirmed; F-346, F-417): the entry names the eight
  functions without the number and links that section; the
  developer-tooling issues #110, #112, #114, #179 (item 10), which stay
  with the passages that own them.
- **The ruled-out bullets have moved (Q-011; F-350, F-349; item 13,
  confirmed).**
  Before this page is written, work order 11 put into
  `devdocs/numbers.md` the third number type with a rational
  significand (`#Decimal mode`), binary floats or a configurable radix
  and exactness as a flag (`#The types`), and stored digits of `pi`
  or `e` (`#Memoized constants`, corrected: `e` is `eSeries`'s own
  binary-splitting sum, the ratios kept and the timings rough or gone,
  F-349); the unbounded exponent is already at `#Why the exponent
  bound stays at 10^18`; work order 14 put the offset in `Quantity`
  into `devdocs/functions.md#Alternatives considered`; and the user
  docs state the plain facts (`docs/numbers.md`: the app never shows
  the error radius; `docs/quantities.md`: a reading is a function, not
  a unit with an offset). The bullet on a radius shown to the user
  moves nowhere: the owner clarified on 2026-10-13 that never showing
  the radius is a plain fact about today's display, neither a design
  ruled out nor future work (R-7, plan §12.3), so it gets no entry
  here and goes with the section. The session checks each move landed
  (the pull requests of 11 and 14 say so) and then deletes `#Ruled
  out, and why` whole; the hypergeometric, Bessel and distributions
  bullets do not move but become future work here (next rule). The
  owner confirmed every classification (item 13, amended by R-7 for
  the radius display); this page only drops the section.
- **The deferred function classes are future work (Q-010, Q-011;
  F-348, F-346).** "More special functions" names the eight designed
  functions (`zeta`, `lambertw`, `ellipk`, `ellipe`, `legendre`,
  `chebyshev`, Bessel `J` and `I`), linking
  `builtins.md#The Gamma and Beta families` for the context (#115 is
  there), and then the classes deferred for now, each
  with its reason kept as why it waits: the general hypergeometric
  functions, Bessel `Y` and `K` and the Bessel functions at large
  argument ("library-sized casework, for little use yet", V6 L187,
  L203); polygamma beyond `digamma`; `gamma` of a complex argument
  (linking `#Complex numbers`); and the statistical distributions,
  with the owner's note alone as their reason: deferred for now, a
  possible implementation to follow, since not every function of
  interest can be written efficiently as a definition, the inverse and
  quantile functions for example (Q-010). V6 L207's reason for the
  distributions (one-line functions in the file or a user's) is not
  used: the owner worded them as deferred, not as one-line user
  functions. The text work order 15 handed over (V3 L675-704, D7
  L217-218) is the source; no chronology ("deferred when the Gamma
  and Beta families landed", page L160-161, goes: F-346); "Not in this
  design" is not the pointer (F-417).
- **One entry per §1.3 intent (F-345).** Beside the entries V6 drafts
  (V6 L185-191: the responsive interface, cheaper kernels, more
  special functions, more of the defined functions, user definitions,
  lenient kind conversion, richer UX), the page gains one entry each
  for: equality operators and conditional expressions, `!=` in
  conditions among them (R-5 of the review, plan §12.3: the negation
  of equality meets the same constraint), with A6's constraint that
  equality of an inexact argument can never be decided on a ball, so
  a design must say what an undecidable comparison yields, linking
  `functions.md#Conditions` (Q-112; F-030);
  the two-argument `approx(x, u)`, with the tentative design work
  order 11 moved out of `numbers.md#approx` (Q-035, Q-104); rounding
  to significant figures and their propagation (Q-014); configurable
  number formatting (N12); a display policy separable from the model
  (N10), with #178 and #173 beside it (section 3's first rule); a grammar generated from a TypeScript DSL (§2.1.3, §2.2.3); a
  built-in reference generated from structured comments (§4; until
  then `docs/builtins.md`'s prose list is the reference and
  `devdocs/builtins.md`'s tables stay, Q-114); the units page
  generated from the definitions file's structured comments (§12
  q4); the message catalogue generated from `src/messages.ts` (§12
  q6), which getting started will link once it exists; a setting or
  toggle that suppresses the conversion target (§12 q2); typographic
  characters accepted by the grammar, D1's set (`×`, `·`, `−`,
  non-breaking and thin spaces; not `÷` or superscripts; Q-037); and
  the user pages shipped with the app, rendered from Markdown by a
  homegrown renderer (§12 q31; `audit/principles.md`, "Markdown
  principle"), after which the panel's "About these settings" link
  becomes local (Q-115, B-069). The symbolic layer (N5, N7) is
  `#Symbolic values` itself and gets no second entry. The owner
  confirms the list where the session is unsure (F-345: the pull
  request lists the entries).
- **The words (§8).** "The app", never "the converter" (V6 L189's
  "definitions typed into the converter"; F-472); "defined function"
  for the file's functions, so the entry is "More of the defined
  functions", and "user definitions" only for the intended user-typed
  ones (F-478); "dimensionless" and "plain number" as synonyms, glossed
  once (V6 L190; F-460); "hang" and the stress vocabulary as `cost.md`
  glosses them, linked rather than redefined (F-497); "the definitions
  file" (F-475); "a new version", "update" as a verb, "deploy"
  devdocs-only (F-494) where the shipping entry touches them; a rough
  duration ("freeze it for seconds", V6 L185) may stay, generous
  (Q-018).
- **Markdown (principles).** Inline links; the definitions block
  (page L231-247) deleted (F-347).
- **A more complete set of special functions (plan §12.3,
  2026-10-14).** The second goal's "eye toward a more complete set in
  the future" is future work and this page's alone (Q-011): one entry,
  beside the deferred function classes, saying that the set is to grow
  toward the special functions of combinatorics, probability and
  physics it lacks, with issue links where they exist;
  `docs/builtins.md` states the goal as the aim of today's set and
  nothing of the set to come (work order 07).

## 4. The page, section by section

- **(top).** Reworded (F-350): the page is where future work is
  described, with the issues that carry it; the as-is pages state the
  current design and what is ruled out by intent; nothing here is a
  plan. The title is "Future extensions" once `#Ruled out, and why`
  is gone (section 1).
- **Symbolic values.** Stays as intent (what, why not now, what it
  would take, what keeps it possible; F-350); "Why not now" may cite
  `docs/numbers.md#identities-and-cancellation` in one sentence for
  the `≈` a user sees today.
- **Complex numbers.** Stays as intent (F-350); `devdocs/builtins.md#Not
  in this design` links it, and the special-functions entry links it
  for complex `gamma`.
- **Extensions that fit.** V6 L181-191 as the base, each entry linking
  the owning section, with the links moved per section 3 and the
  entries added per section 3: the responsive interface (V6 L185;
  #118 to #121; #167 and #186 beside it, each in one
  clause that links `settings.md#Applying a change` and `#The
  panel`); cheaper kernels (V6 L186; the causes in words with the
  `cost.md` link; #126 here); more special functions (section 3);
  more of the defined functions (V6 L188 with the `#Deferred` text
  work order 14 handed over, V4 L492-514: the result annotation as
  the default want of a bare call, #130; the shadowing error as a
  warning, #131; dimension-generic functions with type bounds, #133,
  for which the parser reserves `name[`; whether ranges could narrow
  a result's ball, #134; linking `functions.md#Conditions`, `#Names
  and shadowing` and `#An undecided condition` for the current
  design); user definitions (V6 L189; #132; `buildTable` takes one
  list of definitions, storage and an editor are what is missing,
  definitions typed into the app the first step); equality operators
  and conditional expressions, `!=` included (R-5); where a quotient's
  reduction should run
  (#78, item 2, linking `numbers.md#Exact operations`); `approx(x, u)`
  (the tentative design from `numbers.md#approx`, #100, and #171);
  significant figures (#98); configurable number formatting; a ratio
  width above 1,000 digits (#234, raised in the review of the settings
  page on 2026-10-23; `devdocs/notation.md` states the cap as it is);
  the incomplete beta functions' cap on their exact case, `a + b - 1` at
  most ten thousand, refined or made a setting (#236, raised in the
  review of the built-ins page on 2026-10-24; `devdocs/builtins.md`
  states the cap as it is); the division modes as first-class built-ins,
  floor and Euclidean at least, with `div` and `mod` made consistent
  (#237, raised in the review of the built-ins page on 2026-10-25,
  citing Boute's paper, which the docs cite when the modes land); the
  display policy (#178, #173); the generated grammar; the generated
  built-in reference; the generated units page; the generated message
  catalogue; the conversion-target toggle; typographic characters; the
  pages shipped with the app; lenient kind conversion (V6 L190); richer
  UX (page L181-183, linking `architecture.md`, "Messages").
- **Ruled out, and why.** Deleted whole, after the check of section 3.
- **The link definitions** (page L231-247): deleted (F-347).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-345 | Extensions that fit | One entry per §1.3 intent, each linking its design's section (Q-011) |
| F-346 | Extensions that fit | No chronology; the pointer is the families' section, which carries #115 (item 1, confirmed) |
| F-347 | (the page) | Inline links; the definitions deleted; this page carries the future-work issues (Q-011, Q-013) |
| F-348 | Extensions that fit | Every deferred class described here as future work (Q-010, Q-011); #115 stays in `builtins.md` |
| F-349 | (moved) | The stored-digits bullet is `devdocs/numbers.md#Memoized constants`' (work order 11) |
| F-350 | (the page) | Four sections stay; `#Ruled out, and why` dissolves; the top reworded (Q-011) |

Owned elsewhere and read here: F-030 (the equality constraint), F-290,
F-302, F-321, F-413 to F-425, and the terminology findings F-460,
F-472, F-475, F-478, F-494, F-497.

## 6. Decisions followed, and still open

Followed: Q-008, Q-010, Q-011, Q-012, Q-013, Q-014, Q-016, Q-018,
Q-035, Q-037, Q-104, Q-112, Q-114, Q-115; the rules of section 3.

Still open: nothing. The owner answered the list on 2026-10-12: #115
stays in `builtins.md` (item 1); #78 (item 2), #171 (item 3), #173
(item 5), #178 (item 6), #167 (item 7) and #186 (item 8) are future
work whose one link this page carries; #110, #112, #114 and #179 (item
10) stay with the passages that own them; every `#Ruled out, and why`
bullet is classified as section 3 has it (item 13); the small
follow-ups get no entry (item 14), each living on its own issue (#198
to #202), which this page does not link.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | page L1-15 | the page, reworded | the ruled-out clause and the title's second half go |
| Symbolic values | page L16-100 | the page | one optional sentence citing `docs/numbers.md` |
| Complex numbers | page L101-135 | the page | — |
| Extensions that fit | V6 L181-191; V4 L492-514 (from work order 14); V3 L675-704 and D7 L217-218 (from 15); `numbers.md#approx`'s binary-form design (from 11) | V6 with the handed-over texts | the links per section 3; the entries added; "the app", "defined functions", "the definitions file"; no chronology |
| Ruled out, and why | V6 L193-209 | not used: the section is deleted | the hypergeometric, Bessel and distributions bullets reappear under "More special functions" (V6 L203 reworded; the distributions with the owner's Q-010 note in place of V6 L207's reason) |
| the link definitions | V6 L209 | delete | — |

## 8. Conflicts left to settle

From the owner's list: items 1, 2, 3, 5, 6, 7, 8, 10, 13 and 14 of the
Q-011 list, all answered (section 6). Of the review's answers (plan
§12.3): R-5, `!=` joins the equality entry; R-7, `#Complex numbers`
stays as future work, "real values only" being a plain fact on the
as-is pages, and the radius display gets no entry, being a plain fact
about today's display (section 3). Before deleting `#Ruled out, and
why`, the session searches `docs/`, `devdocs/` and `src/` for links to
that anchor and repoints each to the page that now owns the decision,
a link about the radius display to `devdocs/numbers.md#Certification
and the display rule` (this pull request may change those links and
nothing else outside this file).
The session's pull request lists
every entry the page carries and the bullets it confirmed moved, and
flags any intent it added or left out beyond the list of section 3.

## 9. Code changes it waits on

None.

## 10. Done when

- The page has four sections, `#(top)`, `#Symbolic values`, `#Complex
  numbers` and `#Extensions that fit`; `#Ruled out, and why` is gone
  and each of its bullets is on its owner page or under "More special
  functions", but the radius display's, which goes with it (R-7).
- Every §1.3 intent has one entry, each linking the section that holds
  its design, none restating it; the future-work issues are linked
  here once each and the cost issues not at all; no reference-style
  link; no "deferred when", no "the converter", no "user-defined
  functions", no "the system file".
- Every earlier page's link to `#Extensions that fit` and `#Complex
  numbers` still resolves, and no link anywhere targets `#Ruled out,
  and why`.
- The pull request lists the entries, the moves confirmed and the
  questions for the owner, and changes nothing outside this file but
  the links to `#Ruled out, and why` (section 8).
