"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { PERSONAS, PERSONA_ORDER } from "@/lib/agent/personas";
import {
  getDefaultPersona,
  getVariantPreference,
  setVariantPreference,
  setDefaultPersona,
  getDeepMode,
  setDeepMode,
  hasSeenBrutalWarning,
  markBrutalWarningSeen,
} from "@/lib/agent/client-state";
import type { PersonaKey } from "@/lib/agent/types";
import { BrutalEditorWarning } from "./BrutalEditorWarning";

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
  const [variants, setVariants] = React.useState<Record<PersonaKey, string>>(
    () =>
      Object.fromEntries(
        PERSONA_ORDER.map((k) => [k, PERSONAS[k].variants[0].id])
      ) as Record<PersonaKey, string>
  );
  const [deepModes, setDeepModes] = React.useState<Record<PersonaKey, boolean>>(
    () =>
      Object.fromEntries(PERSONA_ORDER.map((k) => [k, false])) as Record<
        PersonaKey,
        boolean
      >
  );
  const [pendingBrutal, setPendingBrutal] = React.useState<boolean>(false);

  // Pierwszy render czytamy localStorage po montażu (SSR-safe).
  React.useEffect(() => {
    setDefaultPersonaState(getDefaultPersona());
    setVariants(
      Object.fromEntries(
        PERSONA_ORDER.map((k) => [k, getVariantPreference(k)])
      ) as Record<PersonaKey, string>
    );
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

  function handleSelectVariant(key: PersonaKey, variantId: string) {
    // Brutalny redaktor — modal raz.
    if (
      key === "creative" &&
      variantId === "brutal-editor" &&
      !hasSeenBrutalWarning()
    ) {
      setPendingBrutal(true);
      // Zapamiętaj cel wyboru — po confirm zatwierdzimy.
      pendingVariantRef.current = { key, variantId };
      return;
    }
    setVariantPreference(key, variantId);
    setVariants((v) => ({ ...v, [key]: variantId }));
  }

  const pendingVariantRef = React.useRef<{
    key: PersonaKey;
    variantId: string;
  } | null>(null);

  function handleToggleDeep(key: PersonaKey) {
    const next = !deepModes[key];
    setDeepMode(key, next);
    setDeepModes((d) => ({ ...d, [key]: next }));
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Asystent AI</h2>
        <p className="text-sm text-muted mt-0.5">
          Wybierz wariant każdej persony i ustaw, kto otwiera się domyślnie.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PERSONA_ORDER.map((key) => {
          const p = PERSONAS[key];
          const Icon = getIcon(p.icon);
          const isDefault = defaultPersona === key;
          const currentVariant = variants[key] ?? p.variants[0].id;
          const deep = deepModes[key] ?? false;

          return (
            <div
              key={key}
              className="rounded-2xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold">{p.name}</h3>
                    {isDefault && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/70">
                        Domyślna
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{p.description}</p>
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
                  {isDefault ? "Domyślna" : "Ustaw jako domyślną"}
                </button>
              </div>

              {/* Warianty */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.variants.map((v) => {
                  const isSelected = currentVariant === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVariant(key, v.id)}
                      className={cn(
                        "text-left rounded-xl border p-3 transition-colors",
                        isSelected
                          ? "border-foreground/40 bg-foreground/5"
                          : "border-border hover:bg-foreground/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{v.name}</span>
                        {v.warning && (
                          <span className="text-[10px] text-destructive">⚠</span>
                        )}
                        {isSelected && (
                          <Check className="ml-auto h-3.5 w-3.5 text-foreground/70" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted leading-snug mt-0.5">
                        {v.description}
                      </p>
                    </button>
                  );
                })}
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

      <BrutalEditorWarning
        open={pendingBrutal}
        onCancel={() => {
          setPendingBrutal(false);
          pendingVariantRef.current = null;
        }}
        onConfirm={() => {
          markBrutalWarningSeen();
          const target = pendingVariantRef.current;
          if (target) {
            setVariantPreference(target.key, target.variantId);
            setVariants((v) => ({ ...v, [target.key]: target.variantId }));
          }
          pendingVariantRef.current = null;
          setPendingBrutal(false);
        }}
      />
    </section>
  );
}
