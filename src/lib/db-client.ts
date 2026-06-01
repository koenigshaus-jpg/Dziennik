// Klient-side baza w IndexedDB. Cała persystencja w przeglądarce —
// dane przeżywają restart Vercela, telefonu, przeglądarki.
// NIE synchronizują się między urządzeniami.

const DB_NAME = "dziennik";
const DB_VERSION = 1;
const STORE = "entries";

export interface ClientMedia {
  id: string;
  kind: "image" | "audio";
  path: string; // data: URI
  mime: string;
  size: number;
}

export interface ClientEntry {
  id: string;
  contentHtml: string;
  contentText: string;
  mood: string | null;
  createdAt: number; // epoch ms
  updatedAt: number;
  tags: string[];
  media: ClientMedia[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB niedostępne w tym środowisku."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export type EntriesChangedKind = "create" | "update" | "delete";
export interface EntriesChangedDetail {
  id: string;
  kind: EntriesChangedKind;
}

function emitChanged(detail: EntriesChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("entries-changed", { detail }));
}

function newId(): string {
  // crypto.randomUUID dostępne w nowoczesnych przeglądarkach + Node
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export { newId };

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

export async function createEntry(input: {
  contentHtml: string;
  mood: string | null;
  createdAt: Date;
  tags: string[];
  media: ClientMedia[];
}): Promise<string> {
  const id = newId();
  const now = Date.now();
  const entry: ClientEntry = {
    id,
    contentHtml: input.contentHtml,
    contentText: htmlToText(input.contentHtml),
    mood: input.mood,
    createdAt: input.createdAt.getTime(),
    updatedAt: now,
    tags: input.tags,
    media: input.media,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(entry);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
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
  const existing = await getEntry(id);
  if (!existing) throw new Error("Wpis nie istnieje.");
  const updated: ClientEntry = {
    ...existing,
    contentHtml: input.contentHtml,
    contentText: htmlToText(input.contentHtml),
    mood: input.mood,
    createdAt: input.createdAt.getTime(),
    updatedAt: Date.now(),
    tags: input.tags,
    media: input.media,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(updated);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  emitChanged({ id, kind: "update" });
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  emitChanged({ id, kind: "delete" });
}

export async function getEntry(id: string): Promise<ClientEntry | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const r = t.objectStore(STORE).get(id);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror = () => reject(r.error);
  });
}

export async function listEntries(opts?: {
  q?: string;
  tag?: string;
  from?: number;
  to?: number;
  moods?: string[];
}): Promise<ClientEntry[]> {
  const db = await openDb();
  const all = await new Promise<ClientEntry[]>((resolve, reject) => {
    const t = db.transaction(STORE, "readonly");
    const r = t.objectStore(STORE).getAll();
    r.onsuccess = () => resolve(r.result ?? []);
    r.onerror = () => reject(r.error);
  });
  let out = all;
  if (opts?.q) {
    const q = opts.q.toLowerCase();
    out = out.filter((e) => e.contentText.toLowerCase().includes(q));
  }
  if (opts?.tag) {
    out = out.filter((e) => e.tags.includes(opts.tag!));
  }
  if (opts?.from != null) {
    out = out.filter((e) => e.createdAt >= opts.from!);
  }
  if (opts?.to != null) {
    out = out.filter((e) => e.createdAt <= opts.to!);
  }
  if (opts?.moods && opts.moods.length > 0) {
    const set = new Set(opts.moods);
    out = out.filter((e) => {
      if (!e.mood) return false;
      return e.mood.split(",").some((k) => set.has(k.trim()));
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllTagsWithCount(): Promise<
  { name: string; count: number }[]
> {
  const all = await listEntries();
  const counts = new Map<string, number>();
  for (const e of all) for (const t of e.tags) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

void reqToPromise; // unused helper, exported only via internal use above
