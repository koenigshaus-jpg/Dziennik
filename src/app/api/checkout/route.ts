// Checkout subskrypcji (Stripe). Tworzy sesję Stripe Checkout (mode: subscription)
// dla SKU (persona_key | "all") i zwraca URL do przekierowania. Webhook
// (/api/stripe/webhook) po opłaceniu zapisuje uprawnienie do tabeli `entitlements`.
//
// Dopóki brak STRIPE_SECRET_KEY → 503 (UI pokazuje „wkrótce").

import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { BUNDLE_SKU } from "@/lib/agent/entitlements";
import { PERSONA_ORDER } from "@/lib/agent";
import { getStripePriceMap } from "@/lib/woocommerce";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niezalogowany." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { sku?: string };
  const sku = body.sku;
  const valid = sku === BUNDLE_SKU || (sku && PERSONA_ORDER.includes(sku as never));
  if (!valid || !sku) {
    return NextResponse.json({ error: "Nieznane SKU." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const priceId = (await getStripePriceMap()).get(sku);
  if (!priceId) {
    return NextResponse.json(
      { error: "Brak ceny Stripe dla tego produktu. Uruchom seed-stripe." },
      { status: 500 },
    );
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Powiązanie z użytkownikiem — webhook czyta to z subskrypcji.
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      subscription_data: { metadata: { user_id: user.id, sku } },
      metadata: { user_id: user.id, sku },
      allow_promotion_codes: true,
      success_url: `${origin}/sklep?zakup=ok`,
      cancel_url: `${origin}/sklep?zakup=anulowano`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd Stripe.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
