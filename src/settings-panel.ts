import { LitElement, css, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { customElement, property, state } from "lit/decorators.js";
import { MODES, ceilingFor, type Mode } from "./core/context.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import { recommendLimits } from "./limits.ts";
import { buttonStyles, hintStyles } from "./styles.ts";
import {
  DEFAULT_MODES,
  DEFAULT_NOTATIONS,
  DEFAULT_SETTINGS,
  NOTATION_KINDS,
  isIntegerIn,
  isMode,
  isNotationKind,
  isRoundingMode,
  rangesOf,
  type NotationKind,
  type NumberSetting,
  type Settings,
  type Working,
  type Notation,
} from "./settings.ts";

/**
 * The settings panel under the converter: the digits a result is shown
 * with and, grouped with them in decimal mode, the working digits every
 * step but the last is computed with; the cap on the digits; the range
 * limit in bits; the rounding mode; the mode and, under it in exact
 * mode, the notation its exact values are written in
 * (docs/settings-modes.md, docs/working-digits.md); each with a line on
 * what it does in the mode in force. The settings come in as a property and every change the user
 * makes goes out as a `settings-change` event carrying the fields that
 * changed, the mode always as a whole variant; the shell owns the
 * settings, clamps what depends on the change and saves them, so this
 * panel knows nothing of storage.
 *
 * Each number input accepts an integer in the range the settings above it
 * allow (`rangesOf`: the digits up to the cap, the cap up to what the
 * range limit holds, the range limit between its floor and the hard
 * bound, the working digits from the digits up to the cap), and a value
 * outside that is not applied: the panel re-renders and the `live`
 * binding snaps the input back to the setting in force. The cap on the
 * digits is labeled "Precision limit": what it bounds is the effort
 * spent, through the ceiling of the retry schedule (`ceilingFor`), which
 * in decimal mode is the most hidden digits a step's rounding is
 * certified at, and its line shows that ceiling.
 *
 * The Mode select's options are the bare names, so that the select stays
 * narrow and the panel fits a phone (#147); the explanation is the line
 * under it, which follows the mode in force.
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
        min-width: 0;
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

      .group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .toggle > span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 400;
      }

      fieldset {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 0.875rem;
        font-weight: 600;
      }

      legend {
        padding: 0;
      }

      fieldset label {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        font-weight: 400;
      }

      input[type="checkbox"],
      input[type="radio"] {
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

  /** The last extended count of working digits seen, so that checking "extended" again offers it. */
  private lastExtended?: number;

  /** The last ratio width seen, so that choosing `ratio` again offers it. */
  private lastWidth?: number;

  willUpdate() {
    const { mode } = this.settings;
    if (mode.kind === "decimal" && mode.working.kind === "extended") {
      this.lastExtended = mode.working.digits;
    }
    if (mode.kind === "exact" && mode.notation.kind === "ratio") {
      this.lastWidth = mode.notation.width;
    }
  }

  render() {
    const { rounding, mode } = this.settings;
    return html`
      <details>
        <summary>Settings</summary>
        <div class="settings">
          <div class="group">
            ${this.renderNumber(DIGITS_FIELD)}
            ${mode.kind === "decimal" ? this.renderWorking(mode.working) : nothing}
          </div>
          ${LIMIT_FIELDS.map((field) => this.renderNumber(field))}
          ${this.renderSelect(
            "Rounding",
            ROUNDING_MODES,
            ROUNDING_LABELS,
            rounding,
            this.onSelectChange("rounding", isRoundingMode),
            ROUNDING_LINES[mode.kind],
          )}
          ${this.renderSelect(
            "Mode",
            MODES,
            MODE_LABELS,
            mode.kind,
            this.onModeChange,
            MODE_LINES[mode.kind],
          )}
          ${mode.kind === "exact" ? this.renderNotation(mode.notation) : nothing}
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

  /** A choice among `options`, each named by `labels`, with a line under it. */
  private renderSelect<T extends string>(
    label: string,
    options: readonly T[],
    labels: Record<T, string>,
    value: T,
    onChange: (event: Event) => void,
    hint: string,
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
        <small class="hint">${hint}</small>
      </label>
    `;
  }

  /** Exact mode's notation: a choice between its two values, each a radio button named for it, the ratio's width beside it while chosen. */
  private renderNotation(notation: Notation) {
    const { min, max } = rangesOf(this.settings).width;
    return html`
      <fieldset>
        <legend>Notation</legend>
        ${NOTATION_KINDS.map(
          (each) => html`
            <label>
              <input
                type="radio"
                name="notation"
                value=${each}
                .checked=${each === notation.kind}
                @change=${this.onNotationChange}
              />
              ${NOTATION_LABELS[each]}
              ${
                each === "ratio" && notation.kind === "ratio"
                  ? html`<input
                      type="number"
                      inputmode="numeric"
                      aria-label="Ratio width"
                      min=${min}
                      max=${max}
                      step="1"
                      .value=${live(String(notation.width))}
                      @change=${this.onWidthChange}
                    />`
                  : nothing
              }
            </label>
          `,
        )}
        <small class="hint">
          An exact value that is not a whole number is written as a ratio of two
          whole numbers in lowest terms when the two have at most the width in
          digits between them; a whole number is written entire when it fits the
          width; anything longer is a decimal at Digits. An inexact value is
          always a decimal.
        </small>
      </fieldset>
    `;
  }

  /** Decimal mode's working digits, under Digits: a checkbox named for the `extended` value, and the count while it is checked. */
  private renderWorking(working: Working) {
    const extended = working.kind === "extended";
    const { min, max } = rangesOf(this.settings).working;
    return html`
      <label class="toggle">
        Working digits
        <span>
          <input
            type="checkbox"
            .checked=${extended}
            @change=${this.onWorkingToggle}
          />
          extended
          ${
            working.kind === "extended"
              ? html`<input
                  type="number"
                  inputmode="numeric"
                  aria-label="Extended working digits"
                  min=${min}
                  max=${max}
                  step="1"
                  .value=${live(String(working.digits))}
                  @change=${this.onWorkingChange}
                />`
              : nothing
          }
        </span>
        <small class="hint">
          ${
            extended
              ? "The digits every step but the last is computed with; the answer is shown at Digits."
              : "Every step is computed with Digits. Extended working digits keep a step's rounding out of the answer, as a calculator's hidden digits do: at twelve, ln(exp(1/10)) is 0.1."
          }
        </small>
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

  /** A change of the mode: the chosen mode's variant at its defaults, since each variant carries its own settings. */
  private onModeChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if (isMode(value) && value !== this.settings.mode.kind) {
      this.emit({ mode: DEFAULT_MODES[value] });
    }
  }

  /** A choice of exact mode's notation: the exact variant with it, a ratio at the last width seen or the default. */
  private onNotationChange(event: Event) {
    const { value, checked } = event.target as HTMLInputElement;
    if (!checked || !isNotationKind(value)) return;
    const notation: Notation =
      value === "ratio" && this.lastWidth !== undefined
        ? { kind: "ratio", width: this.lastWidth }
        : DEFAULT_NOTATIONS[value];
    this.emit({ mode: { kind: "exact", notation } });
  }

  /** A change of the ratio's width: a value in its range is emitted, as for the number settings. */
  private onWidthChange(event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (isIntegerIn(value, rangesOf(this.settings).width)) {
      this.emit({
        mode: { kind: "exact", notation: { kind: "ratio", width: value } },
      });
    } else {
      this.requestUpdate();
    }
  }

  /**
   * Checking or unchecking "extended": the decimal variant with the
   * working digits extended, at the last extended count or at Digits, or
   * locked to Digits.
   */
  private onWorkingToggle(event: Event) {
    const { checked } = event.target as HTMLInputElement;
    this.emit({
      mode: {
        kind: "decimal",
        working: checked
          ? {
              kind: "extended",
              digits: this.lastExtended ?? this.settings.digits,
            }
          : { kind: "digits" },
      },
    });
  }

  /** A change of the extended count: a value in its range is emitted, as for the number settings. */
  private onWorkingChange(event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (isIntegerIn(value, rangesOf(this.settings).working)) {
      this.emit({
        mode: { kind: "decimal", working: { kind: "extended", digits: value } },
      });
    } else {
      this.requestUpdate();
    }
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

/** A number setting as the panel shows it: which, how it is labeled, and the line under it, which follows the mode in force. */
type NumberField = {
  readonly key: NumberSetting;
  readonly label: string;
  readonly hint: (settings: Settings) => string;
};

/** The digits, first in the panel, with decimal mode's working digits grouped under them. */
const DIGITS_FIELD: NumberField = {
  key: "digits",
  label: "Digits",
  hint: ({ mode }) => {
    if (mode.kind === "exact") return "Significant digits shown.";
    return mode.working.kind === "extended"
      ? "Significant digits of the answer; every step before the last is computed with the working digits."
      : "Significant digits shown, and of every value: every step is rounded to them, and a typed number with more is rounded to them on the way in.";
  },
};

/** The two limits, after the digits. */
const LIMIT_FIELDS: readonly NumberField[] = [
  {
    key: "maxDigits",
    label: "Precision limit",
    hint: ({ maxDigits, mode }) => {
      const ceiling = ceilingFor(maxDigits).toLocaleString("en-US");
      return mode.kind === "exact"
        ? `The most digits an answer may be asked for. To certify one, exact mode works at up to 4 × (this + 10) = ${ceiling} digits, so this bounds the effort spent.`
        : `The most digits an answer, or the working digits, may be asked for. A step's rounding is certified by computing it at up to 4 × (this + 10) = ${ceiling} hidden digits, so this bounds the effort spent.`;
    },
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

/** How each notation is named in the settings: by its value. */
const NOTATION_LABELS: Record<NotationKind, string> = {
  digits: "digits",
  ratio: "ratio",
};

/** What the rounding mode rounds, in each mode. */
const ROUNDING_LINES: Record<Mode, string> = {
  exact: "How the last digit shown is rounded.",
  decimal: "How every step is rounded, the last digit shown with it.",
};

/** How each mode is named in the settings: the bare name, the line under the select explaining it. */
const MODE_LABELS: Record<Mode, string> = {
  exact: "exact",
  decimal: "decimal",
};

/** What each mode does, under the select. */
const MODE_LINES: Record<Mode, string> = {
  exact:
    "Every digit shown is certain, found at rising precision; an exact value is written as its digits or as a ratio.",
  decimal:
    "Every step is rounded to Digits in the rounding mode, as a hand calculator does; every answer is exact in that arithmetic.",
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
