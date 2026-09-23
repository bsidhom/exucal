import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

/**
 * The top-level shell of the app. Every page of the app renders inside it.
 */
@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      box-sizing: border-box;
      padding: env(safe-area-inset-top) env(safe-area-inset-right)
        env(safe-area-inset-bottom) env(safe-area-inset-left);
    }

    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 1.5rem;
      text-align: center;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.75rem, 6vw, 3rem);
      font-weight: 600;
    }
  `;

  render() {
    return html`
      <main>
        <h1>hello PWA units</h1>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
