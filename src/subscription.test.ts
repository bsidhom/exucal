import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { Subscription, type Source } from "./subscription.ts";

/** A host that records its controllers and how often an update was asked for. */
function fakeHost() {
  const controllers: ReactiveController[] = [];
  let updates = 0;
  const host = {
    addController: (controller: ReactiveController) =>
      controllers.push(controller),
    removeController() {},
    requestUpdate: () => {
      updates++;
    },
    updateComplete: Promise.resolve(true),
  } satisfies ReactiveControllerHost;
  return { host, controllers, updates: () => updates };
}

/** A source that remembers its listeners and counts the stops. */
function fakeSource<T>(initial: T) {
  const listeners = new Set<(value: T) => void>();
  let stopped = 0;
  const source: Source<T> = (listener) => {
    listeners.add(listener);
    listener(initial);
    return () => {
      listeners.delete(listener);
      stopped++;
    };
  };
  const emit = (value: T) => {
    for (const listener of listeners) listener(value);
  };
  return { source, emit, listeners, stopped: () => stopped };
}

test("subscribing registers the controller and waits for the host to connect", () => {
  const { host, controllers, updates } = fakeHost();
  const { source, listeners } = fakeSource("a");
  const subscription = new Subscription(host, source);
  assert.deepEqual(controllers, [subscription]);
  assert.equal(listeners.size, 0);
  assert.equal(updates(), 0);
});

test("on connect the value is set at once and each new value asks for an update", () => {
  const { host, updates } = fakeHost();
  const { source, emit } = fakeSource("a");
  const subscription = new Subscription(host, source);
  subscription.hostConnected();
  assert.equal(subscription.value, "a");
  assert.equal(updates(), 1);
  emit("b");
  assert.equal(subscription.value, "b");
  assert.equal(updates(), 2);
});

test("on disconnect the source is stopped and later values are not heard", () => {
  const { host, updates } = fakeHost();
  const { source, emit, listeners, stopped } = fakeSource("a");
  const subscription = new Subscription(host, source);
  subscription.hostConnected();
  subscription.hostDisconnected();
  assert.equal(stopped(), 1);
  assert.equal(listeners.size, 0);
  emit("b");
  assert.equal(subscription.value, "a");
  assert.equal(updates(), 1);
  // A second disconnect, as Lit never sends, stops nothing twice.
  subscription.hostDisconnected();
  assert.equal(stopped(), 1);
});

test("reconnecting subscribes again", () => {
  const { host } = fakeHost();
  const { source, emit, listeners } = fakeSource("a");
  const subscription = new Subscription(host, source);
  subscription.hostConnected();
  subscription.hostDisconnected();
  emit("b");
  subscription.hostConnected();
  assert.equal(listeners.size, 1);
  assert.equal(subscription.value, "a");
  emit("c");
  assert.equal(subscription.value, "c");
});
