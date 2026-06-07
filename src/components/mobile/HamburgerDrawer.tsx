"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { X, Settings, LogOut, Loader2 } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PERSONAS } from "@/lib/agent/personas";
import { useConversationsMeta } from "@/lib/agent/use-conversations-meta";
import { useAgentSheet } from "@/components/agent/AgentSheetProvider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

const MONTHS_SHORT = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];

function formatDayShort(iso: string): string {
  const [, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!m || !d) return iso;
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function HamburgerDrawer({ open, onOpenChange }: Props) {
  const [loggingOut, setLoggingOut] = React.useState(false);
  const { conversations } = useConversationsMeta();
  const { openSheet } = useAgentSheet();

  const recent = conversations.slice(0, 6);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.error("logout failed", e);
    } finally {
      onOpenChange(false);
      window.location.href = "/login";
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw]",
            "bg-background border-l border-border shadow-2xl",
            "flex flex-col",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
          )}
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <DialogPrimitive.Title className="text-base font-semibold">
              Dziennik
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
              aria-label="Zamknij menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Menu nawigacji aplikacji
          </DialogPrimitive.Description>

          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Historia rozmów */}
            <div className="px-2 pt-3 pb-1">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                  Historia rozmów
                </span>
                {conversations.length > 0 && (
                  <Link
                    href="/historia-rozmow"
                    onClick={() => onOpenChange(false)}
                    className="text-[11px] text-muted hover:text-foreground"
                  >
                    Wszystkie
                  </Link>
                )}
              </div>

              {recent.length === 0 ? (
                <p className="text-xs text-muted px-1 py-2">
                  Brak rozmów. Użyj mikrofonu lub paska kompozytora.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {recent.map((c) => {
                    const p = PERSONAS[c.personaKey];
                    const Icon = getIcon(p.icon);
                    const firstUser = c.messages.find((m) => m.role === "user");
                    const label = c.title ?? firstUser?.content ?? "Rozmowa";
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenChange(false);
                            openSheet({ day: c.day });
                          }}
                          className="w-full flex items-center gap-2.5 px-2 h-10 rounded-lg text-left hover:bg-foreground/5 transition-colors"
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/8">
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm truncate leading-tight">
                              {label}
                            </span>
                            <span className="block text-[10px] text-muted leading-tight">
                              {p.name} · {formatDayShort(c.day)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-border/60 mx-3 my-2" />

            {/* Nawigacja */}
            <nav className="px-2">
              <ul className="flex flex-col gap-1">
                <li>
                  <Link
                    href="/ustawienia"
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 px-3 h-11 rounded-md text-sm hover:bg-foreground/5"
                  >
                    <Settings className="h-4 w-4" />
                    Ustawienia
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-md text-sm hover:bg-foreground/5 disabled:opacity-70"
                  >
                    {loggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {loggingOut ? "Wylogowuję…" : "Wyloguj"}
                  </button>
                </li>
              </ul>
            </nav>

            <div className="px-3 pb-4 mt-2">
              <ThemeSwitcher embedded />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
