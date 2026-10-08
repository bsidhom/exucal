# Offline behavior, the build ID and the icons

## Offline behavior

The app is cached in full the first time it is loaded and served from that
cache from then on, so it works offline and loads instantly. Updates are
downloaded automatically after a deploy and offered to the user, who decides
when to switch. The pieces involved:

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
  worker on every navigation (bypassing the HTTP cache). A new worker
  installs in the background, downloading the new build into a new cache
  while the current one keeps serving, and then waits: left alone, it takes
  over only once every page running the old version has closed, which for an
  installed app (often resumed rather than relaunched) can take days and
  several force-closes. A plain reload is not enough, since the old page is
  still open while the new one loads.
- **Update checks.** An installed app is usually resumed rather than
  navigated to, so the browser's own checks rarely run. The page asks for
  one whenever it comes back into view or back online, and every hour while
  it stays in view, but never within five minutes of the last
  (`src/register-service-worker.ts`). Tapping the build number in the
  footer checks at once, however recent the last check, and counts as the
  last check itself. A check fetches `sw.js` alone and installs nothing
  unless it changed; a failed one, for want of a network, does not hold
  off the next. What a check found shows up in the registration rather
  than in its result, as a worker installing and then waiting, so the
  footer reports it as the worker's status, and says "up to date" or
  "couldn't check (offline?)" only while that status has nothing to say.
- **The worker's status.** The footer shows the service worker's status
  beside the page's build (see Build ID below), as
  `src/service-worker-updates.ts` reads it from the registration, in a word
  or two: "caching…" on the first visit, "downloading…" while an update
  downloads, or "bypassed" with a reload link when a hard reload loaded the
  page past the worker, and nothing at all while the worker is ready. Each
  worker answers a message with the commit it was built from, so as soon as
  a new one is waiting (on load, or when it finishes installing) the status
  is a link naming its build, "update to …", for as long as it waits. The
  link sends the waiting worker a message that makes it skip
  waiting; it takes over, deletes the old cache, and every open page of the
  app reloads onto the new version when its controller changes, so no page
  keeps running one build while a worker of another serves it. The new
  build is already cached by then, so the reload costs no download. Until
  the user follows the link, the running version stays. On the first visit
  there is no old version, so the first worker takes over without an offer
  or a reload. Should the worker serving the page ever name another build
  than the page's own, the footer names it, "worker …", with a link to
  reload.
- **Installation.** `public/manifest.webmanifest` gives the app its name,
  icons, and standalone display mode. The icons are SVG, which Chromium-based
  browsers accept for installation. Safari ignores manifest icons and needs a
  PNG `apple-touch-icon`, which the build renders from the SVG (see Icons
  below).

## Build ID

The footer of the app names the build it is running, as the first twelve
digits of the commit hash it was built from (the full hash is in the
tooltip), so a copy on a phone or served from the service worker's cache
can be matched to a commit. The service worker is built with the same
constant and names its build when asked, which is how the footer names a
waiting update (see Offline behavior above). `vite-plugin-build-id.ts` asks git once per
`vite build` or `vite dev` and bakes the answer in as the constant
`__BUILD_ID__`:

- It is git's `HEAD`, with `-dirty` after it when `git status` lists
  uncommitted changes, so a local build is never mistaken for the commit it
  started from.
- Without git or a history to read, it is `unknown`, and the build warns
  rather than fails.

It comes from git alone, wherever the build runs: nothing is read from the
environment, Cloudflare Workers Builds' own commit variables included, so a
deploy and a local build name their commit the same way.

Since the hash is part of the bundle, every commit changes the build and so
the precache version: every deploy ships a service worker update and shows
its own commit, even when it changes only the build or the documentation,
or leaves the rest of the app byte for byte the same. That is deliberate:
the footer says whether a given commit has reached the deployment, not
only whether the app's behavior changed. There is no other versioning yet.

## Icons

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
