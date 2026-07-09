/**
 * Seed Stripe w TRYBIE TESTOWYM dla eksperymentu (Preview).
 *
 * Odtwarza testowe Produkty + roczne ceny (subskrypcja) dla płatnych konsultantów
 * + pakietu "all", CZYTAJĄC ceny z WooCommerce (read-only — NIE zapisuje nic do WC,
 * więc produkcyjne meta `stripe_price_id` LIVE zostają nietknięte). Dodatkowo
 * rejestruje testowy endpoint webhooka na URL preview.
 *
 * WYNIK (do wklejenia w Vercel → Preview env):
 *   - STRIPE_PRICE_MAP   = {"advisor":"price_...","all":"price_...",...}
 *   - STRIPE_WEBHOOK_SECRET = whsec_... (tylko przy tworzeniu nowego endpointu)
 *
 * Bezpiecznik: skrypt ODMAWIA startu, jeśli klucz nie zaczyna się od `sk_test_`.
 *
 * Uruchom:  STRIPE_TEST_SECRET_KEY=sk_test_... npx tsx scripts/seed-stripe-test.ts
 *   (klucz można też wpisać do .env.local jako STRIPE_TEST_SECRET_KEY)
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

const TEST_KEY = process.env.STRIPE_TEST_SECRET_KEY || env.STRIPE_TEST_SECRET_KEY;
if (!TEST_KEY) throw new Error("Brak STRIPE_TEST_SECRET_KEY (env lub .env.local).");
if (!TEST_KEY.startsWith("sk_test_")) {
  throw new Error(
    `BEZPIECZNIK: klucz nie jest testowy (oczekuję sk_test_...). Przerwane, by nie ruszyć LIVE.`,
  );
}

// URL webhooka preview (alias gałęzi eksperyment). Można nadpisać argumentem.
const WEBHOOK_URL =
  process.argv[2] ||
  "https://dziennik-git-eksperyment-jerzy-koenigshaus-projects.vercel.app/api/stripe/webhook";

const BASE = env.WOOCOMMERCE_URL;
const wcAuth =
  "Basic " +
  Buffer.from(
    `${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`,
  ).toString("base64");
const stripe = new Stripe(TEST_KEY, { apiVersion: "2026-06-24.dahlia" });

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

async function wc<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/wp-json/wc/v3/${path}`, {
    headers: { Authorization: wcAuth, "Content-Type": "application/json" },
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
  console.log(`▶ Tryb TEST (sk_test). Webhook URL: ${WEBHOOK_URL}\n`);
  const products = await wc<Product[]>("products?per_page=100&status=any");
  const priceMap: Record<string, string> = {};

  for (const p of products) {
    const sku = skuOf(p);
    if (!sku) continue;
    const amount = Math.round(Number(p.price) * 100); // grosze
    if (!amount || amount <= 0) {
      console.log(`• ${sku} — darmowy/0, pomijam`);
      continue;
    }

    // Produkt testowy dla SKU (reuse po metadata.sku, inaczej twórz).
    const existing = (await stripe.products.search({ query: `metadata['sku']:'${sku}'` })).data[0];
    const productSid = existing?.id ?? (await stripe.products.create({ name: p.name, metadata: { sku } })).id;

    // Reuse aktywnej rocznej ceny PLN o właściwej kwocie, inaczej utwórz.
    const active = (await stripe.prices.list({ product: productSid, active: true, limit: 100 })).data;
    const match = active.find(
      (pr) => pr.unit_amount === amount && pr.currency === "pln" && pr.recurring?.interval === "year",
    );
    const target =
      match ??
      (await stripe.prices.create({
        product: productSid,
        unit_amount: amount,
        currency: "pln",
        recurring: { interval: "year" },
        metadata: { sku },
      }));

    priceMap[sku] = target.id;
    console.log(`✓ ${sku} → ${target.id} (${amount / 100} zł/rok)${match ? " [reuse]" : " [new]"}`);
  }

  // Webhook testowy — reuse po URL, inaczej twórz (sekret znany tylko przy tworzeniu).
  const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];
  const endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data;
  const existingWh = endpoints.find((e) => e.url === WEBHOOK_URL);
  let webhookSecret: string | null = null;
  if (existingWh) {
    console.log(`\n• Webhook już istnieje (${existingWh.id}) — sekret znany tylko przy tworzeniu.`);
    console.log(`  Jeśli nie masz sekretu, usuń go w panelu i uruchom skrypt ponownie.`);
  } else {
    const wh = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: events,
      description: "Dziennik eksperyment (Preview) — test mode",
    });
    webhookSecret = wh.secret ?? null;
    console.log(`\n✓ Webhook utworzony (${wh.id})`);
  }

  console.log("\n=== WKLEJ DO VERCEL → PREVIEW ENV ===");
  console.log(`STRIPE_PRICE_MAP=${JSON.stringify(priceMap)}`);
  if (webhookSecret) console.log(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
  console.log("STRIPE_SECRET_KEY=<ten sam sk_test_... którego użyłeś>");
  console.log("=====================================");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exit(1);
});
