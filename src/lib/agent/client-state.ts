// Klient-side preferencje agenta. Cały stan w localStorage —
// zachowywany lokalnie, niesynchronizowany.

"use client";

import type { PersonaKey } from "./types";
import { PERSONA_ORDER, getDefaultVariantId } from "./personas";

const KEY_DEFAULT_PERSONA = "agent.defaultPersona";
const KEY_VARIANT = (k: PersonaKey) => `agent.variant.${k}`;
const KEY_DEEP_MODE = (k: PersonaKey) => `agent.deepMode.${k}`;
const KEY_BRUTAL_WARNING_SEEN = "agent.brutal-warning-seen";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getDefaultPersona(): PersonaKey {
  if (!isClient()) return PERSONA_ORDER[0];
  const v = localStorage.getItem(KEY_DEFAULT_PERSONA);
  if (v && (PERSONA_ORDER as string[]).includes(v)) return v as PersonaKey;
  return PERSONA_ORDER[0];
}

export function setDefaultPersona(key: PersonaKey): void {
  if (!isClient()) return;
  localStorage.setItem(KEY_DEFAULT_PERSONA, key);
}

export function getVariantPreference(key: PersonaKey): string {
  if (!isClient()) return getDefaultVariantId(key);
  return localStorage.getItem(KEY_VARIANT(key)) ?? getDefaultVariantId(key);
}

export function setVariantPreference(
  key: PersonaKey,
  variantId: string
): void {
  if (!isClient()) return;
  localStorage.setItem(KEY_VARIANT(key), variantId);
}

export function getDeepMode(key: PersonaKey): boolean {
  if (!isClient()) return false;
  return localStorage.getItem(KEY_DEEP_MODE(key)) === "1";
}

export function setDeepMode(key: PersonaKey, value: boolean): void {
  if (!isClient()) return;
  if (value) localStorage.setItem(KEY_DEEP_MODE(key), "1");
  else localStorage.removeItem(KEY_DEEP_MODE(key));
}

export function hasSeenBrutalWarning(): boolean {
  if (!isClient()) return false;
  return localStorage.getItem(KEY_BRUTAL_WARNING_SEEN) === "1";
}

export function markBrutalWarningSeen(): void {
  if (!isClient()) return;
  localStorage.setItem(KEY_BRUTAL_WARNING_SEEN, "1");
}
