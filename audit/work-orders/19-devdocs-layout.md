# Work order 19: `devdocs/layout.md` (Layout)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V7 (L180-196)` is `audit/reports/V7/fable.md`, lines 180 to 196. `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/layout.md`, "Layout": the files of the repository
  (`#The files`) and the module table (`#The modules`), mechanism only,
  one line a file, with its test named on the line for a module outside
  `src/core/` (F-369; §12 q24).
- **Order.** Nineteenth: after `docs/units.md` (work order 05), which
  the `src/units.txt` bullet now points at for the file's contents
  (F-366, F-369), and after the design pages. It links
  `devdocs/testing.md` (work order 20), written later, at its current
  headings; a later page that renames one updates the inbound links.
  `devdocs/offline.md` (work order 23) aligns its `#Icons` section with
  this page's favicon wording (Q-111), which this session hands it
  (section 3).
- **Status.** Ready. V7 audited the page (its edits, V7 L180-205); V8
  confirmed `offline.md#Icons` as written and drafted no edit (V8 L62,
  L111), which is the one conflict (F-362).
- **Output.** The page in one pass, and in the pull request the result
  of the favicon check for work order 23 and any question for the
  owner.
- **Not in scope.** `devdocs/offline.md#Icons` (work order 23 applies
  the favicon wording); `devdocs/testing.md` (20); the tree itself.

## 2. The reader, and what earlier pages taught

The reader is a developer who has read the design pages and
`docs/units.md`, so the page describes no semantics: for what the
definitions file contains it links `docs/units.md`; for what a test
does it links `devdocs/testing.md`; a module's line says what the
module is for, in the words the design pages use (the kernel, the
ball, the pipeline, the shell, the panel), never a second explanation.

## 3. Rules that bind the page, applied to the drafts

- **`experimentalDecorators` (Q-070, other).** The clause about Vite
  goes. The page keeps the flag with its real reason: the components
  use Lit's decorators in TypeScript's experimental form, which needs
  `experimentalDecorators` and `useDefineForClassFields: false` in
  `tsconfig.base.json`, as Lit's decorators page describes (the link
  is `https://lit.dev/docs/components/decorators/`). Nothing about
  moving to standard decorators: that is a possible code change, not
  page content (F-365).
- **`audit/` and `.claude/skills/` are not listed (Q-071).** Both leave
  when the revamp lands, and the owner wants them mentioned nowhere;
  `.prettierrc.json`, `.prettierignore`, `LICENSE` and the root
  `README.md` stay unlisted too (F-364).
- **The favicon (Q-111; F-362).** The session reads `public/favicon.svg`
  against `public/icons/`. If the favicon is its own drawing, the
  manifest bullet takes V7's wording: "`public/icons/` holds the icons
  the manifest points to and the PNG some platforms need is rendered
  from; `public/favicon.svg`, which `index.html` links, is the browser
  tab's icon" (V7 L190-196), and the pull request tells work order 23
  to name the favicon as the tab icon's separate source in
  `offline.md#Icons` in the same words. If it is rendered from an
  `icons/` SVG, both pages say the sentences mean the app icon's
  forms, and the pull request says so for work order 23.
- **The definitions file (F-475; F-366, F-369).** The `src/units.txt`
  bullet names the file as "the definitions file" and points at
  `docs/units.md` for its contents (the page's own one-sentence pointer
  stays; it never explains the file's semantics, Q-077).
- **The words (§8).** "reached only through" for a module only tests
  exercise (F-498, V7's wording); "dimensionless" or "plain number" as
  synonyms if a line needs either (F-460); "the settings panel" (F-488)
  on the panel's line; "service worker" (F-493); "build ID" (Q-022).
- **Markdown (principles).** Inline links; the table stays a table.

## 4. The page, section by section

- **The files.** V7 L180-196: the `src/core/` bullet states the
  test-beside-each-module rule, its three exceptions, and
  "`builtins/exact.test.ts`, which is beside no one module, runs the
  exact functions through the pipeline" with the link to
  `testing.md` (F-363, Q-072); the `src/units.txt` bullet (section 3);
  the `src/main.ts` bullet names `exactDec` and the two draws if V7's
  list of what it omits is right (F-375: the session checks
  `src/main.ts`); the manifest bullet (section 3); the
  `experimentalDecorators` sentence (section 3); `audit/` and the skill
  absent (section 3).
- **The modules.** V7 L198-205: `src/testing/random.ts`'s line names
  `src/testing/random.test.ts`, which checks it against the published
  vectors (F-367); the lines of `bench/stress/harness.ts`, `cases.ts`,
  `pool.ts` and `catalogue.ts` name their tests, and `bench/harness.ts`'s
  reads "`bestOf`, `word` and `millis`: the timing, the names and the
  report's format only the benchmarks need" (F-368); `inLowestTerms`
  is named on its module's line if the session finds it exported and
  unlisted (F-368 drafts nothing for it); `exact.test.ts` stays in the
  table as the sweeps are (Q-072).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-362 | The files | Undetermined; settled by the favicon check (Q-111), handed to work order 23 |
| F-363 | The files | The `exact.test.ts` clause (Q-072) |
| F-364 | The files | Neither `audit/` nor the skill listed (Q-071) |
| F-365 | The files | The Vite clause goes; Lit's reason (Q-070) |
| F-366 | The files | No change beyond the pointer; §9.2 corrected (Q-077) |
| F-367 | The modules | The random test named |
| F-368 | The modules | The four stress tests and `millis` named |
| F-369 | (the page) | Mechanism; the contents pointer to `docs/units.md`; "the definitions file" |

Owned elsewhere and read here: F-375 (`exactDec` and the draws), and
the terminology findings F-460, F-475, F-488, F-493, F-498.

## 6. Decisions followed, and still open

Followed: Q-008, Q-022, Q-070, Q-071, Q-072, Q-077, Q-111; the rules
of section 3.

Still open: nothing. Q-111 is settled by the check this session makes.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| The files | V7 L180-196 | V7 | the `experimentalDecorators` sentence rewritten per Q-070; the favicon wording per the check; `docs/units.md` as the contents pointer; "the definitions file" |
| The modules | V7 L198-205 | V7 | — |

## 8. Conflicts left to settle

None of the owner's list touches this page. The session records in
its pull request the favicon check's result, addressed to work order
23.

## 9. Code changes it waits on

None.

## 10. Done when

- `#The files` lists neither `audit/` nor `.claude/skills/`, states the
  `exact.test.ts` clause, gives Lit's reason for the flag without
  naming Vite, and points at `docs/units.md` for the definitions file's
  contents; the manifest bullet matches `public/favicon.svg`.
- `#The modules` names the random test, the four stress tests and
  `millis`.
- The pull request carries the favicon finding for work order 23 and
  changes nothing outside this file.
