import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * A source of values a component can subscribe to: it calls the listener
 * with the current value at once and with each new one, and returns a
 * function that stops the calls. `onWorkerStatus` in
 * register-service-worker.ts has this shape.
 */
export type Source<T> = (listener: (value: T) => void) => () => void;

/**
 * Mirrors a source into a component for as long as the component is
 * connected: `value` is the latest the source gave, and the component
 * re-renders whenever it changes. A reactive controller, so that the
 * subscription follows the host's lifecycle without the host overriding
 * `connectedCallback` and `disconnectedCallback` itself.
 *
 * The source is subscribed on each connect and unsubscribed on each
 * disconnect, and is expected to call back synchronously on subscribe, so
 * `value` is set before the host's first render.
 */
export class Subscription<T> implements ReactiveController {
  /** The latest value from the source. */
  value!: T;

  private readonly host: ReactiveControllerHost;
  private readonly source: Source<T>;
  private stop?: () => void;

  constructor(host: ReactiveControllerHost, source: Source<T>) {
    this.host = host;
    this.source = source;
    host.addController(this);
  }

  hostConnected(): void {
    this.stop = this.source((value) => {
      this.value = value;
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.stop?.();
    this.stop = undefined;
  }
}
