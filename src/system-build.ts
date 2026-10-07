// Building the system unit table at the ceiling of the retry schedule, once
// per ceiling. docs/calculator-plan.md (D6 and task 3.3) is the design: from
// 3.4 the angle units call `pi()`, so a unit's precision is fixed when the
// table is built and must lie above every pass of the retry loop, which the
// ceiling is; the ceiling is the same for every display digits under one
// precision limit, so one table serves every request until the precision limit changes it. The
// memo holds one table, keyed by the definitions it was built from and the
// ceiling it was built at: a request at the same ceiling is the table held,
// and one at another ceiling rebuilds and replaces it, so that the
// footprint is one table however many precision limits a session has seen. A build
// evaluates every definition under the significand limit too (every exact
// result is held to it at the node, D19), but the shipped definitions
// build at the least limit the settings allow (`MIN_SIGNIFICAND_LIMIT_BITS`, which
// units.test.ts checks), and the clamp the settings apply already makes
// the ceiling fit the limit, so the significand limit is not part of the key.
// A build takes milliseconds (the definitions, plus `pi` from
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

/**
 * Where the system table stands, for the shell to render: the definitions
 * still loading, the load or the build failed (with the error of whichever
 * did), or the table ready.
 */
export type TableState<E> =
  | { readonly kind: "loading" }
  | { readonly kind: "failed"; readonly error: E | BuildError }
  | { readonly kind: "ready"; readonly table: UnitTable };

/**
 * The state of the table for `definitions` as loaded so far (`undefined`
 * while the load is in flight, else its result) at the ceiling of
 * `context`: the table is built (`buildSystemTable`) only once the
 * definitions have loaded, so a failed load is reported as it is.
 */
export function tableOf<E>(
  definitions: Result<readonly Definition[], E> | undefined,
  context: NumberContext,
): TableState<E> {
  if (definitions === undefined) return { kind: "loading" };
  if (!definitions.ok) return { kind: "failed", error: definitions.error };
  const table = buildSystemTable(definitions.value, context);
  return table.ok
    ? { kind: "ready", table: table.value }
    : { kind: "failed", error: table.error };
}

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
