// Wyszukiwanie hybrydowe wpisów: wektorowe (entry_embeddings) + relacyjne (full-text)
// + zawsze ostatnie 7 dni względem `day`. Cała logika doboru/rankingu/limitu siedzi
// w funkcji SQL `search_entries_hybrid` (migracja 0002). Tu: embedding zapytania
// (serwerowo) + jedno wywołanie RPC + mapowanie na RetrievedEntry.
//
// Server-only. Auth sprawdzony przez wywołującego — `userId` przekazujemy explicite
// (admin-client bypassuje RLS, RPC filtruje po `filter_user_id`).

import type { RetrievedEntry, RetrievalSource } from "@/lib/agent/types";
import { getSupabaseAdmin } from "./supabase-admin";
import { embedText } from "./embeddings";

interface HybridOptions {
  /** Dzień-kotwica (YYYY-MM-DD) dla okna „ostatnie N dni". */
  day: string;
  recentDays?: number;
  /** Ile trafień z każdej z metod (wektor / keyword). */
  matchCount?: number;
  /** Twardy limit zwracanych wpisów (poza zawsze-dołączanymi z ostatnich dni). */
  limit?: number;
}

interface HybridRow {
  id: string;
  created_at: string;
  plain_text: string;
  mood: string | null;
  tags: string[] | null;
  sources: RetrievalSource[] | null;
  similarity: number | null;
}

/**
 * Zwraca najtrafniejsze wpisy użytkownika dla danego zapytania.
 * Pusty `query` → tylko ostatnie `recentDays` dni (wektor/keyword pominięte).
 */
export async function hybridSearchEntries(
  userId: string,
  query: string,
  opts: HybridOptions
): Promise<RetrievedEntry[]> {
  const embedding = await embedText(query); // null gdy pusty query

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("search_entries_hybrid", {
    filter_user_id: userId,
    query_embedding: embedding,
    query_text: query ?? "",
    anchor_date: opts.day,
    match_count: opts.matchCount ?? 30,
    recent_days: opts.recentDays ?? 7,
    result_limit: opts.limit ?? 50,
  });
  if (error) throw new Error(`hybridSearchEntries: ${error.message}`);

  const rows = (data ?? []) as HybridRow[];
  return rows.map((r) => ({
    id: r.id,
    date: r.created_at.slice(0, 10),
    plainText: r.plain_text,
    mood: r.mood ?? undefined,
    tags: r.tags && r.tags.length > 0 ? r.tags : undefined,
    sources: r.sources ?? [],
    similarity: r.similarity ?? undefined,
  }));
}
