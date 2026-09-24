import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { rasterizeSvg } from "./rasterize-svg.ts";

/** A PNG to render from an SVG icon. */
export interface RasterIcon {
  /** The SVG to render, as a path relative to the project root. */
  source: string;
  /** Where to write the PNG, as a path relative to the output root. */
  fileName: string;
  /** The width and height of the PNG in pixels. */
  size: number;
}

/**
 * Renders PNG icons from SVG icons at build time.
 *
 * Some platforms cannot use an SVG icon: Safari needs a PNG
 * `apple-touch-icon` for the iOS home screen. Rather than committing PNGs
 * that would go stale whenever the SVG changes, this plugin renders them on
 * every build (with `rasterize-svg.ts`, which needs no dependencies) and adds
 * them to the bundle, so they land in `dist` next to everything else. The
 * development server renders them on request instead, so the icons are
 * served under the same URLs during `vite dev`, always from the current SVG.
 */
export function icons(icons: RasterIcon[]): Plugin {
  let config: ResolvedConfig;

  const render = (icon: RasterIcon): Uint8Array => {
    const path = resolve(config.root, icon.source);
    try {
      return rasterizeSvg(readFileSync(path, "utf8"), {
        width: icon.size,
        height: icon.size,
      });
    } catch (error) {
      throw new Error(
        `Could not render ${icon.source} as ${icon.fileName}: ${errorMessage(error)}`,
        {
          cause: error,
        },
      );
    }
  };

  return {
    name: "icons",
    configResolved(resolved) {
      config = resolved;
    },
    buildStart() {
      if (config.command !== "build") {
        return;
      }
      for (const icon of icons) {
        // Re-render when the SVG changes under `vite build --watch`.
        this.addWatchFile(resolve(config.root, icon.source));
        this.emitFile({
          type: "asset",
          fileName: icon.fileName,
          source: render(icon),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const { pathname } = new URL(request.url ?? "/", "http://localhost");
        const icon = icons.find(
          (icon) => config.base + icon.fileName === pathname,
        );
        if (icon === undefined) {
          next();
          return;
        }
        try {
          const png = render(icon);
          response.setHeader("Content-Type", "image/png");
          response.setHeader("Cache-Control", "no-cache");
          response.end(png);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
