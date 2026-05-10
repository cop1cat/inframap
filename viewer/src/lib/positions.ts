// Persist node positions per JSON content hash, so manual layout survives reloads.

import type { Core } from "cytoscape";

const KEY_PREFIX = "inframap.pos.";
const MAX_ENTRIES = 16; // LRU cap

export type Positions = Record<string, { x: number; y: number }>;

async function hashJson(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getStorageKey(jsonText: string): Promise<string> {
  return KEY_PREFIX + (await hashJson(jsonText));
}

export function loadPositions(key: string): Positions | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Positions;
  } catch {
    return null;
  }
}

export function savePositions(key: string, positions: Positions): void {
  try {
    localStorage.setItem(key, JSON.stringify(positions));
    pruneOldEntries();
  } catch {
    // ignore quota
  }
}

function pruneOldEntries(): void {
  const entries: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) entries.push(k);
  }
  if (entries.length <= MAX_ENTRIES) return;
  // remove oldest by lexical order (no per-entry timestamp; good enough)
  entries.sort();
  for (const k of entries.slice(0, entries.length - MAX_ENTRIES)) {
    localStorage.removeItem(k);
  }
}

export function applyPositions(cy: Core, positions: Positions): void {
  cy.nodes().forEach((n) => {
    const p = positions[n.id()];
    if (p) n.position(p);
  });
}

export function readPositions(cy: Core): Positions {
  const out: Positions = {};
  cy.nodes(":childless").forEach((n) => {
    const p = n.position();
    out[n.id()] = { x: p.x, y: p.y };
  });
  return out;
}

export function attachPositionPersistence(cy: Core, key: string): () => void {
  let timer: number | null = null;
  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = window.setTimeout(() => {
      savePositions(key, readPositions(cy));
      timer = null;
    }, 400);
  };
  cy.on("position", "node", schedule);
  cy.on("free", "node", schedule);
  return () => {
    if (timer !== null) clearTimeout(timer);
    cy.off("position", "node", schedule);
    cy.off("free", "node", schedule);
  };
}
