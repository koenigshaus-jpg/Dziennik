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

## DO ZROBIENIA: integracja Stripe (następny etap)

Wymaga kluczy Stripe od właściciela. Model: **Stripe Checkout w trybie subscription
(roczna)** + webhook → upsert do `entitlements`.

1. **Konto/klucze Stripe** → env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_APP_URL` (do success/cancel URL). Dodać do `.env.local` i Vercel.
2. **Produkty/ceny w Stripe**: jedna cena roczna (recurring `interval=year`) per persona
   płatna + jedna dla pakietu `all`. Zmapować `sku` → Stripe Price ID (np. tabela mapująca
   w Supabase albo konfiguracja w kodzie/env). Rozważ utworzenie skryptem przez Stripe API.
3. **`/api/checkout`** (już jest szkielet): utworzyć `stripe.checkout.sessions.create`
   (`mode: "subscription"`, `line_items` z Price ID dla SKU, `client_reference_id = user.id`,
   `success_url`/`cancel_url`), zwrócić `{ url }`. `checkout.ts` już przekierowuje na `url`.
4. **Webhook `/api/stripe/webhook`** (do utworzenia): weryfikacja podpisu
   `STRIPE_WEBHOOK_SECRET`; obsługa `checkout.session.completed`,
   `customer.subscription.updated/deleted`. Upsert do `entitlements`
   (`user_id`, `sku`, `status`, `current_period_end`, `stripe_subscription_id`,
   `stripe_customer_id`) przez `getSupabaseAdmin()` (service_role, omija RLS).
   Po sukcesie front robi `window.dispatchEvent(new Event("entitlements-changed"))`
   (już obsłużone w `useEntitlements`) — albo refetch na powrocie z Stripe.
5. **Mapowanie user → Stripe customer**: zapisywać `stripe_customer_id`, by anulowanie/
   odnowienie aktualizowało właściwe `entitlements`.
6. (Opcjonalnie) Strona „Moje subskrypcje" / portal klienta Stripe do anulowania.

## Uwagi

- WooCommerce price (1 zł / 4 zł) jest tylko poglądowy w katalogu — realne kwoty
  ustala Stripe Price. Trzymać spójność albo świadomie traktować WC jako katalog.
- Pakiet `all` = wszystkie obecne i przyszłe persony (rozwijane w `computeUnlocked`).
- Darmowy `advisor` nigdy nie trafia do `entitlements` — zawsze dostępny po stronie kodu.
- Znany problem (niezwiązany ze sklepem): sesja gościa bywa „wisi" na ekranie *Wczytuję…*
  po wygaśnięciu refresh-tokenu — do zhardenowania.
