# Work order 24: `devdocs/deployment.md` (Deployment)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V8 (L273-277)` is `audit/reports/V8/fable.md`, lines 273 to 277. `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/deployment.md`, "Deployment": one section, the
  mechanism (Cloudflare Workers Builds runs the build and the deploy;
  wrangler's configuration and pin; the preview deployments), the
  decisions with their reasons, and one ruled-out alternative (`pnpm
  dlx wrangler`), which all stay (F-406, F-407).
- **Order.** Twenty-fourth: after `devdocs/offline.md` (work order 23)
  and `devdocs/development.md` (22), which it may link; before
  `devdocs/security.md` (25), which links it for who deploys (Q-030,
  F-408). `README.md` (26) links it last.
- **Status.** Ready. V8 audited the page (its one edit, V8 L273-277),
  the one unit on it.
- **Output.** The page in one pass, and in the pull request any
  question for the owner.
- **Not in scope.** `scripts/cloud-env` (B-054, the code track's);
  `wrangler.jsonc`.

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `devdocs/development.md` (the
commands, the cloud environment) and `devdocs/offline.md` (the
precache, the build ID). The page says how a deploy happens and why
it is arranged so, in the present tense.

## 3. Rules that bind the page, applied to the drafts

- **Intent, not history (F-406).** The version stamp "(as of
  4.130.0)" goes, since it mirrors the pin in `package.json` and reads
  as history after the next bump; "Both are worth rechecking when
  wrangler is updated" is added (V8 L275-277).
- **Who deploys (Q-030 ok).** The owner uses Cloudflare Workers Builds
  alone, so the page says nothing of a developer's own `wrangler
  deploy`; `security.md` (work order 25) aligns with it (F-408).
- **What cannot be verified from the tree (F-407).** The statements
  about wrangler's and Workers Builds' behaviour (P1, P4, P6, P8 in
  V8's numbering) stay as stated; P8 is a ruled-out alternative with
  its reason and stays.
- **The words (§8; F-496).** "Preview" for a preview deployment, "a
  deploy" for the act, "cloud session" glossed once if named, "the
  service worker" (F-493), "build ID" (Q-022).
- **Markdown (principles).** Inline links.

## 4. The page, section by section

- **(top).** The page as it stands with the one edit of section 3 and
  the words of §8.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-406 | (top) | Update: the stamp goes; the recheck sentence added |
| F-407 | (top) | Keep as stated |

Owned elsewhere and read here: F-408 (Q-030), and the terminology
finding F-496.

## 6. Decisions followed, and still open

Followed: Q-008, Q-022, Q-030; the rules of section 3.

Still open: nothing.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| (top) | V8 L273-277; the page | the page with V8's edit | — |

## 8. Conflicts left to settle

None of the owner's list touches this page.

## 9. Code changes it waits on

None. B-054 (`scripts/cloud-env`'s pointers and its claim about who
deploys) is the code track's and does not change the page.

## 10. Done when

- The stamp is gone and the recheck sentence present; nothing else
  moved; the words follow §8.
- The pull request changes nothing outside this file.
