// verifyToken dla mcp-handler. Akceptuje:
//   1. sk_live_… → reuse istniejący `getApiUser` z /api/v1 (Bearer API key)
//   2. JWT → walidacja przez `verifyAccessToken` (OAuth flow z Claude.ai itp.)
//
// Zwraca AuthInfo z `extra.userId` używane potem w mcp-tools.

import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { ApiAuthError, API_KEY_PREFIX, hashApiKey } from "@/lib/api/auth";
import { getSupabaseAdmin } from "@/lib/api/supabase-admin";
import { verifyAccessToken } from "@/lib/api/oauth/tokens";

export async function verifyMcpBearer(
  bearerToken: string | undefined,
  audience: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  // (1) sk_live_… → API key z /api/v1
  if (bearerToken.startsWith(API_KEY_PREFIX)) {
    return await verifyApiKey(bearerToken);
  }

  // (2) JWT → OAuth access token
  try {
    const claims = await verifyAccessToken(bearerToken, audience);
    return {
      token: bearerToken,
      scopes: (claims.scope ?? "").split(/\s+/).filter(Boolean),
      clientId: claims.client_id,
      extra: { userId: claims.sub },
    };
  } catch {
    return undefined;
  }
}

async function verifyApiKey(token: string): Promise<AuthInfo | undefined> {
  const hash = hashApiKey(token);
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("hash", hash)
    .maybeSingle();

  if (!data || data.revoked_at) return undefined;

  // fire-and-forget update last_used_at
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return {
    token,
    scopes: ["dziennik:rw"],
    clientId: `api_key:${data.id}`,
    extra: { userId: data.user_id },
  };
}

// Re-export dla wygody
export { ApiAuthError };
