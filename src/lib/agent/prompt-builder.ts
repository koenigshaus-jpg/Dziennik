import type { PersonaConfig, PersonaVariant, EntryFull, EntryIndexItem } from "./types";

interface BuildSystemPromptOptions {
  persona: PersonaConfig;
  variant: PersonaVariant;
  /** Dzień w którym jest użytkownik, YYYY-MM-DD. */
  day: string;
  /** Pełna treść wpisów z tego dnia. */
  dayEntries: EntryFull[];
  /** Indeks wszystkich pozostałych wpisów. */
  entriesIndex: EntryIndexItem[];
}

const MAX_INDEX_ITEMS = 80; // limit żeby kontekst nie eksplodował na bardzo długiej historii

/**
 * Składa system prompt z 4 sekcji w stałej kolejności:
 *  1) bazowy prompt persony
 *  2) fragment wariantu (konkretna szkoła / postać)
 *  3) kontekst dnia (pełne wpisy)
 *  4) lekki indeks pozostałych wpisów (do tool calling)
 *
 * Kolejność jest stała — to pozwala OpenAI cacheować prefix po stronie API
 * (prompt caching ~50% taniej dla powtarzających się prefixów).
 */
export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { persona, variant, day, dayEntries, entriesIndex } = opts;

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
    dayEntries.forEach((entry, idx) => {
      parts.push(`\n[Wpis ${idx + 1}${entry.title ? ` — ${entry.title}` : ""}]\n`);
      if (entry.mood) parts.push(`Nastrój: ${entry.mood}\n`);
      if (entry.tags?.length) parts.push(`Tagi: ${entry.tags.join(", ")}\n`);
      parts.push("\n");
      parts.push(entry.plainText.trim());
      parts.push("\n");
    });
  }

  if (entriesIndex.length > 0) {
    const trimmed = entriesIndex.slice(0, MAX_INDEX_ITEMS);
    parts.push(
      `\n— — —\n\nINDEKS POZOSTAŁYCH WPISÓW (${trimmed.length}${
        entriesIndex.length > trimmed.length ? ` z ${entriesIndex.length}` : ""
      })\n`
    );
    parts.push(
      "Każdy wpis: [id] data | tytuł | snippet | tagi. Gdy potrzebujesz pełnej treści wpisu, wywołaj narzędzie fetchEntry z jego id.\n\n"
    );
    trimmed.forEach((item) => {
      const title = item.title ? ` | ${item.title}` : "";
      const tags = item.tags?.length ? ` | #${item.tags.join(" #")}` : "";
      const snippet = item.snippet.replace(/\s+/g, " ").trim();
      parts.push(`[${item.id}] ${item.date}${title} | ${snippet}${tags}\n`);
    });
  }

  return parts.join("");
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
