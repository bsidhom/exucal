import type { RatioDisplay } from "./core/display.ts";
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  DEFAULT_CEILING,
  DEFAULT_DIGITS,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  type NumberContext,
} from "./core/context.ts";
import type { Side } from "./core/pipeline.ts";
import type { UnitTable } from "./core/table.ts";
import { print, text, type Piece } from "./core/print.ts";
import {
  UNCERTIFIED,
  copyText,
  outcomeOf,
  resultPieces,
  type Line,
  type Outcome,
} from "./outcome.ts";
import "./copy-button.ts";

/**
 * The converter: two text inputs, "you have" and "you want", and an output
 * area that shows the conversion of the one into the other, or why there is
 * none. Its only state is the two strings; every keystroke runs the core's
 * pipeline over them again, which is cheap, and renders the outcome, which
 * outcome.ts computes: the lines of a result (a definition for a blank
 * `want`, a conversion with its reciprocal, a unit list's sum or a
 * function's call), with `=` or `≈` and the notes, and the warnings of a
 * value that assumes a condition it could not decide, styled apart from
 * the notes so that neither is read as the other; or the error, marked on
 * the input at fault. The `table` to convert against is a property, built
 * by the host.
 *
 * The `context` property is the user's settings as the pipeline takes them
 * (the digits asked for, the rounding mode, the range limit and the
 * ceiling of the retry schedule, which the shell derives from the cap on
 * the digits; `<app-shell>` owns the settings and passes it down). It
 * defaults to the display's rules before the settings existed, eight
 * digits half even, under the default cap's ceiling. The `ratio`
 * property is the ratio notation's settings (docs/fractions.md,
 * docs/ratio-width.md), its width the most digits an exact value may
 * have to be written entire, as a whole number or a ratio; absent, the
 * digits notation, by default.
 */
@customElement("unit-converter")
export class UnitConverter extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 32rem;
      text-align: start;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    input {
      font: inherit;
      font-size: 1.25rem;
      font-weight: 400;
      padding: 0.5rem 0.75rem;
      border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      min-width: 0;
    }

    input:focus-visible {
      outline: 2px solid #3b5bdb;
      outline-offset: -1px;
    }

    input[aria-invalid="true"] {
      border-color: var(--color-error);
    }

    output {
      display: block;
      min-height: 3rem;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }

    .value {
      font-weight: 600;
      font-size: 1.5rem;
    }

    .hint {
      opacity: 0.7;
    }

    .uncertified {
      position: relative;
    }

    .uncertified::after {
      content: "•";
      position: absolute;
      left: 50%;
      top: -0.6em;
      transform: translateX(-50%);
      font-size: 0.6em;
      line-height: 1;
    }

    .note {
      opacity: 0.7;
      font-size: 0.875rem;
    }

    .error {
      color: var(--color-error);
    }

    .warning {
      color: var(--color-warning);
      font-size: 0.875rem;
    }

    .warning::before {
      content: "⚠ ";
    }

    /*
     * A result is its expression, wrapping within its own box, and the
     * button that copies it, in a column of its own at the right so that
     * it sits in the same place however long the digits run.
     */
    .line {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .expression {
      flex: 1;
      min-width: 0;
    }

    copy-button {
      flex: none;
      margin-top: 0.5rem;
    }
  `;

  /** The units to convert with. Not an attribute: a table is not a string. */
  @property({ attribute: false }) table?: UnitTable;

  /** The user's context: the digits to show, in which rounding mode, within which limits. */
  @property({ attribute: false }) context: NumberContext = {
    precision: DEFAULT_DIGITS,
    rounding: DEFAULT_ROUNDING,
    maxBits: DEFAULT_MAX_BITS,
    ceiling: DEFAULT_CEILING,
  };

  /** The ratio notation's settings, or absent for the digits notation (docs/ratio-width.md). */
  @property({ attribute: false }) ratio?: RatioDisplay;

  @state() private have = "";
  @state() private want = "";

  render() {
    const outcome = this.outcome();
    const invalid = (side: Side) =>
      outcome.kind === "error" && outcome.side === side;
    return html`
      ${renderInput("You have", "next", invalid("have"), this.have, this.onHaveInput)}
      ${renderInput("You want", "done", invalid("want"), this.want, this.onWantInput)}
      <output aria-live="polite">${renderOutcome(outcome)}</output>
    `;
  }

  private onHaveInput(event: Event) {
    this.have = (event.target as HTMLInputElement).value;
  }

  private onWantInput(event: Event) {
    this.want = (event.target as HTMLInputElement).value;
  }
  /** Runs the pipeline over the current texts, at the context given. */
  private outcome(): Outcome {
    const { table, context } = this;
    if (table === undefined) {
      return { kind: "error", message: "No units are loaded." };
    }
    return outcomeOf(table, this.have, this.want, {
      context,
      ratio: this.ratio,
    });
  }
}

/**
 * One of the two text fields, labelled `label`. Both fields are rendered
 * here so that they cannot differ in what they turn off. Units and
 * expressions are neither words nor sentences, so every assistant the
 * browser or an extension offers a text field is in the way:
 *
 * - `autocomplete="off"` keeps the browser from suggesting earlier entries
 *   and, per the HTML spec, from restoring the field's value when the page
 *   is reloaded or revisited (Firefox restores other fields). The fields
 *   also have no `name` and sit in no `<form>`, so nothing is ever submitted
 *   or saved to the browser's form history in the first place.
 * - `autocorrect`, `autocapitalize` and `spellcheck` are the on-screen
 *   keyboard and spell-checker: `Ft` is not a unit, and `km` is not a typo.
 * - `data-gramm`, `data-1p-ignore` and `data-lpignore` are what Grammarly
 *   and the 1Password and LastPass extensions look for to leave a field
 *   alone; there is no standard attribute for that.
 */
function renderInput(
  label: string,
  enterKeyHint: "next" | "done",
  invalid: boolean,
  value: string,
  onInput: (event: Event) => void,
): TemplateResult {
  return html`
    <label>
      ${label}
      <input
        type="text"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint=${enterKeyHint}
        data-gramm="false"
        data-1p-ignore
        data-lpignore="true"
        aria-invalid=${invalid ? "true" : nothing}
        .value=${value}
        @input=${onInput}
      />
    </label>
  `;
}

function renderOutcome(outcome: Outcome): TemplateResult {
  switch (outcome.kind) {
    case "empty":
      return html`<span class="hint">
        Type a quantity, such as <code>3 ft</code>, and the unit to convert it
        to, such as <code>in</code> or <code>ft;in</code>.
      </span>`;
    case "result":
      return html`${outcome.lines.map(renderLine)}${(
        outcome.warnings ?? []
      ).map(
        (warning) => html`<div class="warning" role="note">${warning}</div>`,
      )}`;
    case "error":
      return html`<span class="error">${outcome.message}</span>`;
  }
}

/**
 * One line of a result, on a line of its own: the have as the printer
 * writes it, the relation, the result as pieces with its numbers styled,
 * the note, when there is one, after them, and the button that copies
 * the result as `copyText` writes it.
 */
function renderLine(line: Line): TemplateResult {
  const note =
    line.note === undefined
      ? nothing
      : html` <span class="note">(${line.note})</span>`;
  return html`<div class="line">
    <span class="expression">
      <span>${text(print(line.have, "×"))}</span> ${renderRelation(line)}
      ${resultPieces(line).map(renderPiece)}${note}
    </span>
    <copy-button .text=${copyText(line)}></copy-button>
  </div>`;
}

/**
 * The relation of `line`: its text, except the uncertified sign of decimal
 * mode (D26), which is drawn as `≈` with a dot above it by the component
 * rather than by the font's placement of a combining mark, and named for
 * assistive technology.
 */
function renderRelation(line: Line): TemplateResult | string {
  return line.relation === UNCERTIFIED
    ? html`<span
        class="uncertified"
        role="img"
        aria-label="approximately, uncertified"
        >≈</span
      >`
    : line.relation;
}

/** One piece of a result: a number in the value's style, anything else as it is. */
function renderPiece(piece: Piece): TemplateResult | string {
  return piece.kind === "number"
    ? html`<span class="value">${piece.text}</span>`
    : piece.text;
}

declare global {
  interface HTMLElementTagNameMap {
    "unit-converter": UnitConverter;
  }
}
