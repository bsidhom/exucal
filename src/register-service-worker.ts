import { watchForUpdates, type UpdateWatch } from "./service-worker-updates.ts";

/**
 * Registers the service worker that makes the app work offline, and tells
 * the page when a new version of the app is ready (service-worker-updates.ts).
 *
 * The worker is only registered in production builds: `pnpm build` is what
 * produces `sw.js` with the list of files to cache (see
 * `vite-plugin-precache.ts`), and a worker that cached files during `pnpm dev`
 * would fight the dev server's hot reloading. Use `pnpm preview` to exercise
 * it locally. In development no update is ever reported.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Wait for the page to finish loading so that installing the worker (which
  // downloads every file it caches) does not compete with the first render.
  window.addEventListener("load", () => {
    const container = navigator.serviceWorker;
    container
      .register(`${import.meta.env.BASE_URL}sw.js`, { type: "module" })
      .then((registration) => {
        watch = watchForUpdates(container, registration, {
          ready() {
            updateReady = true;
            for (const listener of listeners) {
              listener();
            }
          },
          reload() {
            location.reload();
          },
        });
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

/** The watch over the registration, once the worker is registered. */
let watch: UpdateWatch | undefined;

/** Whether a new version is waiting to be applied. */
let updateReady = false;

/** Who to tell when a new version is ready. */
const listeners = new Set<() => void>();

/**
 * Calls `listener` when a new version of the app is installed and ready to
 * take over, at once if one already is, and possibly again for a newer one.
 * Returns a function that stops the calls.
 */
export function onUpdateReady(listener: () => void): () => void {
  listeners.add(listener);
  if (updateReady) {
    listener();
  }
  return () => listeners.delete(listener);
}

/**
 * Switches to the new version that `onUpdateReady` reported: its worker
 * takes over, and every open page of the app reloads onto it.
 */
export function applyUpdate(): void {
  watch?.apply();
}
