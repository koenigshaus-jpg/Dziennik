// OAuth Dynamic Client Registration (RFC7591) + lookup po client_id.
// `oauth_clients` zarządzane przez service-role key.

import crypto from "node:crypto";

import { getSupabaseAdmin } from "@/lib/api/supabase-admin";
import { DEFAULT_SCOPE } from "./scopes";

export interface OAuthClient {
  id: string;
  client_id: string;
  client_secret_hash: string;
  client_name: string;
  redirect_uris: string[];
  scope: string;
  created_at: string;
}

export interface RegisterClientInput {
  client_name: string;
  redirect_uris: string[];
}

export interface RegisterClientResult {
  client_id: string;
  client_secret: string;          // ZWRACANY TYLKO RAZ
  client_name: string;
  redirect_uris: string[];
  scope: string;
  created_at: string;
}

function generateClientId(): string {
  // 16 bajtów base64url → 22 znaki, prefix `client_`
  return "client_" + crypto.randomBytes(16).toString("base64url");
}

function generateClientSecret(): string {
  // 32 bajty base64url → 43 znaki, prefix `cs_` żeby było jasne co to za string
  return "cs_" + crypto.randomBytes(32).toString("base64url");
}

export function hashClientSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function registerClient(input: RegisterClientInput): Promise<RegisterClientResult> {
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const hash = hashClientSecret(clientSecret);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_clients")
    .insert({
      client_id: clientId,
      client_secret_hash: hash,
      client_name: input.client_name.slice(0, 80),
      redirect_uris: input.redirect_uris,
      scope: DEFAULT_SCOPE,
    })
    .select("*")
    .single<OAuthClient>();

  if (error || !data) {
    throw new Error(`oauth_client_create_failed: ${error?.message ?? "unknown"}`);
  }

  return {
    client_id: data.client_id,
    client_secret: clientSecret,       // jednorazowo
    client_name: data.client_name,
    redirect_uris: data.redirect_uris,
    scope: data.scope,
    created_at: data.created_at,
  };
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle<OAuthClient>();
  if (error) return null;
  return data;
}

/** Walidacja client_secret przy /token request. */
export function verifyClientSecret(client: OAuthClient, providedSecret: string): boolean {
  if (!providedSecret) return false;
  const provided = hashClientSecret(providedSecret);
  // constant-time
  return crypto.timingSafeEqual(
    Buffer.from(provided, "hex"),
    Buffer.from(client.client_secret_hash, "hex")
  );
}

/** Czy redirect_uri jest na liście dozwolonych dla tego klienta (exact match). */
export function isValidRedirectUri(client: OAuthClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}
