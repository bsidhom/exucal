import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { type Result } from "./core/result.ts";
import { type UnitTable } from "./core/table.ts";
import {
  loadSettings,
  saveSettings,
  type Settings,
  type SettingsStore,
} from "./settings.ts";
import { loadSystemTable, type SystemTableError } from "./system-table.ts";
import "./unit-converter.ts";

/**
 * The top-level shell of the app. Every page of the app renders inside it.
 *
 * The shell owns the system unit table: it starts loading it when it is
 * connected, shows a loading message until it arrives, and then hands it
 * down to the converter as a property. Nothing waits on the table before
 * that: the components are defined and the page renders while the fetch is
 * in flight. The load is one promise whose result is set on reactive state
 * when it settles, the plain Lit pattern for a single asynchronous value;
 * `@lit/task` would be the tool if the shell grew more of them.
 */
@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = css`
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

    button {
      font: inherit;
      padding: 0.5rem 1rem;
      border: 1px solid currentColor;
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .settings {
      width: 100%;
      max-width: 32rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .settings label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .settings input {
      margin: 0;
      width: 1rem;
      height: 1rem;
      accent-color: #3b5bdb;
    }
  `;

  /** The system table once loaded, or why it could not be; unset until then. */
  @state() private table?: Result<UnitTable, SystemTableError>;

  /** The current settings, read from storage once and saved on each change. */
  @state() private settings: Settings = loadSettings(settingsStore());

  connectedCallback() {
    super.connectedCallback();
    // The load is memoized, so being connected again costs nothing.
    this.load();
  }

  /**
   * Asks for the table and shows the loading message until it arrives. A
   * failed load is not memoized, so calling this again after a failure is
   * a retry: the user, who may know that the network was down a moment
   * ago, decides when, rather than the app retrying on its own.
   */
  private load() {
    this.table = undefined;
    void loadSystemTable().then((table) => {
      if (!table.ok) {
        console.error("The unit definitions failed to load:", table.error);
      }
      this.table = table;
    });
  }

  render() {
    return html`
      <main>
        <h1>Units</h1>
        ${this.renderContent()}
      </main>
    `;
  }

  private renderContent() {
    const { table } = this;
    if (table === undefined) {
      return html`<p class="loading" aria-live="polite">Loading units…</p>`;
    }
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
    return html`
      <unit-converter
        .table=${table.value}
        .reciprocal=${this.settings.reciprocal}
      ></unit-converter>
      <div class="settings">
        <label>
          <input
            type="checkbox"
            .checked=${this.settings.reciprocal}
            @change=${this.onReciprocalChange}
          />
          Show the reciprocal too
        </label>
      </div>
    `;
  }

  private onReciprocalChange(event: Event) {
    const reciprocal = (event.target as HTMLInputElement).checked;
    this.settings = { ...this.settings, reciprocal };
    saveSettings(settingsStore(), this.settings);
  }
}

/**
 * The browser's local storage as a settings store, or none when the page
 * has no access to it: reading `localStorage` itself throws in a browser
 * that denies storage (a sandboxed frame, some privacy settings), and the
 * settings then hold for the visit only.
 */
function settingsStore(): SettingsStore | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
