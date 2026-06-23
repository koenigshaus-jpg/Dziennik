import type { PersonaConfig, RetrievedEntry } from "./types";

interface BuildSystemPromptOptions {
  persona: PersonaConfig;
  /** Dzień w którym jest użytkownik, YYYY-MM-DD. */
  day: string;
  /** Wpisy z wyszukiwania hybrydowego — najtrafniejsze semantycznie/słowowo + ostatnie dni. */
  retrieved: RetrievedEntry[];
}

/**
 * Składa system prompt: prompt persony + kontekst dnia + wpisy dostarczone przez
 * wyszukiwanie hybrydowe. Wpisy dzielimy na dwie grupy:
 *  - „najtrafniejsze" (trafienie semantyczne lub po słowach kluczowych),
 *  - „ostatnie 7 dni" (wpisy z okna czasowego, zawsze dołączane).
 * Model odpowiada WYŁĄCZNIE na podstawie tych wpisów — nie zgaduje treści spoza nich.
 */
export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { persona, day, retrieved } = opts;

  const parts: string[] = [];
  parts.push(persona.systemPrompt.trim());

  parts.push("\n\n— — —\n\nKONTEKST UŻYTKOWNIKA\n");
  parts.push(`Dzisiaj jest ${formatDayPl(day)}.\n`);

  // Podział: trafienia z wyszukiwania (vector/keyword) vs tylko „ostatnie dni".
  const matched = retrieved.filter(
    (e) => e.sources.includes("vector") || e.sources.includes("keyword")
  );
  const recentOnly = retrieved.filter(
    (e) => !e.sources.includes("vector") && !e.sources.includes("keyword")
  );

  parts.push(
    "\nPoniżej wpisy z dziennika dobrane wyszukiwaniem do pytania użytkownika. " +
      "Opieraj odpowiedź WYŁĄCZNIE na nich — nie zmyślaj treści, których tu nie ma. " +
      "Jeśli wpisy nie zawierają odpowiedzi, powiedz to wprost.\n"
  );

  if (matched.length > 0) {
    parts.push(
      `\n— — —\n\nNAJTRAFNIEJSZE WPISY (${matched.length}) — pełna treść:\n`
    );
    renderEntries(matched, parts);
  }

  if (recentOnly.length > 0) {
    parts.push(
      `\n— — —\n\nOSTATNIE 7 DNI (${recentOnly.length}) — pełna treść:\n`
    );
    renderEntries(recentOnly, parts);
  }

  if (matched.length === 0 && recentOnly.length === 0) {
    parts.push("\nBrak wpisów pasujących do pytania i z ostatnich dni.\n");
  }

  return parts.join("");
}

const SOURCE_LABEL: Record<string, string> = {
  vector: "trafienie semantyczne",
  keyword: "słowa kluczowe",
  recent: "ostatnie 7 dni",
};

function renderEntries(entries: RetrievedEntry[], parts: string[]) {
  entries.forEach((entry, idx) => {
    const labels = entry.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ");
    parts.push(
      `\n[Wpis ${idx + 1} — ${formatDayPl(entry.date)}] (id: ${entry.id})` +
        (labels ? ` [${labels}]` : "") +
        "\n"
    );
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
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_PL[m - 1]} ${y}`;
}
