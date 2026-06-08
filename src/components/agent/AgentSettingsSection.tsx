"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";

import { cn } from "@/lib/utils";
import { PERSONAS, PERSONA_ORDER } from "@/lib/agent/personas";
import {
  getDefaultPersona,
  setDefaultPersona,
  getDeepMode,
  setDeepMode,
} from "@/lib/agent/client-state";
import type { PersonaKey } from "@/lib/agent/types";

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

export function AgentSettingsSection() {
  const [mounted, setMounted] = React.useState(false);
  const [defaultPersona, setDefaultPersonaState] =
    React.useState<PersonaKey>("advisor");
  const [deepModes, setDeepModes] = React.useState<Record<PersonaKey, boolean>>(
    () =>
      Object.fromEntries(PERSONA_ORDER.map((k) => [k, false])) as Record<
        PersonaKey,
        boolean
      >
  );

  // Pierwszy render czytamy localStorage po montażu (SSR-safe).
  React.useEffect(() => {
    setDefaultPersonaState(getDefaultPersona());
    setDeepModes(
      Object.fromEntries(
        PERSONA_ORDER.map((k) => [k, getDeepMode(k)])
      ) as Record<PersonaKey, boolean>
    );
    setMounted(true);
  }, []);

  function handleSetDefaultPersona(key: PersonaKey) {
    setDefaultPersona(key);
    setDefaultPersonaState(key);
  }

  function handleToggleDeep(key: PersonaKey) {
    const next = !deepModes[key];
    setDeepMode(key, next);
    setDeepModes((d) => ({ ...d, [key]: next }));
  }

  return (
    <section>
      <p className="text-sm text-muted mb-4">
        Wybierz, kto otwiera się domyślnie. Tryb głęboki włącz, gdy chcesz
        mądrzejsze (ale wolniejsze i droższe) odpowiedzi.
      </p>

      <div className="flex flex-col gap-3">
        {PERSONA_ORDER.map((key) => {
          const p = PERSONAS[key];
          const Icon = getIcon(p.icon);
          const isDefault = defaultPersona === key;
          const deep = deepModes[key] ?? false;

          return (
            <div
              key={key}
              className="rounded-2xl border border-border p-4"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold">{p.name}</h3>
                    {isDefault && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/70">
                        Domyślny
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSetDefaultPersona(key)}
                    disabled={isDefault}
                    className={cn(
                      "shrink-0 text-xs h-8 px-3 rounded-full transition-colors",
                      isDefault
                        ? "bg-foreground/5 text-muted cursor-default"
                        : "border border-border hover:bg-foreground/5"
                    )}
                  >
                    {isDefault ? "Domyślny" : "Ustaw domyślnie"}
                  </button>
                </div>
                <p className="text-xs text-muted">{p.description}</p>
              </div>

              {/* Deep mode */}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.03] px-3 py-2">
                <div className="text-xs">
                  <div className="font-medium">
                    Tryb głęboki ({p.deepModel})
                  </div>
                  <p className="text-muted">
                    Mądrzejsze odpowiedzi, ~15× droższe i wolniejsze.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleDeep(key)}
                  role="switch"
                  aria-checked={deep}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                    deep ? "bg-foreground" : "bg-foreground/15"
                  )}
                  disabled={!mounted}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
                      "translate-y-0.5",
                      deep ? "translate-x-[1.375rem]" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
