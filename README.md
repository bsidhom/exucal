# pwa-units

An offline-first progressive web app (PWA) that converts units, in the
spirit of GNU units: type a quantity you have (`3 ft`) and a unit you want
(`in`), and it answers `3 ft = 36 in`. It can be installed to the home screen
and works without a network connection once it has been loaded once.

`ARCHITECTURE.md` describes the design of the unit converter itself: the
conversion pipeline, the number type, and how units, dimensions and kinds are
modeled.

## Unit definitions

Every unit the app knows comes from a definitions file, `src/units.txt`,
which defines each unit in terms of others down to a few primitives, in the
spirit of a GNU units file. This section describes that file: what it
contains, how to read it, and how to add to it. The same expression language
serves the definitions and what you type into the converter, so anything
that can be typed can also be defined.

### What the file contains

- **The SI in full**, after the 9th edition of the SI brochure with the 2022
  prefixes: the seven base units, every prefix by name and by symbol (with
  three spellings of micro, `µ`, `μ` and `u`, and the binary prefixes `Ki`,
  `Mi`, ... beside them), the derived units with special names, and the
  non-SI units accepted for use with the SI (`min`, `h`, `d`, `ha`, `L`,
  `t`, `au`, `eV`, `Da`, the degree and its subdivisions).
- **US customary units**, after NIST Handbook 44: the international inch,
  foot, yard and mile with their subdivisions and multiples, the US survey
  foot and the land-survey units built on it, liquid and dry measure,
  avoirdupois, troy and apothecaries' mass, and the customary force,
  pressure, energy, power and speed units (`lbf`, `psi`, `Btu`, `hp`,
  `mph`, ...).
- **UK imperial units**, after the Weights and Measures Act 1985: the
  imperial gallon and its subdivisions, stone, quarter, long hundredweight
  and long ton, rood and cental.
- **Some common extras**: the constants the definitions need (`pi`, `c`,
  `gravity`, ...), CGS units, conventional pressure units (`atm`, `torr`,
  `mmHg`, `inH2O`), calories, time units beyond the day, and bits and bytes.

Where the US and the UK give one name to different units, the plain name is
the US unit and the name with `imp` or `uk` in front is the imperial one:
`gallon` is 231 cubic inches and `impgallon` is 4.54609 litres, `ton` is
2000 pounds and `longton` (or `ukton`) is 2240. Every factor is the exact
one its defining document states, so `1 in` is exactly `2.54 cm` and `1 lb`
exactly `0.45359237 kg`, and conversions between them are exact.

Two things are deliberately absent. Temperature units (`degC`, `degF`,
`degR`) are intervals only: they convert temperature differences, and
converting a reading means adding the offset yourself (`20 degC + 273.15 K`
into `K` is `293.15`, and `300 K - 459.67 degR` into `degF` is `80.33`),
since there is no function that adds it for you yet. Logarithmic units
(neper, bel) are left out for the same reason.

### The format

One definition per line: a name, whitespace, then a body. `#` starts a
comment that runs to the end of the line, and blank lines are skipped.

```
m         !                 # dimension primitive
radian    !kind             # kind primitive (dimensionless)
kilo-     1000              # prefix (trailing dash)
inch      2.54 cm           # unit, defined by an expression
newton    kg m / s^2
hertz     1 / s
```

A definition is one of three things:

- **A primitive**, with a body of `!`, is a base unit that everything else
  is defined in terms of: the metre, the kilogram, the second and the other
  SI base units. A body of `!kind` declares a kind primitive instead: a
  dimensionless marker that keeps quantities apart which would otherwise
  look alike. The radian is one, so that `rad/s` does not convert to `Hz`
  (a revolution per second is not a cycle per second) and `rpm` converts
  to `rad/s` but not to `Hz`.
- **A prefix**, written with a trailing dash (`kilo-`), has a body that is a
  plain number.
- **A unit** has a body that is an expression over numbers and other units.

Definitions may appear in any order; a unit may be defined by one that
comes later. A name defined twice, a circular definition, or a prefix
whose body has a dimension is an error.

### Names

A name is a letter or underscore followed by letters, digits and
underscores, in any script, so `µm`, `Ω`, `Å`, `degF` and `N_A` are
names while `°`, `%` and `'` cannot be. Names are case-sensitive (`mm` and
`Mm`, `S` and `s`) and read as long as they go, so `m2` is the name `m2`,
not `m` squared.

A name means the unit of that name if there is one, and otherwise one prefix
followed by a unit: `km` is `k` + `m` and `kilometre` is `kilo` + `metre`.
An exact name always wins, so `min` is the minute and not `m` + `in`, and
`ha` is defined as the hectare even though `h` + `a` would give the same.
Prefixes do not stack (`kkm` is nothing), and there is no plural handling
(`inches` is nothing unless it is defined as an alias). Prefixes and units
are separate namespaces, which is how `m-` (milli) and `m` (the metre)
coexist.

A name that could be read as two different prefix-unit pairs is an error
when the file is loaded, not an ambiguity resolved by some rule. That is why
two conventional symbols are missing: `u` for the dalton, because with `au`
a unit `dau` would be both `d` + `au` and `da` + `u`, and `at` for the
technical atmosphere, for the same reason against `t`. The longer names
(`Da`, `amu`, `technicalatmosphere`) are there.

### Expressions

A body, like the text typed into the converter, is a small expression
language:

- **Numbers** are unsigned decimals, with an optional exponent: `2`, `2.54`,
  `.5`, `1e-3`. They are read exactly, so a unit defined by a decimal
  converts exactly. A sign is part of a number only in its exponent: `1e-3`
  is a thousandth, `1 - 3` is a difference, and `-2` is the negation of `2`.
- **Juxtaposition** multiplies: `2 m` is two metres and `kg m` is a
  kilogram-metre. A number may only be the first factor of a product, so
  `m 2` and `2 3 m` are errors; multiplying numbers is written `2 * 3`.
- **`*` and `/`** multiply and divide, at one level, left to right, and
  juxtaposition binds tighter than either: `kg m / s^2` is `(kg m) / (s^2)`
  and `m/s*s` is `(m/s)*s`.
- **`+` and `-`** add and subtract, at one level, left to right, binding
  loosest of all: `1 ft + 3 in` is fifteen inches, `2 m * 3 + 1 m` is
  `(2 m * 3) + (1 m)`, and `5 ft - 2 in + 1 in` is `((5 ft - 2 in) + 1 in)`.
  The two sides must be quantities of the same thing, by the same test that
  `have` and `want` must pass: `1 m + 1 s` is an error (length and time),
  and so are `1 rad + 1` (an angle and a plain number) and `1 m + 0`, since
  `0` is a number and not a length. A difference may be zero or negative.
- **`-` before a product** negates it: `-2 m` is minus two metres and
  `2 * -3` is minus six. It binds tighter than `*` and `/` and looser than
  juxtaposition and `^`, so `-2 m / s` is `(-(2 m)) / s` and `-2^2` is `-4`;
  write `(-2)^2` for `4`. It does not stack (`--2` is an error; write
  `-(-2)`), and there is no `+` in front of anything.
- **`^`** raises to a literal exponent, which is a signed decimal (`m^2`,
  `s^-1`, `m^0.5`) or a parenthesized fraction (`m^(1/2)`), never an
  expression. It binds tightest, so `m^2 - 1` is `(m^2) - 1`.
- **Parentheses** group.

The one thing to watch is a fraction before a unit: `1/12 year` is
`1 / (12 year)`, a frequency, because the juxtaposition is read first.
Write `year / 12` or `(1/12) year` instead. The same rule makes
`1 m + 1/2 m` an error, `1 m` plus `1 / (2 m)`; write `1 m + m/2`.

### Adding a unit

Append a line to `src/units.txt`, or edit one, and run `pnpm test`:
`src/units.test.ts` loads the file and fails with the offending definition
if it does not build. Keep a new unit in the section its kind belongs to,
prefer the exact factor from a defining document over a rounded one, and
say where the factor comes from in a comment when it is not obvious.

## Development

The app is built with [Lit](https://lit.dev) and [Vite](https://vite.dev),
written in TypeScript, formatted with [Prettier](https://prettier.io), and
uses [pnpm](https://pnpm.io) for package management.

### Prerequisites

- Node.js 24 (the current LTS line) or newer. pnpm refuses to run on an older
  Node.js; `pnpm env use --global lts` installs a suitable one.
- pnpm 12. The exact version is pinned in `package.json`; pnpm 10 or newer
  switches to it automatically.

### Commands

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm install`      | Install dependencies from the lockfile.             |
| `pnpm dev`          | Start the development server with hot reloading.    |
| `pnpm build`        | Type-check and build a production bundle in `dist`. |
| `pnpm preview`      | Serve the production bundle locally.                |
| `pnpm typecheck`    | Type-check without building.                        |
| `pnpm test`         | Run the tests with Node's built-in test runner.     |
| `pnpm bench`        | Run the performance benchmarks (see Benchmarks).    |
| `pnpm format`       | Format all source files with Prettier.              |
| `pnpm format:check` | Verify that all source files are formatted.         |

Run `pnpm format` before every commit: the repository is expected to be
formatted with Prettier at all times, and `pnpm format:check` is how that is
verified.

The service worker is only registered in production builds, so `pnpm dev`
never caches anything. To try the offline behavior, run `pnpm build` and then
`pnpm preview`, load the page once, and reload it with the network disabled
(or with the preview server stopped).

### Layout

- `index.html` is the single page Vite serves and builds. It links the web app
  manifest and sets the theme color that installed copies of the app use.
- `src/main.ts` is the entry point. It registers the app's components and the
  service worker.
- `src/core/` is the pure conversion core that `ARCHITECTURE.md` describes:
  no I/O, no DOM, and failures returned as `Result` values. Each module has
  a `*.test.ts` beside it.
- `src/units.txt` is the system definitions file: the units and prefixes the
  app knows, described under Unit definitions above. `src/units.test.ts`
  checks that it builds and that a sample of its units converts as its
  sources say.
- `bench/` holds the performance benchmarks of the core, run by
  `pnpm bench` (see Benchmarks below); `ARCHITECTURE.md` describes them.
- `src/app-shell.ts` defines `<app-shell>`, the top-level component that every
  part of the app renders inside. It loads the unit table when it is
  connected, shows a loading message until it arrives, and hands it to the
  converter.
- `src/system-table.ts` fetches `units.txt`, which the build emits as an
  asset of its own, and parses and builds it into the table, once.
- `src/unit-converter.ts` defines `<unit-converter>`, the two inputs and the
  output area that make up the app; `ARCHITECTURE.md` ("UI") describes it.
- `src/messages.ts` turns the errors the core returns into the sentences the
  converter shows. It has no DOM dependency, so `src/messages.test.ts` checks
  the wording under Node.js.
- `src/register-service-worker.ts` registers `sw.js` once the page has loaded,
  in production builds only.
- `src/sw.ts` is the service worker (see Offline behavior below).
- `src/index.css` holds the few global styles for the document. Component
  styles live in each component.
- `public/manifest.webmanifest` is the web app manifest that makes the app
  installable, and `public/icons/` holds the icons it points to. They are the
  source of every icon the app has (see Icons below).
- `vite-plugin-icons.ts` is the Vite plugin that renders the PNG icons that
  some platforms need from the SVG ones, at build time and on request during
  development. `rasterize-svg.ts` does the rendering without any dependencies,
  and `rasterize-svg.test.ts` checks it.
- `vite-plugin-precache.ts` is the Vite plugin that builds the service worker
  and injects the list of files to cache into it. `vite.config.ts` enables it.
  `vite-plugin-precache.test.ts` checks the injection (see Offline behavior
  below).
- `tsconfig.json` type-checks three separate programs, each with its own
  config, because they need different `lib` settings: `tsconfig.app.json`
  covers the app (`dom`), `tsconfig.sw.json` the service worker
  (`webworker`, which cannot be combined with `dom` in one program), and
  `tsconfig.node.json` the Vite config and plugin (Node.js), along with the
  tests and benchmarks, which run under Node.js and need its types, and the
  core they exercise. The options they share live in `tsconfig.base.json`.
- Components use TypeScript's `experimentalDecorators`, as Vite's own Lit
  template does, because Vite does not yet transform standard (TC39)
  decorators.
- `pnpm-workspace.yaml` holds the pnpm settings, including the supply-chain
  protections described in the comments there.
- `wrangler.jsonc` configures the Cloudflare Workers deployment (see
  Deployment below).
- `.env` holds wrangler's system environment variables. It is committed, so it
  must never contain secrets; those belong in the gitignored `.env.local`.

### Benchmarks

`pnpm bench` runs the performance benchmarks in `bench/`. They take a few
seconds and need nothing beyond Node.js. Each prints the timings it measured
as diagnostics, for comparison with an earlier run on the same machine:

```
ℹ 76 prefixes, 3000 units: parse 41.77 ms (13.6 µs per definition), build 9.95 ms (3.2 µs per definition)
```

A benchmark fails when a cost no longer scales with the size of its input
as it should, not when a timing is slow, so a failure is a regression
whatever the machine. Run them after any change to the core's data
structures or algorithms, alongside `pnpm test`, and add one when a change
introduces a cost that a later change could quietly undo. `ARCHITECTURE.md`
("Benchmarks") describes how they are built and what each one asserts.

### Offline behavior

The app is cached in full the first time it is loaded and served from that
cache from then on, so it works offline and loads instantly. Updates are picked
up automatically after a deploy. The pieces involved:

- **Precaching.** When `src/sw.ts` is installed, it downloads every file of the
  build into a cache named after the build's version: the page, the hashed
  scripts and styles, and everything in `public/`, except the app icons (see
  Icons below for why). Requests for those files are then answered from the
  cache without touching the network; any other same-origin request goes to
  the network as usual. The page is cached under
  `/` and served for navigations regardless of the query string.
- **The precache manifest.** The service worker does not know what the build
  contains, so `vite-plugin-precache.ts` builds it as a second entry point of
  `vite build`, emitted unhashed as `dist/sw.js` (its location decides the
  scope it controls, which must be the whole site), and prepends a
  `__PRECACHE__` constant listing the URL of every other file in `dist`, minus
  the ones its `exclude` option in `vite.config.ts` rules out, along with a
  version hashed from all of their contents. That constant is generated
  code, so the plugin makes sure file names cannot end up as anything but
  strings in it: the manifest is serialized with `JSON.stringify` (JSON is a
  subset of JavaScript, so its output is always a valid expression), every URL
  is validated against a conservative character set first, and the result is
  parsed with Vite's own JavaScript parser and rejected unless it starts with
  a `const` declaration whose value is a literal of plain objects, arrays and
  strings. `pnpm test` covers these checks.
- **Updates.** Because the version is derived from the contents of the build,
  any change to the app changes `sw.js`, and browsers check for a changed
  worker on every navigation (at most once a day, bypassing the HTTP cache).
  A new worker installs in the background, downloading the new build into a
  new cache while the current one keeps serving, and takes over once every tab
  running the old version has closed. At that point it deletes the old cache.
  Nothing tells the user that an update is waiting; that is a good first
  feature to add on top of this skeleton.
- **Installation.** `public/manifest.webmanifest` gives the app its name,
  icons, and standalone display mode. The icons are SVG, which Chromium-based
  browsers accept for installation. Safari ignores manifest icons and needs a
  PNG `apple-touch-icon`, which the build renders from the SVG (see Icons
  below).

### Icons

The SVG files in `public/icons/` are the only icon sources; every other form
of the icon is rendered from them, so changing an SVG updates them all on the
next build. Nothing rendered is committed.

- `icon.svg` is the regular icon, with its own rounded corners, and
  `icon-maskable.svg` is the maskable variant: it fills its whole square and
  keeps its content inside the safe zone, for platforms that cut the icon into
  their own shape. The manifest points at both.
- `apple-touch-icon.png` is what Safari uses for the iOS home screen, since
  it ignores the manifest's icons and cannot use SVG there. `index.html` links
  it, and it is placed at the site root, where iOS also looks for it by name.
  It is rendered at 180 pixels (the largest size iOS uses, 60 points at 3x)
  from the maskable variant, because iOS rounds the corners itself and shows
  transparent pixels as black, so a full-bleed square is the right source.

`vite-plugin-icons.ts` does the rendering. It is configured in
`vite.config.ts` with a list of PNGs to make (source SVG, output file name and
size), and adds each one to the bundle on every `vite build`, so they end up
in `dist` like every other file. During `pnpm dev` it renders them on request
instead, from the current SVG. To add a PNG, add an entry to the list; nothing
needs to be checked in.

The icons, rendered and SVG alike, are deliberately left out of the service
worker's precache (the `exclude` option of `precache()` in `vite.config.ts`).
The browser or OS fetches an icon when the app is installed, which happens
online, and keeps its own copy with the installed app; the page never requests
icons itself. Precaching them would make every visitor download the whole
icon set on their first visit, which with several sizes can outweigh the app,
and would ship a new service worker on every icon change, for no benefit. The
favicon is the exception and stays precached, because the browser requests it
on every page load.

How a changed icon reaches users is up to each platform, and the service
worker plays no part in it on any of them: the worker only sees the page's
own requests, and browsers only check it for updates when the page is
visited, while icons are never requested by the page. On iOS the home screen
icon is copied when the user adds the app and never fetched again; only
removing and re-adding the app picks up a new one, and nothing served by the
site can change that. Chromium-based browsers re-read the manifest when an
installed app is launched, at most once a day, and fetch its icons from the
network as part of that check. A changed icon URL is what that check is
guaranteed to notice, so an icon that must update reliably there should get a
new file name (and a matching manifest entry) rather than new contents under
the old name. Precaching would not have helped either platform: on iOS
nothing re-fetches, and on Chromium the check goes to the network regardless.
At worst, a precached icon could have been served to that check from the
cache, which is one more reason to leave icons out.

Node.js cannot render SVG on its own, and the alternatives (a native or
WebAssembly rendering library, or a headless browser) all add a dependency,
which this project avoids where it reasonably can; Cloudflare Workers Builds,
which runs the deploy, has no browser to lean on either. So `rasterize-svg.ts`
is a small rasterizer of its own, written for the subset of SVG that flat
icons use: the basic shapes and paths (with curves and arcs), transforms,
solid colors with opacity, both fill rules, and strokes with every cap and
join. Its header comment lists exactly what it accepts. Anything outside that
subset, such as gradients, `style` attributes, text or filters, fails the
build with a message naming the feature, rather than rendering it wrong. The
strictness is deliberate: it is what makes the SVG safe to treat as the
source of truth. If an icon ever needs something beyond the subset, either
extend the rasterizer or replace the call in `vite-plugin-icons.ts` with a
rendering library; the plugin and the rest of the build do not care how the
PNG is made.

### Deployment

The site is deployed to Cloudflare Workers as static assets, with Cloudflare
Workers Builds running these commands from the repository root:

| Step   | Command                     |
| ------ | --------------------------- |
| Build  | `pnpm run build`            |
| Deploy | `pnpm exec wrangler deploy` |

`wrangler.jsonc` holds the Worker name, the assets directory (`dist`), and the
compatibility date. Keep the compatibility date as recent as the pinned
wrangler supports, and bump it whenever wrangler is updated.

Wrangler sends usage telemetry to Cloudflare unless told otherwise, and its
[telemetry docs](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/telemetry.md)
describe the opt-outs. This project turns it off in two places so that it stays
off for every contributor and for Workers Builds, without anyone running
`wrangler telemetry disable` on their own machine:

- `send_metrics: false` in `wrangler.jsonc` is the documented project-level
  setting.
- `WRANGLER_SEND_METRICS=false` in `.env` is a belt-and-braces backstop. Wrangler
  (as of 4.130.0) sends its "autoconfig" events without reading the project
  config, so `send_metrics` alone does not silence them, but the environment
  variable does, and wrangler loads `.env` before those events are sent.

Either setting is overridden by `DO_NOT_TRACK=1` in the environment, which
also disables telemetry.

`wrangler` is a pinned `devDependency`, so the deploy uses the exact version
recorded in `pnpm-lock.yaml`, installed by the same `pnpm install` that the
build step already runs and covered by the same supply-chain settings as every
other dependency. Do not deploy with `pnpm dlx wrangler`: `dlx` installs the
newest wrangler into a temporary directory on every deploy, and that install
fails under `strictDepBuilds` because two of wrangler's dependencies, `esbuild`
and `workerd`, ship install scripts. Those scripts are explicitly denied under
`allowBuilds` in `pnpm-workspace.yaml` (see the comment there for why they are
not needed), which satisfies the strict policy without running any third-party
code at install time.

### Style guide

- **Reference source files with relative paths and static assets with
  root-absolute paths.** In `index.html`, anything Vite transforms (files under
  `src/`) is referenced as `./src/main.ts`, while files in `public/` are
  referenced as `/favicon.svg`. Vite accepts either form for source files, so
  this is a convention for readers rather than a requirement: a relative path
  makes it obvious that the file is part of the source tree and that Vite
  resolves and rewrites the reference at build time, whereas a root-absolute
  path signals a static asset that is served from the URL root and copied to
  the build output verbatim. The same applies inside modules: import other
  source files with relative paths such as `./app-shell.ts`.
