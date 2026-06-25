// Logika uprawnień do person (współdzielona klient/serwer — bez importów
// server-only). Źródłem prawdy o zakupach jest tabela `entitlements` (Supabase);
// tu tylko reguły, które persony są darmowe i jak rozwinąć SKU na klucze person.

import type { PersonaKey } from "./types";
import { PERSONA_ORDER } from "./personas";

/** Persony dostępne bez zakupu. Darmowy Doradca biznesowy. */
export const FREE_PERSONA_KEYS: ReadonlySet<PersonaKey> = new Set(["advisor"]);

/** SKU pakietu „wszystko" (obecne i przyszłe persony). */
export const BUNDLE_SKU = "all";

export function isPersonaFree(key: PersonaKey): boolean {
  return FREE_PERSONA_KEYS.has(key);
}

/** Wiersz uprawnienia (tak jak w tabeli entitlements). */
export interface EntitlementRow {
  sku: string;
  status: string;
  current_period_end: string | null;
}

function isActive(row: EntitlementRow): boolean {
  if (row.status !== "active") return false;
  if (!row.current_period_end) return true;
  return new Date(row.current_period_end).getTime() > Date.now();
}

/**
 * Z listy wierszy uprawnień liczy zbiór odblokowanych person.
 * Darmowe persony są zawsze w zbiorze. Pakiet (`all`) odblokowuje wszystkie.
 */
export function computeUnlocked(rows: EntitlementRow[]): {
  unlocked: Set<PersonaKey>;
  hasAll: boolean;
} {
  const unlocked = new Set<PersonaKey>(FREE_PERSONA_KEYS);
  let hasAll = false;
  for (const row of rows) {
    if (!isActive(row)) continue;
    if (row.sku === BUNDLE_SKU) {
      hasAll = true;
      for (const k of PERSONA_ORDER) unlocked.add(k);
    } else if (PERSONA_ORDER.includes(row.sku as PersonaKey)) {
      unlocked.add(row.sku as PersonaKey);
    }
  }
  return { unlocked, hasAll };
}
