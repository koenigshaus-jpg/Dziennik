import type { PersonaConfig, EntryFull, EntryIndexItem } from "./types";

interface BuildSystemPromptOptions {
  persona: PersonaConfig;
  /** Dzień w którym jest użytkownik, YYYY-MM-DD. */
  day: string;
  /** Pełna treść wpisów z tego dnia. */
  dayEntries: EntryFull[];
  /** Indeks wpisów z pozostałych dni (id + snippet + tagi + data). */
  entriesIndex: EntryIndexItem[];
}

/**
 * Składa system prompt: prompt persony + kontekst dnia + wpisy bieżącego dnia
 * (pełna treść) + indeks pozostałych wpisów. Pełną treść konkretnego wpisu
 * model dociąga przez tool `fetchEntry({ id })`.
 */
export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { persona, day, dayEntries, entriesIndex } = opts;

  const parts: string[] = [];

  parts.push(persona.systemPrompt.trim());

  parts.push("\n\n— — —\n\nKONTEKST UŻYTKOWNIKA\n");
  parts.push(`Dzisiaj jest ${formatDayPl(day)}.\n`);

  if (dayEntries.length === 0) {
    parts.push("\nUżytkownik nie ma żadnych wpisów z tego dnia.\n");
  } else {
    parts.push(`\nWpisy z tego dnia (${dayEntries.length}) — pełna treść:\n`);
    renderFullEntries(dayEntries, parts);
  }

  if (entriesIndex.length > 0) {
    parts.push(
      `\n— — —\n\nINDEKS POZOSTAŁYCH WPISÓW (${entriesIndex.length})\n`
    );
    parts.push(
      "Poniżej lista wszystkich wpisów z poprzednich dni — tylko skrót. " +
        "Gdy potrzebujesz pełnej treści konkretnego wpisu, wywołaj narzędzie " +
        "`fetchEntry({ id })` z `id` z tej listy. Nie zgaduj treści — sięgaj " +
        "po wpis przez narzędzie zawsze gdy jest istotny dla rozmowy.\n"
    );
    renderIndex(entriesIndex, parts);
  }

  return parts.join("");
}

function renderFullEntries(entries: EntryFull[], parts: string[]) {
  entries.forEach((entry, idx) => {
    parts.push(
      `\n[Wpis ${idx + 1}${entry.title ? ` — ${entry.title}` : ""}] (id: ${entry.id})\n`
    );
    if (entry.mood) parts.push(`Nastrój: ${entry.mood}\n`);
    if (entry.tags?.length) parts.push(`Tagi: ${entry.tags.join(", ")}\n`);
    parts.push("\n");
    parts.push(entry.plainText.trim());
    parts.push("\n");
  });
}

function renderIndex(entries: EntryIndexItem[], parts: string[]) {
  parts.push("\n");
  entries.forEach((entry) => {
    const title = entry.title ? ` — ${entry.title}` : "";
    parts.push(`- ${formatDayPl(entry.date)}${title} (id: ${entry.id})\n`);
    if (entry.mood) parts.push(`  Nastrój: ${entry.mood}\n`);
    if (entry.tags?.length) parts.push(`  Tagi: ${entry.tags.join(", ")}\n`);
    parts.push(`  Skrót: ${entry.snippet}\n`);
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
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}
