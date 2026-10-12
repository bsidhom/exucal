# Work order 08: `docs/app.md` (The app)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
section 12.1) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D9 (L165-265)` is `audit/reports/D9/fable.md`, lines 165 to 265. `§7`
is `audit/plan/07-docs-outline.md`, `§8` is `audit/plan/08-terminology.md`.*

## 1. The page and its place in the order

- **Page.** `docs/app.md`, titled "The app": what is specific to the web
  app, in six sections (§7; §12 questions 3 and 22; F-180): installing,
  offline use, updates and the build ID, the settings panel, copying a
  result, the two fields.
- **Order.** Eighth, after every reference page; it links `numbers.md`
  (pastes back), `expressions.md` (what to type), `settings.md` (the
  settings themselves) and links no page written after it. Later
  pages link it (`docs/README.md`, getting started, the devdocs:
  `offline.md`, `settings.md`, `security.md`, `architecture.md`), so its
  headings are §7's anchors (section 4). `settings.md` already links
  `app.md#the-settings-panel`.
- **Status.** Ready. D9 drafted the page (D9 L165-265); V8 drafted three
  of its sections independently (V8 L130-166); the page is D9's draft
  with V8's word-by-word list and the privacy sentence (F-180). The
  paragraph on the build ID has left `docs/settings.md` (work order 06).
- **Output.** The page, and in the pull request the choices made and any
  question for the owner.
- **Not in scope.** No code: the hint (B-022), the load-failure
  message's parenthesis (B-023) and the service-worker comments
  (B-053) are the code track's; `devdocs/offline.md`'s split is work
  order 23.

## 2. The reader, and what earlier pages taught

The reader has read, or can read, the whole reference: what to type is
`expressions.md`'s, what a result means `numbers.md`'s and
`quantities.md`'s, what each setting does `settings.md`'s. This page
says only what the app as a web page does: how it installs, how it
works offline, how it updates and names its build, how the settings
panel behaves on a phone and a wider screen, what the copy button
does, and what the two fields do beyond reading an expression. It
links the owners and restates nothing: `numbers.md#how-numbers-are-written`
for the paste-back principle, `settings.md#where-the-settings-are-and-how-a-change-applies`
and `#defaults-and-resets-storage` for the settings, `expressions.md#evaluation-order-and-error-locations`
for which field an error points at.

## 3. Rules that bind the page, applied to the drafts

- **The settings panel (F-488).** "The settings panel" and "the panel",
  never "sheet" (D9 L175, L228-239; V8 L132, L141): the section is "The
  settings panel", and "the cog" opens it (F-495).
- **The app's words (Q-022, F-492, F-493, F-494).** "The build ID",
  the section "Updates and the build ID"; "the service worker", named
  once where offline use is explained as what lets the app be served
  offline, then kept; "a new version" for a new deployment that could
  be pulled, "update" always a verb, never "deploy" or "deployed" (D9
  L205 "last deployed", V8 L149 "after a new version is deployed":
  reworded, "the version the footer names", "once a new version is
  available").
- **Pastes back (F-457).** D9 L248's "reads back" reads "pastes back";
  the principle is `numbers.md`'s, linked.
- **Refusal only for a size refusal (F-442).** D9 L251's "when the
  browser refused the clipboard" reads "when the clipboard could not
  be written"; nothing on this page is "refused".
- **Quoting the app's text (Q-007).** Every word the footer can show is
  quoted verbatim (F-174; V8's list, D9 L199-226), as `src/app-footer.ts`
  has it when the page is written; the hint in the empty output area
  is described, not quoted (F-179, Q-056: its wording changes with
  B-022); the load-failure message is described without its
  parenthesis "(fetchFailed)" (F-170, Q-057).
- **Future work is `devdocs/future.md`'s alone (Q-011).** No issue is
  named; nothing of the "About these settings" link becoming local one
  day (Q-115: the page states the link as it is).
- **No link down to the devdocs (§9.2; F-180).** V8's draft links
  `security.md`; the page links nothing under `devdocs/`: the privacy
  sentence stands on its own (Q-028, F-171), and `security.md` links
  here.
- **Numbers (Q-016).** No timing; "twelve characters" of the commit
  hash is a fact of the footer and stays (F-175).

## 4. The outline, section by section

Headings, in §7's order, each an anchor later pages link:
"Installing", "Offline use", "Updates and the build ID", "The settings
panel", "Copying a result", "The two fields".

- **Installing.** D9's and V8's sections (V8 L141 for the framing: a
  progressive web app a browser can install to the home screen or the
  desktop; how the browser offers it is the browser's).
- **Offline use.** The service worker named once as what lets the app
  be served offline (F-493); what the app shows while the definitions
  load ("Loading units…") and when they fail (the message, the Retry
  button, the retry the user's and never automatic), described from
  `src/app-shell.ts`, which the session reads (F-169, low confidence;
  F-170); the privacy sentence: the page calls no third-party service
  and sends nothing anywhere (Q-028, F-171).
- **Updates and the build ID.** The paragraph that left `docs/settings.md`
  with its two omissions restored: the build is plain text also when
  the service worker failed to register, and following the "update to …"
  link reloads every open page of the app (F-173; (3) settled against
  `src/register-service-worker.ts`, F-403); what the build ID is: the
  footer shows "Build" and the first twelve characters of the commit
  the copy was built from, the full hash as the hover title, "-dirty"
  for a build from uncommitted changes (F-175); every footer word
  quoted (F-174, Q-007; the mapping from the worker's status to the word
  stays in `devdocs/offline.md`); the checks the app makes on its own
  (F-495).
- **The settings panel.** The mechanics from D9 L228-243 under F-488:
  the cog, the panel over the page that leaves the result in view, on a
  phone sliding up, on a wider screen along the right edge, Done and
  Escape, the steppers, the on-screen keyboard; every change applies as
  it is made; the "default …" link beside a setting that is not at its
  default and "Reset all settings" at the panel's foot, kept here in
  one place (F-176); "About these settings" at the panel's foot, which
  opens the settings reference (F-177); what the settings do is
  `settings.md`'s, linked.
- **Copying a result.** D9 L245-254 under F-457 and F-442: the copy
  button writes text that pastes back (`36 in`; `0.027777778 * 3 ft` for
  the reciprocal line), the principle linked at `numbers.md`; the icon
  becomes a check mark for a moment, or a cross in the error colour
  when the clipboard could not be written, and a live region says
  "Copied" or "Couldn't copy" for a screen reader (F-178; low
  confidence: the session reads `src/copy-button.ts`).
- **The two fields.** D9 L256-264: the labels, named beside have and
  want (F-471); the hint shown while the have field is blank, described
  (F-179, Q-056); the fields switch off autocomplete, autocorrect,
  autocapitalization and spell-checking and stay out of the form
  history; an error marks the field at fault, the have's before the
  want's (`expressions.md` says which text an error points at); what to
  type is `expressions.md`'s.

## 5. Findings applied

| Finding | Section | Decision |
| --- | --- | --- |
| F-169 | Offline use | The loading and failure messages, read from `src/app-shell.ts`; "service worker" named there (F-493) |
| F-170 | Offline use | The failure described without "(fetchFailed)" (Q-057) |
| F-171 | Offline use | The privacy sentence (Q-028); no link down |
| F-172 | Offline use | The user's side here; `offline.md`'s split is work order 23 |
| F-173 | Updates and the build ID | The paragraph here with the two omissions restored (Q-022, F-494) |
| F-174 | Updates and the build ID | Every footer word quoted (Q-007); the status mapping stays in devdocs |
| F-175 | Updates and the build ID | What the build ID is (Q-022) |
| F-176 | The settings panel | The mechanics and the reset links here, in one place (F-488) |
| F-177 | The settings panel | The "About these settings" link stated (Q-115, Q-007); "the panel's foot" |
| F-178 | Copying a result | The feedback, read from `src/copy-button.ts`; "pastes back" |
| F-179 | The two fields | The hint described, not quoted (Q-056) |
| F-180 | (the page) | D9's draft with V8's word list and the privacy sentence; no link down; the terms per Q-022, F-488, F-493, F-494 |

Owned elsewhere and read here: F-426, F-492.

## 6. Decisions followed, and still open

Followed: Q-007, Q-008 (the page after `settings.md`), Q-011, Q-022
(A), Q-028, Q-056, Q-057, Q-115; the rules F-442, F-457, F-471, F-488,
F-492, F-493, F-494, F-495.

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| The whole page | D9 L165-265 | the draft | "sheet" to "panel" (L175, L228-239); "last deployed" (L205) reworded; "reads back" (L248) to "pastes back"; "refused the clipboard" (L251) reworded; the privacy sentence and V8's word list folded in |
| Installing; Offline use; Updates and the build ID | V8 L130-166 | the facts and the word list; V8's framing where D9 lacks it | "deployed" (L149) reworded; "sheet" (L132, L141); the link down to `security.md` dropped |
| Deleted from `docs/settings.md`: the build-ID paragraph | D9 L161-163; V8 L168-170; D4 L350 | done by work order 06 | — |

## 8. Conflicts left to settle

None of the owner's list touches this page. The session records in its
pull request the footer words as it found them in `src/app-footer.ts`
and what it read in `src/app-shell.ts` and `src/copy-button.ts`.

## 9. Code changes it waits on

None. Complicates, no wait: B-022 (the hint described, not quoted),
B-023 (the parenthesis not quoted), B-053 (comments only), B-069 (the
"About these settings" link stays an absolute URL until the pages ship
with the app; the page states the link, not its target's form).

## 10. Done when

- The six sections exist under their headings, in order, each stating
  the app's behaviour and linking the reference for everything else.
- No "sheet", no "deploy", no "build number", no "reads back", no
  "refused", no issue number, no link under `devdocs/`.
- Every footer word is quoted as the code has it; the hint and the
  failure message are described, not quoted.
- The pull request names what the session read in the three source
  files and any question for the owner, and changes nothing outside
  this file.
