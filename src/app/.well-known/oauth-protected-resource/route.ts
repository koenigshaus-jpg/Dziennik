// RFC9728 — Protected Resource Metadata. Wskazuje na nasz authorization server.
// Wymagane przez MCP spec — klient MCP czyta to po 401 z WWW-Authenticate.

import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { headers } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // authorization server = ten sam host (nasz /.well-known/oauth-authorization-server)
  const handler = protectedResourceHandler({
    authServerUrls: [origin],
    resourceUrl: `${origin}/api/mcp`,
  });
  return handler(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
