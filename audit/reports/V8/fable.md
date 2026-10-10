# Unit V8: `devdocs/README.md`, `devdocs/development.md`, `devdocs/offline.md`, `devdocs/deployment.md`, `devdocs/security.md` (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (the session reports it as both its configured and its serving model)
- Doc sections read: `devdocs/README.md`, `devdocs/development.md`, `devdocs/offline.md`, `devdocs/deployment.md`, `devdocs/security.md` (all sections); context: `docs/README.md` (whole), `docs/settings.md#(top)` (the "Tapping the build number…" paragraph, lines 184 to 190), `audit/plan/09-structural-observations.md` §9.4, `audit/plan/12-open-questions.md` (whole), `audit/plan/08-terminology.md` (whole), `audit/plan/05-concept-inventory.md` (C50, C51, C57, C60), `audit/plan/10-audit-units.md` (the V8 entry, the 10.c paragraph, and the D9 entry, since no D9 report exists yet)
- Modules read: `scripts/cloud-env`, `scripts/cloud-setup.sh`, `scripts/cloud-setup.test.ts`, `.claude/settings.json`, `.claude/hooks/session-start.sh`, `.claude/skills/audit-unit/SKILL.md`, `vite-plugin-build-id.ts`, `vite-plugin-build-id.test.ts`, `vite-plugin-icons.ts`, `vite-plugin-precache.ts`, `vite-plugin-precache.test.ts`, `src/sw.ts`, `src/register-service-worker.ts`, `src/service-worker-updates.ts`, `wrangler.jsonc`, `package.json`, `pnpm-workspace.yaml`
- Also read: `audit/plan/07-docs-outline.md` (the outline the README is revised to; the unit's entry names it only through its output); `vite.config.ts`, `index.html`, `public/manifest.webmanifest` and the listing of `public/`; `.env`, `.gitignore`, `.prettierrc.json`, `.prettierignore`; `README.md` (headings only); `src/build-id.ts`, `src/app-footer.ts` (the footer's words); `rasterize-svg.ts` (header and error sites); `tsconfig-coverage.test.ts` (the exec and path lines); `bench/stress/tooling.ts` (the git and Prettier calls) and the headers of `bench/stress/verify.ts`, `search.ts`, `rewrite.ts`; `bench/harness.ts` (`bestOf`); `src/units.test.ts` (the file-build and unit-list tests) and `src/units.txt` (the lists heading); `src/system-table.ts` (the definitions fetch); `pnpm-lock.yaml` (the wrangler, esbuild, workerd and `@pnpm/exe` entries); the `##` headings of every devdocs page; greps over `src/` for `innerHTML`, `unsafeHTML`, network calls and absolute URLs and over the tree for `exec`, `spawn`, `shell:` and `--frozen-lockfile`; `pnpm test` (1036 tests, all pass); the listing of `/opt/node24/bin` in this cloud session

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 46 |
| Claims corrected | 7 |
| Claims not verifiable here | 10 |
| Stale passages: update / keep as intent / drop | 6 / 0 / 0 |
| Gaps confirmed / refuted / new | 1 / 0 / 3 |
| Proposed edits | 14 |
| Questions for the owner | 8 |

## Claims

None assigned from section 1. The rows below are the pages' own statements, verified against the modules, numbered by page so that runs of this unit can be compared.

| Claim | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- |
| R1. `devdocs/README.md#The design`, `#The code`: every page listed exists, and every page under `devdocs/` is listed | confirmed | `devdocs/README.md:11-49`; the fifteen pages' headings, e.g. `devdocs/offline.md:3-105`, `devdocs/security.md:12-96` | Sixteen files under `devdocs/`: the README and the fifteen it lists. Each one-line description names that page's sections, with the one exception below. |
| R2. `devdocs/README.md#The code`: `security.md` covers "the supply chain, the toolchain, secrets, and the rules for code that runs commands" | corrected | `devdocs/security.md:96` | The page has a fourth section, "The page". Corrected: "the supply chain, the toolchain, secrets, the rules for code that runs commands, and the page". |
| D1. `devdocs/development.md#(top)`: every command goes through pnpm; `package.json` declares pnpm as the package manager | confirmed | `package.json:35-47` | `packageManager` is `pnpm@12.9.1`; `devEngines.packageManager` names pnpm 12.9.1 with `onFail: download`. |
| D2. `#(top)`: the other tools refuse to run under that declaration; `npx` stops with `EBADDEVENGINES` | not verifiable here | `package.json:35-47` | npm's behaviour, outside the tree; running `npx` is what the page forbids. |
| D3. `#(top)`: `pnpm-workspace.yaml` sets a minimum release age, a trust policy, no install scripts without an explicit decision, and no scripts against a stale `node_modules` | confirmed | `pnpm-workspace.yaml:7,11,20,23` | `minimumReleaseAge`, `trustPolicy`, `strictDepBuilds`, `verifyDepsBeforeRun`. |
| D4. `#Prerequisites`: Node.js 24 or newer; pnpm 12, pinned exactly; pnpm 10 or newer switches to the pinned version automatically | confirmed | `package.json:32-47` | `engines.node` is `>=24.0.0`, `devEngines.runtime` is `>=24` with `onFail: error`; the pnpm pin with `onFail: download`. Which pnpm releases honour `devEngines` is pnpm's behaviour, not verifiable here. |
| D5. `#Commands`: the fourteen commands and what each does | confirmed | `package.json:7-21`; `bench/stress/verify.ts:1-17`; `bench/stress/search.ts:1-14`; `bench/stress/rewrite.ts:1-7` | Every row matches a script. "Ten minutes a run" is the default of `--minutes` (`bench/stress/search.ts:14,194`), a parameter, not a measurement. |
| D6. `#Commands`: the lockfile is frozen for every install; `pnpm add`, `remove` and `update` are unaffected | confirmed | `pnpm-workspace.yaml:25-31` | |
| D7. `#Commands`: the cloud session hook is the one place `--frozen-lockfile` is written out, so that it reads as what it does | confirmed | `.claude/hooks/session-start.sh:18-21,57` | The only occurrence in the tree outside `node_modules`. The passage's wording ("still") is the §9.4 row, under Stale passages. |
| D8. `#Commands`: Prettier formats the Markdown too, with prose wrapping preserved | confirmed | `.prettierrc.json:1`; `.prettierignore:1-5` | The configuration is empty, so Prettier's default `proseWrap`, `preserve`, applies; only the lockfile is ignored beyond `.gitignore`. |
| D9. `#Commands`: `pnpm stress:search` writes the tables of `devdocs/cost.md` through Prettier | confirmed | `bench/stress/search.ts:9`; `bench/stress/tooling.ts:99-116` | `formatText` pipes the text through `node_modules/prettier/bin/prettier.cjs`. |
| D10. `#Commands`: the service worker is registered only in production builds, so `pnpm dev` caches nothing; `pnpm build` then `pnpm preview` exercises it | confirmed | `src/register-service-worker.ts:14-19,50-61`; `vite-plugin-precache.ts:27` | The registration is gated on `import.meta.env.PROD`; the precache plugin has `apply: "build"`. |
| D11. `#Cloud environment`: the base image has Node.js 22 on its `PATH` and no dependencies; the cloud runs the setup script once, as root, without a checkout, and snapshots the filesystem | not verifiable here | `scripts/cloud-setup.sh:14-24` | The platform's behaviour. The script's header states the same, and this session's `/opt` holds the `node20`, `node21` layout the comment describes. |
| D12. `#Cloud environment`: the setup script installs Node.js 24 and pnpm 12, pinned at its top and each verified against its publisher's checksum, under `/opt/node24`, "and nothing else" | corrected | `scripts/cloud-setup.sh:45,50,55-56,61,64,122-155,225-235` | It also writes `/etc/profile.d/zz-exucal-node.sh`, a `PATH` entry for login shells. Corrected: "…under `/opt/node24`, and a `profile.d` entry that puts it first on `PATH` for login shells; nothing per-session, since a snapshot cannot hold per-session state." |
| D13. `#Cloud environment`: `scripts/cloud-env` holds one `KEY=VALUE` per line after the comments, says what is absent and why, and sets one policy variable | confirmed | `scripts/cloud-env:11-34` | `DO_NOT_TRACK=1`. |
| D14. `#Cloud environment`: the hook is registered in `.claude/settings.json`, puts `/opt/node24/bin` first on the session's `PATH`, runs `pnpm install --frozen-lockfile`, does nothing outside the cloud, and fails naming the setup script when the toolchain is missing | confirmed | `.claude/settings.json:3-8`; `.claude/hooks/session-start.sh:31-33,44-52,57` | The `PATH` export goes into `CLAUDE_ENV_FILE`; the gate is `CLAUDE_CODE_REMOTE`. |
| D15. `#Cloud environment`: the setup script and the variables are pasted copies, not read from the repository; the pins' comments name the fields they mirror | confirmed | `scripts/cloud-setup.sh:5-12,41-56`; `scripts/cloud-env:3-9` | The claude.ai settings themselves, and the menu path the page gives, are outside the tree. |
| D16. `#Cloud environment`: `scripts/cloud-setup.test.ts` fails `pnpm test` when the pins drift from `package.json` or the lockfile's integrity strings, naming the pin to bump and asking to paste the script again | confirmed | `scripts/cloud-setup.test.ts:39-40,59-97` | Passes on the current tree. |
| D17. `#Cloud environment`: "A session that starts with the wrong toolchain, or with `npx` or `npm` on its path, is what this arrangement exists to prevent" | corrected | `scripts/cloud-setup.sh:118-120,185,242`; `/opt/node24/bin` in this session | The Node.js tarball ships `npm`, `npx` and `corepack`, the script installs it whole and logs npm's version, so both are on every session's path; the rule not to run them is the page's own. Corrected: "A session that starts without the project's toolchain, and so would run the base image's Node.js or reach for `npm`, is what this arrangement exists to prevent." |
| D18. `#Cloud environment`: "if one does, the hook's output at session start says which part is out of date" | corrected | `.claude/hooks/session-start.sh:44-47,53` | The hook names the setup script when `node` or `pnpm` is missing and prints the versions it found; it compares nothing with `package.json` (the test does). Corrected: "if one does, the hook's output at session start names the setup script when the toolchain is missing, and prints the versions it found." |
| D19. `#Adding a unit`: `src/units.test.ts` loads the file and fails with the offending definition if it does not build; unit lists have a section at the end of the file and the test checks the list of them; a built-in is a module under `src/core/builtins/` | confirmed | `src/units.test.ts:169-183,753-803`; `src/units.txt:585` (of 615 lines); the listing of `src/core/builtins/` | The failing assertion prints the build's error. |
| D20. `#Style guide`: `index.html` references source files as `./src/main.ts` and static assets as `/favicon.svg` | confirmed | `index.html:12-16` | |
| D21. `#Style guide`: `src/messages.ts` words the errors, `src/settings-lines.ts` the sheet, both tested under Node | confirmed | `src/messages.test.ts:1`; `src/settings-lines.test.ts:1` | Both tests run under `pnpm test`. |
| O1. `devdocs/offline.md#Offline behavior > Precaching`: on install the worker downloads every file of the build into a cache named after the version (the page, hashed scripts and styles, everything in `public/` except the icons); those files are answered from the cache; other same-origin requests go to the network; the page is cached under `/` and served for navigations regardless of the query string | confirmed | `src/sw.ts:48,63-65,80-99,123-129`; `vite-plugin-precache.ts:53-85`; `vite.config.ts:29-30` | The worker intercepts only same-origin `GET`s. |
| O2. `> The precache manifest`: `src/sw.ts` is a second entry point emitted unhashed as `dist/sw.js`; a `__PRECACHE__` constant lists every other file minus `exclude` with a version hashed from their contents; serialized with `JSON.stringify`, URLs validated against a conservative character set, the result parsed with Vite's parser and rejected unless a `const` of plain literals; `pnpm test` covers it | confirmed | `vite-plugin-precache.ts:9-17,31-41,70-87,133-166`; `vite-plugin-precache.test.ts:19-91` | |
| O3. `> Updates`: browsers check for a changed worker on every navigation, bypassing the HTTP cache; the new worker installs in the background and waits until every page of the old version has closed | not verifiable here | `src/sw.ts:14-21`; `src/register-service-worker.ts:61` | Browser lifecycle semantics. The worker's header states the same, and the registration uses the default `updateViaCache`. |
| O4. `> Update checks`: checks when the page comes back into view or online and every hour in view, never within five minutes of the last; tapping the build checks at once and counts as the last check; a check fetches `sw.js` alone and installs nothing unless it changed; a failed check does not hold off the next; what a check found shows in the registration; "up to date" and "couldn't check (offline?)" show only while the worker's status has nothing to say | confirmed | `src/register-service-worker.ts:29-33,70-83,146-148`; `src/service-worker-updates.ts:259-303`; `src/app-footer.ts:26-33,142-146,152-157,168-176` | "Fetches `sw.js` alone" is `registration.update()`'s semantics; the module's comment says the same. |
| O5. `> The worker's status`: "caching…" on the first visit, "downloading…" while an update downloads, "bypassed" with a reload link, nothing while ready; "update to …" while a worker waits; "worker …" with a reload link when the serving worker's build differs from the page's | corrected | `src/app-footer.ts:183-222` | Incomplete. The footer also says "no offline" (no service workers), "worker failed" (the registration failed), "updating…" (while the update is applied), and a bare "update" when the waiting worker has not named its build (`src/app-footer.ts:191-194,214-216,219-220`). Corrected: the words are listed once, in `docs/app.md`, and the page says they are `src/app-footer.ts`'s. |
| O6. `> The worker's status`: each worker answers a message with its build; the link sends the waiting worker a message that skips waiting; it takes over, deletes the old cache, and every open page reloads when its controller changes; on the first visit no reload | confirmed | `src/sw.ts:71-78,101-110`; `src/service-worker-updates.ts:146-208`; `src/register-service-worker.ts:66-68,104-118` | |
| O7. `> Installation`: the manifest gives the app its name, icons and standalone display mode; the icons are SVG | confirmed | `public/manifest.webmanifest:2-24` | |
| O8. `> Installation`: Chromium-based browsers accept SVG icons for installation; Safari ignores manifest icons and needs a PNG `apple-touch-icon` | not verifiable here | `vite.config.ts:10-14` | Platform behaviour; the configuration's comment states the same. |
| O9. `#Build ID`: the footer shows the first twelve digits of the commit hash, the full hash in the tooltip; the worker is built with the same constant and names its build when asked | confirmed | `src/build-id.ts:8-17`; `src/app-footer.ts:124`; `src/sw.ts:41-46,75-76`; `vite-plugin-build-id.ts:24-30` | |
| O10. `#Build ID`: `vite-plugin-build-id.ts` asks git once per `vite build` or `vite dev`; `HEAD` with `-dirty` when `git status` lists changes; `unknown` with a warning without git; nothing read from the environment | confirmed | `vite-plugin-build-id.ts:21-32,45-63,73-78`; `vite-plugin-build-id.test.ts:31-52` | |
| O11. `#Build ID`: every commit changes the build and so the precache version, so every deploy ships a worker update and shows its commit | confirmed | `vite-plugin-build-id.ts:14-19`; `vite-plugin-precache.ts:70-77` | The hash is in the bundled code, whose contents the version hashes. |
| O12. `#Icons`: the SVGs in `public/icons/` are the only sources; `icon.svg` and `icon-maskable.svg`; the manifest points at both; `apple-touch-icon.png` is linked from `index.html`, placed at the root, rendered at 180 pixels from the maskable variant; nothing rendered is committed | confirmed | the listing of `public/icons/`; `public/manifest.webmanifest:11-24`; `index.html:13`; `vite.config.ts:9-20`; `.gitignore:4-5` | |
| O13. `#Icons`: `vite-plugin-icons.ts` is configured in `vite.config.ts` with a list of PNGs (source, file name, size), adds each to the bundle on every `vite build`, and renders them on request during `pnpm dev` | confirmed | `vite-plugin-icons.ts:7-14,52-85`; `vite.config.ts:9-20` | |
| O14. `#Icons`: the icons are left out of the precache by `exclude`; the favicon stays | confirmed | `vite.config.ts:21-31`; `public/favicon.svg` (listing) | `apple-touch-icon.png` and everything under `icons/` are excluded; `favicon.svg` sits at the root of `public/`. |
| O15. `#Icons`: iOS copies the home-screen icon once and never fetches it again; Chromium re-reads the manifest when an installed app launches, at most once a day, and fetches icons from the network | not verifiable here | `devdocs/offline.md:139-153` | Platform behaviour; nothing in the tree bears on it. |
| O16. `#Icons`: `rasterize-svg.ts` is the project's own rasterizer; its header lists exactly what it accepts; anything outside the subset fails the build with a message naming the feature | confirmed | `rasterize-svg.ts:1-45,89` | The supported and rejected lists match the page's examples. |
| O17. `#Icons`: Cloudflare Workers Builds, which runs the deploy, has no browser to lean on | not verifiable here | `rasterize-svg.ts:7-9` | The deploy environment is outside the tree; the module's header states the same. |
| P1. `devdocs/deployment.md#(top)`: Workers Builds runs `pnpm run build` and `pnpm exec wrangler deploy` | not verifiable here | `package.json:9,30` | Dashboard configuration. Both commands resolve in the tree. |
| P2. `#(top)`: `wrangler.jsonc` holds the Worker name, the assets directory `dist`, the compatibility date, `workers_dev: false`, `preview_urls: true`, `send_metrics: false` | confirmed | `wrangler.jsonc:5,10,16,18-20,27,34` | |
| P3. `#(top)`: the compatibility date is kept as recent as the pinned wrangler supports | confirmed | `wrangler.jsonc:6-10`; `pnpm-lock.yaml:1722` | `2026-09-08` matches the bundled workerd `1.20260908.1`. |
| P4. `#(top)`: wrangler never removes a domain added in the dashboard; it applies both switches on every deploy; building a Preview does not change them | not verifiable here | `wrangler.jsonc:21-33` | wrangler's behaviour; the configuration's comments state the same. |
| P5. `#(top)`: `WRANGLER_SEND_METRICS=false` is in the committed `.env` | confirmed | `.env:1-10`; `git ls-files` lists `.env` | |
| P6. `#(top)`: wrangler sends its "autoconfig" events without reading the project config and loads `.env` before sending them; `DO_NOT_TRACK=1` overrides either setting | not verifiable here | `.env:6-9`; `package.json:30` | wrangler's internals. The pin is `4.130.0`, the version the page names; `.env`'s comment states the same. |
| P7. `#(top)`: wrangler is a pinned, exact `devDependency`, installed by the same `pnpm install` as the build | confirmed | `package.json:30`; `pnpm-lock.yaml:1713` | |
| P8. `#(top)`: `pnpm dlx wrangler` fails under `strictDepBuilds` because `esbuild` and `workerd` ship install scripts; both are denied under `allowBuilds` | not verifiable here | `pnpm-workspace.yaml:39-50`; `pnpm-lock.yaml:833-836,1057-1060,1718,1722` | The denial entries and the dependency relation are in the tree. That the two ship install scripts, and that a `dlx` install fails under the project's setting, are not: the lockfile records `hasBin` for both but no `requiresBuild`, and running `dlx` is what the page forbids. |
| S1. `devdocs/security.md#Dependencies`: one dependency, Lit; five development dependencies; tests on `node:test`; benchmarks time with `bestOf`; the project's own random source; icons rasterized without a library | confirmed | `package.json:12,22-31`; `bench/harness.ts:27`; `src/testing/random.ts:1`; `rasterize-svg.ts:1` | |
| S2. `#Dependencies`: `saveExact`; `frozenLockfile: true`; `verifyDepsBeforeRun: error` | confirmed | `pnpm-workspace.yaml:23,31,37` | |
| S3. `#Dependencies`: `minimumReleaseAge` refuses versions under 24 hours old; `trustPolicy: no-downgrade`; `blockExoticSubdeps`; `engineStrict` | confirmed | `pnpm-workspace.yaml:7,11,15,34` | 1440 minutes. |
| S4. `#Dependencies`: `strictDepBuilds`; `esbuild` and `workerd`, both through wrangler, are denied | confirmed | `pnpm-workspace.yaml:20,48-50`; `pnpm-lock.yaml:1718,1722` | |
| S5. `#Dependencies`: pnpm only; `packageManager` and `devEngines` declared | confirmed | `package.json:35-47` | As D1. |
| S6. `#Toolchain and secrets`: Node.js is checked against its publisher's checksums and pnpm against the lockfile's sha512; the test fails on drift; the hook installs from the frozen lockfile | confirmed | `scripts/cloud-setup.sh:122-155`; `scripts/cloud-setup.test.ts:84-97`; `.claude/hooks/session-start.sh:57` | |
| S7. `#Toolchain and secrets`: `.env` is committed and holds no secret; `.env.local` is ignored; `scripts/cloud-env` sets no token and says so | confirmed | `.env:1-10`; `.gitignore:7-8`; `scripts/cloud-env:25-27` | `*.local` is the ignore pattern. |
| S8. `#Toolchain and secrets`: nothing the project runs needs a secret, "a deploy being made from a developer's machine" | corrected | `devdocs/deployment.md:3-9`; `devdocs/offline.md:94-96,156-157`; `rasterize-svg.ts:7-9`; `scripts/cloud-env:25-27` | The deployment page, the offline page and the rasterizer's header say Cloudflare Workers Builds runs the build and the deploy from the repository. Corrected: "nothing the project builds, tests or runs needs one: the deploy is made by Cloudflare Workers Builds, with credentials Cloudflare holds, never from a cloud session." `scripts/cloud-env:26-27` carries the same sentence and points at a "README.md (Deployment)" section; `README.md` has only its title heading. |
| S9. `#Toolchain and secrets`: telemetry is off where a tool offers it: `DO_NOT_TRACK`, and `WRANGLER_SEND_METRICS=false` in `.env` | confirmed | `scripts/cloud-env:29-34`; `.env:10`; `wrangler.jsonc:16` | `DO_NOT_TRACK` is set only in the cloud environment's variables; a developer's machine relies on `.env` and `wrangler.jsonc`. |
| S10. `#Code that runs commands`: a command runs through `execFileSync` or `execFile` with its arguments as an array, never a command string; the rule binds "the tests and plugins that call git or tsc" and the shell scripts | corrected | `vite-plugin-build-id.ts:73-78`; `tsconfig-coverage.test.ts:55-57,76-78`; `bench/stress/tooling.ts:7,53-62,108-116` | Every call in the tree passes an array and none sets `shell`, but the stress tooling runs Prettier through `spawn` and calls git too. Corrected: "A command runs with its arguments as an array (`execFileSync`, `execFile` or `spawn`), never as a command string"; "the tests, plugins and stress tools that call git, tsc or Prettier". |
| S11. `#Code that runs commands`: lists of paths are NUL-separated (`-z`); paths compared against a per-line tool are first checked for control characters | confirmed | `tsconfig-coverage.test.ts:21-27,45-60,88-93`; `bench/stress/tooling.ts:57-62` | |
| S12. `#Code that runs commands`: shell scripts set `-u` and `-o pipefail`, and `-e` unless they handle every failure, as `scripts/cloud-setup.sh` does and says; every expansion quoted | confirmed | `scripts/cloud-setup.sh:34-35`; `.claude/hooks/session-start.sh:29` | |
| S13. `#The page`: the page is the app's bundle and the definitions file, both from its origin and precached; it calls no third-party service and sends nothing; its only third-party code is Lit | confirmed | `src/system-table.ts:27,55`; `src/sw.ts:85-89,128`; `package.json:22-24` | The definitions file is fetched by URL from the origin and is in the precache. A grep of `src/` for `fetch`, `XMLHttpRequest`, `sendBeacon` and `WebSocket` finds only that fetch and the worker's same-origin pass-through. The one absolute URL in `src/` is a link the settings sheet offers to the docs on GitHub (`src/settings-lines.ts:116`): a link a user may follow, not a call. |
| S14. `#The page`: nothing sets `innerHTML` or uses `unsafeHTML`; the components render through Lit's templates | confirmed | `src/app-footer.ts:106-120` (one of the templates) | A grep of `src/` for `innerHTML`, `unsafeHTML`, `unsafeSVG` and `unsafeStatic` finds nothing. |
| S15. `#The page`: the generated manifest is checked, not trusted | confirmed | `vite-plugin-precache.ts:133-166` | As O2. |

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/development.md#Commands` (plan row, confirmed) | "(The one place the flag is still written out is the cloud session hook, so that the hook reads as what it does.)" | update | "The cloud session hook writes the flag out so that it reads as what it does." |
| `devdocs/security.md#Toolchain and secrets` | "a deploy being made from a developer's machine" | update | "the deploy is made by Cloudflare Workers Builds, with credentials Cloudflare holds, never from a cloud session" |
| `devdocs/development.md#Cloud environment` | "under `/opt/node24`, and nothing else, since a snapshot cannot hold per-session state" | update | "under `/opt/node24`, and a `profile.d` entry that puts it first on `PATH` for login shells; nothing per-session, since a snapshot cannot hold per-session state" |
| `devdocs/development.md#Cloud environment` | "A session that starts with the wrong toolchain, or with `npx` or `npm` on its path, is what this arrangement exists to prevent; if one does, the hook's output at session start says which part is out of date." | update | "A session that starts without the project's toolchain, and so would run the base image's Node.js or reach for `npm`, is what this arrangement exists to prevent; if one does, the hook's output at session start names the setup script, and prints the versions it found." |
| `devdocs/offline.md#Build ID` | "There is no other versioning yet." | update | "The build ID is the app's only version." |
| `devdocs/deployment.md#(top)` | "Wrangler (as of 4.130.0) sends its "autoconfig" events without reading the project config, so `send_metrics` alone does not silence them, but the environment variable does, and wrangler loads `.env` before those events are sent." | update | "Wrangler sends its "autoconfig" events without reading the project config, so `send_metrics` alone does not silence them; the environment variable does, and wrangler loads `.env` before those events are sent. Both are worth rechecking when wrangler is updated." (The version stamp mirrors the pin in `package.json` and reads as history after the next bump.) |

## Findings

What becomes a link to `docs/`, and what stays, section by section.

- **`devdocs/README.md`.** Becomes the developer index of §7.1: the framing states the ownership split (docs/ states the rules, devdocs/ keeps the mechanism, the decision with its reason, and the ruled-out alternatives), links to `docs/README.md`, and links to the style guide for the principle (§12, question 29). The page list stays in two groups and gains the docs/ counterpart of each page where that page exists today (`docs/settings.md`, `docs/definitions.md`, `docs/functions.md`); the counterparts of `numbers.md`, `quantities.md`, `expressions.md`, `units.md` and `app.md` are added by the units that write those pages. The security line gains "and the page".
- **`devdocs/development.md`.** Stays whole, as the contributor's side: the pnpm rule and its table, Prerequisites, Commands, Cloud environment, Adding a unit and Style guide are mechanism, decisions and their reasons. "Adding a unit" opens with a link to `docs/definitions.md` (and to `docs/units.md` once it exists), per §7.1. The Style guide gains the documentation principle beside the rule on code comments (§12, question 29). Three corrections (D12, D17, D18) and the plan's row (D7) are applied.
- **`devdocs/offline.md#Offline behavior`.** Splits along §12 question 24. User-facing: that the app works offline once loaded, that a new version is downloaded in the background and offered, that the running version stays until the user switches, what the footer says and what tapping the build does. These move to `docs/app.md`, "Working offline" and "Updates and the build", and the section opens with one sentence and a link there. Mechanism, which stays: precaching, the manifest and its checks, the browser's update lifecycle, the check schedule and its reasons, the worker's status as the registration reports it, and the install manifest. The list of the footer's words is incomplete today (O5); it is completed once, in `docs/app.md`, and the section says the words are `src/app-footer.ts`'s.
- **`devdocs/offline.md#Build ID`.** The user-facing part (the footer names the build; twelve digits; the tooltip; `-dirty`) moves to `docs/app.md` with a link back; the derivation (`vite-plugin-build-id.ts`, git alone, `unknown`, why every commit is a new build) stays as mechanism and intent.
- **`devdocs/offline.md#Icons`.** Stays whole: mechanism (the sources, the plugin, the rasterizer) and intent, with two ruled-out alternatives already in the present tense (precaching the icons; a rendering library or a headless browser).
- **`devdocs/deployment.md`.** Stays whole: mechanism (the two commands, `wrangler.jsonc`, `.env`) and decisions with their reasons (the domain attached in the dashboard, `workers_dev`, `preview_urls`, the two telemetry opt-outs), with one ruled-out alternative (`pnpm dlx wrangler`). One version stamp goes (Stale passages).
- **`devdocs/security.md`.** Stays whole; every rule names where it is enforced, which is the mechanism. "The page" is the developer side of a user-facing fact that has no docs/ owner today: the app calls no service and sends nothing anywhere. `docs/app.md` states it in one sentence under "Working offline" with a link back to `#The page`. The deploy sentence (S8) and the rule's wording (S10) are corrected.
- **Markdown subset.** All five pages are within it: headings, paragraphs, lists, bold labels, inline code, tables and inline links; the external links (Lit, Vite, Prettier, pnpm, wrangler's telemetry page) are absolute references to external pages, which the subset allows. No reference-style link definition and no raw HTML.
- **Gaps.** Confirmed: `docs/app.md` does not exist, so installing, offline use, updates and the build have no docs/ owner (§7; §12, questions 3 and 22). New: the footer's rarer statuses ("no offline", "worker failed", "updating…", a bare "update") are documented nowhere; the privacy fact of `security.md#The page` has no user-side statement; `docs/settings.md:189-190` says the build is plain text in development or without service workers and omits the third case, a failed registration (`src/app-footer.ts:159-166`).
- **Code comments that contradict the pages** (no code is changed by this unit; recorded for the owner): `scripts/cloud-env:8-9` and `:26-27` point at "README.md" sections ("Cloud environment", "Deployment") that no longer exist, where `scripts/cloud-setup.sh:12` and `.claude/hooks/session-start.sh:4` already point at `devdocs/development.md`; `scripts/cloud-env:26-27` repeats the stale deploy sentence (S8); `src/register-service-worker.ts:26` and `src/service-worker-updates.ts:255` say the user's check is made "from the settings", where the control is the footer's build (`src/app-footer.ts:26-27,142-146`).

## Proposed edits

### `docs/README.md#(top)`

(D9's page; offered for it, one line in the index per §12, question 22.) Old → new for the last sentence of the first paragraph and the page list:

Old: "The app can be installed to the home screen and works without a network connection once it has been loaded once."

New: "The app can be installed to the home screen and works without a network connection once it has been loaded once ([The app](app.md))."

Add to the page list: "- [The app](app.md): installing it, working offline, updates and the build shown in the footer."

### `docs/app.md` (new page)

(D9's page per §7; this unit supplies the three sections its facts feed. The settings sheet's mechanics and copying results are other units' to write.)

```markdown
# The app

What is specific to the web app: installing it, working offline, and updates. What the two fields do and how to read an answer is in the other pages ([the index](README.md)).

## Installing

Exucal is a progressive web app: a page a browser can install to the home screen or the desktop, where it opens in a window of its own, under its own name and icon, without the browser's bars. How the browser offers it is the browser's: a button in the address bar, an entry in its menu, or Safari's share sheet on iOS. Nothing about the app changes when it is installed; the installed copy and the saved settings belong to the site the app was installed from.

## Working offline

The first time the app is loaded, the browser downloads the whole of it, the page, its scripts and styles and the unit definitions, and keeps the copy, through a service worker. From then on the app loads from the copy, at once and without a network, installed or not. Nothing you type leaves the device: the app calls no service and sends nothing anywhere; the mechanism and the rules behind this are in the developer documentation ([offline.md](../devdocs/offline.md), "Offline behavior", and [security.md](../devdocs/security.md), "The page").

## Updates and the build

After a new version is deployed, the app downloads it in the background on one of its checks and offers it: the footer shows an "update to …" link naming the new build. Nothing changes until you follow the link; then the app switches and every open page of it reloads onto the new version, without a download, since it is already on the device. The app checks for a new version on its own whenever it comes back into view or back online, and now and then while it stays open; the browser also checks whenever the page is navigated to.

Tapping the build in the footer checks at once. The footer then says "checking…", and afterwards what the check found: "up to date", or "downloading…" and then the "update to …" link, or "couldn't check (offline?)". The build is plain text, not a button, when there is nothing to check: in development, in a browser without service workers, or when the offline copy could not be set up.

The footer's words, beside the build:

- "Build …" names the build the app is running: the first twelve characters of the commit it was built from, the whole in a tooltip, with "-dirty" after it when it was built from uncommitted changes, so that a copy on a phone can be matched to a commit.
- "caching…": the first visit, while the copy is being made.
- "downloading…": a new version is being downloaded.
- "update to …", or "update" when the new version cannot name itself: a new version is ready, and the link switches to it.
- "updating…": the switch is under way, and the page is about to reload.
- "bypassed · reload": the page was loaded past its copy, as a hard reload does; the link reloads it through the copy.
- "worker … · reload": the copy serving the page is of another build than the page itself; the link reloads.
- "no offline": the browser has no service workers, so the app cannot be kept for offline use.
- "worker failed": the offline copy could not be set up; the app still works online.

Where the build comes from and how an update reaches the page is in the developer documentation ([offline.md](../devdocs/offline.md), "Build ID" and "Offline behavior").
```

### `docs/settings.md#(top)`

(D9's page; offered for it.) Delete the paragraph "Tapping the build number in the footer asks at once … which have no service worker to ask." (`docs/settings.md:184-190`): it is `docs/app.md`'s, "Updates and the build", above, which also names the third case in which the build is plain text, a failed registration.

### `devdocs/README.md#(top)`, `#The design`, `#The code`

Complete text of the page:

```markdown
# Developer documentation

The user's documentation is in [`docs/`](../docs/README.md): what the app does and the rules a user needs to predict it. These pages are the developer's side of the same concepts. For each, they keep the mechanism, the decision with its reason, and the alternatives ruled out with theirs, and nothing more: a rule a user needs is stated once, in `docs/`, and a section here opens with a sentence and a link to the section that owns it. They describe the code as it is and the intent behind it, never how it came to be; git holds the history, and the style guide in [development.md](development.md) states the principle and how it is applied.

## The design

- [architecture.md](architecture.md): the overview. The pipeline, quantities and dimensions, the definitions file and the build, the expression grammar and its parser, evaluation, conversion and unit lists, and the UI. The user's side of the expression language and of the definitions is [definitions.md](../docs/definitions.md).
- [numbers.md](numbers.md): the number type and the precision model. The types, the kernel's boundary, the exponent bound, certification and the display rule, the retry schedule, exact and decimal mode, the significand limit, `approx`, the failures. The user's side is the numerics foundation of `docs/`.
- [builtins.md](builtins.md): the built-in functions. The rules every built-in follows, the dimension rules, each function's domain, exact cases and edges, the elementary routines, the exact functions, the Gamma and Beta families. The user's side is [functions.md](../docs/functions.md).
- [functions.md](functions.md): user-defined functions in the definitions file. Annotations, conditions, calls, a function as the want, the build-time checks, what a call costs. The user's side is [definitions.md](../docs/definitions.md).
- [notation.md](notation.md): the ratio notation of exact mode.
- [settings.md](settings.md): the settings. The model, the storage format and its migrations, how a change is applied, the probe, the sheet and its controls. The user's side is [settings.md](../docs/settings.md).
- [future.md](future.md): the extensions that fit, the two that would reshape the number type, and what is ruled out.

## The code

- [layout.md](layout.md): what each file is, and where each module lives.
- [testing.md](testing.md): the suites, what a test may depend on, the numeric test patterns, the edge sweeps, the random source, type-checking, and how the UI is checked.
- [benchmarks.md](benchmarks.md): the benchmarks and the stress tools.
- [cost.md](cost.md): the catalogue of the costliest expressions, whose tables the stress search regenerates.
- [development.md](development.md): the toolchain, the commands, the cloud environment, adding a unit, and the style guide, which states the documentation principle.
- [offline.md](offline.md): the service worker and the precache, the build ID and the icons: the mechanism behind installing the app, working offline and updating it.
- [deployment.md](deployment.md): Cloudflare Workers and wrangler.
- [security.md](security.md): the supply chain, the toolchain, secrets, the rules for code that runs commands, and the page.
```

(The counterparts of `numbers.md`, `architecture.md`'s quantities and expressions, `development.md`'s "Adding a unit" and `offline.md` become links when `docs/numbers.md`, `docs/quantities.md`, `docs/expressions.md`, `docs/units.md` and `docs/app.md` land.)

### `devdocs/development.md#Commands`

Old: "There is no reason to pass `--frozen-lockfile` by hand, and no reason ever to pass `--no-frozen-lockfile`. (The one place the flag is still written out is the cloud session hook, so that the hook reads as what it does.)"

New: "There is no reason to pass `--frozen-lockfile` by hand, and no reason ever to pass `--no-frozen-lockfile`. The cloud session hook writes the flag out so that it reads as what it does."

### `devdocs/development.md#Cloud environment`

Three old → new pairs.

Old: "It installs Node.js 24 and pnpm 12 (the exact versions pinned at its top, each verified against the checksum its publisher provides) under `/opt/node24`, and nothing else, since a snapshot cannot hold per-session state."

New: "It installs Node.js 24 and pnpm 12 (the exact versions pinned at its top, each verified against the checksum its publisher provides) under `/opt/node24`, and a `profile.d` entry that puts it first on `PATH` for login shells; nothing per-session, since a snapshot cannot hold per-session state."

Old: "A session that starts with the wrong toolchain, or with `npx` or `npm` on its path, is what this arrangement exists to prevent; if one does, the hook's output at session start says which part is out of date."

New: "A session that starts without the project's toolchain, and so would run the base image's Node.js or reach for `npm`, is what this arrangement exists to prevent; if one does, the hook's output at session start names the setup script, and prints the versions it found."

Old (first sentence of the section): "Sessions of Claude Code on the web (claude.ai/code) run in a container that starts from a base image…"

New: "A cloud session (a session of Claude Code on the web, claude.ai/code) runs in a container that starts from a base image…"

### `devdocs/development.md#Adding a unit`

Old: "Append a line to `src/units.txt`, or edit one, and run `pnpm test`: …"

New: "The definitions file and how a definition is written are described for users in [definitions.md](../docs/definitions.md); this is the contributor's side. Append a line to `src/units.txt`, or edit one, and run `pnpm test`: …"

### `devdocs/development.md#Style guide`

Complete text of the section:

```markdown
## Style guide

- **The documentation describes the current state, and git holds the history.** A page states the current design and the intent behind it: the rationale, and the alternatives considered and ruled out, wherever knowing them would stop a future reader from re-proposing or re-litigating them. It records nothing of how the design evolved: no chronologies, no "previously X" notes, no superseded descriptions kept for posterity. A passage that describes a design no longer current is rewritten to the current one, and only the intent it carries is kept, as rationale or as a ruled-out alternative. The rule binds every contributor and every tool that writes into the pages; a `CLAUDE.md`, if one is ever added, points here rather than restating it.
- **A code comment that points at the documentation names the page and its section** (`devdocs/numbers.md ("Settling")`), never a plan, a task or a decision number: those are history, and the page is the current state.
- **A link between pages is a repo-relative path** (`../docs/numbers.md`), never an absolute URL and never a path that names the repository, so that the pages read the same in any clone or fork; an absolute URL is for an external reference only, such as an issue or a tool's own documentation. Pages are written in a small subset of Markdown that a homegrown renderer can carry: headings, paragraphs, bulleted and numbered lists, emphasis, inline code, fenced code blocks, tables and inline links; no raw HTML, no reference-style link definitions, no footnotes.
- **Reference source files with relative paths and static assets with root-absolute paths.** In `index.html`, anything Vite transforms (files under `src/`) is referenced as `./src/main.ts`, while files in `public/` are referenced as `/favicon.svg`. Vite accepts either form for source files, so this is a convention for readers rather than a requirement: a relative path makes it obvious that the file is part of the source tree and that Vite resolves and rewrites the reference at build time, whereas a root-absolute path signals a static asset that is served from the URL root and copied to the build output verbatim. The same applies inside modules: import other source files with relative paths such as `./app-shell.ts`.
- **No sentence is written in the core.** An error is a value with spans and dimensions, and `src/messages.ts` words it; the settings sheet's words are `src/settings-lines.ts`'s. Both are tested under Node.
```

(The third bullet installs the linking and Markdown principles of `audit/principles.md` beside the documentation principle; §12, question 29, names a home only for the first, so the owner decides whether it stays; see Questions.)

### `devdocs/offline.md#Offline behavior`

Old (the opening paragraph): "The app is cached in full the first time it is loaded and served from that cache from then on, so it works offline and loads instantly. Updates are downloaded automatically after a deploy and offered to the user, who decides when to switch. The pieces involved:"

New: "What a user sees of this, installing the app, working offline, and switching to a new version, is [the app](../docs/app.md), "Working offline" and "Updates and the build"; this section is the mechanism. The app is cached in full the first time it is loaded and served from that cache from then on. A new version installs in the background and waits, and the running version stays until the user switches, so that an update never interrupts them and never reloads a page under them. The pieces involved:"

Old (in "Update checks"): "Tapping the build number in the footer checks at once, however recent the last check, and counts as the last check itself."

New: "Tapping the build in the footer checks at once, however recent the last check, and counts as the last check itself."

Old (in "The worker's status"): "The footer shows the service worker's status beside the page's build (see Build ID below), as `src/service-worker-updates.ts` reads it from the registration, in a word or two: "caching…" on the first visit, "downloading…" while an update downloads, or "bypassed" with a reload link when a hard reload loaded the page past the worker, and nothing at all while the worker is ready."

New: "The footer shows the service worker's status beside the page's build (see Build ID below), as `src/service-worker-updates.ts` reads it from the registration (a `WorkerStatus`: installing, bypassed, ready, downloading, waiting or applying, or, before any registration, development, unsupported, registering or failed), in a word or two whose text is `src/app-footer.ts`'s and which [the app](../docs/app.md), "Updates and the build", lists; the footer says nothing at all while the worker is ready."

### `devdocs/offline.md#Build ID`

Old (the opening): "The footer of the app names the build it is running, as the first twelve digits of the commit hash it was built from (the full hash is in the tooltip), so a copy on a phone or served from the service worker's cache can be matched to a commit."

New: "The footer names the build the app is running ([the app](../docs/app.md), "Updates and the build"): the first twelve digits of the commit hash it was built from, the full hash in the tooltip, so that a copy on a phone or served from the service worker's cache can be matched to a commit."

Old: "There is no other versioning yet."

New: "The build ID is the app's only version."

### `devdocs/deployment.md#(top)`

Old: "`WRANGLER_SEND_METRICS=false` in `.env` is a belt-and-braces backstop. Wrangler (as of 4.130.0) sends its "autoconfig" events without reading the project config, so `send_metrics` alone does not silence them, but the environment variable does, and wrangler loads `.env` before those events are sent."

New: "`WRANGLER_SEND_METRICS=false` in `.env` is a belt-and-braces backstop. Wrangler sends its "autoconfig" events without reading the project config, so `send_metrics` alone does not silence them; the environment variable does, and wrangler loads `.env` before those events are sent. Both are worth rechecking when wrangler is updated."

### `devdocs/security.md#Toolchain and secrets`

Old: "`scripts/cloud-env` sets no token, and says so; and nothing the project builds, tests or runs needs one, a deploy being made from a developer's machine. Telemetry is off where a tool offers it (`DO_NOT_TRACK`, and `WRANGLER_SEND_METRICS=false` in `.env`)."

New: "`scripts/cloud-env` sets no token, and says so; and nothing the project builds, tests or runs needs one: the deploy is made by Cloudflare Workers Builds, with credentials Cloudflare holds, never from a cloud session ([deployment.md](deployment.md)). Telemetry is off where a tool offers it (`DO_NOT_TRACK` in the cloud environment's variables, `send_metrics` in `wrangler.jsonc`, and `WRANGLER_SEND_METRICS=false` in `.env`)."

### `devdocs/security.md#Code that runs commands`

Old: "The tests and plugins that call git or tsc, and the shell scripts in `scripts/` and `.claude/hooks/`, follow these rules, and new code does too:" and "**No shell between Node.js and a command.** A command runs through `execFileSync` or `execFile` with its arguments as an array, never a command string, so nothing in a path or an argument is read by a shell."

New: "The tests, plugins and stress tools that call git, tsc or Prettier, and the shell scripts in `scripts/` and `.claude/hooks/`, follow these rules, and new code does too:" and "**No shell between Node.js and a command.** A command runs with its arguments as an array (`execFileSync`, `execFile` or `spawn`), never as a command string and never with `shell` set, so nothing in a path or an argument is read by a shell."

### `devdocs/security.md#The page`

Old: "**Nothing loaded from elsewhere.** The page is the app's own bundle and the definitions file, both from its origin and served from the precache once installed ([offline.md](offline.md)); it calls no third-party service and sends nothing anywhere. Its only third-party code is Lit, bundled at build time."

New: "**Nothing loaded from elsewhere.** The page is the app's own bundle and the definitions file, both from its origin and served from the precache once installed ([offline.md](offline.md)); it calls no third-party service and sends nothing anywhere, which [the app](../docs/app.md), "Working offline", tells the user. Its only third-party code is Lit, bundled at build time. The one absolute URL in the page is a link the settings sheet offers to the user documentation, which a user may follow; nothing is fetched from it."

## Terminology

| Found | Where | Proposed canonical |
| --- | --- | --- |
| "build number" (docs) vs "build ID", "the build" (devdocs; `BUILD_ID`, `shortBuildId`) vs the footer's label "Build" | `docs/settings.md:184,189`; `devdocs/offline.md#Build ID`; `src/build-id.ts`; §5 C57 | **build ID** in both corpora, since the value is a hash and not a number; **the build** where the footer is quoted ("Build …"). This changes §5 C57's docs term; see Questions. |
| "service worker" / "the worker" (devdocs, code) vs "service workers" (docs) | `docs/settings.md:190`; `devdocs/offline.md` | devdocs: **service worker**, then **the worker**. docs: named once in `app.md` as the mechanism ("through a service worker"); otherwise **the app** or **its copy**. |
| "update" (the footer's link; devdocs) vs "a new version" (docs) | `docs/settings.md:184-188`; `devdocs/offline.md#Offline behavior` | docs: **a new version** for what is deployed and **update** for the footer's link and the act of switching; devdocs keep both as the code does. |
| "Sessions of Claude Code on the web (claude.ai/code)", "a Claude Code cloud session", "the cloud" | `devdocs/development.md#Prerequisites`, `#Cloud environment`; `scripts/cloud-setup.sh:3`; `.claude/hooks/session-start.sh:3` | **cloud session**, named in full once per page. |
| "the conformance tests" for `pnpm test:sweep` vs **conformance** (§8: quantities that can be added, converted, passed) | `devdocs/development.md#Commands` | "the edge sweeps" alone in the table; the sweeps' own name is V7's (`devdocs/testing.md#The edge sweeps`). |
| "Preview", "Previews" (Cloudflare's term) | `devdocs/deployment.md`, `wrangler.jsonc` | Keep, capitalized, as Cloudflare's product term. |
| "precache" as noun, verb, plugin and cache | `devdocs/offline.md`, `devdocs/security.md` | Keep; devdocs-only. docs say **the copy** the browser keeps. |

## Questions for the owner

1. **Who deploys.** `deployment.md` says Cloudflare Workers Builds runs the build and the deploy; `security.md` and `scripts/cloud-env` say a deploy is made from a developer's machine. Proposed answer: Workers Builds is the deploy, and the two sentences are rewritten as proposed (S8); if a developer's own `pnpm exec wrangler deploy` with their own login is also a supported path, `deployment.md` says so in one sentence and `security.md` says the credential is theirs.
2. **Stale code comments** (this unit changes no code): `scripts/cloud-env:8-9,26-27` point at "README.md" sections that no longer exist and repeat the deploy sentence; `src/register-service-worker.ts:26` and `src/service-worker-updates.ts:255` say the user's check is "from the settings" where it is the footer's build. Proposed answer: a code change recorded for the owner, redirecting the first two to `devdocs/development.md ("Cloud environment")` and `devdocs/deployment.md`, and the second two to "from the footer".
3. **"build number" or "build ID".** Proposed answer: "build ID" in both corpora, with the footer's label "Build" quoted where the footer is described; §5 C57's term changes with it.
4. **The privacy sentence in `docs/app.md`.** Should the user page state that the app calls no service and sends nothing, linking to `security.md#The page`? Proposed answer: yes, one sentence under "Working offline", as proposed.
5. **The style guide's third bullet.** §12, question 29, names a home for the documentation principle only; the linking and Markdown principles of `audit/principles.md` have none. Proposed answer: they live in the same bullet list, as proposed, since all three bind every contributor.
6. **"a few seconds"** in `devdocs/development.md#Commands` ("`pnpm test` is the run for every edit, a few seconds") is a timing (§12, question 25). Proposed answer: "`pnpm test` is the quick run for every edit".
7. **V5's territory, one line:** the settings sheet's link to `docs/settings.md` on GitHub (`src/settings-lines.ts:116`) is the page's only absolute URL; once the documents ship with the app (§12, question 31) it becomes a relative link, and `security.md#The page` can then drop the sentence about it.
8. **V7's territory, one line:** the command table's "the edge sweeps, the conformance tests" uses "conformance" against §8; proposed "the edge sweeps".

## Notes on this run

The D9 report the plan names as context does not exist yet, so the `docs/app.md` draft above is this unit's own reading of §7 and §12 (questions 3 and 22) and is offered to D9 rather than settled. The plan's module list is short of what the pages claim: the footer's words, the twelve-digit build and the tooltip live in `src/app-footer.ts` and `src/build-id.ts`; the icon list, the `exclude` option and the 180-pixel render in `vite.config.ts`; the manifest, `index.html`, `.env`, `.gitignore`, the Prettier configuration, the rasterizer's header and the exec rules in `tsconfig-coverage.test.ts` and `bench/stress/tooling.ts` all had to be read to verify a sentence, and a next run should list them. Ten claims are platform behaviour (browser lifecycle, iOS and Chromium icon refresh, wrangler's internals, the Workers Builds and claude.ai configurations) that nothing in the tree can confirm; they are marked as such rather than taken on trust. The one substantive finding is the contradiction on who deploys, repeated in a module comment; the rest are completeness (the footer's rarer statuses), two over-statements about the cloud hook, and the §9.4 row, which the hook's own comment confirms. `.claude/*` includes the audit skill itself, which was read as the unit's instructions; `scripts/*` includes a test, which was run. No page, plan file or code was changed, and no removed design note had to be consulted: every decision in these five pages states its reason.
