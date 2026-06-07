// Klient-side store rozmów z agentem AI. Mieszka w tej samej bazie
// IndexedDB co wpisy ("dziennik"), w osobnym object store "conversations".
// Mutacje dispatchują event `conversations-changed` analogicznie do
// `entries-changed` w db-client.

import { newId, openDb, STORE_CONVERSATIONS as STORE } from "./idb";
import type { PersonaKey } from "./agent/types";

export type ConversationMessageStatus =
  | "ok"
  | "queued"
  | "error"
  | "aborted";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status?: ConversationMessageStatus;
  /** Optional tool calls recorded for debugging / audit. */
  toolCalls?: { name: string; args: unknown; result?: unknown }[];
}

export interface Conversation {
  id: string;
  /** YYYY-MM-DD — dzień, do którego rozmowa jest przypisana. */
  day: string;
  personaKey: PersonaKey;
  /** @deprecated Pozostawione na potrzeby starych rekordów — nieużywane. */
  personaVariant?: string;
  /** Null do czasu auto-generacji po 2. odpowiedzi assistant. */
  title: string | null;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
}

export type ConversationsChangedKind =
  | "create"
  | "append"
  | "setTitle"
  | "delete";

export interface ConversationsChangedDetail {
  id: string;
  kind: ConversationsChangedKind;
  day?: string;
  personaKey?: PersonaKey;
}

function emitChanged(detail: ConversationsChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("conversations-changed", { detail })
  );
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function createConversation(input: {
  day: string;
  personaKey: PersonaKey;
}): Promise<Conversation> {
  const now = Date.now();
  const conv: Conversation = {
    id: newId(),
    day: input.day,
    personaKey: input.personaKey,
    title: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  await withStore("readwrite", (s) => {
    s.put(conv);
  });
  emitChanged({
    id: conv.id,
    kind: "create",
    day: conv.day,
    personaKey: conv.personaKey,
  });
  return conv;
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  return withStore("readonly", async (s) => {
    const r = await reqToPromise(s.get(id));
    return (r as Conversation | undefined) ?? null;
  });
}

export async function appendMessage(
  conversationId: string,
  message: Omit<ConversationMessage, "id" | "createdAt"> & {
    id?: string;
    createdAt?: number;
  }
): Promise<ConversationMessage> {
  const existing = await getConversation(conversationId);
  if (!existing) throw new Error("Rozmowa nie istnieje.");
  const msg: ConversationMessage = {
    id: message.id ?? newId(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt ?? Date.now(),
    status: message.status,
    toolCalls: message.toolCalls,
  };
  const updated: Conversation = {
    ...existing,
    messages: [...existing.messages, msg],
    updatedAt: Date.now(),
  };
  await withStore("readwrite", (s) => {
    s.put(updated);
  });
  emitChanged({
    id: conversationId,
    kind: "append",
    day: updated.day,
    personaKey: updated.personaKey,
  });
  return msg;
}

export async function setTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const existing = await getConversation(conversationId);
  if (!existing) throw new Error("Rozmowa nie istnieje.");
  const updated: Conversation = {
    ...existing,
    title,
    updatedAt: Date.now(),
  };
  await withStore("readwrite", (s) => {
    s.put(updated);
  });
  emitChanged({
    id: conversationId,
    kind: "setTitle",
    day: updated.day,
    personaKey: updated.personaKey,
  });
}

export async function deleteConversation(id: string): Promise<void> {
  const existing = await getConversation(id);
  await withStore("readwrite", (s) => {
    s.delete(id);
  });
  emitChanged({
    id,
    kind: "delete",
    day: existing?.day,
    personaKey: existing?.personaKey,
  });
}

async function getAll(): Promise<Conversation[]> {
  return withStore("readonly", async (s) => {
    const r = await reqToPromise(s.getAll());
    return (r as Conversation[]) ?? [];
  });
}

export async function listConversations(): Promise<Conversation[]> {
  const all = await getAll();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listConversationsByDay(
  day: string
): Promise<Conversation[]> {
  const all = await getAll();
  return all
    .filter((c) => c.day === day)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listConversationsByDayAndPersona(
  day: string,
  personaKey: PersonaKey
): Promise<Conversation[]> {
  const all = await getAll();
  return all
    .filter((c) => c.day === day && c.personaKey === personaKey)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Lista dni (YYYY-MM-DD), w których odbyła się przynajmniej jedna rozmowa. */
export async function listDaysWithConversations(): Promise<Set<string>> {
  const all = await getAll();
  return new Set(all.map((c) => c.day));
}
