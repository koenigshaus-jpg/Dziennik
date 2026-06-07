"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

/**
 * Uproszczony przełącznik motywu: pojedynczy toggle dark mode.
 * Włączony = "dark", wyłączony = "neutral" (jasny neutralny).
 */
function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme(isDark ? "neutral" : "dark")}
      className="w-full flex items-center justify-between gap-3 h-11 px-3 rounded-lg hover:bg-foreground/5 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm">
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        Tryb ciemny
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          isDark ? "bg-foreground" : "bg-foreground/15"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform",
            isDark ? "translate-x-[18px]" : "translate-x-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function ThemeSwitcher({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || embedded) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, embedded]);

  if (embedded) {
    return <DarkModeToggle />;
  }

  return (
    <div
      ref={panelRef}
      className="hidden lg:flex fixed z-50 bottom-4 right-4"
    >
      {open && (
        <div
          className="absolute bottom-12 right-0 w-64 rounded-xl border border-border bg-background p-2 shadow-[var(--elevation-3)]"
          role="dialog"
          aria-label="Wybór motywu"
        >
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <p className="text-xs uppercase tracking-wider text-muted">
              Motyw
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-foreground/5"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DarkModeToggle />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Zmień motyw"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-[var(--elevation-2)] hover:opacity-90 transition-opacity"
      >
        <Moon className="h-5 w-5" />
      </button>
    </div>
  );
}
