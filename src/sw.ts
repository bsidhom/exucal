/**
 * The service worker: an offline-first cache of the whole app.
 *
 * `tsconfig.sw.json` checks this file against TypeScript's `webworker` lib,
 * which is where `ServiceWorkerGlobalScope`, `FetchEvent` and the rest of the
 * service worker API are declared: TypeScript has no service-worker-specific
 * lib, and `webworker` covers dedicated, shared and service workers alike.
 *
 * On install it downloads every file the built app consists of into a cache
 * named after this build's version, so the app is fully cached the first time
 * it is loaded. From then on every request for one of those files is answered
 * from the cache without touching the network.
 *
 * Each build produces a different `sw.js` (the version and file list below are
 * injected by `vite-plugin-precache.ts`), so after a deploy the browser
 * detects the new worker on its next visit, installs it in the background
 * (downloading the new files into a new cache) and leaves it waiting. It
 * takes over once every page of the old version has closed, or as soon as a
 * page asks it to by sending it `SKIP_WAITING` (service-worker-updates.ts),
 * which the page does when the user accepts the update it offers. The old
 * cache is deleted when it takes over.
 *
 * A navigation that would leave no other page on the old version hands over
 * too (see `navigate`), so that reloading the app, or launching it from cold,
 * opens the newest version that has installed rather than the one running.
 */

declare const self: ServiceWorkerGlobalScope;

/**
 * The build's precache manifest. `vite-plugin-precache.ts` prepends its
 * definition to this file at build time.
 */
declare const __PRECACHE__: {
  /** A hash of every file in the build. */
  version: string;
  /** The root-absolute URL of every file in the build, including the page. */
  urls: string[];
};

const cacheName = `precache-${__PRECACHE__.version}`;

/**
 * The message that makes this worker take over while it is waiting. It is
 * `SKIP_WAITING` in service-worker-updates.ts, written out again rather than
 * imported (see there).
 */
const SKIP_WAITING = "skip-waiting";

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(activate());
});

self.addEventListener("message", (event) => {
  // Skipping waiting does nothing once this worker is active.
  if (event.data === SKIP_WAITING) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }
  if (new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    request.mode === "navigate"
      ? navigate(request)
      : fromCacheOrNetwork(request),
  );
});

/**
 * Whether this worker has asked the waiting one to take over at a
 * navigation since it last started.
 */
let handedOver = false;

/**
 * Answers a navigation, first handing over to a waiting worker if no page
 * would be left on this version by it.
 *
 * A waiting worker takes over by itself only once no page of this version is
 * open, and a navigation never gets it there: a reload is answered while the
 * old page is still open, and a page launched cold is answered by this
 * worker and becomes one of its own. So when a worker is waiting and at
 * most one window of this version is open, which is the one being reloaded
 * or none at all, this worker asks it to take over and answers with
 * `HAND_OVER_PAGE`, which reloads once the new worker controls it, so that
 * the reload is answered by the new worker. The one window may instead be
 * another page of the app, as when a second window opens beside it; that
 * page then reloads onto the new version as it would after the banner's
 * button (service-worker-updates.ts), so that both windows run the same
 * version. With two or more other windows open, the navigation is answered
 * as usual and the update stays offered.
 *
 * The hand-over is asked for once each time this worker starts, so that a
 * waiting worker that does not take over (one built without the message
 * handler, say) cannot keep the page reloading in a loop: the page's
 * fallback reload is then answered from this worker's cache, as if nothing
 * had been waiting.
 */
async function navigate(request: Request): Promise<Response> {
  const { waiting } = self.registration;
  if (waiting !== null && !handedOver) {
    const windows = await self.clients.matchAll({ type: "window" });
    if (windows.length <= 1) {
      handedOver = true;
      waiting.postMessage(SKIP_WAITING);
      return new Response(HAND_OVER_PAGE, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }
  return fromCacheOrNetwork(request);
}

/**
 * How long the hand-over page waits for the new worker before reloading
 * regardless, in milliseconds.
 */
const HAND_OVER_TIMEOUT = 5000;

/**
 * The blank page shown while a waiting worker takes over at a navigation.
 *
 * It reloads once the new worker controls it, which it learns from the
 * change of controller, or at once if the new worker had already taken
 * over (no worker is waiting any more) by the time its script ran. Reloading
 * any sooner, as a `Refresh` header would, sends the reload to this worker
 * while it is being replaced: the browser starts it again to answer, and
 * the takeover stalls. If nothing has happened after `HAND_OVER_TIMEOUT`,
 * it reloads anyway. The empty `data:` icon keeps the browser from asking
 * this worker for `/favicon.ico` in the meantime.
 */
const HAND_OVER_PAGE = `<!doctype html>
<meta charset="utf-8" />
<meta name="color-scheme" content="light dark" />
<link rel="icon" href="data:," />
<script>
  const container = navigator.serviceWorker;
  const reload = () => location.reload();
  container.addEventListener("controllerchange", reload);
  container.getRegistration().then((registration) => {
    if (!registration?.waiting) reload();
  });
  setTimeout(reload, ${HAND_OVER_TIMEOUT});
</script>
`;

/** Downloads every file of this build into this version's cache. */
async function precache(): Promise<void> {
  const cache = await caches.open(cacheName);
  // Bypass the HTTP cache so the new worker caches what the server serves
  // now, not a stale copy of an unhashed file such as the page itself.
  await cache.addAll(
    __PRECACHE__.urls.map((url) => new Request(url, { cache: "reload" })),
  );
}

/** Deletes the caches of previous versions and takes over open pages. */
async function activate(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name !== cacheName)
      .map((name) => caches.delete(name)),
  );
  await self.clients.claim();
}

/**
 * Answers from the cache when the request is for a file of this build and
 * from the network otherwise.
 *
 * Navigations ignore the query string so that the page is served from the
 * cache whatever parameters it is opened with. `Vary` headers are ignored
 * because the cache holds exactly one response per URL, whereas a server's
 * `Vary: Origin` (which Vite's preview server sends) would otherwise make the
 * page's `crossorigin` script and stylesheet requests, which carry an `Origin`
 * header, miss the entries cached by requests that did not.
 */
async function fromCacheOrNetwork(request: Request): Promise<Response> {
  const cached = await caches.match(request, {
    ignoreSearch: request.mode === "navigate",
    ignoreVary: true,
  });
  return cached ?? fetch(request);
}
