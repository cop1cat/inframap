// gzip + base64url encoding for sharing infra.json via URL fragment.

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

async function streamThrough(
  data: Uint8Array,
  transform: GenericTransformStream,
): Promise<Uint8Array> {
  const blob = new Blob([data as BlobPart]);
  const stream = blob.stream().pipeThrough(transform);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodeShareData(json: string): Promise<string> {
  const input = new TextEncoder().encode(json);
  const gz = await streamThrough(input, new CompressionStream("gzip"));
  return bytesToBase64Url(gz);
}

export async function decodeShareData(encoded: string): Promise<string> {
  const gz = base64UrlToBytes(encoded);
  const raw = await streamThrough(gz, new DecompressionStream("gzip"));
  return new TextDecoder().decode(raw);
}

export function buildShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.hash = `data=${encoded}`;
  url.search = "";
  return url.toString();
}
