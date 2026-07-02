# Architektura — eksperyment (branch `eksperyment`)

Ten dokument opisuje **gałąź eksperymentalną** Dziennika. Bazowa architektura produkcyjna jest w [`architektura.md`](architektura.md) — tutaj opisujemy **tylko to, czym eksperyment się od niej różni**.

Dokument nie zawiera sekretów — wymienia jedynie **nazwy** zmiennych środowiskowych oraz opisowe (nie konkretne) adresy infrastruktury.

---

## TL;DR

Eksperyment dokłada trzy rzeczy do produkcyjnego Dziennika:

1. **Wielu użytkowników** — realna izolacja per konto (nie „jednoużytkownikowy w intencji"), z egzekwowaniem własności wpisów po stronie serwera.
2. **Strapi jako źródło prawdy wpisów** — wpisy powstają w headless CMS **Strapi na NAS-ie (QNAP)**, a stamtąd są mostowane do Supabase (wektoryzacja i wyszukiwanie bez zmian).
3. **Izolacja danych eksperymentu od produkcji** — ta sama baza Supabase, ale wpisy eksperymentu są oznaczane `source='prev'`, a ich embeddingi trafiają do osobnej tabeli.

> ⚠️ **Produkcja (`main`) jest nietykalna.** Gałąź `eksperyment` **nie jest** i **nie może być** mergowana do `main` bez świadomej decyzji. Produkcja działa jak dotąd (zapis prosto do Supabase, logowanie na współdzielone konto gościa). Ewentualne przeniesienie funkcji z eksperymentu na produkcję to osobny temat (migracje).

---

## Topologia wdrożenia

Jedna baza Supabase i jeden Strapi/NAS obsługują **dwa środowiska**, rozdzielone kolumną `source` i przez RLS:

```mermaid
flowchart TB
    subgraph Prod["PRODUKCJA — branch main (Vercel production)"]
        PApp["App Dziennik<br/>(zapis wprost do Supabase)"]
    end
    subgraph Prev["EKSPERYMENT — branch eksperyment (Vercel preview)"]
        EApp["App Dziennik<br/>(zapis przez Strapi)"]
    end
    subgraph NAS["NAS QNAP (Container Station)"]
        Strapi["Strapi 5 + Postgres<br/>(źródło prawdy wpisów PREV)"]
        TS["Tailscale Funnel<br/>(publiczny HTTPS)"]
    end
    subgraph Supa["Supabase (WSPÓLNA baza)"]
        E[("entries<br/>source: 'prod' | 'prev'")]
        EE[("entry_embeddings<br/>(produkcja)")]
        EEP[("entry_embeddings_prev<br/>(eksperyment)")]
        EF["Edge Function embed-entry<br/>(routing po source)"]
    end

    PApp -->|"CRUD, source='prod'"| E
    EApp -->|"POST/PUT/DELETE /api/strapi/entries"| Strapi
    TS --- Strapi
    Strapi -->|"lifecycle: upsert, source='prev'"| E
    E -->|trigger| EF
    EF -->|"source='prod'"| EE
    EF -->|"source='prev'"| EEP
```

| | Produkcja (`main`) | Eksperyment (`eksperyment`) |
|---|---|---|
| Wdrożenie Vercel | production | preview |
| Ścieżka zapisu wpisu | app → Supabase (bezpośrednio) | app → Strapi (NAS) → most → Supabase |
| Logowanie „gość" | wspólne konto e-mail (współdzielone dane) | `signInAnonymously()` (izolowana piaskownica per tester) |
| Model użytkowników | jednoużytkownikowy w intencji | wielu użytkowników, gating własności |
| `entries.source` | `'prod'` (domyślnie) | `'prev'` (ustawia most) |
| Tabela embeddingów | `entry_embeddings` | `entry_embeddings_prev` |
| RPC wyszukiwania | `search_entries_hybrid` | `search_entries_hybrid_prev` |

---

## Strapi jako źródło prawdy (NAS)

Wpisy eksperymentu powstają w **Strapi 5** (TypeScript) uruchomionym w **Container Station** na NAS-ie QNAP (Docker Compose: `strapi`, `strapiDB` = Postgres 16, `tailscale`). Publiczny dostęp HTTPS zapewnia **Tailscale Funnel** (kontener userspace) — bez otwierania portów na routerze i bez przenoszenia domen.

- **Content-type `entry`** (pola: `entryId` = współdzielony UUID z Supabase, `userId`, `contentHtml`, `contentText`, `mood`, `tags` (json), `media` (json), `entryCreatedAt`; `draftAndPublish: false`).
- **Most Strapi → Supabase** (lifecycle hook `afterCreate/afterUpdate/afterDelete`):
  - upsert do `entries` z `service_role`, stemplując `user_id` **wartością z wpisu** (`result.userId`), a nie stałą — to podstawa multi-user;
  - `entries.source = 'prev'` — znacznik kierujący wektoryzację do osobnej tabeli;
  - sync tagów do `tags`/`entry_tags` (per `userId`);
  - `afterDelete` kasuje wiersz w Supabase (kaskada `entry_tags`, `media`, embeddingi).
- Zapis `content_text` wyzwala istniejący trigger `embed_entry_on_write` → Edge Function `embed-entry` (patrz [Izolacja embeddingów](#izolacja-embeddingów-prev)).

> Kod Strapi żyje w osobnym projekcie (poza tym repo). Sekrety (token API, klucze Supabase, `TS_AUTHKEY`) trzymane w gitignorowanym `.env` na NAS-ie (chmod 600).

---

## Ścieżka zapisu wpisu (eksperyment)

```mermaid
sequenceDiagram
    participant UI as App (klient)
    participant R as /api/strapi/entries (Next, server)
    participant SUP as Supabase (RLS)
    participant ST as Strapi (NAS)
    participant BR as Most (lifecycle)
    participant TR as trigger + embed-entry

    UI->>R: POST/PUT/DELETE (bez userId)
    R->>SUP: kim jestem? (getUser z cookies)
    Note over R,SUP: PUT/DELETE: SELECT wpisu po RLS<br/>→ brak = 403 (kontrola własności)
    R->>ST: zapis z userId z SESJI (nie z ciała)
    ST->>BR: afterCreate/Update/Delete
    BR->>SUP: upsert entries (user_id, source='prev') + tagi
    SUP->>TR: trigger na content_text
    TR->>SUP: embedding → entry_embeddings_prev
```

Kluczowe pliki (w tym repo, na branchu `eksperyment`):

- [`src/lib/db-supabase.ts`](src/lib/db-supabase.ts) — `createEntry`/`updateEntry`/`deleteEntry` piszą do Strapi przez server-route (klient generuje `entryId`; media dalej do Supabase Storage; odczyty bez zmian).
- [`src/app/api/strapi/entries/route.ts`](src/app/api/strapi/entries/route.ts) — auth + **gating własności**; `userId` brany z sesji Supabase, nigdy z ciała żądania.
- [`src/lib/strapi-server.ts`](src/lib/strapi-server.ts) — server-only klient Strapi (token ukryty na serwerze).

---

## Multi-user

Baza była już RLS-owana per `user_id`; eksperyment domyka to na warstwie zapisu i logowania.

- **Stemplowanie właściciela:** route czyta zalogowanego użytkownika z cookies (`createSupabaseRouteHandlerClient`) i przekazuje `userId` do Strapi. Klient **nie może** podać cudzego `userId`.
- **Gating własności (serwerowo):** `PUT`/`DELETE` sprawdzają, czy wpis jest widoczny dla użytkownika przez RLS (SELECT po `id`) — brak → **403**. Blokuje edycję, kasowanie i „przejęcie" cudzego wpisu po zgadniętym `entryId`.
- **Kolizja `entryId`:** unikalny `entryId` w Strapi zapobiega nadpisaniu cudzego wpisu przy tworzeniu.
- **Gość = sesja anonimowa:** [`src/app/login/page.tsx`](src/app/login/page.tsx) — przycisk „Wejdź jako gość" woła `signInAnonymously()`; każdy tester dostaje własne, puste, izolowane konto (a nie współdzielone konto jak na produkcji). E-mail/hasło i Google działają jak dotąd.

---

## Izolacja embeddingów PREV

Cel: wektory eksperymentu **nie mieszają się** z produkcyjnymi, mimo wspólnej bazy. Realizacja w migracji [`supabase/migrations/0006_prev_embeddings.sql`](supabase/migrations/0006_prev_embeddings.sql):

- kolumna `entries.source` (`text`, default `'prod'`; most ustawia `'prev'`) — addytywna, nie zmienia zachowania produkcji;
- tabela `entry_embeddings_prev` (kształt jak `entry_embeddings`, RLS „czytam swoje", indeksy HNSW);
- RPC `search_entries_hybrid_prev` (bliźniak `search_entries_hybrid` czytający tabelę PREV).

Routing dzieje się w Edge Function [`supabase/functions/embed-entry/index.ts`](supabase/functions/embed-entry/index.ts):

```ts
const table = rec.source === "prev" ? "entry_embeddings_prev" : "entry_embeddings";
```

App eksperymentu przeszukuje tabelę PREV — [`src/lib/api/hybrid-search.ts`](src/lib/api/hybrid-search.ts) woła `search_entries_hybrid_prev`. Produkcja (`source='prod'`) i jej RPC pozostają bez zmian.

> **Świadoma decyzja:** wpisy PREV fizycznie leżą w tej samej tabeli `entries` (oddzielone przez `user_id`/RLS), ale **wektory mają osobną tabelę**. Pełna separacja bazodanowa (osobny projekt Supabase) była rozważana, ale odrzucona na rzecz lżejszego wariantu „ta sama baza, osobna tabela embeddingów".

---

## Zmienne środowiskowe (dodatkowe wobec produkcji)

Tylko **nazwy** — bez wartości. Sekrety trzymane w `.env.local` (app) i `.env` na NAS-ie (most).

| Zmienna | Gdzie | Do czego |
|---|---|---|
| `STRAPI_URL` | app (server) | endpoint Strapi (publiczny HTTPS przez Tailscale Funnel) |
| `STRAPI_API_TOKEN` | app (server) | token zapisu do Strapi (nigdy do przeglądarki) |
| `SUPABASE_URL` | NAS / most | most → Supabase |
| `SUPABASE_SECRET_KEY` | NAS / most | `service_role` mostu (omija RLS) |
| `SUPABASE_USER_ID` | NAS / most | fallback właściciela dla starych/ręcznych rekordów (multi-user bierze `userId` z wpisu) |
| `TS_AUTHKEY` | NAS | rejestracja węzła Tailscale (Funnel) |

---

## Uwagi operacyjne / bezpieczeństwo

- **Sekret webhooka embeddingów.** Redeploy Edge Function `embed-entry` przez Management API/MCP potrafi zgubić env `EMBED_WEBHOOK_SECRET` → funkcja odrzuca poprawny sekret triggera (403) → wektoryzacja pada (produkcja i PREV). Dlatego sekret jest wpisany **wprost** w kodzie wdrożonej funkcji (jak w [`migracji 0004`](supabase/migrations/0004_embed_webhook_secret.sql) dla triggera); w repo pozostaje placeholder `__EMBED_SECRET__` — przy każdym deployu podstawić realną wartość (tę samą co w DB-triggerze `tg_embed_entry`).
- **Reliability:** po włączeniu ścieżki Strapi zapis wpisu w eksperymencie zależy od dostępności NAS-a (prąd/internet w domu). Produkcja tej zależności nie ma.
- **Wektoryzacja jest asynchroniczna** (pg_net „fire-and-forget") — embedding pojawia się kilka sekund po zapisie.

---

## Co jeszcze NIE zrobione (TODO eksperymentu)

- **Publiczny preview:** wyłączenie Vercel Deployment Protection („Require Log In") — krok w panelu Vercel, wymaga użytkownika.
- **Prawdziwa wieloużytkowość mostu:** most jest per-user na zapisie, ale gdy testerzy anonimowi tworzą wpisy przez Strapi, powstają w nim rekordy „śmieciowe" — do sprzątania.
- **Wyszukiwanie/agent na tabeli PREV:** wpięte (`search_entries_hybrid_prev`), ale nie przetestowane pod obciążeniem.
- Ewentualna **pełna separacja** (osobny projekt Supabase dla PREV), jeśli lekki wariant okaże się niewystarczający.
