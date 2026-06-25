// Klient Stripe (server-only). Subskrypcje konsultantów. Klucz z env
// STRIPE_SECRET_KEY (sk_test_/sk_live_). NIGDY nie importować po stronie klienta.

import Stripe from "stripe";

let cached: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY nie jest ustawione.");
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Wersja API przypięta — bez niespodzianek przy aktualizacjach.
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return cached;
}
