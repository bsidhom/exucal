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

test("once next gives no more, no unit starts, and the running ones finish", async () => {
  const queue = Array.from({ length: 50 }, (_, i) => i);
  const done: number[] = [];
  let stopping = false;
  const started = await runPool({
    jobs: 2,
    next: () => (stopping ? undefined : queue.shift()),
    run: async (unit) => {
      await sleep(1);
      done.push(unit);
      if (done.length === 5) stopping = true;
    },
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
