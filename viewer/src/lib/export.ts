import type { Core } from "cytoscape";
import "./cy-extensions";
import { applyThemeColors } from "./graph";
import type { Theme } from "./theme";

interface CyWithSvg extends Core {
  svg(opts?: { scale?: number; full?: boolean; bg?: string }): string;
}

export function downloadSvg(cy: Core, filename = "inframap.svg", exportTheme?: Theme): void {
  const cyx = cy as CyWithSvg;
  if (typeof cyx.svg !== "function") {
    console.error("cytoscape-svg extension not registered; falling back to PNG");
    downloadPng(cy, filename.replace(/\.svg$/, ".png"), exportTheme);
    return;
  }
  withTheme(cy, exportTheme, () => {
    try {
      const svg = cyx.svg({ scale: 1, full: true, bg: "transparent" });
      triggerDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
    } catch (e) {
      console.error("SVG export failed:", e);
    }
  });
}

function withTheme(cy: Core, exportTheme: Theme | undefined, fn: () => void): void {
  if (!exportTheme) {
    fn();
    return;
  }
  const root = document.documentElement;
  const original = root.dataset.theme;
  root.dataset.theme = exportTheme;
  // Allow CSS variables to settle, re-read them, then export.
  applyThemeColors(cy);
  try {
    fn();
  } finally {
    if (original !== undefined) root.dataset.theme = original;
    else delete root.dataset.theme;
    applyThemeColors(cy);
  }
}

export function downloadPng(cy: Core, filename = "inframap.png", exportTheme?: Theme): void {
  withTheme(cy, exportTheme, () => {
    const dataUrl = cy.png({ scale: 2, full: true, bg: "transparent" });
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => triggerDownload(blob, filename));
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
