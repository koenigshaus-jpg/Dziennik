// Synchronizacja ceny pojedynczego produktu WC → Stripe (server-only).
// Używane przez webhook WooCommerce (/api/woo/webhook) po edycji produktu.
// Ta sama logika co scripts/seed-stripe.ts, ale dla jednego produktu w runtime Next.

import { getStripe } from "./stripe";
import {
  getMeta,
  getProductById,
  getProductSku,
  updateProductMeta,
} from "./woocommerce";

/**
 * Dostraja cenę Stripe do ceny produktu w WooCommerce. Ceny Stripe są niezmienne,
 * więc przy różnicy tworzymy nową cenę i dezaktywujemy starą. Zwraca opis wyniku.
 */
export async function syncProductPriceById(productId: number): Promise<string> {
  const p = await getProductById(productId);
  const sku = getProductSku(p);
  if (!sku) return "no_sku";

  const amount = Math.round(Number(p.price) * 100); // grosze
  if (!amount || amount <= 0) return "free";

  const existingPriceId = getMeta(p, "stripe_price_id");

  // Krótkie spięcie: jeśli ta kwota jest już zsynchronizowana, nic nie rób — bez
  // wywołań Stripe. KLUCZOWE: nasz własny zapis meta też odpala webhook
  // product.updated; ten guard sprawia, że taki re-trigger natychmiast wygasa
  // (zamiast nakręcać kaskadę tworzenia kolejnych cen).
  const syncedAmount = Number(getMeta(p, "stripe_synced_amount"));
  if (existingPriceId && syncedAmount === amount) return "unchanged";

  const stripe = getStripe();

  if (existingPriceId) {
    const cur = await stripe.prices.retrieve(existingPriceId);
    if (cur.unit_amount === amount && cur.currency === "pln") {
      // Cena się zgadza, brakuje tylko znacznika — dopisz, żeby uciszyć webhooki.
      await updateProductMeta(p.id, [{ key: "stripe_synced_amount", value: String(amount) }]);
      return "unchanged";
    }
    const productSid = getMeta(p, "stripe_product_id") ?? (cur.product as string);
    const price = await stripe.prices.create({
      product: productSid,
      unit_amount: amount,
      currency: "pln",
      recurring: { interval: "year" },
      metadata: { sku },
    });
    await stripe.prices.update(existingPriceId, { active: false });
    await updateProductMeta(p.id, [
      { key: "stripe_price_id", value: price.id },
      { key: "stripe_synced_amount", value: String(amount) },
    ]);
    return `updated:${price.id}`;
  }

  const product = await stripe.products.create({ name: p.name, metadata: { sku } });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "pln",
    recurring: { interval: "year" },
    metadata: { sku },
  });
  await updateProductMeta(p.id, [
    { key: "stripe_product_id", value: product.id },
    { key: "stripe_price_id", value: price.id },
    { key: "stripe_synced_amount", value: String(amount) },
  ]);
  return `created:${price.id}`;
}
