# pwa-units

An offline-first progressive web app (PWA) skeleton. It renders a single page
that says "hello PWA units", can be installed to the home screen, and works
without a network connection once it has been loaded once.

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
- `src/app-shell.ts` defines `<app-shell>`, the top-level component that every
  part of the app renders inside. For now it renders the greeting.
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
  `tsconfig.node.json` the Vite config and plugin (Node.js). The options they
  share live in `tsconfig.base.json`.
- Components use TypeScript's `experimentalDecorators`, as Vite's own Lit
  template does, because Vite does not yet transform standard (TC39)
  decorators.
- `pnpm-workspace.yaml` holds the pnpm settings, including the supply-chain
  protections described in the comments there.
- `wrangler.jsonc` configures the Cloudflare Workers deployment (see
  Deployment below).
- `.env` holds wrangler's system environment variables. It is committed, so it
  must never contain secrets; those belong in the gitignored `.env.local`.

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
