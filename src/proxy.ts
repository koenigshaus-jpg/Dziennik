import { NextRequest, NextResponse } from "next/server";
// import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

// AUTH WYŁĄCZONY — każdy z adresem może wejść.
// Żeby przywrócić: odkomentuj poniżej i import na górze.
const AUTH_ENABLED = false;

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  // const secret = process.env.SESSION_SECRET ?? "";
  // const valid = await verifySessionToken(token, secret);
  // if (!valid) {
  //   const url = req.nextUrl.clone();
  //   url.pathname = "/login";
  //   if (pathname !== "/") url.searchParams.set("next", pathname);
  //   return NextResponse.redirect(url);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.(?:png|svg)|uploads/).*)",
  ],
};
