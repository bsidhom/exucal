# Work order 25: `devdocs/security.md` (Security)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`V8 (L279-283)` is `audit/reports/V8/fable.md`, lines 279 to 283. `§8`
is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/security.md`, "Security": the dependencies (the
  supply chain), the toolchain and secrets, the rules for code that
  runs commands, and the page itself (what it loads and sends); the
  mechanism and the rules, in the present tense.
- **Order.** Twenty-fifth: after `docs/app.md` (work order 08), whose
  `#offline-use` carries the user's privacy sentence this page's `#The
  page` is the developer side of (Q-028, F-171); that sentence links
  `#The page` (R-1 of the review, plan §12.3), so the heading stays "The
  page" (the page written first links the later page's heading, which
  the later page keeps). It comes after
  `devdocs/offline.md` (23) and `devdocs/deployment.md` (24), which it
  links. `README.md` (26) links it last, listing all four sections
  (F-182).
- **Status.** Ready. V8 audited the page (its edits, V8 L279-295), the
  one unit on it.
- **Output.** The page in one pass, and in the pull request any
  question for the owner.
- **Not in scope.** `scripts/cloud-env` (B-054, the code track's: its
  comment says a deploy is made from a developer's machine); the
  panel's "About these settings" link (B-069, later).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `docs/app.md` (nothing the user
types leaves the device: the app calls no third-party service, and
contacts only the host it was loaded from, and only for its own static
files, to load them and to check for and fetch a new version, sending
it no local data, R-2; the settings panel's link to the user docs),
`devdocs/offline.md` (the precache; the service
worker) and `devdocs/deployment.md` (Workers Builds deploys, with
credentials Cloudflare holds). `#The page` opens with a link to
`docs/app.md#offline-use` for the user's side and states the
developer's facts: the page is the app's own bundle and the
definitions file, both from its origin and served from the precache
once installed; it calls no third-party service; its only requests
after loading are the checks for a new version, to its own origin, and
they carry no local data (stated as the code has them, without
contradicting `docs/app.md`'s sentence, R-2); and it carries one
absolute URL, the panel's link to the user docs, until the pages ship
with the app (Q-115, B-069).

## 3. Rules that bind the page, applied to the drafts

- **Who deploys (Q-030 ok; F-408).** `#Toolchain and secrets` reads:
  "`scripts/cloud-env` sets no token, and says so; and nothing the
  project builds, tests or runs needs one: the deploy is made by
  Cloudflare Workers Builds, with credentials Cloudflare holds, never
  from a cloud session" with the link to `deployment.md` (V8 L283);
  the script's contrary comment is B-054's.
- **Where each opt-out lives (F-409).** "`DO_NOT_TRACK` in the cloud
  environment's variables, `send_metrics` in `wrangler.jsonc`, and
  `WRANGLER_SEND_METRICS=false` in `.env`" (V8 L283).
- **The command rule (F-410).** "A command runs with its arguments as
  an array (`execFileSync`, `execFile` or `spawn`), never as a command
  string and never with `shell` set", and the callers are "the tests,
  plugins and stress tools that call git, tsc or Prettier" (V8
  L285-289).
- **The words (§8).** "The settings panel", never "sheet" (V8 L295;
  F-488); the `docs/app.md` section is "Offline use", D9's name, so
  V8's link text "Working offline" (V8 L295) is replaced and the anchor
  is `#offline-use` (F-171, Q-028); "the definitions file" (V8 L295 has
  it; F-475); "cloud session", "precache", "Preview" as §8 has them
  (F-496); "the service worker" (F-493); "a deploy" devdocs-only
  (F-494).
- **Markdown (principles).** Inline links.

## 4. The page, section by section

- **Dependencies.** No finding; the words of section 3.
- **Toolchain and secrets.** V8 L279-283 (F-408, F-409).
- **Code that runs commands.** V8 L285-289 (F-410).
- **The page.** V8 L291-295 with the link to `docs/app.md#offline-use`
  and "the settings panel"; the heading stays "The page", which
  `docs/app.md`'s privacy sentence links (R-1); the one-absolute-URL
  sentence stays until the pages ship with the app (Q-115; F-177 is
  `app.md`'s).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-408 | Toolchain and secrets | Workers Builds alone (Q-030); B-054 is the code's |
| F-409 | Toolchain and secrets | Where each opt-out lives |
| F-410 | Code that runs commands | `spawn`, never `shell`; the callers |

Owned elsewhere and read here: F-171 (the user's privacy sentence,
which links `#The page`, R-1),
F-177 (the absolute URL), F-182 (the index's line), F-426, and the
terminology findings F-475, F-488, F-493, F-494, F-496.

## 6. Decisions followed, and still open

Followed: Q-008, Q-028, Q-030, Q-115; the review's answers R-1 and R-2
(plan §12.3); the rules of section 3.

Still open: nothing.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| Toolchain and secrets | V8 L279-283 | V8 | — |
| Code that runs commands | V8 L285-289 | V8 | — |
| The page | V8 L291-295 | V8 | "the settings panel"; the `#offline-use` anchor and D9's section name |

## 8. Conflicts left to settle

None of the owner's list. Of the review's answers (plan §12.3): R-1,
`docs/app.md` links `#The page`, which keeps its heading and links back
to `docs/app.md#offline-use`; R-2, the privacy sentence's wording, which
`#The page` states from the developer's side and does not contradict.

## 9. Code changes it waits on

None. B-054 and B-069 change nothing here until they land; B-069 then
removes the one-absolute-URL sentence.

## 10. Done when

- The three edited sections read as section 3 has them; `#The page`
  keeps its heading and links `docs/app.md#offline-use`; "panel", never
  "sheet".
- The pull request changes nothing outside this file.
