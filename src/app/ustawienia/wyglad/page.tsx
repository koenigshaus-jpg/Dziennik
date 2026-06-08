"use client";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function WygladPage() {
  return (
    <SettingsShell title="Wygląd">
      <p className="text-sm text-muted mb-4">
        Motyw kolorystyczny aplikacji.
      </p>
      <div className="rounded-2xl border border-border p-2">
        <ThemeSwitcher embedded />
      </div>
    </SettingsShell>
  );
}
