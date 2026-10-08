# Layout

What each file in the repository is for, and where each module lives.
[architecture.md](architecture.md) says how the modules fit together,
and [testing.md](testing.md) which suites run them.

## The files

- `index.html` is the single page Vite serves and builds. It links the
  web app manifest and sets the theme color that installed copies of
  the app use.
- `src/main.ts` is the entry point. It registers the app's components
  and the service worker.
- `src/core/` is the pure conversion core: no I/O, no DOM, and failures
  returned as `Result` values. Each module but the two smallest,
  `span.ts` and `result.ts`, has a `*.test.ts` beside it, and
  `src/core/builtins/` holds one module per built-in function or
  family.
- `src/units.txt` is the system definitions file: the units, prefixes,
  lists and functions the app knows, described in
  [docs/definitions.md](../docs/definitions.md). `src/units.test.ts`
  checks that it builds and that a sample of its units converts as its
  sources say.
- `src/testing/` is test support, not part of the app: the seeded
  random source that the property tests and the benchmarks draw from,
  the random expression trees of the printer's property test, the
  helpers that build balls from literals, and the edge sweeps' support.
- `src/*.sweep.ts` and `src/core/*.sweep.ts` are the edge sweeps, run
  by `pnpm test:sweep` ([testing.md](testing.md), "The edge sweeps").
- `bench/` holds the performance benchmarks, `*.bench.ts`, run by
  `pnpm bench`, and `bench/stress/` the stress tools: the cost harness,
  the search for the costliest inputs (`pnpm stress:search`), the
  stress suite (`pnpm stress`) and the catalogue they write,
  `catalogue.json`, whose tables [cost.md](cost.md) carries
  ([benchmarks.md](benchmarks.md)).
- The components and the modules beside them under `src/` are listed
  in the table below. `src/register-service-worker.ts` registers
  `sw.js` once the page has loaded, in production builds only, checks
  for updates on its own and when the user asks, and tells the shell
  the worker's status; `src/service-worker-updates.ts` is the page's
  side of the service worker, on interfaces rather than the browser's
  globals so that its tests run under Node; `src/sw.ts` is the service
  worker itself ([offline.md](offline.md)). `src/build-id.ts` exposes
  the commit the app was built from.
- `src/index.css` holds the few global styles for the document.
  Component styles live in each component.
- `public/manifest.webmanifest` is the web app manifest that makes the
  app installable, and `public/icons/` holds the icons it points to.
  They are the source of every icon the app has ([offline.md](offline.md),
  "Icons").
- `vite-plugin-icons.ts` is the Vite plugin that renders the PNG icons
  that some platforms need from the SVG ones, at build time and on
  request during development. `rasterize-svg.ts` does the rendering
  without any dependencies, and `rasterize-svg.test.ts` checks it.
- `vite-plugin-build-id.ts` is the Vite plugin that bakes the commit the
  app was built from into it, which the shell shows in its footer
  ([offline.md](offline.md), "Build ID"). `vite-plugin-build-id.test.ts`
  checks how the commit is found.
- `vite-plugin-precache.ts` is the Vite plugin that builds the service
  worker and injects the list of files to cache into it.
  `vite.config.ts` enables it. `vite-plugin-precache.test.ts` checks the
  injection ([offline.md](offline.md)).
- `tsconfig.json` type-checks three separate programs, each with its own
  config, because they need different `lib` settings: `tsconfig.app.json`
  covers the app (`dom`), `tsconfig.sw.json` the service worker
  (`webworker`, which cannot be combined with `dom` in one program), and
  `tsconfig.node.json` everything that runs under Node.js and needs its
  types: the Vite config and plugins, the tests, sweeps and benchmarks,
  and the modules they exercise. The node project matches files by
  pattern and excludes only the browser-only modules, so a new file is
  checked without being listed, and `tsconfig-coverage.test.ts` fails on
  any file that no project checks ([testing.md](testing.md),
  "Type-checking"). The options they share live in `tsconfig.base.json`.
- Components use TypeScript's `experimentalDecorators`, as Vite's own Lit
  template does, because Vite does not yet transform standard (TC39)
  decorators.
- `pnpm-workspace.yaml` holds the pnpm settings, including the
  supply-chain protections described in the comments there
  ([security.md](security.md)).
- `wrangler.jsonc` configures the Cloudflare Workers deployment
  ([deployment.md](deployment.md)).
- `.env` holds wrangler's system environment variables. It is committed,
  so it must never contain secrets; those belong in the gitignored
  `.env.local`.
- `scripts/cloud-setup.sh` and `scripts/cloud-env` are the setup script
  and the environment variables of the Claude Code cloud environment,
  and `.claude/hooks/session-start.sh` with `.claude/settings.json` the
  hook that runs at the start of each of its sessions
  ([development.md](development.md), "Cloud environment"). The two under
  `scripts/` are pasted into the environment's settings and kept in sync
  by hand; `scripts/cloud-setup.test.ts` fails when the setup script's
  version pins drift from `package.json` or `pnpm-lock.yaml`.
- `docs/` is the user's documentation and `devdocs/` this, the
  developer's.

## The modules

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
src/core/fixed-gamma.ts   digammaFixed and lgammaFixed, and digammaRational and lgammaRational for an exact argument of short denominator: the shift up, by a loop or exactly by binary splitting, and the asymptotic series on the Bernoulli ratios, ln pi memoized
src/core/fixed-incomplete.ts the incomplete gamma series with its tail bound, and Legendre's continued fraction with the bracket of its convergents
src/core/fixed-incbeta.ts the incomplete beta series with positive terms and its geometric tail bound, and the estimate of its terms
src/core/fixed-trig.ts    sinCosFixed and atanFixed: the sine, cosine and arctangent on the kernel, by reduction and the Taylor series
src/core/constants.ts     pi by Chudnovsky's series and e by its series, both with binary splitting, memoized at the ceiling
src/core/bernoulli.ts     the Bernoulli numbers, exact, from the tangent numbers, a run on request
src/core/bernoulli-ratios.ts the ratios of consecutive Bernoulli numbers in fixed point, each at the bits its term needs, memoized by count and bits
src/core/display.ts       show: a ball's text at the digits it certifies, and its kind (exact, certified, partial, zero, unbounded, uncertified); RatioDisplay
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
src/core/builtins/abs.ts  abs and sign: the magnitude and the side of any quantity
src/core/builtins/round.ts floor, ceil, trunc and round(x, places): a plain number to the cell its midpoint's result stands for
src/core/builtins/division.ts div and mod: floored division and its remainder, one quotient serving both
src/core/builtins/integers.ts gcd, lcm, factorial, binomial, doublefactorial: the functions of exact integers, with their size predictions
src/core/builtins/gamma.ts digamma(x), lgamma(x) and gamma(x): the Gamma family, on fixed-gamma.ts, with the poles, the reflection, the routes for any exponent and the classifier on gamma
src/core/builtins/beta.ts beta(a, b): the Beta function through lgamma under the classifier, exact for whole numbers within the significand limit, zero at a pole of the sum alone
src/core/builtins/incomplete.ts lowergamma, uppergamma and the regularized pair: the series or the fraction by cost, the rest in log space through the classifier
src/core/builtins/erf.ts  erf(x) and erfc(x) on the incomplete gamma functions of order one half, odd and complementary, the ends of the exponent apart
src/core/builtins/incbeta.ts incbeta and incbetareg: the series in the cheaper orientation of the symmetry, the rest in log space through the classifier, the polynomial exact case
src/core/builtins/exact.test.ts the exact functions through the pipeline over the system definitions, in every rounding mode and in decimal mode
src/core/table.ts         UnitTable, UnitFunction, ResolvedFunction, the lookup over it
src/core/build.ts         buildTable
src/core/evaluate.ts      evaluate, Lookup, applyFunction, invertFunction, checkConditions
src/core/convert.ts       convert, convertToList, roundTerms
src/core/pipeline.ts      convertText, evaluateText: the pipeline over text, the retry loop, PassObserver
src/core/result.ts        Result; each module defines its own error types
src/core/edges.sweep.ts   the edge sweep at the ball level: every built-in and ball operation over the classes of arguments at the edges
src/units.txt             the system definitions; src/units.test.ts checks them
src/testing/random.ts     the seeded random source the tests and benchmarks share: keys, split and folded in, every draw a pure function of one
src/testing/expr.ts       random expression trees, for the printer's property test
src/testing/fraction.ts   parseFraction, roundFraction, formatFraction: the decimal representation over the fraction, for the tests that reason on fractions
src/testing/scaled.ts     dec, fr, exactDec, fraction, ball, digitsOf: a literal as a Scaled, a midpoint back to its fraction, a ball from decimals, for the tests of the ball and above
src/testing/builtins.ts   the assertions the tests of the exact functions share, on a built-in's result
src/testing/edges.ts      the edge sweeps' support: the worker under a deadline, the table of known violations, the loose arithmetic and the oracle's checks
src/edges.sweep.ts        the edge sweep at the text level: the pipeline and the display's steps on every issue's reproductions, in both modes
src/messages.ts           the errors as sentences; src/messages.test.ts checks them
src/system-table.ts       loadSystemDefinitions: fetches and parses the system definitions, once
src/system-build.ts       buildSystemTable: builds the system table at the ceiling in force, once per ceiling; tableOf, the three-state view
src/settings.ts           Settings: the display digits, the rounding mode, the mode with its notation or working digits, the two limits and the probe budget, in localStorage under a format version with migrations; contextOf, ratioOf, the clamp with its report, the refusal, reset
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
bench/harness.ts          bestOf and word: the timing and the names only the benchmarks need
bench/synthetic.ts        definitions files of a chosen size, for the benchmarks of the build
bench/*.bench.ts          the benchmarks: names, build, kernel, rational
bench/stress/harness.ts   the cost harness: one case, cold and warm, pass by pass, in a worker under a deadline
bench/stress/cases.ts     the search's cases, a pure function of a seed
bench/stress/pool.ts      the lanes, one per core
bench/stress/catalogue.ts the catalogue's shape and the rules that admit a hit; FLOOR_MS, DEADLINE_MS, MARGIN
bench/stress/tooling.ts   update: every change to the catalogue and the tables of devdocs/cost.md, under a lock
bench/stress/search.ts    pnpm stress:search
bench/stress/verify.ts    pnpm stress
bench/stress/rewrite.ts   pnpm stress:rewrite
```
