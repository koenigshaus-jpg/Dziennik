/**
 * Tworzy w Stripe Produkt + roczną cenę (subskrypcja) dla każdego PŁATNEGO
 * produktu WooCommerce (konsultanci z ceną > 0 + pakiet "all"). Zapisuje
 * `stripe_price_id` z powrotem do meta produktu WC (mapa SKU → price używana
 * przez /api/checkout).
 *
 * Idempotentny: produkt WC, który ma już `stripe_price_id`, jest pomijany.
 * Darmowy Doradca (cena 0) jest pomijany — nigdy nie jest kupowany.
 *
 * Uruchom:  npx tsx scripts/seed-stripe.ts
 */
import { readFileSync } from "node:fs";
import Stripe from "stripe";

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
const wcAuth =
  "Basic " +
  Buffer.from(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`).toString("base64");
if (!env.STRIPE_SECRET_KEY) throw new Error("Brak STRIPE_SECRET_KEY w .env.local");
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });

interface Meta {
  key: string;
  value: string;
}
interface Product {
  id: number;
  name: string;
  price: string;
  meta_data: Meta[];
}

async function wc<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}/wp-json/wc/v3/${path}`, {
    ...init,
    headers: { Authorization: wcAuth, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`WC ${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}

function metaVal(p: Product, key: string): string | undefined {
  return p.meta_data?.find((m) => m.key === key)?.value || undefined;
}
function skuOf(p: Product): string | null {
  return metaVal(p, "persona_key") ?? (metaVal(p, "bundle_sku") === "all" ? "all" : null);
}

async function main() {
  const products = await wc<Product[]>("products?per_page=100&status=any");
  for (const p of products) {
    const sku = skuOf(p);
    if (!sku) continue;
    const amount = Math.round(Number(p.price) * 100); // grosze
    if (!amount || amount <= 0) {
      console.log(`• ${sku} — darmowy/0, pomijam`);
      continue;
    }
    if (metaVal(p, "stripe_price_id")) {
      console.log(`• ${sku} — ma już stripe_price_id, pomijam`);
      continue;
    }

    const product = await stripe.products.create({
      name: p.name,
      metadata: { sku },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "pln",
      recurring: { interval: "year" },
      metadata: { sku },
    });
    await wc(`products/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({
        meta_data: [
          { key: "stripe_product_id", value: product.id },
          { key: "stripe_price_id", value: price.id },
        ],
      }),
    });
    console.log(`✓ ${sku} → ${product.id} / ${price.id} (${amount / 100} zł/rok)`);
  }
  console.log("Gotowe.");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
