// Webhook WooCommerce → automatyczna synchronizacja ceny do Stripe po edycji
// produktu w panelu WC (topic product.updated). Zapisując cenę w WooCommerce,
// nie trzeba już ręcznie odpalać scripts/seed-stripe.ts.
//
// Weryfikacja: WC podpisuje SUROWE body HMAC-SHA256 (base64) sekretem webhooka,
// w nagłówku x-wc-webhook-signature. Sekret = WC_WEBHOOK_SECRET.

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { syncProductPriceById } from "@/lib/shop-sync";

export const runtime = "nodejs";

function verify(raw: string, sig: string | null, secret: string): boolean {
  if (!sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.WC_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-wc-webhook-signature"), secret)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let body: { id?: number } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true }); // np. ping bez JSON-a
  }

  if (typeof body.id === "number") {
    try {
      const result = await syncProductPriceById(body.id);
      console.log(`[woo webhook] product ${body.id} → ${result}`);
    } catch (e) {
      console.error("[woo webhook] sync error:", e);
    }
  }

  return NextResponse.json({ received: true });
}
