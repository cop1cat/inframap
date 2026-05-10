import type { ServiceKind } from "../types";

export interface KindStyle {
  shape:
    | "ellipse"
    | "round-rectangle"
    | "rectangle"
    | "diamond"
    | "hexagon"
    | "pentagon"
    | "octagon";
  width: number;
  height: number;
  /** Lucide icon name; rendered via SVG → data URI for cytoscape background-image. */
  icon: string | null;
  /** Border style for un-highlighted state. */
  borderStyle: "solid" | "dashed" | "dotted";
}

export const KIND_STYLES: Record<ServiceKind, KindStyle> = {
  service:  { shape: "ellipse",         width: 30, height: 30, icon: null,             borderStyle: "solid"  },
  database: { shape: "round-rectangle", width: 32, height: 28, icon: "database",       borderStyle: "solid"  },
  cache:    { shape: "hexagon",         width: 34, height: 30, icon: "zap",            borderStyle: "solid"  },
  queue:    { shape: "round-rectangle", width: 36, height: 24, icon: "message-square", borderStyle: "solid"  },
  gateway:  { shape: "diamond",         width: 34, height: 34, icon: "door-open",      borderStyle: "solid"  },
  worker:   { shape: "round-rectangle", width: 30, height: 30, icon: "cpu",            borderStyle: "solid"  },
  external: { shape: "ellipse",         width: 30, height: 30, icon: "globe",          borderStyle: "dashed" },
  storage:  { shape: "round-rectangle", width: 32, height: 28, icon: "hard-drive",     borderStyle: "solid"  },
  function: { shape: "pentagon",        width: 30, height: 30, icon: "zap",            borderStyle: "solid"  },
};

export function styleForKind(kind: ServiceKind | undefined): KindStyle {
  return KIND_STYLES[kind ?? "service"] ?? KIND_STYLES.service;
}

/** Encode a Lucide-style SVG path as a data URI for cytoscape `background-image`. */
export function iconDataUri(name: string, color: string): string {
  const path = LUCIDE_PATHS[name];
  if (!path) return "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// Hand-picked Lucide icon paths (https://lucide.dev). Inlined to avoid
// pulling 1000+ icons into the bundle.
const LUCIDE_PATHS: Record<string, string> = {
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  "message-square":
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  "door-open":
    '<path d="M11 20H2"/><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"/><path d="M11 4H8a2 2 0 0 0-2 2v14"/><path d="M14 12h.01"/><path d="M22 20h-3"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  "hard-drive":
    '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
};
