# Exucal

An offline-first progressive web app (PWA) that converts units, in the
spirit of GNU units: type a quantity you have (`3 ft`) and a unit you want
(`in`), and it answers `3 ft = 36 in`; want a list of units (`ft;in`) and
it answers `1 m ≈ 3 ft + 3.3700787 in`. As GNU units does, it also
answers the other way round: `3 ft = 36 in` and then `in ≈ 0.027777778 ×
3 ft`. That goes with a conversion into one unit only, since a sum over a
list has no other way round. A button beside each answer copies it, units
and all, as text the app itself reads back: `36 in`, or `0.027777778 *
3 ft` for the other way round, so that an answer pasted into "You have"
is the quantity it showed. The app can be
installed to the home screen and works without a network connection once it
has been loaded once.

- [`docs/`](docs/README.md) is the user's documentation: the
  [settings](docs/settings.md), the [unit definitions](docs/definitions.md)
  and the expression language, and the
  [built-in functions](docs/functions.md).
- [`devdocs/`](devdocs/README.md) is the developer's documentation: the
  [architecture](devdocs/architecture.md), the
  [layout](devdocs/layout.md), [development](devdocs/development.md),
  [benchmarks](devdocs/benchmarks.md), [offline behavior](devdocs/offline.md),
  [deployment](devdocs/deployment.md) and [security](devdocs/security.md),
  with the design notes and the plans behind them.

The app is built with [Lit](https://lit.dev) and [Vite](https://vite.dev),
written in TypeScript, and uses [pnpm](https://pnpm.io) for package
management; `pnpm install`, `pnpm dev` and `pnpm test` are the commands to
start with, and [development.md](devdocs/development.md) has the rest.
