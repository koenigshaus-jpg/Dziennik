"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";

import { cn } from "@/lib/utils";
import { PERSONAS } from "@/lib/agent/personas";
import type { PersonaKey } from "@/lib/agent/types";

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? lib.Sparkles;
}

interface Props {
  personaKey: PersonaKey;
  className?: string;
}

/** Maleńki badge z ikoną persony — używany pod tytułem wpisu w historii. */
export function PersonaBadge({ personaKey, className }: Props) {
  const p = PERSONAS[personaKey];
  const Icon = getIcon(p.icon);
  return (
    <span
      title={`Rozmowa: ${p.name}`}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/8 text-foreground/70",
        className
      )}
      aria-label={`Rozmowa z personą ${p.name}`}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

/** Mała listwa badge'ów person dla dnia, do umieszczenia przy tytule. */
export function PersonaBadgeRow({
  personaKeys,
  className,
}: {
  personaKeys: PersonaKey[];
  className?: string;
}) {
  if (personaKeys.length === 0) return null;
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {personaKeys.map((k) => (
        <PersonaBadge key={k} personaKey={k} />
      ))}
    </div>
  );
}
