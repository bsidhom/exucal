import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { checkForUpdate } from "./register-service-worker.ts";
import type { WorkerStatus } from "./service-worker-updates.ts";
import { checkReport, offersCheck, type UpdateCheck } from "./update-report.ts";

/**
 * The button that checks for a new version of the app at once, rather than
 * when the page next comes back into view, with what the check found under
 * it. It takes the service worker's status as a property, from the shell,
 * and hides itself when there is no worker to check: in development, in a
 * browser without service workers, or when the registration failed
 * (`offersCheck`). What the check found is read from the status rather
 * than the check's own result (`checkReport`), so it agrees with the
 * footer.
 */
@customElement("update-check")
export class UpdateCheckButton extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    :host([hidden]) {
      display: none;
    }

    button {
      font: inherit;
      padding: 0.5rem 1rem;
      border: 1px solid currentColor;
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .hint {
      max-width: 16rem;
      font-size: 0.75rem;
      font-weight: 400;
      opacity: 0.8;
    }
  `;

  /** The service worker's status, as the shell hears it. */
  @property({ attribute: false }) status: WorkerStatus = {
    kind: "registering",
  };

  /** Where the user's check stands; unset until they ask for one. */
  @state() private check?: UpdateCheck;

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has("status")) {
      this.hidden = !offersCheck(this.status);
    }
  }

  render() {
    const { kind } = this.status;
    if (!offersCheck(this.status)) return nothing;
    const checking = this.check === "checking";
    return html`
      <button
        type="button"
        ?disabled=${checking || kind === "registering" || kind === "applying"}
        @click=${this.onCheck}
      >
        ${checking ? "Checking…" : "Check for updates"}
      </button>
      <small class="hint" role="status">
        ${checkReport(this.check, this.status) ?? nothing}
      </small>
    `;
  }

  /** Checks for a new version at once, from the button. */
  private async onCheck() {
    this.check = "checking";
    this.check = (await checkForUpdate()) ? "done" : "failed";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "update-check": UpdateCheckButton;
  }
}
