# Work order 23: `devdocs/offline.md` (Offline behavior, the build ID and the icons)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that rewrites this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D9 (L289-295)` is `audit/reports/D9/fable.md`, lines 289 to 295. `§7.1`
is the concept map in `audit/plan/07-docs-outline.md`, `§8` is
`audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `devdocs/offline.md`: the service worker's design (how the
  app is cached and served, when it checks for a new version, what the
  footer's words come from, installation), the build ID, and the icons;
  mechanism and the decisions' reasons. The user's side of all three
  is `docs/app.md`'s (§7.1; F-172, F-173, F-174, F-175), which this page
  links instead of restating.
- **Order.** Twenty-third: after `docs/app.md` (work order 08), which
  took the user's side, after `devdocs/architecture.md` (13, the UI)
  and after `devdocs/layout.md` (19), whose session checked the favicon
  against `public/icons/` and handed the result on (Q-111). Later
  pages link it (`deployment.md`, `security.md`, `README.md`), so a
  heading is renamed only by updating every link to it.
- **Status.** Ready once work order 19's pull request has recorded the
  favicon check. V8 audited the page (its edits, V8 L249-271) and D9
  drafted the two bullets that overlap V8's (section 7).
- **Output.** The page in one pass, and in the pull request the
  choices made and any question for the owner.
- **Not in scope.** `docs/app.md` (08); `src/register-service-worker.ts`
  (read, not changed); `devdocs/layout.md` (19).

## 2. The reader, and what earlier pages taught

The reader is a developer who has read `docs/app.md` (installing,
offline use, updates and the build ID, the settings panel; every word
the footer can show, quoted there verbatim) and
`devdocs/architecture.md` (the shell and the footer component). Each
part of this page opens with a link to the `docs/app.md` section that
owns the user's side (`#offline-use`, `#updates-and-the-build-id`,
`#installing`) and keeps the mechanism: the registration, the checks
and their constants, the mapping from `WorkerStatus` to the footer's
word, which stays here (Q-007: `app.md` quotes the words, this page
says where each comes from), the build ID's source, the icons' sources.

## 3. Rules that bind the page, applied to the drafts

- **The user's side is `docs/app.md`'s (F-172, F-173, F-174, F-175).**
  What a user does and sees (tapping the build ID, the footer's words
  as a list to search, what the build ID is for a user) is stated in
  `app.md`; this page links those sections and keeps the mechanism and
  the mapping. D9's "Update checks" and "The worker's status" bullets
  (D9 L293, L295) are the base, since they name the constants and keep
  the mapping; V8's edits of the opening and the two bullets (V8
  L251-261) give the `WorkerStatus` list the mapping walks.
- **The words (Q-022 A, F-492; F-493; F-494; F-495; F-496).** "Build
  ID", never "build number" ("Tapping the build ID", V8 L255 reworded;
  the `app.md` section is "Updates and the build ID", D9's name, so
  V8's link text "Updates and the build" is D9's); "service worker",
  never "the worker" (the bullet "The worker's status" is "The service
  worker's status"; D9 L291-295, V8 L259-261); "a new version" for a
  deployment that could be pulled, "update" only as a verb in prose
  (the bullet's label "Update checks" keeps the noun, as headings and
  labels do: R-8 of the review, plan §12.3), "deploy" on this page only
  as the developer's act (V8 L251's "after a deploy" stays); "the cog",
  "install" as §8 has them; "precache" glossed once.
- **Parameters, not measurements (F-403; Q-016).** The check intervals
  are named by their constants, `PERIODIC_CHECK` and `CHECK_INTERVAL`
  in `src/register-service-worker.ts`, not as figures (D9 L293).
- **Intent, not history (F-405).** "There is no other versioning yet"
  becomes "The build ID is the app's only version" (V8 L269-271).
- **The favicon (Q-111; F-362).** `#Icons` says what work order 19's
  check found, in the words `layout.md#The files` uses: either the
  favicon is the tab icon's separate source, `public/favicon.svg`,
  linked by `index.html`, or the sentences mean the app icon's forms.
- **Who deploys (Q-030; F-408).** The page's statements that the
  rasterizer runs in Cloudflare Workers Builds and that no deploy is
  made from a developer's machine stand; nothing contrary is written.
- **Markdown (principles).** Inline links.

## 4. The page, section by section

- **Offline behavior.** The opening paragraph from V8 L251 (the app
  cached in full on first load and served from the precache; a new
  version downloaded after a deploy and offered), with the
  `docs/app.md#offline-use` link; the "Update checks" bullet from D9
  L293: the user's side linked at `#updates-and-the-build-id`; an
  installed app is usually resumed rather than navigated to, so the
  browser's own checks rarely run; the page checks whenever it comes
  back into view or, while in view, back online, only after the
  session has read `src/register-service-worker.ts:76-83` and found
  the `online` handler tests visibility (if it does not, the clause
  reads as the code behaves; F-403); the intervals by their constants;
  tapping the build ID checks at once and counts as the last check
  (V8 L255, "build ID"); the "service worker's status" bullet from D9
  L295 with V8 L261's `WorkerStatus` list (installing, bypassed, ready,
  downloading, waiting, and the rest as the type has them), each
  mapped to the footer's word, the words being `app.md`'s to list; the
  other four bullets stay (D9 L291); the platform behaviour nothing in
  the tree confirms stays as stated (F-404).
- **Build ID.** V8 L263-271: the user's side linked at
  `docs/app.md#updates-and-the-build-id`; "The build ID is the app's
  only version" (F-405); the rasterizer's header and the build's place
  consistent with Q-030.
- **Icons.** The sources per section 3 (Q-111); the platform behaviour
  (O15, O17) stays as stated (F-404).

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-403 | Offline behavior | Undetermined; settled by reading `register-service-worker.ts:76-83`; the constants named (Q-022) |
| F-404 | Offline behavior; Icons | Keep as stated |
| F-405 | Build ID | Update: the app's only version |

Owned elsewhere and read here: F-172, F-173, F-174, F-175, F-180 (the
`app.md` split), F-362 (the favicon), F-408, F-426, and the terminology
findings F-492, F-493, F-494, F-495, F-496.

## 6. Decisions followed, and still open

Followed: Q-007, Q-008, Q-022, Q-030, Q-111; the rules of section 3.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Take | What changes |
| --- | --- | --- | --- |
| Offline behavior, the opening | V8 L249-251 | V8 | the `app.md` link |
| Offline behavior, "Update checks" | D9 L293; V8 L255-257 | D9 (the constants; the online clause after the check) with V8's "tapping" sentence | "build ID"; the anchor `#updates-and-the-build-id` |
| Offline behavior, the status bullet | D9 L295; V8 L259-261 | D9's mapping with V8's `WorkerStatus` list | "the service worker's status" |
| Build ID | V8 L263-271 | V8 | the anchor as D9 names it |
| Icons | the page | the page | the favicon sentence per work order 19 |

## 8. Conflicts left to settle

None of the owner's list touches this page; of the review's answers
(plan §12.3), R-8 keeps the label "Update checks" (section 3). The
session records in its pull request the `online` handler's behaviour
as read and the favicon wording applied.

## 9. Code changes it waits on

None.

## 10. Done when

- Each part opens with its `docs/app.md` link and keeps mechanism
  only; the mapping from `WorkerStatus` to the footer's word is here
  and the user's words are `app.md`'s.
- "build ID", "service worker", "a new version" throughout; the
  intervals by their constants; "yet" gone from the build ID's
  sentence; `#Icons` matches `layout.md`.
- The pull request names the choices made and changes nothing outside
  this file.
