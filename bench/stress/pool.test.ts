import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { runPool } from "./pool.ts";

test("the pool runs every unit, never more than its lanes at once", async () => {
  const queue = Array.from({ length: 20 }, (_, i) => i);
  const done: number[] = [];
  let active = 0;
  let most = 0;
  const started = await runPool({
    jobs: 3,
    next: () => queue.shift(),
    run: async (unit) => {
      active++;
      most = Math.max(most, active);
      await sleep(unit % 4);
      active--;
      done.push(unit);
    },
  });
  assert.equal(started, 20);
  assert.equal(most, 3);
  assert.deepEqual(
    done.sort((a, b) => a - b),
    Array.from({ length: 20 }, (_, i) => i),
  );
});

test("a lane with nothing ready waits for the units that may make more ready", async () => {
  // Each unit below 8 releases two more when it finishes, as a family's
  // last case releases its typing; at first only one is ready.
  const ready = [1];
  const done: number[] = [];
  await runPool({
    jobs: 4,
    next: () => ready.shift(),
    run: async (unit) => {
      await sleep(2);
      done.push(unit);
      if (unit < 8) ready.push(2 * unit, 2 * unit + 1);
    },
  });
  assert.deepEqual(
    done.sort((a, b) => a - b),
    Array.from({ length: 15 }, (_, i) => i + 1),
  );
});

test("once stop holds, no unit starts, and the running ones finish", async () => {
  const queue = Array.from({ length: 50 }, (_, i) => i);
  const done: number[] = [];
  let stopped = false;
  const started = await runPool({
    jobs: 2,
    next: () => queue.shift(),
    run: async (unit) => {
      await sleep(1);
      done.push(unit);
      if (done.length === 5) stopped = true;
    },
    stop: () => stopped,
  });
  assert.ok(started >= 5 && started <= 6, `${started}`);
  assert.equal(done.length, started);
  assert.equal(queue.length, 50 - started);
});

test("a unit that throws stops the pool with its error, after the others finish", async () => {
  const queue = [0, 1, 2, 3, 4, 5];
  const done: number[] = [];
  await assert.rejects(
    runPool({
      jobs: 2,
      next: () => queue.shift(),
      run: async (unit) => {
        await sleep(unit === 1 ? 0 : 5);
        if (unit === 1) throw new Error("unit 1");
        done.push(unit);
      },
    }),
    /unit 1/,
  );
  assert.deepEqual(done, [0]);
  assert.deepEqual(queue, [2, 3, 4, 5]);
});
