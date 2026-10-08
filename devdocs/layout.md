# Layout

_This page gathers the two accounts of the repository's layout that
README.md and ARCHITECTURE.md used to carry, the file guide and the core's
module table, as they were; they overlap and are to be merged._

## The files

- `index.html` is the single page Vite serves and builds. It links the web app
  manifest and sets the theme color that installed copies of the app use.
- `src/main.ts` is the entry point. It registers the app's components and the
  service worker.
- `src/core/` is the pure conversion core that `devdocs/architecture.md` describes:
  no I/O, no DOM, and failures returned as `Result` values. Each module has
  a `*.test.ts` beside it.
- `src/units.txt` is the system definitions file: the units and prefixes the
  app knows, described in docs/definitions.md. `src/units.test.ts`
  checks that it builds and that a sample of its units converts as its
  sources say.
- `src/testing/` is test support, not part of the app: the seeded random
  source that the core's property tests and the benchmarks draw from, and
  the random expression trees the printer's property test writes and reads
  back.
- `bench/` holds the performance benchmarks of the core, run by
  `pnpm bench` (see devdocs/benchmarks.md).
  `bench/stress/` holds the plan's stage 8: the cost harness, which
  measures what one input costs the converter, cold and warm, pass by
  pass, and the search for the costliest inputs, `pnpm stress:search`,
  which is run by hand and never by `pnpm test:all` (`--help` lists its
  options; devdocs/benchmarks.md describes it), and the stress
  suite, `pnpm stress`, which measures again the catalogued inputs of
  the functions named (see devdocs/benchmarks.md, "Stress tests"; `devdocs/cost.md` presents
  the catalogue).
- `src/app-shell.ts` defines `<app-shell>`, the top-level component that every
  part of the app renders inside: the composition root. It holds the three
  pieces of state the parts share (the unit definitions, which it loads
  when it is connected, showing a loading message until they arrive; the
  settings; and the service worker's status) and wires the parts together,
  passing each what it shows as properties and applying the changes the
  settings panel reports. `src/subscription.ts` is the reactive controller
  that mirrors the worker's status into it, checked by
  `src/subscription.test.ts`.
- `src/settings-panel.ts` defines `<settings-panel>`, the controls of the
  Settings panel (see docs/settings.md) and the "Measure this device"
  button with its proposal. It takes the settings as a property and
  reports each change as an event; the shell applies and saves it, and
  hands back what the clamp moved for the panel to say.
  `src/settings-lines.ts` holds the lines the panel says, text alone,
  checked by `src/settings-lines.test.ts`.
- `src/app-footer.ts` defines `<app-footer>`, the build the page is running,
  which checks for updates when tapped, and the worker's status (see devdocs/offline.md).
- `src/styles.ts` holds the few styles the components share.
- `src/system-table.ts` fetches `units.txt`, which the build emits as an
  asset of its own, and parses it, once; `src/system-build.ts` builds the
  table from it at the ceiling of the retry schedule the settings give,
  once per ceiling, and `src/system-build.test.ts` checks that memo.
- `src/settings.ts` holds the settings (see docs/settings.md): reading them
  from the browser's storage, migrating a stored object from its format
  version to the current one, validating them, clamping the ones that
  depend on others, saving them with the version and the build that
  saved them, resetting them, and turning them into the context the core
  computes with, whose ceiling is derived from the precision limit.
  `src/settings.test.ts` checks the parsing, the migrations and the reset
  under Node.js with a fake storage.
- `src/limits.ts` is the probe behind the "Measure this device" button: it
  times the app's costliest operations on this device within the probe
  budget and proposes the two limits with the timings behind them.
  `src/limits.test.ts` checks it against a fake clock.
- `src/outcome.ts` turns the pipeline's result for a pair of texts into the
  lines the output area shows, each two expressions and `=` or `≈` with a
  note, written by the core's printer so that every line can be typed back
  as a `have`; it has no DOM dependency, so `src/outcome.test.ts` checks
  the lines under Node.js.
- `src/unit-converter.ts` defines `<unit-converter>`, the two inputs and the
  output area that make up the app; `devdocs/architecture.md` ("UI") describes it.
  `src/copy-button.ts` defines `<copy-button>`, the button beside each
  answer that copies it.
- `src/messages.ts` turns the errors the core returns into the sentences the
  converter shows. It has no DOM dependency, so `src/messages.test.ts` checks
  the wording under Node.js.
- `src/register-service-worker.ts` registers `sw.js` once the page has loaded,
  in production builds only, checks for updates on its own and when the
  user asks, and tells the shell the worker's status.
- `src/service-worker-updates.ts` is the page's side of the service worker:
  it reads the status and the workers' builds from the registration, asks a
  waiting worker to take over, and reloads the page when it has (see devdocs/offline.md). It works on interfaces rather than the
  browser's globals, so `src/service-worker-updates.test.ts` checks it under
  Node.js.
- `src/sw.ts` is the service worker (see devdocs/offline.md).
- `src/index.css` holds the few global styles for the document. Component
  styles live in each component.
- `public/manifest.webmanifest` is the web app manifest that makes the app
  installable, and `public/icons/` holds the icons it points to. They are the
  source of every icon the app has (see devdocs/offline.md, "Icons").
- `vite-plugin-icons.ts` is the Vite plugin that renders the PNG icons that
  some platforms need from the SVG ones, at build time and on request during
  development. `rasterize-svg.ts` does the rendering without any dependencies,
  and `rasterize-svg.test.ts` checks it.
- `vite-plugin-build-id.ts` is the Vite plugin that bakes the commit the app
  was built from into it, which `src/build-id.ts` exposes and the shell shows
  in its footer (see devdocs/offline.md, "Build ID"). `vite-plugin-build-id.test.ts` checks
  how the commit is found.
- `vite-plugin-precache.ts` is the Vite plugin that builds the service worker
  and injects the list of files to cache into it. `vite.config.ts` enables it.
  `vite-plugin-precache.test.ts` checks the injection (see devdocs/offline.md).
- `tsconfig.json` type-checks three separate programs, each with its own
  config, because they need different `lib` settings: `tsconfig.app.json`
  covers the app (`dom`), `tsconfig.sw.json` the service worker
  (`webworker`, which cannot be combined with `dom` in one program), and
  `tsconfig.node.json` everything that runs under Node.js and needs its
  types: the Vite config and plugins, the tests, sweeps and benchmarks,
  and the modules they exercise. The node project matches files by
  pattern and excludes only the browser-only modules, so a new file is
  checked without being listed, and `tsconfig-coverage.test.ts` fails on
  any file that no project checks. The options they share live in
  `tsconfig.base.json`.
- Components use TypeScript's `experimentalDecorators`, as Vite's own Lit
  template does, because Vite does not yet transform standard (TC39)
  decorators.
- `pnpm-workspace.yaml` holds the pnpm settings, including the supply-chain
  protections described in the comments there.
- `wrangler.jsonc` configures the Cloudflare Workers deployment (see devdocs/deployment.md).
- `.env` holds wrangler's system environment variables. It is committed, so it
  must never contain secrets; those belong in the gitignored `.env.local`.
- `scripts/cloud-setup.sh` and `scripts/cloud-env` are the setup script and
  the environment variables of the Claude Code cloud environment, and
  `.claude/hooks/session-start.sh` with `.claude/settings.json` the hook
  that runs at the start of each of its sessions (see devdocs/development.md, "Cloud environment"). The two under `scripts/` are pasted into the environment's
  settings and kept in sync by hand; `scripts/cloud-setup.test.ts` fails
  when the setup script's version pins drift from `package.json` or
  `pnpm-lock.yaml`.

## The core's modules, the type-check projects and the test suites

```
src/core/rational.ts      Rational, the exact fraction: arithmetic, comparison, integer powers, the exact root
src/core/scaled.ts        Scaled, the midpoint's type, a fraction times a power of ten in canonical form: arithmetic within the alignment limit and the exponent bound (MAX_EXPONENT; ScaledError, Refusal, powerRefusal), comparison, parsing, rounding, formatting, the binary magnitude
src/core/rounding.ts      RoundingMode, ROUNDING_MODES, divideRounded: the one place a mode is interpreted; Precision
src/core/context.ts       NumberContext: the precision, the rounding mode, the significand limit, the ceiling and the exact or decimal mode arithmetic is done under
src/core/radius.ts        Radius, the coarse bound a ball carries, and its operations, each rounding the way its bound needs, up or down
src/core/ball.ts          Ball (a midpoint with a Radius), its exact operations, the root and the rational power on the kernel, unresolved
src/core/fixed.ts         Fixed, the fixed-point kernel: a value with an error count in ulps, its exact operations, the roots
src/core/fixed-exp.ts     expFixed, sinhCoshFixed and tanhFixed: the exponential on the kernel, by halving, Taylor and squaring into a Floating, and the hyperbolic functions through it
src/core/digits.ts        floatingToBall: a Floating as a ball, exactly within the significand limit and by its decimal logarithm in log space beyond it
src/core/fixed-log.ts     lnFixed: the logarithm on the kernel, by square roots and the atanh series; ln(2) and ln(10) memoized
src/core/fixed-gamma.ts   digammaFixed and lgammaFixed, and digammaRational and lgammaRational for an exact argument of short denominator: the shift up, by a loop or exactly by binary splitting, and the asymptotic series on the Bernoulli ratios, ln pi memoized (stage 6, devdocs/design/special.md)
src/core/fixed-incomplete.ts the incomplete gamma series with its tail bound, and Legendre's continued fraction with the bracket of its convergents (stage 6, devdocs/design/special.md)
src/core/fixed-incbeta.ts the incomplete beta series with positive terms and its geometric tail bound, and the estimate of its terms (stage 6, devdocs/design/special.md)
src/core/fixed-trig.ts    sinCosFixed and atanFixed: the sine, cosine and arctangent on the kernel, by reduction and the Taylor series
src/core/constants.ts     pi by Chudnovsky's series and e by its series, both with binary splitting, memoized at the ceiling
src/core/bernoulli.ts     the Bernoulli numbers, exact, from the tangent numbers, a run on request
src/core/bernoulli-ratios.ts the ratios of consecutive Bernoulli numbers in fixed point, each at the bits its term needs, memoized by count and bits
src/core/display.ts       show: a ball's text at the digits it certifies, and its kind (exact, certified, partial, zero, unbounded)
src/core/dimension.ts     Dimension arithmetic, conformance check, a dimension as an expression and its text
src/core/dimension-of.ts  dimensionOf: a body's dimension without its value, the build's function check
src/core/quantity.ts      Quantity (a Ball with a Dimension), its arithmetic
src/core/span.ts          Span, a location in the input text
src/core/parser.ts        Parser combinators, ParseError
src/core/expr.ts          Expr, parseExpr, parseUnitList, Rejection; LEVELS and BINARY, the grammar's levels and operators as data
src/core/print.ts         print: a tree as canonical text, in pieces; the inverse of parseExpr
src/core/definitions.ts   Definition, parseDefinitions
src/core/graph.ts         on-demand evaluation of a dependency graph, cycles
src/core/names.ts         the prefix-unit resolution rule, the ambiguity check
src/core/name-index.ts    the names that start with a text, by binary search
src/core/builtin.ts       Builtin, its errors and the shared rule helpers: what a built-in is
src/core/builtins.ts      BUILTINS: the app's built-ins gathered by name from builtins/
src/core/builtins/pi.ts   pi(): the circle constant from constants.ts, one module per built-in
src/core/builtins/exp.ts  exp(x): the exponential, on fixed-exp.ts, with e from constants.ts
src/core/builtins/log.ts  ln, log10, log2 and log(b, x): the logarithms, on fixed-log.ts, sharing the domain rule
src/core/builtins/roots.ts sqrt and cbrt: rootBall under a name, with its exact cases and errors
src/core/builtins/pow.ts  pow(x, y): the rational power's rule for an exact exponent, log space for an inexact one
src/core/builtins/trig.ts sin, cos and tan: the trigonometric functions of an angle, on fixed-trig.ts, sharing the reduction
src/core/builtins/inverse-trig.ts asin, acos, atan and atan2: the inverses, returning an angle, every one an arctangent
src/core/builtins/hyperbolic.ts sinh, cosh, tanh, asinh, acosh and atanh: through exp, and through ln of a root
src/core/builtins/approx.ts approx(x): the value known to the working precision and no better, of any dimension, never narrowing
src/core/builtins/abs.ts  abs and sign: the magnitude and the side of any quantity (stage 6, devdocs/design/special.md)
src/core/builtins/round.ts floor, ceil, trunc and round(x, places): a plain number to the cell its midpoint's result stands for
src/core/builtins/division.ts div and mod: floored division and its remainder, one quotient serving both
src/core/builtins/integers.ts gcd, lcm, factorial, binomial, doublefactorial: the functions of exact integers, with their size predictions
src/core/builtins/gamma.ts digamma(x), lgamma(x) and gamma(x): the Gamma family, on fixed-gamma.ts, with the poles, the reflection, the routes for any exponent and the classifier on gamma
src/core/builtins/beta.ts beta(a, b): the Beta function through lgamma under the classifier, exact for whole numbers within the significand limit, zero at a pole of the sum alone
src/core/builtins/incomplete.ts lowergamma, uppergamma and the regularized pair: the series or the fraction by cost, the rest in log space through the classifier
src/core/builtins/erf.ts  erf(x) and erfc(x) on the incomplete gamma functions of order one half, odd and complementary, the ends of the exponent apart
src/core/builtins/incbeta.ts incbeta and incbetareg: the series in the cheaper orientation of the symmetry, the rest in log space through the classifier, the polynomial exact case
src/core/table.ts         UnitTable, UnitFunction, ResolvedFunction, the lookup over it
src/core/build.ts         buildTable
src/core/evaluate.ts      evaluate, Lookup, applyFunction, invertFunction
src/core/convert.ts       convert, convertToList, roundTerms
src/core/pipeline.ts      convertText, evaluateText: the pipeline over text
src/core/result.ts        Result; each module defines its own error types
src/units.txt             the system definitions; src/units.test.ts checks them
src/testing/random.ts     the seeded random source the tests and benchmarks share: keys, split and folded in, every draw a pure function of one
src/testing/expr.ts       random expression trees, for the printer's property test
src/testing/fraction.ts   parseFraction, roundFraction, formatFraction: the decimal representation over the fraction, for the tests that reason on fractions
src/testing/scaled.ts     dec, fr, exactDec, fraction, ball, digitsOf: a literal as a Scaled, a midpoint back to its fraction, a ball from decimals, for the tests of the ball and above
src/testing/edges.ts      the edge sweep's support: the worker under a deadline, the table of known violations, the loose arithmetic and the oracle's checks
src/core/edges.sweep.ts   the edge sweep at the ball level: every built-in and ball operation over the classes of arguments at the edges
src/edges.sweep.ts        the edge sweep at the text level: the pipeline and the display's steps on every issue's reproductions, in both modes
src/messages.ts           the errors as sentences; src/messages.test.ts checks them
src/system-table.ts       loadSystemDefinitions: fetches and parses the system definitions, once
src/system-build.ts       buildSystemTable: builds the system table at the ceiling in force, once per ceiling
src/settings.ts           Settings: The display digits, the rounding mode, the mode with its notation or working digits, the two limits and the probe budget, in localStorage under a format version with migrations; contextOf, the clamp with its report, the refusal, reset
src/settings-lines.ts     the words the settings sheet says: the units, the group headings, the lines under the controls opening with each number's range, the refusal, the clamp's line, the resets, the probe's proposal; src/settings-lines.test.ts checks them
src/limits.ts             recommendLimits: the probe that measures the device within the budget and proposes the two limits with their timings
src/outcome.ts            outcomeOf: the lines the output area shows for a pair of texts, from the pipeline's result, each two expressions the printer writes; src/outcome.test.ts checks them
src/unit-converter.ts     the component: the two inputs and the output area, rendering the outcome
src/copy-button.ts        the button beside each result that copies it
src/app-button.ts         the app's button with words in it: Done, Apply, Retry, the probe's; the one place its look is defined
src/link-button.ts        a button that reads as a link: the resets beside a setting, "Reset all settings", the footer's reload and update
src/step-button.ts        a stepper's − or + beside a number input, the input's height, a thumb's hit area
src/settings-button.ts    the cog in the header's corner that opens and closes the settings sheet
src/settings-panel.ts     the settings sheet: the dialog with its handle and Done, the three groups of controls with their steppers and resets, the refusal and clamp lines, the probe's button and its proposal; emits settings-change, settings-reset and settings-close
src/app-footer.ts         the footer: the build ID, which checks for updates when tapped, and the worker's status
src/subscription.ts       Subscription: a reactive controller that mirrors a source into its host; src/subscription.test.ts checks it
src/styles.ts             the styles the components share: the feedback every button gives (hover, press, focus, disabled) and the hint line
src/app-shell.ts          the composition root: loads the table, holds the settings and the worker's status, wires the parts
```

Each core module but the two smallest, span.ts and result.ts, has a
`*.test.ts` beside it, run by `pnpm test`.

Every TypeScript file is type-checked by one of the three projects
`tsconfig.json` references, whichever has the `lib` it runs under. A
composite project fails (TS6307) on an imported file its patterns do not
match, so an import cannot escape the check, but a file nothing imports,
a test or a sweep, is checked only if a project's patterns match it, and
Node runs it either way, stripping its types without checking them. So
`tsconfig.node.json` matches every TypeScript file at the root and under
`src/`, `bench/` and `scripts/` and excludes only the browser-only
modules, and `tsconfig-coverage.test.ts` asks tsc for the files each
project checks and fails on any tracked or new `.ts` file in none of
them, and on any code file of another extension (`.js`, `.mjs`, `.tsx`
and the like), which no project's patterns match. It reads git's list
NUL-separated and refuses any path with a control character, since tsc
lists its files one per line (devdocs/security.md).
`pnpm test:all` runs `pnpm typecheck` before the tests.

No test, sweep or benchmark depends on the limits a device has chosen.
The significand limit and the precision limit are settings, kept in the
browser and proposed per device by the probe of `limits.ts`, and only
the shell reads them, through `contextOf`. Every test, sweep and benchmark passes an
explicit `NumberContext`, built from the defaults of context.ts
(`DEFAULT_SIGNIFICAND_LIMIT_BITS`, `DEFAULT_CEILING`) or from literals; the tests of
settings.ts read a storage in memory, and the probe's tests run over a
fake clock, asserting of a real probe only that its proposal lies within
the bounds every device's must. The hard bound `MAX_SIGNIFICAND_LIMIT_BITS` and the
exponent bound `MAX_EXPONENT` are constants. So a device whose limits are
set low runs the same suite to the same results, and a new test keeps it
so: it builds its context from the constants, or one of its own when it
needs more than the defaults (`rational.bench.ts` runs the quotients of
issue #52 at twice the default significand limit), never from the settings or
the probe. What
does depend on the machine is time: one test of limits.ts asserts that a
real probe answers within five seconds, and the benchmarks assert ratios
of timings taken in one run, which noise can move and a machine's speed
cannot.

Two more files are the edge sweeps, the fourth of the plan's test
patterns (devdocs/history/calculator-plan.md, "How to read a task"; the plan's
H.10), named `*.sweep.ts` and run by `pnpm test:sweep` rather than with
every edit, since they are conformance tests that grow with every
built-in (36,000 cases and about 35 s at the ball level after stage 6,
against ten seconds for the rest of the suite): they run before a commit and in CI,
and `pnpm test:all` runs the suite and the sweeps together (issue #108),
and the benchmarks with them (issue #135).
At the ball level, src/core/edges.sweep.ts runs every built-in of `BUILTINS`,
enumerated by arity so that a function added later joins it, and the
ball's own operations over the classes of arguments at the edges of the
number type: zero and the units, values at both ends of the exponent
bound and past the significand limit's reach, a fraction significand at either
edge, a significand near one, and wide balls, each exact and with a relative
radius of about `1e-30`, in decimal mode too where an operation reads the
mode. At the text level, src/edges.sweep.ts runs `parseExpr`, `evaluateText`
and `convertText` on the reproductions of every issue filed against stage
4's code, in both modes, with `show` and `roundTerms` called as
outcome.ts calls them. Each case is checked for what this document
rules out: a throw; a refusal where the decisions allow none (`overflow`
or `underflow` only when every value of the true result passes the bound,
`tooLarge` only at a documented site, a domain error only for an argument
outside the domain throughout); a value whose midpoint's exponent or whose
`|mid| + rad` passes the bound; a value that misses a known point (`exp(0)`,
`approx(x)`, the exact result of a sum or a product) or a known range
(`|tanh| <= 1`); and, at the text level, an exact result past `significandLimitBits`,
and a unit list whose shown terms do not add up to the `have`. The
magnitude of the true result is bounded in src/testing/edges.ts from the
arguments' intervals, exactly for the arithmetic and in log space for the
exponential and the powers, on bigint exponents near `±10^18` and never on
doubles. The known violations are a table keyed by issue and by the task
that fixes it: a violation the table does not list fails the sweep, and so
does a listed one that no case shows any more, so that a fix is never
silent. The cases run in a worker under a deadline, since node:test's
`timeout` cannot interrupt a synchronous test, and a case known to hang is
matched by name and not run; each case's time is reported, not asserted.
The ball level runs about 14,000 cases in under two seconds and the text
level about 270 in three.
