import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { ceilingFor } from "../../src/core/context.ts";
import { schedule } from "../../src/core/pipeline.ts";
import { contextOf } from "../../src/settings.ts";
import { caseOf, checkSettings, measure, typeOut } from "./harness.ts";

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
  const c = caseOf("exp(1) - exp(1)", "", { maxDigits: 50 });
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
});

test("the settings must be ones the panel could hold", () => {
  assert.throws(
    () => checkSettings(caseOf("1", "", { digits: 2000 }).settings),
    RangeError,
  );
  assert.throws(
    () => checkSettings(caseOf("1", "", { maxDigits: 3000 }).settings),
    RangeError,
  );
  assert.throws(
    () => checkSettings(caseOf("1", "", { maxBits: 10 }).settings),
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
