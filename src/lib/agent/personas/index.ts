import type { PersonaConfig, PersonaKey } from "../types";
import { advisor } from "./advisor";
import { careerCoach } from "./career-coach";
import { creative } from "./creative";
import { philosopher } from "./philosopher";
import { productivity } from "./productivity";
import { therapist } from "./therapist";

export const PERSONAS: Record<PersonaKey, PersonaConfig> = {
  advisor,
  therapist,
  philosopher,
  careerCoach,
  creative,
  productivity,
};

/** Kolejność wyświetlania w menu wyboru. */
export const PERSONA_ORDER: PersonaKey[] = [
  "advisor",
  "careerCoach",
  "productivity",
  "creative",
  "therapist",
  "philosopher",
];

/**
 * Zwraca personę po kluczu. Fallback do pierwszej, jeśli klucz nieznany
 * (np. stara rozmowa zapisana pod usuniętym kluczem "stoic" → trafia do
 * filozofa, który scałkował esencję stoika).
 */
export function getPersona(key: PersonaKey | string): PersonaConfig {
  const k = key as PersonaKey;
  if (PERSONAS[k]) return PERSONAS[k];
  // Backward compat: dawne "stoic" → philosopher
  if (key === "stoic") return PERSONAS.philosopher;
  return PERSONAS[PERSONA_ORDER[0]];
}
