import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { buildTable, type BuildError } from "./core/build.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { type ParseError } from "./core/parser.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import { type Result } from "./core/result.ts";
import { type UnitTable } from "./core/table.ts";
import "./unit-converter.ts";
import definitionsText from "./units.txt?raw";

/**
 * The system unit table, built once when the app loads from the definitions
 * bundled with it. Building takes a few milliseconds, so it happens up front,
 * synchronously, and every component that converts is given the result.
 *
 * The definitions file is checked by `units.test.ts`, so a failure here is a
 * bug in the build rather than something the user can act on; the shell says
 * so rather than rendering a converter that cannot convert.
 */
const table: Result<UnitTable, ParseError | BuildError> = (() => {
  const definitions = parseDefinitions(definitionsText);
  if (!definitions.ok) return definitions;
  return buildTable(definitions.value, DEFAULT_PRECISION);
})();

if (!table.ok) {
  console.error("The unit definitions failed to build:", table.error);
}

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
      gap: 1.5rem;
      padding: 1.5rem 1rem;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.5rem, 5vw, 2.25rem);
      font-weight: 600;
    }

    .failure {
      color: #c92a2a;
      max-width: 32rem;
    }
  `;

  render() {
    return html`
      <main>
        <h1>Units</h1>
        ${
          table.ok
            ? html`<unit-converter .table=${table.value}></unit-converter>`
            : html`<p class="failure" role="alert">
                The unit definitions could not be loaded (${table.error.kind}).
                This is a bug in the app, not in what you typed.
              </p>`
        }
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-shell": AppShell;
  }
}
