import { execFileSync } from "node:child_process";
import type { Plugin } from "vite";

/**
 * Bakes the commit the app was built from into it, as `__BUILD_ID__`, so a
 * running copy can say which version of the code it is.
 *
 * The constant is replaced with a string literal by Vite's `define`, in
 * `vite build` and `vite dev` alike; `src/build-id.ts` declares it for the
 * app. Its value is what `resolveBuildId` finds: the full hash of the
 * commit, with `-dirty` after it when the working tree had uncommitted
 * changes, or `unknown` when there is no commit to name.
 *
 * The ID comes from git alone, never from the environment the build runs
 * in (a CI system's notion of the commit, say), so a build anywhere names
 * its commit the same way. Because the hash is part of the bundle, every
 * commit changes the build, and so the service worker's precache version
 * (vite-plugin-precache.ts): every deploy ships, and shows, its commit,
 * even one that changes only the build or the documentation.
 */
export function buildId(): Plugin {
  return {
    name: "build-id",
    config: () => ({
      define: {
        __BUILD_ID__: JSON.stringify(
          resolveBuildId(readGit, (message) => console.warn(message)),
        ),
      },
    }),
  };
}

/** Runs git with `args` in the current directory and returns its output, or throws. */
export type Git = (args: readonly string[]) => string;

/**
 * Works out the build ID: the hash git reports for `HEAD`, marked `-dirty`
 * if `git status` lists any change. When git names no commit (no git, or a
 * copy of the source without its history), the ID is `unknown` and `warn`
 * says why. A value that is not a hex hash is never used, so the constant is
 * always one of these three shapes and never text that could mean something
 * else.
 */
export function resolveBuildId(
  git: Git,
  warn: (message: string) => void,
): string {
  let head: string;
  let status: string;
  try {
    head = git(["rev-parse", "HEAD"]).trim();
    status = git(["status", "--porcelain"]);
  } catch (error) {
    warn(`The build ID is unknown: git failed: ${errorMessage(error)}`);
    return UNKNOWN_BUILD_ID;
  }
  if (!isCommitHash(head)) {
    warn(`The build ID is unknown: git named HEAD as ${head}`);
    return UNKNOWN_BUILD_ID;
  }
  return status.trim() === "" ? head : `${head}-dirty`;
}

/** The build ID when no commit can be named. */
export const UNKNOWN_BUILD_ID = "unknown";

/** Whether `text` is a full SHA-1 or SHA-256 commit hash. */
function isCommitHash(text: string): boolean {
  return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(text);
}

function readGit(args: readonly string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
