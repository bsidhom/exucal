# Work order 25: `devdocs/security.md` (Security)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
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
  page` is the developer side of (Q-028, F-171), and after
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

The reader is a developer who has read `docs/app.md` (the app loads
nothing from elsewhere and sends nothing; the settings panel's link
to the user docs), `devdocs/offline.md` (the precache; the service
worker) and `devdocs/deployment.md` (Workers Builds deploys, with
credentials Cloudflare holds). `#The page` opens with a link to
`docs/app.md#offline-use` for the user's side and states the
developer's facts: the page is the app's own bundle and the
definitions file, both from its origin and served from the precache
once installed; it calls no third-party service; and it carries one
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
  and "the settings panel"; the one-absolute-URL sentence stays until
  the pages ship with the app (Q-115; F-177 is `app.md`'s).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-408 | Toolchain and secrets | Workers Builds alone (Q-030); B-054 is the code's |
| F-409 | Toolchain and secrets | Where each opt-out lives |
| F-410 | Code that runs commands | `spawn`, never `shell`; the callers |

Owned elsewhere and read here: F-171 (the user's privacy sentence),
F-177 (the absolute URL), F-182 (the index's line), F-426, and the
terminology findings F-475, F-488, F-493, F-494, F-496.

## 6. Decisions followed, and still open

Followed: Q-008, Q-028, Q-030, Q-115; the rules of section 3.

Still open: nothing.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| Toolchain and secrets | V8 L279-283 | V8 | — |
| Code that runs commands | V8 L285-289 | V8 | — |
| The page | V8 L291-295 | V8 | "the settings panel"; the `#offline-use` anchor and D9's section name |

## 8. Conflicts left to settle

None of the owner's list touches this page.

## 9. Code changes it waits on

None. B-054 and B-069 change nothing here until they land; B-069 then
removes the one-absolute-URL sentence.

## 10. Done when

- The three edited sections read as section 3 has them; `#The page`
  links `docs/app.md#offline-use`; "panel", never "sheet".
- The pull request changes nothing outside this file.
