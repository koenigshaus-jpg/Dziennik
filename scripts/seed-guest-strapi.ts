/**
 * Dopchnięcie wpisów gościa eksperymentu do STRAPI (źródło prawdy).
 *
 * Kontekst: wpisy zostały wcześniej wstawione WPROST do Supabase (zła warstwa).
 * Ten skrypt loguje się jako gość eksperymentu, czyta jego wpisy z Supabase
 * (RLS — własne) i tworzy je w Strapi z TYM SAMYM entryId. Most Strapi→Supabase
 * robi upsert po id (entryCreatedAt → created_at), więc bez duplikatów, a Strapi
 * staje się źródłem prawdy. `source='prev'` ustawia most.
 *
 * Uruchom:
 *   npx tsx scripts/seed-guest-strapi.ts --limit=1   # test na 1 wpisie
 *   npx tsx scripts/seed-guest-strapi.ts             # wszystkie
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const STRAPI_URL = (env.STRAPI_URL || "").replace(/\/+$/, "");
const STRAPI_TOKEN = env.STRAPI_API_TOKEN;
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const GUEST_EMAIL = env.NEXT_PUBLIC_GUEST_EMAIL || "gosc-eksperyment@dziennik.local";
const GUEST_PASSWORD = env.NEXT_PUBLIC_GUEST_PASSWORD || "dziennik-gosc-eksperyment";

if (!STRAPI_URL || !STRAPI_TOKEN) throw new Error("Brak STRAPI_URL/STRAPI_API_TOKEN.");
if (!SUPA_URL || !SUPA_KEY) throw new Error("Brak NEXT_PUBLIC_SUPABASE_*.");

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
// Sekwencyjnie (1) — Tailscale Funnel/Strapi gubi się przy równoległych POST-ach.
const BATCH = 1;

interface Row {
  id: string;
  content_html: string;
  content_text: string;
  mood: string | null;
  created_at: string;
  entry_tags: { tags: { name: string } | null }[] | null;
}

async function postToStrapi(userId: string, r: Row): Promise<void> {
  const tags = (r.entry_tags ?? [])
    .map((et) => et.tags?.name)
    .filter((n): n is string => !!n);
  const body = {
    data: {
      entryId: r.id,
      userId,
      contentHtml: r.content_html,
      contentText: r.content_text,
      mood: r.mood,
      tags,
      entryCreatedAt: new Date(r.created_at).toISOString(),
    },
  };
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${STRAPI_URL}/api/entries`, {
      method: "POST",
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return;
    lastErr = `${res.status}: ${(await res.text()).slice(0, 200)}`;
    // 400 duplikat entryId → już jest, traktuj jako sukces
    if (res.status === 400 && lastErr.includes("unique")) return;
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  throw new Error(`Strapi POST ${r.id} → ${lastErr}`);
}

async function main() {
  const supabase = createClient(SUPA_URL, SUPA_KEY);
  const { data: auth, error: aerr } = await supabase.auth.signInWithPassword({
    email: GUEST_EMAIL,
    password: GUEST_PASSWORD,
  });
  if (aerr || !auth.user) throw new Error(`Login gościa: ${aerr?.message}`);
  const userId = auth.user.id;
  console.log(`✓ zalogowano jako gość: ${userId}`);

  const { data, error } = await supabase
    .from("entries")
    .select("id, content_html, content_text, mood, created_at, entry_tags(tags(name))")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Read entries: ${error.message}`);
  const rows = (data as unknown as Row[]).slice(0, LIMIT);
  console.log(`Wpisów do wysłania: ${rows.length}${LIMIT !== Infinity ? ` (limit ${LIMIT})` : ""}`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((r) => postToStrapi(userId, r)));
    for (const res of results) res.status === "fulfilled" ? ok++ : (fail++, console.error(" ✗", (res.reason as Error).message));
    console.log(`… ${Math.min(i + BATCH, rows.length)}/${rows.length} (ok=${ok} fail=${fail})`);
  }
  console.log(`\nGotowe: ${ok} utworzonych w Strapi, ${fail} błędów.`);
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
