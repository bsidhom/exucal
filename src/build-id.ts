/**
 * The commit this copy of the app was built from, baked in at build time by
 * `vite-plugin-build-id.ts`: a full commit hash, with `-dirty` after it if
 * the working tree had uncommitted changes, or `unknown`.
 */
export const BUILD_ID: string = __BUILD_ID__;

/**
 * The build ID as the app shows it: the hash cut to its first twelve
 * digits, which is plenty to find the commit, with the `-dirty` mark kept.
 */
export const SHORT_BUILD_ID: string = BUILD_ID.replace(
  /^([0-9a-f]{12})[0-9a-f]+/,
  "$1",
);

declare const __BUILD_ID__: string;
