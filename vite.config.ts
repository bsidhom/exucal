import { defineConfig } from "vite";
import { buildId } from "./vite-plugin-build-id.ts";
import { icons } from "./vite-plugin-icons.ts";
import { precache } from "./vite-plugin-precache.ts";

export default defineConfig({
  plugins: [
    buildId(),
    icons([
      // Safari ignores the SVG icons in the manifest and needs a PNG for the
      // iOS home screen. iOS rounds the corners itself and shows transparent
      // pixels as black, so the icon is rendered from the maskable variant,
      // which fills its square and keeps its content inside the safe zone.
      // 180 pixels is the largest size iOS uses (60 points at 3x).
      {
        source: "public/icons/icon-maskable.svg",
        fileName: "apple-touch-icon.png",
        size: 180,
      },
    ]),
    precache({
      // Icons are not worth precaching. The browser or OS fetches them when
      // the app is installed, while the user is online, and keeps its own
      // copy with the installed app; the page itself never requests them. In
      // the precache they would cost every visitor a download on first load
      // (an icon set with several sizes can outweigh the app itself) and a
      // service worker update on every icon change, for nothing. The favicon
      // stays in: the browser asks for it on every page load.
      exclude: (fileName) =>
        fileName === "apple-touch-icon.png" || fileName.startsWith("icons/"),
    }),
  ],
});
