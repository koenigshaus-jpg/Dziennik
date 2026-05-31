# PRD — Aplikacja "Dziennik"

> Osobisty dziennik w formie PWA. MVP skupione na szybkim dodawaniu wpisów i przeglądaniu historii. Fundament pod przyszłe statystyki i funkcje AI.

---

## 1. Kontekst

Brakuje mi jednego, spójnego miejsca, w którym mógłbym codziennie zapisywać swoje myśli, obserwacje i refleksje. Obecnie wpisy są rozrzucone między notatkami w telefonie, plikami tekstowymi i głową — co utrudnia zarówno regularność, jak i późniejszy powrót do nich.

Chcę zbudować własną aplikację, ponieważ:
- gotowe rozwiązania są albo przeciążone funkcjami, albo estetycznie nie odpowiadają temu, czego szukam,
- chcę mieć pełną kontrolę nad danymi i kierunkiem rozwoju produktu,
- planuję w przyszłości rozbudować apkę o statystyki i funkcje AI (podsumowania, wzorce, insighty), więc zależy mi, by od początku mieć własny fundament danych.

**Użytkownik docelowy w MVP:** ja sam (single-user). Aplikacja musi być na tyle przyjemna i lekka, żeby realnie zachęcała mnie do codziennego użycia — to jest kluczowe kryterium sukcesu.

**Kontekst użycia:** głównie mobilnie (telefon, wieczorem lub w ciągu dnia), okazjonalnie z desktopu. Stąd wybór PWA — działa na każdym urządzeniu, dostępna z poziomu przeglądarki i ekranu domowego, bez konieczności publikacji w App Store.

---

## 2. Cel

### 2.1. Cel główny
Stworzyć prostą, estetyczną aplikację typu PWA, która będzie moją osobistą biblioteką wpisów dziennikowych — miejscem, gdzie codziennie mogę dodać wpis i w każdej chwili wrócić do poprzednich.

### 2.2. Cele MVP
1. **Codzienne dodawanie wpisów** — minimum tarcia, maksymalnie 2 kliknięcia od otwarcia apki do pisania.
2. **Przeglądanie historii** — szybki dostęp do wszystkich poprzednich wpisów w czytelnym układzie.
3. **Czytanie pojedynczego wpisu** — pełen widok wybranego wpisu z możliwością edycji.
4. **Bezpieczne, lokalne przechowywanie** — dane trzymane w pliku bazy na tym samym serwerze, na którym działa aplikacja. Zero zewnętrznych kont, zero zależności od chmury, pełna kontrola nad danymi.

### 2.3. Zakres MVP (3 ekrany)

**Ekran 1 — Nowy wpis (ekran główny)**
- Otwiera się jako pierwszy po wejściu do apki.
- Duże pole tekstowe (długa forma).
- Możliwość dodania zdjęć.
- Możliwość nagrania notatki głosowej (audio).
- Tagi / nastrój / kategoria (strukturalne metadane — fundament pod przyszłe statystyki).
- Automatyczna data wpisu (z możliwością ręcznej zmiany).
- Zapis wpisu = jedno wyraźne CTA.

**Ekran 2 — Historia wpisów**
- Lista wszystkich wpisów chronologicznie (od najnowszego).
- Każdy element listy: data, fragment treści, ikony oznaczające obecność zdjęć/audio, tagi.
- Możliwość kliknięcia → przejście do widoku pojedynczego wpisu (Ekran 3).
- Wyszukiwarka / filtrowanie (proste — po dacie i tagu) — *do rozważenia w MVP lub V1.1*.

**Ekran 3 — Widok pojedynczego wpisu**
- Pełny widok wybranego wpisu po kliknięciu z historii.
- Wyświetla: datę, treść, zdjęcia, odtwarzacz audio, tagi.
- Możliwość edycji i usunięcia wpisu.
- Wzorzec analogiczny do ekranu szczegółowego "Avala Tower" z referencji — duża, wyrazista typografia w nagłówku, klarowna hierarchia.

### 2.4. Stack techniczny

**Frontend**
- **Next.js + React + TypeScript** — framework aplikacji (App Router), API routes pełnią rolę backendu (jeden proces = mniej ruchomych części).
- **Tailwind CSS** — stylowanie utility-first, spójne z resztą stacku.
- **ShadCN/UI** — gotowa biblioteka komponentów (Button, Input, Dialog, Card, itd.). Nie wymyślamy koła na nowo; bierzemy sprawdzone, dostępne komponenty i dostosowujemy estetykę.
- **TipTap** — edytor tekstu z obsługą Markdown dla pola treści wpisu. Lekki, rozszerzalny, dobrze współpracuje z React.
- **PWA** — `manifest.json` + service worker (np. `next-pwa`) dla instalowalności na ekranie domowym i cache statyków.

**Backend i dane — decyzja**
Świadomie **nie używamy** Supabase, Firebase ani żadnej zewnętrznej bazy chmurowej. Powód: aplikacja jest single-user, nie chcę zakładać kont, konfigurować projektów i zarządzać kluczami API dla MVP. Wybieramy najprostsze sensowne rozwiązanie:

- **SQLite (przez `better-sqlite3`)** — baza w pojedynczym pliku `dziennik.db` na dysku serwera. Zero instalacji bazy, zero konfiguracji, jeden plik = pełen backup (kopiujesz plik i masz całą historię).
- **Drizzle ORM** *(opcjonalnie, rekomendowane)* — lekki, typowany ORM nad SQLite. Daje migracje schematu i bezpieczeństwo typów, bez ciężaru pełnego ORM-a.
- **Media (zdjęcia, audio)** — zapisywane jako pliki w katalogu `/uploads` na serwerze; w bazie trzymamy tylko ścieżkę i metadane. Proste, przenośne, łatwe do backupu razem z plikiem `.db`.
- **Audio:** nagrywanie w przeglądarce przez `MediaRecorder API`, upload jako blob do API route, zapis na dysk.
- **Zdjęcia:** standardowy upload przez `<input type="file">` lub kamerę telefonu, zapis na dysk.

**Autentykacja — decyzja**
Skoro to single-user i wszystko trzyma się na jednym serwerze, **nie budujemy systemu kont**. Wystarczy:
- proste hasło dostępu (jedno, ustawione w zmiennej środowiskowej `APP_PASSWORD`), zapisane po zalogowaniu w ciasteczku/sesji,
- lub całkowity brak autoryzacji, jeśli apka chodzi tylko na localhost / w sieci domowej za VPN-em.

To rozwiązanie można później bezboleśnie wymienić na pełną autentykację (np. Auth.js), jeśli zajdzie potrzeba.

**Hosting**
- Lokalnie podczas developmentu (`npm run dev`).
- Docelowo: dowolny mały VPS (np. Hetzner, DigitalOcean, Railway) z Node.js — całość to jeden proces Next.js + plik bazy + folder z mediami. Backup = `rsync` lub `scp` katalogu projektu.

### 2.5. Zasady projektowe
- **Wyrazista typografia** — duże nagłówki, czysty krój sans-serif, mocna hierarchia (jak w referencji).
- **Prostota** — minimum elementów na ekranie, dużo białej przestrzeni, jeden wyraźny CTA na ekranie.
- **Best practices designu** — spójna paleta, czytelne kontrasty, dotykowe targety ≥ 44px, dostępność (WCAG AA).
- **Mobile-first** — projekt zaczyna się od telefonu, desktop to wariant rozszerzony.

### 2.6. Poza zakresem MVP (na później)
- Statystyki i wizualizacje (wykresy, trendy nastroju, częstotliwość pisania).
- Funkcje AI: podsumowania tygodniowe/miesięczne, wyszukiwanie semantyczne, wykrywanie wzorców, sugestie tematów.
- Eksport do PDF / Markdown.
- Multi-user / współdzielenie wpisów.
- Powiadomienia / przypomnienia.
- Tryb offline z synchronizacją.

### 2.7. Kryteria sukcesu MVP
- Mogę dodać wpis (tekst + zdjęcie + audio + tag) w mniej niż 30 sekund od otwarcia apki.
- Po wdrożeniu na serwer mogę otworzyć aplikację na telefonie i na laptopie pod tym samym adresem i zobaczyć te same wpisy.
- Używam apki co najmniej 5 dni w tygodniu przez pierwsze 4 tygodnie po wdrożeniu.

---

## 3. Referencje

### 3.1. Referencja wizualna — aplikacja o architekturze brutalistycznej (załączone screeny)
Inspiracja w warstwie wizualnej i UX, mimo zupełnie innej tematyki. Co konkretnie chcę przenieść:

- **Typografia** — bardzo duże, śmiałe nagłówki ("Avala Tower"), czysty sans-serif, mocny kontrast wielkości między nagłówkiem a tekstem ciągłym.
- **Hierarchia** — jasny podział: tytuł → meta → treść → akcje.
- **Czystość layoutu** — dużo białej przestrzeni, brak zbędnych ozdobników, surowy, "wydawniczy" charakter.
- **Nawigacja dolna** — prosty pasek z 3–4 sekcjami (Index / Favorites / Map / Donate w referencji → analogicznie: Nowy wpis / Historia / [3. sekcja] w mojej apce).
- **Listy** — przejrzysty układ z miniaturką, tytułem i metadanymi po prawej (ekran "Find City…" jako wzór dla ekranu Historii).
- **Karty szczegółowe** — duży tytuł u góry, treść poniżej, tabelaryczne metadane (Architekt / Rok / Stan) — wzór dla widoku pojedynczego wpisu.

### 3.2. Referencje inspiracyjne (do rozważenia / przegląd)
- **Day One** — najbardziej dopracowany komercyjny dziennik, wzorzec UX dla wpisów multimedialnych.
- **Bear / iA Writer** — typografia i czystość edytora tekstu.
- **Notion / Craft** — wzorce edycji bogatej treści.

### 3.3. Referencje techniczne
- [Next.js Docs](https://nextjs.org/docs) — framework aplikacji.
- [Tailwind CSS](https://tailwindcss.com/docs) — stylowanie.
- [ShadCN/UI](https://ui.shadcn.com/) — biblioteka komponentów.
- [TipTap](https://tiptap.dev/docs) — edytor tekstu / Markdown.
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — SQLite dla Node.js.
- [Drizzle ORM](https://orm.drizzle.team/) — typowany ORM nad SQLite.
- [next-pwa](https://github.com/shadowwalker/next-pwa) — PWA dla Next.js.
- [MediaRecorder API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) — nagrywanie audio w przeglądarce.

---

## 4. Następne kroki

### Krok 1 — Walidacja PRD
- Przejrzeć ten dokument, zaznaczyć wątpliwości, rozstrzygnąć otwarte kwestie (patrz niżej).

### Krok 2 — Design (lo-fi → hi-fi)
- Szkic 3 ekranów na papierze / w Figmie (low-fidelity).
- Wybór palety, kroju typograficznego i komponentów bazowych.
- Hi-fi makieta 3 ekranów + ekran logowania.

### Krok 3 — Setup techniczny
- Inicjalizacja repo: Next.js + TypeScript + Tailwind.
- Instalacja ShadCN/UI (`npx shadcn@latest init`) + dodanie potrzebnych komponentów (Button, Input, Card, Dialog, Textarea, Badge).
- Instalacja TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*` wg potrzeb) + ewentualnie rozszerzenie markdown.
- Setup `better-sqlite3` + Drizzle: schemat tabel `entries`, `tags`, `entry_tags`, `media`. Skrypt tworzący `dziennik.db` przy starcie.
- Konfiguracja folderu `/uploads` na zdjęcia i audio.
- Konfiguracja PWA (`next-pwa`, manifest, service worker, ikony).
- Proste hasło dostępu w middleware Next.js (`APP_PASSWORD` w `.env`).

### Krok 4 — Implementacja MVP
1. Ekran logowania (pole hasła → cookie sesyjne).
2. Ekran 1 — Nowy wpis (TipTap dla tekstu → upload zdjęć → nagrywanie audio → tagi).
3. Ekran 2 — Historia.
4. Ekran 3 — Widok pojedynczego wpisu (+ edycja, usunięcie).
5. Polish: animacje, stany puste, błędy, loading.

### Krok 5 — Test i wdrożenie
- Codzienne użycie przez 1–2 tygodnie jako jedyny tester (najpierw lokalnie).
- Hosting: mały VPS z Node.js (Hetzner / DigitalOcean / Railway) lub Raspberry Pi w domu. Reverse proxy (Caddy / nginx) + HTTPS.
- Skrypt backupu: cron kopiujący `dziennik.db` + folder `/uploads` raz dziennie.
- Instalacja PWA na telefonie, weryfikacja kryteriów sukcesu.

### Krok 6 — Iteracja
- Lista usprawnień z realnego użytkowania.
- Planowanie V2: statystyki, AI.

---

### Otwarte kwestie do rozstrzygnięcia
- [ ] Nazwa aplikacji (robocza: "Dziennik").
- [ ] Czy w MVP wyszukiwarka i filtrowanie po tagach, czy odkładamy na V1.1?
- [ ] Czy wpis dziennikowy ma być jeden na dzień (z możliwością edycji), czy wiele wpisów dziennie?
- [ ] Lista predefiniowanych nastrojów/tagów vs. tagi free-text.
- [ ] Język interfejsu: PL, EN, oba?
- [x] ~~Autentykacja~~ — rozstrzygnięte: proste hasło w zmiennej środowiskowej, bez systemu kont.
- [x] ~~Baza danych~~ — rozstrzygnięte: SQLite (plik na serwerze), media jako pliki w `/uploads`.
- [ ] Gdzie ostatecznie hostujemy (VPS / Raspberry Pi / tylko localhost)?
