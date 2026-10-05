import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  MIN_MAX_BITS,
  MODES,
  ceilingFor,
  maxDigitsFor,
  type Mode,
} from "./core/context.ts";
import type { Definition } from "./core/definitions.ts";
import { LIMIT_BITS } from "./core/rational.ts";
import type { Result } from "./core/result.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import {
  clampSettings,
  contextOf,
  isDigits,
  isMaxBits,
  isMode,
  isMaxDigits,
  loadSettings,
  saveSettings,
  type Settings,
} from "./settings.ts";
import { recommendLimits } from "./limits.ts";
import { onWorkerStatus } from "./register-service-worker.ts";
import { Subscription } from "./subscription.ts";
import { buildSystemTable } from "./system-build.ts";
import {
  loadSystemDefinitions,
  type SystemDefinitionsError,
} from "./system-table.ts";
import "./app-footer.ts";
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

    .settings .hint {
      max-width: 16rem;
      font-size: 0.75rem;
      font-weight: 400;
      opacity: 0.8;
    }

    .settings .toggle > span {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .settings input[type="checkbox"] {
      width: auto;
      padding: 0;
      margin: 0;
    }

    .settings > button {
      align-self: flex-end;
    }

    .settings > update-check {
      align-self: flex-end;
    }
  `;

  /** The system definitions once loaded, or why they could not be; unset until then. */
  @state() private definitions?: Result<
    readonly Definition[],
    SystemDefinitionsError
  >;

  /** The user's settings, from storage, saved on every change. */
  @state() private settings: Settings = loadSettings(localStorage);

  /** Whether the probe for the recommended limits is running. */
  @state() private recommending = false;

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
        ${this.renderContent()} ${this.renderSettings()}
      </main>
      <app-footer .status=${this.worker.value}></app-footer>
    `;
  }

  /**
   * The settings panel: the digits, the rounding mode, the mode, the two
   * limits and the fractions display, saved on change, each with a line on
   * what it does.
   * The cap on the digits is labeled "Precision limit": what it bounds is
   * the effort exact mode spends, through the ceiling of the retry
   * schedule (`ceilingFor`), and the line shows that ceiling.
   */
  private renderSettings() {
    const { digits, rounding, mode, maxDigits, maxBits, fractions } =
      this.settings;
    return html`
      <details>
        <summary>Settings</summary>
        <div class="settings">
          ${this.renderNumber(
            "Digits",
            digits,
            1,
            maxDigits,
            this.onDigitsChange,
            "Significant digits shown. In decimal mode, the precision of every step as well.",
          )}
          ${this.renderNumber(
            "Precision limit",
            maxDigits,
            1,
            maxDigitsFor(maxBits),
            this.onMaxDigitsChange,
            `The most digits an answer may be asked for. To certify one, exact mode works at up to 4 × (this + 10) = ${ceilingFor(maxDigits).toLocaleString("en-US")} digits, so this bounds the effort spent.`,
          )}
          ${this.renderNumber(
            "Most bits",
            maxBits,
            MIN_MAX_BITS,
            LIMIT_BITS,
            this.onMaxBitsChange,
            "The most bits in an exact value's numerator or denominator. A hard limit on time and memory.",
          )}
          <label>
            Rounding
            <select .value=${rounding} @change=${this.onRoundingChange}>
              ${ROUNDING_MODES.map(
                (each) =>
                  html`<option value=${each} ?selected=${each === rounding}>
                    ${ROUNDING_LABELS[each]}
                  </option>`,
              )}
            </select>
          </label>
          <label>
            Mode
            <select .value=${mode} @change=${this.onModeChange}>
              ${MODES.map(
                (each) =>
                  html`<option value=${each} ?selected=${each === mode}>
                    ${MODE_LABELS[each]}
                  </option>`,
              )}
            </select>
          </label>
          <label class="toggle">
            <span>
              <input
                type="checkbox"
                .checked=${fractions}
                @change=${this.onFractionsChange}
              />
              Show reduced fractions
            </span>
            <small class="hint">
              An exact value that is not a whole number is written as a fraction
              in lowest terms when both parts fit within Digits; inexact values
              stay decimal.
            </small>
          </label>
          <button
            type="button"
            ?disabled=${this.recommending}
            @click=${this.onRecommend}
          >
            ${this.recommending ? "Measuring…" : "Recommend limits"}
          </button>
          <update-check .status=${this.worker.value}></update-check>
        </div>
      </details>
    `;
  }

  /** A number input for a setting, accepting an integer in `[min, max]`, with a line saying what the setting does. */
  private renderNumber(
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (event: Event) => void,
    hint: string,
  ) {
    return html`
      <label>
        ${label}
        <input
          type="number"
          inputmode="numeric"
          min=${min}
          max=${max}
          step="1"
          .value=${String(value)}
          @change=${onChange}
        />
        <small class="hint">${hint}</small>
      </label>
    `;
  }

  private onDigitsChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.valueAsNumber;
    if (isDigits(digits, this.settings.maxDigits)) {
      this.applySettings({ digits });
    } else {
      // Not a setting: snap the input back to the one in force.
      input.value = String(this.settings.digits);
    }
  }

  private onMaxDigitsChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const maxDigits = input.valueAsNumber;
    if (isMaxDigits(maxDigits, this.settings.maxBits)) {
      this.applySettings({ maxDigits });
    } else {
      input.value = String(this.settings.maxDigits);
    }
  }

  private onMaxBitsChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const maxBits = input.valueAsNumber;
    if (isMaxBits(maxBits)) {
      this.applySettings({ maxBits });
    } else {
      input.value = String(this.settings.maxBits);
    }
  }

  private onRoundingChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if ((ROUNDING_MODES as readonly string[]).includes(value)) {
      this.applySettings({ rounding: value as RoundingMode });
    }
  }

  /**
   * Runs the probe and applies the limits it recommends. The probe is
   * synchronous and takes a fraction of a second, so the button is
   * disabled and the frame painted before it starts.
   */
  private async onRecommend() {
    this.recommending = true;
    await this.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const { maxBits, maxDigits } = recommendLimits();
      this.applySettings({ maxBits, maxDigits });
    } finally {
      this.recommending = false;
    }
  }

  private onModeChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if (isMode(value)) this.applySettings({ mode: value });
  }

  private onFractionsChange(event: Event) {
    const { checked } = event.target as HTMLInputElement;
    this.applySettings({ fractions: checked });
  }

  /** Applies a change to the settings, clamps what depends on it, and saves them. */
  private applySettings(change: Partial<Settings>) {
    this.settings = clampSettings({ ...this.settings, ...change });
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

/** How each mode is named in the settings, with what it means. */
const MODE_LABELS: Record<Mode, string> = {
  exact: "exact: every digit shown is certain, at rising precision",
  decimal: "decimal: every step rounded to the digits, in the rounding mode",
};

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
