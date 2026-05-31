import crypto from "node:crypto";

export function newId(): string {
  // 16 bajtów = 22 znaki base64url. Wystarczy.
  return crypto.randomBytes(16).toString("base64url");
}
