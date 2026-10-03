import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SKIP_WAITING,
  throttledCheck,
  watchForUpdates,
  type ContainerHandle,
  type RegistrationHandle,
  type UpdateCallbacks,
  type WorkerHandle,
} from "./service-worker-updates.ts";

/** A service worker that records what it is sent and moves on command. */
class FakeWorker extends EventTarget implements WorkerHandle {
  state = "installing";
  readonly messages: unknown[] = [];

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  /** Moves the worker to `state`, as the browser does, with its event. */
  moveTo(state: string) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class FakeRegistration extends EventTarget implements RegistrationHandle {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;

  /** Starts installing `worker`, as the browser does when it finds an update. */
  find(worker: FakeWorker) {
    this.installing = worker;
    this.dispatchEvent(new Event("updatefound"));
  }
}

class FakeContainer extends EventTarget implements ContainerHandle {
  controller: object | null;

  constructor(controller: object | null) {
    super();
    this.controller = controller;
  }

  /** Hands the page to `controller`, as the browser does when a worker takes over. */
  changeTo(controller: object) {
    this.controller = controller;
    this.dispatchEvent(new Event("controllerchange"));
  }
}

/** Callbacks that count their calls. */
function callbacks() {
  const counts = { ready: 0, reloads: 0 };
  const calls: UpdateCallbacks = {
    ready: () => void counts.ready++,
    reload: () => void counts.reloads++,
  };
  return { counts, calls };
}

test("a worker already waiting is offered to a controlled page", () => {
  const registration = new FakeRegistration();
  registration.waiting = new FakeWorker();
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer({}), registration, calls);
  assert.equal(counts.ready, 1);
});

test("nothing is offered when no worker is waiting", () => {
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer({}), new FakeRegistration(), calls);
  assert.equal(counts.ready, 0);
});

test("a worker is offered once it has installed, not before", () => {
  const registration = new FakeRegistration();
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer({}), registration, calls);
  const worker = new FakeWorker();
  registration.find(worker);
  assert.equal(counts.ready, 0);
  worker.moveTo("installed");
  assert.equal(counts.ready, 1);
});

test("a worker that fails to install is not offered", () => {
  const registration = new FakeRegistration();
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer({}), registration, calls);
  const worker = new FakeWorker();
  registration.find(worker);
  worker.moveTo("redundant");
  assert.equal(counts.ready, 0);
});

test("a newer worker replacing the waiting one is offered again", () => {
  const registration = new FakeRegistration();
  registration.waiting = new FakeWorker();
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer({}), registration, calls);
  const newer = new FakeWorker();
  registration.find(newer);
  newer.moveTo("installed");
  assert.equal(counts.ready, 2);
});

test("the first install is not an update, waiting or installing", () => {
  const registration = new FakeRegistration();
  registration.waiting = new FakeWorker();
  const { counts, calls } = callbacks();
  watchForUpdates(new FakeContainer(null), registration, calls);
  const worker = new FakeWorker();
  registration.find(worker);
  worker.moveTo("installed");
  assert.equal(counts.ready, 0);
});

test("applying sends the waiting worker the message to take over", () => {
  const registration = new FakeRegistration();
  const waiting = new FakeWorker();
  registration.waiting = waiting;
  const { calls } = callbacks();
  watchForUpdates(new FakeContainer({}), registration, calls).apply();
  assert.deepEqual(waiting.messages, [SKIP_WAITING]);
});

test("applying goes to the worker waiting at the time, not the one offered", () => {
  const registration = new FakeRegistration();
  const offered = new FakeWorker();
  registration.waiting = offered;
  const { calls } = callbacks();
  const watch = watchForUpdates(new FakeContainer({}), registration, calls);
  const newer = new FakeWorker();
  registration.waiting = newer;
  watch.apply();
  assert.deepEqual(offered.messages, []);
  assert.deepEqual(newer.messages, [SKIP_WAITING]);
});

test("applying with no worker waiting does nothing", () => {
  const { calls } = callbacks();
  const watch = watchForUpdates(
    new FakeContainer({}),
    new FakeRegistration(),
    calls,
  );
  assert.doesNotThrow(() => watch.apply());
});

test("a controlled page reloads once when a new worker takes over", () => {
  const container = new FakeContainer({});
  const { counts, calls } = callbacks();
  watchForUpdates(container, new FakeRegistration(), calls);
  container.changeTo({});
  assert.equal(counts.reloads, 1);
  container.changeTo({});
  assert.equal(counts.reloads, 1);
});

test("the first worker claiming a page does not reload it, a later one does", () => {
  const container = new FakeContainer(null);
  const { counts, calls } = callbacks();
  watchForUpdates(container, new FakeRegistration(), calls);
  container.changeTo({});
  assert.equal(counts.reloads, 0);
  container.changeTo({});
  assert.equal(counts.reloads, 1);
});

/** A clock to set by hand and a check that counts its calls and can fail. */
function checking(fail = false) {
  const clock = { now: 1000 };
  const counts = { checks: 0 };
  const check = throttledCheck(
    () => {
      counts.checks++;
      return fail ? Promise.reject(new Error("offline")) : Promise.resolve();
    },
    () => clock.now,
    100,
  );
  return { clock, counts, check };
}

test("no check is made within the interval of the registration's", () => {
  const { clock, counts, check } = checking();
  check();
  clock.now += 99;
  check();
  assert.equal(counts.checks, 0);
});

test("a check is made once the interval has passed, then not again within it", () => {
  const { clock, counts, check } = checking();
  clock.now += 100;
  check();
  check();
  clock.now += 99;
  check();
  assert.equal(counts.checks, 1);
  clock.now += 1;
  check();
  assert.equal(counts.checks, 2);
});

test("a failed check does not hold off the next", async () => {
  const { clock, counts, check } = checking(true);
  clock.now += 100;
  check();
  await new Promise((resolve) => setImmediate(resolve));
  check();
  assert.equal(counts.checks, 2);
});

test("a clock set back does not hold off checks", () => {
  const { clock, counts, check } = checking();
  clock.now -= 500;
  check();
  assert.equal(counts.checks, 1);
});
