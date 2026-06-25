"use client";

// Strażnik sesji. Wykrywa nieważną/wygasłą sesję Supabase (np. „Invalid Refresh
// Token") i odzyskuje: czyści sesję i przekierowuje na /login — zamiast zostawiać
// aplikację zawieszoną na ekranie „Wczytuję…". Dla zdrowej sesji jest bezczynny.
// Na ścieżkach publicznych (np. /docs) nie wymusza logowania.

import * as React from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

const PUBLIC_PREFIXES = [
  "/login",
  "/docs",
  "/openapi.json",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known",
  "/oauth",
];

function isPublic(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));
}

export function SessionGuard() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (isPublic(pathname)) return;
    const supabase = getSupabaseClient();
    let recovered = false;

    const recover = async () => {
      if (recovered) return;
      recovered = true;
      try {
        await supabase.auth.signOut();
      } catch {
        /* nieważne — i tak wychodzimy na login */
      }
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    };

    // Proaktywny check: zepsuty/wygasły refresh token → odzyskaj.
    supabase.auth
      .getUser()
      .then((res: { error: { name?: string } | null }) => {
        const error = res.error;
        if (!error) return;
        // Zwykły brak sesji (nie stale-token) zostawiamy middleware/innym ścieżkom.
        if (error.name === "AuthSessionMissingError") return;
        void recover();
      })
      .catch(() => void recover());

    // Reakcja na utratę sesji w trakcie (nieudany auto-refresh → SIGNED_OUT).
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") void recover();
    });

    return () => sub.subscription.unsubscribe();
  }, [pathname]);

  return null;
}
