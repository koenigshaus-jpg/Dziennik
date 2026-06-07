import type { PersonaConfig, PersonaKey, PersonaVariant } from "../types";
import { advisor } from "./advisor";
import { careerCoach } from "./career-coach";
import { creative } from "./creative";
import { philosopher } from "./philosopher";
import { productivity } from "./productivity";
import { stoic } from "./stoic";
import { therapist } from "./therapist";

export const PERSONAS: Record<PersonaKey, PersonaConfig> = {
  advisor,
  therapist,
  philosopher,
  careerCoach,
  stoic,
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
  "stoic",
];

export function getPersona(key: PersonaKey): PersonaConfig {
  return PERSONAS[key];
}

export function getVariant(
  key: PersonaKey,
  variantId: string
): PersonaVariant {
  const persona = PERSONAS[key];
  const variant = persona.variants.find((v) => v.id === variantId);
  return variant ?? persona.variants[0];
}

/** Domyślny wariant dla persony — pierwszy z listy. */
export function getDefaultVariantId(key: PersonaKey): string {
  return PERSONAS[key].variants[0].id;
}
