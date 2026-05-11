// Persist node positions per JSON content hash, so manual layout survives reloads.

import type { Core } from "cytoscape";

const KEY_PREFIX = "inframap.pos.";
const MAX_ENTRIES = 16;

export type Positions = Record<string, { x: number; y: number }>;

interface Stored {
  ts: number;
  positions: Positions;
}

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

function readStored(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored | Positions;
    // Back-compat: older entries were stored as bare Positions map.
    if (parsed && typeof parsed === "object" && "positions" in parsed && "ts" in parsed) {
      return parsed as Stored;
    }
    return { ts: 0, positions: parsed as Positions };
  } catch {
    return null;
  }
}

export function loadPositions(key: string): Positions | null {
  const s = readStored(key);
  if (!s) return null;
  // Touch access time so this entry survives the next prune.
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), positions: s.positions }));
  } catch {
    // ignore quota
  }
  return s.positions;
}

export function savePositions(key: string, positions: Positions): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), positions }));
    pruneOldEntries();
  } catch {
    // ignore quota
  }
}

function pruneOldEntries(): void {
  const entries: { key: string; ts: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const s = readStored(k);
    entries.push({ key: k, ts: s?.ts ?? 0 });
  }
  if (entries.length <= MAX_ENTRIES) return;
  entries.sort((a, b) => a.ts - b.ts);
  for (const e of entries.slice(0, entries.length - MAX_ENTRIES)) {
    try {
      localStorage.removeItem(e.key);
    } catch {
      // ignore
    }
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

export function clearPositions(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
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
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    cy.off("position", "node", schedule);
    cy.off("free", "node", schedule);
  };
}
