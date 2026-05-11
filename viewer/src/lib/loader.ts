import { parseInfraJson, type InfraJson } from "../types";
import { decodeShareData } from "./share";

const STORAGE_KEY = "inframap.lastJson";

export function saveToStorage(jsonText: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, jsonText);
  } catch {
    // ignore quota errors
  }
}

export function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function loadFromHash(): Promise<string | null> {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const data = params.get("data");
  if (!data) return null;
  return decodeShareData(data);
}

export interface LoadCallbacks {
  onJson: (jsonText: string, source: "drop" | "paste" | "hash" | "storage" | "sample") => void;
  onError: (message: string) => void;
}

export function attachDragAndDrop(target: HTMLElement, cb: LoadCallbacks): () => void {
  let depth = 0;
  const clear = () => {
    depth = 0;
    target.classList.remove("inframap-drop-active");
  };
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    depth++;
    target.classList.add("inframap-drop-active");
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  const onDragLeave = (e: DragEvent) => {
    depth--;
    // relatedTarget === null means the cursor left the window entirely
    if (depth <= 0 || e.relatedTarget === null) clear();
  };
  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    clear();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      cb.onJson(text, "drop");
    } catch (err) {
      cb.onError(`Failed to read file: ${(err as Error).message}`);
    }
  };

  target.addEventListener("dragenter", onDragEnter);
  target.addEventListener("dragover", onDragOver);
  target.addEventListener("dragleave", onDragLeave);
  target.addEventListener("drop", onDrop);
  window.addEventListener("dragend", clear);
  window.addEventListener("blur", clear);

  return () => {
    target.removeEventListener("dragenter", onDragEnter);
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("dragleave", onDragLeave);
    target.removeEventListener("drop", onDrop);
    window.removeEventListener("dragend", clear);
    window.removeEventListener("blur", clear);
  };
}

export function attachPaste(cb: LoadCallbacks): () => void {
  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    cb.onJson(text, "paste");
  };
  window.addEventListener("paste", onPaste);
  return () => window.removeEventListener("paste", onPaste);
}

export function tryParse(jsonText: string): { config?: InfraJson; error?: string } {
  try {
    return { config: parseInfraJson(jsonText) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
