// Synchronizacja ceny pojedynczego produktu WC → Stripe (server-only).
// Wywoływane przez webhook WooCommerce (/api/woo/webhook) po edycji produktu.
//
// ODPORNOŚĆ NA PĘTLĘ: zapis meta do WooCommerce sam odpala kolejny webhook
// product.updated. Żeby nie tworzyć kaskady cen:
//   1) jeśli istnieje już aktywna cena Stripe o właściwej kwocie — UŻYJ jej
//      (nie twórz nowej),
//   2) meta w WC zapisz TYLKO gdy faktycznie się zmienia (re-trigger wtedy wygasa),
//   3) wszystkie inne aktywne ceny produktu dezaktywuj (jedna aktywna na produkt).

import { getStripe } from "./stripe";
import {
  getMeta,
  getProductById,
  getProductSku,
  updateProductMeta,
} from "./woocommerce";

export async function syncProductPriceById(productId: number): Promise<string> {
  const p = await getProductById(productId);
  const sku = getProductSku(p);
  if (!sku) return "no_sku";

  const amount = Math.round(Number(p.price) * 100); // grosze
  if (!amount || amount <= 0) return "free";

  const stripe = getStripe();

  // 1) Produkt Stripe dla SKU (z meta WC lub utworzony).
  let productSid = getMeta(p, "stripe_product_id");
  if (productSid) {
    try {
      await stripe.products.retrieve(productSid);
    } catch {
      productSid = undefined;
    }
  }
  if (!productSid) {
    const created = await stripe.products.create({ name: p.name, metadata: { sku } });
    productSid = created.id;
  }

  // 2) Aktywne ceny produktu. Szukamy istniejącej o właściwej kwocie (reuse),
  //    a jak brak — tworzymy jedną.
  const active = (
    await stripe.prices.list({ product: productSid, active: true, limit: 100 })
  ).data;
  const match = active.find(
    (pr) =>
      pr.unit_amount === amount &&
      pr.currency === "pln" &&
      pr.recurring?.interval === "year",
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

  // 3) Dezaktywuj wszystkie inne aktywne ceny (inna kwota lub duplikaty).
  for (const pr of active) {
    if (pr.id !== target.id) {
      try {
        await stripe.prices.update(pr.id, { active: false });
      } catch {
        /* ignoruj pojedyncze błędy */
      }
    }
  }

  // 4) Zapis meta TYLKO gdy się zmienia — inaczej kolejny webhook od tego zapisu
  //    natychmiast wygaśnie (to przerywa kaskadę).
  const curPriceId = getMeta(p, "stripe_price_id");
  const curProductId = getMeta(p, "stripe_product_id");
  if (curPriceId !== target.id || curProductId !== productSid) {
    await updateProductMeta(p.id, [
      { key: "stripe_product_id", value: productSid },
      { key: "stripe_price_id", value: target.id },
    ]);
    return `set:${target.id}`;
  }
  return "unchanged";
}
