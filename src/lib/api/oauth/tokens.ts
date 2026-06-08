// Access tokens = JWT (HS256, signed `OAUTH_JWT_SECRET`).
// Refresh tokens = opaque strings stored as sha256 hash w `oauth_refresh_tokens`.
//
// Rotacja: każdy refresh→token wydaje nowy refresh i marker `rotated_from`
// na nowym (audit trail). Stary jest usuwany.

import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { getSupabaseAdmin } from "@/lib/api/supabase-admin";

export const ACCESS_TOKEN_TTL_SECONDS = 3600;       // 1h
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 3600; // 30d

function jwtSecretBytes(): Uint8Array {
  const s = process.env.OAUTH_JWT_SECRET;
  if (!s) throw new Error("OAUTH_JWT_SECRET nie jest ustawione.");
  return new TextEncoder().encode(s);
}

export interface AccessTokenClaims extends JWTPayload {
  sub: string;          // user_id
  aud: string;          // canonical MCP server URI (RFC8707 audience binding)
  scope: string;
  client_id: string;
}

export interface IssueAccessTokenInput {
  user_id: string;
  client_id: string;
  scope: string;
  audience: string;     // np. "https://dziennik-xi.vercel.app/api/mcp"
  issuer: string;       // np. "https://dziennik-xi.vercel.app"
}

export async function issueAccessToken(input: IssueAccessTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ scope: input.scope, client_id: input.client_id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.user_id)
    .setAudience(input.audience)
    .setIssuer(input.issuer)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(jwtSecretBytes());
  return token;
}

export async function verifyAccessToken(token: string, audience: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, jwtSecretBytes(), {
    audience,
  });
  return payload as AccessTokenClaims;
}

// ───────────── Refresh tokens ─────────────

export interface IssueRefreshTokenInput {
  user_id: string;
  client_id: string;
  scope: string;
  rotated_from?: string | null;
}

function generateOpaque(): string {
  return crypto.randomBytes(40).toString("base64url");
}

function hashRefresh(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(input: IssueRefreshTokenInput): Promise<string> {
  const token = generateOpaque();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("oauth_refresh_tokens").insert({
    token_hash: hashRefresh(token),
    client_id: input.client_id,
    user_id: input.user_id,
    scope: input.scope,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    rotated_from: input.rotated_from ?? null,
  });
  if (error) throw new Error(`refresh_issue_failed: ${error.message}`);
  return token;
}

export interface RefreshTokenRow {
  token_hash: string;
  client_id: string;
  user_id: string;
  scope: string;
  expires_at: string;
}

/** Walidacja + jednoczesna ROTACJA: zwraca dane refresh-tokena i KASUJE go z bazy. */
export async function consumeRefreshToken(
  token: string,
  client_id: string
): Promise<RefreshTokenRow | null> {
  const hash = hashRefresh(token);
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token_hash", hash)
    .eq("client_id", client_id)
    .maybeSingle<RefreshTokenRow>();
  if (!data) return null;

  await supabase.from("oauth_refresh_tokens").delete().eq("token_hash", hash);

  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}
