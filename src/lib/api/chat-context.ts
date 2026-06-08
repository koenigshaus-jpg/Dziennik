// Builduje kontekst dla agenta po stronie serwera. UI bierze go z IndexedDB,
// API bierze z Supabase. Ten plik to API-side odpowiednik
// `src/lib/agent/entries-context.ts`.

import type { EntryFull, EntryIndexItem } from "@/lib/agent/types";
import { getSupabaseAdmin } from "./supabase-admin";
import { htmlToPlainText } from "./entries-repo";

const INDEX_SNIPPET_LEN = 200;

interface ContextRow {
  id: string;
  created_at: string;
  content_text: string | null;
  content_html: string | null;
  mood: string | null;
  entry_tags?: Array<{ tags: { name: string } | null }> | null;
}

export async function buildChatContext(
  userId: string,
  day: string
): Promise<{ dayEntries: EntryFull[]; entriesIndex: EntryIndexItem[] }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("entries")
    .select("id, created_at, content_text, content_html, mood, entry_tags(tags(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ContextRow[]>();
  if (error) throw new Error(`buildChatContext: ${error.message}`);

  const rows = data ?? [];
  const dayEntries: EntryFull[] = [];
  const entriesIndex: EntryIndexItem[] = [];

  for (const r of rows) {
    const dateOnly = r.created_at.slice(0, 10);
    const tags = (r.entry_tags ?? [])
      .map((et) => et.tags?.name)
      .filter((n): n is string => typeof n === "string");
    const plain = r.content_text ?? htmlToPlainText(r.content_html ?? "");

    if (dateOnly === day) {
      dayEntries.push({
        id: r.id,
        title: null,
        plainText: plain,
        mood: r.mood ?? undefined,
        tags,
      });
    } else {
      entriesIndex.push({
        id: r.id,
        date: dateOnly,
        title: null,
        snippet: plain.slice(0, INDEX_SNIPPET_LEN),
        mood: r.mood ?? undefined,
        tags,
      });
    }
  }

  return { dayEntries, entriesIndex };
}

/** Server-side fetchEntry — proste SELECT do Supabase. */
export async function fetchEntryServer(
  userId: string,
  entryId: string
): Promise<{ id: string; date: string; mood: string | null; tags: string[]; plainText: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("entries")
    .select("id, created_at, content_text, content_html, mood, entry_tags(tags(name))")
    .eq("user_id", userId)
    .eq("id", entryId)
    .maybeSingle<ContextRow>();
  if (error || !data) return null;
  const tags = (data.entry_tags ?? [])
    .map((et) => et.tags?.name)
    .filter((n): n is string => typeof n === "string");
  return {
    id: data.id,
    date: data.created_at.slice(0, 10),
    mood: data.mood,
    tags,
    plainText: data.content_text ?? htmlToPlainText(data.content_html ?? ""),
  };
}
