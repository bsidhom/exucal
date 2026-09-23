import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

/**
 * Builds the service worker and tells it what to cache.
 *
 * The plugin adds `src/sw.ts` as a second entry point of the production
 * build, emitted unhashed as `sw.js` at the root of the output so that its
 * scope covers the whole site. Once the rest of the bundle is known, it
 * prepends a `__PRECACHE__` constant to the worker's code listing the URL of
 * every file in the build (the page, the hashed scripts and styles, and the
 * static assets copied from `public/`) along with a version derived from the
 * contents of all of them. Any change to the build therefore changes `sw.js`,
 * which is what makes browsers install the update.
 */
export function precache(): Plugin {
  const swEntry = "sw";
  const swFileName = `${swEntry}.js`;
  let config: ResolvedConfig;

  return {
    name: "precache",
    apply: "build",
    // Run after Vite's own build plugins so that `index.html` has been added
    // to the bundle by the time `generateBundle` runs.
    enforce: "post",
    config: () => ({
      build: {
        rollupOptions: {
          input: { index: "index.html", [swEntry]: "src/sw.ts" },
          output: {
            entryFileNames: (chunk) =>
              chunk.name === swEntry ? swFileName : "assets/[name]-[hash].js",
          },
        },
      },
    }),
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_options, bundle) {
      const sw = bundle[swFileName];
      if (sw?.type !== "chunk") {
        this.error(
          `Expected the bundle to contain the service worker chunk ${swFileName}.`,
        );
      }

      // Every file the build consists of, other than the worker itself, keyed
      // by the path it will be served from and mapped to its contents.
      const files = new Map<string, string | Uint8Array>();
      for (const [fileName, output] of Object.entries(bundle)) {
        if (fileName !== swFileName) {
          files.set(
            fileName,
            output.type === "chunk" ? output.code : output.source,
          );
        }
      }
      for (const fileName of listFiles(config.publicDir)) {
        files.set(fileName, readFileSync(join(config.publicDir, fileName)));
      }

      const hash = createHash("sha256");
      const urls: string[] = [];
      for (const fileName of [...files.keys()].sort()) {
        hash
          .update(fileName)
          .update("\0")
          .update(files.get(fileName)!)
          .update("\0");
        // The page is served from the site root, not from `/index.html`.
        urls.push(
          fileName === "index.html" ? config.base : config.base + fileName,
        );
      }
      const manifest = { version: hash.digest("hex").slice(0, 16), urls };

      sw.code = `const __PRECACHE__ = ${JSON.stringify(manifest)};\n${sw.code}`;
    },
  };
}

/** The paths of every file under `dir`, relative to it, using `/` separators. */
function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(dir, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    );
}
