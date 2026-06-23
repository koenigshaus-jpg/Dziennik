// Backfill embeddingów dla istniejących wpisów.
// Czyta wszystkie public.entries (service-key, REST), liczy embeddingi modelem
// OpenAI text-embedding-3-small i upsertuje do public.entry_embeddings.
// Idempotentny — można puścić ponownie (upsert po (entry_id, chunk_idx)).
//
// Wymaga istniejącej tabeli entry_embeddings (migracja 0001).
// Uruchom: node scripts/embed-entries.mjs

import { readFileSync } from "node:fs";

const SUPABASE_URL = "https://jtbfsqpwbtljuifbcdpl.supabase.co";

// Klucze z .env.local (nie hardkodujemy sekretów w repo).
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* ignore */
  }
  return env;
}
const ENV = loadEnv();
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || ENV.SUPABASE_SECRET_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ENV.OPENAI_API_KEY;

if (!SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Brak SUPABASE_SECRET_KEY lub OPENAI_API_KEY (.env.local).");
  process.exit(1);
}

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;
const CHUNK_THRESHOLD = 6000;
const OPENAI_BATCH = 100; // ile tekstów na jedno wywołanie OpenAI

const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function chunkText(text) {
  const trimmed = text.trim();
  if (trimmed.length <= CHUNK_THRESHOLD) return [trimmed];
  const sentences = trimmed.match(/[^.!?]+[.!?]*\s*/g) ?? [trimmed];
  const chunks = [];
  let buf = "";
  for (const s of sentences) {
    if (buf.length + s.length > CHUNK_THRESHOLD && buf) {
      chunks.push(buf.trim());
      buf = "";
    }
    buf += s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders,
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function embed(inputs) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function fetchAllEntries() {
  const all = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const page = await rest(
      `entries?select=id,user_id,content_text&order=created_at.asc&offset=${offset}&limit=${pageSize}`
    );
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

async function main() {
  console.log("Pobieram wpisy...");
  const entries = await fetchAllEntries();
  console.log(`  ${entries.length} wpisów.`);

  // Rozwiń na (entry, chunk_idx, content). Przy tych wpisach = 1 chunk każdy.
  const units = [];
  for (const e of entries) {
    const text = (e.content_text ?? "").trim();
    if (!text) continue;
    chunkText(text).forEach((content, i) =>
      units.push({ entry_id: e.id, user_id: e.user_id, chunk_idx: i, content })
    );
  }
  console.log(`  ${units.length} jednostek do zwektoryzowania.`);

  let done = 0;
  for (let i = 0; i < units.length; i += OPENAI_BATCH) {
    const batch = units.slice(i, i + OPENAI_BATCH);
    const vectors = await embed(batch.map((u) => u.content));
    if (vectors.some((v) => v.length !== EMBED_DIM)) {
      throw new Error("Nieoczekiwany wymiar embeddingu.");
    }
    const rows = batch.map((u, j) => ({
      entry_id: u.entry_id,
      user_id: u.user_id,
      chunk_idx: u.chunk_idx,
      content: u.content,
      embedding: JSON.stringify(vectors[j]),
    }));
    await rest("entry_embeddings?on_conflict=entry_id,chunk_idx", {
      method: "POST",
      headers: { ...restHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
    done += rows.length;
    console.log(`  ${done}/${units.length}...`);
  }

  console.log(`\n✓ Gotowe. Zwektoryzowano ${done} jednostek z ${entries.length} wpisów.`);
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
