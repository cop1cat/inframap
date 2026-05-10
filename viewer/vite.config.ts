import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  base: "./",
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
