# Unit D9: The index, the intro and the app's surface (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session reports it as both the configured model and the last served one)
- Doc sections read: `docs/README.md` (the whole page: it has no `##` heading); root `README.md#(top)` (the whole file: it has no `##` heading); `docs/settings.md#(top)`, the first paragraph (lines 3-32) and the paragraph "Tapping the build number…" (lines 184-190); `devdocs/architecture.md#UI`, `#The shell and its parts`, `#The converter and its lines`; `devdocs/offline.md#Offline behavior`
- Modules read: `src/unit-converter.ts`, `src/copy-button.ts`, `src/app-footer.ts`, `src/register-service-worker.ts`, `src/service-worker-updates.ts`, `src/settings-button.ts`, each in full
- Also read: `devdocs/architecture.md#(top)` (lines 1-49, the seed §6.7 names for getting started) and `#Not in this design` (lines 950-964, the subsection between two named ones); `audit/reports/A8/fable.md` (the context the unit names); `src/app-shell.ts`, `src/sw.ts`, `src/build-id.ts`, `src/subscription.ts`, `src/main.ts` (in full, to verify the shell's and the worker's user-visible claims); `src/settings-panel.ts` (the header comment, lines 56-129, and the render's foot and the handlers found by search, lines 473-528, 567-575, 863, 874) for the sheet's mechanics; `src/system-build.ts` (lines 1-58, `tableOf`) and `src/system-table.ts` (lines 1-18) for the loading and failure states; the header comments of `src/link-button.ts`, `src/app-button.ts`, `src/step-button.ts` and `src/styles.ts` for the buttons; `src/settings-lines.ts` (lines 114-117, `ABOUT`); `src/core/context.ts` (lines 82-108, `NumberContext`) to drive the harness; `index.html`, `public/manifest.webmanifest` and `vite-plugin-icons.ts` (lines 16-26) for installation; `package.json` (the description and the scripts); `src/outcome.test.ts` (lines 1-80, how the harness builds the table). The pages' examples and the examples of §7's getting-started skeleton were evaluated through `outcomeOf` over the system table, from a scratch script outside the tree, and the suites of `service-worker-updates`, `subscription` and `outcome` were run (38 tests, all passing).

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 0 |
| Claims corrected | 0 |
| Claims not verifiable here | 0 |
| Stale passages: update / keep as intent / drop | 12 / 0 / 1 |
| Gaps confirmed / refuted / new | 8 / 0 / 6 |
| Proposed edits | 7 |
| Questions for the owner | 7 |

## Claims

None assigned. The claims the unit's context names, Q13 to Q18 and N12's typeable-back part, are A8's; this unit read A8's verdicts and re-ran the facts of its own pages that rest on them (the two answers of the intro, the reciprocal line and its absence for a list, the two copy texts) through the harness, and every one reproduces (Findings, "How the pages hold against the surface"). Nothing in this unit's modules contradicts a claim of §1.

## Stale passages

The plan's row for these pages first, then the found ones.

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `docs/settings.md#(top)` (first paragraph) | "There are six settings, kept in the browser so that they survive a reload (under a format version of their own, so that a later build migrates what an earlier one stored; `devdocs/settings.md` is the design)." (§9.4's row; the sheet has eight controls, `src/settings-panel.ts:73-80`) | update | Confirmed. "The settings are kept in the browser, under a format version, so that they survive a reload and a later build reads what an earlier one stored." No count; the controls listed grouped and nested by mode, as the proposed first paragraph below does (§12, question 16). |
| `README.md#(top)` and `docs/README.md#(top)` | The intro paragraph, identical in both (lines 3-14 of each; §9.1's "The intro") | update | The root README becomes three sentences and two links, the docs index two sentences and the page list (§12, question 18); both proposed below. |
| `README.md#(top)` | "[`devdocs/`](devdocs/README.md) is the developer's documentation: the architecture, the layout, development, benchmarks, offline behavior, deployment and security, with the design notes and the plans behind them." | update | "The developer's documentation, including how to build, run and test the app, is in [`devdocs/`](devdocs/README.md)." The design notes and plans are gone from the tree (`ls devdocs` lists sixteen current-state pages and no `design/` or `history/`; `audit/plan.md`), and the list names seven pages of sixteen. |
| `README.md#(top)` | "The app is built with Lit and Vite, written in TypeScript, and uses pnpm for package management; `pnpm install`, `pnpm dev` and `pnpm test` are the commands to start with, and development.md has the rest." | update | delete here: the root README is three sentences and two links, and `devdocs/development.md`, which the sentence itself names as having the rest, owns the commands (V8 confirms they are there). |
| `docs/README.md#(top)` | "An offline-first progressive web app (PWA) that converts units, in the spirit of GNU units" and "As GNU units does, it also answers the other way round" | update | The calculator leads, with unit awareness and kind checking as features, and GNU units is not named in the index (§12, question 2); the proposed page below. The app's own descriptions already lead that way: `public/manifest.webmanifest:4` "An exact unit calculator that works offline", `package.json:5`. |
| `docs/README.md#(top)` | "the other way round" (twice), "for the other way round" | update | "the reciprocal line, the conversion the other way round" once (§8); the examples move to getting started, where the reciprocal line is introduced. |
| `docs/README.md#(top)` | The page list: "[Settings]: … the two limits and the probe, and how a number is held"; "[Unit definitions]: … the expression language, unit lists and user-defined functions"; "[Functions in expressions]: … and what happens with very large results" | update | The list of §7's pages, one line each, proposed below: how a number is held and very large results belong to `numbers.md`, the expression language to `expressions.md`, and the functions the file defines are not "user-defined" while only the system file is loaded (§12, question 12). |
| `docs/settings.md#(top)` (first paragraph) | The sheet's mechanics: "on a phone a panel that slides up … which its handle drags taller … Done, Escape or the cog closes the sheet. A number typed on a phone is committed from the keyboard's Done key, and the display digits, the working digits and the ratio width have − and + buttons beside them … a "default …" link … "Reset all settings" at the foot" | update | One sentence that says where the settings are and that a change applies as it is made, with a link to `docs/app.md#The settings sheet`, which takes the mechanics (§12, question 3; §6.5); the proposed paragraph below. The mechanics hold against `src/settings-panel.ts:56-71, 83-86, 94-101`. |
| `docs/settings.md#(top)` (first paragraph) | "`devdocs/settings.md` is the design" and "(`devdocs/settings.md`, "The model")" | drop | Links from docs down to devdocs (§9.2); the pointers carry nothing a user needs, and the rewritten paragraph has none. |
| `docs/settings.md#(top)` | The paragraph "Tapping the build number in the footer asks at once whether a new version of the app has been deployed, rather than waiting for the app's own checks (see devdocs/offline.md); the footer says "checking…" … The build number is plain text in development or in a browser without service workers, which have no service worker to ask." (lines 184-190) | update | delete here: the update check is not a setting, and `docs/app.md#Updates and the build ID` owns it (§6.5, C57; §12, question 22), where it is restated with two corrections: the build is plain text also when the registration failed (`src/app-footer.ts:163-166`), and it is a build ID, a commit hash, not a number (`src/build-id.ts:1-14`). |
| `devdocs/architecture.md#The shell and its parts` | "and checks for an update when its build number is tapped ([offline.md](offline.md))" | update | "and checks for an update when its build ID is tapped ([offline.md](offline.md); what the user sees of it is in [docs/app.md](../docs/app.md), "Updates and the build ID")". |
| `devdocs/offline.md#Offline behavior > Update checks` | "The page asks for one whenever it comes back into view or back online, and every hour while it stays in view, but never within five minutes of the last … Tapping the build number in the footer checks at once" | update | "whenever it comes back into view or, while in view, back online" (`src/register-service-worker.ts:76-83`: the online handler checks only when the page is visible), "the build ID", and the intervals named by their constants rather than as figures; the proposed bullet below. |
| `devdocs/offline.md#Offline behavior > The worker's status` | "in a word or two: "caching…" on the first visit, "downloading…" while an update downloads, or "bypassed" with a reload link …, and nothing at all while the worker is ready" | update | The footer also says "no offline" (`unsupported`), "worker failed" (`failed`), "updating…" (`applying`) and "update" alone until the waiting worker has named its build (`src/app-footer.ts:191-194, 214-216, 219-220`); the words move to `docs/app.md`, and the bullet keeps the mapping from status to word, proposed below (§12, question 24). |

The rows for `devdocs/architecture.md#The converter and its lines` are A8's (the re-parse that does not happen, "stays in the component", "[#92][92]"); this unit confirms them from the component's side under Findings and does not repeat them.

## Findings

For a D unit: each gap of §6 (and §9, for these pages) confirmed, refuted or added; then the unit's output, the getting-started skeleton's facts and the decision on `app.md`.

**Gaps of §6 and §9 for these pages.**

- **§6.7, getting started missing entirely: confirmed.** `docs/` holds four pages (`README.md`, `definitions.md`, `functions.md`, `settings.md`) and none is a guide; the index's intro (`docs/README.md:3-14`) is the only tour by example. Its seed in `devdocs/architecture.md#(top)` (lines 3-9) frames the app as "a unit converter inspired by GNU units, grown into an arbitrary-precision calculator", with have and want in bold, the one place the fields' names are introduced; getting started takes that introduction (§8). The facts for the skeleton are below.
- **§6.5, the update-check paragraph and the sheet's layout to `app.md`: confirmed.** `docs/settings.md:184-190` is the update check, which no setting touches (the check is the footer's, `src/app-footer.ts:142-146`), and `docs/settings.md:3-23` is the sheet's mechanics down to the handle and the keyboard's Done key, where §7's `settings.md` keeps only "where the settings are and how a change applies (short)". Both are tagged above and restated in the proposed `docs/app.md`.
- **§6.8, `docs/README.md` must link to the foundation pages: confirmed, and resolved by the §7 form.** The intro's `≈` lines (`docs/README.md:6-8`) link nowhere; in the proposed index the examples leave for getting started, whose "Reading `=`, `≈` and a note" links to `numbers.md`, and the index itself becomes the page list.
- **§9.1, the intro duplicated: confirmed.** Lines 3-14 of `README.md` and of `docs/README.md` are identical (`diff` reports no difference). §12, question 18 settles it: three sentences and two links at the root, the user index in `docs/`.
- **§9.1, the update check duplicated: confirmed.** `docs/settings.md:184-190` and `devdocs/offline.md:40-70` describe the same footer; the words agree where both name them ("checking…" is in the docs page only, "bypassed" and "worker …" in the devdocs page only). `docs/app.md` becomes the one user-side owner, and the devdocs bullets keep the mechanism (§12, question 24).
- **§9.1, the sheet duplicated: confirmed on the docs side.** `docs/settings.md:3-23` restates what `src/settings-panel.ts:56-101` describes; `devdocs/settings.md#The sheet` is V5's and was not read here.
- **§9.2, docs linking down to devdocs: confirmed for these paragraphs.** "`devdocs/settings.md` is the design" (`docs/settings.md:27`), "(`devdocs/settings.md`, "The model")" (line 32) and "(see devdocs/offline.md)" (line 186); none survives the proposed text. `docs/README.md:27`'s link to `devdocs/README.md` is navigation and stays (§9.2).
- **§9.3, installation, offline and updates without an owner: confirmed, and decided.** The facts are spread over `docs/README.md:12-14`, `docs/settings.md:184-190` and `devdocs/offline.md:5-75`; §12, questions 3 and 22 make `docs/app.md` the owner with one line in the index, and the §7.1 row "`app.md` or `getting-started.md`" resolves to `app.md`, getting started ending with a link to it ("Where to go next").

**New gaps**, each a user-facing fact of the surface that no page states:

1. **The footer's other words.** "no offline" in a browser without service workers, "worker failed" when the registration failed, "updating…" while the switch runs, and "update" alone before the waiting worker has named its build (`src/app-footer.ts:191-194, 209-220`); the build ID is a button only when there is a worker to check, and is disabled while a check, the registration or the switch is under way (`src/app-footer.ts:123-140, 163-166`).
2. **What the build ID is.** The footer shows "Build" and the first twelve characters of the commit the copy was built from, the full hash as the hover title, "-dirty" kept for a build from uncommitted changes (`src/build-id.ts:1-17`, `src/app-footer.ts:124`); the docs pages call it a "build number" and never say what it is.
3. **The copy button's feedback.** The two-sheets icon becomes a check mark for a moment once the text is on the clipboard, or a cross in the error colour when the clipboard refused it, and a live region says "Copied" or "Couldn't copy" for a screen reader (`src/copy-button.ts:5-15, 105-118, 142-145`).
4. **The empty state and the fields.** With the have field blank the output area shows a hint, "Type a quantity, such as `3 ft`, and the unit to convert it to, such as `in` or `ft;in`" (`src/unit-converter.ts:254-258`; harness: a blank have gives the `empty` outcome whatever the want). The fields switch off the browser's autocomplete, autocorrect, autocapitalization and spell-checking and are kept out of the form history, since units are neither words nor sentences (`src/unit-converter.ts:207-249`), and an error marks the field at fault (`aria-invalid` and the error border, lines 85-87, 178-179, 244), except a mismatch between have and want, which is about the pair and marks neither (harness: `1 m` into `s`).
5. **The loading and failure messages.** "Loading units…" until the definitions arrive; on a failure, "The unit definitions could not be loaded (…). Check your connection and try again." or "… This is a bug in the app, not in what you typed.", with a Retry button, and the retry is the user's, never automatic (`src/app-shell.ts:168-185, 255-272`). `devdocs/architecture.md:909-913` says only that the shell "says so".
6. **The sheet's link to the reference.** At the sheet's foot, beside "Reset all settings", "About these settings" opens the settings reference (`src/settings-panel.ts:520-525`; the target is an absolute URL into the repository, `src/settings-lines.ts:114-117`, which is the §9.4 row for `devdocs/settings.md#The controls` and D4's or V5's to settle).

**How the pages hold against the surface.**

- **`docs/README.md#(top)`, the intro's facts.** Every fact reproduces in the harness: `3 ft` into `in` gives `3 ft = 36 in` and `in ≈ 0.027777778 × 3 ft`, whose copy texts are `36 in` and `0.027777778 * 3 ft`; `1 m` into `ft;in` gives `1 m ≈ 3 ft + 3.3700787 in` on one line, with no reciprocal. The copy button copies the text it is given (`src/copy-button.ts:72, 108`), and the converter gives it `copyText(line)` (`src/unit-converter.ts:286`), so "text the app itself reads back" holds (A8 verified the round trip). "Installed to the home screen" rests on `public/manifest.webmanifest` (`display: standalone`, SVG icons) and the PNG `apple-touch-icon` for Safari (`index.html:13`, `vite-plugin-icons.ts:16-26`); "works without a network connection once it has been loaded once" on `src/sw.ts:63-65, 91-99` (every file of the build cached on install) and `123-129` (answered from the cache first). The framing is the one §12, question 2 replaces, and the index list the one §12, question 18 revises; both in the proposed page.
- **`README.md#(top)`.** The same intro; the `docs/` bullet names the three pages that exist; the `devdocs/` bullet is stale as tagged; the tooling sentence agrees with `package.json:8-12` (`dev`, `test`) and goes with the page's reduction.
- **`docs/settings.md#(top)`, the first paragraph.** Every mechanical claim holds against `src/settings-panel.ts`: the cog in the top right corner (`src/app-shell.ts:115-121, 190-196`), the sheet over the page with the result in view (56-60), the bottom sheet the handle drags taller and the side sheet (61-64), a change applied as made (94-98), Done, Escape or the cog (65-66; `src/app-shell.ts:211-221`), the keyboard's Done key (96-97), the − and + buttons on the three numbers (98-101), the three groups in that order (73-80), the "default …" link and "Reset all settings" (83-86). Two of its claims are D4's to verify: the range line's wording ("From 1 to 1,000 digits, up to the precision limit", `src/settings-lines.ts`) and the format version of the storage (`src/settings.ts`). The count "six settings" is the §9.4 row.
- **`docs/settings.md#(top)`, "Tapping the build number…".** Holds as far as it goes: the tap checks at once (`src/app-footer.ts:142-146`, `src/register-service-worker.ts:146-148`), the words are the code's (`CHECK_WORDS`, lines 153-157; "downloading…" and the "update to …" link, 206-218), and the check's word is shown only while the worker's status has nothing to say (172-176). It omits that the build is plain text also when the registration failed (163-166), and that the link that "switches to it" reloads every open page of the app (`src/service-worker-updates.ts:5-16, 187-195`).
- **`devdocs/architecture.md#UI`.** The four rules hold as far as the tree shows: the pure functions it names each have a test file under Node (`src/outcome.test.ts`, `messages.test.ts`, `settings-lines.test.ts`, `system-build.test.ts`, `settings.test.ts`); the one reactive controller is `src/subscription.ts`; `src/main.ts` imports the shell and the registration and nothing else.
- **`devdocs/architecture.md#The shell and its parts`.** The user-visible claims hold: the loading message and the failure instead of a converter (`src/app-shell.ts:255-272`; `src/system-build.ts:37-58` is the three-state `tableOf`), the rebuild only when the ceiling moves (`src/app-shell.ts:47-50, 255-257`), the settings read from `localStorage` and handed down as the context and the ratio notation (lines 149, 256, 276-277), the three events (204-206), the sheet as a non-modal `<dialog>`, bottom or side (`src/settings-panel.ts:57-63`), the cog in the header's corner that flips the state and takes focus back (`src/app-shell.ts:192-195, 211-221`; `src/settings-button.ts:13-15`), "Measure this device" and Apply as a change like any other (`src/settings-panel.ts:122-128, 863, 874`), the footer's status through the controller (`src/app-shell.ts:160, 199`; `src/subscription.ts:36-46`), the check on tapping the build (`src/app-footer.ts:142-146`), and the three button components with the words named (`src/app-shell.ts:271` Retry; `src/settings-panel.ts:493` Done and `874` Apply; `src/app-footer.ts:184-186, 209-218` reload and update; the header comments of the three files). One correction of terms: "build number" (line 936) is a build ID.
- **`devdocs/architecture.md#The converter and its lines`, what the user sees.** The labels are "You have" and "You want" (`src/unit-converter.ts:181-182`), the output area is a live region (183), the numbers are styled among the printer's pieces (308-312), the note follows the line in parentheses (277-280), the uncertified sign is `≈` with a dot the component draws and names for assistive technology (105-117, 296-305), a warning is styled apart from the notes with a `⚠` (128-135, 260-264), and the copy button copies the result as `copyText` writes it (286). A8's tags hold from this side: the component imports no parser and computes no reciprocal; its one computation is `outcomeOf` over the two strings (194-204), so "parses the `want` once more" and "stays in the component" describe `src/outcome.ts`, not `src/unit-converter.ts`. The mismatch error carries no side, so neither field is marked (178-179; harness).
- **`devdocs/offline.md#Offline behavior`.** The statuses hold word for word where the page names them: "caching…" (`installing`), "downloading…", "bypassed" with the reload link, nothing while ready, "update to …" naming the build, "worker …" with reload (`src/app-footer.ts:183-222`); the message that asks a worker for its build and the answer with the commit (`src/service-worker-updates.ts:31-36`, `src/sw.ts:71-78`); skip waiting, the old caches deleted and the pages claimed on activation (`src/sw.ts:67-69, 101-110`); the reload of every open page on a controller change, only when the page had a controller before (`src/service-worker-updates.ts:131-134, 187-195`); the checks when the page comes back into view, back online or on the periodic timer, never within the interval, and the tap that counts as the last check (`src/register-service-worker.ts:70-83`, `src/service-worker-updates.ts:276-303`); a failed check that does not hold off the next (286-291); the manifest's name, SVG icons and standalone display (`public/manifest.webmanifest`) and the PNG `apple-touch-icon` rendered from the SVG (`index.html:13`, `vite-plugin-icons.ts:16-26`). Two refinements are tagged above (the online check only while in view; the words the list omits). The precache manifest's `exclude` for the icons is `vite.config.ts`'s and was not read here (V8).
- **Stale code comments met in the modules.** `src/register-service-worker.ts:26` and `src/service-worker-updates.ts:255` say the user's check comes "from the settings"; it comes from the footer's build ID (`src/app-footer.ts:142-146`). A question for the owner below.

**The getting-started skeleton's facts** (§7), each as the harness gives it at the defaults, eight digits and half even, exact mode:

- Your first calculation, with the want blank: `2 kg * 3 m/s^2` gives `2 kg × 3 m / s^2 = 6 m kg / s^2` (the app writes `×` for `*`, spaces around `/`, and the primitives in the file's order); `exp(1) ≈ 2.7182818`; `sqrt(2) ≈ 1.4142136`; `2 + 2 = 4`; `1/3 ≈ 0.33333333` (exact, but shown with fewer digits than it has, so `≈`: N10's display policy).
- Reading `=`, `≈` and a note: `sqrt(2)^2 - 2 ≈ 0 (within … of zero)`, the note naming a bound set by the precision limit; `approx(1) ≈ 1` with no note.
- Your first conversion: `3 ft` into `in` gives the two lines above and their two copy texts.
- Lists of units: `1 m` into `ft;in` is `≈ 3 ft + 3.3700787 in`; `3661 s` into `time` is `= 1 hr + 1 min + 1 s`; `1 m` into `ft;in/8` is `≈ 3 ft + 26.96063 in / 8`; no second line for any.
- Functions and readings: `sin(30 deg) ≈ 0.5` (`≈`, through `pi()`); `tempC(20) = 293.15 K`; `300 K` into `tempF` is `300 K = tempF(80.33)`; `tempF(212)` into `tempC` is `= tempC(100)`; no second line.
- Making a value approximate: `approx(2.54) ≈ 2.54`; `approx(2.54) cm` into `in` is `≈ 1 in`, with the reciprocal `in ≈ 1 approx(2.54) cm`.
- Changing a setting: at twelve display digits `1 m ≈ 39.3700787402 in` with `in = 0.0254 × 1 m`; with the ratio notation `1 m = (5000/127) in`, `in = 127/5000 × 1 m` and `1/3 = 1/3`; in decimal mode `1/3 × 3 = 0.99999999`, `sin(pi() radian) = -4.6410207e-8` and `1 m = 39.370079 in`, every line `=`.
- When something is refused: a mismatch, `1 m` into `s`, says `"1 m" has dimension m, but "s" has dimension s.` and marks neither field; a kind mismatch, `sin(1)`, says `Cannot apply "sin" to "1": "1" is a plain number, but "sin" takes an angle; write "sin(1 radian)".`; a size refusal, `1e999999999 + 1`, names the bits the exact value would need, past the significand limit, and suggests `approx(1e999999999)` or decimal mode; an edge, `tan(90 deg)`, says `"90 deg" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.`, and `1/(sqrt(2)^2 - 2)` says the same of zero; an unknown name, `3 furlongs`, says `Unknown unit "furlongs".`
- The blank want: `1 in` gives `1 in = 0.0254 m`; a want of spaces counts as blank (`3 ft` gives `3 ft = 0.9144 m`). A want with a magnitude: `1 mi` into `1000 ft` is `1 mi = 5.28 × 1000 ft`, `1000 ft ≈ 0.18939394 × 1 mi`.
- Where to go next: `docs/app.md`.

**The decision on `app.md` (§12, question 3).** Decided before this unit, and the surface read here fills it: `docs/app.md` owns installing, offline use, updates and the build ID, the settings sheet's mechanics and copying a result, and takes the fields' app-specific behaviour (the switched-off assistants, the marking of the field at fault) while what to type stays with the foundation pages. The complete proposed page is below; `docs/README.md` carries one line for it (§12, question 22), `docs/settings.md#(top)` and getting started link to it, and `devdocs/architecture.md#The shell and its parts`, `#The converter and its lines` and `devdocs/offline.md#Offline behavior` open their user-facing passages with a link to it and keep the mechanism (§12, question 24). The §7.1 row for the app's surface resolves to `app.md`.

## Proposed edits

### `docs/README.md#(top)`

The complete page, to §7 and §12, question 18; the links resolve once the pages of §7 exist.

```markdown
# Exucal

Exucal is a calculator that keeps track of units and checks them: it
computes exactly wherever it can, certifies every digit it shows
otherwise, and converts a quantity into a unit, a list of units or a
reading such as a temperature. It is an offline-first progressive web
app (PWA): once loaded it works without a network connection and can be
installed to the home screen ([The app](app.md)).

These pages describe the app from the user's side:

- [Getting started](getting-started.md): a tour by example, from a first
  calculation to conversions, unit lists, readings, approximate values,
  a settings change and what a refusal looks like.
- [Numbers](numbers.md): exact and approximate values, the digits you
  can trust, comparison and edges, the two modes, `approx`, rounding,
  the size limits and how numbers are written.
- [Quantities](quantities.md): units, dimensions, kinds and conformance,
  and how a conversion, a unit list and a conversion into a function are
  answered.
- [The expression language](expressions.md): what the two fields accept:
  numbers, names, operators, calls, and the forms the want field takes.
- [The definition language](definitions.md): the definitions file's
  format and its six kinds of definition: primitives, prefixes, units,
  unit lists, functions and inverses.
- [The units the app knows](units.md): a guide to what the definitions
  file defines.
- [Settings](settings.md): every control, by what it sets.
- [Built-in functions](functions.md): the built-in functions, by family.
- [The app](app.md): installing, offline use, updates and the build ID,
  the settings sheet and copying a result.

The developer's documentation is in [`devdocs/`](../devdocs/README.md).
```

### `README.md#(top)`

The complete file: three sentences and two links (§12, question 18).

```markdown
# Exucal

Exucal is a calculator with unit awareness and kind checking, built as
an offline-first progressive web app. The user's documentation is in
[`docs/`](docs/README.md), starting with a tour by example. The
developer's documentation, including how to build, run and test the
app, is in [`devdocs/`](devdocs/README.md).
```

### `docs/settings.md#(top)`

Old: the first paragraph (lines 3-32), "The settings open from the cog in the top right corner, as a sheet over the page that leaves the result in view … the probe budget in milliseconds (`devdocs/settings.md`, "The model")."

New: "The settings open from the cog in the top right corner, as a sheet over the page that leaves the result in view, and every change applies as it is made, so the result shows what a setting does while it is changed; how the sheet works is in [The app](app.md). The settings are kept in the browser, under a format version, so that they survive a reload and a later build reads what an earlier one stored. They are described below as the sheet groups them, by what each is for: how a result is shown (the display digits and, in exact mode, the notation), how it is computed (the mode, with the working digits under it in decimal mode, and the rounding), and how much it may cost (the two limits and the probe). Every number carries its unit, on screen after the input, and each entry below names it."

Old: the paragraph "Tapping the build number in the footer asks at once whether a new version of the app has been deployed … which have no service worker to ask." (lines 184-190)

New: deleted; `docs/app.md`, "Updates and the build ID", states it.

### `docs/app.md`

A new page, complete; every statement is one the Findings verified.

```markdown
# The app

Exucal is a web page that behaves like an installed app: once loaded it
is kept on the device and works without a network connection. This page
covers what is specific to the web app: installing it, offline use,
updates and the build ID, the settings sheet, copying a result and the
two fields. What to type and how to read an answer are in
[Getting started](getting-started.md) and the pages it links to.

## Installing

Exucal is a progressive web app (PWA). A browser that installs web apps
offers to add it to the home screen or the desktop, where it opens in a
window of its own, without the browser's address bar; on iOS, Safari's
"Add to Home Screen" does the same. Nothing comes from a store, and the
installed app is the same page.

## Offline use

The first time the app is loaded, a service worker (the browser's
mechanism for keeping an offline copy) caches everything the app
consists of, and the footer says "caching…" while it does. From then on
the app is served from that copy: it loads at once and works without a
network connection, and a new version is fetched in the background when
there is one (below). "no offline" in the footer means the browser has
no service workers, so the app runs but is not kept for offline use.
Should the unit definitions fail to load, the page says so with a Retry
button; it never retries on its own.

## Updates and the build ID

The footer shows the build the page is running, after the word "Build":
the first twelve characters of the commit it was built from, with the
full commit shown on hover and "-dirty" after a build made from
uncommitted changes, so that a cached copy can be told from the one
last deployed.

The app checks for a new version on its own when it comes back into
view or back online, and now and then while it stays in view, but a
check is also a tap away: tapping the build ID checks at once. The
footer then says "checking…" and what the check found: "up to date",
"couldn't check (offline?)", or, when there is a new version,
"downloading…" while it is fetched and then an "update to …" link
naming the new build. A new version never interrupts: the running one
stays until the link is followed, and following it switches every open
page of the app to the new version, which is already cached, so the
switch costs no download. The footer says "updating…" while it
happens.

A few other words can stand beside the build ID: "worker failed" when
the service worker could not be set up; "bypassed", with a "reload"
link, when a hard reload loaded the page past the service worker; and
"worker …" with a "reload" link should the service worker serving the
page ever be of another build than the page itself. The build ID is
plain text, not a button, when there is nothing to check: in
development, in a browser without service workers, or when the service
worker failed to set up.

## The settings sheet

The settings open from the cog in the top right corner, as a sheet over
the page that leaves the result in view. On a phone the sheet slides up
over the lower part of the screen, and the handle at its top edge drags
or taps it between two heights, with the settings scrolling inside it;
on a wider screen it is a sheet along the right edge. Every change
applies as it is made, so the result shows what a setting does while it
is changed. A number typed on a phone is committed from the keyboard's
Done key, and the display digits, the working digits and the ratio
width have − and + buttons beside them. Done, Escape or the cog closes
the sheet. Beside the name of any setting that is not at its default, a
"default …" link names the default and restores it; "Reset all
settings" at the foot restores every default, and "About these
settings" beside it opens the settings reference. What each setting
does is in [Settings](settings.md).

## Copying a result

A button beside each answer copies it, units and all, as text the app
itself reads back: `36 in`, or `0.027777778 * 3 ft` for the reciprocal
line, so that an answer pasted into the have field is the quantity it
showed. The button shows a check mark for a moment once the text is on
the clipboard, or a cross when the browser refused the clipboard. The
text is written from the result itself, not read off the screen: the
screen's multiplication sign `×` is written `*`, which the fields
accept ([Numbers](numbers.md), "How numbers are written").

## The two fields

The fields are labelled "You have" and "You want"; these pages call
them the have and the want. While the have field is empty, the output
area says what to type. The fields do not autocorrect, autocapitalize
or suggest earlier entries, since units are neither words nor
sentences. An error names the text at fault and marks the field it is
in; a mismatch between the have and the want is about the pair and
marks neither.
```

### `devdocs/architecture.md#The shell and its parts`

Old: "Should the fetch fail, or the file fail to parse or build (which `units.test.ts` guards against), the shell says so instead of rendering a converter;"

New: "Should the fetch fail, or the file fail to parse or build (which `units.test.ts` guards against), the shell says so instead of rendering a converter, with a Retry button that asks again, since the user, who may know the network was down a moment ago, decides when, and the app never retries on its own ([docs/app.md](../docs/app.md), "Offline use");"

Old: "and checks for an update when its build number is tapped ([offline.md](offline.md))."

New: "and checks for an update when its build ID is tapped ([offline.md](offline.md); what the user sees of it is in [docs/app.md](../docs/app.md), "Updates and the build ID")."

### `devdocs/architecture.md#The converter and its lines`

Old: "`<unit-converter>` (`src/unit-converter.ts`) is two text inputs, "you have" and "you want", and an output area."

New: "`<unit-converter>` (`src/unit-converter.ts`) is two text inputs, "You have" and "You want" ([docs/app.md](../docs/app.md), "The two fields"), and an output area, which shows a hint while the have is blank."

Old: "A `<copy-button>` beside each line (`src/copy-button.ts`) copies the result as the printer writes it with `*`, which parses:"

New: "A `<copy-button>` beside each line (`src/copy-button.ts`; [docs/app.md](../docs/app.md), "Copying a result") copies the result as the printer writes it with `*`, which parses:"

(The section's other corrections are A8's, applied with its edits.)

### `devdocs/offline.md#Offline behavior`

The bullets "Update checks" and "The worker's status" replaced; the other four stay.

New "Update checks": "**Update checks.** The user's side is [docs/app.md](../docs/app.md), "Updates and the build ID". An installed app is usually resumed rather than navigated to, so the browser's own checks rarely run. The page asks for one whenever it comes back into view or, while in view, back online, and on a timer while it stays in view, but never within a short interval of the last check (`PERIODIC_CHECK` and `CHECK_INTERVAL` in `src/register-service-worker.ts`). Tapping the build ID in the footer checks at once, however recent the last check, and counts as the last check itself. A check fetches `sw.js` alone and installs nothing unless it changed; a failed one, for want of a network, does not hold off the next. What a check found shows up in the registration rather than in its result, as a worker installing and then waiting, so the footer reports it as the worker's status, and shows the check's own word ("checking…", then "up to date" or "couldn't check (offline?)") only while that status has nothing to say."

New "The worker's status": "**The worker's status.** The footer's words are the user's side ([docs/app.md](../docs/app.md), "Updates and the build ID"); here is where each comes from. `src/service-worker-updates.ts` reads the registration into a `WorkerStatus`, and `src/app-footer.ts` gives each a word or a link. Before or instead of a registration: `development` (a development build registers no worker; nothing shown), `unsupported` ("no offline"), `registering` (nothing shown) and `failed` ("worker failed"). From the registration: `installing` on the first visit ("caching…"), `bypassed` when a hard reload loaded the page past the worker ("bypassed" with a reload link), `ready` (nothing, unless the controlling worker names another build than the page's: "worker …" with a reload link), `downloading` ("downloading…"), `waiting` (the "update to …" link, "update" alone until the worker has named its build) and `applying` ("updating…"). The build ID is a button only when there is a worker to check, and is disabled while a check, the registration or the switch is under way. Each worker answers a message with the commit it was built from, so as soon as a new one is waiting (on load, or when it finishes installing) the link names its build. The link sends the waiting worker a message that makes it skip waiting; it takes over, deletes the old cache, and every open page of the app reloads onto the new version when its controller changes, so no page keeps running one build while a worker of another serves it. The new build is already cached by then, so the reload costs no download. Until the user follows the link, the running version stays. On the first visit there is no old version, so the first worker takes over without an offer or a reload."

## Terminology

| Term met | Where | Section 8 | Proposed |
| --- | --- | --- | --- |
| "build number" | `docs/settings.md#(top)` (lines 184, 189), `devdocs/architecture.md#The shell and its parts` (line 936), `devdocs/offline.md#Offline behavior` (line 44) | not covered | **build ID**, as `devdocs/offline.md#Build ID` and `src/build-id.ts` have it: a commit hash, shown shortened after "Build" in the footer, never a number |
| "the other way round" | `docs/README.md#(top)`, `README.md#(top)` | the reciprocal line, glossed "the conversion the other way round" | as §8; applied in the proposed pages |
| "converts units", "a unit converter", "the converter" for the app | `docs/README.md#(top)`, `README.md#(top)`, `devdocs/architecture.md#(top)` | Exucal; the calculator; the converter only for the two-field component | as §8; the two proposed intros lead with the calculator |
| "cog" vs "settings button" | `docs/settings.md#(top)`, `devdocs/architecture.md#The shell and its parts`, `src/settings-button.ts` | not covered | **the cog** in docs; `<settings-button>` the element's name, devdocs-only |
| "sheet" vs "panel" | `docs/settings.md#(top)` (both), `devdocs/architecture.md#The shell and its parts` (both), `src/settings-panel.ts` | "sheet" named in C56 | **the settings sheet** in both corpora; "panel" only as `<settings-panel>`, the element's name |
| "service worker" / "the worker" | `devdocs/offline.md`, `src/app-footer.ts` (the words "worker failed", "worker …") | not covered | docs: **service worker**, named once in `app.md` as the browser's mechanism for the offline copy, then "the service worker"; the footer's words quoted as written; devdocs keep "the worker" |
| "a new version" / "an update" / "a deploy" | `docs/settings.md#(top)`, `devdocs/offline.md`, `src/app-footer.ts` ("update to …") | not covered | docs: **a new version**; "update" only as the footer's word; "deploy" devdocs-only |
| "user-defined functions" for the functions the file defines | `docs/README.md#(top)` | the definitions file vs user definitions | "the functions the definitions file defines"; **user definitions** reserved for the intended user-written ones (§12, question 12) |
| "You have" / "You want"; "you have" / "you want" | the fields' labels; `devdocs/architecture.md#The converter and its lines` | have and want, introduced once | as §8; `app.md`'s "The two fields" names the labels and the terms once, and the devdocs quote the labels as written |
| "the app's own checks" | `docs/settings.md#(top)` | not covered | "the checks the app makes on its own" (the on-view, on-line and periodic checks), kept in `app.md` |
| "installed to the home screen" / "installation" | `docs/README.md#(top)`, `devdocs/offline.md` | not covered | **install**, **installed to the home screen**; "progressive web app (PWA)" expanded once per page |

## Questions for the owner

1. **The hint in the empty output area** frames conversion first ("Type a quantity, such as `3 ft`, and the unit to convert it to, such as `in` or `ft;in`", `src/unit-converter.ts:255-258`), where §12, question 2 has the calculator lead. A code change, outside the audit. Proposed: "Type an expression, such as `sqrt(2)` or `3 ft`, and, to convert it, the unit you want, such as `in` or `ft;in`."
2. **Two code comments say the user's check comes "from the settings"** (`src/register-service-worker.ts:26`, `src/service-worker-updates.ts:255`); it comes from the footer's build ID (`src/app-footer.ts:142-146`). Proposed: fixed in the change that applies the page edits, under the style guide's rule that a comment describes the current state.
3. **The failure message shows an internal kind name**, "The unit definitions could not be loaded (fetchFailed)." (`src/app-shell.ts:264`), where §12, question 6 keeps internal kind names out of the docs. Proposed: the app keeps it, since it is what a bug report needs, and `app.md` describes the message without quoting the parenthesis; the alternative, the kind on the console alone, is a code change.
4. **The root README's tooling sentence** (Lit, Vite, TypeScript, pnpm, the three commands) has no place in three sentences and two links (§12, question 18). Proposed: it goes, with V8 confirming that `devdocs/development.md` carries the commands; if the stack is to be named at the root, a fourth sentence rather than a list.
5. **The index's two sentences** say the app "computes exactly wherever it can, certifies every digit it shows otherwise", which puts "certifies" before a reader who has not met it. Proposed: keep it, since getting started's second section defines it and the word is the one §12, question 8 settles on; the alternative is "and says how many digits it is sure of".
6. **Quoting messages in getting started.** §12, question 6 generates the catalogue and hand-writes none in the interim, and the skeleton's "When something is refused" shows what a refusal looks like. Proposed: getting started quotes two or three messages as examples of the shapes (a mismatch, a size refusal, an edge), claiming no completeness, and links to the generated catalogue once it exists.
7. **`app.md` and the footer's words.** Proposed: `app.md` quotes every word the footer can show, verbatim, so that a user can search for the one they see, and names the service worker once; the mapping from status to word stays in `devdocs/offline.md`. Outside this unit, in one line: the sheet's "About these settings" link is an absolute URL into the repository (`src/settings-lines.ts:114-117`; the §9.4 row on #191, D4's or V5's), and once the pages ship with the app (§12, question 31) it becomes a local link.

## Notes on this run

The plan's scope held, with one adjustment: the six modules "list only, to name the surface" do not hold the shell, the worker or the sheet, which the three architecture and offline sections describe, so `src/app-shell.ts`, `src/sw.ts`, `src/build-id.ts`, `src/subscription.ts` and the header of `src/settings-panel.ts` had to be read to verify what the user sees, and the next unit that touches the surface (V2, V8) can take those as its list. What was hard was the Claims section: the unit is assigned none, so its verification is of facts rather than claims, and the harness was the instrument: build the table as `src/outcome.test.ts` does and call `outcomeOf`, with `mode: "decimal"` on the context for decimal mode and `{ width }` as the ratio for the ratio notation; every example of the pages and of §7's skeleton reproduced, so the skeleton's facts are recorded as the app gives them. The pages are sound and the gaps are of placement: the surface facts are spread over an index, a settings page and a devdocs page, and the one new page, `app.md`, collects them. V8 should know that `devdocs/offline.md`'s two update bullets are proposed here in full and that the code's comments on a check "from the settings" are stale; V2 that "build number" in the shell section is the only correction to it, and that the converter section's corrections are A8's.
