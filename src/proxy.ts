import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientForMiddleware } from "@/lib/supabase/server";

const PUBLIC_PATHS = ["/login", "/api/auth/callback"];

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
