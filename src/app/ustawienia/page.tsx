"use client";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { AgentSettingsSection } from "@/components/agent/AgentSettingsSection";

export default function UstawieniaPage() {
  return (
    <SettingsShell title="Asystent">
      <AgentSettingsSection />
    </SettingsShell>
  );
}
