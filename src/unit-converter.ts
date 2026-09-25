import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { formatDimension, isDimensionless } from "./core/dimension.ts";
import { parseExpr } from "./core/expr.ts";
import { convertText, evaluateText, type Side } from "./core/pipeline.ts";
import {
  DEFAULT_PRECISION,
  equals,
  format,
  round,
  type Rational,
} from "./core/rational.ts";
import { type UnitTable } from "./core/table.ts";
import { describeConversionError, describeTextError } from "./messages.ts";

/**
 * The significant digits a result is shown with. The core computes at
 * `DEFAULT_PRECISION` and rounds once, here, to this; ARCHITECTURE.md
 * ("Precision and rounding") says why the two are kept apart.
 */
export const DISPLAY_PRECISION = 8;

/** What the output area shows for the current pair of texts. */
type Outcome =
  /** Nothing to convert yet. */
  | { readonly kind: "empty" }
  /** `have` is `relation` `value` `unit`: `3 ft = 36 in`, `1 m ≈ 39.370079 in`. */
  | {
      readonly kind: "result";
      readonly have: string;
      readonly relation: "=" | "≈";
      readonly value: string;
      readonly unit: string;
    }
  /** `message` says what is wrong, with the text on `side` if it is one text's fault. */
  | { readonly kind: "error"; readonly side?: Side; readonly message: string };

/**
 * The converter: two text inputs, "you have" and "you want", and an output
 * area that shows the conversion of the one into the other, or why there is
 * none. Its only state is the two strings; every keystroke runs the core's
 * pipeline over them again, which is cheap, and renders the outcome. The
 * `table` to convert against is a property, built by the host.
 *
 * With `want` blank, the output is what `have` is in the table's primitives
 * (`in = 0.0254 m`), the answer GNU units gives to the same question.
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
      border-color: #c92a2a;
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

    .error {
      color: #c92a2a;
    }

    @media (prefers-color-scheme: dark) {
      .error {
        color: #ff8787;
      }
    }
  `;

  /** The units to convert with. Not an attribute: a table is not a string. */
  @property({ attribute: false }) table?: UnitTable;

  @state() private have = "";
  @state() private want = "";

  render() {
    const outcome = this.outcome();
    const invalid = (side: Side) =>
      outcome.kind === "error" && outcome.side === side;
    return html`
      ${renderInput("You have", "3 ft", "next", invalid("have"), this.have, this.onHaveInput)}
      ${renderInput("You want", "in", "done", invalid("want"), this.want, this.onWantInput)}
      <output aria-live="polite">${renderOutcome(outcome)}</output>
    `;
  }

  private onHaveInput(event: Event) {
    this.have = (event.target as HTMLInputElement).value;
  }

  private onWantInput(event: Event) {
    this.want = (event.target as HTMLInputElement).value;
  }

  /** Runs the pipeline over the current texts. */
  private outcome(): Outcome {
    const { table } = this;
    if (table === undefined) {
      return { kind: "error", message: "No units are loaded." };
    }
    const have = this.have.trim();
    const want = this.want.trim();
    if (have === "") return { kind: "empty" };
    if (want === "") {
      // What `have` is in the primitives: the unit's definition, in effect.
      const quantity = evaluateText(table, this.have, DEFAULT_PRECISION);
      if (!quantity.ok) {
        return {
          kind: "error",
          side: "have",
          message: describeTextError(
            quantity.error,
            this.have,
            table.primitives,
          ),
        };
      }
      const { magnitude, dimension } = quantity.value;
      return result(
        have,
        magnitude,
        isDimensionless(dimension)
          ? ""
          : formatDimension(dimension, table.primitives),
      );
    }
    const conversion = convertText(
      table,
      this.have,
      this.want,
      DEFAULT_PRECISION,
    );
    if (!conversion.ok) {
      const { error } = conversion;
      return {
        kind: "error",
        side: error.kind === "inputError" ? error.side : undefined,
        message: describeConversionError(
          error,
          this.have,
          this.want,
          table.primitives,
        ),
      };
    }
    return result(have, conversion.value.value, wantText(want));
  }
}

/**
 * The `want` as the output writes it after the value, so that the whole
 * line reads as the expression it means. `1 mi` in `1000 ft` is
 * `5.28 × 1000 ft`; without the sign, the number would read as one product
 * with the want. A want that is a sum or difference is parenthesized,
 * `3.0284676 (ft + in)`, since `3.0284676 ft + in` would read as
 * `(3.0284676 ft) + in`. A want that starts with a unit name needs neither:
 * `36 in`. The text is trimmed, and it parsed a moment ago.
 */
function wantText(want: string): string {
  const expr = parseExpr(want);
  const isSum =
    expr.ok &&
    expr.value.node.kind === "binary" &&
    (expr.value.node.op === "add" || expr.value.node.op === "sub");
  if (isSum) return `(${want})`;
  return /^[\d.]/.test(want) ? `× ${want}` : want;
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
  placeholder: string,
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
        placeholder=${placeholder}
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

/** The result outcome for `value` `unit`, marked exact or approximate. */
function result(have: string, value: Rational, unit: string): Outcome {
  const exact = equals(round(value, DISPLAY_PRECISION), value);
  return {
    kind: "result",
    have,
    relation: exact ? "=" : "≈",
    value: format(value, DISPLAY_PRECISION),
    unit,
  };
}

function renderOutcome(outcome: Outcome): TemplateResult {
  switch (outcome.kind) {
    case "empty":
      return html`<span class="hint">
        Type a quantity, such as <code>3 ft</code>, and the unit to convert it
        to, such as <code>in</code>.
      </span>`;
    case "result":
      return html`<span>${outcome.have}</span> ${outcome.relation}
        <span class="value">${outcome.value}</span> ${outcome.unit}`;
    case "error":
      return html`<span class="error">${outcome.message}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "unit-converter": UnitConverter;
  }
}
