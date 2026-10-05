import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { Definition } from "./core/definitions.ts";
import type { Result } from "./core/result.ts";
import {
  clampSettings,
  contextOf,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings.ts";
import { onWorkerStatus } from "./register-service-worker.ts";
import { buttonStyles } from "./styles.ts";
import { Subscription } from "./subscription.ts";
import { buildSystemTable } from "./system-build.ts";
import {
  loadSystemDefinitions,
  type SystemDefinitionsError,
} from "./system-table.ts";
import "./app-footer.ts";
import "./settings-panel.ts";
import "./update-check.ts";
import "./unit-converter.ts";

/**
 * The top-level shell of the app. Every page of the app renders inside it.
 *
 * The shell owns the system unit table: it starts loading the definitions
 * when it is connected, shows a loading message until they arrive, builds
 * the table from them at the ceiling of the retry schedule in force
 * (system-build.ts; the plan's D6) and hands it down to the converter as a
 * property. Nothing waits on the definitions before that: the components
 * are defined and the page renders while the fetch is in flight. The load
 * is one promise whose result is set on reactive state when it settles,
 * the plain Lit pattern for a single asynchronous value; `@lit/task` would
 * be the tool if the shell grew more of them. The build is synchronous and
 * memoized by the ceiling, so it runs in `render` and reruns only when a
 * change to the "most digits" setting moves the ceiling, which is the one
 * reason the table is ever rebuilt; the digits setting never rebuilds it.
 *
 * The shell owns the settings too (settings.ts): the digits a result is
 * shown with, the rounding mode, the exact or decimal mode (the plan's
 * 4.7, docs/decimal.md), and the two limits of the plan's D16, the cap on
 * the digits and the range limit in bits, read from `localStorage`
 * when the shell is created, edited in a panel under the converter, saved
 * on every change, and passed down to the converter as its context, whose
 * ceiling is derived from the cap. Each number input accepts an integer in
 * the range the settings above it allow (the digits up to the cap, the cap
 * up to what the range limit holds, the range limit between its floor and
 * the hard bound), and a value outside that is not applied: the input
 * snaps back to the setting in force. Lowering a limit lowers what depends
 * on it (`clampSettings`). A button beside them asks limits.ts to measure
 * what this device does within its latency budget and applies the two
 * limits it recommends; it is disabled while the probe runs, which blocks
 * the main thread for a fraction of a second, and the probe runs only when
 * asked (the plan's D16). Another checks for a new version of the app at
 * once, rather than when the page next comes back into view, and says what
 * it found.
 *
 * A footer under everything (app-footer.ts) names the build the page is
 * running and the service worker's status, which the shell subscribes to
 * (register-service-worker.ts) and passes down.
 */
@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = [
    buttonStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
        box-sizing: border-box;
        padding: env(safe-area-inset-top) env(safe-area-inset-right)
          env(safe-area-inset-bottom) env(safe-area-inset-left);
      }

      main {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        padding: 1.5rem 1rem;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.5rem, 5vw, 2.25rem);
        font-weight: 600;
      }

      p {
        margin: 0;
        max-width: 32rem;
      }

      .loading {
        opacity: 0.7;
      }

      .failure {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        color: #c92a2a;
      }
    `,
  ];

  /** The system definitions once loaded, or why they could not be; unset until then. */
  @state() private definitions?: Result<
    readonly Definition[],
    SystemDefinitionsError
  >;

  /** The user's settings, from storage, saved on every change. */
  @state() private settings: Settings = loadSettings(localStorage);

  /** The service worker's status, for the footer and the update check. */
  private readonly worker = new Subscription(this, onWorkerStatus);

  connectedCallback() {
    super.connectedCallback();
    // The load is memoized, so being connected again costs nothing.
    this.load();
  }

  /**
   * Asks for the definitions and shows the loading message until they
   * arrive. A failed load is not memoized, so calling this again after a
   * failure is a retry: the user, who may know that the network was down a
   * moment ago, decides when, rather than the app retrying on its own.
   */
  private load() {
    this.definitions = undefined;
    void loadSystemDefinitions().then((definitions) => {
      if (!definitions.ok) {
        console.error(
          "The unit definitions failed to load:",
          definitions.error,
        );
      }
      this.definitions = definitions;
    });
  }

  render() {
    return html`
      <main>
        <h1>Units</h1>
        ${this.renderContent()}
        <settings-panel
          .settings=${this.settings}
          @settings-change=${this.onSettingsChange}
        >
          <update-check .status=${this.worker.value}></update-check>
        </settings-panel>
      </main>
      <app-footer .status=${this.worker.value}></app-footer>
    `;
  }

  /**
   * Applies a change the user made in the panel: the one place a settings
   * change becomes state and an effect. What depends on the change is
   * clamped (`clampSettings`) and the settings are saved.
   */
  private onSettingsChange(event: CustomEvent<Partial<Settings>>) {
    this.settings = clampSettings({ ...this.settings, ...event.detail });
    saveSettings(localStorage, this.settings);
  }

  /**
   * The converter over the table built from the definitions at the ceiling
   * in force, or the loading message or the failure. The build is memoized
   * by the ceiling, so rendering with unchanged limits costs one comparison.
   */
  private renderContent() {
    const { definitions } = this;
    if (definitions === undefined) {
      return html`<p class="loading" aria-live="polite">Loading units…</p>`;
    }
    const context = contextOf(this.settings);
    const table = definitions.ok
      ? buildSystemTable(definitions.value, context)
      : definitions;
    if (!table.ok) {
      return html`<div class="failure" role="alert">
        <p>
          The unit definitions could not be loaded (${table.error.kind}).
          ${
            table.error.kind === "fetchFailed"
              ? "Check your connection and try again."
              : "This is a bug in the app, not in what you typed."
          }
        </p>
        <button type="button" @click=${this.load}>Retry</button>
      </div>`;
    }
    return html`<unit-converter
      .table=${table.value}
      .context=${context}
      .fractions=${this.settings.fractions}
    ></unit-converter>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
