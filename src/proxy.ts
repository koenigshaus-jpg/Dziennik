import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientForMiddleware } from "@/lib/supabase/server";

// Ścieżki publiczne — bez wymogu sesji.
// /docs        — publiczna dokumentacja API (Vercel-style, indexable)
// /api/v1/*    — publiczne API z własną autoryzacją (API keys / Supabase JWT)
const PUBLIC_PATHS = ["/login", "/api/auth/callback", "/docs", "/api/v1"];

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
