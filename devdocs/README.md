# Developer documentation

The user's documentation is in [`docs/`](../docs/README.md). These pages
describe the code: how it is built, laid out, tested and deployed, and how
each part of it is designed.

## The project

- [architecture.md](architecture.md): the design of the converter and the
  calculator: the pipeline, the number type and the precision model, the
  size limits, quantities and dimensions, the definitions file, the
  expression grammar and its parser, evaluation, conversion, functions,
  and the UI.
- [layout.md](layout.md): what each file in the repository is, the
  type-check projects and the test suites.
- [development.md](development.md): the toolchain, the commands, the
  cloud environment, adding a unit, and the style guide.
- [benchmarks.md](benchmarks.md): the benchmarks and the stress tools.
- [offline.md](offline.md): the service worker and the precache, the
  build ID and the icons.
- [deployment.md](deployment.md): Cloudflare Workers and wrangler.
- [security.md](security.md): the supply chain, the toolchain, secrets,
  and the rules for code that runs commands.
- [cost.md](cost.md): the catalogue of the costliest expressions, whose
  tables the stress search regenerates.
- [future.md](future.md): the extensions that are planned, and the ones
  that are not pursued but kept possible.

## Design notes

One per feature, in [design/](design/): what the feature is, the rules it
follows, where it lives in the code, and the alternatives weighed.

- [design/decimal.md](design/decimal.md): the `Scaled` midpoint, the
  exponent and its bound, sums and the radius, the kernel's boundary.
- [design/decimal-mode.md](design/decimal-mode.md): the decimal mode as a
  calculator's arithmetic.
- [design/working-digits.md](design/working-digits.md): the working digits
  of decimal mode.
- [design/approximate.md](design/approximate.md): the `approx` built-in
  and the exponent bound.
- [design/builtins.md](design/builtins.md): the elementary built-in
  functions.
- [design/special.md](design/special.md): the exact functions, and the
  Gamma and Beta families.
- [design/functions.md](design/functions.md): user-defined functions in
  the definitions file.
- [design/fractions.md](design/fractions.md) and
  [design/ratio-width.md](design/ratio-width.md): the ratio notation and
  its width.
- [design/settings-storage.md](design/settings-storage.md),
  [design/settings-modes.md](design/settings-modes.md),
  [design/settings-limits.md](design/settings-limits.md),
  [design/settings-surface.md](design/settings-surface.md) and
  [design/settings-controls.md](design/settings-controls.md): the settings:
  their storage and migrations, the mode and the rounding, the limits, the
  sheet, and the controls.

## History

The plans and studies the code was built from, in [history/](history/):
the record of how the design was reached, kept apart from the design
itself.

- [history/calculator-study.md](history/calculator-study.md): the
  feasibility study of the calculator features.
- [history/calculator-plan.md](history/calculator-plan.md): the
  implementation plan, with its numbered decisions (D1 to D31) and the
  record of each stage as it landed.
- [history/settings-plan.md](history/settings-plan.md): the triage of the
  settings and the steps S1 to S6.
- [history/shell-refactor.md](history/shell-refactor.md): the refactoring
  of the app shell.
