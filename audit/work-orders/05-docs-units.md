# Work order 05: `docs/units.md` (Units)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D3 (L97-311)` is `audit/reports/D3/fable.md`, lines 97 to 311. `§7` is
`audit/plan/07-docs-outline.md`, `§8` is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/units.md`, titled "Units" (the review of 2026-10-16;
  §7 follows): a friendly
  guide to the definitions file's contents (§7). `src/units.txt` is the
  source of truth and the page may defer to it; it is a hand-written
  catalogue for now (a page generated from structured comments in the
  file is `devdocs/future.md`'s, §12 question 4).
- **Order.** Fifth, after `numbers.md`, `quantities.md`,
  `expressions.md` and `definitions.md`, which it links for exactness,
  for the rules on factors, kinds and lists, for how a name is read and
  for the file's format. Earlier pages link it at the anchors §7
  fixes, so those headings are kept exactly (section 4). It links
  `builtins.md` before it exists (`pi()`; `exp(1)`) at §7's anchor
  `builtins.md#constants` (section 8).
- **Status.** Ready. D3 drafted the whole page (D3 L97-311) and the
  deletion of `docs/definitions.md#What the file contains` with its
  contents carried over bullet by bullet (D3 L313-319); A9's two
  in-place pairs for that section (A9 L179-195) are carried into this
  page instead (F-114). Work order 04 deleted that section already
  (conflict 1: it links this page forward), so this session carries its
  contents here from D3's map (D3 L313-319) and from the section as it
  stood before work order 04's pull request (`git log -p --
  docs/definitions.md`), and changes nothing in `docs/definitions.md`.
- **Output.** The page, and in the pull request the choices made and
  any question for the owner.
- **Not in scope.** The file's comments (B-061 to B-065, B-059, B-014)
  are the code track's and do not change the page.

## 2. The reader, and what earlier pages taught

The reader knows the numeric model (`numbers.md`), what a quantity, a
dimension, a kind, conformance and a conversion are
(`quantities.md`), how a name, a prefix and a call are read
(`expressions.md`) and the file's format (`definitions.md`). This page
tells them which units, prefixes, constants, lists and functions the
file defines, how they are named, which are exact and which are not,
and which familiar names are absent or mean something else. It states
no rule the earlier pages own; it links them:
`quantities.md#units-prefixes-and-exactness-of-factors` (the rule on
factors), `#primitives-dimensions-and-kinds`, `#unit-lists`,
`#temperature-and-logarithmic-levels-as-functions`; `expressions.md#names`;
`definitions.md#primitives`, `#unit-lists`, `#functions`.

## 3. Rules that bind the page, applied to D3's draft

- **Inexact, not approximate (F-451).** "Angles and rotation" says the
  angle units are inexact through `pi()`; `dms` is "the one inexact
  list" (F-111); "approximate" only for the act.
- **Refusal only for a size refusal (F-442).** D3 L287 ("which the file
  refuses") reads "which is an error when the file loads"; nothing a
  user types is "refused" on this page.
- **The definitions file (F-475).** "The definitions file", never "the
  system file" or "system definitions"; D3's draft is held to it.
- **Future work is `devdocs/future.md`'s alone (Q-011).** No issue is
  named; nothing of a generated units page; nothing of units that may
  be added. What is absent is stated as a plain fact with what to type
  instead.
- **The words (§8).** "Temperature differences", never "intervals" (A9
  L191; F-483); "defined" and "measured" factors (F-486); unit names as
  "name", "symbol", "spelling", "alias", and "pair" and "split" as §8
  has them (F-484); "base unit" as §8 has it (F-465); "logarithmic
  levels" (F-485); a kind primitive "a marker of a kind, with no
  dimension of its own" (F-459); nothing anywhere about a unit `a`
  (F-078); `docs/builtins.md` for `pi()` and `exp(1)` (D3 L150 links
  `functions.md`; Q-020).
- **Numbers (Q-016).** The factors are the file's values and stay;
  nothing else is a figure.

## 4. The outline, section by section

Headings, in §7's order; those earlier pages link are marked with the
page that links them and are kept exactly: "The primitives"
(`quantities.md`, `definitions.md`), "The SI", "US customary", "UK
imperial", "Naming conventions", "Constants and extras", "Other metric
and scientific units", "Time beyond the day", "Information", "Counts
and ratios", "Angles and rotation", "Temperature: differences and
readings" (`quantities.md`), "Logarithmic levels" (`quantities.md`),
"Unit lists defined in the file" (`quantities.md`, `definitions.md`),
"Which factors are exact" (`numbers.md`, `quantities.md`), "Names that
are absent or mean something else" (`expressions.md`). D3's draft
sections the material this way (F-109, F-115); where D3's headings
differ in wording from these, these win.

- **The primitives.** The nine the file declares: the seven SI base
  units, `bit` and the kind `radian` (F-094), why information is a
  dimension (Q-032: a count of bits must not collapse into a plain
  number, so that `bit/s` stays apart from `Hz` as `rad/s` does), the
  radian as a marker of a kind.
- **The SI; US customary; UK imperial; Naming conventions.** D3's
  sections, with `imp`, `uk`, `long` and `short`, the symbol-and-name
  pairs, `metre`/`meter`, Unicode names with ASCII stand-ins,
  case-sensitive near-collisions, the `µ`/`μ`/`u` spellings of micro,
  the binary prefixes (F-109).
- **Constants and extras; Other metric and scientific units; Time
  beyond the day; Information; Counts and ratios.** D3's sections, each
  file section given a home (F-115).
- **Angles and rotation.** The angle units are inexact through `pi()`:
  `deg`, `grad`, `turn` and everything built on them (`arcmin`,
  `arcsec`, `gon`, `rev`, `rpm`), with `parsec` and `oersted` the other
  units that call `pi()`; `sr`, as `radian^2`, is exact (F-113).
- **Temperature: differences and readings.** `degC`, `degF`, `degR` as
  temperature differences; readings as calls of `tempC` and `tempF`,
  the entries only; why they are functions is `quantities.md`'s, linked
  (F-110).
- **Logarithmic levels.** `decibel`, `bel`, `neper` as functions, the
  entries only (`dB` is `d` + `B`: see the absent names).
- **Unit lists defined in the file.** D3's table of the fifteen lists
  and its `dms` sentence (F-111); the counting rules are
  `quantities.md#unit-lists`'s, linked.
- **Which factors are exact.** The rule in one sentence linking
  `quantities.md` (every factor is read exactly as written; a conversion
  is exact unless a unit calls `pi()`), then what this page alone
  names: the measured values written exactly, the dalton (CODATA 2018)
  and the tropical and sidereal years; the five SI defining constants
  exact by the 2019 SI; `gravity` exact by convention (F-069, Q-085,
  Q-041); the sources: those the file cites, named as the file cites
  them, and the three documents the owner's answer adds to the file's
  header, the SI brochure (9th edition), NIST Handbook 44 and the
  Weights and Measures Act 1985 (Q-033, ok; F-116). The header gains
  them with B-065 in the comment pass after the pages (Q-059), so the
  page names them now and the file agrees once that pass lands.
- **Names that are absent or mean something else.** `u` and `at` (the
  symbols of the dalton and the technical atmosphere, not defined; `at`
  typed reads as `a` + `t`, an attotonne), `dB` (`d` + `B`; use
  `decibel`), `e` (the elementary charge; Euler's number is `exp(1)`),
  `rad` (the radian; the absorbed-dose rad is not defined), `h` (the
  hour; `planck` is the constant), `c`, `d`, `t`, `g` and the other
  one-letter names (F-112, Q-075); nothing about a unit `a` (F-078).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-109 | Naming conventions | D3's section |
| F-110 | Temperature | The entries here; the reason is `quantities.md`'s, in full (Q-011 as amended on 2026-10-16, plan §12.3) |
| F-111 | Unit lists defined in the file | D3's table and the `dms` sentence; "the one inexact list" |
| F-112 | Names that are absent or mean something else | D3's retitled section and list, with `rad`; nothing of a unit `a` (Q-075, F-078) |
| F-113 | Angles and rotation; Which factors are exact | The inexact units listed here; `numbers.md` and `quantities.md` link this list |
| F-114 | (the page) | The page from D3's draft; the old section deleted; "the definitions file"; "temperature differences" |
| F-115 | (the page) | Every file section given a home |
| F-116 | Which factors are exact | What the file cites; "CODATA 2018"; the years as measured values; low confidence noted |

Owned elsewhere and read here: F-069 (the rule is `quantities.md`'s;
the measured values and `gravity` are this page's), F-078, F-451,
F-486, F-502 (§7's bullet corrected).

## 6. Decisions followed, and still open

Followed: Q-011, Q-020, Q-032, Q-033, Q-041, Q-075, Q-085; the rules
F-442, F-451, F-459, F-465, F-475, F-483, F-484, F-485, F-486.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| The whole page | D3 L97-311 | the draft, under section 4's headings | "inexact" for the angle units and `dms`; "the definitions file"; "temperature differences"; "an error when the file loads" (L287); `builtins.md` for `functions.md` (L150); nothing of a unit `a`; the reason for readings as functions linked, not restated |
| The contents of the deleted `docs/definitions.md#What the file contains` | D3 L313-319 (the map, carried); A9 L179-195 (two pairs, carried here) | the contents (work order 04 made the deletion); A9's facts | A9 L191 "intervals" reads "temperature differences" |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
1, forward links, confirmed as the rule (this page links
`builtins.md#constants`; `docs/definitions.md`, written before it,
deleted `#What the file contains` and links this page's §7 headings,
which it keeps). Nothing else touches this page.

## 9. Code changes it waits on

None. The file's comment changes (B-061 the header's term, B-062
`gravity`'s mark, B-063 the years' source, B-064 `bit`'s reason, B-065
the header's sources, B-059 "temperature difference") are the code
track's batch 3 (one commit after the pages, Q-059); the page states
the facts now and names the file's own sources and the three documents
B-065 adds (section 4). B-014 (the
dalton's edition) is not scheduled: "CODATA 2018".

## 10. Done when

- Every section of section 4 exists under its heading, the linked
  headings exactly as written; every fact `docs/definitions.md#What
  the file contains` carried before work order 04 deleted it is
  here.
- No "approximate" for a unit, no "system file", no "interval", no
  issue number, nothing of a unit `a`, no `docs/functions.md`.
- Every link is a repo-relative path to an existing page or to
  `builtins.md#constants`.
- The pull request names the choices made and any question for the
  owner, and changes nothing outside this file.
