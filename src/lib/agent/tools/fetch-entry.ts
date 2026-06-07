// Tool wywoływany przez model gdy potrzebuje pełnej treści wpisu z indeksu.
// Brak `execute` — narzędzie jest wykonywane PO STRONIE KLIENTA (useChat onToolCall),
// bo dane mieszkają w IndexedDB użytkownika, niedostępnej z serwera.
//
// Kontrakt: model dostaje id z indeksu w system prompcie i woła `fetchEntry({ id })`.
// Klient czyta wpis przez `getEntry(id)` z db-client i zwraca treść jako tool result.

import { tool } from "ai";
import { z } from "zod";

export const fetchEntryTool = tool({
  description:
    "Pobiera pełną treść wpisu z dziennika użytkownika po jego id (id pochodzi z sekcji INDEKS POZOSTAŁYCH WPISÓW w system prompcie). Używaj gdy potrzebujesz dokładnej treści, nie tylko snippetu.",
  inputSchema: z.object({
    id: z.string().describe("id wpisu z indeksu (UUID)"),
  }),
});

/** Zbiorczy rejestr toolings dostępnych dla agenta. */
export const agentTools = {
  fetchEntry: fetchEntryTool,
} as const;

export type AgentToolName = keyof typeof agentTools;
