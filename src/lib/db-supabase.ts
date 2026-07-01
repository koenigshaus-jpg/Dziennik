"use client";

import { getSupabaseClient } from "./supabase/client";

export interface ClientMedia {
  id: string;
  kind: "image" | "audio";
  path: string; // signed URL (read) lub data: URI / signed URL (write)
  mime: string;
  size: number;
  storageKey?: string; // klucz w bucket 'media' (gdy plik już wgrany)
}

export interface ClientEntry {
  id: string;
  contentHtml: string;
  contentText: string;
  mood: string | null;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  media: ClientMedia[];
}

export interface GalleryImage {
  mediaId: string;
  entryId: string;
  path: string; // signed URL (TTL 1h)
  mime: string;
  createdAt: number; // created_at wpisu (do sortowania / grupowania)
}

export type EntriesChangedKind = "create" | "update" | "delete";
export interface EntriesChangedDetail {
  id: string;
  kind: EntriesChangedKind;
}

const SIGNED_URL_TTL = 60 * 60; // 1h

function emitChanged(detail: EntriesChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("entries-changed", { detail }));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function requireUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Musisz być zalogowany.");
  }
  return data.user.id;
}

function extensionForMime(mime: string, kind: "image" | "audio"): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
  };
  return map[mime.toLowerCase()] ?? (kind === "image" ? "bin" : "webm");
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Nieprawidłowy data: URI.");
  const mime = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mime }), mime };
}

async function uploadMediaItem(
  userId: string,
  entryId: string,
  item: ClientMedia
): Promise<{ storageKey: string; mime: string; size: number }> {
  const supabase = getSupabaseClient();
  const { blob, mime } = dataUrlToBlob(item.path);
  const ext = extensionForMime(item.mime || mime, item.kind);
  const storageKey = `${userId}/${entryId}/${item.id}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(storageKey, blob, {
      contentType: item.mime || mime,
      upsert: true,
    });
  if (error) throw error;
  return { storageKey, mime: item.mime || mime, size: blob.size };
}

async function deleteStorageKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const supabase = getSupabaseClient();
  await supabase.storage.from("media").remove(keys);
}

async function signMedia(
  rows: {
    id: string;
    kind: "image" | "audio";
    path: string;
    mime: string;
    size: number;
  }[]
): Promise<ClientMedia[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrls(
      rows.map((r) => r.path),
      SIGNED_URL_TTL
    );
  if (error) throw error;
  return rows.map((r, i) => ({
    id: r.id,
    kind: r.kind,
    mime: r.mime,
    size: r.size,
    storageKey: r.path,
    path: data?.[i]?.signedUrl ?? "",
  }));
}

// --- Zapis wpisu przez Strapi (źródło prawdy) ---
// Wpis + tagi zapisujemy w Strapi przez server-side route (token ukryty).
// Lifecycle hook Strapi odbija treść do Supabase (entries + entry_tags) i
// wyzwala wektoryzację. Media zostają po stronie Supabase (niżej).

type StrapiEntryPayload = {
  entryId: string;
  contentHtml: string;
  contentText: string;
  mood: string | null;
  tags: string[];
  createdAt: string; // ISO
};

async function strapiEntryWrite(method: "POST" | "PUT", payload: StrapiEntryPayload): Promise<void> {
  const res = await fetch("/api/strapi/entries", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Zapis do Strapi nie powiódł się (${res.status}).`);
  }
}

async function strapiEntryDelete(entryId: string): Promise<void> {
  const res = await fetch(`/api/strapi/entries?entryId=${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Usunięcie w Strapi nie powiodło się (${res.status}).`);
  }
}

async function persistMedia(
  userId: string,
  entryId: string,
  desired: ClientMedia[],
  existing: { id: string; path: string }[]
): Promise<void> {
  const supabase = getSupabaseClient();
  const desiredIds = new Set(desired.map((m) => m.id));
  const toDelete = existing.filter((m) => !desiredIds.has(m.id));
  if (toDelete.length > 0) {
    await deleteStorageKeys(toDelete.map((m) => m.path));
    await supabase
      .from("media")
      .delete()
      .in(
        "id",
        toDelete.map((m) => m.id)
      );
  }
  const existingIds = new Set(existing.map((m) => m.id));
  for (const m of desired) {
    if (existingIds.has(m.id)) continue;
    const { storageKey, mime, size } = await uploadMediaItem(userId, entryId, m);
    const { error } = await supabase.from("media").insert({
      id: m.id,
      entry_id: entryId,
      user_id: userId,
      kind: m.kind,
      path: storageKey,
      mime,
      size,
    });
    if (error) throw error;
  }
}

export async function createEntry(input: {
  contentHtml: string;
  mood: string | null;
  createdAt: Date;
  tags: string[];
  media: ClientMedia[];
}): Promise<string> {
  const userId = await requireUserId();
  const id = newId();
  await strapiEntryWrite("POST", {
    entryId: id,
    contentHtml: input.contentHtml,
    contentText: htmlToText(input.contentHtml),
    mood: input.mood,
    tags: input.tags,
    createdAt: input.createdAt.toISOString(),
  });
  // wiersz entries istnieje już w Supabase (odbity przez most), więc FK mediów zadziała
  await persistMedia(userId, id, input.media, []);

  emitChanged({ id, kind: "create" });
  return id;
}

export async function updateEntry(
  id: string,
  input: {
    contentHtml: string;
    mood: string | null;
    createdAt: Date;
    tags: string[];
    media: ClientMedia[];
  }
): Promise<void> {
  const userId = await requireUserId();
  await strapiEntryWrite("PUT", {
    entryId: id,
    contentHtml: input.contentHtml,
    contentText: htmlToText(input.contentHtml),
    mood: input.mood,
    tags: input.tags,
    createdAt: input.createdAt.toISOString(),
  });

  const supabase = getSupabaseClient();
  const { data: existingMedia, error: emErr } = await supabase
    .from("media")
    .select("id,path")
    .eq("entry_id", id);
  if (emErr) throw emErr;
  await persistMedia(userId, id, input.media, existingMedia ?? []);

  emitChanged({ id, kind: "update" });
}

export async function deleteEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  // pobierz klucze mediów PRZED usunięciem (kaskada w Supabase skasuje wiersze media)
  const { data: mediaRows } = await supabase
    .from("media")
    .select("path")
    .eq("entry_id", id);
  if (mediaRows && mediaRows.length > 0) {
    await deleteStorageKeys(
      (mediaRows as { path: string }[]).map((m) => m.path)
    );
  }
  // usuń w Strapi → most kasuje wiersz entries w Supabase (kaskada: entry_tags, media, embeddings)
  await strapiEntryDelete(id);
  emitChanged({ id, kind: "delete" });
}

type RawEntry = {
  id: string;
  content_html: string;
  content_text: string;
  mood: string | null;
  created_at: string;
  updated_at: string;
  entry_tags: { tags: { name: string } | null }[] | null;
  media: {
    id: string;
    kind: "image" | "audio";
    path: string;
    mime: string;
    size: number;
  }[] | null;
};

const ENTRY_SELECT =
  "id,content_html,content_text,mood,created_at,updated_at,entry_tags(tags(name)),media(id,kind,path,mime,size)";

async function mapEntry(row: RawEntry): Promise<ClientEntry> {
  const tags = (row.entry_tags ?? [])
    .map((et) => et.tags?.name)
    .filter((n): n is string => !!n);
  const media = await signMedia(row.media ?? []);
  return {
    id: row.id,
    contentHtml: row.content_html,
    contentText: row.content_text,
    mood: row.mood,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    tags,
    media,
  };
}

export async function getEntry(id: string): Promise<ClientEntry | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapEntry(data as unknown as RawEntry);
}

export async function listEntries(opts?: {
  q?: string;
  tag?: string;
  from?: number;
  to?: number;
  moods?: string[];
}): Promise<ClientEntry[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .order("created_at", { ascending: false });

  if (opts?.q) {
    query = query.ilike("content_text", `%${opts.q}%`);
  }
  if (opts?.from != null) {
    query = query.gte("created_at", new Date(opts.from).toISOString());
  }
  if (opts?.to != null) {
    query = query.lte("created_at", new Date(opts.to).toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as RawEntry[];

  if (opts?.tag) {
    const t = opts.tag.toLowerCase();
    rows = rows.filter((r) =>
      (r.entry_tags ?? []).some((et) => et.tags?.name === t)
    );
  }
  if (opts?.moods && opts.moods.length > 0) {
    const set = new Set(opts.moods);
    rows = rows.filter((r) => {
      if (!r.mood) return false;
      return r.mood.split(",").some((k) => set.has(k.trim()));
    });
  }

  const out: ClientEntry[] = [];
  for (const r of rows) out.push(await mapEntry(r));
  return out;
}

/** Wszystkie zdjęcia użytkownika (RLS per user) posortowane malejąco po dacie
 *  wpisu. Wszystkie ścieżki podpisywane jednym batchem (jak signMedia). */
export async function listAllImages(): Promise<GalleryImage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("media")
    .select("id,entry_id,path,mime,kind,entries(created_at)")
    .eq("kind", "image");
  if (error) throw error;

  type Row = {
    id: string;
    entry_id: string;
    path: string;
    mime: string;
    entries: { created_at: string } | { created_at: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const createdAtOf = (r: Row): number => {
    const e = Array.isArray(r.entries) ? r.entries[0] : r.entries;
    return e ? new Date(e.created_at).getTime() : 0;
  };

  const { data: signed, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrls(
      rows.map((r) => r.path),
      SIGNED_URL_TTL
    );
  if (signErr) throw signErr;

  return rows
    .map((r, i) => ({
      mediaId: r.id,
      entryId: r.entry_id,
      path: signed?.[i]?.signedUrl ?? "",
      mime: r.mime,
      createdAt: createdAtOf(r),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllTagsWithCount(): Promise<
  { name: string; count: number }[]
> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tags")
    .select("name,entry_tags(entry_id)");
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    name: string;
    entry_tags: unknown[] | null;
  }[];
  return rows
    .map((t) => ({ name: t.name, count: t.entry_tags?.length ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

function normalizeTagName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

/**
 * Zmiana nazwy tagu. Jeśli docelowa nazwa już istnieje — łączy: wszystkie
 * wpisy ze starego tagu dostają nowy, stary tag jest usuwany.
 * Jeśli docelowa nie istnieje — zwykły UPDATE.
 * Po sukcesie emituje `entries-changed` dla każdego dotkniętego wpisu.
 */
export async function renameTag(
  oldName: string,
  newName: string
): Promise<{ merged: boolean }> {
  const userId = await requireUserId();
  const supabase = getSupabaseClient();
  const fromN = normalizeTagName(oldName);
  const toN = normalizeTagName(newName);
  if (!fromN || !toN) throw new Error("Nazwa tagu nie może być pusta.");
  if (fromN === toN) return { merged: false };

  // Pobierz źródłowy + ewentualny docelowy
  const { data: srcRows, error: srcErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", fromN)
    .maybeSingle();
  if (srcErr) throw srcErr;
  if (!srcRows) throw new Error(`Tag "${oldName}" nie istnieje.`);
  const sourceId = srcRows.id as string;

  const { data: dstRows, error: dstErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", toN)
    .maybeSingle();
  if (dstErr) throw dstErr;

  // Lista wpisów dotkniętych zmianą — potrzebna do emisji eventów.
  const { data: linkRows, error: linkErr } = await supabase
    .from("entry_tags")
    .select("entry_id")
    .eq("tag_id", sourceId);
  if (linkErr) throw linkErr;
  const affectedEntryIds: string[] = Array.from(
    new Set((linkRows ?? []).map((r: { entry_id: string }) => r.entry_id))
  );

  let merged = false;
  if (!dstRows) {
    // Prosty rename
    const { error } = await supabase
      .from("tags")
      .update({ name: toN })
      .eq("id", sourceId);
    if (error) throw error;
  } else {
    merged = true;
    const targetId = dstRows.id as string;
    if (affectedEntryIds.length > 0) {
      // Wpisy które już mają target tag — tylko usuwamy źródło.
      const { data: existingTargetLinks, error: etlErr } = await supabase
        .from("entry_tags")
        .select("entry_id")
        .eq("tag_id", targetId)
        .in("entry_id", affectedEntryIds);
      if (etlErr) throw etlErr;
      const alreadyHasTarget = new Set(
        (existingTargetLinks ?? []).map((r: { entry_id: string }) => r.entry_id)
      );
      const needTargetLink = affectedEntryIds.filter(
        (id) => !alreadyHasTarget.has(id)
      );
      if (needTargetLink.length > 0) {
        const { error: insErr } = await supabase
          .from("entry_tags")
          .insert(
            needTargetLink.map((entry_id) => ({
              entry_id,
              tag_id: targetId,
            }))
          );
        if (insErr) throw insErr;
      }
      // Usuń źródłowe linki
      const { error: delLnkErr } = await supabase
        .from("entry_tags")
        .delete()
        .eq("tag_id", sourceId);
      if (delLnkErr) throw delLnkErr;
    }
    // Usuń źródłowy tag
    const { error: delTagErr } = await supabase
      .from("tags")
      .delete()
      .eq("id", sourceId);
    if (delTagErr) throw delTagErr;
  }

  for (const id of affectedEntryIds) {
    emitChanged({ id, kind: "update" });
  }
  return { merged };
}

/**
 * Usuwa tag i wszystkie jego przypisania do wpisów. Same wpisy zostają.
 */
export async function deleteTag(name: string): Promise<void> {
  const userId = await requireUserId();
  const supabase = getSupabaseClient();
  const n = normalizeTagName(name);
  if (!n) return;

  const { data: tagRow, error: tagErr } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", n)
    .maybeSingle();
  if (tagErr) throw tagErr;
  if (!tagRow) return;
  const tagId = tagRow.id as string;

  const { data: linkRows, error: linkErr } = await supabase
    .from("entry_tags")
    .select("entry_id")
    .eq("tag_id", tagId);
  if (linkErr) throw linkErr;
  const affectedEntryIds: string[] = Array.from(
    new Set((linkRows ?? []).map((r: { entry_id: string }) => r.entry_id))
  );

  const { error: delLnkErr } = await supabase
    .from("entry_tags")
    .delete()
    .eq("tag_id", tagId);
  if (delLnkErr) throw delLnkErr;

  const { error: delTagErr } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId);
  if (delTagErr) throw delTagErr;

  for (const id of affectedEntryIds) {
    emitChanged({ id, kind: "update" });
  }
}
