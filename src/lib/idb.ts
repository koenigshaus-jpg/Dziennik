// Wspólny opener IndexedDB. Pojedyncza baza "dziennik" dzielona między
// klientskimi modułami (entries, conversations). Migracja zdefiniowana
// idempotentnie — bezpieczna przy podbijaniu DB_VERSION.

export const DB_NAME = "dziennik";
export const DB_VERSION = 2;

export const STORE_ENTRIES = "entries";
export const STORE_CONVERSATIONS = "conversations";

let cached: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (cached) return cached;
  cached = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB niedostępne w tym środowisku."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v1: entries
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const s = db.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
      // v2: conversations
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const s = db.createObjectStore(STORE_CONVERSATIONS, {
          keyPath: "id",
        });
        s.createIndex("day", "day");
        s.createIndex("dayPersona", ["day", "personaKey"]);
        s.createIndex("updatedAt", "updatedAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      cached = null;
      reject(req.error);
    };
  });
  return cached;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
