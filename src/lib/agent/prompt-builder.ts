import type { PersonaConfig, PersonaVariant, EntryFull } from "./types";

interface BuildSystemPromptOptions {
  persona: PersonaConfig;
  variant: PersonaVariant;
  /** Dzień w którym jest użytkownik, YYYY-MM-DD. */
  day: string;
  /** Pełna treść wpisów z tego dnia. */
  dayEntries: EntryFull[];
  /** Pełne wpisy ze wszystkich pozostałych dni (z polem date). */
  otherEntries: EntryFull[];
}

/**
 * Składa system prompt z 4 sekcji w stałej kolejności:
 *  1) bazowy prompt persony
 *  2) fragment wariantu (konkretna szkoła / postać)
 *  3) kontekst dnia (pełne wpisy)
 *  4) pełne wpisy z pozostałych dni
 */
export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { persona, variant, day, dayEntries, otherEntries } = opts;

  const parts: string[] = [];

  parts.push(persona.baseSystemPrompt.trim());
  parts.push("\n\n— — —\n\n");
  parts.push(variant.systemPromptFragment.trim());

  parts.push("\n\n— — —\n\nKONTEKST UŻYTKOWNIKA\n");
  parts.push(`Dzisiaj jest ${formatDayPl(day)}.\n`);

  if (dayEntries.length === 0) {
    parts.push("\nUżytkownik nie ma żadnych wpisów z tego dnia.\n");
  } else {
    parts.push(`\nWpisy z tego dnia (${dayEntries.length}):\n`);
    renderEntries(dayEntries, parts);
  }

  if (otherEntries.length > 0) {
    parts.push(`\n— — —\n\nPOZOSTAŁE WPISY Z DZIENNIKA (${otherEntries.length})\n`);
    parts.push("Wpisy z poprzednich dni — pełna treść dostępna poniżej:\n");
    renderEntries(otherEntries, parts, true);
  }

  return parts.join("");
}

function renderEntries(entries: EntryFull[], parts: string[], showDate = false) {
  entries.forEach((entry, idx) => {
    const dateLabel = showDate && entry.date ? ` — ${formatDayPl(entry.date)}` : "";
    parts.push(`\n[Wpis ${idx + 1}${dateLabel}${entry.title ? ` — ${entry.title}` : ""}]\n`);
    if (entry.mood) parts.push(`Nastrój: ${entry.mood}\n`);
    if (entry.tags?.length) parts.push(`Tagi: ${entry.tags.join(", ")}\n`);
    parts.push("\n");
    parts.push(entry.plainText.trim());
    parts.push("\n");
  });
}

const MONTHS_PL = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

function formatDayPl(iso: string): string {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}
