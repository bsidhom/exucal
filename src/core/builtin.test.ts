import assert from "node:assert/strict";
import { test } from "node:test";
import {
  RADIAN,
  angle,
  checkArgument,
  fromBallError,
  plainNumbers,
} from "./builtin.ts";
import { ONE } from "./scaled.ts";
import {
  DIMENSIONLESS,
  primitive,
  type Dimension,
  type Primitives,
} from "./dimension.ts";
import { rational } from "./rational.ts";

const PRIMITIVES: Primitives = new Map([
  ["m", "dimension"],
  ["radian", "kind"],
]);

function dim(exponents: Record<string, number>): Dimension {
  return new Map(
    Object.entries(exponents).map(([name, e]) => [name, rational(BigInt(e))]),
  );
}

test("plainNumbers wants every argument dimensionless and gives a plain number", () => {
  const rule = plainNumbers(2);
  assert.deepEqual(rule([DIMENSIONLESS, DIMENSIONLESS], PRIMITIVES), {
    ok: true,
    value: DIMENSIONLESS,
  });
  assert.deepEqual(rule([DIMENSIONLESS, dim({ m: 1 })], PRIMITIVES), {
    ok: false,
    error: {
      kind: "argumentDimension",
      argument: 1,
      want: DIMENSIONLESS,
      mismatch: {
        kind: "dimensionMismatch",
        have: dim({ m: 1 }),
        want: DIMENSIONLESS,
      },
    },
  });
  // The first argument at fault is the one reported.
  const both = rule([dim({ radian: 1 }), dim({ m: 1 })], PRIMITIVES);
  assert.ok(!both.ok && both.error.kind === "argumentDimension");
  assert.equal(both.error.argument, 0);
  assert.equal(both.error.mismatch.kind, "kindMismatch");
});

test("checkArgument tells a dimension mismatch from a kind mismatch, and a missing argument is a plain number", () => {
  const radian = primitive(RADIAN);
  assert.ok(checkArgument([radian], 0, radian, PRIMITIVES).ok);
  const plain = checkArgument([DIMENSIONLESS], 0, radian, PRIMITIVES);
  assert.ok(!plain.ok && plain.error.kind === "argumentDimension");
  assert.equal(plain.error.mismatch.kind, "kindMismatch");
  const length = checkArgument([dim({ m: 1 })], 0, radian, PRIMITIVES);
  assert.ok(!length.ok && length.error.kind === "argumentDimension");
  assert.equal(length.error.mismatch.kind, "dimensionMismatch");
  assert.ok(checkArgument([], 0, DIMENSIONLESS, PRIMITIVES).ok);
});

test("fromBallError passes the edge of an unresolved on, whatever it is", () => {
  // The ball's operations name zero today; the edge is carried as data so
  // that one at another point (the bound, from H.13) reaches the message.
  assert.deepEqual(fromBallError({ kind: "unresolved", edge: ONE }, 1), {
    kind: "unresolved",
    argument: 1,
    edge: ONE,
  });
  assert.deepEqual(fromBallError({ kind: "tooLarge" }, 0), {
    kind: "tooLarge",
  });
});

test("angle is the radian kind where the table declares it, and nothing otherwise", () => {
  assert.deepEqual(angle(PRIMITIVES), dim({ radian: 1 }));
  assert.equal(angle(new Map([["m", "dimension"]])), undefined);
});
