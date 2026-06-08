"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, Menu, X } from "lucide-react";

export interface NavSection {
  id: string;
  label: string;
  items?: { id: string; label: string }[];
}

interface Props {
  sections: NavSection[];
  children: React.ReactNode;
  /** Czy istnieje sesja użytkownika — wpływa na CTA „Wróć do aplikacji". */
  isLoggedIn: boolean;
}

export function DocsLayout({ sections, children, isLoggedIn }: Props) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-foreground/5 lg:hidden"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Menu"
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/docs" className="flex items-center gap-2 font-display text-lg font-bold">
              <BookOpen className="h-5 w-5" /> Dziennik API
            </Link>
            <span className="ml-2 hidden text-xs text-muted sm:inline">v1</span>
          </div>
          <Link
            href={isLoggedIn ? "/" : "/login"}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-foreground/5"
          >
            {isLoggedIn ? "Wróć do dziennika" : "Zaloguj"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-8 px-4">
        {/* Sidebar — desktop sticky */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto py-8 pr-2">
            <NavList sections={sections} />
          </nav>
        </aside>

        {/* Sidebar — mobile drawer */}
        {drawerOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            <aside
              className="absolute left-0 top-14 bottom-0 w-72 overflow-y-auto bg-background p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <NavList sections={sections} onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        ) : null}

        {/* Content */}
        <main className="min-w-0 flex-1 py-8 lg:py-12">
          <article className="docs-prose max-w-3xl">{children}</article>
        </main>
      </div>
    </div>
  );
}

function NavList({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={onNavigate}
            className="block rounded-md px-3 py-1.5 text-sm font-medium hover:bg-foreground/5"
          >
            {s.label}
          </a>
          {s.items && s.items.length > 0 ? (
            <ul className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
              {s.items.map((it) => (
                <li key={it.id}>
                  <a
                    href={`#${it.id}`}
                    onClick={onNavigate}
                    className="block rounded-md px-3 py-1 text-xs text-muted hover:bg-foreground/5 hover:text-foreground"
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
