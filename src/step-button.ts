import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { pressableStyles } from "./styles.ts";

/**
 * A stepper's button, `−` or `+`, beside a number input: a square the
 * height of the input it stands beside, in the input's own border and
 * radius so that the three read as one control, with the feedback every
 * button gives (styles.ts,
 * `pressableStyles`). The visible square is smaller than a thumb, so an
 * invisible margin around it, drawn by a pseudo-element, takes the hit
 * to 44 pixels each way without moving anything. `direction` picks the
 * glyph and `label` names the step for a screen reader ("One more:
 * the display digits"). Focus is delegated, as `app-button` does, and
 * a `click` on the inner button reaches the host's listeners.
 *
 * The square's side is computed, not stretched: the input's height is
 * one line at the inherited line height plus its padding and border,
 * `1.5em + 0.75rem + 2px` in the panel's metrics, set on the host, whose
 * font size is the input's, and filled by the button (a percentage of
 * an explicit size, which every browser resolves; the glyph's larger
 * font size is the button's alone). The first cut stretched the host
 * to the row and gave the button `height: 100%` with `aspect-ratio: 1`,
 * which Safari resolved against no definite height: the button fell to
 * its content's size and the two squares collapsed into the input.
 */
@customElement("step-button")
export class StepButton extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    pressableStyles,
    css`
      :host {
        /* The input's height, from the metrics it and this share, on the host, whose em is the input's. */
        display: inline-flex;
        width: calc(1.5em + 0.75rem + 2px);
        height: calc(1.5em + 0.75rem + 2px);
      }

      button {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
        border-radius: 0.5rem;
        background-color: transparent;
        color: inherit;
        font: inherit;
        font-size: 1.125em;
        line-height: 1;
        cursor: pointer;
      }

      /* The thumb's hit area, past the square, drawn by nothing. */
      button::after {
        content: "";
        position: absolute;
        inset: -0.375rem;
      }
    `,
  ];

  /** Which way the step goes: `up` is `+`, `down` is `−`. */
  @property() direction: "up" | "down" = "up";

  /** What the button is called, for a screen reader. */
  @property() label = "";

  render() {
    return html`
      <button type="button" aria-label=${this.label}>
        ${this.direction === "up" ? "+" : "−"}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-button": StepButton;
  }
}
