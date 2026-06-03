"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, X } from "lucide-react";
import { THEMES, type RadiusMode } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS: { id: RadiusMode; label: string }[] = [
  { id: "normal", label: "Standard" },
  { id: "mega", label: "Mega (2×)" },
];

export function ThemeSwitcher() {
  const { theme, radius, setTheme, setRadius } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bottom-20 right-4 lg:bottom-4 lg:right-4"
    >
      {open && (
        <div
          className="absolute bottom-12 right-0 w-72 rounded-xl border border-outline bg-surface-container p-4 shadow-[var(--elevation-3)]"
          role="dialog"
          aria-label="Wybór motywu"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant">
              Motyw
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-muted hover:bg-on-surface/5"
              aria-label="Zamknij"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex items-center gap-2 h-9 px-2.5 rounded-full border text-sm transition-colors",
                    active
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline text-on-surface hover:bg-on-surface/5"
                  )}
                >
                  <span
                    aria-hidden
                    className="h-4 w-4 rounded-full border border-outline-variant"
                    style={{ background: t.swatch }}
                  />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2">
            Zaokrąglenia
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RADIUS_OPTIONS.map((r) => {
              const active = r.id === radius;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRadius(r.id)}
                  className={cn(
                    "h-9 px-3 rounded-full border text-sm transition-colors",
                    active
                      ? "border-primary bg-primary-container text-on-primary-container"
                      : "border-outline text-on-surface hover:bg-on-surface/5"
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Zmień motyw"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-[var(--elevation-2)] hover:opacity-90 transition-opacity"
      >
        <Palette className="h-5 w-5" />
      </button>
    </div>
  );
}
