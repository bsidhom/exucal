import { LitElement, css, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { customElement, property, state } from "lit/decorators.js";
import { MODES, type Mode } from "./core/context.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import { recommendLimits, type Recommendation } from "./limits.ts";
import {
  BUDGET_LINE,
  MODE_LINES,
  NOTATION_LINE,
  PROBE_LINE,
  ROUNDING_LINES,
  UNITS,
  clampLine,
  displayDigitsLine,
  precisionLimitLine,
  proposalLine,
  refusalLine,
  significandLimitLine,
  workingDigitsLine,
} from "./settings-lines.ts";
import { buttonStyles, hintStyles } from "./styles.ts";
import {
  DEFAULT_MODES,
  DEFAULT_NOTATIONS,
  DEFAULT_SETTINGS,
  NOTATION_KINDS,
  extendedWorkingOf,
  isMode,
  isNotationKind,
  isRoundingMode,
  rangesOf,
  ratioOf,
  refusalOf,
  type Clamp,
  type NotationKind,
  type NumberSetting,
  type RangedSetting,
  type Refusal,
  type Settings,
  type Working,
  type Notation,
} from "./settings.ts";

/**
 * The settings panel under the converter: The display digits a result is
 * shown with and, grouped with them in decimal mode, the working digits
 * every step but the last is computed with; the precision limit in
 * digits; the significand limit in bits; the rounding mode; the mode
 * and, under it in exact mode, the notation its exact values are written
 * in; and the probe with its budget in milliseconds
 * (docs/settings-modes.md, docs/working-digits.md,
 * docs/settings-limits.md); each with a line on what it does in the mode
 * in force (settings-lines.ts), and each number input with its unit after
 * it. The settings come in as a property and every change the user makes
 * goes out as a `settings-change` event carrying the fields that changed,
 * the mode always as a whole variant; the shell owns the settings, clamps
 * what depends on the change and saves them, so this panel knows nothing
 * of storage.
 *
 * Each number input accepts an integer in the range the settings above it
 * allow (`rangesOf`: The display digits up to the precision limit, the
 * precision limit up to what the significand limit holds, the significand
 * limit between its floor and the hard bound, the working digits from
 * the display digits up to the precision limit, the width and the budget
 * between their own bounds). A value outside that is refused: it is not
 * applied, the `live` binding snaps the input back to the setting in
 * force, and a line under the input names the bound and the setting
 * that sets it (`refusalOf`), until the next change. An accepted change
 * may move the settings below it in the chain; the shell hands the panel
 * what the clamp moved (`clamps`), and a line under each setting moved
 * says from what to what and to fit which setting, until the next change
 * (D29's clamp-and-tell).
 *
 * The Mode select's options are the bare names, so that the select stays
 * narrow and the panel fits a phone (#147); the explanation is the line
 * under it, which follows the mode in force.
 *
 * The probe: "Measure this device" asks limits.ts to time the costliest
 * operation on each axis within the budget a pass and shows what it
 * found as a proposal, the timings and the two limits, which "Apply"
 * emits as a change like any other, through the shell's clamp and its
 * telling; nothing changes before that. The button is disabled while the
 * probe runs, which blocks the main thread for a fraction of a second,
 * and the probe runs only when asked (the plan's D16).
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

      .measure {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-weight: 400;
      }

      .notice {
        max-width: 16rem;
        font-size: 0.75rem;
        font-weight: 400;
      }

      .probe {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex-basis: 100%;
      }

      .probe > div {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 1rem;
      }

      .proposal {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
        max-width: 24rem;
        font-size: 0.875rem;
        font-weight: 400;
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

      .probe button {
        align-self: flex-start;
      }
    `,
  ];

  /** The settings in force, from the shell. */
  @property({ attribute: false }) settings: Settings = DEFAULT_SETTINGS;

  /** What the shell's clamp moved on the last change, for the lines under the settings moved. */
  @property({ attribute: false }) clamps: readonly Clamp[] = [];

  /** The last edit refused, for the line under its input, until the next change. */
  @state() private refused?: {
    readonly setting: RangedSetting;
    readonly refusal: Refusal;
  };

  /** Whether the probe is running. */
  @state() private measuring = false;

  /** What the probe last proposed, until it is applied or the probe runs again. */
  @state() private proposal?: Recommendation;

  /** The last extended count of working digits seen, so that checking "extended" again offers it. */
  private lastExtended?: number;

  /** The last ratio width seen, so that choosing `ratio` again offers it. */
  private lastWidth?: number;

  willUpdate(changed: Map<PropertyKey, unknown>) {
    this.lastExtended = extendedWorkingOf(this.settings) ?? this.lastExtended;
    this.lastWidth = ratioOf(this.settings)?.width ?? this.lastWidth;
    // A change of the settings is the next change a refusal waits for.
    if (changed.has("settings")) this.refused = undefined;
  }

  render() {
    const { rounding, mode } = this.settings;
    return html`
      <details>
        <summary>Settings</summary>
        <div class="settings">
          <div class="group">
            ${this.renderNumber(DISPLAY_DIGITS_FIELD)}
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
          ${this.renderProbe()}
        </div>
      </details>
    `;
  }

  /**
   * A number input for `setting` at `value`, with its unit after it; its
   * bounds are the setting's range, and `onChange` takes the input's
   * value, which the handler validates against the same range.
   */
  private renderInput(
    setting: RangedSetting,
    value: number,
    onChange: (event: Event) => void,
    ariaLabel?: string,
  ) {
    const { min, max } = rangesOf(this.settings)[setting];
    return html`
      <span class="measure">
        <input
          type="number"
          inputmode="numeric"
          aria-label=${ariaLabel ?? nothing}
          min=${min}
          max=${max}
          step="1"
          .value=${live(String(value))}
          @change=${onChange}
        />
        ${UNITS[setting]}
      </span>
    `;
  }

  /** The line under `setting`'s input when its last edit was refused or the last change moved it; nothing otherwise. */
  private renderNotice(setting: RangedSetting) {
    const line = this.noticeFor(setting);
    return line === undefined
      ? nothing
      : html`<small class="notice" role="status">${line}</small>`;
  }

  /** The refusal of `setting`'s last edit, else what the last change's clamp did to it, as a line; `undefined` when neither. */
  private noticeFor(setting: RangedSetting): string | undefined {
    if (this.refused?.setting === setting) {
      return refusalLine(setting, this.refused.refusal);
    }
    const clamp = this.clamps.find((each) => each.setting === setting);
    return clamp === undefined ? undefined : clampLine(clamp);
  }

  /** A number setting's input with its unit, any notice on it, and its line under it. */
  private renderNumber(field: NumberField) {
    return html`
      <label>
        ${field.label}
        ${this.renderInput(
          field.key,
          this.settings[field.key],
          this.onNumberChange(field.key),
        )}
        ${this.renderNotice(field.key)}
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
                  ? this.renderInput(
                      "width",
                      notation.width,
                      this.onWidthChange,
                      "Ratio width",
                    )
                  : nothing
              }
            </label>
          `,
        )}
        ${this.renderNotice("width")}
        <small class="hint">${NOTATION_LINE}</small>
      </fieldset>
    `;
  }

  /** Decimal mode's working digits, under the display digits: a checkbox named for the `extended` value, and the count while it is checked. */
  private renderWorking(working: Working) {
    const extended = working.kind === "extended";
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
              ? this.renderInput(
                  "working",
                  working.digits,
                  this.onWorkingChange,
                  "Extended working digits",
                )
              : nothing
          }
        </span>
        ${this.renderNotice("working")}
        <small class="hint">${workingDigitsLine(extended)}</small>
      </label>
    `;
  }

  /**
   * The probe: its budget, the button that runs it, and what it last
   * proposed with "Apply" beside it.
   */
  private renderProbe() {
    const { budgetMs } = this.settings;
    return html`
      <div class="probe">
        <div>
          ${this.renderNumber(BUDGET_FIELD)}
          <label>
            Limits
            <button
              type="button"
              ?disabled=${this.measuring}
              @click=${this.onMeasure}
            >
              ${this.measuring ? "Measuring…" : "Measure this device"}
            </button>
            <small class="hint">${PROBE_LINE}</small>
          </label>
        </div>
        ${
          this.proposal === undefined
            ? nothing
            : html`
                <div class="proposal" role="status">
                  <span>${proposalLine(this.proposal, budgetMs)}</span>
                  <button type="button" @click=${this.onApply}>Apply</button>
                </div>
              `
        }
      </div>
    `;
  }

  /**
   * The handler for a number setting's input: a value in the setting's
   * range is emitted; any other is refused, with the reason kept for the
   * line under the input, and a re-render snaps the input back to the
   * setting in force.
   */
  private onNumberChange(key: NumberSetting) {
    return (event: Event) =>
      this.accept(key, event, (value) => this.emit({ [key]: value }));
  }

  /**
   * Validates the value of `setting`'s input: in range, `emit` is called
   * with it; out of range, the refusal is kept and the input re-rendered
   * to the setting in force.
   */
  private accept(
    setting: RangedSetting,
    event: Event,
    emit: (value: number) => void,
  ) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    const refusal = refusalOf(value, setting, this.settings);
    if (refusal === undefined) {
      emit(value);
    } else {
      this.refused = { setting, refusal };
      this.requestUpdate();
    }
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
    this.accept("width", event, (width) =>
      this.emit({
        mode: { kind: "exact", notation: { kind: "ratio", width } },
      }),
    );
  }

  /**
   * Checking or unchecking "extended": the decimal variant with the
   * working digits extended, at the last extended count or at the display digits, or
   * locked to the display digits.
   */
  private onWorkingToggle(event: Event) {
    const { checked } = event.target as HTMLInputElement;
    this.emit({
      mode: {
        kind: "decimal",
        working: checked
          ? {
              kind: "extended",
              digits: this.lastExtended ?? this.settings.displayDigits,
            }
          : { kind: "digits" },
      },
    });
  }

  /** A change of the extended count: a value in its range is emitted, as for the number settings. */
  private onWorkingChange(event: Event) {
    this.accept("working", event, (digits) =>
      this.emit({
        mode: { kind: "decimal", working: { kind: "extended", digits } },
      }),
    );
  }

  /**
   * Runs the probe within the budget in force and keeps what it
   * proposes. The probe is synchronous and takes a fraction of a second,
   * so the button is disabled and the frame painted before it starts.
   */
  private async onMeasure() {
    this.measuring = true;
    this.proposal = undefined;
    await afterPaint(this);
    try {
      this.proposal = recommendLimits(this.settings.budgetMs);
    } finally {
      this.measuring = false;
    }
  }

  /** Applies the proposal: the two limits, as a change like any other. */
  private onApply() {
    if (this.proposal === undefined) return;
    const { significandLimitBits, precisionLimitDigits } = this.proposal;
    this.proposal = undefined;
    this.emit({ significandLimitBits, precisionLimitDigits });
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

/** A number setting as the panel shows it: which, how it is labeled, and the line under it, which follows the settings in force. */
type NumberField = {
  readonly key: NumberSetting;
  readonly label: string;
  readonly hint: (settings: Settings) => string;
};

/** The display digits, first in the panel, with decimal mode's working digits grouped under them. */
const DISPLAY_DIGITS_FIELD: NumberField = {
  key: "displayDigits",
  label: "Display digits",
  hint: displayDigitsLine,
};

/** The two limits, after the digits. */
const LIMIT_FIELDS: readonly NumberField[] = [
  {
    key: "precisionLimitDigits",
    label: "Precision limit",
    hint: precisionLimitLine,
  },
  {
    key: "significandLimitBits",
    label: "Significand limit",
    hint: significandLimitLine,
  },
];

/** The probe's budget, beside its button. */
const BUDGET_FIELD: NumberField = {
  key: "budgetMs",
  label: "Probe budget",
  hint: () => BUDGET_LINE,
};

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

/** How each mode is named in the settings: the bare name, the line under the select explaining it. */
const MODE_LABELS: Record<Mode, string> = {
  exact: "exact",
  decimal: "decimal",
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
