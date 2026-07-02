// Supabase Edge Function: embed-entry
// Wywoływana przez Database Webhook (trigger pg_net) po INSERT/UPDATE w public.entries.
// Liczy embedding treści wpisu modelem OpenAI text-embedding-3-small i upsertuje
// do public.entry_embeddings. 1 wpis = 1 wektor (chunk_idx=0); bardzo długie wpisy
// dzielone zdaniami na kolejne chunki.
//
// Deploy: supabase functions deploy embed-entry --no-verify-jwt
// Sekrety wymagane w projekcie: OPENAI_API_KEY
// (SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY są wstrzykiwane automatycznie.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIM = 1536;
// Próg długości, powyżej którego dzielimy wpis zdaniami. text-embedding-3-small
// przyjmuje ~8191 tokenów; 6000 znaków to bezpieczny, z dużym zapasem, próg.
const CHUNK_THRESHOLD = 6000;

interface EntryRecord {
  id: string;
  user_id: string;
  content_text: string | null;
  // Marker środowiska (migracja 0006): 'prev' → embeddingi do osobnej tabeli,
  // żeby wektory eksperymentu nie trafiały do produkcyjnej entry_embeddings.
  source?: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: EntryRecord | null;
  old_record: EntryRecord | null;
}

/** Dzieli tekst na chunki. Zwykle [tekst]; powyżej progu — grupy zdań. */
function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= CHUNK_THRESHOLD) return [trimmed];
  const sentences = trimmed.match(/[^.!?]+[.!?]*\s*/g) ?? [trimmed];
  const chunks: string[] = [];
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

async function embed(inputs: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

// Współdzielony sekret z triggerem tg_embed_entry (nagłówek `x-embed-secret`).
// UWAGA: NIE czytamy go z env — redeploy przez Management API/MCP gubi/nadpisuje
// sekrety funkcji (obserwowane 403 na poprawnym sekrecie), co zatrzymuje wektoryzację.
// Dlatego, jak w migracji 0004 dla triggera, sekret wpisujemy WPROST przy deployu:
// podstaw realną wartość w miejsce __EMBED_SECRET__ i wdróż. NIE commituj wartości.
const WEBHOOK_SECRET = "__EMBED_SECRET__";

Deno.serve(async (req) => {
  try {
    if (WEBHOOK_SECRET && req.headers.get("x-embed-secret") !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
    const payload = (await req.json()) as WebhookPayload;
    const rec = payload.record;
    if (!rec || payload.type === "DELETE") {
      return new Response("ignored", { status: 200 });
    }
    const text = (rec.content_text ?? "").trim();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Routing środowiska: wpisy eksperymentu (source='prev') mają osobną tabelę
    // wektorów; produkcja (source='prod'/brak) pisze do entry_embeddings jak dotąd.
    const table = rec.source === "prev" ? "entry_embeddings_prev" : "entry_embeddings";

    // Pusty wpis → usuń ewentualne stare embeddingi, nic nie licz.
    if (!text) {
      await supabase.from(table).delete().eq("entry_id", rec.id);
      return new Response("empty", { status: 200 });
    }

    const chunks = chunkText(text);
    const vectors = await embed(chunks);
    if (vectors.some((v) => v.length !== EMBED_DIM)) {
      throw new Error("Nieoczekiwany wymiar embeddingu.");
    }

    const rows = chunks.map((content, i) => ({
      entry_id: rec.id,
      user_id: rec.user_id,
      chunk_idx: i,
      content,
      embedding: JSON.stringify(vectors[i]), // pgvector przyjmuje '[...]'
    }));

    // Upsert nowych/zmienionych chunków + sprzątanie nadmiarowych (gdy wpis się skrócił).
    const { error: upErr } = await supabase
      .from(table)
      .upsert(rows, { onConflict: "entry_id,chunk_idx" });
    if (upErr) throw upErr;

    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .eq("entry_id", rec.id)
      .gte("chunk_idx", chunks.length);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ entry_id: rec.id, chunks: chunks.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-entry error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
