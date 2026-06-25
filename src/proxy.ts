import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientForMiddleware } from "@/lib/supabase/server";

// Ścieżki publiczne — bez wymogu sesji.
// /docs        — publiczna dokumentacja API (Vercel-style, indexable)
// /api/v1/*    — publiczne API z własną autoryzacją (API keys / Supabase JWT)
// /robots.txt  — bot crawlers nie mogą trafiać na 307→/login (ChatGPT odrzuca strony za auth wall)
// /sitemap.xml — to samo
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/callback",
  "/docs",
  "/api/v1",
  "/robots.txt",
  "/sitemap.xml",
  "/openapi.json", // OpenAPI 3.1 spec dla agentów (ChatGPT, Claude, MCP)
  "/llms.txt",      // Markdown spec konwencji llmstxt.org
  // OAuth 2.1 + MCP (Faza 2):
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/.well-known/openid-configuration",          // klienci OIDC-aware (ChatGPT, niektóre Claude) tu pukają
  "/oauth/register",                            // DCR (RFC7591)
  "/oauth/token",                                // token endpoint
  "/oauth/authorize/decision",                   // POST decision (own auth check)
  "/api/mcp",                                    // MCP HTTP transport (own withMcpAuth)
  "/api/stripe/webhook",                         // webhook Stripe — własna autoryzacja (podpis)
  // /oauth/authorize zostaje POD loginem — wymaga sesji Supabase do consent
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseServerClientForMiddleware(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.(?:png|svg)|uploads/).*)",
  ],
};
