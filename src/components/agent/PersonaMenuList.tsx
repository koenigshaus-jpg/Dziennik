"use client";

// Lista person do wyboru w dropdownie — sterowana WooCommerce (usePersonas), z
// blokadami zakupu. Wspólna dla ComposerBar i AgentPersonaMenu. Persony
// nieodblokowane: wyszarzone, klikalne → karta produktu (/sklep/[key]). Na dole
// „Kup wszystkie" (pakiet), dopóki użytkownik nie ma pakietu.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";

import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PersonaKey } from "@/lib/agent/types";
import { usePersonas } from "@/lib/agent/use-personas";
import { useEntitlements } from "@/lib/agent/use-entitlements";
import { isPersonaUnlocked } from "@/lib/agent/entitlements";

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return lib[name] ?? Sparkles;
}

interface Props {
  activeKey: PersonaKey;
  onSelect: (key: PersonaKey) => void;
}

export function PersonaMenuList({ activeKey, onSelect }: Props) {
  const { personas, loading } = usePersonas();
  const ent = useEntitlements();
  const router = useRouter();

  return (
    <>
      {personas.map((p) => {
        const PIcon = getIcon(p.icon);
        const isActive = p.key === activeKey;
        const locked = !loading && !ent.loading && !isPersonaUnlocked(p.key, p.isFree, ent);
        return (
          <DropdownMenuItem
            key={p.key}
            onSelect={() => {
              if (locked) router.push(`/sklep/${p.key}`);
              else onSelect(p.key);
            }}
            className={cn(
              "flex flex-col items-start gap-0.5 py-2.5 cursor-pointer",
              locked && "opacity-70",
            )}
          >
            <div className="flex w-full items-center gap-2">
              {locked ? (
                <Lock className="h-4 w-4 text-muted" />
              ) : (
                <PIcon className="h-4 w-4 text-foreground/80" />
              )}
              <span className="text-sm font-medium">{p.name}</span>
              {locked ? (
                <span className="ml-auto inline-flex items-center h-6 px-2.5 rounded-full bg-foreground text-background text-[11px] font-medium">
                  Kup
                </span>
              ) : (
                isActive && <Check className="ml-auto h-3.5 w-3.5 text-foreground/70" />
              )}
            </div>
            {p.description && (
              <p className="text-[11px] text-muted leading-snug pl-6">{p.description}</p>
            )}
          </DropdownMenuItem>
        );
      })}

      {!ent.hasAll && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => router.push("/sklep/all")}
            className="flex items-center gap-2 py-2.5"
          >
            <Sparkles className="h-4 w-4 text-foreground/80" />
            <span className="text-sm font-medium">Kup wszystkie — taniej</span>
            <span className="ml-auto inline-flex items-center h-6 px-2.5 rounded-full bg-foreground text-background text-[11px] font-medium">
              Pakiet
            </span>
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
