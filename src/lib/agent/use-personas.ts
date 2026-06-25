"use client";

// Lista person dla UI — pobierana z /api/personas (źródło: produkty WooCommerce).
// Fallback do statycznej listy z kodu, gdy fetch zawiedzie. Refetch na evencie
// `personas-changed` (np. po zmianach w sklepie) i na `focus`.

import * as React from "react";
import { PERSONAS, PERSONA_ORDER } from "./personas";
import { FREE_PERSONA_KEYS } from "./entitlements";
import type { PersonaListItem } from "./types";

const CODE_FALLBACK: PersonaListItem[] = PERSONA_ORDER.map((k) => ({
  key: k,
  name: PERSONAS[k].name,
  description: PERSONAS[k].description,
  icon: PERSONAS[k].icon,
  isFree: FREE_PERSONA_KEYS.has(k),
}));

export function usePersonas(): { personas: PersonaListItem[]; loading: boolean } {
  const [personas, setPersonas] = React.useState<PersonaListItem[]>(CODE_FALLBACK);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/personas");
      const data = (await res.json()) as { personas?: PersonaListItem[] };
      if (Array.isArray(data.personas) && data.personas.length > 0) {
        setPersonas(data.personas);
      }
    } catch {
      /* zostaje fallback z kodu */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onFocus = () => void load();
    const onChanged = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("personas-changed", onChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("personas-changed", onChanged);
    };
  }, [load]);

  return { personas, loading };
}
