import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { MAX_DIGITS } from "./core/context.ts";
import { type Result } from "./core/result.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import { type UnitTable } from "./core/table.ts";
import {
  contextOf,
  isDigits,
  loadSettings,
  saveSettings,
  type Settings,
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
 *
 * The shell owns the settings too (settings.ts): the digits a result is
 * shown with and the rounding mode, read from `localStorage` when the shell
 * is created, edited in a panel under the converter, saved on every change,
 * and passed down to the converter as its context. The digits input
 * accepts an integer from 1 to `MAX_DIGITS`, and a value outside that is
 * not applied: the input snaps back to the setting in force.
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

    details {
      width: 100%;
      max-width: 32rem;
      text-align: start;
    }

    summary {
      cursor: pointer;
      font-weight: 600;
    }

    .settings {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding-top: 0.75rem;
    }

    .settings label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .settings input,
    .settings select {
      font: inherit;
      padding: 0.375rem 0.5rem;
      border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
    }

    .settings input {
      width: 6rem;
    }
  `;

  /** The system table once loaded, or why it could not be; unset until then. */
  @state() private table?: Result<UnitTable, SystemTableError>;

  /** The user's settings, from storage, saved on every change. */
  @state() private settings: Settings = loadSettings(localStorage);

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
        ${this.renderContent()} ${this.renderSettings()}
      </main>
    `;
  }

  /** The settings panel: the digits and the rounding mode, saved on change. */
  private renderSettings() {
    const { digits, rounding } = this.settings;
    return html`
      <details>
        <summary>Settings</summary>
        <div class="settings">
          <label>
            Digits
            <input
              type="number"
              inputmode="numeric"
              min="1"
              max=${MAX_DIGITS}
              step="1"
              .value=${String(digits)}
              @change=${this.onDigitsChange}
            />
          </label>
          <label>
            Rounding
            <select .value=${rounding} @change=${this.onRoundingChange}>
              ${ROUNDING_MODES.map(
                (mode) =>
                  html`<option value=${mode} ?selected=${mode === rounding}>
                    ${ROUNDING_LABELS[mode]}
                  </option>`,
              )}
            </select>
          </label>
        </div>
      </details>
    `;
  }

  private onDigitsChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.valueAsNumber;
    if (isDigits(digits)) {
      this.applySettings({ digits });
    } else {
      // Not a setting: snap the input back to the one in force.
      input.value = String(this.settings.digits);
    }
  }

  private onRoundingChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if ((ROUNDING_MODES as readonly string[]).includes(value)) {
      this.applySettings({ rounding: value as RoundingMode });
    }
  }

  /** Applies a change to the settings and saves them. */
  private applySettings(change: Partial<Settings>) {
    this.settings = { ...this.settings, ...change };
    saveSettings(localStorage, this.settings);
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
    return html`<unit-converter
      .table=${table.value}
      .context=${contextOf(this.settings)}
    ></unit-converter>`;
  }
}

/** How each rounding mode is named in the settings, in the modes' order. */
const ROUNDING_LABELS: Record<RoundingMode, string> = {
  halfEven: "to nearest, ties to even",
  halfAwayFromZero: "to nearest, ties away from zero",
  halfTowardZero: "to nearest, ties toward zero",
  towardZero: "toward zero",
  awayFromZero: "away from zero",
  ceiling: "up (toward +∞)",
  floor: "down (toward −∞)",
};

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
