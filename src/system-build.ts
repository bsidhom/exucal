// Building the system unit table at the ceiling of the retry schedule, once
// per ceiling. docs/calculator-plan.md (D6 and task 3.3) is the design: from
// 3.4 the angle units call `pi()`, so a unit's precision is fixed when the
// table is built and must lie above every pass of the retry loop, which the
// ceiling is; the ceiling is the same for every digits setting under one
// cap, so one table serves every request until the cap changes it. The
// memo holds one table, keyed by the definitions it was built from and the
// ceiling it was built at: a request at the same ceiling is the table held,
// and one at another ceiling rebuilds and replaces it, so that the
// footprint is one table however many caps a session has seen. Nothing in
// a build depends on the range limit beyond the clamp the settings apply,
// which already makes the ceiling fit it, so the range limit is not part
// of the key. A build takes milliseconds (the definitions, plus `pi` from
// its memo and a few products of it), so the shell builds synchronously
// when its settings move the ceiling. A failed build is memoized too: the
// system file is checked by `units.test.ts`, so a failure is a bug in the
// app, and rebuilding it on every render would not change that.
//
// This module is apart from system-table.ts, which fetches and parses the
// definitions, so that it has no asset import and is tested under Node.

import { buildTable, type BuildError } from "./core/build.ts";
import { ceilingContext, type NumberContext } from "./core/context.ts";
import type { Definition } from "./core/definitions.ts";
import type { Result } from "./core/result.ts";
import type { UnitTable } from "./core/table.ts";

/** The one table held: what it was built from, at which ceiling, and the result. */
let memo:
  | {
      readonly definitions: readonly Definition[];
      readonly ceiling: number;
      readonly table: Result<UnitTable, BuildError>;
    }
  | undefined;

/**
 * The table `definitions` build to at the ceiling of `context` (D6): the
 * table held when it was built from the same definitions at the same
 * ceiling, and otherwise a new build, which replaces it.
 */
export function buildSystemTable(
  definitions: readonly Definition[],
  context: NumberContext,
): Result<UnitTable, BuildError> {
  const at = ceilingContext(context);
  if (
    memo !== undefined &&
    memo.definitions === definitions &&
    memo.ceiling === at.ceiling
  ) {
    return memo.table;
  }
  const table = buildTable(definitions, at);
  memo = { definitions, ceiling: at.ceiling, table };
  return table;
}
