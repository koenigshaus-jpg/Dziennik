// Rozwiązywanie persony: kod (fallback/baza) + nadpisania z WooCommerce.
// SERVER-ONLY (importuje woocommerce.ts). Używane przez route'y czatu, by prompt
// (i model/temperatura) pochodził z panelu WooCommerce — patrz pamięć projektu.
//
// Klient (UI wyboru persony) nadal używa statycznego PERSONAS z ./personas —
// ten moduł dotyczy tylko warstwy serwerowej budującej system prompt.

import type { PersonaConfig, PersonaKey } from "./types";
import { getPersona } from "./personas";
import { getPersonaOverrides } from "@/lib/woocommerce";

/**
 * Zwraca konfigurację persony z nadpisaniami z WooCommerce (prompt/model/
 * temperatura/nazwa), jeśli istnieją. Gdy sklep niedostępny lub brak produktu —
 * zwraca personę z kodu bez zmian.
 */
export async function resolvePersona(
  key: PersonaKey | string,
): Promise<PersonaConfig> {
  const base = getPersona(key);
  let overrides;
  try {
    overrides = await getPersonaOverrides();
  } catch {
    return base;
  }
  const o = overrides.get(base.key);
  if (!o) return base;
  return {
    ...base,
    name: o.name ?? base.name,
    description: o.description ?? base.description,
    icon: o.icon ?? base.icon,
    systemPrompt: o.systemPrompt ?? base.systemPrompt,
    defaultModel: o.defaultModel ?? base.defaultModel,
    deepModel: o.deepModel ?? base.deepModel,
    temperature:
      o.temperature !== undefined && !Number.isNaN(o.temperature)
        ? o.temperature
        : base.temperature,
  };
}
