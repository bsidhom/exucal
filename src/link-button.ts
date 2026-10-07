import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { pressableStyles } from "./styles.ts";

/**
 * A button that reads as a link: the text's font, underlined, in the
 * link color, with no box, for an action that is a word among words:
 * the reset beside a setting's label ("default 8"), "Reset all
 * settings", and the footer's "reload" and "update". The press is seen
 * in the text, the underline thickening under the pointer and the text
 * fading while pressed, since a box tint would draw a box the link does
 * not have (styles.ts, `pressableStyles`, overridden for that). Focus
 * is delegated and a `click` on the inner button reaches the host's
 * listeners, as `app-button` has it.
 */
@customElement("link-button")
export class LinkButton extends LitElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    pressableStyles,
    css`
      :host {
        display: inline;
      }

      button {
        font: inherit;
        padding: 0;
        border: none;
        background-color: transparent;
        color: LinkText;
        text-decoration: underline;
        cursor: pointer;
      }

      button:hover:not(:disabled),
      button:active:not(:disabled) {
        background-color: transparent;
        transform: none;
      }

      button:hover:not(:disabled) {
        text-decoration-thickness: 2px;
      }

      button:active:not(:disabled) {
        opacity: 0.6;
      }
    `,
  ];

  /** Whether the button is inert. */
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
    "link-button": LinkButton;
  }
}
