// Buduje kontekst wpisów dla pojedynczego requestu do /api/chat:
// pełne treści dla aktualnego dnia + lekki indeks reszty.

"use client";

import { listEntries, type ClientEntry } from "@/lib/db-client";
import type { EntryFull, EntryIndexItem } from "./types";

function isoFromTs(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function snippet(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "…";
}

function titleFromText(text: string): string | null {
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return null;
  return firstLine.length > 60 ? firstLine.slice(0, 59) + "…" : firstLine;
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
    snippet: snippet(e.contentText),
    mood: e.mood ?? undefined,
    tags: e.tags.length > 0 ? e.tags : undefined,
  };
}

/** Ładuje wszystkie wpisy z IDB i rozdziela na "dzisiaj (day)" + indeks reszty. */
export async function buildEntriesContext(day: string): Promise<{
  dayEntries: EntryFull[];
  entriesIndex: EntryIndexItem[];
}> {
  const all = await listEntries();
  const dayEntries: EntryFull[] = [];
  const indexItems: EntryIndexItem[] = [];
  for (const e of all) {
    if (isoFromTs(e.createdAt) === day) {
      dayEntries.push(entryToFull(e));
    } else {
      indexItems.push(entryToIndex(e));
    }
  }
  return { dayEntries, entriesIndex: indexItems };
}
