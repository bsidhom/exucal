import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SKIP_WAITING,
  updateChecks,
  watchWorkers,
  type ContainerHandle,
  type RegistrationHandle,
  type WorkerHandle,
  type WorkerStatus,
} from "./service-worker-updates.ts";

/**
 * A service worker of a given build (none if it would not say), which
 * records what it is sent and moves on command.
 */
class FakeWorker extends EventTarget implements WorkerHandle {
  readonly build: string | undefined;
  state: string;
  readonly messages: unknown[] = [];

  constructor(build?: string, state = "installing") {
    super();
    this.build = build;
    this.state = state;
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  /** Moves the worker to `state`, as the browser does, with its event. */
  moveTo(state: string) {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

/** A registration whose workers move through their lifecycle on command. */
class FakeRegistration
  extends EventTarget
  implements RegistrationHandle<FakeWorker>
{
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  active: FakeWorker | null = null;

  /** Starts installing `worker`, as the browser does when it finds an update. */
  find(worker: FakeWorker) {
    this.installing = worker;
    this.dispatchEvent(new Event("updatefound"));
  }

  /** Moves the installing worker to waiting. */
  install() {
    const worker = this.installing!;
    this.installing = null;
    this.waiting = worker;
    worker.moveTo("installed");
  }

  /** Moves the waiting worker to active. */
  activate() {
    const worker = this.waiting!;
    this.waiting = null;
    this.active = worker;
    worker.moveTo("activating");
  }
}

class FakeContainer extends EventTarget implements ContainerHandle<FakeWorker> {
  controller: FakeWorker | null;

  constructor(controller: FakeWorker | null) {
    super();
    this.controller = controller;
  }

  /** Hands the page to `controller`, as the browser does when a worker takes over. */
  changeTo(controller: FakeWorker) {
    this.controller = controller;
    this.dispatchEvent(new Event("controllerchange"));
  }
}

/** A page controlled by an active worker of build `build`. */
function controlled(build?: string) {
  const worker = new FakeWorker(build, "activated");
  const registration = new FakeRegistration();
  registration.active = worker;
  return { container: new FakeContainer(worker), registration };
}

/**
 * Watches `registration`, recording the statuses reported, the reloads and
 * the workers asked for their builds.
 */
function watching(container: FakeContainer, registration: FakeRegistration) {
  const statuses: WorkerStatus[] = [];
  const asked: FakeWorker[] = [];
  const counts = { reloads: 0 };
  const watch = watchWorkers(container, registration, {
    buildOf: (worker) => {
      asked.push(worker);
      return Promise.resolve(worker.build);
    },
    status: (status) => void statuses.push(status),
    reload: () => void counts.reloads++,
  });
  return { watch, statuses, asked, counts, last: () => statuses.at(-1) };
}

/** Lets the workers' answers about their builds arrive. */
const answers = () => new Promise((resolve) => setImmediate(resolve));

test("a controlled page is ready, with its worker's build once it answers", async () => {
  const { container, registration } = controlled("aaa");
  const { last } = watching(container, registration);
  assert.deepEqual(last(), { kind: "ready" });
  await answers();
  assert.deepEqual(last(), { kind: "ready", build: "aaa" });
});

test("a worker that does not name its build is shown without one", async () => {
  const { container, registration } = controlled();
  const { statuses } = watching(container, registration);
  await answers();
  assert.deepEqual(statuses, [{ kind: "ready" }]);
});

test("the first install is installing until the worker claims the page", () => {
  const container = new FakeContainer(null);
  const registration = new FakeRegistration();
  const { last, counts } = watching(container, registration);
  const worker = new FakeWorker("aaa");
  registration.find(worker);
  assert.deepEqual(last(), { kind: "installing" });
  registration.install();
  assert.deepEqual(last(), { kind: "installing" });
  registration.activate();
  assert.deepEqual(last(), { kind: "installing" });
  container.changeTo(worker);
  assert.deepEqual(last(), { kind: "ready" });
  assert.equal(counts.reloads, 0);
});

test("a page loaded past an active worker is bypassed", () => {
  const registration = new FakeRegistration();
  registration.active = new FakeWorker("aaa", "activated");
  const { last } = watching(new FakeContainer(null), registration);
  assert.deepEqual(last(), { kind: "bypassed" });
});

test("an update downloads, then waits, named by its build", async () => {
  const { container, registration } = controlled("aaa");
  const { last } = watching(container, registration);
  registration.find(new FakeWorker("bbb"));
  assert.deepEqual(last(), { kind: "downloading" });
  registration.install();
  assert.deepEqual(last(), { kind: "waiting" });
  await answers();
  assert.deepEqual(last(), { kind: "waiting", build: "bbb" });
});

test("an update that finished installing before the page loaded is offered", async () => {
  const { container, registration } = controlled("aaa");
  registration.waiting = new FakeWorker("bbb", "installed");
  const { last } = watching(container, registration);
  await answers();
  assert.deepEqual(last(), { kind: "waiting", build: "bbb" });
});

test("a waiting update is offered over a newer one still downloading", async () => {
  const { container, registration } = controlled("aaa");
  registration.waiting = new FakeWorker("bbb", "installed");
  const { last } = watching(container, registration);
  registration.find(new FakeWorker("ccc"));
  await answers();
  assert.deepEqual(last(), { kind: "waiting", build: "bbb" });
});

test("a newer update replacing the waiting one is offered with its build", async () => {
  const { container, registration } = controlled("aaa");
  const older = new FakeWorker("bbb", "installed");
  registration.waiting = older;
  const { last } = watching(container, registration);
  registration.find(new FakeWorker("ccc"));
  registration.install();
  older.moveTo("redundant");
  await answers();
  assert.deepEqual(last(), { kind: "waiting", build: "ccc" });
});

test("each worker is asked for its build once", async () => {
  const { container, registration } = controlled("aaa");
  const { asked } = watching(container, registration);
  const update = new FakeWorker("bbb");
  registration.find(update);
  registration.install();
  await answers();
  update.dispatchEvent(new Event("statechange"));
  await answers();
  assert.deepEqual(
    asked.map((worker) => worker.build),
    ["aaa", "bbb"],
  );
});

test("applying asks the waiting worker to take over and says so", () => {
  const { container, registration } = controlled("aaa");
  const waiting = new FakeWorker("bbb", "installed");
  registration.waiting = waiting;
  const { watch, last } = watching(container, registration);
  watch.apply();
  assert.deepEqual(waiting.messages, [SKIP_WAITING]);
  assert.deepEqual(last(), { kind: "applying" });
});

test("applying goes to the worker waiting at the time", () => {
  const { container, registration } = controlled("aaa");
  const offered = new FakeWorker("bbb", "installed");
  registration.waiting = offered;
  const { watch } = watching(container, registration);
  const newer = new FakeWorker("ccc", "installed");
  registration.waiting = newer;
  watch.apply();
  assert.deepEqual(offered.messages, []);
  assert.deepEqual(newer.messages, [SKIP_WAITING]);
});

test("applying with no worker waiting does nothing", () => {
  const { container, registration } = controlled("aaa");
  const { watch, statuses } = watching(container, registration);
  watch.apply();
  assert.deepEqual(statuses, [{ kind: "ready" }]);
});

test("a controlled page reloads once when a new worker takes over", () => {
  const { container, registration } = controlled("aaa");
  const { counts } = watching(container, registration);
  container.changeTo(new FakeWorker("bbb", "activating"));
  assert.equal(counts.reloads, 1);
  container.changeTo(new FakeWorker("ccc", "activating"));
  assert.equal(counts.reloads, 1);
});

test("the first worker claiming a page does not reload it, a later one does", () => {
  const container = new FakeContainer(null);
  const { counts } = watching(container, new FakeRegistration());
  container.changeTo(new FakeWorker("aaa", "activating"));
  assert.equal(counts.reloads, 0);
  container.changeTo(new FakeWorker("bbb", "activating"));
  assert.equal(counts.reloads, 1);
});

/**
 * A clock to set by hand, and checks that count their calls and fail while
 * the network is down.
 */
function checking() {
  const clock = { now: 1000 };
  const network = { up: true };
  const counts = { checks: 0 };
  const checks = updateChecks(
    () => {
      counts.checks++;
      return network.up
        ? Promise.resolve()
        : Promise.reject(new Error("offline"));
    },
    () => clock.now,
    100,
  );
  return { clock, network, counts, checks };
}

/** Lets a check's result arrive. */
const settled = () => new Promise((resolve) => setImmediate(resolve));

test("no check is due within the interval of the registration's", () => {
  const { clock, counts, checks } = checking();
  checks.ifDue();
  clock.now += 99;
  checks.ifDue();
  assert.equal(counts.checks, 0);
});

test("a check is due once the interval has passed, then not again within it", () => {
  const { clock, counts, checks } = checking();
  clock.now += 100;
  checks.ifDue();
  checks.ifDue();
  clock.now += 99;
  checks.ifDue();
  assert.equal(counts.checks, 1);
  clock.now += 1;
  checks.ifDue();
  assert.equal(counts.checks, 2);
});

test("a failed check does not hold off the next", async () => {
  const { clock, network, counts, checks } = checking();
  network.up = false;
  clock.now += 100;
  checks.ifDue();
  await settled();
  checks.ifDue();
  assert.equal(counts.checks, 2);
});

test("a clock set back does not hold off checks", () => {
  const { clock, counts, checks } = checking();
  clock.now -= 500;
  checks.ifDue();
  assert.equal(counts.checks, 1);
});

test("a check at once is made within the interval, and says it went through", async () => {
  const { counts, checks } = checking();
  assert.equal(await checks.now(), true);
  assert.equal(await checks.now(), true);
  assert.equal(counts.checks, 2);
});

test("a check at once counts as the last check", async () => {
  const { clock, counts, checks } = checking();
  clock.now += 100;
  await checks.now();
  clock.now += 99;
  checks.ifDue();
  assert.equal(counts.checks, 1);
  clock.now += 1;
  checks.ifDue();
  assert.equal(counts.checks, 2);
});

test("a failed check at once says so, and does not hold off the next", async () => {
  const { counts, network, checks } = checking();
  network.up = false;
  assert.equal(await checks.now(), false);
  checks.ifDue();
  assert.equal(counts.checks, 2);
});

test("a check that fails after a later one started leaves the later one's time", async () => {
  const clock = { now: 1000 };
  const pending: (() => void)[] = [];
  let calls = 0;
  const checks = updateChecks(
    () => {
      calls++;
      return new Promise<void>((resolve, reject) => {
        pending.push(
          calls === 1 ? () => reject(new Error("timeout")) : resolve,
        );
      });
    },
    () => clock.now,
    100,
  );
  const first = checks.now();
  clock.now += 10;
  const second = checks.now();
  pending[1]!();
  pending[0]!();
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  clock.now += 50;
  checks.ifDue();
  assert.equal(calls, 2);
});
