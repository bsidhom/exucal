import { LitElement, css, html, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * A button that copies `text` to the clipboard, as an icon the size of
 * the text beside it: the two sheets that mean "copy" everywhere, which
 * become a check mark for a moment once the text is on the clipboard, or
 * a cross, in the error color, when the clipboard refused it, so that the
 * button says what happened without growing. A live region that is not
 * shown says the same in words for a screen reader, and `label` names
 * the button for one. The icon is quiet until hovered or focused, and
 * the hit area is larger than the icon, for a thumb, without moving
 * anything around it.
 */
@customElement("copy-button")
export class CopyButton extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
    }

    button {
      /* A thumb's hit area, pulled back in so the layout sees the icon alone. */
      padding: 0.625rem;
      margin: -0.625rem;
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
      line-height: 0;
      opacity: 0.6;
      -webkit-tap-highlight-color: transparent;
    }

    button:hover,
    button:focus-visible,
    button.copied {
      opacity: 1;
    }

    button.failed {
      opacity: 1;
      color: var(--color-error);
    }

    svg {
      width: 1.125em;
      height: 1.125em;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Read aloud, never shown. */
    .status {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  /** What the button copies. */
  @property() text = "";

  /** What the button is called, for a screen reader. */
  @property() label = "Copy";

  /** How the last copy went, for the moment the button shows it; unset otherwise. */
  @state() private outcome?: Outcome;

  private timer?: ReturnType<typeof setTimeout>;

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.timer);
  }

  render() {
    const { outcome } = this;
    return html`
      <button
        type="button"
        class=${outcome ?? ""}
        aria-label=${this.label}
        @click=${this.onClick}
      >
        ${ICONS[outcome ?? "copy"]}
      </button>
      <span class="status" role="status">
        ${outcome === undefined ? "" : STATUS[outcome]}
      </span>
    `;
  }

  /** Copies the text and shows how it went for `SHOWN_FOR`. */
  private async onClick() {
    let outcome: Outcome;
    try {
      await navigator.clipboard.writeText(this.text);
      outcome = "copied";
    } catch {
      outcome = "failed";
    }
    this.outcome = outcome;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.outcome = undefined;
    }, SHOWN_FOR);
  }
}

/** How a copy went. */
type Outcome = "copied" | "failed";

/** How long the outcome is shown, in milliseconds. */
const SHOWN_FOR = 1500;

/** The icons, drawn as strokes in the text's color, one per state. */
const ICONS = {
  copy: svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>`,
  copied: svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>`,
  failed: svg`<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>`,
} as const;

/** What the live region says of each outcome. */
const STATUS: Record<Outcome, string> = {
  copied: "Copied",
  failed: "Couldn't copy",
};

declare global {
  interface HTMLElementTagNameMap {
    "copy-button": CopyButton;
  }
}
