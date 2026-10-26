# Work order 08: `docs/app.md` (The app)

*One of the work orders under `audit/work-orders/` ([README.md](README.md)).
The session that writes this page reads this file,
[`audit/principles.md`](../principles.md) and what this file cites, and
nothing else. Written 2026-10-12 from the owner's answers
(`audit/decisions.md`, recorded in `audit/plan/12-open-questions.md`,
sections 12.1 to 12.3; amended 2026-10-13 after the review of the apply
step) and the consolidated audit. Ids: F-nnn is a finding in
`audit/findings.md`, Q-nnn an open item in `audit/open-items.md`, B-nnn a
bug in `audit/bugs.md`; each is read at its id. A report pointer such as
`D9 (L165-265)` is `audit/reports/D9/fable.md`, lines 165 to 265. `§7`
is `audit/plan/07-docs-outline.md`, `§8` is `audit/plan/08-terminology.md`.*

## 0. Amended after the review (2026-10-26)

The page landed as a short map of about 75 lines (plan §12.3, the
review of the app page, 2026-10-26), and sections 3, 4, 5, 7 and 10
below are read with these rulings, which win where they differ: the
page describes the interface in general terms and quotes none of its
text but the fields' labels "You have" and "You want"; it gives no
implementation detail, and such detail need not be captured in the
developer docs either; the settings' details are the settings page's
alone, linked once as a page, so the reset links, the stepping buttons
and the "About these settings" link are not mentioned (F-176, F-177 as
amended); the build ID is opaque, the page saying only that the footer
shows it and that clicking it checks for a new version (F-175 as
amended); the footer's words are not quoted (F-174, Q-007 as amended);
the checks run on the app's own schedule, with no rate given; the
service worker is named once, as the browser support offline use needs
(F-493 as amended); the loading and failure messages are described in
one sentence (F-169, F-170); the privacy sentence stays (R-1, R-2)
without its closing clause; and "installing changes nothing in the app"
reads "none of the app's own behavior changes when it is installed".
The example tables are headed "You have" and "You want", the fields'
labels. The links are to `expressions.md`, `numbers.md` and
`settings.md` as pages and to `devdocs/security.md#the-page`.

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
  `app.md#the-settings-panel`. Its one link to a page written after it
  is the privacy sentence's, to `devdocs/security.md#The page`
  (`../devdocs/security.md#the-page`; R-1 of the review, plan §12.3),
  whose heading work order 25 keeps.
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
links the owners and restates nothing: `numbers.md` for what a result
means, `settings.md` for the settings, once and as a page (its section
"Where the settings are and how a change applies" was dropped in its
own review, and the reset links are its "Defaults and resets"), and
`expressions.md` for what to type (amended 2026-10-26).

## 3. Rules that bind the page, applied to the drafts

- **The settings panel (F-488).** "The settings panel" and "the panel",
  never "sheet" (D9 L175, L228-239; V8 L132, L141): the section is "The
  settings panel", and "the cog" opens it (F-495).
- **The app's words (Q-022, F-492, F-493, F-494).** "The build ID",
  the section "Updates and the build ID"; "the service worker", named
  once where offline use is explained as what lets the app be served
  offline, then kept; "a new version" for a new deployment that could
  be pulled, "update" always a verb in prose, never "deploy" or
  "deployed" (D9 L205 "last deployed", V8 L149 "after a new version is
  deployed": reworded, "the version the footer names", "once a new
  version is available"); the heading "Updates and the build ID" keeps
  the noun, as headings and labels do (R-8 of the review, plan §12.3).
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
- **One link down, the privacy sentence's (Q-028; R-1).** The privacy
  sentence links `devdocs/security.md#The page`, as V8's draft has it
  and as the owner accepted (Q-028; confirmed in the review, plan §12.3,
  R-1), and `security.md` may link back; the sentence stands on its own
  and the link only leads a curious reader to the mechanism. Nothing
  else on the page links under `devdocs/` (F-180 (5)): V8's link to
  `devdocs/offline.md` is not taken.
- **Numbers (Q-016).** No timing; "twelve characters" of the commit
  hash is a fact of the footer and stays (F-175).
- **The portable format (plan §12.3, 2026-10-14).** The page's opening
  states the half of the first goal it serves: the browser as the
  portable format, where the app installs to the home screen and works
  offline, as a fact about today, nothing of other platforms to come
  (Q-011).

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
  F-170); the privacy sentence, led by V8's "Nothing you type leaves the
  device": the app calls no third-party service; it contacts only the
  host it was loaded from, and only for its own static files (to load
  them, and to check for and fetch a new version); and it sends that
  host no local data, neither what is typed nor what is stored (Q-028,
  F-171; the owner's wording, plan §12.3, R-2). The checks are worded
  as "Updates and the build ID" describes them (no frequency the code
  does not set), "a new version" and not "updates" (F-494), and the
  sentence links `devdocs/security.md#The page` (R-1).
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
| F-171 | Offline use | The privacy sentence (Q-028; R-2's wording), linking `devdocs/security.md#The page` (R-1) |
| F-172 | Offline use | The user's side here; `offline.md`'s split is work order 23 |
| F-173 | Updates and the build ID | The paragraph here with the two omissions restored (Q-022, F-494) |
| F-174 | Updates and the build ID | Every footer word quoted (Q-007); the status mapping stays in devdocs |
| F-175 | Updates and the build ID | What the build ID is (Q-022) |
| F-176 | The settings panel | The mechanics and the reset links here, in one place (F-488) |
| F-177 | The settings panel | The "About these settings" link stated (Q-115, Q-007); "the panel's foot" |
| F-178 | Copying a result | The feedback, read from `src/copy-button.ts`; "pastes back" |
| F-179 | The two fields | The hint described, not quoted (Q-056) |
| F-180 | (the page) | D9's draft with V8's word list and the privacy sentence; one link down, the privacy sentence's (R-1), V8's link to `offline.md` not taken; the terms per Q-022, F-488, F-493, F-494 |

Owned elsewhere and read here: F-426, F-492.

## 6. Decisions followed, and still open

Followed: Q-007, Q-008 (the page after `settings.md`), Q-011, Q-022
(A), Q-028, Q-056, Q-057, Q-115; the rules F-442, F-457, F-471, F-488,
F-492, F-493, F-494, F-495; the review's answers R-1, R-2 and R-8 (plan
§12.3).

Still open: nothing that blocks the page.

## 7. Proposed text to start from, and what the rules change in it

| Section | Report lines | Use | What changes |
| --- | --- | --- | --- |
| The whole page | D9 L165-265 | the draft | "sheet" to "panel" (L175, L228-239); "last deployed" (L205) reworded; "reads back" (L248) to "pastes back"; "refused the clipboard" (L251) reworded; the privacy sentence and V8's word list folded in |
| Installing; Offline use; Updates and the build ID | V8 L130-166 | the facts and the word list; V8's framing where D9 lacks it; V8's privacy sentence | "deployed" (L149) reworded; "sheet" (L132, L141); the link down to `security.md` kept on the privacy sentence (R-1), the one to `offline.md` dropped; the privacy sentence in R-2's wording |
| Deleted from `docs/settings.md`: the build-ID paragraph | D9 L161-163; V8 L168-170; D4 L350 | done by work order 06 | — |

## 8. Conflicts left to settle

Of the owner's list, conflict 1: the page's headings are §7's anchors,
which the pages written after it link and which it keeps. Of the
review's answers (plan §12.3), R-1 and R-2 (the privacy sentence's
link and wording, section 4) and R-8 (the heading keeps the noun,
section 3). The session records in its pull request the footer words
as it found them in `src/app-footer.ts` and what it read in
`src/app-shell.ts` and `src/copy-button.ts`.

## 9. Code changes it waits on

None. Complicates, no wait: B-022 (the hint described, not quoted),
B-023 (the parenthesis not quoted), B-053 (comments only), B-069 (the
"About these settings" link stays an absolute URL until the pages ship
with the app; the page states the link, not its target's form).

## 10. Done when (amended 2026-10-26)

- The six sections exist under their headings, in order, each stating
  the app's behaviour in general terms and linking the reference for
  everything else; the page is short, about 75 lines.
- No "sheet", no "deploy", no "build number", no "reads back", no
  "refused", no issue number, no "update" as a noun outside the
  heading; one link under `devdocs/`, the privacy sentence's to
  `devdocs/security.md#The page`.
- No interface text is quoted but the fields' labels; the footer's
  words, the loading and failure messages and the hint are described
  or left out; no implementation detail, no settings detail, no form
  of the build ID, no schedule of the checks.
- The pull request names what the session read in the source files
  and any question for the owner, and changes nothing outside this
  file but what the review asked for.
