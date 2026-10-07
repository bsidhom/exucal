import { LitElement, css, html, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { customElement, property, state } from "lit/decorators.js";
import { BUILD_ID, SHORT_BUILD_ID, shortBuildId } from "./build-id.ts";
import { applyUpdate, checkForUpdate } from "./register-service-worker.ts";
import type { WorkerStatus } from "./service-worker-updates.ts";
import { pressableStyles } from "./styles.ts";
import "./link-button.ts";

/**
 * The footer under everything: the build the page is running (build-id.ts),
 * so a copy served from the service worker's cache can be told from the
 * one last deployed, and beside it one status, which is empty while the
 * worker is ready.
 *
 * The status is the service worker's, which the shell passes down as a
 * property, whenever that has something to say. Once a new version of the
 * app has been installed in the background, it is a link naming its
 * build, "update to …", that switches to it, for as long as it waits. The
 * new version is already cached by then, so the switch is a reload that
 * costs no download; until the user asks for it, the running version
 * stays, so an update never interrupts them. Should the worker serving
 * the page ever be of another build than the page, the status says so,
 * with a link to reload.
 *
 * The build is a button: tapping it checks for a new version at once,
 * rather than when the page next comes back into view, and the status
 * then says "checking…", and afterwards what the check found, in the
 * worker's own words when it found something ("downloading…", then the
 * "update to …" link), or else "up to date" or "couldn't check
 * (offline?)". The check's word is shown only while the worker's status
 * has nothing to say, since the worker's status is what a check changes,
 * and it stays until the status next changes or the page is reloaded. The
 * build looks like the text it is and is underlined only when hovered,
 * focused or pressed; the button's hit area is larger than the text, for
 * a thumb. It is plain text when there is no worker to check: in
 * development, in a browser without service workers, or when the
 * registration failed.
 */
@customElement("app-footer")
export class AppFooter extends LitElement {
  static styles = [
    pressableStyles,
    css`
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

      /* The footer's links are link buttons; the build is its own: text until touched. */
      button {
        font: inherit;
        border: none;
        background: transparent;
        cursor: pointer;
      }

      button:hover:not(:disabled),
      button:active:not(:disabled) {
        background-color: transparent;
        transform: none;
      }

      /*
       * The build reads as text until touched. The padding and the margin
       * that undoes it give a thumb something to hit without moving the
       * text.
       */
      .build {
        padding: 0.5rem;
        margin: -0.5rem;
        color: inherit;
        text-decoration: none;
      }

      .build:hover,
      .build:focus-visible,
      .build:active {
        text-decoration: underline;
      }

      .build:disabled {
        cursor: default;
      }
    `,
  ];

  /** The service worker's status, as the shell hears it. */
  @property({ attribute: false }) status: WorkerStatus = {
    kind: "registering",
  };

  /** Where the user's check for an update stands; unset until they ask for one. */
  @state() private check?: UpdateCheck;

  render() {
    const status = renderStatus(this.status, this.check);
    return html`
      <footer>
        <span class="quiet">Build ${this.renderBuild()}</span>
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

  /** The build, as the button that checks for updates when there is a worker to check, else as text. */
  private renderBuild() {
    const build = html`<code title=${BUILD_ID}>${SHORT_BUILD_ID}</code>`;
    if (!offersCheck(this.status)) return build;
    const { kind } = this.status;
    return html`<button
      type="button"
      class="build"
      aria-label="${SHORT_BUILD_ID}, check for updates"
      ?disabled=${
        this.check === "checking" ||
        kind === "registering" ||
        kind === "applying"
      }
      @click=${this.onCheck}
    >
      ${build}
    </button>`;
  }

  /** Checks for a new version at once, from the build. */
  private async onCheck() {
    this.check = "checking";
    this.check = (await checkForUpdate()) ? "done" : "failed";
  }
}

/** Where the user's check for an update stands: under way, gone through, or failed. */
type UpdateCheck = "checking" | "done" | "failed";

/** What the status says of a check while the worker's status says nothing. */
const CHECK_WORDS: Record<UpdateCheck, string> = {
  checking: "checking…",
  done: "up to date",
  failed: "couldn't check (offline?)",
};

/**
 * Whether there is a worker to check: not in development, in a browser
 * without service workers, or when the registration failed.
 */
function offersCheck(status: WorkerStatus): boolean {
  const { kind } = status;
  return kind !== "development" && kind !== "unsupported" && kind !== "failed";
}

/**
 * The footer's status: the worker's when it has something to say, else the
 * check's word, else nothing.
 */
function renderStatus(status: WorkerStatus, check: UpdateCheck | undefined) {
  const worker = renderWorkerStatus(status);
  if (worker !== nothing) return worker;
  return check === undefined ? nothing : quiet(CHECK_WORDS[check]);
}

/**
 * The service worker's status: nothing while it is ready or starting, a
 * quiet word or two while it works, or a link when the user has something
 * to do, above all the waiting update.
 */
function renderWorkerStatus(status: WorkerStatus) {
  const reload = html`<link-button @click=${() => location.reload()}>
    reload
  </link-button>`;
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
      return html`<link-button
        title=${ifDefined(status.build)}
        @click=${applyUpdate}
      >
        ${
          status.build === undefined
            ? "update"
            : `update to ${shortBuildId(status.build)}`
        }
      </link-button>`;
    case "applying":
      return quiet("updating…");
  }
}

function quiet(text: string) {
  return html`<span class="quiet">${text}</span>`;
}

declare global {
  interface HTMLElementTagNameMap {
    "app-footer": AppFooter;
  }
}
