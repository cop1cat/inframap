import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// `base` controls how asset URLs in the built index.html are prefixed.
//   "./" (relative) — required for GitHub Pages / sub-path deploys.
//   "/"  (absolute) — required for nginx/Docker SPA fallback at root.
// We default to "/" (the Docker target) and let CI override via INFRAMAP_BASE
// when publishing to a sub-path.
const base = process.env.INFRAMAP_BASE ?? "/";

export default defineConfig({
  plugins: [svelte()],
  base,
  build: {
    outDir: "dist",
    target: "es2022",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          cytoscape: [
            "cytoscape",
            "cytoscape-cose-bilkent",
            "cytoscape-svg",
            "cytoscape-navigator",
          ],
          tippy: ["tippy.js"],
        },
      },
    },
  },
});
