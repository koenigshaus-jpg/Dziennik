"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PERSONA_ORDER, PERSONAS, getPersona } from "@/lib/agent/personas";
import type { PersonaKey } from "@/lib/agent/types";

interface Props {
  personaKey: PersonaKey;
  onSelect: (personaKey: PersonaKey) => void;
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

export function AgentPersonaMenu({ personaKey, onSelect }: Props) {
  const persona = getPersona(personaKey);
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
          aria-label="Wybierz rozmówcę"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="font-medium">{persona.name}</span>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-[300px] max-h-[60vh] overflow-y-auto"
      >
        {PERSONA_ORDER.map((key) => {
          const p = PERSONAS[key];
          const PIcon = getIcon(p.icon);
          const isActive = key === personaKey;
          return (
            <DropdownMenuItem
              key={key}
              onSelect={() => onSelect(key)}
              className="flex flex-col items-start gap-0.5 py-2.5"
            >
              <div className="flex w-full items-center gap-2">
                <PIcon className="h-4 w-4 text-foreground/80" />
                <span className="text-sm font-medium">{p.name}</span>
                {isActive && (
                  <Check className="ml-auto h-3.5 w-3.5 text-foreground/70" />
                )}
              </div>
              <p className="text-[11px] text-muted leading-snug pl-6">
                {p.description}
              </p>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
