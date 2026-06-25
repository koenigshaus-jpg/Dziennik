// Logika uprawnień do person (współdzielona klient/serwer — bez importów
// server-only). Źródłem prawdy o zakupach jest tabela `entitlements` (Supabase).
// „Darmowość" persony wynika z ceny w WooCommerce (0 zł), nie z listy w kodzie.

/** SKU pakietu „wszystko" (obecne i przyszłe persony). */
export const BUNDLE_SKU = "all";

/** Fallback, gdy WooCommerce niedostępne i nie znamy ceny: darmowy Doradca. */
export const FREE_PERSONA_KEYS: ReadonlySet<string> = new Set(["advisor"]);

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

export interface EntitlementState {
  /** SKU (persona_key) z aktywnym uprawnieniem. */
  activeSkus: Set<string>;
  /** Czy użytkownik ma pakiet „all" (odblokowuje wszystkie persony). */
  hasAll: boolean;
}

export function parseEntitlements(rows: EntitlementRow[]): EntitlementState {
  const activeSkus = new Set<string>();
  let hasAll = false;
  for (const row of rows) {
    if (!isActive(row)) continue;
    if (row.sku === BUNDLE_SKU) hasAll = true;
    else activeSkus.add(row.sku);
  }
  return { activeSkus, hasAll };
}

/** Czy persona jest odblokowana: darmowa, w pakiecie, lub kupiona osobno. */
export function isPersonaUnlocked(
  key: string,
  isFree: boolean,
  ent: EntitlementState,
): boolean {
  return isFree || ent.hasAll || ent.activeSkus.has(key);
}
