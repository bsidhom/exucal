/**
 * The page's side of updating the app: noticing that a new version has been
 * installed, offering it, and reloading onto it once it takes over.
 *
 * A new service worker installs in the background (downloading the new build
 * into its own cache) and then waits: the browser keeps the old one active
 * for as long as any page it controls is open, which for an installed app on
 * a phone can be days. `watchForUpdates` reports when such a worker is
 * waiting, and its `apply` asks the worker to take over at once (sw.ts skips
 * waiting when sent `SKIP_WAITING`). Once it has, every open page of the
 * app reloads, since a page keeps running the code it was loaded with and
 * the files of the old version are gone from the cache. The new version is
 * already cached in full by the time it is offered, so applying it costs no
 * download.
 *
 * Nothing here touches the browser's globals, so the logic is checked under
 * Node.js against fakes; `register-service-worker.ts` connects it to
 * `navigator.serviceWorker` and the page.
 */

/**
 * The message that makes a waiting worker take over at once. sw.ts listens
 * for the same string; it is not shared through an import because the worker
 * is a separate entry of the build, and anything both import would become a
 * chunk that `sw.js` loads.
 */
export const SKIP_WAITING = "skip-waiting";

/** A service worker as this module uses it: `ServiceWorker` in a browser. */
export interface WorkerHandle extends EventTarget {
  readonly state: string;
  postMessage(message: unknown): void;
}

/** A registration as this module uses it: `ServiceWorkerRegistration`. */
export interface RegistrationHandle extends EventTarget {
  readonly installing: WorkerHandle | null;
  readonly waiting: WorkerHandle | null;
}

/** The page's view of its workers: `navigator.serviceWorker`. */
export interface ContainerHandle extends EventTarget {
  readonly controller: object | null;
}

/** What `watchForUpdates` calls on the page. */
export interface UpdateCallbacks {
  /**
   * A new version is installed and waits for the user's go-ahead. Called
   * again if an even newer one replaces it before then.
   */
  ready(): void;
  /**
   * A new worker has taken over this page, which still runs the old
   * version's code: the page must reload. Called at most once.
   */
  reload(): void;
}

/** What the page can do about an update that `watchForUpdates` reported. */
export interface UpdateWatch {
  /**
   * Asks the waiting worker to take over now; every open page of the app
   * then reloads. Does nothing if no worker is waiting, as when another
   * window applied the update first, which reloads this page too.
   */
  apply(): void;
}

/**
 * Watches `registration` for a new version and reports it through
 * `callbacks`.
 *
 * A worker counts as an update only if this page already has a controller.
 * On the first visit nothing controls the page, and the first worker takes
 * over without waiting (sw.ts claims the page when it activates); there is
 * nothing to offer and nothing to reload onto. For the same reason, a change
 * of controller reloads the page only if it had one before the change.
 */
export function watchForUpdates(
  container: ContainerHandle,
  registration: RegistrationHandle,
  callbacks: UpdateCallbacks,
): UpdateWatch {
  const offer = (worker: WorkerHandle | null) => {
    if (worker !== null && container.controller !== null) {
      callbacks.ready();
    }
  };

  // A worker may have finished installing before this page loaded, while an
  // earlier page of the app was open.
  offer(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        offer(worker);
      }
    });
  });

  let controller = container.controller;
  let reloading = false;
  container.addEventListener("controllerchange", () => {
    const previous = controller;
    controller = container.controller;
    if (previous !== null && !reloading) {
      reloading = true;
      callbacks.reload();
    }
  });

  return {
    apply() {
      registration.waiting?.postMessage(SKIP_WAITING);
    },
  };
}
