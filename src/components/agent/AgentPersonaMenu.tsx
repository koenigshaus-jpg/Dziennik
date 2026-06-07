"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PERSONA_ORDER, PERSONAS } from "@/lib/agent/personas";
import type { PersonaKey } from "@/lib/agent/types";

interface Props {
  personaKey: PersonaKey;
  variantId: string;
  onSelect: (personaKey: PersonaKey, variantId: string) => void;
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

export function AgentPersonaMenu({ personaKey, variantId, onSelect }: Props) {
  const persona = PERSONAS[personaKey];
  const variant =
    persona.variants.find((v) => v.id === variantId) ?? persona.variants[0];
  const Icon = getIcon(persona.icon);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 h-8",
            "bg-foreground/5 hover:bg-foreground/10 text-foreground/90",
            "text-xs"
          )}
          aria-label="Wybierz personę"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="font-medium">{persona.name}</span>
          <span className="text-muted">·</span>
          <span className="text-muted truncate max-w-[120px]">
            {variant.name}
          </span>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-[320px] max-h-[60vh] overflow-y-auto"
      >
        {PERSONA_ORDER.map((key, idx) => {
          const p = PERSONAS[key];
          const PIcon = getIcon(p.icon);
          return (
            <React.Fragment key={key}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2">
                <PIcon className="h-3.5 w-3.5 text-muted" />
                <span>{p.name}</span>
              </DropdownMenuLabel>
              {p.variants.map((v) => {
                const isActive =
                  key === personaKey && v.id === variantId;
                return (
                  <DropdownMenuItem
                    key={v.id}
                    onSelect={() => onSelect(key, v.id)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="text-sm font-medium">{v.name}</span>
                      {isActive && (
                        <Check className="ml-auto h-3.5 w-3.5 text-foreground/70" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted leading-snug">
                      {v.description}
                    </p>
                  </DropdownMenuItem>
                );
              })}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
