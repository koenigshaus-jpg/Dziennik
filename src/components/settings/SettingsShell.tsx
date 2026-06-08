"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Sparkles, Tag as TagIcon, Palette, User, KeyRound, BookOpen } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

type SectionDef = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Link poza shellem ustawień (np. /docs). Nie podświetla się jako "aktywny". */
  external?: boolean;
};

const SECTIONS: readonly SectionDef[] = [
  { href: "/ustawienia", label: "Asystent", icon: Sparkles },
  { href: "/ustawienia/tagi", label: "Tagi", icon: TagIcon },
  { href: "/ustawienia/wyglad", label: "Wygląd", icon: Palette },
  { href: "/ustawienia/konto", label: "Konto", icon: User },
  { href: "/ustawienia/api", label: "API", icon: KeyRound },
  { href: "/docs", label: "Dokumentacja API", icon: BookOpen, external: true },
];

interface Props {
  /** Tytuł aktywnej sekcji — pokazywany na mobile jako H1 obok strzałki. */
  title: string;
  children: React.ReactNode;
}

export function SettingsShell({ title, children }: Props) {
  const pathname = usePathname();

  return (
    <AppShell wide>
      {/* Mobile: header z back-arrow + tytuł sekcji */}
      <header className="lg:hidden flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
          aria-label="Wróć"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
      </header>

      {/* Mobile: pełnowidocznie children (bez sidebara) */}
      <div className="lg:hidden pb-16">{children}</div>

      {/* Desktop: sidebar + content */}
      <div className="hidden lg:flex lg:h-full lg:gap-8 lg:py-8">
        <aside className="w-56 shrink-0 flex flex-col">
          <div className="flex items-center gap-2 mb-6 px-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 -ml-2"
              aria-label="Wróć do dziennika"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-display font-bold">Ustawienia</h1>
          </div>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map(({ href, label, icon: Icon, external }) => {
              const isActive = !external && pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-foreground/10 font-medium text-foreground"
                      : "hover:bg-foreground/5 text-foreground/75"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 max-w-2xl overflow-y-auto pr-2">
          <h2 className="text-xl font-semibold mb-6">{title}</h2>
          {children}
        </main>
      </div>
    </AppShell>
  );
}
