// Buduje kontekst wpisów dla pojedynczego requestu do /api/chat:
// pełne treści dla aktualnego dnia + pełne treści wszystkich pozostałych wpisów.

"use client";

import { listEntries, type ClientEntry } from "@/lib/db-client";
import type { EntryFull } from "./types";

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

function entryToFull(e: ClientEntry, includeDate = false): EntryFull {
  return {
    id: e.id,
    ...(includeDate ? { date: isoFromTs(e.createdAt) } : {}),
    title: titleFromText(e.contentText),
    plainText: e.contentText,
    mood: e.mood ?? undefined,
    tags: e.tags.length > 0 ? e.tags : undefined,
  };
}

/** Ładuje wszystkie wpisy z IDB i rozdziela na "dzisiaj (day)" + reszta jako pełne wpisy. */
export async function buildEntriesContext(day: string): Promise<{
  dayEntries: EntryFull[];
  otherEntries: EntryFull[];
}> {
  const all = await listEntries();
  const dayEntries: EntryFull[] = [];
  const otherEntries: EntryFull[] = [];
  for (const e of all) {
    if (isoFromTs(e.createdAt) === day) {
      dayEntries.push(entryToFull(e));
    } else {
      otherEntries.push(entryToFull(e, true));
    }
  }
  return { dayEntries, otherEntries };
}
