// Wystawia OpenAPI 3.1 spec na /openapi.json. Konsumowane przez ChatGPT,
// Claude, generatory SDK, MCP. Dynamiczny base URL (działa lokalnie, na
// Preview i Production bez konfiguracji).

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { buildOpenApiSpec } from "@/lib/api/openapi-spec";

export const runtime = "nodejs";

export async function GET() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const spec = buildOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      // Pozwól crawlerom + bot agentom (ChatGPT, Claude) na CORS
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
