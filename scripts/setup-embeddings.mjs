// Automatyczny setup wektoryzacji w Supabase — część uprzywilejowana.
// Wymaga Supabase Personal Access Token (sbp_...) w SUPABASE_ACCESS_TOKEN.
// Wykonuje przez Management API:
//   1. DDL z supabase/migrations/0001_entry_embeddings.sql (pgvector, tabela, RLS, match_entries, trigger)
//   2. ustawienie sekretu OPENAI_API_KEY dla Edge Functions
// Deploy samej Edge Function robimy osobno przez CLI:
//   SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy embed-entry \
//     --project-ref jtbfsqpwbtljuifbcdpl --no-verify-jwt
//
// Uruchom: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/setup-embeddings.mjs

import { readFileSync } from "node:fs";

const PROJECT_REF = "jtbfsqpwbtljuifbcdpl";
const MGMT = "https://api.supabase.com";

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
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ENV.OPENAI_API_KEY;

if (!TOKEN) {
  console.error("Brak SUPABASE_ACCESS_TOKEN (sbp_...). Wygeneruj w Supabase → Account → Access Tokens.");
  process.exit(1);
}

const mgmtHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function runSql(query) {
  const res = await fetch(`${MGMT}/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: mgmtHeaders,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`DDL ${res.status}: ${await res.text()}`);
  return res.json().catch(() => null);
}

async function setSecret(name, value) {
  const res = await fetch(`${MGMT}/v1/projects/${PROJECT_REF}/secrets`, {
    method: "POST",
    headers: mgmtHeaders,
    body: JSON.stringify([{ name, value }]),
  });
  if (!res.ok) throw new Error(`secret ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log("1/3  Stosuję DDL (pgvector, entry_embeddings, RLS, match_entries, trigger)...");
  const sql = readFileSync(new URL("../supabase/migrations/0001_entry_embeddings.sql", import.meta.url), "utf8");
  await runSql(sql);
  console.log("     ✓ DDL zastosowane.");

  if (OPENAI_API_KEY) {
    console.log("2/3  Ustawiam sekret OPENAI_API_KEY dla Edge Functions...");
    await setSecret("OPENAI_API_KEY", OPENAI_API_KEY);
    console.log("     ✓ Sekret ustawiony.");
  } else {
    console.log("2/3  Pomijam sekret — brak OPENAI_API_KEY w env/.env.local.");
  }

  console.log("3/3  Weryfikacja: czy tabela i funkcja istnieją...");
  const check = await runSql(
    "select to_regclass('public.entry_embeddings') as tbl, " +
    "exists(select 1 from pg_proc where proname='match_entries') as fn, " +
    "exists(select 1 from pg_trigger where tgname='embed_entry_on_write') as trg;"
  );
  console.log("     ", JSON.stringify(check));

  console.log("\n✓ Setup bazy gotowy. Teraz wdróż Edge Function:");
  console.log(`   SUPABASE_ACCESS_TOKEN=… npx supabase functions deploy embed-entry --project-ref ${PROJECT_REF} --no-verify-jwt`);
  console.log("   a następnie backfill:  node scripts/embed-entries.mjs");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
