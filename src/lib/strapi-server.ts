/**
 * Server-only klient Strapi (źródło prawdy dla wpisów).
 *
 * Token API NIGDY nie trafia do przeglądarki — te funkcje wołane są wyłącznie
 * z route handlera `src/app/api/strapi/entries/route.ts`. Zapis wpisu w Strapi
 * uruchamia lifecycle hook, który odbija treść do Supabase (wektoryzacja +
 * hybrydowe wyszukiwanie bez zmian).
 */
import "server-only";

const STRAPI_URL = process.env.STRAPI_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

export interface StrapiEntryInput {
  entryId: string;
  userId: string; // Supabase auth user id — właściciel wpisu (multi-user)
  contentHtml: string;
  contentText: string;
  mood: string | null;
  tags: string[];
  createdAt: string; // ISO
}

function assertConfig(): { url: string; token: string } {
  if (!STRAPI_URL || !STRAPI_API_TOKEN) {
    throw new Error("Brak STRAPI_URL lub STRAPI_API_TOKEN na serwerze.");
  }
  return { url: STRAPI_URL.replace(/\/+$/, ""), token: STRAPI_API_TOKEN };
}

function toData(input: StrapiEntryInput) {
  return {
    entryId: input.entryId,
    userId: input.userId,
    contentHtml: input.contentHtml,
    contentText: input.contentText,
    mood: input.mood,
    tags: input.tags,
    entryCreatedAt: input.createdAt,
  };
}

async function findDocumentId(entryId: string): Promise<string | null> {
  const { url, token } = assertConfig();
  const res = await fetch(
    `${url}/api/entries?filters[entryId][$eq]=${encodeURIComponent(entryId)}&fields[0]=entryId`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Strapi find ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { documentId: string }[] };
  return json.data?.[0]?.documentId ?? null;
}

export async function createStrapiEntry(input: StrapiEntryInput): Promise<void> {
  const { url, token } = assertConfig();
  const res = await fetch(`${url}/api/entries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: toData(input) }),
  });
  if (!res.ok) throw new Error(`Strapi create ${res.status}: ${await res.text()}`);
}

export async function updateStrapiEntry(input: StrapiEntryInput): Promise<void> {
  const { url, token } = assertConfig();
  const documentId = await findDocumentId(input.entryId);
  if (!documentId) {
    // wpisu jeszcze nie ma w Strapi (np. stary wpis) — utwórz
    await createStrapiEntry(input);
    return;
  }
  const res = await fetch(`${url}/api/entries/${documentId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: toData(input) }),
  });
  if (!res.ok) throw new Error(`Strapi update ${res.status}: ${await res.text()}`);
}

export async function deleteStrapiEntry(entryId: string): Promise<void> {
  const { url, token } = assertConfig();
  const documentId = await findDocumentId(entryId);
  if (!documentId) return; // nie ma czego usuwać
  const res = await fetch(`${url}/api/entries/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Strapi delete ${res.status}: ${await res.text()}`);
  }
}
