"use client";

// Hook czytający uprawnienia użytkownika z Supabase (tabela `entitlements`, RLS
// per user). Zwraca zbiór odblokowanych person (darmowe zawsze w środku) + flagę
// pakietu. Refetch przy montowaniu, na `focus` okna i na evencie
// `entitlements-changed` (dispatchowanym po powrocie z zakupu).

import * as React from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PersonaKey } from "./types";
import { computeUnlocked, FREE_PERSONA_KEYS, type EntitlementRow } from "./entitlements";

export interface EntitlementsState {
  unlocked: Set<PersonaKey>;
  hasAll: boolean;
  loading: boolean;
}

export function useEntitlements(): EntitlementsState {
  const [state, setState] = React.useState<EntitlementsState>({
    unlocked: new Set(FREE_PERSONA_KEYS),
    hasAll: false,
    loading: true,
  });

  const load = React.useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("entitlements")
        .select("sku,status,current_period_end");
      if (error) throw error;
      const { unlocked, hasAll } = computeUnlocked((data ?? []) as EntitlementRow[]);
      setState({ unlocked, hasAll, loading: false });
    } catch {
      // Brak sesji / błąd → tylko darmowe persony.
      setState({ unlocked: new Set(FREE_PERSONA_KEYS), hasAll: false, loading: false });
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onFocus = () => void load();
    const onChanged = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("entitlements-changed", onChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("entitlements-changed", onChanged);
    };
  }, [load]);

  return state;
}
