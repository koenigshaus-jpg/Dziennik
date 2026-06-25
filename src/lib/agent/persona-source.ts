// Persony sterowane WooCommerce: lista + pełna konfiguracja (prompt/model/temp).
// SERVER-ONLY (importuje woocommerce.ts). Persony z kodu (./personas) są
// fallbackiem, gdy WooCommerce jest niedostępne.

import type { PersonaConfig, PersonaListItem, PersonaKey } from "./types";
import { getPersona, PERSONAS, PERSONA_ORDER } from "./personas";
import { FREE_PERSONA_KEYS } from "./entitlements";
import { getPersonaOverrides } from "@/lib/woocommerce";
import { stripHtml } from "@/lib/shop";

// Domyślne wartości dla persony zdefiniowanej WYŁĄCZNIE w WooCommerce
// (brak odpowiednika w kodzie).
const DEFAULTS = {
  systemPrompt: "",
  defaultModel: "gpt-4o-mini",
  deepModel: "gpt-4o",
  temperature: 0.5,
  icon: "Sparkles",
};

/**
 * Pełna konfiguracja persony: nadpisania z WooCommerce na bazie persony z kodu.
 * Działa też dla person istniejących TYLKO w WooCommerce (klucz spoza kodu).
 * Gdy sklep niedostępny — persona z kodu (lub fallback).
 */
export async function resolvePersona(key: PersonaKey): Promise<PersonaConfig> {
  const k = String(key);
  const code = PERSONAS[k];
  const base = code ?? getPersona(k); // dla nieznanych: getPersona da fallback

  let overrides;
  try {
    overrides = await getPersonaOverrides();
  } catch {
    return code ?? base;
  }
  const o = overrides.get(k);
  if (!o) return code ?? base;

  // Dla person spoza kodu nie dziedziczymy promptu/parametrów fallbacku (advisora).
  const fb = code ?? null;
  return {
    key: k,
    name: o.name ?? fb?.name ?? k,
    description: o.description ?? fb?.description ?? "",
    icon: o.icon ?? fb?.icon ?? DEFAULTS.icon,
    systemPrompt: o.systemPrompt ?? fb?.systemPrompt ?? DEFAULTS.systemPrompt,
    defaultModel: o.defaultModel ?? fb?.defaultModel ?? DEFAULTS.defaultModel,
    deepModel: o.deepModel ?? fb?.deepModel ?? DEFAULTS.deepModel,
    temperature:
      o.temperature !== undefined && !Number.isNaN(o.temperature)
        ? o.temperature
        : (fb?.temperature ?? DEFAULTS.temperature),
  };
}

function codeList(): PersonaListItem[] {
  return PERSONA_ORDER.map((k) => ({
    key: k,
    name: PERSONAS[k].name,
    description: PERSONAS[k].description,
    icon: PERSONAS[k].icon,
    isFree: FREE_PERSONA_KEYS.has(k),
  }));
}

/**
 * Lista person do menu wyboru — budowana z produktów WooCommerce (pole
 * `persona_key`). Fallback do listy z kodu, gdy WC niedostępne/puste.
 * Kolejność: znane persony wg kodu, nowe (tylko-WC) na końcu.
 */
export async function getPersonaList(): Promise<PersonaListItem[]> {
  let overrides;
  try {
    overrides = await getPersonaOverrides();
  } catch {
    return codeList();
  }
  if (overrides.size === 0) return codeList();

  const items: PersonaListItem[] = [];
  for (const [key, o] of overrides) {
    const code = PERSONAS[key];
    items.push({
      key,
      name: o.name ?? code?.name ?? key,
      description: stripHtml(o.description ?? code?.description ?? ""),
      icon: o.icon ?? code?.icon ?? DEFAULTS.icon,
      isFree: Number(o.price) === 0,
    });
  }
  items.sort((a, b) => {
    const ia = PERSONA_ORDER.indexOf(a.key);
    const ib = PERSONA_ORDER.indexOf(b.key);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  return items;
}
