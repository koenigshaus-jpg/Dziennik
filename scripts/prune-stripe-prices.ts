/**
 * Porządkuje ceny w Stripe: dla każdego produktu zostawia AKTYWNĄ tylko tę cenę,
 * na którą wskazuje WooCommerce (meta `stripe_price_id`), a wszystkie pozostałe
 * aktywne ceny tego produktu archiwizuje (active:false).
 *
 * Bezpieczny i idempotentny. Uruchom:  npx tsx scripts/prune-stripe-prices.ts
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
const auth =
  "Basic " +
  Buffer.from(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`).toString("base64");
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });

interface Meta { key: string; value: string }
interface Product { id: number; name: string; meta_data: Meta[] }
const meta = (p: Product, k: string) => p.meta_data?.find((m) => m.key === k)?.value;

async function wc<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/wp-json/wc/v3/${path}`, { headers: { Authorization: auth } });
  return r.json() as Promise<T>;
}

async function main() {
  const products = await wc<Product[]>("products?per_page=100&status=any");
  for (const p of products) {
    const keep = meta(p, "stripe_price_id");
    const productId = meta(p, "stripe_product_id");
    if (!keep || !productId) continue;

    const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    let archived = 0;
    for (const price of prices.data) {
      if (price.id !== keep) {
        await stripe.prices.update(price.id, { active: false });
        archived++;
      }
    }
    console.log(`${p.name}: zostawiono ${keep.slice(-8)}, zarchiwizowano ${archived}`);
  }
  console.log("Gotowe.");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
