import { LitElement, css, html, svg } from "lit";
import { customElement, property } from "lit/decorators.js";
import { pressableStyles } from "./styles.ts";

/**
 * The cog that opens and closes the settings sheet (settings-panel.ts;
 * devdocs/settings.md, "The sheet"), built as the copy button is: an icon drawn
 * as strokes in the text's color, quiet until hovered or focused, with a
 * hit area of a thumb's size, 44 pixels each way, around a glyph of
 * 1.5rem. It is a plain button that discloses a panel, never a switch:
 * `expanded` is the sheet's state, said as `aria-expanded`, and the
 * label names it for a screen reader and, as a title, for the pointer.
 * The shell listens for its `click`, owns the open state, and calls
 * `focus()` to put focus back on it when the sheet closes, which the
 * delegated focus hands to the button. The press is seen as every
 * button's is (styles.ts, `pressableStyles`).
 */
@customElement("settings-button")
export class SettingsButton extends LitElement {
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

      button {
        /* A thumb's hit area around the glyph: 1.5rem and 0.625rem each side is 44 pixels at 16. */
        padding: 0.625rem;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: inherit;
        cursor: pointer;
        line-height: 0;
        opacity: 0.6;
      }

      button:hover,
      button:focus-visible,
      button[aria-expanded="true"] {
        opacity: 1;
      }

      svg {
        width: 1.5rem;
        height: 1.5rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `,
  ];

  /** Whether the sheet the cog discloses is open. */
  @property({ type: Boolean }) expanded = false;

  /** What the button is called, for a screen reader and the pointer. */
  @property() label = "Settings";

  render() {
    return html`
      <button
        type="button"
        aria-label=${this.label}
        title=${this.label}
        aria-expanded=${this.expanded ? "true" : "false"}
      >
        ${COG}
      </button>
    `;
  }
}

/** The cog: eight teeth around a hub, as strokes. */
const COG = svg`<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M19.6 12 22.14 13.12 21.79 14.85 19.02 14.91 17.37 17.37 18.38 19.96 16.91 20.94 14.91 19.02 12 19.6 10.88 22.14 9.15 21.79 9.09 19.02 6.63 17.37 4.04 18.38 3.06 16.91 4.98 14.91 4.4 12 1.86 10.88 2.21 9.15 4.98 9.09 6.63 6.63 5.62 4.04 7.09 3.06 9.09 4.98 12 4.4 13.12 1.86 14.85 2.21 14.91 4.98 17.37 6.63 19.96 5.62 20.94 7.09 19.02 9.09Z" />
  <circle cx="12" cy="12" r="3" />
</svg>`;

declare global {
  interface HTMLElementTagNameMap {
    "settings-button": SettingsButton;
  }
}
