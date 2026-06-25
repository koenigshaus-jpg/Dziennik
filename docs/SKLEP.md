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
- **Lista person sterowana WooCommerce**: dropdown w czacie buduje się z produktów WC
  (tych z `persona_key`) przez `/api/personas` (`getPersonaList` → klient `usePersonas`),
  z fallbackiem do kodu. „Darmowość" persony = cena 0 w WC (`isFree`). Gating liczy
  `isPersonaUnlocked` (free | pakiet | kupiona) — `entitlements.ts`.

### Jak dodać nowego konsultanta (tylko WooCommerce, bez kodu)
1. WooCommerce → **Produkty → Dodaj nowy**. Nazwa = nazwa konsultanta. Typ: prosty,
   **wirtualny**. Cena = roczna kwota (np. 1) lub 0 dla darmowego.
2. W **Polach własnych** dodaj:
   - `persona_key` — unikalny klucz (np. `mentorZdrowia`; bez spacji)
   - `persona_prompt` — system prompt konsultanta
   - `persona_icon` — nazwa ikony lucide (np. `HeartPulse`, `Brain`, `Compass`)
   - (opcjonalnie) `persona_model` = `gpt-4o-mini`, `persona_deep_model` = `gpt-4o`,
     `persona_temperature` = np. `0.5`
3. Opublikuj. Pojawi się w `/sklep` i w dropdownie czatu (do ~1 min — cache 60 s).
   Webhook WC dosynchronizuje cenę do Stripe automatycznie. Gotowe — bez zmian w kodzie.

Persony z `src/lib/agent/personas/` zostają jako fallback (gdy WC niedostępne).
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
- `scripts/seed-stripe.ts` — tworzy/synchronizuje w Stripe Product+Price (roczna, PLN)
  dla każdego płatnego produktu WC (persony >0 zł + pakiet) i zapisuje `stripe_price_id`
  do meta WC. (advisor darmowy — pomijany.) Uruchom: `npx tsx scripts/seed-stripe.ts`.

### Jak zmienić cenę produktu
Model: **Stripe = źródło prawdy ceny przy płatności, WooCommerce = wyświetlanie**.

**Sposób 1 (automatyczny):** w panelu WooCommerce *Produkty → [produkt] → Cena* — ustaw
nową kwotę i zapisz. WooCommerce wyśle webhook `product.updated` → `/api/woo/webhook`
(`src/lib/shop-sync.ts`) → tworzy nową cenę Stripe, dezaktywuje starą, podmienia
`stripe_price_id`. Webhook WC w sklepie: utworzony przez API (topic `product.updated`,
delivery → prod, sekret = `WC_WEBHOOK_SECRET`).

⚠️ **NIE jest natychmiastowy** — WooCommerce dostarcza webhooki asynchronicznie przez
Action Scheduler / wp-cron. Na cichym serwisie wp-cron odpala się rzadko, więc sync może
przyjść po sekundach lub minutach. Dla pewności/szybkości można:
- ustawić systemowy cron na hostingu (DirectAdmin → Cron Jobs) hitujący `wp-cron.php` co minutę
  (+ `define('DISABLE_WP_CRON', true)` w `wp-config.php`), albo
- użyć Sposobu 2.

**Sposób 2 (natychmiastowy, ręczny):** `npx tsx scripts/seed-stripe.ts` — synchronizuje od
ręki (porównuje ceny WC↔Stripe, tworzy/podmienia gdy różne).

Anti-pętla: zapis `stripe_price_id` przez handler też odpala `product.updated`. Handler
jest na to odporny — (1) jeśli istnieje już aktywna cena o właściwej kwocie, używa jej
zamiast tworzyć nową; (2) zapisuje meta do WC tylko gdy faktycznie się zmienia (więc
re-trigger od własnego zapisu natychmiast wygasa); (3) trzyma jedną aktywną cenę na produkt
(resztę dezaktywuje). Dzięki temu jedna zmiana ceny = jedna nowa cena, bez kaskady.

Uwaga: zmiana ceny nie wpływa na istniejące aktywne subskrypcje (rozliczają się po cenie
z momentu zakupu) — dotyczy nowych zakupów.

**Porządki w Stripe:** `npx tsx scripts/prune-stripe-prices.ts` — zostawia aktywną tylko
cenę wskazaną przez WC (`stripe_price_id`), resztę archiwizuje. Każdy produkt = 1 aktywna
cena. Przydatne, gdyby seria szybkich zmian/backlog webhooków utworzyła nadmiarowe ceny.
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
