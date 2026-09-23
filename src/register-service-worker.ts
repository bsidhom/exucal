/**
 * Registers the service worker that makes the app work offline.
 *
 * The worker is only registered in production builds: `pnpm build` is what
 * produces `sw.js` with the list of files to cache (see
 * `vite-plugin-precache.ts`), and a worker that cached files during `pnpm dev`
 * would fight the dev server's hot reloading. Use `pnpm preview` to exercise
 * it locally.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Wait for the page to finish loading so that installing the worker (which
  // downloads every file it caches) does not compete with the first render.
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { type: "module" })
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
