# Work order 12: `devdocs/notation.md`

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V5 (L107-113)` is `audit/reports/V5/fable.md`, lines 107 to 113. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/notation.md`, the design of the ratio notation and
  of the literal that every line writes back: the rule's mechanism,
  the width's decision and the alternatives set aside, where the
  notation lives in the code (§7.1; the user rule is
  `docs/numbers.md#how-numbers-are-written`'s).
- **Order.** Twelfth: after `devdocs/numbers.md` (work order 11), which
  it links for certification and formatting, and after the user pages
  it links (`docs/numbers.md`, `docs/settings.md`). Later pages that
  link it (`architecture.md`, `settings.md`) update their inbound links
  if this page renames a heading; it renames none.
- **Status.** Ready once the code track's batch 1 (B-002: the refusal
  at the bound, which `#Every literal parses back` states) and batch 2
  (B-004: the ratio screen, so that `#The rule` needs no caveat) have
  landed. V5 audited the page (V5 L107-143); A2 and D4 drafted passages
  that overlap V5's (section 7).
- **Output.** The page in one pass, and in the pull request the choices
  made.

## 2. The reader, and what the user pages taught

The reader has read `docs/numbers.md#how-numbers-are-written` (the
notation's rule as a user sees it, the width, the ratio bare before `×`
and parenthesized before a unit, the paste-back principle) and
`docs/settings.md#notation-and-ratio-width` (the setting). Each section
opens with one sentence linking the owner (V5's map, F-330; the top
links `docs/numbers.md#how-numbers-are-written`, F-324) and keeps the
mechanism (`ratioParts`, `show`'s `fraction` and `scale`, the printer's
parentheses), the decisions with their reasons (the width's default
and bound) and the ruled-out alternatives (a fit tied to the display
digits).

## 3. Rules that bind the page, applied to the drafts

- **Intent, not history.** "The width" (a bold label under `#The rule`,
  not a heading, F-511): the ruled-out alternative in the present tense,
  "a fit tied to the display digits is ruled out: it couples a length
  to a precision …", and "Eight, the display digits' default, is ruled
  out as the default …", "no bound at all is ruled out for its cost"
  (V5 L127-133; A2 L86-89 and D4 L382-385 say the same; F-327).
- **Q-002 (B) in `#Every literal parses back`.** The one literal at the
  exponent bound whose rounding carries past it is refused as the
  bound's overflow, with a message naming the expression, so every
  line parses back; A2's draft of the section (A2 L96-98), which
  assumed the other fix, is superseded (F-330, F-060); the page states
  the refusal as the code has it after B-002.
- **Q-003 (A) in `#Where a ratio is written`.** The printer decides the
  parentheses from the grammar's levels: a ratio is parenthesized
  before a factor joined by juxtaposition and bare before `×`, so
  `in = 1/36 × 3 ft` (V5 L135-139; A2 L91-94; F-329, F-121); the
  reader-facing reason the old text gave for the parentheses goes.
- **Q-043 (ok) in `#The rule`.** Rule 3 stands as design; B-004 has
  landed before this page, so no caveat sentence is written (F-061); if
  the session finds B-004 not landed, one sentence names the exception
  and the work order of the code track.
- **Issue links (Q-011; §12 question 26).** Inline, once; the foot's
  definitions go; #92 is `architecture.md`'s only (Q-103; F-328). #178
  (a study of the exact-mode display) is on the owner's list: inline
  here as "is open (#178)" provisionally, moved to `devdocs/future.md`
  if the owner classes it as future work (section 8).
- **The words (§8).** "Scaled ratio", glossed once, for rule 4's form
  (F-455); "fraction" only for the held value, so rule 1's example
  names the midpoint held, not a fraction about `sqrt(2)` (F-325,
  F-456); "the decimal display", never "the fallback" (F-454); "whole
  number" and "integer" as §8 has them (F-452); "parses back" here,
  "pastes back" in the linked docs (F-457); "decimal exponent" allowed
  (F-440).
- **Numbers (Q-016).** None to weigh on this page.

## 4. The page, section by section

- **(top).** V5 L107-113: the opener with the link to
  `docs/numbers.md#how-numbers-are-written`; the session picks between
  V5's two versions of the second paragraph (V5 L88 against L113;
  F-324); "parses back" (L113).
- **The rule.** V5 L115-125: rule 1's example corrected (the midpoint
  held is the root's digits on the first pass's grid; F-325); rule 3
  names `ratioParts`, which multiplies the power of ten back in and
  reduces, not `toRational` (F-326); rule 4 as "a scaled ratio" (F-455);
  the width's paragraph in the present tense (F-327), #178 inline per
  section 3 (F-328); no caveat on the screen (F-061, B-004).
- **Where a ratio is written.** V5 L135-139 or A2 L91-94: the printer's
  rule, `in = 1/36 × 3 ft` (F-329, Q-003); the last paragraph on `show`'s
  `fraction` and `scale` as V5 rewrites it, "parses back".
- **Every literal parses back.** The refusal at the bound (Q-002 B,
  B-002), written by the session from the code's message; A2 L96-98 not
  used (F-330).
- **Not in decimal mode.** Opens with its link (V5 drafted none: the
  session writes the one sentence linking
  `docs/numbers.md#the-two-modes`); the mechanism stays.
- **Not in this design.** Stays as the ruled-out alternatives with
  their reasons (Q-011: a design ruled out by intent lives here);
  anything in it that might still be done is `devdocs/future.md`'s,
  which the session names in its pull request if it finds one.
- **Where it lives.** A2 L100-102 (a `print.ts` bullet) or V5 L141-143
  (the printer named in the `outcome.ts` bullet): one of the two
  (F-329).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-324 | (top) | The opener with the link; one of V5's two paragraphs |
| F-325 | The rule | Rule 1's example corrected; "fraction" reserved (F-456), "scaled ratio" (F-455) |
| F-326 | The rule | `ratioParts` |
| F-327 | The rule | Keep as intent; the pointer is `#The rule > The width` (F-511) |
| F-328 | The rule | #178 inline, pending; #92 is `architecture.md`'s (Q-103) |
| F-329 | Where a ratio is written; Where it lives | The printer decides the parentheses (Q-003) |
| F-330 | (the page) | V5's map of links and mechanism; `#Every literal parses back` states the refusal (Q-002); "parses back" |

Owned elsewhere and read here: F-060 and Q-002 (the refusal), F-061
and Q-043 (the screen), F-121 and Q-003 (the bare ratio), F-440, F-452,
F-454, F-455, F-456, F-457, F-511.

## 6. Decisions followed, and still open

Followed: Q-002 (B), Q-003 (A), Q-008, Q-011, Q-043, Q-103; the rules
F-440, F-452, F-454, F-455, F-456, F-457.

Still open: #178's status (the owner's list, item 6 of the Q-011
list), applied inline provisionally.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V5 L107-113 | V5, one of its two second paragraphs | — |
| The rule | V5 L115-125 | V5 | "scaled ratio" glossed (L123) |
| The width | A2 L86-89; D4 L382-385; V5 L127-133 | V5 (covers the whole paragraph) | #178 inline, pending |
| Where a ratio is written | A2 L91-94; V5 L135-139 | either (same substance) | "parses back" (L139) |
| Every literal parses back | A2 L96-98 | not used (assumes the other fix) | the refusal at the bound, from the code after B-002 |
| Where it lives | A2 L100-102; V5 L141-143 | one of the two | — |

## 8. Conflicts left to settle

From the owner's list: #178's status (future work, or a design note
that stays inline), applied inline. Nothing else touches this page.

## 9. Code changes it waits on

- **Before the page:** B-002 (batch 1) and B-004 (batch 2, Q-043).
- **None else.** B-008 and B-013 do not touch this page.

## 10. Done when

- Every section opens with its link to the docs owner and keeps
  mechanism, decisions and ruled-out alternatives only, in the present
  tense.
- `#Every literal parses back` states the refusal at the bound as the
  code has it; `#The rule` carries no caveat on the screen; the
  parentheses are the printer's.
- Every issue link is inline, once; the foot's definitions are gone;
  #92 is not on this page.
- The pull request names the drafts picked and changes nothing outside
  this file.
