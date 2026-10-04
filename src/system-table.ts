// Loading the system unit definitions. The definitions file is bundled as
// an asset of its own (a URL import, so Vite hashes it, emits it beside the
// scripts and the service worker precaches it) and fetched when first asked
// for, rather than inlined into the app's script: loading the components
// never waits on the definitions, and the page can render a loading message
// while the fetch is in flight. Parsing happens on the main thread once the
// text arrives; it takes a few milliseconds, so a worker would cost more
// than it saves. Building the table is system-build.ts's: the table depends
// on the ceiling of the retry schedule (D6 of docs/calculator-plan.md), so
// it is built from these definitions once per ceiling, while the text is
// fetched and parsed once.
//
// The result is memoized: every caller shares one fetch and one parse. A
// failure is not kept, so that a caller can ask again after a network
// error rather than be stuck with it; a failure to parse would repeat, but
// `units.test.ts` checks the bundled file, so that is a bug in the build
// rather than something to retry.

import {
  parseDefinitions,
  type Definition,
  type DefinitionRejection,
} from "./core/definitions.ts";
import type { ParseError } from "./core/parser.ts";
import { err, type Result } from "./core/result.ts";
import definitionsUrl from "./units.txt?url";

export type SystemDefinitionsError =
  /** The definitions file could not be fetched; `reason` says why. */
  | { readonly kind: "fetchFailed"; readonly reason: string }
  | ParseError<DefinitionRejection>;

let loading:
  Promise<Result<readonly Definition[], SystemDefinitionsError>> | undefined;

/**
 * The system definitions, fetched and parsed the first time this is called
 * and shared by every call after that.
 */
export function loadSystemDefinitions(): Promise<
  Result<readonly Definition[], SystemDefinitionsError>
> {
  return (loading ??= load().then((result) => {
    if (!result.ok) loading = undefined;
    return result;
  }));
}

async function load(): Promise<
  Result<readonly Definition[], SystemDefinitionsError>
> {
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
  return parseDefinitions(text);
}
