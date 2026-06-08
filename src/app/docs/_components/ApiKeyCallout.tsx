import * as React from "react";
import Link from "next/link";
import { ArrowRight, LogIn, KeyRound } from "lucide-react";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function ApiKeyCallout() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="my-6 flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Jesteś zalogowany jako {user.email ?? user.id}.</p>
          <p className="text-sm text-muted">
            Możesz wygenerować nowy klucz w ustawieniach konta.
          </p>
        </div>
        <Link
          href="/ustawienia/api"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
        >
          <KeyRound className="h-4 w-4" />
          Wygeneruj klucz
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="my-6 flex flex-col gap-3 rounded-xl border border-border bg-foreground/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Aby wygenerować klucz, zaloguj się.</p>
        <p className="text-sm text-muted">
          Klucze są przypisane do konkretnego konta i widoczne tylko dla Ciebie.
        </p>
      </div>
      <Link
        href="/login?next=/ustawienia/api"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-transparent px-4 text-sm font-medium hover:bg-foreground/5"
      >
        <LogIn className="h-4 w-4" />
        Zaloguj się
      </Link>
    </div>
  );
}
