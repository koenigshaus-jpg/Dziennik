// Klient-side preferencje agenta. Cały stan w localStorage —
// zachowywany lokalnie, niesynchronizowany.

"use client";

import type { PersonaKey } from "./types";
import { PERSONA_ORDER, PERSONAS } from "./personas";

const KEY_DEFAULT_PERSONA = "agent.defaultPersona";
const KEY_DEEP_MODE = (k: PersonaKey) => `agent.deepMode.${k}`;

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getDefaultPersona(): PersonaKey {
  if (!isClient()) return PERSONA_ORDER[0];
  const v = localStorage.getItem(KEY_DEFAULT_PERSONA);
  if (v && v in PERSONAS) return v as PersonaKey;
  // Backward compat: stary "stoic" → philosopher
  if (v === "stoic") return "philosopher";
  return PERSONA_ORDER[0];
}

export function setDefaultPersona(key: PersonaKey): void {
  if (!isClient()) return;
  localStorage.setItem(KEY_DEFAULT_PERSONA, key);
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
