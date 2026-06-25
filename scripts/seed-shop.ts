/**
 * Seed sklepu WooCommerce produktami = konsultanci (persony Agenta).
 * Zaczytuje PERSONY z kodu (src/lib/agent/personas) i tworzy po jednym
 * produkcie na personę z polami własnymi (persona_key, persona_prompt, ...).
 *
 * Idempotentny: produkt z danym `persona_key` (meta) nie jest tworzony ponownie.
 * Darmowy: Doradca biznesowy (advisor) → cena 0. Reszta → 1 zł.
 *
 * Uruchom:  npx tsx scripts/seed-shop.ts
 */
import { readFileSync } from "node:fs";
import { PERSONAS, PERSONA_ORDER } from "../src/lib/agent/personas";

// --- env z .env.local (server-only) ---
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const BASE = env.WOOCOMMERCE_URL;
const CK = env.WOOCOMMERCE_CONSUMER_KEY;
const CS = env.WOOCOMMERCE_CONSUMER_SECRET;
if (!BASE || !CK || !CS) throw new Error("Brak kluczy WooCommerce w .env.local");
const auth = "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");

const FREE_KEY = "advisor"; // Doradca biznesowy — darmowy

interface WcMeta {
  key: string;
  value: string;
}
interface WcProduct {
  id: number;
  name: string;
  meta_data: WcMeta[];
}

async function wc<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/wp-json/wc/v3/${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`WC ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function existingPersonaKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  // Pobierz wszystkie produkty (sklep mały — jedna strona wystarczy).
  const products = await wc<WcProduct[]>("products?per_page=100&status=any");
  for (const p of products) {
    const k = p.meta_data?.find((m) => m.key === "persona_key")?.value;
    if (k) keys.add(k);
  }
  return keys;
}

async function main() {
  const existing = await existingPersonaKeys();
  console.log(`Istniejące persona_key w sklepie: [${[...existing].join(", ") || "—"}]`);

  for (const key of PERSONA_ORDER) {
    const p = PERSONAS[key];
    if (existing.has(key)) {
      console.log(`• ${key} — pomijam (już istnieje)`);
      continue;
    }
    const isFree = key === FREE_KEY;
    const payload = {
      name: p.name,
      type: "simple",
      status: "publish",
      virtual: true, // cyfrowy dostęp, nie towar fizyczny
      regular_price: isFree ? "0" : "1",
      short_description: p.description,
      description: p.description,
      meta_data: [
        { key: "persona_key", value: p.key },
        { key: "persona_prompt", value: p.systemPrompt },
        { key: "persona_model", value: p.defaultModel },
        { key: "persona_deep_model", value: p.deepModel },
        { key: "persona_temperature", value: String(p.temperature) },
        { key: "persona_icon", value: p.icon },
      ],
    };
    const created = await wc<WcProduct>("products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(
      `✓ ${key} → produkt #${created.id} "${created.name}" (${isFree ? "DARMOWY 0 zł" : "1 zł"})`,
    );
  }
  console.log("Gotowe.");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
