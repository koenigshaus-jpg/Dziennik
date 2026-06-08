// RFC7591 — Dynamic Client Registration. Bez auth (publiczne z definicji).
// Body: { client_name, redirect_uris[] } → { client_id, client_secret, ... }
//
// `client_secret` zwracany TYLKO raz — później jest tylko hash w bazie.

import { NextResponse } from "next/server";
import { z } from "zod";

import { registerClient } from "@/lib/api/oauth/clients";
import { DEFAULT_SCOPE } from "@/lib/api/oauth/scopes";

export const runtime = "nodejs";

const schema = z.object({
  client_name: z.string().min(1).max(80),
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  // Resztę pól (RFC7591) akceptujemy ale ignorujemy:
  // client_uri, logo_uri, contacts, tos_uri, policy_uri, software_id, software_version, scope
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid_client_metadata", "Body musi być poprawnym JSON.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "invalid_client_metadata",
      parsed.error.issues[0]?.message ?? "Bad request",
      400
    );
  }

  // Wszystkie redirect_uri muszą być HTTPS lub localhost (OAuth 2.1)
  for (const uri of parsed.data.redirect_uris) {
    try {
      const u = new URL(uri);
      const okScheme = u.protocol === "https:" || u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (!okScheme) {
        return jsonError("invalid_redirect_uri", `redirect_uri musi być HTTPS lub localhost: ${uri}`, 400);
      }
    } catch {
      return jsonError("invalid_redirect_uri", `Nieprawidłowy URL: ${uri}`, 400);
    }
  }

  try {
    const result = await registerClient({
      client_name: parsed.data.client_name,
      redirect_uris: parsed.data.redirect_uris,
    });

    // Response zgodny z RFC7591 §3.2.1
    return NextResponse.json(
      {
        client_id: result.client_id,
        client_secret: result.client_secret,
        client_name: result.client_name,
        redirect_uris: result.redirect_uris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_post",
        scope: DEFAULT_SCOPE,
        client_id_issued_at: Math.floor(new Date(result.created_at).getTime() / 1000),
        client_secret_expires_at: 0, // never
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return jsonError("server_error", e instanceof Error ? e.message : "unknown", 500);
  }
}

export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function jsonError(error: string, description: string, status: number) {
  return NextResponse.json(
    { error, error_description: description },
    {
      status,
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
