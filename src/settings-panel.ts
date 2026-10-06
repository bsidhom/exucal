import { LitElement, css, html } from "lit";
import { live } from "lit/directives/live.js";
import { customElement, property, state } from "lit/decorators.js";
import { MODES, ceilingFor, type Mode } from "./core/context.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import { recommendLimits } from "./limits.ts";
import { buttonStyles, hintStyles } from "./styles.ts";
import {
  DEFAULT_MODES,
  DEFAULT_SETTINGS,
  isIntegerIn,
  isMode,
  isRoundingMode,
  rangesOf,
  type NumberSetting,
  type Settings,
} from "./settings.ts";

/**
 * The settings panel under the converter: the digits a result is shown
 * with, the cap on them, the range limit in bits, the rounding mode, the
 * exact or decimal mode and the fractions display, each with a line on
 * what it does. The settings come in as a property and every change the
 * user makes goes out as a `settings-change` event carrying the fields
 * that changed; the shell owns the settings, clamps what depends on the
 * change and saves them, so this panel knows nothing of storage.
 *
 * Each number input accepts an integer in the range the settings above it
 * allow (`rangesOf`: the digits up to the cap, the cap up to what the
 * range limit holds, the range limit between its floor and the hard
 * bound), and a value outside that is not applied: the panel re-renders
 * and the `live` binding snaps the input back to the setting in force.
 * The cap on the digits is labeled "Precision limit": what it bounds is
 * the effort exact mode spends, through the ceiling of the retry schedule
 * (`ceilingFor`), and its line shows that ceiling.
 *
 * A button beside them asks limits.ts to measure what this device does
 * within its latency budget and emits the two limits it recommends; it is
 * disabled while the probe runs, which blocks the main thread for a
 * fraction of a second, and the probe runs only when asked (the plan's
 * D16).
 */
@customElement("settings-panel")
export class SettingsPanel extends LitElement {
  static styles = [
    buttonStyles,
    hintStyles,
    css`
      :host {
        display: block;
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

      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 600;
      }

      input,
      select {
        font: inherit;
        padding: 0.375rem 0.5rem;
        border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
        border-radius: 0.5rem;
        background: transparent;
        color: inherit;
      }

      input {
        width: 6rem;
      }

      .toggle > span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      input[type="checkbox"] {
        width: auto;
        padding: 0;
        margin: 0;
      }

      .settings > button {
        align-self: flex-end;
      }
    `,
  ];

  /** The settings in force, from the shell. */
  @property({ attribute: false }) settings: Settings = DEFAULT_SETTINGS;

  /** Whether the probe for the recommended limits is running. */
  @state() private recommending = false;

  render() {
    const { rounding, mode } = this.settings;
    return html`
      <details>
        <summary>Settings</summary>
        <div class="settings">
          ${NUMBER_FIELDS.map((field) => this.renderNumber(field))}
          ${this.renderSelect(
            "Rounding",
            ROUNDING_MODES,
            ROUNDING_LABELS,
            rounding,
            this.onSelectChange("rounding", isRoundingMode),
          )}
          ${this.renderSelect(
            "Mode",
            MODES,
            MODE_LABELS,
            mode.kind,
            this.onModeChange,
          )}
          ${
            mode.kind === "exact"
              ? html`<label class="toggle">
                  <span>
                    <input
                      type="checkbox"
                      .checked=${mode.notation === "ratio"}
                      @change=${this.onNotationChange}
                    />
                    Show reduced fractions
                  </span>
                  <small class="hint">
                    An exact value that is not a whole number is written as a
                    fraction in lowest terms when both parts fit within Digits;
                    inexact values stay decimal.
                  </small>
                </label>`
              : null
          }
          <button
            type="button"
            ?disabled=${this.recommending}
            @click=${this.onRecommend}
          >
            ${this.recommending ? "Measuring…" : "Recommend limits"}
          </button>
        </div>
      </details>
    `;
  }

  /** A number setting's input, accepting an integer in its range, with its line under it. */
  private renderNumber(field: NumberField) {
    const { min, max } = rangesOf(this.settings)[field.key];
    return html`
      <label>
        ${field.label}
        <input
          type="number"
          inputmode="numeric"
          min=${min}
          max=${max}
          step="1"
          .value=${live(String(this.settings[field.key]))}
          @change=${this.onNumberChange(field.key)}
        />
        <small class="hint">${field.hint(this.settings)}</small>
      </label>
    `;
  }

  /** A choice among `options`, each named by `labels`. */
  private renderSelect<T extends string>(
    label: string,
    options: readonly T[],
    labels: Record<T, string>,
    value: T,
    onChange: (event: Event) => void,
  ) {
    return html`
      <label>
        ${label}
        <select .value=${value} @change=${onChange}>
          ${options.map(
            (each) =>
              html`<option value=${each} ?selected=${each === value}>
                ${labels[each]}
              </option>`,
          )}
        </select>
      </label>
    `;
  }

  /**
   * The handler for a number setting's input: a value in the setting's
   * range is emitted; any other is not a setting, and a re-render snaps the
   * input back to the one in force.
   */
  private onNumberChange(key: NumberSetting) {
    return (event: Event) => {
      const value = (event.target as HTMLInputElement).valueAsNumber;
      if (isIntegerIn(value, rangesOf(this.settings)[key])) {
        this.emit({ [key]: value });
      } else {
        this.requestUpdate();
      }
    };
  }

  /** The handler for a select: a value that `is` the setting's type is emitted. */
  private onSelectChange<K extends "rounding">(
    key: K,
    is: (value: unknown) => value is Settings[K],
  ) {
    return (event: Event) => {
      const { value } = event.target as HTMLSelectElement;
      if (is(value)) this.emit({ [key]: value });
    };
  }

  /** A change of the mode's kind: the chosen mode's variant at its defaults, since each variant carries its own settings. */
  private onModeChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if (isMode(value) && value !== this.settings.mode.kind) {
      this.emit({ mode: DEFAULT_MODES[value] });
    }
  }

  /** A change of exact mode's notation: the exact variant with it. */
  private onNotationChange(event: Event) {
    const { checked } = event.target as HTMLInputElement;
    this.emit({
      mode: { kind: "exact", notation: checked ? "ratio" : "digits" },
    });
  }

  /**
   * Runs the probe and emits the limits it recommends. The probe is
   * synchronous and takes a fraction of a second, so the button is
   * disabled and the frame painted before it starts.
   */
  private async onRecommend() {
    this.recommending = true;
    await afterPaint(this);
    try {
      const { maxBits, maxDigits } = recommendLimits();
      this.emit({ maxBits, maxDigits });
    } finally {
      this.recommending = false;
    }
  }

  /** Reports a change the user made, for the shell to apply. */
  private emit(change: Partial<Settings>) {
    this.dispatchEvent(new CustomEvent("settings-change", { detail: change }));
  }
}

/**
 * Resolves once `host`'s pending render has been painted, so that work
 * which blocks the main thread can be started after the frame that shows
 * it is under way.
 */
async function afterPaint(host: LitElement): Promise<void> {
  await host.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** A number setting as the panel shows it: which, how it is labeled, and the line under it. */
type NumberField = {
  readonly key: NumberSetting;
  readonly label: string;
  readonly hint: (settings: Settings) => string;
};

/** The three number settings, in the panel's order. */
const NUMBER_FIELDS: readonly NumberField[] = [
  {
    key: "digits",
    label: "Digits",
    hint: () =>
      "Significant digits shown. In decimal mode, the precision of every step as well.",
  },
  {
    key: "maxDigits",
    label: "Precision limit",
    hint: ({ maxDigits }) =>
      `The most digits an answer may be asked for. To certify one, exact mode works at up to 4 × (this + 10) = ${ceilingFor(maxDigits).toLocaleString("en-US")} digits, so this bounds the effort spent.`,
  },
  {
    key: "maxBits",
    label: "Most bits",
    hint: () =>
      "The most bits in an exact value's numerator or denominator. A hard limit on time and memory.",
  },
];

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
    "settings-panel": SettingsPanel;
  }

  interface HTMLElementEventMap {
    /** A change the user made in the panel: the fields that changed. */
    "settings-change": CustomEvent<Partial<Settings>>;
  }
}
