# Developer documentation

The user's documentation is in [`docs/`](../docs/README.md). These
pages describe the code as it is: how each part is designed and why,
what is deliberately not in it, and how it is laid out, tested, built
and deployed. They are current-state documents, not a history; git
holds the history.

## The design

- [architecture.md](architecture.md): the overview. The pipeline,
  quantities and dimensions, the definitions file and the build, the
  expression grammar and its parser, evaluation, conversion and unit
  lists, and the UI.
- [numbers.md](numbers.md): the number type and the precision model.
  The types, the kernel's boundary, the exponent bound, certification
  and the display rule, the retry schedule, exact and decimal mode, the
  significand limit, `approx`, the failures.
- [builtins.md](builtins.md): the built-in functions. The rules every
  built-in follows, the dimension rules, each function's domain, exact
  cases and edges, the elementary routines, the exact functions, the
  Gamma and Beta families.
- [functions.md](functions.md): user-defined functions in the
  definitions file. Annotations, conditions, calls, a function as the
  want, the build-time checks, what a call costs.
- [notation.md](notation.md): the ratio notation of exact mode.
- [settings.md](settings.md): the settings. The model, the storage
  format and its migrations, how a change is applied, the probe, the
  sheet and its controls.
- [future.md](future.md): the extensions that fit, the two that would
  reshape the number type, and what is ruled out.

## The code

- [layout.md](layout.md): what each file is, and where each module
  lives.
- [testing.md](testing.md): the suites, what a test may depend on, the
  numeric test patterns, the edge sweeps, the random source,
  type-checking, and how the UI is checked.
- [benchmarks.md](benchmarks.md): the benchmarks and the stress tools.
- [cost.md](cost.md): the catalogue of the costliest expressions, whose
  tables the stress search regenerates.
- [development.md](development.md): the toolchain, the commands, the
  cloud environment, adding a unit, and the style guide.
- [offline.md](offline.md): the service worker and the precache, the
  build ID and the icons.
- [deployment.md](deployment.md): Cloudflare Workers and wrangler.
- [security.md](security.md): the supply chain, the toolchain, secrets,
  and the rules for code that runs commands.
