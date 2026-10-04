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
// The repository's code is TypeScript in `.ts` files, which the projects
// check. Every other extension that Node.js could run or TypeScript could
// check (`.js`, `.mjs`, `.cjs`, `.jsx`, `.tsx`, `.mts`, `.cts`) is in no
// project's patterns, so a file of one fails here as unexpected, rather
// than going unchecked because nothing looked for it; one that is wanted
// needs the projects' patterns and this test widened together.
//
// The files are read from git and from tsc, each run with an argument
// array and no shell. git separates its paths with NUL bytes (`-z`), the
// one byte no path can contain, and writes them unquoted. tsc lists a
// project's files one per line and has no such option, so every path is
// first checked for control characters: a path with a line break in it
// would be split, and could neither be matched against tsc's list nor
// belong in the repository. The projects are listed by tsc itself
// (`--listFilesOnly`), so the test agrees with what `tsc -b` checks
// whatever the patterns say; it reads the references from tsconfig.json,
// so a new project is covered without a change here.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("./", import.meta.url));

/** A path's extension that marks it as TypeScript the projects check: `.ts`, `.d.ts` included. */
const CHECKED = /\.ts$/;

/** The extensions of code that Node.js could run or TypeScript check, other than `.ts`. */
const OTHER_CODE = /\.(?:js|mjs|cjs|jsx|tsx|mts|cts)$/;

/** Any control character: C0, DEL and C1. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * Every file in the working tree that git tracks or would track (untracked
 * files it does not ignore), as paths relative to the root, read
 * NUL-separated. A tracked file deleted from the working tree is left out,
 * since no project can check it.
 */
function repositoryFiles(): string[] {
  const output = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const paths = output.split("\0").filter((path) => path !== "");
  return [...new Set(paths)].filter((path) => existsSync(`${root}${path}`));
}

/** The projects tsconfig.json references, as paths relative to the root. */
function projects(): string[] {
  const text = readFileSync(`${root}tsconfig.json`, "utf8");
  return [...text.matchAll(/"path":\s*"([^"]+)"/g)].map((m) => m[1]!);
}

/**
 * The files under the root that the project at `path` checks, relative to
 * the root. tsc writes one absolute path per line; the files outside the
 * root (TypeScript's own libraries) are left out.
 */
function checkedBy(path: string): string[] {
  const output = execFileSync(
    process.execPath,
    [`${root}node_modules/typescript/bin/tsc`, "-p", path, "--listFilesOnly"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return output
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.startsWith(root))
    .map((line) => line.slice(root.length));
}

test("no path in the repository contains a control character", () => {
  const unsafe = repositoryFiles().filter((path) => CONTROL.test(path));
  assert.deepEqual(
    unsafe.map((path) => JSON.stringify(path)),
    [],
    "A path with a control character in it cannot be listed one per line, " +
      "as tsc lists the files it checks; rename it.",
  );
});

test("the repository's code is TypeScript in .ts files", () => {
  const other = repositoryFiles().filter((path) => OTHER_CODE.test(path));
  assert.deepEqual(
    other,
    [],
    `${other.join(", ")}: no project checks this kind of file. Write the ` +
      "code as a .ts file, or widen the projects' patterns and this test's " +
      "together.",
  );
});

test("every .ts file is checked by a project of tsconfig.json", () => {
  const files = repositoryFiles();
  // The comparison below is line-based on tsc's side, so it is sound only
  // for paths without control characters, which the first test requires.
  const comparable = files.filter((path) => !CONTROL.test(path));
  const listed = projects();
  assert.ok(listed.length > 0, "tsconfig.json references no projects");
  const checked = new Set(listed.flatMap(checkedBy));
  const unchecked = comparable.filter(
    (path) => CHECKED.test(path) && !checked.has(path),
  );
  assert.deepEqual(
    unchecked,
    [],
    `No project checks ${unchecked.join(", ")}. A file that runs in Node.js ` +
      "is checked by tsconfig.node.json, whose patterns match it unless it " +
      "is excluded there as browser-only; a browser file belongs to " +
      "tsconfig.app.json, and the service worker to tsconfig.sw.json.",
  );
});
