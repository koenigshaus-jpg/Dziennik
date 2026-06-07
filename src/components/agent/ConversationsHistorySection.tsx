"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import { Search, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PERSONAS, PERSONA_ORDER } from "@/lib/agent/personas";
import type { PersonaKey } from "@/lib/agent/types";
import { useConversationsMeta } from "@/lib/agent/use-conversations-meta";
import { deleteConversation } from "@/lib/conversations-client";
import { useAgentSheet } from "./AgentSheetProvider";

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

const MONTHS_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

function formatDayPl(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}

export function ConversationsHistorySection() {
  const { conversations } = useConversationsMeta();
  const [filterPersonas, setFilterPersonas] = React.useState<Set<PersonaKey>>(
    new Set()
  );
  const [query, setQuery] = React.useState("");
  const { openSheet } = useAgentSheet();

  const togglePersona = (k: PersonaKey) => {
    setFilterPersonas((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filterPersonas.size > 0 && !filterPersonas.has(c.personaKey))
        return false;
      if (q) {
        const inTitle = c.title?.toLowerCase().includes(q) ?? false;
        const inMessages = c.messages.some((m) =>
          m.content.toLowerCase().includes(q)
        );
        if (!inTitle && !inMessages) return false;
      }
      return true;
    });
  }, [conversations, filterPersonas, query]);

  async function handleDelete(id: string) {
    if (!window.confirm("Usunąć rozmowę? Wiadomości znikną bezpowrotnie."))
      return;
    await deleteConversation(id);
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Historia rozmów</h2>
        <p className="text-sm text-muted mt-0.5">
          {conversations.length === 0
            ? "Jeszcze nie ma rozmów. Otwórz asystenta z głównego ekranu."
            : `Łącznie: ${conversations.length}`}
        </p>
      </div>

      {conversations.length > 0 && (
        <>
          {/* Filtry */}
          <div className="flex flex-col gap-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj w treści rozmów…"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PERSONA_ORDER.map((k) => {
                const p = PERSONAS[k];
                const Icon = getIcon(p.icon);
                const active = filterPersonas.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => togglePersona(k)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-foreground/5 hover:bg-foreground/10"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista */}
          <div className="flex flex-col gap-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted text-center py-8">
                Brak rozmów spełniających filtry.
              </p>
            )}
            {filtered.map((c) => {
              const p = PERSONAS[c.personaKey];
              const Icon = getIcon(p.icon);
              const firstUser = c.messages.find((m) => m.role === "user");
              const preview = c.title ?? firstUser?.content ?? "Rozmowa";
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => openSheet({ day: c.day })}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate max-w-full">
                        {preview}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {p.name} · {formatDayPl(c.day)} ·{" "}
                      {c.messages.length} wiad.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-destructive-container hover:text-destructive transition-colors shrink-0"
                    aria-label="Usuń rozmowę"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
