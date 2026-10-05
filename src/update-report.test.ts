import assert from "node:assert/strict";
import { test } from "node:test";
import type { WorkerStatus } from "./service-worker-updates.ts";
import { checkReport, offersCheck } from "./update-report.ts";

const KINDS: readonly WorkerStatus["kind"][] = [
  "development",
  "unsupported",
  "registering",
  "failed",
  "installing",
  "bypassed",
  "ready",
  "downloading",
  "waiting",
  "applying",
];

test("a check is offered unless there is no worker to check", () => {
  const offered = KINDS.filter((kind) => offersCheck({ kind }));
  assert.deepEqual(offered, [
    "registering",
    "installing",
    "bypassed",
    "ready",
    "downloading",
    "waiting",
    "applying",
  ]);
});

test("nothing is reported before a check or while one runs", () => {
  for (const kind of KINDS) {
    assert.equal(checkReport(undefined, { kind }), undefined);
    assert.equal(checkReport("checking", { kind }), undefined);
  }
});

test("a check that went through reports the worker's status", () => {
  assert.equal(checkReport("done", { kind: "downloading" }), "Downloading…");
  assert.equal(checkReport("done", { kind: "waiting" }), "Update ready");
  assert.equal(
    checkReport("done", { kind: "waiting", build: "abc" }),
    "Update ready",
  );
  assert.equal(checkReport("done", { kind: "applying" }), "Updating…");
  for (const kind of [
    "registering",
    "installing",
    "bypassed",
    "ready",
  ] as const) {
    assert.equal(checkReport("done", { kind }), "Up to date");
  }
});

test("a failed check says so unless an update turned up all the same", () => {
  assert.equal(
    checkReport("failed", { kind: "ready" }),
    "Couldn't check (offline?)",
  );
  assert.equal(
    checkReport("failed", { kind: "bypassed" }),
    "Couldn't check (offline?)",
  );
  assert.equal(checkReport("failed", { kind: "downloading" }), "Downloading…");
  assert.equal(checkReport("failed", { kind: "waiting" }), "Update ready");
  assert.equal(checkReport("failed", { kind: "applying" }), "Updating…");
});
