/**
 * The page's side of the service worker: what state it is in, which build
 * each worker serves, and switching to a new version once one is waiting.
 *
 * A new service worker installs in the background (downloading the new build
 * into its own cache) and then waits: the browser keeps the old one active
 * for as long as any page it controls is open, which for an installed app on
 * a phone can be days. `watchWorkers` reports the registration's state as a
 * `WorkerStatus` whenever it changes, including the build of a worker
 * waiting to take over, and its `apply` asks that worker to take over at
 * once (sw.ts skips waiting when sent `SKIP_WAITING`). Once it has, every
 * open page of the app reloads, since a page keeps running the code it was
 * loaded with and the files of the old version are gone from the cache: a
 * page never runs one build while a worker of another serves it. The new
 * version is already cached in full by the time it is offered, so applying
 * it costs no download.
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

/**
 * The message that asks a worker for the build it serves. It carries a
 * port, and sw.ts answers on it with its `__BUILD_ID__`, the same commit ID
 * the page shows for itself (build-id.ts).
 */
export const BUILD_ID_REQUEST = "build-id";

/** A service worker as this module uses it: `ServiceWorker` in a browser. */
export interface WorkerHandle extends EventTarget {
  readonly state: string;
  postMessage(message: unknown): void;
}

/** A registration as this module uses it: `ServiceWorkerRegistration`. */
export interface RegistrationHandle<
  W extends WorkerHandle = WorkerHandle,
> extends EventTarget {
  readonly installing: W | null;
  readonly waiting: W | null;
  readonly active: W | null;
}

/** The page's view of its workers: `navigator.serviceWorker`. */
export interface ContainerHandle<
  W extends WorkerHandle = WorkerHandle,
> extends EventTarget {
  readonly controller: W | null;
}

/**
 * The state of the service worker as far as this page is concerned. The
 * first four kinds come before or instead of a registration
 * (register-service-worker.ts); the rest are read from one by
 * `watchWorkers`.
 */
export type WorkerStatus =
  /** A development build, which registers no worker. */
  | { readonly kind: "development" }
  /** The browser has no service workers. */
  | { readonly kind: "unsupported" }
  /** The worker is being registered. */
  | { readonly kind: "registering" }
  /** The registration failed. */
  | { readonly kind: "failed" }
  /** The first worker is installing; nothing controls the page yet. */
  | { readonly kind: "installing" }
  /**
   * A worker is active but does not control this page, which was loaded
   * past it, as a hard reload does.
   */
  | { readonly kind: "bypassed" }
  /**
   * The page is controlled and no update is pending. `build` is the
   * controlling worker's build once it has answered.
   */
  | { readonly kind: "ready"; readonly build?: string }
  /** A new version is downloading. */
  | { readonly kind: "downloading" }
  /**
   * A new version is installed and waits to take over. `build` is its build
   * once it has answered.
   */
  | { readonly kind: "waiting"; readonly build?: string }
  /** The waiting worker has been asked to take over; the page will reload. */
  | { readonly kind: "applying" };

/** What `watchWorkers` needs from the page. */
export interface WatchCallbacks<W extends WorkerHandle = WorkerHandle> {
  /**
   * Asks `worker` for the build it serves, resolving to `undefined` if it
   * does not answer, as a worker built before it could would not.
   */
  buildOf(worker: W): Promise<string | undefined>;
  /** Called with the status whenever it may have changed. */
  status(status: WorkerStatus): void;
  /**
   * A new worker has taken over this page, which still runs the old
   * version's code: the page must reload. Called at most once.
   */
  reload(): void;
}

/** What the page can do about the worker that `watchWorkers` follows. */
export interface WorkerWatch {
  /**
   * Asks the waiting worker to take over now; every open page of the app
   * then reloads. Does nothing if no worker is waiting, as when another
   * window applied the update first, which reloads this page too.
   */
  apply(): void;
}

/**
 * Follows `registration` and reports its status through `callbacks`, at
 * once and on every change: a worker found, installed or activated, or a
 * change of controller.
 *
 * Each worker is asked for its build once, the controlling one and the
 * waiting one, and the status is reported again when it answers.
 *
 * A change of controller reloads the page only if it had one before: on the
 * first visit nothing controls the page, and the first worker takes over
 * without waiting (sw.ts claims the page when it activates), serving the
 * very build the page was loaded from the network with.
 */
export function watchWorkers<W extends WorkerHandle>(
  container: ContainerHandle<W>,
  registration: RegistrationHandle<W>,
  callbacks: WatchCallbacks<W>,
): WorkerWatch {
  const builds = new WeakMap<W, string>();
  const asked = new WeakSet<W>();
  const followed = new WeakSet<W>();
  let applying = false;

  const report = () => {
    callbacks.status(
      applying
        ? { kind: "applying" }
        : statusOf(container.controller, registration, builds),
    );
  };

  const learn = (worker: W | null) => {
    if (worker === null || asked.has(worker)) {
      return;
    }
    asked.add(worker);
    void callbacks.buildOf(worker).then((build) => {
      if (build !== undefined) {
        builds.set(worker, build);
        report();
      }
    });
  };

  const update = () => {
    for (const worker of [
      registration.installing,
      registration.waiting,
      registration.active,
    ]) {
      if (worker !== null && !followed.has(worker)) {
        followed.add(worker);
        worker.addEventListener("statechange", update);
      }
    }
    learn(container.controller);
    learn(registration.waiting);
    report();
  };

  registration.addEventListener("updatefound", update);

  let controller = container.controller;
  let reloading = false;
  container.addEventListener("controllerchange", () => {
    const previous = controller;
    controller = container.controller;
    if (previous !== null && !reloading) {
      reloading = true;
      callbacks.reload();
    }
    update();
  });

  update();

  return {
    apply() {
      const { waiting } = registration;
      if (waiting !== null) {
        applying = true;
        waiting.postMessage(SKIP_WAITING);
        report();
      }
    },
  };
}

/**
 * The status that `controller` and `registration` add up to, with the
 * builds learned so far. A waiting worker takes precedence over a newer one
 * still downloading, since it is the one the page can switch to.
 */
function statusOf<W extends WorkerHandle>(
  controller: W | null,
  registration: RegistrationHandle<W>,
  builds: WeakMap<W, string>,
): WorkerStatus {
  const { installing, waiting, active } = registration;
  if (controller === null) {
    // An activating worker is the first one, about to claim the page.
    return active === null || active.state === "activating"
      ? { kind: "installing" }
      : { kind: "bypassed" };
  }
  if (waiting !== null) {
    return withBuild("waiting", builds.get(waiting));
  }
  if (installing !== null) {
    return { kind: "downloading" };
  }
  return withBuild("ready", builds.get(controller));
}

/** A status of `kind` with `build` if it is known. */
function withBuild(
  kind: "ready" | "waiting",
  build: string | undefined,
): WorkerStatus {
  return build === undefined ? { kind } : { kind, build };
}

/** The two ways `updateChecks` checks for an update. */
export interface UpdateChecks {
  /**
   * Checks unless the last check started less than the interval ago: the
   * page's own checks, when it comes back into view.
   */
  ifDue(): void;
  /**
   * Checks at once, however recent the last check, and resolves to whether
   * the check went through: the user's check, from the settings.
   */
  now(): Promise<boolean>;
}

/**
 * Checks for an update by calling `check`, either when due, at most once
 * per `interval` milliseconds by `now`, or at once.
 *
 * Browsers check for a new worker on every navigation, but an installed
 * app is mostly resumed rather than navigated to, so the page asks for
 * checks of its own when it comes back into view; a check fetches `sw.js`
 * alone, and installs nothing unless it changed. The registration starts
 * with a check, so the interval runs from the creation of the checks. A
 * check made at once counts as the last check as much as one made when
 * due. A failed check, most likely for want of a network, does not count,
 * so the next occasion tries again. A clock set back is taken as time
 * elapsed rather than waited out.
 *
 * What a check found is not its result: a new version shows up in the
 * registration, as a worker installing and then waiting (`watchWorkers`).
 */
export function updateChecks(
  check: () => Promise<unknown>,
  now: () => number,
  interval: number,
): UpdateChecks {
  let last = now();
  const run = (time: number) => {
    last = time;
    return check().then(
      () => true,
      () => {
        if (last === time) {
          last = -Infinity;
        }
        return false;
      },
    );
  };
  return {
    ifDue() {
      const time = now();
      if (time < last || time - last >= interval) {
        void run(time);
      }
    },
    now: () => run(now()),
  };
}
