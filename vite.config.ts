import { defineConfig } from "vite";
import { icons } from "./vite-plugin-icons.ts";
import { precache } from "./vite-plugin-precache.ts";

export default defineConfig({
  plugins: [
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
    precache(),
  ],
});
