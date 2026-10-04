// Keeps every TypeScript file in the repository under some type-checking
// program. `pnpm typecheck` (`tsc -b`) checks the projects tsconfig.json
// references, each the files its `include` matches and everything they
// import; a composite project fails (TS6307) on an imported file its
// `include` does not match, so an import can never escape the check. A file
// nothing imports can: a test or a sweep is an entry point, and if no
// project's `include` matches it, `node --test` still runs it, since Node
// strips types without checking them, and its type errors go unseen. This
// test closes that gap, failing `pnpm test` on any tracked or new file
// (untracked files that git does not ignore count, so the failure comes
// before the commit) that no project checks, and naming what to do.
//
// The projects are listed by tsc itself (`--listFilesOnly`), so the test
// agrees with what `tsc -b` checks whatever the patterns say; it reads the
// references from tsconfig.json, so a new project is covered without a
// change here.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("./", import.meta.url));

/** The projects tsconfig.json references, as paths relative to the root. */
function projects(): string[] {
  const text = readFileSync(`${root}tsconfig.json`, "utf8");
  return [...text.matchAll(/"path":\s*"([^"]+)"/g)].map((m) => m[1]!);
}

/** The files the project at `path` checks, relative to the root. */
function checkedBy(path: string): string[] {
  const output = execFileSync(
    process.execPath,
    [`${root}node_modules/typescript/bin/tsc`, "-p", path, "--listFilesOnly"],
    { cwd: root, encoding: "utf8" },
  );
  return output
    .split("\n")
    .filter((line) => line !== "" && !line.includes("/node_modules/"))
    .map((line) => (line.startsWith(root) ? line.slice(root.length) : line));
}

/** The TypeScript files git tracks, or would track: untracked ones it does not ignore. */
function typeScriptFiles(): string[] {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "*.ts",
      "*.mts",
      "*.cts",
      "*.tsx",
    ],
    { cwd: root, encoding: "utf8" },
  );
  return output.split("\n").filter((line) => line !== "");
}

test("every TypeScript file is checked by a project of tsconfig.json", () => {
  const listed = projects();
  assert.ok(listed.length > 0, "tsconfig.json references no projects");
  const checked = new Set(listed.flatMap(checkedBy));
  const unchecked = typeScriptFiles().filter((file) => !checked.has(file));
  assert.deepEqual(
    unchecked,
    [],
    `No project checks ${unchecked.join(", ")}. A file that runs in Node.js ` +
      "is checked by tsconfig.node.json, whose patterns match it unless it " +
      "is excluded there as browser-only; a browser file belongs to " +
      "tsconfig.app.json, and the service worker to tsconfig.sw.json.",
  );
});
