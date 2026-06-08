"use client";

import * as React from "react";
import { LogOut, Loader2 } from "lucide-react";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function KontoPage() {
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("logout failed", e);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <SettingsShell title="Konto">
      <p className="text-sm text-muted mb-4">
        Zarządzanie sesją.
      </p>
      <Button
        variant="outline"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {loggingOut ? "Wylogowuję…" : "Wyloguj"}
      </Button>
    </SettingsShell>
  );
}
