import { LitElement, css, html, nothing } from "lit";
import { live } from "lit/directives/live.js";
import { customElement, property, query, state } from "lit/decorators.js";
import { MODES, type Mode } from "./core/context.ts";
import { ROUNDING_MODES, type RoundingMode } from "./core/rounding.ts";
import { recommendLimits, type Recommendation } from "./limits.ts";
import {
  BUDGET_LINE,
  MODE_LINES,
  NOTATION_LINE,
  PROBE_LINE,
  ROUNDING_LINES,
  SETTING_NAMES,
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
 * The settings sheet (docs/settings-surface.md, D30): a non-modal
 * `<dialog>` laid over the page, fixed to the viewport, the page live
 * and scrollable behind it, so that the result stays in view while a
 * setting is changed to see its effect. On a narrow viewport it is a
 * bottom sheet with two heights, three fifths of the screen or nearly
 * all of it, which the handle at its top edge drags or taps between;
 * on a wide one a side sheet along the right edge, the full height. Its
 * controls scroll inside it. It opens when the shell sets `open`, from
 * the cog (settings-button.ts), and closes from its Done button, from
 * Escape and from the cog again, telling the shell with a
 * `settings-close` event so that the shell's state and the dialog's
 * agree; focus moves onto the sheet when it opens and the shell puts it
 * back on the cog when it closes. The page's viewport meta asks the
 * on-screen keyboard to resize the layout, so that the sheet, sized in
 * `dvh`, rises with it and the input being typed in stays visible.
 *
 * The controls: The display digits a result is
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
 * A change applies on the control's `change` event, uniformly: a
 * select or a radio the moment it is picked, a number input when it is
 * committed, by Enter, by the keyboard's Done key (`enterkeyhint`, on
 * the decimal keypad, which on iOS has one where the numeric keypad
 * does not), by the sheet's Done button or by a tap away. The display
 * digits, the working digits and the ratio width, the numbers nudged
 * by a few, have steppers beside their inputs, each tap a change of
 * one through the same range check as a typed value. Applying a
 * number as it is typed waits for #118's scheduler (#186).
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
        display: contents;
        text-align: start;
      }

      dialog {
        /* A bottom sheet: fixed to the viewport's lower edge, the page live behind it. */
        position: fixed;
        inset: auto 0 0 0;
        box-sizing: border-box;
        width: 100%;
        max-width: none;
        height: 60dvh;
        max-height: none;
        margin: 0;
        padding: 0;
        border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        border-bottom: none;
        border-radius: 1rem 1rem 0 0;
        box-shadow: 0 -0.5rem 2rem
          color-mix(in srgb, currentColor 15%, transparent);
        color: inherit;
        font: inherit;
        z-index: 1;
      }

      dialog[open] {
        display: flex;
        flex-direction: column;
      }

      dialog.tall {
        height: calc(100dvh - 2rem);
      }

      @media (min-width: 60rem) {
        /* A side sheet: along the right edge, the full height, beside the column. */
        dialog,
        dialog.tall {
          inset: 0 0 0 auto;
          width: 24rem;
          height: 100dvh;
          border: none;
          border-left: 1px solid
            color-mix(in srgb, currentColor 20%, transparent);
          border-radius: 0;
          box-shadow: -0.5rem 0 2rem
            color-mix(in srgb, currentColor 15%, transparent);
        }

        .handle {
          display: none;
        }
      }

      header {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: none;
        padding: 0.25rem 1rem 0.5rem;
        border-bottom: 1px solid
          color-mix(in srgb, currentColor 15%, transparent);
      }

      .handle {
        /* The drag handle: a bar, with a thumb's hit area around it. */
        width: 100%;
        padding: 0.5rem 0;
        border: none;
        background: transparent;
        color: inherit;
        cursor: grab;
        line-height: 0;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
      }

      .handle::before {
        content: "";
        display: block;
        width: 2.5rem;
        height: 0.3rem;
        margin: 0 auto;
        border-radius: 0.15rem;
        background: color-mix(in srgb, currentColor 35%, transparent);
      }

      .bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0.75rem 1rem;
        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
      }

      .settings {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .stepper {
        /* A step of one, with a thumb's hit area. */
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding: 0;
        border-radius: 50%;
        line-height: 1;
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

  /** Whether the sheet is open: the shell's state, which the dialog follows. */
  @property({ type: Boolean }) open = false;

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

  /** Whether the bottom sheet is at its taller height; nothing on a wide viewport. */
  @state() private tall = false;

  @query("dialog") private dialog?: HTMLDialogElement;

  /** Where a drag of the handle started, while one is under way. */
  private dragStart?: number;

  /** Whether the press under way dragged the sheet, so that the click that ends it is not a tap. */
  private dragged = false;

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

  /** The dialog follows `open`: shown non-modally, so the page stays live, and focused on opening. */
  updated(changed: Map<PropertyKey, unknown>) {
    if (!changed.has("open") || this.dialog === undefined) return;
    if (this.open && !this.dialog.open) {
      this.dialog.show();
      this.dialog.focus();
    } else if (!this.open && this.dialog.open) {
      this.dialog.close();
    }
  }

  render() {
    const { rounding, mode } = this.settings;
    return html`
      <dialog
        class=${this.tall ? "tall" : ""}
        aria-labelledby="title"
        tabindex="-1"
        @keydown=${this.onKeydown}
        @close=${this.onClosed}
      >
        <header>
          <button
            type="button"
            class="handle"
            aria-label=${this.tall ? "Make the settings shorter" : "Make the settings taller"}
            @pointerdown=${this.onHandleDown}
            @pointermove=${this.onHandleMove}
            @pointerup=${this.onHandleUp}
            @pointercancel=${this.onHandleCancel}
            @click=${this.onHandleClick}
          ></button>
          <div class="bar">
            <h2 id="title">Settings</h2>
            <button type="button" @click=${this.onDone}>Done</button>
          </div>
        </header>
        <div class="body">
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
        </div>
      </dialog>
    `;
  }

  /** Done: the sheet closes; a number being typed is committed first, the button's press having taken the focus from it. */
  private onDone() {
    this.emitClose();
  }

  /** Escape closes the sheet, which a non-modal dialog does not do on its own. */
  private onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.emitClose();
    }
  }

  /** The dialog closed by other means than the shell: the shell is told, so that the two agree. */
  private onClosed() {
    if (this.open) this.emitClose();
  }

  private emitClose() {
    this.dispatchEvent(new CustomEvent("settings-close"));
  }

  private onHandleDown(event: PointerEvent) {
    this.dragStart = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  /** A drag past `DRAG_PX` up makes the sheet taller, down shorter, and ends the drag; a shorter press is a tap. */
  private onHandleMove(event: PointerEvent) {
    if (this.dragStart === undefined) return;
    const moved = this.dragStart - event.clientY;
    if (moved > DRAG_PX && !this.tall) {
      this.tall = true;
      this.dragged = true;
    } else if (moved < -DRAG_PX && this.tall) {
      this.tall = false;
      this.dragged = true;
    }
  }

  private onHandleUp() {
    this.dragStart = undefined;
  }

  private onHandleCancel() {
    this.dragStart = undefined;
    this.dragged = false;
  }

  /** A click that was not a drag, a tap or the keyboard's Enter or Space, toggles the height. */
  private onHandleClick() {
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    this.tall = !this.tall;
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
    step?: (value: number) => void,
  ) {
    const { min, max } = rangesOf(this.settings)[setting];
    const name = ariaLabel ?? SETTING_NAMES[setting as NumberSetting];
    const stepper = (delta: -1 | 1) =>
      step === undefined
        ? nothing
        : html`<button
            type="button"
            class="stepper"
            aria-label=${`${delta < 0 ? "One fewer" : "One more"}: ${name}`}
            @click=${() => this.stepBy(setting, value + delta, step)}
          >
            ${delta < 0 ? "−" : "+"}
          </button>`;
    return html`
      <span class="measure">
        ${stepper(-1)}
        <input
          type="number"
          inputmode="decimal"
          enterkeyhint="done"
          aria-label=${ariaLabel ?? nothing}
          min=${min}
          max=${max}
          step="1"
          .value=${live(String(value))}
          @change=${onChange}
        />
        ${stepper(1)} ${UNITS[setting]}
      </span>
    `;
  }

  /** A stepper's tap: `value` in the setting's range is emitted through `step`, and one past it is refused as a typed value is. */
  private stepBy(
    setting: RangedSetting,
    value: number,
    step: (value: number) => void,
  ) {
    const refusal = refusalOf(value, setting, this.settings);
    if (refusal === undefined) {
      step(value);
    } else {
      this.refused = { setting, refusal };
      this.requestUpdate();
    }
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

  /** A number setting's input with its unit, any notice on it, and its line under it; the display digits with steppers. */
  private renderNumber(field: NumberField) {
    return html`
      <label>
        ${field.label}
        ${this.renderInput(
          field.key,
          this.settings[field.key],
          this.onNumberChange(field.key),
          undefined,
          field.key === "displayDigits"
            ? (value) => this.emit({ displayDigits: value })
            : undefined,
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
                      (width) =>
                        this.emit({
                          mode: {
                            kind: "exact",
                            notation: { kind: "ratio", width },
                          },
                        }),
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
                  (digits) =>
                    this.emit({
                      mode: {
                        kind: "decimal",
                        working: { kind: "extended", digits },
                      },
                    }),
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

/** How far the handle is dragged before the sheet changes height, in pixels; less is a tap. */
const DRAG_PX = 24;

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
    /** The sheet closed itself (Done, Escape): the shell sets `open` false. */
    "settings-close": CustomEvent<void>;
  }
}
