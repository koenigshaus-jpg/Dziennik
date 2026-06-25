// Webhook Stripe → zapis uprawnień do tabeli `entitlements`.
// Obsługuje cykl życia subskrypcji (utworzenie / aktualizacja / anulowanie).
// Zapis przez service_role (omija RLS). Weryfikacja podpisu STRIPE_WEBHOOK_SECRET.
//
// Stripe wymaga SUROWEGO body do weryfikacji — używamy req.text() (bez parsowania).

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/api/supabase-admin";

export const runtime = "nodejs";

function unlockStatus(s: Stripe.Subscription.Status): string {
  // Aktywny dostęp dla active/trialing; reszta przechodzi jako stan z Stripe.
  return s === "active" || s === "trialing" ? "active" : s;
}

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  const sku = sub.metadata?.sku;
  if (!userId || !sku) return; // nie nasza subskrypcja

  // W nowych wersjach API okres rozliczeniowy jest na pozycji subskrypcji.
  const periodEndUnix =
    sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  await getSupabaseAdmin()
    .from("entitlements")
    .upsert(
      {
        user_id: userId,
        sku,
        status: unlockStatus(sub.status),
        current_period_end: periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null,
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sku" },
    );
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return NextResponse.json({ error: `signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        // Zapasowo: pobierz subskrypcję i zapisz (gdyby event subscription.* spóźnił się).
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id,
          );
          await upsertFromSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "handler error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
