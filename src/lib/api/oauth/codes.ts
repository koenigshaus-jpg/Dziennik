// Authorization codes — jednorazowe, krótkie (60s).
// Wymiana code → access_token w /oauth/token.

import crypto from "node:crypto";

import { getSupabaseAdmin } from "@/lib/api/supabase-admin";

export const CODE_TTL_SECONDS = 60;

export interface AuthorizationCodeInput {
  client_id: string;
  user_id: string;
  redirect_uri: string;
  code_challenge: string;          // PKCE S256
  scope: string;
  resource?: string;                // RFC8707
}

export interface AuthorizationCode extends AuthorizationCodeInput {
  code: string;
  expires_at: string;
  created_at: string;
}

function generateCode(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function issueAuthorizationCode(
  input: AuthorizationCodeInput
): Promise<{ code: string; expires_at: Date }> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("oauth_authorization_codes").insert({
    code,
    client_id: input.client_id,
    user_id: input.user_id,
    redirect_uri: input.redirect_uri,
    code_challenge: input.code_challenge,
    scope: input.scope,
    resource: input.resource ?? null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error(`code_issue_failed: ${error.message}`);
  return { code, expires_at: expiresAt };
}

/** Pobiera kod i USUWA go (one-time use). Zwraca null jeśli nie istnieje lub wygasł. */
export async function consumeAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const supabase = getSupabaseAdmin();
  // 1) SELECT
  const { data } = await supabase
    .from("oauth_authorization_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle<AuthorizationCode>();
  if (!data) return null;

  // 2) DELETE niezależnie od ważności — żeby wykluczyć replay
  await supabase.from("oauth_authorization_codes").delete().eq("code", code);

  // 3) Walidacja expiry po fakcie
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

/** Walidacja PKCE: SHA256(verifier) base64url-encoded == challenge. */
export function verifyPkce(codeChallenge: string, codeVerifier: string): boolean {
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }
  const hash = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}
