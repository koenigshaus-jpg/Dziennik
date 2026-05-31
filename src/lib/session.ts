// Token helpers — działają zarówno w Edge runtime (middleware) jak i w Node.
// Używamy WebCrypto (globalne `crypto`), żeby uniknąć importu node:crypto.

export const SESSION_COOKIE_NAME = "dziennik_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dni

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = `ok.${Date.now()}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toHex(sig)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret: string
): Promise<boolean> {
  if (!token || !secret || secret.length < 16) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [marker, ts, sigHex] = parts;
  const key = await importKey(secret);
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${marker}.${ts}`)
  );
  return timingSafeEqualHex(sigHex, toHex(expected));
}
