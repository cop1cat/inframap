// gzip + base64url encoding for sharing infra.json via URL fragment.

// Hard cap on decompressed payload to prevent gzip-bomb DoS via crafted share links.
// 8 MB of JSON is far beyond any realistic infra graph; the encoded URL would already
// be too large to fit in the address bar long before hitting this in honest usage.
const MAX_DECOMPRESSED_BYTES = 8 * 1024 * 1024;

export class ShareDecodeError extends Error {}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const blob = new Blob([data as BlobPart]);
  const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function decompressBounded(data: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const blob = new Blob([data as BlobPart]);
  const reader = blob.stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ShareDecodeError(
          `Decompressed payload exceeds ${maxBytes} bytes — refusing to load (possible gzip bomb).`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export async function encodeShareData(json: string): Promise<string> {
  const input = new TextEncoder().encode(json);
  const gz = await compress(input);
  return bytesToBase64Url(gz);
}

export async function decodeShareData(encoded: string): Promise<string> {
  let gz: Uint8Array;
  try {
    gz = base64UrlToBytes(encoded);
  } catch {
    throw new ShareDecodeError("Invalid base64url payload");
  }
  // Bound compressed input too: 2 MB compressed is already absurd for our content.
  if (gz.byteLength > 2 * 1024 * 1024) {
    throw new ShareDecodeError("Compressed payload too large");
  }
  const raw = await decompressBounded(gz, MAX_DECOMPRESSED_BYTES);
  return new TextDecoder().decode(raw);
}

export function buildShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.hash = `data=${encoded}`;
  url.search = "";
  return url.toString();
}
