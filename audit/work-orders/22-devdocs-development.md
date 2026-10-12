# Work order 22: `devdocs/development.md` (Development)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D3 (L321-325)` is `audit/reports/D3/fable.md`, lines 321 to 325. `§8`
is `audit/plan/08-terminology.md`, `§12` is
`audit/plan/12-open-questions.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/development.md`, "Development": prerequisites,
  the commands, the cloud environment, adding a unit, and the style
  guide, which becomes the permanent home of the three principles of
  `audit/principles.md` (the documentation principle, the linking
  principle, the Markdown principle; Q-029, F-402). The page stays
  whole (F-401).
- **Order.** Twenty-second: after `docs/definitions.md` (work order 04)
  and `docs/units.md` (05), which `#Adding a unit` links, and after
  `devdocs/testing.md` (20) and `devdocs/benchmarks.md` (21), which
  the commands link. `devdocs/README.md` (26) links the style guide;
  the code track's comment pass (B-034, Q-059) follows the style
  guide after this page lands (work order 00).
- **Status.** Ready. V8 audited the page (its edits, V8 L205-247); D3
  drafted `#Adding a unit` whole (D3 L321-325), correcting two
  statements V8 confirmed (V8 L48), so D3's text is taken there.
- **Output.** The page in one pass, and in the pull request the
  choices made and any question for the owner.
- **Not in scope.** The units test's wording and failure message
  (B-032, Q-060); the root `README.md`'s tooling sentence, which work
  order 09 removed (Q-098, F-004); `scripts/cloud-env` (B-054).

## 2. The reader, and what earlier pages taught

The reader is a contributor who has read `docs/definitions.md` (the
six kinds of definition, the file's sections, the name rules) and
`docs/units.md` (what the file contains), and the developer pages on
testing and the benchmarks. `#Adding a unit` opens with a link to
`docs/definitions.md` for the format and ends with one to
`docs/units.md` for the catalogue; it says only what a contributor does
and what the test checks (V8 L227-231, D3 L321-325; F-401; Q-105).

## 3. Rules that bind the page, applied to the drafts

- **Rough durations stay (Q-018 B).** "A few seconds" for `pnpm test`
  and `pnpm bench` stays in `#Commands` as a rough, generous duration,
  on this page and the two that repeat it (F-393; V8's rewrite of the
  sentence is not used).
- **Intent, not history.** "still written out" becomes "The cloud
  session hook writes the flag out so that it reads as what it does"
  (V8 L205-209; F-394, update).
- **The test as it behaves today (Q-060 ok; F-398).** `#Adding a unit`
  describes the failure as the test reports it when the page is
  written: "fails with the build error, which names the text at fault
  and where it is" (D3 L325), or the line, if B-032 has landed first;
  the session reads `src/units.test.ts` and writes what it finds.
- **The definitions file (F-475; Q-105).** "The definitions file",
  with `src/units.txt` as its path; adding to it is documented here and
  nowhere else (`docs/definitions.md` dropped "how to add to it").
- **"The edge sweeps" (Q-065; F-462).** The command table says "the
  edge sweeps", never "the conformance tests".
- **Not mentioned (Q-071).** `audit/` and `.claude/skills/` appear
  nowhere on the page; the cloud session hook
  (`.claude/hooks/session-start.sh`) may.
- **The words (§8).** "The settings panel's words are
  `src/settings-lines.ts`'s" (V8 L244's "sheet"; F-488); "a cloud
  session (a session of Claude Code on the web)" glossed once, and
  "Preview" and "precache" as §8 has them (F-496); "kind" in "the
  section its kind belongs to" stays (F-466, D3's wording); "the
  definitions table", or "the table built from the definitions file"
  (conflict 3, answered).
- **Markdown (principles).** Inline links; the command table stays.

## 4. The page, section by section

- **(top), Prerequisites.** Kept as stated; the tool and platform
  behaviour nothing in the tree confirms stays as the page has it
  (F-397).
- **Commands.** V8 L205-209 for the hook sentence (F-394); "a few
  seconds" kept (F-393); "the edge sweeps" (Q-065).
- **Cloud environment.** V8 L211-225: the setup script installs the
  toolchain under `/opt/node24` and a `profile.d` entry that puts it
  first on `PATH` for login shells, nothing per-session, since a
  snapshot cannot hold per-session state (F-395); a session that
  starts without the project's toolchain, and so would run the base
  image's Node.js or reach for `npm`, is what the arrangement exists
  to prevent, and if one does, the hook's output at session start
  names the setup script and prints the versions it found (V8 L221;
  F-396); the cloud-session gloss (V8 L223-225; F-496); the rest kept
  as stated (F-397).
- **Adding a unit.** D3 L321-325 whole, opened with V8's link to
  `docs/definitions.md` (V8 L227-231): append a line to the definitions
  file, or edit one, and run `pnpm test`; the test loads the file and,
  if it does not build, fails with the build error (section 3; F-398);
  a new unit goes in the section its kind belongs to, unit lists having
  a section of their own, after the units and before the counts and
  ratios that end the file (F-399); a function or a primitive goes in
  the file the same way and into the test's list of them, which pins
  both, a prefix needing no test change (F-400); the test row a unit
  earns, and the link to `docs/units.md` (D3 L325; F-400, F-401).
- **Style guide.** V8 L233-247: the documentation principle as drafted
  ("The documentation describes the current state, and git holds the
  history", V8 L240, with what a page states: the current design and
  the intent behind it, the rationale and the alternatives ruled out
  wherever knowing them would stop a reader from re-deciding), and
  the linking and Markdown principles beside it, the three worded
  from `audit/principles.md` so that they survive the audit's removal
  (Q-029; F-402); "No sentence is written in the core … the settings
  panel's words are `src/settings-lines.ts`'s" (V8 L244; F-488); the
  comment rule the comment pass follows (Q-059).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-393 | Commands | "a few seconds" stays (Q-018) |
| F-394 | Commands | Update: the hook writes the flag out |
| F-395 | Cloud environment | The `profile.d` entry |
| F-396 | Cloud environment | The wrong-toolchain sentence corrected |
| F-397 | (top); Prerequisites; Cloud environment | Keep as stated |
| F-398 | Adding a unit | As the test reports it today (Q-060; B-032 is the code's) |
| F-399 | Adding a unit | D3's sentence on the lists' section |
| F-400 | Adding a unit | D3's text with the `docs/units.md` link |
| F-401 | (the page); Adding a unit | The page stays; the opening link; "the definitions file" |
| F-402 | Style guide | The three principles; the README links it (Q-029) |

Owned elsewhere and read here: F-004 (the root README's tooling
sentence), F-114 (the catalogue is `docs/units.md`'s), and the
terminology findings F-462, F-466, F-475, F-488, F-496.

## 6. Decisions followed, and still open

Followed: Q-008, Q-018, Q-029, Q-059, Q-060, Q-065, Q-071, Q-098,
Q-105; the rules of section 3.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| Commands | V8 L205-209; D3 L66 | V8 (D3 words the same sentence) | "a few seconds" kept against V8 L316 |
| Cloud environment | V8 L211-225 | V8 | — |
| Adding a unit | D3 L321-325; V8 L227-231 | D3, opened with V8's link | the failure as the test reports it |
| Style guide | V8 L233-247 | V8, the third bullet added (Q-029) | "the settings panel" (L244) |

## 8. Conflicts left to settle

None of the owner's list touches this page's text; conflict 3 ("the
definitions table") is applied as section 3 says.
The session records in its pull request what `src/units.test.ts`
reports at the time of writing.

## 9. Code changes it waits on

None. B-032 (the test naming the line) lands in batch 3 and the page
then updates one clause; B-034 (the comment pass) follows the style
guide this page states; B-054 is `scripts/cloud-env`'s.

## 10. Done when

- The page keeps its five sections; `#Adding a unit` is D3's text with
  the two links and describes the test as it behaves; `#Style guide`
  states the three principles.
- "a few seconds" stays; "the edge sweeps"; "the settings panel"; "the
  definitions file"; no `audit/` or skill mentioned.
- The pull request names the choices made and changes nothing outside
  this file.
