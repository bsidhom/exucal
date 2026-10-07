import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { BUILD_ID } from "./build-id.ts";
import type { Definition } from "./core/definitions.ts";
import type { Result } from "./core/result.ts";
import {
  clampSettings,
  clampsOf,
  contextOf,
  ratioOf,
  loadSettings,
  saveSettings,
  type Clamp,
  type Settings,
} from "./settings.ts";
import { onWorkerStatus } from "./register-service-worker.ts";
import { buttonStyles } from "./styles.ts";
import { Subscription } from "./subscription.ts";
import { tableOf } from "./system-build.ts";
import {
  loadSystemDefinitions,
  type SystemDefinitionsError,
} from "./system-table.ts";
import "./app-footer.ts";
import "./settings-button.ts";
import "./settings-panel.ts";
import "./unit-converter.ts";
import type { SettingsButton } from "./settings-button.ts";

/**
 * The top-level shell of the app: the composition root. Every page of the
 * app renders inside it, and it holds the three pieces of state the parts
 * share, each with one source, and wires the parts together; everything
 * else is derived in `render`.
 *
 * - The system definitions (system-table.ts): the shell starts loading
 *   them when it is connected, shows a loading message until they arrive
 *   and builds the unit table from them at the ceiling of the retry
 *   schedule in force (system-build.ts; the plan's D6), which it hands to
 *   the converter as a property. Nothing waits on the definitions before
 *   that: the components are defined and the page renders while the fetch
 *   is in flight. The load is one promise whose result is set on reactive
 *   state when it settles, the plain Lit pattern for a single asynchronous
 *   value. The build is synchronous and memoized by the ceiling, so it runs
 *   in `render` and reruns only when a change to the precision limit
 *   moves the ceiling, which is the one reason the table is ever
 *   rebuilt; the display digits never rebuild it.
 * - The settings (settings.ts): read from `localStorage` when the shell is
 *   created, passed to the settings panel (settings-panel.ts) as a
 *   property and to the converter as its context, whose ceiling is derived
 *   from the precision limit. The panel reports each change the user
 *   makes as a `settings-change` event, and the shell applies it: it
 *   clamps what depends on the change, so lowering a limit lowers what
 *   depends on it (`clampSettings`), hands the panel what the clamp
 *   moved so that the panel can say so (`clampsOf`), and saves the
 *   settings. That handler is the one place a settings change becomes
 *   state and an effect. Whether the sheet is open is the shell's state
 *   too (docs/settings-surface.md, D30): the cog in the header's corner
 *   (settings-button.ts) flips it, the sheet follows it and reports
 *   closing itself with `settings-close`, and the shell puts focus back
 *   on the cog when the sheet closes. The sheet is fixed to the viewport
 *   and lies over the page, so it is rendered outside `<main>`'s flow.
 * - The service worker's status (register-service-worker.ts), mirrored
 *   into the shell by a `Subscription` for as long as it is connected and
 *   passed to the footer (app-footer.ts), which shows it beside the build
 *   the page is running.
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

      @media (min-width: 60rem) {
        /* The side sheet's width kept clear beside the column while it is open. */
        main.sheet {
          padding-right: 25rem;
        }
      }

      header {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.5rem, 5vw, 2.25rem);
        font-weight: 600;
      }

      settings-button {
        /* The corner: the glyph's edge a gutter from the page's, the hit area past it. */
        position: absolute;
        right: -0.625rem;
        top: 50%;
        transform: translateY(-50%);
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
        color: var(--color-error);
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

  /** What the clamp moved on the last change, for the panel to tell. */
  @state() private clamps: readonly Clamp[] = [];

  /** Whether the settings sheet is open. */
  @state() private settingsOpen = false;

  @query("settings-button") private cog?: SettingsButton;

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
      <main class=${this.settingsOpen ? "sheet" : ""}>
        <header>
          <h1>Units</h1>
          <settings-button
            .expanded=${this.settingsOpen}
            @click=${this.onToggleSettings}
          ></settings-button>
        </header>
        ${this.renderContent()}
      </main>
      <app-footer .status=${this.worker.value}></app-footer>
      <settings-panel
        .open=${this.settingsOpen}
        .settings=${this.settings}
        .clamps=${this.clamps}
        @settings-change=${this.onSettingsChange}
        @settings-close=${this.onSettingsClose}
      ></settings-panel>
    `;
  }

  /** The cog: opens the sheet, or closes it when it is open, keeping focus on itself. */
  private onToggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    if (!this.settingsOpen) this.cog?.focus();
  }

  /** The sheet closed itself: the state follows, and focus returns to the cog. */
  private onSettingsClose() {
    this.settingsOpen = false;
    this.cog?.focus();
  }

  /**
   * Applies a change the user made in the panel: the one place a settings
   * change becomes state and an effect. What depends on the change is
   * clamped (`clampSettings`), what the clamp moved is handed back to the
   * panel to tell (`clampsOf`), and the settings are saved.
   */
  private onSettingsChange(event: CustomEvent<Partial<Settings>>) {
    const changed = { ...this.settings, ...event.detail };
    this.clamps = clampsOf(changed);
    this.settings = clampSettings(changed);
    saveSettings(localStorage, this.settings, BUILD_ID);
  }

  /**
   * The converter over the table built from the definitions at the ceiling
   * in force, or the loading message or the failure (`tableOf`). The build
   * is memoized by the ceiling, so rendering with unchanged limits costs
   * one comparison.
   */
  private renderContent() {
    const context = contextOf(this.settings);
    const table = tableOf(this.definitions, context);
    switch (table.kind) {
      case "loading":
        return html`<p class="loading" aria-live="polite">Loading units…</p>`;
      case "failed":
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
      case "ready":
        return html`<unit-converter
          .table=${table.table}
          .context=${context}
          .ratio=${ratioOf(this.settings)}
        ></unit-converter>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
