// Checkout subskrypcji (Stripe). Tworzy sesję Stripe Checkout w trybie
// subscription dla SKU (persona_key | "all") i zwraca URL do przekierowania.
//
// STATUS: szkielet. Pełna integracja Stripe (klucze + price IDs + webhook →
// zapis do tabeli `entitlements`) dochodzi w kolejnym kroku. Dopóki brak
// STRIPE_SECRET_KEY, zwracamy 503 — UI pokazuje wtedy „wkrótce".

import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { BUNDLE_SKU } from "@/lib/agent/entitlements";
import { PERSONA_ORDER } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Auth (za proxy.ts, ale sprawdzamy tożsamość pod przyszły zapis customera).
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
  if (!valid) {
    return NextResponse.json({ error: "Nieznane SKU." }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  // TODO: utworzyć Stripe Checkout Session (mode: "subscription") dla price
  // odpowiadającego SKU i zwrócić { url }. Webhook zapisze entitlement.
  return NextResponse.json({ error: "not_implemented" }, { status: 503 });
}
