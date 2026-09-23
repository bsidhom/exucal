import { defineConfig } from "vite";
import { precache } from "./vite-plugin-precache.ts";

export default defineConfig({
  plugins: [precache()],
});
