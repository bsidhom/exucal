import { LitElement, css, html, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { customElement, property } from "lit/decorators.js";
import { BUILD_ID, SHORT_BUILD_ID, shortBuildId } from "./build-id.ts";
import { applyUpdate } from "./register-service-worker.ts";
import type { WorkerStatus } from "./service-worker-updates.ts";

/**
 * The footer under everything: the build the page is running (build-id.ts),
 * so a copy served from the service worker's cache can be told from the
 * one last deployed, and beside it the service worker's status, which the
 * shell passes down as a property and which is empty while the worker is
 * ready. Once a new version of the app has been installed in the
 * background, the status is a link naming its build, "update to …", that
 * switches to it, for as long as it waits. The new version is already
 * cached by then, so the switch is a reload that costs no download; until
 * the user asks for it, the running version stays, so an update never
 * interrupts them. Should the worker serving the page ever be of another
 * build than the page, the status says so, with a link to reload.
 */
@customElement("app-footer")
export class AppFooter extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    footer {
      padding: 0 1rem 1rem;
      text-align: center;
      font-size: 0.75rem;
    }

    /* The routine parts of the footer recede; an update does not. */
    .quiet {
      opacity: 0.6;
    }

    button {
      font: inherit;
      padding: 0;
      border: none;
      background: transparent;
      color: LinkText;
      text-decoration: underline;
      cursor: pointer;
    }

    code {
      user-select: all;
    }
  `;

  /** The service worker's status, as the shell hears it. */
  @property({ attribute: false }) status: WorkerStatus = {
    kind: "registering",
  };

  render() {
    const status = renderWorkerStatus(this.status);
    return html`
      <footer>
        <span class="quiet">
          Build <code title=${BUILD_ID}>${SHORT_BUILD_ID}</code>
        </span>
        <span role="status">
          ${
            status === nothing
              ? nothing
              : html`<span class="quiet">·</span> ${status}`
          }
        </span>
      </footer>
    `;
  }
}

/**
 * The service worker's status, for the footer: nothing while it is ready
 * or starting, a quiet word or two while it works, or a link when the user
 * has something to do, above all the waiting update.
 */
function renderWorkerStatus(status: WorkerStatus) {
  const quiet = (text: string) => html`<span class="quiet">${text}</span>`;
  const reload = html`<button type="button" @click=${() => location.reload()}>
    reload
  </button>`;
  switch (status.kind) {
    case "development":
    case "registering":
      return nothing;
    case "unsupported":
      return quiet("no offline");
    case "failed":
      return quiet("worker failed");
    case "installing":
      return quiet("caching…");
    case "bypassed":
      return html`${quiet("bypassed ·")} ${reload}`;
    case "ready":
      if (status.build !== undefined && status.build !== BUILD_ID) {
        return html`worker
          <code title=${status.build}>${shortBuildId(status.build)}</code>
          · ${reload}`;
      }
      return nothing;
    case "downloading":
      return quiet("downloading…");
    case "waiting":
      return html`<button
        type="button"
        title=${ifDefined(status.build)}
        @click=${applyUpdate}
      >
        ${
          status.build === undefined
            ? "update"
            : `update to ${shortBuildId(status.build)}`
        }
      </button>`;
    case "applying":
      return quiet("updating…");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-footer": AppFooter;
  }
}
