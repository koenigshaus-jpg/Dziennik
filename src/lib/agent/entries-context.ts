// Buduje kontekst wpisów dla pojedynczego requestu do /api/chat:
// pełne treści dla aktualnego dnia + lekki indeks reszty (id + snippet + tagi).
// Pełną treść konkretnego wpisu model dociąga przez tool `fetchEntry`.

"use client";

import { listEntries, type ClientEntry } from "@/lib/db-supabase";
import type { EntryFull, EntryIndexItem } from "./types";

const SNIPPET_MAX = 200;

function isoFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function titleFromText(text: string): string | null {
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return null;
  return firstLine.length > 60 ? firstLine.slice(0, 59) + "…" : firstLine;
}

function snippetFromText(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SNIPPET_MAX) return collapsed;
  return collapsed.slice(0, SNIPPET_MAX - 1) + "…";
}

function entryToFull(e: ClientEntry): EntryFull {
  return {
    id: e.id,
    title: titleFromText(e.contentText),
    plainText: e.contentText,
    mood: e.mood ?? undefined,
    tags: e.tags.length > 0 ? e.tags : undefined,
  };
}

function entryToIndex(e: ClientEntry): EntryIndexItem {
  return {
    id: e.id,
    date: isoFromTs(e.createdAt),
    title: titleFromText(e.contentText),
    snippet: snippetFromText(e.contentText),
    mood: e.mood ?? undefined,
    tags: e.tags.length > 0 ? e.tags : undefined,
  };
}

/**
 * Ładuje wszystkie wpisy z IDB. Dla bieżącego dnia (`day`) zwraca pełną treść,
 * dla pozostałych — lekki indeks (id + snippet + tagi + data). Model po pełną
 * treść sięga przez tool `fetchEntry(id)`.
 */
export async function buildEntriesContext(day: string): Promise<{
  dayEntries: EntryFull[];
  entriesIndex: EntryIndexItem[];
}> {
  const all = await listEntries();
  const dayEntries: EntryFull[] = [];
  const entriesIndex: EntryIndexItem[] = [];
  for (const e of all) {
    if (isoFromTs(e.createdAt) === day) {
      dayEntries.push(entryToFull(e));
    } else {
      entriesIndex.push(entryToIndex(e));
    }
  }
  return { dayEntries, entriesIndex };
}
