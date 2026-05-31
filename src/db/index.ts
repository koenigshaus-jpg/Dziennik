import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Wybór backendu:
// - Produkcja (Vercel): TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
// - Lokalnie: plik SQLite w ./data/dziennik.db
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let url: string;
let authToken: string | undefined;

if (tursoUrl) {
  url = tursoUrl;
  authToken = tursoToken;
} else {
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  url = `file:${path.join(dbDir, "dziennik.db")}`;
}

const client = createClient({ url, authToken });

// Inicjalizacja schematu — uruchamiana lazy raz na proces.
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    content_html TEXT NOT NULL,
    content_text TEXT NOT NULL,
    mood TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id)`,
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_media_entry ON media(entry_id)`,
];

let initPromise: Promise<void> | null = null;
export async function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      for (const stmt of SCHEMA_STATEMENTS) {
        await client.execute(stmt);
      }
    })();
  }
  return initPromise;
}

export const db = drizzle(client, { schema });
export { schema };
