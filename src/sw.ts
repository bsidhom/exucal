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
  event.respondWith(fromCacheOrNetwork(request));
});

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
