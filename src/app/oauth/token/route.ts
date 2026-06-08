// OAuth 2.1 token endpoint. Obsługuje grant_types:
//   - authorization_code (z PKCE verifier)
//   - refresh_token (z rotacją)
//
// Body: form-encoded (application/x-www-form-urlencoded), zgodnie z OAuth 2.1.

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import {
  getClient,
  verifyClientSecret,
} from "@/lib/api/oauth/clients";
import {
  consumeAuthorizationCode,
  verifyPkce,
} from "@/lib/api/oauth/codes";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  consumeRefreshToken,
  issueAccessToken,
  issueRefreshToken,
} from "@/lib/api/oauth/tokens";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return tokenError("invalid_request", "Body musi być x-www-form-urlencoded.", 400);
  }

  const grantType = str(form.get("grant_type"));
  const clientId = str(form.get("client_id"));
  const clientSecret = str(form.get("client_secret"));

  if (!grantType) return tokenError("invalid_request", "Brak grant_type.", 400);
  if (!clientId) return tokenError("invalid_request", "Brak client_id.", 400);

  const client = await getClient(clientId);
  if (!client) return tokenError("invalid_client", "Nieznany client_id.", 401);

  // Authentication: confidential (client_secret) lub public (PKCE-only — bez secret)
  const hasSecret = !!clientSecret;
  if (hasSecret && !verifyClientSecret(client, clientSecret)) {
    return tokenError("invalid_client", "Niepoprawny client_secret.", 401);
  }

  // ── audience (resource server URI) ──
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const issuer = `${proto}://${host}`;
  const audience = `${issuer}/api/mcp`;

  if (grantType === "authorization_code") {
    return await handleAuthorizationCode({
      client_id: clientId,
      code: str(form.get("code")),
      redirect_uri: str(form.get("redirect_uri")),
      code_verifier: str(form.get("code_verifier")),
      audience,
      issuer,
    });
  }

  if (grantType === "refresh_token") {
    return await handleRefreshToken({
      client_id: clientId,
      refresh_token: str(form.get("refresh_token")),
      audience,
      issuer,
    });
  }

  return tokenError("unsupported_grant_type", `Niewspierany grant_type: ${grantType}`, 400);
}

// ── authorization_code ──

async function handleAuthorizationCode(opts: {
  client_id: string;
  code: string | null;
  redirect_uri: string | null;
  code_verifier: string | null;
  audience: string;
  issuer: string;
}): Promise<Response> {
  if (!opts.code) return tokenError("invalid_request", "Brak code.", 400);
  if (!opts.redirect_uri) return tokenError("invalid_request", "Brak redirect_uri.", 400);
  if (!opts.code_verifier) return tokenError("invalid_request", "Brak code_verifier (PKCE).", 400);

  const auth = await consumeAuthorizationCode(opts.code);
  if (!auth) return tokenError("invalid_grant", "Code jest nieważny lub wygasł.", 400);
  if (auth.client_id !== opts.client_id) return tokenError("invalid_grant", "client_id mismatch.", 400);
  if (auth.redirect_uri !== opts.redirect_uri) return tokenError("invalid_grant", "redirect_uri mismatch.", 400);
  if (!verifyPkce(auth.code_challenge, opts.code_verifier)) {
    return tokenError("invalid_grant", "PKCE verifier mismatch.", 400);
  }

  const accessToken = await issueAccessToken({
    user_id: auth.user_id,
    client_id: opts.client_id,
    scope: auth.scope,
    audience: opts.audience,
    issuer: opts.issuer,
  });
  const refreshToken = await issueRefreshToken({
    user_id: auth.user_id,
    client_id: opts.client_id,
    scope: auth.scope,
  });

  return tokenResponse({ accessToken, refreshToken, scope: auth.scope });
}

// ── refresh_token ──

async function handleRefreshToken(opts: {
  client_id: string;
  refresh_token: string | null;
  audience: string;
  issuer: string;
}): Promise<Response> {
  if (!opts.refresh_token) return tokenError("invalid_request", "Brak refresh_token.", 400);

  const row = await consumeRefreshToken(opts.refresh_token, opts.client_id);
  if (!row) return tokenError("invalid_grant", "Refresh token nieważny lub wygasł.", 400);

  const accessToken = await issueAccessToken({
    user_id: row.user_id,
    client_id: opts.client_id,
    scope: row.scope,
    audience: opts.audience,
    issuer: opts.issuer,
  });
  const newRefresh = await issueRefreshToken({
    user_id: row.user_id,
    client_id: opts.client_id,
    scope: row.scope,
    rotated_from: row.token_hash,
  });

  return tokenResponse({ accessToken, refreshToken: newRefresh, scope: row.scope });
}

// ── helpers ──

function str(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = typeof v === "string" ? v : String(v);
  return s.trim() || null;
}

function tokenResponse(opts: { accessToken: string; refreshToken: string; scope: string }) {
  return NextResponse.json(
    {
      access_token: opts.accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: opts.refreshToken,
      scope: opts.scope,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

function tokenError(error: string, description: string, status: number) {
  return NextResponse.json(
    { error, error_description: description },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
