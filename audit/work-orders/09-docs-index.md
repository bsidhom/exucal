# Work order 09: `docs/README.md` (the index) and the root `README.md`

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes these two files reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`; each is
read at its id. A report pointer such as `D9 (L101-139)` is
`audit/reports/D9/fable.md`, lines 101 to 139. `§7` is
`audit/plan/07-docs-outline.md`, `§8` is `audit/plan/08-terminology.md`.*

## 1. The pages and their place in the order

- **Pages.** `docs/README.md`, the index of the user docs: what the app
  is in two sentences, the page list with one line each, and where the
  developer docs are (§7); and the root `README.md`, three sentences
  (§12 question 18): what the app is, where the user docs are, where
  the developer docs are.
- **Order.** Ninth, after every reference page and `app.md`, so that
  every line of the list links a page that exists, with one exception:
  the line for `getting-started.md`, written last (work order 10), links
  a file whose name §7 fixes. `devdocs/README.md` exists at its path
  today and is rewritten last of all (work order 26); the link to it is
  a path, not an anchor.
- **Status.** Ready. D9 drafted both files (D9 L101-139, L141-153); A8
  drafted an opening paragraph (A8 L125-129) and V8 a list entry (V8
  L120-128), reconciled below.
- **Output.** The two files, and in the pull request the choices made.

## 2. The reader, and what earlier pages taught

The index is the first page a user opens: it assumes nothing, defines
nothing, and sends the reader to getting started or to the page that
owns what they need. Each list line says what its page is for in the
page's own words (the titles and roles of §7). The root README is read
by someone who found the repository: it says what the app is and where
each corpus lives, and nothing of how to build or run it, which
`devdocs/development.md` owns (F-004, Q-098).

## 3. Rules that bind the pages, applied to D9's drafts

- **The framing (§12 question 2; F-001, F-472).** Both openings lead
  with the calculator: Exucal is a calculator with unit awareness and
  kind checking; "the converter" is never the app; GNU units is not
  named (it is lineage in the devdocs only, Q-039).
- **"certifies" stays (Q-064, A; F-428).** The intro may say the app
  "computes exactly wherever it can, certifies every digit it shows
  otherwise", since getting started's second section defines the word.
- **Inexact, not approximate (F-451).** D9 L118 and L120 ("approximate
  values") read "inexact values".
- **Refusal only for a size refusal (F-442).** D9 L119 ("what a refusal
  looks like") reads "what an error or a refusal looks like", matching
  getting started's section "When something fails".
- **The settings panel (F-488).** D9 L136 ("the settings sheet") reads
  "the settings panel".
- **`docs/builtins.md` (Q-020).** D9 L134 links `functions.md`: the line
  is "[Built-in functions](builtins.md)".
- **Defined functions (F-478, F-475).** The functions the definitions
  file defines are "defined functions", never "user-defined", while
  only the predefined definitions file is loaded.
- **The reciprocal line (F-470, F-005).** Named "the reciprocal line,
  the conversion the other way round" once, if the intro names it at
  all; the worked examples of today's intro move to getting started
  (F-002), so A8's paragraph (A8 L125-129), which keeps them, exceeds
  §7's index: the two sentences only.
- **Future work is `devdocs/future.md`'s alone (Q-011).** Nothing of
  what may come; no issue.
- **Markdown (principles).** Repo-relative links only.

## 4. The pages

- **`docs/README.md`.** D9 L101-139 under section 3: two sentences on
  what the app is; the list of §7's pages, one line each, in reading
  order (getting started first, then numbers, quantities, the
  expression language, the definition language, the units the app
  knows, settings, built-in functions, the app); where the developer
  docs are (`../devdocs/README.md`, "developer documentation"). V8's
  list entry for `app.md` (V8 L120-128) is folded into D9's: "installing,
  offline use, updates and the build ID, the settings panel and copying
  a result" (F-002). No link from the index to a devdocs page other than
  the index's own line (§9.2 allows that one as navigation).
- **`README.md`.** D9 L141-153 under section 3: what the app is (the
  same framing), where the user docs are (`docs/README.md`), and "The
  developer's documentation, including how to build, run and test the
  app, is in `devdocs/`" (F-003); the tooling sentence goes (F-004); no
  list of devdocs pages.

## 5. Findings applied

| Finding | Page | Decision |
| --- | --- | --- |
| F-001 | both | Lead with the calculator; no GNU units; the list is §7's with `builtins.md` |
| F-002 | both | §12 question 18 with D9's two files; the examples to getting started; "certifies" stays; "the settings panel" |
| F-003 | root README | The devdocs sentence as D9 words it |
| F-004 | root README | The tooling sentence goes (Q-098) |
| F-005 | index | "the reciprocal line" once (F-470) |
| F-006 | index | §7's pages, one line each; "defined functions" |
| F-007 | index | Resolved by the §7 index |

Owned elsewhere and read here: F-009 (getting started takes the
examples), F-086, F-178, F-180 (`app.md`'s line), F-428, F-457, F-470,
F-472, F-478, F-495.

## 6. Decisions followed, and still open

Followed: Q-008, Q-011, Q-020, Q-039 (no GNU units here), Q-064 (A),
Q-098; §12 question 18; the rules F-442, F-451, F-470, F-472, F-475,
F-478, F-488.

Still open: nothing.

## 7. Proposed text to start from, and what the rules change in it

| Page | Report lines | Use | What changes |
| --- | --- | --- | --- |
| `docs/README.md` | D9 L101-139; V8 L120-128 (the `app.md` line); A8 L125-129 (not applied: its examples are getting started's) | D9's page with V8's line folded in | L118, L120 "inexact"; L119 "an error or a refusal"; L134 `builtins.md`; L136 "panel" |
| `README.md` | D9 L141-153 | D9's file | — |

## 8. Conflicts left to settle

From the owner's list (`audit/decisions.md`, "For the owner"): conflict
1, forward links, confirmed as the rule: the index links `getting-started.md` before it exists
(a file name §7 fixes, no anchor). Nothing else.

## 9. Code changes it waits on

None.

## 10. Done when

- The index is two sentences, the page list and the devdocs line; the
  root README is three sentences; every link but the getting-started
  line resolves.
- No "converter" for the app, no GNU units, no "approximate values",
  no "sheet", no "user-defined", no `functions.md` on the user side.
- The pull request changes nothing outside the two files.
