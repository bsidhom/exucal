# Unit V7: `devdocs/layout.md`, `devdocs/testing.md`, `devdocs/benchmarks.md` (fable)

- Plan revision: 70eb951
- Date: 2026-10-10
- Model: claude-fable-5-1 (as the session reports it)
- Doc sections read: `devdocs/layout.md#(top)`, `#The files`, `#The modules`; `devdocs/testing.md#(top)`, `#What a test may depend on`, `#The numeric test patterns`, `#The edge sweeps`, `#The random source`, `#Type-checking`, `#The UI`; `devdocs/benchmarks.md#(top)`, `#Running the benchmarks`, `#What each benchmark asserts`, `#How the benchmarks are built`, `#The stress tools`, `#The harness`, `#The search`, `#The stress suite`
- Modules read: the tree (`git ls-files`); `bench/harness.ts`, `bench/synthetic.ts`, `bench/names.bench.ts`, `bench/build.bench.ts`, `bench/kernel.bench.ts`, `bench/rational.bench.ts`; `bench/stress/harness.ts`, `bench/stress/catalogue.ts`, `bench/stress/search.ts`, `bench/stress/pool.ts`, `bench/stress/rewrite.ts`, `bench/stress/tooling.ts`, `bench/stress/verify.ts` (in full), `bench/stress/cases.ts` (header, the patterns, weights and seed); `bench/stress/cases.test.ts`, `catalogue.test.ts`, `harness.test.ts`, `pool.test.ts` (headers, test names, and the committed-catalogue test in full); `src/testing/random.ts`, `expr.ts`, `fraction.ts`, `scaled.ts`, `builtins.ts` (in full), `src/testing/edges.ts` (header, the runner, the table, the oracle and the Stirling bounds), `src/testing/random.test.ts` (the vectors test); `src/core/edges.sweep.ts` (header, the arguments, the operations by arity, the case generation, the div and mod rules); `src/edges.sweep.ts` (header, the known violations, the list cases); `src/limits.test.ts`, `tsconfig-coverage.test.ts` (in full); `scripts/cloud-setup.test.ts`, `src/settings.test.ts`, `src/messages.test.ts`, `src/units.test.ts`, `src/system-build.test.ts` (headers and the ceiling, storage and stand-in parts); `src/core/definitions.test.ts` (the drawn heads); `src/core/fixed-exp.test.ts` (one containment test); the reference-digit tests by search (`constants`, `fixed-log`, `fixed-exp`, `fixed`, `fixed-gamma`, `fixed-incomplete`, `fixed-trig`, `ball`, `scaled`, `builtins/pi`, `exp`, `roots`, `log`)
- Also read: `package.json`, `.gitignore`, `tsconfig.json`, `tsconfig.base.json`, `tsconfig.app.json`, `tsconfig.sw.json`, `tsconfig.node.json`, `pnpm-workspace.yaml`, `.env`, `wrangler.jsonc` (head), `.claude/settings.json`, `index.html`, `vite.config.ts` (the icons and precache entries), the headers of `vite-plugin-icons.ts`, `vite-plugin-build-id.ts`, `vite-plugin-precache.ts`, `rasterize-svg.ts`, `src/register-service-worker.ts` and `src/service-worker-updates.ts`; `src/main.ts`, `src/build-id.ts`; `src/limits.ts` (the generator); `src/core/rational.ts`, `src/core/scaled.ts`, `src/core/context.ts` (the bound and default constants), `src/core/rounding.ts` (`DEFAULT_PRECISION`), `src/core/display.ts` (the kinds), `src/core/builtins/incbeta.ts` (its one import of `fixed-incbeta.ts`); `public/favicon.svg`, `public/icons/icon.svg`; the exported names of every module in `layout.md#The modules`, by search; and runs of `pnpm test`, `pnpm bench` and `pnpm test:sweep`, all green

## Summary

| Measure | Count |
| --- | --- |
| Claims confirmed | 0 (none assigned) |
| Claims corrected | 0 (none assigned) |
| Claims not verifiable here | 0 (none assigned) |
| Page statements checked: confirmed / corrected / not verifiable here | 78 / 8 / 5 |
| Stale passages: update / keep as intent / drop | 6 / 4 / 1 |
| Gaps confirmed / refuted / new | 0 / 1 / 8 |
| Proposed edits | 12 |
| Questions for the owner | 9 |

## Claims

None assigned. The unit's entry in section 10 names no claim of section 1; the check it asks for, the "what a test may depend on" paragraph against the hard bounds of A5, is under "Findings", with every statement of the three pages that the code can confirm or refute.

## Stale passages

| Where | Passage | Tag | Rewrite |
| --- | --- | --- | --- |
| `devdocs/testing.md#(top)` | "three of them once failed unnoticed for a whole stage, two of them before reaching their assertions" | keep as intent (plan row confirmed) | "a benchmark left out of it fails unnoticed, often before reaching its assertion, when the table it builds or the expression it times is refused" (`bench/synthetic.ts:14-19` is the guard that came of it) |
| `devdocs/testing.md#Type-checking` | "(one did, until the projects were made to match by pattern)" | drop (plan row confirmed) | delete |
| `devdocs/testing.md#Type-checking` | "the kernel's modules once formed an initialization cycle through `fixed.ts`, `ball.ts` and `context.ts` that only such imports kept alive, so that a module's top level ran before its constants existed once a test imported `fixed-exp.ts` first" | keep as intent (plan row confirmed) | "so a cycle among the kernel's modules (`fixed.ts`, `ball.ts`, `context.ts`) that only such imports kept alive would run a module's top level before its constants exist, depending on which module a test imports first" |
| `devdocs/benchmarks.md#What each benchmark asserts` | "(it costs about the same; before the index it cost fifty times as much)" | keep as intent (plan row revised: the figure goes) | "(it costs about the same; without the index the check grows with the number of prefixes, many times over this range, which is what the benchmark guards)". The benchmark's own comment says "some thirtyfold" (`bench/names.bench.ts:24-26`); neither figure is measurable today, so the rewrite carries none |
| `devdocs/testing.md#The edge sweeps` | "The ball level runs about 36,000 cases in half a minute and the text level a few hundred in a few seconds." | update (found: a count the tool regenerates, and timings) | "The ball level runs tens of thousands of cases and the text level a few hundred, which is why the sweeps run before a commit rather than on every edit; the run reports how many cases it ran and how long they took." |
| `devdocs/testing.md#The edge sweeps` | "is [#114][114]; … is [#110][110]" with the definitions at the foot of the page | update (found: reference-style links, outside the Markdown subset) | inline links, saying only what is open: "is open ([#114](https://github.com/bsidhom/exucal/issues/114))", "is open ([#110](https://github.com/bsidhom/exucal/issues/110))"; the three definitions at the foot of the page are deleted |
| `devdocs/testing.md#Type-checking` | "is [#179][179]" | update (found: reference-style link) | "is open ([#179](https://github.com/bsidhom/exucal/issues/179))" |
| `devdocs/testing.md#What a test may depend on` | "asserts that a real probe answers within five seconds" | update (found: a timing, section 12 question 25) | "asserts that a real probe answers within a small fixed budget" |
| `devdocs/benchmarks.md#Running the benchmarks` | the example diagnostic line, with one run's timings | update (found: timings in the page; the line illustrates a format) | the same line with the figures elided ("parse … ms (… µs per definition), build … ms (… µs per definition)"), unless the owner prefers a real line as the illustration (question 6) |
| `devdocs/benchmarks.md#What each benchmark asserts` | "Lehmer's gcd is about forty times cheaper than Euclid's at the default significand limit" | keep as intent (found: a measured ratio in a rationale) | "Lehmer's gcd is many times cheaper than Euclid's at the default significand limit and still quadratic" |
| `devdocs/benchmarks.md#The stress suite` | "One function's cases take one to four minutes on four cores; a full run, every case and every hang, takes the better part of an hour" | update (found: timings) | "One function's cases take minutes; a full run, every case and every hang, takes far longer, since the catalogue is the costliest inputs known, and the suite says at the start how long the catalogue's own timings predict for the run" (`bench/stress/verify.ts:352-364`) |

## Findings

### The module table against the tree

Every path in `devdocs/layout.md#The modules` exists in the tree, and every description names identifiers the module exports (checked by listing the exports of all ninety-odd modules; for example `src/core/scaled.ts` exports `MAX_EXPONENT`, `ScaledError`, `Refusal` and `powerRefusal`, `src/testing/scaled.ts` exports exactly `dec`, `fr`, `exactDec`, `fraction`, `ball` and `digitsOf`, and `bench/stress/catalogue.ts` exports `FLOOR_MS`, `DEADLINE_MS` and `MARGIN`). Every file in the tree is in the table or in `#The files`, with these exceptions:

- `src/core/builtins/exact.test.ts` is in the table, the plan's example. The table already lists `src/core/edges.sweep.ts` and `src/edges.sweep.ts`, which are test entry points without a module of their own, so `exact.test.ts` is the third such file, not an anomaly; what is missing is a word in `#The files` saying so, since the `src/core/` bullet states the "a test beside each module" rule and names its three exceptions but not the one test that is beside no module (proposed edit below; question 4).
- `src/core/fixed-incbeta.ts` without a test: confirmed in the tree, and its only importer is `src/core/builtins/incbeta.ts:71`, so it is exercised through `builtins/incbeta.test.ts` and the sweep as both pages say. The page's "reached only through" reads as an import path; "exercised only through" is what is meant.
- `src/testing/random.test.ts`, a test inside the test-support directory, is mentioned nowhere; the table's convention for a module outside `src/core/` is to name its test on the line (proposed edit below).
- `bench/stress/cases.test.ts`, `catalogue.test.ts`, `harness.test.ts` and `pool.test.ts` are named only in `benchmarks.md#The stress tools`; the table's lines for those modules do not name them (proposed edit below).
- `public/favicon.svg` is a third SVG icon, drawn at its own size and linked from `index.html:12`, so "`public/icons/` … are the source of every icon the app has" is not quite so (statement L11 below; `devdocs/offline.md#Icons`, unit V8, should agree with whatever is written).
- `bench/harness.ts` also exports `millis`, the report's format; `src/testing/fraction.ts` also exports `inLowestTerms`. Neither is on its line; `millis` is worth a word since every benchmark uses it.
- `.claude/skills/audit-unit/SKILL.md` and `audit/` are in the tree and not in `#The files` (question 3). `.prettierrc.json`, `.prettierignore`, `LICENSE` and the root `README.md` are not listed either, which is fine.

### Page statements checked

| Where | Statement | Verdict | Evidence | Note or corrected statement |
| --- | --- | --- | --- | --- |
| L1 `layout.md#The files` | `index.html` links the manifest and sets the theme color | confirmed | `index.html:10,14` | |
| L2 `layout.md#The files` | `src/main.ts` registers the components and the service worker | confirmed | `src/main.ts:1-2` | it imports the shell and the registration module |
| L3 `layout.md#The files` | each core module but `span.ts`, `result.ts`, `fixed-incbeta.ts` has a `*.test.ts` beside it; `builtins/` holds one module per built-in or family | confirmed | the tree: 36 modules under `src/core/` and 18 under `src/core/builtins/`, each with its test but the three named | |
| L4 `layout.md#The files` | `fixed-incbeta.ts` is reached only through `builtins/incbeta.test.ts` and the sweep | confirmed | `src/core/builtins/incbeta.ts:71`, its only importer | "exercised only through" |
| L5 `layout.md#The files` | `src/units.test.ts` checks that the file builds and that a sample of its units converts as its sources say | confirmed | `src/units.test.ts:169,186,274,498,542,558` (test names) | |
| L6 `layout.md#The files` | the sweeps are run by `pnpm test:sweep` | confirmed | `package.json:12` | `node --test "src/**/*.sweep.ts"` |
| L7 `layout.md#The files` | `bench/*.bench.ts` by `pnpm bench`; the stress search, suite and rewrite by their scripts; the catalogue they write | confirmed | `package.json:14-17`; `bench/stress/catalogue.json` in the tree | |
| L8 `layout.md#The files` | `register-service-worker.ts` registers `sw.js` once the page has loaded, in production builds only, checks on its own and when asked, tells the shell the status | confirmed | `src/register-service-worker.ts:10-27,58` | |
| L9 `layout.md#The files` | `service-worker-updates.ts` is on interfaces, not the browser's globals, so its tests run under Node | confirmed | `src/service-worker-updates.ts:19-21` | |
| L10 `layout.md#The files` | `build-id.ts` exposes the commit the app was built from | confirmed | `src/build-id.ts:6` | |
| L11 `layout.md#The files` | `public/icons/` holds the icons the manifest points to; "They are the source of every icon the app has" | corrected | `public/favicon.svg` (its own drawing at 32 units), `index.html:12`; `vite.config.ts:15-20` renders the PNG from `icons/icon-maskable.svg` | "`public/icons/` holds the icons the manifest points to and the PNG some platforms need is rendered from; `public/favicon.svg`, which `index.html` links, is the browser tab's icon." |
| L12 `layout.md#The files` | `vite-plugin-icons.ts` renders the PNGs at build time and on request during development; `rasterize-svg.ts` has no dependencies | confirmed | `vite-plugin-icons.ts:66-67` (`configureServer`); `rasterize-svg.ts:1` (`node:zlib` only) | |
| L13 `layout.md#The files` | the build-id and precache plugins, `vite.config.ts` enabling them, their tests | confirmed | `vite-plugin-build-id.ts:4-14`; `vite-plugin-precache.ts:6-15`; `vite.config.ts:7-10`; the tests in the tree | |
| L14 `layout.md#The files` | `tsconfig.json` checks three programs with their libs; the node project matches by pattern and excludes only browser-only modules; `tsconfig.base.json` shares the options | confirmed | `tsconfig.json:1-12`; `tsconfig.app.json:7`; `tsconfig.sw.json:7`; `tsconfig.node.json:18-32`; `tsconfig.base.json` | |
| L15 `layout.md#The files` | components use `experimentalDecorators` as Vite's Lit template does, because Vite does not yet transform standard decorators | not verifiable here | `tsconfig.base.json:5-6` sets the flag (with `useDefineForClassFields: false`) | the reason is a statement about Vite at its pinned version (`package.json:35`, `vite` 8.2.2) and about its template; question 1 |
| L16 `layout.md#The files` | `pnpm-workspace.yaml` holds the supply-chain protections, described in its comments | confirmed | `pnpm-workspace.yaml:4-50` | |
| L17 `layout.md#The files` | `.env` is committed and must hold no secrets; `.env.local` is gitignored | confirmed | `.env:1-4`; `.gitignore:8` (`*.local`) | |
| L18 `layout.md#The files` | the two files under `scripts/` are pasted into the environment's settings; `scripts/cloud-setup.test.ts` fails when the pins drift | confirmed | `scripts/cloud-setup.test.ts:1-19` | |
| L19 `layout.md#The files` | `.claude/hooks/session-start.sh` with `.claude/settings.json` is the session hook | confirmed | `.claude/settings.json:1-14` | the tree also holds `.claude/skills/audit-unit/SKILL.md` and `audit/`, unlisted |
| L20 `layout.md#The modules` | every listed path exists and its description names what the module exports | confirmed | the tree; the exports listed by search (see above) | `bench/harness.ts` also exports `millis` |
| L21 `layout.md#The modules` | `display.ts`: the kinds exact, certified, partial, zero, unbounded, uncertified | confirmed | `src/core/display.ts:172-202` | |
| T1 `testing.md#(top)` | four suites, each by Node's test runner; `test:all` is `typecheck` then the three | confirmed | `package.json:11-15` | |
| T2 `testing.md#(top)` | the sweeps and benchmarks are left out of `pnpm test` by their suffixes, which its default discovery never matches | confirmed | `package.json:11` (`node --test` with no pattern); the run of `pnpm test` listed no sweep or benchmark | |
| T3 `testing.md#(top)` | `pnpm test` takes a few seconds | confirmed (qualitative) | the run | the coverage test's `tsc` runs are a visible part of it |
| T4 `testing.md#(top)` | the stress tools are run by hand, never by `pnpm test:all` | confirmed | `package.json:13`; `bench/stress/verify.ts:16-17` | |
| T5 `testing.md#(top)` | each core module but the three has a test beside it | confirmed | as L3 | |
| T6 `testing.md#What a test may depend on` | the limits are settings, and "only the shell reads them, through `contextOf`" | corrected | `src/app-shell.ts:256` reads the browser's settings; `bench/stress/harness.ts:448` and `bench/stress/harness.test.ts:25,43,64` call `contextOf` too, on a case's settings from the catalogue or a literal | "only the shell reads the browser's settings, through `contextOf`; the stress tools call `contextOf` too, on a catalogued case's settings, which the catalogue stores, never on the browser's" |
| T7 `testing.md#What a test may depend on` | every test, sweep and benchmark passes an explicit `NumberContext` from the defaults of `context.ts` or from literals | confirmed | 43 test, sweep and bench files import `DEFAULT_SIGNIFICAND_LIMIT_BITS` or `DEFAULT_CEILING`; `bench/kernel.bench.ts:171-178`; `src/core/edges.sweep.ts:185-186`; `bench/names.bench.ts` needs none | |
| T8 `testing.md#What a test may depend on` | the tests of `settings.ts` read a storage in memory | confirmed | `src/settings.test.ts:49-53` | |
| T9 `testing.md#What a test may depend on` | the probe's tests run over a fake clock, asserting of a real probe only that its proposal lies within the bounds | confirmed | `src/limits.test.ts:23-43,137-151` | |
| T10 `testing.md#What a test may depend on` | `MAX_SIGNIFICAND_LIMIT_BITS` and `MAX_EXPONENT` are constants | confirmed | `src/core/rational.ts:115` (`1 << 20`); `src/core/scaled.ts:165` (`10n ** 18n`) | the hard bounds of A5 |
| T11 `testing.md#What a test may depend on` | `rational.bench.ts` runs its largest quotients at twice the default significand limit | confirmed | `bench/rational.bench.ts:83` | twice `1 << 16` (`src/core/context.ts:170`), within the hard bound |
| T12 `testing.md#What a test may depend on` | one test of `limits.ts` asserts that a real probe answers within five seconds | confirmed | `src/limits.test.ts:140` | a timing on the page; stale table |
| T13 `testing.md#What a test may depend on` | the benchmarks assert ratios of timings taken in one run | confirmed | `bench/harness.ts:9-12`; `bench/names.bench.ts:29-32` | |
| T14 `testing.md#What a test may depend on` | the tests of the system table (`units.test.ts`, `messages.test.ts`, `build.bench.ts`) build it at the ceiling context | corrected | `src/units.test.ts:75` and `src/messages.test.ts:60,84,95,686` build at `ceilingContext`; `src/system-build.test.ts:30` builds through `buildSystemTable` at `ceilingFor`; `bench/build.bench.ts:32-37` builds synthetic tables, not the system one, at `DEFAULT_PRECISION` (`src/core/rounding.ts:45`); `bench/rational.bench.ts:86-89` builds a one-unit table at the ceiling | "The tests of the system table (`units.test.ts`, `messages.test.ts`, `system-build.test.ts`) build it at the ceiling context, as the app does, so that no unit holds a pass back; `build.bench.ts` builds synthetic tables at the default precision, since it measures the build and not the units." |
| T15 `testing.md#What a test may depend on` | the message tests build `units.txt` against stand-ins that carry the real names | confirmed | `src/messages.test.ts:571-603,676-686` | |
| T16 `testing.md#The numeric test patterns` | reference digits: the first hundred digits of `pi()`, `exp(1)`, `ln(2)`, `sqrt(2)` | confirmed | `src/core/constants.test.ts:44,199` (130 digits); `src/core/fixed-log.test.ts:174-185`; `src/core/fixed-exp.test.ts:148-152`; `src/core/fixed.test.ts:896` | |
| T17 `testing.md#The numeric test patterns` | "values from Python's `decimal` module, named in the test, to at least fifty digits" | corrected | mpmath is a second source (`src/core/fixed-gamma.test.ts:38,189`; `src/core/fixed-incomplete.test.ts:53`); the Gamma family's tables are forty digits (`src/core/fixed-gamma.test.ts:103,212`), with one argument to a thousand (`:56,208`) | "values from Python's `decimal` module and from mpmath, named in the test, to forty digits at least, and for the Gamma and the incomplete families at one argument each to a thousand" |
| T18 `testing.md#The numeric test patterns` | containment: the ball at `p` contains the midpoint at `4p`, over seeded arguments, at the value and both ends of the intervals | confirmed | `src/core/fixed-exp.test.ts:172-211` (20 against 80 digits); `src/core/fixed-log.test.ts:221`; `src/core/fixed-trig.test.ts:227,443` | |
| T19 `testing.md#The numeric test patterns` | exact cases `sqrt(9/4)`, `exp(0)`, `log(2, 8)`, and an input next to one is inexact | confirmed | `src/core/builtins/roots.test.ts:169-186`; `src/core/builtins/exp.test.ts:84`; `src/core/builtins/log.test.ts:553` | |
| T20 `testing.md#The numeric test patterns` | containment and property tests draw from the shared source; the tests of the ball and above go through `src/testing/scaled.ts` and `fraction.ts` | confirmed | `src/core/fixed-exp.test.ts:173-179`; `src/testing/scaled.ts:25-66`; `src/testing/fraction.ts:41-69` | `exactDec` is a sixth helper |
| T21 `testing.md#The edge sweeps` | the ball level runs every built-in by arity (`round` at each), the four exact operations, `powBall` with several exponents, `rootBall` of degrees two and three, and the settle | confirmed | `src/core/edges.sweep.ts:1142-1158,1185-1286` | |
| T22 `testing.md#The edge sweeps` | the argument classes, each exact and with a relative radius of about `1e-30`, and the wide balls | confirmed | `src/core/edges.sweep.ts:202-208,225-283` | |
| T23 `testing.md#The edge sweeps` | "a third-operand set and the cube of the second operands serve the three-argument functions" | corrected | `src/core/edges.sweep.ts:301-307,1594-1597`: the first two arguments are the second operands and the third comes from the third-operand set, since the full set cubed would be most of the sweep | "the three-argument functions take the second operands as their first two arguments and a small third-operand set as their third, since the full set cubed would be most of the sweep" |
| T24 `testing.md#The edge sweeps` | the binary operations take a subset as second argument; the mode-reading operations run in decimal mode too, judged by the mode's promise | confirmed | `src/core/edges.sweep.ts:286-299,1369,1448-1525` | |
| T25 `testing.md#The edge sweeps` | each function joins by the map with an oracle rule: domain predicate, exact reference (the div and mod identity, the closed forms of `incbetareg` at a parameter of one), magnitude bounds | confirmed | `src/core/edges.sweep.ts:505-543` (closed forms), `:636-690` (the exact quotient and remainder), `:780-789` | |
| T26 `testing.md#The edge sweeps` | the text level runs `parseExpr`, `evaluateText`, `convertText` (into `hr;min;s`, `time`, `ft;in` at both edges) on every issue's reproductions, in both modes, with `show` and `roundTerms` as `outcome.ts` calls them | confirmed | `src/edges.sweep.ts:1-17,227-232` | |
| T27 `testing.md#The edge sweeps` | the oracle's refusal rules, decided by exact bigint exponents near the bound | confirmed | `src/core/edges.sweep.ts:7-14`; `src/testing/edges.ts:31-52,589-600` | |
| T28 `testing.md#The edge sweeps` | the oracle on a value: the bound's two conditions, the known points, the range facts, the text-level size rule and the unit-list sum | confirmed | `src/testing/edges.ts:49-52,301-306`; `src/core/edges.sweep.ts:14-17`; `src/edges.sweep.ts:9-14` | |
| T29 `testing.md#The edge sweeps` | magnitudes bounded exactly for the arithmetic, in log space for `exp` and the powers, with Stirling at or above ten; `tenToAbove` within a relative `5.4e-10` | confirmed | `src/testing/edges.ts:38-48,403,435-482,704-713` | |
| T30 `testing.md#The edge sweeps` | the known violations keyed by issue and task; an unlisted violation fails, so does a listed one no case shows; `todo` not used | confirmed | `src/testing/edges.ts:25-29,115-117,249-275` | |
| T31 `testing.md#The edge sweeps` | a `Worker` under a deadline, since `node:test`'s `timeout` cannot interrupt; the deadline names the case; a known hang is skipped by name; time reported, not asserted | confirmed | `src/testing/edges.ts:13-23,103-105,174-197` | |
| T32 `testing.md#The edge sweeps` | about 36,000 ball-level cases in half a minute, a few hundred text-level in a few seconds | confirmed as to the counts' order | the sweep run reported 36,353 ball-level and 274 text-level cases | a count the tool regenerates and two timings; stale table |
| T33 `testing.md#The edge sweeps` | the open work is #114 and #110 | not verifiable here | the issue tracker was not read | the links are reference-style; stale table |
| T34 `testing.md#The random source` | a key is two 32-bit words; `split` and `foldIn`; the draws listed; threefry2x32, checked against the published vectors | confirmed | `src/testing/random.ts:12-25,47,66-104,123-190`; `src/testing/random.test.ts:21-22` | `key` and `words` are draws too |
| T35 `testing.md#The random source` | the stress search draws its cases the same way | confirmed | `bench/stress/cases.ts:6-10,685-688` | |
| T36 `testing.md#The random source` | the real probe's inputs come from a small congruential generator in `limits.ts` | confirmed | `src/limits.ts:66-68,285-290` | |
| T37 `testing.md#The random source` | `src/testing/expr.ts` draws trees for the printer's property test | confirmed | `src/testing/expr.ts:1-4`; `src/core/print.test.ts:6,136` | |
| T38 `testing.md#The random source` | the definitions parser's property test draws hundreds of lines, zero to three parameters, up to two conditions, each rejected piece injected | confirmed | `src/core/definitions.test.ts:738-744,789-792,809-811,843-844,864,918` | 400 drawn lines |
| T39 `testing.md#Type-checking` | three projects; TS6307 on an imported file outside the patterns; a file nothing imports is checked only if matched; Node strips types without checking | confirmed | `tsconfig-coverage.test.ts:1-11`; `tsconfig.base.json:20` (`erasableSyntaxOnly`) | |
| T40 `testing.md#Type-checking` | `tsconfig.node.json` matches every TypeScript file at the root and under `src/`, `bench/`, `scripts/`, excluding only the browser-only modules | confirmed | `tsconfig.node.json:18-32` | |
| T41 `testing.md#Type-checking` | `tsconfig-coverage.test.ts`: in `pnpm test`; asks `tsc` for the files; fails on a tracked or new `.ts` in no project and on other code extensions; reads git NUL-separated; refuses control characters | confirmed | `tsconfig-coverage.test.ts:40-46,54-86,88-128`; the `pnpm test` run included it | |
| T42 `testing.md#Type-checking` | every type-only import in `src` and `bench` is `import type`; `verbatimModuleSyntax` | confirmed | `tsconfig.base.json:12`; a scan of every `import {` in `src` and `bench` found none whose specifiers are all `type` (27 imports mix a value with `type` specifiers, e.g. `src/settings.ts:85`, `src/outcome.ts:82-88`) | |
| T43 `testing.md#Type-checking` | the remaining cycles and a check are #179 | not verifiable here | the issue tracker was not read | reference-style link; stale table |
| T44 `testing.md#The UI` | the pure functions beside the components are checked under Node | confirmed | the tree: `src/settings-lines.test.ts`, `outcome.test.ts`, `messages.test.ts`, `service-worker-updates.test.ts`, `subscription.test.ts`, `settings.test.ts` | |
| T45 `testing.md#The UI` | the Playwright checklist | not verifiable here | no Playwright configuration or script is in the tree; the page says the run is recorded in each change's description | a procedure, not a code claim; stays as stated |
| B1 `benchmarks.md#(top)` | the three guarded costs: the indexed ambiguity check, the memoizing walker, the series by binary or rectangular splitting | confirmed | `bench/names.bench.ts:24-26`; `bench/build.bench.ts:48-50`; `bench/kernel.bench.ts:41-46,63-67` | |
| B2 `benchmarks.md#Running the benchmarks` | `pnpm bench`, a few seconds, nothing beyond Node | confirmed (qualitative) | `package.json:14`; the run | |
| B3 `benchmarks.md#Running the benchmarks` | the example diagnostic line's format | confirmed | `bench/build.bench.ts:41-43` | the figures are one run's; stale table |
| B4 `benchmarks.md#Running the benchmarks` | a benchmark fails on scaling, not slowness; `test:all` runs them; a benchmark failing before its assertion guards nothing | confirmed | `bench/harness.ts:9-12`; `package.json:13`; `bench/synthetic.ts:14-19` | |
| B5 `benchmarks.md#What each benchmark asserts` | "The thresholds are twice the expected ratios" | corrected | `bench/names.bench.ts:29-30` asserts five where about one is expected; `bench/kernel.bench.ts:51-53` asserts fifty where about 38 is; the others are twice (`bench/build.bench.ts:53-59`, `bench/rational.bench.ts:44-46`, `bench/kernel.bench.ts:149-155`) | "The thresholds lie well above the expected ratios, about twice them in most cases, so that noise never fails a benchmark that a regression would not fail by a wide margin." |
| B6 `benchmarks.md#What each benchmark asserts` | `names.bench.ts`: 1076 against 76 prefixes at most five times; 12000 against 3000 units at most eight; the sort a little more than linear | confirmed | `bench/names.bench.ts:27-42` | |
| B7 `benchmarks.md#What each benchmark asserts` | "before the index it cost fifty times as much" | corrected | `bench/names.bench.ts:24-26`: "grew some thirtyfold over this range" | no figure (stale table; question 2) |
| B8 `benchmarks.md#What each benchmark asserts` | `build.bench.ts`: 6000 against 1500 at most eight times, parse and build; 2000 functions against 500 the same; the GNU-size file reported only | confirmed | `bench/build.bench.ts:47-67,98-107` | |
| B9 `benchmarks.md#What each benchmark asserts` | `kernel.bench.ts`: `pi` at three sizes, the upper decade at most fifty; every routine at the ceiling against a quarter, at most 64; the report the probe's composite was chosen from; `exp`'s series the remaining candidate for rectangular splitting | confirmed | `bench/kernel.bench.ts:40-55,57-70,149-168` | the bullet omits two of the file's four tests (new gap 1) |
| B11 `benchmarks.md#What each benchmark asserts` | `rational.bench.ts`: the range operation at 8,192 to 65,536 bits, one gcd at 16,384 to 65,536, two quotients at twice the default limit; doubling at most eight times | confirmed, with a precision | `bench/rational.bench.ts:37-47,52-66,69-98` | the quotients are reported, not asserted |
| B12 `benchmarks.md#What each benchmark asserts` | Lehmer's gcd about forty times cheaper than Euclid's, still quadratic; the benchmark would show a half-gcd's gain | confirmed as the code's own figure | `bench/rational.bench.ts:18-25` | a measured ratio; stale table |
| B13 `benchmarks.md#How the benchmarks are built` | no benchmark library; the suffix; `tsconfig.node.json` includes `bench/` | confirmed | `package.json:14`; `tsconfig.node.json:18` | |
| B14 `benchmarks.md#How the benchmarks are built` | `bench/harness.ts`: `word` draws a name; `bestOf` times several runs after one untimed and takes the shortest | confirmed | `bench/harness.ts:14-36` | |
| B15 `benchmarks.md#How the benchmarks are built` | `synthetic.ts`: the letters, the short names, the renaming, two primitives, each unit over one earlier unit, each function calling one earlier with an inverse and every other with a result annotation | confirmed | `bench/synthetic.ts:3-29,35-36,87-105,114-123` | |
| B16 `benchmarks.md#The stress tools` | run by hand; the four tests ordinary under `pnpm test`; `--help` | confirmed | `bench/stress/verify.ts:16-17,310-315`; `bench/stress/search.ts:179`; the `pnpm test` run ran the four | |
| B17 `benchmarks.md#The harness` | `outcomeOf` in wall time; a worker per case; the table at the case's ceiling, untimed; cold and warm through `PassObserver`; the deadline from the table; the record of a hang; `estimateMs`; `typeOut` | confirmed | `bench/stress/harness.ts:1-30,253-283,301-379,390-430,446-518` | |
| B18 `benchmarks.md#The search` | `cases.ts` a pure function of a seed, the `i`-th from `foldIn(seed, i)`; fixed weights over the four patterns, the functions and classes, a composed call, the profile and the want; `--seed`; a fresh seed from the cryptographic source; `--list`; no timing decides | confirmed | `bench/stress/cases.ts:1-39,119-131,187-248,411-528,685-688`; `bench/stress/search.ts:20-24` | |
| B19 `benchmarks.md#The search` | `--minutes` (ten by default), `--forever`; lanes one per core; a hit at the floor or a hang; written at once by `withHit` under `MARGIN`; ranked by cost per call and by estimate; typed out; `FLOOR_MS` and `DEADLINE_MS` constants | confirmed | `bench/stress/search.ts:183-197,255-303`; `bench/stress/catalogue.ts:215-233,256-292`; `bench/stress/pool.ts:1-5` | `--jobs` sets the lanes (new gap 4) |
| B20 `benchmarks.md#The search` | every change through `update` under the lock, ignored by git, taken over from a process that is gone; Prettier on stdin; each file renamed over; the stop; runs safe to repeat; a repeated case kept only at least ten percent higher | confirmed | `bench/stress/tooling.ts:47-48,98-134,136-180,182-212`; `.gitignore:21-22`; `bench/stress/search.ts:226-237`; `bench/stress/catalogue.ts:233,263` | a lock held past a fixed time is taken over too (`tooling.ts:137,169-173`; new gap 3) |
| B21 `benchmarks.md#The search` | "The command never touches git." | corrected | `bench/stress/search.ts:199` calls `currentCommit`, which runs `git rev-parse` and `git status` (`bench/stress/tooling.ts:51-63`) | "The command reads the current commit from git, to record it with each run and hit, and changes nothing there: committing is the person's." |
| B22 `benchmarks.md#The search` | settings stored in the envelope with the format version, read through `settingsFromStored`; one test reads the committed catalogue and checks the cases and their stored shape; `stress:rewrite` | confirmed | `bench/stress/catalogue.ts:19-28,421-444`; `bench/stress/catalogue.test.ts:309-341`; `bench/stress/rewrite.ts:1-14` | |
| B23 `benchmarks.md#The stress suite` | the cases of the functions named, cheapest first then the hangs; `--profile`, `--skip-hangs`, `--sample` by a fixed hash with no hang | confirmed | `bench/stress/verify.ts:1-33,329-345`; `bench/stress/catalogue.ts:104-122` | |
| B24 `benchmarks.md#The stress suite` | one function's cases take one to four minutes on four cores; a full run the better part of an hour | not verifiable here | no stress run was made; the suite prints what the catalogue's timings predict (`bench/stress/verify.ts:352-364`) | timings; stale table |
| B25 `benchmarks.md#The stress suite` | the deadline four times the catalogued time and two minutes at least; fails only on the outcome's kind, a failed worker, the deadline; the line reported as information; the report's contents, with `exp(1) - exp(1)` the reference | confirmed | `bench/stress/verify.ts:35-55,92-96,117-125,128-204` | |
| B26 `benchmarks.md#The stress suite` | `--record`: `withEntryAgain` without margin, `withHangAgain`, a hang that finishes becomes its family's entry; cheap entries kept; the line recorded is the run's | confirmed | `bench/stress/verify.ts:26-33,206-280`; `bench/stress/catalogue.ts:335-377` | |

### The "what a test may depend on" claims against the hard bounds (A5)

The paragraph holds against the constants it names, with the two corrections above (T6, T14). `MAX_SIGNIFICAND_LIMIT_BITS` is `1 << 20` (`src/core/rational.ts:115`) and `MAX_EXPONENT` is `10^18` (`src/core/scaled.ts:165`), both constants; the defaults the tests build from are `DEFAULT_SIGNIFICAND_LIMIT_BITS`, `1 << 16` (`src/core/context.ts:170`), and `DEFAULT_CEILING` (`src/core/context.ts:193`). `rational.bench.ts`'s doubled limit (`bench/rational.bench.ts:83`) is `2^17`, well within the hard bound; the probe's real-run test holds its proposal within `MIN_SIGNIFICAND_LIMIT_BITS` and `MAX_SIGNIFICAND_LIMIT_BITS` and the precision limit within what the proposed significand limit allows (`src/limits.test.ts:141-149`); the sweeps and their support reason on `MAX_EXPONENT` and `MAX_SIGNIFICAND_LIMIT_BITS` directly (`src/core/edges.sweep.ts:62,69`; `src/testing/edges.ts:72`); and the test support converts a literal to a fraction at the hard bound, not at a setting (`src/testing/fraction.ts:44`; `src/testing/scaled.ts:43,54`). One note for the plan, not the pages: `MIN_SIGNIFICAND_LIMIT_BITS` is defined in `src/core/context.ts:269`, not in `rational.ts` as section 11 lists it (question 7).

### Which sections become links to docs/, and which stay

None of the three pages carries user semantics, so no section becomes a link to docs/; all stay as mechanism, with the intent and the ruled-out alternatives below kept as they are written (in the present tense already, apart from the stale rows above). The one link into docs/ is `layout.md#The files`' pointer for `src/units.txt` to `docs/definitions.md`, one sentence and a link; it stays for the format, and once `docs/units.md` exists (unit D3, section 7) the contents point there. Section 9.2's listing of `devdocs/layout.md#The files` among the devdocs passages that point at docs "and then re-explain the user semantics" is refuted: the bullet explains nothing beyond naming the file.

- `layout.md`: mechanism throughout. Intent kept: why three type-checking programs (the `lib` conflict), why the node project matches by pattern (a new file is checked without being listed), why `.env` is committed and what may not go in it, why the icons are rendered without a dependency (in `rasterize-svg.ts`'s header, which the page points at).
- `testing.md`: mechanism throughout. Intent kept: why the benchmarks are in `pnpm test:all`; why a test builds its context from the constants; why the cases run in a `Worker`; why a case's time is reported and not asserted; why the known violations are a table that fails both ways; why every type-only import is `import type`; why the probe has a generator of its own. Ruled-out alternatives kept: a second test runner (the suffixes separate the suites), Node's `todo`, `node:test`'s `timeout`, a per-case time budget, `import { type X }`.
- `benchmarks.md`: mechanism throughout. Intent kept: why a benchmark asserts a ratio and reports the timing; why the thresholds are loose; why the floor and the deadline are constants; why a hit is written at once under a lock and through a rename; why a case's settings are stored in the app's envelope; why entries that become cheap are kept; why the suite never compares the line's text. Ruled-out alternatives kept: a benchmark library, a timing threshold, options for the floor and the deadline, Prettier's `--write`, comparing an outcome's digits in the stress suite.

### Gaps

Section 6 lists nothing for these pages: 0 confirmed, 0 refuted. The one refutation above is section 9.2's row on `layout.md`. New gaps, each small:

1. `benchmarks.md#What each benchmark asserts` omits two of `kernel.bench.ts`'s four tests: `exp` of a large argument at the ceiling against `exp` of one, with the digits in log space timed beside it (`bench/kernel.bench.ts:124-147`), and the decimal grid's own costs, the settle, the product of settled balls and the kernel's exit, at the ceiling against a quarter (`:207-257`).
2. `src/testing/random.test.ts` is mentioned nowhere (`testing.md#The random source` says the vectors are checked, without naming the test).
3. The lock is also taken over when held past a fixed time, not only from a process that is gone (`bench/stress/tooling.ts:137,169-173`).
4. `--jobs`, which sets the lanes of both stress commands (`bench/stress/search.ts:4-5,195-197`; `bench/stress/verify.ts:3-4,322-323`), is not on the page; "one per core" is its default.
5. `public/favicon.svg` is not in `layout.md#The files` (statement L11).
6. `.claude/skills/audit-unit/SKILL.md` and `audit/` are not in `layout.md#The files` (question 3).
7. `builtins/exact.test.ts`, the one test beside no module, is unstated in the "a test beside each module" rule of `layout.md#The files` and `testing.md#(top)`.
8. mpmath as a source of reference digits (statement T17).

## Proposed edits

### devdocs/layout.md#The files

The `src/core/` bullet, old:

"`src/core/` is the pure conversion core: no I/O, no DOM, and failures returned as `Result` values. Each module but `span.ts`, `result.ts` and `fixed-incbeta.ts` (reached only through `builtins/incbeta.test.ts` and the sweep) has a `*.test.ts` beside it, and `src/core/builtins/` holds one module per built-in function or family."

New:

"`src/core/` is the pure conversion core: no I/O, no DOM, and failures returned as `Result` values. Each module but `span.ts`, `result.ts` and `fixed-incbeta.ts` (exercised only through `builtins/incbeta.test.ts` and the sweep) has a `*.test.ts` beside it; `src/core/builtins/` holds one module per built-in function or family, and `builtins/exact.test.ts`, which is beside no one module, runs the exact functions through the pipeline ([testing.md](testing.md))."

The manifest bullet, old:

"`public/manifest.webmanifest` is the web app manifest that makes the app installable, and `public/icons/` holds the icons it points to. They are the source of every icon the app has ([offline.md](offline.md), "Icons")."

New:

"`public/manifest.webmanifest` is the web app manifest that makes the app installable, and `public/icons/` holds the icons it points to, from which the PNG some platforms need is rendered; `public/favicon.svg`, which `index.html` links, is the browser tab's icon ([offline.md](offline.md), "Icons")."

### devdocs/layout.md#The modules

Four lines of the table, old → new:

- `src/testing/random.ts       the seeded random source the tests and benchmarks share: keys, split and folded in, every draw a pure function of one` → `src/testing/random.ts       the seeded random source the tests and benchmarks share: keys, split and folded in, every draw a pure function of one; src/testing/random.test.ts checks it against the published vectors`
- `bench/harness.ts          bestOf and word: the timing and the names only the benchmarks need` → `bench/harness.ts          bestOf, word and millis: the timing, the names and the report's format only the benchmarks need`
- `bench/stress/harness.ts   the cost harness: one case, cold and warm, pass by pass, in a worker under a deadline` → `bench/stress/harness.ts   the cost harness: one case, cold and warm, pass by pass, in a worker under a deadline; bench/stress/harness.test.ts checks it`
- `bench/stress/cases.ts     the search's cases, a pure function of a seed` → `bench/stress/cases.ts     the search's cases, a pure function of a seed; bench/stress/cases.test.ts checks them`, and likewise `bench/stress/pool.ts` and `bench/stress/catalogue.ts` name `pool.test.ts` and `catalogue.test.ts`, as the table's lines for the modules under `src/` do.

### devdocs/testing.md#(top)

Old:

"The benchmarks are in `pnpm test:all` because they guard costs that nothing else does, and a check that is run only when someone remembers it is not run: three of them once failed unnoticed for a whole stage, two of them before reaching their assertions."

New:

"The benchmarks are in `pnpm test:all` because they guard costs that nothing else does, and a check that is run only when someone remembers it is not run: a benchmark left out of it fails unnoticed, often before reaching its assertion, when the table it builds or the expression it times is refused."

### devdocs/testing.md#What a test may depend on

The whole section, new:

"No test, sweep or benchmark depends on the limits a device has chosen. The significand limit and the precision limit are settings, kept in the browser and proposed per device by the probe, and only the shell reads the browser's settings, through `contextOf`; the stress tools call `contextOf` too, on a catalogued case's settings, which the catalogue stores ([benchmarks.md](benchmarks.md), "The search"), never on the browser's. Every test, sweep and benchmark passes an explicit `NumberContext`, built from the defaults of `context.ts` (`DEFAULT_SIGNIFICAND_LIMIT_BITS`, `DEFAULT_CEILING`) or from literals; the tests of `settings.ts` read a storage in memory, and the probe's tests run over a fake clock, asserting of a real probe only that its proposal lies within the bounds every device's must. The hard bound `MAX_SIGNIFICAND_LIMIT_BITS` and the exponent bound `MAX_EXPONENT` are constants. So a device whose limits are set low runs the same suite to the same results, and a new test keeps it so: it builds its context from the constants, or one of its own when it needs more than the defaults (`rational.bench.ts` runs its largest quotients at twice the default significand limit), never from the settings or the probe. What does depend on the machine is time: one test of `limits.ts` asserts that a real probe answers within a small fixed budget, and the benchmarks assert ratios of timings taken in one run, which noise can move and a machine's speed cannot.

The tests of the system table (`units.test.ts`, `messages.test.ts`, `system-build.test.ts`) build it at the ceiling context, as the app does, so that no unit holds a pass back; `build.bench.ts` builds synthetic tables at the default precision, since it measures the build and not the units. The message tests build `units.txt` against stand-ins for the built-ins that carry the real names."

### devdocs/testing.md#The numeric test patterns

The first bullet, old:

"**Reference digits.** A value checked against digits from a trusted source (the first hundred digits of `pi()`, `exp(1)`, `ln(2)`, `sqrt(2)`, and values from Python's `decimal` module, named in the test), to at least fifty digits, so that an algorithm that is wrong in its tail is caught."

New:

"**Reference digits.** A value checked against digits from a trusted source, named in the test: the first hundred digits of `pi()`, `exp(1)`, `ln(2)` and `sqrt(2)`, and values from Python's `decimal` module and from mpmath, to forty digits at least, and for the Gamma and the incomplete families at one argument each to a thousand, so that an algorithm that is wrong in its tail is caught."

### devdocs/testing.md#The edge sweeps

In the second paragraph, old:

"…a significand near one, and wide balls; a third-operand set and the cube of the second operands serve the three-argument functions. The binary operations take a subset of these as their second argument, and the operations that read the mode run in decimal mode too, …"

New:

"…a significand near one, and wide balls. The binary operations take a subset of these as their second argument, the three-argument functions take that subset as their first two arguments and a small third-operand set as their third, since the full set cubed would be most of the sweep, and the operations that read the mode run in decimal mode too, …"

The end of the last paragraph, old:

"Each case's time is reported, not asserted, since a per-case budget on a loaded runner is a flaky assertion. The ball level runs about 36,000 cases in half a minute and the text level a few hundred in a few seconds. Splitting the ball-level sweep into modules by subject without changing its cases is [#114][114]; making the suite as a whole faster without losing coverage is [#110][110]."

New:

"Each case's time is reported, not asserted, since a per-case budget on a loaded runner is a flaky assertion; the run reports how many cases it ran and how long they took. The ball level runs tens of thousands of cases and the text level a few hundred, which is why the sweeps run before a commit rather than on every edit. Splitting the ball-level sweep into modules by subject without changing its cases is open ([#114](https://github.com/bsidhom/exucal/issues/114)); making the suite as a whole faster without losing coverage is open ([#110](https://github.com/bsidhom/exucal/issues/110))."

### devdocs/testing.md#Type-checking

In the first paragraph, old: "…would run, pass, and hide its type errors (one did, until the projects were made to match by pattern). So `tsconfig.node.json` …"; new: "…would run, pass, and hide its type errors. So `tsconfig.node.json` …".

The second paragraph, new:

"Every type-only import in `src` and `bench` is `import type`, which is erased: under `verbatimModuleSyntax` an `import { type X }` still loads its module for side effects, so a cycle among the kernel's modules (`fixed.ts`, `ball.ts`, `context.ts`) that only such imports kept alive would run a module's top level before its constants exist, depending on which module a test imports first. Removing the remaining import cycles in the core and guarding against new ones with a check is open ([#179](https://github.com/bsidhom/exucal/issues/179))."

### devdocs/testing.md#The UI

After the section, the three reference-style definitions at the foot of the page (`[110]: …`, `[114]: …`, `[179]: …`) are deleted; the links above are inline.

### devdocs/benchmarks.md#Running the benchmarks

The example in the code block, old:

"ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)"

New, the figures elided since the line illustrates a format:

"ℹ 76 prefixes, 3000 units: parse … ms (… µs per definition), build … ms (… µs per definition)"

### devdocs/benchmarks.md#What each benchmark asserts

The first paragraph's last sentence, old: "The thresholds are twice the expected ratios, so that noise never fails a benchmark that a regression would not fail by a wide margin."; new: "The thresholds lie well above the expected ratios, about twice them in most cases, so that noise never fails a benchmark that a regression would not fail by a wide margin."

The `names.bench.ts` bullet's parenthesis, old: "(it costs about the same; before the index it cost fifty times as much)"; new: "(it costs about the same; without the index the check grows with the number of prefixes, many times over this range, which is what the benchmark guards)".

The `kernel.bench.ts` bullet, appended after "…the rectangular splitting the logarithm, the sine and the arctangent use.":

"It also asserts that `exp` of a large argument at the ceiling costs within a small factor of `exp` of one, since the squaring loop renormalizes, timing the digits of the result in log space beside it; and that the decimal grid's own costs, the settle of a midpoint to the working digits, the product of two settled balls and the kernel's exit onto the grid, scale from a quarter of the ceiling to the ceiling under the same bound of 64, being far below any routine."

The `rational.bench.ts` bullet, old:

"…one gcd on its own at 16,384 to 65,536 bits, and two long quotients, at twice the default significand limit since the second is refused at the default, and asserts that doubling the size costs at most eight times, twice what the quadratic gcd gives. Lehmer's gcd is about forty times cheaper than Euclid's at the default significand limit and still quadratic, and the benchmark is what would show a half-gcd's gain should the limit grow."

New:

"…one gcd on its own at 16,384 to 65,536 bits, and asserts of both that doubling the size costs at most eight times, twice what the quadratic gcd gives; it also reports two long quotients, at twice the default significand limit since the second is refused at the default. Lehmer's gcd is many times cheaper than Euclid's at the default significand limit and still quadratic, and the benchmark is what would show a half-gcd's gain should the limit grow."

### devdocs/benchmarks.md#The search

The lock's parenthesis, old: "(`bench/stress/catalogue.lock`, ignored by git, taken over from a process that is gone)"; new: "(`bench/stress/catalogue.lock`, ignored by git, taken over when the process that holds it is gone or has held it past a fixed time)".

The paragraph's last sentence, old: "The command never touches git."; new: "The command reads the current commit from git, to record it with each run and hit, and changes nothing there: committing is the person's."

In the lanes sentence, "lanes, one per core, take the next case as they come free (`pool.ts`)" becomes "lanes, one per core unless `--jobs` says otherwise, take the next case as they come free (`pool.ts`)".

### devdocs/benchmarks.md#The stress suite

Old:

"One function's cases take one to four minutes on four cores; a full run, every case and every hang, takes the better part of an hour, since the catalogue is the costliest inputs known."

New:

"One function's cases take minutes; a full run, every case and every hang, takes far longer, since the catalogue is the costliest inputs known, and the suite says at the start how long the catalogue's own timings predict for the run."

## Terminology

| Term met | Where | Proposed canonical |
| --- | --- | --- |
| "a plain number" for the result of `floor`, `ceil`, `trunc`, `round` | `devdocs/layout.md#The modules` (the `round.ts` line) | **dimensionless** in devdocs, per section 8 ("a plain number" is the docs gloss); "a dimensionless value to the cell its midpoint's result stands for" |
| "the panel" (`testing.md#The UI`, "The shell and the panel"; `benchmarks.md#The harness`, "the panel's settings") beside "the settings sheet" | `devdocs/testing.md`, `devdocs/benchmarks.md` | **the sheet** for the dialog, as `devdocs/settings.md` and section 5 (C56) name it; "panel" only in the component's file name, `settings-panel.ts`; unit V5 owns the page that settles it |
| the stress vocabulary: hit, hang, entry, family, lane, profile, floor, deadline, cold, warm, typing | `devdocs/benchmarks.md`, `bench/stress/*` | keep, devdocs-only, as the code's names; `cost.md` (unit V6) uses the same words |
| "reached only through" for a module that only one module imports and only its test and the sweep exercise | `devdocs/layout.md#The files`, `devdocs/testing.md#(top)` | **exercised only through** |

## Questions for the owner

1. **Vite and standard decorators.** `layout.md#The files` keeps `experimentalDecorators` "because Vite does not yet transform standard (TC39) decorators", a statement about a dependency that moves, pinned here at `vite` 8.2.2, which the unit could not check from the tree. Proposed answer: verify it against the pinned Vite before the page is next edited; if still true, drop "yet" ("because Vite's TypeScript transform does not handle standard decorators"); if no longer true, state the reason the project keeps the legacy flag, or remove the sentence with the flag.
2. **The index's old cost.** The page says the ambiguity check cost fifty times as much without the index; the benchmark's comment says some thirtyfold (`bench/names.bench.ts:24-26`). Proposed answer: no figure on the page (the stale row above); the code comment is outside this unit's remit but should lose its figure too, since the measurement is unrepeatable.
3. **`audit/` and `.claude/skills/` in `layout.md#The files`.** Both are in the tree and unlisted. Proposed answer: not listed while the revamp runs, since `audit/` leaves when the revamp lands (section 12, question 29) and the skill with it; if either is to stay, one bullet each.
4. **`exact.test.ts` in the module table.** Proposed answer: keep it there, as the sweeps are, and name it in the `src/core/` bullet (the edit above), rather than move it into prose; the table is where a reader looks for a file.
5. **Which numbers leave these pages under question 25.** The pages carry three kinds: measurements (the sweep's case count and times, the stress suite's minutes and hour, the example diagnostic line, the forty-times ratio), the tools' own constants (a hit's floor of a second, the two-minute deadline, ten minutes by default, the probe test's budget, the margin of ten percent), and model figures (38 per decade for Karatsuba, a hundred for quadratic). Proposed answer: the measurements go (the stale rows above), the constants stay since they are the design and the code's, and the model figures stay since they are what the thresholds derive from.
6. **The example diagnostic line.** Proposed answer: the elided form above; if a real line is preferred as the illustration, keep one and say it is one run's.
7. **A note for the plan.** Section 11 lists `MIN_SIGNIFICAND_LIMIT_BITS` under `src/core/rational.ts`; it is defined in `src/core/context.ts:269` (derived from `ceilingFor(1)`), and `rational.ts` holds only `MAX_SIGNIFICAND_LIMIT_BITS`. Proposed answer: correct the row in section 11.
8. **Section 9.2's row on `layout.md`.** The row lists `devdocs/layout.md#The files` among the devdocs passages that re-explain user semantics after pointing at docs; the bullet is one sentence and a link. Proposed answer: strike `layout.md` from that row.
9. **`offline.md#Icons` and the favicon.** The favicon edit above (L11) touches what `devdocs/offline.md#Icons` (unit V8) says about the icons' sources. Proposed answer: V8 aligns that section with whichever wording is chosen here.

## Notes on this run

The plan's module list for this unit, "test and bench files by name", understates what verifying these pages takes: `testing.md` and `benchmarks.md` make dozens of specific statements about the sweeps, the random source, the stress tools and the type-checking that can be checked only inside those files, so the unit read the bench and stress modules in full and the sweeps and their support by section, and lists them above. The three pages are in good shape: of ninety-one statements, eight needed a correction and all are local (the stress tools also call `contextOf`; `build.bench.ts` builds at the default precision, not the ceiling; the sweep's three-argument cases are not a cube; mpmath and forty-digit tables; the thresholds are not uniformly twice; the search reads git; the favicon). The decision that shapes most of the proposed text is how far question 25 reaches on pages that are about measuring (question 5). Unit V8 should know that `tsconfig-coverage.test.ts` and `scripts/cloud-setup.test.ts` are described accurately here and that `devdocs/development.md#Commands` must agree with `package.json`'s scripts as read here (`test`, `test:sweep`, `bench`, `test:all`, `stress`, `stress:search`, `stress:rewrite`, `format:check`); unit V6 should know that `cost.md`'s tables are written by `bench/stress/tooling.ts` between the markers `catalogue.ts` defines, and that the stress vocabulary is the code's.
