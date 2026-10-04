import {
  BUILD_ID_REQUEST,
  updateChecks,
  watchWorkers,
  type UpdateChecks,
  type WorkerStatus,
  type WorkerWatch,
} from "./service-worker-updates.ts";

/**
 * Registers the service worker that makes the app work offline, and keeps
 * the page told of its status (service-worker-updates.ts), which the shell
 * shows in its footer along with the update it offers.
 *
 * The worker is only registered in production builds: `pnpm build` is what
 * produces `sw.js` with the list of files to cache (see
 * `vite-plugin-precache.ts`), and a worker that cached files during `pnpm dev`
 * would fight the dev server's hot reloading. Use `pnpm preview` to exercise
 * it locally.
 *
 * Besides the check the browser makes on every navigation, the page checks
 * for an update whenever it comes back into view or back online, and every
 * hour while it stays in view, but never within `CHECK_INTERVAL` of the
 * last check: an installed app is usually resumed rather than reloaded, and
 * would otherwise not hear of a new version until it was closed and opened
 * again. The user can check at once from the settings (`checkForUpdate`).
 */

/** The least time between two checks for an update, in milliseconds. */
const CHECK_INTERVAL = 5 * 60 * 1000;

/** How often to check for an update while the page stays in view. */
const PERIODIC_CHECK = 60 * 60 * 1000;

/** How long to wait for a worker to name its build, in milliseconds. */
const BUILD_ID_TIMEOUT = 5000;

/** The watch over the registration, once the worker is registered. */
let watch: WorkerWatch | undefined;

/** The checks for an update, once the worker is registered. */
let checks: UpdateChecks | undefined;

/** The latest status. */
let status: WorkerStatus;

/** Who to tell when the status changes. */
const listeners = new Set<(status: WorkerStatus) => void>();

if (!import.meta.env.PROD) {
  setStatus({ kind: "development" });
} else if (!("serviceWorker" in navigator)) {
  setStatus({ kind: "unsupported" });
} else {
  setStatus({ kind: "registering" });
  // Wait for the page to finish loading so that installing the worker (which
  // downloads every file it caches) does not compete with the first render.
  window.addEventListener("load", () => {
    const container = navigator.serviceWorker;
    container
      .register(`${import.meta.env.BASE_URL}sw.js`, { type: "module" })
      .then((registration) => {
        watch = watchWorkers(container, registration, {
          buildOf,
          status: setStatus,
          reload() {
            location.reload();
          },
        });
        const registered = updateChecks(
          () => registration.update(),
          Date.now,
          CHECK_INTERVAL,
        );
        checks = registered;
        const checkIfVisible = () => {
          if (document.visibilityState === "visible") {
            registered.ifDue();
          }
        };
        document.addEventListener("visibilitychange", checkIfVisible);
        window.addEventListener("online", checkIfVisible);
        setInterval(checkIfVisible, PERIODIC_CHECK);
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
        setStatus({ kind: "failed" });
      });
  });
}

function setStatus(next: WorkerStatus) {
  status = next;
  for (const listener of listeners) {
    listener(status);
  }
}

/**
 * Asks `worker` for the build it serves over a port of its own, resolving
 * to `undefined` if no answer comes within `BUILD_ID_TIMEOUT`: a worker
 * built before it could answer never will.
 */
function buildOf(worker: ServiceWorker): Promise<string | undefined> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    const settle = (build: string | undefined) => {
      clearTimeout(timer);
      port1.close();
      resolve(build);
    };
    const timer = setTimeout(() => settle(undefined), BUILD_ID_TIMEOUT);
    port1.onmessage = (event: MessageEvent<unknown>) => {
      settle(typeof event.data === "string" ? event.data : undefined);
    };
    worker.postMessage(BUILD_ID_REQUEST, [port2]);
  });
}

/**
 * Calls `listener` with the service worker's status at once and on every
 * change. Returns a function that stops the calls.
 */
export function onWorkerStatus(
  listener: (status: WorkerStatus) => void,
): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

/**
 * Switches to the new version that a `waiting` status reported: its worker
 * takes over, and every open page of the app reloads onto it.
 */
export function applyUpdate(): void {
  watch?.apply();
}

/**
 * Checks for a new version at once, however recent the last check, and
 * resolves to whether the check went through; false too before the worker
 * is registered. A new version it finds is reported through
 * `onWorkerStatus`, as downloading and then waiting.
 */
export function checkForUpdate(): Promise<boolean> {
  return checks?.now() ?? Promise.resolve(false);
}
