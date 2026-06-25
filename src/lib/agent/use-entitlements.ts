"use client";

// Hook czytający uprawnienia użytkownika z Supabase (tabela `entitlements`, RLS
// per user). Zwraca aktywne SKU + flagę pakietu. „Darmowość" persony liczy się
// osobno (z listy person / ceny WC) — patrz isPersonaUnlocked.
// Refetch przy montowaniu, na `focus` i na evencie `entitlements-changed`.

import * as React from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { parseEntitlements, type EntitlementRow, type EntitlementState } from "./entitlements";

export interface EntitlementsState extends EntitlementState {
  loading: boolean;
}

export function useEntitlements(): EntitlementsState {
  const [state, setState] = React.useState<EntitlementsState>({
    activeSkus: new Set(),
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
      const ent = parseEntitlements((data ?? []) as EntitlementRow[]);
      setState({ ...ent, loading: false });
    } catch {
      setState({ activeSkus: new Set(), hasAll: false, loading: false });
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
