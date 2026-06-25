"use client";

import { toast } from "sonner";

/**
 * Rozpoczyna checkout subskrypcji dla danego SKU (persona_key lub "all").
 * Woła /api/checkout (Stripe) i przekierowuje na sesję płatności.
 * Gdy Stripe nie jest jeszcze skonfigurowany — pokazuje komunikat.
 */
export async function startCheckout(sku: string): Promise<void> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku }),
    });
    if (res.status === 503) {
      toast.info("Płatności będą dostępne wkrótce.");
      return;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Nie udało się rozpocząć płatności.");
      return;
    }
    const { url } = (await res.json()) as { url?: string };
    if (url) window.location.href = url;
  } catch {
    toast.error("Nie udało się rozpocząć płatności.");
  }
}
