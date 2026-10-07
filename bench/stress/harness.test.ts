import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { ceilingFor } from "../../src/core/context.ts";
import { schedule } from "../../src/core/pipeline.ts";
import { contextOf } from "../../src/settings.ts";
import {
  caseOf,
  checkSettings,
  estimateMs,
  machine,
  measure,
  typeOut,
  type Measurement,
} from "./harness.ts";

test("a case that certifies at once takes one pass, cold and warm", async () => {
  const c = caseOf("3 ft", "in");
  const measured = await measure(c, 30_000);
  assert.ok(measured.status === "done", inspect(measured));
  for (const run of [measured.cold, measured.warm]) {
    assert.equal(run.passes.length, 1);
    assert.equal(
      run.passes[0]!.precision,
      schedule(contextOf(c.settings))[0]!.precision,
    );
    assert.ok(run.ms >= run.passes[0]!.ms);
    assert.deepEqual(run.outcome, {
      kind: "result",
      line: "3 ft = 36 in",
      warnings: 0,
    });
  }
  assert.equal(measured.machine.node, process.version);
  assert.ok(measured.machine.cores >= 1);
});

test("a case that never certifies runs the whole schedule to the ceiling", async () => {
  // A small cap keeps the ceiling, and the case, cheap.
  const c = caseOf("exp(1) - exp(1)", "", { precisionLimitDigits: 50 });
  const measured = await measure(c, 30_000);
  assert.ok(measured.status === "done", inspect(measured));
  const precisions = schedule(contextOf(c.settings)).map((w) => w.precision);
  assert.equal(precisions.at(-1), ceilingFor(50));
  for (const run of [measured.cold, measured.warm]) {
    assert.deepEqual(
      run.passes.map((pass) => pass.precision),
      precisions,
    );
    assert.equal(run.outcome.kind, "result");
    assert.match(run.outcome.line, /^exp\(1\) - exp\(1\) ≈ 0 \(within /);
  }
});

test("a case past its deadline is recorded with the pass that was running", async () => {
  // Seconds at the default ceiling, against a deadline of a few milliseconds.
  const c = caseOf("beta(0.5, 0.5) - pi()");
  const measured = await measure(c, 20);
  assert.ok(measured.status === "deadline", inspect(measured));
  assert.equal(measured.deadlineMs, 20);
  assert.equal(measured.cold, undefined);
  assert.ok(measured.running !== undefined, inspect(measured));
  assert.equal(measured.running.run, "cold");
  const precisions = schedule(contextOf(c.settings)).map((w) => w.precision);
  assert.equal(measured.running.precision, precisions[measured.running.pass]);
  // Its progress: the schedule, the passes before the running one, and how
  // long that one had run.
  assert.deepEqual(measured.progress.schedule, precisions);
  assert.deepEqual(
    measured.progress.passes.map((pass) => pass.precision),
    precisions.slice(0, measured.running.pass),
  );
  assert.ok(measured.progress.runningMs >= 0);
  assert.ok(estimateMs(measured) >= measured.progress.runningMs);
});

test("a hang's estimate extends its passes along their growth", () => {
  const hang = (
    passes: readonly [number, number][],
    running: number,
    runningMs: number,
    run: "cold" | "warm" = "cold",
  ): Extract<Measurement, { status: "deadline" }> => ({
    status: "deadline",
    case: caseOf("x"),
    machine: machine(),
    deadlineMs: 1000,
    cold: undefined,
    running: { run, pass: running, precision: [10, 20, 40, 80][running]! },
    progress: {
      schedule: [10, 20, 40, 80],
      passes: passes.map(([precision, ms]) => ({ precision, ms })),
      runningMs,
    },
  });
  // Passes that quadruple as the precision doubles grow as its square: the
  // running pass at 40 digits costs 64, then 256 at 80.
  assert.equal(
    estimateMs(
      hang(
        [
          [10, 4],
          [20, 16],
        ],
        2,
        10,
      ),
    ),
    4 + 16 + 64 + 256,
  );
  // The running pass costs at least what it had run.
  assert.equal(
    estimateMs(
      hang(
        [
          [10, 4],
          [20, 16],
        ],
        2,
        100,
      ),
    ),
    4 + 16 + 100 + 256,
  );
  // The growth is held within one and three.
  assert.equal(
    estimateMs(
      hang(
        [
          [10, 1],
          [20, 100],
        ],
        2,
        0,
      ),
    ),
    1 + 100 + 800 + 6400,
  );
  // With no pass finished, the running one is the anchor, at a square.
  assert.equal(estimateMs(hang([], 1, 50)), 50 + 200 + 800);
  // With no pass started, the deadline is all that is known.
  assert.equal(estimateMs({ ...hang([], 0, 0), running: undefined }), 1000);
});

test("the settings must be ones the panel could hold", () => {
  assert.throws(
    () => checkSettings(caseOf("1", "", { displayDigits: 2000 }).settings),
    RangeError,
  );
  assert.throws(
    () =>
      checkSettings(caseOf("1", "", { precisionLimitDigits: 3000 }).settings),
    RangeError,
  );
  assert.throws(
    () => checkSettings(caseOf("1", "", { significandLimitBits: 10 }).settings),
    RangeError,
  );
  assert.throws(
    () => checkSettings(caseOf("1", "", { budgetMs: 5 }).settings),
    RangeError,
  );
  checkSettings(caseOf("1").settings);
});

test("typing out a case evaluates every prefix of the have, in order", async () => {
  const typing = await typeOut(caseOf("3 ft", "in"), 30_000);
  assert.equal(typing.complete, true);
  assert.deepEqual(
    typing.keystrokes.map((k) => [k.length, k.kind]),
    // `3` and `3 ` are plain numbers, not lengths, and `3 f` is no unit.
    [
      [1, "error"],
      [2, "error"],
      [3, "error"],
      [4, "result"],
    ],
  );
  for (const k of typing.keystrokes) assert.ok(k.ms >= 0);
});

test("typing that passes its deadline returns the keystrokes typed so far", async () => {
  // The whole text costs seconds at the default ceiling; its prefixes
  // until the last do not parse, or certify at once.
  const typing = await typeOut(caseOf("beta(0.5, 0.5) - pi()"), 200);
  assert.equal(typing.complete, false);
  assert.ok(typing.keystrokes.length < "beta(0.5, 0.5) - pi()".length);
});
