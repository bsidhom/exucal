// Keeps scripts/cloud-setup.sh, the Claude Code cloud environment's setup
// script, in step with the repository files its pins mirror. The script is
// not read from the repository: the environment's settings hold a pasted
// copy of it, so a pin that drifts from package.json or pnpm-lock.yaml is
// noticed only when a cloud session starts with the wrong toolchain. This
// test fails `pnpm test` instead, and its messages say what to do: bump the
// pin at the top of the script, then paste the script into the
// environment's settings again (devdocs/development.md, "Cloud environment").
//
// What it checks:
//
// - NODE_VERSION lies in the Node.js line `engines.node` in package.json
//   requires (the major; the patch is the script's to choose).
// - PNPM_VERSION is exactly the `packageManager` version in package.json,
//   which is what pnpm itself enforces.
// - The two pnpm integrity strings are the ones pnpm-lock.yaml records for
//   `@pnpm/exe.linux-x64` and `@pnpm/exe.linux-arm64` at that version, so
//   the script verifies the binary against the same value `pnpm install`
//   would.
//
// The variables are read from the script's text with a regular expression
// per pin, not by running it: the script installs into /opt and must never
// run from a test.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const script = readFileSync(new URL("scripts/cloud-setup.sh", root), "utf8");
const lockfile = readFileSync(new URL("pnpm-lock.yaml", root), "utf8");
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as {
  readonly engines: { readonly node: string };
  readonly packageManager: string;
};

const REPASTE =
  'then paste scripts/cloud-setup.sh into the cloud environment\'s settings again (devdocs/development.md, "Cloud environment")';

/** The value assigned to `name` at the top of the script, `NAME="value"`. */
function pin(name: string): string {
  const match = new RegExp(`^${name}="([^"]*)"$`, "m").exec(script);
  assert.ok(match, `scripts/cloud-setup.sh does not assign ${name}`);
  return match[1]!;
}

/** The integrity string pnpm-lock.yaml records for the package `spec`. */
function lockedIntegrity(spec: string): string {
  const match = new RegExp(
    `^  '${spec.replace(/[.@/]/g, "\\$&")}':\\n    resolution: \\{integrity: ([^}]*)\\}`,
    "m",
  ).exec(lockfile);
  assert.ok(match, `pnpm-lock.yaml does not record ${spec}`);
  return match[1]!;
}

test("the setup script pins the Node.js line package.json requires", () => {
  const required = /^>=(\d+)\.\d+\.\d+$/.exec(packageJson.engines.node);
  assert.ok(required, `unexpected engines.node: ${packageJson.engines.node}`);
  const major = Number(required[1]);
  const pinned = pin("NODE_VERSION");
  const pinnedMajor = Number(pinned.split(".")[0]);
  assert.ok(
    Number.isInteger(pinnedMajor) && pinnedMajor >= major,
    `NODE_VERSION="${pinned}" is below the Node.js ${major} that package.json requires: bump it, ${REPASTE}`,
  );
});

test("the setup script pins the pnpm version package.json declares", () => {
  const declared = /^pnpm@(.+)$/.exec(packageJson.packageManager);
  assert.ok(
    declared,
    `unexpected packageManager: ${packageJson.packageManager}`,
  );
  assert.equal(
    pin("PNPM_VERSION"),
    declared[1],
    `PNPM_VERSION differs from package.json's packageManager: set it to ${declared[1]}, update the two PNPM_INTEGRITY strings from pnpm-lock.yaml, ${REPASTE}`,
  );
});

test("the setup script's pnpm integrity strings are the lockfile's", () => {
  const version = pin("PNPM_VERSION");
  for (const [name, arch] of [
    ["PNPM_INTEGRITY_X64", "x64"],
    ["PNPM_INTEGRITY_ARM64", "arm64"],
  ] as const) {
    const spec = `@pnpm/exe.linux-${arch}@${version}`;
    assert.equal(
      pin(name),
      lockedIntegrity(spec),
      `${name} is not what pnpm-lock.yaml records for ${spec}: copy the lockfile's value, ${REPASTE}`,
    );
  }
});
