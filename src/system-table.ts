// Loading the system unit table. The definitions file is bundled as an asset
// of its own (a URL import, so Vite hashes it, emits it beside the scripts
// and the service worker precaches it) and fetched when first asked for,
// rather than inlined into the app's script: loading the components never
// waits on the table, and the page can render a loading message while the
// fetch is in flight. Parsing and building happen on the main thread once
// the text arrives; they take a few milliseconds, so a worker would cost
// more than it saves.
//
// The result is memoized: every caller shares one fetch and one table.
// A failure is not kept, so that a caller can ask again after a network
// error rather than be stuck with it; a failure to parse or build would
// repeat, but `units.test.ts` checks the bundled file, so that is a bug in
// the build rather than something to retry.

import { buildTable, type BuildError } from "./core/build.ts";
import { parseDefinitions } from "./core/definitions.ts";
import { type ParseError } from "./core/parser.ts";
import { DEFAULT_ROUNDING, type NumberContext } from "./core/context.ts";
import { DEFAULT_PRECISION } from "./core/rational.ts";
import { err, type Result } from "./core/result.ts";
import { type UnitTable } from "./core/table.ts";
import definitionsUrl from "./units.txt?url";

export type SystemTableError =
  /** The definitions file could not be fetched; `reason` says why. */
  | { readonly kind: "fetchFailed"; readonly reason: string }
  | ParseError
  | BuildError;

/**
 * The working context the table is built at: the fixed working precision,
 * as before the context existed. The rounding mode has no effect on a
 * build, since nothing in a build rounds in a mode (the plan's D15).
 */
const BUILD_CONTEXT: NumberContext = {
  precision: DEFAULT_PRECISION,
  rounding: DEFAULT_ROUNDING,
};

let loading: Promise<Result<UnitTable, SystemTableError>> | undefined;

/**
 * The system table, fetched, parsed and built the first time this is called
 * and shared by every call after that.
 */
export function loadSystemTable(): Promise<
  Result<UnitTable, SystemTableError>
> {
  return (loading ??= load().then((result) => {
    if (!result.ok) loading = undefined;
    return result;
  }));
}

async function load(): Promise<Result<UnitTable, SystemTableError>> {
  let text: string;
  try {
    const response = await fetch(definitionsUrl);
    if (!response.ok) {
      return err({
        kind: "fetchFailed",
        reason: `${response.status} ${response.statusText}`,
      });
    }
    text = await response.text();
  } catch (error) {
    return err({ kind: "fetchFailed", reason: String(error) });
  }
  const definitions = parseDefinitions(text);
  if (!definitions.ok) return definitions;
  return buildTable(definitions.value, BUILD_CONTEXT);
}
