// Wspólne queries do tabel entries / tags / entry_tags. Używane przez handlery
// /api/v1/* oraz przez chat (do budowy kontekstu dnia).
//
// Każda funkcja przyjmuje `userId` explicite — RLS jest bypassowany przez
// service-role klient, więc filtr per-user MUSI być wymuszony tutaj.

import { getSupabaseAdmin } from "./supabase-admin";
import { ApiError } from "./handler";

export interface EntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  content_text: string;
  content_html: string;
  mood: string | null;
  tags: string[];
}

interface RawEntryRow {
  id: string;
  created_at: string;
  updated_at: string;
  content_text: string | null;
  content_html: string | null;
  mood: string | null;
  entry_tags?: Array<{ tags: { name: string } | null }> | null;
}

function mapEntry(r: RawEntryRow): EntryRow {
  return {
    id: r.id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    content_text: r.content_text ?? "",
    content_html: r.content_html ?? "",
    mood: r.mood,
    tags: (r.entry_tags ?? [])
      .map((et) => et.tags?.name)
      .filter((n): n is string => typeof n === "string"),
  };
}

const SELECT_WITH_TAGS =
  "id, created_at, updated_at, content_text, content_html, mood, entry_tags(tags(name))";

// — — — Plain text → minimalny HTML (lustrzane odbicie skill/text_to_html). — — —
export function textToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\n\s*\n/);
  return parts
    .map((p) => {
      const escaped = escapeHtml(p.trim()).replace(/\n/g, "<br>");
      return escaped ? `<p>${escaped}</p>` : "";
    })
    .filter(Boolean)
    .join("");
}

export function htmlToPlainText(html: string): string {
  // Minimalne: zamień <br> i </p> na newline, zdejmij resztę tagów, decode entities.
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// — — — Tagi: ensure / list. — — —

export async function ensureTag(userId: string, name: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name })
    .select("id")
    .single();
  if (error) throw new ApiError("tag_create_failed", 500, error.message);
  return data.id;
}

export async function listUserTags(userId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tags")
    .select("name")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw new ApiError("tags_list_failed", 500, error.message);
  return (data ?? []).map((r) => r.name);
}

// — — — Entries: create / read / update / delete. — — —

export interface CreateEntryInput {
  text: string;
  html?: string;
  mood?: string | null;
  tags?: string[];
  createdAt?: string;
}

export async function createEntry(userId: string, input: CreateEntryInput): Promise<EntryRow> {
  if (!input.text?.trim()) throw new ApiError("empty_text", 400);

  const supabase = getSupabaseAdmin();
  const ts = input.createdAt ?? new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("entries")
    .insert({
      user_id: userId,
      content_text: input.text,
      content_html: input.html ?? textToHtml(input.text),
      mood: input.mood ?? null,
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();
  if (error) throw new ApiError("entry_create_failed", 500, error.message);

  for (const tagName of input.tags ?? []) {
    const tid = await ensureTag(userId, tagName);
    const { error: linkErr } = await supabase
      .from("entry_tags")
      .insert({ entry_id: inserted.id, tag_id: tid });
    // Ignore duplicate-key (PK conflict means already linked)
    if (linkErr && !/duplicate|unique/i.test(linkErr.message)) {
      throw new ApiError("tag_link_failed", 500, linkErr.message);
    }
  }

  return await getEntry(userId, inserted.id);
}

export async function getEntry(userId: string, id: string): Promise<EntryRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("entries")
    .select(SELECT_WITH_TAGS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle<RawEntryRow>();
  if (error) throw new ApiError("entry_get_failed", 500, error.message);
  if (!data) throw new ApiError("not_found", 404);
  return mapEntry(data);
}

export interface ListEntriesFilters {
  day?: string;        // YYYY-MM-DD — preferowane; nadpisuje from/to
  from?: string;       // YYYY-MM-DD
  to?: string;         // YYYY-MM-DD
  tag?: string;
  mood?: string;
  limit?: number;
}

export async function listEntries(
  userId: string,
  filters: ListEntriesFilters = {}
): Promise<EntryRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("entries")
    .select(SELECT_WITH_TAGS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 50);

  if (filters.day) {
    q = q
      .gte("created_at", `${filters.day}T00:00:00`)
      .lte("created_at", `${filters.day}T23:59:59.999`);
  } else {
    if (filters.from) q = q.gte("created_at", `${filters.from}T00:00:00`);
    if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59.999`);
  }
  if (filters.mood) q = q.ilike("mood", `%${filters.mood}%`);

  const { data, error } = await q.returns<RawEntryRow[]>();
  if (error) throw new ApiError("entries_list_failed", 500, error.message);
  let rows = (data ?? []).map(mapEntry);
  if (filters.tag) rows = rows.filter((r) => r.tags.includes(filters.tag!));
  return rows;
}

export interface UpdateEntryInput {
  text?: string;
  html?: string;
  mood?: string | null;
  createdAt?: string;
}

export async function updateEntry(
  userId: string,
  id: string,
  patch: UpdateEntryInput
): Promise<EntryRow> {
  // Sprawdź własność najpierw (RLS bypass — explicit check)
  await getEntry(userId, id);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.text !== undefined) {
    update.content_text = patch.text;
    update.content_html = patch.html ?? textToHtml(patch.text);
  } else if (patch.html !== undefined) {
    update.content_html = patch.html;
    update.content_text = htmlToPlainText(patch.html);
  }
  if (patch.mood !== undefined) update.mood = patch.mood;
  if (patch.createdAt !== undefined) update.created_at = patch.createdAt;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("entries")
    .update(update)
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new ApiError("entry_update_failed", 500, error.message);
  return await getEntry(userId, id);
}

export async function deleteEntry(userId: string, id: string): Promise<void> {
  // Sprawdź własność (też zwraca 404 jeśli już nie istnieje)
  await getEntry(userId, id);
  const supabase = getSupabaseAdmin();
  await supabase.from("entry_tags").delete().eq("entry_id", id);
  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new ApiError("entry_delete_failed", 500, error.message);
}

export async function attachTag(userId: string, entryId: string, tagName: string): Promise<EntryRow> {
  await getEntry(userId, entryId);
  const tid = await ensureTag(userId, tagName);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("entry_tags")
    .insert({ entry_id: entryId, tag_id: tid });
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw new ApiError("tag_link_failed", 500, error.message);
  }
  return await getEntry(userId, entryId);
}

export async function detachTag(userId: string, entryId: string, tagName: string): Promise<EntryRow> {
  await getEntry(userId, entryId);
  const supabase = getSupabaseAdmin();
  const { data: tag } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", tagName)
    .maybeSingle();
  if (!tag) throw new ApiError("tag_not_found", 404);
  const { error } = await supabase
    .from("entry_tags")
    .delete()
    .eq("entry_id", entryId)
    .eq("tag_id", tag.id);
  if (error) throw new ApiError("tag_unlink_failed", 500, error.message);
  return await getEntry(userId, entryId);
}

export async function setMood(userId: string, entryId: string, mood: string | null): Promise<EntryRow> {
  return await updateEntry(userId, entryId, { mood });
}
