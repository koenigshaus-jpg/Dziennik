// Auth dla publicznego API (/api/v1/*). Akceptuje DWA schematy w nagłówku
// `Authorization: Bearer <token>`:
//
// 1) API key — token zaczynający się od "sk_live_". Sprawdzany przez sha256
//    + lookup w tabeli `api_keys`. Aktualizuje `last_used_at` fire-and-forget.
// 2) Supabase JWT — access token z @supabase/auth. Walidowany przez
//    `supabase.auth.getUser(token)`.
//
// Funkcja rzuca `ApiAuthError` przy braku/błędnym tokenie — handler-wrapper
// łapie i zwraca 401.

import crypto from "node:crypto";
import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "./supabase-admin";

export const API_KEY_PREFIX = "sk_live_";
/** Ile pierwszych znaków zapisujemy do `prefix` (dla UI display). */
export const API_KEY_PREFIX_SHOW = 12;

export class ApiAuthError extends Error {
  constructor(message = "unauthorized") {
    super(message);
    this.name = "ApiAuthError";
  }
}

export interface AuthedUser {
  userId: string;
  via: "api_key" | "jwt";
}

export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generuje nowy klucz: `sk_live_<32 znaki base64url>`. */
export function generateApiKey(): string {
  const random = crypto.randomBytes(24).toString("base64url");
  return `${API_KEY_PREFIX}${random}`;
}

export async function getApiUser(req: Request | NextRequest): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) throw new ApiAuthError("missing_authorization_header");

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiAuthError("invalid_authorization_header");
  const token = match[1].trim();
  if (!token) throw new ApiAuthError("empty_token");

  const admin = getSupabaseAdmin();

  if (token.startsWith(API_KEY_PREFIX)) {
    const hash = hashApiKey(token);
    const { data, error } = await admin
      .from("api_keys")
      .select("id, user_id, revoked_at")
      .eq("hash", hash)
      .maybeSingle();

    if (error) throw new ApiAuthError("auth_lookup_failed");
    if (!data || data.revoked_at) throw new ApiAuthError("invalid_api_key");

    // Fire-and-forget update — nie blokuje requestu, błędy ignorujemy
    void admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => undefined);

    return { userId: data.user_id, via: "api_key" };
  }

  // Inaczej traktujemy jako Supabase JWT
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new ApiAuthError("invalid_jwt");
  return { userId: data.user.id, via: "jwt" };
}
