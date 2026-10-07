import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { pressableStyles } from "./styles.ts";

/**
 * A button in the app's look, with words in it: the text's font, a thin
 * border, no fill, and the feedback every button gives (styles.ts,
 * `pressableStyles`). The one place that look is defined, so that Done,
 * Apply, Retry and the probe's button are the same button. The label is
 * the slot; `disabled` is reflected onto the inner button, which then
 * fires no click. Focus is delegated, so that the host is focused and
 * tabbed to as the button it holds, and a `click` on the inner button
 * reaches the host's listeners, since clicks cross a shadow boundary.
 */
@customElement("app-button")
export class AppButton extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    pressableStyles,
    css`
      :host {
        display: inline-flex;
      }

      :host([hidden]) {
        display: none;
      }

      button {
        font: inherit;
        padding: 0.5rem 1rem;
        border: 1px solid currentColor;
        border-radius: 0.5rem;
        background-color: transparent;
        color: inherit;
        cursor: pointer;
      }
    `,
  ];

  /** Whether the button is inert: faded, and firing no click. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  render() {
    return html`
      <button type="button" ?disabled=${this.disabled}>
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-button": AppButton;
  }
}
