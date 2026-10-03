import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UNKNOWN_BUILD_ID,
  resolveBuildId,
  type Git,
} from "./vite-plugin-build-id.ts";

const sha1 = "0123456789abcdef0123456789abcdef01234567";

/** A git that answers `rev-parse HEAD` with `head` and `status` with `status`. */
function fakeGit(head: string, status = ""): Git {
  return (args) => {
    if (args[0] === "rev-parse") return `${head}\n`;
    if (args[0] === "status") return status;
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
}

const noGit: Git = () => {
  throw new Error("spawn git ENOENT");
};

/** Resolves the build ID and collects the warnings it gives. */
function resolve(git: Git): { id: string; warnings: string[] } {
  const warnings: string[] = [];
  const id = resolveBuildId(git, (message) => warnings.push(message));
  return { id, warnings };
}

test("git's HEAD is the build ID", () => {
  assert.deepEqual(resolve(fakeGit(sha1)), { id: sha1, warnings: [] });
});

test("uncommitted changes mark the build ID dirty", () => {
  assert.deepEqual(resolve(fakeGit(sha1, " M src/app-shell.ts\n")), {
    id: `${sha1}-dirty`,
    warnings: [],
  });
});

test("without git the build ID is unknown, with a warning", () => {
  const { id, warnings } = resolve(noGit);
  assert.equal(id, UNKNOWN_BUILD_ID);
  assert.match(warnings[0] ?? "", /ENOENT/);
});

test("a HEAD that is not a hash gives an unknown build ID", () => {
  for (const head of ["", "HEAD", "abc1234", `${sha1}x`]) {
    assert.equal(resolve(fakeGit(head)).id, UNKNOWN_BUILD_ID, head);
  }
});
