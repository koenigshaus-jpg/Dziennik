# Sklep — architektura i instrukcje do dalszej pracy

Sklep w Dzienniku = **headless WooCommerce** (katalog + zarządzanie promptami) +
frontend `/sklep` w aplikacji Next.js + **Stripe** (subskrypcje) + uprawnienia w
Supabase. WordPress jest tylko panelem zarządzania — front WP nie jest sklepem dla
użytkownika (patrz „Strona WP" niżej).

## Co działa (stan obecny)

- **Backend WooCommerce**: `https://sklep.koenigshaus.pl` (hosting seohost, DirectAdmin,
  WordPress przez Softaculous). PLN / Polska. SSL OK.
- **Produkty = konsultanci**: 6 person Agenta jako produkty WC (virtual). Doradca
  biznesowy (`advisor`) = 0 zł (darmowy), reszta 1 zł. + produkt pakietu
  („Pakiet: wszyscy konsultanci", `bundle_sku=all`, 4 zł). Seed: `npx tsx scripts/seed-shop.ts`.
  Pola własne na produkcie: `persona_key`, `persona_prompt`, `persona_model`,
  `persona_deep_model`, `persona_temperature`, `persona_icon` (konsultant) lub
  `bundle_sku=all` (pakiet).
- **Prompty z panelu WC**: edycja pola własnego `persona_prompt` → aplikacja czyta je
  runtime (`getPersonaOverrides` w `src/lib/woocommerce.ts` → `resolvePersona` w
  `src/lib/agent/persona-source.ts`), wpięte w `api/chat` i `api/v1/chat`. Kod person
  (`src/lib/agent/personas/`) = fallback. Cache 60 s.
- **Frontend `/sklep`**: lista + baner pakietu (`src/app/sklep/page.tsx`), karta produktu
  (`src/app/sklep/[slug]/page.tsx` — rozpoznaje slug | persona_key | `all`). Estetyka
  Dziennika (serif `font-display`, gradienty conic za ikonami). Link „Sklep" przypięty
  na dole `HamburgerDrawer`.
- **Uprawnienia / gating**: tabela `entitlements` (Supabase, migracja `0005`, RLS: user
  czyta swoje; zapis tylko service_role). `sku` = persona_key | `all`. Logika:
  `src/lib/agent/entitlements.ts`. Hook: `src/lib/agent/use-entitlements.ts`. UI blokad:
  `src/components/agent/PersonaMenuList.tsx` (zablokowane = kłódka + „Kup" → przekierowanie
  na kartę produktu `/sklep/<persona_key>` lub `/sklep/all`). Gating SERWEROWY (nie da się
  obejść UI): `api/chat` (402 `persona_locked`) i `api/v1/chat`.
- **Checkout (szkielet)**: `src/lib/agent/checkout.ts` → `src/app/api/checkout/route.ts`.
  Dopóki brak `STRIPE_SECRET_KEY` → 503 i UI „Płatności wkrótce".

## Integracja Stripe — ZROBIONE (tryb test)

Model: **Stripe Checkout (subscription, roczna)** + webhook → upsert do `entitlements`.

- `src/lib/stripe.ts` — klient (env `STRIPE_SECRET_KEY`, apiVersion `2026-06-24.dahlia`).
- `scripts/seed-stripe.ts` — tworzy w Stripe Product+Price (roczna, PLN) dla każdego
  płatnego produktu WC (persony >0 zł + pakiet) i zapisuje `stripe_price_id` do meta WC.
  Idempotentny. (advisor darmowy — pomijany.) Uruchom: `npx tsx scripts/seed-stripe.ts`.
- `getStripePriceMap()` (woocommerce.ts) — mapa SKU → price ID z meta WC.
- `/api/checkout` — tworzy sesję Checkout (`mode: subscription`, `client_reference_id`,
  `subscription_data.metadata = {user_id, sku}`), zwraca `{ url }`. ZWERYFIKOWANE: 200 + URL
  checkout.stripe.com.
- `/api/stripe/webhook` — weryfikuje podpis `STRIPE_WEBHOOK_SECRET`; obsługuje
  `customer.subscription.created/updated/deleted` + `checkout.session.completed`; upsert do
  `entitlements` przez `getSupabaseAdmin()`. Okres bierze z `items.data[0].current_period_end`.
  ZWERYFIKOWANE: podpisane zdarzenie → wiersz w `entitlements`. **Endpoint jest w PUBLIC_PATHS
  w `src/proxy.ts`** (własna autoryzacja podpisem — nie może być za sesją).

## DO ZROBIENIA: produkcja (go-live)

1. **Zmienne na Vercel** (Settings → Environment Variables, dla Production):
   `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ istniejące Supabase/OpenAI). Bez nich
   produkcyjny `/sklep` pokazuje „nie skonfigurowany", a checkout zwraca 503.
2. **Webhook endpoint w Stripe** (Developers → Webhooks → Add endpoint):
   URL `https://dziennik-xi.vercel.app/api/stripe/webhook`, zdarzenia:
   `customer.subscription.created/updated/deleted`, `checkout.session.completed`.
   Skopiować wygenerowany `whsec_...` do `STRIPE_WEBHOOK_SECRET` na Vercel.
3. **Test E2E na produkcji** (tryb test Stripe): kliknij „Kup" → checkout → karta testowa
   `4242 4242 4242 4242` → powrót na `/sklep?zakup=ok` → persona odblokowana.
4. **Go live**: aktywuj konto Stripe (dane firmy), przełącz klucze na `sk_live_`/`whsec_`
   live, ponownie uruchom `seed-stripe` w trybie live (utworzy produkty/ceny live).
   Rozważ Stripe Tax (VAT) — patrz uwagi o VAT.
5. (Opcjonalnie) Portal klienta Stripe (anulowanie subskrypcji) + strona „Moje subskrypcje".

> Lokalnie webhook testowano podpisanym zdarzeniem (`STRIPE_WEBHOOK_SECRET` = placeholder
> w `.env.local`). Do realnych testów lokalnych użyj Stripe CLI:
> `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Uwagi

- WooCommerce price (1 zł / 4 zł) jest tylko poglądowy w katalogu — realne kwoty
  ustala Stripe Price. Trzymać spójność albo świadomie traktować WC jako katalog.
- Pakiet `all` = wszystkie obecne i przyszłe persony (rozwijane w `computeUnlocked`).
- Darmowy `advisor` nigdy nie trafia do `entitlements` — zawsze dostępny po stronie kodu.
- Znany problem (niezwiązany ze sklepem): sesja gościa bywa „wisi" na ekranie *Wczytuję…*
  po wygaśnięciu refresh-tokenu — do zhardenowania.
