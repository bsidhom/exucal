// Test support for the exact functions (abs.ts, round.ts,
// division.ts, integers.ts): the assertions their tests share, on a
// built-in's result.

import assert from "node:assert/strict";
import { inspect } from "node:util";
import { isExact, type Ball } from "../core/ball.ts";
import type { BuiltinError } from "../core/builtin.ts";
import type { Result } from "../core/result.ts";
import { equals, type Scaled } from "../core/scaled.ts";
import { dec } from "./scaled.ts";

/** The value of a result that is expected to succeed. */
export function value<E>(result: Result<Ball, E>): Ball {
  assert.ok(result.ok, inspect(result));
  return result.value;
}

/** The error of a result that is expected to fail. */
export function error<E>(result: Result<Ball, E>): E {
  assert.ok(!result.ok, inspect(result));
  return result.error;
}

/** Asserts that `result` is the exact value `expected`. */
export function assertExact<E>(
  result: Result<Ball, E>,
  expected: Scaled | string,
): void {
  const b = value(result);
  const want = typeof expected === "string" ? dec(expected) : expected;
  assert.ok(isExact(b), `expected an exact result, got ${inspect(b)}`);
  assert.ok(
    equals(b.mid, want),
    `expected ${inspect(want)}, got ${inspect(b.mid)}`,
  );
}

/** Asserts that `result` is `unresolved` on `argument` at `edge`. */
export function assertUnresolved(
  result: Result<Ball, BuiltinError>,
  argument: number,
  edge: Scaled | string,
): void {
  const e = error(result);
  const want = typeof edge === "string" ? dec(edge) : edge;
  assert.equal(e.kind, "unresolved", inspect(e));
  assert.ok(e.kind === "unresolved");
  assert.equal(e.argument, argument);
  assert.ok(
    typeof e.edge !== "string" && equals(e.edge, want),
    `expected the edge ${inspect(want)}, got ${inspect(e.edge)}`,
  );
}
