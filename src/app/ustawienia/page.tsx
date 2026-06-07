"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { AgentSettingsSection } from "@/components/agent/AgentSettingsSection";
import { ConversationsHistorySection } from "@/components/agent/ConversationsHistorySection";

export default function UstawieniaPage() {
  return (
    <AppShell>
      <header className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
          aria-label="Wróć"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">Ustawienia</h1>
      </header>

      <div className="flex flex-col gap-10 pb-16">
        <AgentSettingsSection />
        <ConversationsHistorySection />
      </div>
    </AppShell>
  );
}
